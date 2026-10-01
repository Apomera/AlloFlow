import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupDinoLab, renderTab, internals } from './helpers/dino_lab_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let api, root, host, data;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
async function mount(initial) {
  document.body.innerHTML = ''; data = { tab: 'extinction', ...initial };
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
const button = text => [...host.querySelectorAll('button')].find(n => n.textContent === text);
async function click(node) { expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
async function input(selector, value) {
  await api.React.act(async () => {
    const node = host.querySelector(selector);
    if (node.tagName === 'SELECT') { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }
    else { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }
  });
}
const draft = () => ({ citations: ['crater', 'soot'], claim: 'An impact affected distant habitats.', reasoning: 'The crater supports impact; reduced light connects it to food webs.', limit: 'The duration of darkness needs more evidence.' });

describe('extinction investigation', () => {
  it('distinguishes sources by role, supplies limits, and identifies schematic illustrations', () => {
    const items = internals().KPG_EVIDENCE;
    expect(items.map(item => item.kind)).toEqual(['rock', 'rock', 'rock', 'model', 'context']);
    for (const item of items) {
      document.body.innerHTML = renderTab({ tab: 'extinction', kpgInvestigation: { source: item.id } });
      const detail = document.querySelector('#dino-kpg-source-detail');
      expect(detail.querySelector('svg[role=img]').getAttribute('aria-label')).toBe(item.diagram);
      expect(detail.textContent).toContain(item.limit);
      expect(detail.querySelector('a').getAttribute('href')).toBe(item.url);
      expect(document.querySelectorAll('[data-kpg-source][aria-pressed=true]')).toHaveLength(1);
    }
    expect(items.find(item => item.id === 'soot').limit).toContain('not direct observations');
    expect(items.find(item => item.id === 'crater').text).toContain('uncertainty');
  });

  it('keeps first pathway attempts, gives misconception feedback, and clears stale feedback after edits', async () => {
    await mount({ kpgInvestigation: { step: 1 } });
    expect(button('Check my connections').disabled).toBe(true);
    await click(host.querySelector('#dino-kpg-link-sky-local'));
    await click(host.querySelector('#dino-kpg-link-plants-all'));
    await click(host.querySelector('#dino-kpg-link-web-hunters'));
    await click(button('Check my connections'));
    expect(host.querySelector('#dino-kpg-feedback-web').textContent).toContain('Predators depend on prey');
    expect(data.kpgInvestigation.firstLinks).toEqual({ sky: 'local', plants: 'all', web: 'hunters' });
    await click(host.querySelector('#dino-kpg-link-web-connections'));
    expect(host.querySelector('#dino-kpg-feedback-web')).toBeNull();
    await click(button('Check my connections'));
    expect(data.kpgInvestigation.firstLinks.web).toBe('hunters');
    expect(host.querySelector('#dino-kpg-feedback-web').textContent).toContain('Supported connection.');
    expect(data.quizScore).toBeUndefined();
  });

  it('requires both rock and model sources for recording, preserves first writing, and keeps unrelated work', async () => {
    const notebook = { microraptor: { question: 'Gliding?' } }, evidenceWorkbench = { caseId: 'scales' };
    await mount({ notebook, evidenceWorkbench, kpgInvestigation: { step: 2 } });
    for (const field of ['claim', 'reasoning', 'limit']) await input('#dino-kpg-' + field, draft()[field]);
    await click(host.querySelector('[data-kpg-citation=crater]'));
    expect(button('Record my explanation').disabled).toBe(true);
    await click(host.querySelector('[data-kpg-citation=soot]'));
    expect(button('Record my explanation').disabled).toBe(false);
    await click(button('Record my explanation'));
    expect(data.kpgInvestigation.first).toEqual(draft());
    expect(button('Record my revision').disabled).toBe(true);
    await input('#dino-kpg-claim', 'My more limited explanation.');
    expect(host.textContent).toContain('unrecorded revision');
    await click(button('Record my revision'));
    expect(data.kpgInvestigation.first).toEqual(draft());
    expect(data.kpgInvestigation.record.claim).toBe('My more limited explanation.');
    await click(button('View in my field notebook'));
    expect(button('Download notebook').disabled).toBe(false);
    expect(host.textContent).toContain('My more limited explanation.');
    await click(button('Resume my extinction investigation'));
    expect(host.querySelector('#dino-kpg-claim').value).toBe('My more limited explanation.');
    expect(data.notebook).toEqual(notebook); expect(data.evidenceWorkbench).toEqual(evidenceWorkbench);
  });

  it('exports citations, first choices, recorded revisions, and a current unrecorded draft without substituting an example', () => {
    const raw = { ...draft(), first: draft(), record: { ...draft(), claim: 'Recorded revision' }, claim: '<script>My current draft</script>', firstLinks: { sky: 'local', plants: 'all', web: 'hunters' }, links: { sky: 'particles' } };
    const text = internals().kpgNotebookText(raw);
    for (const part of ['First checked pathway', 'Current pathway choices', 'First recorded explanation', 'Latest recorded explanation', 'Current draft (not yet recorded)', 'Recorded revision', raw.claim, 'https://doi.org/10.1126/science.1230492', 'https://doi.org/10.1038/s41561-023-01290-4', 'without automatic assessment']) expect(text).toContain(part);
    expect(internals().kpgNotebookText(null)).toBe('');
    document.body.innerHTML = renderTab({ tab: 'notes', kpgInvestigation: raw });
    expect(document.querySelector('script')).toBeNull();
    expect(document.body.textContent).toContain(raw.claim);
  });

  it('normalizes malformed saved state, bounds text, and rejects incomplete recorded snapshots', () => {
    const I = internals();
    for (const raw of [null, 4, [], 'invalid', { step: 999, source: '__proto__', checked: true }]) {
      const s = I.kpgState(raw); expect(s.step).toBe(0); expect(s.source).toBe('iridium'); expect(s.checked).toBe(false);
      expect(renderTab({ tab: 'extinction', kpgInvestigation: raw })).toContain('One impact. A world of consequences.');
    }
    const s = I.kpgState({ citations: ['soot','soot','bad'], claim: 'x'.repeat(2000), reasoning: {}, limit: false, links: { sky: 'bogus', web: 'connections' }, firstLinks: { sky: 'local' }, record: { ...draft(), citations: ['soot'] } });
    expect(s.citations).toEqual(['soot']); expect(s.claim).toHaveLength(1500); expect(s.reasoning).toBe('');
    expect(s.links).toEqual({ web: 'connections' }); expect(s.firstLinks).toBeNull(); expect(s.record).toBeNull();
  });

  it('keeps worked examples separate and exposes partial investigation work in the notebook', async () => {
    await mount({ kpgInvestigation: { step: 2 } });
    const summary = [...host.querySelectorAll('summary')].find(n => n.textContent === 'Sentence starters and a worked example');
    await click(summary);
    expect(host.querySelector('#dino-kpg-claim').value).toBe('');
    await input('#dino-kpg-claim', 'I am still investigating.');
    await click(button('View in my field notebook'));
    expect(button('Download notebook').disabled).toBe(false);
    expect(host.textContent).toContain('Investigation in progress');
  });

  it('allows closing the default K-Pg reference accordion', async () => {
    await mount({});
    const row = [...host.querySelectorAll('.dinolab-kpg-overview button')].find(node => node.textContent.includes('End-Cretaceous'));
    expect(row.getAttribute('aria-expanded')).toBe('true'); await click(row);
    expect(row.getAttribute('aria-expanded')).toBe('false'); expect(data.extOpen).toBeNull();
  });

  it('registers every new dynamic string and keeps the shipped module in parity', () => {
    const calls = [], I = internals(), src = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
    I.kpgLinks((key, value) => { calls.push([key, value]); return value; });
    for (const item of I.KPG_EVIDENCE) for (const field of ['label','text','supports','limit','source','diagram']) calls.push(['stem.dinolab.kpg_' + item.id + '_' + field, item[field]]);
    for (const m of src.matchAll(/\bkt\('([^']+)', '((?:[^'\\]|\\.)*)'\)/g)) calls.push(['stem.dinolab.kpg_' + m[1], m[2].replace(/\\'/g, "'")]);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) { const ui = JSON.parse(readFileSync(file, 'utf8')); for (const [key, value] of calls) expect(key.split('.').reduce((v, k) => v[k], ui), key).toBe(value); }
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8')).toBe(src);
  });
});
