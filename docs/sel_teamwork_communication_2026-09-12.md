# Teamwork Builder: contextual Communication Plan

The old Comm Style activity tallied ten forced-choice answers into Director, Collaborator, Analyzer and Supporter profiles. It displayed primary/secondary types and score bars, then offered AI advice about complementary teammates. Its banner implied that matching types would remove friction. The implementation tied broad claims about motives, strengths and blind spots to a short authored questionnaire.

The tab is now Communication Plan, retaining the `commstyle` navigation ID. Six fictional examples (two per grade band) cover explaining a game, clarifying instructions, task handoffs, usable feedback, recording group decisions and raising an access concern. Twenty-four situated teaching moves show how to clarify a purpose, make a message specific, enable participation and check shared understanding. Each example adds changed information and a possible adjustment. No profile, personality score, team-composition recommendation or AI-generated type advice is produced.

The pedagogy distinguishes understanding from agreement and consent, silence from approval, a clear message from a guarantee of cooperation, and communication preferences from fixed traits. Learners can ask for help, use different formats, take time to respond and question assumptions. Eye contact, speaking quickly or adopting a particular tone are not treated as proof of listening or competence. Examples include checking information and actual follow-through instead of assuming that a friendly reply means the work is done.

Six optional notes cover purpose/audience, the message or demonstration, participation/access, timing, checking understanding and revision. Four optional support choices identify time, multiple response methods, a usable example/record, and private or supported conversation. They represent possibilities to discuss, not confirmation that support exists. A live review presents only the learner's current notes and selections; it neither fills in worked examples nor scores completion. Learners can read, discuss or rehearse without writing or sharing personal experiences.

Source framing, checked September 12, 2026:

- [CASEL: What Is SEL?](https://casel.org/what-is-sel/) describes relationship skills in terms of clear communication, listening, collaboration, diverse settings and seeking/offering help. This broad framing informed the practice; CASEL has not evaluated the authored cases.
- [CAST UDL Guidelines 3.0, consideration 5.1](https://udlguidelines.cast.org/action-expression/expression-communication/multiple-media/) supports multiple media for communication and choosing media to fit the content and audience. The planner applies that principle to agreed response options rather than assigning a preferred learner type.

Implementation and compatibility:

- `communicationSelections[band]` remembers the chosen example. `communicationDrafts[band + ':' + exampleId]` holds `purpose`, `message`, `access`, `timing`, `check`, `review` and a `supports` map.
- Selections and notes stay separate across examples and grade bands and use the hub's project persistence. User-facing copy explains saving/exporting for persistence beyond the session. Opening teaching or review panels does not create a draft or award XP.
- Empty, malformed or unknown selections/maps/field types fall back safely. Unknown draft fields and support keys survive edits. Only recognized support flags with boolean `true` appear selected or in the review.
- Earlier questionnaire definitions, answers, completion flags, profile results, generated advice, reflections, logs and badges remain intact. Recognized old answers are readable under a historical disclosure; the old type result and generated advice remain in project data but are not used or displayed as a new plan. Historical badge/progress descriptions distinguish old completion from current planning.
- The prior Scenarios rehearsal and its optional coach remain available and unchanged. Other Teamwork activities and their rewards are outside this pass.
- Named native controls, descriptive help, 16px inputs, at least 44px select/disclosure/checkbox-label targets and explicit theme colors support keyboard and phone use. The review renders note content as text, including literal markup, and updates when a note or support choice changes.

Validation results are recorded in `reports/sel-teamwork-communication/validation.json`. Focused workflows cover every example, six-field persistence, support selection/clearing, project-data restoration, live review, historical records, malformed state, keyboard focus and phone layouts. The prior Scenarios suite and shared Teamwork checks provide regression coverage. Actual-hub workflows check leaving and reopening activities. Scoped axe scans and phone screenshots cover this practice region, not every existing tab or the full hub. Shared support explanations may benefit from adult discussion for younger learners.

No push, deployment or packaged build is included. The ignored generated `desktop/app-build` output was not rebuilt; installed copies need a fresh package to receive these changes.

Final validation: 13 focused browser checks, 624 regression checks and three unique actual-hub workflows passed (640 unique checks). Two pre-existing regression skips and 93 uniquely filtered hub cases are excluded. Both Teamwork hub flows passed initially; the older Values Sort flow timed out clicking its tab, then passed in isolation with no source or test change. That retry filtered 95 hub cases. All 72 SEL tools rendered. Three scoped axe scans found no violations and nine phone captures were reviewed. Syntax, historical definitions, scoped whitespace and source/public parity passed. Raw logs are `reports/sel-teamwork-communication-{focused,regressions,hub,hub-values-retry,render}.log`.

Commit status: committed normally as `5b1c465bb` after the unrelated source-pair mismatch cleared. No hook bypass was used.
