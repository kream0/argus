# Product Requirements Document: Argus (Visual & Regression Engine)

| Document Details |                                                 |
|:-----------------|:------------------------------------------------|
| **Project Name** | Argus (Internal Working Title)                  |
| **Version**      | 1.0.0                                           |
| **Status**       | Draft                                           |
| **Based On**     | Internal Migration Tooling (Date-fns/Moment.js) |

## 1. Executive Summary
**Argus** is a CLI-based automated regression testing tool designed to detect visual (pixel-accurate) and structural (DOM/CSS) changes across web applications. Unlike the previous ad-hoc scripts used for specific migrations, Argus is agnostic to the underlying code changes. It empowers developers and QA engineers to generate baselines and compare application states using two primary methods: an autonomous "Explorer Mode" that crawls the application, and a declarative "Config Mode" for specific user-defined routes.

## 2. Problem Statement
Current regression testing requires writing bespoke Playwright scripts for every new project or feature branch. This leads to:
1.  **High Maintenance:** Test scripts are brittle and duplicated across repositories.
2.  **Inconsistent Coverage:** Edge cases (like timezones or specific viewports) are often missed in manual testing.
3.  **Visual Blindness:** Standard E2E tests check functionality but miss CSS regressions or layout shifts.

## 3. Core Features

### 3.1. Dual Operation Modes

#### A. Explorer Mode (Auto-Discovery)
*   **Goal:** Zero-config "smoke test" for visual regression.
*   **Function:** The tool starts at a provided `baseUrl`, scrapes all internal links (`<a>` tags), removes duplicates, and generates a sitemap. It then captures screenshots of the first $N$ unique pages found.
*   **Controls:** Configurable depth limit, page limit, and URL pattern exclusion (regex).

#### B. User-Defined Mode (Declarative)
*   **Goal:** Targeted testing of critical paths and edge cases.
*   **Function:** Reads a configuration file defining specific routes, viewport sizes, and interaction scenarios.
*   **Capabilities:** specific pre-screenshot interactions (clicking, hovering), and state injection.

### 3.2. Hybrid Diffing Engine
The tool will perform two layers of analysis per capture:
1.  **Pixel-Accurate Visual Diff:**
    *   Uses a threshold-based comparison (default: 0.1%).
    *   Generates "Diff," "Baseline," and "Current" images.
    *   *Derived from:* `scripts/compare-with-baseline.js`.
2.  **DOM & CSS Diff (Optional):**
    *   Captures the Computed Style and DOM Tree hash.
    *   Alerts if the visual look is identical but underlying markup has drastically changed (invisible regressions).

### 3.3. Environment & State Control
*   **Timezone & Locale Mocking:** Ability to force the browser context into specific timezones (e.g., UTC, America/New_York) before rendering.
    *   *Derived from:* `fixtures/date-scenarios.ts` and `utils/timezone-helpers.ts`.
*   **Dynamic Data Masking:** precise selectors to mask (black out) before screenshotting (e.g., timestamps, session IDs).
    *   *Derived from:* `utils/screenshot-utils.ts`.

## 4. Functional Requirements

### 4.1. CLI Commands

| Command                    | Description                                                                                       |
|:---------------------------|:--------------------------------------------------------------------------------------------------|
| `argus init`               | Generates a default `argus.config.ts` in the current project.                                     |
| `argus capture --baseline` | Runs the defined suite and saves images to the `baseline/` directory.                             |
| `argus compare`            | Runs the suite, captures `current/` images, compares against `baseline/`, and generates a report. |
| `argus explore <url>`      | Runs Explorer Mode against a specific URL instantly without config.                               |
| `argus approve`            | Promotes current images to baseline (overwrites).                                                 |

### 4.2. Configuration File (`argus.config.ts`)
The tool must support a strictly typed configuration file.

