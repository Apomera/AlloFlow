# Sky Lab: visual, usability, and reliability review

## Outcome

The review covers the Night Sky & Astronomy tool, especially its Tonight page, Sky Map, 3D Observatory, and animated learning views. The changes are implemented locally in `stem_lab/stem_tool_astronomy.js` and its desktop public copy.

The largest usability problem was the distance between opening the lab and seeing the sky. A large introductory panel, secondary controls, and a long row of sections competed with the simulation. The largest reliability problems involved object selection, clocks, and stale forecast data.

## Continued enhancement pass

The second pass makes the sky easier to explore and improves the data behind it:

- **Find a real object.** Search common star names, HIP catalog IDs, planets, the Sun, Moon, or deep-sky objects such as M31. Result buttons identify the exact object and explain whether it is below the horizon, hidden by a disabled layer, too faint, or unavailable in deep time. Keyboard Enter selects the first result; Escape clears the query.
- **Keep details current.** A selected object's direction, altitude, brightness, lunar phase, and visibility refresh when time, location, or layers change. Search results also update during time-lapse.
- **Move between sky views.** Observatory and Sky Map now carry the selected place, instant, and Bortle setting in both directions. Custom coordinates remain exact. Map offsets clearly say when they start from a selected moment rather than the current clock.
- **Edit without jumps.** Coordinate fields accept an unfinished minus sign or decimal. Invalid local times retain the last valid sky and show a correction message. Changing time zone or preset site preserves the UTC instant, including the repeated daylight-saving hour. Leaving Observatory during time-lapse commits its reached time and pauses it.
- **Recover the star catalog.** Requests have a finite timeout, malformed numeric rows are rejected before rendering, and the fallback sky stays usable. A retry control and reconnect recovery can restore the full catalog; late requests cannot overwrite a newer successful result.
- **Place the Moon more accurately.** The model now includes observer parallax and lunar-distance perturbations. Both sky views and saved Moon visibility tracks use the correction. Reference stars use the same precession treatment as the full catalog.

### Independent lunar reference check

The regression fixture contains 18 NASA/JPL Horizons observer ephemerides across Maine, Sydney, and the equator, including two observations just above the horizon. The maximum angular difference is **0.0467° (2.8 arcminutes)** for those cases; the previous near-horizon errors exceeded 0.85°. This measures the tested cases, not a guaranteed error bound for every date. The fixtures run offline in normal tests.

