# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 100-solar-system-world-detail.spec.ts >> world detail keeps unique Follow and Compare actions in the navigator through rerenders
- Location: tests\e2e\100-solar-system-world-detail.spec.ts:197:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('button', { name: 'Follow Halley with the camera', exact: true })
Expected: "false"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Follow Halley with the camera', exact: true })

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
    - status: Halley’s Comet completes one orbit in about 1.3 min at 1.0 Earth yr/s.
    - status: Reduced motion on · pulses and camera glides off
  - group "Orbit phase controls":
    - text: Phase
    - slider "Orbit phase for Halley’s Comet": "0"
    - group "Halley’s Comet orbit timeline landmarks": Orbit landmarks Near perihelion Perihelion Quarter orbit Aphelion Three-quarter orbit Next perihelion
    - status: 0.0 / 75.3 yr · Earth year 1 · day 1
    - text: Jump
    - button "Jump to perihelion for Halley’s Comet" [pressed]: ☀ Perihelion
    - button "Jump to quarter orbit for Halley’s Comet": Quarter orbit
    - button "Jump to aphelion for Halley’s Comet": ❄ Aphelion
    - button "Jump to three-quarter orbit for Halley’s Comet": Three-quarter orbit
    - button "Jump to next perihelion for Halley’s Comet": ☀ Next perihelion
  - group:
    - text: Map display options
    - group "Orbit view controls":
      - button "Reset orbit time, camera view, and selection": Reset view
      - text: "Marker size:"
      - button "Use teaching marker sizes, enlarged for visibility" [pressed]: Teaching
      - button "Use radius-informed marker sizes, compressed and clamped for visibility": Comparative
      - text: "Markers enlarged for discovery Zoom:"
      - button "Zoom to inner planets": Inner
      - button "Show the full solar system" [pressed]: Full
      - button "Zoom to outer planets": Outer
    - text: "Show:"
    - button "Show comets" [pressed]: ☄ Comets
    - button "Show dwarf planets" [pressed]: ⚳ Dwarfs
    - button "Show motion and gravity directions": Motion + gravity
    - button "Show orbit labels" [pressed]: Aa Labels
  - group "Keyboard world navigator":
    - text: Comet
    - strong: Halley’s Comet
    - text: Select a world
    - combobox "Select a world":
      - option "Choose a world..."
      - option "☿ Mercury"
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
      - option "☄ Halley’s Comet" [selected]
      - option "☄ Encke’s Comet"
    - text: Orbital period
    - strong: 75.30 Earth years
    - group "Selected world actions":
      - button "Follow Halley’s Comet with the camera": Follow camera
      - text: Compare Halley’s Comet with
      - combobox "Compare Halley’s Comet with another world":
        - option "Choose another world..."
        - option "☿ Mercury"
        - option "♀ Venus"
        - option "🌍 Earth"
        - option "♂ Mars" [selected]
        - option "♃ Jupiter"
        - option "♄ Saturn"
        - option "⛢ Uranus"
        - option "♆ Neptune"
        - option "♇ Pluto"
        - option "⚳ Ceres"
        - option "⬭ Haumea"
        - option "⚷ Eris"
        - option "☄ Encke’s Comet"
    - status: "Focused: Halley’s Comet"
    - text: "Keyboard: arrows pan; + and - zoom; Home reset; Enter/Space select next world; Escape clears selection"
  - text: "Live orbit map Halley’s Comet in focus Paused Teaching markers Focus: Halley’s Comet"
  - application "Interactive solar system orbit map. Current view is the full solar system. In full-system view, a magnified inner-system inset plots Mercury through Mars with one common orbital-distance scale while enlarging markers for visibility. Select a world to inspect its orbit; the selected world has an arrow showing motion direction and relative speed plus a shaded equal-time sweep and live speed gauge; the live readout includes elapsed Earth years and day of year; marker sizes are enlarged for teaching; when comparison is active its orbit uses a dashed path; reduced-motion mode keeps decorative effects still; use the Follow camera toggle in the selected-world card, or pan and zoom to release follow; Enter or Space selects the next world; press Escape to clear selection. Halley’s Comet is selected. The orbital clock is paused."
  - status:
    - text: Live reading
    - strong: Halley’s Comet
    - text: Distance 0.587 AU · speed 54.55 km/s · Near perihelion
  - region "Scrollable Orrery visual key":
    - text: Habitable zone Orbit paths
    - status: "Ruler: 5 AU"
    - text: Magnified inner inset Teaching marker sizes → Velocity vector Equal-time sweep Comparison orbit
  - note: Dashed path = comparison orbit · hover for details
  - note: "Model note: markers are enlarged for visibility; distances use the zoom scale, so this is not one literal scale. The blue ruler shows the current map distance. The magnified inner-system inset uses one common orbital-distance scale for Mercury through Mars; its markers are enlarged for visibility."
  - status
  - region "Halley’s Comet":
    - text: Comet
    - heading "Halley’s Comet" [level=3]
    - button "Clear selected world": ✖
    - paragraph: Most famous periodic comet, next perihelion 2061.
    - heading "Current reading" [level=4]
    - term: Distance from Sun
    - definition: 0.587 AU
    - term: Orbital speed
    - definition: 54.55 km/s
    - term: Orbital phase
    - definition: Near perihelion
    - heading "Orbit and world properties" [level=4]
    - term: Orbit size (a)
    - definition: 17.830 AU
    - term: Orbit shape (e)
    - definition: "0.9671"
    - term: Orbital period (T)
    - definition: 75.30 yr
    - term: Orbit tilt (i)
    - definition: 162.3°
    - term: Closest to Sun
    - definition: 0.587 AU
    - term: Farthest from Sun
    - definition: 35.073 AU
    - paragraph: "Shape (e): 0 is circular; higher values mean a more stretched orbit. Tilt (i) is measured from the model’s reference plane."
    - status: "Halley’s Comet: distance 0.587 AU; speed 54.55 km/s; phase Near perihelion"
    - note "Kepler II speed cue for Halley’s Comet":
      - text: "Kepler II cue Equal areas in equal times mean closer to the Sun → faster; farther away → slower. Halley’s Comet is inside its semi-major axis a (17.830 AU). Inside a: moving faster than the reference speed at a. Reference at a: 7.05 km/s · Current: 54.55 km/s"
      - note "Kepler III period cue for Halley’s Comet": "Kepler III check: T² / a³ = 1.000 yr²/AU³ ≈ 1 for a Sun-centered orbit."
      - text: Perihelion · closest Aphelion · farthest
      - 'img "Orbital position of Halley’s Comet: near perihelion (closest) at 0.587 AU"'
      - status: Halley’s Comet is near perihelion (closest) at 0.587 AU; speed 54.55 km/s.
      - text: a = 17.830 AU marker = current distance
    - region "Orbital comparison for Halley’s Comet with Mars":
      - text: Compare orbits
      - table "Orbital comparison between Halley’s Comet and Mars":
        - caption: Values update with the simulation
        - rowgroup:
          - row "Measure ☄ Halley’s Comet ♂ Mars":
            - columnheader "Measure"
            - columnheader "☄ Halley’s Comet"
            - columnheader
            - columnheader "♂ Mars"
        - rowgroup:
          - row "Orbit size (a) 17.83 AU vs 1.52 AU":
            - rowheader "Orbit size (a)"
            - cell "17.83 AU"
            - cell "vs"
            - cell "1.52 AU"
          - row "Period (T) 75.30 yr vs 1.88 yr":
            - rowheader "Period (T)"
            - cell "75.30 yr"
            - cell "vs"
            - cell "1.88 yr"
          - row "Eccentricity (e) 0.967 vs 0.093":
            - rowheader "Eccentricity (e)"
            - cell "0.967"
            - cell "vs"
            - cell "0.093"
          - row "Current distance 0.587 AU vs 1.382 AU":
            - rowheader "Current distance"
            - cell "0.587 AU"
            - cell "vs"
            - cell "1.382 AU"
          - row "Current speed 54.5 km/s vs 26.5 km/s":
            - rowheader "Current speed"
            - cell "54.5 km/s"
            - cell "vs"
            - cell "26.5 km/s"
      - note "Plain-language orbital comparison between Halley’s Comet and Mars": "Halley’s Comet is currently closer to the Sun than Mars and is moving faster than Mars. Kepler III: Halley’s Comet has the larger orbit and the longer period."
    - region "A/B orbital evidence for Halley’s Comet":
      - text: Orbital evidence snapshots Capture A → predict → capture B → compare
      - status: "Next: capture A"
      - button "Save orbital snapshot A for Halley’s Comet": Save A
      - button "Save orbital snapshot B for Halley’s Comet after saving snapshot A" [disabled]: Save B
      - button "Clear orbital snapshots for Halley’s Comet" [disabled]: Clear
      - button "Export orbital evidence for Halley’s Comet" [disabled]: Export evidence
      - text: Saving pauses the clock A · empty B · empty
      - paragraph: Save A, choose a prediction, move the body along its orbit, then save B to compare evidence.
  - region "Orbit rhythm for Halley’s Comet":
    - heading "Orbit rhythm · Halley’s Comet" [level=3]
    - 'img "Halley’s Comet: equal time, changing speed"': Sun Aphelion Perihelion
    - figure "Speed through one orbit":
      - text: Speed through one orbit
      - 'img "Halley’s Comet: orbital speed over time"': Speed (km/s) 0 30 60 0% 50% 100% Elapsed time in one orbit
      - text: Inspect orbit time
      - slider "Inspect orbit time": "0"
      - status: 0.0% of orbit · at a turning point in distance
      - button "Inspect matching distance" [disabled]
    - paragraph: "Now: 0.587 AU from the Sun · 54.55 km/s"
    - group "Equal-time orbit steps":
      - button "Step backward one twelfth of Halley’s Comet's orbit": ← Back 1/12
      - button "Step forward one twelfth of Halley’s Comet's orbit": Forward 1/12 →
      - button "Preview next equal-time step": Preview next step
    - paragraph: "Solid ring: now. Dotted ring: same distance, same speed. Arrows show direction only."
    - group: How to read these views
