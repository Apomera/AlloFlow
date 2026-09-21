# Native form preservation enhancements

Implemented two confirmed form-preservation fixes in `doc_pipeline_source.jsx` and added 63 shared source/candidate fixtures exercised by both unit and native Chromium tests.

## Named control collisions

Named fields such as `<input name="noValidate">` can shadow browser DOM APIs on their containing form. Before the fix, adding `novalidate` to that form passed the strict gate and shipped through mocked `aiFixChunked`; native submission of an empty required field changed from blocked to submitted. A harmless class repair with `<input name="matches">` also falsely failed as uncheckable.

The strict gate now uses trusted native getters for form state and structural reads, plus prototype calls for element methods. Reading-order ancestry also uses native getters, preventing named `parentNode`/`parentElement` fields from corrupting traversal. Controls retain their original names, form ownership, and submitted values. The getter change is scoped to form elements, preserving SVG and MathML property behavior.

Sixteen shadowing names have paired harmful validation-bypass and valid class-repair fixtures, including `noValidate`, `matches`, `getAttribute`, `hasAttribute`, `tagName`, `querySelectorAll`, `parentNode`, `parentElement`, `nodeType`, `childNodes`, `textContent`, `style`, `hidden`, `method`, `form`, and `attributes`. An SVG naming control verifies that safe native access does not reject valid SVG labels. A named `method` control verifies that target changes remain inert for native dialog submissions.

## Submission encoding

Before the fix, changing `accept-charset="UTF-8"` to `windows-1252` passed both acceptance paths. Chromium POST serialization of unchanged `café` changed from `answer=caf%C3%A9` to `answer=caf%E9`.

The gate now preserves effective requested submission encodings, resolving aliases, case, ordered fallbacks, legacy comma separators, and UTF-16-to-UTF-8 submission behavior. Unsupported-only lists retain document-encoding fallback. `x-user-defined` is explicitly handled because Chromium supports it while Node's decoder does not; its native `café` submission uses a numeric character reference. If a runtime lacks TextDecoder entirely, raw normalized labels remain conservatively distinct.

This protects encoding changes. It does not assert that DOM FormData string entries alone represent encoded network bytes, and it does not freeze unrelated layout or style changes.

## Replacement-encoding review follow-up

Independent review identified six supported labels that TextDecoder rejects even though native form submission selects them: `csiso2022kr`, `hz-gb-2312`, `iso-2022-cn`, `iso-2022-cn-ext`, `iso-2022-kr`, and `replacement`. The gate now maps these to UTF-8 before decoder lookup, retaining first-supported-label priority. This follows the [WHATWG labels](https://encoding.spec.whatwg.org/#names-and-labels) and [output-encoding rules](https://encoding.spec.whatwg.org/#output-encodings).

Sixteen additional fixtures cover harmful fallback changes and equivalent UTF-8 replacements for every alias, plus mixed-case replacement, unsupported UTF-7 fallback, and Kelvin-sign lookalike controls. Alias normalization uses ASCII-only folding, so `iso-2022-Kr windows-1252` falls through to Windows-1252 as Chromium does. All 63 native-contract unit cases and all 63 Chromium cases passed after the final ASCII-folding adjustment; Chromium used zero retries. Final observations are retained in `replacement-ascii-native-tests/`; the preceding 61-case run remains in `replacement-native-tests/`. Policy stays `20260920-3`; generated bundles are rebuilt by the root agent.

## Verification

- Before the replacement-label follow-up, 230 unit tests passed across the new native-contract suite and the existing AI-fix, form-context, form-values, and form-association suites.
- Before the replacement-label follow-up, 144 Chromium tests passed across native-contract, form-context, and form-values suites, with zero retries.
- The 63 new fixtures pass through the real strict gate and real `aiFixChunked` with mocked model transport, and compare native submission behavior for source, candidate, and accepted output.
- Native encoding checks intercepted requests before transmission; validation checks canceled submit events. No external server, live-model, or human assistive-technology testing was performed.
- Source and permanent test files use LF; targeted `git diff --check` passed.

Files:

- `tests/fixtures/remediation_form_native_contract.json`
- `tests/remediation_form_native_contract.test.js`
- `tests/e2e/remediation_form_native_contract.spec.ts`
- `tests/remediation_form_association_index.test.js` (existing isolated harness now includes the native helper dependencies)
- `native-tests/` contains native observations from the 144-case run.
- `results.json` contains the six-case initial post-fix probe (not a record of pre-fix gate decisions).

The root agent owns policy versioning, generated bundle rebuilding, manifest integration, and combined validation.
