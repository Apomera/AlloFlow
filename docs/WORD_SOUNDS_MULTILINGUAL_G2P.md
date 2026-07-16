# Word Sounds — Multilingual Phoneme Coverage (eSpeak NG)

**Status:** Stage 1 shipped 2026-07-12. Verified against the real
`espeak-ng@1.0.2` wasm build (133 voices enumerated + per-voice G2P probes) and
browser-smoked in Chromium (dynamic import + wasm + FS read, English/Spanish/
unsupported paths).

## How it works

`phonics_g2p_loader.js` (`window.AlloPhonics.toPhonemes(word, { lang })`) is the
deterministic phoneme engine. Word Sounds passes the selected content language
(`wordSoundsLanguage`, a BCP-47 code from `getSpeechLangCode`, or a friendly
name):

| Language kind | Behavior |
|---|---|
| **English** (empty / `en-*`) | Exactly the pre-multilingual path: voice `en-us`, output normalized to the phonics teaching inventory (flap ɾ→t, ɚ→ɜr, stress/length stripped). **Byte-identical — English activities are untouched.** |
| **eSpeak-covered language** | Resolves to a voice VERIFIED in the wasm (`voiceFor(lang)`), output is raw stress/length-stripped IPA. English normalizations are deliberately NOT applied (Spanish has a real tap /ɾ/; mapping it to /t/ would corrupt the language). |
| **No eSpeak voice** | `toPhonemes` returns **null immediately** (no wasm load) and the caller keeps its Gemini-generated phonemes — the pre-existing behavior. The old code silently ran ENGLISH G2P for these languages; that could never produce right answers and is now impossible. |

Gemini remains the source for rhymes/distractors/definitions in all languages;
eSpeak triangulates the phoneme sequence where it has a voice.

## Verified coverage (AlloFlow languages)

**eSpeak voice available (raw-IPA G2P active):**
Spanish (`es`, Latin-America `es-419`), French (`fr-fr`), German, Italian,
Portuguese (`pt-br`; European `pt`), Dutch, Arabic, Mandarin (`cmn`),
Cantonese (`yue` — `zh-HK` aliases here, not to Mandarin), Vietnamese, Russian,
Ukrainian, Japanese, Korean, Hindi, Bengali, Urdu, Tamil, Telugu, Kannada,
Malayalam, Marathi, Gujarati, Punjabi, Nepali, Sinhala, Polish, Czech, Slovak,
Hungarian, Romanian, Bulgarian, Croatian, Serbian, Macedonian, Albanian, Greek,
Turkish, Hebrew, Persian/Farsi (+ **Dari → `fa`**, closest variety), Kurdish,
Thai, Indonesian, Malay, Swahili, Amharic, Oromo, Afrikaans, Haitian Creole,
Burmese, Georgian, Armenian, Esperanto, Swedish, Danish, Norwegian (`nb`),
Finnish.

**No eSpeak voice → Gemini-only phonemes (unchanged behavior, now honest):**
Tagalog/Filipino, Somali, Khmer, Lao, Yoruba, Igbo, Hausa, Kinyarwanda,
Kirundi, Lingala, Tigrinya, Mongolian, Hmong, Pashto, Acholi, Karen,
Chin (Hakha/Falam), Maay Maay, Marshallese.

## Quality caveats (be honest with teachers)

- **Abjad scripts** (Hebrew, and to a lesser degree Arabic/Urdu/Persian):
  unvocalized text yields consonant-heavy sequences (`he` on unpointed Hebrew
  is consonantal). Treat as an aid, not ground truth.
- **Tonal languages** (Mandarin/Cantonese/Thai/Vietnamese): eSpeak appends tone
  digits to vowel tokens (`ˈɑu5`). They ride along as part of the phoneme
  token in raw IPA.
- Dari maps to `fa` (Iranian Persian) — closest available variety.
- English dialects (`en-AU` etc.) all route to `en-us` (legacy behavior).

## Upstream note: `getSpeechLangCode`

`wordSoundsLanguage` comes from `getSpeechLangCode(friendlyName)`
(module_scope_extras). Languages missing from its map used to collapse to
`en-US` — which silently ran English speech recognition AND English G2P.
2026-07-12: ~40 languages (Somali, Khmer, Nepali, Marathi, Gujarati, Punjabi,
Telugu, Kannada, Malayalam, Burmese, Haitian Creole, Yoruba, Pashto, Dari,
Karen, …) now map to real BCP-47 codes, so every consumer makes an honest
per-language decision. The final `en-US` default remains for genuinely unknown
names.

