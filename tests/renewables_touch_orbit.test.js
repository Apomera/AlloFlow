import fs from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const start=source.indexOf('  function rnEnergyPointerGesture('),end=source.indexOf('  function RenewablesEnergyScene(',start);
if(start<0||end<start)throw Error('Production pointer gesture helper not found');
const reduce=vm.runInNewContext('('+source.slice(start,end).trim()+')');
function gesture(kind='touch'){
  let state=null;
  return {get state(){return state;},send(type,x=0,y=0,extra={}){
    const input={id:1,pointerType:kind,x,y,button:0,isPrimary:true,canStart:true,...extra},before=JSON.stringify({state,input});
    const result=reduce(state,type,input);expect(JSON.stringify({state,input})).toBe(before);state=result.state;return result;
  }};
}
function inactive(result){expect(result.orbit).toBeFalsy();expect(result.pick).toBeFalsy();}

describe('Touch orbit intent and native gesture ownership',()=>{
  it('allows a stationary tap with small jitter without orbit or explicit touch capture',()=>{
    const g=gesture();const down=g.send('down',20,30);expect(down.capture).toBeFalsy();
    inactive(g.send('move',23,32));const up=g.send('up',22,31);expect(up.pick).toBeTruthy();expect(up.orbit).toBeFalsy();expect(up.release).toBeFalsy();
  });
  it('rotates only horizontally after a deliberate sideways swipe',()=>{
    const g=gesture();g.send('down');inactive(g.send('move',4,1));
    const first=g.send('move',16,2);expect(first.orbit.dx).toBeGreaterThan(0);expect(first.orbit.dy).toBe(0);
    const next=g.send('move',30,20);expect(next.orbit.dx).toBeGreaterThan(0);expect(next.orbit.dy).toBe(0);
    const reverse=g.send('move',10,20);expect(reverse.orbit.dx).toBeLessThan(0);expect(reverse.orbit.dy).toBe(0);
    inactive(g.send('up',10,20));
  });
  it.each([[1,12],[9,9],[-9,8]])('leaves vertical or ambiguous intent (%s,%s) with the page for the whole gesture',(x,y)=>{
    const g=gesture();g.send('down');inactive(g.send('move',x,y));inactive(g.send('move',100,y));inactive(g.send('up',100,y));
  });
  it('remembers travel away from the start even after returning to the original point',()=>{
    const g=gesture();g.send('down');g.send('move',30,0);g.send('move',0,0);inactive(g.send('up'));
    const scroll=gesture();scroll.send('down');scroll.send('move',0,30);scroll.send('move',0,0);inactive(scroll.send('up'));
  });
  it('does not convert a large release displacement into a tap when no move arrived',()=>{
    const g=gesture();g.send('down');inactive(g.send('up',25,0));
  });
  it.each(['up','cancel'])('suppresses both fingers until all contacts finish, regardless of %s order',ending=>{
    for(const first of[1,2]){
      const g=gesture();g.send('down');g.send('move',16,0);
      inactive(g.send('down',80,0,{id:2,isPrimary:false}));inactive(g.send('move',40,0));
      inactive(g.send(ending,40,0,{id:first,isPrimary:first===1}));
      const remaining=first===1?2:1;inactive(g.send('move',60,0,{id:remaining,isPrimary:remaining===1}));inactive(g.send('up',60,0,{id:remaining,isPrimary:remaining===1}));
      g.send('down',0,0,{id:3});expect(g.send('move',20,0,{id:3}).orbit.dx).toBeGreaterThan(0);inactive(g.send('up',20,0,{id:3}));
    }
  });
  it('suppresses an active canvas gesture when another finger lands outside it',()=>{
    const g=gesture();g.send('down');g.send('move',16,0);
    inactive(g.send('down',80,600,{id:2,isPrimary:false,canStart:false}));inactive(g.send('move',30,0));
    inactive(g.send('up',80,600,{id:2,isPrimary:false,canStart:false}));inactive(g.send('up',30,0));
  });
  it('does not arm a nonprimary finger when the first touch began outside the canvas',()=>{
    const g=gesture();inactive(g.send('down',20,20,{isPrimary:false}));inactive(g.send('move',40,20,{isPrimary:false}));inactive(g.send('up',40,20,{isPrimary:false}));
    g.send('down');expect(g.send('up').pick).toBeTruthy();
  });
  it('ignores unrelated moves, releases and cancellation without ending the owned pointer',()=>{
    const g=gesture();g.send('down');const state=JSON.stringify(g.state);
    for(const type of['move','up','cancel','lost']){inactive(g.send(type,40,40,{id:99,isPrimary:false}));expect(JSON.stringify(g.state)).toBe(state);}
    expect(g.send('move',20,0).orbit.dx).toBeGreaterThan(0);
  });
  it('treats duplicate down events as the same contact rather than a pinch',()=>{
    const g=gesture();g.send('down',5,5);g.send('down',5,5);expect(g.send('move',25,5).orbit.dx).toBeGreaterThan(0);
  });
  it('keeps a lost touch capture suppressed through the end of that contact',()=>{
    const g=gesture();g.send('down');inactive(g.send('lost'));inactive(g.send('move',30,0));inactive(g.send('up',30,0));
    g.send('down');expect(g.send('up').pick).toBeTruthy();
  });
  it('cancels native browser takeover without picking and accepts the next new gesture',()=>{
    const g=gesture();g.send('down');inactive(g.send('cancel'));inactive(g.send('move',30,0));inactive(g.send('up',30,0));
    g.send('down');expect(g.send('move',20,0).orbit.dx).toBeGreaterThan(0);
  });
  it('clears pending touches on reset without transferring ownership to leftover moves',()=>{
    const g=gesture();g.send('down');g.send('down',20,0,{id:2,isPrimary:false});inactive(g.send('reset'));
    inactive(g.send('move',40,0));inactive(g.send('up',40,0));g.send('down',0,0,{id:3});expect(g.send('up',0,0,{id:3}).pick).toBeTruthy();
  });
});

describe('Mouse and pen regression',()=>{
  for(const kind of['mouse','pen']){
    it(kind+' retains capture and two-axis orbit with no drag-end selection',()=>{
      const g=gesture(kind);expect(g.send('down',10,10).capture).toBe(1);inactive(g.send('move',12,11));
      const move=g.send('move',30,25);expect(move.orbit.dx).toBeGreaterThan(0);expect(move.orbit.dy).toBeGreaterThan(0);
      g.send('move',10,10);const up=g.send('up',10,10);expect(up.pick).toBeFalsy();expect(up.release).toBe(1);
      inactive(g.send('lost',10,10));
    });
    it(kind+' keeps clicking separate from cancellation and reset',()=>{
      const g=gesture(kind);g.send('down');expect(g.send('up').pick).toBeTruthy();
      for(const action of['cancel','lost','reset']){g.send('down');inactive(g.send(action));inactive(g.send('up'));}
    });
    it(kind+' ignores a different pointer and nonleft buttons',()=>{
      const g=gesture(kind);inactive(g.send('down',0,0,{button:2}));inactive(g.send('up',0,0,{button:2}));
      g.send('down');inactive(g.send('move',50,50,{id:4}));inactive(g.send('up',50,50,{id:4}));expect(g.send('up').pick).toBeTruthy();
    });
  }
});
