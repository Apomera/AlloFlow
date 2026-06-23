# Kannada (ಕನ್ನಡ) — Translation Handoff / Native-Review Punchlist

**Pack:** `lang/kannada.js` (11,286 keys) — built 2026-06-21 (AI translation, machine-verified).
**Status:** Registered and shipping. 100% key parity with the reference pack (incl. the late `word_sounds.voice_pack_*` backfill), 0 placeholder mismatches, 0 JSON errors, arrays + DNT preserved, deep-screen 0 defects.

**QA — two independent signals:**
- **Forward native-fluency review** (64-key sample): 56 good / 8 minor / **0 bad**.
- **Blind back-translation** (44-key sample): mean meaning-overlap **0.87**; all 44 ≥ 0.5; **0 drift**. Meaning preserved.

Note: the 88 `word_sounds.voice_pack_*` keys were backfilled separately (machine-translated, placeholder-validated) and were **not** part of the sampled reviews — worth a look in native review.

## Whole-pack pattern (deep screen)
- **UI-element references in English** in some help text while the UI shows the Kannada label — pick a consistent policy. (Proper nouns ADA/WCAG/QTI/Canvas, formats, `export.filenames.*` correctly kept English.)

## Per-key suggestions (8 minor)
- **`tour.adventure_text`** — "Collective Agency" → "ಸಾಮೂಹಿಕ ಸಂಸ್ಥೆ" (= collective *organization*) → *ಸಾಮೂಹಿಕ ಕರ್ತೃತ್ವ* / *ಸಾಮೂಹಿಕ ನಿಯಂತ್ರಣ*.
- **`tour.actions_text`** — "Language Selector" → "ಭಾಷಾ ಆಯ್ಕೆಗಾರ" (awkward agent-noun) → *ಭಾಷಾ ಆಯ್ಕೆ*.
- **`tour.note_taking_text`** — "seeded with cues" → "ಬೀಜ ಮಾಡಲಾಗಿದೆ" (calque, seed) → *ಮುಂಚಿತವಾಗಿ ತುಂಬಲಾಗಿದೆ* / *ಪೂರ್ವ-ಸೇರಿಸಲಾಗಿದೆ*.
- **`tour.input_panel_text`** — "central hub" → "ಕೇಂದ್ರ ಕೇಂದ್ರ" (redundant) → *ಕೇಂದ್ರ ಬಿಂದು* / *ಕೇಂದ್ರ*.
- **`tour.persona_text`** — "gamified/gamification" → "ಆಟೀಕೃತ/ಆಟೀಕರಣ" (non-standard coinage) → *ಆಟದ ರೂಪದ* or keep *ಗೇಮಿಫೈಡ್*.
- **`help_mode.tool_quiz`** — "teacher override" → "ಶಿಕ್ಷಕ ಮೇಲ್ಪಾಂದರಣೆ" (obscure coinage) → *ಶಿಕ್ಷಕರ ಅತಿಕ್ರಮಣ / ತಿದ್ದುಪಡಿ*.
- **`quiz.show_key`** — "ಉತ್ತರ ಕೀ" transliterates *key* → *ಉತ್ತರ ಪಟ್ಟಿ ತೋರಿಸಿ* (answer sheet).
- **`session.live`** — "ನೇರ" reads abrupt → *ಅಧಿವೇಶನ ನೇರಪ್ರಸಾರದಲ್ಲಿದೆ!* / *ಅಧಿವೇಶನ ಸಕ್ರಿಯ!*.

*Reviewer note: 0 mistranslations across both passes; quality is strong (high-resource). These are polish items.*
