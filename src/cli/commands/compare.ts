/**
 * argus compare command
 *
 * Compares current captures against baseline images.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'node:path';
import { loadConfig, formatConfigError } from '../../config/loader.ts';
import { runComparison, type ComparisonResult } from '../../diff/index.ts';
import { generateHtmlReport, generateJsonReport, generateJUnitReport } from '../../report/index.ts';

export function createCompareCommand(): Command {
    const command = new Command('compare');

    command
        .description('Compare current screenshots against baseline')
        .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
        .option('--threshold <number>', 'Override pixel difference threshold (0-1)')
        .option('--update-missing', 'Create baseline for new images instead of failing')
        .option('--json', 'Output results as JSON to stdout')
        .option('--report', 'Generate HTML report', true)
        .option('--no-report', 'Skip HTML report generation')
        .option('--report-path <path>', 'Custom path for HTML report')
        .option('--junit <path>', 'Generate JUnit XML report at specified path')
        .action(
            async (options: {
                config?: string;
                threshold?: string;
                updateMissing?: boolean;
                json?: boolean;
                report?: boolean;
                reportPath?: string;
                junit?: string;
            }) => {
                if (!options.json) {
                    console.log(chalk.cyan('\n🔍 Argus Compare\n'));
                }

                let config;
                try {
                    config = await loadConfig(options.config);
                } catch (error) {
                    if (!options.json) {
                        console.error(formatConfigError(error as any));
                    }
                    process.exit(1);
                }

                // Apply threshold override
                if (options.threshold) {
                    config.threshold.failureThreshold = parseFloat(options.threshold) * 100;
                }

                if (!options.json) {
                    console.log(chalk.gray(`Threshold: ${config.threshold.failureThreshold}%`));
                    console.log(chalk.gray(`Comparing screenshots...\n`));
                }

                // Progress callback
                const onProgress = options.json
                    ? undefined
                    : (completed: number, total: number, result?: ComparisonResult) => {
                        if (result) {
                            const icon = getStatusIcon(result.status);
                            process.stdout.write(`\r${icon} ${result.name} (${completed}/${total})`);
                        }
                    };

                try {
                    const report = await runComparison(config, onProgress);

                    if (!options.json) {
                        // Clear progress line
                        process.stdout.write('\r' + ' '.repeat(80) + '\r');
                    }

                    // Output JSON if requested
                    if (options.json) {
                        console.log(JSON.stringify(report, null, 2));
                        process.exit(report.failed > 0 || report.errors > 0 ? 1 : 0);
                    }

                    // Generate reports
                    if (options.report && report.total > 0) {
                        const htmlPath = options.reportPath ?? join(config.outputDir, 'report', 'index.html');
                        const jsonPath = join(config.outputDir, 'report', 'report.json');

                        const reportPromises = [
                            generateHtmlReport(report, config, htmlPath),
                            generateJsonReport(report, config, jsonPath),
                        ];

                        // Add JUnit report if requested
                        if (options.junit) {
                            reportPromises.push(generateJUnitReport(report, config, options.junit));
                        }

                        await Promise.all(reportPromises);

                        console.log(chalk.cyan(`\n📊 Report generated: ${htmlPath}`));
                        if (options.junit) {
                            console.log(chalk.cyan(`   JUnit report: ${options.junit}`));
                        }
                    } else if (options.junit && report.total > 0) {
                        // JUnit only (no HTML report)
                        await generateJUnitReport(report, config, options.junit);
                        console.log(chalk.cyan(`\n📊 JUnit report: ${options.junit}`));
                    }

                    // Print summary
                    console.log(chalk.bold('\nComparison Results:\n'));

                    if (report.passed > 0) {
                        console.log(chalk.green(`  ✓ ${report.passed} passed`));
                    }
                    if (report.failed > 0) {
                        console.log(chalk.red(`  ✗ ${report.failed} failed`));
                    }
                    if (report.new > 0) {
                        console.log(chalk.yellow(`  ◉ ${report.new} new (no baseline)`));
                    }
                    if (report.missing > 0) {
                        console.log(chalk.gray(`  ○ ${report.missing} missing`));
                    }
                    if (report.errors > 0) {
                        console.log(chalk.red(`  ! ${report.errors} errors`));
                    }

                    console.log(chalk.gray(`\n  Duration: ${(report.duration / 1000).toFixed(2)}s`));

                    // Show details for failed comparisons
                    const failed = report.results.filter((r) => r.status === 'failed');
                    if (failed.length > 0) {
                        console.log(chalk.red('\nFailed Comparisons:\n'));
                        for (const result of failed) {
                            console.log(chalk.red(`  • ${result.name}`));
                            console.log(chalk.gray(`    Diff: ${result.diffPercentage.toFixed(4)}%`));
                            if (result.diffImagePath) {
                                console.log(chalk.gray(`    Diff image: ${result.diffImagePath}`));
                            }
                        }
                    }

                    // Show new screenshots
                    const newResults = report.results.filter((r) => r.status === 'new');
                    if (newResults.length > 0) {
                        console.log(chalk.yellow('\nNew Screenshots (no baseline):\n'));
                        for (const result of newResults) {
                            console.log(chalk.yellow(`  • ${result.name}`));
                        }
                        console.log(chalk.gray('\n  Run "argus approve" to create baselines'));
                    }

                    // Show errors
                    const errors = report.results.filter((r) => r.status === 'error');
                    if (errors.length > 0) {
                        console.log(chalk.red('\nErrors:\n'));
                        for (const result of errors) {
                            console.log(chalk.red(`  • ${result.name}: ${result.error}`));
                        }
                    }

                    // Exit with error if there are failures
                    if (report.failed > 0 || report.errors > 0 || (report.new > 0 && !options.updateMissing)) {
                        process.exit(1);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(chalk.red(`\nComparison failed: ${message}`));
                    process.exit(1);
                }
            }
        );

    return command;
}

function getStatusIcon(status: string): string {
    switch (status) {
        case 'passed':
            return chalk.green('✓');
        case 'failed':
            return chalk.red('✗');
        case 'new':
            return chalk.yellow('◉');
        case 'missing':
            return chalk.gray('○');
        case 'error':
            return chalk.red('!');
        default:
            return ' ';
    }
}
