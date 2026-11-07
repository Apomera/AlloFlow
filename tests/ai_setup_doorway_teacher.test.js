// ai_setup_doorway_teacher.test.js: the teacher "Needs AI setup" doorway (wave 2, 2026-11-04).
//
// A keyless teacher (no key, not Canvas, no local model) must never press an AI-only
// button that silently returns nothing. The host owns ONE mechanism:
//   window.__alloAiSetupDoorway(kind, t) -> { disabled, title, cta, onDoorway }
//   window.AlloAiSetupNotice               -> amber button that opens AI Backend Settings
// The doorway and notice are lifted from AlloFlowANTI.txt and exercised for real;
// the call sites are checked for wiring.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync as readRaw } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { readFileSync } from './helpers/host_source.js';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const React = require(resolve(ROOT, 'desktop/web-app/node_modules', 'react'));
const ReactDOMServer = require(resolve(ROOT, 'desktop/web-app/node_modules', 'react-dom/server'));
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const src = (name) => readRaw(resolve(ROOT, name), 'utf8');

const grabFn = (mark) => {
  const s = anti.indexOf(mark);
  expect(s, mark).toBeGreaterThan(-1);
  return anti.slice(s, anti.indexOf('\n}', s) + 2);
};

// cap: what resolveAiCapability() reports; win: the window stub.
function liftDoorway({ cap, win }) {
  const code = [
    'const ALLO_AI_CONFIG_CHANGED_EVENT = "alloflow:ai-config-changed", ALLO_STUDENT_AI_CONFIG_EVENT = "alloflow:student-ai-config-changed";',
    'const _alloHasAnyStudentEntry = () => false, _readAlloAiUserConfig = () => null, _alloStudentAiCapabilities = () => ({});',
    'const _alloResolveGeminiAudioCapability = () => ({ available: false });',
    `const resolveAiCapability = () => (${JSON.stringify(cap)});`,
    grabFn('function _alloAiUsable(kind, fn)'),
    grabFn('function _alloAiSetupDoorway(kind, t)'),
    grabFn('function AlloAiSetupNotice({ t, kind, className })'),
    'return { _alloAiUsable, _alloAiSetupDoorway, AlloAiSetupNotice };',
  ].join('\n');
  const js = transformSync(code, { plugins: ['@babel/plugin-transform-react-jsx'], parserOpts: { allowReturnOutsideFunction: true }, babelrc: false, configFile: false }).code;
  // eslint-disable-next-line no-new-func
  return new Function('React', 'useState', 'useEffect', 'window', js)(React, React.useState, React.useEffect, win);
}

const KEYLESS = { text: false, images: false, tts: 'local', reason: 'none' };
const CANVAS = { text: true, images: true, tts: 'full', reason: 'canvas' };
const echoT = (k) => k; // missing key echoes: must fall back to English

describe('host doorway helper (lifted from ANTI)', () => {
  it('keyless teacher: disabled, short English reason, doorway opens AI setup', () => {
    let opened = 0;
    const win = { __alloOpenAiSetup: () => { opened += 1; } };
    const { _alloAiSetupDoorway } = liftDoorway({ cap: KEYLESS, win });
    const d = _alloAiSetupDoorway('text', echoT);
    expect(d.disabled).toBe(true);
    expect(d.title).toBe('Needs AI setup');
    expect(d.cta).toMatch(/Gemini Canvas/);
    d.onDoorway();
    expect(opened).toBe(1);
  });

  it('uses the translated reason when the pack has one, and survives a throwing t', () => {
    const { _alloAiSetupDoorway } = liftDoorway({ cap: KEYLESS, win: {} });
    expect(_alloAiSetupDoorway('text', (k) => (k === 'sidebar.needs_ai_setup' ? 'Requiere IA' : k)).title).toBe('Requiere IA');
    expect(_alloAiSetupDoorway('text', () => { throw new Error('x'); }).title).toBe('Needs AI setup');
    expect(_alloAiSetupDoorway('text').title).toBe('Needs AI setup');
  });

  it('AI available (Canvas): enabled, no reason; images follow the images leg', () => {
    const { _alloAiSetupDoorway } = liftDoorway({ cap: CANVAS, win: {} });
    expect(_alloAiSetupDoorway('text', echoT)).toMatchObject({ disabled: false, title: '' });
    const local = liftDoorway({ cap: { text: true, images: false, tts: 'local', reason: 'local-backend' }, win: {} });
    expect(local._alloAiSetupDoorway('text').disabled).toBe(false);
    expect(local._alloAiSetupDoorway('images').disabled).toBe(true);
  });

  it('doorway never opens when the host bridge is missing (old host / not mounted)', () => {
    const { _alloAiSetupDoorway } = liftDoorway({ cap: KEYLESS, win: {} });
    expect(() => _alloAiSetupDoorway('text').onDoorway()).not.toThrow();
  });
});

