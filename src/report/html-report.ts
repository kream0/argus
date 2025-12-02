/**
 * HTML Report Generator
 *
 * Generates interactive HTML reports for visual regression results.
 */

import { writeFile, mkdir, readFile, copyFile } from 'node:fs/promises';
import { join, dirname, relative, basename } from 'node:path';
import type { ComparisonReport, ComparisonResult } from '../diff/comparison-engine.ts';
import type { ValidatedArgusConfig } from '../config/schema.ts';

export interface ReportOptions {
    /** Title for the report */
    title?: string;
    /** Include base64 images instead of file paths */
    embedImages?: boolean;
}

/**
 * Generate HTML report from comparison results
 */
export async function generateHtmlReport(
    report: ComparisonReport,
    config: ValidatedArgusConfig,
    outputPath: string,
    options: ReportOptions = {}
): Promise<string> {
    const title = options.title ?? 'Argus Visual Regression Report';
    const reportDir = dirname(outputPath);
    
    // Ensure output directory exists
    await mkdir(reportDir, { recursive: true });

    // Generate HTML content
    const html = generateReportHtml(report, config, title, options);
    
    // Write report file
    await writeFile(outputPath, html, 'utf-8');
    
    return outputPath;
}

/**
 * Generate the HTML content for the report
 */
