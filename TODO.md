# TODO - Argus Development Tasks

## 🎯 CURRENT PRIORITY: Phase 2 - Configuration System

### Project Status
- **Phase:** 2 of 7 (Configuration System)
- **Progress:** Phase 1 Complete ✅
- **Tests:** 8 passing
- **PRD:** ✅ Complete

---

## Phase 1: Project Setup & Foundation ✅ COMPLETE
**Completed:** December 2, 2025

- [x] 1. Initialize npm project with `package.json`
- [x] 2. Configure TypeScript (`tsconfig.json`)
- [x] 3. Set up ESLint and Prettier
- [x] 4. Create folder structure (src/, tests/, etc.)
- [x] 5. Create type definitions (`src/types/config.ts`)
- [x] 6. Set up Vitest for testing
- [x] 7. Create basic CLI scaffold with commander

**Result:** CLI responds to `argus --help` ✅

---

## Phase 2: Configuration System ⬅️ CURRENT
**Estimated Time:** 3-5 hours

- [ ] 1. Implement `defineConfig()` helper with Zod validation
- [ ] 2. Create config file loader (TypeScript configs via jiti/tsx)
- [ ] 3. Implement config validation with comprehensive error messages
- [ ] 4. Create `argus init` command (generate argus.config.ts)
- [ ] 5. Write tests for config loading and validation

**Goal:** `argus init` generates a valid `argus.config.ts`

---

## Phase 3: Core Capture Engine (0%)
**Estimated Time:** 6-10 hours

- [ ] 1. Implement Playwright browser management
- [ ] 2. Create screenshot capture with viewport support
- [ ] 3. Implement timezone/locale context injection
- [ ] 4. Add CSS animation disabling
- [ ] 5. Implement dynamic content masking
- [ ] 6. Add authentication handling
- [ ] 7. Create `argus capture --baseline` command
- [ ] 8. Write tests for capture engine

**Goal:** Capture baseline screenshots for configured routes

---

## Phase 4: Diffing & Comparison Engine (0%)
**Estimated Time:** 5-8 hours

- [ ] 1. Integrate pixelmatch for visual diffing
- [ ] 2. Implement threshold-based comparison
- [ ] 3. Add DOM/CSS diffing (optional layer)
- [ ] 4. Create diff image generation
- [ ] 5. Implement `argus compare` command
- [ ] 6. Implement `argus approve` command
- [ ] 7. Write tests for diffing logic

**Goal:** Compare current vs baseline and generate diff images

---

## Phase 5: Explorer Mode (0%)
**Estimated Time:** 4-6 hours

- [ ] 1. Implement link crawler/scraper
- [ ] 2. Add URL deduplication and normalization
- [ ] 3. Implement depth and page limits
- [ ] 4. Add URL pattern exclusion (regex)
- [ ] 5. Create `argus explore <url>` command
- [ ] 6. Write tests for explorer

**Goal:** `argus explore http://localhost:3000` discovers and captures pages

---

## Phase 6: Reporting (0%)
**Estimated Time:** 4-6 hours

- [ ] 1. Create HTML report template
- [ ] 2. Implement side-by-side comparison view
- [ ] 3. Add slider/overlay comparison mode
- [ ] 4. Include metadata (browser, viewport, DOM diff)
- [ ] 5. Add JSON/JUnit output for CI
- [ ] 6. Write tests for report generation

**Goal:** Generate interactive HTML report with visual comparisons

---

## Phase 7: Advanced Features (0%)
**Estimated Time:** 6-10 hours

- [ ] 1. Add pre-screenshot actions (click, hover, wait)
- [ ] 2. Implement custom pre-scripts
- [ ] 3. Add concurrent capture support
- [ ] 4. Implement Git Mode comparison (`argus git-compare`)
- [ ] 5. Add CI/CD integration helpers
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

| Phase | Description | Estimated Hours |
|-------|-------------|-----------------|
| 1 | Project Setup | 2-4 |
| 2 | Configuration System | 3-5 |
| 3 | Core Capture Engine | 6-10 |
| 4 | Diffing & Comparison | 5-8 |
| 5 | Explorer Mode | 4-6 |
| 6 | Reporting | 4-6 |
| 7 | Advanced Features | 6-10 |
| **Total** | | **30-49 hours** |

---

## Success Metrics (from PRD)
- [ ] Explorer Mode captures 20 pages in < 60 seconds
- [ ] False positives due to animations < 1%
- [ ] Setup time for new project < 5 minutes

---

**Next Session Goal:** Complete Phase 1 - Project Setup & Foundation
