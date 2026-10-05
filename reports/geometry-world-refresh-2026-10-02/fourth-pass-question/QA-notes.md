# Fourth-pass Question Workspace QA

Private Chromium exercised the real route `Activities > Go to this activity > E > Flat Prism Quiz` on 1280 x 800, 390 x 844, and 320 x 568. No question completion was seeded; the harness only completed narration's typewriter and disabled automatic speech.

Final result: 27/27 checks passed, nine scoped axe audits with zero violations, 15 screenshots, and no application or host runtime errors. The private browser and server closed normally without touching the user preview.

Verified: visible step count; all scoped answer/header controls at least 44px; quantity/unit on a separate line; wrong explicit units marked invalid without score, answered-state, wrong-count, or grading-event changes; typed drafts retained across Choices/Type answer and Look/Back; solved-step recap separated from the new blank answer; sticky Close remains hit-testable with increased text spacing. Dialogs fit every viewport without horizontal text overflow. Normal choices, typed answers, and high contrast were accessibility-audited.

Useful screenshots: `desktop-question-typed-units.png`, `390x844-question-typed-units.png`, `320x568-question-typed-units.png`, and `320x568-question-textspacing.png`.

An initial desktop screenshot failed with a Chromium capture protocol error; a bounded capture retry was added to the private harness. The clean rerun completed all profiles. This was not treated as an application failure.

Remaining presentation observation sent to root: desktop narration buttons remain compact compared with the new 44px answer controls, and the Speak replies label is a compact target. This is separate from the validated answer/header target minimums.

Harness: `scratch/geometry-world-refresh-2026-10-02/fourth-question-visual.mjs`. Scope is visual/workflow QA, not a performance or hardware-GPU benchmark.
