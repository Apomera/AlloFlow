# Inside the Storm and Be the Water refinement

Inside the Storm now has a pooled, world-positioned precipitation field around the viewpoint. Wind displaces the rain, flakes drift without rain streaks, and the field stays within the storm column. Virga produces no near-ground precipitation. Cloud intensity also adjusts daylight and atmospheric color; surface wetness and ripple effects require liquid precipitation reaching the ground.

Be the Water now renders its journey trail in chronological order, including after its circular history buffer fills. Segments retain the water-state color recorded when they were created and fade toward the oldest point. Teleports clear the old path. A compact surface wake follows liquid movement on water; it freezes with pause and is suppressed under reduced motion. First-person Water view hides the external parcel trail.

These additions illustrate the existing model; they do not add a fluid solver or change phase-transition physics.

Verification:

- 159 regression tests passed across the pilot experience, pilot kernel, pilot navigation, storm immersion, and precipitation lab suites.
- The complete storm immersion browser check passed movement, weather easing, three environments, fullscreen, reduced motion, mobile accessibility, failed-load retry, and context-loss recovery.
- Focused near-weather browser checks passed rain, snow, virga, finite geometry, and hiding the field outside immersion.
- The water visual browser check filled and wrapped all 120 trail samples, checked continuity, pause stability, first-person hiding, reduced-motion wake suppression, and live WebGL without JavaScript errors.
- Beach storm, following-water, and first-person-water screenshots were visually reviewed using Chromium with SwiftShader. Hardware GPU performance was not benchmarked.

Reproduce the focused browser checks with `node dev-tools/watercycle_near_weather_qa.cjs` and `node dev-tools/watercycle_water_visual_qa.cjs`.
