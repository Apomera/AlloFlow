// Family mode cannot open the Teacher Dashboard, Assessment Center, Dynamic Assessment
// or BehaviorLens (fleet wave 2, lane K5).
//
// WHY: family mode runs with isTeacherMode true AND isParentMode true. The Educator
// Hub hid Report Writer from parents (hideSchoolProfessional) but still offered the
// Assessment Center, Dynamic Assessment and BehaviorLens, and the header's "Family
// Dashboard" opened the teacher's grading dashboard. These hold other students' records
// and clinical tools. Independent learners keep them (this change is family mode only),
// and what d293fdefc and c48d9a57f gave parents (AI setup, workspace commands) is untouched.
//
// Checked three ways: the built hub module mounted in jsdom, the same module rendered in
// real Chromium, and the host's render gates evaluated from AlloFlowANTI.txt for every
// route that sets the flags (hub card, command, header, a "return to" button).
// ALLO_ANTI_CANDIDATE / ALLO_HUB_CANDIDATE point at scratch copies for mutation runs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const HUB = readFileSync(process.env.ALLO_HUB_CANDIDATE || resolve(process.cwd(), 'view_educator_hub_modal_module.js'), 'utf8');
const ANTI = readFileSync(process.env.ALLO_ANTI_CANDIDATE || resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const TOOLS = ['assessment-center', 'dynamic-assessment', 'behavior-lens'];
const noop = () => {};
const HUB_PROPS = {
  showEducatorHub: true, setShowEducatorHub: noop, t: () => '', handleFileUpload: noop, openExportPreview: noop,
  pdfAuditResult: null, pdfFixLoading: false, pdfFixResult: null, setIsAccessibilityLabOpen: noop, setIsCommunityCatalogOpen: noop,
  setIsSymbolStudioOpen: noop, setPdfAuditResult: noop, setPdfBatchMode: noop, setPendingPdfBase64: noop, setPendingPdfFile: noop,
  setShowBehaviorLens: noop, setShowReportWriter: noop,
};

let Hub;
const roots = [];
beforeAll(() => {
  window.React = React; globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorHubModal;
  // eslint-disable-next-line no-new-func
  new Function(HUB)();
  Hub = window.AlloModules.EducatorHubModal.EducatorHubModal;
});
afterEach(() => { while (roots.length) { const { root, el } = roots.pop(); act(() => root.unmount()); el.remove(); } });
const cardIds = (extra = {}) => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = ReactDOMClient.createRoot(el); roots.push({ root, el });
  act(() => { root.render(React.createElement(Hub, { ...HUB_PROPS, ...extra })); });
  return Array.from(el.querySelectorAll('[data-hub-id]')).map(n => n.dataset.hubId);
};

describe('Educator Hub cards in family mode (built module, jsdom)', () => {
  it('a parent does not get the three tools; Report Writer stays hidden as before', () => {
    const ids = cardIds({ isParentMode: true });
    for (const id of TOOLS) expect(ids, id).not.toContain(id);
    expect(ids).not.toContain('report-writer');
    // What a parent keeps: the home-useful tools and Polls & Sign-ups.
    expect(ids).toEqual(expect.arrayContaining(['polls-signups', 'lumen', 'document']));
  });
  it('a teacher and an independent learner still get all three', () => {
    for (const extra of [{}, { isIndependentMode: true }]) {
      const ids = cardIds(extra);
      for (const id of TOOLS) expect(ids, JSON.stringify(extra) + ' ' + id).toContain(id);
    }
  });
});

// The host decides what actually opens. Evaluate its real gate expressions.
function attrExpr(needle) {
  const at = ANTI.indexOf(needle);
  expect(at, needle).toBeGreaterThan(-1);
  const start = ANTI.indexOf('isOpen={', at) + 'isOpen={'.length;
  let depth = 1, i = start;
  while (depth && i < ANTI.length) { const ch = ANTI[i++]; if (ch === '{') depth++; else if (ch === '}') depth--; }
  return ANTI.slice(start, i - 1);
}
const evalWith = (expr, scope) => new Function(...Object.keys(scope), 'return (' + expr + ');')(...Object.values(scope));
const MODES = {
  teacher: { isTeacherMode: true, isParentMode: false, isIndependentMode: false },
  parent: { isTeacherMode: true, isParentMode: true, isIndependentMode: false },
  independent: { isTeacherMode: true, isParentMode: false, isIndependentMode: true },
};

