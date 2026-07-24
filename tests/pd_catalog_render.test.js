// PD catalog tab — SSR render test.
//
// Proves the Phase-2 catalog_module.js edits (the third "Professional
// Development" tab + PdHome) load and render without error, and that the
// window.__alloPdIntent deep-link flag opens the modal straight to the PD tab.
//
// catalog_module.js is a browser IIFE (window.AlloModules.CommunityCatalog). We
// load it the proven harness way — real React 18 from desktop/web-app, eval the
// source against a sandbox window, then renderToStaticMarkup. Static render
// exercises the RENDER phase only (no useEffect), so no fetch/script-injection
// happens — each tab shows its loading state, which is exactly the marker we
// assert on to prove tab routing. (Interaction-level gating is covered by
// tests/pd_core.test.js.)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const PD_CORE_SRC = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/approved/udl-representation-quickstart.json'), 'utf8'));

beforeAll(() => {
  // Minimal ambient globals the module touches at load/render time (no-ops are
  // fine; effects that would use these never run under static render).
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
  if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      key: (i) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    };
  }
});

// Fresh evaluation each call so the IIFE dedup guard re-registers; returns the
// CommunityCatalog component. `pdIntent` sets the deep-link flag before render.
// `withPdCore` also loads pd_core_module.js into the same window so PdRunner's
// window.AlloModules.PdCore lookup resolves.
function loadCommunityCatalog(pdIntent, withPdCore) {
  const win = { React: React, AlloModules: {}, __alloPdIntent: !!pdIntent };
  if (withPdCore) {
    // eslint-disable-next-line no-new-func
    new Function('window', 'module', PD_CORE_SRC)(win, { exports: {} });
  }
  // eslint-disable-next-line no-new-func
  new Function('window', SRC)(win);
  return win.AlloModules.CommunityCatalog;
}

function render(component, props) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
}

describe('CommunityCatalog PD tab', () => {
  it('registers the component and renders all three tabs', () => {
    const CC = loadCommunityCatalog(false);
    expect(typeof CC).toBe('function');
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Browse');
    expect(html).toContain('Submit');
    expect(html).toContain('Professional Development');
  });

  it('defaults to the Browse tab when no PD intent flag is set', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading catalog');     // BrowseTab loading marker
    expect(html).not.toContain('Loading PD library');
  });

  it('opens straight to the PD tab when window.__alloPdIntent is set', () => {
    const CC = loadCommunityCatalog(true);
    const html = render(CC, { isOpen: true, onClose() {}, addToast() {} });
    expect(html).toContain('Loading PD library');   // PdHome loading marker
    expect(html).toContain('self-paced completion record'); // honest PD framing
    expect(html).not.toContain('Loading catalog');
  });

  it('returns null when closed', () => {
    const CC = loadCommunityCatalog(false);
    const html = render(CC, { isOpen: false, onClose() {}, addToast() {} });
    expect(html).toBe('');
  });
});

describe('PdRunner (rendered directly with PdCore + the seed module)', () => {
  it('renders the first activity, progress, and a Next button', () => {
    const CC = loadCommunityCatalog(false, true);
    expect(typeof CC.PdRunner).toBe('function');
    const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
    expect(html).toContain(SEED.metadata.title);                 // header title
    expect(html).toContain('step 1 of 3');                       // progress (3 activities)
    expect(html).toContain('progressbar');                       // a11y progress bar
    expect(html).toContain('read this');                         // first activity is a read (acknowledge)
    expect(html).toContain('Next');
    // The read gate is unmet on first render, so the hint shows.
    expect(html).toContain('Finish this activity to continue');
  });

  it('shows a clear loading state if the PD engine is absent', () => {
    const CC = loadCommunityCatalog(false, false); // no PdCore loaded
    const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
    expect(html).toContain('Loading the PD engine');
  });
});

// ── AI authoring (generatePdModule + PdGenerate) ──
function loadWithCore() {
  const win = { React: React, AlloModules: {}, __alloPdIntent: false };
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', PD_CORE_SRC)(win, { exports: {} });
  // eslint-disable-next-line no-new-func
  new Function('window', SRC)(win);
  return { CC: win.AlloModules.CommunityCatalog, PdCore: win.AlloModules.PdCore };
}

function validModuleObj() {
  return {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'gen', version: '1.0.0', language: 'en-US', title: 'Generated', topic: 'X', summary: 's', estMinutes: 15, audience: 'educator', license: 'CC-BY-SA-4.0' },
    sections: [
      { title: 'Learn', activities: [{ id: 'read-1', type: 'read', title: 'R', content: { body: 'b', keyPoints: ['a', 'b', 'c'] }, gate: { kind: 'none' } }] },
      { title: 'Check', activities: [{ id: 'quiz-1', type: 'quiz', title: 'Q', gate: { kind: 'score', threshold: 0.75 }, content: { questions: [
        { prompt: 'p1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        { prompt: 'p2', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
      ] } }] },
      { title: 'Apply', activities: [{ id: 'reflect-1', type: 'reflect', title: 'A', content: { prompt: 'why' }, gate: { kind: 'none' } }] },
    ],
  };
}
const validJson = () => JSON.stringify(validModuleObj());
function invalidJson() {
  const o = validModuleObj();
  delete o.sections[1].activities[0].content.questions[0].correctIndex; // quiz w/o answer key
  return JSON.stringify(o);
}

