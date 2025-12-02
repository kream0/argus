/**
 * Argus Configuration Types
 *
 * Type definitions for the argus.config.ts configuration file.
 */

/**
 * Viewport dimensions for screenshot capture
 */
export interface Viewport {
    width: number;
    height: number;
    name?: string;
}

/**
 * Authentication configuration for accessing protected routes
 */
export interface AuthConfig {
    /** URL path for the login page */
    loginUrl: string;
    /** CSS selector for the username/email input */
    usernameSelector: string;
    /** CSS selector for the password input */
    passwordSelector: string;
    /** Login credentials (use environment variables) */
    credentials: {
        username: string | undefined;
        password: string | undefined;
    };
    /** CSS selector to wait for after successful login */
    postLoginSelector: string;
    /** Optional submit button selector (defaults to form submit) */
    submitSelector?: string;
}

/**
 * Explorer mode configuration for auto-discovery crawling
 */
export interface ExplorerConfig {
    /** Maximum depth to crawl from the starting URL */
    maxDepth: number;
    /** Maximum number of pages to capture */
    maxPages: number;
    /** URL patterns to exclude (supports glob patterns) */
    exclude?: string[];
    /** URL patterns to include (if set, only matching URLs are crawled) */
    include?: string[];
}

/**
 * Pre-screenshot actions to perform on a page
 */
export type ActionType = 'click' | 'hover' | 'wait' | 'scroll' | 'type' | 'select';

export interface BaseAction {
    type: ActionType;
}

export interface ClickAction extends BaseAction {
    type: 'click';
    selector: string;
}

export interface HoverAction extends BaseAction {
    type: 'hover';
    selector: string;
}

export interface WaitAction extends BaseAction {
    type: 'wait';
    /** Timeout in milliseconds */
    timeout: number;
}

export interface ScrollAction extends BaseAction {
    type: 'scroll';
    /** CSS selector to scroll to, or 'bottom'/'top' */
    target: string;
}

export interface TypeAction extends BaseAction {
    type: 'type';
    selector: string;
    text: string;
}

export interface SelectAction extends BaseAction {
    type: 'select';
    selector: string;
    value: string;
}

export type Action =
    | ClickAction
    | HoverAction
    | WaitAction
    | ScrollAction
    | TypeAction
    | SelectAction;

/**
 * Route configuration for user-defined capture targets
 */
export interface RouteConfig {
    /** URL path relative to baseUrl */
    path: string;
    /** Descriptive name for the route (used in reports and filenames) */
    name: string;
    /** Override timezone for this route */
    timezone?: string;
    /** Override locale for this route */
    locale?: string;
    /** Override viewports for this route */
    viewports?: Viewport[];
    /** CSS selectors to mask (hide) before capture */
    mask?: string[];
    /** Actions to perform before capturing screenshot */
    actions?: Action[];
    /** Path to custom script to execute before capture */
    preScript?: string;
    /** Wait for this selector before capturing */
    waitForSelector?: string;
    /** Additional wait time in ms after page load */
    waitAfterLoad?: number;
}

/**
 * Comparison threshold configuration
 */
export interface ThresholdConfig {
    /** Pixel difference threshold (0-1, default: 0.1) */
    pixel: number;
    /** Percentage of different pixels to fail (0-100, default: 0.1) */
    failureThreshold: number;
}

/**
 * Main Argus configuration
 */
export interface ArgusConfig {
    /** Base URL of the application to test */
    baseUrl: string;

    /** Viewports to capture (default: [{ width: 1920, height: 1080 }]) */
    viewports?: Viewport[];

    /** Number of concurrent captures (default: 4) */
    concurrency?: number;

    /** Global timezone override (e.g., 'America/New_York') */
    timezone?: string;

    /** Global locale override (e.g., 'en-US') */
    locale?: string;

    /** Authentication configuration */
    auth?: AuthConfig;

    /** CSS selectors to mask globally across all captures */
    globalMask?: string[];

    /** Explorer mode configuration */
    explorer?: ExplorerConfig;

    /** User-defined routes to capture */
    routes?: RouteConfig[];

    /** Comparison threshold configuration */
    threshold?: ThresholdConfig;

    /** Output directory for Argus artifacts (default: '.argus') */
    outputDir?: string;

    /** Browser to use (default: 'chromium') */
    browser?: 'chromium' | 'firefox' | 'webkit';

    /** Disable CSS animations and transitions (default: true) */
    disableAnimations?: boolean;

    /** Wait for network idle before capture (default: true) */
    waitForNetworkIdle?: boolean;
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedArgusConfig extends Required<Omit<ArgusConfig, 'auth' | 'explorer' | 'routes'>> {
    auth?: AuthConfig;
    explorer: Required<ExplorerConfig>;
    routes: RouteConfig[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<ResolvedArgusConfig, 'baseUrl'> = {
    viewports: [{ width: 1920, height: 1080, name: 'desktop' }],
    concurrency: 4,
    timezone: 'UTC',
    locale: 'en-US',
    globalMask: [],
    explorer: {
        maxDepth: 2,
        maxPages: 20,
        exclude: [],
        include: [],
    },
    routes: [],
    threshold: {
        pixel: 0.1,
        failureThreshold: 0.1,
    },
    outputDir: '.argus',
    browser: 'chromium',
    disableAnimations: true,
    waitForNetworkIdle: true,
};

/**
 * Helper function to define configuration with type checking
 */
export function defineConfig(config: ArgusConfig): ArgusConfig {
    return config;
}
