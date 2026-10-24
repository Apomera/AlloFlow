import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(path => resolve(path))
  .find(path => existsSync(resolve(path, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {}, scenes = [], ages = ['adult', 'child', 'infant'];
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const legends = {
  near: 'After the turn, which side of the near hand stays facing upward?',
  support: 'As the body turns, which surface of the supporting hand stays beside the cheek?'
};
const choiceLabels = { palm: 'Palm side', back: 'Back of hand', unsure: 'Not sure yet' };
const evidence = [
  ['Near palm before turn', 'nearPalm', 4], ['Near palm after turn', 'nearPalm', 5],
  ['Supporting hand before turn', 'supportingHand', 4], ['Supporting hand after turn', 'supportingHand', 5]
];
let previous, build, config, viewer, focus, reset, nudge, viewerStatus, lastSync,
  host, root, state, patch, contrastMode;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear();
  previous = window.StemLab; delete window.__alloflowFirstResponse;
  viewerStatus = 'ready'; lastSync = null; contrastMode = false;
  focus = vi.fn(() => true); reset = vi.fn(); nudge = vi.fn();
  window.StemLab = { _registry: {}, isRegistered: () => false,
    registerTool(id, tool) { this._registry[id] = tool; },
    makeBayViewer(options) {
      config = options; build = options.buildScene;
      return viewer = { attach() {}, sync(props) { lastSync = props; }, focus,
        reset, nudge, zoom() {}, status: () => viewerStatus };
    } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  vi.restoreAllMocks();
  if (root) act(() => root.unmount()); host.remove(); window.StemLab = previous;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
});
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dAge: 'adult',
      b3dTab: 'recovery', b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data; patch = values => setData(previousState => ({ ...previousState, ...values }));
    return window.StemLab._registry.firstResponse.render({ React,
      toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => patch(values), t: (_, fallback) => fallback,
      addToast() {}, gradeBand: 'g68', isContrast: contrastMode });
  }
  act(() => root.render(React.createElement(Harness)));
}
function study() {
  const element = host.querySelector('details.fr-hand-study'); expect(element, 'hand orientation disclosure').toBeTruthy();
  expect(element.querySelector('summary')?.textContent).toBe('Hand orientation study'); return element;
}
function button(label, scope = host) {
  const element = [...scope.querySelectorAll('button')].find(button => button.textContent === label);
  expect(element, label).toBeTruthy(); return element;
}
function click(label, scope = host) { act(() => button(label, scope).click()); }
function field(kind) {
  const element = [...study().querySelectorAll('fieldset')]
    .find(fieldset => fieldset.querySelector('legend')?.textContent === legends[kind]);
  expect(element, kind + ' question').toBeTruthy(); return element;
}
function choose(kind, value) { const input=field(kind).querySelector('input[value="'+value+'"]'); expect(input).toBeTruthy(); act(()=>input.click()); }
function selected(kind) {
  return [...field(kind).querySelectorAll('input[type=radio]')].filter(input=>input.checked).map(input=>choiceLabels[input.value]);
}
function textarea() {
  const element = study().querySelector('textarea'); expect(element).toBeTruthy();
  expect(study().querySelector('label[for="'+element.id+'"]')?.textContent).toBe('Explain your hand comparison'); return element;
}
function note(value) { const element = textarea(); act(() => Simulate.change(element, { target: { value } })); }
function record(age = state.b3dAge) { return state.b3dHandStudy?.[age]; }
function untouched(before, allowed = ['b3dHandStudy']) {
  const omit = data => Object.fromEntries(Object.entries(data).filter(([key]) => !allowed.includes(key)));
  expect(omit(state)).toEqual(omit(before));
  for (const key of Object.keys(before)) if (!allowed.includes(key)) expect(state[key], key + ' retains identity').toBe(before[key]);
}
function correctRecord(note = '') { return { version: 1, near: 'palm', support: 'back', checked: true, note }; }
function freshDisplay() {
  expect(selected('near')).toEqual([]); expect(selected('support')).toEqual([]);
  expect(button('Check hand observations', study()).disabled).toBe(true);
  expect(study().querySelector('.fr-hand-study-feedback')?.textContent).toBe(''); expect(textarea().value).toBe('');
}
function model(age = 'adult', phase = 4, guides = false, contrast = false, tab = 'recovery') {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color,
      shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab, recoveryGuides: guides } });
  const sample = () => { content.frame(0, {}, true); scene.updateMatrixWorld(true); };
  sample(); return { scene, content, sample };
}
function assertFocus(content, id, narrow = false) {
  const [actualId, options] = focus.mock.calls.at(-1); expect(actualId).toBe(id);
  expect(options.immediate).toBe(true); expect(options.padding).toBeUndefined();
  // Below a 1.15 stage aspect the supporting-hand close-up also frames the posed head.
  const inspection = content.meshes[id].userData.inspection;
  if (narrow) expect(inspection.faceFrame.center, 'narrow framing differs from the hand-only sphere').not.toEqual(inspection.center);
  expect(Object.values(options.target)).toEqual(narrow ? inspection.faceFrame.center : inspection.center);
  expect(options.distance).toBeGreaterThanOrEqual(.8); expect(options.distance).toBeLessThanOrEqual(config.home.dist);
}

