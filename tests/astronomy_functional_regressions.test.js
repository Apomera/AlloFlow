import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_astronomy.js';

function renderAstronomy(state, overrides) {
  return renderTool('astronomy', {
    astronomy: Object.assign({ observingList: [] }, state || {})
  }, overrides);
}

function parseMarkup(html) {
  return new window.DOMParser().parseFromString(html, 'text/html');
}

function expectCleanMarkup(html) {
  expect(html).not.toContain('NaN');
  expect(html).not.toContain('Infinity');
  expect(html).not.toContain('[object Object]');
}

function colorChannels(color) {
  var value = String(color || '').trim().toLowerCase();
  var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    var digits = hex[1].length === 3
      ? hex[1].split('').map(function(digit) { return digit + digit; }).join('')
      : hex[1];
    return [0, 2, 4].map(function(offset) { return parseInt(digits.slice(offset, offset + 2), 16); });
  }
  var rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  throw new Error('Unsupported inline color: ' + color);
}

function relativeLuminance(color) {
  var channels = colorChannels(color).map(function(channel) {
    var normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  var foregroundLuminance = relativeLuminance(foreground);
  var backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function inputByLabel(document, label) {
  return Array.from(document.querySelectorAll('input, textarea, select')).find(function(control) {
    return control.getAttribute('aria-label') === label;
  });
}

function buttonByText(document, text) {
  return Array.from(document.querySelectorAll('button')).find(function(button) {
    return button.textContent.trim() === text;
  });
}

function cardText(document, label) {
  var labelNode = Array.from(document.querySelectorAll('div')).find(function(node) {
    return node.children.length === 0 && node.textContent.trim() === label;
  });
  return labelNode && labelNode.parentElement ? labelNode.parentElement.textContent : '';
}

function lightCurveSpread(document, ariaLabel) {
  var svg = Array.from(document.querySelectorAll('svg[aria-label]')).find(function(node) {
    return node.getAttribute('aria-label') === ariaLabel;
  });
  expect(svg).toBeTruthy();
  var points = svg.querySelector('polyline').getAttribute('points').trim().split(/\s+/).map(function(point) {
    return Number(point.split(',')[1]);
  });
  return Math.max.apply(Math, points) - Math.min.apply(Math, points);
}

beforeEach(() => {
  window.__alloAstronomyAiPending = null;
  window.__alloAstronomyEclipseTimer = null;
  window.__alloAstronomyMeteorTimer = null;
  resetStemLab();
  loadTool(SOURCE_PATH, 'astronomy');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Astronomy malformed persisted-state regressions', () => {
  it('recovers malformed constellation search, filter, selection, and observing-list state', () => {
    var html;
    expect(() => {
      html = renderAstronomy({
        tab: 'constellations',
        constellationSearch: { forged: true },
        constellationFilter: { forged: true },
        selectedConstellation: { forged: true },
        observingList: { forged: true }
      });
    }).not.toThrow();

    expectCleanMarkup(html);
    var document = parseMarkup(html);
    expect(inputByLabel(document, 'Search constellations').value).toBe('');
    expect(buttonByText(document, 'All 88').getAttribute('aria-pressed')).toBe('true');
    expect(document.body.textContent).toContain('Showing 88 constellations');
  });

  it('recovers malformed star selection, Doppler, search, constellation, and distance state', () => {
    var html;
    expect(() => {
      html = renderAstronomy({
        tab: 'stars',
        selectedStarType: { forged: true },
        spectrumType: 'continuous',
        dopplerKms: { forged: true },
        starsSearch: { forged: true },
        starsConstellation: { forged: true },
        starsMaxDist: Number.POSITIVE_INFINITY
      });
    }).not.toThrow();

    expectCleanMarkup(html);
    var document = parseMarkup(html);
    var gType = document.querySelector('button[aria-label^="Select G-type"]');
    expect(gType).toBeTruthy();
    expect(gType.getAttribute('aria-pressed')).toBe('true');
    var doppler = inputByLabel(document, 'Doppler radial velocity in km/s');
    expect(doppler.value).toBe('0');
    expect(doppler.getAttribute('aria-valuetext')).toBe('At rest: no Doppler shift');
    expect(inputByLabel(document, 'Search stars').value).toBe('');
    expect(document.querySelector('#astr-stars-dist').value).toBe('10000');
  });

  it('recovers malformed exoplanet transit and Drake-equation controls', () => {
    var html;
    expect(() => {
      html = renderAstronomy({
        tab: 'exoplanets',
        selectedExoplanet: { forged: true },
        transitPlanetR: { forged: true },
        transitStarR: Number.POSITIVE_INFINITY,
        transitImpact: Number.NaN,
        transitTime: false,
        drakeFp: { forged: true },
        drakeNe: Number.NEGATIVE_INFINITY,
        drakeFl: Number.NaN,
        drakeFi: 'forged',
        drakeFc: false,
        drakeL: { forged: true }
      });
    }).not.toThrow();

    expectCleanMarkup(html);
    var document = parseMarkup(html);
    expect(inputByLabel(document, 'Planet size (Earth radii)').value).toBe('1');
    expect(inputByLabel(document, 'Star size (Sun radii)').value).toBe('1');
    expect(inputByLabel(document, 'Transit position').value).toBe('0.5');
    expect(inputByLabel(document, 'Impact parameter (0=center, 1=grazing)').value).toBe('0');
    expect(document.body.textContent).toContain('Full transit: the planet disc passes completely across the star.');
  });

  it('recovers malformed Moon phase, node, rotation, and zoom state', () => {
    var html;
    expect(() => {
      html = renderAstronomy({
        tab: 'moon',
        moonPhaseIdx: { forged: true },
        moonAgeDays: { forged: true },
        moonViewMode: 'orbit',
        moonNodeDeg: Number.POSITIVE_INFINITY,
        moonRot: { rotY: Number.NaN, rotX: { forged: true } },
        moonZoom: 'forged',
        moonOverlays: { orbit: { forged: true }, shadow: 'forged' }
      });
    }).not.toThrow();

    expectCleanMarkup(html);
    var document = parseMarkup(html);
    var nodeSlider = inputByLabel(document, 'Line of nodes angle, which controls eclipse seasons');
    expect(nodeSlider.value).toBe('72');
    expect(document.querySelector('#astronomy-moon-age').value).toBe('0');
    expect(document.querySelector('[data-a11y-static="true"]').getAttribute('aria-label')).toContain('Sun, Earth and Moon in orbit view');
    expect(document.body.textContent).toContain('New Moon');
  });

  it('recovers malformed observing optics, target, and glossary state', () => {
    var html;
    expect(() => {
      html = renderAstronomy({
        tab: 'observe',
        scopeType: { forged: true },
        scopeAperture: Number.NaN,
        scopeFocalLen: Number.POSITIVE_INFINITY,
        eyepieceFl: { forged: true },
        eyepieceTarget: { forged: true },
        eyApertureMm: Number.NaN,
        eyFocalMm: Number.POSITIVE_INFINITY,
        eyEpFlMm: { forged: true },
        eyEpField: 'forged',
        eySeeing: { forged: true },
        eyBortle: Number.NEGATIVE_INFINITY,
        glossarySearch: { forged: true },
        glossaryCategory: { forged: true }
      });
    }).not.toThrow();

    expectCleanMarkup(html);
    var document = parseMarkup(html);
    expect(document.querySelector('#astr-ey-ap').value).toBe('150');
    expect(document.querySelector('#astr-ey-ep').value).toBe('25');
    expect(document.querySelector('#astr-ey-fld').value).toBe('60');
    expect(document.querySelector('#astr-ey-bort').value).toBe('4');
    expect(inputByLabel(document, 'Search glossary').value).toBe('');
    expect(inputByLabel(document, 'Filter glossary by category').value).toBe('all');
    var targetGroup = document.querySelector('[role="group"][aria-label="Observing targets"]');
    expect(targetGroup).toBeTruthy();
    expect(buttonByText(document, 'Orion Nebula (M42)').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Astronomy transit geometry regressions', () => {
  function transitDocument(impact) {
    return parseMarkup(renderAstronomy({
      tab: 'exoplanets',
      transitPlanetR: 11,
      transitStarR: 1,
      transitImpact: impact,
      transitTime: 0.5
    }));
  }

  it('models a central Jupiter-size transit as a full, detectable dip', () => {
    var document = transitDocument(0);
    expect(document.body.textContent).toContain('Full transit: the planet disc passes completely across the star.');
    expect(lightCurveSpread(document, 'Light curve showing brightness dips during transits')).toBeGreaterThan(0);
    expect(cardText(document, 'Naked eye')).toContain('✓ visible');
    expect(cardText(document, 'Ground telescope')).toContain('✓ detectable');
    expect(cardText(document, 'Kepler space telescope')).toContain('✓ detectable');
  });

  it('models a grazing transit as a shallower partial crossing with impact-adjusted detectability', () => {
    var document = transitDocument(1);
    expect(document.body.textContent).toContain('Grazing transit: only part of the planet crosses the star disc.');
    expect(lightCurveSpread(document, 'Light curve showing shallow grazing-transit dips')).toBeGreaterThan(0);
    expect(cardText(document, 'Naked eye')).toContain('✗ undetectable');
    expect(cardText(document, 'Ground telescope')).toContain('✓ detectable');
    expect(cardText(document, 'Kepler space telescope')).toContain('✓ detectable');
  });

  it('keeps a missed transit flat and marks every detector as unavailable', () => {
    var document = transitDocument(1.2);
    expect(document.body.textContent).toContain('No transit: the planet passes outside the star disc.');
    expect(document.body.textContent).toContain('No transit at this impact parameter');
    expect(lightCurveSpread(document, 'Flat light curve: the orbital path misses the star')).toBe(0);
    expect(cardText(document, 'Modeled transit depth')).toContain('0.0000 %');
    expect(cardText(document, 'Naked eye')).toContain('✗ undetectable');
    expect(cardText(document, 'Ground telescope')).toContain('✗ too small');
    expect(cardText(document, 'Kepler space telescope')).toContain('✗ below precision');
  });
});

describe('Astronomy location and theme contracts', () => {
  it('formats the selected location caption in that location timezone', () => {
    vi.useFakeTimers();
    var instant = new Date('2026-01-15T12:00:00.000Z');
    vi.setSystemTime(instant);

    var html = renderAstronomy({ tab: 'skymap', skyLoc: 'sydney', skyHourOffset: 0, skyDayOffset: 0 });
    var expectedLocal = instant.toLocaleString(undefined, {
      timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: '2-digit'
    });
    expect(parseMarkup(html).body.textContent).toContain(expectedLocal + ' · Sydney · S. hemisphere');
  });

  it('pins every selectable location to an IANA timezone in the source contract', () => {
    var source = readFileSync(SOURCE_PATH, 'utf8');
    [
      "timeZone: 'America/New_York'",
      "timeZone: 'America/Los_Angeles'",
      "timeZone: 'Europe/London'",
      "timeZone: 'America/Guayaquil'",
      "timeZone: 'Australia/Sydney'",
      'timeZone: loc.timeZone'
    ].forEach(function(contract) {
      expect(source).toContain(contract);
    });
  });

  it('uses an explicit night root even when the host reports a light theme', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'tonight' }, { theme: 'light', isContrast: false }));
    var root = document.querySelector('.selh-astronomy');
    expect(root.getAttribute('data-astronomy-theme')).toBe('night');
    expect(root.style.getPropertyValue('--allo-stem-canvas')).toBe('#0f172a');
    expect(root.style.getPropertyValue('--allo-stem-panel')).toBe('#1e293b');
    expect(root.style.getPropertyValue('--allo-stem-text')).toBe('#e2e8f0');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('keeps contrast print-preview overrides screen-only while printed output stays white and dark', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'print' }, { theme: 'contrast', isContrast: true }));
    var root = document.querySelector('.selh-astronomy');
    expect(root.getAttribute('data-astronomy-theme')).toBe('contrast');
    expect(root.style.getPropertyValue('--allo-stem-canvas')).toBe('#000000');
    expect(root.style.getPropertyValue('--allo-stem-panel')).toBe('#000000');
    expect(root.style.getPropertyValue('--allo-stem-text')).toBe('#ffff00');
    expect(root.style.getPropertyValue('--allo-stem-border')).toBe('#fbbf24');
    var styles = Array.from(document.querySelectorAll('style')).map(function(style) { return style.textContent; });
    var screenCss = styles.find(function(css) { return css.indexOf('@media screen') !== -1; });
    var printCss = styles.find(function(css) { return css.indexOf('@media print') !== -1; });
    expect(screenCss).toContain('@media screen{.selh-astronomy[data-astronomy-theme="contrast"] #astro-print-region{background:#000!important;color:#fff!important;border-color:#fbbf24!important}');
    expect(screenCss).toContain(':is(button,input,textarea,select)');
    expect(printCss).toContain('#astro-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; }');
    expect(printCss).toContain('#astro-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; }');
  });
});

