# Lane 9 — Shell UX: guided mode, tour, toasts, storage

**Lane:** L9 · **Branch:** main · **Date:** 2026-08-16
Scope: N1, N2, N3, N4, N5, N6, D4, D5, D6, D7. All ten addressed.

Nothing was staged, committed, pushed, or deployed. No lock was held across a test run.

---

## Summary for Aaron

Two of the ten turned out to be real, mechanical defects rather than product judgment,
and both were invisible from the outside:

- **N2** was a two-line bug. A `useEffect` set `activeSidebarTab` back to `'create'`
  on every render while Guided Mode was on, so the History click was applied and then
  reverted before paint. That is why it looked like nothing happened.
- **N3** is worse than "out of date text". Thirteen of the tour's steps point at tool
  cards that the Find-a-tool filter sets to `display:none` under its default group, and
  the tour's own "target missing, skip it" branch never fires for a hidden element, so
  it spotlights a zero-size rectangle over an invisible card. The tour genuinely predates
  that panel and nobody re-walked it afterwards.

The judgment calls I made on your behalf, with reasoning in each section below:
**N4** rename is "Find a tool"; the panel no longer sticks; dismissal is offered only
when the filter is inert. **N6** I did not reorder the panels, and argue why.
**D4** toasts moved to top-centre and now keep a replayable log inside the hints modal.

Two things I did NOT do and why, both at the end: the AlloBot idea in N2, and a full
in-app browser run.

---

## N1 — Guided mode presents too much at once

### Found

The complaint is exactly right and it is an ordering problem, not a volume problem in
the abstract. `view_guided_mode_banner_source.jsx` renders the mid-run body in this
order (line numbers pre-change):

| # | What | Line |
|---|------|------|
| 1 | Resume checkpoint card | 1544 |
| 2 | Auto-advance handoff notice | 1548 |
| 3 | Step label | 1549 |
| 4 | Journey grid: Why now / You'll create / Next (three boxes) | 1550 |
| 5 | Step estimate chips (three pills) | 1563 |
| 6 | `<details>` Plan & navigation | 1564 |
| 7 | `<details>` Lesson brief | 1565 |
| 8 | `<details>` Browse or jump to another step | 1566 |
| 9 | `<details>` Lesson resources | 1586 |
| **10** | **👉 the one instruction telling you what to click** | **1587** |
| 11 | Inline result preview | 1592 |
| 12 | `<details>` Ask Guide to adjust what remains | 1593 |
| 13 | "Focus highlighted tool" button | 1603 |

So a novice met a three-box grid, a chip row and four disclosures before reaching the
sentence that says what to do, and the button that takes them there was three items
further down again. "You might have no idea what should I actually click on" is a fair
reading of that layout.

### Changed

`view_guided_mode_banner_source.jsx`

- **1550-1565** — the instruction card moved to directly under the step label, and is
  now the visually loudest element in the banner (larger type, stronger border, an
  uppercase `DO THIS NOW` / `DONE` lead line). The "Focus highlighted tool" button moved
  up with it and became `Show me where to click`.
- **1567** — the journey grid moved out of the always-visible flow.
- **1580-1583** — the journey grid and the estimate chips now render *inside* the
  existing "Plan & navigation" disclosure. Both are orientation, not a next action.
- `ui_strings.js:412` — `guided.focus_tool` changed from "Focus highlighted tool" to
  "Show me where to click". Jargon to plain language, for a teacher who does not
  consider themselves good with technology.

The reading order is now: step name → one instruction → one button → everything else,
collapsed.

**On the attention cue.** You asked for a single one. There already is one and it is the
right one: the host paints `.allo-guided-target` on the actual tool card, a 2s pulsing
outline (`AlloFlowANTI.txt:9830`), which is a tutorial pointing at the thing rather than
at itself. I deliberately added no second animation inside the banner, and there is now
a test asserting the banner body contains no `animate-pulse` / `animate-bounce` /
`animate-ping`, so a later change cannot quietly introduce a competing cue. The History
tab's "new resource" cue is a static ring plus dot, not an animation
(`view_sidebar_tabs_nav_source.jsx:82`), so it does not compete.

### Verified

- `node _build_view_guided_mode_banner_module.js` + `node --check` clean.
- Rendered the built module through React DOM server and checked the real DOM offsets,
  not the source text. Order: step label 2010 → DO THIS NOW 2473 → Show me where 2874 →
  Plan & navigation 2900 → journey grid 3058 → estimate chips 3480 → jump-to-step 4063.
  **PASS.**
