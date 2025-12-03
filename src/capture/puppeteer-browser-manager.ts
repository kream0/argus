/**
 * Puppeteer Browser Manager
 *
 * Alternative browser manager using Puppeteer-core for systems
 * where Playwright's pipe-based communication doesn't work.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type { ResolvedArgusConfig, Viewport, AuthConfig } from '../types/config.ts';

export interface PuppeteerManagerOptions {
    headless?: boolean;
    executablePath?: string;
}

export interface ContextOptions {
    viewport: Viewport;
    timezone?: string;
    locale?: string;
}

/**
 * CSS to inject for disabling animations and transitions
 */
const DISABLE_ANIMATIONS_CSS = `
*,
*::before,
*::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
}
`;

/**
 * Find the browser executable path
 */
function findBrowserPath(): string {
    const paths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env['CHROME_PATH'],
        process.env['EDGE_PATH'],
    ].filter(Boolean) as string[];

    for (const p of paths) {
        try {
            if (require('fs').existsSync(p)) {
                return p;
            }
        } catch {
            // continue
        }
    }

    throw new Error('No browser found. Please install Chrome or Edge, or set CHROME_PATH environment variable.');
}

/**
 * Manages browser lifecycle using Puppeteer
 */
export class PuppeteerBrowserManager {
    private browser: Browser | null = null;
    private headless: boolean;
    private executablePath: string;

    constructor(options: PuppeteerManagerOptions = {}) {
        this.headless = options.headless ?? true;
        this.executablePath = options.executablePath ?? findBrowserPath();
    }

    /**
     * Launch the browser instance
     */
    async launch(): Promise<Browser> {
        if (this.browser) {
            console.log('[PuppeteerManager] Using existing browser instance');
            return this.browser;
        }

        console.log('[PuppeteerManager] Launching browser (headless:', this.headless, ')...');
        console.log('[PuppeteerManager] Using executable:', this.executablePath);

        this.browser = await puppeteer.launch({
            executablePath: this.executablePath,
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
            timeout: 60000,
        });
        console.log('[PuppeteerManager] Browser launched successfully');

        return this.browser;
    }

    /**
     * Create a new page with the specified viewport
     */
    async createPage(options: ContextOptions, disableAnimations = true): Promise<Page> {
        const browser = await this.launch();
        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({
            width: options.viewport.width,
            height: options.viewport.height,
        });

        // Set timezone if supported
        if (options.timezone) {
            try {
                await page.emulateTimezone(options.timezone);
            } catch {
                // Timezone emulation may not be supported
            }
        }

        // Disable animations
        if (disableAnimations) {
            await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        }

        return page;
    }

    /**
     * Close all pages and the browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Get the current browser instance
     */
    getBrowser(): Browser | null {
        return this.browser;
    }

    /**
     * Check if browser is launched
     */
    isLaunched(): boolean {
        return this.browser !== null;
    }
}

/**
 * Perform authentication using Puppeteer
 */
export async function performPuppeteerAuth(
    page: Page,
    baseUrl: string,
    auth: AuthConfig
): Promise<void> {
    const loginUrl = new URL(auth.loginUrl, baseUrl).toString();

    await page.goto(loginUrl, { waitUntil: 'networkidle0' });

    // Fill in credentials
    if (auth.credentials.username) {
        await page.type(auth.usernameSelector, auth.credentials.username);
    }

    if (auth.credentials.password) {
        await page.type(auth.passwordSelector, auth.credentials.password);
    }

    // Submit the form
    if (auth.submitSelector) {
        await page.click(auth.submitSelector);
    } else {
        await page.keyboard.press('Enter');
    }

    // Wait for successful login
    await page.waitForSelector(auth.postLoginSelector, { timeout: 30000 });
}

/**
 * Create a Puppeteer browser manager from Argus config
 */
export function createPuppeteerManager(config: ResolvedArgusConfig, headless: boolean = true): PuppeteerBrowserManager {
    return new PuppeteerBrowserManager({ headless });
}
