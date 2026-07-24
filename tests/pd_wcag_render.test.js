// Professional-development learner surfaces — automated WCAG 2.2 A/AA smoke audit.
//
// This is intentionally one layer of the verification workflow, not a claim of
// conformance. jsdom cannot evaluate layout, visual contrast, focus visibility,
// captions, or assistive-technology behavior; those remain manual/realtime gates.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
const PublishPipeline = require(resolve(process.cwd(), 'dev-tools/lib/pd_publish_pipeline.cjs'));
const stateInventory = PublishPipeline.PD_STATE_INVENTORY;
const coreSource = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');
const PdCore = require(resolve(process.cwd(), 'pd_core_module.js'));
const approvedManifest = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/index.json'), 'utf8'));
const catalogSource = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');

function loadCatalog() {
  const win = {
    React,
    AlloModules: {},
    __alloPdIntent: false,
    crypto: globalThis.crypto,
  };
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', coreSource)(win, { exports: {} });
  // eslint-disable-next-line no-new-func
  new Function('window', catalogSource)(win);
  return win.AlloModules.CommunityCatalog;
}

function render(Component, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Component, props));
}

async function audit(fragment, language = 'en') {
  const page = '<!doctype html><html lang="' + language + '"><head><meta charset="utf-8"><title>PD accessibility audit</title></head>'
    + '<body><main><h1>Professional development activity</h1>' + fragment + '</main></body></html>';
  const dom = new JSDOM(page, { runScripts: 'outside-only' });
  dom.window.eval(axe.source);
  return dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
    },
  });
}

function violations(results) {
  return results.violations.map((violation) =>
    violation.id + ': ' + violation.nodes.slice(0, 3).map((node) => node.html).join(' | ')
  ).join('\n');
}

const noop = () => {};
const CATALOG_RENDER_AUDIT_TIMEOUT_MS = 15_000;
const activities = {
  read: {
    id: 'read-1', type: 'read', title: 'Read', gate: { kind: 'none' },
    content: { body: 'A short accessible reading.', keyPoints: ['First point'], links: [{ label: 'Supporting source', url: 'https://example.org/source' }] },
  },
  quiz: {
    id: 'quiz-1', type: 'quiz', title: 'Quiz', gate: { kind: 'score', threshold: 0.5 },
    content: { questions: [{ prompt: 'Which option is correct?', options: ['First', 'Second'], correctIndex: 0, explanation: 'The first option is correct.' }] },
  },
  reflect: {
    id: 'reflect-1', type: 'reflect', title: 'Reflect', gate: { kind: 'none' },
    content: { prompt: 'How will you apply this practice?' },
  },
  video: {
    id: 'video-1', type: 'video', title: 'Video', gate: { kind: 'none' },
    content: { url: 'https://example.org/video', body: 'Captions and a transcript are available at the linked destination.', transcript: 'Transcript text.' },
  },
  checklist: {
    id: 'check-1', type: 'checklist', title: 'Checklist', gate: { kind: 'none' },
    content: { items: ['Use a clear heading', 'Check keyboard access'] },
  },
  sim: {
    id: 'sim-1', type: 'sim', title: 'Scenario', gate: { kind: 'none' },
    content: { scenario: 'Describe how you would respond.', rubric: 'Use specific, evidence-based reasoning.' },
  },
};

function approvedActivityStates(activity) {
  if (activity.type === 'read') return [
    { name: 'initial', raw: {} },
    { name: 'acknowledged', raw: { acknowledged: true } },
  ];
  if (activity.type === 'quiz') {
    const questions = activity.content.questions;
    return [
      { name: 'unanswered', raw: {} },
      { name: 'partial', raw: { submitted: false, answers: questions.length ? [questions[0].correctIndex] : [] } },
      { name: 'submitted-pass', raw: { submitted: true, answers: questions.map((question) => question.correctIndex) } },
      { name: 'submitted-fail', raw: { submitted: true, answers: questions.map((question) => (question.correctIndex + 1) % question.options.length) } },
    ];
  }
  if (activity.type === 'reflect') return [
    { name: 'empty', raw: { text: '' } },
    { name: 'completed', raw: { text: 'A representative response.' } },
  ];
  if (activity.type === 'video') return [
    { name: 'initial', raw: {} },
    { name: 'watched', raw: { watched: true } },
  ];
  if (activity.type === 'checklist') return [
    { name: 'empty', raw: { checked: activity.content.items.map(() => false) } },
    { name: 'completed', raw: { checked: activity.content.items.map(() => true) } },
  ];
  if (activity.type === 'sim') return [
    { name: 'idle', raw: { response: '', masteryScore: null } },
    {
      name: 'success',
      raw: {
        response: 'A representative response.', masteryScore: 82, feedback: 'Thoughtful start.',
        qualitativeAnalysis: {
          strengths: ['Uses a relevant strategy'], growthAreas: ['Add a follow-up step'],
          criterionEvidence: [{ criterion: 'Application', assessment: 'developing', evidence: 'A strategy is named.', feedback: 'Connect it to the rubric.' }],
        },
      },
    },
  ];
  return [];
}

