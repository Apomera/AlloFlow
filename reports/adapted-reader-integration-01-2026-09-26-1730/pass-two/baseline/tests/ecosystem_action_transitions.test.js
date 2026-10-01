import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};
function sequence(){const rows=api.compare(config).baseline;return {rows,frames:api.behaviorTimeline(config,rows)};}
function find(frames,stage,age){
  for(let t=1;t<frames.length-20;t++)for(let i=0;i<16;i++){
    const p=frames[t].foxes[i];if(p.active&&p.huntStage===stage&&p.huntAge===age)return {t,i};
  }
  throw Error('No '+stage+' sequence observed');
}

describe('continuous representative actions',()=>{
  it('prepares, follows a fixed takeoff heading, lands at ground level, and recovers before another leap',()=>{
    const {frames}=sequence(),{t,i}=find(frames,'airborne',0),start=frames[t].foxes[i];
    expect(frames[t-1].foxes[i].state).toBe('Preparing to pounce');
    expect(start.altitude).toBeCloseTo(0.025,12);
    for(let offset=0;offset<=9;offset++){
      const p=frames[t+offset].foxes[i];expect(p.state).toBe('Pouncing');expect(p.yaw).toBe(start.yaw);
      if(offset)expect(Math.abs(p.altitude-frames[t+offset-1].foxes[i].altitude)).toBeLessThan(0.12);
    }
    expect(frames[t+4].foxes[i].altitude).toBeGreaterThan(0.3);
    expect(frames[t+9].foxes[i].altitude).toBeCloseTo(0.025,12);
    for(let offset=10;offset<16;offset++){
      const p=frames[t+offset].foxes[i];expect(p.state).toBe('Recovering');expect(p.moving).toBe(0);
      expect(p.altitude).toBeCloseTo(0.025,12);
    }
  });
  it('cancels preparation when prey disappears without lifting off',()=>{
    const {rows,frames}=sequence(),{t,i}=find(frames,'prepare',1);
    const changed=rows.map((row,j)=>j>t?{...row,values:{...row.values,rabbits:0,voles:0}}:row);
    const result=api.behaviorTimeline(config,changed);
    expect(result.slice(0,t+1)).toEqual(frames.slice(0,t+1));
    for(const frame of result.slice(t+1)){
      expect(frame.foxes[i].huntStage).toBe('');expect(frame.foxes[i].pounce).toBe(0);
      expect(frame.foxes[i].prey).toBe(null);
    }
  });
  it('finishes an airborne leap after prey removal without changing the sampled biomass',()=>{
    const {rows,frames}=sequence(),{t,i}=find(frames,'airborne',2);
    const changed=rows.map((row,j)=>j>t?{...row,values:{...row.values,rabbits:0,voles:0}}:row),before=JSON.stringify(changed);
    const result=api.behaviorTimeline(config,changed);
    for(let offset=1;offset<=7;offset++){
      const p=result[t+offset].foxes[i];expect(p.state).toBe('Pouncing');expect(p.prey).toBe(null);
      expect(p.altitude).toBe(frames[t+offset].foxes[i].altitude);expect(p.yaw).toBe(frames[t].foxes[i].yaw);
    }
    expect(result[t+8].foxes[i].state).toBe('Recovering');
    expect(JSON.stringify(changed)).toBe(before);
    expect(api.behaviorTimeline(config,changed)).toEqual(result);
  });
  it('blends feeding, rest, crouch, and head turns without abrupt pose jumps',()=>{
    const {frames}=sequence();let resting=false,feeding=false,crouching=false;
    for(let t=1;t<frames.length;t++)for(const id of Object.keys(frames[t]))for(let i=0;i<16;i++){
      const p=frames[t][id][i],old=frames[t-1][id][i];
      for(const [key,limit] of [['forage',0.18],['rest',0.14],['crouch',0.25],['headTurn',0.09]]){
        expect(Number.isFinite(p[key])).toBe(true);expect(Math.abs(p[key]-old[key])).toBeLessThanOrEqual(limit+1e-12);
      }
      if(p.active){resting ||= p.rest>0.8;feeding ||= p.forage>0.5;crouching ||= p.crouch>0.7;}
    }
    expect(resting&&feeding&&crouching).toBe(true);
  });
});