describe('First Response hand orientation study pedagogy and state', () => {
  it('offers one disclosure after the turn is completed in recovery, including review of early poses', () => {
    mount({ b3dRec: completed.slice(0, 4) }); expect(host.querySelector('.fr-hand-study')).toBeNull();
    act(() => patch({ b3dRec: completed.slice(0, 5), b3dRecView: 0 })); study();
    expect(host.querySelectorAll('.fr-hand-study')).toHaveLength(1);
    for (const tab of ['depth', 'place', 'coach', 'gate', 'aed', 'call']) {
      act(() => patch({ b3dTab: tab })); expect(host.querySelector('.fr-hand-study'), tab).toBeNull();
    }
    act(() => patch({ b3dTab: 'recovery', b3dRecView: 2 })); study();
    const before = state; act(() => study().querySelector('summary').click()); expect(state).toBe(before);
    expect(focus).not.toHaveBeenCalled();
  });
  for (const age of ages) {
    it(age + ' saves two observations and model feedback without changing learning progress', () => {
      const inquiry = { note: 'Keep the depth observation.' }, depth = { age, depth: 5.5 }, skills = { recovery: 3 };
      mount({ b3dAge: age, b3dDepthInquiry: inquiry, b3dDepthLab: depth, skills, progress: { firstResponse: 17 } });
      const before = state; choose('near', 'palm'); choose('support', 'back'); click('Check hand observations', study());
      expect(record()).toEqual(correctRecord()); untouched(before);
      const feedback = study().querySelector('.fr-hand-study-feedback'); expect(feedback?.getAttribute('role')).toBe('status');
      expect(feedback?.textContent).toContain('Compare your choices with the model');
      expect(study().querySelectorAll('.fr-hand-study-result')[0]?.textContent).toContain('The palm side stays facing upward in poses 4 and 5.');
      expect(study().querySelectorAll('.fr-hand-study-result')[1]?.textContent).toContain('The back of the supporting hand stays beside the cheek in poses 4 and 5.');
      expect(feedback?.textContent.toLowerCase()).not.toMatch(/score|points|certif/);
      expect(focus).not.toHaveBeenCalled();
    });
  }
  it.each([['back', 'back'], ['palm', 'palm'], ['unsure', 'unsure']])(
    'provides model observations for near=%s support=%s without a score or completed skill', (near, support) => {
      mount({ skills: { recovery: 1 } }); const before = state;
      choose('near', near); choose('support', support); click('Check hand observations', study());
      expect(record()).toEqual({ version: 1, near, support, checked: true, note: '' }); untouched(before);
      expect(study().querySelectorAll('.fr-hand-study-result')[0]?.textContent).toContain('The palm side stays facing upward');
      expect(study().querySelectorAll('.fr-hand-study-result')[1]?.textContent).toContain('The back of the supporting hand stays beside the cheek');
    });
  it('requires both observations, accepts uncertainty, and prevents disabled checks from saving a result', () => {
    mount(); const initial = state; click('Check hand observations', study()); expect(state).toBe(initial);
    choose('near', 'unsure'); expect(button('Check hand observations', study()).disabled).toBe(true);
    const halfway = state; click('Check hand observations', study()); expect(state).toBe(halfway);
    choose('support', 'unsure'); expect(button('Check hand observations', study()).disabled).toBe(false);
    click('Check hand observations', study()); expect(record()?.checked).toBe(true);
  });
  it('clears checked feedback when either observation changes while preserving its note', () => {
    mount({ b3dHandStudy: { adult: correctRecord('Follow the same hand.') } }); const before = state;
    choose('near', 'back'); expect(record()).toEqual({ ...correctRecord('Follow the same hand.'), near: 'back', checked: false });
    expect(study().querySelector('.fr-hand-study-feedback')?.textContent).toBe(''); untouched(before);
    click('Check hand observations', study()); choose('support', 'palm'); expect(record()?.checked).toBe(false);
    expect(record()?.near).toBe('back'); expect(record()?.support).toBe('palm'); expect(record()?.note).toBe('Follow the same hand.');
  });
  it('bounds explanations to 2000 characters and preserves checked feedback through note edits', () => {
    mount({ b3dHandStudy: { adult: correctRecord('Initial note.') } }); const before = state;
    expect(textarea().maxLength).toBe(2000); note('x'.repeat(2017));
    expect(record()?.note).toBe('x'.repeat(2000)); expect(record()?.checked).toBe(true);
    expect(record()?.near).toBe('palm'); expect(record()?.support).toBe('back');
    expect(study().querySelector('.fr-hand-study-feedback')).toBeTruthy(); untouched(before);
    note(''); expect(record()?.note).toBe(''); expect(record()?.checked).toBe(true);
  });
  it('keeps age observations independent and restores each saved explanation on an age switch', () => {
    const adult = correctRecord('Adult hand.'), infant = correctRecord('Infant hand.');
    mount({ b3dHandStudy: { adult, infant } }); act(() => patch({ b3dAge: 'child' })); freshDisplay();
    const before = state; choose('near', 'back'); choose('support', 'palm'); note('Child hand.'); untouched(before);
    expect(state.b3dHandStudy.adult).toBe(adult); expect(state.b3dHandStudy.infant).toBe(infant);
    const child = state.b3dHandStudy.child;
    act(() => patch({ b3dAge: 'adult' })); expect(textarea().value).toBe('Adult hand.'); expect(selected('near')).toEqual(['Palm side']);
    act(() => patch({ b3dAge: 'infant' })); expect(textarea().value).toBe('Infant hand.'); expect(selected('support')).toEqual(['Back of hand']);
    act(() => patch({ b3dAge: 'child' })); expect(textarea().value).toBe('Child hand.'); expect(record()).toBe(child);
  });
  it('resets only the current age while keeping other age records and unrelated state identities', () => {
    const adult = correctRecord('Adult.'), child = correctRecord('Child.'), infant = correctRecord('Infant.');
    mount({ b3dAge: 'child', b3dHandStudy: { adult, child, infant }, skills: { recovery: 4 } });
    const before = state; click('Reset this hand study', study()); freshDisplay(); untouched(before);
    expect(state.b3dHandStudy.adult).toBe(adult); expect(state.b3dHandStudy.infant).toBe(infant);
    expect(state.b3dHandStudy.child).toBeUndefined();
  });
});

