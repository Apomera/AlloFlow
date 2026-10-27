import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
let tool;
const clone = value => JSON.parse(JSON.stringify(value));
const snapshot = (wind = 0) => ({ speciesId: 'canada_goose', season: 'fall', wind, formationMode: 'natural', formation: 'v', groundSpeed: wind === 0 ? 40 : 49, benefit: 22 });
const challengeSnapshot = (wind = -15) => ({ speciesId: 'monarch', season: 'fall', wind, formationMode: 'natural', formation: 'swarm', groundSpeed: Math.max(0, Math.round(12 + wind * 2.237)), benefit: 0 });
function authored(name) {
  const trial = { variable: 'wind', prediction: name + ' recorded trial prediction.', baseline: snapshot(), snapshot: snapshot(4) };
  const attempt = { prediction: name + ' recorded challenge prediction.', notes: name + ' original explanation.', baseline: challengeSnapshot(), snapshot: challengeSnapshot(4), reflection: name + ' saved reflection.' };
  return { inquiry: { hypothesis: name + ' independent inquiry.' },
    flightStudyObservations: { drafts: { 'canada_goose:head': name + ' Study draft.' }, records: {} },
    flightInvestigation: { variable: 'wind', prediction: name + ' prediction.', baseline: snapshot(), trials: [trial], evidence: name + ' evidence.', explanation: name + ' explanation.' },
    flightChallenges: { selectedId: 'wind', work: {
      wind: { prediction: name + ' challenge prediction.', notes: name + ' challenge notes.', setup: challengeSnapshot(), attempts: [attempt] },
      formation: { prediction: name + ' formation prediction.', notes: '', setup: null, attempts: [] },
      season: { prediction: '', notes: '', setup: null, attempts: [] }
    } }
  };
}
function props(node) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))]; }
function fixture(name = 'First', translate = (_key, fallback) => fallback) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose', flightSeason: 'fall', flightWind: 0, flightFormation: 'natural', flightPaused: true,
    flightShowAnatomy: true, flightStudyRegion: 'head', flightStudyObservationOpen: true, ...authored(name) }, refresh;
  const writes = [], host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  const ctx = makeCtx({ t: translate, announceToSR: null,
    update: (_bucket, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_bucket, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const ui = { host, writes, get state() { return state; },
    field(id) { return host.querySelector('[data-migration-id="' + id + '"]'); },
    stage() { return host.querySelector('.migration-flight-stage'); },
    open() { host.querySelectorAll('details').forEach(node => { node.open = true; }); },
    click(node) { expect(node).not.toBeNull(); ui.open(); node.focus(); act(() => node.click()); ui.open(); },
    edit(node, value) { node.focus(); act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); ui.open(); },
    openReflection() { ui.open(); ui.click(host.querySelector('[data-flight-reflection-action="edit"]')); },
    unmount() { act(() => root.unmount()); roots.delete(root); host.remove(); }
  }; ui.open(); return ui;
}
function expectOwnReferences(ui, root) {
  for (const node of root.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')) {
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const id of (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
        const target = document.getElementById(id);
        expect(target, attribute + ': ' + id).not.toBeNull();
        expect(ui.host.contains(target), attribute + ': ' + id).toBe(true);
        expect(document.querySelectorAll('[id="' + id + '"]')).toHaveLength(1);
      }
    }
  }
}
function learnerWork(ui) { return clone(Object.fromEntries(['inquiry', 'flightStudyObservations', 'flightInvestigation', 'flightChallenges'].map(key => [key, ui.state[key]]))); }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { roots.forEach(root => root.unmount()); roots.clear(); }); document.body.innerHTML = '';
  delete document.fullscreenElement; delete document.webkitFullscreenElement;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const learningFields = ['migration-mission-prediction', 'migration-mission-notes', 'migration-experiment-prediction', 'migration-experiment-evidence', 'migration-experiment-explanation'];
