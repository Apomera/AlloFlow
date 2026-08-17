# Create goes home: migrating STEM Lab's Create tab into the Math tool

Scoped 2026-08-17, from the working tree. Status: **plan, not started.** Every
claim below was verified against current source; file:line references are to
the state at commit `107547c05`.

## Why

Three verified facts say the Create tab is the math tool wearing the Lab's coat:

1. **Create is math-only end to end.** Its three source modes (From Topic /
   From My Content / Solve One), its style buttons, and the Assessment Builder
   all write `mathInput` / `mathMode` and land their output in the math view or
   the math sidebar. Nothing it does is STEM-wide.
2. **Its output does not live in the Lab.** Generated problems land in the math
   view; assessments push into `history` (Resources); fluency opens the sidebar
   `MathFluencyPanel`. Only the composing UI sits inside the STEAM Lab modal.
3. **It duplicates an existing surface.** The sidebar `MathPanel`
   (`view_sidebar_panels_source.jsx`, `expandedTools.includes('math')`) already
   has subject select, mode select, quantity, and a Generate button wired to
   `handleGenerateMath`.

Meanwhile Explore already IS the STEAM Lab: the default tab is `explore`
(`AlloFlowANTI.txt:11157`), the sidebar pill is "Open STEAM Lab Explore", and
catalog deep links land there.

## Why this migration is unusually cheap

The doors were audited and there are almost none:

- **No external code selects the Create tab.** Zero `setStemLabTab('create')`
  outside the modal's own tab button. Zero references in
  `allo_commands_source.jsx`, guided mode, or any e2e spec.
- **The only test pinning Create UI is ours**
  (`tests/math_fluency_probe_reachability.test.js`), written this week, easy to
  retarget.
- `stemLabTab` is unpersisted `useState`, so no saved state can resurrect the
  tab.
- The whole Create surface is **~485 lines** of `stem_lab_module.js`
  (4644-5129: plain create 4644-4765, Assessment Builder 4766-5128), reading
  host state that already exists and moves with it untouched:
  `stemLabCreateMode`, `showAssessmentBuilder`, `assessmentBlocks`
  (`AlloFlowANTI.txt:12830-12833`), plus the shared `mathInput` / `mathMode` /
  `mathQuantity` / `mathSubject`.

## Destination: a math-owned "Math Studio" modal (recommended)

Three options considered:

- **A. Fold into the sidebar `MathPanel`.** Rejected: the Assessment Builder is
  a multi-block composer and does not fit a sidebar column;
  `view_sidebar_panels_source.jsx` is also a four-lane hot file we should touch
  minimally.
- **B. New math-owned modal, `math_create_module.js`.** Recommended. The
  roomy-modal UX is the one thing the Lab genuinely gave Create; keep it, just
  change the owner. Plain JS, no source pair (matches `math_fluency_module.js`),
  registered as `window.AlloModules.MathCreate`.
- **C. Authoring strip inside the math view.** Rejected: the math view is the
  output surface; interleaving authoring UI there re-creates the confusion in
  the other direction.

Doors into the new modal:
- A "Create problems & assessments" button in the sidebar `MathPanel` (under
  the existing mode select).
- Palette commands `open_math_create` (and the already-requested
  `open_math_fluency`; see CROSS_LANE_REQUESTS to L7).
- Optional courtesy: a one-release "Create moved — open Math Studio" pointer
  where the Create tab was. Cheap, removable.

## Phases (one quiet-tree session; ~half a day of agent time)

Each phase ends verified; stop-points between phases are safe.

1. **Extract.** Copy lines 4644-5129 into new `math_create_module.js` as a
   `MathCreateModal` component; props = the same names it already destructures
   (the StemLab bag already carries everything it needs, including
   `handleGenerateMath`, `setExpandedTools`, `setHistory`, `callGemini`,
   `storageDB`, `gradeLevel`, `inputText`, `sourceTopic`). `node --check`; new
   modal gets its own dialog semantics (role, focus trap, Escape) — copy the
   shape from `view_student_save_adventure` or the Lab's own trap.
2. **Host wiring** (`AlloFlowANTI.txt`, under `fleet_lock`): `useState` for
   `showMathCreate`, lazy loader entry
   (`loadModule('MathCreate', 'https://alloflow-cdn.pages.dev/math_create_module.js?v=…')`),
   mount site with `CDNModuleGate`, prop bag (subset of the StemLab bag).
   **Deploy list:** add the new file to `PLUGIN_FILES` in the deploy script —
   the standing "new tool → PLUGIN_FILES" rule; a module missing there ships
   stale.
3. **Doors.** MathPanel button (`view_sidebar_panels_source.jsx`, hot file,
   short lock burst); palette command in `allo_commands_source.jsx` + run
   `node dev-tools/i18n/extract_cmd_keys.cjs` so the cmd-i18n gate stays green.
