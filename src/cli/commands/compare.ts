/**
 * argus compare command
 *
 * Compares current captures against baseline images.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createCompareCommand(): Command {
  const command = new Command('compare');

  command
    .description('Compare current screenshots against baseline')
    .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
    .option('--threshold <number>', 'Pixel difference threshold (0-1)', '0.1')
    .option('--update-missing', 'Create baseline for missing images instead of failing')
    .option('--report', 'Generate HTML report', true)
    .option('--json', 'Output results as JSON')
    .option('--junit', 'Output results as JUnit XML')
    .action(
      async (options: {
        config?: string;
        threshold?: string;
        updateMissing?: boolean;
        report?: boolean;
        json?: boolean;
        junit?: boolean;
      }) => {
        console.log(chalk.cyan('🔍 Argus Compare'));
        console.log(chalk.gray(`Config: ${options.config}`));
        console.log(chalk.gray(`Threshold: ${options.threshold}`));

        // TODO: Implement compare in Phase 4
        console.log(
          chalk.yellow('⚠️  Not yet implemented. Coming in Phase 4: Diffing & Comparison Engine')
        );
      }
    );

  return command;
}
