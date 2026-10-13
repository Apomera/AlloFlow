import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let model,grid;
const pv={irradiance:1000,area:20,efficiency:20,incidence:0};
const wind={speed:8,radius:40,cp:40,rating:3000};
const exported=(id,settings)=>({format:'renewables-mechanism-investigation',modelVersion:1,selected:id,settings,phase:20,readingName:'Legacy conditions'});
const close=(a,b)=>expect(a).toBeCloseTo(b,9);
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesEnergyModel;grid=window.StemLab.renewablesMicrogridModel;});

describe('Selected PV cell temperature and wind air density',()=>{
  it('preserves the original reference-condition outputs when older settings omit the new controls',()=>{
    const solar=model.simulate('solarPv',pv),turbine=model.simulate('wind',wind);
    close(solar.power,3.84);expect(solar.settings.cellTemperature).toBe(25);expect(solar.extra.temperatureFactor).toBe(1);
    close(turbine.power,.5*1.225*Math.PI*40**2*8**3*.4*.94/1000);expect(turbine.settings.airDensity).toBe(1.225);
  });

  it('changes PV conversion relative to 25°C without changing intercepted light or double-counting heat',()=>{
    for(const [cellTemperature,factor] of [[-20,1.1665],[25,1],[65,.852],[85,.778]]){
      const run=model.simulate('solarPv',{...pv,cellTemperature}),path=model.pathway(run);
      close(run.available,20);close(run.power,3.84*factor);close(run.stages[1].value,4*factor);
      close(run.extra.referenceDc,4);close(run.extra.effectiveModuleEfficiency,.2*factor);close(run.extra.temperatureFactor,factor);close(run.extra.temperaturePowerDelta,3.84*(factor-1));
      close(path.budget.segments.reduce((sum,s)=>sum+s.value,0),20);
      expect(path.budget.segments.every(s=>s.value>=0)).toBe(true);
    }
  });

  it('keeps dark and grazing-incidence arrays at zero throughout the temperature range',()=>{
    for(const cellTemperature of [-20,25,85])for(const dark of [{irradiance:0},{incidence:90}]){
      const run=model.simulate('solarPv',{...pv,cellTemperature,...dark});
      expect(run.power).toBe(0);expect(run.available).toBe(0);expect(run.loss).toBe(0);expect(run.extra.temperaturePowerDelta).toBe(0);
    }
  });

  it('uses the selected cell temperature consistently in scenarios, intervals, sweeps, and operating probes',()=>{
    const reference=model.scenario('solarPv',pv,'clouds'),warm=model.scenario('solarPv',{...pv,cellTemperature:65},'clouds');
    close(warm.totals.delivered,reference.totals.delivered*.852);
    close(model.interval(warm,{start:25,end:80}).energy.delivered,model.interval(reference,{start:25,end:80}).energy.delivered*.852);
    const envelope=model.operatingEnvelope('solarPv',{settings:pv,key:'cellTemperature',profileId:'clouds',minute:50});
    expect(envelope.axis.unit).toBe('°C');expect(envelope.insight).toContain('not ambient air temperature');
    const probe=model.operatingProbe('solarPv',{settings:pv,key:'cellTemperature',profileId:'clouds',minute:50},65);
    expect(probe.run).toEqual(warm.rows[50].run);
    const sweep=model.sweep('solarPv',{settings:pv,config:{key:'cellTemperature',low:25,high:65,count:5}});
    close(sweep.rows[0].result.value,3.84);close(sweep.rows.at(-1).result.value,3.84*.852);
  });

  it('makes unsaturated wind power proportional to air density and keeps fixed safety boundaries',()=>{
    const reference=model.simulate('wind',wind);
    for(const airDensity of [.7,1.225,1.4]){
      const run=model.simulate('wind',{...wind,airDensity});close(run.power,reference.power*airDensity/1.225);close(run.available-run.power,run.loss);
      expect(model.simulate('wind',{...wind,airDensity,speed:2.99}).status).toBe('Below cut-in');
      expect(model.simulate('wind',{...wind,airDensity,speed:25}).status).toBe('Protective shutdown');
      expect(model.simulate('wind',{...wind,airDensity,speed:24,rating:500}).power).toBe(500);
    }
  });

  it('moves the rated wind speed with density and locates the density threshold using the same physical equation',()=>{
    const high=model.operatingEnvelope('wind',{settings:{...wind,airDensity:1.4},key:'speed'}),low=model.operatingEnvelope('wind',{settings:{...wind,airDensity:.7},key:'speed'});
    const rated=envelope=>envelope.thresholds.find(t=>t.kind==='rating').x;
    close(rated(low)/rated(high),Math.cbrt(2));
    const settings={...wind,speed:12,rating:1500},envelope=model.operatingEnvelope('wind',{settings,key:'airDensity'}),threshold=rated(envelope);
    close(threshold,1500/(.5*Math.PI*40**2*12**3*.4*.94/1000));
    close(model.operatingProbe('wind',{settings,key:'airDensity'},threshold).power,1500);
    expect(model.operatingProbe('wind',{settings,key:'airDensity'},threshold-.01).power).toBeLessThan(1500);
    expect(model.operatingProbe('wind',{settings,key:'airDensity'},threshold+.01).power).toBe(1500);
    expect(model.operatingEnvelope('wind',{settings:{...settings,speed:25},key:'airDensity'}).thresholds).toEqual([]);
  });

  it('uses density in all remaining generator-rating axes and replays the same scenario minute',()=>{
    const settings={...wind,speed:12,airDensity:.9,rating:1500},coefficient=.5*.9*Math.PI*.94/1000;
    const threshold=key=>model.operatingEnvelope('wind',{settings,key}).thresholds.find(t=>t.kind==='rating').x;
    close(threshold('radius'),Math.sqrt(1500/(coefficient*12**3*.4)));
    close(threshold('cp'),1500*100/(coefficient*40**2*12**3));
    close(threshold('rating'),coefficient*40**2*12**3*.4);
    const request={settings:wind,key:'airDensity',profileId:'gust',minute:25},probe=model.operatingProbe('wind',request,.8);
    expect(probe.run).toEqual(model.scenario('wind',{...wind,airDensity:.8},'gust').rows[25].run);
  });

  it('passes physical conditions through primary and companion generation into microgrid accounting',()=>{
    const run=grid.simulate({source:'solarPv',sourceSettings:{...pv,cellTemperature:65},profileId:'steady',sourceUnits:2,demand:0,batteryUnits:0,companion:{enabled:true,source:'wind',sourceSettings:{...wind,airDensity:.9},profileId:'steady',sourceUnits:3}});
    const row=run.rows[0];close(row.primaryGeneration,3.84*.852*2);close(row.companionGeneration,model.simulate('wind',{...wind,airDensity:.9}).power*3);
    close(row.generation,row.primaryGeneration+row.companionGeneration);close(run.totals.generation,run.totals.curtailed);
    expect(row.sourceRun.settings.cellTemperature).toBe(65);expect(row.companionRun.settings.airDensity).toBe(.9);
  });

  it('normalizes finite experimental ranges without modifying caller settings',()=>{
    const input={...pv,cellTemperature:999},copy={...input};expect(model.settings('solarPv',input).cellTemperature).toBe(85);expect(input).toEqual(copy);
    expect(model.settings('solarPv',{cellTemperature:-999}).cellTemperature).toBe(-20);expect(model.settings('solarPv',{cellTemperature:NaN}).cellTemperature).toBe(25);
    expect(model.settings('wind',{airDensity:0}).airDensity).toBe(.7);expect(model.settings('wind',{airDensity:100}).airDensity).toBe(1.4);expect(model.settings('wind',{airDensity:'1'}).airDensity).toBe(1.225);
  });

  it('opens legacy current and notebook exports at the original reference conditions and explains each default',()=>{
    const payload={...exported('solarPv',pv),notebooks:[{id:'wind',readings:[{baseSettings:wind,profileId:'steady',phase:5,name:'Old wind reading'}]}]},before=JSON.stringify(payload);
    const imported=model.importReadings(payload);expect(imported.skipped).toEqual([]);expect(imported.entries).toHaveLength(2);expect(JSON.stringify(payload)).toBe(before);
    expect(imported.entries[0].settings.cellTemperature).toBe(25);expect(imported.entries[0].warnings[0]).toContain('used 25 °C');
    expect(imported.entries[1].settings.airDensity).toBe(1.225);expect(imported.entries[1].warnings[0]).toContain('used 1.225 kg/m³');
    const state=model.openImportedReading({},imported.entries[0]);close(model.resolveReading('solarPv',{settings:state.settings.solarPv}).run.power,3.84);
  });

  it('rejects malformed new fields and missing original fields rather than treating them as old exports',()=>{
    for(const [id,base,key,low,high] of [['solarPv',pv,'cellTemperature',-20,85],['wind',wind,'airDensity',.7,1.4]]){
      for(const value of [undefined,null,'25',NaN,Infinity,low-.01,high+.01])expect(()=>model.importReadings(exported(id,{...base,[key]:value}))).toThrow(/No supported readings/);
      const broken={...base};delete broken[Object.keys(base)[0]];expect(()=>model.importReadings(exported(id,broken))).toThrow(/No supported readings/);
      const supplied=exported(id,{...base,[key]:low}),entry=model.importReadings(supplied).entries[0];expect(entry.settings[key]).toBe(low);expect(entry.warnings).toEqual([]);
    }
  });

  it('shows the environmental controls, units, reference assumptions, and primary sources',()=>{
    for(const [id,label,source] of [['solarPv','PV cell temperature','samrepo.nlr.gov/help/pvwatts_system_design.html'],['wind','Air density','energy.gov/cmei/systems/windexchange/small-wind-guidebook']]){
      const html=renderTool('renewablesLab',{renewablesLab:{view:'energy3d',energyLab:{selected:id}}});expect(html).toContain(label);expect(html).toContain(source);expect(html).not.toContain('temperature effects, tracking');
    }
  });
});
