# Strengths Finder: strengths in context

The Scenarios tab previously gave one to three stars and points for prescribed responses, attached a strength label to a selected action, and counted top-rated answers toward badges. Several examples favored direct confrontation or more effort without adequately considering safety, access, rest, preferences or available support. The new practice asks learners to compare the usefulness and limits of actions in context.

## Learning design

Four fictional contexts provide 12 grade-specific setups: effort/rest/support, welcoming with access and choice, shared decisions and roles, and responding to hurtful comments. Each includes an observation question, two possible approaches, possible strengths language, conditions where each may help, limits and support needs, and 24 grade-adapted examples of words to use or change. A changed circumstance invites reconsideration. Approaches may be combined, adapted or declined; they do not classify the learner's character or guarantee another person's response.

Examples distinguish persistence from repeating an inaccessible method, inclusion from pressuring someone to participate, fair roles from identical tasks, and courage from a requirement to confront or educate someone. Adults and organizers retain responsibility for support and access. Quiet support, asking for help and pausing are not ranked as weaker responses.

Four optional notes cover observations/questions, support/access/boundaries, an action to try or adapt, and a review condition. Notes persist independently by context and grade, including a separate own-example context. A read-only preview contains only the current context's notes. Reading or thinking remains valid participation. The retained read-aloud control narrates only the selected fictional scene.

## Compatibility and boundaries

Earlier scenario choices, completion counts, selected strengths and awards remain stored; an optional history disclosure explains that earlier ratings are not character assessments. New scenario interactions do not update legacy ratings, completion counts or selected strengths, award points, or make AI requests. The wider tool's existing badge logic remains in place for its other activities and earlier records. New selections and notes use `contextSelections[band]` and `contextDrafts[band:context]`; malformed values are guarded and unknown note properties are preserved.

The existing tool identity, tab ID, other activities and narration interface remain unchanged. Native selects, disclosures and textareas provide labeled keyboard controls, 44px targets and 16px input text across light, dark and high-contrast themes. No new personal data is included in coach prompts by this activity.

## Source and verification scope

[CASEL's SEL framework](https://casel.org/what-is-sel/) describes self-awareness, consideration of others, evaluating choices and seeking support across developmental stages and contexts. These broad skills inform the authored comparisons. The cases and labels are not a validated strength or personality assessment.

Evidence is recorded in `reports/sel-strengths-context`. Provider and narration interfaces are mocked in browser tests. No live provider call, push, deployment or packaged build is included.

Validation: 31 unique selected checks passed: 19 focused browser cases, five existing Strengths control/chart contracts, three actual-hub return workflows and four targeted Strengths theme checks. The first browser case timed out loading the local test page, then passed unchanged on isolated retry. The first theme worker failed to start; its four checks passed unchanged on a later retry. No assertions or timeouts were weakened. All 72 SEL tools rendered. Three scoped axe scans found no violations; nine 320px phone captures were reviewed across light, dark and high contrast. Source/public byte parity, syntax and scoped whitespace passed. Filtered and repeated cases and render enumeration are excluded. No live provider call, push, deployment or packaged build.
