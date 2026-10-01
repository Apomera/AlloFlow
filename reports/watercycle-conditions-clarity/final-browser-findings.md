# Conditions clarity: final browser findings

**771 of 771 checks passed**, with 135 rendered snapshots, 18 clean scoped axe audits, and no JavaScript errors. The corrected preflight passed 38 of 38 checks across phone, desktop, and narrow embedded layouts.

## Runtime and method

Source, public mirror, and frozen tested runtime have the same SHA-256:

`239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003`

The harness serves the frozen actual runtime through an owned ephemeral localhost server and isolated Chromium. It does not use learner tabs or port 8770. It exercises native controls and reads actual DOM/SVG geometry and computed styles. Model-unit correctness remains the responsibility of the separate regression suite; this browser pass checks that the rendered values agree with the shared existing model.

Configurations: light at 320, 390, 768, and 1280px; dark at 1280px; forced colors at 320px; dark with forced colors at 1280px; a 390px host inside a 1280px viewport; and app high-contrast mode at 320px.

## Verified behavior and clarity

- All five ranges and both scoped Reset buttons measure 44px high. Native Tab visits each lab control in DOM order with visible focus. Native range steps and desktop Home/End retain their original scales. Every categorical option is exercised on desktop, with alternate choices checked in the remaining configurations.
- All five range descriptions and the three category definitions resolve. Land outputs visibly show their /100 scale. Sunlight and wind reference hints distinguish the model reference from a saved comparison baseline. Checked endpoint labels, input hints, and pathway copy are at least 12px, and endpoint labels do not overlap.
- The actual panel width controls the layout. Climate has one column on phones and in the narrow host, two at 768px, and three at 1280px. The narrow response uses a full-width row. Both labs fit every tested viewport without clipped content or horizontal page overflow. Category checkmarks remain beside their labels.
- The two fixed SVG diagrams show water moving over the surface versus crossing the surface into soil pores. Their drawing bounds stay inside the SVG scenes; the diagrams remain unchanged as scores vary. Exact values are separate from direction cues. The baseline remains runoff 47/100 and infiltration 55/100. Heavy storm remains 88/100 and 14/100, with evaporation index 0.64×.
- The evaporation value at `[data-evaporation-index]` is exposed inside the live climate response. Wind changes update the transport input while leaving the evaporation index unchanged when sunlight and temperature are held fixed.
- Heavy storm sets all eight existing preset inputs and displays the weather-and-land scope note while Land is folded. Climate Reset restores only weather; Land Reset restores only its five inputs.
- Range changes, all exercised choices, resets, preset selection, native Tab navigation, and disclosure toggles preserve the paused infiltrating parcel at progress 0.37, the saved baseline, comparison writing, and a complete recorded observation with input snapshots, notes, and metrics.
- Forced-color pathway guides, pores, and starting points use opaque system ink/paper. Both open and closed lab summary cues use explicit CanvasText/Canvas colors and change glyph with state. All 18 scoped lab audits pass, including dark with forced colors.

The expanded Land lab is taller because it includes input definitions and separate pathway cards. At 320px it measures about 1997px; its native disclosure remains available to fold the lab.

## Captures

- Phone: [Climate 320](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/climate-light-320.png) · [Land 320](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/land-light-320.png)
- Desktop: [Climate 1280](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/climate-light-1280.png) · [Land 1280](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/land-light-1280.png)
- Narrow host: [Climate in 390px host](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/climate-light-1280-host390.png) · [Land in 390px host](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/land-light-1280-host390.png)
- Forced phone: [Climate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/climate-light-forced-colors-320.png) · [Land](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/land-light-forced-colors-320.png)
- Dark with forced colors: [Climate](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/climate-dark-forced-colors-1280-heavy-storm.png) · [Land](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/watercycle-conditions-clarity/land-dark-forced-colors-1280-heavy-storm.png)

## Preserved diagnostics and completion

The original frozen baseline and `baseline-results.json` remain intact. `results-initial.json` preserves the first candidate's completed 668-pass/23-fail diagnostic: Climate endpoints inherited 11px; legacy rules compressed the narrow host into three columns and prevented the intended tablet layout; one dark/forced-color axe audit read pale underlying dark styles even though the screenshot painted legible system text. The corrected explicit styles make computed colors and system rendering agree. `diagnostic-runtime.js`, the initial preflight report, and key diagnostic captures are also retained.

Final `results.json`: `completed`, `successful`, `browserClosed`, and `serverClosed` are true; failures and errors are empty. The owned Node process exited 0. The final live source matched the frozen source through completion, and source/public/frozen hashes were independently reconfirmed afterward. No runtime or Git writes were made by this browser QA task.
