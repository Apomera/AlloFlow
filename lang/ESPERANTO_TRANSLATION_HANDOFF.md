# Esperanto — Translation Handoff / Native-Review Punchlist

**Pack:** `lang/esperanto.js` (11,286 keys) — built 2026-06-21 (AI translation, machine-verified).
**Status:** Registered and shipping. 100% key parity, 0 placeholder mismatches, 0 JSON errors, arrays + DNT preserved, deep-screen 0 defects. Proper supersigns (ĉĝĥĵŝŭ) used throughout.

## ⚠️ This pack needs Esperantist review more than the others
This is the **language-learning** pack — and unlike a translation pack where a native speaker discounts a clumsy phrase, **a learner can absorb a calque or error as correct.** Its QA was also the most critical of the seven:
- **Forward review** (65-key sample): **45 good / 18 minor / 2 bad** — the most calques/errors of any pack.
- **Blind back-translation** (44-key sample): mean overlap **0.86**, all ≥0.5, **0 drift**.
- **The split matters:** meaning round-trips fine (0.86), but *idiom* is weaker (lots of calques). Calques preserve meaning yet read non-idiomatically — exactly what you DON'T want a learner internalizing. **A review by a fluent Esperantist is strongly recommended before promoting this as a learning tool.**

## Fixed during build (objective defects)
- **`help_mode.tool_quiz`** — removed **12 zero-width spaces (U+200B)** that had corrupted "intersesia"→"interses​ia", and fixed typo "bild-al-bila" → "bild-al-bilda". ✅ done.

## Real errors still needing a native fix
- **`tour.note_taking_text`** — (1) "Question Stems" → "Demand-Stamoj": **"stamo" is not an Esperanto word** → use *demand-komencoj* / *demandaj frazkomencoj*. (2) "Outline Notes" → "Skiz-Notoj" collides with "Sketchnotes"/"Skiznotoj" → use *Skemaj/Konturaj Notoj*. (3) calqued dangling preposition ("listen/read **for**").

## Recurring calque/grammar patterns (18 minor)
- **Calques:** "Collective Agency" → "Kolektiva Agento" (=agent/person) should be *Ageco*; "word problems" → "vort-problemoj" → *vortaj/rakontaj problemoj*; "cross-reference **against**" → "kontraŭ" (oppositional) → *kun / rilate al*; "Documentation" menu → "Dokumentado" (the act) → *Dokumentaro*; "Title Banner" → "Titol-Standardo" (=flag) → *Titol-Bendo/Strio*; "evidence" → "evidento" (non-standard) → *pruvo / atesto*; "MCQ" → "PED" (unrecognized abbr.) → keep *MCQ* or spell out.
- **Grammar slips:** adjective-noun agreement ("trenebla sekcioj" → *treneblaj sekcioj*); double conjunction ("ke … ĉu"); heavy genitive piles ("Klasa Komprenoj Langeto" → *Langeto de Klasaj Komprenoj*); indirect questions after *pri* ("voĉdoni pri kiun…" → *pri tio, kiun…*).

## Also un-reviewed
- The 88 `word_sounds.voice_pack_*` keys were backfilled (machine-translated, placeholder-validated) and were **not** in the sample — include in the native pass.

*Bottom line: solid meaning, but the most idiom work of the set. Treat as a strong draft pending an Esperantist, especially given the learner audience.*
