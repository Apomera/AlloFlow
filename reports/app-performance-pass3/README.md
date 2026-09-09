# Shared app browser performance — September 9, 2026

This pass optimizes shared modal keyboard handling and loading views across the app. It follows the STEM runtime and persistence passes. Changes are local source changes; no release or installer was published.

## Measured results

The benchmark runs the actual `useFocusTrap` and `CDNModuleGate` code extracted from the shell in isolated Chromium, using production React and 4× CPU throttling.

| Scenario | Before | After |
| --- | ---: | ---: |
| Computed-style reads for 40 Tab events in a 600-control dialog | 24,000 | 80 |
| Time for that synthetic keyboard sequence | 309.9 ms | 14.1 ms |
| Loading-state updates for 100 unrelated registry events | 100 | 0 |
| Loading-view renders for those events | 100 | 0 |
| Native Tab and Shift+Tab wrapping | Correct | Correct |
| Failure/retry display and successful module registration | Correct | Correct |

The counts show the eliminated work. Timing is a single local run on a busy shared machine, not a field INP or whole-app startup measurement. The 600-control fixture deliberately exercises a large dialog; small dialogs save less. Raw results: [before.json](before.json), [after.json](after.json).

## Changes

**Modal keyboard navigation:** Tab wrapping needs the first and last eligible controls. The hook now queries the current DOM and checks visibility from those endpoints, stopping when it finds them. It avoids reading styles for every control in between. No persistent focusable-element cache was introduced, so inserted, removed, disabled, and hidden controls are still discovered on the next keypress. Interior `data-autofocus` targets, empty dialogs, nested-modal ownership, Escape, and opener focus restoration remain supported.

**Loading views:** a small shared watcher compares the requested export and that view's own registry status. `CDNModuleGate` and the recoverable lazy-view bridge ignore unrelated registry events. This applies to shared loading surfaces including sidebar panels, dialogs, and Persona/Directions views. Gates now subscribe to readiness events even without a named loader. Visible legacy modules still have the 200 ms fallback check when they register without an event. Hiding the document stops that fallback timer; returning checks readiness immediately.

The canonical `AlloFlowANTI.txt` and its existing `desktop/web-app/src` shell mirrors contain the changes. The mirrors retain their canonical pinned URLs; the desktop build performs URL rewriting.

## Validation

- Keyboard regression coverage: endpoints, dynamic controls, hidden subtrees, interior autofocus, empty dialogs, nested Escape ownership, latest callback, escaped focus, and restoration to the opener.
- Loading regression coverage: unrelated events, status transitions, dotted exports, retry, event-only registration, silent legacy registration, hidden-page suspension, close/reopen, and cleanup.
- **52 distinct tests passed across seven focused suites**, including the main run and the final Persona recheck. Existing modal accessibility, sidebar, Persona, document lazy-loading, and module-readiness behavior passed.
- The two existing extraction test harnesses now include the new shared watcher. A stale Persona test that expected rewritten local URLs in canonical source mirrors was aligned with the existing canonical-source/build contract.
- All three complete JSX shells parsed successfully. Source mirrors and scoped whitespace passed. The existing app performance-budget command passed; its asset-size checks cover the already-built assets, not a newly generated release.
- Chrome DevTools MCP remained unavailable because its browser profile was occupied. The benchmark uses its own isolated Chromium instance and does not disturb that browser.

## Reproduction and remaining work

Run `node dev-tools/app_shell_performance.cjs` for the current source. For the recorded baseline, `--before` reads the local snapshot at `scratch/app-performance-pass3/AlloFlowANTI.before.txt`; preserve a pre-change snapshot before running that comparison elsewhere.

Run the focused regression set:

```powershell
node node_modules/vitest/vitest.mjs run tests/app_shell_performance.test.js tests/modal_focus_trap.test.js tests/modal_focus_trap_stack_a11y.test.js tests/performance_runtime.test.js tests/persona_workspace_extraction.test.js tests/sidebar_shell_extraction.test.js tests/document_suite_lazy_loading_contract.test.js --maxWorkers=1 --testTimeout=30000
```

This does not finish all app performance work. The next broader measurement should use a frozen release build to separate cold startup parsing, background module loading, and navigation render costs. The compact release overlay from the earlier pass still needs regeneration from the release checkout before use. No whole-app LCP/INP/CLS improvement is claimed here.
