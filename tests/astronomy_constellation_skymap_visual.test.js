import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';

// Evaluating the full astronomy widget can pause while OneDrive scans the large source file.
// Real-browser coverage protects interaction speed; this keeps the DOM contract suite stable.
vi.setConfig({ testTimeout: 15000 });

const SOURCE_PATH = 'stem_lab/stem_tool_astronomy.js';

function renderAstronomy(state) {
  return renderTool('astronomy', {
    astronomy: Object.assign({ observingList: [] }, state || {})
  });
}

function parseMarkup(html) {
  return new window.DOMParser().parseFromString(html, 'text/html');
}

function controlName(control) {
  return (control.getAttribute('aria-label') || control.textContent || '').trim();
}

function parseColor(value) {
  var color = String(value || '').trim().toLowerCase();
  var shortHex = /^#([0-9a-f]{3})$/i.exec(color);
  if (shortHex) {
    return shortHex[1].split('').map(function(channel) {
      return parseInt(channel + channel, 16);
    });
  }
  var hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    return [0, 2, 4].map(function(offset) {
      return parseInt(hex[1].slice(offset, offset + 2), 16);
    });
  }
  var rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i.exec(color);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function relativeLuminance(value) {
  var rgb = parseColor(value);
  if (!rgb) throw new Error('Unsupported test color: ' + value);
  return rgb.reduce(function(total, channel, index) {
    var normalized = channel / 255;
    var linear = normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

function contrastRatio(first, second) {
  var a = relativeLuminance(first);
  var b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function compositeOver(foreground, background, opacity) {
  var fg = parseColor(foreground);
  var bg = parseColor(background);
  return 'rgb(' + fg.map(function(channel, index) {
    return Math.round(channel * opacity + bg[index] * (1 - opacity));
  }).join(',') + ')';
}

let astronomy;

beforeEach(() => {
  vi.useRealTimers();
  resetStemLab();
  loadTool(SOURCE_PATH, 'astronomy');
  astronomy = window.__alloAstroPure;
});

describe('Astronomy featured constellation figures', () => {
  it('renders every featured card with a named and described SVG star figure', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'constellations' }));
    var gallery = document.querySelector('#astronomy-constellation-gallery');
    expect(gallery).toBeTruthy();
    expect(gallery.getAttribute('role')).toBe('group');
    expect(gallery.getAttribute('aria-label')).toBe('Featured constellations');
    var cards = Array.from(gallery.querySelectorAll('button[aria-controls="astronomy-constellation-detail"]'));
    expect(cards.length).toBeGreaterThanOrEqual(10);

    cards.forEach(function(card) {
      var figure = card.querySelector('svg[data-constellation-figure][role="img"]');
      expect(figure, controlName(card) + ' should have an SVG figure').toBeTruthy();
      expect(figure.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);

      var labelledBy = String(figure.getAttribute('aria-labelledby') || '').trim().split(/\s+/).filter(Boolean);
      expect(labelledBy, controlName(card) + ' should reference a title and description').toHaveLength(2);
      var title = document.getElementById(labelledBy[0]);
      var description = document.getElementById(labelledBy[1]);
      expect(title && title.tagName.toLowerCase()).toBe('title');
      expect(description && description.tagName.toLowerCase()).toBe('desc');

      var constellationName = controlName(card).split(',')[0];
      expect(title.textContent).toContain(constellationName);
      expect(description.textContent.trim().length).toBeGreaterThan(30);
      expect(figure.querySelectorAll('[data-constellation-line], line').length).toBeGreaterThan(0);
      expect(figure.querySelectorAll('[data-constellation-star], circle').length).toBeGreaterThanOrEqual(3);
    });
  });

  it('uses a narrow-safe gallery and scalable figures that cannot force horizontal overflow', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'constellations' }));
    var gallery = document.querySelector('#astronomy-constellation-gallery');
    var columns = gallery.style.gridTemplateColumns.replace(/\s+/g, ' ');

    expect(columns).toMatch(/repeat\(auto-(?:fit|fill),\s*minmax\(min\(100%,\s*\d+px\),\s*1fr\)\)/);
    Array.from(gallery.querySelectorAll('svg[data-constellation-figure]')).forEach(function(figure) {
      expect(figure.getAttribute('viewBox')).toBeTruthy();
      expect(
        figure.style.maxWidth === '100%' ||
        figure.style.width === '100%' ||
        figure.getAttribute('width') === '100%'
      ).toBe(true);
    });
  });
  it('places selected-detail star labels without estimated bounding-box collisions', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'constellations', selectedConstellation: 'orion' }));
    var labels = Array.from(document.querySelectorAll('#astronomy-constellation-detail [data-constellation-label]'));
    var boxes = labels.map(function(label) {
      var x = Number(label.getAttribute('x'));
      var y = Number(label.getAttribute('y'));
      var fontSize = Number(label.getAttribute('font-size'));
      var width = Math.max(8, label.textContent.length * fontSize * 0.56);
      var end = label.getAttribute('text-anchor') === 'end';
      return { left: end ? x - width : x, right: end ? x : x + width, top: y - fontSize, bottom: y + 1.2 };
    });
    boxes.forEach(function(box, index) {
      boxes.slice(index + 1).forEach(function(other) {
        var overlaps = !(box.right + 0.8 < other.left || box.left - 0.8 > other.right || box.bottom + 0.8 < other.top || box.top - 0.8 > other.bottom);
        expect(overlaps).toBe(false);
      });
    });
  });
});

