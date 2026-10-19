// Cell Simulator — Knowledge & History modes (history, biologists, lab, disease,
// ecology) render real, linked, accessible content in every mode, honour the
// clinical grade gate, survive malformed saved state, and wire their controls
// to state. SSR through the shared smoke harness, plus client clicks against
// renderCellKnowledge with a recording store.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const req = createRequire(resolve(process.cwd(), 'tests/_x.js'));
const React = req('../desktop/web-app/node_modules/react');
const { createRoot } = req('../desktop/web-app/node_modules/react-dom/client');
const { flushSync } = req('../desktop/web-app/node_modules/react-dom');
const { parse } = req('acorn');

const SRC = 'stem_lab/stem_tool_cell.js';
let H; // smoke harness module
let K; // window.__alloCellKnow
let T; // the five data tables, evaluated from the source

function tablesFromSource(source) {
  const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script' });
  const want = { CELL_HISTORY: 'history', FAMOUS_BIOLOGISTS: 'biologists', LAB_TECHNIQUES: 'techniques', MICROBIAL_DISEASES: 'diseases', MICRO_ECOLOGY: 'ecology' };
  const out = {};
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'VariableDeclarator' && n.id && want[n.id.name] && n.init && n.init.type === 'ArrayExpression') {
      // eslint-disable-next-line no-new-func
      out[want[n.id.name]] = new Function('return ' + source.slice(n.init.start, n.init.end))();
    }
    for (const k of Object.keys(n)) if (k !== 'type' && k !== 'start' && k !== 'end') walk(n[k]);
  })(ast);
  return out;
}

beforeAll(async () => {
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  const source = readFileSync(SRC, 'utf8');
  T = tablesFromSource(source);
});
beforeEach(() => {
  H.resetStemLab();
  H.loadTool(SRC, 'cell');
  K = window.__alloCellKnow;
});

const MODES = ['history', 'biologists', 'lab', 'ecology'];
function text(html) { return html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }
function section(html, mode) {
  const i = html.indexOf('data-cell-know="' + mode + '"');
  return i < 0 ? '' : html.slice(i);
}

