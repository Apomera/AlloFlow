import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_windowoftolerance.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_windowoftolerance.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Window of Tolerance navigation accessibility', () => {
  it('keeps the deployed copy identical to the source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides roving tabs linked to the active section panel', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'Window of Tolerance sections'");
    expect(text).toContain("'data-wot-tab': t.id");
    expect(text).toContain("id: 'wot-tab-' + t.id");
    expect(text).toContain("tabIndex: active ? 0 : -1");
    expect(text).toContain('onKeyDown: function(e)');
    expect(text).toContain("'aria-controls': 'wot-tab-panel'");
    expect(text).toContain("id: 'wot-tab-panel', role: 'tabpanel'");
  });

  it('announces section changes while preserving check-in status feedback', () => {
    const text = source();
    expect(text).toContain("if (announceToSR) announceToSR((WOT_VIEW_LABELS[v] || v) + ' section selected')");
    expect(text).toContain("'aria-label': 'Return to the window guidance'");
    expect(text).toContain("'aria-label': 'In-window check-in result'");
    expect(text).toContain("'aria-live': 'polite'");
  });
});