import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn(), award = vi.fn();
  let current;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab:'carbon',heroMotionPaused:true,...seed } });
    current = data.climateExplorer;
    return config.render(makeCtx({toolData:data,setToolData:setData,announceToSR:announce,awardXP:award}));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return {host,announce,award,state:()=>current,one:selector=>host.querySelector(selector),all:selector=>[...host.querySelectorAll(selector)]};
}
async function settle() {
  await act(async () => { await Promise.resolve(); vi.runOnlyPendingTimers(); frames.splice(0).forEach(callback=>callback(16)); await Promise.resolve(); });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.tagName).toBe('BUTTON'); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settle();
}
async function setFrequency(input, value) {
  input.focus();
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await settle();
}
function namedBy(view, element) {
  return element.getAttribute('aria-labelledby').split(/\s+/).map(id=>view.one('#'+id).textContent).join(' ');
}
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); frames=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.push(callback);return frames.length;});
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose=>dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate Carbon controls: %s', path => {
  it('names its activity and choice groups, and recovers one selected option without taking initial focus', async () => {
    const outside=document.createElement('button'); document.body.appendChild(outside); outside.focus(); disposers.push(()=>outside.remove());
    const view=mountTool(path,{ccTransport:99,ccFood:'invalid',ccEnergy:-1,ccWaste:Infinity,ccScale:'unknown'}); await settle();
    expect(document.activeElement).toBe(outside);
    expect(view.one('#ce-carbon').getAttribute('role')).toBe('region');
    expect(namedBy(view,view.one('#ce-carbon'))).toContain('Your Carbon Footprint');
    for(const category of ['transport','food','energy','waste']) {
      const group=view.one('#ce-carbon-choice-group-'+category);
      expect(group.getAttribute('role')).toBe('group'); expect(namedBy(view,group)).toBeTruthy();
      const selected=group.querySelectorAll('button[aria-pressed="true"]'); expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('ce-carbon-choice-'+category+'-0');
    }
    expect(view.one('#ce-carbon-scale-school').getAttribute('aria-pressed')).toBe('true');
    expect(view.one('#ce-carbon-total').textContent).toBe('Estimated total: 900 kg CO₂ per year.');
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('keeps a choice name and focus stable and announces the new calculated total through one persistent status', async () => {
    const view=mountTool(path,{badges:{firstCalc:1}}), button=view.one('#ce-carbon-choice-transport-2'), name=namedBy(view,button), status=view.one('#ce-carbon-status');
    expect(name).toBe('Car (alone)');
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(view.one('#'+button.getAttribute('aria-describedby')).textContent).toBe('1200 kg/yr');
    await activate(button);
    expect(document.activeElement).toBe(button); expect(namedBy(view,button)).toBe(name);
    expect(button.getAttribute('aria-pressed')).toBe('true'); expect(button.textContent).toContain('Selected');
    expect(view.one('#ce-carbon-choice-transport-0').getAttribute('aria-pressed')).toBe('false');
    expect(view.one('#ce-carbon-status')).toBe(status);
    expect(status.textContent).toBe('How do you get to school?: Car (alone). Estimated total: 2,100 kg CO₂ per year.');
    expect(view.one('#ce-carbon-total').textContent).toBe('Estimated total: 2,100 kg CO₂ per year.');
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('exposes a named scale group, stable selected states and the correct unit for unchanged scale arithmetic', async () => {
    const view=mountTool(path,{ccTransport:2,ccFood:1,ccEnergy:1,ccWaste:1,scalesViewed:{bogus:true,city:'true'}});
    const city=view.one('#ce-carbon-scale-city'), name=namedBy(view,city);
    expect(city.parentElement.getAttribute('role')).toBe('group'); expect(namedBy(view,city.parentElement)).toContain('What if everyone');
    expect(view.one('#ce-carbon-scale-result').textContent).toContain('2.5 thousand metric tons CO₂/yr'); // 4,900 kg × 500 / 1e6
    await activate(city);
    expect(document.activeElement).toBe(city); expect(namedBy(view,city)).toBe(name);
    expect(city.getAttribute('aria-pressed')).toBe('true'); expect(view.one('#ce-carbon-scale-school').getAttribute('aria-pressed')).toBe('false');
    expect(view.one('#ce-carbon-scale-result').textContent).toContain('490.0 thousand metric tons CO₂/yr'); // 4,900 kg × 100,000 / 1e6
    expect(view.one('#ce-carbon-scale-result').textContent).not.toContain('million tons');
    expect(view.one('#ce-carbon-status').textContent).toContain('Scale selected:'); expect(view.one('#ce-carbon-status').textContent).toContain('City');
    expect(view.state().scalesViewed).toEqual({city:true}); expect(view.state().badges?.dataDiver).toBeUndefined();
    const awarded=view.award.mock.calls.length; await activate(city); expect(view.award.mock.calls).toHaveLength(awarded);
  });

  it.each([[600,600],['800',800],[0,500],[-2,500],[Infinity,500],['invalid',500],[2.5,500],[[],500]])('uses a finite, positive student count for saved school size %j', (ccSchoolSize,expected) => {
    const view=mountTool(path,{ccSchoolSize});
    expect(view.one('#ce-carbon-scale-result').textContent).toContain((900*expected/1000000).toFixed(1)+' thousand metric tons CO₂/yr');
    expect(view.one('#ce-carbon-scale-result').textContent).toContain('If all '+expected+' students made these choices');
    expect(view.one('#ce-carbon-scale-result').textContent).not.toMatch(/NaN|Infinity/);
  });

  it.each([
    ['ce-carbon-sectors-toggle','ce-carbon-sectors-panel'],
    ['ce-carbon-habits-toggle-transport','ce-carbon-habits-panel-transport'],
    ['ce-carbon-habits-toggle-food','ce-carbon-habits-panel-food'],
    ['ce-carbon-habits-toggle-energy','ce-carbon-habits-panel-energy'],
    ['ce-carbon-habits-toggle-digital','ce-carbon-habits-panel-digital'],
    ['ce-carbon-habits-toggle-shopping','ce-carbon-habits-panel-shopping'],
    ['ce-carbon-habits-toggle-waste','ce-carbon-habits-panel-waste'],
    ['ce-carbon-compare-toggle','ce-carbon-compare-panel']
  ])('keeps the %s disclosure target mounted and lazy, retaining focus through open/close', async (buttonId,panelId) => {
    const view=mountTool(path), button=view.one('#'+buttonId), panel=view.one('#'+panelId);
    expect(button.getAttribute('aria-controls')).toBe(panelId); expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true); expect(panel.childElementCount).toBe(0); expect(panel.getAttribute('role')).toBe('region'); expect(panel.getAttribute('aria-labelledby')).toBe(buttonId);
    await activate(button);
    expect(button.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false); expect(panel.childElementCount).toBeGreaterThan(0); expect(document.activeElement).toBe(button);
    await activate(button);
    expect(button.getAttribute('aria-expanded')).toBe('false'); expect(view.one('#'+panelId)).toBe(panel); expect(panel.hidden).toBe(true); expect(panel.childElementCount).toBe(0); expect(document.activeElement).toBe(button);
  });

  it('gives every habit slider a visible label and meaningful frequency units, updating totals without losing focus', async () => {
    const view=mountTool(path,{granularExpanded:{transport:true}}), slider=view.one('#ce-carbon-habit-car_solo');
    for(const input of view.all('#ce-carbon-habits-panel-transport input[type="range"]')) {
      expect(view.one('label[for="'+input.id+'"]').textContent).toBeTruthy(); expect(input.getAttribute('aria-valuetext')).toMatch(/^0 (trips\/week|flights\/year)$/);
      input.getAttribute('aria-describedby').split(' ').forEach(id=>expect(view.one('#'+id).textContent).toBeTruthy());
    }
    await setFrequency(slider,4);
    expect(document.activeElement).toBe(slider); expect(slider.value).toBe('4'); expect(slider.getAttribute('aria-valuetext')).toBe('4 trips/week');
    expect(view.state().granularFreq.car_solo).toBe(4);
    expect(view.one('#ce-carbon-habit-impact-car_solo').textContent).toContain('1,269 kg/yr'); // 6.1 × 4 × 52, rounded
    expect(view.one('#ce-carbon-detailed-total').textContent).toContain('1.27 t CO₂e/yr');
    expect(view.one('#ce-carbon-pledge-toggle-car_solo')).toBeTruthy();
  });

  it('keeps pledge selection and check-in names stable, announces contextual results, and awards each click once', async () => {
    const view=mountTool(path,{granularExpanded:{transport:true},granularFreq:{car_solo:4}}), toggle=view.one('#ce-carbon-pledge-toggle-car_solo'), name=toggle.getAttribute('aria-label');
    expect(name).toBe('Pledge for Drive solo (avg 25 km trip)'); expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Pledge');
    await activate(toggle);
    expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('true'); expect(toggle.getAttribute('aria-label')).toBe(name);
    expect(toggle.textContent).toContain('Pledge'); expect(toggle.textContent).not.toContain('Pledged');
    const selectedMark=toggle.querySelector('[aria-hidden="true"]');
    expect(selectedMark?.textContent).toContain('✓');
    expect(name).toContain(toggle.textContent.replace(selectedMark.textContent,'').trim());
    expect(view.state().pledges.car_solo.targetFreq).toBe(2);
    expect(view.one('#ce-carbon-status').textContent).toBe('Pledge saved for Drive solo (avg 25 km trip): target 2 trips/week.');
    const checkin=view.one('#ce-carbon-checkin-car_solo'), checkinName=checkin.getAttribute('aria-label');
    expect(checkinName).toBe('Check in for Drive solo (avg 25 km trip)');
    checkin.getAttribute('aria-describedby').split(' ').forEach(id=>expect(view.one('#'+id).textContent).toBeTruthy());
    await activate(checkin);
    expect(document.activeElement).toBe(checkin); expect(checkin.getAttribute('aria-label')).toBe(checkinName); expect(view.state().pledges.car_solo.checkins).toBe(1);
    expect(view.one('#ce-carbon-status').textContent).toBe('Check-in 1 saved for Drive solo (avg 25 km trip).');
    expect(view.award.mock.calls.map(call=>call[1])).toEqual([10,3]);
    await activate(toggle); expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Pledge');
    expect(view.one('#ce-carbon-pledges').textContent).toContain('No pledges yet.'); expect(view.announce).not.toHaveBeenCalled();
  });

  it('keeps a zero-frequency saved pledge removable and returns focus to its slider when the toggle disappears', async () => {
    const view=mountTool(path,{granularExpanded:{transport:true},granularFreq:{car_solo:0},pledges:{car_solo:{targetFreq:2,checkins:1}}});
    const toggle=view.one('#ce-carbon-pledge-toggle-car_solo'); expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await activate(toggle);
    expect(view.one('#ce-carbon-pledge-toggle-car_solo')).toBeNull(); expect(document.activeElement).toBe(view.one('#ce-carbon-habit-car_solo'));
    expect(view.one('#ce-carbon-status').textContent).toBe('Pledge removed: Drive solo (avg 25 km trip).');
  });

  it('moves focus to the next, previous, then named empty pledge region when tracker rows are removed', async () => {
    const row={targetFreq:2,checkins:0};
    const view=mountTool(path,{pledges:{car_solo:{...row},car_pool:{...row},bus:{...row}}});
    expect(view.one('#ce-carbon-pledge-remove-car_solo').getAttribute('aria-label')).toBe('Remove pledge for Drive solo (avg 25 km trip)');
    await activate(view.one('#ce-carbon-pledge-remove-car_solo'));
    expect(document.activeElement).toBe(view.one('#ce-carbon-checkin-car_pool'));
    await activate(view.one('#ce-carbon-pledge-remove-bus'));
    expect(document.activeElement).toBe(view.one('#ce-carbon-checkin-car_pool'));
    await activate(view.one('#ce-carbon-pledge-remove-car_pool'));
    const region=view.one('#ce-carbon-pledges');
    expect(document.activeElement).toBe(region); expect(region.getAttribute('role')).toBe('region'); expect(namedBy(view,region)).toBe('My Climate Pledges (0)');
    expect(view.one('#'+region.getAttribute('aria-describedby')).textContent).toContain('Adjust the habit sliders');
    expect(region.textContent).toContain('No pledges yet.'); expect(view.state().pledges).toEqual({});
  });

  it.each([null,[],7,'pledged',{unknown:{targetFreq:2},car_solo:null,car_pool:{targetFreq:'2'}}])('recovers an empty pledge region from malformed saved records %j', async pledges => {
    const view=mountTool(path,{pledges}); await settle();
    expect(namedBy(view,view.one('#ce-carbon-pledges'))).toBe('My Climate Pledges (0)');
    expect(view.all('[id^="ce-carbon-checkin-"]')).toHaveLength(0); expect(view.one('#ce-carbon-pledges').textContent).toContain('No pledges yet.');
    expect(view.state().badges?.pledger).toBeUndefined();
  });

  it('normalizes saved pledge fields and ignores unknown records without inflating completion or counts', async () => {
    const view=mountTool(path,{pledges:{car_solo:{targetFreq:99,checkins:-7,started:'bad',lastCheckin:Infinity},unknown:{targetFreq:1},bus:{targetFreq:3,checkins:6}}});
    expect(namedBy(view,view.one('#ce-carbon-pledges'))).toBe('My Climate Pledges (2)');
    expect(view.one('#ce-carbon-pledge-target-car_solo').textContent).toContain('Target: ≤ 14 trips/week');
    expect(view.one('#ce-carbon-pledge-checkins-car_solo').textContent).toContain('0 check-ins');
    await activate(view.one('#ce-carbon-checkin-car_solo'));
    expect(view.state().pledges.car_solo).toMatchObject({targetFreq:14,checkins:1,started:null}); expect(Object.keys(view.state().pledges)).toEqual(['car_solo','bus']);
    expect(view.state().badges?.pledger).toBeUndefined();
    await activate(view.one('#ce-carbon-checkin-bus'));
    expect(view.state().pledges.bus.checkins).toBe(7); expect(view.state().badges.consistent).toBeGreaterThan(0);
  });

  it('keeps restored malformed frequencies inside the slider domain and out of totals and exploration badges', async () => {
    const view=mountTool(path,{granularExpanded:{transport:true},granularFreq:{car_solo:Infinity,car_pool:'oops',bus:99,train:-4,ev:2.4,unknown1:5,unknown2:5,unknown3:5,unknown4:5,unknown5:5}}); await settle();
    for(const [id,value] of [['car_solo','0'],['car_pool','0'],['bus','14'],['train','0'],['ev','2']])expect(view.one('#ce-carbon-habit-'+id).value).toBe(value);
    expect(view.one('#ce-carbon-detailed-total').textContent).not.toMatch(/NaN|Infinity/); expect(view.state().badges?.habitMaster).toBeUndefined();
    await setFrequency(view.one('#ce-carbon-habit-car_solo'),3);
    expect(view.state().granularFreq).toEqual({car_solo:3,bus:14,train:0,ev:2});
    expect(view.state().badges?.habitMaster).toBeUndefined();
  });
});
