import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const readHost = () => readFileSync('stem_lab/stem_lab_module.js', 'utf8');

function extractBalanced(source, openAt, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = openAt; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') {
        i++;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === openChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) return source.slice(openAt, i + 1);
    }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar + ' block');
}

function readCatalog(source) {
  const declaration = /^[ 	]*var _allStemTools\s*=\s*\[/m.exec(source);
  expect(declaration).not.toBeNull();
  const openAt = declaration.index + declaration[0].lastIndexOf('[');
  const expression = extractBalanced(source, openAt, '[', ']');
  return runInNewContext('(' + expression + ')', { t: (key) => key });
}

function readAccentMap(source) {
  const declaration = source.indexOf('var _toolColorMap = {');
  expect(declaration).toBeGreaterThanOrEqual(0);
  const openAt = source.indexOf('{', declaration);
  const expression = extractBalanced(source, openAt, '{', '}');
  return runInNewContext('(' + expression + ')');
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('STEM catalog card palette', () => {
  it('assigns every reordered card from a limited section palette without adjacent repeats', () => {
    const records = readCatalog(readHost());
    const allowed = new Set(['blue', 'indigo', 'violet', 'rose', 'orange', 'amber', 'emerald', 'cyan']);
    const assigned = new Map();
    const used = new Set();
    let palette = null;
    let breaks = null;
    let paletteIndex = 0;
    let previous = null;
    let categoryCount = 0;

    records.forEach((tool) => {
      if (tool.category) {
        categoryCount++;
        expect(Array.isArray(tool.palette)).toBe(true);
        expect(tool.palette.length).toBeGreaterThan(1);
        tool.palette.forEach((color) => expect(allowed.has(color)).toBe(true));
        palette = tool.palette;
        breaks = tool.paletteBreaks || null;
        paletteIndex = 0;
        previous = null;
        return;
      }

      if (breaks && breaks[tool.id]) {
        palette = breaks[tool.id];
        paletteIndex = 0;
      }
      expect(palette).not.toBeNull();
      const color = palette[paletteIndex % palette.length];
      expect(allowed.has(color)).toBe(true);
      expect(color).not.toBe(previous);
      assigned.set(tool.id, color);
      used.add(color);
      previous = color;
      paletteIndex++;
    });

    expect(categoryCount).toBe(16);
    expect(assigned.size).toBeGreaterThan(130);
    expect([...used].sort()).toEqual([...allowed].sort());
    expect(assigned.get('rockCycle')).toBe('orange');
    expect(assigned.get('molecule')).toBe('amber');
  });

  it('keeps card color semantic and theme-local instead of using full tinted utility surfaces', () => {
    const source = readHost();
    const map = readAccentMap(source);

    expect(Object.keys(map)).toEqual([
      'blue', 'indigo', 'violet', 'rose', 'orange', 'amber', 'emerald', 'cyan'
    ]);
    expect(source).toContain('var _cardColor = _catalogColorById[tool.id] || tool.color;');
    expect(source).toContain("'data-stem-card-color': _cardColor");
    expect(source).toContain("'--stem-card-surface': _cardTone.surface");
    expect(source).toContain("'--stem-card-icon-bg': _cardTone.iconBg");
    expect(source).toContain('border-top: 4px solid var(--stem-card-accent)');
    expect(source).not.toContain('_cm.bg +');
    expect(source).not.toContain('_cm.hoverBorder');

    Object.values(map).forEach((tone) => {
      expect(contrast(tone.light, '#ffffff')).toBeGreaterThanOrEqual(3);
      expect(contrast(tone.dark, '#0f172a')).toBeGreaterThanOrEqual(3);
    });
  });

  it('pins readable card text and focus treatment in light, dark, and contrast themes', () => {
    const source = readHost();
    const effectStart = source.indexOf("var id = 'stem-theme-overrides'");
    const darkStart = source.indexOf('if (isDark) {', effectStart);
    const contrastStart = source.indexOf('} else if (isContrast) {', darkStart);
    const effectEnd = source.indexOf('document.head.appendChild(s);', contrastStart);
    const darkBlock = source.slice(darkStart, contrastStart);
    const contrastBlock = source.slice(contrastStart, effectEnd);

    expect(darkBlock).toContain('[data-stem-lab] .stem-tool-card h4 { color: #f1f5f9 !important; }');
    expect(darkBlock).toContain('[data-stem-lab] .stem-tool-card p { color: #cbd5e1 !important; }');
    expect(darkBlock).toContain('[data-stem-lab] .stem-tool-card:focus-visible { outline: 3px solid #fbbf24 !important; outline-offset: 3px !important; }');
    expect(contrastBlock).toContain('[data-stem-lab] .stem-tool-card h4 { color: #fbbf24 !important; }');
    expect(contrastBlock).toContain('[data-stem-lab] .stem-tool-card p { color: #ffffff !important; }');
    expect(contrastBlock).toContain('[data-stem-lab] .stem-tool-card:focus-visible { outline: 3px solid #fbbf24 !important; outline-offset: 3px !important; }');

    [
      ['#0f172a', '#ffffff', 4.5],
      ['#475569', '#ffffff', 4.5],
      ['#f1f5f9', '#0f172a', 4.5],
      ['#cbd5e1', '#0f172a', 4.5],
      ['#f1f5f9', '#1e293b', 4.5],
      ['#cbd5e1', '#1e293b', 4.5],
      ['#fbbf24', '#000000', 4.5],
      ['#ffffff', '#000000', 4.5],
      ['#1d4ed8', '#ffffff', 3],
      ['#fbbf24', '#0f172a', 3]
    ].forEach(([foreground, background, minimum]) => {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum);
    });
  });
});
