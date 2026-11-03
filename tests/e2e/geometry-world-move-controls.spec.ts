import {test,expect,type Locator,type Page} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,readdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {extname,join,resolve,sep} from 'node:path';

const root=process.cwd();
let server:ReturnType<typeof createServer>,origin:string;

test.beforeAll(async()=>{
  const fixture=readFileSync(join(root,'tests/e2e/18-geometry-world-gl.spec.ts'),'utf8');
  const css=readdirSync(join(root,'app/static/css')).find(name=>name.endsWith('.css'));
  const html=fixture.match(/const HARNESS = `([\s\S]*?)`;\r?\n/)![1]
    .replace('</head>',`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app/static/css/${css}"></head>`)
    .replace('return cfg.render(ctx);','window.__ctx=ctx; return cfg.render(ctx);');
  server=createServer(async(request,response)=>{
    const name=new URL(request.url||'/','http://localhost').pathname;
    if(name==='/'){response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(html);return;}
    const file=resolve(root,'.'+decodeURIComponent(name));
    if(!file.startsWith(root+sep)){response.writeHead(403);response.end();return;}
    try{
      let body=await readFile(file);
      if(process.env.GW_MOVE_CONTROLS_MUTANT==='apply'&&file===join(root,'stem_lab','stem_tool_geometryworld_builder.js')){
        const original=body.toString(),target="        showEditPreview(result,'gwe-creation-offset-','gwe-creation-field-error');\n      }\n      function renderMoveDirections()";
        if(original.split(target).length!==2)throw new Error('The direct-apply mutation target is missing or ambiguous.');
        body=Buffer.from(original.replace(target,"        showEditPreview(result,'gwe-creation-offset-','gwe-creation-field-error');\n        if(result.ok)commitSelectionEdit(window[ENGINE_KEY],result);\n      }\n      function renderMoveDirections()"));
      }
      const types:Record<string,string>={'.js':'application/javascript','.css':'text/css','.json':'application/json'};
      response.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});response.end(body);
    }catch{response.writeHead(404);response.end();}
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  origin='http://127.0.0.1:'+(server.address() as any).port;
});
test.afterAll(async()=>{await new Promise<void>(done=>server.close(()=>done()));});
test.afterEach(async({page},info)=>{
  if(info.status!==info.expectedStatus&&!page.isClosed()){
    const state=await page.evaluate(()=>{
      const w=window as any,e=w.__geoWorldEngine;
      return {world:w.__toolData?.geometryWorld,selection:e?._builderSelection,undo:e?._undoStack?.length,redo:e?._redoStack?.length,
        focus:document.activeElement?.id||document.activeElement?.outerHTML.slice(0,300),events:w.__events};
    });
    await info.attach('workspace-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
  }
  await page.evaluate(()=>{try{(window as any).__destroy();}catch{}}).catch(()=>{});
});
test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},viewport:{width:1180,height:880},reducedMotion:'reduce'});
test.describe.configure({timeout:240000});

