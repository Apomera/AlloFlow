// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const marker = "window.StemLab.registerTool('dinoLab'";
let source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
// Explicit draft evaluation is useful while the canonical giant source is
// integrated serially. Normal test runs require the production helpers.
if (process.env.DINO_COMPARISON_HELPERS) {
  source = source.replace(marker, readFileSync(resolve(process.env.DINO_COMPARISON_HELPERS), 'utf8') + '\n' + marker);
}
const mounted = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) {
    await React.act(async () => root.unmount()); host.remove();
  }
  delete window.__dinoComparisonCameraRef;
});

function load() {
  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source.replace('var cameraControlRef = React.useRef(null);',
    'var cameraControlRef = React.useRef(null); window.__dinoComparisonCameraRef = cameraControlRef;')
    .replace(marker, 'globalThis.__dinoComparisonContract = { DINOS, dinoPartComparisonContext, dinoPartComparisonState, dinoPartComparisonUpdate, dinoPartComparisonReady, dinoPartComparisonIsRecorded, dinoPartComparisonNotebookText }; ' + marker))();
  const art = globalThis.__dinoComparisonContract; delete globalThis.__dinoComparisonContract;
  return { cfg: captured.cfg, art, dn: id => art.DINOS.find(dn => dn.id === id) };
}

async function mount(overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host), patches = [], announce = vi.fn();
  let data = { tab: 'field3d', selected: 'tyrannosaurus', field3dSelected: 'tyrannosaurus',
    field3dLabelMode: 'anatomy', field3dReconstructionMode: 'evidence', field3dAutoRotate: false,
    field3dShowBody: true, field3dShowSkeleton: true, field3dBodyOpacity: 28,
    field3dScanSpecies: 'tyrannosaurus', field3dScanLogged: { skull: true },
    notebook: { tyrannosaurus: { question: 'My original question', observation: 'Earlier observation', inference: '', uncertainty: '' } }, ...overrides };
  function render() {
    root.render(api.cfg.render({ React, toolData: { dinoLab: data },
      update(_scope, key, value) { const patch = { [key]: value }; patches.push(patch); data = { ...data, ...patch }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR: announce }));
  }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); if (window.__dinoComparisonCameraRef) window.__dinoComparisonCameraRef.current = camera;
  async function act(callback) { await React.act(async () => callback()); }
  return { ...api, host, patches, camera, announce, data: () => data,
    select: id => act(() => { const input = host.querySelector('#dinolab-part-picker'); input.value = id; input.dispatchEvent(new Event('change', { bubbles: true })); }),
    write: (field, text) => act(() => {
      const input = host.querySelector('#dinolab-part-comparison-' + field);
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }),
    save: () => act(() => host.querySelector('[data-dino-part-comparison-record]').click()),
    patch: patch => act(() => { data = { ...data, ...patch }; render(); }) };
}

