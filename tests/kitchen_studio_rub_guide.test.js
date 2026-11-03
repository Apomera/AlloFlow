import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const require=createRequire(import.meta.url);
const Rub=require('../stem_lab/kitchen_studio/kitchen_studio_rub_guide.js');
const Wash=require('../stem_lab/kitchen_studio/kitchen_studio_wash.js');
const Gestures=require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const begin=(kind='handwash',unit=1)=>kind==='handwash'?Wash.begin({x:150,y:90},{unit}):Gestures.begin('dry',{x:150,y:90},{unit});
const move=(kind,trace,dx,dy=0,water=false)=>kind==='handwash'?Wash.move(trace,{x:trace.start.x+dx*trace.unit,y:trace.start.y+dy*trace.unit},{overWater:water}):Gestures.move(trace,{x:trace.start.x+dx*trace.unit,y:trace.start.y+dy*trace.unit});
const sequence=(kind,values,unit=1)=>values.reduce((trace,dx)=>move(kind,trace,dx),begin(kind,unit));
const views=[];
afterEach(()=>{views.splice(0).forEach(view=>view.dispose());document.body.innerHTML='';});

describe('Rubbing guide description',()=>{
  it('exports the same browser API without a DOM or gesture dependency',()=>{
    const context={window:{}};runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_rub_guide.js'),'utf8'),context);
    expect(Object.keys(context.window.KitchenStudioRubGuide).sort()).toEqual(['describe','mount']);
    expect(context.window.KitchenStudioRubGuide.describe('handwash',begin())).toMatchObject({stage:'rub',completed:0,direction:'either',puck:.5});
  });

  it.each(['handwash','dry'])('offers either first direction for %s, without an input target',kind=>{
    const model=Rub.describe(kind,begin(kind));
    expect(model).toMatchObject({stage:'rub',completed:0,total:3,direction:'either',progress:0,puck:.5,nextX:null});
    expect(model.instruction).toContain('0 of 3 model passes');expect(model.instruction).toContain('Sweep either way');expect(model.instruction).not.toMatch(/seconds|elapsed|timer/i);
  });

  it.each([['handwash',12,.75],['handwash',-12,.25],['dry',12,.75],['dry',-12,.25]])('shows the real partial first sweep for %s at %s units',(kind,dx,puck)=>{
    const model=Rub.describe(kind,move(kind,begin(kind),dx));expect(model.direction).toBe('either');expect(model.completed).toBe(0);expect(model.progress).toBe(.5);expect(model.puck).toBe(puck);expect(model.nextX).toBeNull();
  });

  it.each(['handwash','dry'])('changes direction only when %s completes a real pass',kind=>{
    const first=sequence(kind,[24]);expect(Rub.describe(kind,first)).toMatchObject({completed:1,direction:'left',progress:0,puck:1,nextX:150});
    const half=move(kind,first,12);expect(Rub.describe(kind,half)).toMatchObject({completed:1,direction:'left',progress:.5,puck:.5,nextX:150});
    const second=move(kind,half,0);expect(Rub.describe(kind,second)).toMatchObject({completed:2,direction:'right',progress:0,puck:0,nextX:174});
    expect(Rub.describe(kind,move(kind,second,12))).toMatchObject({completed:2,direction:'right',progress:.5,puck:.5});
  });

  it.each(['handwash','dry'])('permits a mirrored first sweep for %s',kind=>{
    const first=sequence(kind,[-24]);expect(Rub.describe(kind,first)).toMatchObject({completed:1,direction:'right',puck:0,nextX:150});
    expect(Rub.describe(kind,move(kind,first,-12))).toMatchObject({completed:1,direction:'right',progress:.5,puck:.5});
    expect(Rub.describe(kind,sequence(kind,[-24,0]))).toMatchObject({completed:2,direction:'left',puck:1,nextX:126});
  });

  it.each(['handwash','dry'])('uses the latest overshoot extreme for %s',kind=>{
    const overshot=sequence(kind,[24,70]);const model=Rub.describe(kind,overshot);
    expect(model).toMatchObject({completed:1,direction:'left',progress:0,nextX:196});
    expect(Rub.describe(kind,move(kind,overshot,58))).toMatchObject({completed:1,progress:.5,puck:.5,nextX:196});
    expect(Rub.describe(kind,move(kind,overshot,46))).toMatchObject({completed:2,direction:'right',nextX:220});
  });

  it.each([.5,1,2])('scales only the actual next client threshold at unit %s',unit=>{
    const trace=sequence('handwash',[24,60,48],unit),model=Rub.describe('handwash',trace);
    expect(model.nextX).toBe(150+36*unit);expect(model.progress).toBe(.5);expect(model.puck).toBe(.5);expect(model.direction).toBe('left');
  });

  it('keeps the visible puck continuous across completed reversals',()=>{
    let trace=begin('dry');const samples=[];
    for(const dx of [12,24,12,0,12,24]){trace=move('dry',trace,dx);samples.push(Rub.describe('dry',trace).puck);}
    expect(samples).toEqual([.75,1,.5,0,.5,1]);
  });

  it('switches from three handwash passes to rinse, then explicit release',()=>{
    const washed=sequence('handwash',[24,0,24]);expect(Rub.describe('handwash',washed)).toMatchObject({stage:'rinse',completed:3,total:3,direction:'none',progress:1,puck:1,nextX:null});
    expect(Rub.describe('handwash',washed).instruction).toBe('Three model passes complete. Move the model hands under running water.');
    const ready=move('handwash',washed,24,-10,true);expect(Rub.describe('handwash',ready)).toMatchObject({stage:'ready',completed:3,direction:'none',puck:1,nextX:null});
    expect(Rub.describe('handwash',ready).instruction).toBe('Three model passes complete. Release under the water to model the wash.');
    expect(Rub.describe('handwash',move('handwash',ready,24,-10,false)).stage).toBe('rinse');
  });

  it('requires no fourth sweep after drying and preserves its last side',()=>{
    for(const sign of [-1,1]){
      const trace=sequence('dry',[24,0,24].map(x=>x*sign)),model=Rub.describe('dry',trace);
      expect(model).toMatchObject({stage:'ready',completed:3,direction:'none',progress:1,puck:sign>0?1:0,nextX:null});expect(model.instruction).toBe('Three model passes complete. Release to finish drying.');
    }
  });

  it('does not mutate or retain model trace points',()=>{
    const trace=sequence('handwash',[24,60,48]),before=structuredClone(trace);Object.freeze(trace.start);Object.freeze(trace.current);Object.freeze(trace);
    const first=Rub.describe('handwash',trace),second=Rub.describe('handwash',trace);expect(trace).toEqual(before);expect(first).toEqual(second);expect(first).not.toBe(second);
    first.completed=99;expect(second.completed).toBe(1);expect(Rub.describe('handwash',trace).completed).toBe(1);
  });

  it('hides invalid contact even if three passes were previously completed',()=>{
    const trace=move('handwash',begin(),0,41);expect(trace.invalid).toBe(true);expect(Rub.describe('handwash',trace)).toBeNull();
    expect(Rub.describe('dry',{...sequence('dry',[24,0,24]),invalid:true})).toBeNull();
  });

  it.each([
    ['start',null],['start',{x:'150',y:90}],['current',{x:150,y:Infinity}],['unit',0],['unit',NaN],['unit','1'],['unit',-1],
    ['passes',-1],['passes',4],['passes',.5],['passes','0'],['passTravel',-1],['passTravel',Infinity],['passTravel','0'],
    ['rubEdge',NaN],['rubEdge','0'],['rubDirection',1],['invalid',undefined],['phase','ready']
  ])('rejects malformed %s=%j without coercion',(field,value)=>{expect(Rub.describe('handwash',{...begin(),[field]:value})).toBeNull();});

  it('rejects wrong phases, direction states, tools and unbounded arithmetic',()=>{
    const first=sequence('dry',[24]);expect(Rub.describe('dry',{...first,rubDirection:0})).toBeNull();expect(Rub.describe('dry',{...first,phase:'adjust'})).toBeNull();
    expect(Rub.describe('handwash',{...sequence('handwash',[24,0,24]),phase:'rub'})).toBeNull();expect(Rub.describe('dry',{...first,kind:'cut'})).toBeNull();
    for(const kind of ['cut','door','constructor',null])expect(Rub.describe(kind,begin())).toBeNull();
    for(const trace of [null,undefined,{},[],false])expect(Rub.describe('dry',trace)).toBeNull();
    expect(Rub.describe('dry',{...first,start:{x:1e308,y:90},rubEdge:1e308,unit:2})).toBeNull();
  });
});

