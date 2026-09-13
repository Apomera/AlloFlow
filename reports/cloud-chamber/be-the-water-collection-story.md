# Be the Water: collection explanations tied to place

Rain collection now has separate lake, stream, and ocean explanations, with a small SVG diagram and a question about where the water could go next. The panel explicitly explains that rain was already liquid: collection changes its location rather than its state.

## Changes

- Lake storage, stream flow, and ocean storage use distinct illustrations, causes, and reflection questions.
- Transition evidence names the recorded water body.
- The exact transition record stores an optional `landingSurface` detail. Notebook normalization and storage preserve valid lake/stream/ocean values and discard invalid or contradictory details.
- Historical review and report generation derive the explanation from that recorded detail, rather than the current parcel's position.
- Older records without the detail retain the generic open-water explanation. The liquid-state illustration applies only to rain-to-liquid collection; snow retains its existing explanation.
- The diagrams are decorative, non-focusable SVGs. Text conveys the science independently. The existing scrollable reading region and persistent Continue action remain in use.

The simulation's mass, energy, contact, and phase rules are unchanged. Canonical source and the desktop mirror match.

## Validation

- Existing experience, kernel, and notebook regressions: **126 passed, 0 failed**.
- `dev-tools/watercycle_pilot_collection_story_qa.cjs`: passed actual lake/stream/ocean collection; exact location storage round trips; historical lake review while over a stream; legacy, invalid, and snow handling; pause and focus behavior; mobile layout, reduced motion, forced colors, accessibility, and Continue behavior. No observed page or WebGL errors.
- Visually reviewed desktop lake collection and mobile recorded review. Captures: `scratch/water-collection-story-review/`.
- JavaScript syntax passed, mirrored SHA-256 hashes match, and the existing preview returned HTTP 200 on port 58122.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
