# Night Sky & Astronomy: handoff (updated 2026-09-04 by Claude)

## Status in one paragraph

The meteor foundation described in the original handoff (below) is intact and green. On top of it, the expanded request is now implemented as a distinct **Observatory** tab in `stem_lab/stem_tool_astronomy.js`: a Three.js night-sky environment that draws the real sky for an arbitrary place and an unambiguous local time from a bundled, licensed HYG star catalog, with selectable representative landscapes, a shower layer whose radiant is placed from real coordinates, an educational aurora model, and an optional NOAA OVATION forecast check. Nothing has been committed, pushed or deployed. The many pre-existing uncommitted changes in the tree were preserved.

## What was built (Observatory tab, id `observatory`, icon 🔭)

### Data
- `stem_lab/assets/astronomy/hyg-v41-naked-eye.json` (370 KB, 8,920 stars to magnitude 6.5, J2000, HIP id, RA/Dec degrees, magnitude, B-V, constellation code, 351 proper names). Mirrored byte-identical to `desktop/web-app/public/stem_lab/assets/astronomy/`.
- Generated reproducibly by `dev-tools/build_hyg_naked_eye_subset.cjs <hygdata_v41.csv>` from HYG v4.1 (CC BY-SA 4.0). The JSON records the source SHA-256, license, adaptation text and magnitude limit; the script fails if any of the 96 HIP ids used by the 15 `CONSTELLATION_PATTERNS` are missing. `ATTRIBUTION.md` in both asset folders documents the source and license.
- The raw 34 MB CSV is not in the repo (it was downloaded to a temp folder for generation).

### Positional model (module scope, all exposed on `window.__alloAstroPure`)
- `precessJ2000` (IAU 1976) moves catalog positions to the chosen date; verified against Polaris and equatorial drift.
- `wallTimeToUtcMs` / `utcMsToWallTime` / `zoneOffsetMinutes` use `Intl` to convert wall-clock time in an IANA zone to UTC, DST-safe. `observatoryResolve(state, nowMs)` normalizes persisted state into one place + UTC instant (clamped coordinates, valid zone, 1900–2099, defaults).
- `observatoryBodies` wraps the existing `skyNow` for Sun, Moon, planets. `catalogHorizon` computes horizon-frame positions for the whole catalog (precession cached per month). `horizonPoint` for single targets.
- `limitingMagnitude(bortle, sunAlt, moonAlt, moonIllum)` drives star visibility through twilight and moonlight. `observatoryShowerRate` reuses the simulator's population-index rate model. `bvToRgb` colours stars.
- `auroraGeometry(lat, lon, level)` is an educational dipole/oval model: geomagnetic latitude against the approximate 2025 north dipole pole, oval boundary 66.5° − 2°·level, curtain elevation from an Earth-curvature arc with curtain tops scaling 170–330 km with activity. It reports overhead, visible-low-toward-bearing, or below the horizon. `summarizeOvation` + `auroraFromForecast` translate the NOAA grid to the same structure.
- Sites: Moosehead Lake, Portland, Acadia (Maine), Atacama, Tromsø, Fairbanks, Quito, Sydney, plus custom coordinates. No personal location is assumed.

### Renderer `createObservatorySky`
- Sky dome shader computes twilight arch, daylight, moon haze, light-pollution dome, and a Milky Way band along the **true galactic plane** (its dust texture is artistic and labelled so). The smooth model runs per vertex on a 128×64 sphere; only the Sun/Moon halos run per pixel (this cut software-GL frame cost by roughly 5×).
- Stars: one `Points` cloud from the catalog with per-star colour, magnitude, altitude extinction, twinkle; a stencil-masked mirrored copy appears only on water. Water (lake, sea) is a shader plane reflecting the same sky model with ripple; the observer stands 12 units above it so it reads as a surface.
- Constellation lines for all 15 patterns from catalog positions, with an optional highlight; hidden in daylight and on the fallback catalog (partial patterns would look broken).
- Sun sprite, Moon sprite with a phase texture whose lit limb is rotated toward the Sun in screen space, planet sprites, compass markers, HTML labels for bright named stars, planets, constellations, radiant and aurora. Labels avoid forced layout.
- Landscapes: lake+forest, forest, coast, desert, arctic (procedural silhouettes, explicitly "representative").
- Shower layer: radiant from `METEOR_RADIANTS` (IMO values) via the same horizon math; `meteorTrack` reused and rotated to the true radiant azimuth; count from the effective rate; label says "simulated".
- Aurora: four additive curtains shaped by `auroraGeometry`, only after dark, labelled "simulated" (or "NOAA forecast" when driven by the forecast).
- Time-lapse runs inside the renderer (1 min / 10 min / 1 h / 1 day per second) without touching React state each frame; the reached time is committed to tool state on pause. Live mode refreshes every 30 s. Reduced motion: no RAF, no twinkle, time-lapse disabled.
- Loop capped at ~30 fps; visibility/intersection aware; full disposal; context-loss → Retry UI; `host.__observatoryDebug()` for tests.
- Catalog load failure falls back to the 44 built-in bright stars with a visible "Built-in bright stars only" badge.

