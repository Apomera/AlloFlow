import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const P=require('../stem_lab/kitchen_studio/recipe_lab_plating.js');
const cook=require('../dev-tools/kitchen_recipe_fixture.cjs');

function ready(servings=2){
  if(servings===2)return R.act(R.startRescue('dry',0),'taste');
  let s=R.start('mushroom',servings,'demonstrate');
  for(const [action,value] of cook('mushroom',servings).steps){
    if(action==='plate')break;
    s=R.act(s,action,value);
  }
  return s;
}
function allocate(s,amounts){
  amounts.forEach((amount,index)=>{for(let i=0;i<amount;i++)s=R.act(s,'servePortion',index,'scene-serve');});
  return s;
}
function freeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function checkForecast(s,from,to){
  const before=R.serving(s),snapshot=JSON.stringify(s),forecast=P.forecast(s,from,to,false);
  const action=from==='pan'?'servePortion':'returnPortion',plateIndex=from==='pan'?to:from;
  const next=R.act(s,action,plateIndex,'scene-serve'),after=R.serving(next);
  expect(next.log.at(-1).accepted).toBe(true);
  expect(forecast).toMatchObject({
    action,value:plateIndex,from,to,remainingBefore:before.remaining,remainingAfter:after.remaining,
    plateIndex,plateBefore:before.plates[plateIndex],plateAfter:after.plates[plateIndex],balancedAfter:after.balanced
  });
  expect(typeof forecast.summary).toBe('string');
  expect(forecast.summary.trim().length).toBeGreaterThan(0);
  expect(forecast.remainingAfter+after.served).toBe(s.servings*4);
  expect(forecast.remainingAfter-forecast.remainingBefore).toBe(from==='pan'?-1:1);
  expect(forecast.plateAfter-forecast.plateBefore).toBe(from==='pan'?1:-1);
  expect(after.plates.filter((_,i)=>i!==plateIndex)).toEqual(before.plates.filter((_,i)=>i!==plateIndex));
  expect(next.time).toBe(s.time);
  expect(next.pan).toEqual(s.pan);
  expect(next.pot).toEqual(s.pot);
  expect(JSON.stringify(s)).toBe(snapshot);
  return forecast;
}

