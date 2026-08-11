// The header was taking roughly a third of the viewport at 100% zoom on a
// laptop, on a surface whose entire job is reading adapted text.
//
// Two changes, and one deliberate non-change:
//   A. Trim the permanent cost. It was p-6 md:py-8 md:px-10 with a text-4xl
//      title: 64px of vertical padding before a single control.
//   B. A collapse toggle, remembered per device, defaulting to collapsed on
//      short viewports where the squeeze actually bites.
//   -  NO scroll-driven shrinking. Moving hit targets while someone scrolls is
//      hostile to motor and vestibular needs, which is the opposite of what
//      this app is for.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('view_header_source.jsx', 'utf8');
const MODULE = readFileSync('view_header_module.js', 'utf8');

describe('the header costs less space by default', () => {
  it('no longer carries 64px of padding before any content', () => {
    expect(SRC, 'the old padding is gone').not.toContain('p-6 md:py-8 md:px-10');
    expect(SRC).toContain("headerCollapsed ? 'p-3 md:py-2 md:px-8' : 'p-4 md:py-4 md:px-8'");
  });

  it('drops a step of type scale on the title', () => {
    expect(SRC).not.toContain('text-3xl md:text-4xl font-black tracking-tight');
    expect(SRC).toContain("headerCollapsed ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'");
  });
});

describe('collapsing is explicit and remembered', () => {
  it('persists the choice per device', () => {
    expect(SRC).toContain("localStorage.getItem('allo_header_collapsed')");
    expect(SRC).toContain("localStorage.setItem('allo_header_collapsed', String(next))");
  });

  it('defaults to collapsed only on short viewports', () => {
    // Where the header's height is the difference between seeing two paragraphs
    // and seeing five. Tall displays keep the roomy header.
    expect(SRC).toContain('window.innerHeight < 900');
  });

  it('lets an explicit choice beat the viewport default', () => {
    // Saved value is read first; the height check is only the fallback.
    const at = SRC.indexOf("const saved = localStorage.getItem('allo_header_collapsed')");
    const body = SRC.slice(at, at + 400);
    expect(body.indexOf("saved === 'true'")).toBeLessThan(body.indexOf('window.innerHeight'));
    expect(body).toContain("saved === 'false'");
  });

  it('exposes state to assistive tech', () => {
    expect(SRC).toContain('aria-expanded={!headerCollapsed}');
    expect(SRC).toMatch(/aria-label=\{headerCollapsed \?/);
  });
});

describe('what collapsing may and may not hide', () => {
  it('hides the tagline and the licence chip, which are read once', () => {
    expect(SRC).toMatch(/\{!headerCollapsed && \([\s\S]{0,600}header\.tagline/);
    expect(SRC).toMatch(/\{!headerCollapsed && \([\s\S]{0,600}header\.rights/);
  });

  it('NEVER hides the privacy notice', () => {
    // A privacy notice that disappears when the header is tidied is worse than
    // one that takes up room. It stays visible in both states.
    const at = SRC.indexOf("t('header.pii_warning')");
    expect(at).toBeGreaterThan(0);
    const before = SRC.slice(Math.max(0, at - 500), at);
    expect(before, 'privacy notice must not sit inside a collapse guard').not.toMatch(/\{!headerCollapsed && \($/);
  });
});

describe('no scroll-driven motion was introduced', () => {
  it('does not shrink on scroll', () => {
    for (const smell of ['onScroll', 'scrollY', 'IntersectionObserver']) {
      expect(SRC, `header must not react to scrolling: ${smell}`).not.toContain(smell);
    }
  });
});

describe('it reached the built module', () => {
  it('is present in the module the app actually loads', () => {
    expect(MODULE).toContain('allo_header_collapsed');
    expect(MODULE).toContain('headerCollapsed');
  });
});
