import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-directory-actions-2026-10-03';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, organSearch: '', directoryFilter: 'all', revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  });
}
const context = (page: Page) => page.locator('[data-directory-context]');
const result = (page: Page, id = 'dorsal_skin') => page.locator('#diss-organ-' + id);

const saved = { exploredOrgans: { 'frog|ventral_skin': true, 'frog|tympanum': true, 'frog|nictitating': true }, organNotes: { 'frog|ventral_skin': 'Observed the pale, moist ventral surface.', 'frog|tympanum': 'Observed a circular eardrum behind the eye.' }, organConfidence: { 'frog|tympanum': 2 }, verifiedIdentifications: { 'frog|tympanum': { status: 'verified', at: 88 } }, revealedLayers: { muscle: true }, toolCalibration: { forcepsGrip: 45, probePressure: 40, pinAngle: 60 }, procedureScenario: 'structure-trace', instructorRequiredStructures: 2, scenarioStartedAt: 100, scenarioCompletedAt: 200 };
const row = (page: Page, id: string) => page.locator('#diss-organ-' + id);
async function back(page: Page) { await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click(); }
async function time(page: Page, value: number) { await page.evaluate(value => { Date.now = () => value; }, value); }

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`directory actions ${name} state the actual action and preserve saved evidence`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { ...saved, largeText: !!large, highContrast: !!contrast }, width, available);
  const before = await evidence(page), directory = page.locator('[data-dissection-directory]');
  for (const [id, action] of [['dorsal_skin','Show recovery guidance'],['ventral_skin','Choose confidence'],['tympanum','Review saved record'],['nictitating','Open observation record']]) {
    await expect(row(page,id).locator('.diss-directory-item__action')).toHaveText(action + ' →');
    await expect(row(page,id)).toHaveAccessibleName(new RegExp(action));
  }
  await expect(row(page,'nictitating').locator('[data-structure-record]')).toHaveText('Note and confidence needed');
  await row(page,'ventral_skin').focus();
  await directory.screenshot({path:`${out}/${name}-actions.png`,style:'.diss-next-action {position:static!important;}'});
  const metrics = await directory.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
    rows:Array.from(el.querySelectorAll('.diss-directory-item')).map(n=>({height:n.getBoundingClientRect().height,clipped:n.scrollWidth>n.clientWidth+1})),
    text:Array.from(el.querySelectorAll('.diss-directory-item__name,.diss-directory-item__action,.diss-directory-progress,.diss-directory-item__state')).map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),clipped:n.scrollWidth>n.clientWidth+1}))}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1); for(const n of metrics.rows) {expect(n.height).toBeGreaterThanOrEqual(47.9);expect(n.clipped).toBe(false);}
  for(const n of metrics.text) {expect(n.font,n.text||'').toBeGreaterThanOrEqual(large?15.9:13.9);expect(n.clipped).toBe(false);}
  await writeFile(`${out}/${name}-metrics.json`,JSON.stringify(metrics,null,2));
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const audit=await page.evaluate(async()=>(window as any).axe.run({include:[['[data-dissection-directory]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  await writeFile(`${out}/${name}-axe.json`,JSON.stringify(audit,null,2));expect(audit.violations).toEqual([]);
  if(width===320||large||forced){await row(page,'nictitating').scrollIntoViewIfNeeded();await expect(row(page,'nictitating').locator('.diss-directory-item__action')).toBeInViewport();await directory.screenshot({path:`${out}/${name}-actions-end.png`,style:'.diss-next-action {position:static!important;}'});}
  await row(page,'ventral_skin').focus();await page.keyboard.press('Enter');await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});await back(page);expect(await evidence(page)).toEqual(before);expect(errors).toEqual([]);
});

for (const both of [false,true]) test(`row activation focuses ${both?'the record with both fields missing':'the missing note'} and keeps its query`,async({page})=>{
  await mount(page,{...saved,organSearch:'ventral',directoryFilter:'needs-record',organNotes:{'frog|ventral_skin':'   '},organConfidence:{'frog|ventral_skin':both?0:2}});
  const before=await evidence(page);await row(page,'ventral_skin').click();await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});await back(page);await expect(page.locator('#diss-organ-search')).toHaveValue('ventral');
  await expect(page.locator('[data-directory-filter="needs-record"]')).toHaveAttribute('aria-pressed','true');expect(await evidence(page)).toEqual(before);
});

