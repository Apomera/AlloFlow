# Prepared help: reliable activation and integrated viewport sizing

A prepared explanation that was already open could retain its previous scroll position when the learner activated the same support or another occurrence. Current-source unit reproductions retained scrollTop 180 in both cases. A real Chromium End/Enter reproduction reopened at scrollTop 444, hiding the beginning of the explanation.

The first candidate reset scroll offsets before paint. Native keyboard scrolling exposed a second edge: its animation could continue after the reset (observed scrollTop 190). The final change gives each explicit activation a fresh card keyed by its existing unique audio owner and focuses it before paint. Playback updates retain that same key and preserve the learner's scroll. No new identifiers, persistent state or provider calls are needed.

The previously isolated short-viewport sizing improvement and test:reader:prepared command are also integrated into current shared source. Prepared cards alone can use the visible viewport height on short/enlarged-text screens; ordinary lookup popups keep their existing geometry. The command now includes native keyboard reactivation checks at 390px and 1280px in addition to interaction, preview, list-layout and card-stress checks.

## Baseline and bounded ownership

Track07, track11 reader integration and track01 compiler ownership were released in the local work log before this integration. The starting shared HEAD was c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8; an unrelated Cephalopod commit subsequently moved HEAD. Exact source and dependency hashes are in integration.json, with the pre-change source/package/test snapshots under before/. The committed pre-change reader snapshot is stored losslessly as before/view_simplified_source.jsx.gz so existing baseline whitespace remains exact; decompress it with gzip. The shared evidence directory also retains its raw copy. The working source supplied the newer lookup recovery, partial-save/cache, compiler and localization behavior; no older complete reader or host was copied over it.

Production changes are limited to popup sizing and its prepared-card opt-in, a keyed prepared card, and activation focus before paint. Existing tests received two activation/scroll cases; the validation command and dedicated fixture received four native keyboard cases per engine. The current builder regenerated the root/public reader pair, and only the executable ViewSimplifiedModule loader pin changed in each of the three hosts. Shared staging belongs to other contributors and was not changed by this task.

Exact source anchors in the integrated reader: view_simplified_source.jsx:1250 (opt-in sizing), :4064 (activation focus), and :5515 (card identity).

## Evidence and acceptance

- before-unit.json and before-browser/: reproduced the retained-scroll problem against current shared source.
- prepared-checks/: retains the failed initial reset candidate, including the in-flight native-scroll counterexample.
- activation-refined/: the fresh-card implementation passed four Chromium cases.
- final-prepared-checks/: 66 passing unit tests and all Chromium checks; the first WebKit fixture navigation timed out before interactions. webkit-retry/ records the unchanged full WebKit retry passing with no input drift.
- final-adjacent-tests.json: generated-reader popup, preview, polish, lookup recovery and image/audio ownership tests.
- release-check.json records the initial candidate integration. final-release-check.json and completion-release-check.json both verify the final reader; the completion receipt rechecks the newer shared HEAD and executable host pins. completion.json summarizes the final outcome.

Required behavior: opening or reactivating prepared help starts at its beginning, including during native scrolling; unchanged playback updates do not move the card's scroll position; exact occurrence/context and prepared explanation remain correct; activation makes no AI or speech call; Escape returns focus to the exact new opener; passage and support/citation objects are unchanged. Existing hidden/stale support, translation, comparison, pending-audio ownership, preview and no-Highlights checks remain in the command.

## Limits and handoff

Browser fixtures compile current reader JSX and actual reader CSS, with callback spies, stub icons and a placeholder picture. Native WebKit credit-link Tab traversal remains unverified because that installed engine skips links in the plain-HTML control too; separate focus/visibility and native button checks are retained. Real screen readers, voice control, speech pronunciation/provider cancellation, real-device zoom, full application/installer builds and deployed bytes are not verified by this work.

The final focused tests passed 66/66. The adjacent run passed 170/171 with one normal 5-second preview-refresh timeout; that single unchanged case passed in isolation in 1.44 seconds. All 237 distinct tests across seven suites therefore passed across the run and retry. Chromium and WebKit each passed 44 interaction groups/cases (16 interactions, four native activation cases, eight preview checks, six list layouts and ten card stress cases). The initial WebKit navigation timeout and unchanged successful retry are retained; no timeout settings were relaxed. The read-only release checker passed with no source/output, mirror, pin or during-check drift. Do not overwrite newer shared reader/helper/host content from an isolated checkpoint. The reader compiler and builder must remain together, and later changes require the read-only release checker plus relevant runtime tests. No install, push, deployment or other-session message is part of this work.

## Completion

Both enhancements are integrated locally. Reader source SHA-256 is c9625901a41c5a48c86faf6255bc1e3b867607f7c8c953d8b656c65a3a8f0121; the root/public module SHA-256 is 8f2dd725870ef19789fbf158bafec389506d3c0075159ce5cd1f7293ce970dcb, with executable reader pin 8f2dd725 in all three hosts. Final verification inspected shared HEAD cbdace49bcacebd6d1693dced3d5d3fd75e9f36e; this is a working-source receipt, not a deployed-release claim.

The incremental implementation is checkpointed in isolated commit d6d055b0c931bb4f2659bf0fd6562040934c4556 with normal hooks passing; the preceding viewport/check-command commit is bbf4bb81f5ab9239d2080a7470a4f36a74d51f5e. The shared index was not staged or committed by this task. Same-file ownership is released, with no remaining runtime writes planned. Any later integration must preserve the newer shared source instead of copying an older isolated reader or host.
