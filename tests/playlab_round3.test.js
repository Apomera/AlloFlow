// Play Lab round 3 (2026-11-23): notes true to the model, Mystery defense, the coach prompt,
// and field labels that stay off the players.
//
// Before this round:
//  - the play, defense and scenario notes quoted real-game numbers the model cannot produce
//    ("~80% conversion", "10% chance", "Tom Brady's favorite concept for 20 years") and said
//    things the model does not do (Trips "Cover 2 has no answer": the model covers all three
//    bunch routes; the Hail Mary story was thrown from the 30, where the routes ended 25 yards
//    short of the end zone). The print sheet repeated them.
//  - the football coach prompt sent the open-receiver analysis and the matchup grade (with the
//    receiver's name) before the student had run the play, and asked the coach to name him.
//  - on a 390 px phone the zone names sat on the defenders and on each other.
// PLAYLAB_FILE=<path> points the suite at another copy (start_r3.js turns it red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.PLAYLAB_FILE || 'stem_lab/stem_tool_playlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
    documentElement: { classList: { contains: () => false } },
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {}, localStorage: { getItem: () => null, setItem() {} } });
  vm.runInContext(source, ctx, { filename: 'stem_tool_playlab.js' });
  return win.StemLab && win.StemLab.PlayLabModel;
}
const M = loadModel();
const S = M.soccer();
const P = (id) => M.plays.find((p) => p.id === id);
const sim = (playId, coverageId, extra) => M.simulate(Object.assign({ playId, coverageId }, extra || {}));
const read = (s, id) => s.reads.find((r) => r.id === id);

// Real people and teams the old notes named. The main text must stay model-only; the names
// may appear only in the labelled "In real ..." asides.
const NAMES = ['Brady', 'Martz', 'Gibbs', 'Mumme', 'Saban', 'Mathieu', 'Peterson', 'Guardiola', 'Pep', 'Klopp', 'Mourinho',
  'Pirlo', 'Delap', 'Conte', 'Tuchel', 'Sacchi', 'Salah', 'Mané', 'Firmino', 'Ronnie Brown', 'Shanahan', 'McVay', 'Patriots',
  'Dolphins', 'Barcelona', 'Liverpool', 'Manchester', 'Burnley', 'Stoke', 'Arteta', 'Brighton', 'Bielsa', 'Inter', 'Tottenham'];

