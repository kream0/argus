/**
 * JSON Report Generator
 *
 * Generates JSON reports for CI/CD integration.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ComparisonReport, ComparisonResult } from '../diff/comparison-engine.ts';
import type { ValidatedArgusConfig } from '../config/schema.ts';

export interface JsonReport {
    /** Report metadata */
    meta: {
        /** Tool name */
        tool: string;
        /** Tool version */
        version: string;
        /** Timestamp of report generation */
        timestamp: string;
        /** Duration of comparison in ms */
        duration: number;
        /** Base URL tested */
        baseUrl: string;
        /** Browser used */
        browser: string;
    };
    /** Summary statistics */
    summary: {
        total: number;
        passed: number;
        failed: number;
        new: number;
        missing: number;
        errors: number;
    };
    /** Individual test results */
    results: Array<{
        name: string;
        status: string;
        diffPercentage: number;
        baseline: string;
        current: string;
        diff?: string;
        error?: string;
        dimensions: {
            width: number;
            height: number;
        };
    }>;
}

/**
 * Generate JSON report from comparison results
 */
export async function generateJsonReport(
    report: ComparisonReport,
    config: ValidatedArgusConfig,
    outputPath: string
): Promise<string> {
    const jsonReport = createJsonReport(report, config);
    
    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    
    // Write report file
    await writeFile(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    
    return outputPath;
}

/**
 * Create JSON report object
 */
export function createJsonReport(
    report: ComparisonReport,
    config: ValidatedArgusConfig
): JsonReport {
    return {
        meta: {
            tool: 'argus',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
            duration: report.duration,
            baseUrl: config.baseUrl,
            browser: config.browser,
        },
        summary: {
            total: report.total,
            passed: report.results.filter((r) => r.status === 'passed').length,
            failed: report.results.filter((r) => r.status === 'failed').length,
            new: report.results.filter((r) => r.status === 'new').length,
            missing: report.results.filter((r) => r.status === 'missing').length,
            errors: report.results.filter((r) => r.status === 'error').length,
        },
        results: report.results.map((result) => ({
            name: result.name,
            status: result.status,
            diffPercentage: result.diffPercentage,
            baseline: result.baselinePath,
            current: result.currentPath,
            diff: result.diffImagePath,
            error: result.error,
            dimensions: {
                width: result.width,
                height: result.height,
            },
        })),
    };
}

/**
 * Generate JUnit XML report for CI/CD integration
 */
export async function generateJUnitReport(
    report: ComparisonReport,
    config: ValidatedArgusConfig,
    outputPath: string
): Promise<string> {
    const xml = createJUnitXml(report, config);
    
    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });
    
    // Write report file
    await writeFile(outputPath, xml, 'utf-8');
    
    return outputPath;
}

/**
 * Create JUnit XML string
 */
function createJUnitXml(
    report: ComparisonReport,
    config: ValidatedArgusConfig
): string {
    const timestamp = new Date().toISOString();
    const failed = report.results.filter((r) => r.status === 'failed').length;
    const errors = report.results.filter((r) => r.status === 'error').length;
    const time = (report.duration / 1000).toFixed(3);

    const testCases = report.results.map((result) => {
        const testTime = '0.001'; // Individual test times not tracked
        let content = '';
        
        if (result.status === 'failed') {
            content = `
      <failure message="Visual difference detected: ${result.diffPercentage.toFixed(4)}%" type="VisualDiff">
        Baseline: ${escapeXml(result.baselinePath)}
        Current: ${escapeXml(result.currentPath)}
        Diff: ${result.diffPercentage.toFixed(4)}%
      </failure>`;
        } else if (result.status === 'error') {
            content = `
      <error message="${escapeXml(result.error || 'Unknown error')}" type="Error">
        ${escapeXml(result.error || 'Unknown error')}
      </error>`;
        } else if (result.status === 'new') {
            content = `
      <skipped message="No baseline image found"/>`;
        } else if (result.status === 'missing') {
            content = `
      <skipped message="Current screenshot missing"/>`;
        }

        return `    <testcase name="${escapeXml(result.name)}" classname="argus.visual" time="${testTime}">${content}
    </testcase>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Argus Visual Regression" tests="${report.total}" failures="${failed}" errors="${errors}" time="${time}">
  <testsuite name="Visual Comparisons" tests="${report.total}" failures="${failed}" errors="${errors}" time="${time}" timestamp="${timestamp}">
    <properties>
      <property name="baseUrl" value="${escapeXml(config.baseUrl)}"/>
      <property name="browser" value="${config.browser}"/>
    </properties>
${testCases.join('\n')}
  </testsuite>
</testsuites>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
