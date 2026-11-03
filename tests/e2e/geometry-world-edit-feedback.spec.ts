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
      const dock=document.querySelector('.gwe-builder-dock'),save=document.querySelector('[data-gwe-save-status]');
      const state=(node:Element|null)=>node?{html:node.outerHTML.slice(0,1600),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,rect:node.getBoundingClientRect().toJSON()}:null;
      const before={dock:state(dock),save:state(save),quotaCalls:w.__geometryStorageFailures,key:w.__geometryStorageKey};
      return {world:w.__toolData?.geometryWorld,selection:e?._builderSelection,undo:e?._undoStack?.length,redo:e?._redoStack?.length,
        focus:document.activeElement?.id || document.activeElement?.outerHTML.slice(0,300),events:w.__events,
        recovery:{...before,lesson:e?._currentLesson?.title,sandbox:e?._currentLesson?.sandbox}};
    });
    await info.attach('workspace-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
  }
  await page.evaluate(() => { try { (window as any).__destroy(); } catch {} }).catch(() => {});
});

test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},viewport:{width:1180,height:880},reducedMotion:'reduce'});
test.describe.configure({timeout:240000});

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


async function openTool(page: Page, id: string) {
  await activate(page.locator('.gwe-tool-finder-toggle'));
  await activate(page.locator('[data-tool="'+id+'"]'));
}
async function openEditor(page: Page) {
  await activate(page.locator('[data-gwe-edit-selection]'));
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
}
async function invalidField(page: Page, id: string, errorId = 'gwe-creation-field-error') {
  const input=page.locator('#'+id),error=page.locator('#'+errorId);
  await expect(input).toBeFocused({timeout:25000});
  await expect(input).toHaveAttribute('aria-invalid','true');
  await expect(input).toHaveAttribute('aria-describedby',new RegExp(errorId));
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
}
async function shelf(page: Page) {
  return page.evaluate(()=>localStorage.getItem((window as any).StemLab.geometryWorldBuilderPure.WORLD_SHELF_KEY));
}
async function downloadJson(page: Page, control: Locator, touch = false) {
  const [download] = await Promise.all([page.waitForEvent('download'),touch ? control.tap() : activate(control)]);
  const stream=await download.createReadStream();
  const chunks: Buffer[]=[];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return {filename:download.suggestedFilename(),value:JSON.parse(Buffer.concat(chunks).toString('utf8'))};
}
async function history(page: Page) {
  return page.evaluate(()=>JSON.stringify([(window as any).__geoWorldEngine._undoStack,(window as any).__geoWorldEngine._redoStack]));
}

