
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesModel;});
describe('Renewables transition hourly model',()=>{
  it('conserves power in every region and storage energy across every hour',()=>{
    for(const settings of [{},{year:2050,solarBuild:80,windBuild:60,batteryBuild:40,duration:24},{year:2050,weather:'lull',retirement:16},{transmission:0,season:'winter'},{hours:168,year:2050,solarBuild:60,batteryBuild:35,duration:12,reserve:40,transferLoss:15,flexDemand:25,outageRegion:'northeast',outageStart:48,outageHours:60}]){
      const run=model.simulate(settings);let previous=0;
      for(const hour of run.hours){
        expect(hour.regions.reduce((n,r)=>n+r.imports-r.exports+r.transmissionLoss,0)).toBeCloseTo(0,8);
        for(const r of hour.regions){
          const sources=r.renewable+r.nuclear+r.fossil+r.discharge+r.imports;
          const sinks=r.demand-r.unmet+r.charge+r.exports+r.curtail;
          expect(sources-sinks).toBeCloseTo(0,8);
          expect(r.battery).toBeGreaterThanOrEqual(0);
          expect(r.battery).toBeLessThanOrEqual(r.batteryCapacity+1e-8);
          expect(r.charge).toBeLessThanOrEqual(r.batteryPower+1e-8);
          expect(r.discharge).toBeLessThanOrEqual(r.batteryPower+1e-8);
          expect(r.charge*r.discharge).toBe(0);
          expect(r.imports).toBeLessThanOrEqual(run.capacity.link+1e-8);
          expect(r.exports).toBeLessThanOrEqual(run.capacity.link+1e-8);
          expect(r.servedRenewable).toBeGreaterThanOrEqual(0);
          expect(r.servedRenewable).toBeLessThanOrEqual(r.demand-r.unmet+1e-8);
        }
        expect(hour.battery-previous-hour.charge+hour.discharge+hour.loss).toBeCloseTo(0,8);
        previous=hour.battery;
      }
      expect(run.totals.charge-run.totals.discharge-run.totals.loss-run.totals.endBattery).toBeCloseTo(0,7);
    }
  },30000);
  it('keeps empty storage from creating electricity',()=>{
    const run=model.simulate({year:2025,weather:'lull',season:'winter'});
    expect(run.totals.charge).toBe(0);
    expect(run.totals.discharge).toBe(0);
    expect(run.totals.endBattery).toBe(0);
    expect(run.totals.servedRenewable).toBeCloseTo(run.totals.renewable,8);
  });
  it('treats capacity, annual additions, power and duration as separate quantities',()=>{
    const cap=model.portfolio({year:2035,solarBuild:25,windBuild:18,batteryBuild:10,duration:8});
    expect(cap.solar).toBe(490);expect(cap.wind).toBe(340);
    expect(cap.batteryPower).toBe(130);expect(cap.batteryEnergy).toBe(1040);
    expect(model.portfolio({year:2025,solarBuild:80}).solar).toBe(240);
  });
  it('has no solar generation outside each region daylight window',()=>{
    const run=model.simulate({season:'winter'});
    for(const h of run.hours)for(const [i,r] of h.regions.entries()){
      const local=((h.hour+model.regions[i].offset)%24+24)%24;
      if(local<7.5||local>16.5)expect(r.solar).toBe(0);
    }
  });
  it('turns off all transfers when regional links are zero',()=>{
    const run=model.simulate({transmission:0,year:2050,solarBuild:80});
    expect(run.totals.transfer).toBe(0);
    for(const hour of run.hours)for(const r of hour.regions){expect(r.imports).toBe(0);expect(r.exports).toBe(0);}
  });
  it('produces actual transfers and caps them by both offers and demand',()=>{
    const run=model.simulate({year:2050,solarBuild:80,transmission:5});
    expect(run.totals.transfer).toBeGreaterThan(0);
    for(const hour of run.hours)expect(hour.transfer).toBeLessThanOrEqual(15+1e-8);
  });
  it('makes weather lulls reduce renewable generation and heat waves increase demand',()=>{
    const normal=model.simulate({}),lull=model.simulate({weather:'lull'}),heat=model.simulate({weather:'heatwave'});
    expect(lull.totals.renewable).toBeLessThan(normal.totals.renewable);
    expect(heat.totals.demand/normal.totals.demand).toBeCloseTo(1.2,8);
    expect(lull.totals.fossil).toBeGreaterThan(normal.totals.fossil);
  });
  it('exposes shortages when retiring capacity faster than replacements cover the lull',()=>{
    const run=model.simulate({year:2050,weather:'lull',retirement:16,growth:3,efficiency:0,solarBuild:0,windBuild:0,batteryBuild:0});
    expect(run.totals.gapHours).toBeGreaterThan(0);
    expect(run.totals.demandMet).toBeLessThan(100);
  });
  it('bounds malformed saved inputs and stays deterministic',()=>{
    const invalid={year:Infinity,solarBuild:-90,windBuild:NaN,batteryBuild:'90',duration:0,efficiency:100,transmission:9999,weather:'storm'};
    const run=model.simulate(invalid);
    expect(run.settings.year).toBe(2035);expect(run.settings.solarBuild).toBe(0);
    expect(run.settings.duration).toBe(1);expect(run.settings.efficiency).toBe(30);
    expect(run.settings.transmission).toBe(100);expect(run.settings.weather).toBe('fair');
    expect(run).toEqual(model.simulate(invalid));
    expect(JSON.stringify(run)).not.toContain('null');
  });
  it('keeps resource allocation weights normalized',()=>{
    for(const key of ['weight','solar','turbines','hydro'])expect(model.regions.reduce((n,r)=>n+r[key],0)).toBeCloseTo(1,10);
  });
});
describe('Transition UI entry and model transparency',()=>{
  it('makes the sandbox reachable in the core library',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{}});
    expect(html).toContain('US transition sandbox');
  });
  it('renders the workbench, equivalent data, and honest model boundaries',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'transition'}});
    for(const text of ['US transition sandbox','Adoption timeline','New solar','New wind','Battery duration','Link capacity per region','Read hourly data','Save scenario','Export investigation','88% round-trip','not calibrated','not annual reliability'])expect(html).toContain(text);
    expect(html).toContain('data-render-status="loading"');
    expect(html).toContain('scope="col"');
    expect(html).toContain('aria-label="Selected region measurements"');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('failed to render');
  });
});

