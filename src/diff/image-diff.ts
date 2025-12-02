/**
 * Image Diff Engine
 *
 * Compares images using pixelmatch and generates diff images.
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface DiffOptions {
    /** Matching threshold (0-1, smaller = more sensitive) */
    threshold?: number;
    /** Include anti-aliased pixels in diff */
    includeAA?: boolean;
    /** Alpha channel threshold */
    alpha?: number;
    /** Color of differing pixels [R, G, B] */
    diffColor?: [number, number, number];
    /** Color for anti-aliased pixels [R, G, B] */
    aaColor?: [number, number, number];
}

export interface DiffResult {
    /** Number of different pixels */
    diffPixels: number;
    /** Total number of pixels */
    totalPixels: number;
    /** Percentage of different pixels (0-100) */
    diffPercentage: number;
    /** Whether the diff exceeds the failure threshold */
    passed: boolean;
    /** Path to the generated diff image (if created) */
    diffImagePath?: string;
    /** Width of compared images */
    width: number;
    /** Height of compared images */
    height: number;
    /** Error message if comparison failed */
    error?: string;
}

const DEFAULT_DIFF_OPTIONS: Required<DiffOptions> = {
    threshold: 0.1,
    includeAA: false,
    alpha: 0.1,
    diffColor: [255, 0, 0],
    aaColor: [255, 255, 0],
};

/**
 * Load a PNG image from file
 */
async function loadPNG(filePath: string): Promise<PNG> {
    const buffer = await readFile(filePath);
    return PNG.sync.read(buffer);
}

/**
 * Save a PNG image to file
 */
async function savePNG(png: PNG, filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const buffer = PNG.sync.write(png);
    await writeFile(filePath, buffer);
}

/**
 * Compare two images and generate a diff
 */
export async function compareImages(
    baselinePath: string,
    currentPath: string,
    diffPath: string | null,
    failureThreshold: number,
    options: DiffOptions = {}
): Promise<DiffResult> {
    const opts = { ...DEFAULT_DIFF_OPTIONS, ...options };

    let baseline: PNG;
    let current: PNG;

    try {
        baseline = await loadPNG(baselinePath);
    } catch (error) {
        return {
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 100,
            passed: false,
            width: 0,
            height: 0,
            error: `Failed to load baseline image: ${baselinePath}`,
        };
    }

    try {
        current = await loadPNG(currentPath);
    } catch (error) {
        return {
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 100,
            passed: false,
            width: 0,
            height: 0,
            error: `Failed to load current image: ${currentPath}`,
        };
    }

    // Check dimensions match
    if (baseline.width !== current.width || baseline.height !== current.height) {
        return {
            diffPixels: 0,
            totalPixels: 0,
            diffPercentage: 100,
            passed: false,
            width: baseline.width,
            height: baseline.height,
            error: `Image dimensions don't match: baseline (${baseline.width}x${baseline.height}) vs current (${current.width}x${current.height})`,
        };
    }

    const { width, height } = baseline;
    const totalPixels = width * height;

    // Create diff image buffer
    const diff = new PNG({ width, height });

    // Run pixelmatch
    const diffPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        width,
        height,
        {
            threshold: opts.threshold,
            includeAA: opts.includeAA,
            alpha: opts.alpha,
            diffColor: opts.diffColor,
            aaColor: opts.aaColor,
        }
    );

    const diffPercentage = (diffPixels / totalPixels) * 100;
    const passed = diffPercentage <= failureThreshold;

    // Save diff image if path provided and there are differences
    let diffImagePath: string | undefined;
    if (diffPath && diffPixels > 0) {
        await savePNG(diff, diffPath);
        diffImagePath = diffPath;
    }

    return {
        diffPixels,
        totalPixels,
        diffPercentage,
        passed,
        diffImagePath,
        width,
        height,
    };
}

/**
 * Check if a baseline image exists for a given current image
 */
export function getBaselinePath(currentPath: string, baselinesDir: string, currentDir: string): string {
    return currentPath.replace(currentDir, baselinesDir);
}

/**
 * Get the diff image path for a comparison
 */
export function getDiffPath(currentPath: string, diffsDir: string, currentDir: string): string {
    return currentPath.replace(currentDir, diffsDir);
}
