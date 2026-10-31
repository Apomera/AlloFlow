import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = shell.indexOf('  const handleGenerateLessonPlan = async ');
const end = shell.indexOf('  const _extensionGuideRequests = ', start);
if (start < 0 || end < 0) throw new Error('Lesson-plan launcher not found');
// Based on's effective choice comes from the host rule (Automatic = the source in use outside a unit).
const ruleStart = shell.indexOf('  const _alloReadingSourceChoice = () =>');
if (ruleStart < 0) throw new Error('Based on rule not found');
const ruleSource = shell.slice(ruleStart, shell.indexOf('\n', ruleStart) + 1);
const createLauncher = new Function('deps', `
  const { _alloAwaitModules, history, inputText, activeUnitId, selectedReadingSourceId,
    requestGenerationSourceChoice, generationSourceChoiceContextRef, addToast,
    setAlloGenerationType, _alloCmapHandlersDeps, getLessonContext } = deps;
  ${ruleSource}
  ${shell.slice(start, end)}
  return handleGenerateLessonPlan;
`);

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  new Function(readFileSync('generate_dispatcher_source.jsx', 'utf8'))();
});

function fixture(overrides = {}) {
  const history = [
    { id: 'moon', title: 'Moon reading', data: { originalText: 'The Moon orbits Earth.' } },
    { id: 'plants', title: 'Plants reading', data: { originalText: 'Plants absorb sunlight.' } },
  ].map(item => ({ ...item, type: 'analysis', unitId: 'lesson',
    instructionalText: { role: 'unspecified', form: 'original', designationSource: 'educator' } }));
  const requestGenerationSourceChoice = vi.fn(() => true);
  const getLessonContext = vi.fn((items, options) => items.find(item => item.id === options.selectedReadingSourceId)?.data.originalText);
  const generatePlan = vi.fn(async (_switchView, deps) => ({ context: deps.getLessonContext(deps.history, { trace: 'trace' }), source: deps.generationSource }));
  window.AlloModules.CmapHandlers = { handleGenerateLessonPlan: generatePlan };
  const ref = { current: {} };
  const deps = { history, inputText: 'Unrelated residual text', activeUnitId: 'lesson', selectedReadingSourceId: '',
    _alloAwaitModules: vi.fn().mockResolvedValue(), requestGenerationSourceChoice, generationSourceChoiceContextRef: ref,
    getLessonContext, addToast: vi.fn(), setAlloGenerationType: vi.fn(),
    _alloCmapHandlersDeps: () => ({ history, gradeLevel: '5', lessonCustomAdditions: 'Use partners', getLessonContext }), ...overrides };
  const launch = createLauncher(deps);
  ref.current.handleGenerateLessonPlan = launch;
  return { launch, deps, history, generatePlan, requestGenerationSourceChoice, getLessonContext, ref };
}