- **Rendered it in Chromium at 440px and looked at it.** Screenshot at
  `<scratchpad>/guided_banner.png`. Reads: Guided Mode / Step 2 of 24 → Welcome back →
  Phase 2 of 9 Understand → Analyze Source Material → **DO THIS NOW: Run Analyze to scan
  the reading level, key concepts, and tricky vocabulary** → *Show me where to click* →
  collapsed Plan & navigation → How it works / Worked example → Back / Skip / About /
  Resume later. Zero page errors.
- `npx vitest run tests/guided_mode_banner_a11y.test.js` — 18 passed, including two new
  contracts I added: the ordering above, and the no-second-animation rule.

### For Aaron

The banner still contains a great deal *behind* disclosures: an AI Planning Studio with
three stages, a saved-plans manager with import/export, a classroom-context editor, a
readiness preflight, a feedback log. I left all of it. Every piece is now behind a
closed `<details>` or a modal, so it costs a novice nothing on first read, and removing
features is a bigger decision than this pass. If you want a second cut, the honest
target is the Planning Studio: it is a full application living inside a sidebar banner.

---

## N2 — Guided mode blocks History

### Found

Confirmed, and it is a defect with a precise cause. `AlloFlowANTI.txt` (pre-change 25378):

```js
useEffect(() => {
  if (guidedMode && activeSidebarTab !== 'create') {
    setActiveSidebarTab('create');
    setGuidedTargetEpoch(epoch => epoch + 1);
  }
}, [guidedMode, activeSidebarTab]);
```

The History button set the tab; this effect set it straight back. The click was applied
and reverted within one commit, so there was no error, no message, and no visible
change. That is the "silently swallowing a navigation click" case exactly.

A second, narrow-screen half sat at 27964: `if (guidedMode) { setWorkspacePane('create'); return; }`
ran before the history branch, so History could not take the pane on a phone either.

The Guided banner is rendered *outside* the tab gate (`AlloFlowANTI.txt:47249` vs the
`activeSidebarTab === 'create'` gate at 47251), so letting History through does not
lose the banner. That is what made the better answer cheap.

### Changed — History now works during Guided Mode

`AlloFlowANTI.txt`

1. **25378** — snap-back removed. The effect now only bumps `guidedTargetEpoch` when the
   user *returns* to Create, which re-runs the highlight binding. That epoch bump was
   the only thing the forced tab was buying.
2. **27964** — the history branch moved ahead of the guided branch, so History takes the
   pane on narrow screens too.
3. **9760** — `focusGuidedTarget` switches back to the Create tab before focusing, then
   waits two animation frames for React to mount the column. Without this, "Show me
   where to click" would silently do nothing from the History tab.
4. **9821** — the highlight-binding effect returns early when the Create tab is not
   showing. This one matters: the miss branch reschedules itself every 200ms via
   `setGuidedTargetEpoch`, so without the guard, sitting in History would spin a
   200ms setState loop for as long as the teacher stayed there. `activeSidebarTab` is
   deliberately **not** added to that deps array: the array is evaluated during render
   and the state is declared ~15,500 lines later, which would be a TDZ crash. The epoch
   bump from (1) is the re-run signal instead.
5. **48601** — a visible strip above the History panel while a guided run is live:
   "Guided Mode is still running. You are on step {current} of {total}." with a
   **Back to my step** button that returns to Create and re-focuses the tool.

So both halves are covered: History works, *and* the constraint that used to be
invisible is now stated with an obvious way back.

### Verified

- `npx esbuild AlloFlowANTI.txt --loader:.jsx=jsx` parses clean; `check_build_smoke`
  passes on both source and App.jsx.
- `npx vitest run tests/guided_host_wiring.test.js` — 27 passed. I rewrote one existing
  test (it asserted the snap-back as correct behaviour) and added a new one,
  `lets History open during Guided Mode instead of swallowing the click`, pinning all
  four code changes plus the two new strings.

### For Aaron — the AlloBot idea

I did **not** touch AlloBot; Lane 7 owns it. Filed as a cross-lane note rather than an
edit. My read: it is worth pursuing but it is not what N2 needed. The bug was a
swallowed click, and no amount of conversational guidance fixes a control that reverts
itself. Where AlloBot would genuinely help is the *next* layer: a teacher who lands in
History mid-run and wants to ask "where was I?" or "does this resource belong to my
lesson?" That is a good AlloBot job and a poor banner job. The hook now exists, because
the guided step index and label are available on the History tab.

---

## N3 — The tour is out of date

### Found

Two findings. The second is the one that matters.

**1. Every tour anchor still exists.** I checked all 31 step ids in `tourSteps`
(`AlloFlowANTI.txt:15958`) against the DOM. Every one resolves. So there was nothing to
*remove* for non-existence, and I removed nothing.

