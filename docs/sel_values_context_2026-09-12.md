# Decision Workshop: Values Sort in context

The former Values Sort forced six words into a strict order, used ambiguous button names, kept one ranking across contexts and awarded completion points for saving an unchanged order. Its claim that a decision feels right when it matches top values gave too little attention to consent, access, safety and other people affected by a choice.

The Values Sort tab now offers 24 authored fictional situations (eight per grade band). Each has a situated tension, changed information and one possible response with a practical next step. The original context IDs, ordering and word lists remain; the first four elementary titles describe actions instead of being a “good” person. The tab ID remains `values`.

Learners can leave words undecided or give several the same role: Protect here, Support if possible, or Less central here. These are tentative roles for a situation, not an assessment or an overall ranking of the learner's values. The guidance acknowledges that the inherited lists mix values, needs, pressures and consequences. Six optional notes cover the situation, meanings or missing values, tensions, boundaries/support, a reasoned next step and reconsideration. A learner can discuss, read or think without writing. The comparison response is expandable and is explicitly not an answer key.

The examples distinguish privacy from dishonesty, forgiveness from restored trust, equal treatment from access, and conviction from required self-sacrifice. They include practical supports and responsibilities beyond the learner. A changed action need not imply abandoning a value. These are authored teaching choices, not validated measures of moral development or a prescribed clinical intervention.

CASEL describes responsible decision-making in terms of caring, constructive choices that consider safety, ethical standards, consequences and individual and collective well-being. That broad framing informed the design; CASEL has not evaluated these examples or the priority categories. Primary source checked September 12, 2026: [CASEL, What Is SEL?](https://casel.org/what-is-sel/).

Implementation and compatibility:

- `valuesSelections[band]` remembers the chosen context. `valuesDrafts[band + ':' + contextId]` holds a priorities map and six note fields (`context`, `meaning`, `tension`, `boundary`, `action`, `review`). No writes occur just from opening teaching panels.
- Drafts survive context changes, grade changes and project-data restoration. They use the hub's existing project persistence; users still need the hub save/export controls for persistence beyond the session.
- Invalid selections, indices, maps and field types fall back safely. Unknown fields are retained when a note or priority is edited.
- Legacy `vsIdx`, `vsRanking`, `vsSaved`, `vsCompleted`, badges and logs are left intact. A string-only view of the old ranking appears in a separate historical disclosure, without inferring a grade band or assigning new priorities from it.
- New work does not add ranking-completion XP, badges, counts or logs. Earlier awards and progress labels are marked as historical.
- Labeled native selects replace small move buttons. Optional panels use keyboard-operable native disclosures. Inputs use 16px text and controls have a minimum height of 44px. Light, dark and high-contrast surfaces have explicit foreground and background colors.

Validation results are recorded in `reports/sel-values-context/validation.json`. The focused suite covers all 24 scenarios, independent drafts and equal priorities, serialized restoration, old records, malformed state, keyboard focus and three phone themes. Actual-hub and regression results are recorded separately from filtered or skipped cases. Phone screenshots and scoped axe scans are evidence for this activity, not full-app accessibility certification. Long context options may truncate in a closed native select at 320px; the full context title is also displayed immediately below it.

The prior Bias Check pass was committed as `5e0964c45` after its unrelated source-pair blocker cleared. No push, deployment or packaged build is included in this pass. The ignored generated `desktop/app-build` output is not rebuilt; installed copies need a fresh package to receive these changes.

Final validation: 30 focused cases, 611 regression checks and four actual-hub workflows passed (645 unique checks). Two pre-existing skips and 90 filtered hub cases are excluded. All 72 SEL tools rendered. Three scoped axe scans found no violations; nine phone captures were reviewed. Syntax, source/public parity, legacy IDs/word lists and scoped whitespace checks passed.
