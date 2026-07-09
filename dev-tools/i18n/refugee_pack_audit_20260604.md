# Refugee-language pack audit snapshot (2026-06-04)

> **Historical audit note (2026-07-09):** This reviewed seven Behavior Lens language packs as they existed on 2026-06-04. Treat the scores and defects as a snapshot for triage; re-run the i18n gap, staleness, and Spanglish checks against current `lang/*.js` files before deciding whether any pack is pilot-ready.

## Headline

Across all seven refugee-language behavior_lens packs audited, **none are ship-ready as-is**. The least-bad pack (chin_falam, 72/100) has a localized ~10-tile cluster of pure-English hub descriptions and at least one possibly-religious mistranslation in a privacy string; the rest (lao 52, marshallese 38, acholi 38, maay_maay 28, chin_hakha 28, karen 22) range from "heavy Spanglish" to "substantively English with translated function words." Two packs ship visible character corruption in tile titles (marshallese "maroñ't Do", maay_maay "wuu kara't Do"). One pack (maay_maay) appears to actually be Somali, not Af-Maay. **All seven require native-speaker review before any refugee-family pilot.**

## Per-pack verdict

| Pack | Score | Confirmed defects | Recommendation |
|---|---|---|---|
| chin_falam_behavior_lens | 72 | 15 | NATIVE-REVIEW (targeted re-translate of ~13 hub_desc keys + `profile.desc`) |
| lao | 52 | 41 | NATIVE-REVIEW after em-dash regex re-run |
| marshallese | 38 | 32 | RE-TRANSLATE hub.*_desc + toast.* + fix 3 corruptions |
| behavior_lens-acholi | 38 | 41 | RE-TRANSLATE hub.*_desc + replace "Matter" calque |
| maay_maay | 28 | 41 | RE-TRANSLATE end-to-end; first confirm language identity (Maay vs Somali) |
| chin_hakha | 28 | 41 | RE-TRANSLATE; fix systemic "ah"-as-infinitive + "si lo"-as-negator |
| karen | 22 | 56 | RE-TRANSLATE; entire pack reads as Karenglish |

## Cross-pack patterns

- **Em-dash preprocessing failure (lao, chin_falam).** Source strings containing `—` were either left fully English with `—`→`,`, or had `—`→`:` with surrounding English retained. ~10-20 hub tile descriptions per pack hit.
- **Function-word-only substitution (acholi, maay_maay, marshallese, karen, chin_hakha).** Translator pipeline replaced only and/with/your/to/this/or, leaving every content noun and verb in English.
- **Calque syntax for English "to" + verb (chin_hakha "ah", karen "ဆူ", marshallese "ñan", maay_maay "ku").** Postpositions repurposed as infinitive markers — grammatically broken in target languages.
- **Visible MT corruption in tile titles (marshallese "maroñ't Do", maay_maay "wuu kara't Do", marshallese "check-ilo", "Real-iien").** Naive string-replace left contraction stubs and broke compounds.
- **Placeholders + acronyms held up everywhere.** Across all 7 packs, `${...}` template literals and BehaviorLens/ABA/FBA/BIP/IEP/FERPA/BCBA preserved. This is the one bright spot.
- **Privacy/FERPA strings degraded in multiple packs** (karen `ai.consent_ferpa_note`, `consent_li_no_real_names`; chin_falam `profile.desc` "biaknemhnak"=worship; marshallese `consent_title` "Kōļaļ"=adjective; chin_hakha `consent_template_exported` left English) — exactly the strings that gate refugee-family data trust.

## Top defects per pack

**lao** — (critical) `behavior_lens.score_1_5` "Score (1,5):" reads as 1.5 decimal in EU notation; (critical) `behavior_lens.ph.share_what_you_notice_at_home_*` Family Voice placeholder is fully English; (major) `behavior_lens.hub.fidelity_title` "Fidelity"→"honesty" (ຄວາມຊື່ສັດ).

**behavior_lens-acholi** — (critical) `educator_hub.educator_hub_behavior_lens_card` ~85% English Tier-1 educator card; (critical) `behavior_lens.hub.hypothesis_desc` leading "A" dropped from "A→B→C", breaking the ABC framework; (major) "Data"→"Matter" calque repeats across dozens of keys.

