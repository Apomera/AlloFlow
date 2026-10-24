import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import axe from 'axe-core';

let pipeline;
const frames = [];
beforeAll(() => {
  window.React ||= createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Vocabulary', state: {},
  });
});
afterEach(() => frames.splice(0).forEach(frame => frame.remove()));
const item = (id, words = ['Leaf', 'Root', 'Stem']) => ({ id, type: 'glossary', title: id, data: words.map(term => ({ term, def: `Definition of ${term}.`, translations: { Spanish: `${term} in Spanish` } })) });
function pack(items, config = {}) {
  return pipeline.generateFullPackHTML(items, 'Export checks', false, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], ...config });
}
function sandbox(html, { media = 'modern' } = {}) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const scripts = [...parsed.querySelectorAll('script')].map(script => script.textContent);
  // Preserve each script's actual DOM location without automatically running
  // the full pack runtime (including its unrelated identity dialog).
  parsed.querySelectorAll('script').forEach((script, index) => {
    script.type = 'application/x-alloflow-test';
    script.setAttribute('data-test-runtime', String(index));
  });
  const frame = document.createElement('iframe');
  document.body.append(frame);
  frames.push(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  doc.open(); doc.write(parsed.documentElement.outerHTML); doc.close();
  const scriptNodes = [...doc.querySelectorAll('script[data-test-runtime]')];
  const mediaListeners = [];
  const mql = { matches: false };
  if (media === 'modern') mql.addEventListener = (_, fn) => mediaListeners.push(fn);
  else if (media === 'legacy') mql.addListener = fn => mediaListeners.push(fn);
  win.matchMedia = media === 'absent' ? undefined : () => mql;
  return {
    win, doc, scripts,
    run: (text, currentScript = null) => {
      const prior = Object.getOwnPropertyDescriptor(doc, 'currentScript');
      Object.defineProperty(doc, 'currentScript', { configurable: true, value: currentScript });
      try { return new Function('window', 'document', 'Math', text)(win, doc, Object.assign(Object.create(Math), { random: () => 0 })); }
      finally { if (prior) Object.defineProperty(doc, 'currentScript', prior); else delete doc.currentScript; }
    },
    scriptNodes,
    printEvent: name => win.dispatchEvent(new win.Event(name)),
    printMedia: matches => { mql.matches = matches; mediaListeners.forEach(fn => fn({ matches })); },
  };
}
function selfTestRuntime(env) {
  const scripts = env.scriptNodes.filter(script => script.textContent.includes('var printState = null;'));
  expect(scripts.length).toBeGreaterThan(0);
  scripts.forEach(script => env.run(script.textContent, script));
}
function cardRuntime(env) {
  // Run the actual exported interaction IIFE, isolated from the unrelated
  // autosave identity dialog and reader tools in the same downloaded document.
  const marker = '// ── Glossary flash-card interactions';
  const next = '// ── Concept-sort tap-to-place interaction';
  const runtime = env.scripts.find(script => script.includes(marker));
  const start = runtime.indexOf('(function()', runtime.indexOf(marker));
  const end = runtime.indexOf(next, start);
  expect(end).toBeGreaterThan(start);
  env.run(runtime.slice(start, end));
}
const cells = (env, id) => [...env.doc.querySelectorAll(`#${id} details.alloflow-glossary-cell`)];
const state = details => details.map(detail => detail.open);

