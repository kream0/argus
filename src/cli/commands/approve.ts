/**
 * argus approve command
 *
 * Promotes current screenshots to baseline (overwrites).
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createApproveCommand(): Command {
  const command = new Command('approve');

  command
    .description('Promote current screenshots to baseline')
    .option('-a, --all', 'Approve all current screenshots')
    .option('--route <route>', 'Approve specific route only')
    .option('--interactive', 'Interactive mode to review and approve changes', false)
    .option('-c, --config <path>', 'Path to configuration file', 'argus.config.ts')
    .action(
      async (options: {
        all?: boolean;
        route?: string;
        interactive?: boolean;
        config?: string;
      }) => {
        console.log(chalk.cyan('🔍 Argus Approve'));

        if (options.all) {
          console.log(chalk.gray('Approving all current screenshots...'));
        } else if (options.route) {
          console.log(chalk.gray(`Approving route: ${options.route}`));
        } else if (options.interactive) {
          console.log(chalk.gray('Interactive approval mode...'));
        }

        // TODO: Implement approve in Phase 4
        console.log(
          chalk.yellow('⚠️  Not yet implemented. Coming in Phase 4: Diffing & Comparison Engine')
        );
      }
    );

  return command;
}
