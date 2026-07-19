import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';

const handlerSource = fs.readFileSync('adventure_handlers_source.jsx', 'utf8');
const sessionHandlerSource = fs.readFileSync('adventure_session_handlers_source.jsx', 'utf8');
const dataSource = fs.readFileSync('allo_data_source.jsx', 'utf8');
const shopSource = fs.readFileSync('adventure_source.jsx', 'utf8');
const inventorySource = fs.readFileSync('view_adventure_source.jsx', 'utf8');
const uiStrings = fs.readFileSync('ui_strings.js', 'utf8');
const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const saveSource = fs.readFileSync('phase_k_helpers_source.jsx', 'utf8');
const restoreSource = fs.readFileSync('misc_handlers_source.jsx', 'utf8');

function loadAdventureHandlers() {
  const window = { AlloModules: {} };
  return new Function('window', handlerSource + '\nreturn window.AlloModules.AdventureHandlers;')(window);
}

function makeState(overrides = {}) {
  return {
    currentScene: { text: 'A damaged water system has stopped working.', options: ['Repair it'] },
    history: [{ type: 'scene', text: 'The community depends on the water system.' }],
    inventory: [
      { id: 101, name: 'Guiding Hand', effectType: 'story_assist' },
      { id: 202, name: 'Field Notes', effectType: 'key_item' },
    ],
    assistedKnowledge: [],
    narrativeLedger: 'The community is investigating a water shortage.',
    turnCount: 4,
    xp: 45,
    gold: 80,
    energy: 72,
    level: 2,
    xpToNextLevel: 150,
    stats: { successes: 2, failures: 1, partials: 1, decisions: 4, conceptsFound: ['water cycle'] },
    climax: { isActive: false, masteryScore: 37, attempts: 0 },
    activeRollModifier: 5,
    activeXpMultiplier: 2,
    activeGoldBuffTurns: 3,
    voiceMap: {},
    isLoading: false,
    isImageLoading: false,
    isGameOver: false,
    ...overrides,
  };
}

function makeHarness({ state: stateOverrides = {}, deps: depOverrides = {}, response } = {}) {
  let state = makeState(stateOverrides);
  const addToast = vi.fn();
  const warnLog = vi.fn();
  const generateAdventureImage = vi.fn();
  const playAdventureEventSound = vi.fn();
  const callGemini = vi.fn(async () => response || JSON.stringify({
    interventionSummary: 'An engineer demonstrates a bypass valve.',
    knowledgeDrop: 'A bypass valve redirects flow around a damaged section so the rest of a system can keep operating.',
    evaluation: 'This obstacle was resolved with assistance, so no rewards were earned.',
    voices: { Engineer: 'Kore' },
    charactersInScene: ['Engineer'],
    scene: {
      text: 'An engineer opens a bypass valve and explains how alternate paths preserve flow. A new pressure imbalance now threatens the storage tank.',
      options: ['Inspect the tank pressure'],
    },
  }));
  const lastTurnSnapshot = { current: null };
  const deps = {
    adventureState: state,
    adventureInputMode: 'system',
    adventureLanguageMode: 'English',
    adventureFreeResponseEnabled: true,
    adventureConsistentCharacters: false,
    adventureCustomInstructions: '',
    isAdventureStoryMode: false,
    isSocialStoryMode: false,
    socialStoryFocus: '',
    sourceTopic: 'Water systems',
    inputText: 'Water follows connected paths from a source through distribution infrastructure.',
    gradeLevel: 'Grade 7',
    currentUiLanguage: 'English',
    lastTurnSnapshot,
    setAdventureState: (update) => {
      state = typeof update === 'function' ? update(state) : update;
      deps.adventureState = state;
    },
    callGemini,
    resilientJsonParse: async value => JSON.parse(value),
    addToast,
    t: () => undefined,
    warnLog,
    generateAdventureImage,
    playAdventureEventSound,
    alloBotRef: { current: { triggerReaction: vi.fn() } },
    ADVENTURE_GUARDRAIL: '',
    NARRATIVE_GUARDRAILS: '',
    ...depOverrides,
  };
  return {
    deps,
    getState: () => state,
    addToast,
    warnLog,
    callGemini,
    generateAdventureImage,
    playAdventureEventSound,
    lastTurnSnapshot,
  };
}

