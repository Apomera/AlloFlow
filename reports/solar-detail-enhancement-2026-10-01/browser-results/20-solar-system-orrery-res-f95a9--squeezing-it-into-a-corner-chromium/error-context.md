# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 20-solar-system-orrery-responsive.spec.ts >> keeps mobile stage guidance readable instead of squeezing it into a corner
- Location: tests\e2e\20-solar-system-orrery-responsive.spec.ts:265:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Timeout: 15000ms
- Expected substring  -  1
+ Received string     + 11

- e · eccentricity
+ 🌍 Solar System ExplorerOrreryMission dashboard0/6 journeys complete · 0 journal recordsCollapse dashboardChoose a journey. Pick up where your evidence leaves off.↗Earth → Mars expedition0/4 checkpoints☀Opposite seasons0/4 checkpoints◎Orbital detectives0/3 checkpoints◇Five science investigations0/5 checkpoints◐Earth + Jupiter comparison0/4 checkpoints⬡Collect → review → explore0/2 checkpoints↗Earth → Mars expeditionConnect a launch experiment, surface evidence, and your explanation.1. Predict2. Compare arrivals3. Scan + sample4. Save reportNext: Predict the effect of launch alignmentStart Earth-to-Mars missionOpen evidence journalEvidence preview · 0 recordsNo evidence yet. Your recorded observations will appear here.Checkpoints reflect activity records and saved work. Written explanations are not automatically graded.Science notes · reviewed August 2026MeasuredObserved or calculated from measured values.ModeledA scientific simplification used to test relationships.HypothesisA plausible explanation or counterfactual with uncertainty.Keplerian simulation: Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.Primary referencesJPL planetary parametersradii, gravity, rotation, and orbital periodsNASA Solar Systemplanet and moon overviewsMars InSight inner-core analysis2025 seismic evidence for a roughly 600 km solid inner coreIAU planet definitionplanet and dwarf-planet classificationStart hereFree orbit ExplorerChoose a world, choose a view, and collect evidence at your own pace.Orbit modelChoose a scientific lensKeplerian simulationExploreInspect a world, its surface, atmosphere, and interior.Size scaleCompare two worlds using the same linear diameter scale.Orbit modelTest orbit shape, speed, period, and transfer ideas.Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.Build a scale walkProgress dashboard • 0/9 worlds visitedWorlds visited0/90% completeResearch points00 lifetimeChallenges0/18active badgesSamples + notes0 / 0samples / journal1. Choose a worldSelect stem.solar_sys.mercury to begin the tourstem.solar_sys.mercuryRockystem.solar_sys.venusRockystem.solar_sys.earthRockystem.solar_sys.marsRockystem.solar_sys.jupiterGas giantstem.solar_sys.saturnGas giantstem.solar_sys.uranusIce giantstem.solar_sys.neptuneIce giantstem.solar_sys.plutoDwarf worldIllustrative portraits · not to scaleRings shown on all four giant planetsGreen dot = visitedReference worldstem.solar_sys.earthEarth is shown as a familiar reference. Select any destination above to focus this display.Rockystem.solar_sys.earthIllustrative portrait · not to scale1 moonsDiameter12,742 kmGravity1.0gDay24 hoursYear365.25 daysAtmosphere78% N₂, 21% O₂ — the only breathable atmosphereSurfaceOceans, continents, ice caps, forests2. Choose a view3D ExplorerOpenSee a world up close and gather surface evidence.Orrery LabActiveLearn orbit motion, Kepler laws, and transfers.3. Pick a goalPath: Free ExploreVocab: 0/17Next: stem.solar_sys.mercuryStart with stem.solar_sys.mercuryInvestigation HubComplete each existing lab at your own pace. Predictions and saved evidence remain available.0/5 completeLearn step by step · Opposite seasonsPredict → capture two observations → check a claim → explain. Get feedback tied to your evidence.Start guided seasons investigationEvidence ConstellationEach bright point marks an investigation with gathered evidence.0%🔍CompareNot started☀SeasonsNot started📡SignalNot started⚖GravityNot started🌙MoonNot startedNext: Visual CompareEvidence → explanation0/5 labs with linked evidence · 0/5 with an explanationLab saves now link to your journal. Add your reasoning to an observation to record an explanation. These indicators track saved work, not a grade.Review explanations in journalConnect evidence across labs🔍Next upVisual CompareCompare size, gravity, time cycles, and environments.No linked journal evidence yet☀Not startedTilt + SeasonsTest how axial tilt changes sunlight geometry.No linked journal evidence yet📡Not startedSignal DelayMove worlds and measure light-travel time.No linked journal evidence yet⚖Not startedGravity DropSeparate mass, weight force, and free fall.No linked journal evidence yet🌙Not startedMoon + EclipsesConnect phase, orbital tilt, nodes, and eclipse alignment.No linked journal evidence yetOptional guided pathEarth → Jupiter evidence trail0/4Prefer step-by-step guidance? Observe, compare, test an orbit, then support a claim with evidence.Start four-step mission✓ 🌌 Full OrreryI I EllipsesII II AreasIII III Periods🔧 Workshop🚀 Transfers🏆 Challenges❓ True/False🔬 Kepler InquirySection 1 of 91 / 9 sections sampled0 / 3 Kepler laws explored0 / 3 guided missions completeNext suggested: I EllipsesGo to I Ellipses →🌌Full orrery — animated solar systemEight planets plus Pluto follow measured orbital shapes and relative speeds. The main map shares one orbital-distance scale; markers are compressed and clamped, and the inner-system inset is magnified.Guided mission🌍 Earth live orbit0/3 complete1Earth live orbitCurrent2Mercury speed zoneUpcoming3Longer yearUpcomingPause the orbit clock and predict: is Earth currently closer to or farther from the Sun than 1 AU?Focus Earth and pauseInspect first, then predict.▶ PlaySpeed1.0 yr/sEarth completes one orbit in about 1.0 s at 1.0 Earth yr/s.PhaseOrbit landmarksNear perihelionPerihelionQuarter orbitAphelionThree-quarter orbitNext perihelion0.00 / 1.00 yr · Earth year 1 · day 1Jump☀ PerihelionQuarter orbit❄ AphelionThree-quarter orbit☀ Next perihelionMap display optionsReset viewMarker size:TeachingComparativeRadius-informed · compressed and clampedZoom:InnerFullOuterShow:☄ Comets⚳ DwarfsMotion + gravityAa LabelsRockyEarthSelect a worldChoose a world...☿ Mercury♀ Venus🌍 Earth♂ Mars♃ Jupiter♄ Saturn⛢ Uranus♆ Neptune♇ Pluto⚳ Ceres⬭ Haumea⚷ Eris☄ Halley’s Comet☄ Encke’s CometOrbital period1.00 Earth yearsFollow cameraCompare Earth withChoose another world...☿ Mercury♀ Venus♂ Mars♃ Jupiter♄ Saturn⛢ Uranus♆ Neptune♇ Pluto⚳ Ceres⬭ Haumea⚷ Eris☄ Halley’s Comet☄ Encke’s CometFocused: EarthKeyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selectionLive orbit mapEarth in focusPausedComparative markersFocus: EarthLive readingEarthDistance 0.983 AU · speed 30.29 km/s · Near perihelionDistance from Sun0.983AUOrbital speed30.29km/sOrbital phaseNear perihelionHabitable zoneOrbit pathsRuler: 50 AUMagnified inner insetComparative marker sizes→Velocity vectorEqual-time sweepMore key items →Arrow = direction/relative speed · wedge = equal time · use Follow camera to keep it centered, then pan or zoom to release · hover for detailsTravel direction and gravity are differentSolid cyan arrow: velocity, tangent to the orbit. Dashed purple arrow: gravity toward the Sun. Gravity changes velocity; it does not have to point along the path.Nearly circular orbit: gravity mainly changes the direction of motion, while speed changes only a little.Try Mercury at quarter orbit and three-quarter orbit. Arrow lengths are teaching cues; the gravity arrow shows direction only. This view uses the same simplified orbit plane as the map.Explore orbital motion · NASAModel note: marker sizes are radius-informed but compressed and clamped for visibility; distances use the zoom scale, so this is not one literal scale. The blue ruler shows the current map distance. The magnified inner-system inset uses one common orbital-distance scale for Mercury through Mars; its markers are enlarged for visibility.RockyEarth✖Our home — liquid water, magnetosphere, life.Current readingDistance from Sun0.983 AUOrbital speed30.29 km/sOrbital phaseNear perihelionOrbit and world propertiesOrbit size (a)1.000 AUOrbit shape (e)0.0167Orbital period (T)1.00 yrOrbit tilt (i)0.0°Closest to Sun0.983 AUFarthest from Sun1.017 AUMass1.0000 M⊕Radius6371 kmShape (e): 0 is circular; higher values mean a more stretched orbit. Tilt (i) is measured from the model’s reference plane.Earth: distance 0.983 AU; speed 30.29 km/s; phase Near perihelionKepler II cueEqual areas in equal times mean closer to the Sun → faster; farther away → slower.Earth is inside its semi-major axis a (1.000 AU). Inside a: moving faster than the reference speed at a.Reference at a: 29.79 km/s · Current: 30.29 km/sKepler III check: T² / a³ = 1.000 yr²/AU³ ≈ 1 for a Sun-centered orbit.Perihelion · closestAphelion · farthestEarth is near perihelion (closest) at 0.983 AU; speed 30.29 km/s.a = 1.000 AUmarker = current distanceCompare orbitsChoose a world to compare orbital size, timing, distance, and speed.Orbital evidence snapshotsCapture A → predict → capture B → compareNext: capture ASave ASave BClearExport evidenceSaving pauses the clockA · emptyB · emptySave A, choose a prediction, move the body along its orbit, then save B to compare evidence.Orbit rhythm · EarthEarth: equal time, changing speedTwelve dots mark equal time intervals. The Sun is at one focus. The shaded regions after perihelion and aphelion each cover one twelfth of the orbital period and have equal area. When next-step preview is on, one blue wedge instead shows the upcoming twelfth of the orbit and a diamond marks its endpoint. The solid outlined marker follows the current simulation time. A dotted ring marks the same distance on the other leg of the orbit. Tangent arrows show each position's direction of travel; arrow length does not represent speed.SunAphelionPerihelionSpeed through one orbitEarth: orbital speed over timeSpeed relative to the Sun, in kilometers per second, on a zero-based axis. The horizontal axis is elapsed time as a percentage of one orbit, starting at perihelion. The outlined point and dashed cursor follow the shared orbit clock. A dotted ring marks the same speed on the other leg. The curve connects 193 model samples.Speed (km/s)020400%50%100%Elapsed time in one orbitInspect orbit time0.0% of orbit · at a turning point in distanceInspect matching distanceNow: 0.983 AU from the Sun · 30.29 km/s← Back 1/12Forward 1/12 →Preview next stepSolid ring: now. Dotted ring: same distance, same speed. Arrows show direction only.How to read these viewsEach gap between dots represents 30.4 Earth days: 1/12 of Earth’s orbit. Wider spacing means faster travel. With preview off, both shaded regions sweep out equal areas. Turn on Preview next step to follow one equal-time wedge: its shape changes around the orbit, but its area stays the same. Forward 1/12 moves the planet to the diamond.Closest: 30.29 km/sFarthest: 29.29 km/sAt matching distances on the two legs, speed is equal but velocity points in different directions. At the closest and farthest points, the two positions meet.0% and 100%: closest · 50%: farthest. Inspecting pauses the shared clock. The speed axis starts at zero; its upper limit depends on the selected world.This orbit is nearly circular, so the spacing is nearly even. Try Mercury to see a stronger change. Steps pause the shared clock and wrap around one orbit. Shape is preserved; markers are enlarged. This is an orbit-plane model, not a dated sky map.Explore Kepler’s laws · NASA
+
+
+
+
+
+
+
+
+
+

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('body')
    28 × locator resolved to <body>…</body>
       - unexpected value "🌍 Solar System ExplorerOrreryMission dashboard0/6 journeys complete · 0 journal recordsCollapse dashboardChoose a journey. Pick up where your evidence leaves off.↗Earth → Mars expedition0/4 checkpoints☀Opposite seasons0/4 checkpoints◎Orbital detectives0/3 checkpoints◇Five science investigations0/5 checkpoints◐Earth + Jupiter comparison0/4 checkpoints⬡Collect → review → explore0/2 checkpoints↗Earth → Mars expeditionConnect a launch experiment, surface evidence, and your explanation.1. Predict2. Compare arrivals3. Scan + sample4. Save reportNext: Predict the effect of launch alignmentStart Earth-to-Mars missionOpen evidence journalEvidence preview · 0 recordsNo evidence yet. Your recorded observations will appear here.Checkpoints reflect activity records and saved work. Written explanations are not automatically graded.Science notes · reviewed August 2026MeasuredObserved or calculated from measured values.ModeledA scientific simplification used to test relationships.HypothesisA plausible explanation or counterfactual with uncertainty.Keplerian simulation: Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.Primary referencesJPL planetary parametersradii, gravity, rotation, and orbital periodsNASA Solar Systemplanet and moon overviewsMars InSight inner-core analysis2025 seismic evidence for a roughly 600 km solid inner coreIAU planet definitionplanet and dwarf-planet classificationStart hereFree orbit ExplorerChoose a world, choose a view, and collect evidence at your own pace.Orbit modelChoose a scientific lensKeplerian simulationExploreInspect a world, its surface, atmosphere, and interior.Size scaleCompare two worlds using the same linear diameter scale.Orbit modelTest orbit shape, speed, period, and transfer ideas.Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.Build a scale walkProgress dashboard • 0/9 worlds visitedWorlds visited0/90% completeResearch points00 lifetimeChallenges0/18active badgesSamples + notes0 / 0samples / journal1. Choose a worldSelect stem.solar_sys.mercury to begin the tourstem.solar_sys.mercuryRockystem.solar_sys.venusRockystem.solar_sys.earthRockystem.solar_sys.marsRockystem.solar_sys.jupiterGas giantstem.solar_sys.saturnGas giantstem.solar_sys.uranusIce giantstem.solar_sys.neptuneIce giantstem.solar_sys.plutoDwarf worldIllustrative portraits · not to scaleRings shown on all four giant planetsGreen dot = visitedReference worldstem.solar_sys.earthEarth is shown as a familiar reference. Select any destination above to focus this display.Rockystem.solar_sys.earthIllustrative portrait · not to scale1 moonsDiameter12,742 kmGravity1.0gDay24 hoursYear365.25 daysAtmosphere78% N₂, 21% O₂ — the only breathable atmosphereSurfaceOceans, continents, ice caps, forests2. Choose a view3D ExplorerOpenSee a world up close and gather surface evidence.Orrery LabActiveLearn orbit motion, Kepler laws, and transfers.3. Pick a goalPath: Free ExploreVocab: 0/17Next: stem.solar_sys.mercuryStart with stem.solar_sys.mercuryInvestigation HubComplete each existing lab at your own pace. Predictions and saved evidence remain available.0/5 completeLearn step by step · Opposite seasonsPredict → capture two observations → check a claim → explain. Get feedback tied to your evidence.Start guided seasons investigationEvidence ConstellationEach bright point marks an investigation with gathered evidence.0%🔍CompareNot started☀SeasonsNot started📡SignalNot started⚖GravityNot started🌙MoonNot startedNext: Visual CompareEvidence → explanation0/5 labs with linked evidence · 0/5 with an explanationLab saves now link to your journal. Add your reasoning to an observation to record an explanation. These indicators track saved work, not a grade.Review explanations in journalConnect evidence across labs🔍Next upVisual CompareCompare size, gravity, time cycles, and environments.No linked journal evidence yet☀Not startedTilt + SeasonsTest how axial tilt changes sunlight geometry.No linked journal evidence yet📡Not startedSignal DelayMove worlds and measure light-travel time.No linked journal evidence yet⚖Not startedGravity DropSeparate mass, weight force, and free fall.No linked journal evidence yet🌙Not startedMoon + EclipsesConnect phase, orbital tilt, nodes, and eclipse alignment.No linked journal evidence yetOptional guided pathEarth → Jupiter evidence trail0/4Prefer step-by-step guidance? Observe, compare, test an orbit, then support a claim with evidence.Start four-step mission✓ 🌌 Full OrreryI I EllipsesII II AreasIII III Periods🔧 Workshop🚀 Transfers🏆 Challenges❓ True/False🔬 Kepler InquirySection 1 of 91 / 9 sections sampled0 / 3 Kepler laws explored0 / 3 guided missions completeNext suggested: I EllipsesGo to I Ellipses →🌌Full orrery — animated solar systemEight planets plus Pluto follow measured orbital shapes and relative speeds. The main map shares one orbital-distance scale; markers are compressed and clamped, and the inner-system inset is magnified.Guided mission🌍 Earth live orbit0/3 complete1Earth live orbitCurrent2Mercury speed zoneUpcoming3Longer yearUpcomingPause the orbit clock and predict: is Earth currently closer to or farther from the Sun than 1 AU?Focus Earth and pauseInspect first, then predict.▶ PlaySpeed1.0 yr/sEarth completes one orbit in about 1.0 s at 1.0 Earth yr/s.PhaseOrbit landmarksNear perihelionPerihelionQuarter orbitAphelionThree-quarter orbitNext perihelion0.00 / 1.00 yr · Earth year 1 · day 1Jump☀ PerihelionQuarter orbit❄ AphelionThree-quarter orbit☀ Next perihelionMap display optionsReset viewMarker size:TeachingComparativeRadius-informed · compressed and clampedZoom:InnerFullOuterShow:☄ Comets⚳ DwarfsMotion + gravityAa LabelsRockyEarthSelect a worldChoose a world...☿ Mercury♀ Venus🌍 Earth♂ Mars♃ Jupiter♄ Saturn⛢ Uranus♆ Neptune♇ Pluto⚳ Ceres⬭ Haumea⚷ Eris☄ Halley’s Comet☄ Encke’s CometOrbital period1.00 Earth yearsFollow cameraCompare Earth withChoose another world...☿ Mercury♀ Venus♂ Mars♃ Jupiter♄ Saturn⛢ Uranus♆ Neptune♇ Pluto⚳ Ceres⬭ Haumea⚷ Eris☄ Halley’s Comet☄ Encke’s CometFocused: EarthKeyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selectionLive orbit mapEarth in focusPausedComparative markersFocus: EarthLive readingEarthDistance 0.983 AU · speed 30.29 km/s · Near perihelionDistance from Sun0.983AUOrbital speed30.29km/sOrbital phaseNear perihelionHabitable zoneOrbit pathsRuler: 50 AUMagnified inner insetComparative marker sizes→Velocity vectorEqual-time sweepMore key items →Arrow = direction/relative speed · wedge = equal time · use Follow camera to keep it centered, then pan or zoom to release · hover for detailsTravel direction and gravity are differentSolid cyan arrow: velocity, tangent to the orbit. Dashed purple arrow: gravity toward the Sun. Gravity changes velocity; it does not have to point along the path.Nearly circular orbit: gravity mainly changes the direction of motion, while speed changes only a little.Try Mercury at quarter orbit and three-quarter orbit. Arrow lengths are teaching cues; the gravity arrow shows direction only. This view uses the same simplified orbit plane as the map.Explore orbital motion · NASAModel note: marker sizes are radius-informed but compressed and clamped for visibility; distances use the zoom scale, so this is not one literal scale. The blue ruler shows the current map distance. The magnified inner-system inset uses one common orbital-distance scale for Mercury through Mars; its markers are enlarged for visibility.RockyEarth✖Our home — liquid water, magnetosphere, life.Current readingDistance from Sun0.983 AUOrbital speed30.29 km/sOrbital phaseNear perihelionOrbit and world propertiesOrbit size (a)1.000 AUOrbit shape (e)0.0167Orbital period (T)1.00 yrOrbit tilt (i)0.0°Closest to Sun0.983 AUFarthest from Sun1.017 AUMass1.0000 M⊕Radius6371 kmShape (e): 0 is circular; higher values mean a more stretched orbit. Tilt (i) is measured from the model’s reference plane.Earth: distance 0.983 AU; speed 30.29 km/s; phase Near perihelionKepler II cueEqual areas in equal times mean closer to the Sun → faster; farther away → slower.Earth is inside its semi-major axis a (1.000 AU). Inside a: moving faster than the reference speed at a.Reference at a: 29.79 km/s · Current: 30.29 km/sKepler III check: T² / a³ = 1.000 yr²/AU³ ≈ 1 for a Sun-centered orbit.Perihelion · closestAphelion · farthestEarth is near perihelion (closest) at 0.983 AU; speed 30.29 km/s.a = 1.000 AUmarker = current distanceCompare orbitsChoose a world to compare orbital size, timing, distance, and speed.Orbital evidence snapshotsCapture A → predict → capture B → compareNext: capture ASave ASave BClearExport evidenceSaving pauses the clockA · emptyB · emptySave A, choose a prediction, move the body along its orbit, then save B to compare evidence.Orbit rhythm · EarthEarth: equal time, changing speedTwelve dots mark equal time intervals. The Sun is at one focus. The shaded regions after perihelion and aphelion each cover one twelfth of the orbital period and have equal area. When next-step preview is on, one blue wedge instead shows the upcoming twelfth of the orbit and a diamond marks its endpoint. The solid outlined marker follows the current simulation time. A dotted ring marks the same distance on the other leg of the orbit. Tangent arrows show each position's direction of travel; arrow length does not represent speed.SunAphelionPerihelionSpeed through one orbitEarth: orbital speed over timeSpeed relative to the Sun, in kilometers per second, on a zero-based axis. The horizontal axis is elapsed time as a percentage of one orbit, starting at perihelion. The outlined point and dashed cursor follow the shared orbit clock. A dotted ring marks the same speed on the other leg. The curve connects 193 model samples.Speed (km/s)020400%50%100%Elapsed time in one orbitInspect orbit time0.0% of orbit · at a turning point in distanceInspect matching distanceNow: 0.983 AU from the Sun · 30.29 km/s← Back 1/12Forward 1/12 →Preview next stepSolid ring: now. Dotted ring: same distance, same speed. Arrows show direction only.How to read these viewsEach gap between dots represents 30.4 Earth days: 1/12 of Earth’s orbit. Wider spacing means faster travel. With preview off, both shaded regions sweep out equal areas. Turn on Preview next step to follow one equal-time wedge: its shape changes around the orbit, but its area stays the same. Forward 1/12 moves the planet to the diamond.Closest: 30.29 km/sFarthest: 29.29 km/sAt matching distances on the two legs, speed is equal but velocity points in different directions. At the closest and farthest points, the two positions meet.0% and 100%: closest · 50%: farthest. Inspecting pauses the shared clock. The speed axis starts at zero; its upper limit depends on the selected world.This orbit is nearly circular, so the spacing is nearly even. Try Mercury to see a stronger change. Steps pause the shared clock and wrap around one orbit. Shape is preserved; markers are enlarged. This is an orbit-plane model, not a dated sky map.Explore Kepler’s laws · NASA









