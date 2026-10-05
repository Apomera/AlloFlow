# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 103-solar-system-learning-journey.spec.ts >> restored incomplete and wrong-world evidence cannot become a supported observation
- Location: tests\e2e\103-solar-system-learning-journey.spec.ts:125:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true }).getByRole('row').filter({ has: getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true }).getByRole('rowheader', { name: 'Distance', exact: true }) }).getByRole('cell').first()
Expected: "Not recorded"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true }).getByRole('row').filter({ has: getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true }).getByRole('rowheader', { name: 'Distance', exact: true }) }).getByRole('cell').first()

```

```yaml
- button "Back to tools"
- heading "🌍 Solar System Explorer" [level=3]
- text: Orrery
- region "Mission dashboard":
  - heading "Mission dashboard" [level=2]
  - paragraph: 0/6 journeys complete · 0 journal records
  - button "Open mission dashboard"
  - paragraph: Earth → Mars expedition · Predict the effect of launch alignment
- group: Science notes · reviewed August 2026
- text: Start here
- heading "Free orbit Explorer" [level=4]
- paragraph: Choose a world, choose a view, and collect evidence at your own pace.
- text: Orbit model
- group "Scientific model lens":
  - text: Choose a scientific lens Keplerian simulation
  - button "Explore Inspect a world, its surface, atmosphere, and interior."
  - button "Size scale Compare two worlds using the same linear diameter scale."
  - button "Orbit model Test orbit shape, speed, period, and transfer ideas." [pressed]
  - note: Eccentricity, inclination, relative periods, and changing orbital speed are modeled. Planet sizes and display distances are compressed, and the clock is simulation time—not today's ephemeris.
  - button "Build a scale walk"
- group: Progress dashboard • 0/9 worlds visited
- text: 1. Choose a world Select stem.solar_sys.mercury to begin the tour
- button "Select stem.solar_sys.mercury from mission control": stem.solar_sys.mercury Rocky
- button "Select stem.solar_sys.venus from mission control": stem.solar_sys.venus Rocky
- button "Select stem.solar_sys.earth from mission control": stem.solar_sys.earth Rocky
- button "Select stem.solar_sys.mars from mission control": stem.solar_sys.mars Rocky
- button "Select stem.solar_sys.jupiter from mission control": stem.solar_sys.jupiter Gas giant
- button "Select stem.solar_sys.saturn from mission control": stem.solar_sys.saturn Gas giant
- button "Select stem.solar_sys.uranus from mission control": stem.solar_sys.uranus Ice giant
- button "Select stem.solar_sys.neptune from mission control": stem.solar_sys.neptune Ice giant
- button "Select stem.solar_sys.pluto from mission control": stem.solar_sys.pluto Dwarf world
- note: Illustrative portraits · not to scale Rings shown on all four giant planets Green dot = visited
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
  - button "3D Explorer Open See a world up close and gather surface evidence.":
    - text: 3D Explorer Open
    - paragraph: See a world up close and gather surface evidence.
  - button "Orrery Lab Active Learn orbit motion, Kepler laws, and transfers." [pressed]:
    - text: Orrery Lab Active
    - paragraph: Learn orbit motion, Kepler laws, and transfers.
