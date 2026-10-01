# TASK-003: Implement Tier 2 High-Impact Crash & Navigation Fixes

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `feature/quick-fix-backlog`
- **Parent Plan:** [.project-info/quick-fix-backlog/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md), [.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md)
- **Reference Codebase:** `app/views/common/AboutDialog.js`, `app/index.js`, `app/pencil-core/documentHandler.js`

## Objective
Implement Tier 2 quick fixes addressing abrupt application crashes, broken external links in desktop dialogs, temporary dump recovery, and command-line sandbox flag parsing.

## Acceptance Criteria
- [ ] **Fix #807:** Prevent abrupt crash on clicking "View full list of code contributors" in About dialog by opening the URL via `shell.openExternal`.
- [ ] **Fix #708:** Fix broken relative anchor links in Clickable Prototype HTML template export.
- [ ] **Fix #804:** Add user prompt or menu option to import temporary recovery files (`tmp.xml`) following an unexpected crash.
- [ ] **Fix #806:** Ensure `--no-sandbox` command-line switch passes cleanly to Electron on Termux/Linux environments.
- [ ] **Fix #775:** Fix unhandled exception during application close on macOS.

## Implementation Steps
- [ ] Step 1: Update About dialog contributor link to use `shell.openExternal` (#807).
- [ ] Step 2: Fix anchor URL resolution in HTML export template (#708).
- [ ] Step 3: Implement `tmp.xml` recovery importer (#804).
- [ ] Step 4: Handle `--no-sandbox` command-line switch in `app/index.js` (#806).
- [ ] Step 5: Test clean open/close life-cycle.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
