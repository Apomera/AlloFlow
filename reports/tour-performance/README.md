# Guided-tour browser performance — September 9, 2026

The shared shell previously used the tour step-entry callback for every scroll and resize. Each event called the step's `onEnter`, queued a 600 ms timeout, requested another smooth scroll, and replaced the highlight and bot-position state. Smooth scrolling could itself generate more scroll events and repeat that work.

This pass separates entering a step from tracking its geometry. Step entry retains the reveal callback, delayed measurement, initial scroll, and missing-target navigation. Scroll and resize use a single pending animation frame to measure the current target, without repeating entry actions or requesting scrolling. Temporarily absent targets during tracking do not advance the tour. Identical geometry retains its state identity.

The geometry effect removes its event listeners and cancels its entry timer and queued frame on cleanup. It does not subscribe while the tour is inactive or a standalone help message is displayed. The three canonical shell implementations are synchronized; unrelated shell changes are preserved.

## Browser evidence

The probe executes the actual shell callback and effect in isolated Chromium with a real DOM target, captured nested-scroll events, native animation frames and timers. It counts state identity changes with instrumented setters. Programmatic scrolling is counted without initiating native smooth scrolling, preventing an unbounded feedback loop in the baseline fixture.

| Work following a burst of 100 scroll + 100 resize events | Before | After |
| --- | ---: | ---: |
| Repeated step-entry callbacks | 200 | 0 |
| Smooth-scroll requests | 200 | 0 |
| Geometry measurements | 200 | 1 |
| Highlight state changes | 200 | 1 |
| Bot-position state changes | 200 | 1 |

Highlight coordinates matched exactly. A second burst with unchanged geometry produced zero highlight or bot-position state changes after the optimization. An event immediately followed by cleanup produced no later measurement. The fixture's initial step-entry behavior remained unchanged.

These are deterministic event-work counts, not measurements of React commits, whole-app startup, or field Core Web Vitals. Separate tour activation effects remain outside this pass. Raw evidence: [browser.json](browser.json). The preserved source sections in [baseline.json](baseline.json) make the comparison reproducible without depending on an untracked snapshot.

## Validation

**47 tests passed across four files**, with no failures or skips. Scoped whitespace checks passed.

The focused test report covers burst coalescing, captured scroll handling, unchanged-state identity, timer/frame cancellation, inactive tours, transient missing targets, stale tour contexts, three-shell parity, existing forward/back navigation, and spotlight accessibility. See [tests.json](tests.json).

No deployment, push, or installer was produced.

```powershell
node dev-tools/tour_geometry_performance.cjs
node node_modules/vitest/vitest.mjs run tests/tour_geometry_performance.test.js tests/guided_tour_ux.test.js tests/spotlight_help_runtime_a11y.test.js tests/app_shell_performance.test.js --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
```