describe('notes in model-true words', () => {
  const groups = () => ({
    plays: M.plays, coverages: M.coverages, formations: S.formations, concepts: S.concepts, shapes: S.shapes, scenarios: M.scenarios,
  });

  it('every play, defense, formation, move, shape and story has a main note and a separate real-game aside', () => {
    const g = groups();
    expect(g.plays.length).toBe(16);
    expect(g.coverages.length).toBe(8);
    expect(g.scenarios.length).toBe(12);
    for (const [name, list] of Object.entries(g)) {
      for (const item of list) {
        expect(typeof item.teach, name + ' ' + item.id).toBe('string');
        expect(typeof item.real, name + ' ' + item.id + ' real').toBe('string');
        expect(item.teach.length).toBeGreaterThan(30);
        expect(item.real.length).toBeGreaterThan(20);
        expect(item.real).not.toBe(item.teach);
      }
    }
  });

  it('the main notes name no real people or teams and quote no real-game percentages', () => {
    for (const list of Object.values(groups())) {
      for (const item of list) {
        const main = [item.teach].concat(item.questions || []).join(' ');
        for (const n of NAMES) expect(main, item.id + ' names ' + n).not.toMatch(new RegExp('\\b' + n + '\\b'));
        // The only percent sign in a main note is the model's own mirror factor.
        expect(main.replace('{mirror}%', ''), item.id).not.toMatch(/%|percent|conversion rate|completion rate/i);
      }
    }
  });

  it('every {placeholder} is filled from the model', () => {
    for (const list of Object.values(groups())) {
      for (const item of list) {
        for (const t of [item.teach, item.real].concat(item.questions || [])) {
          const out = M.note(t);
          expect(out, item.id).not.toMatch(/[{}]/);
        }
      }
    }
    expect(M.note('{pocket0} / {pocket} / {snap} / {mirror}% / {pen}')).toBe(
      M.constants.POCKET.cover0.toFixed(1) + ' / ' + M.constants.POCKET.zone.toFixed(1) + ' / ' + M.constants.SNAP_TO_THROW.toFixed(1)
      + ' / ' + Math.round(M.constants.MIRROR * 100) + '% / ' + Math.round(S.constants.PENALTY_XG * 100));
  });

  it('the timing words in the play notes are what the model computes', () => {
    const hm = sim('hailmary', 'cover4');
    const w1 = read(hm, 'WR1');
    expect(w1.routeT).toBeGreaterThan(5.5); expect(w1.routeT).toBeLessThan(5.75);   // "about 5.6 seconds"
    expect(w1.release).toBeGreaterThan(2.9); expect(w1.release).toBeLessThan(3.1);  // "thrown at about 3 seconds"
    expect(w1.flight).toBeGreaterThan(2.5);                                          // "in the air for more than 2.5 seconds"
    const st = read(sim('stick', 'cover3'), 'TE');
    expect(st.release).toBe(M.constants.SNAP_TO_THROW);
    expect(st.catchT - st.release).toBeGreaterThan(0.45); expect(st.catchT - st.release).toBeLessThan(0.65); // "about half a second later"
    expect(read(sim('slant', 'cover1'), 'SLOT').release).toBe(M.constants.SNAP_TO_THROW);
    const fv = sim('fourverts', 'cover3');
    for (const id of ['WR1', 'WR2', 'SLOT', 'TE']) { expect(read(fv, id).routeT).toBeGreaterThan(2.5); expect(read(fv, id).routeT).toBeLessThan(3); } // "almost 3 seconds"
    const wh = read(sim('wheel', 'cover3'), 'RB');
    expect(wh.release).toBeGreaterThan(2.4); expect(wh.release).toBeLessThan(2.6);   // "about 2.5 seconds"
    const yc = read(sim('ycross', 'cover3'), 'TE');
    expect(yc.release).toBeGreaterThan(1.9); expect(yc.release).toBeLessThan(2.1);   // "about 2 seconds"
    const bb = read(sim('bubble', 'cover3'), 'SLOT');
    expect(bb.yards).toBe(1);                                                         // "about 1 yard past the line"
  });

  it('the defense notes count the defenders the model places', () => {
    const count = (cid) => {
      const s = sim('slant', cid);
      const modes = s.defenders.map((d) => ({ d, mode: s.defenders && M.presnap ? null : null }));
      void modes;
      const rush = s.defenders.filter((d) => d.role === 'DL' || d.mode === 'rush').length;
      const man = s.defenders.filter((d) => d.assign).length;
      const back = s.defenders.filter((d) => d.role !== 'DL' && d.mode !== 'rush');
      const deep = back.filter((d) => d.x - s.losX >= 15).length;
      return { rush, man, deep, short: back.length - man - deep - (cid === 'robber' ? 1 : 0) };
    };
    expect(count('cover1')).toMatchObject({ rush: 4, man: 5, deep: 1 });
    expect(count('robber')).toMatchObject({ rush: 4, man: 5, deep: 1 });
    expect(count('cover0')).toMatchObject({ rush: 6, man: 5, deep: 0 });
    expect(count('cover2')).toMatchObject({ rush: 4, man: 0, deep: 2, short: 5 });
    expect(count('cover3')).toMatchObject({ rush: 4, man: 0, deep: 3, short: 4 });
    expect(count('tampa2')).toMatchObject({ rush: 4, man: 0, deep: 3, short: 4 });
    expect(count('cover4')).toMatchObject({ rush: 4, man: 0, deep: 4, short: 3 });
    expect(count('cover6')).toMatchObject({ rush: 4, man: 0, deep: 3, short: 4 });
    const rob = sim('slant', 'robber').defenders.find((d) => d.id === 'ROB');
    expect(rob.x - 35).toBe(11);                                                      // "about 11 yards back"
  });

  it('the stories are set where they say, and the Hail Mary routes now reach the goal line', () => {
    const sc = (id) => M.scenarios.find((s) => s.id === id);
    const yardLine = (losX) => losX - 10;          // yards from your own goal line
    expect(yardLine(sc('patriots-2828').losX)).toBe(15);
    expect(yardLine(sc('greatest-show').losX)).toBe(40);
    expect(yardLine(sc('bradys-drive').losX)).toBe(20);
    expect(110 - sc('trips-bunch-rz').losX).toBe(18);
    expect(110 - sc('wildcat-special').losX).toBe(5);
    const hm = sc('hail-mary');
    expect(110 - hm.losX).toBe(45);                // "from their 45-yard line"
    const s = sim('hailmary', 'cover4', { losX: hm.losX });
    expect(read(s, 'WR1').spot.x).toBe(110);       // "all the way to the goal line"
    // The Trips story no longer promises a bunch winner: against Cover 2 the model covers all three.
    const t = sim('trips', 'cover2', { losX: sc('trips-bunch-rz').losX });
    expect(['WR1', 'SLOT', 'TE'].every((id) => !read(t, id).open)).toBe(true);
    expect(sc('trips-bunch-rz').teach).not.toMatch(/no answer|always/i);
  });

  it('soccer notes match the soccer model', () => {
    const line = (shape) => 105 - S.offsideLine(S.defense('shape', shape));
    expect(Math.round(line('highpress'))).toBe(33);   // Klopp counter story
    expect(Math.round(line('lowblock'))).toBe(16);    // Pep tiki-taka story
    const lb = S.defense('shape', 'lowblock').filter((d) => d.role === 'DEF').map((d) => d.y);
    expect(Math.round(Math.max(...lb) - Math.min(...lb))).toBe(27); // "only 27 m wide"
    const fk = S.defense('fk-direct').filter((d) => /^dW/.test(d.id));
    expect(fk.length).toBe(4);
    expect(Math.abs(fk[0].x - 83 - 9.15)).toBeLessThan(0.1); // wall 9.15 m from the ball (at x = 83)
    expect(S.concepts.find((c) => c.id === 'gegenpress').real).toMatch(/does not model/);
    expect(S.formations.find((f) => f.id === '352').real).not.toMatch(/Sacchi/);
  });
});

