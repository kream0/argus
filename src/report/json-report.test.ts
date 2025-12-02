/**
 * JSON Report Generator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateJsonReport, createJsonReport, generateJUnitReport } from './json-report.ts';
import type { ComparisonReport, ComparisonResult } from '../diff/comparison-engine.ts';
import type { ValidatedArgusConfig } from '../config/schema.ts';

describe('JSON Report Generator', () => {
    const testDir = join(process.cwd(), '.test-report-json');

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
        duration: 1500,
    });

    beforeEach(async () => {
        await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    describe('createJsonReport', () => {
        it('should create a JSON report object with metadata', () => {
            const config = createMockConfig();
            const report = createMockReport([createMockResult()]);

            const jsonReport = createJsonReport(report, config);

            expect(jsonReport.meta.tool).toBe('argus');
            expect(jsonReport.meta.baseUrl).toBe('http://localhost:3000');
            expect(jsonReport.meta.browser).toBe('chromium');
            expect(jsonReport.meta.duration).toBe(1500);
            expect(jsonReport.meta.timestamp).toBeDefined();
        });

        it('should include summary statistics', () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({ status: 'passed' }),
                createMockResult({ name: 'test2', status: 'failed' }),
                createMockResult({ name: 'test3', status: 'new' }),
            ]);

            const jsonReport = createJsonReport(report, config);

            expect(jsonReport.summary.total).toBe(3);
            expect(jsonReport.summary.passed).toBe(1);
            expect(jsonReport.summary.failed).toBe(1);
            expect(jsonReport.summary.new).toBe(1);
        });

        it('should include individual result details', () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({
                    name: 'homepage',
                    status: 'failed',
                    diffPercentage: 2.5,
                    diffImagePath: '/path/to/diff.png',
                }),
            ]);

            const jsonReport = createJsonReport(report, config);

            expect(jsonReport.results.length).toBe(1);
            expect(jsonReport.results[0].name).toBe('homepage');
            expect(jsonReport.results[0].status).toBe('failed');
            expect(jsonReport.results[0].diffPercentage).toBe(2.5);
            expect(jsonReport.results[0].diff).toBe('/path/to/diff.png');
        });
    });

    describe('generateJsonReport', () => {
        it('should write JSON file to disk', async () => {
            const config = createMockConfig();
            const report = createMockReport([createMockResult()]);
            const outputPath = join(testDir, 'report.json');

            const result = await generateJsonReport(report, config, outputPath);

            expect(result).toBe(outputPath);
            const content = await readFile(outputPath, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed.meta.tool).toBe('argus');
        });

        it('should create nested directories', async () => {
            const config = createMockConfig();
            const report = createMockReport([]);
            const outputPath = join(testDir, 'deep', 'nested', 'report.json');

            await generateJsonReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(JSON.parse(content)).toBeDefined();
        });
    });

    describe('generateJUnitReport', () => {
        it('should generate valid XML', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({ name: 'test1', status: 'passed' }),
            ]);
            const outputPath = join(testDir, 'junit.xml');

            const result = await generateJUnitReport(report, config, outputPath);

            expect(result).toBe(outputPath);
            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('<?xml version="1.0"');
            expect(content).toContain('<testsuite');
            expect(content).toContain('<testcase');
        });

        it('should mark failed tests with failure element', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({
                    name: 'failed-test',
                    status: 'failed',
                    diffPercentage: 3.2,
                }),
            ]);
            const outputPath = join(testDir, 'junit.xml');

            await generateJUnitReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('<failure');
            expect(content).toContain('3.2');
        });

        it('should mark errors with error element', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({
                    name: 'error-test',
                    status: 'error',
                    error: 'Something went wrong',
                }),
            ]);
            const outputPath = join(testDir, 'junit.xml');

            await generateJUnitReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('<error');
            expect(content).toContain('Something went wrong');
        });

        it('should include test counts in testsuite', async () => {
            const config = createMockConfig();
            const report = createMockReport([
                createMockResult({ name: 'pass1', status: 'passed' }),
                createMockResult({ name: 'pass2', status: 'passed' }),
                createMockResult({ name: 'fail1', status: 'failed' }),
            ]);
            const outputPath = join(testDir, 'junit.xml');

            await generateJUnitReport(report, config, outputPath);

            const content = await readFile(outputPath, 'utf-8');
            expect(content).toContain('tests="3"');
            expect(content).toContain('failures="1"');
        });
    });
});
