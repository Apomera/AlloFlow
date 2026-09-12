# Perspective-Taking: deeper case studies

Updated 2026-09-12.

Open Perspective-Taking and choose **Case studies**. This is the starting tab for new tool state; an existing saved tab remains selected. Three cases are available in each grade band. Existing short scenarios and other tabs remain available.

The cases invite learners to separate observed events from interpretations, consider different needs without claiming access to another person's mind, compare response tradeoffs, and reconsider a response when more information becomes available. Each case names the role being practiced, so responses fit what that person can actually do. All examples are fictional. Writing, personal disclosure, choosing a response, and changing a response are optional. There are no points, correctness labels, automatic completion records, or AI calls in this new workflow.

## A practice sequence

1. **Notice before interpreting.** Read the scene and identify an observation. An optional model separates the stated facts from what remains unknown.
2. **Hold more than one possibility.** Consider alternative explanations or needs, then compare possible perspectives. These perspectives are hypotheses, not answers to guess.
3. **Compare responses and tradeoffs.** Each of three responses explains a possible benefit and a limitation. Discuss who carries the effort or risk. Responses can be combined; support may be needed before direct conversation.
4. **Reconsider with new context.** Reveal a further statement or event. The first selection is retained, and a separate response can be chosen with contextual feedback. Explain what to keep or change. A counterfactual prompt changes one condition to test whether the strategy still fits.
5. **Apply the learning elsewhere.** Rehearse a small transfer with a fictional or low-pressure example, including a support, limit, or question to check.

Modeling and reflection structure draw on [CASEL's explicit SEL instruction guidance](https://schoolguide.casel.org/focus-area-3/classroom/explicit-sel-instruction/). This is design guidance, not evidence that the implementation produces learning gains.

## Facilitation

For a shorter session, discuss a single observation and compare two responses aloud, with pictures, signing, or AAC. For more depth, compare whose perspective is missing, who has decision-making power, what could make a direct request unsafe, and how a response should change under the alternative condition. Do not require a positive feeling, disclosure, agreement with harm, or forgiveness as proof of understanding. Ask about the reasoning behind a choice, including a decision to keep the same response.

A useful response to the project-credit case might acknowledge both research and rewriting, identify the inaccessible handoff, and propose a new process. It need not label either student or require them to explain private circumstances. In the video case, uncertainty about intent does not make an explicit removal request optional.

## Case coverage

| Band | Case | Main question |
| --- | --- | --- |
| Elementary | An invitation with room to say no | Can welcome leave room for solitude and refusal? |
| Elementary | An accident still needs repair | How can intent and impact inform a chosen repair? |
| Elementary | More than one way to take a turn | What makes participation accessible without forcing a turn? |
| Middle | Privacy, belonging, and the group chat | Which information belongs in a shared work channel? |
| Middle | A read receipt is incomplete information | What can a delayed reply tell us, and what remains private? |
| Middle | Fairness without private proof | How can a learner request support without questioning another learner's need? |
| High | Questioning an unequal review | How can someone challenge unequal treatment with support and attention to power? |
| High | Visible work, hidden work, and shared credit | What contribution evidence is missing from edit counts? |
| High | Intent, consent, and a public audience | How can consent and repair guide action despite different intentions? |

## State and compatibility

Case selection is retained separately for each grade band in `caseStudyIds`. Notes are keyed by the stable case ID in `caseStudyNotes` and use the existing tool/project state route. Observation, alternative explanation, initial choice, reveal status, revised choice, reason, and next use stay separate. Switching cases or tabs does not clear them. Revealing context preserves the first response as it stands, including no selection; later choices are recorded separately. A first choice can be deselected before revealing, and a revised choice can also be deselected.

Use the Hub save/export controls to keep a project copy. Updating tool state is not confirmation that a file was written. Existing scenario counts and badges are preserved, and the new cases do not feed the older scoring system. Unknown case IDs fall back to the first case in the band; invalid choice IDs are treated as unrecorded. Non-string note values display as blank without crashing.

Authored cases and the interface live together in `sel_hub/sel_tool_perspective.js`; the public mirror must be updated with it. These cases deepen one tool. The existing short-story interpretations, Hidden Feelings scoring, other legacy tabs, and AI outputs are outside this pass and remain candidates for further review.

## Validation scope

**Final results:** 567 existing checks and 20 browser workflows passed, with two existing regression skips. The final theme recheck passed 294 checks; all 72 tool renders passed. Three scoped axe scans found zero violations, and dark/high-contrast phone layouts were visually reviewed. See `reports/sel-perspective-depth/validation.json` for the validation sequence and corrected initial contrast issue. The browser tests use the actual tool renderer with simulated host state callbacks. They exercise every response in every case, context-dependent feedback, first/revised choice separation, serialized restoration, grade-band selection, keyboard focus, legacy state, and 320 px layouts in three themes. Automated accessibility scans are scoped to the case-study region.

This does not validate a real project-file round trip, packaged Desktop, live assistive-technology use, classroom outcomes, or clinical effectiveness. No deployment was performed.
