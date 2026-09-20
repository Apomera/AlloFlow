# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: geosandbox-investigations.spec.ts >> touch layout >> complete investigation on a phone
- Location: tests\e2e\geosandbox-investigations.spec.ts:127:6

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByLabel('Prediction (write or describe)', { exact: true })
Expected: ""
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for getByLabel('Prediction (write or describe)', { exact: true })

```

```yaml
- banner:
  - heading "Geometry Sandbox" [level=2]
  - paragraph: A little space for big spatial ideas.
  - button "Challenge": 🎯 Challenge
  - group: Immersive 3D
  - group: More tools
  - button "Back": ← Back
- tabpanel "📐 Stretch mode":
  - group "Learning path":
    - button "Free build" [pressed]
    - button "Lesson sequence"
  - tablist "Geometry mode":
    - tab "📦 Single shape"
    - tab "📐 Stretch mode" [selected]
    - tab "🧊 Sculpt"
  - tablist "Workspace panels":
    - tab "Build"
    - tab "Learn" [selected]
    - tab "Settings"
  - tabpanel "Learn":
    - heading "Explore the math" [level=3]
    - paragraph: Inspect your model, try an investigation, or follow seven lessons from length to volume.
    - button "Open lesson sequence"
    - heading "Investigation prism" [level=3]
    - text: 3D Volume
    - strong: 8.00 u³
    - paragraph: "|u · (v × w)|"
    - paragraph: Surface Area 26.00 u²
    - region "Prism measurement explanations":
      - paragraph: "Volume = base area × perpendicular height: 4 × 2 = 8 u³"
      - button "Highlight base area": Base area · 4 u²
      - button "Highlight perpendicular height": Perpendicular height · 2 u
      - button "Highlight side edge": Side edge · 2.5 u
      - status: Choose a measurement to highlight it on the prism. Select it again to hide the highlight.
    - button "Open Scale explorer"
    - button "Edit selection"
    - region "Guided experiments":
      - heading "Guided experiments" [level=3]
      - strong: Does leaning change volume?
      - paragraph: 1. Predict → 2. Change → 3. Compare and explain
      - paragraph: Predict what will happen to volume and surface area when the top shifts sideways.
      - paragraph: Each guided change starts from your captured prism. Other objects stay in place.
      - button "Apply lean"
      - button "Restore starting prism"
      - status: Which measurement stayed the same? Which changed? Explain using the base area and perpendicular height.
    - group:
      - text: Stretch learning notebook (0)
      - paragraph: Capture a starting construction, predict a change, then save your explanation with both models.
      - checkbox "I shared my prediction aloud or with the model." [disabled]
      - text: I shared my prediction aloud or with the model.
      - paragraph: Your original prediction is recorded. Use your explanation to describe what you learned.
      - group:
        - text: Compare starting and current models
        - 'table "Object #1 · Investigation prism"':
          - caption: "Object #1 · Investigation prism"
          - rowgroup:
            - row "Measure Before After":
              - columnheader "Measure"
              - columnheader "Before"
              - columnheader "After"
          - rowgroup:
            - row "Volume 8 u³ 8 u³":
              - rowheader "Volume"
              - cell "8 u³"
              - cell "8 u³"
            - row "Surface area 24 u² 26 u²":
              - rowheader "Surface area"
              - cell "24 u²"
              - cell "26 u²"
        - paragraph: "Volume: Unchanged"
        - paragraph: "Surface area: +2 u² · ×1.08"
      - text: Investigation title
      - textbox "Investigation title": Does leaning change volume?
      - text: Prediction (write or describe)
      - textbox "Prediction (write or describe)": I predict how the volume will change.
      - text: What did you change?
      - textbox "What did you change?": Shifted the top by three quarters of one base edge, keeping the base and perpendicular height fixed.
      - text: What do the measurements show?
      - textbox "What do the measurements show?"
      - checkbox "I explained my reasoning using the model."
      - text: I explained my reasoning using the model.
      - button "Save notebook entry" [disabled]
      - button "Cancel investigation"
      - status: Guided change applied. Compare the measurements, then explain what happened.
      - button "Export editable project"
      - button "Export readable notebook" [disabled]
      - text: Import project or Stretch Lab model
      - button "Import project or Stretch Lab model"
      - paragraph: Editable projects include unfinished investigations and lesson progress. Readable notebooks include saved entries.
    - group: Real-world challenges
    - group: Optimization puzzle
    - text: 📦 Unfold net
    - button "Show" [disabled]
    - paragraph: Turn off Oblique to unfold this prism — a slanted prism has non-rectangular flaps.
    - text: 🔎 Scale explorer — square–cube law Scale factor k ×2.00
    - slider "Scale factor k": "2"
    - text: Edge 2.00 → 4.00 (×k¹ = ×2.00) Surface 26.00 → 104.00 (×k² = ×4.00) Volume 8.00 → 64.00 (×k³ = ×8.00)
    - paragraph: Double the sides and the volume grows 8×, not 2× — why big animals need thick legs and small ones do not.
    - button "Place a scaled copy beside the original": ⧉ Place ×2.00 copy
    - text: 🍰 Cross-section slicer
    - button "Show slice"
    - text: Cross-section area 4.00 u² Same at every height — that is why volume = area × height (Cavalieri). 4.0 × 2.0 (height) = 8.00 u³
    - group: Construction investigation
  - application "Interactive geometry sandbox 3D visualization"
  - text: "Dimensional-stretch scene with 1 objects: 1 prism. Selected Prism #1, Volume: 8 u^3, 3D. Keyboard: arrow keys orbit the camera; plus and minus zoom. In stretch mode, left and right brackets change selection and Delete removes the selected object. In Sculpt mode, click a visible primitive to select it. Open the Learn tab for its measurements and formulas. During hand editing, click the red X, green Y, or blue Z handles to move the selected part by a local step. A yellow plane shows the selected live cross-section when that explorer is enabled."
  - button "Focus view"
  - button "Toggle fullscreen": ⛶
  - group "Selected object actions":
    - button "Edit selection": Edit
    - button "Explore measurements": Measure
  - group "Camera views":
    - button "Fit model in view": Fit
    - group: Views
  - text: 📐 1 object in scene
