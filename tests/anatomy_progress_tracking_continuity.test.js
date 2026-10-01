import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const flagKeys = ['_systemsExplored', '_viewsUsed', '_structuresViewed'];
const badges = Object.fromEntries(['firstStructure', 'systemExplorer5', 'allSystems', 'layerMaster', 'quizAce5', 'quizAce15',
  'streak3', 'viewToggler', 'searchPro', 'aiCurious', 'structureScholar', 'tourComplete', 'connectionExplorer', 'clinicalExpert',
  'mnemonicLearner', 'pathwayTracer', 'spotterPro', 'compareMaster', 'speedDemon', 'anatomyChampion'].map(id => [id, true]));
const base = {
  system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull', _activeTab: 'explore',
  _systemsExplored: {}, _viewsUsed: {}, _structuresViewed: {}, _badges: badges,
  completedChallenges: ['explore_systems', 'spotter_3', 'cases_solved', 'pathways_traced', 'mnemonics_viewed', 'compare_structures'],
  researchPoints: 100, totalRP: 125, _structureNotes: { ribs: 'My latest saved note.' },
  _structureConfidence: { ribs: 'learning' }, _confidenceAt: { ribs: now },
  _retrievalEvidence: { ribs: { attempts: 4, correct: 3 } },
  _systemsMotionLearning: { exercise: { explanation: 'My saved activity explanation.' } },
  _feedbackExperiment: { direction: 'cool', explanation: 'My saved cooling explanation.' },
  _aiInput: 'My current Tutor draft.', _aiMessages: [{ role: 'user', text: 'My earlier question.' }],
  quizIdx: 3, quizScore: 2, _quizAttempts: 4, quizFeedback: { chosen: 'sternum', correct: true, questionKey: 'saved-question' },
  _quizQuestion: { token: 'preserved-question' }, _flashcardDeck: ['ribs', 'femur'], _flashcardIdx: 1, _flashcardFlipped: true
};
const learningWork = state => clone(Object.fromEntries(Object.keys(base).filter(key => !flagKeys.includes(key) &&
  !['system', 'view', 'complexity', 'selectedStructure', '_activeTab'].includes(key)).map(key => [key, state[key]])));
const flags = state => clone(Object.fromEntries(flagKeys.map(key => [key, state[key]])));

beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  delete window.__alloAnatomyTrackingPending; delete window.__alloAnatomyProgressFingerprint;
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  delete window.__alloAnatomyTrackingPending; delete window.__alloAnatomyProgressFingerprint;
});
const settle = () => vi.advanceTimersByTime(10);
function session(file, extra = {}, sharedTool) {
  const tool = sharedTool || loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, grade = '9', deferred = false, pending = [], commits = 0;
  const announce = vi.fn(), toast = vi.fn(), xp = vi.fn(), celebrate = vi.fn();
  const apply = update => {
    const before = data, next = typeof update === 'function' ? update(data) : update;
    if (next && next !== data) {
      if (JSON.stringify(flags(next.anatomy)) !== JSON.stringify(flags(before.anatomy))) commits++;
      data = next;
    }
  };
  const setToolData = update => { if (deferred) pending.push(update); else apply(update); };
  return {
    tool, announce, toast, xp, celebrate,
    data: () => data.anatomy, commits: () => commits,
    patch(patch) { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade(value) { grade = value; },
    render() { return tool.render(makeCtx({ toolData: data, gradeLevel: grade, setToolData,
      announceToSR: announce, addToast: toast, awardXP: xp, celebrate })); },
    defer() { deferred = true; },
    flush() { deferred = false; const updates = pending; pending = []; updates.forEach(apply); }
  };
}
function expectQuiet(s) {
  expect(s.announce).not.toHaveBeenCalled(); expect(s.toast).not.toHaveBeenCalled();
  expect(s.xp).not.toHaveBeenCalled(); expect(s.celebrate).not.toHaveBeenCalled();
}
const foreign = [
  ['mode', { _activeTab: 'connections' }],
  ['system', { system: 'circulatory', selectedStructure: 'heart' }],
  ['view', { view: 'posterior' }],
  ['complexity', { complexity: 2 }],
  ['selection', { selectedStructure: 'femur' }],
  ['open study sheet', { _showStudySheet: true }],
  ['study sheet revision', { _studySheetRevision: 1 }],
  ['study import revision', { _studyImportRevision: 1 }]
];

for (const file of files) describe('Passive Anatomy progress continuity: ' + file, () => {
  it('adds the current observation to the latest valid maps without replacing newer saved progress or learning work', () => {
    const s = session(file); s.render();
    s.patch({ _systemsExplored: { circulatory: true, forged: true }, _viewsUsed: { posterior: true, forged: true },
      _structuresViewed: { ribs: true, forged: true }, _aiInput: 'A newer Tutor question.' });
    const saved = learningWork(s.data()); settle();
    expect(flags(s.data())).toEqual({ _systemsExplored: { circulatory: true, skeletal: true },
      _viewsUsed: { posterior: true, anterior: true }, _structuresViewed: { ribs: true, skull: true } });
    expect(learningWork(s.data())).toEqual(saved); expect(s.commits()).toBe(1); expectQuiet(s);
  });

  it('unions separately accepted observations when the learner opens another structure', () => {
    const s = session(file); s.render(); settle();
    expect(s.data()._structuresViewed.skull).toBe(true);
    s.patch({ selectedStructure: 'femur' }); s.render(); settle();
    expect(s.data()._structuresViewed).toEqual({ skull: true, femur: true });
    expect(s.commits()).toBe(2); expectQuiet(s);
  });

  it('rejects an earlier queued selection and records the latest rendered structure while preserving prior flags', () => {
    const s = session(file); s.render();
    s.patch({ selectedStructure: 'femur', _structuresViewed: { ribs: true } }); s.render(); settle();
    expect(s.data()._structuresViewed).toEqual({ ribs: true, femur: true });
    expect(s.commits()).toBe(1); expectQuiet(s);
  });

  it('reads the newest maps when an accepted tracking updater itself waits in the React queue', () => {
    const s = session(file); s.defer(); s.render(); settle();
    s.patch({ _systemsExplored: { nervous: true }, _viewsUsed: { posterior: true }, _structuresViewed: { ribs: true } });
    const saved = learningWork(s.data()); s.flush();
    expect(flags(s.data())).toEqual({ _systemsExplored: { nervous: true, skeletal: true },
      _viewsUsed: { posterior: true, anterior: true }, _structuresViewed: { ribs: true, skull: true } });
    expect(learningWork(s.data())).toEqual(saved); expect(s.commits()).toBe(1); expectQuiet(s);
  });

  it('commits an unchanged repeated render only once', () => {
    const s = session(file); s.render(); s.render(); s.render(); settle();
    expect(s.commits()).toBe(1); expect(s.data()._structuresViewed.skull).toBe(true);
    s.render(); settle(); expect(s.commits()).toBe(1); expectQuiet(s);
  });

  for (const delivery of ['timer', 'queued updater']) for (const [name, patch] of foreign) {
    it('rejects stale passive progress after a ' + name + ' change before its ' + delivery + ' finishes', () => {
      const s = session(file); if (delivery === 'queued updater') s.defer(); s.render();
      if (delivery === 'queued updater') settle();
      s.patch(patch); const saved = clone(s.data());
      if (delivery === 'queued updater') s.flush(); else settle();
      expect(s.data()).toEqual(saved); expect(s.commits()).toBe(0); expectQuiet(s);
    });
  }

  it('queues the fresh import observation even when an identical earlier observation is pending', () => {
    const s = session(file); s.render();
    s.patch({ _studyImportRevision: 1, _structuresViewed: { ribs: true } }); s.render(); settle();
    expect(s.data()._structuresViewed).toEqual({ ribs: true, skull: true });
    expect(s.data()._studyImportRevision).toBe(1); expect(s.commits()).toBe(1); expectQuiet(s);
  });

  it('rejects a queued old content band after a new profile render publishes the current band', () => {
    const s = session(file, { complexity: 1 }); s.defer(); s.render(); settle();
    s.grade('1'); s.render(); vi.clearAllTimers(); const saved = clone(s.data()); s.flush();
    expect(s.data()).toEqual(saved); expect(s.commits()).toBe(0); expectQuiet(s);
  });
  it('keeps identical passive observations independent in separate mounted stores', () => {
    const first = session(file), second = session(file, { _aiInput: 'A separate saved Tutor draft.' }, first.tool);
    const firstSaved = learningWork(first.data()), secondSaved = learningWork(second.data());
    first.render(); second.render(); settle();
    for (const s of [first, second]) {
      expect(flags(s.data())).toEqual({ _systemsExplored: { skeletal: true }, _viewsUsed: { anterior: true }, _structuresViewed: { skull: true } });
      expect(s.commits()).toBe(1); expectQuiet(s);
    }
    expect(learningWork(first.data())).toEqual(firstSaved); expect(learningWork(second.data())).toEqual(secondSaved);
  });

});
