/**
 * argus explore command
 *
 * Auto-discovery mode that crawls a website and captures screenshots.
 */

import { Command } from 'commander';
import chalk from 'chalk';

export function createExploreCommand(): Command {
    const command = new Command('explore');

    command
        .description('Auto-discover and capture pages starting from a URL')
        .argument('<url>', 'Starting URL for exploration')
        .option('-d, --depth <number>', 'Maximum crawl depth', '2')
        .option('-p, --pages <number>', 'Maximum pages to capture', '20')
        .option('--exclude <patterns...>', 'URL patterns to exclude')
        .option('--viewport <viewport>', 'Viewport size (e.g., "1920x1080")', '1920x1080')
        .option('--baseline', 'Save as baseline images')
        .option('--output <dir>', 'Output directory', '.argus')
        .action(
            async (
                url: string,
                options: {
                    depth?: string;
                    pages?: string;
                    exclude?: string[];
                    viewport?: string;
                    baseline?: boolean;
                    output?: string;
                }
            ) => {
                console.log(chalk.cyan('🔍 Argus Explorer'));
                console.log(chalk.gray(`Starting URL: ${url}`));
                console.log(chalk.gray(`Max depth: ${options.depth}`));
                console.log(chalk.gray(`Max pages: ${options.pages}`));
                console.log(chalk.gray(`Viewport: ${options.viewport}`));

                if (options.exclude?.length) {
                    console.log(chalk.gray(`Excluding: ${options.exclude.join(', ')}`));
                }

                // TODO: Implement explorer in Phase 5
                console.log(chalk.yellow('⚠️  Not yet implemented. Coming in Phase 5: Explorer Mode'));
            }
        );

    return command;
}
