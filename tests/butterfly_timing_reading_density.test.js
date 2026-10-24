import {beforeAll,afterAll,afterEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';

// Realistic summer timing, the Simpler words switch, and the fuller flower beds
// paid for by lower-detail distant butterflies.
const require=createRequire(import.meta.url);
const THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};
  loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  BF=window.__RR_TEST_EXPORTS__.butterfly;
  world=BF.buildWorld(THREE,window.StemMeadow);
});
afterAll(()=>{
  if(!world)return;const resources=new Set();
  world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{resources.add(m);if(m.map)resources.add(m.map);});});
  resources.forEach(r=>r.dispose());
});
afterEach(()=>{BF.setPlain(false);try{window.localStorage.removeItem('alloflow.butterfly.simpler');}catch(_){}});
function render(extra){
  const ctx=Object.assign({React,toolData:{},isDark:false,isContrast:false,setToolData(){},updateMulti(){}},extra||{});
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}
function tris(o){return o.geometry?(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1):0;}

describe('Typical summer timing',()=>{
  it('lays the four stages end to end across about a month',()=>{
    const order=['egg','caterpillar','chrysalis','adult'],d=BF.stageDays;
    expect(d.egg[0]).toBe(0);
    for(let i=1;i<order.length;i++)expect(d[order[i]][0]).toBe(d[order[i-1]][1]);
    // Monarch Joint Venture: egg 3-5 days, caterpillar 9-14, chrysalis 8-15.
    expect(d.egg[1]-d.egg[0]).toBeGreaterThanOrEqual(3);expect(d.egg[1]-d.egg[0]).toBeLessThanOrEqual(5);
    expect(d.caterpillar[1]-d.caterpillar[0]).toBeGreaterThanOrEqual(9);expect(d.caterpillar[1]-d.caterpillar[0]).toBeLessThanOrEqual(14);
    expect(d.chrysalis[1]-d.chrysalis[0]).toBeGreaterThanOrEqual(8);expect(d.chrysalis[1]-d.chrysalis[0]).toBeLessThanOrEqual(15);
    expect(d.chrysalis[1]).toBeGreaterThanOrEqual(25);expect(d.chrysalis[1]).toBeLessThanOrEqual(35);
  });
  it('lands each cut inside the stage it stops, and names that week',()=>{
    const milkweed=BF.plants.find(p=>p.id==='milkweed');
    for(const m of BF.mowings){
      const o=BF.seasonOutcome(milkweed,m.id);
      if(m.day===null){expect(o.completes).toBe(true);continue;}
      expect(m.week).toBe(Math.ceil(m.day/7));
      if(o.completes){for(const id of Object.keys(BF.stageDays))expect(m.day).toBeGreaterThanOrEqual(BF.stageDays[id][1]);continue;}
      const span=BF.stageDays[o.blocked];
      expect(m.day).toBeGreaterThanOrEqual(span[0]);expect(m.day).toBeLessThan(span[1]);
      expect(o.reason).toContain('week '+m.week);expect(o.reason).toContain('days '+span[0]+' to '+span[1]);
    }
  });
  it('draws a bar for every stage across the six-week axis',()=>{
    const html=render({toolData:{}});
    for(const id of ['egg','caterpillar','chrysalis','adult'])expect(html).toContain('data-stage-bar="'+id+'"');
    const egg=BF.stageDays.egg;expect(html).toContain('left:0%;width:'+((egg[1]-egg[0])/42*100)+'%');
    expect(html).toContain('Week 6');expect(html).not.toContain('Week 7');
  });
});