4. **Retire the tab.** Remove the Create tab button, both
   `stemLabTab === 'create'` branches, and the **Alt+2 shortcut** ("Switched to
   Create tab", `stem_lab_module.js:2834`) — remap Alt+2 or drop it; update the
   keyboard-help overlay text. Sync all three module copies (root =
   `stem_lab/`, `desktop/web-app/public/stem_lab/`, `desktop/web-app/public/`).
5. **Strings.** Modal title/desc keys in `ui_strings.js` (lock; root + public
   mirror; targeted hunks, never whole-file copy). The two tab-desc keys we
   just fixed: `stem.solver.generate_assess` retires with the tab;
   `stem.solver.manipulatives` becomes the single remaining (Explore) desc.
6. **Tests.** Retarget `math_fluency_probe_reachability` (Create-tab launcher →
   modal launcher); new `math_create_modal.test.js` pinning: modal registers,
   MathPanel door exists, no `stemLabTab === 'create'` branch remains, three
   stem_lab copies identical, modal a11y basics. Run
   `check_stem_render`, `check_module_render` (add a fixture for MathCreate —
   the render gate's value is real here), full `verify:gate`.

## Risks and their answers

| Risk | Answer |
|---|---|
| Concurrent sessions in `stem_lab/` and the two hot files | Do it in a quiet tree; `git status --short -- stem_lab/` before touching; lock bursts kept short; commit immediately (staged files get swept — it happened to this very workstream on 08-16) |
| New module never loads in prod | `PLUGIN_FILES` + the `loadModule` CDN pin + `check_module_render` fixture |
| Muscle memory / discoverability regression | The one-release pointer in the Lab; palette command; MathPanel button is one click from where output already lands |
| Alt+2 shortcut orphaned | Phase 4 explicitly owns it |
| XP/snapshot chrome | Stays with Explore untouched; Create never wrote XP |

## Enhancements for Create (ranked; independent of the migration)

Verified gaps first — each was confirmed in source, not assumed:

1. **Make "Generate Problems" actually generate.** Verified: the button's
   `onClick` (`stem_lab_module.js:4722-4732`) sets `mathMode` and
   `setActiveView('math')` and never calls `handleGenerateMath` — the user is
   dropped on the math view to find the sidebar's Generate themselves. The
   staging problem that likely caused this (freshly-set mode not yet in state)
   is already solved by the host API:
   `handleGenerateMath(inputOverride, switchView, modeOverride)`
   (`AlloFlowANTI.txt:28179`). Call it with the resolved mode. One-line-ish,
   highest value, zero migration dependency.
2. **Stop discarding the fluency block's configuration.** Verified: the
   Assessment Builder's fluency blocks carry `quantity` and `directive`, and
   the all-fluency branch opens the panel with **defaults** — no handoff
   exists (`initialConfig`/preset grep: zero hits in `math_fluency_module.js`).
   Needs a small panel API (accept an initial operation/quantity), then pass
   the block's settings through.
3. **"From My Content" should offer the lesson source.** Verified: the mode's
   placeholder says "Paste or describe content…" while `inputText` and
   `sourceTopic` are already in the prop bag. Prefill or one-click-attach the
   current lesson text instead of asking the teacher to re-paste it.
4. **Review-before-save for Assessment Builder output.** Generated problems
   push straight into `history` (`stem_lab_module.js:5030`). The quiz surface
   already has the "Review before sharing" preflight pattern; a lightweight
   review step (see problems, drop/regenerate a section) before the Resources
   push would match it.
5. **Block templates.** Save/load named Assessment Builder block sets via
   `storageDB` (in the bag). Teachers rebuild the same 3-section probe weekly;
   the Video Studio demo-template store is the in-repo precedent.
6. **Grade-aware defaults.** `gradeLevel` is in the bag and unused by Create's
   generation prompt staging; thread it so "From Topic" defaults to the class's
   grade instead of whatever the model guesses.
7. **Answer-key hygiene at generation time.** If any block type emits
   multiple-choice items, run the repo's position-bias tells on the generated
   set before saving (the answers-at-B epidemic is documented across banks);
   for numeric answers, store them in the shape the quiz's shared matcher
   normalizes.

Suggested order: 1 and 3 now (small, migration-independent); 2 with the
migration (it touches the same handoff seam); 4-7 after the move, in the new
module where they will live.

## Explicitly out of scope

- Splitting Explore into its own top-level surface: nothing to do — it already
  behaves as one; after this migration "STEAM Lab" and "Explore" become the
  same thing and the tab bar can eventually disappear entirely.
- The host's dead `mathFluency*` path deletion (separate small pass, already
  pinned as dead-pending-deletion by the reachability test).
