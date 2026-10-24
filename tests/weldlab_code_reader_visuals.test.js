import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const IDS = ['d1_1', 'asme9', 'api1104'];
const LABELS = { d1_1: 'AWS D1.1', asme9: 'ASME Section IX', api1104: 'API 1104' };
const fixtures = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-code-reader-baseline.json'), 'utf8'));
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'codes', insp2_codesTab: 'read', codes_pick: 'd1_1', ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-code-reader]');
const $ = q => panel().querySelector(q);
const tiles = () => [...panel().querySelectorAll('[data-code-reader-section]')];
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function code(id) { await click([...host.querySelectorAll('button')].find(el => el.textContent.trim() === LABELS[id])); }
async function search(value) { await React.act(() => Simulate.change($('[data-code-reader-search]'), { target: { value } })); }
async function choose(num) { await click($('[data-code-reader-section="' + num + '"]')); }
async function nav(id) { await click($('[data-code-reader-nav="' + id + '"]')); }
const reading = () => ({ number: $('[data-code-reader-number]').textContent, title: $('[data-code-reader-title]').textContent, body: $('[data-code-reader-body]').textContent });

describe('Code reader section index and reading pane', () => {
  it('preserves every original number, title, body and edition note across all three outlines', async () => {
    await mount();
    for (const id of IDS) {
      await code(id); const expected = fixtures[id];
      expect(panel().dataset.code).toBe(id); expect(tiles()).toHaveLength(expected.rows.length);
      expect($('[data-code-reader-note]').textContent).toBe(expected.note);
      const refs = [...panel().querySelectorAll('[data-code-reader-reference]')];
      expect(refs.map(el => ({ number: el.querySelector('[data-code-reader-reference-number]').textContent,
        title: el.querySelector('[data-code-reader-reference-title]').textContent, body: el.querySelector('[data-code-reader-reference-body]').textContent }))).toEqual(expected.rows);
      for (let index = 0; index < expected.rows.length; index++) {
        const num = tiles()[index].dataset.codeReaderSection; await choose(num);
        expect(reading()).toEqual(expected.rows[index]);
        expect(tiles().filter(el => el.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
        expect($('[data-code-reader-nav="previous"]').disabled).toBe(index === 0);
        expect($('[data-code-reader-nav="next"]').disabled).toBe(index === expected.rows.length - 1);
      }
    }
  });

  it('searches formatted numbers, titles and bodies with plain case-insensitive substrings', async () => {
    await mount();
    for (const query of ['  CLAUSE 8  ', 'fatigue', 'wps', 'Qualification', 'ASTM']) {
      await search(query);
      const wanted = fixtures.d1_1.rows.filter(row => (row.number + ' ' + row.title + ' ' + row.body).toLowerCase().includes(query.trim().toLowerCase()));
      expect(tiles().map(el => el.textContent)).toHaveLength(wanted.length);
      expect(tiles().map(el => el.querySelector('.font-mono').textContent)).toEqual(wanted.map(row => row.number));
      expect(reading()).toEqual(wanted[0]);
      expect($('[data-code-reader-count]').textContent).toBe(wanted.length + ' of 11 section summaries shown.');
    }
  });

  it('steps only through the matching summaries in listed order, without wrapping or numeric assumptions', async () => {
    await mount(); await search('qualification');
    const wanted = fixtures.d1_1.rows.filter(row => (row.number + ' ' + row.title + ' ' + row.body).toLowerCase().includes('qualification'));
    expect(wanted.length).toBeGreaterThan(1); expect(reading()).toEqual(wanted[0]);
    await nav('previous'); expect(reading()).toEqual(wanted[0]);
    for (const row of wanted.slice(1)) { await nav('next'); expect(reading()).toEqual(row); }
    await nav('next'); expect(reading()).toEqual(wanted.at(-1));
    await nav('previous'); expect(reading()).toEqual(wanted.at(-2));
    await code('asme9'); await choose('QW-500'); expect(reading().number).toBe('QW-500');
    await code('api1104'); expect(reading().number).toBe('Section 1-4'); await nav('next'); expect(reading().number).toBe('Section 5');
  });

  it('shows an honest empty state and keeps the full outline available for punctuation or no matches', async () => {
    await mount();
    for (const query of ['not-a-section-xyz', '[.*', '"<script>']) {
      await search(query); expect(tiles()).toHaveLength(0);
      expect($('[data-code-reader-reading]')).toBeNull(); expect($('[data-code-reader-empty]').textContent).toContain('No section summaries match');
      expect($('[data-code-reader-count]').textContent).toBe('0 of 11 section summaries shown.');
      expect(panel().querySelectorAll('[data-code-reader-reference]')).toHaveLength(11);
    }
    await click($('[data-code-reader-clear]')); expect(tiles()).toHaveLength(11); expect(reading()).toEqual(fixtures.d1_1.rows[0]);
    expect($('[data-code-reader-clear]').disabled).toBe(true);
  });

  it('clears search and selection on a code switch, including when returning to the previous code', async () => {
    const app = await mount(); await choose('8'); await search('acceptance');
    await code('asme9'); expect($('[data-code-reader-search]').value).toBe(''); expect(reading()).toEqual(fixtures.asme9.rows[0]);
    await choose('QW-400'); await code('d1_1'); expect($('[data-code-reader-search]').value).toBe(''); expect(reading()).toEqual(fixtures.d1_1.rows[0]);
    expect(app.latest().codes_pick).toBe('d1_1');
  });

  it('bounds search input and ignores invalid synthetic value types without persisting exploration', async () => {
    const app = await mount({ insp2_clause: { 0: 1 }, insp2_clauseIdx: 1, insp2_sort: { 2: 0 }, insp2_sortIdx: 2 });
    const before = structuredClone(app.latest()), writes = app.writes.length;
    await search('x'.repeat(200)); expect($('[data-code-reader-search]').value.length).toBe(120);
    await search({ bad: true }); expect($('[data-code-reader-search]').value.length).toBe(120);
    await search('qualification'); await nav('next'); await choose(tiles()[0].dataset.codeReaderSection);
    await click($('[data-code-reader-clear]')); expect(app.latest()).toEqual(before); expect(app.writes).toHaveLength(writes);
  });

  it('keeps the index out of scored modes and preserves the actual first-answer clause gate', async () => {
    const app = await mount({ insp2_clause: { 0: 0 }, insp2_clauseIdx: 0, insp2_sort: { 2: 1 }, insp2_sortIdx: 2 });
    const records = JSON.stringify({ clause: app.latest().insp2_clause, sort: app.latest().insp2_sort });
    await search('inspection'); await choose('8');
    await click([...host.querySelectorAll('button')].find(el => el.textContent.includes('Find the clause')));
    expect(panel()).toBeNull(); const group = host.querySelector('[data-arrow-select="false"]'); expect(group).toBeTruthy();
    const answers = [...group.querySelectorAll('button')]; expect(answers.every(el => el.disabled)).toBe(true);
    for (const answer of answers) await click(answer);
    expect(JSON.stringify({ clause: app.latest().insp2_clause, sort: app.latest().insp2_sort })).toBe(records);
    await click([...host.querySelectorAll('button')].find(el => el.textContent.includes('Code reader')));
    expect(panel()).toBeTruthy(); expect($('[data-code-reader-search]').value).toBe('inspection');
    await click([...host.querySelectorAll('button')].find(el => el.textContent.includes('Essential Variable Sorter'))); expect(panel()).toBeNull();
    expect(JSON.stringify({ clause: app.latest().insp2_clause, sort: app.latest().insp2_sort })).toBe(records);
  });

  it('retains the original publisher, scope, why/who text and navigation outside the replaced section block', () => {
    expect(IDS.map(id => fixtures[id].rows.length)).toEqual([11, 5, 8]);
    for (const id of IDS) {
      const node = document.createElement('div');
      node.innerHTML = renderTool('weldLab', { weldLab: { view: 'codes', insp2_codesTab: 'read', codes_pick: id } });
      for (const text of Object.values(fixtures[id].context)) expect(node.textContent).toContain(text);
      expect(node.textContent).toContain('Next: how a WPS gets qualified →');
      expect(node.textContent.includes('Practise finding D1.1 clauses →')).toBe(id === 'd1_1');
    }
  });

  it.each([false, true])('provides manual, full-size native controls and explicit contrast (contrast=%s)', async contrast => {
    await mount({}, contrast);
    expect(panel().style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(panel().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(250, 245, 255)');
    expect(panel().style.getPropertyValue('--code-reader-focus')).toBe(contrast ? '#ffff00' : '#6b21a8');
    expect(panel().querySelector('style').textContent).toContain(':is(button,input,summary):focus-visible{outline:3px solid var(--code-reader-focus);outline-offset:3px}');
    const input = $('[data-code-reader-search]'); expect(input.type).toBe('search'); expect(input.maxLength).toBe(120); expect(input.style.appearance).toBe('');
    expect(panel().querySelector('label[for="' + input.id + '"]')).toBeTruthy(); expect(input.getAttribute('aria-describedby')).toBe('code3-reader-count');
    for (const control of panel().querySelectorAll('input,button')) expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect($('[data-code-reader-index]').style.gridAutoRows).toBe('1fr'); expect($('[data-code-reader-index]').style.gridTemplateColumns).toContain('120px');
    expect($('[data-code-reader-reading]').getAttribute('aria-labelledby')).toBe('code3-reader-heading');
    expect(parseInt($('[data-code-reader-outline] summary').style.minHeight)).toBeGreaterThanOrEqual(44);
    expect($('[data-code-reader-body]').className).toContain('text-base');
    expect(panel().querySelector('animate,animateTransform,marquee,canvas')).toBeNull();
    expect(panel().querySelector('[data-code-reader-reference-body]').style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
  });
});
