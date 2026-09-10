# Printing Press workshop: visuals, usability, and learning flow

The press activity now uses a responsive workshop layout. The simulation and apprentice guide sit side by side on large screens, and stack on phones. A single prominent action sits immediately above the press, so students can operate it while watching the drawing. Supporting controls have lower visual emphasis. The four-step progress strip, diagram, and screen-reader announcements use the same sequence: ink, paper, pull, reveal.

The guide gives a short observation prompt for each stage and an optional hint. A larger type-versus-paper comparison makes reversal readable outside the small SVG. Paper output appears only after an impression is revealed. Notebook proofs remain within a bounded, keyboard-accessible gallery that expands when printing.

The learning sequence is predict, operate, explain:
- Students may predict readable or mirrored text, select “not sure,” or explore first.
- The prediction is captured when inking starts and saved with the resulting proof. Editing a later prediction cannot rewrite earlier evidence.
- Feedback appears after reveal. It invites students to support or revise their prediction using the proof and connect the result to screw/platen movement.
- A direct action focuses the notebook, with optional sentence starters for an explanation grounded in a specific proof.
- Predictions appear on saved proof cards and in notebook downloads, including after reopening the activity.

Menu routes now describe student actions and learning outcomes: operate the press, compose a message, and publish a broadside.

Validation:
- 38 focused tests passed across 8 Printing Press suites, including stored prediction normalization and legacy-record compatibility.
- `node dev-tools/printingpress_workshop_qa.cjs`: four-stage progression, no premature feedback, contextual hints, all three prediction feedback paths, immutable snapshots, storage recovery, visible saved predictions, keyboard focus handoff, sentence starters, and notebook export.
- No horizontal overflow at 768px, 390px, or 320px. No WCAG A/AA axe violations in the workbench at ready, revealed, and phone states. No browser page errors.
- Desktop and phone screenshots visually reviewed, including a refinement to keep the primary action beside the simulation on phones.
- The existing run-notebook and broadside browser checks passed. The tour test now advances the real tour delays using Playwright's controlled clock, removing dependence on machine speed or scrolling time.
- Source syntax, whitespace, and source/desktop mirror parity verified.

These checks use the real tool in an isolated React host; this pass does not measure classroom learning outcomes.

Evidence: `browser-results.json`, `ready-desktop.png`, `revealed-desktop.png`, `workshop-320.png`, `guide-320.png`, corresponding 390px/768px captures, and `learning-notebook.txt`.

## Saved-proof review refinement

Each saved proof now has a Look closely action. It opens a focused review with the original phrase and prediction, a keyboard-accessible letter picker, and enlarged mirrored-type/paper comparisons. The prompt explains the viewing orientation and suggests asymmetric letters when symmetry makes reversal difficult to observe. Students can move directly to their observations with the selected proof number as context; existing writing and proof records are never replaced. Closing the review returns keyboard focus to its originating card.

Additional browser checks cover keyboard opening and closing, letter selection, immutable review after editing the next phrase, preservation of observations, contextual writing guidance, reopening saved proofs, and responsive review layouts at 768, 390, and 320 pixels. The notebook including its review panel has no WCAG A/AA axe violations. Desktop and 320-pixel screenshots were visually inspected.

New visual evidence: `proof-review-desktop.png`, `proof-review-768.png`, `proof-review-390.png`, and `proof-review-320.png`.
