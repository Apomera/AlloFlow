# WCAG 2.2 AA Audit Handoff for Fable

Updated: 2026-07-19 evening (America/New_York) — continued by Fable

## Objective and working rules

Continue the comprehensive WCAG 2.2 AA audit and remediation across the app. The VPAT is useful background but may be outdated; verify the current implementation and newly added areas directly.

The repository is a shared worktree with other agents actively changing and committing unrelated files. Preserve all parallel work. Never reset, revert, stash, clean, or broadly stage the worktree. Inspect current state immediately before every write and commit only the exact files for one completed accessibility section. The user requires a separate commit after each completed section.

Workspace:

`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`

Current branch: `main`

The product files have a Windows deny-read ACL in the normal sandbox. The reliable pattern has been:

1. Attempt the direct product-file patch once; it normally fails with `apply deny-read ACLs`.
2. Create a guarded updater under `C:\tmp` with `apply_patch`.
3. Have the updater verify both deploy mirrors are identical, component markers/sentinels are unique, and expected legacy text is present before writing.
4. Run the updater with elevated permissions.
5. Syntax-check both mirrors and verify identical SHA-256 hashes.
6. Add focused source-contract and rendered jsdom interaction tests.
7. Run focused tests, the Learning Lab golden test, and the bounded full Learning Lab suite.
8. Run `git diff --check`, stage only a newly created test if needed, and use `git commit --only` with exact paths.

Do not use `--no-verify`. Do not deploy while other agents are actively working unless the user pauses them and explicitly returns to deployment.

## Completed and committed sections in this audit continuation

These sections were independently committed:

| Section | Commit |
|---|---|
| Reading Tracker | `988a084c0` |
| Self-Compassion | `967605869` |
| Progress Dashboard | `1f97c9612` |
| Optional Challenge or Practice Tracker | `e8e3326bc` |
| Optional Time Estimate Comparison | `efc9c1313` |
| Optional Attention Shift or Interruption Log | `0f7fe7951` |
| Search Selected Personal Toolkit Content | `69c575228` |
| Personal Reference Sheet Builder | `cffee2e98` |
| Optional Support Request Notes | `d3dd20d32` |
| Mindfulness Practice | `6598a8ad6` |

The most recently completed section, Personal Reference Sheet Builder, passed:

- Focused source/render tests: 19/19
- Learning Lab golden test: passed
- Bounded full Learning Lab suite: 2,120/2,120 tests across 133 files

Its exact committed files were:

- `stem_lab/stem_tool_learning_lab.js`
- `prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js`
- `tests/learning_lab_cheat_sheets_a11y.test.js`
- `tests/learning_lab_cheat_sheets_render_a11y.test.js`

## Session notes (2026-07-19 evening, Fable)

Both sections above marked `d3dd20d32` and `6598a8ad6` are fully verified and committed. Nothing is in progress; the worktree is clean for this audit's scoped files. Current mirror SHA-256 after the Mindfulness commit: `CCCF225D2FF41D5B24ACACD301A6A53DA8C005FE767039FFAFEC994431771CF1`.

- Support Request Notes: focused tests 28/28 (`learning_lab_ask_tracker_a11y` rewritten, `learning_lab_ask_tracker_render_a11y` added), golden passed, bounded full suite 2,133/2,133.
- Mindfulness Practice: removed unsupported clinical effect claims (hedged, descriptive `about:` text replaces `research:`), added optional/local-save/non-communication guidance and a stop-if-uncomfortable note, converted `setTimeout` focus to render-synchronized `pendingFocusId` state, added `Array.isArray` guards for malformed session data (component and catalog `stat`), removed `aria-pressed` from the changing-label toggle, bumped 10px meta text to 12px. Focused tests 25/25, golden passed, bounded full suite 2,142/2,142.
- The deny-read ACL was NOT active this session: direct Edit-tool patches to both product mirrors worked. Try direct edits first before falling back to the elevated `C:\tmp` updater pattern.
- `tests/learning_lab_notes_workbench_render_a11y.test.js` flaked once under `--maxWorkers=4` (focus assertion) and passed in isolation and on full-suite rerun. If it fails again, treat as a concurrency flake first, not a regression.
- Two Codex-app zero-byte `.git/index.lock` files were removed after satisfying the staleness protocol (zero bytes, >3 min, unchanged, only read-only git processes observable).

Known follow-ups (not blocking, for a future section or the i18n lane):
- Both retained i18n keys `stem.learning_lab.ask_for_help_tracker` and `stem.learning_lab.log_every_help_ask_normalize_the_most_` still serve OLD translated strings ("Ask-for-Help Tracker", "Log every help ask…") in non-English packs, so localized UIs may still show the removed framing. Same pattern likely applies to `stem.learning_lab.mindfulness` descriptions. Fixing means minting new keys (falls back to the corrected English) or updating 63 packs.
- `formattedDate` in the support notes treats `time: null` or `time: ''` as epoch 0 and would render a 1970 date; only non-numeric garbage falls back to "Date not recorded". Exotic, not observed in real data.

