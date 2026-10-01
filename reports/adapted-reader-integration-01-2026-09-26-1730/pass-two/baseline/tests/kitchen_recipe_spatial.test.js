import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
function pan(){let s=R.start('mushroom',2,'demonstrate');for(const a of ['wash','rinse','cut','dry','oil','produce'])s=R.act(s,a);s.pan.moisture=0;s.pan.temp=185;s.pan.heat=2;return s;}
function isolated(x){let s=pan();for(let i=1;i<14;i++)s=R.act(s,'movePiece',i+':-50:0');return R.act(s,'movePiece','0:'+x+':0');}
describe('Individual pan surfaces',()=>{
 it('loads and mirrors the direct-scene runtime',()=>{const html=readFileSync('stem_lab/kitchen_studio/recipe_lab.html','utf8');expect(html.indexOf('src="recipe_lab_scene.js"')).toBeLessThan(html.indexOf('src="recipe_lab.js"'));expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/recipe_lab_scene.js','utf8')).toBe(readFileSync('stem_lab/kitchen_studio/recipe_lab_scene.js','utf8'));});
 it('browns the contacting side and preserves both surfaces when turned',()=>{
  const before=pan(),s=R.act(before,'advance',60);expect(s.pan.pieces[0].faces[0]).toBeGreaterThan(0);expect(s.pan.pieces[0].faces[1]).toBe(0);
  const flipped=R.act(s,'flipPiece',0,'scene-piece');expect(flipped.pan.pieces[0].down).toBe(1);expect(flipped.pan.pieces[0].faces).toEqual(s.pan.pieces[0].faces);expect(R.panSurface(flipped).pieces[0].top).toBe(s.pan.pieces[0].faces[0]);
  const cooked=R.act(flipped,'advance',30);expect(cooked.pan.pieces[0].faces[1]).toBeGreaterThan(0);expect(cooked.pan.pieces[0].faces[0]).toBe(s.pan.pieces[0].faces[0]);expect(before.pan.pieces[0].faces).toEqual([0,0]);
 });
 it('makes the center hotter for an isolated piece',()=>{const center=R.act(isolated(0),'advance',60),edge=R.act(isolated(55),'advance',60);expect(center.pan.pieces[0].faces[0]).toBeGreaterThan(edge.pan.pieces[0].faces[0]);});
 it('reduces contact in a cluster and restores space by spreading',()=>{
  let s=pan();for(let i=0;i<14;i++)s=R.act(s,'movePiece',i+':0:0');const dense=R.panSurface(s),spread=R.act(s,'spreadPan');expect(dense.crowded).toBe(14);expect(R.panSurface(spread).crowded).toBeLessThan(14);
  expect(R.act(spread,'advance',60).pan.brown).toBeGreaterThan(R.act(s,'advance',60).pan.brown);expect(spread.pan.moisture).toBe(s.pan.moisture);
 });
 it('makes stirring reposition and turn pieces without erasing their cooking history',()=>{
  const s=R.act(pan(),'advance',60),before=JSON.stringify(s),mixed=R.act(s,'stirSweep','gesture');expect(mixed.pan.pieces.map(p=>p.down)).not.toEqual(s.pan.pieces.map(p=>p.down));expect(mixed.pan.pieces.map(p=>[p.x,p.z])).not.toEqual(s.pan.pieces.map(p=>[p.x,p.z]));
  expect(mixed.pan.pieces.map(p=>p.faces)).toEqual(s.pan.pieces.map(p=>p.faces));expect(mixed.pan.moisture).toBe(s.pan.moisture);expect(JSON.stringify(s)).toBe(before);
 });
 it('makes scorching persistent after turning, moving, mixing, or adding water',()=>{
  let s=isolated(0);s.pan.temp=270;s.pan.heat=3;for(let i=0;i<8;i++)s=R.act(s,'advance',60);expect(R.panSurface(s).scorched).toBeGreaterThan(0);const damage=s.pan.pieces.map(p=>p.damage.slice());s.pot.reserve=200;
  for(const [a,v]of [['flipPiece',0],['movePiece','0:55:0'],['stirSweep','gesture'],['pour',50]])s=R.act(s,a,v);
  expect(s.pan.pieces.map(p=>p.damage)).toEqual(damage);expect(s.pan.damage).toBeGreaterThanOrEqual(1);
 });
 it('rejects malformed or out-of-pan moves and does not operate on an empty or finished pan',()=>{
  const s=pan();for(const v of [undefined,{},'14:0:0','0:99:99','0:-61:0']){const n=R.act(s,'movePiece',v);expect(n.pan.pieces).toEqual(s.pan.pieces);}
  for(const v of [-1,14,NaN,'0'])expect(R.act(s,'flipPiece',v)).toBe(s);
  expect(R.act(R.start(),'flipPiece',0).log.at(-1).accepted).toBe(false);const ended={...s,plated:true};expect(R.act(ended,'flipPiece',0)).toBe(ended);
 });
 it('requires another final check after rearranging a combined dish',()=>{
  let s=R.startRescue('dry',0);s=R.act(s,'taste');expect(s.pan.tasted).toBe(true);s=R.act(s,'flipPiece',0);expect(s.pan.tasted).toBe(false);expect(R.act(s,'plate').plated).toBe(false);
 });
 it('preserves exact surfaces in restoration, export and replay, independently of returned-frame mutations',()=>{
  let s=R.start('mushroom',2,'demonstrate');for(const [a,v]of cook().steps){s=R.act(s,a,v);if(a==='produce')s=R.act(s,'flipPiece',0,'scene-piece');}s=R.submit({...s,answers:[0,0]});expect(s.submitted).toBe(true);
  expect(R.restore(JSON.parse(JSON.stringify(s)))).toEqual(s);const replay=R.replay(s,s.log.length);expect(replay.state.pan.pieces).toEqual(s.pan.pieces);replay.state.pan.pieces[0].faces[0]=900;expect(s.pan.pieces[0].faces[0]).not.toBe(900);expect(R.evidence(s).panSurface.pieces).toHaveLength(14);
 });
 it('reconstructs old saved attempts with their original whole-pan cooking model',()=>{
  let legacy=R.start('mushroom',2,'demonstrate');legacy.panModel=1;for(const [a,v]of cook().steps)legacy=R.act(legacy,a,v);legacy=R.submit({...legacy,answers:[0,0]});expect(legacy.submitted).toBe(true);
  const raw=JSON.parse(JSON.stringify(legacy));delete raw.panModel;const restored=R.restore(raw);expect(restored.panModel).toBe(1);expect(restored.pan).toEqual(legacy.pan);expect(restored.pot).toEqual(legacy.pot);expect(R.replay(restored,restored.log.length).state.pan).toEqual(legacy.pan);
 });
 it('keeps redistribution independent of clock step size and unrelated log entries',()=>{
  const a=R.act(pan(),'advance',60),b=R.act(R.act(pan(),'advance',30),'advance',30);expect(a.pan.pieces).toEqual(b.pan.pieces);expect(R.act(a,'stirPan').pan.pieces).toEqual(R.act(b,'stirPan').pan.pieces);
 });
});
