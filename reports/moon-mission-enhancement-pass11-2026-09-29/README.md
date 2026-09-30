# Moon Mission enhancement pass 11

Completed September 30, 2026. This pass began September 29.

## Result

After reviewing a successful lunar insertion, choose **Explore radio and sunlight in this orbit**. The new optional view coasts one additional revolution from the measured insertion endpoint. Its orbit, mass and remaining fuel come from that achieved capture.

- Finite-distance Earth visibility, a radio ray that ends on the lunar limb, and one-way / round-trip propagation times when the direct link is clear.
- Finite Sun-disc partial and total eclipses, visible-disc fraction, and three Sun orientations for comparing radio loss with darkness.
- Equal physical axes, lunar illumination, a solar shadow, measured orbit trail, velocity, an enlarged docked spacecraft and two contact timelines.
- Event buttons, seeking, Home / End, four playback speeds, pause, hidden-tab clock handling, closing, resizing and saved review.
- Verified optional results in the debrief, text flight report and archived flight. Changing insertion or Sun geometry clears their evidence. Review adds no XP or required mission gate.
- Durable handoff guards: an accepted action remains claimed by its render, so a stale button cannot repeat logs or rewards after the timed click lock expires.

The nominal orbit takes 124.26 min. With the 45° Sun preset, direct radio is blocked for 44.49 min, total eclipse lasts 45.97 min and partial eclipse lasts 22.97 s. At the starting state, the craft is on the far side with full sunlight. Sun direction changes eclipse timing while preserving radio geometry and the orbit.

[Physics, constants, equations and limits](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/PHYSICS.md). Earth and Sun stay fixed during this planar coast. Sun orientations are comparison presets. The illumination fraction does not model batteries, electrical power or temperature.

## Verification

| Check | Final result |
| --- | --- |
| Complete Moon Mission unit regression | 503 passed across 55 files |
| New environment and delayed-handoff coverage | 25 passed |
| Exact curated commit source | 75 passed across 9 files |
| Chromium workflows | 12 passed; one worker; zero retries or flaky results |
| 320 px view | No horizontal overflow; zero scoped axe violations |
| Visual review | Six captures inspected |
| Runtime pair | Matching working bytes; working source and curated source pass Node syntax checks |

Independent checks include Cartesian RK4 agreement with the Kepler coast, energy and angular-momentum conservation, position derivatives, three-dimensional solar-disc ray sampling, finite Earth limb geometry, event crossings, plan changes, forged saves, replay and archive evidence. The curated source also runs the existing insertion and injection checks. Chromium covers seven existing insertion workflows and five new environment workflows.

## Findings during verification

The initial environment-only unit run had a fixture beyond the finite radio limb and one slow test. The fixture was corrected. An earlier full run passed 495 of 502 checks, with timeout and subsequent teardown failures in existing focus and transit files; those 12 checks passed unchanged in a focused rerun. One command session ended before writing its report and was restarted after confirming no surviving test process.

A later 501-of-502 run exposed a real delayed-handoff defect. The existing one-second lock expired while a slow action was running. A controlled-clock regression reproduced a doubled lunar handoff reward (30 XP instead of 15). The guard now retains the accepted action within its render. The handoff checks, exact commit candidate and final complete 503-check suite passed.

Earlier browser reports retain a Sun-control attribute collision, a driver-latency timing assertion and a disk-full screenshot attachment error. The control attribute is now unique. The resume check directly asserts equality on the first visible animation frame, followed by a bounded second-frame step. The final complete run passed all 12 workflows with the same runner timeouts. Duplicate generated browser recordings were removed after verifying their paths and untracked status. Final video and trace recording were disabled to reduce storage use. The failure JSON and reviewed captures remain. The temporary configuration resolved its JSON report inside the report folder; that final JSON was copied to the primary report location without changing its contents.

[Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/verification.json) · [Full unit report](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/unit-verified.json) · [Candidate report](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/candidate-verified.json) · [Chromium report](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser-verified.json)

## Captures

- [earth contact](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/earth-contact-chromium.png)
- [environment phone 320](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/environment-phone-320-chromium.png)
- [partial eclipse](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/partial-eclipse-chromium.png)
- [sun 135 comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/sun-135-comparison-chromium.png)
- [sunlit far side](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/sunlit-far-side-chromium.png)
- [total eclipse earth contact](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/moon-mission-enhancement-pass11-2026-09-29/browser/total-eclipse-earth-contact-chromium.png)

## Commit scope

The canonical and public runtimes receive the same change. The existing insertion browser spec gains an optional report-directory setting so this pass’s captures stay in this report folder. The commit candidate removes the 34 recorded pre-existing Moonwalk hunks from the source in memory; the working runtime pair retains those hunks. Shared handoff notes, the existing LRV test edit and pre-existing Moonwalk test files stay outside this commit. The commit script uses a separate index and checks selected paths, source hashes, the parent commit and unrelated index entries.
