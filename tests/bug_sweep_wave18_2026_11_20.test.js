import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(p, 'utf8');

function runModuleInSandbox(filePath, extraGlobals = {}) {
  const code = read(filePath);
  const hasDocKey = Object.prototype.hasOwnProperty.call(extraGlobals, 'document');
  const defaultDoc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute: () => {}, style: {}, appendChild: () => {}, textContent: '' }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    documentElement: { lang: 'en', dir: 'ltr' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const docObj = hasDocKey ? extraGlobals.document : defaultDoc;
  const win = {
    AlloModules: {},
    StemLab: {
      tools: {},
      registerTool(id, cfg) {
        this.tools[id] = cfg;
      }
    },
    React: {
      createElement: (...args) => ({ args }),
      createContext: (def) => ({ _defaultValue: def }),
      useContext: (ctx) => (ctx ? ctx._defaultValue : null),
      useState: (v) => [v, () => {}],
      useRef: (v) => ({ current: v }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      Fragment: Symbol.for('react.fragment')
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    JSON: null,
    ...extraGlobals
  };
  const sandbox = {
    window: win,
    globalThis: win,
    self: win,
    document: docObj,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64')
  };
  if (hasDocKey && extraGlobals.document === undefined) delete sandbox.document;
  vm.runInNewContext('window.JSON = JSON;', sandbox);
  vm.runInNewContext(code, sandbox, { filename: filePath });
  return win;
}

describe('Wave 18 Bug Sweep — Pass 1 (6 SEL Hub Tools)', () => {
  it('1. sel_tool_griefloss.js: crisis scan on who-blur, light/HC contrast, print reset, valid view clamp', () => {
    const src = read('sel_hub/sel_tool_griefloss.js');
    expect(src).toMatch(/scan\.hasCrisis\s*\|\|\s*scan\.triggered/);
    expect(src).toMatch(/id:\s*'g-who'[\s\S]{0,400}onBlur:/);
    expect(src).toMatch(/'#fecdd3'/);
    expect(src).toMatch(/'#bbf7d0'/);
    expect(src).toMatch(/@media print[\s\S]*color:\s*#0f172a\s*!important/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
    expect(src).not.toMatch(/background:\s*'#0f172a'/);
  });

  it('2. sel_tool_genogram.js: keyed form container, null-proto positions, Array.isArray, functional updates', () => {
    const src = read('sel_hub/sel_tool_genogram.js');
    expect(src).toMatch(/key:\s*formKey/);
    expect(src).toMatch(/positions\s*=\s*Object\.create\(null\)/);
    expect(src).toMatch(/Array\.isArray\(d\.relationships\)/);
    expect(src).toMatch(/if\s*\(!pos\)\s*return\s*null;/);
    expect(src).toMatch(/'r_'\s*\+\s*idx/);
    expect(src).toMatch(/id:\s*'gen-name'[\s\S]{0,400}onBlur:/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
  });

  it('3. sel_tool_ecomap.js: keyed form, clearable personLabel, defs-before-lines perimeter arrows, print reset', () => {
    const src = read('sel_hub/sel_tool_ecomap.js');
    expect(src).toMatch(/key:\s*formKey/);
    expect(src).toMatch(/d\.personLabel\s*!=\s*null\s*\?\s*d\.personLabel\s*:\s*'Me'/);
    expect(src).toMatch(/id:\s*'em-person'[\s\S]{0,400}onBlur:/);
    const defsPos = src.indexOf("h('defs'");
    const linesPos = src.indexOf('markerStart');
    expect(defsPos).toBeGreaterThan(-1);
    expect(linesPos).toBeGreaterThan(defsPos);
    expect(src).toMatch(/@media print[\s\S]*color:\s*#0f172a\s*!important/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
  });

  it('4. sel_tool_voicedetective.js: no render-time mutations, unmount/onerror cleanup, advanced emotion lookup', () => {
    const src = read('sel_hub/sel_tool_voicedetective.js');
    expect(src).toMatch(/timersRef/);
    expect(src).toMatch(/aliveRef/);
    expect(src).toMatch(/utt\.onerror/);
    expect(src).toMatch(/disabled:\s*!allAnswered\s*\|\|\s*!!feedback/);
    expect(src).toMatch(/EMOTIONS_ADVANCED\.find/);
    expect(src).toMatch(/4 Emotions/);
    expect(src).not.toMatch(/update\(\{\s*activeMode:\s*'emotion_guess'/);
  });

  it('5. sel_tool_careercompass.js: HC radio contrast, meter min/max ARIA, functional rating update, valid view', () => {
    const src = read('sel_hub/sel_tool_careercompass.js');
    expect(src).toMatch(/aria-valuemin/);
    expect(src).toMatch(/aria-valuemax/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
    expect(src).toMatch(/@media print[\s\S]*color:\s*#0f172a\s*!important/);
    expect(src).toMatch(/ITEMS\.filter/);
  });

  it('6. sel_tool_crewprotocols.js: interactive Crew Prompts buttons, fixed filter chip, Array.isArray planned', () => {
    const src = read('sel_hub/sel_tool_crewprotocols.js');
    expect(src).not.toMatch(/_cpFg\(d\.filter\)\s*===\s*null/);
    expect(src).toMatch(/Array\.isArray\(d\.planned\)/);
    expect(src).toMatch(/ctx\.openTool/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
    expect(src).toMatch(/@media print[\s\S]*color:\s*#0f172a\s*!important/);
  });
});

describe('Wave 18 Bug Sweep — Pass 2 (6 Core, AAC & Educator Modules)', () => {
  it('7. packets-make.js: bounded 40-char batch dedup, null-proto maps, mp3 rejection & cache cleanup, clearBuilt lastLesson', () => {
    const src = read('packets-make.js');
    expect(src).toMatch(/40\s*-\s*suffix\.length/);
    expect(src).toMatch(/used\s*=\s*Object\.create\(null\)/);
    expect(src).toMatch(/kit\.getMp3\(\)\.then\([\s\S]*mp3Kit\s*=\s*null;\s*mp3Done\s*=\s*true;\s*return\s*null;/);
    expect(src).toMatch(/made\.catch\(function\s*\(\)\s*\{\s*mp3s\.delete\(uri\);\s*\}\)/);
    expect(src).toMatch(/if\s*\(!ready\)\s*matcherLoading\s*=\s*null;/);
    expect(src).toMatch(/lastLesson\s*=\s*null;[\s\S]{0,80}drawOrder/);
    expect(src).toMatch(/if\s*\(mp3s\)\s*mp3s\.clear\(\)/);
    expect(src).toMatch(/myWords\.remove\(row\.word\)[\s\S]*?\.catch\(/);
    expect(src).toMatch(/myWords\.clear\(\)[\s\S]*?\.catch\(/);
  });

  it('8. math_helpers_module.js (runtime): LaTeX %, spaced leading minus, multi-$ preservation, reduced negative denominator', () => {
    const win = runModuleInSandbox('math_helpers_module.js');
    const M = win.AlloModules.MathHelpers;
    expect(M.areMathAnswersEquivalent('75\\%', '75%')).toBe(true);
    expect(M.areMathAnswersEquivalent('$75\\%$', '0.75')).toBe(true);
    expect(M.areMathAnswersEquivalent('- \\frac{1}{2}', '-0.5')).toBe(true);
    expect(M.areMathAnswersEquivalent('- 1/2', '-0.5')).toBe(true);
    // Multi-inline $...$ must not strip outer $ and corrupt inner $ signs
    expect(M.areMathAnswersEquivalent('$x = 2$ or $x = -2$', '$x = 2$ or $x = -2$')).toBe(true);
    expect(M.areMathAnswersEquivalent('$x = 2$ or $x = -2$', 'x = 2$ or $x = -2')).toBe(false);
    // Simplify task rejects negative denominators like 1/-2 and -1/-2
    const src = read('math_helpers_module.js');
    expect(src).toMatch(/denominator\.numerator\s*>\s*1n/);
    expect(src).toMatch(/whole\s*>\s*0n\s*&&\s*num\s*>\s*0n\s*&&\s*den\s*>\s*1n\s*&&\s*num\s*<\s*den/);
    expect(src).toMatch(/deps\?\.isCurrent|deps && deps\.isCurrent/);
    expect(src).toMatch(/_mathSimilarInFlight/);
    expect(src).toMatch(/UNTRUSTED_PROBLEM_CONTEXT/);
  });

  it('9. live_aac_module.js (runtime): hardened SVG sanitizer, maxImageChars: 0, dense sanitizeResearch arrays, scroll lock & hooks', () => {
    const win = runModuleInSandbox('live_aac_module.js');
    const A = win.AlloModules.LiveAac;
    const toSvgUri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s, 'utf8').toString('base64');
    const makePkg = (img) => ({
      format: 'alloflow.aac-board',
      version: 1,
      board: { id: 'b1', title: 'Test', locale: 'en-US', direction: 'ltr' },
      pages: [{ id: 'p1', title: 'P1', cols: 2, cells: [{ id: 'c1', displayLabel: 'Hi', image: img }] }]
    });

    const cleanSvg = toSvgUri('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>');
    expect(A.normalizePortable(makePkg(cleanSvg)).pages[0].cells[0].image).toBe(cleanSvg);

    // Unsafe SVGs must be stripped
    for (const bad of [
      '<svg><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>',
      '<svg><use href="https://evil.example/x.svg#a"/></svg>',
      '<svg><animate attributeName="href" to="javascript:alert(1)"/></svg>',
      '<svg><rect onload="&#97;lert(1)"/></svg>',
      '<svg><text>&#106;avascript</text></svg>'
    ]) {
      const normalized = A.normalizePortable(makePkg(toSvgUri(bad)));
      expect(normalized.pages[0].cells[0].image).toBeNull();
    }

    // maxImageChars: 0 must actually omit images rather than falling back to default
    const zeroBudget = A.normalizePortable(makePkg(cleanSvg), { maxImageChars: 0 });
    expect(zeroBudget.pages[0].cells[0].image).toBeNull();

    // serializeResourceForStudentPack must not leave sparse array holes when stripping research reports
    const payloadObj = win.JSON.parse(JSON.stringify({
      id: 'res-1',
      type: 'simplified',
      data: 'Hello class',
      items: [
        { label: 'ok1' },
        { version: 1, supplied: [], citedIds: [] },
        { label: 'ok2' }
      ]
    }));
    const packed = A.serializeResourceForStudentPack(payloadObj, { sanitizeHistoryForCloud: (arr) => arr, stripUndefined: (v) => v });
    expect(packed.items.length).toBe(2);
    expect(0 in packed.items && 1 in packed.items).toBe(true);
    expect(packed.items.map((x) => x.label)).toEqual(['ok1', 'ok2']);

    // Structural checks for scroll-lock prev, unconditional useContext, ancestor inert, RTL arrows
    const src = read('live_aac_module.js');
    expect(src).toMatch(/lockState\.prev/);
    expect(src).toMatch(/_alloAacFallbackLangCtx/);
    expect(src).toMatch(/while\s*\(cur\s*&&\s*cur\s*!==\s*document\.body/);
    expect(src).toMatch(/kb\.direction\s*===\s*['"]rtl['"]/);
  });

  it('10. seating_chart_module.js (runtime): proto-key student names in solveSeating, undo/drag/print/nameDraft fixes', () => {
    const win = runModuleInSandbox('seating_chart_module.js');
    const S = win.AlloModules.SeatingChart._testing;
    const tpl = S.buildTemplate('rows', 4);
    const layout = { id: 'l1', name: 'Main', seats: tpl.seats, furniture: tpl.furniture, assignments: {} };
    const solved = S.solveSeating(layout, ['constructor', 'toString', 'Alice'], [
      { id: 'c1', type: 'fixed_seat', students: ['constructor'], seatId: tpl.seats[0].id }
    ], { seed: 7 });
    const seatedValues = Object.values(solved.assignments);
    expect(seatedValues).toContain('constructor');
    expect(seatedValues).toContain('toString');
    expect(seatedValues).toContain('Alice');
    expect(solved.assignments[tpl.seats[0].id]).toBe('constructor');

    const src = read('seating_chart_module.js');
    expect(src).toMatch(/snapshot\.id\s*!==\s*layout\.id/);
    expect(src).toMatch(/if\s*\(!d\.moved\)\s*pushUndo\(\)/);
    expect(src).toMatch(/onafterprint/);
    expect(src).toMatch(/60000|6e4/);
    expect(src).toMatch(/nameDraft/);
  });

  it('11. communications_studio_module.js (runtime): real csNormalizeCodename export, proto-key roster/evidence, StrictMode mountedRef', () => {
    const win = runModuleInSandbox('communications_studio_module.js', {
      document: { getElementById: () => ({}), createElement: () => ({ setAttribute: () => {}, style: {} }), body: { appendChild: () => {} } }
    });
    const T = win.AlloModules.CommunicationsStudio._testing;
    expect(T.csNormalizeCodename('  Blue   Heron ')).toBe('blue heron');

    const roster = {
      className: 'Period 1',
      students: { constructor: 'g1', toString: 'g1' },
      groups: { g1: { name: 'Team A' } },
      sessionHistory: [{ participants: { constructor: true } }],
      progressHistory: {}
    };
    const ev = T.csBuildEvidence(roster, [{ id: '1', studentNickname: 'constructor', stats: { totalXP: 50 } }], {});
    expect(ev.rows.find((r) => r.codename === 'constructor').hasDashboard).toBe(true);
    expect(ev.rows.find((r) => r.codename === 'toString').hasDashboard).toBe(false);

    const src = read('communications_studio_module.js');
    expect(src).toMatch(/mountedRef\.current\s*=\s*true/);
    expect(src).toMatch(/props\.isOpen\s*===\s*false\s*&&\s*abortRef\.current/);
    expect(src).toMatch(/Object\.create\(null\)/);
  });

  it('12. school_rewards_module.js (runtime): srSetupSnippet escapes U+2028/U+2029/CR, StrictMode mountedRef, safeClose', () => {
    const win = runModuleInSandbox('school_rewards_module.js');
    const T = win.AlloModules.SchoolRewards._testing;
    const snippet = T.srSetupSnippet({
      allowedDomain: 'school.org',
      schoolName: "Oak\u2028Hill\u2029'Elementary'\r\nWest",
      academicYear: '2026-2027',
      levelThresholds: '0, 50, 100'
    });
    expect(snippet).not.toMatch(/[\u2028\u2029\r]/);
    // Must parse as valid JavaScript
    expect(() => new Function(snippet)).not.toThrow();

    const src = read('school_rewards_module.js');
    expect((src.match(/mountedRef\.current\s*=\s*true/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call\(groups,\s*id\)/);
    expect(src).toMatch(/backdropDownRef/);
    expect(src).toMatch(/safeClose/);
  });
});

describe('Wave 18 Bug Sweep — Pass 3 (6 STEM Lab Tools)', () => {
  it('13. stem_tool_accesslens.js: camTokenRef cancellation, null-proto LANG_CODES, busyRef & strict origin', () => {
    const src = read('stem_lab/stem_tool_accesslens.js');
    expect(src).toMatch(/camTokenRef/);
    expect(src).toMatch(/Object\.assign\(Object\.create\(null\)/);
    expect(src).toMatch(/langCodeOf/);
    expect(src).toMatch(/busyRef/);
    expect(src).toMatch(/if\s*\(ev\.origin\s*!==\s*LENS_ORIGIN\)\s*return;/);
    expect(src).toMatch(/step:\s*2/);
  });

  it('14. stem_tool_organismid.js (runtime): Arachnida sibling under Arthropoda, null-proto lineageOf, valid heading CSS', () => {
    const src = read('stem_lab/stem_tool_organismid.js');
    // Arachnida must be a direct child of Arthropoda, not nested inside Insecta
    const arthropodaStart = src.indexOf("N('Arthropoda'");
    const insectaIdx = src.indexOf("N('Insecta'", arthropodaStart);
    const arachnidaIdx = src.indexOf("N('Arachnida'", arthropodaStart);
    expect(arthropodaStart).toBeGreaterThan(-1);
    expect(insectaIdx).toBeGreaterThan(arthropodaStart);
    expect(arachnidaIdx).toBeGreaterThan(insectaIdx);
    // Insecta closes with ]) before Arachnida begins
    expect(src.slice(insectaIdx, arachnidaIdx)).toMatch(/\]\),\s*\n\s*$/);
    expect(src).toMatch(/NODE_BY_NAME\s*=\s*Object\.create\(null\)/);
    expect(src).toMatch(/PARENT_OF\s*=\s*Object\.create\(null\)/);
    expect(src).toMatch(/\.oid-detail-block h3/);
    expect(src).toMatch(/\.oid-catblock h2/);
    expect(src).toMatch(/\.oid-ladder-card h2/);
    expect(src).toMatch(/\.oid-pending h2/);
  });

  it('15. stem_tool_zoomgallery.js: destroy viewer on back, ref-based pin numbering, finite challenge lock-in, proto guard', () => {
    const src = read('stem_lab/stem_tool_zoomgallery.js');
    expect(src).toMatch(/function backToGallery[\s\S]{0,220}viewerRef\.current\.destroy\(\)/);
    expect(src).toMatch(/!\(size\.x\s*>\s*0\)\s*\|\|\s*!\(size\.y\s*>\s*0\)/);
    expect(src).toMatch(/!isFinite\(n\)\s*\|\|\s*!\(n\s*>\s*0\)/);
    expect(src).toMatch(/!isFinite\(metres\)/);
    expect(src).toMatch(/function sanitizePins/);
    expect(src).toMatch(/copiedTimerRef/);
    expect(src).toMatch(/customAbortRef/);
  });

  it('16. stem_tool_freeforms.js (runtime): null-proto ffReconcileMembership, safe ffBuildPrintableHtml without document', () => {
    const win = runModuleInSandbox('stem_lab/stem_tool_freeforms.js', { document: undefined });
    const P = win.StemLab.ffPure;
    // Reconcile with proto-key group title
    const doc = {
      scaffold: 'free',
      title: 'Test',
      groups: [
        { id: 'g1', title: 'Group A', items: [{ id: 'n1', text: 'Idea 1', note: '' }] },
        { id: 'g2', title: 'constructor', items: [] }
      ]
    };
    const rec = P.ffReconcileMembership(doc, { n1: 'constructor' });
    expect(rec.moved).toBe(1);
    expect(rec.doc.groups[1].items.map((i) => i.id)).toEqual(['n1']);
    // Non-existent proto target must not move
    const rec2 = P.ffReconcileMembership(doc, { n1: 'toString' });
    expect(rec2.moved).toBe(0);

    // Printable HTML works with no document global and rejects unsafe snapshot URLs
    const htmlUnsafe = P.ffBuildPrintableHtml(doc, { snapshotDataUrl: 'javascript:alert(1)" onerror="alert(1)' });
    expect(htmlUnsafe).toContain('<html lang="en">');
    expect(htmlUnsafe).not.toContain('javascript:');
    expect(htmlUnsafe).not.toContain('<img class="snap"');

    const safePng = 'data:image/png;base64,iVBORw0KGgo=';
    const htmlSafe = P.ffBuildPrintableHtml(doc, { snapshotDataUrl: safePng });
    expect(htmlSafe).toContain('src="' + safePng + '"');

    const src = read('stem_lab/stem_tool_freeforms.js');
    expect(src).toMatch(/aliveRef/);
    expect(src).toMatch(/xpSentRef/);
  });

  it('17. stem_tool_papertrail.js: no render-time seenDocs mutation, clipboard fallback, XP dedup, tabpanel ARIA', () => {
    const src = read('stem_lab/stem_tool_papertrail.js');
    expect(src).toMatch(/function openDoc\(docId\)/);
    expect(src).not.toMatch(/Promise\.resolve\(\)\.then\(function\(\)\s*\{\s*setPT\(\{\s*seenDocs:/);
    expect(src).toMatch(/function fallbackCopy\(text\)/);
    expect(src).toMatch(/xpSentRef/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
    expect(src).toMatch(/aria-controls':\s*'allo-pt-panel'/);
    expect(src).toMatch(/'aria-hidden':\s*'true',\s*focusable:\s*'false'/);
  });

  it('18. stem_tool_timeschedule.js (runtime): proto-key safe normalizeScheduleSolvedMap, HC progressbar CSS, score clamp', () => {
    const win = runModuleInSandbox('stem_lab/stem_tool_timeschedule.js');
    const P = win.TimeSchedulePure;
    const cleaned = P.normalizeScheduleSolvedMap({ toString: true, constructor: true, __proto__: true });
    expect(Object.keys(cleaned)).toEqual([]);

    const src = read('stem_lab/stem_tool_timeschedule.js');
    expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call\(SCHEDULES,\s*d\.scheduleKey\)/);
    expect(src).toMatch(/time-schedule-lab--contrast \[role="progressbar"\]/);
    expect(src).toMatch(/Math\.max\(correctCount,/);
  });
});
