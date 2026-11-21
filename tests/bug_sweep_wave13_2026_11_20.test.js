import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = resolve(process.cwd());
function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function loadGlobalModule(rel, extraGlobals = {}) {
  const code = read(rel);
  const sandbox = {
    window: {},
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Set,
    Map,
    Promise,
    URL,
    Uint8Array,
    ArrayBuffer,
    TextEncoder,
    TextDecoder,
    ...extraGlobals,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox.window;
  sandbox.window.window = sandbox.window;
  sandbox.window.console = console;
  vm.runInNewContext(code, sandbox, { filename: rel });
  return sandbox;
}

describe('Wave 13 Pass 1 — Core Student & Educator Modules', () => {
  let F;
  beforeAll(() => {
    const sb = loadGlobalModule('fluency_module.js');
    sb.window.AlloModules.AlloData = {
      FLUENCY_BENCHMARKS: {
        '3': { fall: 71, winter: 92, spring: 107 },
      },
    };
    F = sb.window.AlloModules.Fluency;
  });

  it('fluency_module: getBenchmarkComparison handles 0 WCPM and unknown grades without misclassifying', () => {
    const zero = F.getBenchmarkComparison(0, 'Grade 3', 'winter');
    expect(zero.level).toBe('well_below');
    expect(zero.target).toBe(92);

    const unknown = F.getBenchmarkComparison(85, 'Grade 12', 'winter');
    expect(unknown.level).toBe('unknown');
    expect(unknown.target).toBe(0);
  });

  it('fluency_module: generateFluencyScoreSheet uses readingLevel and marks stumbled green checkmark', () => {
    let html = '';
    const win = {
      document: {
        write(s) { html += s; },
        close() {},
      },
      focus() {},
      print() {},
    };
    const ok = F.generateFluencyScoreSheet(
      {
        metrics: { wcpm: 90, accuracy: 95, totalWords: 3, durationSeconds: 60 },
        wordData: [
          { word: 'The', status: 'correct' },
          { word: 'quick', status: 'stumbled' },
          { word: 'fox', status: 'mispronounced', said: 'box' },
        ],
      },
      'The quick fox',
      { openWindow: () => win }
    );
    expect(ok).toBe(true);
    expect(html).toContain('#16a34a');
    expect(html).not.toContain('undefined');
  });

  it('fluency_module: buildFluencyAlloSheetEnvelope falls back to date helper and unwraps readingSource', () => {
    const env = F.buildFluencyAlloSheetEnvelope(
      {
        readingAssessments: [
          {
            type: 'fluency-record',
            timestamp: 1787184000000,
            data: {
              sourceText: 'The quick brown fox',
              metrics: { wcpm: 110, accuracy: 97, totalWords: 4, durationSeconds: 10 },
            },
          },
        ],
      },
      { dateRange: 'all' }
    );
    expect(env).toBeTruthy();
    expect(env.metadata.readingSessionCount).toBe(1);
    expect(env.tables[0].rows[0].values.date).toBeTruthy();
  });

  it('fluency_module: exportFluencyCSV neutralizes spreadsheet formula injection in date and review fields', () => {
    let csv = '';
    const link = { setAttribute() {}, click() {}, style: {} };
    const ok = F.exportFluencyCSV(
      [
        {
          type: 'fluency-record',
          timestamp: 1787184000000,
          data: {
            sourceText: 'Story',
            metrics: { wcpm: 90, accuracy: 96, totalWords: 10, durationSeconds: 20 },
            review: { status: '+cmd', reviewer: 'Teacher', reviewedAt: '@SUM(A1:A2)' },
          },
        },
      ],
      {
        formatDate: () => '=HYPERLINK("http://evil.example")',
        BlobCtor: function (parts) { csv = parts[0]; },
        documentRef: {
          createElement: () => link,
          body: { appendChild() {}, removeChild() {} },
        },
        urlApi: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
      }
    );
    expect(ok).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example"")"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'@SUM(A1:A2)"');
  });

  it('fluency_module: summarizeFluencyEvidence does not coerce null or empty strings to 0', () => {
    const summary = F.summarizeFluencyEvidence([
      { wcpm: null, accuracy: '', durationSeconds: '' },
      { metrics: { wcpm: '', accuracy: null } },
    ]);
    expect(summary.sampleCount).toBe(0);
    expect(summary.medianWcpm).toBeNull();
  });

  it('fluency_module: triangulateFluency does not mutate input arrays and counts unpaired words in total/needsReview', () => {
    const local = { wordData: [{ word: 'cat', status: 'correct' }] };
    const cloud = {
      wordData: [
        { word: 'cat', status: 'correct' },
        { word: 'sat', status: 'correct' },
      ],
    };
    const snapshot = JSON.stringify(cloud.wordData);
    const result = F.triangulateFluency(local, cloud);
    expect(JSON.stringify(cloud.wordData)).toBe(snapshot);
    expect(result.confidence.unpairedWordCount).toBe(1);
    expect(result.confidence.agreementRate).toBe(50);
    expect(result.confidence.needsReview).toBe(true);
  });

  it('karaoke_audio_store_module: protects human recordings and cleans legacy entries on identity remove', () => {
    const src = read('karaoke_audio_store_module.js');
    expect(src).toContain('incomingIsHuman');
    expect(src).toContain('allowLegacyText !== false');
    expect(src).toContain('_identityEntriesForText(target)');
  });

  it('built Pass 1 modules preserve Wave 13 lifecycle, cooldown, URL, memoization, and canvas fixes', () => {
    expect(read('onboarding_coach_module.js')).toContain('cooldownMsRemaining');
    expect(read('onboarding_coach_module.js')).toContain('wasNearBottomRef');
    expect(read('onboarding_coach_module.js')).toContain('mountedRef');
    expect(read('alt_text_module.js')).toContain('protocol === "https:"');
    expect(read('alt_text_module.js')).toContain('alloflow:student-ai-config-changed');
    expect(read('view_adventure_module.js')).toContain('aiEpochRef');
    expect(read('image_asset_editor_module.js')).toContain('width = 0');
    expect(read('lesson_teaching_script_module.js')).toContain('planPhases');
  });
});