describe('AI authoring — generatePdModule (mocked callGemini)', () => {
  it('extractFirstJsonObject strips ```json fences and surrounding prose', () => {
    const { CC } = loadWithCore();
    expect(CC._extractFirstJsonObject('sure:\n```json\n{"a":1}\n```\ndone')).toEqual({ a: 1 });
    expect(CC._extractFirstJsonObject('no json here')).toBeNull();
  });

  it('returns a validated module on the happy path (1 AI call)', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    const callAI = async () => { calls++; return validJson(); };
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.module.kind).toBe('pd_module');
    expect(calls).toBe(1);
  });

  it('handles fence-wrapped AI output', async () => {
    const { CC, PdCore } = loadWithCore();
    const callAI = async () => '```json\n' + validJson() + '\n```';
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
  });

  it('auto-repairs once when the first draft fails validation', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    const callAI = async () => { calls++; return calls === 1 ? invalidJson() : validJson(); };
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.repaired).toBe(true);
    expect(calls).toBe(2);
  });

  it('fails gracefully when both attempts are invalid', async () => {
    const { CC, PdCore } = loadWithCore();
    const callAI = async () => invalidJson();
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI, getCore: () => PdCore });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/correctIndex|valid|score/i);
  });

  it('rejects an empty topic before calling the AI', async () => {
    const { CC, PdCore } = loadWithCore();
    let calls = 0;
    await expect(
      CC._generatePdModule({ topic: '   ' }, { callAI: async () => { calls++; return validJson(); }, getCore: () => PdCore })
    ).rejects.toThrow(/topic/i);
    expect(calls).toBe(0);
  });

  it('the prompt enforces evidence-based, anti-neuromyth, answer-keyed output', () => {
    const { CC } = loadWithCore();
    const prompt = CC._buildPdGenPrompt({ topic: 'Learning science', numQuestions: 3 });
    expect(prompt).toMatch(/EVIDENCE-BASED/);
    expect(prompt).toMatch(/neuromyth|learning styles/i);
    expect(prompt).toMatch(/correctIndex/);
  });

  it('PdGenerate renders the form + an honest AI-review banner', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdGenerate, { addToast() {}, onBack() {}, onRun() {}, onUse() {} });
    expect(html).toContain('Create a PD module with AI');
    expect(html).toMatch(/Review and edit/);
    expect(html).toContain('AI-assisted draft');
    expect(html).toContain('Topic');
  });
});

describe('video + checklist runner views', () => {
  const vcModule = {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'vc', title: 'VC Module', topic: 'T' },
    sections: [
      { title: 'Watch', activities: [{ id: 'v1', type: 'video', title: 'Watch it', content: { url: 'https://example.org/v', body: 'a clip', captions: true, captionsUrl: 'https://example.org/captions.vtt', transcript: 'Transcript text.', transcriptUrl: 'https://example.org/transcript', accessibleAlternative: 'A text-based equivalent is available.' }, gate: { kind: 'none' } }] },
      { title: 'Commit', activities: [{ id: 'c1', type: 'checklist', title: 'Commit', content: { items: ['Try A', 'Try B'] }, gate: { kind: 'none' } }] },
    ],
  };

  it('VideoActivity renders a watch link + an acknowledge control', () => {
    const { CC } = loadWithCore();
    const html = render(CC.VideoActivity, { activity: vcModule.sections[0].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('Watch the video');
    expect(html).toContain('https://example.org/v');
    expect(html).toContain('watched this');
    expect(html).toContain('Captions are available');
    expect(html).toContain('Open captions file');
    expect(html).toContain('Read transcript');
    expect(html).toContain('Transcript text.');
    expect(html).toContain('Open transcript');
    expect(html).toContain('Accessible alternative: A text-based equivalent is available.');
  });

  it('ChecklistActivity renders each item as a checkbox', () => {
    const { CC } = loadWithCore();
    const html = render(CC.ChecklistActivity, { activity: vcModule.sections[1].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('Try A');
    expect(html).toContain('Try B');
    expect(html).toContain('commit to');
  });

  it('PdRunner renders a video-first module with progress + the video view', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdRunner, { module: vcModule, addToast() {}, onExit() {} });
    expect(html).toContain('VC Module');
    expect(html).toContain('step 1 of 2');
    expect(html).toContain('Watch the video');
  });
});

describe('sim activity (AI-assessed scenario)', () => {
  const simModule = {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 's', title: 'S Module' },
    sections: [{ title: 'Practice', activities: [{ id: 's1', type: 'sim', title: 'Try it', content: { scenario: 'A student needs help.', rubric: 'empathy' }, gate: { kind: 'none' } }] }],
  };

  it('SimActivity renders the scenario + response box + AI-feedback button', () => {
    const { CC } = loadWithCore();
    const html = render(CC.SimActivity, { activity: simModule.sections[0].activities[0], raw: {}, onRaw() {} });
    expect(html).toContain('A student needs help.');
    expect(html).toContain('Your response');
    expect(html).toMatch(/AI feedback/);
  });

  it('buildSimScorePrompt asks for a formative masteryScore + feedback JSON', () => {
    const { CC } = loadWithCore();
    const p = CC._buildSimScorePrompt({ scenario: 'SCN', rubric: 'RUB' }, 'my response');
    expect(p).toContain('SCN');
    expect(p).toContain('RUB');
    expect(p).toMatch(/masteryScore/);
    expect(p).toMatch(/feedback/);
    expect(p).toMatch(/FORMATIVE/i);
    expect(p).toMatch(/qualitativeAnalysis/);
    expect(p).toMatch(/untrusted evidence/i);
    expect(p).toMatch(/human review, not a credential decision/i);
  });

  it('renders structured qualitative evidence as formative, human-reviewable notes', () => {
    const { CC } = loadWithCore();
    const html = render(CC.SimActivity, {
      activity: simModule.sections[0].activities[0],
      raw: {
        response: 'I would listen and offer choices.',
        masteryScore: 82,
        feedback: 'A thoughtful start.',
        qualitativeAnalysis: {
          strengths: ['Centers the learner'],
          growthAreas: ['Name a concrete follow-up'],
          criterionEvidence: [{
            criterion: 'Empathy', assessment: 'developing',
            evidence: 'The response begins with listening.', feedback: 'Add a check for understanding.'
          }],
        },
      },
      onRaw() {},
    });
    expect(html).toContain('Qualitative evidence notes');
    expect(html).toContain('Centers the learner');
    expect(html).toContain('Empathy: developing');
    expect(html).toContain('Evidence: The response begins with listening.');
    expect(html).toMatch(/do not make a credential decision/i);
  });

  it('sanitizes malformed resumed qualitative data at the render boundary', () => {
    const { CC } = loadWithCore();
    const html = render(CC.SimActivity, {
      activity: simModule.sections[0].activities[0],
      raw: {
        response: 'Saved response', masteryScore: 70,
        qualitativeAnalysis: {
          strengths: [{ unexpected: true }],
          criterionEvidence: [
            null,
            { criterion: 'Empathy', assessment: 'met', evidence: 'Listened first.', feedback: 'Continue.' },
            'not-an-object',
          ],
        },
      },
      onRaw() {},
    });
    expect(html).toContain('Empathy: met');
    expect(html).toContain('Listened first.');
    expect(html).not.toContain('[object Object]');
  });

  it('binds asynchronous feedback to the submitted response and remounts per activity', () => {
    expect(SRC).toContain('var submittedResponse = response;');
    expect(SRC).toContain("disabled: status === 'scoring'");
    expect(SRC).toContain('buildSimScorePrompt(c, submittedResponse)');
    expect(SRC).toContain('response: submittedResponse, masteryScore: ms');
    expect(SRC).toContain('key: act.id');
  });

  it('PdRunner renders a sim module step', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdRunner, { module: simModule, addToast() {}, onExit() {} });
    expect(html).toContain('S Module');
    expect(html).toContain('A student needs help.');
  });
});

