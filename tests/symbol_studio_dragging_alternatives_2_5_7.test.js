// WCAG 2.5.7 Dragging Movements: board cells and board pages must be reorderable
// with single clicks, not only by drag (or Alt+Arrow, which is keyboard-only).
// ALLO_SYMBOL_STUDIO_CANDIDATE points the harness at a scratch copy for fail-before runs.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let Studio, root, host;

beforeAll(() => { Studio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); });

const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function byLabel(name) { return [...host.querySelectorAll('[aria-label]')].find((el) => el.getAttribute('aria-label') === name); }
async function click(el) { await act(async () => { el.click(); }); }
function cellOrder() { return [...host.querySelectorAll('[data-board-cell-id]')].map((el) => el.querySelector('[data-board-speak-id]').getAttribute('aria-label').replace(/^Speak /, '').replace(/\. Position.*$/, '')); }
function pageOrder() { return [...host.querySelectorAll('[data-board-page-id]')].map((el) => el.textContent); }

async function mountBoardWithTemplate() {
  set('alloStudentProfiles', [{ id: 'a', name: 'Learner', codename: 'DEMO' }]); set('alloActiveProfileId', 'a');
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(React.createElement(Studio, baseProps({ initialTab: 'board', draftStorage: { read: async () => null, write: async () => {}, remove: async () => {} }, onCallTTS: null }))));
  const template = byLabel('Apply template: Core Vocab');
  expect(template, 'Core Vocab template button').toBeTruthy();
  await click(template);
}

describe('Symbol Studio board reorder without dragging (WCAG 2.5.7)', () => {
  it('moves a board cell later and earlier with single clicks', async () => {
    await mountBoardWithTemplate();
    const before = cellOrder();
    expect(before.length).toBeGreaterThan(2);
    const first = before[0], second = before[1];
    const later = byLabel('Move ' + first + ' later');
    expect(later, 'visible "move later" button on the first cell').toBeTruthy();
    expect(later.tagName).toBe('BUTTON');
    await click(later);
    expect(cellOrder().slice(0, 2)).toEqual([second, first]);
    await click(byLabel('Move ' + first + ' earlier'));
    expect(cellOrder()).toEqual(before);
    // Edge buttons are disabled so a click cannot fall off the board.
    expect(byLabel('Move ' + first + ' earlier').disabled).toBe(true);
    expect(byLabel('Move ' + before[before.length - 1] + ' later').disabled).toBe(true);
    // The drag path is still wired.
    expect(host.querySelector('[data-board-cell-id]').getAttribute('draggable')).toBe('true');
  });

  it('moves the active board page earlier and later with single clicks', async () => {
    await mountBoardWithTemplate();
    await click(byLabel('Enable multi-page mode — add linked pages to this board'));
    await click(byLabel('Add a new page'));
    const pages = pageOrder();
    expect(pages).toEqual(['Core Vocab', 'Page 2']);
    // Page 2 is active after Add; move it earlier.
    await click(byLabel('Move Page 2 earlier'));
    expect(pageOrder()).toEqual(['Page 2', 'Core Vocab']);
    expect(byLabel('Move Page 2 earlier').disabled).toBe(true);
    await click(byLabel('Move Page 2 later'));
    expect(pageOrder()).toEqual(['Core Vocab', 'Page 2']);
  });
});
