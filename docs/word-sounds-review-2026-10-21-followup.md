# Word Sounds follow-up review — October 21, 2026

Eleven actionable findings remain: three high priority issues, seven other bugs, and one smaller teaching-script refinement. Each finding has a focused reproduction using current production code. This review changed only its documentation and diagnostic artifacts.

| Order | Priority | Finding | Consequence |
| --- | --- | --- | --- |
| 1 | P1 | Valid sound sequences are discarded when grapheme alignment fails | Counting, segmentation, and printed models can teach the wrong sound count |
| 2 | P1 | Non-English sound requests can select the default English bank | The selected language and voice can be bypassed |
| 3 | P1 | Changing the learner during preparation leaves the pending launch bound to the previous learner | The displayed record notice and launched assessment identify different learners |
| 4 | P2 | Hiding AAC pictures erases evidence that they were shown | A supported answer can increase independent mastery |
| 5 | P2 | Missing Letter credits every sound in the word | Sounds the learner did not supply receive mastery credit |
| 6 | P2 | Holding Space consumes both counting attempts | One held key can become a scored failure |
| 7 | P2 | Ordinary isolation loses focus after advancing | Keyboard users lose their place between items |
| 8 | P2 | Skipping an unscored item abandons its activity | Later valid items in the same activity are omitted |
| 9 | P2 | Saved speech speed is ignored and live changes are not retained | Reopening resets the learner's speed setting |
| 10 | P2 | A minimized setup tile remains after Close | The dismissed setup stays visible |
| 11 | P3 | The scramble teaching model names a chunk rather than the available letter tiles | The teacher's model is less precise for digraphs |

**1. Preserve pronunciation when spelling alignment needs review.**

In the no-Gemini-phoneme fallback, the real pinned eSpeak provider returns four sounds for both *box* and *fox*. The current producer aligns the final /s/ to an empty grapheme because the preceding /k/ already consumed the written `x`. The setup adapter rejects the entire result. The next fallback produces the three spelling tokens `b/o/x` or `f/o/x`; the compiled counting answer becomes **3**, segmentation contains three correct chips, and the printed counting model says “Three sounds.” Cambridge's pronunciation breakdown independently confirms the four sounds in *box*. [Cambridge Dictionary](https://dictionary.cambridge.org/pronunciation/english/box).

This is the demonstrated fallback path, whose output is marked `estimated`; it does not imply every generated occurrence is wrong. The estimate still becomes an answer key and teaching model. Retain the verified sound sequence and count independently of grapheme alignment. Flag the alignment for review, or make the affected task unscored until reviewed, instead of substituting letters for sounds.

Sources: [alignment producer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/phonics_g2p_loader.js:258), [rejecting adapter](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:2520), [fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4909). Evidence: [content and audio probe](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/content-audio-evidence.json).

**2. Select phoneme recordings by language as well as sound key.**

With Spanish selected, the actual audio callback receives the Spanish *gato* vowel objects `{ipa:'a', grapheme:'a'}` and `{ipa:'o', grapheme:'o'}`. Both requests select the default English short-vowel bank entries before reaching the language and voice routing. No Spanish TTS request occurs on that successful bank path. The setup's English inventory identifies these keys with *apple* and *octopus*. Spanish has its own vowel inventory; matching written keys do not establish interchangeable recordings. [Instituto Cervantes pronunciation inventory](https://cvc.cervantes.es/ensenanza/biblioteca_Ele/plan_curricular/niveles/03_pronunciacion_inventario_a1-a2.htm).

Require a language-compatible bank entry or a verified pronunciation path for the requested language. This reproduction verifies the selected clip identities and callback completion with controlled media; it does not claim a subjective listening assessment of physical playback.

Sources: [bank selection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:8827), [later language check](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9153), [English inventory metadata](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:1475). Evidence: [content and audio probe](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/content-audio-evidence.json).

**3. Keep the learner displayed during preparation consistent with the launch.**

Start preparing a counting assessment for Learner A. While speech preparation is pending, the real “Student (for records)” field remains editable. Change it to Learner B. The field and draft show B, and the displayed notice says the progress-monitoring record is for B. When preparation completes, the actual `onStartGame` arguments still contain `probe.student = Learner A` and `session.learnerId = Learner A`.

Lock the learner field for the pending run, cancel/restart preparation when identity changes, or bind the visible confirmation and launch to the same immutable identity. The reproduction captures actual launch arguments; it does not exercise external record storage or claim that another learner's stored record was observed changing.

Sources: [learner input](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:5640), [pending-run ownership](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4699), [launch](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:5420). Evidence: [setup lifecycle](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/setup-lifecycle-evidence.json).

**4. Remember AAC support for the entire item.**

On a sound-isolation item, turn the AAC overlay on, then off, then answer correctly. The mounted learner UI renders six prepared choice pictures while the overlay is on and removes them when switched off. Answering afterward omits `aacAssisted` and increments independent mastery. In the control case, answering with those pictures still visible correctly records AAC assistance and awards no independent credit.

Record whether AAC support was presented during the item, as the existing support tracker already does for text. Preserve that evidence through hiding, retries, and grading, then reset it at the next item boundary.

Sources: [support tracking](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:11325), [grading evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:17021), [saved row](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:17083). Evidence: [support and mastery comparisons](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/mastery-support-evidence.json).

**5. Limit Missing Letter mastery to evidence the task actually collects.**