async function activate(control:Locator){
  await expect(control).toBeVisible();await control.focus();await control.press('Enter');
}
function button(page:Page,name:string){return page.getByRole('button',{name,exact:true});}
async function start(page:Page){
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin);
  await page.evaluate(()=>(window as any).__mount({_introShownOnce:true,activeLesson:'builderSandbox',worldActive:true,tutorialDismissed:true,
    showGeometryHome:false,sandboxDockCollapsed:false,renderQuality:'saver',autoCycle:false}));
  await page.waitForFunction(()=>(window as any).__geoWorldEngine?._currentLesson?.sandbox);
  await expect(page.locator('.gwe-home')).toBeVisible({timeout:25000});
  await activate(page.locator('.gwe-home-card[data-path=build]'));await activate(button(page,'Open blank sandbox'));
  await expect(page.locator('.gwe-home')).toHaveCount(0);await expect(page.locator('#gw-inventory-panel')).toHaveCount(0);
  if(await page.locator('.gwe-builder-dock').getAttribute('data-collapsed')==='true')await activate(page.getByRole('button',{name:'Expand Free Build Studio',exact:true}));
  await expect(page.locator('[data-gwe-open-coordinate-build]')).toBeVisible({timeout:25000});
}
async function state(page:Page){
  return page.evaluate(()=>{
    const e=(window as any).__geoWorldEngine;
    return {blocks:Object.values(e.blocks).map((mesh:any)=>mesh.userData).filter((b:any)=>b._measurementLayer==='student')
      .map((b:any)=>({x:b.gridPos.x,y:b.gridPos.y,z:b.gridPos.z,type:b.blockType,shape:b.shape,rotation:b.rotation}))
      .sort((a:any,b:any)=>a.x-b.x||a.y-b.y||a.z-b.z),selection:e._builderSelection,undo:e._undoStack.length,redo:e._redoStack.length};
  });
}
async function buildLine(page:Page){
  await activate(page.locator('[data-gwe-open-coordinate-build]'));
  await expect(page.locator('.gwe-coordinate-builder > summary')).toBeFocused({timeout:25000});
  await page.locator('#gwe-build-mode').selectOption('line');await page.locator('#gwe-build-length').fill('2');
  await page.locator('#gwe-build-type').selectOption('stone');await page.locator('#gwe-build-shape').selectOption('cube');
  await activate(page.locator('#gwe-coordinate-build-review'));await activate(button(page,'Apply preview'));
  await expect.poll(()=>state(page).then(s=>s.blocks.length)).toBe(2);
  await expect(page.locator('#gwe-coordinate-build-review')).toBeFocused({timeout:25000});
  await activate(button(page,'Return to build tools'));
  await expect(page.locator('[data-gwe-edit-selection]')).toBeVisible();
}
async function openTool(page:Page,id:string){
  await activate(page.locator('.gwe-tool-finder-toggle'));await activate(page.locator('[data-tool="'+id+'"]'));
}
async function audit(page:Page,selectors:string[]){
  if(!await page.evaluate(()=>!!(window as any).axe))await page.addScriptTag({path:join(root,'node_modules/axe-core/axe.min.js')});
  const violations=await page.evaluate(async(include)=>{
    const result=await (window as any).axe.run({include:include.map(selector=>[selector])},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
    return result.violations.map((item:any)=>({id:item.id,impact:item.impact,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  },selectors);expect(violations).toEqual([]);
}
function move(page:Page,direction:string){return page.locator('[data-gwe-move-direction="'+direction+'"]');}
async function cancelFrom(page:Page,control:Locator){
  await control.focus();await control.press('Escape');
  await expect(button(page,'Apply preview')).toHaveCount(0);
  await expect(control).toBeFocused({timeout:25000});
}

test('previews direction steps and cancels inline edits without changing the creation',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);await buildLine(page);const original=await state(page);
  await activate(page.locator('[data-gwe-edit-selection]'));
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
  const step=page.locator('#gwe-move-step'),right=move(page,'right'),summary=page.locator('[data-gwe-preview-summary]:visible');
  await expect(step).toHaveValue('1');
  await expect(page.locator('[data-gwe-move-direction]')).toHaveCount(6);
  await activate(right);
  expect(await state(page)).toEqual(original);
  await expect(summary).toContainText('1 grid cell right (+X)');
  await expect(page.locator('#gwe-creation-offset-x')).toHaveValue('1');
  await expect(page.locator('#gwe-creation-offset-y')).toHaveValue('0');
  await expect(page.locator('#gwe-creation-offset-z')).toHaveValue('0');
  await cancelFrom(page,right);expect(await state(page)).toEqual(original);

  await activate(right);await step.selectOption('5');
  await expect(button(page,'Apply preview')).toHaveCount(0);
  expect(await state(page)).toEqual(original);
  await activate(right);await expect(summary).toContainText('5 grid cells right (+X)');
  await expect(page.locator('#gwe-creation-offset-x')).toHaveValue('5');
  expect(await state(page)).toEqual(original);
  await activate(button(page,'Review in world'));
  await expect(page.locator('.gwe-preview-review')).toBeFocused({timeout:25000});
  await page.locator('.gwe-preview-review').press('Escape');
  await expect(right).toBeFocused({timeout:25000});
  await expect(button(page,'Apply preview')).toHaveCount(0);expect(await state(page)).toEqual(original);

  const direct=page.locator('.gwe-direct-controls');
  if(!await direct.evaluate(element=>(element as HTMLDetailsElement).open))await activate(direct.locator(':scope > summary'));
  await activate(button(page,'Move handles'));
  await expect(page.locator('.gwe-transform-handles')).toBeVisible();
  await activate(page.locator('[data-gwe-edit-selection]'));
  await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
  const handledX=page.locator('#gwe-creation-offset-x');await handledX.fill('3');await handledX.press('Enter');
  await expect(button(page,'Apply preview')).toBeEnabled();await cancelFrom(page,handledX);
  await expect(page.locator('.gwe-pointer-hud strong')).toHaveText('Move & rotate');
  await expect(page.locator('.gwe-transform-handles')).toBeVisible();
  await expect(page.locator('.gwe-edit-preview')).toContainText('Preview canceled');
  expect(await state(page)).toEqual(original);
  await activate(button(page,'Done · Esc'));
  await expect(page.locator('.gwe-pointer-hud')).toHaveCount(0);
  await expect(page.locator('#geoworld-fs-wrap')).toBeFocused({timeout:25000});

  await activate(move(page,'down'));
  await expect(page.locator('.gwe-edit-preview')).toBeFocused({timeout:25000});
  await expect(page.locator('.gwe-edit-preview')).toContainText(/ground|bounds|outside|below/i);
  await expect(button(page,'Apply preview')).toBeDisabled();
  expect(await state(page)).toEqual(original);
  const x=page.locator('#gwe-creation-offset-x');await x.fill('2');
  await page.locator('#gwe-creation-offset-y').fill('0');await x.press('Enter');
  await expect(button(page,'Apply preview')).toBeEnabled();await cancelFrom(page,x);
  expect(await state(page)).toEqual(original);
  await step.selectOption('1');await activate(right);
  await audit(page,['.gwe-creation-edit-form','.gwe-edit-preview','.gwe-preview-footer']);
  await right.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('desktop-move-preview.png')});
  await activate(button(page,'Apply preview'));
  await expect.poll(()=>state(page).then(s=>s.blocks)).toEqual(original.blocks.map(b=>({...b,x:b.x+1})));
  await expect(right).toBeFocused({timeout:25000});
  await activate(page.locator('[data-gw-utility=undo]'));
  await expect.poll(()=>state(page).then(s=>s.blocks)).toEqual(original.blocks);
  expect((await state(page)).undo).toBe(original.undo);
  await activate(button(page,'Focus creation'));
  await page.waitForFunction(()=>!(window as any).__geoWorldEngine?._creationFocus?.transition);
  await activate(page.getByRole('button',{name:'Expand Free Build Studio',exact:true}));
  await openTool(page,'select');
  await expect(page.locator('.gwe-direct-controls > summary')).toBeFocused({timeout:25000});
  await activate(button(page,'Select blocks'));await activate(button(page,'Open canvas controls'));
  const selected=page.locator('[data-gwe-canvas-selection-status]');
  await expect(selected).toHaveAttribute('role','status');await expect(selected).toHaveAttribute('aria-live','polite');
  await expect(selected).toContainText(/2.*selected|selected.*2/i);
  const point=await page.evaluate(()=>{
    const w=window as any,e=w.__geoWorldEngine,mesh=Object.values(e.blocks).find((m:any)=>m.userData?._measurementLayer==='student') as any;
    e.camera.updateMatrixWorld(true);mesh.updateMatrixWorld(true);
    const p=new w.THREE.Box3().setFromObject(mesh).getCenter(new w.THREE.Vector3()).project(e.camera);
    const rect=document.querySelector('#geoworld-fs-wrap canvas')!.getBoundingClientRect();
    return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};
  });
  await page.mouse.click(point.x,point.y);
  await expect(selected).toContainText(/1.*selected|selected.*1/i);
  await expect.poll(()=>state(page).then(s=>s.selection?.blocks.length)).toBe(1);
  await audit(page,['.gwe-pointer-hud']);await page.screenshot({path:info.outputPath('canvas-selection-status.png')});
  const canvas=page.locator('#geoworld-fs-wrap canvas');
  const rect=await canvas.boundingBox();expect(rect).toBeTruthy();
  await page.mouse.click(rect!.x+rect!.width*.5,rect!.y+rect!.height*.15);
  await expect(selected).toContainText(/0|No blocks selected/i);
  expect((await state(page)).blocks).toEqual(original.blocks);expect((await state(page)).undo).toBe(original.undo);
  expect(errors).toEqual([]);
  await info.attach('movement-proof',{body:JSON.stringify({original,restored:await state(page),errors},null,2),contentType:'application/json'});
});

