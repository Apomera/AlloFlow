# CMUdict count and stress data

The files `cmudict.dict`, `cmudict.phones`, `README`, and `LICENSE` are unmodified
from [cmusphinx/cmudict commit 74790861f652b15e4ac49015a90074ad62a27690](https://github.com/cmusphinx/cmudict/tree/74790861f652b15e4ac49015a90074ad62a27690).
`source.json` records their integrity hashes and generated artifact metadata.
The upstream license is retained here and in the generated browser module.

Run `node dev-tools/build_word_sounds_pronunciations.cjs` to rebuild the root and
desktop public copies of `word_sounds_pronunciations.js`. Run the same command
with `--check` to verify them without network access or writes. `--refresh`
explicitly downloads the same pinned source files and validates their hashes;
it does not silently update to the latest dictionary. A source upgrade requires
reviewing a new commit and updating the pin and hashes in the generator.

The generated module registers `window.AlloModules.WordSoundsPronunciations`
and exports the same API through CommonJS. `createWordSoundsPronunciationData()`
returns the cached API. `lookup(word)` returns immutable strings of vowel stress
digits: `0` is unstressed, `1` primary stress, and `2` secondary stress. Each
string's length is a syllable count for that dictionary pronunciation. Alternate
stress patterns retain their upstream order, and duplicate patterns are merged.
For example, `family` returns `['100', '10']`, representing three or two syllables.
The dictionary index is initialized only on the first nonempty lookup.

This is a US English reference, not a catalog of all English dialects. Upstream
alternates are not tagged with a dialect, part of speech, speaking rate, or a
specific TTS voice. The order is not a frequency or educational recommendation.
Eight entries without vowel phones remain unresolved; they are listed in
`source.json`. Unknown words likewise return an empty list. No word is split
into guessed spelling fragments, and no matching or reviewed audio is implied.

The lookup includes the full dictionary so custom words and subject vocabulary
can be checked offline. It is evidence for a requested word, not a vocabulary
suggestion list: names, rare words, and adult vocabulary are present upstream.
Only deliberately selected teaching words should become activity choices.
