# ADR-0001: Quick-Fix Prioritization, Tiered Batching & Regression Guardrails

## Metadata
- **Status:** Approved
- **Date:** 2026-10-01
- **Authors:** levantuan.itvn@gmail.com and Antigravity Agent
- **Parent Plan:** [.project-info/quick-fix-backlog/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/plans/master-plan.md)
- **Domain Specification:** [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md)

---

## 1. Context & Problem Statement

The open-source issue backlog at `https://github.com/evolus/pencil/issues` contains hundreds of historical and active items. A naive FIFO (First-In, First-Out) or chronological approach results in getting bogged down in stale dependency conflicts, massive architectural requests (e.g. multi-month i18n overhauls), or un-reproducible environment issues.

We need a disciplined, high-velocity methodology to extract, batch, implement, and verify the top 100 issues prioritizing **immediate quick wins**—fixes with minimal lines of change, pre-existing community PRs, critical security vulnerabilities, and crash-on-launch blockers.

---

## 2. Decision Drivers

1. **Maximum User-Facing Value per Code Line:** Prioritize fixes where 1–10 lines of code resolve a complete crash or visual failure.
2. **Community PR Leverage:** Adopt and audit existing open community pull requests (#818, #821, #764, #713, #692, #798) that have already done root cause analysis.
3. **Regression Isolation:** Ensure quick fixes are applied in small, atomic batches with strict automated and manual verification gates.
4. **Preservation of Core Invariants:** Guarantee zero breaking changes to `.epgz` / `.ep` document schemas or Electron 16 runtime compatibility.
5. **Clear Non-Actionable Boundary:** Explicitly exclude empty spam, third-party infrastructure failures (e.g. evolus.vn web certs), and out-of-scope architectural rewrites from the quick-fix queue.

---

## 3. Considered Options

### Option A: Monolithic "Fix All 100" Refactor Branch
Attempt to pull and resolve all 100 items simultaneously in a massive sweeping commit or long-running branch.
- *Downsides:* High probability of regressions; impossible to isolate failures; dependency conflicts block trivial UI fixes; hard to review.

### Option B: Chronological Order (Fix Oldest to Newest)
Address issues sequentially starting from issue #687 up to #821.
- *Downsides:* Early issues contain massive scope ("update all shapes", old Gtk3 issues) that stall progress; modern high-impact fixes (e.g. Linux bootstrap #821, DOM XSS #818) would be delayed indefinitely.

### Option C: Tiered Quick-Win Phased Batching (Chosen)
Triage all 100 items into 5 scored tiers based on effort vs. impact. Execute them in progressive milestone phases:
- **Phase 1:** Triage & Batch Planning.
- **Phase 2 (Tier 1):** Community PRs & Security Quick Wins (8 items).
- **Phase 3 (Tier 2):** High-Impact Crashes & Navigation/UI Fixes (18 items).
- **Phase 4 (Tier 3):** Safe Dependency & Security Bumps (16 items).
- **Phase 5 (Tier 4):** Canvas, Stencils & Exporter Polish (53 items).
- **Phase 6:** End-to-End Verification & Release Readiness.

---

## 4. Decision & Rationale

We choose **Option C (Tiered Quick-Win Phased Batching)**:
1. **Immediate Momentum:** Resolving Tier 1 immediately fixes critical security vulnerabilities (XSS in `PromptDialog.js`), fixes splash screen hangs on Linux, and cures missing thumbnails in HTML exports.
2. **Defensive Verification:** Grouping fixes into logical domains ensures that exporter fixes don't interact unexpectedly with window management or font loading.
3. **Traceability:** Every issue resolved maps directly to a checklist item in the parent plan and task ledger.

---

## 5. Consequences & Guidance

1. **Commit Hygiene:** Each quick fix within a batch must be committed as a clean atomic commit referencing its GitHub issue number (e.g., `fix(security): sanitize message in PromptDialog (fixes #818)`).
2. **PR Auditing Rules:** When incorporating community PRs, the code must be audited against our repository standards, tested locally, and adapted to current `master` rather than blindly merged.
3. **Dependency Caution:** Dependabot updates in Tier 3 must be validated against `electron-builder` and Electron 16 native module builds before merging.