describe('AlloAiSetupNotice (lifted, rendered)', () => {
  const render = (cap, win, props = {}) => {
    const { AlloAiSetupNotice } = liftDoorway({ cap, win });
    return ReactDOMServer.renderToStaticMarkup(React.createElement(AlloAiSetupNotice, { t: echoT, ...props }));
  };
  it('renders one labelled button when AI is not usable', () => {
    const html = render(KEYLESS, {});
    expect((html.match(/<button/g) || []).length).toBe(1);
    expect(html).toContain('data-ai-setup-doorway');
    expect(html).toContain('type="button"');
    expect(html).toContain('Needs AI setup');
    expect(html).toMatch(/<span aria-hidden="true">/);
  });
  it('renders nothing when AI is usable', () => {
    expect(render(CANVAS, {})).toBe('');
  });
  it('never shows a learner the setup doorway (student AI off hides, not doorways)', () => {
    expect(render(KEYLESS, { __alloStudentAiDisabled: true })).toBe('');
  });
});

describe('host wiring', () => {
  it('exports the helper and the notice for modules', () => {
    expect(anti).toContain('window.__alloAiSetupDoorway = _alloAiSetupDoorway; window.AlloAiSetupNotice = AlloAiSetupNotice;');
  });
  it('source remake and seed-path siblings are disabled without AI and show the doorway', () => {
    expect(anti).toMatch(/data-source-remake disabled=\{isProcessing \|\| !aiCapability\.text\}/);
    expect(anti).toMatch(/data-seed-sibling=\{type\} disabled=\{isProcessing \|\| !aiCapability\.text\}/);
    expect(anti).toMatch(/data-seed-sibling=\{'words-' \+ type\} disabled=\{isProcessing \|\| !aiCapability\.text\}/);
    expect((anti.match(/\{!aiCapability\.text && <AlloAiSetupNotice t=\{t\} \/>\}/g) || []).length).toBe(2);
  });
});

