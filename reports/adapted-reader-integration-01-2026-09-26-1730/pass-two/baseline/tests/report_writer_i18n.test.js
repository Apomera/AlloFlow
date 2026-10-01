// Report Writer screen text in the clinician's language.
//
// WHY (2026-09-23): only a handful of the Report Writer's pop-ups were keyed;
// every heading, button, label, placeholder and screen-reader name was bare
// English, so a school psychologist working in Spanish got a Spanish shell
// around an English tool. The screen text now goes through the host
// translator (window.__alloT) under report_writer.*.
//
// What must NOT be translated is just as important: the report itself, the
// prompts, the score labels (a WISC-V "Very Low" is the manual's term) and the
// verifier's findings stay in the language the report is written in.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let createRoot;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
});

// A stand-in for a loaded language pack: a few translations. Any other key is
// unresolved, as for a string no pack has yet, and must show the English.
const PACK = {
  'report_writer.step_assessment_scores': 'Puntuaciones',
  'report_writer.assessment_score_entry': 'Registro de puntuaciones',
  'report_writer.add': 'Añadir',
  'report_writer.scores_entered': '{count} puntuaciones registradas',
  'report_writer.toast_enter_a_subtest_name_and_a': 'Escriba el nombre de la subprueba y una puntuación.',
  'report_writer.entry_outside_the_possible_range': '{value} está fuera del rango posible de {metric} ({min}-{max}).',
  'report_writer.metric_standard_score': 'puntuación estándar',
};
let mounted = null;
afterEach(async () => {
  if (mounted) { await React.act(async () => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  delete window.__alloT;
});
const act = (fn) => React.act(async () => { await fn(); });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

async function render(translate) {
  if (translate) window.__alloT = translate;
  localStorage.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const addToast = vi.fn();
  mounted = { host, root };
  await act(() => root.render(React.createElement(window.AlloModules.ReportWriter, {
    onClose: vi.fn(), callGemini: vi.fn(async () => '{}'), addToast, t: key => key,
    studentNickname: 'Student A', behaviorLensData: null, longitudinalData: null, dashboardData: [],
  })));
  const steps = () => Array.from(host.querySelectorAll('nav button'));
  return { host, addToast, steps };
}

describe('screen text follows the host language', () => {
  it('headings, buttons, step names and counts are translated; score labels are not', async () => {
    const { host, steps } = await render((key) => PACK[key]);
    await click(steps()[3]);
    expect(steps()[3].textContent).toContain('Puntuaciones');
    expect(host.textContent).toContain('Registro de puntuaciones');
    host.querySelector('input[aria-label="Score for Full Scale IQ"]').value = '75';
    const add = host.querySelector('#rw-sub-Full-Scale-IQ-add');
    expect(add.textContent).toBe('Añadir');
    await click(add);
    expect(host.textContent).toContain('1 puntuaciones registradas');
    // The manual's classification and the instrument's name stay as published.
    expect(host.textContent).toMatch(/WISC-V — Full Scale IQ/);
    expect(host.textContent).toContain('Very Low');
  });

  it('pop-ups are translated, with their values filled in', async () => {
    const { host, addToast, steps } = await render((key) => PACK[key]);
    await click(steps()[3]);
    await click(host.querySelector('button[aria-label="Add score entry"]'));
    host.querySelector('input[aria-label="Score for Full Scale IQ"]').value = '250';
    await click(host.querySelector('#rw-sub-Full-Scale-IQ-add'));
    const texts = addToast.mock.calls.map(c => String(c[0]));
    expect(texts).toContain('Escriba el nombre de la subprueba y una puntuación.');
    expect(texts).toContain('250 está fuera del rango posible de puntuación estándar (20-200).');
  });

  it('a key the host cannot resolve, or one echoed back as the key, shows the English', async () => {
    const { host, steps } = await render((key) => key);
    await click(steps()[3]);
    expect(host.textContent).toContain('Assessment Score Entry');
    expect(host.textContent).not.toMatch(/report_writer\./);
  });
});

describe('clinical content is never routed through the screen translator', () => {
  it('the verifier\'s findings and score labels are unchanged under a translator', async () => {
    window.__alloT = (key) => '«' + key + '»';
    const PC = window.AlloPsycheck;
    const r = PC.verifyDraft([{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, score_type: 'standard' }],
      'On the WISC-V, the Full Scale IQ was 75, in the Average range.');
    expect(r.discrepancies[0].detail).not.toContain('«');
    const U = window.AlloModules.ReportWriterUtils;
    expect(U.classifyDisplayScore(75, 'standard', 'WISC-V', 'Full Scale IQ').label).toBe('Very Low');
    expect(U.scoreTableText([{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 75, scoreType: 'standard', classification: 'Very Low' }])).not.toContain('«');
  });
});

describe('every key the module uses is registered with the same English', () => {
  it('report_writer.* keys and fallbacks match ui_strings.js', () => {
    const src = readFileSync(resolve(process.cwd(), 'report_writer_module.js'), 'utf8');
    const bank = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).report_writer || {};
    const unesc = (s) => s.replace(/\\(.)/g, (m, c) => ({ n: '\n', r: '\r', t: '\t' })[c] || c);
    const calls = [...src.matchAll(/__alloT\(\s*'report_writer\.([a-z0-9_]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g)];
    expect(calls.length).toBeGreaterThan(400);
    const wrong = calls.filter(([, k, fb]) => bank[k] !== unesc(fb)).map(([, k]) => k);
    expect([...new Set(wrong)]).toEqual([]);
  });
});
