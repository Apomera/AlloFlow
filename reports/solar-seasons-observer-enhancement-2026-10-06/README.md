# Seasons observer enhancement — 2026-10-06

The Solar System seasons lab now pairs daylight with a local-noon horizon view. Earth locations share a fixed 24-hour day/night scale, and the Sun’s elevation remains signed during polar night. The main 45° comparison keeps its relative sunlight normalization and now explains that scale. Mars and Uranus explicitly identify their normalized 24-hour rotation scale in the readout, accessible description, and journal.

The orbit diagram has more room for its labels and fixed axis. Checkpoint names distinguish exact positions from nearby positions, fractional restored geometry is retained, and the phone layout stacks the observer cards. Small text is raised to 13 pixels, controls have 44-pixel targets, and diagrams retain local horizontal scrolling.

Restored guided observations must match the actual Earth model at ±45° at their checkpoint before counting as captured evidence. Invalid records remain recoverable through an explicit recapture. The original guided prediction survives rapid clicks, nested updates preserve both observations and authored prose, and all three journal save paths reject duplicate or obsolete callbacks. Malformed restores are handled without silently rewriting the saved state.

## Model assumptions

The model uses the Sun’s center at an ideal level horizon. Earth readings are Earth hours; Mars/Uranus readings are normalized fractions of a rotation expressed on a 24-hour scale. The latitude view shows elevation only, with no compass direction or Sun path. Orbital position advances uniformly and is not an exact calendar date. The model omits atmosphere, refraction, terrain, twilight, weather, and climate response; polar night can still include twilight.

The geometry and explanatory boundaries were reviewed against [NASA’s seasons explanation](https://spaceplace.nasa.gov/seasons/en/), [NOAA’s solar equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF), [NOAA’s solar glossary](https://gml.noaa.gov/grad/solcalc/glossary.html), and [NASA’s Uranus facts](https://science.nasa.gov/uranus/facts/).

## Verification artifacts

The implementation is updated in both canonical and desktop assets. They are identical, syntax-valid, and pass the scoped whitespace check. No commits were made. [verification-summary.json](verification-summary.json) records source hashes and the limits below.

The initial focused suite passed all **26 cases**, and **49 existing regression cases** passed across the original run and a targeted retry. Two old full-tree cases exceeded their time allowance; one static hub assertion expected the smaller counter style and was updated to check the visible counter hook and text. Original and retry logs remain intact. These 75 cases were verified before the final committed-button guard adjustment.

A browser check exposed a React render that could be discarded after a same-value state update while still advancing the save guard. The guard now tracks the buttons React actually commits, and rejects callbacks whose captured state has been superseded. All **six new regression cases passed** on the final source, covering all three save routes, discarded renders, newer commits, duplicate clicks, and preservation of pending journal evidence. See [unit-commit-regressions-results.json](unit-commit-regressions-results.json).

The broader final-source focused attempt passed **18 cases** before a native allocation failure. The browser rerun confirmed the previously failing fractional-position save case, then did not complete cleanly because workers crashed or timed out. Windows reported only 668 MB of available virtual memory, about 97% committed. Task-local smaller Node heap settings were used; machine-wide settings were not changed. A clean final 32-case focused run and 22-case browser run are therefore **not claimed**.

The earlier **18 visual states** passed at 320, 736, and 1060-pixel widths in both themes, with no page overflow or browser errors. Minimum measured DOM text contrast was 5.36:1; text was at least 13 pixels and controls were at least 44 pixels. A later browser assertion found one 10-pixel orbit SVG caption. It has been enlarged to 13 pixels and shortened, and the capture harness now checks SVG text too; final recapture remains incomplete under the host memory constraint. The observer-card markup in these previews is unchanged by that caption or the later save guards.

[Desktop observer preview](after-seasons-noon-observers.png) · [phone observer preview](after-seasons-phone-observers.png) · [visual metrics](after-metrics.json).

The baseline capture timed out; no before/after screenshot comparison is claimed. The original source hash guards against mislabeled baseline recaptures. Earlier Solar System enhancements and unrelated workspace changes are preserved.