// Insert this fragment immediately before the existing saved-data describe.
const handStudyStorageKey = 'firstResponse.state.v1';
function observeAge(age, near, support, explanation) {
  act(() => patch({ b3dAge: age }));
  choose('near', near); choose('support', support); note(explanation);
  click('Check hand observations', study());
  expect(record(age)).toEqual({ version: 1, near, support, checked: true, note: explanation });
}
function restoredStudyDisplay(age, expected) {
  if (state.b3dAge !== age) act(() => patch({ b3dAge: age }));
  expect(record(age)).toEqual(expected);
  expect(selected('near')).toEqual(expected.near ? [choiceLabels[expected.near]] : []);
  expect(selected('support')).toEqual(expected.support ? [choiceLabels[expected.support]] : []);
  expect(textarea().value).toBe(expected.note);
  expect(!!study().querySelector('.fr-hand-study-feedback')?.textContent).toBe(expected.checked);
}
function mountHandStudyWithDeferredHydration(seed, deferredUpdates) {
  function DeferredHarness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dAge: 'adult',
      b3dTab: 'recovery', b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data; patch = values => setData(previousState => ({ ...previousState, ...values }));
    return window.StemLab._registry.firstResponse.render({ React,
      toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => deferredUpdates.push(values), t: (_, fallback) => fallback,
      addToast() {}, gradeBand: 'g68', isContrast: contrastMode });
  }
  act(() => root.render(React.createElement(DeferredHarness)));
}
function reloadHandStudyFromStorage(seed = {}, deferredUpdates) {
  const saved = localStorage.getItem(handStudyStorageKey);
  expect(saved).toBeTruthy();
  act(() => root.unmount()); host.remove();
  delete window.__alloflowFirstResponse;
  expect(localStorage.getItem(handStudyStorageKey)).toBe(saved);
  // Reload the actual tool closure as a browser reload does; no saved map is
  // supplied by the host harness or the deleted window snapshot.
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  if (deferredUpdates) mountHandStudyWithDeferredHydration(seed, deferredUpdates);
  else mount(seed);
}
function restoreHandStudyProject(snapshot) {
  window.__alloflowFirstResponse = snapshot;
  localStorage.setItem(handStudyStorageKey, JSON.stringify(snapshot));
  act(() => window.dispatchEvent(new Event('alloflow-firstresponse-restored')));
}

