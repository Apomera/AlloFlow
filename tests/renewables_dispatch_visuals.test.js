import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');});
function render(settings={}){
  const host=document.createElement('div');
  host.innerHTML=renderTool('renewablesLab',{renewablesLab:{view:'microgrid',energyLab:{microgrid:{scene:'flow',...settings}}}});
  return host;
}

describe('Microgrid dispatch visual evidence',()=>{
  it('draws each electricity route from the simulated dispatch, including storage and grid imports',()=>{
    const input={sourceSettings:{irradiance:0},demand:12,grid:'connected',gridLimit:{enabled:true,power:3},battery:{capacity:10,power:5,initial:100,roundtrip:81},minute:2};
    const row=window.StemLab.renewablesMicrogridModel.simulate(input).rows[2],host=render(input);
    for(const key of ['primaryGeneration','companionGeneration','direct','charge','discharge','grid','curtailed']){
      expect(Number(host.querySelector(`[data-dispatch-edge="${key}"]`).dataset.flowKw)).toBeCloseTo(row[key],8);
    }
    expect(host.querySelector('.rn-dispatch-badge').textContent).toBe('Supply shortfall');
    expect(host.querySelector('.rn-dispatch-note').textContent).toContain('Unserved demand is a shortfall, not an energy source');
    expect(host.querySelectorAll('.rn-dispatch-choices button')).toHaveLength(6);
  });

  it('does not show fictitious power at the final boundary',()=>{
    const host=render({minute:240,grid:'connected',demand:10});
    for(const edge of host.querySelectorAll('[data-dispatch-edge]'))expect(Number(edge.dataset.flowKw)).toBe(0);
    expect(host.querySelector('.rn-dispatch-badge').textContent).toBe('Sequence complete');
    expect(host.querySelector('.rn-dispatch-heading').textContent).toContain('no additional energy');
    expect(host.querySelector('.rn-dispatch-board').dataset.dispatchMotion).toBe('off');
    const motion=host.querySelector('[aria-label="Animate electricity flow"]');
    expect(motion.disabled).toBe(true);
    expect(motion.getAttribute('aria-pressed')).toBe('false');
    // Keep the same texture nodes available to resume; endpoints hide and pause them.
    expect(host.querySelectorAll('.rn-dispatch-pulse')).toHaveLength(7);
    for(const pulse of host.querySelectorAll('.rn-dispatch-pulse,.rn-dispatch-mobile-pulse')){
      expect(pulse.style.visibility).toBe('hidden');
      expect(pulse.style.animationPlayState).toBe('paused');
    }
  });

  it('keeps a shared sequence power scale as time changes and meters the actual dispatch',()=>{
    const input={profileId:'clouds',demand:4,loadId:'pulse',grid:'connected',battery:{capacity:8,power:3,initial:50,roundtrip:81}};
    const run=window.StemLab.renewablesMicrogridModel.simulate(input);
    const peak=run.rows.reduce((value,row)=>Math.max(value,row.generation,row.demand,row.charge,row.discharge,row.grid),0);
    for(const minute of [0,Math.floor(run.duration/2),run.duration]){
      const host=render({...input,minute});
      expect(Number(host.querySelector('.rn-dispatch-board').dataset.powerScaleKw)).toBeCloseTo(peak,10);
      expect(host.querySelector('[data-dispatch-scale]').textContent).toContain('fixed across this sequence');
      for(const button of host.querySelectorAll('[data-dispatch-mobile-edge]')){
        const value=run.rows[minute][button.dataset.dispatchMobileEdge];
        expect(Number(button.dataset.flowKw)).toBeCloseTo(value,10);
        expect(button.dataset.flowUnit).toBe('kW');
        expect(parseFloat(button.querySelector('.rn-dispatch-meter-fill').style.width)).toBeCloseTo(100*value/peak,8);
      }
    }
  });

  it('shows the current policy discharge floor on a separate stored-energy scale',()=>{
    const input={sourceSettings:{irradiance:0},demand:2,grid:'outage',outageStart:60,outageMinutes:60,policy:'release',reserve:20,batteryUnits:2,battery:{capacity:10,power:5,initial:75,roundtrip:100}};
    const run=window.StemLab.renewablesMicrogridModel.simulate(input);
    for(const minute of [0,60]){
      const host=render({...input,minute}),panel=host.querySelector('[data-dispatch-reserve]'),row=run.rows[minute];
      expect(Number(panel.dataset.storedKwh)).toBeCloseTo(row.stored,10);
      expect(Number(panel.dataset.floorKwh)).toBeCloseTo(row.reserve,10);
      expect(Number(panel.dataset.capacityKwh)).toBe(run.capacity);
      expect(parseFloat(panel.querySelector('.rn-dispatch-reserve-marker').style.left)).toBeCloseTo(100*row.reserve/run.capacity,10);
      expect(panel.textContent).toContain('separate from the flow power scale in kW');
    }
    expect(run.rows[0].reserve).toBe(4);
    expect(run.rows[60].reserve).toBe(0);
  });

  it('keeps all-zero power and absent storage empty without inventing a reference flow',()=>{
    const host=render({sourceSettings:{irradiance:0},sourceUnits:1,companion:{enabled:false},demand:0,batteryUnits:0,grid:'island'});
    expect(Number(host.querySelector('.rn-dispatch-board').dataset.powerScaleKw)).toBe(0);
    expect(host.querySelector('[data-dispatch-scale]').textContent).toContain('all flow meters are empty');
    for(const meter of host.querySelectorAll('.rn-dispatch-meter-fill'))expect(meter.style.width).toBe('0%');
    expect(host.querySelector('[data-dispatch-reserve]').textContent).toContain('No battery installed');
    expect(host.querySelector('.rn-dispatch-reserve-marker')).toBeNull();
  });

  it('distinguishes primary and second sources when both use the same technology',()=>{
    const host=render({source:'solarPv',companion:{enabled:true,source:'solarPv'}});
    const names=Array.from(host.querySelectorAll('.rn-dispatch-choices button'),button=>button.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
    expect(names[0]).toMatch(/^Explain Primary source: /);
    expect(names[1]).toMatch(/^Explain Second source: /);
  });

  it('plots power as held intervals all the way through the last interval, without invented ramps',()=>{
    const input={sourceSettings:{irradiance:0},batteryUnits:0,demand:10,grid:'outage',outageStart:60,outageMinutes:60,chart:'grid'};
    const host=render(input),points=host.querySelector('[data-series="grid"]').getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
    expect(points).toHaveLength(480);
    for(let i=0;i<points.length;i+=2){expect(points[i][1]).toBe(points[i+1][1]);expect(points[i][0]).toBeLessThan(points[i+1][0]);}
    expect(points[119][0]).toBe(points[120][0]);
    expect(points[119][1]).not.toBe(points[120][1]);
    expect(points.at(-1)[0]).toBe(800);
  });

  it('keeps battery energy continuous at minute boundaries and the power area in kW',()=>{
    const host=render({chart:'battery'}),run=window.StemLab.renewablesMicrogridModel.simulate({});
    expect(host.querySelector('[data-series="stored"]').getAttribute('points').split(' ')).toHaveLength(run.duration+1);
    expect(host.querySelector('[data-timeline-area="stored"]')).not.toBeNull();
    expect(render({chart:'power'}).querySelector('[data-timeline-area="unserved"]')).not.toBeNull();
  });
});