"

```

```yaml
- button "Back to tools"
- heading "🌍 Solar System Explorer" [level=3]
- text: Orrery
- region "Mission dashboard":
  - heading "Mission dashboard" [level=2]
  - paragraph: 0/6 journeys complete · 0 journal records
  - button "Collapse dashboard" [expanded]
  - paragraph: Choose a journey. Pick up where your evidence leaves off.
  - group "Choose a science journey":
    - button "Earth → Mars expedition 0/4 checkpoints" [pressed]
    - button "Opposite seasons 0/4 checkpoints"
    - button "Orbital detectives 0/3 checkpoints"
    - button "Five science investigations 0/5 checkpoints"
    - button "Earth + Jupiter comparison 0/4 checkpoints"
    - button "Collect → review → explore 0/2 checkpoints"
  - heading "Earth → Mars expedition" [level=3]
  - paragraph: Connect a launch experiment, surface evidence, and your explanation.
  - list "Journey checkpoints":
    - listitem: 1. Predict
    - listitem: 2. Compare arrivals
    - listitem: 3. Scan + sample
    - listitem: 4. Save report
  - paragraph: "Next: Predict the effect of launch alignment"
  - button "Start Earth-to-Mars mission"
  - button "Open evidence journal"
  - group: Evidence preview · 0 records
  - paragraph: Checkpoints reflect activity records and saved work. Written explanations are not automatically graded.
