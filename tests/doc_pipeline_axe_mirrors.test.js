// Sentinel: axe-core must stay loadable from MULTIPLE CDN mirrors.
//
// 2026-06-09: locked-down school networks blocking a single CDN host silently
// killed whole features before (see doc_pipeline CDN resilience, commit
// 1afbae08). axe-core had FOUR single-URL load sites (main script tag, source
// fetch, per-iframe inject, subtree inject) — all now chain over
// _AXE_CDN_URLS. This test pins that the mirror list exists and every load
// site consumes the list rather than a lone URL, so a refactor can't quietly
// regress to single-CDN. (Source-content sentinel, same pattern as the wcag
// equivalence sentinels — the loaders themselves need a browser to run.)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const mod = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');

describe('doc_pipeline · axe-core CDN mirror chain', () => {
  for (const [label, text] of [['source', src], ['module', mod]]) {
    it(`${label}: _AXE_CDN_URLS lists 3 https mirrors on distinct hosts`, () => {
      const m = text.match(/_AXE_CDN_URLS = \[([\s\S]*?)\]/);
      expect(m, '_AXE_CDN_URLS array missing').toBeTruthy();
      const urls = [...m[1].matchAll(/'(https:\/\/[^']+)'/g)].map(x => x[1]);
      expect(urls.length).toBeGreaterThanOrEqual(3);
      const hosts = new Set(urls.map(u => new URL(u).host));
      expect(hosts.size).toBeGreaterThanOrEqual(3);
      // jsdelivr/unpkg use axe-core@4.12.1; cdnjs uses axe-core/4.12.1
      for (const u of urls) expect(u).toMatch(/axe-core[@/]4\.12\.1/);
    });

    it(`${label}: no load site uses a lone hardcoded axe URL anymore`, () => {
      // Every literal axe URL must live inside the _AXE_CDN_URLS definition —
      // count occurrences: exactly the 1 jsdelivr + 1 unpkg + 1 cdnjs in the list.
      const literals = (text.match(/https:\/\/[^'"\s]*axe-core[@/]4\.12\.1[^'"\s]*/g) || []);
      expect(literals.length).toBe(3);
    });

    it(`${label}: the script-tag loaders chain over the mirror list`, () => {
      // The three script-element load sites each walk _AXE_CDN_URLS[i].
      const chained = (text.match(/_AXE_CDN_URLS\[i\]/g) || []).length;
      expect(chained).toBeGreaterThanOrEqual(3);
      // and the source-text fetch iterates the list too
      expect(text).toMatch(/for \(const u of _AXE_CDN_URLS\)/);
    });
  }
});