test('identifies invalid edit fields and preserves the build until a corrected preview is applied',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);await openEditor(page);
  const original=await blocks(page),beforeHistory=await history(page);
  const action=page.locator('#gwe-creation-edit-action'),preview=button(page,'Preview change');
  const x=page.locator('#gwe-creation-offset-x');
  await x.fill('');await activate(preview);
  await invalidField(page,'gwe-creation-offset-x');
  expect(await blocks(page)).toEqual(original);expect(await history(page)).toBe(beforeHistory);
  await audit(page,['.gwe-creation-editor','#gwe-creation-field-error']);
  await page.screenshot({path:info.outputPath('invalid-move.png')});
  const direct=page.locator('.gwe-direct-controls');
  if(!(await direct.evaluate(element=>(element as HTMLDetailsElement).open))) await activate(direct.locator(':scope > summary'));
  await activate(button(page,'+ X'));
  await expect(page.locator('#gwe-creation-field-error')).toHaveCount(0);
  await expect(x).toHaveValue('1');
  expect(await blocks(page)).toEqual(original);expect(await history(page)).toBe(beforeHistory);
  await activate(button(page,'Cancel preview'));
  await expect(button(page,'+ X')).toBeFocused({timeout:25000});
  await x.fill('2');
  await expect(x).not.toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#gwe-creation-field-error')).toHaveCount(0);
  await activate(preview);expect(await blocks(page)).toEqual(original);
  await activate(button(page,'Apply preview'));
  const moved=original.map(block=>({...block,x:block.x+2}));
  await expect.poll(()=>blocks(page)).toEqual(moved);
  await expect(preview).toBeFocused({timeout:25000});
  const afterMoveHistory=await history(page);

  await x.fill('0');await page.locator('#gwe-creation-offset-y').fill('-1');
  await activate(preview);
  const blocked=page.locator('.gwe-edit-preview');
  await expect(blocked).toBeFocused({timeout:25000});
  await expect(blocked).toHaveAttribute('data-ready','false');
  await expect(page.locator('#gwe-creation-offset-y')).not.toHaveAttribute('aria-invalid','true');
  expect(await blocks(page)).toEqual(moved);expect(await history(page)).toBe(afterMoveHistory);

  await action.selectOption('duplicate');await x.fill('0.5');await activate(preview);
  await invalidField(page,'gwe-creation-offset-x');
  expect(await blocks(page)).toEqual(moved);expect(await history(page)).toBe(afterMoveHistory);

  await action.selectOption('repeat');
  await expect(page.locator('#gwe-creation-field-error')).toHaveCount(0);
  await page.locator('#gwe-pattern-total').fill('1');
  await page.locator('#gwe-pattern-gap').fill('9');await activate(preview);
  await invalidField(page,'gwe-pattern-total');
  await page.locator('#gwe-pattern-total').fill('3');await activate(preview);
  await invalidField(page,'gwe-pattern-gap');
  await expect(page.locator('#gwe-pattern-total')).not.toHaveAttribute('aria-invalid','true');

  await action.selectOption('align');await page.locator('#gwe-align-coordinate').fill('129');
  await activate(preview);await invalidField(page,'gwe-align-coordinate');
  expect(await blocks(page)).toEqual(moved);expect(await history(page)).toBe(afterMoveHistory);
  await page.locator('#gwe-align-coordinate').fill('-2');await activate(preview);
  expect(await blocks(page)).toEqual(moved);
  await activate(button(page,'Cancel preview'));
  await expect(preview).toBeFocused({timeout:25000});

  await openTool(page,'stamps');
  await expect(page.locator('.gwe-stamp-library > summary')).toBeFocused({timeout:25000});
  await page.locator('#gwe-stamp-name').fill('Two-block span');
  await activate(button(page,'Save selection as stamp'));
  await expect(page.locator('#gwe-stamp-corner-y')).toBeVisible();
  await page.locator('#gwe-stamp-corner-y').fill('');
  await activate(button(page,'Preview stamp'));
  await invalidField(page,'gwe-stamp-corner-y','gwe-stamp-field-error');
  expect(await blocks(page)).toEqual(moved);expect(await history(page)).toBe(afterMoveHistory);
  await audit(page,['.gwe-stamp-library','#gwe-stamp-field-error']);
  await page.screenshot({path:info.outputPath('invalid-stamp.png')});
  expect(errors).toEqual([]);
});

test('keeps saved project names distinct from pending edits and exports the latest live build',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);await openTool(page,'save');
  const name=page.locator('#gwe-project-name');
  await expect(name).toBeVisible();
  await name.fill('Garden span');await activate(button(page,'Save project name'));
  await expect.poll(()=>shelf(page)).toContain('Garden span');
  await expect(page.locator('[data-gwe-name-pending]')).toHaveCount(0);
  await name.fill('Uncommitted title');
  await expect(page.locator('[data-gwe-name-pending]')).toBeVisible();
  await expect(name).toHaveAttribute('aria-describedby',/gwe-project-name-pending/);
  await activate(button(page,'Discard name edit'));
  await expect(name).toBeFocused({timeout:25000});await expect(name).toHaveValue('Garden span');

  await openEditor(page);
  await page.locator('#gwe-creation-offset-x').fill('3');await activate(button(page,'Preview change'));
  await activate(button(page,'Apply preview'));
  await expect(button(page,'Preview change')).toBeFocused({timeout:25000});
  await openTool(page,'save');await name.fill('Still pending');
  await expect(page.locator('[data-gwe-name-pending]')).toBeVisible();
  await expect.poll(()=>shelf(page)).toContain('"x":3');
  await expect(name).toHaveValue('Still pending');
  const live=await blocks(page);
  const file=await downloadJson(page,page.getByRole('button',{name:/Save editable world/}));
  expect(file.value.title).toBe('Garden span');expect(file.value.blocks).toEqual(live);
  await activate(button(page,'Discard name edit'));

  // A host unmount and remount models returning to this tool with retained
  // toolData and the browser's own saved draft. All editing is done via UI.
  await page.evaluate(()=>{
    const w=window as any,bucket={...w.__toolData.geometryWorld};
    w.__destroy();w.__mount(bucket);
  });
  await expect(page.locator('.gwe-home')).toBeVisible({timeout:25000});
  await activate(page.locator('.gwe-home-continue'));
  await expect.poll(()=>blocks(page)).toEqual(live);
  if(await page.locator('.gwe-builder-dock').getAttribute('data-collapsed')==='true') await activate(page.getByRole('button',{name:'Expand Free Build Studio',exact:true}));
  await openTool(page,'save');await expect(name).toHaveValue('Garden span');
  await expect(page.locator('[data-gwe-name-pending]')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('restored-project-name.png')});
  await audit(page,['[aria-label="Keep your work"]']);
  expect(errors).toEqual([]);
});

