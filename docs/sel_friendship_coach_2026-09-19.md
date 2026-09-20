# Friendship Practice: considered suggestions and recoverable drafts

The Practice tab now separates an AI suggestion from a prediction about a real person. Its introductory guidance invites fictional situations, avoids requesting identifying details and offers optional prompts for separating observations from assumptions. A review disclosure asks learners to check fit, consent, access and boundaries before adapting or declining a suggestion. Nine fictional starter questions cover three grade bands and fill only an empty draft; choosing one does not send it.

## Consistent interaction

Enter and the visible Send button share one submission function and one prompt. The prompt acknowledges stated feelings without inventing them, distinguishes uncertain interpretations, offers an adaptable next step and explains possible usefulness and limits. It permits pausing, declining contact and seeking support; it does not promise friendship or forgiveness or require eye contact, reconciliation, confrontation or disclosure. The old unsupported research claim in the contextual help card has been removed. New submissions award no points; earlier awards and conversation records remain unchanged.

A draft remains visible while a request is pending. Rejected, synchronously thrown, empty or malformed replies leave the draft available for editing or retry, without adding a fabricated success message or a duplicate conversation turn. Loading and errors are announced, composing Enter is guarded and duplicate sends are disabled while waiting. Drafting remains available without an AI connection. Native controls have visible labels, 44px targets and 16px input text in all three themes.

## Consent and safety integration

The existing consent screen, disclosure, safety assessment and flag callback remain in place. A wrapper observes failure of the primary coach request even when the existing safe-coach helper catches that failure internally. Safety assessment still runs; elevated support text and crisis resources remain available after a failed coach reply. In the fallback path, a local block stops the provider request and uses the existing support response; a nudge adds a support reminder. These checks use mocked provider responses and do not establish the quality of a live model response.

Earlier history and unknown record properties remain stored. Malformed entries are skipped only when displaying the conversation. Optional reflections from other Friendship activities are not inserted into new prompts. Conversations still follow the host's existing storage and disclosure behavior; this pass does not change provider configuration or data-retention policy.

## Learning-design basis

[CASEL's SEL framework](https://casel.org/what-is-sel/) includes communication, considering others, evaluating choices and seeking support across developmental stages and contexts. Those broad skills inform the authored prompts and review questions. This interface is not a validated assessment, and prompt wording cannot guarantee a model's behavior or a relationship outcome.

Evidence is recorded in `reports/sel-friendship-coach`. No live provider call, push, deployment or packaged build is included.

Validation: all 74 unique selected checks passed on the first run: 18 focused browser cases, five control contracts, 16 existing safety-layer tests, 28 Ways to Care regressions, three actual-hub workflows and four targeted Friendship theme checks. All 72 SEL tools rendered. Three scoped axe scans found no violations; nine 320px phone captures were reviewed across light, dark and high contrast. Source/public byte parity, syntax and scoped whitespace passed. Filtered cases and render enumeration are excluded. Provider replies and safety assessments in browser tests were mocked; no live model quality claim is made. No push, deployment or packaged build.
