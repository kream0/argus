/**
 * Screenshot Capture Engine
 *
 * Handles page navigation, masking, and screenshot capture.
 */

import type { Page } from 'playwright';
import type { Action, RouteConfig, Viewport } from '../types/config.ts';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface CaptureOptions {
    /** Base URL of the application */
    baseUrl: string;
    /** Route path to capture */
    path: string;
    /** Viewport for capture */
    viewport: Viewport;
    /** CSS selectors to mask before capture */
    mask?: string[];
    /** Actions to perform before capture */
    actions?: Action[];
    /** Wait for network idle before capture */
    waitForNetworkIdle?: boolean;
    /** Wait for specific selector before capture */
    waitForSelector?: string;
    /** Additional wait time after page load (ms) */
    waitAfterLoad?: number;
    /** Full screenshot (entire page) vs viewport only */
    fullPage?: boolean;
}

export interface CaptureResult {
    /** Path where screenshot was saved */
    path: string;
    /** Viewport used for capture */
    viewport: Viewport;
    /** Route path captured */
    routePath: string;
    /** Time taken for capture in ms */
    duration: number;
    /** Any warnings during capture */
    warnings: string[];
}

/**
 * CSS for masking elements
 */
function getMaskingCSS(selectors: string[]): string {
    if (selectors.length === 0) return '';

    const selectorList = selectors.join(', ');
    return `
        ${selectorList} {
            background: #000 !important;
            color: transparent !important;
            * {
                visibility: hidden !important;
            }
        }
    `;
}

/**
 * Execute a single action on the page
 */
async function executeAction(page: Page, action: Action): Promise<void> {
    switch (action.type) {
        case 'click':
            await page.click(action.selector);
            break;
        case 'hover':
            await page.hover(action.selector);
            break;
        case 'wait':
            await page.waitForTimeout(action.timeout);
            break;
        case 'scroll':
            if (action.target === 'bottom') {
                await page.evaluate(() => {
                    scrollTo(0, document.body.scrollHeight);
                });
            } else if (action.target === 'top') {
                await page.evaluate(() => {
                    scrollTo(0, 0);
                });
            } else {
                await page.locator(action.target).scrollIntoViewIfNeeded();
            }
            break;
        case 'type':
            await page.fill(action.selector, action.text);
            break;
        case 'select':
            await page.selectOption(action.selector, action.value);
            break;
    }
}

/**
 * Generate a filename for a screenshot
 */
export function generateScreenshotFilename(
    routeName: string,
    viewport: Viewport,
    timezone?: string
): string {
    // Sanitize route name for filename
    const sanitizedName = routeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const viewportName = viewport.name || `${viewport.width}x${viewport.height}`;
    const tz = timezone ? `-${timezone.replace(/\//g, '-').toLowerCase()}` : '';

    return `${sanitizedName}-${viewportName}${tz}.png`;
}

/**
 * Capture a screenshot of a page
 */
export async function captureScreenshot(
    page: Page,
    outputPath: string,
    options: CaptureOptions
): Promise<CaptureResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Construct full URL
    const url = new URL(options.path, options.baseUrl).toString();

    // Navigate to page
    const waitUntil = options.waitForNetworkIdle ? 'networkidle' : 'load';
    await page.goto(url, { waitUntil });

    // Wait for specific selector if provided
    if (options.waitForSelector) {
        try {
            await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        } catch {
            warnings.push(`Timeout waiting for selector: ${options.waitForSelector}`);
        }
    }

    // Execute actions
    if (options.actions && options.actions.length > 0) {
        for (const action of options.actions) {
            try {
                await executeAction(page, action);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                warnings.push(`Action ${action.type} failed: ${message}`);
            }
        }
    }

    // Apply masking
    if (options.mask && options.mask.length > 0) {
        const maskCSS = getMaskingCSS(options.mask);
        await page.addStyleTag({ content: maskCSS });
    }

    // Additional wait after load
    if (options.waitAfterLoad && options.waitAfterLoad > 0) {
        await page.waitForTimeout(options.waitAfterLoad);
    }

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Take screenshot
    await page.screenshot({
        path: outputPath,
        fullPage: options.fullPage ?? false,
    });

    return {
        path: outputPath,
        viewport: options.viewport,
        routePath: options.path,
        duration: Date.now() - startTime,
        warnings,
    };
}

/**
 * Capture a route with all its configurations
 */
export async function captureRoute(
    page: Page,
    route: RouteConfig,
    baseUrl: string,
    outputDir: string,
    viewport: Viewport,
    globalMask: string[] = [],
    timezone?: string,
    waitForNetworkIdle = true
): Promise<CaptureResult> {
    const filename = generateScreenshotFilename(
        route.name,
        viewport,
        route.timezone || timezone
    );
    const outputPath = join(outputDir, filename);

    // Merge global and route-specific masks
    const mask = [...globalMask, ...(route.mask || [])];

    return captureScreenshot(page, outputPath, {
        baseUrl,
        path: route.path,
        viewport,
        mask,
        actions: route.actions,
        waitForNetworkIdle,
        waitForSelector: route.waitForSelector,
        waitAfterLoad: route.waitAfterLoad,
    });
}