- group: Science notes · reviewed August 2026
- text: Start here
- heading "Free orbit Explorer" [level=4]
- paragraph: Choose a world, choose a view, and collect evidence at your own pace.
- text: Orbit model
- group "Scientific model lens":
  - text: Choose a scientific lensKeplerian simulation
  - button "ExploreInspect a world, its surface, atmosphere, and interior."
  - button "Size scaleCompare two worlds using the same linear diameter scale."
  - button "Orbit modelTest orbit shape, speed, period, and transfer ideas." [pressed]
  - note: Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.
  - button "Build a scale walk"
- group: Progress dashboard • 0/9 worlds visited
- text: 1. Choose a worldSelect stem.solar_sys.mercury to begin the tour
- button "Select stem.solar_sys.mercury from mission control": stem.solar_sys.mercury Rocky
- button "Select stem.solar_sys.venus from mission control": stem.solar_sys.venus Rocky
- button "Select stem.solar_sys.earth from mission control": stem.solar_sys.earth Rocky
- button "Select stem.solar_sys.mars from mission control": stem.solar_sys.mars Rocky
- button "Select stem.solar_sys.jupiter from mission control": stem.solar_sys.jupiter Gas giant
- button "Select stem.solar_sys.saturn from mission control": stem.solar_sys.saturn Gas giant
- button "Select stem.solar_sys.uranus from mission control": stem.solar_sys.uranus Ice giant
- button "Select stem.solar_sys.neptune from mission control": stem.solar_sys.neptune Ice giant
- button "Select stem.solar_sys.pluto from mission control": stem.solar_sys.pluto Dwarf world
- note: Illustrative portraits · not to scaleRings shown on all four giant planetsGreen dot = visited
- figure "Reference world spotlight for stem.solar_sys.earth":
  - text: Reference world
  - heading "stem.solar_sys.earth" [level=5]
  - paragraph: Earth is shown as a familiar reference. Select any destination above to focus this display.
  - text: Rocky Diameter 12,742 km Gravity 1.0g Day 24 hours Year 365.25 days
  - strong: Atmosphere
  - text: 78% N₂, 21% O₂ — the only breathable atmosphere
  - strong: Surface
  - text: Oceans, continents, ice caps, forests
