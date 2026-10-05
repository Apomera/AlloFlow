import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146], controls: { target: 136, contrast: 63 }, choices: ['Left', 'Same', 'Right'] },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53], controls: { surround: 42, gap: 19 }, choices: ['Left', 'Same', 'Right'] },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425], controls: { angle: 55, fin: 61 }, choices: ['Top', 'Same', 'Bottom'] },
];
const DATES = ['2026-10-04T12:00:00.000Z', '2026-10-04T12:01:00.000Z', '2026-10-04T12:02:00.000Z'];
const FULL_NOTE = 'Trial three observation\n' + 'This is a complete learner note. '.repeat(13) + '<em>literal note ending</em>';
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, writes;

function group(id, experiment = 'brightness', changes = {}) {
  const mode = MODES.find(item => item.id === experiment);
  return engine.normalize({ studies: mode.values.map((matchValue, index) => ({
    id: id + '-record-' + (index + 1), experiment, date: DATES[index],
    model: { matching: true, reveal: true, swap: true, ...mode.controls, matchValue, prediction: mode.choices[index], note: index === 2 ? FULL_NOTE : 'Trial ' + (index + 1) + ' note', ...changes },
    repeat: { id, trial: index + 1, startValue: mode.starts[index] },
  })) }).studies;
}
function seed(studies = []) {
  return engine.normalize({
    experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}
const recorded = (state, id = 'study', trial = 1) => engine.recordedTrial(state, id, trial);
function expectUnavailable(result, status, count) {
  expect(result).toEqual({ status, count, experiment: null, trial: null, recordId: null, date: '', model: null, startValue: null });
}
function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []);
}
function targetValue(svg, experiment) {
  const target = svg.querySelector('[data-perception-target="right"]');
  expect(target).toBeTruthy();
  if (experiment === 'brightness') return Number(target.getAttribute('fill').match(/^rgb\((\d+),/)[1]);
  if (experiment === 'ebbinghaus') return Number(target.getAttribute('r')) * 2;
  return Number(target.getAttribute('x2')) - Number(target.getAttribute('x1'));
}
function expectedTargets(experiment, model) {
  return flatten(engine.scene(experiment, model)).filter(node => node.props['data-perception-target']).map(node => ({ tag: node.tag, props: node.props }));
}
function expectTargets(svg, experiment, model) {
  const actual = [...svg.querySelectorAll('[data-perception-target]')];
  const expected = expectedTargets(experiment, model);
  expect(actual).toHaveLength(expected.length);
  expected.forEach((item, index) => {
    expect(actual[index].tagName.toLowerCase()).toBe(item.tag);
    for (const [key, value] of Object.entries(item.props)) {
      const attribute = key === 'strokeWidth' ? 'stroke-width' : key;
      expect(actual[index].getAttribute(attribute), attribute).toBe(String(value));
    }
  });
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('recorded-preview-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; setData(update); }, activeProfileId: profile, announceToSR: announce, ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const preview = slot => host.querySelector('[data-perception-recorded-preview="' + slot + '"]');
const scene = slot => host.querySelector('[data-perception-recorded-scene="' + slot + '"]');
const selector = slot => host.querySelector('[data-perception-preview-trial="' + slot + '"]');
const guides = slot => host.querySelector('[data-perception-preview-guides="' + slot + '"]');
const notebook = field => host.querySelector('[data-perception-notebook-' + field + ']');
async function input(node, value) {
  expect(node).toBeTruthy();
  const isSelect = node instanceof HTMLSelectElement;
  const prototype = isSelect ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(isSelect ? 'change' : 'input', { bubbles: true }));
  });
}
const selectTrial = (slot, trial) => input(selector(slot), trial);
const toggleGuides = slot => act(async () => guides(slot).click());
async function review(id) { await click('Review study', row(id + '-record-1')); }
async function compare(id) { await input(host.querySelector('[data-perception-study-selector]'), id); }
async function recordUI(value, note = '') {
  await input(host.querySelector('#perception-match-value'), value);
  if (note) await input(host.querySelector('.perception-note'), note);
  await click('Same'); await click('Record match');
}
function expectLocalOnly(baseline, beforeWrites) {
  expect(latest).toEqual(baseline);
  expect(latestAll.otherTool).toEqual({ preserved: 37 });
  expect(writes).toBe(beforeWrites);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine; announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception recorded-trial engine', () => {
  it.each([undefined, null, {}, { studies: [] }])('returns a private incomplete result for a missing group in %j', state => {
    expectUnavailable(recorded(state), 'incomplete', 0);
  });

  it.each([1, 2])('withholds model, identity, date and starting value when only %i trials remain', count => {
    const state = seed(group('study').slice(0, count));
    expectUnavailable(recorded(state), 'incomplete', count);
    expectUnavailable(recorded(state, 'study', 99), 'incomplete', count);
  });

  it.each([
    ['duplicate trial', members => { members[2].repeat.trial = 2; }],
    ['different surroundings', members => { members[2].model.contrast = 24; }],
    ['different fixed reference', members => { members[2].model.target = 144; }],
    ['different context', members => { members[2].model.context = false; }],
    ['different swapped order', members => { members[2].model.swap = false; }],
    ['missing impression', members => { members[2].model.prediction = ''; }],
    ['mixed experiments', members => { members[2] = group('study', 'ebbinghaus')[2]; }],
    ['four retained members', members => { members.push({ ...structuredClone(members[0]), id: 'extra-member' }); }],
  ])('rejects %s before revealing any recorded drawing data', (_, alter) => {
    const members = group('study'); alter(members);
    const state = seed(members), original = structuredClone(state);
    expectUnavailable(recorded(state), 'conflict', members.length);
    expectUnavailable(recorded(state, 'study', 0), 'conflict', members.length);
    expect(state).toEqual(original);
  });

  it('treats invalid repeat metadata as a missing retained trial after normalizing safely', () => {
    const members = group('study'); members[2].repeat.startValue = 999;
    expectUnavailable(recorded({ studies: members }), 'incomplete', 2);
  });

  it.each([[false, false, false], [true, false, false], [true, true, false], [false, true, true]].map(reveals => [reveals]))('requires every retained trial to be revealed for %j', reveals => {
    const members = group('study'); reveals.forEach((reveal, index) => { members[index].model.reveal = reveal; });
    const state = seed(members), original = structuredClone(state);
    for (const trial of [1, 2, 3, 0, '1']) expectUnavailable(recorded(state, 'study', trial), 'hidden', 3);
    expect(state).toEqual(original);
  });

  it.each([undefined, null, 0, 4, -1, 1.5, NaN, Infinity, '1', true])('withholds drawing data for invalid trial %s after reveal gates', trial => {
    expectUnavailable(engine.recordedTrial(seed(group('study')), 'study', trial), 'trial', 3);
  });

  it.each(MODES)('returns each actual $id trial snapshot, not the median or current draft', mode => {
    const members = group('study', mode.id), state = seed([members[2], members[0], members[1]]);
    const original = structuredClone(state);
    for (const trial of [1, 2, 3]) {
      const expected = members[trial - 1], result = recorded(state, 'study', trial);
      expect(result).toEqual({ status: 'ready', count: 3, experiment: mode.id, trial, recordId: expected.id, date: expected.date, model: expected.model, startValue: mode.starts[trial - 1] });
      expect(result.model.matchValue).toBe(mode.values[trial - 1]);
      expect(result.model).not.toBe(state.studies.find(record => record.id === result.recordId).model);
      result.model.note = 'mutated returned note'; result.model.matchValue = 0;
    }
    expect(state).toEqual(original);
    expect(recorded(state, 'study', 3).model.note).toBe(FULL_NOTE);
  });

  it('keeps independent source groups isolated when notebook record order is interleaved', () => {
    const a = group('a'), b = group('b', 'brightness', { contrast: 28 }); b[2].model.matchValue = 171;
    const state = seed([a[2], b[1], a[0], b[2], b[0], a[1]]);
    expect(recorded(state, 'a', 3).model.matchValue).toBe(146);
    expect(recorded(state, 'b', 3).model.matchValue).toBe(171);
    expect(recorded(state, 'b', 3).model.contrast).toBe(28);
    expectUnavailable(recorded(state, 'missing', 3), 'incomplete', 0);
  });

  it('copies normalized bounded date and note fields without mutating an unnormalized input', () => {
    const members = group('study'); members[2].date = 'x'.repeat(80); members[2].model.note = 'n'.repeat(600);
    const raw = { studies: members, models: { moire: { angle: 999 } } }, original = structuredClone(raw);
    const result = recorded(raw, 'study', 3);
    expect(result.status).toBe('ready'); expect(result.date).toBe('x'.repeat(40)); expect(result.model.note).toBe('n'.repeat(500));
    expect(raw).toEqual(original);
  });
});

