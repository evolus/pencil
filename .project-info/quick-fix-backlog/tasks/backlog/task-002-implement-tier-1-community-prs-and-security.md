# TASK-002: Implement Tier 1 Community PRs & Critical Security Fixes

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `feature/quick-fix-backlog`
- **Parent Plan:** [.project-info/quick-fix-backlog/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md), [.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md)
- **Reference Codebase:** `app/views/common/PromptDialog.js`, `app/app.js`, `app/pencil-core/common/FontLoader.js`, `app/tools/export-html.js`

## Objective
Audit, adapt, and apply the top 8 Tier 1 quick-win fixes from community pull requests and critical security issues, resolving DOM XSS in `PromptDialog.js`, Linux splash screen hang, HTML export missing thumbnails, and shape alignment bugs.

## Acceptance Criteria
- [ ] **Fix #818:** Sanitize prompt message input in `app/views/common/PromptDialog.js` preventing arbitrary HTML execution.
- [ ] **Fix #821 / #820:** Expose renderer globals in `app/app.js` and add defensive check for `FontLoader.systemRepo` to resolve splash hang on Linux.
- [ ] **Fix #764 / #759:** Restore missing thumbnail generation during single web page / clickable prototype HTML exports.
- [ ] **Fix #713:** Prevent `NaN` image dimensions in HTML export output.
- [ ] **Fix #692:** Correct alignment calculation for dynamic width shapes.
- [ ] **Fix #798:** Use standard XDG user data path via Electron's `app.getPath("userData")`.
- [ ] **Fix #785:** Add Snap link to documentation.
- [ ] **Fix #819:** Ensure page names render reliably in clickable prototype navigation menus.

## Implementation Steps
- [ ] Step 1: Audit and apply security fix in `PromptDialog.js` (#818).
- [ ] Step 2: Implement Linux bootstrap and font loading safety checks (#821 / #820).
- [ ] Step 3: Patch HTML export thumbnail and scale NaN handlers (#764, #713, #819).
- [ ] Step 4: Apply stencil alignment calculation fix (#692).
- [ ] Step 5: Verify clean desktop launch and export output.

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
