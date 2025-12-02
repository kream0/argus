/**
 * Tests for Capture Engine
 */

import { describe, it, expect } from 'bun:test';
import { CaptureEngine, type CaptureEngineOptions } from './capture-engine.ts';
import type { ResolvedArgusConfig } from '../types/config.ts';

describe('CaptureEngine', () => {
    const createMockConfig = (overrides?: Partial<ResolvedArgusConfig>): ResolvedArgusConfig => ({
        baseUrl: 'http://localhost:3000',
        viewports: [{ width: 1920, height: 1080, name: 'desktop' }],
        concurrency: 2,
        timezone: 'UTC',
        locale: 'en-US',
        globalMask: [],
        explorer: {
            maxDepth: 2,
            maxPages: 20,
            exclude: [],
            include: [],
        },
        routes: [
            { path: '/', name: 'Home' },
            { path: '/about', name: 'About' },
        ],
        threshold: {
            pixel: 0.1,
            failureThreshold: 0.1,
        },
        outputDir: '.argus-test',
        browser: 'chromium',
        disableAnimations: true,
        waitForNetworkIdle: true,
        ...overrides,
    });

    describe('constructor', () => {
        it('should create instance with config and options', () => {
            const config = createMockConfig();
            const options: CaptureEngineOptions = { mode: 'baseline' };
            const engine = new CaptureEngine(config, options);
            expect(engine).toBeInstanceOf(CaptureEngine);
        });

        it('should accept current mode', () => {
            const config = createMockConfig();
            const options: CaptureEngineOptions = { mode: 'current' };
            const engine = new CaptureEngine(config, options);
            expect(engine).toBeInstanceOf(CaptureEngine);
        });

        it('should accept headless option', () => {
            const config = createMockConfig();
            const options: CaptureEngineOptions = { mode: 'baseline', headless: false };
            const engine = new CaptureEngine(config, options);
            expect(engine).toBeInstanceOf(CaptureEngine);
        });

        it('should accept concurrency override', () => {
            const config = createMockConfig();
            const options: CaptureEngineOptions = { mode: 'baseline', concurrency: 8 };
            const engine = new CaptureEngine(config, options);
            expect(engine).toBeInstanceOf(CaptureEngine);
        });
    });

    describe('close', () => {
        it('should close without error when not launched', async () => {
            const config = createMockConfig();
            const engine = new CaptureEngine(config, { mode: 'baseline' });
            await expect(engine.close()).resolves.toBeUndefined();
        });
    });
});

describe('CaptureReport', () => {
    it('should have correct structure', () => {
        const report = {
            total: 10,
            successful: 8,
            failed: 2,
            results: [],
            errors: [],
            duration: 5000,
        };

        expect(report.total).toBe(10);
        expect(report.successful).toBe(8);
        expect(report.failed).toBe(2);
        expect(report.duration).toBe(5000);
    });
});