describe('certificate + completion history', () => {
  it('buildPdCertificateHtml renders a print-ready, honestly-labelled certificate (escaped)', () => {
    const { CC } = loadWithCore();
    const mod = { metadata: { title: 'Safe <b>Title</b>', topic: 'UDL' } };
    const html = CC._buildPdCertificateHtml(mod, { passed: 3, total: 3 }, 'Pat O\'Neil', '2026-06-20T12:00:00.000Z');
    expect(html).toContain('Certificate of Completion');
    expect(html).toContain('Safe &lt;b&gt;Title&lt;/b&gt;');         // title escaped
    expect(html).toContain('Pat O&#39;Neil');                         // name escaped
    expect(html).toContain('3 of 3 activities passed');
    expect(html).toMatch(/NOT accredited/i);
    expect(html).toContain('window.print()');
  });

  it('verifyPdCredential rejects a non-credential immediately (no network)', async () => {
    const { CC } = loadWithCore();
    expect((await CC._verifyPdCredential({ foo: 1 })).valid).toBe(false);
    expect((await CC._verifyPdCredential(null)).valid).toBe(false);
  });

  it('buildPdPathCertificateHtml lists the path modules + honest framing (escaped)', () => {
    const { CC } = loadWithCore();
    const path = { slug: 'p', title: 'My <Path>' };
    const rows = [{ title: 'Mod A', completedAt: '2026-06-20T00:00:00Z' }, { title: 'Mod B', completedAt: '2026-06-21' }];
    const html = CC._buildPdPathCertificateHtml(path, rows, 'Pat', '2026-06-22T00:00:00Z');
    expect(html).toContain('Self-paced learning path');
    expect(html).toContain('My &lt;Path&gt;');                 // title escaped
    expect(html).toContain('Mod A');
    expect(html).toContain('Mod B');
    expect(html).toMatch(/NOT accredited/i);
  });

  it('recordPdCompletion + loadPdHistory round-trip and de-dupe by moduleId', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'm1', moduleTitle: 'M1', complete: true, completedAt: '2026-06-20', passed: 2, total: 2 });
    CC._recordPdCompletion({ moduleId: 'm1', moduleTitle: 'M1 (retake)', complete: true, completedAt: '2026-06-21', passed: 2, total: 2 });
    const hist = CC._loadPdHistory();
    expect(hist.filter((h) => h.moduleId === 'm1')).toHaveLength(1); // de-duped
    expect(hist[0].moduleTitle).toBe('M1 (retake)');                  // newest kept
  });
});

