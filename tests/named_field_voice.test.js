import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
const cleanups = [];

beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
});
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
afterAll(() => vi.unstubAllGlobals());

function registerFields(state) {
  const ctx = {
    listVoiceEditableFields: () => state.fields,
    getSelectedVoiceEditableFieldId: () => state.selected,
    selectVoiceEditableField: (id) => { state.selected = id; return true; },
    editVoiceEditableField: (id, operation, value) => {
      const field = state.fields.find((item) => item.id === id);
      if (!field) return { ok: false, message: 'Gone.' };
      if (operation === 'clear') field.value = '';
      else if (operation === 'append') field.value = [field.value.trim(), value.trim()].filter(Boolean).join(' ');
      else field.value = value;
      return { ok: true };
    },
  };
  const adapter = AC.createNamedFieldCommandAdapter({ id: 'test-fields' });
  cleanups.push(AC.registerCommandScope(adapter));
  return { ctx, kernel: AC.createCommandKernel(() => ctx, { channel: 'voice' }) };
}

describe('named editable-field voice scope', () => {
  it('lists fields without exposing values and selects by exact name or index', async () => {
    const secret = 'private learner sentence';
    const state = { selected: '', fields: [
      { id: 'source-text', label: 'Source text', aliases: ['source input'], value: secret },
      { id: 'response-2', label: 'Sentence frame response 2', value: '' },
    ] };
    const { ctx, kernel } = registerFields(state);
    const snapshot = AC.getLearnerContextSnapshot(ctx);
    expect(JSON.stringify(snapshot)).not.toContain(secret);
    const listed = await kernel.handleUtterance('list editable fields', { allowAi: false });
    expect(listed.narration).toContain('1, Source text, contains text');
    expect(listed.narration).not.toContain(secret);
    expect((await kernel.handleUtterance('select field two', { allowAi: false })).narration)
      .toContain('Sentence frame response 2');
    expect(state.selected).toBe('response-2');
    expect((await kernel.handleUtterance('select source input', { allowAi: false })).narration)
      .toContain('Source text');
  });

  it('sets and appends through host state without DOM focus or clicks', async () => {
    const state = { selected: '', fields: [
      { id: 'math-1', label: 'Show your work for problem 1', aliases: ['problem 1'], value: '' },
    ] };
    const { kernel } = registerFields(state);
    expect((await kernel.handleUtterance('dictate into problem 1: first divide by four', { allowAi: false, recognitionConfidence: 0.99 })).narration)
      .toContain('updated');
    expect(state.fields[0].value).toBe('first divide by four');
    expect((await kernel.handleUtterance('append then check the quotient', { allowAi: false, recognitionConfidence: 0.99 })).narration)
      .toContain('appended');
    expect(state.fields[0].value).toBe('first divide by four then check the quotient');
  });

  it('requires exact private clear confirmation and supports cancellation', async () => {
    const secret = 'do not repeat this answer';
    const state = { selected: '', fields: [
      { id: 'reflection', label: 'Reflection response', value: secret },
    ] };
    const { kernel } = registerFields(state);
    const pending = await kernel.handleUtterance('clear reflection response', { allowAi: false });
    expect(pending).toMatchObject({ confirmationRequired: true, risk: 'destructive' });
    expect(pending.narration).toContain('Clear Reflection response');
    expect(pending.narration).not.toContain(secret);
    expect(JSON.stringify(kernel.getState())).not.toContain(secret);
    await kernel.handleUtterance('no', { allowAi: false });
    expect(state.fields[0].value).toBe(secret);
    await kernel.handleUtterance('clear reflection response', { allowAi: false });
    await kernel.handleUtterance('yes', { allowAi: false });
    expect(state.fields[0].value).toBe('');
  });

  it('does not treat prose as dictation without a selected or named field', async () => {
    const state = { selected: '', fields: [
      { id: 'one', label: 'Response one', value: '' },
      { id: 'two', label: 'Response two', value: '' },
    ] };
    const { kernel } = registerFields(state);
    expect(await kernel.handleUtterance('write a thoughtful paragraph about photosynthesis', { allowAi: false })).toBeNull();
    expect(state.fields.every((field) => field.value === '')).toBe(true);
    expect((await kernel.handleUtterance('dictate into missing response: text', { allowAi: false })).narration)
      .toContain('Available fields');
  });

  it('addresses extended learner writing fields by exact accessible name and index', async () => {
    const privateDraft = 'private DBQ draft';
    const state = { selected: '', fields: [
      { id: 'dbq-essay', label: 'Synthesis essay', aliases: ['DBQ essay'], value: privateDraft },
      { id: 'dbq-source', label: 'Sourcing question 1 for Document A', value: '' },
      { id: 'persona-reflection', label: 'Write your reflection', aliases: ['persona reflection'], value: '' },
      { id: 'cornell-summary', label: 'Cornell summary', value: '' },
    ] };
    const { ctx, kernel } = registerFields(state);
    expect(JSON.stringify(AC.getLearnerContextSnapshot(ctx))).not.toContain(privateDraft);
    expect((await kernel.handleUtterance('select Sourcing question 1 for Document A', { allowAi: false })).narration)
      .toContain('Sourcing question 1 for Document A');
    await kernel.handleUtterance('dictate Evidence about the author and audience', { allowAi: false, recognitionConfidence: 0.99 });
    expect(state.fields[1].value).toBe('Evidence about the author and audience');
    expect((await kernel.handleUtterance('select field four', { allowAi: false })).narration)
      .toContain('Cornell summary');
  });
});