describe('Regional planning and resilience',()=>{
  it('runs an entire week and clips timed outages at the run boundary',()=>{
    const run=model.simulate({hours:168,outageRegion:'west',outageStart:160,outageHours:72});
    expect(run.hours).toHaveLength(168);expect(run.settings.outageHours).toBe(8);
    expect(run.regionTotals[0].offlineHours).toBe(8);
    expect(run.hours[159].regions[0].linkOffline).toBe(false);
    expect(run.hours[160].regions[0].linkOffline).toBe(true);
    expect(run.totals.endBattery).toBe(run.hours[167].battery);
  });
  it('allocates only new construction and conserves national installed capacity',()=>{
    const config={year:2045,siting:{west:{solar:300,wind:0,battery:0},northeast:{solar:0,wind:300,battery:300}}};
    const cap=model.portfolio(config),base=model.portfolio({year:2025,siting:config.siting});
    for(const k of ['solar','wind','hydro','nuclear','fossil','batteryPower','batteryEnergy'])expect(cap.regions.reduce((sum,r)=>sum+r[k],0)).toBeCloseTo(cap[k],8);
    expect(cap.regions[0].solar).toBeGreaterThan(model.portfolio({year:2045}).regions[0].solar);
    expect(cap.regions[0].wind).toBe(base.regions[0].wind);
    expect(cap.regions[4].solar).toBe(base.regions[4].solar);
    expect(base.regions[0].solar).toBeCloseTo(240*.23,8);
  });
  it('recovers default allocation when all siting weights are zero',()=>{
    const siting=Object.fromEntries(model.regions.map(r=>[r.id,{solar:0,wind:0,battery:0}]));
    const p=model.portfolio({siting}),normal=model.portfolio({});
    expect(p.regions).toEqual(normal.regions);
  });
  it('changes regional generation when the same national portfolio is sited differently',()=>{
    const a=model.simulate({}),b=model.simulate({siting:{west:{solar:300},southeast:{solar:0}}});
    expect(b.capacity.solar).toBe(a.capacity.solar);
    expect(b.totals.renewable).not.toBe(a.totals.renewable);
  });
  it('moves evening energy to midday without reducing total or regional demand',()=>{
    const a=model.simulate({hours:168}),b=model.simulate({hours:168,flexDemand:30});
    expect(b.totals.demand).toBeCloseTo(a.totals.demand,8);
    expect(b.totals.shifted).toBeGreaterThan(0);
    for(let i=0;i<6;i++)expect(b.regionTotals[i].demand).toBeCloseTo(a.regionTotals[i].demand,8);
    expect(b.hours[19].regions[4].demand).toBeCloseTo(a.hours[19].regions[4].demand*.7,8);
    expect(b.hours[12].regions[4].demand).toBeGreaterThan(a.hours[12].regions[4].demand);
  });
  it('accounts for transmission losses exactly once and exposes delivered transfers',()=>{
    const run=model.simulate({year:2050,solarBuild:80,transferLoss:10});
    expect(run.totals.transmissionLoss).toBeGreaterThan(0);
    const exports=run.hours.reduce((n,h)=>n+h.regions.reduce((m,r)=>m+r.exports,0),0);
    expect(run.totals.transfer).toBeCloseTo(exports*.9,8);
    expect(run.totals.transmissionLoss).toBeCloseTo(exports*.1,8);
    expect(run.totals.renewable+run.totals.nuclear+run.totals.fossil+run.totals.discharge-run.totals.demand+run.totals.unmet-run.totals.charge-run.totals.curtail-run.totals.transmissionLoss).toBeCloseTo(0,7);
  });
  it('isolates only the selected region during the exact outage window',()=>{
    const run=model.simulate({outageRegion:'northeast',outageStart:12,outageHours:24});
    for(const hour of run.hours){
      const r=hour.regions[4];
      expect(r.linkOffline).toBe(hour.hour>=12&&hour.hour<36);
      if(r.linkOffline){expect(r.imports).toBe(0);expect(r.exports).toBe(0);expect(r.link).toBe(0);}
      expect(hour.regions[0].linkOffline).toBe(false);
    }
  });
  it('keeps reserve releases inside energy and power limits',()=>{
    const run=model.simulate({year:2050,solarBuild:80,windBuild:0,batteryBuild:40,duration:8,reserve:50,retirement:16,transmission:0});
    expect(run.totals.reserveRelease).toBeGreaterThan(0);
    for(const hour of run.hours)for(const r of hour.regions){
      expect(r.reserveRelease).toBeLessThanOrEqual(r.discharge+1e-8);
      expect(r.discharge).toBeLessThanOrEqual(r.batteryPower+1e-8);
      if(r.reserveRelease>1e-8)expect(r.fossil).toBeCloseTo(run.capacity.regions.find(c=>c.id===r.id).fossil,8);
    }
  });
  it('reports the actual hardest hour and longest consecutive shortage',()=>{
    const run=model.simulate({year:2050,weather:'lull',retirement:16,growth:3,efficiency:0,solarBuild:0,windBuild:0,batteryBuild:0,hours:168});
    expect(run.hours[run.totals.worstHour].unmet).toBe(Math.max(...run.hours.map(h=>h.unmet)));
    let longest=0,streak=0;for(const h of run.hours){streak=h.unmet>1e-6?streak+1:0;longest=Math.max(longest,streak);}
    expect(run.totals.longestGap).toBe(longest);
    expect(run.regionTotals.reduce((n,r)=>n+r.unmet,0)).toBeCloseTo(run.totals.unmet,8);
  });
  it('runs four comparable week-long stresses without changing the plan',()=>{
    const input={year:2040,flexDemand:15,siting:{west:{solar:300}}},copy=JSON.stringify(input);
    const suite=model.stressSuite(input);
    expect(suite).toHaveLength(4);
    expect(JSON.stringify(input)).toBe(copy);
    for(const run of suite){expect(run.settings.hours).toBe(168);expect(run.settings.year).toBe(2040);expect(run.settings.flexDemand).toBe(15);expect(run.settings.siting.west.solar).toBe(300);}
    expect(suite.find(r=>r.id==='outage').settings.outageHours).toBe(48);
  });
});

