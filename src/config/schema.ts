/**
 * Zod Schema for Argus Configuration
 *
 * Runtime validation for argus.config.ts files
 */

import { z } from 'zod';

// Viewport schema
export const ViewportSchema = z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    name: z.string().optional(),
});

// Auth configuration schema
export const AuthConfigSchema = z.object({
    loginUrl: z.string(),
    usernameSelector: z.string(),
    passwordSelector: z.string(),
    credentials: z.object({
        username: z.string().optional(),
        password: z.string().optional(),
    }),
    postLoginSelector: z.string(),
    submitSelector: z.string().optional(),
});

// Explorer configuration schema
export const ExplorerConfigSchema = z.object({
    maxDepth: z.number().int().min(1).max(10).default(2),
    maxPages: z.number().int().min(1).max(1000).default(20),
    exclude: z.array(z.string()).optional().default([]),
    include: z.array(z.string()).optional().default([]),
});

// Action schemas
const ClickActionSchema = z.object({
    type: z.literal('click'),
    selector: z.string(),
});

const HoverActionSchema = z.object({
    type: z.literal('hover'),
    selector: z.string(),
});

const WaitActionSchema = z.object({
    type: z.literal('wait'),
    timeout: z.number().int().positive(),
});

const ScrollActionSchema = z.object({
    type: z.literal('scroll'),
    target: z.string(),
});

const TypeActionSchema = z.object({
    type: z.literal('type'),
    selector: z.string(),
    text: z.string(),
});

const SelectActionSchema = z.object({
    type: z.literal('select'),
    selector: z.string(),
    value: z.string(),
});

export const ActionSchema = z.discriminatedUnion('type', [
    ClickActionSchema,
    HoverActionSchema,
    WaitActionSchema,
    ScrollActionSchema,
    TypeActionSchema,
    SelectActionSchema,
]);

// Route configuration schema
export const RouteConfigSchema = z.object({
    path: z.string(),
    name: z.string(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    viewports: z.array(ViewportSchema).optional(),
    mask: z.array(z.string()).optional(),
    actions: z.array(ActionSchema).optional(),
    preScript: z.string().optional(),
    waitForSelector: z.string().optional(),
    waitAfterLoad: z.number().int().nonnegative().optional(),
});

// Threshold configuration schema
export const ThresholdConfigSchema = z.object({
    pixel: z.number().min(0).max(1).default(0.1),
    failureThreshold: z.number().min(0).max(100).default(0.1),
});

// Main Argus configuration schema
export const ArgusConfigSchema = z.object({
    baseUrl: z.string().url(),
    viewports: z.array(ViewportSchema).optional().default([{ width: 1920, height: 1080 }]),
    concurrency: z.number().int().min(1).max(20).optional().default(4),
    timezone: z.string().optional().default('UTC'),
    locale: z.string().optional().default('en-US'),
    auth: AuthConfigSchema.optional(),
    globalMask: z.array(z.string()).optional().default([]),
    explorer: ExplorerConfigSchema.optional().default({
        maxDepth: 2,
        maxPages: 20,
        exclude: [],
        include: [],
    }),
    routes: z.array(RouteConfigSchema).optional().default([]),
    threshold: ThresholdConfigSchema.optional().default({
        pixel: 0.1,
        failureThreshold: 0.1,
    }),
    outputDir: z.string().optional().default('.argus'),
    browser: z.enum(['chromium', 'firefox', 'webkit']).optional().default('chromium'),
    disableAnimations: z.boolean().optional().default(true),
    waitForNetworkIdle: z.boolean().optional().default(true),
});

// Type inference from schema
export type ValidatedArgusConfig = z.infer<typeof ArgusConfigSchema>;

/**
 * Validate configuration object against schema
 */
export function validateConfig(config: unknown): ValidatedArgusConfig {
    return ArgusConfigSchema.parse(config);
}

/**
 * Safely validate configuration, returning errors instead of throwing
 */
export function safeValidateConfig(config: unknown): {
    success: boolean;
    data?: ValidatedArgusConfig;
    errors?: z.ZodError;
} {
    const result = ArgusConfigSchema.safeParse(config);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}
