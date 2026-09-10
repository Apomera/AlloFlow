# Connected escape rooms: implementation and verification

Implemented in the workspace on September 8, 2026. This is the production application implementation; the earlier standalone concept remains a separate exploration artifact.

## Open the new mode

1. Open a Quiz resource while hosting a live session.
2. Choose **Connected escape room** beside the existing escape-room and Concept Quest controls.
3. Check the lesson excerpt and room language. Optionally choose a setting, learner level, and investigation structure.
4. Generate the room, review its clues and solutions, edit player instructions if needed, and use **Try the room** to play the actual puzzle mechanics privately.
5. Choose **Launch for everyone**. Students in the live session enter one shared party; later arrivals receive its existing discoveries.

The classic escape-room mode and Concept Quest remain available. Conflicting quiz launches are disabled while the connected room is active.

## What the implementation does

The app's configured `callGemini` provider generates a versioned JSON room from lesson text, falling back to the current quiz's content. Each generation includes a fresh variation seed, language, level, theme preference, and branch structure. There is no fixed room substituted when AI generation fails.

A validated room has seven to twelve objects across one to four areas, at least two independent starting discoveries, a functional tool interaction, two or more reasoning devices, and a final exit that combines their products. Every object must contribute to the exit. The engine rejects invalid dependencies, cycles, unreachable objects, duplicate identifiers, malformed controls, out-of-bounds maps, and reasoning quotations absent from the lesson excerpt. It makes at most one repair request for invalid model output. Teacher review remains necessary for factual quality and clue clarity; structural validation cannot establish either by itself.

Supported interactions are collecting evidence, using inventory tools, configuring devices, ordering artifacts, navigating coordinate maps when appropriate to the lesson, and combining discoveries at the final door. The source is treated as reference data and model output never executes as JavaScript.

Players can investigate different branches simultaneously. Discoveries, inventory, clues, hints, progress, and the final debrief are shared. Each student submits one bounded action request in their own session slot. The teacher's open app validates it automatically and publishes a confirmation and individual progress fields. Players see a discovery as confirmed only after that acknowledgement arrives.

Teacher controls include pause/resume, shared graduated hints, targeted rescue unlocks with a recorded reason, restart, and end. The host processor also mounts in the application shell, so leaving the Quiz view does not stop it. The teacher's application must remain open and connected. Pending actions persist across student reloads and can be retried without creating another request. New attempts isolate writes arriving after a restart.

Consumed confirmations are removed once a student has sent a newer action; every currently queued request keeps its confirmation. This bounds history without replacing shared progress. Generated rooms are capped at 28,000 characters, and launch checks the session size with space reserved for participant actions and confirmations. Rooms are saved in the current browser for reuse.

The interface supports small screens, keyboard-operated sequence and map controls, visible focus, descriptive labels, shared status announcements, light/dark themes, and teacher preview focus management. New interface strings use the existing translation mechanism with English fallbacks; generated room prose follows the selected lesson language.

## Verification

- **79 new automated checks** across engine, Mailbox permissions, and React runtime integration. Includes a 1,000-action simulation retaining only the current confirmations for 30 students, duplicate host mounts, teacher write retries, stale asynchronous results, launch conflicts, source/language props through the real Quiz resource, and mirrored build artifacts.
- **241 regression checks** across classic escape-room behavior, mixed question formats, live quiz controls, Concept Quest, and the real Mailbox client/server adapter. An initial unrelated translation-file timing timeout passed on the complete rerun.
- **31 new Firestore emulator checks**, plus the existing Firestore security suite. Valid host and participant writes succeed; forged progress, another student's slot, malformed payloads, paused actions, and old-attempt requests are rejected.
- **Four independent browser contexts** using the production AlloFlow Mailbox adapter and actual Apps Script handlers with local substitutes for Google services. Verified generation/repair, preview, launch failure/retry, simultaneous discoveries, tool use, wrong-answer draft retention, pause/resume, shared hints, retry identity, reload with a pending action, teacher reconnection, late join, sequence solving, shared completion, restart, rescue, and end.
- Browser checks cover 1280, 390, and 320 pixel widths, light/dark views, horizontal overflow, and automated WCAG A/AA checks. Exact browser results and screenshots are in `docs/connected-escape-room/`.
- Component prop checks found no missing references across 66 views. The module registry verified all 190 consumers. The three application entry copies and edited component sources parsed successfully.

The AI response in automated browser tests is a deterministic fixture fed through the production generation flow. No paid provider call, public deployment, or real classroom-network test was performed. The shipped implementation calls the configured provider; production AI quality and network behavior still need a classroom pilot after deployment.

## Main files and repeatable checks

- `connected_escape_room_engine.js`: validated room schema, generation prompt, repair, interactions, confirmations, and session creation.
- `connected_escape_room_source.jsx`: teacher authoring/review, shared student interface, and host processing.
- `_build_connected_escape_room_module.js`: builds the root and desktop public modules.
- `view_quiz_source.jsx`, `teacher_source.jsx`, and the three application entry copies: production launch and live-session integration.
- `firestore.rules` and `apps_script/session_mailbox/Code.gs`, with desktop mirrors: participant write restrictions.

Run from the repository root:

```text
node _build_connected_escape_room_module.js
node _build_view_quiz_module.js
node _build_teacher_module.js
node node_modules/vitest/vitest.mjs run tests/connected_escape_room_engine.test.js tests/connected_escape_room_runtime.test.js tests/connected_escape_mailbox.test.js --maxWorkers=1
node dev-tools/check_connected_escape_live.cjs
```

Run the permission suites from `desktop/web-app`:

```text
firebase emulators:exec --only firestore --project demo-alloflow --config firebase.live-sessions.json "node ../../tests/run_connected_escape_rules.cjs"
```

## Deployment boundary and current scope

Changes are local and ready for the normal review/release process. A release must include the new connected-room module, rebuilt Quiz and teacher modules, application loader references, interface strings, and matching Firestore rules. Class Mailbox installations also need the updated Apps Script source and embedded installer module. Cache revisions were updated for the affected application assets.

This first implementation uses one shared class party with no countdown. It does not yet provide multiple racing parties, secret role-specific clues, a 3D room, or cross-device storage of authored rooms. As with the existing shared session design, the room specification is readable by participants; this is a collaborative learning activity, not a hidden-answer assessment system.