describe('Expanded planning UI and saved-model migration',()=>{
  it('renders week-long controls, regional siting, and explicit loss assumptions',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'transition',transitionLab:{settings:{hours:168}}}});
    for(const label of ['Seven days','Solar siting weight','Evening demand shifted to midday','End-to-end transfer loss','Storage reserve target','Region with a link outage','Stored energy through the test','Find the weak point','Run four stress tests','Calculate six milestones','168-hour scenario summary'])expect(html).toContain(label);
    expect(html).not.toContain('NaN');
  });
  it('recalculates a legacy saved plan under the current model rather than trusting old totals',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'transition',transitionLab:{snapshots:[{label:'Legacy plan',settings:{year:2035},totals:{renewableShare:987654,fossil:999999999,gapHours:90000}}]}}});
    expect(html).toContain('Legacy plan');expect(html).toContain('model version 2');
    const doc=new DOMParser().parseFromString(html,'text/html');
    const cells=doc.querySelector('[aria-label="Saved scenario results"] tbody tr').querySelectorAll('td');
    expect(cells[1].textContent).not.toContain('987');
    expect(cells[3].textContent).toBe(String(model.simulate({year:2035}).totals.gapHours));
    expect(html).toContain('aria-label="Saved scenario results"');
  });
});


describe('Controlled experiments and planning challenges',()=>{
  it('samples one variable, includes the current baseline, and preserves every other assumption',()=>{
    const input={year:2045,hours:168,weather:'lull',season:'winter',duration:7,transferLoss:9,siting:{west:{solar:230}},outageRegion:'west',outageStart:48,outageHours:24};
    const original=JSON.stringify(input),study=model.sweep(input,'duration');
    expect(study.items.map(r=>r.value)).toEqual([1,4,7,8,12,24]);
    for(const row of study.items){
      expect({...row.settings,duration:7}).toEqual(study.baseline.settings);
      expect(row.totals).toEqual(model.simulate(row.settings).totals);
      expect(row.delta.fossil).toBeCloseTo(row.totals.fossil-study.baseline.totals.fossil,8);
      expect(row.delta.unmet).toBeCloseTo(row.totals.unmet-study.baseline.totals.unmet,8);
    }
    expect(study.items.find(r=>r.value===7).delta).toEqual({fossil:0,unmet:0,curtail:0,renewableShare:0});
    expect(JSON.stringify(input)).toBe(original);
    expect(model.sweep({},'weather')).toBeNull();
  });
  it('keeps a comparison valid when loading its variable but expires it when another assumption changes',()=>{
    const study=model.sweep({duration:7},'duration');
    expect(model.sweepFresh(study,{duration:12},'duration')).toBe(true);
    expect(model.sweepFresh(study,{duration:12,season:'winter'},'duration')).toBe(false);
    expect(model.sweepFresh(study,{duration:12,siting:{west:{wind:101}}},'duration')).toBe(false);
    expect(model.sweepFresh(study,{duration:7},'transmission')).toBe(false);
    expect(model.sweepFresh(null,{},'duration')).toBe(false);
  });
  it('shows that additional storage duration cannot generate energy when storage never charges',()=>{
    const study=model.sweep({year:2025,weather:'lull',season:'winter'},'duration');
    expect(study.items.every(r=>r.totals.charge===0&&r.totals.discharge===0)).toBe(true);
    expect(study.items.every(r=>r.delta.fossil===0&&r.delta.unmet===0)).toBe(true);
  });
  for(const [id,solution] of Object.entries({
    evening:{batteryBuild:15,duration:8,flexDemand:20},
    connections:{transmission:40},
    winter:{solarBuild:80,windBuild:60,efficiency:30,retirement:4,flexDemand:30}
  })){
    it('provides an initially unmet and achievable '+id+' challenge',()=>{
      const challenge=model.challenges.find(c=>c.id===id);
      expect(model.assessChallenge(id,challenge.baseline).passed).toBe(false);
      const assessment=model.assessChallenge(id,{...challenge.baseline,...solution});
      expect(assessment.valid).toBe(true);
      expect(assessment.targets.every(t=>t.passed)).toBe(true);
      expect(assessment.passed).toBe(true);
    });
  }
  it('rejects solutions that alter fixed conditions or site additional generation elsewhere',()=>{
    const c=model.challenges.find(c=>c.id==='connections'),settings={...c.baseline,transmission:80,weather:'heatwave',siting:{west:{solar:200}}};
    const assessment=model.assessChallenge(c.id,settings);
    expect(assessment.valid).toBe(false);expect(assessment.passed).toBe(false);
    expect(assessment.changed).toEqual(['weather','siting']);
    expect(model.assessChallenge('missing',{})).toBeNull();
  });
});

