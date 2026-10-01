// Page images are photographs of a page, not line art, so the codec is a real
// decision — and in the agent-bridge lane it is a CORRECTNESS decision, not just
// a size one: a single inline part over AGENT_IMAGE_BYTES_CAP is dropped with no
// chunked-fetch path, so the encoder decides whether a page reaches the
// answering model at all.
//
// Measured on an 8-page scan at 1600px: PNG 2.99MB/page vs JPEG q0.82 0.42MB —
// 86% smaller with body text, footnotes and even reverse-side bleed-through
// still legible. 0.82 is not a fresh guess; it is what the app's own page
// canvases already use, so both lanes show the model the same fidelity.
//
// Two constants describe that choice from different scopes: the renderer encodes
// with one, the vision bridge declares the MIME type with the other. A JPEG
// announced as image/png is the kind of mismatch a provider accepts silently
// until it doesn't — so this pins them equal.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');

function constant(name) {
  const m = new RegExp('const ' + name + " = '([^']+)'").exec(SRC);
  return m ? m[1] : null;
}

describe('page-image codec', () => {
  it('encodes pages as JPEG rather than PNG', () => {
    expect(constant('RENDER_IMAGE_MIME')).toBe('image/jpeg');
    const q = /const RENDER_IMAGE_QUALITY = ([0-9.]+);/.exec(SRC);
    expect(q, 'RENDER_IMAGE_QUALITY not found').toBeTruthy();
    const quality = Number(q[1]);
    // Below ~0.7 scanned body text starts to smear; above ~0.9 the size win
    // largely evaporates and oversized pages get dropped again.
    expect(quality).toBeGreaterThanOrEqual(0.75);
    expect(quality).toBeLessThanOrEqual(0.9);
  });

  it('declares the same MIME type it encodes with', () => {
    expect(constant('PAGE_IMAGE_MIME')).toBe(constant('RENDER_IMAGE_MIME'));
  });

  it('no longer hardcodes image/png anywhere in the page-image path', () => {
    expect(SRC).not.toContain("toDataURL('image/png')");
    expect(SRC).not.toContain("mime_type: 'image/png'");
  });

  it('passes the codec into the browser context rather than assuming it there', () => {
    // page.evaluate runs in Chromium; a constant declared in Node is not in scope
    // there, so it has to travel as an argument or the encode silently falls back
    // to the canvas default (PNG) with no error.
    expect(SRC).toContain('mimeType: RENDER_IMAGE_MIME');
    expect(SRC).toContain('quality: RENDER_IMAGE_QUALITY');
    expect(SRC).toContain('canvas.toDataURL(mimeType, quality)');
  });
});
