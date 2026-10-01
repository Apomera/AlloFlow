import fs from 'node:fs';
// Host files (ANTI, its mirror, App.jsx) come back with the code moved out of them (host_handlers_source.jsx,
// allo_command_context_source.js, CDN view sources) put back; every other file reads unchanged.
import { readFileSync as readSourceFile } from './helpers/host_source.js';
import { describe, expect, it } from 'vitest';

const commands = readSourceFile('allo_commands_source.jsx', 'utf8');
const host = readSourceFile('AlloFlowANTI.txt', 'utf8');

describe('global voice to Test Prep hands-free bridge', () => {
  it('publishes scoped start and status commands only while Test Prep is open', () => {
    expect(commands).toContain("id: 'start_test_prep_hands_free'");
    expect(commands).toContain("id: 'test_prep_hands_free_status'");
    expect(commands).toContain("!!c.testPrepHubOpen && typeof c.requestTestPrepVoiceControl === 'function'");
    expect(commands).toContain("start_test_prep_hands_free: { requires: ['testPrep']");
    expect(commands).toContain("start_test_prep_hands_free:['testPrepHub']");
  });

  it('uses the semantic event boundary and never simulates a click', () => {
    const start = host.indexOf('const requestTestPrepVoiceControl');
    const end = host.indexOf('const ctx = {', start);
    const bridge = host.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(bridge).toContain("new CustomEvent('alloflow:test-prep-voice-control'");
    expect(bridge).toContain('respond: (payload) => { response = payload || null; }');
    expect(bridge).toContain("state: isTestPrepHubOpen ? 'loading' : 'closed'");
    expect(bridge).not.toMatch(/\.click\s*\(/);
    expect(host).toContain('requestTestPrepVoiceControl,');
  });
});
