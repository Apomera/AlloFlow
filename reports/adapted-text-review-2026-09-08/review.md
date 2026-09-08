# Adapted Text enhancement review

September 8, 2026. Review of current local source; application files were not edited. Existing source and generated-module changes were preserved.

## Priority improvements

### 1. Preserve document structure across reading modes

The editor offers headings, bullets and numbered lists, but the ordinary reader creates paragraph wrappers and styled sentence spans. Its shared inline formatter supports emphasis, links and math, but does not build lists. Headings look like headings without becoming semantic heading elements. Explain/Revise strips emphasis and displays plain paragraph text.

Use one block representation for headings, paragraphs, lists, quotes and tables, with stable sentence anchors inside it. Preserve meaningful line breaks and list indentation. Keep the same structure in ordinary, bilingual, selection and export views while letting reading supports decorate it. Do not automatically split arbitrary prose into new paragraphs.

Evidence: [reading renderer](../../view_simplified_source.jsx:2514), [editor toolbar](../../view_simplified_source.jsx:2313), [inline formatter](../../phase_n_misc_helpers_source.jsx:324).

### 2. Fix table content disappearing in side-by-side reading

The side-by-side branch replaces table paragraphs with empty sentence arrays and renders only those arrays. The stacked branch explicitly renders tables. Switching layout should not remove instructional content.

Render table blocks directly in each column; retain cell headers and horizontal scrolling where needed. Keep table treatment distinct from sentence indexing so fixing display does not misalign read-aloud audio.

Evidence: [side-by-side row rendering](../../view_simplified_source.jsx:2393), [stacked table handling](../../view_simplified_source.jsx:2424).

### 3. Make bilingual actions consistently usable by keyboard

In stacked bilingual reading, sentence spans have click handlers but lack the role, tab stop and Enter/Space handler used in the ordinary reader. Quick-add glossary spans in the stacked source/translation branches have the same gap. Existing dialog/focus tests do not establish parity for these branches.

Unify sentence and word action components across layouts. Add keyboard activation and visible focus for the missing controls. For longer passages, provide a way to skip the passage controls or navigate words within a selected paragraph, avoiding hundreds of sequential tab stops. Preserve ordinary text selection and screen-reader reading.

Evidence: [stacked glossary actions](../../view_simplified_source.jsx:2465), [stacked sentence action](../../view_simplified_source.jsx:2505), [ordinary sentence keyboard behavior](../../view_simplified_source.jsx:2560).

### 4. Extend multilingual segmentation beyond Focus Reader

Define/Phonics still divide paragraphs using whitespace. The shared sentence splitter recognizes English-style sentence endings and abbreviations, rather than Chinese/Japanese full stops or other language-specific sentence rules. Unspaced text can therefore become one large word-help target and one long read-aloud unit.

Use the resource's saved language for word and sentence segmentation, with safe fallbacks and preserved punctuation, citations, math and source offsets. Keep all audio consumers on the same sentence mapping. Reuse the multilingual groundwork already implemented for paced reading rather than creating another unrelated tokenizer.

Evidence: [word-help segmentation](../../view_simplified_source.jsx:2536), [sentence splitter](../../pure_helpers_source.jsx:135), [completed paced-reading work](../../docs/reading-tools-additions-2026-09-07.md).

### 5. Keep bilingual language identity accurate

Side-by-side source labels use the current `leveledTextLanguage`, while text direction consults the saved artifact language first. Reopening a saved reading after changing generation settings can therefore label it with the wrong language. Pairing is also based on paragraph array position, so mismatched paragraph counts need an explicit alignment policy.

Resolve labels, direction, pronunciation and word help from each saved language segment. Add appropriate language attributes to passage regions. Preserve paragraph-pair identifiers when generating translations and clearly show an unmatched paragraph instead of implying a false pair.

Evidence: [side-by-side labels and direction](../../view_simplified_source.jsx:2392), [row pairing](../../view_simplified_source.jsx:2319). Paragraph-pair identifiers are a design proposal; this review does not claim every generated translation is misaligned.

### 6. Make comparison more useful for teacher review

Current comparison highlights word additions/removals and, for bilingual content, selects `targetFull`. That choice can produce an unhelpful cross-language comparison depending on the original source language. The shared diff also allocates a full word-by-word comparison matrix, which grows rapidly for long readings.

Offer an explicit language/version pair and align comparable source/adapted sections. Show a concise review summary covering retained concepts, changed terminology, omitted examples and citation status, with links to evidence in both texts. Reuse existing source linkage, citation conservation, instructional-role and rigor checks; do not present an AI summary as verified accuracy. Use a bounded or off-main-thread diff for long texts.

Evidence: [comparison renderer](../../view_simplified_source.jsx:2290), [diff implementation](../../pure_helpers_source.jsx:192), [existing instructional contract](../../docs/instructional-text-and-standards-contract.md).

## Additional product opportunities

- **Simpler student entry point:** the reader exposes many interaction modes. Keep Read, Listen and Word help easy to find; group less frequent practice and teacher actions with short explanations. Validate the arrangement on phones and with enlarged text before changing it.
- **Adjustable reading column:** ordinary adapted reading currently uses a fixed maximum of 72 characters. Offer the existing library's narrower column choices, maintaining learner preference scope across readers.
- **A connected reading journey:** make the existing Read & reflect, saved vocabulary and Listen-try-reread features easy to reach from the relevant paragraph. These features are already implemented; the opportunity is better in-context discovery, not a second notebook or duplicate practice tool.

## Verification and limits

`check.cjs` compiles the current view source in memory and renders isolated fixtures with React. It uses the production inline formatter and sentence splitter. Its table renderer is a sentinel stub to check whether content reaches rendering, not to evaluate table appearance. See `results.json` for observed results.

The review also inspected the existing accessibility tests and recent reading-tool implementation reports. It is not a complete end-to-end browser, screen-reader, export or classroom evaluation. No application changes, deployment, live AI calls or learner-data changes were made.

Recommended order: content retention and structure first; keyboard and multilingual parity next; teacher comparison and discovery after that.

### Observed fixture results

- Heading/list fixture: zero semantic headings and zero list elements. The whole-line bold phrase was normalized into a styled heading, so its zero `<strong>` count is not evidence that ordinary inline bold is broken.
- Table sentinel: retained in stacked reading; absent in side-by-side reading.
- Both stacked bilingual sentence controls and all four tested quick-add glossary controls lacked roles and tab stops. Source inspection also confirmed the missing key handlers.
- Two Chinese sentences without spaces produced one sentence unit and one definition target.

The isolated rendering check completed successfully. These observations confirm the targeted rendering/segmentation gaps; they do not constitute a full application test pass.
