# Planning-context resilience
Date: September 19, 2026

Guide generation now tolerates several malformed imported-resource shapes without losing the valid planning material beside them.

## Fixed behavior

- An object-shaped glossary or a null concept-sort category no longer throws during context collection. Usable terms and category labels survive mixed arrays; wholly unusable lists do not produce empty planning summaries.
- A null or malformed analysis reading level no longer throws or produces object/undefined text.
- Quiz question strings and timeline item strings are no longer counted as lists of questions or events. Malformed reflection lists no longer contribute character counts.
- Unusable image prompts and unrecognized writing-scaffold modes do not create misleading type-specific summaries.
- Invalid input settings and History containers are handled safely. A malformed explicit scope does not silently fall back to another lesson's ambient History.
- Standards supplied through fallback settings are not attributed to an unusable alignment report.
- Invalid inventory resource types no longer crash manifest generation; non-text titles receive the existing untitled-resource fallback.
- Directly supplied source text is identified as an unsaved input in the disclosure. It is no longer described as deleted, and no resource-opening link is guessed for the reserved input identity.
- Saved resource objects are not mutated by collection. Existing generic reading-reference behavior is preserved.
- Export regression tests now invoke the current shared host-handler factory instead of assuming export logic still lives inline.

## Verification

**120 tests passed across five suites.** These cover malformed and mixed imports, captured-input comparisons, saved maps, instructional reading roles, and lesson-plan copying/printing.

**15 browser cases passed** at 1280, 390, and 320 pixels: changed inputs, missing/ambiguous inputs, local excerpts, legacy guides, and direct source input. Keyboard disclosure controls and resource-opening behavior passed; no horizontal overflow, page errors, or automated accessibility violations were detected. The direct-input phone layout was also visually inspected.

**11 healthy-input parity cases passed.** Comparing the original and refined collectors produced exactly the same context and inventory text for each well-formed fixture, including a complete resource kit and direct source input.

All three affected runtime modules match their desktop public copies. Source and host JSX syntax checks passed. Hosted cache versions were updated while desktop relative module paths were retained. Scoped whitespace checks passed.

Evidence:

- [Validation](validation.json)
- [Tests](tests.json)
- [Browser checks](browser.json)
- [Healthy-input parity](healthy-parity.json)
- [Direct-input phone screenshot](direct-320.png)

## Limits

These safeguards handle the planning collector's input shapes; they do not repair imported resources or verify their educational content. Reading-origin reconstruction and explicit reviewed-version acknowledgement remain separate work.

Changes are local. No deployment or external AI request was performed.
