# Friendship Workshop: flexible ways to care

The former My Style tab is now Ways to Care. The old interaction asked learners to select a friendship type, announced that the learner was that type, awarded points on every selection and added the selected type to one coach prompt. The replacement treats helping, listening, shared experiences, reliability, inclusion and recognition as practices to adapt to a situation, not personality categories or measures of worth.

## Learning design

Six practices have 18 grade-specific setups and example wordings. Each distinguishes what a learner notices from what they still need to ask, offers adaptable words and boundaries, and introduces a changed circumstance. Examples include accepting a declined offer of help, listening without requiring eye contact or stillness, adapting an inaccessible activity, acknowledging a broken commitment without making unrealistic promises, inviting without pressuring, and recognizing an achievement while allowing mixed feelings.

Three optional notes address noticing/asking, offering/adapting/declining and checking whether an action remains welcome. A separate own-example context supports transfer. The preview identifies these as practice notes, not a personality assessment. Reading, thinking or practising with a trusted person remain valid participation. Browsing practices assigns no identity and awards no points.

The initial screen now starts with the activity. The existing launch panel and links remain available under an Explore other friendship activities disclosure. Its style statistic becomes a count of ways available to explore, and its route descriptions match the recently deepened activities. The tab ID remains `compass` for compatibility; its visible label and contextual help are updated.

## Earlier data and coach prompts

Existing `myStyle` values and prior awards remain unchanged. Recognized earlier labels appear only under Earlier style selection with a clear historical explanation; unknown values stay stored without being interpreted. They do not select a new practice automatically. New selections and optional drafts use `careSelections[band]` and `careDrafts[band:context]`, with malformed-value guards and preservation of unknown draft properties.

The Enter-to-send coach prompt no longer injects an old label as the learner's friendship type. Button submission already omitted it. Focused tests cover both controls through the safe-coach and fallback paths using mocks, and check that new care reflections are not added to prompts. Earlier conversation history is preserved and remains available to the existing coach workflow. Provider, consent and safety behavior are otherwise unchanged; this pass includes no live provider call.

## Sources and verification

[CASEL's SEL framework](https://casel.org/what-is-sel/) describes skills developed and applied across contexts and developmental stages, including communication, considering others and seeking support. This informs the broad practice structure; the authored examples are not a validated personality or relationship assessment. The activity makes no prediction about how another person will respond.

Native labeled selects, disclosures and textareas provide keyboard controls, 44px targets and 16px input text across light, dark and high-contrast themes. Browser coverage includes all practice/grade combinations, independent drafts, historical data, keyboard navigation, coach prompt boundaries and narrow-screen accessibility. Additional checks cover the renamed default tab, adjacent activities, actual-hub reopening, all-tool rendering and source/public byte parity. Results and images are recorded in `reports/sel-friendship-care`. No push, deployment or packaged build is included.

Validation: 76 unique selected checks passed: 28 new browser cases, five existing control contracts, 36 Digital/Keeping regressions, three actual-hub workflows and four targeted Friendship theme checks. One existing Digital high-contrast phone case timed out initially, then passed unchanged on isolated retry; the initial run also reported a worker-termination timeout. No assertions or timeouts were weakened. All 72 SEL tools rendered. Three scoped axe scans found no violations; nine 320px phone captures were reviewed across light, dark and high contrast. Source/public byte parity, syntax and scoped whitespace passed. Filtered and repeated cases are excluded. No push, deployment or packaged build.
