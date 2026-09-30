# Agent Governance & Continuity Protocol

## 1. Repository Charter (The North Star)

* **Repository:** Evolus Pencil Desktop Application
* **Core Mission:** Maintain, evolve, and enhance Evolus Pencil as a premier open-source GUI prototyping and diagramming tool. This includes supporting desktop features, runtime performance optimizations, stencil and icon catalog extensions, file format integrity (`.ep`, `.epgz`), and modern integrations (such as the Model Context Protocol server).
* **Guiding Invariants:**
  * Preserve core application stability, canvas responsiveness, and desktop UI integrity.
  * Ensure backward compatibility for document formats and stencil specifications.
  * Maintain clean architectural boundaries between core Electron runtime, UI views, internal APIs, and external tooling.

---

## 2. Multi-Feature & Initiative Governance Architecture

To ensure clean isolation and continuity across multiple parallel or sequential initiatives, `.project-info/` uses a **feature-segmented topology**. Each major feature or initiative lives in its own dedicated sub-folder within `.project-info/`.

```
.project-info/
├── INSTRUCTIONS.md               # [Read-Only] Umbrella governance protocol for the repository
├── local.env                     # [Mutable] Local machine and environment configurations
├── specs/                        # [Mutable] Repository-wide domain specifications
│   └── pencil-project-spec.md    # Definitive Pencil architecture, data formats & engine spec
│
├── mcp-implementation/           # Feature Initiative: Model Context Protocol Server
│   ├── adr/                      # Architectural Decision Records for MCP
│   ├── plans/                    # Master plans & phase roadmaps (master-plan.md)
│   ├── specs/                    # Feature specifications & tool contracts (mcp-server-spec.md)
│   ├── tasks/
│   │   ├── active/               # In-progress task (maximum 1 active per feature)
│   │   ├── backlog/              # Staged backlog tasks
│   │   └── completed/            # Archival ledger of completed tasks
│   ├── tests/                    # Verification scripts & test harnesses
│   └── scratch/                  # Scratch scripts and temporary prototypes
│
└── <future-feature-slug>/        # Template for any new feature (e.g., canvas-v2, export-figma)
    ├── adr/
    ├── plans/
    ├── specs/
    ├── tasks/ (active, backlog, completed)
    ├── tests/
    └── scratch/
```

---

## 3. Information Hierarchy & Authority Precedence

When researching how to implement a feature, resolve a problem, or structure components, strictly adhere to the **Normative Authority Precedence**:

```
1. Repository & Feature Specifications (.project-info/specs/, .project-info/<feature>/specs/, .project-info/<feature>/adr/)
   │
   ▼
2. Existing Codebase (app/pencil-core/, app/tools/, app/views/)
   │  (Descriptive: How the desktop application and internal services run right now)
   │
   ▼
3. External Official Standards (Model Context Protocol, Electron API, SVG/W3C Specs)
   │
   ▼
4. Existing/Created Documentation in this workspace
   (May be a result of previous sessions; always verify against code)
```

---

## 4. Session Lifecycle Protocols

### A. Session Startup (Mandatory Sequence)

1. **Absorb Core Context:** Read this file (`.project-info/INSTRUCTIONS.md`) to ground yourself in the **Repository Charter** and governance rules.
2. **Resolve Active Feature & Environment:**
   * Determine the target feature directory (e.g. `.project-info/mcp-implementation/`) from user instructions or git branch context (`git status`).
   * Inspect `.project-info/local.env` to resolve local ports and paths (e.g., `PENCIL_API_PORT`, `PENCIL_API_URL`).
3. **Locate Active Task:** Open the current task file in `.project-info/<feature>/tasks/active/`.
   * If ambiguous, ask the human which feature or task to resume.
   * If starting fresh, inspect `.project-info/<feature>/tasks/backlog/` or create a new active task.
4. **Ascend to Parent Plan:** Read the `Parent Plan` referenced in the active task metadata to verify milestone context and dependencies.
5. **Load Authoritative Context (Progressive Disclosure):**
   * Read *only* the specific local spec files (`.project-info/<feature>/specs/`) or ADRs referenced by the active task.
   * Do NOT scan or load unrelated codebase files into context.
