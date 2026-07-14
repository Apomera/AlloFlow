# Turkish (Türkçe) — Translation Handoff / Native-Review Punchlist

> **Historical native-review handoff (2026-07-09):** This records the June 2026 Turkish pack QA state and punchlist. Re-run current i18n verification and inspect `lang/turkish.js` before treating "registered and shipping" or the issue counts below as current.

**Pack:** `lang/turkish.js` (11,198 keys) — built 2026-06-20 (AI translation, machine-verified).
**Status:** Registered and shipping. Structurally complete: 100% key parity with the reference pack, 0 placeholder mismatches, 0 JSON errors, arrays + DNT terms preserved. A 66-key stratified native-fluency review scored **55 good / 9 minor / 2 bad**; the 2 "bad" (a `?`→`→` arrow source-bug) are already fixed.

The items below are the **9 "minor"** findings — understandable but slightly awkward word-choice/consistency issues. They were **deliberately NOT auto-edited**: applying unverified phrasing changes risks degrading quality, so they're left for a native Turkish speaker to confirm before editing. Each lists the key, the issue, and a suggested phrasing.

## Consistency (whole-pack)
- **`kelime` vs `sözcük` for "word":** game/tool names use *Kelime* (e.g. "Kelime Bulmaca", "Kelime Karıştırma") while body text uses *sözcük*. Pick one term and standardize. (seen in `tour.wordsounds_text`, `tour.glossary_text`)
- **"Anchor Chart":** left in English in `tour.anchor_chart_text` intro but rendered as *tablo* later (Tablo Türü, Strateji Tablosu). Standardize on one Turkish term, e.g. *Çapa Tablosu* / *referans tablosu*.

## Per-key suggestions
- **`tour.input_panel_text`** — "merkezi merkez işlevi görür" ("central center", redundant) → *merkez noktası olarak işlev görür*. "Olgu Doğrulama" for *Fact Verification* reads stiff → *Gerçeklik Kontrolü*.
- **`tour.concept_sort_text`** — "Yanıtları Denetle" (denetle = audit) → standard UI *Yanıtları Kontrol Et*. "ELL öğrencilere" → dative *ELL öğrencilerine*.
- **`tour.wordsounds_text`** — "gözatın" → *göz atın* (two words); "Tüm fonem seslerini göz atın" → *...seslerine göz atın* (dative).
- **`tour.glossary_text`** — Unscramble "Karışık sözcükleri düzeltin" is loose → *karışık harfleri çözün*; Bingo auto-caller "Anonsör" (informal/borrowed) → *otomatik çağırıcı*.
- **`tour.anchor_chart_text`** — "tüm yay boyunca" (literal calque of "the whole arc") → *tüm ünite boyunca*; "cilalı baskı stili" → *düzenli/profesyonel baskı stili*; "marker görünümü" → *keçeli kalem görünümü*.
- **`tour.math_text`** — "STEM mücadeleleri" (literal) → *STEM zorlukları* / *STEM problemleri*.
- **`help_mode.dashboard_cross_tool_misconceptions`** — closing "tam olarak şeydir" is grammatically incomplete → *...koyacağı şeyin ta kendisidir*; "gerekçe çapaları" → *akıl yürütme çapaları*.
- **`pdf_audit.reliability.cronbach_title`** — "sezgisel yöntem" (=intuitive) is awkward for *heuristic* in a stats context → keep *sezgisel (heuristic)* or rephrase as a CV + pairwise hybrid.
- **`behavior_lens.fba.step_record_abc`** — button label "ABC Verisi Kaydet" → *ABC Verilerini Kaydet* (plural + accusative).

*Reviewer note: overall translation quality is strong (high-resource language); these are polish items, not correctness blockers.*
