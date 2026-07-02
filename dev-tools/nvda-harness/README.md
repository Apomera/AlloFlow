# NVDA verification harness

**What this is:** the first check in the pipeline that uses a *real screen reader* instead
of simulating one. axe-core and the AI auditors read the accessibility tree; this harness
captures what NVDA — the screen reader real students use — **actually speaks** when it
reads a remediated document, and diffs that transcript against what the document's
structure says *should* be spoken, in order.

**Why it matters:** "axe passed" is an inference. "NVDA read every heading, image
description, table, and list in the right order — here's the logged transcript" is
evidence, in exactly the form pilot partners and procurement reviewers ask for.

## One-time setup (~5 minutes)

1. **Install NVDA** (free): https://www.nvaccess.org/download/ — default options are fine.
2. **Install the Speech Logger add-on**: NVDA menu (NVDA+N) → Tools → Add-on store →
   search "Speech Logger" (by Luke Davis) → install, restart NVDA when prompted.
3. **Point its log at a known file**: NVDA menu → Preferences → Settings → Speech Logger →
   set the local log file to `%TEMP%\nvda_speech.log` and enable logging.
   (If you pick a different path, pass it to the runner with `-SpeechLog`.)

## Running a check

```powershell
.\dev-tools\nvda-harness\run_nvda_check.ps1 -HtmlFile "C:\Users\you\Downloads\Accessible Document — MyDoc.html"
```

The script opens the document, you press **NVDA+DownArrow** once ("say all"), and when
NVDA goes quiet the script writes `...nvda_report.txt` next to the document:

```
RESULT: 41/43 expectations spoken in order (95%), 1 OUT OF ORDER, 1 MISSING
  [OK ] h1 "Photosynthesis Study Guide"
  [OK ] landmark "main"
  [OK ] image "Cross-section of a leaf with labeled chloroplasts"
  [ORD] h2 "Review Questions"        ← spoken, but out of document order
  [MISS] table "Rainfall by month"   ← never spoken
```

- **OK** — announced in document order (the pass case).
- **ORD** — announced out of order → a reading-order problem worth investigating.
- **MISS** — never spoken → structure or alt text isn't reaching the screen reader
  (or say-all was stopped early — re-run if you interrupted it).
- **VIOL** — a decorative image (`alt=""`) leaked into speech.

## Checking a tagged PDF

Same flow, different viewer: open the tagged PDF in **Adobe Acrobat Reader** (not the
browser's PDF viewer — Reader exposes the tag tree to NVDA), press NVDA+DownArrow, and
run the checker manually against the *HTML twin* of the same document:

```powershell
node dev-tools\nvda-harness\check_transcript.cjs "MyDoc.html" "$env:TEMP\nvda_speech.log" report.txt
```

The HTML and tagged PDF are built from the same structure, so the same expectation list
applies; PDF-specific gaps (e.g. a table announced in HTML but silent in the PDF) show up
as MISS rows unique to the PDF run — those are exactly the findings we want.

## Honest limitations

- **Semi-automated by design**: one human keypress starts say-all. NVDA has no supported
  API to trigger it programmatically, and simulating its modifier keys is brittle.
- Expectation derivation targets **our own generated HTML** (well-formed, known idioms);
  it is not a general-purpose HTML parser.
- Matching tolerates NVDA verbosity differences (it checks the *content*, loosely
  decorated), so cosmetic wording differences between NVDA versions won't false-fail.
- This verifies **announcement + order**, not pronunciation, punctuation verbosity, or
  braille output.

## Files

- `expected_announcements.cjs` — derive the expected announcement sequence (pure, tested)
- `diff_transcript.cjs` — speech-log parser + in-order differ + report (pure, tested)
- `check_transcript.cjs` — CLI wrapper (exit 0 pass / 2 findings)
- `run_nvda_check.ps1` — end-to-end runner (open → say-all → watch log → report)
- Tests: `tests/nvda_harness.test.js` (run with the main vitest suite)
