import { test, expect, type Locator, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const root = process.cwd();
let server: ReturnType<typeof createServer>, origin: string;

test.beforeAll(async () => {
  const fixture = readFileSync(join(root,'tests/e2e/18-geometry-world-gl.spec.ts'),'utf8');
  const css = readdirSync(join(root,'app/static/css')).find(name => name.endsWith('.css'));
  const html = fixture.match(/const HARNESS = `([\s\S]*?)`;\r?\n/)![1]
    .replace('</head>',`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app/static/css/${css}"></head>`)
    .replace('return cfg.render(ctx);','window.__ctx = ctx; return cfg.render(ctx);');
  server = createServer(async (request,response) => {
    const name = new URL(request.url || '/','http://localhost').pathname;
    if (name === '/') { response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(html);return; }
    const file = resolve(root,'.'+decodeURIComponent(name));
    if (!file.startsWith(root+sep)) { response.writeHead(403);response.end();return; }
    try {
      const body=await readFile(file);
      const types: Record<string,string> = {'.js':'application/javascript','.css':'text/css','.json':'application/json'};
      response.writeHead(200,{'content-type':types[extname(file)] || 'application/octet-stream'});response.end(body);
    } catch { response.writeHead(404);response.end(); }
  });
  await new Promise<void>(done => server.listen(0,'127.0.0.1',done));
  origin = 'http://127.0.0.1:'+(server.address() as any).port;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
test.afterEach(async ({page},info) => {
  if (info.status !== info.expectedStatus && !page.isClosed()) {
    const state = await page.evaluate(() => {
      const w=window as any,e=w.__geoWorldEngine;
      return {world:w.__toolData?.geometryWorld,selection:e?._builderSelection,undo:e?._undoStack?.length,redo:e?._redoStack?.length,
        focus:document.activeElement?.id || document.activeElement?.outerHTML.slice(0,300),events:w.__events};
    });
    await info.attach('workspace-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
  }
  await page.evaluate(() => { try { (window as any).__destroy(); } catch {} }).catch(() => {});
});

test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},viewport:{width:1180,height:880},reducedMotion:'reduce'});
test.describe.configure({timeout:180000});

async function activate(control: Locator) {
  await expect(control).toBeVisible();
  await control.focus();
  await control.press('Enter');
}
function button(page: Page,name: string) { return page.getByRole('button',{name,exact:true}); }
async function start(page: Page) {
  await page.route('**/*',route => new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  await page.goto(origin);
  await page.evaluate(() => (window as any).__mount({_introShownOnce:true,activeLesson:'builderSandbox',worldActive:true,tutorialDismissed:true,
    showGeometryHome:false,sandboxDockCollapsed:false,renderQuality:'saver',autoCycle:false}));
  await page.waitForFunction(() => (window as any).__geoWorldEngine?._currentLesson?.sandbox);
  await expect(page.locator('.gwe-home')).toBeVisible({timeout:25000});
  await activate(page.locator('.gwe-home-card[data-path=build]'));
  await activate(button(page,'Open blank sandbox'));
  await expect(page.locator('.gwe-home')).toHaveCount(0);
  await expect(page.locator('#gw-inventory-panel')).toHaveCount(0);
  if (await page.locator('.gwe-builder-dock').getAttribute('data-collapsed')==='true') await activate(page.getByRole('button',{name:'Expand Free Build Studio',exact:true}));
  await expect(page.locator('[data-gwe-open-coordinate-build]')).toBeVisible({timeout:25000});
}
async function blocks(page: Page) {
  return page.evaluate(() => Object.values((window as any).__geoWorldEngine.blocks).map((mesh:any)=>mesh.userData)
    .filter((block:any)=>block._measurementLayer==='student')
    .map((block:any)=>({x:block.gridPos.x,y:block.gridPos.y,z:block.gridPos.z,type:block.blockType,shape:block.shape,rotation:block.rotation}))
    .sort((a:any,b:any)=>a.x-b.x || a.y-b.y || a.z-b.z));
}
async function buildLine(page: Page) {
  await activate(page.locator('[data-gwe-open-coordinate-build]'));
  await expect(page.locator('.gwe-coordinate-builder > summary')).toBeFocused({timeout:25000});
  await page.locator('#gwe-build-mode').selectOption('line');
  await page.locator('#gwe-build-length').fill('2');
  await page.locator('#gwe-build-type').selectOption('stone');
  await page.locator('#gwe-build-shape').selectOption('cube');
  await activate(page.locator('#gwe-coordinate-build-review'));
  await activate(button(page,'Apply preview'));
  await expect.poll(()=>blocks(page)).toEqual([
    {x:0,y:1,z:0,type:'stone',shape:'cube',rotation:0},
    {x:1,y:1,z:0,type:'stone',shape:'cube',rotation:0}
  ]);
  await expect(page.locator('#gwe-coordinate-build-review')).toBeFocused({timeout:25000});
  await activate(button(page,'Return to build tools'));
  await expect(page.locator('[data-gwe-edit-selection]')).toBeVisible();
}
async function audit(page: Page,selectors: string[]) {
  if (!(await page.evaluate(()=>!!(window as any).axe))) await page.addScriptTag({path:join(root,'node_modules/axe-core/axe.min.js')});
  const violations = await page.evaluate(async (include) => {
    const result=await (window as any).axe.run({include:include.map(selector=>[selector])},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
    return result.violations.map((item:any)=>({id:item.id,impact:item.impact,nodes:item.nodes.map((node:any)=>node.target)}));
  },selectors);
  expect(violations).toEqual([]);
}

test('builds, edits, undoes and redoes with stable focus and visible selected tools', async ({page},info) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);
  const original = await blocks(page);
  expect(await page.locator('.gwe-creation-summary').evaluate(element=>!!(element.compareDocumentPosition(document.querySelector('.gwe-challenge')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await activate(page.locator('[data-gwe-edit-selection]'));
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
  await page.locator('#gwe-creation-edit-action').selectOption('move');
  await page.locator('#gwe-creation-offset-x').fill('2');
  await activate(button(page,'Preview change'));
  expect(await blocks(page)).toEqual(original);
  await activate(button(page,'Apply preview'));
  const moved=original.map(block=>({...block,x:block.x+2}));
  await expect.poll(()=>blocks(page)).toEqual(moved);
  await expect(button(page,'Preview change')).toBeFocused({timeout:25000});
  const undo=page.locator('[data-gw-utility=undo]'),redo=page.locator('[data-gw-utility=redo]');
  await expect(undo).toHaveAttribute('aria-keyshortcuts',/Control\+Z/);
  await expect(redo).toHaveAttribute('aria-keyshortcuts',/Control\+Shift\+Z/);
  await activate(undo);await expect.poll(()=>blocks(page)).toEqual(original);await expect(undo).toBeFocused();
  await activate(undo);await expect.poll(()=>blocks(page)).toEqual([]);
  await expect(undo).toBeFocused();await expect(undo).toHaveAttribute('aria-disabled','true');
  await expect(undo).toHaveAccessibleName(/0 actions available/);
  await activate(undo);expect(await blocks(page)).toEqual([]);await expect(undo).toBeFocused();
  await activate(redo);await expect.poll(()=>blocks(page)).toEqual(original);
  await activate(redo);await expect.poll(()=>blocks(page)).toEqual(moved);
  await expect(redo).toBeFocused();await expect(redo).toHaveAttribute('aria-disabled','true');
  await activate(redo);expect(await blocks(page)).toEqual(moved);await expect(redo).toBeFocused();
  await audit(page,['[data-gw-utility=undo]','[data-gw-utility=redo]','.gwe-builder-quick-actions','.gwe-creation-summary']);

  await activate(page.locator('[data-gwe-prepare=print]'));
  await expect(page.locator('#gwe-print-title')).toBeFocused({timeout:25000});
  await activate(page.locator('.gwe-tool-finder-toggle'));
  await activate(page.locator('[data-tool=save]'));
  const keep=page.locator('[aria-label="Keep your work"]');
  await expect(keep.getByRole('heading')).toBeFocused({timeout:25000});
  await expect(page.locator('.gwe-builder-dock')).toHaveAttribute('data-print-preparing','false');
  await page.locator('#gwe-project-name').fill('My two-block creation');
  await activate(page.locator('[data-gwe-prepare=print]'));
  await expect(page.locator('#gwe-print-title')).toBeFocused({timeout:25000});
  await activate(page.locator('.gwe-tool-finder-toggle'));
  await activate(page.locator('[data-tool=transform]'));
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
  await expect(page.locator('.gwe-creation-editor')).toBeVisible();
  await expect(page.locator('.gwe-builder-dock')).toHaveAttribute('data-print-preparing','false');
  await expect(page.locator('#gwe-project-name')).toHaveValue('My two-block creation');
  expect(await blocks(page)).toEqual(moved);
  await page.screenshot({path:info.outputPath('desktop-selected-tools.png')});
  await activate(button(page,'Clear selection'));
  await expect(page.locator('[data-gwe-choose-selection]')).toBeFocused({timeout:25000});
  await expect(page.locator('[data-gwe-choose-selection]')).toHaveText('Choose blocks');
  expect(await blocks(page)).toEqual(moved);await expect(page.locator('[data-gwe-edit-selection]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test.describe('touch building history',()=>{
  test.use({viewport:{width:320,height:740},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  test('recovers an undone creation from Touch More and keeps Studio usable on a phone',async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await start(page);await buildLine(page);const original=await blocks(page);
    await page.locator('[data-gwe-edit-selection]').tap();
    await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
    await page.screenshot({path:info.outputPath('phone-edit-controls.png')});
    await audit(page,['.gwe-builder-quick-actions','.gwe-creation-summary','.gwe-creation-editor']);
    for(const [name,width,height,forced] of [['phone',320,740,false],['landscape',667,375,false],['forced-colors',375,812,true]] as const){
      await page.setViewportSize({width,height});await page.emulateMedia({forcedColors:forced?'active':'none'});
      await page.locator('.gwe-builder-body').evaluate(element=>{element.scrollTop=0;});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      await page.screenshot({path:info.outputPath(name+'-selected-tools.png')});
    }
    await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:320,height:740});
    await button(page,'Back to building').tap();
    const more=page.locator('[data-gw-touch-action=more]');await expect(more).toBeVisible();await more.tap();
    await expect(page.locator('#gw-touch-more [data-gw-touch-action=redo]')).toBeDisabled();
    await page.locator('#gw-touch-more [data-gw-touch-action=undo]').tap();
    await expect.poll(()=>blocks(page)).toEqual([]);await expect(page.locator('#gw-touch-more')).toHaveCount(0);
    await more.tap();await expect(page.locator('#gw-touch-more [data-gw-touch-action=undo]')).toBeDisabled();
    const redo=page.locator('#gw-touch-more [data-gw-touch-action=redo]');await expect(redo).toBeEnabled();
    await page.screenshot({path:info.outputPath('phone-redo-ready.png')});await redo.tap();
    await expect.poll(()=>blocks(page)).toEqual(original);await expect(page.locator('#gw-touch-more')).toHaveCount(0);
    await more.tap();await expect(page.locator('#gw-touch-more [data-gw-touch-action=redo]')).toBeDisabled();
    await audit(page,['#gw-touch-more']);expect(errors).toEqual([]);
  });
});
