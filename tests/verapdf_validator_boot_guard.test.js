import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve(process.cwd(), 'verapdf/verapdf_validator.html'), 'utf8');

function extractFunction(name) {
  const match = page.match(new RegExp(`  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`));
  if (!match) throw new Error(`${name} was not found in the validator page`);
  return match[0].trim();
}

const jarHeadGuard = new Function(`return (${extractFunction('_isPlausibleJarHead')});`)();

function headResponse({ ok = true, contentType, contentLength } = {}) {
  const headers = new Map([
    ['content-type', contentType],
    ['content-length', contentLength],
  ]);
  return { ok, headers: { get: (name) => headers.get(name) } };
}

describe('veraPDF validator optional-PDFBox boot guard', () => {
  it('accepts only a successful, plausibly sized jar HEAD response', () => {
    expect(jarHeadGuard(headResponse({ contentType: 'application/java-archive', contentLength: '12582912' }))).toBe(true);
    expect(jarHeadGuard(headResponse({ contentType: 'application/octet-stream; charset=binary', contentLength: '12582912' }))).toBe(true);
  });

  it('rejects a 200 HTML SPA fallback even when it has a content length', () => {
    expect(jarHeadGuard(headResponse({ contentType: 'text/html; charset=utf-8', contentLength: '4362' }))).toBe(false);
    expect(jarHeadGuard(headResponse({ contentType: 'text/html', contentLength: '12582912' }))).toBe(false);
  });

  it('fails closed when headers, size, or status do not prove the optional asset is a jar', () => {
    expect(jarHeadGuard(headResponse({ contentType: 'application/java-archive', contentLength: undefined }))).toBe(false);
    expect(jarHeadGuard(headResponse({ contentType: 'application/octet-stream', contentLength: '4362' }))).toBe(false);
    expect(jarHeadGuard(headResponse({ ok: false, contentType: 'application/java-archive', contentLength: '12582912' }))).toBe(false);
    expect(jarHeadGuard({ ok: true })).toBe(false);
  });

  it('keeps the probe lightweight and gates PDFBox on the validated HEAD response', () => {
    expect(page).toMatch(/fetch\(PDFBOX_JAR_URL\.replace\([^;]+method: 'HEAD', cache: 'no-store'/);
    expect(page).toMatch(/if \(_isPlausibleJarHead\(r\)\) \{ classpath \+= ':' \+ PDFBOX_JAR_URL; pdfboxOk = true; \}/);
    expect(page).not.toMatch(/if \(r && r\.ok\) \{ classpath \+= ':' \+ PDFBOX_JAR_URL/);
  });
});

describe('veraPDF page identity and fatal boot reporting', () => {
  it('announces page identity before either external runtime loader', () => {
    const signalAt = page.search(/type:\s*['"]verapdf-loading['"]/);
    const firstExternalScriptAt = page.search(/<script\s+src=/i);
    expect(signalAt).toBeGreaterThan(0);
    expect(signalAt).toBeLessThan(firstExternalScriptAt);
  });

  it('notifies both popup and iframe hosts with a structured boot error', () => {
    const opener = { postMessage: vi.fn() };
    const parent = { postMessage: vi.fn() };
    const validatorWindow = { opener, parent, __alloflowVeraPdfBootPulse: null };
    const announce = new Function('window', `${extractFunction('announceBootError')}; return announceBootError;`)(validatorWindow);

    expect(announce(new Error('CheerpJ failed'))).toBe('CheerpJ failed');
    const expected = { type: 'verapdf-error', phase: 'boot', code: 'VERAPDF_BOOT_FAILED', error: 'CheerpJ failed' };
    expect(opener.postMessage).toHaveBeenCalledWith(expected, '*');
    expect(parent.postMessage).toHaveBeenCalledWith(expected, '*');
  });

  it('reports the error from the fatal boot catch before leaving the page failed', () => {
    expect(page).toMatch(/catch \(e\) \{\s*const message = announceBootError\(e\);\s*setStatus\('❌ Boot failed: ' \+ message\);/);
  });
});
