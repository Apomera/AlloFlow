import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
const source = fs.readFileSync('stem_lab/stem_tool_titration.js', 'utf8');
const pureSource = source.slice(source.indexOf('function titrationBenchLiquidProfile('), source.indexOf('function TitrationExperimentBench('));
const { profile, build } = new Function(pureSource + '; return {profile:titrationBenchLiquidProfile,build:buildTitrationExperimentScene};')();
const threeModule = {exports:{}};
new Function('module','exports',fs.readFileSync('vendor/three-r128/three.min.js','utf8'))(threeModule,threeModule.exports);
const THREE = threeModule.exports;
function scene(data={}) {
  const state={model:new THREE.Group()};
  build(THREE,state,{reading:0,delivered:0,fill:1/3,color:'rgba(200,220,255,0.25)',...data});
  return state;
}
function object(state,name){return state.model.getObjectByName(name);}
describe('Immersive titration bench',()=>{
  it('fills a tapered flask by volume rather than treating height as volume',()=>{
    const total=0.81*1.65+0.9*((0.25-0.9)/1.65)*1.65**2+((0.25-0.9)/1.65)**2*1.65**3/3;
    let previous=0;
    for(const fraction of [0.1,0.25,0.5,0.75,1]){
      const p=profile(fraction),k=(0.25-0.9)/1.65;
      const volume=0.81*p.height+0.9*k*p.height**2+k*k*p.height**3/3;
      expect(volume/total).toBeCloseTo(fraction,8);
      expect(p.height).toBeGreaterThan(previous);previous=p.height;
    }
  });
  it('clamps empty and full liquid profiles to the vessel',()=>{
    expect(profile(-1).height).toBe(0);expect(profile(2).height).toBe(1.65);expect(profile(NaN).height).toBe(0);
  });
  it('drains the burette as the receiving flask rises and represents an empty burette',()=>{
    const initial=scene(),added=scene({reading:25,delivered:25,fill:2/3}),empty=scene({reading:50});
    expect(added.experiment.liquidSurface).toBeGreaterThan(initial.experiment.liquidSurface);
    expect(added.experiment.meniscus).toBeLessThan(initial.experiment.meniscus);
    expect(object(empty,'burette-liquid').visible).toBe(false);
    expect(object(empty,'burette-meniscus').visible).toBe(false);
  });
  it('uses the current fill reading independently of cumulative delivered volume',()=>{
    const refilled=scene({reading:25,delivered:75});
    expect(refilled.experiment.reading).toBe(25);expect(refilled.experiment.delivered).toBe(75);
    expect(refilled.experiment.meniscus).toBeCloseTo(scene({reading:25}).experiment.meniscus);
  });
  it('preserves the chemistry color and alpha rather than inventing a pH color',()=>{
    const initial=scene(),pink=scene({color:'rgb(255,20,147)'});
    expect(object(initial,'flask-liquid').material.opacity).toBe(0.25);
    expect(object(pink,'flask-liquid').material.color.getHexString()).toBe('ff1493');
  });
  it('shows one finite addition cue and never moves an idle scene',()=>{
    const idle=scene();idle.tick(0);idle.tick(500);expect(object(idle,'titrant-drop').visible).toBe(false);
    const active=scene({animating:true});active.tick(100);const y=object(active,'titrant-drop').position.y;
    active.tick(400);expect(object(active,'titrant-drop').position.y).toBeLessThan(y);
    active.tick(900);expect(object(active,'titrant-drop').visible).toBe(false);
  });
});


describe('Titration apparatus close-ups',()=>{
  for(const focus of ['flask','burette']){
    it('frames all visible '+focus+' apparatus without changing the readings',()=>{
      const s=scene({focus,reading:26,delivered:26,fill:0.68});
      expect(s.experiment.focus).toBe(focus);expect(s.experiment.delivered).toBe(26);
      expect(object(s,'support-rod').visible).toBe(false);
      const bounds=new THREE.Box3(s.target.clone().sub(s.half),s.target.clone().add(s.half));
      for(const child of s.model.children.filter(c=>c.visible)){
        expect(bounds.containsBox(new THREE.Box3().setFromObject(child)),child.name+' exceeds close-up frame').toBe(true);
      }
      expect(object(s,'flask-body').visible).toBe(focus==='flask');
      expect(object(s,'burette-glass').visible).toBe(focus==='burette');
    });
  }
  it('does not resurrect an excluded drop during a burette close-up',()=>{
    const s=scene({focus:'burette',animating:true});s.tick(0);s.tick(200);
    expect(object(s,'titrant-drop').visible).toBe(false);
  });
});


