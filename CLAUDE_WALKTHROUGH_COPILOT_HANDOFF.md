# Claude handoff: Principal Walkthrough Copilot

**Date:** 2026-08-13
**Status:** next bounded feature; not yet implemented
**Scope:** formative walkthrough and coaching support only, never the summative evaluation instrument
**Primary user:** a nontechnical school principal currently completing a locally built walkthrough Google Form that emails each teacher a PDF
**Product goal:** provide immediate value without replacing the school's existing walkthrough workflow

## Outcome

Build an optional, human-controlled Walkthrough Copilot that helps a principal turn shorthand classroom notes into a clear, framework-organized **formative coaching draft**. It must generate text that can be reviewed and copied into the principal's existing walkthrough Google Form. It must not submit the form, assign ratings, make personnel decisions, or alter the source notes.

The first version should work with synthetic data and may run locally without a shared evaluation repository. Any use with real personnel records still requires district approval of the workflow, device, AI provider, and transmission channel.

## Scope boundary: formative coaching, not summative evaluation

This copilot supports **formative walkthroughs and instructional coaching only**. It is not the district's summative evaluation instrument and must never be described, positioned, or configured as one.

That boundary is not established by the label on the product. It holds only while all three of the following are true, and only the school or district can confirm them:

1. **Use.** Output does not feed the summative evaluation, directly or as remembered context that later shows up in a summative narrative.
2. **Retention.** Drafts and delivered feedback are not retained as personnel records. Note that the existing workflow already emails a PDF to each teacher, so copies persist in mailboxes and sent folders regardless of what this tool clears on close. Treat "transient in the app" as a property of the app, not of the workflow.
3. **Local agreement.** The collective bargaining agreement and the district's approved educator-effectiveness plan do not already govern classroom walkthrough observations in a way this workflow would cross. Many agreements cover informal observations, notice, and what may be recorded.

If any of the three fails, this becomes an evaluation tool and belongs in the authenticated, district-approved portal path instead.

### Open question specific to Portland Public Schools (ME)

Condition 1 above cannot currently be assumed at PPS, and this must be resolved with the district before any real-data use.

PPS evaluates on **The Portland Framework for Teaching**, a local adaptation of Danielson with four domains and 22 components, jointly developed with the Portland Education Association. In the implementation guidebook that describes that system, evaluators collect **at least nine pieces of evidence per year**, and the evidence types named there **explicitly include classroom walk-throughs**. Written feedback from a collection of evidence is required to identify whether it came from an observation cycle or an additional collection, to state the evidence collected, and to reference the Framework. Additional collections need not be announced and must be documented in writing within 48 hours, and any evidence used for evaluation or employment decisions must be shared with the educator.

If a walkthrough at PPS counts as one of those collections, it is by design an input to the summative evaluation, and the formative-only framing does not hold there regardless of what the tool is called.

Two consequences for the build:

- Do not ship a claim that walkthrough output is formative and outside evaluation. That is why the formative sentence in the disclosure is separately editable and why only the school can assert it.
- The documentation requirements are a better product fit than generic drafting. A copilot that helps produce written feedback which names the evidence, references the district's framework, marks the collection type, and lands inside 48 hours is solving a real compliance burden. Build toward that shape, and treat the collection-type tag as a first-class field rather than an afterthought.

**Currency caveat:** the guidebook consulted is an early gradual-implementation version and may be superseded. Performance levels in it were unsatisfactory, novice/needs improvement, proficient, and excellent, which differ from Danielson's own level names; an administrator arriving from a Danielson state will expect different labels.

### What the current contract actually says

The controlling document is the agreement between the Portland Board of Public Education and the Portland Education Association, September 1 2025 to August 31 2028. Two parts govern this tool.

**Appendix F, Educator Evaluation.** Educators "shall be evaluated periodically by principals or persons designated by the Superintendent or designee," so the principal is the evaluator. The system comprises professional goal setting, a collection of evidence and written feedback, and a summative effectiveness rating. Critically, the observations, review of evidence, and feedback in an evaluation cycle must "involve communications between the evaluator and educator, be documented, and be evidence-based." An unsatisfactory rating triggers a written improvement plan developed with the educator's input. Appendix F points to the district's **Performance Evaluation and Professional Growth System Guidebook** for detail. Appendix F is itself educational policy rather than a contractual obligation and is not grievable, though the Association reserves the right to bargain the impact of changes.

That last clause matters here. Introducing AI assistance into the evaluation workflow is plausibly an impact the Association could bargain, which is another reason the decision belongs to the district rather than to this tool's author.

**Article 16, Educator Personnel Records.** Two provisions bear directly on the design:

- No material may be placed in an educator's personnel file after original employment "unless the educator has had an opportunity to review the material," and the educator may submit a responding statement. Sharing written feedback with the observed teacher is therefore a required step in the workflow, not a courtesy. Build it as a first-class stage alongside disclosure, not as an export afterthought.
- Observations and evaluation reports "are professional appraisals ... not subject to the grievance procedure unless such reports are used to discipline, dismiss or non-renew." So the moment an observation supports an adverse action, it can be litigated.

