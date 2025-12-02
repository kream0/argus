/**
 * Configuration Module
 *
 * Exports configuration loading and validation utilities
 */

export { validateConfig, safeValidateConfig, ArgusConfigSchema } from './schema.ts';
export type { ValidatedArgusConfig } from './schema.ts';

export {
  loadConfig,
  loadConfigFile,
  findConfigFile,
  ConfigError,
  formatConfigError,
} from './loader.ts';
