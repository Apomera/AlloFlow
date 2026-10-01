// @vitest-environment jsdom
// SEL Hub shell translation, phase 1 (2026-09-28).
//
// The hub (catalog, cards, search, filters, pathways, station runner, tool
// header) was English in all 63 packs. It now reads every student-facing
// string through __alloT: literal sel.hub.ui.* keys for chrome, and keys
// derived from ids for its tables (catalog, guidance, pathways, cues, ...).
//
// Three things could silently break once text is translated, so they are
// pinned here, each against the English render:
//   - category chips match their catalog section by LABEL; translated labels
//     must not stop the match (counts would drop to 0 and the filter empties).
//     A section header reuses its chip's key, so both translate alike;
//     labelEn is the fallback if they ever diverge;
//   - the "I need..." chips search with ENGLISH words; search must still
//     find the same tools when names and descriptions are translated;
//   - focus management found controls by their English aria-label; it now
//     uses data-sel-focus, which must be present.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const HUB_FILE = process.env.SEL_HUB_SOURCE || resolve(ROOT, 'sel_hub/sel_hub_module.js');
const hubSource = readFileSync(HUB_FILE, 'utf8');
const uiStrings = JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8'));
const registered = (key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), uiStrings);

let React, ReactDOMClient, act, Hub, root, host;
let translate = () => undefined;

// Wraps every translated hub string in ⟦ ⟧ so untranslated text is what is
// left after stripping the wrapped segments (innermost first: fill templates nest).
const markTranslator = (key) => {
  if (!String(key).startsWith('sel.hub.')) return undefined;
  const en = registered(key);
  return typeof en === 'string' ? '⟦' + en + '⟧' : undefined;
};
// Cards show a description's first sentence, which would cut a closing ⟧ off;
// marking each sentence apart ("⟦A⟧. ⟦B.⟧") keeps every cut inside a pair.
const markSentences = (key) => {
  const m = markTranslator(key);
  return m && m.replace(/([.!?])(\s)/g, '⟧$1$2⟦').replace(/⟦⟧/g, '');
};
const unmarked = (text) => {
  let out = text; let prev;
  do { prev = out; out = out.replace(/⟦[^⟦⟧]*⟧/g, ' ').replace(/⟦[^⟦⟧]*\.\.\./g, ' '); } while (out !== prev);
  return out;
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = global.React = React;
  const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });
  window.AlloIcons = new Proxy({}, { get: () => Icon });
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.AlloToggleTheme = () => {};
  window.__alloflowSelSnapshots = [];
  window.__alloflowStudentArtifacts = [];
  new Function(hubSource)(); // eslint-disable-line no-new-func
  // Cards read their framework tag from the standards module, as in the app.
  new Function(readFileSync(resolve(ROOT, 'sel_hub/sel_standards_alignment.js'), 'utf8'))(); // eslint-disable-line no-new-func
  // The grid's catalog is static; the tool header needs one real plugin.
  new Function(readFileSync(resolve(ROOT, 'sel_hub/sel_tool_zones.js'), 'utf8'))(); // eslint-disable-line no-new-func
  Hub = window.AlloModules.SelHub;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
});

async function mount({ tool = null, t = translate } = {}) {
  const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });
  const props = {
    showSelHub: true, setShowSelHub() {}, selHubTab: 'explore', setSelHubTab() {},
    selHubTool: tool, setSelHubTool() {}, addToast() {}, gradeLevel: '5th Grade',
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag() {},
    studentCodename: 'test', selectedVoice: null, activeSessionCode: null, t,
    ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested() {},
  };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Hub, props)); });
  return host;
}

function visibleText(el) {
  const attrs = Array.from(el.querySelectorAll('[aria-label],[title],[placeholder]'))
    .map((n) => [n.getAttribute('aria-label'), n.getAttribute('title'), n.getAttribute('placeholder')].filter(Boolean).join(' '));
  return el.textContent + ' ' + attrs.join(' ');
}

function chipCounts(el) {
  const group = Array.from(el.querySelectorAll('[role="group"]')).find((g) => /Filter SEL tools by category/.test(g.getAttribute('aria-label') || ''));
  expect(group, 'category chip group').toBeTruthy();
  return Array.from(group.querySelectorAll('button')).slice(1).map((b) => Number((/\((\d+) tools\)/.exec(b.getAttribute('aria-label') || '') || [0, -1])[1]));
}

