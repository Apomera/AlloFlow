import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_teamwork.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_teamwork.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Teamwork clipboard fallback accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('labels the temporary textarea and keeps it out of sequential focus', () => {
    const text = source();
    expect(text).toContain("textarea.setAttribute('aria-label', 'Team retrospective text for copying');");
    expect(text).toContain("textarea.setAttribute('readonly', '');");
    expect(text).toContain('textarea.tabIndex = -1;');
    expect(text).toContain("textarea.style.left = '-9999px';");
  });

  it('provides named roving tabs linked to the active panel', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'Teamwork & Collaboration tabs'");
    expect(text).toContain("'data-teamwork-tab': t.id");
    expect(text).toContain("'tabIndex': isActive ? 0 : -1");
    expect(text).toContain("onKeyDown: function(e)");
    expect(text).toContain("'aria-controls': 'teamwork-tab-panel'");
    expect(text).toContain("id: 'teamwork-tab-panel', role: 'tabpanel'");
  });

  it('announces activity progress and exposes coach history semantics', () => {
    const text = source();
    expect(text).toContain("role: 'status'");
    expect(text).toContain("role: 'log', 'aria-label': 'Conflict conversion history'");
    expect(text).toContain("'aria-label': 'Team role coach response'");
    expect(text).toContain("'aria-label': 'Teamwork challenge coach response'");
    expect(text).toContain("announceToSR('All teamwork scenarios completed')");
    expect(text).toContain("announceToSR('Communication style assessment complete')");
    expect(text).toContain("announceToSR('Team contract saved')");
    expect(text).toContain("announceToSR('Team retrospective saved')");
  });

  it('keeps auxiliary controls descriptive and outside the tablist', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Toggle sound', 'aria-pressed': soundEnabled");
    expect(text).toContain("'aria-label': 'Show teamwork badges', 'aria-expanded': showBadgesPanel");
    expect(text).toContain("'aria-label': 'Export retrospective as text'");
    expect(text).toContain("'aria-label': 'Clear retrospective cards'");
  });
});
