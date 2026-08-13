import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

class FakeRecognition {
  start() {}
  stop() { if (this.onend) this.onend(); }
  abort() { if (this.onend) this.onend(); }
}

beforeAll(() => {
  loadAlloModule('voice_module.js');
});

beforeEach(() => {
  window.AlloFlowVoice.stopActiveVoiceSession('test-reset');
  window.SpeechRecognition = FakeRecognition;
  delete window.webkitSpeechRecognition;
  localStorage.removeItem('alloflow_voice_pref');
});

describe('app-wide voice session coordinator', () => {
  it('replaces the previous microphone owner and makes stale leases harmless', () => {
    const firstStopped = vi.fn();
    const first = window.AlloFlowVoice.acquireVoiceSession('agent', {
      mode: 'commands',
      onStop: firstStopped,
    });
    const second = window.AlloFlowVoice.acquireVoiceSession('test-prep', {
      mode: 'hands-free',
      label: 'Hands-free Test Prep',
    });

    expect(firstStopped).toHaveBeenCalledWith('replaced');
    expect(first.isActive()).toBe(false);
    expect(second.isActive()).toBe(true);
    expect(first.release('stale')).toBe(false);
    expect(window.AlloFlowVoice.getActiveVoiceSessionStatus()).toMatchObject({
      owner: 'test-prep',
      mode: 'hands-free',
      label: 'Hands-free Test Prep',
    });
  });

  it('publishes explicit lifecycle states and stops the active owner', () => {
    const states = [];
    const stopped = vi.fn();
    const unsubscribe = window.AlloFlowVoice.subscribeToVoiceSessionStatus((status) => states.push(status));
    const lease = window.AlloFlowVoice.acquireVoiceSession('agent', { onStop: stopped });
    lease.update({ state: 'listening', message: 'Listening for a command.' });

    expect(window.AlloFlowVoice.stopActiveVoiceSession('privacy')).toBe(true);
    expect(stopped).toHaveBeenCalledWith('privacy');
    expect(states.some((status) => status.state === 'listening' && status.owner === 'agent')).toBe(true);
    expect(states.at(-1)).toMatchObject({ state: 'idle', owner: null, reason: 'privacy' });
    unsubscribe();
  });

  it('does not let an old teardown overwrite a replacement started by its callback', () => {
    let replacement = null;
    window.AlloFlowVoice.acquireVoiceSession('first', {
      onStop: () => {
        replacement = window.AlloFlowVoice.acquireVoiceSession('replacement', { mode: 'commands' });
      },
    });

    window.AlloFlowVoice.stopActiveVoiceSession('handoff');

    expect(replacement.isActive()).toBe(true);
    expect(window.AlloFlowVoice.getActiveVoiceSessionStatus()).toMatchObject({
      state: 'starting',
      owner: 'replacement',
      mode: 'commands',
    });
  });

  it('arbitrates shared dictation against another microphone surface', () => {
    const dictation = window.AlloFlowVoice.createDictationController({ continuous: true });
    expect(dictation.start()).toBe(true);
    expect(dictation.isActive()).toBe(true);

    const agent = window.AlloFlowVoice.acquireVoiceSession('agent', { mode: 'commands' });

    expect(dictation.isActive()).toBe(false);
    expect(agent.isActive()).toBe(true);
    expect(window.AlloFlowVoice.getActiveVoiceSessionStatus()).toMatchObject({ owner: 'agent' });
  });
});