describe('runner resume + home history (render)', () => {
  it('PdRunner resumes from saved progress', () => {
    const { CC, PdCore } = loadWithCore();
    const KEY = 'alloflow_pd_progress::udl-representation-quickstart';
    globalThis.localStorage.setItem(KEY, JSON.stringify({
      idx: 1, rawById: { 'read-representation': { acknowledged: true } }, done: false,
      fp: CC._pdFingerprint(SEED, PdCore), savedAt: new Date().toISOString(),
    }));
    try {
      const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
      expect(html).toContain('step 2 of 3');                 // resumed at the quiz
      expect(html).toContain('Resumed where you left off');
      expect(html).toContain('Start over');
    } finally {
      globalThis.localStorage.removeItem(KEY);
    }
  });

  it('offers only an explicit-consent local review-candidate export after completion', () => {
    const { CC, PdCore } = loadWithCore();
    const KEY = 'alloflow_pd_progress::udl-representation-quickstart';
    globalThis.localStorage.setItem(KEY, JSON.stringify({
      idx: 2,
      done: true,
      fp: CC._pdFingerprint(SEED, PdCore),
      savedAt: new Date().toISOString(),
      rawById: {
        'read-representation': { acknowledged: true },
        'quiz-representation': { answers: [1, 2, 3, 1], submitted: true },
        'reflect-representation': { text: 'I will add captions and a transcript.' },
      },
    }));
    try {
      const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
      expect(html).toContain('Prepare evidence for human review');
      expect(html).toContain('learner-device-unverified');
      expect(html).toContain('Nothing is uploaded or submitted by this action');
      expect(html).toContain('Structured identity fields and raw clipboard event/content fields are omitted');
      expect(html).toContain('may contain names, email addresses, or other personal data');
      expect(html).toContain('Optional - Include AI-assisted advisory notes');
      expect(html).toContain('Optional - Include an aggregate paste-event summary');
      expect(html).toContain('Preview review-candidate package');
      expect(SRC).toContain('var reviewAi$ = useState(false)');
      expect(SRC).toContain('disabled: !reviewConsent || !reviewNotice');
      expect(SRC).toContain('Core.buildReviewCandidatePackage(mod, resultsById()');
      expect(SRC).toContain('setReviewPreview(built.package)');
      expect(SRC).toContain('disabled: !reviewPreviewConfirmed');
      expect(SRC).toContain('Confirm and download review-candidate package (JSON)');
      expect(SRC).toContain('downloadJsonFile(reviewPreview');
      const previewStart = SRC.indexOf("reviewPreview && e('div', {");
      const previewEnd = SRC.indexOf('ev.complete && !allowSelfPacedSigning', previewStart);
      expect(SRC.slice(previewStart, previewEnd)).not.toMatch(/artifact[.]value|JSON[.]stringify[(]reviewPreview/);
      const exportStart = SRC.indexOf("ev.complete && e('section', {");
      const exportEnd = SRC.indexOf('ev.complete && !allowSelfPacedSigning', exportStart);
      expect(SRC.slice(exportStart, exportEnd)).not.toMatch(/fetch\(|issuePd/i);
    } finally {
      globalThis.localStorage.removeItem(KEY);
    }
  });

  it('purges expired and digest-mismatched drafts and never persists completed response evidence', () => {
    const { CC, PdCore } = loadWithCore();
    const KEY = 'alloflow_pd_progress::udl-representation-quickstart';
    const fp = CC._pdFingerprint(SEED, PdCore);
    CC._clearAllPdProgress();

    globalThis.localStorage.setItem(KEY, JSON.stringify({
      idx: 1, rawById: { secret: { text: 'expired' } }, done: false, fp,
      savedAt: new Date(Date.now() - CC._PD_PROGRESS_TTL_MS - 1000).toISOString(),
    }));
    expect(CC._loadPdProgress(SEED, PdCore)).toBeNull();
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();

    globalThis.localStorage.setItem(KEY, JSON.stringify({
      idx: 1, rawById: { secret: { text: 'wrong module' } }, done: false,
      fp: 'sha256:' + '0'.repeat(64), savedAt: new Date().toISOString(),
    }));
    expect(CC._loadPdProgress(SEED, PdCore)).toBeNull();
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();

    globalThis.localStorage.setItem(KEY, JSON.stringify({
      idx: 2, rawById: { secret: { text: 'screen only' } }, done: true, fp,
      savedAt: new Date().toISOString(),
    }));
    expect(CC._loadPdProgress(SEED, PdCore)).toMatchObject({ done: true });
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();
    expect(CC._loadPdProgress(SEED, PdCore)).toBeNull();
  });

  it('exposes a separate delete-all-responses control and the 30-day local retention disclosure', () => {
    const { CC } = loadWithCore();
    CC._clearAllPdProgress();
    globalThis.localStorage.setItem('alloflow_pd_progress::one', '{}');
    globalThis.localStorage.setItem('alloflow_pd_progress::two', '{}');
    globalThis.localStorage.setItem('alloflow_pd_history', '[]');
    expect(CC._clearAllPdProgress()).toBe(2);
    expect(globalThis.localStorage.getItem('alloflow_pd_progress::one')).toBeNull();
    expect(globalThis.localStorage.getItem('alloflow_pd_progress::two')).toBeNull();
    expect(globalThis.localStorage.getItem('alloflow_pd_history')).toBe('[]');

    const html = render(CC.PdRunner, { module: SEED, addToast() {}, onExit() {} });
    expect(html).toContain('stay only in this browser for up to 30 days');
    expect(html).toContain('completed response data is removed from browser storage');
    expect(SRC).toContain('Delete all saved PD responses');
    expect(SRC).toContain('In-progress responses are retained in this browser for at most 30 days');
    globalThis.localStorage.removeItem('alloflow_pd_history');
  });

  it('PdHome surfaces a "My learning" entry point when history exists', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'm9', moduleTitle: 'M9', complete: true, completedAt: '2026-06-20', passed: 1, total: 1 });
    try {
      const html = render(CC.PdHome, { addToast() {} });
      expect(html).toContain('My learning (1)');
    } finally {
      globalThis.localStorage.removeItem('alloflow_pd_history');
    }
  });
});

describe('learning paths', () => {
  it('pdPathProgress counts completed modules and detects completion', () => {
    const { CC } = loadWithCore();
    const path = { slug: 'p', moduleSlugs: ['a', 'b', 'c'] };
    const pr = CC._pdPathProgress(path, (s) => ({ a: true, c: true })[s] || false);
    expect(pr.total).toBe(3);
    expect(pr.done).toBe(2);
    expect(pr.complete).toBe(false);
    expect(CC._pdPathProgress(path, () => true).complete).toBe(true);
    expect(CC._pdPathProgress({ moduleSlugs: [] }, () => true).complete).toBe(false); // empty path is not "complete"
  });
});

