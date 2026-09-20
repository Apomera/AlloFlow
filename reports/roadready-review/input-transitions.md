# Road Ready input transitions

Reviewed 2026-09-19. Changes remain local; no commit or deployment performed in this pass.

## Fixes

- Clear drill controls and queued parking actions when focus enters an input, textarea, select, or editable field. Key releases still clear the original press after focus or modifier keys change.
- Ignore Ctrl, Meta, and Alt keyboard combinations so browser shortcuts do not steer, select a gear, secure parking, or reset a drill.
- Require neutral controller inputs when entering or resetting standard and scenario parking. Held throttle, steering, gear, Park, and Pause inputs are consumed before a fresh attempt can respond. Existing pause/resume behavior is preserved.
- Keep the canonical STEM tool and its desktop STEM mirror identical.

## Verification

- 27 focused Vitest tests passed across input transitions, drill keys, quick parking key taps, controller parking, and parking pause behavior.
- Six Chromium scenarios passed: standard and tight parallel reset with a held controller trigger, completing the guided maneuver, pause and contact-penalty behavior, guided retries and next-drill navigation, and contact-aware completion feedback.
- New regression coverage lives in `tests/roadready_input_transitions.test.js` and `tests/e2e/roadready-reset-inputs.spec.ts`.

Controller browser checks use a simulated standard gamepad. Physical controller hardware was not tested.
