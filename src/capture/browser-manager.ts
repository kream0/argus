/**
 * Browser Manager
 *
 * Manages Playwright browser instances and contexts with
 * support for timezone, locale, and viewport configuration.
 */

import {
    chromium,
    firefox,
    webkit,
    type Browser,
    type BrowserContext,
    type BrowserType,
    type Page,
} from 'playwright';
import type { ResolvedArgusConfig, Viewport, AuthConfig } from '../types/config.ts';

export interface BrowserManagerOptions {
    browser: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
}

export interface ContextOptions {
    viewport: Viewport;
    timezone?: string;
    locale?: string;
    storageState?: string;
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
 * Manages browser lifecycle and context creation
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private browserType: BrowserType;
    private headless: boolean;

    constructor(options: BrowserManagerOptions) {
        this.browserType = this.getBrowserType(options.browser);
        this.headless = options.headless ?? true;
    }

    private getBrowserType(browser: 'chromium' | 'firefox' | 'webkit'): BrowserType {
        switch (browser) {
            case 'firefox':
                return firefox;
            case 'webkit':
                return webkit;
            case 'chromium':
            default:
                return chromium;
        }
    }

    /**
     * Launch the browser instance
     */
    async launch(): Promise<Browser> {
        if (this.browser) {
            return this.browser;
        }

        this.browser = await this.browserType.launch({
            headless: this.headless,
        });

        return this.browser;
    }

    /**
     * Create a new browser context with the specified options
     */
    async createContext(options: ContextOptions): Promise<BrowserContext> {
        const browser = await this.launch();

        const context = await browser.newContext({
            viewport: {
                width: options.viewport.width,
                height: options.viewport.height,
            },
            timezoneId: options.timezone,
            locale: options.locale,
            storageState: options.storageState,
        });

        return context;
    }

    /**
     * Create a new page with optional animation disabling
     */
    async createPage(context: BrowserContext, disableAnimations = true): Promise<Page> {
        const page = await context.newPage();

        if (disableAnimations) {
            await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        }

        return page;
    }

    /**
     * Close all contexts and the browser
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
 * Perform authentication using the provided auth config
 */
export async function performAuthentication(
    page: Page,
    baseUrl: string,
    auth: AuthConfig
): Promise<void> {
    const loginUrl = new URL(auth.loginUrl, baseUrl).toString();

    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    // Fill in credentials
    if (auth.credentials.username) {
        await page.fill(auth.usernameSelector, auth.credentials.username);
    }

    if (auth.credentials.password) {
        await page.fill(auth.passwordSelector, auth.credentials.password);
    }

    // Submit the form
    if (auth.submitSelector) {
        await page.click(auth.submitSelector);
    } else {
        await page.press(auth.passwordSelector, 'Enter');
    }

    // Wait for successful login
    await page.waitForSelector(auth.postLoginSelector, { timeout: 30000 });
}

/**
 * Save authentication state for reuse
 */
export async function saveAuthState(
    context: BrowserContext,
    outputPath: string
): Promise<void> {
    await context.storageState({ path: outputPath });
}

/**
 * Create a browser manager from Argus config
 */
export function createBrowserManager(config: ResolvedArgusConfig): BrowserManager {
    return new BrowserManager({
        browser: config.browser,
        headless: true,
    });
}
