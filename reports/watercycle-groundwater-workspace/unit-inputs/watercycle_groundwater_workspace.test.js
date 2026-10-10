import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadTool, resetStemLab, makeCtx, newStore, React, ReactDOMServer,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const PARTS = [
  {
    id: 'soil', label: 'Soil pore water', title: 'Air and water share pore space',
    detail: 'Water entering soil is infiltration. It can remain as soil water, move toward roots, evaporate, or continue deeper.',
    look: 'Find water beside air between the solid grains. Unsaturated does not mean completely dry.',
  },
  {
    id: 'boundary', label: 'Water table', title: 'A boundary, not a solid underground floor',
    detail: 'Water can cling to grain surfaces and rise into small pores. This creates a capillary fringe above the water table that can be saturated or nearly saturated. Actual water-table depth varies with local conditions.',
    look: 'Follow the dashed boundary across the cutaway. It does not represent an impermeable layer.',
  },
  {
    id: 'groundwater', label: 'Groundwater pores', title: 'Water fills connected spaces',
    detail: 'Groundwater can move through connected pores and fractures. An aquifer stores and transmits groundwater; it is not simply an empty underground lake.',
    look: 'Trace the possible flow through the water-filled spaces around grains. The arrow does not measure speed.',
  },
];
const QUIZ = {
  q: 'Where can groundwater move in an aquifer?', a: 'Connected pores and fractures',
  opts: ['Connected pores and fractures', 'Only an empty underground lake'],
  answered: true, chosen: 'Only an empty underground lake', score: 2, concept: 'aquifer',
};
const PROTECTED_STATE = {
  climSolar: 1.2, climTemp: 19, climWind: 1.4,
  landRainIntensity: 70, landSaturation: 60, landPermeability: 'high', landSlope: 'steep', landCover: 'forest',
  wcScenarioBaseline: { climTemp: 15, landSaturation: 40 }, wcScenarioPreset: 'custom',
  wcExperimentLog: [{ key: 'saved-1', notes: { evidence: 'Keep recorded evidence.', nextTest: 'Keep the next test.' } }],
  wcPrediction: 'evaporation', wcReplayedObservation: 'saved-1',
  wcCheckReflections: { kept: { observation: 'Keep the Check reflection.' } },
  journeyActive: true, journeyPaused: true, journeyState: 'aquifer_flow', journeyReplayProgress: 0.42,
  journeyLoops: 3, journeyPaths: { infiltrate: 2 }, journeyLastPath: 'infiltrate', journeySpeed: 0.5,
  wcWalkthroughActive: true, wcWalkthroughIndex: 2, wc2dPaused: true,
  researchPoints: 25, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  wcQuiz: QUIZ,
  wcMyth: { idx: 6, s: 'Groundwater flows in big underground rivers and lakes.', t: false, answered: true, chosen: true },
  vocabWordsStudied: ['aquifer'], completedChallenges: ['quiz_pass', 'complete_journey', 'myth_buster'],
};
const fixtures = [];
let cfg, frames = [];
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
function treeElements(tree) {
  const result = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    result.push(node); visit(node.props.children);
  }
  visit(tree); return result;
}
function record(part = 'soil', answer = '', identity = 'groundwater-lens-v1') {
  return { version: 1, identity, part, answer };
}
function protectedData(data) {
  return clone(Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'wcGroundwaterLens')));
}
function before(first, second) {
  expect(first, 'first workspace element').not.toBeNull();
  expect(second, 'second workspace element').not.toBeNull();
  expect(Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
}

// Use the complete registered tool and its real native element callbacks.
// SSR keeps canvas refs unmounted; browser QA covers focus through reconciliation.
function session(scope = 'explorer', overrides = {}) {
  const initial = freeze({
    ...clone(PROTECTED_STATE), wcMode: 'explorer', wcSection: scope === 'check' ? 'check' : 'journey',
    wcJourneyChapter: 'land', wcJourneyLandStep: 'infiltrating', journeyView: '2d',
    wcGroundwaterLens: null, wcCheckInvestigation: null, ...overrides,
  });
  const store = newStore({ waterCycle: initial });
  const container = document.createElement('div'); document.body.append(container); fixtures.push(container);
  const writes = [], awardXP = vi.fn(), celebrate = vi.fn();
  let tree;
  function setToolData(updater) {
    const previous = store.toolData;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    if (next && next !== previous) {
      writes.push(Object.keys(next.waterCycle || {}).filter(key => next.waterCycle[key] !== previous.waterCycle?.[key]));
      store.toolData = next; store.dirty = true;
    }
  }
  const api = {
    scope, container, writes, awardXP, celebrate,
    get data() { return store.toolData.waterCycle; },
    get lens() {
      const found = container.querySelectorAll('[data-gw-scope="' + scope + '"]');
      expect(found, scope + ' native groundwater lens').toHaveLength(1); return found[0];
    },
    render() {
      for (let pass = 0; pass < 5; pass++) {
        store.dirty = false;
        const ctx = makeCtx({ toolData: store.toolData, setToolData, gradeLevel: '11th Grade', awardXP, celebrate }, store);
        const Comp = () => { tree = cfg.render(ctx); return tree; };
        container.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp));
        if (!store.dirty) break;
      }
      return api;
    },
    invoke(attribute, value) {
      const found = treeElements(tree).filter(node => node.props[attribute] === value);
      expect(found, attribute + '=' + value + ' native callback').toHaveLength(1);
      expect(found[0].type).toBe('button'); expect(found[0].props.type).toBe('button');
      expect(found[0].props.disabled).not.toBe(true); expect(typeof found[0].props.onClick).toBe('function');
      found[0].props.onClick({ preventDefault() {}, stopPropagation() {} });
      return api;
    },
    click(attribute, value) { return api.invoke(attribute, value).render(); },
    focusFrames() {
      vi.runOnlyPendingTimers();
      for (let pass = 0; frames.length && pass < 12; pass++) {
        const pending = frames; frames = []; pending.forEach(callback => callback());
      }
      return api;
    },
    setState(patch) {
      store.toolData = { ...store.toolData, waterCycle: freeze({ ...api.data, ...patch }) };
      return api.render();
    },
    resetTracking() { writes.length = 0; awardXP.mockClear(); celebrate.mockClear(); frames = []; return api; },
  };
  api.render();
  if (scope === 'check' && !api.data.wcCheckInvestigation) {
    api.click('id', 'wcCheckInvestigateQuiz').focusFrames();
  }
  return api.resetTracking();
}
function seedBothScopes(s, activePart = 'soil', activeAnswer = 'soil_storage') {
  const checkIdentity = s.data.wcCheckInvestigation?.key || 'retained-check-question';
  const records = {
    explorer: record('groundwater', 'dry_soil'),
    check: record('boundary', 'all_recharge', checkIdentity),
  };
  records[s.scope] = record(activePart, activeAnswer, s.scope === 'check' ? checkIdentity : 'groundwater-lens-v1');
  return s.setState({ wcGroundwaterLens: records }).resetTracking();
}
function expectOnlyLensWrite(s, previous) {
  expect(s.writes).toEqual([['wcGroundwaterLens']]);
  expect(protectedData(s.data)).toEqual(previous);
  expect(s.awardXP).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
}

