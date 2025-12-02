/**
 * Capture Engine
 *
 * Orchestrates the capture process for routes and viewports.
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { BrowserContext, Page } from 'playwright';
import type { ResolvedArgusConfig, RouteConfig, Viewport } from '../types/config.ts';
import {
    BrowserManager,
    createBrowserManager,
    performAuthentication,
    saveAuthState,
} from './browser-manager.ts';
import { captureRoute, generateScreenshotFilename, type CaptureResult } from './screenshot.ts';

export interface CaptureEngineOptions {
    /** Capture mode: baseline or current */
    mode: 'baseline' | 'current';
    /** Run in headless mode */
    headless?: boolean;
    /** Override concurrency */
    concurrency?: number;
}

export interface CaptureReport {
    /** Total number of captures */
    total: number;
    /** Number of successful captures */
    successful: number;
    /** Number of failed captures */
    failed: number;
    /** Capture results */
    results: CaptureResult[];
    /** Errors encountered */
    errors: CaptureError[];
    /** Total duration in ms */
    duration: number;
}

export interface CaptureError {
    route: string;
    viewport: string;
    error: string;
}

/**
 * Main capture engine class
 */
export class CaptureEngine {
    private config: ResolvedArgusConfig;
    private browserManager: BrowserManager;
    private options: CaptureEngineOptions;
    private authStatePath: string | undefined;

    constructor(config: ResolvedArgusConfig, options: CaptureEngineOptions) {
        this.config = config;
        this.options = options;
        this.browserManager = createBrowserManager(config);
    }

    /**
     * Get the output directory for captures
     */
    private getOutputDir(): string {
        const subDir = this.options.mode === 'baseline' ? 'baselines' : 'current';
        return join(this.config.outputDir, subDir);
    }

    /**
     * Setup authentication if configured
     */
    async setupAuth(): Promise<void> {
        if (!this.config.auth) return;

        const viewport = this.config.viewports[0] ?? { width: 1920, height: 1080 };
        const context = await this.browserManager.createContext({
            viewport,
            timezone: this.config.timezone,
            locale: this.config.locale,
        });

        const page = await this.browserManager.createPage(context, this.config.disableAnimations);

        try {
            await performAuthentication(page, this.config.baseUrl, this.config.auth);

            // Save auth state
            this.authStatePath = join(this.config.outputDir, 'auth-state.json');
            await mkdir(this.config.outputDir, { recursive: true });
            await saveAuthState(context, this.authStatePath);
        } finally {
            await context.close();
        }
    }

    /**
     * Capture a single route with a specific viewport
     */
    private async captureRouteWithViewport(
        route: RouteConfig,
        viewport: Viewport,
        context: BrowserContext
    ): Promise<CaptureResult> {
        const page = await this.browserManager.createPage(context, this.config.disableAnimations);

        try {
            const result = await captureRoute(
                page,
                route,
                this.config.baseUrl,
                this.getOutputDir(),
                viewport,
                this.config.globalMask,
                this.config.timezone,
                this.config.waitForNetworkIdle
            );

            return result;
        } finally {
            await page.close();
        }
    }

    /**
     * Create capture tasks for all routes and viewports
     */
    private createCaptureTasks(): Array<{ route: RouteConfig; viewport: Viewport }> {
        const tasks: Array<{ route: RouteConfig; viewport: Viewport }> = [];

        for (const route of this.config.routes) {
            const viewports = route.viewports || this.config.viewports;

            for (const viewport of viewports) {
                tasks.push({ route, viewport });
            }
        }

        return tasks;
    }

    /**
     * Run captures with concurrency control
     */
    async capture(
        onProgress?: (completed: number, total: number, result?: CaptureResult) => void
    ): Promise<CaptureReport> {
        const startTime = Date.now();
        const results: CaptureResult[] = [];
        const errors: CaptureError[] = [];

        // Ensure output directory exists
        await mkdir(this.getOutputDir(), { recursive: true });

        // Setup authentication if needed
        await this.setupAuth();

        // Create all capture tasks
        const tasks = this.createCaptureTasks();
        const total = tasks.length;
        let completed = 0;

        // Process tasks with concurrency
        const concurrency = this.options.concurrency ?? this.config.concurrency;
        const chunks = this.chunkArray(tasks, concurrency);

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async ({ route, viewport }) => {
                // Create context for each capture with route-specific overrides
                const context = await this.browserManager.createContext({
                    viewport,
                    timezone: route.timezone || this.config.timezone,
                    locale: route.locale || this.config.locale,
                    storageState: this.authStatePath,
                });

                try {
                    const result = await this.captureRouteWithViewport(route, viewport, context);
                    results.push(result);

                    completed++;
                    onProgress?.(completed, total, result);

                    return { success: true as const, result };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const viewportName = viewport.name || `${viewport.width}x${viewport.height}`;

                    errors.push({
                        route: route.name,
                        viewport: viewportName,
                        error: errorMessage,
                    });

                    completed++;
                    onProgress?.(completed, total);

                    return { success: false as const, error: errorMessage };
                } finally {
                    await context.close();
                }
            });

            await Promise.all(chunkPromises);
        }

        return {
            total,
            successful: results.length,
            failed: errors.length,
            results,
            errors,
            duration: Date.now() - startTime,
        };
    }

    /**
     * Close the browser and cleanup
     */
    async close(): Promise<void> {
        await this.browserManager.close();
    }

    /**
     * Split array into chunks
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

/**
 * Create and run a capture session
 */
export async function runCapture(
    config: ResolvedArgusConfig,
    options: CaptureEngineOptions,
    onProgress?: (completed: number, total: number, result?: CaptureResult) => void
): Promise<CaptureReport> {
    const engine = new CaptureEngine(config, options);

    try {
        return await engine.capture(onProgress);
    } finally {
        await engine.close();
    }
}
