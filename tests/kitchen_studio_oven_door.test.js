import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const O=require('../stem_lab/kitchen_studio/kitchen_studio_oven_door.js');
const origin={x:100,y:100},at=(x,y)=>({x:origin.x+x,y:origin.y+y});
const clone=value=>JSON.parse(JSON.stringify(value));

describe('Oven door release decisions',()=>{
  it.each([false,true])('requires a deliberate stroke from open=%s',open=>{
    const direction=open?-1:1,start=O.begin(origin,{open});
    expect(start.opening).toBe(open?1:0);
    expect(O.finish(start)).toMatchObject({complete:false,action:null});
    const partial=O.move(start,at(0,direction*23));
    expect(O.finish(partial).complete).toBe(false);
    expect(partial.opening).toBeCloseTo(open?1-23/75:23/75);
    const ready=O.move(partial,at(0,direction*24));
    expect(O.finish(ready)).toEqual({complete:true,action:null,view:'oven',open:!open,message:open?'Oven closed.':'Oven opened.'});
    expect(O.progress(ready)).toBe(1);
    expect(start.phase).toBe('adjust');
  });
  it.each([false,true])('cancels a stroke returned before release from open=%s',open=>{
    const start=O.begin(origin,{open}),away=O.move(start,at(0,open?-60:60));
    expect(O.finish(away).complete).toBe(true);
    const returned=O.move(away,origin);
    expect(returned.opening).toBe(open?1:0);
    expect(O.finish(returned)).toMatchObject({complete:false,action:null});
    expect(O.progress(returned)).toBe(0);
  });
  it.each([false,true])('ignores movement toward the existing stop from open=%s',open=>{
    const trace=O.move(O.begin(origin,{open}),at(0,open?500:-500));
    expect(trace.opening).toBe(open?1:0);
    expect(O.finish(trace).complete).toBe(false);
    expect(O.progress(trace)).toBe(0);
  });
  it.each([false,true])('clamps the physical preview at both ends from open=%s',open=>{
    const start=O.begin(origin,{open});
    expect(O.move(start,at(0,-500)).opening).toBe(0);
    expect(O.move(start,at(0,500)).opening).toBe(1);
  });
  it.each([false,true])('allows slight sideways movement but loses a slipped handle from open=%s',open=>{
    const start=O.begin(origin,{open}),dy=open?-30:30;
    expect(O.finish(O.move(start,at(55,dy))).complete).toBe(true);
    const slipped=O.move(start,at(-55.01,dy)),before=clone(slipped);
    expect(slipped).toMatchObject({invalid:true,phase:'retry'});
    expect(O.finish(slipped)).toEqual({complete:false,action:null,message:'Contact lost. Start again on the oven handle.'});
    const returned=O.move(slipped,at(0,dy));
    expect(returned.invalid).toBe(true);
    expect(O.finish(returned).complete).toBe(false);
    expect(O.progress(returned)).toBe(0);
    expect(slipped).toEqual(before);
  });
  it('keeps the preview proportional to scene size',()=>{
    for(const unit of [.5,1,2])for(const open of [false,true]){
      const sign=open?-1:1,start=O.begin(origin,{open,unit});
      expect(O.finish(O.move(start,at(0,sign*23.99*unit))).complete).toBe(false);
      expect(O.finish(O.move(start,at(0,sign*24*unit))).complete).toBe(true);
      expect(O.move(start,at(0,sign*37.5*unit)).opening).toBe(.5);
      expect(O.progress(O.move(start,at(0,sign*12*unit)))).toBe(.5);
      expect(O.move(start,at(55*unit,sign*24*unit)).invalid).toBe(false);
      expect(O.move(start,at(55.01*unit,sign*24*unit)).invalid).toBe(true);
    }
  });
  it('never offers an engine action for tapping, moving or releasing',()=>{
    for(const open of [false,true]){
      const start=O.begin(origin,{open});
      for(const trace of [start,O.move(start,at(0,open?-50:50)),O.move(start,at(100,50))]){
        expect(O.finish(trace).action).toBeNull();
        expect(O.finish(trace).action).not.toBe('cook');
        expect(O.finish(trace).action).not.toBe('read');
      }
      expect(O.tap(open)).toEqual(O.finish(O.move(start,at(0,open?-50:50))));
    }
  });
  it('leaves caller-owned cooking evidence and options unchanged',()=>{
    const evidence=Object.freeze({seconds:30,reading:150}),options=Object.freeze({open:false,unit:1,evidence});
    const trace=O.begin(origin,options),before=clone(trace);
    O.finish(O.move(trace,at(0,50)));O.tap(false);
    expect(trace).toEqual(before);
    expect(evidence).toEqual({seconds:30,reading:150});
    expect(options.evidence).toBe(evidence);
  });
});

