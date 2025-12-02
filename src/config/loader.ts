/**
 * Configuration Loader
 *
 * Loads and validates argus.config.ts files
 */

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { validateConfig, safeValidateConfig, type ValidatedArgusConfig } from './schema.ts';
import type { ArgusConfig } from '../types/config.ts';

const CONFIG_FILENAMES = ['argus.config.ts', 'argus.config.js', 'argus.config.mjs'];

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Find configuration file in the given directory
 */
export function findConfigFile(cwd: string = process.cwd()): string | null {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(cwd, filename);
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

/**
 * Load configuration from file path
 */
export async function loadConfigFile(configPath: string): Promise<ArgusConfig> {
  const absolutePath = resolve(configPath);

  if (!existsSync(absolutePath)) {
    throw new ConfigError(`Configuration file not found: ${absolutePath}`);
  }

  try {
    // Bun can import TypeScript files directly
    const module = await import(absolutePath);
    const config = module.default;

    if (!config) {
      throw new ConfigError(
        'Configuration file must export a default configuration object',
        ['Use: export default defineConfig({ ... })']
      );
    }

    return config as ArgusConfig;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(
      `Failed to load configuration file: ${absolutePath}`,
      [error instanceof Error ? error.message : String(error)]
    );
  }
}

/**
 * Load and validate configuration
 */
export async function loadConfig(configPath?: string): Promise<ValidatedArgusConfig> {
  const cwd = process.cwd();

  // Find or use provided config path
  const resolvedPath = configPath ? resolve(configPath) : findConfigFile(cwd);

  if (!resolvedPath) {
    throw new ConfigError(
      'No configuration file found',
      [
        'Run "argus init" to create a configuration file',
        `Or create one of: ${CONFIG_FILENAMES.join(', ')}`,
      ]
    );
  }

  // Load the raw config
  const rawConfig = await loadConfigFile(resolvedPath);

  // Validate with Zod
  const result = safeValidateConfig(rawConfig);

  if (!result.success && result.errors) {
    const errorMessages = result.errors.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    throw new ConfigError('Invalid configuration', errorMessages);
  }

  return result.data!;
}

/**
 * Format configuration error for CLI output
 */
export function formatConfigError(error: ConfigError): string {
  let output = chalk.red(`Error: ${error.message}`);

  if (error.details && error.details.length > 0) {
    output += '\n' + chalk.gray(error.details.join('\n'));
  }

  return output;
}
