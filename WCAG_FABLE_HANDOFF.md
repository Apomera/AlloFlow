# WCAG 2.2 AA Audit Handoff for Fable

Updated: 2026-07-19 (America/New_York)

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

The most recently completed section, Personal Reference Sheet Builder, passed:

- Focused source/render tests: 19/19
- Learning Lab golden test: passed
- Bounded full Learning Lab suite: 2,120/2,120 tests across 133 files

Its exact committed files were:

- `stem_lab/stem_tool_learning_lab.js`
- `prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js`
- `tests/learning_lab_cheat_sheets_a11y.test.js`
- `tests/learning_lab_cheat_sheets_render_a11y.test.js`

## Current in-progress section: Optional Support Request Notes

The former `PersonalAskTracker` / “Ask-for-Help Tracker” section is revised in both product mirrors but is **not tested or committed yet**. Do not commit it in its current state until focused and full verification are complete.

Current scoped status:

```text
 M prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js
 M stem_lab/stem_tool_learning_lab.js
```

Both current mirrors have the identical SHA-256 checksum:

```text
3B50BF050F4EAFF4335BEE167F14B8E423B3922522063D4780622638C12B57CA
```

The guarded updater that produced this state remains at:

`C:\tmp\update_ask_tracker.cjs`

It already ran successfully, and both JavaScript mirrors passed `node -c` after the update.

### What the in-progress revision changes

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

1. Rewrite `tests/learning_lab_ask_tracker_a11y.test.js` for the new contract.
2. Add `tests/learning_lab_ask_tracker_render_a11y.test.js`.
3. Render-test at minimum:
   - optional/privacy/non-communication guidance;
   - malformed legacy entries and invalid dates;
   - blank submit error and focus on `#learning-lab-ask-what`;
   - no outcome preselected;
   - selecting and clearing an outcome;
   - saving with only one detail;
   - editing and updating an existing note;
   - dirty cancel opening the shared accessible confirmation dialog;
   - all entries rendered (include more than 15 fixtures);
   - confirmed deletion and focus moving to the next edit control;
   - no metrics, percentages, ranks, or scores.
4. Review the in-progress component carefully for any regression before accepting the implementation.

Suggested focused command:

```powershell
npx vitest run tests\learning_lab_ask_tracker_a11y.test.js tests\learning_lab_ask_tracker_render_a11y.test.js --reporter=dot
```

Golden command:

```powershell
npx vitest run tests\stem_big_tools_golden.test.js -t learningLab --reporter=dot
```

Bounded full Learning Lab command:

```powershell
npx vitest run learning_lab_ --reporter=json --outputFile=C:\tmp\ask_tracker_full.json --maxWorkers=4
```

Before committing, verify both product hashes still match, run `git diff --check`, and inspect scoped status. Then stage only the new render test and commit exact paths:

```powershell
git add -- tests\learning_lab_ask_tracker_render_a11y.test.js
git commit --only -m "Improve support note accessibility" -- `
  stem_lab\stem_tool_learning_lab.js `
  prismflow-deploy\public\stem_lab\stem_tool_learning_lab.js `
  tests\learning_lab_ask_tracker_a11y.test.js `
  tests\learning_lab_ask_tracker_render_a11y.test.js
```

Use a fresh hash guard in the commit command. If either mirror changes unexpectedly, stop and inspect rather than overwriting; another agent may have touched the shared bundle.

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

The comprehensive WCAG goal remains active and is not complete. After committing Optional Support Request Notes, continue with the next unaudited Learning Lab component (`PersonalMindfulness`) and then the remaining app areas, one independently tested and committed section at a time.
