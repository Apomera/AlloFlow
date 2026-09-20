# AlloPack answer and reference safeguards — 2026-09-19

Generated AlloPacks now reject two previously accepted failure cases: directions that link to nonexistent resources, and sequence questions whose correct ordering principle cannot be selected. The catalog answer audit also checks every quiz and math resource instead of stopping at the first of each type.

## Generation changes

- Directions objectives require unique nonempty IDs and visible labels. Existing manual/game/XP kind and XP amount checks remain.
- Optional objective `resourceRef` and `lessonRef.resourceId` must resolve to a resource in the completed pack. Forward references are accepted. Manual goals without a resource link remain valid.
- Malformed reference objects and empty references produce field-specific validation errors rather than being silently retained.
- Sequence questions must offer their exact `orderingPrinciple`. Custom choice lists need at least two distinct choices. Omitted lists use the native renderer's default principles; unsupported custom keys require explicit choices.
- A `null` misplaced-item marker is accepted for a sequence whose displayed order is correct, matching the native editor's representation.
- Multi-select, answer/evidence, relationship-repair, and sequence choice sets now reject duplicate labels after trimming and case normalization, consistent with the existing MCQ rule. Answer matching remains exact.
- The authoring prompt states the new reference and sequence requirements. The root module and desktop public mirror are identical.

The checks run through both direct composition and provider-generated output. A provider-level regression verifies that a dangling reference returns a failed result with no usable pack.

## Catalog audit changes

`dev-tools/lib/allopack_answer_integrity.cjs` checks all quiz and math activities. It covers implicit MCQs, exact unambiguous keys, duplicate choices, both `shortAnswer` and `short-answer`, numeric zero, and worked explanations. It reports resource/question paths and malformed rows without throwing.

Answer guides must contain nonempty text; an arbitrary minimum character count no longer rejects a concise correct answer. This audit does not judge whether the explanation is sufficient for a particular lesson. Existing content review remains necessary.

Regression fixtures specifically put a broken key in a second quiz and a missing answer in a second math activity, preventing a return to first-resource-only coverage.

## Current-catalog result

The expanded checks passed for all 105 pack files:

- 105 quiz resources / 737 questions.
- 20 math resources / 114 problems.
- 385 directions goals.
- No answer-structure, goal-identity, or reference errors found.

No existing pack content or artwork needed modification in this pass. The stricter generated-draft validator still intentionally excludes resource types and embedded images outside its text-draft contract; the catalog audit does not claim that all illustrated packs can be round-tripped through that endpoint.

## Verification and scope

All 241 tests passed across eight suites covering generation, formatting, native quiz contracts, catalog answer integrity, edition consistency, Body Systems, and instructional-context orchestration. Module mirror and whitespace checks also passed.

See `answer-and-reference-validation.json` for the catalog counts and `scratch/pack-boundary-tests.log` for the regression suite. Reproduce the catalog audit with `node dev-tools/verify_allopack_answers_and_references_20260919.cjs`.

These are structural safeguards, not factual verification, full semantic reference compatibility, or a signed-in live-library test. A goal can resolve to an existing activity while still being pedagogically inappropriate; educator review is still needed. Current checks cover catalog MCQ/written-response/math answer structure, while advanced native quiz contracts are tested at the generation boundary.

Changes are local. No commit, deployment, upload, or live-catalog publication occurred.