const tracePoints=new Function(pureSource+';return titrationBenchTracePoints;')();
describe('Live bench titration curve',()=>{
  const samples=[{vol:0,y:1},{vol:0.2,y:2},{vol:0.4,y:3}];
  it('ends at the exact current reading between sampled volumes',()=>{
    expect(tracePoints(samples,0.1,1.5)).toEqual([{vol:0,y:1},{vol:0.1,y:1.5}]);
  });
  it('replaces the matching sample with the current value instead of duplicating it',()=>{
    expect(tracePoints(samples,0.2,2.01)).toEqual([{vol:0,y:1},{vol:0.2,y:2.01}]);
  });
  it('removes future points when the experiment is reset or moved backward',()=>{
    expect(tracePoints(samples,0,1)).toEqual([{vol:0,y:1}]);
    expect(tracePoints(samples,0.2,2).every(p=>p.vol<=0.2)).toBe(true);
  });
  it('does not draw malformed points',()=>{
    expect(tracePoints([{vol:-1,y:4},{vol:NaN,y:2},{vol:0,y:Infinity},null],0.1,1.5)).toEqual([{vol:0.1,y:1.5}]);
  });
});

const { dose, notebook, compare }=new Function(pureSource+';return {dose:titrationBenchDose,notebook:titrationBenchNotebook,compare:titrationBenchCompare};')();
describe('Titration bench measurement tools',()=>{
  const reading={id:1,preset:'sa_sb',setup:'HCl + NaOH',axis:'pH',volume:0,value:1,indicator:'Phenolphthalein',observation:'Before endpoint',note:''};
  it('accepts tenths of a milliliter up to the exact remaining range',()=>{
    expect(dose('2.5',50)).toBe(2.5);expect(dose('0.1',0.1)).toBe(0.1);expect(dose('50',50)).toBe(50);
  });
  it('rejects blank, non-finite, negative, over-range, and sub-resolution additions',()=>{
    for(const raw of ['',null,undefined,'NaN','Infinity','-1','0','0.05','2.55','51'])expect(dose(raw,50)).toBe(null);
    expect(dose('0.1',0)).toBe(null);expect(dose('1',NaN)).toBe(null);
  });
  it('keeps valid readings and rejects malformed or duplicate persisted records',()=>{
    expect(notebook(null)).toEqual([]);
    expect(notebook([reading,null,reading,{...reading,id:2,value:Infinity},{...reading,id:3,axis:'unknown'},{...reading,id:4,volume:-1},{...reading,id:Number.MAX_SAFE_INTEGER}])).toEqual([reading]);
  });
  it('caps stored readings and text while retaining only measurement fields',()=>{
    const rows=Array.from({length:50},(_,i)=>({...reading,id:i+1,setup:'x'.repeat(300),extra:'discard'}));
    const cleaned=notebook(rows);expect(cleaned).toHaveLength(40);expect(cleaned[0].setup).toHaveLength(240);expect(cleaned[0]).not.toHaveProperty('extra');expect(rows).toHaveLength(50);
  });
  it('compares B minus A at the precision displayed in the notebook',()=>{
    expect(compare(reading,{...reading,id:2,volume:2.5,value:1.09})).toEqual({volume:2.5,response:0.09,axis:'pH'});
    expect(compare({...reading,id:2,volume:2.5,value:1.09},reading)).toEqual({volume:-2.5,response:-0.09,axis:'pH'});
  });
  it('rejects comparing the same record or different setups and signals',()=>{
    expect(compare(reading,reading)).toBe(null);expect(compare(reading,null)).toBe(null);
    expect(compare(reading,{...reading,id:2,preset:'wa_sb'})).toBe(null);expect(compare(reading,{...reading,id:2,axis:'E'})).toBe(null);
  });
  it('retains millivolt precision for potential differences',()=>{
    expect(compare({...reading,axis:'E',value:0.751},{...reading,id:2,axis:'E',volume:1.2,value:0.763})).toEqual({volume:1.2,response:0.012,axis:'E'});
  });
});

