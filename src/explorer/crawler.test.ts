/**
 * Tests for Link Crawler
 */

import { describe, it, expect } from 'bun:test';
import {
    normalizeUrl,
    isInternalUrl,
    shouldCrawl,
    getPathName,
    type CrawlOptions,
} from './crawler.ts';

describe('normalizeUrl', () => {
    it('should remove trailing slashes', () => {
        expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should preserve root slash', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('should remove fragments', () => {
        expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    });

    it('should preserve query strings by default', () => {
        expect(normalizeUrl('https://example.com/page?foo=bar')).toBe('https://example.com/page?foo=bar');
    });

    it('should remove query strings when requested', () => {
        expect(normalizeUrl('https://example.com/page?foo=bar', true)).toBe('https://example.com/page');
    });

    it('should handle invalid URLs gracefully', () => {
        expect(normalizeUrl('not-a-url')).toBe('not-a-url');
    });
});

describe('isInternalUrl', () => {
    it('should return true for same origin', () => {
        expect(isInternalUrl('https://example.com/page', 'https://example.com')).toBe(true);
    });

    it('should return true for same origin with different paths', () => {
        expect(isInternalUrl('https://example.com/a/b/c', 'https://example.com/x/y')).toBe(true);
    });

    it('should return false for different origins', () => {
        expect(isInternalUrl('https://other.com/page', 'https://example.com')).toBe(false);
    });

    it('should return false for different subdomains', () => {
        expect(isInternalUrl('https://sub.example.com/page', 'https://example.com')).toBe(false);
    });

    it('should return false for different protocols', () => {
        expect(isInternalUrl('http://example.com/page', 'https://example.com')).toBe(false);
    });

    it('should handle invalid URLs', () => {
        expect(isInternalUrl('not-a-url', 'https://example.com')).toBe(false);
    });
});

describe('shouldCrawl', () => {
    const baseOptions: CrawlOptions = {
        baseUrl: 'https://example.com',
    };

    it('should allow internal URLs', () => {
        expect(shouldCrawl('https://example.com/page', baseOptions)).toBe(true);
    });

    it('should reject external URLs', () => {
        expect(shouldCrawl('https://other.com/page', baseOptions)).toBe(false);
    });

    it('should reject non-http URLs', () => {
        expect(shouldCrawl('mailto:test@example.com', baseOptions)).toBe(false);
        expect(shouldCrawl('javascript:void(0)', baseOptions)).toBe(false);
    });

    it('should reject image files', () => {
        expect(shouldCrawl('https://example.com/image.png', baseOptions)).toBe(false);
        expect(shouldCrawl('https://example.com/photo.jpg', baseOptions)).toBe(false);
    });

    it('should reject resource files', () => {
        expect(shouldCrawl('https://example.com/style.css', baseOptions)).toBe(false);
        expect(shouldCrawl('https://example.com/script.js', baseOptions)).toBe(false);
        expect(shouldCrawl('https://example.com/data.json', baseOptions)).toBe(false);
    });

    it('should respect exclude patterns', () => {
        const options: CrawlOptions = {
            baseUrl: 'https://example.com',
            exclude: ['/admin/*', '/logout'],
        };
        expect(shouldCrawl('https://example.com/admin/settings', options)).toBe(false);
        expect(shouldCrawl('https://example.com/logout', options)).toBe(false);
        expect(shouldCrawl('https://example.com/dashboard', options)).toBe(true);
    });

    it('should respect include patterns', () => {
        const options: CrawlOptions = {
            baseUrl: 'https://example.com',
            include: ['/docs/*', '/api/*'],
        };
        expect(shouldCrawl('https://example.com/docs/guide', options)).toBe(true);
        expect(shouldCrawl('https://example.com/api/v1', options)).toBe(true);
        expect(shouldCrawl('https://example.com/home', options)).toBe(false);
    });
});

describe('getPathName', () => {
    it('should return "home" for root path', () => {
        expect(getPathName('https://example.com/')).toBe('home');
        expect(getPathName('https://example.com')).toBe('home');
    });

    it('should convert path to kebab-case name', () => {
        expect(getPathName('https://example.com/about')).toBe('about');
        expect(getPathName('https://example.com/contact-us')).toBe('contact-us');
    });

    it('should handle nested paths', () => {
        expect(getPathName('https://example.com/docs/guide/intro')).toBe('docs-guide-intro');
    });

    it('should sanitize special characters', () => {
        expect(getPathName('https://example.com/page%20name')).toBe('page-20name');
    });

    it('should handle invalid URLs', () => {
        expect(getPathName('not-a-url')).toBe('page');
    });
});
