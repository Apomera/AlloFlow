# Claude handoff: Principal Walkthrough Copilot

**Date:** 2026-08-13
**Status:** next bounded feature; not yet implemented
**Primary user:** a nontechnical school principal currently completing a Google Form that emails each teacher a PDF
**Product goal:** provide immediate value without replacing the district's approved Google Form workflow

## Outcome

Build an optional, human-controlled Walkthrough Copilot that helps a principal turn shorthand classroom notes into a clear Danielson-organized draft. It must generate text that can be reviewed and copied into the principal's existing Google Form. It must not submit the form, assign ratings, make personnel decisions, or alter the source notes.

The first version should work with synthetic data and may run locally without a shared evaluation repository. Any use with real personnel records still requires district approval of the workflow, device, AI provider, and transmission channel.

## Required workflow

1. Accept typed notes and, where the existing AlloFlow speech-to-text path is available, dictated shorthand notes.
2. Preserve the original notes byte-for-byte in an immutable source-note panel. Do not silently clean, summarize, or overwrite them.
3. Create a separate working copy for analysis.
4. Suggest relevant Danielson Framework components, with a short evidence-based reason and confidence/uncertainty indicator.
5. Separate objective evidence from interpretation. Never rewrite an interpretation as an observed fact.
6. Organize supported evidence into Domains 1-4:
   - Domain 1: Planning and Preparation
   - Domain 2: Classroom Environment
   - Domain 3: Instruction
   - Domain 4: Professional Responsibilities
7. Draft concise, respectful teacher-facing feedback.
8. Flag unsupported generalizations, missing evidence, contradictory notes, and empty domains.
9. Produce a plain-text Google Form copy view matching the fields in the principal's current walkthrough form.
10. Require the principal to review and explicitly approve every suggested component and every teacher-facing statement before copy/export. No automatic submission.

## Non-negotiable truth and safety rules

- AI output is a draft, never an evaluation verdict.
- The principal remains the sole author/approver of the submitted observation.
- Do not infer student engagement, preparation, knowledge, professionalism, or instructional quality without concrete recorded evidence.
- Preserve uncertainty. Prefer "The notes do not establish..." over filling a gap.
- A component suggestion must link back to one or more exact source-note excerpts.
- Never fabricate a quote, student action, timestamp, lesson artifact, or observed interaction.
- Do not calculate an annual rating or Pennsylvania Act 13 score in this copilot.
- Do not imply Maine has adopted Pennsylvania's weighting. Jurisdiction policy and rubric selection must remain separate.
- Danielson names/codes may require licensing for commercial digital reproduction. Keep rubric text configurable and do not copy protected performance-level language without confirmed permission.
- Do not send real personnel or student-identifying notes to an AI provider until the district approves that provider and data flow.

## Suggested screen

Use a four-stage review flow:

1. **Capture** — editable note entry plus dictation; show a clear "Freeze source notes" action.
2. **Analyze** — immutable source notes on the left; suggested evidence/component cards on the right. Each suggestion has Accept, Edit, or Reject.
3. **Review feedback** — domain sections show objective evidence separately from interpretation and feedback. Empty or weak sections are visibly flagged.
4. **Copy to Google Form** — a principal-approved, plain-text field map with individual Copy buttons and Copy all. Include Print/Download only if already available locally. Do not automate Google Form submission in this phase.

Every transition must preserve the original source notes. Editing a suggestion must not modify its cited source excerpt.

## Minimal data model

```text
WalkthroughDraft {
  id
  createdAt
  sourceNotesOriginal
  sourceNotesFrozenAt
  context: { teacherDisplayName?, date?, period?, subject? }
  suggestions[]: {
    id
    domainId
    componentId
    sourceSpans[]
    objectiveEvidence
    interpretation
    confidence
    warnings[]
    decision: pending | accepted | edited | rejected
    approvedText?
  }
  domainDrafts: { d1, d2, d3, d4 }
  globalWarnings[]
  principalApproval: { approvedAt?, approvedSuggestionIds[] }
  googleFormOutput?
}
```

