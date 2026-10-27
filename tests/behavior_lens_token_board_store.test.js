// Behavior Lens Token Board -> School Rewards worksheet (2026-10-13).
//
// A full board can add one neutral "Individual goal progress" row, by codename, to
// the device-local recognition worksheet the School Rewards panel reads. Nothing
// about the board, target behavior, reward or plan goes with it, and one fill adds
// one row; a reset-and-refill can add another.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens , bindUnlockedClinicalFixture } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const LOG_KEY = 'allo_school_rewards_recognition_log_v1';
const ANTI = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
const worksheetSource = ANTI.slice(ANTI.indexOf('const buildSchoolRewardsRecognitionWorksheet = '), ANTI.indexOf('const queueAlloHavenClassroomRewards = '));
const buildWorksheet = new Function('normalizeAlloHavenClassroomReward', 'ALLOHAVEN_CLASSROOM_REWARD_REASONS', worksheetSource + '; return buildSchoolRewardsRecognitionWorksheet;')(() => null, []);
let TB, root;

beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blTokenStoreTest = { TokenBoard };})();'))(); bindUnlockedClinicalFixture();
  TB = window.__blTokenStoreTest.TokenBoard;
});
beforeEach(() => localStorage.clear());
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.innerHTML = '';
});

const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text));
const click = node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const tokenSlots = () => Array.from(document.querySelectorAll('button')).filter(b => /^Token \d+ of \d+/.test(b.getAttribute('aria-label') || ''));
async function mount(studentName = 'Calm Otter') {
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  const toasts = [];
  await act(async () => root.render(React.createElement(TB, { studentName, studentKey: k => k, t: () => undefined, addToast: (m, kind) => toasts.push([m, kind]), callGemini: null, onClose: () => {} })));
  return toasts;
}
async function fillBoard() { for (const slot of tokenSlots()) if (!/: earned$/.test(slot.getAttribute('aria-label'))) await click(slot); }
const worksheet = () => buildWorksheet({}, '', JSON.parse(localStorage.getItem(LOG_KEY) || 'null'));

describe('Token Board Store worksheet bridge', () => {
  it('appears only on a full board and adds one neutral row by codename', async () => {
    const toasts = await mount();
    expect(button('Add to Store worksheet')).toBeUndefined();
    await click(tokenSlots()[0]);
    expect(button('Add to Store worksheet')).toBeUndefined();
    await fillBoard();
    await click(button('Add to Store worksheet'));
    expect(button('On your Store worksheet').disabled).toBe(true);
    expect(worksheet().rows).toEqual([expect.objectContaining({ codename: 'Calm Otter', total: 1, reasons: [{ label: 'Individual goal progress', count: 1 }] })]);
    expect(localStorage.getItem(LOG_KEY)).not.toMatch(/token|behavior|reward|plan|bip/i);
    expect(toasts.some(([m, kind]) => kind === 'success' && /Store worksheet/.test(m))).toBe(true);
  });

  it('allows another row only after the board is reset and filled again', async () => {
    await mount();
    await fillBoard();
    await click(button('Add to Store worksheet'));
    await click(button('Reset Board'));
    expect(button('Add to Store worksheet')).toBeUndefined();
    await fillBoard();
    await click(button('Add to Store worksheet'));
    expect(worksheet().rows[0]).toMatchObject({ codename: 'Calm Otter', total: 2 });
  });

  it('keeps live-session rows already on the worksheet', async () => {
    localStorage.setItem(LOG_KEY, JSON.stringify({ sessions: { ABC123: { updatedAt: 5, rows: { 'Quiet Owl': { ids: ['r1'], reasons: { Collaboration: 1 }, lastAt: 5 } } } } }));
    await mount();
    await fillBoard();
    await click(button('Add to Store worksheet'));
    expect(worksheet().rows.map(r => [r.codename, r.total])).toEqual([['Calm Otter', 1], ['Quiet Owl', 1]]);
  });
});