describe('First Response hand study persistence boundaries', () => {
  it('reloads all three checked age studies and their explanations from real localStorage', () => {
    mount();
    observeAge('adult', 'palm', 'back', 'Adult palm folds remain visible.');
    observeAge('child', 'unsure', 'palm', 'Compare the child fingers with the cheek.');
    observeAge('infant', 'back', 'unsure', 'Follow the infant supporting hand.');
    const liveMap = state.b3dHandStudy;
    const saved = JSON.parse(localStorage.getItem(handStudyStorageKey));
    expect(saved.b3dHandStudy).toEqual(liveMap);
    expect(window.__alloflowFirstResponse.b3dHandStudy).toEqual(liveMap);
    reloadHandStudyFromStorage();
    expect(state.b3dHandStudy).toEqual(liveMap);
    for (const age of ages) restoredStudyDisplay(age, liveMap[age]);
    const deferredUpdates = [];
    reloadHandStudyFromStorage({}, deferredUpdates);
    expect(state.b3dHandStudy).toBeUndefined(); expect(deferredUpdates).toHaveLength(1);
    expect(deferredUpdates[0].b3dHandStudy).toEqual(liveMap);
    expect(window.__alloflowFirstResponse.b3dHandStudy).toEqual(liveMap);
    expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy).toEqual(liveMap);
    act(() => patch(deferredUpdates.shift()));
    for (const age of ages) restoredStudyDisplay(age, liveMap[age]);
  });

  it('keeps an age reset deleted after reload while retaining the other two checked studies', () => {
    mount();
    observeAge('adult', 'palm', 'back', 'Keep adult evidence.');
    observeAge('child', 'palm', 'back', 'Reset child evidence.');
    observeAge('infant', 'unsure', 'back', 'Keep infant evidence.');
    const adult = record('adult'), infant = record('infant');
    act(() => patch({ b3dAge: 'child' }));
    click('Reset this hand study', study()); freshDisplay();
    expect(state.b3dHandStudy.adult).toBe(adult);
    expect(state.b3dHandStudy.infant).toBe(infant);
    expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy.child).toBeUndefined();
    reloadHandStudyFromStorage({ b3dAge: 'child' });
    freshDisplay(); expect(record('child')).toBeUndefined();
    expect(Object.keys(state.b3dHandStudy).sort()).toEqual(['adult', 'infant']);
    restoredStudyDisplay('adult', adult); restoredStudyDisplay('infant', infant);
  });

  it('restores a project study and an explicit empty project map without altering clinical fields', () => {
    const depthInquiry = { note: 'Keep the depth inquiry.' }, depthLab = { depth: 5.5 },
      skills = { recovery: 3 }, progress = { firstResponse: 19 }, badges = { safe: true },
      modulesVisited = { recovery: true }, faMastery = { bleeding: 2 };
    mount({ b3dDepthInquiry: depthInquiry, b3dDepthLab: depthLab, skills, progress,
      badges, modulesVisited, faMastery });
    observeAge('child', 'unsure', 'back', 'Child project explanation.');
    const projectMap = JSON.parse(JSON.stringify(state.b3dHandStudy));
    observeAge('adult', 'palm', 'back', 'Current adult explanation.');
    const before = state;
    restoreHandStudyProject({ b3dHandStudy: projectMap });
    expect(state.b3dHandStudy).toEqual(projectMap);
    expect(record('adult')).toBeUndefined(); freshDisplay(); untouched(before);
    restoredStudyDisplay('child', projectMap.child);
    const beforeClear = state;
    restoreHandStudyProject({ b3dHandStudy: {} });
    expect(state.b3dHandStudy).toEqual({}); freshDisplay(); untouched(beforeClear);
    expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy).toEqual({});
  });

  it('keeps live study identities when an older project restores its existing fields without a hand study', () => {
    const badges = { imported: true }, modulesVisited = { airway: true }, faMastery = { burns: 1 };
    mount({ b3dDepthInquiry: { note: 'Keep clinical inquiry.' }, skills: { recovery: 2 },
      badges, modulesVisited, faMastery });
    observeAge('adult', 'palm', 'back', 'Keep the current hand comparison.');
    const before = state, liveMap = state.b3dHandStudy, adult = record('adult');
    restoreHandStudyProject({ consentAccepted: true, badges, modulesVisited, faMastery });
    expect(state.b3dHandStudy).toBe(liveMap); expect(record('adult')).toBe(adult);
    expect(state.badges).toBe(badges); expect(state.modulesVisited).toBe(modulesVisited);
    expect(state.faMastery).toBe(faMastery);
    untouched(before);
    expect(window.__alloflowFirstResponse.b3dHandStudy).toEqual(liveMap);
    restoredStudyDisplay('adult', adult);
    expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy).toEqual(liveMap);
  });

  it('rejects malformed project maps and sanitizes own records before showing saved feedback', () => {
    mount({ skills: { recovery: 4 } });
    observeAge('adult', 'palm', 'back', 'Keep this study through invalid imports.');
    const before = state, liveMap = state.b3dHandStudy;
    for (const malformed of [null, [], 'invalid map', 7]) {
      restoreHandStudyProject({ b3dHandStudy: malformed });
      expect(state.b3dHandStudy).toBe(liveMap); expect(state).toBe(before);
      expect(window.__alloflowFirstResponse.b3dHandStudy).toEqual(liveMap);
      expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy).toEqual(liveMap);
      restoredStudyDisplay('adult', liveMap.adult);
    }
    const raw = Object.create({ child: correctRecord('Inherited child must be ignored.') });
    raw.adult = { version: 1, near: 'sideways', support: 'unsure', checked: true, note: 'n'.repeat(2019) };
    raw.infant = Object.assign(Object.create({ near: 'palm', note: 'Inherited note must be ignored.' }),
      { version: 1, support: 'back', checked: true });
    raw.alien = correctRecord('Unknown age must be ignored.');
    Object.defineProperty(raw, '__proto__', { value: { handStudyPolluted: true }, enumerable: true });
    raw.constructor = { handStudyPolluted: true };
    const beforeImport = state;
    restoreHandStudyProject({ b3dHandStudy: raw });
    const adult = { version: 1, near: '', support: 'unsure', checked: false, note: 'n'.repeat(2000) },
      infant = { version: 1, near: '', support: 'back', checked: false, note: '' };
    expect(state.b3dHandStudy).toEqual({ adult, infant }); untouched(beforeImport);
    expect(Object.keys(state.b3dHandStudy).sort()).toEqual(['adult', 'infant']);
    expect(Object.getPrototypeOf(state.b3dHandStudy)).toBe(Object.prototype);
    expect(Object.prototype.handStudyPolluted).toBeUndefined();
    restoredStudyDisplay('adult', adult); expect(button('Check hand observations', study()).disabled).toBe(true);
    restoredStudyDisplay('infant', infant); expect(button('Check hand observations', study()).disabled).toBe(true);
    expect(JSON.parse(localStorage.getItem(handStudyStorageKey)).b3dHandStudy).toEqual({ adult, infant });
  });

  it('keeps native study edits and feedback usable when localStorage reads and writes fail', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage read unavailable'); }),
      write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage write unavailable'); });
    const inquiry = { note: 'Keep clinical work.' }, skills = { recovery: 2 };
    mount({ b3dDepthInquiry: inquiry, skills });
    expect(read).toHaveBeenCalledWith(handStudyStorageKey);
    const before = state;
    observeAge('adult', 'palm', 'back', 'This comparison stays in this session.');
    const adult = record('adult'); untouched(before);
    expect(write).toHaveBeenCalledWith(handStudyStorageKey, expect.any(String));
    expect(window.__alloflowFirstResponse.b3dHandStudy.adult).toEqual(adult);
    act(() => patch({ b3dAge: 'child' })); freshDisplay();
    restoredStudyDisplay('adult', adult); expect(record('adult')).toBe(adult);
    note('Revised in this session.');
    expect(record('adult')).toEqual({ ...adult, note: 'Revised in this session.' });
    expect(record('adult').checked).toBe(true);
    expect(state.b3dDepthInquiry).toBe(inquiry); expect(state.skills).toBe(skills);
    expect(study().querySelector('.fr-hand-study-feedback')?.textContent).toContain('Compare your choices with the model');
  });
});

