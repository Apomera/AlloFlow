# Raptor Lab: visual design and deeper engagement

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.

This pass connects existing activities through three investigations. It changes the hub, adds a field notebook that travels with the learner, and preserves free browsing and the flight simulator.

## Review findings and changes

| Finding | Change |
| --- | --- |
| The hub presents 99 activities and mostly tracks which pages were opened. | Three question-led investigations offer a manageable starting choice: dive physics, hunting in darkness, and conservation recovery. Browsing counts remain separate from evidence and reflection. |
| Many activities can be explored without leaving a record of the learner's thinking. | A notebook captures a prediction, observations with their source station, an explanation, and a next question. Each investigation has its own record. |
| Calculator outputs change immediately, making a previous trial hard to compare. | Stoop observations capture immutable mass, drag coefficient, frontal area, and terminal-speed readings. A comparison shows the last two readings, percentage change, and whether multiple variables changed. These are model results, not measured animal performance. |
| Generic next/previous navigation does not explain what to investigate. | Each investigation links to three relevant stations with specific prompts. A sticky navigation shortcut returns to the notebook. |
| Visitation and completion can look like learning assessment. | Reflection is explicitly self-reviewed. Reviewing requires a prediction, two observations, an explanation, and a next question; it does not claim to grade reasoning or establish mastery. Editing the record invalidates the previous review. |
| The hub is visually dominated by panels of text and statistics. | Original responsive SVG illustrations establish a habitat and distinguish the investigation cards. Reading sizes, spacing, restrained colors, and touch targets carry through to the notebook. |
| A learner needs a portable record. | A plain-text download includes the current investigation, prediction, saved evidence and model values, any observation draft, explanation, next question, and review status. |

The engagement rationale draws on [CAST UDL Guidelines 3.0](https://udlguidelines.cast.org/) and its [choice and autonomy guidance](https://udlguidelines.cast.org/engagement/interests-identities/choice-autonomy/): offer choices connected to a purpose, support investigation, and make reflection possible. This implementation has not undergone a classroom engagement study.

## State and accessibility

- Records use the existing host's `toolData.raptorHunt.investigations` state. Navigation, changing investigations, setting a notebook aside, and a host remount with saved state preserve records. There is no new storage service or network request. The UI accurately says notes remain with the current lab session and offers a download for keeping them.
- Each notebook holds up to 12 observations. Saving requires a prediction and a nonblank observation. Source names are captured at save time. A visit alone never becomes evidence.
- The notebook can close to a compact cue while learners investigate. The shortcut, station transitions, and deletion/set-aside flows manage keyboard focus. Textareas have associated labels and hints. Saved and removed observations are announced.
- Container queries handle a narrow embedded panel independently of viewport width. Forced-colors controls remain distinguishable. No new animation is introduced.

## Verification

- **17/17 browser checks passed** across investigation workflows, existing discovery/navigation, and existing WebGL flight continuity. The initial desktop hero exceeded an existing 450px height contract by 2.8px; the illustration height was reduced and the complete suite passed afterward.
- Seven investigation checks cover immutable readings, a controlled one-variable comparison, multiple-variable feedback, reflection requirements, review invalidation, downloads, independent records, session restoration, keyboard focus, 1280/768/390px layouts, a 420px embedded panel, forced colors, and reduced motion.
- Axe reported **zero WCAG A/AA violations in the new investigation chooser and expanded notebook** for its configured WCAG 2.0/2.1/2.2 rules. This is scoped automated coverage, not certification of all 99 activities.
- The focused existing unit run produced **158 passed / 25 failed**. A read-only `HEAD` source substitution reproduced all 25 failing test names, plus eight additional render timeouts under concurrent load. Failures largely assert older flight implementation literals; locale-coverage gates were already failing. The existing jsdom observer teardown also logs `window is not defined`. Compact reports retain the evidence without duplicating the multi-megabyte source in every failure.
- **7/7 final investigation checks passed** after the keyboard shortcut, collection focus, and export refinements. Syntax and whitespace checks passed, and the canonical/desktop files are byte-identical (SHA-256 `9622ee26e7ab52a1c136a325b31a21001357f64fef5e41a20e11080041178fe1`).

Reproduce the browser checks with isolated output:

```powershell
npx playwright test tests/e2e/raptor-investigations.spec.ts tests/e2e/raptor-lab-navigation.spec.ts tests/e2e/raptor-flight-continuity.spec.ts --workers=1 --retries=0 --reporter=line --output=reports/raptor-engagement-2026-09-26/browser-results
```

## Ownership and integration

- Source: `stem_lab/stem_tool_raptorhunt.js`.
- Exact generated/distribution mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`.
- New browser coverage: `tests/e2e/raptor-investigations.spec.ts`.
- All new review artifacts use `reports/raptor-engagement-2026-09-26/`. No shared harness, host, catalog, manifest, or handoff document was edited. No broad build is needed for these directly loaded tool files.
- **Locale integration remains:** the 88 new strings use discoverable literal translation keys and English fallbacks. `translation-keys.json` inventories them for the shared language-pack owner. Shared language packs and `ui_strings.js` were not rewritten. The final targeted localization check retains two passing checks and two failing coverage gates. The already failing ordinary-copy coverage gate has additional missing translations; the baseline comparison is not a claim of unchanged translation coverage.
- No deployment, push, or commit was performed. The review covers shared discovery and the new inquiry journey, with flight continuity regression-tested; it is not an individual content or scientific-accuracy audit of every activity.

## Visual captures

- `preview-1280.png`, `preview-768.png`, `preview-390.png`: first viewport.
- `hub-1280.png`, `hub-768.png`, `hub-390.png`: complete hub.
- `journal-1280.png`, `journal-768.png`, `journal-390.png`: the notebook at each width.
- `notebook-desktop.png`: completed evidence/reflection workflow.
