# Garry demo script: a 10-minute walkthrough

Prepared for the UMaine meeting; updated 2026-09-28 after the G1 handoff review.

**AlloFlow helps a person remediate a document and reports what still needs review.**

Describe an automated result as "no failures in these automated checks". The generated HTML
footer now explains what AlloFlow prepared and says it is not a certification of WCAG conformance.
The reports distinguish automated findings from review by a person. Do not describe any score
or PDF/UA identifier as proof that the finished document meets every requirement.

## Two public documents, with the evidence we actually have

| Document | Why use it | Evidence and limits |
| --- | --- | --- |
| USM BIO 105 Biological Principles I syllabus, `usm-syllabus-bio105` | Three pages, from a UMaine System campus; a relevant faculty example | Its source has a text layer and gave consistent source-audit results in the September 22 corpus run. No completed live-model remediation rehearsal is recorded. Use it live only after same-day rehearsal succeeds. |
| Portland Public Schools Spanish child care letter, December 2020, `pps-childcare-letter-es-2020-12` | One page of real family communication in Spanish | The September 22 keyless pilot produced HTML and a report: 40 before, 90 after, token recall 1.00, five Equal Access review findings, and a withheld tagged PDF. Claude manually answered the model calls in 30.5 minutes. This is pilot evidence, not an independent quality evaluation or a timing claim for Gemini. |

Public URLs and source hashes: `mcp-testing/corpus/real-corpus-2026-09-22.json`.
Pilot method and limits: `runs/2026-09-22-keyless-pilot/README.md`.
Source PDFs: `C:/tmp/remediation_corpus/new/`.

## Ready now: the offline fallback

Open `C:/tmp/alloflow_dispatch/wave2/G1_finish/demo-fallback/index.html`.

This folder contains both source PDFs, verified against their corpus SHA-256 hashes; a summary
of the saved Spanish pilot findings; the original report and completion manifest; and a Spanish
presentation copy with a dated historical notice. The presentation copy changes the old footer
wording without changing the main document text. Its original remains in `archive/`.
`provenance.json` records those changes and hashes.

At preparation time, the production driver found no configured Gemini key. The two fallback
pages were checked in a local browser, with no remote requests or horizontal overflow.

These are historical results. They have not been remediated or validated again. No tagged PDF
or application project file is available from that pilot. Do not present the folder as a fresh
run, a successful PDF export, or an independently verified output.

## Before the meeting: rehearsal is still required

1. Open the exact application build intended for the meeting. Local source changes need the
   local preview or a separately authorized release; the deployed Canvas link does not acquire
   uncommitted changes. Confirm the report title is "Accessibility Check Report" and the new
   qualified footer is present.
2. Run the USM syllabus through **Run Audit**, then **Make Accessible**. Record elapsed time,
   before/after values, review items and whether tagged-PDF export is actually available.
3. Save the project and every output the app produces. Reopen that project to verify recovery.
   Keep those rehearsal files together, clearly dated, beside the fallback folder.
4. Rehearse the Spanish letter if there is time. Use the actual result; do not promise that it
   will reproduce the September 22 score or export decision.
5. Run optional veraPDF validation during rehearsal if it is available. Measure its cold startup
   before putting it inside the live time budget.
6. If the live workflow takes too long or fails, use the offline fallback for the main
   walkthrough. A current model-service rehearsal and human accessibility review remain
   presenter tasks; preparing this folder did not perform them.

## The walkthrough: ten minutes with a saved-result fallback

**0:00 to 1:00: set expectations.**
"This helps a person remediate. It runs automated checks and tells us what still needs review.
Here is a real document, the changes proposed, and the evidence we can inspect."

**1:00 to 2:00: show the source.**
Open the USM syllabus and its baseline in the rehearsed application. Name the AI review,
axe-core and IBM Equal Access. Explain that the headline uses the lowest available engine
score, with incomplete results marked. If rehearsal is unavailable, open the source PDF and
say that the saved walkthrough will use the Spanish pilot instead.

**2:00 to 4:00: show the process.**
Start the live fix only if rehearsal established that it fits the slot. Name the stages as they
appear: extraction, proposed structure and alternative text, checks, and review. At four minutes,
switch to saved results if the live result is not ready. Do not wait indefinitely or invent an ETA.

**4:00 to 6:00: inspect the result and the limits.**
Show the before/after values, per-engine results and content comparison. Describe token recall
as a check for preserved text, not proof of correct reading order, OCR or meaning. Open the Diff
view in the rehearsed app when available. For the saved Spanish pilot, the fallback page shows
40 to 90, 473 matched source tokens, and five unresolved Equal Access review findings.

**6:00 to 7:30: show the report and export decision.**
Read the current report's explanation of what was checked and what needs a person. Show a
rehearsed tagged PDF only if it was actually produced; otherwise explain the displayed reason
it was held back. The historical Spanish pilot withheld its PDF with
`distribution_review_required`; its saved report is JSON, not the current downloadable HTML
report. Show the qualified HTML footer using a current rehearsal output or the explicitly
labeled historical presentation copy.

**7:30 to 9:00: multilingual example and review.**
Open the Spanish letter if it was not already the fallback. Point out the source language,
proposed image descriptions and remaining review findings. Ask a person who reads Spanish to
check the language and descriptions. The pilot's model answers came from its own benchmarking
agent, so they are not an independent evaluation.

**9:00 to 10:00: questions.**

## If Gemini throttles or the live run stalls

Say what the app actually reports: "The model service has not finished" or "The service is
rate-limiting this run." Show any incomplete-audit label. Retry at most once within the slot,
then open the saved project from rehearsal, or the offline fallback's `index.html`.
State the date and source of the saved result before continuing. The fallback needs no model
service or account connection.

## Documents to avoid in this first demo

- **The Arabic Portland letter.** The September 22 run showed reversed lam-alef pairs in the
  pipeline's PDF text extraction and reduced token recall. Current reports warn that right-to-left
  reading order and shaping need a person; that warning does not fix the extraction bug.
- **Hebrew, Persian and Urdu UDHR examples with missing text mappings or image-only pages.**
  Their extraction and OCR limitations need a separate walkthrough with a language reader.
- **Very long documents, fillable forms and image-only scans.** Their active-content checks,
  form preservation, OCR and validation time make them poor examples for this time box.

## Three likely questions

**"Is the output compliant, and can we use it for Title II?"**
The report records checks and remaining review. It does not certify conformance or determine
an institution's obligations. A person must evaluate the finished document, including alt-text
accuracy, heading structure, reading order, keyboard use and screen-reader use.

**"What does the AI change, and how do I know it preserved the content?"**
It proposes structure and image descriptions. Content checks look for missing text, changed
numbers or links, and other discrepancies. The report and Diff view expose those checks and
their limits. A text match alone cannot establish meaning or correct reading order; inspect the
source and output together and treat generated image descriptions as drafts.

**"Does the PDF pass PAC or veraPDF?"**
Show the actual validation result for the exact exported file, if one exists. A successful
veraPDF run covers its automated checks. It does not replace checks by a person, and a PDF/UA
identifier is not independent proof. We do not have output pass rates across the whole corpus.
The useful next step is to evaluate representative documents and review the results together.
