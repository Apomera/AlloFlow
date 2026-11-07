// ai_capability_gating.test.js — W7's contract: one resolver, honest surfaces.
//
// The failure class this guards: a keyless shell install showing AI controls
// that silently fail, or a gate reading a DIFFERENT source of truth than the
// backend (the lockout class this repo has shipped before). Assertions are
// against the real sources, and the resolver is exercised behaviourally by
// lifting it out of the monolith.
import { describe, it, expect } from 'vitest';
// Host files (ANTI, its mirror, App.jsx) come back with the code moved out of them (host_handlers_source.jsx,
// allo_command_context_source.js, CDN view sources) put back; every other file reads unchanged.
import { readFileSync } from './helpers/host_source.js';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const stem = readFileSync(resolve(ROOT, 'stem_lab', 'stem_lab_module.js'), 'utf8');
const modals = readFileSync(resolve(ROOT, 'view_misc_modals_source.jsx'), 'utf8');

const grabFn = (mark) => {
  const s = anti.indexOf(mark);
  expect(s, mark).toBeGreaterThan(-1);
  const e = anti.indexOf('\n}', s) + 2;
  return anti.slice(s, e);
};
const grabLine = (mark) => {
  const s = anti.indexOf(mark);
  expect(s, mark).toBeGreaterThan(-1);
  return anti.slice(s, anti.indexOf('\n', s));
};
// The learner-role key fence the readers consult (real bodies, like the rest).
const fenceCode = () => [
  grabFn('function _alloPastedAiKeyFenceActive()'),
  grabLine('const _ALLO_AI_SECRET_FIELD = '),
  grabLine('const _ALLO_KEYLESS_AI_BACKENDS = '),
  grabFn('function _alloStripAiSecrets(config)'),
  grabFn('function _alloStoredAiConfig()'),
];

// Lift resolveAiCapability plus the three readers it depends on, with the
// environment stubbed per case. The lift takes the REAL function bodies, so a
// drift between the resolver and the readers fails here.
function liftResolver({ canvas, config, hostKey, learner = false, returnKey = false }) {
  const grab = grabFn;
  const code = [
    `const _isCanvasEnv = ${JSON.stringify(!!canvas)};`,
    `const apiKey = ${JSON.stringify(hostKey || '')};`,
    'const _alloHasAnyStudentEntry = () => false;',
    `const localStorage = { getItem: () => ${JSON.stringify(config ? JSON.stringify(config) : null)} };`,
    `const window = { sessionStorage: { getItem: () => null }, __alloLearnerRoleActive: ${JSON.stringify(!!learner)} };`,
    ...fenceCode(),
    grab('function _readAlloAiUserConfig()'),
    grab('function _alloEffectiveGeminiApiKey()'),
    grab('function _usesLocalTextBackend(config)'),
    grab('function resolveAiCapability()'),
    returnKey
      ? 'return { key: _alloEffectiveGeminiApiKey(), config: _readAlloAiUserConfig(), cap: resolveAiCapability() };'
      : 'return resolveAiCapability();',
  ].join('\n');
  return new Function(code)();
}

