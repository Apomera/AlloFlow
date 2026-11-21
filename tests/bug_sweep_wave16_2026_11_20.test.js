import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadInContext(rel, sandboxExtra = {}) {
  const code = read(rel);
  const ctx = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    DataView,
    ArrayBuffer,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    ...sandboxExtra,
  });
  ctx.window = ctx.window || ctx;
  ctx.self = ctx.self || ctx;
  ctx.globalThis = ctx;
  vm.runInContext(code, ctx, { filename: rel });
  return ctx;
}

describe('Wave 16 Bug Sweep (2026-11-20)', () => {
  // ── PASS 1: 6 Clinical / SEL Hub Tools ──────────────────────────────────
  describe('Pass 1: SEL Hub Tools (sleep, identitysupport, stressbucket, bigfeelings, peersupport, journal)', () => {
    it('sel_tool_sleep.js: crisis scanning, theme contrast, null-proto experimentGroups, clamped hours/quality, Self-Check sc4+sc5', () => {
      const src = read('sel_hub/sel_tool_sleep.js');
      expect(src).toContain('scanSleepText');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('scanForCrisis');
      expect(src).toContain('showCrisisModal');
      expect(src).toContain('renderCrisisResources');
      expect(src).toContain('Object.prototype.hasOwnProperty.call(experimentGroups');
      expect(src).toContain('sc.sc4');
      expect(src).toContain('sc.sc5');
      expect(src).toContain('_sleSolid');
      expect(src).toContain('@media print');
    });

    it('sel_tool_identitysupport.js: light/HC fg maps, crisis scanning on blur + top-level resources, roving tablist, print privateNotes', () => {
      const src = read('sel_hub/sel_tool_identitysupport.js');
      expect(src).toContain('scanIdentityText');
      expect(src).toContain('renderCrisisResources');
      expect(src).toContain('showCrisisModal');
      expect(src).toContain('aria-controls');
      expect(src).toContain("role: 'tabpanel'");
      expect(src).toContain('d.privateNotes || d.notes');
      expect(src).toContain('#075985');
      expect(src).toContain('#581c87');
    });

    it('sel_tool_stressbucket.js: crisis scanning, SVG clipPath polygon, HC solid buttons, Array.isArray overflowSigns, roving tablist, preserves role=group', () => {
      const src = read('sel_hub/sel_tool_stressbucket.js');
      expect(src).toContain('scanStressText');
      expect(src).toContain('renderCrisisResources');
      expect(src).toContain('stressbucket-inner-clip');
      expect(src).toContain('_sbkSolid');
      expect(src).toContain('Array.isArray(d.overflowSigns)');
      expect(src).toContain("role: 'group'");
      expect(src).toContain("role: 'tabpanel'");
      expect(src).toContain('@media print');
    });

    it('sel_tool_bigfeelings.js: crisis scanning, clamped intensity, sr-only listEditor labels, HC solid buttons, roving tablist', () => {
      const src = read('sel_hub/sel_tool_bigfeelings.js');
      expect(src).toContain('scanBigFeelingsText');
      expect(src).toContain('renderCrisisResources');
      expect(src).toContain('_bigSolid');
      expect(src).toContain("typeof e.intensity === 'number' && !isNaN(e.intensity)");
      expect(src).toContain("role: 'tabpanel'");
      expect(src).toContain('htmlFor');
    });

    it('sel_tool_peersupport.js: synchronous preflight crisis gate, 988/741741/911 handoff, deterministic options, feedback error recovery, preserves role=group', () => {
      const src = read('sel_hub/sel_tool_peersupport.js');
      expect(src).toContain('rehearseBreakCharacterText');
      expect(src).toContain('showCrisisModal');
      expect(src).toContain('988');
      expect(src).toContain('741741');
      expect(src).toContain('setUserTier(0)');
      expect(src).toContain('Retry Feedback');
      expect(src).toContain('Array.isArray(chatFeedback.strengths)');
      expect(src).toContain('Array.isArray(chatFeedback.improvements)');
      expect(src).toContain('isFinite(delta)');
      expect(src).not.toContain('0.5 - Math.random()');
      expect(src).toContain("role: 'group'");
      expect(src).toContain("role: 'img'");
      expect(src).toContain('[callGemini, hasAI, aiScenario, chatHistory, rapport, gradeBand, addToast, onSafetyFlag]');
    });

    it('sel_tool_journal.js: shared checkCrisisText across all inputs, top-level crisis resources, effect-based badge awards, roving tablist, fixed aria-labels & contrast', () => {
      const src = read('sel_hub/sel_tool_journal.js');
      expect(src).toContain('function checkCrisisText');
      expect(src).toContain('checkCrisisText(ciScanText)');
      expect(src).toContain('checkCrisisText(letterText)');
      expect(src).toContain('checkCrisisText(jText)');
      expect(src).toContain('checkCrisisText(jRevision.text)');
      expect(src).toContain('checkCrisisText(preflightText)');
      expect(src).not.toContain("'aria-label': '1month'");
      expect(src).not.toContain("'aria-label': 'My Letters ( )'");
      expect(src).not.toContain('_jouFg(streak)');
      expect(src).toContain("role: 'tabpanel'");
      expect(src).toContain("'aria-controls': 'sel-journal-content'");
      expect(src).toContain("tryAwardBadge('calendar_viewer')");
      expect(src).toContain('[activeTab, checkIns.length, earnedBadges]');
    });
  });

  // ── PASS 2: 6 Core & Arcade Modules ─────────────────────────────────────
  describe('Pass 2: Core & Arcade Modules', () => {
    it('psychometric_math_probes.js: loads cleanly with all 825 probe items intact', () => {
      const ctx = loadInContext('psychometric_math_probes.js');
      const banks = [
        ctx.window.MATH_PROBE_BANKS,
        ctx.window.MISSING_NUMBER_PROBES,
        ctx.window.QUANTITY_DISCRIMINATION_PROBES,
      ].filter(Boolean);
      expect(banks).toHaveLength(3);
      let count = 0;
      const walk = (node) => {
        if (Array.isArray(node)) {
          for (const item of node) {
            if (item && typeof item === 'object' && !Array.isArray(item) && ('ans' in item || 'answer' in item || 'q' in item || 'seq' in item || 'a' in item)) count++;
            else walk(item);
          }
        } else if (node && typeof node === 'object') {
          for (const v of Object.values(node)) walk(v);
        }
      };
      walk(banks);
      expect(count).toBeGreaterThanOrEqual(825);
    });

    it('word_practice_core.js: rejects prototype keys in cardAppearance and non-finite id / non-string color in normalizeAnnotations', () => {
      const ctx = loadInContext('word_practice_core.js');
      const core = ctx.window.AlloWordPracticeCore;
      expect(core).toBeTruthy();

      const app = core.cardAppearance({ cardTheme: 'paper' }, { readingTheme: 'toString' });
      expect(app.background).toBeTruthy();
      expect(app.background).not.toBe(Object.prototype.toString[0]);

      const anns = core.normalizeAnnotations([
        { id: NaN, kind: 'note', color: ['red'], text: 'hello' },
        { id: Infinity, kind: 'note', color: '#123456', text: 'world' },
      ]);
      expect(anns).toHaveLength(2);
      expect(anns[0].id).toBe('annotation-0');
      expect(anns[0].color).toBe('yellow');
      expect(anns[1].id).toBe('annotation-1');
      expect(anns[1].color).toBe('#123456');
    });

    it('classroom_import_service.js: dispose() mid-flight preserves phase=disposed instead of overwriting with complete/cancelled', async () => {
      const svc = require(path.join(ROOT, 'classroom_import_service.js'));
      expect(svc).toBeTruthy();

      let resolveToken;
      const client = svc.createConnector({
        getAccessToken: () => new Promise((r) => { resolveToken = r; }),
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          body: null,
          text: async () => JSON.stringify({ id: 'u1' }),
        }),
      });
      const p = client.listTeacherCourses();
      await Promise.resolve();
      client.dispose();
      if (resolveToken) resolveToken('valid-token-123');
      await expect(p).rejects.toThrow();
      expect(client.getStatus()).toEqual({ phase: 'disposed', code: 'DISPOSED' });
    });

    it('pure_helpers_module.js: fixes broken [link] protection, currency $5...$3 split, and strips __proto__/constructor/prototype in compactors', () => {
      const ctx = loadInContext('pure_helpers_module.js', { AlloModules: {} });
      const helpers = ctx.window.AlloModules && ctx.window.AlloModules.PureHelpers;
      const split = helpers && helpers.splitTextToSentences;
      expect(typeof split).toBe('function');

      // Currency spans across two sentences must split properly
      const currency = split('The notebook costs $5. The pen costs $3.');
      expect(currency).toHaveLength(2);
      expect(currency[0]).toContain('$5.');
      expect(currency[1]).toContain('$3.');

      // Unmatched bracket followed later by a real markdown link must not swallow intervening sentences
      const bracketed = split('Note [draft]. See [Source 1](https://example.com) for details.');
      expect(bracketed).toHaveLength(2);
      expect(bracketed[0]).toContain('[draft].');

      // Prototype-key filtering in compactors
      const compactBp = helpers._compactBlueprintRunForStorage;
      const deps = {
        _alloDiagnosticReason: (r) => ({ summary: String(r || ''), code: 'generation-failure' }),
        _alloDiagnosticResourceType: (t) => String(t || 'doc'),
        _alloDiagnosticBoundedInt: (n) => Number(n) || 0,
        _alloDiagnosticTimestamp: (t) => t || null,
        _alloDiagnosticRunId: (id) => id || 'run-1',
        ALLO_GENERATION_MAX_RESOURCES: 20,
        _alloSanitizeFullPackPreflight: (p) => p,
        ALLO_GENERATION_MAX_GROUPS: 10,
      };
      const malicious = JSON.parse('{"status":"completed","__proto__":{"polluted":true},"constructor":"bad","rows":{"r1":{"status":"landed","__proto__":{"x":1},"prototype":"bad"}}}');
      const cleaned = compactBp(malicious, false, deps);
      expect(Object.prototype.hasOwnProperty.call(cleaned, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(cleaned.rows.r1, 'prototype')).toBe(false);
      expect(({}).polluted).toBeUndefined();

      // _applyTextSurgery walks doc.body and rejects HEAD/TITLE
      const src = read('pure_helpers_module.js');
      expect(src).toContain("new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'TITLE'])");
      expect(src).toContain('doc.createTreeWalker(doc.body');
    });

    it('arcade_mode_concept_pictionary.js: guards zero-rect position, enforces shape MAX_POINTS, restores pictures on revisit, uses refs in startSet', () => {
      const src = read('arcade_mode_concept_pictionary.js');
      expect(src).toContain('if (!rect || !rect.width || !rect.height) return [0, 0]');
      expect(src).toContain('totalPoints + (isShape ? 2 : 1) > MAX_POINTS');
      expect(src).toContain('startSet(restorePictures(revisit,pool),pool)');
      expect(src).toContain('portfolioCards(archiveRef.current,recordsRef.current,draft)');
    });

    it('arcade_mode_concept_atlas.js: fixes accent fallback precedence, mini viewBox radius, functional milestones, viewAtlas.edges, ghost save guard, classReward reset, null-proto maps', () => {
      const src = read('arcade_mode_concept_atlas.js');
      expect(src).not.toContain("palette.accent + '22' || 'rgba(96,165,250,0.18)'");
      expect(src).toContain("palette.accent ? palette.accent + '22' : 'rgba(96,165,250,0.18)'");
      expect(src).toContain('nodeRadius = opts.nodeRadius || 8');
      expect(src).toContain('if (isMini) radius = maxFit');
      expect(src).toContain('if (isClassStudent) return;');
      expect(src).toContain('if (!atlas.topic && (atlas.edges || []).length === 0) return;');
      expect(src).toContain('conceptAtlas.classRewardKey = null');
      expect(src).toContain('if (ca.status !== \'closed\' && !ca.isComplete) return;');
      expect(src).toContain('if (!isClassHost || !atlas.topic || atlas.isComplete) return;');
      expect(src).toContain('if (sub.atlasId && sub.atlasId !== atlas.id) return;');
      expect(src).toContain('awardedMilestonesRef');
      expect(src).toContain('(viewAtlas.edges || []).length > 0');
      expect(src).toContain('Object.prototype.hasOwnProperty.call(emojiByVerb, e.edgeType)');
    });
  });

  // ── PASS 3: 6 STEM & Packet/Practice Core Engines ───────────────────────
  describe('Pass 3: STEM & Packet/Practice Core Engines', () => {
    it('stem_lumen_study.js: guards missing evidenceApi in render, checks citations[0], passes canonical candidateUrl, uses generation ref and null-proto lookups', () => {
      const ctx = loadInContext('stem_lab/stem_lumen_study.js');
      const api = ctx.window.LumenStudy;
      expect(api).toBeTruthy();
      // Should not throw when evidenceApi() is not yet loaded
      expect(() => api.render({ React: { createElement: (c, p) => ({ c, p }) } })).not.toThrow();

      const src = read('stem_lab/stem_lumen_study.js');
      expect(src).toContain('adapter.fn(candidateUrl)');
      expect(src).toContain('saved.citations && saved.citations[0] && nodes.some');
      expect(src).toContain('projectGenRef');
      expect(src).toContain('var nodeById = Object.create(null)');
      expect(src).toContain('var labelSeen = Object.create(null)');
    });

    it('stem_lumen_documents.js: guards out-of-range code points, own-property formatLabel, resets _jsZipPromise on missing JSZip, decodes percent-encoded EPUB hrefs', async () => {
      const ctx = loadInContext('stem_lab/stem_lumen_documents.js');
      const docs = ctx.window.LumenDocuments;
      expect(docs).toBeTruthy();
      expect(docs.formatLabel('toString')).toBe('TOSTRING');
      expect(docs.formatLabel('pdf')).toBe('PDF');

      // Out-of-range numeric entity should not throw RangeError
      const text = docs.htmlToReadableText('<p>Hello &#x110000; &#99999999; world</p>');
      expect(text).toContain('Hello');
      expect(text).toContain('world');

      // Percent-encoded EPUB hrefs
      const files = {
        'META-INF/container.xml': {
          async: async () => '<container><rootfiles><rootfile full-path="OEBPS/my%20book.opf"/></rootfiles></container>',
        },
        'OEBPS/my book.opf': {
          async: async () => '<package><manifest><item id="c1" href="chap%201.xhtml#top" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>',
        },
        'OEBPS/chap 1.xhtml': {
          async: async () => '<html><head><title>Ch 1</title></head><body><p>Percent decoded text &#x110000; ok.</p></body></html>',
        },
      };
      const fakeJSZip = {
        loadAsync: async () => ({
          files,
          file: (p) => files[p] || null,
        }),
      };
      const res = await docs.extractEpub(new Uint8Array([1, 2, 3]), { JSZip: fakeJSZip });
      expect(res.partCount).toBe(1);
      expect(res.text).toContain('Percent decoded text');
    });

    it('geometry_print_package.js: wraps TextDecoder.decode in decodeName so invalid UTF-8 throws invalidArchive()', () => {
      const src = read('stem_lab/geometry_print_package.js');
      expect(src).toContain('function decodeName(slice)');
      expect(src).toContain('catch (_) { throw invalidArchive(); }');
    });

    it('water_worlds_view.js: announces Run complete only on transition from incomplete to complete for the same storm', () => {
      const src = read('stem_lab/water_worlds_view.js');
      expect(src).toContain('prevRunRef');
      expect(src).toContain('curStart&&prev.start===curStart&&!prev.complete&&curComplete');
    });

    it('packets_verify_core.js: handles abrupt HTML5 comments, stops turning + into %20, catches %3Cscript%3E alongside bare %, handles spaced SVG params, flags localStorage bracket/direct access', () => {
      const ctx = loadInContext('packets_verify_core.js');
      const verify = ctx.window.AlloPacketVerify;
      expect(verify).toBeTruthy();

      const makePacket = (headPrefix, bodyContent, scriptBody = '') =>
        `<!doctype html><html><head>${headPrefix}<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"></head><body>` +
        `<script id="packet-manifest" type="application/json">{"kind":"alloflow-packet-manifest","schema":1,"mode":"practice","storageKey":"k"}</script>` +
        `${bodyContent}<script>${scriptBody}</script></body></html>`;

      // 1. Abrupt HTML5 comment `<!-->` before <meta http-equiv="Content-Security-Policy"> must NOT trigger stray-text head closure
      const repAbrupt = verify.verifyPacket(makePacket('<!-->', ''), 'abrupt.html');
      expect(repAbrupt.kind).not.toBe('not_packet');
      expect((repAbrupt.findings || []).some((f) => f.id === 'policy-late')).toBe(false);

      // 2. SVG with bare '%' + encoded %3Cscript%3E must be caught (svg-active)
      const htmlSvgBypass = makePacket('', '<img src="data:image/svg+xml,<svg width=&quot;100%&quot;>%3Cscript%3Ealert(1)%3C/script%3E</svg>">');
      const repSvgBypass = verify.verifyPacket(htmlSvgBypass, 'svgbypass.html');
      expect((repSvgBypass.findings || []).some((f) => f.id === 'svg-active')).toBe(true);

      // 3. SVG with whitespace after semicolon before base64
      const b64Evil = Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64');
      const htmlSpaced = makePacket('', `<img src="data:image/svg+xml; charset=utf-8; base64,${b64Evil}">`);
      const repSpaced = verify.verifyPacket(htmlSpaced, 'spaced.html');
      expect((repSpaced.findings || []).some((f) => f.id === 'svg-active')).toBe(true);

      // 4. localStorage bracket access & direct property flagged as LOOK (not EXPECTED)
      const htmlLs = makePacket('', '', 'localStorage["other_key"]="x"; localStorage.secret="y";');
      const repLs = verify.verifyPacket(htmlLs, 'ls.html');
      const lsFindings = (repLs.findings || []).filter((f) => f.id === 'local-storage');
      expect(lsFindings.length).toBeGreaterThanOrEqual(2);
      expect(lsFindings.every((f) => f.cls === 'needs a person to look')).toBe(true);
    });

    it('symbol_runner_core.js: own-property lookup in SPOKEN_MAP/DIGIT_WORDS, safePrintImg hardening, congruent quantity_stroop CCC SVG, flanker announcement & keyDown gating', () => {
      const ctx = loadInContext('symbol_runner_core.js');
      const sr = ctx.window.AlloSymbolRunnerCore;
      expect(sr).toBeTruthy();

      // Prototype key safety
      expect(() => sr.matchSpokenSymbol('constructor', { answer: 'constructor' })).not.toThrow();
      expect(sr.matchSpokenSymbol('constructor', { answer: 'constructor' })).toBe(true);
      expect(sr.resolveSpokenCueText({ category: 'number', answer: 'toString' })).toBe('tostring');

      // Congruent quantity_stroop keeps dot-pattern SVG in CCC sheet
      const ccc = sr.buildPrintableCccSheetHtml({ modeId: 'quantity_stroop' });
      expect(ccc).toContain('<svg');
      expect(ccc).toContain('&rarr;');

      // Hardened safePrintImg rejects namespaced script, animateTransform, DOCTYPE, @import style, external url()
      const cardsEvil = sr.buildPrintableSymbolCardsHtml({
        modeId: 'custom',
        customSymbols: ['cat'],
        pictures: {
          cat: {
            dataUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg><svg:script>alert(1)</svg:script></svg>'),
          },
        },
      });
      expect(cardsEvil).not.toContain('svg:script');
      expect(cardsEvil).not.toContain('<img class="fc-pic"');

      const cardsStyle = sr.buildPrintableSymbolCardsHtml({
        modeId: 'custom',
        customSymbols: ['dog'],
        pictures: {
          dog: {
            dataUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg><style>@import url(https://evil.example/a.css);</style><rect/></svg>'),
          },
        },
      });
      expect(cardsStyle).not.toContain('<img class="fc-pic"');

      // Source checks for maxLength=20, flanker speech, !started keyDown guard
      const src = read('symbol_runner_core.js');
      expect(src).toContain('typeInput.maxLength = 20');
      expect(src).toContain("if (destroyed || !current || !started) return;");
      expect(src).toContain("/^(letter|word|sound|chunk)$/");
    });
  });
});
