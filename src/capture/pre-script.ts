/**
 * Pre-Script Execution Module
 *
 * Handles execution of custom JavaScript/TypeScript scripts before screenshot capture.
 */

import type { Page } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PreScriptContext {
    /** Playwright page instance */
    page: Page;
    /** Base URL of the application */
    baseUrl: string;
    /** Current route path */
    routePath: string;
    /** Viewport being used */
    viewport: { width: number; height: number };
    /** Timezone setting */
    timezone?: string;
    /** Locale setting */
    locale?: string;
}

export interface PreScriptResult {
    /** Whether the script executed successfully */
    success: boolean;
    /** Duration of script execution in ms */
    duration: number;
    /** Error message if failed */
    error?: string;
    /** Any data returned by the script */
    data?: unknown;
}

export type PreScriptFunction = (context: PreScriptContext) => Promise<void | unknown>;

/**
 * Load and validate a pre-script module
 */
export async function loadPreScript(scriptPath: string): Promise<PreScriptFunction> {
    const absolutePath = resolve(scriptPath);

    if (!existsSync(absolutePath)) {
        throw new Error(`Pre-script not found: ${absolutePath}`);
    }

    try {
        // Import the script module (Bun can import TS directly)
        const module = await import(absolutePath);

        // Look for default export or named export 'preScript'
        const script = module.default || module.preScript;

        if (typeof script !== 'function') {
            throw new Error(
                `Pre-script must export a function as default or named 'preScript': ${scriptPath}`
            );
        }

        return script as PreScriptFunction;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Pre-script')) {
            throw error;
        }
        throw new Error(`Failed to load pre-script: ${scriptPath} - ${error}`);
    }
}

/**
 * Execute a pre-script with the given context
 */
export async function executePreScript(
    scriptPath: string,
    context: PreScriptContext
): Promise<PreScriptResult> {
    const startTime = Date.now();

    try {
        const script = await loadPreScript(scriptPath);
        const data = await script(context);

        return {
            success: true,
            duration: Date.now() - startTime,
            data,
        };
    } catch (error) {
        return {
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Create a pre-script context from capture parameters
 */
export function createPreScriptContext(
    page: Page,
    baseUrl: string,
    routePath: string,
    viewport: { width: number; height: number },
    timezone?: string,
    locale?: string
): PreScriptContext {
    return {
        page,
        baseUrl,
        routePath,
        viewport,
        timezone,
        locale,
    };
}