async function clickNeedChip(el, englishLabel) {
  const chip = Array.from(el.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') || '').includes(englishLabel));
  expect(chip, 'need chip ' + englishLabel).toBeTruthy();
  await act(async () => { chip.click(); });
  return el.querySelectorAll('[data-sel-tool-card-id]').length;
}

describe('SEL hub shell reads its text through the translator', () => {
  it('shows no covered English on the grid', async () => {
    const el = await mount({ t: markSentences });
    const text = visibleText(el);
    const hub = registered('sel.hub');
    const english = [];
    (function walk(node) { for (const v of Object.values(node)) { if (typeof v === 'string') english.push(v); else walk(v); } })(hub);
    const candidates = [...new Set(english)].filter((s) => s.length > 4 && !/\{[a-z]+\}/.test(s) && !/^[a-z-]+$/.test(s));
    const rest = unmarked(text);
    const leaks = candidates.filter((s) => rest.includes(s));
    expect(leaks).toEqual([]);
    // And it really rendered translated text, not an empty grid.
    expect((text.match(/⟦/g) || []).length).toBeGreaterThan(150);
  });

  it('category chips count the same tools once labels are translated', async () => {
    const en = chipCounts(await mount({ t: (k) => undefined }));
    await act(async () => { root.unmount(); }); root = null; host.remove();
    const tr = chipCounts(await mount({ t: markTranslator }));
    expect(en.length).toBe(9);
    expect(en.every((n) => n > 0)).toBe(true);
    expect(tr).toEqual(en);
  });

  it('the English need-chip words still find the same tools', async () => {
    // Table text becomes opaque (no English words left in it); chip labels stay findable.
    const opaque = (k) => (/^sel\.hub\.(?!ui\.)/.test(k) ? '◊◊' : undefined);
    const chips = ['Calm my body', 'Name feelings', 'Stress or worry', 'Friend conflict', 'Write it out', 'Make a decision',
      'Sleep or tired', 'Unsafe or in crisis', 'Relationship safety', 'School support', 'Grief or loss'];
    const counts = async (t) => {
      const el = await mount({ t });
      const out = {};
      for (const c of chips) { out[c] = await clickNeedChip(el, c); await clickNeedChip(el, c); }
      await act(async () => { root.unmount(); }); root = null; host.remove();
      return out;
    };
    const en = await counts((k) => undefined);
    const tr = await counts(opaque);
    expect(Object.values(en).every((n) => n > 0)).toBe(true);
    expect(tr).toEqual(en);
  });

  it('focus targets are found by attribute, not by English label', async () => {
    const el = await mount({ t: markTranslator });
    for (const k of ['close', 'theme', 'educators', 'search']) expect(el.querySelector('[data-sel-focus="' + k + '"]'), k).toBeTruthy();
    expect(hubSource).toContain(`document.querySelector('[data-sel-focus="close"], [aria-label="Close SEL Hub"]')`);
    expect(hubSource).toContain(`document.querySelector('[data-sel-focus="search"], [aria-label="Search SEL tools"]')`);
  });

  it('translates the tool header around a tool', async () => {
    const el = await mount({ tool: 'zones', t: markTranslator });
    const text = visibleText(el);
    for (const key of ['sel.hub.ui.purpose', 'sel.hub.ui.next_step', 'sel.hub.tool.zones.label', 'sel.hub.shell.zones.purpose']) {
      expect(text, key).toContain('⟦' + registered(key) + '⟧');
    }
    expect(el.querySelector('[data-sel-focus="back-tool"]')).toBeTruthy();
  });

  it('undoing a station removal refocuses its Start button in any language', async () => {
    localStorage.setItem('alloflow_sel_stations', JSON.stringify([{ id: 'undo-0', name: 'First', tools: ['journal'], quests: [] }]));
    // A returning user: the first-visit dialog would otherwise take focus on its own schedule.
    sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1');
    try {
      const el = await mount({ t: markTranslator });
      const byLabel = (text) => Array.from(el.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') || b.textContent).includes(text));
      await act(async () => { byLabel('Delete station First').click(); });
      await act(async () => { byLabel('Undo removal: First').click(); });
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      const start = el.querySelector('[data-sel-station-activate="undo-0"]');
      expect(start.getAttribute('aria-label')).toBe('⟦Activate station First⟧');
      expect(document.activeElement).toBe(start);
    } finally { localStorage.removeItem('alloflow_sel_stations'); sessionStorage.removeItem('alloflow_sel_seen_ephemeral_explainer'); }
  });

  it('cuts a translated card description at a CJK sentence end', async () => {
    const zh = (k) => (k === 'sel.hub.tool.zones.desc' ? '第一句话。第二句话。' : undefined);
    const card = (await mount({ t: zh })).querySelector('[data-sel-tool-card-id="zones"]');
    expect(card.textContent).toContain('第一句话。');
    expect(card.textContent).not.toContain('第二句话');
  });
});

describe('with real language packs', () => {
  for (const lang of ['spanish_latin_america', 'arabic', 'chinese_simplified']) {
    it(lang + ': the grid shows the pack text, not the English it replaces', async () => {
      const pack = JSON.parse(readFileSync(resolve(ROOT, 'lang', lang + '.js'), 'utf8'));
      const get = (k) => k.split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), pack);
      const el = await mount({ t: (k) => (typeof get(k) === 'string' ? get(k) : undefined) });
      const text = visibleText(el);
      const labels = Object.keys(get('sel.hub.tool') || {}).map((id) => ['sel.hub.tool.' + id + '.label', registered('sel.hub.tool.' + id + '.label')]);
      expect(labels.length).toBeGreaterThan(60);
      expect(text).toContain(get('sel.hub.tool.zones.label'));
      // A program name the pack itself keeps in English (e.g. "Sources of Strength") is not a leak.
      const packText = JSON.stringify(get('sel.hub'));
      const leaked = labels.filter(([k, en]) => typeof get(k) === 'string' && get(k) !== en && / /.test(en) && text.includes(en) && !packText.includes(en)).map(([, en]) => en);
      expect(leaked).toEqual([]);
      expect(el.querySelectorAll('[data-sel-tool-card-id]').length).toBeGreaterThan(60);
    });
  }
});