// ── Mounted tool ──
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
let mounted = [];
let texts = [];
const fakeCtx2d = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k]
    : k === 'fillText' ? (t) => { texts.push(String(t)); }
    : k === 'measureText' ? (t) => ({ width: String(t).length * 7 })
    : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => {}),
  set: (o, k, v) => { o[k] = v; return true; }
});
function setup(opts) {
  opts = opts || {};
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx2d());
  if (opts.w) {
    vi.spyOn(window.HTMLCanvasElement.prototype, 'clientWidth', 'get').mockImplementation(() => opts.w);
    vi.spyOn(window.HTMLCanvasElement.prototype, 'clientHeight', 'get').mockImplementation(() => opts.h);
  }
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  try { window.localStorage.removeItem('playlab.state.v1'); } catch (e) { /* no storage */ }
  delete window.__alloflowPlayLab;
  texts = [];
  resetStemLab();
  loadTool(FILE, 'playlab');
}
function mount(initial, extra) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null };
  const xp = vi.fn();
  function Harness() {
    const [data, setData] = React.useState(initial || {});
    out.state = data;
    const setter = (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn));
    return window.StemLab._registry.playlab.render(makeCtx(Object.assign({ toolData: data, setToolData: setter, awardXP: xp }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, xp, pl: () => out.state.playlab };
}
const click = (el) => act(() => { el.click(); });
const runButton = (host) => host.querySelector('.playlab-run-button');
const target = (host, id) => host.querySelector('[data-playlab-target="' + id + '"]');
const guess = (host, g) => host.querySelector('[data-playlab-guess="' + g + '"]');
const live = () => (document.getElementById('allo-live-playlab') || {}).textContent || '';
beforeEach(() => { mounted = []; });
afterEach(() => {
  while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); }
  vi.restoreAllMocks();
});

describe('the football coach waits for the run', () => {
  it('sends no open-receiver answer before the play is run, and the numbers after', async () => {
    setup();
    const prompts = [];
    const callGemini = vi.fn(async (p) => { prompts.push(p); return 'Nice call.'; });
    const { host } = mount({ playlab: { sport: 'football', playId: 'slant', coverageId: 'cover1', customPositions: {} } }, { callGemini, aiAvailable: true, isTeacherMode: true });
    const ask = () => [...host.querySelectorAll('button')].find((b) => /Ask the coach/.test(b.textContent));
    click(target(host, 'SLOT'));
    await act(async () => { ask().click(); });
    expect(prompts.length).toBe(1);
    const best = sim('slant', 'cover1').best;
    expect(prompts[0]).not.toMatch(/Open-receiver analysis|Matchup grade|the throw to|most-open receiver/i);
    expect(prompts[0]).not.toMatch(/gap at the catch/);
    expect(prompts[0]).toMatch(/has not run this play yet/);
    expect(prompts[0]).toMatch(/Do NOT say which receiver/);
    click(runButton(host));
    await act(async () => { ask().click(); });
    expect(prompts.length).toBe(2);
    expect(prompts[1]).toMatch(/gap at the catch/);
    expect(prompts[1]).toContain(best.id);
  });
});

