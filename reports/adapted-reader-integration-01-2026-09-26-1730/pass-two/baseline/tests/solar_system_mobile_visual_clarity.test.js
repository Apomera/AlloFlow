import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';

describe('Solar System mobile visual clarity', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('renders atmospheric descent with native 44px evidence controls', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'stem.solar_sys.earth',
        viewTab: 'descent',
      },
    });

    const slider = document.querySelector('[data-solar-descent-slider]');
    const cards = [...document.querySelectorAll('[data-solar-descent-card]')];
    const pressed = cards.filter((card) => card.getAttribute('aria-pressed') === 'true');

    expect(slider?.tagName).toBe('INPUT');
    expect(slider?.getAttribute('aria-label')).toBe('Descent depth slider');
    expect(slider?.getAttribute('aria-valuetext')).toBeTruthy();
    expect(slider?.style.height).toBe('44px');
    expect(cards.length).toBeGreaterThan(1);
    expect(cards.every((card) => card.tagName === 'BUTTON')).toBe(true);
    expect(cards.every((card) => card.getAttribute('type') === 'button')).toBe(true);
    expect(cards.every((card) => card.getAttribute('role') === null)).toBe(true);
    expect(cards.every((card) => card.className.includes('min-h-[44px]'))).toBe(true);
    expect(pressed).toHaveLength(1);
  });

  it('preserves scientific diagram scale on phones inside named scroll regions', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain(':is(.solar-seasons-stage,.solar-signal-stage,.solar-moon-stage){overflow-x:auto;overflow-y:hidden');
    expect(source).toContain(':is(.solar-seasons-stage,.solar-signal-stage,.solar-moon-stage)>svg{width:720px;min-width:720px;max-width:none}');
    expect(source).toContain('className: "solar-seasons-stage p-2 sm:p-3", role: "region", tabIndex: 0');
    expect(source).toContain('className: "solar-signal-stage p-2 sm:p-3", role: "region", tabIndex: 0');
    expect(source).toContain("className: 'solar-moon-stage p-2 sm:p-3', role: 'region', tabIndex: 0");
    expect(source).toContain('Swipe or use arrow keys to inspect the full scientific model.');
  });

  it('moves narrow Orrery guidance into flow and normalizes immersive action targets', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('.orr-stage-instrument-rail{position:relative');
    expect(source).toContain('data-orrery-instrument-rail');
    expect(source).toContain('.orr-stage-readout{position:static');
    expect(source).toContain('.orr-stage-key{display:flex;width:100%;flex-wrap:nowrap;gap:6px;overflow-x:auto');
    expect(source).toContain('.orr-stage-key-scroll-cue{display:inline-flex;position:static');
    expect(source).toContain('scroll-snap-type:inline proximity');
    expect(source).toContain('id: "orrery-stage-key-scroll-hint"');
    expect(source).toContain('var stageKeyItemCount = 4 +');
    expect(source).toContain('.orr-stage-tip{position:static');
    expect(source).toContain('@media (any-pointer:coarse){.orr-btn{min-width:44px!important;min-height:44px!important}');
    expect(source).toContain("button.style.cssText = 'min-height:44px;padding:6px 8px");
    expect(source).toContain("roverTraverseButton.style.cssText = 'margin-top:8px;min-height:44px");
    expect(source).not.toContain("button.style.cssText = 'min-height:34px;padding:6px 8px");
    expect(source).not.toContain("roverTraverseButton.style.cssText = 'margin-top:8px;min-height:34px");
  });
});
