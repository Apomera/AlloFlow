// Opening-audit routing for image-heavy documents (Canvas 401 storm, 2026-09-13). A scanned
// 8-page, 5.4 MB PDF sat under both older slicing limits (9 MB, 20 pages), so the whole file went
// to three auditors and then two adaptive ones: 35 MB inside a minute, and Canvas throttled the
// account for 25 minutes. Two pure decisions now govern this: _alloAuditRoute (slice from the
// start when the document is big, long, or image-heavy) and _alloAdaptiveAuditAllowed (no extra
// auditors on a heavy document or into an active throttle).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'doc_pipeline_source.jsx'), 'utf8');
function topLevelFunction(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) throw new Error('missing ' + name);
  let depth = 0, open = SRC.indexOf('{', at);
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(at, i + 1);
  }
  throw new Error('unbalanced ' + name);
}
const route = new Function(topLevelFunction('_alloAuditRoute') + '; return _alloAuditRoute;')();
const adaptive = new Function(topLevelFunction('_alloAdaptiveAuditAllowed') + '; return _alloAdaptiveAuditAllowed;')();
const LIMITS = { bytesKb: 9000, pages: 20, probeKb: 1500, kbPerPage: 300 };

describe('_alloAuditRoute', () => {
  it('slices the field case: 8 pages, 5.4 MB scan', () => {
    expect(route(5412, 8, LIMITS)).toEqual({ chunkFirst: true, reason: 'image-heavy' });
  });
  it('keeps the older rules: bytes and page count', () => {
    expect(route(9500, 3, LIMITS)).toEqual({ chunkFirst: true, reason: 'bytes' });
    expect(route(2077, 54, LIMITS)).toEqual({ chunkFirst: true, reason: 'pages' });
  });
  it('leaves born-digital documents whole', () => {
    expect(route(215, 2, LIMITS)).toEqual({ chunkFirst: false, reason: null });
    expect(route(1600, 12, LIMITS)).toEqual({ chunkFirst: false, reason: null }); // 133 KB/page
    expect(route(4331, 126, LIMITS).reason).toBe('pages');
  });
  it('never calls a small file image-heavy, even with one page', () => {
    expect(route(1200, 1, LIMITS)).toEqual({ chunkFirst: false, reason: null });
  });
  it('tolerates an unknown page count', () => {
    expect(route(5412, null, LIMITS)).toEqual({ chunkFirst: false, reason: null });
    expect(route(9500, null, LIMITS).reason).toBe('bytes');
  });
});

describe('_alloAdaptiveAuditAllowed', () => {
  it('allows extra auditors on a light document with no throttle', () => {
    expect(adaptive(215, false, LIMITS)).toEqual({ allowed: true, reason: null });
  });
  it('refuses them on a heavy document', () => {
    expect(adaptive(5412, false, LIMITS)).toEqual({ allowed: false, reason: 'heavy document' });
  });
  it('refuses them while a throttle is active, whatever the size', () => {
    expect(adaptive(215, true, LIMITS)).toEqual({ allowed: false, reason: 'active throttle' });
  });
});

describe('the audit uses both decisions', () => {
  it('routes through _alloAuditRoute with the four limits and logs the reason', () => {
    expect(SRC).toContain("const _route = _alloAuditRoute(dataSizeKB, _pc, { bytesKb: _AUDIT_SLICE_BYTES_KB, pages: _AUDIT_SLICE_PAGES, probeKb: _AUDIT_SLICE_PROBE_KB, kbPerPage: _AUDIT_SLICE_KB_PER_PAGE });");
    expect(SRC).toContain('const _AUDIT_SLICE_KB_PER_PAGE = 300;');
    expect(SRC).toContain("_chunkFirstReason === 'image-heavy' ? 'Image-heavy document' : 'Large document'");
  });
  it('gates the adaptive escalation and says why when it is skipped', () => {
    expect(SRC).toContain('const _adaptiveGate = _alloAdaptiveAuditAllowed(dataSizeKB, !!(_geminiThrottleInfo && _geminiThrottleInfo().storming), { probeKb: _AUDIT_SLICE_PROBE_KB });');
    expect(SRC).toContain('[PDF Audit] Adaptive auditors skipped (${_adaptiveGate.reason})');
    expect(SRC).toContain('if (_adaptiveGate.allowed && !_auditCancelled() && parsedAudits.length >= 2');
  });
});
