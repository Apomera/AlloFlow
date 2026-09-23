# Why SEL Hub tools looked grayed out — and why 18 had no card at all

Reported as "some tools seem grayed out", with a guess that a grade-level
gate was responsible.

**It was not a grade gate.** `recommendedRange` is advisory only: it feeds
the search text, the card's accessible name and a "Suggested grades" pill.
Nothing in the hub filters, dims or blocks a tool by grade band. No modal is
needed there.

There were two separate defects, both consequences of the 2026-09-20 switch
from batch loading to lazy loading.

## 1. Eighteen tools had no card at all

`sel_hub_module.js` builds its catalog from a static `_allSelTools` array
(54 tool cards) plus a merge loop that folds in `_dynamicTools` (18 more).
That loop began:

```js
_dynamicTools.forEach(function(dt) {
  // Only add if the tool is actually registered in SelHub
  if (!window.SelHub || !window.SelHub.isRegistered(dt.id)) return;
```

Under the **old batch loader** every module registered seconds after the hub
opened, so by first render this was nearly always true and all 72 tools
appeared.

**Lazy loading inverted it.** A module is now fetched when its card is
clicked, so at first render essentially nothing is registered — and a student
cannot click a card that was never drawn. The tools simply vanished from the
grid:

    advocacy, civicAction, compassion, conflicttheater, cultureExplorer,
    digitalWellbeing, ethicalReasoning, execfunction, friendship,
    growthmindset, peersupport, practiceJourneys, restorativeCircle,
    sociallab, somaticReset, transitions, upstander, voicedetective

The loader in `AlloFlowANTI.txt` states the intended contract directly:

> The card grid renders from the catalog in sel_hub_module.js, which is
> independent of these files, so a tool's tile is visible before its module
> exists. That is what makes lazy loading safe here.

The catalog was not honouring it. `_dynamicTools` is a static literal
carrying icon, label, desc and category, so every card could always have been
drawn, and `openSelToolById()` already handles an unregistered tool: it calls
`__alloEnsureSelPluginLoaded` and a pending-tool watcher opens it once the
module registers.

**Fix:** drop the `isRegistered` gate from the merge. The de-duplication
against the static list stays.

## 2. Cards that worked were styled as if broken

The card rendered with:

```js
cursor: isRegistered ? 'pointer' : 'default',
opacity: isRegistered ? 1 : 0.5,
```

and hover/touch lift gated the same way — **while `onClick` fired
regardless, and no `aria-disabled` was ever set.**

So under lazy loading a fresh hub open dimmed most of the grid to 50% and
removed the pointer cursor, for cards that open perfectly well. Sighted users
read "unavailable" and did not click. Screen-reader users got no such signal,
so the two audiences saw different catalogs. That is the "grayed out" in the
report.

**Fix:** always render `cursor: pointer` / `opacity: 1`. Loading feedback
already exists — `openSelToolById` toasts "… is opening…", and only promises
a load it actually started.

## 3. Usage dots hid the student's own history

The visit-count dots were gated on `isRegistered` too, so a tool you had
opened five times showed no star until its module happened to be loaded.
`selToolUsage` persists independently of module state. Ungated.

## 4. A throwing registry blanked the whole hub

`_selToolIsOpenable` called `window.SelHub.isRegistered(toolId)` unguarded,
inside the card-grid map. A registry that throws would propagate out and take
the entire grid render with it — a blank SEL Hub, not one bad card. The call
is now wrapped; a registry error falls through to the lazy-load path, which
is the correct reading of "cannot confirm it is loaded".

## Verification

Two harnesses, both mutation-tested:

* **`verify_cards.cjs`** asserts all four fixes against the real source,
  including running the patched `_selToolIsOpenable` under a registry that
  throws. Reinstating the merge gate, reinstating the opacity gate, or
  removing the try guard each turns it red.
* **`verify_cards_dom.cjs`** executes the REAL merge loop and reads the REAL
  style object with an EMPTY registry -- the lazy-load reality -- and gets 72
  cards, every one at `opacity: 1` with `cursor: 'pointer'`.

**What was NOT done: a browser screenshot of the grid.** The attempt is worth
recording because it failed in an instructive way. `sel_hub_module.js` is
host-coupled, so the skill's route-injection recipe over the deployed app is
the right approach, but:

* the first run reported `module injections: 0` -- the route never fired, so
  it measured the DEPLOYED code while appearing to work. Only the injection
  counter caught it;
* the skill's documented path ("Full Platform") is stale; the live button is
  "Full AlloFlow";
* the SEL Hub sits behind a tool filter whose labels shift, and injection
  counts varied between otherwise identical runs.

So the claim here is: the catalog logic and the card styling are verified
deterministically. CSS cascade, layout and the real navigation path are not.
A screenshot would still be worth having before this ships.

All four SEL copies re-synced (`check_sel_four_copy_parity`: 75 files x 4,
identical). `check_sel_hostile_tooldata`: 0 crashes across 68 tools.

## 5. A tool that failed to load produced a false message, late, with no retry

Found while auditing what happens after a card is clicked. The host loader
(`AlloFlowANTI.txt`) records each module's outcome precisely and exposes it:
`__alloGetSelPluginState(toolId)` returns `loading` / `loaded` / `error` with
a human-readable reason ("The plugin file could not be downloaded. Check the
connection or school network filter, then try again."), and
`__alloRetrySelPlugin(toolId)` retries. **The hub used neither.** It waited
out its own 20 s TTL and then toasted "‹tool› is not available in this SEL
Hub." — which is false in every one of these cases.

Replayed against the real `consumePending` and the real pending-tool effect
on a fake clock, same scenarios before and after:

| Scenario | Before | After |
|---|---|---|
| school filter blocks the file | 21.6 s, "not available" | 1.5 s, the host's reason + Try again |
| blocked while other tools load | **30 s** (each load re-armed the timer) | 1.5 s |
| downloads but never registers | 22 s, "not available" | 4 s, "did not start" |
| slow network, lands at 21 s | error at 20 s **and the tool never opened** | opens at 21 s |
| id no module provides | "not available" at 20 s | unchanged — true here |
| retry | not possible | opens after Try again |

**Changes (all in `sel_hub_module.js`, no host change):**

* `consumePending` asks the host. `error` → failed immediately, carrying the
  host's reason. `loaded` but never registered after `LOADED_GRACE_MS`
  (1.5 s) → failed ("did not start"). Still `loading` at the TTL → keep
  waiting, because the host settles every request within its own 20 s
  timeout; capped at twice the TTL.
* The one-shot "TTL from now" timer is gone. The effect that armed it re-runs
  on every plugin event, so each other tool finishing pushed the deadline
  back. A 1 s poll replaces it; `consumePending` measures age from the
  click, so the poll cannot drift, and it also catches the loaded-but-silent
  case, which fires no further event.
* A failure renders an inline `role="alert"` at the top of the grid (after
  the skip link) with the reason, **Try again** and **Dismiss**. A toast
  cannot carry an action. Try again writes the pending record before asking
  for the retry, so the effect the retry re-runs finds it.
* "Not available in this SEL Hub" is kept for the one case where it is true:
  the loader has no state for the id at all.

**Verification:** `replay_pending2.cjs` runs 8 scenarios against the real
extracted code (10 assertions). Mutation-tested: dropping the host error
check, giving up while the host still loads, removing the poll, routing
failures back to the old message, and dropping the never-registered branch
each turn it red.

An earlier draft also kept a click-anchored one-shot timer alongside the
poll. Mutation testing showed it was indistinguishable from its absence — the
poll already covers it — so it was removed rather than kept as code that only
looks protective.
