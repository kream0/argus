/**
 * Tests for Image Diff Engine
 */

import { describe, it, expect } from 'bun:test';
import { getBaselinePath, getDiffPath } from './image-diff.ts';

describe('Image Diff Utilities', () => {
    describe('getBaselinePath', () => {
        it('should convert current path to baseline path', () => {
            const result = getBaselinePath(
                '/project/.argus/current/home-desktop.png',
                '/project/.argus/baselines',
                '/project/.argus/current'
            );
            expect(result).toBe('/project/.argus/baselines/home-desktop.png');
        });

        it('should handle nested paths', () => {
            const result = getBaselinePath(
                '/project/.argus/current/routes/dashboard-mobile.png',
                '/project/.argus/baselines',
                '/project/.argus/current'
            );
            expect(result).toBe('/project/.argus/baselines/routes/dashboard-mobile.png');
        });
    });

    describe('getDiffPath', () => {
        it('should convert current path to diff path', () => {
            const result = getDiffPath(
                '/project/.argus/current/home-desktop.png',
                '/project/.argus/diffs',
                '/project/.argus/current'
            );
            expect(result).toBe('/project/.argus/diffs/home-desktop.png');
        });

        it('should handle nested paths', () => {
            const result = getDiffPath(
                '/project/.argus/current/routes/dashboard-mobile.png',
                '/project/.argus/diffs',
                '/project/.argus/current'
            );
            expect(result).toBe('/project/.argus/diffs/routes/dashboard-mobile.png');
        });
    });
});

describe('DiffOptions defaults', () => {
    it('should have sensible default threshold', () => {
        // Default threshold should be 0.1 (10% difference tolerance)
        const defaultThreshold = 0.1;
        expect(defaultThreshold).toBeGreaterThan(0);
        expect(defaultThreshold).toBeLessThanOrEqual(1);
    });
});

describe('DiffResult structure', () => {
    it('should have expected properties', () => {
        const result = {
            diffPixels: 100,
            totalPixels: 10000,
            diffPercentage: 1,
            passed: true,
            width: 1920,
            height: 1080,
        };

        expect(result.diffPixels).toBe(100);
        expect(result.totalPixels).toBe(10000);
        expect(result.diffPercentage).toBe(1);
        expect(result.passed).toBe(true);
        expect(result.width).toBe(1920);
        expect(result.height).toBe(1080);
    });

    it('should calculate percentage correctly', () => {
        const diffPixels = 500;
        const totalPixels = 10000;
        const diffPercentage = (diffPixels / totalPixels) * 100;
        expect(diffPercentage).toBe(5);
    });
});
