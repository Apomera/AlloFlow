# MCP remediation calibration — 12 September 2026

The calibration pass found and fixed production defects in repair acceptance, chunk assembly, generated controls, audit payloads and study recovery. Final gates passed **576 remediation tests, 141 MCP calibration tests and 6 workflow checks**, with no skips. These suites overlap and should not be added together as distinct coverage.

This is an engineering calibration and recovery check. No scoring thresholds or canonical severities were changed. The two observed live runs remain **review-required**; the final stored-response replay is a regression check, not a new live accessibility verdict.

## Fixes and regression coverage

- **False source-preservation rejection:** the scanner rejected its own generated static file-picker `:has` selector. It now recognizes that narrow case while preserving strict checks for unsupported selectors. MCP progress also exposes content-free rejection reasons.
- **False continuation rejection:** trimming chunk edges removed a newline between paragraphs and changed the skip-link target's text signature. Normal, image-retry and truncated half-chunk reassembly now retain original boundary whitespace. Actual destination changes are still rejected.
- **Inherited contrast:** white text on a dark control was incorrectly assessed against the white page and changed to low-contrast gray. The fixer now resolves literal inherited backgrounds and leaves unresolved surfaces to rendered checks.
- **Image placeholders:** restoring an image could retain the renderer's own placeholder panel. Cleanup now removes that generated wrapper while preserving real text and unknown nested content.
- **Oversized audit payloads:** restored image data URLs consumed audit chunks. Media attributes are masked before chunking; visible examples, ordinary URLs, scripts and source text remain intact.
- **Focus and reflow:** generated file controls now use a dual-band focus indicator, with a system-color override in forced-colors mode. Long link text wraps without changing its destination.
- **Study resume integrity:** checkpoints now bind to engine, provider, driver and runtime identity. A mismatch is rejected before another provider call or checkpoint mutation.
- **Reviewer-packet recovery:** completed runs can retry packet finalization from verified immutable artifacts without repeating model work; altered evidence is rejected.
- **Unsupported editor controls:** static output retained Adjust Crop after its script was removed, while browser sanitization retained Replace after removing its handler. Cleanup now removes only recognized generated controls where their action is unavailable; source-authored controls and working raw-MCP Replace remain intact.

New real Chromium/server coverage also verifies interrupted bridge recovery, stale-response rejection and reuse of completed artifacts without another model call. An initial fixture race was corrected, and the failed baseline evidence was retained.

## Observed live MCP runs

The local MCP agent bridge processed the public two-page OSEP IEP-translation letter using the current assistant. These were actual client-model runs, with no Gemini calls and no scripted self-test replies. The follow-up used a rebuilt engine, so the scores are not a matched efficacy comparison.

| Measure | First pilot | Gated follow-up |
| --- | --- | --- |
| Run | `arun-98e21d21-acbf-4456-a531-68ab46ba53de` | `arun-00ce7115-c3f3-4324-a59c-703b72a804e3` |
| Initial / final pipeline score | 86 / 42 | 86 / 90 |
| Final verdict | review-required | review-required |
| Published client requests | 19 | 20 across 22 pipeline calls |
| Source-token occurrences retained | 910 / 910 | 910 / 910 |
| Rejected repair candidates | 2: source-contract-uncheckable | 2: false link-destination-changed |
| Remaining deterministic findings | 1 axe rule; 3 Equal Access failures | 0 axe rules; 0 Equal Access failures |
| Tagged PDF | Withheld by incomplete source scan | Withheld by incomplete source scan |
| Independent human review | Not performed | Not performed |

The follow-up enabled automatic continuation and completed two rounds. Its six source-analysis answers and two identical crop-analysis answers were held constant after exact prompt and image checks; new HTML audits and repairs were reviewed live. The bridge replayed two identical continuation requests during the plateau. The stored raw exchanges, results and historical output files have not been rewritten to reflect subsequent fixes.

The first pilot exposed poor contrast and a stale image placeholder. In the follow-up, rendered review found one real image, no stale placeholder, a keyboard-reachable file input and passing normal control text contrast: Replace 7.58:1 and Adjust Crop 7.10:1. An accepted repair fixed long-link overflow. The remaining focus concern prompted the production default fix and the continuation replay described below.

The initial PDF auditors disagreed (90, 86 and 98). Their answers are model observations, not ground truth. A development-exposed source and shared assistant context cannot establish general effectiveness. Retaining source tokens alone does not establish reading order, image fidelity or semantic equivalence.

Evidence: [first result](primary-pilot-result.json), [first visual review](primary-html-review.png), [follow-up result](followup-pilot-result.json), [follow-up rendered review](followup-rendered-facts.png), and [follow-up reflow checks](followup-reflow-checks.json). Independent review packets exist for the [first pilot](reviewer-packet-primary/manifest.json) and [follow-up](reviewer-packet-followup/manifest.json); human annotation fields remain blank.

## Final continuation replay and visual checks

The repaired engine replayed the actual stored continuation requests 19 and 20 in Chromium. Both request payloads matched, the changed candidate was accepted, candidate rejections were zero, text retention was 1.0, and the original image bytes were restored unchanged. One unchanged chunk remained an unchanged chunk. The strict destination/target gate was not weakened.

