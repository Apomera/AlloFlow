import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_strengths.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_strengths.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Strengths Finder coach and chart accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the coach field and its loading-aware action', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Ask the strengths coach'");
    expect(text).toContain("'aria-label': aiLoading ? 'Strengths coach is responding' : 'Send question to strengths coach'");
  });

  it('exposes the radar chart as an image with its category values', () => {
    const text = source();
    expect(text).toContain("role: 'img', 'aria-label': 'Strengths radar chart. '");
    expect(text).toContain("catCounts.map(function(c) { return c.label + ': ' + c.count; }).join(', ')");
  });

  it('provides named roving tabs linked to one tab panel', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Strengths Finder activities'");
    expect(text).toContain("'data-strength-tab': t.id");
    expect(text).toContain("'tabIndex': active ? 0 : -1");
    expect(text).toContain("onKeyDown: function(e)");
    expect(text).toContain("id: 'strengths-tab-panel', role: 'tabpanel'");
    expect(text).not.toContain("'aria-label': 'nowrap'");
  });

  it('exposes selection state and descriptive action labels', () => {
    const text = source();
    expect(text).toContain("'aria-pressed': sel");
    expect(text).toContain("'aria-label': s.label + (sel ? ' selected' : ' not selected')");
    expect(text).toContain("announceToSR(strength.label + (exists ? ' deselected' : ' selected')");
    expect(text).toContain("'aria-label': 'Show strengths badges'");
    expect(text).toContain("'aria-expanded': showBadges");
  });
});