describe('Wave 13 Pass 2 — 6 SEL Hub Tools', () => {
  const selFiles = [
    'sel_hub/sel_tool_ethicalreasoning.js',
    'sel_hub/sel_tool_strengths.js',
    'sel_hub/sel_tool_safety.js',
    'sel_hub/sel_tool_perspective.js',
    'sel_hub/sel_tool_teamwork.js',
    'sel_hub/sel_tool_social.js',
  ];

  it('all 6 SEL tools honor global mute before playing audio', () => {
    for (const f of selFiles) {
      const src = read(f);
      expect(src, f).toContain('__alloIsGlobalMuted');
    }
  });

  it('sel_tool_ethicalreasoning: scopes #ethic-a11y CSS, resolves band frameworks, and supports arrow-key tabs', () => {
    const src = read('sel_hub/sel_tool_ethicalreasoning.js');
    expect(src).toContain('data-sel-tool-shell=\\"ethicalReasoning\\"');
    expect(src).toContain('var findFramework = function(');
    expect(src).toContain('allStakeholdersViewed');
  });

  it('sel_tool_strengths: keeps print view outside SVG, clones badges immutably, and shows crisis modal on block', () => {
    const src = read('sel_hub/sel_tool_strengths.js');
    expect(src).toContain('Object.assign({}, d.badges || {})');
    expect(src).toContain('showCrisisModal');
    expect(src).toContain("id: 'print'");
  });

  it('sel_tool_safety: has zero mangled _safFg calls, wires _checkSafetyText, and seeds learn tab visit', () => {
    const src = read('sel_hub/sel_tool_safety.js');
    expect(src).not.toMatch(/_safFg\s*\(\s*(\{|true|false|\d)/);
    expect(src).toContain('_checkSafetyText');
    expect(src).toContain('{ learn: true }');
  });

  it('sel_tool_perspective: fixes HC button colors, gates XP completion IDs, and wires crisis modal', () => {
    const src = read('sel_hub/sel_tool_perspective.js');
    expect(src).toContain('ACCENT_BTN_BG');
    expect(src).toContain('scenCompletedIds');
    expect(src).toContain('showCrisisModal');
  });

  it('sel_tool_teamwork: uses achievable badge thresholds (10/12), seeds roles visit, and removes setTimeout badge races', () => {
    const src = read('sel_hub/sel_tool_teamwork.js');
    expect(src).toContain('{ roles: true }');
    expect(src).toContain('roleReflectionXpAwarded');
    expect(src).toContain('completedChallengeIds');
    expect(src).not.toMatch(/setTimeout\s*\([^)]*master_collaborator/);
  });

  it('sel_tool_social: deterministically varies Active Listening option order and guards Friendship Health XP', () => {
    const src = read('sel_hub/sel_tool_social.js');
    expect(src).toContain('listenIdx % 2');
    expect(src).toContain('fhXpAwarded');
    expect(src).toContain('{ convo: true }');
  });
});

describe('Wave 13 Pass 3 — STEM Lab & Core Engine Modules', () => {
  it('stem_tool_universe: removes render-phase setState, gates XP buttons, enforces mute/unmount cleanup, and resets wholesale', () => {
    const src = read('stem_lab/stem_tool_universe.js');
    expect(src).toContain('props.needsEpochVisitSync');
    expect(src).toContain('syncEpochVisit');
    expect(src).not.toContain("upd('epochsVisited', newVisited);");
    expect(src).toContain('_isUniMuted()');
    expect(src).toMatch(/window\._universeCleanupAll\s*=\s*function\s*\(\)\s*\{\s*stopSpeech\(\);/);
    expect(src).toContain('isNewEpoch && typeof awardStemXP');
    expect(src).toContain('!activeMissionLaunched && typeof awardStemXP');
    expect(src).toContain('isNewWwtStop && typeof awardStemXP');
    expect(src).toContain('isNewThread && typeof awardStemXP');
    expect(src).toContain('!activeEvidenceInNotebook && typeof awardStemXP');
    expect(src).toContain('!activeMissionInNotebook && typeof awardStemXP');
    expect(src).toContain('wwtStopsVisited');
    expect(src).toContain('evidenceThreadsVisited');
  });

  it('stem_tool_perception: hides locked brightness target in telemetry/presets and includes context:true on Necker cue presets', () => {
    const src = read('stem_lab/stem_tool_perception.js');
    expect(src).toContain("meta.id === 'brightness' && activeModel.matching && !activeModel.reveal && ctrl.key === 'target'");
    expect(src).toContain('!playing && !activeModel.matching');
    expect(src).toContain("{ context: true, depth: 95, cue: 'front' }");
    expect(src).toContain("{ context: true, depth: 95, cue: 'back' }");
  });

  it('stem_tool_parentinglab: questHooks only count correct answers / return serves, M1 counts M1_CARDS, and XP is gated', () => {
    let registered = null;
    const regSb = {
      window: {
        StemLab: {
          registerTool(id, spec) {
            registered = spec;
          },
        },
      },
      document: {
        getElementById: () => ({ id: 'lr' }),
        createElement: () => ({ style: {}, setAttribute() {} }),
        body: { appendChild() {} },
      },
      console,
      Object,
      Array,
      Number,
      String,
      Boolean,
      Math,
    };
    regSb.globalThis = regSb;
    regSb.window.window = regSb.window;
    vm.runInNewContext(read('stem_lab/stem_tool_parentinglab.js'), regSb, { filename: 'stem_tool_parentinglab.js' });
    expect(registered).toBeTruthy();

    const byId = Object.fromEntries(registered.questHooks.map((q) => [q.id, q]));
    const wrongState = {
      dialsDone: { v1: { correct: false }, v2: { correct: false }, v3: { correct: false }, v4: { correct: false } },
      servesDone: { s1: { kind: 'miss' }, s2: { kind: 'miss' }, s3: { kind: 'miss' }, s4: { kind: 'miss' } },
      movesDone: { m1: { correct: false }, m2: { correct: false }, m3: { correct: false }, m4: { correct: false }, m5: { correct: false } },
      prideDone: { p1: { correct: false }, p2: { correct: false }, p3: { correct: false }, p4: { correct: false }, p5: { correct: false }, p6: { correct: false } },
      abcDone: { a1: { correct: false }, a2: { correct: false }, a3: { correct: false }, a4: { correct: false } },
    };
    expect(byId.pl_dials.check(wrongState)).toBe(false);
    expect(byId.pl_dials.progress(wrongState)).toBe('0/4 vignettes');
    expect(byId.pl_serves.check(wrongState)).toBe(false);
    expect(byId.pl_serves.progress(wrongState)).toBe('0/4 serves');
    expect(byId.pl_skills.check(wrongState)).toBe(false);
    expect(byId.pl_pride.check(wrongState)).toBe(false);
    expect(byId.pl_abc.check(wrongState)).toBe(false);

    const rightState = {
      dialsDone: { v1: { correct: true }, v2: { correct: true }, v3: { correct: true }, v4: { correct: true } },
      servesDone: { s1: { kind: 'return' }, s2: { kind: 'return' }, s3: { kind: 'return' }, s4: { kind: 'return' } },
    };
    expect(byId.pl_dials.check(rightState)).toBe(true);
    expect(byId.pl_serves.check(rightState)).toBe(true);

    const src = read('stem_lab/stem_tool_parentinglab.js');
    expect(src).toContain("cardsRead(M1_CARDS) + '/' + M1_CARDS.length");
    expect(src).toContain('var xpGiven = d.xpGiven || {};');
    expect(src).toContain("!xpGiven['m9:prep']");
  });

  it('concept_graph_engine_module: fixes strand challenge z-leak, prototype keys, toConceptMap text, adaptGenerated, bounded export, and prompt axes', () => {
    const sb = loadGlobalModule('concept_graph_engine_module.js');
    const E = sb.window.AlloModules.ConceptGraphEngine;

    // 1. Strand challenge resets z and projects ungrouped items onto the trailing plane (not answer strand!)
    const g = E.project(
      E.ensureDefaultAxisValues(
        E.adaptGenerated({
          main: 'Cells',
          branches: [
            { title: 'Bio', items: ['Mitochondria'] },
            { title: 'Chem', items: ['ATP'] },
          ],
        })
      ),
      { planeGap: 300 }
    );
    const ch = E.buildStrandChallenge(g);
    const itemA = ch.graph.nodes.find((n) => n.id === 'b0_i0');
    const itemB = ch.graph.nodes.find((n) => n.id === 'b1_i0');
    expect(itemA.z).toBe(0);
    expect(itemB.z).toBe(0);
    const proj = E.project(ch.graph, { planeGap: 300 });
    const pA = proj.nodes.find((n) => n.id === 'b0_i0');
    const pB = proj.nodes.find((n) => n.id === 'b1_i0');
    expect(pA.z).toBe(600);
    expect(pB.z).toBe(600);

    // 2. deriveOutline and deriveLanes survive prototype property names
    const protoGraph = {
      version: 'acg/v1',
      nodes: [
        { id: 'constructor', label: 'A', x: 0, y: 0, category: 'toString' },
        { id: 'toString', label: 'B', x: 10, y: 0, category: 'constructor' },
      ],
      edges: [{ id: 'e1', fromId: 'constructor', toId: 'toString', type: 'sequence' }],
    };
    const out = E.deriveOutline(protoGraph);
    expect(out.hasCycle).toBe(false);
    expect(out.order).toEqual(['constructor', 'toString']);
    const lanes = E.deriveLanes(protoGraph);
    expect(lanes.map((l) => l.key)).toEqual(['toString', 'constructor']);

    // 3. toConceptMap preserves label into text when text is absent
    const cm = E.toConceptMap({
      version: 'acg/v1',
      nodes: [{ id: 'n1', label: 'Photosynthesis', x: 10, y: 20 }],
      edges: [],
    });
    expect(cm.nodes[0].text).toBe('Photosynthesis');

    // 4. adaptGenerated ignores non-integer / prototype connectsTo entries
    const gen = E.adaptGenerated({
      main: 'Topic',
      branches: [
        { title: 'B1', items: ['x'], connectsTo: ['push', 'toString', -1, 1.5, 1] },
        { title: 'B2', items: ['y'], connectsTo: [] },
      ],
    });
    const seqEdges = gen.edges.filter((e) => e.type === 'sequence');
    expect(seqEdges).toHaveLength(1);
    expect(seqEdges[0].toId).toBe('b1');

    // 5. boundedAlignmentGraph preserves meta/axes despite massive dangling edges & normalizeAlignmentGraphExport counts match bounded
    const hugeDanglingEdges = Array.from({ length: 600 }, (_, i) => ({
      id: 'bad_' + i,
      fromId: 'missing_a',
      toId: 'missing_b',
      notes: 'x'.repeat(2000),
    }));
    const rawAlign = {
      version: 'acg/v1',
      title: 'Align',
      axes: { x: { label: 'X' }, y: { label: 'Y' } },
      nodes: [{ id: 'n1', label: 'One', type: 'standard' }],
      edges: hugeDanglingEdges,
      meta: { alignmentMap: { version: 'alloflow-alignment-map/v2', source: 'kept' } },
    };
    const exp = E.normalizeAlignmentGraphExport(
      { schema: 'alloflow-alignment-graph-export/v1', graph: rawAlign, audit: { note: 'ok', fn: () => {} } },
      { maxNodes: 10, maxEdges: 10 }
    );
    expect(exp.ok).toBe(true);
    expect(exp.graph.meta.alignmentMap.source).toBe('kept');
    expect(exp.graph.axes.x.label).toBe('X');
    expect(exp.counts).toEqual({ nodes: 1, edges: 0 });
    expect(exp.audit.fn).toBeNull();

    // 6. buildSemanticGraphPrompt tolerates partial axes (x without y)
    const prompt = E.buildSemanticGraphPrompt({
      version: 'acg/v1',
      axes: { x: { label: 'Custom X' } },
      nodes: [{ id: 'n1', label: 'Node 1' }],
      edges: [],
    });
    expect(prompt).toContain('Custom X');
    expect(prompt).toContain('y = ');
  });

  it('instructional_context_module: rejects null, whitespace, and boolean coercion in complexity helpers', () => {
    const sb = loadGlobalModule('instructional_context_module.js');
    const IC = sb.window.AlloModules.InstructionalContext;
    expect(IC.complexityStatus(null, 'Grade 5')).toBe('unavailable');
    expect(IC.complexityStatus('', 'Grade 5')).toBe('unavailable');
    expect(IC.complexityStatus('   ', 'Grade 5')).toBe('unavailable');
    expect(IC.complexityStatus(false, 'Grade 5')).toBe('unavailable');
    expect(IC.complexityStatus(true, 'Grade 5')).toBe('unavailable');

    const normBool = IC.normalizeComplexity({ measuredGrade: false, requestedGrade: 'Grade 5' });
    expect(normBool.measuredGrade).toBeNull();
    const normWs = IC.normalizeComplexity({ measuredGrade: '   ', requestedGrade: 'Grade 5' });
    expect(normWs.measuredGrade).toBeNull();

    const withBad = IC.withComplexityEvidence({ content: 'hello' }, { score: false });
    expect(withBad.complexity.measuredAt).toBe('');
    const withEmpty = IC.withComplexityEvidence({ content: 'hello' }, { score: '' });
    expect(withEmpty.complexity.measuredAt).toBe('');
  });

  it('pd_core_module: prevents prototype-key smuggling, prototype ID collisions, and inescapable branching cycles', () => {
    const sb = loadGlobalModule('pd_core_module.js');
    const PD = sb.window.AlloModules.PdCore;

    // 1. Prototype-named activity id does not trigger false duplicate rejection
    const protoMod = {
      kind: 'pd_module',
      schema_version: 'pd-1.0',
      metadata: { id: 'mod-proto', title: 'Proto Test' },
      sections: [
        {
          title: 'Sec 1',
          activities: [
            { id: 'constructor', type: 'read', title: 'Read 1', content: { body: 'Hello world' } },
            { id: 'toString', type: 'read', title: 'Read 2', content: { body: 'Second read' } },
          ],
        },
      ],
    };
    expect(PD.validatePdModule(protoMod).ok).toBe(true);

    // 2. Branching start / choice.to referencing Object.prototype key is rejected
    const protoBranch = {
      kind: 'pd_module',
      schema_version: 'pd-1.0',
      metadata: { id: 'mod-bproto', title: 'Branch Proto' },
      sections: [
        {
          title: 'Sec 1',
          activities: [
            {
              id: 'b1',
              type: 'branching',
              title: 'Scenario',
              content: {
                start: 'toString',
                nodes: {
                  n1: { text: 'End', ending: true },
                },
              },
            },
          ],
        },
      ],
    };
    expect(PD.validatePdModule(protoBranch).ok).toBe(false);

    // 3. Branching inescapable cycle is rejected even when another branch reaches an ending
    const cycleMod = {
      kind: 'pd_module',
      schema_version: 'pd-1.0',
      metadata: { id: 'mod-cycle', title: 'Cycle Test' },
      sections: [
        {
          title: 'Sec 1',
          activities: [
            {
              id: 'b_cycle',
              type: 'branching',
              title: 'Trap Scenario',
              content: {
                start: 'start',
                nodes: {
                  start: {
                    text: 'Choose a path',
                    choices: [
                      { label: 'Finish', to: 'end' },
                      { label: 'Trap', to: 'loopA' },
                    ],
                  },
                  end: { text: 'Done', ending: true },
                  loopA: { text: 'Loop A', choices: [{ label: 'Go B', to: 'loopB' }] },
                  loopB: { text: 'Loop B', choices: [{ label: 'Go A', to: 'loopA' }] },
                },
              },
            },
          ],
        },
      ],
    };
    const cycleRes = PD.validatePdModule(cycleMod);
    expect(cycleRes.ok).toBe(false);
    expect(cycleRes.error).toContain('cannot reach any ending');

    // 4. reviewOnlyKeys rejects smuggled Object.prototype property names on review candidates
    const smuggled = {
      kind: 'pd_review_candidate',
      schema_version: 'pd-review-candidate-1.0',
      toString: 'smuggled',
    };
    const res = PD.validateReviewCandidatePackage(smuggled);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/exact|schema|required|field|key|top/i);
  });
});