test.describe('mobile editing and save recovery',()=>{
  test.use({viewport:{width:320,height:740},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  test('shows accessible errors and offers a live portable backup when local saving fails',async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await start(page);await buildLine(page);await openEditor(page);
    await page.locator('#gwe-creation-offset-x').fill('0.5');await activate(button(page,'Preview change'));
    await invalidField(page,'gwe-creation-offset-x');
    await audit(page,['.gwe-creation-editor','#gwe-creation-field-error']);
    await page.screenshot({path:info.outputPath('phone-field-error.png')});
    await page.locator('#gwe-creation-offset-x').fill('0');
    await openTool(page,'save');await page.locator('#gwe-project-name').fill('Pocket span');
    await activate(button(page,'Save project name'));
    await expect.poll(()=>shelf(page)).toContain('Pocket span');
    const saved=await shelf(page);
    await page.evaluate(()=>{
      const w=window as any,original=Storage.prototype.setItem,key=w.StemLab.geometryWorldBuilderPure.WORLD_SHELF_KEY;
      w.__geometryStorageFailures=0;w.__geometryStorageKey=key;
      w.__restoreGeometryStorage=()=>{Storage.prototype.setItem=original;};
      Storage.prototype.setItem=function(name,value){
        if(name===key){w.__geometryStorageFailures++;throw new DOMException('Synthetic local-save quota failure','QuotaExceededError');}
        return original.call(this,name,value);
      };
    });
    await openEditor(page);await page.locator('#gwe-creation-offset-x').fill('2');
    await activate(button(page,'Preview change'));await activate(button(page,'Apply preview'));
    await expect(button(page,'Preview change')).toBeFocused({timeout:25000});
    const live=await blocks(page);
    await activate(button(page,'Back to building'));
    const status=page.locator('[data-gwe-save-status]:visible');
    await expect(status).toBeVisible({timeout:20000});
    await expect(status.getByRole('alert')).toBeVisible();
    await expect(status).toContainText(/save|storage|quota/i);
    await expect(page.locator('[data-gwe-backup-current]:visible')).toBeVisible();
    const box=await status.boundingBox(),dockBox=await page.locator('.gwe-builder-dock').boundingBox();
    expect(box!.y+box!.height).toBeLessThanOrEqual(dockBox!.y+dockBox!.height+1);
    expect(await shelf(page)).toBe(saved);
    const backup=await downloadJson(page,page.locator('[data-gwe-backup-current]:visible'),true);
    expect(backup.value.title).toBe('Pocket span');expect(backup.value.blocks).toEqual(live);
    await page.screenshot({path:info.outputPath('phone-save-recovery.png')});
    await audit(page,['[data-gwe-save-status]','[data-gwe-backup-current]']);
    await page.emulateMedia({forcedColors:'active'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    await page.screenshot({path:info.outputPath('forced-colors-save-recovery.png')});
    await page.emulateMedia({forcedColors:'none'});
    await page.locator('[data-gwe-backup-current]:visible').focus();
    await page.evaluate(()=>(window as any).__restoreGeometryStorage());
    await expect.poll(()=>shelf(page),{timeout:20000}).not.toBe(saved);
    await expect(page.locator('[data-gwe-backup-current]:visible')).toHaveCount(0);
    await expect(status).toHaveCount(0);
    await expect(page.locator('.gwe-builder-head .gwe-collapse')).toBeFocused({timeout:25000});
    expect(errors).toEqual([]);
  });
});
