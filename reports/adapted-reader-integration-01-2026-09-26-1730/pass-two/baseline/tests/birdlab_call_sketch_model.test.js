// BirdLab Bird Call Trainer: every tone sketch, rhythm strip, spectrogram,
// shape badge and text alternative must come from ONE per-species acoustic
// model (CALL_SKETCHES). Before this gate the sketch was reverse-engineered
// from the mnemonic TEXT: every species played at a 2.8 kHz songbird base
// (a Mourning Dove cooed at warbler pitch), description words such as
// "Mechanical RATTLE — like a wooden noisemaker" were sung syllable by
// syllable, and the shape badge named whatever that text happened to make.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
if (!MODULES_DIR) throw new Error('birdlab_call_sketch_model: no vendored React found');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_FILE = 'stem_lab/stem_tool_birdlab.js';

function pure() {
  loadTool(TOOL_FILE, 'birdLab');
  const p = window.__alloBirdLabPure;
  if (!p || typeof p.callTones !== 'function') throw new Error('window.__alloBirdLabPure missing after load');
  return p;
}

function byId(p, id) {
  const call = p.FAMOUS_CALLS.find((c) => c.id === id);
  if (!call) throw new Error('no FAMOUS_CALLS entry ' + id);
  return call;
}

function cardHtml(html, species) {
  const start = html.indexOf('>' + species + '</h3>');
  if (start < 0) throw new Error('no card for ' + species);
  const next = html.indexOf('<h3', start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

// y-centres of the solid note bands / slurs inside a card's spectrogram
function bandYs(card) {
  const ys = [];
  for (const m of card.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="4" rx="2"/g)) ys.push(Number(m[1]) + 1.5);
  for (const m of card.matchAll(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)" stroke="#[0-9a-f]+" stroke-width="4"/g)) {
    ys.push(Number(m[1]));
    ys.push(Number(m[2]));
  }
  if (!ys.length) throw new Error('no note bands found in card');
  return ys;
}

beforeEach(() => resetStemLab());

describe('BirdLab call sketch model', () => {
  it('gives every famous call a sketch with plausible, bounded notes', () => {
    const p = pure();
    expect(p.FAMOUS_CALLS.length).toBeGreaterThanOrEqual(15);
    for (const call of p.FAMOUS_CALLS) {
      expect(call.sketch, call.id + ' has no sketch model').toBeTruthy();
      const notes = p.callTones(call);
      expect(notes.length, call.id).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.freq, call.id).toBeGreaterThanOrEqual(p.SPECTROGRAM_RANGE.min);
        expect(n.freq, call.id).toBeLessThanOrEqual(p.SPECTROGRAM_RANGE.max);
        expect(n.endFreq, call.id).toBeGreaterThanOrEqual(p.SPECTROGRAM_RANGE.min);
        expect(n.endFreq, call.id).toBeLessThanOrEqual(p.SPECTROGRAM_RANGE.max);
        expect(n.dur, call.id).toBeGreaterThan(0);
        expect(n.gap, call.id).toBeGreaterThanOrEqual(0);
        expect(['whistle', 'coo', 'hoot', 'harsh', 'buzz', 'rattle']).toContain(n.quality);
      }
    }
  });

  it('voices each species in its real register instead of one songbird pitch', () => {
    const p = pure();
    const owl = p.callTones(byId(p, 'barredowl_call'));
    const dove = p.callTones(byId(p, 'mourningdove_call'));
    for (const n of owl.concat(dove)) expect(n.freq).toBeLessThan(700);
    for (const n of p.callTones(byId(p, 'chickadee_call'))) expect(n.freq).toBeGreaterThan(3000);
    for (const n of p.callTones(byId(p, 'wts_call'))) expect(n.freq).toBeGreaterThan(3000);

    expect(p.callRegister(owl)).toBe('low');
    expect(p.callRegister(dove)).toBe('low');
    expect(p.callRegister(p.callTones(byId(p, 'kingfisher_call')))).toBe('mid');
    expect(p.callRegister(p.callTones(byId(p, 'chickadee_call')))).toBe('high');

    // The registers must actually differ across the set, otherwise the
    // spectrogram cannot teach "listen for how high or low it is".
    const registers = new Set(p.FAMOUS_CALLS.map((c) => p.callRegister(p.callTones(c))));
    expect(registers).toEqual(new Set(['low', 'mid', 'high']));
  });

  it('no longer sings the English description words in a mnemonic', () => {
    const p = pure();
    const forbidden = ['Mechanical', 'wooden', 'noisemaker', 'imitation', 'perfect', 'Yodeling', 'iconic', 'drumming', 'whistled', 'Canada', 'rattly'];
    for (const call of p.FAMOUS_CALLS) {
      const syls = p.callTones(call).map((n) => n.syl);
      for (const word of forbidden) expect(syls, call.id + ' sings "' + word + '"').not.toContain(word);
    }
    // The legacy text heuristic is still the fallback for a call with no model
    const legacy = p.callTones({ mnemonic: 'Mechanical RATTLE — like a wooden noisemaker' });
    expect(legacy.map((n) => n.syl)).toContain('Mechanical');
    expect(p.callTones('"Fee-bee"').length).toBe(2);
  });

  it('classifies each sketch with the field-guide shape its description promises', () => {
    const p = pure();
    const expected = {
      chickadee_call: 'two-note',      // whistled two-note song
      barredowl_call: 'falling',       // final "you-all" trails down
      mourningdove_call: 'arch',       // second note rises, rest fall away
      jay_call: 'falling',             // harsh descending scream
      kingfisher_call: 'rattle',
      loon_call: 'trill',              // tremolo
      towhee_call: 'trill',            // ends in a long buzzy trill
      rwbb_call: 'trill',
      titmouse_call: 'repeated',       // peter peter peter peter
      yellowthroat_call: 'repeated',   // witchity x3
      pileated_call: 'repeated',       // kuk-kuk-kuk series
      cardinal_call: 'repeated',       // what-cheer cheer cheer
      wts_call: 'repeated',            // Peabody Peabody Peabody
      robin_call: 'phrases',           // three short caroling phrases
      vireo_call: 'phrases',           // question / answer phrases
    };
    for (const id of Object.keys(expected)) {
      expect(p.classifyCallShape(p.callTones(byId(p, id))), id).toBe(expected[id]);
    }
    // Shape is derived, so a changed model changes the badge: the same
    // chickadee model with its second note raised is no longer "the
    // second lower".
    expect(p.describeCall(byId(p, 'chickadee_call')).secondLower).toBe(true);
    const flipped = p.describeCall({ sketch: { notes: [{ syl: 'fee', hz: 3550, dur: 0.45 }, { syl: 'bee', hz: 4000, dur: 0.5 }] } });
    expect(flipped.shape).toBe('two-note');
    expect(flipped.secondLower).toBe(false);
  });

  it('pitch distances are perceptual (semitones), not raw hertz', () => {
    const p = pure();
    // 500 -> 380 Hz is a 4.7-semitone drop; the same 120 Hz at 4 kHz is 0.5.
    expect(p.semitones(500, 380)).toBeLessThan(-4);
    expect(Math.abs(p.semitones(4000, 4120))).toBeLessThan(0.6);
    // The spectrogram axis is logarithmic: each octave takes the same height.
    const u = (f) => p.freqToUnit(f);
    expect(u(300)).toBe(0);
    expect(u(8000)).toBe(1);
    expect(u(1000) - u(500)).toBeCloseTo(u(2000) - u(1000), 6);
    expect(u(250)).toBe(0); // clamped
  });

  it('writes a text alternative that describes the sound without naming the species', () => {
    const p = pure();
    for (const call of p.FAMOUS_CALLS) {
      const info = p.describeCall(call);
      expect(info && info.text, call.id).toBeTruthy();
      expect(info.text.toLowerCase(), call.id).not.toContain(call.species.toLowerCase());
      const lastWord = call.species.split(' ').pop().toLowerCase();
      expect(info.text.toLowerCase(), call.id + ' leaks "' + lastWord + '"').not.toContain(lastWord);
      expect(info.text).toMatch(/about \d+(\.\d+)? s/i);
    }
    expect(p.describeCall(byId(p, 'barredowl_call')).text).toBe('8 low-pitched, hooted notes; dropping in pitch by the end. About 3 s.');
    expect(p.describeCall(byId(p, 'kingfisher_call')).text).toBe('A mid-pitched, dry mechanical rattle, about 1.2 s long.');
    expect(p.describeCall(byId(p, 'chickadee_call')).text).toBe('2 high-pitched, clear, whistled notes; two pitches, the second lower. About 1 s.');
    expect(p.describeCall(byId(p, 'loon_call')).text).toBe('A low-pitched wavering trill, about 2 s long.');
    // Translator hook: keys are offered for every fragment
    const seen = [];
    p.describeCall(byId(p, 'barredowl_call'), (k, fb) => { seen.push(k); return fb; });
    expect(seen).toContain('stem.birdlab.sketch_register_low');
    expect(seen).toContain('stem.birdlab.sketch_quality_hoot');
    expect(seen).toContain('stem.birdlab.sketch_shape_falling');
    expect(seen).toContain('stem.birdlab.sketch_desc');
  });
});

