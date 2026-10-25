import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const SAVED = { id: 'shared-observation', targetKey: 'm104', surveyId: 'P/2MASS/color', catalogId: 'none', note: 'Original evidence about the dust lane.' };
const DRAFT = 'Revised evidence about the central dust lane.';
const NEW_NOTE = 'New evidence recorded in this atlas view.';
const SKY_ACTIONS = ['edit', 'cancel', 'save', 'remove', 'undo', 'open', 'new-save'];
const BOOK = { mission: 'dust', entries: { dust: { prediction: 'dust', visited: [true, false], notes: ['Saved first-view note.', 'Saved second-view note.'], explanation: 'Keep my explanation.', checked: false, context: null } } };
const EVIDENCE_ACTIONS = { observe: '[data-galaxy-evidence-observe="1"]', open: '[data-galaxy-evidence-open-model]', record: '[data-galaxy-evidence-return-note]' };

describe('Galaxy evidence workflow focus', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    // Exercise the real interactive canvas rather than the no-WebGL recovery
    // illustration. Three itself remains pending because these are focus tests.
    const canvasPrototype = window.HTMLCanvasElement.prototype, get2DContext = canvasPrototype.getContext;
    canvasPrototype.getContext = function (kind) {
      if (typeof kind === 'string' && /webgl/i.test(kind)) return { getExtension() { return null; }, getParameter() { return 'stub-renderer'; } };
      return get2DContext.apply(this, arguments);
    };
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Date, 'now').mockReturnValue(1800000000000);
    // Flush zero-delay legacy focus timers alongside the new frame, rather than
    // accidentally passing because an old callback never ran during the test.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers();
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => { vi.advanceTimersByTime(0); loops.step(); }); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null, setData: null, announce: vi.fn() };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'realSky', galaxyAutoRotate: false, realSkyTarget: 'm42', realSkySurvey: SAVED.surveyId, realSkyCatalog: 'none', realSkyObservations: [{ ...SAVED }], realSkyEvidenceNote: NEW_NOTE, ...data } });
      instance.state = pair[0]; instance.setData = pair[1];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1], announceToSR: instance.announce }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function activate(control, focused = true) {
    expect(control).not.toBeNull(); expect(control.disabled).not.toBe(true);
    if (focused) control.focus(); await act(() => control.click()); return control;
  }
  async function type(control, value) {
    expect(control).not.toBeNull();
    await act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(control, value);
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(control.value).toBe(value);
  }
  function row(instance, id = SAVED.id) { return [...instance.host.querySelectorAll('[data-galaxy-real-sky-observation-id]')].find(node => node.getAttribute('data-galaxy-real-sky-observation-id') === id); }
  const editor = instance => instance.host.querySelector('[data-galaxy-real-sky-observation-editor-input]');
  const undo = instance => instance.host.querySelector('[data-galaxy-real-sky-observation-undo-button]');
  function skyTrigger(instance, action) {
    if (action === 'new-save') return instance.host.querySelector('[data-galaxy-real-sky-save-observation]');
    if (action === 'undo') return undo(instance);
    if (action === 'save' || action === 'cancel') return [...instance.host.querySelectorAll('[data-galaxy-real-sky-observation-editor] button')].find(button => button.textContent === (action === 'save' ? 'Save changes' : 'Cancel'));
    return row(instance).querySelector('[data-galaxy-real-sky-observation-' + (action === 'open' ? 'open' : action === 'remove' ? 'remove' : 'edit') + '-button]');
  }
  function skyDestination(instance, action) {
    if (action === 'edit') return editor(instance);
    if (action === 'remove') return undo(instance);
    if (action === 'cancel' || action === 'save') return row(instance).querySelector('[data-galaxy-real-sky-observation-edit-button]');
    return row(instance, action === 'new-save' ? instance.state.galaxy.realSkyObservations[0].id : SAVED.id);
  }
  async function prepareSky(action, data = {}) {
    const instance = await mount(data); outside.focus();
    if (action === 'save' || action === 'cancel') { await activate(skyTrigger(instance, 'edit'), false); await frame(); await type(editor(instance), DRAFT); }
    if (action === 'undo') { await activate(skyTrigger(instance, 'remove'), false); await frame(); }
    return instance;
  }
  function verifySky(instance, action) {
    const entries = instance.state.galaxy.realSkyObservations;
    if (action === 'remove') { expect(entries).toEqual([]); expect(instance.announce.mock.calls.flat().join(' ')).toContain('removed'); }
    else if (action === 'new-save') {
      expect(entries).toHaveLength(2); expect(entries[0].note).toBe(NEW_NOTE); expect(entries[1]).toEqual(SAVED);
      expect(instance.state.galaxy.realSkyEvidenceNote).toBe(''); expect(instance.announce.mock.calls.flat().join(' ')).toContain('Observation saved');
    } else {
      expect(entries).toEqual([{ ...SAVED, note: action === 'save' ? DRAFT : SAVED.note }]);
      if (action === 'edit') expect(editor(instance).value).toBe(SAVED.note);
      if (action === 'cancel' || action === 'save') expect(editor(instance)).toBeNull();
      if (action === 'save') expect(instance.announce.mock.calls.flat().join(' ')).toContain('changes saved');
      if (action === 'undo') { expect(undo(instance)).toBeNull(); expect(instance.announce.mock.calls.flat().join(' ')).toContain('restored'); }
      if (action === 'open') expect(instance.state.galaxy.realSkyTarget).toBe(SAVED.targetKey);
      expect(instance.state.galaxy.realSkyEvidenceNote).toBe(NEW_NOTE);
    }
  }
  async function competingSky(action) {
    const first = await prepareSky(action === 'edit' ? 'cancel' : action === 'remove' ? 'undo' : 'open');
    if (action === 'new-save') { outside.focus(); await activate(skyTrigger(first, action), false); await frame(); }
    return first;
  }
  function skySnapshot(instance) { return { observations: instance.state.galaxy.realSkyObservations, compose: instance.state.galaxy.realSkyEvidenceNote, draft: editor(instance)?.value }; }

  it.each(SKY_ACTIONS)('preserves data and moves focused Real Sky %s to a meaningful destination', async action => {
    const instance = await prepareSky(action); await activate(skyTrigger(instance, action)); await frame();
    expect(document.activeElement).toBe(skyDestination(instance, action)); verifySky(instance, action);
  });
  it.each(SKY_ACTIONS)('respects focus moved outside before the Real Sky %s handoff', async action => {
    const instance = await prepareSky(action); await activate(skyTrigger(instance, action)); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); verifySky(instance, action);
  });
  it.each(['edit', 'remove', 'open', 'new-save'])('does not move focus for unfocused Real Sky %s activation', async action => {
    const instance = await prepareSky(action); outside.focus(); await activate(skyTrigger(instance, action), false); await frame();
    expect(document.activeElement).toBe(outside); verifySky(instance, action);
  });
  it.each(SKY_ACTIONS)('scopes Real Sky %s to the initiating instance when IDs repeat across tools', async action => {
    const first = await competingSky(action), firstState = skySnapshot(first);
    const second = await prepareSky(action); await activate(skyTrigger(second, action)); await frame();
    expect(document.activeElement).toBe(skyDestination(second, action)); expect(skySnapshot(first)).toEqual(firstState); verifySky(second, action);
  });
  it.each(['edit', 'remove', 'new-save'])('cancels deferred Real Sky %s focus on teardown', async action => {
    const first = await competingSky(action), firstState = skySnapshot(first), second = await prepareSky(action);
    await activate(skyTrigger(second, action)); await act(() => second.root.unmount()); second.root = null; second.host.remove(); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); expect(skySnapshot(first)).toEqual(firstState);
  });
  it.each([undefined, 'duplicate', ' padded-id '])('opens the correct legacy row with absent, ambiguous or untrimmed ID %j', async id => {
    const observations = [{ ...SAVED, id, note: 'First legacy evidence note.' }, { ...SAVED, id, note: 'Second legacy evidence note.' }];
    const instance = await mount({ realSkyObservations: observations }), rows = [...instance.host.querySelectorAll('[data-galaxy-real-sky-observation-id]')];
    await activate(rows[1].querySelector('[data-galaxy-real-sky-observation-open-button]')); await frame();
    expect(document.activeElement).toBe(instance.host.querySelectorAll('[data-galaxy-real-sky-observation-id]')[1]);
    expect(instance.state.galaxy.realSkyObservations).toEqual(observations);
  });
  it('normalizes legacy IDs before editing and returns focus to the repaired row on cancel', async () => {
    const observations = [{ ...SAVED, id: undefined }, { ...SAVED, id: undefined, note: 'Second legacy evidence note.' }];
    const instance = await mount({ realSkyObservations: observations }), rows = instance.host.querySelectorAll('[data-galaxy-real-sky-observation-id]');
    await activate(rows[1].querySelector('[data-galaxy-real-sky-observation-edit-button]')); await frame();
    const ids = instance.state.galaxy.realSkyObservations.map(entry => entry.id);
    expect(ids.every(Boolean)).toBe(true); expect(new Set(ids).size).toBe(2); expect(document.activeElement).toBe(editor(instance));
    await type(editor(instance), DRAFT); await activate(skyTrigger(instance, 'cancel')); await frame();
    expect(document.activeElement).toBe(row(instance, ids[1]).querySelector('[data-galaxy-real-sky-observation-edit-button]'));
    expect(instance.state.galaxy.realSkyObservations.map(entry => entry.note)).toEqual(observations.map(entry => entry.note));
  });
  it('returns an unavailable Undo to the notebook heading without duplicating restored data', async () => {
    const instance = await prepareSky('undo');
    await act(() => instance.setData(previous => ({ ...previous, galaxy: { ...previous.galaxy, realSkyObservations: [{ ...SAVED, note: 'Externally restored evidence note.' }] } })));
    await activate(undo(instance)); await frame();
    expect(document.activeElement).toBe(instance.host.querySelector('[data-galaxy-real-sky-notebook-title]'));
    expect(instance.state.galaxy.realSkyObservations).toEqual([{ ...SAVED, note: 'Externally restored evidence note.' }]);
    expect(undo(instance)).toBeNull(); expect(instance.announce.mock.calls.flat().join(' ')).toContain('can no longer be restored');
  });
  it('restores a removed row while preserving and focusing another observation draft', async () => {
    const other = { ...SAVED, id: 'other-observation', note: 'Other saved evidence note.' };
    const instance = await mount({ realSkyObservations: [{ ...SAVED }, other] });
    await activate(skyTrigger(instance, 'remove')); await frame();
    await activate(row(instance, other.id).querySelector('[data-galaxy-real-sky-observation-edit-button]')); await frame(); await type(editor(instance), DRAFT);
    await activate(undo(instance)); await frame();
    expect(document.activeElement).toBe(editor(instance)); expect(editor(instance).value).toBe(DRAFT);
    expect(instance.state.galaxy.realSkyObservations).toEqual([SAVED, other]);
  });

  async function prepareEvidence() { return mount({ simMode: 'galaxy', observeMode: 'visible', galaxyEvidenceReturn: 0, galaxyEvidenceWorkbench: BOOK }); }
  function evidenceDestination(instance, action) {
    const destination = instance.host.querySelector(action === 'record' ? '[data-galaxy-evidence-note="0"]' : '[data-galaxy-canvas]');
    expect(destination).not.toBeNull(); expect(destination.tagName).toBe(action === 'record' ? 'TEXTAREA' : 'CANVAS');
    return destination;
  }
  function verifyEvidence(instance, action) {
    const entry = instance.state.galaxy.galaxyEvidenceWorkbench.entries.dust;
    expect(entry.notes).toEqual(BOOK.entries.dust.notes); expect(entry.explanation).toBe(BOOK.entries.dust.explanation);
    if (action === 'observe') { expect(entry.visited).toEqual([true, true]); expect(instance.state.galaxy.observeMode).toBe('infrared'); expect(instance.state.galaxy.galaxyEvidenceReturn).toBe(1); }
    else expect(instance.state.galaxy.galaxyEvidenceWorkbench).toEqual(BOOK);
  }
  it.each(Object.keys(EVIDENCE_ACTIONS))('moves focused Evidence %s to its model or note while preserving writing', async action => {
    const instance = await prepareEvidence(); await activate(instance.host.querySelector(EVIDENCE_ACTIONS[action])); await frame();
    expect(document.activeElement).toBe(evidenceDestination(instance, action)); verifyEvidence(instance, action);
  });
  it.each(Object.keys(EVIDENCE_ACTIONS))('respects focus moved outside before the Evidence %s transfer', async action => {
    const instance = await prepareEvidence(); await activate(instance.host.querySelector(EVIDENCE_ACTIONS[action])); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); verifyEvidence(instance, action);
  });
  it.each(Object.keys(EVIDENCE_ACTIONS))('leaves focus alone for unfocused Evidence %s activation', async action => {
    const instance = await prepareEvidence(); outside.focus(); await activate(instance.host.querySelector(EVIDENCE_ACTIONS[action]), false); await frame();
    expect(document.activeElement).toBe(outside); verifyEvidence(instance, action);
  });
  it.each(Object.keys(EVIDENCE_ACTIONS))('scopes the Evidence %s transfer to the initiating tool', async action => {
    const first = await prepareEvidence(), second = await prepareEvidence();
    await activate(second.host.querySelector(EVIDENCE_ACTIONS[action])); await frame();
    expect(document.activeElement).toBe(evidenceDestination(second, action)); expect(first.state.galaxy.galaxyEvidenceWorkbench).toEqual(BOOK); verifyEvidence(second, action);
  });
  it.each(Object.keys(EVIDENCE_ACTIONS))('cancels Evidence %s focus when its tool is removed', async action => {
    const first = await prepareEvidence(), second = await prepareEvidence();
    await activate(second.host.querySelector(EVIDENCE_ACTIONS[action])); await act(() => second.root.unmount()); second.root = null; second.host.remove(); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); expect(first.state.galaxy.galaxyEvidenceWorkbench).toEqual(BOOK);
  });
});
