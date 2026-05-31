# Word Sounds — Clinical-Label Relabeling Inventory

**Target file:** [`word_sounds_module.js`](../word_sounds_module.js) (25,299 lines, 95+ clinical-tone hits)
**Setup files:** [`word_sounds_setup_module.js`](../word_sounds_setup_module.js), [`word_sounds_setup_source.jsx`](../word_sounds_setup_source.jsx) — **clean, no clinical labels**

**Standing premise** (from 2026-05-29 review): in-app practice data is being framed with RTI/screening language that implies validated clinical-screening output. Goal: keep workflow + at-a-glance grouping convenience for teachers, fix the credibility framing, and prevent misuse for high-stakes decisions the data can't support.

**Proposed relabel mapping (apply consistently across all categories):**

| Current | Proposed |
|---|---|
| `RTI Tier 1 / 2 / 3` | `Practice Group A / B / C` |
| `On Track / Strategic / Intensive` | `Independent practice / Guided practice / Targeted support` |
| `RTI Tier Distribution` | `Practice Group distribution` |
| `RTI Classification` | `Practice grouping (formative only)` |
| `RTI Threshold Configuration` | `Group cutoff settings` |
| `RTI Progress Monitor / Monitoring System` | `Practice progress monitor` |
| `Export RTI Report` | `Export practice grouping (CSV)` |
| `Screening` (in-app probe context) | `Practice check` |
| `screening_results_` (filename) | `practice_check_results_` |
| `Benchmark` (display label) | `Target` |
| `Above / At / Below / Well Below Benchmark` | `Above / Meeting / Approaching / Below target` |
| `At Risk` | `Needs targeted support` |
| `RTI tool` (in survey question) | `practice-monitoring tool` |
| `ORF Screening Passage` | `ORF practice passage` |

**Plus add a one-line disclaimer** at the top of every grouping/Tier display: *"Formative practice data — use alongside (not in place of) validated screening tools."*

