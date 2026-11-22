import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(__dirname, '..');

function loadInSandbox(fileName, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, fileName), 'utf8');
  const win = Object.assign({ AlloModules: {} }, extraGlobals.window || {});
  const sandbox = Object.assign({
    window: win,
    console: { log() {}, warn() {}, error() {} },
    URL,
    Intl,
    Set,
    Map,
    Promise,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    RegExp,
    Error,
    setInterval,
    clearInterval,
  }, extraGlobals);
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: fileName });
  return { window: win, sandbox };
}

describe('Phase 49 hardening — LabelPositions & CanvasTips', () => {
  it('hardens label_positions_module.js with null-prototype frozen map and window guard', () => {
    const code = fs.readFileSync(path.join(ROOT, 'label_positions_module.js'), 'utf8');
    // Safe when window is undefined
    expect(() => vm.runInNewContext(code, { console: { log() {}, warn() {} } })).not.toThrow();

    const { window: win } = loadInSandbox('label_positions_module.js');
    const lp = win.AlloModules.LabelPositions.LABEL_POSITIONS;
    expect(Object.getPrototypeOf(lp)).toBeNull();
    expect(lp['toString']).toBeUndefined();
    expect(lp['constructor']).toBeUndefined();
    expect(lp['top-left'].position).toBe('absolute');
    expect(Object.isFrozen(lp)).toBe(true);
    expect(Object.isFrozen(lp['top-left'])).toBe(true);
    expect(Object.isFrozen(win.AlloModules.LabelPositions)).toBe(true);
  });

  it('hardens canvas_tips_module.js with frozen tips, React guard, and window guard', () => {
    const code = fs.readFileSync(path.join(ROOT, 'canvas_tips_module.js'), 'utf8');
    expect(() => vm.runInNewContext(code, { console: { log() {}, warn() {} } })).not.toThrow();

    const { window: win } = loadInSandbox('canvas_tips_module.js');
    const mod = win.AlloModules.CanvasTips;
    expect(Object.isFrozen(mod)).toBe(true);
    expect(Object.isFrozen(mod.CANVAS_LOADING_TIPS)).toBe(true);
    expect(mod.CANVAS_LOADING_TIPS.length).toBeGreaterThan(0);
    // Gracefully returns null when React is absent
    expect(mod.CanvasLoadingTips()).toBeNull();
  });
});

