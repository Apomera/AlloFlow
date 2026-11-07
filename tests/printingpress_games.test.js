// Live-mount tests for the Printing Press round games (2026-11-03, pass 2):
// selected-state on section tabs, answer keys spread across A-D, focus
// carried past choices that unmount or disable, "your answer" in text,
// unscored skips when a device lacks a sample's typeface, and AI practice
// rounds kept out of the era detective's score.
// PP_SRC points the suite at another copy (used to confirm it fails pre-fix).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const SOURCE = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const noop = () => {};
let mounted = null;

function loadTool() {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), SOURCE), 'utf8'))();
  return reg._registry.printingPress;
}

function mount(initial, callGemini) {
  const cfg = loadTool();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    const update = (toolId, key, val) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({
      React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop,
      awardXP: noop, callGemini: callGemini || null, gradeLevel: '7th Grade', t: (k, f) => f || k,
      icons: new Proxy({}, { get: () => () => null }),
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return host;
}

const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
const buttons = (scope) => Array.from(scope.querySelectorAll('button'));
const byText = (scope, text) => buttons(scope).find((b) => b.textContent.includes(text));
const LETTERED = /^[A-D]\. /;
const lettered = (scope) => buttons(scope).filter((b) => LETTERED.test(b.textContent));
// Focus that fell to <body> would contain every string on the page.
function focused() {
  const el = document.activeElement;
  expect(el && el !== document.body, 'focus stays inside the game').toBe(true);
  return el;
}

// Fake a device that has only some typefaces: canvas widths change only when
// the first family in ctx.font is installed. jsdom has no canvas and its UA
// says jsdom (the tool then assumes every face is present), so both are faked.
function fakeInstalledFaces(installed) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; CrOS x86_64) Chrome/130');
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    let font = '';
    return {
      set font(v) { font = v; }, get font() { return font; },
      measureText(text) {
        const first = /^\d+px\s+"?([^",]+)"?/.exec(font)[1].trim();
        return { width: text.length * 10 + (installed.includes(first) ? 3 : 0) };
      },
    };
  });
}

beforeEach(() => {
  try { localStorage.clear(); } catch (_) {}
});
afterEach(() => {
  if (mounted) { try { act(() => mounted.root.unmount()); } catch (_) {} mounted.host.remove(); mounted = null; }
  vi.restoreAllMocks();
});