- group "Explorer view":
  - text: 2. Choose a view
  - button "3D ExplorerOpen See a world up close and gather surface evidence.":
    - text: 3D ExplorerOpen
    - paragraph: See a world up close and gather surface evidence.
  - button "Orrery LabActive Learn orbit motion, Kepler laws, and transfers." [pressed]:
    - text: Orrery LabActive
    - paragraph: Learn orbit motion, Kepler laws, and transfers.
- text: "3. Pick a goal Path: Free ExploreVocab: 0/17Next: stem.solar_sys.mercury"
- button "Start with stem.solar_sys.mercury"
- region "Investigation Hub":
  - text: Investigation Hub
  - paragraph: Complete each existing lab at your own pace. Predictions and saved evidence remain available.
  - text: 0/5 complete Learn step by step · Opposite seasons
  - paragraph: Predict → capture two observations → check a claim → explain. Get feedback tied to your evidence.
  - button "Start guided seasons investigation"
  - text: Evidence Constellation
  - status: Each bright point marks an investigation with gathered evidence.
  - text: 0%
  - progressbar "Investigation evidence progress"
  - list "Investigation evidence states":
    - 'listitem "Visual Compare: Not started. Recommended next."': CompareNot started
    - 'listitem "Tilt + Seasons: Not started"': SeasonsNot started
    - 'listitem "Signal Delay: Not started"': SignalNot started
    - 'listitem "Gravity Drop: Not started"': GravityNot started
    - 'listitem "Moon + Eclipses: Not started"': MoonNot started
  - 'button "Next: Visual Compare"'
  - region "Evidence → explanation":
    - heading "Evidence → explanation" [level=4]
    - status: 0/5 labs with linked evidence · 0/5 with an explanation
    - paragraph: Lab saves now link to your journal. Add your reasoning to an observation to record an explanation. These indicators track saved work, not a grade.
    - button "Review explanations in journal" [disabled]
    - button "Connect evidence across labs"
  - button "Visual Compare. Not started. Recommended next.": 🔍Next up Visual CompareCompare size, gravity, time cycles, and environments.No linked journal evidence yet
  - button "Tilt + Seasons. Not started": ☀Not started Tilt + SeasonsTest how axial tilt changes sunlight geometry.No linked journal evidence yet
  - button "Signal Delay. Not started": 📡Not started Signal DelayMove worlds and measure light-travel time.No linked journal evidence yet
  - button "Gravity Drop. Not started": ⚖Not started Gravity DropSeparate mass, weight force, and free fall.No linked journal evidence yet
  - button "Moon + Eclipses. Not started": 🌙Not started Moon + EclipsesConnect phase, orbital tilt, nodes, and eclipse alignment.No linked journal evidence yet