describe('First Response hand study evidence camera request limit', () => {
  it('stops polling an unfitted pose after 60 frames without taking focus or changing the study', () => {
    mount(); observeAge('adult', 'palm', 'back', 'Keep checked evidence while waiting for the model.');
    const stage = host.querySelector('.fr-body3d-stage');
    Object.defineProperties(stage, { clientWidth: { value: 560 }, clientHeight: { value: 420 } });
    const stageFocus = vi.spyOn(stage, 'focus'); stage.scrollIntoView = vi.fn();
    viewer.attach(stage); model(); const callbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    const before = state, evidenceButton = button('Supporting hand after turn', study());
    evidenceButton.focus(); click('Supporting hand after turn', study());
    expect(state.b3dRecView).toBe(5); untouched(before, ['b3dRecView']);
    let frames = 0;
    while (callbacks.length && frames < 70) {
      const pending = callbacks.splice(0);
      // The parent focus-capture reveal shares the first animation frame.
      expect(pending).toHaveLength(frames === 0 ? 2 : 1);
      pending.forEach(callback => callback(frames));
      frames++;
    }
    expect(frames).toBe(60); expect(callbacks).toHaveLength(0);
    expect(stage.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(stageFocus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(evidenceButton);
    expect(state.b3dHandStudy).toBe(before.b3dHandStudy);
    expect(record('adult')).toBe(before.b3dHandStudy.adult);
    expect(study().querySelector('.fr-hand-study-feedback')?.textContent).toContain('Compare your choices with the model');
  });
});

describe('First Response hand orientation study saved data and fallback', () => {
  it.each([undefined, null, 2, '1', -1, true])('renders an unsupported saved record version %s as a fresh study', version => {
    const saved = { version, near: 'palm', support: 'back', checked: true, note: 'Do not reuse this old explanation.' };
    mount({ b3dHandStudy: { adult: saved } }); const before = state; freshDisplay(); expect(state).toBe(before);
    choose('near', 'palm'); choose('support', 'back'); click('Check hand observations', study());
    expect(record()).toEqual(correctRecord());
  });
  it.each([[null], [[]], ['invalid map']])('handles malformed study maps %s without mutating them during rendering', saved => {
    mount({ b3dHandStudy: saved }); const before = state; freshDisplay(); expect(state).toBe(before);
    choose('near', 'palm'); choose('support', 'back'); click('Check hand observations', study());
    expect(record()).toEqual(correctRecord()); expect(Object.keys(state.b3dHandStudy)).toEqual(['adult']);
  });
  it('writes only known age keys when saved data contains unknown and prototype-named keys', () => {
    const map = JSON.parse('{"adult":{"version":1,"near":"palm","support":"back","checked":true,"note":"Adult."},"child":{"version":1,"near":"palm","support":"back","checked":true,"note":"Child."},"alien":{"note":"Ignore"},"__proto__":{"polluted":true},"constructor":{"polluted":true}}');
    const child = map.child; mount({ b3dHandStudy: map }); note('New adult note.');
    expect(Object.keys(state.b3dHandStudy).sort()).toEqual(['adult', 'child']); expect(state.b3dHandStudy.child).toBe(child);
    expect(Object.prototype.polluted).toBeUndefined(); expect(state.b3dHandStudy.polluted).toBeUndefined();
  });
  it('ignores inherited age records and retains safe own records when the current age is edited', () => {
    const child = correctRecord('Own child.'), inherited = correctRecord('Inherited adult.');
    const map = Object.create({ adult: inherited }); map.child = child; mount({ b3dHandStudy: map }); freshDisplay();
    choose('near', 'palm'); choose('support', 'back'); click('Check hand observations', study());
    expect(record()).toEqual(correctRecord()); expect(state.b3dHandStudy.child).toBe(child);
    expect(Object.getPrototypeOf(state.b3dHandStudy)).toBe(Object.prototype);
  });
  it('clears malformed choices, checked flags and nontext notes instead of trusting saved feedback', () => {
    mount({ b3dHandStudy: { adult: { version: 1, near: 'sideways', support: {}, checked: 'yes', note: { text: 'invalid' } } } });
    freshDisplay(); choose('near', 'palm'); choose('support', 'back'); click('Check hand observations', study());
    expect(record()).toEqual(correctRecord());
  });
  it.each(['failed', 'idle', 'loading'])('keeps textual observations and checking available with viewer=%s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready'; mount({ b3dStatus: status }); const before = state;
    for (const [label] of evidence) expect(button(label, study()).disabled).toBe(false);
    choose('near', 'palm'); choose('support', 'back'); note('Compare the palm folds.'); click('Check hand observations', study());
    expect(record()).toEqual(correctRecord('Compare the palm folds.')); untouched(before); expect(focus).not.toHaveBeenCalled();
    expect(study().querySelector('.fr-hand-study-feedback')).toBeTruthy();
  });
});

describe('First Response hand study evidence cameras', () => {
  it.each(['active', 'reset', 'detach', 'focus moved', 'failed status'])('returns to the fitted stage only while the evidence request is current: %s', mode => {
    mount();
    const stage = host.querySelector('.fr-body3d-stage');
    expect(stage).toBeTruthy();
    const stageFocus = vi.spyOn(stage, 'focus');
    stage.scrollIntoView = vi.fn();
    Object.defineProperties(stage, { clientWidth: { value: 560 }, clientHeight: { value: 420 } });
    viewer.attach(stage); model();
    const callbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    const evidenceButton = button('Near palm before turn', study()); evidenceButton.focus();
    click('Near palm before turn', study());
    expect(stageFocus).not.toHaveBeenCalled();
    if (mode === 'reset') viewer.reset();
    if (mode === 'detach') viewer.attach(null);
    if (mode === 'failed status') viewerStatus = 'failed';
    if (mode === 'focus moved') textarea().focus();
    for (let frame = 0; callbacks.length && frame < 4; frame++) callbacks.splice(0).forEach(callback => callback(frame));
    if (mode === 'active') {
      expect(stageFocus).toHaveBeenCalledWith({ preventScroll: true });
      expect(stage.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
    } else {
      expect(stageFocus).not.toHaveBeenCalled(); expect(stage.scrollIntoView).not.toHaveBeenCalled();
    }
  });
  it('reveals a paused stage and waits for its queued pose fit before moving focus', () => {
    mount(); const stage = host.querySelector('.fr-body3d-stage');
    Object.defineProperties(stage, { clientWidth: { value: 560 }, clientHeight: { value: 420 } });
    const stageFocus = vi.spyOn(stage, 'focus'); stage.scrollIntoView = vi.fn();
    viewer.attach(stage); model(); const callbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    button('Supporting hand after turn', study()).focus(); click('Supporting hand after turn', study());
    expect(stage.scrollIntoView).not.toHaveBeenCalled(); expect(stageFocus).not.toHaveBeenCalled();
    callbacks.splice(0).forEach(callback => callback(0)); expect(stage.scrollIntoView).toHaveBeenCalledTimes(1); expect(stageFocus).not.toHaveBeenCalled(); expect(callbacks).toHaveLength(1);
    model('adult', 5); callbacks.shift()(1); expect(stageFocus).toHaveBeenCalledWith({ preventScroll: true });
    expect(callbacks).toHaveLength(0); expect(state.b3dRecView).toBe(5);
  });
  for (const age of ages) {
    it(age + ' interleaves near and supporting evidence and restores the legacy near comparison camera', () => {
      const saved = { [age]: correctRecord('Do not change observations.') };
      mount({ b3dAge: age, b3dHandStudy: saved, b3dRecoveryGuides: true });
      viewer.attach({ clientWidth: 560, clientHeight: 420 }); let current = model(age, 4, true);
      const before = state;
      click('Near palm before turn', study()); assertFocus(current.content, 'nearPalm'); expect(state).toBe(before);
      let count = focus.mock.calls.length;
      click('Supporting hand before turn', study()); assertFocus(current.content, 'supportingHand'); expect(focus).toHaveBeenCalledTimes(++count);
      const same = state; click('Supporting hand after turn', study()); expect(state.b3dRecView).toBe(5); untouched(before, ['b3dRecView']);
      expect(focus).toHaveBeenCalledTimes(count); expect(lastSync.phase).toBe(5);
      current = model(age, 5, true); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'supportingHand');
      click('Near palm after turn', study()); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'nearPalm');
      expect(state.b3dHandStudy).toBe(saved);
      click('Supporting hand after turn', study()); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'supportingHand');
      click('Inspect before the turn'); expect(state.b3dRecView).toBe(4); expect(focus).toHaveBeenCalledTimes(count);
      current = model(age, 4, true); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'nearPalm');
      click('Supporting hand before turn', study()); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'supportingHand');
      click('Inspect after the turn'); expect(state.b3dRecView).toBe(5); expect(focus).toHaveBeenCalledTimes(count);
      current = model(age, 5, true); expect(focus).toHaveBeenCalledTimes(++count); assertFocus(current.content, 'nearPalm');
      current.sample(); current.sample(); expect(focus).toHaveBeenCalledTimes(count); untouched(before, ['b3dRecView']);
      expect(same.b3dRecView).toBe(4);
    });
  }
  it.each([0, 2])('queues an explicit hand and completed pose from early review pose %s without changing study data', phase => {
    const saved = { adult: correctRecord('Stored evidence.') };
    mount({ b3dRecView: phase, b3dHandStudy: saved }); viewer.attach({ clientWidth: 280, clientHeight: 280 }); model('adult', phase);
    const before = state; click('Near palm before turn', study()); expect(state.b3dRecView).toBe(4);
    expect(focus).not.toHaveBeenCalled(); const near = model('adult', 4); assertFocus(near.content, 'nearPalm');
    click('Supporting hand after turn', study()); expect(state.b3dRecView).toBe(5); const support = model('adult', 5);
    assertFocus(support.content, 'supportingHand', true); untouched(before, ['b3dRecView']); expect(state.b3dHandStudy).toBe(saved);
  });
  it('handles absent targets and rejected focus without changing observations or reviving stale focus', () => {
    const saved = { adult: correctRecord('Keep this study.') }; mount({ b3dHandStudy: saved });
    viewer.attach({ clientWidth: 560, clientHeight: 420 }); const before = state;
    click('Near palm before turn', study()); expect(focus).not.toHaveBeenCalled(); expect(state).toBe(before);
    model(); focus.mockReturnValue(false); click('Supporting hand before turn', study()); expect(state).toBe(before);
    const count = focus.mock.calls.length; model('child', 5).sample(); expect(focus).toHaveBeenCalledTimes(count);
    expect(state.b3dHandStudy).toBe(saved);
  });
});
