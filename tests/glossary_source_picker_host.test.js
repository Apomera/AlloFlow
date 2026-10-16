import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const handlerStart = shell.indexOf('  const requestGenerationSourceChoice = ');
const handlerEnd = shell.indexOf('  const _alloRunGenerate = ', handlerStart);
if (handlerStart < 0 || handlerEnd < 0) throw new Error('Glossary source picker host handler not found');
const makeHandler = new Function('deps', `
  const { generationSourceChoiceContextRef, setPromptDialog, setSelectedReadingSourceId, addToast } = deps;
  ${shell.slice(handlerStart, handlerEnd)}
  return requestGenerationSourceChoice;
`);
const refreshStart = shell.indexOf('  generationSourceChoiceContextRef.current = ', handlerEnd);
const refreshEnd = shell.indexOf('  const GUIDED_RETRY_TYPES = ', refreshStart);
if (refreshStart < 0 || refreshEnd < 0) throw new Error('Glossary source picker live context effect not found');
const refreshContext = new Function('deps', `
  const { generationSourceChoiceContextRef, history, inputText, activeUnitId, activeView,
    isTeacherMode, isProcessing, handleGenerate, handleGenerateLessonPlan, _alloAdventureHandlersDeps,
    setPromptDialog, useEffect } = deps;
  ${shell.slice(refreshStart, refreshEnd)}
`);
const controllerStart = shell.indexOf('const _alloCreateDialogStateController = ');
const controllerEnd = shell.indexOf('const ALLO_STORAGE_SCRIPT_TIMEOUT_MS', controllerStart);
if (controllerStart < 0 || controllerEnd < 0) throw new Error('Dialog state controller not found');
const createDialogController = new Function(`
  ${shell.slice(controllerStart, controllerEnd)}
  return _alloCreateDialogStateController;
`)();

let previousDialog;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  new Function(readFileSync('generate_dispatcher_source.jsx', 'utf8'))();
});
beforeEach(() => {
  previousDialog = window.AlloModules.PromptDialog;
  window.AlloModules.PromptDialog = { PromptDialog: Object.assign(() => null, { supportsChoices: true }) };
});
afterEach(() => {
  vi.restoreAllMocks();
  if (previousDialog === undefined) delete window.AlloModules.PromptDialog;
  else window.AlloModules.PromptDialog = previousDialog;
});

function fixture() {
  const history = [
    { id: 'moon', title: 'Moon reading', data: { originalText: 'The Moon orbits Earth and creates tides.' } },
    { id: 'plants', title: 'Plants reading', data: { originalText: 'Chlorophyll absorbs sunlight for photosynthesis.' } },
  ].map(item => ({ ...item, type: 'analysis', unitId: 'lesson',
    instructionalText: { role: 'unspecified', form: 'original', designationSource: 'educator' } }));
  const originalGenerate = vi.fn().mockResolvedValue(undefined);
  const ref = { current: { history, inputText: 'Unrelated residual input.', activeUnitId: 'lesson',
    activeView: 'glossary', isTeacherMode: true, isProcessing: false, handleGenerate: originalGenerate } };
  const state = { prompt: null, selectedReadingSourceId: '' };
  const controller = createDialogController(prompt => { state.prompt = prompt; });
  const setPromptDialog = vi.fn(update => controller.set(update));
  const setSelectedReadingSourceId = vi.fn(value => { state.selectedReadingSourceId = value; });
  const addToast = vi.fn();
  const request = {
    type: 'glossary', langOverride: 'Spanish', textOverride: null, switchView: true,
    onComplete: vi.fn(),
    configOverride: { glossaryTier2Count: 4, glossaryTier3Count: 2 },
    choices: history.map(item => ({ value: item.id, label: item.title,
      description: item.data.originalText, sourceText: item.data.originalText })),
  };
  const open = makeHandler({ generationSourceChoiceContextRef: ref, setPromptDialog, setSelectedReadingSourceId, addToast });
  const refresh = changes => {
    refreshContext({ ...ref.current, ...changes, generationSourceChoiceContextRef: ref, setPromptDialog,
      handleGenerateLessonPlan: vi.fn(), _alloAdventureHandlersDeps: () => ({}), useEffect: callback => callback() });
  };
  return { history, originalGenerate, ref, state, controller, setPromptDialog, setSelectedReadingSourceId, addToast, request, open, refresh };
}

