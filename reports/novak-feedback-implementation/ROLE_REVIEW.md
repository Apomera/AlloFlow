# Novak follow-up: instructional roles and remaining improvements

Date: 2026-09-19. Read-only review of the current local implementation. Application code was not changed in this review.

The role/form model is appropriate, but role decisions are not yet applied consistently across creation, persistence, downstream generation and delivery. This consistency work is the next priority.

## Recommended teacher-facing model

The passage has a form and a use in the current lesson. Analyze Source Text is a teacher workflow, not an instructional role.

| Reading | Form shown to teacher/student | Default use |
| --- | --- | --- |
| Newly selected main source | Original text | Main text; teacher can choose supporting reference |
| Same source opened with reading supports | Original with supports | Inherit the source's use in this lesson |
| Adapted companion | Adapted text | Supporting version |
| Intentionally designated adapted main reading | Adapted text | Main text for the chosen lesson/assignment, after explicit teacher choice |

Use separate badges such as "Original with supports · Supporting reference". Show the same teacher control on the source analysis and reader. Students need clear reading labels and access to the original, while role editing stays teacher-only. Preserve the ability to have multiple main readings in one lesson.

## Verified gaps

1. **Opening supports can change instructional use.** `createSupportedReading` always assigns primary (`instructional_context_module.js:236`). `handleReadOriginal` passes no source role (`AlloFlowANTI.txt:38617`). An explicitly supplemental source can therefore become a primary reader copy. Opening a reader should not silently change a teacher's designation.
2. **Automatic pairing can create a conflicting primary.** Delivering an educator-authorized adapted primary without its separate original reader synthesizes another primary original (`instructional_context_module.js:274–289`). If both are intentionally main readings, that should be explicit in the lesson context; otherwise preserve the source's intended reference/support use. Retaining source access and assigning instructional use are separate decisions.
3. **Activity source selection and role audits can disagree.** Normal generation's shared source selector uses the latest analysis rather than the educator-designated primary (`generate_dispatcher_source.jsx:97–117`). Full Pack similarly selects the latest analysis (`generation_helpers_source.jsx:2310–2318`). A read-only probe with supplemental analysis + authorized primary adaptation selected the analysis for a quiz, while the audit selected the adaptation as primary. Explicit source overrides/snapshots work, but saved role choices alone are insufficient.
4. **Older context consumers bypass the new preservation contract.** `export_handlers_module.js:2886–2890` can report no primary when an adaptation holds a valid captured source; it can also accept a false same-text-supported claim as primary without checking exact preservation. Other export evidence paths do validate preservation, so the same history produces different answers. Audit collection also accepted a deliberately mismatched supported-original fixture into primary/support evidence (`generate_dispatcher_source.jsx:844`, `:1828`), even though the preservation contract rejected it.
5. **Source inference varies across surfaces.** The shared contract infers an analysis containing original text as workflow-primary (`instructional_context_module.js:642–645`). History's local fallback defaults absent metadata to unspecified (`view_history_panel_source.jsx:385`), and cloud normalization does not preserve that inferred designation (`firestore_sync_module.js:438`, `:677`; analysis creation at `generate_dispatcher_source.jsx:8599`). A read-only round-trip probe changed an unprofiled analysis from primary to unspecified. Explicit saved roles survived. Persist explicit defaults at creation and use one normalization policy everywhere; avoid rewriting existing explicit educator choices.
6. **Form badges obscure role changes.** Both the reader (`view_simplified_source.jsx:2127`) and history (`view_history_panel_source.jsx:451–455`) show Original with supports regardless of its primary/supplemental/unspecified role. This makes a correct stored change hard to see.
7. **Review is too global.** Export checks whether the whole pack has any primary (`doc_pipeline_source.jsx:44647–44651`; `view_export_preview_source.jsx:8327`). A source from lesson A can suppress a missing-source warning for companion B. Validate each reading relationship within its lesson scope.

8. **Reader reuse is not lesson-scoped.** `handleReadOriginal` deduplicates by text and fingerprint without unit/source identity (`AlloFlowANTI.txt:38616`). The same excerpt reused in a different lesson can reopen the first lesson's reader and role. Retain exact-text deduplication within an appropriate lesson/source context.

## Proposed implementation order

1. Establish a shared resolver that distinguishes exact source/version identity, reading form, teacher-designated use, original availability and the chosen activity input. Scope resolution to the current lesson/source relationship, not the whole history. A fingerprint establishes text equality; it does not establish lesson ownership.
2. Persist the new-source default explicitly. Make supported copies inherit explicit source roles. Keep adapted companions supplemental by default and preserve explicit teacher exceptions. Apply the same rules to pairing, save/reload, exports and audits.
3. Add a consistent "Use in this lesson" selector to source analysis and the reader, and show both form and use. Role changes should remain visible after switching views and reopening the project.
4. Have quizzes, glossary generation, other activities and Full Pack use the same resolver. Display "Based on: [passage title/version]" before generation; let a teacher choose the particular reading when multiple relevant sources exist. Do not silently choose a global latest primary.
5. Validate source access per companion, and verify supported-original claims everywhere they are consumed.

## Acceptance cases to add

- An explicitly supplemental analyzed source stays supplemental when opened with supports and after save/reload.
- An authorized adapted main reading is used consistently when selected for activities and audits.
- An unchanged source reader preserves the same role when delivered alone, with its adaptation, or reconstructed from a captured source.
- The same excerpt can be reused with different roles in different lessons without reopening another lesson's reader.
- Multiple main source texts remain valid; the chosen activity input is explicit.
- A primary from another source relationship cannot satisfy a companion's missing-original check.
- A changed or incomplete artifact cannot gain a supported-original claim through metadata alone.
- Form and role labels remain consistent in analysis, reading, history, exports and student delivery.

## Further feedback-driven improvements

After role consistency, prioritize live literary gloss evaluation using the Macbeth passage from the feedback, plus poetry, dialogue, idioms and multilingual passages. Check contextual meanings, useful coverage and unchanged source wording. Add a teacher path to review/edit/remove individual glosses, and prefer a usefulness-based lighter density over simply selecting every other gloss. Existing model-response tests are mocked; they do not establish live pedagogical quality.

Then consider optional paragraph-to-paragraph navigation in Both. It should help a reader find the corresponding original passage even when the adaptation changes paragraph structure. Keep clean reading and optional change markings.

## Validation from this review

The existing instructional-context, role-UI and downstream-text suites passed 28/28. Independent read-only runtime probes reproduced the role-inheritance, role/source-selection and context-validation inconsistencies above. Passing existing tests does not cover these missing scenarios; add the acceptance cases before the next implementation is considered complete.