That second point is the strongest argument for the truth rules in this document. A fabricated quote, an inferred student behavior, or an unsupported generalization does not merely embarrass the tool; it can surface in a grievance or arbitration as the evaluator's own written appraisal, with the principal defending words the principal did not write. Every citation-to-source-span requirement, every insufficient-evidence result, and every unsupported-generalization warning exists to keep that from happening. Treat those as load-bearing, not as polish.

**Not yet located.** The Performance Evaluation and Professional Growth System Guidebook is not published on the district website, and neither the Human Resources nor Professional Development pages link it or any rubric or walkthrough form. Obtain it from the district before building to any assumed process detail. Note also that district Human Resources currently describes itself as "creating updated, fair evaluation tools across roles" and "reinstating clear evaluation timelines and expectations," so the surrounding process may be actively changing.

Build the product so the safe use is the easy one and the unsafe use requires a deliberate, visible act. Do not rely on this document to hold the line; a reader of the interface will never see it.

**Who decides.** The administrator using the tool owns the labor and policy determination, not the tool's author. When the author is a district employee outside the administrative bargaining unit, that separation should be explicit rather than assumed.

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

## Disclosure to the observed teacher

A teacher who later learns that AI helped draft feedback about them, when nobody said so, will reasonably treat it as something that was hidden. Disclosure is therefore a default of the product, not a per-principal preference.

- Every draft carries a short, plain disclosure line stating that AI assisted in organizing the observer's notes and that the observer wrote and approved the final feedback.
- The disclosure travels with the copy output. Copying a domain field copies its disclosure, and "Copy all" includes it once at the top. It must not be a separate control the user can skip while still exporting.
- Wording is configurable so a school can match its own voice, but the field cannot be emptied. A blank disclosure blocks export the same way an unapproved suggestion does.
- The disclosure states assistance, never endorsement. It must not imply the AI verified, scored, or agreed with anything.
- Suggested default: "Notes from this walkthrough were organized with AI assistance. The observer wrote, reviewed, and approved all feedback below. This is formative coaching feedback and is not part of a summative evaluation."
- The last sentence must be editable separately, because it is a factual claim about local practice that only the school can make truthfully.

## Mode gate: synthetic and approved use

"Phase one is synthetic" is policy prose until the product enforces it. The primary user's day-one intent is to type real notes about a real teacher, so the boundary has to be visible in the interface.

The tool opens in **Demo mode** and stays there until someone deliberately leaves it:

- **Demo mode.** Synthetic fixtures only. A persistent banner names the mode. Copy and export are watermarked with a line marking the content as a demo draft. Suitable for showing the workflow to an administrator, a reviewer, or a staff meeting.
- **Approved mode.** Reachable only through an explicit affirmation naming the district approval that exists: the approved AI provider and data flow, the confirmed formative scope, and the person who approved it. Record that affirmation locally with a timestamp and show it in a persistent banner while the mode is active. Leaving the app returns to Demo mode.

Approved mode changes no analysis behavior. It removes the demo watermark and permits real notes. It is a statement of authorization, not a feature unlock, and it must never be presented as one.

Do not let Approved mode be the remembered default. A principal who approved it once in September should still be told, in March, which mode they are in and under whose authorization.

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
  mode: demo | approved
  approval?: { affirmedAt, affirmedBy, providerApproved, scopeConfirmed }
  framework: {                     // supplied by config, never hardcoded
    id                             // e.g. "danielson-2022", "district-local"
    domains[]: { id, label }       // count and labels vary by model
    components[]: { id, domainId, label }
  }
  disclosure: { text, includeFormativeSentence }
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
  domainDrafts: Map<domainId, draftText>   // keyed by framework.domains
  globalWarnings[]
  principalApproval: { approvedAt?, approvedSuggestionIds[] }
  formOutput?
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

- The tool opens in Demo mode, and only synthetic fixtures load there.
- Reaching Approved mode requires the explicit affirmation; cancelling it leaves the mode unchanged.
- Demo-mode copy and export carry the demo watermark; Approved mode removes only that watermark and changes no analysis behavior.
- The active mode, and in Approved mode the recorded affirmation, are visible without opening a menu.
- Closing and reopening returns to Demo mode rather than remembering Approved.
- The disclosure line is present in every copy path, including single-field copy, and cannot be emptied.
- Export is blocked when the disclosure is blank, with the same clarity as an unapproved suggestion.
- The formative sentence in the disclosure is separately editable and can be removed without emptying the disclosure itself.
- Domains render from the configured framework, so a framework with other than four domains still renders, exports, and flags empty sections correctly.
- No Danielson performance-level language ships in the repository; rubric text loads from configuration.
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

1. Add pure note-analysis schemas, validators, and deterministic synthetic fixtures. Include the framework config so no domain shape is hardcoded from the start.
2. Build the four-stage local UI with a fake provider and immutable-note tests. Build the mode gate and the disclosure in this step, not later: retrofitting a boundary after the workflow feels finished is how it ends up optional.
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