describe('Model landmark comparison records', () => {
  it('ties each draft to a real selectable landmark and the actual surface hypothesis', () => {
    const api = load(), rex = api.dn('tyrannosaurus'), micro = api.dn('microraptor'), art = api.art;
    const context = art.dinoPartComparisonContext(rex, 'teeth', 'evidence');
    expect(context.key).toBe('tyrannosaurus|teeth|evidence');
    expect(context.source.url).toBe('https://doi.org/10.1126/science.abo7877');
    expect(art.dinoPartComparisonContext(rex, 'lungs', 'evidence')).toBeNull();
    expect(art.dinoPartComparisonContext(rex, 'unknown', 'evidence')).toBeNull();
    expect(art.dinoPartComparisonContext(rex, 'teeth', 'invented')).toBeNull();
    expect(art.dinoPartComparisonContext({ id: '__proto__' }, 'head', 'evidence')).toBeNull();
    expect(art.dinoPartComparisonContext(micro, 'wing', 'evidence')).not.toBeNull();
    expect(art.dinoPartComparisonContext(micro, 'wing', 'classic')).toBeNull();
  });

  it('requires both own observations to record, while the next evidence question stays optional', () => {
    const { art, dn } = load(), rex = dn('tyrannosaurus'), key = 'tyrannosaurus|teeth|evidence';
    let state = art.dinoPartComparisonUpdate({}, rex, 'teeth', 'evidence', { bone: 'I can follow a row of tooth crowns.' }, true);
    expect(state[key].record).toBeNull(); expect(art.dinoPartComparisonReady(state[key])).toBe(false);
    state = art.dinoPartComparisonUpdate(state, rex, 'teeth', 'evidence', { life: '   ' }, true);
    expect(state[key].record).toBeNull();
    state = art.dinoPartComparisonUpdate(state, rex, 'teeth', 'evidence', { life: 'The closed mouth margin covers the crowns.' }, true);
    expect(art.dinoPartComparisonReady(state[key])).toBe(true);
    expect(state[key].record).toEqual({ bone: 'I can follow a row of tooth crowns.', life: 'The closed mouth margin covers the crowns.', question: '' });
    expect(art.dinoPartComparisonIsRecorded(state[key])).toBe(true);
    expect(state[key].record).not.toBe(state[key]);
    expect(art.dinoPartComparisonIsRecorded({ bone: '', life: '', question: '', record: { bone: '', life: '', question: '' } })).toBe(false);
  });

  it('keeps revisions, landmarks, species and hypotheses independent without mutating prior state', () => {
    const { art, dn } = load(), rex = dn('tyrannosaurus'), key = 'tyrannosaurus|teeth|evidence';
    const state = art.dinoPartComparisonUpdate({}, rex, 'teeth', 'evidence', { bone: 'First bone view', life: 'First life view', question: 'What tissue evidence would test this?' }, true);
    const frozen = JSON.stringify(state);
    let next = art.dinoPartComparisonUpdate(state, rex, 'teeth', 'evidence', { life: 'Revised life observation' });
    expect(JSON.stringify(state)).toBe(frozen);
    expect(next[key].record.life).toBe('First life view'); expect(art.dinoPartComparisonIsRecorded(next[key])).toBe(false);
    next = art.dinoPartComparisonUpdate(next, rex, 'teeth', 'classic', { bone: 'Classic-view draft' });
    next = art.dinoPartComparisonUpdate(next, rex, 'eyes', 'evidence', { life: 'The eye sits inside the opening.' });
    next = art.dinoPartComparisonUpdate(next, dn('velociraptor'), 'teeth', 'evidence', { bone: 'Different specimen' });
    expect(Object.keys(next).sort()).toEqual(['tyrannosaurus|eyes|evidence', 'tyrannosaurus|teeth|classic', key, 'velociraptor|teeth|evidence'].sort());
    expect(next[key].bone).toBe('First bone view');
  });

  it('bounds restored student writing and drops forged contexts and automatic completion fields', () => {
    const { art } = load();
    const state = art.dinoPartComparisonState({
      'tyrannosaurus|teeth|evidence': { bone: 'b'.repeat(900), life: 'l'.repeat(900), question: 'q'.repeat(900), score: 100,
        record: { bone: 'Saved observation', life: 7, question: 'Saved question', visited: true } },
      'tyrannosaurus|lungs|evidence': { bone: 'Proxy', life: 'Proxy' },
      'microraptor|wing|classic': { bone: 'Feature absent in this hypothesis', life: 'Absent' },
      'made-up-animal|head|evidence': { bone: 'Forged', life: 'Forged' },
      'tyrannosaurus|eyes|evidence': [],
      'tyrannosaurus|head|evidence|extra': { bone: 'Bad key', life: 'Bad key' }
    });
    expect(Object.keys(state)).toEqual(['tyrannosaurus|teeth|evidence']);
    const entry = state['tyrannosaurus|teeth|evidence'];
    expect([entry.bone.length, entry.life.length, entry.question.length]).toEqual([600, 600, 400]);
    expect(entry.record).toBeNull(); expect(entry).not.toHaveProperty('score');
    expect(art.dinoPartComparisonState(null)).toEqual({}); expect(art.dinoPartComparisonState([])).toEqual({});
    expect(art.dinoPartComparisonState({ 'tyrannosaurus|head|evidence': {} })).toEqual({});
  });

  it('keeps restored entry count bounded as well as individual responses', () => {
    const { art } = load(), raw = {};
    for (const animal of art.DINOS) {
      for (const part of ['head', 'neck', 'trunk', 'tail']) {
        const context = art.dinoPartComparisonContext(animal, part, 'evidence');
        if (context) raw[context.key] = { bone: 'My bone observation', life: 'My life observation', question: '' };
      }
      if (Object.keys(raw).length >= 140) break;
    }
    expect(Object.keys(raw).length).toBeGreaterThan(120);
    expect(Object.keys(art.dinoPartComparisonState(raw))).toHaveLength(120);
  });

  it('exports model provenance, the exact saved context, source and unrecorded revision separately', () => {
    const { art, dn } = load(), rex = dn('tyrannosaurus');
    let state = art.dinoPartComparisonUpdate({}, rex, 'teeth', 'evidence', {
      bone: 'I can see individual tooth crowns.', life: 'The margin overlaps them.', question: 'What tissue impressions would help?' }, true);
    state = art.dinoPartComparisonUpdate(state, rex, 'teeth', 'evidence', { life: 'Revised: the crowns are concealed.' });
    const text = art.dinoPartComparisonNotebookText(state);
    expect(text).toContain('student observations of an illustrative reconstruction');
    expect(text).toContain('not a map of the bones preserved');
    expect(text).toContain('Tyrannosaurus'); expect(text).toContain('Landmark: Teeth');
    expect(text).toContain('Surface hypothesis: ' + art.dinoPartComparisonContext(rex, 'teeth', 'evidence').hypothesisLabel);
    expect(text).toContain('Latest recorded comparison\n'); expect(text).toContain('Life-view observation (student): The margin overlaps them.');
    expect(text).toContain('Current unrecorded draft\n'); expect(text).toContain('Life-view observation (student): Revised: the crowns are concealed.');
    expect(text).toContain('What tissue impressions would help?'); expect(text).toContain('https://doi.org/10.1126/science.abo7877');
    expect(text).toContain('exact form remains debated'); expect(text).toContain('has not been automatically assessed');
    expect(art.dinoPartComparisonNotebookText({})).toBe('');
  });
});

