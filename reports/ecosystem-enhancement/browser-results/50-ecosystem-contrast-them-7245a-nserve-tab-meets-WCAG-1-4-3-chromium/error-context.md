# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 50-ecosystem-contrast-theme-offscreen.spec.ts >> ecosystem text contrast >> conserve tab meets WCAG 1.4.3
- Location: tests\e2e\50-ecosystem-contrast-theme-offscreen.spec.ts:179:9

# Error details

```
Error: conserve: [
 {
  "t": "Manager",
  "r": 1.62,
  "need": 4.5,
  "fg": "rgb(20, 83, 45)",
  "bg": "rgb(16,44,46)",
  "cls": ""
 },
 {
  "t": "24 hours / year, standard even",
  "r": 2.07,
  "need": 4.5,
  "fg": "rgb(22, 101, 52)",
  "bg": "rgb(16,44,46)",
  "cls": ""
 }
]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 18

- Array []
+ Array [
+   Object {
+     "bg": "rgb(16,44,46)",
+     "cls": "",
+     "fg": "rgb(20, 83, 45)",
+     "need": 4.5,
+     "r": 1.62,
+     "t": "Manager",
+   },
+   Object {
+     "bg": "rgb(16,44,46)",
+     "cls": "",
+     "fg": "rgb(22, 101, 52)",
+     "need": 4.5,
+     "r": 2.07,
+     "t": "24 hours / year, standard even",
+   },
+ ]
```

# Test source