- region "Earth and Jupiter guided evidence mission":
  - text: Optional guided path Earth → Jupiter evidence trail 0/4
  - paragraph: Prefer step-by-step guidance? Observe, compare, test an orbit, then support a claim with evidence.
  - button "Start four-step mission"
- tablist "Orrery lab sections":
  - 'tab "Full Orrery: animated solar system" [selected]': ✓ 🌌 Full Orrery
  - 'tab "Kepler I: ellipses and the Sun at one focus"': I I Ellipses
  - 'tab "Kepler II: equal areas in equal times"': II II Areas
  - 'tab "Kepler III: orbital periods and semi-major axis"': III III Periods
  - 'tab "Orbit Workshop: build an orbit"': 🔧 Workshop
  - 'tab "Hohmann Transfers: compare transfer paths"': 🚀 Transfers
  - 'tab "Challenges: apply Kepler''s laws"': 🏆 Challenges
  - 'tab "True or False: check common orbital ideas"': ❓ True/False
  - 'tab "Kepler Inquiry: orbital mechanics sandbox"': 🔬 Kepler Inquiry
- 'status "Section 1 of 9: Full Orrery: animated solar system. 1 of 9 sections sampled. 0 of 3 Kepler law tabs explored. 0 / 3 guided missions complete. Next suggested: I Ellipses."':
  - text: "Section 1 of 9 1 / 9 sections sampled 0 / 3 Kepler laws explored 0 / 3 guided missions complete Next suggested: I Ellipses"
  - 'button "Go to next Orrery section: Kepler I: ellipses and the Sun at one focus"': Go to I Ellipses →
