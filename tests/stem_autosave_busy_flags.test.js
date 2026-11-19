// Whole-bucket STEM autosave used to keep in-flight request flags (aiLoading: true).
// A reload mid-request then restored a spinner that no reply would ever clear,
// leaving the AI button disabled. The host now drops a boolean-true request flag
// on save AND on restore (older saves already hold one).
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const hostSource = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
function hostBlock(name) {
  const start = hostSource.indexOf('// ' + name + '_START');
  const end = hostSource.indexOf('// ' + name + '_END', start);
  if (start < 0 || end < 0) throw new Error('Missing host helper: ' + name);
  return hostSource.slice(start, end);
}

let H;
beforeAll(() => {
  H = Function('window', 'document', 'localStorage',
    hostBlock('BEEHIVE_PERSISTENCE_HELPER') + hostBlock('STEM_AUTOSAVE') +
    '\nreturn { payload: _stemPersistencePayload, hydrate: _stemHydrateLabToolData, drop: _stemDropBusy };'
  )(new EventTarget(), new EventTarget(), { getItem: () => null, setItem: () => {} });
});

// Every request flag a whole-bucket-saved tool sets today (traced 2026-11-18).
const FLAGS = {
  wave: ['aiLoading'], physics: ['aiLoading', 'quizHintLoading'], punnett: ['_aiLoading'],
  chemBalance: ['_chemAILoading'], galaxy: ['isGeneratingQuiz'], rockCycle: ['aiLoading', 'loading'],
  waterCycle: ['hydrologistLoading', 'aiReadLoading', 'aiQuizLoading'], lumen: ['aiLoading'],
  cellProgress: ['_cellAILoading'],
};

describe('STEM autosave never keeps an in-flight request flag', () => {
  it('drops each known flag on save, and keeps the rest of the bucket', () => {
    for (const [bucket, flags] of Object.entries(FLAGS)) {
      const state = { score: 3, notes: 'kept', showHelp: true, aiResponse: 'last answer' };
      flags.forEach((f) => { state[f] = true; });
      const saved = H.payload({ [bucket]: state })[bucket];
      flags.forEach((f) => expect(saved, bucket + '.' + f).not.toHaveProperty(f));
      expect(saved).toMatchObject({ score: 3, notes: 'kept', showHelp: true, aiResponse: 'last answer' });
      flags.forEach((f) => expect(state[f], 'the live state was mutated').toBe(true));
    }
  });

  it('drops a flag that an older save already holds, on restore', () => {
    const restored = H.hydrate({}, { physics: { aiLoading: true, quizHintLoading: true, score: 4 }, galaxy: { isGeneratingQuiz: true, visited: ['m31'] } });
    expect(restored.physics).toEqual({ score: 4 });
    expect(restored.galaxy).toEqual({ visited: ['m31'] });
    expect(restored._persisted).toBe(true);
  });

  it('covers Flight Sim too', () => {
    const saved = H.payload({ flightSim: { aiLoading: true, badges: ['a'], view: 'flying' } }).flightSim;
    expect(saved).toEqual({ badges: ['a'] });
  });

  it('leaves false values and look-alike names alone', () => {
    const b = { aiLoading: false, loadingTipsSeen: 2, preloaded: true, unloadingDone: true, busyBeeBadge: 'x', generatedCount: 5 };
    expect(H.drop(b)).toBe(b);
  });
});