describe('downloaded self-test print lifecycle', () => {
  it.each(['modern', 'legacy', 'absent'])('reveals every definition for print, then restores each study choice (%s media API)', media => {
    const env = sandbox(pack([item('g1')], { glossarySelfTest: true }), { media });
    selfTestRuntime(env);
    const details = cells(env, 'g1');
    expect(details.length).toBeGreaterThan(2);
    details[1].open = true;
    const before = state(details);
    env.printEvent('beforeprint');
    expect(details.every(detail => detail.open)).toBe(true);
    env.printEvent('afterprint');
    expect(state(details)).toEqual(before);
    // A second print snapshots the student's new reveal choice.
    details[0].open = true;
    const second = state(details);
    env.printEvent('beforeprint'); env.printEvent('afterprint');
    expect(state(details)).toEqual(second);
  });
  it.each(['modern', 'legacy'])('supports print-preview media entry/exit without print events (%s)', media => {
    const env = sandbox(pack([item('g1')], { glossarySelfTest: true }), { media });
    selfTestRuntime(env);
    const details = cells(env, 'g1');
    const before = state(details);
    env.printMedia(true);
    expect(details.every(detail => detail.open)).toBe(true);
    env.printMedia(false);
    expect(state(details)).toEqual(before);
  });
  it('does not overwrite the saved reveal choices when both media and print events fire', () => {
    const env = sandbox(pack([item('g1')], { glossarySelfTest: true }));
    selfTestRuntime(env);
    const details = cells(env, 'g1');
    details[0].open = true;
    const before = state(details);
    env.printMedia(true); env.printEvent('beforeprint'); env.printEvent('beforeprint');
    env.printEvent('afterprint'); env.printMedia(false);
    expect(state(details)).toEqual(before);
  });
  it('restores two independent glossaries without changing unrelated details', () => {
    const env = sandbox(pack([item('g1'), item('g2')], { glossarySelfTest: true }));
    const unrelated = env.doc.createElement('details');
    env.doc.body.append(unrelated);
    selfTestRuntime(env);
    cells(env, 'g1')[0].open = true;
    cells(env, 'g2')[1].open = true;
    const first = state(cells(env, 'g1')), second = state(cells(env, 'g2'));
    env.printEvent('beforeprint');
    expect(unrelated.open).toBe(false);
    expect([...cells(env, 'g1'), ...cells(env, 'g2')].every(detail => detail.open)).toBe(true);
    env.printEvent('afterprint');
    expect(state(cells(env, 'g1'))).toEqual(first);
    expect(state(cells(env, 'g2'))).toEqual(second);
  });
  it('binds each self-test copy in an independent-mode teacher export even when resource IDs repeat', () => {
    const independent = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {},
      getDefaultTitle: () => 'Vocabulary', state: { isIndependentMode: true },
    });
    const html = independent.generateFullPackHTML([item('g1')], 'Study and key', false, {}, { includeGlossary: true, includeTeacherKey: true, glossarySelfTest: true, annotations: [] });
    const env = sandbox(html);
    const sections = [...env.doc.querySelectorAll('[data-glossary-section="g1"]')];
    expect(sections).toHaveLength(2);
    selfTestRuntime(env);
    const first = [...sections[0].querySelectorAll('details')], second = [...sections[1].querySelectorAll('details')];
    sections[1].querySelector('.alloflow-glossary-reveal-all').click();
    expect(first.every(detail => !detail.open)).toBe(true);
    expect(second.every(detail => detail.open)).toBe(true);
    second[1].open = false;
    first[0].open = true;
    const priorFirst = state(first), priorSecond = state(second);
    env.printEvent('beforeprint');
    expect([...first, ...second].every(detail => detail.open)).toBe(true);
    env.printEvent('afterprint');
    expect(state(first)).toEqual(priorFirst);
    expect(state(second)).toEqual(priorSecond);
    sections[0].querySelector('.alloflow-glossary-hide-all-tbl').click();
    expect(first.every(detail => !detail.open)).toBe(true);
    expect(state(second)).toEqual(priorSecond);
  });
});

