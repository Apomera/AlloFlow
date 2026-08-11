import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Allow for intermittent OneDrive scanning while the large astronomy widget is evaluated.
vi.setConfig({ testTimeout: 15000 });

const SOURCE_PATH = 'stem_lab/stem_tool_astronomy.js';
const COLOR_ASSET_PATH = 'stem_lab/assets/astronomy/moon-lroc-color-2k.jpg';
const HEIGHT_ASSET_PATH = 'stem_lab/assets/astronomy/moon-lola-height-1k.jpg';

function renderAstronomy(state) {
  return renderTool('astronomy', {
    astronomy: Object.assign({ observingList: [] }, state || {})
  });
}

function parseMarkup(html) {
  return new window.DOMParser().parseFromString(html, 'text/html');
}

function buttonByText(root, text) {
  return Array.from(root.querySelectorAll('button')).find(function(button) {
    return button.textContent.trim() === text;
  });
}

function viewButton(group, label) {
  return Array.from(group.children).find(function(child) {
    var heading = child.querySelector && child.querySelector('span');
    return child.tagName === 'BUTTON' && heading && heading.textContent.trim() === label;
  });
}

function expectCleanMarkup(html) {
  expect(html).not.toContain('NaN');
  expect(html).not.toContain('Infinity');
  expect(html).not.toContain('[object Object]');
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  var offset = 2;
  var startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    var marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
    if (offset + 2 > buffer.length) break;
    var segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (startOfFrame.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }
    offset += segmentLength;
  }
  return null;
}

let astronomy;

beforeEach(() => {
  if (window.__alloAstronomyMoonTimer) clearTimeout(window.__alloAstronomyMoonTimer);
  window.__alloAstronomyMoonTimer = null;
  delete window.__alloAstroPure;
  resetStemLab();
  loadTool(SOURCE_PATH, 'astronomy');
  astronomy = window.__alloAstroPure;
});

afterEach(() => {
  if (window.__alloAstronomyMoonTimer) clearTimeout(window.__alloAstronomyMoonTimer);
  window.__alloAstronomyMoonTimer = null;
});