describe('PD learner activities — axe WCAG 2.2 A/AA smoke audit', () => {
  const CC = loadCatalog();
  const monitoredModule = {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'monitored-reflection', title: 'Monitored reflection' },
    assessmentPolicy: { paste: { mode: 'monitored' } },
    sections: [{ title: 'Apply', activities: [activities.reflect] }],
  };

  const states = {
    'read, incomplete': render(CC.ReadActivity, { activity: activities.read, raw: {}, onRaw: noop }),
    'read, acknowledged': render(CC.ReadActivity, { activity: activities.read, raw: { acknowledged: true }, onRaw: noop }),
    'quiz, unanswered': render(CC.QuizActivity, { activity: activities.quiz, raw: {}, onRaw: noop }),
    'quiz, partial': render(CC.QuizActivity, { activity: activities.quiz, raw: { answers: [0], submitted: false }, onRaw: noop }),
    'quiz, submitted with feedback': render(CC.QuizActivity, { activity: activities.quiz, raw: { answers: [0], submitted: true }, onRaw: noop }),
    'reflection': render(CC.ReflectActivity, { activity: activities.reflect, raw: { text: '' }, onRaw: noop }),
    'video alternative': render(CC.VideoActivity, { activity: activities.video, raw: {}, onRaw: noop }),
    'video watched': render(CC.VideoActivity, { activity: activities.video, raw: { watched: true }, onRaw: noop }),
    'checklist': render(CC.ChecklistActivity, { activity: activities.checklist, raw: { checked: [false, false] }, onRaw: noop }),
    'scenario response': render(CC.SimActivity, { activity: activities.sim, raw: { response: '', masteryScore: null }, onRaw: noop }),
    'scenario qualitative feedback': render(CC.SimActivity, { activity: activities.sim, raw: { response: 'I would listen.', masteryScore: 82, feedback: 'Thoughtful start.', qualitativeAnalysis: { strengths: ['Centers the learner'], growthAreas: ['Add a follow-up'], criterionEvidence: [{ criterion: 'Evidence use', assessment: 'developing', evidence: 'Listening is named.', feedback: 'Connect to the rubric.' }] } }, onRaw: noop }),
    'monitored reflection disclosure': render(CC.PdRunner, { module: monitoredModule, addToast: noop, onExit: noop }),
  };

  for (const [name, html] of Object.entries(states)) {
    it(name + ': has no automatically detectable A/AA violations', async () => {
      const results = await audit(html);
      expect(violations(results)).toBe('');
      expect(results.violations).toHaveLength(0);
    });
  }

  it('executes a meaningful automated ruleset', async () => {
    const results = await audit(states['quiz, unanswered']);
    expect(results.passes.length).toBeGreaterThan(15);
  });
  it('shares the canonical activity-state inventory with the rendered audit matrix', () => {
    expect(Object.keys(activities).sort()).toEqual([...stateInventory.activityTypes].sort());
    for (const type of ['read', 'quiz', 'reflect', 'video', 'checklist']) {
      expect(approvedActivityStates(activities[type]).map((state) => state.name))
        .toEqual(stateInventory.activityStates[type]);
    }
    expect(stateInventory.activityStates.sim).toEqual(expect.arrayContaining(
      approvedActivityStates(activities.sim).map((state) => state.name)
    ));
  });

  it('applies a non-English module language to both PdRunner surface roots', async () => {
    const frenchModule = {
      schema_version: 'pd-1.0',
      kind: 'pd_module',
      metadata: { id: 'french-module', title: 'Module en fran?ais', language: 'fr-CA' },
      sections: [{ title: 'Lire', activities: [activities.read] }],
    };
    const html = render(CC.PdRunner, { module: frenchModule, addToast: noop, onExit: noop });
    expect((catalogSource.match(/lang: moduleLanguage/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('lang="fr-CA"');
    const results = await audit(html, 'fr-CA');
    expect(violations(results)).toBe('');
    expect(results.violations).toHaveLength(0);
  });
});

describe('approved PD catalog ? immutable accessibility-ready bindings', () => {
  const CC = loadCatalog();

  for (const entry of approvedManifest.entries) {
    it(entry.slug + ': manifest digest matches a valid, readiness-complete module', () => {
      const modulePath = resolve(process.cwd(), entry.path.replace(/\//g, resolve('/').includes('\\') ? '\\' : '/'));
      const module = JSON.parse(readFileSync(modulePath, 'utf8'));
      expect(PdCore.validatePdModule(module).ok).toBe(true);
      expect(module.metadata.id).toBe(entry.moduleId);
      expect(module.metadata.version).toBe(entry.version);
      expect(module.metadata.language).toBe(entry.language);
      expect(PdCore.moduleContentDigest(module)).toBe(entry.contentDigest);
      expect(CC._verifyPdManifestEntryDigest(PdCore, entry, module)).toMatchObject({ ok: true, verified: true });
      expect(PdCore.auditAccessibilityReadiness(module)).toMatchObject({
        status: 'ready-for-render-audit',
        conformanceClaim: false,
      });
    });

    it(entry.slug + ': real activity content and meaningful states pass the automated render audit', async () => {
      const modulePath = resolve(process.cwd(), entry.path.replace(/\//g, resolve('/').includes('\\') ? '\\' : '/'));
      const module = JSON.parse(readFileSync(modulePath, 'utf8'));
      const renderers = {
        read: CC.ReadActivity,
        quiz: CC.QuizActivity,
        reflect: CC.ReflectActivity,
        video: CC.VideoActivity,
        checklist: CC.ChecklistActivity,
        sim: CC.SimActivity,
      };
      for (const section of module.sections) {
        for (const activity of section.activities) {
          for (const state of approvedActivityStates(activity)) {
            const html = render(renderers[activity.type], { activity, raw: state.raw, onRaw: noop });
            const results = await audit(html);
            expect(results.violations, entry.slug + '/' + activity.id + '/' + state.name + '\n' + violations(results)).toHaveLength(0);
          }
        }
      }
    }, CATALOG_RENDER_AUDIT_TIMEOUT_MS);
  }
});
