import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');

function region(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error('Missing source boundary: ' + start);
  return source.slice(from, to);
}
const helpers = region('  // ── Rich lesson generation helpers', '  // ── End rich lesson generation helpers');
const prompts = region('  var AI_WORLD_PROMPT_BASE =', '  // Module scope, not inside the builder view')
  + region('  var AI_FOLLOWUP_PROMPT =', '  // ══════════════════════════════════════════════════════════════');
const parser = region('      function parseAiJson(result) {', '      // ── Helper: save lesson');
const api = new Function(helpers + prompts + parser + '\nreturn { geometryLessonDepth, geometryGenerationBrief, geometryPlanIssues, geometryGeneratedLessonIssues, runGeometryLessonGeneration };')();
const clone = value => JSON.parse(JSON.stringify(value));

function fixtures(depth = 2) {
  const profile = api.geometryLessonDepth(depth);
  const plan = { title: 'Geometry Harbor', setting: 'A connected harbor', route: 'Follow the stone path from the arrival square.', activities: [] };
  const lesson = { title: plan.title, description: 'Build, measure, and revise a harbor project.', spawnPoint: [-3, 3, -3],
    objectives: [], ground: { xMin: -30, xMax: 30, zMin: -30, zMax: 30, y: 0, type: 'grass' }, structures: [],
    npcs: [{ name: 'Welcome guide', position: [-1, 1, -1], dialogue: 'Follow the marked path to each mentor.', color: 8048861, question: null }], activities: [] };
  for (let i = 0; i < profile.activities; i++) {
    const id = 'activity-' + i, structureId = 'exhibit-' + i, npcName = 'Mentor ' + i;
    const a = { id, title: 'Harbor workshop ' + (i + 1), challenge: 'Build another prism with the same volume and different dimensions.',
      hint: 'Try arranging twelve cubes in one layer.', successCriteria: 'Both prisms have 12 unit cubes; compare their dimensions.',
      reflection: 'Explain why different shapes can have the same volume.', estimatedMinutes: depth === 1 ? 6 : depth === 2 ? 8 : 10 };
    plan.activities.push(a);
    lesson.activities.push({ ...a, npcName, position: [i * 5, 3, 3], structureIds: [structureId] });
    lesson.objectives.push('Workshop ' + (i + 1) + ': construct and explain an equal-volume prism.');
    lesson.structures.push({ id: structureId, type: 'fill', x1: i * 5, y1: 1, z1: 7, x2: i * 5 + 2, y2: 2, z2: 8, block: i % 2 ? 'wood' : 'brick' });
    lesson.npcs.push({ name: npcName, position: [i * 5, 1, 4], dialogue: 'This exhibit has two layers of six cubes. Build a different arrangement of twelve cubes and measure it.', color: 2461147,
      question: { text: 'How many unit cubes are in the exhibit?', choices: ['12 cubes', '6 cubes', '10 cubes'], correct: 0,
        measurement: { structureId, quantity: 'volume', expected: 12 },
        followUp: [{ text: 'How many cubes are in one layer?', choices: ['3', '6', '12'], correct: 1 }] } });
  }
  return { profile, plan, lesson };
}

