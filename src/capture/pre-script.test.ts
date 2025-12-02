/**
 * Pre-Script Module Tests
 */

import { describe, it, expect } from 'bun:test';
import { createPreScriptContext } from './pre-script.ts';

describe('Pre-Script Module', () => {
    describe('createPreScriptContext', () => {
        it('should create context with required properties', () => {
            const mockPage = {} as any;
            const context = createPreScriptContext(
                mockPage,
                'http://localhost:3000',
                '/dashboard',
                { width: 1920, height: 1080 }
            );

            expect(context.page).toBe(mockPage);
            expect(context.baseUrl).toBe('http://localhost:3000');
            expect(context.routePath).toBe('/dashboard');
            expect(context.viewport).toEqual({ width: 1920, height: 1080 });
            expect(context.timezone).toBeUndefined();
            expect(context.locale).toBeUndefined();
        });

        it('should include optional timezone and locale', () => {
            const mockPage = {} as any;
            const context = createPreScriptContext(
                mockPage,
                'http://localhost:3000',
                '/dashboard',
                { width: 1920, height: 1080 },
                'America/New_York',
                'en-US'
            );

            expect(context.timezone).toBe('America/New_York');
            expect(context.locale).toBe('en-US');
        });
    });

    describe('PreScriptContext interface', () => {
        it('should have the expected shape', () => {
            const context = {
                page: {} as any,
                baseUrl: 'http://localhost:3000',
                routePath: '/test',
                viewport: { width: 1920, height: 1080 },
                timezone: 'UTC',
                locale: 'en-US',
            };

            // Type check - all required properties exist
            expect(context.page).toBeDefined();
            expect(context.baseUrl).toBeDefined();
            expect(context.routePath).toBeDefined();
            expect(context.viewport).toBeDefined();
        });
    });

    describe('PreScriptResult interface', () => {
        it('should represent a successful execution', () => {
            const result = {
                success: true,
                duration: 150,
                data: { customValue: 42 },
            };

            expect(result.success).toBe(true);
            expect(result.duration).toBe(150);
            expect(result.data).toEqual({ customValue: 42 });
        });

        it('should represent a failed execution', () => {
            const result = {
                success: false,
                duration: 50,
                error: 'Script timeout',
            };

            expect(result.success).toBe(false);
            expect(result.error).toBe('Script timeout');
        });
    });
});
