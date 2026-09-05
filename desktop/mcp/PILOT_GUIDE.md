# AlloFlow Remediation MCP: supervised pilot guide

_For colleagues evaluating the connector for Title II document work. Prepared 2026-09-04 for v0.10._

This is a **supervised pilot**, not a certified compliance tool. The connector runs machine-verifiable
checks (veraPDF for PDF/UA-1, EPUBCheck and DAISY Ace for EPUB, axe-core and IBM Equal Access for
HTML) and reports exactly what each check covered. It does not certify WCAG 2.1 AA, PDF/UA or ADA
Title II conformance. A human still reviews every document before it is published.

## Setup (about 15 minutes)

1. Install Claude Desktop. Other MCP hosts work too but need Node.js 20 or newer on PATH.
2. Install a Java runtime (Temurin 21 LTS is fine). veraPDF and EPUBCheck need it.
3. Drag `alloflow-remediation.mcpb` into Claude Desktop Settings > Extensions. Verify the SHA-256
   against SHA256SUMS.txt first.
4. Ask: "Run remediation_capabilities." Confirm Java, Chromium, EPUBCheck and Ace are reported as
   available. If Chromium is missing, ask: "Run remediation_setup" (one-time download).
5. No Gemini key is needed for the pilot. The keyless path uses the model already in your Claude
   conversation. Never paste an API key into chat.

Read PRIVACY.md before the pilot. In keyless mode, document-derived text and rendered page images
enter your Claude conversation and are processed by that model provider. Use only the fixtures below
or documents you are already authorized to process with that provider. **No student records.**

## Fixtures to use

- `test-assets/multi-column-sample.pdf` (synthetic, in the repository) for reading-order checks.
- Any public government or agency PDF you already publish (board minutes, a public notice, a form).
- A short DOCX and PPTX you authored yourself, with at least one image, one table and one heading list.
- Copy fixtures into a fresh folder such as `C:\pilot\inputs`; outputs go to `C:\pilot\out`.

## Example prompts

- "Audit every document in C:\pilot\inputs and tell me which ones need work. Explain what was
  checked automatically and what was not."
- "Remediate C:\pilot\inputs\notice.pdf using the keyless agent bridge with thorough effort. Before
  starting, tell me what document content will enter this conversation. Write outputs to C:\pilot\out."
- "Validate the tagged PDF you produced for PDF/UA-1 and show me the validator's failed rules."
- "Export the accessible HTML to EPUB and report the EPUBCheck and Ace results, including the raw
  report paths."
- "Narrate the accessible HTML in accessible mode with a synchronized read-along EPUB."
- "Run audit_html on the accessible HTML and show each engine's status separately."
- "List saved runs and resume the interrupted one."

## What to review by hand (per document)

Record a row for each document with these checks. The automated checks do not cover them.

| Area | What to confirm |
| --- | --- |
| Source fidelity | Numbers, names, dates and table values match the original. Nothing was invented or dropped. Read `contentCoverage` and `fidelityNotes` in the report. |
| Reading order | Multi-column pages, sidebars and footnotes read in the intended order with a screen reader. |
| Headings and lists | Heading levels are not skipped; lists are real lists. |
| Tables | Header cells are marked; data cells associate with headers; no layout tables. |
| Forms | Every field has a label and instructions; required fields and errors are announced. |
| Images and math | Descriptions are accurate and useful, not generic. Math has a spoken description. |
| Language | Document language and any inline language changes are tagged correctly. |
| Contrast and colour | Colour is not the only carrier of meaning; contrast repair did not change meaning. |
| Audio (if narrated) | Pronunciation of names and numbers; section boundaries; the read-along highlights the right text. |
| Assistive technology | Open the HTML in NVDA or JAWS plus a browser, the PDF in Acrobat with a screen reader, and the EPUB in Thorium Reader. Keyboard-only navigation works. |

## Reading the results

- `deliveryStatus: complete-for-tested-scope` means every automated check that ran passed on the
  emitted bytes. It is still a starting point for the human review above.
- `deliveryStatus: review-required` with `deliveryReviewReasons` means a check failed, could not run
  or was not requested. A tagged PDF in this state is named `-tagged-review-required.pdf`. Do not
  publish it until the reason is resolved.
- Per-check statuses are `passed`, `failed`, `review-required`, `unavailable`, `not-run` or `skipped`.
  `unavailable` means a runtime was missing (Java, Chromium) and is never a pass.
- Scores from the AI rubric, axe and Equal Access are internal signals for triage. They are not
  percentages of WCAG conformance.

## Recording issues

For each problem, note: the fixture, the prompt used, the tool and run id from the reply, what the
connector claimed, what you observed, and the artifact path. Attach the remediation report JSON and,
for EPUBs, the raw EPUBCheck and Ace JSON. Keep the state directory (`~/.alloflow-mcp`) until the
issue is triaged so the run can be resumed or re-inspected.

## Scope of the automated checks

- **PDF/UA-1 (veraPDF):** structure and tagging rules in ISO 14289-1. Not reading order quality,
  not alt-text quality.
- **EPUBCheck 5.3.0:** EPUB 3.3 package and content validity.
- **Ace 1.4.6:** EPUB accessibility metadata and axe rules on the content documents.
- **axe-core and IBM Equal Access:** automatable WCAG rules on HTML. Roughly a third to a half of
  WCAG success criteria can be checked this way.
- **AI content rubric:** a model's judgement of content-level issues; useful for triage, not proof.

The current Title II technical standard is WCAG 2.1 AA. The DOJ interim final rule of April 20, 2026
moved the compliance dates to April 26, 2027 for public entities with a population of 50,000 or more,
and April 26, 2028 for smaller entities and special districts. Confirm the current dates at
https://www.ada.gov/resources/2024-03-08-web-rule/ before quoting them.