- status
```

# Test source

```ts
  124 |         return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  125 |       });
  126 |       return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  127 |     };
  128 |     const background = (node: Element): Color | null => {
  129 |       const layers: Color[] = [];
  130 |       let ancestor: Element | null = node;
  131 |       while (ancestor) {
  132 |         const style = getComputedStyle(ancestor);
  133 |         if (style.backgroundImage !== 'none') return null;
  134 |         const color = parse(style.backgroundColor);
  135 |         if (color && color.a > 0) {
  136 |           layers.push(color);
  137 |           if (color.a >= 0.999) break;
  138 |         }
  139 |         ancestor = ancestor.parentElement;
  140 |       }
  141 |       const base = layers.pop();
  142 |       if (!base || base.a < 0.999) return null;
  143 |       return layers.reverse().reduce((result, layer) => over(layer, result), base);
  144 |     };
  145 |     const numeric = [...element.querySelectorAll('tbody td')].filter((cell) => /\d/.test(cell.textContent || ''));
  146 |     const headers = [...element.querySelectorAll('thead th')].filter((cell) => !!cell.textContent?.trim());
  147 |     const contrastFailures: unknown[] = [];
  148 |     for (const cell of [...numeric, ...headers]) {
  149 |       const backdrop = background(cell);
  150 |       const foreground = parse(getComputedStyle(cell).color);
  151 |       if (!backdrop || !foreground) {
  152 |         contrastFailures.push({ text: cell.textContent, error: 'No measurable solid backdrop' });
  153 |         continue;
  154 |       }
  155 |       const ink = over(foreground, backdrop);
  156 |       const a = luminance(ink), b = luminance(backdrop);
  157 |       const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  158 |       if (ratio < 4.49) contrastFailures.push({ text: cell.textContent, ratio });
  159 |     }
  160 |     const bounds = element.getBoundingClientRect();
  161 |     const detail = element.closest('#orrery-world-detail')!.getBoundingClientRect();
  162 |     const contentOverflow: unknown[] = [];
  163 |     for (const cell of element.querySelectorAll('th, td, caption')) {
  164 |       const range = document.createRange();
  165 |       range.selectNodeContents(cell);
  166 |       for (const rect of range.getClientRects()) {
  167 |         if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
  168 |           contentOverflow.push({ text: cell.textContent, left: rect.left, right: rect.right });
  169 |         }
  170 |       }
  171 |     }
  172 |     return {
  173 |       numericCells: numeric.length, contrastFailures, contentOverflow,
  174 |       contained: bounds.left >= detail.left - 1 && bounds.right <= detail.right + 1,
  175 |       tableOverflow: element.scrollWidth > element.clientWidth + 1,
  176 |       documentWidth: document.documentElement.scrollWidth,
  177 |       viewportWidth: window.innerWidth,
  178 |     };
  179 |   });
  180 |   expect(report.numericCells).toBe(expectedNumericCells);
  181 |   expect(report.contrastFailures, JSON.stringify(report.contrastFailures)).toEqual([]);
  182 |   expect(report.contentOverflow, JSON.stringify(report.contentOverflow)).toEqual([]);
  183 |   expect(report.contained).toBe(true);
  184 |   expect(report.tableOverflow).toBe(false);
  185 |   expect(report.documentWidth).toBeLessThanOrEqual(report.viewportWidth + 1);
  186 | }
  187 | 
  188 | test('world detail pairs readable labels with live text leaves for Mercury and a comet', async ({ page }) => {
  189 |   await mountWorld(page);
  190 |   await expectWorldDefinitions(page, 'mercury', 'Mercury');
  191 |   await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
  192 |   await expectWorldDefinitions(page, 'halley', 'Halley');
  193 |   await expect(page.locator('#orrery-world-detail .orr-detail-type')).toHaveText('Comet');
  194 |   await expect(page.locator('#orrery-world-detail [aria-hidden="true"]').first()).toHaveAttribute('aria-hidden', 'true');
  195 | });
  196 | 
  197 | test('world detail keeps unique Follow and Compare actions in the navigator through rerenders', async ({ page }) => {
  198 |   await mountWorld(page);
  199 |   const navigator = page.getByRole('group', { name: 'Keyboard world navigator', exact: true });
  200 |   const actions = navigator.getByRole('group', { name: 'Selected world actions', exact: true });
  201 |   const follow = page.getByRole('button', { name: 'Follow Mercury with the camera', exact: true });
  202 |   const compare = page.getByRole('combobox', { name: 'Compare Mercury with another world', exact: true });
  203 |   await expect(follow).toHaveCount(1);
  204 |   await expect(page.locator('#orrery-compare-body')).toHaveCount(1);
  205 |   await expect(actions.getByRole('button', { name: 'Follow Mercury with the camera', exact: true })).toHaveCount(1);
  206 |   await expect(actions.getByRole('combobox', { name: 'Compare Mercury with another world', exact: true })).toHaveCount(1);
  207 |   await expect(actions.locator('label[for="orrery-compare-body"]')).toHaveText('Compare Mercury with');
  208 |   await expect(page.locator('#orrery-world-detail #orrery-compare-body')).toHaveCount(0);
  209 |   await follow.focus();
  210 |   await follow.press('Enter');
  211 |   const release = page.getByRole('button', { name: 'Release camera follow for Mercury', exact: true });
  212 |   await expect(release).toHaveAttribute('aria-pressed', 'true');
  213 |   await compare.selectOption('mars');
  214 |   await expect(release).toHaveCount(1);
  215 |   await expect(release).toHaveAttribute('aria-pressed', 'true');
  216 |   await expect(compare).toHaveValue('mars');
  217 |   await expect(page.getByRole('region', { name: 'Orbital comparison for Mercury with Mars', exact: true })).toBeVisible();
  218 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_follow)).toBe('mercury');
  219 |   await release.focus();
  220 |   await release.press('Space');
  221 |   await expect(follow).toHaveAttribute('aria-pressed', 'false');
  222 |   await follow.click();
  223 |   await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
