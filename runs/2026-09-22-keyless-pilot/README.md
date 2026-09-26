# Keyless pilot: two Portland Public Schools family letters (2026-09-22)

## What this is

Two real public documents went through AlloFlow's full remediation pipeline (the real
`fixAndVerifyPdf` in a headless browser) in its **keyless lane**. In that lane the pipeline
pauses at each model call and the connected AI client answers it, instead of Gemini.

**Who answered:** Claude (Opus 5.5), the same agent that built the benchmark, answering each
prompt by hand. So this is pilot evidence about how the pipeline behaves on real documents
(n = 2). It is **not** an independent quality measurement: the agent that produced the AI
audit answers is the one reporting them. The axe-core and IBM Equal Access scores come from
those engines, not from the agent.

**Why not Gemini:** this machine has no Gemini key and no local model, so the one-command
scoreboard in `runs/2026-09-22-real-corpus/` records its model stage as blocked.

## How it ran

- The connector ran as a child process over standard input and output; no network port was
  opened. Driver: `stdio_bridge_driver.cjs` (paths inside it are this machine's).
- Every request the pipeline made is listed in `<doc>/requests.json` (kind, prompt size, first
  line of the task). Every answer given is in `<doc>/answers/`, numbered in order.
- Outputs, exactly as written by the pipeline: `<doc>/output/` (accessible HTML, remediation
  report JSON, completion manifest). The driver log is `<doc>/driver-log.txt`.

## Results

| | Spanish letter | Arabic letter |
| --- | --- | --- |
| Source | [PPS board packet, Dec 2020](https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU6G7A84B7/$file/P517-%20SPA%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf) | [PPS board packet, Dec 2020](https://go.boarddocs.com/me/portland/Board.nsf/pfiles/BWDU777A8911/$file/P517-%20ARA%20Child%20Care%20Letter%20to%20Families%20December%202020.pdf) |
| Pages | 1 | 1 |
| Source language tag | es-US (correct) | en-US (wrong: the text is Arabic) |
| Model calls answered | 21 | 21 |
| Wall time | 30.5 min (answers took 128 s on average) | 39 min (answers took 166 s on average) |
| Score before, after | 40, 90 | 25, 85 |
| After, per engine | AI 100, axe 100, Equal Access 90 | AI 85, axe 100, Equal Access 92 |
| Token recall (words kept) | 1.00 | 0.90 |
| Readiness | review required | review required |
| Tagged PDF | withheld: `distribution_review_required` | withheld: `content_coverage_requires_review` |
| Delivered | accessible HTML and the audit report | accessible HTML and the audit report |

The "after" score is the lowest of the three engines, not an average.

## What worked

- Every word of the Spanish letter reached the output (recall 1.00), including its one link, now
  with descriptive text.
- The Arabic letter was tagged `en-US`; the pipeline detected Arabic from the text and wrote
  `lang="ar"`, and the fix pass added `dir="rtl"`. It also marked the Arabic part of a mixed line
  as Arabic on its own.
- Both images got text alternatives; headings, landmarks and a skip link were added.
- Both tagged PDFs were withheld rather than shipped with open questions: the gates failed
  closed, as designed.

## What went wrong (candidates for fixes)

1. **Arabic text layer is corrupted by the pipeline's own extraction.** Every lam-alef ligature
   comes out reversed (for example the pipeline reads "عائالت" where the page says "عائلات").
   About 40 of the letter's 379 Arabic words are affected; pypdf reads the same file correctly.
   The content check then compares a correct transcription against the corrupted words, so a
   faithful output scores recall 0.90 and loses its tagged PDF. Every Arabic document made in
   Word is likely affected.
2. **The pipeline's own style blocks create review items.** Two of the five IBM Equal Access
   review findings on the Spanish letter point at style blocks the pipeline injects
   (`a11y-contrast-safety`, `a11y-reduced-motion`). With no failures left, those review items
   still hold Equal Access at 90, and the tagged PDF is withheld.
3. **Every output says it was transformed "for accessibility compliance (WCAG 2.2 AA)"**, in
   English and unmarked, even in Spanish and Arabic documents. That is a compliance claim the
   tool cannot make.
4. **Generic English title and English alternative text.** The output title is "Accessible
   Document" plus the file name, and image descriptions come from a prompt that does not name the
   document language. The fix pass corrected both here, but only because the answering model
   flagged them.
5. **Leaked markup cannot be removed.** When the extraction reply contained a tag the renderer
   does not allow (the agent's own mistake), it was shown as literal text. The fix gate then
   refused to remove it, because it counts `<`, `=` and `>` in visible text as math. The same
   rejection threw away every other fix in that chunk.

## What this does not claim

- It does not claim either output is "WCAG compliant" or ready to hand out; both are marked
  review required.
- Two one-page letters say nothing about long, scanned, table-heavy or form documents.
- The AI rubric answers came from the benchmarking agent itself; no independent person has
  reviewed these outputs.
