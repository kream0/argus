/**
 * Capture Module Exports
 */

export {
    BrowserManager,
    createBrowserManager,
    performAuthentication,
    saveAuthState,
    type BrowserManagerOptions,
    type ContextOptions,
} from './browser-manager.ts';

export {
    captureScreenshot,
    captureRoute,
    generateScreenshotFilename,
    type CaptureOptions,
    type CaptureResult,
} from './screenshot.ts';

export {
    CaptureEngine,
    runCapture,
    type CaptureEngineOptions,
    type CaptureReport,
    type CaptureError,
} from './capture-engine.ts';

export {
    executePreScript,
    loadPreScript,
    createPreScriptContext,
    type PreScriptContext,
    type PreScriptResult,
    type PreScriptFunction,
} from './pre-script.ts';
