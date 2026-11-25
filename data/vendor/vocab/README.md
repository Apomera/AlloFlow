# Vocabulary bank sources (data/vendor/vocab)

Build inputs for the offline definition bank of the AlloFlow Packets vocabulary activities. Nothing here is
loaded by a page; the folder is listed in `.assetsignore`.

| File | What | Licence |
|---|---|---|
| `simple_wiktionary_en.json` | Simple English Wiktionary (kaikki.org extract), filtered to the bank's words | CC BY-SA 4.0 (`CC-BY-SA-4.0.txt`) |
| `wiktionary_en.json` | English Wiktionary (kaikki.org), filtered: forms, fallback definitions, usage examples | CC BY-SA 4.0 |
| `wordnet_en.json` | Open English WordNet 2025, filtered: senses, glosses, word families | CC BY 4.0 (`CC-BY-4.0.txt`, `OEWN_LICENSE.md`) and the Princeton WordNet License (`WNDB_License.txt`) |
| `wordlists_en.json` | unit list (AlloFlow), NAWL 1.2 headwords (CC BY-SA 4.0), Word Sounds word choice, CYP-LEX Zipf (CC BY 4.0) | as listed |

`source.json` gives each download's address, size and sha256, and each extract's sha256.

- Re-make the extracts (needs the downloads): `node dev-tools/prepare_packets_vocab_vendor.cjs --simple ... --wiktionary ... --wordnet ... --nawl ... --units ...`
  As made on 2026-11-23, add `--builtin-from <the wordlists_en.json of 2026-11-12> --extended-common 40000` (see below).
- Build the bank: `node dev-tools/build_packets_vocab_bank.cjs` (`--check` fails when the committed output is stale; `--report` prints counts).
- Corrections: `data/packets_vocab_curation_en.json` (per word: sense order, verdict good / fixed / reject, replacement text, chosen wrong answers, reason).

**How the bank was checked.** The bank draws on Wiktionary, WordNet, and school meanings added for AlloFlow. The original 86 unit words and
the 959 NAWL words were checked and corrected with AI assistance on 2026-11-12 (sense order, rejects, fixes,
wrong answers); this was not a review by a person. A second pass, also checked and corrected with AI assistance
on 2026-11-12 and not reviewed by a person, covered the 1,500 most common built-in Word Sounds content words (by
frequency in children's books), for young readers (K-3): school meaning first, plain wording, missing everyday
meanings added (get, thing, people), rare meanings and word-form entries left out (said, looking: the bank
then finds say, look), and wrong answers that show an everyday meaning, never a reproduction, body-function
or slang one. Common past forms (saw, felt, left, fell, won ...) give their past meaning first, written in the
past ("Looked at something with your eyes"), with wrong answers that are past forms too; no one wrong answer is
used in more than about 1% of the checked lists. Meanings that defined a job, role or thing by gender (nurse: "A
woman who...", butler, steward, dress) or said "he" for anyone were reworded neutrally in the same pass (words
that are themselves gendered, such as king, queen, mother or actress, keep their meaning).

On November 13, 2026, a third pass covered 350 K–8 science and social-studies words (plus secondary school
meanings on everyday words such as plate and branch). It put school meanings first, added missing meanings,
and checked wrong answers against the word's other meanings. The work was checked and corrected with AI
assistance and was not reviewed by a person. The pass overlaps earlier reviews, so the three counts cannot be
added. Unchecked meanings (`checked: ''`) come from the sources after automatic clean-up and safety filtering.
A teacher can edit every item before a packet is made.

On November 14, 2026, a fourth pass expanded the curated K–8 curriculum unit set to 504 headwords by adding
or promoting 154 math and English language arts headwords (and adding secondary school meanings on everyday
words such as area, mean, negative, positive, origin, range, similar, composite, expression, inequality,
edge, and mood). Like the earlier passes, the work was checked and corrected with AI assistance and was not
reviewed by a person.

On November 23, 2026, the extracts were re-cut from the same downloads (their sha256 is unchanged in `source.json`) to
cover nearly every word a K-12 student meets, toward the goal of a meaning for any such word. Two options keep what students
already see as it was. `--builtin-from` keeps the built-in Word Sounds list of 2026-11-12: since the bulk recording of
2026-11-14 nearly every dictionary word has a clip, and the build never trims a built-in word, so the old rule would have
doubled the core files the vocabulary maker loads first. `--extended-common 40000` keeps the entries of every ranked
dictionary word for the extended files (`packets_vocab_ext/`) only. The result: the same core size (about 1.68 MB),
14,592 words with a meaning instead of 8,835 (8,058 of them extended, loaded by first letter when a word needs them),
and 5,235 phrases instead of 3,932. The checked meanings kept their wrong answers (99% of them unchanged); about a quarter of
the unchecked meanings got a different automatic set, made by the same rules. The new extended meanings are automatic, not
checked, and some read as dictionary text a young student would find hard; a checking pass like the earlier ones would fix that.

The bank's text stays under CC BY-SA 4.0; every packet that shows it carries the credits in
`AlloVocabBank.credits`.
