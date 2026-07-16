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
const modulesDir = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
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

async function audit(fragment) {
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PD accessibility audit</title></head>'
    + '<body><main><h1>Professional development activity</h1>' + fragment + '</main></body></html>';
  const dom = new JSDOM(page, { runScripts: 'outside-only' });
  dom.window.eval(axe.source);
  return dom.window.axe.run(dom.window.document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
    },
  });
}

function violations(results) {
  return results.violations.map((violation) =>
    violation.id + ': ' + violation.nodes.slice(0, 3).map((node) => node.html).join(' | ')
  ).join('\n');
}

const noop = () => {};
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
    'quiz, unanswered': render(CC.QuizActivity, { activity: activities.quiz, raw: {}, onRaw: noop }),
    'quiz, submitted with feedback': render(CC.QuizActivity, { activity: activities.quiz, raw: { answers: [0], submitted: true }, onRaw: noop }),
    'reflection': render(CC.ReflectActivity, { activity: activities.reflect, raw: { text: '' }, onRaw: noop }),
    'video alternative': render(CC.VideoActivity, { activity: activities.video, raw: {}, onRaw: noop }),
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
});

describe('approved PD catalog ? immutable accessibility-ready bindings', () => {
  const CC = loadCatalog();

  for (const entry of approvedManifest.entries) {
    it(entry.slug + ': manifest digest matches a valid, readiness-complete module', () => {
      const modulePath = resolve(process.cwd(), entry.path.replace(/\//g, resolve('/').includes('\\') ? '\\' : '/'));
      const module = JSON.parse(readFileSync(modulePath, 'utf8'));
      expect(PdCore.validatePdModule(module).ok).toBe(true);
      expect(module.metadata.version).toBe(entry.version);
      expect(module.metadata.language).toBe(entry.language);
      expect(PdCore.moduleContentDigest(module)).toBe(entry.contentDigest);
      expect(CC._verifyPdManifestEntryDigest(PdCore, entry, module)).toMatchObject({ ok: true, verified: true });
      expect(PdCore.auditAccessibilityReadiness(module)).toMatchObject({
        status: 'ready-for-render-audit',
        conformanceClaim: false,
      });
    });
  }
});
