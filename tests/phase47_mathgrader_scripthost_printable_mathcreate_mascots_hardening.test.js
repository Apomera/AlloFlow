import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const React = require(path.resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(path.resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const { renderToStaticMarkup } = require(path.resolve('desktop/web-app/node_modules/react-dom/server'));
const manifestHelper = require(path.resolve('dev-tools/build_browser_delivery_manifest.cjs'));

const PHASE47_FILES = [
  'math_manipulative_grader_module.js',
  'lesson_teaching_script_host_module.js',
  'printable_model_module.js',
  'math_create_module.js',
  'allo_mascots_module.js',
];

const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha384(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

describe('Phase 47 — Mirrors & Canonical 3-Host SRI Integrity', () => {
  it('keeps all 5 Phase 47 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const parsedHosts = HOSTS.map((h) => manifestHelper.readEmbeddedManifest(fs.readFileSync(path.resolve(ROOT, h), 'utf8')));
    expect(parsedHosts.every(Boolean)).toBe(true);
    expect(new Set(parsedHosts.map((m) => m.releaseId)).size).toBe(1);

    for (const file of PHASE47_FILES) {
      const rootBuf = fs.readFileSync(path.resolve(ROOT, file));
      const rootIntegrity = sha384(rootBuf);
      for (const dir of MIRROR_DIRS) {
        const copyBuf = fs.readFileSync(path.resolve(ROOT, dir, file));
        expect(Buffer.compare(rootBuf, copyBuf), `${file} mirror mismatch in ${dir}`).toBe(0);
      }
      for (const m of parsedHosts) {
        expect(m.assets[file].bytes).toBe(rootBuf.length);
        expect(m.assets[file].integrity).toBe(rootIntegrity);
      }
    }
  });
});

describe('Phase 47 — math_manipulative_grader_module.js hardening', () => {
  it('freezes API & options, blocks prototype-key tool reads, and sanitizes writeMathViewState spreads', () => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.MathManipulativeGraderModule;
    delete window.AlloModules.MathManipulativeGrader;
    new Function(fs.readFileSync(path.resolve(ROOT, 'math_manipulative_grader_module.js'), 'utf8'))();
    const G = window.AlloModules.MathManipulativeGrader;
    expect(Object.isFrozen(G)).toBe(true);
    expect(G.activityOptions.every((o) => Object.isFrozen(o))).toBe(true);

    expect(G.readMathViewState('__proto__', { labToolData: {} })).toBeUndefined();
    expect(G.readMathViewState('constructor', { labToolData: {} })).toBeUndefined();

    const extra = JSON.parse('{"__proto__":{"polluted":true},"safe":1}');
    const written = G.writeMathViewState('base10', {}, null, extra);
    expect(written._manipulatives.b10).toEqual({ ones: 0, tens: 0, hundreds: 0, thousands: 0 });
    expect(written._manipulatives.safe).toBe(1);
    expect(({}).polluted).toBeUndefined();

    expect(G.gradeManipulativeResponse('fractions', { numerator: 0, denominator: 0 }, { numerator: 0, denominator: 4, match: 'equivalent' })).toBe(false);
  });
});

describe('Phase 47 — lesson_teaching_script_host_module.js hardening', () => {
  afterEach(() => {
    delete window.__alloOfflineOnly;
  });

  it('freezes API & controller, fails closed on __alloOfflineOnly, and strips __proto__ from sessionStorage checkpoints', async () => {
    window.AlloModules = window.AlloModules || {};
    new Function(fs.readFileSync(path.resolve(ROOT, 'resource_content_fingerprint_module.js'), 'utf8'))();
    new Function(fs.readFileSync(path.resolve(ROOT, 'lesson_teaching_script_module.js'), 'utf8'))();
    new Function(fs.readFileSync(path.resolve(ROOT, 'lesson_teaching_script_host_module.js'), 'utf8'))();
    const host = window.AlloModules.LessonTeachingScriptHost;
    const core = window.AlloModules.LessonTeachingScript;
    expect(Object.isFrozen(host)).toBe(true);

    const poisonedStorage = {
      getItem: () => '[{"schema":1,"actor":"t","planId":"p","updatedAt":' + Date.now() + ',"__proto__":{"pollutedHost":true}}]',
      setItem() {},
      removeItem() {},
    };
    const callText = vi.fn(async () => '{}');
    const state = {
      history: [
        { id: 'p', type: 'lesson-plan', title: 'Fractions', config: { gradeLevel: '4th Grade', language: 'English' }, data: { objectives: ['Explain 1/4'] } },
        { id: 'm', type: 'simplified', title: 'Text', data: 'One fourth is one of four equal parts.' },
      ],
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      canGenerate: true,
      actorKey: 't',
    };
    const ctrl = host.createController({ storage: poisonedStorage, core, getState: () => state, callText, updateResource: () => true });
    expect(Object.isFrozen(ctrl)).toBe(true);
    expect(({}).pollutedHost).toBeUndefined();

    window.__alloOfflineOnly = true;
    const res = await ctrl.generate('p', {
      grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', scope: 'segment',
      durationMinutes: 15, goal: 'Explain 1/4', standard: '4.NF.A.1', priorKnowledge: 'Parts',
      language: 'English', researchEnabled: false, materialIds: ['m'],
    });
    expect(res.ok).toBe(false);
    expect(callText).not.toHaveBeenCalled();
  });
});

describe('Phase 47 — printable_model_module.js hardening', () => {
  it('freezes API & limits, strips __proto__ in JSON parsers, caps ticket size, and bounds lathe profiles', () => {
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.PrintableModel;
    new Function(fs.readFileSync(path.resolve(ROOT, 'printable_model_module.js'), 'utf8'))();
    const P = window.AlloModules.PrintableModel;
    expect(Object.isFrozen(P)).toBe(true);
    expect(Object.isFrozen(P.LIMITS)).toBe(true);
    expect(Object.isFrozen(P.FORMATS)).toBe(true);

    const poisonedTicket = '{"version":"alloflow-print-job/1","__proto__":{"pollutedPrint":true}}';
    expect(P.parsePrintJobTicket(poisonedTicket).ok).toBe(false);
    expect(({}).pollutedPrint).toBeUndefined();

    const oversizedTicket = '{"version":"alloflow-print-job/1","pad":"' + 'a'.repeat(1024 * 1024 + 50) + '"}';
    expect(P.parsePrintJobTicket(oversizedTicket).ok).toBe(false);

    const poisonedSub = '{"version":"printable/1","__proto__":{"pollutedSub":true}}';
    expect(P.parseSubmission(poisonedSub).ok).toBe(false);
    expect(({}).pollutedSub).toBeUndefined();

    // Oversized profile points capped at 512 (28 * (512 - 1) * 2 = 28616 triangles)
    const hugeProfile = Array.from({ length: 2000 }, (_, i) => [0.5, i / 2000]);
    hugeProfile.push([NaN, Infinity]);
    const report = P.inspectRecipe({ parts: [{ shape: 'lathe', size: [1, 1, 1], profile: hugeProfile }] }, 10);
    expect(report.triangleCount).toBe(28 * 511 * 2);
  });
});

describe('Phase 47 — math_create_module.js hardening', () => {
  let root, host;
  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    host?.remove();
    host = null;
    delete window.__alloOfflineOnly;
    delete window.__alloAiUsable;
    if (window.AlloModules) delete window.AlloModules.GenerationHelpers;
  });

  it('freezes MathCreate, survives malformed props, and fail-closes Assessment Builder generation under offline/AI-blocked gates', async () => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.MathCreate;
    delete window.AlloModules.MathCreateModule;
    new Function(fs.readFileSync(path.resolve(ROOT, 'math_create_module.js'), 'utf8'))();
    const MC = window.AlloModules.MathCreate;
    expect(Object.isFrozen(MC)).toBe(true);

    const genSpy = vi.fn(async () => ({}));
    window.AlloModules.GenerationHelpers = { generateMathAssessment: genSpy };
    const addToast = vi.fn();

    // First verify malformed props don't crash render
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(MC.MathCreateModal, { mathInput: 12345, assessmentBlocks: 'not-an-array', addToast })));

    // Now render Assessment Builder with offline-only flag set
    window.__alloOfflineOnly = true;
    act(() => root.render(React.createElement(MC.MathCreateModal, {
      showAssessmentBuilder: true,
      assessmentBlocks: [{ id: 'b1', type: 'computation', quantity: 5, directive: 'Add' }],
      addToast,
      callGemini: vi.fn(),
    })));
    const genBtn = host.querySelector('button[aria-label="Generate assessment problems"]');
    expect(genBtn).toBeTruthy();
    await act(async () => { genBtn.click(); });
    expect(genSpy).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringMatching(/disabled or locked/i), 'warning');
  });
});

describe('Phase 47 — allo_mascots_module.js hardening', () => {
  it('freezes API/bios/ids and sanitizes malicious state, size, color, and idSuffix inputs', () => {
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    delete window.AlloMascots;
    delete window.AlloModules.AlloMascotsModule;
    new Function(fs.readFileSync(path.resolve(ROOT, 'allo_mascots_module.js'), 'utf8'))();
    const M = window.AlloMascots;
    expect(Object.isFrozen(M)).toBe(true);
    expect(Object.isFrozen(M.ids)).toBe(true);
    expect(Object.isFrozen(M.bios)).toBe(true);
    expect(M.bios.every((b) => Object.isFrozen(b))).toBe(true);

    const el = M.render('pip', {
      state: 'win" onclick="alert(1)',
      size: -50,
      bodyColor: 'url(javascript:alert(1))',
      idSuffix: '-ok"bad)(',
    });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('tp-mascot-idle');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('width="64"');
    expect(html).toContain('id="tp-grad-pip-body-okbad"');
    expect(html).toContain('url(#tp-grad-pip-body-okbad)');
  });
});
