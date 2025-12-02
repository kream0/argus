# CLAUDE.md

This file provides instructions for Claude Code to work effectively on this project.

## AGENT MANDATE & SESSION INITIALIZATION

**At the START of EACH session, you MUST read:**
1. `PRD.md` - Product Requirements Document
2. `LAST_SESSION.md` - Summary of the previous session
3. `TODO.md` - Task list and priorities

This step is non-negotiable to maintain project continuity.

## SESSION END PROTOCOL

**You MUST stop and prepare handoff when BOTH conditions are met:**
1. The current task doesn't break the code
2. There's enough context freedom to update documentation

**When stopping:**
- Update `LAST_SESSION.md` with a complete summary
- Update `TODO.md` with progress and next steps
- Create an end-of-session commit with work summary
- Provide a clear handoff summary

## Git & Commit Protocol
- **Frequency:** Commit after each completed task (passing tests)
- **Format:** Conventional Commits (type(scope): message)
- **Types:** feat, fix, refactor, test, docs, style, chore
- **Example:** `feat(cli): add explore command with auto-discovery`
- **End of session:** Always create a summary commit

---

## Project Overview

**Argus** is a CLI-based automated visual regression testing tool designed to detect pixel-accurate visual and structural (DOM/CSS) changes across web applications. It provides two primary modes: Explorer Mode (auto-discovery crawling) and Config Mode (declarative user-defined routes).

### Key Technologies
- **Runtime:** Bun (package manager, bundler, test runner, and runtime)
- **Browser Automation:** Playwright
- **Image Diffing:** pixelmatch
- **DOM Diffing:** jest-diff (for serialized DOM snapshots)
- **CLI Framework:** commander
- **Validation:** Zod

### Project Type
- CLI tool distributed via npm/bun
- TypeScript with strict mode
- ESM modules

---

## Development Commands

### Core Commands
- `bun install` - Install dependencies
- `bun run build` - Bundle with Bun
- `bun src/cli/index.ts` - Run CLI directly (no build needed!)
- `bun test` - Run tests with Bun's built-in runner
- `bun test --watch` - Run tests in watch mode
- `bun run lint` - Run ESLint

### CLI Commands (To Implement)
- `argus init` - Generate default `argus.config.ts`
- `argus capture --baseline` - Capture baseline screenshots
- `argus compare` - Compare current vs baseline
- `argus explore <url>` - Auto-discovery mode
- `argus approve` - Promote current images to baseline

---

## Code Patterns & Standards

### TypeScript Standards
- Strict mode enabled
- Use interfaces for configuration types
- Export types from dedicated `types/` directory
- Prefer `async/await` over raw Promises

### File Structure (Target)
```
src/
├── cli/              # CLI commands (init, capture, compare, explore, approve)
├── core/             # Core logic (crawler, differ, reporter)
├── config/           # Configuration loading and validation
├── utils/            # Helpers (timezone, masking, auth)
├── types/            # TypeScript type definitions
└── index.ts          # Main entry point
```

### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `IPrefixName` or just `PascalCase`

### Error Handling
- Use custom error classes extending `Error`
- Always provide meaningful error messages
- Log errors with context for debugging

---

## Testing Patterns

### Test Framework: Bun's Built-in Test Runner
```typescript
import { describe, it, expect } from 'bun:test';

describe('ExplorerMode', () => {
  it('should discover all internal links', async () => {
    const explorer = new Explorer({ maxDepth: 2 });
    const urls = await explorer.crawl('http://localhost:3000');
    expect(urls).toContain('/about');
  });
});
```

### Test File Location
- Co-located: `src/core/differ.ts` → `src/core/differ.test.ts`
- Or dedicated: `tests/core/differ.test.ts`

---

## Quality Standards

### Production-Ready Code
- **Clean Solutions Only:** Always implement the correct solution
- **Complete Error Handling:** Not just try/catch, provide user-friendly messages
- **Type Safety:** No `any` types unless absolutely necessary
- **Tests Required:** New features must include tests

### Forbidden Practices
- Temporary workarounds marked as "complete"
- Skipping type definitions
- Half-implemented features
- Console.log for production error handling

---

## Configuration Reference

The tool uses `argus.config.ts` for project configuration:

```typescript
export default defineConfig({
  baseUrl: 'http://localhost:4200',
  viewports: [{ width: 1920, height: 1080 }, { width: 375, height: 667 }],
  concurrency: 4,
  auth: { /* ... */ },
  globalMask: ['.timestamp', '[data-testid="user-id"]'],
  explorer: { maxDepth: 2, maxPages: 20, exclude: ['/logout'] },
  routes: [ /* user-defined routes */ ]
});
```

---

## Key Concepts from PRD

1. **Explorer Mode:** Zero-config auto-discovery crawling
2. **User-Defined Mode:** Declarative route configuration
3. **Hybrid Diffing:** Pixel + DOM/CSS comparison
4. **Environment Control:** Timezone, locale, and state mocking
5. **Dynamic Masking:** Hide timestamps, session IDs before capture

---

## Resources & References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [pixelmatch](https://github.com/mapbox/pixelmatch)
- [Commander.js](https://github.com/tj/commander.js)
- Project PRD: `PRD.md`