describe('Oven door input and immutable frames',()=>{
  it.each([null,undefined,{},[],{x:NaN,y:0},{x:0,y:Infinity},{x:'0',y:1},{x:1,y:null}])('rejects an invalid starting point %j',value=>{
    expect(O.begin(value)).toBeNull();
  });
  it.each([NaN,Infinity,-Infinity,0,-1,'1',null])('rejects an invalid supplied unit %j',unit=>{
    expect(O.begin(origin,{unit})).toBeNull();
  });
  it('uses a default scale and clamps positive finite scales',()=>{
    expect(O.begin(origin).unit).toBe(1);
    expect(O.begin(origin,null).unit).toBe(1);
    expect(O.begin(origin,{unit:.01}).unit).toBe(.5);
    expect(O.begin(origin,{unit:20}).unit).toBe(2);
    expect(O.begin(origin,{open:'yes'}).initialOpen).toBe(false);
    expect(O.begin(origin,{open:true}).initialOpen).toBe(true);
  });
  it.each([null,undefined,{},[],{x:NaN,y:1},{x:1,y:-Infinity},{x:1,y:'100'}])('invalid movement %j loses contact permanently',value=>{
    const trace=O.begin(origin),invalid=O.move(trace,value);
    expect(invalid.invalid).toBe(true);
    expect(invalid.current).toEqual(origin);
    expect(O.finish(invalid).complete).toBe(false);
    expect(O.finish(O.move(invalid,at(0,75))).complete).toBe(false);
    expect(O.progress(invalid)).toBe(0);
    expect(trace.invalid).toBe(false);
  });
  it('rejects overflowed travel rather than displaying a non-finite preview',()=>{
    const trace=O.begin({x:-Number.MAX_VALUE,y:0});
    const invalid=O.move(trace,{x:Number.MAX_VALUE,y:30});
    expect(invalid.invalid).toBe(true);
    expect(O.finish(invalid).complete).toBe(false);
    expect(O.progress(invalid)).toBe(0);
  });
  it.each([null,{}, {start:origin,current:origin,unit:NaN,initialOpen:false,opening:0}])('handles missing or malformed traces %j',value=>{
    expect(O.move(value,origin)).toBeNull();
    expect(O.finish(value)).toMatchObject({complete:false,action:null});
    expect(O.progress(value)).toBe(0);
  });
  it('copies points on begin and on every frame, including invalid frames',()=>{
    const input={...origin},trace=O.begin(input),movedInput=at(0,12),next=O.move(trace,movedInput);
    input.x=-1;movedInput.y=-1;
    expect(trace.start).toEqual(origin);expect(trace.current).toEqual(origin);
    expect(next.current).toEqual(at(0,12));
    next.start.x=999;next.current.y=999;
    expect(trace.start).toEqual(origin);expect(trace.current).toEqual(origin);
    const invalid=O.move(trace,null),again=O.move(invalid,origin);
    again.start.x=77;again.current.y=77;
    expect(invalid.start).toEqual(origin);expect(invalid.current).toEqual(origin);
  });
  it('works with frozen source points and traces',()=>{
    const input=Object.freeze({...origin}),start=O.begin(input);
    Object.freeze(start.start);Object.freeze(start.current);Object.freeze(start);
    const next=O.move(start,Object.freeze(at(0,30)));
    Object.freeze(next.start);Object.freeze(next.current);Object.freeze(next);
    expect(O.finish(next).open).toBe(true);
    expect(O.finish(O.move(next,origin)).complete).toBe(false);
  });
  it('publishes a browser global with the same API',()=>{
    const context={window:{}};
    vm.runInNewContext(readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_oven_door.js'),'utf8'),context);
    const browser=context.window.KitchenStudioOvenDoor;
    expect(Object.keys(browser).sort()).toEqual(['begin','finish','move','progress','tap']);
    expect(browser.finish(browser.move(browser.begin(origin),at(0,24)))).toMatchObject({complete:true,view:'oven',action:null,open:true});
  });
});
