/**
 * Puppeteer Explorer Engine
 *
 * Auto-discovery mode using Puppeteer for systems where Playwright doesn't work.
 */

import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import * as readline from 'node:readline';
import type { Page, Browser } from 'puppeteer-core';
import type { ResolvedArgusConfig, Viewport } from '../types/config.ts';
import { PuppeteerBrowserManager, createPuppeteerManager } from '../capture/puppeteer-browser-manager.ts';

export interface ExplorerOptions {
    startUrl: string;
    maxDepth?: number;
    maxPages?: number;
    exclude?: string[];
    mode?: 'baseline' | 'current';
    headless?: boolean;
    /** Pre-provided credentials for auto-login */
    credentials?: {
        username: string;
        password: string;
    };
}

export interface ExplorerResult {
    url: string;
    path: string;
    depth: number;
    screenshots: string[];
    error?: string;
    /** Whether this page was detected as a login page */
    isLoginPage?: boolean;
}

export interface ExplorerReport {
    startUrl: string;
    discovered: number;
    captured: number;
    screenshots: number;
    failed: number;
    results: ExplorerResult[];
    duration: number;
    /** Whether authentication was performed */
    authenticated?: boolean;
}

export interface LoginDetectionResult {
    isLoginPage: boolean;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
}

/**
 * Prompt user for input from terminal
 */
async function promptUser(question: string, hidden = false): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        if (hidden) {
            // For password, we need to handle it differently
            process.stdout.write(question);
            let password = '';

            const stdin = process.stdin;
            const wasRaw = stdin.isRaw;
            stdin.setRawMode?.(true);
            stdin.resume();
            stdin.setEncoding('utf8');

            const onData = (char: string) => {
                if (char === '\n' || char === '\r' || char === '\u0004') {
                    stdin.setRawMode?.(wasRaw ?? false);
                    stdin.removeListener('data', onData);
                    stdin.pause();
                    process.stdout.write('\n');
                    rl.close();
                    resolve(password);
                } else if (char === '\u0003') {
                    // Ctrl+C
                    process.exit();
                } else if (char === '\u007F' || char === '\b') {
                    // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else {
                    password += char;
                    process.stdout.write('*');
                }
            };

            stdin.on('data', onData);
        } else {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        }
    });
}

/**
 * Detect if current page is a login page
 */
async function detectLoginPage(page: Page): Promise<LoginDetectionResult> {
    return await page.evaluate(() => {
        // Common selectors for login forms - ordered by specificity
        const usernameSelectors = [
            '#userName',
            '#username',
            '#email',
            '#user',
            '#login',
            'input[type="email"]',
            'input[name="email"]',
            'input[name="username"]',
            'input[name="user"]',
            'input[name="login"]',
            'input[id*="user"]',
            'input[id*="email"]',
            'input[id*="login"]',
            'input[autocomplete="email"]',
            'input[autocomplete="username"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="user" i]',
        ];

        const passwordSelectors = [
            '#password',
            '#pwd',
            '#pass',
            'input[type="password"]',
            'input[name="password"]',
            'input[autocomplete="current-password"]',
        ];

        const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button.submit-btn',
            'button.login-btn',
            'button.login-button',
            '#login-button',
            '#submit',
            '[data-testid="login-button"]',
        ];

        let usernameSelector: string | undefined;
        let passwordSelector: string | undefined;
        let submitSelector: string | undefined;

        // Find username field
        for (const selector of usernameSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el && (el as HTMLElement).offsetParent !== null) {
                    usernameSelector = selector;
                    break;
                }
            } catch {
                // Invalid selector
            }
        }

        // Find password field
        for (const selector of passwordSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el && (el as HTMLElement).offsetParent !== null) {
                    passwordSelector = selector;
                    break;
                }
            } catch {
                // Invalid selector
            }
        }

        // Find submit button
        for (const selector of submitSelectors) {
            try {
                const el = document.querySelector(selector);
                if (el && (el as HTMLElement).offsetParent !== null) {
                    submitSelector = selector;
                    break;
                }
            } catch {
                // Invalid selector
            }
        }

        // If no specific submit selector found, look for any visible button
        if (!submitSelector) {
            const buttons = Array.from(document.querySelectorAll('button'));
            for (const btn of buttons) {
                if ((btn as HTMLElement).offsetParent !== null) {
                    const text = btn.textContent?.toLowerCase() ?? '';
                    if (text.includes('login') || text.includes('sign in') ||
                        text.includes('log in') || text.includes('connect') ||
                        text.includes('submit') || btn.type === 'submit') {
                        submitSelector = 'button[type="submit"]';
                        break;
                    }
                }
            }
        }

        // A page is a login page if it has both username/email and password fields
        const isLoginPage = !!(usernameSelector && passwordSelector);

        console.log('[detectLoginPage] Found:', { usernameSelector, passwordSelector, submitSelector, isLoginPage });

        return {
            isLoginPage,
            usernameSelector,
            passwordSelector,
            submitSelector,
        };
    });
}

