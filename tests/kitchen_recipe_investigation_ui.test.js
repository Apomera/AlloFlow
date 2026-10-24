// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),B=require('../stem_lab/kitchen_studio/recipe_lab_investigation_model.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_investigation.js','utf8'),key='alloflow-kitchen-sauce-science-v1',$=id=>document.getElementById(id);
let ui,bench,media,mediaChange,frames,nextFrame;
function mount(){ui=window.KitchenSauceInvestigationUI.mount({container:$('testHost'),bench});}
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function run(prediction='plain'){choose('benchPrediction',prediction);$('benchPlan').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
function stage(value){choose('benchStage',value);}
function tick(time){const [id,callback]=frames.entries().next().value;frames.delete(id);callback(time);}
function store(){return JSON.parse(localStorage.getItem(key));}
beforeEach(()=>{
 document.body.innerHTML='<div id="testHost"></div>';localStorage.clear();window.KitchenSauceCheck=S;bench={...B,run:vi.fn(config=>B.run(config)),createRecord:vi.fn(config=>B.createRecord(config)),restoreRecord:vi.fn(record=>B.restoreRecord(record))};
 frames=new Map();nextFrame=0;vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.set(++nextFrame,fn);return nextFrame;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));media={matches:false,addEventListener:vi.fn((event,fn)=>{mediaChange=fn;}),removeEventListener:vi.fn()};Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>media});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 window.eval(source);mount();
});
afterEach(()=>{ui?.dispose();vi.useRealTimers();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();delete window.KitchenSauceCheck;});