const csv=new Function(pureSource+';return titrationBenchCSV;')();
describe('Notebook notes and CSV export',()=>{
  const reading={id:1,preset:'sa_sb',setup:'HCl + NaOH',axis:'pH',volume:2.5,value:1.09,indicator:'Phenolphthalein',observation:'Before endpoint',note:''};
  it('keeps old notebooks compatible and limits notes to 500 characters',()=>{
    expect(notebook([{...reading,note:undefined}])[0].note).toBe('');
    expect(notebook([{...reading,note:'a'.repeat(600)}])[0].note).toHaveLength(500);
    expect(notebook([{...reading,note:{bad:true}}])[0].note).toBe('');
  });
  it('exports pH and voltage in separate columns with explicit units',()=>{
    const output=csv([reading,{...reading,id:2,preset:'redox_kmno4',axis:'E',value:0.741}]);
    expect(output).toContain('"Titrant volume (mL)","pH","Potential (V)"');
    expect(output).toContain('"2.5","1.09",""');
    expect(output).toContain('"2.5","","0.741"');
  });
  it('preserves commas, quotes, multiline notes, and Unicode in quoted CSV cells',()=>{
    const output=csv([{...reading,note:'Pink, then "clear"\nΔ observation'}]);
    expect(output.startsWith('\uFEFF')).toBe(true);
    expect(output).toContain('"Pink, then ""clear""\nΔ observation"\r\n');
  });
  it('exports spreadsheet-like student text as literal text, including leading whitespace',()=>{
    for(const note of ['=1+1','+SUM(A1:A2)','-1+2','@SUM(A1:A2)',' \t=1+1','\n@SUM(1)'])expect(csv([{...reading,note}])).toContain('"\''+note+'"');
    expect(csv([{...reading,axis:'E',value:-0.12}])).toContain('"-0.12"');
  });
  it('exports all saved setups without changing the notebook or including malformed rows',()=>{
    const raw=[reading,{...reading,id:2,preset:'wa_sb'},null];const before=JSON.stringify(raw);
    expect(csv(raw).split('\r\n').filter(Boolean)).toHaveLength(3);expect(JSON.stringify(raw)).toBe(before);
    expect(csv(null).split('\r\n').filter(Boolean)).toHaveLength(1);
  });
});

const buildDilution=new Function(pureSource+';return buildTitrationDilutionScene;')();
describe('3D dilution comparison',()=>{
  function dilution(fraction,markers=true){const s={model:new THREE.Group()};buildDilution(THREE,s,{fraction,stockMl:fraction*100,finalMl:100,markers});return s;}
  it('represents the stock-to-final volume ratio with equal vessel cross sections',()=>{
    for(const fraction of [0.00001,0.1,0.5,1]){
      const s=dilution(fraction),stock=object(s,'stock-liquid'),final=object(s,'final-liquid');
      expect(stock.geometry.parameters.radiusTop).toBe(final.geometry.parameters.radiusTop);
      expect(stock.geometry.parameters.height/final.geometry.parameters.height).toBeCloseTo(fraction,8);
    }
  });
  it('retains equal counts of representative solute packets inside both liquids',()=>{
    for(const fraction of [0.00001,0.1,1]){
      const s=dilution(fraction);
      for(const prefix of ['stock','final']){
        const liquid=object(s,prefix+'-liquid'),top=liquid.position.y+liquid.geometry.parameters.height/2;
        const packets=s.model.children.filter(o=>o.name.startsWith(prefix+'-solute-'));expect(packets).toHaveLength(18);
        for(const packet of packets){const radius=packet.geometry.parameters.radius;expect(packet.position.y-radius).toBeGreaterThanOrEqual(0.13);expect(packet.position.y+radius).toBeLessThanOrEqual(top);expect(Math.hypot(packet.position.x-liquid.position.x,packet.position.z)+radius).toBeLessThan(0.79);}
      }
    }
  });
  it('toggles solute markers without changing liquid volumes',()=>{
    const s=dilution(0.2,false);expect(s.model.children.filter(o=>o.name.includes('-solute-')).every(o=>!o.visible)).toBe(true);
    expect(object(s,'stock-liquid').geometry.parameters.height).toBe(0.4);
  });
  it('fits the entire static scene into the camera bounds',()=>{
    const s=dilution(0.5),bounds=new THREE.Box3(s.target.clone().sub(s.half),s.target.clone().add(s.half));
    for(const o of s.model.children)expect(bounds.containsBox(new THREE.Box3().setFromObject(o)),o.name).toBe(true);
    expect(s.tick).toBeUndefined();
  });
});

