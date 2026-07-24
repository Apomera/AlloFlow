# Language Pack Quality Review — 2026-06-08

> **Status note, July 9, 2026:** This review covered the earlier 56-pack set. The repo currently has 63 `lang/*.js` pack files mirrored to `desktop/web-app/public/lang/`; verify newer packs separately before treating this as full-current coverage.

Multi-agent native-quality review of all 56 packs (workflow wf_2561df8f-65b, 55 agents, 2.1M tokens, 123 web searches). Web-search-backed for 18 lower-resource packs. Reviewed ~40 highest-visibility keys per pack (common.* buttons, alerts/confirms, launch_pad hero, sidebar onboarding, 2 tour bodies, 3 pdf_audit tooltips).

**Reviewed 51/56** (4 socket-fail, need re-run: chinese_traditional, korean, hebrew, punjabi). **538 findings, 319 critical/high.**

Assessment: 1 excellent, 23 good, 25 needs-work, 2 poor.

> KEY DISCOVERY: the passthrough metric (which rated all 49 non-PPS packs "excellent <5%") CANNOT see half-translated Spanglish — a string like Greek "Διαγραφή this στόχος?" is not an exact English match so it counts as "translated." This review found pervasive sentence-level Spanglish that the metric masked.

---

## FINDING 1 (HIGHEST PRIORITY, byte-verified) — alerts.* + confirms.* half-translated Spanglish

