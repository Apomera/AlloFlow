// Geology Explorer: the scene's three-stage process story is drawn ONCE.
//
// Until 2026-09-24 five page panels (process map + evidence trail, formation timeline, evidence
// beacons, process cues, and on six worlds a signal timeline) each drew the same three stages in
// different words: subduction's first stage read "Cold slab descends" / "Cold slab" / "Cold slab",
// and its sentence appeared three times. They were merged into sceneStoryPanel. These tests render
// the real tool (every world, every mode) and pin what the merge must keep and what it removed.
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const sourcePath = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
const MODES = ['explore', 'investigate', 'assess'];
const OLD_PANELS = ['Interactive process map', 'Formation timeline', 'Evidence beacons', 'Process cues'];

let P;
beforeAll(() => {
  resetStemLab();
  loadTool(sourcePath, 'geologyExplorer');
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
function mount(scene, mode) {
  const box = document.createElement('div');
  box.innerHTML = renderTool('geologyExplorer', { geologyExplorer: { scene, mode } });
  return box;
}
const regionsNamed = (box, name) => [...box.querySelectorAll('[role="region"]')].filter((n) => n.getAttribute('aria-label') === name);
const count = (hay, needle) => hay.split(needle).length - 1;

describe('the process story is one panel', () => {
  it('found the worlds and their stories', () => {
    expect(P.scenes().sort()).toEqual([...SCENES].sort());
    for (const id of SCENES) expect(P.sceneJourney(id), id).toHaveLength(3);
  });

  for (const scene of SCENES) {
    it(scene + ': exactly one story region with three stages, in every mode, and none of the old panels', () => {
      for (const mode of MODES) {
        const box = mount(scene, mode);
        const story = box.querySelectorAll('[data-geology-story]');
        expect(story.length, mode).toBe(1);
        expect(story[0].getAttribute('data-geology-story')).toBe(scene);
        expect(regionsNamed(box, 'Process story').length, mode).toBe(1);
        expect(story[0].querySelectorAll('[data-geology-story-stage]').length, mode).toBe(3);
        for (const old of OLD_PANELS) expect(regionsNamed(box, old).length, scene + '/' + mode + ' ' + old).toBe(0);
        expect(box.querySelectorAll('[data-geology-formation-timeline], [data-geology-beacon-panel], [data-geology-process-cues], [data-geology-evidence-trail]').length, mode).toBe(0);
      }
    });
  }

  it("the mission's 'Open process timeline' routes still land: one [data-geology-target=signal] in every world and mode", () => {
    for (const scene of SCENES) for (const mode of MODES) {
      const targets = mount(scene, mode).querySelectorAll('[data-geology-target="signal"]');
      expect(targets.length, scene + '/' + mode).toBe(1);
      expect(targets[0].hasAttribute('data-geology-story'), scene + '/' + mode).toBe(true);
    }
  });

  it('each stage sentence of the active stage is on the page once, not three times', () => {
    for (const scene of SCENES) {
      const box = mount(scene, 'explore');
      const text = box.textContent;
      const body = P.sceneJourney(scene)[0].body;
      expect(count(text, body), scene + ': ' + body).toBe(1);
    }
  });

  it("the stage buttons name the stage and say whether its evidence is linked", () => {
    const box = mount('subduction', 'explore');
    const stages = [...box.querySelectorAll('[data-geology-story-stage]')];
    const journey = P.sceneJourney('subduction');
    stages.forEach((b, i) => {
      expect(b.getAttribute('aria-label')).toBe('Stage ' + (i + 1) + ': ' + journey[i].label + '. Explore next');
      expect(b.textContent).toContain(journey[i].label);
      expect(b.getAttribute('aria-pressed')).toBe(i === 0 ? 'true' : 'false');
    });
    // saved progress shows as linked, on the button and in the counter
    const saved = document.createElement('div');
    saved.innerHTML = renderTool('geologyExplorer', { geologyExplorer: { scene: 'subduction', mode: 'explore', sceneSignals: { subduction: 1 } } });
    const linked = [...saved.querySelectorAll('[data-geology-story-stage]')].map((b) => b.getAttribute('data-geology-journey-complete'));
    expect(linked).toEqual(['true', 'true', 'false']);
    expect(saved.querySelector('[data-geology-journey-progress]').textContent).toBe('2 of 3 stages linked');
  });

  it('keeps what only the old panels had: the evidence axis, the landmark per stage, Deep Earth science key, and the CER hand-off', () => {
    for (const scene of SCENES) {
      const story = mount(scene, 'explore').querySelector('[data-geology-story]');
      expect(story.querySelector('[data-geology-evidence-axis="' + scene + '"][role="img"]'), scene).not.toBeNull();
      const beacons = P.sceneBeacons(scene);
      for (const b of beacons) expect(story.textContent, scene + ' landmark ' + b.label).toContain(b.label);
      expect(story.querySelector('[data-geology-story-cer]'), scene).not.toBeNull();
    }
    expect(mount('deepEarth', 'explore').querySelector('[data-geology-story] [data-geology-science-key="solid-mantle"]')).not.toBeNull();
    expect(mount('crust', 'explore').querySelector('[data-geology-story] [data-geology-science-key]')).toBeNull();
  });
});