// The endpoint bloom — the transient swirl of indicator colour where a drop lands.
// It is the moment the whole lab is built around, and before this it did not exist:
// the solution stepped straight from colourless to uniformly pink. These pin the two
// properties that make it teach something rather than merely decorate: it uses the
// indicator's OWN endpoint colour rather than the bulk colour, and it lingers longer
// the closer the addition is to equivalence.
describe('Endpoint bloom',()=>{
  const flash=(s)=>object(s,'titrant-flash');
  it('stays out of an idle scene and of the burette close-up',()=>{
    const idle=scene({fill:0.5});idle.tick(0);idle.tick(900);
    expect(flash(idle).visible).toBe(false);
    const burette=scene({fill:0.5,animating:true,focus:'burette'});burette.tick(0);burette.tick(900);
    expect(flash(burette).visible).toBe(false);
  });
  it('blooms after the drop lands and fades back out',()=>{
    const s=scene({fill:0.5,animating:true,flashColor:'#ec4899'});
    s.tick(0);
    s.tick(300);expect(flash(s).visible).toBe(false);
    s.tick(700);expect(flash(s).visible).toBe(true);
    const early=flash(s).material.opacity,earlyScale=flash(s).scale.x;
    s.tick(900);
    expect(flash(s).material.opacity).toBeLessThan(early);
    expect(flash(s).scale.x).toBeGreaterThan(earlyScale);
    s.tick(3000);expect(flash(s).visible).toBe(false);
  });
  it('takes the indicator endpoint colour, not the colour of the bulk solution',()=>{
    const s=scene({fill:0.5,animating:true,color:'rgba(255,255,255,0.15)',flashColor:'#ec4899'});
    expect(flash(s).material.color.getHexString()).toBe('ec4899');
    expect(object(s,'flask-liquid').material.color.getHexString()).toBe('ffffff');
  });
  it('lingers longer the closer the addition is to equivalence',()=>{
    const far=scene({fill:0.5,animating:true,flashHold:0});
    const near=scene({fill:0.5,animating:true,flashHold:1});
    far.tick(0);near.tick(0);
    far.tick(1100);near.tick(1100);
    expect(flash(far).visible).toBe(false);
    expect(flash(near).visible).toBe(true);
  });
  it('cannot bloom in an empty flask',()=>{
    const s=scene({fill:0,animating:true});s.tick(0);s.tick(800);
    expect(flash(s).visible).toBe(false);
  });
});

// The reference animation under the Titrate tab drew its S-curve as three straight
// segments, computed twice, sitting directly beneath the tool's own real curve. These
// pin the replacement against the chemistry its caption claims: 25.0 mL of 0.100 M HCl
// taken to 50.0 mL with 0.100 M NaOH.
const referencePH=new Function(
  source.slice(source.indexOf('function titrationReferencePH('), source.indexOf('function titrFinite('))
  +';return titrationReferencePH;')();
describe('Reference curve',()=>{
  it('starts, crosses and ends where 0.100 M strong acid against strong base does',()=>{
    expect(referencePH(0)).toBeCloseTo(1.00,2);
    expect(referencePH(0.5)).toBeCloseTo(7.00,2);
    expect(referencePH(1)).toBeCloseTo(12.52,2);
  });
  it('rises monotonically and stays finite across the whole sweep',()=>{
    let previous=-Infinity;
    for(let i=0;i<=200;i++){
      const value=referencePH(i/200);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(previous);
      previous=value;
    }
  });
  it('is steep only around equivalence, which is what makes the shape teachable',()=>{
    const slope=(a,b)=>(referencePH(b)-referencePH(a))/(b-a);
    expect(slope(0.49,0.51)).toBeGreaterThan(20*slope(0.1,0.3));
  });
  it('clamps malformed progress instead of returning NaN',()=>{
    expect(referencePH(NaN)).toBeCloseTo(1.00,2);
    expect(referencePH(-5)).toBeCloseTo(1.00,2);
    expect(referencePH(9)).toBeCloseTo(12.52,2);
  });
});

