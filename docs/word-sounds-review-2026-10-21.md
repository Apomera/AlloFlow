# Word Sounds review — 2026-10-21

Eight remaining issues were reproduced. This pass reviewed lesson delivery, pronunciation preparation, learner playback, activity transitions, media maintenance, and saved assessment identity. Application and test files were not edited.

I would start with findings 1–3, then address the incorrect rhyme answer in finding 4. P1 findings can apply the wrong session rules, teach the wrong sound, or lose the required stimulus. P2 findings affect narrower transition, recovery, maintenance, or persistence paths.

| # | Priority | Finding | Primary location |
|---|---|---|---|
| 1 | P1 | Live replacement mixes new words with the previous lesson's configuration and session identity. | [Host hydration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:22897) |
| 2 | P1 | Preparation discards pronunciation and turns final /i/ into consonant y. | [eSpeak pack adapter](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:2417) |
| 3 | P1 | Object phonemes cannot play in blending, and readiness omits their sound dependencies. | [Blending playback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9337) |
| 4 | P1 | A spelling-based fallback creates an incorrect rhyme answer and teacher model. | [Rhyme derivation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:2201) |
| 5 | P2 | Automatic activity changes retain the previous activity's score. | [Automatic transition](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:8454) |
| 6 | P2 | Regenerate All can stall on an unresolved glossary-backed request. | [Glossary return branch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:11996) |
| 7 | P2 | Regenerated audio can report success while a saved alias still selects the old clip. | [Asset replacement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:1296) |
| 8 | P2 | Device history serialization drops config-only authored item IDs. | [History serializer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:24208) |

## 1. Live lesson replacement retains the previous contract

The real live-sync callers set the next resource and invoke hydration from the same render. Its delayed launch retains the old `setIsWordSoundsMode` closure, which reads the old resource configuration. When a player is already open, this path never begins a new session. The modal prefers the existing session configuration over the new resource. Empty sequences do not clear the previous sequence, and ordinary practice does not clear the previous probe flag.

The reproduction switches a Spanish, one-item isolation assessment to an English, four-word counting practice pack. The new words and counting activity arrive, but a closed player begins with the old resource ID, Spanish, fixed-form mode, and goal 1. An already-open player issues no new session-begin action. Both retain the old sequence and probe flag. This can misattribute results and apply the wrong session rules.

Refinement: pass the incoming resource and configuration explicitly through one replacement/session boundary, including clearing false and empty settings. Verify both closed and already-open players. Additional anchors: [configuration capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:16754), [modal configuration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:43384).

Evidence: [setup-delivery-evidence.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/setup-delivery-evidence.json), `live-hydration-retains-previous-resource-contract`. Current production callbacks executed with controlled setters and a drained timer; the routed live application was not mounted. A second reviewer independently checked the closure and call-site behavior.

## 2. The preparation adapter loses valid pronunciation

The current eSpeak loader produces rainy as objects pairing r/r, /eɪ/ with ai, n/n, and /i/ with y. The setup fallback flattens these to spelling strings: r, ai, n, y. Once IPA is discarded, the shared sound identity interprets bare y as the consonant. The compiled final-sound isolation board consequently asks for consonant y. The last-sound sort board treats bee and happy as distractors.