function generateReportHtml(
    report: ComparisonReport,
    config: ValidatedArgusConfig,
    title: string,
    options: ReportOptions
): string {
    const timestamp = new Date().toISOString();
    const passed = report.results.filter((r) => r.status === 'passed');
    const failed = report.results.filter((r) => r.status === 'failed');
    const newResults = report.results.filter((r) => r.status === 'new');
    const missing = report.results.filter((r) => r.status === 'missing');
    const errors = report.results.filter((r) => r.status === 'error');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        ${getStyles()}
    </style>
</head>
<body>
    <header>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
            <span>Generated: ${timestamp}</span>
            <span>Duration: ${(report.duration / 1000).toFixed(2)}s</span>
            <span>Base URL: ${escapeHtml(config.baseUrl)}</span>
        </div>
    </header>

    <section class="summary">
        <div class="stat ${passed.length > 0 ? 'passed' : ''}">
            <span class="count">${passed.length}</span>
            <span class="label">Passed</span>
        </div>
        <div class="stat ${failed.length > 0 ? 'failed' : ''}">
            <span class="count">${failed.length}</span>
            <span class="label">Failed</span>
        </div>
        <div class="stat ${newResults.length > 0 ? 'new' : ''}">
            <span class="count">${newResults.length}</span>
            <span class="label">New</span>
        </div>
        <div class="stat ${missing.length > 0 ? 'missing' : ''}">
            <span class="count">${missing.length}</span>
            <span class="label">Missing</span>
        </div>
        <div class="stat ${errors.length > 0 ? 'error' : ''}">
            <span class="count">${errors.length}</span>
            <span class="label">Errors</span>
        </div>
    </section>

    <nav class="tabs">
        <button class="tab active" data-filter="all">All (${report.total})</button>
        <button class="tab" data-filter="failed">Failed (${failed.length})</button>
        <button class="tab" data-filter="new">New (${newResults.length})</button>
        <button class="tab" data-filter="passed">Passed (${passed.length})</button>
    </nav>

    <main class="results">
        ${report.results.map((result) => generateResultCard(result, config)).join('\n')}
    </main>

    <script>
        ${getScript()}
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for a single result card
 */
function generateResultCard(result: ComparisonResult, config: ValidatedArgusConfig): string {
    const statusClass = result.status;
    const statusIcon = getStatusIcon(result.status);
    const diffInfo = result.diffPercentage > 0 
        ? `<span class="diff-percentage">${result.diffPercentage.toFixed(4)}% diff</span>`
        : '';

    const baselineSrc = getRelativePath(result.baselinePath, config.outputDir);
    const currentSrc = getRelativePath(result.currentPath, config.outputDir);
    const diffSrc = result.diffImagePath ? getRelativePath(result.diffImagePath, config.outputDir) : '';

    return `
        <article class="result-card ${statusClass}" data-status="${result.status}">
            <header>
                <span class="status-icon">${statusIcon}</span>
                <h3>${escapeHtml(result.name)}</h3>
                ${diffInfo}
            </header>
            
            ${result.error ? `<div class="error-message">${escapeHtml(result.error)}</div>` : ''}
            
            ${result.status === 'failed' ? `
            <div class="comparison-container">
                <div class="view-toggle">
                    <button class="view-btn active" data-view="side-by-side">Side by Side</button>
                    <button class="view-btn" data-view="slider">Slider</button>
                    <button class="view-btn" data-view="diff">Diff Only</button>
                </div>
                
                <div class="comparison side-by-side active">
                    <div class="image-panel">
                        <span class="label">Baseline</span>
                        <img src="${baselineSrc}" alt="Baseline" loading="lazy">
                    </div>
                    <div class="image-panel">
                        <span class="label">Current</span>
                        <img src="${currentSrc}" alt="Current" loading="lazy">
                    </div>
                    <div class="image-panel">
                        <span class="label">Diff</span>
                        <img src="${diffSrc}" alt="Diff" loading="lazy">
                    </div>
                </div>
                
                <div class="comparison slider">
                    <div class="slider-container">
                        <img src="${baselineSrc}" alt="Baseline" class="baseline-img">
                        <div class="slider-overlay">
                            <img src="${currentSrc}" alt="Current">
                        </div>
                        <input type="range" class="slider-input" min="0" max="100" value="50">
                    </div>
                </div>
                
                <div class="comparison diff-only">
                    <img src="${diffSrc}" alt="Diff" loading="lazy">
                </div>
            </div>
            ` : ''}
            
            ${result.status === 'passed' ? `
            <div class="image-preview">
                <img src="${currentSrc}" alt="${escapeHtml(result.name)}" loading="lazy">
            </div>
            ` : ''}
            
            ${result.status === 'new' ? `
            <div class="image-preview">
                <span class="label">New Screenshot (no baseline)</span>
                <img src="${currentSrc}" alt="${escapeHtml(result.name)}" loading="lazy">
            </div>
            ` : ''}
            
            <footer>
                <span class="dimensions">${result.width}×${result.height}</span>
            </footer>
        </article>
    `;
}

/**
 * Get CSS styles for the report
 */
function getStyles(): string {
    return `
        :root {
            --color-passed: #22c55e;
            --color-failed: #ef4444;
            --color-new: #f59e0b;
            --color-missing: #6b7280;
            --color-error: #dc2626;
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-color: #f1f5f9;
            --text-muted: #94a3b8;
            --border-color: #334155;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            padding: 2rem;
        }
        
        header { margin-bottom: 2rem; }
        header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        header .meta { color: var(--text-muted); font-size: 0.875rem; display: flex; gap: 2rem; flex-wrap: wrap; }
        
        .summary {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .stat {
            background: var(--card-bg);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            text-align: center;
            border: 2px solid transparent;
        }
        
        .stat.passed { border-color: var(--color-passed); }
        .stat.failed { border-color: var(--color-failed); }
        .stat.new { border-color: var(--color-new); }
        .stat.missing { border-color: var(--color-missing); }
        .stat.error { border-color: var(--color-error); }
        
        .stat .count { font-size: 2rem; font-weight: bold; display: block; }
        .stat .label { color: var(--text-muted); font-size: 0.875rem; }
        
        .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .tab {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .tab:hover, .tab.active { background: var(--border-color); }
        
        .results { display: grid; gap: 1.5rem; }
        
        .result-card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            border-left: 4px solid;
        }
        
        .result-card.passed { border-color: var(--color-passed); }
        .result-card.failed { border-color: var(--color-failed); }
        .result-card.new { border-color: var(--color-new); }
        .result-card.missing { border-color: var(--color-missing); }
        .result-card.error { border-color: var(--color-error); }
        
        .result-card[hidden] { display: none; }
        
        .result-card header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .result-card header h3 { flex: 1; font-size: 1.125rem; }
        
        .status-icon { font-size: 1.25rem; }
        
        .diff-percentage {
            background: var(--color-failed);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        
        .error-message {
            background: rgba(239, 68, 68, 0.1);
            color: var(--color-failed);
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
        }
        
        .view-toggle {
            display: flex;
            gap: 0.5rem;
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .view-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            padding: 0.375rem 0.75rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
        }
        
        .view-btn.active { background: var(--border-color); color: var(--text-color); }
        
        .comparison { display: none; padding: 1rem; }
        .comparison.active { display: block; }
        
        .comparison.side-by-side { 
            display: none;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }
        .comparison.side-by-side.active { display: grid; }
        
        .image-panel { text-align: center; }
        .image-panel .label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-muted);
            font-size: 0.875rem;
        }
        .image-panel img, .image-preview img, .diff-only img {
            max-width: 100%;
            border-radius: 4px;
            border: 1px solid var(--border-color);
        }
        
        .image-preview { padding: 1rem; }
        .image-preview .label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); }
        
        .slider-container {
            position: relative;
            max-width: 100%;
            overflow: hidden;
        }
        
        .slider-container img { width: 100%; display: block; }
        
        .slider-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 50%;
            height: 100%;
            overflow: hidden;
            border-right: 2px solid var(--color-new);
        }
        
        .slider-overlay img { width: 200%; max-width: none; }
        
        .slider-input {
            width: 100%;
            margin-top: 0.5rem;
        }
        
        .result-card footer {
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--border-color);
            color: var(--text-muted);
            font-size: 0.75rem;
        }
        
        @media (max-width: 768px) {
            .comparison.side-by-side { grid-template-columns: 1fr; }
            body { padding: 1rem; }
        }
    `;
}

/**
 * Get JavaScript for interactivity
 */
function getScript(): string {
    return `
        // Tab filtering
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const filter = tab.dataset.filter;
                document.querySelectorAll('.result-card').forEach(card => {
                    if (filter === 'all' || card.dataset.status === filter) {
                        card.hidden = false;
                    } else {
                        card.hidden = true;
                    }
                });
            });
        });
        
        // View toggle for failed comparisons
        document.querySelectorAll('.view-toggle').forEach(toggle => {
            toggle.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const container = toggle.parentElement;
                    toggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    const view = btn.dataset.view;
                    container.querySelectorAll('.comparison').forEach(comp => {
                        comp.classList.toggle('active', comp.classList.contains(view));
                    });
                });
            });
        });
        
        // Slider functionality
        document.querySelectorAll('.slider-input').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const overlay = slider.parentElement.querySelector('.slider-overlay');
                overlay.style.width = e.target.value + '%';
            });
        });
    `;
}

/**
 * Get status icon for a result
 */
function getStatusIcon(status: string): string {
    switch (status) {
        case 'passed': return '✓';
        case 'failed': return '✗';
        case 'new': return '◉';
        case 'missing': return '○';
        case 'error': return '!';
        default: return '?';
    }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get relative path from output directory
 */
function getRelativePath(absolutePath: string, outputDir: string): string {
    // Convert to relative path from report location
    return relative(join(outputDir, 'report'), absolutePath).replace(/\\/g, '/');
}