describe('downloaded flash-card section controls', () => {
  it.each(['flash-cards', 'language-cards'])('%s retains valid accessible semantics after becoming interactive', async mode => {
    const env = sandbox(pack([item('g1'), item('g2')], { glossaryDisplayMode: mode }));
    cardRuntime(env);
    env.win.eval(axe.source);
    const result = await env.win.axe.run(env.doc.querySelector('#g1'), { runOnly: { type: 'rule', values: ['aria-required-children', 'aria-required-parent', 'button-name'] } });
    expect(result.violations).toEqual([]);
    const group = env.doc.querySelector('#g1 .alloflow-glossary-card-list');
    expect(group.getAttribute('aria-label')).toBeTruthy();
    const card = group.firstElementChild;
    expect(card.getAttribute('role')).toBe('button');
    card.focus();
    card.dispatchEvent(new env.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(env.doc.activeElement).toBe(card);
    expect(env.doc.querySelector('#g2 .alloflow-glossary-card').getAttribute('aria-pressed')).toBe('false');
  });
  it.each(['flash-cards', 'language-cards'])('%s binds Show all and Hide all in every glossary to its own cards', mode => {
    const env = sandbox(pack([item('g1'), item('g2')], { glossaryDisplayMode: mode }));
    cardRuntime(env);
    const pressed = id => [...env.doc.querySelectorAll(`#${id} .alloflow-glossary-card`)].map(card => card.getAttribute('aria-pressed'));
    expect(pressed('g1')).toEqual(['false', 'false', 'false']);
    env.doc.querySelector('#g2 .alloflow-glossary-show-all').click();
    expect(pressed('g1')).toEqual(['false', 'false', 'false']);
    expect(pressed('g2')).toEqual(['true', 'true', 'true']);
    env.doc.querySelector('#g1 .alloflow-glossary-show-all').click();
    env.doc.querySelector('#g2 .alloflow-glossary-hide-all').click();
    expect(pressed('g1')).toEqual(['true', 'true', 'true']);
    expect(pressed('g2')).toEqual(['false', 'false', 'false']);
  });
  it.each(['g1', 'g2'])('shuffles only %s, preserves all its cards, and resets only its revealed state', id => {
    const env = sandbox(pack([item('g1'), item('g2')], { glossaryDisplayMode: 'flash-cards' }));
    cardRuntime(env);
    const other = id === 'g1' ? 'g2' : 'g1';
    const cards = key => [...env.doc.querySelectorAll(`#${key} .alloflow-glossary-card`)];
    const before = cards(id), untouched = cards(other);
    [id, other].forEach(key => env.doc.querySelector(`#${key} .alloflow-glossary-show-all`).click());
    env.doc.querySelector(`#${id} .alloflow-glossary-shuffle`).click();
    expect(cards(id)).toEqual([before[1], before[2], before[0]]);
    expect(cards(other)).toEqual(untouched);
    expect(cards(id).every(card => card.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(cards(other).every(card => card.getAttribute('aria-pressed') === 'true')).toBe(true);
  });
  it('keeps click and keyboard reveal working after a shuffle', () => {
    const env = sandbox(pack([item('g1'), item('g2')], { glossaryDisplayMode: 'flash-cards' }));
    cardRuntime(env);
    env.doc.querySelector('#g2 .alloflow-glossary-shuffle').click();
    const card = env.doc.querySelector('#g2 .alloflow-glossary-card');
    card.click();
    expect(card.getAttribute('aria-pressed')).toBe('true');
    card.dispatchEvent(new env.win.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(card.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('word-wall print layout contract', () => {
  it.each([2, 3, 4])('%i per page preserves the grouping and content, with intrinsic card growth instead of a clipping box', count => {
    const doc = new DOMParser().parseFromString(pack([item('wall', ['Photosynthesis', 'Electromagnetic radiation', 'Cell', 'Plant', 'Root'])], { glossaryDisplayMode: 'word-wall', glossaryWordWallDefinition: true, glossaryWordWallPerPage: count }), 'text/html');
    const pages = [...doc.querySelectorAll('.alloflow-word-wall-page')];
    expect(pages.map(page => page.children.length)).toEqual(count === 2 ? [2, 2, 1] : count === 3 ? [3, 2] : [4, 1]);
    expect(doc.querySelectorAll('.alloflow-word-wall-def')).toHaveLength(5);
    const sheet = [...doc.querySelectorAll('style')].find(style => style.textContent.includes('.alloflow-word-wall-card'));
    // jsdom does not paginate or lay out print media. Assert the emitted print
    // rules here; Chromium geometry checks cover their actual visible result.
    expect(sheet.textContent).toMatch(/\.alloflow-word-wall-card \{ height:auto; min-height:var\(--wall-card-height\)/);
    expect(sheet.textContent).not.toContain('overflow:hidden');
    expect(doc.querySelector('.alloflow-word-wall').style.getPropertyValue('--wall-card-height')).toMatch(/^\d+\.\d+in$/);
  });
  it('uses the selected paper size, orientation and margins to budget the cards', () => {
    const render = config => new DOMParser().parseFromString(pack([item('wall')], { glossaryDisplayMode: 'word-wall', glossaryWordWallPerPage: 4, ...config }), 'text/html');
    const portrait = render({ pageSize: 'letter', pageOrientation: 'portrait', pageMargin: '1in' });
    const landscape = render({ pageSize: 'a4', pageOrientation: 'landscape', pageMargin: '1.5in' });
    const height = doc => parseFloat(doc.querySelector('.alloflow-word-wall').style.getPropertyValue('--wall-card-height'));
    expect(height(landscape)).toBeLessThan(height(portrait));
    expect([...landscape.querySelectorAll('style')].some(style => style.textContent.includes('@page { size:a4 landscape; }'))).toBe(true);
  });
});
