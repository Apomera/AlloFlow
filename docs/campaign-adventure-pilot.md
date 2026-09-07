# Field Journeys inside AlloFlow

Implemented locally September 6, 2026. Field Journeys is an optional **STEAM Lab tool** with Watershed Steward and Grove Journey campaigns. It renders inside AlloFlow's existing tool window and uses its normal Back button. Nothing is deployed.

## Try it in the app

From the repository root:

~~~powershell
node dev-tools/campaign-adventure-pilot/build-in-app.cjs
node build.js --mode=dev --shell-only
node dev-tools/campaign-adventure-pilot/preview-app.cjs
~~~

Open **http://127.0.0.1:3000/**, then **Learning Tools → STEAM Lab → Field Journeys (Pilot)** in Ecology & Environment.

This preview compiles the real desktop/web-app/src/index.js React entry and current App.jsx. It serves the actual public app modules on loopback, using the existing compiled AlloFlow Tailwind stylesheet plus current base styles. It does not use an iframe or a substitute app shell. The new pilot carries its own scoped stylesheet.

- Watershed: select a reach, apply fieldwork, observe the year, and review the recorded consequences before continuing. Ten years.
- Grove: inspect habitat patches and choose a yearly priority. Eight years or extinction. Small trees show descendants.
- Save a field note, use **All tools**, reopen the pilot, and resume your journey.
- **Replay the latest year** creates another saved branch in the same seeded world. The earlier journey remains.
- Download the journal to keep decisions, notes and evidence. Importing a journal creates a new run.
- Sound starts off on each mount. Read aloud uses browser speech. Leaving the tool stops its sound and narration.

The original isolated page remains in dev-tools/campaign-adventure-pilot/. Its server at port 4387 enforces the historical preservation baseline before starting; the concurrent changes described below currently trip that guard. It is no longer the recommended review surface.

## Integration and reuse

| Area | How the pilot uses it |
| --- | --- |
| AlloFlow host | New catalog tile, plugin fallback, lazy-load manifest entry and explicit Tree Life Lab dependency. Source and public mirrors agree. |
| Native renderer | One mountable renderer for standalone and in-app use. Each React mount owns its state and scoped DOM; cleanup removes document listeners, cancels pending narration and closes its audio context. |
| Adventure sound | Calls the original adventure_module.js playGenerativeSoundscape utility, loaded on demand. No Adventure preference setter is called. |
| Tree Life Lab | Calls the existing __alloTreeLabEngine methods, including groveStart, groveAdvance, groveEvent and groveSummary. |
| Watershed Steward | build.cjs copies 23 exact original declarations. A private wrapper replaces UI callbacks with isolated state updates. |
| Shared journey interface | Scene presentation, valid decisions, help, landscape inspection, evidence, field notes, save validation, replay and optional text-only narration. |

The generated native plugin lives at stem_lab/stem_tool_fieldjourneys.js and its desktop public mirror. Rebuild it with build-in-app.cjs; --check verifies both outputs. The shell-only build option regenerates app sources without copying unrelated module assets.

This work does not edit or replace the original Adventure, Watershed or Tree Life Lab engines. It does not migrate their saves, join classroom sessions, award app XP, or connect an AI provider. The pilot is English only. Scenes are authored from simulation results. Reusing Adventure's full AI turn engine, translations, voting and broadcasts remains a later decision.

## Save and narration boundaries

- Only alloflow-campaign-pilot:v1:<campaign>:<run> storage keys are written.
- Resume validates a bounded, versioned decision log against its campaign and reconstructs the model. Corrupt records and conflicting saves remain recoverable rather than being silently replaced.
- Storage failures keep the current run playable in memory and show a journal-download recovery message.
- Optional narration receives detached scene text and recorded evidence. It cannot change actions, metrics or saves. Errors, malformed replies, timeouts and stale replies leave authored scenes playable.
- No existing journey needs to be deleted to start or replay another one.

## Verification

~~~powershell
node dev-tools/check_stem_reachability.cjs
node dev-tools/campaign-adventure-pilot/build-in-app.cjs --check
node node_modules/vitest/vitest.mjs run tests/campaign_adventure_pilot.test.js --maxWorkers=1 --testTimeout=60000
node dev-tools/campaign-adventure-pilot/verify-in-app.cjs
node dev-tools/campaign-adventure-pilot/verify-browser.cjs --behavior-only
~~~

The in-app browser runner requires the local app at port 3000. It navigates through actual AlloFlow controls, checks Watershed fieldwork and notes, close/reopen/resume, Grove decisions, reload persistence, save sentinels, keyboard navigation and phone layout. Automated axe scans cover the desktop and phone pilot views. The report and screenshots are under evidence/in-app-*.

The standalone browser runner completes both campaigns, checks branching and export, narrator errors/malformed/stale responses, text-only output, storage failures and mobile accessibility. --behavior-only explicitly reports historical baseline drift while continuing behavioral checks. Its default still fails closed when the historical baseline differs.

Latest in-app result: **passed**, with no boot or pilot browser exceptions and no axe findings in the tested desktop/phone views. All 25 protected source/build files remained byte-identical across the in-app verification run. The reachability gate passes across all three host and loader mirrors.

## Historical baseline and concurrent work

preservation.json is the immutable 25-file SHA-256 baseline captured before the original isolated pilot. It has not been replaced or weakened.

The first standalone proof passed 13/13 unit checks with all 25 original files unchanged. During this in-app follow-up, another task recorded in AGENT_HANDOFF.md as **Adventure / Persona learning feedback** changed these six baseline files:

- adventure_session_handlers_source.jsx
- adventure_session_handlers_module.js
- desktop/web-app/public/adventure_session_handlers_module.js
- view_adventure_source.jsx
- view_adventure_module.js
- desktop/web-app/public/view_adventure_module.js

Those changes were preserved. Accordingly, the current pilot unit result is **12 passed, 1 failed**: the historical preservation assertion correctly reports the six differences. The exact-source watershed bridge still matches; the simulation/save/narration checks pass. Browser reports distinguish that historical drift from byte stability during their own run.

The earlier combined Adventure/STEM run also had a pre-existing lesson-scope textual-count failure: tests/adventure_lesson_scope.test.js expected three occurrences, while both HEAD and the then-current source had two.

Passing these technical checks does not establish classroom usefulness or validate the educational models as real-world forecasts. It does not trigger consolidation or removal of any existing feature.

## Commit and deployment

No deployment or push is authorized. The earlier scoped commit was blocked by pre-existing games_source.jsx versus desktop/web-app/src/games_source.jsx drift in the repository hook. Hooks are not bypassed; unrelated work is not reset.
