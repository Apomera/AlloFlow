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
    expect((await kernel.handleUtterance('dictate into problem 1: first divide by four', { allowAi: false })).narration)
      .toContain('updated');
    expect(state.fields[0].value).toBe('first divide by four');
    expect((await kernel.handleUtterance('append then check the quotient', { allowAi: false })).narration)
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
});

describe('main host registration contract', () => {
  it('uses direct React setters for the three critical field families', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync('AlloFlowANTI.txt', 'utf8'));
    expect(source).toContain("id: 'main-editable-fields'");
    expect(source).toContain("id: 'source-text'");
    expect(source).toContain("id: 'sentence-frame-' + index");
    expect(source).toContain("id: 'math-work-' + index");
    expect(source).toContain('setValue: (next) => setInputText(next)');
    expect(source).toContain('setValue: (next) => handleStudentInput(generatedContent.id, index, next)');
    const block = source.slice(source.indexOf('const _listMainVoiceEditableFields'), source.indexOf('const _alloCmdCtxRef'));
    expect(block).not.toMatch(/\.click\s*\(|querySelector|activeElement|\.focus\s*\(/);
  });
});
