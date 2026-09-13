# Focused behavior replay

The animal inspection panel now offers **Replay this behavior**. It returns to the first sample of the selected representative's current action, plays through that action once, and pauses at its exact last sample. A single-sample action appears as a still with a completion message.

**Pause behavior replay** stops immediately; replaying again starts the action from its beginning. Completion and pause messages use a polite live region. The ordinary meadow timeline remains available for watching the complete run.

Changing the representative, species, comparison branch, inspection mode, run, or external observation stops a focused replay. Scrubbing and jumping between behaviors also stop it. A playback generation guard ignores callbacks queued before a pause or restart, while a private replay cursor keeps the clip within its selected boundaries.

Replay is disabled with reduced motion, when the 3D view is unavailable, or when no representative is present. Behavior navigation and explanations remain available. This changes inspection playback only; the food-web model and deterministic animal behavior rules are unchanged.

## Validation

- 20 targeted unit checks passed across behavior moments, action transitions, and the food-web model.
- Browser scenarios exercise exact stopping, manual pause and restart, resuming the full timeline, cancellation during navigation, reduced motion, single-sample actions, absent groups, and preservation of the saved run.
- Desktop and mobile captures are saved alongside this report.

All three browser scenarios passed, including the existing behavior-navigation regression scenario. Desktop and mobile captures were visually reviewed; the mobile panel fits without horizontal overflow, and reduced-motion replay uses a visibly disabled control with an explanation. Syntax validation passed and both application copies have identical SHA-256 hashes.
