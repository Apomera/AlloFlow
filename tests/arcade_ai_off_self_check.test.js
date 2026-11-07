// AI-off arcade: a written justification is never graded or passed without AI.
// Solo it is self-rated and pays nothing; in class the teacher's score is the
// only thing that pays. Boss Encounter has no honest version and stays hidden.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const bossSrc = readFileSync('arcade_mode_boss_encounter.js', 'utf8');
const realmSrc = readFileSync('arcade_mode_realm_builder.js', 'utf8');
const atlasSrc = readFileSync('arcade_mode_concept_atlas.js', 'utf8');
const sageSrc = readFileSync('arcade_mode_sage_launcher.js', 'utf8');
const hostSrc = readFileSync('allohaven_module.js', 'utf8');

const GLOSSARY = ['Evaporation', 'Condensation', 'Runoff', 'Precipitation', 'Aquifer', 'Transpiration'].map((term) => ({ term, def: term + ' definition' }));
const WRITING = 'The water rises because the sun warms it, as in the lesson.';

let modes;
let mounted;

function blocked() {
  const fn = vi.fn(() => Promise.reject(Object.assign(new Error('blocked'), { code: 'allo-qr-ai-disabled' })));
  fn._alloQrBlocked = true;
  return fn;
}

function hasUndefined(value) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((k) => hasUndefined(value[k]));
}

// Same shape as setDoc(ref, fields, { merge: true }): nested maps merge, null is
// stored, and undefined is refused.
function makeSessionDoc() {
  const doc = { data: {}, listeners: new Set(), failNext: false, writes: [] };
  function merge(target, src) {
    Object.keys(src).forEach((k) => {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        merge(target[k], v);
      } else target[k] = v;
    });
  }
  doc.update = (fields) => {
    if (doc.failNext) { doc.failNext = false; return Promise.reject(new Error('offline')); }
    if (hasUndefined(fields)) return Promise.reject(new Error('undefined in Firestore payload'));
    doc.writes.push(JSON.parse(JSON.stringify(fields)));
    merge(doc.data, JSON.parse(JSON.stringify(fields)));
    const snap = JSON.parse(JSON.stringify(doc.data));
    doc.listeners.forEach((fn) => fn(snap));
    return Promise.resolve();
  };
  doc.subscribe = (fn) => {
    doc.listeners.add(fn);
    fn(JSON.parse(JSON.stringify(doc.data)));
    return () => doc.listeners.delete(fn);
  };
  return doc;
}

function Frame(props) { return props.mode.render(props.ctx); }

function baseCtx(extra) {
  const earnings = [];
  const ctx = {
    React,
    palette: {},
    tokens: 10,
    minutesPerToken: 5,
    session: null,
    onLaunch: vi.fn(() => true),
    onLaunchHosted: vi.fn(() => true),
    onLaunchSelfCheck: vi.fn(() => true),
    onClose: vi.fn(),
    addToast: vi.fn(),
    getEarnings: () => earnings,
    decorations: [],
    glossaryEntries: GLOSSARY,
    realms: [],
    atlases: [],
    onRealmUpdate: vi.fn(),
    onAtlasUpdate: vi.fn(),
    callGemini: blocked(),
    callImagen: blocked(),
    callGeminiAudio: null,
    sessionCode: null,
    studentNickname: 'Clever Dolphin',
    sessionParticipantId: '',
    isHost: false,
    sessionSubscribe: () => () => {},
    sessionUpdate: () => Promise.resolve()
  };
  ctx.onAwardTokens = vi.fn((amount, source, metadata) => {
    earnings.push({ tokens: amount, source, metadata });
    ctx.tokens += amount;
  });
  return Object.assign(ctx, extra);
}

async function mount(modeId, ctx) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const inst = {
    el,
    ctx,
    root,
    async render() { await act(async () => { root.render(React.createElement(Frame, { mode: modes[modeId], ctx: Object.assign({}, ctx) })); }); },
    button(text) { return [...el.querySelectorAll('button')].find((b) => b.textContent.includes(text)); },
    text() { return el.textContent; }
  };
  mounted.push(inst);
  await inst.render();
  return inst;
}

