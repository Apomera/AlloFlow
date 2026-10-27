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
    const [data, setData] = React.useState({ climateExplorer: { tab:'solutions',heroMotionPaused:true,...seed } });
    current = data.climateExplorer;
    return config.render(makeCtx({ toolData:data,setToolData:setData,announceToSR:announce,awardXP:award }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, award, state:() => current, one:selector => host.querySelector(selector), all:selector => [...host.querySelectorAll(selector)] };
}
async function settle() {
  await act(async () => { await Promise.resolve(); vi.runOnlyPendingTimers(); frames.splice(0).forEach(callback => callback(16)); await Promise.resolve(); });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.tagName).toBe('BUTTON'); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settle();
}
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); frames=[];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate solution controls: %s', path => {
  it('names the activity, stack and filters without taking initial focus', async () => {
    const outside=document.createElement('button'); document.body.appendChild(outside); outside.focus(); disposers.push(() => outside.remove());
    const view=mountTool(path,{ssCategory:'unknown'}); await settle();
    expect(document.activeElement).toBe(outside);
    for(const id of ['ce-solutions','ce-stack']) {
      const region=view.one('#'+id);
      expect(region.getAttribute('role')).toBe('region');
      expect(view.one('#'+region.getAttribute('aria-labelledby'))?.textContent.trim()).toBeTruthy();
    }
    expect(view.one('[role="group"][aria-label="Filter solutions"]')).toBeTruthy();
    expect(view.all('[id^="ce-solution-filter-"][aria-pressed="true"]')).toHaveLength(1);
    expect(view.one('#ce-solution-filter-all').getAttribute('aria-pressed')).toBe('true');
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('keeps toggle labels and focus stable while announcing the actual count and teaching sum', async () => {
    const view=mountTool(path), wind=view.one('#ce-stack-wind_onshore'), waste=view.one('#ce-stack-reduced_waste');
    const name=wind.getAttribute('aria-label'), status=view.one('#ce-stack-summary');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    await activate(wind);
    expect(document.activeElement).toBe(wind);
    expect(wind.getAttribute('aria-pressed')).toBe('true');
    expect(wind.getAttribute('aria-label')).toBe(name);
    expect(wind.textContent).toContain('Selected');
    expect(view.one('#'+wind.getAttribute('aria-describedby'))?.textContent).toBeTruthy();
    expect(status.textContent).toBe('1 solution selected. Sum of displayed estimates: 147 Gt.');
    await activate(waste);
    expect(status.textContent).toBe('2 solutions selected. Sum of displayed estimates: 235 Gt.');
    expect(view.state().badges.gigaton).toBeTruthy();
    await activate(wind);
    expect(document.activeElement).toBe(wind);
    expect(wind.getAttribute('aria-pressed')).toBe('false');
    expect(wind.textContent).toContain('Not selected');
    expect(status.textContent).toBe('1 solution selected. Sum of displayed estimates: 88 Gt.');
    expect(view.one('#ce-stack').textContent).toContain('simple sum is not a modeled portfolio');
  });

  it('ignores unknown selected keys and invalid values instead of inflating counts or badges', async () => {
    const view=mountTool(path,{drawdownPicked:{wind_onshore:true,solar_farms:'true',reduced_waste:1,bogus1:true,bogus2:true,bogus3:true,bogus4:true}});
    expect(view.one('#ce-stack-summary').textContent).toContain('1 solution selected.');
    expect(view.all('#ce-stack button[aria-pressed="true"]')).toHaveLength(1);
    await activate(view.one('#ce-stack-solar_roof'));
    expect(view.state().drawdownPicked).toEqual({wind_onshore:true,solar_roof:true});
    expect(view.one('#ce-stack-summary').textContent).toContain('2 solutions selected. Sum of displayed estimates: 172 Gt.');
    expect(view.state().badges?.planner).toBeUndefined();
    expect(view.award).not.toHaveBeenCalled();
  });

  it.each([null,7,'selected',[],{wind_onshore:false}])('recovers an empty usable stack from malformed saved selections %j', async drawdownPicked => {
    const view=mountTool(path,{drawdownPicked});
    expect(view.one('#ce-stack-summary').textContent).toContain('0 solutions selected.');
    await activate(view.one('#ce-stack-heat_pumps'));
    expect(view.state().drawdownPicked).toEqual({heat_pumps:true});
    expect(view.one('#ce-stack-summary').textContent).toContain('1 solution selected. Sum of displayed estimates: 9 Gt.');
  });

  it('exposes card prose outside its native disclosure button and preserves focus through open/close', async () => {
    const view=mountTool(path), button=view.one('#ce-solution-toggle-solar'), panel=view.one('#ce-solution-panel-solar');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(panel.childElementCount).toBe(0);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
    expect(button.contains(panel)).toBe(false);
    await activate(button);
    expect(button.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false);
    expect(document.activeElement).toBe(button);
    expect([...panel.querySelectorAll('h5')].map(node=>node.textContent)).toEqual(['What','Where','📈 Impact']);
    expect(panel.querySelectorAll('p')).toHaveLength(3);
    expect(panel.textContent).toContain('Panels that turn sunlight into electricity');
    expect(view.award).toHaveBeenCalledTimes(1);
    await activate(button); await activate(button);
    expect(view.award).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
  });

  it('counts only valid completed reads toward the eight-solution badge', async () => {
    const view=mountTool(path,{solutionsViewed:{solar:'true',unknown1:true,unknown2:true,unknown3:true,unknown4:true,unknown5:true,unknown6:true,unknown7:true}});
    await activate(view.one('#ce-solution-toggle-solar'));
    expect(view.state().solutionsViewed).toEqual({solar:true});
    expect(view.state().badges?.solutionScholar).toBeUndefined();
    expect(view.award).toHaveBeenCalledExactlyOnceWith('climateExplorer',5);
    const remaining=view.all('[id^="ce-solution-toggle-"]').filter(button=>button.id!=='ce-solution-toggle-solar');
    expect(remaining).toHaveLength(7);
    for(const button of remaining)await activate(button);
    expect(Object.keys(view.state().solutionsViewed)).toHaveLength(8);
    expect(Number.isSafeInteger(view.state().badges.solutionScholar)).toBe(true);
    expect(view.state().badges.solutionScholar).toBeGreaterThan(0);
  });

  it('exposes the selected category, announces the actual result count and retains filter focus', async () => {
    const view=mountTool(path); await activate(view.one('#ce-solution-toggle-solar'));
    const nature=view.one('#ce-solution-filter-nature');
    await activate(nature);
    expect(document.activeElement).toBe(nature);
    expect(nature.getAttribute('aria-pressed')).toBe('true');
    expect(nature.getAttribute('aria-controls')).toBe('ce-solution-cards');
    expect(view.all('#ce-solution-cards article')).toHaveLength(3);
    expect(view.one('#ce-solution-toggle-solar')).toBeNull();
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.announce.mock.calls[0][0]).toMatch(/^3 solutions shown\. Category: .*Nature\.$/);
    await activate(nature); expect(view.announce).toHaveBeenCalledTimes(1);
    await activate(view.one('#ce-solution-filter-all'));
    expect(view.all('#ce-solution-cards article')).toHaveLength(8);
    expect(view.one('#ce-solution-panel-solar').hidden).toBe(false);
    expect(document.activeElement).toBe(view.one('#ce-solution-filter-all'));
  });

  it('keeps the personal-action disclosure target and trigger available through repeated activation', async () => {
    const view=mountTool(path), button=view.one('#ce-actions-toggle'), panel=view.one('#ce-actions-panel');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
    expect(panel.hidden).toBe(true);
    expect(panel.childElementCount).toBe(0);
    await activate(button);
    expect(button.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Your choices matter'); expect(document.activeElement).toBe(button);
    await activate(button);
    expect(button.getAttribute('aria-expanded')).toBe('false'); expect(panel.hidden).toBe(true);
    expect(panel.childElementCount).toBe(0);
    expect(document.activeElement).toBe(button);
  });
});
