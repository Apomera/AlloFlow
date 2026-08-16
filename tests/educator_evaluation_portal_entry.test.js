// Educator Growth & Evaluation: the app-side entry point (fleet 2026-08-16, C3).
//
// The Principal Evaluation card in Project Settings renders only when the host
// passes onOpenPrincipalEvaluation, and the connect field only when it passes
// onSaveEvaluationPortalUrl. Both are plain props with no fallback, so if a
// future refactor drops one the whole feature disappears from the app with no
// error and no visible trace. The QR block additionally depends on a global,
// window.__alloMakeQrSvg, which is resolved by polling and degrades to
// "QR unavailable" rather than throwing.
//
// This file pins that wiring and checks the QR generator against a real
// Apps Script /exec URL, which is long enough that a fixed QR version would
// have overflowed.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let anti;
let qrcode;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');

  const sandbox = { window: {}, document: {}, console };
  sandbox.self = sandbox.window;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('qrcode.js', 'utf8'), sandbox);
  qrcode = sandbox.qrcode || sandbox.window.qrcode;
});

// A real deployment URL. Apps Script /exec URLs run past 100 characters.
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbwEXAMPLEdeploymentIDthatIsQuiteLongIndeed1234567890abcdefgh/exec';

describe('the host wires the Principal Evaluation card', () => {
  it('passes every prop the card and the connect form need', () => {
    for (const prop of [
      'onOpenPrincipalEvaluation: handleOpenPrincipalEvaluationFromSettings',
      'evaluationPortalUrl,',
      'isEvaluationPortalConnected: !!evaluationPortalUrl',
      'onSaveEvaluationPortalUrl: handleSaveEvaluationPortalUrl',
    ]) {
      expect(anti).toContain(prop);
    }
  });

  it('persists the portal URL through a normalizer rather than raw', () => {
    expect(anti).toContain('normalizeAlloEvaluationPortalUrl(safeGetItem(ALLO_EVALUATION_PORTAL_URL_KEY');
    expect(anti).toContain('const portalUrl = normalizeAlloEvaluationPortalUrl(evaluationPortalUrl);');
  });

  it('publishes the QR generator the card polls for', () => {
    expect(anti).toContain('window.__alloMakeQrSvg = _makeAlloQrSvg;');
  });

  it('auto-sizes the QR rather than pinning a version that a long URL overflows', () => {
    expect(anti).toContain("const qr = window.qrcode(0, 'M');");
  });
});

describe('the QR generator handles a real deployment URL', () => {
  it('encodes a 105-character /exec URL into a titled SVG', () => {
    expect(EXEC_URL.length).toBeGreaterThan(100);
    const qr = qrcode(0, 'M');
    qr.addData(EXEC_URL);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, title: 'Educator Evaluation district portal' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Educator Evaluation district portal');
    expect(svg.length).toBeGreaterThan(1000);
  });

  it('refuses an empty payload instead of emitting a blank code', () => {
    // Mirrors the guard in _makeAlloQrSvg: an empty payload throws before the
    // library is even loaded, so a disconnected portal cannot render a QR that
    // scans to nothing.
    expect(anti).toContain("if (!payload) throw new Error('QR payload is empty');");
  });

  it('only renders the QR when a portal is actually connected', () => {
    const settings = readFileSync('view_project_settings_source.jsx', 'utf8');
    expect(settings).toContain("<EvaluationPortalQr url={isEvaluationPortalConnected ? evaluationPortalUrl : ''} />");
  });
});
