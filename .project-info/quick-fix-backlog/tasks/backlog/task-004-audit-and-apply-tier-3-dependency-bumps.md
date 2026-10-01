# TASK-004: Audit & Apply Tier 3 Dependency Security Bumps

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `feature/quick-fix-backlog`
- **Parent Plan:** [.project-info/quick-fix-backlog/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md), [.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md)
- **Reference Codebase:** `package.json`, `app/package.json`

## Objective
Audit the 16 Dependabot dependency bump pull requests against Electron 16 and Node 16 compatibility, applying safe non-breaking security updates while rejecting or pinning updates that drop Node 16 support.

## Acceptance Criteria
- [ ] Audit dependency bumps: #698 (`path-parse`), #700 (`tar`), #706 (`chownr`), #707 (`ajv`), #718 (`async`), #734 (`moment`), #737 (`jszip`), #748 (`yargs-parser`), #749 (`y18n`), #751 (`jpeg-js`).
- [ ] Confirm no bumped dependency introduces pure ESM that breaks CommonJS `require()` in renderer or main processes.
- [ ] Confirm `npm install` and `yarn install-app-deps` succeed without errors.
- [ ] Verify application boots cleanly and file I/O operations (zip, tar, config) function properly.

## Implementation Steps
- [ ] Step 1: Review each Dependabot PR diff and changelog.
- [ ] Step 2: Update dependencies in `package.json` and `app/package.json`.
- [ ] Step 3: Run dependency rebuild and verify lockfile consistency.
- [ ] Step 4: Execute smoke tests on document archive compression (`.epgz`).

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:**
- **Docs Consulted:**
- **Changes:**
- **Next:**
