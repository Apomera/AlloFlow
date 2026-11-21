import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const bdm = require(path.join(ROOT, 'dev-tools', 'build_browser_delivery_manifest.cjs'));

describe('Phase 30 — Voice, Escape Room, Throughline, Generation Helpers, Catalog, Accessibility Lab & Pictionary hardening', () => {
  it('hardens voice_module.js (prototype-safe prefs/JSON, QR-student gate, bounded fetch, non-RegExp translate, fenced rubric)', () => {
    const src = read('voice_module.js');
    expect(src).toContain('function _voiceUnsafeKey(');
    expect(src).toContain('function _voiceSafeJsonParse(');
    expect(src).toContain('function _voiceFenceUntrusted(');
    expect(src).toContain("window.__alloQrStudentMode === true");
    expect(src).toContain("credentials: 'omit'");
    expect(src).toContain("referrerPolicy: 'no-referrer'");
    expect(src).toContain('MAX_RECORDING_BYTES');
    expect(src).toContain("_voiceFenceUntrusted('RUBRIC_CONTEXT'");
    expect(src).toContain('isFinite(rawMaxDur) && rawMaxDur > 0 ? Math.min(rawMaxDur, 600000)');
    expect(src).toContain('return isFinite(n) ? Math.max(minVal, n) : defVal;');
    // translateVoiceText uses split/join instead of dynamic RegExp
    expect(src).not.toMatch(/new RegExp\([^)]*placeholder/);
  });

  it('hardens escape_room_module.js (FNV-1a sourceTextHash FERPA fix, teamProgress path regex, prototype safety, fenced repair)', () => {
    const src = read('escape_room_module.js');
    expect(src).toContain('var _erUnsafeKey = function');
    expect(src).toContain('var _erSafeJsonParse = function');
    expect(src).toContain('var _erHashText = function');
    expect(src).toContain('sourceTextHash: _erHashText(inputText)');
    expect(src).not.toContain("sourceTextHash: String(inputText || '').substring(0, 100)");
    expect(src).toContain("window.__alloQrStudentMode === true");
    expect(src).toContain('/^[A-Za-z0-9_-]{1,32}$/.test(userTeam)');
    expect(src).toContain("_erFenceUntrusted('PREVIOUS_JSON', first.response, 30000)");
    expect(src).toContain('if (typeof key !== \'string\' || !key || _erUnsafeKey(key)) return;');
    expect(src).toContain('var getEscapeRoomPreset = function');
  });

  it('hardens mind_map_module.js (AI gates, cycle/depth-safe _scrubPII, safe script loader, prototype & alignment import bounds)', () => {
    const src = read('mind_map_module.js');
    expect(src).toContain('function _mmUnsafeKey(');
    expect(src).toContain('function _mmSafeJsonParse(');
    expect(src).toContain('function _mmFenceUntrusted(');
    expect(src).toContain('window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true');
    expect(src).toContain('if (!_mmAiUsable(callGemini)) return null;');
    expect(src).toContain('if (_mmAiUsable(callGemini))');
    expect(src).toContain('if (depth > 24) return undefined;');
    expect(src).toContain('typeof WeakSet !== \'undefined\' ? new WeakSet()');
    expect(src).toContain('Disallowed ConceptGraph script URL');
    expect(src).toContain("allScripts[i].getAttribute('data-cg-src') === safeUrl");
    expect(src).toContain('if (rawText.length > MAX_ALIGNMENT_IMPORT_BYTES)');
    expect(src).toContain('<UNTRUSTED_LESSON_CONTEXT>');
  });

  it('hardens generation_helpers_source.jsx & built generation_helpers_module.js (no Function() eval, memoryAidCustomInstructions bugfix, redacted logs, lock safety)', () => {
    const src = read('generation_helpers_source.jsx');
    const built = read('generation_helpers_module.js');
    expect(src).toContain('const _evalSafeArithmetic =');
    expect(src).not.toContain('Function(\'"use strict"; return (');
    expect(built).not.toContain('Function(\'"use strict"; return (');
    expect(src).toContain('anchorChartCustomInstructions, memoryAidCustomInstructions,');
    expect(src).not.toContain("'first 200 chars:'");
    expect(src).toContain('const _ghSafeJsonReviver =');
    expect(src).toContain('const _ghFencePromptData =');
    expect(src).toContain('if (!_ghAiTextUsable(options.callGemini))');
    expect(src).toContain('const redactedReason = redactFullPackDiagnosticText(');

    // Functional check of _evalSafeArithmetic extracted safely
    const start = src.indexOf('const _evalSafeArithmetic =');
    const end = src.indexOf('// Unrounded value,', start);
    const fn = new Function(src.slice(start, end) + '\nreturn _evalSafeArithmetic;')();
    expect(fn('2 + 3 * 4')).toBe(14);
    expect(fn('(2 + 3) * 4')).toBe(20);
    expect(fn('2 ** 3 ** 2')).toBe(512);
    expect(fn('2 ^ 3')).toBe(8);
    expect(fn('-(3 + 4) / 2')).toBe(-3.5);
    expect(fn('(-2) ** 2')).toBe(4);
    expect(fn('-(2 ** 2)')).toBe(-4);
    expect(fn('2 ** -3')).toBe(0.125);
    expect(fn('-2 ** 2')).toBe(null); // matches JS SyntaxError for unary before **
    expect(fn('2 ** -3 ** 2')).toBe(null);
    expect(fn('process.exit(1)')).toBe(null);
  });

  it('hardens catalog_module.js (SSRF path-prefix check, bounded fetch, safeExternalHref, CSP+SHA256 certs, calendar date & cycle guards)', () => {
    const src = read('catalog_module.js');
    expect(src).toContain('function verifiedCatalogEntryUrl(');
    expect(src).toContain("parsed.pathname.indexOf('/Apomera/AlloFlow/main/') !== 0");
    expect(src).toContain("credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error'");
    expect(src).toContain('function safeExternalHref(');
    expect(src).toContain('function _catSafeJsonParse(');
    expect(src).toContain('function isValidIsoCalendarDate(');
    expect(src).toContain("sha256-0lbaP8zStFqU+7M1nVkUkU0X0Ut7SzrQYArBPscQ0lI=");
    expect(src).not.toContain('onclick="window.print()"');
    expect(src).toContain('window.print()');
    expect(src).toContain("frame.referrerPolicy = 'no-referrer';");
    expect(src).toContain('a.download = slugify(filename) + \'.html\';');
    expect(src).toContain('if (seen.has(value)) return \'"[Circular]"\';');
  });

  it('hardens accessibility_lab_module.js (createElementNS SVG filters, safeHttpUrl, axe timeout/referrerPolicy, simulator allowlist, highlight cleanup)', () => {
    const src = read('accessibility_lab_module.js');
    expect(src).toContain('function isUnsafePropKey(');
    expect(src).toContain('function safeJsonParse(');
    expect(src).toContain('function safeHttpUrl(');
    expect(src).toContain('function formatSafeDate(');
    expect(src).toContain("overlayContainer.textContent = '';");
    expect(src).not.toContain('overlayContainer.innerHTML');
    expect(src).not.toContain('svg.innerHTML');
    expect(src).toContain("document.createElementNS(svgNS, 'feColorMatrix')");
    expect(src).toContain("script.referrerPolicy = 'no-referrer';");
    expect(src).toContain('Timed out loading axe-core from ');
    expect(src).toContain('ALLOWED_SIM_KEYS');
    expect(src).toContain("body.style.removeProperty('--alloflow-sim-blur')");
    expect(src).toContain('var highlightCleanupRef = useRef(null);');
    expect(src).toContain('var sourceName = /^[a-z0-9:_-]+$/i.test(rawSource) ? rawSource : \'other\';');
  });

  it('hardens concept_pictionary_source.jsx & built concept_pictionary_module.js (null-canvas fix, unmount ref fix, WebRTC/SDP/ICE validation, redacted warns)', () => {
    const src = read('concept_pictionary_source.jsx');
    const built = read('concept_pictionary_module.js');
    // Null canvas check precedes setAttribute
    const nullCheckIdx = src.indexOf("if (!canvas || typeof canvas.getContext !== 'function'");
    const setAttrIdx = src.indexOf("if (typeof canvas.setAttribute === 'function') canvas.setAttribute('aria-hidden', 'true');");
    expect(nullCheckIdx).toBeGreaterThan(0);
    expect(setAttrIdx).toBeGreaterThan(nullCheckIdx);
    // Unmount cleanup uses latest clearRolesRef
    expect(src).toContain('clearRolesRef.current = _clearRolesAndRound;');
    expect(src).toContain('clearRolesRef.current()');
    // WebRTC signaling hardening
    expect(src).toContain('const _isSafePathSegment =');
    expect(src).toContain('const _isValidSdpDesc =');
    expect(src).toContain('const _isValidIceCandidate =');
    expect(src).toContain('const MAX_PICTIONARY_PEERS = 250;');
    expect(src).toContain('onTouchCancel={handlePointerUp}');
    expect(src).toContain('roundEpochRef.current !== reqEpoch');
    expect(src).toContain("_cpAiUsable('vision', callGeminiVision)");
    // Built wrapper guards document.head / document.body
    expect(built).toContain("typeof document !== 'undefined' && document.head");
    expect(built).toContain("typeof document === 'undefined' || !document.body");
  });

  it('keeps all 8 modified deliverables byte-identical across 4-way mirrors and SRI/releaseId-synced across all 3 hosts', () => {
    const deliverables = [
      'voice_module.js',
      'escape_room_module.js',
      'mind_map_module.js',
      'generation_helpers_module.js',
      'catalog_module.js',
      'accessibility_lab_module.js',
      'concept_pictionary_module.js',
      'view_gemini_bridge_module.js',
    ];
    const mirrorDirs = [
      'desktop/web-app/public',
      'desktop/web-app/build',
      'desktop/app-build',
    ];
    const hosts = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ];
    const manifests = hosts.map((h) => bdm.readEmbeddedManifest(read(h)));
    expect(manifests[0].releaseId).toMatch(/^[a-f0-9]{64}$/);
    expect(manifests[1].releaseId).toBe(manifests[0].releaseId);
    expect(manifests[2].releaseId).toBe(manifests[0].releaseId);

    for (const rel of deliverables) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      const rootSha = crypto.createHash('sha256').update(rootBuf).digest('hex');
      const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
      for (const dir of mirrorDirs) {
        const mBuf = fs.readFileSync(path.join(ROOT, dir, rel));
        const mSha = crypto.createHash('sha256').update(mBuf).digest('hex');
        expect(mSha, `${dir}/${rel} sha256`).toBe(rootSha);
      }
      for (let i = 0; i < hosts.length; i++) {
        const rec = manifests[i].assets[rel];
        expect(rec, `${hosts[i]} missing ${rel}`).toBeTruthy();
        expect(rec.bytes, `${hosts[i]} bytes for ${rel}`).toBe(rootBuf.length);
        expect(rec.integrity, `${hosts[i]} SRI for ${rel}`).toBe(expectedSri);
      }
    }
  });
});
