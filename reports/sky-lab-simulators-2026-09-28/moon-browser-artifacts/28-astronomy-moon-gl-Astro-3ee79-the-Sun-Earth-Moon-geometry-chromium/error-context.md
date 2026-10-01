# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 28-astronomy-moon-gl.spec.ts >> Astronomy moon geometry — real WebGL >> mounts the Sun-Earth-Moon geometry
- Location: tests\e2e\28-astronomy-moon-gl.spec.ts:235:7

# Error details

```
TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
```

# Test source

```ts
  41  |   window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  42  |   window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  43  |   window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
  44  | </script>
  45  | <script src="/stem_lab/stem_tool_astronomy.js"></script>
  46  | <script>
  47  |   var e = React.createElement;
  48  |   window.__mount = function (bucket) {
  49  |     var cfg = window.StemLab._registry.astronomy;
  50  |     window.__toolData = { astronomy: Object.assign({ tab: 'moon' }, bucket || {}) };
  51  |     var bump = null;
  52  |     var ctx = {
  53  |       React: React,
  54  |       get toolData() { return window.__toolData; },
  55  |       setToolData: function (fn) {
  56  |         window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
  57  |         if (bump) bump();
  58  |       },
  59  |       update: function (b, k, v) {
  60  |         window.__toolData = Object.assign({}, window.__toolData);
  61  |         window.__toolData[b] = Object.assign({}, window.__toolData[b]); window.__toolData[b][k] = v;
  62  |         if (bump) bump();
  63  |       },
  64  |       updateMulti: function (b, patch) {
  65  |         window.__toolData = Object.assign({}, window.__toolData);
  66  |         window.__toolData[b] = Object.assign({}, window.__toolData[b], patch); if (bump) bump();
  67  |       },
  68  |       setStemLabTool: function () {}, setStemLabTab: function () {}, addToast: function () {},
  69  |       awardXP: function () {}, getXP: function () { return 0; }, announceToSR: function () {},
  70  |       celebrate: function () {}, beep: function () {}, callGemini: null,
  71  |       gradeLevel: '8th Grade', toolSnapshots: [], props: {},
  72  |       t: function (k, fb) { return fb || k; },
  73  |       icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
  74  |       a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
  75  |       srOnly: {}
  76  |     };
  77  |     function Comp() {
  78  |       var st = React.useState(0);
  79  |       bump = function () { st[1](function (n) { return n + 1; }); };
  80  |       window.__bump = bump;
  81  |       return cfg.render(ctx);
  82  |     }
  83  |     window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
  84  |     window.__root.render(e(Comp));
  85  |     return !!cfg;
  86  |   };
  87  |   window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  88  |   window.__gl = function () { return window.__alloAstroMoonGL ? window.__alloAstroMoonGL.debug() : null; };
  89  |   window.__set = function (patch) {
  90  |     window.__toolData = Object.assign({}, window.__toolData);
  91  |     window.__toolData.astronomy = Object.assign({}, window.__toolData.astronomy, patch);
  92  |     window.__bump && window.__bump();
  93  |   };
  94  |   window.__bucket = function () { return window.__toolData.astronomy; };
  95  |   window.__canvasCount = function () { return document.querySelectorAll('canvas[data-astro-moon-gl]').length; };
  96  |   window.__text = function () { return document.body.innerText; };
  97  | </script>
  98  | </body></html>`;
  99  | 
  100 | let server: Server;
  101 | let base: string;
  102 | 
  103 | test.beforeAll(async () => {
  104 |   server = createServer(async (req, res) => {
  105 |     const url = (req.url || '/').split('?')[0];
  106 |     if (url === '/__harness') {
  107 |       res.writeHead(200, { 'content-type': MIME['.html'] });
  108 |       res.end(HARNESS);
  109 |       return;
  110 |     }
  111 |     try {
  112 |       const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
  113 |       const file = join(ROOT, rel);
  114 |       if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
  115 |       const body = await readFile(file);
  116 |       res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  117 |       res.end(body);
  118 |     } catch { res.writeHead(404); res.end('not found'); }
  119 |   });
  120 |   await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  121 |   const addr = server.address();
  122 |   base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  123 | });
  124 | 
  125 | test.afterAll(async () => {
  126 |   await new Promise<void>((r) => server.close(() => r()));
  127 | });
  128 | 
  129 | type Pg = import('@playwright/test').Page;
  130 | 
  131 | const SYNODIC = 29.53059;
  132 | const NEW = 0;
  133 | const FIRST_Q = SYNODIC / 4;
  134 | const FULL = SYNODIC / 2;
  135 | 
  136 | async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  137 |   await page.goto(`${base}/__harness`);
  138 |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.astronomy);
  139 |   await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'moon' }, bucket));
  140 |   await page.waitForSelector('canvas[data-astro-moon-gl="true"]', { timeout: 30000 });
