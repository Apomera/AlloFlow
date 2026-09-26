// Bird Lab visuals and motion: sky, light conditions, habitat art, the menu
// hero, and the animated secondary views (wing planform, Iconic Maine
// vignettes, Field Observation tracking).
//
// The keyframe check exists because `.birdlab-leaf-sway` shipped for months
// naming an animation that was never defined, so the foliage it was applied to
// never moved and no test noticed.
import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = process.env.BIRDLAB_SOURCE || 'stem_lab/stem_tool_birdlab.js';
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

beforeAll(() => {
  resetStemLab();
  loadTool(SOURCE_PATH, 'birdLab');
});

function ispy(habitat, condition) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('birdLab', { birdLab: { view: 'ispy', activeHabitat: habitat, blFieldCondition: condition } });
  return host;
}

function cssRule(selectorStart) {
  const at = source.indexOf("'" + selectorStart);
  expect(at, selectorStart + ' rule').toBeGreaterThan(-1);
  return source.slice(at, source.indexOf('\n', at));
}

describe('Bird Lab animation integrity', () => {
  it('defines a @keyframes block for every animation it names', () => {
    const used = new Set([...source.matchAll(/animation(?:-name)?:\s*['"]?(birdlab-[a-z0-9-]+)/g)].map((m) => m[1]));
    const defined = new Set([...source.matchAll(/@keyframes\s+(birdlab-[a-z0-9-]+)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(40);
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });

  it('sways foliage about its own base, and stops it for reduced motion', () => {
    const rule = cssRule('.birdlab-leaf-sway   {');
    expect(rule).toContain('transform-box: fill-box');
    expect(rule).toContain('transform-origin: bottom center');
    expect(source).toMatch(/prefers-reduced-motion: reduce\)[^\n]*\.birdlab-leaf-sway \{ animation: none !important; \}/);
  });

  it('keeps every new scene ambient slow, pausable and reduced-motion safe', () => {
    for (const name of ['cloud-drift', 'cloud-drift-far', 'star-twinkle', 'firefly', 'surf-wash']) {
      const rule = cssRule('.birdlab-' + name + ' {');
      const seconds = Number((rule.match(/([0-9.]+)s/) || [])[1]);
      expect(seconds, name + ' duration').toBeGreaterThanOrEqual(5);
    }
    // Everything that loops in the scene carries the ambient class, which the
    // motion toggle pauses and reduced motion removes.
    const dusk = ispy('forest', 'dusk');
    for (const el of dusk.querySelectorAll('.birdlab-firefly, .birdlab-star-twinkle, .birdlab-cloud-drift, .birdlab-cloud-drift-far')) {
      expect(el.classList.contains('birdlab-ambient-motion')).toBe(true);
    }
  });
});

describe('Bird Lab sky and light conditions', () => {
  it('draws cumulus at two depths in every habitat', () => {
    for (const habitat of ['forest', 'marsh', 'backyard', 'coast', 'mountain']) {
      const host = ispy(habitat, 'day');
      const layer = host.querySelector('[data-birdlab-cloud-layer="foreground-of-sky"]');
      expect(layer, habitat).toBeTruthy();
      expect(layer.querySelectorAll('[data-birdlab-cloud="far"]').length, habitat + ' far clouds').toBeGreaterThan(0);
      expect(layer.querySelectorAll('[data-birdlab-cloud="near"]').length, habitat + ' near clouds').toBeGreaterThan(0);
      expect(layer.querySelector('.birdlab-cloud-drift-far')).toBeTruthy();
    }
  });

  it('keeps coast clouds out from behind the white-headed eagle and the pale gull', () => {
    const start = source.indexOf('var HABITAT_CLOUD_BANKS = {');
    const coast = source.slice(start, source.indexOf('};', start)).match(/coast:\s*(\[[^\n]+\]),?\n/);
    const banks = JSON.parse(coast[1].replace(/'/g, '"'));
    // Soar loop plus art half-width around the gull at (350, 80); the eagle's
    // head at (800, 83). Cloud extents include their drift.
    const windows = [[300, 460, 45, 120], [770, 830, 55, 110]];
    for (const [x, y, w, hgt, , , depth] of banks) {
      const drift = depth === 'far' ? [-16, 18] : [-34, 38];
      const box = [x + drift[0], x + w + drift[1], y - hgt * 2.2, y];
      for (const win of windows) {
        const overlaps = box[0] < win[1] && box[1] > win[0] && box[2] < win[3] && box[3] > win[2];
        expect(overlaps, 'cloud at ' + x + ',' + y + ' overlaps ' + win).toBe(false);
      }
    }
  });

  it('gives dusk a moon, scintillating stars and an afterglow, and fireflies over land', () => {
    const forest = ispy('forest', 'dusk');
    expect(forest.querySelector('[data-birdlab-moon="crescent"]')).toBeTruthy();
    expect(forest.querySelectorAll('[data-birdlab-dusk-sky] circle').length).toBeGreaterThan(12);
    expect(forest.querySelectorAll('.birdlab-star-twinkle').length).toBeGreaterThan(3);
    expect(forest.querySelector('[fill="url(#blScene-forest-afterglow)"]')).toBeTruthy();
    expect(forest.querySelector('#blScene-forest-afterglow')).toBeTruthy();
    expect(forest.querySelectorAll('[data-birdlab-condition-air="fireflies"] .birdlab-firefly').length).toBeGreaterThan(4);
    // Fireflies are a land-and-marsh summer sight, not an offshore one.
    expect(ispy('coast', 'dusk').querySelector('[data-birdlab-condition-air="fireflies"]')).toBeNull();
    // None of it exists at midday.
    const day = ispy('forest', 'day');
    expect(day.querySelector('[data-birdlab-moon]')).toBeNull();
    expect(day.querySelector('[data-birdlab-condition-air]')).toBeNull();
  });

  it('lays thin drifting mist at dawn, behind every bird layer', () => {
    const marsh = ispy('marsh', 'dawn');
    const mist = marsh.querySelector('[data-birdlab-condition-air="dawn-mist"]');
    expect(mist).toBeTruthy();
    for (const band of mist.querySelectorAll('path')) {
      expect(Number(band.getAttribute('opacity'))).toBeLessThanOrEqual(0.25);
      expect(band.classList.contains('birdlab-mist-drift')).toBe(true);
    }
    const svg = marsh.querySelector('svg[data-birdlab-realistic-scene]');
    const kids = [...svg.children];
    const mistIndex = kids.indexOf(mist);
    const firstBird = kids.findIndex((el) => el.matches('[class*="birdlab-scene-subject"]') || !!el.querySelector('[class*="birdlab-scene-subject"]'));
    expect(mistIndex).toBeGreaterThan(-1);
    expect(firstBird).toBeGreaterThan(-1);
    expect(mistIndex).toBeLessThan(firstBird);
  });

  it('warms cloud bases and lights windows and the lighthouse by condition, in CSS', () => {
    expect(source).toContain('.birdlab-scene-card[data-birdlab-condition="dusk"] .birdlab-cloud-shade');
    expect(source).toContain('.birdlab-scene-card[data-birdlab-condition="dusk"] .birdlab-yard-window');
    expect(source).toContain('.birdlab-scene-card[data-birdlab-condition="dusk"] .birdlab-lighthouse-lamp');
    expect(ispy('backyard', 'day').querySelectorAll('.birdlab-yard-window').length).toBeGreaterThanOrEqual(4);
    expect(ispy('coast', 'day').querySelector('[data-birdlab-coast="lighthouse"] .birdlab-lighthouse-lamp')).toBeTruthy();
  });
});

describe('Bird Lab habitat art', () => {
  it('draws the mountain as two shaded, snow-capped ranges over a fall foothill', () => {
    const host = ispy('mountain', 'day');
    const ranges = host.querySelector('[data-birdlab-mountain-ranges="two"]');
    expect(ranges).toBeTruthy();
    expect(ranges.children.length).toBe(2);
    expect(host.querySelectorAll('[data-birdlab-fall-color="hardwoods"] path').length).toBeGreaterThan(20);
    expect(host.querySelector('[data-birdlab-fall-color="blueberry"]')).toBeTruthy();
    // The old three flat white triangles are gone.
    expect(source).not.toContain("h('path', { d: 'M 290 195 L 320 180 L 350 195', fill: '#fff' })");
    // The pileated woodpecker still has its trunk to brace on.
    expect(host.querySelector('[data-birdlab-trunk-anchor="mountain-pileated"]')).toBeTruthy();
  });

  it('adds floor, garden, island and water detail without moving any perch', () => {
    expect(ispy('forest', 'day').querySelectorAll('[data-birdlab-forest-floor="fern"]').length).toBe(2);
    expect(ispy('forest', 'day').querySelector('[data-birdlab-forest-floor="log"]')).toBeTruthy();
    expect(ispy('backyard', 'day').querySelector('[data-birdlab-yard="flower-border"]')).toBeTruthy();
    expect(ispy('marsh', 'day').querySelectorAll('[data-birdlab-marsh="lily"]').length).toBe(3);
    // Perch coordinates the birds are placed against.
    for (const perch of ["species: 'pileated',    x: 60,  y: 200", "species: 'nuthatch',    x: 760, y: 180", "species: 'baldEagle', x: 800, y: 83", "species: 'junco', x: 450, y: 362"]) {
      expect(source).toContain(perch);
    }
  });
});

describe('Bird Lab animated views', () => {
  it('flies the menu hero, and holds it still for reduced motion', () => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', { birdLab: { view: 'menu' } });
    expect(host.querySelectorAll('[data-birdlab-hero-flock] .birdlab-hero-flyer .birdlab-hero-flap').length).toBe(7);
    expect(host.querySelector('.birdlab-hero-skein')).toBeTruthy();
    expect(host.querySelector('[data-birdlab-hero-singer]')).toBeTruthy();
    expect(source).toMatch(/prefers-reduced-motion: reduce\) \{ \.birdlab-hero-flyer, \.birdlab-hero-flap, \.birdlab-track-flap, \.birdlab-hero-skein[^}]*animation: none !important/);
  });

  it('draws a wing planform whose shape follows the sliders', () => {
    const planform = (wingHunt) => {
      const host = document.createElement('div');
      host.innerHTML = renderTool('birdLab', { birdLab: { view: 'wingHunt', wingHunt } });
      return host.querySelector('[data-birdlab-wing-planform]');
    };
    const soarer = planform({ wingArea: 10, mass: 60, ar: 16 });
    expect(soarer.getAttribute('data-birdlab-wing-planform')).toBe('soarer');
    expect(soarer.querySelector('.birdlab-wh-glide')).toBeTruthy();
    expect(soarer.querySelector('svg').getAttribute('aria-label')).toContain('pointed tips');
    const broad = planform({ wingArea: 6, mass: 400, ar: 3.5 });
    expect(broad.querySelector('svg').getAttribute('aria-label')).toContain('slotted tips');
    // span = sqrt(AR x area): 12.6 for the soarer, 4.6 for the broad wing.
    expect(soarer.textContent).toContain('span 12.6');
    expect(broad.textContent).toContain('span 4.6');
    expect(source).toMatch(/prefers-reduced-motion: reduce\) \{ \.birdlab-wh-body, \.birdlab-wh-wings, \.birdlab-wh-thermal, \.birdlab-wh-streaks/);
  });

  it('sets each iconic Maine bird in its own scene', () => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('birdLab', { birdLab: { view: 'iconic' } });
    const scene = host.querySelector('[data-birdlab-iconic-scene]');
    expect(scene.getAttribute('data-birdlab-iconic-scene')).toBe('Black-capped Chickadee');
    expect(scene.querySelector('svg[data-bird-art="chickadee"]')).toBeTruthy();
    const namesStart = source.indexOf('var ICONIC_MAINE = [');
    const names = [...source.slice(namesStart, source.indexOf('\n  ];', namesStart)).matchAll(/\{ name: '([^']+)'/g)].map((m) => m[1].replace(/\s*\(.*\)\s*$/, ''));
    expect(names).toHaveLength(10);
    const scenesStart = source.indexOf('var ICONIC_SCENES = {');
    const scenes = source.slice(scenesStart, source.indexOf('};', scenesStart));
    for (const name of names) expect(scenes, name).toContain("'" + name + "':");
  });

  it('tracks the chosen species, calmly under reduced motion', () => {
    expect(source).toContain("'data-birdlab-track-art': sessionBird.speciesKey");
    expect(source).toMatch(/var calm = !!\(window\.matchMedia && window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\);/);
    expect(source).toContain('b.dartCdMs -= calm ? 0 : dt;');
  });
});
