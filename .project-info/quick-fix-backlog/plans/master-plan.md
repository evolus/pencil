# Plan: 100 Quick-Fix & Quick-Win Issue Backlog Resolution

## 1. Scope & References
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `feature/quick-fix-backlog`
- **Objective:** Systematically resolve the **100 easiest quick-fix / quick-win issues** from the entire 483 open issues backlog of Evolus Pencil (`https://github.com/evolus/pencil/issues`), strictly ordered from **lowest effort (1-line fixes, typos, broken links, community PRs) to moderate polish**, minimizing code modification and eliminating regression risk.
- **Boundaries:**
  - Preserve core `.ep` and `.epgz` file formats and backward compatibility.
  - Do not undertake broad architectural rewrites (such as multi-month i18n overhauls or cross-framework migrations).
  - Exclude external server infrastructure issues (e.g. `evolus.vn` SSL certificates), spam, and complex OS-specific GPU compositor crashes.
- **Architecture References:**
  - Pencil Desktop Core (`app/pencil-core/`, `app/views/ApplicationPane.js`, `app/index.js`)
  - Exporter Pipelines (`app/tools/export-html.js`, `app/views/canvasPool.js`)
  - Electron 16 Runtime & Packaging (`app/package.json`)
- **Associated Specs:**
  - [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md)
- **Associated ADRs:**
  - [.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md)

---

## 2. Dependency Graph & Critical Path

```
MILESTONE 1: TRIAGE & HARNESS SETUP
===================================
Phase 1: Ingest, Triage & Sort 483 Issues by Ease of Fix (Ascending Effort)
   │      (Full triage of all 483 issues + 50 PRs, sort easiest-first into top 100)
   ▼
[GATE 1 EXIT: Easiest-First Triage Approved, Regression Harness Ready]
   │
   ▼
MILESTONE 2: LEVEL 1 & 2 QUICK-WIN IMPLEMENTATION (1 - 10 LINES)
================================================================
Phase 2: Implement Level 1 Trivial 1-Line Fixes (Typos, Links, Wrappers)
   │      (#807 external link, #364 typo, #819 move 1-line callback, #708 anchor hash, #376 export typo, PR #818 DOM XSS)
   ▼
Phase 3: Implement Level 2 Community PR-Backed Micro-Fixes
   │      (#759 thumb PR #764, #599 bind(this) PR #600, #331 HTML PR #486, #494 argv PR #521, #174 XDG PR #798, #820 splash PR #821)
   ▼
[GATE 2 EXIT: All Level 1 & 2 Micro-Fixes Verified against Live App]
   │
   ▼
MILESTONE 3: LEVEL 3 & 4 LOCALIZED POLISH & RELEASE (10 - 25 LINES)
===================================================================
Phase 4: Implement Level 3 Localized Component & Inspector Fixes
   │      (#738 left-handed shortcuts, #716 boolean stencil property, #645 case-insensitive image generator, #365 short hex)
   ▼
Phase 5: Implement Level 4 Exporter & Canvas Polish Fixes
   │      (HTML preview scaling, SVG dimension attributes, table cell padding, clip bounds)
   ▼
Phase 6: Full Regression Verification, Packaging & Release Ledger
   │      (Cross-platform boot verification, clean build, packaging check, changelog update)
   ▼
[GATE 3 EXIT: 100 Easiest Fixes Completed, Packaging Green]
```

---

## 3. Work Breakdown Structure (WBS)

### Milestone 1: Triage & Harness Setup

#### Phase 1: Ingest, Triage & Sort 483 Issues by Ease of Fix
- [ ] **Task 001:** Ingest all 483 open issues and rank the 100 easiest quick-wins (`.project-info/quick-fix-backlog/tasks/active/task-001-triage-and-batch-top-quick-fixes.md`):
  - Ingest all 533 open items (483 issues + 50 PRs) from GitHub API.
  - Apply the Ease-of-Fix rubric (Level 1: 1 line, Level 2: 1–5 lines, Level 3: 5–15 lines, Level 4: 15–25 lines).
  - Exclude spam, external web certs, usage questions, and deep OS compositor bugs.
  - Generate full 100-row markdown ledger in `scratch/top_100_easiest_table.md`.

---

### Milestone 2: Level 1 & 2 Quick-Win Implementation (1 - 10 Lines)