test.describe('touch move controls and placement cancellation',()=>{
  test.use({viewport:{width:320,height:740},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  test('keeps directional controls accessible and cancels each inline placement form',async({page},info)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await start(page);await buildLine(page);const original=await state(page);
    await page.locator('[data-gwe-edit-selection]').tap();
    await expect(page.locator('.gwe-creation-editor > summary')).toBeFocused({timeout:25000});
    const step=page.locator('#gwe-move-step');await step.selectOption('5');
    const up=move(page,'up');await up.tap();
    await expect(page.locator('[data-gwe-preview-summary]:visible')).toContainText('5 grid cells up (+Y)');
    expect(await state(page)).toEqual(original);await cancelFrom(page,up);
    for(const [name,width,height,forced] of [['phone',320,740,false],['landscape',667,375,false],['forced-colors',375,812,true]] as const){
      await page.setViewportSize({width,height});await page.emulateMedia({forcedColors:forced?'active':'none'});
      await page.evaluate(async()=>{await document.fonts.ready;});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      for(const control of await page.locator('[data-gwe-move-direction]').all())expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const reachable=[];
      for(const control of [step,...await page.locator('[data-gwe-move-direction]').all()]){
        await control.scrollIntoViewIfNeeded();
        const bounds=await control.evaluate(node=>{
          const rect=node.getBoundingClientRect(),body=node.closest('.gwe-builder-body')!.getBoundingClientRect();
          const hit=document.elementFromPoint((rect.left+rect.right)/2,(rect.top+rect.bottom)/2);
          return {id:node.id,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,bodyTop:body.top,bodyBottom:body.bottom,centerHit:!!hit&&(hit===node||node.contains(hit)),hitTag:hit?.tagName,hitId:hit?.id,hitClass:String(hit?.className||'')};
        });
        reachable.push(bounds);
        await info.attach(name+'-'+bounds.id+'-control-bounds',{body:JSON.stringify(bounds,null,2),contentType:'application/json'});
        await expect(control).toBeInViewport({ratio:1});
        expect(bounds.top).toBeGreaterThanOrEqual(bounds.bodyTop-1);expect(bounds.bottom).toBeLessThanOrEqual(bounds.bodyBottom+1);
        expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.centerHit).toBe(true);
        if(name==='landscape'&&control===step)await page.screenshot({path:info.outputPath('landscape-move-distance.png')});
      }
      await info.attach(name+'-control-reachability',{body:JSON.stringify(reachable,null,2),contentType:'application/json'});
      if(name==='landscape')await page.screenshot({path:info.outputPath('landscape-depth-controls.png')});
      await page.locator('.gwe-move-controls').scrollIntoViewIfNeeded();
      await audit(page,['.gwe-creation-edit-form']);await page.screenshot({path:info.outputPath(name+'-move-controls.png')});
    }
    await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:320,height:740});
    const editor=page.locator('.gwe-creation-editor');
    const changeSelection=button(page,'Change selection'),preparePrint=page.locator('[data-gwe-prepare="print"]');
    await changeSelection.tap();await button(page,'Return to build tools').tap();
    await expect(changeSelection).toBeFocused({timeout:25000});await expect(editor).toHaveAttribute('open','');
    await preparePrint.tap();await button(page,'Return to build tools').tap();
    await expect(preparePrint).toBeFocused({timeout:25000});await expect(editor).toHaveAttribute('open','');
    expect(await state(page)).toEqual(original);
    await openTool(page,'stamps');await expect(page.locator('.gwe-stamp-library > summary')).toBeFocused({timeout:25000});
    const stampName=page.locator('#gwe-stamp-name');await stampName.fill('Pocket beam');await stampName.press('Enter');
    await expect(page.locator('.gwe-stamp-card')).toHaveCount(1);
    const stampX=page.locator('#gwe-stamp-corner-x');await stampX.fill('10');await stampX.press('Enter');
    await expect(button(page,'Apply preview')).toBeEnabled();await cancelFrom(page,stampX);
    expect(await state(page)).toEqual(original);await expect(stampX).toHaveValue('10');

    await openTool(page,'starters');await expect(page.locator('.gwe-starter-library > summary')).toBeFocused({timeout:25000});
    await page.getByRole('button',{name:'Choose starter Garden arch',exact:true}).tap();
    const starterX=page.locator('#gwe-starter-corner-x');await starterX.fill('20');await starterX.press('Enter');
    await expect(button(page,'Apply preview')).toBeEnabled();await cancelFrom(page,starterX);
    expect(await state(page)).toEqual(original);await expect(starterX).toHaveValue('20');

    await openTool(page,'construct');await expect(page.locator('.gwe-coordinate-builder > summary')).toBeFocused({timeout:25000});
    const originX=page.locator('#gwe-build-origin-x');await originX.fill('30');await originX.press('Enter');
    await expect(button(page,'Apply preview')).toBeEnabled();await cancelFrom(page,originX);
    await expect(page.locator('.gwe-coordinate-builder')).toHaveAttribute('open','');
    await expect(originX).toHaveValue('30');expect(await state(page)).toEqual(original);
    await audit(page,['.gwe-coordinate-builder']);expect(errors).toEqual([]);
    await info.attach('placement-cancel-proof',{body:JSON.stringify({original,after:await state(page),errors},null,2),contentType:'application/json'});
  });
});