describe('teacher module wiring', () => {
  const quiz = src('view_quiz_source.jsx');
  it('quiz authoring: Regenerate, Rewrite-as and Write-for-me disable on the doorway', () => {
    expect(quiz).toMatch(/data-assess-regenerate disabled=\{disabled \|\| p\.regenerating \|\| aiOff\}/);
    expect(quiz).toMatch(/data-assess-convert disabled=\{structureDisabled \|\| p\.regenerating \|\| aiOff/);
    expect(quiz).toMatch(/data-assess-add-ai disabled=\{!!p\.adding \|\| aiOff\}/);
    expect((quiz.match(/handleFactCheck\(i\)\} disabled=\{isFactChecking\[i\] \|\| !!_quizAiDoor\(t\)\?\.disabled\}/g) || []).length).toBe(2);
    expect(quiz).toMatch(/onClick=\{bulkImproveDistractors\} disabled=\{isBulkImproving \|\| !!_quizAiDoor\(t\)\?\.disabled\}/);
    expect(quiz).toContain('{isTeacherMode && !isParentMode && <QuizAiSetupNotice t={t} />}');
  });
  it('quiz: an empty AI rewrite ("{}" from a keyless call) can no longer replace or add an item', () => {
    expect(quiz).toContain("typeof replacement.question !== 'string' || !replacement.question.trim()) throw new Error('The AI did not return a valid question.')");
    expect(quiz).toContain("typeof item.question !== 'string' || !item.question.trim()) throw new Error('The AI did not return a valid item.')");
  });
  it('Quick Start: Generate-from-scratch card and AI standard searches are disabled, with the notice', () => {
    const qs = src('quickstart_source.jsx');
    expect(qs).toMatch(/data-help-key="wizard_generate_source" disabled=\{aiOff\} title=\{aiTitle\}/);
    expect(qs).toContain('disabled={isSearching || !learningGoal.trim() || aiOff}');
    expect(qs).toContain('disabled={isFindingStandards || !aiStandardQuery.trim() || aiOff}');
    expect(qs).toContain('{AiNotice && <div className="sm:col-span-2"><AiNotice t={t} /></div>}');
  });
  it('UDL Guide keeps the chat open (local commands) but disables AI-only actions and shows the doorway', () => {
    const modals = src('view_misc_modals_source.jsx');
    expect(modals).toContain('{AiNotice && <div className="mb-2"><AiNotice t={t} /></div>}');
    expect(modals).toContain('disabled={isFindingStandards || !aiStandardQuery.trim() || aiOff}');
    expect(modals).toContain('data-help-key="chat_consult_btn" disabled={aiOff}');
    expect(modals).toContain('disabled={!udlInput.trim() || isChatProcessing}');
  });
  it('teacher dashboard: AI Class Insights and AI feedback sheets disable on the doorway', () => {
    const teacher = src('teacher_source.jsx');
    expect(teacher).toContain('disabled={insightsLoading || agg.studentsWithNotebook < 2 || !!_teacherAiDoor(t)?.disabled}');
    expect(teacher).toContain('disabled={filteredNotebookCount === 0 || !!_teacherAiDoor(t)?.disabled}');
    expect(teacher).toContain('<TeacherAiSetupNotice t={t} className="mb-3" />');
  });
  it('built modules carry the same gates (no stale module)', () => {
    expect(src('view_quiz_module.js')).toContain('_quizAiDoor');
    expect(src('quickstart_module.js')).toContain('__alloAiSetupDoorway');
    expect(src('view_misc_modals_module.js')).toContain('__alloAiSetupDoorway');
    expect(src('teacher_module.js')).toContain('_teacherAiDoor');
  });
});

