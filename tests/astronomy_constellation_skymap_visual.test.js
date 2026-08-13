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

  it('models continuous Bortle preview contrast without visibility cutoffs', () => {
    expect(typeof astronomy.bortleSkyPreview).toBe('function');
    expect(typeof astronomy.bortleStarContrast).toBe('function');

    var darkOne = astronomy.bortleSkyPreview(1, -18);
    var darkNine = astronomy.bortleSkyPreview(9, -18);
    [darkOne, darkNine].forEach(function(preview) {
      ['class', 'darknessMix', 'starOpacityScale', 'atmosphereHazeOpacity'].forEach(function(field) {
        expect(Number.isFinite(preview[field]), field + ' should be finite').toBe(true);
      });
      expect(preview.active).toBe(true);
      expect(preview.mode).toBe('dark');
      expect(parseColor(preview.domeFill)).toBeTruthy();
      expect(parseColor(preview.atmosphereHazeColor)).toBeTruthy();
      expect(preview).not.toHaveProperty('horizonGlowOpacity');
      expect(preview).not.toHaveProperty('referenceLimit');
      expect(preview).not.toHaveProperty('limitingMagnitude');
    });
    expect(darkOne.class).toBe(1);
    expect(darkNine.class).toBe(9);
    expect(darkOne.starOpacityScale).toBeGreaterThan(darkNine.starOpacityScale);
    expect(relativeLuminance(darkOne.domeFill)).toBeLessThan(relativeLuminance(darkNine.domeFill));

    [-18, -9, -6].forEach(function(sunAltitude) {
      var one = astronomy.bortleSkyPreview(1, sunAltitude);
      var nine = astronomy.bortleSkyPreview(9, sunAltitude);
      expect(one.atmosphereHazeOpacity).toBe(nine.atmosphereHazeOpacity);
      expect(one.atmosphereHazeColor).toBe(nine.atmosphereHazeColor);
    });

    expect(astronomy.bortleSkyPreview('forged', -18).class).toBe(5);
    expect(astronomy.bortleSkyPreview(0, -18).class).toBe(5);
    expect(astronomy.bortleSkyPreview(99, -18).class).toBe(5);

    [
      { magnitude: 1, band: 'prominent' },
      { magnitude: 2, band: 'pattern' },
      { magnitude: 3, band: 'faint-reference' }
    ].forEach(function(sample) {
      var starOne = astronomy.bortleStarContrast(1, sample.magnitude, 55, -18);
      var starNine = astronomy.bortleStarContrast(9, sample.magnitude, 55, -18);
      [starOne, starNine].forEach(function(contrast) {
        expect(Object.keys(contrast).sort()).toEqual(['band', 'opacity']);
        expect(Number.isFinite(contrast.opacity), 'opacity should be finite').toBe(true);
        expect(contrast.opacity).toBeGreaterThanOrEqual(0);
        expect(contrast.opacity).toBeLessThanOrEqual(1);
        expect(contrast.band).toBe(sample.band);
      });
      expect(starOne.opacity).toBeGreaterThan(starNine.opacity);
    });
    expect(astronomy.bortleStarContrast('forged', 2, 55, -18))
      .toEqual(astronomy.bortleStarContrast(5, 2, 55, -18));

    var daylightOne = astronomy.bortleSkyPreview(1, -6);
    var daylightNine = astronomy.bortleSkyPreview(9, -6);
    expect(daylightOne.active).toBe(false);
    expect(daylightNine.active).toBe(false);
    expect(daylightOne.mode).toBe('daylight');
    expect(daylightNine.mode).toBe('daylight');
    ['darknessMix', 'starOpacityScale', 'domeFill', 'atmosphereHazeOpacity', 'atmosphereHazeColor'].forEach(function(field) {
      expect(daylightOne[field]).toBe(daylightNine[field]);
    });
    expect(astronomy.bortleStarContrast(1, 2, 55, -6))
      .toEqual(astronomy.bortleStarContrast(9, 2, 55, -6));
  });

  it('keeps Bortle preview visuals continuous across the minus-six-degree Sun boundary', () => {
    var epsilon = 0.0001;
    function maxColorDelta(first, second) {
      var firstRgb = parseColor(first);
      var secondRgb = parseColor(second);
      expect(firstRgb).toBeTruthy();
      expect(secondRgb).toBeTruthy();
      return Math.max.apply(Math, firstRgb.map(function(channel, index) {
        return Math.abs(channel - secondRgb[index]);
      }));
    }

    [1, 9].forEach(function(bortleClass) {
      var justBelow = astronomy.bortleSkyPreview(bortleClass, -6 - epsilon);
      var justAbove = astronomy.bortleSkyPreview(bortleClass, -6 + epsilon);
      expect(justBelow.mode).toBe('twilight');
      expect(justAbove.mode).toBe('daylight');
      expect(justBelow.active).toBe(true);
      expect(justAbove.active).toBe(false);
      expect(Math.abs(justBelow.starOpacityScale - justAbove.starOpacityScale)).toBeLessThan(0.001);
      expect(Math.abs(justBelow.atmosphereHazeOpacity - justAbove.atmosphereHazeOpacity)).toBeLessThan(0.001);
      expect(maxColorDelta(justBelow.atmosphereHazeColor, justAbove.atmosphereHazeColor)).toBeLessThanOrEqual(1);
      expect(maxColorDelta(justBelow.domeFill, justAbove.domeFill)).toBeLessThanOrEqual(1);

      [1, 2, 3].forEach(function(magnitude) {
        var belowOpacity = astronomy.bortleStarContrast(bortleClass, magnitude, 35, -6 - epsilon).opacity;
        var aboveOpacity = astronomy.bortleStarContrast(bortleClass, magnitude, 35, -6 + epsilon).opacity;
        expect(Math.abs(belowOpacity - aboveOpacity)).toBeLessThan(0.001);
      });
    });

    var hazeOne = astronomy.bortleSkyPreview(1, -6 - epsilon);
    var hazeNine = astronomy.bortleSkyPreview(9, -6 - epsilon);
    expect(hazeOne.atmosphereHazeOpacity).toBe(hazeNine.atmosphereHazeOpacity);
    expect(hazeOne.atmosphereHazeColor).toBe(hazeNine.atmosphereHazeColor);
  });

  it('renders an accessible live Bortle preview while preserving reference geometry and target discovery', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));

    function inspectPreview(bortleClass, expectedMode) {
      var document = parseMarkup(renderAstronomy({
        tab: 'skymap', skyLoc: 'portland', bortleClass: bortleClass
      }));
      var selector = document.querySelector('#astronomy-sky-darkness');
      var status = document.querySelector('#astronomy-sky-darkness-status');
      var diagram = document.querySelector('#astronomy-sky-map-diagram');
      var dome = diagram && diagram.querySelector('[data-sky-dome="true"]');
      var stars = diagram && diagram.querySelector('[data-sky-layer="stars"]');
      var markers = Array.from(stars ? stars.querySelectorAll('[data-sky-object^="star:"]') : []);
      var atmosphere = diagram && diagram.querySelector('[data-sky-atmosphere="haze"]');
      var hazeGradient = diagram && diagram.querySelector('#astronomy-sky-horizon-haze');

      expect(selector).toBeTruthy();
      expect(selector.tagName).toBe('SELECT');
      expect(selector.value).toBe(String(bortleClass));
      expect(selector.getAttribute('aria-label')).toBe('Sky darkness (Bortle class)');
      expect(String(selector.getAttribute('aria-describedby') || '').split(/\s+/)).toContain('astronomy-sky-darkness-status');
      expect(Array.from(selector.options).map(function(option) { return option.value; }))
        .toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);

      expect(status).toBeTruthy();
      expect(status.getAttribute('data-bortle-class')).toBe(String(bortleClass));
      expect(status.getAttribute('data-preview-mode')).toBe(expectedMode);
      expect(status.textContent).toContain('Bortle ' + bortleClass);
      expect(status.textContent).toMatch(/curated bright reference-star preview/i);
      expect(status.textContent).toMatch(/illustrative[^.]*not calibrated|not calibrated[^.]*illustrative/i);

      expect(diagram.getAttribute('data-bortle-class')).toBe(String(bortleClass));
      expect(diagram.getAttribute('data-sky-preview-mode')).toBe(expectedMode);
      expect(diagram.hasAttribute('data-sky-strong-star-count')).toBe(false);
      expect(diagram.hasAttribute('data-sky-visible-star-count')).toBe(false);
      var referenceCount = Number(diagram.getAttribute('data-sky-reference-star-count'));
      expect(Number.isFinite(referenceCount)).toBe(true);
      expect(referenceCount).toBe(markers.length);
      expect(referenceCount).toBeGreaterThan(0);
      expect(diagram.getAttribute('aria-label')).toMatch(new RegExp('Bortle(?: class)? ' + bortleClass, 'i'));
      expect(diagram.getAttribute('aria-label')).toMatch(/curated bright reference(?:-| )star(?: positions|s)/i);
      expect(diagram.getAttribute('aria-label')).toMatch(/illustrative/i);
      expect(dome).toBeTruthy();
      expect(parseColor(dome.getAttribute('fill'))).toBeTruthy();
      expect(stars).toBeTruthy();
      expect(stars.hasAttribute('data-sky-reference-limit')).toBe(false);
      expect(stars.hasAttribute('data-sky-limiting-magnitude')).toBe(false);

      markers.forEach(function(marker) {
        var bortleOpacity = Number(marker.getAttribute('data-sky-bortle-opacity'));
        expect(Number.isFinite(bortleOpacity)).toBe(true);
        expect(bortleOpacity).toBeGreaterThanOrEqual(0);
        expect(bortleOpacity).toBeLessThanOrEqual(1);
        expect(['prominent', 'pattern', 'faint-reference'])
          .toContain(marker.getAttribute('data-sky-bortle-band'));
        expect(marker.hasAttribute('data-sky-strong')).toBe(false);
        expect(marker.hasAttribute('data-sky-effective-magnitude')).toBe(false);
      });

      expect(atmosphere).toBeTruthy();
      expect(atmosphere.getAttribute('fill')).toBe('url(#astronomy-sky-horizon-haze)');
      expect(atmosphere.hasAttribute('data-sky-layer')).toBe(false);
      expect(Array.from(atmosphere.attributes).some(function(attribute) {
        return /bortle/i.test(attribute.name);
      })).toBe(false);
      expect(hazeGradient).toBeTruthy();

      var previewCopy = status.textContent + ' ' + diagram.getAttribute('aria-label');
      expect(previewCopy).not.toMatch(/limiting magnitude|magnitude limit|effective magnitude/i);
      expect(previewCopy).not.toMatch(/\b\d+\s+(?:curated\s+)?(?:bright\s+)?reference stars?[^.]{0,48}\b(?:visible|seen|detectable)\b/i);
      expect(document.querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);
      return {
        document: document, selector: selector, status: status, diagram: diagram,
        dome: dome, stars: stars, markers: markers, atmosphere: atmosphere,
        hazeGradient: hazeGradient, referenceCount: referenceCount
      };
    }

    function markerStateMap(result) {
      return new Map(result.markers.map(function(marker) {
        return [marker.getAttribute('data-sky-object'), {
          opacity: Number(marker.getAttribute('data-sky-bortle-opacity')),
          band: marker.getAttribute('data-sky-bortle-band'),
          x: Number(marker.getAttribute('cx')),
          y: Number(marker.getAttribute('cy'))
        }];
      }));
    }
    function hazeSignature(result) {
      return {
        fill: result.atmosphere.getAttribute('fill'),
        opacity: result.atmosphere.getAttribute('opacity'),
        stops: Array.from(result.hazeGradient.querySelectorAll('stop')).map(function(stop) {
          return {
            offset: stop.getAttribute('offset'),
            color: stop.getAttribute('stop-color'),
            opacity: stop.getAttribute('stop-opacity')
          };
        })
      };
    }

    var classOne = inspectPreview(1, 'dark');
    var classNine = inspectPreview(9, 'dark');
    expect(relativeLuminance(classOne.dome.getAttribute('fill')))
      .toBeLessThan(relativeLuminance(classNine.dome.getAttribute('fill')));
    expect(classOne.referenceCount).toBe(classNine.referenceCount);
    expect(hazeSignature(classOne)).toEqual(hazeSignature(classNine));

    var oneStates = markerStateMap(classOne);
    var nineStates = markerStateMap(classNine);
    expect(Array.from(oneStates.keys())).toEqual(Array.from(nineStates.keys()));
    var renderedBands = new Set();
    oneStates.forEach(function(one, id) {
      var nine = nineStates.get(id);
      expect(nine).toBeTruthy();
      expect(one.band).toBe(nine.band);
      expect(one.x).toBeCloseTo(nine.x, 6);
      expect(one.y).toBeCloseTo(nine.y, 6);
      expect(one.opacity).toBeGreaterThan(nine.opacity);
      renderedBands.add(one.band);
    });
    expect(renderedBands.size).toBeGreaterThan(0);

    var optionValuesOne = Array.from(classOne.selector.options).map(function(option) { return option.value; });
    var optionValuesNine = Array.from(classNine.selector.options).map(function(option) { return option.value; });
    var targetOptionsOne = Array.from(classOne.document.querySelector('#astronomy-sky-target').options).map(function(option) { return option.value; });
    var targetOptionsNine = Array.from(classNine.document.querySelector('#astronomy-sky-target').options).map(function(option) { return option.value; });
    expect(optionValuesOne).toEqual(optionValuesNine);
    expect(targetOptionsOne).toEqual(targetOptionsNine);

    var focusTarget = classNine.markers.filter(function(marker) {
      return targetOptionsNine.indexOf(marker.getAttribute('data-sky-object')) >= 0;
    }).sort(function(first, second) {
      return Number(first.getAttribute('data-sky-bortle-opacity')) - Number(second.getAttribute('data-sky-bortle-opacity'));
    })[0];
    expect(focusTarget).toBeTruthy();
    var focusTargetId = focusTarget.getAttribute('data-sky-object');
    var focused = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'portland', bortleClass: 9, skyTarget: focusTargetId
    }));
    var focusedMarker = focused.querySelector('[data-sky-object="' + focusTargetId + '"]');
    expect(focused.querySelector('#astronomy-sky-target').value).toBe(focusTargetId);
    expect(focusedMarker).toBeTruthy();
    var focusedSunAltitude = astronomy.skyNow(2026, 1, 15, 5, 43.66, -70.26).sun.alt;
    var expectedFocusedContrast = astronomy.bortleStarContrast(
      9,
      Number(focusedMarker.getAttribute('data-star-magnitude')),
      Number(focusedMarker.getAttribute('data-sky-altitude')),
      focusedSunAltitude
    );
    expect(Number(focusedMarker.getAttribute('data-sky-bortle-opacity')))
      .toBeCloseTo(expectedFocusedContrast.opacity, 2);
    expect(focusedMarker.getAttribute('data-sky-bortle-band')).toBe(expectedFocusedContrast.band);
    expect(focusedMarker.hasAttribute('data-sky-strong')).toBe(false);
    expect(Number(focusedMarker.getAttribute('opacity')))
      .toBeCloseTo(Number(focusedMarker.getAttribute('data-sky-opacity')), 2);
    expect(Number(focusedMarker.getAttribute('cx'))).toBeCloseTo(Number(focusTarget.getAttribute('cx')), 6);
    expect(Number(focusedMarker.getAttribute('cy'))).toBeCloseTo(Number(focusTarget.getAttribute('cy')), 6);
    var focusedOverlay = focused.querySelector('[data-sky-layer="target"]');
    expect(focusedOverlay).toBeTruthy();
    expect(Array.from(focusedOverlay.querySelectorAll('circle, path')).every(function(mark) {
      return mark.getAttribute('stroke') === '#fbbf24';
    })).toBe(true);
    var targetLabel = Array.from(focused.querySelectorAll('#astronomy-sky-map-diagram text')).find(function(label) {
      return /\bTARGET\b/.test(label.textContent);
    });
    expect(targetLabel).toBeTruthy();
    expect(Number(targetLabel.getAttribute('font-size'))).toBeGreaterThanOrEqual(15);

    vi.setSystemTime(new Date('2026-01-15T17:00:00.000Z'));
    var dayOne = inspectPreview(1, 'daylight');
    var dayNine = inspectPreview(9, 'daylight');
    [dayOne, dayNine].forEach(function(result) {
      expect(result.status.textContent).toMatch(/daylight dominates/i);
      expect(result.status.textContent).toMatch(/Bortle[^.]*does not (?:change|affect)|does not (?:change|affect)[^.]*Bortle/i);
    });
    expect(dayOne.dome.getAttribute('fill')).toBe(dayNine.dome.getAttribute('fill'));
    expect(Array.from(markerStateMap(dayOne).entries())).toEqual(Array.from(markerStateMap(dayNine).entries()));
    expect(dayOne.referenceCount).toBe(dayNine.referenceCount);
    expect(hazeSignature(dayOne)).toEqual(hazeSignature(dayNine));
  }, 120000);

  it('renders passive horizon haze and altitude extinction without creating a sixth layer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland' }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var atmosphere = diagram.querySelector('[data-sky-atmosphere="haze"]');
    var gradient = diagram.querySelector('#astronomy-sky-horizon-haze');

    expect(atmosphere).toBeTruthy();
    expect(atmosphere.getAttribute('fill')).toBe('url(#astronomy-sky-horizon-haze)');
    expect(atmosphere.getAttribute('aria-hidden')).toBe('true');
    expect(atmosphere.getAttribute('pointer-events') || atmosphere.style.pointerEvents).toBe('none');
    expect(atmosphere.hasAttribute('data-sky-layer')).toBe(false);
    expect(gradient).toBeTruthy();
    expect(gradient.querySelectorAll('stop').length).toBeGreaterThanOrEqual(2);

    var layerNames = Array.from(diagram.querySelectorAll('[data-sky-layer]')).map(function(layer) {
      return layer.getAttribute('data-sky-layer');
    });
    expect(layerNames.slice().sort()).toEqual(['constellation-lines', 'ecliptic', 'planets', 'stars', 'sun-moon']);
    expect(document.querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);

    expect(typeof astronomy.atmosphericVisibility).toBe('function');
    var nearHorizon = astronomy.atmosphericVisibility(2, 1);
    var lowerSky = astronomy.atmosphericVisibility(15, 1);
    var highSky = astronomy.atmosphericVisibility(60, 1);
    expect(nearHorizon).toBeGreaterThan(0);
    expect(nearHorizon).toBeLessThan(lowerSky);
    expect(lowerSky).toBeLessThan(highSky);
    expect(highSky).toBeLessThanOrEqual(1);
    expect(astronomy.atmosphericVisibility(60, 0.4)).toBeCloseTo(highSky * 0.4, 6);

    var atmosphereMarkers = Array.from(diagram.querySelectorAll('[data-sky-object][data-sky-altitude][data-sky-transmission][data-sky-opacity]'));
    expect(atmosphereMarkers.length).toBeGreaterThan(0);
    expect(atmosphereMarkers.some(function(marker) { return marker.getAttribute('data-sky-object').startsWith('star:'); })).toBe(true);
    expect(atmosphereMarkers.some(function(marker) { return marker.getAttribute('data-sky-object').startsWith('planet:'); })).toBe(true);
    atmosphereMarkers.forEach(function(marker) {
      var objectId = marker.getAttribute('data-sky-object');
      var altitude = Number(marker.getAttribute('data-sky-altitude'));
      var transmission = Number(marker.getAttribute('data-sky-transmission'));
      var finalOpacity = Number(marker.getAttribute('data-sky-opacity'));
      var floor = objectId.startsWith('planet:') ? 0.24 : 0.08;

      expect(altitude).toBeGreaterThan(0);
      expect(transmission).toBeCloseTo(astronomy.atmosphericVisibility(altitude, 1, floor), 2);
      expect(transmission).toBeGreaterThan(0);
      expect(transmission).toBeLessThanOrEqual(1);
      expect(Number(marker.getAttribute('opacity'))).toBeCloseTo(finalOpacity, 2);
      expect(finalOpacity).toBeGreaterThan(0);
      expect(finalOpacity).toBeLessThanOrEqual(1);
      if (objectId.startsWith('planet:')) expect(finalOpacity).toBeCloseTo(transmission, 2);
      else expect(finalOpacity).toBeLessThanOrEqual(transmission);
    });
  });

  it('draws a clipped twelve-hour motion track for a selected target without adding a layer control', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var lat = 43.66, lon = -70.26;
    function bodyAt(snapshot, targetId) {
      if (targetId === 'sun') return snapshot.sun;
      if (targetId === 'moon') return snapshot.moon;
      if (targetId.indexOf('planet:') === 0) {
        return snapshot.planets.find(function(body) { return body.id === targetId.slice(7); });
      }
      return snapshot.stars.find(function(body) { return 'star:' + body.name === targetId; });
    }
    var initialSky = astronomy.skyNow(2026, 1, 15, 5, lat, lon);
    var candidateIds = ['sun', 'moon']
      .concat(initialSky.planets.map(function(body) { return 'planet:' + body.id; }))
      .concat(initialSky.stars.filter(function(body) { return body.mag <= 1.5; }).map(function(body) { return 'star:' + body.name; }));
    var targetId = candidateIds.find(function(candidateId) {
      var above = [];
      for (var step = 0; step <= 12; step++) {
        above.push(bodyAt(astronomy.skyNow(2026, 1, 15, 5 + step, lat, lon), candidateId).alt >= 0);
      }
      return above.some(function(up, index) { return up && index < 12 && above[index + 1]; }) &&
        [4, 8, 12].some(function(step) { return above[step]; });
    });
    expect(targetId).toBeTruthy();

    var document = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: targetId }));
    var diagram = document.querySelector('#astronomy-sky-map-diagram');
    var track = diagram.querySelector('[data-sky-target-track]');
    expect(track).toBeTruthy();
    expect(track.getAttribute('data-sky-target')).toBe(targetId);
    expect(track.getAttribute('clip-path')).toBe('url(#astronomy-sky-dome-clip)');
    expect(track.getAttribute('aria-hidden')).toBe('true');
    expect(track.hasAttribute('data-sky-layer')).toBe(false);

    var segments = Array.from(track.querySelectorAll('[data-sky-target-track-segment]'));
    expect(segments.length).toBeGreaterThan(0);
    expect(Number(track.getAttribute('data-segment-count'))).toBe(segments.length);
    var expectedVisibleSampleCount = 0;
    for (var visibleStep = 0; visibleStep <= 12; visibleStep++) {
      if (bodyAt(astronomy.skyNow(2026, 1, 15, 5 + visibleStep, lat, lon), targetId).alt >= 0) expectedVisibleSampleCount++;
    }
    expect(Number(track.getAttribute('data-visible-sample-count'))).toBe(expectedVisibleSampleCount);
    segments.forEach(function(segment) {
      expect(segment.getAttribute('d')).toMatch(/^M/i);
      expect(segment.getAttribute('d')).not.toMatch(/NaN|Infinity|undefined/i);
      expect(Number(segment.getAttribute('data-point-count'))).toBeGreaterThan(1);
      expect(segment.getAttribute('stroke')).toBe('#fbbf24');
      expect(segment.getAttribute('marker-end')).toBe('url(#astronomy-sky-target-track-arrow)');
    });
    expect(diagram.querySelector('#astronomy-sky-target-track-arrow path')).toBeTruthy();

    var expectedWaypointOffsets = [4, 8, 12].filter(function(step) {
      return bodyAt(astronomy.skyNow(2026, 1, 15, 5 + step, lat, lon), targetId).alt >= 0;
    });
    var waypoints = Array.from(track.querySelectorAll('[data-sky-target-track-sample]'));
    expect(waypoints.map(function(sample) { return Number(sample.getAttribute('data-hour-offset')); })).toEqual(expectedWaypointOffsets);
    waypoints.forEach(function(sample) {
      var x = Number(sample.getAttribute('cx'));
      var y = Number(sample.getAttribute('cy'));
      var altitude = Number(sample.getAttribute('data-altitude'));
      var azimuth = Number(sample.getAttribute('data-azimuth'));
      expect([x, y, altitude, azimuth].every(Number.isFinite)).toBe(true);
      expect(altitude).toBeGreaterThanOrEqual(0);
      expect(Math.hypot(x - 190, y - 190)).toBeLessThanOrEqual(178.01);
    });

    expect(document.querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);
    expect(document.querySelector('#astronomy-sky-map-help').textContent).toMatch(/solid gold arc[^.]*next 12 hours/i);
    expect(document.querySelector('#astronomy-sky-focus-legend').textContent).toMatch(/solid gold arc[^.]*next 12 hours/i);
    expect(diagram.getAttribute('aria-label')).toMatch(/solid gold motion arc[^.]*next 12 hours/i);
  }, 60000);

  it('omits the motion track for Overview and for a target below the horizon for all twelve hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var lat = 43.66, lon = -70.26;
    function bodyAt(snapshot, targetId) {
      if (targetId.indexOf('planet:') === 0) {
        return snapshot.planets.find(function(body) { return body.id === targetId.slice(7); });
      }
      return snapshot.stars.find(function(body) { return 'star:' + body.name === targetId; });
    }
    var initialSky = astronomy.skyNow(2026, 1, 15, 5, lat, lon);
    var candidateIds = initialSky.planets.map(function(body) { return 'planet:' + body.id; })
      .concat(initialSky.stars.filter(function(body) { return body.mag <= 1.5; }).map(function(body) { return 'star:' + body.name; }));
    var belowTargetId = candidateIds.find(function(candidateId) {
      for (var step = 0; step <= 12; step++) {
        if (bodyAt(astronomy.skyNow(2026, 1, 15, 5 + step, lat, lon), candidateId).alt >= 0) return false;
      }
      return true;
    });
    expect(belowTargetId).toBeTruthy();

    var overview = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: '' }));
    var below = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: belowTargetId }));
    expect(overview.querySelector('[data-sky-target-track]')).toBeNull();
    expect(below.querySelector('#astronomy-sky-target').value).toBe(belowTargetId);
    expect(below.querySelector('[data-sky-target-track]')).toBeNull();
    expect(below.querySelector('#astronomy-sky-target-status').textContent).toContain('below the horizon');
    expect(overview.querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);
    expect(below.querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);
  }, 60000);
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
    ['Altitude', 'Direction', 'Brightness', 'Next horizon event', 'Highest in next 12 hours'].forEach(function(label) {
      expect(Array.from(detail.querySelectorAll('dt')).map(function(term) { return term.textContent.trim(); })).toContain(label);
    });
    expect(detail.textContent).toContain('illuminated');
    expect(detail.textContent).toContain('Viewing tip:');
    expect(detail.textContent).not.toContain('NaN');
    expect(detail.textContent).not.toContain('Invalid Date');
  }, 60000);

  it('applies transparent observing-window thresholds and interpolates adjacent eligible samples', () => {
    expect(typeof astronomy.observingWindowEligibility).toBe('function');
    expect(typeof astronomy.buildObservingWindows).toBe('function');

    function target(alt, ra, dec) {
      return { alt: alt, ra: ra == null ? 0 : ra, dec: dec == null ? 0 : dec };
    }
    function sky(sunAlt, moonAlt, moonIllum, moonRa, moonDec) {
      return {
        sun: { alt: sunAlt },
        moon: { alt: moonAlt, ra: moonRa == null ? 0 : moonRa, dec: moonDec == null ? 0 : moonDec,
          phase: { illum: moonIllum } }
      };
    }

    var darkBrightMoon = sky(-18, 30, 0.8, 0, 0);
    expect(astronomy.observingWindowEligibility('star', target(20), darkBrightMoon)).toBe(false);
    expect(astronomy.observingWindowEligibility('star', target(20), sky(-18, -0.01, 0.8, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('star', target(20), sky(-18, 30, 0.249, 0, 0))).toBe(true);
    expect(astronomy.angularSep(0, 0, 60, 0)).toBeCloseTo(60, 8);
    expect(astronomy.observingWindowEligibility('star', target(20), sky(-18, 30, 0.8, 60, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('star', target(19.999), sky(-18, -1, 0.8, 0, 0))).toBe(false);
    expect(astronomy.observingWindowEligibility('star', target(20), sky(-17.999, -1, 0.8, 0, 0))).toBe(false);

    var mercuryAtBoundary = Object.assign(target(10), { id: 'mercury' });
    var venusAtBoundary = Object.assign(target(10), { id: 'venus' });
    expect(astronomy.observingWindowEligibility('planet', mercuryAtBoundary, sky(-6, 60, 1, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('planet', venusAtBoundary, sky(-6, 60, 1, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('planet', Object.assign(target(9.999), { id: 'mercury' }), sky(-6, -1, 0, 0, 0))).toBe(false);
    expect(astronomy.observingWindowEligibility('planet', mercuryAtBoundary, sky(-5.999, -1, 0, 0, 0))).toBe(false);

    var jupiterAtBoundary = Object.assign(target(20), { id: 'jupiter' });
    expect(astronomy.observingWindowEligibility('planet', jupiterAtBoundary, sky(-12, 60, 1, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('planet', Object.assign(target(19.999), { id: 'jupiter' }), sky(-12, -1, 0, 0, 0))).toBe(false);
    expect(astronomy.observingWindowEligibility('planet', jupiterAtBoundary, sky(-11.999, -1, 0, 0, 0))).toBe(false);
    expect(astronomy.observingWindowEligibility('planet', target(20), sky(-12, 60, 1, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('moon', target(20), sky(40, 60, 1, 0, 0))).toBe(true);
    expect(astronomy.observingWindowEligibility('moon', target(19.999), sky(-30, -1, 0, 0, 0))).toBe(false);
    expect(astronomy.observingWindowEligibility('sun', target(60), sky(60, -1, 0, 0, 0))).toBe(false);

    var interpolationSamples = [
      { step: 0, body: target(18), sky: sky(-13, -1, 0, 0, 0) },
      { step: 0.25, body: target(22), sky: sky(-13, -1, 0, 0, 0) },
      { step: 0.5, body: target(28), sky: sky(-13, -1, 0, 0, 0) },
      { step: 0.75, body: target(24), sky: sky(-13, -1, 0, 0, 0) },
      { step: 1, body: target(16), sky: sky(-13, -1, 0, 0, 0) }
    ];
    var available = astronomy.buildObservingWindows(interpolationSamples, 'planet');
    expect(available.state).toBe('available');
    expect(available.intervals).toHaveLength(1);
    expect(available.intervals[0].start).toBeCloseTo(0.125, 6);
    expect(available.intervals[0].end).toBeCloseTo(0.875, 6);
    expect(available.selected).toEqual(available.intervals[0]);
    expect(available.peak).toEqual({ step: 0.5, altitude: 28 });

    var none = astronomy.buildObservingWindows(interpolationSamples.map(function(sample) {
      return { step: sample.step, body: target(8), sky: sample.sky };
    }), 'planet');
    expect(none.state).toBe('none');
    expect(none.intervals).toEqual([]);
    expect(none.selected).toBeNull();
    expect(none.peak).toBeNull();

    var solar = astronomy.buildObservingWindows(interpolationSamples, 'sun');
    expect(solar.state).toBe('not-applicable');
    expect(solar.intervals).toEqual([]);
    expect(solar.selected).toBeNull();
    expect(solar.peak).toBeNull();
  });

  it('splits hidden Moon-rule gaps and never bridges invalid or missing quarter-hour samples', () => {
    function starSample(step, illumination, moonRa) {
      return {
        step: step,
        body: { alt: 30, ra: 0, dec: 0 },
        sky: {
          sun: { alt: -20 },
          moon: { alt: 30, ra: moonRa, dec: 0, phase: { illum: illumination } }
        }
      };
    }

    // Both endpoints are eligible, but for different branches of the Moon OR rule:
    // illumination stops qualifying before angular separation begins qualifying.
    var moonBranchSwitch = astronomy.buildObservingWindows([
      starSample(0, 0.20, 40),
      starSample(0.25, 0.40, 80)
    ], 'star');
    expect(moonBranchSwitch.state).toBe('available');
    expect(moonBranchSwitch.intervals).toHaveLength(2);
    expect(moonBranchSwitch.intervals[0].start).toBeCloseTo(0, 8);
    expect(moonBranchSwitch.intervals[0].end).toBeCloseTo(0.0625, 6);
    expect(moonBranchSwitch.intervals[1].start).toBeCloseTo(0.125, 6);
    expect(moonBranchSwitch.intervals[1].end).toBeCloseTo(0.25, 8);

    var eligible = function(step) { return starSample(step, 0.1, 10); };
    var invalidGap = astronomy.buildObservingWindows([
      eligible(0), eligible(0.25),
      { step: 0.5, body: null, sky: null },
      eligible(0.75), eligible(1)
    ], 'star');
    expect(invalidGap.intervals).toEqual([{ start: 0, end: 0.25 }, { start: 0.75, end: 1 }]);

    var missingQuarterHours = astronomy.buildObservingWindows([
      eligible(0), eligible(0.25), eligible(0.75), eligible(1)
    ], 'star');
    expect(missingQuarterHours.intervals).toEqual([{ start: 0, end: 0.25 }, { start: 0.75, end: 1 }]);
    [invalidGap, missingQuarterHours].forEach(function(model) {
      expect(model.intervals.some(function(interval) {
        return interval.start < 0.5 && interval.end > 0.5;
      })).toBe(false);
    });
  });
  it('renders accessible suggested-window rails for Sun, Moon, stars, planets, and no-window states', () => {
    vi.useFakeTimers();
    var baseInstant = new Date('2026-01-15T05:00:00.000Z');
    vi.setSystemTime(baseInstant);
    var lat = 43.66, lon = -70.26;
    var snapshotCache = {};
    function snapshotsFor(dayOffset) {
      if (snapshotCache[dayOffset]) return snapshotCache[dayOffset];
      var snapshots = [];
      for (var quarter = 0; quarter <= 48; quarter++) {
        var step = quarter / 4;
        var instant = new Date(baseInstant.getTime() + dayOffset * 86400000 + step * 3600000);
        snapshots.push({
          step: step, time: instant,
          sky: astronomy.skyNow(
            instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
            instant.getUTCHours() + instant.getUTCMinutes() / 60, lat, lon
          )
        });
      }
      snapshotCache[dayOffset] = snapshots;
      return snapshots;
    }

    function bodyAt(snapshot, targetId) {
      if (targetId === 'sun') return snapshot.sun;
      if (targetId === 'moon') return snapshot.moon;
      if (targetId.indexOf('planet:') === 0) {
        return snapshot.planets.find(function(body) { return body.id === targetId.slice(7); });
      }
      return snapshot.stars.find(function(body) { return 'star:' + body.name === targetId; });
    }
    function samplesFor(targetId, dayOffset) {
      return snapshotsFor(dayOffset).map(function(sample) {
        return { step: sample.step, time: sample.time, body: bodyAt(sample.sky, targetId), sky: sample.sky };
      });
    }
    function targetIds(kind, dayOffset) {
      var snapshot = snapshotsFor(dayOffset)[0].sky;
      if (kind === 'moon') return ['moon'];
      if (kind === 'planet') return snapshot.planets.map(function(body) { return 'planet:' + body.id; });
      return snapshot.stars.filter(function(body) { return body.mag <= 1.5; }).map(function(body) { return 'star:' + body.name; });
    }
    function findFixture(kind, state, preferredIds) {
      for (var dayOffset = 0; dayOffset <= 35; dayOffset++) {
        var ids = (preferredIds || []).concat(targetIds(kind, dayOffset).filter(function(id) {
          return (preferredIds || []).indexOf(id) < 0;
        }));
        for (var index = 0; index < ids.length; index++) {
          var outcome = astronomy.buildObservingWindows(samplesFor(ids[index], dayOffset), kind);
          if (outcome.state === state) return { id: ids[index], dayOffset: dayOffset, outcome: outcome };
        }
      }
      throw new Error('No deterministic ' + kind + ' fixture with state ' + state);
    }
    function findSpecialFixture(predicate) {
      var kinds = ['star', 'planet', 'moon'];
      for (var dayOffset = 0; dayOffset <= 370; dayOffset++) {
        for (var kindIndex = 0; kindIndex < kinds.length; kindIndex++) {
          var kind = kinds[kindIndex];
          var ids = targetIds(kind, dayOffset);
          for (var idIndex = 0; idIndex < ids.length; idIndex++) {
            var outcome = astronomy.buildObservingWindows(samplesFor(ids[idIndex], dayOffset), kind);
            if (predicate(outcome, kind, ids[idIndex])) {
              return { id: ids[idIndex], dayOffset: dayOffset, kind: kind, outcome: outcome };
            }
          }
        }
      }
      throw new Error('No deterministic observing-window fixture matched the final audit predicate');
    }
    function renderFixture(fixture, bortle) {
      return parseMarkup(renderAstronomy({
        tab: 'skymap', skyLoc: 'portland', skyTarget: fixture.id,
        skyDayOffset: fixture.dayOffset, bortleClass: bortle == null ? 5 : bortle
      }));
    }
    function inspectWindow(document, expectedKind, expectedState) {
      var timeline = document.querySelector('#astronomy-sky-target-timeline');
      var windowGuide = timeline && timeline.querySelector('[data-sky-observing-window]');
      expect(windowGuide).toBeTruthy();
      expect(windowGuide.getAttribute('data-kind')).toBe(expectedKind);
      expect(windowGuide.getAttribute('data-state')).toBe(expectedState);
      expect(windowGuide.getAttribute('aria-label')).toBe('Observing guidance');
      expect(windowGuide.querySelector('[data-sky-observing-window-rail]')).toBeTruthy();
      var summary = windowGuide.querySelector('[data-sky-observing-window-summary]');
      var criteria = windowGuide.querySelector('[data-sky-observing-window-criteria]');
      expect(summary && summary.textContent.trim().length).toBeGreaterThan(0);
      expect(criteria && criteria.textContent.trim().length).toBeGreaterThan(0);
      expect(timeline.querySelector('svg[data-sky-target-timeline] desc').textContent).toMatch(/suggested observing window/i);
      expect(windowGuide.querySelector('[data-score], [data-quality-score], [data-sky-quality-score]')).toBeNull();
      expect(windowGuide.textContent).not.toMatch(/\b(?:quality|visibility|observing)\s+score\s*[:=]?\s*\d/i);
      expect(Number.parseFloat(criteria.style.fontSize)).toBeGreaterThanOrEqual(11);
      var accessibleCopy = [summary.textContent, criteria.textContent,
        timeline.querySelector('svg[data-sky-target-timeline] desc').textContent].join(' ');
      expect(accessibleCopy).not.toMatch(/Ãƒ|Ã‚|Ã¢[â‚¬â€šÅ“â„¢â‚¬â€œâ€]/);
      return windowGuide;
    }

    var moonFixture = findFixture('moon', 'available', ['moon']);
    var starFixture = findFixture('star', 'available', ['star:Sirius']);
    var planetFixture = findFixture('planet', 'available', ['planet:jupiter']);
    var noWindowFixture = findFixture('star', 'none', ['star:Canopus']);
    var multipleFixture = findSpecialFixture(function(outcome) {
      return outcome.state === 'available' && outcome.intervals.length > 1 && outcome.selected;
    });
    var chartEdgeFixture = findSpecialFixture(function(outcome) {
      return outcome.state === 'available' && outcome.selected &&
        outcome.selected.start > 0.001 && outcome.selected.end >= 11.999;
    });
    var documents = {
      sun: parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: 'sun' })),
      moon: renderFixture(moonFixture), star: renderFixture(starFixture),
      planet: renderFixture(planetFixture), none: renderFixture(noWindowFixture),
      multiple: renderFixture(multipleFixture), edge: renderFixture(chartEdgeFixture)
    };

    var sunWindow = inspectWindow(documents.sun, 'sun', 'not-applicable');
    var moonWindow = inspectWindow(documents.moon, 'moon', 'available');
    var starWindow = inspectWindow(documents.star, 'star', 'available');
    var planetWindow = inspectWindow(documents.planet, 'planet', 'available');
    var noneWindow = inspectWindow(documents.none, 'star', 'none');
    var multipleWindow = inspectWindow(documents.multiple, multipleFixture.kind, 'available');
    var edgeWindow = inspectWindow(documents.edge, chartEdgeFixture.kind, 'available');

    function hatchSwatches(windowGuide) {
      return Array.from(windowGuide.querySelectorAll(
        '[data-sky-observing-window-swatch], [data-sky-observing-window-summary] [aria-hidden]'
      )).filter(function(element) {
        return element.hasAttribute('data-sky-observing-window-swatch') ||
          String(element.style.background || '').indexOf('repeating-linear-gradient') >= 0;
      });
    }
    expect(sunWindow.querySelectorAll('[data-sky-observing-window-segment]')).toHaveLength(0);
    expect(sunWindow.querySelector('[data-sky-observing-window-summary]').textContent).toMatch(/certified.*solar|solar.*filter/i);
    expect(sunWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/no dark-sky window applies/i);
    expect(noneWindow.querySelectorAll('[data-sky-observing-window-segment]')).toHaveLength(0);
    expect(noneWindow.querySelector('[data-sky-observing-window-summary]').textContent).toMatch(/no suggested observing window/i);
    expect(hatchSwatches(sunWindow)).toHaveLength(0);
    expect(hatchSwatches(noneWindow)).toHaveLength(0);

    [moonWindow, starWindow, planetWindow].forEach(function(windowGuide) {
      var segments = Array.from(windowGuide.querySelectorAll('[data-sky-observing-window-segment]'));
      expect(segments.length).toBeGreaterThan(0);
      var previousEnd = -Infinity;
      segments.forEach(function(segment) {
        var start = Number(segment.getAttribute('data-start-hour'));
        var end = Number(segment.getAttribute('data-end-hour'));
        expect([start, end].every(Number.isFinite)).toBe(true);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(12);
        expect(end).toBeGreaterThan(start);
        expect(start).toBeGreaterThanOrEqual(previousEnd);
        previousEnd = end;
      });
    });
    expect(moonWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/20.*(?:altitude|degree)|altitude.*20/i);
    expect(planetWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/20.*(?:altitude|degree)|altitude.*20/i);
    expect(planetWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Sun.*-?12|-?12.*Sun/i);
    expect(planetWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Moon.*(?:does not|is not|never)|(?:does not|is not|never).*Moon/i);
    expect(starWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/20.*(?:altitude|degree)|altitude.*20/i);
    expect(starWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Sun.*-?18|-?18.*Sun/i);
    expect(starWindow.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Moon/i);

    var selectedInterval = multipleFixture.outcome.selected;
    var multipleRailSegments = Array.from(multipleWindow.querySelectorAll('[data-sky-observing-window-segment]'));
    var multipleOverlay = documents.multiple.querySelector('[data-sky-observing-window-overlay]');
    expect(multipleFixture.outcome.intervals.length).toBeGreaterThan(1);
    expect(multipleRailSegments).toHaveLength(1);
    expect(multipleOverlay.children).toHaveLength(1);
    expect(Number(multipleRailSegments[0].getAttribute('data-start-hour'))).toBeCloseTo(selectedInterval.start, 6);
    expect(Number(multipleRailSegments[0].getAttribute('data-end-hour'))).toBeCloseTo(selectedInterval.end, 6);
    var additionalCount = multipleFixture.outcome.intervals.length - 1;
    expect(multipleWindow.querySelector('[data-sky-observing-window-summary]').textContent)
      .toContain(additionalCount + ' additional qualifying interval');

    var edgeSummary = edgeWindow.querySelector('[data-sky-observing-window-summary]').textContent;
    expect(edgeSummary).toContain('through the end of this 12-hour chart');
    expect(edgeSummary).not.toMatch(/\bat least\b/i);
    var roundedStart = Math.round(chartEdgeFixture.outcome.selected.start * 2) / 2;
    var expectedStart = new Date(baseInstant.getTime() + chartEdgeFixture.dayOffset * 86400000 + roundedStart * 3600000)
      .toLocaleString(undefined, {
        timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      });
    expect(edgeSummary).toContain(expectedStart);
    expect(edgeSummary).toMatch(/\b(?:EST|EDT)\b/);
    var shownMinutes = Array.from(edgeSummary.matchAll(/:(\d{2})/g)).map(function(match) { return match[1]; });
    expect(shownMinutes.length).toBeGreaterThan(0);
    shownMinutes.forEach(function(minutes) { expect(['00', '30']).toContain(minutes); });

    Object.keys(documents).forEach(function(key) {
      expect(documents[key].querySelectorAll('[role="group"][aria-label="Sky map layers"] button')).toHaveLength(5);
    });

    var bortleOne = renderFixture(starFixture, 1);
    var bortleNine = renderFixture(starFixture, 9);
    function endpointPairs(document) {
      return Array.from(document.querySelectorAll('[data-sky-observing-window-segment]')).map(function(segment) {
        return [segment.getAttribute('data-start-hour'), segment.getAttribute('data-end-hour')];
      });
    }
    var lowPollution = inspectWindow(bortleOne, 'star', 'available');
    var highPollution = inspectWindow(bortleNine, 'star', 'available');
    expect(endpointPairs(bortleOne)).toEqual(endpointPairs(bortleNine));
    expect(lowPollution.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Bortle\s+1/i);
    expect(highPollution.querySelector('[data-sky-observing-window-criteria]').textContent).toMatch(/Bortle\s+9/i);
    expect(lowPollution.querySelector('[data-sky-observing-window-criteria]').textContent)
      .not.toBe(highPollution.querySelector('[data-sky-observing-window-criteria]').textContent);
  }, 120000);
  it('renders an accessible twelve-hour altitude and twilight timeline for the selected target', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({
      tab: 'skymap', skyLoc: 'portland', skyTarget: 'moon'
    }));
    var timeline = document.querySelector('#astronomy-sky-target-timeline');
    var figure = timeline && timeline.querySelector('svg[data-sky-target-timeline]');

    expect(timeline).toBeTruthy();
    expect(timeline.getAttribute('data-sky-target')).toBe('moon');
    expect(figure).toBeTruthy();
    expect(figure.getAttribute('role')).toBe('img');
    expect(figure.getAttribute('data-duration-hours')).toBe('12');
    expect(figure.style.maxWidth).toBe('100%');

    var labelledBy = String(figure.getAttribute('aria-labelledby') || '').trim().split(/\s+/).filter(Boolean);
    expect(labelledBy).toHaveLength(2);
    var title = document.getElementById(labelledBy[0]);
    var description = document.getElementById(labelledBy[1]);
    expect(title && title.tagName.toLowerCase()).toBe('title');
    expect(description && description.tagName.toLowerCase()).toBe('desc');
    expect(title.textContent).toContain('Moon');
    expect(description.textContent).toMatch(/12[- ]hour/i);

    var viewBox = String(figure.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
    expect(viewBox).toHaveLength(4);
    expect(viewBox.every(Number.isFinite)).toBe(true);
    expect(viewBox[2]).toBeGreaterThan(0);
    expect(viewBox[3]).toBeGreaterThan(0);

    expect(figure.querySelector('[data-sky-axis="x"]')).toBeTruthy();
    expect(figure.querySelector('[data-sky-axis="y"]')).toBeTruthy();
    expect(figure.querySelector('[data-sky-horizon]')).toBeTruthy();
    var altitudePath = figure.querySelector('[data-sky-altitude-path]');
    expect(altitudePath).toBeTruthy();
    expect(altitudePath.getAttribute('d')).toMatch(/^M/i);
    expect(altitudePath.getAttribute('d')).not.toMatch(/NaN|Infinity|undefined/i);

    var twilightGroup = figure.querySelector('[data-sky-twilight-bands]');
    var bands = Array.from(twilightGroup ? twilightGroup.querySelectorAll('[data-twilight-band]') : []);
    var allowedBands = ['night', 'astronomical', 'nautical', 'civil', 'daylight'];
    expect(twilightGroup).toBeTruthy();
    expect(bands.length).toBeGreaterThan(0);
    var coverage = bands.map(function(band) {
      var start = Number(band.getAttribute('data-start-hour'));
      var end = Number(band.getAttribute('data-end-hour'));
      expect(allowedBands).toContain(band.getAttribute('data-twilight-band'));
      expect(Number.isFinite(start)).toBe(true);
      expect(Number.isFinite(end)).toBe(true);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(12);
      expect(end).toBeGreaterThan(start);
      return { start: start, end: end };
    }).sort(function(first, second) { return first.start - second.start; });
    expect(coverage[0].start).toBeCloseTo(0, 6);
    expect(coverage[coverage.length - 1].end).toBeCloseTo(12, 6);
    coverage.slice(1).forEach(function(span, index) {
      expect(span.start).toBeCloseTo(coverage[index].end, 6);
    });

    var samples = Array.from(figure.querySelectorAll('[data-sky-altitude-sample]'));
    expect(samples).toHaveLength(13);
    var previousHour = -Infinity;
    samples.forEach(function(sample) {
      var hour = Number(sample.getAttribute('data-hour-offset'));
      var altitude = Number(sample.getAttribute('data-altitude'));
      var x = Number(sample.getAttribute('cx') || sample.getAttribute('x') || sample.getAttribute('data-x'));
      var y = Number(sample.getAttribute('cy') || sample.getAttribute('y') || sample.getAttribute('data-y'));
      expect([hour, altitude, x, y].every(Number.isFinite)).toBe(true);
      expect(hour).toBeGreaterThanOrEqual(previousHour);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(12);
      expect(altitude).toBeGreaterThanOrEqual(-90);
      expect(altitude).toBeLessThanOrEqual(90);
      expect(x).toBeGreaterThanOrEqual(viewBox[0]);
      expect(x).toBeLessThanOrEqual(viewBox[0] + viewBox[2]);
      expect(y).toBeGreaterThanOrEqual(viewBox[1]);
      expect(y).toBeLessThanOrEqual(viewBox[1] + viewBox[3]);
      previousHour = hour;
    });
    expect(Number(samples[0].getAttribute('data-hour-offset'))).toBeCloseTo(0, 6);
    expect(Number(samples[samples.length - 1].getAttribute('data-hour-offset'))).toBeCloseTo(12, 6);

    var twilightKey = timeline.querySelector('[aria-label="Twilight key"]');
    expect(twilightKey).toBeTruthy();
    ['Night', 'Astronomical', 'Nautical', 'Civil', 'Daylight'].forEach(function(label) {
      expect(twilightKey.textContent).toContain(label);
    });

    var controlledIds = String(document.querySelector('#astronomy-sky-target').getAttribute('aria-controls') || '').split(/\s+/);
    expect(controlledIds).toEqual(expect.arrayContaining([
      'astronomy-sky-map-diagram', 'astronomy-sky-target-timeline'
    ]));
  }, 60000);

  it('updates timeline linkage and altitude geometry when the selected target changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T05:00:00.000Z'));
    var moonDocument = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: 'moon' }));
    var sunDocument = parseMarkup(renderAstronomy({ tab: 'skymap', skyLoc: 'portland', skyTarget: 'sun' }));
    var moonTimeline = moonDocument.querySelector('#astronomy-sky-target-timeline');
    var sunTimeline = sunDocument.querySelector('#astronomy-sky-target-timeline');
    var moonFigure = moonTimeline.querySelector('[data-sky-target-timeline]');
    var sunFigure = sunTimeline.querySelector('[data-sky-target-timeline]');
    var sampleValues = function(figure) {
      return Array.from(figure.querySelectorAll('[data-sky-altitude-sample]')).map(function(sample) {
        return [sample.getAttribute('data-hour-offset'), sample.getAttribute('data-altitude')];
      });
    };

    expect(moonTimeline.getAttribute('data-sky-target')).toBe('moon');
    expect(sunTimeline.getAttribute('data-sky-target')).toBe('sun');
    expect(moonFigure.querySelector('title').textContent).toContain('Moon');
    expect(sunFigure.querySelector('title').textContent).toContain('Sun');
    expect(sunFigure.querySelector('[data-sky-altitude-path]').getAttribute('d'))
      .not.toBe(moonFigure.querySelector('[data-sky-altitude-path]').getAttribute('d'));
    expect(sampleValues(sunFigure)).not.toEqual(sampleValues(moonFigure));
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
    var edgeStop = diagram.querySelector('#astronomy-sky-horizon-haze stop[offset="100%"]');
    expect(guide).toBeTruthy();
    expect(edgeStop).toBeTruthy();
    var effectiveEdge = compositeOver(edgeStop.getAttribute('stop-color'), horizon.getAttribute('fill'), Number(edgeStop.getAttribute('stop-opacity')));
    var composited = compositeOver(guide.getAttribute('stroke'), effectiveEdge, Number(guide.getAttribute('opacity') || 1));
    expect(contrastRatio(composited, effectiveEdge)).toBeGreaterThanOrEqual(3);

    var neutralPlanetLabel = Array.from(diagram.querySelectorAll('text[fill="#f8fafc"]')).find(function(label) {
      return label.textContent.trim().length > 1;
    });
    expect(neutralPlanetLabel).toBeTruthy();
    expect(contrastRatio(neutralPlanetLabel.getAttribute('fill'), effectiveEdge)).toBeGreaterThanOrEqual(4.5);
  }, 60000);

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
