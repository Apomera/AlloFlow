# Gujarati (ગુજરાતી) — Translation Handoff / Native-Review Punchlist

> **Historical native-review handoff (2026-07-09):** This records the June 2026 Gujarati pack QA state and punchlist. Re-run current i18n verification and inspect `lang/gujarati.js` before treating the issue counts below as current.

**Pack:** `lang/gujarati.js` (11,198 keys) — built 2026-06-20 (AI translation, machine-verified).
**Status:** Registered and shipping. Structurally complete: 100% key parity with the reference pack, 0 placeholder mismatches, 0 JSON errors, arrays + DNT terms preserved, deep-screen 0 defects. A 64-key stratified native-fluency review scored **52 good / 12 minor / 0 bad**.

The items below are the **12 "minor"** findings — understandable but slightly awkward (calques, transliterations, one gender-agreement slip). **Not auto-edited** — left for a native Gujarati speaker to confirm before applying.

## Whole-pack pattern (from deep screen)
- **UI-element references in English:** some help/tooltip text names a UI element by its English label (e.g. *History* tab, *Save* / *Generate* / *Download HTML Pack* buttons) while the corresponding UI is shown translated. Decide a policy — either keep the English label (matches nothing on screen) or translate to match the in-app Gujarati label — and apply consistently. (Proper nouns like ADA, TEKS, WCAG, Wolfram Alpha, Common Core and `export.filenames.*` code values are correctly left in English.)

## Per-key suggestions
- **`tour.adventure_text`** — "પ્રતિ વારી" (per turn) → *દરેક વારામાં*; "શરૂઆતકર્તા-મૈત્રીપૂર્ણ" (calque of beginner-friendly) → *શરૂઆતી માટે અનુકૂળ*.
- **`tour.scaffolds_text`** — "construction and composition" collapsed to "રચના અને રચના" (reads "composition and composition") → distinguish, e.g. *નિર્માણ અને રચના*; "વાક્ય શરૂઆતકર્તાઓ" (Sentence Starters, calque) → *વાક્ય શરૂઆતો*.
- **`tour.glossary_text`** — "4 સુધી લક્ષ્ય ભાષાઓ ઉમેરો" (awkward order) → *મહત્તમ 4 લક્ષ્ય ભાષાઓ ઉમેરો*.
- **`tour.note_taking_text`** — "સંકેતો સાથે વાવાયેલ" (literal "sown") → *સંકેતોથી પૂર્વ-ભરેલ* / *સંકેતો સાથે તૈયાર*.
- **`tour.persona_text`** — "નિપુણતા સ્તર આકાર આપો" missing object marker → *નિપુણતા સ્તરને આકાર આપો*.
- **`tour.math_text`** — "ઉકેલેલા ઉકેલો" (worked solutions, repetitive) → *વિગતવાર ઉકેલ* / *પગલાવાર ઉકેલ*.
- **`tour.visual_text`** — gender agreement: "નવો ભિન્નતા" → *નવી ભિન્નતા* (ભિન્નતા is feminine).
- **`tour.analysis_text`** — "કાર્યકારી સારાંશ" (Executive Summary calque) → *સંક્ષિપ્ત સારાંશ* / *મુખ્ય સારાંશ*.
- **`help_mode.dashboard_cross_tool_misconceptions`** — "બિન-quiz" mixes Latin "quiz" → *બિન-ક્વિઝ* (ક્વિઝ used elsewhere).
- **`quiz.show_key`** — "જવાબ કી" transliterates "key" → *જવાબવહી બતાવો* / *ઉત્તરપત્ર બતાવો*.
- **`pdf_audit.reliability.cronbach_title`** — "સંકર હ્યુરિસ્ટિક" (hybrid heuristic) → *મિશ્રિત હ્યુરિસ્ટિક*.
- **`behavior_lens.raw.instantly_fill_functionmatched_fidelity_items_no_ai_needed`** — "કાર્ય-મેળ ખાતી" → *કાર્ય સાથે મેળ ખાતી*.

*Reviewer note: 0 correctness errors; overall quality is strong (high-resource language). These are polish items.*
