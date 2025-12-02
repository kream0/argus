/**
 * Tests for Screenshot utilities
 */

import { describe, it, expect } from 'bun:test';
import { generateScreenshotFilename } from './screenshot.ts';

describe('generateScreenshotFilename', () => {
    it('should generate filename with route name and viewport', () => {
        const filename = generateScreenshotFilename(
            'Dashboard Page',
            { width: 1920, height: 1080 }
        );
        expect(filename).toBe('dashboard-page-1920x1080.png');
    });

    it('should use viewport name when provided', () => {
        const filename = generateScreenshotFilename(
            'Dashboard Page',
            { width: 1920, height: 1080, name: 'desktop' }
        );
        expect(filename).toBe('dashboard-page-desktop.png');
    });

    it('should include timezone when provided', () => {
        const filename = generateScreenshotFilename(
            'Dashboard',
            { width: 1920, height: 1080, name: 'desktop' },
            'America/New_York'
        );
        expect(filename).toBe('dashboard-desktop-america-new_york.png');
    });

    it('should sanitize special characters in route name', () => {
        const filename = generateScreenshotFilename(
            'My Route (Special)',
            { width: 375, height: 667 }
        );
        expect(filename).toBe('my-route-special-375x667.png');
    });

    it('should handle route name with leading/trailing special chars', () => {
        const filename = generateScreenshotFilename(
            '---Dashboard---',
            { width: 1920, height: 1080 }
        );
        expect(filename).toBe('dashboard-1920x1080.png');
    });

    it('should handle route name with multiple spaces', () => {
        const filename = generateScreenshotFilename(
            'My   Route   Name',
            { width: 1920, height: 1080 }
        );
        expect(filename).toBe('my-route-name-1920x1080.png');
    });

    it('should handle timezone with multiple slashes', () => {
        const filename = generateScreenshotFilename(
            'Dashboard',
            { width: 1920, height: 1080 },
            'America/Indiana/Indianapolis'
        );
        expect(filename).toBe('dashboard-1920x1080-america-indiana-indianapolis.png');
    });

    it('should handle UTC timezone', () => {
        const filename = generateScreenshotFilename(
            'Dashboard',
            { width: 1920, height: 1080 },
            'UTC'
        );
        expect(filename).toBe('dashboard-1920x1080-utc.png');
    });
});