### React
- `ObservatoryView` (stable component) owns Three.js and catalog lifecycle. `renderObservatory()` (inside `render(ctx)`) builds controls, the accessible "What this sky contains" summary (twin of the scene), the NOAA panel, accuracy notes and attribution.
- State keys (astronomy bucket): `obsSite, obsLat, obsLon, obsTz, obsLive, obsDate, obsTime, obsEnv, obsBortle, obsLayers{stars,lines,labels,planets,sunMoon,milkyWay,compass}, obsShower, obsAurora, obsHighlight, obsRate, obsPlaying, obsNoaa, obsNoaaApply`.
- NOAA: button fetches `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json` (20 s abort), stores a summary with timestamp; stale after 2 h; "Drive the aurora layer from the forecast" applies only in Live mode. No network call happens without the click; SSR makes no requests.
- 105 English keys added to `ui_strings.js` (+ desktop mirror) under `stem.astronomy` (`obs_*`, `observatory_tab`, `compass_*`, `planet_*`), values equal to the code fallbacks. Both copies byte-identical.

## Honesty boundaries kept in the UI copy
Star positions: HYG J2000 precessed; Sun/Moon/planets: low-precision ephemerides (arcminutes); no refraction; landscapes representative; Milky Way detail artistic; meteors and aurora simulated; NOAA gives a probability grid, not a picture; forecast only for the live sky. The Meteors tab's illustrative scene is unchanged and still labelled illustrative.

## Tests
- `tests/astronomy_observatory_3d.test.js` (16): time-zone conversion, state normalization, Sun altitude sanity, precession drift, catalog integrity + mirror parity + pattern HIP coverage, Polaris altitude ≈ latitude, hemisphere check (Acrux up at Sydney), fallback catalog, colours, limiting magnitude, shower rate, aurora model (Tromsø/Maine/Quito/Sydney), NOAA summary/forecast geometry, SSR rendering (fixed instant, custom site, malformed state, no timers/fetch, single tab).
- `tests/e2e/astronomy-observatory-3d.spec.ts` (8, real Chromium + SwiftShader): local assets only, fixed instant correctness, site/hemisphere/daylight/time steps, landscape swaps without leaks + aurora visibility rules, shower radiant + Find, time-lapse commit semantics, keyboard/pointer/find/layers at 320 px, catalog-500 fallback + dispose on navigation, reduced motion.
- Screenshots (real browser) in `scratch/observatory-*.png`: lake evening, daylight, arctic aurora, coast, desert, perseids.

Commands:
```powershell
npx vitest run tests/astronomy_observatory_3d.test.js tests/astronomy_meteor_3d.test.js tests/astronomy_ui_resilience.test.js tests/astronomy_constellation_skymap_visual.test.js tests/stem_astronomy_sky.test.js tests/astronomy_functional_regressions.test.js tests/astronomy_moon_observatory.test.js --maxWorkers=1
npx playwright test tests/e2e/astronomy-observatory-3d.spec.ts --workers=1 --retries=0 --reporter=line
node --check stem_lab/stem_tool_astronomy.js
node dev-tools/build_hyg_naked_eye_subset.cjs path\to\hygdata_v41.csv
```

