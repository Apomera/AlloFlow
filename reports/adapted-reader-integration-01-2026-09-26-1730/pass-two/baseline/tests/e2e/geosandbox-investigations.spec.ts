import { test, expect, type Locator, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

// Exercise the real component and renderer with local assets and the app CSS.
// The existing GL harness owns the shared React/Three bootstrap.
test.use({ video: 'off' });

const root = process.cwd();
const source = readFileSync(resolve(root, 'tests/e2e/19-geosandbox-gl.spec.ts'), 'utf8');
const match = source.match(/const HARNESS = `([\s\S]*?)`;\r?\n/);
if (!match) throw new Error('Geometry Sandbox GL harness was not found');
const css = readdirSync(resolve(root, 'app/static/css')).find(name => /^main\..*\.css$/.test(name));
if (!css) throw new Error('Compiled application CSS was not found');
const html = match[1].replace('<head>', '<head><meta name="viewport" content="width=device-width,initial-scale=1">').replace('<script src="/prim3d_module.js"></script>', '<script src="/vendor/three-r128/OrbitControls.js"></script><script src="/prim3d_module.js"></script>').replace('</head>',
  '<link rel="stylesheet" href="/app/static/css/' + css + '">' +
  '<style>body{font-family:system-ui,sans-serif}#wrap{width:100%;height:auto;min-height:100vh;display:block}#allo-geo-sandbox{width:100%}</style></head>');
const mime: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }
    const file = resolve(root, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local harness did not start');
  base = 'http://127.0.0.1:' + address.port;
});

test.afterAll(async () => {
  if (server) await new Promise<void>(done => server.close(() => done()));
});

const construction = {
  objects: [{ id: 1, type: 'prism', position: [-1.5, 0.2, -2], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] }],
  selection: 1,
};

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await page.goto(base + '/');
  await page.evaluate(bucket => (window as any).__mount(bucket), state);
  await page.waitForFunction(() => !!(window as any)._geoScene);
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__toolData.geoSandbox);
}

function workspaceTabs(page: Page) {
  return page.getByRole('tablist', { name: 'Workspace panels', exact: true });
}

async function controlledPanel(page: Page, tab: Locator) {
  const id = await tab.getAttribute('aria-controls');
  expect(id, 'Every workspace tab must identify its panel').toBeTruthy();
  return page.locator('[id="' + id + '"]');
}