For the printed frame `c_t`, select A and use the actual Check Answer control. The result credits `k`, `a`, and `t` with independent correct responses, even though the learner only supplied the missing letter. The row also reports `sound_only`, no clues, and no text support despite the printed frame.

Attribute phoneme mastery only when a reviewed mapping identifies the assessed sound. For ambiguous letter/sound mappings, retain task or word-level evidence without crediting every phoneme. Record the visible spelling frame consistently with the reporting contract.

Sources: [word-level exclusions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:17288), [all-phoneme fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:17313), [Missing Letter rendering](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:19584). Evidence: [support and mastery comparisons](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/mastery-support-evidence.json).

**6. Treat a held counting key as one response.**

Focus a wrong counting choice and hold Space. Headless Chromium emits the initial keydown and a repeated keydown before keyup. The first event shows retry feedback; the repeated event records a failure with `attempts: 2` and increments the scored total. There was no released key or deliberate second activation between attempts.

Use native button activation semantics or track press ownership and ignore repeated keydowns. Verify both Space and Enter, including a deliberate second attempt after release.

Source: [counting key handler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:20163). Evidence: [native keyboard cases](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/runtime-native-controls-evidence.json).

**7. Restore focus when an ordinary practice item changes.**

In ordinary isolation practice, answer correctly using Enter and allow cat to advance to dog. The old answer control is removed and Chromium leaves `document.activeElement` on BODY, outside the activity. A fixed-form control case correctly moves focus into the next activity region. The focus effect includes item presentation changes only for fixed forms.

Apply the item-transition focus behavior to ordinary practice as well, while keeping initial modal focus and intentional user focus changes intact. This is a browser DOM-focus reproduction, not a physical screen-reader audit.

Source: [focus effect dependencies](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:8431). Evidence: [native keyboard cases](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/runtime-native-controls-evidence.json).

**8. Skip the unscored item before abandoning its activity.**

Prepare a rejected *food* rhyme followed by a supported *cat* rhyme, with counting next in the activity sequence. Clicking “Skip unscored item and continue” switches directly from rhyming to counting. The later valid cat rhyme is never presented, and no rhyme response has been recorded.

Advance through the current activity's remaining eligible items first. Move to the next activity only when that queue is exhausted; preserve the unscored exclusion from evidence and progress totals.

Source: [unscored continuation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:18588). Evidence: [mounted runtime controls](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/runtime-controls-evidence.json).

**9. Restore and retain the session speech-rate setting.**

A saved session with both `ttsSpeed` and `wordSoundsTtsSpeed` set to 0.5 opens at 1. The actual slider changes the player's local rate to 0.75, but never calls the supplied host rate setter. Unmounting and reopening returns to 1. This was reproduced with the current `WS_BEGIN_SESSION` reducer and complete mounted learner component.

Resolve saved configuration and host rate at session start, then propagate live adjustments through the same persisted setting. Verify normal and presentation controls, reopening, and imported settings. This reproduction checks selected rates and state propagation, not acoustic duration.

Sources: [local initialization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:7462), [normal slider](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:22544), [presentation slider](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:20852). Evidence: [speech-rate state transitions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/speech-rate-evidence.json).

**10. Clear minimized setup state when closing the tile.**

Minimize Word Sounds setup, then close its floating tile. The exact host close callback changes `activeView` to `input` but leaves `wsGeneratorMinimized` true. The host mount condition consequently retains the generator tile and its Close control.

Clear minimized visibility when closing. If keeping the draft is intended, preserve its data separately from whether the generator is mounted. The reproduction mounts the complete production generator with the relevant current host callbacks and mount condition; unrelated shell components are omitted.

Sources: `handleCloseDashboard` and the Word Sounds generator mount condition in [host source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt). Exact current line numbers and source hashes are recorded in [setup lifecycle evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/setup-lifecycle-evidence.json).

**11. Refine the scramble teaching model for digraphs.**

The compiled *ship* scramble contains individual `s`, `h`, `i`, and `p` tiles. The teacher model says the first sound is /ʃ/, “so sh goes first.” Although a teacher can interpret that as a letter sequence, it does not explicitly model the two available tiles.

Say to place `s` then `h`, or explicitly model placing both letters for /sh/. This is a smaller clarity refinement, verified against the compiler and generated teaching script rather than a mounted drag interaction.

Sources: [teaching model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:2296), [letter-tile compiler](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4623). Evidence: [content and audio probe](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/content-audio-evidence.json).

**Verification and limits**

Six focused scripts exercise pronunciation preparation/compiler/teaching models, audio selection, support attribution, runtime controls, native Chromium keyboard behavior, setup lifecycle, and speech-rate state. Their assertions confirm the reported problems; they are not passing regression tests for fixes. The three native keyboard cases completed without browser page errors. Media and unrelated host services are controlled in these probes. Content preparation uses the actual pinned `espeak-ng@1.0.2` JavaScript/WASM provider, with hashes captured in the evidence.

The previous completed regression run passed **1,730 tests across 140 files**. That broad suite was not rerun for this read-only review. All Word Sounds modules remained unchanged, but shared host/UI files changed concurrently outside this review. The affected setup and speech-rate probes were rerun against current hashed sources. Do not treat the earlier broad suite as a new verification of those concurrent changes.

The final read-only check verifies source hashes, four canonical core copies, syntax for ten JavaScript modules and nine JSX sources, eleven public mirrors, and the focused evidence assertions. See [verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/verification.json) and [reproducible verification script](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-21-followup/verify-review.cjs). No production source or existing tests were edited by this review.
