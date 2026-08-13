import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('test_prep_hub_source.jsx', 'utf8');

describe('Test Prep shared voice-session handoff', () => {
  it('leases the microphone through the app-wide coordinator', () => {
    expect(source).toContain("acquireVoiceSession('test-prep'");
    expect(source).toContain("mode: 'hands-free'");
    expect(source).toContain('handsFreeVoiceLeaseRef.current');
    expect(source).toContain("lease.release('hands-free-ended')");
  });

  it('restores prior global voice only after an intentional foreground exit', () => {
    expect(source).toContain('handsFreeResumeGlobalVoiceRef.current = wasGlobalVoiceActive');
    expect(source).toContain('disableHandsFree(true, false)');
    expect(source).toContain('disableHandsFree(false, false)');
    expect(source).toContain("document.visibilityState !== 'hidden'");
    expect(source).toContain('window.__alloVoiceLoop.start');
  });

  it('allows coordinator replacement to stop local recognition without taking the new owner', () => {
    expect(source).toContain('onStop: () => {');
    expect(source).toContain('handsFreeVoiceLeaseRef.current = null');
    expect(source).toContain('if (handsFreeEnabledRef.current) disableHandsFree(true, false)');
  });
  it('publishes semantic start, stop, and status responses without removing other inputs', () => {
    expect(source).toContain("TEST_PREP_VOICE_CONTROL_EVENT = 'alloflow:test-prep-voice-control'");
    expect(source).toContain("TEST_PREP_VOICE_STATUS_EVENT = 'alloflow:test-prep-voice-status'");
    expect(source).toContain('window.addEventListener(TEST_PREP_VOICE_CONTROL_EVENT');
    expect(source).toContain("normalized === 'start' || normalized === 'start-hands-free'");
    expect(source).toContain("normalized === 'stop' || normalized === 'stop-hands-free'");
    expect(source).toContain('publishTestPrepVoiceStatus(status, request, action)');
    expect(source).toContain('onClick={toggleHandsFree}');
  });

  it('keeps completion voice-operable and routes transitions through coordinator cleanup', () => {
    expect(source).toContain("return { type: 'another-set'");
    expect(source).toContain("return { type: 'open-progress'");
    expect(source).toContain("return { type: 'exit'");
    expect(source).toContain("command.type === 'another-set') { chooseAnotherPracticeSet()");
    expect(source).toContain("command.type === 'open-progress') { disableHandsFree(); setTab('progress')");
    expect(source).toContain("command.type === 'exit') { disableHandsFree(); onClose()");
    expect(source).toContain('Say another set to choose a new practice set');
    expect(source).not.toContain('Use the visible controls to open another set or progress.');
  });

});