- status
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { createServer, type Server } from 'node:http';
  3   | import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
  4   | import { resolve, extname, sep } from 'node:path';
  5   | 
  6   | // Exercise the real component and renderer with local assets and the app CSS.
  7   | // The existing GL harness owns the shared React/Three bootstrap.
  8   | test.use({ video: 'off' });
  9   | 
  10  | const root = process.cwd();
  11  | const source = readFileSync(resolve(root, 'tests/e2e/19-geosandbox-gl.spec.ts'), 'utf8');
  12  | const match = source.match(/const HARNESS = `([\s\S]*?)`;\r?\n/);
  13  | if (!match) throw new Error('Geometry Sandbox GL harness was not found');
  14  | const css = readdirSync(resolve(root, 'app/static/css')).find(name => /^main\..*\.css$/.test(name));
  15  | if (!css) throw new Error('Compiled application CSS was not found');
  16  | const html = match[1].replace('<script src="/prim3d_module.js"></script>', '<script src="/vendor/three-r128/OrbitControls.js"></script><script src="/prim3d_module.js"></script>').replace('</head>',
  17  |   '<link rel="stylesheet" href="/app/static/css/' + css + '">' +
  18  |   '<style>body{font-family:system-ui,sans-serif}#wrap{width:100%;height:auto;min-height:100vh;display:block}#allo-geo-sandbox{width:100%}</style></head>');
  19  | const mime: Record<string, string> = {
  20  |   '.js': 'text/javascript; charset=utf-8',
  21  |   '.css': 'text/css; charset=utf-8',
  22  |   '.html': 'text/html; charset=utf-8',
  23  | };
  24  | 
  25  | let server: Server;
  26  | let base: string;
  27  | 
  28  | test.beforeAll(async () => {
  29  |   server = createServer((req, res) => {
  30  |     const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  31  |     if (pathname === '/') {
  32  |       res.setHeader('Content-Type', 'text/html; charset=utf-8');
  33  |       res.end(html);
  34  |       return;
  35  |     }
  36  |     const file = resolve(root, '.' + decodeURIComponent(pathname));
  37  |     if (!file.startsWith(root + sep)) {
  38  |       res.writeHead(403);
  39  |       res.end();
  40  |       return;
  41  |     }
  42  |     try {
  43  |       res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  44  |       res.end(readFileSync(file));
  45  |     } catch {
  46  |       res.writeHead(404);
  47  |       res.end();
  48  |     }
  49  |   });
  50  |   await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  51  |   const address = server.address();
  52  |   if (!address || typeof address === 'string') throw new Error('Local harness did not start');
  53  |   base = 'http://127.0.0.1:' + address.port;
  54  | });
  55  | 
  56  | test.afterAll(async () => {
  57  |   if (server) await new Promise<void>(done => server.close(() => done()));
  58  | });
  59  | 
  60  | const construction = {
  61  |   objects: [{ id: 1, type: 'prism', position: [-1.5, 0.2, -2], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] }],
  62  |   selection: 1,
  63  | };
  64  | 
  65  | async function mount(page: Page, state: Record<string, unknown> = {}) {
  66  |   await page.goto(base + '/');
  67  |   await page.evaluate(bucket => (window as any).__mount(bucket), state);
  68  |   await page.waitForFunction(() => !!(window as any)._geoScene);
  69  | }
  70  | 
  71  | async function state(page: Page) {
  72  |   return page.evaluate(() => (window as any).__toolData.geoSandbox);
  73  | }
  74  | 
  75  | function workspaceTabs(page: Page) {
  76  |   return page.getByRole('tablist', { name: 'Workspace panels', exact: true });
  77  | }
  78  | 
  79  | async function controlledPanel(page: Page, tab: Locator) {
  80  |   const id = await tab.getAttribute('aria-controls');
  81  |   expect(id, 'Every workspace tab must identify its panel').toBeTruthy();
  82  |   return page.locator('[id="' + id + '"]');
  83  | }
  84  | 
  85  | 
  86  | test.describe.configure({timeout:180000});
  87  | const studyCases=[
  88  |  {id:'lean',title:'Does leaning change volume?',action:'Apply lean',volume:8,height:2,edge:2.5},
  89  |  {id:'height',title:'Double only the height',action:'Double height',volume:16,height:4,edge:4},
  90  |  {id:'scale',title:'Double every dimension',action:'Double every dimension',volume:64,height:4,edge:4},
  91  | ];
  92  | async function completeStudy(page:Page,study:typeof studyCases[number],suffix:string){
  93  |  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  94  |  await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
  95  |  await page.getByRole('button',{name:'Start: '+study.title,exact:true}).click();
  96  |  await expect(page.getByLabel('Prediction (write or describe)',{exact:true})).toBeFocused();
  97  |  const action=page.getByRole('button',{name:study.action,exact:true});await expect(action).toBeDisabled();
  98  |  await page.getByLabel('Prediction (write or describe)',{exact:true}).fill('I predict how the volume will change.');await action.click();
  99  |  await expect.poll(async()=>page.evaluate(()=>(window as any).StemLab.geoPure.geoStretchMeasure((window as any).__toolData.geoSandbox.construction.objects[0]).value)).toBe(study.volume);
  100 |  expect((await state(page)).stretchDraft.before.objects[0].w).toEqual([0,2,0]);
> 101 |  await expect(page.getByLabel('Prediction (write or describe)',{exact:true})).toHaveAttribute('readonly','');
      |                                                                               ^ Error: expect(locator).toHaveAttribute(expected) failed
  102 |  await page.getByRole('button',{name:'Highlight perpendicular height',exact:true}).click();
  103 |  await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('height');
  104 |  const overlay=await page.evaluate(()=>{const g=(window as any)._geoScene.explanationGroup;return {data:g.userData,line:Array.from(g.children.find((c:any)=>c.isLine).geometry.attributes.position.array)};});
  105 |  expect(overlay.data.height).toBe(study.height);expect(overlay.data.edge).toBe(study.edge);expect(Number(overlay.line[4])-Number(overlay.line[1])).toBe(study.height);expect(overlay.line[0]).toBe(overlay.line[3]);expect(overlay.line[2]).toBe(overlay.line[5]);
  106 |  expect(await page.evaluate(()=>(window as any)._geoScene.renderer.getContext().isContextLost())).toBe(false);
  107 |  mkdirSync('reports/geometry-lab-improvements-2026-09-19',{recursive:true});
  108 |  await page.locator('#geo-viewport-shell').screenshot({path:'reports/geometry-lab-improvements-2026-09-19/guided-'+study.id+'-'+suffix+'-scene.png'});
  109 |  await page.getByRole('button',{name:'Highlight base area',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('base');
  110 |  await page.getByRole('button',{name:'Highlight side edge',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('edge');
  111 |  await page.getByLabel('What do the measurements show?',{exact:true}).fill('I compared the volume, base area, and perpendicular height.');await page.getByRole('button',{name:'Save notebook entry',exact:true}).click();
  112 |  expect((await state(page)).stretchRecords[0].experiment).toMatchObject({id:study.id,predictionLocked:true});
  113 |  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export editable project',exact:true}).click();const download=await downloading,downloadPath=await download.path();expect(downloadPath).toBeTruthy();const content=readFileSync(downloadPath!);const exported=JSON.parse(content.toString());expect(exported.entries[0].before.objects[0].w).toEqual([0,2,0]);
  114 |  await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
  115 |  await page.getByLabel('Import project or Stretch Lab model',{exact:true}).setInputFiles({name:'investigation.json',mimeType:'application/json',buffer:content});
  116 |  await expect(page.getByRole('region',{name:'Import preview'})).toBeVisible();await page.getByRole('button',{name:'Apply import',exact:true}).click();
  117 |  expect((await state(page)).stretchRecords[0].experiment.id).toBe(study.id);expect((await state(page)).construction).toEqual(exported.construction);
  118 |  await page.locator('.geo-record > summary').click();await page.getByRole('button',{name:'View before',exact:true}).click();expect((await state(page)).construction.objects[0].w).toEqual([0,2,0]);
  119 |  await workspaceTabs(page).getByRole('tab',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Undo last stretch',exact:true}).click();expect((await state(page)).construction).toEqual(exported.construction);
  120 |  await workspaceTabs(page).getByRole('tab',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Highlight perpendicular height',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('height');
  121 |  await page.getByRole('tab',{name:/Single shape/}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup===null)).toBe(true);
  122 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
  123 | }
  124 | for(const study of studyCases)test('real WebGL investigation: '+study.id,async({page})=>completeStudy(page,study,'desktop'));
  125 | test.describe('touch layout',()=>{
  126 |  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  127 |  test('complete investigation on a phone',async({page})=>completeStudy(page,studyCases[0],'mobile'));
  128 | });
  129 | test('actual Stretch Lab popup returns a model without losing the investigation',async({page})=>{
  130 |  await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
  131 |  await page.getByRole('button',{name:'Start: Does leaning change volume?',exact:true}).click();
  132 |  await page.getByLabel('Prediction (write or describe)',{exact:true}).fill('The volume should stay the same.');const before=(await state(page)).stretchDraft.before;
  133 |  const menu=page.locator('details.geo-immersive-tools');await menu.locator(':scope > summary').click();
  134 |  const popupPromise=page.waitForEvent('popup');await menu.getByRole('button',{name:/^Open the Immersive Geometry Lab in a new window/}).click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  135 |  await expect(popup.locator('#uiStarterCube')).toBeEnabled();await popup.locator('#uiStarterCube').click();
  136 |  await popup.locator('#uiPanelSettings').click();await popup.locator('[data-setting-target="sharingSettings"]').click();await popup.locator('#sandboxTransfer > summary').click();await expect(popup.locator('#uiApplySandbox')).toBeEnabled();await popup.locator('#uiApplySandbox').click();
  137 |  await expect.poll(async()=>(await state(page)).construction.objects.length).toBe(2);expect((await state(page)).stretchDraft.before).toEqual(before);
  138 |  expect((await state(page)).construction.objects[0]).toEqual(before.objects[0]);await expect(popup.locator('#uiApplySandbox')).toBeDisabled();
  139 |  await page.bringToFront();await workspaceTabs(page).getByRole('tab',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Undo last stretch',exact:true}).click();expect((await state(page)).construction).toEqual(before);await popup.close();
  140 | });
  141 | 
```