describe('Astronomy Sky Map visual controls', () => {
  it('exposes five plainly named independent layer toggles, including the ecliptic', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var group = document.querySelector('[role="group"][aria-label="Sky map layers"]');
    expect(group).toBeTruthy();

    var buttons = Array.from(group.querySelectorAll('button'));
    var expectedNames = ['Stars', 'Constellation lines', 'Planets', 'Sun and Moon', 'Ecliptic'];
    expect(buttons.map(controlName)).toEqual(expectedNames);
    buttons.forEach(function(button) {
      expect(button.type).toBe('button');
      expect(['true', 'false']).toContain(button.getAttribute('aria-pressed'));
    });

    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    expect(diagram).toBeTruthy();
    expect(diagram.querySelector('[data-sky-layer="ecliptic"]')).toBeTruthy();
  });

  it('offers an accessible target selector populated from the computed sky', () => {
    vi.useFakeTimers();
    var instant = new Date('2026-01-15T05:00:00.000Z');
    vi.setSystemTime(instant);

    var document = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'portland', skyHourOffset: 0, skyDayOffset: 0,
      skyTarget: 'moon'
    }));
    var target = document.querySelector('#astronomy-sky-target');
    expect(target).toBeTruthy();
    expect(target.tagName).toBe('SELECT');
    expect(controlName(target)).toBe('Sky map target');
    expect(target.value).toBe('moon');
    expect(String(target.getAttribute('aria-controls') || '').split(/\s+/)).toContain('astronomy-sky-map-diagram');

    var optionNames = Array.from(target.options).map(function(option) { return option.textContent.trim(); });
    expect(optionNames).toContain('Overview');
    expect(optionNames).toContain('Sun');
    expect(optionNames).toContain('Moon');

    var sky = astronomy.skyNow(2026, 1, 15, 5, 43.66, -70.26);
    sky.planets.filter(function(planet) { return planet.up; }).forEach(function(planet) {
      expect(optionNames).toContain(planet.name);
    });
    var visibleBrightStars = sky.stars.filter(function(star) {
      return star.up && star.mag <= 1.5;
    });
    expect(visibleBrightStars.length).toBeGreaterThan(0);
    visibleBrightStars.forEach(function(star) {
      expect(optionNames).toContain(star.name);
    });
  });

  it('shows selected-target position, brightness, horizon event, and best viewing window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'portland', skyTarget: 'moon'
    }));
    var detail = document.querySelector('#astronomy-sky-target-detail');

    expect(detail).toBeTruthy();
    expect(detail.getAttribute('aria-label')).toBe('Moon observing details');
    ['Altitude', 'Direction', 'Brightness', 'Next horizon event', 'Best in next 12 hours'].forEach(function(label) {
      expect(Array.from(detail.querySelectorAll('dt')).map(function(term) { return term.textContent.trim(); })).toContain(label);
    });
    expect(detail.textContent).toContain('illuminated');
    expect(detail.textContent).toContain('Viewing tip:');
    expect(detail.textContent).not.toContain('NaN');
    expect(detail.textContent).not.toContain('Invalid Date');
  }, 60000);

  it('preserves the selected location timezone while target and layer refinements are active', () => {
    vi.useFakeTimers();
    var instant = new Date('2026-01-15T12:00:00.000Z');
    vi.setSystemTime(instant);

    var document = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'sydney', skyHourOffset: 0, skyDayOffset: 0,
      skyTarget: 'moon',
      skyLayers: { stars: true, constellationLines: true, planets: true, sunMoon: true, ecliptic: true }
    }));
    var expectedLocal = instant.toLocaleString(undefined, {
      timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: '2-digit'
    });

    expect(document.body.textContent).toContain(expectedLocal + ' · Sydney · S. hemisphere');
    expect(document.querySelector('button[aria-label="Sydney · S. hemisphere"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#astronomy-sky-target').value).toBe('moon');
  });

  it('keeps a selected bright body available when it moves below the horizon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var sky = astronomy.skyNow(2026, 1, 15, 5, 43.66, -70.26);
    var below = sky.planets.find(function(body) { return !body.up; });
    var id = below ? 'planet:' + below.id : null;
    if (!below) {
      below = sky.stars.find(function(body) { return !body.up && body.mag <= 1.5; });
      id = below ? 'star:' + below.name : null;
    }
    expect(below).toBeTruthy();

    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: id }));
    var target = document.querySelector('#astronomy-sky-target');
    expect(target.value).toBe(id);
    expect(target.selectedOptions[0].textContent).toContain('(below horizon)');
    expect(document.querySelector('#astronomy-sky-target-status').textContent).toContain('is below the horizon');
  });

  it('replaces an ordinary label with one unambiguous selected-target label', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var sky = astronomy.skyNow(2026, 1, 15, 5, 43.66, -70.26);
    var body = sky.planets.find(function(candidate) { return candidate.up; }) || sky.stars.find(function(candidate) { return candidate.up && candidate.mag <= 1.5; });
    var id = body.id ? 'planet:' + body.id : 'star:' + body.name;
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: id }));
    var labels = Array.from(document.querySelectorAll('#astronomy-sky-map-diagram text')).map(function(label) { return label.textContent.trim(); });
    expect(labels.filter(function(label) { return label.indexOf(body.name) === 0 && label.endsWith('TARGET'); })).toHaveLength(1);
    expect(labels.filter(function(label) { return label === body.name || label.endsWith(' ' + body.name); })).toHaveLength(0);
  });

  it('keeps horizon, altitude, cardinal, and ecliptic cues above WCAG contrast floors', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var horizon = diagram.querySelector('circle[fill]:not([fill="none"])');
    var dome = horizon.getAttribute('fill');

    expect(contrastRatio(horizon.getAttribute('stroke'), dome)).toBeGreaterThanOrEqual(3);
    Array.from(diagram.querySelectorAll('circle[fill="none"][stroke]')).forEach(function(ring) {
      expect(contrastRatio(ring.getAttribute('stroke'), dome)).toBeGreaterThanOrEqual(3);
    });
    var cardinals = Array.from(diagram.querySelectorAll('text')).filter(function(label) {
      return ['N', 'E', 'S', 'W'].includes(label.textContent.trim());
    });
    expect(cardinals).toHaveLength(4);
    cardinals.forEach(function(label) {
      expect(contrastRatio(label.getAttribute('fill'), dome)).toBeGreaterThanOrEqual(4.5);
    });

    var ecliptic = diagram.querySelector('[data-sky-layer="ecliptic"] [stroke], [data-sky-layer="ecliptic"][stroke]');
    expect(ecliptic).toBeTruthy();
    expect(contrastRatio(ecliptic.getAttribute('stroke'), dome)).toBeGreaterThanOrEqual(3);
  });

  it('keeps constellation guides above 3:1 after daylight opacity compositing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T17:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var horizon = diagram.querySelector('circle[fill]:not([fill=none])');
    var guide = diagram.querySelector('[data-sky-layer=constellation-lines] line');
    expect(guide).toBeTruthy();
    var composited = compositeOver(guide.getAttribute('stroke'), horizon.getAttribute('fill'), Number(guide.getAttribute('opacity') || 1));
    expect(contrastRatio(composited, horizon.getAttribute('fill'))).toBeGreaterThanOrEqual(3);
  });

  it('clips partially risen constellation edges cleanly at the horizon', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var clip = diagram.querySelector('#astronomy-sky-dome-clip circle');
    var guides = diagram.querySelector('[data-sky-layer=constellation-lines]');
    expect(clip).toBeTruthy();
    expect(guides.getAttribute('clip-path')).toBe('url(#astronomy-sky-dome-clip)');
    var source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).toContain('(first.alt <= 0 && second.alt <= 0)');
  });

  it('keeps the diagram description consistent with disabled visual layers', () => {
    var document = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'portland',
      skyLayers: { stars: false, constellationLines: false, planets: false, sunMoon: false, ecliptic: false }
    }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    expect(diagram.getAttribute('aria-label')).toContain('The Sun and Moon layer is hidden.');
    expect(diagram.getAttribute('aria-label')).toContain('Reference stars are hidden by the layer controls.');
    expect(diagram.getAttribute('aria-label')).not.toContain('Moon phase:');
    expect(document.querySelector('#astronomy-sky-map-help').textContent).toContain('When enabled');
  });

  it('declares a 320px-safe wrapping layout for controls and the diagram', () => {
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var layout = document.querySelector('#astronomy-sky-layout');
    var controls = document.querySelector('#astronomy-sky-controls');
    var layers = document.querySelector('[role="group"][aria-label="Sky map layers"]');
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var target = document.querySelector('#astronomy-sky-target');

    expect(layout).toBeTruthy();
    expect(controls).toBeTruthy();
    expect(layout.style.maxWidth).toBe('100%');
    expect(['0', '0px']).toContain(layout.style.minWidth);
    expect(['0', '0px']).toContain(controls.style.minWidth);
    expect(controls.style.maxWidth).toBe('100%');

    var narrowSafeGrid = /minmax\(min\(100%,\s*\d+px\),\s*1fr\)/.test(layout.style.gridTemplateColumns);
    var wrappingFlex = layout.style.display === 'flex' && layout.style.flexWrap === 'wrap';
    expect(narrowSafeGrid || wrappingFlex).toBe(true);
    expect(layers.style.flexWrap).toBe('wrap');
    expect(diagram.style.maxWidth).toBe('100%');
    expect(target.style.maxWidth).toBe('100%');
  });
});