describe('main editable-field registry', () => {
  it('publishes source and sentence-frame fields through live host setters', () => {
    const setInputText = vi.fn();
    const handleStudentInput = vi.fn();
    const fields = AC.listMainVoiceEditableFields({
      activeSidebarTab: 'create',
      activeView: 'input',
      generatedContent: { id: 'lesson-1', type: 'sentence-frames', data: { mode: 'list', items: [{}] } },
      handleStudentInput,
      inputText: 'Source draft',
      isEditingScaffolds: false,
      setInputText,
      showNotebook: false,
      showSourceGen: false,
      showUrlInput: false,
      studentResponses: { 'lesson-1': { 0: 'Response draft' } },
    });

    expect(fields.map((field) => field.id)).toEqual(['source-text', 'sentence-frame-0']);
    fields[0].setValue('Updated source');
    fields[1].setValue('Updated response');
    expect(setInputText).toHaveBeenCalledWith('Updated source');
    expect(handleStudentInput).toHaveBeenCalledWith('lesson-1', 0, 'Updated response');
  });

  it('isolates a Persona reflection from fields behind its modal', () => {
    const setPersonaReflectionInput = vi.fn();
    const fields = AC.listMainVoiceEditableFields({
      activeSidebarTab: 'create',
      activeView: 'input',
      inputText: 'Hidden source draft',
      isGeneratingReflectionPrompt: false,
      isGradingReflection: false,
      isPersonaChatOpen: true,
      isPersonaReflectionOpen: true,
      personaReflectionInput: 'Private reflection',
      setPersonaReflectionInput,
      showSourceGen: false,
      showUrlInput: false,
      t: () => 'Write your reflection',
    });

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ id: 'persona-reflection', value: 'Private reflection', disabled: false });
    fields[0].setValue('Updated reflection');
    expect(setPersonaReflectionInput).toHaveBeenCalledWith('Updated reflection');
  });

  it('routes DBQ and note-template edits through their host update APIs', () => {
    const handleStudentInput = vi.fn();
    const dbqFields = AC.listMainVoiceEditableFields({
      generatedContent: {
        id: 'dbq-1',
        type: 'dbq',
        data: { documents: [{ id: 'A', sourcingQuestions: ['Who?'], analysisQuestions: ['Why?'] }] },
      },
      handleStudentInput,
      studentResponses: { 'dbq-1': {} },
    });
    dbqFields.find((field) => field.id === 'dbq-synthesis-essay').setValue('Essay draft');
    expect(handleStudentInput).toHaveBeenCalledWith('dbq-1', '_essayText', 'Essay draft');

    const handleNoteUpdate = vi.fn();
    const noteFields = AC.listMainVoiceEditableFields({
      generatedContent: { id: 'notes-1', type: 'note-taking', data: { templateType: 'q-and-a', pairs: [] } },
      handleNoteUpdate,
      studentResponses: {},
    });
    noteFields.find((field) => field.id === 'notes-qanda-answer-0').setValue('Study answer');
    expect(handleNoteUpdate).toHaveBeenCalledWith('pairs', [{ question: '', answer: 'Study answer' }]);
  });

  it('publishes visible Applied Challenge phases and invalidates coaching after voice edits', () => {
    const handleNoteUpdate = vi.fn();
    const fields = AC.listMainVoiceEditableFields({
      generatedContent: {
        id: 'challenge-1',
        type: 'applied-challenge',
        data: {
          scope: 'standard',
          workspace: { workingQuestion: 'Which option is strongest?', response: 'First draft' },
        },
      },
      handleNoteUpdate,
      studentResponses: {},
    });
    expect(fields).toHaveLength(10);
    expect(fields.map((field) => field.id)).toContain('applied-challenge-response');
    fields.find((field) => field.id === 'applied-challenge-response').setValue('Revised by voice');
    expect(handleNoteUpdate).toHaveBeenNthCalledWith(1, 'workspace', expect.any(Function));
    const updated = handleNoteUpdate.mock.calls[0][1]({ workingQuestion: 'Which option is strongest?', response: 'First draft' });
    expect(updated.response).toBe('Revised by voice');
    expect(handleNoteUpdate).toHaveBeenNthCalledWith(2, 'coachHint', '');
    expect(handleNoteUpdate).toHaveBeenNthCalledWith(3, 'feedback', null);

    const compactFields = AC.listMainVoiceEditableFields({
      generatedContent: {
        id: 'challenge-compact',
        type: 'applied-challenge',
        data: { scope: 'compact', workspace: {} },
      },
      handleNoteUpdate: vi.fn(),
      studentResponses: {},
    });
    expect(compactFields).toHaveLength(6);
    expect(compactFields.map((field) => field.id)).not.toContain('applied-challenge-stakeholders');
  });
});

