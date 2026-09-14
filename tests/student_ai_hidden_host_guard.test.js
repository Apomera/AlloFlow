// hideStudentAiFeatures for an IN-APP student (2026-09-14).
//
// The QR guard already swaps the AI functions for a QR-link student, but a
// student who is not on a QR link (Student role on a shared device, the
// project's "hide AI features" setting on) kept the teacher's live AI: the
// host handed modules callGemini = null, while ~40 module sites use
// window.callGemini directly and ~30 lazy tools are mounted with the host's
// own `callGemini` binding. The host effect under test swaps both while the
// flag holds and restores them when it clears.
//
// The effect assigns module-scope `let` bindings, so it is lifted with a
// prelude that declares them, the way glossary_health_lifecycle lifts its hook.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const factoryStart = host.indexOf('function _makeQrStudentAiBlockedFn(label, message) {');
const factoryEnd = host.indexOf('function _installQrStudentAiGuard() {', factoryStart);
const effectStart = host.indexOf('  const [, setStudentAiGuardTick] = useState(0);');
const effectEnd = host.indexOf('  const [showClassAnalytics, setShowClassAnalytics] = useState(false);', effectStart);
expect(factoryStart).toBeGreaterThan(0);
expect(effectStart).toBeGreaterThan(0);
expect(effectEnd).toBeGreaterThan(effectStart);

const useGuard = new Function('React', 'live', 'flags', `
  const { useState, useEffect } = React;
  let callGemini = live.text, callGeminiSingleAttempt = live.text, callGeminiVision = live.vision, callGeminiImageEdit = live.imageEdit;
  ${host.slice(factoryStart, factoryEnd)}
  return function useStudentAiGuard() {
    const studentAiFeaturesHidden = flags.hidden;
    ${host.slice(effectStart, effectEnd)}
    return { callGemini, callGeminiSingleAttempt, callGeminiVision, callGeminiImageEdit };
  };
`);

let cleanup;
beforeEach(() => { delete window.__alloStudentAiDisabled; });
afterEach(() => { cleanup?.(); cleanup = null; ['callGemini', 'callGeminiVision', 'callGeminiImageEdit'].forEach((n) => { delete window[n]; }); delete window.__alloStudentAiDisabled; });

function mount(initialHidden) {
  const live = { text: vi.fn(async () => 'text'), vision: vi.fn(async () => 'vision'), imageEdit: vi.fn(async () => 'edit') };
  window.callGemini = live.text; window.callGeminiVision = live.vision; window.callGeminiImageEdit = live.imageEdit;
  const flags = { hidden: initialHidden };
  const hook = useGuard(React, live, flags);
  let latest = null;
  function Harness() { latest = hook(); return null; }
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const render = (hidden) => { flags.hidden = hidden; act(() => root.render(React.createElement(Harness))); };
  render(initialHidden);
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { live, render, bindings: () => latest };
}

describe('in-app student AI guard', () => {
  it('leaves everything alone while the flag is off', () => {
    const view = mount(false);
    expect(window.callGemini).toBe(view.live.text);
    expect(view.bindings().callGemini).toBe(view.live.text);
    expect(window.__alloStudentAiDisabled).toBeUndefined();
  });

  it('swaps the window globals and the host bindings for blocked functions while hidden', async () => {
    const view = mount(true);
    expect(window.__alloStudentAiDisabled).toBe(true);
    for (const name of ['callGemini', 'callGeminiVision', 'callGeminiImageEdit']) {
      expect(window[name]._alloQrBlocked).toBe(true);
      await expect(window[name]('prompt')).rejects.toMatchObject({ code: 'allo-qr-ai-disabled', message: 'AI features are turned off for students in this project.' });
    }
    // The tick re-render hands the mount sites the blocked bindings.
    const bindings = view.bindings();
    expect(bindings.callGemini._alloQrBlocked).toBe(true);
    expect(bindings.callGeminiSingleAttempt).toBe(bindings.callGemini);
    expect(bindings.callGeminiVision._alloQrBlocked).toBe(true);
    expect(bindings.callGeminiImageEdit._alloQrBlocked).toBe(true);
    expect(view.live.text).not.toHaveBeenCalled();
  });

  it('restores the originals when the role flips back to teacher', () => {
    const view = mount(true);
    view.render(false);
    expect(window.callGemini).toBe(view.live.text);
    expect(window.callGeminiVision).toBe(view.live.vision);
    expect(window.callGeminiImageEdit).toBe(view.live.imageEdit);
    expect(view.bindings().callGemini).toBe(view.live.text);
    expect(view.bindings().callGeminiVision).toBe(view.live.vision);
    expect(window.__alloStudentAiDisabled).toBeUndefined();
  });

  it('does not double-wrap or clobber a function the QR guard already owns', () => {
    const qrBlocked = async () => { throw new Error('qr'); }; qrBlocked._alloQrBlocked = true;
    const view = mount(false);
    window.callGemini = qrBlocked;
    view.render(true);
    expect(window.callGemini).toBe(qrBlocked);
    expect(window.callGeminiVision._alloQrBlocked).toBe(true);
    view.render(false);
    expect(window.callGemini).toBe(qrBlocked);
  });

  it('leaves a function that was re-initialised while hidden in place on restore', () => {
    const view = mount(true);
    const reinitialised = async () => 'fresh';
    window.callGemini = reinitialised;
    view.render(false);
    expect(window.callGemini).toBe(reinitialised);
  });
});