A repeating bimodal pattern across ~23 packs: short common.* buttons are fluent native, but **safety-critical alerts and destructive-action confirms are half-English** — only nouns/verbs substituted, English connectors + whole clauses left. Includes irreversibility warnings ("Edges and justifications cannot be recovered") left in English on data-loss confirms. Verified against shipped lang/*.js bytes.

| Pack | Leaked alerts/confirms keys |
|---|---|
| haitian_creole | 18 |
| greek | 15 |
| indonesian | 15 |
| acholi | 14 |
| chin_hakha | 13 |
| karen | 13 |
| marshallese | 13 |
| maay_maay | 12 |
| bengali | 11 |
| amharic | 10 |
| hmong | 10 |
| kinyarwanda | 10 |
| kirundi | 10 |
| lingala | 10 |
| swahili | 10 |
| tagalog | 10 |
| tigrinya | 10 |
| latin | 9 |
| hausa | 6 |
| igbo | 6 |
| romanian | 6 |
| yoruba | 6 |
| japanese | 5 |

**Total: 242 leaked keys across 23 packs.** (french/french_canadian/nepali excluded — only cognate false positives "atlas"/"justifications".) 30 packs clean (the hand-translated majors).

Fix: hand-translate the alerts.* + confirms.* namespace for these packs from English source (same approach as the pdf_audit help-mode work). Prioritize the destructive confirms (delete_*, replace_*, remove_*).

---

## FINDING 2 (CRITICAL, needs human decision) — maay_maay is the wrong language

The maay_maay pack is written in **Standard Somali (Af-Maxaa), not Maay Maay (Af-Maay)** — not mutually intelligible, so for the Digil/Mirifle audience it is effectively the wrong language. Plus an outright error: common.settings = "Habeenta" (="the night"). Decision needed: source a real Maay Maay translator, or relabel/withdraw the pack. (Matches the long-standing memory note that maay_maay pack-identity needs human review.)

---

## FINDING 3 (HIGH) — common.* button outright-errors in low-resource packs (agent web-verified, spot-confirm before fixing)

- **karen** `common.processing`: 'Processing...' rendered 'အိၣ်ဝဲဒၣ်...' which reads as 'it exists / is present', not 'processing / working on it'. Does not convey an in-progress oper
- **karen** `common.copy`: 'Copy' rendered 'ကွဲးခိၣ်ဖးအီၤ' which reads as a phrase ('write/read it...') rather than the UI action 'copy (to clipboard)'. Looks like an MT phrase,
- **maay_maay** `common.settings`: 'Habeenta' means 'the night' (from habeen/habeenkii), not 'Settings'. This is a clear mistranslation, independent of the dialect issue.
- **yoruba** `common.error`: "ṣiṣe" means "doing/action/work" (the gerund of ṣe), not "error". A user seeing an error dialog labelled "ṣiṣe" would be confused. The word for error/
- **yoruba** `common.loading`: "Ń gbé" means "lifting/carrying" (continuous of gbé, to lift). It does not convey software "Loading...". A native speaker would read this as nonsense
- **yoruba** `common.close`: "Tipa" (ti pa) reads as "has killed/has quieted", not the act of closing a window/dialog. The verb to close/shut is tì.
- **acholi** `common.next`: "Ngeyo" means "to know" in Acholi (confirmed via the proverb 'Labul tong gweno ngeyo ka pene' = '...knows where...'), not "Next". A Next button labele
- **acholi** `common.confirm`: "Tyek" means "finish/complete/end", not "Confirm". It is also reused for "Complete/finish" inside the tour bodies (e.g. 'Tyek lok madwong'='Complete s
- **chin_hakha** `common.save`: "Khoh" means "spring/sprout/germinate" (as in plants springing from seeds), not "save". This is a high-visibility button label and the meaning is wron
- **marshallese** `common.back`: 'Ruwāp' does not appear to be a standard Marshallese word for 'Back' (navigation). The idiomatic terms for return/go-back are 'jepḷaak' or 'rọọl'. Cou
- **lingala** `common.delete`: "Bomá" is the imperative of koboma = 'to kill', not 'to delete'. For removing a digital item the natural verb is kolongola (remove) or kolimwisa/kolim
- **kirundi** `common.copy`: 'Igana' renders Copy, but 'kwigana/igana' means 'to imitate/resemble', not the UI sense of duplicating to clipboard. Reads oddly as a button.
- **ukrainian** `common.error`: "помилки" is genitive singular / nominative plural, not the nominative singular noun. As a standalone label/header it should be the nominative "Помилк
- **ukrainian** `common.success`: Lowercased "успіх". A standalone UI label should be capitalized to match the other buttons/labels (Зберегти, Скасувати...).
- **ukrainian** `common.next`: "наступний" is a lowercase masculine adjective ("next [one]"), not the navigation button. A Next button in Ukrainian UI is "Далі".
- **ukrainian** `common.settings`: Lowercased "налаштування". Standalone menu/button label should be capitalized: "Налаштування".
- **ukrainian** `common.help`: Lowercased "допомога". Standalone menu/button label should be capitalized: "Допомога".
- **somali** `common.processing`: "Waa la qabanqaabinayaa" means "it is being planned/organized" (qabanqaabin = planning/preparation), not "Processing...". This is a wrong-meaning spin
- **italian** `common.error`: "errori" is plural ("errors") for the singular source "Error". A single-error label/heading should be singular.

---

## FINDING 4 (HIGH) — corruption residue from prior find-replace pipelines

- **yoruba** `common.success`: "ṣeyọri" is missing its initial vowel and tone marks. The correct noun is àṣeyọrí. Head-vowel-drop pattern consistent with a prior find-replace pipeli
- **yoruba** `common.settings`: "eto" is missing its tone mark; the word is ètò. Same head-vowel/tone-drop pattern as common.success / common.help / common.error.
- **yoruba** `common.help`: "iranlọwọ" is missing initial-vowel and tone marks; correct form is ìrànlọ́wọ́.
- **indonesian** `launch_pad.subtitle`: 'Pilih Anda pembelajaran pathway' — 'pathway' left in English and word order is non-Indonesian (possessive/noun ordering wrong). High-visibility homep
- **indonesian** `sidebar.ai_guide_welcome`: Onboarding greeting riddled with embedded English: 'I'm Anda AI Guide. I dapat bantuan dengan ... navigate app untuk Anda ... otomatis-pengaturan Anda
- **acholi** `tour.adventure_text`: Every occurrence of Story / Story Mode / Social Story / narrative has been replaced by the fixed phrase "lok ma kicoyo" (literally 'words that are wri
- **latin** `common.close`: Translation is "Claude" — the English verb "Close" was corrupted into the brand/assistant name "Claude" by a prior find-replace pipeline. It is not La
- **kinyarwanda** `tour.adventure_text`: Contains the non-word 'rusenyeri' ('kuri buri rusenyeri' rendering 'per turn'). 'rusenyeri' is not a real Kinyarwanda word; it is corruption residue f
- **kinyarwanda** `tour.quiz_text`: Garbled token from a botched replace: 'Kuri ako kanya Differentiated Dekuri ako kanyary' (a header where 'Delivery' was partially overwritten with the
- **portuguese_angola** `common.cancel`: Garbled token from a find-replace pipeline: 'Cancelarar' is not a word (doubled suffix). Should be 'Cancelar'.
- **pashto** `launch_pad.subtitle`: The translation is garbled word-salad: 'څخهتخب کړئ مسار زده کول خاص بک'. It looks like a corrupted/scrambled find-replace artifact (note the fused tok
- **pashto** `tour.adventure_text`: Multiple ل→نه corruption artifacts. 'د دنهیلو سره کرکټرونه قانع کړئ' should be 'د دلیلو سره' (persuade with arguments/logic) — 'دنهیلو' is corrupted '
- **urdu** `common.next`: "اگنہیں" is not a word. A find-replace pipeline spliced the fragment "نہیں" into "اگلا", destroying the standard term for the Next button. Highly visi
- **urdu** `launch_pad.subtitle`: "سےتخب کریں مسار سیکھنا خاص بک" is fully scrambled word-salad — words are out of order and mangled (سےتخب is a broken منتخب, خاص بک is garbage). This
- **urdu** `tour.adventure_text`: Multiple mangled non-words from the find-replace pipeline: "غاطسانہ" / "غاطسی موڈ" / "غاطسی" (intended immersive = غوطہ زن; note the quiz tour correct
- **somali** `tour.adventure_text`: "Adag (cisigaal adag, kheyraad la dhamayn)" — "cisigaal" is not a Somali word; it appears to be a garbled token for "ciqaab" (penalty/punishment), whi
- **tamil** `tour.adventure_text`: Wrong sentence terminator throughout: lines end with the Devanagari danda '।' (U+0964) e.g. 'தேர்ந்தெடுக்கவும்।', 'வைக்கவும்।', 'நிர்வகிக்கவும்।', 'பய
- **bengali** `sidebar.ai_guide_welcome`: The onboarding greeting (one of the most-seen strings) is a badly garbled Spanglish jumble from a partial find-replace pipeline: "হ্যালো! I'm আপনার এআ
- **dari** `launch_pad.subtitle`: The homepage hero subtitle 'انتخاب کنید مسار یادگیری خاص بک' is broken: verb-first word order is a calque (not natural Dari), 'مسار' is the Arabic for
- **german** `sidebar.ai_guide_welcome`: The onboarding greeting is heavily corrupted with find-replace residue and embedded English: "Ich'm dein AI Guide. Ich kann Hilfe mit UDL strategies,
- **farsi** `launch_pad.subtitle`: The translation 'انتخاب کنید مسار یادگیری خاص بک' is broken and reads as nonsense to a native speaker. (1) Word order is wrong (verb-first, no subject

---

## FINDING 5 (MEDIUM) — sister-pack dialect bleed

- **portuguese_portugal** + **portuguese_angola**: pervasively Brazilian (gerunds Carregando/Processando, "seu" without article, salvar/arquivo/tela/celular, "leitores de tela", "justificativas", "Excluir"). Both should sweep BR→PT-PT/Angola forms.
- **spanish_castilian**: LatAm terms in tour bodies (pizarrón→pizarra, puntaje→puntuación, "Cuarto de Escape"→"Sala de Escape", estudiantes→alumnos).
- **kirundi**: leaks Kinyarwanda forms (gushyiraho→gushiraho).
- **tigrinya**: "Leaderboards"→transliteration with Amharic plural suffix.

---

## FINDING 6 (MEDIUM) — Ukrainian common.* case/capitalization

Lowercased standalone labels, wrong case (помилки genitive), "наступний" adjective instead of nav term "Далі". Quick mechanical sweep.

---

## Per-pack assessment (worst-first)

| Pack | Assessment | C/H/M/L | tier |
|---|---|---|---|
| karen | poor | 4/10/2/2 | web-heavy-pps |
| maay_maay | poor | 2/11/1/1 | web-heavy-pps |
| yoruba | needs-work | 6/5/7/2 | web-heavy |
| indonesian | needs-work | 8/4/0/7 | llm-native |
| acholi | needs-work | 0/15/3/0 | web-heavy-pps |
| chin_hakha | needs-work | 0/14/1/3 | web-heavy-pps |
| greek | needs-work | 10/1/1/5 | llm-native |
| latin | needs-work | 7/7/1/2 | llm-native |
| tagalog | needs-work | 8/5/0/4 | llm-good-verify |
| kinyarwanda | needs-work | 0/12/5/0 | web-heavy |
| marshallese | needs-work | 0/11/4/2 | web-heavy-pps |
| portuguese_portugal | needs-work | 0/7/4/5 | llm-native |
| portuguese_angola | needs-work | 3/6/2/5 | llm-native |
| romanian | needs-work | 7/3/1/5 | llm-native |
| lingala | needs-work | 0/12/4/0 | web-heavy |
| tigrinya | needs-work | 3/7/5/1 | web-heavy |
| amharic | needs-work | 8/4/3/1 | web-heavy |
| igbo | needs-work | 1/9/4/1 | web-heavy |
| kirundi | needs-work | 6/6/1/2 | web-heavy |
| hmong | needs-work | 0/11/4/0 | web-heavy |
| swahili | needs-work | 9/3/1/1 | llm-good-verify |
| japanese | needs-work | 5/4/2/2 | llm-native |
| ukrainian | needs-work | 2/4/3/3 | llm-native |
| burmese | needs-work | 0/5/5/2 | web-heavy |
| hausa | needs-work | 6/1/2/2 | llm-good-verify |
| pashto | needs-work | 1/3/2/2 | llm-good-verify |
| urdu | needs-work | 1/2/1/1 | llm-good-verify |
| somali | good | 0/3/5/4 | web-heavy |
| nepali | good | 3/5/1/2 | llm-good-verify |
| spanish_castilian | good | 0/0/5/3 | llm-native |
| tamil | good | 4/1/1/2 | llm-good-verify |
| khmer | good | 0/3/3/2 | web-heavy |
| french_canadian | good | 0/0/1/6 | llm-native |
| italian | good | 0/2/4/1 | llm-native |
| bengali | good | 3/1/0/3 | llm-good-verify |
| vietnamese | good | 0/0/3/3 | llm-native |
| thai | good | 0/3/1/2 | llm-native |
| dari | good | 1/0/3/2 | llm-good-verify |
| german | good | 2/1/1/1 | llm-native |
| russian | good | 0/0/2/3 | llm-native |
| arabic | good | 0/0/2/3 | llm-native |
| telugu | good | 3/1/0/1 | llm-good-verify |
| farsi | good | 1/0/0/4 | llm-good-verify |
| spanish_latin_america | good | 0/0/1/3 | llm-native |
| french | good | 0/0/2/2 | llm-native |
| chinese_simplified | good | 0/2/1/1 | llm-native |
| portuguese_brazil | good | 0/0/0/2 | llm-native |
| chin_falam | good | 0/0/1/1 | web-heavy-pps |
| polish | good | 0/1/0/0 | llm-native |
| lao | good | 0/0/0/0 | web-heavy-pps |
| hindi | excellent | 0/0/0/1 | llm-native |

*Generated from workflow wf_2561df8f-65b. Full per-finding detail in the task output JSON.*

---

## RESOLUTION (2026-06-14) — all findings addressed

Status of every finding from this review. All work is committed to local `main`
(deploy HELD pending tree coordination per Aaron); mirror regenerates via deploy.sh.

| Finding | Status | Commit(s) |
|---|---|---|
| 1 — alerts/confirms half-Spanglish (242+ keys) | **FIXED** — structural-Spanglish 242→0; ~913 keys re-translated across 31 packs | f330b0c9, f48ab681 |
| (preventive) CI guard | **ADDED** — `check_safety_string_spanglish.cjs`, BLOCKING in verify_all + verify:gate | 616dbb21 |
| 2 — maay_maay is wrong language | **HUMAN DECISION** — verified it is Standard Somali (Af-Maxaa), not Maay Maay (Af-Maay). Cannot produce real Af-Maay without a native source (fabrication would be worse). Options for Aaron: (a) relabel the pack as a Somali variant, or (b) recruit an Af-Maay translator. Left untouched. | — |
| 3 — common.* outright errors (low-resource) | **FIXED** — verified per-language (web-backed): lingala Delete kill→remove, yoruba/acholi/chin_hakha/marshallese/somali/ukrainian/etc. | b1a00e9d |
| 4 — corruption residue | **FIXED** (real ones) — angola "Cancelarar", urdu/pashto/dari/farsi scrambled subtitles, tamil danda, yoruba tone, etc. **Latin common.close="Claude" confirmed FALSE POSITIVE** (correct Latin imperative of *claudere*) — left as-is. | b1a00e9d |
| 5 — sister-pack dialect bleed | **FIXED** — PT-Portugal/Angola BR→PT-PT sweep; Spanish Castilian/LATAM term fixes | b1a00e9d |
| 6 — Ukrainian common.* caps/case | **FIXED** — capitalization + "Далі" for Next | b1a00e9d |
| 4 socket-failed packs (never reviewed) | **REVIEWED + FIXED** — found SYSTEMIC breakage: korean (~196) + punjabi (~78) common.* word-salad MT; chinese_traditional + hebrew smaller fixes | b1a00e9d |
| Additional errors (beyond the review) | **FIXED** — 186 newer untranslated keys (errors.*, audio/mic controls, hints) across 31 packs; residue 228→58 (remainder = PPS passthrough + brand/feature FPs) | 9dfc0d5b |

Method throughout: verify-then-fix (the review was AI-generated and contained ~40
false positives, all rejected), web-search-backed for low-resource languages,
honest passthrough-or-skip over a wrong guess, placeholder/tag integrity enforced,
every batch validated (check_lang_json 56/56, safety-spanglish guard 0).

Known remaining (low-severity, documented): ~13 non-PPS residue keys that are
mostly false positives (feature names like "Word Sounds", placeholder examples
like "Minecraft/K-pop/pixel art", accepted tech loanwords) plus a few unverifiable
low-resource tooltips; the PPS cluster's intentional English passthrough on
long-tail keys; and maay_maay (Finding 2, human decision).

---

## CONTENT-MODULE SWEEP (2026-06-19) — partial-translation residue cleared

After the findings work, a scan of all content modules (adventure, quiz, a11y_lab,
toasts, tour, tips, timeline, dashboard, games… excluding behavior_lens) found
~8,116 keys that were PARTIALLY translated — English words left embedded in
otherwise-native text (MT residue predating the Phase Y/Z sweeps), concentrated in
non-Latin-script packs (greek 731, ukrainian 635, nepali 389, amharic 357, khmer
356, hindi 315, tigrinya 300, tamil 292, burmese 284, punjabi 273, korean 183…).

A chunked web-backed workflow (110 chunks @ ~90 keys) finished them: **5,791
applied, ~1,690 correctly skipped as false positives** (brand/feature names,
placeholder examples, idiom). Committed @bb4c77b1. Residue **8,119 → 2,746 (−66%)**.

**The remaining ~2,746 are the irreducible floor — legitimate English kept-terms,
not defects:** brand/feature names (Word Sounds Studio, AlloBot, FAB, Lumen),
pedagogical proper nouns (Elkonin boxes, Venn, Ishikawa, RSVP, Bionic Reading,
Dual Coding, Karaoke), standards/acronyms (UDL, TTS, ORF, WCPM, Tier 2/3, RTI,
PowerPoint), and formatting markers (Pro Tip), with the surrounding prose fully
translated. Pushing further would be over-translation (calquing proper nouns).

Verification: check_lang_json 56/56; safety-spanglish guard 0; placeholder/tag/
emoji/markdown integrity preserved (apply rejected only the known source-side
{1F4CA} 📊 artifact). behavior_lens (903, own guard), PPS cluster (intentional
passthrough), and maay_maay (Finding 2, human) remain out of scope by design.

This is the cleanest the packs have been: machine-detectable partial-translation
is now at the legitimate-kept-term floor. Further quality gains are native-speaker
register/idiom judgment — which the proposed in-app translation-feedback channel
(reusing error_reporter_module.js's Google-Form flow) is designed to capture.
