import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Stage D features mounted and driven through their real controls: the
// freezing lens counter, grade bands and detail levels with "Show the maths",
// "Go further" and vocabulary pop-overs, hearing / describing / reading the
// charts, throttled announcements, the passive house designer, the teacher
// panel, cross-links, and full translation coverage.
const FILE = 'stem_lab/stem_tool_heatlab.js';
let cfg, host, root, previousAct;

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  delete window.__alloEnsureStemPluginLoaded;
  delete window._alloGlobalMute;
  delete window.StemLab.audioContext;
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [], announced: [], tool: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
      announceToSR: (msg) => box.announced.push(msg),
      setStemLabTool: (id) => box.tool.push(id),
    }, overrides || {})));
  }
  React.act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Panel));
  });
  box.d = () => (box.data && box.data._heatLab) || {};
  return box;
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const buttons = (scope) => [...(scope || host).querySelectorAll('button')];
const byText = (scope, re) => buttons(scope).find((b) => re.test(b.textContent));
const sec = (id) => host.querySelector('#htsec-' + id);
function setRange(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  React.act(() => { set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
}
function fakeAudio() {
  const made = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const ac = {
    state: 'running', currentTime: 0, destination: {},
    createOscillator() { const o = { type: '', frequency: param(), connect() {}, start() { o.started = true; }, stop() {}, disconnect() {} }; made.push(o); return o; },
    createGain() { return { gain: param(), connect() {} }; },
    createStereoPanner() { return { pan: param(), connect() {} }; },
  };
  return { ac, made };
}
// Plain data only: no functions, no class instances (AudioContext, DOM nodes).
function plainOnly(v, path = 'toolData') {
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return [];
  if (typeof v === 'function') return [path];
  if (Array.isArray(v)) return v.flatMap((x, i) => plainOnly(x, path + '[' + i + ']'));
  if (typeof v === 'object') {
    if (Object.getPrototypeOf(v) !== Object.prototype) return [path];
    return Object.keys(v).flatMap((k) => plainOnly(v[k], path + '.' + k));
  }
  return [path];
}

describe('freezing lens counter', () => {
  it('reads bonds formed while a sample freezes and bonds broken while it melts', () => {
    const M = cfg.models;
    const cool = M.phaseCooling('water', {});
    const cursor = Math.round((cool.freezeStartS + cool.freezeEndS) / 2 / cool.endS * 100);
    mount({ _heatLab: { hcMode: 'cool', hcCursor: cursor, lens: { time: true } } });
    const lens = host.querySelector('[data-ht-lens="ht-lens-time"]');
    expect(lens.getAttribute('data-ht-lens-bonds')).toBe('formed');
    React.act(() => root.unmount()); root = null;
    const heat = M.phaseHeating('water', 1000, 1);
    const melt = heat.stages.find((s) => s.id === 'melt');
    mount({ _heatLab: { hcMode: 'heat', hcCursor: Math.round((melt.startS + melt.endS) / 2 / heat.endS * 100), lens: { time: true } } });
    expect(host.querySelector('[data-ht-lens="ht-lens-time"]').getAttribute('data-ht-lens-bonds')).toBe('broken');
  });
});

describe('grade bands and detail levels', () => {
  it('keeps the full Standard copy when the host gives no band', () => {
    mount({});
    expect(host.querySelector('[data-ht-level]').getAttribute('data-ht-level')).toBe('standard');
    expect(sec('wall').textContent).toContain('R_total = R_surfaces');
    expect(host.querySelector('[data-ht-plain]')).toBeNull();
    expect(host.querySelector('[data-ht-further]')).toBeNull();
    expect(host.querySelector('[data-ht-derive]')).toBeNull();
  });

  it('starts grades 6-8 at Simple: plain words, maths behind a button, three sections under Go further', () => {
    const box = mount({}, { gradeBand: 'g68' });
    expect(host.querySelector('[data-ht-level]').getAttribute('data-ht-level')).toBe('simple');
    expect(sec('heatingcurve').querySelector('[data-ht-plain]').textContent).toMatch(/stays at 0 °C while it melts/);
    // the wall equation waits behind "Show the maths"
    expect(sec('wall').textContent).not.toContain('R_total = R_surfaces');
    const show = byText(sec('wall'), /Show the maths/);
    expect(show.getAttribute('aria-expanded')).toBe('false');
    click(show);
    expect(show.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#' + show.getAttribute('aria-controls')).textContent).toContain('R_total = R_surfaces');
    // engines, entropy and heat pumps fold away, headings kept
    ['engines', 'entropy', 'heatpumps'].forEach((id) => {
      expect(sec(id).querySelector('h4')).toBeTruthy();
      expect(sec(id).querySelector('[data-ht-further="' + id + '"]')).toBeTruthy();
    });
    expect(sec('engines').textContent).not.toMatch(/Car petrol engine/);
    click(sec('engines').querySelector('[data-ht-further-btn]'));
    expect(sec('engines').textContent).toMatch(/Car petrol engine/);
    // the learner's own choice overrides the band and persists
    click(host.querySelector('[data-ht-level-btn="standard"]'));
    expect(box.d().level).toBe('standard');
    expect(sec('wall').textContent).toContain('R_total = R_surfaces');
    expect(host.querySelector('[data-ht-level-btn="standard"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('gives grades 9-12 the Extended level, with where each key equation comes from', () => {
    mount({}, { gradeBand: 'g912' });
    expect(host.querySelector('[data-ht-level]').getAttribute('data-ht-level')).toBe('extended');
    expect(sec('engines').querySelector('[data-ht-derive="engines"]').textContent).toMatch(/1 − T_c\/T_h/);
    expect(sec('wall').querySelector('[data-ht-derive="wall"]')).toBeTruthy();
    expect(sec('house').querySelector('[data-ht-derive="house"]')).toBeTruthy();
  });

  it('opens a vocabulary pop-over from a real button, linked by aria-controls, and closes it with Escape', () => {
    mount({});
    const term = sec('heatingcurve').querySelector('[data-ht-term="latent"]');
    expect(term.tagName).toBe('BUTTON');
    expect(term.getAttribute('aria-expanded')).toBe('false');
    click(term);
    const again = sec('heatingcurve').querySelector('[data-ht-term="latent"]');
    expect(again.getAttribute('aria-expanded')).toBe('true');
    const def = host.querySelector('#' + again.getAttribute('aria-controls'));
    expect(def.textContent).toMatch(/latent heat: Energy taken in or given out/);
    React.act(() => again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[data-ht-vocab-def]')).toBeNull();
    // every section that teaches a term offers it
    ['conduction', 'wall', 'mixing', 'radiation', 'entropy', 'equilibrium', 'house'].forEach((id) => expect(sec(id).querySelector('[data-ht-term]'), id).toBeTruthy());
  });
});

describe('hearing, describing and reading the charts', () => {
  it('describes each major chart from the model data', () => {
    const M = cfg.models;
    mount({ _heatLab: { insMatId: 'fibre', thickness: 10, clTest: { design: { shell: 'plastic', liner: 'eps', mm: 25, seal: 'foam', foil: false } }, clSaved: [{ design: { shell: 'plastic', liner: 'none', mm: 0, seal: 'none', foil: false }, meltH: 1.69, cost: 3, outerCm: 10.4, meets: false }] } });
    const open = (id) => { click(host.querySelector('[data-ht-describe="' + id + '"]')); return host.querySelector('[data-ht-desc="' + id + '"]').textContent; };
    const mug = open('mug');
    const t60 = M.coolingTemperature({ k: 0.04 }, 10, 60);
    expect(mug).toContain('is at ' + (Math.round(t60 * 10) / 10).toLocaleString() + ' °C after 60 minutes');
    expect(mug).toMatch(/Half of the gap to room temperature has gone after|Less than half/);
    const curve = open('curve');
    expect(curve).toMatch(/flat stretch at 0 °C lasts 334 kJ/);
    expect(curve).toMatch(/at 100 °C lasts 2,260 kJ/);
    const eq = open('equilibrium');
    expect(eq).toMatch(/meet at [\d.]+ °C/);
    expect(eq).toMatch(/Half of the gap between them closes after/);
    expect(open('hctime')).toMatch(/1 kg of water heated at 1,000 W/);
    expect(open('trade')).toMatch(/Design A: \$3\.00, ice lasts 1\.7 h\./);
    expect(open('race')).toMatch(/hot end is held at 200 °C.*P1, 5 cm from the hot end/s);
    expect(open('house')).toMatch(/Monthly heating need in the Cold \(Portland, Maine\) climate/);
  });

  it('plays a temperature curve on the shared AudioContext, toggles to Stop, and never stores audio in toolData', () => {
    const { ac, made } = fakeAudio();
    window.StemLab.audioContext = vi.fn(() => ac);
    const box = mount({});
    const hear = host.querySelector('[data-ht-hear="curve"]');
    click(hear);
    expect(window.StemLab.audioContext).toHaveBeenCalled();
    expect(made.length).toBeGreaterThan(1);
    const now = host.querySelector('[data-ht-hear="curve"]');
    expect(now.getAttribute('aria-pressed')).toBe('true');
    expect(now.textContent).toMatch(/Stop sound/);
    expect(box.announced.some((m) => /higher pitch means hotter/.test(m) && /2 flat stretches/.test(m))).toBe(true);
    click(now);
    expect(host.querySelector('[data-ht-hear="curve"]').getAttribute('aria-pressed')).toBe('false');
    expect(plainOnly(box.data)).toEqual([]);
  });

  it('respects the global mute: no sound, no speech, and says so', () => {
    window._alloGlobalMute = true;
    window.StemLab.audioContext = vi.fn(() => fakeAudio().ac);
    const tts = vi.fn(() => Promise.resolve('blob:x'));
    const box = mount({}, { callTTS: tts });
    click(host.querySelector('[data-ht-hear="mug"]'));
    click(host.querySelector('[data-ht-read="mug"]'));
    click(host.querySelector('[data-ht-tick]'));
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(tts).not.toHaveBeenCalled();
    expect(box.announced.filter((m) => /Sound is muted/.test(m)).length).toBeGreaterThanOrEqual(3);
    expect(host.querySelector('[data-ht-access-msg="race"]').textContent).toMatch(/Sound is muted/);
  });

  it('reads the description aloud through ctx.callTTS, falling back to speechSynthesis', async () => {
    const tts = vi.fn(() => Promise.resolve(null));
    const spoken = [];
    window.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); } };
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    mount({}, { callTTS: tts });
    click(host.querySelector('[data-ht-read="curve"]'));
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toMatch(/Temperature of 1 kg of water against the energy added/);
    expect(tts.mock.calls[0][3]).toEqual({ force: true });
    await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(spoken[0]).toMatch(/Temperature of 1 kg of water/);
    delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
  });

  it('ticks the thermometer faster as it warms, and stops on demand and on unmount', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { ac, made } = fakeAudio();
    window.StemLab.audioContext = () => ac;
    mount({});
    click(host.querySelector('[data-ht-tick]'));
    expect(host.querySelector('[data-ht-tick]').getAttribute('aria-pressed')).toBe('true');
    const n1 = made.length;
    React.act(() => { vi.advanceTimersByTime(3050); });
    // 20 °C: one tick a second
    expect(made.length - n1).toBe(3);
    click(host.querySelector('[data-ht-tick]'));
    const n2 = made.length;
    React.act(() => { vi.advanceTimersByTime(5000); });
    expect(made.length).toBe(n2);
  });

  it('announces a plateau as the learner scrubs into it, throttled to significant events', () => {
    let now = 1000000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const box = mount({ _heatLab: { energyIn: 20 } });
    const slider = host.querySelector('#heat-energy');
    setRange(slider, 200);
    expect(box.announced.filter((m) => /The ice starts to melt/.test(m))).toHaveLength(1);
    now += 500;
    setRange(slider, 20);
    setRange(slider, 200);
    // same event within 20 s and inside the 2.5 s gap: not repeated
    expect(box.announced.filter((m) => /The ice starts to melt/.test(m))).toHaveLength(1);
    now += 30000;
    setRange(slider, 500);
    expect(box.announced.some((m) => /All the ice has melted/.test(m))).toBe(true);
  });
});

describe('passive house designer', () => {
  it('is section 19, in the index, and opens on a failing brief', () => {
    mount({});
    expect(sec('house').querySelector('h4').textContent).toMatch(/^🏠 19\. Design challenge: a passive house/);
    expect(buttons().filter((b) => b.getAttribute('aria-label') === 'Jump to Design challenge: a passive house')).toHaveLength(1);
    const live = sec('house').querySelector('[data-ht-house-live]');
    expect(live.querySelector('[data-ok="false"]')).toBeTruthy();
    expect(sec('house').querySelector('[data-ht-house-ua]').textContent).toMatch(/Walls/);
    expect(sec('house').querySelectorAll('[data-ht-house-months] tbody tr')).toHaveLength(12);
  });

  it('awards the badge only for a design the learner changed, tested and passed', () => {
    const PASS = { hsWall: 'super', hsRoofMm: 200, hsFloor: 'pir100', hsGlazing: 'triple', hsWinS: 16, hsWinE: 2, hsWinW: 2, hsWinN: 2, hsAir: 'tight', hsMvhr: false };
    expect(cfg.models.houseModel({ wall: 'super', roofMm: 200, floor: 'pir100', glazing: 'triple', winS: 16, winE: 2, winW: 2, winN: 2, air: 'tight' }, 'cold').meets).toBe(true);
    // loaded already passing but untouched: testing earns nothing
    const box = mount({ _heatLab: PASS });
    click(sec('house').querySelector('[data-ht-house-test]'));
    expect(box.d().hsTest.meets).toBe(true);
    expect(box.d().hsBadge).toBeFalsy();
    expect(box.xp).toEqual([]);
    expect(cfg.questHooks.find((q) => q.id === 'heat_house').check(box.d())).toBe(false);
    // a real change (roof 200 -> 300) and a new test earns it once
    click(byText(sec('house'), /^300 mm wool$/));
    expect(box.d().hsTouched).toBe(true);
    expect(sec('house').querySelector('[data-ht-house-tested]').textContent).toMatch(/changed the house since this test/);
    click(sec('house').querySelector('[data-ht-house-test]'));
    click(sec('house').querySelector('[data-ht-house-test]'));
    expect(box.d().hsBadge).toBe(true);
    expect(box.xp.filter((x) => x[0] === 'heatlab_house')).toEqual([['heatlab_house', 25, 'Designed a house that meets the passive house brief']]);
    expect(cfg.questHooks.find((q) => q.id === 'heat_house').check(box.d())).toBe(true);
    expect(box.d().log.filter((r) => r.kind === 'house')).toHaveLength(3);
    // save and compare
    click(byText(sec('house'), /Save for comparison/));
    expect(sec('house').querySelectorAll('[data-ht-house-saved]')).toHaveLength(1);
    expect(plainOnly(box.data)).toEqual([]);
  });

  it('builds walls from the section-3 stack and shows any climate, while testing in the brief\'s climate', () => {
    const box = mount({ _heatLab: { wallStack: ['brick', 'pir', 'pir', 'plaster'] } });
    click(byText(sec('house'), /^My wall from section 3$/));
    expect(box.d().hsWall).toBe('mine');
    expect(sec('house').textContent).toMatch(/PIR board, 50 mm \+ PIR board, 50 mm/);
    click(byText(sec('house'), /^Mild \(San Francisco\)$/));
    expect(sec('house').querySelector('[data-ht-house-result]').textContent).toMatch(/Mild \(San Francisco\) climate/);
    click(sec('house').querySelector('[data-ht-house-test]'));
    expect(box.d().hsTest.kwhM2).toBeCloseTo(cfg.models.houseModel({ wall: 'mine', mine: ['brick', 'pir', 'pir', 'plaster'] }, 'cold').kwhM2, 6);
  });
});

describe('teacher panel', () => {
  it('is absent for learners and present in teacher mode', () => {
    mount({});
    expect(host.querySelector('[data-ht-teacher]')).toBeNull();
    React.act(() => root.unmount()); root = null;
    mount({}, { isTeacherMode: true });
    expect(host.querySelector('[data-ht-teacher]')).toBeTruthy();
  });

  it('applies a preset and locks; learners then see only those sections, locked ones inert', () => {
    const t = mount({}, { isTeacherMode: true });
    click(byText(host.querySelector('[data-ht-teacher]'), /Lesson set-up/));
    click(host.querySelector('[data-ht-preset="design"]'));
    const teacher = t.d().teacher;
    expect(teacher.preset).toBe('design');
    expect(teacher.hidden).toContain('engines');
    expect(teacher.hidden).not.toContain('house');
    click(host.querySelector('[data-ht-lock="cooler"]'));
    expect(t.d().teacher.locked).toEqual(['cooler']);
    // the teacher still sees everything, with notes
    expect(sec('engines').querySelector('[data-ht-teacher-note]')).toBeTruthy();
    const saved = JSON.parse(JSON.stringify(t.data));
    React.act(() => root.unmount()); root = null;
    mount(saved);
    expect(sec('engines')).toBeNull();
    expect(sec('house')).toBeTruthy();
    expect(buttons().filter((b) => /^Jump to /.test(b.getAttribute('aria-label') || ''))).toHaveLength(6);
    expect(sec('cooler').querySelector('[data-ht-locked="cooler"]').hasAttribute('inert')).toBe(true);
    expect(sec('cooler').querySelector('[data-ht-locked-note]').textContent).toMatch(/locked this section/);
  });

  it('shows an answer key and an NGSS map, and exports a worksheet and the misconception tally', async () => {
    const written = [];
    const win = { document: { open() {}, write(h) { written.push(h); }, close() {} } };
    vi.spyOn(window, 'open').mockImplementation(() => win);
    const blobs = [];
    window.URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:x'; });
    window.URL.revokeObjectURL = () => {};
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const box = mount({ _heatLab: { teacher: { open: true }, misTally: { cold_flows: 3, metal_colder: 1 } } }, { isTeacherMode: true });
    click(byText(host, /Answer key/));
    const key = host.querySelector('[data-ht-teacher-key]');
    expect(key.querySelectorAll('[data-ht-key-card]').length).toBe(cfg.models.poeCards((k, f) => f).length);
    expect(key.textContent).toMatch(/Cooler, cheapest found/);
    expect(key.textContent).toMatch(/House, cheapest found/);
    click(byText(host, /NGSS map/));
    expect(host.querySelectorAll('[data-ht-teacher-ngss] tbody tr').length).toBe(9);
    expect(host.querySelector('[data-ht-teacher-ngss]').textContent).toMatch(/MS-PS3-3.*19\. Design challenge: a passive house/s);
    click(host.querySelector('[data-ht-worksheet]'));
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(printSpy).not.toHaveBeenCalled();
    expect(written[0]).toMatch(/<h1>Heat Lab worksheet<\/h1>/);
    expect(written[0]).toMatch(/A full bath at 40 °C and a cup of tea at 90 °C/);
    expect(written[0]).not.toMatch(/<script/);
    click(host.querySelector('[data-ht-mis-csv]'));
    expect(blobs.length).toBe(1);
    const csv = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(blobs[0]); });
    expect(csv).toMatch(/number,id,misconception,times_chosen,cards/);
    expect(csv).toMatch(/2,cold_flows,.*,3,/);
    expect(box.d().teacher.keyOpen).toBe(true);
    expect(plainOnly(box.data)).toEqual([]);
  });

  it('downloads the worksheet when pop-ups are blocked', () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    const blobs = [];
    window.URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:y'; });
    window.URL.revokeObjectURL = () => {};
    const box = mount({ _heatLab: { teacher: { open: true } } }, { isTeacherMode: true });
    click(host.querySelector('[data-ht-worksheet]'));
    expect(blobs[0].type).toMatch(/text\/html/);
    expect(box.announced.some((m) => /Pop-ups are blocked/.test(m))).toBe(true);
  });
});

