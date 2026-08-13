import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_astronomy.js';

function renderAstronomy(state) {
  return renderTool('astronomy', {
    astronomy: Object.assign({ observingList: [] }, state || {})
  });
}

function parseMarkup(html) {
  return new window.DOMParser().parseFromString(html, 'text/html');
}

function renderAstronomyAtPortlandLatitude(latitude, state) {
  var source = readFileSync(resolve(process.cwd(), SOURCE_PATH), 'utf8');
  var portlandLatitude = /(\{ id: 'portland', name: 'Portland, Maine', lat: )-?\d+(?:\.\d+)?/;
  var instrumented = source.replace(portlandLatitude, function(match, prefix) {
    return prefix + String(latitude);
  });
  if (instrumented === source) throw new Error('Could not instrument the Portland observer latitude');
  resetStemLab();
  // Test-only observer fixture: production locations remain untouched.
  // eslint-disable-next-line no-new-func
  new Function(instrumented)();
  return parseMarkup(renderAstronomy(Object.assign({
    tab: 'seasons', skyLoc: 'portland', bortleClass: 5
  }, state || {})));
}

function findNorthernWinterGrazingLatitude(profile, year, month, day) {
  var lowerLatitude = 60;
  var upperLatitude = 89;
  var targetDaylightHours = 2.5 / 60;
  for (var iteration = 0; iteration < 64; iteration += 1) {
    var latitude = (lowerLatitude + upperLatitude) / 2;
    if (profile(year, month, day, latitude, 15).daylightHours > targetDaylightHours) {
      lowerLatitude = latitude;
    } else {
      upperLatitude = latitude;
    }
  }
  return lowerLatitude;
}

function expectFiniteProfile(profile) {
  expect(['normal', 'polar-day', 'polar-night']).toContain(profile.state);
  expect(Number.isFinite(profile.daylightHours)).toBe(true);
  expect(Number.isFinite(profile.declinationDeg)).toBe(true);
  expect(profile.samples).toHaveLength(97);
  expect(profile.samples[0].t).toBe(0);
  expect(profile.samples[96].t).toBe(24);
  profile.samples.forEach(function(sample, index) {
    expect(Object.keys(sample).sort()).toEqual(['altitude', 't']);
    expect(Number.isFinite(sample.t)).toBe(true);
    expect(Number.isFinite(sample.altitude)).toBe(true);
    expect(sample.t).toBeCloseTo(index / 4, 10);
    expect(sample.altitude).toBeGreaterThanOrEqual(-90);
    expect(sample.altitude).toBeLessThanOrEqual(90);
  });
  expect(profile.solarNoon).toBeTruthy();
  expect(Object.keys(profile.solarNoon).sort()).toEqual(['altitude', 't']);
  expect(Number.isFinite(profile.solarNoon.t)).toBe(true);
  expect(Number.isFinite(profile.solarNoon.altitude)).toBe(true);
  expect(profile.solarNoon.altitude).toBeGreaterThanOrEqual(-90);
  expect(profile.solarNoon.altitude).toBeLessThanOrEqual(90);
}

function sunPathSignature(document) {
  var figure = document.querySelector('#astronomy-season-sun-path');
  return {
    state: figure.getAttribute('data-solar-state'),
    date: figure.getAttribute('data-date'),
    daylight: figure.getAttribute('data-daylight-hours'),
    noon: figure.getAttribute('data-noon-altitude'),
    path: figure.querySelector('[data-solar-altitude-path]').getAttribute('d'),
    fill: figure.querySelector('[data-solar-daylight-fill]').getAttribute('d') ||
      figure.querySelector('[data-solar-daylight-fill]').getAttribute('points'),
    samples: Array.from(figure.querySelectorAll('[data-solar-sample]')).map(function(sample) {
      return [
        sample.getAttribute('data-local-solar-hour'),
        sample.getAttribute('data-altitude'),
        sample.getAttribute('cx'),
        sample.getAttribute('cy')
      ];
    }),
    sunrise: Array.from(figure.querySelector('[data-solar-sunrise]').attributes).map(function(attribute) {
      return [attribute.name, attribute.value];
    }),
    sunset: Array.from(figure.querySelector('[data-solar-sunset]').attributes).map(function(attribute) {
      return [attribute.name, attribute.value];
    }),
    solarNoon: Array.from(figure.querySelector('[data-solar-noon]').attributes).map(function(attribute) {
      return [attribute.name, attribute.value];
    })
  };
}

beforeEach(() => {
  vi.useRealTimers();
  resetStemLab();
  loadTool(SOURCE_PATH, 'astronomy');
});

describe('Astronomy geometric solar-day profile', () => {
  it('samples a finite local-solar day and reproduces the equinox at the equator', () => {
    var solarDaylightProfile = window.__alloAstroPure.solarDaylightProfile;
    expect(typeof solarDaylightProfile).toBe('function');

    var equinox = solarDaylightProfile(2026, 3, 20, 0, 15);
    expectFiniteProfile(equinox);
    expect(equinox.state).toBe('normal');
    expect(equinox.daylightHours).toBeCloseTo(12, 1);
    expect(equinox.solarNoon.t).toBeCloseTo(12, 6);
    expect(equinox.solarNoon.altitude).toBeGreaterThan(89);
    expect(Number.isFinite(equinox.sunriseSolarHour)).toBe(true);
    expect(Number.isFinite(equinox.sunsetSolarHour)).toBe(true);
    expect(equinox.sunriseSolarHour).toBeLessThan(equinox.solarNoon.t);
    expect(equinox.sunsetSolarHour).toBeGreaterThan(equinox.solarNoon.t);
    expect(equinox.sunsetSolarHour - equinox.sunriseSolarHour)
      .toBeCloseTo(equinox.daylightHours, 6);
  });

  it('reverses the solstice relationship by hemisphere and keeps Quito near twelve hours', () => {
    var profile = window.__alloAstroPure.solarDaylightProfile;
    var portlandJune = profile(2026, 6, 15, 43.66, 15);
    var portlandDecember = profile(2026, 12, 15, 43.66, 15);
    var sydneyJune = profile(2026, 6, 15, -33.87, 15);
    var sydneyDecember = profile(2026, 12, 15, -33.87, 15);
    var quitoJune = profile(2026, 6, 15, -0.18, 15);
    var quitoDecember = profile(2026, 12, 15, -0.18, 15);
    [portlandJune, portlandDecember, sydneyJune, sydneyDecember, quitoJune, quitoDecember]
      .forEach(expectFiniteProfile);

    expect(portlandJune.daylightHours).toBeGreaterThan(portlandDecember.daylightHours);
    expect(portlandJune.solarNoon.altitude).toBeGreaterThan(portlandDecember.solarNoon.altitude);
    expect(sydneyDecember.daylightHours).toBeGreaterThan(sydneyJune.daylightHours);
    expect(sydneyDecember.solarNoon.altitude).toBeGreaterThan(sydneyJune.solarNoon.altitude);
    expect(quitoJune.daylightHours).toBeCloseTo(12, 1);
    expect(quitoDecember.daylightHours).toBeCloseTo(12, 1);
  });

  it('reports polar day and polar night without invented sunrise or sunset times', () => {
    var profile = window.__alloAstroPure.solarDaylightProfile;
    var polarDay = profile(2026, 6, 15, 80, 15);
    var polarNight = profile(2026, 12, 15, 80, 15);
    [polarDay, polarNight].forEach(expectFiniteProfile);

    expect(polarDay.state).toBe('polar-day');
    expect(polarDay.daylightHours).toBe(24);
    expect(polarDay.sunriseSolarHour).toBeNull();
    expect(polarDay.sunsetSolarHour).toBeNull();
    expect(Math.min.apply(Math, polarDay.samples.map(function(sample) { return sample.altitude; })))
      .toBeGreaterThan(0);

    expect(polarNight.state).toBe('polar-night');
    expect(polarNight.daylightHours).toBe(0);
    expect(polarNight.sunriseSolarHour).toBeNull();
    expect(polarNight.sunsetSolarHour).toBeNull();
    expect(Math.max.apply(Math, polarNight.samples.map(function(sample) { return sample.altitude; })))
      .toBeLessThan(0);
  });
});

describe('Astronomy Seasons observer Sun path', () => {
  it('renders a named geometric Sun path for the shared observer location', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T16:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({
      tab: 'seasons', seasonMonth: 6, skyLoc: 'portland', bortleClass: 5
    }));
    var observer = document.querySelector('#astronomy-season-observer');
    var figure = document.querySelector('#astronomy-season-sun-path');
    var status = document.querySelector('#astronomy-season-sun-status');
    var conciseStatus = document.querySelector('#astronomy-season-status');

    expect(observer).toBeTruthy();
    expect(observer.tagName).toBe('SELECT');
    expect(observer.value).toBe('portland');
    expect(Array.from(observer.options).map(function(option) { return option.value; }))
      .toEqual(['portland', 'nyc', 'la', 'london', 'quito', 'sydney']);

    expect(figure).toBeTruthy();
    expect(figure.getAttribute('role')).toBe('img');
    expect(figure.getAttribute('viewBox')).toBe('0 0 360 190');
    expect(figure.getAttribute('data-solar-state')).toBe('normal');
    expect(figure.getAttribute('data-date')).toBe('2026-06-15');
    expect(Number.isFinite(Number(figure.getAttribute('data-daylight-hours')))).toBe(true);
    expect(Number.isFinite(Number(figure.getAttribute('data-noon-altitude')))).toBe(true);

    var labelledBy = String(figure.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    expect(labelledBy).toHaveLength(2);
    expect(document.getElementById(labelledBy[0]).tagName.toLowerCase()).toBe('title');
    expect(document.getElementById(labelledBy[1]).tagName.toLowerCase()).toBe('desc');
    expect(document.getElementById(labelledBy[0]).textContent).toMatch(/Sun path.*Portland|Portland.*Sun path/i);
    expect(document.getElementById(labelledBy[1]).textContent).toMatch(/geometric/i);

    expect(figure.querySelector('[data-solar-axis="x"]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-axis="y"]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-horizon]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-altitude-path]').getAttribute('d')).toMatch(/^M/i);
    expect(figure.querySelector('[data-solar-altitude-path]').getAttribute('d'))
      .not.toMatch(/NaN|Infinity|undefined/i);
    expect(figure.querySelector('[data-solar-daylight-fill]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-noon]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-sunrise]')).toBeTruthy();
    expect(figure.querySelector('[data-solar-sunset]')).toBeTruthy();

    var samples = Array.from(figure.querySelectorAll('[data-solar-sample]'));
    expect(samples).toHaveLength(97);
    samples.forEach(function(sample, index) {
      var localSolarHour = Number(sample.getAttribute('data-local-solar-hour'));
      var altitude = Number(sample.getAttribute('data-altitude'));
      var x = Number(sample.getAttribute('cx'));
      var y = Number(sample.getAttribute('cy'));
      expect([localSolarHour, altitude, x, y].every(Number.isFinite)).toBe(true);
      expect(localSolarHour).toBeCloseTo(index / 4, 6);
      expect(altitude).toBeGreaterThanOrEqual(-90);
      expect(altitude).toBeLessThanOrEqual(90);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(360);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(190);
    });

    expect(status).toBeTruthy();
    expect(status.hasAttribute('role')).toBe(false);
    expect(status.hasAttribute('aria-live')).toBe(false);
    expect(String(observer.getAttribute('aria-describedby') || '').split(/\s+/))
      .toContain('astronomy-season-sun-status');
    expect(status.textContent).toMatch(/Portland/i);
    expect(status.textContent).toMatch(/daylight/i);
    expect(status.textContent).toMatch(/solar noon/i);
    expect(status.textContent).toMatch(/local solar time/i);
    expect(status.textContent).toMatch(/geometric/i);
    expect(status.textContent).toMatch(/refraction[^.]*not modeled|does not model[^.]*refraction/i);

    expect(conciseStatus).toBeTruthy();
    expect(conciseStatus.getAttribute('role')).toBe('status');
    expect(conciseStatus.getAttribute('aria-live')).toBe('polite');
    expect(conciseStatus.getAttribute('aria-atomic')).toBe('true');
    expect(conciseStatus.textContent).toMatch(/meteorological/i);
    expect(Array.from(document.querySelectorAll('[aria-live="polite"]')))
      .toEqual([conciseStatus]);
  });

  it('qualifies month-based seasons as meteorological and does not overgeneralize an equinox', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T16:00:00.000Z'));
    var document = parseMarkup(renderAstronomy({
      tab: 'seasons', seasonMonth: 3, skyLoc: 'portland', bortleClass: 5
    }));
    var conciseStatus = document.querySelector('#astronomy-season-status');

    expect(conciseStatus.textContent).toMatch(/meteorological/i);
    expect(document.body.textContent).toMatch(/equinox/i);
    expect(document.body.textContent).not.toMatch(/day and night[^.]*equal everywhere/i);
  });

  it('fills polar day, leaves polar night unfilled, and separates noon from the polar label', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T16:00:00.000Z'));
    var polarDayDocument = renderAstronomyAtPortlandLatitude(80, { seasonMonth: 6 });
    var polarNightDocument = renderAstronomyAtPortlandLatitude(80, { seasonMonth: 12 });
    var polarDayFigure = polarDayDocument.querySelector('#astronomy-season-sun-path');
    var polarNightFigure = polarNightDocument.querySelector('#astronomy-season-sun-path');
    var polarDayLabel = polarDayFigure.querySelector('[data-solar-polar-state]');
    var polarNightLabel = polarNightFigure.querySelector('[data-solar-polar-state]');

    expect(polarDayFigure.getAttribute('data-solar-state')).toBe('polar-day');
    expect(polarDayFigure.querySelector('[data-solar-daylight-fill]')).toBeTruthy();
    expect(polarDayFigure.querySelector('[data-solar-daylight-fill]').getAttribute('d'))
      .not.toMatch(/NaN|Infinity|undefined/i);
    expect(polarDayFigure.querySelector('[data-solar-sunrise]')).toBeNull();
    expect(polarDayFigure.querySelector('[data-solar-sunset]')).toBeNull();
    expect(polarDayFigure.querySelector('[data-solar-noon]')).toBeTruthy();
    expect(polarDayLabel).toBeTruthy();
    expect(polarDayLabel.textContent).toMatch(/polar day/i);

    expect(polarNightFigure.getAttribute('data-solar-state')).toBe('polar-night');
    expect(polarNightFigure.querySelector('[data-solar-daylight-fill]')).toBeNull();
    expect(polarNightFigure.querySelector('[data-solar-sunrise]')).toBeNull();
    expect(polarNightFigure.querySelector('[data-solar-sunset]')).toBeNull();
    expect(polarNightFigure.querySelector('[data-solar-noon]')).toBeTruthy();
    expect(polarNightLabel).toBeTruthy();
    expect(polarNightLabel.textContent).toMatch(/polar night/i);

    [
      [polarDayFigure, polarDayLabel],
      [polarNightFigure, polarNightLabel]
    ].forEach(function(pair) {
      var noonLabel = pair[0].querySelector('[data-solar-noon] text');
      var noonY = Number(noonLabel.getAttribute('y'));
      var polarY = Number(pair[1].getAttribute('y'));
      expect(Number.isFinite(noonY) && Number.isFinite(polarY)).toBe(true);
      expect(Math.abs(noonY - polarY)).toBeGreaterThanOrEqual(20);
    });
  });

  it('does not emit separate rise and set labels for a sub-five-minute grazing day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T16:00:00.000Z'));
    var profile = window.__alloAstroPure.solarDaylightProfile;
    var grazingLatitude = findNorthernWinterGrazingLatitude(profile, 2026, 12, 15);
    var grazingProfile = profile(2026, 12, 15, grazingLatitude, 15);
    expect(grazingProfile.state).toBe('normal');
    expect(grazingProfile.daylightHours).toBeGreaterThan(0);
    expect(grazingProfile.daylightHours * 60).toBeLessThan(5);

    var document = renderAstronomyAtPortlandLatitude(grazingLatitude, { seasonMonth: 12 });
    var figure = document.querySelector('#astronomy-season-sun-path');
    expect(figure.getAttribute('data-solar-state')).toBe('normal');
    expect(Number(figure.getAttribute('data-daylight-hours')) * 60).toBeLessThan(5);
    expect(figure.querySelectorAll('[data-solar-sunrise] text')).toHaveLength(0);
    expect(figure.querySelectorAll('[data-solar-sunset] text')).toHaveLength(0);
    expect(figure.textContent).not.toMatch(/\bRise\s+\d|\bSet\s+\d/i);
  });

  it('keeps the geometric Sun path independent of Bortle context', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T16:00:00.000Z'));
    var classOne = parseMarkup(renderAstronomy({
      tab: 'seasons', seasonMonth: 12, skyLoc: 'sydney', bortleClass: 1
    }));
    var classNine = parseMarkup(renderAstronomy({
      tab: 'seasons', seasonMonth: 12, skyLoc: 'sydney', bortleClass: 9
    }));

    expect(classOne.querySelector('#astronomy-season-observer').value).toBe('sydney');
    expect(classNine.querySelector('#astronomy-season-observer').value).toBe('sydney');
    expect(sunPathSignature(classOne)).toEqual(sunPathSignature(classNine));
    expect(classOne.querySelector('#astronomy-season-sun-status').textContent)
      .toBe(classNine.querySelector('#astronomy-season-sun-status').textContent);
    expect(classOne.querySelector('#astronomy-season-sun-path').getAttribute('data-date'))
      .toBe('2026-12-15');
  });
});
