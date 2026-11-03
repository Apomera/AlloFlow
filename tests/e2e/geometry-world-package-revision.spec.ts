import { test, expect, type Locator, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import JSZip from 'jszip';

const root = process.cwd();
const originalSize = { width:80, depth:20, height:10 };
const revisedSize = { width:60, depth:15, height:15 };
const details = {title:'Classroom bridge revision',description:'Check the raised support.',studentNote:'Measure the new top block.',material:'PETG',aiUse:'ASSISTED',aiDisclosure:'AI helped choose the starting proportions.'};

// Use the real tool registry and WebGL engine from the existing Geometry World
// browser fixture. This host switches tools in one document and keeps common
// toolData, so both tools must consume the same handoff that the user produced.
function hostPage() {
  const fixture = readFileSync(join(root,'tests/e2e/18-geometry-world-gl.spec.ts'),'utf8');
  const html = fixture.match(/const HARNESS = `([\s\S]*?)`;\r?\n/)![1];
  const css = readdirSync(join(root,'app/static/css')).find(name => name.endsWith('.css'));
  return html
    .replace('</head>',`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app/static/css/${css}"></head>`)
    .replace('<script src="/stem_lab/stem_tool_geometryworld.js">','<script src="/prim3d_module.js"></script><script src="/app/vendor/jszip-3.10.1.min.js"></script><script src="/stem_lab/geometry_print_package.js"></script><script src="/stem_lab/stem_tool_geometryworld.js">')
    .replace('<script src="/stem_lab/stem_tool_geometryworld_builder.js"></script>','<script src="/stem_lab/stem_tool_geometryworld_builder.js"></script><script src="/stem_lab/stem_tool_printlab.js"></script>')
    .replace('var bump = null;',`var bump = null, active = 'geometryWorld';
      toolData.printLab = {profile:{name:'School bed',bedWidthMm:100,bedDepthMm:50,bedHeightMm:50,planningClearanceMm:5}};`)
    .replace('setToolData: function () {}, setStemLabTool: function () {},',`setToolData: function (update) {
      toolData = typeof update === 'function' ? update(toolData) : update;
      ctx.toolData = window.__toolData = toolData; if (bump) bump();
    }, setStemLabTool: function (id) {
      var incoming = window.__alloGeometryWorldPendingBuild;
      if (id === 'geometryWorld' && incoming && incoming.intent === 'reviewPrintPackage') {
        window.__lastEditRequest = {number:incoming.printContext.packageReview.revisionNumber,unitMm:incoming.printContext.unitMm,turn:incoming.printTurnDegrees,blocks:incoming.editableWorld.blocks.length};
      }
      active = id; if (bump) bump();
    },`)
    .replace('function Comp() {','function ActiveTool(props) { return StemLab._registry[props.id].render(ctx); }\n    function Comp() {')
    .replace('return cfg.render(ctx);',`window.__ctx = ctx;
      window.__activeTool = active;
      document.getElementById('wrap').style.overflowY = active === 'printLab' ? 'auto' : 'hidden';
      return e(ActiveTool,{key:active,id:active});`);
}

let server: ReturnType<typeof createServer>, origin: string;
test.beforeAll(async () => {
  const html = hostPage();
  server = createServer(async (request,response) => {
    const name = new URL(request.url || '/','http://localhost').pathname;
    if (name === '/') { response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(html);return; }
    const file = resolve(root,'.'+decodeURIComponent(name));
    if (!file.startsWith(root+sep)) { response.writeHead(403);response.end();return; }
    try {
      const body = await readFile(file);
      const types: Record<string,string> = {'.js':'application/javascript','.css':'text/css','.json':'application/json'};
      response.writeHead(200,{'content-type':types[extname(file)] || 'application/octet-stream'});response.end(body);
    } catch { response.writeHead(404);response.end(); }
  });
  await new Promise<void>(done => server.listen(0,'127.0.0.1',done));
  origin = 'http://127.0.0.1:'+(server.address() as any).port;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); });