describe('Phase 49 hardening — instructional_context_module.js', () => {
  const { window: win } = loadInSandbox('instructional_context_module.js');
  const IC = win.AlloModules.InstructionalContext;

  it('blocks SVG data URIs and unsafe/credentialed HTTPS URLs in normalizeSupportImage while preserving valid PNG and clean URLs', () => {
    const svgImg = IC.normalizeSupportImage({
      src: 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+',
      alt: 'evil svg',
    });
    expect(svgImg).toBeNull();

    const validPng = 'data:image/png;base64,' + 'A'.repeat(377);
    const ok = IC.normalizeSupportImage({
      src: validPng,
      alt: 'clean symbol',
      source: 'mulberry',
      attribution: {
        set: 'Mulberry',
        author: 'Straight Street',
        url: 'https://mulberrysymbols.org',
        licenseUrl: 'https://user:pass@evil.test/steal',
      },
    });
    expect(ok).not.toBeNull();
    expect(ok.attribution.url).toBe('https://mulberrysymbols.org');
    expect(ok.attribution.licenseUrl).toBeUndefined();

    const injectedUrl = IC.normalizeSupportImage({
      src: validPng,
      alt: 'bad url',
      attribution: {
        set: 'Mulberry',
        url: 'https://evil.test/" onclick="alert(1)',
      },
    });
    expect(injectedUrl.attribution.url).toBe('');
  });

  it('prevents Object.prototype lookups in GRADE_CALIBRATION, preserves real English word "constructor", and blocks __proto__ smuggling', () => {
    expect(IC.getComplexityTarget('toString')).toBeNull();
    expect(IC.getComplexityTarget('constructor')).toBeNull();
    expect(IC.complexityStatus(5, 'toString')).toBe('unavailable');

    const text = 'A constructor builds the initial object state cleanly.';
    const item = {
      id: 'adapted-1',
      type: 'simplified',
      data: text,
      instructionalText: { form: 'adapted', role: 'supplemental' },
    };
    const imported = IC.importOriginalSupportsIntoAdapted(item, null, [
      { quote: 'constructor', text: 'A special setup method.' },
    ]);
    expect(imported.annotations.some((a) => a.quote === 'constructor')).toBe(true);

    const snap = IC.createSourceSnapshot(text);
    const smuggled = JSON.parse(
      '{"__proto__":{"origin":"educator","image":{"src":"data:image/png;base64,AAAA","alt":"x"}},"start":2,"end":13,"quote":"constructor","text":"Setup method"}'
    );
    const validated = IC.validateReadingSupports(snap, [smuggled]);
    expect(validated.annotations.length).toBe(1);
    expect(validated.annotations[0].origin).toBe('generated');
    expect(validated.annotations[0].image).toBeUndefined();
  });

  it('guards id-less items, unavailable adapted shown state, and null-prototype inputs', () => {
    const a = { type: 'simplified', data: 'Alpha text.', instructionalText: { form: 'original', role: 'unspecified' } };
    const b = { type: 'simplified', data: 'Beta text.', instructionalText: { form: 'original', role: 'unspecified' } };
    const res = IC.updateReadingFamilyRole([a, b], a, 'supplemental');
    expect(res.items[0].instructionalText.role).toBe('supplemental');
    expect(res.items[1].instructionalText.role).toBe('unspecified');

    const adapted = {
      id: 'ad-2',
      type: 'simplified',
      data: 'Sample adapted passage.',
      instructionalText: { form: 'adapted', role: 'supplemental' },
    };
    const snap = IC.getAdaptedSupportSnapshot(adapted, null);
    const badSchema = IC.validateAdaptedReadingSupports(adapted, {
      schemaVersion: 2,
      passageLength: snap.text.length,
      sourceFingerprint: snap.fingerprint,
      shown: true,
      annotations: [],
    });
    expect(badSchema.status).toBe('unavailable');
    expect(badSchema.shown).toBe(false);

    expect(() => IC.fingerprintText(Object.create(null))).not.toThrow();
    expect(() => IC.extractMeasurableSourceBody(Object.create(null))).not.toThrow();
  });
});

