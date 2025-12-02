/**
 * Link Crawler
 *
 * Extracts and normalizes links from web pages.
 */

import type { Page } from 'playwright';

export interface CrawlOptions {
    /** Base URL to resolve relative links */
    baseUrl: string;
    /** URL patterns to exclude (glob-style) */
    exclude?: string[];
    /** URL patterns to include (if set, only matching URLs are crawled) */
    include?: string[];
}

export interface ExtractedLink {
    /** Normalized absolute URL */
    url: string;
    /** Original href attribute value */
    href: string;
    /** Link text content */
    text: string;
}

/**
 * Check if a URL matches any of the glob patterns
 */
function matchesPattern(url: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
        const regex = globToRegex(pattern);
        if (regex.test(url)) {
            return true;
        }
    }
    return false;
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Normalize a URL by removing trailing slashes, fragments, and query params (optionally)
 */
export function normalizeUrl(url: string, removeQuery = false): string {
    try {
        const parsed = new URL(url);

        // Remove fragment
        parsed.hash = '';

        // Optionally remove query string
        if (removeQuery) {
            parsed.search = '';
        }

        // Remove trailing slash from pathname (except for root)
        if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
            parsed.pathname = parsed.pathname.slice(0, -1);
        }

        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Check if a URL is internal (same origin)
 */
export function isInternalUrl(url: string, baseUrl: string): boolean {
    try {
        const targetUrl = new URL(url);
        const base = new URL(baseUrl);
        return targetUrl.origin === base.origin;
    } catch {
        return false;
    }
}

/**
 * Check if a URL should be crawled (not a resource, not excluded)
 */
export function shouldCrawl(url: string, options: CrawlOptions): boolean {
    // Skip non-http(s) URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
    }

    // Must be internal
    if (!isInternalUrl(url, options.baseUrl)) {
        return false;
    }

    // Skip common resource extensions
    const resourceExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
        '.css', '.js', '.json', '.xml', '.txt', '.pdf',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.mp3', '.mp4', '.webm', '.ogg', '.wav',
        '.zip', '.tar', '.gz', '.rar',
    ];

    const pathname = new URL(url).pathname.toLowerCase();
    if (resourceExtensions.some((ext) => pathname.endsWith(ext))) {
        return false;
    }

    // Check exclude patterns
    if (options.exclude && options.exclude.length > 0) {
        const path = new URL(url).pathname;
        if (matchesPattern(path, options.exclude)) {
            return false;
        }
    }

    // Check include patterns (if specified, only include matching URLs)
    if (options.include && options.include.length > 0) {
        const path = new URL(url).pathname;
        if (!matchesPattern(path, options.include)) {
            return false;
        }
    }

    return true;
}

/**
 * Extract all links from a page
 */
export async function extractLinks(page: Page, options: CrawlOptions): Promise<ExtractedLink[]> {
    const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors).map((a) => ({
            href: a.getAttribute('href') || '',
            text: a.textContent?.trim() || '',
        }));
    });

    const extractedLinks: ExtractedLink[] = [];
    const seen = new Set<string>();

    for (const link of links) {
        if (!link.href) continue;

        // Resolve relative URLs
        let absoluteUrl: string;
        try {
            absoluteUrl = new URL(link.href, options.baseUrl).toString();
        } catch {
            continue;
        }

        // Normalize
        const normalizedUrl = normalizeUrl(absoluteUrl);

        // Skip if already seen or shouldn't crawl
        if (seen.has(normalizedUrl)) continue;
        if (!shouldCrawl(normalizedUrl, options)) continue;

        seen.add(normalizedUrl);
        extractedLinks.push({
            url: normalizedUrl,
            href: link.href,
            text: link.text,
        });
    }

    return extractedLinks;
}

/**
 * Get the path from a URL for naming purposes
 */
export function getPathName(url: string): string {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname;

        if (path === '/' || path === '') {
            return 'home';
        }

        // Remove leading/trailing slashes and convert to name
        return path
            .replace(/^\/|\/$/g, '')
            .replace(/\//g, '-')
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
    } catch {
        return 'page';
    }
}
