import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_COMPARISON_READINGS_OUTPUT || 'test-results/dissection-comparison-readings';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { toolCalibration: { bladeAngle: 60, scissorsAperture: 70 }, calibrationScores: { dropper: 100 }, tissueState: tissue, inspected: true, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } }, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', completedSteps: 1, score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'scalpel', specimenCondition: 'standard', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: false, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  procedureScenario: 'precision-access', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  organNotes: { 'frog|nictitating': 'Preserved observation.', 'earthworm|dorsal_vessel': 'Other specimen work.' }, organConfidence: { 'frog|nictitating': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'earthworm|dorsal_vessel': true }, completedObjectives: { 'earthworm|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true } },
  soundEnabled: false, sceneDetail: false, _procedureDemo: null, _procedureReplay: null, selectedProcedureActionAt: 100,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 1 },
  inspectionLens: true, lensFocusDepth: 'deep', lensMagnification: 6, lightIntensity: 60,
  procedureByLayer: { skin: procedure, muscle: { ...procedure, inspected: true, errors: 0 } }, attemptArchive: { skin: [savedAttempt] }, compareTechniqueAttempts: true, compareReplayPlaying: false, compareReplayProgress: .4,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
};
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const panel = (page: Page) => page.locator('#diss-attempt-comparison');
const disclosure = (page: Page) => panel(page).locator('details.diss-attempt-comparison__explanation');
const help = (page: Page) => page.locator('#diss-compare-explanation');
const reading = (page: Page, label: string) => panel(page).locator('[data-comparison-reading="'+label+'"]');
const scrub = (page: Page) => page.locator('#diss-compare-replay-progress');

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, view: d.anatomicalView, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], optics: [d.inspectionLens, d.lensFocusDepth, d.lensMagnification, d.lightIntensity, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], playback: [d._procedureDemo, d._procedureReplay, d.compareReplayPlaying],
      preferences: [d.workspaceMode, d.techniquePanelOpen, d.procedureMode, d.showProcedureDebrief, d.soundEnabled, d.sceneDetail, d.reducedMotion, d.largeText, d.highContrast],
      toolbar: [d.toolbarViewOpen, d.toolbarToolsOpen, d.toolbarStudyOpen], feedback: d.procedureFeedback,
    };
  });
}
async function activate(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await page.keyboard.press(key); await page.clock.runFor(160);
}
async function mount(page: Page, seed: any = {}, width = 1440, available = 1180) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap{width:100%!important;max-width:${available}px;}` });
  const epoch = await page.evaluate(() => Date.now());
  await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
}
async function openPanel(page: Page) {
  if (await page.locator('#diss-procedure-panel').getAttribute('open') === null) await activate(page, page.locator('#diss-procedure-summary'));
  await expect(panel(page)).toBeVisible();
}
async function readability(page: Page, large = false) {
  const geometry = await panel(page).evaluate(node => {
    const box = (e: Element) => {const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {left:r.left,right:r.right,width:r.width,height:r.height,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,font:parseFloat(s.fontSize),overflow:s.textOverflow};};
    return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,card:box(node),text:Array.from(node.querySelectorAll('h4,h5,p,span,b,dt,dd,summary,button,label,output')).filter(e=>e.getClientRects().length&&e.textContent?.trim()).map(e=>({text:e.textContent,...box(e)})),controls:Array.from(node.querySelectorAll('summary,button,input')).map(box)};
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport+1);expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth+1);
  for(const item of geometry.text){expect(item.font,item.text||'').toBeGreaterThanOrEqual(large?18:16);expect(item.overflow).not.toBe('ellipsis');if(item.clientWidth)expect(item.scrollWidth,item.text||'').toBeLessThanOrEqual(item.clientWidth+1);expect(item.left).toBeGreaterThanOrEqual(geometry.card.left-1);expect(item.right).toBeLessThanOrEqual(geometry.card.right+1);}
  for(const item of geometry.controls)expect(item.height).toBeGreaterThanOrEqual(47.9);
  return geometry;
}
async function audit(page: Page,name:string){
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});await page.clock.resume();let result:any;
  try{result=await page.evaluate(async()=>(window as any).axe.run({include:[['#diss-attempt-comparison']]}));}finally{const at=await page.evaluate(()=>Date.now());await page.clock.pauseAt(new Date(at+pauseLeadMs));}
  await writeFile(`${out}/${name}-axe.json`,JSON.stringify(result,null,2));expect(result.violations).toEqual([]);expect(result.incomplete).toEqual([]);
}
const variants=[
  {name:'desktop',width:1440,available:1180,key:'Enter'},
  {name:'phone',width:320,available:320,key:'Space'},
  {name:'forced-colors',width:390,available:390,key:'Enter',forced:true,contrast:true},
  {name:'embedded-large-contrast',width:1440,available:320,key:'Space',large:true,contrast:true},
];
for(const variant of variants)test(`comparison readings and keyboard controls remain clear ${variant.name}`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:variant.forced?'active':'none'});await mount(page,{reducedMotion:true,largeText:!!variant.large,highContrast:!!variant.contrast},variant.width,variant.available);await openPanel(page);
  const before=await savedWork(page);await expect(panel(page)).toHaveAccessibleName('Technique attempt comparison');await expect(panel(page).locator('[data-comparison-reading]')).toHaveCount(8);
  await expect(reading(page,'Cautions')).toHaveAttribute('data-tone','unchanged');await expect(reading(page,'Cautions').locator('dd')).toHaveText(['1','1']);await expect(reading(page,'Cautions').locator('b')).toHaveText('No change');
  await expect(reading(page,'Precision').locator('dd')).toHaveText(['75%','No scored stroke yet']);await expect(reading(page,'Precision').locator('b')).toHaveText('Change unavailable');
  for(const label of ['Score','Cautions','Preservation','Observation','Precision','Coverage','Control','Angle control'])await expect(reading(page,label).locator('dt')).toHaveText(['Saved','Current']);
  const closed=await readability(page,!!variant.large);
  if(variant.contrast){const colors=await panel(page).evaluate(e=>({root:getComputedStyle(e).color,label:getComputedStyle(e.querySelector('label')!).color,output:getComputedStyle(e.querySelector('output')!).color}));expect(colors.label).toBe(colors.root);expect(colors.output).toBe(colors.root);}
  await help(page).focus();const focus=await help(page).evaluate(e=>{const s=getComputedStyle(e);return {width:parseFloat(s.outlineWidth),style:s.outlineStyle};});expect(focus.width).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');
  await panel(page).screenshot({path:`${out}/${variant.name}-closed.png`,style:screenshotStyle});await activate(page,help(page),variant.key);await expect(disclosure(page)).toHaveAttribute('open','');await expect(help(page)).toBeFocused();
  await expect(disclosure(page)).toContainText('Fewer cautions is better.');await expect(disclosure(page)).toContainText('percentage points');await expect(disclosure(page)).toContainText('extension when available, otherwise incision');expect(await savedWork(page)).toEqual(before);
  const open=await readability(page,!!variant.large);await panel(page).screenshot({path:`${out}/${variant.name}-open.png`,style:screenshotStyle});await audit(page,variant.name);
  await scrub(page).focus();await page.keyboard.press('Home');await page.clock.runFor(160);expect((await state(page)).compareReplayProgress).toBe(0);await page.keyboard.press('ArrowRight');await page.clock.runFor(160);expect((await state(page)).compareReplayProgress).toBe(.01);await expect(disclosure(page)).toHaveAttribute('open','');
  await page.keyboard.press('End');await page.clock.runFor(160);expect((await state(page)).compareReplayProgress).toBe(1);await expect(panel(page).locator('output')).toHaveText('100% · Full paths');await expect(panel(page).getByRole('button',{name:'Show full comparison paths'})).toBeDisabled();
  const after=await savedWork(page);expect(after).toEqual({...before,comparisonProgress:1});await activate(page,help(page),variant.key);await expect(disclosure(page)).not.toHaveAttribute('open','');
  await writeFile(`${out}/${variant.name}-proof.json`,JSON.stringify({variant,closed,open,focus,before,after},null,2));
});
test('missing saved readings, real zero and live latest strokes keep honest changes',async({page})=>{
  await mount(page,{attemptArchive:{skin:[{id:55,cautions:0,precision:0,coverage:null,control:'',angleControl:'bad'}]}});await openPanel(page);await activate(page,help(page));
  await expect(panel(page)).toContainText('view not recorded');await expect(reading(page,'Score').locator('dd').first()).toHaveText('Not recorded');await expect(reading(page,'Score').locator('b')).toHaveText('Change unavailable');await expect(reading(page,'Cautions').locator('b')).toHaveText('1 more caution');await expect(reading(page,'Cautions')).toHaveAttribute('data-tone','declined');
  const before=await savedWork(page);const update=async(patch:any)=>{await page.evaluate(p=>{const c=(window as any).__ctx,d=c.toolData.dissection;c.updateMulti('dissection',{procedureByLayer:{...d.procedureByLayer,skin:{...d.procedureByLayer.skin,...p}}});},patch);await page.clock.runFor(160);};
  await update({incisionMetrics:{precision:75,coverage:76,control:77,angleControl:78}});await expect(reading(page,'Precision').locator('dd')).toHaveText(['0%','75%']);await expect(reading(page,'Precision').locator('b')).toHaveText('75 percentage points higher');await expect(reading(page,'Coverage').locator('dd')).toHaveText(['Not recorded','76%']);
  await update({extensionMetrics:{precision:95,coverage:96,control:97,angleControl:98}});await expect(reading(page,'Precision').locator('dd').last()).toHaveText('95%');await expect(reading(page,'Angle control').locator('dd').last()).toHaveText('98%');await expect(disclosure(page)).toHaveAttribute('open','');
  expect((await savedWork(page)).attempts).toEqual(before.attempts);await writeFile(out+'/missing-live-proof.json',JSON.stringify({before,after:await savedWork(page)},null,2));
});
test('play and pause comparison preserve recorded work and stop on scrubbing',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await mount(page,{reducedMotion:false});await openPanel(page);const before=await savedWork(page);
  await activate(page,panel(page).getByRole('button',{name:'Play comparison replay'}));await page.clock.runFor(500);expect((await state(page)).compareReplayPlaying).toBe(true);expect((await state(page)).compareReplayProgress).toBeGreaterThan(0);
  await activate(page,panel(page).getByRole('button',{name:'Pause comparison replay'}));const paused=(await state(page)).compareReplayProgress;await page.clock.runFor(500);expect((await state(page)).compareReplayProgress).toBe(paused);
  await activate(page,panel(page).getByRole('button',{name:'Play comparison replay'}));await scrub(page).focus();await page.keyboard.press('Home');await page.clock.runFor(500);expect((await state(page)).compareReplayPlaying).toBe(false);expect((await state(page)).compareReplayProgress).toBe(0);
  const after=await savedWork(page);expect(after.feedback.message).toBe('Comparison replay started. Progress updates stay quiet until playback is paused or complete.');expect(after).toEqual({...before,comparisonProgress:0,feedback:after.feedback});
});
test('print retains comparison readings and explanation',async({page})=>{
  await mount(page);await openPanel(page);await activate(page,help(page));await page.emulateMedia({media:'print'});await expect(panel(page)).toBeVisible();await expect(reading(page,'Score')).toBeVisible();await expect(disclosure(page)).toContainText('whole-attempt readings');await readability(page);
});