describe('Mystery defense', () => {
  // The 'tampa2' mystery: 'Math.random' picks index 2 of the seven coverages that are not the current one.
  const startOn = (host) => click(host.querySelector('[data-playlab-mystery-on]'));
  const pickRandom = (cid) => {
    const others = M.coverages.filter((c) => c.id !== 'cover1');
    const i = others.findIndex((c) => c.id === cid);
    vi.spyOn(Math, 'random').mockReturnValue((i + 0.5) / others.length);
  };

  it('the pre-snap picture really tells man from zone, for every play', () => {
    for (const c of M.coverages) {
      for (const p of M.plays) {
        const r = M.presnap(sim(p.id, c.id));
        expect(r.family, c.id).toBe(M.family(c.id));
        if (r.family === 'man') expect(r.overCount, p.id + ' ' + c.id).toBe(4);
        else expect(r.overCount, p.id + ' ' + c.id).toBeLessThanOrEqual(2);
        expect(r.rushers).toBe(c.id === 'cover0' ? 6 : 4);
        expect(r.lurkers.length).toBe(c.id === 'robber' ? 1 : 0);
      }
      const deep = { cover0: 0, cover1: 1, robber: 1, cover2: 2, cover3: 3, tampa2: 3, cover6: 3, cover4: 4 }[c.id];
      expect(M.presnap(sim('slant', c.id)).deepCount, c.id).toBe(deep);
      expect(typeof M.mysteryCues[c.id]).toBe('string');
    }
    expect(M.coverages.filter((c) => M.family(c.id) === 'man').map((c) => c.id).sort()).toEqual(['cover0', 'cover1', 'robber']);
  });

  it('hides the defense everywhere until the snap', () => {
    setup();
    pickRandom('tampa2');
    const { host, pl } = mount({ playlab: { sport: 'football', playId: 'slant', coverageId: 'cover1', customPositions: {} } }, { isTeacherMode: true });
    startOn(host);
    expect(pl().mysteryOn).toBe(true);
    expect(pl().mysteryCovId).toBe('tampa2');
    expect(pl().coverageId).toBe('cover1');   // the student's own pick is kept for later
    texts = [];
    act(() => { host.querySelector('[data-playlab-guess="man"]').focus(); });
    click(target(host, 'SLOT'));             // re-draws the field
    const page = host.textContent;
    expect(page).not.toMatch(/Tampa/);
    expect(host.querySelector('canvas[data-playlab-canvas]').getAttribute('aria-label')).not.toMatch(/Tampa|Cover/);
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
    // Nothing drawn on the field names a zone or gives the pocket time away.
    const drawn = texts.join(' | ');
    expect(drawn).not.toMatch(/Deep|Hook|Flat|Curl|Robber|Free safety|Blitz/);
    expect(drawn).not.toMatch(/Pocket \d/);
    expect(drawn).toMatch(/Pocket \?/);
  });

  it('needs a man-or-zone guess before the snap, then names the defense and the cue, and pays once', () => {
    setup();
    pickRandom('tampa2');
    const { host, xp, pl } = mount({ playlab: { sport: 'football', playId: 'slant', coverageId: 'cover1', customPositions: {} } }, { isTeacherMode: true });
    startOn(host);
    click(target(host, 'SLOT'));
    click(runButton(host));
    expect(host.querySelector('.playlab-need-target[role="alert"]').textContent).toMatch(/man or zone/i);
    expect(pl().runOutcome || null).toBeNull();
    click(guess(host, 'zone'));
    click(runButton(host));
    const card = host.querySelector('[data-playlab-mystery-result]');
    expect(card.textContent).toMatch(/Tampa 2/);
    expect(card.textContent).toMatch(/zone/i);
    expect(card.textContent).toMatch(/right/i);
    expect(card.textContent).toContain(M.note(M.mysteryCues.tampa2));
    const r = M.presnap(sim('slant', 'tampa2'));
    expect(card.textContent).toContain(r.overCount + ' of 4');
    expect(card.querySelector('svg[role="img"]').getAttribute('aria-label')).toMatch(/deep/);
    expect(xp.mock.calls.filter((c) => c[2] === 'Mystery defense read').length).toBe(1);
    expect(pl().mysteryStats).toMatchObject({ tries: 1, right: 1 });
    expect(live()).toMatch(/Tampa 2/);
    // The same round again pays nothing more, even with another play.
    click([...host.querySelectorAll('[data-playlab-setup] button')].find((b) => /Mesh \(Air Raid\)/.test(b.textContent)));
    click(target(host, 'SLOT'));
    click(runButton(host));
    expect(xp.mock.calls.filter((c) => c[2] === 'Mystery defense read').length).toBe(1);
    // Next mystery: a different defense, hidden again.
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    click(host.querySelector('[data-playlab-mystery-next]'));
    expect(pl().mysteryCovId).not.toBe('tampa2');
    expect(pl().mysterySolved).toBe(false);
    expect(host.querySelector('[data-playlab-mystery-result]')).toBeNull();
  });

  it('a wrong guess earns no read XP and says what the cue was', () => {
    setup();
    pickRandom('cover0');
    const { host, xp } = mount({ playlab: { sport: 'football', playId: 'slant', coverageId: 'cover1', customPositions: {} } }, { isTeacherMode: true });
    startOn(host);
    click(guess(host, 'zone'));
    click(target(host, 'SLOT'));
    click(runButton(host));
    const card = host.querySelector('[data-playlab-mystery-result]');
    expect(card.textContent).toMatch(/Cover 0/);
    expect(card.textContent).toMatch(/man/i);
    expect(card.textContent).toMatch(/not this time/i);
    expect(xp.mock.calls.filter((c) => c[2] === 'Mystery defense read').length).toBe(0);
  });

  it('turning it off brings back the student\'s own defense', () => {
    setup();
    pickRandom('cover4');
    const { host, pl } = mount({ playlab: { sport: 'football', playId: 'slant', coverageId: 'cover2', customPositions: {} } }, { isTeacherMode: true });
    startOn(host);
    click(host.querySelector('[data-playlab-mystery-off]'));
    expect(pl().mysteryOn).toBe(false);
    expect(host.querySelector('[data-playlab-guess="man"]')).toBeNull();
    expect(host.querySelector('#pl-cov-heading').textContent).toMatch(/Cover 2/);
  });
});