test.afterEach(async ({page}, info) => {
  if (info.status === info.expectedStatus || page.isClosed()) return;
  const state = await page.evaluate(() => {
    const w=window as any,e=w.__geoWorldEngine,saved=w.__alloGeometryWorldReturnProject,world=w.__toolData?.geometryWorld;
    return {active:w.__activeTool,request:w.__lastEditRequest,pending:w.__alloGeometryWorldPendingBuild?.intent,
      engine:e && {title:e._currentLesson?.title,id:e._workshopProjectId,studentCount:Object.values(e.blocks||{}).filter((m:any)=>m.userData?._measurementLayer==='student').length,sentinel:!!e.blocks?.['9,1,9'],transition:e._pendingWorldTransition?.kind,undo:e._undoStack?.length},
      saved:saved && {id:saved.id,count:saved.blocks.length,sentinel:saved.blocks.some((b:any)=>b.x===9&&b.z===9)},lastDraft:w.__alloGeometryWorldLastDraft?.id,
      world:world && {activeLesson:world.activeLesson,worldActive:world.worldActive,showGameSettings:world.showGameSettings,showSaveRecovery:world.showSaveRecovery},
      focus:document.activeElement?.id,dialog:document.querySelector('[role=dialog]')?.textContent,events:w.__events};
  });
  await info.attach('workspace-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
});
test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']},viewport:{width:1180,height:880},reducedMotion:'reduce'});
test.describe.configure({timeout:240000});

async function enter(control: Locator) {
  await expect(control).toBeVisible();
  await control.focus();
  await control.press('Enter');
}
function button(page: Page,name: string) { return page.getByRole('button',{name,exact:true}); }
function tab(page: Page,name: string) { return page.getByRole('tab',{name,exact:true}); }

function stlDimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const count = view.getUint32(80,true);
  expect(bytes.length).toBe(84+count*50);
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for (let triangle=0; triangle<count; triangle++) {
    for (let vertex=0; vertex<3; vertex++) {
      for (let axis=0; axis<3; axis++) {
        const value = view.getFloat32(84+triangle*50+12+vertex*12+axis*4,true);
        min[axis] = Math.min(min[axis],value);
        max[axis] = Math.max(max[axis],value);
      }
    }
  }
  return {width:max[0]-min[0],depth:max[1]-min[1],height:max[2]-min[2]};
}

async function downloadBytes(page: Page,kind: string) {
  const pending = page.waitForEvent('download');
  await enter(page.locator('[data-print-download='+kind+']'));
  const download = await pending, stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return {bytes:Buffer.concat(chunks),filename:download.suggestedFilename()};
}

async function downloadPackage(page: Page) {
  const {bytes,filename} = await downloadBytes(page,'package'), zip = await JSZip.loadAsync(bytes);
  const model = await zip.file('model.stl')!.async('uint8array');
  const json = async (name: string) => JSON.parse(await zip.file(name)!.async('string'));
  const manifest = await json('manifest.json'), review = await json(manifest.reviewFile);
  const hash = createHash('sha256').update(model).digest('hex'), dimensions = stlDimensions(model);
  expect(manifest.model.sha256).toBe(hash);
  expect(review.contentHash).toBe(hash);
  expect(review.preflight.dimensionsMm).toEqual(dimensions);
  return {bytes,filename,hash,dimensions,manifest,review,source:await json('block-source.json')};
}

