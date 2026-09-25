// Behavior Lens recording tools and student boards with a keyboard, a screen reader and low vision (pass 8).
//
// WHY: until 2026-09-24
// - Escape inside any tool closed all of Behavior Lens, and opening or leaving a tool dropped
//   focus onto the page.
// - Live Observation opened a recovered draft on "Discard draft". The recorders went on
//   recording while they asked "Keep draft and close?" (which says "Recording will be paused").
// - Controls that replace themselves (Start and Pause, Present Stimulus and Response, the latency
//   response) dropped focus onto the page.
// - Momentary "Occurring now" was disabled outside its 2-second look window, so focus fell off it
//   every interval, and the countdown was a live region that spoke every second.
// - Counts, taps and latency results were silent; "+1", "Remove Counter" and "eg 3" were names.
// - White text sat on emerald-500 cells (2.5:1), 400-500 board gradients and amber-500 (2.1:1).
// - The rule meant to darken slate-600 text made it lighter; its correction had a broken selector.
// - A confirmation whose opener was gone threw a ReferenceError and left focus on the page.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const src = readFileSync('behavior_lens_module.js', 'utf8');
let M, root;
beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  new Function(src.replace(/\}\)\(\);\s*$/, 'window.__blA11y = { LiveObsOverlay, IntervalGrid, FrequencyCounter, ABCModal, LatencyRecorder, ChoiceBoard, TokenBoard, askBehaviorLensConfirmation, writeObservationDraft };})();'))();
  M = window.__blA11y;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  document.body.innerHTML = '';
});
const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.trim() === text || node.getAttribute('aria-label') === text);
const byLabel = label => document.querySelector('[aria-label="' + label + '"]');
const click = node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const focusAndClick = async node => { expect(node).toBeTruthy(); node.focus(); await click(node); };
const advance = ms => act(async () => { vi.advanceTimersByTime(ms); });
const typeInto = async (node, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});
const escape = () => act(async () => { document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
async function mount(Component, props) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 9, 0, 0));
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  await act(async () => root.render(React.createElement(Component, Object.assign({ studentName: 'Kestrel', studentDraftId: 'a11y-test', onClose: () => {}, addToast: () => {}, t: () => undefined }, props))));
}

// Tailwind's palette, for the classes these screens put white text on.
const HEX = {
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'red-500': '#ef4444', 'red-700': '#b91c1c', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca',
  'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46',
  'blue-400': '#60a5fa', 'blue-600': '#2563eb', 'teal-500': '#14b8a6', 'teal-800': '#115e59',
  'amber-400': '#fbbf24', 'amber-700': '#b45309', 'orange-500': '#f97316', 'orange-800': '#9a3412',
  'pink-400': '#f472b6', 'pink-600': '#db2777', 'pink-700': '#be185d', 'rose-500': '#f43f5e', 'rose-700': '#be123c',
  'violet-400': '#a78bfa', 'violet-600': '#7c3aed', 'purple-500': '#a855f7', 'purple-700': '#7e22ce',
  'cyan-400': '#22d3ee', 'cyan-700': '#0e7490', 'sky-500': '#0ea5e9', 'sky-800': '#075985',
  white: '#ffffff', 'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-900': '#0f172a',
  'green-600': '#16a34a', 'green-700': '#15803d', 'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-800': '#92400e',
  'emerald-50': '#ecfdf5', 'emerald-300': '#6ee7b7', 'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-800': '#9f1239', 'red-400': '#f87171',
  'blue-700': '#1d4ed8', 'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-800': '#3730a3', 'purple-50': '#faf5ff', 'purple-600': '#9333ea', 'purple-800': '#6b21a8',
  'red-50': '#fef2f2', 'red-800': '#991b1b', 'rose-600': '#e11d48', 'emerald-100': '#d1fae5'
};
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const againstWhite = name => {
  expect(HEX[name], 'palette has ' + name).toBeTruthy();
  return 1.05 / (luminance(HEX[name]) + 0.05);
};
const stops = className => [...className.matchAll(/\b(?:bg|from|to)-([a-z]+-\d{3})\b/g)].map(m => m[1]);
// Each piece of text against the nearest colour it inherits and the nearest background behind
// it (background opacity variants such as bg-white/10 are skipped; text ones such as
// text-white/60 are blended). Disabled controls are exempt.
const shade = /(?:^|\s)text-((?:[a-z]+-\d{2,3})|white)(?:\/(\d{1,3}))?(?=\s|$)/;
const ground = /(?:^|\s)(?:bg|from)-((?:[a-z]+-\d{2,3})|white)(?=\s|$)/;
const nearest = (el, re) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const m = String(n.getAttribute('class') || '').match(re); if (m) return m; } return null; };
const mix = (fg, bg, alpha) => '#' + [1, 3, 5].map(i => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function unreadable(container) {
  return Array.from(container.querySelectorAll('*'))
    .filter(el => Array.from(el.childNodes).some(n => n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent)) && !el.closest('[disabled], .bl-sr-only, [aria-hidden="true"]'))
    .map(el => {
      const f = nearest(el, shade), g = nearest(el, ground);
      const fg = f ? f[1] : 'slate-900', bg = g ? g[1] : 'white', alpha = f && f[2] ? Number(f[2]) / 100 : 1;
      if (!HEX[fg] || !HEX[bg]) return 'not in palette: ' + fg + ' on ' + bg;
      const cls = String(el.getAttribute('class') || '');
      const large = /\btext-(?:xl|[2-9]xl)\b/.test(cls) || (/\btext-lg\b/.test(cls) && /\bfont-(?:bold|black|extrabold)\b/.test(cls));
      const r = contrast(mix(HEX[fg], HEX[bg], alpha), HEX[bg]);
      return r < (large ? 3 : 4.5) ? fg + ' on ' + bg + ' ' + r.toFixed(2) + ': ' + el.textContent.trim().slice(0, 40) : null;
    })
    .filter(Boolean);
}

