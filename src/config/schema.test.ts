/**
 * Configuration Schema Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  validateConfig,
  safeValidateConfig,
  ArgusConfigSchema,
} from './schema.ts';

describe('ArgusConfigSchema', () => {
  describe('validateConfig', () => {
    it('should validate minimal config with just baseUrl', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
      };

      const result = validateConfig(config);

      expect(result.baseUrl).toBe('http://localhost:3000');
      expect(result.concurrency).toBe(4); // default
      expect(result.browser).toBe('chromium'); // default
      expect(result.viewports).toHaveLength(1);
    });

    it('should validate full config', () => {
      const config = {
        baseUrl: 'http://localhost:4200',
        viewports: [
          { width: 1920, height: 1080, name: 'desktop' },
          { width: 375, height: 667, name: 'mobile' },
        ],
        concurrency: 2,
        timezone: 'America/New_York',
        locale: 'en-US',
        globalMask: ['.timestamp'],
        explorer: {
          maxDepth: 3,
          maxPages: 50,
          exclude: ['/logout'],
        },
        routes: [
          {
            path: '/dashboard',
            name: 'Dashboard',
            actions: [
              { type: 'click', selector: '.menu' },
              { type: 'wait', timeout: 500 },
            ],
          },
        ],
        threshold: {
          pixel: 0.05,
          failureThreshold: 1,
        },
        browser: 'firefox',
        disableAnimations: true,
        waitForNetworkIdle: false,
      };

      const result = validateConfig(config);

      expect(result.baseUrl).toBe('http://localhost:4200');
      expect(result.viewports).toHaveLength(2);
      expect(result.concurrency).toBe(2);
      expect(result.browser).toBe('firefox');
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]?.actions).toHaveLength(2);
    });

    it('should reject invalid baseUrl', () => {
      const config = {
        baseUrl: 'not-a-url',
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it('should reject negative viewport dimensions', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        viewports: [{ width: -100, height: 1080 }],
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it('should reject invalid browser', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        browser: 'safari',
      };

      expect(() => validateConfig(config)).toThrow();
    });
  });

  describe('safeValidateConfig', () => {
    it('should return success for valid config', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
      };

      const result = safeValidateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.baseUrl).toBe('http://localhost:3000');
    });

    it('should return errors for invalid config', () => {
      const config = {
        baseUrl: 'invalid',
      };

      const result = safeValidateConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Action validation', () => {
    it('should validate click action', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        routes: [
          {
            path: '/',
            name: 'Home',
            actions: [{ type: 'click', selector: '#button' }],
          },
        ],
      };

      const result = validateConfig(config);
      expect(result.routes[0]?.actions?.[0]?.type).toBe('click');
    });

    it('should validate wait action', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        routes: [
          {
            path: '/',
            name: 'Home',
            actions: [{ type: 'wait', timeout: 1000 }],
          },
        ],
      };

      const result = validateConfig(config);
      expect(result.routes[0]?.actions?.[0]?.type).toBe('wait');
    });

    it('should validate type action', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        routes: [
          {
            path: '/',
            name: 'Home',
            actions: [{ type: 'type', selector: '#input', text: 'hello' }],
          },
        ],
      };

      const result = validateConfig(config);
      expect(result.routes[0]?.actions?.[0]?.type).toBe('type');
    });

    it('should reject invalid action type', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        routes: [
          {
            path: '/',
            name: 'Home',
            actions: [{ type: 'invalid', selector: '#button' }],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow();
    });
  });

  describe('Explorer config validation', () => {
    it('should apply default explorer values', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
      };

      const result = validateConfig(config);

      expect(result.explorer.maxDepth).toBe(2);
      expect(result.explorer.maxPages).toBe(20);
    });

    it('should reject maxDepth > 10', () => {
      const config = {
        baseUrl: 'http://localhost:3000',
        explorer: {
          maxDepth: 15,
          maxPages: 20,
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });
  });
});