describe('Phase 49 hardening — concept_graph_engine_module.js', () => {
  it('blocks Object.prototype pollution in filterAlignmentGraph, prototype method call in applyStructureLayout, and unsafe sourceUrl', () => {
    const { window: win } = loadInSandbox('concept_graph_engine_module.js');
    const CGE = win.AlloModules.ConceptGraphEngine;

    const evilGraph = {
      version: 'acg/v1',
      title: 'Audit',
      nodes: [
        { id: '__proto__', label: 'Evil', type: 'standard', sourceUrl: 'javascript:alert(1)' },
        { id: 'n1', label: 'Good', type: 'standardsContext', sourceUrl: 'https://example.org/standard' },
      ],
      edges: [
        { id: 'e1', fromId: '__proto__', toId: 'n1', type: 'contains', attributionSource: 'teacher' },
      ],
      meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
    };

    const filtered = CGE.filterAlignmentGraph(evilGraph, { attributionSources: ['teacher'] });
    expect(filtered.ok).toBe(true);
    expect(({}).teacher).toBeUndefined();
    const evilNode = filtered.graph.nodes.find((n) => n.id === '__proto__');
    const goodNode = filtered.graph.nodes.find((n) => n.id === 'n1');
    expect(evilNode.sourceUrl).toBeNull();
    expect(goodNode.sourceUrl).toBe('https://example.org/standard');

    // applyStructureLayout must ignore Object.prototype method names
    const base = CGE.adaptGenerated({ main: 'Root', branches: [{ title: 'A', items: ['x'] }] });
    expect(CGE.applyStructureLayout(base, { structureType: 'toString' })).toBe(base);
    expect(CGE.applyStructureLayout(base, { structureType: 'constructor' })).toBe(base);

    // Engine export stays mutable for tests that temporarily stub properties
    const orig = CGE.fromAlignmentAudit;
    CGE.fromAlignmentAudit = undefined;
    expect(CGE.fromAlignmentAudit).toBeUndefined();
    CGE.fromAlignmentAudit = orig;
  });

  it('enforces FERPA/QR/student AI lock in layoutWithGemini, blocks scope/confirmation prototype bypasses, and survives cycles/Infinity', async () => {
    const { window: win } = loadInSandbox('concept_graph_engine_module.js');
    const CGE = win.AlloModules.ConceptGraphEngine;
    const base = CGE.adaptGenerated({ main: 'Cells', branches: [{ title: 'Parts', items: ['Nucleus'] }] });

    let called = false;
    const callGemini = () => { called = true; return '{}'; };

    win.__alloStudentAiDisabled = true;
    await expect(CGE.layoutWithGemini(base, callGemini)).rejects.toThrow(/AI layout disabled/);
    expect(called).toBe(false);
    win.__alloStudentAiDisabled = false;

    win.__alloQrStudentMode = { aiPolicy: 'off' };
    await expect(CGE.layoutWithGemini(base, callGemini)).rejects.toThrow(/AI layout disabled/);
    expect(called).toBe(false);
    win.__alloQrStudentMode = false;

    const throwingGemini = () => { throw new Error('sync boom'); };
    await expect(CGE.layoutWithGemini(base, throwingGemini)).rejects.toThrow('sync boom');

    // Scope allowlist bypass check
    const auditGraph = CGE.fromAlignmentAudit({
      standards: {
        status: 'Aligned',
        perStandard: [{
          standard: 'RL.4.1',
          status: 'Aligned',
          analysis: {
            textAlignment: { status: 'Aligned', artifactIds: ['toString', 'constructor'] },
          },
        }],
      },
      auditScope: { includedArtifacts: [{ id: 'art-1', title: 'Reading 1', type: 'simplified' }] },
    });
    const evEdges = auditGraph.edges.filter((e) => e.relationType === 'evidenceFrom');
    expect(evEdges.length).toBe(0);

    // Confirmation auto-confirm forgery check
    const forgeGraph = {
      version: 'acg/v1',
      nodes: [
        { id: 'ev1', type: 'auditEvidence' },
        { id: 'art1', type: 'auditArtifact' },
      ],
      edges: [
        { id: 'toString', fromId: 'ev1', toId: 'art1', type: 'supportedBy', attribution: 'explicit', relationType: 'evidenceFrom', attributionSource: 'audit-model' },
      ],
      meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
    };
    const confirmed = CGE.confirmExplicitAttributions(forgeGraph, []);
    expect(confirmed.edges[0].attributionSource).toBe('audit-model');

    // Infinity rejection & cycle safety
    const projected = CGE.project({ version: 'acg/v1', nodes: [{ id: 'a', x: Infinity, y: -Infinity, axisValues: { x: Infinity, y: 0.5 } }], edges: [] });
    expect(Number.isFinite(projected.nodes[0].x)).toBe(true);
    expect(Number.isFinite(projected.nodes[0].y)).toBe(true);

    const cyclicNode = { id: 'cyc', type: 'standard' };
    cyclicNode.self = cyclicNode;
    const cycRes = CGE.normalizeAlignmentGraphExport({
      version: 'acg/v1',
      nodes: [cyclicNode],
      edges: [],
      meta: { alignmentMap: { version: 'alloflow-alignment-map/v2' } },
    });
    expect(cycRes.ok).toBe(true);
  });
});

