# Word Sounds followup review

October 18, 2026. Nine remaining issues were reproduced after the [seven earlier fixes](word-sounds-refinements-2026-10-17.md) and the [XP and IPA refinements](word-sounds-xp-ipa-refinements-2026-10-17.md). The highest priorities are correct sound comparisons, preserving prepared questions during ordinary practice, and retaining repeated assessment items when returning through setup.

Implementation follow-up: [October 21 refinements and verification](word-sounds-refinements-2026-10-21.md). The findings below record the pre-fix behavior; their historical source locations and diagnostic assertions may no longer apply to the updated code.

## Recommended priorities

| Priority | Issue | Reproduced consequence |
| --- | --- | --- |
| High | Explicit IPA objects have inconsistent sound identity and labels | Bee becomes an incorrect distractor for rainy; unprepared isolation can throw |
| High | Ordinary practice advancement replaces prepared boards | Later questions use different positions or answer choices from the authored pack |
| High | Setup collapses repeated assessment targets | Three authored items become two, and one question is lost |
| Medium | Probe results keep using the running clock | Reading the results changes the displayed and saved rate |
| Medium | Manual Next Activity leaves a stale sequence index | Completing isolation can restart isolation instead of advancing to blending |
| Medium | Updated prepared pictures lose to cached pictures | A repaired picture can remain invisible while the old picture is shown |
| Medium | Printable count approval handles string audio differently | A valid approval is rejected, or an outdated approval survives attaching audio |
| Medium | Probes opened in an already-hidden tab lose interruption time | Five hidden seconds are saved as zero with no interruption flag |
| Medium | A measured zero is treated as absent Word Sounds data | Zero percent can receive lower review priority than ten percent |

## Explicit IPA objects need consistent sound identity and labels

The G2P builder emits pronunciation objects and strips IPA length marks. A rainy ending represented as `{ipa: 'i', grapheme: 'y'}` therefore means the long vowel that the dictionary calls `ee`. The printable analyzer now recognizes that distinction, but the shared edge-sound code still interprets the object's `i` as the app's short-vowel token.

Executing the actual normalization, object builder, sound-board builder, and validator produced rainy's target `i`, happy as a match, and bee as an incorrect distractor. The shared validator accepts the board; the updated printable analyzer rejects it. The player's phoneme checking paths can retain these objects, so the discrepancy extends beyond a synthetic input shape.

Unprepared isolation also assumes string phonemes: executing its English initializer with the retained objects throws `correctSound?.toLowerCase is not a function`. A path that retains an object in the options can then fail in the AAC effect's `p.replace` call. Normal compiled prepared boards contain strings and avoid these failures.

Carry notation provenance into a shared canonical sound resolver and use explicit display-label adapters at string-only UI boundaries. Explicit IPA `i`, `u`, and `j` must remain distinct from the app's bare tokens; retain grapheme spelling and printed notation separately. Cover mixed dictionary and G2P words in learner boards, teacher scripts, unprepared isolation, and AAC.

Sources: [edge normalization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:441), [sound comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:577), [G2P object construction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/phonics_g2p_loader.js:268), [player phoneme checking](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:13099), [isolation initializer](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:14009), [AAC option effect](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:7127). Evidence: [content and audio reproduction](../reports/word-sounds-review-2026-10-18/content-audio-evidence.json).

## Ordinary practice must preserve each prepared board

The fixed-form advance path now uses the common activity initializer. Ordinary practice still has a separate legacy advance path for orthography, blending, and isolation. It can overwrite authored choices and positions, and later initialization guards leave those replacements in place.

A mounted learner component started with the correct prepared board, graded its first item, and advanced. The next isolation question changed its authored position from 2 to 1. A three-choice blending board became six legacy choices. Orthography used legacy distractors instead of its prepared options. These were the resulting states after component effects ran.

Use the same prepared-item initialization path for first items, ordinary advancement, refill, and fixed forms. Preserve the ordinary session clock, practice repetition rules, and score while doing so. Regressions should answer the first item and inspect the second item's actual prompt, choices, and grading in all three activities.

Sources: [orthography advancement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16442), [blending advancement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16482), [isolation advancement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16526). Evidence: [mounted results](../reports/word-sounds-review-2026-10-18/runtime-mounted-evidence.json).

## Returning through setup must retain repeated assessment items

Setup's preview deduplicates targets by word, and its existing-word map keeps the last matching item. The player's corrected item identity cannot recover occurrences that setup has already removed.

Executing the current preview, selection, copying, and assessment configuration statements with `cat-first, cat-final, dog` produced preview words `cat, dog`, retained IDs `cat-final, dog`, and a fixed-form goal of two instead of three. This occurs before later provider preparation or saving.

Select and copy fixed-form items by occurrence identity. Keep word-level selection for ordinary practice where appropriate. Verify Back to Setup followed by Start Assessment preserves all IDs, their order, their different boards, and the form length.

Sources: [preview deduplication](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4023), [word-based lookup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4576), [form length](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:5215). Evidence: [setup and delivery reproduction](../reports/word-sounds-review-2026-10-18/setup-delivery-evidence.json).

## Freeze probe results when responding ends

The sequential result renderer computes elapsed time from `Date.now()` on every render. The probe interval continues running, and sequential queue exhaustion can open results before a completion payload has been emitted. Done then builds that payload using the later time.

Executing the actual renderer and payload builder with two correct answers over sixty seconds displayed 2 correct items per minute. After two minutes spent reading results, it displayed 0.7 and Done saved a duration of 180 seconds and a rate of 0.7. No additional responses occurred.

Capture a completed probe result once when responding ends. Render, export CSV, and emit completion from that same snapshot; stop timing and interruption tracking for the completed run. Verify that waiting on results, rerendering, downloading, and pressing Done cannot change any measured value.

