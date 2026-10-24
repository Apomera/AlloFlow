import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { tr, arrow, signedAmount, SINGULAR_FALLBACKS } from '../lesson_board_strings.js';
import { errorText, ERROR_KEYS } from '../lesson_board_errors.js';
import { makeWaterworksBoard, WATERWORKS_SOURCE } from '../lesson_board_demo.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const registered = JSON.parse(readFileSync('ui_strings.js', 'utf8')).lesson_board, english = key => registered[key.replace(/^lesson_board\./, '')];
const sources = readdirSync('.').filter(file => /^lesson_board_.*\.(js|jsx)$/.test(file) && file !== 'lesson_board_module.js').map(file => [file, readFileSync(file, 'utf8')]);
const page = document.documentElement;
afterEach(() => { page.dir = ''; page.lang = ''; });

describe('Translated engine and storage errors', () => {
  it('maps every thrown English message to a registered key', () => {
    const missing = [];
    for (const [file, text] of sources) for (const match of text.matchAll(/\b(?:Error|fail)\(\s*'((?:[^'\\]|\\.)*)'\s*(\+\s*[^,)]+)?\)/g)) {
      const message = Function("return '" + match[1] + "'")(), head = match[2] ? message.replace(/: $/, '').trim() : message;
      if (/^[a-z0-9-]+$/.test(head) || !/\s/.test(head) || /^Invalid $/.test(head)) continue;
      if (!ERROR_KEYS.has(head)) missing.push(file + ': ' + head);
    }
    expect(missing).toEqual([]);
    for (const [message, key] of ERROR_KEYS) expect(registered[key], key).toBe(message);
  });
  it('translates whole messages, keeps stop ids and handles multi-line validation reports', () => {
    const t = key => ({ 'lesson_board.err_wait_at_least_one_confirmed': 'Espera al menos una respuesta.', 'lesson_board.err_invalid_choice_activity': 'Actividad de elección no válida', 'lesson_board.err_playable_board_validated': 'No se pudo validar el tablero.' }[key]);
    expect(errorText(t, Error('Wait for at least one confirmed response.'))).toBe('Espera al menos una respuesta.');
    expect(errorText(t, 'Invalid choice activity: heater\nSomething unexpected')).toBe('Actividad de elección no válida: heater\nSomething unexpected');
    expect(errorText(t, Error('A playable board could not be validated. Invalid choice activity: heater'))).toBe('No se pudo validar el tablero. Actividad de elección no válida: heater');
    expect(errorText(key => key, Error('That move is no longer available.'))).toBe('That move is no longer available.');
    expect(errorText(t, null)).toBe('');
  });
});

describe('Count-aware and direction-aware text', () => {
  const lookup = key => english(key);
  it('uses singular English at one and keeps the plural otherwise', () => {
    expect(tr(lookup, 'challenge_bin_count', '{count} cards', { count: 1 })).toBe('1 card');
    expect(tr(lookup, 'challenge_bin_count', '{count} cards', { count: 0 })).toBe('0 cards');
    expect(tr(key => key, 'planner_opens', 'Opens {count} locations', { count: 1 })).toBe('Opens 1 location');
    expect(tr(lookup, 'early_notice', '', { count: 1 })).toContain('1 learner has not confirmed');
    for (const [key, singular] of Object.entries(SINGULAR_FALLBACKS)) { expect(registered[key + '_one'], key).toBe(singular); expect(registered[key], key).toContain('{count}'); }
  });
  it('lets a translation supply its own plural categories', () => {
    page.lang = 'ar';
    const t = key => ({ 'lesson_board.challenge_bin_count': '{count} بطاقات', 'lesson_board.challenge_bin_count_two': 'بطاقتان' }[key]);
    expect(tr(t, 'challenge_bin_count', '{count} cards', { count: 2 })).toBe('بطاقتان');
    expect(tr(t, 'challenge_bin_count', '{count} cards', { count: 1 })).toBe('1 بطاقات');
  });
  it('flips arrows and keeps signs in front of numbers only on right-to-left pages', () => {
    const LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
    expect(tr(lookup, 'resource_gain_success', 'Earn on success +{count}', { count: 2 })).toBe('Earn on success +2');
    expect(arrow()).toBe('→'); expect(signedAmount(3)).toBe('+3');
    page.dir = 'rtl';
    expect(tr(lookup, 'resource_gain_success', 'Earn on success +{count}', { count: 2 })).toBe('Earn on success ' + LRI + '+2' + PDI);
    expect(tr(lookup, 'resource_pay_first', 'Pay first −{count}', { count: 4 })).toContain(LRI + '−4' + PDI);
    expect(tr(key => key, 'route_label', 'Heater → Cloud', {})).toBe('Heater ← Cloud');
    expect(arrow()).toBe('←'); expect(signedAmount(3)).toBe(LRI + '+3' + PDI);
  });
});

describe('Tabletop accessible names', () => {
  let root, host;
  beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t: key => key }); window.__alloFirebase = {}; window.__alloShared = { warnLog() {} }; loadAlloModule('lesson_board_module.js'); });
  afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); sessionStorage.clear(); });
  it('gives each space a short name with its details as a linked description', async () => {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.LessonBoardSolo, { board: makeWaterworksBoard(), source: WATERWORKS_SOURCE, language: 'English', user: { uid: 'u' }, appId: 'a11y', onBack() {}, t: key => english(key) })));
    const tabletop = host.querySelector('[data-board-tabletop]'); if (tabletop) await act(async () => tabletop.click());
    const spaces = [...host.querySelectorAll('[data-spatial-board] button[data-location]')];
    expect(spaces.length).toBe(10);
    for (const space of spaces) {
      expect(space.getAttribute('aria-label').length, space.dataset.location).toBeLessThan(80);
      const details = document.getElementById(space.getAttribute('aria-describedby'));
      expect(details && details.hidden && details.textContent.length > 0, space.dataset.location).toBe(true);
    }
    expect(host.querySelector('[data-location="camp"]').getAttribute('aria-label')).toContain('Home camp');
    expect(host.querySelector('.lb-spatial-legend').getAttribute('role')).toBe('group');
    expect(host.querySelector('.lb-presentation').getAttribute('role')).toBe('group');
    // Signed supply amounts are isolated left-to-right so "+2" never renders as "2+" in Arabic.
    expect(host.querySelector('.lb-token bdi[dir="ltr"]')?.textContent).toMatch(/^[+−]?\d+$/);
  });
});
