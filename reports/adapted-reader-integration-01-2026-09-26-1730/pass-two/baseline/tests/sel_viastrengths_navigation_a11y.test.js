import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_viastrengths.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_viastrengths.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('VIA Strengths navigation and self-sort accessibility', () => {
  it('keeps the deployed copy identical to the source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides roving tabs linked to the active section panel', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'VIA Strengths sections'");
    expect(text).toContain("'data-via-tab': t.id");
    expect(text).toContain("id: 'via-tab-' + t.id");
    expect(text).toContain("tabIndex: active ? 0 : -1");
    expect(text).toContain('onKeyDown: function(e)');
    expect(text).toContain("'aria-controls': 'via-tab-panel'");
    expect(text).toContain("id: 'via-tab-panel', role: 'tabpanel'");
  });

  it('announces rating changes and exposes self-sort progress', () => {
    const text = source();
    expect(text).toContain("if (announceToSR && strength) announceToSR(strength.label + ' rated ' + value + ' out of 5')");
    expect(text).toContain("role: 'progressbar'");
    expect(text).toContain("'aria-label': 'Self-sort progress'");
    expect(text).toContain("'aria-valuemax': 24");
    expect(text).toContain("'aria-valuetext': ratedCount + ' of 24 strengths rated'");
    expect(text).toContain("role: 'status'");
  });
});