/**
 * Argus Types
 *
 * Re-exports all type definitions for external consumption
 */

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
} from './config.js';

export { DEFAULT_CONFIG, defineConfig } from './config.js';