describe('cross-links', () => {
  it('offers Weld Lab, Kitchen Lab and Water Cycle only when the host can load them', () => {
    mount({});
    expect(host.querySelector('[data-ht-crosslink]')).toBeNull();
    React.act(() => root.unmount()); root = null;
    const asked = [];
    window.__alloEnsureStemPluginLoaded = (id) => { asked.push(id); return true; };
    const box = mount({});
    expect(sec('conduction').querySelector('[data-ht-crosslink="weldLab"]')).toBeTruthy();
    expect(sec('expansion').querySelector('[data-ht-crosslink="weldLab"]')).toBeTruthy();
    expect(sec('mixing').querySelector('[data-ht-crosslink="kitchenLab"]')).toBeTruthy();
    expect(sec('heatingcurve').querySelector('[data-ht-crosslink="waterCycle"]')).toBeTruthy();
    click(sec('mixing').querySelector('[data-ht-crosslink="kitchenLab"]'));
    expect(asked).toEqual(['kitchenLab']);
    expect(box.tool).toEqual(['kitchenLab']);
  });
});

describe('translation coverage', () => {
  it('routes the visible text and every aria-label through t(), data tables included', () => {
    const MARK = '§';
    const seen = new Set();
    mount({ _heatLab: { hsTest: { design: {} }, clTest: { design: { shell: 'plastic', liner: 'eps', mm: 25, seal: 'foam', foil: false } } } },
      { t: (k, fb) => { seen.add(k); return MARK + (fb != null ? fb : k); }, isTeacherMode: true, gradeBand: 'g68' });
    let total = 0, marked = 0;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const s = n.nodeValue.trim();
      if (!/[A-Za-z]{2,}/.test(s) || n.parentElement.closest('style')) continue;
      total++;
      if (s.includes(MARK)) marked++;
    }
    const aria = [...host.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((s) => /[A-Za-z]{2,}/.test(s));
    expect(marked / total).toBeGreaterThan(0.9);
    expect(aria.filter((s) => !s.includes(MARK))).toEqual([]);
    ['stem.heatlab.mat_copper_name', 'stem.heatlab.layer_mineral_name', 'stem.heatlab.eng_car_petrol_engine_name', 'stem.heatlab.day_vacuum_flask_name',
      'stem.heatlab.house_title', 'stem.heatlab.teacher_title', 'stem.heatlab.level_simple', 'stem.heatlab.v_latent_def'].forEach((k) => expect(seen.has(k), k).toBe(true));
    [...seen].forEach((k) => expect(k).toMatch(/^stem\.(heatlab|heatLab|common)\.[A-Za-z0-9_]+$/));
  });

  it('keeps engine and everyday answers keyed by the English name when translated', () => {
    const box = mount({}, { t: (k, fb) => 'X' + fb });
    const spot = sec('spot');
    click(spot.querySelectorAll('button[aria-expanded]')[0]);
    click(buttons(spot.querySelector('#ht-spot-0')).find((b) => /All three/.test(b.textContent)));
    expect(Object.keys(box.d().everydayAnswers)).toEqual(['Vacuum flask']);
  });
});
