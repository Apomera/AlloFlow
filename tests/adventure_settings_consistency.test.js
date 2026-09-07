import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const fakeWindow = { AlloModules: {} };
for (const file of ['adventure_handlers_source.jsx', 'adventure_session_handlers_source.jsx']) {
  new Function('window', fs.readFileSync(file, 'utf8'))(fakeWindow);
}
const handlers = fakeWindow.AlloModules.AdventureHandlers;
const session = fakeWindow.AlloModules.AdventureSessionHandlers;
const options = ['Measure', 'Compare', 'Ask', 'Wait', 'Model', 'Revise'];
const payload = (extra = {}) => ({
  outcomeType: 'strategic_success', conceptsUsed: ['Conservation'],
  evaluation: 'Use the lesson to explain the tradeoff.', feedback: 'Use the lesson to explain the tradeoff.',
  rollDetails: { d20: 14, total: 14, strategyRating: 14 }, goldAwarded: 0,
  scene: { text: 'A supported conclusion.', options: [...options] }, ...extra
});

function harness({ state: stateOverrides = {}, ...overrides } = {}) {
  let state = {
    currentScene: { text: 'Consider the water supply.', options: [...options] },
    history: [], inventory: [], systemResources: [], imageCache: [], voiceMap: {},
    energy: 100, xp: 0, xpToNextLevel: 100, level: 1, gold: 0, turnCount: 1,
    stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
    climax: { isActive: false, masteryScore: 0, attempts: 0 }, debateMomentum: 50,
    activeXpMultiplier: 1, activeRollModifier: 0, activeGoldBuffTurns: 0,
    lastKeyItemTurn: 0, ...stateOverrides
  };
  let pending;
  const prompts = [], saved = [], errors = [];
  const base = {
    adventureInputMode: 'choice', adventureFreeResponseEnabled: false, adventureChanceMode: false,
    adventureDifficulty: 'Normal', adventureLanguageMode: 'English', adventureTextInput: 'Use evidence.',
    adventureCustomInstructions: '', adventureConsistentCharacters: false, adventureArtStyle: 'auto',
    history: [], inputText: 'The water cycle conserves water. Energy drives evaporation.',
    sourceTopic: 'Water cycle', gradeLevel: '6th Grade', studentInterests: [], selectedLanguages: [],
    isTeacherMode: true, isIndependentMode: false, isAdventureStoryMode: false, isSocialStoryMode: false,
    factionResourceMode: 'ai', enableFactionResources: false, globalPoints: 0,
    alloBotRef: { current: null }, lastTurnSnapshot: { current: null }, lastReadTurnRef: { current: null },
    pdfPreviewRef: { current: null }, exportPreviewRef: { current: null },
    t: k => k, cleanJson: s => s, resilientJsonParse: async s => JSON.parse(s),
    safeJsonParse: s => JSON.parse(s), getAdventureGlossaryTerms: () => '',
    setAdventureState: update => { state = typeof update === 'function' ? update(state) : update; },
    setPendingAdventureUpdate: value => { pending = value; },
    setHistory: update => saved.push(...(typeof update === 'function' ? update([]) : update)),
    callGemini: async prompt => { prompts.push(prompt); return JSON.stringify(base.response || payload()); },
    callImagen: async () => null, generatePixelArtItem: async () => null,
    SafetyContentChecker: { aiCheck: vi.fn() }, warnLog: (...args) => errors.push(args),
    ...overrides
  };
  const deps = new Proxy(base, { get(target, key) {
    if (key === 'adventureState') return state;
    if (key === 'pendingAdventureUpdate') return pending;
    return key in target ? target[key] : vi.fn();
  } });
  return { deps, prompts, saved, errors, get state() { return state; }, get pending() { return pending; },
    resolve() { session.handleDiceRollComplete(deps); },
    async act(typed = false) {
      if (typed) await handlers.handleAdventureTextSubmit('Use the lesson evidence.', deps);
      else await handlers.handleAdventureChoice('Compare the evidence.', deps);
      expect(errors).toEqual([]);
      expect(pending).toBeTruthy();
    }
  };
}

