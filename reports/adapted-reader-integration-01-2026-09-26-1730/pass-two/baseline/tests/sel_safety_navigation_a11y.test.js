import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_safety.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_safety.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Safety & Wellbeing navigation and status accessibility', () => {
  it('keeps the deployed copy identical to the source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides named roving tabs linked to the active panel', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'Safety & Wellbeing tabs'");
    expect(text).toContain("'data-safety-tab': t.id");
    expect(text).toContain("tabIndex: isActive ? 0 : -1");
    expect(text).toContain('onKeyDown: function(e)');
    expect(text).toContain("'aria-controls': 'safety-tab-panel'");
    expect(text).toContain("id: 'safety-tab-panel', role: 'tabpanel'");
    expect(text).toContain("if (announceToSR) announceToSR(next.label + ' tab selected')");
  });

  it('keeps safety-sensitive feedback and progress structured', () => {
    const text = source();
    expect(text).toContain("role: 'status', 'aria-live': 'polite'");
    expect(text).toContain("role: 'progressbar'");
    expect(text).toContain("'aria-label': 'Safety quiz progress'");
    expect(text).toContain('announceSR(');
    expect(text).toContain("announceToSR('All safety scenarios completed')");
    expect(text).toContain("announceToSR('Safety quiz complete. Score '");
    expect(text).toContain("announceToSR('Safety plan saved')");
  });

  it('keeps controls and quiz choices descriptive', () => {
    const text = source();
    expect(text).toContain("'aria-label': t.label");
    expect(text).toContain("'aria-label': soundEnabled ? 'Mute' : 'Unmute'");
    expect(text).toContain("'aria-pressed': soundEnabled");
    expect(text).toContain("'aria-label': val ? 'True' : 'False'");
    expect(text).toContain("'aria-label': ch");
    expect(text).not.toContain("'aria-label': 'Select answer'");
  });
});