The replay candidate was rendered and visually inspected at desktop and mobile sizes. Keyboard Tab reached the file input; its white outline and dark outer band were visible. At viewport widths 320, 390 and 1000 pixels, document width equaled viewport width. Visible text, link text and destinations, and image sources and alternative text matched the historical follow-up artifact. An independent source check also confirmed all 19 source heading/paragraph blocks remained ordered, with no duplicate IDs, ghost placeholders or unresolved image tokens.

This is targeted regression evidence, not a third live run or independent human acceptance. See [assembly replay](continuation-assembly-replay.json), [candidate HTML](continuation-replayed-candidate.html), [rendered facts](continuation-rendered-facts.json), [full rendered review](continuation-rendered-facts.png), [keyboard and reflow checks](continuation-keyboard-reflow-checks.json), [mobile review](continuation-mobile-review.png), and [focus review](continuation-focus-review.png). Production default tests separately cover light/dark surfaces, forced colors, legacy-style upgrades and idempotence.

## Static editor-control cleanup

A final artifact check confirmed that clicking Adjust Crop did nothing because static cleanup had removed its callback. Browser sanitization similarly left Replace visible after removing its image-changing handler. These are recorded in the [crop baseline](static-crop-before.json) and [Replace baseline](static-replace-before.json).

The final cleanup recognizes renderer-owned controls, including tightly bounded legacy markup. It removes the unsupported crop control from static MCP output. At the browser sanitization boundary it also removes generated controls whose handlers will be stripped. It preserves source-authored controls, unknown nested content, image bytes, captions and source links. Executable scripts remain excluded. Already-sanitized legacy controls without ownership markers or surviving handler signatures are conservatively retained; malformed or ambiguous markup is also preserved.

Two separate derivatives of the stored candidate were checked: [MCP HTML](static-crop-replayed-candidate.html) and [sanitized browser HTML](static-browser-export-candidate.html). Chromium checks verify preserved content, no horizontal overflow at 320, 390 and 1000 pixels, and no unsupported crop control. The retained MCP Replace control was exercised with a local image file and successfully updated the image. The sanitized browser output contains neither unsupported image editor control. Desktop and mobile renders were visually reviewed.

The [68 focused checks](static-control-focused-verification.json) also passed. Two stale queue-characterization assertions were updated to match the existing per-run entry cloning; queue behavior was unchanged.

See [derived-artifact evidence](static-crop-replay.json), [rendered verification](static-crop-rendered-review.json), [MCP rendered view](static-mcp-rendered-review.png), and [browser rendered view](static-browser-rendered-review.png). These are regression derivatives, not new live model results. The accepted continuation candidate and both historical live outputs remain unchanged. The earlier green 547/112 gate results are preserved in the [pre-cleanup archive](static-crop-validation-archive.json).

## Validation and build

| Gate | Result |
| --- | --- |
| Maintained remediation unit suite | 576 / 576, 31 files |
| MCP calibration suite | 141 / 141, 14 files |
| Affected sanitizer/security compatibility checks | 44 / 44, 4 files |
| Workflow/configuration checks | 6 / 6 |
| Full source and generated Babel parsing | Passed |
| Pipeline integrity and MCP driver syntax | Passed |
| Root and desktop generated module byte parity | Passed |
| Source line endings, declaration uniqueness and whitespace checks | Passed |

Evidence: [remediation summary](remediation-unit-final-summary.json), [MCP summary](calibration-final-summary.json), [affected checks](static-crop-affected-final-summary.json), [workflow checks](calibration-workflow-tests.json), [suite wiring](calibration-selection-checks.json), and [build checks](combined-build-checks.json). The `verify:mcp-calibration` command and relevant CI workflows now include the new regression suites. Earlier green 532-test and 97-test results are preserved under `*-before-continuation-fix.json`; see the [archive record](continuation-validation-archive.json).

Final source SHA-256: `48163c2357dbb6053bb3ed7bbd5f7da07bcc631039caa082044fab0f9e18a5d7`.

Final root/desktop module SHA-256: `ae28108f2927be625303662cc2553f525cf97fdfa4e78b2fef3e2d12680b3116`.

Separate earlier evidence includes MCP parity/release checks and a two-trial scripted real-pipeline self-test. Scripted success is transport/pipeline coverage, not model quality evidence. The earlier [remediation recovery pass](../remediation-recovery-2026-09-12/README.md) records 494 unit and 232 browser checks.

## Remaining calibration limits

The source PDF has an AcroForm dictionary with an empty Fields array and font/default resources. The scanner intentionally treats AcroForm structures as unexamined. It detected no active content but reported an incomplete scan, so the driver correctly withheld original-layout tagged PDF delivery. No PDF/UA conformance claim or bypass was made. See the [source scan](source-safety-scan.json).

No explicit Gemini credential is configured. The two-condition Gemini study is planned but unexecuted, and independent human annotations remain necessary before recalibrating scores. Neither provider-specific results nor human judgments were fabricated.

Both temporary local servers were stopped and their ephemeral connection credentials removed. No deployment or scoring-policy change was performed.
