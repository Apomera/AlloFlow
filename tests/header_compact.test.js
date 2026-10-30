// The header was taking roughly a third of the viewport at 100% zoom on a
// laptop, on a surface whose entire job is reading adapted text.
//
// Two changes, and one deliberate non-change:
//   A. Trim the permanent cost. It was p-6 md:py-8 md:px-10 with a text-4xl
//      title: 64px of vertical padding before a single control.
//   B. A compact app-bar default with context and primary actions. The complete
//      command surface remains available through a remembered More/Less toggle.
//   -  NO scroll-driven shrinking. Moving hit targets while someone scrolls is
//      hostile to motor and vestibular needs, which is the opposite of what
//      this app is for.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { indexOfOrThrow } from './helpers/anchored_slice.js';

const SRC =readFileSync('view_header_source.jsx', 'utf8');
const MODULE = readFileSync('view_header_module.js', 'utf8');

describe('the header costs less space by default', () => {
  it('no longer carries 64px of padding before any content', () => {
    expect(SRC, 'the old padding is gone').not.toContain('p-6 md:py-8 md:px-10');
    expect(SRC).toContain("headerCollapsed ? 'px-3 sm:px-5 md:px-6 py-px' : 'p-4 md:py-4 md:px-8'");
  });

  it('drops a step of type scale on the title', () => {
    expect(SRC).not.toContain('text-3xl md:text-4xl font-black tracking-tight');
    expect(SRC).toContain("headerCollapsed ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'");
  });

  it('keeps context, destinations, session, Setup, and More in the 56px app bar', () => {
    // 2026-10-29: 68px left 24px of empty bar around the 44px targets; 56px keeps the targets and the context lines.
    expect(SRC).toContain('.allo-premium-appbar { min-height: 56px; }');
    expect(SRC).toContain('.allo-premium-header button { min-height: 44px; }');
    const compact = SRC.slice(SRC.indexOf('{headerCollapsed && ('), SRC.indexOf('{/* Compact keeps context'));
    for (const key of ['header_dashboard', 'header_learning_hub', 'header_educator_hub']) {
      expect(compact).toContain(`data-help-key="${key}"`);
    }
    expect(compact).toContain('data-help-key="header_session_start"');
    expect(compact).toContain('data-help-key="header_rerun_wizard"');
    expect(compact).toContain("t('common.more_information') || 'More'");
  });

  it('on phones keeps the privacy reminder visible and the role/view line for screen readers only', () => {
    const phone = SRC.split('@media (max-width: 639px) {')[1] || '';
    const phoneRules = phone.split('@media')[0];
    expect(phoneRules).toContain('.allo-premium-context-line { position: absolute; width: 1px; height: 1px;');
    expect(phoneRules.includes('.allo-premium-pii-row { position: absolute'), 'privacy reminder stays visible').toBe(false);
    expect(SRC).toContain('allo-premium-context-line text-[11px]');
    expect(SRC).toContain('allo-premium-pii-row mt-1');
    expect(MODULE.includes('.allo-premium-appbar { min-height: 56px; }'), 'module rebuilt from source').toBe(true);
  });
});

describe('collapsing is explicit and remembered', () => {
  it('persists the choice per device', () => {
    expect(SRC).toContain("localStorage.getItem('allo_header_collapsed')");
    expect(SRC).toContain("localStorage.setItem('allo_header_collapsed', String(next))");
  });

  it('defaults to the compact app bar on a first visit', () => {
    const at = SRC.indexOf("const saved = localStorage.getItem('allo_header_collapsed')");
    const body = SRC.slice(at, at + 350);
    expect(body).toContain('return true;');
    expect(body).not.toContain('window.innerHeight');
    expect(body).not.toContain('window.innerWidth');
  });

  it('lets an explicit choice beat the compact default', () => {
    const at = SRC.indexOf("const saved = localStorage.getItem('allo_header_collapsed')");
    const body = SRC.slice(at, at + 400);
    expect(body.indexOf("saved === 'true'")).toBeLessThan(body.indexOf('return true;'));
    expect(body).toContain("saved === 'false'");
  });

  it('exposes state to assistive tech', () => {
    expect(SRC).toContain('aria-expanded={!headerCollapsed}');
    // b4d7ed714 (2026-09-13): the toggles are named by their visible More/Less text (label in
    // name), so no aria-label override; every toggle still reports its expanded state.
    const toggles = SRC.split('onClick={toggleHeaderCollapsed}').slice(1).map((rest) => rest.slice(0, indexOfOrThrow(rest, '>', { file: 'view_header_source.jsx', label: 'end of a toggle tag' })));
    expect(toggles.length).toBeGreaterThanOrEqual(2);
    for (const attrs of toggles) {
      expect(attrs).toContain('aria-expanded={!headerCollapsed}');
      expect(attrs).not.toContain('aria-label=');
    }
    expect(SRC).toContain("{headerCollapsed ? (t('common.more_information') || 'More') : (t('common.collapse') || 'Less')}");
  });
});

describe('what collapsing may and may not hide', () => {
  it('keeps the one-time brand copy in the expanded surface', () => {
    expect(SRC).toMatch(/\{!headerCollapsed && \([\s\S]{0,600}header\.tagline/);
    const expandedMetadata = SRC.slice(SRC.indexOf(") : <div className=\"flex flex-wrap items-center gap-2 mt-2\">"));
    expect(expandedMetadata).toContain("t('header.rights')");
    expect(SRC).toContain('{compactRoleLabel}');
    expect(SRC).toContain('{compactContextLabel}');
  });

  it('NEVER hides the privacy notice', () => {
    // A privacy notice that disappears when the header is tidied is worse than
    // one that takes up room. It stays visible in both states.
    const at = SRC.indexOf("t('header.pii_warning')");
    expect(at).toBeGreaterThan(0);
    const before = SRC.slice(Math.max(0, at - 500), at);
    expect(before, 'privacy notice must not sit inside a collapse guard').not.toMatch(/\{!headerCollapsed && \($/);
    expect(SRC.match(/\{piiWarningText\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('wraps compact context and privacy copy instead of clipping it at narrow reflow widths', () => {
    expect(SRC).toContain('.allo-premium-context-block { min-width: 0; max-width: 21rem; flex: 1 1 auto; }');
    expect(SRC).toContain('.allo-premium-context-line, .allo-premium-pii-text { overflow-wrap: anywhere; }');
    expect(SRC).toContain('.allo-premium-appbar-brand { display: contents; }');
    expect(SRC).toContain('.allo-premium-context-block { order: 99; flex: 0 0 100%; width: 100%; max-width: none; }');
    expect(SRC).toContain('className="allo-premium-pii-text">{piiWarningText}</span>');
    expect(SRC).not.toContain('<span className="truncate">{piiWarningText}</span>');
    expect(SRC).toContain('.allo-premium-brand-name { position: absolute; width: 1px; height: 1px;');
    expect(SRC).toContain('white-space: nowrap; border: 0; }');
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