async function setValue(field, value) {
  const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(target) {
  expect(target, 'click target exists').toBeTruthy();
  await act(async () => { target.click(); });
}
const session = (modeId) => ({ modeId, startedAt: 'run-1' });

async function beginRealm(inst) {
  await setValue(inst.el.querySelector('[id="rb-topic"]'), 'the water cycle');
  await click([...inst.el.querySelectorAll('button')].find((b) => /canvas|building/i.test(b.textContent)));
  await inst.render();
}
async function beginAtlas(inst) {
  await setValue(inst.el.querySelector('[id="ca-topic"]'), 'the water cycle');
  await click([...inst.el.querySelectorAll('button')].find((b) => /atlas|map|start/i.test(b.textContent) && !/close|wrap/i.test(b.textContent)));
  await inst.render();
}
async function fillRealmPlay(inst, chips) {
  await click(inst.el.querySelector('[aria-label="Hand of cards"] button'));
  await click([...inst.el.querySelectorAll('[role="radio"]')].find((b) => b.textContent.includes('Place')));
  await setValue(inst.el.querySelector('textarea'), WRITING);
  for (const chip of chips) await click(inst.el.querySelector('[data-self-check-chip="' + chip + '"]'));
}
async function fillAtlasPlay(inst, chips) {
  // A strip offers existing nodes and new hand cards; either is a valid pick.
  const strip = (label) => [...inst.el.querySelectorAll('div')].find((d) => d.textContent === label).parentElement;
  await click(strip('1. From card').querySelector('button.ah-arcade-card'));
  await click(strip('2. To card').querySelector('button.ah-arcade-card'));
  await click([...inst.el.querySelectorAll('[role="radio"]')].find((b) => b.textContent.includes('Connects')));
  await setValue(inst.el.querySelector('textarea'), WRITING);
  for (const chip of chips) await click(inst.el.querySelector('[data-self-check-chip="' + chip + '"]'));
}
const lastCall = (spy) => spy.mock.calls[spy.mock.calls.length - 1][0];

// Pulls one real function out of the host module so tests run its actual text.
function hostFunction(name, deps) {
  const start = hostSrc.indexOf('function ' + name + '(');
  expect(start, name + ' exists').toBeGreaterThan(-1);
  let depth = 0;
  let end = hostSrc.indexOf('{', start);
  for (let i = end; i < hostSrc.length; i++) {
    if (hostSrc[i] === '{') depth++;
    else if (hostSrc[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  const names = Object.keys(deps);
  return new Function(...names, hostSrc.slice(start, end) + '\nreturn ' + name + ';')(...names.map((n) => deps[n]));
}
const hostT = (_k, fallback) => fallback;
const aiUsable = (kind, fn) => typeof fn === 'function' && !fn._alloQrBlocked && window.__alloStudentAiDisabled !== true;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  modes = {};
  mounted = [];
  window.AlloHavenArcade = {
    registerMode: (id, config) => { config.id = id; modes[id] = config; },
    isRegistered: (id) => !!modes[id]
  };
  vi.spyOn(console, 'log').mockImplementation(() => {});
  new Function(bossSrc)();
  new Function(realmSrc)();
  new Function(atlasSrc)();
  new Function(sageSrc)();
  window.__alloStudentAiDisabled = true;
});

afterEach(async () => {
  for (const inst of mounted) {
    await act(async () => { inst.root.unmount(); });
    inst.el.remove();
  }
  delete window.__alloStudentAiDisabled;
  delete window.__alloHavenRealmClassMode;
  delete window.__alloHavenAtlasClassMode;
  delete window.__alloHavenRealmResume;
  delete window.__alloHavenAtlasResume;
  delete window.AlloHavenArcade;
  vi.restoreAllMocks();
});

describe('which games are offered with AI off', () => {
  const modeOk = () => hostFunction('_arcadeModeAiOk', { _arcadeAiUsable: aiUsable });

  it('keeps Boss Encounter hidden and offers Realm Builder, Concept Atlas and Sage', () => {
    const off = { callGemini: blocked(), callImagen: blocked() };
    expect(modes['boss-encounter'].requiresAi).toBe('text');
    expect(modes['realm-builder'].requiresAi).toBeUndefined();
    expect(modes['concept-atlas'].requiresAi).toBeUndefined();
    expect(modes['realm-builder'].aiOffPath).toBe('self-check');
    expect(modes['concept-atlas'].aiOffPath).toBe('self-check');
    expect(modeOk()(modes['boss-encounter'], off)).toBe(false);
    expect(modeOk()(modes['realm-builder'], off)).toBe(true);
    expect(modeOk()(modes['concept-atlas'], off)).toBe(true);
    expect(modeOk()(modes['sage-launcher'], off)).toBe(true);
  });

  it('offers Boss Encounter again when AI is usable', () => {
    delete window.__alloStudentAiDisabled;
    expect(modeOk()(modes['boss-encounter'], { callGemini: vi.fn() })).toBe(true);
  });

  it('a boss submission with AI off never reaches a grader or pays', async () => {
    const callGemini = blocked();
    await expect(window.AlloHavenArcade.gradeCardJustification({ callGemini }, { justification: WRITING })).rejects.toThrow('AI grader unavailable');
    expect(callGemini).not.toHaveBeenCalled();
  });
});

describe('host launch and teacher-facing labels', () => {
  function launcher(callGemini, registry) {
    const state = { tokens: 2, earnings: [], arcade: { minutesPerToken: 5, session: null } };
    const setStateField = vi.fn((k, v) => { state[k] = v; });
    const charged = vi.fn(() => 'charged');
    window.AlloHavenArcade._registry = registry;
    const fn = hostFunction('launchSelfCheckArcadeMode', {
      state, setStateField, addToast: vi.fn(), props: { callGemini }, launchArcadeMode: charged, _arcadeAiUsable: aiUsable, __alloT: hostT
    });
    return { fn, state, charged };
  }

  it('starts a free session only for a self-check mode with AI off', () => {
    const { fn, state, charged } = launcher(blocked(), { 'realm-builder': { aiOffPath: 'self-check', label: 'Realm' } });
    expect(fn('realm-builder', 10)).toBe(true);
    expect(charged).not.toHaveBeenCalled();
    expect(state.tokens).toBe(2);
    expect(state.earnings).toEqual([]);
    expect(state.arcade.session.selfCheck).toBe(true);
    expect(state.arcade.session.classroomHosted).toBeUndefined();
  });

  it('cannot be used to skip the charge when grading works or for another mode', () => {
    delete window.__alloStudentAiDisabled;
    const on = launcher(vi.fn(), { 'realm-builder': { aiOffPath: 'self-check' } });
    expect(on.fn('realm-builder', 10)).toBe('charged');
    window.__alloStudentAiDisabled = true;
    const other = launcher(blocked(), { 'model-un': { requiresAi: 'text' } });
    expect(other.fn('model-un', 10)).toBe('charged');
  });

  it('labels self-rated, teacher-scored and AI-graded work differently', () => {
    const label = hostFunction('_arcadeScoreText', { __alloT: hostT });
    const self = label({ selfRated: true, score: null, selfCheckText: 'I gave a reason' }, true);
    expect(self).toBe('self-rated, not scored (I gave a reason)');
    expect(self).not.toMatch(/\d+\/20/);
    expect(label({ scoredBy: 'teacher', score: 14 }, true)).toBe('teacher score 14/20');
    expect(label({ score: 14 }, true)).toBe('score 14/20');
    expect(label({ score: 14 })).toBe('14/20');
  });

  it('routes every Realm and Atlas score in the host through that label', () => {
    expect(/'score ' \+ [ze]\.score|' · score ' \+ [ze]\.score|' · ' \+ [ze]\.score \+ '\/20'/.test(hostSrc)).toBe(false);
    expect(hostSrc.includes('onLaunchSelfCheck: function(minutes)')).toBe(true);
  });
});

describe('Realm Builder with AI off, solo', () => {
  it('launches with no tokens at all and never through the charged path', async () => {
    const ctx = baseCtx({ tokens: 0 });
    const inst = await mount('realm-builder', ctx);
    expect(inst.text()).toContain('no tokens are spent or earned');
    expect(inst.text()).not.toContain('evolves visually');
    await click(inst.el.querySelector('[aria-label="Start a new realm (solo)"]'));
    expect(ctx.onLaunchSelfCheck).toHaveBeenCalledWith(10);
    expect(ctx.onLaunch).not.toHaveBeenCalled();
  });

  it('asks for evidence, then records a self-rated zone with no score, tokens or AI call', async () => {
    const ctx = baseCtx({ session: session('realm-builder') });
    const inst = await mount('realm-builder', ctx);
    await beginRealm(inst);
    expect(ctx.callImagen).not.toHaveBeenCalled();
    expect(inst.el.querySelector('[role="alert"]')).toBeNull();
    expect(inst.el.querySelector('[data-realm-map]')).toBeTruthy();

    await fillRealmPlay(inst, []);
    const place = inst.button('Place into the realm');
    expect(place.disabled).toBe(true);
    await click(inst.el.querySelector('[data-self-check-chip="reason"]'));
    await click(inst.el.querySelector('[data-self-check-chip="example"]'));
    expect(inst.button('Place into the realm').disabled).toBe(false);
    await click(inst.button('Place into the realm'));

    const zone = lastCall(ctx.onRealmUpdate).zones[0];
    expect(zone.selfRated).toBe(true);
    expect(zone.score).toBeNull();
    expect(zone.resonant).toBe(false);
    expect(zone.selfCheck).toEqual(['reason', 'example']);
    expect(zone.selfCheckText).toContain('I gave a reason');
    expect(zone.scoredBy).toBeUndefined();
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(ctx.onAwardTokens).not.toHaveBeenCalled();
    expect(inst.text()).toContain('self-rated');
    expect(inst.text()).not.toMatch(/\d+\/20/);
    expect(inst.el.querySelector('[data-realm-map]').textContent).toContain(zone.cardName);
  });

  it('does not judge the writing: nonsense and strong text get the same treatment', async () => {
    const ctx = baseCtx({ session: session('realm-builder') });
    const inst = await mount('realm-builder', ctx);
    await beginRealm(inst);
    await fillRealmPlay(inst, ['named']);
    await setValue(inst.el.querySelector('textarea'), 'asdf asdf asdf asdf');
    await click(inst.button('Place into the realm'));
    const zone = lastCall(ctx.onRealmUpdate).zones[0];
    expect(zone.selfRated).toBe(true);
    expect(zone.score).toBeNull();
    expect(zone.selfCheck).toEqual(['named']);
  });

  it('cannot be farmed: 13 placements, past every milestone, pay nothing', async () => {
    const ctx = baseCtx({ session: session('realm-builder') });
    const inst = await mount('realm-builder', ctx);
    await beginRealm(inst);
    for (let i = 0; i < 13; i++) {
      await fillRealmPlay(inst, ['named', 'reason']);
      await click(inst.button('Place into the realm'));
    }
    const realm = lastCall(ctx.onRealmUpdate);
    expect(realm.zones).toHaveLength(13);
    expect(realm.milestones).toEqual([]);
    expect(ctx.onAwardTokens).not.toHaveBeenCalled();
    expect(ctx.tokens).toBe(10);
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(inst.text()).not.toContain('🪙');
  });
});

describe('Concept Atlas with AI off, solo', () => {
  it('launches with no tokens and never through the charged path', async () => {
    const ctx = baseCtx({ tokens: 0 });
    const inst = await mount('concept-atlas', ctx);
    expect(inst.text()).toContain('no tokens are spent or earned');
    await click(inst.el.querySelector('[aria-label="Start a new atlas"]'));
    expect(ctx.onLaunchSelfCheck).toHaveBeenCalledWith(10);
    expect(ctx.onLaunch).not.toHaveBeenCalled();
  });

  it('records a self-rated edge, draws the map, and 11 edges pay nothing', async () => {
    const ctx = baseCtx({ session: session('concept-atlas') });
    const inst = await mount('concept-atlas', ctx);
    await beginAtlas(inst);
    await fillAtlasPlay(inst, []);
    expect(inst.button('Add edge to atlas').disabled).toBe(true);
    await click(inst.el.querySelector('[data-self-check-chip="how_related"]'));
    await click(inst.button('Add edge to atlas'));
    const first = lastCall(ctx.onAtlasUpdate);
    expect(first.edges[0].selfRated).toBe(true);
    expect(first.edges[0].score).toBeNull();
    expect(first.edges[0].selfCheck).toEqual(['how_related']);
    expect(first.nodes.length).toBe(2);
    expect(inst.text()).toContain('self-rated');
    expect(inst.text()).not.toMatch(/\d+\/20/);
    for (let i = 0; i < 10; i++) {
      await fillAtlasPlay(inst, ['reason']);
      await click(inst.button('Add edge to atlas'));
    }
    const atlas = lastCall(ctx.onAtlasUpdate);
    expect(atlas.edges).toHaveLength(11);
    expect(atlas.milestones).toEqual([]);
    expect(ctx.onAwardTokens).not.toHaveBeenCalled();
    expect(ctx.callGemini).not.toHaveBeenCalled();
  });
});

describe('with AI on, grading is unchanged', () => {
  beforeEach(() => { delete window.__alloStudentAiDisabled; });
  const graded = (score) => vi.fn(() => Promise.resolve(JSON.stringify({ score, ackText: 'Nice', followUp: 'Why?' })));

  it('Realm: charged launch, no chips, graded zones, milestone tokens at 3 zones', async () => {
    const launcherCtx = baseCtx({ callGemini: graded(14), callImagen: null });
    const launcher = await mount('realm-builder', launcherCtx);
    await click(launcher.el.querySelector('[aria-label="Start a new realm (solo)"]'));
    expect(launcherCtx.onLaunch).toHaveBeenCalledWith(10);
    expect(launcherCtx.onLaunchSelfCheck).not.toHaveBeenCalled();

    const ctx = baseCtx({ session: session('realm-builder'), callGemini: graded(14), callImagen: null });
    const inst = await mount('realm-builder', ctx);
    await beginRealm(inst);
    for (let i = 0; i < 3; i++) {
      await fillRealmPlay(inst, []);
      expect(inst.el.querySelector('[data-self-check]')).toBeNull();
      await click(inst.button('Place into the realm'));
    }
    const realm = lastCall(ctx.onRealmUpdate);
    expect(ctx.callGemini).toHaveBeenCalledTimes(3);
    expect(realm.zones[0].score).toBe(14);
    expect(realm.zones[0].selfRated).toBeUndefined();
    expect(realm.milestones).toHaveLength(1);
    expect(ctx.onAwardTokens.mock.calls.map((c) => c[1])).toEqual(['realm-milestone']);
    expect(ctx.onAwardTokens.mock.calls.map((c) => c[0])).toEqual([2]);
    expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('+2 🪙'));
    expect(realm.milestones[0].tokensAwarded).toBe(2);
    expect(inst.text()).toContain('14/20');
  });

  it('Atlas: charged launch, graded edges, milestone tokens at 5 edges', async () => {
    const launcherCtx = baseCtx({ callGemini: graded(14) });
    const launcher = await mount('concept-atlas', launcherCtx);
    await click(launcher.el.querySelector('[aria-label="Start a new atlas"]'));
    expect(launcherCtx.onLaunch).toHaveBeenCalledWith(10);

    const ctx = baseCtx({ session: session('concept-atlas'), callGemini: graded(14) });
    const inst = await mount('concept-atlas', ctx);
    await beginAtlas(inst);
    for (let i = 0; i < 5; i++) {
      await fillAtlasPlay(inst, []);
      await click(inst.button('Add edge to atlas'));
    }
    const atlas = lastCall(ctx.onAtlasUpdate);
    expect(atlas.edges[0].score).toBe(14);
    expect(atlas.edges[0].selfRated).toBeUndefined();
    expect(ctx.onAwardTokens.mock.calls.map((c) => c[1])).toEqual(['atlas-milestone']);
    expect(ctx.onAwardTokens.mock.calls.map((c) => c[0])).toEqual([2]);
    expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('+2 🪙'));
  });

  it('a failed AI grade adds nothing and does not fall back to a pass', async () => {
    const ctx = baseCtx({ session: session('realm-builder'), callGemini: vi.fn(() => Promise.reject(new Error('503'))), callImagen: null });
    const inst = await mount('realm-builder', ctx);
    await beginRealm(inst);
    await fillRealmPlay(inst, []);
    await click(inst.button('Place into the realm'));
    expect(lastCall(ctx.onRealmUpdate).zones).toHaveLength(0);
    expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('Grading failed'));
    expect(ctx.onAwardTokens).not.toHaveBeenCalled();
  });

  it('self-rated zones from an earlier AI-off run do not count toward a paying milestone', async () => {
    const selfZone = (i) => ({ id: 'z' + i, cardId: 'c' + i, cardName: 'Card ' + i, verb: 'place', verbLabel: 'Place', score: null, selfRated: true });
    const old = { id: 'realm-old', name: 'Old', topic: 'water', canvas: 'data:image/png;base64,AAAA', zones: [selfZone(1), selfZone(2)], milestones: [] };
    window.__alloHavenRealmResume = { realmId: 'realm-old' };
    const ctx = baseCtx({ session: session('realm-builder'), callGemini: graded(14), callImagen: null, realms: [old] });
    const inst = await mount('realm-builder', ctx);
    await fillRealmPlay(inst, []);
    await click(inst.button('Place into the realm'));
    const realm = lastCall(ctx.onRealmUpdate);
    expect(realm.zones).toHaveLength(3);
    expect(realm.milestones).toEqual([]);
    expect(ctx.onAwardTokens).not.toHaveBeenCalled();
  });
});

