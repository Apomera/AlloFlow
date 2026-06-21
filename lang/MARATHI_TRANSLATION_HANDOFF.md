# Marathi (मराठी) — Translation Handoff / Native-Review Punchlist

**Pack:** `lang/marathi.js` (11,198 keys) — built 2026-06-20 (AI translation, machine-verified).
**Status:** Registered and shipping. Structurally complete: 100% key parity with the reference pack, 0 placeholder mismatches, 0 JSON errors, arrays + DNT terms preserved, deep-screen 0 defects. A 66-key stratified native-fluency review scored **56 good / 10 minor / 0 bad**.

The items below are the **10 "minor"** findings — understandable but slightly awkward (calques, a couple of missing object markers, one script-mix). **Not auto-edited** — left for a native Marathi speaker to confirm before applying.

## Whole-pack pattern (from deep screen)
- **UI-element references in English:** some help/tooltip text names a UI element by its English label (e.g. *History* / *Save* / *Generate* / *Download* / *Upload* / *Regenerate* buttons) while the in-app UI shows the translated label. Pick a policy (keep English vs match the Marathi label) and apply consistently. (Proper nouns — ADA, TEKS, WCAG, Google Search, Cornell/Pauk citations — and `export.filenames.*` code values are correctly left in English.)

## Per-key suggestions
- **`tour.actions_text`** — "बळजबरी पुनर्निर्मिती" (Force Regenerate; बळजबरी = coercion) → *सक्तीने पुन्हा तयार करा* / *पुन्हा तयार करण्यास भाग पाडा*.
- **`tour.glossary_text`** — crossword "clues" as "सूत्रे" (सूत्र = formula) → *सुगावे* / *संकेत*.
- **`tour.note_taking_text`** — "प्रश्न मूळे" (Question Stems; unclear) → *प्रश्न-आरंभ* / *प्रश्नांचे आधार*; "बीजित" (seeded, over-literal) → *पेरलेले* / *समाविष्ट*.
- **`tour.persona_text`** — "...पातळी आकार द्या" missing object marker → *पातळीला आकार द्या*.
- **`tour.brainstorm_text`** — "सहभाग आकर्षक घटक" (engagement hooks) → *सहभाग आकर्षित करणारे घटक* (same in the input line).
- **`tour.analysis_text`** — "मुख्य संकल्पना" renders *Key Themes* as "key concepts" → *मुख्य विषयसूत्रे*; "विचलने" (distractions) → *लक्ष विचलित करणाऱ्या गोष्टी*.
- **`help_mode.dashboard_cross_tool_misconceptions`** — "गैर-quiz" mixes scripts → *गैर-प्रश्नमंजुषा* (प्रश्नमंजुषा used elsewhere for quiz).
- **`pdf_audit.reliability.cronbach_title`** — "जोडीनिहाय संकरित अनुमान" (अनुमान = inference, not heuristic) → *जोडी-निहाय संकरित ह्युरिस्टिक*; word order "Cronbach चा textbook α नाही" → e.g. *पाठ्यपुस्तकी Cronbach चा α नव्हे*.
- **`adventure.standards_search_btn`** — "मानक डेटाबेस शोधा" (reads "search the standard database") → *मानकांचा डेटाबेस शोधा*.
- **`behavior_lens.raw.instantly_fill_functionmatched_fidelity_items_no_ai_needed`** — "विश्वसनीयता" (reliability) is off for behavioral *fidelity* → *तंतोतंतपणा* (or keep "fidelity").

*Reviewer note: 0 correctness errors; overall quality is strong (high-resource language). These are polish items.*