describe('wave 3: remaining teacher surfaces', () => {
  it('quiz: an empty "Explain to class" reply is an error, not a blank explainer', () => {
    const quiz = src('view_quiz_source.jsx');
    expect(quiz).toContain("if (!txt) throw new Error('The AI did not return an explainer.');");
    expect(quiz).toMatch(/openExplainer\(card\.questionIdx, card\.conceptText\);\n\s*\}\} disabled=\{!!_quizAiDoor\(t\)\?\.disabled\}/);
  });
  it('quiz: a null image refine is a failure (no success toast, instruction kept)', () => {
    const quiz = src('view_quiz_source.jsx');
    const at = quiz.indexOf('var refinedUrl = await callGeminiImageEdit(prompt, rawBase64);');
    expect(at).toBeGreaterThan(-1);
    const after = quiz.slice(at, quiz.indexOf("addToast(t('toasts.image_refined'), 'success')", at));
    expect(after).toContain("if (!refinedUrl) throw new Error(");
    expect(after.indexOf('if (!refinedUrl) throw')).toBeLessThan(after.indexOf('handleQuizImageRefine(qIdx'));
    expect(quiz).toContain("disabled={isLoading || !!_quizAiDoor(t, 'imageEdit')?.disabled}");
  });
  it('glossary: generate image, refine and word roots disable on the doorway', () => {
    const controls = src('glossary_image_controls_source.jsx');
    expect(controls).toContain("const aiDoor = glossaryAiDoor('images', t);");
    expect(controls).toContain('disabled={working || !onGenerate || !!aiDoor?.disabled}');
    const view = src('view_glossary_source.jsx');
    expect((view.match(/disabled=\{\(isGeneratingEtymology\[entryKey\] \|\| isGeneratingEtymology\[idx\]\) \|\| !!glossaryTextDoor\?\.disabled\}/g) || []).length).toBe(3);
    expect(view).toContain('isGeneratingTermImage[idx]) || !!glossaryEditDoor?.disabled}');
    expect(view).toContain('data-glossary-ai-setup');
    expect(src('view_glossary_module.js')).toContain('glossaryEditDoor');
  });
  it('image view: refine disabled (button and Enter) with the notice', () => {
    const view = src('view_image_source.jsx');
    expect(view).toContain("var imageEditDoor = _imageViewAiDoor('imageEdit', t);");
    expect(view).toContain('disabled={!imageRefinementInput.trim() || isProcessing || !!imageEditDoor?.disabled}');
    expect(view).toContain('!isProcessing && !imageEditDoor?.disabled && String(imageRefinementInput');
    expect(src('view_image_module.js')).toContain('imageEditDoor');
  });
  it('analysis: refine, grammar fix (unless built-in AI) and factual fix disable', () => {
    const view = src('view_analysis_source.jsx');
    expect(view).toContain('disabled={isProcessing || openSelectedCount === 0 || analysisAiOff}');
    expect(view).toContain('disabled={isProcessing || selectedGrammarErrors.size === 0 || (analysisAiOff && !window.ai?.languageModel)}');
    expect(view).toContain('disabled={!sourceRefineInstruction.trim() || isProcessing || analysisAiOff}');
  });
  it('connected escape room: Generate, repair and playability check are off for everyone without AI', () => {
    const room = src('connected_escape_room_source.jsx');
    expect(room).toContain("const aiOff = !_aiUsable('text', callGemini), learnerNoAi = learnerMode && aiOff;");
    expect(room).toContain('if (stage || libraryChoice || aiOff) return;');
    expect(room).toContain('if (stage || !room || aiOff) return;');
    expect(room).toContain('disabled={!!stage || !!libraryChoice || aiOff} title={aiDoor?.title || undefined} onClick={checkPlayability}');
    expect(room).toContain('source.trim().length < 40 || aiOff} title={aiDoor?.title || undefined} onClick={generate}');
    expect(src('connected_escape_room_module.js')).toContain('__alloAiSetupDoorway');
  });
  it('teacher dashboard: roster batch generate and the boss image follow the doorway', () => {
    const teacher = src('teacher_source.jsx');
    expect(teacher).toContain("Object.keys(rosterKey?.groups || {}).length === 0 || !!_teacherAiDoor(t)?.disabled}");
    expect(teacher).toContain('onClick={handleRunBatchGenerate} disabled={!!_teacherAiDoor(t)?.disabled}');
    expect(teacher).toContain("typeof onGenerateImage !== 'function' || _teacherAiDoor(t, 'images')?.disabled) return;");
  });
  it('Story Forge asks the host whether text AI is usable (keyless teacher included)', () => {
    const sf = src('story_forge_source.jsx');
    expect(sf).toContain("return !!onCallGemini && !!window.__alloAiUsable('text', onCallGemini);");
    expect(src('story_forge_module.js')).toContain('window.__alloAiUsable("text", onCallGemini)');
  });
  it('UDL chat error reply carries the doorway and its retry is disabled without AI', () => {
    const modals = src('view_misc_modals_source.jsx');
    expect(modals).toContain('{AiNotice && <div data-chat-error-ai-setup className="mt-2"><AiNotice t={t} /></div>}');
    expect(modals).toContain('disabled={isChatProcessing || aiOff} title={aiTitle}');
  });
  it('Report Writer and Cinematic Studio get no text AI fn when AI is not usable', () => {
    const rw = anti.slice(anti.indexOf('moduleKey="ReportWriter"'), anti.indexOf('</CDNModuleGate>', anti.indexOf('moduleKey="ReportWriter"')));
    expect(rw).toContain('callGemini: aiCapability.text ? callGemini : null,');
    const cs = anti.slice(anti.indexOf('moduleKey="CinematicStudio"'), anti.indexOf('</CDNModuleGate>', anti.indexOf('moduleKey="CinematicStudio"')));
    expect(cs).toContain('callGemini: (studentAiFeaturesHidden || !aiCapability.text ? null : callGemini),');
  });
});
