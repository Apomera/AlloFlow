import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_SCENARIO_THRESHOLDS_OUTPUT || 'test-results/dissection-scenario-thresholds';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { toolCalibration: { bladeAngle: 60, scissorsAperture: 70 }, calibrationScores: { dropper: 100 }, tissueState: tissue, inspected: true, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } }, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', completedSteps: 1, score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'scalpel', specimenCondition: 'standard', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: false, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  instructorTarget:82,instructorMaxCautions:0,instructorRequiredStructures:5, procedureScenario: 'preservation', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
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
const panel = (page: Page) => page.locator('#diss-scenario-thresholds');
const disclosure = (page: Page) => panel(page);
const help = (page: Page) => page.locator('#diss-scenario-thresholds-summary');

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
      thresholds:[d.instructorTarget,d.instructorMaxCautions,d.instructorRequiredStructures], specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, view: d.anatomicalView, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
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
const target=(page:Page)=>page.locator('#diss-instructor-target');
const cautions=(page:Page)=>page.locator('#diss-instructor-cautions');
const structures=(page:Page)=>page.locator('#diss-instructor-structures');
async function readability(page:Page,large=false){
 const geometry=await panel(page).evaluate(node=>{const box=(e:Element)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {left:r.left,right:r.right,width:r.width,height:r.height,font:parseFloat(s.fontSize),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,overflow:s.textOverflow};};return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,card:box(node),text:Array.from(node.querySelectorAll('h4,p,span,strong,label,select,summary')).filter(e=>e.getClientRects().length&&e.textContent?.trim()).map(e=>({text:e.textContent,...box(e)})),controls:Array.from(node.querySelectorAll('summary,select')).filter(e=>e.getClientRects().length).map(box)};});
 expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport+1);expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth+1);
 for(const item of geometry.text){expect(item.font,item.text||'').toBeGreaterThanOrEqual(large?18:16);expect(item.overflow).not.toBe('ellipsis');if(item.clientWidth)expect(item.scrollWidth,item.text||'').toBeLessThanOrEqual(item.clientWidth+1);expect(item.left).toBeGreaterThanOrEqual(geometry.card.left-1);expect(item.right).toBeLessThanOrEqual(geometry.card.right+1);}
 for(const item of geometry.controls)expect(item.height).toBeGreaterThanOrEqual(47.9);return geometry;
}
async function focusAppearance(control:Locator){await expect(control).toBeFocused();const value=await control.evaluate(e=>({width:parseFloat(getComputedStyle(e).outlineWidth),style:getComputedStyle(e).outlineStyle}));expect(value.width).toBeGreaterThanOrEqual(3);expect(value.style).toBe('solid');return value;}
async function audit(page:Page,name:string){await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});await page.clock.resume();let result:any;try{result=await page.evaluate(async()=>(window as any).axe.run({include:[['#diss-scenario-thresholds']]}));}finally{const at=await page.evaluate(()=>Date.now());await page.clock.pauseAt(new Date(at+pauseLeadMs));}await writeFile(`${out}/${name}-axe.json`,JSON.stringify(result,null,2));expect(result.violations).toEqual([]);expect(result.incomplete).toEqual([]);}
const variants=[{name:'desktop',width:1440,available:1180,key:'Enter'},{name:'phone',width:320,available:320,key:'Space'},{name:'forced-colors',width:390,available:390,key:'Enter',forced:true,contrast:true},{name:'embedded-large-contrast',width:1440,available:320,key:'Space',large:true,contrast:true}];
for(const variant of variants)test(`threshold choices are readable and preserve saved work ${variant.name}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:variant.forced?'active':'none'});await mount(page,{reducedMotion:true,largeText:!!variant.large,highContrast:!!variant.contrast},variant.width,variant.available);await openPanel(page);const before=await savedWork(page);
 await expect(help(page)).toContainText('Target score: 82 · Max cautions: 0 · Required structures: 5');await expect(disclosure(page)).not.toHaveAttribute('open','');const closed=await readability(page,!!variant.large);await help(page).focus();const summaryFocus=await focusAppearance(help(page));await panel(page).screenshot({path:`${out}/${variant.name}-closed.png`,style:screenshotStyle});
 await activate(page,help(page),variant.key);await expect(disclosure(page)).toHaveAttribute('open','');await expect(target(page)).toHaveAccessibleName('Target score');await expect(cautions(page)).toHaveAccessibleName('Maximum cautions');await expect(structures(page)).toHaveAccessibleName('Required structures');
 await expect(target(page)).toHaveValue('82');await expect(target(page).locator('option:checked')).toHaveText('82 / 100');await expect(cautions(page)).toHaveValue('0');await expect(structures(page)).toHaveValue('5');await expect(page.locator('#diss-thresholds-requirements')).toHaveText('Finish all protocol steps with control at least 82%, preservation at least 72%, and no more than 0 cautions.');
 await expect(panel(page).locator('[data-applies="true"]')).toHaveCount(2);await expect(structures(page)).toHaveAccessibleDescription(/verified-identification goal/);
 expect(await savedWork(page)).toEqual(before);await page.keyboard.press('Tab');await expect(target(page)).toBeFocused();const selectFocus=await focusAppearance(target(page));const opened=await readability(page,!!variant.large);await panel(page).screenshot({path:`${out}/${variant.name}-open.png`,style:screenshotStyle});await audit(page,variant.name);
 await target(page).focus();await page.keyboard.press('ArrowDown');await page.clock.runFor(160);await expect(target(page)).toHaveValue('85');await expect(page.locator('#diss-thresholds-requirements')).toContainText('preservation at least 75%');expect(await savedWork(page)).toEqual({...before,thresholds:[85,0,5]});
 await page.keyboard.press('Home');await page.clock.runFor(160);await expect(target(page)).toHaveValue('60');await expect(page.locator('#diss-thresholds-requirements')).toContainText('preservation at least 65%');await page.keyboard.press('End');await page.clock.runFor(160);await expect(target(page)).toHaveValue('95');
 await page.keyboard.press('Tab');await expect(cautions(page)).toBeFocused();await page.keyboard.press('End');await page.clock.runFor(160);await expect(cautions(page)).toHaveValue('2');await page.keyboard.press('Tab');await expect(structures(page)).toBeFocused();await page.keyboard.press('Home');await page.clock.runFor(160);await expect(structures(page)).toHaveValue('1');
 await expect(disclosure(page)).toHaveAttribute('open','');const after=await savedWork(page);expect(after).toEqual({...before,thresholds:[95,2,1]});await activate(page,help(page),variant.key);await expect(disclosure(page)).not.toHaveAttribute('open','');await expect(help(page)).toContainText('Target score: 95 · Max cautions: 2 · Required structures: 1');
 await writeFile(`${out}/${variant.name}-proof.json`,JSON.stringify({variant,closed,opened,summaryFocus,selectFocus,before,after},null,2));
});
test('challenge mapping updates without resetting thresholds or evidence',async({page})=>{
 await mount(page);await openPanel(page);await activate(page,help(page));const before=await savedWork(page);
 for(const [id,applies,description]of [['precision-access',['instructorTarget'],'technique score of at least 82/100'],['structure-trace',['instructorRequiredStructures'],'5 exposed structures'],['orientation-rescue',[],'uses its own completion rules'],['obscured-field',[],'uses its own completion rules'],['relationship-pathway',[],'uses its own completion rules'],['restricted-tray',[],'uses its own completion rules'],['timed-practical',[],'uses its own completion rules']] as const){
  await page.evaluate(s=>(window as any).__ctx.updateMulti('dissection',{procedureScenario:s}),id);await page.clock.runFor(160);await expect(disclosure(page)).toHaveAttribute('open','');expect(await panel(page).locator('[data-applies="true"]').evaluateAll(elements=>elements.map(e=>e.getAttribute('data-threshold')))).toEqual(applies);await expect(page.locator('#diss-thresholds-requirements')).toContainText(description);
  expect(await savedWork(page)).toEqual({...before,scenario:[id,...before.scenario.slice(1)]});
 }
});
test('opening imported nonpreset settings and returning focus never rewrites them',async({page})=>{
 await mount(page,{instructorTarget:82.5,instructorMaxCautions:0,instructorRequiredStructures:2.5});await openPanel(page);const before=await savedWork(page);await activate(page,help(page));await expect(target(page)).toHaveValue('82.5');await expect(structures(page)).toHaveValue('2.5');await target(page).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(target(page)).toBeFocused();await activate(page,help(page));expect(await savedWork(page)).toEqual(before);
});
test('essentials hides advanced thresholds and print keeps the opened criteria readable',async({page})=>{
 await mount(page,{workspaceMode:'essentials'});if(await page.locator('#diss-procedure-panel').getAttribute('open')===null)await activate(page,page.locator('#diss-procedure-summary'));await expect(panel(page)).toBeHidden();await page.evaluate(()=>(window as any).__ctx.updateMulti('dissection',{workspaceMode:'advanced'}));await page.clock.runFor(160);await expect(panel(page)).toBeVisible();await activate(page,help(page));await page.emulateMedia({media:'print'});await expect(target(page)).toBeVisible();await readability(page);
});
