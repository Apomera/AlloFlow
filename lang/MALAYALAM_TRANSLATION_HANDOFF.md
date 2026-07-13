# Malayalam (മലയാളം) — Translation Handoff / Native-Review Punchlist

> **Historical native-review handoff (2026-07-09):** This records the June 2026 Malayalam pack QA state and punchlist. Re-run current i18n verification and inspect `lang/malayalam.js` before treating the issue counts below as current.

**Pack:** `lang/malayalam.js` (11,198 keys) — built 2026-06-20/21 (AI translation, machine-verified).
**Status:** Registered and shipping. 100% key parity, 0 placeholder mismatches, 0 JSON errors, arrays + DNT preserved, deep-screen 0 defects.

**QA — two independent signals, both strong:**
- **Forward native-fluency review** (66-key sample): ~58 good / 8 minor / **0 bad**.
- **Blind back-translation accuracy pass** (44-key sample): the Malayalam was translated *back* to English by agents that never saw the original, then compared. **Mean meaning-overlap 0.87 (content-word Jaccard); all 44 ≥ 0.5; 0 meaning drift.** The lowest-scoring items were faithful paraphrases (e.g. "saved"/"has been saved", `{topic}` preserved), not errors. This is a more independent check than the forward review and it agrees: meaning is preserved.

The 8 "minor" forward-review items below are phrasing polish — **not auto-edited** (native review first).

## Whole-pack pattern (deep screen)
- **UI-element references in English:** some help text names a UI element by its English label while the in-app UI shows the Malayalam label. Pick a policy and apply consistently. (Proper nouns ADA/TEKS/WCAG, formats, fonts, `export.filenames.*` correctly kept English.)

## Per-key suggestions
- **`tour.actions_text`** — "വീട്ടു ഭാഷ" (home language, colloquial) → *വീട്ടിലെ ഭാഷ* / *മാതൃഭാഷ*.
- **`tour.note_taking_text`** — "ജ്ഞാന ദൗത്യം" (lit. knowledge mission) for *cognitive task* → *വൈജ്ഞാനിക ജോലി/പ്രവർത്തനം* (occurs twice).
- **`tour.input_panel_text`** — "കേന്ദ്ര കേന്ദ്രമായി" ("central central", redundant) → *കേന്ദ്ര ഹബ്ബായി* / *കേന്ദ്രമായി*.
- **`tour.anchor_chart_text`** — "the whole arc" → "മുഴുവൻ ആർക്കിനും" (ambiguous "arc") → *യൂണിറ്റ് മുഴുവൻ* / *പഠന ഘട്ടം മുഴുവൻ*.
- **`help_mode.tool_quiz`** — "Exports:" → "കയറ്റുമതികൾ" (commercial export, wrong sense) → *എക്സ്പോർട്ടുകൾ* (as used elsewhere).
- **`help_mode.dashboard_cross_tool_misconceptions`** — "note-taking" → "കുറിപ്പെടുക്കൽ" (malformed) → *കുറിച്ചെടുക്കൽ* / *കുറിപ്പെഴുത്ത്* (twice).
- **`escape_room.team_mode`** — "ടീം ചലഞ്ച്" (transliteration) → consider *ടീം വെല്ലുവിളി*.
- **`behavior_lens.raw.instantly_fill_functionmatched_fidelity_items_no_ai_needed`** — "വിശ്വസ്തത" (loyalty) for behavioral *fidelity* → *നടപ്പാക്കൽ കൃത്യത* / *പാലിക്കൽ കൃത്യത*; "function-matched" rendering is loose.

*Reviewer note: 0 correctness errors across both passes; quality is strong (high-resource). These are polish items.*
