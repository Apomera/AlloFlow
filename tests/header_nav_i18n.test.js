// The header's nav buttons must be translatable.
//
// AI / Tools / Learn / Bridge / Documents rendered their visible text as bare
// string literals, so they stayed English in all 63 languages while the icons
// and surrounding chrome localized around them.
//
// Separately — and worse, because it is invisible — three keys the header
// already CALLED were never registered in ui_strings:
//   header.bridge_aria, header.bridge_tooltip, header.ai_diagnostics_canvas
// A called-but-unregistered key silently resolves to its English fallback in
// every language. ai_diagnostics_canvas is the Gemini Canvas variant, and Canvas
// is the product's primary surface, so that was the AI button's accessible name
// being English for every non-English screen-reader user on the main surface.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let source, module_, ui;

const NAV_KEYS = ['nav_ai', 'nav_tools', 'nav_learn', 'nav_bridge', 'nav_documents'];

beforeAll(() => {
  source = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
  module_ = readFileSync(resolve(process.cwd(), 'view_header_module.js'), 'utf8');
  ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
});

describe('header nav labels are localized', () => {
  it('no header label renders bare text in a hidden lg:inline span', () => {
    const bare = [...source.matchAll(/hidden lg:inline">([A-Za-z][^<{]*)<\/span>/g)].map((m) => m[1]);
    expect(bare, `bare header labels found: ${bare.join(', ')}`).toEqual([]);
  });

  for (const key of NAV_KEYS) {
    it(`${key} is called by the source and registered in ui_strings`, () => {
      expect(source, `source does not call header.${key}`).toContain(`t('header.${key}')`);
      expect(typeof ui.header?.[key], `header.${key} missing from ui_strings — untranslatable`).toBe('string');
    });
  }

  it('the built module carries the same calls (source was rebuilt, not just edited)', () => {
    // A source edit that is never rebuilt DOES NOT SHIP: the CDN serves the
    // module, and every test that reads the source would still pass.
    for (const key of NAV_KEYS) {
      expect(module_, `built module missing header.${key} — run node _build_view_header_module.js`)
        .toContain(`t("header.${key}")`);
    }
  });

  it('each nav label keeps an English fallback', () => {
    for (const [key, english] of [['nav_ai', 'AI'], ['nav_tools', 'Tools'], ['nav_learn', 'Learn'],
      ['nav_bridge', 'Bridge'], ['nav_documents', 'Documents']]) {
      expect(module_).toContain(`t("header.${key}") || "${english}"`);
    }
  });
});

describe('header aria/title keys are registered, not just called', () => {
  it('every header.* key the source calls exists in ui_strings', () => {
    const called = [...new Set([...source.matchAll(/t\('(header\.[a-z0-9_]+)'/g)].map((m) => m[1]))];
    expect(called.length, 'expected the header to call several keys').toBeGreaterThan(10);
    const missing = called.filter((k) => typeof ui.header?.[k.split('.')[1]] !== 'string');
    expect(missing, `called but never registered, so English in all 63 packs:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('the Bridge button has a registered accessible name', () => {
    expect(typeof ui.header?.bridge_aria).toBe('string');
    expect(typeof ui.header?.bridge_tooltip).toBe('string');
  });

  it('the Canvas variant of the AI button label is registered', () => {
    // Canvas is the primary surface; this key being unregistered meant the AI
    // button's accessible name was English there for every language.
    expect(typeof ui.header?.ai_diagnostics_canvas).toBe('string');
  });
});

describe('dashboard navigation names the role-specific destination', () => {
  it('keeps teacher and family labels while naming learner progress accurately', () => {
    expect(source).toContain("const dashboardNavLabel = isParentMode");
    expect(source).toContain("t('parent_mode.dashboard_title')");
    expect(source).toContain(": isTeacherMode");
    expect(source).toContain("t('dashboard.title')");
    expect(source).toContain("t('common.progress') || 'My Learning Progress'");
  });

  it('ships the localized learner label in the built module', () => {
    expect(module_).toContain('t("common.progress") || "My Learning Progress"');
  });
});
