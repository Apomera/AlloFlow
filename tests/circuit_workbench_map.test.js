import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Workbench map navigation', () => {
  let api, config, host, root, stores, writes, pending;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const meter = (index = 0) => scope(index).querySelector('.circuit-active-meter');
  const heading = (index = 0) => meter(index).querySelector('h4');
  const output = (index = 0) => meter(index).querySelector('output');
  const explorer = (index = 0) => scope(index).querySelector('.circuit-voltage-explorer');
  const action = (part, index = 0) => explorer(index).querySelector('.circuit-voltage-reading[data-voltage-part="' + part + '"] button');
  const back = (index = 0) => meter(index).querySelector('.circuit-meter-return button');
  const state = (index = 0) => stores[index].data._circuitActive;
  const saved = value => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !['probeRed', 'probeBlack'].includes(key))));
  const seed = patch => ({ _circuit: { activeWorkbench: true }, _circuitActive: {
    ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', probeRed: 'base', probeBlack: 'drive',
    observations: [api.circuitActiveObservation({ input: .8 }, 'My saved note.')], reflection: 'My explanation.', investigationQuestion: 'Where does the voltage go?', investigationPrediction: 'The two drops add up.',
    reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'My lesson.' } },
    undo: [api.circuitActiveDesign({ input: .9 })], redo: [api.circuitActiveDesign({ input: 2 })], ...patch
  } });
  function Harness({ initial, index, translated, deferred }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); if (deferred) pending[index].push(value); else update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false, deferred = false) {
    const values = second === undefined ? [patch] : [patch, second]; pending = values.map(() => []);
    await act(async () => root.render(React.createElement(React.Fragment, null, ...values.map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated, deferred }))))));
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => { el.focus(); el.click(); }); }
  const button = text => [...scope().querySelectorAll('button')].find(el => el.textContent === text);
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });


  const route = (key,index=0) => scope(index).querySelector('[data-workbench-route="'+key+'"]');
  const destination = (key,index=0) => scope(index).querySelector('[id="'+route(key,index).getAttribute('aria-controls')+'"]');
  const returnButton = (key,index=0) => scope(index).querySelector('[data-workbench-return="'+key+'"]');
  const routes = ['input','connections','response','explain'];
  it('offers four labeled destinations without claiming progress or changing saved data', async () => {
    await mount();const nav=scope().querySelector('nav.circuit-workbench-map');
    expect(nav.querySelector('h3').textContent).toBe('Workbench map');expect(nav.querySelectorAll('li')).toHaveLength(4);
    for(const key of routes){const link=route(key),target=destination(key);expect(target.tagName).toBe('H3');expect(target.tabIndex).toBe(-1);expect(link.hasAttribute('aria-pressed')).toBe(false);expect(link.hasAttribute('aria-current')).toBe(false);expect(nav.querySelector('[id="'+link.getAttribute('aria-labelledby')+'"]').textContent).toBeTruthy();expect(nav.querySelector('[id="'+link.getAttribute('aria-describedby')+'"]').textContent).toBeTruthy();expect(returnButton(key).getAttribute('aria-controls')).toBe(link.id);}
    expect(writes).not.toHaveBeenCalled();
  });
  it.each(routes)('moves focus and scroll to %s, then returns to its exact map button without data writes', async key => {
    await mount();const original=stores[0].data,target=destination(key),link=route(key);target.scrollIntoView=vi.fn();link.scrollIntoView=vi.fn();
    await click(link);expect(document.activeElement).toBe(target);expect(target.scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});
    await click(returnButton(key));expect(document.activeElement).toBe(link);expect(link.scrollIntoView).toHaveBeenCalledWith({block:'start',behavior:'instant'});expect(stores[0].data).toBe(original);expect(writes).not.toHaveBeenCalled();
  });
  it('keeps the open node explorer and closed component tuning unchanged across navigation', async () => {
    await mount();const explorer=scope().querySelector('.circuit-node-explorer'),tuning=scope().querySelector('.circuit-active-component-tuning');explorer.open=true;
    for(const key of routes){await click(route(key));await click(returnButton(key));}
    expect(explorer.open).toBe(true);expect(tuning.open).toBe(false);expect(writes).not.toHaveBeenCalled();
  });
  it('does not open a guided lesson or change a saved prediction when visiting explanations', async () => {
    await mount();const prior=stores[0].data,details=[...scope().querySelectorAll('details')].map(el=>[el,el.open]);await click(route('explain'));
    for(const [el,open]of details)expect(el.open).toBe(open);expect(stores[0].data).toBe(prior);expect(writes).not.toHaveBeenCalled();
  });
  it('keeps live edits and undo separate from navigation and retains stable destinations', async () => {
    await mount();const target=destination('input'),link=route('input');await click(link);await click(button('Input off'));const edited=stores[0].data;
    expect(state().input).toBe(0);await click(returnButton('input'));await click(route('response'));expect(stores[0].data).toBe(edited);
    expect(destination('input')).toBe(target);expect(route('input')).toBe(link);await click(button('Undo active edit'));expect(state().input).toBe(1);
  });
  it('does not steal focus after a live update while a section heading is focused', async () => {
    await mount();await click(route('response'));const target=destination('response');target.scrollIntoView=vi.fn();
    await act(async()=>stores[0].update(prev=>({...prev,_circuitActive:{...prev._circuitActive,input:1.5}})));
    expect(document.activeElement).toBe(target);expect(target.scrollIntoView).not.toHaveBeenCalled();
  });
  it('preserves a meter return route while navigating through the workbench', async () => {
    await mount();await click(action('lamp'));const original=stores[0].data;await click(returnButton('connections'));await click(route('response'));await click(route('connections'));
    expect(back().textContent).toBe('Back to lamp drop');expect(stores[0].data).toBe(original);await click(back());expect(document.activeElement).toBe(action('lamp'));
  });
  it('keeps all destinations and return controls available across experiment changes', async () => {
    await mount();const initial=routes.map(key=>destination(key));await click([...scope().querySelectorAll('.circuit-active-projects button')].find(el=>el.querySelector('span').textContent==='Light sensor'));
    for(const [index,key]of routes.entries()){expect(destination(key)).toBe(initial[index]);await click(route(key));expect(document.activeElement).toBe(initial[index]);await click(returnButton(key));expect(document.activeElement).toBe(route(key));}
    expect(state().observations[0].note).toBe('My saved note.');
  });
  it('isolates map targets and focus across two workbenches', async () => {
    await mount({}, {input:1.5});const ids=[];for(const index of [0,1])for(const key of routes)ids.push(route(key,index).id,destination(key,index).id);
    expect(new Set(ids).size).toBe(ids.length);for(const key of routes){await click(route(key,1));expect(document.activeElement).toBe(destination(key,1));await click(returnButton(key,1));expect(document.activeElement).toBe(route(key,1));}expect(writes).not.toHaveBeenCalled();
  });
  it('localizes navigation and headings and isolates prose direction', async () => {
    await mount({},undefined,true);const nav=scope().querySelector('.circuit-workbench-map');expect(nav.querySelector('h3').textContent).toBe('Translated Workbench map');
    for(const key of routes){expect(route(key).querySelector('strong').textContent).toMatch(/^Translated /);expect(destination(key).textContent).toMatch(/^Translated /);expect(destination(key).querySelector('bdi').dir).toBe('auto');expect(returnButton(key).querySelector('bdi').textContent).toBe('Translated Back to workbench map');expect(returnButton(key).querySelector('bdi').dir).toBe('auto');}
  });
});
