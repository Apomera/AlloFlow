# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> riverbank observer: WebGL recovery preserves the selected observer without resuming motion
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1314:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('canvas[data-bridge-gl="true"]') to be visible
    60 × locator resolved to hidden <canvas width="866" height="478" aria-hidden="true" data-bridge-gl="true"></canvas>

```

# Test source

```ts
  45  |     var cfg = window.StemLab._registry.bridgeLab;
  46  |     window.__toolData = { bridgeLab: Object.assign({}, bucket || {}) };
  47  |     var bump = null;
  48  |     var ctx = {
  49  |       React: React,
  50  |       get toolData() { return window.__toolData; },
  51  |       setToolData: function (fn) {
  52  |         window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
  53  |         if (bump) bump();
  54  |       },
  55  |       update: function (b, k, v) {
  56  |         window.__toolData = Object.assign({}, window.__toolData);
  57  |         window.__toolData[b] = Object.assign({}, window.__toolData[b]);
  58  |         window.__toolData[b][k] = v;
  59  |         if (bump) bump();
  60  |       },
  61  |       updateMulti: function (b, patch) {
  62  |         window.__toolData = Object.assign({}, window.__toolData);
  63  |         window.__toolData[b] = Object.assign({}, window.__toolData[b], patch);
  64  |         if (bump) bump();
  65  |       },
  66  |       setStemLabTool: function () {}, setStemLabTab: function () {},
  67  |       addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
  68  |       announceToSR: function (m) { window.__events.sr.push(String(m)); },
  69  |       celebrate: function () {}, beep: function () {},
  70  |       callGemini: null, gradeLevel: '8th Grade', toolSnapshots: [], props: {},
  71  |       t: function (k, fb) { return fb || k; },
  72  |       icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
  73  |       a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
  74  |       srOnly: {}
  75  |     };
  76  |     function Comp() {
  77  |       var st = React.useState(0);
  78  |       bump = function () { st[1](function (n) { return n + 1; }); };
  79  |       window.__bump = bump;
  80  |       return cfg.render(ctx);
  81  |     }
  82  |     window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
  83  |     window.__root.render(e(Comp));
  84  |     return !!cfg;
  85  |   };
  86  |   window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  87  |   window.__gl = function () { return window.__alloBridgeGL ? window.__alloBridgeGL.debug() : null; };
  88  |   window.__bucket = function () { return window.__toolData.bridgeLab; };
  89  |   window.__set = function (patch) {
  90  |     window.__toolData = Object.assign({}, window.__toolData);
  91  |     window.__toolData.bridgeLab = Object.assign({}, window.__toolData.bridgeLab, patch);
  92  |     window.__render();
  93  |   };
  94  |   window.__render = function () { window.__bump && window.__bump(); };
  95  |   window.__canvasCount = function () { return document.querySelectorAll('canvas[data-bridge-gl]').length; };
  96  |   window.__svgCount = function () { return document.querySelectorAll('svg').length; };
  97  |   window.__text = function () { return document.body.innerText; };
  98  | </script>
  99  | </body></html>`;
  100 | 
  101 | let server: Server;
  102 | let base: string;
  103 | 
  104 | test.beforeAll(async () => {
  105 |   server = createServer(async (req, res) => {
  106 |     const url = (req.url || '/').split('?')[0];
  107 |     if (url === '/__harness') {
  108 |       res.writeHead(200, { 'content-type': MIME['.html'] });
  109 |       res.end(HARNESS);
  110 |       return;
  111 |     }
  112 |     try {
  113 |       const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
  114 |       const file = join(ROOT, rel);
  115 |       if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
  116 |       const body = await readFile(file);
  117 |       res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  118 |       res.end(body);
  119 |     } catch {
  120 |       res.writeHead(404);
  121 |       res.end('not found');
  122 |     }
  123 |   });
  124 |   await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  125 |   const addr = server.address();
  126 |   base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  127 | });
  128 | 
  129 | test.afterAll(async () => {
  130 |   await new Promise<void>((r) => server.close(() => r()));
  131 | });
  132 | 
  133 | type Pg = import('@playwright/test').Page;
  134 | const ENHANCEMENT_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-immersive-earthquake-2026-09-28');
  135 | const IMMERSIVE_REPORT = ENHANCEMENT_REPORT;
  136 | const INVESTIGATION_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-investigation-2026-09-29');
  137 | const REPLAY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-replay-2026-09-29');
  138 | const COMPARISON_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-comparison-2026-09-29');
  139 | const FREQUENCY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-frequency-2026-09-29');
  140 | 
  141 | async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  142 |   await page.goto(`${base}/__harness`);
  143 |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.bridgeLab);
  144 |   await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'build' }, bucket));
> 145 |   await page.waitForSelector('canvas[data-bridge-gl="true"]', { timeout: 30000 });
      |              ^ TimeoutError: page.waitForSelector: Timeout 30000ms exceeded.
  146 |   // The viewer deliberately suspends repainting offscreen. Exercise changes
  147 |   // with the stage visible, as a learner would, instead of sampling stale GL state.
  148 |   await page.locator('canvas[data-bridge-gl="true"]').scrollIntoViewIfNeeded();
  149 |   await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  150 |   await page.waitForTimeout(400);
  151 | }
  152 | 
  153 | async function mountWorkflow(page: Pg, width: number, bucket: Record<string, unknown> = {}) {
  154 |   await page.setViewportSize({ width, height: 900 });
  155 |   await mount(page, Object.assign({ introDismissed: true }, bucket));
  156 |   // Match the app shell's box sizing and viewport-bound desktop panel. At phone
  157 |   // widths the tool's responsive rule deliberately switches to document flow.
  158 |   await page.addStyleTag({ content: `
  159 |     *,*::before,*::after{box-sizing:border-box}
  160 |     body{font-family:system-ui,sans-serif}
  161 |     #wrap{width:100%;max-width:1100px;height:${width <= 640 ? 'auto' : '100vh'};margin:0 auto;overflow:${width <= 640 ? 'visible' : 'hidden'}}
  162 |   ` });
  163 |   await mkdir(ENHANCEMENT_REPORT, { recursive: true });
  164 | }
  165 | 
  166 | async function checkWorkflowHealth(page: Pg) {
  167 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  168 |   const extent = await page.evaluate(() => ({
  169 |     viewport: document.documentElement.clientWidth,
  170 |     document: document.documentElement.scrollWidth,
  171 |     body: document.body.scrollWidth
  172 |   }));
  173 |   expect(extent.document, 'document horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
  174 |   expect(extent.body, 'body horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
  175 | }
  176 | 
  177 | async function checkBridgeCanvasFillsStage(page: Pg) {
  178 |   await expect.poll(() => page.locator('canvas[data-bridge-gl]').evaluate(canvas => {
  179 |     const stage = canvas.closest('[data-allo-fs-stage]') as HTMLElement;
  180 |     const element = canvas as HTMLCanvasElement;
  181 |     const ratio = Math.min(window.devicePixelRatio || 1, 2);
  182 |     return Math.max(Math.abs(element.clientHeight - stage.clientHeight),
  183 |       Math.abs(element.clientWidth - stage.clientWidth),
  184 |       Math.abs(element.height / ratio - stage.clientHeight),
  185 |       Math.abs(element.width / ratio - stage.clientWidth));
  186 |   }), { message: 'the CSS canvas and drawing buffer fill the whole stage' }).toBeLessThanOrEqual(1);
  187 | }
  188 | 
  189 | async function captureRegion(page: Pg, region: import('@playwright/test').Locator, name: string) {
  190 |   const viewport = page.viewportSize();
  191 |   // A locator image cannot see through the desktop panel's scroll clipping.
  192 |   // Give the real panel enough height for this region while retaining its width.
  193 |   // Restore the normal viewport before the next interaction/overflow assertion.
  194 |   if (viewport && viewport.width > 640) {
  195 |     const height = await region.evaluate((element) => element.getBoundingClientRect().height);
  196 |     await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1000) });
  197 |   }
  198 |   await region.screenshot({ path: join(ENHANCEMENT_REPORT, name) });
  199 |   if (viewport) await page.setViewportSize(viewport);
  200 | }
  201 | 
  202 | async function captureImmersiveRegion(page: Pg, region: import('@playwright/test').Locator, name: string, folder = IMMERSIVE_REPORT) {
  203 |   const viewport = page.viewportSize();
  204 |   if (viewport && viewport.width > 640) {
  205 |     const height = await region.evaluate(element => element.getBoundingClientRect().height);
  206 |     await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1500) });
  207 |   }
  208 |   await region.scrollIntoViewIfNeeded();
  209 |   await region.screenshot({ path: join(folder, name) });
  210 |   if (viewport) await page.setViewportSize(viewport);
  211 | }
  212 | 
  213 | test.describe.configure({ timeout: 180_000 });
  214 | 
  215 | test.describe('Bridge Lab — real WebGL', () => {
  216 |   test.afterEach(async ({ page }) => {
  217 |     await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  218 |   });
  219 | 
  220 |   test('draws BOTH truss planes, not the one the elevation showed', async ({ page }) => {
  221 |     await mount(page, { span: 30, height: 6, nBays: 4, trussStyle: 'warren' });
  222 |     const gl = await page.evaluate(() => (window as any).__gl());
  223 |     expect(gl.state).toBe('ready');
  224 |     expect(gl.contextLost).toBe(false);
  225 |     expect(gl.trussPlanes).toBe(2);
  226 |     // Warren, 4 bays: 4 bottom chord + 3 top chord + 8 diagonals = 15 members,
  227 |     // doubled across the two planes.
  228 |     expect(gl.memberCount).toBe(30);
  229 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  230 |   });
  231 | 
  232 |   test('has a deck and spans the real width of the bridge', async ({ page }) => {
  233 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  234 |     const gl = await page.evaluate(() => (window as any).__gl());
  235 |     expect(gl.deckPresent).toBe(true);
  236 |     expect(gl.extent.w).toBe(30);
  237 |     expect(gl.extent.h).toBe(6);
  238 |     expect(gl.extent.d).toBeGreaterThan(4);   // two planes, a walkable deck between
  239 |   });
  240 | 
  241 |   test('bracing slider changes how much bracing is drawn', async ({ page }) => {
  242 |     await mount(page, { span: 40, height: 5, nBays: 6, lateralBraceEvery: 1 });
  243 |     const tight = await page.evaluate(() => (window as any).__gl().braceCount);
  244 |     await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 3 }));
  245 |     await page.waitForTimeout(500);
```