## Validation record (2026-09-04, late evening local)
- `node --check stem_lab/stem_tool_astronomy.js` passes.
- Browser suite `tests/e2e/astronomy-observatory-3d.spec.ts`: **8 passed (3.1 min)**, real Chromium + SwiftShader, local assets only (log: `scratch/observatory-e2e.log`).
- Unit: `tests/astronomy_observatory_3d.test.js` **16 passed**. Full astronomy set (7 files): 171 passed, 1 timed out at vitest's 5 s default in `astronomy_functional_regressions` (source-contract read under load); that file passes **20 of 20** in isolation. Meteor suite (8) and UI resilience (80) pass together.
- Mirrors byte-identical: astronomy source, `ui_strings.js`, the HYG asset, `ATTRIBUTION.md`.
- Screenshots reviewed by eye: July evening from Moosehead shows Scorpius, Sagittarius and the Milky Way low in the south; Tromsø Kp 5 puts the oval south of the observer; daylight hides stars, lines and labels except Venus.
- Branch main. No commit, push, deployment or new branch.

## Enhancement slice 2 (2026-09-05)
- **Refraction.** Sæmundsson refraction from true altitude is applied to catalog stars, Sun, Moon, planets, guides and the shower radiant (`refractionDeg`, `applyRefraction`; bodies keep `trueAlt`). Accuracy note updated.
- **Real Moon face.** The bundled LROC colour mosaic is orthographically projected onto the Moon disc once (near side), then phase-shaded with faint earthshine; the lit limb still turns toward the Sun in screen space. Falls back to the flat disc if the image cannot be read.
- **Deep-sky layer** (`DEEP_SKY`, 14 showpieces: Pleiades, Orion Nebula, Andromeda, Beehive, M35, M13, M6, M7, M8, M22, Double Cluster, Omega Centauri, LMC, SMC): tinted glows sized from true angular diameter, faded by limiting magnitude and darkness, labelled, findable, identifiable. Summary lists what is up.
- **Guides layer**: ecliptic (gold) and celestial equator (blue) of date, plus a celestial-pole marker at the site latitude; labels at each circle's high point; Find → pole.
- **Click to identify**: a click that does not drag (or Enter/Space on the focused sky, at the view centre) picks the best object inside a 2.5° cone (stars to the limiting magnitude, planets, Moon, deep sky; brighter and bigger win ties). A pinned ◎ label follows the object; the panel below shows name (proper name or HIP id), magnitude, colour class from B-V, IAU constellation (full names for all 88 codes), altitude/compass. Clear resets both React and renderer state (`obsPicked`).
- **Jump to a moment**: sunset, dark sky (−18°), solar midnight, dawn, sunrise for the local calendar day (`skyEvents`, 10-minute scan + interpolation); polar day/night notes instead of missing buttons.
- **Sky Map → Observatory**: a button carries the Sky Map's place and shown time into the observatory (site match by coordinates, else custom + zone).
- Label density grows when zoomed in; labels slide past each other instead of overlapping; test hook `host.__observatoryLookAt` and `spots` in the debug payload.
- 35 more `ui_strings` keys (both copies); two retired keys pruned. Tests: unit suite now 22, browser suite 10 (identify on a real star, guides + pole, deep sky present in a December sky, Moon face loaded, sunset jump lands within a degree of the horizon, Sky Map hand-off).

## Enhancement slice 3 (2026-09-05)
- **Tonight's tour** (`observatoryTour`, pure): up to six prioritised steps for this exact sky: daylight note, Moon phase, best planet (Venus → Jupiter → Mars → Saturn → Mercury) with a teaching note, the highest of the 15 recognition patterns using the tool's existing `howToFind` text, a deep-sky object by type, shower radiant, aurora, and the brightest well-placed star with a colour note. Prev/Next panel (`obsTourStep`), and a ★ Find button for the current step above the camera controls. Needs the catalog cache (`observatoryCatalogCache`) for the constellation step.
- **Identify → highlight**: identifying a star that belongs to a pattern (`HIP_TO_PATTERN`) sets `obsHighlight` and the panel says "Part of Orion (now highlighted)".
- **Describe this view** (renderer `describe()`): lists Sun/Moon/planets/named stars/constellations/deep sky/radiant/aurora inside the current field of view, nearest the centre first, as a sentence in a live region and via `ctx.announceToSR`.
- **Copy summary**: plain-text sky summary plus tour, via `window.alloCopyText` if the host provides it, else the Clipboard API, else a textarea fallback; toasts on success/failure.
- 24 more `ui_strings` keys (150 `obs_*` total). Unit suite 25; browser suite 11 (tour Find moves the camera, Next advances, describe sentence starts "Facing …", clicking Betelgeuse/Rigel highlights Orion).
- Browser-test lesson: after clicking panel controls the page scrolls, so canvas-pixel clicks must be preceded by `scrollIntoViewIfNeeded()` (and a tall viewport); otherwise the click lands below the fold and identifies nothing.