Reference: [NASA/JPL Horizons observer ephemerides](https://ssd.jpl.nasa.gov/horizons/manual.html). The simulation still uses approximate orbital calculations and a sea-level observer. Local terrain and weather are not included.

New regression coverage lives in `tests/astronomy_observing_workflow.test.js`, `tests/astronomy_lunar_parallax.test.js`, `tests/astronomy_catalog_loading.test.js`, the expanded runtime suite, and the Chromium Observatory scenarios. Full results for this pass are stored in `enhanced-unit-tests.json` and `enhanced-e2e.json`.

The unit run verified 380 cases immediately. One old assertion expected numeric coordinate inputs; it now checks accessible labels, decimal input mode, and retained values, and passed its focused rerun (`enhanced-coordinate-recheck.json`). Two further regressions verify the shared custom observer in Seasons and rejected timezone changes at the supported-year boundary. Together these verify **383 unit cases**.

All **28 Chromium cases** are verified: 26 passed in the full run, and two passed their focused recheck after updating the site-change expectation to preserve UTC and correcting the new playback test's comparison between a UTC string and a numeric timestamp. Original runs and rechecks are retained; `enhanced-verification-summary.json` records their combined results. The second-pass desktop/phone captures and 18-section mobile journey completed without browser errors or horizontal overflow (`enhanced-browser.json`).

Current screenshots: [desktop Observatory](enhanced-desktop.png), [phone Observatory](enhanced-phone.png), [Tonight](enhanced-tonight.png), [320 px phone](enhanced-small-phone.png).

The [mobile object finder](finder-mobile.png) shows a real catalog result below the horizon, with its HIP ID and current altitude.

## Visual and interaction improvements

- **A useful starting page.** Tonight now has direct actions for the 3D Observatory and Sky Map, a computed overhead preview, and an explanation of the data behind the experience.
- **All sections are discoverable.** A section selector complements the keyboard-accessible tab strip. Selecting a section brings its tab into view.
- **The sky comes earlier.** The large command panel is removed from simulation views. Place, date, and local time remain above the scene; timezone, time steps, event jumps, playback, and display settings follow it.
- **Clearer typography and controls.** Scoped system fonts work without relying on host styles. Primary Observatory controls and navigation have larger touch targets.
- **A more readable scene.** The clock no longer overlaps fullscreen. A camera bearing/elevation display and subtle center marker help users understand where they are looking. Labels avoid collisions, and the landscape has smoother ridges and layered conifers.
- **Honest data labels.** The interface distinguishes catalog/calculated positions, chosen sky conditions, NOAA forecast values, and illustrative scenery. Source links and limitations are available in a disclosure below the scene.

### Measured layout change

These measurements use the same isolated browser harness before and after, at a fixed Maine evening. They are local comparison measurements, not production performance scores.

| Viewport | Scene starts before | Scene starts after | Space recovered above scene |
|---|---:|---:|---:|
| Desktop, 1440 × 1000 | 852 px | 434 px | 418 px |
| Phone, 390 × 844 | 1204 px | 608 px | 596 px |

The final review also checks a 320 px phone layout and navigation through all 18 sections inside a fixed-height mobile host. No document or content-panel horizontal overflow was found in that journey.

Screenshots: [Tonight](final-tonight.png), [desktop Observatory](final-desktop.png), [phone Observatory](final-phone.png), [small phone](final-small-phone.png). Baselines remain in this folder.

## Reliability fixes

| Finding | Change |
|---|---|
| Next/Previous object aimed below its target, then picked whatever was near screen center | Camera centering and selected identity now agree; browser assertions compare the selected object with its spoken description |
| Reduced-motion mode could freeze Live now | A low-frequency live refresh runs independently of animation and refreshes outer forecast eligibility |
| An explicit time jump during playback could be overwritten by the pause callback | Explicit changes to the selected instant take priority; ordinary Pause retains the displayed instant |
| Starting playback below the scene left it offscreen and automatically paused | Play now brings the sky into view; the browser check asserts that the scene is visible before checking time advance |
| Hidden tabs and cancelled drags could produce jumps or unintended selections | Visibility resume, pointer cancellation, secondary touches, and drag-return behavior are guarded |
| Failed WebGL setup could leave resources behind | Startup failure and disposal clean up the scene resources |
| A loaded lunar texture might not repaint a stationary scene | Texture readiness refreshes the Moon appearance |
| Selected labels could show outdated positions or remain after their layer was hidden | Selection follows current position/visibility and catalog replacement |
| Impossible restored dates/times silently rolled into another date | Calendar and wall-clock validation rejects overflow and skipped DST times, while retaining valid leap days and repeated-hour behavior |
| Moon/Eclipse playback timers were scheduled during rendering | Mounted clock components own timers; pause, tab changes, unmount, hidden documents, and queued callbacks are guarded |
| NOAA data could be reused for a different site or treated as fresh because it was just downloaded | Provider timestamps and sampled coordinates determine eligibility; malformed data, stale responses, and missing data are rejected |
| A forecast request could remain loading or overwrite newer state | Requests have identity guards and a real timeout, including environments without AbortController |
| Accelerated playback could continue displaying the current NOAA forecast | Forecast application is limited to the current live sky and is disabled during time-lapse |

## Real-world data

Sky Lab already contained substantial real data. This work preserves that foundation and strengthens its presentation and live-data handling.

| Source | How the lab uses it | Limits |
|---|---|---|
| [HYG Database](https://codeberg.org/astronexus/hyg), bundled v4.1 subset | 8,920 catalog stars, with positions, magnitudes, colors, and measured motion where available | Bundled data is a catalog snapshot; deep-time motion is a simplified extrapolation |
| [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) | Lunar Reconnaissance Orbiter imagery/elevation assets for the Moon | Visualization assets derived from scientific observations; not a live telescope image |
| Local positional astronomy engine, checked against NASA/JPL Moon references | Sun, Moon, and planet positions for a selected timestamp and location, including lunar parallax | Classroom approximations; sea-level observer, approximate refraction and rise/set timing |
| [NOAA SWPC OVATION](https://www.swpc.noaa.gov/products/aurora-30-minute-forecast) | Optional current aurora probability grid, validated against provider timestamps and location | Usually 30–90 minutes ahead; values do not account for local clouds or obstructions, and the rendered curtain shape remains illustrative |

The NOAA endpoint was checked directly and returned 65,160 grid cells with UTC observation and forecast timestamps. The star catalog and lunar images are bundled; NOAA is fetched only when requested. Local weather and cloud cover are not currently fed into the simulation.

## First-pass validation

**303 Sky Lab unit tests and all 23 Chromium browser checks passed** (17 Observatory, 6 Sky Map/constellations). The browser suites finished with zero failures, retries, or skips. The 18-section mobile navigation journey and all four layout captures completed without runtime errors or horizontal overflow. Machine-readable results are saved alongside this report:

- `sky-lab-unit-tests.json`: all 303 Sky Lab-specific unit checks.
- `unit-tests-final.json`: broader filter, including a mixed astronomy/nutrition/Raptor Hunt suite; 327 of 328 checks passed. Its remaining failure is the unrelated Raptor Hunt source/public mirror comparison in the shared working tree. Sky Lab's source and public mirror are identical.
- `final-browser.json`: desktop and phone capture metrics plus the 18-section mobile navigation check.
- `e2e-observatory.json`: real Chromium Observatory interactions and lifecycle checks.
- `e2e-skymap.json`: constellation and Sky Map browser checks.

The first broad unit run exposed several outdated tests that still expected five Sky Map controls even though the existing source already had a sixth catalog-star toggle. Those expectations now cover the existing sixth control. Tests for the removed command-panel layout were updated to check the new navigation and readable compact route. Runtime and scientific behavior checks remain in place.

The browser suite also used the real current date for a night-sky star-count assertion. It now fixes the clock to a known Maine night. Scene screenshots use element captures so opening controls cannot move the screenshot rectangle outside the viewport. The time-lapse test checks the actual Play action brings the scene into view.

## Best next enhancements

1. **Optional observing conditions.** A separately labeled weather layer could show cloud cover and forecast age for the selected location. Keep astronomy usable when that service is offline.
2. **Real terrain horizons where available.** Elevation-based obstructions could improve observing plans. Current landscapes remain representative illustrations.
3. **Broader reference coverage.** More independent dates and planetary ephemerides would strengthen the scientific checks beyond the new lunar comparison.

No software review can establish that every possible device and saved state is glitch-free. The included checks target the observed bugs and the main desktop, phone, keyboard, reduced-motion, and recovery workflows. These changes have not been deployed.
