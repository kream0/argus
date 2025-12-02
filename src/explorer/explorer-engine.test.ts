/**
 * Tests for Explorer Engine
 */

import { describe, it, expect } from 'bun:test';
import { ExplorerEngine, type ExplorerOptions, type ExplorerReport } from './explorer-engine.ts';
import type { ResolvedArgusConfig } from '../types/config.ts';

describe('ExplorerEngine', () => {
    const createMockConfig = (): ResolvedArgusConfig => ({
        baseUrl: 'https://example.com',
        viewports: [{ width: 1920, height: 1080, name: 'desktop' }],
        concurrency: 2,
        timezone: 'UTC',
        locale: 'en-US',
        globalMask: [],
        explorer: {
            maxDepth: 2,
            maxPages: 10,
            exclude: [],
            include: [],
        },
        routes: [],
        threshold: {
            pixel: 0.1,
            failureThreshold: 0.1,
        },
        outputDir: '.argus-test',
        browser: 'chromium',
        disableAnimations: true,
        waitForNetworkIdle: true,
    });

    describe('constructor', () => {
        it('should create instance with config and options', () => {
            const config = createMockConfig();
            const options: ExplorerOptions = { startUrl: 'https://example.com' };
            const engine = new ExplorerEngine(config, options);
            expect(engine).toBeInstanceOf(ExplorerEngine);
        });

        it('should accept mode option', () => {
            const config = createMockConfig();
            const options: ExplorerOptions = { startUrl: 'https://example.com', mode: 'baseline' };
            const engine = new ExplorerEngine(config, options);
            expect(engine).toBeInstanceOf(ExplorerEngine);
        });

        it('should accept maxDepth override', () => {
            const config = createMockConfig();
            const options: ExplorerOptions = { startUrl: 'https://example.com', maxDepth: 5 };
            const engine = new ExplorerEngine(config, options);
            expect(engine).toBeInstanceOf(ExplorerEngine);
        });

        it('should accept maxPages override', () => {
            const config = createMockConfig();
            const options: ExplorerOptions = { startUrl: 'https://example.com', maxPages: 50 };
            const engine = new ExplorerEngine(config, options);
            expect(engine).toBeInstanceOf(ExplorerEngine);
        });
    });

    describe('close', () => {
        it('should close without error when not started', async () => {
            const config = createMockConfig();
            const engine = new ExplorerEngine(config, { startUrl: 'https://example.com' });
            await expect(engine.close()).resolves.toBeUndefined();
        });
    });
});

describe('ExplorerReport', () => {
    it('should have correct structure', () => {
        const report: ExplorerReport = {
            startUrl: 'https://example.com',
            discovered: 15,
            captured: 10,
            screenshots: 20,
            failed: 2,
            results: [],
            duration: 5000,
        };

        expect(report.startUrl).toBe('https://example.com');
        expect(report.discovered).toBe(15);
        expect(report.captured).toBe(10);
        expect(report.screenshots).toBe(20);
        expect(report.failed).toBe(2);
        expect(report.duration).toBe(5000);
    });
});

describe('ExplorerResult', () => {
    it('should represent a successful capture', () => {
        const result = {
            url: 'https://example.com/about',
            path: 'about',
            depth: 1,
            captures: [
                {
                    path: '.argus/current/explore-about-desktop.png',
                    viewport: { width: 1920, height: 1080 },
                    routePath: '/about',
                    duration: 500,
                    warnings: [],
                },
            ],
        };

        expect(result.url).toBe('https://example.com/about');
        expect(result.path).toBe('about');
        expect(result.depth).toBe(1);
        expect(result.captures).toHaveLength(1);
    });

    it('should represent a failed capture', () => {
        const result = {
            url: 'https://example.com/error',
            path: 'error',
            depth: 2,
            captures: [],
            error: 'Navigation timeout',
        };

        expect(result.error).toBe('Navigation timeout');
        expect(result.captures).toHaveLength(0);
    });
});
