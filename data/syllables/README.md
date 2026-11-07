# Syllable data

`dev-tools/build_syllable_table.cjs` builds `syllable_table_en.js` from these inputs. Nothing downloads at build time.

| File | What it is |
|---|---|
| `data/vendor/moby-hyphenator/mhyph.txt` | Moby Hyphenator II by Grady Ward. Public domain by grant of the author, January 2001 (Project Gutenberg #3204). Pinned by SHA-256 in the build tool. |
| `data/vendor/cmudict/` | CMUdict, already vendored for Word Sounds. Gives syllable counts and stress. |
| `en_common_words.txt` | Most frequent words in the English reading library, most frequent first. Decides which unverified words are worth listing. |
| `en_reviewed.json` | Offline review results. `corrected` replaces a division; `confirmed` marks a flagged division as correct. |

## How a word is sorted

- **Sure:** one-syllable words in CMUdict, Moby divisions whose count matches CMUdict, inflections built from such a stem, and reviewed words.
- **Check:** divisions worked out from sounds alone, and Moby divisions CMUdict cannot confirm. These stay undivided for students until a teacher confirms them.

## How good it is

Measured 2026-11-06 against Wiktionary, which is not an input and which the review never saw, on a frequency-based sample of words that have a Wiktionary division:

| | Words compared | Exact match | Same syllable count |
|---|---|---|---|
| All words shown to students | 134 | 85.8% | 93.3% |

Dictionaries disagree with each other, so many mismatches are differences of convention (`a·loud` and `aloud`, `proc·ess` and `pro·cess`) and not errors. The sample is small. Dictionary divisions can also differ from what a structured literacy program teaches, which is why teachers can change any word.

Against the English reading library, about 94% of multi-syllable word uses are settled by this table, under 1% are flagged, and about 6% are unknown. That 6% is inflated by contractions the app skips, such as `dont` and `didnt`.

## The offline review

An AI review pass read the 9,791 most useful words once, at build time. A correction was kept only if it kept the letters and either matched the CMUdict syllable count or matched Moby. A correction that failed that check leaves the word flagged. Students never trigger AI through this table.

Hyphenation patterns (TeX and similar) were tested and rejected for this: they matched Moby exactly on 55-69% of multi-syllable words and produced splits such as `n·ev·er`, because they are built to find safe line breaks and not syllables.