**2. Thirteen of the tour's steps point at cards the Find-a-tool filter has hidden.**
This is the real breakage and it is exactly the "written before the Create Resource
panel changed" problem.

`hiddenToolCatalogSelector` (25387) emits `display:none !important` for every tool card
outside the current group. The default group is `essentials` = analysis, glossary,
simplified, image, quiz, lesson-plan, directions, package-deliver. The tour walks:

> wordsounds, outline, anchor-chart, faq, scaffolds, note-taking, brainstorm, persona,
> timeline, concept-sort, math, adventure, alignment, dbq

Thirteen of those are hidden under `essentials`. And `_resolveTourEl` (15910) is a plain
`document.getElementById`, which returns a `display:none` element perfectly happily, so
the tour's own auto-skip fallback at 16348 ("target not on screen, move on") **never
fires** for them. The result is `getBoundingClientRect()` on a hidden node: a zero rect,
a spotlight cut over nothing, and `scrollIntoView` that does not move. Guided Mode was
already exempted from the filter; the tour never was.

**3. Two panels that exist have no tour step.** `#tour-tool-finder` (the panel itself)
and `#tour-tool-directions` (Assignment Directions, which shipped with a tour anchor and
no step). The tool finder is the control that decides what the next twenty steps are
even pointing at, and the tour never mentioned it.

### Changed

- **`AlloFlowANTI.txt:25374` and `25387`** — `runTour` joins `guidedMode` as an exemption
  from catalog filtering. While the tour runs, every tool card is visible. One condition
  each; it is the correct fix because a tour that shows you a filtered subset is lying
  about the product.
- **`AlloFlowANTI.txt:15963`** — new tour step for the tool finder, placed between the
  AI Guide and Universal Settings, i.e. before the tool walk it governs. Text says what
  it does ("it does not create anything by itself") and that the tour is showing the
  whole set.
- **`AlloFlowANTI.txt:15990`** — new tour step for Assignment Directions, between Lesson
  Plan and Package & Deliver, matching its position in the column. Text leads with the
  thing that distinguishes it: "This is the one card you fill in yourself."
- **`view_sidebar_panels_source.jsx:91`** and the host fallback section — `id="tour-tool-finder"`
  added so the new step has an anchor in both the module and the fails-open path.
- `ui_strings.js` — `tour.tool_finder_title/text`, `tour.directions_title/text`.

### Verified

- Anchor sweep: all 33 ids (31 existing + 2 new) resolve in source.
- `npx vitest run tests/tool_catalog_collapse_contract.test.js` — passes, with the
  guided-and-tour exemption now asserted rather than just the guided one.
- I did **not** drive the tour end to end in a browser (see "What I did not verify").

### For Aaron

Step *text* is a separate, larger job. I read all 31 and found no factually wrong
statements, but several are long enough that a nervous teacher will not read them, and
`tour.udl_guide_text` alone is a five-section document. That is a copy pass, and it
overlaps Lane 5's help-string work rather than sitting in this lane. Worth scheduling;
not worth me half-doing here.

---

## N4 — "Create Resource" is really a filter

### Found

Confirmed. `ToolCatalogControls` (`view_sidebar_panels_source.jsx:57`) is a purpose-group
filter plus a search box. It creates nothing. What it does is hide non-matching tool
cards via injected CSS, and the card you then press is what creates. It was `sticky top-0
z-20`, had a collapse but no dismissal, and its heading said "Create a resource".

### Changed — three decisions, each with a reason

**1. Renamed to "Find a tool."** The panel's own search label already said "Find a tool";
the heading was the part that was wrong. "Find" is honest about narrowing rather than
creating, and it is what a teacher is actually doing when they touch it. The subtitle
became "Narrow the list below by purpose, or search it."

**2. It no longer sticks.** Removed `sticky top-0 z-20`. Reasons, in order of weight:
- The sidebar is a narrow, tall column and the panel permanently spent the top ~64px of
  the most valuable space in it.
- It is a set-it-then-browse control, not one you adjust continuously while scrolling,
  so the thing stickiness buys is worth little here.
- It actively fought Guided Mode. Guided scrolls the pulsing tool card with
  `block: 'center'`, and on a short viewport a sticky header can end up over it. A
  sticky filter panel covering the tutorial's attention cue is a bad trade.
- "It can get in the way" is what sticky positioning means, mechanically.

**3. Dismissible, but only from an inert state.** Your guardrail was that dismissing
must never leave a hidden filter quietly narrowing what the teacher sees. The
implementation:
- A single action button. When **no** filter is active it reads **Hide this panel** and
  dismisses. When a filter **is** active the same button reads **Show all tools** and
  clears the filter; press it again and it now says Hide. Two presses, and no state
  exists where tools are missing and the reason is off screen.
