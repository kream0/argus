/**
 * Argus GUI - Main View (Browser/Renderer Process)
 */

import { Electroview, type RPCSchema } from 'electrobun/view';
import type {
    ConfigInfo,
    ExplorerReport,
    ComparisonReport,
    ApproveResult,
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

// RPC Schema type definition (matches bun side)
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

// Initialize Electrobun with RPC
const rpc = Electroview.defineRPC<ArgusRPCSchema>({
    handlers: {
        requests: {},
        messages: {},
    },
});

const electroview = new Electroview({ rpc });

// DOM Elements
const statusEl = document.getElementById('status')!;
const logArea = document.getElementById('log-area')!;
const progressOverlay = document.getElementById('progress-overlay')!;
const progressTitle = document.getElementById('progress-title')!;
const progressMessage = document.getElementById('progress-message')!;
const progressBar = document.getElementById('progress-bar')!;

// Tabs
const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
const tabContents = document.querySelectorAll<HTMLElement>('.tab-content');

// Config info elements
const baselinesCount = document.getElementById('baselines-count')!;
const currentCount = document.getElementById('current-count')!;

// Forms
const exploreForm = document.getElementById('explore-form') as HTMLFormElement;
const compareForm = document.getElementById('compare-form') as HTMLFormElement;
const approveForm = document.getElementById('approve-form') as HTMLFormElement;

// State
let config: ConfigInfo | null = null;

// ============= Utility Functions =============

function log(level: 'info' | 'warn' | 'error', message: string) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;

    // Keep only last 100 entries
    while (logArea.children.length > 100) {
        logArea.removeChild(logArea.firstChild!);
    }
}

function setStatus(text: string, state: 'ready' | 'busy' | 'success' | 'error' = 'ready') {
    const dot = statusEl.querySelector('.status-dot')!;
    const textEl = statusEl.querySelector('.status-text')!;

    dot.className = `status-dot status-${state}`;
    textEl.textContent = text;
}

function showProgress(title: string, message = 'Please wait...') {
    progressTitle.textContent = title;
    progressMessage.textContent = message;
    progressBar.style.width = '0%';
    progressOverlay.style.display = 'flex';
}

function hideProgress() {
    progressOverlay.style.display = 'none';
}

function formatDuration(ms: number): string {
    return `${(ms / 1000).toFixed(2)}s`;
}

// ============= Tab Navigation =============

navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab!;

        // Update nav buttons
        navBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tab contents
        tabContents.forEach((content) => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });
    });
});

// ============= Load Configuration =============

async function loadConfig() {
    try {
        const result = await rpc.request.getConfig({});

        if (result.success && result.config) {
            config = result.config;

            // Update sidebar info
            baselinesCount.textContent = config.hasBaselines ? '✓' : '—';
            currentCount.textContent = config.hasCurrent ? '✓' : '—';

            // Pre-fill explore form
            const urlInput = document.getElementById('explore-url') as HTMLInputElement;
            if (urlInput && !urlInput.value) {
                urlInput.value = config.baseUrl;
            }

            const depthInput = document.getElementById('explore-depth') as HTMLInputElement;
            if (depthInput) {
                depthInput.value = String(config.explorer.maxDepth);
            }

            const pagesInput = document.getElementById('explore-pages') as HTMLInputElement;
            if (pagesInput) {
                pagesInput.value = String(config.explorer.maxPages);
            }

            // Update settings display
            const configDisplay = document.getElementById('config-display')!;
            configDisplay.innerHTML = `
        <div class="config-item">
          <span class="config-label">Base URL</span>
          <span class="config-value">${config.baseUrl}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Output Directory</span>
          <span class="config-value">${config.outputDir}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Viewports</span>
          <span class="config-value">${config.viewports.map((v) => `${v.name || ''} ${v.width}x${v.height}`).join(', ')}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Explorer Max Depth</span>
          <span class="config-value">${config.explorer.maxDepth}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Explorer Max Pages</span>
          <span class="config-value">${config.explorer.maxPages}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Has Baselines</span>
          <span class="config-value">${config.hasBaselines ? '✓ Yes' : '✗ No'}</span>
        </div>
        <div class="config-item">
          <span class="config-label">Has Current</span>
          <span class="config-value">${config.hasCurrent ? '✓ Yes' : '✗ No'}</span>
        </div>
      `;

            log('info', 'Configuration loaded');
        } else {
            log('warn', result.error || 'Failed to load configuration');

            const configDisplay = document.getElementById('config-display')!;
            configDisplay.innerHTML = `<p class="error">${result.error || 'No configuration found'}</p>`;
        }
    } catch (error) {
        log('error', `Failed to load config: ${error}`);
    }
}

// ============= Explore Functionality =============

exploreForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = (document.getElementById('explore-url') as HTMLInputElement).value;
    const depth = parseInt((document.getElementById('explore-depth') as HTMLInputElement).value, 10);
    const pages = parseInt((document.getElementById('explore-pages') as HTMLInputElement).value, 10);
    const viewport = (document.getElementById('explore-viewport') as HTMLSelectElement).value;
    const baseline = (document.getElementById('explore-baseline') as HTMLInputElement).checked;
    const headless = (document.getElementById('explore-headless') as HTMLInputElement).checked;
    const username =
        (document.getElementById('explore-username') as HTMLInputElement).value || undefined;
    const password =
        (document.getElementById('explore-password') as HTMLInputElement).value || undefined;

    setStatus('Exploring...', 'busy');
    showProgress('Exploring', `Starting exploration of ${url}`);
    log('info', `Starting exploration: ${url}`);

    try {
        const result = await rpc.request.explore({
            url,
            depth,
            pages,
            viewport,
            baseline,
            headless,
            username,
            password,
        });

        hideProgress();

        if (result.success && result.report) {
            displayExploreResults(result.report);
            setStatus('Exploration complete', 'success');
            log('info', `Exploration complete: ${result.report.captured} pages captured`);

            // Refresh config to update sidebar
            await loadConfig();
        } else {
            setStatus('Exploration failed', 'error');
            log('error', result.error || 'Exploration failed');
            alert(`Exploration failed: ${result.error}`);
        }
    } catch (error) {
        hideProgress();
        setStatus('Error', 'error');
        log('error', `Exploration error: ${error}`);
        alert(`Error: ${error}`);
    }
});

