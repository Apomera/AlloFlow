import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'verapdf/verapdf_validator.html'), 'utf8');
const section = (start, end) => {
  const from = view.indexOf(start);
  const to = view.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`Missing source section: ${start}`);
  return view.slice(from, to);
};
const helperMatch = view.match(/const _veraPdfReportedError = \(d\) => \{([\s\S]*?)\n  \};/);
if (!helperMatch) throw new Error('Missing _veraPdfReportedError helper');
const reportedError = new Function('d', helperMatch[1]);

const manualValidate = section('const runVeraPdfValidation', 'const runVeraPdfRemediate');
const manualRemediate = section('const runVeraPdfRemediate', 'const warmVeraPdfWindow');
const warmPopup = section('const warmVeraPdfWindow', 'const validateOnWarmWindow');
const validateWarmPopup = section('const validateOnWarmWindow', 'const _veraIframeRef');
const warmIframe = section('const warmVeraPdfIframe', 'const validateOnIframe');
const validateIframe = section('const validateOnIframe', '// Pre-boot the embedded validator');

describe('veraPDF structured host errors', () => {
  it('turns a fatal boot payload into a useful deployment/runtime Error', () => {
    const error = reportedError({
      type: 'verapdf-error',
      phase: 'boot',
      code: 'VERAPDF_BOOT_FAILED',
      error: '  veraPDF JAR\nreturned HTML  ',
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('veraPDF startup failed [VERAPDF_BOOT_FAILED]');
    expect(error.message).toContain('veraPDF JAR returned HTML');
    expect(error.message).toContain('validator deployment/runtime');
  });

  it('supports validation-stage aliases and ignores non-error protocol messages', () => {
    expect(reportedError({ type: 'verapdf-ready' })).toBeNull();
    expect(reportedError({ type: 'verapdf-error', stage: 'validate', message: 'JVM stopped' }).message)
      .toBe('veraPDF validation failed: JVM stopped');
  });
});

describe('veraPDF page-identity handshake', () => {
  it('is emitted before either external runtime loader can fail or hang', () => {
    const signalAt = page.search(/type:\s*['"]verapdf-loading['"]/);
    const firstExternalScriptAt = page.search(/<script\s+src=/i);
    expect(signalAt).toBeGreaterThan(0);
    expect(firstExternalScriptAt).toBeGreaterThan(0);
    expect(signalAt).toBeLessThan(firstExternalScriptAt);
  });

  it('uses a separate 20s identity deadline without shortening JVM boot deadlines', () => {
    expect(view).toContain('const _VERAPDF_IDENTITY_TIMEOUT_MS = 20000');
    expect(view).toContain("code: 'VERAPDF_PAGE_MISMATCH'");
    for (const block of [manualValidate, manualRemediate, warmPopup, warmIframe]) {
      expect(block).toContain("d.type === 'verapdf-loading'");
      expect(block).toContain('identityTimer');
      expect(block).toContain('clearTimeout(identityTimer)');
      expect(block).toContain('_VERAPDF_IDENTITY_TIMEOUT_MS');
    }
  });

  it('also treats ready as page identity for backward compatibility', () => {
    for (const block of [manualValidate, manualRemediate]) {
      expect(block).toMatch(/d\.type === 'verapdf-ready'[\s\S]{0,160}gotIdentity = true/);
    }
    for (const block of [warmPopup, warmIframe]) {
      expect(block).toMatch(/d\.type === 'verapdf-ready'[\s\S]{0,160}handle\.identified = true/);
    }
  });
});

describe('all veraPDF transports fail fast without weakening message identity checks', () => {
  it('consumes the structured error in all six popup/iframe readiness and operation flows', () => {
    for (const block of [manualValidate, manualRemediate, warmPopup, validateWarmPopup, warmIframe, validateIframe]) {
      expect(block).toContain('const reportedError = _veraPdfReportedError(d);');
    }
  });

  it('keeps strict expected-window source checks and pinned byte target origins', () => {
    for (const block of [manualValidate, manualRemediate, warmPopup, validateWarmPopup]) {
      expect(block).toMatch(/ev\.source !== win/);
    }
    expect(warmIframe).toContain('ev.source !== frame.contentWindow');
    expect(validateIframe).toContain('ev.source !== cw');
    for (const block of [manualValidate, manualRemediate, validateWarmPopup, validateIframe]) {
      expect(block).toContain('VERAPDF_ORIGIN');
    }
  });

  it('cleans up and closes popup operations when the validator reports failure', () => {
    for (const block of [manualValidate, manualRemediate, validateWarmPopup]) {
      expect(block).toMatch(/if \(reportedError\) \{ done = true; cleanup\(\); try \{ win\.close\(\); \} catch \(e\) \{\} reject\(reportedError\); \}/);
      expect(block).toContain("window.removeEventListener('message', onMsg)");
    }
    expect(validateIframe).toMatch(/if \(reportedError\) \{ done = true; cleanup\(\); reject\(reportedError\); \}/);
    expect(validateIframe).toContain("window.removeEventListener('message', onMsg)");
  });

  it('settles readiness immediately, retains the reported Error, and clears readiness listeners/timers', () => {
    expect(warmPopup).toContain('handle.error = error || null');
    expect(warmPopup).toContain('if (reportedError) finish(false, reportedError)');
    expect(warmPopup).toContain('clearTimeout(readyTimer)');
    expect(warmPopup).toContain("window.removeEventListener('message', onReady)");
    expect(warmIframe).toContain('handle.error = error || null');
    expect(warmIframe).toContain('if (reportedError) finish(false, reportedError, true)');
    expect(warmIframe).toContain('clearTimeout(readyTimer)');
    expect(warmIframe).toContain("window.removeEventListener('message', onReady)");
    expect(validateWarmPopup).toContain("reject(handle.error || new Error('veraPDF validator did not start (boot/CDN failure)'))");
    expect(validateIframe).toContain("reject(handle.error || new Error('validator iframe not ready'))");
  });

  it('retains the existing reasonable boot and operation timeouts as fallbacks', () => {
    expect(view).toContain('const _VERAPDF_IDENTITY_TIMEOUT_MS = 20000');
    expect(manualValidate).toContain('90000');
    expect(manualValidate).toContain('600000');
    expect(manualRemediate).toContain('90000');
    expect(manualRemediate).toContain('600000');
    expect(warmPopup).toContain('90000');
    expect(validateWarmPopup).toContain('600000');
    expect(warmIframe).toContain('35000');
    expect(validateIframe).toContain('600000');
  });
});
