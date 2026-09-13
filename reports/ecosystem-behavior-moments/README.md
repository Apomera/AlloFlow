# Behavior moments

Animal inspection now includes a Behavior moments panel. After running a food-web comparison, Previous behavior, Next behavior, and Jump to behavior navigate to the first sampled frame of an action. The panel identifies the selected group, representative, comparison branch, current action, and the inclusive range of samples carrying that action.

Each jump pauses playback immediately and updates the existing shared inspection cursor. The index is built from the already-computed representative animation frames; it does not run another ecological model or modify saved comparison data. The selected representative is retained when jumping, including when a population decline previously clamped the displayed selection.

The action list updates when switching representatives or comparison branches. For representatives after the first, only periods where that representative is present are offered, avoiding a jump that would silently select another animal. Representative 1 also includes periods when its group is absent.

With reduced motion enabled, the panel still describes the selected time and supports navigation, while the 3D view keeps its starting pose. The panel explicitly distinguishes the changing action text from the frozen pose. Before a run, it explains how to enable navigation. Habitat view hides the panel.

These remain illustrative representative behaviors. The new controls make the existing simulation easier to inspect; they do not validate the biological model or imply confirmed captures.

## Verification

21 targeted unit checks passed across behavior indexing, saved field-notebook evidence, and the food-web model. New coverage verifies exact coverage of sampled actions, separate repeated actions, absence at an intervention boundary, immutable source frames and model samples, missing representatives, gaps, and single-frame events.

The browser scenario exercises keyboard navigation, first/last boundaries, immediate playback pausing, saved-run preservation, representative changes, reduced-motion text and pose behavior, mobile layout, intervention absence, baseline switching, and returning to habitat view. Screenshots and final browser results are retained alongside this report.


Final verification: both browser scenarios passed. The navigation scenario was rerun with an additional regression check confirming that a behavior jump retains the effective representative after the group size shrinks. Desktop and mobile panel captures were visually reviewed. Syntax validation passed, and the web and desktop copies have identical SHA-256 hashes.
