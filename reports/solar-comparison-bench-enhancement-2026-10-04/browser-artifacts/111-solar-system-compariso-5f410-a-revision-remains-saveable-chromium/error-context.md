# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 111-solar-system-comparison-bench.spec.ts >> pair-specific explanations survive swapping and switching, while repeated saving records once and a revision remains saveable
- Location: tests\e2e\111-solar-system-comparison-bench.spec.ts:250:5

# Error details

```
Error: portrait diameters follow the measured linear scale, with only the disclosed visibility floor

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 13

- Array []
+ Array [
+   Object {
+     "diameter": 12742,
+     "drawn": 11.664659352605456,
+     "exaggerated": "false",
+     "height": 11.65625,
+     "key": "Earth",
+     "raw": 11.664659352605456,
+     "styleHeight": 11.6647,
+     "styleWidth": 11.6647,
+     "width": 11.65625,
+   },
+ ]
```

# Test source

```ts
  20  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  21  | 
  22  | async function mountComparison(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  23  |   await page.setViewportSize({ width, height: 1600 });
  24  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  25  |   await page.goto(`${harness.url}/__harness`);
  26  |   await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  27  |   await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  28  |   await page.evaluate(({ data, names }) => {
  29  |     (window as any).__mount({ solarSystem: data });
  30  |     const ctx = (window as any).__ctx;
  31  |     ctx.t = (key: string, fallback?: string) => names[key] || fallback || key;
  32  |     ctx.isDark = data.isDark;
  33  |     ctx.awardXP = (...args: unknown[]) => { ((window as any).__comparisonXP ||= []).push(args); };
  34  |     document.documentElement.classList.toggle('dark', data.isDark);
  35  |     (window as any).__rerender();
  36  |   }, {
  37  |     names: Object.fromEntries(Object.keys(worlds).map((name) => [`stem.solar_sys.${name.toLowerCase()}`, name])),
  38  |     data: {
  39  |       tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: false, showVisualCompare: true,
  40  |       selectedPlanet: 'Earth', viewTab: 'overview', paused: true, sidebar: true,
  41  |       compare1: 'Earth', compare2: 'Jupiter', compareReasoningDrafts: {},
  42  |       journalEntries: [{ title: 'Earlier explanation', observation: 'Keep this record.', timestamp: 100 }],
  43  |       orr_time: 0.37, orr_paused: true, orr_sel: 'mercury', orr_compare: 'venus', orr_follow: 'mercury',
  44  |       orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
  45  |       missionLog: [{ title: 'Retained observation', detail: 'Keep my orbital evidence.' }],
  46  |       keplerInquiry: { a: 2, e: 0.2, mass: 1, hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', log: [] },
  47  |       transferDebriefs: { 'earth-mars': { explanation: 'Keep my transfer explanation.' } },
  48  |       orr_wsa: 2, orr_wse: 0.3, orr_wsphase: 0.25, isDark: dark, ...patch,
  49  |     },
  50  |   });
  51  |   await expect(page.locator('#wrap')).toHaveJSProperty('clientWidth', width);
  52  |   const bench = page.locator('#solar-visual-comparison');
  53  |   if (patch.showVisualCompare !== false) {
  54  |     await expect(bench).toBeVisible();
  55  |     await expect(bench).toHaveClass(/solar-comparison-workbench/);
  56  |     await expect(bench.getByRole('heading', { name: 'How different are two worlds?', exact: true })).toBeVisible();
  57  |   }
  58  |   return bench;
  59  | }
  60  | 
  61  | async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }
  62  | async function protectedState(page: Page) {
  63  |   return page.evaluate(() => {
  64  |     const data = (window as any).__toolData.solarSystem;
  65  |     return JSON.parse(JSON.stringify(Object.fromEntries([
  66  |       'orr_time', 'orr_paused', 'orr_sel', 'orr_compare', 'orr_follow', 'orr_snapshots', 'missionLog',
  67  |       'keplerInquiry', 'transferDebriefs', 'orr_wsa', 'orr_wse', 'orr_wsphase',
  68  |     ].map((key) => [key, data[key]]))));
  69  |   });
  70  | }
  71  | async function noErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
  72  | function comparison(page: Page) { return page.locator('[data-solar-planet-comparison]'); }
  73  | async function choosePair(bench: Locator, first: World, second: World) {
  74  |   // Changing the second world first avoids the currently selected counterpart's disabled option.
  75  |   await bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true }).selectOption('');
  76  |   await bench.getByRole('combobox', { name: 'First world for visual comparison', exact: true }).selectOption(first);
  77  |   await bench.getByRole('combobox', { name: 'Second world for visual comparison', exact: true }).selectOption(second);
  78  | }
  79  | async function expectMeasurements(region: Locator, pair: [World, World]) {
  80  |   await expect(region).toHaveAccessibleName(`Scientific comparison of ${pair[0]} and ${pair[1]}`);
  81  |   await expect(region).toHaveClass(/solar-compare-inspection/);
  82  |   const sample = await region.evaluate((section) => ({
  83  |     stageRole: section.querySelector('.solar-compare-stage')?.getAttribute('role'),
  84  |     same: section.getAttribute('data-same-world'),
  85  |     portraits: [...section.querySelectorAll<HTMLElement>('[data-comparison-world]')].map((world) => {
  86  |       const circle = world.querySelector<HTMLElement>('.solar-compare-circle')!;
  87  |       const box = circle.getBoundingClientRect();
  88  |       return { key: world.dataset.comparisonWorld, diameter: Number(world.getAttribute('data-diameter-km')),
  89  |         raw: Number(world.getAttribute('data-raw-diameter')), drawn: Number(world.getAttribute('data-drawn-diameter')),
  90  |         exaggerated: world.getAttribute('data-exaggerated'), width: box.width, height: box.height,
  91  |         styleWidth: Number.parseFloat(circle.style.width), styleHeight: Number.parseFloat(circle.style.height) };
  92  |     }),
  93  |     ratios: [...section.querySelectorAll<HTMLElement>('#solar-compare-ratios [data-comparison-ratio]')].map((node) => {
  94  |       const value = node.matches('dd') ? node : node.querySelector('dd');
  95  |       return { key: node.dataset.comparisonRatio, value: Number(node.getAttribute('data-value')),
  96  |         list: Boolean(value?.closest('dl')), term: value?.previousElementSibling?.tagName,
  97  |         label: value?.previousElementSibling?.textContent?.trim() };
  98  |     }),
  99  |     bars: [...section.querySelectorAll<HTMLElement>('#solar-compare-measurements [data-compare-bars]')].map((group) => ({
  100 |       key: group.dataset.compareBars,
  101 |       values: [...group.querySelectorAll<HTMLElement>('[role="meter"]')].map((meter) => ({
  102 |         min: Number(meter.getAttribute('aria-valuemin')), max: Number(meter.getAttribute('aria-valuemax')),
  103 |         value: Number(meter.getAttribute('aria-valuenow')), name: meter.getAttribute('aria-label'),
  104 |         text: meter.getAttribute('aria-valuetext'),
  105 |         fraction: meter.firstElementChild!.getBoundingClientRect().width / meter.getBoundingClientRect().width,
  106 |       })),
  107 |     })),
  108 |   }));
  109 |   const radiusMax = Math.max(...pair.map((name) => worlds[name].radius));
  110 |   expect(sample.stageRole).toBe('img');
  111 |   expect(sample.same).toBe(String(pair[0] === pair[1]));
  112 |   expect(sample.portraits.map((portrait) => portrait.key)).toEqual(pair);
  113 |   expect(sample.portraits.filter((portrait, index) => {
  114 |     const radius = worlds[pair[index]].radius, raw = 128 * radius / radiusMax, drawn = Math.max(3, raw);
  115 |     return ![portrait.diameter, portrait.raw, portrait.drawn, portrait.width, portrait.height, portrait.styleWidth, portrait.styleHeight].every(Number.isFinite) ||
  116 |       portrait.diameter !== 2 * radius || Math.abs(portrait.raw - raw) > 1e-9 || Math.abs(portrait.drawn - drawn) > 1e-9 ||
  117 |       portrait.exaggerated !== String(raw < 3) || Math.abs(portrait.width - drawn) > 0.04 ||
  118 |       Math.abs(portrait.height - drawn) > 0.04 || Math.abs(portrait.styleWidth - drawn) > 1e-9 ||
  119 |       Math.abs(portrait.styleHeight - drawn) > 1e-9;
> 120 |   }), 'portrait diameters follow the measured linear scale, with only the disclosed visibility floor').toEqual([]);
      |                                                                                                        ^ Error: portrait diameters follow the measured linear scale, with only the disclosed visibility floor
  121 |   const expectedRatios = {
  122 |     diameter: radiusMax / Math.min(...pair.map((name) => worlds[name].radius)),
  123 |     gravity: Math.max(...pair.map((name) => worlds[name].gravity)) / Math.min(...pair.map((name) => worlds[name].gravity)),
  124 |   };
  125 |   expect(sample.ratios.map((ratio) => ratio.key).sort()).toEqual(['diameter', 'gravity']);
  126 |   expect(sample.ratios.filter((ratio) => !ratio.list || ratio.term !== 'DT' || !ratio.label ||
  127 |     !Number.isFinite(ratio.value) || Math.abs(ratio.value - expectedRatios[ratio.key as keyof typeof expectedRatios]) > 1e-9)).toEqual([]);
  128 |   expect(sample.bars.map((bar) => bar.key).sort()).toEqual(['diameter', 'gravity']);
  129 |   const barFailures = sample.bars.flatMap((bar) => {
  130 |     const values = pair.map((name) => bar.key === 'diameter' ? 2 * worlds[name].radius : worlds[name].gravity);
  131 |     const ceiling = Math.max(...values);
  132 |     if (bar.values.length !== 2) return [{ key: bar.key, reason: 'requires one meter per world' }];
  133 |     return bar.values.flatMap((meter, index) => meter.min !== 0 || meter.max !== ceiling || meter.value !== values[index] ||
  134 |       !meter.name?.startsWith(pair[index]) || !meter.text || !Number.isFinite(meter.fraction) ||
  135 |       Math.abs(meter.fraction - values[index] / ceiling) > 0.002 ? [{ key: bar.key, index, meter }] : []);
  136 |   });
  137 |   expect(barFailures, 'each measurement has its own shared zero baseline and proportional rendered bars').toEqual([]);
  138 |   return sample;
  139 | }
  140 | 
  141 | async function exactTable(region: Locator, pair: [World, World]) {
  142 |   const table = region.getByRole('table', { name: `Measured properties for ${pair[0]} and ${pair[1]}`, exact: true });
  143 |   await expect(table).toBeVisible();
  144 |   await expect(table.locator('caption')).toHaveText('Planet comparison using diameter, temperature, rotation, orbit period, moons, surface gravity, and weight force.');
  145 |   await expect(table.getByRole('columnheader')).toHaveText(['Measure', ...pair]);
  146 |   await expect(table.locator('thead th[scope="col"]')).toHaveCount(3);
  147 |   await expect(table.locator('tbody tr')).toHaveCount(7);
  148 |   await expect(table.locator('tbody th[scope="row"]')).toHaveText([
  149 |     'Temperature', 'Day', 'Year', 'Diameter', 'Moons', 'Surface gravity', '70 kg mass: weight force',
  150 |   ]);
  151 |   await expect(table.getByRole('row', { name: /^Diameter / }).getByRole('cell')).toHaveText(
  152 |     pair.map((name) => `${(2 * worlds[name].radius).toLocaleString('en-US')} km`));
  153 |   const forces = pair.map((name) => `${Math.round(70 * worlds[name].gravity * 9.80665).toLocaleString('en-US')} N`);
  154 |   await expect(table.getByRole('row', { name: /70 kg mass: weight force/ }).getByRole('cell')).toHaveText(forces);
  155 |   return table;
  156 | }
  157 | 
  158 | async function readableLayout(bench: Locator, width: number) {
  159 |   const layout = await bench.evaluate((section) => {
  160 |     const bounds = section.getBoundingClientRect();
  161 |     const controls = [...section.querySelectorAll<HTMLElement>('button,select,textarea,a')].map((control) => {
  162 |       const box = control.getBoundingClientRect(), style = getComputedStyle(control);
  163 |       return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
  164 |         width: box.width, height: box.height, left: box.left, right: box.right, font: Number.parseFloat(style.fontSize) };
  165 |     }).filter((control) => control.width > 0 && control.height > 0);
  166 |     return { left: bounds.left, right: bounds.right, pageWidth: document.documentElement.scrollWidth, controls };
  167 |   });
  168 |   expect(layout.left).toBeGreaterThanOrEqual(-1);
  169 |   expect(layout.right).toBeLessThanOrEqual(width + 1);
  170 |   expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  171 |   expect(layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 13 ||
  172 |     control.left < -1 || control.right > width + 1), 'bench controls and reference link have readable 44px targets').toEqual([]);
  173 | }
  174 | async function readableText(region: Locator) {
  175 |   const failures = await region.evaluate((section) => {
  176 |     type Color = [number, number, number, number];
  177 |     const parse = (color: string): Color => {
  178 |       if (color === 'transparent') return [0, 0, 0, 0];
  179 |       const values = color.match(/[\d.]+/g)?.map(Number) || [];
  180 |       if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
  181 |       return [values[0], values[1], values[2], values[3] ?? 1];
  182 |     };
  183 |     const over = (top: Color, bottom: Color): Color => {
  184 |       const alpha = top[3] + bottom[3] * (1 - top[3]);
  185 |       return [0, 1, 2].map((index) => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha).concat(alpha) as Color;
  186 |     };
  187 |     const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
  188 |       const value = channel / 255;
  189 |       return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  190 |     }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  191 |     return [...section.querySelectorAll<HTMLElement>('*')].filter((element) => {
  192 |       const box = element.getBoundingClientRect(), style = getComputedStyle(element);
  193 |       return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' &&
  194 |         !element.closest('.sr-only,[aria-hidden="true"],button:disabled,select:disabled') &&
  195 |         [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
  196 |     }).map((element) => {
  197 |       const chain: HTMLElement[] = [];
  198 |       for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
  199 |       let background: Color = [255, 255, 255, 1], opacity = 1;
  200 |       for (const ancestor of chain) {
  201 |         const style = getComputedStyle(ancestor); background = over(parse(style.backgroundColor), background); opacity *= Number(style.opacity);
  202 |       }
  203 |       const style = getComputedStyle(element), foreground = parse(style.color); foreground[3] *= opacity;
  204 |       const a = luminance(over(foreground, background)), b = luminance(background);
  205 |       return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
  206 |         ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
  207 |     }).filter((value) => value.font < 13 || value.ratio < 4.5);
  208 |   });
  209 |   expect(failures, 'rendered labels, measurements, exact values and explanations retain readable themed contrast').toEqual([]);
  210 | }
  211 | 
  212 | test('diameter portraits and meters use scientific proportions, including the disclosed Pluto visibility floor', async ({ page }) => {
  213 |   const bench = await mountComparison(page);
  214 |   await expectMeasurements(comparison(page), ['Earth', 'Jupiter']);
  215 |   await expect(comparison(page).getByRole('img')).toHaveAccessibleName(/10\.97 times wider/);
  216 |   await exactTable(comparison(page), ['Earth', 'Jupiter']);
  217 |   await choosePair(bench, 'Pluto', 'Jupiter');
  218 |   const result = await expectMeasurements(comparison(page), ['Pluto', 'Jupiter']);
  219 |   expect(result.portraits[0].raw).toBeLessThan(3);
  220 |   expect(result.portraits[0].drawn).toBe(3);
```