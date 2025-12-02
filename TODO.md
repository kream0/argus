# TODO - Argus Development Tasks

## 🎯 CURRENT PRIORITY: Phase 7 - Advanced Features

### Project Status
- **Phase:** 7 of 7 (Advanced Features)
- **Progress:** Phases 1-6 Complete ✅
- **Tests:** 102 passing
- **PRD:** ✅ Complete

---

## Phase 1: Project Setup & Foundation ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Initialize npm project with `package.json`
- [x] 2. Configure TypeScript (`tsconfig.json`)
- [x] 3. Set up ESLint and Prettier
- [x] 4. Create folder structure (src/, tests/, etc.)
- [x] 5. Create type definitions (`src/types/config.ts`)
- [x] 6. Set up Bun test runner
- [x] 7. Create basic CLI scaffold with commander

**Result:** CLI responds to `argus --help` ✅

---

## Phase 2: Configuration System ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Implement `defineConfig()` helper with Zod validation
- [x] 2. Create config file loader (TypeScript configs via Bun)
- [x] 3. Implement config validation with comprehensive error messages
- [x] 4. Create `argus init` command (generate argus.config.ts)
- [x] 5. Write tests for config loading and validation

**Result:** `argus init` generates valid `argus.config.ts` ✅

---

## Phase 3: Core Capture Engine ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Implement Playwright browser management
- [x] 2. Create screenshot capture with viewport support
- [x] 3. Implement timezone/locale context injection
- [x] 4. Add CSS animation disabling
- [x] 5. Implement dynamic content masking
- [x] 6. Add authentication handling
- [x] 7. Create `argus capture --baseline` command
- [x] 8. Write tests for capture engine

**Result:** Capture baseline screenshots for configured routes ✅

---

## Phase 4: Diffing & Comparison Engine ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Integrate pixelmatch for visual diffing
- [x] 2. Implement threshold-based comparison
- [x] 3. Create diff image generation
- [x] 4. Implement `argus compare` command
- [x] 5. Implement `argus approve` command
- [x] 6. Write tests for diffing logic

**Result:** Compare current vs baseline and generate diff images ✅

---

## Phase 5: Explorer Mode ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Implement link crawler/scraper
- [x] 2. Add URL deduplication and normalization
- [x] 3. Implement depth and page limits
- [x] 4. Add URL pattern exclusion (glob patterns)
- [x] 5. Create `argus explore <url>` command
- [x] 6. Write tests for explorer

**Result:** `argus explore http://localhost:3000` discovers and captures pages ✅

---

## Phase 6: Reporting ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Create HTML report template with interactive UI
- [x] 2. Implement side-by-side comparison view
- [x] 3. Add slider/overlay comparison mode
- [x] 4. Include metadata (browser, viewport, timestamp)
- [x] 5. Add JSON/JUnit output for CI
- [x] 6. Add `--junit` option to compare command
- [x] 7. Write tests for report generation (15 tests)

**Result:** Generate interactive HTML report + JSON + JUnit XML ✅

---

## Phase 7: Advanced Features ⬅️ CURRENT
**Estimated Time:** 6-10 hours

- [ ] 1. Add pre-screenshot actions (click, hover, wait, scroll, type, select)
- [ ] 2. Implement custom pre-scripts execution
- [ ] 3. Enhance concurrent capture with better queue management
- [ ] 4. Implement Git Mode comparison (`argus git-compare`)
- [ ] 5. Add CI/CD integration helpers (GitHub Actions example)
- [ ] 6. Performance optimization

**Goal:** Full feature parity with PRD requirements

---

## Backlog (Future Enhancements)
- [ ] Watch mode for development
- [ ] Visual diff sensitivity tuning UI
- [ ] Cloud storage for baselines
- [ ] Slack/Teams notifications
- [ ] Browser extension for manual capture

---

## Time Estimates Summary

| Phase     | Description          | Estimated Hours | Status     |
|-----------|----------------------|-----------------|------------|
| 1         | Project Setup        | 2-4             | ✅ Done     |
| 2         | Configuration System | 3-5             | ✅ Done     |
| 3         | Core Capture Engine  | 6-10            | ✅ Done     |
| 4         | Diffing & Comparison | 5-8             | ✅ Done     |
| 5         | Explorer Mode        | 4-6             | ✅ Done     |
| 6         | Reporting            | 4-6             | ✅ Done     |
| 7         | Advanced Features    | 6-10            | 🔄 Current |
| **Total** |                      | **30-49 hours** |            |

---

## Success Metrics (from PRD)
- [ ] Explorer Mode captures 20 pages in < 60 seconds
- [ ] False positives due to animations < 1%
- [ ] Setup time for new project < 5 minutes

---

**Next Session Goal:** Complete Phase 7 - Advanced Features
