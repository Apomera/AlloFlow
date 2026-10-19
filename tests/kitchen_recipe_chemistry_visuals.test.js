import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),V=require('../stem_lab/kitchen_studio/recipe_lab_cooking.js');
let replay;
afterEach(()=>{if(replay)replay.dispose();replay=null;document.body.replaceChildren();vi.restoreAllMocks();});
describe('Sauce chemistry observations',()=>{
 it('loads chemistry before the recipe engine and includes the same model in the desktop package',()=>{
  const html=readFileSync('stem_lab/kitchen_studio/recipe_lab.html','utf8');
  expect(html.indexOf('src="recipe_lab_sauce_chemistry.js"')).toBeGreaterThan(-1);
  expect(html.indexOf('src="recipe_lab_sauce_chemistry.js"')).toBeLessThan(html.indexOf('src="recipe_lab_engine.js"'));
  expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js','utf8')).toBe(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js','utf8'));
 });
 it('distinguishes separate oil from a watery sauce in pan and spoon observations',()=>{
  const separated=R.act(R.startRescue('separated',2,'demonstrate'),'taste'),watery=R.act(R.startRescue('watery',1,'demonstrate'),'taste');
  expect(V.describe(separated).pan.oilDroplets).toBe(true);expect(V.describe(watery).pan.oilDroplets).toBe(false);
  expect(S.cues(S.reading(separated))).toMatchObject({oilDroplets:true,thin:false,patches:false});
  expect(S.reading(separated).closureSeconds).toBeGreaterThan(1);expect(V.describe(separated).pan.bodyType).toBe('coating');
  const legacyStart=R.startRescue('separated',2,'demonstrate');delete legacyStart.sauceObservationModel;const legacy=R.act(legacyStart,'taste');
  expect(S.cues(S.reading(legacy))).toMatchObject({oilDroplets:true,thin:true,patches:false});expect(S.reading(legacy).closureSeconds).toBe(.5);expect(V.describe(legacy).pan).not.toHaveProperty('bodyType');
  expect(S.cues(S.reading(separated)).separation).toContain('oil');
  expect(S.cues(S.reading(watery)).separation).toContain('No distinct oil');
 });
 it('does not describe an unmixed splash as an even coating based on composition alone',()=>{
  const s=R.act(R.act(R.startRescue('dry',0),'pour',50),'taste'),r=S.reading(s);
  expect(r.type).toBe('unmixed');expect(S.cues({...r,flowText:'Even',coatingText:'An even layer stays'}).coating).toBe('Thicker patches and separate liquid remain on the spoon.');
  expect(V.describe(s).pan.type).toBe('unmixed');
 });
 it('shows an actual sauce that tightens while separated as heavy patches with oil beads',()=>{
  const s=R.act(R.act(R.startRescue('separated',2),'advance',60),'taste'),before=JSON.stringify(s),reading=S.reading(s);
  expect(reading.bodyType).toBe('thick');expect(reading.closureSeconds).toBe(4);expect(S.cues(reading)).toMatchObject({thin:false,patches:true,oilDroplets:true});
  expect(V.describe(s).pan).toMatchObject({bodyType:'thick',oilDroplets:true});expect(JSON.stringify(s)).toBe(before);
 });
 it('shows thin flow and separate oil together when a watery sauce has poor dispersion',()=>{
  let s=R.startRescue('watery',1);s.pan.chemistry.dispersion=.08;s=R.act(s,'taste');
  const reading=S.reading(s);expect(reading.type).toBe('watery');expect(reading.chemistry.oilDroplets).toBe(true);
  expect(S.cues(reading)).toMatchObject({thin:true,oilDroplets:true});expect(V.describe(s).pan.oilDroplets).toBe(true);
  document.body.innerHTML='<div id="host"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;
  window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));
  replay=window.KitchenSauceReplay.mount({container:document.getElementById('host')});replay.render(s,false,true);
  expect(document.querySelector('#sauceReplayCurrent .sauce-replay-drip')).not.toBeNull();
  expect(document.querySelector('#sauceReplayCurrent .sauce-replay-oil-droplets')).not.toBeNull();
  s.pan.damage=1;s=R.act(s,'taste');replay.render(s,false,true);
  expect(S.cues(S.reading(s))).toMatchObject({scorched:true,thin:true,oilDroplets:true});expect(V.describe(s).pan).toMatchObject({scorched:true,bodyType:'watery',oilDroplets:true});
  expect(document.querySelector('#sauceReplayCurrent .sauce-replay-oil-droplets')).not.toBeNull();
 });
 it('keeps recorded oil droplets in the observation replay until a fresh check records the rescue',()=>{
  document.body.innerHTML='<div id="host"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;
  window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));
  replay=window.KitchenSauceReplay.mount({container:document.getElementById('host')});
  let s=R.act(R.startRescue('separated',2),'taste');replay.render(s,false,true);
  expect(document.querySelector('#sauceReplayCurrent .sauce-replay-oil-droplets')).not.toBeNull();
  s=R.act(R.act(R.act(s,'panHeat',0),'advance',60),'stirSweep','button');replay.render(s,false,true);
  expect(S.reading(s).stale).toBe(true);expect(document.querySelector('#sauceReplayCurrent .sauce-replay-oil-droplets')).not.toBeNull();
  s=R.act(s,'taste');const before=JSON.stringify(s);replay.render(s,false,true);
  expect(document.querySelector('#sauceReplayPrevious .sauce-replay-oil-droplets')).not.toBeNull();
  expect(document.querySelector('#sauceReplayCurrent .sauce-replay-oil-droplets')).toBeNull();
  expect(document.getElementById('sauceReplayCurrent').textContent).not.toMatch(/starchPercent|dispersion|coating: true/);
  expect(JSON.stringify(s)).toBe(before);
 });
});