describe('My learning export/import', () => {
  it('importPdHistory merges + dedups by moduleId, keeping the most recent', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'a', moduleTitle: 'A', complete: true, completedAt: '2026-06-20' });
    const res = CC._importPdHistory({ entries: [
      { moduleId: 'a', moduleTitle: 'A v2', complete: true, completedAt: '2026-06-25' }, // newer → replaces
      { moduleId: 'b', moduleTitle: 'B', complete: true, completedAt: '2026-06-21' },     // new
      { moduleId: 'c', complete: false },                                                 // ignored (not complete)
    ] });
    expect(res.ok).toBe(true);
    const hist = CC._loadPdHistory();
    expect(hist.length).toBe(2);
    expect(hist.find((h) => h.moduleId === 'a').moduleTitle).toBe('A v2');
    expect(hist.find((h) => h.moduleId === 'b')).toBeTruthy();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
  });

  it('drops imported responses, learner identity, and arbitrary private fields from stored summaries', () => {
    const { CC } = loadWithCore();
    globalThis.localStorage.removeItem('alloflow_pd_history');
    const secret = 'PRIVATE-RESPONSE-MUST-NOT-PERSIST';
    const res = CC._importPdHistory({ entries: [{
      moduleId: 'private-summary', moduleTitle: 'Private summary', topic: 'UDL',
      moduleVersion: '1.0.0', contentDigest: 'sha256:' + 'a'.repeat(64),
      completedAt: '2026-06-25', passed: 2, total: 2, complete: true,
      responses: { reflection: secret }, learner: { name: 'Private Person', email: 'private@example.test' },
      arbitraryPrivateField: secret,
    }] });
    expect(res.ok).toBe(true);
    const entry = CC._loadPdHistory()[0];
    expect(Object.keys(entry).sort()).toEqual([
      'complete', 'completedAt', 'contentDigest', 'historyOrigin', 'moduleId', 'moduleTitle',
      'moduleVersion', 'passed', 'topic', 'total', 'trust', 'verificationStatus', 'verified',
    ].sort());
    expect(entry).not.toHaveProperty('responses');
    expect(entry).not.toHaveProperty('learner');
    expect(entry).not.toHaveProperty('arbitraryPrivateField');
    const stored = globalThis.localStorage.getItem('alloflow_pd_history');
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain('private@example.test');
    globalThis.localStorage.removeItem('alloflow_pd_history');
  });

  it('rejects a file that is not a PD history export', () => {
    const { CC } = loadWithCore();
    expect(CC._importPdHistory({ foo: 1 }).ok).toBe(false);
  });
});

describe('quiz formative feedback', () => {
  const quizAct = {
    id: 'q', type: 'quiz', title: 'Q', gate: { kind: 'score', threshold: 0.5 },
    content: { questions: [{ prompt: 'Capital of France?', options: ['Lyon', 'Paris', 'Nice'], correctIndex: 1, explanation: 'Paris is the capital.' }] },
  };

  it('marks correct/incorrect and shows the explanation after submit', () => {
    const { CC } = loadWithCore();
    const html = render(CC.QuizActivity, { activity: quizAct, raw: { answers: [0], submitted: true }, onRaw() {} });
    expect(html).toContain('✓');                              // correct option marked
    expect(html).toContain('✗');                              // wrong pick marked
    expect(html).toContain('Why: Paris is the capital.');     // per-question explanation
  });

  it('does not reveal the answer key before submit', () => {
    const { CC } = loadWithCore();
    const html = render(CC.QuizActivity, { activity: quizAct, raw: {}, onRaw() {} });
    expect(html).not.toContain('✓');
    expect(html).not.toContain('Why:');
  });

  it('keeps Submit disabled when answers are sparse (out-of-order answering)', () => {
    const { CC } = loadWithCore();
    const q3 = { id: 'q', type: 'quiz', title: 'Q', gate: { kind: 'score', threshold: 0.5 }, content: { questions: [
      { prompt: 'a', options: ['x', 'y'], correctIndex: 0 }, { prompt: 'b', options: ['x', 'y'], correctIndex: 0 }, { prompt: 'c', options: ['x', 'y'], correctIndex: 0 },
    ] } };
    const sparse = []; sparse[2] = 0; // only the LAST question answered → array has holes
    // Match the real disabled="" ATTRIBUTE (not the Tailwind "disabled:" class variant).
    const partial = render(CC.QuizActivity, { activity: q3, raw: { answers: sparse, submitted: false }, onRaw() {} });
    expect(partial).toMatch(/disabled=""[^>]*>Submit answers<\/button>/);
    const all = render(CC.QuizActivity, { activity: q3, raw: { answers: [0, 0, 0], submitted: false }, onRaw() {} });
    expect(all).not.toMatch(/disabled=""[^>]*>Submit answers<\/button>/); // enabled
  });
});