describe('moving between tools with the keyboard', () => {
  const settle = () => act(async () => { await new Promise(done => setTimeout(done, 50)); });
  async function mountApp(onClose) {
    localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'student-a', name: 'Student A' }]));
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }], onClose }))));
    await settle();
  }
  it('Escape in a tool goes back to the tools and to the card that opened it', async () => {
    const onClose = vi.fn();
    await mountApp(onClose);
    await focusAndClick(button('Define a target'));
    await settle();
    expect(document.activeElement.textContent).toBe('Define a behavior');  // the tool's heading
    await escape();
    await settle();
    expect(onClose).not.toHaveBeenCalled();                                // was: all of Behavior Lens closed
    expect(document.activeElement.textContent.trim()).toBe('Define a target');   // back where it was
    await escape();
    expect(onClose).toHaveBeenCalledTimes(1);                              // on the tools it closes
  });
  // Already true before this pass (openPanel focuses the new tool's heading); pinned because the
  // return-to-tools rescue must not undo it.
  it('a button that opens another tool leaves focus on that tool', async () => {
    await mountApp(vi.fn());
    await click(button('All tools'));
    await settle();
    await focusAndClick(Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes('Open IEP Meeting Prep')));
    await settle();
    await focusAndClick(byLabel('Open Graph to add phase data'));
    await settle();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.closest('[data-bl-panel-content]')).toBeTruthy();
    expect(document.activeElement.tagName).toMatch(/^H[23]$/);
  });
});

describe('Live Observation', () => {
  it('a recovered draft opens on Start, not on "Discard draft"', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 9, 0, 0));
    M.writeObservationDraft('live', 'a11y-test', { method: 'frequency', timer: 60, frequency: 2, intervals: [], durations: [], latencyMs: null, notes: '' });
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn() });
    await advance(10);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Start observation timer');
  });
  it('stops recording while it asks "Keep draft and close?", and "Continue recording" starts it again', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(byLabel('Start observation timer'));
    await advance(60000);
    await click(button('+1'));
    await click(byLabel('Close Live Observation'));
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(byLabel('Start observation timer')).toBeTruthy();               // paused, as the question says
    await advance(5 * 60000);                                              // the observer reads it, helps a student
    await click(button('Continue recording'));
    expect(byLabel('Pause observation timer')).toBeTruthy();               // running again
    await advance(30000);
    await click(button('Save Session'));
    expect(onSaveSession.mock.calls[0][0].duration).toBe(90);              // was 390
  });
  it('+1 and -1 say what they count, the count is announced, and Start is not a pressed toggle', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialTarget: { id: 'yelled', label: 'Yelled' } });
    expect(byLabel('Start observation timer').hasAttribute('aria-pressed')).toBe(false);   // read "Pause, pressed"
    await click(byLabel('Start observation timer'));
    const add = byLabel('Add one occurrence of Yelled');                   // was "+1"
    await click(add); await click(add);
    expect(document.querySelector('[data-obs-announcement]').textContent).toBe('2 occurrences');
    await click(byLabel('Remove one occurrence of Yelled'));
    expect(document.querySelector('[data-obs-announcement]').textContent).toBe('1 occurrence');
  });
  it('the interval mark is a toggle with a fixed name', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialMethod: 'interval' });
    await click(byLabel('Start observation timer'));
    const mark = () => byLabel('Behavior occurred in this interval');     // was named by its state
    expect(mark().getAttribute('aria-pressed')).toBe('false');
    await click(mark());
    expect(mark().getAttribute('aria-pressed')).toBe('true');
  });
  it('the latency response hands focus back and announces the result', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialMethod: 'latency' });
    await click(byLabel('Start observation timer'));
    await advance(3000);
    await focusAndClick(byLabel('Response started: stop the latency timer'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Pause observation timer');   // was the page
    expect(document.querySelector('[data-obs-announcement]').textContent).toBe('Latency 3.0 seconds');
  });
});