describe('main host registration contract', () => {
  it('keeps registry ownership in AlloCommands and only live state wiring in the host', async () => {
    const fs = await import('node:fs');
    const host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    const owner = fs.readFileSync('allo_commands_source.jsx', 'utf8');
    const hostBlock = host.slice(host.indexOf('const _listMainVoiceEditableFields'), host.indexOf('const _selectMainVoiceEditableField'));
    const ownerBlock = owner.slice(owner.indexOf('function listMainVoiceEditableFields'), owner.indexOf('function normalizeVoiceEditableFields'));

    expect(host).toContain("id: 'main-editable-fields'");
    expect(hostBlock).toContain('commandApi.listMainVoiceEditableFields({');
    for (const dependency of ['generatedContent', 'handleNoteUpdate', 'handleStudentInput', 'studentResponses', 't']) {
      expect(hostBlock).toContain(dependency);
    }
    expect(hostBlock).not.toContain("id: 'source-text'");
    expect(ownerBlock).toContain("id: 'source-text'");
    expect(ownerBlock).toContain("id: 'sentence-frame-' + index");
    expect(ownerBlock).toContain("id: 'math-work-' + index");
    expect(ownerBlock).toContain('setValue: (next) => setInputText(next)');
    expect(ownerBlock).toContain('setValue: (next) => handleStudentInput(generatedContent.id, index, next)');
    expect(ownerBlock).not.toMatch(/\.click\s*\(|querySelector|activeElement|\.focus\s*\(/);
  });

  it('keeps all extended writing families in the extracted registry', async () => {
    const fs = await import('node:fs');
    const owner = fs.readFileSync('allo_commands_source.jsx', 'utf8');
    const block = owner.slice(owner.indexOf('function listMainVoiceEditableFields'), owner.indexOf('function normalizeVoiceEditableFields'));
    expect(block).toContain("id: 'persona-reflection'");
    expect(block).toContain('setValue: (next) => setPersonaReflectionInput(next)');
    expect(block).toContain("id: 'persona-chat-message'");
    expect(block).toContain('setValue: (next) => setPersonaInput(next)');
    expect(block).toContain("id: 'dbq-synthesis-essay'");
    expect(block).toContain("setDbqResponse('_essayText', next)");
    expect(block).toContain("label: 'Sourcing question '");
    expect(block).toContain("label: 'Analysis question '");
    expect(block).toContain("label: 'Source reliability reasoning for '");
    expect(block).toContain("id: 'notes-' + id");
    for (const template of ['cornell-notes', 'lab-report', 'reading-response', 'double-entry', 'guided-notes', 'q-and-a']) {
      expect(block).toContain("template === '" + template + "'");
    }
    expect(block).toContain('const setNoteValue = (key, next) => handleNoteUpdate(key, next)');
    expect(block).toContain('if (showNotebook) return fields');
    expect(block).not.toMatch(/\.click\s*\(|querySelector|activeElement|\.focus\s*\(/);
  });
});
