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
      let body=await readFile(file);
      if(process.env.GW_PREVIEW_CLARITY_MUTANT==='enter' && file===join(root,'stem_lab','stem_tool_geometryworld_builder.js')){
        const original=body.toString(),submit='onSubmit:function(event){event.preventDefault();previewCreationChange();}';
        if(original.split(submit).length!==2)throw new Error('The Enter-preview mutation target is missing or ambiguous.');
        body=Buffer.from(original.replace(submit,'onSubmit:function(event){event.preventDefault();}'));
      }
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
async function buildState(page:Page) {
  return page.evaluate(()=>{
    const engine=(window as any).__geoWorldEngine;
    return {blocks:Object.values(engine.blocks).map((mesh:any)=>mesh.userData).filter((block:any)=>block._measurementLayer==='student')
      .map((block:any)=>({x:block.gridPos.x,y:block.gridPos.y,z:block.gridPos.z,type:block.blockType,shape:block.shape,rotation:block.rotation}))
      .sort((a:any,b:any)=>a.x-b.x||a.y-b.y||a.z-b.z),selection:engine._builderSelection,undo:engine._undoStack.length,redo:engine._redoStack.length};
  });
}

test('previews keyboard edits with captured summaries and explicit Apply',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);
  await openTool(page,'transform');
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
  const original=await buildState(page),x=page.locator('#gwe-creation-offset-x');
  await page.locator('#gwe-creation-edit-action').selectOption('move');
  await x.fill('1.5');await x.press('Enter');
  await expect(x).toBeFocused({timeout:25000});
  await expect(x).toHaveAttribute('aria-invalid','true');
  await expect(x).toHaveAttribute('aria-describedby','gwe-creation-field-error');
  await expect(page.locator('#gwe-creation-field-error')).toBeVisible();
  await expect(button(page,'Apply preview')).toHaveCount(0);
  expect(await buildState(page)).toEqual(original);
  await x.fill('2');await x.press('Enter');
  const summary=page.locator('[data-gwe-preview-summary]:visible');
  await expect(summary).toHaveText('Move 2 grid cells right (+X). After Apply, 2 blocks will be selected (2 currently). Resulting grid span is 2 wide (X), 1 deep (Z), 1 high (Y).');
  await expect(button(page,'Apply preview')).toBeEnabled();
  expect(await buildState(page)).toEqual(original);
  await audit(page,['.gwe-creation-edit-form','.gwe-edit-preview','.gwe-preview-footer']);
  await summary.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('keyboard-move-summary.png')});
  const captured=await summary.innerText();
  await activate(button(page,'Review in world'));
  await expect(page.locator('.gwe-preview-review')).toBeFocused({timeout:25000});
  await expect(page.locator('.gwe-preview-review [data-gwe-preview-summary]')).toHaveText(captured);
  await expect(page.locator('.gwe-preview-review .gwe-preview-facts')).toContainText('Width (X)');
  await expect(page.locator('.gwe-preview-review .gwe-preview-facts')).toContainText('Depth (Z)');
  await expect(page.locator('.gwe-preview-review .gwe-preview-facts')).toContainText('Height (Y)');
  await audit(page,['.gwe-preview-review']);
  await page.screenshot({path:info.outputPath('world-move-summary.png')});
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Cancel preview'));
  await expect(page.locator('#gwe-creation-offset-x')).toBeFocused({timeout:25000});
  expect(await buildState(page)).toEqual(original);

  await page.locator('#gwe-creation-edit-action').selectOption('repeat');
  await page.locator('#gwe-pattern-axis').selectOption('x');
  await page.locator('#gwe-pattern-direction').selectOption('-1');
  await page.locator('#gwe-pattern-total').fill('3');
  const gap=page.locator('#gwe-pattern-gap');await gap.fill('1');await gap.press('Enter');
  await expect(summary).toContainText('Create 3 total instances along X in the negative direction, with a 1-cell gap.');
  await expect(summary).toContainText('6 blocks will be selected (2 currently)');
  await expect(summary).toContainText('8 wide (X), 1 deep (Z), 1 high (Y)');
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Cancel preview'));
  await expect(gap).toBeFocused({timeout:25000});

  await page.locator('#gwe-creation-edit-action').selectOption('align');
  await page.locator('#gwe-align-axis').selectOption('x');
  await page.locator('#gwe-align-edge').selectOption('start');
  const line=page.locator('#gwe-align-coordinate');await line.fill('4');await line.press('Enter');
  await expect(summary).toContainText('Align the lower X grid edge to line 4.');
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Cancel preview'));
  await expect(line).toBeFocused({timeout:25000});

  await page.locator('#gwe-creation-edit-action').selectOption('duplicate');
  const copy=page.locator('#gwe-creation-offset-x');await copy.fill('6');await copy.press('Enter');
  await expect(summary).toContainText('Make a copy offset 6 grid cells right (+X). Original blocks stay in place.');
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Cancel preview'));
  await expect(copy).toBeFocused({timeout:25000});

  await page.locator('#gwe-creation-edit-action').selectOption('recolor');
  await page.locator('#gwe-creation-material').selectOption('glass');
  await activate(button(page,'Preview change'));
  await expect(summary).toContainText('Change block material to Glass.');
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Cancel preview'));
  await expect(button(page,'Preview change')).toBeFocused({timeout:25000});

  await page.locator('#gwe-creation-edit-action').selectOption('move');
  const finalX=page.locator('#gwe-creation-offset-x');await finalX.fill('2');await finalX.press('Enter');
  expect(await buildState(page)).toEqual(original);
  await activate(button(page,'Apply preview'));
  await expect.poll(()=>blocks(page)).toEqual(original.blocks.map((block:any)=>({...block,x:block.x+2})));
  await expect(finalX).toBeFocused({timeout:25000});
  expect((await buildState(page)).undo).toBe(original.undo+1);
  expect(errors).toEqual([]);
  await info.attach('verified-summaries',{body:JSON.stringify({move:captured,original,after:await buildState(page),errors},null,2),contentType:'application/json'});
});

