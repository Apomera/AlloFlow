import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  if (!Hub) throw new Error('TestPrepHub did not register');
});

describe('Test Prep Hub exam-pack contract', () => {
  it('registers the demo and the source-reviewed EPPP pilot', () => {
    const packs = Hub.listPacks();
    const demo = packs.find((pack) => pack.id === 'workplace-safety-foundations-demo');
    const eppp = packs.find((pack) => pack.id === 'eppp-part-one');

    expect(Hub.schemaVersion).toBe(1);
    expect(demo.status).toBe('ready');
    expect(demo.items).toHaveLength(5);
    expect(eppp.status).toBe('ready');
    expect(eppp.items).toHaveLength(1500);
    expect(eppp.batchSize).toBe(100);
    expect(eppp.domains).toHaveLength(8);
    expect(new Set(eppp.items.map((item) => item.domainId)).size).toBe(8);
    expect(eppp.items.every((item) => item.reviewStatus === 'source-reviewed')).toBe(true);
    expect(eppp.items.every((item) => item.references.length > 0)).toBe(true);
    expect(eppp.items.every((item) => item.choiceRationales.length === item.choices.length)).toBe(true);
    expect(eppp.legacyUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/eppp_legacy/index.html?embedded=1');
    expect(eppp.nativeQaUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/eppp_native_qa.json');
    expect(eppp.learningLibraryUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library.json');
    expect(eppp.learningLibraryQaUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library_qa.json');
    expect(eppp.legacyAuditUrl).toBe('');
    expect(eppp.nextReviewDocketUrl).toBe('');
    expect(eppp.curation500Url).toBe('');
    expect(eppp.curation1000Url).toBe('');
    expect(eppp.expansionAuditUrl).toBe('');
    expect(eppp.blueprintLabel).toContain('2026-2027');
    expect(eppp.officialBlueprintUrl).toMatch(/^https:\/\/asppb\.net\//);
    expect(eppp.transitionNotice).toContain('integrated six-domain EPPP');
    expect(eppp.disclaimer).toContain('not official scores or pass predictions');
  });

  it('organizes the EPPP bank into fifteen blueprint-balanced batches of 100', () => {
    const eppp = Hub.listPacks().find((pack) => pack.id === 'eppp-part-one');
    const expected = { biological: 10, 'cognitive-affective': 13, 'social-cultural': 11, lifespan: 12, assessment: 16, intervention: 15, research: 7, professional: 16 };

    expect(new Set(eppp.items.map((item) => item.id)).size).toBe(1500);
    for (let batchIndex = 0; batchIndex < 15; batchIndex += 1) {
      const batch = eppp.items.slice(batchIndex * 100, batchIndex * 100 + 100);
      const counts = Object.fromEntries(Object.keys(expected).map((domainId) => [domainId, batch.filter((item) => item.domainId === domainId).length]));
      expect(batch).toHaveLength(100);
      expect(counts).toEqual(expected);
    }
    expect(Hub.batchMeta(eppp, 99)).toMatchObject({ batchNumber: 1, batchCount: 15, position: 100, startIndex: 0, endIndex: 100 });
    expect(Hub.batchMeta(eppp, 100)).toMatchObject({ batchNumber: 2, batchCount: 15, position: 1, startIndex: 100, endIndex: 200 });
  });

  it('keeps the repaired Pack 2 answer keys aligned with their explanations', () => {
    const eppp = Hub.listPacks().find((pack) => pack.id === 'eppp-part-one');
    const packTwo = eppp.items.slice(100, 200);
    const custodyItem = packTwo.find((item) => item.id === 'eppp-b008-professional-1');
    const allianceItem = packTwo.find((item) => item.id === 'eppp-b008-intervention-1');

    expect(custodyItem).toBeTruthy();
    expect(custodyItem.choices[custodyItem.answerIndex]).toContain('conflicting forensic and therapeutic roles');
    expect(custodyItem.choiceRationales[custodyItem.answerIndex]).toContain('conflicting obligations');
    expect(allianceItem).toBeTruthy();
    expect(allianceItem.choices[allianceItem.answerIndex]).toContain('consistent correlate of treatment outcome');
    expect(allianceItem.choiceRationales[allianceItem.answerIndex]).toContain('positive association');
    expect([custodyItem, allianceItem].every((item) => item.choiceRationales.length === item.choices.length)).toBe(true);
  });

  it('builds descriptive domain and confidence diagnostics without a pass claim', () => {
    const pack = Hub.normalizePack({
      id: 'diagnostic-fixture', title: 'Diagnostic fixture', status: 'ready', batchSize: 2,
      domains: [{ id: 'one', label: 'Domain one' }, { id: 'two', label: 'Domain two' }],
      items: [
        { id: 'q1', domainId: 'one', skillIds: ['skill-one'], chapterIds: ['chapter-one'], prompt: 'One?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'q2', domainId: 'two', skillIds: ['skill-two'], chapterIds: ['chapter-two'], prompt: 'Two?', choices: ['Yes', 'No'], answerIndex: 1 },
        { id: 'q3', domainId: 'one', skillIds: ['skill-one'], chapterIds: ['chapter-one'], prompt: 'Three?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'q4', domainId: 'two', skillIds: ['skill-two'], chapterIds: ['chapter-two'], prompt: 'Four?', choices: ['Yes', 'No'], answerIndex: 1 },
      ],
    });
    const diagnostic = Hub.buildBatchDiagnostic(pack, { q1: 0, q2: 0 }, { q1: 'sure', q2: 'sure' }, 1);

    expect(diagnostic).toMatchObject({ batchNumber: 1, batchCount: 2, firstQuestion: 1, lastQuestion: 2, correct: 1, total: 2, percent: 50, isFinalBatch: false });
    expect(diagnostic.domainRows).toEqual([
      expect.objectContaining({ id: 'one', correct: 1, total: 1, percent: 100 }),
      expect.objectContaining({ id: 'two', correct: 0, total: 1, percent: 0 }),
    ]);
    expect(diagnostic.confidentMissQuestionNumbers).toEqual([2]);
    expect(diagnostic.feedback.join(' ')).toContain('Review confident misses first');
    expect(diagnostic.skillRows).toEqual([
      expect.objectContaining({ id: 'skill-one', correct: 1, total: 1, percent: 100 }),
      expect.objectContaining({ id: 'skill-two', correct: 0, total: 1, percent: 0 }),
    ]);
    expect(diagnostic.focusSkillIds).toEqual(['skill-two']);
    expect(diagnostic).not.toHaveProperty('passed');
    expect(diagnostic).not.toHaveProperty('readiness');
  });

  it('records a selected practice bank with its global bank number and question range', () => {
    const pack = Hub.normalizePack({
      id: 'global-bank-fixture', title: 'Global bank fixture', status: 'ready', batchSize: 2,
      domains: [{ id: 'one', label: 'Domain one' }],
      items: [
        { id: 'q5', domainId: 'one', prompt: 'Five?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'q6', domainId: 'one', prompt: 'Six?', choices: ['Yes', 'No'], answerIndex: 1 },
      ],
    });
    const diagnostic = Hub.buildBatchDiagnostic(pack, { q5: 0, q6: 1 }, {}, 1);
    const recorded = Hub.recordBatchAttempt({ attempts: [] }, pack, {
      ...diagnostic,
      sourceBatchNumber: 3,
      sourceBatchCount: 10,
      sourceFirstQuestion: 5,
      sourceLastQuestion: 6,
    }, {}, 1234, {
      mode: 'diagnostic',
      label: 'Practice Bank 3 of 10',
      sourceStartIndex: 4,
      sourceItemCount: 20,
      sourceBatchSize: 2,
    });

    expect(recorded.attempts).toHaveLength(1);
    expect(recorded.attempts[0]).toMatchObject({
      mode: 'diagnostic',
      label: 'Practice Bank 3 of 10',
      batchNumber: 3,
      batchCount: 10,
      firstQuestion: 5,
      lastQuestion: 6,
      correct: 2,
      total: 2,
    });
  });
  it('normalizes imported pack fields and applies safe limits', () => {
    const pack = Hub.normalizePack({
      id: ' My New Pack ',
      title: 'A'.repeat(250),
      status: 'unknown',
      batchSize: 25,
      simulationItemCount: 90,
      simulationTimeMinutes: 150,
      domains: [{ label: 'Core Skills', weight: '0.5' }],
      items: [{
        prompt: 'Question?',
        options: ['One', 'Two'],
        answer: 1,
        choiceRationales: ['Option one explanation', 'Option two explanation'],
        domainId: 'Core Skills',
        skillIds: ['Core Skill', 'Application'],
        chapterIds: ['Chapter 1'],
        references: Array.from({ length: 12 }, (_, index) => 'Reference ' + index),
      }],
    });

    expect(pack.id).toBe('my-new-pack');
    expect(pack.title).toHaveLength(180);
    expect(pack.status).toBe('research');
    expect(pack.batchSize).toBe(25);
    expect(pack).toMatchObject({ simulationItemCount: 90, simulationTimeMinutes: 150 });
    expect(pack.domains[0]).toMatchObject({ id: 'core-skills', weight: 0.5 });
    expect(pack.items[0]).toMatchObject({ type: 'single-choice', answerIndex: 1, domainId: 'core-skills' });
    expect(pack.items[0].skillIds).toEqual(['core-skill', 'application']);
    expect(pack.items[0].chapterIds).toEqual(['chapter-1']);
    expect(pack.items[0].choiceRationales).toEqual(['Option one explanation', 'Option two explanation']);
    expect(pack.items[0].references).toHaveLength(8);
    expect(Hub.normalizePack({ id: 'remote', title: 'Remote', legacyUrl: 'https://example.com/app' }).legacyUrl).toBe('');
    expect(Hub.normalizePack({ id: 'escape', title: 'Escape', legacyUrl: './test_prep/../secret' }).legacyUrl).toBe('');
    expect(Hub.normalizePack({ id: 'remote-audit', title: 'Remote audit', legacyAuditUrl: 'https://example.com/audit.json' }).legacyAuditUrl).toBe('');
    expect(Hub.normalizePack({ id: 'trusted-cdn', title: 'Trusted CDN', learningLibraryUrl: 'https://alloflow-cdn.pages.dev/test_prep/catalog.json' }).learningLibraryUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/catalog.json');
    expect(Hub.normalizePack({ id: 'wrong-raw-repo', title: 'Wrong raw repo', learningLibraryUrl: 'https://raw.githubusercontent.com/Other/Repo/main/test_prep/catalog.json' }).learningLibraryUrl).toBe('');
  });

  it('resolves repository JSON through CDN, GitHub raw, and local-development candidates', async () => {
    const logicalUrl = './test_prep/catalog.json';
    expect(Hub.repoAssetCandidates(logicalUrl)).toEqual([
      'https://alloflow-cdn.pages.dev/test_prep/catalog.json',
      'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_prep/catalog.json',
      './test_prep/catalog.json',
    ]);

    const originalFetch = global.fetch;
    const originalWindowFetch = window.fetch;
    const calls = [];
    const fetchMock = async (url) => {
      calls.push(String(url));
      if (calls.length === 1) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ schemaVersion: 1, summary: {}, chapters: [] }) };
    };
    global.fetch = window.fetch = fetchMock;
    try {
      const catalog = await Hub.fetchRepoJson(logicalUrl, (value) => value && value.schemaVersion === 1);
      expect(catalog.schemaVersion).toBe(1);
      expect(calls).toEqual([
        'https://alloflow-cdn.pages.dev/test_prep/catalog.json',
        'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_prep/catalog.json',
      ]);
    } finally {
      global.fetch = originalFetch;
      window.fetch = originalWindowFetch;
    }
  });

  it('rejects invalid answer keys and empty ready packs', () => {
    const badItem = Hub.validatePack({
      id: 'bad',
      title: 'Bad pack',
      status: 'ready',
      items: [{ prompt: 'Question?', choices: ['A', 'B'], answerIndex: 4 }],
    });
    const empty = Hub.validatePack({ id: 'empty', title: 'Empty', status: 'ready', items: [] });

    expect(badItem.valid).toBe(false);
    expect(badItem.errors.join(' ')).toContain('invalid answer index');
    expect(empty.valid).toBe(false);
    expect(empty.errors.join(' ')).toContain('must contain at least one item');
  });

  it('scores by item and domain without inventing a credential score', () => {
    const demo = Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo');
    const answers = Object.fromEntries(demo.items.map((item, index) => [item.id, index === 0 ? item.answerIndex : -1]));
    const score = Hub.scoreAttempt(demo, answers);

    expect(score).toMatchObject({ correct: 1, total: 5, percent: 20 });
    expect(score).not.toHaveProperty('scaledScore');
    expect(score).not.toHaveProperty('passed');
    expect(score.byDomain['hazard-awareness'].total).toBe(2);
  });

  it('aggregates pack progress by domain, skill, confidence, mode, and repeated items', () => {
    const analytics = Hub.buildProgressAnalytics({
      attempts: [
        {
          id: 'a1', packId: 'ParaPro Pack', correct: 8, total: 10, percent: 80, mode: 'diagnostic',
          byDomain: { reading: { correct: 4, total: 5 }, mathematics: { correct: 4, total: 5 } },
          bySkill: { 'reading-main-evidence': { correct: 4, total: 5 }, 'mathematics-number-operations': { correct: 4, total: 5 } },
          confidenceSummary: { sure: { correct: 6, total: 7 }, unsure: { correct: 2, total: 3 } },
          itemIds: ['q1', 'q2'],
        },
        {
          id: 'a2', packId: 'ParaPro Pack', correct: 7, total: 10, percent: 70, mode: 'targeted',
          byDomain: { reading: { correct: 7, total: 10 } },
          bySkill: { 'reading-main-evidence': { correct: 7, total: 10 } },
          confidenceSummary: { sure: { correct: 5, total: 7 }, guess: { correct: 2, total: 3 } },
          itemIds: ['q2', 'q3'],
        },
      ],
    }, 'parapro-pack');

    expect(analytics).toMatchObject({
      attemptCount: 2,
      averagePercent: 75,
      uniqueItemsAttempted: 3,
      repeatedItems: 1,
      repeatedResponses: 1,
      modeCounts: { diagnostic: 1, targeted: 1 },
    });
    expect(analytics.byDomain.reading).toEqual({ correct: 11, total: 15 });
    expect(analytics.bySkill['reading-main-evidence']).toEqual({ correct: 11, total: 15 });
    expect(analytics.confidenceSummary.sure).toMatchObject({ correct: 11, total: 14, percent: 79 });
  });

  it('builds deterministic domain and difficulty focus sets and preserves targeting metadata', () => {
    const pack = Hub.normalizePack({
      id: 'targeted-fixture', title: 'Targeted fixture', status: 'ready',
      domains: [{ id: 'alpha', label: 'Alpha domain' }, { id: 'beta', label: 'Beta domain' }],
      items: [
        { id: 'alpha-foundation', domainId: 'alpha', difficulty: 'foundation', prompt: 'Foundation?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'alpha-intermediate', domainId: 'alpha', difficulty: 'intermediate', prompt: 'Intermediate?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'alpha-advanced-warning', domainId: 'alpha', difficulty: 'advanced', prompt: 'Advanced warning candidate?', choices: ['Yes', 'No'], answerIndex: 0, diagnosticWarnings: ['warning-only'] },
        { id: 'alpha-advanced-two', domainId: 'alpha', difficulty: 'advanced', prompt: 'Advanced two?', choices: ['Yes', 'No'], answerIndex: 0 },
        { id: 'beta-advanced', domainId: 'beta', difficulty: 'advanced', prompt: 'Beta?', choices: ['Yes', 'No'], answerIndex: 0 },
      ],
    });
    const options = { domainId: 'Alpha', difficulties: ['Intermediate', 'advanced', 'advanced'], limit: 20, seed: 'stable-focus-seed' };
    const first = Hub.buildTargetedSet(pack, options);
    const repeated = Hub.buildTargetedSet(pack, options);

    expect(first).toMatchObject({
      strategy: 'domain-difficulty-targeted-v1',
      packId: 'targeted-fixture',
      domainId: 'alpha',
      domainLabel: 'Alpha domain',
      difficulties: ['intermediate', 'advanced'],
      requestedLength: 20,
      eligibleCount: 3,
      limit: 3,
    });
    expect(repeated.itemIds).toEqual(first.itemIds);
    expect(new Set(first.itemIds)).toEqual(new Set(['alpha-intermediate', 'alpha-advanced-warning', 'alpha-advanced-two']));
    expect(first.items.every((item) => item.domainId === 'alpha' && ['intermediate', 'advanced'].includes(item.difficulty))).toBe(true);
    expect(Hub.buildTargetedSet(pack, { domainId: 'missing', limit: 20 }).items).toEqual([]);

    const focusedPack = { ...pack, items: first.items };
    const answers = Object.fromEntries(first.items.map((item) => [item.id, item.answerIndex]));
    const recorded = Hub.recordAttempt({ attempts: [] }, focusedPack, answers, {}, 1234, {
      mode: 'targeted',
      label: 'Domain focus: Alpha domain',
      targetDomainId: 'Alpha',
      targetDifficulties: ['Intermediate', 'advanced', 'advanced'],
      itemIds: first.itemIds,
    });
    expect(recorded.attempts[0]).toMatchObject({
      mode: 'targeted',
      targetDomainId: 'alpha',
      targetDifficulties: ['intermediate', 'advanced'],
      correct: 3,
      total: 3,
      itemIds: first.itemIds,
    });
    expect(Hub.normalizeProgress(recorded).attempts[0]).toMatchObject({
      targetDomainId: 'alpha',
      targetDifficulties: ['intermediate', 'advanced'],
    });
  });

  it('normalizes stored attempts and excludes impossible records', () => {
    const progress = Hub.normalizeProgress({
      attempts: [
        { id: 'ok', packId: 'Demo Pack', correct: 2, total: 4, percent: 50 },
        { id: 'bad', packId: 'Demo Pack', correct: 9, total: 4, percent: 200 },
      ],
    });
    expect(progress.attempts).toHaveLength(1);
    expect(progress.attempts[0]).toMatchObject({ packId: 'demo-pack', percent: 50 });
  });
});

describe('Test Prep Hub host contract', () => {
  it('is registered, lazy-loaded, gated, and exposed in Learning Tools', () => {
    const app = fs.readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const launcher = fs.readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_source.jsx'), 'utf8');
    const build = fs.readFileSync(resolve(process.cwd(), 'build.js'), 'utf8');

    expect(app).toContain("loadModule('TestPrepHub'");
    expect(app).toContain('moduleKey="TestPrepHub"');
    expect(app).toContain('setIsTestPrepHubOpen={setIsTestPrepHubOpen}');
    expect(launcher).toContain("'Test Prep Hub'");
    expect(launcher).toContain('setIsTestPrepHubOpen(true)');
    expect(build).toContain("filename: 'test_prep_hub_module.js'");

    const legacyIndex = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/index.html'), 'utf8');
    const deployedLegacyIndex = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_legacy/index.html'), 'utf8');
    expect(legacyIndex).not.toMatch(/js\/auth\.js/i);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_legacy/js/auth.js'))).toBe(false);
    const legacyApp = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/js/app.js'), 'utf8');
    expect(legacyApp).not.toMatch(/AUTH & PAYWALL GATE|renderPaywall/);
    expect(legacyIndex).toContain('alloflow_embed.js');
    const legacyBridge = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/alloflow_embed.js'), 'utf8');
    const legacyEmbedCss = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/alloflow_embed.css'), 'utf8');
    const deployedLegacyEmbedCss = fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_legacy/alloflow_embed.css'), 'utf8');
    expect(legacyBridge).toContain('not official EPPP equating');
    expect(legacyBridge).not.toContain('legacy workspace');
    expect(legacyIndex).toContain('AlloFlow Study Suite');
    expect(legacyIndex).not.toContain('AlloFlow Legacy Workspace');
    expect(deployedLegacyIndex).toBe(legacyIndex);
    expect(legacyEmbedCss).toContain('0.875rem/1.45');
    expect(legacyEmbedCss).not.toContain('14px/1.45');
    expect(deployedLegacyEmbedCss).toBe(legacyEmbedCss);
    expect(fs.existsSync(resolve(process.cwd(), 'dev-tools/import_eppp_legacy.cjs'))).toBe(true);
  });
});

