# Strengths Finder: Spot Strengths

The earlier match quiz presented one prescribed strength as the answer, gave scores and identity-based praise, and claimed a relationship to a formal VIA assessment without supporting evidence. Spot Strengths replaces that experience with reasoning about observations. The saved tab ID remains `quiz`.

## Learning design

Four contexts provide 12 grade-adapted examples: an offer of help, changing a learning approach, listening in different ways, and making participation possible. Each has three statements to distinguish: an action stated in the example, a qualified possible interpretation, and a conclusion that the example does not establish. Feedback explains the authored reasoning and can be revisited without points or ranking. Changing an answer clears its previous feedback until the learner compares again.

The examples leave motives and fixed traits uncertain. They recognize consent, support and access needs, and avoid equating eye contact with listening or repeated effort with character. A question, changed circumstance and reconsideration prompt make the next step explicit. The interpretations are authored learning examples, not a personality assessment.

Two optional reflection notes let learners separate observations and possible strengths language from questions still worth asking. A separate own-example mode supports transfer without answer classification. Notes and reviewed choices persist independently by grade and context. A read-only preview includes only the current notes. Reading and thinking without answering is valid participation; notes do not request or provide monitored support.

## Interface and compatibility

Labeled native selects, disclosures and textareas support keyboard use, 44px controls and 16px input text. Feedback uses a polite status region. Mobile review shortened a clipped dropdown prompt. Light, dark and high-contrast palettes follow the host theme. Read-aloud narrates only the selected authored example.

New state uses `observationSelections[band]` and `observationDrafts[band:context]`, including per-claim choice/review records. Guards handle malformed objects and values; updates retain unknown draft and answer properties. Earlier quiz progress, answers, scores, selected strengths and earned awards remain stored. Historical badge thresholds retain the earlier eight-question length. The wider tool's existing award logic remains; new activity interactions do not update legacy scores, assign strengths, award points or call the AI coach. Earlier quiz statistics and badge descriptions are labeled as historical.

## Source and verification

[CASEL's SEL framework](https://casel.org/what-is-sel/) describes self-awareness, considering others' perspectives and evaluating choices across developmental stages and contexts. These broad skills inform the practice. Neither the authored categories nor this activity are a validated assessment or equivalent to a formal strengths measure.

51 unique selected checks passed: 20 new browser cases, 19 previous Strengths Scenarios browser cases, five existing control/chart contracts, four targeted Strengths theme checks and three real-hub reopening workflows. The initial new-suite run passed 19/20: one test selector inadvertently counted native disclosures as answer groups. After narrowing that selector, all 39 browser cases passed. Final phone checks were rerun after a shorter dropdown prompt and historical-stat label polish. Assertions and timeouts were not weakened. Repeated and filtered cases, four extra viaStrengths theme checks from an initial broad filter, and render enumeration are excluded from the unique count.

All 72 SEL tools rendered. Nine 320px captures were visually reviewed across three themes; three scoped axe scans found no violations. Source/public bytes, JavaScript syntax and scoped whitespace checks passed. Logs, images and the validation record are in `reports/sel-strengths-spot`. Browser narration/coach interfaces are mocked; no live provider call, push, deployment or packaged build is included.
