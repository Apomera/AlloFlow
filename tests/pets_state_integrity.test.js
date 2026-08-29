import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');
const HOST_PATHS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
];
const HOSTS = HOST_PATHS.map((file) => ({ file, source: fs.readFileSync(path.join(ROOT, file), 'utf8') }));

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Could not slice ${startMarker} -> ${endMarker}`);
  return source.slice(start, end).trim();
}

function assignedFunction(source, name, endMarker) {
  const assignment = between(source, `var ${name} = function`, endMarker);
  const expression = assignment
    .replace(new RegExp(`^var ${name} = `), '')
    .replace(/;\s*$/, '');
  return vm.runInNewContext(`(${expression})`);
}

describe('Pets Decoder mastery stays canonical outside the tool', () => {
  it('publishes a trusted count in both persistence formats', () => {
    expect(PETS).toContain('snapshot.decoderCanonicalCount = canonicalDecoderMasteryCount(snapshot.decoderMastery || {})');
    expect(PETS).toContain('decoderCanonicalCount: snapshot.decoderCanonicalCount || 0');
  });

  it('filters a legacy orphan while retaining a self-identifying canonical record', () => {
    const count = assignedFunction(HOSTS[0].source, '_countPetsDecoderMastery', 'var _atlasEntries = [');
    const signal = 'Loose body + soft eyes + open mouth + wagging mid-height tail';
    const key = `🐕 Dogs|${signal}`;
    const legacyState = {
      decoderMastery: {
        [key]: { species: '🐕 Dogs', signal, correctCount: 1 },
        'legacy|removed-signal': { correctCount: 99 },
      },
    };
    expect(count(legacyState)).toBe(1);
    expect(count({ ...legacyState, decoderCanonicalCount: 1 })).toBe(1);
    expect(count({ decoderCanonicalCount: 99 })).toBe(27);
    expect(count({ decoderCanonicalCount: -4 })).toBe(0);
  });

  it('ships the same safe counter in every Atlas host copy', () => {
    const canonicalHelper = between(HOSTS[0].source, 'var _countPetsDecoderMastery = function', 'var _atlasEntries = [');
    for (const host of HOSTS) {
      expect(host.source, host.file).not.toContain('Object.keys(s.decoderMastery).length');
      expect(between(host.source, 'var _countPetsDecoderMastery = function', 'var _atlasEntries = ['), host.file)
        .toBe(canonicalHelper);
      expect(host.source, host.file)
        .toContain("count: function () { return _countPetsDecoderMastery(_readSlot('__alloflowPetsLab', 'petsLab.state.v1')); }");
    }
  });
});

describe('Pets restored-state guards', () => {
  it('preserves only authored completion reasons while scrubbing arbitrary saved labels', () => {
    const source = between(
      PETS,
      'var PETS_EVIDENCE_MODULE_LABELS =',
      'function normalizePetsBadges(',
    );
    const normalize = vm.runInNewContext(
      `(function () { ${source}; return normalizePetsProgressMap; })()`,
      { Date, isFinite },
    );
    const completed = JSON.parse(JSON.stringify(normalize({
      dogs: {
        completed: '2026-08-26T12:00:00.000Z',
        reason: 'Read species evidence',
      },
      training: {
        completed: '2026-08-26T12:01:00.000Z',
        reason: 'Finished the 10-round reinforcement trainer',
      },
      nutrition: {
        completed: '2026-08-26T12:02:00.000Z',
        reason: '<img src=x onerror=alert(1)>',
      },
      aiPractice: {
        completed: '2026-08-26T12:03:00.000Z',
        reason: 'Wrote a response and completed a rubric check',
      },
      bodyLang: {
        completed: '2026-08-26T12:04:00.000Z',
        reason: 'Finished a 10-signal random decoder practice set',
      },
      glossary: {
        completed: 'not-a-date',
        reason: 'Reviewed by learner',
      },
      constructor: {
        completed: '2026-08-26T12:05:00.000Z',
        reason: 'PRIVATE PROTOTYPE COMPLETION',
      },
    }, true)));

    expect(completed).toEqual({
      dogs: {
        completed: '2026-08-26T12:00:00.000Z',
        reason: 'Reviewed by learner',
      },
      training: {
        completed: '2026-08-26T12:01:00.000Z',
        reason: 'Finished the 10-round reinforcement trainer',
      },
      nutrition: {
        completed: '2026-08-26T12:02:00.000Z',
        reason: 'Activity completed',
      },
      aiPractice: {
        completed: '2026-08-26T12:03:00.000Z',
        reason: 'Wrote a response and completed a rubric check',
      },
      bodyLang: {
        completed: '2026-08-26T12:04:00.000Z',
        reason: 'Finished a 10-signal random decoder practice set',
      },
    });
  });

  it('bounds Care Trade-off state and drops unknown saved fields and log content', () => {
    const source = between(
      PETS,
      'function normalizeCareTradeoffState(',
      'function aiDraftReadiness(',
    );
    const normalize = vm.runInNewContext(`(${source})`, { isFinite });
    const privateText = 'PRIVATE CARE INQUIRY PAYLOAD';
    const log = Array.from({ length: 12 }, (_, index) => ({
      t: '12:00:' + String(index).padStart(2, '0'),
      sp: 'parrot',
      gap: index + 0.26,
      state: 'Mixed model fit',
      worst: 'Social contact',
      provided: 140,
      need: -4,
      privateText,
    }));
    log.push({
      t: 'not-a-time',
      sp: 'removed-species',
      gap: { privateText },
      state: privateText,
      worst: privateText,
    });

    const normalized = JSON.parse(JSON.stringify(normalize({
      species: 'removed-species',
      food: 'not-a-number',
      exercise: -13,
      social: 43,
      vet: 999,
      training: null,
      hypothesis: { privateText },
      explanation: [privateText],
      stuckRevealed: 'true',
      understood: 'true',
      log,
      unknownPrivateField: privateText,
    })));

    expect(normalized).toMatchObject({
      species: 'dog',
      food: 50,
      exercise: 0,
      social: 45,
      vet: 100,
      training: 50,
      hypothesis: '',
      explanation: '',
      stuckRevealed: false,
      understood: false,
    });
    expect(normalized.log).toHaveLength(8);
    expect(normalized.log[0]).toEqual({
      t: '12:00:04',
      sp: 'parrot',
      gap: '4.3',
      state: 'Mixed model fit',
      worst: 'Social contact',
      provided: '100',
      need: '0',
    });
    expect(JSON.stringify(normalized)).not.toContain(privateText);
    expect(normalize(null)).toEqual({
      food: 50,
      exercise: 50,
      social: 50,
      vet: 50,
      training: 50,
      species: 'dog',
      hypothesis: '',
      stuckRevealed: false,
      understood: false,
      explanation: '',
      log: [],
    });
    expect(PETS).toContain('var view = normalizePetsView(d.view)');
    expect(PETS).toContain("addIfChanged('view', d.view, view)");
    expect(PETS).toContain('var careTradeoffState = normalizeCareTradeoffState(d.careTradeoff)');
    expect(PETS).toContain('snapshot.careTradeoff = normalizeCareTradeoffState(snapshot.careTradeoff)');
  });

  it('bounds Trainer, Toxic Foods, and Lifespan resume state before indexing question banks', () => {
    const source = between(PETS, 'function normalizeTrainerState(', 'function petsPersistentSnapshot(');
    const api = vm.runInNewContext(
      `(function () { ${source}; return {
        normalizeTrainerState,
        normalizePetsMiniGameState,
        normalizeToxicFoodIndices,
        normalizeToxicFoodReviewState,
        normalizeLifespanIndices,
        normalizeLifespanReviewState,
        normalizeKnowledgeQuizState,
        bodyLanguageContextChallenges,
        normalizeBodyLanguageTransfer
      }; })()`,
      { isFinite }
    );

    expect(api.normalizeTrainerState({ idx: 999, choices: [], prob: 1, trust: 1 })).toBeNull();
    expect(api.normalizeTrainerState('old-schema')).toBeNull();
    expect(api.normalizeTrainerState({
      idx: 3,
      choices: [
        { rxn: 'treat3s', dProb: 99, dTrust: -99, verdict: 'ok', momentType: 'target' },
        { rxn: 'removed-response', verdict: 'unsafe' },
      ],
      prob: 4,
      trust: -3,
      done: false,
      log: Array.from({ length: 30 }, (_, index) => ({ rd: index + 1, prob: 9, trust: -2, dProb: 4 })),
    })).toMatchObject({
      idx: 3,
      prob: 1,
      trust: 0,
      done: false,
      choices: [
        { rxn: 'treat3s', dProb: 1, dTrust: -1, verdict: 'ok', momentType: 'target' },
        null,
      ],
    });
    expect(api.normalizeTrainerState({
      idx: 3, choices: [], prob: 0.5, trust: 0.5,
      done: 'false',
      log: Array.from({ length: 30 }, (_, index) => ({ rd: index + 1 })),
    })).toMatchObject({ done: false });
    expect(api.normalizeTrainerState({
      idx: 3, choices: [], prob: 0.5, trust: 0.5,
      log: Array.from({ length: 30 }, (_, index) => ({ rd: index + 1 })),
    }).log).toHaveLength(10);

    const toxic = api.normalizePetsMiniGameState({
      tfsIdx: 999,
      tfsShown: [0, 0, 9, 99, 'bad'],
      tfsAns: true,
      tfsPick: 'raw-answer-text',
      tfsScore: 999,
      tfsRounds: 2,
      tfsStreak: 999,
      tfsBest: 999,
      tfsSeed: -1,
    }, 'tfs', 10, ['safe', 'toxicDogs', 'toxicCats', 'toxicBirds', 'toxicMulti']);
    expect(toxic).toEqual({
      idx: -1,
      seed: 1,
      ans: false,
      pick: null,
      score: 0,
      rounds: 0,
      streak: 0,
      best: 10,
      shown: [],
    });
    expect(api.normalizeToxicFoodIndices([0, '1', 1, 9, 10, -1, 2.5, 'private-answer'])).toEqual([0, 1, 9]);
    expect(api.normalizeToxicFoodReviewState({
      ids: [9, 8, 7],
      queue: [3, 3, 0, 9, 99],
      pick: 'private-answer',
      done: true,
    }, [0, 3])).toEqual({
      ids: [0, 3],
      queue: [3, 0],
      pick: null,
      done: false,
    });
    expect(api.normalizeToxicFoodReviewState({
      queue: [3], pick: 'toxicDogs', done: false,
    }, [0, 3])).toEqual({
      ids: [0, 3], queue: [3], pick: 'toxicDogs', done: false,
    });
    expect(api.normalizeToxicFoodReviewState({
      queue: [], pick: 'toxicDogs', done: true,
    }, [0, 3])).toEqual({
      ids: [0, 3], queue: [], pick: null, done: true,
    });
    expect(api.normalizeToxicFoodReviewState({ queue: [], done: false }, [0])).toBeNull();
    expect(api.normalizeToxicFoodReviewState({ queue: [0] }, [])).toBeNull();
    expect(api.normalizeLifespanIndices([2, '3', 3, 9, 10, -1, 4.2, 'private-answer'])).toEqual([2, 3, 9]);
    expect(api.normalizeLifespanReviewState({
      ids: [9, 8],
      queue: [2, 2, 0, 8, 99],
      pick: 'private-answer',
      done: true,
    }, [0, 2])).toEqual({
      ids: [0, 2], queue: [2, 0], pick: null, done: false,
    });
    expect(api.normalizeLifespanReviewState({
      queue: [2], pick: 'b3', done: false,
    }, [0, 2])).toEqual({
      ids: [0, 2], queue: [2], pick: 'b3', done: false,
    });
    expect(api.normalizeLifespanReviewState({
      queue: [], pick: 'b3', done: true,
    }, [0, 2])).toEqual({
      ids: [0, 2], queue: [], pick: null, done: true,
    });
    expect(api.normalizeLifespanReviewState({ queue: [], done: false }, [0])).toBeNull();
    expect(api.normalizeLifespanReviewState({ queue: [0] }, [])).toBeNull();

    const lifespan = api.normalizePetsMiniGameState({
      lsIdx: 4,
      lsShown: [0, 1, 4],
      lsAns: true,
      lsPick: 'b3',
      lsRounds: 3,
      lsScore: 2,
      lsStreak: 1,
      lsBest: 4,
      lsSeed: 7,
    }, 'ls', 10, ['b1', 'b2', 'b3', 'b4', 'b5']);
    expect(lifespan).toMatchObject({
      idx: 4, ans: true, pick: 'b3', score: 2, rounds: 3, shown: [0, 1, 4],
    });
    expect(api.normalizePetsMiniGameState({
      lsIdx: 4,
      lsShown: [4],
      lsAns: 'false',
      lsPick: 'b3',
    }, 'ls', 10, ['b1', 'b2', 'b3', 'b4', 'b5'])).toMatchObject({
      idx: 4, ans: false, pick: null,
    });

    expect(api.normalizeKnowledgeQuizState({
      idx: 999,
      score: 999,
      answered: true,
      lastChoice: 999,
      mode: 'removed-mode',
      missedIds: ['q2', 'q2', 'removed'],
      reviewIds: ['removed'],
      bestPct: 999,
      history: { q1: { choice: 3, answeredAt: 'private timestamp' } },
      responses: { q1: true, q2: false, removed: true, q3: 'true' },
    })).toEqual({
      idx: 0,
      score: 0,
      answered: false,
      lastChoice: null,
      missedIds: ['q2'],
      reviewIds: [],
      mode: 'all',
      bestPct: 100,
      responses: { q1: true, q2: false },
    });
    expect(api.normalizeKnowledgeQuizState({
      idx: 15,
      score: 12,
      answered: false,
      lastChoice: null,
      mode: 'all',
      bestPct: 80,
      responses: Object.fromEntries(
        Array.from({ length: 15 }, (_, index) => [`q${index + 1}`, index < 12])
      ),
    })).toMatchObject({ idx: 15, score: 12, answered: false, mode: 'all' });
    expect(api.normalizeKnowledgeQuizState({
      idx: 2,
      score: 2,
      answered: true,
      lastChoice: null,
    })).toMatchObject({ idx: 2, score: 2, answered: false, lastChoice: null });

    const contextCases = api.bodyLanguageContextChallenges();
    expect(contextCases).toHaveLength(6);
    const contextIds = contextCases.slice(0, 4).map((item) => item.id);
    const context = api.normalizeBodyLanguageTransfer({
      idx: 999,
      ids: contextIds,
      answers: contextCases.slice(0, 4).map((item) => item.correct),
      score: 999,
      done: true,
      bestPct: 999,
      rawScenario: 'PRIVATE RAW SCENARIO',
    });
    expect(context).toMatchObject({
      idx: 4,
      score: 4,
      done: true,
      bestPct: 100,
      ids: contextIds,
    });
    expect(context).not.toHaveProperty('rawScenario');
    expect(api.normalizeBodyLanguageTransfer({
      ids: ['removed', ...contextIds.slice(0, 3)],
    })).toBeNull();

    expect(PETS).toContain('var trSim = normalizeTrainerState(d.trSim)');
    expect(PETS).toContain("var tfsState = normalizePetsMiniGameState(d, 'tfs'");
    expect(PETS).toContain("var lsState = normalizePetsMiniGameState(d, 'ls'");
    expect(PETS).toContain('var safeInitial = petsPersistentSnapshot(initial)');
    expect(PETS).toContain('var safeRestore = petsPersistentSnapshot(w)');
    expect(PETS).toContain('var quizState = normalizeKnowledgeQuizState(d.quizState)');
    expect(PETS).toContain('snapshot.quizState = normalizeKnowledgeQuizState(snapshot.quizState)');
    expect(PETS).toContain('snapshot.blTransfer = normalizeBodyLanguageTransfer(snapshot.blTransfer)');
    // Starting a fresh attempt resets cumulative performance, while advancing
    // to the next item must preserve it. Keeping one start/advance function was
    // a subtle regression: the UI reached "all 10 complete" while its final
    // score described only the tenth response.
    expect(PETS).toContain('function beginTfsAttempt(');
    expect(PETS).toContain('function advanceTfs(');
    const toxinBegin = between(PETS, 'function beginTfsAttempt(', 'function advanceTfs(');
    const toxinAdvance = between(PETS, 'function advanceTfs(', 'function pickTfs(');
    expect(toxinBegin).toContain('tfsScore: 0');
    expect(toxinBegin).toContain('tfsRounds: 0');
    expect(toxinBegin).toContain('tfsMissed: []');
    expect(toxinBegin).toContain('tfsReview: null');
    expect(toxinAdvance).not.toContain('tfsScore: 0');
    expect(toxinAdvance).not.toContain('tfsRounds: 0');

    expect(PETS).toContain('function beginLsAttempt(');
    expect(PETS).toContain('function advanceLs(');
    const lifespanBegin = between(PETS, 'function beginLsAttempt(', 'function advanceLs(');
    const lifespanAdvance = between(PETS, 'function advanceLs(', 'function pickLs(');
    expect(lifespanBegin).toContain('lsScore: 0');
    expect(lifespanBegin).toContain('lsRounds: 0');
    expect(lifespanBegin).toContain('lsMissed: []');
    expect(lifespanBegin).toContain('lsReview: null');
    expect(lifespanAdvance).not.toContain('lsScore: 0');
    expect(lifespanAdvance).not.toContain('lsRounds: 0');
  });

  it('normalizes partial Care Sim records and rejects unknown species', () => {
    const source = between(PETS, 'function normalizeCareSimState(', 'function renderCareSim()');
    const authoredDays = Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      choices: [{
        id: `choice-${i}`,
        label: `Authored choice ${i + 1}`,
        note: `Authored note ${i + 1}`,
        effects: { phys: i + 1, money: -(i + 1) },
      }],
    }));
    const normalize = vm.runInNewContext(`(${source})`, {
      CARE_SIM_DAYS: { dog: authoredDays },
      CARE_SIM_START_MONEY: { dog: 500 },
      isFinite,
    });

    expect(normalize({ species: 'removed-species', day: 0 })).toBeNull();
    expect(normalize(null)).toBeNull();

    const restored = normalize({
      species: 'dog',
      day: 99,
      phys: 'not-a-number',
      ment: 140,
      soc: -20,
      money: null,
      choices: 'old-schema',
      done: true,
      badgeEarned: true,
    });
    expect(restored).toMatchObject({
      species: 'dog', day: 0, phys: 50, ment: 100, soc: 0, env: 50,
      en: 100, money: 500, startMoney: 500, choices: [], done: false,
      badgeEarned: false, lowMoney: false, tiredCare: 0,
    });
    expect(normalize({
      species: 'dog', done: 'false', badgeEarned: 'false', lowMoney: 'false',
    })).toMatchObject({ done: false, badgeEarned: false, lowMoney: false });

    const hostile = normalize({
      species: 'dog',
      day: 6,
      choices: [{
        choiceId: 'choice-0',
        choiceLabel: { private: 'PRIVATE' },
        note: 'PRIVATE',
        effects: { phys: 999 },
      }, { choiceId: 'removed-choice' }],
      dailyInteractions: {
        0: { feed: true, unknown: true },
        6: { play: true },
        99: { play: true },
      },
      lastInteract: { kind: { private: true }, t: Infinity },
      privateDraft: 'PRIVATE',
    });
    expect(hostile.day).toBe(1);
    expect(hostile.choices).toEqual([{
      dayLabel: 'Day 1',
      choiceId: 'choice-0',
      choiceLabel: 'Authored choice 1',
      note: 'Authored note 1',
      effects: { phys: 1, money: -1 },
    }]);
    expect(hostile.dailyInteractions).toEqual({ 0: { feed: true } });
    expect(hostile.lastInteract).toBeNull();
    expect(hostile).not.toHaveProperty('privateDraft');

    const answeredCurrentDay = normalize({
      species: 'dog',
      day: 0,
      choices: [{ choiceId: 'choice-0' }],
      dailyInteractions: { 0: { feed: true } },
      lastInteract: { kind: 'feed', t: 1234 },
    });
    expect(answeredCurrentDay.day).toBe(0);
    expect(answeredCurrentDay.lastInteract).toEqual({ kind: 'feed', t: 1234 });
  });

  it('rejects malformed Body Language attempts and recomputes restored scores', () => {
    const signalSetsSource = between(PETS, 'function bodyLanguageSignalSets(', 'function canonicalBodyLanguageSignalKeys()');
    const signalSets = vm.runInNewContext(`(${signalSetsSource})`);
    expect(signalSets().flatMap((group) => group.items)).toHaveLength(27);
    const normalizeSource = between(PETS, 'function normalizeBodyLanguageQuiz(', 'function bodyQuizMeetsBadgeStandard(');
    const normalize = vm.runInNewContext(`(${normalizeSource})`, {
      bodyLanguageSignalSets: signalSets,
      isFinite,
    });
    const signal = 'Loose body + soft eyes + open mouth + wagging mid-height tail';
    const meaning = 'Relaxed + happy';
    const question = {
      species: '🐕 Dogs',
      signal,
      choices: [meaning, 'A distractor'],
      correct: 0,
      pose: 'dog-relaxed',
      cues: [['Soft eyes', 176, 86]],
    };

    expect(normalize(null)).toBeNull();
    expect(normalize({ qs: [] })).toBeNull();
    expect(normalize({ qs: [{ ...question, species: 'Removed species' }] })).toBeNull();
    expect(normalize({ qs: [question, question] })).toBeNull();

    const restored = normalize({
      idx: 99,
      qs: [question],
      answers: [0],
      score: 999,
      mode: 'legacy-mode',
      sourceCount: 999,
    });
    expect(restored).toMatchObject({
      idx: 1,
      score: 1,
      done: true,
      mode: 'random',
      sourceCount: 27,
      answers: [0],
    });
    expect(restored.qs[0]).toMatchObject({
      key: `🐕 Dogs|${signal}`,
      meaning,
      cues: [['Soft eyes', 176, 86]],
    });
  });

  it('reserves the Body Language Reader standard for an 8-of-10 random set', () => {
    const source = between(PETS, 'function bodyQuizMeetsBadgeStandard(', 'function renderBodyLang()');
    const meets = vm.runInNewContext(`(${source})`);
    const ten = Array.from({ length: 10 }, () => ({}));
    expect(meets({ mode: 'random', qs: ten, score: 8 })).toBe(true);
    expect(meets({ mode: 'random', qs: ten, score: 7 })).toBe(false);
    expect(meets({ mode: 'unseen', qs: ten, score: 10 })).toBe(false);
    expect(meets({ mode: 'missed', qs: ten, score: 10 })).toBe(false);
    expect(meets({ mode: 'random', qs: ten.slice(0, 9), score: 9 })).toBe(false);
  });

  it('invalidates AI work synchronously in the shared route helper', () => {
    const navigation = between(PETS, 'function goToView(', 'function openStemTool(');
    const invalidateAt = navigation.indexOf('_aiRequestRef.current.seq += 1');
    const firstStateWriteAt = navigation.indexOf("updMulti(");
    expect(invalidateAt).toBeGreaterThan(-1);
    expect(firstStateWriteAt).toBeGreaterThan(invalidateAt);
    expect(navigation).toContain("view === 'aiPractice' && nextView !== 'aiPractice'");
  });

  it('keeps one lifecycle-safe, reduced-motion decoder celebration', () => {
    const mountedCalls = PETS.match(/^[ \t]*decoderCelebOverlay[(][)][,][ \t]*$/gm) || [];
    expect(mountedCalls).toHaveLength(1);
    expect(PETS).toContain("className: 'petslab-decoder-celeb'");
    expect(PETS).toContain('.reduce-motion [class*="petslab-"],.reduce-motion [class*="petslab-"] *{animation:none!important;transition:none!important;scroll-behavior:auto!important;}');
    expect(PETS).toContain('if (_decoderCelebTimerRef.current) clearTimeout(_decoderCelebTimerRef.current)');
    expect(PETS).toMatch(/_decoderCelebTimerRef\.current = setTimeout\(function \(\) \{[\s\S]*?_decoderCelebTimerRef\.current = null;[\s\S]*?setDecoderCeleb\(null\);/);
    const unmount = between(PETS, "window.addEventListener('pagehide'", '// Hot-reload from a project-JSON load mid-session.');
    expect(unmount).toContain('clearTimeout(_decoderCelebTimerRef.current)');
  });

  it('lets static sensory scenes sleep and wakes rendering on invalidation', () => {
    const viewer = between(PETS, 'function _petsMakeSensoryViewer()', 'function _renderPets(ctx)');
    expect(viewer).toMatch(/function invalidate\(\) \{[\s\S]*?S\.dirty = true;[\s\S]*?requestFrame\(\);/);
    expect(viewer).toMatch(/function ensureFrame\(\) \{[\s\S]*?if \(!S \|\| S\.raf\) return;[\s\S]*?requestAnimationFrame\(frame\)/);
    expect(viewer).toMatch(/function frame\(ts\) \{[\s\S]*?S\.raf = 0;/);
    expect(viewer).toContain('if (fwd || strafe || turn || scentAnimating) ensureFrame();');
    expect(viewer).toMatch(/setKey: function \(name, down\) \{[\s\S]*?invalidate\(\);/);
    expect(viewer).not.toMatch(/function frame\(ts\) \{\s*if \(!S\) return;\s*S\.raf = window\.requestAnimationFrame\(frame\)/);
    const keyboard = between(PETS, '// Keyboard walk.', '// ESC dismisses the Household Hazard Sleuth inline game');
    expect(keyboard).toContain("window.addEventListener('blur', clearMovementKeys)");
    expect(keyboard).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(keyboard).toMatch(/function clearMovementKeys\(\) \{[\s\S]*?viewer\.setKey\(name, false\)/);
  });

  it('clears transient decoder and sensory sessions on authoritative restore', () => {
    const restore = between(PETS, '// Hot-reload from a project-JSON load mid-session.', '// Leaving AI Practice logically cancels its request.');
    expect(restore).toContain('clearTimeout(_decoderCelebTimerRef.current)');
    expect(restore).toContain('setDecoderCeleb(null)');
    expect(restore).toContain('setSensoryCaptures({})');
    expect(restore).toContain('restorePatch.sensoryActive = false');
    expect(restore).toContain('restorePatch._threeLoaded = false');
    expect(PETS).toContain('snapshot.tfsOpen = snapshot.tfsOpen === true');
  });
});
