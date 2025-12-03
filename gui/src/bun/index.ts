/**
 * Argus GUI - Main Bun Process
 *
 * Creates the browser window and handles RPC calls to execute CLI commands.
 */

import { BrowserWindow, BrowserView, ApplicationMenu, type RPCSchema } from 'electrobun/bun';
import { spawn } from 'bun';
import { join, dirname } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type {
    ConfigInfo,
    ExplorerReport,
    ComparisonReport,
    ExploreOptions,
    CompareOptions,
    ApproveOptions,
    ConfigResponse,
    ExploreResponse,
    CompareResponse,
    ApproveResponse,
    ScreenshotResponse,
    BasicResponse,
} from '../shared/types';

// Get the project root (parent of gui folder)
const guiDir = dirname(dirname(import.meta.dir));
const projectRoot = dirname(guiDir);
const cliPath = join(projectRoot, 'src', 'cli', 'index.ts');

console.log('[Argus GUI] Project root:', projectRoot);
console.log('[Argus GUI] CLI path:', cliPath);

// Helper to run CLI commands and capture output
async function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const bunPath = process.execPath; // Use the current bun executable
    const proc = spawn({
        cmd: [bunPath, 'run', cliPath, ...args],
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
}

// RPC Schema type definition
type ArgusRPCSchema = {
    bun: RPCSchema<{
        requests: {
            getConfig: { params: Record<string, never>; response: ConfigResponse };
            explore: { params: ExploreOptions; response: ExploreResponse };
            compare: { params: CompareOptions; response: CompareResponse };
            approve: { params: ApproveOptions; response: ApproveResponse };
            getScreenshot: { params: { path: string }; response: ScreenshotResponse };
            openFolder: { params: { path: string }; response: BasicResponse };
            openReport: { params: Record<string, never>; response: BasicResponse };
        };
        messages: Record<string, never>;
    }>;
    webview: RPCSchema<{
        requests: Record<string, never>;
        messages: Record<string, never>;
    }>;
};

// Define RPC handlers
const rpc = BrowserView.defineRPC<ArgusRPCSchema>({
    maxRequestTime: 300000, // 5 minutes for long operations
    handlers: {
        requests: {
            // Get project configuration
            getConfig: async (): Promise<ConfigResponse> => {
                try {
                    const configPath = join(projectRoot, 'argus.config.ts');
                    if (!existsSync(configPath)) {
                        return { success: false, error: 'No argus.config.ts found' };
                    }

                    // Import the config dynamically
                    const configModule = await import(configPath);
                    const rawConfig = configModule.default?.default || configModule.default;

                    const baselinesDir = join(projectRoot, rawConfig.outputDir || '.argus', 'baselines');
                    const currentDir = join(projectRoot, rawConfig.outputDir || '.argus', 'current');

                    const config: ConfigInfo = {
                        baseUrl: rawConfig.baseUrl || 'http://localhost:3000',
                        viewports: rawConfig.viewports || [{ width: 1920, height: 1080 }],
                        outputDir: rawConfig.outputDir || '.argus',
                        explorer: {
                            maxDepth: rawConfig.explorer?.maxDepth || 3,
                            maxPages: rawConfig.explorer?.maxPages || 50,
                        },
                        hasBaselines:
                            existsSync(baselinesDir) &&
                            readdirSync(baselinesDir).filter((f) => f.endsWith('.png')).length > 0,
                        hasCurrent:
                            existsSync(currentDir) &&
                            readdirSync(currentDir).filter((f) => f.endsWith('.png')).length > 0,
                    };

                    return { success: true, config };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Run explore command
            explore: async (options: ExploreOptions): Promise<ExploreResponse> => {
                try {
                    const args = ['explore', options.url];

                    if (options.depth) args.push('--depth', String(options.depth));
                    if (options.pages) args.push('--pages', String(options.pages));
                    if (options.viewport) args.push('--viewport', options.viewport);
                    if (options.baseline) args.push('--baseline');
                    if (options.headless === false) args.push('--no-headless');
                    if (options.username) args.push('-u', options.username);
                    if (options.password) args.push('--password', options.password);

                    console.log('[Argus GUI] Running explore:', args.join(' '));
                    const { stdout, stderr, exitCode } = await runCLI(args);

                    if (exitCode !== 0 && !stdout.includes('Exploration Results')) {
                        return { success: false, error: stderr || stdout || 'Exploration failed' };
                    }

                    // Parse output to extract report
                    const report: ExplorerReport = {
                        discovered: 0,
                        captured: 0,
                        failed: 0,
                        screenshots: 0,
                        authenticated: false,
                        duration: 0,
                        results: [],
                    };

                    // Parse discovered count
                    const discoveredMatch = stdout.match(/URLs discovered:\s*(\d+)/);
                    if (discoveredMatch) report.discovered = parseInt(discoveredMatch[1], 10);

                    // Parse captured count
                    const capturedMatch = stdout.match(/Pages captured:\s*(\d+)/);
                    if (capturedMatch) report.captured = parseInt(capturedMatch[1], 10);

                    // Parse screenshots count
                    const screenshotsMatch = stdout.match(/Screenshots:\s*(\d+)/);
                    if (screenshotsMatch) report.screenshots = parseInt(screenshotsMatch[1], 10);

                    // Parse failed count
                    const failedMatch = stdout.match(/Failed:\s*(\d+)/);
                    if (failedMatch) report.failed = parseInt(failedMatch[1], 10);

                    // Parse authentication
                    report.authenticated = stdout.includes('Authenticated: yes');

                    // Parse duration
                    const durationMatch = stdout.match(/Duration:\s*([\d.]+)s/);
                    if (durationMatch) report.duration = parseFloat(durationMatch[1]) * 1000;

                    // Parse captured pages
                    const pagesSection = stdout.match(/Captured Pages:\s*([\s\S]*?)(?=\n\s*Output:|$)/);
                    if (pagesSection) {
                        const pageLines = pagesSection[1].match(/[✓✗]\s+([^\s]+)(?:\s+🔐)?\s+\(depth:\s*(\d+)\)/g);
                        if (pageLines) {
                            for (const line of pageLines) {
                                const pageMatch = line.match(/([✓✗])\s+([^\s]+)(?:\s+(🔐))?\s+\(depth:\s*(\d+)\)/);
                                if (pageMatch) {
                                    report.results.push({
                                        path: pageMatch[2],
                                        depth: parseInt(pageMatch[4], 10),
                                        isLoginPage: pageMatch[3] === '🔐',
                                        error: pageMatch[1] === '✗' ? 'Failed to capture' : undefined,
                                    });
                                }
                            }
                        }
                    }

                    return { success: true, report };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Run compare command
            compare: async (options: CompareOptions): Promise<CompareResponse> => {
                try {
                    const args = ['compare', '--json'];

                    if (options.threshold) args.push('--threshold', String(options.threshold));

                    console.log('[Argus GUI] Running compare:', args.join(' '));
                    const { stdout, stderr } = await runCLI(args);

                    // Parse JSON output
                    try {
                        const report: ComparisonReport = JSON.parse(stdout);
                        return { success: true, report };
                    } catch {
                        return { success: false, error: stderr || stdout || 'Comparison failed' };
                    }
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Run approve command
            approve: async (options: ApproveOptions): Promise<ApproveResponse> => {
                try {
                    const args = ['approve'];

                    if (options.filter && options.filter.length > 0) {
                        args.push('--filter', ...options.filter);
                    }
                    if (options.clean) args.push('--clean');

                    console.log('[Argus GUI] Running approve:', args.join(' '));
                    const { stdout, stderr, exitCode } = await runCLI(args);

                    if (exitCode !== 0) {
                        return { success: false, error: stderr || stdout || 'Approval failed' };
                    }

                    // Parse approved screenshots
                    const approved: string[] = [];
                    const approvedMatch = stdout.match(
                        /Approved \d+ screenshot\(s\):([\s\S]*?)(?=\n\s*Skipped|\n\s*Baselines|$)/
                    );
                    if (approvedMatch) {
                        const lines = approvedMatch[1].match(/•\s+([^\n]+)/g);
                        if (lines) {
                            for (const line of lines) {
                                const name = line.replace(/•\s+/, '').trim();
                                if (name) approved.push(name);
                            }
                        }
                    }

                    return { success: true, result: { approved, skipped: [] } };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Get screenshot as base64
            getScreenshot: async ({ path: imagePath }): Promise<ScreenshotResponse> => {
                try {
                    const fullPath = join(projectRoot, imagePath);
                    if (!existsSync(fullPath)) {
                        return { success: false, error: 'File not found' };
                    }

                    const file = Bun.file(fullPath);
                    const buffer = await file.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    return { success: true, data: `data:image/png;base64,${base64}` };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Open folder in file explorer
            openFolder: async ({ path: folderPath }): Promise<BasicResponse> => {
                try {
                    const fullPath = join(projectRoot, folderPath);
                    if (process.platform === 'win32') {
                        spawn(['explorer', fullPath]);
                    } else if (process.platform === 'darwin') {
                        spawn(['open', fullPath]);
                    } else {
                        spawn(['xdg-open', fullPath]);
                    }
                    return { success: true };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },

            // Open HTML report
            openReport: async (): Promise<BasicResponse> => {
                try {
                    const reportPath = join(projectRoot, '.argus', 'report', 'index.html');
                    if (!existsSync(reportPath)) {
                        return { success: false, error: 'Report not found. Run compare first.' };
                    }

                    if (process.platform === 'win32') {
                        spawn(['cmd', '/c', 'start', reportPath]);
                    } else if (process.platform === 'darwin') {
                        spawn(['open', reportPath]);
                    } else {
                        spawn(['xdg-open', reportPath]);
                    }
                    return { success: true };
                } catch (error) {
                    return { success: false, error: String(error) };
                }
            },
        },
        messages: {},
    },
});

// Set up application menu
ApplicationMenu.setApplicationMenu([
    {
        submenu: [
            { label: 'About Argus', role: 'about' },
            { type: 'separator' },
            { label: 'Quit', role: 'quit' },
        ],
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
        ],
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { role: 'resetZoom' },
        ],
    },
]);

// Create the main window
const win = new BrowserWindow({
    title: 'Argus - Visual Regression Testing',
    url: 'views://main/index.html',
    frame: {
        width: 1400,
        height: 900,
        x: 100,
        y: 100,
    },
    rpc,
});

console.log('[Argus GUI] Window created');
