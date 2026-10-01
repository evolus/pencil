# TASK-001: Triage, Scoring Rubric & Verification Harness Setup

## Metadata
- **Owner:** levantuan.itvn@gmail.com and Antigravity Agent
- **Branch:** `feature/quick-fix-backlog`
- **Parent Plan:** [.project-info/quick-fix-backlog/plans/master-plan.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/plans/master-plan.md)
- **Canonical Docs & Specs:** [.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/specs/quick-fix-triage-spec.md), [.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/adr/0001-quick-fix-strategy-and-batching.md)
- **Reference Codebase:** Entire repository (`app/`, `package.json`)

## Objective
Ingest and analyze **all 483 open issues** from `https://github.com/evolus/pencil/issues` (cross-referenced with all 50 open PRs), score them using the Quick-Win Rubric, extract the top 100 highest-value quick fixes, and establish the batching architecture.

## Acceptance Criteria
- [x] Ingest all 533 open items (483 issues + 50 PRs) from GitHub API into machine-readable JSON ledger (`scratch/all_open_issues.json`).
- [x] Cross-reference open community PRs with corresponding open issues.
- [x] Filter out commercial spam, website infrastructure issues, and massive architectural rewrites.
- [x] Score and rank all 483 issues strictly in **ascending order of effort / difficulty** (easiest to fix first), extracting the **Top 100 Quick-Win Issues** into `scratch/top_100_easiest_wins.json` and `scratch/top_100_easiest_table.md`.
- [x] Finalize `quick-fix-triage-spec.md` (v3.0.0) and `ADR-0001`.
- [x] Update Master Plan and backlog tasks 002–006.

## Implementation Steps
- [x] Step 1: Query GitHub API across all 6 pagination pages to fetch all 533 open items.
- [x] Step 2: Separate issues (483) from PRs (50) and identify community PR linkages.
- [x] Step 3: Implement multi-factor scoring function filtering spam and scoring quick-win attributes.
- [x] Step 4: Extract and catalog the Top 100 ranked quick-win issues.
- [x] Step 5: Document the triage specification and master plan.

## Session Notes & Progress Ledger
### 2026-10-01 (Session 2)
- **Verified:** Complete 483-issue backlog analyzed. Identified 282 actionable issues and 201 non-actionable/excluded items. Selected the Top 100 Quick Wins:
  - **Tier 1 (Instant Wins):** 25 issues (Score 60–140)
  - **Tier 2 (High-Impact Crashes & UI Fixes):** 42 issues (Score 40–55)
  - **Tier 3 (Moderate UI & Exporter Polish):** 33 issues (Score 25–35)
- **Docs Consulted:** `.project-info/INSTRUCTIONS.md`, GitHub API, `pencil-project-spec.md`.
- **Changes:** Updated `quick-fix-triage-spec.md` to v3.0.0, saved full machine-readable ledgers (`all_483_triaged.json`, `top_100_easiest_wins.json`, `top_100_easiest_table.md`).
- **Next:** User review and approval to retire Task 001 and activate Task 002.