describe('keys and English stay in step', () => {
  it('every literal hub key is registered with the same English', () => {
    const calls = [...hubSource.matchAll(/__alloT\('(sel\.hub\.ui\.[a-z0-9_]+)', '((?:[^'\\]|\\.)*)'\)/g)];
    expect(calls.length).toBeGreaterThan(250);
    for (const [, key, en] of calls) expect(registered(key), key).toBe(en.replace(/\\'/g, "'"));
  });

  it('every derived table key is registered with its current English', () => {
    const babel = require(resolve(ROOT, 'node_modules/@babel/core'));
    const traverse = require(resolve(ROOT, 'node_modules/@babel/traverse')).default;
    const generate = require(resolve(ROOT, 'node_modules/@babel/generator')).default;
    const ast = babel.parseSync(hubSource, { babelrc: false, configFile: false, sourceType: 'script' });
    const want = ['SEL_CATEGORIES', 'SEL_TOOL_GUIDANCE', 'SEL_PATHWAYS', 'SEL_PATHWAY_PRACTICE', 'SEL_TEACHER_TOOL_META', '_allSelTools', '_dynamicTools', '_evidenceTiers', 'SEL_TEACHER_LAUNCH_PLANS'];
    const T = {};
    const val = (n) => new Function('return (' + generate(n).code + ');')();
    traverse(ast, {
      VariableDeclarator(p) { const n = p.node.id && p.node.id.name; if (want.includes(n) && p.node.init && !T[n]) T[n] = val(p.node.init); },
      ObjectProperty(p) { if (p.node.key && p.node.key.name === '_standardShellTools' && !T.shell) T.shell = val(p.node.value); },
    });
    const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const want2 = {};
    const put = (k, v) => { if (typeof v === 'string' && v.trim()) want2[k] = v; };
    for (const c of T.SEL_CATEGORIES) { put('sel.hub.category_info.' + c.id + '.label', c.label); put('sel.hub.category_info.' + c.id + '.desc', c.desc); }
    for (const tool of T._allSelTools.concat(T._dynamicTools)) if (!tool.category) { put('sel.hub.tool.' + tool.id + '.label', tool.label); put('sel.hub.tool.' + tool.id + '.desc', tool.desc); }
    for (const [id, m] of Object.entries(T.shell)) for (const f of ['time', 'purpose', 'next']) put('sel.hub.shell.' + id + '.' + f, m[f]);
    for (const [id, g] of Object.entries(T.SEL_TOOL_GUIDANCE)) { if (g.mode) put('sel.hub.guidance_mode.' + slug(g.mode), g.mode); put('sel.hub.guidance.' + id + '.note', g.note); put('sel.hub.guidance.' + id + '.boundary', g.boundary); }
    for (const pw of T.SEL_PATHWAYS) { put('sel.hub.pathway.' + pw.id + '.name', pw.name); put('sel.hub.pathway.' + pw.id + '.desc', pw.desc); }
    for (const [id, l] of Object.entries(T.SEL_PATHWAY_PRACTICE)) for (const f of ['goal', 'model', 'practice', 'reflect', 'transfer']) put('sel.hub.pathway_practice.' + id + '.' + f, l[f]);
    for (const [id, c] of Object.entries(T.SEL_TEACHER_TOOL_META)) for (const f of ['time', 'format', 'cue']) put('sel.hub.cue.' + id + '.' + f, c[f]);
    for (const [tier, m] of Object.entries(T._evidenceTiers)) { put('sel.hub.evidence.' + tier + '.label', m.label); put('sel.hub.evidence.' + tier + '.title', m.title); }
    for (const plan of T.SEL_TEACHER_LAUNCH_PLANS) for (const f of ['name', 'time', 'format', 'focus', 'studentView', 'teacherMove', 'privacyBoundary', 'note']) put('sel.hub.launch.' + plan.id + '.' + f, plan[f]);
    const win = {};
    new Function('window', readFileSync(resolve(ROOT, 'sel_hub/sel_standards_alignment.js'), 'utf8'))(win); // eslint-disable-line no-new-func
    for (const al of Object.values(win.SelHubStandards.alignments)) {
      const f = al.other && al.other.length ? al.other[0].framework : null;
      if (f && f !== 'CASEL') put('sel.hub.framework.' + slug(f), f);
    }
    expect(Object.keys(want2).length).toBeGreaterThan(480);
    const drift = Object.entries(want2).filter(([k, v]) => registered(k) !== v).map(([k]) => k);
    expect(drift).toEqual([]);
  });
});
