import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

describe('Typing Practice color-independent appearance choices', () => {
  it('shows every quick theme name instead of presenting color-only circles', () => {
    expect(source).toContain("className: 'tp-theme-quick-choice'");
    expect(source).toContain("className: 'tp-theme-quick-label'");
    expect(source).toContain("}, opt.label),");
    expect(source).toContain("className: 'tp-theme-quick-swatch'");
    expect(source).not.toContain("width: '44px',\n                      height: '44px',\n                      borderRadius: '50%'");
  });

  it('uses a stable redundant checkmark for quick, full-theme, and accent choices', () => {
    expect(source.match(/className: 'tp-choice-check'/g)).toHaveLength(3);
    expect(source.match(/opacity: isActive \? 1 : 0/g)).toHaveLength(3);
    expect(source.match(/}, '✓'\)/g)).toHaveLength(3);
  });

  it('retains programmatic selected states and descriptive accessible names', () => {
    expect(source).toContain("'aria-label': 'Switch to ' + opt.label.replace");
    expect(source).toContain("'aria-label': opt.label + ' theme — ' + opt.sub");
    expect(source).toContain("'aria-label': opt.label + ' accent'");
    expect(source.match(/'aria-pressed': isActive \? 'true' : 'false'/g).length).toBeGreaterThanOrEqual(15);
  });

  it('keeps quick chips readable on every palette rather than using sample colors behind text', () => {
    expect(source).toContain('background: palette.surface');
    expect(source).toContain('color: palette.textDim');
    expect(source).toContain('background: opt.bgSample');
    expect(source).toContain('background: opt.accentSample');
  });

  it('preserves check and boundary cues in Windows forced-colors mode', () => {
    expect(source).toContain("'  .tp-root [aria-pressed=\"true\"] .tp-choice-check { color: Highlight !important; }'");
    expect(source).toContain("'  .tp-root .tp-theme-quick-swatch { border-color: CanvasText !important; }'");
    expect(source).toContain("'  .tp-root [aria-pressed=\"true\"],");
  });
});
