# Friendship rehearsal: choices and possible responses

The Rehearse tab previously made agreement the reward for a specific conversational performance: several characters softened if the learner used the prescribed language, and the main prompt instructed them to agree after four or five successful turns. This pass replaces that framing with explicit fictional conditions: open to talking, unsure or needing time, and declining a request or conversation. A condition is a practice setting, not a difficulty rating or a prediction of a real person.

## Context and learning

Six scenarios have 18 authored, grade-specific scenes and opening lines: invitations, acknowledging an impact, boundaries, missed invitations, hurtful comments and renewed contact. Each names a limitation, such as forgiveness not being owed, a boundary not needing agreement, uncertainty about exclusion, optional confrontation and respect for no-contact requests. Opening a scene makes no provider request and is available offline. Written openings and generated replies have different labels.

Partner and coach prompts respect communication differences, processing time, access and refusal. The partner should not reverse a no because of persuasive wording or pressure a learner to continue. Coaching separates observed words from uncertain motives and offers an optional next step with limits. This is prompt guidance, not a guarantee of live model behavior.

Pause and reflect is available before any student turn and while awaiting a reply. It makes no AI request and awards no points. Three optional notes address observations/uncertainty, choices/boundaries and adaptation/support. Notes persist by scenario and grade, including across a hub return. Returning to the rehearsal retains an unsent response. Optional AI reflection is a separate explicit action and sends conversation text without adding these notes; it does not grade worth or require a retry.

## Interaction and compatibility

Native controls use visible labels, 44px targets, 16px input text and explicit light/dark/high-contrast colors. Enter adds a line in the response field. Rejected, synchronous or empty AI replies retain the current conversation and unsent response; failures do not become fictional dialogue or fabricated feedback. Pending requests prevent duplicate actions and scenario clearing, while still allowing local reflection. A disclosure explains that choosing a different scenario clears the current conversation, unsent response and AI reflection; optional notes remain stored.

Existing scenario IDs, history, earlier awards and other Friendship records remain compatible. Malformed records are guarded for display without rewriting stored history. New reflection records retain unknown properties. The shared consent screen and disclosure are used when AI is available; each request rechecks consent. A local safety block stops the provider call, surfaces the existing support response/resources and pauses role-play; self-reflection remains available. The shared safety implementation and provider configuration are unchanged.

## Design basis and validation limits

[CASEL's SEL framework](https://casel.org/what-is-sel/) includes communication, consideration of others, evaluating choices and seeking support across developmental stages. Those broad skills inform the authored contexts and reflection questions. These scenarios are not validated assessments and do not predict relationship outcomes.

Evidence is recorded in `reports/sel-friendship-rehearsal`. Browser provider responses are mocked. No live provider call, push, deployment or packaged build is included.

Validation: all 78 unique selected checks passed on the first run: 32 focused browser cases, five control contracts, 16 existing safety-layer tests, 18 Friendship coach regressions, three actual-hub workflows and four targeted Friendship theme checks. All 72 SEL tools rendered. Three scoped reflection axe scans found no violations; nine 320px phone captures were reviewed across light, dark and high contrast, including native keyboard selection. Source/public byte parity, syntax and scoped whitespace passed. Filtered cases and render enumeration are excluded. Browser AI replies were mocked; prompt checks do not establish live model response quality. No push, deployment or packaged build.
