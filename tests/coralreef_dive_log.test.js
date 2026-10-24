import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Mounting the explore page and driving a dive takes several seconds on a busy machine.
vi.setConfig({ testTimeout: 60000 });

// Lane H3: diving gently. The calm-diving reading beside the dive controls, the
// first-brush cue (announced once per dive), the end-of-dive log (time, deepest
// point, species identified with their pictures, reef touches, calm time, a badge
// or a kind nudge) and its saved copy, all driven against a stub engine that
// reports snap.buoyancy the way Reef3DExplore does.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const TIP = 'Hover, don\'t touch. Coral is a thin layer of living animals over a stony skeleton, and a fin kick can break it.';
const NEAR = [
  { uid: 'o1', speciesId: 'clownfish', distanceM: 2, inView: true, bearingDeg: 0, riseM: 0.2 },
  { uid: 'o2', speciesId: 'brain_coral', distanceM: 3, inView: true, bearingDeg: 40, riseM: -1 }
];
const B0 = { reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 0, maxDepthM: 6.5, state: 'swim', lastReef: null };
const mounted = [];
let engines, X, TX, withBuoyancy;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; withBuoyancy = true;
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      let state = { ready: true, paused: false, view: 'third', light: false, diver: { depthM: 7, headingDeg: 90 }, focused: null, nearby: NEAR.map((n) => ({ ...n })) };
      if (withBuoyancy) state.buoyancy = { ...B0 };
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), setLight: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        buoy(patch) { controller.emit({ buoyancy: { ...state.buoyancy, ...patch } }); },
        // The real dive reports its newest numbers to getState at once; onState may lag by 200 ms.
        quiet(patch) { state = { ...state, buoyancy: { ...state.buoyancy, ...patch } }; },
        focus: vi.fn((uid) => { const found = state.nearby.find((n) => n.uid === uid); if (found) controller.emit({ focused: found }); }),
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })), setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
});

afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m), ...extra });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const buttons = (el, label) => [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); }); }
async function startDive(t) { await click(buttons(t.host, 'Start the dive')[0]); return engines[engines.length - 1]; }
const meter = (t) => t.host.querySelector('.cr-dive-controls .crh-meter');
const logCard = (t) => t.host.querySelector('[data-dive-log]');
const stats = (card) => Object.fromEntries([...card.querySelectorAll('.crh-stats li')].map((li) => [li.querySelector('span').textContent, li.querySelector('strong').textContent]));
const touchAnnouncements = (t) => t.announcements.filter((m) => /^You brushed/.test(m));
async function identifyClownfish(t, engine) {
  await act(async () => engine.focus('o1'));
  const choices = t.host.querySelector('[role="group"][aria-label="Identify it"]');
  await click(buttons(choices, TX.clownfish.name)[0]);
}

describe('calm-diving reading beside the dive controls', () => {
  it('names the state in words with its own icon shape, and counts reef touches and calm time', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    let m = meter(t);
    expect(m, 'a reading in the controls bar').toBeTruthy();
    expect(m.getAttribute('data-buoyancy')).toBe('swim');
    expect(m.textContent).toContain('Swimming');
    expect(m.textContent).toContain('Reef touches: 0. Calm hovering: 0 s.');
    expect(m.getAttribute('role'), 'not a live region: it changes every few seconds').toBeNull();
    expect(m.getAttribute('aria-live')).toBeNull();
    const shapes = {};
    for (const [state, words] of [['calm', 'Hovering calmly'], ['close', 'Close to the reef. Rise a little.'], ['touch', 'You brushed the reef'], ['swim', 'Swimming']]) {
      await act(async () => engine.buoy({ state, calmS: 75.4, reefContacts: 2 }));
      m = meter(t);
      expect(m.getAttribute('data-buoyancy')).toBe(state);
      expect(m.querySelector('strong').textContent).toBe(words);
      expect(m.textContent).toContain('Reef touches: 2. Calm hovering: 1 min 15 s.');
      const svg = m.querySelector('svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      shapes[state] = svg.querySelector('path').getAttribute('d');
    }
    expect(new Set(Object.values(shapes)).size, 'every state has its own icon shape, not only a colour').toBe(4);
    // An unknown state reads as plain swimming.
    await act(async () => engine.buoy({ state: 'weird' }));
    expect(meter(t).getAttribute('data-buoyancy')).toBe('swim');
  });

  it('stays away when the dive does not report contacts', async () => {
    withBuoyancy = false;
    const t = await mountTool();
    await startDive(t);
    expect(t.host.querySelector('.crh-meter')).toBeNull();
    await click(buttons(t.host, 'End the dive')[0]);
    expect(logCard(t), 'no numbers, no log').toBeNull();
    expect(t.data.coralReef.lastDive).toBeUndefined();
    expect(buttons(t.host, 'Start the dive')).toHaveLength(1);
  });
});