describe('Knowledge & History modes render for every grade band', () => {
  it('exposes the pure helpers', () => {
    expect(K, 'window.__alloCellKnow').toBeTruthy();
    expect(typeof K.renderCellKnowledge).toBe('function');
  });

  for (const mode of MODES) {
    it(mode + ' renders a real panel (not the old text list) with no raw values', () => {
      for (const gradeLevel of ['K', '5th Grade', '9']) {
        const html = H.renderTool('cell', { cell: { mode, _cellPicked: true } }, { gradeLevel });
        const panel = section(html, mode);
        expect(panel.length, mode + ' panel at grade ' + gradeLevel).toBeGreaterThan(2000);
        const t = text(panel);
        expect(t).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
        // Every control is a real button with an explicit type.
        const buttons = panel.match(/<button\b[^>]*>/g) || [];
        expect(buttons.length, mode + ' buttons').toBeGreaterThan(3);
        buttons.forEach((b) => expect(b, b).toMatch(/type="button"/));
        // Its own scoped style block, not the shared one.
        expect(html).toContain('data-cell-know-style');
      }
    });
  }

  it('keeps Diseases behind cellBandAllowsClinical: hidden for K-5, shown for 6-12', () => {
    for (const gradeLevel of ['K', '2nd Grade', '5th Grade', '']) {
      const html = H.renderTool('cell', { cell: { mode: 'disease', _cellPicked: true } }, { gradeLevel });
      expect(html, 'grade ' + gradeLevel).not.toContain('data-cell-know="disease"');
      expect(html).not.toContain('Tuberculosis');
    }
    for (const gradeLevel of ['6', '8th Grade', '9', '12th Grade']) {
      const html = H.renderTool('cell', { cell: { mode: 'disease', _cellPicked: true } }, { gradeLevel });
      const panel = section(html, 'disease');
      expect(panel.length, 'grade ' + gradeLevel).toBeGreaterThan(2000);
      expect(text(panel)).toContain('Tuberculosis');
      expect(text(panel)).not.toMatch(/\bundefined\b|\bNaN\b/);
    }
    // Defence in depth: the renderer itself refuses without the flag.
    expect(K.renderCellKnowledge(React.createElement, 'disease', T, {}, { clinical: false })).toBe(null);
    expect(K.renderCellKnowledge(React.createElement, 'disease', T, {}, {})).toBe(null);
  });

  it('labels every biologist by full name (the old row read "model", "Brown", "Gram")', () => {
    const html = H.renderTool('cell', { cell: { mode: 'biologists', _cellPicked: true } });
    const rows = [...html.matchAll(/data-cell-know-person="([a-z]+)"[\s\S]*?data-ck-who-name="true">([^<]+)</g)];
    expect(rows.length).toBe(T.biologists.length);
    rows.forEach(([, key, name]) => {
      const row = T.biologists.find((b) => b.key === key);
      expect(row, key).toBeTruthy();
      expect(name.replace(/&#x27;/g, "'")).toBe(row.name);
      expect(name.split(' ').length, name).toBeGreaterThan(1);
    });
    expect(text(html)).not.toMatch(/Watson & Crick model|Triple helix/);
  });

  it('opens linked detail from saved state, and survives malformed state', () => {
    const ev = T.history.find((e) => e.title === 'The double helix');
    const open = H.renderTool('cell', { cell: { mode: 'history', _know: { histSel: ev.id } } });
    expect(open).toContain('id="ck-ev-' + ev.id + '"');
    expect(ev.people.length).toBe(3);
    expect(text(section(open, 'history'))).toContain(ev.why.slice(0, 40));
    ev.people.forEach((k) => expect(open).toContain(T.biologists.find((b) => b.key === k).name));
    const bad = [
      'garbage', 7, null, [],
      { histTheme: 5, histEra: {}, histSel: 'x', bioSel: {}, bioField: [], labView: 'nope', gramStep: 'x', gramTiming: 9, resWave: null, resObj: {}, streakStep: -3, labGroup: 3, disType: 'cats', disRoute: [], ecoGroup: 1, ecoLimits: 'pressure', limitSel: 4 },
      { gramStep: 99, streakStep: 99 }
    ];
    for (const _know of bad) {
      for (const mode of MODES) {
        const html = H.renderTool('cell', { cell: { mode, _know } }, { gradeLevel: '9' });
        expect(section(html, mode).length, mode + ' with ' + JSON.stringify(_know)).toBeGreaterThan(2000);
        expect(text(html)).not.toMatch(/\bundefined\b|\bNaN\b/);
      }
    }
  });

  it('every lab view renders, and the resolution numbers come from the Abbe model', () => {
    for (const labView of ['gram', 'resolution', 'streak', 'catalogue']) {
      const html = H.renderTool('cell', { cell: { mode: 'lab', _know: { labView } } });
      expect(html).toContain('data-cell-know-lab="' + labView + '"');
    }
    const res = H.renderTool('cell', { cell: { mode: 'lab', _know: { labView: 'resolution', resWave: 'green', resObj: 'o100' } } });
    const d = K.knowAbbeLimitNm(550, 1.25);
    expect(d).toBe(220);
    expect(res).toContain('data-cell-know-res-limit="' + d + '"');
    expect(text(res)).toContain('220 nm');
    const cat = H.renderTool('cell', { cell: { mode: 'lab', _know: { labView: 'catalogue', labSel: 'tem' } } });
    expect(cat).toContain('id="ck-t-tem"');
    expect(text(cat)).not.toMatch(/atomic-scale structure/i);
  });
});

describe('controls write the right state (client render + recording store)', () => {
  function mount(mode, initial, apiExtra) {
    let state = { cell: Object.assign({ mode }, initial || {}) };
    const calls = { jump: [], xp: [] };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const api = Object.assign({
      set: (fn) => { state = fn(state); render(); },
      jump: (m) => { calls.jump.push(m); state = { cell: Object.assign({}, state.cell, { mode: m }) }; render(); },
      clinical: true, year: 2026, xp: (...a) => calls.xp.push(a)
    }, apiExtra || {});
    function render() { flushSync(() => root.render(K.renderCellKnowledge(React.createElement, state.cell.mode, T, state.cell, api))); }
    render();
    return { host, get state() { return state; }, calls, unmount() { flushSync(() => root.unmount()); host.remove(); } };
  }
  const q = (host, sel) => host.querySelector(sel);

  it('history: era and topic filters narrow the list; an event links to its people', () => {
    const m = mount('history');
    const all = m.host.querySelectorAll('[data-cell-know-event]').length;
    expect(all).toBe(T.history.length);
    q(m.host, '[data-cell-know-filter="era-e1"]').click();
    const e1 = T.history.filter((e) => e.year < 1800).length;
    expect(m.host.querySelectorAll('[data-cell-know-event]').length).toBe(e1);
    q(m.host, '[data-cell-know-filter="era-e1"]').click(); // toggles back
    q(m.host, '[data-cell-know-filter="theme-molecular"]').click();
    const mol = T.history.filter((e) => e.themes.includes('molecular')).length;
    expect(m.host.querySelectorAll('[data-cell-know-event]').length).toBe(mol);
    expect(q(m.host, '[data-cell-know-filter="theme-molecular"]').getAttribute('aria-pressed')).toBe('true');
    const helix = T.history.find((e) => e.title === 'The double helix');
    q(m.host, '[data-cell-know-event="' + helix.id + '"]').click();
    expect(q(m.host, '[data-cell-know-event="' + helix.id + '"]').getAttribute('aria-expanded')).toBe('true');
    const link = [...m.host.querySelectorAll('[data-cell-know-go="person"]')].find((b) => b.textContent.includes('Rosalind Franklin'));
    expect(link).toBeTruthy();
    link.click();
    expect(m.calls.jump).toEqual(['biologists']);
    expect(m.state.cell._know.bioSel).toBe('franklin');
    expect(q(m.host, '[data-cell-know-person="franklin"]').getAttribute('aria-expanded')).toBe('true');
    m.unmount();
  });

  it('lab: the Gram stain steps through to the classic result and awards XP once', () => {
    const m = mount('lab', { _know: { labView: 'gram' } });
    const colour = (w) => q(m.host, '[data-cell-know-gram="' + w + '"]').getAttribute('data-colour');
    expect([colour('pos'), colour('neg')]).toEqual(['none', 'none']);
    const next = () => q(m.host, '[data-cell-know-gram-next]').click();
    next(); expect([colour('pos'), colour('neg')]).toEqual(['purple', 'purple']);
    next(); expect([colour('pos'), colour('neg')]).toEqual(['purple', 'purple']);
    next(); expect([colour('pos'), colour('neg')]).toEqual(['purple', 'none']);
    next(); expect([colour('pos'), colour('neg')]).toEqual(['purple', 'pink']);
    expect(m.calls.xp.length).toBe(1);
    q(m.host, '[data-cell-know-gram-step="2"]').click(); next(); next();
    expect(m.calls.xp.length).toBe(1);
    q(m.host, '[data-cell-know-gram-timing="long"]').click();
    expect([colour('pos'), colour('neg')]).toEqual(['pink', 'pink']);
    expect(m.host.textContent).toContain('Misleading result');
    q(m.host, '[data-cell-know-gram-timing="short"]').click();
    expect([colour('pos'), colour('neg')]).toEqual(['purple', 'purple']);
    m.unmount();
  });

  it('lab: resolution controls move the limit; streak plate reaches isolated colonies', () => {
    const m = mount('lab', { _know: { labView: 'resolution' } });
    const lim = () => Number(q(m.host, '[data-cell-know-res-limit]').getAttribute('data-cell-know-res-limit'));
    expect(lim()).toBe(K.knowAbbeLimitNm(550, 1.25));
    q(m.host, '[data-cell-know-res-wave="violet"]').click();
    expect(lim()).toBe(K.knowAbbeLimitNm(400, 1.25));
    q(m.host, '[data-cell-know-res-obj="o10"]').click();
    expect(lim()).toBe(K.knowAbbeLimitNm(400, 0.25));
    const flu = q(m.host, '[data-cell-know-obj="flu"]').textContent;
    expect(flu).toMatch(/blurs together/);
    q(m.host, '[data-cell-know-view="streak"]').click();
    for (let i = 0; i < 5; i++) q(m.host, '[data-cell-know-streak-next]').click();
    expect(m.state.cell._know.streakStep).toBe(5);
    const plate = K.knowStreakPlate();
    expect(q(m.host, '[data-cell-know-lab="streak"] svg').getAttribute('aria-label')).toContain('quadrant 4 has ' + plate.counts[3] + ', with ' + plate.isolated[3] + ' isolated');
    m.unmount();
  });

  it('disease and ecology filters work; a habitat links to its limit record', () => {
    const d = mount('disease');
    q(d.host, '[data-cell-know-filter="type-virus"]').click();
    const viruses = T.diseases.filter((r) => r.type === 'virus');
    expect(d.host.querySelectorAll('[data-cell-know-disease]').length).toBe(viruses.length);
    expect(d.host.textContent).toContain('not a cell');
    d.unmount();
    const e = mount('ecology');
    q(e.host, '[data-cell-know-habitat="vents"]').click();
    const rec = [...e.host.querySelectorAll('button')].find((b) => /Record: Methanopyrus/.test(b.textContent));
    expect(rec).toBeTruthy();
    rec.click();
    expect(e.state.cell._know).toMatchObject({ ecoLimits: 'temp', limitSel: 'methanopyrus' });
    q(e.host, '[data-cell-know-limits-toggle="ph"]').click();
    expect(q(e.host, '[data-cell-know-limits="ph"]')).toBeTruthy();
    e.unmount();
  });
});