for(const completedAt of [0,200]) test(`saved record review preserves completion ${completedAt} without awarding an inspection`,async({page})=>{
  await mount(page,{...saved,scenarioCompletedAt:completedAt});const before=await evidence(page);await time(page,9000);
  await row(page,'tympanum').click();await expect(page.locator('#diss-selection-title')).toBeFocused();expect(await evidence(page)).toEqual({...before,selected:'tympanum'});
});

test('next-structure navigation to an inspected neighbor preserves navigation focus and completion',async({page})=>{
  await mount(page,{...saved,selectedOrgan:'ventral_skin'});const before=await evidence(page),next=page.getByRole('button',{name:'Next structure',exact:true});
  await next.focus();await page.keyboard.press('Enter');await expect(next).toBeFocused();expect(await evidence(page)).toEqual({...before,selected:'tympanum'});
});

for(const hidden of [false,true]) test(`an inspected guided target ${hidden?'stays in hidden record review':'still opens its visible evidence checkpoint'}`,async({page})=>{
  await mount(page,{...saved,anatomicalView:hidden?'dorsal':'ventral',guidedMode:true,guidedStep:0,guidedTargetIds:['ventral_skin','tympanum']});const before=await evidence(page);
  await expect(row(page,'ventral_skin')).toHaveAttribute('data-directory-action',hidden?'record':'guided');await row(page,'ventral_skin').click();const after=await evidence(page);
  expect(after.guided.slice(0,3)).toEqual(before.guided.slice(0,3));expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.explored).toEqual(before.explored);
  expect(after.verified).toEqual(before.verified);expect(after.scores).toEqual(before.scores);expect(after.scenario).toEqual(before.scenario);expect(after.procedures).toEqual(before.procedures);
  if(hidden){await expect(page.locator('#diss-guided-observation-check')).toHaveCount(0);await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();}
  else{await expect(page.locator('#diss-guided-observation-check')).toBeVisible();expect(after.guided[3]).toBeTruthy();}
});

test('only current-layer structures reach the threshold and first completion survives further inspection and review',async({page})=>{
  const explored={'frog|heart':true,'frog|liver':true,'frog|unknown_saved_id':true,'sheepEye|cornea':true};
  await mount(page,{...saved,exploredOrgans:explored,organNotes:{},organConfidence:{},scenarioCompletedAt:0});await time(page,1000);await row(page,'ventral_skin').click();
  let state=await evidence(page);expect(state.scenario[2]).toBe(0);expect(state.explored).toEqual({...explored,'frog|ventral_skin':true});
  await back(page);await time(page,2000);await row(page,'tympanum').click();state=await evidence(page);expect(state.scenario[2]).toBe(2000);
  await back(page);await time(page,3000);await row(page,'nictitating').click();expect((await evidence(page)).scenario[2]).toBe(2000);
  await back(page);await time(page,4000);await row(page,'ventral_skin').click();expect((await evidence(page)).scenario[2]).toBe(2000);
});