describe('teacher scoring queue', () => {
  function classCtx(doc, extra) {
    return baseCtx(Object.assign({
      sessionCode: 'ABCD',
      sessionSubscribe: doc.subscribe,
      sessionUpdate: doc.update
    }, extra));
  }
  async function startRealmClass(doc) {
    window.__alloHavenRealmClassMode = { role: 'host', hostNickname: 'Ms. Lee' };
    const hostCtx = classCtx(doc, { session: session('realm-builder'), isHost: true, studentNickname: 'Ms. Lee', tokens: 0 });
    const host = await mount('realm-builder', hostCtx);
    await beginRealm(host);
    window.__alloHavenRealmClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true };
    const studentCtx = classCtx(doc, { session: session('realm-builder'), sessionParticipantId: 'p-1' });
    const student = await mount('realm-builder', studentCtx);
    return { host, hostCtx, student, studentCtx };
  }

  it('Realm: a no-AI class still opens for students, then round-trips through the teacher', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx, student, studentCtx } = await startRealmClass(doc);
    expect(doc.data.realmBuilder.noCanvas).toBe(true);

    await fillRealmPlay(student, ['named', 'reason']);
    await click(student.button('Send to your teacher'));
    const subs = doc.data.realmBuilder.submissions;
    const subId = Object.keys(subs)[0];
    expect(subs[subId].awaitingTeacher).toBe(true);
    expect(subs[subId].score).toBeNull();
    expect(subs[subId].cardImageBase64).toBeNull();
    expect(studentCtx.callGemini).not.toHaveBeenCalled();
    expect(studentCtx.onAwardTokens).not.toHaveBeenCalled();
    expect(student.text()).toContain('waiting for teacher');
    expect(student.text()).toContain('Waiting for your teacher: 1');

    // The host does not auto-apply it, and sees it labelled as self-rated.
    await host.render();
    expect(lastCall(hostCtx.onRealmUpdate).zones).toHaveLength(0);
    const item = host.el.querySelector('[data-teacher-item]');
    expect(item.textContent).toContain(WRITING);
    expect(item.textContent).toContain('Self-rated by the student, not a score:');
    expect(item.textContent).toContain('I gave a reason');

    await setValue(item.querySelector('input[type="text"]'), 'Good reason. Add where it happens.');
    await click(item.querySelector('[data-teacher-band="solid"]'));
    await host.render();

    const zone = lastCall(hostCtx.onRealmUpdate).zones[0];
    expect(zone.score).toBe(14);
    expect(zone.scoredBy).toBe('teacher');
    expect(zone.selfRated).toBeUndefined();
    expect(zone.selfCheck).toEqual(['named', 'reason']);
    expect(zone.ackText).toBe('Good reason. Add where it happens.');
    expect(doc.data.realmBuilder.submissions[subId]).toBeNull();
    expect(host.el.querySelector('[data-teacher-item]')).toBeNull();
    expect(host.text()).toContain('teacher 14/20');

    // The student sees the result and is paid once, however often it re-renders.
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
    expect(studentCtx.onAwardTokens).toHaveBeenCalledWith(1, 'realm-teacher-score', { teacherScoreKey: subId });
    await student.render();
    await student.render();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
    expect(student.text()).toContain('teacher 14/20');
    expect(student.text()).toContain('Good reason.');
  });

  it('Realm: teacher-scored zones pay the host the full class milestone', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx, student } = await startRealmClass(doc);
    for (let i = 0; i < 3; i++) {
      await fillRealmPlay(student, ['reason']);
      await click(student.button('Send to your teacher'));
      await host.render();
      await click(host.el.querySelector('[data-teacher-band="solid"]'));
      await host.render();
    }
    expect(hostCtx.onAwardTokens.mock.calls.filter((c) => c[1] === 'realm-milestone').map((c) => c[0])).toEqual([2]);
    expect(hostCtx.addToast).toHaveBeenCalledWith(expect.stringContaining('+2 🪙'));
  });

  it('a remounted student is not paid twice, and another student is not paid at all', async () => {
    const doc = makeSessionDoc();
    const { host, student, studentCtx } = await startRealmClass(doc);
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    await host.render();
    await click(host.el.querySelector('[data-teacher-band="strong"]'));
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);

    window.__alloHavenRealmClassMode = { role: 'student' };
    const again = await mount('realm-builder', Object.assign(studentCtx, {}));
    await again.render();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);

    window.__alloHavenRealmClassMode = { role: 'student' };
    const otherCtx = classCtx(doc, { session: session('realm-builder'), sessionParticipantId: 'p-2', studentNickname: 'Quiet Otter' });
    await mount('realm-builder', otherCtx);
    expect(otherCtx.onAwardTokens).not.toHaveBeenCalled();
  });

  it('"Not yet" adds the zone with its score and pays nothing', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx, student, studentCtx } = await startRealmClass(doc);
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    await host.render();
    await click(host.el.querySelector('[data-teacher-band="not_yet"]'));
    await host.render();
    expect(lastCall(hostCtx.onRealmUpdate).zones[0].score).toBe(8);
    expect(studentCtx.onAwardTokens).not.toHaveBeenCalled();
    expect(student.text()).toContain('teacher 8/20');
  });

  it('scores arriving together are all paid, one at a time', async () => {
    const doc = makeSessionDoc();
    const { student, studentCtx } = await startRealmClass(doc);
    const record = { participantId: 'p-1', nickname: 'Clever Dolphin', score: 14, tokens: 1, note: '', summary: 'x' };
    await act(async () => { await doc.update({ realmBuilder: { teacherScores: { a: record, b: record } } }); });
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
    await student.render();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(2);
    expect(studentCtx.onAwardTokens.mock.calls.map((c) => c[2].teacherScoreKey)).toEqual(['a', 'b']);
  });

  it('caps what one student can leave waiting', async () => {
    const doc = makeSessionDoc();
    const { student, studentCtx } = await startRealmClass(doc);
    for (let i = 0; i < 3; i++) {
      await fillRealmPlay(student, ['reason']);
      await click(student.button('Send to your teacher'));
    }
    expect(Object.keys(doc.data.realmBuilder.submissions)).toHaveLength(3);
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    expect(Object.keys(doc.data.realmBuilder.submissions)).toHaveLength(3);
    expect(studentCtx.addToast).toHaveBeenCalledWith(expect.stringContaining('You have 3 waiting'));
  });

  it('a failed save leaves the item queued for another try, with no zone', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx, student, studentCtx } = await startRealmClass(doc);
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    await host.render();
    doc.failNext = true;
    await click(host.el.querySelector('[data-teacher-band="solid"]'));
    await host.render();
    expect(lastCall(hostCtx.onRealmUpdate).zones).toHaveLength(0);
    expect(host.el.querySelector('[data-teacher-item]')).toBeTruthy();
    expect(hostCtx.addToast).toHaveBeenCalledWith('That score did not save. Try again.');
    await click(host.el.querySelector('[data-teacher-band="solid"]'));
    await host.render();
    expect(lastCall(hostCtx.onRealmUpdate).zones).toHaveLength(1);
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
  });

  it('an AI-graded class submission is still applied without the teacher', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx } = await startRealmClass(doc);
    await act(async () => {
      await doc.update({ realmBuilder: { submissions: { g1: {
        subId: 'g1', nickname: 'Graded', cardId: 'c', cardName: 'Runoff', cardSource: 'glossary', verb: 'place', verbLabel: 'Place',
        justification: WRITING, score: 12, ackText: '', followUp: '', submittedAt: '2026-11-04T00:00:00.000Z'
      } } } });
    });
    await host.render();
    const zone = lastCall(hostCtx.onRealmUpdate).zones[0];
    expect(zone.score).toBe(12);
    expect(zone.scoredBy).toBeUndefined();
    expect(host.el.querySelector('[data-teacher-item]')).toBeNull();
  });

  it('a teacher playing with AI off gets self-rated zones that do not reach class milestones', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx } = await startRealmClass(doc);
    for (let i = 0; i < 3; i++) {
      await fillRealmPlay(host, ['reason']);
      await click(host.button('Place into the realm'));
    }
    const realm = lastCall(hostCtx.onRealmUpdate);
    expect(realm.zones.every((z) => z.selfRated)).toBe(true);
    expect(realm.milestones).toEqual([]);
    expect(hostCtx.onAwardTokens).not.toHaveBeenCalled();
  });

  it('Atlas: round-trips through the teacher, and self-rated edges never unlock the class reward', async () => {
    const doc = makeSessionDoc();
    window.__alloHavenAtlasClassMode = { role: 'host', hostNickname: 'Ms. Lee' };
    const hostCtx = classCtx(doc, { session: session('concept-atlas'), isHost: true, studentNickname: 'Ms. Lee' });
    const host = await mount('concept-atlas', hostCtx);
    await beginAtlas(host);
    window.__alloHavenAtlasClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true };
    const studentCtx = classCtx(doc, { session: session('concept-atlas'), sessionParticipantId: 'p-1' });
    const student = await mount('concept-atlas', studentCtx);

    await fillAtlasPlay(student, ['named_both', 'how_related']);
    await click(student.button('Send to your teacher'));
    const subId = Object.keys(doc.data.conceptAtlas.submissions)[0];
    expect(doc.data.conceptAtlas.submissions[subId].awaitingTeacher).toBe(true);
    expect(studentCtx.callGemini).not.toHaveBeenCalled();
    await host.render();
    expect(lastCall(hostCtx.onAtlasUpdate).edges).toHaveLength(0);

    await click(host.el.querySelector('[data-teacher-band="strong"]'));
    await host.render();
    const edge = lastCall(hostCtx.onAtlasUpdate).edges[0];
    expect(edge.score).toBe(19);
    expect(edge.scoredBy).toBe('teacher');
    expect(edge.selfRated).toBeUndefined();
    expect(edge.selfCheck).toEqual(['named_both', 'how_related']);
    expect(doc.data.conceptAtlas.submissions[subId]).toBeNull();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledWith(1, 'atlas-teacher-score', { teacherScoreKey: subId });
    expect(student.text()).toContain('teacher 19/20');

    for (let i = 0; i < 6; i++) {
      await fillAtlasPlay(host, ['reason']);
      await click(host.button('Add edge to atlas'));
    }
    await click(host.button('Wrap up'));
    await host.render();
    expect(lastCall(hostCtx.onAtlasUpdate).isComplete).toBe(true);
    expect(doc.data.conceptAtlas.classRewardKey).toBeUndefined();
    expect(hostCtx.onAwardTokens).not.toHaveBeenCalled();
  });
});