describe('first brush of a dive', () => {
  it('shows the cue built from the dive tip and announces it once, not on every contact', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    expect(t.host.querySelector('[data-touch-tip]')).toBeNull();
    await act(async () => engine.buoy({ reefContacts: 1, lastReef: 'coral', state: 'touch' }));
    const tip = t.host.querySelector('[data-touch-tip]');
    expect(tip, 'the cue appears with the first brush').toBeTruthy();
    expect(tip.getAttribute('data-touch-tip')).toBe('coral');
    expect(tip.textContent).toContain('You brushed a coral. Rise a little and hover.');
    expect(tip.textContent).toContain(TIP);
    expect(touchAnnouncements(t)).toEqual(['You brushed a coral. Rise a little and hover. ' + TIP]);
    for (let n = 2; n <= 4; n++) await act(async () => engine.buoy({ reefContacts: n, state: n % 2 ? 'touch' : 'swim' }));
    expect(touchAnnouncements(t), 'once per dive').toHaveLength(1);
    await click(buttons(t.host.querySelector('[data-touch-tip]'), 'Hide this tip')[0]);
    expect(t.host.querySelector('[data-touch-tip]')).toBeNull();
    await act(async () => engine.buoy({ reefContacts: 5 }));
    expect(t.host.querySelector('[data-touch-tip]'), 'hidden stays hidden').toBeNull();
    expect(touchAnnouncements(t)).toHaveLength(1);
  });

  it('names a reef animal when the first brush was not a coral, and a new dive can cue again', async () => {
    const t = await mountTool();
    const first = await startDive(t);
    await act(async () => first.buoy({ reefContacts: 1, lastReef: 'life', state: 'touch' }));
    expect(t.host.querySelector('[data-touch-tip]').textContent).toContain('You brushed a reef animal. Rise a little and hover.');
    expect(touchAnnouncements(t)).toEqual(['You brushed a reef animal. Rise a little and hover. ' + TIP]);
    // A new site is a new dive: a fresh engine with fresh counters.
    await click(t.host.querySelector('button[data-site="heatwave"]'));
    expect(engines).toHaveLength(2);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(t.host.querySelector('[data-touch-tip]'), 'the cue belongs to the dive it came from').toBeNull();
    expect(meter(t).textContent).toContain('Reef touches: 0.');
    await act(async () => engines[1].buoy({ reefContacts: 1, lastReef: 'coral', state: 'touch' }));
    expect(touchAnnouncements(t)).toHaveLength(2);
    expect(touchAnnouncements(t)[1]).toBe('You brushed a coral. Rise a little and hover. ' + TIP);
  });
});

