/**
 * argus explore command
 *
 * Auto-discovery mode that crawls a website and captures screenshots.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, formatConfigError } from '../../config/loader.ts';
import { runExplorer, type ExplorerResult } from '../../explorer/index.ts';
import type { Viewport } from '../../types/config.ts';

export function createExploreCommand(): Command {
    const command = new Command('explore');

    command
        .description('Auto-discover and capture pages starting from a URL')
        .argument('<url>', 'Starting URL for exploration')
        .option('-d, --depth <number>', 'Maximum crawl depth')
        .option('-p, --pages <number>', 'Maximum pages to capture')
        .option('--exclude <patterns...>', 'URL patterns to exclude')
        .option('--viewport <viewport>', 'Viewport size (e.g., "1920x1080")')
        .option('--baseline', 'Save as baseline images')
        .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
        .option('--headless', 'Run browser in headless mode', true)
        .option('--no-headless', 'Run browser with visible UI')
        .action(
            async (
                url: string,
                options: {
                    depth?: string;
                    pages?: string;
                    exclude?: string[];
                    viewport?: string;
                    baseline?: boolean;
                    config?: string;
                    headless?: boolean;
                }
            ) => {
                console.log(chalk.cyan('\n🔍 Argus Explorer\n'));

                // Validate URL
                try {
                    new URL(url);
                } catch {
                    console.error(chalk.red('Error: Invalid URL provided'));
                    process.exit(1);
                }

                // Try to load config, use defaults if not found
                let config;
                const configResult = await loadConfig(options.config);

                if (configResult.success) {
                    config = configResult.config;
                    // Override baseUrl with provided URL
                    config.baseUrl = url;
                } else {
                    // Create minimal config for exploration
                    const { DEFAULT_CONFIG } = await import('../../types/config.ts');
                    config = {
                        ...DEFAULT_CONFIG,
                        baseUrl: url,
                    };
                }

                // Apply CLI overrides
                if (options.depth) {
                    config.explorer.maxDepth = parseInt(options.depth, 10);
                }
                if (options.pages) {
                    config.explorer.maxPages = parseInt(options.pages, 10);
                }
                if (options.exclude) {
                    config.explorer.exclude = [...(config.explorer.exclude ?? []), ...options.exclude];
                }
                if (options.viewport) {
                    const [width, height] = options.viewport.split('x').map(Number);
                    if (width && height) {
                        config.viewports = [{ width, height } as Viewport];
                    }
                }

                const mode = options.baseline ? 'baseline' : 'current';

                console.log(chalk.gray(`Starting URL: ${url}`));
                console.log(chalk.gray(`Max depth: ${config.explorer.maxDepth}`));
                console.log(chalk.gray(`Max pages: ${config.explorer.maxPages}`));
                console.log(chalk.gray(`Mode: ${mode}`));
                if (config.explorer.exclude && config.explorer.exclude.length > 0) {
                    console.log(chalk.gray(`Excluding: ${config.explorer.exclude.join(', ')}`));
                }
                console.log('');

                // Progress callback
                const onProgress = (discovered: number, captured: number, current?: ExplorerResult) => {
                    if (current) {
                        const status = current.error ? chalk.red('✗') : chalk.green('✓');
                        process.stdout.write(
                            `\r${status} ${current.path} (${captured}/${config.explorer.maxPages} pages, ${discovered} discovered)`
                        );
                    }
                };

                try {
                    const report = await runExplorer(
                        config,
                        {
                            startUrl: url,
                            maxDepth: config.explorer.maxDepth,
                            maxPages: config.explorer.maxPages,
                            exclude: config.explorer.exclude,
                            mode,
                            headless: options.headless,
                        },
                        onProgress
                    );

                    // Clear progress line
                    process.stdout.write('\r' + ' '.repeat(100) + '\r');

                    // Print summary
                    console.log(chalk.bold('\nExploration Results:\n'));
                    console.log(chalk.gray(`  URLs discovered: ${report.discovered}`));
                    console.log(chalk.green(`  Pages captured: ${report.captured}`));
                    console.log(chalk.cyan(`  Screenshots: ${report.screenshots}`));
                    if (report.failed > 0) {
                        console.log(chalk.red(`  Failed: ${report.failed}`));
                    }
                    console.log(chalk.gray(`  Duration: ${(report.duration / 1000).toFixed(2)}s`));

                    // Show captured pages
                    if (report.results.length > 0) {
                        console.log(chalk.bold('\nCaptured Pages:\n'));
                        for (const result of report.results) {
                            const icon = result.error ? chalk.red('✗') : chalk.green('✓');
                            console.log(`  ${icon} ${result.path} (depth: ${result.depth})`);
                            if (result.error) {
                                console.log(chalk.red(`    Error: ${result.error}`));
                            }
                        }
                    }

                    console.log(chalk.gray(`\n  Output: ${config.outputDir}/${mode === 'baseline' ? 'baselines' : 'current'}/`));

                    if (report.failed > 0) {
                        process.exit(1);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(chalk.red(`\nExploration failed: ${message}`));
                    process.exit(1);
                }
            }
        );

    return command;
}
