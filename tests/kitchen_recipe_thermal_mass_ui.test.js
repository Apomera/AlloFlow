// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const main=readFileSync('stem_lab/kitchen_studio/recipe_lab.js','utf8'),$=id=>document.getElementById(id);
function note(s){const code=main.slice(main.indexOf('function renderHeatModel('),main.indexOf('function chooseZone('));new Function('$',code+'return renderHeatModel;')($)(s);return $('panPowerHelp').textContent;}
const steps=(s,list)=>list.reduce((v,[a,n])=>R.act(v,a,n),s);
function done(model){let s=R.restore({...R.startRescue('cooled',0,'demonstrate'),thermalModel:model});s=steps(s,[['taste'],['panHeat',1],['advance',60],['panHeat',0],['taste'],['plate']]);return R.submit({...s,answers:[1,null]});}
beforeEach(()=>{document.body.innerHTML='<p id="panPowerHelp"></p>';});
afterEach(()=>document.body.replaceChildren());
describe('Thermal mass guidance follows the displayed protocol',()=>{
 it('explains mass and liquid heat exchange without leaking a demonstration result or prescribed setting',()=>{
  const a=R.startRescue('cooled',0,'demonstrate'),b=R.act(a,'pour',100),before=JSON.stringify([a,b]);
  expect(note(a)).toContain('Larger batches and extra water');expect(note(a)).toContain('splash also exchanges heat');expect(note(a)).toBe(note(b));expect(note(a)).not.toMatch(/\b(?:35|60|92|low|medium|high|ready|successful)\b/);expect(JSON.stringify([a,b])).toBe(before);
 });
 it('preserves the complete earlier power note for saved thermal2 cooks',()=>{
  const old=R.restore({...R.startRescue('cooled',0),thermalModel:2});expect(note(old)).toBe('On the burner, higher sauce-pan power warms cool, wet food faster and can remove water faster. Off or on the trivet, stored heat can still cook the food as it cools. Inspect between short clock steps.');
  expect(note(R.restore({...old,thermalModel:1}))).toContain('earlier heat model');
 });
 it('exports model3 and rejects comparisons across its changed physical protocol',()=>{
  const current=done(3),old=done(2),same=R.restore(current),before=JSON.stringify([current,old]);
  expect(R.criteria(current).every(c=>c.met)).toBe(true);expect(R.criteria(old).every(c=>c.met)).toBe(true);
  expect(M.compare(current,same)).toMatchObject({thermalModel:3,a:{thermalModel:3},b:{thermalModel:3}});expect(M.incompatibility(current,old)).toContain('different heat models');expect(M.compare(current,old)).toBeNull();expect(JSON.stringify([current,old])).toBe(before);
 });
 it('uses the recorded historical frame for guidance instead of the latest model',()=>{
  const old=done(2),frame=R.replay(old,old.log.length).state;expect(note(frame)).not.toContain('Larger batches');expect(note(R.replay(done(3),0).state)).toContain('Larger batches');
 });
 it('ships matching protocol-aware guidance and comparisons in both runtimes',()=>{
  for(const file of ['recipe_lab.js','recipe_lab_heat.js','recipe_lab_pot_lab.js','recipe_lab_compare.js'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
 });
});
