# Round 14 — recall-channel honesty: /Contents concatenation + WinAnsi C1 fallback (engine 0.2.7)

Round 13's region-classifier lane is untouched (separate session). This round
lands the two extractor follow-ups flagged by the 08-10/11 ed-parent-guide
evidence run, in the RECALL-BEARING channel this time, with a full corpus
re-baseline.

## The two changes

1. **`/Contents` arrays parse as ONE stream** (`_pdf_extract_text`, matching
   what round-13's `--ordered` channel already did). The spec allows a page's
   content to split between any two lexical tokens; PDFMaker-era files split
   pages into many small streams, so fonts, text state, and even single TJ
   arrays straddle boundaries. Parsed per-stream, the OSEP letter dropped a
   whole line and decoded quote glyphs without their font; the 1913 scan
   smashed words together across boundaries ("mortgagesjoint").
2. **WinAnsi C1 fallback** (`_decode_font_bytes` + no-font path): unmapped
   single-byte codes 0x80–0x9F decode via cp1252 (curly quotes, en/em dashes,
   daggers) instead of passing through as invisible C1 control characters.
   The five codes cp1252 leaves undefined keep their raw identity. Multi-byte
   (composite) decoding unchanged.

## Re-baseline (all 14 locally-present corpus docs + committed plans)

Token counts identical for 10 of 14 docs (incl. irs-i1040-instructions at
133,406 — its 0.9349 recall ceiling is unmoved). The four that changed, all
verified at token level (`scratchpad round14_diff.py` method — Counter diff
old vs new):

| Doc | tokens old → new | What changed |
| --- | --- | --- |
| ed-parent-guide-idea | 863 → 910 | recovers the dropped "DOJ and ED, filed the SOI…" line |
| fda-nexium-prea-letter | 2,109 → 2,241 | real prose recovered (nexium/pediatric/erosive…); stray digit fragments gone |
| irs-f1040-1913-scan | 2,424 → 2,575 | cross-boundary word-smashes split into real words |
| uscis-civics-100q | 2,700 → 2,678 | LOST = single-letter glyph fragments (w,q,h,r…); GAINED whole words (constitution, amendments) — garbage removal, not content loss |

Recall against committed plans (old → new):

| Plan | srcRecall old → new |
| --- | --- |
| uscis-civics (round-01 plan) | 0.8419 → **0.8495** |
| fda-nexium (round-04 plan) | 0.9099 → **0.9143** |
| ed-parent-guide (v2 plan) | 1.0 → **1.0** (now vs the richer 910-token reference — a real 1.0, no longer measured against a reference missing a line) |

No scoreboard dropped. Scans still report srcRecall null honestly
(1954 scan: 0 tokens both before and after).

## Traps for future extractor rounds

- ★importlib-loading the skill module writes `scripts/__pycache__/` and the
  package build FAILS CLOSED on it — set PYTHONDONTWRITEBYTECODE or delete
  before `build_alloflow_portable_packages.cjs`.
- ★Token-count DROPS can be improvements — always Counter-diff (round-14's
  uscis −22 was stream-boundary glyph fragments disappearing).
- ★Windows: Git-Bash `/tmp` is NOT `C:\tmp` — Python resolves `/tmp/x` to
  `C:\tmp\x`; write helper files to an explicit absolute path.

Method scripts preserved in the session scratchpad (round14_snapshot.py,
round14_diff.py, round14_recall.py); the diff/recall method is 20 lines and
re-derivable from this note.