describe('reading source picker host integration', () => {
  it('opens a titled source list with no preselection and one-step generation copy', () => {
    const app = fixture();
    expect(app.open(app.request)).toBe(true);
    expect(app.state.prompt).toMatchObject({
      title: 'Choose a source for your glossary', confirmText: 'Use this source and generate',
      defaultValue: '', choices: app.request.choices,
    });
    expect(app.state.prompt.validate('')).toMatch(/choose a source/i);
    expect(app.state.prompt.validate('unknown')).toMatch(/choose a source/i);
    expect(app.state.prompt.validate('plants')).toBeNull();
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).not.toHaveBeenCalled();
  });

  it.each([undefined, { PromptDialog: () => null }])('does not open a choice dialog with an older or absent dialog module (%s)', dialog => {
    window.AlloModules.PromptDialog = dialog;
    const app = fixture();
    expect(app.open(app.request)).toBe(false);
    expect(app.setPromptDialog).not.toHaveBeenCalled();
    expect(app.originalGenerate).not.toHaveBeenCalled();
  });

  it('does not open for unsupported generators, fewer than two choices, or an unavailable live context', () => {
    const app = fixture();
    for (const type of ['analysis', 'math', 'alignment-report', 'unknown']) {
      expect(app.open({ ...app.request, type })).toBe(false);
    }
    expect(app.open({ ...app.request, choices: app.request.choices.slice(0, 1) })).toBe(false);
    expect(app.open({ ...app.request, choices: undefined })).toBe(false);
    app.ref.current = null;
    expect(app.open(app.request)).toBe(false);
    expect(app.setPromptDialog).not.toHaveBeenCalled();
  });

  it.each(['simplified', 'glossary', 'quiz', 'sentence-frames', 'faq', 'brainstorm', 'outline', 'timeline',
    'concept-sort', 'dbq', 'note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge', 'image',
    'gemini-bridge', 'lesson-plan', 'persona', 'adventure'])('offers and revalidates sources for %s', async type => {
    const app = fixture();
    const resolve = vi.spyOn(window.AlloModules.GenDispatcher, 'resolveGenerationSource');
    const request = { ...app.request, type };
    expect(app.open(request)).toBe(true);
    expect(app.state.prompt.title).toMatch(/^Choose a source for your /);
    expect(app.state.prompt.title).toContain(window.AlloModules.GenDispatcher.getGenerationSourceChoiceLabel(type));
    expect(app.state.prompt.message).toBe('Which reading should this use?');
    expect(app.state.prompt.defaultValue).toBe('');
    expect(app.state.prompt.validate('plants')).toBeNull();
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ type,
      config: expect.objectContaining({ inputArtifactId: 'plants', selectedReadingSourceId: 'plants' }),
    }));
    app.state.prompt.onSubmit('plants');
    await Promise.resolve();
    expect(app.originalGenerate).toHaveBeenCalledExactlyOnceWith(type, 'Spanish', false, null,
      expect.objectContaining({ inputArtifactId: 'plants', selectedReadingSourceId: 'plants' }), true);
  });

  it('confirms through the latest generation callback with an explicit source and preserves reading roles', async () => {
    const app = fixture();
    const before = JSON.stringify(app.history);
    app.open(app.request);
    const prompt = app.state.prompt;
    const latestGenerate = vi.fn().mockResolvedValue(undefined);
    app.refresh({ handleGenerate: latestGenerate, inputText: 'More recent residual input.' });
    prompt.onSubmit('plants');
    await Promise.resolve();

    expect(latestGenerate).toHaveBeenCalledExactlyOnceWith('glossary', 'Spanish', false, null,
      { glossaryTier2Count: 4, glossaryTier3Count: 2, inputArtifactId: 'plants', selectedReadingSourceId: 'plants' }, true);
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).toHaveBeenCalledExactlyOnceWith('plants');
    expect(JSON.stringify(app.history)).toBe(before);
    expect(app.history.every(item => item.instructionalText.role === 'unspecified')).toBe(true);
    expect(app.request.configOverride).toEqual({ glossaryTier2Count: 4, glossaryTier3Count: 2 });
  });

  it('submits only once even if confirmation callbacks are repeated', async () => {
    const app = fixture();
    app.open(app.request);
    app.state.prompt.onSubmit('moon');
    app.state.prompt.onSubmit('plants');
    await Promise.resolve();
    expect(app.originalGenerate).toHaveBeenCalledTimes(1);
    expect(app.setSelectedReadingSourceId).toHaveBeenCalledExactlyOnceWith('moon');
  });

  it('does not select or generate a source after cancellation', () => {
    const app = fixture();
    app.open(app.request);
    app.state.prompt.onCancel();
    app.state.prompt.onSubmit('plants');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).not.toHaveBeenCalled();
    expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith();
  });

  it('returns the generated resource to the waiting caller', async () => {
    const app = fixture();
    const resource = { id: 'new-quiz', type: 'quiz', inputArtifactId: 'plants' };
    app.originalGenerate.mockResolvedValue(resource);
    app.open({ ...app.request, type: 'quiz' });
    app.state.prompt.onSubmit('plants');
    await vi.waitFor(() => expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith(resource));
    expect(app.originalGenerate).toHaveBeenCalledTimes(1);
  });

  it('honors a specialist generator and completes only after its result is available', async () => {
    const app = fixture();
    let finish;
    const onGenerate = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const resource = { id: 'new-lesson', type: 'lesson-plan', inputArtifactId: 'plants' };
    app.open({ ...app.request, type: 'lesson-plan', onGenerate });
    app.state.prompt.onSubmit('plants');
    await Promise.resolve();
    expect(onGenerate).toHaveBeenCalledExactlyOnceWith('plants');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.request.onComplete).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).toHaveBeenCalledExactlyOnceWith('plants');
    finish(resource);
    await vi.waitFor(() => expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith(resource));
    app.state.prompt.onCancel();
    app.state.prompt.onSubmit('moon');
    expect(onGenerate).toHaveBeenCalledOnce();
    expect(app.request.onComplete).toHaveBeenCalledOnce();
  });

  it.each([
    ['deleted', history => history.filter(item => item.id !== 'plants'), /no longer available/i],
    ['edited', history => history.map(item => item.id === 'plants' ? { ...item, data: { originalText: 'An updated plant reading.' } } : item), /reading changed/i],
    ['moved to another lesson', history => history.map(item => item.id === 'plants' ? { ...item, unitId: 'other-lesson' } : item), /no longer available/i],
  ])('rejects a reading %s while the picker was open', (_label, changeHistory, expectedError) => {
    const app = fixture();
    app.open(app.request);
    app.refresh({ history: changeHistory(app.history) });
    expect(app.state.prompt.validate('plants')).toMatch(expectedError);
    app.state.prompt.onSubmit('plants');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).not.toHaveBeenCalled();
    expect(app.request.onComplete).not.toHaveBeenCalled();
  });

  it.each([
    ['lesson', { activeUnitId: 'other-lesson' }],
    ['view', { activeView: 'analysis' }],
    ['teacher mode', { isTeacherMode: false }],
  ])('closes and rejects the stale picker when the %s changes', (_label, changes) => {
    const app = fixture();
    app.open(app.request);
    const prompt = app.state.prompt;
    app.refresh(changes);
    expect(app.state.prompt).toBeNull();
    expect(prompt.validate('plants')).toMatch(/lesson changed/i);
    prompt.onSubmit('plants');
    app.refresh({ activeUnitId: 'lesson', activeView: 'glossary', isTeacherMode: true });
    prompt.onSubmit('plants');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).not.toHaveBeenCalled();
    expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith();
  });

  it('rejects a concurrent generation without consuming the choice', async () => {
    const app = fixture();
    app.open(app.request);
    app.refresh({ isProcessing: true });
    expect(app.state.prompt.validate('plants')).toMatch(/wait for the current generation/i);
    expect(app.originalGenerate).not.toHaveBeenCalled();
    app.refresh({ isProcessing: false });
    app.state.prompt.onSubmit('plants');
    await Promise.resolve();
    expect(app.originalGenerate).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss an unrelated prompt when the lesson changes', () => {
    const app = fixture();
    const unrelated = { title: 'Rename lesson', onSubmit: vi.fn() };
    app.setPromptDialog(unrelated);
    const prompt = app.state.prompt;
    app.refresh({ activeUnitId: 'other-lesson' });
    expect(app.state.prompt).toBe(prompt);
    expect(unrelated.onSubmit).not.toHaveBeenCalled();
  });

  it.each(['replace', 'dispose'])('cancels source generation when the dialog controller must %s the picker', action => {
    const app = fixture();
    app.open(app.request);
    const prompt = app.state.prompt;
    if (action === 'replace') app.setPromptDialog({ title: 'Another prompt', onSubmit: vi.fn() });
    else app.controller.dispose();
    prompt.onSubmit('plants');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    expect(app.setSelectedReadingSourceId).not.toHaveBeenCalled();
    expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith();
  });

  it('keeps the picker open across ordinary rerenders in the same lesson and view', () => {
    const app = fixture();
    app.open(app.request);
    const prompt = app.state.prompt;
    app.refresh({ history: app.history.slice(), inputText: 'The draft input has changed.' });
    expect(app.state.prompt).toBe(prompt);
    expect(prompt.validate('moon')).toBeNull();
  });

  it('reports a rejected generation callback without generating twice', async () => {
    const app = fixture();
    app.originalGenerate.mockRejectedValue(new Error('The provider is unavailable.'));
    app.open(app.request);
    app.state.prompt.onSubmit('plants');
    await vi.waitFor(() => expect(app.addToast).toHaveBeenCalledWith('The provider is unavailable.', 'error'));
    expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith();
    app.state.prompt.onSubmit('plants');
    expect(app.originalGenerate).toHaveBeenCalledTimes(1);
  });

  it.each(['throw', 'reject'])('completes a failed specialist generation when it must %s', async failure => {
    const app = fixture();
    const onGenerate = vi.fn(() => {
      if (failure === 'throw') throw new Error();
      return Promise.reject(new Error());
    });
    app.open({ ...app.request, type: 'lesson-plan', onGenerate });
    app.state.prompt.onSubmit('plants');
    await vi.waitFor(() => expect(app.request.onComplete).toHaveBeenCalledExactlyOnceWith());
    expect(app.addToast).toHaveBeenCalledWith('Generation could not start. Please try again.', 'error');
    expect(app.originalGenerate).not.toHaveBeenCalled();
    app.state.prompt.onSubmit('plants');
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