- 'tabpanel "Full Orrery: animated solar system"':
  - heading "Full orrery — animated solar system" [level=3]
  - paragraph: Eight planets plus Pluto follow measured orbital shapes and relative speeds. The main map shares one orbital-distance scale; markers are compressed and clamped, and the inner-system inset is magnified.
  - text: Guided mission 🌍 Earth live orbit 0/3 complete
  - list "Guided mission progress":
    - listitem: Earth live orbit Current
    - listitem: Mercury speed zone Upcoming
    - listitem: Longer year Upcoming
  - paragraph: "Pause the orbit clock and predict: is Earth currently closer to or farther from the Sun than 1 AU?"
  - button "Focus Earth and pause"
  - text: Inspect first, then predict.
  - group "Orbit playback controls":
    - button "Resume orbital clock" [pressed]: ▶ Play
    - text: Speed
    - slider "Orbital clock speed": "1"
    - text: 1.0 yr/s
    - status: Earth completes one orbit in about 1.0 s at 1.0 Earth yr/s.
  - group "Orbit phase controls":
    - text: Phase
    - slider "Orbit phase for Earth": "0"
    - group "Earth orbit timeline landmarks": Orbit landmarks Near perihelion Perihelion Quarter orbit Aphelion Three-quarter orbit Next perihelion
    - status: 0.00 / 1.00 yr · Earth year 1 · day 1
    - text: Jump
    - button "Jump to perihelion for Earth" [pressed]: ☀ Perihelion
    - button "Jump to quarter orbit for Earth": Quarter orbit
    - button "Jump to aphelion for Earth": ❄ Aphelion
    - button "Jump to three-quarter orbit for Earth": Three-quarter orbit
    - button "Jump to next perihelion for Earth": ☀ Next perihelion
  - group:
    - text: Map display options
    - group "Orbit view controls":
      - button "Reset orbit time, camera view, and selection": Reset view
      - text: "Marker size:"
      - button "Use teaching marker sizes, enlarged for visibility": Teaching
      - button "Use radius-informed marker sizes, compressed and clamped for visibility" [pressed]: Comparative
      - text: "Radius-informed · compressed and clamped Zoom:"
      - button "Zoom to inner planets": Inner
      - button "Show the full solar system" [pressed]: Full
      - button "Zoom to outer planets": Outer
    - text: "Show:"
    - button "Show comets" [pressed]: ☄ Comets
    - button "Show dwarf planets" [pressed]: ⚳ Dwarfs
    - button "Show motion and gravity directions": Motion + gravity
    - button "Show orbit labels" [pressed]: Aa Labels
  - group "Keyboard world navigator":
    - text: Rocky
    - strong: Earth
    - text: Select a world
    - combobox "Select a world":
      - option "Choose a world..."
      - option "☿ Mercury"
      - option "♀ Venus"
      - option "🌍 Earth" [selected]
      - option "♂ Mars"
      - option "♃ Jupiter"
      - option "♄ Saturn"
      - option "⛢ Uranus"
      - option "♆ Neptune"
      - option "♇ Pluto"
      - option "⚳ Ceres"
      - option "⬭ Haumea"
      - option "⚷ Eris"
      - option "☄ Halley’s Comet"
      - option "☄ Encke’s Comet"
    - text: Orbital period
    - strong: 1.00 Earth years
    - group "Selected world actions":
      - button "Follow Earth with the camera": Follow camera
      - text: Compare Earth with
      - combobox "Compare Earth with another world":
        - option "Choose another world..." [selected]
        - option "☿ Mercury"
        - option "♀ Venus"
        - option "♂ Mars"
        - option "♃ Jupiter"
        - option "♄ Saturn"
        - option "⛢ Uranus"
        - option "♆ Neptune"
        - option "♇ Pluto"
        - option "⚳ Ceres"
        - option "⬭ Haumea"
        - option "⚷ Eris"
        - option "☄ Halley’s Comet"
        - option "☄ Encke’s Comet"
    - status: "Focused: Earth"
    - text: "Keyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selection"
  - text: "Live orbit map Earth in focus Paused Focus: Earth"
  - application "Interactive solar system orbit map. Current view is the full solar system. In full-system view, a magnified inner-system inset plots Mercury through Mars with one common orbital-distance scale while enlarging markers for visibility. Select a world to inspect its orbit; the selected world has an arrow showing motion direction and relative speed plus a shaded equal-time sweep and live speed gauge; the live readout includes elapsed Earth years and day of year; marker sizes are radius-informed, compressed, and clamped for visibility; when comparison is active its orbit uses a dashed path; reduced-motion mode keeps decorative effects still; use the Follow camera toggle in the selected-world card, or pan and zoom to release follow; Enter or Space selects the next world; press Escape to clear selection. Earth is selected. The orbital clock is paused."
  - status:
    - text: Live reading
    - strong: Earth
    - text: Distance 0.983 AU · speed 30.29 km/s · Near perihelion
  - region "Scrollable Orrery visual key":
    - text: Habitable zone Orbit paths
    - status: "Ruler: 50 AU"
    - text: Magnified inner inset Comparative marker sizes → Velocity vector Equal-time sweep
  - text: More key items →
  - note: Arrow = direction/relative speed · wedge = equal time · use Follow camera to keep it centered, then pan or zoom to release · hover for details
  - note: "Model note: marker sizes are radius-informed but compressed and clamped for visibility; distances use the zoom scale, so this is not one literal scale. The blue ruler shows the current map distance. The magnified inner-system inset uses one common orbital-distance scale for Mercury through Mars; its markers are enlarged for visibility."
  - status
  - region "Earth":
    - text: Rocky
    - heading "Earth" [level=3]
    - button "Clear selected world": ✖
    - paragraph: Our home — liquid water, magnetosphere, life.
    - heading "Current reading" [level=4]
    - term: Distance from Sun
    - definition: 0.983 AU
    - term: Orbital speed
    - definition: 30.29 km/s
    - term: Orbital phase
    - definition: Near perihelion
    - heading "Orbit and world properties" [level=4]
    - term: Orbit size (a)
    - definition: 1.000 AU
    - term: Orbit shape (e)
    - definition: "0.0167"
    - term: Orbital period (T)
    - definition: 1.00 yr
    - term: Orbit tilt (i)
    - definition: 0.0°
    - term: Closest to Sun
    - definition: 0.983 AU
    - term: Farthest from Sun
    - definition: 1.017 AU
    - term: Mass
    - definition: 1.0000 M⊕
    - term: Radius
    - definition: 6371 km
    - paragraph: "Shape (e): 0 is circular; higher values mean a more stretched orbit. Tilt (i) is measured from the model’s reference plane."
    - status: "Earth: distance 0.983 AU; speed 30.29 km/s; phase Near perihelion"
    - note "Kepler II speed cue for Earth":
      - text: "Kepler II cue Equal areas in equal times mean closer to the Sun → faster; farther away → slower. Earth is inside its semi-major axis a (1.000 AU). Inside a: moving faster than the reference speed at a. Reference at a: 29.79 km/s · Current: 30.29 km/s"
      - note "Kepler III period cue for Earth": "Kepler III check: T² / a³ = 1.000 yr²/AU³ ≈ 1 for a Sun-centered orbit."
      - text: Perihelion · closest Aphelion · farthest
      - 'img "Orbital position of Earth: near perihelion (closest) at 0.983 AU"'
      - status: Earth is near perihelion (closest) at 0.983 AU; speed 30.29 km/s.
      - text: a = 1.000 AU marker = current distance
    - region "Orbital comparison for Earth":
      - text: Compare orbits
      - paragraph: Choose a world to compare orbital size, timing, distance, and speed.
    - region "A/B orbital evidence for Earth":
      - text: Orbital evidence snapshots Capture A → predict → capture B → compare
      - status: "Next: capture A"
      - button "Save orbital snapshot A for Earth": Save A
      - button "Save orbital snapshot B for Earth after saving snapshot A" [disabled]: Save B
      - button "Clear orbital snapshots for Earth" [disabled]: Clear
      - button "Export orbital evidence for Earth" [disabled]: Export evidence
      - text: Saving pauses the clock A · empty B · empty
      - paragraph: Save A, choose a prediction, move the body along its orbit, then save B to compare evidence.
  - region "Orbit rhythm for Earth":
    - heading "Orbit rhythm · Earth" [level=3]
    - 'img "Earth: equal time, changing speed"': Sun Aphelion Perihelion
    - figure "Speed through one orbit":
      - text: Speed through one orbit
      - 'img "Earth: orbital speed over time"': Speed (km/s) 0 20 40 0% 50% 100% Elapsed time in one orbit
      - text: Inspect orbit time
      - slider "Inspect orbit time": "0"
      - status: 0.0% of orbit · at a turning point in distance
      - button "Inspect matching distance" [disabled]
    - paragraph: "Now: 0.983 AU from the Sun · 30.29 km/s"
    - group "Equal-time orbit steps":
      - button "Step backward one twelfth of Earth's orbit": ← Back 1/12
      - button "Step forward one twelfth of Earth's orbit": Forward 1/12 →
      - button "Preview next equal-time step": Preview next step
    - paragraph: "Solid ring: now. Dotted ring: same distance, same speed. Arrows show direction only."
    - group: How to read these views
