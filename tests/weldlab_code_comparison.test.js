import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const ORIGINAL_SHA256 = 'ce501c12f201de4f85dfbf4aa403872fe96b7c4fe1966105f0ce4b7b2c65e152';
const BASE = { view: 'consumables', cons_sect: 'decoder', cons_mode: 'browse', tech2_cons_code: 'E7018' };
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const PAIRS = [
  ['E7018', 'E71T-1'], ['ER70S-6', 'ER4043'], ['ER308L', 'ER4043'], ['E7018-H4R', 'E8018-B2'],
  ['E7018M', 'E7018-1'], ['ER80S-D2', 'E70C-6M-H4'], ['E71T-1CJ-H8', 'ER70S-6'], ['E6024', 'E7048'],
];
const ROLES = ['electrode', 'electrode_wire', 'er', 'tensile', 'position', 'coating', 'military', 'toughness', 'alloy', 'hydrogen', 'moisture', 'solid', 'composite', 'tubular', 'chem', 'wire_alloy', 'fcaw_position', 'usability', 'gas', 'impact', 'alloy_number'];
let host, root;
const decode = code => window.__WeldLabCore.tech2.decode(code);
const comparison = (node = host) => node.querySelector('[data-cons-code-compare]');
const controls = (node = host) => node.querySelector('[data-cons-code-controls]');
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function code(value) { await change(host.querySelector('#tech2-dec-input'), value); }
async function pin() { await click(controls().querySelector('[data-cons-code-pin]')); }
async function clear() { await click(controls().querySelector('[data-cons-code-clear]')); }
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function geometry(svg) {
  return [...svg.querySelectorAll('rect,path,line,circle,ellipse,text')].map(node => [node.tagName, ...['x', 'y', 'width', 'height', 'cx', 'cy', 'rx', 'ry', 'r', 'd', 'x1', 'y1', 'x2', 'y2', 'font-size'].map(attr => node.getAttribute(attr)), node.tagName === 'text' ? node.textContent : '']);
}
function reference(code) {
  const result = decode(code); expect(result.ok, code).toBe(true);
  const node = render({ tech2_cons_code: code }), list = [...node.querySelectorAll('#tech2-dec-result ol > li')];
  expect(list).toHaveLength(result.parts.length);
  return { result, meanings: Object.fromEntries(result.parts.map((part, i) => [part.role, list[i].querySelectorAll('span')[1].textContent])), geometry: geometry(node.querySelector('[data-cons-specimen] svg')) };
}
function checkPair(currentCode, pinnedCode, references) {
  const current = decode(currentCode), pinned = decode(pinnedCode), panel = comparison();
  expect(panel.dataset.current).toBe(current.input); expect(panel.dataset.pinned).toBe(pinned.input);
  expect(host.querySelectorAll('[data-cons-specimen]')).toHaveLength(2);
  const expectedRoles = [...new Set(current.parts.concat(pinned.parts).map(part => part.role))];
  expect([...panel.querySelectorAll('[data-cons-code-row]')].map(row => row.dataset.consCodeRow)).toEqual(expectedRoles);
  for (const [id, result] of [['current', current], ['pinned', pinned]]) {
    const column = panel.querySelector(`[data-cons-code-column="${id}"]`);
    expect(column.dataset.code).toBe(result.input); expect(column.textContent).toContain('AWS ' + result.spec);
    expect(column.querySelector('[data-cons-specimen]').dataset.consSpecimen).toBe(result.kind);
    expect(geometry(column.querySelector('svg'))).toEqual(references[result.input].geometry);
    for (const role of expectedRoles) {
      const part = result.parts.find(part => part.role === role), cell = panel.querySelector(`[data-cons-code-row="${role}"] [data-cons-code-cell="${id}"]`);
      expect(cell.dataset.role).toBe(role); expect(cell.dataset.present).toBe(String(!!part));
      if (part) {
        expect(cell.querySelector('[data-cons-code-token]').textContent).toBe(part.seg);
        if (part.value != null) expect(cell.querySelector('[data-cons-code-token]').getAttribute('data-value')).toBe(String(part.value));
        expect(cell.querySelector('[data-cons-code-meaning]').textContent).toBe(references[result.input].meanings[role]);
        expect(cell.querySelector('[data-cons-code-absent]')).toBeNull();
      } else {
        expect(cell.querySelector('[data-cons-code-token]')).toBeNull(); expect(cell.querySelector('[data-cons-code-meaning]')).toBeNull();
        expect(cell.querySelector('[data-cons-code-absent]').textContent).toBe('Not present in this decoded example.');
      }
    }
    expect(panel.querySelectorAll(`[data-cons-code-cell="${id}"][data-present="true"]`)).toHaveLength(result.parts.length);
  }
  // The paired fields replace the original single list; meanings are not repeated in a third view.
  expect(panel.querySelector('ol')).toBeNull(); expect(host.querySelector('#tech2-dec-result > ol')).toBeNull();
}