describe('field labels stay off the players on a phone', () => {
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const cid of ['cover3', 'cover2', 'cover4', 'cover6', 'tampa2', 'robber', 'cover1']) {
    it('football zone names at 342 px: ' + cid, () => {
      setup({ w: 342, h: 257 });
      mount({ playlab: { sport: 'football', playId: 'slant', coverageId: cid, customPositions: {}, showZones: true } }, { isTeacherMode: true });
      const layout = document.querySelector('canvas[data-playlab-canvas]')._plLayout;
      expect(layout && Array.isArray(layout.labels)).toBe(true);
      for (const l of layout.labels) {
        for (const t of layout.tokens) expect(overlaps(l, t), l.text + ' on a player').toBe(false);
        for (const m of layout.labels) if (m !== l) expect(overlaps(l, m), l.text + ' on ' + m.text).toBe(false);
        expect(l.x).toBeGreaterThanOrEqual(0); expect(l.x + l.w).toBeLessThanOrEqual(342);
      }
    });
  }
  for (const [fm, cid, shape] of [['433', 'tikitaka', 'offsidetrap'], ['442', 'counter', 'highpress'], ['343', 'tikitaka', 'midblock'], ['352', 'gegenpress', 'lowblock']]) {
    it('soccer name tags and the offside label at 342 px: ' + fm + ' ' + cid + ' ' + shape, () => {
      setup({ w: 342, h: 342 });
      mount({ playlab: { sport: 'soccer', formationId: fm, conceptId: cid, shapeId: shape, customPositions: {} } }, { isTeacherMode: true });
      const layout = document.querySelector('canvas[data-playlab-canvas]')._plLayout;
      expect(layout && Array.isArray(layout.labels)).toBe(true);
      for (const l of layout.labels) {
        for (const t of layout.tokens) expect(overlaps(l, t), l.text + ' on a defender').toBe(false);
        for (const m of layout.labels) if (m !== l) expect(overlaps(l, m), l.text + ' on ' + m.text).toBe(false);
      }
    });
  }
});