test.describe('phone editing and confirmation',()=>{
  test.use({viewport:{width:320,height:740},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  test('previews placement by Enter and keeps removal controls together',async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await start(page);await openTool(page,'starters');
    await expect(page.locator('.gwe-starter-library > summary')).toBeFocused({timeout:25000});
    await page.getByRole('button',{name:'Choose starter Garden arch',exact:true}).tap();
    const empty=await buildState(page);
    const corner=page.locator('#gwe-starter-corner-x');await corner.fill('10.5');await corner.press('Enter');
    await expect(corner).toBeFocused({timeout:25000});
    await expect(corner).toHaveAttribute('aria-describedby','gwe-starter-field-error');
    expect(await buildState(page)).toEqual(empty);
    await corner.fill('10');await corner.press('Enter');
    await expect(button(page,'Apply preview')).toBeEnabled();
    expect(await buildState(page)).toEqual(empty);
    await activate(button(page,'Apply preview'));
    await expect.poll(()=>blocks(page).then(items=>items.length)).toBeGreaterThan(0);
    await expect(corner).toBeFocused({timeout:25000});
    await openTool(page,'stamps');
    await expect(page.locator('.gwe-stamp-library > summary')).toBeFocused({timeout:25000});
    const name=page.locator('#gwe-stamp-name');await name.fill('Pocket arch');await name.press('Enter');
    await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(1);
    const stampX=page.locator('#gwe-stamp-corner-x');await stampX.fill('25');await stampX.press('Enter');
    await expect(button(page,'Apply preview')).toBeEnabled();
    const original=await buildState(page),stampList=await stamps(page);
    await name.fill('Draft stamp title');
    await disclose(page.locator('.gwe-stamp-manage'));
    const origin=page.locator('[data-gwe-remove-stamp]'),body=page.locator('.gwe-builder-body');
    await origin.focus();
    const scroll=await body.evaluate(element=>element.scrollTop);
    await origin.press('Enter');
    await expect(page.locator('#gwe-stamp-remove-title')).toBeFocused({timeout:25000});
    await expect(page.locator('.gwe-builder-dock')).toHaveAttribute('data-stamp-removing','true');
    await expect(page.locator('#gwe-stamp-remove-title')).toContainText('Pocket arch');
    await expect(page.locator('.gwe-builder-quick-actions')).toBeHidden();
    await expect(page.locator('.gwe-tool-finder-bar')).toBeHidden();
    for(const [view,width,height,forced] of [['phone',320,740,false],['landscape',667,375,false],['forced-colors',375,812,true]] as const){
      await page.setViewportSize({width,height});await page.emulateMedia({forcedColors:forced?'active':'none'});
      const confirmation=page.locator('[data-gwe-stamp-remove-confirmation]');
      await expect(confirmation).toBeVisible();
      await expect(button(page,'Remove stamp')).toBeInViewport({ratio:1});
      await expect(button(page,'Keep stamp')).toBeInViewport({ratio:1});
      const fit=await confirmation.evaluate(element=>{
        const rect=element.getBoundingClientRect(),dock=element.closest('.gwe-builder-dock')!.getBoundingClientRect();
        return {top:rect.top,bottom:rect.bottom,dockTop:dock.top,dockBottom:dock.bottom,width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight};
      });
      expect(fit.top).toBeGreaterThanOrEqual(fit.dockTop-1);expect(fit.bottom).toBeLessThanOrEqual(fit.dockBottom+1);
      expect(fit.bottom).toBeLessThanOrEqual(height);expect(fit.scroll).toBeLessThanOrEqual(width+1);
      await audit(page,['[data-gwe-stamp-remove-confirmation]']);
      await page.screenshot({path:info.outputPath(view+'-focused-removal.png')});
    }
    await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:320,height:740});
    await button(page,'Keep stamp').tap();
    await expect(origin).toBeFocused({timeout:25000});
    await expect(page.locator('[data-gwe-stamp-remove-confirmation]')).toHaveCount(0);
    await expect(name).toHaveValue('Draft stamp title');await expect(stampX).toHaveValue('25');
    await expect(button(page,'Apply preview')).toBeEnabled();
    expect(await stamps(page)).toEqual(stampList);expect(await buildState(page)).toEqual(original);
    await expect.poll(()=>body.evaluate(element=>element.scrollTop).then(value=>Math.abs(value-scroll))).toBeLessThanOrEqual(2);
    await origin.press('Enter');
    await expect(page.locator('#gwe-stamp-remove-title')).toBeFocused({timeout:25000});
    await page.locator('#gwe-stamp-remove-title').press('Escape');
    await expect(origin).toBeFocused({timeout:25000});
    await expect(button(page,'Apply preview')).toBeEnabled();
    expect(await buildState(page)).toEqual(original);
    await origin.press('Enter');
    await expect(page.locator('#gwe-stamp-remove-title')).toBeFocused({timeout:25000});
    await button(page,'Remove stamp').tap();
    await expect.poll(()=>stamps(page).then(items=>items.length)).toBe(0);
    await expect(page.locator('.gwe-stamp-library > summary')).toBeFocused({timeout:25000});
    await expect(button(page,'Apply preview')).toHaveCount(0);
    expect(await buildState(page)).toEqual(original);
    expect(errors).toEqual([]);
    await info.attach('phone-confirmation',{body:JSON.stringify({scroll,original,after:await buildState(page),errors},null,2),contentType:'application/json'});
  });
});
