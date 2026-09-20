# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: geosandbox-investigations.spec.ts >> actual Stretch Lab popup returns a model without losing the investigation
- Location: tests\e2e\geosandbox-investigations.spec.ts:129:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#uiStarterCube')
    - locator resolved to <button type="button" id="uiStarterCube" data-starter="cube">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    37 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Test source

```ts
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
  96  |  await expect(page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true})).toBeFocused();
  97  |  const action=page.getByRole('button',{name:study.action,exact:true});await expect(action).toBeDisabled();
  98  |  await page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true}).fill('I predict how the volume will change.');await action.click();
  99  |  await expect.poll(async()=>page.evaluate(()=>(window as any).StemLab.geoPure.geoStretchMeasure((window as any).__toolData.geoSandbox.construction.objects[0]).value)).toBe(study.volume);
  100 |  expect((await state(page)).stretchDraft.before.objects[0].w).toEqual([0,2,0]);
  101 |  await expect(page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true})).toHaveAttribute('readonly','');
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
  132 |  await page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true}).fill('The volume should stay the same.');const before=(await state(page)).stretchDraft.before;
  133 |  const menu=page.locator('details.geo-immersive-tools');await menu.locator(':scope > summary').click();
  134 |  const popupPromise=page.waitForEvent('popup');await menu.getByRole('button',{name:/^Open the Immersive Geometry Lab in a new window/}).click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
> 135 |  await expect(popup.locator('#uiStarterCube')).toBeEnabled();await popup.locator('#uiStarterCube').click();
      |                                                                                                    ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  136 |  await popup.locator('#uiPanelSettings').click();await popup.locator('[data-setting-target="sharingSettings"]').click();await popup.locator('#sandboxTransfer > summary').click();await expect(popup.locator('#uiApplySandbox')).toBeEnabled();await popup.locator('#uiApplySandbox').click();
  137 |  await expect.poll(async()=>(await state(page)).construction.objects.length).toBe(2);expect((await state(page)).stretchDraft.before).toEqual(before);
  138 |  expect((await state(page)).construction.objects[0]).toEqual(before.objects[0]);await expect(popup.locator('#uiApplySandbox')).toBeDisabled();
  139 |  await page.bringToFront();await workspaceTabs(page).getByRole('tab',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Undo last stretch',exact:true}).click();expect((await state(page)).construction).toEqual(before);await popup.close();
  140 | });
  141 | 
```