describe('Dispatch explanations',()=>{
  it('accounts for local sources, uses, and actual storage history without counting unmet demand as a use',()=>{
    const run=model.simulate({year:2050,solarBuild:80,transmission:15,transferLoss:12,retirement:16});
    for(const index of [0,12,20,36,71])for(const region of model.regions){
      const evidence=model.explainHour(run,index,region.id),row=run.hours[index].regions.find(r=>r.id===region.id);
      expect(evidence.sourcePower).toBeCloseTo(evidence.usedPower,8);
      expect(evidence.uses[0].value).toBeCloseTo(row.demand-row.unmet,8);
      expect(evidence.storageAfter).toBe(row.battery);
      expect(evidence.storageBefore).toBe(index?run.hours[index-1].regions.find(r=>r.id===region.id).battery:0);
    }
  });
  it('distinguishes empty energy, charge power limits, and discharge power limits',()=>{
    const run=model.simulate({year:2050,solarBuild:80,windBuild:0,batteryBuild:1,duration:24,transmission:0});
    const codes=(hour,region)=>model.explainHour(run,hour,region).notes.map(n=>n.code);
    expect(codes(0,'west')).toEqual(expect.arrayContaining(['night','disconnected','empty-start']));
    expect(codes(7,'mountain')).toContain('charge-limit');
    expect(codes(17,'northeast')).toContain('discharge-limit');
    expect(run.hours[17].regions[4].battery).toBeGreaterThan(0);
    const full=model.simulate({year:2050,solarBuild:80,batteryBuild:5,duration:1,transmission:0});
    expect(model.explainHour(full,1,'mountain').notes.map(n=>n.code)).toContain('full');
  });
  it('reports an outage only inside its scheduled window and bounds invalid selections',()=>{
    const run=model.simulate({outageRegion:'northeast',outageStart:24,outageHours:5});
    expect(model.explainHour(run,24,'northeast').notes.map(n=>n.code)).toContain('offline');
    expect(model.explainHour(run,29,'northeast').notes.map(n=>n.code)).not.toContain('offline');
    expect(model.explainHour(run,-10,'invalid').hour).toBe(0);
    expect(model.explainHour(run,999,'invalid').region).toBe('west');
    expect(model.explainHour(run,999,'invalid').hour).toBe(71);
  });
  it('renders the guided challenge, experiment controls, and selected-hour explanation accessibly',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'transition',transitionLab:{challenge:{id:'connections'},settings:{year:2040,transmission:40}}}});
    for(const text of ['Planning challenges','Planning challenge: Share the regional surplus','Experiment variable','Controlled experiment bench','Explain this hour in Pacific','Power into the region','Power accounted for','Restore required settings','Return to previous plan'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
