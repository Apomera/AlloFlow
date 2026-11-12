// B5 (AI chat): the coach's Gemini prompt and chip allowlist must match the
// screen it is on. Loads the real onboarding_helpers_module.js (base or lane).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const REPO = process.cwd().replace(/\\/g, '/');


function load() {
  delete window.AlloOnboarding;
  new Function(readFileSync(REPO + '/onboarding_helpers_module.js', 'utf8'))();
  return window.AlloOnboarding;
}

let prompts;
function stubGemini(actions) {
  prompts = [];
  window.callGemini = vi.fn((prompt) => { prompts.push(prompt); return Promise.resolve(JSON.stringify({ answer: 'Here you go.', actions, blocked: false, blockedReason: null })); });
}

beforeEach(() => {
  localStorage.clear();
  delete window.__alloAiUsable;
});

describe('coach AI catalog', () => {
  it('on the role-first Launch Pad, grounds the model in the doors and keeps door chips', async () => {
    const ao = load();
    ao.recordCoachConsent();
    stubGemini([{ kind: 'pick_mode', key: 'family' }, { kind: 'pick_mode', key: 'learning_tools' }, { kind: 'pick_mode', key: 'adult' }]);
    const res = await ao.askCoach({ question: 'I am a parent', layout: 'roles' });
    expect(prompts.length).toBe(1);
    const p = prompts[0];
    expect(p.includes('Professional tools (key: "specialist")')).toBe(true);
    expect(p.includes('Learn independently (key: "adult")')).toBe(true);
    expect(p.includes('The 4 LaunchPad Modes')).toBe(false);
    expect(p.includes('STEAM Lab: Science and math activities')).toBe(true);
    expect(res.actions.map((a) => a.key)).toEqual(['family', 'adult']);
  });

  it('without a layout (older coach), keeps the four-mode catalog and allowlist', async () => {
    const ao = load();
    ao.recordCoachConsent();
    stubGemini([{ kind: 'pick_mode', key: 'family' }, { kind: 'pick_mode', key: 'learning_tools' }]);
    const res = await ao.askCoach({ question: 'I am a student' });
    const p = prompts[0];
    expect(p.includes('The 4 LaunchPad Modes')).toBe(true);
    expect(p.includes('Professional tools (key: "specialist")')).toBe(false);
    expect(res.actions.map((a) => a.key)).toEqual(['learning_tools']);
  });
});
