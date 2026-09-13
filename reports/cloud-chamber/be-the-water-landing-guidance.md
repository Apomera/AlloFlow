# Be the Water: clearer landing guidance

The landing card now distinguishes lake, stream, and ocean collection instead of labeling every water body “Open water.” Soil, plant uptake, and runoff retain their own pathway explanations. A compact SVG graphic and colored edge help identify the pathway, alongside explicit text.

The card says “Surface below you” and explains that wind and steering can change where the parcel lands. It describes the current surface rather than implying a forecast of the eventual landing position. The selected navigation goal remains separate.

Scene labels now fit text within their texture, cap their projected width at 168 pixels on desktop and 128 pixels on narrow displays, and fade when the camera passes very close. Existing altitude and desert visibility rules remain in place.

## Implementation

- Added a rendering detail for lake, stream, and ocean within the existing water contact category. Kernel contact rules and simulation physics are unchanged.
- Published that detail in live snapshots and included it in the HUD update comparison, so changing water bodies refreshes the card even without a change in altitude or phase.
- Added decorative, non-focusable SVG pathway graphics with text labels carrying the meaning.
- Reused the existing five scene-label textures. Size and opacity updates allocate no additional geometry or textures per frame.
- Updated canonical source and the desktop mirror identically.

## Validation

- Existing experience and kernel regressions: **117 passed, 0 failed**.
- `node dev-tools/watercycle_pilot_landing_guidance_qa.cjs`: passed six surface cards, water-body snapshot updates, fitted label text, projected-size limits, close-camera fading, reduced motion, desert and altitude visibility, collected-water exclusion, mobile layout, accessibility checks, and texture cleanup. No observed page or WebGL errors.
- Visually reviewed stream guidance on desktop, the mobile card, and the new card in forced-color mode. Captures are in `scratch/water-landing-guidance-review/`.
- JavaScript syntax check passed; source hashes match; the existing local preview returned HTTP 200 on port 58122.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
