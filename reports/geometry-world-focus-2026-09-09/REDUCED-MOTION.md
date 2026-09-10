# Geometry World reduced-motion correction

The selected rendering quality now respects the operating system's reduced-motion preference. Detailed and Balanced retain their resolution, shadows and postprocessing settings while disabling optional ambient animation. Auto continues to choose Saver for reduced motion, and Saver remains still regardless of that preference.

NPCs now use the same ambient-motion setting consistently. With motion disabled, their bodies, idle patrols, celebration/shake movement, eyes, arms, floating markers, prompt/speech bobbing, ring pulses and answered particles remain still. Eyes and arms return to a neutral pose instead of freezing mid-blink or mid-swing. Proximity prompts, dialogue previews, facing direction, answered-question visibility and the green answered tint still update; these state changes appear immediately without decorative interpolation. Existing dust motes are disposed when optional motion is disabled.

The audit also reproduced an answered-NPC failure: a later local THREE declaration shadowed the namespace before the green-tint code called `new THREE.Color`. Initializing THREE at the callback entry fixes the exception whether ambient motion is enabled or disabled. The [before-fix reproduction](reduced-motion-before.json) preserves the original error.

The change is confined to the render-profile resolver and NPC/ambient update paths in the canonical core and desktop mirror. Camera navigation was not changed by this subtask. Both sources parsed and were byte-identical when this patch was handed back for the parallel Focus creation work.

## Verification

All 94 tests passed across the new and related suites:

| Evidence | Tests | Result |
| --- | ---: | --- |
| [Reduced-motion regressions](reduced-motion-tests.json) | 12 | PASS |
| [Existing display and visual-pipeline regressions](reduced-motion-related-tests.json) | 82 | PASS |

The [new test file](../../tests/geometry_world_reduced_motion.test.js) executes actual source functions with vendored THREE r128. It verifies rendering-feature preservation, the same quality tier responding to a newly sampled motion preference, stable NPC transforms and cues across frames, unchanged camera/velocity/input state, normal animation when enabled, answered tint with an existing ring, and complete disposal of residual dust. No browser was launched; these are behavioral/geometry tests rather than screenshot or physical-device tests.

The [prepared patch script](prepare-reduced-motion.cjs) is retained for review. It reads fresh source before applying narrowly matched changes and mirrors the result; it should not be rerun on the already-patched source.

## Scope of the preference

The OS preference is sampled at engine initialization and when the render-quality profile is applied. The current app does not install a live media-query listener, so changing the OS setting while a world is already open requires reapplying the quality setting or reopening the world to update this profile. Adding a listener, or changing entry camera motion, walking head bob and break shake, remains outside this bounded correction.
