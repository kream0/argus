/**
 * argus approve command
 *
 * Promotes current screenshots to baseline (overwrites).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, formatConfigError } from '../../config/loader.ts';
import { approveScreenshots, cleanupComparison } from '../../diff/index.ts';

export function createApproveCommand(): Command {
    const command = new Command('approve');

    command
        .description('Promote current screenshots to baseline')
        .option('-a, --all', 'Approve all current screenshots', true)
        .option('--filter <names...>', 'Approve only screenshots matching these names')
        .option('--clean', 'Clean up current and diff directories after approval')
        .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
        .action(
            async (options: {
                all?: boolean;
                filter?: string[];
                clean?: boolean;
                config?: string;
            }) => {
                console.log(chalk.cyan('\n🔍 Argus Approve\n'));

                // Load configuration
                const configResult = await loadConfig(options.config);

                if (!configResult.success) {
                    console.error(chalk.red(formatConfigError(configResult.error)));
                    process.exit(1);
                }

                const config = configResult.config;

                if (options.filter && options.filter.length > 0) {
                    console.log(chalk.gray(`Filter: ${options.filter.join(', ')}`));
                } else {
                    console.log(chalk.gray('Approving all current screenshots...'));
                }

                try {
                    const { approved, skipped } = await approveScreenshots(config, options.filter);

                    if (approved.length === 0) {
                        console.log(chalk.yellow('\nNo screenshots to approve.'));
                        console.log(chalk.gray('Run "argus capture" first to generate screenshots.'));
                        return;
                    }

                    console.log(chalk.green(`\n✓ Approved ${approved.length} screenshot(s):\n`));
                    for (const name of approved) {
                        console.log(chalk.green(`  • ${name}`));
                    }

                    if (skipped.length > 0) {
                        console.log(chalk.gray(`\n  Skipped ${skipped.length} screenshot(s) (filtered out)`));
                    }

                    // Clean up if requested
                    if (options.clean) {
                        await cleanupComparison(config);
                        console.log(chalk.gray('\n  Cleaned up current and diff directories'));
                    }

                    console.log(chalk.gray(`\n  Baselines saved to: ${config.outputDir}/baselines/`));
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.error(chalk.red(`\nApproval failed: ${message}`));
                    process.exit(1);
                }
            }
        );

    return command;
}
