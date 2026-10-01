# Specification: Quick-Fix & Quick-Win Backlog Triage Specification

## Status: Approved (Normative)
- **Document Version:** 3.0.0
- **Authors:** levantuan.itvn@gmail.com and Antigravity Agent
- **Target Initiative:** `quick-fix-backlog`
- **Core Principle:** **Strict Ascending Effort Order (Easiest to Fix First)**
- **Source Universe:** [Evolus Pencil GitHub Issues](https://github.com/evolus/pencil/issues) (All 483 open issues + 50 open PRs)

---

## 1. Executive Summary & Philosophy: "Easiest to Fix First"

In this initiative, **Quick-Fix / Quick-Win is defined strictly by Ease of Implementation (Lowest Effort, Smallest Code Modification, and Shortest Resolution Time)**.

Complex crashes requiring deep platform-dependent C++/GPU compositor debugging (e.g. Debian SIGTRAP, NixOS compositor crashes) are deliberately deprioritized. Instead, issues are ranked in strict ascending order of effort:
1. **Effort Level 1 (Trivial 1-Line Fixes):** Typo corrections in UI strings, broken link updates in dialogs, and 1-line event/callback moves (Effort: ~1–5 minutes, ~1 line of code).
2. **Effort Level 2 (Community PR-Backed Micro-Fixes):** Pre-written, pre-tested community pull requests addressing specific bugs (Effort: ~5–10 minutes, ~1–5 lines of code).
3. **Effort Level 3 (Small Localized Component Fixes):** Isolated null guards, case sensitivity fixes, single shortcut additions, and small property inspector bindings (Effort: ~10–20 minutes, ~3–10 lines of code).
4. **Effort Level 4 (Moderate Component & Exporter Polish):** Self-contained exporter scaling tweaks, thumbnail generation, and table cell formatting (Effort: ~20–35 minutes, ~10–20 lines of code).

---

## 2. Ease-of-Fix Scoring Rubric & Tier Taxonomy

$$\text{EaseScore} = (6 - \text{EffortLevel}) \times 200 - \text{EstMinutes} + \text{PRBonus}(50) - \text{Penalties}$$

| Tier / Effort Level | Classification | Est. Lines | Est. Time | Focus & Scope |
|---|---|---|---|---|
| **Tier 1: Trivial 1-Line Fixes** | Typos, Links, 1-Line Callbacks | ~1 line | ~5 mins | Pure string typos, broken URLs, wrapping external links in `shell.openExternal`. |
| **Tier 2: PR-Ready Micro Fixes** | Community PRs & Keymaps | ~1–5 lines | ~10–15 mins | Open community PRs with verified diffs (binding fixes, short hex colors, argument loading). |
| **Tier 3: Small Localized Fixes** | Null Guards, Case Sensitivity | ~3–10 lines | ~15–20 mins | Isolated null checks, case-insensitive image loaders, inspector property types. |
| **Tier 4: Exporter & Canvas Polish** | Geometry rounding, Preview | ~10–20 lines | ~20–35 mins | Exporter thumbnail scaling, SVG dimensions, clip bounds. |
| **Tier 5: Excluded from Top 100** | Spam, Questions, Hard OS Crashes | N/A | N/A | Unreproducible GPU driver crashes, spam advertisements, usage inquiries. |

---

## 3. Top 15 Easiest Wins in the Entire 483-Issue Backlog

| Rank | Issue | Title | Effort Level | Est. Lines | Est. Time | Concrete Solution |
|---|---|---|---|---|---|---|
| **1** | [#807](https://github.com/evolus/pencil/issues/807) | Pencil terminates abruptly clicking About > Contributors | Level 1: Trivial | ~1 line | ~5m | Wrap external GitHub contributor link in `shell.openExternal()` in `AboutDialog.js`. |
| **2** | [#364](https://github.com/evolus/pencil/issues/364) | Small typo on site / UI | Level 1: Trivial | ~1 line | ~5m | Fix typo in UI notification / dialog string. |
| **3** | [#819](https://github.com/evolus/pencil/issues/819) | Navigation Menu doesn't show Page Name | Level 1: Trivial | ~1 line | ~5m | Move `imageWrapper.appendChild(name)` outside `buildThumbnail` callback in HTML exporter. |
| **4** | [#708](https://github.com/evolus/pencil/issues/708) | Broken links in Clickable Prototype HTML Template | Level 1: Trivial | ~1–2 lines | ~5m | Correct anchor hash prefix in exported navigation links. |
| **5** | [#376](https://github.com/evolus/pencil/issues/376) | Typo on notification after exporting page to PNG | Level 1: Trivial | ~1 line | ~5m | Fix typo in export completion notification toast ("exprted" $\rightarrow$ "exported"). |
| **6** | [#759](https://github.com/evolus/pencil/issues/759) | HTML export missing thumbnails | Level 2: PR Ready | ~5 lines | ~10m | Merge [PR #764](https://github.com/evolus/pencil/pull/764): restore thumbnail rendering pipeline in `export-html.js`. |
| **7** | [#599](https://github.com/evolus/pencil/issues/599) | Can't open ep file | Level 2: PR Ready | ~1 line | ~10m | Merge [PR #600](https://github.com/evolus/pencil/pull/600): add missing `.bind(this)` in document loader callback. |
| **8** | [#331](https://github.com/evolus/pencil/issues/331) | "Use HTML Content" in table doesn't render | Level 2: PR Ready | ~2 lines | ~10m | Merge [PR #486](https://github.com/evolus/pencil/pull/486): set `innerHTML` on table cell DOM element. |
| **9** | [#494](https://github.com/evolus/pencil/issues/494) | Unable to open files by double-clicking in explorer | Level 2: PR Ready | ~5 lines | ~10m | Merge [PR #521](https://github.com/evolus/pencil/pull/521): forward startup file argument to document handler. |
| **10** | [#174](https://github.com/evolus/pencil/issues/174) | Move config directory from `.pencil` to `.config/pencil` | Level 2: PR Ready | ~4 lines | ~10m | Merge [PR #798](https://github.com/evolus/pencil/pull/798): use standard `app.getPath("userData")`. |
| **11** | [#820](https://github.com/evolus/pencil/issues/820) | Linux bootstrap leaves renderer stuck on splash | Level 2: PR Ready | ~8 lines | ~10m | Merge [PR #821](https://github.com/evolus/pencil/pull/821): expose missing globals and defensive `FontLoader` guard. |
| **12** | [#365](https://github.com/evolus/pencil/issues/365) | Support short hex color code | Level 2: PR Ready | ~3 lines | ~10m | Merge [PR #375](https://github.com/evolus/pencil/pull/375): expand 3-digit hex codes (`#fff`) in `Color.js`. |
| **13** | [#738](https://github.com/evolus/pencil/issues/738) | Left Handed Shortcuts | Level 2: Localized | ~5 lines | ~15m | Add alternative keymap bindings for left-handed canvas navigation. |
| **14** | [#716](https://github.com/evolus/pencil/issues/716) | Bool stencil property not displaying in property grid | Level 2: Localized | ~5 lines | ~15m | Register boolean property editor component in property inspector registry. |
| **15** | [#645](https://github.com/evolus/pencil/issues/645) | Stencil generator loading images is case sensitive | Level 3: Localized | ~2 lines | ~15m | Add `.toLowerCase()` to file extension comparison in stencil generator. |

---

## 4. Companion PR Instant Wins (Direct PRs)

In addition to issues, several community PRs provide standalone 1-line fixes:
* **[PR #818](https://github.com/evolus/pencil/pull/818):** Security: DOM XSS in `PromptDialog.js` (`this.message.textContent = msg` — 1 line!).
* **[PR #551](https://github.com/evolus/pencil/pull/551):** Fix typo in `ProgressiveJobDialog.js` (1 line!).
* **[PR #450](https://github.com/evolus/pencil/pull/450):** Fix typo in "exported" (1 line!).
* **[PR #518](https://github.com/evolus/pencil/pull/518):** Fix minor typo (1 line!).
* **[PR #497](https://github.com/evolus/pencil/pull/497):** Correcting typo (1 line!).
* **[PR #446](https://github.com/evolus/pencil/pull/446):** Sort "Link to" page menu items alphabetically (2 lines!).
* **[PR #665](https://github.com/evolus/pencil/pull/665):** Trim whitespace (1 line!).
* **[PR #785](https://github.com/evolus/pencil/pull/785):** Add link to Snap package in README (1 line!).

---

## 5. Master Triage Ledger Location

The full 100-issue catalog sorted in **strict ascending effort order** is maintained in:
- Markdown Table: [.project-info/quick-fix-backlog/scratch/top_100_easiest_table.md](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/scratch/top_100_easiest_table.md)
- Machine-Readable JSON: [.project-info/quick-fix-backlog/scratch/top_100_easiest_wins.json](file:///home/ltuan/storage/pencil/.project-info/quick-fix-backlog/scratch/top_100_easiest_wins.json)
