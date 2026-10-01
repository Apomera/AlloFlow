import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const commands = fs.readFileSync('allo_commands_source.jsx', 'utf8');
const host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const talk = fs.readFileSync('view_misc_modals_source.jsx', 'utf8');
const launch = fs.readFileSync('view_launch_pad_source.jsx', 'utf8');
const roles = fs.readFileSync('ui_modals_source.jsx', 'utf8');
const testPrep = fs.readFileSync('test_prep_hub_source.jsx', 'utf8');
const quiz = fs.readFileSync('view_quiz_source.jsx', 'utf8');
const voice = fs.readFileSync('voice_module.js', 'utf8');

describe('voice-only acceptance contract (pointer and keyboard remain supported)', () => {
  it('has an honest assisted bootstrap and never removes other input modes', () => {
    expect(launch).toContain('enableVoiceAccess');
    expect(roles).toContain('onStartVoiceAccess');
    expect(launch + roles).toMatch(/optional/i);
    expect(launch + roles).toMatch(/(?:touch|pointer)/i);
    expect(launch + roles).toMatch(/keyboard/i);
    expect(talk).toContain('onToggleVoiceAgent');
  });

  it('keeps exactly one coordinated microphone owner', () => {
    expect(voice).toContain('acquireVoiceSession');
    expect(voice).toContain('stopActiveVoiceSession');
    expect(talk).toContain('stopActiveDictation');
    expect(testPrep).toContain("acquireVoiceSession('test-prep'");
  });

  it('supports semantic orientation, voice confirmation, reading, quiz, and Test Prep boundaries', () => {
    for (const id of [
      'describe_current_screen', 'list_current_actions', 'go_back', 'close_current_surface',
      'read_this_page', 'pause_read_this_page', 'resume_read_this_page',
      'next_read_this_page', 'previous_read_this_page', 'repeat_read_this_page',
      'start_test_prep_hands_free',
    ]) expect(commands).toContain(`id: '${id}'`);
    expect(commands).toContain('pendingConfirmation');
    expect(commands).toMatch(/Say yes to confirm/i);
    expect(host).toContain('requestTestPrepVoiceControl');
    expect(host).toContain('onClose: handleSetActiveViewToDashboard');
    expect(testPrep).toContain("TEST_PREP_VOICE_CONTROL_EVENT = 'alloflow:test-prep-voice-control'");
    expect(quiz).toContain("QUIZ_VOICE_CONTROL_EVENT = 'alloflow:quiz-voice-control'");
  });

  it('uses semantic APIs rather than DOM click simulation', () => {
    const semanticHost = host.slice(host.indexOf('// @section VOICE_SEMANTIC_HOST'), host.indexOf('const ctx = {', host.indexOf('// @section VOICE_SEMANTIC_HOST')));
    const testPrepBoundary = testPrep.slice(testPrep.indexOf('TEST_PREP_VOICE_CONTROL_EVENT'), testPrep.indexOf('TEST_PREP_GITHUB_RAW_BASE')) +
      testPrep.slice(testPrep.indexOf('function getTestPrepVoiceBoundaryStatus'), testPrep.indexOf('function startHandsFree'));
    const quizBoundary = quiz.slice(quiz.indexOf('// QUIZ VOICE SURFACE'), quiz.indexOf('// QUIZ_VOICE_EFFECT'));
    expect(semanticHost).not.toMatch(/\.click\s*\(/);
    expect(testPrepBoundary).not.toMatch(/\.click\s*\(/);
    expect(quizBoundary).not.toMatch(/\.click\s*\(/);
  });
});