This is a remaining producer boundary outside the object-aware consumers fixed in the previous pass. Cambridge lists rainy as /ˈreɪ.ni/, including final /i/ as in happy. [Cambridge pronunciation](https://dictionary.cambridge.org/us/pronunciation/english/rainy).

Refinement: preserve pronunciation-bearing objects or convert them to canonical sound identities before returning from the adapter. Verify generated boards and audio requirements together for spelling/sound mismatches.

Evidence: [content-audio-evidence.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/content-audio-evidence.json), `espeak_fallback_sound_provenance`. Actual pinned eSpeak output was captured through the current loader. The provider capture and dependency hashes are in [content-audio-g2p.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/content-audio-g2p.json).

## 3. Blending cannot play pronunciation-bearing objects

`playBlending` passes each raw phoneme object to `handleAudio`. That callback recognizes object `word`/`audioSrc` fields, but a phoneme object has `ipa`/`grapheme` fields. It becomes the TTS text `[object object]`. With the four rainy objects, the actual callbacks request that text four times and play no phoneme-bank clips. The independent readiness collector skips object phonemes, omitting all four required sound clips.

Refinement: resolve phoneme audio through the shared sound identity at both playback and readiness boundaries. Verify that object and canonical-string versions require and select the same r, ay, n, ee clips. Additional anchors: [handleAudio](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:8695), [readiness collection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_readiness_contract.js:1520).

Evidence: `content-audio-evidence.json`, `object_blending_audio`. Actual callbacks executed with controlled media/TTS; this was not physical audio playback.

## 4. A generated rhyme answer can be wrong

For the batch food, good, cat, sun, `derivePackRhyme` chooses good from the shared spelling ending -ood. Compilation retains good as the correct answer. The teacher script produces “Food and good rhyme.” This differs from the earlier distractor filtering fixes: here the authoritative correct answer itself is invalid.

Food has /uː/ and good has /ʊ/ in the referenced English pronunciations, so this pair should not be asserted as a correct rhyme. [Cambridge food](https://dictionary.cambridge.org/pronunciation/english/food), [Cambridge good](https://dictionary.cambridge.org/us/dictionary/english/good).

Refinement: validate automatically derived correct rhymes using pronunciation or reviewed data, and leave unsupported rows unavailable for review. Verify the compiled learner answer and DI teacher script from the same generated pack. Evidence: `content-audio-evidence.json`, `derived_false_rhyme_answer`.

## 5. Automatic activity changes carry over the completed score

With a two-answer goal and counting → isolation → blending, counting takes two answers. Automatic isolation starts with the score still at 2; its first answer raises the total to 3 and immediately completes it. The sequence index advances correctly, so this differs from the index issue fixed earlier. Manual Next Activity resets the score, producing different behavior for the same sequence.

The automatic branch also bypasses eligibility checks. A separate mounted diagnostic enters isolation with a counting-only prepared allowlist. Finding 1 can leave a stale broader sequence after live replacement, making this boundary relevant to ordinary delivery. This is supporting evidence, not an additional finding.

Refinement: route automatic and manual transitions through the same initialization and validation. Verify that every activity receives its configured goal.

Evidence: [runtime-sequence-evidence.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/runtime-sequence-evidence.json), [runtime-unprepared-sequence-evidence.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/runtime-unprepared-sequence-evidence.json). Both mount the actual learner component with stateful hosts and real answer clicks; media is mocked.

## 6. Glossary-backed regeneration can hang

`fetchWordData` registers a pending promise before consulting a pre-generated glossary entry. That return branch applies the entry without resolving or removing the pending request. A subsequent fetch for the same word returns the unresolved promise.

Running the actual Regenerate All callback with two authored cat occurrences stops on index 1: cat remains pending, completion never runs, and the host receives no update. A later regeneration can also encounter the orphaned request.

Refinement: settle and clean up every successful fetch path, including glossary reuse. Verify repeated occurrences and a second regeneration run.

Evidence: [runtime-recovery-evidence.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/runtime-recovery-evidence.json). The production fetch branch and full regeneration callback execute with controlled refs/setters.

## 7. A raw asset alias can defeat regeneration

A saved/imported bucket can contain `apple` and a later raw alias ` APPLE `. Replacing canonical apple commits the new voice and reports “Updated 1 clips”, but retains the raw alias. Playback and inventory normalize that later alias to apple and select the old recording. The reproduced voice mismatch remains true after the successful update.

Refinement: canonicalize keys before merging and replacing assets, or remove every equivalent alias when replacing a key. Verify the actual playback and inventory source after maintenance.

Evidence: `setup-delivery-evidence.json`, `audio-replacement-raw-key-alias`. This executes the production maintenance callback and shared asset helpers; no network voice provider was used.

## 8. Device autosave loses authored occurrence IDs

The history serializer whitelists session configuration fields but omits `itemIds`. A supported assessment with IDs only in `sessionConfig.itemIds` loses those IDs after serialization/reopening. The reproduced cat-first, cat-final, dog-final IDs become isolation:1, isolation:2, isolation:3. Repeated words remain in order, but result identity changes.

Refinement: preserve authored IDs across device serialization and hydration. Verify a complete save/reopen/setup/player round trip with repeated words and config-only IDs.

Evidence: `setup-delivery-evidence.json`, `offline-history-drops-config-item-ids`. The complete serializer, setup occurrence selection, and runtime queue mapping execute; IndexedDB and the routed host were not mounted.

## Verification and limits

Five focused diagnostic programs reran successfully: `content-audio-probe.cjs`, `setup-delivery-probe.cjs`, `runtime-recovery-probe.cjs`, `runtime-sequence-probe.mjs`, and `runtime-unprepared-sequence-probe.mjs`. Their assertions reproduce these defects; passing diagnostics do not mean the defects are fixed. Scripts and evidence are in [the review directory](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21).

Thirteen source files parse successfully. All four embedded core copies and all seven checked public module mirrors match canonical sources. Word Sounds module hashes match the earlier passing baseline. The host source and its two generated copies differ from that baseline, so the previous full-suite result is not new validation of the current host. The full suite was not rerun for this review; its last recorded result was 1,670 tests across 135 files passing.

Current hashes, comparison results, and coverage are saved in [verification.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21/verification.json). No application fixes were made in this review.

Implementation follow-up: the eight findings are addressed in [Word Sounds delivery refinements](word-sounds-delivery-refinements-2026-10-21.md), with separate regression evidence and final source hashes.