function displayExploreResults(report: ExplorerReport) {
    const resultsSection = document.getElementById('explore-results')!;
    const summary = document.getElementById('explore-summary')!;
    const list = document.getElementById('explore-list')!;

    resultsSection.style.display = 'block';

    summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-value">${report.discovered}</span>
      <span class="summary-label">Discovered</span>
    </div>
    <div class="summary-item summary-success">
      <span class="summary-value">${report.captured}</span>
      <span class="summary-label">Captured</span>
    </div>
    ${report.failed > 0
            ? `
    <div class="summary-item summary-error">
      <span class="summary-value">${report.failed}</span>
      <span class="summary-label">Failed</span>
    </div>
    `
            : ''
        }
    ${report.authenticated
            ? `
    <div class="summary-item summary-info">
      <span class="summary-value">🔐</span>
      <span class="summary-label">Authenticated</span>
    </div>
    `
            : ''
        }
    <div class="summary-item">
      <span class="summary-value">${formatDuration(report.duration)}</span>
      <span class="summary-label">Duration</span>
    </div>
  `;

    list.innerHTML = report.results
        .map(
            (r) => `
    <div class="result-item ${r.error ? 'result-error' : 'result-success'}">
      <span class="result-icon">${r.error ? '✗' : '✓'}</span>
      <span class="result-path">${r.path}</span>
      ${r.isLoginPage ? '<span class="result-badge">🔐</span>' : ''}
      <span class="result-depth">depth: ${r.depth}</span>
    </div>
  `
        )
        .join('');
}

// ============= Compare Functionality =============

compareForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const threshold =
        parseFloat((document.getElementById('compare-threshold') as HTMLInputElement).value) / 100;

    setStatus('Comparing...', 'busy');
    showProgress('Comparing', 'Analyzing screenshots...');
    log('info', 'Starting comparison');

    try {
        const result = await rpc.request.compare({ threshold });

        hideProgress();

        if (result.success && result.report) {
            displayCompareResults(result.report);
            setStatus('Comparison complete', result.report.failed > 0 ? 'error' : 'success');
            log('info', `Comparison complete: ${result.report.passed} passed, ${result.report.failed} failed`);
        } else {
            setStatus('Comparison failed', 'error');
            log('error', result.error || 'Comparison failed');
            alert(`Comparison failed: ${result.error}`);
        }
    } catch (error) {
        hideProgress();
        setStatus('Error', 'error');
        log('error', `Comparison error: ${error}`);
        alert(`Error: ${error}`);
    }
});

function displayCompareResults(report: ComparisonReport) {
    const resultsSection = document.getElementById('compare-results')!;
    const summary = document.getElementById('compare-summary')!;
    const grid = document.getElementById('compare-grid')!;

    resultsSection.style.display = 'block';

    summary.innerHTML = `
    <div class="summary-item summary-success">
      <span class="summary-value">${report.passed}</span>
      <span class="summary-label">Passed</span>
    </div>
    ${report.failed > 0
            ? `
    <div class="summary-item summary-error">
      <span class="summary-value">${report.failed}</span>
      <span class="summary-label">Failed</span>
    </div>
    `
            : ''
        }
    ${report.new > 0
            ? `
    <div class="summary-item summary-warning">
      <span class="summary-value">${report.new}</span>
      <span class="summary-label">New</span>
    </div>
    `
            : ''
        }
    ${report.missing > 0
            ? `
    <div class="summary-item">
      <span class="summary-value">${report.missing}</span>
      <span class="summary-label">Missing</span>
    </div>
    `
            : ''
        }
    <div class="summary-item">
      <span class="summary-value">${formatDuration(report.duration)}</span>
      <span class="summary-label">Duration</span>
    </div>
  `;

    grid.innerHTML = report.results
        .map((r) => {
            const statusClass = {
                passed: 'result-success',
                failed: 'result-error',
                new: 'result-warning',
                missing: 'result-muted',
                error: 'result-error',
            }[r.status];

            const statusIcon = {
                passed: '✓',
                failed: '✗',
                new: '◉',
                missing: '○',
                error: '!',
            }[r.status];

            return `
      <div class="compare-card ${statusClass}">
        <div class="compare-card-header">
          <span class="result-icon">${statusIcon}</span>
          <span class="result-name">${r.name}</span>
        </div>
        <div class="compare-card-body">
          ${r.status === 'failed'
                    ? `
            <div class="compare-diff">
              <span class="diff-label">Difference:</span>
              <span class="diff-value">${r.diffPercentage.toFixed(4)}%</span>
            </div>
          `
                    : ''
                }
          ${r.error ? `<div class="compare-error">${r.error}</div>` : ''}
        </div>
      </div>
    `;
        })
        .join('');
}

// Open Report Button
document.getElementById('open-report-btn')?.addEventListener('click', async () => {
    try {
        const result = await rpc.request.openReport({});
        if (!result.success) {
            alert(result.error || 'Failed to open report');
        }
    } catch (error) {
        alert(`Error: ${error}`);
    }
});

// ============= Approve Functionality =============

approveForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clean = (document.getElementById('approve-clean') as HTMLInputElement).checked;

    if (!confirm('Are you sure you want to approve all current screenshots as new baselines?')) {
        return;
    }

    setStatus('Approving...', 'busy');
    showProgress('Approving', 'Promoting screenshots to baseline...');
    log('info', 'Starting approval');

    try {
        const result = await rpc.request.approve({ clean });

        hideProgress();

        if (result.success && result.result) {
            displayApproveResults(result.result);
            setStatus('Approval complete', 'success');
            log('info', `Approved ${result.result.approved.length} screenshots`);

            // Refresh config to update sidebar
            await loadConfig();
        } else {
            setStatus('Approval failed', 'error');
            log('error', result.error || 'Approval failed');
            alert(`Approval failed: ${result.error}`);
        }
    } catch (error) {
        hideProgress();
        setStatus('Error', 'error');
        log('error', `Approval error: ${error}`);
        alert(`Error: ${error}`);
    }
});

function displayApproveResults(result: ApproveResult) {
    const resultsSection = document.getElementById('approve-results')!;
    const summary = document.getElementById('approve-summary')!;
    const list = document.getElementById('approve-list')!;

    resultsSection.style.display = 'block';

    summary.innerHTML = `
    <div class="summary-item summary-success">
      <span class="summary-value">${result.approved.length}</span>
      <span class="summary-label">Approved</span>
    </div>
    ${result.skipped.length > 0
            ? `
    <div class="summary-item">
      <span class="summary-value">${result.skipped.length}</span>
      <span class="summary-label">Skipped</span>
    </div>
    `
            : ''
        }
  `;

    list.innerHTML = result.approved
        .map(
            (name) => `
    <div class="result-item result-success">
      <span class="result-icon">✓</span>
      <span class="result-path">${name}</span>
    </div>
  `
        )
        .join('');
}

// Open Baselines Folder
document.getElementById('open-baselines-btn')?.addEventListener('click', async () => {
    try {
        const result = await rpc.request.openFolder({ path: '.argus/baselines' });
        if (!result.success) {
            alert(result.error || 'Failed to open folder');
        }
    } catch (error) {
        alert(`Error: ${error}`);
    }
});

// ============= Settings Functionality =============

document.getElementById('refresh-config-btn')?.addEventListener('click', () => {
    loadConfig();
});

document.getElementById('open-config-btn')?.addEventListener('click', async () => {
    try {
        const result = await rpc.request.openFolder({ path: '.' });
        if (!result.success) {
            alert(result.error || 'Failed to open folder');
        }
    } catch (error) {
        alert(`Error: ${error}`);
    }
});

// ============= Initialize =============

loadConfig();
log('info', 'Argus GUI initialized');
