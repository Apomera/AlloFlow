# Rendered evidence refinements — 2026-09-20

Implemented two bounded refinements in explicitly requested rendered checkpoints, with shared export dependency parity retained.

## Confirmed before the change

1. **Named form controls could replace DOM evidence.** A control named `textContent` made the form's `text` checkpoint compare `[object HTMLInputElement]` on both sides, so changed visible instructions falsely passed. A control named `attributes` concealed a form's `onsubmit` attribute from the shared dependency scanner, so script-dependent content falsely passed. A control named `tagName` also made otherwise valid `formData` checkpoints unavailable. Native Chromium confirmed the real text, attributes, and payloads. The corresponding ordinary-name controls produced the correct verdicts. Evidence: [text cases](text-clobber-results.json), [dependency cases](dependency-clobber-results.json), and [form cases](results.json).
2. **SVG same-document link targets were unavailable.** `targetText` read HTML-only anchor URL properties, so valid SVG links could not preserve or compare their target text. Chromium successfully navigated the links to the intended fragment; equivalent HTML links produced correct passed/failed comparisons. Evidence: [SVG and HTML controls](results.json).

The pre-change probes cover 14 comparisons. They use isolated Chromium 148.0.7778.96 and do not send document network requests. Original probe outputs are preserved.

## Changes

- Rendered inspection reads native prototype descriptors and invokes native Element methods. Form-control names and IDs can no longer replace text, tag identity, ancestor/child traversal, language lookup, visibility checks, or applicable value/checked properties.
- The shared dependency scanner reads native attribute and style collections, preserving script/resource findings in both baseline export checks and rendered comparison.
- `targetText` uses the existing HTML/SVG destination resolver, including SVG `href`/`xlink:href` precedence, authored bases, and encoded fragments. External destinations, missing element-ID targets, and undecodable fragments remain unavailable.
- The opt-in `formData` contract is unchanged. Tests and docs explicitly retain valid author names rather than requiring documents to rename their fields.

## Verification

The new suite has 42 native/export regression cases, with harmful-change and valid-repair controls. It also verifies actual native fragment navigation, DOM-property shadowing, shared dependency behavior, and export verdict propagation.

The initial focused run exposed a new test-fixture omission (the required main landmark), which was corrected; its failure artifacts remain in `../rendered-focused`. Final combined focused results are stored in [rendered-focused-final/results.json](../rendered-focused-final/results.json), covering this new suite and five existing rendered/dependency parity suites. No live model or human screen-reader test was performed.

Final result: **174 passed**, zero failed/skipped/retried cases, process exit 0. [Compact verification and final file hashes](verification.json). `git diff --check` passed for the owned implementation, documentation, and regression-suite files.
