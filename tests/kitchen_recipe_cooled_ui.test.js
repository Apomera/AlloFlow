// @vitest-environment jsdom
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),Q=require('../stem_lab/kitchen_studio/recipe_lab_quests.js');
const html=readFileSync('stem_lab/kitchen_studio/recipe_lab.html','utf8'),main=readFileSync('stem_lab/kitchen_studio/recipe_lab.js','utf8');
const $=id=>document.getElementById(id),act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s),start=(mode='practice')=>R.startRescue('cooled',0,mode);
const warmed=(mode='practice')=>act(start(mode),[['taste'],['panHeat',1],['advance',45],['panHeat',0],['taste']]);
const time=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
function summary(state,view=state,historical=false){const body=main.slice(main.indexOf('function renderCoolingChallenge('),main.indexOf('function prepareRescue('));new Function('state','R','$','time','timingEnded',body+'return renderRescue;')(state,R,$,time,()=>false)(view,historical);}
function guidance(state){const body=main.slice(main.indexOf('function guidance(){'),main.indexOf('function chooseZone('));return new Function('state','R',body+'return guidance();')(state,R);}
beforeEach(()=>{document.body.innerHTML=html;});

describe('A cooled sauce challenge compares observations without requiring a pour',()=>{
 it('offers the seventh challenge and its own prediction choices',()=>{
  const options=Array.from($('rescueChoice').options);expect(options.map(o=>o.value)).toEqual(R.rescues.map(r=>r.id));expect(options.at(-1).textContent).toBe('Rescue a sauce that thickened while cooling');
  $('rescueChoice').value='cooled';const setup=main.slice(main.indexOf('function updateRescueSetup(){'),main.indexOf("$('rescueChoice').addEventListener"));new Function('R','$','Option',setup+'updateRescueSetup();')(R,$,window.Option);
  expect($('rescueSetup').textContent).toBe(R.rescueDefinition('cooled').brief);expect(Array.from($('rescuePrediction').options).slice(1).map(o=>o.textContent)).toEqual(R.rescuePredictionsFor('cooled'));
 });
 it('shows a neutral recorded-check panel without inventing a holding interval',()=>{
  let s=start('demonstrate');summary(s);expect($('coolingChallenge').hidden).toBe(false);expect($('holdingChallenge').hidden).toBe(true);expect($('openRescueLiquids').hidden).toBe(true);expect($('rescueTitle').textContent).toBe(R.rescueDefinition('cooled').title);expect($('coolingCheckStatus').textContent).toContain('No spoon check recorded');
  s=warmed('demonstrate');summary(s);expect($('coolingCheckStatus').textContent).toContain('2 spoon checks recorded');expect($('coolingCheckStatus').textContent).toContain('latest check at 0:45');expect($('coolingCheckStatus').textContent).toContain('earlier and later check selectors');expect($('coolingCheckStatus').textContent).not.toMatch(/successful|coating achieved|warming caused|120|2 minutes/);
  summary(R.startRescue('holding',0));expect($('coolingChallenge').hidden).toBe(true);expect($('holdingChallenge').hidden).toBe(false);
 });
 it('keeps the summary anchored to actual checks across unobserved changes and replay',()=>{
  const source=warmed('demonstrate'),changed=R.act(source,'advance',60);summary(changed);const recorded=$('coolingCheckStatus').textContent;expect(recorded).toContain('latest check at 0:45');expect(recorded).toContain('food has changed');
  const other=JSON.parse(JSON.stringify(changed));other.pan.temp=150;other.pan.moisture=2;other.pan.chemistry.dispersion=0;summary(other);expect($('coolingCheckStatus').textContent).toBe(recorded);
  const done=R.submit({...R.act(source,'plate'),answers:[1,null]}),frame=R.replay(done,1).state,before=JSON.stringify(done);summary(done,frame,true);expect($('coolingCheckStatus').textContent).toContain('1 spoon checks recorded');expect($('coolingCheckStatus').textContent).not.toContain('0:45');expect(JSON.stringify(done)).toBe(before);
 });
 it('routes a practice warming experiment through checks and completes without adding liquid',()=>{
  let s=start(),q=Q.describe(s,'sauce');expect(q.count).toBe(0);expect(q.next).toMatchObject({tool:'check',zone:'pan'});expect(q.steps).toHaveLength(2);
  s=R.act(s,'taste');q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.next).toMatchObject({tool:'heat',zone:'pan'});expect(q.try).toContain('gentle warming');
  s=act(s,[['panHeat',1],['advance',45],['panHeat',0]]);expect(Q.describe(s,'sauce').next.tool).toBe('check');s=R.act(s,'taste');const before=JSON.stringify(s);q=Q.describe(s,'sauce');expect(q.complete).toBe(true);expect(q.count).toBe(2);expect(s.pot.reserve).toBe(150);expect(s.log.some(e=>['pour','water','crushTomato'].includes(e.action))).toBe(false);expect(JSON.stringify(s)).toBe(before);
 });
 it('accepts water and released tomato juice as alternative observed adjustments',()=>{
  for(const method of ['water','tomato']){let s=R.act(start(),'taste');if(method==='water')s=R.act(s,'pour',50);else for(let i=0;i<4;i++)s=act(s,[['crushTomato',i],['crushTomato',i]]);expect(Q.describe(s,'sauce').next.tool).toBe('stir');s=R.act(s,'stirSweep','button');for(let folds=0;R.needsMixing(s)&&folds<8;folds++){expect(Q.describe(s,'sauce').next.tool).toBe('stir');s=R.act(s,'stirSweep','button');}expect(R.needsMixing(s)).toBe(false);expect(Q.describe(s,'sauce').next.tool).toBe('check');s=R.act(s,'taste');expect(Q.describe(s,'sauce').complete).toBe(true);}
 });
 it('reopens the comparison after further cooking without losing the starting observation',()=>{
  let s=warmed();expect(Q.describe(s,'sauce').complete).toBe(true);s=act(s,[['advance',60],['advance',60]]);let q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.complete).toBe(false);expect(q.next.tool).toBe('check');s=R.act(s,'taste');q=Q.describe(s,'sauce');expect(q.count).toBe(1);expect(q.try).toContain('gentle warming');
 });
 it('offers temperature as a practice choice before the generic heavy-sauce water advice',()=>{
  expect(guidance(start())).toContain('Record a starting spoon trail');expect(guidance(R.act(start(),'taste'))).toContain('test gentle warming');
  expect(guidance(act(start(),[['taste'],['pour',30]]))).toContain('Fold the added water or released tomato juice');expect(guidance(act(start(),[['taste'],['panHeat',1],['advance',30]]))).toContain('Draw a fresh spoon trail');expect(guidance(warmed())).toContain('fresh check records a coating');
 });
 it('leaves the supplied preparation and pan quests outside learner evidence',()=>{for(const id of ['prep','pan']){const q=Q.describe(start(),id);expect(q.count).toBe(0);expect(q.unavailable).toContain('supplies');}});
});

