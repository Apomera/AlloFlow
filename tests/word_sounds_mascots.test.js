// Shared mascots (2026-11-07): allo_mascots_module.js carries the Typing Lab's characters on their own, and
// Word Sounds uses them to cheer a right answer (Present to class on Reveal; the practice "correct" message).
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, fullscreenGrants, makeHatItem, React } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const SHARED = readFileSync('allo_mascots_module.js', 'utf8');
const stub = () => ({ __locked: true, render: (id, opts) => React.createElement('svg', { 'data-stub': id + ':' + opts.state }) });
const words = () => [makePackItem(), makeHatItem()];
async function present(extra = {}) {
  const { host } = await mount({ isTeacherMode: true, words: words(), disableAnimations: false, ...extra });
  await click(presentButton(host));
  await settle(40);
  return presenter(host);
}
const choice = (p, value) => p.querySelector('[data-present-choice="' + value + '"]');

beforeAll(() => { loadModal(); fullscreenGrants(); });
beforeEach(() => { try { window.localStorage.removeItem('allo_ws_present_look'); } catch (_) {} window.AlloMascots = stub(); });
afterEach(() => { unmountAll(); delete window.AlloMascots; });

describe('the shared mascots file', () => {
  it('draws all five mascots on its own, with gradient ids made unique per copy', () => {
    delete window.AlloMascots;
    delete (window.AlloModules || {}).AlloMascotsModule;
    document.getElementById('allo-mascot-styles')?.remove();
    window.React = React;
    new Function(SHARED)();
    const M = window.AlloMascots;
    expect(M.__shared).toBe(true);
    expect(M.ids).toEqual(['pip', 'cogsworth', 'vex', 'mochi', 'inko']);
    const { renderToStaticMarkup } = createRequire(import.meta.url)(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
    for (const id of M.ids) {
      const a = renderToStaticMarkup(M.render(id, { state: 'win', size: 64, idSuffix: '-a' }));
      const b = renderToStaticMarkup(M.render(id, { state: 'win', size: 64, idSuffix: '-b' }));
      const ids = (html) => [...html.matchAll(/ id="(tp-[^"]+)"/g)].map((m) => m[1]);
      expect(ids(a).length, id).toBeGreaterThan(0);
      expect(ids(a).every((x) => x.endsWith('-a')) && ids(b).every((x) => x.endsWith('-b')), id).toBe(true);
      for (const ref of a.matchAll(/url\(#([^)]+)\)/g)) expect(ids(a), id + ' points at its own gradients').toContain(ref[1]);
    }
    expect(document.getElementById('allo-mascot-styles').textContent).toContain('tp-mascot');
    expect(document.getElementById('allo-mascot-styles').textContent, 'no app-wide rules').not.toMatch(/(^|\n)\s*\*\s*[,{]/);
  });
  it('never replaces a mascot API that is already there', () => {
    const existing = stub();
    window.AlloMascots = existing;
    delete (window.AlloModules || {}).AlloMascotsModule;
    window.React = React;
    new Function(SHARED)();
    expect(window.AlloMascots).toBe(existing);
  });
});

describe('Present to class', () => {
  it('cheers on Reveal when the class chose the right answer', async () => {
    const p = await present();
    await click(choice(p, 'hat'));
    await key(p, 'r');
    const cheer = p.querySelector('[data-present-cheer]');
    expect(cheer).toBeTruthy();
    expect(cheer.getAttribute('aria-hidden')).toBe('true');
    expect(cheer.querySelector('[data-stub]').getAttribute('data-stub')).toBe('pip:win');
  });
  it('stays quiet for a wrong answer, or when no answer was chosen', async () => {
    const p = await present();
    await click(choice(p, 'dog'));
    await key(p, 'r');
    expect(p.querySelector('[data-present-cheer]')).toBeNull();
    await key(p, 'ArrowRight');
    await key(p, 'r');
    expect(p.querySelector('[data-present-cheer]')).toBeNull();
  });
  it('the teacher picks the mascot, or none', async () => {
    const p = await present();
    const drawerToggle = p.querySelector('[aria-controls="ws-present-drawer"]');
    await click(drawerToggle);
    // The drawer remounts its controls each time it opens, so look the select up every time.
    const set = async (value) => { const select = p.querySelector('[data-present-mascot]'); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); await settle(5); };
    await set('mochi');
    await click(drawerToggle);
    await click(choice(p, 'hat'));
    await key(p, 'r');
    expect(p.querySelector('[data-present-cheer] [data-stub]').getAttribute('data-stub')).toBe('mochi:win');
    await click(drawerToggle);
    await set('off');
    await click(drawerToggle);
    await key(p, 'ArrowRight');
    await click(choice(p, 'cat'));
    await key(p, 'r');
    expect(p.querySelector('[data-present-cheer]')).toBeNull();
  });
});

describe('practice', () => {
  // The host owns the feedback state; here it is handed in the way the host does after a right answer.
  const answerRight = async (extra) => {
    const { host } = await mount({ activity: 'counting', isTeacherMode: true, words: words(), wordSoundsFeedback: { isCorrect: true, message: 'Correct!' }, ...extra });
    await settle(30);
    return host;
  };
  it('the mascot takes the place of the party popper in a right-answer message', async () => {
    const host = await answerRight({ disableAnimations: false });
    const mascot = host.querySelector('[data-ws-feedback-mascot]');
    expect(mascot).toBeTruthy();
    expect(mascot.getAttribute('aria-hidden')).toBe('true');
    expect(mascot.parentElement.textContent).not.toContain('🎉');
  });
  it('is not shown when animations are turned off', async () => {
    const host = await answerRight({ disableAnimations: true });
    expect(host.querySelector('[data-ws-feedback-mascot]')).toBeNull();
  });
});

describe('choosing one, all five, or none', () => {
  const pick = async (select, value) => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); await settle(5); };
  it('the practice toolbar picks the mascot, all five, or none, and the choice is shared with Present to class', async () => {
    const { host } = await mount({ activity: 'counting', isTeacherMode: true, words: words(), disableAnimations: false, wordSoundsFeedback: { isCorrect: true, message: 'Correct!' } });
    await settle(20);
    const select = host.querySelector('[data-ws-mascot-choice] select');
    expect([...select.options].map((o) => o.value)).toEqual(['pip', 'cogsworth', 'vex', 'mochi', 'inko', 'all', 'off']);
    await pick(select, 'all');
    expect(host.querySelectorAll('[data-ws-feedback-mascot] [data-stub]')).toHaveLength(5);
    await pick(select, 'off');
    expect(host.querySelector('[data-ws-feedback-mascot]')).toBeNull();
    expect(host.textContent).toContain('🎉');
    await pick(select, 'vex');
    expect(host.querySelector('[data-ws-feedback-mascot] [data-stub]').getAttribute('data-stub')).toMatch(/^vex:/);
    expect(JSON.parse(window.localStorage.getItem('allo_ws_present_look')).mascot).toBe('vex');
    unmountAll();
    const p = await present();
    await click(p.querySelector('[aria-controls="ws-present-drawer"]'));
    expect(p.querySelector('[data-present-mascot]').value, 'Present to class starts with the same choice').toBe('vex');
  });
  it('Present to class can cheer with all five', async () => {
    window.localStorage.setItem('allo_ws_present_look', JSON.stringify({ mascot: 'all' }));
    const p = await present();
    await click(choice(p, 'hat'));
    await key(p, 'r');
    expect(p.querySelectorAll('[data-present-cheer] [data-stub]')).toHaveLength(5);
  });
  it('is not offered when animations are off or in a probe', async () => {
    expect((await mount({ activity: 'counting', isTeacherMode: true, words: words(), disableAnimations: true })).host.querySelector('[data-ws-mascot-choice]')).toBeNull();
  });
});
