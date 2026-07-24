import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_emotions.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_emotions.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Emotions visual and input accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('programmatically names all seven SVG experiences', () => {
    const text = source();
    expect(text.match(/h\('svg', \{ role: /g)?.length).toBe(7);
    expect(text).toContain("'aria-label': 'Interactive Plutchik emotion wheel'");
    expect(text).toContain("'aria-label': 'Anger volcano level ' + vcLevel");
    expect(text).toContain("'aria-label': recent.length + ' emotion check-ins intensity line chart'");
  });

  it('makes body-map regions keyboard operable with 24-pixel hit areas', () => {
    const text = source();
    expect(text).toMatch(/key: regionId,\r?\n\s+role: 'button',\r?\n\s+tabIndex: 0/);
    expect(text).toContain("event.key === 'Enter' || event.key === ' '");
    expect(text).toContain("var hitW = Math.max(w, 24), hitH = Math.max(h_, 24)");
    expect(text).toContain("'aria-pressed': bmRegion === regionId ? 'true' : 'false'");
  });

  it('keeps the whole-body hit area behind specific regions', () => {
    const text = source();
    const whole = text.indexOf("_bodyRegion('whole'");
    const head = text.indexOf("_bodyRegion('head'");
    expect(whole).toBeGreaterThan(-1);
    expect(whole).toBeLessThan(head);
  });

  it('names the reflection field and all four library searches', () => {
    const text = source();
    expect(text).toContain("h('textarea', { 'aria-label': step.prompt");
    expect(text).toContain("'aria-label': 'Search the cultural emotion atlas'");
    expect(text).toContain("'aria-label': 'Search compound emotions'");
    expect(text).toContain("'aria-label': 'Search coregulation scenarios'");
    expect(text).toContain("'aria-label': 'Search emotion vocabulary'");
  });
});