```ts
  85  |     window.__ratio = function (a, b) { var x=window.__lum(a), y=window.__lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  86  | 
  87  |     // WCAG 1.4.11: a control's visual boundary needs 3:1 against what is behind it.
  88  |     window.__borders = function () {
  89  |       var fails=[], checked=0;
  90  |       [].slice.call(document.querySelectorAll('#wrap button, #wrap [role="button"], #wrap input, #wrap select')).forEach(function (el) {
  91  |         var cs=getComputedStyle(el);
  92  |         var r=el.getBoundingClientRect();
  93  |         if (r.width<3 || r.height<3) return;
  94  |         var w=parseFloat(cs.borderTopWidth)||0;
  95  |         if (w<=0) return;
  96  |         var bc=window.__parse(cs.borderTopColor); if(!bc) return;
  97  |         if (bc.a<=0.01) return;                     // a transparent border is not a boundary
  98  |         var outer=window.__bg(el.parentElement); if(!outer || outer==='gradient') return;
  99  |         // If the control's own fill already stands out, the border is decoration, and
  100 |         // 1.4.11 only asks for the information REQUIRED to identify the control.
  101 |         var self=window.__parse(cs.backgroundColor);
  102 |         if (self && self.a>0.01) {
  103 |           var solid=self.a<0.999?window.__over(self,outer):self;
  104 |           if (window.__ratio(solid,outer)>=3) return;
  105 |         }
  106 |         checked++;
  107 |         var eff=bc.a<0.999?window.__over(bc,outer):bc;
  108 |         var ratio=window.__ratio(eff,outer);
  109 |         if (ratio<2.99) fails.push({ t:(el.textContent||'').trim().slice(0,22), r:+ratio.toFixed(2),
  110 |           border:cs.borderTopColor, behind:'rgb('+[outer.r,outer.g,outer.b].map(Math.round).join(',')+')',
  111 |           cls:String(el.className).slice(0,60) });
  112 |       });
  113 |       return { checked: checked, fails: fails };
  114 |     };
  115 | 
  116 |     // WCAG 2.4.7: focusing a control must change something visible about it.
  117 |     window.__focusProbe = function () {
  118 |       var bad=[], checked=0;
  119 |       [].slice.call(document.querySelectorAll('#wrap button, #wrap [href], #wrap input, #wrap select, #wrap [tabindex]:not([tabindex="-1"])')).forEach(function (el) {
  120 |         var r=el.getBoundingClientRect();
  121 |         if (r.width<3||r.height<3) return;
  122 |         var b=getComputedStyle(el);
  123 |         var sig0=[b.outlineStyle,b.outlineWidth,b.outlineColor,b.boxShadow,b.backgroundColor,b.borderColor].join('|');
  124 |         try { el.focus(); } catch(e) { return; }
  125 |         if (document.activeElement!==el) return;
  126 |         checked++;
  127 |         var a=getComputedStyle(el);
  128 |         var sig1=[a.outlineStyle,a.outlineWidth,a.outlineColor,a.boxShadow,a.backgroundColor,a.borderColor].join('|');
  129 |         if (sig0===sig1) bad.push({ tag:el.tagName, t:(el.textContent||'').trim().slice(0,28), cls:String(el.className).slice(0,48) });
  130 |       });
  131 |       return { checked: checked, bad: bad };
  132 |     };
  133 | 
  134 |     window.__contrast = function () {
  135 |       var fails = [], checked = 0;
  136 |       [].slice.call(document.querySelectorAll('#wrap *')).forEach(function (el) {
  137 |         var text = (el.textContent || '').trim();
  138 |         if (!text || el.children.length) return;
  139 |         if (!/[0-9A-Za-z]/.test(text)) return;
  140 |         var cs = getComputedStyle(el);
  141 |         if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
  142 |         var r = el.getBoundingClientRect();
  143 |         if (r.width < 2 || r.height < 2) return;
  144 |         var bg = window.__bg(el);
  145 |         if (!bg || bg === 'gradient') return;
  146 |         // SVG text is painted with fill; cs.color there is the inherited default.
  147 |         var paint = cs.color;
  148 |         if (el.ownerSVGElement) {
  149 |           var node = el, found = null;
  150 |           while (node && node.ownerSVGElement !== undefined) {
  151 |             var f = getComputedStyle(node).fill;
  152 |             if (f && f !== 'none') { found = f; break; }
  153 |             node = node.parentElement;
  154 |           }
  155 |           if (found) paint = found;
  156 |         }
  157 |         var fg0 = window.__parse(paint); if (!fg0) return;
  158 |         checked++;
  159 |         var fg = fg0.a < 0.999 ? window.__over(fg0, bg) : fg0;
  160 |         var lf = window.__lum(fg), lb = window.__lum(bg);
  161 |         var ratio = (Math.max(lf,lb)+0.05)/(Math.min(lf,lb)+0.05);
  162 |         var px = parseFloat(cs.fontSize) || 12;
  163 |         var bold = (parseInt(cs.fontWeight,10)||400) >= 700;
  164 |         var need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
  165 |         if (ratio < need - 0.01) fails.push({ t: text.slice(0,30), r: +ratio.toFixed(2), need: need,
  166 |           fg: paint, bg: 'rgb('+[bg.r,bg.g,bg.b].map(Math.round).join(',')+')', cls: String(el.className).slice(0,48) });
  167 |       });
  168 |       return { checked: checked, fails: fails };
  169 |     };
  170 |   `,
  171 | });
  172 | 
  173 | test.beforeAll(async () => { await harness.start(); });
  174 | test.afterAll(async () => { await harness.stop(); });
  175 | test.describe.configure({ timeout: 300_000 });
  176 | 
  177 | test.describe('ecosystem text contrast', () => {
  178 |   for (const tab of TABS) {
  179 |     test(`${tab} tab meets WCAG 1.4.3`, async ({ page }) => {
  180 |       await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
  181 |       await page.waitForTimeout(1200);
  182 |       const con = await page.evaluate(() => (window as any).__contrast());
  183 |       // Guards against the probe silently matching nothing.
  184 |       expect(con.checked).toBeGreaterThan(20);
> 185 |       expect(con.fails, `${tab}: ` + JSON.stringify(con.fails, null, 1)).toEqual([]);
      |                                                                          ^ Error: conserve: [
  186 |     });
  187 |   }
  188 | });
  189 | 
  190 | test.describe('ecosystem control boundaries', () => {
  191 |   // Measured before the fix: the quiz answer options were bounded by border-slate-200 at
  192 |   // 1.23:1 over white with no fill at all, the inquiry actions by slate-300 at 1.48:1,
  193 |   // and the species buttons by their accent at 53% alpha (1.51-2.72:1). The dark theme
  194 |   // was no better — the remap forces border-slate-200 to #334155, 1.72:1 on slate-900 —
  195 |   // so the replacements use shades the remap leaves alone and that clear 3:1 on both.
  196 |   for (const tab of TABS) {
  197 |     test(`${tab} controls meet WCAG 1.4.11`, async ({ page }) => {
  198 |       await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
  199 |       await page.evaluate(() => (window as any).__setTheme('dark'));
  200 |       await page.waitForTimeout(1000);
  201 |       const b = await page.evaluate(() => (window as any).__borders());
  202 |       expect(b.fails, `${tab}: ` + JSON.stringify(b.fails, null, 1)).toEqual([]);
  203 |     });
  204 |   }
  205 | 
  206 |   test('every focusable control shows a focus indicator', async ({ page }) => {
  207 |     let totalChecked = 0;
  208 |     for (const tab of TABS) {
  209 |       await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
  210 |       await page.waitForTimeout(700);
  211 |       const f = await page.evaluate(() => (window as any).__focusProbe());
  212 |       totalChecked += f.checked;
  213 |       expect(f.bad, `${tab}: ` + JSON.stringify(f.bad, null, 1)).toEqual([]);
  214 |     }
  215 |     // Guards against the selector silently matching nothing across every tab.
  216 |     expect(totalChecked).toBeGreaterThan(150);
  217 |   });
  218 | });
  219 | 
  220 | test.describe('ecosystem species accent follows the theme', () => {
  221 |   test('every theme resolves a legible accent', async ({ page }) => {
  222 |     await harness.mount(page, { ecosystem: { tab: 'conserve', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  223 |     await page.waitForTimeout(800);
  224 | 
  225 |     const seen = await page.evaluate(() => (window as any).__accents());
  226 |     expect(seen.length, 'no .eco-accent elements — the class was renamed or dropped').toBeGreaterThan(3);
  227 |     // Both halves of the pair must be present, or the CSS has nothing to choose between.
  228 |     for (const a of seen) {
  229 |       expect(a.light, 'missing --eco-acc-light').toMatch(/^#[0-9a-fA-F]{6}$/);
  230 |       expect(a.dark, 'missing --eco-acc-dark').toMatch(/^#[0-9a-fA-F]{6}$/);
  231 |     }
  232 | 
  233 |     const read = async (theme: string) => {
  234 |       await page.evaluate((t) => (window as any).__setTheme(t), theme);
  235 |       await page.waitForTimeout(120);
  236 |       return page.evaluate(() => (window as any).__accents());
  237 |     };
  238 | 
  239 |     // An unthemed host falls back to the dark canvas, so dark is the correct default.
  240 |     for (const theme of ['', 'dark']) {
  241 |       const rows = await read(theme);
  242 |       rows.forEach((a: any, i: number) => {
  243 |         expect(a.color, `theme "${theme || 'none'}" accent ${i} should use --eco-acc-dark`).toBe(hexToRgb(a.dark));
  244 |       });
  245 |     }
  246 |     const light = await read('default');
  247 |     light.forEach((a: any, i: number) => {
  248 |       expect(a.color, `theme-default accent ${i} should use the authored colour`).toBe(hexToRgb(a.light));
  249 |     });
  250 |     // High contrast overrides both with the palette's own text colour.
  251 |     const contrast = await read('contrast');
  252 |     contrast.forEach((a: any, i: number) => {
  253 |       expect(a.color, `theme-contrast accent ${i} should be the contrast text colour`).toBe('rgb(255, 255, 0)');
  254 |     });
  255 |   });
  256 | });
  257 | 
  258 | test.describe('ecosystem simulation pauses off-screen', () => {
  259 |   test('no paints while scrolled out of view', async ({ page }) => {
  260 |     await harness.mount(page, { ecosystem: { tutorialDismissed: true } }, undefined, { expectCanvas: false });
  261 |     await page.evaluate(() => (window as any).__makeScrollable(320));
  262 |     await page.waitForTimeout(1500);
  263 | 
  264 |     const sample = async () => {
  265 |       await page.evaluate(() => { (window as any).__paints = 0; });
  266 |       await page.waitForTimeout(2500);
  267 |       return page.evaluate(() => (window as any).__paints);
  268 |     };
  269 | 
  270 |     // Scroll the canvas into view first: it mounts below the fold, so a baseline taken
  271 |     // where it happens to sit would measure the paused state and pass vacuously.
  272 |     const box = await page.evaluate(() => (window as any).__canvasBox());
  273 |     expect(box, 'no ecosystem canvas found').not.toBeNull();
  274 |     await page.evaluate((y) => (window as any).__scrollWrap(y), Math.max(0, box!.top - 40));
  275 |     await page.waitForTimeout(1200);
  276 |     const inView = await sample();
  277 |     expect(inView, 'simulation is not painting even when visible').toBeGreaterThan(200);
  278 | 
  279 |     await page.evaluate(() => (window as any).__scrollWrap(9000));
  280 |     await page.waitForTimeout(1200);
  281 |     const parked = await page.evaluate(() => (window as any).__canvasBox());
  282 |     expect(parked!.off, 'the canvas did not actually leave the viewport').toBe(true);
  283 |     const offScreen = await sample();
  284 |     expect(offScreen, `still painting ${offScreen} times off-screen (in view: ${inView})`).toBeLessThan(inView * 0.05);
  285 |   });
```