- text: "3. Pick a goal Path: Free Explore Vocab: 0/17 Next: stem.solar_sys.mercury"
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
    - 'listitem "Visual Compare: Not started. Recommended next."': Compare Not started
    - 'listitem "Tilt + Seasons: Not started"': Seasons Not started
    - 'listitem "Signal Delay: Not started"': Signal Not started
    - 'listitem "Gravity Drop: Not started"': Gravity Not started
    - 'listitem "Moon + Eclipses: Not started"': Moon Not started
  - 'button "Next: Visual Compare"'
  - region "Evidence → explanation":
    - heading "Evidence → explanation" [level=4]
    - status: 0/5 labs with linked evidence · 0/5 with an explanation
    - paragraph: Lab saves now link to your journal. Add your reasoning to an observation to record an explanation. These indicators track saved work, not a grade.
    - button "Review explanations in journal" [disabled]
    - button "Connect evidence across labs"
  - button "Visual Compare. Not started. Recommended next.": 🔍 Next up Visual Compare Compare size, gravity, time cycles, and environments. No linked journal evidence yet
  - button "Tilt + Seasons. Not started": ☀ Not started Tilt + Seasons Test how axial tilt changes sunlight geometry. No linked journal evidence yet
  - button "Signal Delay. Not started": 📡 Not started Signal Delay Move worlds and measure light-travel time. No linked journal evidence yet
  - button "Gravity Drop. Not started": ⚖ Not started Gravity Drop Separate mass, weight force, and free fall. No linked journal evidence yet
  - button "Moon + Eclipses. Not started": 🌙 Not started Moon + Eclipses Connect phase, orbital tilt, nodes, and eclipse alignment. No linked journal evidence yet
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
  - region "Mercury speed zone":
    - text: Guided mission
    - heading "Mercury speed zone" [level=3]
    - text: 0/3 complete
    - list "Guided mission progress":
      - listitem:
        - 'button "Open mission: Earth live orbit"': Earth live orbit Not started
      - listitem:
        - 'button "Open mission: Mercury speed zone"': Mercury speed zone Current
      - listitem:
        - 'button "Open mission: Longer year"': Longer year Not started
    - paragraph: Open any mission to continue or review it. Your orbit time and saved evidence stay in place until you use a focus or capture action.
    - paragraph: "Focus Mercury, pause the clock, and predict: where does it move fastest?"
    - button "Focus Mercury and pause"
    - text: Inspect first, then predict.
  - group "Orbit playback controls":
    - heading "Orbit clock" [level=3]
    - button "Resume orbital clock" [pressed]: ▶ Play
    - text: Orbital clock speed 1.0 Earth yr/s
    - slider "Orbital clock speed": "1"
    - status: Mercury completes one orbit in about 0.24 s at 1.0 Earth yr/s.
    - status: Reduced motion on · pulses and camera glides off
  - group "Orbit phase controls":
    - text: Orbit phase Inspecting pauses the clock.
    - slider "Orbit phase for Mercury": "0"
    - group "Mercury orbit timeline landmarks": Orbit landmarks Near perihelion
    - status: 0.000 / 0.241 yr · Earth year 1 · day 1
    - button "Jump to perihelion for Mercury" [pressed]: ☀ Perihelion
    - button "Jump to quarter orbit for Mercury": Quarter orbit
    - button "Jump to aphelion for Mercury": ❄ Aphelion
    - button "Jump to three-quarter orbit for Mercury": Three-quarter orbit
    - button "Jump to next perihelion for Mercury": ☀ Next perihelion
  - group:
    - text: Map display options
    - group "Orbit view controls":
      - button "Reset orbit time, camera view, and selection": Reset orbit time
      - paragraph: Resets time, camera and selected worlds.
      - heading "Marker sizes" [level=4]
      - button "Use teaching marker sizes, enlarged for visibility" [pressed]: Teaching
      - button "Use radius-informed marker sizes, compressed and clamped for visibility": Comparative
      - paragraph: Markers enlarged for discovery
      - heading "Map view" [level=4]
      - button "Zoom to inner planets" [pressed]: Inner
      - button "Show the full solar system": Full
      - button "Zoom to outer planets": Outer
    - group "Map layers":
      - heading "Map layers" [level=4]
      - button "Show comets" [pressed]: ☄ Comets
      - button "Show dwarf planets" [pressed]: ⚳ Dwarfs
      - button "Show motion and gravity directions": Motion + gravity
      - button "Show orbit labels" [pressed]: Aa Labels
  - group "Keyboard world navigator":
    - text: Rocky
    - strong: Mercury
    - text: Select a world
    - combobox "Select a world":
      - option "Choose a world..."
      - option "☿ Mercury" [selected]
      - option "♀ Venus"
      - option "🌍 Earth"
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
    - strong: 0.241 Earth years
    - group "Selected world actions":
      - button "Follow Mercury with the camera": Follow camera
      - text: Compare Mercury with
      - combobox "Compare Mercury with another world":
        - option "Choose another world..." [selected]
        - option "♀ Venus"
        - option "🌍 Earth"
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
    - status: "Focused: Mercury"
    - text: "Keyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selection"
  - text: "Live orbit map Mercury in focus Paused Teaching markers Focus: Mercury"
  - application "Interactive solar system orbit map. Current view is inner planets. In full-system view, a magnified inner-system inset plots Mercury through Mars with one common orbital-distance scale while enlarging markers for visibility. Select a world to inspect its orbit; the selected world has an arrow showing motion direction and relative speed plus a shaded equal-time sweep and live speed gauge; the live readout includes elapsed Earth years and day of year; marker sizes are enlarged for teaching; when comparison is active its orbit uses a dashed path; reduced-motion mode keeps decorative effects still; use the Follow camera toggle in the world navigator, or pan and zoom to release follow; Enter or Space selects the next world; press Escape to clear selection. Mercury is selected. The orbital clock is paused."
  - status:
    - text: Live reading
    - strong: Mercury
    - text: Distance 0.307 AU · speed 58.99 km/s · Near perihelion
  - region "Scrollable Orrery visual key":
    - text: Habitable zone Orbit paths
    - status: "Ruler: 1 AU"
    - text: Teaching marker sizes → Velocity vector Equal-time sweep
  - note: Arrow = direction/relative speed · wedge = equal time · use Follow camera to keep it centered, then pan or zoom to release · hover for details
  - note: "Model note: markers are enlarged for visibility; distances use the zoom scale, so this is not one literal scale. The blue ruler shows the current map distance."
  - status
  - region "Mercury":
    - text: Rocky
    - heading "Mercury" [level=3]
    - button "Clear selected world": ✖
    - paragraph: Smallest planet, closest to the Sun, no atmosphere to speak of.
    - heading "Current reading" [level=4]
    - term: Distance from Sun
    - definition: 0.307 AU
    - term: Orbital speed
    - definition: 58.99 km/s
    - term: Orbital phase
    - definition: Near perihelion
    - heading "Orbit and world properties" [level=4]
    - term: Orbit size (a)
    - definition: 0.387 AU
    - term: Orbit shape (e)
    - definition: "0.2056"
    - term: Orbital period (T)
    - definition: 0.24 yr
    - term: Orbit tilt (i)
    - definition: 7.0°
    - term: Closest to Sun
    - definition: 0.307 AU
    - term: Farthest from Sun
    - definition: 0.467 AU
    - term: Mass
    - definition: 0.0553 M⊕
    - term: Radius
    - definition: 2440 km
    - paragraph: "Shape (e): 0 is circular; higher values mean a more stretched orbit. Tilt (i) is measured from the model’s reference plane."
    - status: "Mercury: distance 0.307 AU; speed 58.99 km/s; phase Near perihelion"
    - note "Kepler II speed cue for Mercury":
      - text: "Kepler II cue Equal areas in equal times mean closer to the Sun → faster; farther away → slower. Mercury is inside its semi-major axis a (0.387 AU). Inside a: moving faster than the reference speed at a. Reference at a: 47.88 km/s · Current: 58.99 km/s"
      - note "Kepler III period cue for Mercury": "Kepler III check: T² / a³ = 1.002 yr²/AU³ ≈ 1 for a Sun-centered orbit."
      - text: Perihelion · closest Aphelion · farthest
      - 'img "Orbital position of Mercury: near perihelion (closest) at 0.307 AU"'
      - status: Mercury is near perihelion (closest) at 0.307 AU; speed 58.99 km/s.
      - text: a = 0.387 AU marker = current distance
    - region "Orbital comparison for Mercury":
      - text: Compare orbits
      - paragraph: Choose a world to compare orbital size, timing, distance, and speed.
    - region "A/B orbital evidence for Mercury":
      - heading "Orbital evidence snapshots" [level=4]
      - status: Recapture A
      - list "Orbital evidence workflow":
        - listitem: Capture A
        - listitem: Predict B
        - listitem: Capture B
        - listitem: Compare
      - status: Incomplete saved reading. Recapture A, then choose a prediction and recapture B. Available saved values stay visible. Two complete readings are needed to evaluate a prediction.
      - button "Save orbital snapshot A for Mercury": Save orbital snapshot A
      - button "Save orbital snapshot B for Mercury after saving snapshot A" [disabled]: Save orbital snapshot B
      - button "Clear orbital snapshots for Mercury": Clear orbital snapshots
      - button "Export orbital evidence for Mercury": Export orbital evidence
      - button "Show orbit controls"
      - text: Saving pauses the clock
      - paragraph: Use Orbit phase or a landmark to inspect a different point before saving B. Show orbit controls pauses the clock and takes you to the phase slider.
      - paragraph: Saving A again replaces A, clears B and resets your prediction. Recorded mission-log entries stay saved.
      - region "Snapshot A":
        - heading "Snapshot A" [level=5]
        - text: Incomplete
        - term: Simulation time
        - definition: 0.00 yr
        - term: Orbital speed
        - definition: 59.0 km/s
        - term: Distance from Sun
        - definition: Not recorded
      - region "Snapshot B":
        - heading "Snapshot B" [level=5]
        - text: Incomplete
        - term: Simulation time
        - definition: 0.12 yr
        - term: Orbital speed
        - definition: Not recorded
        - term: Distance from Sun
        - definition: 0.467 AU
      - table "Orbital evidence change from snapshot A to B for Mercury":
        - caption: B minus A
        - rowgroup:
          - row "Measure A B Delta":
            - columnheader "Measure"
            - columnheader "A"
            - columnheader "B"
            - columnheader "Delta"
        - rowgroup:
          - row "Elapsed time 0.00 yr 0.12 yr +0.12 yr":
            - rowheader "Elapsed time"
            - cell "0.00 yr"
            - cell "0.12 yr"
            - cell "+0.12 yr"
          - row "Distance Not recorded 0.467 AU Unavailable":
            - rowheader "Distance"
            - cell "Not recorded"
            - cell "0.467 AU"
            - cell "Unavailable"
          - row "Orbital speed 59.0 km/s Not recorded Unavailable":
            - rowheader "Orbital speed"
            - cell "59.0 km/s"
            - cell "Not recorded"
            - cell "Unavailable"
  - region "Orbit rhythm for Mercury":
    - heading "Orbit rhythm · Mercury" [level=3]
    - paragraph: Two linked views · one orbit clock
    - figure "Equal time along the orbit":
      - text: Equal time along the orbit
      - 'img "Mercury: equal time, changing speed"': Sun Aphelion Perihelion
    - figure "Speed through one orbit":
      - text: Speed through one orbit
      - 'img "Mercury: orbital speed over time"': Speed (km/s) 0 30 60 0% 50% 100% Elapsed time in one orbit
      - text: Inspect orbit time
      - slider "Inspect orbit time": "0"
      - status: 0.0% of orbit · at a turning point in distance
    - paragraph: "Now: 0.307 AU from the Sun · 58.99 km/s"
    - group "Orbit inspection actions":
      - button "Inspect matching distance" [disabled]
      - button "Step backward one twelfth of Mercury's orbit": ← Back 1/12
      - button "Step forward one twelfth of Mercury's orbit": Forward 1/12 →
      - button "Preview next equal-time step": Preview next step
    - paragraph: "Solid ring: now. Dotted ring: same distance, same speed. Arrows show direction only."
    - group: How to read these views