test.describe.configure({timeout:180000});
const studyCases=[
 {id:'lean',title:'Does leaning change volume?',action:'Apply lean',volume:8,height:2,edge:2.5},
 {id:'height',title:'Double only the height',action:'Double height',volume:16,height:4,edge:4},
 {id:'scale',title:'Double every dimension',action:'Double every dimension',volume:64,height:4,edge:4},
];
async function completeStudy(page:Page,study:typeof studyCases[number],suffix:string){
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
 await page.getByRole('button',{name:'Start: '+study.title,exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true})).toBeFocused();
 if(suffix==='mobile')expect(await page.evaluate(()=>window.innerWidth)).toBe(390);
 await expect(page.locator('.geo-measurement-guide')).toHaveCount(0);
 const action=page.getByRole('button',{name:study.action,exact:true});await expect(action).toBeDisabled();
 await page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true}).fill('I predict how the volume will change.');await action.click();
 await expect.poll(async()=>page.evaluate(()=>(window as any).StemLab.geoPure.geoStretchMeasure((window as any).__toolData.geoSandbox.construction.objects[0]).value)).toBe(study.volume);
 expect((await state(page)).stretchDraft.before.objects[0].w).toEqual([0,2,0]);
 await expect(page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true})).toHaveAttribute('readonly','');
 const guide=page.locator('.geo-measurement-guide');await expect(guide).not.toHaveAttribute('open','');await guide.locator('summary').focus();await page.keyboard.press('Enter');await expect(guide).toHaveAttribute('open','');await expect(guide).toContainText('The model matches the guided change.');await expect(guide).toContainText('perpendicular height) = '+(study.volume/8)+'.');
 await expect(page.locator('.geo-notebook-comparison').getByRole('rowheader',{name:'Base area',exact:true})).toBeVisible();await expect(page.locator('.geo-notebook-comparison').getByRole('rowheader',{name:'Perpendicular height',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Highlight perpendicular height',exact:true}).click();
 await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('height');
 const overlay=await page.evaluate(()=>{const g=(window as any)._geoScene.explanationGroup;return {data:g.userData,line:Array.from(g.children.find((c:any)=>c.isLine).geometry.attributes.position.array)};});
 expect(overlay.data.height).toBe(study.height);expect(overlay.data.edge).toBe(study.edge);expect(Number(overlay.line[4])-Number(overlay.line[1])).toBe(study.height);expect(overlay.line[0]).toBe(overlay.line[3]);expect(overlay.line[2]).toBe(overlay.line[5]);
 expect(await page.evaluate(()=>(window as any)._geoScene.renderer.getContext().isContextLost())).toBe(false);
 mkdirSync('reports/geometry-lab-improvements-2026-09-19',{recursive:true});
 await page.locator('#geo-viewport-shell').screenshot({path:'reports/geometry-lab-improvements-2026-09-19/guided-'+study.id+'-'+suffix+'-scene.png'});
 await page.getByRole('button',{name:'Highlight base area',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('base');
 await page.getByRole('button',{name:'Highlight side edge',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('edge');
 await page.getByLabel('What do the measurements show?',{exact:true}).fill('I compared the volume, base area, and perpendicular height.');await page.getByRole('button',{name:'Save notebook entry',exact:true}).click();
 expect((await state(page)).stretchRecords[0].experiment).toMatchObject({id:study.id,predictionLocked:true});
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export editable project',exact:true}).click();const download=await downloading,downloadPath=await download.path();expect(downloadPath).toBeTruthy();const content=readFileSync(downloadPath!);const exported=JSON.parse(content.toString());expect(exported.entries[0].before.objects[0].w).toEqual([0,2,0]);
 await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
 await page.getByLabel('Import project or Stretch Lab model',{exact:true}).setInputFiles({name:'investigation.json',mimeType:'application/json',buffer:content});
 await expect(page.getByRole('region',{name:'Import preview'})).toBeVisible();await page.getByRole('button',{name:'Apply import',exact:true}).click();
 expect((await state(page)).stretchRecords[0].experiment.id).toBe(study.id);expect((await state(page)).construction).toEqual(exported.construction);
 await page.locator('.geo-record > summary').click();await page.locator('.geo-record .geo-measurement-guide > summary').click();await expect(page.locator('.geo-record .geo-measurement-guide')).toContainText('perpendicular height) = '+(study.volume/8)+'.');await page.getByRole('button',{name:'View before',exact:true}).click();expect((await state(page)).construction.objects[0].w).toEqual([0,2,0]);
 await workspaceTabs(page).getByRole('tab',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Undo last stretch',exact:true}).click();expect((await state(page)).construction).toEqual(exported.construction);
 await workspaceTabs(page).getByRole('tab',{name:'Learn',exact:true}).click();await page.getByRole('button',{name:'Highlight perpendicular height',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup?.userData.geoExplanation)).toBe('height');
 await page.getByRole('tab',{name:/Single shape/}).click();await expect.poll(async()=>page.evaluate(()=>(window as any)._geoScene.explanationGroup===null)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
}
for(const study of studyCases)test('real WebGL investigation: '+study.id,async({page})=>completeStudy(page,study,'desktop'));
test.describe('touch layout',()=>{
 test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 test('complete investigation on a phone',async({page})=>completeStudy(page,studyCases[0],'mobile'));
});
test('actual Stretch Lab popup returns a model without losing the investigation',async({page})=>{
 await mount(page,{mode:'stretch',workspacePanel:'learn',construction:{objects:[],selection:null}});
 await page.getByRole('button',{name:'Start: Does leaning change volume?',exact:true}).click();
 await page.getByRole('textbox',{name:'Prediction (write or describe)',exact:true}).fill('The volume should stay the same.');const before=(await state(page)).stretchDraft.before;
 const menu=page.locator('details.geo-immersive-tools');await menu.locator(':scope > summary').click();
 const popupPromise=page.waitForEvent('popup');await menu.getByRole('button',{name:/^Open the Immersive Geometry Lab in a new window/}).click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
 await expect(popup.locator('#uiPickAxis2')).toBeEnabled();await popup.locator('#uiPickAxis2').click();await popup.locator('#uiGrow').click();await expect(popup.locator('#uiAxisValue')).toHaveValue('2.25');
 await popup.locator('#uiPanelSettings').click();await popup.locator('[data-setting-target="sharingSettings"]').click();await popup.locator('#sandboxTransfer > summary').click();await expect(popup.locator('#uiApplySandbox')).toBeEnabled();await popup.locator('#uiApplySandbox').click();
 await expect.poll(async()=>(await state(page)).construction.objects.length).toBe(2);expect((await state(page)).stretchDraft.before).toEqual(before);
 expect((await state(page)).construction.objects[0]).toEqual(before.objects[0]);expect((await state(page)).construction.objects[1].w).toEqual([0,2.25,0]);await expect(popup.locator('#uiApplySandbox')).toBeDisabled();
 await page.bringToFront();await workspaceTabs(page).getByRole('tab',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Undo last stretch',exact:true}).click();expect((await state(page)).construction).toEqual(before);await popup.close();
});
