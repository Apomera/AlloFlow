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
    return result.violations.map((item:any)=>({id:item.id,impact:item.impact,nodes:item.nodes.map((node:any)=>({
      target:node.target,failureSummary:node.failureSummary,checks:node.any.map((check:any)=>check.data)
    }))}));
  },selectors);
  expect(violations).toEqual([]);
}


async function openTool(page:Page,id:string) {
  await activate(page.locator('.gwe-tool-finder-toggle'));
  await activate(page.locator('[data-tool="'+id+'"]'));
}
async function disclose(details:Locator) {
  if (!(await details.evaluate(element=>(element as HTMLDetailsElement).open))) await activate(details.locator(':scope > summary'));
  await expect(details).toHaveAttribute('open','');
}
async function stamps(page:Page) {
  return page.evaluate(()=>(window as any).StemLab.geometryWorldBuilderPure.readBuildStamps().stamps);
}
async function worldState(page:Page) {
  return page.evaluate(()=>{
    const engine=(window as any).__geoWorldEngine;
    return {blocks:Object.values(engine.blocks).map((mesh:any)=>mesh.userData)
      .filter((data:any)=>data._measurementLayer==='student').map((data:any)=>({x:data.gridPos.x,y:data.gridPos.y,z:data.gridPos.z,type:data.blockType,shape:data.shape,rotation:data.rotation}))
      .sort((a:any,b:any)=>a.x-b.x||a.y-b.y||a.z-b.z),selection:engine._builderSelection,
      undo:engine._undoStack.length,redo:engine._redoStack.length,
      camera:engine.camera.position.toArray(),quaternion:engine.camera.quaternion.toArray()};
  });
}
async function saveStamp(page:Page,name:string) {
  await page.locator('#gwe-stamp-name').fill(name);
  await activate(button(page,'Save selection as stamp'));
}
async function beginRemoval(page:Page,name:string) {
  await disclose(page.locator('.gwe-stamp-manage'));
  await activate(page.locator('[data-gwe-remove-stamp]'));
  await expect(page.locator('#gwe-stamp-remove-title')).toBeFocused({timeout:25000});
  await expect(page.locator('#gwe-stamp-remove-title')).toContainText(name);
}
async function assertLayout(page:Page,width:number) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
}
test('manages named stamps with confirmation, refreshed recipes and keyboard recovery',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);
  await openTool(page,'stamps');
  const library=page.locator('.gwe-stamp-library');
  await expect(library.locator(':scope > summary')).toBeFocused({timeout:25000});
  const original=await worldState(page);
  await saveStamp(page,'');
  await expect(page.locator('#gwe-stamp-name')).toBeFocused();
  await expect(page.locator('#gwe-stamp-name')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#gwe-stamp-name')).toHaveAttribute('aria-describedby','gwe-stamp-name-error');
  await expect(page.locator('#gwe-stamp-name-error')).toBeVisible();
  expect(await stamps(page)).toHaveLength(0);
  expect(await worldState(page)).toEqual(original);
  await saveStamp(page,'Garden arch');await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(1);
  await saveStamp(page,' garden ARCH ');
  await expect(page.locator('#gwe-stamp-name')).toBeFocused();
  await expect(page.locator('#gwe-stamp-name-error')).toContainText(/already|name/i);
  expect(await stamps(page)).toHaveLength(1);
  await saveStamp(page,'Stone step');await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(2);
  await page.locator('#gwe-stamp-corner-x').fill('10');
  await activate(button(page,'Preview stamp'));
  await expect(button(page,'Apply preview')).toBeVisible();
  expect(await worldState(page)).toEqual(original);
  await beginRemoval(page,'Stone step');
  await audit(page,['.gwe-stamp-library']);
  await page.screenshot({path:info.outputPath('named-removal.png')});
  expect(await stamps(page)).toHaveLength(2);
  await activate(button(page,'Keep stamp'));
  await expect(page.locator('[data-gwe-remove-stamp]')).toBeFocused({timeout:25000});
  await expect(button(page,'Apply preview')).toBeVisible();
  expect(await worldState(page)).toEqual(original);
  await beginRemoval(page,'Stone step');
  await page.locator('#gwe-stamp-remove-title').press('Escape');
  await expect(page.locator('[data-gwe-stamp-remove-confirmation]')).toHaveCount(0);
  await expect(page.locator('[data-gwe-remove-stamp]')).toBeFocused({timeout:25000});
  await expect(button(page,'Apply preview')).toBeVisible();

  await beginRemoval(page,'Stone step');
  const changed=await page.evaluate(()=>{
    const w=window as any,key=w.StemLab.geometryWorldBuilderPure.BUILD_STAMP_KEY,stored=JSON.parse(localStorage.getItem(key)!);
    const target=stored.stamps.find((stamp:any)=>stamp.name==='Stone step');target.name='Updated stone step';target.blocks[0].rotation=1;
    localStorage.setItem(key,JSON.stringify(stored));return target;
  });
  await activate(button(page,'Remove stamp'));
  await expect(page.locator('[data-gwe-stamp-remove-confirmation]')).toHaveCount(0);
  const updated=page.locator('[data-gwe-stamp-id="'+changed.id+'"]');
  await expect(updated).toBeFocused({timeout:25000});
  await expect(updated).toHaveAccessibleName('Use stamp Updated stone step');
  await expect(page.locator('#gwe-stamp-library-notice')).toContainText('changed in another tab');
  expect(await stamps(page)).toHaveLength(2);
  expect(await worldState(page)).toEqual(original);
  await expect(button(page,'Apply preview')).toHaveCount(0);

  await beginRemoval(page,'Updated stone step');
  await page.evaluate(()=>{
    const w=window as any,key=w.StemLab.geometryWorldBuilderPure.BUILD_STAMP_KEY,previous=Storage.prototype.setItem;
    w.__restoreStampStorage=()=>{Storage.prototype.setItem=previous;};
    Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Synthetic stamp quota','QuotaExceededError');return previous.call(this,name,value);};
  });
  const beforeQuota=await stamps(page);
  await activate(button(page,'Remove stamp'));
  await expect(page.locator('[data-gwe-stamp-remove-confirmation]')).toBeVisible();
  await expect(page.locator('[data-gwe-stamp-remove-confirmation] [role=alert]')).toBeVisible();
  expect(await stamps(page)).toEqual(beforeQuota);
  expect(await worldState(page)).toEqual(original);
  await page.screenshot({path:info.outputPath('removal-retry.png')});
  await audit(page,['.gwe-stamp-library']);
  await page.evaluate(()=>(window as any).__restoreStampStorage());
  await activate(button(page,'Remove stamp'));
  await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(1);
  const remaining=page.getByRole('button',{name:'Use stamp Garden arch',exact:true});
  await expect(remaining).toBeFocused({timeout:25000});
  expect(await worldState(page)).toEqual(original);
  await beginRemoval(page,'Garden arch');await activate(button(page,'Remove stamp'));
  await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(0);
  await expect(library.locator(':scope > summary')).toBeFocused({timeout:25000});
  await expect(page.locator('[data-gwe-stamp-remove-confirmation]')).toHaveCount(0);
  expect(await worldState(page)).toEqual(original);
  await audit(page,['.gwe-stamp-library']);
  expect(errors).toEqual([]);
});

