import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';

describe('Solar System SVG keyboard alternatives', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('gives both clickable SVG target types native keyboard activation semantics', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const interactiveGroups = source.match(/React\.createElement\('g', \{ key: [ac]\.id, role: 'button'[^\n]+/g) || [];
    expect(interactiveGroups).toHaveLength(2);
    interactiveGroups.forEach((group) => {
      expect(group).toContain('tabIndex: 0');
      expect(group).toContain("e.key === 'Enter'");
      expect(group).toContain("e.key === ' '");
      expect(group).toContain('e.preventDefault()');
      expect(group).toContain("'aria-label'");
    });
  });

  it('renders persistent keyboard alternatives for both pointer games', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'stem.solar_sys.earth',
        showDefender: true,
        showCrater: true,
      },
    });
    const buttons = [...document.querySelectorAll('button')].map((button) => button.textContent.trim());
    expect(buttons).toContain('Destroy next asteroid');
    expect(buttons).toContain('Mark next crater');

    const targets = [...document.querySelectorAll('svg g[role="button"]')];
    expect(targets.length).toBeGreaterThan(0);
    targets.forEach((target) => {
      expect(target.getAttribute('tabindex')).toBe('0');
      expect(target.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
