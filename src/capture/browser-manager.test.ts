/**
 * Tests for Browser Manager
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { BrowserManager, type BrowserManagerOptions } from './browser-manager.ts';

describe('BrowserManager', () => {
    describe('constructor', () => {
        it('should create instance with chromium by default', () => {
            const manager = new BrowserManager({ browser: 'chromium' });
            expect(manager).toBeInstanceOf(BrowserManager);
        });

        it('should accept firefox browser option', () => {
            const manager = new BrowserManager({ browser: 'firefox' });
            expect(manager).toBeInstanceOf(BrowserManager);
        });

        it('should accept webkit browser option', () => {
            const manager = new BrowserManager({ browser: 'webkit' });
            expect(manager).toBeInstanceOf(BrowserManager);
        });

        it('should default headless to true', () => {
            const manager = new BrowserManager({ browser: 'chromium' });
            expect(manager.isLaunched()).toBe(false);
        });
    });

    describe('getBrowser', () => {
        it('should return null when not launched', () => {
            const manager = new BrowserManager({ browser: 'chromium' });
            expect(manager.getBrowser()).toBeNull();
        });
    });

    describe('isLaunched', () => {
        it('should return false when not launched', () => {
            const manager = new BrowserManager({ browser: 'chromium' });
            expect(manager.isLaunched()).toBe(false);
        });
    });
});
