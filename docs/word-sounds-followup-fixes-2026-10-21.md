# Word Sounds follow-up fixes — October 21, 2026

The eleven findings from the [follow-up review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/docs/word-sounds-review-2026-10-21-followup.md) have been addressed. Work began with pronunciation accuracy, language-compatible audio, and learner identity during preparation.

| Finding | Resulting behavior |
| --- | --- |
| 1. Sound counts lost during grapheme alignment | Valid eSpeak sound sequences survive incomplete spelling alignment. Box and fox retain four-sound counting/segmentation boards and teaching models. Mapping requests review when a sound-to-letter alignment cannot be reconstructed. |
| 2. Spanish sounds selecting the English bank | Non-English phoneme requests retain their IPA identity and use compatible recordings from the current pack. Conflicting language metadata, unscoped caches, English bank aliases, and letter-name TTS cannot supply those sounds. Readiness applies the same rules. |
| 3. Learner changes during pending preparation | The learner field stays locked during preparation and rejects stale change events. Cancellation releases that lock; the displayed learner and emitted assessment identity remain consistent. |
| 4. Hidden AAC support counted as independent | Support is remembered for the entire item, including retries. The saved response and mastery update retain AAC assistance after pictures are hidden. A new item occurrence starts fresh. |
| 5. Missing Letter credits untested sounds | Missing Letter records its printed frame as visual support and retains task-level results without awarding per-phoneme mastery. Its adaptive difficulty uses the same visual evidence classification. |
| 6. Held keys consume retries | Repeated Space/Enter keydowns do not submit another counting response. A deliberate new press after release remains available for the retry. |
| 7. Ordinary item advancement loses focus | Item advancement restores lost answer-control focus into the activity. Deliberate focus on a surviving toolbar control is preserved. |
| 8. Unscored skip abandons later valid items | Skip takes the next remaining occurrence in the current activity before changing activities. Repeated clicks cannot consume multiple entries, and an exhausted unscored probe finishes without invented response evidence. |
| 9. Speech speed resets on reopening | Valid rates from 0.5 to 1.5 restore consistently. Normal and presentation controls update the host, both saved aliases, and the bound resource/history entry. Offline save/reopen retains the selected rate. |
| 10. Minimized setup does not close | The generator's Close action clears its minimized visibility and cancels pending work. Its draft can still be reopened. |
| 11. Digraph scramble model names unavailable tiles | The teacher script explicitly models the individual letters, such as `s, h, i, p`, in the order available to the learner. |

Pronunciation and compilation changes are in [phonics_g2p_loader.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/phonics_g2p_loader.js), [setup source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx), and [teaching scripts](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js). Learner interactions and evidence tracking are in [the runtime](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js); delivery checks are in [the readiness contract](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_readiness_contract.js). The host changes were applied narrowly to the canonical source and both desktop sources, preserving unrelated workspace changes.

Setup, preview, and fallback-data modules were rebuilt. Public mirrors and all four embedded canonical core copies are checked by the [verification script](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-followup-fixes-2026-10-21/verify-fixes.cjs).

**Validation**

Final result: **1,888 tests across 146 files passed, with zero failures or skips**, plus **eight native audio scenarios** and **five Chromium keyboard/control scenarios**. Final regression totals and source bindings are recorded in [verification.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-followup-fixes-2026-10-21/verification.json).

The broad run was followed by an 11-file rerun (245 passing checks) and a 23-file host recheck (296 passing checks). The total counts the latest result for each file once. Initial failures came from six assertions and an obsolete proposal-loading check that still encoded the prior mapping, skipping, close behavior, or source boundaries. Their updates preserve the functional correctness, unavailable-audio, and no-score guards. The original results remain alongside the passing reruns.

The readiness version was advanced so a cached older validator cannot retain the previous language or mapping rules. An isolated execution check confirms the standalone and rebuilt preview contracts agree for English phoneme objects, native IPA recording requirements, and unresolved mapping; both replace the older cached contract. Shared host files changed concurrently during verification, so their Word Sounds integration was rechecked against the latest copies. The final evidence binds all 22 production source files to their verified phases and confirms 12 public mirrors, four embedded core copies, and JavaScript/JSX syntax checks.

The focused regressions exercise actual production components, callbacks, reducers, compilers, and serialization paths. Pronunciation tests begin with captured output from the real pinned eSpeak provider used in the review; the regression run itself does not contact that provider. The browser checks include eight native media scenarios and five keyboard/control scenarios. Keyboard scenarios use controlled media; native media scenarios use real browser playback and bank recordings. These checks do not claim physical screen-reader testing, subjective pronunciation assessment, or live external record storage.

Unavailable native phoneme recordings and unresolved spelling alignments now require review instead of an incorrect substitute. No commit, push, or deployment was performed.