for(const scenario of ['structure-trace','relationship-pathway']) test(`relationship tracing retains the first ${scenario} completion after its follow-up update`,async({page})=>{
  await mount(page,{...saved,workspaceMode:'advanced',techniquePanelOpen:true,activeLayer:'organs',anatomicalView:'internal',selectedOrgan:'heart',relationshipMode:true,procedureScenario:scenario,scenarioCompletedAt:0,exploredOrgans:{'frog|heart':true},organNotes:{'frog|heart':'Observed a chambered central structure.'},organConfidence:{'frog|heart':2},revealedLayers:{skin:true,muscle:true},procedureByLayer:{organs:complete}},1180);
  const before=await evidence(page);await time(page,5000);const trace=page.getByRole('button',{name:'Trace next exposed connection',exact:true});await expect(trace).toBeEnabled();await trace.click();
  const after=await evidence(page);expect(after.scenario[2]).toBe(5000);expect(after.selected).not.toBe('heart');expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.procedures).toEqual(before.procedures);
  await time(page,6000);await trace.click();expect((await evidence(page)).scenario[2]).toBe(5000);
});

test('a real equivalent probe action keeps its first completion and reports the current-layer checkpoint',async({page})=>{
  const setup={...complete,probed:false,history:order.slice(0,-1),actionLog:complete.actionLog.slice(0,-1)};
  await mount(page,{...saved,workspaceMode:'advanced',activeLayer:'organs',anatomicalView:'ventral',activeInstrument:'probe',techniquePanelOpen:true,scenarioCompletedAt:0,exploredOrgans:{'frog|heart':true},revealedLayers:{skin:true,muscle:true},procedureByLayer:{organs:setup}},1180);
  const before=await evidence(page);await time(page,7000);const action=page.locator('#diss-procedure-panel .diss-procedure__next');await expect(action).toHaveText('Motor-neutral: Trace a visible organ boundary');await expect(action).toBeEnabled();await action.click();
  const after=await evidence(page);expect(after.scenario[2]).toBe(7000);expect(after.procedures.organs.probed).toBe(true);expect(after.procedures.organs.actionLog.length).toBe(before.procedures.organs.actionLog.length+1);
  expect(Object.keys(after.explored).filter(k=>after.explored[k])).toHaveLength(2);expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);
  await expect(page.locator('[role="status"]').filter({hasText:'Scenario checkpoint: 100%.'}).first()).toBeVisible();
});

for(const prior of [false,true]) test(`ordinary canvas pointer ${prior?'review preserves an absent completion':'inspection records first completion once'}`,async({page})=>{
  await mount(page,{...saved,workspaceMode:'advanced',toolbarViewOpen:true,activeInstrument:'probe',visualRealism:'accessible',parallaxDepth:false,canvasZoom:1,canvasPanX:0,canvasPanY:0,labelMode:'hidden',instructorRequiredStructures:1,scenarioCompletedAt:0,exploredOrgans:prior?{'frog|ventral_skin':true}:{},revealedLayers:{},procedureByLayer:{skin:complete}},1180);
  await expect(page.getByRole('button',{name:'Toggle organ name labels',exact:true})).toHaveAttribute('aria-pressed','false');
  const before=await evidence(page),canvas=page.locator('[data-diss-canvas]');await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const c=document.querySelector('[data-diss-canvas]') as any;return c&&!c._cameraTransition;});
  const box=(await canvas.boundingBox())!;await time(page,8000);await page.mouse.click(box.x+box.width*.5,box.y+box.height*.58);
  const after=await evidence(page);expect(after.selected).toBe('ventral_skin');expect(after.explored).toEqual({'frog|ventral_skin':true});expect(after.scenario[2]).toBe(prior?0:8000);
  expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.procedures).toEqual(before.procedures);expect(after.verified).toEqual(before.verified);
  await time(page,9000);await page.mouse.click(box.x+box.width*.5,box.y+box.height*.58);expect((await evidence(page)).scenario[2]).toBe(prior?0:8000);
});

test('keyboard navigation distinguishes recovery from opening an existing record',async({page})=>{
  await mount(page,saved);const before=await evidence(page),search=page.locator('#diss-organ-search');await search.focus();await page.keyboard.press('ArrowDown');
  await expect(row(page,'dorsal_skin')).toBeFocused();await page.keyboard.press('Enter');expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('ArrowDown');await expect(row(page,'ventral_skin')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});
});
