# Saved planning-input comparison
Date: September 19, 2026

Saved lesson plans and guides can now show whether the recorded planning contributions still match the same resources in the current library. The existing input disclosure contains the comparison; no extra AI call or save action is required.

## Refinements

- Compare the exact recorded resource ID and type, never the latest resource of a matching type. Show changed, matching, missing, ambiguous, or unavailable states for each contribution.
- Compare nine supported summary categories using the real context builder: analysis, standards, vocabulary, image prompts, assessment counts, writing scaffolds, sequence counts, concept-sort categories, and adventure availability.
- Compare recorded inventory entries separately, including names, IDs, usage text, and quiz concept labels actually included by the inventory builder. Inventory availability is not proof that a model used an asset.
- Preserve the recorded local-model excerpt length. Changes beyond that captured portion and resources omitted after the cutoff do not create false notices.
- Ignore unrelated resources, timestamps, learner answers, glossary definitions, and quiz wording where those fields were not included in the captured contribution.
- Treat unresolved reading-selection settings, unsaved source-input origins, missing fingerprints, unsupported versions/projections, malformed data, and unavailable comparison tools conservatively.
- Calculate comparisons only when the disclosure opens. Preserve the open comparison across parent rerenders, refresh when History changes, and announce summary status changes politely.
- Do not offer a resource-opening button when the saved ID resolves to a different resource type. Missing and duplicate IDs remain visible without guessed links.
- Keep the original generation record, manual guide edits, and teaching-script data unchanged.
- Update earlier map regression tests to invoke the current extracted host handlers and verify real context trace forwarding.

## Validation

138 tests passed across the new input-comparison suite, the saved-map/planning regression suite, and the lesson-plan refinement suite. All three files were explicitly checked for successful test collection.

12 browser cases passed: changed inputs, missing/ambiguous resources, local excerpts, and legacy guides at 1280, 390, and 320 pixels. Checks covered Enter/Space disclosure controls, opening the correct resource, unavailable links, horizontal overflow, page errors, and automated WCAG A/AA accessibility rules. No page errors or axe violations were detected. The narrow phone layout was also inspected visually.

Both generated modules match their desktop public copies. All three host files parse as JSX. Hosted module cache versions were updated; desktop relative module paths were preserved. The scoped whitespace check passed.

Evidence:
- [Validation](validation.json)
- [Test results](tests-final.json)
- [Browser results](browser.json)
- [Phone screenshot](teacher-320.png)

## Coverage limits

This is a conservative comparison of recorded contributions, not full teaching-material diffing or a claim that a guide is accurate or up to date. Version 1 records do not preserve enough reading-selection/origin settings to reconstruct those contributions reliably, so those rows remain unavailable. Partial local contributions compare only the originally recorded number of characters.

Explicit reviewed-version acknowledgements and reliable reconstruction of reading-origin settings remain outside this pass. No automatic rewriting, generation, deployment, or external data transfer was added.

Changes are local.
