import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_solarsystem.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js';

function unnamedControls(markup) {
  document.body.innerHTML = markup;
  return [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].filter((control) => {
    if ((control.getAttribute('aria-label') || '').trim()) return false;
    const labelledBy = (control.getAttribute('aria-labelledby') || '').trim();
    if (labelledBy && labelledBy.split(/\s+/).every((id) => document.getElementById(id)?.textContent.trim())) return false;
    if (control.closest('label')) return false;
    const id = control.id;
    return !id || ![...document.querySelectorAll('label[for]')].some((label) => label.htmlFor === id);
  });
}

describe('Solar System control accessible names', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE, 'solarSystem');
  });

  it('keeps the canonical source and deployed mirror byte-identical', () => {
    expect(readFileSync(MIRROR, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('names all 44 generated mini-tool sliders from their visible labels', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const sliders = source.match(/React\.createElement\('input', \{ 'aria-label': [^\n]+, type: 'range'/g) || [];
    expect(sliders).toHaveLength(44);
    expect(sliders.some((line) => line.includes("'aria-label': s.label"))).toBe(true);
    expect(sliders.some((line) => line.includes("'aria-label': __alloT('stem.solarsystem.time', 'Time')"))).toBe(true);
  });

  it('renders no unnamed form controls in the planet and field-journal view', () => {
    const markup = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        selectedPlanet: 'stem.solar_sys.earth',
        showJournal: true,
      },
    });
    expect(unnamedControls(markup).map((control) => control.outerHTML)).toEqual([]);
    expect(document.querySelector('label[for="journal-predict"]')?.textContent).toContain('What I predicted');
    expect(document.querySelector('label[for="journal-question"]')?.textContent).toContain('One question');
  });

  it('renders reduced-motion Orrery evidence controls with runtime accessible names', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    try {
      const markup = renderTool('solarSystem', {
        solarSystem: {
          tutorialDismissed: true,
          orreryMode: true,
          orr_tab: 0,
          orr_sel: 'earth',
        },
      });
      expect(markup).toContain('Reduced motion on');
      expect(markup).toContain('Capture A');
      expect(markup).toContain('Guided mission progress');
      expect(markup).toContain('Save orbital snapshot B for Earth after saving snapshot A');
      expect(unnamedControls(markup).map((control) => control.outerHTML)).toEqual([]);
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });
  it('connects Orrery section tabs to the active tabpanel', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 2 },
    });
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panel = document.querySelector('[role="tabpanel"]');
    const activeTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    expect(tabs).toHaveLength(9);
    expect(panel).not.toBeNull();
    expect(activeTab?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.getAttribute('aria-labelledby')).toBe(activeTab?.id);
  });
  it("surfaces the selected world's live Kepler II speed cue", () => {
    const markup = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
      },
    });
    expect(markup).toContain('Kepler II cue');
    expect(markup).toContain('semi-major axis a');
    expect(markup).toContain('Reference at a:');
  });
  it('renders live selected-world readout hooks', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
      },
    });
    expect(document.getElementById('orrery-live-distance')).not.toBeNull();
    expect(document.getElementById('orrery-live-speed')).not.toBeNull();
    expect(document.getElementById('orrery-live-phase')).not.toBeNull();
    expect(document.getElementById('orrery-live-kepler-cue')).not.toBeNull();
    expect(document.getElementById('orrery-live-kepler-reference')).not.toBeNull();
    expect(document.getElementById('orrery-live-timeline-value')).not.toBeNull();
    expect(document.querySelector('[data-orrery-timeline-landmark][aria-current="step"]')).not.toBeNull();
    expect(document.querySelector('button[data-orrery-timeline-jump][aria-pressed="true"]')).not.toBeNull();
    expect(document.getElementById('orrery-phase-scrubber')?.getAttribute('aria-valuetext')).toContain('years into Earth');
  });  it('groups Orrery controls for responsive keyboard scanning', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
      },
    });
    const groups = [...document.querySelectorAll('[role="group"]')];
    expect(groups.some((group) => group.getAttribute('aria-label') === 'Orbit playback controls')).toBe(true);
    expect(groups.some((group) => group.getAttribute('aria-label') === 'Orbit phase controls')).toBe(true);
    expect(groups.some((group) => group.getAttribute('aria-label') === 'Orbit view controls')).toBe(true);
    const speed = document.querySelector('#orrery-speed-control');
    expect(speed?.getAttribute('aria-valuetext')).toContain('Earth years per second');
    expect(document.querySelector('label[for="orrery-speed-control"]')?.textContent).toBe('Speed');
    expect(document.querySelector('button[aria-label="Reset orbit time and clear selection"]')).not.toBeNull();
  });
  it('offers an honest three-way orbital speed prediction choice', () => {
    const markup = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
        orr_snapshots: {
          earth: {
            a: {
              bodyId: 'earth',
              bodyName: 'Earth',
              time: 0,
              distance: 1,
              speed: 29.8,
              phase: 'Near perihelion',
            },
          },
        },
      },
    });
    expect(markup).toContain('Predict B: will orbital speed be faster, slower, or about the same as A?');
    expect(markup).toContain('About the same as A');
    document.body.innerHTML = markup;
    const saveB = document.querySelector('button[aria-label*="Save orbital snapshot B"]');
    expect(saveB?.hasAttribute('disabled')).toBe(true);
    expect(saveB?.getAttribute('aria-label')).toContain('after choosing a prediction');
    expect(unnamedControls(markup).map((control) => control.outerHTML)).toEqual([]);
  });  it('keeps visible labels for the Kepler inquiry writing fields', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("htmlFor: 'solar-kepler-hypothesis'");
    expect(source).toContain("id: 'solar-kepler-hypothesis'");
    expect(source).toContain("h('span', { style: { display: 'block', marginBottom: 4 } }, __alloT('stem.solarsystem.explain_in_your_own_words', 'Explain in your own words'))");
  });
});
