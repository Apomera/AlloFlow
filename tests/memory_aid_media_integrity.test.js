import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const MANUAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAABoklEQVR4AezTQWpDMQxFUZMltNtpB914M8h6soYENAwiyGRgdHUD3wPj8P3e+br8f/08fLgdXJY/dAMCo3nXElhgeAPweE6wwPAG4PGcYIGRDYwJ5QTDqY8B/91va9Jz6js6Bnwq8LT3CgwXF1hgeAPweE6wwPAG4PFeJhiedmA8geHoAgsMbwAezwkWGN4APJ4TLDC8AXg8JziAuYvAXNtIJnDUwF0E5tpGMoGjBu4iMNc2kgkcNXAXgbm2kUzgqIG7vAfm5h6TTGA4tcACwxuAx3OCBYY3AI/nBAsMbwAezwnOgEF7AoMwsygCZ62A9gQGYWZRBM5aAe0JDMLMogictQLaExiEmUUROGsFtLcFDMo9JorAcGqBBYY3AI/nBAsMbwAezwkWGN4APJ4TXADufETgznqFuwtcKKnzEYE76xXuLnChpM5HBO6sV7i7wIWSOh8RuLNe4e4CF0rqfOQT4M65x9xdYDj1MeDr9++a9Jz6jo4Bnwo87b0Cw8UFFhjeADyeEywwvIH9eK3+4QS34tq/rMD7nbX6h8CtuPYv+wQAAP//BIyS8AAAAAZJREFUAwDgcKnYwyEfQAAAAABJRU5ErkJggg==';
const GENERATED = 'data:image/png;base64,R0VORVJBVEVE';
let source, root, host, speech;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // Exercise the edited source without writing generated bundles during this test.
  const compiled = require('@babel/core').transformSync(readFileSync(resolve('memory_aid_source.jsx'), 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  source = new Function('React', compiled + '\nreturn { MemoryAidView, buildMemoryAidPracticeCueText, normalizeMemoryAidCards, exportRules: MEMORY_AID_EXPORT_RULES };')(React);
  window.AlloModules.MemoryAid = { exportRules: source.exportRules, _testing: { normalizeMemoryAidCards: source.normalizeMemoryAidCards } };
  loadAlloModule('image_asset_editor_module.js');
  loadAlloModule('resource_read_aloud_module.js');
});
beforeEach(() => {
  speech = { speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn() };
  vi.stubGlobal('speechSynthesis', speech);
  window.speechSynthesis = speech;
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  window.sessionStorage.clear(); window.localStorage.clear();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const card = extra => ({
  id: 'visual-card', target: 'Solids', mode: 'student-authored', type: 'visual-association',
  essentialFacts: ['Solids retain their shape.'], factVerified: true, factLocked: true,
  visualImage: IMAGE, visualSource: 'uploaded', visualAlt: 'A sculpture beside a clear glass.', visualAltSource: 'author',
  mapping: 'PRIVATE FACT MAPPING', recallQuestion: 'What happens when the object moves to another container?', ...extra,
});
const visible = node => !!node && !node.closest('[hidden]');
const button = name => [...host.querySelectorAll('button')].find(node => visible(node) && node.textContent === name);
async function click(name) { const node = button(name); expect(node, name).toBeTruthy(); expect(node.disabled, name).toBe(false); await act(async () => node.click()); }
async function mount(item = card(), overrides = {}) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const api = { toasts: vi.fn() };
  function App() {
    const [resource, setResource] = React.useState({id:'media-integrity',type:'memory-aid',data:{resourceId:'media-integrity',title:'Memory aid',authorshipMode:'student-authored',cards:[item]}});
    api.resource = resource; api.setResource = setResource;
    return React.createElement(source.MemoryAidView, {
      generatedContent:resource, isTeacherMode:false, isProcessing:false, activeProfileId:'media-learner',
      handleNoteUpdate:(key,value)=>setResource(previous=>({...previous,data:{...previous.data,[key]:typeof value==='function'?value(previous.data[key]):value}})),
      addToast:api.toasts, ...overrides,
    });
  }
  await act(async()=>root.render(React.createElement(App)));
  return api;
}

describe('Memory Aid practice cue audio integrity', () => {
  it('reads a trusted visual-only cue through real read-aloud controls without reading the hidden facts', async () => {
    await mount(); await click('Try recall'); await click('Start recall practice');
    await click('Read cue aloud');
    const spoken = speech.speak.mock.calls[0][0].text;
    expect(spoken).toBe('A sculpture beside a clear glass.');
    expect(spoken).not.toContain('Solids'); expect(spoken).not.toContain('PRIVATE FACT MAPPING');
  });

  it.each([
    ['planning description', {visualAltSource:'planning'}],
    ['stale description', {visualAltSource:'stale'}],
    ['outdated visual', {visualNeedsReview:true}],
    ['missing visual', {visualImage:''}],
    ['placeholder description', {visualAlt:'Visual memory cue for Solids'}],
    ['cue awaiting review', {cueNeedsReview:true}],
  ])('does not speak a %s as a picture cue', (_name, patch) => {
    expect(source.buildMemoryAidPracticeCueText(card(patch), null, {cueOnly:true})).toBe('');
    expect(source.buildMemoryAidPracticeCueText(card(patch))).not.toContain('A sculpture beside a clear glass.');
  });

  it('keeps the written cue route when an optional description is untrusted', () => {
    expect(source.buildMemoryAidPracticeCueText(card({studentDraft:'My statue cue',visualAltSource:'planning'}),null,{cueOnly:true})).toBe('My statue cue');
    expect(source.buildMemoryAidPracticeCueText(card({studentDraft:'My statue cue',cueNeedsReview:true}),null,{cueOnly:true})).toBe('');
  });

  it('exposes no picture-cue playback during an unsupported recall attempt', async () => {
    await mount(); await click('Try recall');
    const without = [...host.querySelectorAll('input[type="radio"]')].find(node=>visible(node)&&node.parentElement.textContent==='Without hints');
    await act(async()=>without.click()); await click('Start recall practice');
    expect(button('Read cue aloud')).toBeUndefined();
    expect([...host.querySelectorAll('img')].filter(visible)).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
  });
});

describe('Memory Aid manual visual ownership', () => {
  it.each([['changed crop', MANUAL], ['unchanged accepted image', IMAGE]])('preserves a %s over a pending AI result even when the provider ignores cancellation', async (_name, editedImage) => {
    let finish, signal;
    const generate = vi.fn((_prompt,_size,_quality,options) => { signal=options.signal; return new Promise(resolve=>{finish=resolve;}); });
    vi.spyOn(window.AlloModules.ImageAssetTools,'renderImageAsset').mockResolvedValue({dataUrl:editedImage});
    const api = await mount(card(),{isTeacherMode:true,callImagen:generate});
    await click('Edit resource'); await click('Crop or reposition');
    await click('Regenerate visual cue'); expect(generate).toHaveBeenCalledTimes(1); expect(signal.aborted).toBe(false);
    await click('Use edited image');
    expect(api.resource.data.cards[0].visualImage).toBe(editedImage); expect(signal.aborted).toBe(true);
    await act(async()=>finish(GENERATED));
    expect(api.resource.data.cards[0].visualImage).toBe(editedImage);
    expect(api.resource.data.cards[0].visualSource).toBe('uploaded');
    expect(api.toasts.mock.calls.filter(([message])=>message==='Visual cue added. Review its image description when you are ready.')).toHaveLength(0);
    expect(button('Regenerate visual cue')).toBeTruthy();
  });

  it('rejects generation after an external image replacement without relying on editor cancellation', async () => {
    let finish;
    const api = await mount(card(),{isTeacherMode:true,callImagen:()=>new Promise(resolve=>{finish=resolve;})});
    await click('Edit resource'); await click('Regenerate visual cue');
    await act(async()=>api.setResource(previous=>({...previous,data:{...previous.data,cards:previous.data.cards.map(item=>({...item,visualImage:MANUAL}))}})));
    await act(async()=>finish(GENERATED));
    expect(api.resource.data.cards[0].visualImage).toBe(MANUAL);
    expect(api.toasts.mock.calls.filter(([message])=>message==='Visual cue added. Review its image description when you are ready.')).toHaveLength(0);
  });

  it('still applies a generation result when its source image is unchanged', async () => {
    let finish;
    const api = await mount(card(),{isTeacherMode:true,callImagen:()=>new Promise(resolve=>{finish=resolve;})});
    await click('Edit resource'); await click('Regenerate visual cue');
    await act(async()=>finish(GENERATED));
    expect(api.resource.data.cards[0].visualImage).toBe(GENERATED);
    expect(api.resource.data.cards[0].visualSource).toBe('ai-generated');
  });
});
