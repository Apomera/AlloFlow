# Track 11: image ownership, dictionary meanings, pronunciation, and retry focus

**Subsequent status:** These four enhancements are now present in the inspected shared
source. Do not reapply these cumulative patches. The next incremental handoff is
[../resilience/README.md](../resilience/README.md), with a recorded 270-test pass.
The remainder of this document records the earlier preparation and verification.

All four authorized enhancements are implemented as isolated patches and tested candidates.
Shared application source, host, public mirrors, and generated application modules were not
edited by this follow-up. Integration remains with the active owners.

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Initial inspected HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
Final inspected HEAD: `6b63e76e862125e87422f02a54ed60beac68e8fb`.
HEAD advanced during this work; all four shared source files still matched their tested
source hashes at final verification. This local baseline does not identify the deployed release.
See `baseline.json` and `verification.json` for exact source and candidate hashes.

## Review and integration status

The four patches in this directory are **cumulative against the recorded shared source**.
They include the earlier unintegrated dictionary deadline, independent retry, cancellation,
cache recovery, and multi-block selection work. Use these patches in place of the earlier
follow-up patches, not in addition to them. The first recovery adapter was already present
in the shared reader and is preserved.

- `host.patch` targets `host_handlers_source.jsx`.
- `dictionary.patch` targets `dictionary_loader.js`.
- `engine.patch` targets `content_engine_source.jsx`.
- `reader.patch` targets `view_simplified_source.jsx`.

All four passed read-only `git apply --check --ignore-space-change -p0` checks against the
final inspected checkout. Candidate sources parse successfully, transformations are
idempotent, and the candidate hashes match their recorded baselines.

## Behavior changes

**Pictures belong to the lookup that requested them.** The image handler captures popup
request identity, artifact identity/text, active view, language, passage, and current meaning.
Functional state updates check the captured owner before committing. Late success or failure
cannot attach to another word, a reopened same-word popup, a changed reading, or a dismissed
popup. If the explanation changes while the image is pending, the stale result is discarded
and its loading state is cleared without replacing the revised explanation.

The image cache now uses word, language, saved grade, passage occurrence, and meaning;
ambiguous legacy word-only cache entries are not reused. Image prompts contain the captured
passage and meaning. Cached help remains usable with AI disabled; uncached requests do not
invoke the image provider while AI is disabled. React-batched loading/result updates are tested.
This patch guards results; it does not add transport cancellation to image generation.

**Dictionary suggestions use the selected occurrence.** The reader extracts the sentence
around the saved selection offset and asks a new conservative dictionary matcher for a sense.
The matcher excludes the queried word itself and declines ties or zero-overlap matches.
A single available sense remains usable. Suggestions are labeled `Possible meaning in this
passage`; alternative definitions remain available under `Other dictionary meanings`.
When the passage does not distinguish multiple senses, all are offered explicitly and the
top-level dictionary fallback does not automatically read the first one. Each meaning has
its own listening control. Dictionary order, attribution, examples, and general synonyms
remain available; general synonyms are labeled as covering all meanings.

This is lexical matching, not semantic certainty. It can decline useful matches that use
different vocabulary. No live-provider accuracy or student comprehension claim is made.

**Pronunciation variants retain their own recordings.** Normalization stores individual
phonetic-text/audio pairs and distinct variants. It never fills a recording's missing
phonetic text from another record. Compatibility fields come from one complete record when
available. Both popups render the retained variants, and phonics state retains the complete
normalized entry. Older cached entries that lack pairing data show their text and recording
separately. No accent or dialect is inferred from a recording URL.

**Retry keeps keyboard focus.** Once offered, AI and dictionary retry controls remain mounted
while loading and after completion. They use guarded `aria-disabled` and `aria-busy` states,
so they retain focus and ignore additional activation while work is pending or complete.
Ready statuses are announced through a polite status region. Dictionary retry remains usable
with AI off. Escape and existing modal focus containment still work.

Recent reader integration moved language tags onto wider containers and introduced unique
dialog IDs. The composed selection patch now excludes headings and layout text that are
outside actual passage blocks. Tests follow the reader's instance-specific dialog IDs.
Existing popup viewport bounds already accommodate expanded dictionary content; no layout
or global focus-manager replacement was added.

## Verification actually run

Final result: **12 files passed, 224 tests passed, 0 failed**, exit 0, 14.63 seconds.
The machine-readable result is `tests.json`.

New and extended checks cover stale image success/failure, same-word reopening, navigation,
changed text/meaning, context-sensitive image caching, AI-disabled image behavior, batched
setters, ambiguous/repeated dictionary words, alternatives and explicit meaning speech,
paired pronunciation recordings, focus retention during retry, duplicate activation guards,
completion announcements, and Escape. Earlier lookup recovery, saved-grade/language,
cross-block selection, speech, lifecycle, keyboard, and prepared-help cases also ran.

The focused engine, image handler, dictionary, and popup suites exercise candidates.
Neighboring lifecycle and host suites retain their normal module loading. The reader
regression suites that support candidate paths used the frozen reader candidate. This is
not a full-checkout test pass, deployed-release check, browser smoke test, or assistive-technology
session. Image-provider responses were mocked; no images were generated through a live service.

```powershell
node dev-tools/prepare_reading_lookup_enhancements.cjs
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/enhancements/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/enhancements/view_simplified_module.candidate.js'
$env:ADAPTED_HELP_VIEW='reports/lookup-recovery/enhancements/view_simplified_module.candidate.js'
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/enhancements/host.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/enhancements/tests.json
```

## Changed preparation and test files

- `dev-tools/prepare_reading_lookup_enhancements.cjs` — new cumulative patch/candidate generator.
- `dev-tools/prepare_reading_lookup_followup.cjs` — skip non-passage text under wider language containers.
- `tests/reading_lookup_candidate.js` — load the composed staged engine by default.
- `tests/reading_word_image_ownership.test.js` — new image handler acceptance suite.
- `tests/dictionary_lookup_cancellation.test.js` — paired pronunciations and conservative sense matching.
- `tests/reading_lookup_popup_adapter.test.js` — composed reader, meanings, recordings, and retry focus.
- Reports, source patches, and frozen test candidates in this directory; pointers in the older handoffs.

## Integrator handoff

Integrator 01 should recheck active ownership and apply the four narrow patches after those
owners release their files. Do not copy the frozen candidate files into deploy outputs.
Build the affected host, engine, and reader using the existing repository build path;
synchronize the engine source mirror, dictionary public mirror, generated modules, and host
loader metadata through the integration workflow. Preserve `reader_place_store.js` in the
reader build. Run the focused cases again against the assembled source and generated files.

Track 06: preserve lookup snapshot fields and the existing saved-artifact resolver.
This change does not alter the revision algorithm or its selection text.

Track 17: preserve pane-language recovery and the fifth speech argument. Localize these
new fallback keys under `simplified`: `lookup_dictionary_retry`, `lookup_listen_pronunciation`,
`lookup_listen_meaning`, `lookup_possible_meaning`, `lookup_other_meanings`, `lookup_choose_meaning`,
`lookup_all_synonyms`, `lookup_retrying`, `lookup_ready`, and `lookup_dictionary_ready`.
English dictionary limits and the existing starting-pane selection policy remain unchanged.

Track 18: retain mounted retry controls and their guarded `aria-disabled` semantics when
merging focus work. Test keyboard focus and announcements with actual assistive technology
as part of assembled-reader acceptance; the checks here use DOM-based fixtures.

No deployment, publishing, push, Git mutation, server, saved app-state operation, or
cross-chat message was performed. No further shared-file writes are planned by this track.
