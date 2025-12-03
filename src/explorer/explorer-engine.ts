/**
 * Explorer Engine
 *
 * Auto-discovery mode that crawls a website and captures screenshots.
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { BrowserContext, Page } from 'playwright';
import type { ResolvedArgusConfig, Viewport, ExplorerConfig } from '../types/config.ts';
import { BrowserManager, createBrowserManager } from '../capture/browser-manager.ts';
import { captureScreenshot, generateScreenshotFilename, type CaptureResult } from '../capture/screenshot.ts';
import { extractLinks, normalizeUrl, getPathName, type CrawlOptions } from './crawler.ts';

export interface ExplorerOptions {
    /** Starting URL to explore */
    startUrl: string;
    /** Maximum crawl depth */
    maxDepth?: number;
    /** Maximum number of pages to capture */
    maxPages?: number;
    /** URL patterns to exclude */
    exclude?: string[];
    /** Capture mode: baseline or current */
    mode?: 'baseline' | 'current';
    /** Run in headless mode */
    headless?: boolean;
}

export interface ExplorerResult {
    /** URL that was captured */
    url: string;
    /** Path derived from URL */
    path: string;
    /** Depth at which URL was found */
    depth: number;
    /** Capture results for each viewport */
    captures: CaptureResult[];
    /** Error if capture failed */
    error?: string;
}

export interface ExplorerReport {
    /** Starting URL */
    startUrl: string;
    /** Total URLs discovered */
    discovered: number;
    /** Total URLs captured */
    captured: number;
    /** Total screenshots taken */
    screenshots: number;
    /** Failed captures */
    failed: number;
    /** Individual results */
    results: ExplorerResult[];
    /** Total duration in ms */
    duration: number;
}

/**
 * Explorer engine for auto-discovery mode
 */
export class ExplorerEngine {
    private config: ResolvedArgusConfig;
    private browserManager: BrowserManager;
    private options: ExplorerOptions;
    private visited = new Set<string>();
    private queue: Array<{ url: string; depth: number }> = [];

    constructor(config: ResolvedArgusConfig, options: ExplorerOptions) {
        this.config = config;
        this.options = options;
        this.browserManager = createBrowserManager(config, options.headless ?? true);
    }

    /**
     * Get the output directory for captures
     */
    private getOutputDir(): string {
        const mode = this.options.mode ?? 'current';
        const subDir = mode === 'baseline' ? 'baselines' : 'current';
        return join(this.config.outputDir, subDir);
    }

    /**
     * Capture a single URL with all viewports
     */
    private async captureUrl(
        url: string,
        depth: number,
        context: BrowserContext
    ): Promise<ExplorerResult> {
        const path = getPathName(url);
        const captures: CaptureResult[] = [];
        let error: string | undefined;

        const page = await this.browserManager.createPage(context, this.config.disableAnimations);
        console.log(`[Explorer] Page created, navigating to ${url}...`);

        try {
            // Navigate to URL with timeout
            await page.goto(url, {
                waitUntil: this.config.waitForNetworkIdle ? 'networkidle' : 'load',
                timeout: 30000,
            });
            console.log(`[Explorer] Navigation complete for ${url}`);

            // Capture for each viewport
            for (const viewport of this.config.viewports) {
                console.log(`[Explorer] Setting viewport ${viewport.width}x${viewport.height}...`);
                await page.setViewportSize({
                    width: viewport.width,
                    height: viewport.height,
                });

                const filename = generateScreenshotFilename(
                    `explore-${path}`,
                    viewport,
                    this.config.timezone
                );
                const outputPath = join(this.getOutputDir(), filename);

                try {
                    console.log(`[Explorer] Taking screenshot...`);
                    const result = await captureScreenshot(page, outputPath, {
                        baseUrl: this.options.startUrl,
                        path: new URL(url).pathname,
                        viewport,
                        mask: this.config.globalMask,
                        waitForNetworkIdle: this.config.waitForNetworkIdle,
                    });
                    captures.push(result);
                    console.log(`[Explorer] Screenshot saved: ${filename}`);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    error = error ? `${error}; ${message}` : message;
                    console.log(`[Explorer] Screenshot error: ${message}`);
                }
            }

            // Extract links for further crawling
            const crawlOptions: CrawlOptions = {
                baseUrl: this.options.startUrl,
                exclude: this.options.exclude ?? this.config.explorer.exclude,
                include: this.config.explorer.include,
            };

            const links = await extractLinks(page, crawlOptions);

            // Add new links to queue if within depth limit
            const maxDepth = this.options.maxDepth ?? this.config.explorer.maxDepth;
            if (depth < maxDepth) {
                for (const link of links) {
                    const normalized = normalizeUrl(link.url);
                    if (!this.visited.has(normalized)) {
                        this.queue.push({ url: normalized, depth: depth + 1 });
                    }
                }
            }
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
        } finally {
            await page.close();
        }

        return {
            url,
            path,
            depth,
            captures,
            error,
        };
    }

    /**
     * Run the explorer
     */
    async explore(
        onProgress?: (discovered: number, captured: number, current?: ExplorerResult) => void
    ): Promise<ExplorerReport> {
        const startTime = Date.now();
        const results: ExplorerResult[] = [];
        const maxPages = this.options.maxPages ?? this.config.explorer.maxPages;

        console.log('[Explorer] Creating output directory...');
        // Ensure output directory exists
        await mkdir(this.getOutputDir(), { recursive: true });

        // Start with the initial URL
        const startUrl = normalizeUrl(this.options.startUrl);
        this.queue.push({ url: startUrl, depth: 0 });

        console.log('[Explorer] Launching browser...');
        // Create browser context
        const context = await this.browserManager.createContext({
            viewport: this.config.viewports[0] ?? { width: 1920, height: 1080 },
            timezone: this.config.timezone,
            locale: this.config.locale,
        });
        console.log('[Explorer] Browser launched successfully');

        try {
            while (this.queue.length > 0 && results.length < maxPages) {
                const item = this.queue.shift();
                if (!item) break;

                const { url, depth } = item;
                const normalized = normalizeUrl(url);

                // Skip if already visited
                if (this.visited.has(normalized)) continue;
                this.visited.add(normalized);

                console.log(`[Explorer] Capturing: ${url} (depth: ${depth})`);
                // Capture the URL
                const result = await this.captureUrl(url, depth, context);
                results.push(result);
                console.log(`[Explorer] Captured: ${url} - ${result.captures.length} screenshots`);

                onProgress?.(this.visited.size + this.queue.length, results.length, result);
            }
        } finally {
            await context.close();
        }

        // Calculate totals
        const captured = results.filter((r) => r.captures.length > 0).length;
        const screenshots = results.reduce((sum, r) => sum + r.captures.length, 0);
        const failed = results.filter((r) => r.error).length;

        return {
            startUrl: this.options.startUrl,
            discovered: this.visited.size,
            captured,
            screenshots,
            failed,
            results,
            duration: Date.now() - startTime,
        };
    }

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        await this.browserManager.close();
    }
}

/**
 * Run explorer mode
 */
export async function runExplorer(
    config: ResolvedArgusConfig,
    options: ExplorerOptions,
    onProgress?: (discovered: number, captured: number, current?: ExplorerResult) => void
): Promise<ExplorerReport> {
    const engine = new ExplorerEngine(config, options);

    try {
        return await engine.explore(onProgress);
    } finally {
        await engine.close();
    }
}
