# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 101-solar-system-orbit-learning-visual.spec.ts >> orbit learning and evidence remain usable at 320px in dark theme
- Location: tests\e2e\101-solar-system-orbit-learning-visual.spec.ts:87:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('combobox', { name: 'Predict whether Mercury will be faster, slower, or about the same at snapshot B', exact: true })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true }).getByRole('combobox', { name: 'Predict whether Mercury will be faster, slower, or about the same at snapshot B', exact: true })

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
  - region "Earth live orbit":
    - text: Guided mission
    - heading "Earth live orbit" [level=3]
    - text: 0/3 complete
    - list "Guided mission progress":
      - listitem:
        - 'button "Open mission: Earth live orbit"': Earth live orbit Current
      - listitem:
        - 'button "Open mission: Mercury speed zone"': Mercury speed zone Not started
      - listitem:
        - 'button "Open mission: Longer year"': Longer year Not started
    - paragraph: Open any mission to continue or review it. Your orbit time and saved evidence stay in place until you use a focus or capture action.
    - paragraph: "Pause the orbit clock and predict: is Earth currently closer to or farther from the Sun than 1 AU?"
    - button "Focus Earth and pause"
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
  - text: "Live orbit map Mercury in focus Paused Focus: Mercury"
  - application "Interactive solar system orbit map. Current view is inner planets. In full-system view, a magnified inner-system inset plots Mercury through Mars with one common orbital-distance scale while enlarging markers for visibility. Select a world to inspect its orbit; the selected world has an arrow showing motion direction and relative speed plus a shaded equal-time sweep and live speed gauge; the live readout includes elapsed Earth years and day of year; marker sizes are enlarged for teaching; when comparison is active its orbit uses a dashed path; reduced-motion mode keeps decorative effects still; use the Follow camera toggle in the world navigator, or pan and zoom to release follow; Enter or Space selects the next world; press Escape to clear selection. Mercury is selected. The orbital clock is paused."
  - status:
    - text: Live reading
    - strong: Mercury
    - text: Distance 0.307 AU · speed 58.99 km/s · Near perihelion
  - region "Scrollable Orrery visual key":
    - text: Habitable zone Orbit paths
    - status: "Ruler: 1 AU"
    - text: Teaching marker sizes → Velocity vector Equal-time sweep
  - text: More key items →
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
      - status: "Next: predict B"
      - list "Orbital evidence workflow":
        - listitem: Capture A
        - listitem: Predict B
        - listitem: Capture B
        - listitem: Compare
      - button "Save orbital snapshot A for Mercury": Save orbital snapshot A
      - button "Save orbital snapshot B for Mercury after choosing a prediction" [disabled]: Save orbital snapshot B
      - button "Clear orbital snapshots for Mercury": Clear orbital snapshots
      - button "Export orbital evidence for Mercury" [disabled]: Export orbital evidence
      - button "Show orbit controls"
      - text: Saving pauses the clock
      - paragraph: Use Orbit phase or a landmark to inspect a different point before saving B. Show orbit controls pauses the clock and takes you to the phase slider.
      - paragraph: Saving A again replaces A, clears B and resets your prediction. Recorded mission-log entries stay saved.
      - region "Snapshot A":
        - heading "Snapshot A" [level=5]
        - text: Captured
        - term: Simulation time
        - definition: 0.00 yr
        - term: Orbital speed
        - definition: 59.0 km/s
        - term: Distance from Sun
        - definition: 0.307 AU
      - region "Snapshot B":
        - heading "Snapshot B" [level=5]
        - text: Not captured
        - paragraph: Choose a prediction, move along the orbit, then save B.
      - text: "Predict B: will orbital speed be faster, slower, or about the same as A?"
      - 'combobox "Predict B: will orbital speed be faster, slower, or about the same as A?"':
        - option "Choose faster, slower, or about the same..." [selected]
        - option "Faster than A"
        - option "Slower than A"
        - option "About the same as A"
      - paragraph: "Use distance as evidence: closer to the Sun usually means faster; farther means slower; nearly the same distance can mean about the same speed."
      - paragraph: Save A, choose a prediction, move the body along its orbit, then save B to compare evidence.
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
  63  |   expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1);
  64  |   expect(bounds.pageWidth).toBeLessThanOrEqual(width + 1);
  65  |   expect(bounds.overflowing, JSON.stringify(bounds)).toEqual([]);
  66  | }
  67  | 
  68  | async function expectComfortableControls(region: Locator) {
  69  |   const controls = await region.locator('button, input[type="range"], select, summary').evaluateAll((elements) =>
  70  |     elements.map((element) => {
  71  |       const rect = element.getBoundingClientRect();
  72  |       return {
  73  |         name: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
  74  |         width: rect.width,
  75  |         height: rect.height,
  76  |       };
  77  |     }).filter(({ width, height }) => width > 0 && height > 0));
  78  |   expect(controls.length).toBeGreaterThan(0);
  79  |   for (const control of controls) {
  80  |     expect(control.height, control.name).toBeGreaterThanOrEqual(43.5);
  81  |     expect(control.width, control.name).toBeGreaterThanOrEqual(43.5);
  82  |   }
  83  | }
  84  | 
  85  | for (const width of [320, 1060]) {
  86  |   for (const dark of [false, true]) {
  87  |     test(`orbit learning and evidence remain usable at ${width}px in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
  88  |       let downloadCount = 0;
  89  |       const pageErrors: string[] = [];
  90  |       page.on('download', () => { downloadCount += 1; });
  91  |       page.on('pageerror', (error) => { pageErrors.push(error.message); });
  92  |       await mountLearning(page, width, dark);
  93  | 
  94  |       const panel = page.locator('.orr-rhythm-panel');
  95  |       const figures = panel.locator('[data-orbit-linked-views] figure');
  96  |       await expect(figures).toHaveCount(2);
  97  |       for (const figure of await figures.all()) await expect(figure.locator('figcaption')).toHaveCount(1);
  98  |       const figureBoxes = await figures.evaluateAll((elements) => elements.map((element) => {
  99  |         const rect = element.getBoundingClientRect();
  100 |         return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
  101 |       }));
  102 |       if (width > 640) {
  103 |         expect(Math.abs(figureBoxes[0].top - figureBoxes[1].top)).toBeLessThanOrEqual(2);
  104 |         expect(figureBoxes[0].right).toBeLessThanOrEqual(figureBoxes[1].left + 1);
  105 |         expect(figureBoxes.every((box) => box.width >= 300)).toBe(true);
  106 |       } else {
  107 |         expect(figureBoxes[0].bottom).toBeLessThanOrEqual(figureBoxes[1].top + 1);
  108 |         expect(Math.abs(figureBoxes[0].left - figureBoxes[1].left)).toBeLessThanOrEqual(2);
  109 |       }
  110 | 
  111 |       const orbit = panel.getByRole('img', { name: 'Mercury: equal time, changing speed', exact: true });
  112 |       const speed = panel.getByRole('img', { name: 'Mercury: orbital speed over time', exact: true });
  113 |       await expect(orbit).toHaveAccessibleDescription(/Twelve dots mark equal time intervals/);
  114 |       await expect(orbit).toHaveAccessibleDescription(/Sun is at one focus/);
  115 |       await expect(orbit).toHaveAccessibleDescription(/arrow length does not represent speed/);
  116 |       await expect(speed).toHaveAccessibleDescription(/zero-based axis/);
  117 |       await expect(speed).toHaveAccessibleDescription(/elapsed time as a percentage of one orbit/);
  118 |       await expect(orbit.locator('[data-rhythm-moment]')).toHaveCount(12);
  119 |       const readShape = () => orbit.locator('ellipse').evaluate((ellipse) =>
  120 |         ['cx', 'cy', 'rx', 'ry'].map((attribute) => ellipse.getAttribute(attribute)));
  121 |       const shapeBefore = await readShape();
  122 | 
  123 |       const details = panel.locator('[data-orbit-rhythm-details]');
  124 |       const summary = details.locator(':scope > summary');
  125 |       await expect(summary).toHaveText('How to read these views');
  126 |       await expect(details).toHaveJSProperty('open', false);
  127 |       const stateBeforeDisclosure = await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem));
  128 |       await summary.focus();
  129 |       await summary.press('Enter');
  130 |       await expect(details).toHaveJSProperty('open', true);
  131 |       await expect(summary).toBeFocused();
  132 |       await expect(details).toContainText('velocity points in different directions');
  133 |       await expect(details.getByRole('link', { name: /NASA/ })).toBeVisible();
  134 |       await expectComfortableControls(panel);
  135 |       await expectContained(panel, width);
  136 |       await summary.press('Space');
  137 |       await expect(details).toHaveJSProperty('open', false);
  138 |       await expect(summary).toBeFocused();
  139 |       expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem))).toBe(stateBeforeDisclosure);
  140 | 
  141 |       const liveIds = [
  142 |         'orrery-rhythm-reading', 'orrery-speed-inspect-reading',
  143 |         'orrery-live-distance', 'orrery-live-speed', 'orrery-live-phase',
  144 |         'orrery-live-selected-summary',
  145 |       ];
  146 |       const retained = await page.evaluateHandle((ids) => ids.map((id) => document.getElementById(id)), liveIds);
  147 |       const expectRetainedLeaves = async () => expect(await page.evaluate((nodes) => nodes.every((node) =>
  148 |         !!node && document.getElementById(node.id) === node && node.children.length === 0), retained)).toBe(true);
  149 |       await expectRetainedLeaves();
  150 | 
  151 |       const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  152 |       await expect(evidence).toHaveClass(/orr-evidence/);
  153 |       await expect(evidence.getByRole('heading', { name: 'Orbital evidence snapshots', exact: true })).toBeVisible();
  154 |       await expect(evidence.locator('.orr-evidence-snapshot')).toHaveCount(2);
  155 |       await expectComfortableControls(evidence);
  156 |       await expectContained(evidence, width);
  157 |       await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after saving snapshot A', exact: true })).toBeDisabled();
  158 |       await expect(evidence.getByRole('button', { name: 'Export orbital evidence for Mercury', exact: true })).toBeDisabled();
  159 |       await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
  160 |       await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after choosing a prediction', exact: true })).toBeDisabled();
  161 |       await expect(evidence).toContainText('Next: predict B');
  162 |       const prediction = evidence.getByRole('combobox', { name: 'Predict whether Mercury will be faster, slower, or about the same at snapshot B', exact: true });
> 163 |       await expect(prediction).toBeVisible();
      |                                ^ Error: expect(locator).toBeVisible() failed
  164 |       await expectComfortableControls(evidence);
  165 |       await prediction.selectOption('slower');
  166 |       const saveB = evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true });
  167 |       await expect(saveB).toBeEnabled();
  168 |       await page.getByRole('button', { name: 'Jump to aphelion for Mercury', exact: true }).click();
  169 |       await expect(page.locator('#orrery-live-phase')).toContainText(/aphelion/i);
  170 |       await saveB.click();
  171 |       await expect(evidence).toContainText('Prediction supported');
  172 |       await expect(evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true })).toBeVisible();
  173 |       const snapshots = evidence.locator('.orr-evidence-snapshot');
  174 |       await expect(snapshots.locator('dl')).toHaveCount(2);
  175 |       const definitions = await snapshots.locator('dl').evaluateAll((lists) => lists.map((list) =>
  176 |         [...list.querySelectorAll('dt')].map((term) => ({
  177 |           label: term.textContent?.trim(),
  178 |           tag: term.nextElementSibling?.tagName,
  179 |           value: term.nextElementSibling?.textContent?.trim(),
  180 |         }))));
  181 |       expect(definitions.every((pairs) => pairs.length >= 3 && pairs.every((pair) =>
  182 |         !!pair.label && pair.tag === 'DD' && !!pair.value))).toBe(true);
  183 |       const capturesBeforeStep = await snapshots.allTextContents();
  184 |       await panel.getByRole('button', { name: "Step forward one twelfth of Mercury's orbit", exact: true }).click();
  185 |       expect(await snapshots.allTextContents()).toEqual(capturesBeforeStep);
  186 |       expect(await readShape()).toEqual(shapeBefore);
  187 |       await expectRetainedLeaves();
  188 |       await expectComfortableControls(panel);
  189 |       await expectComfortableControls(evidence);
  190 |       await expectContained(panel, width);
  191 |       await expectContained(evidence, width);
  192 | 
  193 |       await evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true }).click();
  194 |       const recorded = evidence.getByRole('button', { name: 'Observation already recorded for Mercury', exact: true });
  195 |       await expect(recorded).toBeDisabled();
  196 |       await page.evaluate(() => (window as any).__rerender());
  197 |       await expect(recorded).toBeDisabled();
  198 |       const entries = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog || []);
  199 |       expect(entries.filter((entry: { text: string }) => entry.text.includes('Orrery observation: Mercury'))).toHaveLength(1);
  200 |       expect(entries[0].text).toContain('slower than at A');
  201 |       expect(entries.some((entry: { text: string }) => /Exported orbital evidence/.test(entry.text))).toBe(false);
  202 |       expect(downloadCount).toBe(0);
  203 |       await expectRetainedLeaves();
  204 |       await retained.dispose();
  205 |       expect(pageErrors).toEqual([]);
  206 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  207 |     });
  208 |   }
  209 | }
  210 | 
```