// Same calls the app's window.__alloFirebase exposes, over an in-memory collection.
function makePrivateFirestore() {
  const store = new Map();
  const listeners = new Set();
  const fake = {
    store,
    db: { fake: true },
    refusal: null,
    sendRefusal: null,
    sessionFlag: null,
    calls: [],
    doc: (_db, ...path) => (path.length === 6 && fake.sessionFlag ? { [fake.sessionFlag]: 'session', id: path[5] } : { path: path.join('/'), id: path[path.length - 1] }),
    collection: (_db, ...path) => ({ col: path.join('/') }),
    where: (field, op, value) => ({ field, op, value }),
    query: (col, filter) => ({ col: col.col, filter }),
    getDocs: (q) => Promise.resolve(snapshot(q)),
    setDoc: (ref, data) => {
      fake.calls.push(['set', ref.id]);
      if (fake.sendRefusal) return Promise.reject(fake.sendRefusal);
      if (hasUndefined(data)) return Promise.reject(new Error('undefined in Firestore payload'));
      store.set(ref.path, { id: ref.id, data });
      notify();
      return Promise.resolve();
    },
    updateDoc: (ref, patch) => {
      fake.calls.push(['update', ref.id]);
      store.set(ref.path, { id: ref.id, data: Object.assign({}, store.get(ref.path).data, patch) });
      notify();
      return Promise.resolve();
    },
    deleteDoc: (ref) => {
      fake.calls.push(['delete', ref.id]);
      store.delete(ref.path);
      notify();
      return Promise.resolve();
    },
    onSnapshot: (target, onNext, onError) => {
      if (fake.refusal) { onError(fake.refusal); return () => {}; }
      const listener = { target, onNext };
      listeners.add(listener);
      onNext(snapshot(target));
      return () => listeners.delete(listener);
    },
    docs: () => [...store.values()].map((entry) => entry.data)
  };
  function snapshot(target) {
    const rows = [...store.values()].filter((entry) => !target.filter || entry.data[target.filter.field] === target.filter.value);
    return { forEach: (fn) => rows.forEach((entry) => fn({ id: entry.id, data: () => entry.data })) };
  }
  function notify() { listeners.forEach((l) => l.onNext(snapshot(l.target))); }
  return fake;
}

