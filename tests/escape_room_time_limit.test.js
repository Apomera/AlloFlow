// WCAG 2.2.1 Timing Adjustable: the Puzzle Challenge (escape room) settings let a
// player turn the time limit off. The engine already skips the countdown and keeps
// play open when timerEnabled is false; this pins the control that sets it and the
// clock that disappears with it.
// ESCAPE_ROOM_CANDIDATE=<path> runs these tests against a scratch copy (mutation checks).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const en = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const t = (key, params = {}) => {
  let value = key.split('.').reduce((o, k) => o?.[k], en);
  if (typeof value !== 'string') return key;
  for (const [name, replacement] of Object.entries(params)) value = value.replace('{' + name + '}', replacement);
  return value;
};

let root = null;
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(fs.readFileSync(process.env.ESCAPE_ROOM_CANDIDATE || 'escape_room_module.js', 'utf8'))();
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; document.body.innerHTML = ''; });

function mountSettings(initial) {
  let current = initial;
  function Harness() {
    const [room, setRoom] = React.useState(initial);
    current = room;
    const handlers = {
      updateEscapeRoomSetting: (key, value) => setRoom(prev => ({ ...prev, [key]: value })),
      hasSavedEscapeRoom: () => false, hasEscapeRoomDraft: () => false, launchEscapeRoomWithSettings: () => {},
    };
    return React.createElement(window.AlloModules.EscapeRoomDialogs, { escapeRoomState: room, setEscapeRoomState: setRoom, handlers, t, hasSourceOrAnalysis: true });
  }
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  act(() => root.render(React.createElement(Harness)));
  return () => current;
}

describe('Puzzle Challenge time limit', () => {
  it('offers a named On/Off time-limit control that turns the clock off', () => {
    const state = mountSettings({ showSettings: true, difficulty: 'normal', puzzleCount: 10 });
    const group = document.querySelector('[role="group"][aria-labelledby="escape-room-time-limit-label"]');
    expect(group, 'time-limit group').not.toBeNull();
    expect(document.getElementById('escape-room-time-limit-label').textContent).toBe(t('common.time_limit'));
    const on = group.querySelector('[data-escape-time-limit="on"]');
    const off = group.querySelector('[data-escape-time-limit="off"]');
    expect(on.getAttribute('aria-pressed')).toBe('true');
    expect(off.getAttribute('aria-pressed')).toBe('false');
    expect(document.body.textContent).toContain('Time: 5:00');

    act(() => off.click());
    expect(state().timerEnabled).toBe(false);
    expect(off.getAttribute('aria-pressed')).toBe('true');
    expect(document.body.textContent).not.toContain('Time: 5:00');

    act(() => on.click());
    expect(state().timerEnabled).toBe(true);
  });

  it('hides the play clock and stops counting when the time limit is off', () => {
    const src = fs.readFileSync(process.env.ESCAPE_ROOM_CANDIDATE || 'escape_room_module.js', 'utf8');
    expect(src).toContain("escapeRoomState.timerEnabled !== false ? h('div', { className: 'px-3 py-1.5 rounded-lg flex items-center gap-2 '");
    expect(src).toMatch(/room\.isGameOver \|\| room\.timerEnabled === false\) return;/);
  });

  it('ships the same module to the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/escape_room_module.js', 'utf8')).toBe(fs.readFileSync('escape_room_module.js', 'utf8'));
  });
});
