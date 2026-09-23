# Real-document remediation scoreboard, 2026-09-22

Start with `scoreboard.html` (or `scoreboard.md`). `scoreboard.json` holds every document
trial; `benchmark-plan.json` records the corpus, the configuration and the code versions.

## What this run shows

- **39 public PDFs** of the kinds a Maine district and a Maine university publish, 3 trials
  each, 117 of 117 document trials completed, with **no crash or hang**.
- **The remediation (model) stage did not run**: this machine has no Gemini key or local model,
  so every document is recorded as blocked rather than skipped. What did run: text extraction,
  the Document Safety scan and veraPDF, all without a model.
- **None of the 37 source files that got a veraPDF verdict passes the PDF/UA-1 checks as
  published** (median 6 failed rules, range 3 to 16; the verdict never changed between trials).
  The other 2 are the longest documents, whose valid veraPDF report the connector currently
  rejects. 4 files are image-only scans and 1 has a text layer that decodes to unreadable glyphs.
- The Document Safety scan would withhold the tagged PDF for 4 documents (form scripts, launch
  actions, an embedded file), which is the intended fail-closed behavior.
- 35 of 39 documents gave identical answers on all three trials. The other 4 differed only
  because the veraPDF check sometimes reported Java as missing on a busy machine.

For what the full pipeline does on real documents, see `../2026-09-22-keyless-pilot/`: two
Portland Public Schools family letters (Spanish and Arabic) remediated end to end, with the
answering model disclosed.

## To run the model stage

Get a free Gemini key at https://aistudio.google.com/app/apikey, then in PowerShell from the
repository root:

```
node dev-tools/benchmark_document_remediation.cjs --mode fetch
$env:GEMINI_API_KEY = "<key>"
node dev-tools/benchmark_document_remediation.cjs --mode corpus --trials 1 --out-dir runs/<date>-real-corpus-gemini
```

Each document can take 5 to 30 minutes, so the whole corpus is an overnight run. Results are
saved after every document, and `--mode render --out-dir <that folder>` rebuilds the scoreboard
from whatever finished.

## What this does not claim

It does not certify any document as WCAG, Section 508, ADA or PDF/UA conformant, and AlloFlow
does not remediate on its own: it drafts an accessible version and an audit report of what is
left for a person to review.