- status
```

# Test source

```ts
  194 |   await harness.destroy(page);
  195 | });
  196 | test('moves keyboard focus with Explorer Route changes', async ({ page }) => {
  197 |   await page.setViewportSize({ width: 736, height: 1600 });
  198 |   await harness.mount(page, {
  199 |     solarSystem: {
  200 |       tutorialDismissed: true,
  201 |       orreryMode: false,
  202 |       orr_paused: true,
  203 |     },
  204 |   }, undefined, { expectCanvas: false });
  205 | 
  206 |   const explorerView = page.locator('[data-solarsystem-route-switcher]');
  207 |   await explorerView.getByRole('button', { name: /Orrery Lab/ }).click();
  208 |   await expect(page.locator('#orrery-tab-0')).toBeFocused();
  209 | 
  210 |   await explorerView.getByRole('button', { name: /3D Explorer/ }).click();
  211 |   await expect(page.locator('.solar3d-canvas')).toBeFocused();
  212 |   await harness.destroy(page);
  213 | });
  214 | test('keeps Orbit Workshop controls named and wrapped at 320px', async ({ page }) => {
  215 |   await page.setViewportSize({ width: 320, height: 1600 });
  216 |   await harness.mount(page, {
  217 |     solarSystem: {
  218 |       tutorialDismissed: true,
  219 |       orreryMode: true,
  220 |       orr_tab: 4,
  221 |     },
  222 |   }, undefined, { expectCanvas: false });
  223 | 
  224 |   await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '320px'; });
  225 |   await expect(page.locator('label[for="orrery-workshop-eccentricity"]')).toContainText('Eccentricity');
  226 |   await expect(page.locator('label[for="orrery-workshop-semi-major"]')).toContainText('Semi-major');
  227 |   await expect(page.locator('#orrery-workshop-controls-help')).toContainText('Values use AU, years, and km/s');
  228 |   await expect(page.locator('#orrery-workshop-eccentricity')).toHaveAttribute('aria-describedby', 'orrery-workshop-controls-help');
  229 |   await expect(page.locator('#orrery-workshop-semi-major')).toHaveAttribute('aria-describedby', 'orrery-workshop-controls-help');
  230 |   await expect(page.locator('#orrery-workshop-energy-note')).toContainText('normalized GM units');
  231 |   await expect(page.locator('canvas[aria-label*="energy diagram"]')).toHaveAttribute('aria-describedby', 'orrery-workshop-energy-note');
  232 |   await expect(page.locator('canvas[aria-label*="energy diagram"]')).toHaveAttribute('aria-label', /current semi-major axis/);
  233 | 
  234 |   const metrics = await page.evaluate(() => {
  235 |     const wrap = document.getElementById('wrap');
  236 |     if (!wrap) throw new Error('Orrery harness wrapper did not mount');
  237 |     const wrapBox = wrap.getBoundingClientRect();
  238 |     const rows = [...wrap.querySelectorAll<HTMLElement>('.orrery-workshop-control-row')].map((row) => {
  239 |       const rect = row.getBoundingClientRect();
  240 |       return { flexWrap: getComputedStyle(row).flexWrap, left: rect.left, right: rect.right };
  241 |     });
  242 |     const overflowing = [...wrap.querySelectorAll<HTMLElement>("*")]
  243 |       .map((element) => {
  244 |         const rect = element.getBoundingClientRect();
  245 |         return { tag: element.tagName.toLowerCase(), id: element.id, className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
  246 |       })
  247 |       .filter(({ left, right, width }) => width > 0 && (left < Math.floor(wrapBox.left - 1) || right > Math.ceil(wrapBox.right + 1)))
  248 |       .slice(0, 12);
  249 |     return {
  250 |       documentScrollWidth: document.documentElement.scrollWidth,
  251 |       overflowing,
  252 |       rows,
  253 |       wrapLeft: wrapBox.left,
  254 |       wrapRight: wrapBox.right,
  255 |     };
  256 |   });
  257 |   expect(metrics.documentScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(321);
  258 |   expect(metrics.overflowing, JSON.stringify(metrics)).toEqual([]);
  259 |   expect(metrics.rows).toHaveLength(2);
  260 |   expect(metrics.rows.every((row) => row.flexWrap === 'wrap')).toBe(true);
  261 |   expect(metrics.rows.every((row) => row.left >= metrics.wrapLeft - 1 && row.right <= metrics.wrapRight + 1)).toBe(true);
  262 | 
  263 |   await harness.destroy(page);
  264 | });
  265 | test('keeps mobile stage guidance readable instead of squeezing it into a corner', async ({ page }) => {
  266 |   await page.setViewportSize({ width: 320, height: 1600 });
  267 |   await harness.mount(page, {
  268 |     solarSystem: {
  269 |       tutorialDismissed: true,
  270 |       orreryMode: true,
  271 |       orr_tab: 0,
  272 |       orr_sel: 'earth',
  273 |       orr_paused: true,
  274 |       orr_scale_mode: 'relative',
  275 |     },
  276 |   }, undefined, { expectCanvas: false });
  277 | 
  278 |   await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '320px'; });
  279 |   const compactCanvas = page.locator('canvas[role="application"]').first();
  280 |   await compactCanvas.scrollIntoViewIfNeeded();
  281 |   await expect(compactCanvas).toHaveAttribute('data-canvas-layout', 'compact');
  282 |   await expect(page.locator('#orrery-model-scale-note')).toContainText('not one literal scale');
  283 |   await expect(page.locator('#orrery-model-scale-note')).toContainText('compressed and clamped for visibility');
  284 |   await expect(page.locator('canvas[role="application"]')).toHaveAttribute('aria-describedby', 'orrery-canvas-help orrery-model-scale-note orrery-hover-summary orrery-stage-key orrery-stage-tip orrery-stage-readout');
  285 |   await expect(page.locator('#orrery-hover-summary')).toHaveAttribute('role', 'status');
  286 |   await expect(page.locator('#orrery-stage-key')).toContainText('Velocity vector');
  287 |   await expect(page.locator('#orrery-stage-tip')).toContainText('Arrow = direction/relative speed');
  288 |   await expect(page.locator('#orrery-stage-readout')).toContainText('Earth');
  289 |   await expect(page.locator('#orrery-stage-readout-values')).toContainText('Distance');
  290 |   await expect(page.locator('#orrery-stage-readout')).toHaveAttribute('role', 'status');
  291 |   await expect(page.locator('#orrery-stage-readout')).toHaveAttribute('aria-live', 'polite');
  292 |   await expect(page.locator('#orrery-guided-progress')).toHaveText('0 / 3 guided missions complete');
  293 |   await expect(page.locator('body')).toContainText('Orbit size (a)');
