/**
 * Example Argus Configuration
 * 
 * This is a comprehensive example showing all available configuration options.
 * Copy this file to your project root as argus.config.ts and customize.
 */

import { defineConfig } from '../src/config/index.ts';

export default defineConfig({
    // Base URL of the application to test
    baseUrl: 'http://localhost:3000',

    // Viewports to capture
    viewports: [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1280, height: 800, name: 'laptop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 812, name: 'mobile' },
    ],

    // Number of concurrent captures (default: 4)
    concurrency: 4,

    // Global timezone and locale for consistent captures
    timezone: 'America/New_York',
    locale: 'en-US',

    // CSS selectors to mask globally (hide dynamic content)
    globalMask: [
        '[data-testid="timestamp"]',
        '.avatar',
        '.ad-banner',
        '[data-dynamic]',
    ],

    // Authentication configuration (optional)
    auth: {
        loginUrl: '/login',
        usernameSelector: '#username',
        passwordSelector: '#password',
        credentials: {
            username: process.env.TEST_USERNAME,
            password: process.env.TEST_PASSWORD,
        },
        postLoginSelector: '[data-testid="dashboard"]',
        submitSelector: 'button[type="submit"]',
    },

    // Explorer mode configuration for auto-discovery
    explorer: {
        maxDepth: 3,
        maxPages: 50,
        exclude: [
            '/api/*',
            '/admin/*',
            '*.pdf',
            '/logout',
        ],
        include: [
            '/dashboard/*',
            '/settings/*',
        ],
    },

    // Routes to capture
    routes: [
        // Simple route
        {
            name: 'Home',
            path: '/',
        },

        // Route with custom viewport
        {
            name: 'Dashboard',
            path: '/dashboard',
            viewports: [
                { width: 1920, height: 1080, name: 'wide' },
            ],
        },

        // Route with actions
        {
            name: 'Dashboard Expanded',
            path: '/dashboard',
            actions: [
                { type: 'click', selector: '#expand-sidebar' },
                { type: 'wait', timeout: 300 },
                { type: 'scroll', target: 'bottom' },
            ],
        },

        // Route with modal open
        {
            name: 'Settings Modal',
            path: '/settings',
            actions: [
                { type: 'click', selector: '[data-testid="open-settings"]' },
                { type: 'wait', timeout: 500 },
            ],
            waitForSelector: '.modal-content',
        },

        // Route with form filled
        {
            name: 'Contact Form',
            path: '/contact',
            actions: [
                { type: 'type', selector: '#name', text: 'Test User' },
                { type: 'type', selector: '#email', text: 'test@example.com' },
                { type: 'type', selector: '#message', text: 'This is a test message.' },
            ],
        },

        // Route with dropdown selection
        {
            name: 'Product Filter',
            path: '/products',
            actions: [
                { type: 'select', selector: '#category', value: 'electronics' },
                { type: 'click', selector: '#apply-filter' },
                { type: 'wait', timeout: 1000 },
            ],
        },

        // Route with hover state
        {
            name: 'Navigation Hover',
            path: '/',
            actions: [
                { type: 'hover', selector: '.nav-dropdown-trigger' },
            ],
        },

        // Route with custom pre-script
        {
            name: 'Complex Page',
            path: '/complex',
            preScript: './scripts/prepare-complex-page.ts',
        },

        // Route with specific mask and wait
        {
            name: 'Profile',
            path: '/profile',
            mask: [
                '.profile-picture',
                '.last-login-time',
            ],
            waitAfterLoad: 500,
        },

        // Route with different timezone
        {
            name: 'Calendar Tokyo',
            path: '/calendar',
            timezone: 'Asia/Tokyo',
            locale: 'ja-JP',
        },
    ],

    // Comparison threshold configuration
    threshold: {
        pixel: 0.1,           // Pixel sensitivity (0-1)
        failureThreshold: 0.1, // % of different pixels to fail (0-100)
    },

    // Output directory for screenshots and reports
    outputDir: '.argus',

    // Browser to use (chromium, firefox, webkit)
    browser: 'chromium',

    // Disable CSS animations for consistent captures
    disableAnimations: true,

    // Wait for network idle before capture
    waitForNetworkIdle: true,
});