6. **Emit Startup Statement:** Output exactly 3 points before executing work:
   * **Charter Anchor:** [1 sentence summarizing the active feature deliverable]
   * **Roadmap Position:** [Current phase/milestone from `<feature>/plans/<plan-name>.md`]
   * **Immediate Action:** [Task ID, active step, and exact first operation to perform]

---

### B. Session Teardown & Checkpointing

Execute before ending a session or exhausting context:

1. **Update Task Checklist:** Mark finished items as `[x]` in the active task file (`.project-info/<feature>/tasks/active/<task>.md`).
2. **Log Notes:** Append a dated entry under `## Session Notes` in the task file:
   * Verification evidence (exact tests run, commands executed, or physical checks).
   * Specs / code consulted to guide the implementation.
   * Blockers, edge cases discovered, or deviations from spec.
   * The immediate next step for the subsequent session.
3. **Persist Discoveries:**
   * Record durable architectural choices as new files in `.project-info/<feature>/adr/`.
   * Update living contracts, schemas, or models in `.project-info/<feature>/specs/`.
4. **User Review & Task Retirement:** A task must only be marked as completed and moved to `.project-info/<feature>/tasks/completed/` after explicit user review and approval:
   ```bash
   mv .project-info/<feature>/tasks/active/<task-file>.md .project-info/<feature>/tasks/completed/
   ```
5. **Master Plan Re-assessment (Horizon & Scope Alignment):**
   Upon completing a task or discovery phase, the agent MUST re-assess the parent plan (`.project-info/<feature>/plans/<plan-name>.md`). The discoveries and outputs of an executed task frequently alter the technical horizon, surface unanticipated constraints, or shift architectural assumptions, rendering downstream roadmap items partially or entirely obsolete. The agent must:
   * Evaluate downstream tasks, phase dependencies, and verification gates against newly established facts.
   * Proactively propose or execute required plan adjustments (pruning obsolete tasks, refactoring scopes, splitting complex deliverables, or inserting newly identified pre-requisites) rather than mechanically executing outdated plan items.
6. **Context Health & Session Boundary Assessment (Mandatory Before Next Task):**
   Before proposing to begin the next task in the roadmap, the agent MUST evaluate the current conversation context volume and explicitly advise the user whether to continue in the same conversation or create a new session:
   * **Evaluate Context Pressure:** Account for cumulative token load from viewed source code, schemas, and multi-step conversation transcripts.
   * **Default to New Session on Major Checkpoints:** Because `.project-info/<feature>/` holds all durable state (Master Plan, ADRs, Specs, Completed Tasks), resetting context at task boundaries prevents context overflow, prompt drift, and degradation.
   * **Output Session Continuity Statement:** Whenever a task is retired, output an explicit recommendation:
     * **If Context Pressure is High (or a major task finished):** Recommend creating a fresh conversation. Remind the user that all state is securely saved in `.project-info/`, and provide the standard startup prompt for the new session.
     * **If Context Pressure is Low:** Confirm context headroom is ample and explicitly ask the user for confirmation before activating the next task.

---

## 5. Starting a New Feature / Initiative

When beginning work on a new feature (e.g. `canvas-performance-v2`, `export-figma`):

1. **Create the Feature Sub-folder Topology:**
   ```bash
   mkdir -p .project-info/<feature-slug>/{adr,plans,specs,tasks/active,tasks/backlog,tasks/completed,tests,scratch}
   touch .project-info/<feature-slug>/tasks/completed/.gitkeep
   touch .project-info/<feature-slug>/tests/.gitkeep
   touch .project-info/<feature-slug>/scratch/.gitkeep
   ```
2. **Formulate the Master Plan:** Create `.project-info/<feature-slug>/plans/master-plan.md` using the **Plan File Template** below.
3. **Draft Initial Specs & ADRs:** Create living domain specifications in `specs/` and architectural choices in `adr/`.
4. **Decompose Initial Tasks:** Populate `tasks/active/task-001-<slug>.md` and staged backlog items in `tasks/backlog/`.