describe('Phase 49 hardening — quiz_live_aggregators.js', () => {
  const { window: win } = loadInSandbox('quiz_live_aggregators.js');
  const QLA = win.AlloModules.QuizLiveAggregators;

  it('closes numeric tolerance Infinity/boolean bypass and unit-conversion overflow', () => {
    const infTol = QLA.gradeNumericAnswer(
      { value: 999999, unit: '' },
      { correctValue: 5, tolerance: Infinity }
    );
    expect(infTol.status).toBe('incorrect');

    const boolTol = QLA.gradeNumericAnswer(
      { value: 5.5, unit: '' },
      { correctValue: 5, tolerance: true }
    );
    expect(boolTol.status).toBe('incorrect');

    const overflow = QLA.gradeNumericAnswer(
      { value: 1e308, unit: 'km' },
      { correctValue: 5, unit: 'mm', numericSettings: { allowEquivalentUnits: true } }
    );
    expect(overflow.valueCorrect).toBe(false);
    expect(overflow.convertedValue).toBeNull();
  });

  it('prevents prototype leakage in roster/item-analysis and enforces fingerprinted overrides + bounds', () => {
    const questions = [
      {
        type: 'mcq',
        question: 'Capital of France?',
        options: ['Paris', 'London'],
        correctIndex: 0,
        conceptLabel: 'European capitals',
      },
    ];
    const generatedContent = { data: { questions } };
    const allResponses = {
      toString: { 0: { answer: { optionIdx: 0 } } },
      __proto__: null,
    };
    const protoResponses = Object.create(null);
    protoResponses['toString'] = { 0: { answer: { optionIdx: 0 } } };
    protoResponses['__proto__'] = { 0: { answer: { optionIdx: 1 } } };

    // Roster with non-string displayName and missing 'toString' entry must not crash or leak Object.prototype.toString
    const gb = QLA.aggregateGradebook(
      { allResponses: protoResponses },
      generatedContent,
      { u1: { displayName: 12345 } }
    );
    const toStrRow = gb.studentRows.find((r) => r.uid === 'toString');
    expect(toStrRow.displayName).toBe('Student toSt');

    // __proto__ UID must be counted as a real respondent in aggregateItemAnalysis
    const ia = QLA.aggregateItemAnalysis({ allResponses: protoResponses }, generatedContent, null);
    expect(ia.totalStudents).toBe(2);
    expect(ia.items[0].respondents).toBe(2);

    // Unfingerprinted teacher override must NOT silently apply in aggregateSuccessCriteria
    const sc = QLA.aggregateSuccessCriteria(
      { allResponses: { s1: { 0: { answer: { optionIdx: 1 }, conceptLabel: 'Capitals\u0000\u0007' } } } },
      generatedContent,
      null,
      null,
      { s1: { 0: { status: 'correct' } } }
    );
    expect(sc.byConcept['Capitals'].met).toBe(0);
    expect(sc.byConcept['Capitals'].total).toBe(1);

    // Relation-mismatch rejects out-of-range clickedPairIdx
    const rmGrade = QLA.gradePresentationResponse(
      { answer: { clickedPairIdx: -1, partnerAnswer: 'B2' } },
      {
        type: 'relation-mismatch',
        pairs: [{ left: 'A', right: 'A2' }, { left: 'B', right: 'Wrong' }],
        wrongPairIndex: 1,
        correctPartnerForWrong: 'B2',
      }
    );
    expect(rmGrade.status).toBe('submitted');
    expect(rmGrade.evaluable).toBe(false);

    // assessmentItemSignature handles circular references cleanly
    const circQ = { type: 'mcq', question: 'Cycle?', options: [] };
    circQ.options.push(circQ);
    expect(typeof QLA.assessmentItemSignature(circQ)).toBe('string');

    // aggregateRetentionCurve clamps Infinity / NaN mastery metrics
    const ret = QLA.aggregateRetentionCurve(
      { allResponses: {} },
      generatedContent,
      { s1: { displayName: 'Ada' } },
      {
        s1: {
          attempts: {
            'european capitals': {
              lastAttemptTs: Infinity,
              totalAttempts: Infinity,
              correctAttempts: 'bad',
            },
          },
        },
      }
    );
    const stu = ret.conceptRows[0].students[0];
    expect(stu.daysSinceLast).toBeNull();
    expect(stu.totalAttempts).toBe(0);
    expect(stu.successRate).toBeNull();
    expect(Number.isFinite(ret.conceptRows[0].priority)).toBe(true);
  });
});