describe('Adventure Guiding Hand shop item', () => {
  it('advances an assisted free-response turn while preserving every reward, mastery, and buff field', async () => {
    vi.useFakeTimers();
    const { handleGuidingHand } = loadAdventureHandlers();
    const harness = makeHarness();
    const before = structuredClone(harness.getState());

    const used = await handleGuidingHand(before.inventory[0], harness.deps);
    vi.runAllTimers();
    const after = harness.getState();

    expect(used).toBe(true);
    expect(after.turnCount).toBe(before.turnCount + 1);
    expect(after.currentScene.text).toContain('bypass valve');
    expect(after.currentScene.options).toEqual([]);
    expect(after.inventory.map(item => item.id)).toEqual([202]);
    expect(after.xp).toBe(before.xp);
    expect(after.gold).toBe(before.gold);
    expect(after.energy).toBe(before.energy);
    expect(after.level).toBe(before.level);
    expect(after.xpToNextLevel).toBe(before.xpToNextLevel);
    expect(after.stats).toEqual(before.stats);
    expect(after.climax).toEqual(before.climax);
    expect(after.activeRollModifier).toBe(before.activeRollModifier);
    expect(after.activeXpMultiplier).toBe(before.activeXpMultiplier);
    expect(after.activeGoldBuffTurns).toBe(before.activeGoldBuffTurns);
    expect(after.assistedKnowledge).toEqual([
      'A bypass valve redirects flow around a damaged section so the rest of a system can keep operating.',
    ]);
    expect(after.narrativeLedger).toContain('Guiding Hand knowledge (assisted)');
    expect(after.history.some(entry => entry.type === 'assist' && entry.source === 'guiding_hand')).toBe(true);
    expect(after.stats.conceptsFound).toEqual(['water cycle']);
    expect(harness.generateAdventureImage).toHaveBeenCalledWith(expect.stringContaining('bypass valve'), 5);
    expect(harness.callGemini.mock.calls[0][0]).toContain('NO XP, Gold, success credit, concept credit');
    vi.useRealTimers();
  });

  it('restores the full pre-use state and retains the item when generation fails', async () => {
    const { handleGuidingHand } = loadAdventureHandlers();
    const harness = makeHarness({ state: { isImageLoading: true }, deps: { callGemini: vi.fn(async () => { throw new Error('offline'); }) } });
    const before = structuredClone(harness.getState());

    const used = await handleGuidingHand(before.inventory[0], harness.deps);

    expect(used).toBe(false);
    expect(harness.getState()).toEqual(before);
    expect(harness.getState().inventory.some(item => item.effectType === 'story_assist')).toBe(true);
    expect(harness.addToast).toHaveBeenLastCalledWith(expect.stringContaining('not consumed'), 'error');
  });

  it('cannot bypass an active climax', async () => {
    const { handleGuidingHand } = loadAdventureHandlers();
    const harness = makeHarness({ state: { climax: { isActive: true, masteryScore: 55, attempts: 1 } } });
    const before = structuredClone(harness.getState());

    const used = await handleGuidingHand(before.inventory[0], harness.deps);

    expect(used).toBe(false);
    expect(harness.callGemini).not.toHaveBeenCalled();
    expect(harness.getState()).toEqual(before);
    expect(harness.addToast).toHaveBeenCalledWith(expect.stringContaining('final challenge'), 'warning');
  });

  it('keeps choice mode playable when the model omits next-scene options', async () => {
    const { handleGuidingHand } = loadAdventureHandlers();
    const harness = makeHarness({
      deps: { adventureFreeResponseEnabled: false },
      response: JSON.stringify({
        interventionSummary: 'A technician safely resets the controller.',
        knowledgeDrop: 'Resetting a controller clears temporary faults but does not repair a recurring root cause.',
        evaluation: 'Assisted turn; no rewards earned.',
        scene: { text: 'The controller restarts, and a technician explains why the recurring fault still needs diagnosis.', options: [] },
      }),
    });

    await handleGuidingHand(harness.getState().inventory[0], harness.deps);

    expect(harness.getState().currentScene.options).toHaveLength(4);
    expect(harness.getState().isGameOver).toBe(false);
  });

  it.each([
    ['adventure', false, 'ally, a timely discovery'],
    ['debate', false, 'credible expert, moderator'],
    ['system', false, 'safeguard, knowledgeable stakeholder'],
    ['adventure', true, 'supportive person models'],
  ])('uses mode-appropriate intervention guidance for %s (social=%s)', async (mode, social, expectedPrompt) => {
    const { handleGuidingHand } = loadAdventureHandlers();
    const harness = makeHarness({ deps: { adventureInputMode: mode, isSocialStoryMode: social } });

    await handleGuidingHand(harness.getState().inventory[0], harness.deps);

    expect(harness.callGemini.mock.calls[0][0]).toContain(expectedPrompt);
  });

  it('defines the catalog item and uses short, constrained effect badges in shop and inventory views', () => {
    expect(dataSource).toContain("id: 'guiding_hand'");
    expect(dataSource).toContain("effectType: 'story_assist'");
    expect(dataSource).toContain("cost: 125");
    expect(shopSource).toContain('adventure.effects.${item.effectType}_label');
    expect(shopSource).toContain('truncate whitespace-nowrap');
    expect(inventorySource).toContain('adventure.effects.${selectedInventoryItem.effectType}_label');
    expect(uiStrings).toContain('"xp_boost_label": "XP Boost"');
    expect(uiStrings).toContain('"story_assist_label": "Story Assist"');
    expect(appSource).toContain("if (item.effectType === 'story_assist')");
    expect(appSource).toContain('await handleGuidingHand(item)');
    expect(handlerSource.match(/historyContext \+= getAssistedKnowledgeContext\(adventureState\);/g)).toHaveLength(2);
    expect(handlerSource).toContain('ASSISTED, NOT DEMONSTRATED MASTERY');
    expect(saveSource).toContain('assistedKnowledge: Array.isArray(adventureState.assistedKnowledge)');
    expect(restoreSource).toContain('assistedKnowledge: Array.isArray(snapshot.assistedKnowledge)');
  });
});
describe('Adventure Strategy Hint', () => {
  function makeHintHarness(responses) {
    let state = makeState({ currentHint: null, hintUsedTurn: null });
    const queue = [...responses];
    const addToast = vi.fn();
    const warnLog = vi.fn();
    const callGemini = vi.fn(async () => queue.shift());
    const deps = {
      adventureState: state,
      adventureTextInput: 'Maybe I should inspect the damaged pump.',
      sourceTopic: 'Water distribution systems',
      inputText: 'A bypass route can maintain flow while a damaged branch is isolated for repair.',
      standardsInput: 'Explain how system structure affects function.',
      adventureInputMode: 'system',
      adventureLanguageMode: 'English',
      selectedLanguages: [],
      adventureCustomInstructions: '',
      isSocialStoryMode: false,
      socialStoryFocus: '',
      gradeLevel: 'Grade 7',
      setAdventureState: (update) => {
        state = typeof update === 'function' ? update(state) : update;
        deps.adventureState = state;
      },
      callGemini,
      resilientJsonParse: async value => JSON.parse(value),
      addToast,
      t: () => undefined,
      warnLog,
    };
    return { deps, getState: () => state, callGemini, addToast, warnLog };
  }

  const usefulHint = JSON.stringify({
    notice: 'The source says a bypass route can preserve flow while one damaged branch is isolated.',
    connect: 'That means the system may keep serving users if the failed section can be separated from the working path.',
    try: 'Identify which connection could be isolated, then explain what should remain connected and why.',
    starter: 'The detail that matters most is ___ because ___.',
  });

  it('awaits parsing and returns a source-grounded Notice/Connect/Try scaffold', async () => {
    const { handleAdventureHint } = loadAdventureHandlers();
    const harness = makeHintHarness([usefulHint]);

    await handleAdventureHint(harness.deps);
    const state = harness.getState();

    expect(state.hintUsedTurn).toBe(4);
    expect(state.currentHint).toMatchObject({
      notice: expect.stringContaining('bypass route'),
      connect: expect.stringContaining('keep serving users'),
      tryStep: expect.stringContaining('which connection'),
      supportType: 'strategy_hint',
      loading: false,
    });
    const prompt = harness.callGemini.mock.calls[0][0];
    expect(prompt).toContain('A bypass route can maintain flow');
    expect(prompt).toContain('Maybe I should inspect the damaged pump');
    expect(prompt).toContain('NOTICE a relationship, constraint, feedback loop, or tradeoff');
    expect(harness.addToast).toHaveBeenLastCalledWith('Strategy hint ready.', 'success');
  });

  it('does not consume the scene clue when generation is vague, allowing a retry', async () => {
    const { handleAdventureHint } = loadAdventureHandlers();
    const vagueHint = JSON.stringify({ notice: 'Look again.', connect: 'Think more.', try: 'Try something.' });
    const harness = makeHintHarness([vagueHint, usefulHint]);

    await handleAdventureHint(harness.deps);
    expect(harness.getState().hintUsedTurn).toBeNull();
    expect(harness.getState().currentHint).toBeNull();
    expect(harness.addToast).toHaveBeenLastCalledWith(expect.stringContaining('try again'), 'error');

    await handleAdventureHint(harness.deps);
    expect(harness.getState().hintUsedTurn).toBe(4);
    expect(harness.callGemini).toHaveBeenCalledTimes(2);
  });

  it('keeps XP intact, records support metadata, and removes penalty language from the UI', () => {
    expect(sessionHandlerSource).not.toContain('Math.round(xpDelta / 2)');
    expect(sessionHandlerSource).toMatch(/support:\s*'strategy_hint'/);
    expect(handlerSource).not.toContain('hint_cost_toast');
    expect(inventorySource).not.toMatch(/half XP this turn|Need a nudge|Ask for a nudge/);
    expect(uiStrings).toContain('"hint_button": "Give me a clue"');
    expect(uiStrings).toContain('"hint_button_helper": "One clue per scene. You still decide what happens."');
  });
});