describe('class work on private documents', () => {
  const REFUSED = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  let fb;
  beforeEach(() => {
    fb = makePrivateFirestore();
    window.__alloFirebase = fb;
  });
  afterEach(() => { delete window.__alloFirebase; });

  function ctxFor(doc, extra) {
    return baseCtx(Object.assign({
      sessionCode: 'ABCD',
      firestoreDb: fb.db,
      firestoreAppId: 'app',
      sessionSubscribe: doc.subscribe,
      sessionUpdate: doc.update
    }, extra));
  }
  async function startRealm(doc, studentExtra) {
    window.__alloHavenRealmClassMode = { role: 'host', hostNickname: 'Ms. Lee' };
    const hostCtx = ctxFor(doc, { session: session('realm-builder'), isHost: true, studentNickname: 'Ms. Lee', sessionParticipantId: 'teacher', tokens: 0 });
    const host = await mount('realm-builder', hostCtx);
    await beginRealm(host);
    window.__alloHavenRealmClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true };
    const studentCtx = ctxFor(doc, Object.assign({ session: session('realm-builder'), sessionParticipantId: 'kid-1' }, studentExtra));
    const student = await mount('realm-builder', studentCtx);
    return { host, hostCtx, student, studentCtx };
  }
  const writesWith = (doc, field) => doc.writes.filter((w) => JSON.stringify(w).includes(field));

  it('Realm: writing and the teacher note never touch the shared session document', async () => {
    const doc = makeSessionDoc();
    const { host, hostCtx, student, studentCtx } = await startRealm(doc);

    await fillRealmPlay(student, ['named', 'reason']);
    await click(student.button('Send to your teacher'));

    const sent = fb.docs()[0];
    expect(sent.uid).toBe('kid-1');
    expect(sent.activity).toBe('realm');
    expect(sent.awaitingTeacher).toBe(true);
    expect(sent.justification).toBe(WRITING);
    expect(sent.score).toBeUndefined();
    expect(sent.teacherScore).toBeUndefined();
    expect(sent.expiresAt).toBeInstanceOf(Date);
    expect([...fb.store.keys()][0]).toMatch(/\/sessions\/ABCD\/arcadeSubmissions\/kid-1_rs-/);
    expect(writesWith(doc, WRITING)).toEqual([]);
    expect(student.text()).toContain('Waiting for your teacher: 1');

    await host.render();
    expect(lastCall(hostCtx.onRealmUpdate).zones).toHaveLength(0);
    const item = host.el.querySelector('[data-teacher-item]');
    expect(item.textContent).toContain(WRITING);
    await setValue(item.querySelector('input[type="text"]'), 'Good reason.');
    await click(item.querySelector('[data-teacher-band="solid"]'));
    await host.render();

    const zone = lastCall(hostCtx.onRealmUpdate).zones[0];
    expect(zone.score).toBe(14);
    expect(zone.scoredBy).toBe('teacher');
    expect(host.el.querySelector('[data-teacher-item]')).toBeNull();
    expect(writesWith(doc, 'Good reason.')).toEqual([]);
    expect(fb.docs()[0].teacherScore.score).toBe(14);

    await student.render();
    await student.render();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
    expect(studentCtx.onAwardTokens).toHaveBeenCalledWith(1, 'realm-teacher-score', { teacherScoreKey: fb.docs()[0] && [...fb.store.values()][0].id });
    expect(student.text()).toContain('teacher 14/20');
    expect(student.text()).toContain('Good reason.');

    await click(host.button('Wrap up') || host.button('End') || host.button('Finish'));
    await host.render();
    expect(fb.store.size).toBe(0);
  });

  it('Realm: a classmate sees only their own work, and the limit of 3 waiting still holds', async () => {
    const doc = makeSessionDoc();
    const { student } = await startRealm(doc);
    await fb.setDoc({ path: 'x/other_rs-1', id: 'other_rs-1' }, { uid: 'other', activity: 'realm', awaitingTeacher: true, justification: 'not yours', cardName: 'A', verb: 'place' });
    await student.render();
    expect(student.text()).not.toContain('not yours');
    expect(student.text()).not.toContain('Waiting for your teacher');
    for (let i = 0; i < 3; i++) {
      await fillRealmPlay(student, ['reason']);
      await click(student.button('Send to your teacher'));
    }
    expect(student.text()).toContain('Waiting for your teacher: 3');
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    expect(fb.docs().filter((d) => d.uid === 'kid-1')).toHaveLength(3);
  });

  it('Realm: when the rules refuse, both sides are told and nothing claims to be sent', async () => {
    fb.refusal = REFUSED;
    const doc = makeSessionDoc();
    const { host, student } = await startRealm(doc);
    expect(host.el.querySelector('[data-class-notice="rules"]').textContent).toContain('publish the latest rules');
    expect(student.el.querySelector('[data-class-notice="rules"]').textContent).toContain('Let your teacher know');
    await fillRealmPlay(student, ['reason']);
    expect(student.button('Send to your teacher').disabled).toBe(true);
    expect(fb.calls).toEqual([]);
  });

  it('Realm: a refused send keeps the writing and says why', async () => {
    const doc = makeSessionDoc();
    const { student, studentCtx } = await startRealm(doc);
    fb.sendRefusal = REFUSED;
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    expect(studentCtx.addToast).toHaveBeenCalledWith(expect.stringContaining('it was not sent'));
    expect(student.el.querySelector('textarea').value).toBe(WRITING);
    expect(student.text()).not.toContain('waiting for teacher');

    fb.sendRefusal = new Error('offline');
    await click(student.button('Send to your teacher'));
    expect(studentCtx.addToast).toHaveBeenCalledWith(expect.stringContaining('Check your connection'));
    expect(student.el.querySelector('textarea').value).toBe(WRITING);
  });

  for (const flag of ['__alloLanRef', '__alloMbRef']) {
    it('Realm: ' + flag + ' classes are told plainly and never write', async () => {
      fb.sessionFlag = flag;
      const doc = makeSessionDoc();
      const { host, student } = await startRealm(doc);
      expect(host.el.querySelector('[data-class-notice="transport"]').textContent).toContain('Class Mailbox');
      expect(student.el.querySelector('[data-class-notice="transport"]').textContent).toContain('play on your own');
      await fillRealmPlay(student, ['reason']);
      expect(student.button('Send to your teacher').disabled).toBe(true);
      expect(fb.calls).toEqual([]);
    });
  }

  it('Realm with AI on: the graded play reaches the teacher privately, then is removed', async () => {
    delete window.__alloStudentAiDisabled;
    const graded = vi.fn(() => Promise.resolve(JSON.stringify({ score: 15, ackText: 'Nice', followUp: 'Why?' })));
    const doc = makeSessionDoc();
    const { hostCtx, student } = await startRealm(doc, { callGemini: graded, callImagen: null });
    await fillRealmPlay(student, []);
    await click(student.button('Place into the realm'));
    expect(graded).toHaveBeenCalledTimes(1);
    expect(fb.calls.map((c) => c[0])).toEqual(['set', 'delete']);
    expect(fb.store.size).toBe(0);
    expect(lastCall(hostCtx.onRealmUpdate).zones[0].score).toBe(15);
    expect(writesWith(doc, WRITING)).toEqual([]);
  });

  it('a card image too large for its document is dropped, not refused', () => {
    const kit = window.AlloHavenArcade.classWork;
    const chan = kit.channel(baseCtx({ sessionCode: 'ABCD', firestoreDb: fb.db, firestoreAppId: 'app', sessionParticipantId: 'kid-1' }));
    chan.send('realm', 'rs-1', { cardImageBase64: 'x'.repeat(400001), submittedAt: 't', score: 99, justification: 'y'.repeat(5000), cardSource: undefined, partnerCardId: null });
    const sent = fb.docs()[0];
    expect(sent.cardImageBase64).toBeUndefined();
    expect(sent.score).toBe(20);
    expect(sent.justification).toHaveLength(4000);
    expect('cardSource' in sent).toBe(false);
    expect('partnerCardId' in sent).toBe(false);
  });

  it('Atlas: writing stays private, and the teacher score round-trips', async () => {
    const doc = makeSessionDoc();
    window.__alloHavenAtlasClassMode = { role: 'host', hostNickname: 'Ms. Lee' };
    const hostCtx = ctxFor(doc, { session: session('concept-atlas'), isHost: true, studentNickname: 'Ms. Lee', sessionParticipantId: 'teacher', tokens: 0 });
    const host = await mount('concept-atlas', hostCtx);
    await beginAtlas(host);
    window.__alloHavenAtlasClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true };
    const studentCtx = ctxFor(doc, { session: session('concept-atlas'), sessionParticipantId: 'kid-1' });
    const student = await mount('concept-atlas', studentCtx);

    await fillAtlasPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    const sent = fb.docs()[0];
    expect(sent.activity).toBe('atlas');
    expect(sent.justification).toBe(WRITING);
    expect(writesWith(doc, WRITING)).toEqual([]);

    await host.render();
    const item = host.el.querySelector('[data-teacher-item]');
    expect(item.textContent).toContain(WRITING);
    await click(item.querySelector('[data-teacher-band="strong"]'));
    await host.render();
    expect(lastCall(hostCtx.onAtlasUpdate).edges[0].scoredBy).toBe('teacher');
    expect(host.el.querySelector('[data-teacher-item]')).toBeNull();
    await student.render();
    expect(studentCtx.onAwardTokens).toHaveBeenCalledTimes(1);
  });

  it('Atlas: when the rules refuse, the send button stays off', async () => {
    fb.refusal = REFUSED;
    const doc = makeSessionDoc();
    window.__alloHavenAtlasClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true };
    await doc.update({ conceptAtlas: { status: 'open', topic: 'the water cycle', nodes: [], edges: [] } });
    const student = await mount('concept-atlas', ctxFor(doc, { session: session('concept-atlas'), sessionParticipantId: 'kid-1' }));
    await student.render();
    expect(student.el.querySelector('[data-class-notice="rules"]')).toBeTruthy();
  });

  it('other class games say why a refused write did not send', () => {
    const kit = window.AlloHavenArcade.classWork;
    expect(kit.message(REFUSED)).toContain('it was not sent');
    expect(kit.message(new Error('offline'))).toContain('Check your connection');
    expect(bossSrc).toContain('ctx.addToast(classSendMessage(err));');
    expect(realmSrc).toContain("ctx.addToast(kit ? kit.message(err) : 'Could not send that contribution. Try again.');");
    expect(readFileSync('arcade_mode_modelun.js', 'utf8')).toContain("ctx.addToast(kit ? kit.message(err) : 'That did not send. Check your connection and try again.');");
  });

  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  it('Boss: a Spark stays private and the host relays only score and damage', async () => {
    window.__alloStudentAiDisabled = false;
    const gemini = () => Promise.resolve(JSON.stringify({ score: 15, ackText: 'NOTE-ACK', followUp: 'NOTE-FOLLOW' }));
    const doc = makeSessionDoc();
    doc.data.bossEncounter = { status: 'open', startedAt: 'enc-1', topic: 'the water cycle', currentRound: 1, roundStartedAt: new Date().toISOString(), roundDurationMs: 60000 };
    window.__alloHavenBossClassMode = { role: 'host', hostNickname: 'Ms. Lee', startedAt: 'enc-1' };
    await mount('boss-encounter', ctxFor(doc, { session: session('boss-encounter'), isHost: true, studentNickname: 'Ms. Lee', sessionParticipantId: 'teacher', callGemini: gemini }));
    window.__alloHavenBossClassMode = { role: 'student', hostNickname: 'Ms. Lee', joinFromSession: true, encounterTopic: 'the water cycle', encounterBossImage: null };
    const student = await mount('boss-encounter', ctxFor(doc, { session: session('boss-encounter'), sessionParticipantId: 'kid-1', callGemini: gemini }));
    await click(student.el.querySelector('button.ah-arcade-card'));
    await click(student.button('Illuminate'));
    await setValue(student.el.querySelector('#be-just'), WRITING);
    await click([...student.el.querySelectorAll('button')].filter((b) => b.textContent.includes('Spark')).pop());
    await flush();
    await flush();

    const sent = fb.docs()[0];
    expect(sent.activity).toBe('boss');
    expect(sent.justification).toBe(WRITING);
    expect(sent.damage).toBeUndefined();
    const id = [...fb.store.values()][0].id;
    const relayed = doc.data.bossEncounter.submissions[id];
    expect(relayed.score).toBe(15);
    expect(relayed.damage).toBe(10);
    const shared = JSON.stringify(doc.data);
    expect(shared).not.toContain(WRITING);
    expect(shared).not.toContain('NOTE-ACK');
    expect(shared).not.toContain('NOTE-FOLLOW');
  });

  it('Boss: damage comes from the bounded score, not from the document', async () => {
    window.__alloStudentAiDisabled = false;
    const doc = makeSessionDoc();
    doc.data.bossEncounter = { status: 'open', startedAt: 'enc-2', topic: 't', currentRound: 1 };
    fb.store.set('x/kid-9_spark-1', { id: 'kid-9_spark-1', data: { uid: 'kid-9', activity: 'boss', encounterKey: 'enc-2', score: 12, damage: 999, round: 1, nickname: 'K', cardName: 'C', verb: 'V' } });
    window.__alloHavenBossClassMode = { role: 'host', hostNickname: 'Ms. Lee', startedAt: 'enc-2' };
    await mount('boss-encounter', ctxFor(doc, { session: session('boss-encounter'), isHost: true, studentNickname: 'Ms. Lee', sessionParticipantId: 'teacher' }));
    await flush();
    expect(doc.data.bossEncounter.submissions['kid-9_spark-1'].damage).toBe(7);
  });

  function openPalace(doc) {
    doc.data.collaborativeMemoryPalace = {
      status: 'open', activityId: 'palace-1', title: 'Cell City', topic: 'Cells',
      groups: [{ id: 'g1', title: 'Team A' }], rooms: [{ id: 'r1', groupId: 'g1', title: 'Hall' }], loci: [], participants: {}, submissions: {}
    };
  }
  async function startPalace(doc) {
    openPalace(doc);
    window.__alloHavenPalaceClassMode = { role: 'host', hostNickname: 'Ms. Lee' };
    const host = await mount('class-memory-palace', ctxFor(doc, { session: session('class-memory-palace'), isHost: true, studentNickname: 'Ms. Lee', sessionParticipantId: 'teacher' }));
    window.__alloHavenPalaceClassMode = { role: 'student', hostNickname: 'Ms. Lee' };
    const student = await mount('class-memory-palace', ctxFor(doc, { session: session('class-memory-palace'), sessionParticipantId: 'kid-1' }));
    await flush();
    await flush();
    return { host, student };
  }
  async function proposeAnchor(student, text) {
    await setValue(student.el.querySelector('fieldset input'), 'Power plant');
    await setValue(student.el.querySelector('fieldset textarea'), text);
    await click(student.button('Send for teacher review'));
    await flush();
  }

  it('Palace: the teacher seats a join request and only approved anchors reach the session', async () => {
    const doc = makeSessionDoc();
    const { host, student } = await startPalace(doc);
    expect(doc.data.collaborativeMemoryPalace.participants['kid-1'].groupId).toBe('g1');
    expect(fb.docs()).toHaveLength(0);

    await proposeAnchor(student, 'PENDING-TEXT stores energy');
    const sent = fb.docs()[0];
    expect(sent.activity).toBe('palace');
    expect(sent.kind).toBe('contribution');
    expect(sent.uid).toBe('kid-1');
    expect(JSON.stringify(doc.data)).not.toContain('PENDING-TEXT');

    await flush();
    await click([...host.el.querySelectorAll('button')].find((b) => /approve/i.test(b.textContent)));
    await flush();
    expect(doc.data.collaborativeMemoryPalace.loci[0].mnemonic).toBe('PENDING-TEXT stores energy');
    expect(fb.docs()[0].status).toBe('approved');
  });

  it('Palace: feedback stays private and a revision replaces the returned draft', async () => {
    const doc = makeSessionDoc();
    const { host, student } = await startPalace(doc);
    await proposeAnchor(student, 'FIRST-DRAFT stores energy');
    await flush();
    await setValue([...host.el.querySelectorAll('textarea')].pop(), 'FEEDBACK-TEXT name the room');
    await click([...host.el.querySelectorAll('button')].find((b) => /return/i.test(b.textContent)));
    await flush();
    expect(fb.docs()[0].status).toBe('returned');
    expect(JSON.stringify(doc.data)).not.toContain('FEEDBACK-TEXT');
    expect(student.text()).toContain('FEEDBACK-TEXT');

    await click(student.button('Revise and resubmit'));
    await setValue(student.el.querySelector('fieldset textarea'), 'SECOND-DRAFT stores energy');
    await click(student.button('Send revised contribution'));
    await flush();
    await flush();
    const left = fb.docs();
    expect(left).toHaveLength(1);
    expect(left[0].mnemonic).toBe('SECOND-DRAFT stores energy');
  });

  it('Palace: refused rules and LAN both disable sending and say why', async () => {
    fb.refusal = REFUSED;
    const doc = makeSessionDoc();
    const { student } = await startPalace(doc);
    expect(student.el.querySelector('[data-class-notice="rules"]')).toBeTruthy();
    expect(student.el.querySelector('fieldset').disabled).toBe(true);
    fb.refusal = null;
    fb.sessionFlag = '__alloLanRef';
    const lanDoc = makeSessionDoc();
    const lan = await startPalace(lanDoc);
    expect(lan.student.el.querySelector('[data-class-notice="transport"]')).toBeTruthy();
    expect(lan.student.el.querySelector('fieldset').disabled).toBe(true);
    expect(lanDoc.data.collaborativeMemoryPalace.participants['kid-1']).toBeUndefined();
  });

  it('older hosts without the SDK keep the session document', async () => {
    delete window.__alloFirebase;
    const doc = makeSessionDoc();
    const { student } = await startRealm(doc);
    await fillRealmPlay(student, ['reason']);
    await click(student.button('Send to your teacher'));
    expect(Object.keys(doc.data.realmBuilder.submissions)).toHaveLength(1);
  });
});

describe('short-deck hint with AI off', () => {
  it('Realm and Atlas no longer tell a student to generate a glossary', () => {
    for (const source of [realmSrc, atlasSrc]) {
      const at = source.indexOf("arcade.self_check.need_more_cards");
      expect(at).toBeGreaterThan(-1);
      expect(source.slice(at - 24, at).includes('aiOff ? ')).toBe(true);
    }
  });
});
