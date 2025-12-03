/**
 * Example Pre-Script
 * 
 * This is an example pre-script that can be used before capturing screenshots.
 * Pre-scripts receive the Playwright page and context information.
 * 
 * Usage in argus.config.ts:
 * ```typescript
 * routes: [
 *   {
 *     name: 'Dashboard',
 *     path: '/dashboard',
 *     preScript: './scripts/prepare-dashboard.ts',
 *   }
 * ]
 * ```
 */

import type { PreScriptContext } from '../src/capture/pre-script.ts';

/**
 * Pre-script function executed before screenshot capture
 */
export default async function preScript(context: PreScriptContext): Promise<void> {
    const { page, routePath, viewport } = context;

    console.log(`[Pre-script] Preparing ${routePath} at ${viewport.width}x${viewport.height}`);

    // Example: Wait for async content to load
    await page.waitForLoadState('networkidle');

    // Example: Close any modals or popups
    const closeButtons = page.locator('[data-dismiss="modal"], .modal-close, .popup-close');
    if ((await closeButtons.count()) > 0) {
        await closeButtons.first().click().catch(() => {
            // Modal might not be visible, that's fine
        });
    }

    // Example: Collapse sidebars on mobile viewports
    if (viewport.width < 768) {
        const sidebarToggle = page.locator('[data-toggle="sidebar"]');
        if ((await sidebarToggle.count()) > 0) {
            await sidebarToggle.click().catch(() => { });
        }
    }

    // Example: Set a consistent date for date pickers
    await page.evaluate(() => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach((input) => {
            if (input instanceof HTMLInputElement) {
                input.value = '2025-01-01';
            }
        });
    });

    // Example: Remove any toast notifications
    await page.evaluate(() => {
        document
            .querySelectorAll('.toast, .notification, .alert-dismissible')
            .forEach((el) => el.remove());
    });

    console.log(`[Pre-script] Finished preparing ${routePath}`);
}