beforeEach(() => { vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.2); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Adventure episode settings', () => {
  it.each([true, false])('separates a six-decision limit from finale=%s', async auto => {
    const h = harness({ state: { episodeTurnLimit: 6, enableAutoClimax: auto } });
    for (let decision = 1; decision <= 6; decision++) {
      await h.act(decision % 2 === 0);
      expect(h.pending.isTerminalTurn).toBe(decision === 6);
      h.resolve();
      expect(h.state.stats.decisions).toBe(decision);
      expect(h.state.isGameOver).toBe(decision === 6);
    }
    expect(h.state.currentScene.options).toEqual([]);
    expect(h.prompts[5]).toContain('Do not introduce a new obstacle');
  });
  it('keeps explicitly open-ended episodes open with the finale disabled', async () => {
    const h = harness({ state: { episodeTurnLimit: null, enableAutoClimax: false, turnCount: 40 } });
    await h.act(true); h.resolve();
    expect(h.state.isGameOver).toBe(false);
  });
  it('preserves old save pacing and bounds imported limits', () => {
    expect(handlers.getAdventurePacing({ enableAutoClimax: false, climaxMinTurns: 9 }).limit).toBe(9);
    expect(handlers.getAdventurePacing({ enableAutoClimax: true }).limit).toBeNull();
    expect(handlers.getAdventurePacing({ episodeTurnLimit: 999 }).limit).toBe(50);
    expect(handlers.getAdventurePacing({ episodeTurnLimit: -9 }).limit).toBe(3);
  });
  it('prepares the last challenge inside the episode and closes it at the limit', async () => {
    const h = harness({ state: { episodeTurnLimit: 6, enableAutoClimax: true, turnCount: 5, goal: 'Narrative Climax' } });
    await h.act(); expect(h.pending.prepareFinalChallenge).toBe(true); h.resolve();
    expect(h.state.climax.isActive).toBe(true);
    await h.act(true); h.resolve();
    expect(h.state.climax.isActive).toBe(false);
    expect(h.state.isGameOver).toBe(true);
  });
  it('reserves a finite episode finale for the penultimate decision', async () => {
    const h = harness({ state: { episodeTurnLimit: 12, enableAutoClimax: true, climaxMinTurns: 3, turnCount: 4, hiddenMastery: 95, goal: 'Narrative Climax' } });
    await h.act(); h.resolve();
    expect(h.state.climax.isActive).toBe(false);
  });
  it.each([false, true])('caps choices and respects peaceful cues on typed=%s turns', async typed => {
    const h = harness({ isAdventureStoryMode: true, state: { choiceCount: 3 },
      response: payload({ soundParams: { atmosphere: 'Tense', intensity: 1, motion: 'Chase' } }) });
    await h.act(typed);
    expect(h.pending.scene.options).toHaveLength(3);
    expect(h.pending.soundParams).toMatchObject({ atmosphere: 'Calm', motion: 'Still', intensity: 0.35 });
    expect(h.prompts[0]).toContain('Peaceful'.toUpperCase() + ' MODE');
  });
  it('keeps written-response scenes free of suggested choices', async () => {
    const h = harness({ adventureFreeResponseEnabled: true });
    await h.act(true); h.resolve();
    expect(h.state.currentScene.options).toEqual([]);
    expect(h.state.isGameOver).toBe(false);
  });
});

describe('Adventure reasoning and chance', () => {
  it.each([false, true])('owns the chance die and uses evidence quality for momentum, typed=%s', async typed => {
    const h = harness({ adventureInputMode: 'debate', adventureChanceMode: true,
      state: { activeRollModifier: 2 },
      response: payload({ rollDetails: { d20: 20, total: 400, strategyRating: 14 }, debateMomentumChange: 99 }) });
    await h.act(typed);
    expect(h.pending.rollDetails).toMatchObject({ d20: 5, total: 21, strategyRating: 14 });
    h.resolve();
    expect(h.state.debateMomentum).toBe(60);
    expect(h.state.history.at(-1).consequence.chanceRoll).toBe(5);
  });
  it('uses the reconciled reasoning score for debate momentum', async () => {
    const h = harness({ adventureInputMode: 'debate',
      response: payload({ outcomeType: 'misconception', rollDetails: { total: 20, d20: 20 } }) });
    await h.act(true); h.resolve();
    expect(h.state.debateMomentum).toBe(55);
    expect(h.state.history.at(-1).consequence.reasoning).toBe('misconception');
  });
  it('stores only bounded, relevant reasoning feedback', async () => {
    const h = harness({ adventureInputMode: 'debate', response: payload({
      reasoningFeedback: { evidence: 'x'.repeat(500), reasoning: '<script>unsafe()</script>', counterpoint: 'Check a counterexample.', ignored: 'extra' }
    }) });
    await h.act(true); h.resolve();
    const feedback = h.state.history.at(-1).consequence.learningFeedback;
    expect(Object.keys(feedback)).toEqual(['evidence', 'reasoning', 'counterpoint']);
    expect(feedback.evidence).toHaveLength(360);
    expect(feedback.reasoning).toBe('<script>unsafe()</script>');
  });
});