```typescript
export default defineConfig({
  baseUrl: 'http://localhost:4200',
  // Global settings
  viewports: [{ width: 1920, height: 1080 }, { width: 375, height: 667 }],
  concurrency: 4,
  
  // Auth configuration (Derived from utils/auth-helpers.ts)
  auth: {
    loginUrl: '/login',
    usernameSelector: '#email',
    passwordSelector: '#pwd',
    credentials: { username: process.env.TEST_USER, password: process.env.TEST_PASS },
    postLoginSelector: '.dashboard-visible'
  },

  // Masking dynamic content (Derived from utils/screenshot-utils.ts)
  globalMask: ['.timestamp', '[data-testid="user-id"]'],

  // Mode settings
  explorer: {
    maxDepth: 2,
    maxPages: 20,
    exclude: ['/logout', '/admin/*']
  },

  // User-defined routes
  routes: [
    {
      path: '/dashboard',
      name: 'Dashboard - NY Time',
      timezone: 'America/New_York', // Context specific overrides
      actions: [
        { type: 'click', selector: '.expand-menu' },
        { type: 'wait', timeout: 500 }
      ]
    },
    {
      path: '/reports',
      name: 'Reports - Dark Mode',
      preScript: './scripts/enable-dark-mode.js' // Execute custom JS before shot
    }
  ]
});
```

### 4.3. Reporting
*   **HTML Report:** An interactive static HTML file showing side-by-side comparisons with a "slider" view.
*   **Metadata:** The report must include the browser version, viewport size, and detected DOM differences alongside the visual diff.
*   **JUnit/JSON:** Output support for CI/CD integration.

## 5. Technical Architecture

### 5.1. Core Technology Stack
*   **Engine:** Playwright (Node.js). chosen for its native ability to handle timezones, locales, and reliable screenshots.
*   **Diffing:** `pixelmatch` (for images) and `jest-diff` (for serialized DOM snapshots).
*   **CLI:** `commander` or `yargs`.

### 5.2. Folder Structure (Generated in User Project)
When a user installs Argus, the following structure is created, abstracting the complexity seen in the source tool:

```text
.argus/
├── baselines/           # Committed to Git (or LFS)
│   ├── dashboard-desktop-ny.png
│   └── settings-mobile-utc.png
├── current/             # Gitignored, transient
├── diffs/               # Gitignored, artifacts of failure
├── scripts/             # Custom pre-interaction scripts
│   └── set-local-storage.ts
└── report/              # HTML report output
argus.config.ts          # Main configuration
```

### 5.3. Comparison Logic
1.  **Setup:** Launch Browser Context with specific `timezoneId`, `locale`, and `storageState` (Auth).
2.  **Navigation:** Go to URL.
3.  **Sanitization:**
    *   Inject custom CSS (disable animations/transitions).
    *   Apply masking (draw black boxes over dynamic selectors).
4.  **Capture:** Take screenshot + Serialize DOM (stripping attributes like IDs if configured).
5.  **Compare:**
    *   If `baseline` doesn't exist → Fail (or Warn if `--update-missing` flag is passed).
    *   Compare pixels. If mismatch > `threshold` → Mark Failed.
    *   Compare DOM. If mismatch > structural tolerance → Mark Warning.

## 6. User Flows

### Flow 1: The "Git Mode" Comparison (Manual Trigger)
*   *Based on `scripts/compare-branches-manual.js`*
1.  Developer runs `argus git-compare feature-branch develop`.
2.  Argus creates a temporary worktree for `develop`.
3.  Argus spins up the app in the background (using `npm start` command from config).
4.  Captures baselines from `develop`.
5.  Switches to `feature-branch`.
6.  Captures current state.
7.  Generates report.

### Flow 2: CI/CD Integration
1.  GitHub Action triggers on PR.
2.  Retrieves cached baselines from main branch artifact or LFS.
3.  Runs `argus compare`.
4.  If diff detected:
    *   Uploads diff images as artifacts.
    *   Posts a comment on PR with summary ("3 Visual Regressions Detected").


## 8. Success Metrics
*   **Speed:** "Explorer Mode" should capture 20 pages in < 60 seconds (parallelized).
*   **Accuracy:** False positives due to animations or cursors should be < 1% (requires strict CSS injection).
*   **Usability:** Setup time for a new project should be < 5 minutes (`npm install` -> `argus init` -> `argus explore`).