- status
```

# Test source

```ts
  41  |   await expect(page.locator('#orrery-guided-mission')).toBeVisible();
  42  | }
  43  | 
  44  | async function updateState(page: Page, patch: Record<string, unknown>) {
  45  |   await page.evaluate((next) => (window as any).__ctx.updateMulti('solarSystem', next), patch);
  46  | }
  47  | 
  48  | async function investigationState(page: Page) {
  49  |   return page.evaluate(() => {
  50  |     const data = (window as any).__toolData.solarSystem;
  51  |     return {
  52  |       time: data.orr_time,
  53  |       selected: data.orr_sel,
  54  |       comparison: data.orr_compare,
  55  |       paused: data.orr_paused,
  56  |       zoom: data.orr_zoom,
  57  |       follow: data.orr_follow,
  58  |       focus: data.orr_focus_body,
  59  |       focusRequest: data.orr_focus_request,
  60  |       snapshots: data.orr_snapshots,
  61  |       progress: data.orr_mission_progress,
  62  |       missionLog: data.missionLog,
  63  |       journal: data.journalEntries,
  64  |     };
  65  |   });
  66  | }
  67  | 
  68  | const incompleteStore = {
  69  |   mercury: {
  70  |     a: { bodyId: 'mercury', bodyName: 'Mercury', time: 0, speed: 59, phase: 'Near perihelion' },
  71  |     b: { bodyId: 'mercury', bodyName: 'Mercury', time: 0.12, distance: 0.467, phase: 'Near aphelion' },
  72  |     prediction: 'slower',
  73  |     predictionResult: { choice: 'slower', actual: 'slower', correct: true, speedDelta: -20, distanceDelta: 0.16 },
  74  |     observationLogged: false,
  75  |   },
  76  | };
  77  | 
  78  | test('unfinished guided missions remain reachable without disturbing the investigation on a phone', async ({ page }) => {
  79  |   await mountJourney(page, 320, false, {
  80  |     orr_sel: 'mars',
  81  |     orr_compare: 'earth',
  82  |     orr_mission_idx: 2,
  83  |     orr_time: 0.37,
  84  |     orr_mission_progress: {
  85  |       mercury_speed: { started: true, choice: 'peri', correct: true, detail: 'Saved Mercury explanation.' },
  86  |       longer_year: { started: true },
  87  |     },
  88  |     orr_snapshots: incompleteStore,
  89  |     missionLog: [{ time: 'Earlier', text: 'Keep my previous observation.' }],
  90  |   });
  91  |   const guide = page.locator('#orrery-guided-mission');
  92  |   await guide.getByRole('button', { name: 'Mars for Longer year', exact: true }).click();
  93  |   await expect(guide).toContainText('2/3 complete');
  94  |   await expect(guide).not.toContainText('All guided missions complete');
  95  |   const completed = await investigationState(page);
  96  |   expect(completed.progress.longer_year.correct).toBe(true);
  97  |   expect(completed.progress.earth_distance).toBeUndefined();
  98  | 
  99  |   await guide.getByRole('button', { name: 'Continue unfinished mission', exact: true }).click();
  100 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(0);
  101 |   await expect(guide.getByRole('heading', { level: 3 })).toContainText('Earth live orbit');
  102 |   await expect(guide.getByRole('button', { name: 'Focus Earth and pause', exact: true })).toBeVisible();
  103 |   expect(await investigationState(page)).toEqual(completed);
  104 | 
  105 |   const roadmap = guide.getByRole('list', { name: 'Guided mission progress', exact: true });
  106 |   const titles = ['Earth live orbit', 'Mercury speed zone', 'Longer year'];
  107 |   await expect(roadmap.getByRole('button')).toHaveCount(3);
  108 |   for (const index of [1, 2, 0]) {
  109 |     const button = roadmap.getByRole('button', { name: `Open mission: ${titles[index]}`, exact: true });
  110 |     await button.focus();
  111 |     await button.press(index === 2 ? 'Space' : 'Enter');
  112 |     await expect(button).toBeFocused();
  113 |     await expect(roadmap.getByRole('listitem').nth(index)).toHaveAttribute('aria-current', 'step');
  114 |     await expect(guide.getByRole('heading', { level: 3 })).toContainText(titles[index]);
  115 |     expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(index);
  116 |     expect(await investigationState(page)).toEqual(completed);
  117 |     const rect = await button.boundingBox();
  118 |     expect(rect?.height).toBeGreaterThanOrEqual(43.5);
  119 |     expect(rect?.width).toBeGreaterThanOrEqual(43.5);
  120 |   }
  121 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  122 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  123 | });
  124 | 
  125 | test('restored incomplete and wrong-world evidence cannot become a supported observation', async ({ page }) => {
  126 |   await mountJourney(page, 1060, true, { orr_snapshots: incompleteStore });
  127 |   const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  128 |   await expect(evidence.locator('.orr-evidence-snapshot')).toHaveCount(2);
  129 |   for (const slot of ['a', 'b']) {
  130 |     await expect(evidence.locator(`.orr-evidence-snapshot[data-snapshot="${slot}"]`)).toContainText('Incomplete');
  131 |   }
  132 |   const quality = page.locator('#orrery-evidence-quality');
  133 |   await expect(quality).toContainText(/Recapture A/i);
  134 |   await expect(quality).toContainText(/Recapture B/i);
  135 |   await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  136 |   await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  137 |   await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  138 |   const table = evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true });
  139 |   const distance = table.getByRole('row').filter({ has: table.getByRole('rowheader', { name: 'Distance', exact: true }) });
  140 |   const speed = table.getByRole('row').filter({ has: table.getByRole('rowheader', { name: 'Orbital speed', exact: true }) });
