/**
 * Configuration types tests
 */

import { describe, it, expect } from 'bun:test';
import { defineConfig, DEFAULT_CONFIG } from './config.ts';
import type { ArgusConfig, Viewport } from './config.ts';

describe('defineConfig', () => {
  it('should return the same configuration object', () => {
    const config: ArgusConfig = {
      baseUrl: 'http://localhost:3000',
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
    expect(result.baseUrl).toBe('http://localhost:3000');
  });

  it('should accept full configuration', () => {
    const config: ArgusConfig = {
      baseUrl: 'http://localhost:4200',
      viewports: [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 375, height: 667, name: 'mobile' },
      ],
      concurrency: 2,
      timezone: 'America/New_York',
      locale: 'en-US',
      globalMask: ['.timestamp', '[data-testid="user-id"]'],
      explorer: {
        maxDepth: 3,
        maxPages: 50,
        exclude: ['/logout', '/admin/*'],
      },
      routes: [
        {
          path: '/dashboard',
          name: 'Dashboard',
          timezone: 'UTC',
          actions: [
            { type: 'click', selector: '.menu-toggle' },
            { type: 'wait', timeout: 500 },
          ],
        },
      ],
      threshold: {
        pixel: 0.05,
        failureThreshold: 0.5,
      },
      browser: 'chromium',
      disableAnimations: true,
    };

    const result = defineConfig(config);

    expect(result.baseUrl).toBe('http://localhost:4200');
    expect(result.viewports).toHaveLength(2);
    expect(result.routes).toHaveLength(1);
    expect(result.routes?.[0]?.actions).toHaveLength(2);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have default viewports', () => {
    expect(DEFAULT_CONFIG.viewports).toHaveLength(1);
    
    const viewport: Viewport | undefined = DEFAULT_CONFIG.viewports[0];
    expect(viewport?.width).toBe(1920);
    expect(viewport?.height).toBe(1080);
  });

  it('should have default concurrency of 4', () => {
    expect(DEFAULT_CONFIG.concurrency).toBe(4);
  });

  it('should have default timezone UTC', () => {
    expect(DEFAULT_CONFIG.timezone).toBe('UTC');
  });

  it('should have default browser chromium', () => {
    expect(DEFAULT_CONFIG.browser).toBe('chromium');
  });

  it('should have explorer defaults', () => {
    expect(DEFAULT_CONFIG.explorer.maxDepth).toBe(2);
    expect(DEFAULT_CONFIG.explorer.maxPages).toBe(20);
  });

  it('should have threshold defaults', () => {
    expect(DEFAULT_CONFIG.threshold.pixel).toBe(0.1);
    expect(DEFAULT_CONFIG.threshold.failureThreshold).toBe(0.1);
  });
});