**maay_maay** — (critical) `behavior_lens.hub.cantdowontdo_title` ships "wuu kara't Do" (corrupted contraction); (critical) pack identity: this is Somali orthography, not Af-Maay; (critical) `behavior_lens.quick_fill_hint` "wuu kara"=he-can used for generic "you can" (gender error).

**marshallese** — (critical) `behavior_lens.hub.cantdowontdo_title` "maroñ't Do" (same contraction bug); (major) `behavior_lens.hub.biascheck_title` reframes bias-reflection as "look at unjust thoughts" (accusatory); (major) `ph.eg_*` keys gloss "e.g."→"ālkin." (after).

**karen** — (critical) `behavior_lens.hub.toggle_title_off` privacy-statement subject garbled ("data leaves your browser" → student-as-subject); (critical) `behavior_lens.ai.consent_ferpa_note` repetitive "နၤနၤပူၤလၢၤနၤ" loop in a FERPA string; (critical) `behavior_lens.hub.hypothesis_desc` leading "A" dropped from "A→B→C".

**chin_falam_behavior_lens** — (major) `profile.desc` uses "biaknemhnak" (likely "worship") for "personalize"; (major) ~10 `hub.*_desc` tile descriptions are pure English with em-dash→comma; (major) `sandbox.complex_desc` mixed-language.

**chin_hakha** — (critical) `behavior_lens.hub.open_btn` "Ka BehaviorLens" = "My BehaviorLens" not "Open"; (critical) `behavior_lens.token.target_placeholder` example may invert the desired behavior; (critical) `behavior_lens.ui.behaviors_can_serve_multiple_functions_*` ~95% English FBA instructional copy.

## Recommended next actions

1. **(Quick-win, P0)** Re-run translation for any source string containing `—`. Fixes ~15-20 critical/major defects in lao + chin_falam in one pass.
2. **(P0)** Confirm maay_maay language identity with a Maine Somali Bantu / Maay community contact before any other Maay work — current pack is Somali.
3. **(P0)** Hand-patch the three corrupted tile titles: marshallese & maay_maay `cantdowontdo_title`, marshallese `selfcheck_desc` "check-ilo", `Real-iien`. These are immediately visible.
4. **(P0)** Build a glossary of ABA terms (consequence, fidelity, reinforcement, caseload, acting-out, replacement behavior, antecedent, data, observation) per pack, then sweep for inconsistencies. Run dev-tools/i18n extractor against descriptive keys (`hub.*_desc`, `ui.*`, `ai.*`, `ph.*`) and re-translate with prompt that explicitly forbids leaving English content words.
5. **(P1)** FERPA/AI/consent block (`ai.consent_*`, `system.ai_turned_*`, `profile.desc`, `toggle_title_*`) gets native-speaker review for every pack — these gate family trust and have already shown semantic drift in karen, marshallese, chin_falam, chin_hakha.
6. **(P1)** Add a CI guard in dev-tools/i18n: flag any string where >40% of tokens after stop-word removal are still ASCII/Latin in a non-Latin-script target pack, and any string containing `'t ` (contraction stub).
7. **(P2)** Cross-pack glossary alignment for the four already-pilot-bound packs (Falam, Hakha) so the same English concept doesn't render two ways across sibling tools (e.g., "mastered", "student", "replacement behavior").

## Honest caveat

This audit was **Claude reviewing Claude** — same model class auditing its own translation work. Self-confidence was reported `low` or `very_low` for every pack. For Marshallese, Sgaw Karen, Falam Chin, Hakha Chin, Acholi, and Maay Maay, training data is sparse and Claude's blind spots are systematic: it can detect obvious English residue and broken compounds (those flagged confidently above), but it cannot reliably judge register, honorifics, dialectal authenticity, culturally-loaded crisis/trauma vocabulary, or whether a coined neologism is field-acceptable to a school psychologist in that language community. Lao is the only pack where confidence in the "lexically-off" calls (Fidelity→honesty, Reinforcement→goods-warehouse, claims→rights) is medium-high because the errors are dictionary-level. **Every pack listed here needs a native-speaker review pass by a member of the AlloFlow pilot family network or a partner Maine refugee organization (Catholic Charities Maine RIS, ProsperityME, Maine Immigrants' Rights Coalition language banks) before being declared shipped to families.**