describe('A new matched sauce investigation uses real engine observations',()=>{
 it('asks for an explicit ungraded prediction before revealing outcomes',()=>{
  expect($('benchResults').hidden).toBe(true);expect($('benchPrediction').value).toBe('');$('benchPlan').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));expect(bench.run).not.toHaveBeenCalled();expect($('benchStatus').textContent).toContain('Choose a prediction first');run('unsure');expect(bench.run).toHaveBeenCalledTimes(1);expect($('benchOriginalPrediction').textContent).toContain('I’m unsure');expect($('benchResults').hidden).toBe(false);
 });
 it('shows default plain-water coating and starch-heavy reduced-water body at equal engine time',()=>{
  run();expect(bench.run).toHaveBeenCalledWith({doseMl:60,folds:2,waitSeconds:0});expect($('benchArm-plain').dataset.readingType).toBe('coating');expect($('benchArm-reduced').dataset.readingType).toBe('thick');expect($('benchArm-plain').dataset.engineTime).toBe('12');expect($('benchArm-reduced').dataset.engineTime).toBe('12');expect($('benchValidity').dataset.valid).toBe('true');expect($('benchValidity').textContent).toContain('Verified');expect($('benchValidity').textContent).not.toContain('Equal · Known starch difference');expect($('benchRunSummary').textContent).toContain('Each fold takes 6');expect($('benchPausePrompt').textContent).toContain('Did the coating last');
  expect($('benchPausePrompt').hidden).toBe(true);
 });
 it('retains actual stage records and shared scales rather than inventing per-arm normalization',()=>{
  run();const result=bench.run.mock.results[0].value,last=result.arms.map(arm=>arm.stages.at(-1).reading.chemistry),before=JSON.stringify(result);expect($('benchStarchChart').dataset.scale).toBe('5.4');const rows=[...$('benchStarchChart').querySelectorAll('.bench-chart-row')];expect(rows.map(row=>Number(row.dataset.value))).toEqual(last.map(c=>c.starchG));expect(parseFloat(rows[0].querySelector('.bench-chart-fill').style.width)).toBeCloseTo(3/5.4*100);expect(parseFloat(rows[1].querySelector('.bench-chart-fill').style.width)).toBe(100);expect($('benchConcentrationChart').textContent).toContain('g per 100 mL free water');stage('baseline');expect($('benchArm-plain').dataset.engineTime).toBe('0');expect($('benchArm-plain').dataset.readingType).toBe('thick');expect(JSON.stringify(result)).toBe(before);expect(bench.run).toHaveBeenCalledTimes(1);
 });
 it('keeps one starch-mass scale across all recorded stages so unchanged mass keeps its width',()=>{
  run();stage('baseline');const row=()=>document.querySelector('#benchStarchChart [data-arm-id=plain]'),width=row().querySelector('.bench-chart-fill').style.width;expect($('benchStarchChart').dataset.scale).toBe('5.4');expect(row().dataset.value).toBe('3');expect($('benchStarchChart').textContent).toContain('Shared scale across this run');stage('poured');expect(row().dataset.value).toBe('3');expect(row().querySelector('.bench-chart-fill').style.width).toBe(width);expect($('benchStarchChart').dataset.scale).toBe('5.4');
 });
 it('makes falling concentration visibly shorter rather than renormalizing the larger sauce to full width',()=>{
  run();stage('baseline');const width=()=>parseFloat(document.querySelector('#benchConcentrationChart [data-arm-id=reduced] .bench-chart-fill').style.width),scale=$('benchConcentrationChart').dataset.scale,baselineWidth=width();expect(baselineWidth).toBe(100);stage('poured');expect($('benchConcentrationChart').dataset.scale).toBe(scale);expect(width()).toBeLessThan(baselineWidth);expect(width()).toBeLessThan(100);stage('fold-2');expect($('benchConcentrationChart').dataset.scale).toBe(scale);expect(width()).toBeLessThan(100);
 });
 it('exposes pooled-liquid stages and a later heavy sauce after a long pause',()=>{
  choose('benchWait',120);run();expect([...$('benchStage').options].map(option=>option.value)).toEqual(['baseline','poured','fold-1','fold-2','rested']);expect($('benchArm-plain').dataset.readingType).toBe('thick');expect($('benchArm-plain').dataset.engineTime).toBe('132');stage('poured');expect($('benchPooling').hidden).toBe(false);expect($('benchArm-plain').dataset.readingType).toBe('unmixed');expect($('benchPooling').textContent).toContain('bulk average');stage('fold-2');expect($('benchArm-plain').dataset.readingType).toBe('coating');
  expect($('benchPausePrompt').hidden).toBe(false);
 });
 it('does not let waiting substitute for folding',()=>{
  choose('benchFolds',0);choose('benchWait',120);run();expect($('benchArm-plain').dataset.readingType).toBe('unmixed');expect($('benchArm-reduced').dataset.readingType).toBe('unmixed');expect($('benchPooling').hidden).toBe(false);expect([...$('benchStage').options].map(option=>option.value)).toEqual(['baseline','poured','rested']);
 });
 it('replays two trails on one UI-only clock and supports pausing and manual scrubbing',()=>{
  run();const result=bench.run.mock.results[0].value,before=JSON.stringify(result);$('benchTrailPlay').click();expect($('benchTrailPlay').getAttribute('aria-pressed')).toBe('true');tick(0);tick(250);expect($('benchTrailElapsed').textContent).toBe('0.25 s');$('benchTrailPlay').click();expect(frames.size).toBe(0);$('benchTrailTime').value='1';$('benchTrailTime').dispatchEvent(new Event('input',{bubbles:true}));expect($('benchTrailElapsed').textContent).toBe('1.00 s');expect([...document.querySelectorAll('.bench-sauce-art')].every(svg=>Number(svg.dataset.trailFraction)<=1)).toBe(true);expect(JSON.stringify(result)).toBe(before);expect(bench.run).toHaveBeenCalledTimes(1);$('benchTrailReset').click();expect($('benchTrailElapsed').textContent).toBe('0.00 s');
 });
 it('stops playback when reduced motion changes and retains keyboard/manual observation',()=>{
  run();$('benchTrailPlay').click();tick(0);media.matches=true;mediaChange();expect(frames.size).toBe(0);expect($('benchTrailPlay').disabled).toBe(true);expect($('benchTrailHelp').textContent).toContain('Reduced motion');$('benchTrailTime').value='.5';$('benchTrailTime').dispatchEvent(new Event('input',{bubbles:true}));expect($('benchTrailElapsed').textContent).toBe('0.50 s');media.matches=false;mediaChange();expect(frames.size).toBe(0);expect($('benchTrailPlay').disabled).toBe(false);
 });
 it('keeps displayed results and original prediction when a new plan is edited',()=>{
  run();const chart=$('benchConcentrationChart').outerHTML;choose('benchDose',100);choose('benchPrediction','reduced');expect($('benchRunStale').hidden).toBe(false);expect($('benchConcentrationChart').outerHTML).toBe(chart);expect($('benchOriginalPrediction').textContent).toContain('plain water');$('benchReflection').value='The source carried different starch.';$('benchSaveReflection').click();expect(store().items[0].record.configuration.doseMl).toBe(60);expect(store().items[0].record.prediction).toBe('plain');expect(store().items[0].record.reflection).toContain('different starch');expect(bench.run).toHaveBeenCalledTimes(1);
 });
 it('withholds unverified paired results and unknown concentration bars',()=>{
  bench.run.mockImplementationOnce(config=>{const result=B.run(config);result.validity.checks[0].equal=false;return result;});run();expect($('benchValidity').dataset.valid).toBe('false');expect($('benchObservation').hidden).toBe(true);
  bench.run.mockImplementationOnce(config=>{const result=B.run(config);result.arms[0].stages.at(-1).reading.chemistry.waterMl=0;return result;});run();expect($('benchConcentrationChart').textContent).toContain('No proportional bars');expect($('benchConcentrationChart').querySelector('.bench-chart-track')).toBeNull();expect($('benchArm-plain').textContent).toContain('Not recorded');
 });
});