describe('dive log', () => {
  it('ends the dive with its numbers, the species identified with their pictures, and the perfect-buoyancy badge', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await identifyClownfish(t, engine);
    expect(t.data.coralReef.speciesLog.clownfish).toBeTruthy();
    // getState carries numbers newer than the last onState report.
    engine.quiet({ diveS: 245.4, maxDepthM: 9.4, calmS: 61.2, reefContacts: 0, sandContacts: 0 });
    const end = buttons(t.host, 'End the dive')[0];
    expect(end.closest('.cr-dive-controls'), 'with the dive controls').toBeTruthy();
    await click(end);
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(t.host.querySelector('canvas'), 'the dive is over').toBeNull();
    const card = logCard(t);
    expect(card).toBeTruthy();
    expect(card.getAttribute('data-dive-log')).toBe('this');
    expect(card.querySelector('h3').textContent).toBe('Dive log');
    expect(document.activeElement, 'focus moves to the log').toBe(card.querySelector('h3'));
    expect(card.textContent).toContain('A healthy reef');
    expect(stats(card)).toEqual({ 'Time underwater': '4 min 5 s', 'Deepest point': '9 m', 'Species identified': '1', 'Reef touches': '0', 'Calm hovering': '1 min 1 s' });
    const badge = card.querySelector('[data-badge="perfect-buoyancy"]');
    expect(badge, 'zero touches earn the badge').toBeTruthy();
    expect(badge.textContent).toContain('Perfect buoyancy');
    expect(card.querySelector('[data-nudge]')).toBeNull();
    const tile = card.querySelector('[data-dive-species="clownfish"]');
    expect(tile, 'the species log picture of what was identified').toBeTruthy();
    expect(tile.querySelector('img').getAttribute('src')).toMatch(/assets\/coralreef\/species\/clownfish\.webp$/);
    expect(tile.textContent).toContain(TX.clownfish.name.replace(/\s*\([^)]*\)\s*$/, ''));
    expect(card.querySelector('.crf-tiles').getAttribute('aria-label')).toBe('Species identified on this dive');
    // Saved for the hub and the next visit.
    const saved = t.data.coralReef.lastDive;
    expect(saved).toMatchObject({ site: 'healthy', timeS: 245, maxDepthM: 9.4, species: ['clownfish'], reefContacts: 0, sandContacts: 0, calmS: 61 });
    expect(typeof saved.at).toBe('number');
    // Dive again starts a fresh dive at the same site and puts the log away.
    await click(buttons(card, 'Dive again')[0]);
    expect(engines).toHaveLength(2);
    expect(logCard(t)).toBeNull();
  });

  it('gives a kind nudge instead of the badge, in words for one touch and for several', async () => {
    for (const [n, words] of [[1, 'You brushed the reef once.'], [3, 'You brushed the reef 3 times.']]) {
      const t = await mountTool();
      const engine = await startDive(t);
      engine.quiet({ diveS: 40, maxDepthM: 7.2, reefContacts: n, sandContacts: 2, calmS: 4 });
      await click(buttons(t.host, 'End the dive')[0]);
      const card = logCard(t);
      expect(card.querySelector('[data-badge]')).toBeNull();
      const nudge = card.querySelector('[data-nudge]');
      expect(nudge.textContent.startsWith(words)).toBe(true);
      expect(nudge.textContent).toContain('look behind you before you turn or back up');
      expect(stats(card)['Reef touches']).toBe(String(n));
      expect(stats(card)['Species identified']).toBe('0');
      expect(card.textContent).toContain('No new species this time.');
      expect(card.textContent).toContain('Your fins stirred up the sand too.');
      expect(t.data.coralReef.lastDive.reefContacts).toBe(n);
    }
  });

  it('keeps the badge for a real dive: a few seconds without a touch get a gentle note instead', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    engine.quiet({ diveS: 12, maxDepthM: 7, reefContacts: 0, calmS: 3 });
    await click(buttons(t.host, 'End the dive')[0]);
    const card = logCard(t);
    expect(card.querySelector('[data-badge]')).toBeNull();
    expect(card.querySelector('[data-nudge]')).toBeNull();
    expect(card.querySelector('[data-short]').textContent).toBe('No reef touches. Stay down a little longer next time and practice hovering close to the reef.');
    expect(stats(card)['Time underwater']).toBe('12 s');
  });

  it('logs the dive the student leaves for another site, and only the species found on it', async () => {
    const t = await mountTool();
    const first = await startDive(t);
    await identifyClownfish(t, first);
    first.quiet({ diveS: 95, maxDepthM: 8.1, reefContacts: 2, calmS: 30 });
    await click(t.host.querySelector('button[data-site="damaged"]'));
    expect(engines).toHaveLength(2);
    let card = logCard(t);
    expect(card, 'the dive just left').toBeTruthy();
    expect(card.textContent).toContain('A healthy reef');
    expect(stats(card)['Reef touches']).toBe('2');
    expect(card.querySelector('[data-dive-species="clownfish"] img'), 'no second 3D renderer while diving: the shipped picture').toBeTruthy();
    expect(buttons(card, 'Dive again'), 'already diving').toHaveLength(0);
    expect(document.activeElement, 'a site change keeps focus where the student is').not.toBe(card.querySelector('h3'));
    // The second dive starts with no species of its own.
    engines[1].quiet({ diveS: 30, maxDepthM: 6, reefContacts: 0, calmS: 12 });
    await click(buttons(t.host, 'End the dive')[0]);
    card = logCard(t);
    expect(card.textContent).toContain('A damaged reef');
    expect(stats(card)['Species identified']).toBe('0');
    expect(card.querySelector('[data-badge]')).toBeTruthy();
    expect(t.data.coralReef.lastDive).toMatchObject({ site: 'damaged', species: [], reefContacts: 0 });
  });

  it('skips a quick look on the way to another site', async () => {
    const t = await mountTool();
    const first = await startDive(t);
    first.quiet({ diveS: 6, maxDepthM: 6.5 });
    await click(t.host.querySelector('button[data-site="heatwave"]'));
    expect(logCard(t)).toBeNull();
    expect(t.data.coralReef.lastDive).toBeUndefined();
  });

  it('saves the dive when the student leaves for another section, and shows it as the last dive on return', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    engine.quiet({ diveS: 130, maxDepthM: 10.2, reefContacts: 1, calmS: 50 });
    await click(buttons(t.host, 'Open the species guide')[0]);
    expect(t.data.coralReef.section).toBe('guide');
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(t.data.coralReef.lastDive).toMatchObject({ site: 'healthy', timeS: 130, maxDepthM: 10.2, reefContacts: 1 });
    // Back to the dive page: the last dive is there before a new one starts.
    await act(async () => { t.root.render(React.createElement(() => null)); });
    const again = await mountTool({ lastDive: t.data.coralReef.lastDive });
    const card = logCard(again);
    expect(card.getAttribute('data-dive-log')).toBe('past');
    expect(card.querySelector('h3').textContent).toBe('Your last dive');
    expect(stats(card)).toMatchObject({ 'Time underwater': '2 min 10 s', 'Deepest point': '10 m', 'Reef touches': '1' });
    expect(buttons(card, 'Dive again'), 'the page already has Start the dive').toHaveLength(0);
    expect(document.activeElement).not.toBe(card.querySelector('h3'));
  });

  it('the log can be put away, and a saved log with odd data still renders', async () => {
    const t = await mountTool({ lastDive: { site: 'heatwave', timeS: 'x', maxDepthM: null, species: 'nope', reefContacts: 0 } });
    let card = logCard(t);
    expect(stats(card)).toEqual({ 'Time underwater': '0 s', 'Deepest point': '0 m', 'Species identified': '0', 'Reef touches': '0', 'Calm hovering': '0 s' });
    const engine = await startDive(t);
    expect(logCard(t), 'the page is a dive now').toBeNull();
    engine.quiet({ diveS: 20, maxDepthM: 7 });
    await click(buttons(t.host, 'End the dive')[0]);
    card = logCard(t);
    await click(buttons(card, 'Hide the dive log')[0]);
    expect(logCard(t), 'put away, and the saved copy does not pop back').toBeNull();
    expect(t.data.coralReef.lastDive.timeS).toBe(20);
  });
});

