import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};
describe('species-specific articulation',()=>{
  it('keeps caterpillar segments connected while varying their crawl phase and settling after stopping',()=>{
    const rows=api.compare(config).baseline,frames=api.behaviorTimeline(config,rows);let crawling=false,settled=false,feeding=false;
    for(let t=1;t<frames.length;t++)for(let i=0;i<16;i++){
      const p=frames[t].caterpillars[i],old=frames[t-1].caterpillars[i],parts=Array.from({length:14},(_,j)=>api.segmentPose(p,j));
      expect(Math.abs(p.crawl-old.crawl)).toBeLessThanOrEqual(0.18+1e-12);
      parts.forEach((part,j)=>{
        expect(Object.values(part).every(Number.isFinite)).toBe(true);expect(part.y).toBeGreaterThanOrEqual(0);expect(part.y).toBeLessThanOrEqual(0.008);
        if(j)expect(0.058+part.x-parts[j-1].x).toBeLessThan(0.084);
      });
      if(p.active&&p.crawl>0.8){crawling=true;expect(parts[0].x).not.toBe(parts[6].x);}
      if(p.active&&p.state==='Feeding'&&p.crawl===0){settled=true;expect(parts.every(part=>part.x===0&&part.y===0&&part.stretch===1)).toBe(true);feeding ||= parts[13].pitch<-.05;}
    }
    expect(crawling&&settled&&feeding).toBe(true);
  });
  it('banks owls into their actual turns and smoothly changes wingbeat amplitude',()=>{
    const frames=api.behaviorTimeline(config,api.compare(config).baseline);let left=false,right=false,gliding=false,flapping=false;
    for(let t=1;t<frames.length;t++)for(let i=0;i<16;i++){
      const p=frames[t].owls[i],old=frames[t-1].owls[i];
      expect(Math.abs(p.bank)).toBeLessThanOrEqual(.25);expect(Math.abs(p.bank-old.bank)).toBeLessThanOrEqual(.045+1e-12);
      expect(Math.abs(p.wingFlap-old.wingFlap)).toBeLessThanOrEqual(.12+1e-12);
      if(p.active){const delta=Math.atan2(Math.sin(p.yaw-old.yaw),Math.cos(p.yaw-old.yaw));
        if(delta>.03&&old.bank<=0){expect(p.bank).toBeLessThan(0);left=true;}
        if(delta<-.03&&old.bank>=0){expect(p.bank).toBeGreaterThan(0);right=true;}
        gliding ||= p.wingFlap===.12;flapping ||= p.wingFlap>.9;
      }
    }
    expect(left&&right&&gliding&&flapping).toBe(true);
  });
  it('replays articulation exactly without changing the model samples',()=>{
    const rows=api.compare(config).experiment,before=JSON.stringify(rows),a=api.behaviorTimeline(config,rows),b=api.behaviorTimeline(config,rows);
    expect(a).toEqual(b);expect(JSON.stringify(rows)).toBe(before);
    expect(a[0].caterpillars.every(p=>p.crawl===0)).toBe(true);expect(a[0].owls.every(p=>p.bank===0)).toBe(true);
  });
});