/**
 * Perform login on the page
 */
async function performLogin(
    page: Page,
    detection: LoginDetectionResult,
    username: string,
    password: string
): Promise<boolean> {
    try {
        console.log('[Auth] Attempting login...');

        // Clear and fill username
        if (detection.usernameSelector) {
            await page.click(detection.usernameSelector);
            await page.evaluate((sel) => {
                const el = document.querySelector(sel) as HTMLInputElement;
                if (el) el.value = '';
            }, detection.usernameSelector);
            await page.type(detection.usernameSelector, username, { delay: 50 });
        }

        // Clear and fill password
        if (detection.passwordSelector) {
            await page.click(detection.passwordSelector);
            await page.evaluate((sel) => {
                const el = document.querySelector(sel) as HTMLInputElement;
                if (el) el.value = '';
            }, detection.passwordSelector);
            await page.type(detection.passwordSelector, password, { delay: 50 });
        }

        // Submit
        if (detection.submitSelector) {
            await page.click(detection.submitSelector);
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
        }

        // Wait for navigation or page change
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        } catch {
            // Navigation might not happen if it's a SPA
            await new Promise(r => setTimeout(r, 2000));
        }

        // Check if we're still on login page
        const afterLogin = await detectLoginPage(page);
        if (afterLogin.isLoginPage) {
            console.log('[Auth] Still on login page - credentials may be incorrect');
            return false;
        }

        console.log('[Auth] Login successful!');
        return true;
    } catch (err) {
        console.log(`[Auth] Login failed: ${err instanceof Error ? err.message : err}`);
        return false;
    }
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Remove trailing slash, hash, and normalize
        let normalized = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
        if (parsed.search) {
            normalized += parsed.search;
        }
        return normalized || url;
    } catch {
        return url;
    }
}

/**
 * Get path name from URL for filename
 */
function getPathName(url: string): string {
    try {
        const parsed = new URL(url);
        let path = parsed.pathname.replace(/^\/|\/$/g, '') || 'home';
        path = path.replace(/\//g, '-');
        return path;
    } catch {
        return 'unknown';
    }
}

/**
 * Check if URL should be crawled
 */
function shouldCrawl(url: string, baseUrl: string, exclude: string[] = []): boolean {
    try {
        const parsed = new URL(url);
        const base = new URL(baseUrl);

        // Must be same origin
        if (parsed.origin !== base.origin) return false;

        // Skip non-http protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;

        // Skip file extensions that aren't pages
        const ext = parsed.pathname.split('.').pop()?.toLowerCase();
        const skipExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'ico', 'woff', 'woff2', 'ttf'];
        if (ext && skipExtensions.includes(ext)) return false;

        // Check exclude patterns
        for (const pattern of exclude) {
            if (url.includes(pattern)) return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Extract links from page
 */
async function extractLinks(page: Page, baseUrl: string, exclude: string[] = []): Promise<string[]> {
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => a.getAttribute('href')).filter(Boolean) as string[];
    });

    const validLinks: string[] = [];
    for (const href of links) {
        try {
            const fullUrl = new URL(href, baseUrl).toString();
            if (shouldCrawl(fullUrl, baseUrl, exclude)) {
                validLinks.push(normalizeUrl(fullUrl));
            }
        } catch {
            // Invalid URL, skip
        }
    }

    return [...new Set(validLinks)];
}

