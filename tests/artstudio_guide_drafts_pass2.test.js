import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const toolPath = process.env.ART_STUDIO_GUIDE_SOURCE || 'stem_lab/stem_tool_artstudio.js';
const originalMatchMedia = window.matchMedia;
let root, host, config, current, studies;
async function click(selector) { await act(async () => { host.querySelector(selector).click(); }); }
async function type(id, value) {
  await act(async () => {
    const input = host.querySelector('#' + id);
    const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles:true }));
  });
}
async function navigate(tab) {
  await act(async () => {
    const select = host.querySelector('#artstudio-mobile-tool-picker');
    select.value = tab;
    select.dispatchEvent(new Event('change', { bubbles:true }));
  });
}
async function mount(compact = false, initial) {
  window.matchMedia = vi.fn(query => ({ matches:compact && query === '(max-width: 1279px)', addEventListener(){}, removeEventListener(){} }));
  function Harness() {
    const [data, setData] = React.useState(initial || {artStudio:{tab:'pixel',studioHome:false,pixelData:{'1,1':'#f00'}}});
    const [saved,setSaved] = React.useState([]);
    current = data; studies = saved;
    return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved}));
  }
  await act(async () => { root.render(React.createElement(Harness)); });
}
beforeEach(() => {
  resetStemLab();
  const context = new Proxy({}, {get:(_target,key) => key === 'getImageData' ? () => ({data:new Uint8ClampedArray(4),width:1,height:1}) : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({addColorStop:vi.fn()}) : key === 'measureText' ? text => ({width:String(text).length*6}) : vi.fn()});
  vi.spyOn(window.HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
  vi.spyOn(window.HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,guide');
  vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
  config = loadTool(toolPath,'artStudio');
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove(); vi.restoreAllMocks(); window.matchMedia = originalMatchMedia;
});

describe('Art Studio guide and draft refinements', () => {
  it('keeps unsaved free reflections with their own lab and saves the correct notes', async () => {
    await mount();
    await type('artstudio-study-note','Try a yellow center.');
    await click('input[name="artstudio-free-reflection"][value="change"]');
    await navigate('gradient');
    expect(host.querySelector('#artstudio-study-note').value).toBe('');
    expect(host.querySelector('input[name="artstudio-free-reflection"][value="keep"]').checked).toBe(true);
    await type('artstudio-study-note','Why is this blend uneven?');
    await click('input[name="artstudio-free-reflection"][value="wonder"]');
    await click('button[aria-label="Save current study"]');
    expect(studies.at(-1).artStudioStudy).toMatchObject({sourceTab:'gradient',reflection:'wonder',note:'Why is this blend uneven?'});
    await navigate('pixel');
    expect(host.querySelector('#artstudio-study-note').value).toBe('Try a yellow center.');
    expect(host.querySelector('input[name="artstudio-free-reflection"][value="change"]').checked).toBe(true);
    await click('button[aria-label="Save current study"]');
    expect(studies.at(-1).artStudioStudy).toMatchObject({sourceTab:'pixel',reflection:'change',note:'Try a yellow center.'});
    expect(current.artStudio.studioStudyDrafts.gradient.note).toBe('Why is this blend uneven?');
  });

  it('reopens a compact guide or shelf with one click after navigation', async () => {
    await mount(true);
    const dialog = host.querySelector('dialog[data-artstudio-inspector-shell]');
    await click('#artstudio-learn-button');
    await navigate('gradient');
    expect(dialog.open).toBe(false);
    expect(host.querySelector('#artstudio-learn-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-learn-button');
    expect(dialog.open).toBe(true);
    await act(async () => {dialog.dispatchEvent(new Event('cancel',{cancelable:true}));});
    await click('#artstudio-process-button');
    await navigate('pixel');
    expect(dialog.open).toBe(false);
    expect(host.querySelector('#artstudio-process-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-process-button');
    expect(dialog.open).toBe(true);
  });

  it('shows closed compact guide state accurately on initial load', async () => {
    await mount(true,{artStudio:{tab:'pixel',studioHome:false,showTour:true}});
    const dialog = host.querySelector('dialog[data-artstudio-inspector-shell]');
    expect(dialog.open).toBe(false);
    expect(host.querySelector('#artstudio-learn-button').getAttribute('aria-expanded')).toBe('false');
    await click('#artstudio-learn-button');
    expect(dialog.open).toBe(true);
  });

  it('keeps wording preference across lab changes and remounts without changing the artwork', async () => {
    await mount();
    const canvas = host.querySelector('#pixelCanvas');
    await click('#artstudio-learn-button');
    await click('[data-artstudio-guide-wording="simple"]');
    expect(host.querySelector('[data-artstudio-guide-prompts="simple"]').textContent).toContain('Draw the outside shape first.');
    expect(host.querySelector('#pixelCanvas')).toBe(canvas);
    expect(current.artStudio.pixelData).toEqual({'1,1':'#f00'});
    await navigate('gradient');
    expect(host.querySelector('[data-artstudio-guide-prompts="simple"]').textContent).toContain('Choose three color stops.');
    const state = structuredClone(current);
    await act(async () => {root.unmount();});
    root = ReactDOMClient.createRoot(host);
    await mount(false,state);
    expect(host.querySelector('[data-artstudio-guide-wording="simple"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-artstudio-guide-vocabulary]').textContent).toContain('Color stop');
  });

  it('provides translated simple prompts and vocabulary in all eighteen labs', () => {
    const tabs = ['artistExplorer','colorWheel','mixer','watercolor','pixel','symmetry','spirograph','generative','spinArt','stringArt','opArt','tessellation','fractal','gradient','stereogram','sculpt3d','contrast','harmonyHunt'];
    const t = (key,fallback) => key.startsWith('stem.artstudio.guide_simple_') ? 'TRANSLATED_' + key.split('.').at(-1) : fallback;
    for (const tab of tabs) {
      const html = renderTool('artStudio',{artStudio:{tab,studioHome:false,showTour:true,studioGuideWording:'simple'}},{t});
      expect(html,tab).toContain('data-artstudio-guide-prompts="simple"');
      expect(html,tab).toContain('TRANSLATED_guide_simple_' + tab + '_try');
      expect(html,tab).toContain('TRANSLATED_guide_simple_' + tab + '_definition');
    }
  });
});
