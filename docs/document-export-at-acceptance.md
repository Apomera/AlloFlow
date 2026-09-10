# Exported-document assistive-technology acceptance

**Human screen-reader testing has not been run.** The executable checks below observe browser semantics, keyboard operation, and PDF structure. Their passing status does not mean a person using assistive technology accepted the document. Acrobat Read Out Loud is not a substitute for a screen-reader session. [Adobe's accessibility reading guidance](https://helpx.adobe.com/acrobat/using/reading-pdfs-reflow-accessibility-features.html)

This protocol complements [the release accessibility plan](accessibility-manual-test-plan.md) and the existing independent PDF/EPUB validators. It does not replace them or change a production delivery verdict.

## Generate and check a reproducible packet

Run from the repository root, using a **new output directory** each time:

~~~powershell
node dev-tools/build_document_at_fixture_suite.cjs reports/at-fixture-suite
node dev-tools/document_export_at_acceptance.cjs reports/at-fixture-suite/acceptance-manifest.json reports/at-acceptance-run
~~~

The builder reuses the mixed-education benchmark's source PDFs and plans for **education-reading** and **education-table**, and executes the actual portable remediation/export path. It deliberately does not rerun veraPDF. Its HTML/PDF outputs remain subject to independent validation and human review.

**education-form-html** is a hand-authored native HTML worksheet used to check keyboard behavior. It is explicitly not evidence that portable PDF remediation supports forms; that path refuses interactive forms. The initial packet does not establish acceptance for scanned pages, mathematical notation, multilingual content, or informative figures. Add real examples of those document types before claiming that scope.

The checker produces:

- **automated-results.json**: exact artifact SHA-256/byte length, browser/reader version, individual observations, limitations, and an automated result.
- **manual-results.template.json**: an independent human record, with every task **not-run**, tester/environment fields empty, and the decision **pending-human-at**.
- **rendered-fidelity-review.html**: when `sourceFidelity` is enabled for any artifact, an offline review of the recorded source/candidate properties and coverage.

HTML and PDF inspections use the same captured bytes recorded in each artifact hash. After all inspections, every artifact is reread for the `artifact.byte-stability` check, including artifacts without a source-fidelity contract. A changed or unreadable file makes that check unavailable and prevents an automated pass. Any related rendered profiles are also marked unavailable. Rendered source files are rechecked as well; a changed or unreadable source invalidates the comparison even when the candidate remains unchanged. Verify the recorded hash again before later human review.

Keep the original template, fill a copy, and retain failure evidence. The CLI refuses an existing output directory to protect completed human records. A new export or changed hash requires a new acceptance record.

To test another exported file, copy the generated manifest, replace its artifact paths, and author the expected headings, reading anchors, table cells, accessible control names, and keyboard sequence from the source/approved document. Do not derive expectations from the output being evaluated. The manifest uses paths relative to itself; absolute artifact paths also work.

The automated contract is demonstrated in:

~~~powershell
node node_modules/@playwright/test/cli.js test tests/e2e/document_export_at_acceptance.spec.ts --workers=1 --retries=0
~~~

These tests load local files and block network access. They do not contact the deployed application, request a model response, install a screen reader, or run one.

## What is and is not automated

| Surface | Executable observation | Still requires a person |
|---|---|---|
| HTML headings | Expected level, order, and native accessible name bound to the actual heading; NFC normalization of text and names; main landmark | Actual heading navigation and announcements in the reader |
| HTML keyboard | Tab order, link activation, native entry/selection/reset, exposed names/states; focus geometry and computed indicator style | Perceptibility/contrast of the focus indicator, full-page obscuring, reader browse/focus-mode transitions |
| Reading order | Approved anchors appear in DOM order and PDF tagged-content order | Coherent continuous speech, complete meaning, multi-column transitions, omissions or repetitions outside the anchor sample |
| Tables | Expected cell values/positions and header roles in HTML/PDF; native HTML names and exposed table, row, and cell identities/ownership | Spoken row/column context and usability of complex or spanning headers |
| PDF links/forms | Tagged structure observations; optional external link name/annotation checks | Native reader keyboard behavior, destination usefulness, form fields and announcements |
| Figures/OCR | Outside the initial packet's automated acceptance scope | Image-description usefulness, source-to-output OCR accuracy, math and symbol meaning |

The PDF check follows PDF.js structure-to-marked-content associations. It does not treat searchable text alone as proof of tagged reading order. The HTML context disables document scripts; script-dependent forms need a separately scoped interactive test. A missing capability or a failed observation is never converted to a pass.

## Prepare the human session

1. Use privacy-safe examples or an approved source. Recruit testers who use the relevant technology; record the tester's experience and avoid collecting personal document content unnecessarily.
2. Fill the template with test date, OS, reader/browser application and exact version, screen reader and version, keyboard layout, speech verbosity, relevant reading-order preferences, and any overrides/add-ons. Record one environment per completed result file.
3. Confirm the artifact hash against automated-results.json (PowerShell: Get-FileHash -Algorithm SHA256 PATH). Open the file independently from disk in the intended application.
4. For an initial Windows session, use the installed NVDA/browser combination for HTML and NVDA with the installed Acrobat/Reader for PDF. Record the actual combination; this is a proposed test matrix, not a compatibility certification. Add the target users' other combinations as separate sessions.
5. Test the shipped document before applying reader-side corrective tagging, OCR, or reading-order overrides. If an override is necessary, record the baseline failure and the workaround separately.
6. Explain the tasks without coaching the tester toward the expected answers. The observer may record the comparison values below after the tester completes the task.

NVDA's browse-mode commands include H for headings, T for tables, and Shift with a navigation key to move backward; its Elements List and table navigation commands can help inspect context. Use the configured keyboard layout and NVDA's own help when commands differ. Not every command is supported in every document/application. [NVDA User Guide](https://download.nvaccess.org/documentation/userGuide.html#BrowseMode)

## Task protocol and comparison values

Record **passed**, **failed**, **blocked**, **not-run**, or **not-applicable** per task, with the actual spoken result, application behavior, elapsed time if useful, and an evidence/issue reference. A not-applicable result needs a concrete reason.

| Task ID | Ask the tester to do | Expected result for this packet |
|---|---|---|
| document-orientation | Open the document and identify its title, language, and main content without using the mouse. | Reading: the Water Cycle title. Table: Course support schedule. Form: Water-cycle check-in. Reader can reach content without unrelated interface text interrupting it. |
| heading-navigation | List or jump through headings in both directions, then return to the first heading. | Heading names/levels match the manifest. The reading export's Remediation notes heading is separate from source content and comes after the lesson. The worksheet has Your response and Reference beneath its title. |
| continuous-reading | Read the lesson continuously and explain the sequence. | Evaporation, Condensation, Precipitation, Collection, Groundwater, Transpiration, Runoff, Human impact, in that order. No dropped/duplicated section or interleaved column text. Disclosed remediation notes are distinguishable from the lesson. |
| table-navigation | Find the support table; navigate across each row and down each column. Ask: where is Monday tutoring, and where is Tuesday captioning? | Caption: Weekly support services. Columns: Day, Service, Location. Monday / Tutoring / Library; Tuesday / Captioning / Room 204. Header context is announced or readily available during cell navigation. |
| links-and-focus | Reach and activate the skip/reference links by keyboard, return, and traverse controls backward as well as forward. For a real PDF with links, repeat in the intended PDF reader. | Skip reaches the worksheet content. Water-cycle reference reaches Reference. Focus remains understandable and visible; no trap or unexpected external submission. PDF applications may expose different navigation, which must be recorded rather than inferred from HTML. |
| forms-and-state | Enter Ada for Name; select Clouds formed; mark I recorded my observation; activate Clear response; review all fields. | Names, roles, selected/checked states, and reset effects are understandable in speech. Reset returns empty/default values and an unchecked box; focus remains on the reset button until the tester moves it. Evaluate real required/error behavior separately if present. The initial PDF artifacts have no interactive form fields: document that as not applicable, not as a PDF forms pass. |
| figures-and-ocr | On an added real figure/scan, describe the figure or read the scanned prompt, units, and answer spaces; compare with the approved source. | Description conveys the actual instructional meaning. OCR preserves wording, numbers, symbols, and order. This initial packet provides no human evidence for that scope; leave not-run until representative real artifacts are added. |

For table navigation in NVDA, Control+Alt+arrow commands move through cells where supported; record whether the expected headers are announced. [NVDA table navigation](https://download.nvaccess.org/documentation/userGuide.html#SystemCaret)

## Record findings and decide the scoped result

For each failure, record artifact ID/hash, environment, task ID, reproduction steps, expected and actual behavior, severity, evidence location, and whether the tester could recover. Do not “repair” the source or enable a workaround and replace the failed observation with a pass. Keep the original failure and record a separate retest on new bytes.

A reviewer may accept only the named artifacts and tested environments once all applicable tasks have evidence and unresolved barriers have been addressed. Missing/wrong content, unusable table context, inaccessible fields, or a keyboard trap require remediation or an explicit blocked decision. Untested environments, figures, scans, and document classes remain outside that decision.

Automated results and human results are separate evidence. Preserve the default **pending-human-at** decision until a real reviewer completes the human record. Neither an automated pass nor this checklist establishes legal conformance or full WCAG/PDF/UA compliance.

## Rendered source comparisons

HTML acceptance artifacts can now opt into native Chromium source/candidate comparisons using `sourceFidelity`. The report includes exact artifact hashes, selected source checkpoints, accessibility-tree names/roles, computed visibility, and explicit incomplete coverage. See [rendered fidelity usage and calibration](rendered-document-fidelity.md). This post-export check does not change the live remediation gate or substitute for a screen-reader session.

## Baseline encoding and inspection coverage

HTML acceptance requires valid UTF-8 bytes and compatible HTML charset declarations, including when `sourceFidelity` is absent. Invalid bytes and legacy declarations produce an unavailable `html.utf8-encoding` check; they are not silently decoded with replacement characters. UTF-8 BOMs, canonical Unicode equivalents, inert data blocks (including JSON, XML, and plain text), embedded data images, and local SVG references remain supported. Executable JavaScript, modules, import maps, and speculation rules leave static coverage unavailable. Table cell expectations use the same NFC normalization as observed HTML/PDF cells. HTML heading text, expected names, and native accessible names also use NFC, including the uniqueness check for a heading level/name pair; normalization preserves compatibility distinctions such as superscript and subscript characters. Heading exposure and names are bound to the actual heading node, so a separately exposed matching heading cannot substitute for a hidden one.

The `html.inspection-coverage` check records blocked requests, disabled executable content, unresolved resource references, and active animations. Those conditions produce unavailable coverage and prevent an automated pass, even if the observed headings and reading anchors match. HTML bytes are served once at an isolated inspection origin, so relative CSS requests become observable; all dependency requests remain blocked. Parsed inline and stylesheet declarations also retain resources that were never requested, including hidden backgrounds, inactive media rules, unused fonts, and image-set URLs. Preload-none videos and unresolved relative stylesheets remain explicit dependencies. Table checks require the actual selected table, every required row, and every expected header/data cell to have exposed native roles. Each cell must remain owned by its corresponding row and table in the accessibility tree, and its native accessible name must match the expected value. Nonempty DOM cell text must also match; image-only headers may use their native alternative name as header content. Hidden rows/cells, reassigned cells, and incorrect ARIA names cannot pass merely because DOM tags and cell text remain unchanged. These observations cover the simple row/column table contract; complex spanning-header usability still requires separately scoped checks and human review. This is a static inspection of the authored acceptance contract; embedded asset quality, full temporal behavior, and whole-document fidelity are not established. Human acceptance remains separate.

Dependency classification is shared with rendered source comparison through `dev-tools/document_html_dependencies.cjs`. Both entry points use the same executable-script, responsive-image, CSS-resource, and animation checks. Rendered calibration records this helper’s hash and invalidates evidence if it changes during a run.
