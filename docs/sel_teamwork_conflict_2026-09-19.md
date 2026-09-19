# Supported conflict planning (2026-09-19)

Teamwork Builder's Conflict Plan replaces the AI conversion workflow and its claim that receiving a response had resolved a conflict. The new activity supports possible next steps without promising cooperation or resolution. The `conflicttool` navigation ID remains stable.

Three fictional contexts address different task ideas, missing work with uncertain causes, and repeated pressure/exclusion. Each has elementary, middle and high-school setups, limits, route-specific examples and a changed circumstance with a possible adjustment. A separate own-example context supports transfer without automatically classifying personal text.

Four routes consider a voluntary conversation, a pause with a next step, adult support and help deciding what support is needed. The pressure context excludes direct-conversation rehearsal, even when saved data contains that choice. Its visible notice calls for adult support; a pause alone is not presented as sufficient. Learners need not prove a label or confront someone before asking for help. An unhelpful first adult response can be followed by another adult or an established school support route.

Five optional notes separate observations from assumptions, identify needs and boundaries, consider words or a support request, propose a next step and plan a follow-up. Changing routes preserves notes with a reminder to review their fit. The preview includes only the current context and grade's notes. The activity explicitly says that notes are not monitored and do not request help from anyone.

The distinction between a mutual disagreement and repeated pressure/power imbalance is informed by [StopBullying.gov's definition](https://www.stopbullying.gov/what-is-bullying) and [adult response guidance](https://www.stopbullying.gov/prevention/on-the-spot). Those sources inform the design; they do not evaluate this activity or establish a label for a learner's situation. The authored examples are not a validated assessment or automated safety evaluation.

Implementation and compatibility:

- `conflictSelections[band]` remembers the context. `conflictDrafts[band + ':' + contextId]` stores `route`, `observations`, `needs`, `words`, `next` and `review`. Drafts persist across context/grade switches, tab navigation and serialized project restoration. Unknown fields survive edits; malformed containers and values fall back to usable empty controls.
- Unsupported direct-talk choices in the pressure example display Still deciding without deleting notes or exposing direct-talk guidance. Personal text is not analyzed or sent to a provider; help remains available without completing fields.
- Earlier input, generated results, loading flag, request count, history, reflections, logs and awards remain in project data. Recognized entries appear as historical records, not verified advice or automatic input to the new plan. The progress counter and badge description identify earlier activity.
- New planning does not call a provider, award points/badges, increment old counters or log completion. The old provider-path safety precheck is no longer called because that provider path is removed; shared hub safety facilities and other Teamwork AI activities remain unchanged.
- Native disclosures/selects, visible labels and help, a live route explanation, 16px inputs, controls at least 44px tall and explicit light/dark/high-contrast surfaces support phone and keyboard use. Younger learners may benefit from adult discussion of shared route explanations.
- Notes belong to the current project; existing hub save/export controls preserve them beyond the session. The labeled read-only preview supports manual selection/copying without notifications or automatic sharing.

Validation evidence is recorded in `reports/sel-teamwork-conflict/validation.json`. Scoped axe scans cover the revised region, not the full hub. No push, deployment or packaged build is included. The earlier agreement pass remains staged with its documented unrelated content-engine pair blocker.

Final validation: 73 unique checks passed: 16 focused conflict browser cases, 50 surrounding regression checks, three actual-hub workflows and four targeted Teamwork theme checks. Five shared clipboard checks also passed in the focused run and are counted once in regressions. Ninety-seven filtered hub cases and 292 filtered theme cases are excluded. All 72 SEL tools rendered. Three scoped axe scans found no violations, and nine phone captures were reviewed across light, dark and high contrast. Syntax, source/public byte parity and scoped whitespace passed. No push, deployment or packaged build.

Commit status: after another task's Git lock cleared naturally, the normal scoped commit was rejected by unrelated drift between `content_engine_source.jsx` (2856 lines) and `desktop/web-app/src/content_engine_source.jsx` (2838 lines). No lock was removed, no hook bypassed and neither unrelated file was changed. This enhancement and the previous agreement pass remain staged locally; all 73 selected unique checks for this pass passed.