describe('Investigation plans have isolated, bounded persistence and explicit export',()=>{
 it('stores up to eight versioned plans while ordinary recipe storage stays untouched',()=>{
  localStorage.setItem('alloflow-kitchen-recipes-v1','ordinary recipe sentinel');for(let n=0;n<9;n++){choose('benchDose',(n+1)*10);run();}expect(store().version).toBe(1);expect(store().items).toHaveLength(8);expect($('benchHistory').children).toHaveLength(8);expect(store().items[0].record.configuration.doseMl).toBe(90);expect(store().items.at(-1).record.configuration.doseMl).toBe(20);expect(localStorage.getItem('alloflow-kitchen-recipes-v1')).toBe('ordinary recipe sentinel');expect(Object.keys(store().items[0].record)).not.toContain('arms');
 });
 it('restores saved plans through the helper and regenerates matching outcomes',()=>{
  run();$('benchReflection').value='Two folds changed the coating.';$('benchSaveReflection').click();const chart=$('benchConcentrationChart').outerHTML;ui.dispose();mount();expect($('benchResults').hidden).toBe(true);expect($('benchHistory').children).toHaveLength(1);$('benchHistory').querySelector('button').click();expect(bench.restoreRecord).toHaveBeenCalled();expect($('benchReflection').value).toBe('Two folds changed the coating.');expect($('benchConcentrationChart').outerHTML).toBe(chart);expect($('benchStatus').textContent).toContain('regenerated');
 });
 it('skips unsupported records with a visible notice while retaining valid plans',()=>{
  const valid=B.createRecord({doseMl:60,folds:2,waitSeconds:0,prediction:'plain',reflection:''});ui.dispose();localStorage.setItem(key,JSON.stringify({version:1,items:[{id:'future',record:{...valid,protocol:99}},{id:'valid',record:valid}]}));mount();expect($('benchHistory').children).toHaveLength(1);expect($('benchStatus').textContent).toContain('unavailable and was skipped');$('benchHistory').querySelector('button').click();expect($('benchArm-plain').dataset.readingType).toBe('coating');
 });
 it('explains an unsupported notebook format without treating it as a valid blank record',()=>{
  ui.dispose();localStorage.setItem(key,JSON.stringify({version:99,items:[]}));mount();expect($('benchHistory').children).toHaveLength(0);expect($('benchStatus').textContent).toContain('unavailable format');expect($('benchResults').hidden).toBe(true);
 });
 it('keeps the current run usable when storage is unavailable',()=>{
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Storage denied');});run();expect($('benchArm-plain').dataset.readingType).toBe('coating');expect($('benchStatus').textContent).toContain('Saving on this device is unavailable');$('benchReflection').value='Saved for this visit.';$('benchSaveReflection').click();expect($('benchStatus').textContent).toContain('kept for this visit');
 });
 it('catches invalid long explanations without overwriting the saved record',()=>{
  run();const saved=localStorage.getItem(key);$('benchReflection').value='x'.repeat(2001);expect(()=>$('benchSaveReflection').click()).not.toThrow();expect(localStorage.getItem(key)).toBe(saved);expect($('benchStatus').textContent).toContain('within 2,000 characters');
 });
 it('exports the displayed plan and locked prediction only after an explicit button click',()=>{
  let blob,download;Object.defineProperty(window.URL,'createObjectURL',{configurable:true,value:vi.fn(value=>{blob=value;return 'blob:test-bench';})});Object.defineProperty(window.URL,'revokeObjectURL',{configurable:true,value:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){download=this.download;});run('same');expect(window.URL.createObjectURL).not.toHaveBeenCalled();choose('benchDose',100);choose('benchPrediction','reduced');$('benchReflection').value='Both ratios changed.';$('benchExport').click();expect(download).toBe('sauce-science-comparison.json');expect(blob.type).toBe('application/json');const exported=bench.createRecord.mock.calls.at(-1)[0];expect(exported.doseMl).toBe(60);expect(exported.prediction).toBe('same');expect(exported.reflection).toBe('Both ratios changed.');expect($('benchStatus').textContent).toContain('Download requested');
 });
 it('keeps the exported blob URL alive long enough for a browser to start the download',()=>{
  Object.defineProperty(window.URL,'createObjectURL',{configurable:true,value:vi.fn(()=>'blob:test-lifetime')});Object.defineProperty(window.URL,'revokeObjectURL',{configurable:true,value:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});run();vi.useFakeTimers();$('benchExport').click();vi.advanceTimersByTime(999);expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-lifetime');
 });
 it('reveals selectable canonical JSON from the displayed plan, excluding draft settings and outcome states',()=>{
  run('same');const before=JSON.stringify(bench.run.mock.results[0].value);choose('benchDose',100);choose('benchPrediction','reduced');$('benchReflection').value='I compared both trails.';$('benchViewJSON').click();const payload=JSON.parse($('benchJSONText').value);expect(payload).toEqual(B.createRecord({doseMl:60,folds:2,waitSeconds:0,prediction:'same',reflection:'I compared both trails.'}));expect(Object.keys(payload).sort()).toEqual(['activity','configuration','prediction','protocol','reflection']);expect($('benchJSONPanel').hidden).toBe(false);expect($('benchJSONPanel').open).toBe(true);expect($('benchViewJSON').getAttribute('aria-expanded')).toBe('true');expect($('benchJSONText').readOnly).toBe(true);$('benchSelectJSON').click();expect(document.activeElement).toBe($('benchJSONText'));expect($('benchJSONText').selectionStart).toBe(0);expect($('benchJSONText').selectionEnd).toBe($('benchJSONText').value.length);expect($('benchJSONHelp').textContent).toContain('Ctrl+C or Command+C');expect(JSON.stringify(bench.run.mock.results[0].value)).toBe(before);expect(bench.run).toHaveBeenCalledTimes(1);
 });
 it('keeps JSON portability available if a browser cannot create a download URL',()=>{
  Object.defineProperty(window.URL,'createObjectURL',{configurable:true,value:vi.fn(()=>{throw new Error('Downloads unavailable');})});run();$('benchExport').click();expect($('benchStatus').textContent).toContain('Use View JSON');$('benchViewJSON').click();expect(B.restoreRecord(JSON.parse($('benchJSONText').value))).not.toBeNull();expect($('benchJSONPanel').hidden).toBe(false);
 });
 it('refreshes visible JSON after saving an explanation and clears it for a newly recorded run',()=>{
  run();$('benchViewJSON').click();$('benchReflection').value='A revised explanation.';$('benchSaveReflection').click();expect(JSON.parse($('benchJSONText').value).reflection).toBe('A revised explanation.');choose('benchDose',80);run();expect($('benchJSONPanel').hidden).toBe(true);expect($('benchJSONText').value).toBe('');expect($('benchViewJSON').getAttribute('aria-expanded')).toBe('false');
 });
 it('exposes labelled charts and responsive high-contrast patterns, and mirrors the UI files',()=>{
  run();for(const id of ['benchConcentrationChart','benchStarchChart']){expect($($(id).getAttribute('aria-labelledby'))).not.toBeNull();expect($(id).querySelectorAll('.bench-chart-track[aria-hidden=true]')).toHaveLength(2);expect($(id).querySelectorAll('.bench-chart-row>p')).toHaveLength(2);}const css=readFileSync('stem_lab/kitchen_studio/recipe_lab_investigation.css','utf8');expect(css).toContain('.bench-chart-fill,.bench-sauce-art{forced-color-adjust:none}');expect(css).toContain('repeating-linear-gradient(135deg');expect(css).toContain('@media(max-width:700px)');expect(css).toContain('.investigation-page header>p:first-child,.investigation-page header>p:last-child,.investigation-page header .investigation-eyebrow{background:Canvas;color:CanvasText}');for(const file of ['recipe_lab_investigation.js','recipe_lab_investigation.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 });
});
