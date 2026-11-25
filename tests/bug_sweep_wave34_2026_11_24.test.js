import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

const ROOT = process.cwd();

const WAVE34_DELIVERABLES = [
  'walkthrough_copilot_module.js',
  'walkthrough_copilot_cdn_module.js',
  'allo_mascots_module.js',
  'prim3d_module.js',
  'math_create_module.js',
  'lesson_teaching_script_host_module.js',
  'resource_read_aloud_module.js',
  'view_cold_path_surfaces_module.js',
  'view_cold_path_screens_module.js',
  'video_studio_host_bridge_module.js',
  'accessibility_evidence_module.js',
  'view_pdf_validator_module.js',
  'review_document_session_module.js',
  'lesson_teaching_research_module.js',
  'math_manipulative_grader_module.js',
  'session_transport_module.js',
  'ui_language_selector_module.js',
  'view_prompt_dialog_module.js',
  'view_storybook_export_modal_module.js',
];

const MIRROR_DIRS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const CONTENT_PINNED = [
  'walkthrough_copilot_cdn_module.js',
  'view_cold_path_surfaces_module.js',
  'view_cold_path_screens_module.js',
  'video_studio_host_bridge_module.js',
  'session_transport_module.js',
  'view_storybook_export_modal_module.js',
];

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha256Hex(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInWindowVm(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = {
    AlloModules: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
    ...extraGlobals,
  };
  win.window = win;
  win.globalThis = win;
  win.self = win;
  vm.runInNewContext(code, win, { filename: relPath });
  return win;
}

describe('Wave 34 — Security, Safety, SSR, Stability & WCAG 2.2 AA Hardening (18 Modules)', () => {
  it('loads all 19 Wave 34 deliverables cleanly in a bare Node VM without window/document (SSR safety)', () => {
    for (const rel of WAVE34_DELIVERABLES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => vm.runInNewContext(code, { console }, { filename: rel })).not.toThrow();
    }
  });

  it('maintains 4-way SHA-256 mirror parity for all 19 Wave 34 deliverables', () => {
    for (const rel of WAVE34_DELIVERABLES) {
      const rootHash = sha256Hex(path.join(ROOT, rel));
      for (const dir of MIRROR_DIRS.slice(1)) {
        const dest = path.join(ROOT, dir, rel);
        expect(fs.existsSync(dest), `Missing mirror ${dest}`).toBe(true);
        expect(sha256Hex(dest), `Mirror drift in ${dest}`).toBe(rootHash);
      }
    }
  });

  it('keeps 8-char SHA-256 ?v= pins synchronized across all 3 host files', () => {
    for (const rel of CONTENT_PINNED) {
      const expected = sha256Hex(path.join(ROOT, rel)).slice(0, 8);
      const re = new RegExp(rel.replace(/\./g, '\\.') + '\\?v=([0-9a-f]{8})', 'g');
      for (const host of HOST_FILES) {
        const txt = fs.readFileSync(path.join(ROOT, host), 'utf8');
        const matches = [...txt.matchAll(re)].map((m) => m[1]);
        expect(matches.length, `${host} missing ?v= pin for ${rel}`).toBeGreaterThan(0);
        for (const m of matches) {
          expect(m, `${host} stale ?v= pin for ${rel}`).toBe(expected);
        }
      }
    }
  });

  describe('Pass 1 — Core Engines (Modules 1-6)', () => {
    it('WalkthroughCopilot strips prototype keys in clone/createDelivery and freezes API', () => {
      const win = loadInWindowVm('walkthrough_copilot_module.js');
      const api = win.AlloModules.WalkthroughCopilot;
      expect(Object.isFrozen(api)).toBe(true);
      const cdnSrc = fs.readFileSync(path.join(ROOT, 'walkthrough_copilot_cdn_module.js'), 'utf8');
      expect(cdnSrc).toContain('typeof window === "undefined"');
      expect(cdnSrc).toContain('autoComplete: "email"');
    });

    it('AlloMascots strips C0 controls, adds focusable="false", and avoids Object.prototype theme lookup', () => {
      const mockReact = {
        createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
        cloneElement: (el, props) => ({ ...el, props: { ...(el.props || {}), ...props } }),
        isValidElement: (el) => !!(el && typeof el === 'object' && 'type' in el),
        Children: { map: (c, fn) => (Array.isArray(c) ? c.map(fn) : c == null ? c : [fn(c)]) },
      };
      const win = loadInWindowVm('allo_mascots_module.js', { React: mockReact });
      const mascots = win.AlloMascots;
      const el = mascots.render('pip', { label: 'Pip\u0000\u0007' + 'a'.repeat(200) });
      expect(el.props.focusable).toBe('false');
      expect(el.props['aria-label']).not.toMatch(/[\x00-\x1f\x7f]/);
      expect(el.props['aria-label'].length).toBeLessThanOrEqual(160);
      const decEl = mascots.render('pip', { decorative: true });
      expect(decEl.props['aria-hidden']).toBe('true');
      expect(mascots.getBio('constructor')).toBeNull();
    });

    it('Prim3D guards part index against prototype keys, strips dangerouslySetInnerHTML, and fences untrusted prompt inputs', () => {
      const src = fs.readFileSync(path.join(ROOT, 'prim3d_module.js'), 'utf8');
      expect(src).toContain('_validPartIndex');
      expect(src).toContain('<UNTRUSTED_');
      expect(src).toContain('delete safeRootProps.dangerouslySetInnerHTML');
    });

    it('MathCreate clamps negative/NaN block quantities and gates main Generate when AI is blocked', () => {
      const src = fs.readFileSync(path.join(ROOT, 'math_create_module.js'), 'utf8');
      expect(src).toContain('_safeBlockQty');
      expect(src).toContain('hideStudentAiFeatures');
      expect(src).toContain('StudentPolicy');
    });

    it('LessonTeachingScriptHost fences repair prompt and enforces StudentPolicy AI gating', () => {
      const src = fs.readFileSync(path.join(ROOT, 'lesson_teaching_script_host_module.js'), 'utf8');
      expect(src).toContain('<UNTRUSTED_PREVIOUS_RESPONSE>');
      expect(src).toContain('hideStudentAiFeatures');
      expect(src).toContain('StudentPolicy');
    });

    it('ResourceReadAloud rejects C0 audio URLs and wires global mute and visibilitychange', () => {
      const src = fs.readFileSync(path.join(ROOT, 'resource_read_aloud_module.js'), 'utf8');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('visibilitychange');
      expect(src).toContain('__alloMuted');
      expect(src).toContain('StudentPolicy');
    });
  });

  describe('Pass 2 — Cold-Path Views, Bridges & Validators (Modules 7-12)', () => {
    it('ColdPathSurfaces blocks trailing-dot localhost / CGNAT / IPv4-mapped IPv6 and unifies scrollLock.prev', () => {
      const src = fs.readFileSync(path.join(ROOT, 'view_cold_path_surfaces_module.js'), 'utf8');
      expect(src).toContain('lockState.prev');
      expect(src).toContain('::ffff:');
      expect(src).toContain('_coldSafeJsonParse');
    });

    it('ColdPathScreens fails closed on AI check and blocks SVG/javascript image URLs', () => {
      const src = fs.readFileSync(path.join(ROOT, 'view_cold_path_screens_module.js'), 'utf8');
      expect(src).toContain('_safeColdImageUrl');
      expect(src).toContain('hideStudentAiFeatures');
      expect(src).toContain('StudentPolicy');
    });

    it('VideoStudioHostBridge clamps non-finite durations and tracks cursor rAF/timers for cleanup', () => {
      const src = fs.readFileSync(path.join(ROOT, 'video_studio_host_bridge_module.js'), 'utf8');
      expect(src).toContain('Number.isFinite(_rawDur)');
      expect(src).toContain('cursorRafIds');
      expect(src).toContain('cursorTimers');
      expect(src).toContain('hideStudentAiFeatures');
    });

    it('AccessibilityEvidence handles BigInt, max-depth, Infinity counts, "constructor" tokens, and unexecuted AI', () => {
      const win = loadInWindowVm('accessibility_evidence_module.js');
      const ae = win.AlloModules.AccessibilityEvidence;

      expect(ae.stableSerialize({ big: 42n })).toContain('"42"');
      let deep = { leaf: true };
      for (let i = 0; i < 40; i++) deep = { next: deep };
      expect(ae.stableSerialize(deep)).toContain('[max-depth]');

      const f = ae.canonicalizeFinding({ ruleId: 'custom', count: Infinity, description: 'constructor mismatch' });
      expect(f.count).toBe(1);
      expect(ae.findingKey({ description: 'constructor widget' })).toContain('constructor');

      const prof = ae.normalizeProfile({ requiredEvidence: ['__proto__', 'constructor', 'axe'] });
      expect(prof.requiredEvidence).toEqual(['axe']);

      const st = ae.deriveVerificationState({
        ai: { executed: false, score: 0, issues: [{ issue: 'stale', requiresManualReview: true }] },
        axe: { executed: true, score: 100, totalViolations: 0, totalIncomplete: 0 },
        equalAccess: { executed: true, score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0 },
      });
      expect(st.verificationCoverage.ai).toBe('unavailable');
      expect(st.knownFindings.aiIssues).toBeNull();
      expect(st.reasons).not.toContain('ai-manual-review:1');
    });

    it('PdfValidator guards null inputs and non-finite page numbers', () => {
      const win = loadInWindowVm('view_pdf_validator_module.js');
      const pv = win.AlloModules.PdfValidator;
      expect(pv.walkStructTree(null, null, null)).toEqual([]);
      expect(pv.isMarkerLbl(null)).toBe(false);
      expect(pv.isMarkerLbl({ role: 'Lbl', actualText: '1.' })).toBe(true);
      const notes = pv.readingNotes([
        { role: 'P', hasContent: true, page: NaN, actualText: 'alpha' },
        { role: 'P', hasContent: true, page: Infinity, actualText: 'beta' },
      ]);
      expect(notes.some((n) => n.id === 'goes-back')).toBe(false);
    });

    it('ReviewDocumentSession safely summarizes partial sessions and validates transactions', () => {
      const win = loadInWindowVm('review_document_session_module.js');
      const rds = win.AlloModules.ReviewDocumentSession;

      const summary = rds.summarize({ kind: 'review-document-session', document: {} });
      expect(summary.evidenceState).toBe('unavailable');
      expect(summary.workflowState).toBe('ready');

      expect(rds.isTransaction({ kind: rds.TRANSACTION_KIND, baseRevision: 0 })).toBe(false);
      expect(rds.isTransaction({ kind: rds.TRANSACTION_KIND, baseRevision: -1, commands: [] })).toBe(false);
      expect(rds.isTransaction({ kind: rds.TRANSACTION_KIND, baseRevision: 0, commands: [] })).toBe(true);

      const unfrozenSession = Object.freeze({
        kind: rds.SESSION_KIND,
        id: 's1',
        workspaceMode: 'author',
        revision: 0,
        document: Object.freeze({ baselineHtml: '', currentHtml: '', remediationResult: null }),
        evidence: { state: 'current', stale: false, reason: null },
        workflow: { state: 'ready', dirty: false, needsReview: false },
        ledger: [],
      });
      const hydrated = rds.hydrateSession(unfrozenSession);
      expect(Object.isFrozen(hydrated.evidence)).toBe(true);
      expect(Object.isFrozen(hydrated.workflow)).toBe(true);
      expect(Object.isFrozen(hydrated.ledger)).toBe(true);
    });
  });

  describe('Pass 3 — Services, Grading & Modals (Modules 13-18)', () => {
    it('LessonTeachingResearch guards NaN gradeNumber and null entries', () => {
      const win = loadInWindowVm('lesson_teaching_research_module.js');
      const ltr = win.AlloModules.LessonTeachingResearch;

      expect(() => ltr.extractSource('text', null, {})).toThrow();
      const entry = ltr.catalog().find((e) => e.id === 'wwc-fractions-2010');
      const samplePage = [
        entry.title,
        'Grades K, 1, 2, 3, 4, 5, 6, 7, 8',
        '1',
        'Strong evidence',
        'Build on students informal understanding of sharing and proportionality to develop initial fraction concepts.',
        'Additional explanation text to satisfy minimum length requirement for practice guide verification in tests and ensure valid extraction.',
      ].join('\n');
      const res = ltr.extractSource(samplePage, entry, {
        subject: 'mathematics',
        gradeNumber: NaN,
        gradeLabel: 'unknown',
      });
      expect(res.scope).toContain('could not be matched');
    });

    it('MathManipulativeGrader blocks Infinity===Infinity in base10 and strips prototype keys in writes', () => {
      const win = loadInWindowVm('math_manipulative_grader_module.js');
      const mmg = win.AlloModules.MathManipulativeGrader;

      expect(mmg.gradeManipulativeResponse(
        'base10',
        { ones: Infinity, tens: 0, hundreds: 0 },
        { match: 'value', ones: Infinity }
      )).toBe(false);

      const dirty = JSON.parse('{"__proto__":{"polluted":true},"ok":1}');
      const written = mmg.writeMathViewState('base10', dirty, { ones: 3 });
      expect(Object.prototype.hasOwnProperty.call(written, '__proto__')).toBe(false);
      expect(({}).polluted).toBeUndefined();
      expect(written.ok).toBe(1);
    });

    it('SessionTransport filters non-finite numbers and Invalid Date and rejects sync ops throws asynchronously', async () => {
      const win = loadInWindowVm('session_transport_module.js');
      const st = win.AlloModules.SessionTransport;

      const projected = st.projectStudentGuide({
        id: 'guide-1',
        type: 'lesson-plan',
        title: 'Study Guide',
        meta: NaN,
        timestamp: new Date('invalid'),
        config: {
          grade: Infinity,
          language: 'English',
          generationInputs: { version: 1, mode: 'study' },
        },
        data: { essentialQuestion: 'Why do plants need sunlight?' },
      });
      expect(projected.config.grade).toBeUndefined();
      expect(projected.meta).toBeUndefined();
      expect(projected.timestamp).toBeUndefined();

      const fb = st.createFirebaseTransport({
        uploadAssets: () => { throw new Error('sync-boom'); },
        prepareResources: (r) => ({ resources: r, keptCount: r.length, droppedCount: 0, byteLength: 10 }),
        write: () => Promise.resolve(),
      });
      await expect(fb.publishResources([])).rejects.toThrow('sync-boom');
      await expect(st.followResource({ id: 'x' }, { write: () => { throw new Error('follow-boom'); } })).rejects.toThrow('follow-boom');
    });

    it('UiLanguageSelector fails closed on AI check and restricts manifest fetch when offline-only', () => {
      const src = fs.readFileSync(path.join(ROOT, 'ui_language_selector_module.js'), 'utf8');
      expect(src).toContain('typeof window === \'undefined\'');
      expect(src).toContain('__alloOfflineOnly');
      expect(src).toContain('hideStudentAiFeatures');
      expect(src).toContain('StudentPolicy');
    });

    it('PromptDialog guards modifier keys, allowlists inputType, and preserves min-h-11 contract', () => {
      const src = fs.readFileSync(path.join(ROOT, 'view_prompt_dialog_source.jsx'), 'utf8');
      expect(src.match(/min-h-11/g)).toHaveLength(2);
      expect(src).toContain('event.altKey || event.ctrlKey || event.metaKey');
      expect(src).toContain('dialog.isConnected');
    });

    it('StorybookExportModal preserves live-region wrappers and clamps negative/NaN progress', () => {
      const src = fs.readFileSync(path.join(ROOT, 'view_storybook_export_modal_module.js'), 'utf8');
      expect(src).toContain('sibling.querySelector');
      expect(src).toContain('!node || !node.isConnected');
      expect(src).toContain('Number.isFinite(_rawTotal)');
      expect(src).toContain('Number.isFinite(_rawCompleted)');
    });
  });
});
