// ai_capability_gating.test.js — W7's contract: one resolver, honest surfaces.
//
// The failure class this guards: a keyless shell install showing AI controls
// that silently fail, or a gate reading a DIFFERENT source of truth than the
// backend (the lockout class this repo has shipped before). Assertions are
// against the real sources, and the resolver is exercised behaviourally by
// lifting it out of the monolith.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const stem = readFileSync(resolve(ROOT, 'stem_lab', 'stem_lab_module.js'), 'utf8');
const modals = readFileSync(resolve(ROOT, 'view_misc_modals_source.jsx'), 'utf8');

// Lift resolveAiCapability plus the three readers it depends on, with the
// environment stubbed per case. The lift takes the REAL function bodies, so a
// drift between the resolver and the readers fails here.
function liftResolver({ canvas, config, hostKey }) {
  const grab = (mark) => {
    const s = anti.indexOf(mark);
    expect(s, mark).toBeGreaterThan(-1);
    const e = anti.indexOf('\n}', s) + 2;
    return anti.slice(s, e);
  };
  const code = [
    `const _isCanvasEnv = ${JSON.stringify(!!canvas)};`,
    `const apiKey = ${JSON.stringify(hostKey || '')};`,
    'const _alloHasAnyStudentEntry = () => false;',
    `const localStorage = { getItem: () => ${JSON.stringify(config ? JSON.stringify(config) : null)} };`,
    'const window = { sessionStorage: { getItem: () => null } };',
    grab('function _readAlloAiUserConfig()'),
    grab('function _alloEffectiveGeminiApiKey()'),
    grab('function _usesLocalTextBackend(config)'),
    grab('function resolveAiCapability()'),
    'return resolveAiCapability();',
  ].join('\n');
  return new Function(code)();
}

describe('AI capability resolver', () => {
  it('canvas → everything on', () => {
    expect(liftResolver({ canvas: true })).toEqual({ text: true, images: true, tts: 'full', reason: 'canvas' });
  });
  it('gemini key → everything on', () => {
    expect(liftResolver({ canvas: false, config: { backend: 'gemini', apiKey: 'k' } }).reason).toBe('api-key');
  });
  it('local backend → text yes, images no, tts local', () => {
    expect(liftResolver({ canvas: false, config: { backend: 'lmstudio' } })).toEqual({ text: true, images: false, tts: 'local', reason: 'local-backend' });
  });
  it('nothing configured → text/images off, tts still local (Kokoro/browser voice)', () => {
    const cap = liftResolver({ canvas: false, config: null });
    expect(cap).toEqual({ text: false, images: false, tts: 'local', reason: 'none' });
  });
  it('host fallback key counts (the shell can carry a deployment key)', () => {
    expect(liftResolver({ canvas: false, config: null, hostKey: 'deploy-key' }).text).toBe(true);
  });
});

describe('wiring', () => {
  it('the resolver is exported for modules and the host derives reactive state from it', () => {
    expect(anti).toContain('window.__alloResolveAiCapability = resolveAiCapability');
    expect(anti).toContain("useState(() => resolveAiCapability())");
    expect(anti).toContain("addEventListener(ALLO_AI_CONFIG_CHANGED_EVENT");
  });
  it('the StemLab mount nulls the AI functions when text capability is off, and passes the doorway', () => {
    expect(anti).toContain('callGemini: aiCapability.text ? callGemini : null');
    expect(anti).toContain('callGeminiVision: aiCapability.text ? callGeminiVision : null');
    expect(anti).toContain('onOpenAiSetup: () => { try { setShowAIBackendModal(true); }');
  });
  it('the STEM header shows the quiet pill only when callGemini is absent, and it opens the doorway', () => {
    expect(stem).toContain("'AI extras: off'");
    expect(stem).toContain('!callGemini && /*#__PURE__*/React.createElement("button"');
    expect(stem).toContain('onOpenAiSetup');
    // The hints toggle must not render as a dead control on a keyless install.
    expect(stem).toContain('isTeacherMode && !!callGemini &&');
  });
  it('tools receive aiAvailable on ctx so per-tool extras can gate', () => {
    expect(stem).toContain("aiAvailable: typeof callGemini === 'function'");
  });
  it('the AI Backend modal leads keyless users with the Canvas card, link intact', () => {
    expect(modals).toContain('guided_card_canvas_title');
    expect(modals).toContain('https://share.gemini.google/');
    // Never state quota numbers in UI copy — they rot into false claims.
    expect(modals).not.toMatch(/\d+\s*(requests|prompts|queries)\s*(per|a)\s*day/i);
  });
  it('every config write announces the change so gated UI re-derives', () => {
    expect(modals).toContain("alloflow:ai-config-changed");
  });
});
