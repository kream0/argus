# Copilot Instructions for Argus

Development assistant for Argus - a CLI-based visual regression testing tool.

## Project Context

Argus detects visual (pixel-accurate) and structural (DOM/CSS) changes across web applications. It provides:
- **Explorer Mode:** Auto-discovery crawling
- **Config Mode:** Declarative user-defined routes
- **Hybrid Diffing:** Pixel + DOM comparison

## Tech Stack
- **Runtime:** Bun (runtime, package manager, bundler, test runner)
- **Browser Automation:** Playwright
- **Image Diffing:** pixelmatch
- **CLI Framework:** commander
- **Testing:** Bun's built-in test runner (`bun:test`)

## Code Rules

### TypeScript
- Use strict mode
- Prefer interfaces over types for objects
- Export types from `src/types/`
- Use `async/await` over raw Promises
- No `any` types unless absolutely necessary

### Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Error Handling
- Use custom error classes
- Provide user-friendly CLI error messages
- Log with context for debugging

## Testing
- Framework: Bun's built-in test runner (`import { describe, it, expect } from 'bun:test'`)
- Co-locate tests: `file.ts` → `file.test.ts`
- Test all public APIs
- Mock Playwright browser contexts in tests
- Run tests: `bun test`

## Before Coding
- Check `PRD.md` for functional requirements
- Check `TODO.md` for current priorities
- Read `LAST_SESSION.md` to avoid duplicate work

## CLI Commands (Target)
```bash
argus init              # Generate argus.config.ts
argus capture --baseline # Capture baseline screenshots
argus compare           # Compare current vs baseline
argus explore <url>     # Auto-discovery mode
argus approve           # Promote current to baseline
```

## Key Patterns

### Configuration Loading
```typescript
import { defineConfig } from './config';
export default defineConfig({
  baseUrl: 'http://localhost:4200',
  viewports: [{ width: 1920, height: 1080 }],
  // ...
});
```

### Playwright Context
```typescript
const context = await browser.newContext({
  timezoneId: 'America/New_York',
  locale: 'en-US',
  viewport: { width: 1920, height: 1080 }
});
```

### Image Comparison
```typescript
import pixelmatch from 'pixelmatch';
const diff = pixelmatch(img1, img2, diffOutput, width, height, {
  threshold: 0.1
});
```