function fixture(){
  document.body.innerHTML='<canvas id="rubCanvas"></canvas><div id="studioRubGuide" hidden><strong id="studioRubTitle"></strong><span id="studioRubCount"></span><span id="studioRubDirection"></span><div id="studioRubTrack"><i id="studioRubDot"></i><span id="studioRubArrow"></span></div><div id="studioRubPasses"><span>1</span><span>2</span><span>3</span></div></div><p id="outsideHint">Existing accessible controls</p>';
  const view=Rub.mount({canvas:document.getElementById('rubCanvas')});views.push(view);
  return {view,guide:document.getElementById('studioRubGuide'),title:document.getElementById('studioRubTitle'),count:document.getElementById('studioRubCount'),direction:document.getElementById('studioRubDirection'),track:document.getElementById('studioRubTrack'),dot:document.getElementById('studioRubDot'),arrow:document.getElementById('studioRubArrow'),passes:[...document.getElementById('studioRubPasses').children]};
}

describe('Rubbing guide DOM',()=>{
  it('starts empty and hidden, without an additional live region',()=>{
    const f=fixture();expect(f.guide.hidden).toBe(true);expect(f.guide.getAttribute('aria-hidden')).toBe('true');expect(Object.keys(f.guide.dataset)).toEqual([]);
    expect(f.guide.querySelector('[aria-live]')).toBeNull();expect(f.title.textContent).toBe('');expect(f.passes.every(p=>!p.classList.contains('completed'))).toBe(true);
  });

  it('shows normalized first movement and returns the accessible instruction',()=>{
    const f=fixture(),model=f.view.update('handwash',move('handwash',begin(),12));expect(f.guide.hidden).toBe(false);expect(f.guide.dataset).toMatchObject({stage:'rub',completed:'0',direction:'either',progress:'0.5',puck:'0.75'});
    expect(f.title.textContent).toBe('Handwash preview');expect(f.count.textContent).toBe('0 / 3 model passes');expect(f.direction.textContent).toBe('Either direction ↔');expect(f.dot.style.left).toBe('75%');expect(f.arrow.textContent).toBe('↔');expect(f.track.hidden).toBe(false);expect(model.instruction).toContain('Sweep either way.');
    expect(document.getElementById('outsideHint').textContent).toBe('Existing accessible controls');
  });

  it('fills only completed pass markers and displays the next reversal',()=>{
    const f=fixture();f.view.update('dry',sequence('dry',[24]));expect(f.passes.map(p=>p.classList.contains('completed'))).toEqual([true,false,false]);expect(f.direction.textContent).toBe('Sweep left ←');expect(f.arrow.textContent).toBe('←');expect(f.dot.style.left).toBe('100%');expect(f.guide.dataset.nextX).toBe('150');
    f.view.update('dry',sequence('dry',[24,0]));expect(f.passes.map(p=>p.classList.contains('completed'))).toEqual([true,true,false]);expect(f.direction.textContent).toBe('Sweep right →');expect(f.dot.style.left).toBe('0%');
  });

  it('removes the rail and horizontal arrow during rinse and final release',()=>{
    const f=fixture(),wash=sequence('handwash',[24,0,24]);f.view.update('handwash',wash);expect(f.guide.dataset.stage).toBe('rinse');expect(f.direction.textContent).toBe('Move under water');expect(f.arrow.textContent).toBe('');expect(f.track.hidden).toBe(true);expect(f.guide.dataset.nextX).toBeUndefined();expect(f.passes.every(p=>p.classList.contains('completed'))).toBe(true);
    f.view.update('handwash',move('handwash',wash,24,-10,true));expect(f.direction.textContent).toBe('Release under water');expect(f.guide.dataset.stage).toBe('ready');
    f.view.update('dry',sequence('dry',[24,0,24]));expect(f.direction.textContent).toBe('Release to finish');
  });

  it('clears all old state on cancellation, invalid contact or unsupported tools',()=>{
    const f=fixture();for(const args of [[null,null],['handwash',{...begin(),invalid:true}],['cut',begin()]]){
      f.view.update('dry',sequence('dry',[24]));expect(f.view.update(...args)).toBeNull();expect(f.guide.hidden).toBe(true);expect(Object.keys(f.guide.dataset)).toEqual([]);expect(f.dot.style.left).toBe('');expect(f.arrow.textContent).toBe('');expect(f.count.textContent).toBe('');expect(f.passes.every(p=>!p.classList.contains('completed'))).toBe(true);
    }
  });

  it('restarts a fresh display without stale pass, target or progress values',()=>{
    const f=fixture();f.view.update('dry',sequence('dry',[24,0,24]));f.view.update(null,null);f.view.update('handwash',begin());
    expect(f.guide.dataset).toMatchObject({stage:'rub',completed:'0',direction:'either',progress:'0',puck:'0.5'});expect(f.guide.dataset.nextX).toBeUndefined();expect(f.dot.style.left).toBe('50%');expect(f.track.hidden).toBe(false);expect(f.passes.every(p=>!p.classList.contains('completed'))).toBe(true);
  });

  it('disposes idempotently and cannot resurrect a later model',()=>{
    const f=fixture();f.view.update('dry',sequence('dry',[24]));f.view.dispose();const cleared=f.guide.outerHTML;f.view.dispose();expect(f.view.update('dry',sequence('dry',[24,0,24]))).toBeNull();expect(f.guide.outerHTML).toBe(cleared);expect(f.guide.hidden).toBe(true);
  });
});