#### Phase 2: Implement Level 1 Trivial 1-Line Fixes (Typos, Links, Wrappers)
- [ ] **Task 002:** Implement Level 1 trivial 1-line fixes (`.project-info/quick-fix-backlog/tasks/backlog/task-002-implement-tier-1-community-prs-and-security.md`):
  - **Issue #807:** Wrap GitHub contributor link with `shell.openExternal` in `AboutDialog.js` (1 line).
  - **Issue #364:** Fix small typo in UI string (1 line).
  - **Issue #819:** Move `imageWrapper.appendChild(name)` outside `buildThumbnail` callback in HTML export template (1 line).
  - **Issue #708:** Fix relative anchor link hash resolution in Clickable Prototype HTML template (1–2 lines).
  - **Issue #376:** Correct misspelled export notification toast ("exprted" $\rightarrow$ "exported") (1 line).
  - **PR #818:** Security: Replace `innerHTML` with `textContent` in `PromptDialog.js` (1 line).
  - **PR #551 & PR #450:** Fix typos in `ProgressiveJobDialog.js` and export messages (1 line each).

#### Phase 3: Implement Level 2 Community PR-Backed Micro-Fixes
- [ ] **Task 003:** Audit and merge Level 2 community PR-backed fixes (`.project-info/quick-fix-backlog/tasks/backlog/task-003-implement-tier-2-crash-and-bootstrap-fixes.md`):
  - **Issue #599:** Add missing `.bind(this)` in document loader (PR #600 — 1 line).
  - **Issue #331:** Preserve HTML content in table cell DOM generator (PR #486 — 2 lines).
  - **Issue #365:** Support 3-digit short hex color expansion in `Color.js` (PR #375 — 3 lines).
  - **Issue #174:** Standardize XDG config directory storage via `app.getPath("userData")` (PR #798 — 4 lines).
  - **Issue #494:** Forward startup file arguments to open double-clicked files in Windows Explorer (PR #521 — 5 lines).
  - **Issue #759:** Restore thumbnail generation in single web page HTML export (PR #764 — 6 lines).
  - **Issue #820:** Expose renderer globals and add defensive `FontLoader` guard to fix Linux splash hang (PR #821 — 8 lines).

---

### Milestone 3: Level 3 & 4 Localized Polish & Release (10 - 25 Lines)

#### Phase 4: Implement Level 3 Localized Component & Inspector Fixes
- [ ] **Task 004:** Implement Level 3 localized component fixes (`.project-info/quick-fix-backlog/tasks/backlog/task-004-audit-and-apply-tier-3-dependency-bumps.md`):
  - **Issue #738:** Add alternative keymap bindings for left-handed canvas navigation.
  - **Issue #716:** Register boolean property editor component in property inspector registry.
  - **Issue #645:** Use case-insensitive file extension comparison in Stencil Generator.
  - **Issue #446:** Alphabetical sorting of "Link to" page menu items.
  - **Issue #592:** Guard against undefined path when unlinking temporary bitmap.

#### Phase 5: Implement Level 4 Exporter & Canvas Polish Fixes
- [ ] **Task 005:** Implement Level 4 exporter and canvas polish (`.project-info/quick-fix-backlog/tasks/backlog/task-005-implement-tier-4-canvas-and-exporter-polish.md`):
  - Resolve HTML export thumbnail scaling, SVG dimension attributes, and table cell padding.
  - Verify clean rendering across standard stencil collections.

#### Phase 6: Full Regression Verification, Packaging & Release Ledger
- [ ] **Task 006:** Full regression verification and release closeout (`.project-info/quick-fix-backlog/tasks/backlog/task-006-verification-regression-testing-and-release.md`):
  - Run full application smoke test: boot, new document, drawing, stencil drop, save `.epgz`, open, export HTML/PNG/PDF.
  - Verify `npm run pack` / `npm run dist:linux` build successfully.
  - Compile final release ledger mapping all 100 resolved GitHub issues.

---

## 4. Phase Verification Gates

- **Gate 1 (Milestone 1 Exit - Easiest-First Triage Approved):**
  - [x] All 483 open issues analyzed and sorted strictly in ascending effort order.
  - [x] Living specification `quick-fix-triage-spec.md` updated to v3.0.0.
- **Gate 2 (Milestone 2 Exit - Level 1 & 2 Micro-Fixes Verified):**
  - [ ] All Level 1 trivial fixes and Level 2 community PRs applied and tested.
  - [ ] Zero regressions in application startup, document save/load, or dialogs.
- **Gate 3 (Milestone 3 Exit - Full 100-Issue Release Validation):**
  - [ ] Application builds and packages cleanly across platforms (`electron-builder`).
  - [ ] 100-issue ledger completed and documented.
