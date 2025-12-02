/**
 * Comparison Engine
 *
 * Orchestrates comparison of current screenshots against baselines.
 */

import { readdir, stat, access } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import { compareImages, type DiffResult, type DiffOptions } from './image-diff.ts';
import type { ResolvedArgusConfig, ThresholdConfig } from '../types/config.ts';

export interface ComparisonResult extends DiffResult {
    /** Name of the screenshot (filename without extension) */
    name: string;
    /** Path to baseline image */
    baselinePath: string;
    /** Path to current image */
    currentPath: string;
    /** Status of the comparison */
    status: 'passed' | 'failed' | 'new' | 'missing' | 'error';
}

export interface ComparisonReport {
    /** Total number of comparisons */
    total: number;
    /** Number of passed comparisons */
    passed: number;
    /** Number of failed comparisons */
    failed: number;
    /** Number of new screenshots (no baseline) */
    new: number;
    /** Number of missing current screenshots */
    missing: number;
    /** Number of errors */
    errors: number;
    /** Individual comparison results */
    results: ComparisonResult[];
    /** Total duration in ms */
    duration: number;
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Recursively get all PNG files in a directory
 */
async function getPngFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await getPngFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.png')) {
                files.push(fullPath);
            }
        }
    } catch {
        // Directory doesn't exist
    }

    return files;
}

/**
 * Compare all current screenshots against baselines
 */
export async function runComparison(
    config: ResolvedArgusConfig,
    onProgress?: (completed: number, total: number, result?: ComparisonResult) => void
): Promise<ComparisonReport> {
    const startTime = Date.now();
    const results: ComparisonResult[] = [];

    const baselinesDir = join(config.outputDir, 'baselines');
    const currentDir = join(config.outputDir, 'current');
    const diffsDir = join(config.outputDir, 'diffs');

    // Get all PNG files from both directories
    const baselineFiles = await getPngFiles(baselinesDir);
    const currentFiles = await getPngFiles(currentDir);

    // Create sets for easy lookup
    const baselineSet = new Set(baselineFiles.map((f) => relative(baselinesDir, f)));
    const currentSet = new Set(currentFiles.map((f) => relative(currentDir, f)));

    // All unique files to compare
    const allFiles = new Set([...baselineSet, ...currentSet]);
    const total = allFiles.size;
    let completed = 0;

    const diffOptions: DiffOptions = {
        threshold: config.threshold.pixel,
    };

    for (const relativePath of allFiles) {
        const baselinePath = join(baselinesDir, relativePath);
        const currentPath = join(currentDir, relativePath);
        const diffPath = join(diffsDir, relativePath);
        const name = basename(relativePath, '.png');

        const hasBaseline = baselineSet.has(relativePath);
        const hasCurrent = currentSet.has(relativePath);

        let result: ComparisonResult;

        if (!hasBaseline && hasCurrent) {
            // New screenshot - no baseline exists
            result = {
                name,
                baselinePath,
                currentPath,
                status: 'new',
                diffPixels: 0,
                totalPixels: 0,
                diffPercentage: 0,
                passed: false,
                width: 0,
                height: 0,
            };
        } else if (hasBaseline && !hasCurrent) {
            // Missing current screenshot
            result = {
                name,
                baselinePath,
                currentPath,
                status: 'missing',
                diffPixels: 0,
                totalPixels: 0,
                diffPercentage: 0,
                passed: false,
                width: 0,
                height: 0,
            };
        } else {
            // Both exist - compare them
            const diffResult = await compareImages(
                baselinePath,
                currentPath,
                diffPath,
                config.threshold.failureThreshold,
                diffOptions
            );

            result = {
                name,
                baselinePath,
                currentPath,
                status: diffResult.error ? 'error' : diffResult.passed ? 'passed' : 'failed',
                ...diffResult,
            };
        }

        results.push(result);
        completed++;
        onProgress?.(completed, total, result);
    }

    // Calculate summary
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const newCount = results.filter((r) => r.status === 'new').length;
    const missing = results.filter((r) => r.status === 'missing').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return {
        total,
        passed,
        failed,
        new: newCount,
        missing,
        errors,
        results,
        duration: Date.now() - startTime,
    };
}

/**
 * Approve (promote) current screenshots to baselines
 */
export async function approveScreenshots(
    config: ResolvedArgusConfig,
    filter?: string[]
): Promise<{ approved: string[]; skipped: string[] }> {
    const { cp, rm } = await import('node:fs/promises');
    
    const baselinesDir = join(config.outputDir, 'baselines');
    const currentDir = join(config.outputDir, 'current');
    const diffsDir = join(config.outputDir, 'diffs');

    const currentFiles = await getPngFiles(currentDir);
    const approved: string[] = [];
    const skipped: string[] = [];

    for (const currentPath of currentFiles) {
        const relativePath = relative(currentDir, currentPath);
        const name = basename(relativePath, '.png');

        // Apply filter if provided
        if (filter && filter.length > 0) {
            const matchesFilter = filter.some(
                (f) => name.toLowerCase().includes(f.toLowerCase())
            );
            if (!matchesFilter) {
                skipped.push(name);
                continue;
            }
        }

        const baselinePath = join(baselinesDir, relativePath);
        const diffPath = join(diffsDir, relativePath);

        // Copy current to baseline
        await cp(currentPath, baselinePath, { recursive: true });
        approved.push(name);

        // Remove diff if it exists
        try {
            await rm(diffPath);
        } catch {
            // Diff doesn't exist, that's fine
        }
    }

    return { approved, skipped };
}

/**
 * Clean up current and diffs directories
 */
export async function cleanupComparison(config: ResolvedArgusConfig): Promise<void> {
    const { rm } = await import('node:fs/promises');
    
    const currentDir = join(config.outputDir, 'current');
    const diffsDir = join(config.outputDir, 'diffs');

    try {
        await rm(currentDir, { recursive: true, force: true });
    } catch {
        // Directory doesn't exist
    }

    try {
        await rm(diffsDir, { recursive: true, force: true });
    } catch {
        // Directory doesn't exist
    }
}