Sources: [payload timing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9740), [result timing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9780), [Done callback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9849), [elapsed interval](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:10063), [sequential exhaustion](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:10513). Evidence: [results and reporting reproduction](../reports/word-sounds-review-2026-10-18/results-reporting-evidence.json).

## Keep the lesson sequence index synchronized

The summary's Next Activity callback resets the runtime, sets the next sequence index in React state, and starts the selected activity. The reference read by the later automatic completion effect remains at zero.

Executing both current callbacks changed counting to isolation with state index 1 and reference index 0. Completing isolation then selected isolation again; blending was the expected next activity. Update state and reference through one sequence transition operation, and cover manual transitions followed by automatic ones.

Sources: [automatic summary transition](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:7459), [manual summary transition](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:20496). Evidence: [runtime reproduction](../reports/word-sounds-review-2026-10-18/runtime-evidence.json).

## Invalidate pictures when prepared media changes

The option-image cache is keyed only by word. Cached entries are skipped before the new prepared image manifest is inspected, and decoding and sentence-match renderers prefer the cached image over the prepared image.

Executing the actual manifest aggregation, cache callback, and Read and Match image selection cached an OLD picture for dog. Rebuilding the callback against a NEW prepared picture still selected OLD. The reproduction verifies image selection using distinct payload markers; it does not test image decoding.

Scope caches to the current pack and asset version, or reconcile changed prepared assets before consulting generated cache entries. Guard pending generation against superseded assets. Test teacher image refinement and same-word pack replacement in an existing player instance.

Sources: [cache filter](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:7068), [decoding image precedence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:19752), [sentence-match image precedence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:19993). Evidence: [setup and delivery reproduction](../reports/word-sounds-review-2026-10-18/setup-delivery-evidence.json).

## Printable count approval must fingerprint every supported audio shape

The player supports both audio descriptors and data-URI strings. The printable analyzer passes the winning asset into the count-context helper without supplying `audioSource` for a string, so the helper cannot fingerprint that clip. Readiness already handles this case explicitly.

An approval for an unchanged string clip was rejected by the printable analyzer while the equivalent descriptor was accepted. Conversely, adding that string clip to a teacher-spoken approval left count 1 in the printable analysis while the canonical resolver correctly returned `count_audio_changed`.

Resolve the winning audio source through the same adapter used by readiness and playback. Verify unchanged, replaced, and newly attached clips in both string and descriptor forms.

Sources: [printable count context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:1540), [audio fingerprint input](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:708), [readiness handling](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_readiness_contract.js:1529). Evidence: [content and audio reproduction](../reports/word-sounds-review-2026-10-18/content-audio-evidence.json).

## Track interruptions when a probe starts hidden

Visibility tracking subscribes to changes but does not initialize an already-hidden document. Starting a probe also clears the hidden-start reference. Opening or pushing a probe into a background tab can therefore omit its initial hidden interval.

Executing the current visibility handler, active-clock initialization, and payload builder let the clock run five seconds while the document was hidden. The result contained `hiddenMs: 0` and `interrupted: false`. Initialize hidden tracking from the current document state when each probe clock starts, and keep pre-start and post-completion time outside that interval.

Sources: [visibility tracking](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:9661), [clock initialization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:14418). Evidence: [runtime reproduction](../reports/word-sounds-review-2026-10-18/runtime-evidence.json).

## Distinguish zero percent from no data

The analytics module stores missing accuracy as zero, checks `wsAccuracy > 0` before applying Word Sounds review thresholds, and uses truthiness in CSV export. The detail tile also hides zero. These checks suppress a genuine measured zero along with missing data.

Executing the actual statistics and review-group functions with ten Word Sounds items and otherwise strong participation produced review group 1 for zero correct answers. Changing only the Word Sounds result to one correct answer produced group 3 with a low-accuracy reason. These are the app's configurable practice-data review groups.

Carry an explicit graded-evidence count or nullable accuracy through statistics, display, export, and grouping. Render `0%` for observed zero and reserve missing-data treatment for absent evidence. Verify zero, low, and unavailable results separately, including practice-only history.

Sources: [statistics](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/student_analytics_module.js:2102), [review-group gate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/student_analytics_module.js:2285), [CSV export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/student_analytics_module.js:5575), [detail display](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/student_analytics_module.js:9749). Evidence: [results and reporting reproduction](../reports/word-sounds-review-2026-10-18/results-reporting-evidence.json).

## Verification

The previous complete Word Sounds run passed **1,429 tests across 109 files**, with no failed or skipped tests. Application source hashes still match that passing baseline. The new reproductions cover behavior those assertions did not exercise; passing diagnostic assertions here confirm that the defects exist.

Ordinary advancement was also reproduced in the mounted component with mocked media and diagnostic state capture. Other findings execute unchanged production functions or statements with controlled dependencies. Physical audio output and complete routed application flows are outside these reproductions.

Source hashes, syntax checks, public mirror checks, and the regression baseline are recorded in [verification.json](../reports/word-sounds-review-2026-10-18/verification.json). Application and test sources were preserved.

The evidence directory contains runnable source probes and a mounted reproduction:

```powershell
node reports/word-sounds-review-2026-10-18/content-audio-probe.cjs
node reports/word-sounds-review-2026-10-18/runtime-probe.cjs
node reports/word-sounds-review-2026-10-18/runtime-mounted-probe.mjs
node reports/word-sounds-review-2026-10-18/setup-delivery-probe.cjs
node reports/word-sounds-review-2026-10-18/results-reporting-probe.cjs
node reports/word-sounds-review-2026-10-18/verify-review.cjs
```
