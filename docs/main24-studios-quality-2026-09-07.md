# Main 24 resource quality pass: studios, planning, audit and delivery

Date: 2026-09-07. Scope: the current local working tree. This follow-up reviewed the previous September 4 audit and implemented refinements before selecting additional changes. The prior response persistence, async resource identity, AI capability and audit fingerprint repairs remain in place.

## Resource coverage

| Main resource | Current assessment and action |
| --- | --- |
| Note-Taking Templates | Separate learner responses, restricted-provider behavior, temporary teacher preview, stored feedback and stale-draft rejection remain covered by actual-component integration checks. No additional confirmed defect was found in this focused pass. Text inherits the application typography. |
| Anchor Chart | Confirmed font overrides and fixed pixel text prevented consistent customization. Replaced decorative font families with inheritance and converted title, section, bullet and badge text to equivalent rem sizes. Removed the unused decorative-font download. Controls wrap, answer fields can shrink, and comparison/concept grids fit narrow containers with larger text. Each section stacks its icon above full-width text until its own content area reaches 24rem; read-mode headings and bullets also wrap long tokens. Scoped the module's print and reduced-motion CSS so opening a chart cannot restyle other resources' inputs or animations. |
| Memory Aid Studio | Current normalization, review flow and source/build checks pass. Existing private practice, response ownership and read-aloud boundaries remain the stronger shared model. No additional confirmed defect found. Ordinary content already inherits typography. |
| Applied Challenge Studio | Schema and actual learner interaction checks pass, including the existing structured workspace and response boundary. No additional confirmed defect found. Ordinary content already inherits typography. |
| Lesson Plan / Study Guide / Family Guide | Removed the essential question's forced serif family and allowed header actions to wrap. Corrected misleading accessible names: Edit was announced as Check and Generate teacher guide as Refresh. Edit state and generation busy state are now exposed; next-lesson and STEAM tool actions identify their destination. Create Station now catches malformed/non-list/blocked/full local storage, preserves existing saved data, reports a clear error, and activates the new station only after a successful save. |
| Curriculum Audit | Existing content fingerprints and stale/unverifiable report notices are present and the shared integration checks pass. No additional confirmed defect found. The fixed-coordinate SVG score graphic retains its specialist typography; ordinary report text uses application styles. |
| Preview, Package & Deliver | Existing export preflight and accessibility checks pass. The actual host uses the builder's scoped resource projection rather than raw history; its old test assertion was updated to reflect that existing behavior. No new delivery implementation change was needed. Export document styling remains its own authored output configuration. |

## Files changed

- `anchor_charts_source.jsx`, `_build_anchor_charts_module.js`, generated `anchor_charts_module.js` and its desktop public mirror.
- `view_lesson_plan_source.jsx`, generated `view_lesson_plan_module.js` and its desktop public mirror.
- `tests/main24_studios_quality.test.js`: nine new focused behavior checks.
- `tests/anchor_charts_dialog_targets_a11y.test.js`: aligned two obsolete icon assertions with the existing decorative `alt=""` / `role="presentation"` behavior; retained actual dialog focus and axe checks.
- `tests/export_preview_recommendations.test.js`: aligned an obsolete raw-host-props assertion with the existing builder resource projection.

Shared typography settings, persistence, font loading and app CSS are handled by the coordinating workstream, not duplicated here.

## Validation

**232 distinct tests passed across 11 focused suites after the affected reruns.**

First batch: 57 checks covering studio responses, Anchor Chart dialog/reorder accessibility, Lesson Plan teaching-script integration and the nine new behavior tests. Initially 55 passed and two preexisting decorative-icon expectations failed; both passed after correcting those assertions.

Second batch: 175 checks covering Notes, Memory Aid, Applied Challenge schema/interaction and export accessibility/recommendations. Initially 174 passed and one obsolete host-prop string expectation failed. The corrected export suite and new studio quality suite passed all 45 checks on rerun.

Builds: `node _build_anchor_charts_module.js` and `node _build_view_lesson_plan_module.js` regenerated both runtime modules and desktop public copies. The chart builder's freshness check and both modules' JavaScript parse/mirror checks were also run.

These checks use deterministic providers, local fixtures and DOM rendering. They do not claim live AI output evaluation, classroom delivery, physical printing, or a manual assistive-technology walkthrough of every main resource. No deployment or commit was performed.
