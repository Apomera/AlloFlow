import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX, renderers, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = [];
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.ratio = 1; this.capabilities = { isWebGL2: true }; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  window.THREE = { ...THREE, WebGLRenderer: Renderer };
  window.Reef3DSpecies = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [0, .3, 3.2], lookY: 0 } }), create: () => { const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial())); return { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; } };
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((k, v) => v);
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.THREE; delete window.Reef3DSpecies;
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const q = (t, s) => t.host.querySelector(s);
const named = (t, text) => [...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const target = t => q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function change(el, value) { await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function mount({ saved = { clownfish: true }, translated = false } = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: saved, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const labels = translated ? { 'stem.coralreef.dx_open': 'Apri il profilo', 'stem.coralreef.cx_profile': 'Profilo completo', 'stem.coralreef.ds_save': 'Salva', 'stem.coralreef.ds_saved_badge': 'Salvato', 'stem.coralreef.dx_action_named': '{action} — {name}' } : {};
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => labels[k] || v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function start(t, mode = 'picture') { await click(q(t, '[data-start-practice]')); await change(q(t, '[data-practice-collection-select]'), 'saved'); if (mode === 'marks') await click(q(t, '[data-practice-mode="marks"]')); await click(q(t, '[data-practice-start]')); }
function aligned(button, id) { expect(button).toBeTruthy(); expect(button.getAttribute('aria-label')).toContain(button.textContent.trim()); expect(button.getAttribute('aria-label')).toContain(X.guideShortName ? X.guideShortName(TX[id].name) : TX[id].name.split(' (')[0]); }
async function complete(t) { while (q(t, '[data-marine-practice="active"]')) { await click(q(t, '[data-practice-choice="' + target(t) + '"]')); await click(q(t, '[data-practice-next]')); } }

describe('guide and practice accessibility repairs', () => {
  it.each([false, true])('keeps visible guide/comparison actions in accessible names with species context (translated=%s)', async translated => {
    const t = await mount({ translated });
    aligned(q(t, '[data-open-profile="clownfish"]'), 'clownfish');
    const save = q(t, '[data-save-guide="clownfish"]'); aligned(save, 'clownfish'); expect(save.getAttribute('aria-pressed')).toBe('true');
    await click(save); aligned(q(t, '[data-save-guide="clownfish"]'), 'clownfish'); expect(save.getAttribute('aria-pressed')).toBe('false');
    await click(q(t, '[data-open-profile="clownfish"]')); await click(q(t, '[data-start-comparison]'));
    [...t.host.querySelectorAll('[data-comparison-study]')].forEach(b => aligned(b, b.dataset.comparisonStudy));
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });

  it('keeps candidate, recap, and completed-review profile labels aligned without changing the learning records', async () => {
    const t = await mount({ saved: { clownfish: true, blue_tang: true } }); await start(t);
    const id = target(t), wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== id);
    await click(wrong); await click(q(t, '[data-practice-compare-toggle]'));
    [...t.host.querySelectorAll('[data-practice-guess-study]')].forEach(b => aligned(b, b.dataset.practiceGuessStudy));
    await click(q(t, '[data-practice-next]')); await React.act(async () => { q(t, '[data-practice-recap]').open = true; });
    aligned(q(t, '[data-practice-recap-study="' + id + '"]'), id);
    await complete(t);
    [...t.host.querySelectorAll('[data-practice-review-organism]')].forEach(row => aligned(row.querySelector(':scope > button'), row.dataset.practiceReviewOrganism));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 1, last: { total: 2, skipped: 0 } });
    expect(t.data.speciesBookmarks).toEqual({ clownfish: true, blue_tang: true }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' });
  });

  it.each(['picture', 'marks'])('announces each new %s clue once while leaving unrelated interactions quiet', async mode => {
    const t = await mount(); await start(t, mode);
    const clues = X.marinePracticeClues(TX.clownfish, X.SPECIES_META.find(m => m.id === 'clownfish'));
    const status = q(t, '[data-practice-clue-announcement]'); expect(status.textContent).toBe(''); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    await click(q(t, '[data-practice-clue-toggle]')); expect(q(t, '[data-practice-clue-announcement]')).toBe(status); expect(status.textContent).toBe(clues[1]);
    expect(q(t, '[data-practice-clue-count]').getAttribute('role')).toBeNull(); expect(q(t, '[data-practice-clue-count]').getAttribute('aria-live')).toBeNull();
    await click(q(t, '[data-practice-another-clue]')); expect(status.textContent).toBe(clues[2]); expect(document.activeElement).toBe(q(t, '[data-practice-another-clue]'));
    const mutations = []; const observer = new MutationObserver(records => mutations.push(...records)); observer.observe(status, { childList: true, characterData: true, subtree: true });
    await click(q(t, '[data-practice-compare-toggle]')); await click(q(t, '[data-practice-comparison-close]'));
    await React.act(async () => { q(t, '[data-practice-observation]').open = true; }); await click(q(t, '[data-confidence-choice="hunch"]'));
    expect(mutations).toHaveLength(0); observer.disconnect();
    expect(status.textContent.toLowerCase()).not.toContain(TX.clownfish.name.toLowerCase());
    await click(q(t, '[data-practice-clue-toggle]')); expect(status.textContent).toBe('');
    await click(q(t, '[data-practice-choice="clownfish"]')); expect(status.textContent).toBe(''); await click(q(t, '[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 1 });
    await click(named(t, 'Meet another collection')); expect(q(t, '[data-practice-clue-announcement]').textContent).toBe('');
  });

  it.each([true, false])('focuses ordinary answer feedback with named non-live content and keeps the first result locked (correct=%s)', async correct => {
    const t = await mount(); await start(t); const id = target(t);
    const buttons = [...t.host.querySelectorAll('[data-practice-choice]')], chosen = buttons.find(b => (b.dataset.practiceChoice === id) === correct);
    await click(chosen); const result = q(t, '[data-practice-feedback]'); expect(document.activeElement).toBe(result);
    expect(result.getAttribute('role')).toBe('group'); expect(result.getAttribute('aria-live')).toBeNull();
    expect(document.getElementById(result.getAttribute('aria-labelledby')).textContent).toContain(TX[id].name);
    expect(document.getElementById(result.getAttribute('aria-describedby')).textContent).toContain(TX[id].marks[0]);
    const text = result.textContent; await React.act(async () => buttons.find(b => b !== chosen).click());
    expect(q(t, '[data-practice-feedback]').textContent).toBe(text); expect(document.activeElement).toBe(result);
    await click(q(t, '[data-practice-next]')); expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: correct ? 1 : 0, skipped: 0, hinted: 0 });
  });

  it.each(['question', 'recall'])('keeps the %s inspector opener before its controlled viewer without losing focus or changing records', async mode => {
    const t = await mount(); await start(t);
    if (mode === 'recall') { await complete(t); await React.act(async () => { q(t, '[data-practice-recall]').open = true; }); await click(q(t, '[data-practice-recall-reveal]')); }
    const before = JSON.stringify(t.data), selector = mode === 'recall' ? '[data-practice-recall-inspect]' : '[data-practice-specimen-toggle]';
    const opener = q(t, selector), controlled = document.getElementById(opener.getAttribute('aria-controls'));
    expect(opener.compareDocumentPosition(controlled) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(renderers).toHaveLength(0);
    await click(opener); expect(q(t, selector)).toBe(opener); expect(document.activeElement).toBe(opener); expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy();
    expect(controlled.contains(q(t, '[data-specimen-canvas]'))).toBe(true); expect(opener.compareDocumentPosition(q(t, '[data-specimen-canvas]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await click(opener); expect(q(t, '[data-specimen-canvas]')).toBeNull(); expect(document.activeElement).toBe(opener); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(JSON.stringify(t.data)).toBe(before);
  });
});
