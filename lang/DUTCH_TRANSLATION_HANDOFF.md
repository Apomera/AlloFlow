# Dutch (Nederlands) — Translation Handoff / Native-Review Punchlist

> **Historical native-review handoff (2026-07-09):** This records the June 2026 Dutch pack QA state and punchlist. Re-run current i18n verification and inspect `lang/dutch.js` before treating "registered and shipping" or the issue counts below as current.

**Pack:** `lang/dutch.js` (11,198 keys) — built 2026-06-21 (AI translation, machine-verified).
**Status:** Registered and shipping. 100% key parity, 0 placeholder mismatches, 0 JSON errors, arrays + DNT preserved, deep-screen 0 defects.

**QA — two independent signals:**
- **Forward native-fluency review** (66-key sample): ~53 good / 13 minor / **0 bad**.
- **Blind back-translation** (44-key sample): mean meaning-overlap **0.81**; all 44 ≥ 0.5; **0 drift** (lowest items are faithful paraphrases). Meaning is preserved.

Dutch has **more "minor" items than the Indic/Turkic packs** — not errors, but **EdTech jargon that calques awkwardly into Dutch** (scaffold/scramble/hooks/leveled). Worth a native pass to naturalize. **Not auto-edited.**

## One near-error to fix
- **`help_mode.tool_quiz`** — typo **"Exittticket"** (triple t) → *Exit Ticket* / *Exitticket*.

## Calque / phrasing punchlist
- **Scaffold → "steiger/Steigers/Steigertypen"** (literally *construction scaffolding*) — `tour.actions_text`, `tour.scaffolds_text`, `tour.fullpack_text`. App-consistent but consider *ondersteuning / steigerteksten*.
- **Scramble → "verdraaien" (to twist)** — `tour.timeline_text` ("Verdraai gebeurtenissen"), `tour.glossary_text` ("Woordverdraaier", "Zinsverdraaier"). Should be *husselen / door elkaar gooien / ontwarren*.
- **Leveled text → "geniveleerde tekst"** (awkward/misspelled) — `tour.simplified_text`, `tour.fullpack_text` → *tekst op niveau*.
- **Hooks → "haken"** ("betrokkenheidshaken", "Discussiehaken") — `tour.brainstorm_text` → *aanknopingspunten / prikkelende openers*.
- **Scaffolded quiz → "gesteigerde quiz"** — `tour.quiz_text` → *gedifferentieerde / ondersteunde quiz*.
- **Sentence Starters → "Zinsbeginningen"** (non-standard) — `tour.scaffolds_text` → *Zinsbegin(nen) / Startzinnen*.
- **`tour.persona_text`** — *Rapport Builder* → **"Bandenbouwer"** reads as *tyre builder* (banden = car tyres!) → *Verbindingsbouwer* or keep *Rapport*; "Personagechat" → *Persona-chat*.
- **`tour.anchor_chart_text`** — "klaslokaalklare" (clunky coinage) → *klaar voor de klas*; "verkleuren" (= discolour/fade) for *recolor* → *herkleuren / van kleur veranderen*.
- **`help_mode.dashboard_cross_tool_misconceptions`** — "EL Education-stijl klaslokaal" word order → *klaslokaal in EL Education-stijl*.
- **`behavior_lens.raw.instantly_fill_functionmatched_fidelity_items_no_ai_needed`** — "trouwitems" for *fidelity items* → *behandelintegriteit* / keep *fidelity-items*.

*Reviewer note: 0 mistranslations across both passes; meaning is solid. The work here is naturalizing calqued jargon, plus the one typo above.*
