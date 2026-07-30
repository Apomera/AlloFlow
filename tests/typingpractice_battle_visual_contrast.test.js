import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'stem_lab/stem_tool_typingpractice.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unterminated function: ' + name);
}

const palettes = {
  default: { bg: '#0f172a', surface: '#1e293b', success: '#34d399', warn: '#fbbf24', danger: '#fca5a5', text: '#e2e8f0', border: '#64748b', accent: '#7db6fa', onAccent: '#0f172a' },
  steampunk: { bg: '#1a1108', surface: '#2d1f12', success: '#88a850', warn: '#e8a040', danger: '#f07a55', text: '#f0e0c0', border: '#8f724a', accent: '#d4884c', onAccent: '#1a1108' },
  cyberpunk: { bg: '#0a0514', surface: '#1a0f2a', success: '#00ffc8', warn: '#ffd700', danger: '#ff4060', text: '#e0d8ff', border: '#7453a3', accent: '#ff3dbc', onAccent: '#0a0514' },
  kawaii: { bg: '#fff5fa', surface: '#ffe8f2', success: '#2f6f4b', warn: '#9a4d00', danger: '#a22e2a', text: '#4a2838', border: '#a85f82', accent: '#a72b5c', onAccent: '#ffffff' },
  oceanic: { bg: '#031b2e', surface: '#0a2a44', success: '#5eead4', warn: '#fbbf24', danger: '#fb8fa0', text: '#e0f2fe', border: '#477fa8', accent: '#22d3ee', onAccent: '#031b2e' },
  neutral: { bg: '#1a1a1a', surface: '#262626', success: '#9eaf8e', warn: '#c89860', danger: '#d38e86', text: '#e8e8e8', border: '#737373', accent: '#b8a080', onAccent: '#1a1a1a' },
};

const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((pair) => parseInt(pair, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrast = (a, b) => {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

describe('Typing Practice Battle visual contrast and zoom reflow', () => {
  it('derives difficulty, feedback, and alert colors from the active palette', () => {
    const highContrast = { bg: '#000000', surface: '#111111', success: '#00ff00', warn: '#ffaa00', danger: '#ff4444', text: '#ffffff', border: '#ffffff', accent: '#ffff00', onAccent: '#000000' };
    const colors = Function(
      'PALETTE',
      'HIGH_CONTRAST_PALETTE',
      'return (' + extractFunction('typingPracticeBattleSemanticColors') + ')'
    )(palettes.default, highContrast);

    for (const [theme, palette] of Object.entries(palettes)) {
      const result = colors(palette, theme);
      expect(result.easy).toBe(palette.success);
      expect(result.medium).toBe(palette.warn);
      expect(result.danger).toBe(palette.danger);
      for (const semantic of ['easy', 'medium', 'danger']) {
        expect(contrast(result[semantic], palette.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(result[semantic], palette.surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(colors(palettes.kawaii, 'kawaii').botText).toBe('#5b21b6');
    expect(colors(highContrast, 'kawaii').botText).toBe('#ffffff');
  });

  it('uses the semantic colors throughout Battle text and status UI', () => {
    expect(source).toContain('return battleColors.easy;');
    expect(source).toContain('return battleColors.medium;');
    expect(source).toContain('color = battleColors.easy;');
    expect(source).toContain('color = battleColors.danger;');
    expect(source).toContain('color: battleColors.incomingText');
    expect(source).toContain('color: battleColors.outgoingText');
    expect(source).toContain('headerColor: battleColors.botText');
    expect(source).toContain('color: summaryBattleColors.botText');
    expect(source).toContain('outcomeAccent = palette.accent;');
    expect(source).toContain('background: palette.surface, border:');
  });

  it('avoids dark-only text constants in the Battle play renderer', () => {
    const start = source.indexOf('function renderBattlePlay()');
    const end = source.indexOf('function renderBattleSummary()', start);
    const render = source.slice(start, end);
    expect(render).not.toContain("return '#22c55e'");
    expect(render).not.toContain("return '#fbbf24'");
    expect(render).not.toContain("color: '#fca5a5'");
    expect(render).not.toContain("color: '#86efac'");
    expect(render).not.toContain("headerColor: '#c4b5fd'");
  });

  it('reflows the menu hero, HUD metrics, and stacks at narrow widths', () => {
    expect(source).toContain("className: 'tp-battle-menu-hero'");
    expect(source).toContain("className: 'tp-battle-menu-copy'");
    expect(source).toContain("className: 'tp-battle-hud-metrics'");
    expect(source).toContain('.tp-root .tp-battle-menu-hero { flex-direction: column;');
    expect(source).toContain('.tp-root .tp-battle-hud-metrics { width: 100%; margin-left: 0 !important;');
    expect(source).toContain('.tp-root .tp-battle-stage, .tp-root .tp-battle-menu { padding: 12px !important; }');
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
