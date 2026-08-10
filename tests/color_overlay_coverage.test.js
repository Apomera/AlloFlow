/**
 * Colour-overlay (Irlen-style reading tint) coverage, asserted at the source.
 *
 * The e2e spec (tests/e2e/40-color-overlay-coverage.spec.ts) measures the tint
 * in a real browser, but it runs against the DEPLOYED app — so it cannot verify
 * a fix until it ships. This file asserts the same invariants in the source,
 * which is verifiable right now.
 *
 * Why these invariants: measured live at 1280x720, the previous inline version
 * rendered `absolute inset-0 z-[60]` inside `.allo-docsuite` and produced a
 * 1280x480 box — 67% of the viewport, with the header strip untinted, sitting
 * below every modal, toast (z-400), FAB stack (z-180) and the Launch Pad
 * (z-2147483000), and unable to cover anything portalled to <body>.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

let anti;
let block;

beforeAll(() => {
  anti = fs.readFileSync(path.join(process.cwd(), COPIES[0]), 'utf8');
  const start = anti.indexOf("{colorOverlay !== 'none'");
  expect(start, 'the colour-overlay block should exist').toBeGreaterThan(-1);
  block = anti.slice(start, start + 1800);
});

describe('colour overlay', () => {
  it('is portalled to <body> so portalled modals cannot escape it', () => {
    expect(block).toContain('ReactDOM.createPortal');
    expect(block).toContain('document.body');
    // Guarded so a non-browser render cannot throw on a missing document.
    expect(block).toContain("typeof document !== 'undefined' && document.body");
  });

  it('is fixed to the viewport rather than clipped to a container', () => {
    expect(block).toContain('fixed inset-0');
    // `absolute` resolved against .allo-docsuite and lost the header strip.
    expect(block).not.toContain('absolute inset-0 pointer-events-none');
  });

  it('stacks above every app layer including the Launch Pad', () => {
    const m = block.match(/zIndex:\s*(\d+)/);
    expect(m, 'an explicit zIndex should be set').toBeTruthy();
    const z = parseInt(m[1], 10);
    // Launch Pad root is 2147483000 and its language switcher 2147483001.
    expect(z).toBeGreaterThan(2147483001);
    // …with headroom below the 32-bit signed maximum.
    expect(z).toBeLessThan(2147483647);
    // The old low layer must be gone.
    expect(block).not.toContain('z-[60]');
  });

  it('never intercepts interaction and stays out of the a11y tree', () => {
    expect(block).toContain('pointer-events-none');
    expect(block).toContain('aria-hidden="true"');
  });

  it('keeps the per-theme treatment it already had', () => {
    // Contrast gets explicit rgba values; light multiplies; dark stays normal.
    expect(block).toContain("theme === 'contrast'");
    expect(block).toContain("mixBlendMode: theme === 'light' ? 'multiply' : 'normal'");
    for (const tint of ['bg-blue-200/30', 'bg-orange-200/30', 'bg-yellow-200/30']) {
      expect(block).toContain(tint);
    }
  });

  it('exposes a stable hook for the e2e measurement', () => {
    expect(block).toContain('data-allo-color-overlay');
  });

  it('is identical across all three checked-in copies', () => {
    const first = fs.readFileSync(path.join(process.cwd(), COPIES[0]), 'utf8');
    for (const rel of COPIES.slice(1)) {
      const p = path.join(process.cwd(), rel);
      if (!fs.existsSync(p)) continue;
      expect(fs.readFileSync(p, 'utf8'), rel + ' drifted from AlloFlowANTI.txt').toBe(first);
    }
  });
});