describe('Simpler words',()=>{
  it('starts on for grade 4 and below, off for grade 5 (the host default when no grade is set), older grades, or no grade',()=>{
    expect(render({gradeLevel:'4th Grade'})).toMatch(/aria-pressed="true"[^>]*class="bf-simpler"|class="bf-simpler"[^>]*aria-pressed="true"/);
    expect(render({gradeLevel:'Kindergarten'})).toMatch(/aria-pressed="true"[^>]*class="bf-simpler"/);
    expect(render({gradeLevel:'8th Grade'})).toMatch(/aria-pressed="false"[^>]*class="bf-simpler"/);
    expect(render({gradeLevel:'5th Grade'})).toMatch(/aria-pressed="false"[^>]*class="bf-simpler"/);
    expect(render()).toMatch(/aria-pressed="false"[^>]*class="bf-simpler"/);
  });
  it('swaps the reading passages and keeps the science the same',()=>{
    const full=render({gradeLevel:'8th Grade'}),simple=render({gradeLevel:'3rd Grade'});
    expect(full).toContain('discover how flowers and leaves support different stages of life');
    expect(simple).toContain('find out what a monarch needs as it grows');
    expect(simple).not.toContain('discover how flowers and leaves support different stages of life');
    expect(simple).toContain('The caterpillar eats and grows. It needs milkweed leaves.');
    // The disclaimers stay; only their wording changes.
    expect(simple).toContain('not evidence about this meadow');
  });
  it('a learner choice saved on this device wins over the grade default',()=>{
    window.localStorage.setItem('alloflow.butterfly.simpler','0');
    expect(render({gradeLevel:'3rd Grade'})).toMatch(/aria-pressed="false"[^>]*class="bf-simpler"/);
    window.localStorage.setItem('alloflow.butterfly.simpler','1');
    expect(render({gradeLevel:'10th Grade'})).toMatch(/aria-pressed="true"[^>]*class="bf-simpler"/);
  });
  it('reaches the model feedback, not just the page text',()=>{
    const bergamot=BF.plants.find(p=>p.id==='bergamot'),milkweed=BF.plants.find(p=>p.id==='milkweed');
    const fullReason=BF.seasonOutcome(bergamot,'never').reason;
    BF.setPlain(true);
    const simpleReason=BF.seasonOutcome(bergamot,'never').reason,simpleCut=BF.seasonOutcome(milkweed,'early').reason;
    expect(simpleReason).not.toBe(fullReason);expect(simpleReason).toMatch(/caterpillar/);
    expect(simpleCut).toMatch(/week 2/);
    expect(BF.stages.find(s=>s.id==='chrysalis').caption).toMatch(/chrysalis/);
    BF.setPlain(false);
    expect(BF.seasonOutcome(bergamot,'never').reason).toBe(fullReason);
  });
  it('states no survival rate or population count in either wording',()=>{
    for(const on of [false,true]){
      BF.setPlain(on);
      const text=BF.fieldFacts.map(f=>f.text).concat(BF.stages.flatMap(s=>[s.caption,s.thriving,s.failing]),BF.plants.map(p=>p.note),BF.designs.map(d=>d.note),BF.mowings.map(m=>m.note)).join(' ');
      expect(text).not.toMatch(/\d+\s*%/);expect(text).not.toMatch(/\b\d+\s*(butterflies|monarchs|eggs)\b/i);
    }
  });
});

describe('Fuller flower beds, paid for by distant butterflies',()=>{
  it('draws four visiting species at a fraction of the player cost, with articulated wings and a drinking tube',()=>{
    let player=0;world.player.root.traverse(o=>{player+=tris(o);});
    expect(world.visitors).toHaveLength(4);
    expect(new Set(world.visitors.map(visitor=>visitor.speciesId)).size).toBe(4);
    for(const v of world.visitors){
      let t=0;v.root.traverse(o=>{t+=tris(o);});
      expect(t).toBeLessThan(player*.4);
      expect(v.wings).toHaveLength(2);expect(v.hindWings).toHaveLength(2);
      for(const wing of [...v.wings,...v.hindWings])expect(v.root.getObjectById(wing.id)).toBe(wing);
      const tube=v.root.getObjectByName('visitor-proboscis');
      expect(tube.isMesh).toBe(true);expect(tube.parent).toBe(v.root);
      expect(tube.morphTargetInfluences).toHaveLength(1);
      expect(tube.geometry.morphAttributes.position).toHaveLength(1);
      expect(tube.geometry.morphAttributes.position[0].count).toBeGreaterThan(0);
    }
  });
  it('adds outer stems along a natural bed fringe without moving any stem a close-up uses',()=>{
    const groups=world.outerBlooms;expect(groups.map(g=>g.name).sort()).toEqual(['outer-bloom-bergamot','outer-bloom-milkweed','outer-bloom-restoration-flowers','outer-bloom-restoration-mixed']);
    const m=new THREE.Matrix4(),pos=new THREE.Vector3(),outer=[];
    world.scene.updateMatrixWorld(true);
    for(const g of groups)g.traverse(o=>{if(o.isInstancedMesh&&/flower/.test(o.geometry.name))for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);pos.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);outer.push(pos.clone());}});
    expect(outer.length).toBe(20+20+20+20);
    // None sits on a framed stem (indices 0-33, or 0-16 per half of the mixed plot).
    const framed=[];
    for(const id of ['milkweed','bergamot'])for(let i=0;i<34;i++){framed.push(BF.stemPose(BF.plants.find(x=>x.id===id),id==='milkweed'?0:1,i,34,0));}
    for(const o of outer)for(const f of framed)expect(Math.hypot(o.x-f.x,o.z-f.z)).toBeGreaterThan(.5);
    world.showOuterBlooms(false);expect(groups.every(g=>!g.visible)).toBe(true);
    world.showOuterBlooms(true);expect(groups.every(g=>g.visible)).toBe(true);
  });
});