describe('Perception recorded-drawing previews', () => {
  it.each(MODES)('shows each exact $id saved trial at one fixed scale with full recorded metadata', async mode => {
    const members = group('study', mode.id), initial = seed(members);
    await mount(initial); await review('study');
    const baseline = structuredClone(latest), beforeWrites = writes;
    expect(selector('review').tagName).toBe('SELECT');
    expect([...selector('review').options].map(option => option.value)).toEqual(['1', '2', '3']);
    expect(selector('review').value).toBe('1'); expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    for (const trial of [1, 2, 3]) {
      await selectTrial('review', trial);
      expect(scene('review').getAttribute('viewBox')).toBe('0 0 800 480');
      expectTargets(scene('review'), mode.id, members[trial - 1].model);
      expect(targetValue(scene('review'), mode.id)).toBe(mode.values[trial - 1]);
      expect(preview('review').textContent).toContain(mode.choices[trial - 1]);
      const time = preview('review').querySelector('time'); expect(time).toBeTruthy();
      expect(time.getAttribute('datetime')).toBe(DATES[trial - 1]);
      expect(preview('review').textContent).toContain(members[trial - 1].model.note);
    }
    expect(preview('review').querySelector('em')).toBeNull();
    expect(targetValue(scene('review'), mode.id)).not.toBe(mode.values[1]);
    expectLocalOnly(baseline, beforeWrites);
  });

  it.each(MODES)('toggles only the $id preview guides while preserving the recorded scene and all saved state', async mode => {
    await mount(seed(group('study', mode.id))); await review('study'); await selectTrial('review', 3);
    const baseline = structuredClone(latest), beforeWrites = writes;
    const targets = [...scene('review').querySelectorAll('[data-perception-target]')].map(node => node.outerHTML);
    expect(scene('review').querySelectorAll('[data-perception-guide]').length).toBeGreaterThan(0);
    await toggleGuides('review');
    expect(guides('review').getAttribute('aria-pressed')).toBe('false');
    expect(scene('review').querySelector('[data-perception-guide]')).toBeNull();
    expect([...scene('review').querySelectorAll('[data-perception-target]')].map(node => node.outerHTML)).toEqual(targets);
    expect(selector('review').value).toBe('3');
    await toggleGuides('review');
    expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expect(scene('review').querySelectorAll('[data-perception-guide]').length).toBeGreaterThan(0);
    expectLocalOnly(baseline, beforeWrites);
  });

  it.each([
    ['hidden', members => members.forEach(record => { record.model.reveal = false; })],
    ['mixed reveal', members => { members[2].model.reveal = false; }],
    ['partial', members => members.pop()],
    ['conflict', members => { members[2].repeat.trial = 2; }],
  ])('never renders a %s saved group preview or trial/guides controls', async (_, alter) => {
    const members = group('study'); alter(members); await mount(seed(members)); await review('study');
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    expect(host.querySelector('[data-perception-recorded-scene]')).toBeNull();
    expect(host.querySelector('[data-perception-preview-trial]')).toBeNull();
    expect(host.querySelector('[data-perception-preview-guides]')).toBeNull();
  });

  it('opens a hidden saved preview only after every recorded match is explicitly revealed', async () => {
    const members = group('study', 'brightness', { reveal: false });
    await mount(seed(members)); await review('study'); expect(preview('review')).toBeNull();
    await click('Reveal saved study');
    expect(preview('review')).toBeTruthy(); expect(selector('review').value).toBe('1');
    expect(latest.studies.every(record => record.model.reveal)).toBe(true);
    const baseline = structuredClone(latest), beforeWrites = writes;
    await selectTrial('review', 2); await toggleGuides('review');
    expectLocalOnly(baseline, beforeWrites);
  });

  it('keeps review, A and B trial choices and guides independent without changing the current draft or pin', async () => {
    const a = group('a'), b = group('b', 'brightness', { contrast: 28 });
    b.forEach((record, index) => { record.model.matchValue = [157, 168, 179][index]; record.model.note = 'B trial ' + (index + 1); });
    await mount(seed([...a, ...b]), { strict: true }); await review('a'); await compare('b');
    for (const slot of ['review', 'a', 'b']) {
      expect(selector(slot).value).toBe('1'); expect(guides(slot).getAttribute('aria-pressed')).toBe('true');
    }
    const baseline = structuredClone(latest), beforeWrites = writes;
    await selectTrial('review', 2); await selectTrial('a', 3); await selectTrial('b', 2); await toggleGuides('a');
    expect(targetValue(scene('review'), 'brightness')).toBe(134);
    expect(targetValue(scene('a'), 'brightness')).toBe(146);
    expect(targetValue(scene('b'), 'brightness')).toBe(168);
    expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expect(guides('a').getAttribute('aria-pressed')).toBe('false');
    expect(guides('b').getAttribute('aria-pressed')).toBe('true');
    await toggleGuides('b'); await selectTrial('b', 3);
    expect(guides('b').getAttribute('aria-pressed')).toBe('false');
    expect(selector('a').value).toBe('3'); expect(selector('review').value).toBe('2');
    expectLocalOnly(baseline, beforeWrites);
  });

  it('assigns unique reachable SVG title and description IDs across current, pinned, review and paired scenes', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })])); await review('a'); await compare('b');
    const drawings = [...host.querySelectorAll('[data-perception-recorded-scene]')]; expect(drawings).toHaveLength(3);
    const identifiers = [];
    for (const svg of drawings) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 800 480'); expect(svg.getAttribute('role')).toBe('img');
      const labelledBy = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      expect(labelledBy).toHaveLength(2);
      const title = svg.querySelector('title'), description = svg.querySelector('desc');
      expect(title.textContent.trim()).not.toBe(''); expect(description.textContent.trim()).not.toBe('');
      expect(labelledBy).toEqual([title.id, description.id]);
      for (const id of labelledBy) { expect(host.querySelectorAll('[id="' + id + '"]')).toHaveLength(1); identifiers.push(id); }
    }
    expect(new Set(identifiers).size).toBe(identifiers.length);
    const allIds = [...host.querySelectorAll('svg title[id],svg desc[id]')].map(node => node.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('keeps preview choices while notebook filters hide every observation and while only draft or pin data changes', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })])); await review('a'); await compare('b');
    await selectTrial('review', 3); await toggleGuides('review');
    await selectTrial('a', 2); await toggleGuides('a'); await selectTrial('b', 3);
    const baseline = structuredClone(latest), beforeWrites = writes;
    await input(notebook('view'), 'studies'); await input(notebook('search'), 'no matching observations');
    expect(host.querySelector('[data-perception-notebook-empty]')).toBeTruthy();
    for (const [slot, trial, pressed] of [['review', '3', 'false'], ['a', '2', 'false'], ['b', '3', 'true']]) {
      expect(selector(slot).value).toBe(trial); expect(guides(slot).getAttribute('aria-pressed')).toBe(pressed);
    }
    await click('Clear notebook filters');
    expect(selector('review').value).toBe('3'); expect(selector('a').value).toBe('2'); expect(selector('b').value).toBe('3');
    expectLocalOnly(baseline, beforeWrites);
    await act(async () => externalState(previous => engine.normalize({ ...previous, models: { ...previous.models, moire: { ...previous.models.moire, note: 'edited current draft', angle: 17.4 } }, comparison: { experiment: 'necker', model: { depth: 88, cue: 'back', note: 'edited pin' } } })));
    expect(selector('review').value).toBe('3'); expect(guides('review').getAttribute('aria-pressed')).toBe('false');
    expect(selector('a').value).toBe('2'); expect(guides('a').getAttribute('aria-pressed')).toBe('false');
    expect(selector('b').value).toBe('3'); expect(targetValue(scene('b'), 'brightness')).toBe(146);
    expect(latest.models.moire.note).toBe('edited current draft'); expect(latest.comparison.model.depth).toBe(88);
  });

  it('resets both paired preview controls when B changes, preserving the independent reviewed drawing', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 }), ...group('c', 'brightness', { contrast: 41 })]));
    await review('a'); await compare('b'); await selectTrial('review', 3); await toggleGuides('review');
    await selectTrial('a', 2); await toggleGuides('a'); await selectTrial('b', 3); await toggleGuides('b');
    const baseline = structuredClone(latest), beforeWrites = writes;
    await compare('c');
    for (const slot of ['a', 'b']) { expect(selector(slot).value).toBe('1'); expect(guides(slot).getAttribute('aria-pressed')).toBe('true'); }
    expect(selector('review').value).toBe('3'); expect(guides('review').getAttribute('aria-pressed')).toBe('false');
    await compare('b');
    for (const slot of ['a', 'b']) { expect(selector(slot).value).toBe('1'); expect(guides(slot).getAttribute('aria-pressed')).toBe('true'); }
    expectLocalOnly(baseline, beforeWrites);
  });

  it('resets paired previews after clearing comparison and resets review after switching groups or closing it', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })])); await review('a'); await compare('b');
    await selectTrial('review', 3); await toggleGuides('review'); await selectTrial('a', 2); await toggleGuides('a');
    await selectTrial('b', 3); await toggleGuides('b');
    const baseline = structuredClone(latest), beforeWrites = writes;
    await click('Clear study comparison'); expect(preview('a')).toBeNull(); expect(preview('b')).toBeNull();
    expect(selector('review').value).toBe('3');
    await compare('b');
    for (const slot of ['a', 'b']) { expect(selector(slot).value).toBe('1'); expect(guides(slot).getAttribute('aria-pressed')).toBe('true'); }
    await review('b'); expect(selector('review').value).toBe('1'); expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expect(preview('a')).toBeNull(); expect(preview('b')).toBeNull();
    await selectTrial('review', 2); await toggleGuides('review'); await click('Close study review');
    expect(preview('review')).toBeNull(); await review('b');
    expect(selector('review').value).toBe('1'); expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expectLocalOnly(baseline, beforeWrites);
  });

  it('resets every preview selection and guide toggle across learner profiles without writing tool data', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })])); await review('a'); await compare('b');
    for (const slot of ['review', 'a', 'b']) { await selectTrial(slot, 3); await toggleGuides(slot); }
    const baseline = structuredClone(latest), beforeWrites = writes;
    await act(async () => changeProfile('another-preview-learner'));
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    await review('a'); await compare('b');
    for (const slot of ['review', 'a', 'b']) { expect(selector(slot).value).toBe('1'); expect(guides(slot).getAttribute('aria-pressed')).toBe('true'); }
    expectLocalOnly(baseline, beforeWrites);
  });

  it('does not render either paired preview while B is hidden, then reveals B independently from A', async () => {
    const a = group('a'), b = group('b', 'brightness', { contrast: 28, reveal: false });
    await mount(seed([...a, ...b])); await review('a'); await selectTrial('review', 3); await toggleGuides('review'); await compare('b');
    expect(preview('review')).toBeTruthy(); expect(preview('a')).toBeNull(); expect(preview('b')).toBeNull();
    expect(latest.studies.filter(record => record.repeat.id === 'b').every(record => !record.model.reveal)).toBe(true);
    await click('Reveal comparison study');
    expect(preview('a')).toBeTruthy(); expect(preview('b')).toBeTruthy();
    expect(selector('a').value).toBe('1'); expect(selector('b').value).toBe('1');
    expect(selector('review').value).toBe('3'); expect(guides('review').getAttribute('aria-pressed')).toBe('false');
    expect(latest.studies.filter(record => record.repeat.id === 'a').map(record => record.model)).toEqual(a.map(record => record.model));
    expect(latest.models.moire.note).toBe('current draft'); expect(latest.comparison.model.note).toBe('pinned cube');
  });

  it('withholds previews for a complete revealed group with an incompatible fixed reference', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { target: 144 })])); await review('a');
    const pairSelector = host.querySelector('[data-perception-study-selector]');
    expect([...pairSelector.options].find(option => option.value === 'b').disabled).toBe(true);
    await input(pairSelector, 'b');
    expect(preview('a')).toBeNull(); expect(preview('b')).toBeNull(); expect(preview('review')).toBeTruthy();
    expect(host.querySelector('[data-perception-study-pair-unavailable]')).toBeTruthy();
  });

  it.each([
    ['deleting a retained trial', members => members.filter(record => record.id !== 'study-record-3')],
    ['replacing a snapshot with conflicting settings', members => { members[2].model.contrast = 24; return members; }],
    ['revoking one retained reveal', members => { members[2].model.reveal = false; return members; }],
  ])('removes stale drawings after %s and cannot restore them from a detached local selector', async (_, alter) => {
    await mount(seed(group('study'))); await review('study'); await selectTrial('review', 3); await toggleGuides('review');
    const staleSelector = selector('review');
    await act(async () => externalState(previous => engine.normalize({ ...previous, studies: alter(structuredClone(previous.studies)) })));
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    await input(staleSelector, 2);
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    await review('study'); expect(preview('review')).toBeNull();
  });

  it('uses a newly replaced valid saved snapshot after reopening instead of a stale selected drawing', async () => {
    await mount(seed(group('study'))); await review('study'); await selectTrial('review', 3); await toggleGuides('review');
    const replacement = group('study'); replacement[0].model.matchValue = 173; replacement[0].model.note = 'Replacement first trial';
    await act(async () => externalState(previous => engine.normalize({ ...previous, studies: replacement })));
    expect(preview('review')).toBeNull(); await review('study');
    expect(selector('review').value).toBe('1'); expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expect(targetValue(scene('review'), 'brightness')).toBe(173);
    expect(preview('review').textContent).toContain('Replacement first trial');
    expect(latest.models.moire.note).toBe('current draft'); expect(latest.comparison.model.note).toBe('pinned cube');
  });

  it('removes all paired previews when B loses a retained trial, and recomputes from restored notebook snapshots', async () => {
    const original = seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })]);
    await mount(original); await review('a'); await compare('b'); await selectTrial('b', 3); await toggleGuides('b');
    await act(async () => externalState(previous => engine.normalize({ ...previous, studies: previous.studies.filter(record => record.id !== 'b-record-3') })));
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    await review('a'); await compare('b'); expect(preview('a')).toBeNull(); expect(preview('b')).toBeNull();
    await act(async () => externalState(original)); await review('a'); await compare('b');
    expect(selector('b').value).toBe('1'); expect(guides('b').getAttribute('aria-pressed')).toBe('true');
    expect(targetValue(scene('b'), 'brightness')).toBe(121);
  });

  it.each(MODES)('shows the active $id drawing only after three matches and explicit reveal, then keeps its controls local', async mode => {
    const initial = seed(); initial.experiment = mode.id;
    initial.models[mode.id] = engine.normalize({ models: { [mode.id]: { matching: true, ...mode.controls, swap: true } } }).models[mode.id];
    await mount(initial); await click('Start three matches'); expect(preview('active')).toBeNull();
    for (const [index, value] of mode.values.entries()) {
      await recordUI(value, 'Live trial ' + (index + 1)); expect(preview('active')).toBeNull();
    }
    await click('Reveal study results');
    expect(preview('active')).toBeTruthy(); expect(selector('active').value).toBe('1');
    const baseline = structuredClone(latest), beforeWrites = writes;
    await selectTrial('active', 3); await toggleGuides('active');
    expect(targetValue(scene('active'), mode.id)).toBe(mode.values[2]);
    expect(preview('active').textContent).toContain('Live trial 3');
    expect(scene('active').querySelector('[data-perception-guide]')).toBeNull();
    expect(latest.models[mode.id].reveal).toBe(true);
    expectLocalOnly(baseline, beforeWrites);
    await click('End repeated study'); expect(preview('active')).toBeNull();
    const savedGroup = latest.studies[0].repeat.id;
    await click('Review study', row(latest.studies[0].id));
    expect(host.querySelector('[data-perception-study-review]').dataset.perceptionStudyReview).toBe(savedGroup);
    expect(selector('review').value).toBe('1'); expect(guides('review').getAttribute('aria-pressed')).toBe('true');
  });

  it('preserves native control focus and exposes associated labels and pressed state', async () => {
    await mount(seed(group('study'))); await review('study');
    const trialSelect = selector('review'), guideButton = guides('review');
    expect(preview('review').querySelector('label[for="' + trialSelect.id + '"]').textContent).toContain('Recorded trial');
    expect([...trialSelect.options].map(option => option.textContent)).toEqual(['Trial 1', 'Trial 2', 'Trial 3']);
    expect(guideButton.textContent).toBe('Show measurement guides');
    trialSelect.focus(); await selectTrial('review', 3); expect(document.activeElement).toBe(selector('review'));
    guideButton.focus(); await toggleGuides('review'); expect(document.activeElement).toBe(guides('review'));
    expect(guides('review').getAttribute('aria-pressed')).toBe('false');
    expect(guides('review').getAttribute('aria-describedby')).toBe(preview('review').getAttribute('aria-labelledby'));
  });

  it('localizes recorded titles, trial options, impressions and readouts while keeping geometry unchanged', async () => {
    const labels = {
      recorded_drawing: 'Dessin enregistré', recorded_trial_label: 'Essai enregistré', recorded_trial_option: 'Essai {trial}',
      recorded_trial_title: 'Essai enregistré {trial} · {title}', show_measurement_guides: 'Afficher les repères',
      brightness_title: 'Luminosité', brightness_choice_2: 'Droite', recorded_impression: 'Impression enregistrée', observation_note: 'Note',
    };
    const translate = (key, fallback) => labels[key.slice(key.lastIndexOf('.') + 1)] || fallback;
    await mount(seed(group('study')), { translate }); await review('study'); await selectTrial('review', 3);
    expect(preview('review').querySelector('h5').textContent).toBe('Dessin enregistré');
    expect([...selector('review').options].map(option => option.textContent)).toEqual(['Essai 1', 'Essai 2', 'Essai 3']);
    expect(preview('review').textContent).toContain('Essai enregistré 3 · Luminosité');
    expect(preview('review').textContent).toContain('Impression enregistrée: Droite');
    expect(guides('review').textContent).toBe('Afficher les repères');
    expect(targetValue(scene('review'), 'brightness')).toBe(146);
  });
});
