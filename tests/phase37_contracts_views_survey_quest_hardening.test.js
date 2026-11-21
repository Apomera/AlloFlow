import { describe, expect, it, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readBuf = (rel) => fs.readFileSync(path.join(ROOT, rel));

const PHASE37_FILES = [
  'agent_core_ui_adapter_module.js',
  'question_board_contract_module.js',
  'question_board_view_module.js',
  'survey_item_schema_module.js',
  'allo_quest_contract_module.js',
];

const MIRRORS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('Phase 37 — Mirror Parity & 3-Host SRI Delivery Sync', () => {
  it('keeps all 5 Phase 37 modules byte-identical across 4-way mirrors and synced across all 3 host manifests', () => {
    const manifestHelper = require('../dev-tools/build_browser_delivery_manifest.cjs');
    const releaseIds = [];

    for (const rel of PHASE37_FILES) {
      const rootBuf = readBuf(rel);
      for (const mirror of MIRRORS) {
        const mirrorDir = path.join(ROOT, mirror);
        if (!fs.existsSync(mirrorDir)) continue;
        const mirrorBuf = fs.readFileSync(path.join(mirrorDir, rel));
        expect(mirrorBuf.equals(rootBuf), `${mirror}/${rel} must match root`).toBe(true);
      }
    }

    for (const host of HOSTS) {
      const embedded = manifestHelper.readEmbeddedManifest(read(host));
      expect(embedded && embedded.assets, host).toBeTruthy();
      const { releaseId, ...body } = embedded;
      const expectedReleaseId = crypto.createHash('sha256').update(manifestHelper.canonical(body)).digest('hex');
      expect(releaseId, `${host} canonical releaseId`).toBe(expectedReleaseId);
      releaseIds.push(releaseId);

      for (const rel of PHASE37_FILES) {
        const rootBuf = readBuf(rel);
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        expect(embedded.assets[rel], `${host} missing ${rel}`).toBeTruthy();
        expect(embedded.assets[rel].bytes, `${host} bytes for ${rel}`).toBe(rootBuf.length);
        expect(embedded.assets[rel].integrity, `${host} SRI for ${rel}`).toBe(expectedSri);
      }
    }

    expect(new Set(releaseIds).size).toBe(1);
  });
});

describe('Phase 37 — agent_core_ui_adapter_module.js hardening', () => {
  const Adapter = require('../agent_core_ui_adapter_module.js');

  afterEach(() => {
    delete window.__alloStudentAiDisabled;
    delete window.__alloQrStudentMode;
  });

  it('blocks createDraft and reviseLegacy fail-closed in student AI-off/QR modes and strips prototype keys', async () => {
    const ctx = Adapter.normalizeContext({
      outputLanguagePreference: JSON.parse('{"mode":"es","__proto__":{"polluted":true}}'),
    });
    expect(ctx.outputLanguagePreference.mode).toBe('es');
    expect(Object.prototype.hasOwnProperty.call(ctx.outputLanguagePreference, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();

    let called = false;
    const ui = Adapter.createUIAdapter({
      autoConfigure: async () => { called = true; return { resourcePlan: ['analysis'] }; },
      modifyBlueprint: async () => { called = true; return { resourcePlan: ['analysis'] }; },
    });

    window.__alloStudentAiDisabled = true;
    await expect(ui.createDraft({ sourceText: 'Test' })).rejects.toThrow(/AI generation is disabled/i);
    await expect(ui.reviseLegacy({ resourcePlan: ['analysis'] }, 'add quiz', {})).rejects.toThrow(/AI generation is disabled/i);
    expect(called).toBe(false);

    delete window.__alloStudentAiDisabled;
    const prep = ui.prepareExecution({ resourcePlan: ['analysis', 'lesson-plan'] }, { gradeLevel: '6th Grade' }, '  Teacher\u0000' + 'A'.repeat(300));
    expect(prep.ok).toBe(true);
    expect(prep.blueprint.review.reviewer.length).toBe(200);
    expect(prep.blueprint.review.reviewer).not.toContain('\u0000');
  });
});

describe('Phase 37 — question_board_contract_module.js & question_board_view_module.js hardening', () => {
  const C = require('../question_board_contract_module.js');
  const V = require('../question_board_view_module.js');
  const AID = 'AC-0123abcd-0123-4567-89ab-0123456789ab';

  it('strips prototype keys and invalid expiresAt in normalizeBoardConfig and guards Infinity timestamps', () => {
    const cfg = C.normalizeBoardConfig(JSON.stringify({
      activityId: AID,
      type: 'question_board',
      prompt: 'What causes tides?',
      expiresAt: 'not-a-date\n# Injected',
    }));
    expect(cfg).toBeTruthy();
    expect(cfg.expiresAt).toBe('');

    const item = C.normalizeItem({ text: 'Why?', createdAt: Infinity }, { uid: 'S-1', role: 'participant' });
    expect(Number.isFinite(item.createdAt)).toBe(true);

    const answered = C.markAnswered(item, { at: Infinity, note: 'Explained\u0000' });
    expect(Number.isFinite(answered.answered.at)).toBe(true);
    expect(answered.answered.note).toBe('Explained');
  });

  it('counts prototype-named uids safely via Set and escapes HTML/newlines/expiresAt in Markdown export', () => {
    const board = {
      config: { activityId: AID, type: 'question_board', prompt: 'Tides <script>x</script>', minParticipants: 3, itemsPerStudent: 2, boardCap: 20, expiresAt: '2026-12-01\n# Forged' },
      items: [
        { id: '1', uid: '__proto__', displayName: 'A', text: 'First <img onerror=1>\n# H1', status: 'approved', answered: false },
        { id: '2', uid: 'constructor', displayName: 'B', text: 'Second', status: 'approved', answered: false },
        { id: '3', uid: 'S-3', displayName: 'C', text: 'Third', status: 'approved', answered: false },
      ],
    };

    const vm = V.buildBoardViewModel(C, board, { uid: 'S-3', role: 'participant' }, {});
    expect(vm.floorPending).toBe(false);

    const tvm = V.buildTeacherViewModel(C, board, { uid: 'T-1', role: 'host' }, {});
    expect(tvm.participantCount).toBe(3);

    const exported = V.exportBoardRecord(C, board);
    expect(exported.stats.students).toBe(3);
    expect(exported.markdown).toContain('\\<script\\>');
    expect(exported.markdown).toContain('\\<img onerror=1\\>');
    expect(exported.markdown).not.toContain('\n# Forged');
    expect(exported.markdown).not.toContain('\n# H1');
  });
});

describe('Phase 37 — survey_item_schema_module.js hardening', () => {
  const S = require('../survey_item_schema_module.js');

  it('rejects non-raster/XSS image URLs, clamps extreme step counts against OOM, and guards non-array options', () => {
    const [item] = S.fromResearchSuite([{
      id: 'q1',
      text: 'How clear was the lesson?',
      type: 'likert',
      labels: [
        { text: 'Low', image: 'javascript:alert(1)' },
        { text: 'Mid', image: 'data:image/svg+xml;base64,PHN2Zy8+' },
        { text: 'High', image: 'https://evil.example/tracker.png' },
        { text: 'Great', image: 'data:image/png;base64,iVBORw0KGgo=' },
      ],
    }]);
    expect(item.labels[0].image).toBeNull();
    expect(item.labels[1].image).toBeNull();
    expect(item.labels[2].image).toBeNull();
    expect(item.labels[3].image).toBe('data:image/png;base64,iVBORw0KGgo=');

    // Extreme steps must clamp safely instead of OOMing
    const extreme = S.normalizeItem({ text: 'Rate', type: 'likert', steps: 999999999 }, 0);
    expect(extreme.steps).toBe(50);
    expect(S.researchValidity([extreme]).problems.some((p) => p.code === 'steps-too-many')).toBe(true);
    expect(S.toQuizItems([extreme])[0].options).toHaveLength(50);

    const rating = S.fromMailboxActivity({ activityId: 'AC-1', type: 'rating', prompt: 'Rate', minValue: 1, maxValue: 999999999 });
    expect(rating.steps).toBe(50);

    // Non-array options in mailbox activity must not throw
    const malformed = S.fromMailboxActivity({
      type: 'survey',
      items: [{ id: 'i1', type: 'choice', text: 'Pick one', options: 'not-an-array' }],
    });
    expect(malformed).toHaveLength(1);
    expect(malformed[0].options).toEqual([]);
  });
});

describe('Phase 37 — allo_quest_contract_module.js hardening', () => {
  const Q = require('../allo_quest_contract_module.js');

  it('rejects prototype keys, blocks Infinity completion/formatting, and freezes contract registries', () => {
    expect(Q.formatProgress('toString', 5, 10)).toBe('');
    expect(Q.isComplete('constructor', 10, 5)).toBe(false);
    expect(Q.isComplete('time', Infinity, 10)).toBe(false);
    expect(Q.formatProgress('time', 5, Infinity)).toBe('');
    expect(Q.isComplete('time', 10, 10)).toBe(true);
    expect(Q.formatProgress('time', 4, 10)).toBe('4/10 min');

    expect(Object.isFrozen(Q.KINDS)).toBe(true);
    expect(Object.isFrozen(Q.KINDS.time)).toBe(true);
    expect(Object.isFrozen(Q.MEASURES)).toBe(true);
    expect(Object.isFrozen(Q.DIRECTIONS_KIND_MAP)).toBe(true);
  });
});