describe('Astronomy Moon Phase Observatory', () => {
  it('maps the continuous synodic month to the eight named phase anchors', () => {
    expect(astronomy).toBeTruthy();
    expect(astronomy.AM_SYNODIC).toBeCloseTo(29.53059, 5);

    var cycle = astronomy.AM_SYNODIC;
    var anchors = [
      { fraction: 0, name: 'New Moon', illumination: 0, pct: 0 },
      { fraction: 1 / 8, name: 'Waxing Crescent', illumination: 0.1464466, pct: 15 },
      { fraction: 1 / 4, name: 'First Quarter', illumination: 0.5, pct: 50 },
      { fraction: 3 / 8, name: 'Waxing Gibbous', illumination: 0.8535534, pct: 85 },
      { fraction: 1 / 2, name: 'Full Moon', illumination: 1, pct: 100 },
      { fraction: 5 / 8, name: 'Waning Gibbous', illumination: 0.8535534, pct: 85 },
      { fraction: 3 / 4, name: 'Last Quarter', illumination: 0.5, pct: 50 },
      { fraction: 7 / 8, name: 'Waning Crescent', illumination: 0.1464466, pct: 15 },
      { fraction: 1, name: 'New Moon', illumination: 0, pct: 0 }
    ];

    anchors.forEach(function(anchor) {
      var phase = astronomy.moonPhaseFromAge(cycle * anchor.fraction);
      expect(phase.name).toBe(anchor.name);
      expect(phase.illumination).toBeCloseTo(anchor.illumination, 5);
      expect(phase.illum).toBeCloseTo(anchor.illumination, 5);
      expect(phase.pct).toBe(anchor.pct);
      expect(phase.angleDeg).toBeCloseTo(anchor.fraction * 360, 5);
      expect(Number.isFinite(phase.ageDays)).toBe(true);
    });
  });

  it('clamps the pure continuous model to its supported 0-29.53 day interval', () => {
    var cycle = astronomy.AM_SYNODIC;
    expect(astronomy.moonPhaseFromAge(-4).ageDays).toBe(0);
    expect(astronomy.moonPhaseFromAge(cycle + 4).ageDays).toBe(cycle);
    expect(astronomy.moonPhaseFromAge({ forged: true }).ageDays).toBe(0);
  });

  it('migrates a legacy phase index to the matching continuous lunar age', () => {
    var html = renderAstronomy({ tab: 'moon', moonPhaseIdx: 4 });
    expectCleanMarkup(html);
    var document = parseMarkup(html);
    var slider = document.querySelector('#astronomy-moon-age');

    expect(Number(slider.value)).toBeCloseTo(astronomy.AM_SYNODIC / 2, 1);
    expect(document.querySelector('#astronomy-moon-phase-status').textContent).toContain('Full Moon');
    expect(document.querySelector('#astronomy-moon-phase-status').textContent).toContain('100% illuminated');
  });

  it('recovers malformed Observatory state with Telescope view and safe overlay defaults', () => {
    var html = renderAstronomy({
      tab: 'moon',
      moonAgeDays: { forged: true },
      moonPhaseIdx: 6,
      moonViewMode: 'spaceship',
      moonScaleMode: { forged: true },
      moonOverlays: {
        orbit: 'false',
        sunlight: 0,
        shadow: null,
        labels: { forged: true },
        tidalLock: false
      },
      moonNodeDeg: Number.POSITIVE_INFINITY,
      moonRot: { rotY: Number.NaN, rotX: { forged: true } },
      moonZoom: 'forged'
    });
    expectCleanMarkup(html);
    var document = parseMarkup(html);
    var viewGroup = document.querySelector('[role="group"][aria-label="Moon visualizer view"]');
    var overlayGroup = document.querySelector('[role="group"][aria-label="Diagram overlays"]');

    expect(Number(document.querySelector('#astronomy-moon-age').value)).toBeCloseTo(astronomy.AM_SYNODIC * 3 / 4, 1);
    expect(viewButton(viewGroup, 'Telescope view').getAttribute('aria-pressed')).toBe('true');
    expect(viewButton(viewGroup, 'Orbit view').getAttribute('aria-pressed')).toBe('false');
    expect(buttonByText(overlayGroup, 'Orbit path').getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(overlayGroup, 'Sunlight').getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(overlayGroup, "Earth's shadow").getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(overlayGroup, 'Labels').getAttribute('aria-pressed')).toBe('true');
    expect(buttonByText(overlayGroup, 'Tidal-lock marker').getAttribute('aria-pressed')).toBe('false');
  });

  it('clamps persisted lunar ages at both ends of the slider', () => {
    var below = parseMarkup(renderAstronomy({ tab: 'moon', moonAgeDays: -100 }));
    var above = parseMarkup(renderAstronomy({ tab: 'moon', moonAgeDays: 100 }));
    expect(below.querySelector('#astronomy-moon-age').value).toBe('0');
    expect(Number(above.querySelector('#astronomy-moon-age').value)).toBeCloseTo(29.53, 2);
  });

  it('renders a true 0-29.53 day slider with a continuous accessible readout', () => {
    var age = astronomy.AM_SYNODIC / 8;
    var document = parseMarkup(renderAstronomy({ tab: 'moon', moonAgeDays: age }));
    var slider = document.querySelector('#astronomy-moon-age');

    expect(slider).toBeTruthy();
    expect(slider.type).toBe('range');
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('29.53');
    expect(slider.step).toBe('0.01');
    expect(Number(slider.value)).toBeCloseTo(3.69, 2);
    expect(slider.getAttribute('aria-label')).toBe('Lunar age through the synodic month');
    expect(slider.getAttribute('aria-valuetext')).toBe('Waxing Crescent, about 15% illuminated, day 3.69 of 29.53');
    expect(slider.getAttribute('aria-describedby')).toBe('astronomy-moon-phase-status');
  });

  it('uses named, mutually exclusive view controls and five independent overlay toggles', () => {
    var document = parseMarkup(renderAstronomy({
      tab: 'moon',
      moonViewMode: 'orbit',
      moonOverlays: { orbit: false, sunlight: true, shadow: false, labels: true, tidalLock: false }
    }));
    var viewGroup = document.querySelector('[role="group"][aria-label="Moon visualizer view"]');
    var overlayGroup = document.querySelector('[role="group"][aria-label="Diagram overlays"]');

    expect(viewGroup).toBeTruthy();
    expect(Array.from(viewGroup.children).filter(function(node) { return node.tagName === 'BUTTON'; })).toHaveLength(2);
    expect(viewButton(viewGroup, 'Telescope view').getAttribute('aria-pressed')).toBe('false');
    expect(viewButton(viewGroup, 'Orbit view').getAttribute('aria-pressed')).toBe('true');

    var expected = new Map([
      ['Orbit path', 'false'],
      ['Sunlight', 'true'],
      ["Earth's shadow", 'false'],
      ['Labels', 'true'],
      ['Tidal-lock marker', 'false']
    ]);
    var overlayButtons = Array.from(overlayGroup.querySelectorAll('button'));
    expect(overlayButtons).toHaveLength(5);
    overlayButtons.forEach(function(button) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-pressed')).toBe(expected.get(button.textContent.trim()));
    });
  });

  it('bundles substantive NASA LROC and LOLA texture assets and wires their provenance', () => {
    var source = readFileSync(resolve(process.cwd(), SOURCE_PATH), 'utf8');
    var colorAsset = readFileSync(resolve(process.cwd(), COLOR_ASSET_PATH));
    var heightAsset = readFileSync(resolve(process.cwd(), HEIGHT_ASSET_PATH));
    var colorSize = jpegDimensions(colorAsset);
    var heightSize = jpegDimensions(heightAsset);

    expect(source).toContain("'assets/astronomy/moon-lroc-color-2k.jpg'");
    expect(source).toContain("'assets/astronomy/moon-lola-height-1k.jpg'");
    expect(source).toContain('loadOne(AM_MOON_COLOR_ASSET');
    expect(source).toContain('loadOne(AM_MOON_HEIGHT_ASSET');
    expect(source).toContain('map: S.moonTextures.color || null');
    expect(source).toContain('bumpMap: S.moonTextures.height || null');
    expect(source).toContain('surfaceTextureReady');
    expect(source).toContain('reliefTextureReady');

    expect(colorAsset.length).toBeGreaterThan(250_000);
    expect(heightAsset.length).toBeGreaterThan(75_000);
    expect(colorSize).toEqual({ width: 2048, height: 1024 });
    expect(heightSize).toEqual({ width: 1024, height: 512 });

    var document = parseMarkup(renderAstronomy({ tab: 'moon' }));
    var sourceLink = document.querySelector('a[href="https://svs.gsfc.nasa.gov/4720"]');
    expect(sourceLink).toBeTruthy();
    expect(sourceLink.textContent).toBe('NASA Scientific Visualization Studio LRO/LOLA data');
    expect(sourceLink.getAttribute('target')).toBe('_blank');
    expect(sourceLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps a continuous, responsive SVG fallback available while WebGL loads', () => {
    var source = readFileSync(resolve(process.cwd(), SOURCE_PATH), 'utf8');
    var document = parseMarkup(renderAstronomy({
      tab: 'moon', moonAgeDays: astronomy.AM_SYNODIC / 8
    }));
    var fallback = document.querySelector('svg[aria-labelledby="moonSvgTitle moonSvgDesc"]');

    expect(fallback).toBeTruthy();
    expect(fallback.getAttribute('viewBox')).toBe('-100 -100 200 200');
    expect(Number(fallback.getAttribute('width'))).toBeLessThanOrEqual(150);
    expect(document.querySelector('#moonSvgTitle').textContent).toBe('Waxing Crescent phase');
    expect(document.querySelector('#moonSvgDesc').textContent).toContain('approximately 15% illumination');
    expect(document.querySelector('#moonSvgDesc').textContent).toContain('right, waxing side');
    expect(document.body.textContent).toContain('Loading Moon Phase Observatory');
    expect(source).toContain('3D view unavailable on this device - the continuous phase disc below remains available.');
    expect(source).toContain("height: 'clamp(300px, 52vw, 430px)'");
    expect(source).toContain("gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,120px),1fr))'");
    expect(source).toContain("gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))'");
  });

  it('publishes complete Telescope and Orbit accessibility contracts', () => {
    var telescope = parseMarkup(renderAstronomy({ tab: 'moon', moonAgeDays: 0 }));
    var telescopeView = telescope.querySelector('[data-a11y-static="true"]');
    var telescopeStatus = telescope.querySelector('#astronomy-moon-phase-status');
    var jumpGroup = telescope.querySelector('[role="group"][aria-label="Jump to a principal Moon phase"]');

    expect(telescopeView.getAttribute('role')).toBe('img');
    expect(telescopeView.getAttribute('tabindex')).toBe('0');
    expect(telescopeView.classList.contains('astr-focus')).toBe(true);
    expect(telescopeView.getAttribute('aria-label')).toContain('Telescope view of the NASA LRO-textured Moon at New Moon');
    expect(telescopeView.getAttribute('aria-label')).toContain('Use plus and minus or the mouse wheel to magnify');
    expect(telescopeView.getAttribute('aria-describedby')).toBe('astronomy-moon-3d-help');
    expect(telescopeView.getAttribute('aria-keyshortcuts')).toBe('+ - Home');
    expect(telescope.querySelector('#astronomy-moon-3d-help').textContent).toContain('NASA LRO imagery and LOLA elevation data');

    expect(telescopeStatus.getAttribute('role')).toBe('status');
    expect(telescopeStatus.getAttribute('aria-live')).toBe('polite');
    expect(telescopeStatus.getAttribute('aria-atomic')).toBe('true');
    expect(jumpGroup.querySelectorAll('button')).toHaveLength(4);
    expect(jumpGroup.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);

    ['Now', 'Play cycle', 'Reset view'].forEach(function(label) {
      var button = buttonByText(telescope, label);
      expect(button).toBeTruthy();
      expect(button.type).toBe('button');
    });
    expect(buttonByText(telescope, 'Play cycle').getAttribute('aria-pressed')).toBe('false');
    expect(buttonByText(telescope, 'North up').getAttribute('aria-pressed')).toBe('true');

    var orbit = parseMarkup(renderAstronomy({ tab: 'moon', moonViewMode: 'orbit' }));
    var orbitView = orbit.querySelector('[data-a11y-static="true"]');
    expect(orbitView.getAttribute('aria-label')).toContain('Sun, Earth and Moon in orbit view');
    expect(orbitView.getAttribute('aria-label')).toContain('Use arrow keys or drag to orbit');
    expect(orbitView.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown + - Home');
    expect(orbit.querySelector('#astronomy-moon-3d-help').textContent).toContain('Diagram distances are compressed unless True scale is selected');
    expect(buttonByText(orbit, 'North up')).toBeUndefined();
    expect(orbit.querySelector('[role="group"][aria-label="Moon diagram scale"]')).toBeTruthy();
    expect(orbit.querySelector('#astronomy-moon-nodes')).toBeTruthy();
  });

  it('classifies central and missed lunar eclipses with true physical proportions', () => {
    var full = astronomy.AM_SYNODIC / 2;

    expect(astronomy.amEclipseState(full, 0).stage).toBe('total');
    expect(astronomy.amEclipseState(full - 0.07, 0).stage).toBe('partial');
    expect(astronomy.amEclipseState(full - 0.11, 0).stage).toBe('penumbral');
    expect(astronomy.amEclipseState(full, 72).stage).toBe('clear');
    expect(astronomy.amEclipseState(astronomy.AM_SYNODIC / 4, 0).stage).toBe('not-full');
  });

  it('renders seven keyboard-accessible eclipse contacts and labeled shadow regions', () => {
    var full = astronomy.AM_SYNODIC / 2;
    var document = parseMarkup(renderAstronomy({
      tab: 'moon', moonViewMode: 'orbit', moonAgeDays: full, moonNodeDeg: 0
    }));
    var panel = document.querySelector('#astronomy-eclipse-explainer');
    var contacts = panel.querySelector('[role="group"][aria-label="Lunar eclipse contact stages"]');

    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Total lunar eclipse');
    expect(panel.textContent).toContain("completely inside Earth's dark umbra");
    expect(panel.textContent).toContain('P Â· faint outer shadow');
    expect(panel.textContent).toContain('U Â· dark central shadow');
    expect(contacts.querySelectorAll('button')).toHaveLength(7);
    expect(contacts.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
    expect(contacts.querySelector('button[aria-label="MAX, Greatest eclipse"]')).toBeTruthy();

    var source = readFileSync(resolve(process.cwd(), SOURCE_PATH), 'utf8');
    expect(source).toContain('new THREE.CylinderGeometry(2, 1.02, umbraLen');
    expect(source).toContain("'Earth\\'s penumbra'");
    expect(source).toContain('penumbraWidensAwayFromEarth');
  });
});
