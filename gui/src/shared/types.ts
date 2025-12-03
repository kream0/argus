/**
 * Shared types between Bun (main process) and Browser (renderer)
 * These are plain TypeScript interfaces used for RPC communication
 */

// Explorer options
export interface ExploreOptions {
    url: string;
    depth?: number;
    pages?: number;
    viewport?: string;
    baseline?: boolean;
    headless?: boolean;
    username?: string;
    password?: string;
}

// Comparison options
export interface CompareOptions {
    threshold?: number;
}

// Approve options
export interface ApproveOptions {
    filter?: string[];
    clean?: boolean;
}

// Explorer result from CLI
export interface ExplorerPageResult {
    path: string;
    depth: number;
    isLoginPage?: boolean;
    error?: string;
}

// Explorer report from CLI
export interface ExplorerReport {
    discovered: number;
    captured: number;
    failed: number;
    screenshots: number;
    authenticated: boolean;
    duration: number;
    results: ExplorerPageResult[];
}

// Comparison result from CLI
export interface ComparisonResultItem {
    name: string;
    status: 'passed' | 'failed' | 'new' | 'missing' | 'error';
    diffPercentage: number;
    baselinePath?: string;
    currentPath?: string;
    diffImagePath?: string;
    error?: string;
}

// Comparison report from CLI
export interface ComparisonReport {
    total: number;
    passed: number;
    failed: number;
    new: number;
    missing: number;
    errors: number;
    duration: number;
    results: ComparisonResultItem[];
}

// Approve result
export interface ApproveResult {
    approved: string[];
    skipped: string[];
}

// Config info for display
export interface ConfigInfo {
    baseUrl: string;
    viewports: Array<{ width: number; height: number; name?: string }>;
    outputDir: string;
    explorer: {
        maxDepth: number;
        maxPages: number;
    };
    hasBaselines: boolean;
    hasCurrent: boolean;
}

// Response types
export interface ConfigResponse {
    success: boolean;
    config?: ConfigInfo;
    error?: string;
}

export interface ExploreResponse {
    success: boolean;
    report?: ExplorerReport;
    error?: string;
}

export interface CompareResponse {
    success: boolean;
    report?: ComparisonReport;
    error?: string;
}

export interface ApproveResponse {
    success: boolean;
    result?: ApproveResult;
    error?: string;
}

export interface ScreenshotResponse {
    success: boolean;
    data?: string;
    error?: string;
}

export interface BasicResponse {
    success: boolean;
    error?: string;
}

// Progress update
export interface ProgressUpdate {
    operation: string;
    current: number;
    total: number;
    message?: string;
}

// Log message
export interface LogMessage {
    level: 'info' | 'warn' | 'error';
    message: string;
}