describe('Astronomy foreground contrast regressions', () => {
  it('keeps all five H-R category labels AA-readable and the command metrics on an opaque gradient', () => {
    var categories = [
      { label: 'Red dwarf', tempK: 3500, lumin: 0.1 },
      { label: 'Sun-like', tempK: 5800, lumin: 1 },
      { label: 'Red giant', tempK: 4000, lumin: 100 },
      { label: 'Supergiant', tempK: 12000, lumin: 10000 },
      { label: 'Main sequence', tempK: 10000, lumin: 100 }
    ];

    categories.forEach(function(category) {
      var document = parseMarkup(renderAstronomy({
        tab: 'hrDiagram',
        hrHunt: { mass: 1, tempK: category.tempK, lumin: category.lumin }
      }));
      var card = document.querySelector('#astronomy-hr-classification');
      var label = card.firstElementChild;
      var foreground = label.style.getPropertyValue('color');
      var background = card.style.getPropertyValue('background-color') || card.style.getPropertyValue('background');
      expect(label.textContent).toContain(category.label);
      expect(contrastRatio(foreground, background), category.label + ' classification contrast').toBeGreaterThanOrEqual(4.5);
    });

    var document = parseMarkup(renderAstronomy({ tab: 'hrDiagram' }));
    var command = document.querySelector('[data-astronomy-command="true"]');
    expect(command.style.getPropertyValue('background')).toContain('linear-gradient');
    expect(command.style.getPropertyValue('background')).not.toMatch(/rgba\(/i);
    var metricLabels = Array.from(document.querySelector('[aria-label="Astronomy learning progress"]').children)
      .map(function(metric) { return metric.lastElementChild; });
    expect(metricLabels).toHaveLength(3);
    metricLabels.forEach(function(label) {
      expect(colorChannels(label.style.getPropertyValue('color'))).toEqual([203, 213, 225]);
    });
  });
});

describe('Astronomy semantics and reflow source contracts', () => {
  it('gives the printable observing kit a document name, safety note, and structured sections', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'print', observingList: ['orion'] }));
    var kit = document.querySelector('#astro-print-region');
    expect(kit.getAttribute('role')).toBe('document');
    expect(kit.getAttribute('aria-labelledby')).toBe('astro-print-title');
    var title = kit.querySelector('#astro-print-title');
    expect(title.tagName).toBe('H2');
    expect(title.textContent).toContain('Night Sky Observing Kit');
    var safety = kit.querySelector('[role="note"][aria-label="Solar observing safety"]');
    expect(safety).toBeTruthy();
    expect(safety.textContent).toContain('ISO 12312-2');
    var headingIds = Array.from(kit.querySelectorAll('h3')).map(function(heading) { return heading.id; });
    expect(headingIds).toEqual([
      'astro-observing-list-heading',
      'astro-seasonal-heading',
      'astro-meteor-heading',
      'astro-darkness-heading',
      'astro-checklist-heading'
    ]);
    var seasonalTable = kit.querySelector('table[aria-labelledby="astro-seasonal-heading"]');
    expect(seasonalTable).toBeTruthy();
    expect(seasonalTable.querySelectorAll('th[scope="col"]')).toHaveLength(2);
  });

  it('keeps the six long-form galaxy tabpanels out of live regions', () => {
    var source = readFileSync(SOURCE_PATH, 'utf8');
    ['dm', 'inf', 'bh', 'gw', 'psr', 'cc'].forEach(function(shortId) {
      var marker = "id: 'astronomy-" + shortId + "-panel'";
      var start = source.indexOf(marker);
      var styleStart = source.indexOf('style:', start);
      expect(start).toBeGreaterThan(-1);
      expect(styleStart).toBeGreaterThan(start);
      var panelAttributes = source.slice(start, styleStart);
      expect(panelAttributes).toContain("role: 'tabpanel'");
      expect(panelAttributes).toContain("'aria-labelledby': 'astronomy-" + shortId + "-tab-' + sel");
      expect(panelAttributes).not.toContain("'aria-live'");
      expect(panelAttributes).not.toContain("'aria-atomic'");
    });
  });

  it('uses named selector groups with explicit pressed state on representative buttons', () => {
    [
      { tab: 'planets', label: 'Planets' },
      { tab: 'exoplanets', label: 'Notable exoplanets' },
      { tab: 'history', label: 'Astronomy historical figures' }
    ].forEach(function(example) {
      var document = parseMarkup(renderAstronomy({ tab: example.tab }));
      var group = document.querySelector('[role="group"][aria-label="' + example.label + '"]');
      expect(group).toBeTruthy();
      var buttons = Array.from(group.querySelectorAll('button'));
      expect(buttons.length).toBeGreaterThan(1);
      expect(buttons.every(function(button) { return button.hasAttribute('aria-pressed'); })).toBe(true);
      expect(buttons.filter(function(button) { return button.getAttribute('aria-pressed') === 'true'; })).toHaveLength(1);
    });

    var source = readFileSync(SOURCE_PATH, 'utf8');
    expect((source.match(/role: 'group', 'aria-label':/g) || []).length).toBeGreaterThanOrEqual(37);
    expect((source.match(/'aria-pressed':/g) || []).length).toBeGreaterThanOrEqual(42);
  });

  it('makes the Moon 3D view focusable and publishes complete keyboard instructions', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'moon' }));
    var view = document.querySelector('[role="img"][aria-describedby="astronomy-moon-3d-help"]');
    expect(view).toBeTruthy();
    expect(view.getAttribute('tabindex')).toBe('0');
    expect(view.classList.contains('astr-focus')).toBe(true);
    expect(view.getAttribute('aria-label')).toContain('Use plus and minus or the mouse wheel to magnify, and Home to reset.');
    expect(view.getAttribute('aria-keyshortcuts')).toBe('+ - Home');
    expect(document.querySelector('#astronomy-moon-3d-help').textContent).toContain('Telescope mode: scroll or plus/minus to magnify; Home resets.');

    var orbitDocument = parseMarkup(renderAstronomy({ tab: 'moon', moonViewMode: 'orbit' }));
    var orbitView = orbitDocument.querySelector('[role="img"][aria-describedby="astronomy-moon-3d-help"]');
    expect(orbitView.getAttribute('aria-label')).toContain('Use arrow keys or drag to orbit');
    expect(orbitView.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown + - Home');
  });

  it('pins the Moon 3D Arrow, zoom, and Home key-handler contract', () => {
    var source = readFileSync(SOURCE_PATH, 'utf8');
    [
      "var allowed = moonViewMode === 'orbit'",
      "if (key === 'Home')",
      'upd({ moonRot: { rotY: 18, rotX: 34 }, moonZoom: 1, moonNorthUp: true });',
      "if (key === '+' || key === '=')",
      'Math.min(3, moonZoom * 1.12)',
      "if (key === '-' || key === '_')",
      'Math.max(0.5, moonZoom * 0.89)',
      "key === 'ArrowLeft' ? -10 : key === 'ArrowRight' ? 10 : 0",
      "key === 'ArrowUp' ? -8 : key === 'ArrowDown' ? 8 : 0"
    ].forEach(function(contract) {
      expect(source).toContain(contract);
    });
  });

  it('keeps the section panel out of a nested main landmark and uses pressed-button target semantics', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'observe' }));
    var panel = document.querySelector('#astronomy-main');
    expect(panel.tagName).toBe('DIV');
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('astronomy-tab-observe');
    var targetGroup = document.querySelector('[role="group"][aria-label="Observing targets"]');
    expect(targetGroup).toBeTruthy();
    expect(targetGroup.querySelector('[role="tab"]')).toBeNull();
    expect(targetGroup.querySelectorAll('button[aria-pressed]').length).toBeGreaterThan(1);
  });

  it('pins narrow-safe responsive grids for the Moon, seasons, eyepiece, and H-R controls', () => {
    var source = readFileSync(SOURCE_PATH, 'utf8');
    [260, 280, 180].forEach(function(minimum) {
      expect(source).toContain('minmax(min(100%, ' + minimum + 'px), 1fr)');
    });
    expect(source).toContain("repeat(auto-fit,minmax(min(100%,230px),1fr))");
    expect(source).toContain("gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 10, maxHeight: 700");
    expect(source).toContain("h('div', { id: 'astronomy-main', role: 'tabpanel'");
    expect(source).not.toContain("h('main', { id: 'astronomy-main'");
    expect(source).toContain("role: 'group', 'aria-label': __alloT('stem.astronomy.observing_targets'");
  });
});