- While a filter is active the panel states it in words, open or collapsed:
  "A filter is on: showing 8 of 22 tools."
- **From outside the panel**, per your ask: when hidden, the host renders a slim restore
  bar (`AlloFlowANTI.txt:47715`) that names the state and offers **Find a tool**. If a
  filter were somehow live while hidden, that bar reports the counts rather than the
  reassuring "Showing all tools."
- Dismissal is session state, not persisted. A filter panel that is simply gone on
  tomorrow's first load is a support call.

Also localized the whole panel: it was hardcoded English throughout (heading, subtitle,
button labels, search label and placeholder, all five purpose-group labels, the group
`aria-label`). Twenty-five new `sidebar.tool_finder_*` keys, listed for Lane 5 below.

### Verified

- **Rendered in Chromium at 440px, both states, and looked.** Screenshot at
  `<scratchpad>/tool_finder.png`. Zero page errors.
- That render caught two defects I had introduced, now fixed:
  1. The collapsed-and-filtered panel said *"Every tool is listed below"* one line above
     the banner reporting *"A filter is on: showing 8 of 22 tools."* Flatly
     contradictory. It now reads "Open this to change or clear the filter."
  2. The filter banner, the Hide action and the "N shown" chip rendered as three
     separate right-aligned rows, which is precisely the busyness this pass exists to
     remove. Banner and action now share one row; the count moved onto the search
     label's row. Two rows saved.
- `npx vitest run tests/tool_catalog_collapse_contract.test.js` — passes, with three
  tests I added: Hide is offered only when no filter is active, the filter state is
  stated inside and outside the panel, and the panel does not stick.

---

## N5 — "Manage local storage" opens the wrong thing

### Found

Confirmed, located, and it is the copy you actually use. There are **two** copies of
this settings panel and only one was ever fixed:

- `view_misc_modals_source.jsx:1725` (the deployed AI Backend Settings modal) was
  corrected in July: it calls `window.__alloOpenStorageRecoveryManager()`.
- **`AlloFlowANTI.txt:52630` (the Canvas Advanced Settings modal) still called
  `window.__alloOpenDeviceStorageProbe()`** — the development probe popup
  (`text_utility_helpers_source.jsx:590`), built to test whether Canvas storage survives
  a reload. It is a diagnostic harness. It shows a teacher none of their saved work.
  Canvas is your primary surface, which is why this is the one you hit.

And the target you want already exists. The Storage and recovery manager in `'manage'`
mode (`AlloFlowANTI.txt:45299`) **is** the resource pack history: every saved workspace
with its title, resource count, size and date, plus Restore, Pin, Export, Remove
embedded media, Erase, retention policy and storage totals.

### Changed

- **`AlloFlowANTI.txt:52630`** — points at `openCanvasRecoveryManager`. Label changed
  from "Manage device storage" to **"Open saved work"**, and the hint now says what
  opens: "Open your saved resource packs to restore, pin, export, or erase them."
- **`view_misc_modals_source.jsx:1748`** — removed the last-resort fall-through to the
  probe. It was the final path where one label could open two different things, and the
  thing it opened was the diagnostic. On a host too old for either bridge it now warns
  to the console and does nothing, which beats opening the wrong screen.
- **`view_misc_modals_source.jsx:1786`** — the guided card relabelled from "Local storage
  & downloads" / "Manage local storage" to "Saved work on this device" / "Open saved
  work", leading with the resource packs.
- **Folded the probe into Platform Diagnostics**, which is the option you preferred if it
  was cheap. It was: `view_misc_modals_source.jsx:942` now has a **Test device storage**
  button beside Run platform check and Test dialog, with a line saying what it is and is
  not: *"Test device storage only checks whether this browser can keep data. To see,
  restore, or erase your saved resource packs, use Local storage and downloads above."*
  `Ctrl+Alt+Shift+D` still opens it. Nothing was deleted, and there are no longer two
  doors to two different things under one label.

### Verified

- `npx vitest run tests/ai_backend_modal_guided_render.test.js tests/ai_backend_modal_guided_a11y.test.js` — 17 passed.
- I rewrote the render test, which had been **pinning the bug**: it asserted the button
  called `__alloOpenDeviceStorageProbe` and counted that as a pass. It now asserts the
  button reaches the storage manager, and that it does **not** reach the probe even when
  the manager bridge is absent.

---

## N6 — Panel ordering (Analyze Source Material after Universal Settings)

### Found

