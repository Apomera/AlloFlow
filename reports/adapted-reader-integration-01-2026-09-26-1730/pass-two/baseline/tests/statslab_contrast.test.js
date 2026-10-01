import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_statslab.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_statslab.js');

const readSource = () => fs.readFileSync(sourcePath, 'utf8');

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function compositeHex(foreground, background, alpha) {
  const parse = (hex) => hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
  const fg = parse(foreground);
  const bg = parse(background);
  const mixed = fg.map((value, index) => Math.round(value * alpha + bg[index] * (1 - alpha)));
  return '#' + mixed.map((value) => value.toString(16).padStart(2, '0')).join('');
}

describe('Statistics Lab contrast themes', () => {
  it('keeps the source and desktop deploy mirror identical', () => {
    expect(readSource()).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('scopes semantic UI and chart palettes to light, dark, and contrast themes', () => {
    const source = readSource();

    expect(source).toContain("className: 'statslab-tool-shell'");
    expect(source).toContain("st.id = 'allo-statslab-contrast-css'");
    expect(source).toContain('.statslab-tool-shell{--allo-stem-canvas:#fff;');
    expect(source).toContain('[data-stem-theme="dark"] .statslab-tool-shell{--allo-stem-canvas:#0f172a;');
    expect(source).toContain('[data-stem-theme="contrast"] .statslab-tool-shell{--allo-stem-canvas:#000;');
    expect(source).not.toContain('.theme-dark .statslab-tool-shell');
    expect(source).not.toContain('.theme-contrast .statslab-tool-shell');
    expect(source).toContain('--sl-badge-warning:#fbbf24;');
    expect(source).toContain('--sl-on-badge:#0b1220;');
    expect(source).toContain('@media (prefers-contrast:more)');
    expect(source).toContain('@media (forced-colors:active)');
    expect(source).toContain('[data-stem-theme="contrast"] .statslab-tool-shell [role="tab"][aria-selected="true"]');
    expect(source).toContain('.statslab-tool-shell :is(input,select,textarea){border-color:var(--sl-border)!important;}');
    expect(source).toContain("background: sel ? 'linear-gradient(135deg,#4338ca,#3730a3)' : 'var(--sl-accent-soft)'");
  });

  it('uses the semantic palette in every primary statistical chart renderer', () => {
    const source = readSource();

    expect((source.match(/background: 'var\(--sl-chart-bg\)'/g) || [])).toHaveLength(10);
    expect((source.match(/var\(--sl-chart-label\)/g) || []).length).toBeGreaterThanOrEqual(25);
    expect((source.match(/var\(--sl-chart-axis\)/g) || []).length).toBeGreaterThanOrEqual(20);
    expect(source).toContain("fill: 'var(--sl-chart-primary)'");
    expect(source).toContain("fill: 'var(--sl-chart-secondary)'");
    expect(source).toContain("fill: 'var(--sl-chart-warning)'");
    expect(source).toContain("fill: 'var(--sl-chart-danger)'");
    expect(source).toContain("stroke: 'var(--sl-chart-point-stroke)'");
    expect(source).not.toContain("style: { background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 6 }");
  });

  it('keeps documented light and dark foreground pairs at WCAG AA contrast', () => {
    const source = readSource();
    const pairs = [
      ['#3730a3', '#ffffff'], ['#4338ca', '#ffffff'], ['#6d28d9', '#ffffff'],
      ['#075985', '#ffffff'], ['#166534', '#ffffff'], ['#92400e', '#ffffff'],
      ['#b91c1c', '#ffffff'], ['#0f766e', '#ffffff'], ['#334155', '#ffffff'],
      ['#047857', '#ffffff'], ['#a16207', '#ffffff'], ['#c7d2fe', '#0f172a'],
      ['#a5b4fc', '#0f172a'], ['#d8b4fe', '#0f172a'], ['#7dd3fc', '#0f172a'],
      ['#86efac', '#0f172a'], ['#fde68a', '#0f172a'], ['#fca5a5', '#0f172a'],
      ['#5eead4', '#0f172a'], ['#e2e8f0', '#0f172a'], ['#ffffff', '#000000'],
      ['#cbd5e1', '#0b1220'], ['#fbbf24', '#0b1220'], ['#fb923c', '#0b1220'],
      ['#86efac', '#0b1220'], ['#fca5a5', '#0b1220']
    ];

    const sourceColors = new Set(pairs.flat().filter((color) => color !== '#ffffff' && color !== '#000000'));
    sourceColors.forEach((color) => expect(source.toLowerCase()).toContain(color));
    pairs.forEach(([foreground, background]) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps form boundaries, high-contrast controls, and action gradients distinguishable', () => {
    const source = readSource();

    expect(contrastRatio('#64748b', '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#94a3b8', '#0f172a')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#00ff00', '#000000')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#000000', '#ffff00')).toBeGreaterThanOrEqual(4.5);

    [
      ['#ffffff', '#4338ca'], ['#ffffff', '#7e22ce'], ['#ffffff', '#be185d'],
      ['#ffffff', '#15803d'], ['#ffffff', '#166534'], ['#ffffff', '#b45309'],
      ['#ffffff', '#92400e'], ['#ffffff', '#047857'], ['#ffffff', '#065f46'],
      ['#ffffff', '#0e7490'], ['#ffffff', '#155e75'], ['#ffffff', '#6b21a8'],
    ].forEach(([foreground, background]) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    });

    expect(source).toContain('[data-stem-theme="contrast"] .statslab-tool-shell button{background-color:#000!important;background-image:none!important;color:#0f0!important;border-color:#ff0!important;}');
    expect(source).toContain('linear-gradient(135deg, #b45309, #92400e)');
    expect(source).toContain('linear-gradient(135deg, #047857, #065f46)');
    expect(source).toContain('linear-gradient(135deg, #0e7490, #155e75)');
    expect(source).toContain('linear-gradient(135deg, #7e22ce, #6b21a8)');
    expect(source).not.toContain('linear-gradient(135deg, #a855f7, #7e22ce)');
  });

  it('keeps mixed-theme result, quiz, mastery, and inquiry surfaces semantic', () => {
    const source = readSource();

    expect(source).toContain("style: { background: 'linear-gradient(135deg,#1e1b4b,#0f172a 55%,#083344)' }");
    expect(source).toContain("background: 'var(--sl-panel)'");
    expect(source).toContain("bg = 'var(--sl-positive-soft)'; borderColor = 'var(--sl-positive)'; textColor = 'var(--sl-positive)'");
    expect(source).toContain("bg = 'var(--sl-danger-soft)'; borderColor = 'var(--sl-danger)'; textColor = 'var(--sl-danger)'");
    expect(source).toContain("bg = 'var(--sl-purple-soft)'; borderColor = 'var(--sl-purple)'; textColor = 'var(--sl-purple)'");
    expect(source).toContain("background: c.sig ? 'var(--sl-positive-soft)' : 'var(--sl-panel)'");
    expect(source).toContain("stroke: 'var(--sl-chart-axis)'");
    expect(source).not.toContain("background: 'rgba(15,23,42,0.60)'");
    expect(source).not.toContain("stroke: '#1e293b'");

    const regionPairs = [
      ['#4338ca', '#ffffff'], ['#047857', '#ffffff'], ['#b91c1c', '#ffffff'],
      ['#a5b4fc', '#0f172a'], ['#6ee7b7', '#0f172a'], ['#fca5a5', '#0f172a'],
      ['#ffff00', '#000000'], ['#00ffff', '#000000'], ['#ff8080', '#000000'],
    ];
    regionPairs.forEach(([fill, background]) => {
      expect(contrastRatio(compositeHex(fill, background, 0.78), background)).toBeGreaterThanOrEqual(3);
    });
    expect((source.match(/opacity: 0\.78/g) || []).length).toBeGreaterThanOrEqual(6);
  });

});
