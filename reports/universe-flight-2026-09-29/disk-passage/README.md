# Spiral disk passage

Enhancement 59 adds an eventful route through the existing procedural galaxy: approach its arms, descend through the stellar band, emerge on the other side, and turn toward a wide panorama. Launch **Spiral disk passage** from Scenic flights in the normal or fullscreen exploration controls.

## Stops and playback

| Highlight | Authored time | View |
| --- | ---: | --- |
| Above the spiral arms | 10 s | Approaching the inner arm from above the disk |
| Inside the stellar disk | 17 s | Near the disk plane among the 3D star and emission records |
| Beyond the disk | 40 s | The spiral seen from its other side |

The route takes 44 seconds at standard pace and finishes paused. Existing Slow, Standard and Fast controls, highlight pauses, scrubbing, free look, Follow view, saved views and completion controls work with the new route. On narrow screens, the active flight label uses the full header width so its phase text stays clear of the lens controls. Camera motion starts and finishes at rest. Live aiming uses the existing 0.35-second easing; seeks and paused highlight stops use the exact authored view.

## Geometry and model

The camera curve uses the galaxy's existing source frame: radius 52,000 light-years, tilt 0.88 radians and turn −0.22 radians. Its seven Hermite nodes cross the source plane once, around 16.837 authored seconds. The 17-second highlight is about 22 light-years beyond the plane. The camera spends about eight authored seconds inside one generated diffuse vertical sigma and remains at least 26,268 light-years from the center.

A monotone cubic distance schedule and 1,024 arc-length samples per segment provide gradual speed changes. Playback velocity is a numerical approximation: the independent audit measures a maximum join discrepancy of about 0.1544%. The distance schedule is continuously differentiable; the sampled world velocity is not claimed to be exactly C1.

These are procedural teaching views and an authored camera tour. Playback seconds and apparent travel speed are exploration controls, rather than spacecraft motion or elapsed physical time. The route does not add a measured galaxy catalog, gravitational orbit, dust radiative transfer or physical photometry. Relativity functions, clocks, stars, atlases, shaders and projection helpers remain unchanged. An unused remembered beta setting may remain in an exploration snapshot; exploration does not apply the relativity transform.

## Validation

- Two host audits check 44,001 new route poses, bounds and joins. The independent audit also compares 8,196 old route poses and verifies unchanged source helpers, shader strings, point records, atlas bytes and initial geometry.
- 18 final native WebGL captures cover seven new route views, paused stability, all four original route controls and a beta 0.9 control. All five baseline/candidate controls are pixel exact. An independent offline check excludes the dark ambient gradient and confirms visible detail in all 18 images. No new GPU resource types or counts are added; both contexts record matching creation and deletion counts for each resource type.
- 36 focused Vitest tests pass: 22 physics tests, five affected catalog tests and nine new passage tests. They use a Node canvas/event shim; remaining navigation tests and the full DOM unit suite were not run.
- Four actual browser workflows cover desktop, fullscreen, a 320-pixel phone with reduced motion, and phone fullscreen. Six scoped accessibility audits pass. All three new thumbnails load in each workflow, and paused camera, clocks and pixels stay stable.
- All 15 preview cards match the current renderer and desktop mirrors. The original 12 images remain byte exact, with unchanged poses and authored times.

## Preserved attempts

The first route used 256 arc-length samples per segment and failed the host velocity-join bound. Its source, audit and native design captures are preserved. The initial native driver captured 18 images, then accessed flyby state through the wrong snapshot field; actual route state belongs to telemetry. A corrected driver was prepared but not run, and a separately frozen final driver validated the installed 1,024-sample source.

The first focused unit run recorded 32 passing and four failing tests: two incorrect exact live-gaze assertions, one test timeout and one setup timeout. Its results, stdout, driver and inputs are preserved. The final tests independently integrate live gaze easing and retain exact pose checks for seeks and paused stops. Earlier browser drivers used an obsolete mode selector and attempted a fullscreen resume too close to the end. A third run passed its interaction checks but showed a narrow-screen label overlap. Its exact sources and captures are preserved. Another attempt exceeded the full-page load timeout; the final driver waits for DOM content and explicit renderer readiness. A responsive header adjustment and ten explicit overlap checks verify the final UI. A separate unused manifest URL returned 404 under the local server allowlist; all fifteen served image files match the local mirrored manifest.

[Route audit](evidence/audit-route-v2.json) · [Independent source audit](evidence/source-audit-final.json) · [Native gallery](evidence/native-v2-report/gallery.html) · [Focused tests](evidence/focused-unit/aggregate.json) · [Browser checks](evidence/browser-report/check.json) · [Preview cards](previews/check.json)

Nothing was staged, committed or pushed.