The premise checks out. Universal Settings mounts at `AlloFlowANTI.txt:47571`, the
Analyze Source Material card at 47588, so Universal Settings does come first. And it
genuinely does not apply: `analysis` appears in **none** of the six measured coverage
lists in `UNIVERSAL_SETTING_COVERAGE` (`view_sidebar_panels_source.jsx:22`) — not grade,
language, standards, interests, DoK or emoji. The `AnalysisPanel` props confirm it: no
`gradeLevel`, no `leveledTextLanguage`.

### Changed — I did not reorder. Here is the argument.

Your instinct that reversing "might not look right either" is correct, and I think the
deeper reason is that **order does not fix the confusion, it hides it.**

1. **Reordering leaves the false belief intact.** If Analysis came first, Universal
   Settings would sit above Glossary and Text Adaptation, which it does govern. But a
   teacher who sets grade 5, runs Analysis, and reads back "Reading level: 6th to 8th
   grade" will still wonder why the tool ignored them. Position is a weak, deniable hint.
   A sentence is not.
2. **The flow argument cuts both ways.** "Analyze first, then set the grade you're
   targeting" is a good sequence. So is "set your class context, then work." Neither
   ordering is wrong enough to justify the churn.
3. **It is not free.** Analysis is Guided Mode's step 1 target. Moving its card changes
   where the guided pulse lands relative to the panels above it, which interacts with
   both N1 and N4 in this same pass. Three simultaneous changes to the same 100 pixels
   is how a regression gets missed.
4. **The panel already computes the answer.** Every control knows exactly which
   resources it reaches. It was only ever saying half of it.

So: legibility instead of movement.

- **`view_sidebar_panels_source.jsx:562`** — an amber scope note at the top of the open
  panel, naming the case directly: *"These steer what AlloFlow writes for you. Analyze
  Source Material is not affected: it reads your text exactly as written and reports the
  level it actually finds. Each setting below lists the resources it reaches."*
- **`view_sidebar_panels_source.jsx:146`** — every per-control chip now also lists what
  it does **not** reach ("Not used by: ..."). "Applies to 17 of 19" left the teacher to
  work out which two.
- **`ui_strings.js`** — `universal.subtitle` corrected from "Apply to **every** resource
  you generate" to "Apply to **most** resources you generate". That line was simply
  false, and it is the one a collapsed panel shows.
- **`view_sidebar_panels_source.jsx:31`** — added `allTypes` to the coverage constant so
  exclusions derive from the same measured source (`docs/resource_setting_coverage.json`)
  rather than a hand-kept list.
- **`tests/universal_settings_panel.test.js`** — extended the drift test to cover
  `allTypes`. Without it, it would have been the one list in that constant nothing
  checked, and a stale entry there would make the panel claim a setting skips a tool it
  actually reaches. That failure mode is worse than the problem it fixes.

### Verified

`npx vitest run tests/universal_settings_panel.test.js` — 15 passed, including the new
drift assertion.

### For Aaron

If you still want the reorder after seeing the scope note in use, it is a two-line move
and I would rather you judge it against the labelled version than the unlabelled one.

---

## D4 — Toasts

### Found

- Placement: `AlloFlowANTI.txt:46256` — `fixed inset-x-4 sm:left-5 sm:right-auto
  sm:max-w-md`, `bottom: calc(safe-area + 5rem)`. Bottom-left, confirmed.
- Lifetime: `addToast` (16592) gives 4.5s (success) to 10s (error), plus up to 5s for
  long text. Hovering or focusing pauses the timer, which helps a mouse user who notices
  in time and does nothing for one who does not.
- No log of any kind. Once a toast expired it was gone.
- The pattern you like does exist: `hintHistory` + `HintsModal`, reached from the header
  lightbulb (`view_header_source.jsx:989`).

### Changed — placement

Moved to **top-centre**, offset below the header by the app's own measured
`mainTopOffset`, with the slide-in direction flipped to match.

Why top-centre, concretely: **every bottom placement collides with something.**
Bottom-left is where the sidebar's Generate buttons are and where the "Saved on device"
chip is pinned; bottom-centre is the take-home banner (46040); bottom-right holds the
student-tools launcher and both floating return pills. The top band is app chrome the
teacher is not clicking during a generation, and centring favours neither the sidebar nor
the preview pane. You remembered it as top-centre and thought the move was wrong; I agree,
and restoring it is also the lowest-surprise option.

The trade you named is real: bottom-left was more visible. The toast log below is what
pays for that.

### Changed — replayable toast log

Built on the mechanism you pointed at rather than beside it.

- `AlloFlowANTI.txt:16570` — `toastHistory` state; `addToast` (16601) pushes every toast
  into it. In memory only, capped at 40, oldest dropped. It is a reading aid, not an
  audit trail, and it must not grow into the device's storage budget.