> 141 |   await expect(distance.getByRole('cell').nth(0)).toHaveText('Not recorded');
      |                                                   ^ Error: expect(locator).toHaveText(expected) failed
  142 |   await expect(distance.getByRole('cell').nth(2)).toHaveText('Unavailable');
  143 |   await expect(speed.getByRole('cell').nth(1)).toHaveText('Not recorded');
  144 |   await expect(speed.getByRole('cell').nth(2)).toHaveText('Unavailable');
  145 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  146 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual([]);
  147 | 
  148 |   const exportButton = evidence.getByRole('button', { name: 'Export orbital evidence for Mercury', exact: true });
  149 |   await expect(exportButton).toBeEnabled();
  150 |   const [download] = await Promise.all([
  151 |     page.waitForEvent('download'),
  152 |     exportButton.click(),
  153 |   ]);
  154 |   const stream = await download.createReadStream();
  155 |   expect(stream).not.toBeNull();
  156 |   let exported = '';
  157 |   for await (const chunk of stream!) exported += chunk.toString();
  158 |   expect(exported).toContain('Not recorded');
  159 |   expect(exported).toContain('Unavailable');
  160 |   expect(exported).not.toMatch(/NaN|undefined|Infinity|Prediction supported/);
  161 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  162 |   const exportLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  163 |   expect(exportLog).toHaveLength(1);
  164 |   expect(exportLog[0].text).toContain('Exported orbital evidence');
  165 | 
  166 |   const wrongWorldStore = {
  167 |     mercury: {
  168 |       a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
  169 |       b: { bodyId: 'mercury', bodyName: 'Mercury', time: 0.12, distance: 0.467, speed: 38.9, phase: 'Near aphelion' },
  170 |       prediction: 'faster',
  171 |       predictionResult: { choice: 'faster', actual: 'faster', correct: true, speedDelta: 8.6, distanceDelta: -0.516 },
  172 |       observationLogged: false,
  173 |     },
  174 |   };
  175 |   await updateState(page, { orr_snapshots: wrongWorldStore });
  176 |   await expect(quality).toContainText(/Recapture A/i);
  177 |   await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  178 |   await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  179 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(wrongWorldStore);
  180 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(exportLog);
  181 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  182 | });
  183 | 
  184 | test('explicit recapture repairs saved evidence and routes to paused orbit controls without changing it', async ({ page }) => {
  185 |   const earthEvidence = {
  186 |     a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
  187 |   };
  188 |   await mountJourney(page, 320, true, {
  189 |     orr_snapshots: { ...incompleteStore, earth: earthEvidence },
  190 |     orr_mission_progress: { mercury_speed: { started: true } },
  191 |     missionLog: [{ time: 'Earlier', text: 'Preserve my earlier work.' }],
  192 |   });
  193 |   const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  194 |   await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
  195 |   const afterA = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  196 |   expect(afterA.earth).toEqual(earthEvidence);
  197 |   expect(afterA.mercury.a.bodyId).toBe('mercury');
  198 |   for (const field of ['time', 'distance', 'speed']) expect(Number.isFinite(afterA.mercury.a[field])).toBe(true);
  199 |   expect(afterA.mercury.b).toBeNull();
  200 |   expect(afterA.mercury.prediction).toBe('');
  201 |   expect(afterA.mercury.predictionResult).toBeNull();
  202 |   await evidence.getByRole('combobox', { name: 'Predict B: will orbital speed be faster, slower, or about the same as A?', exact: true }).selectOption('slower');
  203 |   await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true })).toBeEnabled();
  204 | 
  205 |   const showControls = evidence.getByRole('button', { name: 'Show orbit controls', exact: true });
  206 |   await showControls.scrollIntoViewIfNeeded();
  207 |   // The map is above the evidence panel, so its clock does not advance offscreen.
  208 |   await showControls.evaluate((button) => button.scrollIntoView({ block: 'start' }));
  209 |   await updateState(page, { orr_paused: false });
  210 |   const beforeRoute = await investigationState(page);
  211 |   expect(beforeRoute.paused).toBe(false);
  212 |   await showControls.click();
  213 |   const phase = page.locator('#orrery-phase-scrubber');
  214 |   await expect(phase).toBeFocused();
  215 |   await expect(phase).toBeVisible();
  216 |   expect(await investigationState(page)).toEqual({ ...beforeRoute, paused: true });
  217 | 
  218 |   await page.locator('#orrery-timeline-jump-2').click();
  219 |   await evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true }).click();
  220 |   await expect(evidence.locator('.orr-evidence-result')).toHaveAttribute('data-supported', 'true');
  221 |   await expect(evidence).toContainText('Prediction supported');
  222 |   await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  223 |   const repaired = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  224 |   expect(repaired.earth).toEqual(earthEvidence);
  225 |   expect(repaired.mercury.a).toEqual(afterA.mercury.a);
  226 |   expect(repaired.mercury.b.bodyId).toBe('mercury');
  227 |   expect(repaired.mercury.b.distance).toBeGreaterThan(repaired.mercury.a.distance);
  228 |   expect(repaired.mercury.b.speed).toBeLessThan(repaired.mercury.a.speed);
  229 |   await evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true }).click();
  230 |   const recorded = evidence.getByRole('button', { name: 'Observation already recorded for Mercury', exact: true });
  231 |   await expect(recorded).toBeDisabled();
  232 |   const savedLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  233 |   expect(savedLog).toHaveLength(2);
  234 |   expect(savedLog[0].text).toBe('Preserve my earlier work.');
  235 |   expect(savedLog[1].text).toContain('Orrery observation: Mercury');
  236 |   await updateState(page, { orr_zoom: 'full' });
  237 |   await expect(recorded).toBeDisabled();
  238 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(savedLog);
  239 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  240 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  241 | });
```