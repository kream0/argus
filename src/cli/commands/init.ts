/**
 * argus init command
 *
 * Generates a default argus.config.ts in the current project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findConfigFile } from '../../config/loader.ts';

const CONFIG_TEMPLATE = `import { defineConfig } from 'argus-vrt';

export default defineConfig({
  // Base URL of your application
  baseUrl: 'http://localhost:3000',

  // Viewports to capture
  viewports: [
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 375, height: 667, name: 'mobile' },
  ],

  // Number of concurrent captures
  concurrency: 4,

  // Global settings
  timezone: 'UTC',
  locale: 'en-US',

  // CSS selectors to mask across all captures (e.g., dynamic content)
  globalMask: [
    // '.timestamp',
    // '[data-testid="user-id"]',
  ],

  // Explorer mode settings (for argus explore)
  explorer: {
    maxDepth: 2,
    maxPages: 20,
    exclude: [
      '/logout',
      '/admin/*',
      '*.pdf',
    ],
  },

  // User-defined routes (for argus capture)
  routes: [
    // {
    //   path: '/',
    //   name: 'Home',
    // },
    // {
    //   path: '/dashboard',
    //   name: 'Dashboard',
    //   timezone: 'America/New_York',
    //   actions: [
    //     { type: 'wait', timeout: 1000 },
    //   ],
    // },
  ],

  // Comparison thresholds
  threshold: {
    pixel: 0.1,           // Pixel difference sensitivity (0-1)
    failureThreshold: 0.1, // Percentage of pixels to trigger failure
  },

  // Output directory for screenshots and reports
  outputDir: '.argus',

  // Browser engine
  browser: 'chromium',

  // Disable CSS animations for consistent captures
  disableAnimations: true,

  // Wait for network idle before capture
  waitForNetworkIdle: true,
});
`;

const GITIGNORE_CONTENT = `# Argus - Visual Regression Testing
.argus/current/
.argus/diffs/
.argus/report/
`;

export function createInitCommand(): Command {
    const command = new Command('init');

    command
        .description('Generate a default argus.config.ts configuration file')
        .option('-f, --force', 'Overwrite existing configuration file')
        .action(async (options: { force?: boolean }) => {
            const cwd = process.cwd();

            console.log(chalk.cyan('Argus Init\n'));

            // Check for existing config
            const existingConfig = findConfigFile(cwd);
            if (existingConfig && !options.force) {
                console.log(chalk.yellow(`Configuration file already exists: ${existingConfig}`));
                console.log(chalk.gray('Use --force to overwrite'));
                process.exit(1);
            }

            // Create config file
            const configPath = join(cwd, 'argus.config.ts');
            try {
                writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8');
                console.log(chalk.green('Created: argus.config.ts'));
            } catch (error) {
                console.log(chalk.red(`Failed to create config file: ${error}`));
                process.exit(1);
            }

            // Create .argus directory structure
            const argusDir = join(cwd, '.argus');
            const dirs = ['baselines', 'current', 'diffs', 'report', 'scripts'];

            for (const dir of dirs) {
                const dirPath = join(argusDir, dir);
                if (!existsSync(dirPath)) {
                    mkdirSync(dirPath, { recursive: true });
                }
            }
            console.log(chalk.green('Created: .argus/ directory structure'));

            // Add to .gitignore if it exists
            const gitignorePath = join(cwd, '.gitignore');
            if (existsSync(gitignorePath)) {
                try {
                    const currentContent = await Bun.file(gitignorePath).text();
                    if (!currentContent.includes('.argus/current/')) {
                        writeFileSync(gitignorePath, currentContent + '\n' + GITIGNORE_CONTENT, 'utf-8');
                        console.log(chalk.green('Updated: .gitignore'));
                    }
                } catch {
                    // Ignore gitignore errors
                }
            }

            console.log(chalk.gray('\nNext steps:'));
            console.log(chalk.gray('  1. Edit argus.config.ts with your baseUrl and routes'));
            console.log(chalk.gray('  2. Run: argus capture --baseline'));
            console.log(chalk.gray('  3. Run: argus compare'));
        });

    return command;
}