> 294 |   await expect(page.locator('body')).toContainText('e · eccentricity');
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  295 |   await expect(page.locator('body')).toContainText('distance now');
  296 |   await expect(page.locator('body')).toContainText('Kepler III check');
  297 |   const selectedMobileWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  298 |   expect(selectedMobileWidth).toBeLessThanOrEqual(321);
  299 |   const layout = await page.locator('.orr-stage-tip').evaluate((tip) => {
  300 |     const stage = tip.closest('.orr-orbit-stage');
  301 |     const hud = stage?.querySelector('.orr-stage-hud');
  302 |     if (!stage || !hud) throw new Error('Orrery stage layout did not mount');
  303 |     const tipRect = tip.getBoundingClientRect();
  304 |     const stageRect = stage.getBoundingClientRect();
  305 |     return {
  306 |       tipWidth: Math.round(tipRect.width),
  307 |       tipLeft: Math.round(tipRect.left),
  308 |       tipRight: Math.round(tipRect.right),
  309 |       stageLeft: Math.round(stageRect.left),
  310 |       stageRight: Math.round(stageRect.right),
  311 |       textAlign: getComputedStyle(tip).textAlign,
  312 |       hudDirection: getComputedStyle(hud).flexDirection,
  313 |     };
  314 |   });
  315 | 
  316 |   expect(layout.tipWidth).toBeGreaterThanOrEqual(240);
  317 |   expect(layout.tipLeft).toBeGreaterThanOrEqual(layout.stageLeft + 8);
  318 |   expect(layout.tipRight).toBeLessThanOrEqual(layout.stageRight - 8);
  319 |   expect(layout.textAlign).toBe('left');
  320 |   expect(layout.hudDirection).toBe('column');
  321 | 
  322 |   const readoutLayout = await page.locator('#orrery-stage-readout').evaluate((readout) => {
  323 |     const stage = readout.closest('.orr-orbit-stage');
  324 |     if (!stage) throw new Error('Orrery stage readout did not mount inside the stage');
  325 |     const readoutRect = readout.getBoundingClientRect();
  326 |     const stageRect = stage.getBoundingClientRect();
  327 |     return {
  328 |       left: Math.round(readoutRect.left),
  329 |       right: Math.round(readoutRect.right),
  330 |       top: Math.round(readoutRect.top),
  331 |       stageLeft: Math.round(stageRect.left),
  332 |       stageRight: Math.round(stageRect.right),
  333 |     };
  334 |   });
  335 | 
  336 |   expect(readoutLayout.left).toBeGreaterThanOrEqual(readoutLayout.stageLeft + 8);
  337 |   expect(readoutLayout.right).toBeLessThanOrEqual(readoutLayout.stageRight - 8);
  338 | 
  339 |   const stageFlow = await page.locator('.orr-orbit-stage').evaluate((stage) => {
  340 |     const viewport = stage.querySelector('[data-orrery-viewport]') as HTMLElement | null;
  341 |     const rail = stage.querySelector('[data-orrery-instrument-rail]') as HTMLElement | null;
  342 |     const hud = stage.querySelector('.orr-stage-hud') as HTMLElement | null;
  343 |     const canvas = stage.querySelector('canvas[role="application"]') as HTMLCanvasElement | null;
  344 |     const readout = stage.querySelector('#orrery-stage-readout') as HTMLElement | null;
  345 |     const key = stage.querySelector('#orrery-stage-key') as HTMLElement | null;
  346 |     const tip = stage.querySelector('#orrery-stage-tip') as HTMLElement | null;
  347 |     if (!viewport || !rail || !hud || !canvas || !readout || !key || !tip) {
  348 |       throw new Error('Responsive Orrery stage structure did not mount');
  349 |     }
  350 |     const rectOf = (element: Element) => {
  351 |       const rect = element.getBoundingClientRect();
  352 |       return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  353 |     };
  354 |     const state = (canvas as any).__canvasPanelState;
  355 |     if (!state) throw new Error('Responsive Orrery canvas state was not available');
  356 |     return {
  357 |       stage: rectOf(stage),
  358 |       viewport: rectOf(viewport),
  359 |       rail: rectOf(rail),
  360 |       hud: rectOf(hud),
  361 |       canvas: rectOf(canvas),
  362 |       readout: rectOf(readout),
  363 |       key: rectOf(key),
  364 |       tip: rectOf(tip),
  365 |       railPosition: getComputedStyle(rail).position,
  366 |       readoutPosition: getComputedStyle(readout).position,
  367 |       keyPosition: getComputedStyle(key).position,
  368 |       tipPosition: getComputedStyle(tip).position,
  369 |       canvasLayout: canvas.getAttribute('data-canvas-layout'),
  370 |       logicalWidth: state.viewportWidth,
  371 |       logicalHeight: state.viewportHeight,
  372 |       hitDiameter: state.canvasHitRadius * 2,
  373 |       backingWidth: canvas.width,
  374 |       backingHeight: canvas.height,
  375 |       dpr: (canvas as any)._dpr,
  376 |       stageClientWidth: (stage as HTMLElement).clientWidth,
  377 |       stageScrollWidth: (stage as HTMLElement).scrollWidth,
  378 |     };
  379 |   });
  380 | 
  381 |   const containsRect = (outer: typeof stageFlow.stage, inner: typeof stageFlow.stage) =>
  382 |     inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
  383 |   const disjointRects = (first: typeof stageFlow.stage, second: typeof stageFlow.stage) =>
  384 |     first.right <= second.left + 1 || second.right <= first.left + 1 || first.bottom <= second.top + 1 || second.bottom <= first.top + 1;
  385 | 
  386 |   expect(containsRect(stageFlow.stage, stageFlow.viewport)).toBe(true);
  387 |   expect(containsRect(stageFlow.stage, stageFlow.rail)).toBe(true);
  388 |   expect(containsRect(stageFlow.viewport, stageFlow.hud)).toBe(true);
  389 |   expect(containsRect(stageFlow.rail, stageFlow.readout)).toBe(true);
  390 |   expect(containsRect(stageFlow.rail, stageFlow.key)).toBe(true);
  391 |   expect(containsRect(stageFlow.rail, stageFlow.tip)).toBe(true);
  392 |   expect(stageFlow.rail.top).toBeGreaterThanOrEqual(stageFlow.viewport.bottom - 1);
  393 |   expect(disjointRects(stageFlow.readout, stageFlow.key)).toBe(true);
  394 |   expect(disjointRects(stageFlow.readout, stageFlow.tip)).toBe(true);
```