import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_wheeloflife.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_wheeloflife.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Wheel of Life visual focus flow', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('adds an accessible at-a-glance interpretation beside the radar chart', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Wheel shape at a glance'");
    expect(text).toContain("id: 'wol-wheel-gradient'");
    expect(text).toContain("'data-wol-focus-ring': dom.id");
    expect(text).toContain('A round wheel is not the goal.');
    expect(text).toContain("'Chosen focus'");
  });

  it('persists one chosen domain and one small next move', () => {
    const text = source();
    expect(text).toContain('focusDomain: null');
    expect(text).toContain("nextStep: ''");
    expect(text).toContain("'aria-label': 'One small move builder'");
    expect(text).toContain("'aria-label': 'Choose one focus domain'");
    expect(text).toContain("'aria-pressed': selected");
    expect(text).toContain("id: 'wol-next-step'");
    expect(text).toContain("'aria-label': 'Saved small move preview'");
  });

  it('uses theme-aware domain colors for light and contrast themes', () => {
    const text = source();
    expect(text).toContain('var _wl_DOMAIN_LIGHT');
    expect(text).toContain("var _wlDomain = function(h){ return _wlHC ? '#ffff00'");
    expect(text).toContain("'#22c55e':'#166534'");
    expect(text).toContain("'#eab308':'#854d0e'");
    expect(text).toContain('var domainColor = _wlDomain(dom.color)');
  });
});
