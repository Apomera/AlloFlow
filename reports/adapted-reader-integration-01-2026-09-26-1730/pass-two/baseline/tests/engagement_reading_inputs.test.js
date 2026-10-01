// Reading by scrolling counts as activity (2026-09-24).
//
// "Engaged" = tab visible AND an interaction in the last 3 minutes. The host only listened for click,
// keydown, mousemove and a window `scroll`. Scrolling an app pane or the SEL Hub dialog scrolls an
// inner element, whose scroll event never reaches a bubble listener on window, so a student reading
// with a mouse wheel or a trackpad counted as idle after 3 minutes: no progress on "Spend 5 minutes in
// <tool>" (every Crew station has one) and idle minutes in the focus data. Measured in Chromium: a
// wheel scroll moved the Hub 350 px and isEngaged() stayed false. (A finger scroll on a real touch
// device sends no mouse events by spec; Chromium's phone emulation does send mousemove, so it could
// not show that case.) The fix listens for the
// inputs that do the scrolling (wheel, touch, pointerdown), not for `scroll` in the capture phase,
// which would also fire for the app's own programmatic scrolling with nobody there.
// Runs the host's real effect from both copies; HOST_ENGAGEMENT_PATHS points it at copies (mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = (process.env.HOST_ENGAGEMENT_PATHS || 'AlloFlowANTI.txt,desktop/web-app/src/App.jsx').split(',');
const TIMEOUT = 180000;

function loadEffect(file) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const start = src.indexOf('  useEffect(() => {\n    const trackInteraction = ');
  if (start < 0) throw new Error('engagement effect not found in ' + file);
  const end = src.indexOf('\n  }, []);', start);
  if (end < 0) throw new Error('engagement effect end not found in ' + file);
  const body = src.slice(start + '  useEffect('.length, end + '\n  }'.length);
  return new Function('window', 'document', 'lastInteractionTimeRef', '_ALLO_ENGAGEMENT_TIMEOUT_MS', 'return (' + body + ')();');
}

function mount(file) {
  const listeners = new Map();
  const win = {
    addEventListener: (evt, fn) => { if (!listeners.has(evt)) listeners.set(evt, new Set()); listeners.get(evt).add(fn); },
    removeEventListener: (evt, fn) => { if (listeners.has(evt)) listeners.get(evt).delete(fn); },
  };
  const ref = { current: Date.now() };
  const cleanup = loadEffect(file)(win, { hidden: false }, ref, TIMEOUT);
  const fire = (evt) => { for (const fn of listeners.get(evt) || []) fn({ type: evt }); };
  const live = () => [...listeners].filter(([, set]) => set.size).map(([evt]) => evt).sort();
  return { win, ref, cleanup, fire, live };
}

describe.each(FILES)('host engagement probe (%s)', (file) => {
  it.each(['wheel', 'touchstart', 'touchmove', 'pointerdown', 'click', 'keydown', 'mousemove', 'scroll'])(
    'a %s after 3 idle minutes makes the student engaged again', (evt) => {
      const h = mount(file);
      h.ref.current = Date.now() - TIMEOUT - 20000;
      expect(h.win.__alloEngagement.isEngaged()).toBe(false);
      h.fire(evt);
      expect(h.win.__alloEngagement.isEngaged()).toBe(true);
      h.cleanup();
    });

  it('an input older than the window still reads as idle (the gate still closes)', () => {
    const h = mount(file);
    h.fire('wheel');
    h.ref.current = Date.now() - TIMEOUT - 1;
    expect(h.win.__alloEngagement.isEngaged()).toBe(false);
    h.cleanup();
  });

  it('cleanup removes every listener it added and retracts the probe', () => {
    const h = mount(file);
    expect(h.live().length).toBeGreaterThanOrEqual(8);
    h.cleanup();
    expect(h.live()).toEqual([]);
    expect(h.win.__alloEngagement == null).toBe(true);
  });
});
