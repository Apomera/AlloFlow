import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// 2026-11-18 (owner): grouped set cards. The app's Symbol Runner panel (math_fluency_module.js) picks its set from
// choice cards in collapsible groups, as the Packets maker does (packets-symbol-runner.js drawSetChooser), instead of
// one long dropdown. Each card: the set's name and one plain line. The chosen set's group is open; the others show a count.
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

const React = require(path.resolve(md, 'react'));
const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
const { act } = require(path.resolve(md, 'react-dom/test-utils'));

async function mount(extra) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url: 'https://alloflow-cdn.pages.dev/app/' });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = React;
  w.eval(read('math_fluency_module.js'));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  w.IS_REACT_ACT_ENVIRONMENT = true;
  const given = [];
  w.AlloSymbolRunnerCore.mountRunner = (container, config) => { given.push(config); return { destroy() {} }; };
  w.fetch = () => Promise.resolve({ ok: false });
  const host = w.document.getElementById('root');
  const root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(w.AlloModules.SymbolRunner, Object.assign({ React, t: (k) => k, addToast: () => {}, handleScoreUpdate: () => {} }, extra)));
  });
  return { w, host, given, core: w.AlloSymbolRunnerCore, unmount: () => act(async () => { root.unmount(); }) };
}

const groupsOf = (host) => [...host.querySelectorAll('[data-testid="symbol-runner-sets"] details[data-sr-group]')];
const title = (g) => g.querySelector('summary h3').textContent;
const count = (g) => g.querySelector('[data-sr-group-count]').textContent;

describe('the Symbol Runner panel\'s set cards', () => {
  it('shows the groups in order, every set once, the chosen set\'s group open and the others closed with a count', async () => {
    const p = await mount();
    const box = p.host.querySelector('[data-testid="symbol-runner-sets"]');
    expect(box.tagName).toBe('FIELDSET');
    expect(box.querySelector('legend').textContent).toBe('Symbol set');
    // No dropdown of sets is left.
    expect([...p.host.querySelectorAll('select option')].some((o) => o.value === 'confusable_letters')).toBe(false);
    const groups = groupsOf(p.host);
    expect(groups.map(title)).toEqual(['Letters and sounds', 'Words', 'Numbers and math facts', 'Attention and switching', 'Your own']);
    const radios = [...box.querySelectorAll('input[type="radio"]')];
    expect(radios.map((r) => r.value).sort()).toEqual(p.core.MODES.map((m) => m.id).sort());
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    // Each card: the set's plain name (the translated sr_mode_<id>) as its name, and a plain line as its description.
    for (const r of radios) {
      const name = p.w.document.getElementById(r.getAttribute('aria-labelledby'));
      const line = p.w.document.getElementById(r.getAttribute('aria-describedby'));
      expect(r.closest('label').contains(name), r.value).toBe(true);
      expect(name.textContent).toBe(p.core.MODES.find((m) => m.id === r.value).title);
      expect(line.textContent.length, r.value).toBeGreaterThan(10);
    }
    expect(box.querySelector('input[value="confusable_letters"]').checked).toBe(true);
    expect(groups.map((g) => g.open)).toEqual([true, false, false, false, false]);
    expect(groups.map(count)).toEqual(['chosen', '5 sets', '7 sets', '6 sets', '1 set']);
    await p.unmount();
  });

  it('says the attention group is not reading or math practice', async () => {
    const p = await mount();
    const att = groupsOf(p.host).find((g) => g.getAttribute('data-sr-group') === 'attention');
    expect(att.querySelector('[data-sr-group-line]').textContent).toBe('Practice for focus and for switching between kinds of symbols. Not reading or math practice.');
    expect(att.querySelector('summary').textContent).toMatch(/Not reading or math practice\./);
    await p.unmount();
  });

  it('choosing a card changes the set the game gets, starts a new round, and opens that set\'s group', async () => {
    const p = await mount();
    const before = p.given[p.given.length - 1];
    expect(before.modeId).toBe('confusable_letters');
    const radio = p.host.querySelector('[data-testid="symbol-runner-sets"] input[value="math_doubles"]');
    await act(async () => { radio.click(); });
    const after = p.given[p.given.length - 1];
    expect(after.modeId).toBe('math_doubles');
    expect(after.seed).not.toBe(before.seed);
    expect(p.host.querySelector('[data-testid="symbol-runner-sets"] input[value="math_doubles"]').checked).toBe(true);
    expect(p.host.querySelector('[data-testid="symbol-runner-sets"] input[value="confusable_letters"]').checked).toBe(false);
    const groups = groupsOf(p.host);
    // The new set's group is open and says chosen; the group that was open stays open (as on the Packets page).
    expect(groups.map((g) => g.open)).toEqual([true, false, true, false, false]);
    expect(groups.map(count)).toEqual(['6 sets', '5 sets', 'chosen', '6 sets', '1 set']);
    // The Settings line names the new set.
    expect(p.host.querySelector('[data-testid="symbol-runner-settings"] > summary').textContent).toBe('Settings: Doubles and near doubles (6 + 6, 6 + 7)');
    await p.unmount();
  });

  it('a set a teacher saved opens on its own group', async () => {
    const p = await mount({ runnerSettings: { mode: 'flanker_letters', count: 10, rehearsal: false } });
    expect(p.given[p.given.length - 1].modeId).toBe('flanker_letters');
    expect(groupsOf(p.host).map((g) => g.open)).toEqual([false, false, false, true, false]);
    expect(p.host.querySelector('input[value="flanker_letters"]').checked).toBe(true);
    await p.unmount();
  });

  it('every new word is a registered math_fluency key with the same English', () => {
    const ui = JSON.parse(read('ui_strings.js')).math_fluency;
    const src = read('math_fluency_module.js');
    const groups = { letters: 'Letters and sounds', words: 'Words', numbers: 'Numbers and math facts', attention: 'Attention and switching', own: 'Your own', more: 'More sets' };
    for (const [id, en] of Object.entries(groups)) expect(ui['sr_group_' + id]).toBe(en);
    expect(ui.sr_group_attention_line).toBe('Practice for focus and for switching between kinds of symbols. Not reading or math practice.');
    expect([ui.sr_group_chosen, ui.sr_group_one_set, ui.sr_group_n_sets]).toEqual(['chosen', '1 set', '{n} sets']);
    const w = new JSDOM('', { runScripts: 'outside-only' }).window;
    opened.push(w);
    w.eval(read('symbol_runner_core.js'));
    for (const m of w.AlloSymbolRunnerCore.MODES) {
      expect(typeof ui['sr_line_' + m.id], m.id).toBe('string');
      expect(src, m.id).toContain('    ' + m.id + ': ' + JSON.stringify(ui['sr_line_' + m.id]).replace(/^"|"$/g, "'") + ',');
    }
  });
});