> 224 |   await expect(page.getByRole('button', { name: 'Follow Halley with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');
      |                                                                                                  ^ Error: expect(locator).toHaveAttribute(expected) failed
  225 |   await expect(page.getByRole('combobox', { name: 'Compare Halley with another world', exact: true })).toHaveCount(1);
  226 | });
  227 | 
  228 | test('world detail preserves native display-options keyboard state across world selection', async ({ page }) => {
  229 |   await mountWorld(page, 320);
  230 |   const options = page.locator('details#orrery-display-options');
  231 |   const summary = options.locator(':scope > summary');
  232 |   const views = options.getByRole('group', { name: 'Orbit view controls', exact: true, includeHidden: true });
  233 |   await expect(summary).toHaveText('Map display options');
  234 |   await expect(options).toHaveJSProperty('open', true);
  235 |   await summary.focus();
  236 |   await summary.press('Enter');
  237 |   await expect(options).toHaveJSProperty('open', false);
  238 |   await expect(views).toBeHidden();
  239 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(false);
  240 |   await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
  241 |   await expect(options).toHaveJSProperty('open', false);
  242 |   await expect(summary).toBeVisible();
  243 |   await summary.focus();
  244 |   await summary.press('Space');
  245 |   await expect(options).toHaveJSProperty('open', true);
  246 |   await expect(views).toBeVisible();
  247 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(true);
  248 |   await page.getByLabel('Select a world', { exact: true }).selectOption('mercury');
  249 |   await expect(options).toHaveJSProperty('open', true);
  250 |   await expect(summary).toBeVisible();
  251 | });
  252 | 
  253 | for (const width of [320, 1180]) {
  254 |   for (const dark of [false, true]) {
  255 |     test(`world detail comparison and evidence tables stay accessible and readable at ${width}px in ${dark ? 'dark' : 'light'} theme`, async ({ page }, info) => {
  256 |       await mountWorld(page, width, dark, { orr_compare: 'mars' });
  257 |       const fonts = await page.locator('#orrery-world-detail').evaluate((detail) => {
  258 |         const nodes = [detail, detail.querySelector('h3'), detail.querySelector('dt'), detail.querySelector('#orrery-live-distance')];
  259 |         return nodes.map((node) => {
  260 |           if (!node) throw new Error('Detail font sample was missing');
  261 |           const style = getComputedStyle(node);
  262 |           return { tag: node.tagName, id: node.id, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
  263 |         });
  264 |       });
  265 |       await info.attach('world-detail-fonts', {
  266 |         body: Buffer.from(JSON.stringify({ width, theme: dark ? 'dark' : 'light', fonts }, null, 2)),
  267 |         contentType: 'application/json',
  268 |       });
  269 |       const comparison = page.getByRole('table', { name: 'Orbital comparison between Mercury and Mars', exact: true });
  270 |       await expect(comparison).toBeVisible();
  271 |       await expectTableRelationships(page, comparison, [
  272 |         'Orbit size (a)', 'Period (T)', 'Eccentricity (e)', 'Current distance', 'Current speed',
  273 |       ], false);
  274 |       await expectReadableContainedTable(comparison, 10);
  275 | 
  276 |       const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  277 |       await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after saving snapshot A', exact: true })).toBeDisabled();
  278 |       await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
  279 |       await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after choosing a prediction', exact: true })).toBeDisabled();
  280 |       await evidence.getByRole('combobox', { name: 'Predict whether Mercury will be faster, slower, or about the same at snapshot B', exact: true }).selectOption('slower');
  281 |       const saveB = evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true });
  282 |       await expect(saveB).toBeEnabled();
  283 |       await page.locator('#orrery-timeline-jump-2').click();
  284 |       await expect(page.locator('#orrery-live-phase')).toContainText(/aphelion/i);
  285 |       await saveB.click();
  286 |       const change = evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true });
  287 |       await expect(change).toBeVisible();
  288 |       await expectTableRelationships(page, change, ['Elapsed time', 'Distance', 'Orbital speed'], true);
  289 |       await expect(evidence).toContainText('Prediction supported');
  290 |       await expectReadableContainedTable(change, 9);
  291 |       await expectReadableContainedTable(comparison, 10);
  292 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  293 |     });
  294 |   }
  295 | }
  296 | 
```