describe('Serving forecast before a deliberate transfer',()=>{
  it.each([2,4])('matches canonical forward and return transfers for all %i plates',servings=>{
    const s=ready(servings);
    for(let plate=0;plate<servings;plate++){
      checkForecast(s,'pan',plate);
      checkForecast(R.act(s,'servePortion',plate),plate,'pan');
    }
  });

  it('matches every reachable two-person allocation without losing or inventing a spoonful',()=>{
    const start=ready();
    for(let a=0;a<=8;a++)for(let b=0;b<=8-a;b++){
      const s=allocate(start,[a,b]),portion=R.serving(s);
      for(let plate=0;plate<2;plate++){
        if(portion.remaining)checkForecast(s,'pan',plate);
        else expect(P.forecast(s,'pan',plate,false)).toBeNull();
        if(portion.plates[plate])checkForecast(s,plate,'pan');
        else expect(P.forecast(s,plate,'pan',false)).toBeNull();
      }
    }
  });

  it.each([2,4])('forecasts underfilled, full and overfilled plates across the complete %i-person batch',servings=>{
    const start=ready(servings),total=servings*4;
    for(let plate=0;plate<servings;plate++){
      let s=start;
      for(let amount=0;amount<=total;amount++){
        expect(R.serving(s).plates[plate]).toBe(amount);
        if(amount>0)checkForecast(s,plate,'pan');
        if(amount<total){checkForecast(s,'pan',plate);s=R.act(s,'servePortion',plate);}
        else expect(P.forecast(s,'pan',plate,false)).toBeNull();
      }
    }
  });

  it.each([2,4])('recognizes the final balancing spoonful and a return that breaks the %i-plate balance',servings=>{
    const amounts=Array(servings).fill(4);amounts[servings-1]=3;
    const s=allocate(ready(servings),amounts);
    expect(R.serving(s).balanced).toBe(false);
    expect(checkForecast(s,'pan',servings-1).balancedAfter).toBe(true);
    const balanced=R.act(s,'servePortion',servings-1);
    expect(R.serving(balanced).balanced).toBe(true);
    for(let plate=0;plate<servings;plate++)expect(checkForecast(balanced,plate,'pan').balancedAfter).toBe(false);
  });

  it('does not call an empty but uneven pan balanced and previews rebalancing through the pan',()=>{
    const s=allocate(ready(),[5,3]);
    expect(P.forecast(s,'pan',1,false)).toBeNull();
    const back=checkForecast(s,0,'pan');
    expect(back).toMatchObject({plateBefore:5,plateAfter:4,remainingBefore:0,remainingAfter:1,balancedAfter:false});
    const returned=R.act(s,back.action,back.value);
    expect(checkForecast(returned,'pan',1)).toMatchObject({plateBefore:3,plateAfter:4,remainingBefore:1,remainingAfter:0,balancedAfter:true});
  });

  it('is repeatable on deeply frozen state and never reserves food or records an action',()=>{
    const s=freeze(allocate(ready(),[2,1])),snapshot=JSON.stringify(s),count=s.log.length;
    const first=P.forecast(s,'pan',1,false);
    for(let i=0;i<12;i++){
      expect(P.forecast(s,'pan',1,false)).toEqual(first);
      checkForecast(s,0,'pan');
    }
    expect(s.log.length).toBe(count);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(R.serving(s)).toMatchObject({plates:[2,1],remaining:5});
  });

  it.each([2,4])('rejects malformed, nonexistent and plate-to-plate endpoints for %i servings',servings=>{
    const s=allocate(ready(servings),Array(servings).fill(1));
    for(const endpoint of [-1,servings,4,99,.5,NaN,Infinity,'0','plate 1',null,undefined,{},[]]){
      expect(P.forecast(s,'pan',endpoint,false)).toBeNull();
      expect(P.forecast(s,endpoint,'pan',false)).toBeNull();
    }
    expect(P.forecast(s,'pan','pan',false)).toBeNull();
    for(let from=0;from<servings;from++)for(let to=0;to<servings;to++)expect(P.forecast(s,from,to,false)).toBeNull();
  });

  it('rejects replay interaction even when the historical dish could otherwise serve',()=>{
    const before=allocate(ready(),[1,0]),finished=R.submit({...R.act(allocate(before,[3,4]),'plate'),answers:[0,0]});
    const index=finished.log.findIndex(e=>e.action==='servePortion')+1,frame=R.replay(finished,index);
    expect(frame).not.toBeNull();
    expect(R.serving(frame.state)).toMatchObject({ready:true,plates:[1,0]});
    expect(P.forecast(frame.state,'pan',1,true)).toBeNull();
    expect(P.forecast(frame.state,0,'pan',true)).toBeNull();
  });

  it.each([
    ['unchecked',s=>({...s,pan:{...s.pan,tasted:false}})],
    ['uncombined',s=>({...s,pan:{...s.pan,combined:false}})],
    ['pot burner on',s=>({...s,pot:{...s.pot,heat:1}})],
    ['pan burner on',s=>({...s,pan:{...s.pan,heat:1}})],
    ['time limit',s=>({...s,time:3600})],
    ['action limit',s=>({...s,log:[...s.log,...Array(1200-s.log.length).fill({action:'taste',accepted:false})]})],
    ['plated',s=>({...s,plated:true})],
    ['submitted',s=>({...s,submitted:true})]
  ])('does not promise a transfer when the dish is %s',(_label,change)=>{
    const s=change(allocate(ready(),[1,0])),snapshot=JSON.stringify(s);
    expect(P.forecast(s,'pan',1,false)).toBeNull();
    expect(P.forecast(s,0,'pan',false)).toBeNull();
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('permits the final action before the limits without claiming more capacity afterwards',()=>{
    const original=allocate(ready(),[1,0]);
    const s={...original,time:3599,log:[...original.log,...Array(1199-original.log.length).fill({action:'taste',accepted:false})]};
    const forecast=checkForecast(s,'pan',1),after=R.act(s,forecast.action,forecast.value);
    expect(after.log.length).toBe(1200);
    expect(P.forecast(after,'pan',0,false)).toBeNull();
    expect(P.forecast(after,1,'pan',false)).toBeNull();
  });
});
