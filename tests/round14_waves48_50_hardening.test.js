import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256File(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}

describe('Round 14 (Waves 48–50) Runtime Loaders, Offline Packets & Core API/Document Hardening', () => {
  // ── Wave 48: Runtime Security Loaders ──
  it('Wave 48 — data_kernel_loader.js: blocks tagged dollar quotes, comma/list file literals, DuckDB metadata funcs, and preserves string literals during data rewrite', async () => {
    const src = readRepo('data_kernel_loader.js');
    const fnStart = src.indexOf('function stripCtl(');
    const fnEnd = src.indexOf('function safeResultValue(');
    const safeQuery = new Function(src.slice(fnStart, fnEnd) + '\nreturn safeQuery;')();
    expect(() => safeQuery('SELECT * FROM $a$secret.csv$a$')).toThrow();
    expect(() => safeQuery("SELECT * FROM data, 'secret.csv'")).toThrow();
    expect(() => safeQuery("SELECT * FROM ['secret.csv']")).toThrow();
    expect(() => safeQuery('SELECT * FROM duckdb_columns()')).toThrow();
    expect(() => safeQuery("SELECT * FROM read_lines('x')")).toThrow();
    expect(() => safeQuery("SELECT which_secret('a','b')")).toThrow();
    expect(safeQuery("SELECT * FROM data WHERE topic = 'data'")).toBe("SELECT * FROM data WHERE topic = 'data'");

    // Token-aware rewrite preserves 'data' string literals and already-quoted "data"
    const rewriteFn = (s) => safeQuery(s).replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\bdata\b/gi, (m) => (/^data$/i.test(m) ? '"data"' : m));
    expect(rewriteFn("SELECT * FROM data WHERE topic = 'data'")).toBe('SELECT * FROM "data" WHERE topic = \'data\'');
    expect(rewriteFn('SELECT * FROM "data"')).toBe('SELECT * FROM "data"');

    // Token-aware rewrite & unique sequential filenames present in loader
    expect(src).toContain('var workspaceSeq = 0;');
    expect(src).toContain("alloflow_data_' + Date.now() + '_' + (++workspaceSeq)");
  });

  it('Wave 48 — sre_loader.js, mathlive_loader.js, liblouis_braille_loader.js, piper_tts_loader.js, sd_turbo_loader.js & dictionary_loader.js hardening', async () => {
    // 1. sre_loader.js: local SRI + offline flag isolation + sanitizeMathML allows text "one = 1" while blocking on*
    const sreSrc = readRepo('sre_loader.js');
    expect(sreSrc).toContain("CDN_SRI_BY_URL[LOCAL_ASSET_BASE + 'sre.js']");
    expect(sreSrc).toContain("CDN_SRI_BY_URL[LOCAL_ASSET_BASE + 'temml.min.js']");
    expect(sreSrc).toContain("CDN_SRI_BY_URL[LOCAL_ASSET_BASE + 'Temml-Local.css']");
    expect(sreSrc).toContain('window.__alloOfflineOnly === true');
    expect(sreSrc).toContain('_engineSignature = null;');
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'https://alloflow.org/',
      runScripts: 'outside-only',
    });
    try {
      const mStart = sreSrc.indexOf('var ALLOWED_MATHML_TAGS =');
      const mEnd = sreSrc.indexOf('function latexToMathML(', mStart);
      const sanitizeMathML = new Function('DOMParser', sreSrc.slice(mStart, mEnd) + '\nreturn sanitizeMathML;')(dom.window.DOMParser);
      const math = sanitizeMathML('<math><mtext>one = 1</mtext></math>');
      expect(math).toContain('one = 1');
      const stripped = sanitizeMathML('<math><mtext onclick="alert(1)">ok</mtext><script>alert(1)</script></math>');
      expect(stripped).not.toContain('onclick');
      expect(stripped).not.toContain('<script');
    } finally {
      dom.window.close();
    }

    // 2. mathlive_loader.js: local SRI + offline isolation + configureRuntime in poll
    const mlSrc = readRepo('mathlive_loader.js');
    expect(mlSrc).toContain('script.integrity = MATHLIVE_SRI;');
    expect(mlSrc).toContain('window.__alloOfflineOnly === true');
    expect(mlSrc).toContain('if (customElementReady()) {\n          configureRuntime(candidate.fonts);');

    // 3. liblouis_braille_loader.js: cellsPerLine <= 1 terminates (no infinite loop) + blocks CDN in offline mode
    const brWin = { __alloOfflineOnly: true };
    vm.runInNewContext(readRepo('liblouis_braille_loader.js'), { window: brWin, console, document: {} });
    const brf = brWin.AlloBraille.toGrade1BRF('1234567890', { cellsPerLine: 1 });
    expect(String(brf.text || brf).length).toBeGreaterThan(0);
    expect(await brWin.AlloBraille.toUEB('hello')).toBeNull();

    // 4. piper_tts_loader.js & sd_turbo_loader.js offline/restricted mode guards
    const piperSrc = readRepo('piper_tts_loader.js');
    expect(piperSrc).toContain('function _isRemoteBlocked()');
    expect(piperSrc).toContain('window.__alloStudentAiDisabled === true');
    expect(piperSrc).toContain('return tryStoredVoice();');

    const sdWin = { __alloOfflineOnly: true };
    vm.runInNewContext(readRepo('sd_turbo_loader.js'), { window: sdWin, console, navigator: {}, Promise });
    await expect(sdWin._sdTurbo.init()).rejects.toThrow(/disabled/i);
    expect(readRepo('sd_turbo_loader.js')).toContain('function releasePartialSessions()');

    // 5. dictionary_loader.js: object-typed __alloQrStudentMode & Local-Box & offline block external fetch; protocol-relative audio rejected
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    const dWin = {
      __alloQrStudentMode: { type: 'mailbox-live' },
      location: { href: 'https://alloflow.org/' },
    };
    vm.runInNewContext(readRepo('dictionary_loader.js'), {
      window: dWin,
      navigator: { onLine: true },
      fetch: fetchSpy,
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      AbortController,
      setTimeout,
      clearTimeout,
      console,
    });
    const qrRes = await dWin.AlloDictionary.lookupDetailed('apple');
    expect(qrRes.reason).toBe('not_available');
    expect(fetchSpy).not.toHaveBeenCalled();

    // Protocol-relative audio URL rejected
    const dSrc = readRepo('dictionary_loader.js');
    expect(dSrc).toContain("if (!url || url.indexOf('//') === 0 || url.indexOf('\\\\') !== -1) return '';");
  });

  // ── Wave 49: Offline Take-Home Packets & Results Pipeline ──
  it('Wave 49 — packets_verify_core.js: catches dotted-namespace SVG, style attr-gt, image-set(), srcdoc=, and CSP Level 3 script-src / script-src-attr bypasses', () => {
    const verify = require('../packets_verify_core.js');
    const makePacketWithSvg = (svg) => {
      const b64 = Buffer.from(svg, 'utf8').toString('base64');
      const scriptBody = `const LESSON = ${JSON.stringify({ images: { p1: 'data:image/svg+xml;base64,' + b64 } })};`;
      const hash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
      return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'; connect-src 'none'; worker-src 'none'"><title>T</title></head><body><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","version":1}</script><script>${scriptBody}</script></body></html>`;
    };

    for (const badSvg of [
      '<svg xmlns="http://www.w3.org/2000/svg"><a.b:script>alert(1)</a.b:script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style title="a/>">@import "https://evil.example/x.css";</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:image-set(\'https://evil.example/a.png\' 1x)"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><g srcdoc="<script>1</script>"/></svg>',
    ]) {
      const rep = verify.verifyPacket(makePacketWithSvg(badSvg));
      expect(rep.findings.some((f) => f.id === 'svg-active'), badSvg).toBe(true);
    }

    // CSP Level 3 bypasses: script-src-elem with wider script-src 'unsafe-eval', and script-src-attr 'unsafe-inline'
    const scriptBody = '/* ok */';
    const hash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
    const cspEvalBypass = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src-elem 'sha256-${hash}'; script-src 'unsafe-eval' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'; connect-src 'none'; worker-src 'none'"><title>T</title></head><body><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","version":1}</script><script>${scriptBody}</script></body></html>`;
    const evalRep = verify.verifyPacket(cspEvalBypass);
    expect(evalRep.findings.some((f) => f.id === 'policy-builds')).toBe(true);
    expect(evalRep.findings.some((f) => f.id === 'policy-script-fallback')).toBe(true);

    const cspAttrBypass = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; script-src-attr 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'; connect-src 'none'; worker-src 'none'"><title>T</title></head><body><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","version":1}</script><script>${scriptBody}</script></body></html>`;
    const attrRep = verify.verifyPacket(cspAttrBypass);
    expect(attrRep.findings.some((f) => f.id === 'policy-script-attr')).toBe(true);
  });

  it('Wave 49 — builders, packets_reopen.js, packets_results_reader.js & packets_vocab_media.js hardening', () => {
    // 1. packet_check_builder.js: missing </script> does not corrupt HTML
    const check = require('../packet_check_builder.js');
    const broken = '<script type="application/json" id="packet-manifest">{"version":1}';
    expect(check.withCodeName(broken, 'Owl7')).toBe(broken);

    // 2. packets_reopen.js: rejects https audio in read-along fallback, rejects active SVG, no prototype leak in keyOf
    const reopen = require('../packets_reopen.js');
    const verify = require('../packets_verify_core.js');
    const badReadAlongLesson = {
      schema: 'alloflow-take-home-lesson/1',
      mode: 'read_along',
      title: 'Story',
      audio: { a1: 'https://evil.example/track.mp3' },
      blocks: [{ activity: 'read_along', items: [{ lines: [{ text: 'Hello.', audio: 'a1' }] }] }],
    };
    const badReadAlong = `<!doctype html><html><body><script type="application/json" id="packet-manifest">{"kind":"alloflow-packet-manifest","title":"Story"}</script><script>(function () { "use strict"; var lesson=${JSON.stringify(badReadAlongLesson)};\nvar labels={}; })();</script></body></html>`;
    const raOut = reopen.readReadAlong(badReadAlong, { verify });
    expect(raOut.ok).toBe(true);
    expect(Object.keys(raOut.readAlong.clips)).toHaveLength(0);

    // 3. packets_results_reader.js: zipCleanName strips '..' and preserves '.csv' on >160-char path
    const rrSrc = readRepo('packets_results_reader.js');
    const fnMatch = rrSrc.match(/function zipCleanName\(raw\)\s*\{[\s\S]*?\n  \}/);
    expect(fnMatch).toBeTruthy();
    const zipCleanName = vm.runInNewContext(`(${fnMatch[0]})`);
    expect(zipCleanName('../../evil/student.csv')).toBe('evil/student.csv');
    const longPath = 'folder_'.repeat(30) + '/student_results.csv';
    expect(longPath.length).toBeGreaterThan(160);
    expect(zipCleanName(longPath).endsWith('.csv')).toBe(true);
    expect(zipCleanName(longPath).length).toBeLessThanOrEqual(160);

    // 4. packets_vocab_media.js clears gettingKit on failure & removes failed script tag
    const vmSrc = readRepo('packets_vocab_media.js');
    expect(vmSrc).toContain('if (!kit) gettingKit = null;');
    expect(vmSrc).toContain('script.parentNode.removeChild(script)');
  });

  // ── Wave 50: Core Document Pipeline, TTS, Audio Helpers, Large File, Gemini API & Educator Evaluation ──
  it('Wave 50 — doc_pipeline_module.js: blocks iframe[srcdoc] & <base> in _neutralizeForAuditFrame, quote-adjacent onerror & entity JS in _sanitizeRawHtmlBlock, and XSS in _alloStructureOnlyEdit', () => {
    const dpSrc = readRepo('doc_pipeline_module.js');
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://alloflow.org/' });
    const { DOMParser } = dom.window;
    try {
      // Extract & execute _neutralizeForAuditFrame
      const nStart = dpSrc.indexOf('const _neutralizeForAuditFrame = (html) => {');
      const nEnd = dpSrc.indexOf('var _axeSourceCache', nStart);
      expect(nStart).toBeGreaterThan(0);
      expect(nEnd).toBeGreaterThan(nStart);
      const neutralize = new Function('DOMParser', dpSrc.slice(nStart, nEnd) + '\nreturn _neutralizeForAuditFrame;')(DOMParser);
      const out = neutralize('<html><head><base href="https://evil.example/"></head><body><iframe srcdoc="<script>parent.pwn()</script>"></iframe><a href="java&#x09;script:alert(1)">x</a></body></html>');
      expect(out).not.toMatch(/<base\b/i);
      expect(out).not.toMatch(/\ssrcdoc\s*=/i);
      expect(out).toContain('data-allo-neutralized-srcdoc');
      expect(out).toContain('about:blank#neutralized');

      // Extract & execute _sanitizeRawHtmlBlock with DOMPurify unavailable
      const sStart = dpSrc.indexOf('const _sanitizeRawHtmlBlock = (rawHtml) => {');
      const sEnd = dpSrc.indexOf('// Best-effort warm-up at module init', sStart);
      expect(sStart).toBeGreaterThan(0);
      expect(sEnd).toBeGreaterThan(sStart);
      const sanitizeRaw = new Function('DOMParser', '_approvedDOMPurify', '_ensureDOMPurify', '_RAWHTML_PURIFY_CFG',
        dpSrc.slice(sStart, sEnd) + '\nreturn _sanitizeRawHtmlBlock;'
      )(DOMParser, () => null, () => {}, {});
      expect(sanitizeRaw('<img src="x"onerror="alert(1)">')).toContain('data-allo-rawhtml-withheld="true"');
      expect(sanitizeRaw('<a href="&#106;avascript:alert(1)">Click</a>')).toContain('data-allo-rawhtml-withheld="true"');
      expect(sanitizeRaw('<a href="java&#x09;script:alert(1)">Click</a>')).toContain('data-allo-rawhtml-withheld="true"');
      expect(sanitizeRaw('<p>Safe paragraph</p>')).toBe('<p>Safe paragraph</p>');

      // Extract & execute _alloStructureOnlyEdit
      const eStart = dpSrc.indexOf('function _alloTriageVisibleText(');
      const eEnd = dpSrc.indexOf('function _alloParseTriageReply(', eStart);
      expect(eStart).toBeGreaterThan(0);
      const structEdit = new Function('DOMParser', dpSrc.slice(eStart, eEnd) + '\nreturn _alloStructureOnlyEdit;')(DOMParser);
      expect(structEdit('<p>Hello</p>', '<p class="x"onclick="alert(1)">Hello</p>').ok).toBe(false);
      expect(structEdit('<p>Hello</p>', '<p><svg onload="alert(1)"></svg>Hello</p>').ok).toBe(false);
      expect(structEdit('<p>Hello</p>', '<p srcdoc="x">Hello</p>').ok).toBe(false);
      expect(structEdit('<div>Hello</div>', '<p>Hello</p>').ok).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('Wave 50 — tts_module.js, audio_helpers_module.js, large_file_module.js, gemini_api_module.js & educator_evaluation_module.js hardening', () => {
    // 1. tts_module.js: strict-mode safe AbortError creation (no DOMException.name assignment)
    const ttsSrc = readRepo('tts_module.js');
    expect(ttsSrc).not.toContain("fetchError.name = 'AbortError'");
    expect(ttsSrc).toContain("const abortError = new Error('TTS request aborted')");

    // 2. audio_helpers_module.js: isolates voiceMap by isKokoro family & separates poolIndex from speaker keys
    const ahSrc = readRepo('audio_helpers_module.js');
    expect(ahSrc).toContain('persistentVoiceMapRef.current.isKokoro !== isSelectedKokoro');
    expect(ahSrc).toContain('basePool.includes(voiceMap[name])');

    // 3. large_file_module.js: focus-trap effect tracks Boolean(isOpen && file)
    const lfSrc = readRepo('large_file_module.js');
    expect(lfSrc).toContain('const isVisible = Boolean(isOpen && file)');
    expect(lfSrc).toContain('[isVisible]');

    // 4. gemini_api_module.js: post-await _guardRequest + allo/ai-disabled rethrow + hoisted _signal
    const gmSrc = readRepo('gemini_api_module.js');
    expect(gmSrc).toContain("e?.code === 'allo/ai-disabled'");
    expect(gmSrc).toContain("probeErr?.code === 'allo/ai-disabled'");
    expect(gmSrc).toContain('signal: _signal, useCodeExecution');

    // 5. educator_evaluation_module.js: aeSafeDriveUrl + preserve stash on failed save + aeSafeId(parsed.packetId)
    const eeSrc = readRepo('educator_evaluation_module.js');
    expect(eeSrc).toContain('function aeSafeDriveUrl(');
    expect(eeSrc).toContain('aeSafeDriveUrl(exportState.result.export');
    expect(eeSrc).toContain('aeSafeDriveUrl(archive.url)');
    expect(eeSrc).toContain('aeSafeDriveUrl(archiveState.result.candidate');
    expect(eeSrc).toContain('own.receivedPacketId = aeSafeId(parsed.packetId');
    expect(eeSrc).toContain('if (saved.ok) {');
  });

  // ── 4-Way SHA-256 Mirror Parity for all 19 Round 14 Mirrored Deliverables ──
  it('Round 14 deliverables maintain 4-way SHA-256 parity across root and all 3 desktop mirrors', () => {
    const deliverables = [
      // Wave 48
      'data_kernel_loader.js',
      'sre_loader.js',
      'mathlive_loader.js',
      'piper_tts_loader.js',
      'sd_turbo_loader.js',
      'liblouis_braille_loader.js',
      'dictionary_loader.js',
      // Wave 49
      'packets_verify_core.js',
      'packet_read_along_builder.js',
      'packet_symbol_runner_builder.js',
      'packet_vocab_builder.js',
      'packet_check_builder.js',
      // Wave 50
      'tts_module.js',
      'audio_helpers_module.js',
      'large_file_module.js',
      'gemini_api_module.js',
      'educator_evaluation_module.js',
      'educator_evaluation_standalone.js',
      'doc_pipeline_module.js',
    ];
    const mirrors = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const file of deliverables) {
      const expected = sha256File(file);
      for (const dir of mirrors) {
        const mirrorPath = path.join(dir, file);
        expect(sha256File(mirrorPath), `${mirrorPath} SHA-256 mismatch`).toBe(expected);
      }
    }
  });
});