describe('looks and access', () => {
  it.each(['light', 'dark', 'contrast'])('%s: the reading, the cue and the log are axe-clean and use the theme palette', async (theme) => {
    const t = await mountTool({}, { theme });
    const engine = await startDive(t);
    await act(async () => engine.buoy({ reefContacts: 1, lastReef: 'coral', state: 'close', calmS: 12 }));
    const P = X.palette(theme);
    const m = meter(t);
    expect(m.style.borderColor || '').not.toBe('');
    let result = await runIsolatedAxe(t.host.innerHTML);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
    engine.quiet({ diveS: 50, maxDepthM: 8, reefContacts: 0, calmS: 20 });
    await click(buttons(t.host, 'End the dive')[0]);
    const card = logCard(t);
    const badge = card.querySelector('[data-badge]');
    const toRgb = (hex) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
    expect(badge.style.borderColor).toBe(toRgb(P.good));
    result = await runIsolatedAxe(t.host.innerHTML);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
    for (const b of card.querySelectorAll('button')) expect(b.getAttribute('type')).toBe('button');
  }, 60000);

  it('server-renders the explore page with a saved dive and without errors', () => {
    const html = renderTool('coralReef', { coralReef: { section: 'explore', lastDive: { site: 'restoration', timeS: 75, maxDepthM: 6.6, species: ['green_turtle'], reefContacts: 0, calmS: 40 } } });
    expect(html).toContain('Your last dive');
    expect(html).toContain('Perfect buoyancy');
    expect(html).toContain('1 min 15 s');
    expect(html).not.toContain('End the dive');
  });
});
