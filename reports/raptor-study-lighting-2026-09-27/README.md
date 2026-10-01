# Raptor Lab: interactive inspection lighting

**Studio light** offers three ways to examine the same frozen bird: soft light for balanced detail, side light for feather texture, and rim light for the outline. The lights follow the inspection camera as it orbits. The selector is disabled in Habitat mode and retains the last studio choice when returning to Studio.

The Inspect and Studio light fields align. On short phones, the control panel scrolls internally to leave room for the bird. Wide fullscreen uses two columns even when entered from a narrow embedded layout. Native keyboard selection, reduced motion, forced colors, and the existing pause behavior remain supported.

## Saved observations

Kept moments record `view.lighting` and a readable presentation label. Match saved view restores the lighting as well as the camera, region, and background. Comparisons explicitly identify different studio lights because highlights and shadows can affect what a learner sees. The setting and labels survive notebook transfer, offline HTML export, and restored sessions.

Older Studio views without a lighting setting use the original soft profile. Habitat views normalize the irrelevant studio setting to soft. Unknown explicit lighting values disable matching. The existing two-moment limit and one-capture-per-frozen-instant rule are unchanged; learners can freely switch lights while examining a single frozen pose.

## Rendering

The presets change positions and intensities on the existing three studio lights. Soft uses the original settings. No lights, meshes, materials, textures, shadow maps, render passes, or animation loops were added. Changing the selection repaints the paused scene once. The original bird geometry, materials, colors, morphs, flight state, and habitat lighting remain intact. Rendering still restores the habitat scene in `finally`.

## Verification

The final Chromium run passed all **13 scenarios in 5.0 minutes**, with no failures, skips, or retries, across the lighting, anatomy, report, and Studio suites. Source syntax, desktop mirror parity, scoped whitespace, and the translation manifest also passed. Results and source hashes are recorded in `verification.json`. The new tests compare raw canvas pixels at the same frozen camera, verify unchanged geometry/materials and resource counts, check no idle redraws or Habitat contamination, and exercise camera restoration, matching, notebook/export/restoration, legacy and invalid settings, keyboard selection, short-phone scrolling, wide fullscreen, accessibility, forced colors, and restart.

The initial run passed three scenarios. Its last scenario passed the phone/fullscreen/accessibility interactions, then incorrectly used a visible-role query while Study mode was closed after restart. That assertion now checks the DOM control count before reopening. Visual review also prompted aligned fields and the wide-fullscreen column correction.

`*-soft.png`, `*-side.png`, and `*-rim.png` show each light on a peregrine wing and owl portrait. `*-lighting-checks.json` records pixel differences and renderer resource counts. `lighting-comparison.png` and `lighting-observations.html` show the evidence workflow. `owl-short-phone.png` and `owl-short-fullscreen.png` document compact layouts. These are local Chromium/WebGL checks, not physical-device performance measurements.

## Scope

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Nine English-fallback translation keys are listed in `translation-keys.json`; shared language-pack integration remains pending. Shared hosts, catalogs, harnesses, and language packs are untouched. Changes remain local; no commit, push, or deployment was performed.
