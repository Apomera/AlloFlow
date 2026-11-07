// Student AI-off sweep, step 1 (host): one learner signal covers "no backend"
// as well as "policy off", AI never leaks past it, and modules get one helper
// that answers "is this AI usable" without trusting typeof on a blocked fn.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const anti = readFileSync('AlloFlowANTI.txt', 'utf8');

function liftAiUsable({ disabled = false, cap = { text: true, images: true }, audio = false, studentEntry = false, caps = {} } = {}) {
  const s = anti.indexOf('function _alloAiUsable(kind, fn) {');
  expect(s).toBeGreaterThan(-1);
  const body = anti.slice(s, anti.indexOf('\n}', s) + 2);
  return new Function('env', `
    const window = { __alloStudentAiDisabled: env.disabled };
    const resolveAiCapability = () => env.cap;
    const _alloResolveGeminiAudioCapability = () => ({ available: env.audio });
    const _alloHasAnyStudentEntry = () => env.studentEntry;
    const _readAlloAiUserConfig = () => null;
    const _alloStudentAiCapabilities = () => env.caps;
    ${body}
    return _alloAiUsable;
  `)({ disabled, cap, audio, studentEntry, caps });
}

const blocked = Object.assign(async () => { throw new Error('off'); }, { _alloQrBlocked: true });
const live = async () => 'ok';

describe('_alloAiUsable', () => {
  it('treats a blocked function as unusable even though typeof says function', () => {
    expect(liftAiUsable()('text', blocked)).toBe(false);
    expect(liftAiUsable()('text', live)).toBe(true);
    expect(liftAiUsable()('text', null)).toBe(false);
  });
  it('honours the host student-disabled flag and the capability resolver', () => {
    expect(liftAiUsable({ disabled: true })('text')).toBe(false);
    expect(liftAiUsable({ cap: { text: false, images: false } })('text')).toBe(false);
    expect(liftAiUsable({ cap: { text: true, images: false } })('images')).toBe(false);
    expect(liftAiUsable({ cap: { text: true, images: false } })('vision')).toBe(true);
  });
  it('requires the validated student capability for non-text kinds on a student entry', () => {
    const usable = liftAiUsable({ studentEntry: true, caps: { text: true, vision: false, image: true, imageEdit: false } });
    expect(usable('text')).toBe(true);
    expect(usable('vision')).toBe(false);
    expect(usable('images')).toBe(true);
    expect(usable('imageEdit')).toBe(false);
  });
  it('delegates audio to the Gemini audio resolver', () => {
    expect(liftAiUsable({ audio: true })('audio')).toBe(true);
    expect(liftAiUsable({ audio: false })('audio')).toBe(false);
  });
  it('is exported for modules', () => {
    expect(anti).toContain('window.__alloAiUsable = _alloAiUsable;');
  });
});

describe('learner signal', () => {
  it('hides student AI on a learner device with no backend, not only by policy', () => {
    expect(anti).toContain('const learnerHasNoAiBackend = !isTeacherMode && !resolveAiCapability().text;');
    const at = anti.indexOf('const studentAiFeaturesHidden = !isTeacherMode && (');
    expect(anti.slice(at, at + 260)).toContain('|| learnerHasNoAiBackend');
  });
  it('re-derives capability when the student AI config changes', () => {
    expect(anti).toContain('window.addEventListener(ALLO_STUDENT_AI_CONFIG_EVENT, refresh);');
    expect(anti).toContain('window.removeEventListener(ALLO_STUDENT_AI_CONFIG_EVENT, refresh);');
  });
});

describe('exposures closed', () => {
  const callbackBody = (name) => {
    const at = anti.indexOf(`const ${name} = useCallback(() => {`);
    expect(at, name).toBeGreaterThan(-1);
    return anti.slice(at, anti.indexOf('\n  }, [', at));
  };
  it('AlloBot mic and Read more send students to the Socratic route, never the teacher UDL Guide', () => {
    for (const name of ['handleBotMicClick', 'handleReadMore']) {
      const body = callbackBody(name);
      expect(body.indexOf('if (!isTeacherMode) { setShowSocraticChat(true); return; }'), name)
        .toBeLessThan(body.indexOf('setShowUDLGuide(true)'));
      expect(body.indexOf('if (!isTeacherMode)'), name).toBeGreaterThan(-1);
    }
    expect(anti).toContain('{(showUDLGuide && isTeacherMode) && window.AlloModules && window.AlloModules.UDLGuideModal');
  });
  it('Research Hub, AlloHaven and Test Prep do not get ungated AI clients', () => {
    expect(anti).toContain('ai: studentAiFeaturesHidden ? null : ai,\n                onCallGemini: studentAiFeaturesHidden ? null : callGemini,');
    expect(anti.split('callGeminiAudio: (studentAiFeaturesHidden ? null : callGeminiAudio)').length - 1).toBe(2);
  });
  it('SEL image and vision AI follow the same student policy as SEL text AI', () => {
    const gate = '!studentAiFeaturesHidden && (isTeacherMode || studentProjectSettings.allowSocraticTutor)';
    expect(anti).toContain(`callGemini: ${gate} ? callGemini : null`);
    expect(anti).toContain(`callImagen: ${gate} ? callImagen : null`);
    expect(anti).toContain(`callGeminiVision: ${gate} ? callGeminiVision : null`);
  });
  it('resource views that used to get raw AI functions are gated', () => {
    expect(anti).toContain('handleAiRefineSource, handleFormatText, handleAnalysisTextChange,\n                    callGemini: studentAiFeaturesHidden ? null : callGemini,');
    expect(anti).toContain('handleUpdateQuestionRoutingRules,\n                    callGemini: studentAiFeaturesHidden ? null : callGemini, callTTS,');
    expect(anti).toContain('callGemini: studentAiFeaturesHidden ? null : callGemini, addToast, VisualPanelGrid,');
    expect(anti).toContain("organizerLearnerWork: isTeacherMode ? null : (studentResponses[generatedContent?.id]?.organizerWork || null),\n        callImagen: studentAiFeaturesHidden ? null : callImagen,");
  });
  it('Fluency recording cannot send student audio when student AI is off', () => {
    const reader = readFileSync('view_simplified_source.jsx', 'utf8');
    // Wave 2: the entry stays, relabelled to the no-audio partner check.
    expect(reader).toContain("{studentAiFeaturesHidden ? readerText('simplified.partner_check', 'Partner check') : readerText('simplified.record_my_reading', 'Record my reading')}");
    const phaseK = readFileSync('phase_k_helpers_source.jsx', 'utf8');
    expect(phaseK).toContain("if ((fluencyStatus === 'idle' || fluencyStatus === 'complete') && (window.__alloStudentAiDisabled === true || window.__alloFluencyPartnerActive === true)) return;");
    const fluency = readFileSync('fluency_module.js', 'utf8');
    const at = fluency.indexOf('async function analyzeFluencyWithGemini(');
    // Wave 2 GAPS: the gate also applies host audio policy (audio not approved for students).
    // Wave 3 AUDIO-HOST: new hosts route through callGeminiAudio; the raw-fetch gate is the old-host fallback.
    expect(fluency.slice(at, at + 300)).toContain("if (hostAudio ? !_aiUsable('audio', hostAudio) : !_fluencyCloudAllowed()) return null;");
    const gate = fluency.indexOf('function _fluencyCloudAllowed(');
    expect(fluency.slice(gate, gate + 300)).toContain("window.__alloStudentAiDisabled === true) return false;");
  });
});
