# Remediation pipeline: confirmed improvement opportunities

This review identified seven opportunities through local configuration inspection and reproducible probes. Application code, permanent tests, manifests, and CI configuration were not changed. Evidence and diagnostic scripts are retained in this directory.

## Recommended order

| Priority | Finding | Why it matters | Suggested change |
| --- | --- | --- | --- |
| P1 | Fresh CI setup omits required desktop React dependencies | The remediation job can fail preflight before any tests run. | Install the required desktop harness before validation and verify setup from a fresh dependency environment. |
| P2 | MCP calibration omits 12 migrated browser checks | Its successful Vitest discovery hides lost native-browser coverage. | Include both replacement Playwright suites and check that selected paths exist. |
| P2 | Data-cell and row roles can be removed or replaced | Visible table values survive while their accessibility structure changes. | Preserve effective row and cell semantics, with controls for valid explicit roles and header promotion. |
| P2 | Form submission targets are not preserved | Submitting a repaired document can replace the main document instead of updating its feedback iframe. | Compare effective destinations after submitter, form, and document-base precedence. |
| P2 | Requested SVG link destinations can compare equal incorrectly | Different links serialize as the same empty object; export acceptance can pass. | Resolve namespace-aware destinations, including `xlink:href`, and reject unavailable URL observations. |
| P2 | Requested language checks miss SVG inheritance and reject equivalent casing | A real language change can pass; equivalent language tags can require unnecessary review. | Compare effective inherited language with correct namespace precedence and case normalization. |
| P2 refinement | Hard-wrap payloads depend on rendered CSS | A width or font repair can change submitted newlines while text, wrap mode, and columns remain identical. | Compare rendered submission payloads where preservation is required; review intentional changes instead of freezing CSS. |

## 1. Fresh CI setup

The `remediation-preservation` job at `.github/workflows/verify.yml:51-65` installs root dependencies and Chromium, but does not install the nested desktop React/ReactDOM files required by `dev-tools/remediation_validation.json:91-92` and selected tests. The root installation does not install that nested project.

A local missing-path reproduction invokes the actual validation preflight and fails with `A required validation input is missing`, with zero test-runner calls. This is a configuration audit plus local reproduction, not an observed GitHub failure or a complete clean installation. The existing missing-input guard is correct and should remain.

[Dependency and calibration evidence](validation/README.md) · [Failed preflight summary](validation/missing-desktop-dependencies/summary.json)

## 2. MCP calibration coverage

`package.json:13` still selects the deleted `tests/doc_pipeline_focus_wrap_browser.test.js`. Actual Vitest discovery exits successfully with 20 discovered files for 21 filters. The command does not invoke the replacement Playwright suites: `document_focus_wrap.spec.ts` contains nine checks and `document_static_crop_cleanup.spec.ts` contains three. The shared `verify:remediation` command already includes these suites; the omission is specific to MCP calibration.

Restore both browser suites to calibration, remove the stale selector, and add a command-contract check for selection existence and runner coverage. The audit used test discovery only for this finding.

[Calibration discovery evidence](validation/README.md)

## 3. Table row and data-cell semantics

The source gate protects table and header roles around `doc_pipeline_source.jsx:10838-10868`, but does not compare existing row and data-cell roles. Three candidates pass both the strict gate and actual `aiFixChunked` with mocked model transport:

- Adding `role="presentation"` to a data cell removes its exposed cell role.
- Adding `role="button"` to that cell changes its exposed role to button.
- Adding `role="presentation"` to its row removes the row role and changes its descendant data-cell semantics.

Chromium's accessibility tree confirms each structural change while the visible numeric text remains intact. Controls adding equivalent `cell`, `row`, or a valid fallback role retain the original semantics and pass. Compare effective semantics rather than raw role strings, and retain legitimate data-cell-to-header improvements.

[Six-case native and pipeline evidence](table-role-results.json) · [Reproducible probe](table-role-probe.cjs)

## 4. Effective form destinations

The form-state inventory at `doc_pipeline_source.jsx:10938` and comparison around line 11023 omit `target` and submitter `formtarget`. Removing a form's `target="feedback"`, or adding `formtarget="_self"` to its submitter, passes the gate and mocked-transport pipeline. Chromium assigns the intercepted submission request to the main document instead of the named feedback iframe, despite the same URL and payload.

Controls confirm that equivalent explicit targets should remain accepted. Preserve effective destinations, including applicable document-base defaults, rather than requiring literal attribute equality.

[Form evidence and controls](forms/README.md)

## 5. SVG link destinations

At `dev-tools/rendered_document_fidelity.cjs:170`, SVG anchors return an `SVGAnimatedString` for `el.href`. It serializes as `{}`, so two different absolute destinations compare equal. Changed relative `xlink:href` destinations also pass. Native intercepted clicks confirm that the targets differ; the selected absolute-link case also passes actual post-export acceptance incorrectly.

Resolve the SVG string value and effective base URL, preserve relative-reference evidence where required, and treat an unavailable destination as unavailable rather than equal. A harmless class-change control passes with its destination intact.

[Rendered comparison and export evidence](rendered/README.md)

## 6. Effective language

At `dev-tools/rendered_document_fidelity.cjs:176`, language collection reads only the closest `lang` attribute and compares its original capitalization. An inherited SVG `xml:lang` change from French to German passes rendered comparison and actual export acceptance; Chromium's native `:lang()` matching confirms the effective language changes. Conversely, `en-US` to `EN-us` is equivalent in Chromium but fails the checkpoint.

Collect effective language using namespace-aware inheritance and attribute precedence, including explicit empty resets; normalize tag casing before equality. These checks concern explicitly requested checkpoint properties, not unrequested whole-document coverage.

[Language probes and valid controls](rendered/README.md)

## 7. Hard-wrap submission payloads

The source gate preserves hard-wrap mode and effective columns around `doc_pipeline_source.jsx:10986`. Chromium also uses rendered width and font when producing submitted textarea values. Two CSS-only changes pass both source acceptance paths while changing the resulting newline positions. Controls for soft wrapping and a color-only change preserve the payload and pass.

This needs a rendered verification or review policy: accessibility repairs may legitimately change font or layout. Blanket CSS equality would reject useful repairs. The source gate alone cannot infer arbitrary rendered or external CSS geometry.

[Exact payload measurements and controls](forms/README.md)

## Validation scope

The native review exercised 20 targeted Chromium cases across table, form, and rendered-checkpoint probes: ten harmful candidates incorrectly passed, nine benign controls passed, and one equivalent-language control was incorrectly rejected. Two selected rendered cases also exercised actual export acceptance, and both incorrectly passed. Table and form probes used actual pipeline code with mocked model transport. Implementation hashes stayed unchanged during the probes.

The CI and calibration review used configuration inspection, actual missing-input preflight, and runner discovery. No full regression suite, live model calibration, GitHub job, cross-browser run, or human assistive-technology evaluation was performed in this analysis turn. Native navigation requests were intercepted and aborted; no form data was sent to external servers.