test.describe('phone',()=>{
  test.use({viewport:{width:320,height:740},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  test('corrects starter fields, builds explicitly and removes its last reusable recipe',async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await start(page);
    await openTool(page,'starters');
    const starters=page.locator('.gwe-starter-library');
    await expect(starters.locator(':scope > summary')).toBeFocused({timeout:25000});
    await page.getByRole('button',{name:'Choose starter Garden arch',exact:true}).tap();
    const before=await worldState(page);
    const corner=page.locator('#gwe-starter-corner-x');
    await corner.fill('10.5');
    await page.locator('#gwe-starter-corner-y').fill('');
    await activate(button(page,'Preview starter'));
    await expect(corner).toBeFocused({timeout:25000});
    await expect(corner).toHaveAttribute('aria-invalid','true');
    await expect(corner).toHaveAttribute('aria-describedby','gwe-starter-field-error');
    await expect(page.locator('#gwe-starter-field-error')).toBeVisible();
    expect(await worldState(page)).toEqual(before);
    await assertLayout(page,320);
    await page.screenshot({path:info.outputPath('phone-starter-error.png')});
    await audit(page,['.gwe-starter-library']);
    await page.locator('#gwe-starter-corner-x').fill('10');
    await page.locator('#gwe-starter-corner-y').fill('1');
    await page.locator('#gwe-starter-corner-z').fill('0');
    await activate(button(page,'Preview starter'));
    await expect(button(page,'Apply preview')).toBeVisible();
    expect(await worldState(page)).toEqual(before);
    await activate(button(page,'Apply preview'));
    await expect.poll(()=>blocks(page).then(items=>items.length)).toBeGreaterThan(0);
    await expect(button(page,'Preview starter')).toBeFocused({timeout:25000});
    const built=await worldState(page);
    await openTool(page,'stamps');
    await saveStamp(page,'Pocket arch');
    await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(1);
    await beginRemoval(page,'Pocket arch');
    for(const [name,w,h,forced] of [['phone',320,740,false],['landscape',667,375,false],['forced-colors',375,812,true]] as const){
      await page.setViewportSize({width:w,height:h});await page.emulateMedia({forcedColors:forced?'active':'none'});
      await page.locator('#gwe-stamp-remove-title').scrollIntoViewIfNeeded();
      await assertLayout(page,w);
      await page.screenshot({path:info.outputPath(name+'-stamp-confirmation.png')});
      if(forced){
        const colors=await page.evaluate(()=>[...document.querySelectorAll('.gwe-stamp-library .gwe-builder-note,.gwe-stamp-library legend,.gwe-stamp-manage>summary,#gwe-stamp-library-notice')].map(node=>({
          text:node.textContent,color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor,
          parentBackground:node.parentElement&&getComputedStyle(node.parentElement).backgroundColor,forced:getComputedStyle(node).forcedColorAdjust
        })));
        await info.attach('forced-color-text',{body:JSON.stringify(colors,null,2),contentType:'application/json'});
      }
      await audit(page,['.gwe-stamp-library']);
    }
    await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:320,height:740});
    await button(page,'Keep stamp').tap();
    await expect(page.locator('[data-gwe-remove-stamp]')).toBeFocused({timeout:25000});
    expect(await worldState(page)).toEqual(built);
    await beginRemoval(page,'Pocket arch');
    await button(page,'Remove stamp').tap();
    await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(0);
    await expect(page.locator('.gwe-stamp-library > summary')).toBeFocused({timeout:25000});
    expect(await worldState(page)).toEqual(built);
    expect(errors).toEqual([]);
  });
});
