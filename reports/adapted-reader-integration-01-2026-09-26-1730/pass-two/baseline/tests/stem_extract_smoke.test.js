// Render-throw smoke for i18n extraction batches. NOT a snapshot lock — the
// extraction is behavior-neutral by construction (the harness t(key,fallback)
// returns the fallback, so a wrapped string renders byte-identically), so
// snapshots would only re-surface UNRELATED concurrent render drift. This pins
// the one thing extraction COULD break that node --check can't catch: a
// syntactically-valid splice that makes render() throw or produce empty output.
//
// Drives off STEM_SMOKE=tool1,tool2,... (basenames, e.g. aquarium,arccity).
// Auto-detects each tool's registered id from its registerTool('<id>', ...) call.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = (process.env.STEM_SMOKE || '').split(',').map((s) => s.trim()).filter(Boolean);

function detectId(file) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const m = src.match(/registerTool\(\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('no registerTool id in ' + file);
  return m[1];
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => resetStemLab());

describe('stem i18n extraction render-throw smoke', () => {
  if (!TOOLS.length) {
    it('STEM_SMOKE env empty — nothing to check', () => { expect(true).toBe(true); });
  }
  for (const tool of TOOLS) {
    const file = 'stem_lab/stem_tool_' + tool + '.js';
    it('renders without throwing: ' + tool, () => {
      const id = detectId(file);
      const cfg = loadTool(file, id);
      expect(typeof cfg.render).toBe('function');
      let html;
      try { html = renderTool(id, {}); }
      catch (e) { throw new Error('render threw for ' + tool + ' (' + id + '): ' + (e && e.message ? e.message : e)); }
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });
  }
});
