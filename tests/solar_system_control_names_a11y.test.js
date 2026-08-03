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
    expect(tabs[1]?.getAttribute('aria-label')).toBe('Kepler I: ellipses and the Sun at one focus');
    expect(tabs[2]?.getAttribute('aria-label')).toBe('Kepler II: equal areas in equal times');
  });
  it('announces Orrery route position and Kepler exploration progress', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 2,
        orreryKeplerSeen: ['keplerI', 'keplerII'],
        orr_mission_progress: { earth_distance: { correct: true }, mercury_speed: { correct: true } },
      },
    });
    const route = document.getElementById('orrery-tab-progress');
    expect(route?.getAttribute('role')).toBe('status');
    expect(route?.getAttribute('aria-live')).toBe('polite');
    expect(route?.getAttribute('data-active-section')).toBe('3');
    expect(route?.textContent).toContain('Section 3 of 9');
    expect(route?.textContent).toContain('2 / 3 Kepler laws explored');
    expect(route?.textContent).toContain('2 / 3 guided missions complete');
    expect(route?.getAttribute('data-guided-missions')).toBe('2');
    expect(route?.getAttribute('aria-label')).toContain('Kepler II: equal areas in equal times');
    expect(document.getElementById('orrery-kepler-progress')?.textContent).toContain('2 / 3 Kepler laws explored');
    expect(document.getElementById('orrery-guided-progress')?.textContent).toContain('2 / 3 guided missions complete');
  });
  it('tracks all Orrery section visits in route and quest state', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 2,
        orreryTabsSeen: ['0', '1', '2'],
      },
    });
    const route = document.getElementById('orrery-tab-progress');
    expect(route?.getAttribute('data-sampled-sections')).toBe('3');
    expect(route?.getAttribute('data-next-section')).toBe('3');
    expect(document.getElementById('orrery-section-progress')?.textContent).toContain('3 / 9 sections sampled');
    expect(document.getElementById('orrery-next-section')?.textContent).toContain('Go to III Periods');
    expect(document.getElementById('orrery-tab-0')?.getAttribute('data-orrery-visited')).toBe('true');
    expect(document.getElementById('orrery-tab-2')?.getAttribute('data-orrery-visited')).toBe('true');
    expect(document.getElementById('orrery-tab-8')?.getAttribute('data-orrery-visited')).toBe('false');
    expect(document.getElementById('orrery-route-segment-1')?.getAttribute('data-visited')).toBe('true');
    expect(document.getElementById('orrery-route-segment-3')?.getAttribute('data-visited')).toBe('false');

    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('var ORRERY_TAB_COUNT = 9;');
    expect(source).toContain('var countOrreryTabsSeen = function(d)');
    expect(source).toContain("id: 'orrery_tabs_all'");
    expect(source).toContain('function mergeOrreryTabsSeen(current, index)');
    expect(source).toContain('var segmentVisited = seenOrreryTabKeys.indexOf(String(i)) !== -1;');
  });
  it('keeps the route rail honest for out-of-order section visits', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 2,
        orreryTabsSeen: ['0', '2'],
      },
    });
    const route = document.getElementById('orrery-tab-progress');
    expect(route?.getAttribute('data-sampled-sections')).toBe('2');
    expect(route?.getAttribute('data-next-section')).toBe('1');
    expect(document.getElementById('orrery-route-segment-1')?.getAttribute('data-visited')).toBe('false');
    expect(document.getElementById('orrery-route-segment-2')?.getAttribute('data-visited')).toBe('true');
    expect(document.getElementById('orrery-next-section')?.textContent).toContain('Go to I Ellipses');
  });
  it('exposes Explorer Route state without a redundant NEW cue', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 0 },
    });
    const routeGroup = document.querySelector('[data-solarsystem-route-switcher]');
    expect(routeGroup?.getAttribute('role')).toBe('group');
    const routeButtons = [...(routeGroup?.querySelectorAll('button') || [])];
    const threeD = routeButtons.find((button) => button.textContent?.includes('3D Explorer'));
    const orrery = routeButtons.find((button) => button.textContent?.includes('Orrery Lab'));
    expect(threeD?.getAttribute('aria-pressed')).toBe('false');
    expect(orrery?.getAttribute('aria-pressed')).toBe('true');
    expect(routeGroup?.textContent).not.toContain('NEW');
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('"aria-pressed": active');
    expect(source).not.toContain('isNewRoute');
  });
  it('associates Orbit Workshop sliders and groups its body choices', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: { tutorialDismissed: true, orreryMode: true, orr_tab: 4 },
    });
    const eccentricity = document.getElementById('orrery-workshop-eccentricity');
    const semiMajor = document.getElementById('orrery-workshop-semi-major');
    expect(document.querySelector('label[for="orrery-workshop-eccentricity"]')?.textContent).toContain('Eccentricity');
    expect(document.querySelector('label[for="orrery-workshop-semi-major"]')?.textContent).toContain('Semi-major');
    expect(eccentricity?.getAttribute('aria-describedby')).toBe('orrery-workshop-controls-help');
    expect(semiMajor?.getAttribute('aria-describedby')).toBe('orrery-workshop-controls-help');
    expect(document.getElementById('orrery-workshop-controls-help')?.getAttribute('role')).toBe('note');
    expect(document.getElementById('orrery-workshop-energy-note')?.getAttribute('role')).toBe('note');
    const energyCanvas = document.querySelector('canvas[aria-label*="energy diagram"]');
    expect(energyCanvas?.getAttribute('aria-describedby')).toBe('orrery-workshop-energy-note');
    const workshopSource = readFileSync(SOURCE, 'utf8');
    expect(workshopSource).toContain('var a_norm = sma;');
    expect(workshopSource).toContain('Energy (normalized GM)');
    const controlRows = [...document.querySelectorAll('.orrery-workshop-control-row')];
    expect(controlRows).toHaveLength(2);
    expect(controlRows.every((row) => row.style.flexWrap === 'wrap')).toBe(true);
    const bodyGroup = document.querySelector('[role="group"][aria-label="Orbit Workshop body selection"]');
    expect(bodyGroup).not.toBeNull();
    expect(bodyGroup?.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    expect(unnamedControls(document.body.innerHTML).map((control) => control.outerHTML)).toEqual([]);
  });
  it('exposes selected states and names for Orrery choice groups', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain('role: "group", "aria-label": "Transfer departure planet"');
    expect(source).toContain('role: "group", "aria-label": "Transfer arrival planet"');
    expect(source).toContain('"aria-pressed": tr_from === p.id');
    expect(source).toContain('"aria-pressed": tr_to === p.id');
    expect(source).toContain('role: "group", "aria-label": "Challenge question navigator"');
    expect(source).toContain('role: "group", "aria-label": "True or false question navigator"');
    expect(source).toContain('id: "orrery-challenge-progress"');
    expect(source).toContain('"aria-valuenow": solvedCount');
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
    expect(markup).toContain('Kepler III check');
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
    expect(document.body.textContent).toContain('a · orbit size');
    expect(document.body.textContent).toContain('e · eccentricity');
    expect(document.body.textContent).toContain('T · period');
    expect(document.body.textContent).toContain('i · inclination');
    expect(document.body.textContent).toContain('distance now');
    expect(document.body.textContent).toContain('speed now');
    expect(document.getElementById('orrery-live-map-scale')?.getAttribute('role')).toBe('status');
    expect(document.getElementById('orrery-live-map-scale')?.textContent).toContain('Ruler:');
    expect(document.getElementById('orrery-live-speed')).not.toBeNull();
    expect(document.getElementById('orrery-live-phase')).not.toBeNull();
    expect(document.getElementById('orrery-live-kepler-cue')).not.toBeNull();
    expect(document.getElementById('orrery-live-kepler-reference')).not.toBeNull();
    expect(document.getElementById('orrery-live-kepler-iii')).not.toBeNull();
    expect(document.getElementById('orrery-live-timeline-value')).not.toBeNull();
    expect(document.querySelector('[data-orrery-timeline-landmark][aria-current="step"]')).not.toBeNull();
    expect(document.querySelector('button[data-orrery-timeline-jump][aria-pressed="true"]')).not.toBeNull();
    expect(document.getElementById('orrery-phase-scrubber')?.getAttribute('aria-valuetext')).toContain('years into Earth');
    expect(document.getElementById('orrery-body-navigator-help')?.getAttribute('role')).toBe('status');
    expect(document.querySelector('canvas[aria-label*="Earth is selected"]')).not.toBeNull();
  });  it('gates guided predictions until the orbital clock is paused', () => {
    const renderMission = (paused) => renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_paused: paused,
        orr_mission_progress: { earth_distance: { started: true } },
      },
    });
    document.body.innerHTML = renderMission(false);
    const runningOptions = [...document.querySelectorAll('button[aria-describedby="orrery-guided-objective"]')];
    expect(runningOptions).toHaveLength(2);
    expect(runningOptions.every((option) => option.disabled)).toBe(true);
    expect(runningOptions.every((option) => option.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(runningOptions[0]?.getAttribute('aria-label')).toContain('Pause the clock before predicting');

    document.body.innerHTML = renderMission(true);
    const pausedOptions = [...document.querySelectorAll('button[aria-describedby="orrery-guided-objective"]')];
    expect(pausedOptions).toHaveLength(2);
    expect(pausedOptions.every((option) => !option.disabled)).toBe(true);
  });  it('renders live distance and speed hooks for comparison mode', () => {
    document.body.innerHTML = renderTool('solarSystem', {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
        orr_paused: true,
        orr_compare: 'mars',
      },
    });
    expect(document.querySelector('table[aria-label*="Earth"][aria-label*="Mars"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Current distance');
    expect(document.getElementById('orrery-live-compare-primary-distance')).not.toBeNull();
    expect(document.getElementById('orrery-live-compare-secondary-distance')).not.toBeNull();
    expect(document.getElementById('orrery-live-compare-primary-speed')).not.toBeNull();
    expect(document.getElementById('orrery-live-compare-secondary-speed')).not.toBeNull();
    expect(document.getElementById('orrery-compare-interpretation')?.textContent).toContain('Earth is currently');
    expect(document.getElementById('orrery-compare-interpretation')?.textContent).toContain('Kepler III: Mars has the larger orbit and the longer period.');
    expect(document.getElementById('orrery-stage-readout')?.getAttribute('role')).toBe('status');
    expect(document.getElementById('orrery-stage-readout')?.getAttribute('aria-live')).toBe('polite');
    expect(document.getElementById('orrery-stage-readout-body')?.textContent).toContain('Earth');
    expect(document.getElementById('orrery-stage-readout-values')?.textContent).toContain('Distance');
    expect(document.querySelector('[role="region"][aria-label="Orbital comparison for Earth with Mars"]')).not.toBeNull();
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
    expect(document.querySelector('button[aria-label="Reset orbit time, camera view, and selection"]')).not.toBeNull();
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
