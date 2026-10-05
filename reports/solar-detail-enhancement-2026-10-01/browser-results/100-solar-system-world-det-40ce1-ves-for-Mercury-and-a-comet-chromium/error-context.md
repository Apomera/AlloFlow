# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 100-solar-system-world-detail.spec.ts >> world detail pairs readable labels with live text leaves for Mercury and a comet
- Location: tests\e2e\100-solar-system-world-detail.spec.ts:188:5

# Error details

```
Error: expect(locator).toHaveAccessibleName(expected) failed

Locator:  locator('#orrery-world-detail')
Expected: "Halley"
Received: "Halley’s Comet"
Timeout:  15000ms

Call log:
  - Expect "toHaveAccessibleName" with timeout 15000ms
  - waiting for locator('#orrery-world-detail')
    32 × locator resolved to <section id="orrery-world-detail" class="orr-world-detail" data-orrery-world-detail="halley" aria-labelledby="orrery-world-detail-title">…</section>
       - unexpected value "Halley’s Comet"

```

```yaml
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
  - note "Kepler II speed cue for Halley’s Comet"
  - region "Orbital comparison for Halley’s Comet"
  - region "A/B orbital evidence for Halley’s Comet"
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | const harness = new GlHarness({
  5   |   toolFile: 'stem_lab/stem_tool_solarsystem.js',
  6   |   toolId: 'solarSystem',
  7   |   width: 1180,
  8   |   height: 1600,
  9   |   appStyles: true,
  10  |   layout: 'document',
  11  | });
  12  | 
  13  | test.beforeAll(async () => { await harness.start(); });
  14  | test.afterAll(async () => { await harness.stop(); });
  15  | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  16  | test.describe.configure({ timeout: 90_000 });
  17  | 
  18  | async function mountWorld(page: Page, width = 1180, dark = false, state: Record<string, unknown> = {}) {
  19  |   await page.setViewportSize({ width, height: 1600 });
  20  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  21  |   await page.goto(`${harness.url}/__harness`);
  22  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.solarSystem);
  23  |   // Establish the document-flow width before React and the canvas measure it.
  24  |   await page.locator('#wrap').evaluate((wrap, nextWidth) => {
  25  |     (wrap as HTMLElement).style.width = `${nextWidth}px`;
  26  |   }, width);
  27  |   await page.evaluate((data) => (window as any).__mount({ solarSystem: data }), {
  28  |     tutorialDismissed: true,
  29  |     solarMissionDashboardOpen: false,
  30  |     orreryMode: true,
  31  |     orr_tab: 0,
  32  |     orr_paused: true,
  33  |     orr_time: 0,
  34  |     orr_sel: 'mercury',
  35  |     isDark: dark,
  36  |     ...state,
  37  |   });
  38  |   await expect(page.locator('#orrery-world-detail')).toBeVisible();
  39  |   await expect(page.locator('canvas[role="application"]')).toBeVisible();
  40  | }
  41  | 
  42  | async function expectWorldDefinitions(page: Page, id: string, name: string) {
  43  |   const detail = page.locator('#orrery-world-detail');
  44  |   await expect(detail).toHaveAttribute('data-orrery-world-detail', id);
> 45  |   await expect(detail).toHaveAccessibleName(name);
      |                        ^ Error: expect(locator).toHaveAccessibleName(expected) failed
  46  |   await expect(detail.getByRole('heading', { name, exact: true })).toBeVisible();
  47  |   const current = detail.locator('dl[data-current-reading]');
  48  |   await expect(current).toHaveAttribute('aria-labelledby', 'orrery-detail-current-title');
  49  |   await expect(page.locator('#orrery-detail-current-title')).toHaveText('Current reading');
  50  |   const reading = await current.evaluate((list) => [...list.querySelectorAll('dt')].map((term) => {
  51  |     const definition = term.nextElementSibling;
  52  |     return {
  53  |       label: term.textContent?.trim(),
  54  |       tag: definition?.tagName,
  55  |       id: definition?.id,
  56  |       children: definition?.children.length,
  57  |       value: definition?.textContent?.trim(),
  58  |     };
  59  |   }));
  60  |   expect(reading.map(({ label, tag, id, children }) => ({ label, tag, id, children }))).toEqual([
  61  |     { label: 'Distance from Sun', tag: 'DD', id: 'orrery-live-distance', children: 0 },
  62  |     { label: 'Orbital speed', tag: 'DD', id: 'orrery-live-speed', children: 0 },
  63  |     { label: 'Orbital phase', tag: 'DD', id: 'orrery-live-phase', children: 0 },
  64  |   ]);
  65  |   expect(reading[0].value).toMatch(/^\d+(?:\.\d+)? AU$/);
  66  |   expect(reading[1].value).toMatch(/^\d+(?:\.\d+)? km\/s$/);
  67  |   expect(reading[2].value?.length).toBeGreaterThan(0);
  68  | 
  69  |   const properties = detail.locator('dl[aria-labelledby="orrery-detail-properties-title"]');
  70  |   await expect(page.locator('#orrery-detail-properties-title')).toHaveText('Orbit and world properties');
  71  |   const propertyPairs = await properties.evaluate((list) => [...list.querySelectorAll('dt')].map((term) => ({
  72  |     label: term.textContent?.trim(),
  73  |     tag: term.nextElementSibling?.tagName,
  74  |     value: term.nextElementSibling?.textContent?.trim(),
  75  |   })));
  76  |   expect(propertyPairs.map((pair) => pair.label)).toEqual(expect.arrayContaining([
  77  |     'Orbit size (a)', 'Orbit shape (e)', 'Orbital period (T)',
  78  |     'Orbit tilt (i)', 'Closest to Sun', 'Farthest from Sun',
  79  |   ]));
  80  |   expect(propertyPairs.every((pair) => pair.tag === 'DD' && !!pair.value)).toBe(true);
  81  |   await expect(detail.locator('#orrery-live-selected-summary')).toHaveAttribute('role', 'status');
  82  |   await expect(detail.locator('#orrery-live-selected-summary')).toHaveAttribute('aria-live', 'polite');
  83  |   await expect(detail.locator('#orrery-live-selected-summary')).toContainText(`${name}: distance`);
  84  | }
  85  | 
  86  | async function expectTableRelationships(page: Page, table: Locator, rows: string[], evidence: boolean) {
  87  |   await expect(table.locator('caption')).toHaveText(evidence ? 'B minus A' : 'Values update with the simulation');
  88  |   const columnHeaders = table.getByRole('columnheader');
  89  |   await expect(columnHeaders).toHaveCount(4);
  90  |   for (const header of await columnHeaders.all()) await expect(header).toHaveAttribute('scope', 'col');
  91  |   if (evidence) {
  92  |     await expect(columnHeaders).toHaveText(['Measure', 'A', 'B', 'Delta']);
  93  |   } else {
  94  |     await expect(columnHeaders.nth(0)).toHaveText('Measure');
  95  |     await expect(columnHeaders.nth(1)).toContainText('Mercury');
  96  |     await expect(columnHeaders.nth(3)).toContainText('Mars');
  97  |   }
  98  |   for (const label of rows) {
  99  |     const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
  100 |     await expect(row).toHaveCount(1);
  101 |     await expect(row.getByRole('rowheader', { name: label, exact: true })).toHaveAttribute('scope', 'row');
  102 |     await expect(row.getByRole('cell')).toHaveCount(3);
  103 |     await expect(row.getByRole('cell').first()).toContainText(/\d/);
  104 |     await expect(row.getByRole('cell').last()).toContainText(/\d/);
  105 |   }
  106 | }
  107 | 
  108 | async function expectReadableContainedTable(table: Locator, expectedNumericCells: number) {
  109 |   const report = await table.evaluate((element) => {
  110 |     type Color = { r: number; g: number; b: number; a: number };
  111 |     const parse = (value: string): Color | null => {
  112 |       const channels = value.match(/[\d.]+/g)?.map(Number);
  113 |       return channels && channels.length >= 3
  114 |         ? { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 } : null;
  115 |     };
  116 |     const over = (foreground: Color, background: Color): Color => ({
  117 |       r: foreground.r * foreground.a + background.r * (1 - foreground.a),
  118 |       g: foreground.g * foreground.a + background.g * (1 - foreground.a),
  119 |       b: foreground.b * foreground.a + background.b * (1 - foreground.a), a: 1,
  120 |     });
  121 |     const luminance = (color: Color) => {
  122 |       const channels = [color.r, color.g, color.b].map((value) => {
  123 |         const linear = value / 255;
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
```