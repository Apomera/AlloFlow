import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const act=(s,list)=>list.reduce((s,[a,v])=>R.act(s,a,v),s);
describe('Whole-recipe cooking model',()=>{
  for(const id of ['mushroom','tomato'])for(const servings of [2,4])it(`${id} for ${servings}: prepares, coordinates, plates, and records`,()=>{
    const {state:s}=cook(id,servings);expect(s.plated).toBe(true);expect(R.criteria(s).every(c=>c.met)).toBe(true);
    expect(s.pot.heat+s.pan.heat).toBe(0);expect(R.evidence(s).corrections).toBe(0);
    const recorded=R.submit({...s,answers:[0,R.recipe(id).correct],reflection:'I sampled before draining and watched the sauce.'});
    expect(R.evidence(recorded).status).toBe('Recipe completed independently');
    expect(R.evidence(recorded).explanations[1].answer).toBe(R.recipe(id).answers[R.recipe(id).correct]);
    expect(R.restore(JSON.parse(JSON.stringify(recorded)))).toEqual(recorded);
  });
  it('changes both vessels over the same simulated interval and retains heat',()=>{
    let s=act(R.start(),[['fill'],['potHeat',3],['panHeat',3]]),before=JSON.stringify(s);
    let heated=R.act(s,'advance',30);expect(JSON.stringify(s)).toBe(before);expect(heated.pot.temp).toBeGreaterThan(s.pot.temp);expect(heated.pan.temp).toBeGreaterThan(s.pan.temp);
    heated=act(heated,[['panHeat',0],['potHeat',0]]);const cooled=R.act(heated,'advance',30);
    expect(cooled.pan.temp).toBeLessThan(heated.pan.temp);expect(cooled.pan.temp).toBeGreaterThan(22);
  });
  it('caps water at the modeled boiling point and shows the heat load of pasta',()=>{
    let s=act(R.start(),[['fill'],['potHeat',3],['measure',160]]);for(let i=0;i<10;i++)s=R.act(s,'advance',30);
    expect(s.pot.temp).toBe(100);const loaded=R.act(s,'pasta');expect(loaded.pot.temp).toBeLessThan(s.pot.temp);expect(loaded.pot.progress).toBe(0);
  });
  it('requires prep, boiling water, a sample, and burners off at the relevant decisions',()=>{
    let s=R.start();s=R.act(s,'cut');expect(s.prep.cut).toBe(false);s=R.act(s,'pasta');expect(s.pot.pasta).toBe(false);s=R.act(s,'drain');expect(s.pot.drained).toBe(false);s=R.act(s,'plate');expect(s.plated).toBe(false);
    const completed=cook().state;const ready={...completed,plated:false,pan:{...completed.pan,heat:2}};expect(R.act(ready,'plate').plated).toBe(false);
  });
  it('cannot undo scorched food by cooling or adding water',()=>{
    let s=act(R.start(),[['wash'],['rinse'],['cut'],['dry'],['garlicPrep'],['oil'],['produce'],['garlic'],['panHeat',3]]);
    for(let i=0;i<15;i++)s=R.act(s,'advance',60);
    expect(s.pan.damage).toBeGreaterThanOrEqual(1);expect(R.evidence(s).corrections).toBeGreaterThan(0);
    s=R.act(s,'panHeat',0);for(let i=0;i<10;i++)s=R.act(s,'advance',60);expect(R.inspect(s).burned).toBe(true);
  });
  it('counts early draining, incorrect portions, and wrong explanations in the outcome',()=>{
    const s=cook().state;
    expect(R.evidence(R.submit({...s,prep:{...s.prep,pasta:80},answers:[0,0]})).status).toBe('Review and refine');
    expect(R.criteria({...s,pot:{...s.pot,progress:.3}}).find(c=>c.label.includes('slightly firm')).met).toBe(false);
    expect(R.evidence(R.submit({...s,answers:[2,0]})).status).toBe('Review and refine');
    expect(R.evidence(R.submit({...s,answers:[0,0],hints:1})).status).toBe('Recipe completed with support');
  });
  it('does not use an old hard-pasta sample as evidence of the finished texture',()=>{
    const s=cook().state;expect(R.criteria({...s,pot:{...s.pot,sample:{time:30,progress:.1,texture:'Hard center'}}})[1].met).toBe(false);
  });
  it('scales ingredient quantities and produces a slower warm-up for the larger pot',()=>{
    let a=act(R.start('mushroom',2),[['fill'],['potHeat',3],['advance',60]]),b=act(R.start('mushroom',4),[['fill'],['potHeat',3],['advance',60]]);
    expect(R.ingredients(b).pasta).toBe(2*R.ingredients(a).pasta);expect(b.pot.temp).toBeLessThan(a.pot.temp);
  });
  it('rejects invalid commands and protects completed evidence',()=>{
    const s=R.start();for(const [a,v]of [['unknown'],['advance',Infinity],['advance',-1],['advance',61],['panHeat',4],['panHeat',NaN],['measure',-40],['measure',161],['panSize','enormous']])expect(R.act(s,a,v)).toBe(s);
    const completed=cook().state;expect(R.act(completed,'advance',30)).toBe(completed);expect(R.submit(completed).submitted).toBe(false);
    const restored=R.restore({...completed,pan:{damage:0,temp:9999},pot:{progress:0}});expect(restored.pan.temp).toBe(completed.pan.temp);expect(restored.pot.progress).toBe(completed.pot.progress);
  });
  it('keeps the reserved jug finite even after every splash is used',()=>{
    let s=R.start();for(const [a,v] of cook().steps){s=R.act(s,a,v);if(a==='reserve')break;}
    const allowance=200*s.servings/2,potWater=s.pot.water;for(let i=0;i<allowance/50;i++)s=R.act(s,'water');
    expect(s.pot.reserve).toBe(0);expect(s.pan.waterAdded).toBe(allowance);
    const denied=R.act(s,'reserve');expect(denied.log.at(-1).accepted).toBe(false);expect(denied.pot.water).toBe(potWater);expect(denied.pot.reserve).toBe(0);
    expect(R.restore(denied).pan.waterAdded).toBe(allowance);expect(R.restore(denied).pot.reserve).toBe(0);
  });
  it('reports only the last measured pasta texture while the clock continues',()=>{
    let s=act(R.start(),[['fill'],['measure',160],['potHeat',3]]);for(let i=0;i<5;i++)s=R.act(s,'advance',60);s=R.act(s,'pasta');
    expect(R.monitor(s).some(c=>c.text.includes('No texture sample'))).toBe(true);s=R.act(s,'sample');const sample=s.pot.sample.texture;s=R.act(s,'advance',60);
    expect(R.monitor(s).some(c=>c.text.includes(sample)&&c.text.includes('60 simulated seconds ago'))).toBe(true);
    expect(R.monitor({...s,pot:{...s.pot,progress:1.6}})).toEqual(R.monitor(s));
  });
  it('shows an observable developing problem before irreversible scorching',()=>{
    let s=act(R.start(),[['wash'],['garlicPrep'],['oil'],['garlic'],['panHeat',3]]);for(let i=0;i<4;i++)s=R.act(s,'advance',15);
    expect(s.pan.temp).toBeGreaterThan(175);expect(s.pan.damage).toBeLessThan(1);expect(R.monitor(s).some(c=>c.level==='attention'&&c.text.includes('garlic is darkening'))).toBe(true);
    const empty=R.act(R.start(),'potHeat',3);expect(R.monitor(empty).some(c=>c.text.includes('no water'))).toBe(true);
  });
  it('reviews decisions after plating without changing the cook or scoring',()=>{
    expect(R.review(R.start())).toBeNull();const s=cook().state,before=JSON.stringify(s),r=R.review(s);
    expect(r.findings).toHaveLength(5);expect(r.findings.every(f=>f.met&&f.observation&&f.nextPractice)).toBe(true);
    expect(r.timeline.at(-1).event).toBe('Dish plated');expect(r.timeline.some(t=>t.event==='Pasta sampled')).toBe(true);expect(JSON.stringify(s)).toBe(before);
    const evidence=R.evidence(R.submit({...s,answers:[0,0]}));expect(evidence.review).toEqual(r);expect(evidence.status).toBe('Recipe completed independently');
  });
  it('connects an imperfect dish to a specific next practice',()=>{
    const base=cook().state,s={...base,prep:{...base.prep,pasta:80},pot:{...base.pot,progress:1.5},pan:{...base.pan,damage:1,moisture:0}};
    const r=R.review(s);expect(r.findings[0].observation).toContain('80 g');expect(r.findings[1].nextPractice).toContain('drain sooner');expect(r.findings[2].nextPractice).toContain('cannot reverse');expect(r.findings[3].nextPractice).toContain('small splash');
  });
  it('ships the recipe workspace alongside the studio',()=>{
    for(const file of ['recipe_lab.html','recipe_lab.css','recipe_lab.js','recipe_lab_engine.js'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+file,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+file,'utf8'));
    expect(readFileSync('stem_lab/kitchen_studio/index.html','utf8')).toContain('recipe_lab.html');
  });
});
