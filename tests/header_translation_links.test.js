import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const createHost = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
afterEach(() => vi.useRealTimers());

describe('translated pack resource links', () => {
  it.each([false, true])('repoints successful copies and retains failed or external targets (failure=%s)', async failReading => {
    vi.useFakeTimers();
    const reading = { id: 'reading', type: 'simplified', data: 'Water.' };
    const plan = { id: 'plan', type: 'lesson-plan', data: { materialsNeeded: [
      '[Read](resource:reading)', 'Read (resource: reading)', '[Outside](resource:outside)'],
      activities: [{ resourceRef: 'reading', resourceId: 'outside', id: 'stable-activity' }] } };
    const state = { history: [reading, plan], generatedContent: plan };
    const warnings = vi.fn();
    const deps = {
      ...state, _resourceMutationStateRef: { current: state }, targetTranslationLang: 'German',
      translationMode: 'off', currentUiLanguage: 'French',
      setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setIsTranslateModalOpen: vi.fn(),
      setProcessingProgress: vi.fn(), setActiveView: vi.fn(), t: () => '', warnLog: vi.fn(), addToast: warnings,
      setHistory: updater => { state.history = updater(state.history); }, setGeneratedContent: vi.fn(),
      translateResourceItem: vi.fn(async item => {
        if (failReading && item.id === 'reading') throw new Error('No reply');
        return { ...item, data: structuredClone(item.data), translationOf: item.id };
      })
    };
    const pending = createHost(deps).handleTranslateAction('all');
    await vi.runAllTimersAsync(); await pending;
    const translatedPlan = state.history.find(item => item.translationOf === 'plan');
    const targetId = failReading ? 'reading' : state.history.find(item => item.translationOf === 'reading').id;
    expect(translatedPlan.data.materialsNeeded).toEqual([
      `[Read](resource:${targetId})`, `Read (resource: ${targetId})`, '[Outside](resource:outside)']);
    expect(translatedPlan.data.activities[0]).toEqual({ resourceRef: targetId, resourceId: 'outside', id: 'stable-activity' });
    expect(plan.data.materialsNeeded[0]).toBe('[Read](resource:reading)');
    if (failReading) expect(warnings).toHaveBeenCalledWith(expect.stringContaining('simplified'), 'warning');
  });
});
