/**
 * argus init command
 *
 * Generates a default argus.config.ts in the current project.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Generate a default argus.config.ts configuration file')
    .option('-f, --force', 'Overwrite existing configuration file')
    .option('--typescript', 'Generate TypeScript config (default)', true)
    .option('--javascript', 'Generate JavaScript config instead')
    .action(async (options: { force?: boolean; typescript?: boolean; javascript?: boolean }) => {
      console.log(chalk.cyan('🔍 Argus Init'));
      console.log(chalk.gray('Generating configuration file...'));

      // TODO: Implement config file generation in Phase 2
      console.log(
        chalk.yellow('⚠️  Not yet implemented. Coming in Phase 2: Configuration System')
      );

      if (options.force) {
        console.log(chalk.gray('  --force flag detected'));
      }
    });

  return command;
}