- `view_hints_modal_source.jsx` — the hints modal gains a second section. Two plain
  buttons, **Ideas** and **Messages (N)**, deliberately not a `role="tablist"` so the
  arrow-key semantics of a real tab widget are not implied. Messages lists every notice
  newest-first, colour-coded by kind, with a timestamp and a **Clear this list** action.
- `AlloFlowANTI.txt:47222` — opens straight to Messages when there are messages and no
  hints, so the common case is one click.
- `view_header_source.jsx:996` — the lightbulb's red dot now counts messages as well as
  hints. This is the discoverability half: without it, an expired toast left no trace
  anywhere and nobody would think to look in the hints modal for it.

### Verified

- **Rendered the Messages view in Chromium and looked.** Screenshot at
  `<scratchpad>/hints_messages.png`. Three seeded toasts render newest-first with
  PROBLEM / HEADS UP / DONE labels, times, and Clear this list. Zero page errors.
- Server-render check confirms newest-first ordering and the Clear control's disabled
  state when the log is empty.
- `npx vitest run tests/hints_modal_a11y.test.js tests/hints_modal_runtime_a11y.test.js`
  — passes. I raised the button count assertion from 4 to 7 and added a stronger one
  alongside it (every button declares `type`), plus a new test pinning the log's
  reachability.
- The toast **position** is the one thing I could not photograph: it depends on the whole
  app shell. See "What I did not verify".

---

## D5 — "Saved to device" chip is permanent

### Found