describe('section tabs', () => {
  it('report which tab is selected, not by colour alone', () => {
    const host = mount({ view: 'censorship' });
    const guess = byText(host, 'Era guesser');
    expect(guess.getAttribute('aria-pressed')).toBe('false');
    const selected = buttons(host).filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selected.length).toBeGreaterThan(0);
    click(guess);
    expect(guess.getAttribute('aria-pressed')).toBe('true');
    for (const b of selected) expect(b.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('answer keys', () => {
  it('spread the cumulative quiz keys evenly across A-D', () => {
    const host = mount({ view: 'cumulative' });
    const total = Number(/of (\d+)/.exec(host.textContent)[1]);
    const slots = [0, 0, 0, 0];
    for (let i = 0; i < total; i++) {
      const opts = buttons(host.querySelector('[role="progressbar"]').nextElementSibling);
      click(opts[0]);
      const keyIdx = buttons(host.querySelector('[role="progressbar"]').nextElementSibling)
        .findIndex((b) => b.textContent.startsWith('✓ Correct answer:'));
      expect(keyIdx).toBeGreaterThanOrEqual(0);
      slots[keyIdx]++;
      click(byText(host, i + 1 < total ? 'Next →' : 'See results'));
    }
    expect(Math.max(...slots) - Math.min(...slots), 'keys per slot ' + slots.join('/')).toBeLessThanOrEqual(1);
  });

  it('spread the font-ID keys evenly across A-D', () => {
    const host = mount({ view: 'fontIdentification' });
    const slots = [0, 0, 0, 0];
    for (let guard = 0; guard < 20; guard++) {
      const opts = lettered(host);
      click(opts[0]);
      const right = /Right answer:\s*(.+)$/.exec(Array.from(host.querySelectorAll('div')).find((d) => d.textContent.startsWith('Right answer:')).textContent)[1];
      slots[opts.findIndex((b) => b.textContent.replace(LETTERED, '') === right)]++;
      const next = byText(host, 'Next round');
      if (!next) break;
      click(next);
    }
    expect(slots.reduce((a, b) => a + b, 0)).toBe(12);
    expect(Math.max(...slots) - Math.min(...slots), 'keys per slot ' + slots.join('/')).toBeLessThanOrEqual(1);
  });
});

describe('banned-books era guesser', () => {
  it('moves focus to the feedback, names a wrong pick, and returns focus to the next round', () => {
    const host = mount({ view: 'censorship' });
    click(byText(host, 'Era guesser'));
    const opts = lettered(host);
    expect(opts.length).toBe(4);
    // Probe for the key, then restart and pick a wrong option.
    click(opts[0]);
    const right = /Right answer:\s*(.+)$/.exec(Array.from(host.querySelectorAll('div')).find((d) => d.textContent.startsWith('Right answer:')).textContent)[1];
    click(byText(host, 'Start over'));
    expect(host.textContent).toContain('Round 1 of');
    const wrong = lettered(host).find((b) => b.textContent.replace(LETTERED, '') !== right);
    const wrongText = wrong.textContent.replace(LETTERED, '');
    click(wrong);
    const fb = focused();
    expect(fb.textContent, 'focus lands on the feedback').toContain('Right answer:');
    expect(fb.textContent).toContain('✗ Not quite.');
    expect(fb.textContent).toContain('Your answer: ' + wrongText);
    click(byText(host, 'Next book'));
    expect(focused().textContent).toContain('Reason for banning');
    expect(host.textContent).toContain('Round 2 of');
  });
});

describe('name that face', () => {
  it('carries focus to the feedback and back to the next clue', () => {
    const host = mount({ view: 'typeFoundry' });
    click(byText(host, 'Name that face'));
    click(lettered(host)[0]);
    expect(focused().textContent).toContain('Right answer:');
    click(byText(host, 'Next →'));
    expect(focused().textContent).toContain('Description');
  });
});

describe('font identification on a device missing typefaces', () => {
  it('offers an unscored skip instead of judging a stand-in font', () => {
    fakeInstalledFaces(['Times New Roman']);
    const host = mount({ view: 'fontIdentification' });
    // Round 1 is Times New Roman: present, so it plays normally.
    expect(lettered(host).length).toBe(4);
    expect(host.querySelector('[role="note"]')).toBeNull();
    click(lettered(host)[0]);
    expect(focused().textContent).toContain('Right answer:');
    click(byText(host, 'Next round'));
    // Round 2 is Arial: missing (and Helvetica, its equivalent, too).
    expect(lettered(host).length).toBe(0);
    expect(host.querySelector('[role="note"]').textContent).toContain('does not have the typeface');
    click(byText(host, 'Skip this round'));
    expect(focused().textContent).toContain('Skipped (not scored).');
    expect(host.textContent).toMatch(/Score: [01] \/ 11/);
  });

  it('treats every face as present when it cannot measure (jsdom, SSR)', () => {
    const host = mount({ view: 'fontIdentification' });
    click(lettered(host)[0]);
    click(byText(host, 'Next round'));
    expect(lettered(host).length).toBe(4);
  });
});

describe('era detective', () => {
  it('skips, unscored, a sample this device cannot draw in its period face', () => {
    fakeInstalledFaces(['Cambria', 'Helvetica']);
    const host = mount({ view: 'typographyToday' });
    // Round 1 is blackletter; no blackletter face is installed.
    const note = Array.from(host.querySelectorAll('[role="note"]')).find((n) => /period typeface/.test(n.textContent));
    expect(note).toBeTruthy();
    expect(byText(host, '1450s')).toBeUndefined();
    click(byText(host, 'Skip this sample'));
    expect(focused().textContent).toContain('Skipped (not scored). The era is 1450s.');
    expect(host.textContent).toContain('Score: 0 / 4');
    click(byText(host, 'Next sample'));
    expect(focused().textContent).toMatch(/^Round 2 of 5/);
    // Round 2 (italic, Cambria) is drawable: pick an era, see text markers.
    const eraBtn = byText(host, '1500s');
    click(eraBtn);
    expect(eraBtn.textContent).toBe('✓ 1500s');
    expect(focused().getAttribute('aria-live')).toBe('polite');
    expect(host.textContent).toContain('Score: 1 / 4');
  });
  it('keeps AI practice rounds out of the score', async () => {
    const callGemini = vi.fn().mockResolvedValue({ text: '{"sample": "METRO", "era": "1900s", "why": "Post-war sans."}' });
    const host = mount({ view: 'typographyToday' }, callGemini);
    click(byText(host, '1450s'));
    expect(host.textContent).toContain('Score: 1 / 5');
    click(byText(host, 'Generate (AI)'));
    await act(async () => { await Promise.resolve(); });
    expect(host.textContent).toContain('AI round (off-cycle)');
    click(byText(host, '1900s'));
    expect(host.textContent, 'a correct AI round does not raise the curated score').toContain('Score: 1 / 5');
    expect(byText(host, '1900s').textContent).toBe('✓ 1900s');
    click(byText(host, 'Back to curated cycle'));
    expect(focused().textContent).toMatch(/^Round 2 of 5/);
  });
});

describe('nick orientation game', () => {
  it('names the pick and the right-way-up sort after a guess, and keeps focus in the game', () => {
    const host = mount({ view: 'castingType' });
    const sorts = buttons(host).filter((b) => /^Sort \d, /.test(b.getAttribute('aria-label') || ''));
    expect(sorts.length).toBe(4);
    const wrong = sorts.find((b) => !/near the foot/.test(b.getAttribute('aria-label')));
    click(wrong);
    expect(wrong.getAttribute('aria-label')).toMatch(/, your pick$/);
    expect(sorts.find((b) => /near the foot/.test(b.getAttribute('aria-label'))).getAttribute('aria-label')).toMatch(/, right way up$/);
    expect(wrong.textContent).toContain('✗ your pick');
    expect(focused().textContent).toContain('outlined in green');
    click(byText(host, 'Next sort'));
    expect(focused().textContent).toBe('Round 2 of 5');
    // The mirrored letter on the sort's face sits inside the sort, not at x = -28.
    const glyph = sorts[0].querySelector('text');
    expect(glyph.getAttribute('transform')).toBe('translate(56, 0) scale(-1, 1)');
  });
});

describe('imposition puzzle', () => {
  it('moves focus to the result after checking the fold', () => {
    const host = mount({ view: 'setType' });
    const heading = Array.from(host.querySelectorAll('h2')).find((x) => x.textContent.includes('Imposition puzzle'));
    const card = heading.parentElement;
    for (let n = 1; n <= 4; n++) {
      const tile = buttons(card).find((b) => b.textContent === String(n) && b.hasAttribute('aria-pressed'));
      click(tile);
      const empty = buttons(card).find((b) => /, empty$/.test(b.getAttribute('aria-label') || ''));
      click(empty);
    }
    click(byText(card, 'Check the fold'));
    expect(focused().textContent).toMatch(/^(✓ Correct|✗ Not yet)/);
    click(byText(card, 'Try again'));
    expect(document.activeElement).toBe(heading);
  });
});
