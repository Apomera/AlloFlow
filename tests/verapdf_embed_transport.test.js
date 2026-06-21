// veraPDF embedded-first transport (2026-06-21, Aaron's progressive-enhancement idea): prefer a hidden
// INLINE iframe (popup-free, in-app validation surfaced via the PDF/UA badge); if the embed is blocked
// (e.g. a Canvas CSP frame-src restriction) it never readies → automatically fall back to the popup
// (today's behavior). The verdict is cached so we don't re-probe every run. The validator page becomes
// mode-aware so the VISIBLE popup fallback hides the irrelevant file picker and explains it's part of
// the pipeline.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'verapdf/verapdf_validator.html'), 'utf8');

// ── Mirror of the gesture transport decision ──
// Open the popup ONLY when the embed is not a viable transport for this run.
const decide = ({ iframeExists, embedPref, iframeReady }) => {
  const embedViable = !!(iframeExists && (embedPref === 'ok' || iframeReady));
  return { openPopup: !embedViable, useIframe: embedViable };
};

describe('transport decision: iframe when viable, popup otherwise', () => {
  it('cached "ok" → no popup, use the iframe (steady state, popup-free)', () => {
    expect(decide({ iframeExists: true, embedPref: 'ok', iframeReady: false })).toEqual({ openPopup: false, useIframe: true });
  });
  it('iframe already booted this run → no popup, use the iframe', () => {
    expect(decide({ iframeExists: true, embedPref: null, iframeReady: true })).toEqual({ openPopup: false, useIframe: true });
  });
  it('first run, iframe not ready yet → open the popup (so THIS run still validates)', () => {
    expect(decide({ iframeExists: true, embedPref: null, iframeReady: false })).toEqual({ openPopup: true, useIframe: false });
  });
  it('embed known-blocked → open the popup (the automatic fallback)', () => {
    expect(decide({ iframeExists: true, embedPref: 'blocked', iframeReady: false })).toEqual({ openPopup: true, useIframe: false });
  });
  it('no iframe could be created → popup', () => {
    expect(decide({ iframeExists: false, embedPref: 'ok', iframeReady: true })).toEqual({ openPopup: true, useIframe: false });
  });
});

describe('anti-drift: the view wires iframe-first with popup fallback', () => {
  it('defines the iframe transport helpers + the localStorage verdict cache', () => {
    expect(view).toMatch(/const warmVeraPdfIframe = \(\) =>/);
    expect(view).toMatch(/const validateOnIframe = \(handle, bytes\) =>/);
    expect(view).toMatch(/localStorage\.getItem\('alloflow_verapdf_embed'\)/);
    expect(view).toMatch(/_setVeraEmbedPref\('ok'\)/);
    expect(view).toMatch(/_setVeraEmbedPref\('blocked'\)/);
  });
  it('pre-boots the embedded validator when a PDF is present (so it is ready by click time)', () => {
    expect(view).toMatch(/_veraEmbedPref\(\) !== 'blocked' && !_veraIframeRef\.current\) warmVeraPdfIframe\(\)/);
  });
  it('the gesture opens the popup ONLY when the embed is not viable', () => {
    expect(view).toMatch(/const _embedViable = !!\(_veraIframe && \(_veraEmbedPref\(\) === 'ok' \|\| _veraIframe\.isReady\(\)\)\)/);
    expect(view).toMatch(/if \(!_embedViable\) _veraWarm = warmVeraPdfWindow\(\)/);
  });
  it('end-of-remediation validates via the popup if opened, else the warm iframe', () => {
    expect(view).toMatch(/const _viaIframe = !_viaPopup && !!\(_veraIframe && _veraIframe\.isReady\(\)\)/);
    expect(view).toMatch(/_viaIframe \? await validateOnIframe\(_veraIframe, _tbV\) : await validateOnWarmWindow\(_veraWarm, _tbV\)/);
  });
  it('the iframe is hidden + aria-hidden (it must not be a focusable/visible artifact)', () => {
    expect(view).toMatch(/setAttribute\('aria-hidden', 'true'\)/);
    expect(view).toMatch(/visibility:hidden/);
  });
});

describe('anti-drift: the validator page is mode-aware for the visible popup fallback', () => {
  it('detects pipeline-driven (opener/parent) vs standalone', () => {
    expect(page).toMatch(/const _driven = !!window\.opener \|\| \(window\.parent && window\.parent !== window\)/);
  });
  it('hides the file picker + explains it is part of AlloFlow when driven', () => {
    expect(page).toMatch(/if \(_driven\) \{[\s\S]{0,400}\$\('pick'\)\.style\.display = 'none'/);
    expect(page).toMatch(/part of the automatic accessibility check/);
  });
  it('shows progress + the verdict in-window when AlloFlow sends bytes', () => {
    expect(page).toMatch(/setStatus\('⏳ Validating the PDF AlloFlow sent…'\)/);
    expect(page).toMatch(/render\(r\);[\s\S]{0,200}result sent back to AlloFlow/);
  });
  it('still supports standalone use (the file picker path is intact)', () => {
    expect(page).toMatch(/\$\('pick'\)\.disabled = false;/);
    expect(page).toMatch(/Pick a PDF \(or it accepts bytes via postMessage\)/);
  });
});