describe('Selected landmark observation workspace', () => {
  it('keeps own comparison drafts and records beside the selected marker without changing its camera or earlier notes', async () => {
    const view = await mount(); await view.select('teeth'); view.camera.mockClear();
    const canvas = view.host.querySelector('.dinolab-3d-canvas');
    const form = view.host.querySelector('.dinolab-part-comparison'); expect(form).not.toBeNull();
    if (form.tagName === 'DETAILS') form.open = true;
    const button = form.querySelector('[data-dino-part-comparison-record]');
    expect(button.disabled).toBe(true); expect(button.getAttribute('aria-describedby')).toContain('dinolab-part-comparison-help');
    expect(form.querySelector('#dinolab-part-comparison-help').textContent.toLowerCase()).toContain('both');
    for (const field of ['bone', 'life', 'question']) {
      const input = form.querySelector('#dinolab-part-comparison-' + field);
      expect(form.querySelector('label[for="' + input.id + '"]')).not.toBeNull();
      expect(input.value).toBe(''); expect(input.maxLength).toBe(field === 'question' ? 400 : 600);
    }
    await view.write('bone', 'I see tooth crowns in a row.'); expect(button.disabled).toBe(true);
    await view.write('life', 'The mouth surface covers that row.'); expect(button.disabled).toBe(false);
    await view.write('question', 'What evidence supports the mouth covering?'); await view.save();
    const entry = view.data().field3dPartComparisons['tyrannosaurus|teeth|evidence'];
    expect(entry.record).toEqual({ bone: 'I see tooth crowns in a row.', life: 'The mouth surface covers that row.', question: 'What evidence supports the mouth covering?' });
    expect(view.data().notebook.tyrannosaurus.observation).toBe('Earlier observation');
    expect(view.data().field3dScanLogged).toEqual({ skull: true });
    expect(view.data().field3dShowSkeleton).toBe(true); expect(view.data().field3dShowBody).toBe(true);
    expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas);
    expect(view.host.querySelector('#dinolab-part-picker').value).toBe('teeth'); expect(view.camera).not.toHaveBeenCalled();
    await view.select('eyes'); expect(view.host.querySelector('#dinolab-part-comparison-bone').value).toBe('');
    await view.select('teeth'); expect(view.host.querySelector('#dinolab-part-comparison-bone').value).toBe('I see tooth crowns in a row.');
    await view.patch({ field3dReconstructionMode: 'classic' }); expect(view.host.querySelector('#dinolab-part-comparison-bone').value).toBe('');
    await view.patch({ field3dReconstructionMode: 'evidence' }); expect(view.host.querySelector('#dinolab-part-comparison-bone').value).toBe('I see tooth crowns in a row.');
  }, 120000);

  it('shows recorded landmark observations and current revisions in the existing field notebook', async () => {
    const api = load(), rex = api.dn('tyrannosaurus');
    let state = api.art.dinoPartComparisonUpdate({}, rex, 'teeth', 'evidence', { bone: 'Bone observation', life: 'Recorded surface observation', question: 'My next evidence question' }, true);
    state = api.art.dinoPartComparisonUpdate(state, rex, 'teeth', 'evidence', { life: 'Current revised observation' });
    const view = await mount({ tab: 'notes', notebookSpecies: 'tyrannosaurus', notebook: {}, field3dPartComparisons: state });
    const heading = view.host.querySelector('#dino-model-comparisons-notebook'); expect(heading).not.toBeNull();
    const section = heading.closest('section'); expect(section).not.toBeNull();
    expect(section.textContent).toContain('Teeth'); expect(section.textContent).toContain('Recorded surface observation');
    expect(section.textContent).toContain('Current revised observation'); expect(section.textContent).toContain('My next evidence question');
    expect(section.textContent.toLowerCase()).toContain('model');
    expect(section.querySelector('a[href="https://doi.org/10.1126/science.abo7877"]')).not.toBeNull();
    const download = Array.from(view.host.querySelectorAll('button')).find(button => button.textContent.trim() === 'Download notebook');
    expect(download).toBeDefined(); expect(download.disabled).toBe(false);
  }, 120000);
});