describe('review fixes (PdSubmit, JSON extraction, AI provenance)', () => {
  it('PdSubmit renders the private-review framing and validates pasted JSON', () => {
    const { CC } = loadWithCore();
    const html = render(CC.PdSubmit, { addToast() {}, initialJson: validJson() });
    expect(html).toMatch(/privately/i);
    expect(html).toContain('Scan for PII');
    expect(html).toContain('Schema check: OK');
    expect(html).toMatch(/ready for a rendered WCAG 2\.2 AA audit/i);
    expect(html).toContain('Submit for review');
  });

  it('surfaces and gates accessibility-authoring issues before submission', () => {
    const { CC } = loadWithCore();
    const draft = validModuleObj();
    delete draft.metadata.language;
    const html = render(CC.PdSubmit, { addToast() {}, initialJson: JSON.stringify(draft) });
    expect(html).toMatch(/Accessibility preflight needs attention/i);
    expect(html).toMatch(/primary language/i);
  });

  it('extractFirstJsonObject skips a stray brace in prose before the JSON', () => {
    const { CC } = loadWithCore();
    expect(CC._extractFirstJsonObject('Use {placeholders} like so:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('generatePdModule stamps AI provenance on the result', async () => {
    const { CC, PdCore } = loadWithCore();
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI: async () => validJson(), getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.module.metadata.ai_generated).toBe(true);
    expect(res.module.metadata.credit).toBe('AI-assisted draft');
  });

  it('SimActivity shows the AI/PII disclosure', () => {
    const { CC } = loadWithCore();
    const html = render(CC.SimActivity, { activity: { id: 's1', type: 'sim', title: 'T', content: { scenario: 'S' } }, raw: {}, onRaw() {} });
    expect(html).toMatch(/sent to an AI service/i);
    expect(html).toMatch(/personal information/i);
  });
});

describe('path-certificate rows + import edge cases', () => {
  it('pdPathCertificateRows resolves titles (entry > history > slug) + completion dates', () => {
    const { CC } = loadWithCore();
    const path = { moduleSlugs: ['a', 'b', 'gone'] };
    const entries = [{ slug: 'a', moduleId: 'ums:pd:module-a', title: 'Module A' }];
    const history = [{ moduleId: 'ums:pd:module-a', moduleTitle: 'A (hist)', completedAt: '2026-06-20' }, { moduleId: 'b', moduleTitle: 'Module B', completedAt: '2026-06-21' }];
    const rows = CC._pdPathCertificateRows(path, entries, history);
    expect(rows.map((r) => r.title)).toEqual(['Module A', 'Module B', 'gone']); // entry title wins, then history, then slug
    expect(rows[0].completedAt).toBe('2026-06-20');
    expect(rows[2].completedAt).toBeFalsy();
  });

  it('uses moduleId as authoritative identity and slug only for legacy entries', () => {
    const { CC } = loadWithCore();
    const current = { slug: 'short-handle', moduleId: 'ums:pd:module-a', title: 'Current' };
    const legacy = { slug: 'legacy-handle', title: 'Legacy' };
    expect(CC._pdManifestModuleId(current)).toBe('ums:pd:module-a');
    expect(CC._pdManifestModuleId(legacy)).toBe('legacy-handle');
    expect(CC._pdEntryForHistoryModuleId([current, legacy], 'ums:pd:module-a')).toBe(current);
    expect(CC._pdEntryForHistoryModuleId([current, legacy], 'short-handle')).toBeNull();
    expect(CC._pdEntryForHistoryModuleId([current, legacy], 'legacy-handle')).toBe(legacy);
  });
  it('importPdHistory keeps the existing entry on an equal timestamp and filters malformed entries', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({ moduleId: 'a', moduleTitle: 'A orig', complete: true, completedAt: '2026-06-20' });
    const res = CC._importPdHistory({ entries: [
      { moduleId: 'a', moduleTitle: 'A same-day', complete: true, completedAt: '2026-06-20' }, // equal ts → keep existing
      { moduleId: 'b', complete: false, completedAt: '2026-06-21' },                            // not complete → filtered
      { complete: true, completedAt: '2026-06-22' },                                            // no moduleId → filtered
      null,                                                                                     // junk → filtered
    ] });
    expect(res.ok).toBe(true);
    const h = CC._loadPdHistory();
    expect(h).toHaveLength(1);
    expect(h[0].moduleTitle).toBe('A orig');
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
  });
});

describe('PD content binding and learner-state regressions', () => {
  it('changes the module fingerprint when material content changes', () => {
    const { CC, PdCore } = loadWithCore();
    const original = validModuleObj();
    const changed = JSON.parse(JSON.stringify(original));
    changed.sections[1].activities[0].content.questions[0].prompt = 'A materially different prompt';
    expect(CC._pdFingerprint(changed, PdCore)).not.toBe(CC._pdFingerprint(original, PdCore));
    expect(CC._pdFingerprint(changed, {})).not.toBe(CC._pdFingerprint(original, {}));
  });

  it('prefers the PdCore content digest when the API is available', () => {
    const { CC } = loadWithCore();
    expect(CC._pdFingerprint(validModuleObj(), { moduleContentDigest: () => 'core-digest' })).toBe('core-digest');
  });

  it('persists every scenario edit and invalidates stale AI feedback', () => {
    const { CC } = loadWithCore();
    const patches = [];
    CC._persistSimEdit((patch) => patches.push(patch), 'first draft');
    CC._persistSimEdit((patch) => patches.push(patch), 'revised draft');
    expect(patches).toHaveLength(2);
    expect(patches[1]).toEqual({ response: 'revised draft', masteryScore: null, feedback: '', qualitativeAnalysis: null });
  });

  it('requires explicit quiz submission before progression', () => {
    const { CC, PdCore } = loadWithCore();
    const quiz = {
      id: 'q-submit', type: 'quiz', title: 'Submit first', gate: { kind: 'score', threshold: 1 },
      content: { questions: [{ prompt: 'Pick A', options: ['A', 'B'], correctIndex: 0 }] },
    };
    const unsubmitted = CC._evaluatePdActivityGate(PdCore, quiz, { answers: [0], submitted: false });
    expect(unsubmitted.passed).toBe(false);
    expect(unsubmitted.reason).toBe('unsubmitted');
    const submitted = CC._evaluatePdActivityGate(PdCore, quiz, { answers: [0], submitted: true });
    expect(submitted.passed).toBe(true);
    expect(SRC).toContain('Submit your answers to continue.');
  });

  it('stamps a deterministic module ID before validating an AI draft', async () => {
    const { CC, PdCore } = loadWithCore();
    const draft = validModuleObj();
    delete draft.metadata.id;
    delete draft.metadata.version;
    delete draft.metadata.language;
    const res = await CC._generatePdModule({ topic: 'X' }, { callAI: async () => JSON.stringify(draft), getCore: () => PdCore });
    expect(res.ok).toBe(true);
    expect(res.module.metadata.id).toBe('generated');
    expect(res.module.metadata.version).toBe('1.0.0');
    expect(res.module.metadata.language).toBe('en-US');
  });
});

describe('PD manifest content binding', () => {
  it('requires digest/version/language bindings and fails closed on every mismatch', () => {
    const { CC, PdCore } = loadWithCore();
    const mod = validModuleObj();
    const digest = PdCore.moduleContentDigest(mod);
    const binding = { moduleId: mod.metadata.id, contentDigest: digest, version: '1.0.0', language: 'en-US' };
    expect(CC._verifyPdManifestEntryDigest(PdCore, {}, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore, binding, mod)).toMatchObject({ ok: true, verified: true });
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, version: '' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, moduleId: '' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, moduleId: 'ums:other' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore,
      { ...binding, moduleId: undefined, slug: mod.metadata.id }, mod).ok).toBe(true);
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, version: '2.0.0' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, language: 'fr' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest(PdCore, { ...binding, contentDigest: 'wrong' }, mod).ok).toBe(false);
    expect(CC._verifyPdManifestEntryDigest({}, binding, mod).ok).toBe(false);
  });
});

