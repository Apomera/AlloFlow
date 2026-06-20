// PD core logic — unit tests.
//
// Pins the genuinely-new logic behind community PD modules: the pd_module
// validator, the normalized per-activity result contract, the gate evaluator,
// and the (honestly-labelled) completion-record builder. Also validates the
// shipped seed module + manifest so a malformed seed can never reach the app.
//
// pd_core_module.js is a browser IIFE that registers on window.AlloModules.PdCore
// (and module.exports). We load it the proven render-smoke way — read the
// source, eval with a stubbed window — so this works regardless of ESM/CJS.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function loadPdCore() {
  const src = fs.readFileSync(path.join(ROOT, 'pd_core_module.js'), 'utf8');
  const win = {};
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', src)(win, mod);
  return win.AlloModules.PdCore;
}

const PD = loadPdCore();

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// A minimal valid module fixture for the logic tests.
function fixtureModule() {
  return {
    schema_version: 'pd-1.0',
    kind: 'pd_module',
    metadata: { id: 'fix', title: 'Fixture', topic: 'Test' },
    sections: [
      { title: 'S1', activities: [
        { id: 'r1', type: 'read', title: 'Read', content: { body: 'hi' }, gate: { kind: 'none' } },
        { id: 'q1', type: 'quiz', title: 'Quiz', gate: { kind: 'score', threshold: 0.75 }, content: { questions: [
          { prompt: 'a', options: ['x', 'y'], correctIndex: 0 },
          { prompt: 'b', options: ['x', 'y'], correctIndex: 1 },
          { prompt: 'c', options: ['x', 'y'], correctIndex: 0 },
          { prompt: 'd', options: ['x', 'y'], correctIndex: 1 }
        ] } },
        { id: 'f1', type: 'reflect', title: 'Reflect', content: { prompt: 'why?' }, gate: { kind: 'none' } }
      ] }
    ]
  };
}