function liftGeminiAudioResolver({ config, hostKey, learner = false }) {
  const grab = grabFn;
  const code = [
    'const _isCanvasEnv = false;',
    `const apiKey = ${JSON.stringify(hostKey || '')};`,
    'const _alloHasAnyStudentEntry = () => false;',
    'const _isQrStudentAiDisabled = () => false;',
    `const localStorage = { getItem: () => ${JSON.stringify(config ? JSON.stringify(config) : null)} };`,
    `const window = { sessionStorage: { getItem: () => null }, __alloLearnerRoleActive: ${JSON.stringify(!!learner)} };`,
    ...fenceCode(),
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

// A key saved on a teacher's device must never serve a learner role: provider
// API terms are 18+, and a student on the teacher's laptop (typed class code or
// self-picked Student) used to run on it. QR/link entries use their own
// session-only config and are fenced by the existing QR policy instead.
describe('learner-role device key fence', () => {
  const liftFence = ({ canvas = false, learner, studentEntry = false }) => new Function([
    `const _isCanvasEnv = ${JSON.stringify(!!canvas)};`,
    `const _alloHasAnyStudentEntry = () => ${JSON.stringify(!!studentEntry)};`,
    `const window = { __alloLearnerRoleActive: ${JSON.stringify(learner)} };`,
    grabFn('function _alloPastedAiKeyFenceActive()'),
    'return _alloPastedAiKeyFenceActive();',
  ].join('\n'))();

  it('is active only for a learner role outside Canvas without a QR/link entry', () => {
    expect(liftFence({ learner: true })).toBe(true);
    expect(liftFence({ learner: false })).toBe(false);
    expect(liftFence({ learner: undefined })).toBe(false);
    expect(liftFence({ learner: true, canvas: true })).toBe(false);
    expect(liftFence({ learner: true, studentEntry: true })).toBe(false);
  });
  it('withholds a saved Gemini key from a learner and reports no AI', () => {
    const config = { backend: 'gemini', apiKey: 'teacher-key', geminiApiKey: 'teacher-key' };
    expect(liftResolver({ canvas: false, config, returnKey: true }).key).toBe('teacher-key');
    const learner = liftResolver({ canvas: false, config, learner: true, returnKey: true });
    expect(learner.key).toBe('');
    expect(learner.config.apiKey).toBeUndefined();
    expect(learner.config.geminiApiKey).toBeUndefined();
    expect(learner.cap).toEqual({ text: false, images: false, tts: 'local', reason: 'none' });
  });
  it('withholds the boot/host key too, so no fallback key leaks to a learner', () => {
    expect(liftResolver({ canvas: false, config: null, hostKey: 'deploy-key', learner: true, returnKey: true }).key).toBe('');
  });
  it('turns a keyed cloud provider into no connection instead of a call that fails', () => {
    for (const backend of ['openai', 'claude']) {
      const out = liftResolver({ canvas: false, config: { backend, apiKey: 'sk-teacher', baseUrl: 'https://api.example' }, learner: true, returnKey: true });
      expect(out.config.backend, backend).toBe('gemini');
      expect(out.config.baseUrl, backend).toBeUndefined();
      expect(out.cap.text, backend).toBe(false);
    }
    const custom = liftResolver({ canvas: false, config: { backend: 'custom', apiKey: 'k', baseUrl: 'https://proxy.example' }, learner: true, returnKey: true });
    expect(custom.cap.text).toBe(false);
  });
  it('keeps private keyless AI on the device working for learners', () => {
    for (const backend of ['ollama', 'lmstudio', 'alloflow-local', 'localai', 'onnx-npu']) {
      expect(liftResolver({ canvas: false, config: { backend }, learner: true }).reason, backend).toBe('local-backend');
    }
    const keylessCustom = liftResolver({ canvas: false, config: { backend: 'custom', baseUrl: 'http://127.0.0.1:8080' }, learner: true, returnKey: true });
    expect(keylessCustom.config.backend).toBe('custom');
    expect(keylessCustom.cap.reason).toBe('local-backend');
  });
  it('strips every secret-shaped field but keeps provider settings', () => {
    const out = liftResolver({ canvas: false, learner: true, returnKey: true, config: {
      backend: 'ollama', apiKey: 'a', geminiApiKey: 'b', serperApiKey: 'c', wolframAppId: 'd', accessToken: 'e',
      ttsProvider: 'browser', models: { default: 'llama' },
    } });
    expect(Object.keys(out.config).sort()).toEqual(['backend', 'models', 'ttsProvider']);
  });
  it('keeps Gemini voice transcription off for a learner beside a local text backend', () => {
    const config = { backend: 'lmstudio', geminiApiKey: 'gemini-services-key' };
    expect(liftGeminiAudioResolver({ config }).available).toBe(true);
    expect(liftGeminiAudioResolver({ config, learner: true })).toEqual({ available: false, reason: 'missing-gemini-key' });
  });
  it('Canvas learners keep the Canvas path (the school Gemini agreement)', () => {
    expect(liftResolver({ canvas: true, config: { backend: 'gemini', apiKey: 'k' }, learner: true }).reason).toBe('canvas');
  });
  it('the host sets the role flag in render and rebuilds clients when the role changes', () => {
    expect(anti).toContain('window.__alloLearnerRoleActive = !isTeacherMode;');
    expect(anti).toContain('window.__alloPastedAiKeyFenceActive = _alloPastedAiKeyFenceActive;');
    const effect = anti.slice(anti.indexOf('const pastedKeyRoleRef = useRef(isTeacherMode);'), anti.indexOf('}, [isTeacherMode]);', anti.indexOf('const pastedKeyRoleRef')));
    expect(effect).toContain('_upgradeGeminiAPI()');
    expect(effect).toContain('_upgradeTTS()');
  });
  it('the Gemini client and direct web search consult the fence at request time', () => {
    const gemini = readFileSync(resolve(ROOT, 'gemini_api_source.jsx'), 'utf8');
    expect(gemini).toContain("const _resolveApiKey = () => (_pastedKeyFenced() ? '' : (_bootApiKey || _liveStoredGeminiKey()));");
    const backend = readFileSync(resolve(ROOT, 'ai_backend_module.js'), 'utf8');
    const serper = backend.slice(backend.indexOf('_serperDirectKey() {'), backend.indexOf('async _fetchSerperDirect('));
    expect(serper).toContain('window.__alloPastedAiKeyFenceActive()) return');
  });
});

describe('saved key lock wiring', () => {
  const liftStored = ({ stored, session, learner = false }) => new Function([
    'const _isCanvasEnv = false;',
    'const _alloHasAnyStudentEntry = () => false;',
    `const localStorage = { getItem: () => ${JSON.stringify(stored ? JSON.stringify(stored) : null)} };`,
    `const window = { sessionStorage: { getItem: () => ${JSON.stringify(session ? JSON.stringify(session) : null)} }, __alloLearnerRoleActive: ${JSON.stringify(!!learner)} };`,
    ...fenceCode(),
    grabFn('function _readAlloAiUserConfig()'),
    'return _readAlloAiUserConfig();',
  ].join('\n'))();

  it('a teacher reads a key unlocked for this tab, with no plaintext on the device', () => {
    const out = liftStored({ stored: { backend: 'gemini', models: { default: 'm' } }, session: { apiKey: 'unlocked', unsaved: false } });
    expect(out.apiKey).toBe('unlocked');
    expect(out.models).toEqual({ default: 'm' });
    expect(out.unsaved).toBeUndefined();
  });
  it('a locked key (nothing in this tab) reads as no key', () => {
    expect(liftStored({ stored: { backend: 'gemini' } }).apiKey).toBeUndefined();
  });
  it('the learner fence still strips a key unlocked in this tab', () => {
    expect(liftStored({ stored: { backend: 'gemini' }, session: { apiKey: 'unlocked' }, learner: true }).apiKey).toBeUndefined();
  });
  it('entering a learner role wipes the tab copy and the clients are rebuilt on lock changes', () => {
    expect(anti.includes('if (!isTeacherMode) { try { window.AlloModules?.DeviceAccessCode?.lockAiKey?.(); } catch (_) {} }')).toBe(true);
    expect(anti.includes("window.addEventListener('alloflow:ai-key-lock-changed', rebuild);")).toBe(true);
  });
  it('the Gemini client reads through the host, not raw localStorage alone', () => {
    const gemini = readFileSync(resolve(ROOT, 'gemini_api_source.jsx'), 'utf8');
    expect(gemini.includes('window.__alloReadStoredAiConfig')).toBe(true);
  });
  it('the settings window saves through the split and hides everything while locked', () => {
    expect(modals.includes('keyLock.splitAiSecretsForSave(next)')).toBe(true);
    expect(modals.includes('if (initialKeyLockStatus && initialKeyLockStatus.locked) {')).toBe(true);
    expect(modals.includes('{renderKeyProtectRow()}')).toBe(true);
  });
});

describe('student own-key AI is adults-only', () => {
  it('a share only offers student-byok after the teacher confirms every student is 18+', () => {
    const policy = anti.slice(anti.indexOf('const studentAiPolicyForShare = '), anti.indexOf("? 'student-byok'", anti.indexOf('const studentAiPolicyForShare = ')));
    expect(policy).toContain('studentProjectSettings.allowStudentByokAi === true');
    expect(policy).toContain('studentProjectSettings.studentByokAdultsConfirmed === true');
    expect(anti).toContain('studentByokAdultsConfirmed: false,');
    expect(anti).toContain('studentByokAdultsConfirmed: source.studentByokAdultsConfirmed === true,');
  });
  it('project settings show the confirmation only once own-key AI is switched on', () => {
    const settings = readFileSync(resolve(ROOT, 'view_project_settings_source.jsx'), 'utf8');
    expect(settings).toContain("{studentProjectSettings.allowStudentByokAi === true && (");
    expect(settings).toContain("'studentByokAdultsConfirmed',");
  });
  it('teachers see the 18+ and free-tier review notice at every key field; students do not', () => {
    expect(modals).toContain('{!isStudentAiSetup && renderTeacherKeyTermsNotice()}');
    expect(modals).toContain("t('ai_backend.key_terms_age')");
    expect(modals).not.toContain("guided_gemini_step2') || 'Sign in with any Google account (a free one is fine).'");
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
    expect(anti).toContain('callGeminiVision: (aiCapability.text && !studentAiFeaturesHidden) ? callGeminiVision : null');
    expect(anti).toContain('callImagen: (aiCapability.images && !studentAiFeaturesHidden) ? callImagen : null');
    expect(anti).toContain('ai: (aiCapability.text && !studentAiFeaturesHidden) ? ai : null');
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
    expect(stem.includes('aiAvailable: _stemAiText,')).toBe(true);
  });
  it('the AI Backend modal leads keyless users with the Canvas card, link intact', () => {
    expect(modals).toContain('guided_card_canvas_title');
    // The link comes from release.json at runtime; offline it is the launcher.
    expect(modals).toContain('https://alloflow-cdn.pages.dev/release.json');
    expect(modals).toContain("CANVAS_FALLBACK_URL = 'https://alloflow-cdn.pages.dev/launch'");
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
    // The Full Pack card moved out of ANTI into FullPackRunView (view_full_pack_run_source.jsx, fadeda957).
    const fullPackRun = readFileSync(resolve(ROOT, 'view_full_pack_run_source.jsx'), 'utf8');
    expect(anti).toContain("_alloCreateFirstWaveCdnView('FullPackRunView'");
    const at = fullPackRun.indexOf('data-help-key="fullpack_generate"');
    expect(at).toBeGreaterThan(-1);
    const around = fullPackRun.slice(Math.max(0, at - 1200), at + 600);
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
    const raiseMatch = modals.match(/const aiBackendOverlayZ = launchPadActive \? (\d+) : \(props\.showStemLab \? (\d+) : undefined\);/);
    expect(raiseMatch, 'AIBackendModal must carry the showStemLab z raise').toBeTruthy();
    expect(Number(raiseMatch[2])).toBeGreaterThan(labZ);
    expect(Number(raiseMatch[1])).toBeGreaterThan(2147483001);
    // And the host must actually supply the prop at the mount.
    const mount = anti.match(/AlloModules\.AIBackendModal,\s*\{[\s\S]{0,600}?\}\)/);
    expect(mount, 'AIBackendModal mount must be findable').toBeTruthy();
    expect(mount[0]).toContain('showStemLab');
  });
});
