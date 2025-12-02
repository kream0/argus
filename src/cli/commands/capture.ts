/**
 * argus capture command
 *
 * Captures screenshots based on configuration.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, formatConfigError } from '../../config/loader.ts';
import { runCapture, type CaptureResult } from '../../capture/index.ts';

export function createCaptureCommand(): Command {
    const command = new Command('capture');

    command
        .description('Capture screenshots for visual regression testing')
        .option('-b, --baseline', 'Save captures as baseline images')
        .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
        .option('--viewport <viewport>', 'Specific viewport to capture (e.g., "1920x1080")')
        .option('--route <route>', 'Specific route to capture by name')
        .option('--concurrency <number>', 'Number of concurrent captures')
        .option('--headless', 'Run browser in headless mode', true)
        .option('--no-headless', 'Run browser with visible UI')
        .action(
            async (options: {
                baseline?: boolean;
                config?: string;
                viewport?: string;
                route?: string;
                concurrency?: string;
                headless?: boolean;
            }) => {
                console.log(chalk.cyan('\n🔍 Argus Capture\n'));

                // Load configuration
                const configResult = await loadConfig(options.config);

                if (!configResult.success) {
                    console.error(chalk.red(formatConfigError(configResult.error)));
                    process.exit(1);
                }

                const config = configResult.config;

                // Apply CLI overrides
                if (options.concurrency) {
                    config.concurrency = parseInt(options.concurrency, 10);
                }

                // Filter routes if specific route requested
                if (options.route) {
                    config.routes = config.routes.filter(
                        (r) => r.name.toLowerCase() === options.route!.toLowerCase()
                    );

                    if (config.routes.length === 0) {
                        console.error(chalk.red(`Error: Route "${options.route}" not found in configuration`));
                        process.exit(1);
                    }
                }

                // Filter viewports if specific viewport requested
                if (options.viewport) {
                    const [width, height] = options.viewport.split('x').map(Number);
                    if (width && height) {
                        config.viewports = [{ width, height }];
                    } else {
                        console.error(chalk.red('Error: Invalid viewport format. Use "WIDTHxHEIGHT" (e.g., "1920x1080")'));
                        process.exit(1);
                    }
                }

                // Check if there are routes to capture
                if (config.routes.length === 0) {
                    console.log(chalk.yellow('No routes defined in configuration.'));
                    console.log(chalk.gray('Add routes to argus.config.ts or use "argus explore" for auto-discovery.'));
                    return;
                }

                const mode = options.baseline ? 'baseline' : 'current';
                const totalCaptures = config.routes.length * config.viewports.length;

                console.log(chalk.gray(`Mode: ${mode === 'baseline' ? 'Baseline capture' : 'Current capture'}`));
                console.log(chalk.gray(`Routes: ${config.routes.length}`));
                console.log(chalk.gray(`Viewports: ${config.viewports.length}`));
                console.log(chalk.gray(`Total captures: ${totalCaptures}\n`));

                // Progress callback
                const onProgress = (completed: number, total: number, result?: CaptureResult) => {
                    const percentage = Math.round((completed / total) * 100);
                    const bar = createProgressBar(percentage);
                    
                    if (result) {
                        const status = result.warnings.length > 0 ? chalk.yellow('⚠') : chalk.green('✓');
                        process.stdout.write(`\r${bar} ${percentage}% | ${status} ${result.routePath}`);
                    } else {
                        process.stdout.write(`\r${bar} ${percentage}%`);
                    }
                };

                try {
                    const report = await runCapture(
                        config,
                        {
                            mode,
                            headless: options.headless,
                            concurrency: config.concurrency,
                        },
                        onProgress
                    );

                    // Clear progress line and show results
                    console.log('\n');

                    if (report.failed > 0) {
                        console.log(chalk.red(`\n✗ ${report.failed} capture(s) failed:\n`));
                        for (const error of report.errors) {
                            console.log(chalk.red(`  • ${error.route} (${error.viewport}): ${error.error}`));
                        }
                    }

                    if (report.successful > 0) {
                        console.log(chalk.green(`✓ ${report.successful} screenshot(s) captured successfully`));
                        console.log(chalk.gray(`  Duration: ${(report.duration / 1000).toFixed(2)}s`));
                        console.log(chalk.gray(`  Output: ${config.outputDir}/${mode === 'baseline' ? 'baselines' : 'current'}/`));
                    }

                    // Show warnings
                    const resultsWithWarnings = report.results.filter((r) => r.warnings.length > 0);
                    if (resultsWithWarnings.length > 0) {
                        console.log(chalk.yellow(`\n⚠ ${resultsWithWarnings.length} capture(s) with warnings:`));
                        for (const result of resultsWithWarnings) {
                            console.log(chalk.yellow(`  • ${result.routePath}:`));
                            for (const warning of result.warnings) {
                                console.log(chalk.gray(`    - ${warning}`));
                            }
                        }
                    }

                    if (report.failed > 0) {
                        process.exit(1);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(chalk.red(`\nCapture failed: ${message}`));
                    process.exit(1);
                }
            }
        );

    return command;
}

/**
 * Create a simple progress bar
 */
function createProgressBar(percentage: number, width = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return chalk.cyan('[') + chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + chalk.cyan(']');
}