describe('System resource integrity', () => {
  const initial = [{ name: 'Water quality', quantity: 95, unit: '%' }, { name: 'Budget', quantity: 900, unit: 'credits' }];
  it('clamps percentages, retains zero, and allows budgets above 100', () => {
    const result = session.applyAdventureSystemUpdate(initial, {
      add: [{ name: 'Water quality', quantity: 10 }, { name: 'Budget', quantity: 100 }],
      remove: [{ name: 'Budget', quantity: 1000 }]
    });
    expect(result.map(r => r.quantity)).toEqual([100, 0]);
    expect(initial[0].quantity).toBe(95);
    expect(session.applyAdventureSystemUpdate(initial, { add: { name: 'Budget', quantity: 100 } })[1].quantity).toBe(1000);
  });
  it('preserves explicit zero deltas and ignores invalid numbers', () => {
    const result = session.applyAdventureSystemUpdate(initial, {
      add: [{ name: 'Budget', quantity: 0 }, { name: 'Water quality', quantity: true }, { name: 'Budget', quantity: 'Infinity' }]
    });
    expect(result.map(r => r.quantity)).toEqual([95, 900]);
  });
  it.each([false, true])('honors manual resources in the real typed=%s input path', async typed => {
    const h = harness({ adventureInputMode: 'system', enableFactionResources: true, factionResourceMode: 'manual',
      state: { systemResources: initial }, response: payload({ systemStateUpdate: { add: [
        { name: 'Budget', quantity: 0, unit: '%' }, { name: 'Invented meter', quantity: 99 },
        { name: 'Water quality', quantity: 10 }
      ] }, systemForecast: { immediate: 'Quality improves.', delayed: 'It may reduce cleanup later.', tradeoff: 'Monitoring uses staff time.' } }) });
    await h.act(typed); h.resolve();
    expect(h.state.systemResources.map(r => [r.name, r.quantity, r.unit])).toEqual([
      ['Water quality', 100, '%'], ['Budget', 900, 'credits']
    ]);
    expect(h.state.history.at(-1).consequence.learningFeedback.delayed).toContain('may');
  });
  it.each([false, true])('ignores proposed updates with tracking off, typed=%s', async typed => {
    const h = harness({ adventureInputMode: 'system', enableFactionResources: false,
      state: { systemResources: initial }, response: payload({ systemStateUpdate: { remove: { name: 'Budget', quantity: 500 } } }) });
    await h.act(typed); h.resolve();
    expect(h.state.systemResources).toEqual(initial);
  });
  it('ignores malformed opening resources while keeping zero baselines', async () => {
    const h = harness({ adventureInputMode: 'system', enableFactionResources: true,
      state: { currentScene: null }, response: { text: 'Plan a reservoir.', options: [...options], systemStateUpdate: { add: [
        null, { name: 'Invalid', quantity: 'Infinity' }, { name: 'Water', quantity: 0, unit: 'L' },
        { name: 'Quality', quantity: 110, unit: '%' }
      ] } } });
    await handlers.executeStartAdventure(null, h.deps);
    expect(h.errors).toEqual([]);
    expect(h.state.systemResources.map(r => r.quantity)).toEqual([0, 100]);
  });
  it('preserves manual starting values and saves profile settings at launch', async () => {
    const h = harness({ adventureInputMode: 'system', enableFactionResources: true, factionResourceMode: 'manual',
      isAdventureStoryMode: true,
      state: { currentScene: null, systemResources: initial, episodeTurnLimit: 12, choiceCount: 4, learningProfile: 'systems', enableAutoClimax: true },
      response: { text: 'Water supply planning.', options: [...options], soundParams: { atmosphere: 'Dark', intensity: 1, motion: 'Chase' },
        systemStateUpdate: { add: [{ name: 'Budget', quantity: 99999 }] } } });
    await handlers.executeStartAdventure(null, h.deps);
    expect(h.errors).toEqual([]);
    expect(h.state.systemResources).toEqual(initial);
    expect(h.state.currentScene.options).toHaveLength(4);
    expect(h.state.currentScene.soundParams.atmosphere).toBe('Calm');
    expect(h.saved[0].data.snapshot).toMatchObject({ episodeTurnLimit: 12, choiceCount: 4, learningProfile: 'systems', systemResourcePolicy: { mode: 'manual', enabled: true } });
  });
});