describe('Frequency Counter', () => {
  it('taps are announced, Remove names its counter, and Pause is readable', async () => {
    await mount(M.FrequencyCounter, { onSaveSession: vi.fn() });
    await typeInto(byLabel('New behavior label'), 'Out of seat');
    await click(button('+ Add'));
    expect(byLabel('Start recording').hasAttribute('aria-pressed')).toBe(false);
    await click(byLabel('Start recording'));
    await click(byLabel('Add one to Out of seat'));
    expect(document.querySelector('[data-freq-announcement]').textContent).toBe('Out of seat: 1');
    const remove = byLabel('Remove counter Out of seat');                  // was "Remove Counter" on each
    expect(remove.className.split(' ')).toContain('w-6');                  // 24px; was a 12px icon
    expect(byLabel('Pause recording').className).toContain('text-slate-900');   // was white on amber-500
  });
  it('"Continue recording" after the keep-draft question starts it again', async () => {
    const onSaveSession = vi.fn();
    await mount(M.FrequencyCounter, { onSaveSession });
    await click(byLabel('Start recording'));
    await advance(60000);
    await click(byLabel('Add one to unlabeled behavior'));
    await click(byLabel('Close Frequency Counter'));
    await advance(5 * 60000);
    await click(button('Continue recording'));
    expect(byLabel('Pause recording')).toBeTruthy();
    await advance(60000);
    await click(button('Save'));
    expect(onSaveSession.mock.calls[0][0].duration).toBe(120);             // was 420
  });
});

