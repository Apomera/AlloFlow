# Geometry World worksheets and concept snapshots

Completed September 19, 2026. Implemented in the local working tree and matching desktop public assets; not deployed.

## Use

Open a Geometry World lesson, then choose Menu:
- Worksheet: opens the current lesson's blank student worksheet. Choose Print / save PDF in the preview.
- Teacher key: a separate copy containing authored answers, teaching dialogue, hints, and solution-bearing success criteria.
- Concept snapshots: capture the current 3D view, add a caption, and enter calculations or reasoning. Download an image or printable snapshot record.
- Learning record: combines the worksheet with that lesson's saved snapshots and notes.

Structured activity guides also expose Worksheet, Learning record, and Concept snapshots. Printouts leave room for drawings, calculations with units, explanations, checks, and revisions.

## Lesson parity

The same question traversal now serves live question dialogs and printed exports. Exports derive tasks, questions, choices, follow-ups, and reflections from the actual active lesson. All 12 premade lessons and generated/imported fixtures were checked. Title-based Garden worksheet content and universal prism-formula blanks were removed.

Teacher keys preserve array-valued success criteria. Because some authored criteria contain numeric solutions, they appear only in teacher output. Student exports omit worked mentor dialogue and solution metadata beside quiz questions. Open exploration dialogue remains part of the exploration task.

Printing reproduces accepted lesson content; it does not independently certify AI-generated mathematical answers. Review generated lessons before classroom use. Worksheets are companions to the world: prompts identify guides/model references and ask students to sketch their observations.

## Snapshots

Actual 3D camera images include visible scene measurement lines and layers, but not screen controls, question panels, or toolbar text. Students can label dimensions and units in captions and reasoning, or write by hand after printing. Captures do not alter blocks, scores, or build history.

Up to six moments are stored per lesson, with a bounded total local image budget. Lesson identity includes the relevant model and question content; switching lessons keeps evidence separate, and an in-flight capture is discarded if the lesson changes.

## Verification

- Worksheet parity/generation suites: 48 tests passed across four files.
- Snapshot/journal/showcase/activity-guide suites: 72 tests passed across four files; the later menu-transition regression passed in the 16-test snapshot/activity-guide rerun.
- Additional preset mathematics, lesson overview/tracking, scoring, reports, generation-collision and layout suites: 122 tests passed across nine files.
- Legacy block-fidelity and NPC-speech suites: 51 tests passed.
- Real-browser checks: every question in all 12 preset exports, a generated fixture, native print previews, blank/key/record separation, image and HTML downloads, snapshot restoration/deletion, and mobile width.
- Final actual Menu workflow: 7 checks passed, zero page errors. Desktop opens snapshot capture and the correct worksheet preview; mobile opens an unobstructed snapshot dialog.
- Representative printed PDF pages were rendered and visually checked: two-question sheets, activity pages, overview/reflection pages, and the snapshot learning record.
- Source and desktop public mirrors are byte-identical. Scoped git diff --check passes.

The earlier menu test failure used the visible label instead of the button's accessible name. The corrected test uses Open printable student worksheet and awaits click + popup together; the final passing evidence is menu-browser-results.json.

## Reproduce

Run the QA harness with Node and Playwright:
- node dev-tools/geometry_world_worksheet_snapshot_qa.cjs
- node dev-tools/geometry_world_worksheet_snapshot_qa.cjs --menu-only

The harness serves local source with fictional data, blocks external services, and uses headless Chrome with software WebGL. It does not print physically or contact a school deployment.

Evidence: browser-results.json, menu-browser-results.json, concept-snapshot-desktop.png, concept-snapshot-mobile.png, concept-snapshot-menu-mobile.png, and print-qa/.