`AlloFlowANTI.txt:52927`. A `fixed bottom-4 left-4 z-[1000]` status pill with three
states: unsaved (red, pulsing), storage disabled (red), and settled (green "Saved on
device" / blue "Saved to cloud"). It never dismissed. The settled state is the one that
sat there indefinitely.

### Changed

`AlloFlowANTI.txt:25299` — the settled state auto-hides after 6 seconds. The two warning
states (a save in flight, storage disabled) **never** auto-hide, because those are the
ones a teacher needs to see. Each new save re-shows the chip briefly, so the confirmation
is still delivered; it just stops being furniture. Render gate at 52927.

Implemented as a top-level hook with a cleared timeout, not a CSS animation, so the live
region actually leaves the accessibility tree rather than lingering invisibly.

### Verified

`esbuild` parse and `check_build_smoke` clean. Behaviour is a timer, verified by reading
the effect and its deps (`_saveChipIsWarning`, `lastSaved`, `isCloudSyncEnabled`), not by
watching it. 6s is a judgment call; it is one constant if you want it longer.

---

## D6 — Cached-remediation chip covers the student tools bar

### Found

Confirmed, with the geometry. The "Return to remediation" pill
(`AlloFlowANTI.txt:53667`) is `fixed bottom-4 right-4 z-[1000]`. The student tools
launcher (`view_fab_stack_source.jsx:216`) is `fixed bottom-24 md:bottom-8 right-6
z-[180]`. On desktop the launcher's box runs roughly 32px to 88px from the bottom at the
right edge; the pill runs roughly 16px to 58px and is ~215px wide. They overlap, and
z-1000 beats z-180, so the pill wins and the launcher is unclickable underneath it. The
Dynamic Assessment pill at 53430 has the same footprint.

Notably the FAB stack already knows how to move for something: it shifts to
`right-[530px]` while the tour runs. Nothing did that for these pills.

### Changed — both halves, because that is what makes dismissal safe

**Dismissible.** `AlloFlowANTI.txt:53667` — the pill is now a two-part control: the
existing action plus a dismiss `X` on the right. `pdfReturnPillDismissed`
(declared 23496) gates it, and resets automatically whenever a newer `pdfFixResult`
arrives, so a fresh remediation always offers the pill again.

**Reachable from the storage panel.** `AlloFlowANTI.txt:45765` — a "Cached accessibility
remediation" section inside the Storage and recovery manager, shown only when a result
exists, with the score and an **Open remediation results** button that reopens the modal
and closes the storage dialog. This is your own leaning ("the cache belongs in Manage
Local Storage, since that is where it lives") and it is what makes the dismiss button
safe rather than destructive: the work has a permanent home now, not just a floating
shortcut.

I did **not** move the pill's coordinates. Dismissal removes the collision on demand, the
combination you asked for, and a blind offset change to a control I cannot photograph in
the running app is how you ship a new overlap. The geometry above is recorded so you can
decide; my suggestion if you want it is to raise both pills to clear the launcher rather
than to relocate them.

### Verified

`npx vitest run tests/pdf_remediation_reentry.test.js` — 8 passed. I extended the pill's
gating assertion to include the dismissal flag and added assertions for the reset effect
and the storage-panel door, so the two halves cannot drift apart.

---

## D7 — The "You write it" pill

### Found

`AlloFlowANTI.txt:48153`. It is `directions.badge` ("you write it"), rendered as
`rounded-full` with a border and background: the app's own idiom for a pressable chip.
It sits at the right edge of the Assignment Directions card, which is itself one large
`<button>`. So the card reads as a control with a second, smaller, disabled-looking
control inside it. It is decorative: it names who authors the directions.

### Changed

Replaced the pill with plain text plus a `ChevronRight`, matching the chevron every other
openable card in the column already uses. The whole card now reads as one affordance
pointing at what happens when you press it. The string keeps its `directions.badge` key,
so translations carry over untouched.

Arrow rather than nothing because the badge does carry real information ("AlloFlow will
not write this for you"), which is worth keeping in a column where every other card
generates something.

### Verified

`esbuild` parse clean; `ChevronRight` is already imported (`AlloFlowANTI.txt:18`) and
assigned to `window`, so it resolves in both the monolith and the module path. Not
photographed in-app.

---

## Bonus: editorial

`AlloFlowANTI.txt:48160` — em dash removed from user-facing copy in the Guided delivery
panel ("more than one route—for example" → "more than one route, for example").

---

## New `ui_strings.js` keys — for Lane 5

Added under lock, released immediately after each burst. All English; none translated.

**`guided`** (4 new, 1 changed)
`do_this_now` · `step_done_label` · `history_still_running` · `history_back_to_step`
· **changed:** `focus_tool` ("Focus highlighted tool" → "Show me where to click")

**`sidebar`** (26 new)
`tool_finder_title` · `tool_finder_hint` · `tool_finder_browse` · `tool_finder_open_hint`
· `tool_finder_selected` · `tool_finder_collapse` · `tool_finder_change` ·
`tool_finder_open` · `tool_finder_shown` · `tool_finder_search_label` ·
`tool_finder_search_placeholder` · `tool_finder_group_aria` ·
`tool_finder_group_essentials` · `tool_finder_group_access` · `tool_finder_group_engage`
· `tool_finder_group_assess` · `tool_finder_group_all` · `tool_finder_filtered` ·
`tool_finder_hide` · `tool_finder_hide_title` · `tool_finder_hide_blocked` ·
`tool_finder_show_all` · `tool_finder_hidden` · `tool_finder_hidden_filtered` ·
`tool_finder_loading`

**`universal`** (2 new, 1 changed)
`not_used_by` · `scope_note` · **changed:** `subtitle` ("every" → "most"; the old string
was false)

**`hints`** (9 new)
`sections_aria` · `tab_ideas` · `tab_messages` · `messages_intro` · `messages_empty` ·
`messages_clear` · `message_kind_info` · `message_kind_success` · `message_kind_warning`
· `message_kind_error`

**`tour`** (4 new)
`tool_finder_title` · `tool_finder_text` · `directions_title` · `directions_text`

**`canvas_settings`** (5 new)
`local_storage_title` · `local_storage_hint` · `local_storage_btn` ·
`device_storage_hint2` · `device_storage_btn2`
*(`device_storage_hint` / `device_storage_btn` are left in place and now unused by the
Canvas panel; I did not delete them in case another surface still reads them.)*

**`platform_diag`** (new block, 2 keys)
`storage_probe` · `storage_probe_hint`

**`storage`** (new block, 3 keys)
`remediation_title` · `remediation_hint` · `remediation_open`

**`pdf_audit`** (5 new)
`return_pill` · `return_pill_title` · `return_pill_aria` · `return_pill_dismiss` ·
`return_pill_dismiss_title`
*(the first three were inline English fallbacks with no key at all; `return_pill_title`
also had an em dash, now a comma)*

**`common`** (1 new)
`recall_hints_and_messages`

Two new top-level blocks, `platform_diag` and `storage`, in case that matters to the
pack tooling.

---

## Files changed

| File | Issues |
|------|--------|
| `AlloFlowANTI.txt` | N2, N3, N4 (host), N5, D4, D5, D6, D7 |
| `view_guided_mode_banner_source.jsx` (+ module) | N1 |
| `view_sidebar_panels_source.jsx` (+ module, + public mirror) | N3, N4, N6 |
| `view_hints_modal_source.jsx` (+ module, + public mirror) | D4 |
| `view_header_source.jsx` (+ module) | D4 |
| `view_misc_modals_source.jsx` (+ module, + public mirror) | N5 |
| `ui_strings.js` | all |
| `tests/` (7 files) | contracts for the above |

`guided_mode_config_source.jsx` needed no change: the step catalog was fine, the banner's
presentation of it was the problem.

Every builder was run after its source edit; every built module passes `node --check`;
`AlloFlowANTI.txt` parses as JSX via esbuild and through `check_build_smoke`.

---

## Verification

**Gate.** `npm run verify:gate` fails at `check_cmd_i18n`:

```
✗ cmd i18n manifest STALE — run: node dev-tools/i18n/extract_cmd_keys.cjs
  new in source, missing from manifest: cmd.describe_current_media,
  cmd.open_learning_web_explorer, cmd.read_media_descriptions,
  cmd.suggest_contextual_next_steps (+9 more)
```

**Not mine.** I added no `cmd.*` keys. Those belong to whichever lane is adding media
description and learning-web commands. Reported, not fixed, not bypassed.

I ran the remaining gate steps individually past that failure; all pass:
`check_safety_string_spanglish`, `check_build_smoke` (source **and** App.jsx parse
clean), `verify_module_registry` (198/198), `check_view_props` (57 views, 0 findings),
`check_window_icons`, `check_iife_lazy_lookup`, `check_lang_staleness` (pre-existing
backlog, unchanged by me).

**Targeted tests.** All green:

```
tests/guided_mode_banner_a11y.test.js          18 passed
tests/guided_host_wiring.test.js               27 passed
tests/tool_catalog_collapse_contract.test.js   passed (3 new contracts)
tests/universal_settings_panel.test.js         15 passed
tests/hints_modal_a11y.test.js                 passed (1 new contract)
tests/hints_modal_runtime_a11y.test.js         passed
tests/pdf_remediation_reentry.test.js           8 passed
tests/ai_backend_modal_guided_render.test.js   passed (test rewritten, see N5)
tests/ai_backend_modal_guided_a11y.test.js     passed
tests/guided_mode_banner_completion.test.js    passed
tests/guided_full_lesson_a11y.test.js          passed
tests/storage_recovery_manager.test.js         passed
```

**One pre-existing failure I did not fix.**
`tests/view_sidebar_panels_wcag_a11y.test.js > retains visible focus and explicit
non-submit button behavior` — `expect(source).not.toMatch(/outline-none/)`. I confirmed
against `git show HEAD:view_sidebar_panels_source.jsx` that this file has **4**
`focus-visible:outline-none` occurrences at HEAD and **4** now, so the count is unchanged
by this lane. I did drop the one my new Hide button had added, to avoid growing it. Worth
noting the assertion is arguably over-broad: `focus-visible:outline-none` paired with
`focus-visible:ring-2` is the correct Tailwind idiom for swapping an outline for a ring,
which is what all four of these do.

While in the file I also fixed the two **reduced-motion** violations that the same spec
reports (`transition-colors` without `motion-reduce:transition-none`) on lines I was
already editing. Also pre-existing at HEAD; that half of the spec now passes.

---

## What I did not verify

Stating this plainly rather than implying more coverage than I have.

**Verified by rendering in a real browser and looking at it:** the Guided Mode banner
(N1), the Find-a-tool panel in both filter states (N4), and the toast-log Messages view
(D4). Screenshots in the session scratchpad. That render caught two defects I had
introduced in N4, which is why it was worth doing.

**Not verified visually, and the reason.** The toast's on-screen position (D4), the
auto-dismissing save chip (D5), the remediation pill's dismiss control and its overlap
with the student-tools launcher (D6), and the Directions arrow (D7) are all properties of
the full app shell, not of an isolated component. Seeing them means rebuilding
`App.jsx` in dev mode and copying 441 modules into `desktop/web-app/public/` — churn
across a tree nine other agents are editing, mid-run. I judged that a bad trade and did
not do it.

**One incident, disclosed.** I ran a bare `node build.js` early on as a syntax check
before realising what it does. It rewrote `desktop/web-app/src/App.jsx` and its
`AlloFlowANTI.txt` mirror into DEV mode, replacing 191 CDN module URLs with local paths.
I caught it immediately, confirmed HEAD had 230 CDN URLs and the rewrite had left 43, and
restored both files with `git checkout -- <those two paths>` — verified back at 230. The
index was never touched. Both are build artefacts that `deploy.sh` regenerates, and RULES
forbids editing App.jsx, so HEAD is their correct resting state. I switched to
`npx esbuild --loader:.jsx=jsx` for syntax checks after that.

Please re-render the tour end to end (N3) and glance at the toast position (D4) on your
next real run. Those are the two I would most want a second pair of eyes on.

---

## Cross-lane

One entry appended to `CROSS_LANE_REQUESTS.md`: the AlloBot half of N2, for Lane 7.
No edits made outside this lane's ownership.
