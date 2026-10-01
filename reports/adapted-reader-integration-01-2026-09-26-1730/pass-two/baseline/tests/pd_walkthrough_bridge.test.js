// UDL Walkthrough → PD bridge.
//
// The walkthrough's Building tab computes "PD signals" (weakest guidelines,
// n>=3) and previously did nothing with them. Now each signal deep-links into
// the Community Catalog's PD tab carrying its guideline id:
//   walkthrough button → window.__alloOpenPdCatalog({ guideline: 'eng_7' })
//   (ANTI effect) → sets __alloPdIntent payload + opens the catalog
//   readPdIntent() → returns the payload → PdHome spotlights tagged modules.
// Manifest entries carry honest, narrow udlGuidelines tags; matching is
// prefix-tolerant in both directions ('rep' tag ↔ 'rep_1' signal).

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/index.json'), 'utf8'));
const WALKTHROUGH_MODULE = readFileSync(resolve(process.cwd(), 'udl_walkthrough_module.js'), 'utf8');
const WALKTHROUGH_MIRROR = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/udl_walkthrough_module.js'), 'utf8');
const ANTI = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const DESKTOP_APP = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/App.jsx'), 'utf8');

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      getElementById: () => null,
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
});

function load(winExtra) {
  const win = { React, AlloModules: {}, ...(winExtra || {}) };
  const store = {};
  const storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  new Function('window', 'localStorage', SRC)(win, storage);
  return { CC: win.AlloModules.CommunityCatalog, win, storage };
}

describe('readPdIntent payload plumbing', () => {
  it('window boolean → true, cleared after read', () => {
    const { CC, win } = load({ __alloPdIntent: true });
    const t = CC._pdTesting;
    expect(t.readPdIntent()).toBe(true);
    expect(win.__alloPdIntent).toBe(false);
    expect(t.readPdIntent()).toBe(false);
  });

  it('window object payload → returned intact, cleared after read', () => {
    const { CC } = load({ __alloPdIntent: { guideline: 'eng_7' } });
    expect(CC._pdTesting.readPdIntent()).toEqual({ guideline: 'eng_7' });
    expect(CC._pdTesting.readPdIntent()).toBe(false);
  });

  it('localStorage: legacy "1" → true; JSON payload → object; junk → true', () => {
    const a = load(); a.storage.setItem('alloflow_pd_intent', '1');
    expect(a.CC._pdTesting.readPdIntent()).toBe(true);
    const b = load(); b.storage.setItem('alloflow_pd_intent', JSON.stringify({ guideline: 'rep_1' }));
    expect(b.CC._pdTesting.readPdIntent()).toEqual({ guideline: 'rep_1' });
    const c = load(); c.storage.setItem('alloflow_pd_intent', '{not json');
    expect(c.CC._pdTesting.readPdIntent()).toBe(true);
  });
});

describe('guideline matching', () => {
  it('is prefix-tolerant in both directions and never matches across principles', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    expect(t.pdGuidelineMatches('rep', 'rep_1')).toBe(true);
    expect(t.pdGuidelineMatches('rep_1', 'rep_1')).toBe(true);
    expect(t.pdGuidelineMatches('eng_8_4', 'eng_8')).toBe(true);
    expect(t.pdGuidelineMatches('rep_1', 'rep_2')).toBe(false);
    expect(t.pdGuidelineMatches('rep', 'eng_7')).toBe(false);
    expect(t.pdGuidelineMatches('', 'rep_1')).toBe(false);
  });

  it('labels are human-readable', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    expect(t.pdGuidelineLabel('eng_7')).toBe('Engagement guideline 7');
    expect(t.pdGuidelineLabel('rep_1')).toBe('Representation guideline 1');
    expect(t.pdGuidelineLabel('act')).toBe('Action & Expression');
    expect(t.pdGuidelineLabel('mystery')).toBe('mystery');
  });
});

describe('manifest tags', () => {
  it('every seed entry carries honest guideline tags that resolve to real matches', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    const bySlug = Object.fromEntries(MANIFEST.entries.map((entry) => [entry.slug, entry]));
    expect(bySlug['udl-representation-quickstart'].udlGuidelines).toEqual(['rep_1', 'rep_2', 'rep_3']);
    // A representation walkthrough signal finds the representation module...
    expect(t.pdEntryMatchesGuideline(bySlug['udl-representation-quickstart'], 'rep_2')).toBe(true);
    // ...a feedback signal finds the feedback module...
    expect(t.pdEntryMatchesGuideline(bySlug['actionable-feedback-quickstart'], 'eng_8')).toBe(true);
    // ...and tags never bleed across principles.
    expect(t.pdEntryMatchesGuideline(bySlug['retrieval-practice-quickstart'], 'eng_7')).toBe(false);
    expect(t.pdEntryMatchesGuideline({}, 'rep_1')).toBe(false);
  });
});

describe('spotlight UI', () => {
  it('PdHome shows the guideline banner when opened via a walkthrough signal', () => {
    const { CC } = load();
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CC.PdHome, { addToast() {}, initialGuideline: 'rep_1' })
    );
    expect(html).toContain('Showing PD related to');
    expect(html).toContain('Representation guideline 1');
    expect(html).toContain('Show all modules');
  });

  it('an object intent opens the catalog straight to the PD tab', () => {
    const { CC } = load({ __alloPdIntent: { guideline: 'eng_8' } });
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CC, { isOpen: true, onClose() {}, addToast() {} })
    );
    expect(html).toContain('Engagement guideline 8');
  });
});

describe('walkthrough + host wiring pins', () => {
  it('the built walkthrough module (and its deploy mirror) carry the deep-link', () => {
    for (const src of [WALKTHROUGH_MODULE, WALKTHROUGH_MIRROR]) {
      expect(src).toContain('__alloOpenPdCatalog');
      expect(src).toContain('guideline: sig.id');
    }
  });

  it('ANTI exposes the opener and both ANTI copies carry the bumped module pin', () => {
    expect(ANTI).toContain('window.__alloOpenPdCatalog = (intent)');
    expect(ANTI).toContain('udl_walkthrough_module.js?v=uw080307');
    expect(DESKTOP_APP).toContain('udl_walkthrough_module.js?v=uw080307');
    expect(ANTI).not.toContain('uw080306');
    expect(DESKTOP_APP).not.toContain('uw080306');
  });
});
