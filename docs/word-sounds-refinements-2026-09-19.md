# Word Sounds refinements — 2026-09-19

This pass improves the shared matching board used by Sound Sort and Word Families.

## Behavior changes

- Distinct matching tiles selected before React rerenders are all retained. Tapping the final match repeatedly schedules only one completion.
- Delayed completion and error feedback belong to the board that created them. Replacing or removing that board cancels its pending timers, even while the enclosing player remains open.
- A newer incorrect-selection message gets its full display interval; an older timer cannot erase it early.
- Automatic option playback and “Hear All Words” use one cancellable sequence. Starting another replay, hearing an individual word, selecting a tile, changing board content, or leaving the board stops the old sequence from continuing through remaining words.
- Manual listening cancels the pending automatic start, preventing a second replay from unexpectedly starting after the instruction fallback timeout.
- Board editing does not trigger automatic option playback.
- Sound-only buttons have distinct numbered accessible names without exposing the printed words. Option numbers stay stable as matches are removed.

## Verification

Seven behavior tests failed against the original component and passed after the fix. They reproduce lost rapid selections, duplicate completion, stale completion after removal/content replacement, and competing or stale playback sequences. The tests mount the actual shared component with controlled timers and audio callbacks.

Additional checks cover accessible names, target changes with unchanged choices, error-message timing, global audio cancellation, and editing. Full-player tests compile a prepared pack, complete both matching activities through the rendered controls, and check that exactly one supported-practice response is saved.

All **617 tests across 56 files passed** across the full run and targeted reruns, including 14 new behavior checks. Two new test assumptions were corrected (a substring check matched “that,” and Word Families chooses its displayed subset at runtime). Existing tests were repaired to follow the extracted host-handler module and the current self-open sequence; 21 snapshot color values were aligned with changes already present in the baseline. No production host or color behavior was changed in this pass.

Test output and the original failure reproduction are stored in `reports/word-sounds-refinements-2026-09-19/`. JavaScript syntax, embedded shared-core consistency, and the public runtime mirror are checked separately.

## Scope

This change manages the lifetime of queued playback and callbacks. It does not introduce new pronunciation content or change fixed-form generation. Browser-level audio decoding and real-device audio output are outside the controlled-audio component tests.

Changes are local; no deployment was performed.