describe('sidebar lesson-plan source selection', () => {
  it('waits for selection and returns the plan generated from that reading, preserving settings', async () => {
    const app = fixture();
    const completion = app.launch();
    await vi.waitFor(() => expect(app.requestGenerationSourceChoice).toHaveBeenCalledOnce());
    expect(app.generatePlan).not.toHaveBeenCalled();
    const request = app.requestGenerationSourceChoice.mock.calls[0][0];
    expect(request.choices.map(item => item.value)).toEqual(['moon', 'plants']);
    const result = await request.onGenerate('plants');
    request.onComplete(result);
    expect(await completion).toMatchObject({ context: 'Plants absorb sunlight.', source: { inputArtifactId: 'plants' } });
    expect(app.generatePlan).toHaveBeenCalledWith(true, expect.objectContaining({
      inputText: 'Plants absorb sunlight.', gradeLevel: '5', lessonCustomAdditions: 'Use partners',
    }));
    expect(app.getLessonContext).toHaveBeenCalledWith(app.history, expect.objectContaining({
      trace: 'trace', selectedReadingSourceId: 'plants', unitId: 'lesson',
    }));
    // The retry must not depend on React having committed the selection yet.
    expect(app.deps.selectedReadingSourceId).toBe('');
  });

  it('cancels without generating or setting a busy indicator', async () => {
    const app = fixture();
    const completion = app.launch();
    await vi.waitFor(() => expect(app.requestGenerationSourceChoice).toHaveBeenCalled());
    app.requestGenerationSourceChoice.mock.calls[0][0].onComplete();
    expect(await completion).toBeUndefined();
    expect(app.generatePlan).not.toHaveBeenCalled();
    expect(app.deps.setAlloGenerationType).not.toHaveBeenCalled();
  });

  it.each(['selected', 'main', 'single'])('skips the picker for an unambiguous %s reading', async mode => {
    const app = fixture(mode === 'selected' ? { selectedReadingSourceId: 'plants' } : {});
    if (mode === 'single') app.history.splice(0, 1);
    if (mode === 'main') app.history[1].instructionalText.role = 'primary';
    const result = await app.launch();
    expect(result.context).toBe('Plants absorb sunlight.');
    expect(app.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(app.generatePlan).toHaveBeenCalledOnce();
  });

  it('does not open a modal for background generation or generate from an unavailable selection', async () => {
    const background = fixture();
    await background.launch(false);
    expect(background.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(background.generatePlan).not.toHaveBeenCalled();
    const missing = fixture({ selectedReadingSourceId: 'deleted' });
    await missing.launch();
    expect(missing.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(missing.generatePlan).not.toHaveBeenCalled();
    expect(missing.deps.addToast).toHaveBeenCalled();
  });

  it('does not open old reading choices after the lesson changes while modules load', async () => {
    let ready;
    const app = fixture({ _alloAwaitModules: () => new Promise(resolve => { ready = resolve; }) });
    app.ref.current = { ...app.deps, activeView: 'lesson-plan', isTeacherMode: true, handleGenerateLessonPlan: app.launch };
    const pending = app.launch();
    app.ref.current = { ...app.ref.current, activeUnitId: 'another-lesson' };
    ready();
    await pending;
    expect(app.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(app.generatePlan).not.toHaveBeenCalled();
  });
});

describe('source choice module loading lifecycle', () => {
  const start = shell.indexOf('  const handleGenerate = (...args) => ');
  const end = shell.indexOf('  generationSourceChoiceContextRef.current = ', start);
  const createGenerate = new Function('generationSourceChoiceContextRef', '_alloAwaitModules', '_alloRunGenerate',
    shell.slice(start, end) + '; return handleGenerate;');

  it.each(['history', 'inputText', 'activeUnitId', 'activeView', 'isTeacherMode'])('ignores an interactive request after %s changes during loading', async key => {
    const ref = { current: { history: [], inputText: 'Reading', activeUnitId: 'lesson', activeView: 'quiz', isTeacherMode: true } };
    let ready;
    const run = vi.fn();
    const generate = createGenerate(ref, () => new Promise(resolve => { ready = resolve; }), run);
    const pending = generate('quiz');
    ref.current = { ...ref.current, [key]: key === 'history' ? [] : key === 'isTeacherMode' ? false : 'changed' };
    ready();
    await pending;
    expect(run).not.toHaveBeenCalled();
  });

  it('allows ordinary rerenders and preserves the pending generator arguments', async () => {
    const ref = { current: { history: [], inputText: 'Reading', activeUnitId: 'lesson', activeView: 'quiz', isTeacherMode: true } };
    let ready;
    const result = { id: 'quiz' }, run = vi.fn().mockResolvedValue(result);
    const generate = createGenerate(ref, () => new Promise(resolve => { ready = resolve; }), run);
    const pending = generate('quiz', 'Spanish', false, null, { inputArtifactId: 'reading' });
    ref.current = { ...ref.current, isProcessing: false };
    ready();
    expect(await pending).toBe(result);
    expect(run).toHaveBeenCalledWith('quiz', 'Spanish', false, null, { inputArtifactId: 'reading' });
  });
});
