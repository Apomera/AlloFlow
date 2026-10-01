import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let model,energy;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');model=window.StemLab.renewablesMicrogridModel;energy=window.StemLab.renewablesEnergyModel;});
const base={source:'solarPv',sourceSettings:{irradiance:0},demand:4,loadId:'flat',grid:'island',batteryUnits:0};
const bank={...base,batteryUnits:1,battery:{capacity:100,power:50,initial:100,roundtrip:100}};
const partSum=p=>p.noBank+p.power+p.energy+p.held;
const close=(a,b)=>expect(Math.abs(a-b)).toBeLessThan(Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8);
const csvRows=text=>text.split(/\r?\n/).map(line=>{const row=[];let s='',q=false;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(q&&line[i+1]==='"'){s+='"';i++;}else q=!q;}else if(line[i]===','&&!q){row.push(s);s='';}else s+=line[i];}row.push(s);return row;});
describe('Supply gap explorer',()=>{
  it('accounts for a hand-calculated no-bank gap and excludes the terminal endpoint',()=>{
    const a=model.supplyGaps(base),e=a.localEpisodes[0];
    expect(a.version).toBe(1);expect(a.microgridVersion).toBe(5);expect(a.rows).toHaveLength(241);
    expect(a.localEpisodes).toHaveLength(1);expect(a.unservedEpisodes).toHaveLength(1);
    expect([e.start,e.end,e.minutes,e.peak,e.peakMinute,e.firstUnserved]).toEqual([0,240,240,4,0,0]);
    close(e.localGap,16);close(e.parts.noBank,16);expect(e.parts.power+e.parts.energy+e.parts.held).toBe(0);
    expect(a.rows.at(-1)).toEqual({minute:240,localGap:0,grid:0,unserved:0,gridLimited:0,gridUnavailable:0,parts:{noBank:0,power:0,energy:0,held:0}});
  });
  it('distinguishes grid-covered local gaps from unserved demand',()=>{
    const a=model.supplyGaps({...base,grid:'connected'});
    expect(a.localEpisodes).toHaveLength(1);expect(a.unservedEpisodes).toHaveLength(0);expect(a.localEpisodes[0].firstUnserved).toBeNull();
    close(a.totals.localGap,16);close(a.totals.grid,16);expect(a.totals.unserved).toBe(0);
  });
  it('splits unserved episodes at grid boundaries without splitting a continuous local gap',()=>{
    const a=model.supplyGaps({...base,grid:'outage',outageStart:60,outageMinutes:60});
    expect(a.localEpisodes).toHaveLength(1);expect(a.localEpisodes[0].firstUnserved).toBe(60);
    const e=a.unservedEpisodes[0];expect([e.start,e.end,e.minutes]).toEqual([60,120,60]);close(e.unserved,4);expect(e.grid).toBe(0);
    close(a.localEpisodes[0].grid,12);close(a.localEpisodes[0].unserved,4);
  });
  it('attributes demand above the bank power rating before other limits',()=>{
    const a=model.supplyGaps({...bank,battery:{capacity:100,power:2,initial:100,roundtrip:100}});
    close(a.totals.localGap,8);close(a.totals.power,8);expect(a.totals.energy+a.totals.held+a.totals.noBank).toBe(0);
    close(a.localEpisodes[0].startStored,100);close(a.localEpisodes[0].endStored,92);
  });
  it('finds the depletion boundary using stored energy at each minute start',()=>{
    const a=model.supplyGaps({...bank,battery:{capacity:10,power:50,initial:50,roundtrip:100}}),e=a.localEpisodes[0];
    expect(e.start).toBe(75);expect(e.end).toBe(240);close(e.localGap,11);close(e.parts.energy,11);expect(e.endStored).toBe(0);
  });
  it('includes a partially supplied depletion minute and selects its later full peak',()=>{
    const a=model.supplyGaps({...bank,battery:{capacity:10,power:50,initial:51,roundtrip:100}}),e=a.localEpisodes[0];
    expect(e.start).toBe(76);expect(e.peakMinute).toBe(77);close(a.rows[76].localGap,2);close(e.localGap,10.9);close(e.startStored,2/60);
  });
  it('separates held reserve from empty storage in the demonstration system',()=>{
    const a=model.supplyGaps({...bank,demand:8,battery:{capacity:10,power:5,initial:100,roundtrip:100},reserve:20,grid:'outage',outageStart:90,outageMinutes:60});
    close(a.totals.localGap,24);close(a.totals.power,12);close(a.totals.held,12);expect(a.totals.energy).toBe(0);close(a.totals.unserved,7.5);
    const e=a.unservedEpisodes[0];expect([e.start,e.end]).toEqual([90,150]);close(e.endStored,2);
  });
  it('identifies an empty bank without calling its missing energy a reserve restriction',()=>{
    const a=model.supplyGaps({...bank,reserve:80,battery:{capacity:100,power:50,initial:0,roundtrip:100}});
    close(a.totals.energy,16);expect(a.totals.held+a.totals.power+a.totals.noBank).toBe(0);
  });
  it('does not attribute more held energy than is physically available',()=>{
    const a=model.supplyGaps({...bank,demand:120,battery:{capacity:10,power:200,initial:.1,roundtrip:100},reserve:80});
    close(a.rows[0].parts.held,.6);close(a.rows[0].parts.energy,119.4);expect(a.rows[0].parts.power).toBe(0);close(partSum(a.rows[0].parts),120);
  });
  it('recognizes strategy-held storage while grid backup is available',()=>{
    const a=model.supplyGaps({...bank,demand:8,policy:'backup',grid:'connected',battery:{capacity:10,power:5,initial:100,roundtrip:100}});
    close(a.totals.power,12);close(a.totals.held,20);expect(a.totals.energy).toBe(0);expect(a.unservedEpisodes).toHaveLength(0);close(a.localEpisodes[0].endStored,10);
  });
  it('releases strategy-held energy inside an outage and accounts for later depletion',()=>{
    const settings={...bank,demand:8,grid:'outage',outageStart:90,outageMinutes:60,reserve:20,battery:{capacity:10,power:5,initial:100,roundtrip:100}};
    const fixed=model.supplyGaps({...settings,policy:'fixed'}),release=model.supplyGaps({...settings,policy:'release'});
    expect(release.rows[90].parts.held).toBe(0);expect(release.totals.unserved).toBeLessThan(fixed.totals.unserved);
    expect(release.totals.energy).toBeGreaterThan(0);close(partSum(release.totals),release.totals.localGap);
  });
  it('counts a zero power rating as a power limit even if the bank is full',()=>{
    const a=model.supplyGaps({...bank,battery:{capacity:100,power:0,initial:100,roundtrip:100},reserve:80});
    close(a.totals.power,16);expect(a.totals.held+a.totals.energy+a.totals.noBank).toBe(0);
  });
  it('includes discharge efficiency in the physically deliverable energy',()=>{
    const a=model.supplyGaps({...bank,demand:8,battery:{capacity:10,power:50,initial:100,roundtrip:64}});
    close(a.totals.localGap,24);close(a.totals.energy,24);expect(a.localEpisodes[0].start).toBe(60);
  });
  it('keeps genuine tiny demand gaps while ignoring a zero-demand sequence',()=>{
    const tiny=model.supplyGaps({...base,demand:1e-12}),zero=model.supplyGaps({...base,demand:0});
    expect(tiny.localEpisodes).toHaveLength(1);close(tiny.totals.localGap,4e-12);
    expect(zero.localEpisodes).toEqual([]);expect(zero.unservedEpisodes).toEqual([]);expect(zero.totals.localGap).toBe(0);
  });
  it('does not invent a gap during surplus generation and charging',()=>{
    const a=model.supplyGaps({...bank,sourceSettings:{irradiance:1000,area:100,efficiency:20,incidence:0},battery:{initial:0}});
    expect(a.localEpisodes).toEqual([]);expect(a.rows.every(r=>partSum(r.parts)===0)).toBe(true);
  });
  it('regroups episodes when demand shifting removes demand from an intermediate window',()=>{
    const a=model.supplyGaps({...base,flex:{enabled:true,percent:100,fromStart:60,fromMinutes:60,toStart:180,toMinutes:60}});
    expect(a.localEpisodes.map(e=>[e.start,e.end])).toEqual([[0,60],[120,240]]);expect(a.localEpisodes[1].peakMinute).toBe(180);
    close(a.localEpisodes.reduce((n,e)=>n+e.localGap,0),16);expect(model.supplyGapView(a,{}).selected.start).toBe(120);
  });
  for(const source of ['solarPv','wind','hydro','geothermal','solarThermal','wave','tidal','biomass']){
    it(source+' reconciles every gap minute and episode across all battery strategies',()=>{
      for(const policy of ['fixed','release','backup']){
        const settings={source,profileId:energy.programs[source][0].id,demand:250,loadId:'pulse',grid:'outage',outageStart:30,outageMinutes:80,batteryUnits:2,battery:{capacity:10,power:5,initial:70,roundtrip:64},reserve:20,policy,companion:{enabled:true,source:'solarPv',profileId:'clouds',offset:35},flex:{enabled:true,percent:50,fromStart:10,fromMinutes:30,toStart:60,toMinutes:10}};
        const a=model.supplyGaps(settings),r=model.simulate(settings);
        close(a.totals.localGap,r.totals.grid+r.totals.unserved);
        for(const row of a.rows){close(partSum(row.parts),row.localGap);close(row.localGap,row.grid+row.unserved);for(const p of Object.values(row.parts))expect(p).toBeGreaterThanOrEqual(0);}
        for(const list of [a.localEpisodes,a.unservedEpisodes])for(const e of list){close(e.localGap,e.grid+e.unserved);close(partSum(e.parts),e.localGap);close(e.demand,e.direct+e.discharge+e.localGap);expect(e.endStored).toBe(r.rows[e.end].stored);expect(e.peakMinute).toBeGreaterThanOrEqual(e.start);expect(e.peakMinute).toBeLessThan(e.end);}
      }
    });
  }
  it('uses stable sorting, selected period keys, bounded pages, and independent scopes',()=>{
    const a=model.supplyGaps(base);
    a.localEpisodes=Array.from({length:19},(_,i)=>({key:i+':'+(i+1),start:i,end:i+1,minutes:i%3+1,localGap:i,unserved:i/2}));
    const v=model.supplyGapView(a,{sort:'time',page:2});expect(v.visible).toHaveLength(3);expect(v.selected.start).toBe(16);
    expect(model.supplyGapView(a,{sort:'time',page:999}).page).toBe(2);
    expect(model.supplyGapView(a,{sort:'energy',selected:'0:1'}).page).toBe(2);
    expect(model.supplyGapView(a,{sort:'energy',selected:'old'}).selected.start).toBe(18);
    expect(model.supplyGapView(a,{sort:'duration'}).selected.start).toBe(2);
    expect(model.supplyGapView(a,{scope:'invalid',sort:'invalid',page:NaN,note:'x'.repeat(4000)}).note).toHaveLength(3000);
    expect(model.supplyGapView(a,{scope:'unserved'}).episodes).toHaveLength(1);expect(a.localEpisodes[0].start).toBe(0);
  });
  it('exports complete minute accounting and chronological episodes with reproducible settings',()=>{
    const a=model.supplyGaps({...base,grid:'outage',outageStart:60,outageMinutes:60}),minutes=csvRows(model.supplyGapCsv(a,'local',true));
    expect(minutes).toHaveLength(242);for(const row of minutes.slice(1)){close(Number(row[1]),Number(row[2])+Number(row[3]));close(Number(row[1]),row.slice(4,8).reduce((n,s)=>n+Number(s),0));}
    const local=csvRows(model.supplyGapCsv(a,'local',false)),unserved=csvRows(model.supplyGapCsv(a,'unserved',false));
    expect(local[1][0]).toBe('local');expect(unserved[1].slice(0,4)).toEqual(['unserved','60','120','60']);
    expect(JSON.parse(local[1][local[0].indexOf('settings_json')])).toEqual(a.settings);expect(unserved[1][13]).toBe('60');
    const supplied=model.supplyGaps({...base,grid:'connected'});expect(csvRows(model.supplyGapCsv(supplied,'unserved',false))).toHaveLength(1);
  });
  it('replays serialized settings without mutation or changing dispatch',()=>{
    const settings={...bank,companion:{enabled:true,source:'wind',profileId:'lull'},flex:{enabled:true,percent:60}},before=JSON.stringify(settings),r=model.simulate(settings),a=model.supplyGaps(settings);
    expect(JSON.stringify(settings)).toBe(before);expect(model.simulate(settings)).toEqual(r);expect(model.supplyGaps(JSON.parse(JSON.stringify(a.settings)))).toEqual(a);
    expect(model.supplyGapView(a,{note:'Saved observation'}).note).toBe('Saved observation');
  });
  it('renders the explorer, both gap scopes, explanations, and exact inspection controls',()=>{
    const html=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{...base,gapExplorer:{note:'A bank needs energy before it can serve demand.'}}}}});
    for(const text of ['Supply gap explorer','Explain a supply gap','Gaps to investigate','Sort supply gaps','Account for the local gap','Inspect peak gap in 3D','Export gap minutes CSV','A bank needs energy before it can serve demand.'])expect(html).toContain(text);
    expect(html).not.toContain('NaN');expect(html).not.toContain('failed to render');
  });
});
