import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('life_skills_outing/life_skills_outing.html', 'utf8');
const scripts = ['engine.js', 'ai.js', 'outing.js'].map(name => readFileSync('life_skills_outing/' + name, 'utf8'));
const windows = [];
const activeKey = 'alloflow-life-outing-active:v1';
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

function mount({ saved = [], provider, noScene = false, noStorage = false } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost:3000/life_skills_outing/life_skills_outing.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; windows.push(w);
  if (noStorage) Object.defineProperty(w, 'localStorage', { get() { throw Error('Storage blocked'); } });
  else for (const [key, value] of saved) w.localStorage.setItem(key, value);
  // Rendering is verified in real Chromium. These stubs leave real DOM event handlers intact.
  if (!noScene) w.AFRAME = {};
  w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, fillText() {}, measureText: text => ({ width: text.length * 20 }) });
  w.eval(scripts[0]); w.eval(scripts[1]);
  if (provider) w.AlloOutingAI = { createClient: () => ({ available: () => true, request: provider, destroy() {} }) };
  w.eval(scripts[2]);
  const $ = selector => w.document.querySelector(selector);
  return {
    w, $, E: w.AlloOutingEngine,
    run: () => JSON.parse(w.localStorage.getItem(w.localStorage.getItem(activeKey))),
    save: () => Array.from({ length: w.localStorage.length }, (_, i) => { const k = w.localStorage.key(i); return [k, w.localStorage.getItem(k)]; }),
    station: name => { const b = [...w.document.querySelectorAll('#stationNavigation button')].find(el => el.textContent.includes(name)); if (!b) throw Error(name); b.click(); },
    act: (id, source = 'button') => { const el = $((source === 'scene' ? '#sceneActionButtons ' : '#actionList ') + '[data-action="' + id + '"]'); if (!el || el.disabled) throw Error('Unavailable: ' + id); if (source === 'scene') el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); else { el.focus(); el.click(); } }
  };
}
afterEach(() => { for (const w of windows.splice(0)) { w.dispatchEvent(new w.Event('beforeunload')); w.close(); } });

function complete(h, source = 'button') {
  h.station('Wardrobe'); h.act('wear_ready', source);
  h.station('Kitchen'); h.act('fill_water', source); h.act('pack_water', source);
  h.station('Doorway'); h.act('pack_document', source); h.act('pack_raincoat', source);
  h.station('Travel'); h.act('choose_bus', source); h.act('depart', source);
}

