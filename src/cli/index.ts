#!/usr/bin/env node
/**
 * Argus CLI Entry Point
 *
 * Visual regression testing tool with auto-discovery and pixel-accurate diffing.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createInitCommand } from './commands/init.ts';
import { createCaptureCommand } from './commands/capture.ts';
import { createCompareCommand } from './commands/compare.ts';
import { createExploreCommand } from './commands/explore.ts';
import { createApproveCommand } from './commands/approve.ts';
import { VERSION } from './version.ts';

const program = new Command();

program
  .name('argus')
  .description(
    chalk.cyan('🔍 Argus - Visual Regression Testing Tool\n') +
      'Detect visual and structural changes across web applications.'
  )
  .version(VERSION, '-v, --version', 'Display version number');

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createCaptureCommand());
program.addCommand(createCompareCommand());
program.addCommand(createExploreCommand());
program.addCommand(createApproveCommand());

// Parse arguments
program.parse();