## Next section: PersonalAnxietyToolkit

Continue with `PersonalAnxietyToolkit` (crisis-adjacent content — apply the scientific-integrity and non-communication conventions with extra care, and check any crisis-resource claims are current), then the remaining Learning Lab components and app areas, one independently tested and committed section at a time.

## Completed section reference: Optional Support Request Notes

The former `PersonalAskTracker` / “Ask-for-Help Tracker” section revision, now committed as `d3dd20d32`.

### What the revision changed

- Renames visible framing to “Optional Support Request Notes.”
- Clearly states that saving a note does not send a request or notify anyone.
- Adds a sensitive-data caution.
- Removes “log every request,” destigmatizing/normalizing claims, weekly counts, total-ask scoring, and helpful-percentage ranking.
- Requires at least one user-chosen detail rather than forcing a description.
- Leaves outcome unselected by default and provides a “Clear outcome” control.
- Preserves the existing storage schema and legacy outcome IDs.
- Adds editing, updating, dirty-cancel confirmation, and deterministic focus recovery.
- Uses render-synchronized focus state rather than `setTimeout` focus.
- Renders all saved entries instead of silently limiting history to 15.
- Safely handles non-array and malformed legacy data.
- Uses robust localized dates with “Date not recorded” fallback.
- Replaces the ambiguous icon-only delete action with visible “Delete note.”
- Updates both catalog/navigation fallback descriptions.

### Immediate next work

All of the above was done: `tests/learning_lab_ask_tracker_a11y.test.js` rewritten, `tests/learning_lab_ask_tracker_render_a11y.test.js` added covering every point listed in the previous handoff (guidance, malformed data, blank-submit focus, outcome select/clear, one-detail save, edit/update, dirty cancel, 18-entry full render, confirmed delete focus recovery, no metrics).

Golden command:

```powershell
npx vitest run tests\stem_big_tools_golden.test.js -t learningLab --reporter=dot
```

Bounded full Learning Lab command:

```powershell
npx vitest run learning_lab_ --reporter=json --outputFile=C:\tmp\full.json --maxWorkers=4
```

Before committing any section: verify both product hashes still match a freshly computed guard, run `git diff --check`, inspect scoped status, stage only newly created tests, and use `git commit --only` with exact paths. If either mirror changes unexpectedly, stop and inspect rather than overwriting; another agent may have touched the shared bundle.

## Git lock safety in this shared workspace

The Codex app may leave a zero-byte `.git/index.lock` while many read-only Git processes are active. Never remove it casually and never kill the other processes.

Only consider removal when the lock is zero bytes, older than three minutes, unchanged across two checks, and every active Git command is known read-only. Reject removal if any command line is unavailable or if a writer such as `add`, `commit`, `checkout`, `switch`, `merge`, `rebase`, `reset`, `update-index`, `write-tree`, `read-tree`, `stash`, `cherry-pick`, `revert`, `apply`, `am`, `gc`, or `repack` is active. If no lock exists, commit normally.

## Testing and audit conventions established so far

- Keep root and `prismflow-deploy/public` Learning Lab mirrors byte-identical.
- Pair static/source-contract tests with real rendered jsdom interaction tests.
- Use native controls and explicit submit behavior.
- Avoid autofocus; move focus only after a user action or validation failure.
- Synchronize focus with rendered state via React state/effects when a view or record list changes.
- Give destructive actions accessible in-app confirmation and restore focus afterward.
- Do not silently cap saved history.
- Handle malformed and legacy values without crashing or exposing `Invalid Date`.
- Avoid unsupported causal, diagnostic, normative, productivity-pressure, streak, scoring, or ranking claims.
- Explain optional use, what is saved, and what the feature does **not** communicate externally.
- Preserve unrelated fields and records during updates.
- Use descriptive visible action text and at least 44-by-44 CSS-pixel targets.
- Do not treat automated tests as proof of complete WCAG conformance; continue manual keyboard, zoom/reflow, contrast, screen-reader, and browser checks where the environment permits.

The in-app browser was unavailable in this workspace because of the deny-read ACL, so actual rendered jsdom interaction tests have been the practical UI verification layer. Do not claim full conformance solely from these tests.

## Goal status

The comprehensive WCAG goal remains active and is not complete. Optional Support Request Notes (`d3dd20d32`) and Mindfulness Practice (`6598a8ad6`) are done. Continue with `PersonalAnxietyToolkit` and then the remaining app areas, one independently tested and committed section at a time.
