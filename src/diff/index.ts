/**
 * Diff Module Exports
 */

export {
    compareImages,
    getBaselinePath,
    getDiffPath,
    type DiffOptions,
    type DiffResult,
} from './image-diff.ts';

export {
    runComparison,
    approveScreenshots,
    cleanupComparison,
    type ComparisonResult,
    type ComparisonReport,
} from './comparison-engine.ts';
