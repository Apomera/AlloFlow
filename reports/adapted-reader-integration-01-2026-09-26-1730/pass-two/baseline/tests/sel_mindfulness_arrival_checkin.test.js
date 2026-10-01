import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_mindfulness.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_mindfulness.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Mindfulness arrival check-in', () => {
  it('keeps the desktop deployment copy identical to source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('maps five common arrival states to distinct starting practices', () => {
    const text = source();
    expect(text).toContain("id: 'overwhelmed', label: 'Overwhelmed'");
    expect(text).toContain("target: 'ground5421', practice: '5-4-3-2-1 grounding'");
    expect(text).toContain("id: 'restless', label: 'Restless'");
    expect(text).toContain("target: 'movement', practice: 'Mindful movement'");
    expect(text).toContain("id: 'foggy', label: 'Foggy'");
    expect(text).toContain("target: 'breath_studio', practice: 'Breath Studio'");
    expect(text).toContain("id: 'disconnected', label: 'Disconnected'");
    expect(text).toContain("target: 'body_scan_studio', practice: 'Body Scan Studio'");
    expect(text).toContain("id: 'steady', label: 'Steady'");
    expect(text).toContain("target: 'bell_timer', practice: 'Bell Timer'");
  });

  it('frames the recommendation as optional and preserves the full library path', () => {
    const text = source();
    expect(text).toContain('How are you arriving?');
    expect(text).toContain('This is a suggestion, not a diagnosis.');
    expect(text).toContain('Or choose any practice');
    expect(text).toContain("onClick: function() { upd('arrivalNeed', null); }");
  });

  it('exposes selection and recommendation changes accessibly', () => {
    const text = source();
    expect(text).toContain("role: 'group'");
    expect(text).toContain("'aria-labelledby': 'mindfulness-arrival-heading'");
    expect(text).toContain("'aria-pressed': isSelected");
    expect(text).toContain("role: 'status', 'aria-live': 'polite'");
    expect(text).toContain("'aria-label': 'Open suggested practice: ' + selectedArrival.practice");
    expect(text).toContain("announceToSR(option.label + ' selected. Suggested practice: '");
  });

  it('routes through the existing timer-safe navigation reset', () => {
    const text = source();
    expect(text).toContain('function openMindfulnessSuggestion(option) {');
    expect(text).toContain('stopBreathTimer(); stopScanTimer();');
    expect(text).toContain("upd({ activeTab: option.target, breathActive: false, breathPhase: null, scanActive: false });");
  });

  it('uses a calm visual hierarchy without hiding meaning in decoration', () => {
    const text = source();
    expect(text).toContain("background: 'radial-gradient(circle, rgba(167,139,250,0.24)");
    expect(text).toContain("boxShadow: isSelected ? '0 8px 22px ' + option.color + '22' : 'none'");
    expect(text).toContain("background: isSelected ? option.color : _minBg('#334155')");
    expect(text).toContain("}, '\\u2713') : null");
    expect(text).toContain("}, 'You noticed')");
    expect(text).toContain("}, '\\u2192')");
    expect(text).toContain("}, 'Suggested practice')");
    expect(text).toContain("whiteSpace: 'nowrap' } }, selectedArrival.duration");
  });
});