For the transient/local version, keep this structure in memory and clear it on close. Do not reuse Class Mailbox, anonymous share links, or browser localStorage for real evaluation content.

## AI contract

The model should return typed JSON, not free-form prose. Validate it before rendering. Require:

- only known domain/component IDs;
- source spans that exactly match the immutable note text;
- bounded strings and array sizes;
- an explicit `insufficient_evidence` result when a claim is unsupported;
- no rating or employment recommendation fields;
- warnings for broad claims such as "students were engaged" when the notes only record one student or one moment.

If parsing or validation fails, retain the notes and show a retry/edit path. Never display invalid model output as approved feedback.

## Google Form compatibility

The example form has these output areas:

- Employee
- Date
- Period
- Principal
- Domain 1 - Planning
- Domain 2 - Classroom Environment
- Domain 3 - Instruction
- Domain 4 - Professional Responsibilities

Make the mapping configurable because schools may rename fields. The initial integration is copy/paste text only. This is deliberately lower risk and immediately compatible with the existing Form-to-PDF process.

## Where it should live

- Add a **Walkthrough Copilot** entry near Educator Evaluation in AlloFlow's Leadership Hub and teacher/admin Settings launcher.
- Reuse the same React surface in a focused desktop/standalone mode when practical.
- Keep it separate from the existing formative UDL Walkthrough; do not relabel that feature as formal evaluation.
- Keep the authenticated Educator Evaluation portal as the later path for two-way comments, acknowledgments, approvals, audit history, longitudinal results, and cohort aggregates.

## Current repository context

Relevant existing work:

- `educator_evaluation_source.jsx` — shared evaluation UI and local synthetic workspace.
- `educator-evaluation.html` and `educator_evaluation_standalone.js` — standalone synthetic preview.
- `apps_script/educator_evaluation/` — authenticated Google Workspace portal pilot; do not treat it as production-ready without completing security review and district tenant validation.
- `admin_hub_source.jsx` — Leadership Hub cards.
- `view_project_settings_source.jsx` — Settings launchers.
- `udl_walkthrough_source.jsx` — interaction precedent only; explicitly formative and not an evaluation system.
- `docs/educator_evaluation_product_architecture.md` — portal architecture and privacy boundaries.

Do not use `apps_script/session_mailbox/` for evaluation records. Its anonymous bearer-link model does not establish teacher/evaluator identity or confidential record authorization.

## Acceptance tests

- Original notes remain exactly unchanged through analyze, edit, copy, cancel, and retry.
- Every suggested claim has a valid source-note citation or is marked insufficient evidence.
- Interpretation and objective evidence are rendered in distinct labeled fields.
- Unsupported generalizations and empty domains are flagged.
- Rejected suggestions never appear in final output.
- Edited suggestions require explicit approval after editing.
- Copy output maps cleanly to all four example Google Form domain fields.
- No submit/send action exists in phase one.
- Closing transient mode clears the working record after a clear warning.
- Keyboard-only and screen-reader users can capture, review, accept/edit/reject, approve, and copy.
- Synthetic examples contain no real teacher or student information.

## Recommended implementation order

1. Add pure note-analysis schemas, validators, and deterministic synthetic fixtures.
2. Build the four-stage local UI with a fake provider and immutable-note tests.
3. Add the existing configured AI-provider seam only after the provider/privacy warning and human-approval gate are enforced.
4. Add configurable Google Form field mapping and clipboard output.
5. Mount the shared surface in AlloFlow and the focused standalone/desktop entry.
6. Run synthetic principal usability testing before proposing any real-data pilot.

## Out of scope for this phase

- Automatic Google Form submission.
- Emailing evaluation content or PDFs.
- Anonymous mailbox links.
- Teacher sign-in or two-way portal communication.
- Durable personnel-record storage.
- Annual ratings, Act 13 calculations, rankings, or cohort comparison.
- Autonomous evaluation or employment recommendations.

Those capabilities belong in an approved, authenticated district deployment—not the immediately usable copilot.
