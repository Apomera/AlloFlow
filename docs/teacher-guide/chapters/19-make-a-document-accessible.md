# Make a document accessible: the remediation workflow

Schools run on inherited documents: the scanned packet, the district PDF, the worksheet someone made in 2009. AlloFlow's remediation workflow turns a document like that into an accessible version, shows its evidence, and keeps you, the human, as the last step. This chapter is the teacher's view; the [white paper](https://alloflow-cdn.pages.dev/whitepaper.html) covers the same pipeline for a district evaluation.

## The shape of the workflow

1. **Upload the document** (PDF, including scanned/image-based ones, which are routed through text recognition).
2. **Read the audit.** The tool checks the document against accessibility rules and shows what it found, before anything is changed.
3. **Run Make Accessible.** The pipeline rebuilds the document as structured, accessible content, applying safe deterministic fixes first and AI-assisted repairs only where diagnosis is needed. Improvement is bounded: each change is kept only if fresh checks show it helped, rolled back if it made things worse, and the process stops when results stop improving.
4. **Review the result against the source.** This step is yours and it is not optional. The comparison view exists so you can confirm nothing was dropped or distorted; a document can pass every automated check and still misrepresent the original.
5. **Export what you need**: accessible HTML, a tagged PDF, and alternate formats including DOCX, ODT, EPUB 3, DAISY 3, and Grade-1 braille (BRF), each with its own stated validation boundary.

## What the evidence report is for

Every run produces a report bound to the exact files it describes: what was found, what was fixed, what remains, and which checkers said so at which versions. Keep it with the document. If anyone ever asks "how do you know this version is accessible," the answer is a report, not a recollection.

## Honest expectations

- **This is repair with evidence, not magic.** The pipeline claims bounded, checkable improvement with a human decision at the end. It does not claim "guaranteed compliant," and neither should you.
- **Structure is the hard part.** Reading order, table structure, and meaningful alt text are where automated tools most need your review, because correctness there depends on what the document *means*.
- **A finished run can be reopened.** The results stay available on the device; the storage manager lists cached remediations, and the return pill brings you back to one you stepped away from.

## Confidential documents

The whole workflow can run against a local AI model instead of a cloud provider, and the validation tools run locally, so a sensitive document can be processed with nothing leaving the machine. Set that up in AI Backend Settings ("Private AI on this computer"), and see [Privacy and responsible AI](07-privacy-and-responsible-ai.md) for the handling rules that still apply to the files themselves.

## Where this connects

- Structural plain-language edits to documents you are *authoring* use the same engine via the Expert Workbench, covered in [Documents and printing](15-documents-and-printing.md).
- For born-accessible materials you generate rather than inherit, see [Accessibility and UDL](04-accessibility-and-udl.md); remediation is for the documents that arrive already broken.