> 141 |   await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
      |              ^ TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.
  142 |   await page.waitForTimeout(400);
  143 | }
  144 | 
  145 | type CanvasLightMetrics = {
  146 |   leftMean: number;
  147 |   rightMean: number;
  148 |   outerBrightPixels: number;
  149 |   outerPixels: number;
  150 | };
  151 | 
  152 | async function moonCanvasLightMetrics(page: Pg): Promise<CanvasLightMetrics> {
  153 |   return page.evaluate(() => new Promise<CanvasLightMetrics>((resolve, reject) => {
  154 |     requestAnimationFrame(() => {
  155 |       const source = document.querySelector('canvas[data-astro-moon-gl="true"]') as HTMLCanvasElement | null;
  156 |       if (!source) { reject(new Error('Moon WebGL canvas is missing')); return; }
  157 |       const probe = document.createElement('canvas');
  158 |       probe.width = source.width;
  159 |       probe.height = source.height;
  160 |       const context = probe.getContext('2d', { willReadFrequently: true });
  161 |       if (!context) { reject(new Error('2D canvas context is unavailable')); return; }
  162 |       context.drawImage(source, 0, 0);
  163 |       const { data, width, height } = context.getImageData(0, 0, probe.width, probe.height);
  164 |       const luma = (x: number, y: number) => {
  165 |         const i = (y * width + x) * 4;
  166 |         return data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  167 |       };
  168 |       const mean = (x0: number, x1: number, y0: number, y1: number) => {
  169 |         let sum = 0;
  170 |         let count = 0;
  171 |         for (let y = Math.floor(height * y0); y < Math.floor(height * y1); y += 2) {
  172 |           for (let x = Math.floor(width * x0); x < Math.floor(width * x1); x += 2) {
  173 |             sum += luma(x, y);
  174 |             count++;
  175 |           }
  176 |         }
  177 |         return count ? sum / count : 0;
  178 |       };
  179 |       let outerBrightPixels = 0;
  180 |       let outerPixels = 0;
  181 |       for (let y = Math.floor(height * 0.12); y < Math.floor(height * 0.88); y++) {
  182 |         for (let x = Math.floor(width * 0.82); x < Math.floor(width * 0.98); x++) {
  183 |           outerPixels++;
  184 |           if (luma(x, y) > 55) outerBrightPixels++;
  185 |         }
  186 |       }
  187 |       resolve({
  188 |         leftMean: mean(0.32, 0.48, 0.23, 0.77),
  189 |         rightMean: mean(0.52, 0.68, 0.23, 0.77),
  190 |         outerBrightPixels,
  191 |         outerPixels,
  192 |       });
  193 |     });
  194 |   }));
  195 | }
  196 | 
  197 | type Rgba = { r: number; g: number; b: number; a: number };
  198 | 
  199 | function parseCssColor(value: string): Rgba {
  200 |   const parts = value.match(/[\d.]+/g)?.map(Number) || [];
  201 |   if (parts.length < 3) throw new Error('Unsupported CSS color: ' + value);
  202 |   return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  203 | }
  204 | 
  205 | function relativeLuminance(color: Rgba) {
  206 |   const channel = (value: number) => {
  207 |     const c = value / 255;
  208 |     return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  209 |   };
  210 |   return channel(color.r) * 0.2126 + channel(color.g) * 0.7152 + channel(color.b) * 0.0722;
  211 | }
  212 | 
  213 | function contrastOverBrightScene(foreground: string, overlay: string) {
  214 |   const fg = parseCssColor(foreground);
  215 |   const bg = parseCssColor(overlay);
  216 |   // A bright lunar surface is the hardest backdrop for these translucent dark HUDs.
  217 |   const composed: Rgba = {
  218 |     r: bg.r * bg.a + 255 * (1 - bg.a),
  219 |     g: bg.g * bg.a + 255 * (1 - bg.a),
  220 |     b: bg.b * bg.a + 255 * (1 - bg.a),
  221 |     a: 1,
  222 |   };
  223 |   const lighter = Math.max(relativeLuminance(fg), relativeLuminance(composed));
  224 |   const darker = Math.min(relativeLuminance(fg), relativeLuminance(composed));
  225 |   return (lighter + 0.05) / (darker + 0.05);
  226 | }
  227 | 
  228 | test.describe.configure({ timeout: 180_000 });
  229 | 
  230 | test.describe('Astronomy moon geometry — real WebGL', () => {
  231 |   test.afterEach(async ({ page }) => {
  232 |     await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  233 |   });
  234 | 
  235 |   test('mounts the Sun-Earth-Moon geometry', async ({ page }) => {
  236 |     await mount(page, { moonAgeDays: FIRST_Q });
  237 |     const gl = await page.evaluate(() => (window as any).__gl());
  238 |     expect(gl.state).toBe('ready');
  239 |     expect(gl.contextLost).toBe(false);
  240 |     expect(gl.nearFaceLocked).toBe(true);
  241 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
```