/**
 * Generate screenshot filename
 */
function generateFilename(path: string, viewport: Viewport): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${path}_${viewport.width}x${viewport.height}_${timestamp}.png`;
}

/**
 * Puppeteer Explorer Engine
 */
export class PuppeteerExplorerEngine {
    private config: ResolvedArgusConfig;
    private browserManager: PuppeteerBrowserManager;
    private options: ExplorerOptions;
    private visited = new Set<string>();
    private queue: Array<{ url: string; depth: number }> = [];
    private authenticated = false;
    private credentials?: { username: string; password: string };
    private loginPageUrls = new Set<string>();

    constructor(config: ResolvedArgusConfig, options: ExplorerOptions) {
        this.config = config;
        this.options = options;
        this.browserManager = createPuppeteerManager(config, options.headless ?? true);
        this.credentials = options.credentials;
    }

    private getOutputDir(): string {
        const mode = this.options.mode ?? 'current';
        const subDir = mode === 'baseline' ? 'baselines' : 'current';
        return join(this.config.outputDir, subDir);
    }

    private async captureUrl(url: string, depth: number): Promise<ExplorerResult> {
        const path = getPathName(url);
        const screenshots: string[] = [];
        let error: string | undefined;
        let isLoginPage = false;

        const page = await this.browserManager.createPage({
            viewport: this.config.viewports[0] ?? { width: 1920, height: 1080 },
            timezone: this.config.timezone,
        });

        console.log(`[Explorer] Navigating to ${url}...`);

        try {
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            });
            console.log(`[Explorer] Page loaded`);

            // Check if this is a login page
            const loginDetection = await detectLoginPage(page);
            isLoginPage = loginDetection.isLoginPage;

            if (isLoginPage) {
                console.log(`[Explorer] 🔐 Login page detected!`);
                this.loginPageUrls.add(url);
            }

            // ALWAYS capture the current page FIRST (before any login attempt)
            // This ensures we capture public pages like login, register, etc.
            for (const viewport of this.config.viewports) {
                console.log(`[Explorer] Capturing ${viewport.width}x${viewport.height}...`);
                await page.setViewport({
                    width: viewport.width,
                    height: viewport.height,
                });

                const filename = generateFilename(`explore-${path}`, viewport);
                const outputPath = join(this.getOutputDir(), filename);

                try {
                    await page.screenshot({ path: outputPath, fullPage: false });
                    screenshots.push(outputPath);
                    console.log(`[Explorer] Saved: ${filename}`);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    error = error ? `${error}; ${message}` : message;
                }
            }

            // Extract links from current page BEFORE login
            const maxDepth = this.options.maxDepth ?? this.config.explorer.maxDepth;
            if (depth < maxDepth) {
                const links = await extractLinks(page, this.options.startUrl, this.options.exclude);
                for (const link of links) {
                    if (!this.visited.has(link)) {
                        this.queue.push({ url: link, depth: depth + 1 });
                    }
                }
                console.log(`[Explorer] Found ${links.length} links`);
            }

            // NOW handle authentication if this is a login page and we haven't authenticated yet
            if (isLoginPage && !this.authenticated) {
                if (this.credentials) {
                    // We have credentials - attempt login
                    const success = await performLogin(
                        page,
                        loginDetection,
                        this.credentials.username,
                        this.credentials.password
                    );

                    if (success) {
                        this.authenticated = true;
                        // Extract NEW links after login (these are protected routes)
                        const newLinks = await extractLinks(page, this.options.startUrl, this.options.exclude);
                        for (const link of newLinks) {
                            if (!this.visited.has(link)) {
                                this.queue.push({ url: link, depth: depth + 1 });
                            }
                        }
                        console.log(`[Explorer] Found ${newLinks.length} additional links after login`);
                    }
                } else {
                    // No credentials provided - prompt user
                    console.log('\n┌─────────────────────────────────────────────────────────┐');
                    console.log('│  🔐 Authentication Required                              │');
                    console.log('│  A login page was detected. Enter credentials to         │');
                    console.log('│  continue exploring protected areas.                     │');
                    console.log('│  (Press Enter to skip and only explore public pages)     │');
                    console.log('└─────────────────────────────────────────────────────────┘\n');

                    const username = await promptUser('  Email/Username: ');

                    if (username) {
                        const password = await promptUser('  Password: ', true);

                        if (password) {
                            this.credentials = { username, password };

                            const success = await performLogin(
                                page,
                                loginDetection,
                                username,
                                password
                            );

                            if (success) {
                                this.authenticated = true;
                                // Extract NEW links after login
                                const newLinks = await extractLinks(page, this.options.startUrl, this.options.exclude);
                                for (const link of newLinks) {
                                    if (!this.visited.has(link)) {
                                        this.queue.push({ url: link, depth: depth + 1 });
                                    }
                                }
                                console.log(`[Explorer] Found ${newLinks.length} additional links after login`);
                            }
                        }
                    } else {
                        console.log('[Explorer] Skipping authentication - will only explore public pages');
                    }
                }
            }
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            console.log(`[Explorer] Error: ${error}`);
        } finally {
            await page.close();
        }

        return { url, path, depth, screenshots, error, isLoginPage };
    }

    async explore(
        onProgress?: (discovered: number, captured: number, current?: ExplorerResult) => void
    ): Promise<ExplorerReport> {
        const startTime = Date.now();
        const results: ExplorerResult[] = [];
        const maxPages = this.options.maxPages ?? this.config.explorer.maxPages;

        console.log('[Explorer] Creating output directory...');
        await mkdir(this.getOutputDir(), { recursive: true });

        const startUrl = normalizeUrl(this.options.startUrl);
        this.queue.push({ url: startUrl, depth: 0 });

        console.log('[Explorer] Launching browser...');
        await this.browserManager.launch();

        try {
            while (this.queue.length > 0 && results.length < maxPages) {
                const item = this.queue.shift();
                if (!item) break;

                const { url, depth } = item;
                const normalized = normalizeUrl(url);

                if (this.visited.has(normalized)) continue;
                this.visited.add(normalized);

                console.log(`\n[Explorer] (${results.length + 1}/${maxPages}) ${url}`);
                const result = await this.captureUrl(url, depth);
                results.push(result);

                onProgress?.(this.visited.size + this.queue.length, results.length, result);
            }
        } finally {
            await this.browserManager.close();
        }

        const captured = results.filter(r => r.screenshots.length > 0).length;
        const screenshotCount = results.reduce((sum, r) => sum + r.screenshots.length, 0);
        const failed = results.filter(r => r.error).length;

        return {
            startUrl: this.options.startUrl,
            discovered: this.visited.size,
            captured,
            screenshots: screenshotCount,
            failed,
            results,
            duration: Date.now() - startTime,
            authenticated: this.authenticated,
        };
    }

    async close(): Promise<void> {
        await this.browserManager.close();
    }
}

/**
 * Run Puppeteer explorer
 */
export async function runPuppeteerExplorer(
    config: ResolvedArgusConfig,
    options: ExplorerOptions,
    onProgress?: (discovered: number, captured: number, current?: ExplorerResult) => void
): Promise<ExplorerReport> {
    const engine = new PuppeteerExplorerEngine(config, options);

    try {
        return await engine.explore(onProgress);
    } finally {
        await engine.close();
    }
}