---

## 6. File Templates

### A. Task Template (`.project-info/<feature>/tasks/(active,backlog)/<id>-<slug>.md`)

```markdown
# [ID] Task Title

## Metadata
- **Owner:** <git-user-email> and Agent name (e.g., "levantuan.itvn@gmail.com and Antigravity Agent")
- **Branch:** [Git branch]
- **Parent Plan:** [.project-info/<feature>/plans/target-plan.md]
- **Canonical Docs & Specs:** [.project-info/<feature>/specs/example.md, .project-info/<feature>/adr/0001-example.md]
- **Reference Codebase:** [app/... paths]

## Objective
[1-3 sentences defining the exact deliverable and target state.]

## Acceptance Criteria
- [ ] Verifiable Criterion 1
- [ ] Verifiable Criterion 2

## Implementation Steps
- [ ] Step 1 (Analyze interfaces and schemas)
- [ ] Step 2 (Implement according to spec)
- [ ] Step 3 (Write verification tests)

## Session Notes & Progress Ledger
### YYYY-MM-DD (Session 1)
- **Verified:** [Test/command output or checks performed]
- **Docs Consulted:** [Specs/code referenced]
- **Changes:** [Files created/modified]
- **Next:** [Exact next action]
```

### B. Plan File Template (`.project-info/<feature>/plans/<slug>.md`)

```markdown
# Plan: [Feature / Initiative Name]

## 1. Scope & References
- **Owner:** <git-user-email> and Agent name (e.g., "levantuan.itvn@gmail.com and Antigravity Agent")
- **Objective:** [Macro deliverable]
- **Boundaries:** [Explicit exclusions]
- **Architecture References:** [Applicable standards, ADRs, and patterns]
- **Associated Specs:** [.project-info/<feature>/specs/...]
- **Associated ADRs:** [.project-info/<feature>/adr/...]

## 2. Dependency Graph & Critical Path
- Phase 1 must complete before Phase 2.
- Hard Verification Gates between phases.

## 3. Work Breakdown Structure (WBS)

### Phase 1: Foundation
- [ ] Task 001: Description (Spec: `specs/...`)
- [ ] Task 002: Description

### Phase 2: Implementation
- [ ] Task 010: Description

## 4. Phase Verification Gates
- **Phase 1 Exit Criteria:** [e.g., Core architecture verified, schemas defined]
- **Phase 2 Exit Criteria:** [e.g., End-to-end integration verified]
```

### C. ADR Template (`.project-info/<feature>/adr/<id>-<slug>.md`)

```markdown
# ADR-000X: [Short Title]

## Metadata
- **Status:** [Proposed | Approved | Superseded]
- **Date:** YYYY-MM-DD
- **Authors:** <git-user-email> and Agent name
- **Parent Plan:** [.project-info/<feature>/plans/target-plan.md]
- **Domain Specification:** [.project-info/<feature>/specs/example.md]

---

## 1. Context & Problem Statement
[Describe the context, motivation, and problem being solved.]

## 2. Decision Drivers
- [Driver 1]
- [Driver 2]

## 3. Considered Options
- **Option 1:** [Description]
- **Option 2:** [Description]

## 4. Decision & Rationale
[Explain why the chosen option was selected over others.]

## 5. Consequences & Guidance
- **Positive:** [Benefits]
- **Negative / Risks:** [Trade-offs and mitigations]
```

### D. Specification Template (`.project-info/<feature>/specs/<slug>.md`)

```markdown
# Specification: [Feature / Protocol Name]

## 1. Overview & Objective
[Detailed summary of the feature, contract, or schema.]

## 2. Architecture & Data Contracts
[JSON schemas, data formats, API endpoints, or tool signatures.]

## 3. Invariants & Error Handling
[Guarantees, edge cases, error codes, and recovery procedures.]

## 4. Verification Criteria
[How to prove compliance and correctness.]
```