function requestSequence(values) {
  let i = 0;
  return vi.fn(async () => {
    if (i >= values.length) throw new Error('Unexpected AI request');
    const value = values[i++];
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
}

describe('Geometry World lesson depth', () => {
  it('maps student-facing depth to longer connected activity plans and bounded authored budgets', () => {
    expect([1, 2, 3].map(value => api.geometryLessonDepth(value).activities)).toEqual([2, 4, 5]);
    expect([1, 2, 3].map(value => api.geometryLessonDepth(value).budget)).toEqual([450, 700, 900]);
    expect(api.geometryLessonDepth(1).minutes).toBe('10–15 min');
    expect(api.geometryLessonDepth(2).minutes).toBe('25–35 min');
    expect(api.geometryLessonDepth(3).minutes).toBe('45–60 min');
    expect(api.geometryLessonDepth('invalid').id).toBe('guided');
  });

  it.each([1, 2, 3])('requires the complete %i-depth plan before world generation', depth => {
    const { profile, plan } = fixtures(depth);
    expect(api.geometryPlanIssues(plan, profile)).toEqual([]);
    plan.activities.pop();
    expect(api.geometryPlanIssues(plan, profile).join(' ')).toContain('exactly ' + profile.activities);
  });

  it.each([1, 2, 3])('creates depth %i through the expected stages using the existing provider function', async depth => {
    const { profile, plan, lesson } = fixtures(depth);
    const callGemini = requestSequence([plan, ...Array(profile.calls - 1).fill(lesson)]);
    const progress = vi.fn();
    const result = await api.runGeometryLessonGeneration({ depth, topic: 'Volume and design', grade: '5', callGemini, onProgress: progress });
    expect(callGemini).toHaveBeenCalledTimes(profile.calls);
    expect(callGemini.mock.calls.every(args => args[1] === true)).toBe(true);
    expect(result.activities).toHaveLength(profile.activities);
    expect(result.depth).toBe(profile.id);
    expect(result.generation.calls).toBe(profile.calls);
    expect(result.activities.every(a => a.depth === profile.id)).toBe(true);
    expect(progress.mock.calls[0][0].label).toContain('Planning');
    expect(callGemini.mock.calls[1][0]).toContain(plan.activities[0].challenge);
    if (depth >= 2) expect(progress.mock.calls.at(-1)[0].label).toContain('mathematics');
  });

  it('reuses current-provider generation when refining an existing lesson', async () => {
    const { plan, lesson } = fixtures(2);
    const callGemini = requestSequence([plan, lesson, lesson]);
    await api.runGeometryLessonGeneration({ depth: 2, topic: lesson.title, grade: '5', seedLesson: lesson, refinement: 'Add a bridge design challenge.', callGemini });
    expect(callGemini.mock.calls[0][0]).toContain('Add a bridge design challenge.');
    expect(callGemini.mock.calls[0][0]).toContain(lesson.title);
  });
});

describe('Generated lesson integrity and repair', () => {
  it('allows a larger ground plane without spending the student construction budget', () => {
    const { profile, plan, lesson } = fixtures(3);
    lesson.ground = { xMin: -48, xMax: 48, zMin: -48, zMax: 48, y: 0, type: 'grass' };
    lesson.structures.push({ id: 'path', type: 'fill', x1: -48, y1: 0, z1: 0, x2: 48, y2: 0, z2: 20, block: 'stone', measurementLayer: 'ground' });
    expect(api.geometryGeneratedLessonIssues(lesson, profile, plan)).toEqual([]);
  });

  it('rejects tall ground-tagged fills that would evade the authored budget', () => {
    const { profile, plan, lesson } = fixtures(2);
    lesson.structures[0].measurementLayer = 'ground';
    expect(api.geometryGeneratedLessonIssues(lesson, profile, plan).join(' ')).toContain('Ground overlays must be flat');
  });

  it('reports oversized architecture without changing or dropping the required exhibit', () => {
    const { profile, plan, lesson } = fixtures(2);
    Object.assign(lesson.structures[0], { x1: -20, y1: 1, z1: 15, x2: 20, y2: 10, z2: 25 });
    const before = clone(lesson);
    expect(api.geometryGeneratedLessonIssues(lesson, profile, plan).join(' ')).toContain('maximum 700');
    expect(lesson).toEqual(before);
    expect(lesson.activities[0].structureIds[0]).toBe(lesson.structures[0].id);
  });

  it.each([
    ['missing teaching exhibit', lesson => { lesson.structures.shift(); }, 'reference'],
    ['removed activity', lesson => { lesson.activities.pop(); }, 'Preserve all'],
    ['invalid integer bounds', lesson => { lesson.structures[0].x1 = 0.5; }, 'integer bounds'],
    ['outside the ground', lesson => { lesson.activities[0].position = [45, 3, 45]; }, 'safe adjacent viewpoint'],
    ['blocked spawn', lesson => { lesson.spawnPoint = [0, 3, 7]; }, 'Spawn is inside'],
    ['blocked mentor', lesson => { lesson.npcs[1].position = [0, 1, 7]; }, 'clear accessible'],
    ['invalid answer index', lesson => { lesson.npcs[1].question.correct = 5; }, 'valid correct index'],
    ['lost scaffold', lesson => { lesson.npcs[1].question.followUp = []; }, 'scaffolded'],
    ['changed math', lesson => { lesson.npcs[1].question.choices[0] = '13'; }, 'measurement/answer'],
    ['wrong expected volume', lesson => { lesson.npcs[1].question.measurement.expected = 13; }, 'measurement/answer'],
  ])('catches %s before loading', (_name, mutate, message) => {
    const { profile, plan, lesson } = fixtures(2);
    mutate(lesson);
    expect(api.geometryGeneratedLessonIssues(lesson, profile, plan).join(' ')).toContain(message);
  });

  it('repairs invalid math using another API call and keeps every required activity', async () => {
    const { plan, lesson } = fixtures(2), invalid = clone(lesson);
    invalid.npcs[1].question.choices[0] = '13';
    const callGemini = requestSequence([plan, invalid, lesson, lesson]);
    const result = await api.runGeometryLessonGeneration({ depth: 2, topic: 'Volumes', grade: '5', callGemini });
    expect(callGemini).toHaveBeenCalledTimes(4);
    expect(callGemini.mock.calls[2][0]).toContain('REPAIR REQUIRED');
    expect(callGemini.mock.calls[2][0]).toContain('measurement/answer');
    expect(result.activities).toHaveLength(4);
    expect(result.npcs[1].question.choices[0]).toBe('12 cubes');
  });

  it('repairs malformed JSON instead of substituting an empty lesson', async () => {
    const { plan, lesson } = fixtures(1);
    const callGemini = requestSequence(['bad json', plan, lesson]);
    const result = await api.runGeometryLessonGeneration({ depth: 1, topic: 'Volumes', grade: '4', callGemini });
    expect(result.activities).toHaveLength(2);
    expect(callGemini.mock.calls[1][0]).toContain('Invalid JSON');
  });

  it('fails clearly when the bounded repair allowance is exhausted', async () => {
    const { plan, lesson } = fixtures(1), invalid = clone(lesson);
    invalid.activities = [];
    const callGemini = requestSequence([plan, invalid, invalid]);
    await expect(api.runGeometryLessonGeneration({ depth: 1, topic: 'Volumes', grade: '4', callGemini })).rejects.toThrow('still needs repair');
    expect(callGemini).toHaveBeenCalledTimes(3);
  });

  it('cancels before another request when an in-flight response becomes stale', async () => {
    const { plan } = fixtures(3);
    let resolveRequest, current = true;
    const callGemini = vi.fn(() => new Promise(resolve => { resolveRequest = resolve; }));
    const pending = api.runGeometryLessonGeneration({ depth: 3, topic: 'Volumes', grade: '5', callGemini, isCurrent: () => current });
    current = false;
    resolveRequest(JSON.stringify(plan));
    await expect(pending).rejects.toMatchObject({ code: 'GW_GENERATION_CANCELLED' });
    expect(callGemini).toHaveBeenCalledTimes(1);
  });
});

function controller(options = {}) {
  const state = { ...options.state }, effects = [], ref = { current: null };
  const React = { useRef: initial => { ref.current ||= initial; return ref; }, useEffect: fn => { effects.push(fn()); } };
  const update = vi.fn(patch => Object.assign(state, patch));
  const originalLesson = { title: 'Student work' };
  const engine = { _currentLesson: originalLesson };
  const testWindow = { engine };
  const finishGeneration = vi.fn();
  const start = new Function('React', 'd', 'upd', 'callGemini', 'window', 'engineKey', 'aiPrompt', 'aiGradeLevel', 'aiLessonDepth', 'runGeometryLessonGeneration', 'finishGeneration', 'addToast',
    region('      var aiGenerationRef = ', '      // ── End generation lifecycle hooks') + region('      function cancelWorldGeneration()', '      // ── Validate & sanitize AI-generated lesson JSON') + '\nreturn { generateWorld, cancelWorldGeneration };')(
    React, state, update, options.callGemini, testWindow, 'engine', 'Volumes', '5', 2, api.runGeometryLessonGeneration, finishGeneration, vi.fn());
  return { ...start, state, finishGeneration, engine, unmount: () => effects.forEach(fn => fn && fn()) };
}

describe('Generation request lifecycle', () => {
  it('clears a persisted busy state on a fresh mount', () => {
    const app = controller({ state: { aiGenerating: true }, callGemini: vi.fn() });
    expect(app.state.aiGenerating).toBe(false);
  });

  it('ignores canceled results without loading a lesson', async () => {
    const { plan } = fixtures(2);
    let resolveRequest;
    const callGemini = vi.fn(() => new Promise(resolve => { resolveRequest = resolve; }));
    const app = controller({ callGemini });
    const pending = app.generateWorld();
    app.cancelWorldGeneration();
    resolveRequest(JSON.stringify(plan));
    await pending;
    expect(app.finishGeneration).not.toHaveBeenCalled();
    expect(app.state.aiGenerating).toBe(false);
    expect(app.state.aiGenerationStatus).toContain('canceled');
    expect(callGemini).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate generation while the first request is pending', async () => {
    const { plan } = fixtures(2);
    let resolveRequest;
    const callGemini = vi.fn(() => new Promise(resolve => { resolveRequest = resolve; }));
    const app = controller({ callGemini });
    const pending = app.generateWorld();
    await app.generateWorld();
    expect(callGemini).toHaveBeenCalledTimes(1);
    app.cancelWorldGeneration(); resolveRequest(JSON.stringify(plan)); await pending;
  });

  it('keeps a newly selected world and stops remaining generation stages', async () => {
    const { plan } = fixtures(2);
    let resolveRequest;
    const callGemini = vi.fn(() => new Promise(resolve => { resolveRequest = resolve; }));
    const app = controller({ callGemini });
    const pending = app.generateWorld();
    app.engine._currentLesson = { title: 'Another world' };
    resolveRequest(JSON.stringify(plan)); await pending;
    expect(app.finishGeneration).not.toHaveBeenCalled();
    expect(app.state.aiGenerating).toBe(false);
    expect(app.state.aiGenerationStatus).toContain('changed worlds');
    expect(callGemini).toHaveBeenCalledTimes(1);
  });

  it('does not apply an old response after unmount', async () => {
    const { plan } = fixtures(2);
    let resolveRequest;
    const app = controller({ callGemini: () => new Promise(resolve => { resolveRequest = resolve; }) });
    const pending = app.generateWorld();
    app.unmount(); resolveRequest(JSON.stringify(plan)); await pending;
    expect(app.finishGeneration).not.toHaveBeenCalled();
  });
});

describe('Generation controls and legacy lesson validation', () => {
  it('offers a labeled keyboard-operable slider with student time and a cancel action', () => {
    expect(source).toContain("type: 'range', min: 1, max: 3, step: 1");
    expect(source).toContain("'aria-valuetext': aiDepthProfile.label + ', ' + aiDepthProfile.minutes");
    expect(source).toContain("'aria-describedby': 'gw-lesson-depth-help'");
    expect(source).toContain("}, 'Cancel generation')");
  });

  it('rejects oversized authored lessons as a whole instead of silently dropping math structures', () => {
    const validation = region('  function normalizeGeometryQuestion(', '  // Projection, not another lesson author:')
      + region('      function validateLesson(lesson) {', '      function finishGeneration(lesson) {');
    const validate = new Function('MAX_BLOCKS', '__alloT', 'addToast', validation + '\nreturn validateLesson;')(1500, (_key, fallback) => fallback, vi.fn());
    const { lesson } = fixtures(2);
    Object.assign(lesson.structures[0], { x1: 0, x2: 15, y1: 1, y2: 10, z1: 10, z2: 20 });
    expect(() => validate(lesson)).toThrow('limit is 900');
    expect(lesson.structures).toHaveLength(4);
  });

  it('preserves optional activities and existing NPC speech preferences', () => {
    const validation = region('  function normalizeGeometryQuestion(', '  // Projection, not another lesson author:')
      + region('      function validateLesson(lesson) {', '      function finishGeneration(lesson) {');
    const validate = new Function('MAX_BLOCKS', '__alloT', 'addToast', validation + '\nreturn validateLesson;')(1500, (_key, fallback) => fallback, vi.fn());
    const { lesson } = fixtures(2);
    lesson.npcs[1].voicePreference = 'af_heart';
    const result = validate(lesson);
    expect(result.activities).toHaveLength(4);
    expect(result.npcs[1].voicePreference).toBe('af_heart');
  });
});
