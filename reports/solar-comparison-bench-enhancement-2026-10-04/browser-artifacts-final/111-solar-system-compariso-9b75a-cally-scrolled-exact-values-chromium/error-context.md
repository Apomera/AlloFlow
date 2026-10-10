# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 111-solar-system-comparison-bench.spec.ts >> 320px light comparison keeps readable controls and a pinned measure alongside locally scrolled exact values
- Location: tests\e2e\111-solar-system-comparison-bench.spec.ts:343:7

# Error details

```
Error: rendered labels, measurements, exact values and explanations retain readable themed contrast

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 22

- Array []
+ Array [
+   Object {
+     "font": 14,
+     "ratio": 1.0462758042084466,
+     "text": "Earth",
+   },
+   Object {
+     "font": 13,
+     "ratio": 1.48470221380943,
+     "text": "12,742 km diameter",
+   },
+   Object {
+     "font": 14,
+     "ratio": 1.0462758042084466,
+     "text": "Jupiter",
+   },
+   Object {
+     "font": 13,
+     "ratio": 1.48470221380943,
+     "text": "139,822 km diameter",
+   },
+ ]
```

# Test source

```ts
  111 |   expect(sample.same).toBe(String(pair[0] === pair[1]));
  112 |   expect(sample.portraits.map((portrait) => portrait.key)).toEqual(pair);
  113 |   // Chromium serializes CSSOM lengths with limited decimal precision; keep
  114 |   // exact model metadata while allowing less than 0.001px in inline lengths.
  115 |   expect(sample.portraits.filter((portrait, index) => {
  116 |     const radius = worlds[pair[index]].radius, raw = 128 * radius / radiusMax, drawn = Math.max(3, raw);
  117 |     return ![portrait.diameter, portrait.raw, portrait.drawn, portrait.width, portrait.height, portrait.styleWidth, portrait.styleHeight].every(Number.isFinite) ||
  118 |       portrait.diameter !== 2 * radius || Math.abs(portrait.raw - raw) > 1e-9 || Math.abs(portrait.drawn - drawn) > 1e-9 ||
  119 |       portrait.exaggerated !== String(raw < 3) || Math.abs(portrait.width - drawn) > 0.04 ||
  120 |       Math.abs(portrait.height - drawn) > 0.04 || Math.abs(portrait.styleWidth - drawn) > 0.001 ||
  121 |       Math.abs(portrait.styleHeight - drawn) > 0.001;
  122 |   }), 'portrait diameters follow the measured linear scale, with only the disclosed visibility floor').toEqual([]);
  123 |   const expectedRatios = {
  124 |     diameter: radiusMax / Math.min(...pair.map((name) => worlds[name].radius)),
  125 |     gravity: Math.max(...pair.map((name) => worlds[name].gravity)) / Math.min(...pair.map((name) => worlds[name].gravity)),
  126 |   };
  127 |   expect(sample.ratios.map((ratio) => ratio.key).sort()).toEqual(['diameter', 'gravity']);
  128 |   expect(sample.ratios.filter((ratio) => !ratio.list || ratio.term !== 'DT' || !ratio.label ||
  129 |     !Number.isFinite(ratio.value) || Math.abs(ratio.value - expectedRatios[ratio.key as keyof typeof expectedRatios]) > 1e-9)).toEqual([]);
  130 |   expect(sample.bars.map((bar) => bar.key).sort()).toEqual(['diameter', 'gravity']);
  131 |   const barFailures = sample.bars.flatMap((bar) => {
  132 |     const values = pair.map((name) => bar.key === 'diameter' ? 2 * worlds[name].radius : worlds[name].gravity);
  133 |     const ceiling = Math.max(...values);
  134 |     if (bar.values.length !== 2) return [{ key: bar.key, reason: 'requires one meter per world' }];
  135 |     return bar.values.flatMap((meter, index) => meter.min !== 0 || meter.max !== ceiling || meter.value !== values[index] ||
  136 |       !meter.name?.startsWith(pair[index]) || !meter.text || !Number.isFinite(meter.fraction) ||
  137 |       Math.abs(meter.fraction - values[index] / ceiling) > 0.002 ? [{ key: bar.key, index, meter }] : []);
  138 |   });
  139 |   expect(barFailures, 'each measurement has its own shared zero baseline and proportional rendered bars').toEqual([]);
  140 |   return sample;
  141 | }
  142 | 
  143 | async function exactTable(region: Locator, pair: [World, World]) {
  144 |   const table = region.getByRole('table', { name: `Measured properties for ${pair[0]} and ${pair[1]}`, exact: true });
  145 |   await expect(table).toBeVisible();
  146 |   await expect(table.locator('caption')).toHaveText('Planet comparison using diameter, temperature, rotation, orbit period, moons, surface gravity, and weight force.');
  147 |   await expect(table.getByRole('columnheader')).toHaveText(['Measure', ...pair]);
  148 |   await expect(table.locator('thead th[scope="col"]')).toHaveCount(3);
  149 |   await expect(table.locator('tbody tr')).toHaveCount(7);
  150 |   await expect(table.locator('tbody th[scope="row"]')).toHaveText([
  151 |     'Temperature', 'Day', 'Year', 'Diameter', 'Moons', 'Surface gravity', '70 kg mass: weight force',
  152 |   ]);
  153 |   await expect(table.getByRole('row', { name: /^Diameter / }).getByRole('cell')).toHaveText(
  154 |     pair.map((name) => `${(2 * worlds[name].radius).toLocaleString('en-US')} km`));
  155 |   const forces = pair.map((name) => `${Math.round(70 * worlds[name].gravity * 9.80665).toLocaleString('en-US')} N`);
  156 |   await expect(table.getByRole('row', { name: /70 kg mass: weight force/ }).getByRole('cell')).toHaveText(forces);
  157 |   return table;
  158 | }
  159 | 
  160 | async function readableLayout(bench: Locator, width: number) {
  161 |   const layout = await bench.evaluate((section) => {
  162 |     const bounds = section.getBoundingClientRect();
  163 |     const controls = [...section.querySelectorAll<HTMLElement>('button,select,textarea,a')].map((control) => {
  164 |       const box = control.getBoundingClientRect(), style = getComputedStyle(control);
  165 |       return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
  166 |         width: box.width, height: box.height, left: box.left, right: box.right, font: Number.parseFloat(style.fontSize) };
  167 |     }).filter((control) => control.width > 0 && control.height > 0);
  168 |     return { left: bounds.left, right: bounds.right, pageWidth: document.documentElement.scrollWidth, controls };
  169 |   });
  170 |   expect(layout.left).toBeGreaterThanOrEqual(-1);
  171 |   expect(layout.right).toBeLessThanOrEqual(width + 1);
  172 |   expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  173 |   expect(layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 13 ||
  174 |     control.left < -1 || control.right > width + 1), 'bench controls and reference link have readable 44px targets').toEqual([]);
  175 | }
  176 | async function readableText(region: Locator) {
  177 |   const failures = await region.evaluate((section) => {
  178 |     type Color = [number, number, number, number];
  179 |     const parse = (color: string): Color => {
  180 |       if (color === 'transparent') return [0, 0, 0, 0];
  181 |       const values = color.match(/[\d.]+/g)?.map(Number) || [];
  182 |       if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
  183 |       return [values[0], values[1], values[2], values[3] ?? 1];
  184 |     };
  185 |     const over = (top: Color, bottom: Color): Color => {
  186 |       const alpha = top[3] + bottom[3] * (1 - top[3]);
  187 |       return [0, 1, 2].map((index) => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha).concat(alpha) as Color;
  188 |     };
  189 |     const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
  190 |       const value = channel / 255;
  191 |       return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  192 |     }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  193 |     return [...section.querySelectorAll<HTMLElement>('*')].filter((element) => {
  194 |       const box = element.getBoundingClientRect(), style = getComputedStyle(element);
  195 |       return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' &&
  196 |         !element.closest('.sr-only,[aria-hidden="true"],button:disabled,select:disabled') &&
  197 |         [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
  198 |     }).map((element) => {
  199 |       const chain: HTMLElement[] = [];
  200 |       for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
  201 |       let background: Color = [255, 255, 255, 1], opacity = 1;
  202 |       for (const ancestor of chain) {
  203 |         const style = getComputedStyle(ancestor); background = over(parse(style.backgroundColor), background); opacity *= Number(style.opacity);
  204 |       }
  205 |       const style = getComputedStyle(element), foreground = parse(style.color); foreground[3] *= opacity;
  206 |       const a = luminance(over(foreground, background)), b = luminance(background);
  207 |       return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
  208 |         ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
  209 |     }).filter((value) => value.font < 13 || value.ratio < 4.5);
  210 |   });
> 211 |   expect(failures, 'rendered labels, measurements, exact values and explanations retain readable themed contrast').toEqual([]);
      |                                                                                                                    ^ Error: rendered labels, measurements, exact values and explanations retain readable themed contrast
  212 | }
  213 | 
  214 | test('diameter portraits and meters use scientific proportions, including the disclosed Pluto visibility floor', async ({ page }) => {
  215 |   const bench = await mountComparison(page);
  216 |   await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  217 |   await expect(comparison(page).getByRole('img')).toHaveAccessibleName(/10\.97 times wider/);
  218 |   await exactTable(comparison(page), ['Earth', 'Jupiter']);
  219 |   await choosePair(bench, 'Pluto', 'Jupiter');
  220 |   const result = await expectMeasurements(comparison(page), ['Pluto', 'Jupiter']);
  221 |   expect(result.portraits[0].raw).toBeLessThan(3);
  222 |   expect(result.portraits[0].drawn).toBe(3);
  223 |   await expect(comparison(page)).toContainText(/visibility floor/i);
  224 |   await noErrors(page);
  225 | });
  226 | 
  227 | test('equal gravity and a restored same-world pair report equality without claiming a stronger world or permitting a save', async ({ page }) => {
  228 |   const bench = await mountComparison(page, 1060, false, { compare1: 'Mercury', compare2: 'Mars' });
  229 |   await expectMeasurements(comparison(page), ['Mercury', 'Mars']);
  230 |   await expect(comparison(page)).toContainText(/same listed gravity/i);
  231 |   expect(worlds.Mercury.radius).not.toBe(worlds.Mars.radius);
  232 |   await mountComparison(page, 1060, false, { compare1: 'Earth', compare2: 'earth' });
  233 |   await expectMeasurements(comparison(page), ['Earth', 'Earth']);
  234 |   await expect(bench).toContainText(/same world|same measurements|equal|two different worlds/i);
  235 |   await expect(bench.locator('[data-solarsystem-compare-save]')).toBeDisabled();
  236 |   expect((await state(page)).journalEntries).toHaveLength(1);
  237 |   await noErrors(page);
  238 | });
  239 | 
  240 | test('the smaller Neptune counterexample has stronger gravity and weight force on independently scaled meters', async ({ page }) => {
  241 |   const bench = await mountComparison(page);
  242 |   await bench.locator('[data-compare-challenge="Uranus-Neptune"]').click();
  243 |   await expectMeasurements(comparison(page), ['Uranus', 'Neptune']);
  244 |   const table = await exactTable(comparison(page), ['Uranus', 'Neptune']);
  245 |   await expect(table.getByRole('row', { name: /Surface gravity/ }).getByRole('cell')).toHaveText(['0.89g', '1.14g']);
  246 |   await expect(comparison(page)).toContainText('Mass stays constant');
  247 |   expect(worlds.Neptune.radius).toBeLessThan(worlds.Uranus.radius);
  248 |   expect(worlds.Neptune.gravity).toBeGreaterThan(worlds.Uranus.gravity);
  249 |   await noErrors(page);
  250 | });
  251 | 
  252 | test('pair-specific explanations survive swapping and switching, while repeated saving records once and a revision remains saveable', async ({ page }) => {
  253 |   const bench = await mountComparison(page);
  254 |   const retained = await protectedState(page), initialXP = await page.evaluate(() => ((window as any).__comparisonXP || []).length);
  255 |   const explanation = 'Jupiter is much wider, but its gravity ratio is smaller than its diameter ratio.';
  256 |   const input = bench.getByRole('textbox', { name: 'My explanation (optional)', exact: true });
  257 |   await input.fill(explanation);
  258 |   await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
  259 |   await expect(input).toHaveValue(explanation);
  260 |   await expectMeasurements(comparison(page), ['Jupiter', 'Earth']);
  261 |   await bench.locator('[data-compare-challenge="Uranus-Neptune"]').click();
  262 |   await expect(input).toHaveValue('');
  263 |   await input.fill('Neptune is smaller but has stronger listed gravity.');
  264 |   await bench.locator('[data-compare-challenge="Earth-Jupiter"]').click();
  265 |   await expect(input).toHaveValue(explanation);
  266 |   const save = bench.locator('[data-solarsystem-compare-save]');
  267 |   await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  268 |   await expect(save).toBeDisabled();
  269 |   await expect.poll(async () => (await state(page)).journalEntries.length).toBe(2);
  270 |   expect((await state(page)).journalEntries.at(-1).surprise).toBe(explanation);
  271 |   expect((await state(page)).compareReasoningDrafts['Earth:Jupiter']).toBe(explanation);
  272 |   expect((await state(page)).compareReasoningDrafts['Neptune:Uranus']).toBe('Neptune is smaller but has stronger listed gravity.');
  273 |   await input.fill(`  ${explanation}  `);
  274 |   await expect(save).toBeDisabled();
  275 |   expect((await state(page)).journalEntries).toHaveLength(2);
  276 |   await input.fill(`${explanation} I would compare their masses next.`);
  277 |   await expect(save).toBeEnabled();
  278 |   await save.click();
  279 |   await expect.poll(async () => (await state(page)).journalEntries.length).toBe(3);
  280 |   expect((await state(page)).journalEntries.at(-1).surprise).toContain('compare their masses next');
  281 |   expect((await state(page)).journalEntries[0]).toEqual({ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 });
  282 |   expect(await protectedState(page)).toEqual(retained);
  283 |   expect(await page.evaluate(() => ((window as any).__comparisonXP || []).length)).toBe(initialXP);
  284 |   await noErrors(page);
  285 | });
  286 | 
  287 | test('canonical keys and legacy translated names resolve without rewriting raw saves, and invalid worlds swap as empty selections', async ({ page }) => {
  288 |   const bench = await mountComparison(page, 1060, true, { compare1: 'earth', compare2: 'stem.solar_sys.jupiter' });
  289 |   const first = bench.getByRole('combobox', { name: 'First world for visual comparison', exact: true });
  290 |   const second = bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true });
  291 |   await expect(first).toHaveValue('Earth');
  292 |   await expect(second).toHaveValue('Jupiter');
  293 |   await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  294 |   expect((await state(page)).compare1).toBe('earth');
  295 |   expect((await state(page)).compare2).toBe('stem.solar_sys.jupiter');
  296 |   await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
  297 |   expect([(await state(page)).compare1, (await state(page)).compare2]).toEqual(['Jupiter', 'Earth']);
  298 |   for (const invalidWorld of [{ key: 'Jupiter' }, 'not-a-world']) {
  299 |     await mountComparison(page, 1060, true, { compare1: invalidWorld, compare2: 'earth' });
  300 |     await expect(first).toHaveValue('');
  301 |     await expect(second).toHaveValue('Earth');
  302 |     await expect(comparison(page)).toHaveCount(0);
  303 |     expect((await state(page)).compare1).toEqual(invalidWorld);
  304 |     expect((await state(page)).compare2).toBe('earth');
  305 |     await bench.getByRole('button', { name: 'Swap visually compared worlds', exact: true }).click();
  306 |     expect([(await state(page)).compare1, (await state(page)).compare2]).toEqual(['Earth', '']);
  307 |     await expect(first).toHaveValue('Earth');
  308 |     await expect(second).toHaveValue('');
  309 |     await noErrors(page);
  310 |   }
  311 | });
```