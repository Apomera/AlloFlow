# Collaborative escape-room refinements — September 9, 2026

This pass makes it easier to follow evidence, coordinate a class investigation, and recover unfinished work. Changes are implemented locally and have not been deployed.

## Student experience

- **Clues beside the device.** An object displays the relevant tools and evidence already collected by the team. Undiscovered evidence stays hidden. The complete team journal remains available below or beside the interaction.
- **Direct clue navigation.** A locked object links to the objects that can supply its missing discoveries. Following a link selects the correct area and moves keyboard focus to the object's heading. Existing device settings stay intact.
- **Unfinished work survives reloads.** Device settings, tool selection, artifact order, map position, and selected object are saved in the current browser tab. Stored data is validated before use and isolated by participant, session, and room attempt. Recovery never submits an answer automatically. If browser storage fails, the room explains that recovery is unavailable and keeps the current interaction usable.
- **Reachable starting point.** New room views start with an available starting object even when the generated JSON lists a locked door first.

## Team and teacher experience

The expandable **Team activity** board groups each participant's latest submitted action by object. It distinguishes completed discoveries, actions awaiting confirmation, attempts that need another try, and shared hint levels. Students can open an object from the board to coordinate their next investigation. Teachers also see the corresponding names from their existing roster; student boards show aggregate participation and identify only the student's own involvement.

The board describes submitted actions, not online presence or exclusive ownership. Navigating it does not write shared state. Activity is bounded by the existing per-participant action slots and uses the existing session permissions.

An optional shared focus-assignment design was considered. Automatic approval review rejected adding its participant write permissions, so that design was replaced by the read-only activity board. This refinement pass applies no new Firestore or Mailbox authorization rules.

## Verification

- **100 focused automated checks passed** across four suites, including 21 new refinement checks.
- Tested malformed saved workspaces, invalid device values, duplicate artifact order entries, out-of-range coordinates, participant/attempt separation, stale activity, receipt ownership, missing-clue navigation, focus behavior, storage failures, and teacher/student information differences.
- The **four-browser collaboration check passed** using the production Mailbox client adapter and real Apps Script handlers with local Google-service substitutes. It now verifies unsent device-setting recovery, reordered-artifact recovery, relevant clue visibility, read-only teammate navigation, and teacher retry feedback alongside the complete generation-to-escape flow.
- Automated WCAG A/AA checks found no violations in the tested generator, teacher, and student views. The tested desktop and mobile widths were 1280, 390, and 320 pixels, with light and dark views and no horizontal overflow.
- The AI provider response in browser tests is a deterministic fixture; this pass does not claim validation against a paid provider or a real classroom network.

Exact browser results: [verification.json](connected-escape-room-refinements/verification.json).

Screenshots: [Student evidence and device controls](connected-escape-room-refinements/student-evidence-mobile.png) · [Teacher team activity](connected-escape-room-refinements/teacher-team-activity.png).

## Files and checks

The refinement is contained in `connected_escape_room_engine.js`, `connected_escape_room_source.jsx`, and the new `connected_escape_room_collaboration.jsx`, with rebuilt root/public modules, new interface strings, and an updated loader cache revision in all three application entry copies.

```text
node _build_connected_escape_room_module.js
node node_modules/vitest/vitest.mjs run tests/connected_escape_room_refinements.test.js tests/connected_escape_room_runtime.test.js tests/connected_escape_room_engine.test.js tests/connected_escape_mailbox.test.js --maxWorkers=1
node dev-tools/check_connected_escape_live.cjs
```

The browser checker now writes its results to `docs/connected-escape-room-refinements/`, preserving the original implementation's verification artifacts. The earlier implementation and its deployment requirements remain documented in `docs/connected-escape-room-implementation-2026-09-08.md`.