describe('Interval Grid', () => {
  const intervalSec = () => Number(byLabel('Interval duration in seconds').value);
  it('opens on Start; Start hands focus to Occurred, and Pause to Resume', async () => {
    await mount(M.IntervalGrid, { onSaveSession: vi.fn() });
    await advance(10);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Start recording');   // was Close
    await click(document.activeElement);
    expect(document.activeElement.classList.contains('bl-occurred-btn')).toBe(true);   // was the page
    await advance(4000);
    await focusAndClick(byLabel('Pause'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Resume');
  });
  it('the keep-draft question does not go on scoring intervals', async () => {
    await mount(M.IntervalGrid, { onSaveSession: vi.fn() });
    const sec = intervalSec();
    await click(byLabel('Start recording'));
    await advance(sec * 1000 + 500);
    await click(byLabel('Close'));
    await advance(20 * sec * 1000);
    await click(button('Continue recording'));
    const scored = Array.from(document.querySelectorAll('.bl-interval-cell')).filter(cell => /occurred$/.test(cell.getAttribute('aria-label')));
    expect(scored).toHaveLength(1);                                        // was 21, all "not occurred"
    expect(byLabel('Pause')).toBeTruthy();
  });
  it('momentary "Occurring now" stays reachable, says when to look, and only "Look now" is announced', async () => {
    await mount(M.IntervalGrid, { onSaveSession: vi.fn() });
    const sec = intervalSec();
    await click(byLabel('Momentary'));
    await click(byLabel('Start recording'));
    const occurring = () => document.querySelector('.bl-occurred-btn');
    expect(occurring().disabled).toBe(false);                              // was disabled but for the last 2 s
    expect(occurring().getAttribute('aria-disabled')).toBe('true');
    await click(occurring());
    expect(occurring().getAttribute('aria-pressed')).toBe('false');        // too early: not marked
    const live = document.querySelector('[data-interval-look-live]');
    expect(live.textContent).toMatch(/^Not yet/);
    expect(document.querySelector('[data-interval-look]').getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelectorAll('[role="status"][data-interval-look]')).toHaveLength(0);   // spoke every second
    await advance((sec - 1.5) * 1000);
    expect(live.textContent).toMatch(/^Look now/);
    expect(occurring().hasAttribute('aria-disabled')).toBe(false);
    await advance(3000);                                                   // missed it: the next interval
    expect(live.textContent).toBe('');                                     // not the old "Not yet" again
    await advance((sec - 3.2) * 1000);
    await click(occurring());
    expect(occurring().getAttribute('aria-pressed')).toBe('true');
  });
  it('cells keep their white numbers readable', async () => {
    await mount(M.IntervalGrid, { onSaveSession: vi.fn() });
    const sec = intervalSec();
    await click(byLabel('Start recording'));
    await click(document.querySelector('.bl-occurred-btn'));
    await advance(sec * 1000 + 300);                                       // interval 1: occurred
    await advance(sec * 1000);                                             // interval 2: not occurred
    const cells = Array.from(document.querySelectorAll('.bl-interval-cell')).slice(0, 3);
    expect(cells.map(cell => cell.getAttribute('aria-label').replace(/^Interval \d+ \W+ /, ''))).toEqual(['occurred', 'not occurred', 'current']);
    for (const cell of cells) for (const stop of stops(cell.className)) expect(againstWhite(stop), stop).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Latency Recorder', () => {
  it('names its inputs, passes focus between Present and Response, and announces each trial', async () => {
    await mount(M.LatencyRecorder, { onSaveSession: vi.fn() });
    expect(byLabel('Behavior')).toBeTruthy();                              // was "eg Responding to name"
    expect(byLabel('Goal (seconds)')).toBeTruthy();                        // was "eg 3"
    expect(document.activeElement).toBe(document.body);                    // opening it takes no focus
    await focusAndClick(byLabel('Present Stimulus'));
    expect(document.activeElement.hasAttribute('data-bl-latency-primary')).toBe(true);   // was the page
    expect(document.activeElement.textContent).toMatch(/Response/);
    await advance(2000);
    await click(document.activeElement);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Present Stimulus');
    expect(document.body.textContent).toContain('Trial 1: 2.0 seconds');
    await focusAndClick(byLabel('Present Stimulus'));
    await focusAndClick(byLabel('No Response'));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Present Stimulus');
    expect(document.body.textContent).toContain('Trial 2: no response');
  });
});

describe('student boards', () => {
  it('every choice colour keeps its white label readable', () => {
    const list = src.match(/const gradients = \[([^\]]*)\]/)[1];
    const all = stops(list);
    expect(all).toHaveLength(12);
    for (const stop of all) expect(againstWhite(stop), stop).toBeGreaterThanOrEqual(4.5);
  });
  it('First-Then: both panels keep white text readable, and the lock message is solid white', async () => {
    await mount(M.ChoiceBoard, {});
    await click(byLabel('Show first-then board'));
    const first = Array.from(document.querySelectorAll('button')).find(node => /FIRST/.test(node.textContent));
    for (const stop of stops(first.className)) expect(againstWhite(stop), stop).toBeGreaterThanOrEqual(4.5);
    expect(document.body.innerHTML).not.toContain('text-white/30');
    await click(first);
    const done = Array.from(document.querySelectorAll('button')).find(node => /FIRST/.test(node.textContent));
    for (const stop of stops(done.className)) expect(againstWhite(stop), stop).toBeGreaterThanOrEqual(4.5);
    const then = Array.from(document.querySelectorAll('div')).find(node => /^THEN/.test(node.textContent) && /rounded-3xl/.test(node.className));
    for (const stop of stops(then.className)) expect(againstWhite(stop), stop).toBeGreaterThanOrEqual(4.5);
  });
  it('token slots say whether they are earned, and an empty one has a visible border', async () => {
    await mount(M.TokenBoard, { studentKey: 'a11y-test' });
    const slots = () => Array.from(document.querySelectorAll('button[aria-label^="Token "]'));
    expect(slots().length).toBeGreaterThan(0);
    const total = slots().length;
    expect(slots()[0].getAttribute('aria-label')).toBe('Token 1 of ' + total + ': not yet earned');   // was "○"
    expect(slots()[0].className).toMatch(/\bborder-4\b/);                  // border-3 is not a class: no border
    expect(slots()[0].className).not.toMatch(/opacity-40/);
    await click(slots()[0]);
    expect(slots()[0].getAttribute('aria-label')).toBe('Token 1 of ' + total + ': earned');
  });
});

describe('focus after a dialog whose opener is gone', () => {
  it('a confirmation returns focus to "Add observation"', async () => {
    document.body.innerHTML = '<div class="bl-root"><div data-bl-panel-content><button data-bl-add-observation>Add observation</button><button id="asker">Delete</button></div></div>';
    document.getElementById('asker').focus();
    const answer = M.askBehaviorLensConfirmation('Delete this entry?', { title: 'Delete entry' });
    document.getElementById('asker').remove();                             // the list re-rendered
    button('Cancel').click();
    await answer;
    expect(document.activeElement.hasAttribute('data-bl-add-observation')).toBe(true);   // was the page (a swallowed ReferenceError)
  });
  it('the ABC form does too', async () => {
    document.body.innerHTML = '<div class="bl-root"><div data-bl-panel-content><button data-bl-add-observation>Add observation</button><button id="opener">Edit</button><div id="mount"></div></div></div>';
    document.getElementById('opener').focus();
    root = createRoot(document.getElementById('mount'));
    await act(async () => root.render(React.createElement(M.ABCModal, { entry: null, onSave: vi.fn(), onClose: vi.fn(), callGemini: null, targetBehaviors: [], t: () => undefined, addToast: () => {} })));
    document.getElementById('opener').remove();
    await act(async () => root.unmount());
    root = null;
    expect(document.activeElement.hasAttribute('data-bl-add-observation')).toBe(true);
  });
});

describe('text on the recording screens and boards', () => {
  it.each(['frequency', 'interval', 'duration', 'latency'])('Live Observation (%s) is readable', async method => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialMethod: method, initialTarget: { id: 'yelled', label: 'Yelled' } });
    await click(byLabel('Start observation timer'));
    await advance(20000);
    if (method === 'latency') await click(byLabel('Response started: stop the latency timer'));
    if (method === 'frequency') await click(byLabel('Add one occurrence of Yelled'));
    if (method === 'duration') {
      await click(byLabel('Start behavior episode'));
      await advance(5000);
      await click(byLabel('End behavior episode'));
      expect(document.body.textContent).toContain('1 episodes');
    }
    expect(unreadable(document.querySelector('[role="dialog"]'))).toEqual([]);   // slate-600 on slate-900 was 2.4:1
  });
  it('Frequency Counter and Interval Grid are readable while recording', async () => {
    await mount(M.FrequencyCounter, { onSaveSession: vi.fn() });
    await click(byLabel('Start recording'));
    await click(byLabel('Add one to unlabeled behavior'));
    expect(unreadable(document.querySelector('[role="dialog"]'))).toEqual([]);
    await act(async () => root.unmount());
    await mount(M.IntervalGrid, { onSaveSession: vi.fn() });
    await click(byLabel('Start recording'));
    await advance(30000);
    expect(unreadable(document.querySelector('[role="dialog"]'))).toEqual([]);
  });
  it('the Latency Recorder results are readable', async () => {
    await mount(M.LatencyRecorder, { onSaveSession: vi.fn() });
    for (const ms of [2000, 3000]) {
      await click(byLabel('Present Stimulus'));
      await advance(ms);
      await click(document.querySelector('[data-bl-latency-primary]'));
    }
    expect(unreadable(document.getElementById('mount'))).toEqual([]);     // Range and SD were emerald-600 and amber-600
  });
  it('the token board and First-Then board are readable', async () => {
    await mount(M.TokenBoard, { studentKey: 'a11y-test' });
    await typeInto(byLabel('Reward description'), 'Five minutes of Lego');
    expect(document.body.textContent).toContain('Five minutes of Lego');
    expect(unreadable(document.getElementById('mount'))).toEqual([]);     // count, name and reward were 3.0 to 4.3:1
    await click(Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes('Fixed Ratio (FR)')));
    expect(document.body.textContent).toContain('Schedule Thinning Guide');
    expect(unreadable(document.getElementById('mount'))).toEqual([]);     // the thinning link was rose-500
    await act(async () => root.unmount());
    await mount(M.ChoiceBoard, {});
    await click(byLabel('Show first-then board'));
    expect(unreadable(document.getElementById('mount'))).toEqual([]);
    await click(byLabel('Edit choice board'));
    expect(document.body.textContent).toContain('First-Then Board');
    expect(unreadable(document.getElementById('mount'))).toEqual([]);     // its heading was slate-300 on white
  });
});