async function reopenPackage(page: Page, bytes: Buffer, filename: string) {
  await enter(tab(page,'1. Design'));
  const choosing = page.waitForEvent('filechooser');
  await enter(button(page,'Choose print package'));
  await (await choosing).setFiles({name:filename,mimeType:'application/zip',buffer:bytes});
  await expect(page.locator('[data-print-package-preview] h3')).toBeFocused();
  await enter(button(page,'Open for preflight'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
}

async function disclose(details: Locator) {
  if (!(await details.evaluate(element => (element as HTMLDetailsElement).open))) await enter(details.locator(':scope > summary'));
}

async function selectCells(page: Page, from: number[], to: number[], expectedCount: number) {
  await disclose(page.locator('.gwe-direct-controls'));
  await disclose(page.locator('.gwe-coordinate-selection'));
  for (const [side,position] of [['from',from],['to',to]] as const) {
    for (const [index,axis] of ['x','y','z'].entries()) await page.locator('#gwe-select-'+side+'-'+axis).fill(String(position[index]));
  }
  await enter(page.locator('#gwe-coordinate-review'));
  await enter(page.locator('[data-gwe-apply-coordinate-selection]'));
  await expect.poll(()=>page.evaluate(() => (window as any).__geoWorldEngine._builderSelection.blocks.length)).toBe(expectedCount);
  await enter(page.getByRole('button',{name:'Return to build tools',exact:true}));
}

async function compareSourceChange(page: Page) {
  // Recolor one retained cell. Then move a strip of four floor blocks onto the
  // far end. The gap separates two pieces but leaves count and envelope intact.
  await selectCells(page,[0,2,-3],[0,2,-3],1);
  const editor = page.locator('.gwe-creation-editor');
  await disclose(editor);
  await page.locator('#gwe-creation-edit-action').selectOption('recolor');
  await page.locator('#gwe-creation-material').selectOption('gold');
  await enter(editor.getByRole('button',{name:'Preview change',exact:true}));
  await enter(button(page,'Apply preview'));
  await selectCells(page,[0,1,0],[1,1,1],4);
  await disclose(editor);
  await page.locator('#gwe-creation-edit-action').selectOption('move');
  await page.locator('#gwe-creation-offset-x').fill('0');
  await page.locator('#gwe-creation-offset-y').fill('1');
  await page.locator('#gwe-creation-offset-z').fill('2');
  await enter(editor.getByRole('button',{name:'Preview change',exact:true}));
  await enter(button(page,'Apply preview'));
  await enter(page.locator('[data-gwe-review-revision]'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
}

async function inspectionSnapshot(page: Page, saved = false) {
  return page.evaluate(useSaved => {
    const w=window as any, source=useSaved?w.__alloGeometryWorldReturnProject:w.__geoWorldEngine;
    const records=useSaved?source.blocks:Object.values(source.blocks).filter((mesh:any)=>mesh.userData?._measurementLayer==='student').map((mesh:any)=>({...mesh.userData.gridPos,type:mesh.userData.blockType,shape:mesh.userData.shape,rotation:mesh.userData.rotation}));
    return {blocks:records.map((block:any)=>({x:block.x,y:block.y,z:block.z,type:block.type,shape:block.shape,rotation:block.rotation})).sort((a:any,b:any)=>a.x-b.x||a.y-b.y||a.z-b.z),
      undo:JSON.stringify(useSaved?source.undo:source._undoStack),redo:JSON.stringify(useSaved?source.redo:source._redoStack)};
  },saved);
}

test('reopens an exported package, revises its blocks and produces newly checked print geometry',async ({page},testInfo) => {
  const errors: string[] = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.route('**/*',route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(origin);
  await page.evaluate(() => (window as any).__mount({activeLesson:'builderSandbox',worldActive:true,_introShownOnce:true,tutorialDismissed:true,showGeometryHome:false,sandboxDockCollapsed:false,renderQuality:'saver',autoCycle:false,builderPrintContext:{unitMm:10,aiUse:'NONE'}}));
  await page.waitForFunction(() => (window as any).__geoWorldEngine?._currentLesson?.sandbox);
  await page.evaluate(() => {
    const w = window as any, engine = w.__geoWorldEngine, selected = [];
    if (engine._rafId) { cancelAnimationFrame(engine._rafId);engine._rafId=null; }
    for (let x=0; x<2; x++) for (let z=0; z<8; z++) {
      engine.placeBlock(x,1,z,x ? 'wood' : 'stone','cube',0);
      selected.push({x,y:1,z});
    }
    engine.placeBlock(9,1,9,'wood','cube',0);
    engine._builderSelection = {blocks:selected,exact:true};
    w.__ctx.updateMulti('geometryWorld',{showGeometryHome:false,sandboxDockCollapsed:false,measureResult:engine.measureStructure(0,1,0,selected,true)});
  });

  await enter(page.locator('[data-gwe-prepare=print]'));
  await expect(page.locator('#gwe-print-title')).toBeFocused();
  await enter(page.locator('[data-gwe-send=print]'));
  await enter(button(page,'Preview 90° turn'));
  await enter(button(page,'Apply 90° turn'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
  await enter(tab(page,'4. Submit'));
  const original = await downloadPackage(page);
  expect(original.dimensions).toEqual(originalSize);
  expect(original.manifest.source).toMatchObject({millimetersPerBlock:10,printTurnDegrees:90});
  expect(original.source.blocks).toHaveLength(16);
  testInfo.annotations.push({type:'original-stl',description:original.hash});

  await reopenPackage(page,original.bytes,'class-project.zip');
  await enter(tab(page,'1. Design'));
  await page.locator('#print-lab-scale-input').fill('0.75');
  await enter(button(page,'Apply scale'));
  await enter(tab(page,'3. Materials'));
  await enter(page.getByRole('button',{name:/^PETG/}));
  await enter(tab(page,'4. Submit'));
  await page.locator('#print-lab-model-title').fill(details.title);
  await page.getByLabel(/^What is it for\?/).fill(details.description);
  await page.getByLabel(/^Design note for the reviewer/).fill(details.studentNote);
  await page.getByLabel(/^AI participation/).selectOption(details.aiUse);
  await page.locator('#print-lab-ai-disclosure').fill(details.aiDisclosure);
  await enter(tab(page,'2. Preflight'));
  await enter(button(page,'Run advisory preflight'));
  await enter(tab(page,'4. Submit'));
  const beforeCancel = await downloadBytes(page,'stl');
  expect(stlDimensions(beforeCancel.bytes)).toEqual({width:60,depth:15,height:7.5});
  await enter(tab(page,'2. Preflight'));
  await enter(page.locator('[data-edit-package-blocks]'));
  const incoming = page.locator('[data-gwe-package-revision-review] .gwe-recovery[data-state=preview]');
  await expect(incoming).toBeFocused({timeout:25000});
  expect(await page.evaluate(() => (window as any).__lastEditRequest)).toEqual({number:2,unitMm:7.5,turn:90,blocks:16});
  const priorWorld = await page.evaluate(() => {
    const w = window as any, live = w.__geoWorldEngine, saved = w.__alloGeometryWorldReturnProject;
    return {activeLesson:w.__toolData.geometryWorld.activeLesson,liveTitle:live?._currentLesson?.title,projectId:live?._workshopProjectId,
      liveStudents:Object.keys(live?.blocks || {}).filter(key => live.blocks[key].userData._measurementLayer === 'student'),
      lastDraft:w.__alloGeometryWorldLastDraft?.id,savedStudentCount:saved?.blocks?.length};
  });
  await testInfo.attach('world-before-confirmation',{body:JSON.stringify(priorWorld,null,2),contentType:'application/json'});
  await expect.poll(()=>page.evaluate(() => !!(window as any).__geoWorldEngine?.blocks['9,1,9'])).toBe(true);
  await page.setViewportSize({width:320,height:740});
  const dialog = page.locator('[data-gwe-package-revision-review] [role=dialog]');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('incoming-review.png')});
  await enter(page.locator('[data-gwe-cancel-package-edit]'));
  await page.setViewportSize({width:1180,height:880});
  await expect(page.locator('[data-edit-package-blocks]')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.printLab)).toMatchObject({title:details.title,studentNote:details.studentNote,unitMm:0.75,materialId:details.material});
  await enter(tab(page,'2. Preflight'));
  await enter(button(page,'Run advisory preflight'));
  await enter(tab(page,'4. Submit'));
  expect((await downloadBytes(page,'stl')).bytes.equals(beforeCancel.bytes)).toBe(true);
  await enter(tab(page,'2. Preflight'));

  await enter(page.locator('[data-edit-package-blocks]'));
  await expect(incoming).toBeFocused({timeout:25000});
  expect(await page.evaluate(() => !!(window as any).__geoWorldEngine.blocks['9,1,9'])).toBe(true);
  await enter(page.locator('[data-gwe-confirm-package-edit]'));
  await expect(page.locator('#gwe-selected-creation-title')).toBeFocused();
  const accepted = await page.evaluate(() => { const w = window as any; return {sentinel:!!w.__geoWorldEngine.blocks['9,1,9'], count:w.__geoWorldEngine._builderSelection.blocks.length, scale:w.__toolData.geometryWorld.builderPrintContext.unitMm}; });
  expect(accepted).toEqual({sentinel:false,count:16,scale:7.5});
  const priorDraft = await page.evaluate(priorId => {
    const w=window as any, projects=w.StemLab.geometryWorldBuilderPure.readWorldShelf().projects;
    const saved=projects.find((project:any) => project.id===priorId);
    return {newId:w.__geoWorldEngine._workshopProjectId,previousHasSentinel:saved?.world.blocks.some((b:any)=>b.x===9&&b.y===1&&b.z===9)};
  },priorWorld.projectId);
  expect(priorDraft.newId).toBeTruthy();
  expect(priorDraft.newId).not.toBe(priorWorld.projectId);
  expect(priorDraft.previousHasSentinel).toBe(true);

  // Leave only the new block selected. The package-revision command has to
  // include the complete edited creation rather than the narrow selection.
  await enter(button(page,'Build by coordinates'));
  await expect(page.locator('.gwe-coordinate-builder > summary')).toBeFocused();
  await page.locator('#gwe-build-attach-face').selectOption('y+');
  await enter(page.locator('[data-gwe-position-next]'));
  await expect(page.locator('#gwe-build-origin-y')).toHaveValue('2');
  await enter(page.locator('#gwe-coordinate-build-review'));
  await enter(button(page,'Apply preview'));
  await expect.poll(()=>page.evaluate(() => (window as any).__geoWorldEngine._builderSelection.blocks.length)).toBe(1);
  await enter(page.getByRole('button',{name:'Return to build tools',exact:true}));
  await enter(page.locator('[data-gwe-review-revision]'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
  await expect(page.locator('#print-lab-panel-preflight [data-turn-applied]')).toBeVisible();
  const summary = page.locator('[data-print-revision-summary]');
  await expect(summary).toContainText('16 blocks');
  await expect(summary).toContainText('17 blocks');
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('revised-preflight.png')});
  await enter(button(page,'Prepare revised files'));
  await expect(page.locator('[data-print-download=package]')).toHaveText('Download revised print package');
  await expect(page.locator('[data-print-download=package]')).toBeFocused();
  const revised = await downloadPackage(page);
  expect(revised.hash).not.toBe(original.hash);
  expect(revised.dimensions).toEqual(revisedSize);
  expect(revised.manifest).toMatchObject(details);
  expect(revised.manifest.source).toMatchObject({millimetersPerBlock:7.5,printTurnDegrees:90,revisionNumber:2});
  expect(revised.filename).toMatch(/-v2-print-package\.zip$/);
  expect(revised.source.blocks).toHaveLength(17);
  expect(revised.source.blocks).toEqual(expect.arrayContaining(original.source.blocks));
  expect(revised.source.blocks).toContainEqual(expect.objectContaining({x:0,y:1,z:0}));
  await reopenPackage(page,revised.bytes,revised.filename);
  await enter(page.locator('[data-edit-package-blocks]'));
  await expect(incoming).toBeFocused({timeout:25000});
  expect(await page.evaluate(() => (window as any).__lastEditRequest)).toEqual({number:3,unitMm:7.5,turn:90,blocks:17});
  await enter(page.locator('[data-gwe-confirm-package-edit]'));
  await expect(page.locator('#gwe-selected-creation-title')).toBeFocused();
  await compareSourceChange(page);
  const findings = page.locator('[data-print-revision-findings]');
  const reviewFindings = findings.locator('[data-print-finding-group=review]');
  await expect(page.locator('#print-lab-report-summary')).toContainText('0 blocking items');
  await expect(reviewFindings).toContainText(/separate|shell|pieces/i);
  await expect(reviewFindings).toContainText(/slicer|layers/i);
  const changes = page.locator('[data-print-block-changes]');
  await expect(changes).toBeVisible();
  const changeDetails = page.locator('[data-print-change-details]');
  await disclose(changeDetails);
  const filter=page.locator('[data-print-change-filter]');
  for (const [category,count] of [['added',4],['removed',4],['modified',1]] as const) {
    await filter.focus();
    await filter.selectOption(category);
    await expect(page.locator('[data-print-change-row]')).toHaveCount(count);
    await expect(page.locator('[data-print-inspect-cell]')).toHaveCount(category==='removed'?0:count);
    await expect(filter).toBeFocused();
  }
  await expect(page.locator('[data-print-change-row]')).toContainText(/gold/i);
  const inspectionDurationsMs: Record<string,number> = {};
  const revisionId=await page.evaluate(()=>(window as any).__alloPrintLabGeometrySession.packageReview.revisionId);
  const beforeInspect=await inspectionSnapshot(page,true);
  let inspectionStarted=Date.now();
  await enter(page.locator('[data-print-inspect-cell]'));
  await expect(page.locator('#gwe-selected-creation-title')).toBeFocused({timeout:25000});
  inspectionDurationsMs.cell=Date.now()-inspectionStarted;
  await expect.poll(()=>page.evaluate(()=>(window as any).__geoWorldEngine._builderSelection)).toEqual({blocks:[{x:0,y:2,z:-3}],exact:true});
  expect(await inspectionSnapshot(page)).toEqual(beforeInspect);
  expect(await page.evaluate(()=>(window as any).__geoWorldEngine.blocks['0,2,-3'].userData.blockType)).toBe('gold');
  await page.screenshot({path:testInfo.outputPath('inspect-changed-cell.png')});
  await enter(page.locator('[data-gwe-review-revision]'));
  await expect(page.locator('#preflight-report-title')).toBeFocused({timeout:25000});
  expect(await page.evaluate(()=>(window as any).__alloPrintLabGeometrySession.packageReview.revisionId)).toBe(revisionId);
  await expect(summary).toContainText('Print revision 3');
  await expect(changes).toContainText('1 with a different block material');
  inspectionStarted=Date.now();
  await enter(page.locator('[data-print-inspect-connections]'));
  await expect(page.locator('#gwe-print-connections')).toBeFocused({timeout:25000});
  inspectionDurationsMs.connections=Date.now()-inspectionStarted;
  await expect.poll(()=>page.evaluate(()=>(window as any).__geoWorldEngine._builderSelection.blocks.length)).toBe(17);
  expect(await inspectionSnapshot(page)).toEqual(beforeInspect);
  await expect(page.locator('[data-gwe-review-revision]')).toHaveText('Review all 17 blocks in Print Lab');
  await page.screenshot({path:testInfo.outputPath('inspect-connections.png')});
  await enter(page.locator('[data-gwe-review-revision]'));
  await expect(page.locator('#preflight-report-title')).toBeFocused({timeout:25000});
  expect(await page.evaluate(()=>(window as any).__alloPrintLabGeometrySession.packageReview.revisionId)).toBe(revisionId);
  await expect(summary).toContainText('Print revision 3');
  await disclose(changeDetails);
  await filter.selectOption('modified');
  await page.setViewportSize({width:320,height:740});
  expect(await changes.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.addScriptTag({path:join(root,'node_modules/axe-core/axe.min.js')});
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run({include:[['[data-print-block-changes]'],['[data-print-revision-findings]']]},
      {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
    return result.violations.map((issue:any) => ({id:issue.id,targets:issue.nodes.map((node:any)=>node.target)}));
  });
  expect(accessibility).toEqual([]);
  await changes.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('same-envelope-change.png')});
  await page.setViewportSize({width:1180,height:880});
  await enter(button(page,'Prepare revised files'));
  const sameEnvelope = await downloadBytes(page,'stl');
  expect(stlDimensions(sameEnvelope.bytes)).toEqual(revisedSize);
  const sameEnvelopeHash = createHash('sha256').update(sameEnvelope.bytes).digest('hex');
  expect(sameEnvelopeHash).not.toBe(revised.hash);

  // Switch to a smaller supported bed. Preflight needs to distinguish the
  // blocking fit from the already known shells that only need slicer review.
  await enter(tab(page,'2. Preflight'));
  await page.locator('#print-lab-profile-bedWidthMm').fill('50');
  await enter(button(page,'Apply printer profile'));
  await enter(button(page,'Run advisory preflight'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
  const blockers=findings.locator('[data-print-finding-group=blocking]');
  await expect(blockers).toContainText(/fit|build area/i);
  await expect(reviewFindings).toContainText(/separate|shell|pieces/i);
  await expect(page.locator('[data-print-inspect-connections]')).toHaveCount(1);
  await expect(button(page,'Prepare revised files')).toHaveCount(0);
  await enter(tab(page,'4. Submit'));
  for (const kind of ['package','stl','handoff']) await expect(page.locator('[data-print-download='+kind+']')).toBeDisabled();
  await enter(button(page,'Return to Preflight'));
  await expect(tab(page,'2. Preflight')).toBeFocused();
  await enter(button(page,'Adjust physical size'));
  await expect(page.locator('#print-lab-scale-input')).toBeFocused();
  await page.locator('#print-lab-scale-input').fill('5');
  await enter(button(page,'Apply scale'));
  await enter(button(page,'Check this model'));
  await enter(button(page,'Run advisory preflight'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
  await expect(blockers).toHaveCount(0);
  await expect(reviewFindings).toContainText(/separate|shell|pieces/i);
  await enter(button(page,'Prepare revised files'));
  await expect(page.locator('[data-print-download=package]')).toBeFocused();

  const v3 = await downloadPackage(page);
  const fitSize = {width:40,depth:10,height:10};
  expect(v3.filename).toMatch(/-v3-print-package\.zip$/);
  expect(v3.hash).not.toBe(sameEnvelopeHash);
  expect(v3.dimensions).toEqual(fitSize);
  expect(v3.manifest).toMatchObject(details);
  expect(v3.manifest.source).toMatchObject({millimetersPerBlock:5,printTurnDegrees:90,revisionNumber:3});
  expect(v3.source.blocks).toHaveLength(17);
  expect(v3.review.preflight.status).toBe('WARN');
  expect(v3.review.preflight.issues.map((item:any)=>item.code)).toContain('MULTIPLE_SHELLS');
  const comparison = v3.manifest.revisionComparison;
  expect(comparison.schema).toBe('geometry-world-changes/1');
  expect(comparison.previous).toMatchObject({dimensions:revisedSize,unitMm:7.5,printTurnDegrees:90});
  expect(comparison.current).toMatchObject({dimensions:fitSize,unitMm:5,printTurnDegrees:90});
  expect(comparison.blockChanges).toMatchObject({added:4,removed:4,modified:1,unchanged:12});
  expect(comparison.blockChanges.entries).toHaveLength(9);
  const loose = await downloadBytes(page,'stl');
  const looseReview = JSON.parse((await downloadBytes(page,'handoff')).bytes.toString('utf8'));
  expect(createHash('sha256').update(loose.bytes).digest('hex')).toBe(v3.hash);
  expect(stlDimensions(loose.bytes)).toEqual(fitSize);
  expect(looseReview.contentHash).toBe(v3.hash);
  expect(looseReview.originalFilename).toBe(loose.filename);
  expect(looseReview.preflight.dimensionsMm).toEqual(fitSize);
  expect(looseReview.preflight.status).toBe('WARN');

  await reopenPackage(page,v3.bytes,v3.filename);
  const saved = page.locator('[data-print-saved-history]');
  await expect(saved).toContainText('Saved changes in revision 3');
  await expect(saved.locator('[data-print-block-changes]')).toBeVisible();
  await disclose(saved.locator('[data-print-change-details]'));
  await expect(saved.locator('[data-print-inspect-cell]')).toHaveCount(0);
  await expect(saved.locator('[data-print-change-details]')).toContainText('grid from when this revision was edited');
  await expect(page.locator('#print-lab-report-summary')).toContainText('0 blocking items');
  await expect(reviewFindings).toContainText(/separate|shell|pieces/i);
  // A different applied scale can fail a fresh check. The saved history must
  // still describe the package the learner opened, including its original size.
  await enter(tab(page,'1. Design'));
  await page.locator('#print-lab-scale-input').fill('2');
  await enter(button(page,'Apply scale'));
  await enter(tab(page,'2. Preflight'));
  await enter(button(page,'Run advisory preflight'));
  await expect(page.locator('#preflight-report-title')).toBeFocused();
  await expect(blockers).toContainText(/fit|build area/i);
  await expect(saved).toContainText('40 × 10 × 10 mm');
  await expect(saved).not.toContainText('80 × 20 × 20 mm');
  await testInfo.attach('live-inspection-timings',{body:JSON.stringify(inspectionDurationsMs),contentType:'application/json'});
  await saved.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('saved-history-rechecked.png')});
  await enter(page.locator('[data-print-inspect-connections]'));
  await expect(incoming).toBeFocused({timeout:25000});
  await enter(page.locator('[data-gwe-cancel-package-edit]'));
  await expect(page.locator('[data-print-inspect-connections]')).toBeFocused({timeout:25000});
  await expect(saved).toContainText('Saved changes in revision 3');
  await expect(blockers).toContainText(/fit|build area/i);
  expect(await page.evaluate(()=>(window as any).__toolData.printLab.unitMm)).toBe(2);
  await enter(page.locator('[data-print-inspect-connections]'));
  await expect(incoming).toBeFocused({timeout:25000});
  inspectionStarted=Date.now();
  await enter(page.locator('[data-gwe-confirm-package-edit]'));
  await expect(page.locator('#gwe-print-connections')).toBeFocused({timeout:25000});
  inspectionDurationsMs.reopenedConnections=Date.now()-inspectionStarted;
  await expect.poll(()=>page.evaluate(()=>(window as any).__geoWorldEngine._builderSelection.blocks.length)).toBe(17);
  expect(await page.evaluate(()=>(window as any).__toolData.geometryWorld.builderPrintContext.unitMm)).toBe(10);
  await page.screenshot({path:testInfo.outputPath('reopened-inspect-connections.png')});
  await enter(page.locator('[data-gwe-review-revision]'));
  await expect(page.locator('#preflight-report-title')).toBeFocused({timeout:25000});
  await expect(summary).toContainText('Print revision 4');
  await expect(summary).toContainText('40 × 10 × 10 mm');
  await expect(summary).toContainText('80 × 20 × 20 mm');
  await expect(blockers).toContainText(/fit|build area/i);
  expect(errors).toEqual([]);
  await testInfo.attach('roundtrip',{body:JSON.stringify({original:{dimensions:original.dimensions,hash:original.hash},revised:{dimensions:revised.dimensions,hash:revised.hash},v3:{hash:v3.hash,sameEnvelopeHash,dimensions:v3.dimensions,changes:comparison.blockChanges,findings:v3.review.preflight.issues.map((item:any)=>item.code)},sourceBlocks:v3.source.blocks.length,inspectionDurationsMs,errors},null,2),contentType:'application/json'});
});