function chooseReview(h, revision) {
  h.$('#reviewChoice').value=String(revision);
  h.$('#reviewChoice').dispatchEvent(new h.w.Event('change'));
}
function addPlan(h,id) {
  h.$('#planAction').value=id;
  h.$('#planForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
}
async function openBackup(h, source) {
  const file=new h.w.File([source], 'practice.json', {type:'application/json'});
  Object.defineProperty(h.$('#restoreFile'),'files',{configurable:true,value:[file]});
  h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
  await vi.waitFor(()=>expect(h.$('#backupStatus').textContent).not.toContain('Opening your practice'),{timeout:4000,interval:10});
}

describe('Life Skills outing interaction', () => {
  it('rehearses an action and prediction, then takes that action only when requested',()=>{
    let calls=0;const h=mount({provider:()=>{calls++;return Promise.resolve({text:'Hello.',status:'generated'});}});
    h.$('#rehearsal').open=true;h.$('#prediction').value='The bottle fills but still needs packing.';
    const saved=h.save();h.$('#previewActionButton').click();
    expect(h.$('#rehearsalPrediction').textContent).toContain('still needs packing');
    expect(h.$('#rehearsalChanges').textContent).toContain('09:0009:01');
    expect(h.$('#clock').textContent).toBe('09:00');
    expect(h.save()).toEqual(saved);
    expect(h.w.document.activeElement.id).toBe('rehearsalTitle');
    expect(calls).toBe(0);
    h.$('#takeRehearsedAction').click();
    expect(h.run().commands.map(command=>command.actionId)).toEqual(['fill_water']);
    expect(h.$('#clock').textContent).toBe('09:01');
    expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
  });
  it('clears a rehearsal after an actual scene action or a station change',()=>{
    const h=mount();h.$('#previewActionButton').click();
    h.act('fill_water','scene');h.$('#takeRehearsedAction').click();
    expect(h.run().commands).toHaveLength(1);
    expect(h.$('#rehearsalStatus').textContent).toContain('outing changed');
    h.$('#previewActionButton').click();expect(h.$('#rehearsalResult').hidden).toBe(false);
    h.station('Wardrobe');expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.$('#prediction').value).toBe('');
    expect(h.$('#rehearsalAction').value).toBe('wear_ready');
  });
  it('uses inert prediction text and sets aside a preview when the prediction is edited',()=>{
    const h=mount();h.$('#prediction').value='<img src=x onerror=alert(1)>';
    h.$('#previewActionButton').click();
    expect(h.$('#rehearsalPrediction').textContent).toContain('<img');
    expect(h.$('#rehearsalResult img')).toBeNull();
    h.$('#prediction').value='A different idea.';h.$('#prediction').dispatchEvent(new h.w.Event('input'));
    expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.run().commands).toHaveLength(0);
  });
  it('supports rehearsal without storage or 3D and hides it after completion',()=>{
    const offline=mount({noStorage:true,noScene:true});offline.$('#previewActionButton').click();
    expect(offline.$('#rehearsalFeedback').textContent).toContain('bottle is filled');
    expect(offline.$('#clock').textContent).toBe('09:00');
    offline.$('#takeRehearsedAction').click();expect(offline.$('#clock').textContent).toBe('09:01');
    const h=mount();complete(h);expect(h.$('#rehearsal').hidden).toBe(true);
  },15000);
  it('checks and reorders a plan, then opens the action without taking it',()=>{
    const h=mount();addPlan(h,'pack_water');addPlan(h,'fill_water');
    expect(h.run().commands).toHaveLength(0);
    expect(h.$('#planCheck').hidden).toBe(true);
    h.$('#checkPlanButton').click();
    expect(h.$('.plan-problem-text').textContent).toContain('Fill the bottle before packing');
    h.$('#planSteps li:nth-child(2) [data-plan-operation="up"]').click();
    expect(h.w.document.activeElement.closest('li').textContent).toContain('Fill the water bottle');
    expect(h.$('.plan-problem-text')).toBeNull();
    h.$('#nextPlanButton').click();
    expect(h.w.document.activeElement.dataset.action).toBe('fill_water');
    expect(h.$('.planned-badge').textContent).toBe('Next in your plan');
    expect(h.run().commands).toHaveLength(0);
    h.act('fill_water','scene');
    expect(h.$('#planSteps li').textContent).toContain('Done at step 1');
    h.$('#followPlanButton').click();
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
    h.$('#planner').open=false;h.$('#editPlanButton').click();
    expect(h.$('#planner').open).toBe(true);
    expect(h.w.document.activeElement).toBe(h.$('#planner summary'));
    expect(h.$('#clock').textContent).toBe('09:01');
  });
  it('updates a checked plan when an actual travel update arrives',()=>{
    const h=mount();h.$('#scenarioSelect').value='bus-delay';h.$('#settingsForm').dispatchEvent(new h.w.Event('submit',{cancelable:true}));
    for(const id of ['fill_water','pack_water','wear_ready','pack_document','pack_raincoat','choose_bus','depart'])addPlan(h,id);
    h.$('#checkPlanButton').click();
    expect(h.$('#planSummary').textContent).toContain('09:30');
    expect(h.$('#planUncertainty').textContent).toContain('may change');
    h.act('fill_water');h.act('pack_water');h.station('Wardrobe');h.act('wear_ready');
    expect(h.$('#planSummary').textContent).toContain('Check 1 planned step');
    expect(h.$('#planSteps').textContent).toContain('route that arrives by 09:35');
    expect(h.$('#planUncertainty').textContent).toContain('latest forecast');
    expect(h.$('#planGuideText').textContent).toContain('1 step to review');
    expect(h.run().commands).toHaveLength(3);
  });
  it('restores a plan and recomputes its progress when a decision is retried',()=>{
    const h=mount();addPlan(h,'wear_ready');h.$('#checkPlanButton').click();h.station('Wardrobe');h.act('wear_ready');
    addPlan(h,'fill_water');
    const restored=mount({saved:h.save()});
    expect(restored.$('#planSteps li').textContent).toContain('Done at step 1');
    expect(restored.$('#planner').open).toBe(true);
    chooseReview(restored,1);restored.$('#retryChoiceButton').click();
    expect(restored.$('#planSteps').children).toHaveLength(1);
    expect(restored.$('#planSteps li').textContent).toContain('Next in your plan');
    expect(restored.$('#planSteps').textContent).not.toContain('Done at step 1');
    expect(restored.$('#planCheck').hidden).toBe(false);
  },15000);
  it('keeps a plan in downloaded backups and can open it without local storage',async()=>{
    const h=mount({noStorage:true,noScene:true});addPlan(h,'fill_water');addPlan(h,'pack_water');h.$('#checkPlanButton').click();
    let blob;h.w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};h.w.URL.revokeObjectURL=()=>{};h.w.HTMLAnchorElement.prototype.click=()=>{};
    h.$('#downloadButton').click();
    const source=await new Promise(resolve=>{const reader=new h.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
    expect(h.E.readBackup(source).plan.steps.map(step=>step.actionId)).toEqual(['fill_water','pack_water']);
    const target=mount({noStorage:true,noScene:true});await openBackup(target,source);
    expect(target.$('#planSteps').children).toHaveLength(2);
    target.$('#nextPlanButton').click();target.act('fill_water');
    expect(target.$('#planSteps li').textContent).toContain('Done at step 1');
  },15000);
  it('preserves an unreadable plan and keeps practice available',()=>{
    const h=mount(),key='alloflow-life-outing-plan:v1:'+h.run().runId;
    const restored=mount({saved:[...h.save(),[key,'{broken']]});
    expect(restored.w.localStorage.getItem(key)).toBe('{broken');
    expect(restored.$('#backupStatus').textContent).toContain('saved plan could not be read');
    restored.act('fill_water');
    expect(restored.$('#clock').textContent).toBe('09:01');
  },15000);
  it('does not replace a newly edited plan when a backup finishes reading',()=>{
    const h=mount();let reader;h.w.FileReader=class{constructor(){reader=this;}readAsText(){}};
    Object.defineProperty(h.$('#restoreFile'),'files',{value:[{size:10}]});h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
    addPlan(h,'wear_ready');reader.result=JSON.stringify(h.E.createBackup(h.E.createRun(),''));reader.onload();
    expect(h.$('#planSteps').textContent).toContain('clean, dry outfit');
    expect(h.$('#backupStatus').textContent).toContain('changed while');
  });
  it('revisits any decision, compares completed outcomes and keeps the original on reload', () => {
    const h=mount(); complete(h); const original=h.run();
    h.$('#reviewButton').click();
    expect(h.$('#choiceHistory').open).toBe(true);
    expect(h.w.document.activeElement.id).toBe('reviewChoice');
    expect(h.$('#reviewChoice').value).toBe('6');
    h.$('#reflection').value='Check accessible travel.';h.$('#reflection').dispatchEvent(new h.w.Event('input'));
    chooseReview(h,1);
    expect(h.$('#reviewConsequence').textContent).toContain('This took 2 minutes.');
    h.$('#retryChoiceButton').click();
    expect(h.run().commands).toHaveLength(0);
    expect(h.$('#stationTitle').textContent).toBe('Wardrobe');
    expect(h.w.document.activeElement.id).toBe('stationActions');
    expect(h.$('#comparisonCard').hidden).toBe(false);
    expect(h.$('#reflection').value).toBe('');
    expect(h.$('#outcomeComparison').hidden).toBe(true);
    h.act('prepare_clothes'); h.station('Kitchen'); h.act('fill_water'); h.act('pack_water');
    h.station('Doorway'); h.act('pack_document'); h.act('pack_raincoat');
    h.station('Travel');h.act('choose_ride');h.act('depart');
    expect(h.$('#revisedChoice').textContent).toContain('This took 8 minutes.');
    expect(h.$('#comparisonRows').textContent).toContain('09:3009:27');
    expect(h.$('#outcomeComparison').hidden).toBe(false);
    expect(h.w.document.activeElement.id).toBe('comparisonTitle');
    expect(h.E.readRun(h.w.localStorage,h.E.saveKey(original))).toEqual(original);
    const restored=mount({saved:h.save()});
    expect(restored.$('#comparisonRows').textContent).toBe(h.$('#comparisonRows').textContent);
    restored.$('#savedRuns').value=h.E.saveKey(original);restored.$('#resumeButton').click();
    expect(restored.$('#reflection').value).toBe('Check accessible travel.');
  },15000);
  it('downloads the current reflection and comparison even before the field loses focus', async () => {
    const h=mount(); complete(h);chooseReview(h,6);h.$('#retryChoiceButton').click();
    h.$('#reflection').value='A note still being typed.';
    let blob;h.w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};h.w.URL.revokeObjectURL=()=>{};
    h.w.HTMLAnchorElement.prototype.click=()=>{};h.$('#downloadButton').click();
    const source=await new Promise(resolve=>{const reader=new h.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
    const backup=h.E.readBackup(source);
    expect(backup.reflection).toBe('A note still being typed.');
    expect(backup.comparison.revision).toBe(5);
    expect(backup.run.commands).toHaveLength(5);
  });
  it('opens valid backups as new copies with inert reflections and never overwrites an existing save', async () => {
    const h=mount();complete(h);const original=h.run(),key=h.E.saveKey(original);
    const backup=h.E.createBackup(original,'<img src=x onerror=alert(1)>');
    await openBackup(h,JSON.stringify(backup));
    expect(h.run().runId).not.toBe(original.runId);
    expect(h.E.materialize(h.run())).toEqual(h.E.materialize(original));
    expect(h.$('#reflection').value).toBe(backup.reflection);
    expect(h.$('#debrief img')).toBeNull();
    expect(h.E.readRun(h.w.localStorage,key)).toEqual(original);
    expect(h.w.document.activeElement.id).toBe('debriefTitle');
    const before=h.save();await openBackup(h,'{"version":99}');
    expect(h.save()).toEqual(before);
    expect(h.$('#backupStatus').textContent).toContain('unchanged');
  });
  it('restores the original comparison snapshot alongside the new practice', async () => {
    const h=mount();complete(h);const original=h.run();
    const revised=h.E.dispatch(h.E.dispatch(h.E.branchRun(original,5),'choose_ride'),'depart');
    const backup=h.E.createBackup(revised,'Ask about transport.',{original,revision:5});
    await openBackup(h,JSON.stringify(backup));
    expect(h.$('#comparisonRows').textContent).toContain('09:3009:21');
    expect(h.$('#reflection').value).toBe('Ask about transport.');
    expect(h.w.document.activeElement.id).toBe('comparisonTitle');
    const restored=mount({saved:h.save()});
    expect(restored.$('#comparisonRows').textContent).toBe(h.$('#comparisonRows').textContent);
    expect(h.E.readRun(h.w.localStorage,h.E.saveKey(original))).toEqual(original);
  });
  it('ignores a backup that finishes opening after a learner makes another choice', () => {
    const h=mount();let reader;
    h.w.FileReader=class {constructor(){reader=this;}readAsText(){}};
    Object.defineProperty(h.$('#restoreFile'),'files',{value:[{size:10}]});
    h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
    h.act('fill_water');const before=h.run();
    reader.result=JSON.stringify(h.E.createBackup(h.E.createRun(),''));reader.onload();
    expect(h.run()).toEqual(before);
    expect(h.$('#backupStatus').textContent).toContain('changed while');
  });
  it('retries and opens a backup with storage blocked and without 3D', async () => {
    const h=mount({noStorage:true,noScene:true});h.act('fill_water');
    h.$('#retryChoiceButton').click();
    expect(h.$('#clock').textContent).toBe('09:00');
    expect(h.$('#comparisonCard').hidden).toBe(false);
    const run=h.E.dispatch(h.E.createRun(),'wear_ready');
    await openBackup(h,JSON.stringify(run));
    expect(h.$('#clock').textContent).toBe('09:02');
    expect(h.$('#saveStatus').textContent).toContain('unavailable');
    expect(h.$('#downloadButton').hidden).toBe(false);
  });
  it('inspects the same object through 3D and keyboard controls without changing the journal', () => {
    const scene = mount(), controls = mount();
    scene.$('#bottleObject').dispatchEvent(new scene.w.MouseEvent('click', {bubbles:true}));
    controls.$('[data-inspect="bottle"]').click();
    expect(scene.$('#objectTitle').textContent).toBe('Water bottle');
    expect(scene.$('#objectStatus').textContent).toBe(controls.$('#objectStatus').textContent);
    expect(scene.run().commands).toHaveLength(0);
    expect(controls.run().commands).toHaveLength(0);
    scene.act('fill_water', 'scene'); controls.act('fill_water');
    expect(scene.E.materialize(scene.run())).toEqual(controls.E.materialize(controls.run()));
    expect(scene.$('#objectStatus').textContent).toContain('Filled');
  }, 15000); // Two complete standalone DOMs can initialize slowly on Windows.
  it('lets learners inspect a packed item and read the actual recent consequences', () => {
    const h = mount(); h.act('fill_water'); h.act('pack_water');
    h.$('#inventory button').click();
    expect(h.$('#objectTitle').textContent).toBe('Water bottle');
    expect(h.$('#objectStatus').textContent).toBe('Filled and packed');
    expect(h.run().commands).toHaveLength(2);
    expect(h.$('#recentChoices').textContent).toContain('The filled bottle is in your bag.');
    h.$('#focusView').click();
    expect(h.$('#focusView').getAttribute('aria-pressed')).toBe('true');
    expect(h.run().commands).toHaveLength(2);
  });
  it('shows an updated arrival and allows a ride after the selected bus is delayed', () => {
    const h = mount(); h.$('#scenarioSelect').value = 'bus-delay';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', {bubbles:true,cancelable:true}));
    h.$('#travelPreview').click(); h.act('choose_bus');
    expect(h.$('#travelPreview').textContent).toContain('09:30');
    h.station('Kitchen'); h.act('fill_water'); h.act('pack_water');
    h.station('Wardrobe'); h.act('wear_ready');
    expect(h.$('#travelPreview').textContent).toContain('09:45');
    expect(h.$('#travelPreview').classList.contains('route-late')).toBe(true);
    expect(h.$('#eventCard').closest('.world-card')).not.toBeNull();
    h.$('#travelPreview').click(); h.act('choose_ride');
    expect(h.$('#travelPreview').textContent).toContain('Arranged ride');
    expect(h.$('#travelPreview').classList.contains('route-late')).toBe(false);
  });
  it('resumes an older ruleset and starts a separate practice for the new situation', () => {
    const first = mount(), legacy = first.run(); legacy.manifestVersion = 1;
    const key = first.E.saveKey(legacy);
    const h = mount({saved:[[key,JSON.stringify(legacy)],[activeKey,key]]});
    expect(h.run().manifestVersion).toBe(1);
    h.station('Travel'); expect(h.$('#actionList [data-action="choose_ride"]')).toBeNull();
    h.$('#scenarioSelect').value = 'bus-delay';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', {bubbles:true,cancelable:true}));
    expect(h.run().manifestVersion).toBe(2);
    expect(h.run().runId).not.toBe(legacy.runId);
    expect(JSON.parse(h.w.localStorage.getItem(key))).toEqual(legacy);
  });
  it('reaches the same result through the real structured and scene action handlers', () => {
    const buttons = mount(), scene = mount(); complete(buttons); complete(scene, 'scene');
    expect(buttons.E.materialize(buttons.run())).toEqual(scene.E.materialize(scene.run()));
    expect(buttons.$('#debrief').hidden).toBe(false);
    expect(buttons.$('#progressCount').textContent).toBe('6 / 6 ready');
    expect(buttons.w.document.activeElement.id).toBe('debriefTitle');
    expect(scene.$('#bagObject').getAttribute('visible')).toBe('false');
    expect(scene.$('#packedDocument').getAttribute('visible')).toBe('false');
  }, 15000);

  it('keeps keyboard focus on a useful action after the action list changes', () => {
    const h = mount(); h.act('fill_water');
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
    h.act('pack_water');
    expect(h.w.document.activeElement.id).toBe('stationActions');
    h.$('#sceneToggle').click();
    expect(h.$('#sceneContainer').hidden).toBe(true);
    expect(h.run().commands).toHaveLength(2);
  });

  it('restores the exact journal and accepted prose after reload', async () => {
    const h = mount(); h.act('fill_water'); h.$('#introButton').click(); await flush();
    const restored = mount({ saved: h.save() });
    expect(restored.run()).toEqual(h.run());
    expect(restored.$('#storyText').textContent).toBe(h.$('#storyText').textContent);
    expect(restored.$('#clock').textContent).toBe('09:01');
  });

  it('updates the debrief when a story is saved after completion', async () => {
    const h = mount(); complete(h); h.$('#introButton').click(); await flush();
    expect(h.$('#debriefSummary').textContent).toContain('Optional story moments saved: 1.');
    expect(h.run().commands).toHaveLength(7);
  });

  it('replays a different forecast under a new save and can resume the original', () => {
    const h = mount(); complete(h); const original = h.run(), key = h.E.saveKey(original);
    h.$('#replayButton').click();
    expect(h.run().runId).not.toBe(original.runId);
    expect(h.run().config.variation).toBe('warm');
    expect(h.run().commands).toHaveLength(0);
    expect(JSON.parse(h.w.localStorage.getItem(key))).toEqual(original);
    h.$('#savedRuns').value = key; h.$('#resumeButton').click();
    expect(h.run()).toEqual(original);
  });

  it('keeps context, language and coaching independent and leaves access changes out of the journal', () => {
    const h = mount(); h.$('#contextSelect').value = 'work'; h.$('#supportSelect').value = 'independent'; h.$('#languageSelect').value = 'plain';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { bubbles: true, cancelable: true }));
    expect(h.run().config).toMatchObject({ context: 'work', language: 'plain', support: 'independent' });
    expect(h.$('#hintContent').hidden).toBe(true);
    h.$('#sceneToggle').click(); expect(h.run().commands).toHaveLength(0);
    h.$('#hintButton').click(); expect(h.$('#hintContent').hidden).toBe(false);
    expect(h.run().commands[0].actionId).toBe('hint');
  });

  it('discards stale generated prose and stores current prose without changing the world', async () => {
    const calls = []; const h = mount({ provider: (payload, options) => new Promise(resolve => calls.push({ payload, options, resolve })) });
    h.$('#introButton').click(); h.act('fill_water');
    expect(calls[0].options.signal.aborted).toBe(true);
    calls[0].resolve({ text: 'An obsolete introduction.', status: 'generated' }); await flush();
    expect(h.run().content).toHaveLength(0);
    h.$('[data-intent="plan"]').click(); const before = h.E.materialize(h.run());
    calls[1].resolve({ text: 'Sam is looking forward to the outing.', status: 'generated' }); await flush();
    expect(h.run().content).toHaveLength(1);
    expect(h.E.materialize(h.run())).toEqual(before);
    expect(h.$('#storyLabel').textContent).toContain('Generated story');
  });

  it('allows practice with blocked storage or unavailable 3D and preserves corrupt saves', () => {
    const offline = mount({ noScene: true, noStorage: true }); offline.act('fill_water');
    expect(offline.$('#clock').textContent).toBe('09:01');
    expect(offline.$('#sceneUnavailable').hidden).toBe(false);
    expect(offline.$('#downloadButton').hidden).toBe(false);
    const key = 'alloflow-life-outing:v1:broken';
    const recovered = mount({ saved: [[key, '{broken']] });
    expect(recovered.w.localStorage.getItem(key)).toBe('{broken');
    expect(recovered.$('#savedRuns').textContent).toContain('Unreadable saved practice');
  });
});