describe('the ABC form', () => {
  it('marks the three required fields and says which are missing before Save works', async () => {
    // Pass 9: Save stayed disabled until all three were filled, with nothing saying which.
    await mount(M.ABCModal, { entry: null, onSave: vi.fn(), onClose: vi.fn(), callGemini: null, targetBehaviors: [] });
    const missing = () => document.querySelector('[data-bl-abc-missing]');
    const save = () => button('Save Entry');
    expect(missing().textContent).toBe('To save, fill in: Before, Behavior, After');
    expect(save().disabled).toBe(true);
    expect(save().getAttribute('aria-describedby')).toBe(missing().id);
    const narratives = ['Antecedent', 'Behavior', 'Consequence'].map(label => byLabel(label + ' narrative'));
    expect(narratives.map(input => input.getAttribute('aria-required'))).toEqual(['true', 'true', 'true']);
    expect(Array.from(document.querySelectorAll('legend')).filter(legend => legend.textContent.includes('(required)'))).toHaveLength(3);
    await typeInto(narratives[0], 'Math worksheet');
    expect(missing().textContent).toBe('To save, fill in: Behavior, After');
    await typeInto(narratives[1], 'Yelled');
    await typeInto(narratives[2], 'Break');
    expect(missing()).toBeNull();
    expect(save().disabled).toBe(false);
    expect(save().hasAttribute('aria-describedby')).toBe(false);
  });
});