describe('validatePdModule', () => {
  it('accepts a well-formed module', () => {
    const v = PD.validatePdModule(fixtureModule());
    expect(v.ok).toBe(true);
    expect(v.stats).toEqual({ sections: 1, activities: 3, gated: 1 });
  });

  it('accepts a JSON string too', () => {
    expect(PD.validatePdModule(JSON.stringify(fixtureModule())).ok).toBe(true);
  });

  it('rejects wrong kind', () => {
    const m = fixtureModule(); m.kind = 'lesson';
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('rejects a quiz with no answer key (uncompletable)', () => {
    const m = fixtureModule();
    delete m.sections[0].activities[1].content.questions[0].correctIndex;
    const v = PD.validatePdModule(m);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/correctIndex/);
  });

  it('rejects a score gate on a non-scorable (read) activity', () => {
    const m = fixtureModule();
    m.sections[0].activities[0].gate = { kind: 'score', threshold: 0.8 };
    const v = PD.validatePdModule(m);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/produces no score/);
  });

  it('rejects a score gate with an out-of-range threshold', () => {
    const m = fixtureModule();
    m.sections[0].activities[1].gate.threshold = 1.5;
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('rejects duplicate activity ids', () => {
    const m = fixtureModule();
    m.sections[0].activities[2].id = 'r1';
    expect(PD.validatePdModule(m).ok).toBe(false);
  });
});

describe('normalizeResult', () => {
  const m = fixtureModule();
  const readAct = m.sections[0].activities[0];
  const quizAct = m.sections[0].activities[1];
  const reflectAct = m.sections[0].activities[2];

  it('read is complete only when acknowledged', () => {
    expect(PD.normalizeResult(readAct, {}).completed).toBe(false);
    expect(PD.normalizeResult(readAct, { acknowledged: true }).completed).toBe(true);
  });

  it('quiz scores fraction correct and needs all answered to complete', () => {
    const all = PD.normalizeResult(quizAct, { answers: [0, 1, 0, 1] });
    expect(all.score).toBe(1);
    expect(all.completed).toBe(true);
    const half = PD.normalizeResult(quizAct, { answers: [0, 0, 0, 1] });
    expect(half.score).toBe(0.75);
    const partial = PD.normalizeResult(quizAct, { answers: [0, 1] });
    expect(partial.completed).toBe(false);
  });

  it('reflect is complete only with non-empty text', () => {
    expect(PD.normalizeResult(reflectAct, { text: '   ' }).completed).toBe(false);
    expect(PD.normalizeResult(reflectAct, { text: 'I will add a diagram.' }).completed).toBe(true);
  });
});

describe('evaluateGate', () => {
  const m = fixtureModule();
  const quizAct = m.sections[0].activities[1];
  const readAct = m.sections[0].activities[0];

  it('incomplete never passes', () => {
    expect(PD.evaluateGate(quizAct, { completed: false, score: 1 }).passed).toBe(false);
  });

  it('none-gate passes when completed', () => {
    expect(PD.evaluateGate(readAct, { completed: true, score: null }).passed).toBe(true);
  });

  it('score gate passes at/above threshold, fails below', () => {
    expect(PD.evaluateGate(quizAct, { completed: true, score: 0.75 }).passed).toBe(true);
    expect(PD.evaluateGate(quizAct, { completed: true, score: 0.5 }).passed).toBe(false);
  });

  it('score gate with no score fails', () => {
    expect(PD.evaluateGate(quizAct, { completed: true, score: null }).passed).toBe(false);
  });
});

describe('evaluateModule + buildCompletionRecord', () => {
  const m = fixtureModule();

  function results(quizScore, reflectDone, readDone) {
    return {
      r1: { completed: readDone, score: null },
      q1: { completed: true, score: quizScore },
      f1: { completed: reflectDone, score: null }
    };
  }

  it('is complete only when every activity passes', () => {
    const good = PD.evaluateModule(m, results(1, true, true));
    expect(good.complete).toBe(true);
    expect(good.passed).toBe(3);
    expect(good.gatedTotal).toBe(1);

    const failQuiz = PD.evaluateModule(m, results(0.5, true, true));
    expect(failQuiz.complete).toBe(false);

    const skipReflect = PD.evaluateModule(m, results(1, false, true));
    expect(skipReflect.complete).toBe(false);
  });

  it('builds an honestly-labelled, deterministic completion record', () => {
    const rec = PD.buildCompletionRecord(m, results(1, true, true), { name: 'Pat' }, '2026-06-19T00:00:00.000Z');
    expect(rec.schema_version).toBe('pd-completion-1.0');
    expect(rec.complete).toBe(true);
    expect(rec.completedAt).toBe('2026-06-19T00:00:00.000Z');
    expect(rec.issuer.kind).toBe('self-paced');
    expect(rec.issuer.verified).toBe(false);
    expect(rec.issuer.note).toMatch(/not an accredited credential/i);
    expect(rec.perActivity).toHaveLength(3);
  });
});

describe('shipped PD catalog', () => {
  it('the manifest references real files that all validate', () => {
    const manifest = readJson('catalog/pd/index.json');
    expect(manifest.kind).toBe('pd_catalog');
    expect(Array.isArray(manifest.entries)).toBe(true);
    expect(manifest.entries.length).toBeGreaterThan(0);
    for (const e of manifest.entries) {
      const v = PD.validatePdModule(readJson(e.path));
      expect(v.ok, `${e.path}: ${v.error || ''}`).toBe(true);
    }
  });

  it('the seed UDL module is gated and completable end-to-end', () => {
    const seed = readJson('catalog/pd/approved/udl-representation-quickstart.json');
    const v = PD.validatePdModule(seed);
    expect(v.ok).toBe(true);
    expect(v.stats.gated).toBe(1);

    // A learner who passes the quiz and reflects completes the module.
    const quiz = seed.sections[1].activities[0];
    const allCorrect = quiz.content.questions.map(q => q.correctIndex);
    const resultsById = {
      'read-representation': PD.normalizeResult(seed.sections[0].activities[0], { acknowledged: true }),
      'quiz-representation': PD.normalizeResult(quiz, { answers: allCorrect }),
      'reflect-representation': PD.normalizeResult(seed.sections[2].activities[0], { text: 'Add a diagram and a transcript.' })
    };
    expect(PD.evaluateModule(seed, resultsById).complete).toBe(true);
  });
});

describe('video + checklist activity types', () => {
  function videoAct() { return { id: 'v', type: 'video', title: 'Watch', content: { url: 'https://example.org/v', body: 'desc' }, gate: { kind: 'none' } }; }
  function checklistAct() { return { id: 'c', type: 'checklist', title: 'Commit', content: { items: ['Try A', 'Try B', 'Try C'] }, gate: { kind: 'none' } }; }

  function moduleWith(act) {
    return { schema_version: 'pd-1.0', kind: 'pd_module', metadata: { title: 'T' }, sections: [{ title: 'S', activities: [act] }] };
  }

  it('validates a video activity and rejects one without a url', () => {
    expect(PD.validatePdModule(moduleWith(videoAct())).ok).toBe(true);
    const bad = moduleWith(videoAct()); delete bad.sections[0].activities[0].content.url;
    const v = PD.validatePdModule(bad);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/content\.url/);
  });

  it('validates a checklist activity and rejects one without items', () => {
    expect(PD.validatePdModule(moduleWith(checklistAct())).ok).toBe(true);
    const bad = moduleWith(checklistAct()); bad.sections[0].activities[0].content.items = [];
    expect(PD.validatePdModule(bad).ok).toBe(false);
  });

  it('rejects a score gate on video/checklist (non-scorable)', () => {
    const m = moduleWith(videoAct()); m.sections[0].activities[0].gate = { kind: 'score', threshold: 0.8 };
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('video completes only when watched; gate then passes', () => {
    const a = videoAct();
    expect(PD.normalizeResult(a, {}).completed).toBe(false);
    const done = PD.normalizeResult(a, { watched: true });
    expect(done.completed).toBe(true);
    expect(PD.evaluateGate(a, done).passed).toBe(true);
  });

  it('checklist completes when at least one item is checked', () => {
    const a = checklistAct();
    expect(PD.normalizeResult(a, { checked: [false, false, false] }).completed).toBe(false);
    expect(PD.normalizeResult(a, { checked: [false, true, false] }).completed).toBe(true);
  });
});

describe('sim activity type (AI-assessed scenario)', () => {
  function simAct(gate) { return { id: 's', type: 'sim', title: 'Scenario', content: { scenario: 'A student is upset.', rubric: 'empathy' }, gate: gate || { kind: 'none' } }; }
  function moduleWith(act) { return { schema_version: 'pd-1.0', kind: 'pd_module', metadata: { title: 'T' }, sections: [{ title: 'S', activities: [act] }] }; }

  it('validates a sim with a scenario and rejects one without', () => {
    expect(PD.validatePdModule(moduleWith(simAct())).ok).toBe(true);
    const bad = moduleWith(simAct()); delete bad.sections[0].activities[0].content.scenario;
    const v = PD.validatePdModule(bad);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/scenario/);
  });

  it('rejects a score gate on sim (formative-only — never gates advancement)', () => {
    const v = PD.validatePdModule(moduleWith(simAct({ kind: 'score', threshold: 0.7 })));
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/produces no score/i);
  });

  it('normalizes masteryScore (0..100) to a 0..1 score and completes', () => {
    const r = PD.normalizeResult(simAct(), { masteryScore: 80, response: 'x' });
    expect(r.completed).toBe(true);
    expect(r.score).toBeCloseTo(0.8, 5);
  });

  it('completes on a written response when AI score is absent (offline-safe)', () => {
    expect(PD.normalizeResult(simAct(), { response: 'my answer' }).completed).toBe(true);
    expect(PD.normalizeResult(simAct(), {}).completed).toBe(false);
  });
});