**Internal identifier renames** (separate concern — affects only maintainers; bigger blast radius because they're function/variable names used across the file):

| Identifier | Proposed | Touch count |
|---|---|---|
| `classifyRTITier` | `classifyPracticeGroup` | 9 |
| `rtiThresholds` | `groupThresholds` | ~5 |
| `screeningHistory` | `practiceCheckHistory` | 3 |
| `isScreeningORF` | `isPracticeCheckORF` | 1 |
| `launchScreeningSession` | `launchPracticeCheckSession` | 2 |
| `rti.tier` / `rti.label` / `rti.reasons` etc. | `group.label` / etc. | ~30 |

**Recommendation:** apply user-facing relabel + disclaimer in pass 1 (high-impact, low-risk). Defer identifier renames to a pass 2 — they're cosmetic for maintainers and risk introducing bugs without test coverage.

---

## Inventory by category

### 🔴 USER-FACING: "RTI" + "Tier" labels

| Line | Current | Proposed |
|---|---|---|
| 15475 | `label: "Tier 1 — On Track"` | `label: "Group A — Independent practice"` |
| 15482 | `label: "Tier 2 — Strategic"` | `label: "Group B — Guided practice"` |
| 15489 | `label: "Tier 3 — Intensive"` | `label: "Group C — Targeted support"` |
| 15636 | `"RTI Tier",` (CSV column) | `"Practice Group",` |
| 15653 | `"Tier " + rti.tier,` (CSV value) | `"Group " + group.letter,` |
| 16873 | `text: "Overall, how satisfied are you with AlloFlow as an RTI tool?"` | `text: "Overall, how satisfied are you with AlloFlow as a practice-monitoring tool?"` |
| 18813 | `<div>Tier ${rti.tier} — ${tc.label}</div>` (HTML report) | `<div>Group ${group.letter} — ${tc.label}</div>` |
| 18814 | `<div>RTI Classification</div>` | `<div>Practice grouping (formative only)</div>` |
| 18839 | `RTI Progress Monitoring System` (HTML footer) | `Practice Progress Monitor` |
| 20143 | `"🎯 RTI Tier Distribution"` (chart title) | `"🎯 Practice Group distribution"` |
| 20175 | `label: "Tier 1 — On Track"` (chart legend) | `label: "Group A — Independent practice"` |
| 20183 | `label: "Tier 2 — Strategic"` | `label: "Group B — Guided practice"` |
| 20191 | `label: "Tier 3 — Intensive"` | `label: "Group C — Targeted support"` |
| 20399 | `"RTI Threshold Configuration"` (modal title) | `"Group cutoff settings"` |
| 20415 | `"Adjust classification cutoffs to match your grade level, district benchmarks, or screening tool norms..."` | `"Adjust group cutoffs to fit your classroom. These are formative practice thresholds — they do not replace your district's validated screening tools."` |
| 20423 | `label: "🔴 Quiz — Tier 3 cutoff"` | `label: "🔴 Quiz — Group C cutoff"` |
| 20432 | `label: "🟡 Quiz — Tier 2 cutoff"` | `label: "🟡 Quiz — Group B cutoff"` |
| 20441 | `label: "🔴 Word Sounds — Tier 3 cutoff"` | `label: "🔴 Word Sounds — Group C cutoff"` |
| 20450 | `label: "🟡 Word Sounds — Tier 2 cutoff"` | `label: "🟡 Word Sounds — Group B cutoff"` |
| 22332 | `"📊 Export RTI Report"` (button label) | `"📊 Export practice grouping (CSV)"` |
| 22337 | `"Download CSV with tier classifications, metrics, and recommendations"` | `"Download CSV with practice group, metrics, and suggestions"` |
| 22381 | `{ key: "rtiTier", label: "RTI" }` (table column) | `{ key: "rtiTier", label: "Group" }` |
| 22934 | `"RTI Progress Monitor"` (panel heading) | `"Practice progress monitor"` |

### 🔴 USER-FACING: "Screening" labels

| Line | Current | Proposed |
|---|---|---|
| 4794 | `t("common.benchmark_probe_results")` (i18n key) | Leave key, change translation to "Practice check results" |
| 15497 | `const classifyScreeningRisk = (results) => {` (function) | `const classifyPracticeRisk = (results) => {` (also a cosmetic rename, but the function emits user-facing labels — see L15531) |
| 15509 | `const exportScreeningCSV = () => {` (function name visible nowhere user-facing; defer) | (defer to identifier-rename pass) |
| 15531 | `: "At Risk"` (user-facing label from above fn) | `: "Needs targeted support"` |
| 15560 | `"screening_results_" +` (CSV filename) | `"practice_check_results_" +` |
| 15567 | `addToast("Screening CSV exported", "success")` | `addToast("Practice check CSV exported", "success")` |
| 15621 | `label: "At Risk",` | `label: "Needs targeted support",` |
| 18467 | `"ORF Screening Passage — Grade " + grade + " Form " + form,` (heading) | `"ORF practice passage — Grade " + grade + " Form " + form,` |

### 🔴 USER-FACING: "Benchmark" labels

| Line | Current | Proposed |
|---|---|---|
| 16634 | `"Benchmark Status",` (table column / heading) | `"Target status",` |
| 16639 | `"aria-label": "Benchmark status",` | `"aria-label": "Target status",` |
| 16657 | `"Above Benchmark",` (select option) | `"Above target",` |
| 16662 | `"At Benchmark",` | `"Meeting target",` |
| 16667 | `"Below Benchmark",` | `"Approaching target",` |
| 16672 | `"Well Below Benchmark",` | `"Below target",` |
| 18650 | `<label>Grade / Benchmark</label>` (HTML report) | `<label>Grade / Target</label>` |
| 20620 | `"Benchmark Probe Battery",` (modal title) | `"Practice probe set",` |
| 24432 | `t("class_analytics.benchmark_vs") \|\| "vs. Benchmark"` | Leave key, change translation + fallback to `"vs. Target"` |

### 🟡 INTERNAL: identifiers (defer to pass 2)

| Line | Identifier | Used at |
|---|---|---|
| 15113, 15114, 15369, 15648, 18667, 19053, 22470, 22700 | `classifyRTITier` | 9 sites |
| 15369-15495 | `rtiThresholds` (parameter `thresholds` in fn signature) | per-call |
| 15032, 15035, 15525 | `screeningHistory` (state key) | 3 sites |
| 18464, 18469 | `id: "orf-screening-..."`, `isScreeningORF: true` | 2 sites |
| 18452, 18453, 18566, 18595 | `ORF_SCREENING_PASSAGES`, `launchScreeningSession` | 4 sites |
| 22381 | `{ key: "rtiTier", ... }` (object key) | 1 site |
| 22470-23470 | `rti.tier`, `rti.label`, `rti.reasons`, `rti.recommendations`, `rti.emoji`, `rti.color`, `rti.bg`, `rti.border` | ~30 sites |
| 23373, 23405, 23436, 23453, 23456, 23459 | DOM ids `rti-baseline-`, `rti-target-`, `rti-date-` | 6 sites |
| 23470 | `"RTI goal saved for " +` (user-facing toast) | **USER-FACING — pull into pass 1: change to `"Practice goal saved for "`** |

### ⚪ COMMENTS / variable spellings (no relabel needed)

| Line | Context |
|---|---|
| 345, 2056, 14832 | `// error-remediation` (technical comment — keep) |
| 16418, 16634, 16695, 16715, 16725, 16640-16646 | `cbmForm.benchmark` (form field name — defer; aria-label was the user-facing piece, already in §3) |
| 18479, 18480 | `BENCHMARK_PROBE_BANKS` (constant — defer to identifier pass) |
| 19549, 19551 | `desc: "Probes & benchmarks"` (sub-label) | → propose `"Probes & targets"` (USER-FACING, add to pass 1) |
| 24401, 24403 | comment-only mentions of `benchmark form` | keep |

### 🆕 ADD: disclaimer placement

Add at top of these views:
- L15445 area — before tier-color-config block (where the dashboard renders tiers)
- L20141 area — before "RTI Tier Distribution" chart
- L20399 area — at top of "RTI Threshold Configuration" modal
- L22934 area — before "RTI Progress Monitor" panel
- L18810 area — in the HTML report, near the "RTI Classification" badge

Standard disclaimer text:
> *Formative practice data — use alongside (not in place of) validated screening tools.*

---

## Effort estimate

- **Pass 1 (user-facing strings + disclaimer):** ~40-60 minutes. ~35 distinct edits across the file. Each is a string replacement; node --check after.
- **Pass 2 (internal identifier renames):** ~1-2 hours. Mechanical but spans ~50 sites; needs careful regex (e.g., `\\brti\\b` won't catch all because `rti.foo` style access has trailing `.`). Safer to do file-wide search+replace with manual confirmation per match.

## Suggested next move

Review this inventory and either: (a) approve the mapping as-is and I'll do pass 1, (b) tweak specific replacements (e.g., "Practice Group A/B/C" vs "Skill Group 1/2/3"), or (c) approve a subset (e.g., do the RTI/Tier labels but leave Benchmark alone).