## Stage 2 — per-activity capability gating (SHIPPED 2026-07-12)

`wsLangCaps` + `wsActivityAvailableForLang(id)` in `word_sounds_module.js`.
English returns `true` for everything before any other logic runs — English
sessions are unchanged (golden suite passes with zero snapshot drift).
For non-English content languages:

| Activity | Availability | Why |
|---|---|---|
| counting, blending, segmentation, isolation, syllables, rhyming, manipulation, decoding | ✅ all covered languages | run off per-word data in the content language |
| orthography, spelling_bee, word_scramble, missing_letter | ✅ alphabetic scripts only | `split("")` letter tiles are broken fragments on abjads/abugidas/CJK/Thai-family |
| mapping | ✅ alphabetic + LTR only | grapheme-ordering chips assume left-to-right |
| sound_sort, word_families, letter_tracing | ❌ English only | first/last-sound estimators + English word pools; English rime families; a–z letter-formation paths |

Enforcement: the `ACTIVITIES` list (picker + auto-advance + recursion walks)
is filtered; `startActivity` REDIRECTS a pushed/preset blocked activity to the
first available one; the picker shows an honesty chip ("Some activities are
English-only") when anything is hidden. English word-pool injections are also
gated for non-English boards: rhyme fallback pools/RIME_FAMILIES (replaced by
script-agnostic ending-match against the session's own words), decoding
backfill, isolation SIMILAR_SOUNDS/expanded grapheme pools, manipulation
fillers (all pad from the session's own same-language words instead), and the
manipulation Gemini prompt now asks for words in the content language.
Pinned by `tests/word_sounds_language_gating.test.js` (6).

## Not yet built (next stages, in order of value)

1. **Per-language phoneme audio.** English uses the recorded grapheme-keyed
   bank; other languages fall to Gemini TTS per sound. Best answer: per-language
   Voice Packs (the recorder/multi-pack library already ships) — a bilingual
   teacher or aide records the language's sounds once, exports/imports the pack.
2. **Per-language mini-benchmarks** like the English 32/32 set, so each language
   earns its way in with evidence.
3. **Per-language instruction speech** — runtime spoken instructions are
   English constants everywhere; localizing them is its own feature (module
   strings + per-language TTS + bank clips).

## Stage 2b — language-aware pack compiler (SHIPPED 2026-07-13)

Correction to an earlier claim: packed boards OUTRANK the module's runtime
rebuilds, so the stage-2 runtime gates alone did NOT protect the student-pack
path. `word_sounds_setup_source.jsx` is now language-aware end to end
(`packIsEnglish`, from the `wordSoundsLanguage` prop the shell already passes):

- English filler pools join boards ONLY for English packs: common-word pool,
  manipulation fillers (both compile-time and the fallback task), isolation/
  segmentation grapheme pools, missing-letter a–z distractors. Non-English
  packs pad from the pack's own words, own phoneme inventory, and own letters.
- Rime comparisons (`[aeiou]` regex) fall back to a script-agnostic trailing
  match for non-English so rhyme/family boards don't misfilter.
- The per-word Gemini analysis prompt has a language-directed variant (same
  JSON shape; all returned words must be real words of the content language;
  English-phonics notation rules apply only to the English prompt, which is
  string-identical to before).
- The AI topic word-list generator asks for words in the content language and
  no longer strips non-ASCII letters ("niño" survives); the English cleanup
  regex is unchanged for English.

Pinned by the compiler source-pins in `tests/word_sounds_language_gating.test.js`.

## Test/verification surface

- `tests/phonics_g2p_loader.test.js` (52) — voice resolution incl. every
  honest-null case, IPA selection per language, English normalization and
  grapheme alignment pinned unchanged, unsupported-language short-circuit.
- Scratch probes (2026-07-12): 133-voice enumeration; 43 BCP-47 codes probed
  with real words; 20 wave-2 voices probed.
- Playwright Chromium smoke: real CDN + wasm; English normalized, Spanish raw
  (tap/trill preserved, `niño` intact), unsupported → null in ~2ms.