describe('BirdLab Bird Call Trainer renders from the model', () => {
  it('reference cards carry the derived shape, register and text alternative', () => {
    loadTool(TOOL_FILE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'calls' } });
    const p = window.__alloBirdLabPure;
    const wrappers = html.match(/data-birdlab-call-shape="[^"]+" data-birdlab-call-register="[^"]+"/g) || [];
    expect(wrappers.length).toBe(p.FAMOUS_CALLS.length);
    for (const call of p.FAMOUS_CALLS) {
      const info = p.describeCall(call);
      const card = cardHtml(html, call.species);
      expect(card, call.id + ' shape attr').toContain('data-birdlab-call-shape="' + info.shape + '"');
      expect(card, call.id + ' register attr').toContain('data-birdlab-call-register="' + info.register + '"');
      expect(card, call.id + ' text alternative').toContain('Sounds like: ' + info.text.replace(/'/g, '&#x27;'));
      expect(card, call.id + ' sketch label').toContain('data-birdlab-sketch-label="' + call.id + '"');
      // syllable labels are drawn in reference mode
      for (const n of p.callTones(call)) if (n.syl) expect(card, call.id + ' syllable ' + n.syl).toContain('>' + n.syl.replace(/'/g, '&#x27;') + '</text>');
    }
    // The old fixed 2.2-3.5 kHz axis is gone; the log axis labels are in
    expect(html).toContain('1 kHz');
    expect(html).toContain('4 kHz');
    // The Mourning Dove's bands sit in the lower half of the strip and the
    // chickadee's in the upper half: register is what the strip teaches.
    expect(Math.min(...bandYs(cardHtml(html, 'Mourning Dove')))).toBeGreaterThan(30);
    expect(Math.max(...bandYs(cardHtml(html, 'Black-capped Chickadee')))).toBeLessThan(20);
  });
});

// ── Listen & Identify: mounted, so the mode tab can be clicked ──
const noop = () => {};
const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

function mountBirdLab(initial) {
  loadTool(TOOL_FILE, 'birdLab');
  const cfg = window.StemLab._registry.birdLab;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {};
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
  function Harness() {
    const [toolData, setToolData] = React.useState({ birdLab: initial || {} });
    api.update = (toolId, key, val) =>
      setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    api.updateMulti = (toolId, obj) =>
      setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({
      React, toolData, setToolData, update: api.update, updateMulti: api.updateMulti,
      setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, addToast: noop,
      announceToSR: noop, awardXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop,
      canvasA11yDesc: noop, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, callGeminiImageEdit: null, gradeLevel: '5th Grade',
      gradeBand: 'g68', isContrast: false,
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: Icons, t: (k, f) => f || k, tryAward: noop, getXP: () => 0,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  api.host = host;
  api.click = (el) => { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); };
  api.teardown = () => {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  };
  return api;
}

describe('BirdLab Listen & Identify (mounted)', () => {
  let api;
  afterEach(() => { if (api) api.teardown(); api = null; });

  it('shows the hidden call as a spectrogram + sound description, without its words, until the reveal', () => {
    api = mountBirdLab({ view: 'calls' });
    const p = window.__alloBirdLabPure;
    const listenTab = [...api.host.querySelectorAll('button[role="tab"]')].find((b) => /Listen/.test(b.textContent));
    expect(listenTab).toBeTruthy();
    api.click(listenTab);

    const block = api.host.querySelector('[data-birdlab-listen-spectrogram]');
    expect(block).toBeTruthy();
    const sketch = block.querySelector('.birdlab-call-sketch');
    expect(sketch).toBeTruthy();
    const shape = sketch.getAttribute('data-birdlab-call-shape');
    const register = sketch.getAttribute('data-birdlab-call-register');
    // Which call is hidden is random; the stamped shape/register must be
    // one the classifier gives some famous call.
    const legal = p.FAMOUS_CALLS.map((c) => p.describeCall(c));
    const match = legal.filter((i) => i.shape === shape && i.register === register);
    expect(match.length, 'shape/register ' + shape + '/' + register).toBeGreaterThan(0);
    // Text alternative is present...
    const desc = sketch.querySelector('.birdlab-call-sketch-desc').textContent;
    expect(match.map((i) => 'Sounds like: ' + i.text)).toContain(desc);
    // ...but no syllable labels are drawn before the answer
    expect(sketch.querySelectorAll('svg text').length).toBe(4); // 2 axis ticks + high + low
    const words = new Set();
    for (const c of p.FAMOUS_CALLS) for (const n of p.callTones(c)) if (n.syl) words.add(n.syl);
    for (const t of sketch.querySelectorAll('svg text')) expect([...words]).not.toContain(t.textContent);

    // Answer (any choice) reveals the mnemonic; syllables now appear
    const choice = api.host.querySelector('[role="radiogroup"] button[role="radio"], button[role="radio"]');
    expect(choice).toBeTruthy();
    api.click(choice);
    const after = api.host.querySelector('[data-birdlab-listen-spectrogram] .birdlab-call-sketch');
    expect(after.querySelectorAll('svg text').length).toBeGreaterThan(4);
  });
});

// A fake Web Audio context that records every oscillator start frequency
// the tool schedules, so the AUDIO path (not just the drawing) is gated.
function installFakeAudio() {
  const scheduled = [];
  const param = (rec) => ({
    value: 0,
    setValueAtTime(v) { if (rec) rec(v); return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
  });
  class FakeCtx {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() {}
    createOscillator() {
      const osc = { type: 'sine', frequency: null, connect(n) { return n; }, start() {}, stop() {} };
      osc.frequency = param((v) => scheduled.push({ hz: v, type: osc.type }));
      return osc;
    }
    createGain() { return { gain: param(null), connect(n) { return n; } }; }
    createBiquadFilter() { return { type: 'lowpass', frequency: { value: 0 }, connect(n) { return n; } }; }
  }
  window.AudioContext = FakeCtx;
  return scheduled;
}

describe('BirdLab tone sketch audio (fake Web Audio)', () => {
  let api;
  afterEach(() => { if (api) api.teardown(); api = null; delete window.AudioContext; });

  it('the Play button schedules the model frequencies, so an owl plays low and a chickadee high', () => {
    const scheduled = installFakeAudio();
    api = mountBirdLab({ view: 'calls' });
    const p = window.__alloBirdLabPure;
    const playFor = (species) => [...api.host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Play tone sketch for ' + species);

    const owlBtn = playFor('Barred Owl');
    expect(owlBtn).toBeTruthy();
    api.click(owlBtn);
    const owlNotes = p.callTones(p.FAMOUS_CALLS.find((c) => c.id === 'barredowl_call'));
    expect(scheduled.length).toBe(owlNotes.length);
    expect(scheduled.map((s) => s.hz)).toEqual(owlNotes.map((n) => n.freq));
    for (const s of scheduled) expect(s.hz).toBeLessThan(700);
    scheduled.length = 0;

    // Stop the owl, then play the chickadee
    api.click([...api.host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Stop tone sketch for Barred Owl'));
    api.click(playFor('Black-capped Chickadee'));
    expect(scheduled.map((s) => s.hz)).toEqual([4000, 3550]);
    scheduled.length = 0;

    // Voice quality reaches the oscillator: a harsh scream is not a sine
    api.click([...api.host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Stop tone sketch for Black-capped Chickadee'));
    api.click(playFor('Blue Jay'));
    expect(scheduled.length).toBe(2);
    for (const s of scheduled) expect(s.type).toBe('sawtooth');
  });
});

// ── Match the Song must be a LISTENING test ──
// The prompt used to print the mnemonic ("Who cooks for you?") and the
// description ("the signature owl of eastern forests") directly above four
// species names, so the answer was readable without ever pressing play.
describe('BirdLab Match the Song (mounted)', () => {
  let api;
  afterEach(() => { if (api) api.teardown(); api = null; });

  function openQuiz() {
    api = mountBirdLab({ view: 'calls' });
    const tab = [...api.host.querySelectorAll('button[role="tab"]')].find((b) => /Match the Song/.test(b.textContent));
    expect(tab).toBeTruthy();
    api.click(tab);
  }

  // The prompt panel is everything above the answer radiogroup.
  function promptText() {
    const group = api.host.querySelector('[role="radiogroup"]');
    const panel = api.host.querySelector('[data-birdlab-quiz-spectrogram]').closest('div.p-4');
    expect(group).toBeTruthy();
    expect(panel).toBeTruthy();
    return panel.textContent;
  }

  function currentMnemonic() {
    const p = window.__alloBirdLabPure;
    const shape = api.host.querySelector('[data-birdlab-quiz-spectrogram] .birdlab-call-sketch');
    const desc = shape.querySelector('.birdlab-call-sketch-desc').textContent;
    const hits = p.FAMOUS_CALLS.filter((c) => 'Sounds like: ' + p.describeCall(c).text === desc);
    expect(hits.length, 'sound description matched no call').toBeGreaterThan(0);
    return hits.map((c) => c.mnemonic);
  }

  it('does not print the mnemonic or the description in the unanswered prompt', () => {
    openQuiz();
    const before = promptText();
    for (const m of currentMnemonic()) {
      const words = m.replace(/^["']|["']$/g, '').slice(0, 12);
      expect(before, 'prompt leaks the mnemonic: ' + words).not.toContain(words);
    }
    // The species descriptions name the bird outright; none may appear.
    const p = window.__alloBirdLabPure;
    for (const c of p.FAMOUS_CALLS) expect(before).not.toContain(c.description.slice(0, 25));
    // ...and the spectrogram is drawn without syllable labels
    const sketch = api.host.querySelector('[data-birdlab-quiz-spectrogram] .birdlab-call-sketch');
    expect(sketch.querySelectorAll('svg text').length).toBe(4); // 2 ticks + high + low
    // The habitat clue stays: it is a legitimate field cue, not the answer.
    expect(before).toContain('Habitat:');
  });

  it('offers the mnemonic as a hint the student spends, and opens it on answering', () => {
    openQuiz();
    const hintBtn = api.host.querySelector('[data-birdlab-quiz-hint="closed"]');
    expect(hintBtn).toBeTruthy();
    const expected = currentMnemonic();
    api.click(hintBtn);
    const opened = api.host.querySelector('[data-birdlab-quiz-hint="open"]');
    expect(opened).toBeTruthy();
    expect(expected).toContain(opened.textContent);
    expect(api.host.querySelector('[data-birdlab-quiz-hint="closed"]')).toBeNull();
  });

  it('answering reveals the mnemonic and the syllable labels', () => {
    openQuiz();
    expect(api.host.querySelector('[data-birdlab-quiz-hint="closed"]')).toBeTruthy();
    api.click(api.host.querySelector('[role="radiogroup"] button[role="radio"]'));
    const opened = api.host.querySelector('[data-birdlab-quiz-hint="open"]');
    expect(opened).toBeTruthy();
    expect(currentMnemonic()).toContain(opened.textContent);
    const sketch = api.host.querySelector('[data-birdlab-quiz-spectrogram] .birdlab-call-sketch');
    expect(sketch.querySelectorAll('svg text').length).toBeGreaterThan(4);
  });
});

describe('BirdLab call trainer accessibility and theming', () => {
  let api;
  afterEach(() => { if (api) api.teardown(); api = null; });

  it('every role=radio sits inside a named radiogroup, in both graded modes', () => {
    for (const modeLabel of [/Match the Song/, /Listen/]) {
      api = mountBirdLab({ view: 'calls' });
      api.click([...api.host.querySelectorAll('button[role="tab"]')].find((b) => modeLabel.test(b.textContent)));
      const radios = [...api.host.querySelectorAll('[role="radio"]')];
      expect(radios.length, String(modeLabel)).toBeGreaterThan(0);
      for (const r of radios) {
        const group = r.closest('[role="radiogroup"]');
        expect(group, String(modeLabel) + ': orphan radio').toBeTruthy();
        expect((group.getAttribute('aria-label') || '').length).toBeGreaterThan(0);
      }
      api.teardown();
      api = null;
    }
  });

  it('the Listen play glyph is fixed light ink, not a theme token, on its fixed gradient', () => {
    api = mountBirdLab({ view: 'calls' });
    api.click([...api.host.querySelectorAll('button[role="tab"]')].find((b) => /Listen/.test(b.textContent)));
    const play = [...api.host.querySelectorAll('button')].find((b) => /Play tone sketch for the hidden species/.test(b.getAttribute('aria-label') || ''));
    expect(play).toBeTruthy();
    const style = play.getAttribute('style') || '';
    expect(style).toMatch(/linear-gradient/);
    // A theme ink on a fixed dark gradient is dark-on-dark in light theme.
    expect(style).not.toContain('--allo-stem-text');
    expect(play.style.color).toBe('rgb(255, 255, 255)');
  });
});
