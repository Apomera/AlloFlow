# Life Skills Practice Mode: first playable

## What is implemented

Open **Life Skills → Start Here → Open Practice Mode**. The companion window can also run directly at `/life_skills_outing/life_skills_outing.html` with the prepared story.

The mission is **Get ready for an outing**. Learners prepare clothing, fill and pack water, remember an outing card, respond to a changed forecast, compare travel times, and leave prepared. A compact 3D home changes with those decisions. The action buttons and room actions use the same simulation rules.

- Community and work contexts, chosen explicitly.
- Guided, on-request, and independent coaching presets.
- Plain and standard reading styles, separate from coaching and context.
- A clock advanced by actions; reading, support, and time spent considering choices are untimed.
- Two clothing preparation options, two feasible travel options, a late bus option that can be corrected, and interchangeable weather items.
- Rain and warm-weather replays, each saved as a new practice.
- A factual debrief with the selected coaching preset and requested clues recorded alongside observations. No mastery score is assigned.
- Keyboard controls, focus recovery after choices, live announcements, a hidden-3D option, responsive room framing, and a complete structured interface when 3D is unavailable.

This is a fixed-camera home mission. Free-roaming avatars, autonomous households, jobs, a city, and multiplayer remain later work.

## Generative elements

The optional introduction and three short conversations with Sam use the host's existing `ctx.callGemini` provider abstraction. The wrapper requests JSON mode and passes cancellation through the existing provider interface; it does not add credentials or choose a different provider.

The provider receives the fictional outing facts, context, reading style, and one of three intents: planning, changing a plan, or encouragement. The bridge does not send reflections, personal profiles, or unrelated app content.

Generation returns plain text only. It cannot change inventory, time, actions, rewards, completion, or evidence. The authored mission facts remain visible separately. Prompts constrain the wording; structural validation does not prove every generated sentence is factually correct. This remains a content-evaluation task before a broad learner rollout.

The bridge validates the exact companion window, origin, a random launch token, request ID, run ID, and revision. It limits each run to one introduction and three dialogue generation attempts per host session. It limits output to 700 characters and has a 15-second deadline, cancellation, and fallback. Late replies are discarded if the learner acts, changes practice, or requests another story. A provider that ignores cancellation cannot overlap another provider operation in the same bridge.

Accepted prose is saved with its original revision and reused. Ordinary simulation actions make no model calls. Standalone launch, unavailable generation, malformed responses, and timeouts preserve the prepared experience.

## Relationship to existing infrastructure

This slice reuses the app's provider abstraction and local A-Frame runtime. Its command journal follows the deterministic adapter approach explored in Field Journeys. It uses the Notice / Connect / Try cue format already explored for Adventure learning support.

It does not run household decisions through Adventure's model-written resource updates, energy system, shop, or single adventure autosave. Those interfaces remain potential integration points after learner testing. Shared avatar art, audio, educator reporting, and richer cast continuity are not connected in this slice.

## Files and responsibilities

| File | Responsibility |
|---|---|
| [engine.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/engine.js) | Authored rules, action validation, immutable journal, replay, observations, saved prose, conflict-preserving storage |
| [ai.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/ai.js) | Authenticated provider transport, output checks, quotas, cancellation, prepared fallback |
| [outing.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/outing.js) | Structured controls, 3D objects, station selection, focus, saving, story ownership |
| [outing.css](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/outing.css) | Responsive layout, visible focus, reduced-motion and forced-color handling |
| [life_skills_outing.html](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/life_skills_outing/life_skills_outing.html) | Accessible document structure and local runtime dependencies |
| [stem_tool_lifeskills.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_lifeskills.js) | Overview launch card and host provider bridge |
| [build.js](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/build.js) | Includes the new companion folder in normal asset copying |

The five companion assets and Life Skills tool have matching copies under `desktop/web-app/public`.

## Persistence and limits

Each run has its own versioned key under `alloflow-life-outing:v1:`. A save stores the mission version, fixed configuration, command journal, and accepted story text. Loading validates the journal and replays the rules. Conflicting or corrupt existing saves are preserved. When saving is unavailable, play continues and a JSON download is offered. The September 29 review update adds a visible backup-opening flow, described in [the decision-review update](life-skills-practice-mode-review-update-2026-09-29.md).

These are browser-local practice saves, not learner-account records or classroom reporting. Optional reflections are stored locally under a separate per-run key. Downloads now include the reflection and any decision comparison; opening a backup makes a new copy. Reflections are not sent to generation.

The prototype is in English. Reading-style differences are deliberately modest in this first mission. It has no integrated text-to-speech or AAC symbol vocabulary yet. Simulated completion is not evidence of real-world independence; the debrief says what happened in the practice.

## Verification

Final result: **62 tests passed across seven focused files**, using Vitest with `--maxWorkers=1 --pool=threads`. An earlier fork-worker run timed out starting two workers; the complete thread-worker rerun passed. JavaScript syntax checks and all six source/public file comparisons passed.

Chromium checks at 1280px and an emulated 390px phone viewport showed no horizontal overflow. The phone page's axe scan reported no automated WCAG 2 A/AA or WCAG 2.1 AA violations. Its remaining contrast review items were decorative glyphs and the caption over the canvas; the rendered page was also inspected visually. This is not a full assistive-technology or accessibility certification.

Focused Vitest coverage checks:

- Both contexts and forecasts, alternative clothing and travel, preparation order, recoverable wrong choices, and departure prerequisites.
- Deterministic replay, stale/duplicate actions, immutable configuration, saved-content ownership, corrupted saves, and save conflicts.
- Exact bridge origin/window/token checks, malformed replies, provider failure, quotas, cancellation, timeout, and stale replies.
- Popup launch, unavailable story services, JSON/cancellation provider parameters, and bridge cleanup.
- Real DOM and scene-action handlers producing the same state; focus recovery, save/resume, alternate-forecast replay, context/coaching separation, stale story rejection, and storage/3D fallback.

Manual Chromium checks cover actual WebGL rendering and raycaster input, keyboard departure, recovery from an unsuitable weather item and late bus, prepared story, changed-forecast replay, and responsive layout. The automated DOM tests stub rendering only; they do not claim to test a GPU or assistive technology.

Live external generation has not been invoked during development. Provider transport is tested with controlled responses. Educational effectiveness, sustained engagement, low-end device performance, and use with a representative range of learners still need a pilot.

## Next product decision

Pilot this short mission before adding more environments. Observe whether learners understand why their plan succeeds, can recover from a change, and can explain what they would check outside the simulation. Use those findings to choose the next mission and decide whether avatar movement, recurring characters, document practice, or richer household state would add the most educational value.