describe('host render gates (AlloFlowANTI.txt)', () => {
  it('Assessment Center, Dynamic Assessment and BehaviorLens stay closed for a parent even with their flags set', () => {
    // The Assessment Center panel is gated at its mount (its isOpen stays shared with the research suite).
    const panelAt = ANTI.indexOf('<StudentAnalyticsPanel');
    const mountStart = ANTI.lastIndexOf('{isTeacherMode', panelAt);
    const mount = ANTI.slice(mountStart + 1, ANTI.indexOf(' && (<ErrorBoundary', mountStart));
    expect(panelAt - mountStart, 'panel mount condition not found just above the panel').toBeLessThan(300);
    const gates = {
      assessmentCenter: '(' + mount + ') && (' + attrExpr('<StudentAnalyticsPanel') + ')',
      dynamicAssessment: attrExpr('<CDNModuleGate moduleKey="DynamicAssessment"'),
      behaviorLens: attrExpr('<CDNModuleGate moduleKey="BehaviorLens"'),
    };
    const flags = { showClassAnalytics: true, isResearchSuiteOpen: false, isDynamicAssessmentOpen: true, showBehaviorLens: true };
    for (const [name, expr] of Object.entries(gates)) {
      expect(!!evalWith(expr, { ...flags, ...MODES.parent }), name + ' opens for a parent').toBe(false);
      expect(!!evalWith(expr, { ...flags, ...MODES.teacher }), name + ' must open for a teacher').toBe(true);
      expect(!!evalWith(expr, { ...flags, ...MODES.independent }), name + ' must open for an independent learner').toBe(true);
    }
  });

  it('the dashboard gives a parent the learner progress view, never the Teacher Dashboard', () => {
    const teacherAt = ANTI.indexOf('<TeacherDashboard');
    const branchStart = ANTI.lastIndexOf("{activeView === 'dashboard'", teacherAt);
    const teacherCond = ANTI.slice(branchStart + 1, ANTI.indexOf(' && (<ErrorBoundary', branchStart));
    const learnerAt = ANTI.indexOf('<LearnerProgressView');
    const learnerStart = ANTI.lastIndexOf("{activeView === 'dashboard'", learnerAt);
    const learnerCond = ANTI.slice(learnerStart + 1, ANTI.indexOf(') && (', learnerStart) + 1);
    for (const [mode, scope] of Object.entries(MODES)) {
      const s = { activeView: 'dashboard', ...scope };
      const teacher = !!evalWith(teacherCond, s), learner = !!evalWith(learnerCond, s);
      expect(teacher && learner, mode + ' renders both').toBe(false);
      expect(teacher || learner, mode + ' renders nothing').toBe(true);
      expect(teacher, mode).toBe(mode === 'teacher');
    }
  });

  it('the "Return to Dynamic Assessment" button is not offered to a parent', () => {
    const at = ANTI.indexOf('{generatedContent && generatedContent.fromDA');
    const expr = ANTI.slice(at + 1, ANTI.indexOf(' && (', at));
    const gc = { fromDA: true };
    expect(!!evalWith(expr, { generatedContent: gc, isDynamicAssessmentOpen: false, ...MODES.parent })).toBe(false);
    expect(!!evalWith(expr, { generatedContent: gc, isDynamicAssessmentOpen: false, ...MODES.teacher })).toBe(true);
  });
});

describe('real browser: the family-mode hub offers none of the three tools', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 30000);
  it('renders the built hub in Chromium for a parent and a teacher', async () => {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.setContent('<!doctype html><html><body><div id="parent"></div><div id="teacher"></div></body></html>');
    await page.addScriptTag({ path: resolve(MODULES_DIR, 'react/umd/react.development.js') });
    await page.addScriptTag({ path: resolve(MODULES_DIR, 'react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ content: HUB });
    const ids = await page.evaluate(() => {
      const noop = () => {};
      const props = { showEducatorHub: true, setShowEducatorHub: noop, t: () => '', handleFileUpload: noop, openExportPreview: noop, pdfAuditResult: null, pdfFixLoading: false, pdfFixResult: null, setIsAccessibilityLabOpen: noop, setIsCommunityCatalogOpen: noop, setIsSymbolStudioOpen: noop, setPdfAuditResult: noop, setPdfBatchMode: noop, setPendingPdfBase64: noop, setPendingPdfFile: noop, setShowBehaviorLens: noop, setShowReportWriter: noop };
      const Hub = window.AlloModules.EducatorHubModal.EducatorHubModal;
      const out = {};
      for (const [id, extra] of [['parent', { isParentMode: true }], ['teacher', {}]]) {
        const el = document.getElementById(id);
        // eslint-disable-next-line react/no-deprecated
        window.ReactDOM.render(window.React.createElement(Hub, Object.assign({}, props, extra)), el);
        out[id] = Array.from(el.querySelectorAll('[data-hub-id]')).map(n => n.dataset.hubId);
      }
      return out;
    });
    for (const id of TOOLS) {
      expect(ids.parent, id).not.toContain(id);
      expect(ids.teacher, id).toContain(id);
    }
    expect(ids.parent.length).toBeGreaterThan(8);
    expect(errors).toEqual([]);
    await page.close();
  }, 60000);
});
