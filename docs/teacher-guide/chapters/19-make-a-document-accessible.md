# Make a document accessible: the remediation workflow

Schools run on inherited documents: the scanned packet, the district PDF, the worksheet someone made in 2009. AlloFlow's remediation workflow turns a document like that into an accessible version, shows its evidence, and keeps you, the human, as the last step. This chapter is the teacher's view; the [white paper](https://alloflow-cdn.pages.dev/whitepaper.html) covers the same pipeline for a district evaluation.

## The shape of the workflow

1. **Upload the document.** PDFs, including scanned or image-based ones, which are routed through text recognition. Word and PowerPoint files, photos and screenshots of a page, and text-family files (markdown, plain text, CSV or TSV, and spreadsheets) also work. Anything that is not already a PDF is rebuilt as accessible HTML plus the alternate formats, rather than being forced back into a page layout it never had.
2. **Read the audit.** The tool checks the document against accessibility rules and shows what it found, before anything is changed.
3. **Run Make Accessible.** The pipeline rebuilds the document as structured, accessible content, applying safe deterministic fixes first and AI-assisted repairs only where diagnosis is needed. Improvement is bounded: each change is kept only if fresh checks show it helped, rolled back if it made things worse, and the process stops when results stop improving.
4. **Review the result against the source.** This step is yours and it is not optional. The comparison view exists so you can confirm nothing was dropped or distorted; a document can pass every automated check and still misrepresent the original.
5. **Export what you need**: accessible HTML, a tagged PDF, and alternate formats including DOCX, ODT, EPUB 3, DAISY 3, and Grade-1 braille (BRF), each with its own stated validation boundary.

## While a run is going

A thorough run on a long document takes a while, and there are three things worth knowing.

- **Leave the tab visible.** Browsers slow down background tabs on purpose, so a minimized or hidden window makes the same run take noticeably longer. The tool tells you when this is happening and welcomes you back, but the fastest run is the one you leave on screen.
- **Use "Run fresh" when you want a true re-test.** Finished runs are cached so you can reopen them instantly. That is usually what you want, but if you are checking whether a change helped, tick the fresh-run option so the document is genuinely processed again instead of replayed from cache.
- **If something looks wrong, export the diagnostic bundle** before you close the run. It captures what actually happened during processing, which is the difference between "it seemed slow" and a report someone can act on.

## Doing this without the app

If you already use a compatible desktop MCP host, the optional local connector can run the pipeline on your computer. You install it once, then ask in plain language to audit a document, remediate it, or export a supported format. The connector reads the file from disk; deterministic processing does not require an AlloFlow upload, but the host, configured AI provider, logging, and export destination still need their own review.

Two things make it worth knowing about. The deterministic tools (validation, text extraction, redaction, structure checks, exports) work with no AI key at all, and the AI-assisted repair runs on a key you supply yourself. Your IT department may prefer this path for exactly that reason. See [For your IT department](17-for-your-it-department.md).

## What the evidence report is for

Every run produces a report bound to the exact files it describes: what was found, what was fixed, what remains, and which checkers said so at which versions. Keep it with the document. If anyone ever asks "how do you know this version is accessible," the answer is a report, not a recollection.

## Honest expectations

- **This is repair with evidence, not magic.** The pipeline claims bounded, checkable improvement with a human decision at the end. It does not claim "guaranteed compliant," and neither should you.
- **Structure is the hard part.** Reading order, table structure, and meaningful alt text are where automated tools most need your review, because correctness there depends on what the document *means*.
- **A finished run can be reopened.** The results stay available on the device; the storage manager lists cached remediations, and the return pill brings you back to one you stepped away from.

## Confidential documents

The workflow can use a local AI endpoint instead of a cloud provider, and its deterministic validation tools run locally. For sensitive documents, verify that the chosen endpoint is actually on the device, that the desktop host and model do not send telemetry or retain prompts, and that exports stay in an approved location before describing the route as no-egress. Set the endpoint in AI Backend Settings and see [Privacy and responsible AI](07-privacy-and-responsible-ai.md) for the handling rules that still apply to the files themselves.

## Where this connects

- Structural plain-language edits to documents you are *authoring* use the same engine via the Expert Workbench, covered in [Documents and printing](15-documents-and-printing.md).
- For born-accessible materials you generate rather than inherit, see [Accessibility and UDL](04-accessibility-and-udl.md); remediation is for the documents that arrive already broken.