const previewTime=new Function(pureSource+';return titrationBenchPreviewTime;')();
describe('Static addition inspector',()=>{
  it('accepts a finite timeline position while rejecting missing or malformed values',()=>{
    expect(previewTime(0)).toBe(0);expect(previewTime(-100)).toBe(0);expect(previewTime(9999)).toBe(1800);
    for(const value of [null,undefined,NaN,Infinity,'650'])expect(previewTime(value)).toBe(null);
  });
  it('holds the impact pose without enabling continuous animation',()=>{
    const s=scene({animating:false,previewMs:700,flashHold:1,fill:0.5});s.tick(0);
    const flash=object(s,'titrant-flash'),drop=object(s,'titrant-drop');
    expect(flash.visible).toBe(true);const before={opacity:flash.material.opacity,scale:flash.scale.x,y:drop.position.y};
    s.tick(10000);expect({opacity:flash.material.opacity,scale:flash.scale.x,y:drop.position.y}).toEqual(before);
    expect(s.experiment.animating).toBe(false);expect(s.experiment.previewMs).toBe(700);
  });
  it('steps backward and forward without changing the experiment readings',()=>{
    for(const time of [1800,0,1100,650]){
      const s=scene({reading:24.9,delivered:24.9,animating:false,previewMs:time,flashHold:1});s.tick(5000);
      expect(s.experiment.reading).toBe(24.9);expect(s.experiment.delivered).toBe(24.9);
      expect(object(s,'titrant-drop').visible).toBe(time<650);
      expect(object(s,'titrant-flash').visible).toBe(time>=620&&time<1720);
      expect(object(s,'stopcock-handle').rotation.z).toBe(time<650?0:Math.PI/2);
    }
  });
  it('keeps the bloom excluded from the burette close-up during static inspection',()=>{
    const s=scene({focus:'burette',animating:false,previewMs:700});s.tick(0);expect(object(s,'titrant-flash').visible).toBe(false);
  });
});

const readingWindow=new Function(pureSource+';return titrationReadingWindow;')();
describe('Linked burette measurement visuals',()=>{
  it('keeps the magnified scale in range at both ends and through ordinary readings',()=>{
    for(const reading of [0,0.1,24.9,49.9,50]){const w=readingWindow(reading);expect(w.low).toBeGreaterThanOrEqual(0);expect(w.high).toBeLessThanOrEqual(50);expect(w.high-w.low).toBe(3);expect(w.reading).toBeGreaterThanOrEqual(w.low);expect(w.reading).toBeLessThanOrEqual(w.high);}
    expect(readingWindow(-5).reading).toBe(0);expect(readingWindow(99).reading).toBe(50);
  });
  it('places the numbered 3D labels on their matching graduations',()=>{
    const s=scene({focus:'burette',reading:24.9});
    for(const value of [0,10,20,30,40,50]){const label=object(s,'burette-number-'+value),tick=object(s,'graduation-'+value);expect(label.isLineSegments).toBe(true);expect(label.position.y).toBe(tick.position.y);expect(label.geometry.attributes.position.count).toBeGreaterThan(0);}
  });
  it('keeps the reading guide at the current fill, including refilled and empty burettes',()=>{
    for(const reading of [0,24.9,50]){const s=scene({focus:'burette',reading,delivered:reading+50}),line=object(s,'burette-reading-guide');expect(line.visible).toBe(true);expect(line.geometry.attributes.position.getY(0)).toBeCloseTo(s.experiment.meniscus,5);}
    expect(object(scene({focus:'flask'}),'burette-reading-guide').visible).toBe(false);
    expect(object(scene(),'burette-reading-guide').visible).toBe(false);
  });
});


