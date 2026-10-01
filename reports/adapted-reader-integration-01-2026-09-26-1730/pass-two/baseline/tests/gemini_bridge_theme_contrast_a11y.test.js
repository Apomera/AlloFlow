import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_gemini_bridge_source.jsx', 'utf8');

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return channels
    .map((channel) => (channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('Family Bridge theme contrast accessibility', () => {
  it('uses light-theme text tokens that clear the confirmed translucent surface endpoints', () => {
    const confirmedPairs = [
      ['#475569', '#f3f5f7'],
      ['#475569', '#d3d5d6'],
      ['#0f766e', '#e6f5f5'],
      ['#0f766e', '#f8fafc'],
      ['#4338ca', '#e9ebfb'],
      ['#6b21a8', '#f0eafc'],
      ['#854d0e', '#f7f4e8'],
      ['#991b1b', '#f7dfe0'],
      ['#92400e', '#f8f1dc'],
      ['#047857', '#f3f5f7'],
    ];
    for (const [foreground, background] of confirmedPairs) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(source).toContain("textSecondary: _isContrast ? '#FFFFFF' : (_isDark ? '#94a3b8' : '#475569')");
    expect(source).toContain("textAccent: _isContrast ? '#FFFF00' : (_isDark ? '#5eead4' : '#0f766e')");
    expect(source).toContain("warningText: _isContrast ? '#FFFF00' : (_isDark ? '#fbbf24' : '#854d0e')");
  });

  it('uses theme-aware tokens for every confirmed send-panel and Live Chat target', () => {
    expect(source).toContain("color:_bt.warningText");
    expect(source).toContain("color:_bt.secondaryAccent");
    expect(source).toContain("color:_bt.purpleAccent");
    expect(source).toContain("color:_bt.dangerText");
    expect(source).toContain("color: _bt.offlineAction");
    expect(source).toContain("color:_bt.inputText,lineHeight:1.6");
    expect((source.match(/color:_bt\.inputText,fontSize:'14px'/g) || [])).toHaveLength(2);
  });

  it('exposes generation mode as a persistent pressed-button selection', () => {
    expect(source).toContain("const [bridgeMode, setBridgeMode] = React.useState('explain')");
    expect(source).toContain("aria-pressed={bridgeMode === m.id}");
    expect(source).toContain("setBridgeMode(m.id)");
    expect(source).toContain("background: bridgeMode === m.id ? _bt.cardActiveBg : _bt.cardBg");
    expect(source).toContain("<span style={{fontSize:'11px',color:'inherit',lineHeight:1.4}}>{m.desc}</span>");
  });

  it('uses receive-dialog tokens that clear every confirmed light surface', () => {
    const confirmedPairs = [
      ['#475569', '#eff1fb'],
      ['#4338ca', '#dee0fa'],
      ['#115e59', '#c6ece9'],
      ['#6b21a8', '#ece1fb'],
      ['#166534', '#ccefd8'],
      ['#854d0e', '#f9eed1'],
      ['#312e81', '#dedffb'],
      ['#134e4a', '#c8ece8'],
    ];
    for (const [foreground, background] of confirmedPairs) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(source).toContain("textSecondary: _dContrast ? '#FFFFFF' : (_dDark ? '#94a3b8' : '#475569')");
    expect(source).toContain("textAccent: _dContrast ? '#FFFF00' : (_dDark ? '#a5b4fc' : '#4338ca')");
    expect(source).toContain("translatedAccent: _dContrast ? '#FFFF00' : (_dDark ? '#5eead4' : '#115e59')");
    expect(source).toContain("purpleAccent: _dContrast ? '#FFFF00' : (_dDark ? '#c084fc' : '#6b21a8')");
    expect(source).toContain("successAccent: _dContrast ? '#FFFF00' : (_dDark ? '#86efac' : '#166534')");
    expect(source).toContain("warningAccent: _dContrast ? '#FFFF00' : (_dDark ? '#fcd34d' : '#854d0e')");
    expect(source).toContain("karaokeEnglishText: _dContrast ? '#FFFF00' : (_dDark ? '#e0e7ff' : '#312e81')");
    expect(source).toContain("karaokeTranslatedText: _dContrast ? '#FFFF00' : (_dDark ? '#f0fdfa' : '#134e4a')");
  });
});