describe('callImagen honours the in-app flag', () => {
  it('checks window.__alloStudentAiDisabled alongside the QR check', () => {
    expect(host).toContain("if (_isQrStudentAiDisabled() || (typeof window !== 'undefined' && window.__alloStudentAiDisabled === true)) {");
    expect(host).toContain("'AI image generation is turned off for students in this project.'");
    expect(readFileSync('desktop/web-app/src/AlloFlowANTI.txt', 'utf8')).toBe(readFileSync('AlloFlowANTI.txt', 'utf8'));
  });
});

describe('modules treat a blocked AI function as absent', () => {
  it('view_renderers offers Concept Map / Memory Palace AI only through the blocked-aware helper', () => {
    const src = readFileSync('view_renderers_source.jsx', 'utf8');
    expect(src).toContain("return typeof window.callGemini === 'function' && !window.callGemini._alloQrBlocked && window.__alloStudentAiDisabled !== true;");
    // every former inline check now goes through the helper (the helper body is the one remaining literal)
    expect(src.match(/typeof window\.callGemini [!=]== 'function'/g)?.length).toBe(1);
    expect(src.match(/_alloRuntimeAiAvailable\(\)/g)?.length).toBeGreaterThanOrEqual(20);
    expect(readFileSync('view_renderers_module.js', 'utf8')).toBe(readFileSync('desktop/web-app/public/view_renderers_module.js', 'utf8'));
  });

  it('the STEM Lab hands tools null instead of a blocked function, and withholds the raw client', () => {
    const lab = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(lab).toContain("callGemini: typeof callGemini === 'function' && !callGemini._alloQrBlocked ? callGemini : null,");
    expect(lab).toContain("ai: (typeof callGemini === 'function' && callGemini._alloQrBlocked) ? null : (ai || null),");
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8')).toBe(lab);
  });
});

describe('adapted text under hidden AI', () => {
  it('Word meaning keeps the popup with a plain message instead of failing, and never calls the AI', async () => {
    const { loadAlloModule } = await import('./setup.js');
    window.__alloUtils = { cleanJson: (x) => x };
    loadAlloModule('content_engine_module.js');
    const blocked = async () => { throw new Error('off'); }; blocked._alloQrBlocked = true;
    window.callGemini = blocked;
    let definition = null; const addToast = vi.fn();
    const state = { interactionMode: 'define', gradeLevel: '5', sourceTopic: 'Water', leveledTextLanguage: 'English', generatedContent: { config: { language: 'English' } }, setDefinitionData: (v) => { definition = typeof v === 'function' ? v(definition) : v; }, setPhonicsData: () => {}, setSelectionMenu: () => {} };
    const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini: blocked, addToast, t: () => null });
    const word = document.createElement('span'); word.getBoundingClientRect = () => ({ left: 1, bottom: 2 });
    await engine.handleWordClick('river', { stopPropagation() {}, currentTarget: word, clientX: 0, clientY: 0 });
    expect(definition).toMatchObject({ word: 'river', text: 'AI explanations are off; the dictionary entry is below.' });
    expect(addToast).not.toHaveBeenCalled();
    delete window.callGemini;
  });

  it('the engine reads the live host function on every call rather than the one captured at creation', () => {
    const src = readFileSync('content_engine_source.jsx', 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain("var _currentCallGemini = function() { return (typeof window !== 'undefined' && typeof window.callGemini === 'function') ? window.callGemini : _depsCallGemini; };");
    expect(src).not.toContain('  var callGemini = deps.callGemini;\n');
  });

  it('Explain mode is withheld from students with AI hidden in both the reading toolbar and Student Tools', () => {
    const simplified = readFileSync('view_simplified_source.jsx', 'utf8');
    expect(simplified).toContain("var studentAiFeaturesHidden = !isTeacherMode && !!props.studentAiFeaturesHidden;");
    expect(simplified).toContain("(studentAiFeaturesHidden && props.interactionMode === 'explain')) ? 'read'");
    expect(simplified).toContain("...(studentAiFeaturesHidden ? [] : [['explain', 'simplified.explain_mode', 'Explain', HelpCircle]]),");
    const fab = readFileSync('view_fab_stack_source.jsx', 'utf8');
    expect(fab).toContain("{!studentAiFeaturesHidden && <button\n                      data-student-tool=\"true\"\n                      data-help-toggle=\"true\"\n                      onClick={() => { setInteractionMode(prev => prev === 'explain' ? 'read' : 'explain');");
    expect(host).toContain('isTeacherMode, studentAiFeaturesHidden, isProcessing, isPlaying,');
  });
});