describe('PD local-history trust semantics', () => {
  it('forces locally recorded completion to self-reported and unverified', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    CC._recordPdCompletion({
      moduleId: 'local', complete: true, completedAt: '2026-06-20',
      trust: 'institution-verified', verified: true, verificationStatus: 'verified',
    });
    const entry = CC._loadPdHistory()[0];
    expect(entry.trust).toBe('self-reported');
    expect(entry.verified).toBe(false);
    expect(entry.verificationStatus).toBe('unverified');
    expect(entry.historyOrigin).toBe('local-device');
    expect(CC._isPersonalPdCompletionEntry(entry)).toBe(true);
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
  });

  it('downgrades imported verification claims while preserving personal progress', () => {
    const { CC } = loadWithCore();
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
    const res = CC._importPdHistory({ entries: [{
      moduleId: 'imported', complete: true, completedAt: '2026-06-21',
      trust: 'institution-verified', verified: true, verificationStatus: 'verified',
    }] });
    expect(res.ok).toBe(true);
    const entry = CC._loadPdHistory()[0];
    expect(entry).toMatchObject({
      trust: 'self-reported', verified: false, verificationStatus: 'unverified', historyOrigin: 'imported-history',
    });
    expect(CC._isPersonalPdCompletionEntry(entry)).toBe(true);
    try { globalThis.localStorage.removeItem('alloflow_pd_history'); } catch (_e) {}
  });
  it('counts completion only for the exact current manifest version and digest', () => {
    const { CC } = loadWithCore();
    const entry = CC._normalizePdHistoryEntry({
      moduleId: 'module-a', moduleVersion: '1.0.0',
      contentDigest: 'sha256:' + 'a'.repeat(64), complete: true, completedAt: '2026-06-25',
    }, 'local-device');
    expect(CC._pdHistoryEntryMatchesBinding(entry, {
      version: '1.0.0', contentDigest: 'sha256:' + 'a'.repeat(64),
    })).toBe(true);
    expect(CC._pdHistoryEntryMatchesBinding(entry, {
      version: '2.0.0', contentDigest: 'sha256:' + 'a'.repeat(64),
    })).toBe(false);
    expect(CC._pdHistoryEntryMatchesBinding(entry, {
      version: '1.0.0', contentDigest: 'sha256:' + 'b'.repeat(64),
    })).toBe(false);
    expect(CC._pdHistoryEntryMatchesBinding(entry, {})).toBe(false);
  });

});

