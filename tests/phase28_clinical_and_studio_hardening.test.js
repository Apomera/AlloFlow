import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const readBuf = (rel) => readFileSync(resolve(ROOT, rel));

const extractFn = (src, sig) => {
  const norm = src.replace(/\r\n/g, '\n');
  const start = norm.indexOf(sig);
  if (start < 0) throw new Error('Function not found: ' + sig);
  const lineStart = norm.lastIndexOf('\n', start) + 1;
  const indent = norm.slice(lineStart, start).match(/^[ \t]*/)[0];
  const openBrace = norm.indexOf('{', start);
  const singleLineEnd = norm.indexOf('\n', start);
  const sameLineClose = norm.indexOf('}', openBrace);
  if (sameLineClose > openBrace && (singleLineEnd < 0 || sameLineClose < singleLineEnd)) {
    return norm.slice(start, sameLineClose + 1);
  }
  const closeMarker = '\n' + indent + '}';
  const closeIdx = norm.indexOf(closeMarker, openBrace);
  if (closeIdx < 0) throw new Error('Closing brace not found for: ' + sig);
  return norm.slice(start, closeIdx + closeMarker.length);
};

describe('Phase 28 Track 1 — Student Analytics & BehaviorLens hardening', () => {
  const saSrc = read('student_analytics_module.js');
  const blSrc = read('behavior_lens_module.js');
  const blwSrc = read('behavior_lens_workspace_module.js');

  it('neutralizes CSV formula injection for non-string values (arrays/objects) in student_analytics_module.js', () => {
    const fnSrc = extractFn(saSrc, 'function _acCsvCell(value)');
    const _acCsvCell = new Function(fnSrc + '\nreturn _acCsvCell;')();
    expect(_acCsvCell(['=1+1'])).toBe('"\'=1+1"');
    expect(_acCsvCell({ toString: () => '+cmd|calc' })).toBe('"\'+cmd|calc"');
    expect(_acCsvCell(-42)).toBe('"-42"');
    expect(_acCsvCell('plain')).toBe('"plain"');
  });

  it('restricts survey images to safe raster base64 data URLs <= 512 KB and guards aimline & reports', () => {
    const imgFnSrc = extractFn(saSrc, 'function _saSafeSurveyImageSrc(src)');
    const _saSafeSurveyImageSrc = new Function(imgFnSrc + '\nreturn _saSafeSurveyImageSrc;')();
    expect(_saSafeSurveyImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(_saSafeSurveyImageSrc('data:image/svg+xml;base64,PHN2Zz4=')).toBe('');
    expect(_saSafeSurveyImageSrc('javascript:alert(1)')).toBe('');
    expect(_saSafeSurveyImageSrc('data:image/png;base64,' + 'A'.repeat(750000))).toBe('');

    expect(saSrc).toContain('function _saOwnArr(obj, key)');
    expect(saSrc).toContain('Math.min(520, Math.max(1,');
    expect(saSrc).toContain("k === '__proto__' || k === 'constructor' || k === 'prototype'");
    expect(saSrc).toContain('saEscapeReportText');
  });

  it('hardens BehaviorLens debug logging, CSV export, ABA ticks, media upload cap, and workspace bounds', () => {
    expect(blSrc).toContain('window.__alloDebug === true');
    expect(blSrc).toContain('const blSafeFileSlug =');
    expect(blSrc).toContain('[csvCell(r), csvCell(matrix[r] || 0)]');
    expect(blSrc).toContain('Object.create(null)');
    expect(blSrc).toMatch(/50\s*\*\s*1024\s*\*\s*1024/);
    expect(blSrc).toMatch(/canvas\.toBlob\(blob => \{\s*if \(!blob\)/);

    const parseCsvSrc = extractFn(blwSrc, 'function parseCsvRows(text)');
    const parseCsvRows = new Function(parseCsvSrc + '\nreturn parseCsvRows;')();
    const bigCsv = Array.from({ length: 50050 }, (_, i) => `a${i},b${i}`).join('\n');
    expect(() => parseCsvRows(bigCsv)).toThrow(/50,000-row safety limit/);
    expect(blwSrc).not.toContain('Math.min.apply(null, times)');
    expect(blwSrc).not.toContain('Math.max.apply(null, times)');
  });
});

describe('Phase 28 Track 2 — Report Writer, Dynamic Assessment & Maine SLD hardening', () => {
  const rwSrc = read('report_writer_module.js');
  const daSrc = read('dynamic_assessment_module.js');
  const msldSrc = read('maine_sld_practice_source.jsx');
  const msldStateSrc = read('maine_sld_state_workspace_source.jsx');

  it('hardens Report Writer lookups, finite score validation, and print CSP', () => {
    expect(rwSrc).toContain('const rwOwn = (obj, k) =>');
    expect(rwSrc).toContain('const rwFiniteScore = (v) =>');
    expect(rwSrc).toContain("http-equiv=\"Content-Security-Policy\" content=\"default-src \\'none\\'; style-src \\'unsafe-inline\\'; img-src data:;\"");
    expect(rwSrc).toContain('rwOwn(ASSESSMENT_PRESETS, selectedAssessment)');
    expect(rwSrc).toContain('rwOwn(RW_DESCRIPTOR_SCALES, selectedAssessment)');
  });

  it('strips prototype keys and guards scoring math & CSV export in dynamic_assessment_module.js', () => {
    const stripSrc = [
      extractFn(daSrc, 'function daIsUnsafeKey(key)'),
      extractFn(daSrc, 'function daStripUnsafeKeys(value, depth)'),
    ].join('\n');
    const daStripUnsafeKeys = new Function(stripSrc + '\nreturn daStripUnsafeKeys;')();
    const polluted = JSON.parse('{"ok":1,"__proto__":{"pwned":true},"nested":{"constructor":"bad","safe":"yes"}}');
    const clean = daStripUnsafeKeys(polluted);
    expect(clean.ok).toBe(1);
    expect(clean.nested.safe).toBe('yes');
    expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(clean.nested, 'constructor')).toBe(false);
    expect(({}).pwned).toBeUndefined();

    const mathSrc = [
      extractFn(daSrc, 'function maxPossibleScore(itemCount)'),
      extractFn(daSrc, 'function computeModifiabilityIndex(pretestSum, posttestSum, itemCount)'),
      extractFn(daSrc, 'function transferTier(transferSum, transferMax, posttestSum, posttestMax)'),
      extractFn(daSrc, 'function computeMiZScore(thisMI, popMean, popSD)'),
      extractFn(daSrc, 'function computeMiPercentile(thisMI, allMIs)'),
      extractFn(daSrc, 'function interpretCohenD(d)'),
    ].join('\n');
    const daMath = new Function(mathSrc + '\nreturn { maxPossibleScore, computeModifiabilityIndex, transferTier, computeMiZScore, computeMiPercentile, interpretCohenD };')();
    expect(daMath.computeModifiabilityIndex(NaN, 10, 4)).toBe(0);
    expect(daMath.computeModifiabilityIndex(0, Infinity, 4)).toBe(0);
    expect(daMath.transferTier(NaN, 10, 10, 10)).toBeNull();
    expect(daMath.transferTier(5, -1, 10, 10)).toBeNull();
    expect(daMath.computeMiZScore(NaN, 0.5, 0.2)).toBeNull();
    expect(daMath.computeMiPercentile(0.5, [NaN, Infinity])).toBeNull();
    expect(daMath.interpretCohenD(NaN).label).toBe('—');

    expect(daSrc).toContain('var ITEMS_BY_ID = Object.create(null);');
    expect(daSrc).toContain('var DA_REDACTED_SESSION_FIELDS = Object.assign(Object.create(null),');
    expect(daSrc).toContain('function num(x) { return typeof x === "number" && Number.isFinite(x) ? x.toFixed(4) : ""; }');
    expect(daSrc).toContain('if (!daCanExport("print")) return;');
  });

  it('hardens Maine SLD print cleanup, URL scheme validation, and Blob revocation', () => {
    expect(msldSrc).toContain('.msld-print,.msld-print-root{display:none}');
    expect(msldSrc).toContain('printCleanupRef = React.useRef(null)');
    expect(msldSrc).toContain('/^https?:\\/\\//i.test(raw) ? raw : \'\'');
    expect(msldSrc).toContain('finally {\n      setTimeout(() => { try { URL.revokeObjectURL(href); } catch (_) {} }, 1000);');
    expect(msldStateSrc).toContain('finally {\n        window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);');
  });
});

describe('Phase 28 Track 3 — PDF Audit, UDL Chat & Research Hub hardening', () => {
  const pdfSrc = read('view_pdf_audit_source.jsx');
  const evSrc = read('allobot_evidence.js');
  const chatSrc = read('udl_chat_source.jsx');
  const rhSrc = read('research_hub_source.jsx');
  const rheSrc = read('research_hub_educator_source.jsx');

  it('fixes PDF Audit signed audit trail escaping, AI CSS sanitization, SSRF URL check, and SVG data image blocking', () => {
    // C1: no broken /<\\//g regex; < escaped before hashing
    expect(pdfSrc).not.toContain('payloadJson.replace(/<\\\\//g');
    expect(pdfSrc).toContain("const payloadJson = JSON.stringify(payloadCore, null, 2).replace(/</g, '\\\\u003c');");
    expect(pdfSrc).toContain('const baseReport = _viewSanitizeMarkupForExport(rawBaseReport, _docPipeline);');
    expect(pdfSrc).toContain("baseReport.replace(/<\\/body>/i, () => trailFooter + '</body>')");

    // C2: saved templates CSP + escaping + Array.isArray check
    expect(pdfSrc).toContain('!Array.isArray(tmpl.structure)');
    expect(pdfSrc).toContain("content=\"default-src 'none'; style-src 'unsafe-inline';\"");

    // C3: AI Restyle CSS sanitizer
    const cssFn = new Function(extractFn(pdfSrc, 'function _viewSanitizeAiRestyleCss(rawCss)') + '\nreturn _viewSanitizeAiRestyleCss;')();
    const cleaned = cssFn('```css\n@import url("https://evil.example/x.css");\nbody { background: url(https://evil.example/a.png); color: #111; behavior: url(x.htc); }\n</style><script>alert(1)</script>\n```');
    expect(cleaned).not.toMatch(/@import|url\s*\(|behavior\s*:|<\/?style/i);
    expect(cleaned).toContain('color: #111;');

    // H4: SSRF public URL check
    const pubFn = new Function(extractFn(pdfSrc, 'function _viewIsPublicRemoteUrl(urlOrParsed)') + '\nreturn _viewIsPublicRemoteUrl;')();
    expect(pubFn('https://example.org/syllabus.html')).toBe(true);
    expect(pubFn('http://localhost:8080/admin')).toBe(false);
    expect(pubFn('http://127.0.0.1/secret')).toBe(false);
    expect(pubFn('http://10.0.0.1/internal')).toBe(false);
    expect(pubFn('http://172.16.0.1/internal')).toBe(false);
    expect(pubFn('http://192.168.1.1/router')).toBe(false);
    expect(pubFn('http://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(pubFn('http://100.64.0.1/cgnat')).toBe(false);
    expect(pubFn('http://[::1]/loopback')).toBe(false);
    expect(pubFn('https://user:pass@example.org/')).toBe(false);
    expect(pubFn('file:///etc/passwd')).toBe(false);

    // H5: hostile SVG blocked by _altFmtDecodeDataImage
    const svgFn = new Function(extractFn(pdfSrc, 'function _altFmtDecodeDataImage(src)') + '\nreturn _altFmtDecodeDataImage;')();
    const badSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>').toString('base64');
    const goodSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>').toString('base64');
    expect(svgFn(badSvg)).toBeNull();
    expect(svgFn(goodSvg)?.mime).toBe('image/svg+xml');
  });

  it('hardens AllobotEvidence safeUrl and UDL Chat routing/JSON reviver/async guards', () => {
    const safeUrlMatch = evSrc.match(/const safeUrl = value => \{[\s\S]*?\n  \};/);
    expect(safeUrlMatch).toBeTruthy();
    const safeUrl = new Function(safeUrlMatch[0] + '\nreturn safeUrl;')();
    expect(safeUrl('https://udlguidelines.cast.org/')).toBe('https://udlguidelines.cast.org/');
    expect(safeUrl('https://172.16.0.5/x')).toBe('');
    expect(safeUrl('https://100.64.0.1/x')).toBe('');
    expect(safeUrl('https://[::1]/x')).toBe('');
    expect(safeUrl('https://224.0.0.1/x')).toBe('');
    expect(safeUrl('http://example.org/')).toBe('');
    expect(safeUrl('https://user:pass@example.org/')).toBe('');

    expect(chatSrc).toContain('const _udlSafeJsonReviver =');
    expect(chatSrc).toContain('const isUrl = /^(?:https?:\\/\\/|www\\.)\\S+$/i.test(textToSend.trim());');
    expect(chatSrc).toContain('await generateBlueprint(\'Auto\', userContext);');
    expect(chatSrc).toContain('Object.prototype.hasOwnProperty.call(moduleActions, modTarget)');
    expect(chatSrc).toContain('allowedNavTargets.includes(navTarget)');
  });

  it('enforces zero-cap no_ai_stage_sentinel, media key allowlist, and URL/audio checks in Research Hub', () => {
    expect(rhSrc).toContain('Object.prototype.hasOwnProperty.call(PER_TOUCHPOINT_CAP, tpId)');
    expect(rhSrc).toContain('/^(audioBase64|sketchDataUrl|imageDataUrl)Ref$/i.test(key)');
    expect(rhSrc).toContain('var registeredToolIntegrations = Object.create(null);');
    expect(rhSrc).toContain('var registeredCaptureSanitizers = Object.create(null);');
    expect(rhSrc).toContain('_lanes: Object.create(null),');

    const urlFn = new Function(extractFn(rhSrc, 'function safeResearchHttpUrl(raw)') + '\nreturn safeResearchHttpUrl;')();
    expect(urlFn('https://example.edu/paper')).toBe('https://example.edu/paper');
    expect(urlFn('javascript:alert(1)')).toBe('');
    expect(urlFn('https://u:p@example.edu/')).toBe('');

    const audioFn = new Function(extractFn(rhSrc, 'function safeResearchAudioDataUrl(raw)') + '\nreturn safeResearchAudioDataUrl;')();
    expect(audioFn('data:audio/webm;base64,GkXfo59ChoEB')).toBe('data:audio/webm;base64,GkXfo59ChoEB');
    expect(audioFn('javascript:alert(1)')).toBe('');
    expect(audioFn('https://evil.example/a.mp3')).toBe('');

    expect(rheSrc).toContain('Object.prototype.hasOwnProperty.call(labels, id)');
    expect(rheSrc).toContain("typeof q.deltaJaccard === 'number' && Number.isFinite(q.deltaJaccard)");
  });
});

describe('Phase 28 Delivery — 4-way mirror parity and 3-host SRI manifest sync', () => {
  const bdm = require('../dev-tools/build_browser_delivery_manifest.cjs');
  const modified = [
    'student_analytics_module.js',
    'behavior_lens_module.js',
    'behavior_lens_workspace_module.js',
    'report_writer_module.js',
    'dynamic_assessment_module.js',
    'maine_sld_practice_module.js',
    'view_pdf_audit_module.js',
    'document_narration_text_module.js',
    'udl_chat_module.js',
    'research_hub_module.js',
    'research_hub_educator_module.js',
  ];

  it('maintains byte-for-byte parity across root, public, build, and app-build for all 11 deliverables', () => {
    const mirrorDirs = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of modified) {
      const rootBuf = readBuf(rel);
      for (const dir of mirrorDirs) {
        const mirrorBuf = readBuf(`${dir}/${rel}`);
        expect(mirrorBuf.equals(rootBuf), `Mirror drift in ${dir}/${rel}`).toBe(true);
      }
    }
  });

  it('pins identical releaseId and exact bytes/SHA-384 SRI across all 3 host files', () => {
    const manifests = bdm.HOST_FILES.map((host) => bdm.readEmbeddedManifest(read(host)));
    const firstReleaseId = manifests[0].releaseId;
    for (const m of manifests) {
      expect(m.releaseId).toBe(firstReleaseId);
      for (const rel of modified) {
        const buf = readBuf(rel);
        const sri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(m.assets[rel]?.bytes, `${rel} bytes`).toBe(buf.length);
        expect(m.assets[rel]?.integrity, `${rel} integrity`).toBe(sri);
      }
    }
  });
});
