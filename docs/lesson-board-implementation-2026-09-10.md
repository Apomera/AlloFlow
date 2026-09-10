# Generative lesson board — first implementation

Implemented locally on September 10, 2026. No production deployment or commit was performed.

## What learners and teachers can do

Quiz mode now offers **Lesson board game**, alongside the existing activity types. The teacher or independent learner can generate a board from lesson text, or from the quiz when lesson text is unavailable, review its activities, try a practice preview, save up to four boards per lesson/language, play solo, or launch a cooperative class board.

Each generated board contains 8–12 connected locations, 2–4 lesson concepts, two named resource types, and three construction projects. Successful activities open adjacent locations and award resources. Players choose which route to explore and which projects to build. Shortcut projects open a distant location; resource projects improve subsequent rewards. Completing every concept and constructing at least two projects finishes the board. Incorrect responses cost no resources and the location remains available to retry.

Choice, ordering, and settings activities are supported. The model generates the lesson setting, location descriptions, activities, explanations, hints, resource names, connections, and projects within a validated schema. Native SVG icons and theme treatments provide the board visuals. This version does not generate raster illustrations or arbitrary game mechanics. The generation prompt includes a variation seed and asks for meaningful changes to routes and project choices; actual educational quality still needs teacher review.

Solo uses the same engine, with progress and unfinished responses saved in the current tab. Starting solo play saves the generated board in the lesson library so it can be reopened after refresh. A full or unavailable library is reported before starting; preview remains available. Corrupted saves are preserved until an explicit restart.

## Live sessions

The first version shares one cooperative board with the whole class. Learners propose the next move, and the teacher chooses the location or construction. At an activity, everyone may submit independently. The teacher resolves the response window and advances after discussion. At least half of the submitted eligible responses must be correct for shared success; absent learners are not marked incorrect. Individual response feedback is separate from shared construction progress.

Actions use participant-owned request slots and attempt/turn identifiers. The teacher confirms and grades them; students cannot publish world progress or results. Retries retain the same request ID, pending actions and drafts survive tab reloads, and old attempts cannot affect a restarted board. Duplicate host components in one browser are coordinated. Pause, resume, late joining, confirmed restart/end, and early resolution are supported. The teacher must remain connected; use one controlling teacher browser. Multiple independent teacher tabs do not have a cross-browser transaction lock.

The existing shared session document carries board specifications, answer keys, and response data. This is formative cooperative play, not a secure examination or server-private assessment system. There is no elimination, countdown, or speed-based scoring.

## Accessibility and UI

All gameplay uses native buttons and form controls, including keyboard-operable up/down ordering. A location-list alternative, visible focus, jump/return controls, live status messages, optional hints, evidence text, confirmation focus restoration, responsive layouts, dark mode, and forced-color treatments are included. Looking at another location during an activity preserves the active response.

Automated accessibility results do not establish full WCAG conformance. Manual screen-reader testing and classroom usability testing remain outstanding.

## Verification

- **107 passing board tests** covering validation, bounded AI repair, affordability of every project pair, route reachability, shortcut/yield effects, retries, duplicate requests/hosts, solo recovery, malformed data, StrictMode, rapid activation, launch guards, and existing quiz/teacher/student dispatch.
- **Four independent browser contexts** completed a cooperative game using the production Class Mailbox adapter and real Apps Script handlers with local Google-service substitutes. The run made 32 writes and finished with an approximately 8.9 KB session document. It also exercised solo play without live writes, reloads, simultaneous proposals, different individual answers, late joining, delayed/failed sends, keyboard ordering, pause/resume, shortcut construction, restart isolation, and ending the activity.
- **12 axe configurations passed**, including setup, teacher activity, late join, completion, widths of 320/390/768/1280 pixels, dark mode, 200% text, increased text spacing, and forced colors. Overflow checks passed. Desktop and mobile screenshots were inspected.
- Firestore emulator: existing general security behavior passed, **31 connected escape-room permission checks passed**, and **34 lesson-board permission checks passed**. Denied-request diagnostic logs include evaluation-budget messages; authorized board operations passed. Both rule copies match.
- Eight application/module sources parsed successfully; production modules, strings, and server-source mirrors match. Module revisions and Mailbox source integrity metadata were refreshed.
- Broader regression selection: **307 passed, one failed**. The failure is the existing Word Cloud source-text assertion at `tests/class_mailbox.test.js:744`, which expects an effect dependency list without `scopeToken`. The unchanged `shared_activity_source.jsx` includes that dependency. It is recorded separately in `lesson-board-implementation/regression-summary.json`.

The browser generation provider returned fixture JSON, including an invalid first response followed by a repair. No paid model request, real classroom, production Firebase project, or deployed Apps Script endpoint was used for these checks.

## Release requirements and limits

Deploy the updated client modules and source surfaces together. Firestore users need the updated `firestore.rules`; Class Mailbox users need **Apps Script version 21 or later**. The setup banner and board launch guard identify outdated Mailbox deployments. Solo play does not require these live transport updates.

Runs are bounded to 48 moves and host writes are guarded at 76,000 serialized characters. There is one shared class board in this version, rather than separate simultaneous team boards. Persistence remains subject to the existing live-session transport lifetime and browser storage availability.

Build and refresh commands:

```text
node _build_lesson_board_module.js
node _build_first_wave_view_modules.js ShareSessionSurfaces
node dev-tools/refresh_lesson_board_integrations.cjs
node dev-tools/check_lesson_board_live.cjs
firebase emulators:exec --only firestore --project demo-alloflow-board --config firebase.lesson-board-test.json "node tests/run_lesson_board_rules.cjs"
```

Evidence is stored under `docs/lesson-board-implementation/`: board test results, regression summary, Firestore log, browser verification JSON, and reviewed screenshots.
