import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, DOM, AC, View, root, host, pipeline;
const raw = () => ({
  title: 'A school garden budget',
  instructions: 'Prepare a recommendation for the meeting.',
  sourceExcerpt: 'PRIVATE_SOURCE',
  brief: {
    context: 'The school is comparing two garden designs.',
    role: 'Student budget adviser',
    audience: 'School trustees who will vote on the budget',
    drivingQuestion: 'Which plan should the school fund?',
    lockedLessonFacts: ['Plants need water.'],
    factVerified: true,
    factLocked: true,
    deliverable: 'A reasoned recommendation.'
  },
  workspace: { response: 'PRIVATE_LEARNER_RESPONSE' },
  feedback: { strength: 'PRIVATE_AI_FEEDBACK' }
});
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const resource = data => ({ id: 'role-audience-print', type: 'applied-challenge', data: AC.normalize(data || raw()) });

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  DOM = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = require('@babel/core').transformSync(readFileSync('applied_challenge_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
  }).code;
  AC = new Function('React', compiled + '\nreturn { View: AppliedChallengeView, normalize: normalizeAppliedChallengeData, renderPreset: renderAppliedChallengePreset, exportModel: appliedChallengeExportModel };')(React);
  View = AC.View;
  window.AlloModules.AppliedChallenge = AC;
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast() {}, t: key => key, isRtlLang: () => false, updateExportPreview() {}, getDefaultTitle: () => 'Document', state: {} });
}, 60000);

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove();
  root = host = null;
  sessionStorage.clear();
});

describe('Applied task print role and audience', () => {
  it.each(['task', 'paper', 'teacher'])('retains clearly labeled task requirements in the %s preset', preset => {
    const item = resource(), doc = parse(AC.renderPreset(item.data, preset));
    const brief = [...doc.querySelectorAll('section')].find(node => node.querySelector('h2')?.textContent === 'Challenge brief');
    expect(brief?.textContent).toContain('Student role');
    expect(brief?.textContent).toContain(item.data.brief.role);
    expect(brief?.textContent).toContain('Audience');
    expect(brief?.textContent).toContain(item.data.brief.audience);
    expect([...brief.querySelectorAll('strong')].map(node => node.textContent)).toEqual(expect.arrayContaining(['Student role', 'Audience']));
  });

  it.each(['task', 'paper', 'teacher'])('carries the %s print button handoff through the document pipeline', async preset => {
    const item = resource(), copies = [];
    host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host);
    await React.act(async () => root.render(React.createElement(View, { generatedContent: item, isTeacherMode: preset === 'teacher', activeProfileId: 'print-role-learner', allowRuntimeAi: false, handleNoteUpdate() {}, addToast() {}, onPrint: copy => { copies.push(copy); return true; } })));
    const selector = [...host.querySelectorAll('select')].find(node => [...node.options].some(option => option.value === 'paper'));
    await React.act(async () => { selector.value = preset; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    await React.act(async () => [...host.querySelectorAll('button')].find(node => node.textContent === 'Open print / PDF preview').click());
    expect(copies).toHaveLength(1);
    expect(copies[0].data.appliedChallengeExportPreset).toBe(preset);
    const html = pipeline.generateFullPackHTML(copies, item.data.title, true, {}, { includeTeacherKey: false, annotations: [] });
    const doc = parse(html);
    expect(doc.querySelector('[data-applied-preset]')?.getAttribute('data-applied-preset')).toBe(preset);
    expect(doc.body.textContent).toContain(item.data.brief.role);
    expect(doc.body.textContent).toContain(item.data.brief.audience);
    expect(doc.querySelector('script,input,textarea')).toBeNull();
    expect(html).not.toContain('PRIVATE_SOURCE');
    if (preset !== 'teacher') expect(html).not.toMatch(/PRIVATE_LEARNER_RESPONSE|PRIVATE_AI_FEEDBACK/);
  });

  it('escapes role and audience content and translates their existing labels', () => {
    const data = raw();
    data.brief.role = 'Adviser <script>alert(1)</script> & planner';
    data.brief.audience = '<img src=x onerror=alert(1)> trustees';
    const t = key => ({ 'applied_challenge.brief.role': 'Rol del estudiante', 'applied_challenge.brief.audience': 'Público' }[key] || key);
    const doc = parse(AC.renderPreset(data, 'task', t));
    expect(doc.querySelector('script,img')).toBeNull();
    expect(doc.body.textContent).toContain(data.brief.role);
    expect(doc.body.textContent).toContain(data.brief.audience);
    expect([...doc.querySelectorAll('strong')].map(node => node.textContent)).toEqual(expect.arrayContaining(['Rol del estudiante', 'Público']));
  });

  it.each(['task', 'paper', 'teacher'])('omits empty requirement labels in the %s preset', preset => {
    const data = raw(); data.brief.role = ''; data.brief.audience = '';
    const doc = parse(AC.renderPreset(data, preset));
    const labels = [...doc.querySelectorAll('strong')].map(node => node.textContent);
    expect(labels).not.toContain('Student role');
    expect(labels).not.toContain('Audience');
  });

  it('keeps the personal response preset focused on saved learner work', () => {
    const item = resource(), doc = parse(AC.renderPreset(item.data, 'response'));
    expect(doc.body.textContent).toContain('PRIVATE_LEARNER_RESPONSE');
    expect(doc.body.textContent).not.toContain(item.data.brief.role);
    expect(doc.body.textContent).not.toContain(item.data.brief.audience);
  });
});
