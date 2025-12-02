/**
 * Tests for Comparison Engine
 */

import { describe, it, expect } from 'bun:test';
import type { ComparisonResult, ComparisonReport } from './comparison-engine.ts';

describe('ComparisonResult', () => {
    it('should represent a passed comparison', () => {
        const result: ComparisonResult = {
            name: 'home-desktop',
            baselinePath: '/project/.argus/baselines/home-desktop.png',
            currentPath: '/project/.argus/current/home-desktop.png',
            status: 'passed',
            diffPixels: 0,
            totalPixels: 2073600,
            diffPercentage: 0,
            passed: true,
            width: 1920,
            height: 1080,
        };

        expect(result.status).toBe('passed');
        expect(result.passed).toBe(true);
        expect(result.diffPercentage).toBe(0);
    });

    it('should represent a failed comparison', () => {
        const result: ComparisonResult = {
            name: 'dashboard-mobile',
            baselinePath: '/project/.argus/baselines/dashboard-mobile.png',
            currentPath: '/project/.argus/current/dashboard-mobile.png',
            status: 'failed',
            diffPixels: 5000,
            totalPixels: 250125,
            diffPercentage: 2,
            passed: false,
            width: 375,
            height: 667,
            diffImagePath: '/project/.argus/diffs/dashboard-mobile.png',
        };

        expect(result.status).toBe('failed');
        expect(result.passed).toBe(false);
        expect(result.diffImagePath).toBeDefined();
    });

    it('should represent a new screenshot', () => {
        const result: ComparisonResult = {
            name: 'new-page',
            baselinePath: '/project/.argus/baselines/new-page.png',
            currentPath: '/project/.argus/current/new-page.png',
            status: 'new',
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 0,
            passed: false,
            width: 0,
            height: 0,
        };

        expect(result.status).toBe('new');
        expect(result.passed).toBe(false);
    });

    it('should represent a missing screenshot', () => {
        const result: ComparisonResult = {
            name: 'deleted-page',
            baselinePath: '/project/.argus/baselines/deleted-page.png',
            currentPath: '/project/.argus/current/deleted-page.png',
            status: 'missing',
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 0,
            passed: false,
            width: 0,
            height: 0,
        };

        expect(result.status).toBe('missing');
    });

    it('should represent an error', () => {
        const result: ComparisonResult = {
            name: 'corrupt-image',
            baselinePath: '/project/.argus/baselines/corrupt-image.png',
            currentPath: '/project/.argus/current/corrupt-image.png',
            status: 'error',
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 100,
            passed: false,
            width: 0,
            height: 0,
            error: 'Failed to load image: corrupt data',
        };

        expect(result.status).toBe('error');
        expect(result.error).toBeDefined();
    });
});

describe('ComparisonReport', () => {
    it('should summarize comparison results', () => {
        const report: ComparisonReport = {
            total: 10,
            passed: 7,
            failed: 1,
            new: 1,
            missing: 0,
            errors: 1,
            results: [],
            duration: 2500,
        };

        expect(report.total).toBe(10);
        expect(report.passed + report.failed + report.new + report.missing + report.errors).toBe(10);
        expect(report.duration).toBe(2500);
    });

    it('should have correct counts', () => {
        const results: ComparisonResult[] = [
            { name: 'a', baselinePath: '', currentPath: '', status: 'passed', diffPixels: 0, totalPixels: 100, diffPercentage: 0, passed: true, width: 10, height: 10 },
            { name: 'b', baselinePath: '', currentPath: '', status: 'passed', diffPixels: 0, totalPixels: 100, diffPercentage: 0, passed: true, width: 10, height: 10 },
            { name: 'c', baselinePath: '', currentPath: '', status: 'failed', diffPixels: 50, totalPixels: 100, diffPercentage: 50, passed: false, width: 10, height: 10 },
            { name: 'd', baselinePath: '', currentPath: '', status: 'new', diffPixels: 0, totalPixels: 0, diffPercentage: 0, passed: false, width: 0, height: 0 },
        ];

        const passed = results.filter((r) => r.status === 'passed').length;
        const failed = results.filter((r) => r.status === 'failed').length;
        const newCount = results.filter((r) => r.status === 'new').length;

        expect(passed).toBe(2);
        expect(failed).toBe(1);
        expect(newCount).toBe(1);
    });
});
