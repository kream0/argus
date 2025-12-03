# Argus

CLI-based visual regression testing tool. Detects pixel-accurate and structural (DOM/CSS) changes across web applications.

## Features

- **Explorer Mode**: Auto-discovery crawling - start from a URL and capture screenshots of discovered pages
- **Config Mode**: Declarative route definitions with custom viewports, actions, and state
- **Hybrid Diffing**: Pixel comparison with pixelmatch + optional DOM/CSS structural diff
- **Environment Control**: Timezone, locale mocking, and dynamic content masking

## Installation

```bash
bun add argus-vrt
```

## Quick Start

```bash
# Initialize configuration
argus init

# Capture baseline screenshots
argus capture --baseline

# Compare current state against baseline
argus compare

# Or explore a URL without config
argus explore https://example.com
```

## CLI Commands

| Command                    | Description                                  |
|----------------------------|----------------------------------------------|
| `argus init`               | Generate `argus.config.ts`                   |
| `argus capture --baseline` | Capture baseline screenshots                 |
| `argus compare`            | Compare current vs baseline, generate report |
| `argus explore <url>`      | Auto-discover and capture pages              |
| `argus approve`            | Promote current screenshots to baseline      |

## Configuration

```typescript
// argus.config.ts
import { defineConfig } from 'argus-vrt';

export default defineConfig({
  baseUrl: 'http://localhost:4200',
  viewports: [
    { width: 1920, height: 1080 },
    { width: 375, height: 667 }
  ],
  concurrency: 4,
  globalMask: ['.timestamp', '[data-testid="user-id"]'],
  
  explorer: {
    maxDepth: 2,
    maxPages: 20,
    exclude: ['/logout', '/admin/*']
  },
  
  routes: [
    {
      path: '/dashboard',
      name: 'Dashboard',
      timezone: 'America/New_York',
      actions: [
        { type: 'click', selector: '.expand-menu' },
        { type: 'wait', timeout: 500 }
      ]
    }
  ]
});
```

## Output Structure

```
.argus/
├── baselines/    # Baseline screenshots (commit to git)
├── current/      # Current capture (gitignored)
├── diffs/        # Diff images (gitignored)
└── report/       # HTML report output
```

## GUI Application

Argus also includes a desktop GUI application built with [Electrobun](https://blackboard.sh/electrobun/docs/). The GUI wraps the CLI commands and provides a visual interface for running visual regression tests.

```bash
# Navigate to GUI directory
cd gui

# Install dependencies
bun install

# Run in development mode
npx electrobun dev

# Build for production
bun run build
```

## Development

```bash
# Install dependencies
bun install

# Run CLI directly
bun src/cli/index.ts --help

# Run tests
bun test

# Build
bun run build
```

## Tech Stack

- Runtime: Bun
- Browser Automation: Puppeteer-core
- Image Diffing: pixelmatch
- CLI: Commander
- GUI: Electrobun (WebView2)

## License

MIT