// Pass 9, phone widths. Measured in Chromium at 360-414 px with touch rules on (jsdom has no
// layout): the Live Observation duration and latency buttons sat under a fixed notes bar while
// recording; the Frequency Counter opened scrolled past its header, and with three counters its
// Start/Pause and timer were below the screen. These pin the structure that fixed them.
describe('on a phone', () => {
  it('Live Observation keeps its notes in the scrolling area and its round buttons full size', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialMethod: 'duration' });
    const scroller = byLabel('Session notes').closest('.overflow-y-auto');
    expect(scroller).toBeTruthy();
    expect(scroller.getAttribute('role')).not.toBe('dialog');             // was a fixed bar on the dialog
    expect(byLabel('Start observation timer').className.split(' ')).toContain('shrink-0');
    await click(byLabel('Start observation timer'));
    expect(byLabel('Start behavior episode').className.split(' ')).toContain('shrink-0');
  });
  it('the Frequency Counter keeps Start/Pause and the timer in a bar at the bottom, and opens without scrolling', async () => {
    const focusCalls = [];
    const realFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options) { focusCalls.push(options); return realFocus.call(this, options); };
    try {
      await mount(M.FrequencyCounter, { onSaveSession: vi.fn() });
      await advance(10);
    } finally { HTMLElement.prototype.focus = realFocus; }
    expect(focusCalls.some(options => options && options.preventScroll === true)).toBe(true);
    const bar = byLabel('Start recording').closest('.sticky');
    expect(bar.className).toContain('bottom-0');
    expect(bar.textContent).toContain('Elapsed');
    expect(byLabel('Close Frequency Counter').closest('.sticky').className).toContain('top-0');
  });
  it('the target definition folds away, and the latency chart scrolls instead of shrinking its text', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), initialTarget: { id: 'yelled', label: 'Yelled', operationalDefinition: 'Shouts above classroom voice.' } });
    const details = document.querySelector('[data-bl-recording-target] details');
    expect(details.textContent).toContain('Shouts above classroom voice.');
    expect(details.querySelector('summary').textContent).toBe('Definition');
    await act(async () => root.unmount());
    await mount(M.LatencyRecorder, { onSaveSession: vi.fn() });
    await click(byLabel('Present Stimulus'));
    await advance(1500);
    await click(document.querySelector('[data-bl-latency-primary]'));
    const svg = document.querySelector('svg[aria-label^="Latency across"]');
    expect(svg.parentElement.className).toContain('overflow-x-auto');
    expect(svg.style.minWidth).toBe('440px');
    expect([...svg.querySelectorAll('text')].every(text => Number(text.getAttribute('font-size')) >= 11)).toBe(true);   // was 7
  });
});

describe('the stylesheet', () => {
  it('darkens slate-600 text instead of lightening it', () => {
    const rules = [...src.matchAll(/\.bl-root \.text-slate-600 \{ color: (#[0-9a-f]{6})/g)].map(m => m[1]);
    expect(rules).toEqual(['#475569']);                                    // was #64748b, then a broken selector
    expect(src).not.toMatch(/^\s*\.bl-root\s*$/m);
  });
});