describe('Migration learning relationships belong to their mounted instance', () => {
  it.each(learningFields)('associates both visible prompts for %s with the correct native textarea', id => {
    const first = fixture('First'), second = fixture('Second');
    for (const ui of [first, second]) {
      const field = ui.field(id); expect(field).not.toBeNull();
      expect(field.labels).toHaveLength(1); expect(field.labels[0].control).toBe(field);
      expect(field.labels[0].htmlFor).toBe(field.id); expect(document.getElementById(field.id)).toBe(field);
      expect(ui.host.contains(field.labels[0])).toBe(true);
      expect(field.labels[0].textContent.trim()).not.toBe('');
      expect(ui.writes).toEqual([]);
    }
    expect(first.field(id).id).not.toBe(second.field(id).id);
  });

  it('preserves translated visible labels and keeps learning help inside each instance', () => {
    const translate = (_key, fallback) => 'Traduit : ' + fallback;
    const first = fixture('First', translate), second = fixture('Second', translate);
    for (const ui of [first, second]) {
      for (const id of learningFields) expect(ui.field(id).labels[0].textContent).toContain('Traduit : ');
      expectOwnReferences(ui, ui.host.querySelector('[data-migration-flight-challenges]'));
      expectOwnReferences(ui, ui.host.querySelector('[data-migration-flight-investigation]'));
    }
  });

  it('keeps IDs and textarea identity stable across input and unrelated renders', () => {
    const first = fixture('First'), second = fixture('Second');
    const field = second.field('migration-experiment-evidence'), id = field.id, firstBefore = learnerWork(first);
    second.edit(field, 'Only the second learner changed this evidence.'); second.set({ flightWind: 3 });
    expect(second.field('migration-experiment-evidence')).toBe(field); expect(field.id).toBe(id);
    expect(document.activeElement).toBe(field); expect(field.labels[0].control).toBe(field);
    expect(second.state.flightInvestigation.evidence).toBe('Only the second learner changed this evidence.');
    expect(learnerWork(first)).toEqual(firstBefore); expect(first.writes).toEqual([]);
  });

  it('keeps labels on the remaining instance after its earlier peer unmounts', () => {
    const first = fixture('First'), second = fixture('Second');
    const identities = learningFields.map(id => [id, second.field(id).id]); first.unmount(); second.set({ flightWind: 2 });
    for (const [key, id] of identities) {
      const field = second.field(key); expect(field.id).toBe(id); expect(field.labels[0].control).toBe(field);
      expect(document.getElementById(id)).toBe(field);
    }
  });

  it('gives simultaneous saved reflection editors their own labels and help', () => {
    const first = fixture('First'), second = fixture('Second'); first.openReflection(); second.openReflection();
    const key = 'migration-mission-reflection-wind-1';
    for (const ui of [first, second]) {
      const field = ui.field(key), help = ui.field(key + '-help');
      expect(field.labels).toHaveLength(1); expect(field.labels[0].control).toBe(field);
      expect(document.getElementById(field.getAttribute('aria-describedby'))).toBe(help);
      expectOwnReferences(ui, ui.host.querySelector('[data-migration-flight-challenges]'));
    }
    expect(first.field(key).id).not.toBe(second.field(key).id);
    const firstBefore = learnerWork(first); second.edit(second.field(key), 'My second later reflection.');
    second.click(second.host.querySelector('[data-flight-reflection-action="save"]'));
    expect(second.state.flightChallenges.work.wind.attempts[0].reflection).toBe('My second later reflection.');
    expect(learnerWork(first)).toEqual(firstBefore);
  });

  it('keeps a stale reflection draft labelled locally without changing saved work', () => {
    const first = fixture('First'), second = fixture('Second'); first.openReflection(); second.openReflection();
    for (const ui of [first, second]) ui.click(ui.host.querySelector('[data-flight-challenge="formation"]'));
    const key = 'migration-mission-reflection-stale';
    for (const ui of [first, second]) {
      const field = ui.field(key); expect(field).not.toBeNull(); expect(field.readOnly).toBe(true);
      expect(field.labels[0].control).toBe(field); expect(document.getElementById(field.id)).toBe(field);
      expect(field.value).toContain('saved reflection.');
    }
    expect(first.field(key).id).not.toBe(second.field(key).id);
  });

  it('resolves learning section links to the correct deck and notebook', () => {
    const first = fixture('First'), second = fixture('Second');
    for (const ui of [first, second]) {
      const links = [ui.host.querySelector('.migration-mission-active a[href]'), ui.host.querySelector('.migration-experiment-jump')];
      for (const link of links) {
        expect(link).not.toBeNull(); const target = document.getElementById(link.getAttribute('href').slice(1));
        expect(target).not.toBeNull(); expect(ui.host.contains(target)).toBe(true);
      }
    }
  });

  it('revisits and closes the second saved pair using only its own 3D focus target', () => {
    const first = fixture('First'), second = fixture('Second'), firstBefore = learnerWork(first), secondBefore = learnerWork(second);
    second.click(second.host.querySelector('[data-experiment-revisit="1"]'));
    expect(document.activeElement).toBe(second.stage()); expect(first.stage()).not.toBe(document.activeElement);
    const pair = second.host.querySelector('[data-experiment-pair-review]'); expect(pair).not.toBeNull();
    expectOwnReferences(second, second.host.querySelector('[data-migration-flight-investigation]'));
    second.click(pair.querySelector('[data-pair-review="close"]'));
    expect(document.activeElement).toBe(second.stage()); expect(second.host.querySelector('[data-experiment-pair-review]')).toBeNull();
    expect(learnerWork(first)).toEqual(firstBefore); expect(learnerWork(second)).toEqual(secondBefore);
  });

  it('returns from the second saved pair to its own evidence field and back to its own review', () => {
    const first = fixture('First'), second = fixture('Second'), firstBefore = learnerWork(first);
    second.click(second.host.querySelector('[data-experiment-revisit="1"]'));
    second.click(second.host.querySelector('[data-trial-evidence-return]'));
    expect(document.activeElement).toBe(second.field('migration-experiment-evidence'));
    second.click(second.host.querySelector('[data-experiment-action="inspect-saved-comparison"]'));
    expect(document.activeElement).toBe(second.host.querySelector('[data-pair-review="baseline"]'));
    expect(learnerWork(first)).toEqual(firstBefore); expect(first.writes).toEqual([]);
  });

  it.each(['hidden', 'inert', 'fullscreen'])('does not focus an unavailable %s scene after revisiting a saved pair', kind => {
    const first = fixture('First'), second = fixture('Second');
    if (kind === 'hidden') second.stage().hidden = true;
    else if (kind === 'inert') second.stage().setAttribute('inert', '');
    else Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: first.stage().closest('.migration-flight-deck') });
    const action = second.host.querySelector('[data-experiment-revisit="1"]'); second.click(action);
    expect(document.activeElement).toBe(action); expect(document.activeElement).not.toBe(first.stage());
  });
});