## Known gaps / next candidates
- Constellation figures exist for 15 patterns only. Stellarium's modern sky-culture line set (HIP pairs) would cover all 88, but its licence must be checked before bundling.
- Star trails during time-lapse (accumulation buffer) would be a striking addition but needs a render-target pipeline.
- Proper motion is not applied (arcminute scale for a few fast stars over decades); refraction is now applied.
- Aurora oval boundaries are a teaching approximation (Kp-like level → boundary latitude); the NOAA route is the real-data path.
- Landscapes are procedural; a surveyed horizon for a named site would need elevation data.
- The Sky Map tab still uses its own 6-site list (now linked to the Observatory); unifying the lists is a small follow-up.
- Translations for the ~140 new `obs_*` keys have not been added to language packs.
- Slice 1 (2026-09-04) was swept into another session's deploy commit f238731dd and is live on the CDN; the 34 leftover strings landed in 7c7990f6e (unpushed). Slice 2 is uncommitted at the time of writing.

## Local tooling notes (this session)
- OneDrive intermittently blocks `rename` onto `ui_strings.js` (EPERM); writing the temp file then falling back to an in-place write worked. Vitest's 5 s default budget times out on first reads of the 1.3 MB source under load; the new suite sets 30 s / 45 s.
- SwiftShader e2e is slow: the suite ran 16 minutes before the vertex-stage sky and ~3 minutes after. Keep expensive per-pixel work out of full-screen shaders.

---

# Original handoff (ChatGPT / Codex, meteor foundation)

## User intent and stopping point

The user first requested a deep improvement to the Night Sky STEM tool, including a beautiful Three.js meteor shower simulation retaining the formations in the 2D version. A working meteor-view foundation has been implemented.

The user then clarified the larger goal:

> A comprehensive, visually stunning 3D night-sky environment: meteors, the other stars, selectable landscapes/environments, aurora in appropriate areas, and the ability to view the actual sky for a real place and time using accurate astronomical data or suitable open-source software/data.

## Workspace and constraints

- Repository: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
- Many pre-existing uncommitted changes, including localization and deployment files. Preserve them.
- The app is a browser-based STEM-tool registry with React supplied through `ctx.React`, hand-authored `React.createElement`.
- Main source: `stem_lab/stem_tool_astronomy.js`; deployable desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_astronomy.js`.
- Canonical English strings: `ui_strings.js`, mirrored at `desktop/web-app/public/ui_strings.js` (strict JSON).
- Engine loader `window.StemLab.ensureThree({ orbit: false })` prefers bundled Three.js r128 at `vendor/three-r128/three.min.js`.

## Implemented meteor foundation (unchanged)

- Dedicated **Meteors** tab (3D default); Events tab keeps the 2D default. 2D/3D switch preserves conditions and the selected constellation guide (15 patterns). Camera: drag, arrows, Home, buttons, zoom.
- Functions after `CONSTELLATION_PATTERNS`: `meteorBound`, `meteorSeed`, `meteorDirection`, `meteorProject`, `meteorTrack`, `meteorGuide`, `createMeteorSky`, `MeteorSkyView`.
- Procedural sky, ~4,200 decorative stars, silhouettes, additive meteor ribbons, timed appearances, 15-trail cap per 10-minute sample over 8 s, resource reuse and disposal, loading/failure/Retry, context-loss recovery, reduced motion.
- The old global render-time timer was removed; 2D timer lives in a child effect.
- **The meteor scene is illustrative, not positional astronomy.** The Observatory tab is where catalog positions live.

## Tests from the meteor phase
- `tests/astronomy_meteor_3d.test.js` (8) and `tests/e2e/astronomy-meteor-3d.spec.ts` (10). `tests/astronomy_ui_resilience.test.js` adjusted for the new copy. Artifacts in `scratch/night-sky-*`.
