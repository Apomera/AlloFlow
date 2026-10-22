# Word Sounds delivery refinements

October 21, 2026. This change addresses all eight findings in the [latest review](word-sounds-review-2026-10-21.md), beginning with lesson replacement, pronunciation preparation, and blending playback.

## Changes

1. **Incoming lessons own their session.** Live delivery hydrates words, settings, activity sequence, and probe state from the incoming resource and starts a fresh run when the lesson contract changes. Closed and already-open players use the same boundary. Saved reopen also uses that boundary and starts fresh. Spelling probes resolve to the runtime spelling activity. A same-resource media refresh preserves answers and timing, including the actual flags attached by image generation/refinement and audio repair; instructional board changes still start a new run.

2. **Preparation preserves pronunciation.** The eSpeak adapter retains IPA/grapheme objects through compilation. A spelling such as final y in rainy keeps its vowel identity instead of becoming consonant y. Grapheme alignment remains available for spelling activities.

3. **Blending and readiness share sound identity.** Phoneme objects resolve to canonical sound clips before playback and dependency collection. Object and string representations request the same clips. Native Chromium coverage plays prepared tree objects as t, r, ee in order.

4. **Generated rhyme answers require evidence.** A shared pronunciation check rejects mismatches such as food/good. Reviewed common pairs remain available offline; valid pronunciation evidence travels inside the prepared board through serialization. The learner, readiness checks, compiler, and teacher script use this check. Pairs without sufficient pronunciation or stress evidence require review. Existing teacher answer/choice controls now save a target-bound reviewed board, clear stale evidence, and update only the active authored occurrence. Incomplete edits remain editable and cannot become scored questions. Unsupported items show localized, unscored guidance rather than accepting an incorrect answer.

5. **Activity transitions initialize consistently.** Manual and automatic Next Activity use the same score and run reset. Every activity receives its configured goal; unavailable activities are skipped. Manual wrapping remains supported. Delayed transitions cannot restart a replaced run or silently advance a completed probe after the host clears its probe flag.

6. **Regeneration settles successful requests.** Glossary reuse resolves the pending request and removes it from the request map. Repeated authored words and repeated regeneration runs finish instead of hanging.

7. **Audio replacement removes key aliases.** Asset keys are canonicalized before replacements are committed. A later saved alias cannot override a regenerated clip during playback or inventory checks.

8. **Autosave retains authored item IDs.** Device history preserves supported configuration-only occurrence IDs, including repeated words, through save/reopen/setup/player handoff. Strings and finite numeric IDs retain their values; unsupported nested entries cannot become bogus IDs.

## Verification

All **1,730 tests across 140 Word Sounds, related analytics, and restoration files pass**, with no failed or skipped tests. All eight native Chromium audio scenarios and the browser autoplay-recovery test pass. Focused coverage includes mounted host replacement, media refresh, saved reopening, exact item identity, object sound playback, independent readiness, per-activity goals, completed-probe ownership, repeated regeneration, rhyme evidence, actual teacher edits, teacher scripts, and alias replacement.

The initial broad run exposed six outdated generation-harness dependencies and three missing localization registrations; these were corrected before the passing complete run. The generated preview module was refreshed from the unchanged canonical preview/readiness sources during verification. After rebuilding it explicitly, all 182 relevant tests across eight files passed again. An additional executable check confirmed that the built preview and standalone readiness return identical requirements, including t/r/ee for pronunciation objects. Final hashes match the verified full and targeted test phases; both source snapshots and raw runs are retained.

Four embedded core copies are synchronized. Ten JavaScript modules, nine JSX host/source files, the localization JSON master, and eleven public mirrors pass syntax/parity checks. The generated setup module, review components, misc handlers, localization fallback module, and desktop host sources were rebuilt locally. OneDrive rejected a direct setup-output overwrite; an atomic-write adapter reran the existing repository builder successfully without changing the builder's generated content.

An additional repository-wide fallback-wording check reports 206 existing differences outside Word Sounds (including STEM and educator text). Those unrelated changes were preserved. The Word Sounds localization gates pass.

Results, runner logs, and frozen source hashes are in [verification.json](../reports/word-sounds-delivery-fixes-2026-10-21/verification.json) and [the verification directory](../reports/word-sounds-delivery-fixes-2026-10-21/). Native audio checks use real local recordings and browser media events; they do not judge pronunciation quality or physical speaker output. Host delivery tests use production callbacks and mounted React state; an external live-session service was not used. These changes remain local to the workspace.
