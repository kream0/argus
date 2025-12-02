/**
 * Argus - Visual Regression Testing Tool
 *
 * Main entry point for programmatic usage.
 */

// Re-export types
export type {
  ActionType,
  Action,
  ArgusConfig,
  AuthConfig,
  BaseAction,
  ClickAction,
  ExplorerConfig,
  HoverAction,
  ResolvedArgusConfig,
  RouteConfig,
  ScrollAction,
  SelectAction,
  ThresholdConfig,
  TypeAction,
  Viewport,
  WaitAction,
} from './types/index.ts';

// Re-export helpers
export { defineConfig, DEFAULT_CONFIG } from './types/index.ts';

// Version
export { VERSION } from './cli/version.ts';