describe('Titration surface ripples',()=>{
  const rings=s=>s.model.children.filter(o=>/^liquid-ripple-/.test(o.name));
  it('appears only at impact, expands within the liquid, and settles after the addition',()=>{
    const s=scene({animating:true,fill:0.5});s.tick(0);s.tick(600);expect(rings(s).some(o=>o.visible)).toBe(false);
    s.tick(700);const first=rings(s)[0],before={scale:first.scale.x,opacity:first.material.opacity};expect(first.visible).toBe(true);
    s.tick(1000);expect(first.scale.x).toBeGreaterThan(before.scale);expect(first.material.opacity).toBeLessThan(before.opacity);
    for(const o of rings(s)){expect(o.position.y).toBeCloseTo(s.experiment.liquidSurface+0.019);expect(o.scale.x*1.014).toBeLessThan(profile(0.5).radius);}
    s.tick(1600);expect(rings(s).some(o=>o.visible)).toBe(false);
  });
  it('never animates an idle, empty, or burette-only view',()=>{
    for(const data of [{},{animating:true,fill:0},{animating:true,focus:'burette'}]){const s=scene(data);s.tick(0);s.tick(1000);expect(rings(s).some(o=>o.visible)).toBe(false);}
  });
  it('holds a fixed ripple pose in the reduced-motion-compatible inspector',()=>{
    const s=scene({previewMs:1000,animating:false});s.tick(0);const pose=()=>rings(s).map(o=>({visible:o.visible,scale:o.scale.x,opacity:o.material.opacity})),before=pose();expect(before.some(o=>o.visible)).toBe(true);s.tick(20000);expect(pose()).toEqual(before);expect(s.experiment.animating).toBe(false);
  });
});


const comparisonFrame=new Function(pureSource+';return titrationComparisonFrame;')();
describe('Visual notebook comparison',()=>{
  const a={id:1,preset:'sa_sb',setup:'HCl + NaOH',axis:'pH',volume:25,value:7};
  const b={...a,id:2,volume:25.1,value:10.3};
  it('maps selected observations inside a finite zoomed frame',()=>{
    for(const pair of [[a,b],[b,a],[{...a,volume:0,value:0},{...b,volume:0.1,value:14}]]){
      const f=comparisonFrame(...pair);for(const p of [f.a,f.b]){expect(p.x).toBeGreaterThanOrEqual(58);expect(p.x).toBeLessThanOrEqual(355);expect(p.y).toBeGreaterThanOrEqual(32);expect(p.y).toBeLessThanOrEqual(187);}
      expect(f.volume.high).toBeGreaterThan(f.volume.low);expect(f.response.high).toBeGreaterThan(f.response.low);
    }
  });
  it('calculates an average using the rounded notebook differences',()=>{expect(comparisonFrame(a,b).rate).toBe(33);expect(comparisonFrame(b,a).rate).toBe(33);});
  it('retains voltage precision when calculating a redox interval',()=>{expect(comparisonFrame({...a,axis:'E',value:0.751},{...b,axis:'E',volume:25.2,value:0.763}).rate).toBe(0.06);});
  it('keeps coincident readings visible and has no rate for a zero volume interval',()=>{
    const f=comparisonFrame(a,{...a,id:2});expect(f.rate).toBe(null);expect(f.a).toEqual(f.b);expect(Number.isFinite(f.a.x)).toBe(true);expect(Number.isFinite(f.a.y)).toBe(true);
  });
  it('distinguishes zero response change from an undefined average',()=>{expect(comparisonFrame(a,{...b,value:a.value}).rate).toBe(0);});
  it('rejects different reagent setups even if the preset ID matches',()=>{
    const changed={...b,setup:'HCl + NaOH at a different concentration'};expect(compare(a,changed)).toBe(null);expect(comparisonFrame(a,changed)).toBe(null);
    expect(comparisonFrame(a,{...b,preset:'wa_sb'})).toBe(null);expect(comparisonFrame(a,a)).toBe(null);
  });
  it('never draws non-finite coordinate ranges from malformed saved values',()=>{expect(comparisonFrame({...a,value:-1e308},{...b,value:1e308})).toBe(null);});
});