describe('credential client orchestration (mocked fetch)', () => {
  let origFetch;
  beforeAll(() => { origFetch = globalThis.fetch; });
  afterAll(() => { globalThis.fetch = origFetch; });
  function stubFetch(map) {
    globalThis.fetch = (url, opts) => { const r = map(String(url), opts); return Promise.resolve({ status: r.status, ok: r.status < 400, json: () => Promise.resolve(r.body) }); };
  }

  it('requestPdCredential returns the credential on 201', async () => {
    const { CC } = loadWithCore();
    stubFetch(() => ({ status: 201, body: { ok: true, credential: { payload: {}, signature: 'sig' } } }));
    const r = await CC._requestPdCredential({ complete: true });
    expect(r.ok).toBe(true);
    expect(r.credential.signature).toBe('sig');
  });

  it('requestPdCredential flags disabled on 501', async () => {
    const { CC } = loadWithCore();
    stubFetch(() => ({ status: 501, body: { ok: false, error: 'disabled' } }));
    const r = await CC._requestPdCredential({ complete: true });
    expect(r.ok).toBe(false);
    expect(r.disabled).toBe(true);
  });

  it('always routes reviewed credentials through authoritative server verification', async () => {
    const { CC } = loadWithCore();
    const urls = [];
    stubFetch((url) => {
      urls.push(url);
      return { status: 200, body: { ok: true, valid: true, credential_profile: 'reviewed-evidence', accessibility_current: true, assurance: { institutional: true, reviewed: true } } };
    });
    const r = await CC._verifyPdCredential({ payload: { credential_profile: 'reviewed-evidence', a: 1 }, signature: 'x' });
    expect(r).toMatchObject({ valid: true, method: 'server', accessibilityCurrent: true, assurance: { institutional: true, reviewed: true } });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('/verifyPd');
    expect(SRC).not.toContain('/pdIssuerKey');
    expect(SRC).not.toContain("method: 'client'");
  });

  it('propagates an expired accessibility window without invalidating the reviewed achievement', async () => {
    const { CC } = loadWithCore();
    stubFetch(() => ({ status: 200, body: { ok: true, valid: true, credential_profile: 'reviewed-evidence', accessibility_current: false, assurance: { institutional: true, reviewed: true } } }));
    expect(await CC._verifyPdCredential({ payload: { credential_profile: 'reviewed-evidence' }, signature: 'x' })).toMatchObject({
      valid: true, accessibilityCurrent: false, assurance: { institutional: true, reviewed: true },
    });
  });

  it('routes self-paced profiles through trusted server verification and preserves non-institutional assurance', async () => {
    const { CC } = loadWithCore();
    stubFetch(() => ({ status: 200, body: { ok: true, valid: true, credential_profile: 'self-paced-non-institutional', assurance: { institutional: false, reviewed: false } } }));
    const r = await CC._verifyPdCredential({ payload: { credential_profile: 'self-paced-non-institutional' }, signature: 'x' });
    expect(r).toMatchObject({ valid: true, method: 'server', credentialProfile: 'self-paced-non-institutional', assurance: { institutional: false, reviewed: false } });
  });

  it('rejects unsupported profiles without a network request', async () => {
    const { CC } = loadWithCore();
    let calls = 0;
    stubFetch(() => { calls += 1; return { status: 200, body: { ok: true, valid: true } }; });
    const r = await CC._verifyPdCredential({ payload: { credential_profile: 'invented-profile' }, signature: 'x' });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/unsupported credential profile/i);
    expect(calls).toBe(0);
  });

  it('rejects server attempts to relabel or promote a signed profile', async () => {
    const { CC } = loadWithCore();
    const credential = { payload: { credential_profile: 'self-paced-non-institutional' }, signature: 'x' };
    stubFetch(() => ({ status: 200, body: { ok: true, valid: true, credential_profile: 'reviewed-evidence', assurance: { institutional: true, reviewed: true } } }));
    let r = await CC._verifyPdCredential(credential);
    expect(r.error).toMatch(/profile mismatch/i);
    stubFetch(() => ({ status: 200, body: { ok: true, valid: true, credential_profile: 'self-paced-non-institutional', assurance: { institutional: true, reviewed: true } } }));
    r = await CC._verifyPdCredential(credential);
    expect(r.error).toMatch(/assurance mismatch/i);
  });

  it('never accepts assurance on invalid credentials or a reviewed verdict missing accessibility state', async () => {
    const { CC } = loadWithCore();
    const credential = { payload: { credential_profile: 'reviewed-evidence' }, signature: 'x' };
    stubFetch(() => ({ status: 200, body: { ok: true, valid: false, credential_profile: 'reviewed-evidence', assurance: { institutional: true, reviewed: true } } }));
    let r = await CC._verifyPdCredential(credential);
    expect(r).toMatchObject({ valid: false, assurance: { institutional: false, reviewed: false } });
    expect(r.error).toMatch(/invalid credentials cannot carry assurance/i);

    stubFetch(() => ({ status: 200, body: { ok: true, valid: true, credential_profile: 'reviewed-evidence', assurance: { institutional: true, reviewed: true } } }));
    r = await CC._verifyPdCredential(credential);
    expect(r).toMatchObject({ valid: false, assurance: { institutional: false, reviewed: false } });
    expect(r.error).toMatch(/accessibility verification state is missing/i);
  });

  it('verifyPdCredential reports "could not check" (not "invalid") when the server returns no verdict', async () => {
    const { CC } = loadWithCore();
    stubFetch(() => ({ status: 501, body: { ok: false, error: 'No issuer public key configured.' } }));
    const r = await CC._verifyPdCredential({ payload: { credential_profile: 'reviewed-evidence' }, signature: 'x' });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/issuer public key|HTTP 501/i);
  });
});
describe('PD typed-response paste policy', () => {
  it('defaults to allowed and records no event', () => {
    const { CC } = loadWithCore();
    expect(CC._resolvePdPastePolicy({}, null)).toEqual({ mode: 'allowed' });
    expect(CC._recordPdPasteEvent({}, 'reflect-1', { mode: 'allowed' }, 'private clipboard text', '2026-07-16T12:00:00Z'))
      .toEqual({ blocked: false, patch: null });
  });

  it('records only disclosed event metadata in monitored mode', () => {
    const { CC } = loadWithCore();
    const result = CC._recordPdPasteEvent({}, 'reflect-1', { mode: 'monitored' }, 'private clipboard text', '2026-07-16T12:00:00Z', 'reflect-1-reflect');
    expect(result.blocked).toBe(false);
    expect(result.patch.integrityEvents[0]).toMatchObject({
      eventType: 'paste', activityId: 'reflect-1', fieldId: 'reflect-1-reflect',
      charCount: 22, wordCount: 3, blocked: false,
    });
    expect(JSON.stringify(result.patch)).not.toContain('private clipboard text');
  });

  it('blocks only explicit restricted policies and names the accessible alternative', () => {
    const { CC } = loadWithCore();
    const policy = { mode: 'restricted', accessibleAlternative: 'Submit an audio response instead.' };
    const result = CC._recordPdPasteEvent({}, 'sim-1', policy, 'draft', '2026-07-16T12:00:00Z', 'sim-1-resp');
    expect(result.blocked).toBe(true);
    expect(result.patch.integrityEvents[0].blocked).toBe(true);
    expect(result.patch.integrityEvents[0].fieldId).toBe('sim-1-resp');
    expect(CC._pdPastePolicyNotice(policy)).toContain('Submit an audio response instead.');
    expect(CC._pdPastePolicyNotice(policy)).toMatch(/never automatically fail/i);
  });

  it('uses an activity policy over the module policy', () => {
    const { CC } = loadWithCore();
    expect(CC._resolvePdPastePolicy(
      { assessmentPolicy: { paste: { mode: 'monitored' } } },
      { mode: 'restricted', accessibleAlternative: 'Alternative' },
    ).mode).toBe('monitored');
  });

  it('renders the disclosure and associates it with a typed response', () => {
    const { CC } = loadWithCore();
    const mod = {
      schema_version: 'pd-1.0', kind: 'pd_module',
      metadata: { id: 'paste-disclosure', title: 'Paste disclosure' },
      assessmentPolicy: { paste: { mode: 'monitored' } },
      sections: [{ title: 'Apply', activities: [{
        id: 'reflect-1', type: 'reflect', title: 'Reflect',
        content: { prompt: 'Describe your next step.' }, gate: { kind: 'none' },
      }] }],
    };
    const html = render(CC.PdRunner, { module: mod, addToast() {}, onExit() {} });
    expect(html).toContain('records only the time and size of paste events');
    expect(html).toContain('id="reflect-1-paste-policy"');
    expect(html).toContain('aria-describedby="reflect-1-paste-policy"');
  });
});
describe('PD signing UI trust boundary', () => {
  it('hides legacy self-paced signing unless the instance explicitly enables it', () => {
    expect(SRC).toContain("window.__alloPdAllowSelfPacedIssuance === true");
    expect(SRC).toContain("ev.complete && allowSelfPacedSigning && e('button'");
    expect(SRC).toContain('Institutional credentials are issued only after authorized evidence and accessibility review');
  });
});
