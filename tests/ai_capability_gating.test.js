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

function liftGeminiAudioResolver({ config, hostKey }) {
  const grab = (mark) => {
    const s = anti.indexOf(mark);
    expect(s, mark).toBeGreaterThan(-1);
    const e = anti.indexOf('\n}', s) + 2;
    return anti.slice(s, e);
  };
  const code = [
    `const apiKey = ${JSON.stringify(hostKey || '')};`,
    'const _alloHasAnyStudentEntry = () => false;',
    'const _isQrStudentAiDisabled = () => false;',
    `const localStorage = { getItem: () => ${JSON.stringify(config ? JSON.stringify(config) : null)} };`,
    'const window = { sessionStorage: { getItem: () => null } };',
    grab('function _readAlloAiUserConfig()'),
    grab('function _alloEffectiveGeminiApiKey()'),
    grab('function _alloResolveGeminiAudioCapability()'),
    'return _alloResolveGeminiAudioCapability();',
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
  it('keeps a Gemini cloud-services key available beside a local text backend', () => {
    const config = { backend: 'lmstudio', geminiApiKey: 'gemini-services-key' };
    expect(liftGeminiAudioResolver({ config })).toEqual({ available: true, reason: 'gemini-key' });
    expect(liftResolver({ canvas: false, config }).reason).toBe('api-key');
  });
  it('reports Gemini audio as unavailable without a Gemini credential', () => {
    expect(liftGeminiAudioResolver({ config: { backend: 'lmstudio' } })).toEqual({
      available: false, reason: 'missing-gemini-key',
    });
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
    expect(anti).toContain('window.__alloResolveGeminiAudioCapability = _alloResolveGeminiAudioCapability');
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

describe('teacher-surface disable-with-doorway sweep (X6, 2026-08-17)', () => {
  const sidebar = readFileSync(resolve(ROOT, 'view_sidebar_panels_source.jsx'), 'utf8');
  const sidebarBuilt = readFileSync(resolve(ROOT, 'view_sidebar_panels_module.js'), 'utf8');
  const sidebarMirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/view_sidebar_panels_module.js'), 'utf8');
  const ui = JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8'));

  // One assertion per gated panel (the L4 coverage-test shape): every panel
  // with a generate action must call the hook, so a new panel copied from an
  // old one fails here instead of shipping enabled-but-broken on keyless.
  const GATED_PANELS = ['AdventurePanel', 'SimplifiedPanel', 'MathPanel', 'DbqPanel',
    'GlossaryPanel', 'QuizPanel', 'TimelinePanel', 'ConceptSortPanel', 'BrainstormPanel',
    'ImagePanel', 'OutlinePanel', 'NoteTakingPanel', 'AnchorChartPanel', 'FaqPanel',
    'SentenceFramesPanel', 'LessonPlanPanel', 'AnalysisPanel'];
  for (const panel of GATED_PANELS) {
    it(`${panel} reads capability and gates its generate action`, () => {
      const at = sidebar.indexOf(`function ${panel}(props) {`);
      expect(at, panel + ' must exist').toBeGreaterThan(-1);
      const next = sidebar.indexOf('\nfunction ', at + 10);
      const body = sidebar.slice(at, next === -1 ? undefined : next);
      expect(body, panel + ' must call useAiTextAvailable').toContain('useAiTextAvailable()');
      expect(body, panel + ' must disable on !aiTextAvailable').toContain('|| !aiTextAvailable}');
      expect(body, panel + ' must render the doorway notice').toContain('<AiSetupNotice t={t} />');
    });
  }

  it('the hook fails OPEN on hosts without the resolver (older host contract)', () => {
    // Lift read() out of the hook and run it with no window resolver.
    const m = sidebar.match(/const read = \(\) => \{[\s\S]*?\n  \};/);
    expect(m, 'read() must be liftable').toBeTruthy();
    const run = new Function('window', `${m[0]} return read();`);
    expect(run({})).toBe(true);
    expect(run({ __alloResolveAiCapability: () => ({ text: false }) })).toBe(false);
    expect(run({ __alloResolveAiCapability: () => ({ text: true }) })).toBe(true);
    expect(run({ __alloResolveAiCapability: () => { throw new Error('boom'); } })).toBe(true);
  });

  it('the notice opens the host doorway bridge, and ANTI registers it', () => {
    expect(sidebar).toContain('window.__alloOpenAiSetup');
    expect(anti).toContain('window.__alloOpenAiSetup = () => { try { setShowAIBackendModal(true); } catch (_) {} };');
  });

  it('Full Pack is gated in ANTI with the same doorway', () => {
    const at = anti.indexOf('data-help-key="fullpack_generate"');
    expect(at).toBeGreaterThan(-1);
    const around = anti.slice(at - 1200, at + 600);
    expect(around).toContain('|| !aiCapability.text');
    expect(around).toContain('sidebar_ai_setup_notice');
  });

  it('strings live in ui_strings (listed for X3) and the built module + mirror are current', () => {
    expect(ui.sidebar.needs_ai_setup).toBe('Needs AI setup');
    expect(ui.sidebar.needs_ai_setup_cta).toContain('Gemini Canvas');
    expect(sidebarBuilt).toContain('useAiTextAvailable');
    expect(sidebarMirror).toBe(sidebarBuilt);
  });

  it('Quick Start stays ungated ON RECORD: its onCallGemini is awaited unguarded', () => {
    // Nulling the wizard's onCallGemini prop would crash its search fallback
    // instead of improving it; the wizard also has AI-free paths. Recorded
    // deferral, X6 report. This pin makes the reasoning checkable: if the
    // wizard ever guards the call, this test fails and the gate becomes safe
    // to add.
    const wizard = readFileSync(resolve(ROOT, 'quickstart_module.js'), 'utf8');
    expect(wizard).toContain('await onCallGemini(prompt, false, true)');
  });
});

describe('z-order over the STEAM Lab overlay (2026-08-17 regressions)', () => {
  // The lab overlay's CLASS says z-[9999] but its INLINE style wins — read the
  // real value from the module so this test survives future renumbering and
  // fails if anyone raises the lab back above the surfaces that must beat it.
  const labZMatch = stem.match(/stem-lab-modal[\s\S]{0,400}?zIndex:\s*(\d+)/);
  const labZ = labZMatch ? Number(labZMatch[1]) : 9999;

  it('the deep-link visitor banner paints above the lab overlay', () => {
    // First fix (z-40 -> 10000) read the class, not the inline 10020, and the
    // banner stayed buried; caught live by 42-deep-link-visitor.spec.ts.
    const bannerZMatch = anti.match(/shell_link\.banner_aria[\s\S]{0,900}?zIndex:\s*(\d+)/);
    expect(bannerZMatch, 'banner zIndex must be a findable inline number').toBeTruthy();
    expect(Number(bannerZMatch[1])).toBeGreaterThan(labZ);
  });
  it('the AI Backend modal raises itself above the lab while the lab is open', () => {
    // Without this, the keyless visitor clicks the pill and the doorway opens
    // UNDERNEATH the lab; caught live by 43-keyless-ai-honesty.spec.ts.
    const raiseMatch = modals.match(/zIndex:\s*props\.showStemLab\s*\?\s*(\d+)/);
    expect(raiseMatch, 'AIBackendModal must carry the showStemLab z raise').toBeTruthy();
    expect(Number(raiseMatch[1])).toBeGreaterThan(labZ);
    // And the host must actually supply the prop at the mount.
    const mount = anti.match(/AlloModules\.AIBackendModal,\s*\{[\s\S]{0,600}?\}\)/);
    expect(mount, 'AIBackendModal mount must be findable').toBeTruthy();
    expect(mount[0]).toContain('showStemLab');
  });
});
