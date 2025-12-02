/**
 * HTML Report Generator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateHtmlReport } from './html-report.ts';
import type { ComparisonReport, ComparisonResult } from '../diff/comparison-engine.ts';
import type { ValidatedArgusConfig } from '../config/schema.ts';

describe('HTML Report Generator', () => {
    const testDir = join(process.cwd(), '.test-report-html');

    const createMockConfig = (): ValidatedArgusConfig => ({
        baseUrl: 'http://localhost:3000',
        viewports: [{ width: 1920, height: 1080 }],
        concurrency: 4,
        timezone: 'UTC',
        locale: 'en-US',
        globalMask: [],
        explorer: {
            maxDepth: 2,
            maxPages: 20,
            exclude: [],
            include: [],
        },
        routes: [],
        threshold: {
            pixel: 0.1,
            failureThreshold: 0.1,
        },
        outputDir: testDir,
        browser: 'chromium',
        disableAnimations: true,
        waitForNetworkIdle: true,
    });

    const createMockResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
        name: 'test-screenshot',
        baselinePath: join(testDir, 'baselines', 'test.png'),
        currentPath: join(testDir, 'current', 'test.png'),
        status: 'passed',
        diffPixels: 0,
        totalPixels: 1920 * 1080,
        diffPercentage: 0,
        passed: true,
        width: 1920,
        height: 1080,
        ...overrides,
    });

    const createMockReport = (results: ComparisonResult[] = []): ComparisonReport => ({
        total: results.length,
        passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status === 'failed').length,
        new: results.filter((r) => r.status === 'new').length,
        missing: results.filter((r) => r.status === 'missing').length,
        errors: results.filter((r) => r.status === 'error').length,
        results,
        duration: 1000,
    });

    beforeEach(async () => {
        await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    describe('generateHtmlReport', () => {
        it('should generate an HTML file', async () => {
            const config = createMockConfig();
            const report = createMockReport([createMockResult()]);
            const outputPath = join(testDir, 'report', 'index.html');

            const result = await generateHtmlReport(report, config, outputPath);

            expect(result).toBe(outputPath);
            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('<!DOCTYPE html>');
            expect(content).toContain('Argus Visual Regression Report');
        });

        it('should include report statistics', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({ status: 'passed' }),
                createMockResult({ name: 'failed-test', status: 'failed', diffPercentage: 5.5 }),
            ]);
            const outputPath = join(testDir, 'report', 'index.html');

            await generateHtmlReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            // Check that stats are present - the HTML uses separate span elements for count and label
            expect(content).toContain('<span class="count">1</span>');
            expect(content).toContain('Passed');
            expect(content).toContain('Failed');
        });

        it('should accept custom title', async () => {
            const config = createMockConfig();
            const report = createMockReport([]);
            const outputPath = join(testDir, 'report', 'index.html');

            await generateHtmlReport(report, config, outputPath, {
                title: 'Custom Test Report',
            });

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('Custom Test Report');
        });

        it('should create nested output directories', async () => {
            const config = createMockConfig();
            const report = createMockReport([]);
            const outputPath = join(testDir, 'deep', 'nested', 'report', 'index.html');

            const result = await generateHtmlReport(report, config, outputPath);

            expect(result).toBe(outputPath);
            const content = await readFile(outputPath, 'utf-8');
            expect(content).toBeDefined();
        });

        it('should include base URL in report', async () => {
            const config = createMockConfig();
            config.baseUrl = 'https://example.com';
            const report = createMockReport([]);
            const outputPath = join(testDir, 'report', 'index.html');

            await generateHtmlReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('https://example.com');
        });

        it('should include result cards for each comparison', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({ name: 'homepage-desktop' }),
                createMockResult({ name: 'about-desktop' }),
            ]);
            const outputPath = join(testDir, 'report', 'index.html');

            await generateHtmlReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('homepage-desktop');
            expect(content).toContain('about-desktop');
        });
    });
});