describe('Optional classification-code comparison', () => {
  it('starts unpinned with the complete original single specimen and part list, and ignores pseudo saved pins', () => {
    const node = render({ cons12_pin: 'ER4043', pinnedCode: 'E6010' });
    expect(comparison(node)).toBeNull(); expect(controls(node).dataset.pinned).toBe(''); expect(controls(node).querySelector('[data-cons-code-clear]')).toBeNull();
    expect(node.querySelectorAll('[data-cons-specimen]')).toHaveLength(1); expect(node.querySelector('#tech2-dec-result ol').children).toHaveLength(decode('E7018').parts.length);
    expect(controls(node).querySelector('[data-cons-code-pin]').disabled).toBe(false);
  });

  it('pins only the normalized valid code locally, honestly handles identical entries and exactly restores the single result on clear', async () => {
    const app = await mount({ tech2_cons_code: ' e7018 - h4r ' }), original = host.querySelector('#tech2-dec-result').innerHTML, saved = JSON.stringify(app.latest());
    await pin(); expect(comparison().dataset).toMatchObject({ current: 'E7018-H4R', pinned: 'E7018-H4R' });
    expect(comparison().querySelector('[data-cons-code-identical]').textContent).toBe('Both entries are the same normalized classification.');
    expect(comparison().querySelectorAll('[data-cons-code-absent]')).toHaveLength(0);
    await clear(); expect(comparison()).toBeNull(); expect(host.querySelector('#tech2-dec-result').innerHTML).toBe(original);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  });

  it('aligns all21 original roles through critical family/suffix pairs and preserves every original full meaning and specimen geometry', async () => {
    const references = Object.fromEntries([...new Set(PAIRS.flat())].map(input => [decode(input).input, reference(input)]));
    const roles = new Set(); await mount();
    for (const [pinned, current] of PAIRS) {
      await code(pinned); await pin(); await code(current); checkPair(current, pinned, references);
      for (const row of comparison().querySelectorAll('[data-cons-code-row]')) roles.add(row.dataset.consCodeRow);
    }
    expect([...roles].sort()).toEqual(ROLES.slice().sort());
  });

  it('aligns70 and7 as tensile fields with the same70ksi value without aligning unrelated character positions or prefix roles', async () => {
    await mount(); await pin(); await code('E71T-1');
    const row = comparison().querySelector('[data-cons-code-row="tensile"]'), current = row.querySelector('[data-cons-code-cell="current"]'), pinned = row.querySelector('[data-cons-code-cell="pinned"]');
    expect(current.querySelector('[data-cons-code-token]').textContent).toBe('7'); expect(pinned.querySelector('[data-cons-code-token]').textContent).toBe('70');
    for (const cell of [current, pinned]) { expect(cell.querySelector('[data-cons-code-token]').dataset.value).toBe('70'); expect(cell.querySelector('[data-cons-code-meaning]').textContent).toBe('At least70,000psi (70ksi) tensile strength in the weld metal.'.replace('least70', 'least 70').replace('000psi', '000 psi').replace('70ksi', '70 ksi')); }
    expect(comparison().querySelector('[data-cons-code-row="electrode"] [data-cons-code-cell="current"]').dataset.present).toBe('false');
    expect(comparison().querySelector('[data-cons-code-row="electrode_wire"] [data-cons-code-cell="pinned"]').dataset.present).toBe('false');
    expect(comparison().querySelector('[data-cons-code-row="position"] [data-cons-code-cell="current"]').dataset.present).toBe('false');
    expect(comparison().querySelector('[data-cons-code-row="fcaw_position"] [data-cons-code-cell="pinned"]').dataset.present).toBe('false');
  });

  it('opens the relevant field initially, supports local native disclosure toggles and resets the open field when the compared pair changes', async () => {
    const references = Object.fromEntries(['E7018', 'E71T-1', 'ER4043', 'ER308L'].map(input => [input, reference(input)]));
    const app = await mount(); await pin();
    const openRoles = () => [...comparison().querySelectorAll('details[open]')].map(row => row.dataset.consCodeRow);
    const row = role => comparison().querySelector(`[data-cons-code-row="${role}"]`);
    const summary = role => row(role).querySelector('summary');
    expect(comparison().dataset.defaultRole).toBe('tensile'); expect(openRoles()).toEqual(['tensile']);
    for (const side of ['current', 'pinned']) expect(summary('tensile').querySelector(`[data-cons-code-summary-token="${side}"]`).textContent).toBe('70');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await click(summary('tensile')); expect(row('tensile').open).toBe(false);
    await click(summary('electrode')); expect(row('electrode').open).toBe(true);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);

    await code('E71T-1'); expect(comparison().dataset.defaultRole).toBe('tensile'); expect(openRoles()).toEqual(['tensile']);
    expect(summary('tensile').querySelector('[data-cons-code-summary-token="current"]').textContent).toBe('7');
    expect(summary('tensile').querySelector('[data-cons-code-summary-token="pinned"]').textContent).toBe('70');
    checkPair('E71T-1', 'E7018', references);
    const edited = JSON.stringify(app.latest()), editedWrites = app.writes.length;
    await click(summary('tensile')); expect(row('tensile').open).toBe(false);
    await click(summary('tensile')); expect(row('tensile').open).toBe(true);
    expect(JSON.stringify(app.latest())).toBe(edited); expect(app.writes).toHaveLength(editedWrites);

    await code('ER4043'); await pin(); await code('ER308L');
    expect(comparison().dataset.defaultRole).toBe('alloy_number'); expect(openRoles()).toEqual(['alloy_number']);
    expect(row('tensile')).toBeNull();
    expect(summary('alloy_number').querySelector('[data-cons-code-summary-token="current"]').textContent).toBe('308L');
    expect(summary('alloy_number').querySelector('[data-cons-code-summary-token="pinned"]').textContent).toBe('4043');
    checkPair('ER308L', 'ER4043', references);
  });

  it('keeps aluminium and stainless alloy identifiers separate from strength and marks a missing tensile field explicitly', async () => {
    await mount({ tech2_cons_code: 'ER308L' }); await pin(); await code('ER4043');
    expect(comparison().querySelector('[data-cons-code-row="tensile"]')).toBeNull();
    const row = comparison().querySelector('[data-cons-code-row="alloy_number"]'); expect(row.textContent).toContain('A stainless alloy number, not a strength'); expect(row.textContent).toContain('An aluminium alloy number, not a strength');
    await code('ER70S-6'); expect(comparison().querySelector('[data-cons-code-row="tensile"] [data-cons-code-cell="pinned"]').dataset.present).toBe('false');
    expect(comparison().querySelector('[data-cons-code-row="alloy_number"] [data-cons-code-cell="current"]').dataset.present).toBe('false');
  });

  it('preserves original visible unsupported-input errors, retains the pin during editing, disables invalid pinning and never substitutes a valid current specimen', async () => {
    await mount(); await pin();
    for (const value of ['', 'E9999', 'ER70S-99', 'E71T-11C', '<script>bad</script>']) {
      await code(value); expect(decode(value).ok).toBe(false); expect(comparison()).toBeNull(); expect(host.querySelector('[data-cons-specimen]')).toBeNull();
      expect(host.querySelector('#tech2-dec-result').textContent).toMatch(/Type a classification|not a valid classification|not a classification/);
      expect(controls().dataset.pinned).toBe('E7018'); expect(controls().querySelector('[data-cons-code-pin]').disabled).toBe(true); await pin(); expect(controls().dataset.pinned).toBe('E7018');
      expect(controls().querySelector('[data-cons-code-status]').textContent).toContain('kept while you edit');
    }
    await code('ER4043'); expect(comparison().dataset).toMatchObject({ current: 'ER4043', pinned: 'E7018' });
    await code(''); await clear(); expect(controls().dataset.pinned).toBe(''); expect(comparison()).toBeNull(); expect(host.querySelector('[data-cons-specimen]')).toBeNull();
  });

  it('keeps pin/clear local and leaves all original calculator, gas, TIG, scenario and other project fields untouched', async () => {
    const saved = { tech2_cons_proc: 'gmaw_spray', tech2_cons_leg: 0.375, tech2_cons_rate: 85, cons_sc_idx: 3, cons_sc_picked: 2, cons_sc_score: 2, safe2_gas: 'helium', cons12_pin: 'ER4043', weldBadges: { existing: true } };
    const app = await mount(saved), initial = JSON.stringify(app.latest()); await pin(); await clear(); await pin(); expect(JSON.stringify(app.latest())).toBe(initial); expect(app.writes).toHaveLength(0);
    await click(button('💰 Cost economics')); expect(comparison()).toBeNull(); expect(controls()).toBeNull();
    const cost = window.__WeldLabCore.tech2.costPerFoot(saved.tech2_cons_proc, saved.tech2_cons_leg, saved.tech2_cons_rate), drawing = host.querySelector('[data-cons-cost-breakdown]');
    for (const [attr, value] of [['data-filler', cost.filler], ['data-labour', cost.labor], ['data-total', cost.total]]) expect(Number(drawing.getAttribute(attr))).toBeCloseTo(value, 12);
    await click(button('✏ TIG filler rods + tungsten')); expect(host.querySelector('[data-tungsten-bench]').dataset.tungstenBench).toBe('EWLa-2'); expect(comparison()).toBeNull();
    await click(button('💨 Shielding gases')); expect(host.querySelector('[data-gas-composition]')).toBeTruthy(); expect(comparison()).toBeNull();
    await click(button('🔎 Classification decoder')); expect(comparison().dataset).toMatchObject({ current: 'E7018', pinned: 'E7018' });
    for (const [key, value] of Object.entries(saved)) expect(app.latest()[key]).toEqual(value);
    expect(app.writes.every(([key]) => key === 'cons_sect')).toBe(true);
  });

  it('preserves all8 real scenario first-pick locks, feedback gates, round score and reset after pinning classifications', async () => {
    const app = await mount({ cons_sc_idx: 0, cons_sc_picked: null, cons_sc_score: 0 }); await pin(); await code('ER4043'); await click(button('🎯 Pick the right consumable'));
    const answers = [3, 0, 1, 2, 3, 0, 1, 2];
    for (let i = 0; i < answers.length; i++) {
      expect(comparison()).toBeNull(); expect(controls()).toBeNull(); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Why not');
      const choices = [...host.querySelector('[aria-label="Consumable options"]').querySelectorAll('button')]; expect(choices).toHaveLength(4); expect(choices.every(node => !node.disabled)).toBe(true);
      const pick = i ? answers[i] : 0; await click(choices[pick]); expect(app.latest().cons_sc_picked).toBe(pick); expect(host.textContent).toMatch(/Why:|Why not/);
      const score = app.latest().cons_sc_score; await click(choices[(pick + 1) % 4]); expect(app.latest().cons_sc_picked).toBe(pick); expect(app.latest().cons_sc_score).toBe(score);
      if (i < answers.length - 1) await click(button('Next scenario →'));
    }
    expect(host.textContent).toContain('Round complete: 7 of 8 on the first pick');
    await click(button('↺ Restart scenarios')); expect(app.latest()).toMatchObject({ cons_sc_idx: 0, cons_sc_picked: null, cons_sc_score: 0 }); expect(host.textContent).not.toContain('Why:');
    await click(button('📋 Browse topics')); expect(comparison().dataset).toMatchObject({ current: 'ER4043', pinned: 'E7018' });
  });

  it.each([false, true])('uses named native44px pin controls, full HTML role meanings and explicit contrast/focus without new animation (contrast=%s)', async contrast => {
    await mount({}, contrast); await pin(); const c = controls(), panel = comparison(), edge = contrast ? '#ffff00' : '#86198f';
    expect(c.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(c.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const node of c.querySelectorAll('button')) { expect(node.type).toBe('button'); expect(node.style.minHeight).toBe('44px'); expect(node.textContent.trim()).toBeTruthy(); node.focus(); expect(document.activeElement).toBe(node); }
    expect(c.querySelector('style').textContent).toContain(`button:focus-visible{outline:3px solid ${edge}!important;outline-offset:3px}`); expect(c.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(c.querySelector('[data-cons-code-status]').getAttribute('aria-live')).toBe('polite'); expect(c.querySelector('[data-cons-code-status]').getAttribute('aria-atomic')).toBe('true');
    expect(panel.style.background).toBe(c.style.background); expect(panel.style.color).toBe(c.style.color);
    expect(panel.querySelector('style').textContent).toContain(`summary:focus-visible{outline:3px solid ${edge}!important;outline-offset:3px}`);
    for (const summary of panel.querySelectorAll('[data-cons-code-field-summary]')) { expect(summary.tagName).toBe('SUMMARY'); expect(summary.parentElement.tagName).toBe('DETAILS'); expect(summary.style.minHeight).toBe('44px'); summary.focus(); expect(document.activeElement).toBe(summary); expect(summary.textContent).toContain('Current:'); expect(summary.textContent).toContain('Pinned:'); }
    for (const cell of panel.querySelectorAll('[data-cons-code-cell]')) { expect(cell.style.background).toBe(c.style.background); expect(cell.style.color).toBe(c.style.color); expect(cell.querySelector('[data-cons-code-meaning]').className).toContain('text-base'); }
    expect(panel.querySelectorAll('animate,animateTransform,canvas')).toHaveLength(0);
  });

  it('restores the entire pre-comparison Consumables function including every original decoder and assessment string', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')).replace(/\r\n/g, '\n');
    let region = source.slice(source.indexOf('function ConsumablesDeepDive('), source.indexOf('function MaineEcosystem('));
    const helperAt = region.indexOf('        function renderCodeComparison(current, pinned) {'), helperEnd = region.indexOf('        function renderDecoder() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt); region = region.slice(0, helperAt) + region.slice(helperEnd);
    const controlsAt = region.indexOf("            h('div', { 'data-cons-code-controls':"), controlsEnd = region.indexOf("            h('div', { id: 'tech2-dec-result',", controlsAt); expect(controlsAt).toBeGreaterThan(0); expect(controlsEnd).toBeGreaterThan(controlsAt); region = region.slice(0, controlsAt) + region.slice(controlsEnd);
    for (const line of ['        var consPinnedState = useState(null);\n', '          var pinnedDecoded = consPinnedState[0] ? tech2Decode(consPinnedState[0]) : null;\n', '          if (!pinnedDecoded || !pinnedDecoded.ok) pinnedDecoded = null;\n', '              r.ok && pinnedDecoded && renderCodeComparison(r, pinnedDecoded),\n']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line, ''); }
    expect(region.split('r.ok && !pinnedDecoded &&')).toHaveLength(3); region = region.replaceAll('r.ok && !pinnedDecoded &&', 'r.ok &&');
    expect(createHash('sha256').update(region).digest('hex')).toBe(ORIGINAL_SHA256);
  });
});