describe('Cooled demonstrate mode keeps observations separate from verdicts',()=>{
 it('gives identical guidance when hidden chemistry changes behind identical recorded checks',()=>{
  const state=act(start('demonstrate'),[['taste'],['advance',30]]),a=JSON.parse(JSON.stringify(state)),b=JSON.parse(JSON.stringify(state));a.pan.temp=65;a.pan.moisture=60;b.pan.temp=110;b.pan.moisture=240;b.pan.chemistry.dispersion=0;
  const before=JSON.stringify([a,b]);expect(Q.describe(a,'sauce')).toEqual(Q.describe(b,'sauce'));expect(Q.describe(a,'sauce')).toMatchObject({observationOnly:true,complete:false,observedCount:1,next:{tool:'check'}});expect(JSON.stringify([a,b])).toBe(before);
 });
 it('counts two recorded checks without declaring a warm coating or a still-heavy sauce successful',()=>{
  const coated=warmed('demonstrate'),heavy=act(start('demonstrate'),[['taste'],['advance',45],['taste']]);expect(R.coolingCheck(coated).met).toBe(true);expect(R.coolingCheck(heavy).met).toBe(false);
  const a=Q.describe(coated,'sauce'),b=Q.describe(heavy,'sauce');expect(a).toEqual(b);expect(a.count).toBe(2);expect(a.complete).toBe(false);expect(a.try).toContain('Compare your recorded checks');expect(a.try).not.toMatch(/gentle warming|coats|successful|needs water/);
 });
 it('renders neutral milestones without checked verdicts and keeps further inspection available',()=>{
  const host={pause:vi.fn(),ended:()=>false,has3D:()=>false,open:vi.fn()},ui=Q.mount(host),s=warmed('demonstrate');ui.render(s,false);document.querySelector('[data-quest="sauce"]').click();expect(document.querySelectorAll('.quest-steps li')).toHaveLength(2);expect(document.querySelectorAll('.quest-step-done')).toHaveLength(0);expect($('questStatus').textContent).toContain('not a verdict');expect($('questTry').disabled).toBe(false);$('questKeyboard').click();expect(host.open).toHaveBeenCalledWith(expect.objectContaining({tool:'check',zone:'pan'}),true);
  ui.render(s,true);expect($('questTry').disabled).toBe(true);expect($('questKeyboard').disabled).toBe(true);
 });
});