beforeAll(() => { resetStemLab(); cfg = loadTool(SOURCE_PATH, 'waterCycle'); }, 60000);
beforeEach(() => {
  vi.useFakeTimers(); frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
});
afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove()); frames = [];
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Water Cycle native groundwater workspace', () => {
  it('puts the selected reading and observation cue before the paired diagrams in Explorer and Check', () => {
    for (const scope of ['explorer', 'check']) {
      const s = session(scope);
      if (scope === 'explorer') expect(s.lens.closest('#wcJourneyChapterCard')?.dataset.chapterId).toBe('land');
      for (const part of PARTS) {
        s.click('data-gw-select', part.id);
        const reading = s.lens.querySelector('.wc-gw-reading');
        expect(reading.querySelector('h5').textContent).toBe(part.title);
        expect(reading.textContent).toContain('Look for: ' + part.look);
        before(reading, s.lens.querySelector('.wc-gw-diagrams'));
        expect(s.lens.querySelectorAll('.wc-gw-diagrams > figure')).toHaveLength(2);
      }
    }
  });

  it('gives each native selector a single scoped reading target and a correct pressed state', () => {
    for (const scope of ['explorer', 'check']) {
      const s = session(scope);
      for (const part of PARTS) {
        s.click('data-gw-select', part.id);
        const buttons = [...s.lens.querySelectorAll('[data-gw-select]')];
        expect(buttons.map(button => button.dataset.gwSelect)).toEqual(PARTS.map(item => item.id));
        expect(buttons.filter(button => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
        for (const button of buttons) {
          expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
          expect(button.getAttribute('aria-pressed')).toBe(String(button.dataset.gwSelect === part.id));
          expect(button.getAttribute('aria-controls')).toBe('wcGroundwater-' + scope + '-Detail');
          expect(s.lens.querySelectorAll('[id="' + button.getAttribute('aria-controls') + '"]')).toHaveLength(1);
        }
      }
    }
  });

  it('keeps Explorer and Check IDs unique and resolves reading and practice names within their own scope', () => {
    const explorer = session(), check = session('check');
    const ids = [explorer, check].flatMap(s => [...s.lens.querySelectorAll('[id]')].map(node => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of [explorer, check]) {
      for (const node of s.lens.querySelectorAll('[aria-labelledby]')) {
        for (const id of node.getAttribute('aria-labelledby').split(/\s+/)) {
          expect(id.startsWith('wcGroundwater-' + s.scope + '-')).toBe(true);
          const targets = s.lens.querySelectorAll('[id="' + id + '"]');
          expect(targets).toHaveLength(1); expect(targets[0].textContent.trim()).not.toBe('');
        }
      }
      expect(s.lens.querySelector('.wc-gw-reading').getAttribute('aria-labelledby')).toBe('wcGroundwater-' + s.scope + '-DetailTitle');
      expect(s.lens.querySelector('.wc-gw-answers').getAttribute('aria-labelledby')).toBe('wcGroundwater-' + s.scope + '-Question');
    }
  });

  it('announces each selection briefly without repeating the long scientific explanation', () => {
    for (const scope of ['explorer', 'check']) {
      const s = session(scope);
      for (const part of PARTS) {
        s.click('data-gw-select', part.id);
        const announcement = s.lens.querySelector('.wc-gw-announcement');
        expect(announcement.getAttribute('role')).toBe('status');
        expect(announcement.textContent).toBe(part.label + ' selected. ' + part.title);
        expect(announcement.textContent.length).toBeLessThan(160);
        expect(announcement.textContent).not.toContain(part.detail);
      }
    }
  });

  it('keeps every original explanation in a closed disclosure after the diagrams and key', () => {
    for (const scope of ['explorer', 'check']) {
      const s = session(scope);
      for (const part of PARTS) {
        s.click('data-gw-select', part.id);
        const context = s.lens.querySelector('details.wc-gw-context');
        expect(context).not.toBeNull(); expect(context.open).toBe(false);
        expect(context.querySelector(':scope > summary').textContent).toBe('Understand this zone');
        expect(context.querySelector('p').textContent).toBe(part.detail);
        expect(s.lens.querySelector('.wc-gw-reading').textContent).not.toContain(part.detail);
        before(s.lens.querySelector('.wc-gw-diagrams'), context);
        before(s.lens.querySelector('.wc-gw-key'), context);
      }
    }
  });

  it('preserves the native schematic geometry and distinct pore cues for all three inspections', () => {
    const s = session();
    for (const part of PARTS) {
      s.click('data-gw-select', part.id);
      const cutaway = s.lens.querySelector('[data-gw-figure="cutaway"] svg');
      const pores = s.lens.querySelector('[data-gw-pore-state]');
      expect(cutaway.getAttribute('viewBox')).toBe('0 0 120 210');
      expect(pores.getAttribute('viewBox')).toBe('0 0 260 210');
      expect(cutaway.querySelectorAll('[data-gw-material="grain"]')).toHaveLength(13);
      expect(pores.querySelectorAll('[data-gw-material="grain"]')).toHaveLength(11);
      expect(cutaway.querySelector('[data-gw-cue="water-table"]').getAttribute('d')).toBe('M5 112Q35 107 60 112T115 112');
      expect(cutaway.querySelector('[data-gw-cue="capillary-fringe"]')).not.toBeNull();
      expect(pores.dataset.gwPoreState).toBe(part.id);
      const cue = { soil: 'partial-water', boundary: 'capillary-water', groundwater: 'filled-pores' }[part.id];
      expect(pores.querySelector('[data-gw-cue="' + cue + '"]')).not.toBeNull();
      expect(pores.querySelectorAll('[data-gw-cue="open-air"]')).toHaveLength(part.id === 'soil' ? 3 : 0);
      expect([...s.lens.querySelectorAll('.wc-gw-key [data-material]')].map(node => node.dataset.material)).toEqual(['grain', 'water', 'air']);
      for (const svg of [cutaway, pores]) {
        expect(svg.getAttribute('aria-hidden')).toBe('true'); expect(svg.getAttribute('focusable')).toBe('false');
      }
    }
  });

  it('changes only lens metadata and clears only the active practice answer when a different part is selected', () => {
    for (const scope of ['explorer', 'check']) {
      const s = seedBothScopes(session(scope));
      const opposite = scope === 'explorer' ? 'check' : 'explorer';
      const otherRecord = clone(s.data.wcGroundwaterLens[opposite]);
      const previous = protectedData(s.data);
      s.click('data-gw-select', 'groundwater');
      expectOnlyLensWrite(s, previous);
      expect(s.data.wcGroundwaterLens[scope]).toMatchObject({ part: 'groundwater', answer: '' });
      expect(s.data.wcGroundwaterLens[opposite]).toEqual(otherRecord);
      expect(s.lens.querySelector('[data-gw-result]').dataset.gwResult).toBe('waiting');
      expect(s.lens.querySelectorAll('[data-gw-answer][aria-pressed="true"]')).toHaveLength(0);
    }
  });

  it('resets the active answer on reselection and keeps focus on the native selector callback', () => {
    for (const scope of ['explorer', 'check']) {
      const s = seedBothScopes(session(scope), 'soil', 'dry_soil');
      const opposite = scope === 'explorer' ? 'check' : 'explorer';
      const otherRecord = clone(s.data.wcGroundwaterLens[opposite]);
      const button = s.lens.querySelector('[data-gw-select="soil"]');
      button.focus();
      const previous = protectedData(s.data);
      s.invoke('data-gw-select', 'soil').focusFrames();
      expect(document.activeElement).toBe(button);
      expectOnlyLensWrite(s, previous);
      expect(s.data.wcGroundwaterLens[scope]).toMatchObject({ part: 'soil', answer: '' });
      expect(s.data.wcGroundwaterLens[opposite]).toEqual(otherRecord);
      s.render(); expect(s.lens.querySelector('[data-gw-result]').dataset.gwResult).toBe('waiting');
    }
  });

  it('keeps the unscored answer feedback and its focus target in the active scope', () => {
    for (const scope of ['explorer', 'check']) {
      const s = seedBothScopes(session(scope));
      const opposite = scope === 'explorer' ? 'check' : 'explorer';
      const otherRecord = clone(s.data.wcGroundwaterLens[opposite]);
      for (const [answer, result] of [['soil_storage', 'supported'], ['all_recharge', 'retry'], ['dry_soil', 'retry']]) {
        s.resetTracking(); const previous = protectedData(s.data);
        s.click('data-gw-answer', answer).focusFrames();
        expectOnlyLensWrite(s, previous);
        expect(s.lens.querySelector('[data-gw-result]').dataset.gwResult).toBe(result);
        expect(s.lens.querySelector('[data-gw-answer="' + answer + '"]').getAttribute('aria-pressed')).toBe('true');
        expect(document.activeElement.id).toBe('wcGroundwater-' + scope + '-FeedbackTitle');
        expect(document.activeElement.tabIndex).toBe(-1);
        expect(s.data.wcGroundwaterLens[opposite]).toEqual(otherRecord);
      }
    }
  });

  it('retains the inspection but discards stale native Check feedback when the canonical question changes', () => {
    const prefix = 'q'.repeat(160);
    const s = seedBothScopes(session('check', { wcQuiz: { ...clone(QUIZ), q: prefix + '-one' } }), 'boundary');
    s.click('data-gw-answer', 'soil_storage');
    const firstKey = s.data.wcCheckInvestigation.key;
    const explorerRecord = clone(s.data.wcGroundwaterLens.explorer);
    s.setState({ wcQuiz: { ...clone(QUIZ), q: prefix + '-two' }, wcCheckInvestigation: null });
    s.click('id', 'wcCheckInvestigateQuiz').focusFrames().resetTracking();
    const secondKey = s.data.wcCheckInvestigation.key;
    expect(secondKey).not.toBe(firstKey);
    expect(s.lens.dataset.gwPart).toBe('boundary');
    expect(s.lens.querySelector('[data-gw-result]').dataset.gwResult).toBe('waiting');
    expect(s.lens.querySelectorAll('[data-gw-answer][aria-pressed="true"]')).toHaveLength(0);
    const previous = protectedData(s.data);
    s.click('data-gw-answer', 'all_recharge').focusFrames();
    expectOnlyLensWrite(s, previous);
    expect(s.data.wcGroundwaterLens.check).toMatchObject({ identity: secondKey, part: 'boundary', answer: 'all_recharge' });
    expect(s.data.wcGroundwaterLens.explorer).toEqual(explorerRecord);
    expect(s.lens.querySelector('[data-gw-result]').dataset.gwResult).toBe('retry');
  });
});
