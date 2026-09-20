# Precise behavior inspection

**Inspect individual samples** expands inside Behavior moments. It shows the selected sample number, total samples in the action, and model time. A bounded slider and Previous/Next sample buttons inspect the action without crossing into its neighbors. The existing behavior navigation remains available for changing actions.

Every sample selection pauses playback and pins the currently inspected representative. Boundary buttons are disabled, and a single-sample action has no movable sample controls. Keyboard range controls expose a descriptive sample/time value to assistive technology. With reduced motion, these controls update recorded action and comparison values while preserving the frozen starting pose; inline text explains that distinction.

**Replay pace** offers normal, half, and quarter speed for a focused behavior replay. It changes the time between displayed samples, not the model's sample times, decisions, or population equations. Changing pace pauses playback, and a new replay starts the action again. The ordinary meadow timeline retains its normal pace. Existing replay limits and queued-callback cancellation remain in effect.

## Validation

All 20 targeted model and behavior checks passed, and all three browser scenarios passed. Desktop and mobile controls were visually reviewed: sample controls, labels, and disabled states are readable, with no horizontal overflow. Syntax validation passed and both application copies have matching SHA-256 hashes. Browser coverage includes keyboard stepping, exact action boundaries and sample text, slower timer cadence, final-frame stopping, changing pace during replay, cancellation by sample selection, full-timeline cadence, reduced motion, saved-run preservation and desktop/mobile layout.
