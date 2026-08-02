import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_weathersystems.js';

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'weatherSystems');
});

describe('Weather Systems science kernel', () => {
  it('calculates a plausible dew point and keeps it below air temperature', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.dewPointC(25, 72)).toBeGreaterThan(18);
    expect(kernel.dewPointC(25, 72)).toBeLessThan(25);
  });

  it('models a cold-front passage as cooler air and recovering pressure', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const before = kernel.projectConditions(state, 2);
    const after = kernel.projectConditions(state, 10);
    expect(after.temperature).toBeLessThan(before.temperature);
    expect(after.windDir).not.toBe(before.windDir);
    expect(after.pressure).toBeGreaterThan(kernel.projectConditions(state, 5).pressure);
  });

  it('builds a station meteogram around the modeled front-passage hour', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const central = { id: 'central', name: 'Central School', x: 0.48, y: 0.66, elevation: 90 };
    const series = kernel.stationTimeSeries(state, central, 12, 1);
    expect(kernel.frontPassageHour(state, central)).toBe(2.8);
    expect(series.points).toHaveLength(13);
    expect(series.before.airMass).toBe('ahead');
    expect(series.after.airMass).toBe('behind');
    expect(series.deltas.temperature).toBeLessThan(0);
    expect(series.deltas.pressure).toBeGreaterThan(0);
    expect(series.deltas.windShift).toBeGreaterThanOrEqual(70);
  });

  it('compares two scenario patterns at a synchronized model hour', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront', simHour: 6 });
    const comparison = kernel.compareScenarioPatterns(state, 'fair', 6);
    expect(comparison.hour).toBe(6);
    expect(comparison.activeScenario.id).toBe('coldFront');
    expect(comparison.comparisonScenario.id).toBe('fair');
    expect(comparison.metrics).toHaveLength(6);
    expect(comparison.strongest).toBeTruthy();
    expect(comparison.strongest.normalizedDifference).toBeGreaterThan(0);
    expect(comparison.controlled).toBe(false);
  });

  it('builds a deterministic nine-member ensemble with bounded agreement', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'winterStorm' });
    const ensemble = kernel.ensembleForecast(state);
    expect(ensemble.members).toHaveLength(9);
    expect(Object.values(ensemble.counts).reduce((sum, count) => sum + count, 0)).toBe(9);
    expect(ensemble.agreement).toBeGreaterThanOrEqual(1 / 9);
    expect(ensemble.agreement).toBeLessThanOrEqual(1);
    expect(ensemble.temperatureRange[0]).toBeLessThan(ensemble.temperatureRange[1]);
  });

  it('tracks a moving air-mass boundary across the station network', () => {
    const kernel = window.WeatherSystemsKernel;
    const initial = kernel.stationNetworkAnalysis(kernel.resolvedState({ scenario: 'coldFront', simHour: 0 }));
    const later = kernel.stationNetworkAnalysis(kernel.resolvedState({ scenario: 'coldFront', simHour: 6 }));
    expect(initial.observations).toHaveLength(4);
    expect(initial.pairs).toHaveLength(3);
    expect(initial.strongest.id).toBe('west-central');
    expect(later.strongest.id).toBe('north-coast');
    expect(later.strongest.windShift).toBeGreaterThanOrEqual(70);
    expect(later.strongest.left.airMass).toBe('behind');
    expect(later.strongest.right.airMass).toBe('ahead');
  });

  it('isolates one variable in a controlled weather experiment', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'fair' });
    const result = kernel.runExperiment(state, 'humidity', 90, 6);
    expect(result.baselineValue).toBe(42);
    expect(result.testValue).toBe(90);
    expect(result.hour).toBe(6);
    expect(result.test.humidity).toBeGreaterThan(result.control.humidity);
    expect(result.test.precipPotential).toBeGreaterThan(result.control.precipPotential);
    expect(result.direction).toBe('increase');
  });

  it('maps modeled hazards to actionable school decisions', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.readinessActionForHazard('lightning')).toBe('indoors');
    expect(kernel.readinessActionForHazard('flood')).toBe('avoidTravel');
    expect(kernel.readinessActionForHazard('ice')).toBe('delayTravel');
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const scored = kernel.scoreForecast(state, { precip: 'storms', timing: '4-6', hazard: 'lightning', action: 'indoors', evidence: ['pressure', 'front', 'radar'] });
    expect(scored.actionCorrect).toBe(true);
    expect(scored.expectedAction).toBe('indoors');
  });
  it('calibrates student confidence against ensemble agreement', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const agreement = kernel.ensembleForecast(state).agreement * 100;
    const near = kernel.calibrateConfidence(state, agreement);
    expect(near.status).toBe('well');
    expect(near.label).toBe('Well calibrated');
    const low = kernel.calibrateConfidence(state, 40);
    expect(['well', 'under']).toContain(low.status);
  });
  it('rewards forecast evidence without allowing evidence alone to pass', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const weak = kernel.scoreForecast(state, { precip: 'none', timing: 'after12', hazard: 'none', evidence: ['pressure', 'front', 'radar'] });
    const strong = kernel.scoreForecast(state, { precip: 'storms', timing: '4-6', hazard: 'lightning', evidence: ['pressure', 'front', 'radar'] });
    expect(weak.score).toBeLessThan(50);
    expect(strong.score).toBe(100);
  });

  it('normalizes a live weather observation for the immersive scene', () => {
    const kernel = window.WeatherSystemsKernel;
    const live = kernel.normalizeLiveWeatherResponse({
      timezone: 'America/New_York', timezone_abbreviation: 'EDT', utc_offset_seconds: -14400,
      current: {
        time: '2026-07-16T14:00', temperature_2m: 28.4, relative_humidity_2m: 74,
        precipitation: 1.2, weather_code: 95, cloud_cover: 88, surface_pressure: 1004.6,
        wind_speed_10m: 22.1, wind_direction_10m: 215, visibility: 8400
      }
    }, 'Portland, Maine, United States', 43.6591, -70.2568);
    expect(live.label).toBe('Portland, Maine, United States');
    expect(live.latitude).toBe(43.6591);
    expect(live.longitude).toBe(-70.2568);
    expect(live.condition).toBe('Thunderstorms');
    expect(live.cloudCover).toBe(88);
    expect(live.visibility).toBe(8400);
    expect(live.utcOffsetSeconds).toBe(-14400);
    expect(live.source).toBe('Open-Meteo');
    expect(() => kernel.normalizeLiveWeatherResponse({}, 'Missing', 0, 0)).toThrow(/current conditions/);
  });

  it('labels observation freshness and discovers compatible 3D building layers', () => {
    const kernel = window.WeatherSystemsKernel;
    const now = Date.parse('2026-07-22T12:00:00Z');
    expect(kernel.liveObservationFreshness({ observedAt: '2026-07-22T11:30:00Z' }, now)).toEqual(expect.objectContaining({
      code: 'current', current: true, stale: false, ageMinutes: 30, badge: 'LIVE'
    }));
    expect(kernel.liveObservationFreshness({ observedAt: '2026-07-22T08:00:00Z' }, now)).toEqual(expect.objectContaining({
      code: 'recent', current: false, stale: false, ageMinutes: 240, badge: 'RECENT'
    }));
    expect(kernel.liveObservationFreshness({ observedAt: '2026-07-21T12:00:00Z' }, now)).toEqual(expect.objectContaining({
      code: 'stale', current: false, stale: true, ageMinutes: 1440, badge: 'SAVED'
    }));
    expect(kernel.liveObservationFreshness({ observedAt: '2026-07-22T07:30', utcOffsetSeconds: -14400 }, now).ageMinutes).toBe(30);
    expect(kernel.liveObservationFreshness({}, now).code).toBe('unknown');
    expect(kernel.geographicBuildingLayerIds({ layers: [
      { id: 'water', type: 'fill' },
      { id: 'structures-3d', type: 'fill-extrusion', 'source-layer': 'building' },
      { id: 'building-labels', type: 'symbol' }
    ] })).toEqual(['structures-3d']);
    expect(kernel.geographicBuildingLayerIds(null)).toEqual([]);
    expect(kernel.geographicOrientationSummary(-18)).toEqual({ bearing: -18, northRotation: 18, label: 'North is 18\u00B0 right of screen top.' });
    expect(kernel.geographicOrientationSummary(0).label).toBe('North is aligned with screen top.');
    expect(kernel.geographicOrientationSummary(200)).toEqual({ bearing: -160, northRotation: 160, label: 'North is 160\u00B0 right of screen top.' });
  });

  it('normalizes hourly weather and selects an explicit observed or forecast hour', () => {
    const kernel = window.WeatherSystemsKernel;
    const live = {
      label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
      observedAt: '2026-07-25T12:00', timezone: 'EDT', temperature: 20, humidity: 70,
      precipitation: 0, weatherCode: 2, cloudCover: 50, pressure: 1012,
      windSpeed: 10, windDir: 180, visibility: 10000
    };
    const timeline = kernel.normalizeHourlyWeatherTimeline({
      hourly: {
        time: ['2026-07-25T11:00', '2026-07-25T12:00', '2026-07-25T13:00', '2026-07-25T14:00'],
        temperature_2m: [19, 20, 22, 24],
        relative_humidity_2m: [74, 70, 65, 60],
        precipitation: [0, 0, 0.4, 1.2],
        weather_code: [2, 2, 61, 95],
        cloud_cover: [45, 50, 78, 92],
        surface_pressure: [1013, 1012, 1010, 1007],
        wind_speed_10m: [8, 10, 16, 24],
        wind_direction_10m: [170, 180, 200, 220],
        visibility: [10000, 10000, 8500, 6000]
      }
    }, live);
    expect(timeline.map((point) => point.role)).toEqual(['earlier', 'current', 'forecast', 'forecast']);
    expect(timeline.map((point) => point.offsetHours)).toEqual([-1, 0, 1, 2]);
    expect(kernel.weatherTimelineCurrentIndex(timeline)).toBe(1);
    const selected = kernel.activeLiveWeather({ liveWeather: live, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 3 });
    expect(selected).toEqual(expect.objectContaining({
      validAt: '2026-07-25T14:00', timelineRole: 'forecast', timelineOffsetHours: 2,
      temperature: 24, precipitation: 1.2, condition: 'Thunderstorms', windDir: 220
    }));
    expect(kernel.weatherTimelineLabel(selected, 'EDT')).toBe('+2 h forecast | 2026-07-25 14:00 EDT');
    expect(kernel.geographicTerrainEvidenceStatus({ location: live.label, validAt: selected.validAt }, selected).current).toBe(true);
    expect(kernel.geographicTerrainEvidenceStatus({ location: live.label, validAt: '2026-07-25T13:00' }, selected).code).toBe('observation');
  });


  it('builds a normalized 25-point regional model field with truthful valid-time status', () => {
    const kernel = window.WeatherSystemsKernel;
    const coordinates = kernel.regionalWeatherGridCoordinates(43.6591, -70.2568, 25, 5);
    expect(coordinates).toHaveLength(25);
    expect(coordinates[0].bounds).toHaveLength(4);
    const payload = coordinates.map((point, index) => ({
      hourly: {
        time: ['2026-07-25T14:00'], temperature_2m: [18 + index / 4], precipitation: [index % 4 / 10],
        cloud_cover: [40 + index], surface_pressure: [1005 + index / 5],
        wind_speed_10m: [8 + index / 2], wind_direction_10m: [180 + index]
      }
    }));
    const field = kernel.normalizeRegionalWeatherField(payload, coordinates, '2026-07-25T14:00');
    Object.assign(field, { latitude: 43.6591, longitude: -70.2568, location: 'Portland, Maine' });
    expect(field.sampleCount).toBe(25);
    expect(field.stats.temperature.max).toBe(24);
    const geo = kernel.regionalWeatherFieldGeoJSON(field, 'temperature');
    expect(geo.polygons.features).toHaveLength(25);
    expect(geo.points.features).toHaveLength(25);
    expect(geo.legend).toEqual(expect.objectContaining({ label: 'Temperature', unit: '\u00B0C' }));
    const active = { latitude: 43.6591, longitude: -70.2568, validAt: '2026-07-25T14:00' };
    expect(kernel.regionalWeatherFieldStatus(field, active).code).toBe('ready');
    expect(kernel.regionalWeatherFieldStatus(field, { ...active, validAt: '2026-07-25T15:00' }).code).toBe('time');
  });

  it('compares a saved forecast checkpoint with the matching later observation', () => {
    const kernel = window.WeatherSystemsKernel;
    const checkpoint = {
      latitude: 43.6591, longitude: -70.2568, validAt: '2026-07-25T14:00',
      predicted: { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 220, weatherCode: 95 }
    };
    const live = { latitude: 43.6591, longitude: -70.2568 };
    const pending = kernel.forecastCheckpointStatus(checkpoint, [{ time: checkpoint.validAt, role: 'forecast' }], live);
    expect(pending.code).toBe('pending');
    const result = kernel.forecastCheckpointStatus(checkpoint, [{
      time: checkpoint.validAt, role: 'earlier', temperature: 22, precipitation: 0.7,
      pressure: 1009, windSpeed: 18, windDir: 200, weatherCode: 61
    }], live);
    expect(result.code).toBe('verified');
    expect(result.metrics.temperature.error).toBe(2);
    expect(result.metrics.pressure.error).toBe(-2);
    expect(result.metrics.windDirection.error).toBe(20);
    expect(result.conditionMatch).toBe(false);
  });

  it('accepts decimal and hemisphere coordinate location formats', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.parseLocationCoordinates('42.3601, -71.0589')).toEqual({ latitude: 42.3601, longitude: -71.0589 });
    expect(kernel.parseLocationCoordinates('42.3601 N, 71.0589 W')).toEqual({ latitude: 42.3601, longitude: -71.0589 });
    expect(kernel.parseLocationCoordinates('33.8688 S; 151.2093 E')).toEqual({ latitude: -33.8688, longitude: 151.2093 });
    expect(kernel.parseLocationCoordinates('91, 20')).toBeNull();
    expect(kernel.parseLocationCoordinates('Paris, France')).toBeNull();
  });

  it('builds resilient location queries and ranks structured matches', () => {
    const kernel = window.WeatherSystemsKernel;
    const fields = { city: ' Boston ', region: ' MA ', postalCode: ' 02108 ', country: ' United States ' };
    expect(kernel.buildLocationQuery(fields)).toBe('Boston, MA, 02108, United States');
    expect(kernel.locationSearchCandidates('Boston, MA, 02108, United States', fields)).toEqual(expect.arrayContaining([
      'Boston, MA, 02108, United States', 'Boston, MA, United States', 'Boston', '02108'
    ]));
    expect(kernel.locationSearchCandidates('Tokyo Japan')).toEqual(expect.arrayContaining(['Tokyo Japan', 'Tokyo']));
    const best = kernel.chooseLocationResult([
      { name: 'Boston', admin1: 'Lincolnshire', country: 'United Kingdom', country_code: 'GB' },
      { name: 'Boston', admin1: 'Massachusetts', country: 'United States', country_code: 'US' }
    ], fields);
    expect(best.admin1).toBe('Massachusetts');
  });

  it('returns isolated, immutable 3D analysis-focus layer profiles', () => {
    const kernel = window.WeatherSystemsKernel;
    const front = kernel.immersiveFocusProfile('front');
    expect(front.id).toBe('front');
    expect(front.layers.airMasses).toBe(true);
    expect(front.layers.front).toBe(true);
    expect(front.layers.clouds).toBe(false);
    expect(front.layers.precipitation).toBe(false);
    expect(front.layers.wind).toBe(true);
    front.layers.wind = false;
    expect(kernel.immersiveFocusProfile('front').layers.wind).toBe(true);
    expect(kernel.immersiveFocusProfile('unknown').id).toBe('system');
  });


  it('redacts shared locations while preserving safe session round trips and handoffs', () => {
    const kernel = window.WeatherSystemsKernel;
    const capture = {
      feature: { label: 'Cloud layer' }, location: { label: 'Boston, MA' }, source: 'Teaching model', validAt: 'T+6 hours',
      focus: 'clouds', cameraPreset: 'close', values: { temperature: 18, humidity: 82, cloudCover: 76, precipitation: 3, pressure: 1008, windSpeed: 22, windDir: 245 },
      note: 'Clouds thicken as the moist air rises.', limitation: 'A teaching model is not satellite imagery.'
    };
    const redacted = kernel.immersiveSessionSharePayload({ liveLocationQuery: 'Boston, MA', immersiveEvidenceCaptures: [capture] }, { includeLocation: false });
    expect(redacted.weatherSystems.liveLocationQuery).toBeUndefined();
    expect(redacted.weatherSystems.immersiveEvidenceCaptures[0].location.label).toBe('Location redacted for sharing.');
    const included = kernel.immersiveSessionSharePayload({ liveLocationQuery: 'Boston, MA', immersiveEvidenceCaptures: [capture] }, { includeLocation: true });
    expect(included.weatherSystems.liveLocationQuery).toBe('Boston, MA');
    expect(included.weatherSystems.immersiveEvidenceCaptures[0].location.label).toBe('Boston, MA');
    const validated = kernel.validateImmersiveSessionPayload({ schema: 'weather-immersive-session-v1', scenario: 'summerStorm', currentState: { simHour: 36, temperature: 12 }, weatherSystems: { liveLocationCity: 'Boston', liveWeatherTimeline: Array.from({ length: 60 }, (_, index) => ({ hour: index })), liveWeatherTimelineIndex: 4 } });
    expect(validated.liveLocationCity).toBe('Boston');
    expect(validated.scenario).toBe('summerStorm');
    expect(validated.simHour).toBe(24);
    expect(validated.temp).toBe(12);
    expect(validated.liveWeatherTimeline).toHaveLength(48);
    expect(validated.liveWeatherTimelineIndex).toBe(4);
    expect(kernel.validateImmersiveSessionPayload({ schema: 'unknown', weatherSystems: {} })).toBeNull();
    const handoff = kernel.immersiveEvidenceHandoffText(capture);
    expect(handoff).toContain('Feature: Cloud layer');
    expect(handoff).toContain('Location: Boston, MA');
    expect(handoff).toContain('Temperature: 18');
    expect(handoff).toContain('A teaching model is not satellite imagery.');
  });

  it('flags incomplete evidence captures before a teacher hands them off', () => {
    const kernel = window.WeatherSystemsKernel;
    const ready = kernel.immersiveEvidenceCaptureReview({ feature: { label: 'Cloud layer' }, source: 'Teaching model', validAt: 'T+6 hours', values: { humidity: 80 }, note: 'I notice thicker clouds.' });
    expect(ready.ready).toBe(true);
    expect(ready.score).toBe(100);
    expect(ready.label).toBe('Ready to hand off');
    const needsReview = kernel.immersiveEvidenceCaptureReview({ feature: { label: 'Cloud layer' }, source: 'Teaching model', validAt: 'T+6 hours', values: {} });
    expect(needsReview.ready).toBe(false);
    expect(needsReview.missing).toEqual(expect.arrayContaining(['values', 'learner note']));
    const summary = kernel.immersiveEvidenceReviewSummary([{ feature: { label: 'Cloud layer' }, source: 'Teaching model', validAt: 'T+6 hours', values: { humidity: 80 }, note: 'I notice thicker clouds.' }, { feature: { label: 'Cloud layer' }, source: 'Teaching model', validAt: 'T+6 hours', values: {} }, { feature: { label: 'Terrain' }, source: 'Teaching model', validAt: 'T+6 hours', location: { label: 'Location redacted for sharing.' }, values: { humidity: 60 } }]);
    expect(summary.count).toBe(3);
    expect(summary.readyCount).toBe(1);
    expect(summary.noteCount).toBe(2);
    expect(summary.redactedCount).toBe(1);
  });

  it('turns two captures into bounded Claim Evidence Reasoning prompts', () => {
    const kernel = window.WeatherSystemsKernel;
    const baseline = { id: 'baseline', feature: { id: 'cloudLayer', label: 'Cloud layer' }, validAt: 'T+0 hours', values: { temperature: 18, humidity: 80, cloudCover: 60, pressure: 1008, windSpeed: 20 } };
    const comparison = { id: 'comparison', feature: { id: 'cloudLayer', label: 'Cloud layer' }, validAt: 'T+6 hours', values: { temperature: 21, humidity: 70, cloudCover: 84, pressure: 1003, windSpeed: 28 } };
    const result = kernel.immersiveCaptureComparison(baseline, comparison);
    expect(result.changedMetrics.map((metric) => metric.id)).toEqual(expect.arrayContaining(['temperature', 'humidity', 'cloudCover', 'pressure', 'windSpeed']));
    expect(result.summary).toContain('Temperature +3');
    expect(result.claimPrompt).toContain('T+0 hours');
    expect(result.evidencePrompt).toContain('Cloud cover');
    expect(result.reasoningPrompt).toContain('remains uncertain');
    expect(kernel.immersiveCaptureComparison(baseline, baseline)).toBeNull();
    expect(kernel.immersiveCaptureClaimHandoffText(result)).toContain('Measured changes');
    expect(kernel.immersiveCaptureClaimHandoffText(result)).toContain('Reasoning prompt');
  });

  it('sanitizes and round-trips local immersive lesson presets', () => {
    const kernel = window.WeatherSystemsKernel;
    const preset = kernel.immersiveLessonPresetPayload({
      immersiveSceneMode: 'conceptual', immersiveDataSource: 'model', immersiveFocus: 'front', immersiveCameraPreset: 'front',
      liveLocationCity: 'Boston', immersiveEvidenceCaptures: [{ id: 'capture-1', note: 'Do not copy captures into presets.' }]
    }, '  Front   warm-up  ', { id: 'preset-1', savedAt: '2026-08-01T12:00:00Z' });
    expect(preset.name).toBe('Front warm-up');
    expect(preset.weatherSystems.immersiveEvidenceCaptures).toBeUndefined();
    expect(preset.weatherSystems.liveLocationCity).toBe('Boston');
    const imported = kernel.validateImmersiveLessonPreset(preset);
    expect(imported.id).toBe('preset-1');
    expect(kernel.immersiveLessonPresetDescription(imported)).toContain('Front dynamics');
    expect(kernel.immersiveLessonPresetList([preset, preset, { schema: 'bad' }])).toHaveLength(1);
    const session = kernel.immersiveSessionDownloadPayload({ immersiveLessonPresets: [preset], immersiveLessonPresetActiveId: 'preset-1' });
    expect(session.immersiveLessonPresets).toHaveLength(1);
    expect(session.weatherSystems.immersiveLessonPresetActiveId).toBe('preset-1');
    const restored = kernel.validateImmersiveSessionPayload(session);
    expect(restored.immersiveLessonPresets).toHaveLength(1);
    expect(restored.immersiveLessonPresetActiveId).toBe('preset-1');
  });

  it('provides grade-responsive immersive feature definitions and truthful scene narration', () => {
    const kernel = window.WeatherSystemsKernel;
    const secondary = kernel.immersiveFeatureGlossary('conceptual', '9-12');
    const elementary = kernel.immersiveFeatureGlossary('conceptual', '3-5');
    const geographic = kernel.immersiveFeatureGlossary('geographic', '6-8');
    expect(secondary.map((item) => item.id)).toEqual(expect.arrayContaining(['airMasses', 'frontBoundary', 'cloudLayer', 'windVectors', 'stationMarkers']));
    expect(geographic.map((item) => item.id)).toEqual(expect.arrayContaining(['observationSite', 'terrainTransect', 'regionalField', 'mapLabels']));
    expect(elementary.find((item) => item.id === 'frontBoundary').definition).toContain('meeting place');
    expect(secondary.find((item) => item.id === 'frontBoundary').definition).toContain('transition zone');
    secondary[0].label = 'Changed';
    expect(kernel.immersiveFeatureGlossary('conceptual', '9-12')[0].label).not.toBe('Changed');
    const conceptualDescription = kernel.immersiveSceneDescription({
      mode: 'conceptual', focusLabel: 'front dynamics', weather: { condition: 'Rain', temperature: 18 },
      selectedFeature: kernel.immersiveFeatureById('conceptual', 'frontBoundary', '9-12')
    });
    expect(conceptualDescription).toContain('conceptual 3D teaching model');
    expect(conceptualDescription).toContain('explanatory encodings rather than literal atmospheric scale');
    const geographicDescription = kernel.immersiveSceneDescription({ mode: 'geographic', location: 'Portland, Maine', regionalLayer: 'Temperature', validAt: '2026-07-25T14:00' });
    expect(geographicDescription).toContain('interactive geographic 3D map centered on Portland, Maine');
    expect(geographicDescription).toContain('Basemap features, model values, and teaching overlays have separate sources');
  });

  it('maps immersive features to immutable, scientifically described connections', () => {
    const kernel = window.WeatherSystemsKernel;
    const frontLinks = kernel.immersiveFeatureConnections('conceptual', 'frontBoundary', '9-12');
    expect(frontLinks.map((item) => item.id)).toEqual(['airMasses', 'cloudLayer', 'windVectors']);
    expect(frontLinks.find((item) => item.id === 'cloudLayer').relation).toContain('cool moist air toward cloud formation');
    const geographicLinks = kernel.immersiveFeatureConnections('geographic', 'terrainTransect', '6-8');
    expect(geographicLinks.map((item) => item.id)).toEqual(['terrainSurface', 'downwindVector', 'observationSite']);
    frontLinks[0].label = 'Changed';
    expect(kernel.immersiveFeatureConnections('conceptual', 'frontBoundary', '9-12')[0].label).toBe('Air masses');
    expect(kernel.immersiveFeatureConnections('conceptual', 'unknown', '9-12')).toEqual([]);
  });

  it('builds grade-responsive feature comparisons without inventing causal claims', () => {
    const kernel = window.WeatherSystemsKernel;
    const direct = kernel.immersiveFeatureComparison('conceptual', 'airMasses', 'frontBoundary', '9-12');
    expect(direct).toEqual(expect.objectContaining({
      direct: true,
      relationshipDirection: 'anchor-to-focus'
    }));
    expect(direct.anchor.label).toBe('Air masses');
    expect(direct.focus.label).toBe('Front boundary');
    expect(direct.relationshipSummary).toContain('Contrasting air masses meet along the frontal transition zone');
    expect(direct.categorySummary).toContain('Both features are in the atmosphere category');
    expect(direct.comparisonQuestion).toContain('which parts remain an inference');

    const early = kernel.immersiveFeatureComparison('conceptual', 'cloudLayer', 'precipitation', '3-5');
    expect(early.direct).toBe(true);
    expect(early.comparisonQuestion).toBe('What changes in one feature when the other feature changes?');

    const indirect = kernel.immersiveFeatureComparison('conceptual', 'airMasses', 'precipitation', '9-12');
    expect(indirect.direct).toBe(false);
    expect(indirect.relationshipDirection).toBe('none');
    expect(indirect.relationshipSummary).toContain('does not claim a single direct cause');
    expect(indirect.comparisonQuestion).toContain('before proposing a connection');
    expect(kernel.immersiveFeatureComparison('conceptual', 'airMasses', 'airMasses', '9-12')).toBeNull();
    expect(kernel.immersiveFeatureComparison('conceptual', 'unknown', 'frontBoundary', '9-12')).toBeNull();
  });

  it('separates contextual evidence, visual encoding, and scientific limitations', () => {
    const kernel = window.WeatherSystemsKernel;
    const cloud = kernel.immersiveFeatureEvidence('cloudLayer', {
      mode: 'conceptual', band: '3-5', sourceKind: 'model', sourceLabel: 'Teaching model | T+6 hours',
      weather: { temperature: 20, humidity: 85, cloudCover: 78 }
    });
    expect(cloud.sourceBadge).toBe('Teaching model');
    expect(cloud.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Relative humidity', value: '85%', kind: 'model' }),
      expect.objectContaining({ label: 'Cloud cover', value: '78%', kind: 'model' })
    ]));
    expect(cloud.metrics.find((metric) => metric.label === 'Temperature–dew point spread').value).toMatch(/°C$/);
    expect(cloud.interpretation).toContain('Moist air that cools enough can make clouds');
    expect(cloud.encoding).toContain('simplified sphere clusters');
    expect(cloud.limitation).toContain('not satellite imagery');

    const studyArea = kernel.immersiveFeatureEvidence('studyArea', {
      mode: 'geographic', band: '6-8', sourceKind: 'observation', location: 'Portland, Maine', studyRadius: 12,
      weather: { temperature: 21, humidity: 70 }
    });
    expect(studyArea).toEqual(expect.objectContaining({
      sourceKind: 'overlay', sourceBadge: 'Teaching overlay',
      sourceLabel: 'Teaching overlay centered on Portland, Maine'
    }));
    expect(studyArea.metrics).toContainEqual(expect.objectContaining({ label: 'Study radius', value: '12 km' }));
    expect(studyArea.limitation).toContain('not a warning polygon');

    const terrain = kernel.immersiveFeatureEvidence('terrainSurface', {
      mode: 'geographic', band: '9-12', sourceKind: 'forecast', location: 'Portland, Maine',
      elevation: 19, terrainExaggeration: 1.5, weather: {}
    });
    expect(terrain.sourceKind).toBe('map');
    expect(terrain.sourceBadge).toBe('Published map context');

    const stations = kernel.immersiveFeatureEvidence('stationMarkers', {
      mode: 'conceptual', band: '9-12', sourceKind: 'observation', sourceLabel: 'Current observation',
      stationLabel: 'Central School', weather: { temperature: 24, windDir: 180, windSpeed: 12 }
    });
    expect(stations.sourceKind).toBe('mixed');
    expect(stations.sourceBadge).toBe('Mixed evidence');
    expect(stations.metrics).toContainEqual(expect.objectContaining({ label: 'Station layer', value: 'Conceptual markers', kind: 'encoding' }));
  });

  it('resolves selectable 3D feature metadata through nested scene objects', () => {
    const kernel = window.WeatherSystemsKernel;
    const featureRoot = { userData: { weatherFeatureId: 'cloudLayer' }, parent: null };
    const cluster = { userData: {}, parent: featureRoot };
    const cloudMesh = { parent: cluster };
    expect(kernel.immersivePickableFeatureId(cloudMesh)).toBe('cloudLayer');
    expect(kernel.immersivePickableFeatureId(featureRoot)).toBe('cloudLayer');
    expect(kernel.immersivePickableFeatureId({ userData: {}, parent: null })).toBe('');
    expect(kernel.immersivePickableFeatureId(null)).toBe('');
  });

  it('coordinates geographic camera and evidence layers through immutable analysis views', () => {
    const kernel = window.WeatherSystemsKernel;
    const context = kernel.geographicAnalysisLens('context');
    expect(context).toEqual(expect.objectContaining({
      id: 'context', camera: 'region',
      layers: { studyArea: true, wind: true, transect: false, buildings: false }
    }));
    expect(kernel.geographicAnalysisLens('site')).toEqual(expect.objectContaining({
      id: 'site', camera: 'site',
      layers: { studyArea: false, wind: true, transect: false, buildings: true }
    }));
    expect(kernel.geographicAnalysisLens('unknown').id).toBe('terrain');
    context.layers.wind = false;
    expect(kernel.geographicAnalysisLens('context').layers.wind).toBe(true);
    const region = kernel.geographicCameraView('region');
    expect(region).toEqual({ id: 'region', label: 'regional context', zoom: 8.3, pitch: 38, bearing: 0 });
    region.zoom = 3;
    expect(kernel.geographicCameraView('region').zoom).toBe(8.3);
    expect(kernel.geographicCameraView('unknown').id).toBe('local');
  });

  it('sequences the geographic field investigation through coordinated map views', () => {
    const kernel = window.WeatherSystemsKernel;
    const orient = kernel.geographicInvestigationStep();
    expect(orient).toEqual(expect.objectContaining({
      id: 'orient', index: 0, total: 4, nextId: 'terrain', lens: 'context'
    }));
    expect(orient.prompt).toContain('which direction is downwind');
    const site = kernel.geographicInvestigationStep('site');
    expect(site).toEqual(expect.objectContaining({
      index: 2, nextId: 'claim', lens: 'site'
    }));
    expect(kernel.geographicInvestigationStep('claim').nextId).toBe('orient');
    orient.label = 'Changed';
    expect(kernel.geographicInvestigationStep().label).toBe('Orient the system');
    expect(kernel.geographicInvestigationStep('unknown').id).toBe('orient');
  });

it('selects realistic immersive geography profiles for scenarios', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.geographyProfile('mountain', 'coldFront').label).toBe('Mountain valley');
    expect(kernel.geographyProfile(null, 'winterStorm').id).toBe('coastal');
    expect(kernel.geographyProfile('unknown', 'summerStorm').id).toBe('urban');
    const profile = kernel.geographyProfile('coastal', 'fair');
    profile.label = 'Changed';
    expect(kernel.geographyProfile('coastal', 'fair').label).toBe('Coastal watershed');
  });

it('returns a sequenced immersive investigation tour step', () => {
    const kernel = window.WeatherSystemsKernel;
    const front = kernel.immersiveTourStep('front');
    expect(front.index).toBe(1);
    expect(front.total).toBe(4);
    expect(front.camera).toBe('front');
    expect(front.focus).toBe('front');
    expect(front.nextId).toBe('moisture');
    expect(front.prompt).toContain('air being lifted');
    expect(kernel.immersiveTourStep('unknown').id).toBe('scan');
  });

  it('tracks guided immersive completion and links captures to investigation steps', () => {
    const kernel = window.WeatherSystemsKernel;
    const progress = kernel.immersiveTourProgress({
      immersiveTourStep: 'front',
      immersiveTourCompletedSteps: ['scan', 'front', 'front', 'unknown'],
      immersiveEvidenceCaptures: [{ tourStepId: 'front', note: 'The boundary rises.' }, { tourStepId: 'front', note: '' }]
    });
    expect(progress.activeStep.id).toBe('front');
    const handoff = kernel.immersiveTourHandoffText({
      scenario: 'coldFront', immersiveSceneMode: 'conceptual', immersiveDataSource: 'model', immersiveTourStep: 'front',
      immersiveTourCompletedSteps: ['scan'], immersiveReflection: 'The learner connects the boundary to cloud growth.'
    });
    expect(handoff).toContain('Weather Systems Guided Investigation Brief');
    expect(handoff).toContain('[x] 1. Scan the system');
    expect(handoff).toContain('[ ] 2. Inspect the front');
    expect(handoff).toContain('Progress: 1/4 steps complete');
    expect(handoff).toContain('Location: Excluded by default for privacy');
    expect(handoff).toContain('The learner connects the boundary to cloud growth.');
    expect(progress.completedCount).toBe(2);
    expect(progress.steps.find((step) => step.id === 'front').captureCount).toBe(2);
    expect(progress.steps.find((step) => step.id === 'front').noteCount).toBe(1);
    expect(kernel.immersiveTourCompletedStepList(['scan', 'unknown', 'scan'])).toEqual(['scan']);
    const shared = kernel.immersiveSessionSharePayload({ immersiveTourStep: 'front', immersiveTourCompletedSteps: ['scan', 'front', 'unknown'], immersiveReflection: 'A concise evidence note.' });
    expect(shared.weatherSystems.immersiveTourStep).toBe('front');
    expect(shared.weatherSystems.immersiveTourCompletedSteps).toEqual(['scan', 'front']);
    expect(shared.weatherSystems.immersiveReflection).toBe('A concise evidence note.');
    const staged = kernel.immersiveSessionSharePayload({ immersiveStageMode: true });
    expect(staged.weatherSystems.immersiveStageMode).toBe(true);
    const localPayload = kernel.immersiveLocalWorkspacePayload({
      immersiveTourStep: 'front', immersiveTourCompletedSteps: ['scan'], immersiveReflection: 'Resume this local investigation.', immersiveLessonPresets: []
    });
    expect(localPayload.schema).toBe('weather-immersive-local-v1');
    const localRestored = kernel.validateImmersiveLocalWorkspacePayload(localPayload);
    expect(localRestored.immersiveTourStep).toBe('front');
    expect(localRestored.immersiveTourCompletedSteps).toEqual(['scan']);
    expect(localRestored.immersiveReflection).toBe('Resume this local investigation.');
    expect(kernel.validateImmersiveLocalWorkspacePayload({ schema: 'bad' })).toBeNull();
    const preset = kernel.immersiveLessonPresetPayload({ immersiveTourStep: 'front', immersiveTourCompletedSteps: ['scan'], immersiveReflection: 'Keep learner reasoning out of reusable presets.' }, 'Scene only', { id: 'scene-only' });
    expect(preset.weatherSystems.immersiveTourStep).toBeUndefined();
    expect(preset.weatherSystems.immersiveTourCompletedSteps).toBeUndefined();
    expect(preset.weatherSystems.immersiveReflection).toBeUndefined();
  });

  it('normalizes geographic metadata and safely resolves the immersive scene mode', () => {
    const kernel = window.WeatherSystemsKernel;
    const metadata = kernel.geographicMetadata(43.659123, -70.256789, 'Portland, Maine, United States', {
      name: 'Portland', admin1: 'Maine', admin2: 'Cumberland', country: 'United States',
      country_code: 'US', elevation: 18.7
    });
    expect(metadata).toEqual(expect.objectContaining({
      latitude: 43.6591, longitude: -70.2568, locality: 'Portland', admin1: 'Maine',
      admin2: 'Cumberland', countryCode: 'US', elevation: 19
    }));
    const geographic = kernel.geographicViewState({
      immersiveSceneMode: 'geographic',
      liveWeather: { label: metadata.label, latitude: metadata.latitude, longitude: metadata.longitude },
      liveGeography: metadata
    });
    expect(geographic.mode).toBe('geographic');
    expect(geographic.available).toBe(true);
    expect(geographic.context).toBe('Cumberland, Maine, United States');
    expect(geographic.elevation).toBe(19);
    expect(kernel.geographicViewState({ immersiveSceneMode: 'geographic' }).mode).toBe('conceptual');
    expect(kernel.geographicViewState({ liveWeather: { latitude: 100, longitude: 20 } }).available).toBe(false);
  });

  it('publishes the approved open geographic source endpoints', () => {
    const sources = window.WeatherSystemsKernel.geographicMapSources;
    expect(sources.mapStyle).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(sources.terrain).toBe('https://tiles.mapterhorn.com/tilejson.json');
    expect(sources.mapLibreScript).toContain('maplibre-gl@5.24.0');
    expect(sources.mapLibreCss).toContain('maplibre-gl@5.24.0');
  });

  it('builds true-scale geographic study areas and live downwind vectors', () => {
    const kernel = window.WeatherSystemsKernel;
    const north = kernel.geographicDestination(-70.2568, 43.6591, 0, 10);
    expect(north[0]).toBeCloseTo(-70.2568, 3);
    expect(north[1]).toBeGreaterThan(43.6591);
    const overlays = kernel.geographicOverlayData({
      longitude: -70.2568, latitude: 43.6591, windDir: 215, windSpeed: 22.1
    }, 25);
    const ring = overlays.studyArea.geometry.coordinates[0];
    expect(overlays.studyArea.properties.radiusKm).toBe(25);
    expect(overlays.studyArea.geometry.type).toBe('Polygon');
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(overlays.wind.type).toBe('FeatureCollection');
    expect(overlays.wind.features).toHaveLength(3);
    expect(overlays.wind.features[0].geometry.type).toBe('LineString');
    expect(overlays.wind.features[1]).toEqual(expect.objectContaining({ properties: expect.objectContaining({ kind: 'arrow', direction: 35 }) }));
    expect(overlays.wind.features[1].geometry.type).toBe('Point');
    expect(overlays.wind.features[2].properties.kind).toBe('endpoint');
    expect(overlays.downwindBearing).toBe(35);
    expect(overlays.windDistanceKm).toBe(4);
    const transect = kernel.geographicWindTransect({ longitude: -70.2568, latitude: 43.6591, windDir: 215 }, 30, 25);
    expect(transect.properties).toEqual(expect.objectContaining({ totalDistanceKm: 30, sampleCount: 25, upwindBearing: 215, downwindBearing: 35 }));
    expect(transect.geometry.type).toBe('LineString');
    expect(transect.geometry.coordinates).toHaveLength(25);
    expect(transect.geometry.coordinates[12][0]).toBeCloseTo(-70.2568, 4);
    expect(transect.geometry.coordinates[12][1]).toBeCloseTo(43.6591, 4);
    expect(transect.geometry.coordinates[0][0]).toBeLessThan(-70.2568);
    expect(transect.geometry.coordinates[0][1]).toBeLessThan(43.6591);
    const terrainAnalysis = kernel.analyzeGeographicTerrainProfile([
      { distanceKm: 0, elevation: 18 }, { distanceKm: 5, elevation: 22 },
      { distanceKm: 10, elevation: 40 }, { distanceKm: 15, elevation: 96 },
      { distanceKm: 20, elevation: 72 }, { distanceKm: 25, elevation: 34 },
      { distanceKm: 30, elevation: 20 }
    ]);
    expect(terrainAnalysis).toEqual(expect.objectContaining({
      pointCount: 7, distanceKm: 30, minElevation: 18, maxElevation: 96,
      relief: 78, siteElevation: 96, riseToSite: 78, changeAfterSite: -76,
      signalLabel: 'Moderate windward lifting signal'
    }));
    expect(terrainAnalysis.interpretation).toContain('may encourage crossing airflow to rise and cool');
    expect(kernel.analyzeGeographicTerrainProfile([{ distanceKm: 0, elevation: 10 }])).toBeNull();
    const savedTerrain = { location: 'Portland, Maine, United States', latitude: 43.6591, longitude: -70.2568, observedAt: '2026-07-16T14:00' };
    const matchingLive = { label: 'Portland, Maine, United States', latitude: 43.6591, longitude: -70.2568, observedAt: '2026-07-16T14:00' };
    expect(kernel.geographicTerrainEvidenceStatus(savedTerrain, matchingLive)).toEqual(expect.objectContaining({ current: true, code: 'current', label: 'Current location and observation' }));
    expect(kernel.geographicTerrainEvidenceStatus(savedTerrain, Object.assign({}, matchingLive, { observedAt: '2026-07-16T15:00' }))).toEqual(expect.objectContaining({ current: false, code: 'observation', label: 'Different weather hour' }));
    expect(kernel.geographicTerrainEvidenceStatus(savedTerrain, Object.assign({}, matchingLive, { latitude: 42.3601, longitude: -71.0589, label: 'Boston, Massachusetts' }))).toEqual(expect.objectContaining({ current: false, code: 'location', label: 'Stale location evidence' }));
    expect(kernel.geographicTerrainEvidenceStatus(savedTerrain, null)).toEqual(expect.objectContaining({ current: true, code: 'saved', label: 'Saved evidence provenance' }));
    expect(kernel.geographicObservationSummary({
      label: 'Portland, Maine, United States', condition: 'Thunderstorms', temperature: 28.4,
      humidity: 74, windDir: 215, windSpeed: 22.1, pressure: 1004.6
    })).toBe('Portland, Maine, United States | Thunderstorms | 28.4\u00B0C | 74% RH | SW 22.1 km/h wind | 1004.6 hPa');
  });

  it('compares a sampled 3D terrain point with the observation site', () => {
    const kernel = window.WeatherSystemsKernel;
    const point = kernel.geographicDestination(-70.2568, 43.6591, 45, 12);
    const comparison = kernel.geographicPointComparison(-70.2568, 43.6591, 19, point[0], point[1], 219);
    expect(comparison).toEqual(expect.objectContaining({
      elevation: 219, siteElevation: 19, elevationDelta: 200,
      direction: 'NE', relation: 'Higher than site'
    }));
    expect(comparison.distanceKm).toBeCloseTo(12, 1);
    expect(comparison.bearing).toBeCloseTo(45, 0);
    const upwind = kernel.geographicTerrainWindAnalysis(comparison, 45);
    expect(upwind).toEqual(expect.objectContaining({
      position: 'Upwind', label: 'Upwind sample', gradePercent: 1.67,
      slopeDegrees: 0.95, gradeLabel: 'Gentle average grade',
      signalLabel: 'Upwind terrain barrier'
    }));
    expect(upwind.interpretation).toContain('force approaching air upward');
    expect(kernel.geographicTerrainWindAnalysis(comparison, 215)).toEqual(expect.objectContaining({
      position: 'Downwind', signalLabel: 'Downwind terrain context'
    }));
    expect(kernel.geographicTerrainWindAnalysis(comparison, 315)).toEqual(expect.objectContaining({
      position: 'Crosswind', signalLabel: 'Crosswind terrain context'
    }));
    expect(kernel.geographicPointComparison(-70.2568, 43.6591, 19, 'invalid', 43.7, 219)).toBeNull();
    expect(kernel.geographicTerrainWindAnalysis(null, 45)).toBeNull();
  });

});

describe('Weather Systems grade-banded views', () => {
  it('renders a privacy-safe immersive 3D model fallback', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'immersive', scenario: 'coldFront' } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('id="weather-tab-immersive"');
    expect(html).toContain('Immersive 3D Weather Space');
    expect(html).toContain('Atmospheric analysis workspace');
    expect(html).toContain('high-fidelity atmospheric digital twin');
    expect(html).toContain('data-weather-immersive-lab');
    expect(html).toContain('data-weather-immersive-canvas');
    expect(html).toContain('Click or tap a scene object to explain it');
    expect(html).toContain('aria-describedby="weather-conceptual-3d-instructions"');
    expect(html).toContain('data-weather-object-picking-hint');
    expect(html).toContain('Click or tap an object to explain');
    expect(html).toContain('data-weather-conceptual-vignette');
    expect(html).toContain('data-weather-camera-controls');
    expect(html).toContain('data-weather-conceptual-command-bar');
    expect(html).toContain('aria-label="3D camera views"');
    expect(html).toContain('aria-label="Overview camera view"');
    expect(html).toContain('aria-label="Front section camera view"');
    expect(html).toContain('aria-label="Surface camera view"');
    expect(html).toContain('Front section');
    expect(html).toContain('data-weather-scene-hud');
    expect(html).toContain('data-weather-scene-instruments');
    expect(html).toContain('Temperature');
    expect(html).toContain('Pressure');
    expect(html).toContain('Wind');
    expect(html).toContain('Rendering quality');
    expect(html).toContain('High fidelity');
    expect(html).toContain('Full terrain detail');
    expect(html).toContain('Loading the 3D atmosphere engine');
    expect(html).toContain('Teaching model scene');
    expect(html).toContain('data-weather-live-control');
    expect(html).toContain('Nothing loads automatically');
    expect(html).toContain('Use my location');
    expect(html).toContain('Quick location search');
    expect(html).toContain('More location fields');
    expect(html).toContain('Boston, MA or 42.36, -71.06');
    expect(html).toContain('postal or ZIP code');
    expect(html).toContain('decimal coordinates');
    expect(html).toContain('data-weather-vr-control');
    expect(html).toContain('Check headset and enter VR');
    expect(html).toContain('Educational visualization only');
  });

  it('isolates professional 3D analysis layers through one accessible focus control', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'immersive',
        scenario: 'coldFront',
        immersiveFocus: 'front'
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Analysis focus');
    expect(html).toContain('Full atmospheric system');
    expect(html).toContain('Front dynamics');
    expect(html).toContain('Moisture and precipitation');
    expect(html).toContain('Surface observations');
    expect(html).toContain('data-weather-focus-status');
    expect(html).toContain('data-weather-focus-spotlight=\"on\"');
    expect(html).toContain('data-weather-focus-spotlight-badge=\"front\"');
    expect(html).toContain('data-weather-focus-spotlight-toggle=\"controls\"');
    expect(html).toContain('Turn off the visual focus spotlight');
    expect(html).toContain('Ground halo follows analysis focus');
    expect(html).toContain('Air masses, the frontal boundary, wind, and stations are isolated.');
    expect(html).toContain('aria-live="polite"');
  });

it('renders professional geography controls for the immersive 3D map', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'immersive',
        scenario: 'winterStorm',
        immersiveGeography: 'mountain'
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Conceptual terrain base');
    expect(html).toContain('id="weather-immersive-geography"');
    expect(html).toContain('Interior plains');
    expect(html).toContain('Coastal watershed');
    expect(html).toContain('Mountain valley');
    expect(html).toContain('Urban basin');
    expect(html).toContain('data-weather-geography-status');
    expect(html).toContain('Ridges and valleys highlight terrain lift');
    expect(html).toContain('Geography');
    expect(html).toContain('Terrain map');
  });

it('renders the immersive guided investigation tour and evidence note', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'immersive',
        scenario: 'coldFront',
        immersiveTourStep: 'moisture',
        immersiveTourCompletedSteps: ['scan'],
        immersiveReflection: 'Clouds are building near the boundary.'
      }
    }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-immersive-tour');
    expect(html).toContain('data-weather-tour-overlay');
    expect(html).toContain('Guided investigation');
    expect(html).toContain('Trace moisture');
    expect(html).toContain('3D investigation step 3 of 4');
    expect(html).toContain('1/4 complete');
    expect(html).toContain('data-weather-tour-progress');
    expect(html).toContain('Mark step complete');
    expect(html).toContain('How do clouds or precipitation connect to humidity and lift?');
    expect(html).toContain('Connect cloud cover, particles, and the wind field.');
    expect(html).toContain('aria-label="Immersive guided investigation steps"');
    expect(html).toContain('Next investigation step');
    expect(html).toContain('3D evidence note');
    expect(html).toContain('Clouds are building near the boundary.');
    const teacherHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveAudienceMode: 'teacher', immersiveTourStep: 'front' }
    }, { gradeLevel: '8th Grade' });
    expect(teacherHtml).toContain('data-weather-tour-handoff');
    expect(teacherHtml).toContain('Copy teacher brief');
    expect(teacherHtml).toContain('Download teacher brief');
    expect(teacherHtml).toContain('data-weather-local-persistence');
    expect(teacherHtml).toContain('Remember this workspace on this device');
    expect(teacherHtml).toContain('Clear local copy');
    const presenterHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveAudienceMode: 'teacher', immersiveStageMode: true, immersivePresenterMode: true, immersiveTourStep: 'front' }
    }, { gradeLevel: '8th Grade' });
    expect(presenterHtml).toContain('data-weather-presenter-mode="on"');
    expect(presenterHtml).toContain('data-weather-presenter-overlay');
    expect(presenterHtml).toContain('Teacher cue');
    expect(presenterHtml).toContain('Evidence to notice');
    const checkpointHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveAudienceMode: 'teacher', immersiveStageMode: true, immersivePresenterMode: true, immersiveCheckpointRunnerOpen: true, immersiveTourStep: 'front', immersiveTourCompletedSteps: ['scan'] }
    }, { gradeLevel: '8th Grade' });
    expect(checkpointHtml).toContain('data-weather-checkpoint-runner="on"');
    expect(checkpointHtml).toContain('data-weather-checkpoint-runner');
    expect(checkpointHtml).toContain('Checkpoint runner');
    expect(checkpointHtml).toContain('1/4 complete');
    expect(checkpointHtml).toContain('Mark + next');
    const summaryHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveStageMode: true, immersiveSceneSummaryOpen: true, immersiveFocus: 'moisture' }
    }, { gradeLevel: '8th Grade' });
    expect(summaryHtml).toContain('data-weather-scene-summary="on"');
    expect(summaryHtml).toContain('data-weather-scene-summary-panel');
    expect(summaryHtml).toContain('Accessible scene view');
    expect(summaryHtml).toContain('Visible layer meanings');
    expect(summaryHtml).toContain('Temperature');
    const stageHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveStageMode: true, immersiveTourStep: 'front' }
    }, { gradeLevel: '8th Grade' });
    expect(stageHtml).toContain('data-weather-stage-mode="on"');
    expect(stageHtml).toContain('data-weather-immersive-layout="stage"');
    expect(stageHtml).toContain('Exit stage mode');
    expect(stageHtml).toContain('data-weather-stage-legend');
    expect(stageHtml).toContain('Visible 3D channels');
    expect(stageHtml).toContain('Air masses');
    expect(stageHtml).toContain('data-weather-stage-focus-controls');
    expect(stageHtml).toContain('Quick focus');
    expect(stageHtml).toContain('Front dynamics');
    expect(stageHtml).toContain('data-weather-focus-spotlight=\"on\"');
    expect(stageHtml).toContain('data-weather-focus-spotlight-badge');
    expect(stageHtml).toContain('Visual spotlight');
    expect(stageHtml).toContain('data-weather-focus-spotlight-toggle=\"stage\"');
    const spotlightOffHtml = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveStageMode: true, immersiveFocusSpotlight: false }
    }, { gradeLevel: '8th Grade' });
    expect(spotlightOffHtml).toContain('data-weather-focus-spotlight=\"off\"');
    expect(spotlightOffHtml).not.toContain('data-weather-focus-spotlight-badge');
    const stageTimelineHtml = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'immersive',
        immersiveStageMode: true,
        immersiveDataSource: 'live',
        liveWeather: {
          label: 'Boston', latitude: 42.36, longitude: -71.06,
          temperature: 18, humidity: 70, cloudCover: 50, pressure: 1008,
          windSpeed: 20, windDir: 240, condition: 'Cloudy',
          observedAt: '2026-08-01T12:00:00Z', timezone: 'America/New_York'
        },
        liveWeatherTimeline: [
          {
            validAt: '2026-08-01T12:00:00Z', role: 'current', offsetHours: 0,
            temperature: 18, humidity: 70, cloudCover: 50, pressure: 1008,
            windSpeed: 20, windDir: 240, condition: 'Cloudy'
          },
          {
            validAt: '2026-08-01T13:00:00Z', role: 'forecast', offsetHours: 1,
            temperature: 19, humidity: 68, cloudCover: 55, pressure: 1006,
            windSpeed: 22, windDir: 245, condition: 'Cloudy'
          }
        ],
        liveWeatherTimelineIndex: 1,
        immersiveTimelineCompareIndex: 0
      }
    }, { gradeLevel: '8th Grade' });
    expect(stageTimelineHtml).toContain('data-weather-stage-timeline');
    expect(stageTimelineHtml).toContain('Move the 3D scene through time');
    expect(stageTimelineHtml).toContain('Previous hour');
    expect(stageTimelineHtml).toContain('weather-stage-timeline-slider');
    expect(stageTimelineHtml).toContain('data-weather-stage-timeline-context');
    expect(stageTimelineHtml).toContain('Forecast hour');
    expect(stageTimelineHtml).toContain('Scene time');
    expect(stageTimelineHtml).toContain('data-weather-stage-timeline-comparison');
    expect(stageTimelineHtml).toContain('Compare hours');
    expect(stageTimelineHtml).toContain('weather-stage-timeline-comparison');
    expect(stageTimelineHtml).toContain('Change since baseline');
  });

  it('renders optional structured location fields with address autocomplete semantics', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'immersive',
        liveLocationDetailsOpen: true,
        liveLocationCity: 'Boston',
        liveLocationRegion: 'Massachusetts',
        liveLocationPostalCode: '02108',
        liveLocationCountry: 'United States'
      }
    }, { gradeLevel: '8th Grade' });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Hide location fields');
    expect(html).toContain('Search with separate fields');
    expect(html).toContain('City or locality');
    expect(html).toContain('State, province, or region');
    expect(html).toContain('Postal or ZIP code');
    expect(html).toContain('Country');
    expect(html).toContain('autoComplete="address-level2"');
    expect(html).toContain('autoComplete="address-level1"');
    expect(html).toContain('autoComplete="postal-code"');
    expect(html).toContain('autoComplete="country-name"');
    expect(html).toContain('value="Boston"');
    expect(html).toContain('Search these fields');
  });

  it('maps a loaded live observation into the immersive weather dashboard', () => {
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveDataSource: 'live',
        liveWeather: {
          label: 'Portland, Maine, United States', latitude: 43.6591, longitude: -70.2568,
          observedAt: '2026-07-16T14:00', timezone: 'EDT', temperature: 28.4, humidity: 74,
          precipitation: 1.2, weatherCode: 95, condition: 'Thunderstorms', cloudCover: 88,
          pressure: 1004.6, windSpeed: 22.1, windDir: 215, visibility: 8400,
          source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/'
        }
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('3D engine ready');
    expect(html).toContain('Saved observation scene');
    expect(html).toContain('Portland, Maine, United States');
    expect(html).toContain('Saved observation');
    expect(html).toContain('data-weather-source-freshness="stale"');
    expect(html).toContain('SAVED');
    expect(html).toContain('Thunderstorms | Observed 2026-07-16T14:00 EDT.');
    expect(html).toContain('8.4 km');
    expect(html).toContain('href="https://open-meteo.com/"');
    expect(html).toContain('Coordinates are rounded and stored only with this local lab state.');
    expect(html).toContain('aria-label="Immersive weather layer guide"');
    expect(html).toContain('data-weather-inspector-view-controls');
    expect(html).toContain('data-weather-inspector-active="explain"');
    expect(html).toContain('aria-label="Immersive feature inspector views"');
    expect(html).toContain('id="weather-inspector-explain"');
    expect(html).toContain('data-weather-inspector-panel="explain"');
  });


  it('explains conceptual 3D features with an interactive glossary, encoding key, and narration', () => {
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveGuideOpen: true,
        immersiveExplainerFeature: 'frontBoundary', immersiveFocus: 'front', immersiveCameraPreset: 'front',
        immersiveHoverFeature: 'cloudLayer', immersiveHoverInput: 'keyboard',
        immersiveComparisonFeature: 'airMasses', immersiveComparisonStatus: 'Air masses pinned as comparison anchor A.'
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-immersive-explainer');
    expect(html).toContain('What am I seeing?');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-weather-scene-narration');
    expect(html).toContain('conceptual 3D teaching model focused on front dynamics');
    expect(html).toContain('data-weather-object-selection-help');
    expect(html).toContain('Inspect the scene directly');
    expect(html).toContain('data-weather-object-selection-status');
    expect(html).toContain('data-weather-object-explorer');
    expect(html).toContain('Conceptual 3D feature glossary and scene object explorer');
    expect(html).toContain('Pointer or touch: select an object in the 3D view');
    expect(html).toContain('Keyboard: use the scene object explorer buttons below');
    expect(html).toContain('data-weather-visual-encoding-guide');
    expect(html).toContain('How to read this visualization');
    expect(html).toContain('Particle density');
    expect(html).toContain('id="weather-immersive-glossary-search"');
    expect(html).toContain('Conceptual 3D feature glossary');
    expect(html).toContain('data-weather-feature-definition="frontBoundary"');
    expect(html).toContain('The three-dimensional transition zone where two air masses meet');
    expect(html).toContain('Look for');
    expect(html).toContain('Why it matters');
    expect(html).toContain('Evidence question');
    expect(html).toContain('data-weather-hover-inspector="cloudLayer"');
    expect(html).toContain('Keyboard preview');
    expect(html).toContain('data-weather-comparison-legend="airMasses"');
    expect(html).toContain('3D feature comparison. Anchor A: Air masses. Inspecting B: Front boundary.');
    expect(html).toContain('data-weather-feature-compare-workspace');
    expect(html).toContain('data-weather-inspector-view-controls');
    expect(html).toContain('data-weather-inspector-active="compare"');
    expect(html).toContain('aria-label="Immersive feature inspector views"');
    expect(html).toContain('data-weather-inspector-view="explain"');
    expect(html).toContain('data-weather-inspector-view="evidence"');
    expect(html).toContain('data-weather-inspector-view="compare"');
    expect(html).toContain('data-weather-inspector-view="connections"');
    expect(html).toContain('id="weather-inspector-explain" hidden=""');
    expect(html).toContain('id="weather-inspector-evidence" hidden=""');
    expect(html).toContain('id="weather-inspector-compare"');
    expect(html).toContain('id="weather-inspector-connections" hidden=""');
    expect(html).toContain('data-weather-inspector-panel="compare"');
    expect(html).toContain('Feature comparison workspace');
    expect(html).toContain('data-weather-feature-comparison="airMasses:frontBoundary"');
    expect(html).toContain('data-weather-comparison-relationship="anchor-to-focus"');
    expect(html).toContain('Direct relationship in this guide');
    expect(html).toContain('Anchor A: Air masses');
    expect(html).toContain('Inspecting B: Front boundary');
    expect(html).toContain('Contrasting air masses meet along the frontal transition zone.');
    expect(html).toContain('Which current evidence values support this relationship, and which parts remain an inference?');
    expect(html).toContain('Make B the new anchor');
    expect(html).toContain('Clear comparison');
    expect(html).toContain('Press Enter to explain and focus.');
    expect(html).toContain('data-weather-feature-callout="frontBoundary"');
    expect(html).toContain('data-weather-feature-connections="frontBoundary"');
    expect(html).toContain('Connected processes');
    expect(html).toContain('Follow a relationship to inspect how weather-system parts work together.');
    expect(html).toContain('Frontal lift can cool moist air toward cloud formation.');
    expect(html).toContain('data-weather-feature-evidence="frontBoundary"');
    expect(html).toContain('data-weather-feature-evidence-source="model"');
    expect(html).toContain('data-weather-audience-mode="student"');
    expect(html).toContain('Student focus');
    expect(html).toContain('data-weather-accessible-data-table');
    expect(html).toContain('weather-accessible-data-content');
    expect(html).toContain('data-weather-orientation-controls');
    expect(html).toContain('data-weather-evidence-kind="model"');
    expect(html).toContain('aria-label="Model value"');
    expect(html).toContain('Evidence snapshot');
    expect(html).toContain('What supports this view right now?');
    expect(html).toContain('Teaching model | T+0 hours');
    expect(html).toContain('Front type');
    expect(html).toContain('cold front');
    expect(html).toContain('What the evidence supports');
    expect(html).toContain('How the 3D view encodes it');
    expect(html).toContain('What this cannot prove');
    expect(html).toContain('not a professionally analyzed surface front');
    expect(html).toContain('Focus 3D camera and layers');
    expect(html).toContain('They do not turn teaching graphics or model output into direct observations.');
  });

  it('renders accessible observed-to-forecast playback controls and selected-hour conditions', () => {
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveDataSource: 'live', liveWeatherTimelineIndex: 2,
        liveWeather: {
          label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
          observedAt: '2026-07-25T12:00', timezone: 'EDT', temperature: 20, humidity: 70,
          precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 50,
          pressure: 1012, windSpeed: 10, windDir: 180, visibility: 10000
        },
        liveWeatherTimeline: [
          { time: '2026-07-25T11:00', role: 'earlier', offsetHours: -1, temperature: 19, humidity: 74, precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 45, pressure: 1013, windSpeed: 8, windDir: 170, visibility: 10000 },
          { time: '2026-07-25T12:00', role: 'current', offsetHours: 0, temperature: 20, humidity: 70, precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 50, pressure: 1012, windSpeed: 10, windDir: 180, visibility: 10000 },
          { time: '2026-07-25T14:00', role: 'forecast', offsetHours: 2, temperature: 24, humidity: 60, precipitation: 1.2, weatherCode: 95, condition: 'Thunderstorms', cloudCover: 92, pressure: 1007, windSpeed: 24, windDir: 220, visibility: 6000 }
        ]
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-hourly-timeline');
    expect(html).toContain('Hourly weather timeline');
    expect(html).toContain('+2 h forecast | 2026-07-25 14:00 EDT');
    expect(html).toContain('id="weather-hourly-timeline-range"');
    expect(html).toContain('aria-valuetext="+2 h forecast');
    expect(html).toContain('aria-label="Hourly weather playback controls"');
    expect(html).toContain('aria-label="Previous weather hour"');
    expect(html).toContain('aria-label="Next weather hour"');
    expect(html).toContain('Forecast model hour | Thunderstorms | 24\u00B0C | SW 24 km/h | 1.2 mm precipitation');
    expect(html).toContain('data-weather-source-freshness="forecast"');
    expect(html).toContain('data-weather-scene-hud');
    expect(html).toContain('Forecast valid');
    expect(html).toContain('aria-label="+2 h forecast | 2026-07-25 14:00 EDT. Temperature 24 degrees Celsius.');
    expect(html).toContain('+2H');
  });


  it('renders a synchronized professional regional weather layer stack in geographic 3D', () => {
    const kernel = window.WeatherSystemsKernel;
    const coordinates = kernel.regionalWeatherGridCoordinates(43.6591, -70.2568, 25, 5);
    const field = kernel.normalizeRegionalWeatherField(coordinates.map((point, index) => ({ hourly: {
      time: ['2026-07-25T14:00'], temperature_2m: [20 + index / 5], precipitation: [index / 20],
      cloud_cover: [50 + index], surface_pressure: [1008 + index / 10],
      wind_speed_10m: [10 + index / 2], wind_direction_10m: [190 + index]
    } })), coordinates, '2026-07-25T14:00');
    Object.assign(field, { latitude: 43.6591, longitude: -70.2568, location: 'Portland, Maine', timezone: 'EDT', source: 'Open-Meteo multi-location model grid' });
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveSceneMode: 'geographic', immersiveDataSource: 'live', geographicMapReady: true,
        geographicWeatherLayer: 'temperature', geographicWeatherLayerOpacity: 0.6, geographicWeatherField: field, immersiveGuideOpen: true, immersiveExplainerFeature: 'regionalField',
        liveGeography: { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568, elevation: 19 },
        liveWeather: { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568, observedAt: '2026-07-25T12:00', timezone: 'EDT', temperature: 20, humidity: 70, precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 50, pressure: 1012, windSpeed: 10, windDir: 180, visibility: 10000 },
        liveWeatherTimelineIndex: 1,
        liveWeatherTimeline: [
          { time: '2026-07-25T12:00', role: 'current', offsetHours: 0, temperature: 20, humidity: 70, precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 50, pressure: 1012, windSpeed: 10, windDir: 180, visibility: 10000 },
          { time: '2026-07-25T14:00', role: 'forecast', offsetHours: 2, temperature: 24, humidity: 60, precipitation: 1.2, weatherCode: 95, condition: 'Thunderstorms', cloudCover: 92, pressure: 1007, windSpeed: 24, windDir: 220, visibility: 6000 }
        ]
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-regional-layer-stack');
    expect(html).toContain('Professional layer stack');
    expect(html).toContain('Regional model field');
    expect(html).toContain('Temperature');
    expect(html).toContain('Precipitation');
    expect(html).toContain('Cloud cover');
    expect(html).toContain('Surface pressure');
    expect(html).toContain('Wind field');
    expect(html).toContain('data-weather-regional-field-sync="ready"');
    expect(html).toContain('data-weather-regional-map-legend');
    expect(html).toContain('Valid 2026-07-25T14:00 EDT');
    expect(html).toContain('model-grid samples, not live radar or official warning boundaries');
    expect(html).toContain('data-weather-save-forecast-checkpoint');
    expect(html).toContain('data-weather-feature-definition="regionalField"');
    expect(html).toContain('A 25-point sampling of nearby Open-Meteo model values');
    expect(html).toContain('Map position');
    expect(html).toContain('Cell color');
    expect(html).toContain('Focus map and evidence layers');
  });

  it('renders signed forecast-versus-observation errors in the verification studio', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'forecast',
        liveWeather: { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568, observedAt: '2026-07-25T15:00', timezone: 'EDT' },
        liveWeatherTimeline: [{ time: '2026-07-25T14:00', role: 'earlier', offsetHours: -1, temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 200, weatherCode: 61, condition: 'Rain' }],
        liveForecastCheckpoints: [{
          id: 'portland-14', location: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
          issuedAt: '2026-07-25T12:00', validAt: '2026-07-25T14:00', timezone: 'EDT', offsetHours: 2,
          predicted: { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 220, weatherCode: 95, condition: 'Thunderstorms' }
        }]
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-forecast-verification-studio');
    expect(html).toContain('Forecast Verification Studio');
    expect(html).toContain('data-weather-checkpoint-status="verified"');
    expect(html).toContain('Forecast error = forecast minus observation');
    expect(html).toContain('Temperature error');
    expect(html).toContain('+2\u00B0C');
    expect(html).toContain('Pressure error');
    expect(html).toContain('-2 hPa');
    expect(html).toContain('Wind-direction error');
    expect(html).toContain('+20\u00B0');
    expect(html).toContain('Condition category differed from the observation.');
  });

  it('renders an opt-in open geographic terrain mode with attribution and fallback', () => {
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveSceneMode: 'geographic', immersiveDataSource: 'live',
        geographicMapReady: true,
        geographicTerrainExaggeration: 1.35,
        geographicInvestigationStep: 'orient',
        geographicTerrainProfile: [
          { distanceKm: 0, elevation: 18 }, { distanceKm: 5, elevation: 22 },
          { distanceKm: 10, elevation: 40 }, { distanceKm: 15, elevation: 96 },
          { distanceKm: 20, elevation: 72 }, { distanceKm: 25, elevation: 34 },
          { distanceKm: 30, elevation: 20 }
        ],
        geographicTerrainProfileStatus: 'Natural elevation sampled from the rendered terrain along a 30 km wind-aligned transect.',
        geographicTerrainProbe: {
          latitude: 43.71, longitude: -70.31, elevation: 219, siteElevation: 19,
          elevationDelta: 200, distanceKm: 7.4, bearing: 325.4, direction: 'NW', relation: 'Higher than site'
        },
        geographicTerrainProbeMethod: 'Keyboard map-center sample',
        terrainEvidenceInvalidatedMessage: 'Previous terrain evidence was removed because the live location or observation changed. Sample and save the new profile before forecasting.',
        liveGeography: {
          label: 'Portland, Maine, United States', locality: 'Portland', admin1: 'Maine',
          admin2: 'Cumberland', country: 'United States', countryCode: 'US', elevation: 19
        },
        liveWeather: {
          label: 'Portland, Maine, United States', latitude: 43.6591, longitude: -70.2568,
          observedAt: '2026-07-16T14:00', timezone: 'EDT', temperature: 28.4, humidity: 74,
          precipitation: 1.2, weatherCode: 95, condition: 'Thunderstorms', cloudCover: 88,
          pressure: 1004.6, windSpeed: 22.1, windDir: 215, visibility: 8400,
          source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/'
        }
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-scene-mode');
    expect(html).toContain('aria-label="Immersive scene mode"');
    expect(html).toContain('Geographic terrain');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-weather-geographic-map');
    expect(html).toContain('Interactive open geographic map and 3D terrain centered on Portland');
    expect(html).toContain('aria-describedby="weather-geographic-map-instructions"');
    expect(html).toContain('id="weather-geographic-map-instructions"');
    expect(html).toContain('Use Sample map center to inspect terrain without a pointer.');
    expect(html).toContain('data-weather-immersive-status-bar');
    expect(html).toContain('data-weather-geographic-vignette');
    expect(html).toContain('data-weather-geographic-camera-controls');
    expect(html).toContain('data-weather-geographic-command-bar');
    expect(html).toContain('aria-label="Geographic camera views"');
    expect(html).toContain('aria-label="Region camera view"');
    expect(html).toContain('aria-label="Local camera view"');
    expect(html).toContain('aria-label="Site camera view"');
    expect(html).toContain('Region');
    expect(html).toContain('Local');
    expect(html).toContain('Site');
    expect(html).toContain('data-weather-geographic-legend');
    expect(html).toContain('aria-label="Geographic layer legend"');
    expect(html).toContain('Map legend');
    expect(html).toContain('Observation site');
    expect(html).toContain('Study area on');
    expect(html).toContain('Downwind on');
    expect(html).toContain('Transect on');
    expect(html).toContain('Terrain sample');
    expect(html).toContain('data-weather-geographic-orientation');
    expect(html).toContain('North is 18\u00B0 right of screen top.');
    expect(html).toContain('data-weather-geographic-telemetry');
    expect(html).toContain('data-weather-geographic-terrain-capability="ready"');
    expect(html).toContain('3D terrain 1.35x');
    expect(html).toContain('Zoom 10.6');
    expect(html).toContain('Tilt 58');
    expect(html).toContain('Bearing -18');
    expect(html).toContain('data-weather-geographic-hud');
    expect(html).toContain('Weather command display');
    expect(html).toContain('data-weather-observation-freshness="stale"');
    expect(html).toContain('Saved observation');
    expect(html).toContain('refresh before making a current-conditions claim');
    expect(html).toContain('43.6591, -70.2568 | Site 19 m');
    expect(html).toContain('aria-label="Portland, Maine, United States | Thunderstorms | 28.4\u00B0C | 74% RH | SW 22.1 km/h wind | 1004.6 hPa"');
    expect(html).toContain('data-weather-wind-compass');
    expect(html).toContain('Selected-hour wind compass');
    expect(html).toContain('Wind arrives from SW and flows toward NE at 22.1 kilometers per hour.');
    expect(html).toContain('data-weather-observation-instruments');
    expect(html).toContain('aria-label="Selected-hour weather instruments"');
    expect(html).toContain('Relative humidity');
    expect(html).toContain('FROM SW 22.1 km/h');
    expect(html).toContain('TO NE');
    expect(html).toContain('not a forecast footprint');
    expect(html).toContain('data-weather-terrain-probe-hud');
    expect(html).toContain('Terrain sample 219 m | 7.40 km NW of site | Crosswind');
    expect(html).toContain('data-weather-immersive-control-rail');
    expect(html).toContain('data-weather-geographic-analysis-lenses');
    expect(html).toContain('aria-label="Geographic analysis views"');
    expect(html).toContain('Analysis view');
    expect(html).toContain('Coordinate camera + evidence layers');
    expect(html).toContain('System context');
    expect(html).toContain('Wind + terrain');
    expect(html).toContain('Site detail');
    expect(html).toContain('Region camera');
    expect(html).toContain('Local camera');
    expect(html).toContain('Site camera');
    expect(html).toContain('Compare observed wind with the wind-aligned elevation cross-section.');
    expect(html).toContain('id="weather-geographic-analysis-status"');
    expect(html).toContain('aria-describedby="weather-geographic-analysis-status"');
    expect(html).toContain('Fine-tune layers');
    expect(html).toContain('Terrain emphasis');
    expect(html).toContain('Classroom emphasis (1.35x)');
    expect(html).toContain('Study-area radius');
    expect(html).toContain('id="weather-geographic-radius"');
    expect(html).toContain('10 km radius');
    expect(html).toContain('data-weather-geographic-layer-controls');
    expect(html).toContain('aria-label="Geographic overlay visibility"');
    expect(html).toContain('Study area');
    expect(html).toContain('Wind vector');
    expect(html).toContain('Terrain profile');
    expect(html).toContain('Real 3D buildings');
    expect(html).toContain('Checking the open map style for compatible OpenStreetMap building footprints.');
    expect(html).toContain('data-weather-geographic-investigation');
    expect(html).toContain('aria-labelledby="weather-geographic-investigation-title"');
    expect(html).toContain('Guided field investigation');
    expect(html).toContain('Orient the system');
    expect(html).toContain('Trace wind + terrain');
    expect(html).toContain('Inspect local exposure');
    expect(html).toContain('Build an evidence claim');
    expect(html).toContain('What lies inside the study area, and which direction is downwind?');
    expect(html).toContain('aria-label="Geographic field investigation steps"');
    expect(html).toContain('data-weather-geographic-investigation-prompt');
    expect(html).toContain('Next mapped investigation step');
    expect(html).toContain('Mapped evidence note');
    expect(html).toContain('id="weather-geographic-investigation-note"');
    expect(html).toContain('I notice ___ on the map. This matters because ___.');
    expect(html).toContain('data-weather-geographic-context');
    expect(html).toContain('Cumberland, Maine, United States');
    expect(html).toContain('highlighted true-scale ring');
    expect(html).toContain('not an administrative boundary');
    expect(html).toContain('not a forecast path or impact area');
    expect(html).toContain('Select the observation-site marker to inspect live conditions, or select another map point to measure its natural elevation');
    expect(html).toContain('Camera telemetry updates after each move.');
    expect(html).toContain('fullscreen control');
    expect(html).toContain('data-weather-terrain-inspector');
    expect(html).toContain('Interactive terrain inspector');
    expect(html).toContain('Selected ground comparison');
    expect(html).toContain('Higher than site');
    expect(html).toContain('Natural elevation');
    expect(html).toContain('+200 m');
    expect(html).toContain('Average grade');
    expect(html).toContain('+2.70%');
    expect(html).toContain('data-weather-terrain-slope-graphic');
    expect(html).toContain('Site-to-sample slope comparison');
    expect(html).toContain('The observation site is 19 meters and the sampled terrain is 219 meters');
    expect(html).toContain('weather-terrain-slope-gradient');
    expect(html).toContain('Sample NW');
    expect(html).toContain('7.40 km NW');
    expect(html).toContain('43.71000, -70.31000 | Bearing 325.4\u00B0');
    expect(html).toContain('Crosswind sample | Higher than site');
    expect(html).toContain('data-weather-terrain-wind-analysis');
    expect(html).toContain('Crosswind terrain context');
    expect(html).toContain('Observed wind from SW');
    expect(html).toContain('110.4\u00B0 from the upwind axis');
    expect(html).toContain('Gentle average grade (+1.55\u00B0)');
    expect(html).toContain('lateral terrain context, not direct evidence that air is being lifted');
    expect(html).toContain('data-weather-terrain-probe-provenance');
    expect(html).toContain('Mapterhorn raster terrain rendered by MapLibre');
    expect(html).toContain('Selection: Keyboard map-center sample');
    expect(html).toContain('Elevation and grade are approximate.');
    expect(html).toContain('Sample map center');
    expect(html).toContain('Clear comparison');
    expect(html).toContain('data-weather-terrain-profile');
    expect(html).toContain('Wind-aligned terrain profile');
    expect(html).toContain('30 km cross-section from upwind to downwind');
    expect(html).toContain('18\u201396 m');
    expect(html).toContain('Wind-aligned natural elevation profile');
    expect(html).toContain('data-weather-terrain-profile-visual');
    expect(html).toContain('weather-terrain-profile-gradient');
    expect(html).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(html).toContain('Upwind SW');
    expect(html).toContain('Downwind NE');
    expect(html).toContain('Natural elevation sampled from the rendered terrain');
    expect(html).toContain('data-weather-terrain-analysis');
    expect(html).toContain('Terrain relief');
    expect(html).toContain('Rise to site');
    expect(html).toContain('After site');
    expect(html).toContain('+78 m');
    expect(html).toContain('-76 m');
    expect(html).toContain('Moderate windward lifting signal');
    expect(html).toContain('may encourage crossing airflow to rise and cool');
    expect(html).toContain('Use as forecast evidence');
    expect(html).toContain('data-weather-terrain-evidence-invalidated');
    expect(html).toContain('Previous terrain evidence was removed because the live location or observation changed.');
    expect(html).toContain('data-weather-map-attribution');
    expect(html).toContain('href="https://openfreemap.org/"');
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain('href="https://tiles.mapterhorn.com/"');
    expect(html).toContain('href="https://maplibre.org/"');
    expect(html).toContain('Open vector map');
    expect(html).toContain('Published roads, water, places, and boundaries');
    expect(html).toContain('10 km study area');
    expect(html).toContain('Downwind vector');
    expect(html).toContain('3D terrain/profile');
    expect(html).toContain('Geographic layers ready');
    expect(html).not.toContain('data-weather-camera-controls');
    expect(html).not.toContain('data-weather-vr-control');
  });

  it('pauses guided inquiry for a custom map and reports unavailable building data honestly', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'immersive', immersiveSceneMode: 'geographic', immersiveDataSource: 'live',
      geographicMapReady: true,
      geographicAnalysisLens: 'custom', geographicInvestigationPaused: true,
      geographicInvestigationStep: 'terrain', geographicBuildings: true, geographicBuildingsAvailable: false,
      liveGeography: { label: 'Portland, Maine', admin1: 'Maine', country: 'United States', elevation: 19 },
      liveWeather: {
        label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
        observedAt: '2026-07-16T14:00', timezone: 'EDT', temperature: 28, humidity: 74,
        precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 60,
        pressure: 1008, windSpeed: 18, windDir: 215, visibility: 10000
      }
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Custom exploration');
    expect(html).toContain('Guided investigation paused');
    expect(html).toContain('data-weather-geographic-investigation-status="paused"');
    expect(html).toContain('Camera or evidence layers were adjusted manually.');
    expect(html).toContain('Resume Trace wind + terrain');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Unavailable');
    expect(html).toContain('does not provide a compatible 3D building layer');
  });

  it('keeps geographic evidence controls unavailable until map layers are ready', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'immersive', immersiveSceneMode: 'geographic', immersiveDataSource: 'live',
      geographicMapReady: false,
      liveWeather: {
        label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
        observedAt: '2026-07-22T14:00:00-04:00', temperature: 28, humidity: 74,
        precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 60,
        pressure: 1008, windSpeed: 18, windDir: 215, visibility: 10000
      }
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Loading geographic layers');
    expect(html).toContain('Map controls unlock after geographic terrain and evidence layers finish loading.');
    expect(html).toContain('disabled:cursor-not-allowed disabled:opacity-50');
    expect(html).toContain('<span aria-hidden="true">Loading</span>');
  });

  it('keeps the open map useful when 3D terrain is unavailable', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'immersive', immersiveSceneMode: 'geographic', immersiveDataSource: 'live',
      geographicMapReady: true, geographicTerrainAvailable: false,
      geographicMapStatus: 'The open base map loaded, but 3D terrain is unavailable.',
      liveWeather: {
        label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
        observedAt: '2026-07-22T14:00:00-04:00', temperature: 28, humidity: 74,
        precipitation: 0, weatherCode: 2, condition: 'Partly cloudy', cloudCover: 60,
        pressure: 1008, windSpeed: 18, windDir: 215, visibility: 10000
      }
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-geographic-terrain-capability="degraded"');
    expect(html).toContain('Base map only');
    expect(html).toContain('data-weather-terrain-degraded-help');
    expect(html).toContain('data-weather-terrain-degraded');
    expect(html).toContain('Base map available; 3D terrain unavailable');
    expect(html).toContain('open vector map, study area, and wind overlays remain available');
    expect(html).not.toContain('data-weather-terrain-profile="true"');
  });

  it('carries saved 3D terrain analysis into forecast evidence with provenance', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', evidence: ['pressure', 'terrainProfile'],
      geographicTerrainEvidence: {
        id: 'terrainProfile', label: 'Wind-aligned terrain profile',
        location: 'Portland, Maine, United States', observedAt: '2026-07-16T14:00',
        upwindDirection: 'SW', downwindDirection: 'NE', relief: 78,
        riseToSite: 78, changeAfterSite: -76,
        signalLabel: 'Moderate windward lifting signal',
        summary: 'Terrain rises 78 m toward the site, which may encourage crossing airflow to rise and cool.',
        investigationNote: 'The upwind profile rises toward the site, supporting a terrain-lift claim.',
        source: 'Rendered open terrain elevation and learner field note'
      }
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-terrain-evidence-trail');
    expect(html).toContain('3D-to-forecast evidence trail');
    expect(html).toContain('Wind-aligned terrain profile');
    expect(html).toContain('Portland, Maine, United States | Observed 2026-07-16T14:00');
    expect(html).toContain('Moderate windward lifting signal');
    expect(html).toContain('Saved evidence provenance');
    expect(html).toContain('No active live observation is loaded for comparison.');
    expect(html).toContain('Terrain relief');
    expect(html).toContain('+78 m');
    expect(html).toContain('-76 m');
    expect(html).toContain('Transect: SW upwind to NE downwind.');
    expect(html).toContain('terrain alone is not a forecast');
    expect(html).toContain('data-weather-geographic-note-handoff');
    expect(html).toContain('Mapped evidence note carried into reasoning');
    expect(html).toContain('The upwind profile rises toward the site, supporting a terrain-lift claim.');
    expect(html).toContain('Review terrain evidence');
    expect(html).toContain('\u2713 Wind-aligned terrain profile');
    expect(html).toContain('pressure tendency, wind-aligned terrain profile');
  });

  it('flags stale terrain provenance and excludes it from forecast readiness', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', evidence: ['terrainProfile'],
      liveWeather: { label: 'Boston, Massachusetts, United States', latitude: 42.3601, longitude: -71.0589, observedAt: '2026-07-16T15:00' },
      geographicTerrainEvidence: {
        id: 'terrainProfile', label: 'Wind-aligned terrain profile',
        location: 'Portland, Maine, United States', latitude: 43.6591, longitude: -70.2568,
        observedAt: '2026-07-16T14:00', upwindDirection: 'SW', downwindDirection: 'NE',
        relief: 78, riseToSite: 78, changeAfterSite: -76,
        signalLabel: 'Moderate windward lifting signal',
        summary: 'Terrain rises toward the site.', source: 'Rendered open terrain elevation'
      }
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-terrain-evidence-warning');
    expect(html).toContain('Stale location evidence');
    expect(html).toContain('This terrain profile belongs to Portland, Maine, United States, not the active live site.');
    expect(html).toContain('It will not count toward forecast readiness or verification.');
    expect(html).toContain('0/3');
    expect(html).toContain('My strongest evidence is [two observations].');
  });

  it('keeps geographic providers dormant until a valid live location exists', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: { tab: 'immersive', immersiveSceneMode: 'geographic' }
    }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-scene-mode');
    expect(html).toContain('Geographic terrain');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Load a live location below to enable the open geographic map. Nothing loads automatically.');
    expect(html).not.toContain('data-weather-geographic-map');
    expect(html).toContain('data-weather-immersive-canvas');
    expect(html).toContain('data-weather-camera-controls');
  });

  it('renders the map lab with observations, model controls, and trend data', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront' } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Weather Systems &amp; Forecasting');
    expect(html).toContain('data-weather-investigation-pathway');
    expect(html).toContain('Investigation Pathway');
    expect(html).toContain('Recommended next: Log an observation.');
    expect(html).toContain('0 of 5 stages');
    expect(html).toContain('aria-label="Weather investigation pathway progress"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Observation station');
    expect(html).toContain('Log this observation');
    expect(html).toContain('Vertical air-mass cross-section');
    expect(html).toContain('Decode the station model');
    expect(html).toContain('data-weather-cross-section');
    expect(html).toContain('data-weather-station-model');
    expect(html).toContain('12-hour model trend');
    expect(html).toContain('Front speed');
    expect(html).toContain('id="weather-tab-map"');
    expect(html).toContain('aria-controls="weather-panel-map"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="weather-panel-map"');
    expect(html).toContain('aria-labelledby="weather-tab-map"');
    expect(html).toContain('data-weather-atmosphere-storyline');
    expect(html).toContain('Atmosphere Storyline');
    expect(html).toContain('data-weather-canvas-visual-key');
    expect(html).toContain('Canvas visual key');
    expect(html).toContain('Selected station pulses amber');
    expect(html).toContain('Radar: light to intense');
    expect(html).toContain('id="weather-map-description"');
    expect(html).toContain('Approaching Cold Front weather map at model hour 0.');
    expect(html).toContain('Visible layers include pressure contours, fronts, radar intensity and sweep, and directional wind tracers.');
    expect(html).toContain('Selected station: Central School.');
    // The description names the painted appearance so non-visual users get the same cues.
    expect(html).toContain('The scene is painted as');
    expect(html).toContain('Station markers show each station name with its current temperature.');
    expect(html).toContain('data-weather-map-canvas="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('width="960"');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('motion-reduce:transition-none');
    expect(html).not.toContain('text-[9px]');
    expect(html).toContain('data-weather-visual-scene-studio');
    expect(html).toContain('Visual Scene Studio');
    expect(html).toContain('aria-label="Weather map visual presets"');
    expect(html).toContain('Fine-tune layers');
    expect(html).toContain('4/4 visible');
    expect(html).toContain('Visual presets change only the displayed layers.');
    expect(html).toContain('data-weather-change-lens');
    expect(html).toContain('Next 3-hour Evidence Lens');
    expect(html).toContain('Dominant evidence signal');
    expect(html).toContain('Select evidence to continue');
    expect(html).toContain('Evidence lens from model hour 0 to 3.');
    expect(html).toContain('data-weather-pattern-compare');
    expect(html).toContain('Pattern Compare Studio');
    expect(html).toContain('Approaching Cold Front');
    expect(html).toContain('High Pressure Day');
    expect(html).toContain('Pattern comparison, not a controlled test');
    expect(html).toContain('Open controlled test');
  });

  it('switches the evidence lens to a recent-change view at the model boundary', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', simHour: 24
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Recent 3-hour Evidence Lens');
    expect(html).toContain('T +21 → T +24');
    expect(html).toContain('Evidence lens from model hour 21 to 24.');
    expect(html).toContain('Select measurable changes to carry into your forecast, then explain how they support your claim.');
  });

  it('builds a selectable evidence tray in the Map Lab', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', lensEvidence: ['pressure', 'windShift']
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('2 evidence cards selected');
    expect(html).toContain('Carry 2 to forecast');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Selected');
  });

  it('compares a chosen weather system at the same model hour', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', compareScenario: 'winterStorm', simHour: 6
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Same time: T +6');
    expect(html).toContain('Coastal Winter Storm');
    expect(html).toContain('Largest pattern contrast');
    expect(html).toContain('active side includes your slider changes');
    expect(html).toContain('comparison uses preset defaults');
    expect(html).toContain('does not prove which variable caused it');
  });

  it('simplifies pattern comparison language for early learners', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'fair', compareScenario: 'warmFront', simHour: 3
    } }, { gradeLevel: '1st Grade' });
    expect(html).toContain('Pattern Compare Studio');
    expect(html).toContain('Look for what is the same and different in two kinds of weather.');
    expect(html).toContain('This is the biggest difference shown in the cards.');
  });

  it('identifies a custom visual-layer mix without changing model controls', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', radar: true, fronts: true, windLayer: false, motion: false
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Visual Scene Studio');
    expect(html).toContain('Custom mix');
    expect(html).toContain('2/4 visible');
    expect(html).toContain('Storm scan');
    expect(html).toContain('Front analysis');
    expect(html).toContain('Clean map');
    expect(html).toContain('Air temperature');
    expect(html).toContain('Weather measurements and model outcomes stay the same.');
  });

  it('narrates past, current, and next model-hour chapters', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', simHour: 6
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Time and change');
    expect(html).toContain('Read the model as a sequence of evidence');
    expect(html).toContain('aria-label="Jump to a model-hour chapter"');
    expect(html).toContain('Previous chapter');
    expect(html).toContain('Current chapter');
    expect(html).toContain('Next chapter');
    expect(html).toContain('Since this chapter, temperature changed');
    expect(html).toContain('By T +9');
    expect(html).toContain('Evidence cue');
    expect(html).toContain('Storyline chapters are projections from this transparent teaching model');
  });

  it('recommends the first incomplete investigation stage', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront',
      observationLog: [{ id: 'one' }],
      lensEvidence: ['pressure'],
      experimentsRun: 1,
      forecastsIssued: 1,
      forecastHistory: [{ attempt: 1, score: 70 }]
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('4 of 5 stages');
    expect(html).toContain('Next: Revise');
    expect(html).toContain('Recommended next: Revise and verify again.');
    expect(html).toContain('Revise. Recommended next step. Compare two verified forecasts.');
  });

  it('celebrates a complete investigation cycle', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront',
      observationLog: [{ id: 'one' }],
      patternCompared: true,
      experimentsRun: 1,
      forecastsIssued: 2,
      forecastHistory: [{ attempt: 1, score: 70 }, { attempt: 2, score: 90 }]
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('5 of 5 stages');
    expect(html).toContain('Cycle complete');
    expect(html).toContain('Investigation cycle complete. Keep testing new scenarios and improving explanations.');
    expect(html).toContain('Revise. Complete. Compare two verified forecasts.');
  });

  it('guides learners toward the next meteorologist badge', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map' } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('data-weather-badge-board');
    expect(html).toContain('Meteorologist Badge Board');
    expect(html).toContain('Next: Field Observer - Log two station observations');
    expect(html).toContain('0 of 9 earned');
    expect(html).toContain('aria-label="Meteorologist badges earned"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('Log observations');
    expect(html).toContain('Show badges');
  });

  it('recognizes a complete meteorologist pathway accessibly', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', badgeBoardOpen: true,
      observationLog: [{ id: 'one' }, { id: 'two' }],
      stationsViewed: { west: true, central: true, east: true },
      boundaryDetected: true, experimentsRun: 1,
      evidence: ['pressure', 'front', 'radar'],
      predictionPrecip: 'storms', predictionTiming: '4-6', predictionHazard: 'lightning', readinessAction: 'indoors',
      forecastsIssued: 2,
      forecastHistory: [{ attempt: 1, score: 70 }, { attempt: 2, score: 90 }]
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('9 of 9 earned');
    expect(html).toContain('aria-valuenow="9"');
    expect(html).toContain('All badges earned - keep testing new weather stories!');
    expect(html).toContain('aria-label="Meteorologist achievement badges"');
    expect(html).toContain('aria-label="Revision Scientist earned"');
    expect(html).toContain('aria-label="Science Communicator earned"');
    expect(html).toContain('Hide badges');
  });

  it('renders a selected-station front-passage meteogram', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', selectedStation: 'coast'
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Front-Passage Meteogram');
    expect(html).toContain('12-hour model trend at Harbor Point');
    expect(html).toContain('Front near T +6.2 h');
    expect(html).toContain('Modeled front passage near T +6.2 h');
    expect(html).toContain('Twelve-hour meteogram for Harbor Point');
    expect(html).toContain('data-weather-front-meteogram');
  });

  it('supports a station-network boundary challenge', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map', scenario: 'coldFront', simHour: 6,
      boundaryGuess: 'north-coast', boundaryResult: { guess: 'north-coast', correct: true }
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Station Network: Find the Boundary');
    expect(html).toContain('West-to-east station transect');
    expect(html).toContain('North Valley');
    expect(html).toContain('Harbor Point');
    expect(html).toContain('Boundary supported');
    expect(html).toContain('STRONGEST CONTRAST');
    expect(html).toContain('data-weather-station-network');
  });

  it('simplifies controls for early elementary learners', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map' } }, { gradeLevel: '1st Grade' });
    expect(html).toContain('Weather controls');
    expect(html).toContain('Weather Detective Path');
    expect(html).toContain('Look closely');
    expect(html).toContain('Try a change');
    expect(html).toContain('Share a forecast');
    expect(html).not.toContain('Instability index');
    expect(html).not.toContain('Sea-level pressure</span>');
    expect(html).not.toContain('Decode the station model');
    expect(html).not.toContain('Station Network: Find the Boundary');
    expect(html).toContain('The air is');
    expect(html).toContain('Before, during, and after');
    expect(html).toContain('12-hour weather story');
  });

  it('renders a grade-banded cause-and-effect investigation', () => {
    const middle = renderTool('weatherSystems', { weatherSystems: { tab: 'experiment', scenario: 'coldFront' } }, { gradeLevel: '7th Grade' });
    expect(middle).toContain('Cause &amp; Effect Lab');
    expect(middle).toContain('Change one thing');
    expect(middle).toContain('Keep all other starting conditions fixed.');
    expect(middle).toContain('Front speed');
    expect(middle).toContain('Run controlled test');
    expect(middle).toContain('data-weather-experiment-lab');

    const early = renderTool('weatherSystems', { weatherSystems: { tab: 'experiment', scenario: 'fair' } }, { gradeLevel: '1st Grade' });
    expect(early).toContain('Change one weather ingredient');
    expect(early).not.toContain('Front speed');
    expect(early).not.toContain('Instability');
  });

  it('visualizes baseline and one-variable experiment results', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'fair' });
    const result = kernel.runExperiment(state, 'humidity', 90, 6);
    result.prediction = 'increase';
    result.predictionCorrect = true;
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'experiment', scenario: 'fair', experimentVariable: 'humidity', experimentValue: 90,
      experimentHour: 6, experimentPrediction: 'increase', experimentResult: result
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Prediction supported');
    expect(html).toContain('data-weather-experiment-chart');
    expect(html).toContain('Controlled experiment comparison at plus 6 hours');
    expect(html).toContain('One-variable test');
    expect(html).toContain('made precipitation potential increase');
  });

  it('renders a complete forecast mission and teacher guide', () => {
    const forecast = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', scenario: 'winterStorm' } }, { gradeLevel: '10th Grade' });
    expect(forecast).toContain('What will happen in the next 6 hours?');
    expect(forecast).toContain('Claim-Evidence-Reasoning note');
    expect(forecast).toContain('9-member teaching ensemble');
    expect(forecast).toContain('Their agreement is not an operational weather probability');
    expect(forecast).toContain('3. School readiness decision');
    expect(forecast).toContain('4. How confident are you?');
    expect(forecast).toContain('Rate forecast confidence');
    expect(forecast).toContain('Verify forecast');
    expect(forecast).toContain('data-weather-forecast-readiness');
    expect(forecast).toContain('Forecast Readiness');
    expect(forecast).toContain('aria-label="Forecast readiness"');
    expect(forecast).toContain('Transparent scoring rubric');
    expect(forecast).toContain('Reasoning: teacher/peer review');
    expect(forecast).toContain('data-weather-cer-composer');
    expect(forecast).toContain('CER Composer');
    expect(forecast).toContain('Claim Evidence Reasoning sentence frames');
    expect(forecast).toContain('0 / 20 minimum characters');
    expect(forecast).toContain('Your next move');
    expect(forecast).toContain('data-weather-forecast-journal');
    expect(forecast).toContain('Forecast Revision Journal');
    expect(forecast).toContain('Verify a forecast to begin your revision story.');
    expect(forecast).toContain('data-weather-broadcast-studio');
    expect(forecast).toContain('Weather Broadcast Studio');
    expect(forecast).toContain('Add weather, timing, hazard, action to complete this briefing.');
    expect(forecast).toContain('aria-label="Broadcast briefing completeness"');
    expect(forecast).toContain('data-weather-reasoning-pulse');
    expect(forecast).toContain('Reasoning Pulse Check');
    expect(forecast).toContain('Verify at least one forecast to unlock the reasoning check.');
    expect(forecast).toContain('aria-label="Reasoning pulse completion"');
    expect(forecast).toContain('This diagnostic highlights explanations to revisit. It is not a quiz grade');
    expect(forecast).toContain('data-weather-peer-review');
    expect(forecast).toContain('Peer Review Exchange');
    expect(forecast).toContain('Verify at least one forecast before exchanging peer feedback.');
    expect(forecast).toContain('aria-label="Peer review completeness"');
    expect(forecast).toContain('Review the reasoning, not the person.');
    expect(forecast).toContain('data-weather-reflection-ticket');
    expect(forecast).toContain('Reflection &amp; Exit Ticket');
    expect(forecast).toContain('Verify at least one forecast to unlock the reflection exit ticket.');
    expect(forecast).toContain('aria-label="Learner reflection completeness"');
    expect(forecast).toContain('This self-assessment describes learning readiness, not forecast accuracy or a grade.');

    const guide = renderTool('weatherSystems', { weatherSystems: { tab: 'teacher' } }, { gradeLevel: '5th Grade' });
    expect(guide).toContain('Predict - Observe - Explain - Revise');
    expect(guide).toContain('data-weather-mission-builder');
    expect(guide).toContain('Classroom Mission Builder');
    expect(guide).toContain('Front Boundary Detective');
    expect(guide).toContain('35-minute lesson');
    expect(guide).toContain('Copy mission brief');
    expect(guide).toContain('aria-label="Copy classroom mission brief to clipboard"');
    expect(guide).toContain('Preview copy-ready mission brief');
    expect(guide).toContain('UDL access &amp; challenge');
    expect(guide).toContain('Core pathway');
    expect(guide).toContain('aria-label="Core pathway mission supports"');
    expect(guide).toContain('Allow written, oral, visual, or broadcast responses.');
    expect(guide).toContain('Learning pathway: Core pathway');
    expect(guide).toContain('UDL ACCESS AND CHALLENGE');
    expect(guide).toContain('data-weather-learning-lens');
    expect(guide).toContain('Three-Dimensional Learning Lens');
    expect(guide).toContain('Analyzing and interpreting data');
    expect(guide).toContain('Crosscutting concept');
    expect(guide).toContain('Patterns');
    expect(guide).toContain('A boundary claim supported by spatial and temporal station contrasts.');
    expect(guide).toContain('THREE-DIMENSIONAL LEARNING LENS');
    expect(guide).toContain('Local alignment note: Connect this mission to district performance expectations and adopted curriculum.');
    expect(guide).toContain('data-weather-student-mission-card');
    expect(guide).toContain('Student Mission Card');
    expect(guide).toContain('Copy student directions');
    expect(guide).toContain('aria-label="Copy student mission directions to clipboard"');
    expect(guide).toContain('Preview student directions');
    expect(guide).toContain('aria-label="Student mission directions plain text"');
    expect(guide).toContain('STUDENT WEATHER MISSION');
    expect(guide).toContain('BEFORE YOU FINISH');
    expect(guide).toContain('Student directions exclude teacher press questions, conference records, and local alignment notes.');
    expect(guide).toContain('Builder selections affect this planning card only.');
    expect(guide).toContain('data-weather-teacher-checkpoints');
    expect(guide).toContain('Teacher Checkpoint Dashboard');
    expect(guide).toContain('0 of 5 checkpoints ready');
    expect(guide).toContain('aria-label="Teacher checkpoint readiness"');
    expect(guide).toContain('they are not a grade or proof of scientific understanding');
    expect(guide).toContain('data-weather-teacher-conference-planner');
    expect(guide).toContain('Teacher Conference Planner');
    expect(guide).toContain('0 of 4 look-fors reviewed');
    expect(guide).toContain('aria-label="Teacher look-fors reviewed"');
    expect(guide).toContain('Do not enter student names or sensitive personal information.');
    expect(guide).toContain('data-weather-teacher-handoff');
    expect(guide).toContain('Teacher Handoff Brief');
    expect(guide).toContain('Copy handoff brief');
    expect(guide).toContain('RECORDED INTERACTION EVIDENCE (NOT A GRADE)');
    expect(guide).toContain('No teacher note recorded.');
    expect(guide).toContain('Grade-band progression');
    expect(guide).toContain('Model boundaries');
    expect(guide).toContain('Immersive 3D and VR are optional representations.');
    expect(guide).toContain('Live observations describe current conditions');
    expect(guide).toContain('MS-ESS2-5');
  });

  it('builds a copy-ready secondary ensemble mission', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', teacherMissionId: 'uncertainty',
      teacherMissionDuration: '50', teacherMissionGrouping: 'teams',
      teacherMissionSupport: 'extension'
    } }, { gradeLevel: '10th Grade' });
    expect(guide).toContain('data-weather-mission-builder');
    expect(guide).toContain('Ensemble Uncertainty Challenge');
    expect(guide).toContain('How should ensemble spread change forecast confidence and decision-making?');
    expect(guide).toContain('50-minute deep dive');
    expect(guide).toContain('Teams of 3-4');
    expect(guide).toContain('Extension challenge');
    expect(guide).toContain('Critique one model assumption or missing measurement.');
    expect(guide).toContain('Explain how uncertainty changes confidence or action.');
    expect(guide).toContain('Developing and using models');
    expect(guide).toContain('Stability and change');
    expect(guide).toContain('A calibrated uncertainty statement that distinguishes agreement from probability.');
    expect(guide).toContain('What ensemble disagreement or model assumption should limit confidence?');
    expect(guide).toContain('An uncertainty statement that distinguishes model agreement from operational probability.');
    expect(guide).toContain('YOUR LEARNING PATHWAY');
    expect(guide).toContain('Repeat the mission in a contrasting scenario.');
    expect(guide).toContain('Identify one model assumption or missing measurement.');
    expect(guide).toContain('Remember: This simulation is a teaching model.');
    expect(guide).toContain('aria-label="9-12 classroom mission choices"');
    expect(guide).toContain('aria-label="Classroom mission brief plain text"');
    expect(guide).toContain('Open first student stage');
  });

  it('creates an early-learner mission with multimodal deliverables', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', teacherMissionId: 'weatherStory',
      teacherMissionDuration: '20', teacherMissionGrouping: 'pairs',
      teacherMissionSupport: 'scaffold'
    } }, { gradeLevel: '1st Grade' });
    expect(guide).toContain('Weather Detective Story');
    expect(guide).toContain('What weather clues can help us tell what may happen next?');
    expect(guide).toContain('A picture or spoken forecast that names one weather clue.');
    expect(guide).toContain('20-minute sprint');
    expect(guide).toContain('Scaffolded access');
    expect(guide).toContain('Preview picture icons for cloud, wind, temperature, and rain.');
    expect(guide).toContain('I think ___ because I noticed ___.');
    expect(guide).toContain('Accept pointing, drawing, speaking, or acting out the explanation.');
    expect(guide).toContain('Analyzing and interpreting data');
    expect(guide).toContain('Patterns');
    expect(guide).toContain('A picture or spoken forecast that cites an observable weather clue.');
    expect(guide).toContain('What pattern did you notice, and what makes that clue useful?');
    expect(guide).toContain('Use the picture icons and point to the weather clue you chose.');
    expect(guide).toContain('Practice with a partner: I think ___ because I noticed ___.');
    expect(guide).toContain('You may point, draw, speak, or act out your explanation.');
    expect(guide).toContain('CHECK YOUR WORK');
    expect(guide).toContain('aria-label="K-2 classroom mission choices"');
    expect(guide).toContain('Grade band: K-2');
  });

  it('prioritizes the first incomplete teacher checkpoint from recorded work', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', scenario: 'coldFront',
      observationLog: [{ id: 'central-0', station: 'Central School' }],
      patternCompared: true, experimentsRun: 1, forecastsIssued: 1,
      evidence: ['pressure', 'front'], reasoning: 'Pressure is falling as the front approaches.',
      forecastHistory: [{ attempt: 1, score: 76, evidenceCount: 2, reasoning: 'Pressure is falling as the front approaches.' }]
    } }, { gradeLevel: '7th Grade' });
    expect(guide).toContain('4 of 5 checkpoints ready');
    expect(guide).toContain('aria-valuenow="4"');
    expect(guide).toContain('Suggested conference focus: Revision');
    expect(guide).toContain('One verified forecast is ready to revise and compare.');
    expect(guide).toContain('Open student stage: Revision');
  });

  it('shifts a complete teacher dashboard toward transfer and model limits', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', scenario: 'coldFront',
      observationLog: [{ id: 'central-0', station: 'Central School' }],
      lensEvidence: ['pressure'], experimentsRun: 1, forecastsIssued: 2,
      evidence: ['pressure', 'front', 'radar'], reasoning: 'Pressure and wind changes support an approaching front.',
      forecastHistory: [
        { attempt: 1, score: 68, evidenceCount: 2, reasoning: 'Pressure is falling.' },
        { attempt: 2, score: 86, evidenceCount: 3, reasoning: 'Pressure and wind changes support an approaching front.' }
      ]
    } }, { gradeLevel: '10th Grade' });
    expect(guide).toContain('5 of 5 checkpoints ready');
    expect(guide).toContain('aria-valuenow="5"');
    expect(guide).toContain('Latest revision improved the model-match score by 18 points.');
    expect(guide).toContain('Suggested conference focus: Transfer and model limits');
    expect(guide).toContain('Compare the teaching model with local weather observations.');
  });
  it('records teacher-authored look-fors and prioritizes the next conference focus', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher',
      teacherRatings: { observe: 'secure', compare: 'developing', explain: 'emerging' },
      teacherConferenceNote: 'Ask for a second measurement before accepting the causal explanation.'
    } }, { gradeLevel: '7th Grade' });
    expect(guide).toContain('3 of 4 look-fors reviewed');
    expect(guide).toContain('1 secure');
    expect(guide).toContain('aria-valuenow="3"');
    expect(guide).toContain('Suggested next look-for: Forecast, justify, and revise');
    expect(guide).toContain('Ask for a second measurement before accepting the causal explanation.');
    expect(guide).toContain('aria-label="Rate Select relevant station evidence"');
    expect(guide).toContain('aria-pressed="true"');
  });

  it('moves a fully secure conference record to a transfer challenge', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher',
      teacherRatings: { observe: 'secure', compare: 'secure', explain: 'secure', revise: 'secure' }
    } }, { gradeLevel: '10th Grade' });
    expect(guide).toContain('4 of 4 look-fors reviewed');
    expect(guide).toContain('4 secure');
    expect(guide).toContain('aria-valuenow="4"');
    expect(guide).toContain('Transfer challenge');
    expect(guide).toContain('Invite transfer to a new scenario.');
  });

  it('uses early-learner language in teacher conference look-fors', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: { tab: 'teacher' } }, { gradeLevel: '1st Grade' });
    expect(guide).toContain('aria-label="K-2 teacher conference look-fors"');
    expect(guide).toContain('Notice a weather clue');
    expect(guide).toContain('Tell what changed');
    expect(guide).toContain('Try one change');
    expect(guide).toContain('Share and improve');
  });

  it('builds a portable teacher handoff from interaction and teacher evidence', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', scenario: 'coldFront', simHour: 6,
      observationLog: [{ id: 'central-0', station: 'Central School' }],
      patternCompared: true, experimentsRun: 1, forecastsIssued: 2,
      teacherRatings: { observe: 'secure', compare: 'developing', explain: 'secure', revise: 'secure' },
      teacherConferenceNote: 'Ask the learner to explain why the wind shift supports the forecast.',
      reflectionShift: 'verification', reflectionReadiness: 'transfer',
      reflectionQuestion: 'Would a mountain change where the heaviest rain falls?', reflectionSubmitted: true,
      reasoningPulseResponses: { systems: 'approaching', saturation: 'temperatureOnly', fairTest: 'oneVariable' },
      peerReviewStrength: 'reasoning', peerReviewMove: 'explainLink',
      peerReviewFeedback: 'The evidence is relevant. Explain the wind shift connection.', peerReviewSubmitted: true,
      forecastHistory: [
        { attempt: 1, score: 68, evidenceCount: 2 },
        { attempt: 2, score: 86, evidenceCount: 3 }
      ]
    } }, { gradeLevel: '7th Grade' });
    expect(guide).toContain('data-weather-teacher-handoff');
    expect(guide).toContain('WEATHER SYSTEMS TEACHER HANDOFF');
    expect(guide).toContain('Scenario: Approaching Cold Front');
    expect(guide).toContain('Model time: T +6 hours');
    expect(guide).toContain('Investigation checkpoints ready: 5/5');
    expect(guide).toContain('Latest model-match score: 86/100 with 3 evidence sources');
    expect(guide).toContain('Latest score change: +18 points');
    expect(guide).toContain('Learner exit ticket: Saved');
    expect(guide).toContain('Reasoning pulse: 2/3 explanations supported; 3/3 answered');
    expect(guide).toContain('Reasoning review focus: Moisture and saturation');
    expect(guide).toContain('Peer review: Saved');
    expect(guide).toContain('Peer-identified strength: Claim-evidence connection');
    expect(guide).toContain('Peer revision move: Explain how the evidence supports the claim');
    expect(guide).toContain('Peer feedback: The evidence is relevant. Explain the wind shift connection.');
    expect(guide).toContain('Thinking changed by: Forecast verification');
    expect(guide).toContain('Self-assessed explanation readiness: Ready to apply to a new system');
    expect(guide).toContain('Learner next question: Would a mountain change where the heaviest rain falls?');
    expect(guide).toContain('Analyze interacting patterns: Developing');
    expect(guide).toContain('Ask the learner to explain why the wind shift supports the forecast.');
    expect(guide).toContain('aria-label="Copy Teacher Handoff Brief to clipboard"');
    expect(guide).toContain('aria-label="Teacher Handoff Brief plain text"');
  });

  it('saves a complete learner reflection after forecast verification', () => {
    const forecast = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', forecastsIssued: 1,
      reflectionShift: 'experiment', reflectionReadiness: 'explain',
      reflectionQuestion: 'How would a faster front change the timing?',
      reflectionSubmitted: true
    } }, { gradeLevel: '7th Grade' });
    expect(forecast).toContain('data-weather-reflection-ticket');
    expect(forecast).toContain('Reflection &amp; Exit Ticket');
    expect(forecast).toContain('✓ Saved');
    expect(forecast).toContain('aria-label="Learner reflection completeness"');
    expect(forecast).toContain('aria-valuenow="3"');
    expect(forecast).toContain('The controlled test');
    expect(forecast).toContain('I can explain with evidence');
    expect(forecast).toContain('How would a faster front change the timing?');
    expect(forecast).toContain('✓ Exit ticket saved');
  });

  it('uses early-learner language for reflection and transfer', () => {
    const forecast = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'fair', forecastsIssued: 1
    } }, { gradeLevel: '1st Grade' });
    expect(forecast).toContain('Weather Thinking Check');
    expect(forecast).toContain('0/2');
    expect(forecast).toContain('Partner Weather Talk');
    expect(forecast).toContain('What was strong?');
    expect(forecast).toContain('What could make it even better?');
    expect(forecast).toContain('I noticed... I wonder...');
    expect(forecast).toContain('Use more than one clue');
    expect(forecast).toContain('Try one change');
    expect(forecast).toContain('Think Back &amp; Share');
    expect(forecast).toContain('What helped your idea change?');
    expect(forecast).toContain('How ready are you to tell your weather story?');
    expect(forecast).toContain('What do you still wonder?');
    expect(forecast).toContain('I can try a new story');
  });

  it('supports a complete middle-grades reasoning pulse with explanatory feedback', () => {
    const forecast = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', forecastsIssued: 1,
      reasoningPulseResponses: { systems: 'approaching', saturation: 'smallSpread', fairTest: 'oneVariable' }
    } }, { gradeLevel: '7th Grade' });
    expect(forecast).toContain('data-weather-reasoning-pulse');
    expect(forecast).toContain('Reasoning Pulse Check');
    expect(forecast).toContain('3/3 explanations supported');
    expect(forecast).toContain('aria-label="Reasoning pulse completion"');
    expect(forecast).toContain('aria-valuenow="3"');
    expect(forecast).toContain('✓ Supported.');
    expect(forecast).toContain('A controlled test changes one variable while holding the others fixed');
  });

  it('surfaces a misconception as a Teacher Handoff review focus', () => {
    const guide = renderTool('weatherSystems', { weatherSystems: {
      tab: 'teacher', scenario: 'coldFront', forecastsIssued: 1,
      reasoningPulseResponses: { systems: 'approaching', saturation: 'temperatureOnly', fairTest: 'oneVariable' }
    } }, { gradeLevel: '7th Grade' });
    expect(guide).toContain('Reasoning pulse: 2/3 explanations supported; 3/3 answered');
    expect(guide).toContain('Reasoning review focus: Moisture and saturation');
  });

  it('saves structured peer feedback after a verified forecast', () => {
    const forecast = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', forecastsIssued: 1,
      peerReviewStrength: 'reasoning', peerReviewMove: 'explainLink',
      peerReviewFeedback: 'I notice the pressure evidence is clear. Explain how the wind shift supports the timing.',
      peerReviewSubmitted: true
    } }, { gradeLevel: '7th Grade' });
    expect(forecast).toContain('data-weather-peer-review');
    expect(forecast).toContain('Peer Review Exchange');
    expect(forecast).toContain('✓ Review saved');
    expect(forecast).toContain('aria-label="Peer review completeness"');
    expect(forecast).toContain('aria-valuenow="3"');
    expect(forecast).toContain('Claim-evidence connection');
    expect(forecast).toContain('Explain how the evidence supports the claim');
    expect(forecast).toContain('I notice the pressure evidence is clear.');
    expect(forecast).toContain('✓ Peer review saved');
  });

  it('personalizes grade-banded CER sentence frames from forecast evidence', () => {
    const middle = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront',
      predictionPrecip: 'rain', predictionTiming: '0-3',
      evidence: ['pressure', 'windShift'],
      carriedEvidence: { signalTitle: 'System strengthening', ids: ['pressure', 'windShift'], startHour: 0, endHour: 3 }
    } }, { gradeLevel: '7th Grade' });
    expect(middle).toContain('I predict rain will begin within 0 to 3 hours.');
    expect(middle).toContain('My strongest evidence is pressure tendency, wind direction and speed.');
    expect(middle).toContain('system strengthening connects the observations to the forecast.');
    expect(middle).toContain('2 of 3');

    const early = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'fair', reasoning: 'Clouds are changing.'
    } }, { gradeLevel: '1st Grade' });
    expect(early).toContain('Tell Your Weather Story');
    expect(early).toContain('Add a claim');
    expect(early).toContain('Add why it matters');
    expect(early).toContain('20 / 10 minimum characters');
  });

  it('preserves Map Lab evidence provenance in the Forecast Mission', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront',
      evidence: ['pressure', 'windShift'],
      carriedEvidence: {
        startHour: 0,
        endHour: 3,
        signalTitle: 'System strengthening',
        signalText: 'Falling pressure and rising precipitation potential support this claim.',
        ids: ['pressure', 'windShift']
      }
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('data-weather-carried-evidence');
    expect(html).toContain('Evidence carried from the Map Lab');
    expect(html).toContain('T +0 to T +3');
    expect(html).toContain('Pressure tendency');
    expect(html).toContain('Wind direction and speed');
    expect(html).toContain('Dominant signal: System strengthening');
    expect(html).toContain('Review map evidence');
    expect(html).toContain('2/3');
  });

  it('celebrates a fully prepared forecast before verification', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast',
      scenario: 'coldFront',
      evidence: ['pressure', 'front', 'radar'],
      predictionPrecip: 'storms',
      predictionTiming: '4-6',
      predictionHazard: 'lightning',
      readinessAction: 'indoors',
      forecastConfidence: '95',
      reasoning: 'I predict storms because pressure is falling and the cold front is approaching.'
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('aria-label="Forecast readiness"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-label="Claim Evidence Reasoning completeness"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('CER structure ready');
    expect(html).toContain('Ready to verify');
    expect(html).toContain('Forecast complete');
    expect(html).toContain('All readiness signals are complete. Verify when ready.');
  });

  it('builds an audience-specific weather broadcast from forecast choices', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', broadcastAudience: 'families',
      predictionPrecip: 'storms', predictionTiming: '4-6', predictionHazard: 'lightning',
      readinessAction: 'indoors', forecastConfidence: '80'
    } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('Weather Broadcast Studio');
    expect(html).toContain('On air');
    expect(html).toContain('aria-label="Broadcast briefing completeness"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('Family weather update: Thunderstorms are most likely in 4 to 6 hours.');
    expect(html).toContain('Main concern: lightning.');
    expect(html).toContain('Recommended action: move activities indoors.');
    expect(html).toContain('Forecast confidence: 80%.');
    expect(html).toContain('Communication readiness is separate from forecast accuracy.');
  });

  it('compares verified forecasts and highlights revision momentum', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast',
      scenario: 'coldFront',
      forecastHistory: [
        { attempt: 1, score: 55, precip: 'rain', timing: '7-12', hazard: 'highWind', action: 'monitor', confidence: 60, evidenceCount: 1, modelHour: 0 },
        { attempt: 2, score: 85, precip: 'storms', timing: '4-6', hazard: 'lightning', action: 'indoors', confidence: 80, evidenceCount: 3, reasoning: 'Falling pressure and the wind shift support an approaching cold front.', modelHour: 3 }
      ]
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Forecast Revision Journal');
    expect(html).toContain('Revision improved by 30 points');
    expect(html).toContain('Forecast #2 - latest');
    expect(html).toContain('3 evidence sources');
    expect(html).toContain('Falling pressure and the wind shift support an approaching cold front.');
    expect(html).toContain('aria-label="Verified forecast attempts"');
    expect(html).toContain('aria-label="Forecast 2 score"');
    expect(html).toContain('aria-valuenow="85"');
  });

  it('explains confidence calibration after forecast verification', () => {
    const kernel = window.WeatherSystemsKernel;
    const state = kernel.resolvedState({ scenario: 'coldFront' });
    const result = kernel.scoreForecast(state, {
      precip: 'storms', timing: '4-6', hazard: 'lightning', action: 'indoors', confidence: 95, evidence: ['pressure', 'front', 'radar']
    });
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', forecastResult: result,
      predictionPrecip: 'storms', predictionTiming: '4-6', predictionHazard: 'lightning', readinessAction: 'indoors', forecastConfidence: '95',
      evidence: ['pressure', 'front', 'radar'], reasoning: 'Pressure is falling while the front approaches and humid air rises.'
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain(result.calibration.label);
    expect(html).toContain(result.calibration.selected + '% vs ' + result.calibration.agreement + '%');
    expect(html).toContain('Readiness decision matches the hazard');
  });
  it('renders logged station observations as an accessible evidence notebook', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'map',
      observationLog: [
        { id: 'central-0-0', station: 'Central School', hour: 0, temperature: 24, dewPoint: 19, pressure: 1008, wind: 'SW 24 km/h', cloudCover: 72 },
        { id: 'coast-3-1', station: 'Harbor Point', hour: 3, temperature: 20, dewPoint: 18, pressure: 1004, wind: 'S 30 km/h', cloudCover: 90 }
      ]
    } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Evidence notebook');
    expect(html).toContain('Logged observations (2)');
    expect(html).toContain('Student weather observations by station and model hour');
    expect(html).toContain('Harbor Point');
  });

});

describe('Weather Systems 2D map scene rendering', () => {
  // jsdom has no 2D context, so the canvas painter is exercised against a recording stub.
  // This is the only gate that runs the drawing code at all.
  function recordingContext() {
    const calls = [];
    const gradient = { addColorStop() {} };
    const ctx = {
      calls,
      canvas: null,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetY: 0,
      measureText: (text) => ({ width: String(text).length * 6 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    };
    [
      'save', 'restore', 'setTransform', 'translate', 'scale', 'clip',
      'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect',
      'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText',
    ].forEach((name) => {
      ctx[name] = (...args) => { calls.push([name, args]); };
    });
    return ctx;
  }

  function fakeCanvas() {
    const ctx = recordingContext();
    const canvas = { style: {}, width: 0, height: 0, _dpr: 1, getContext: () => ctx };
    ctx.canvas = canvas;
    return canvas;
  }

  function paint(overrides, options) {
    const kernel = window.WeatherSystemsKernel;
    const opts = options || {};
    const state = kernel.resolvedState(overrides || {});
    const scenario = kernel.scenarios.filter((item) => item.id === state.scenario)[0] || kernel.scenarios[1];
    const canvas = fakeCanvas();
    kernel.drawWeatherScene(canvas, state, scenario, opts.station || 'central', opts.time == null ? 1200 : opts.time, !!opts.dark, !!opts.contrast);
    return canvas.getContext('2d');
  }

  it('paints every scenario in light, dark, and high-contrast modes without throwing', () => {
    const kernel = window.WeatherSystemsKernel;
    kernel.scenarios.forEach((scenario) => {
      [
        { dark: false, contrast: false },
        { dark: true, contrast: false },
        { dark: true, contrast: true },
      ].forEach((mode) => {
        const ctx = paint({ scenario: scenario.id, simHour: 6 }, mode);
        expect(ctx.calls.length).toBeGreaterThan(50);
      });
    });
  });

  it('keeps save and restore balanced so later layers are not left with leaked state', () => {
    const ctx = paint({ scenario: 'summerStorm', simHour: 8 }, { dark: false });
    let depth = 0;
    let lowest = 0;
    ctx.calls.forEach(([name]) => {
      if (name === 'save') depth += 1;
      if (name === 'restore') { depth -= 1; lowest = Math.min(lowest, depth); }
    });
    expect(lowest).toBe(0);
    expect(depth).toBe(0);
  });

  it('emits no non-finite geometry for extreme slider values', () => {
    [
      { scenario: 'winterStorm', temp: -15, humidity: 100, windSpeed: 80, windDir: 359, frontSpeed: 65, terrain: 100, instability: 100, simHour: 24 },
      { scenario: 'fair', temp: 38, humidity: 10, windSpeed: 0, windDir: 0, frontSpeed: 0, terrain: 0, instability: 0, simHour: 0 },
    ].forEach((overrides) => {
      const ctx = paint(overrides, { dark: false, time: 0 });
      ctx.calls.forEach(([name, args]) => {
        args.forEach((arg) => {
          if (typeof arg === 'number') expect(Number.isFinite(arg), name + ' received ' + arg).toBe(true);
        });
      });
    });
  });

  it('drops decorative passes in high-contrast mode but keeps the data layers', () => {
    const overrides = { scenario: 'coldFront', simHour: 6 };
    const standard = paint(overrides, { dark: true, contrast: false });
    const contrast = paint(overrides, { dark: true, contrast: true });
    expect(contrast.calls.length).toBeLessThan(standard.calls.length);
    // Station markers and the pressure system survive the contrast pass.
    const contrastText = contrast.calls.filter(([name]) => name === 'fillText').map(([, args]) => String(args[0]));
    expect(contrastText.join(' ')).toContain('Central School');
    expect(contrastText).toContain('L');
  });

  it('labels each station pill with its modeled temperature', () => {
    const ctx = paint({ scenario: 'coldFront', simHour: 6 }, { dark: false });
    const labels = ctx.calls.filter(([name]) => name === 'fillText').map(([, args]) => String(args[0]));
    ['West Ridge', 'Central School', 'Harbor Point', 'North Valley'].forEach((name) => {
      expect(labels.some((label) => label.indexOf(name) === 0 && /-?\d+°$/.test(label))).toBe(true);
    });
  });

  it('derives appearance cues from the model so the sliders visibly change the map', () => {
    const kernel = window.WeatherSystemsKernel;
    const humid = kernel.sceneAppearance(kernel.resolvedState({ scenario: 'coldFront', simHour: 5 }));
    const dry = kernel.sceneAppearance(kernel.resolvedState({ scenario: 'coldFront', humidity: 12, instability: 5, simHour: 5 }));
    expect(dry.storminess).toBeLessThan(humid.storminess);
    expect(dry.sunStrength).toBeGreaterThan(humid.sunStrength);
    expect(dry.sunVisible).toBe(true);
    // Fully overcast hides the sun entirely rather than leaving a washed-out disc behind cloud.
    const overcast = kernel.sceneAppearance(kernel.resolvedState({ scenario: 'winterStorm', simHour: 5 }));
    expect(overcast.sunVisible).toBe(false);

    // Dropping the temperature slider whitens the ground; a warm scenario never does.
    const frozen = kernel.sceneAppearance(kernel.resolvedState({ scenario: 'winterStorm', temp: -12, simHour: 5 }));
    const warm = kernel.sceneAppearance(kernel.resolvedState({ scenario: 'fair', simHour: 5 }));
    expect(frozen.snowCover).toBeGreaterThan(0.5);
    expect(frozen.groundLabel).toBe('snow-covered ground');
    expect(warm.snowCover).toBe(0);
    expect(warm.groundLabel).toBe('green ground');
    expect(warm.skyLabel).toBe('a bright sunlit sky');
  });

  it('blends palette anchors continuously rather than snapping between two looks', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.mixColor('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
    expect(kernel.mixColor('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)');
    expect(kernel.mixColor('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
    expect(kernel.mixColor('#000000', '#ffffff', 0.5, 0.4)).toBe('rgba(128,128,128,0.4)');
    // Out-of-range amounts clamp instead of producing invalid channels.
    expect(kernel.mixColor('#112233', '#ffffff', -3)).toBe('rgb(17,34,51)');
  });
});

describe('Weather Systems meteogram chart', () => {
  const MAP_STATE = { weatherSystems: { tab: 'map', scenario: 'coldFront', selectedStation: 'central' } };

  it('gives every measure its own lane instead of stacking units on one axis', () => {
    const html = renderTool('weatherSystems', MAP_STATE, { gradeLevel: '8th Grade' });
    // Four captioned lanes, each carrying its own printed range.
    ['Temperature &amp; dew point', 'Sea-level pressure', 'Wind speed', 'Cloud cover &amp; precipitation potential'].forEach((caption) => {
      expect(html).toContain(caption);
    });
    expect(html).toContain('hPa</text>');
    expect(html).toContain(' km/h</text>');
    expect(html).toContain('Each band keeps its own scale');
  });

  it('paints the validated categorical hues and never colors the label text', () => {
    const light = renderTool('weatherSystems', MAP_STATE, { gradeLevel: '8th Grade', isDark: false });
    ['#eb6834', '#1baf7a', '#4a3aa7', '#008300', '#2a78d6', '#e87ba4'].forEach((hex) => {
      expect(light).toContain(hex);
    });
    const dark = renderTool('weatherSystems', MAP_STATE, { gradeLevel: '8th Grade', isDark: true });
    ['#d95926', '#199e70', '#9085e9', '#008300', '#3987e5', '#d55181'].forEach((hex) => {
      expect(dark).toContain(hex);
    });
    // The old unvalidated palette is gone.
    ['#fb923c', '#22d3ee', '#a78bfa', '#34d399'].forEach((hex) => {
      expect(light).not.toContain(hex);
    });
  });

  it('ships a legend, direct end labels, and a data table so nothing is color-only', () => {
    const html = renderTool('weatherSystems', MAP_STATE, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-meteogram-legend');
    // Legend keys are drawn marks beside text, not colored text.
    expect(html).toContain('data-weather-front-meteogram');
    expect(html).toContain('Show data table');
    expect(html).toContain('aria-controls="weather-meteogram-table"');
    expect(html).toContain('Every plotted value is also listed in the data table below the chart.');

    const open = renderTool('weatherSystems', {
      weatherSystems: Object.assign({}, MAP_STATE.weatherSystems, { meteogramTable: true }),
    }, { gradeLevel: '8th Grade' });
    expect(open).toContain('<table');
    expect(open).toContain('Hide data table');
    expect(open).toContain('hour by hour');
  });

  it('exposes a focusable hit column per hour that announces the full reading', () => {
    const html = renderTool('weatherSystems', MAP_STATE, { gradeLevel: '8th Grade' });
    const hits = html.match(/T plus \d+ hours: temperature/g) || [];
    expect(hits).toHaveLength(13);
    expect(html).toContain('precipitation potential');
    expect(html).toContain('tabindex="0"');
  });

  it('shows a crosshair tooltip on focus and clears it on blur [mount]', async () => {
    const { React, ReactDOMClient, makeCtx } = await import('./helpers/stem_widgets_smoke_harness.js');
    const cfg = window.StemLab._registry.weatherSystems;
    // motion: false keeps the canvas animation loop out of the mounted test.
    let toolData = { weatherSystems: { tab: 'map', scenario: 'coldFront', selectedStation: 'central', motion: false } };
    const base = makeCtx({ gradeLevel: '8th Grade' });
    const Comp = () => cfg.render(Object.assign({}, base, {
      toolData,
      setToolData: (fn) => { toolData = typeof fn === 'function' ? fn(toolData) : fn; },
    }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    await React.act(async () => { root.render(React.createElement(Comp)); });

    const hits = container.querySelectorAll('[data-weather-front-meteogram] rect[tabindex="0"]');
    expect(hits).toHaveLength(13);
    expect(container.querySelector('[data-weather-meteogram-tooltip]')).toBeNull();

    await React.act(async () => { hits[6].dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })); });
    const tooltip = container.querySelector('[data-weather-meteogram-tooltip]');
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain('T +6 hours');
    expect(tooltip.textContent).toContain('Dew point');
    // Values carry their unit, matching the lane the series lives in.
    expect(tooltip.textContent).toMatch(/hPa/);
    expect(tooltip.textContent).toMatch(/km\/h/);

    await React.act(async () => { hits[6].dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    expect(container.querySelector('[data-weather-meteogram-tooltip]')).toBeNull();

    await React.act(async () => { root.unmount(); });
    container.remove();
  });

  it('keeps the young-learner band on the before/during/after story, not the chart', () => {
    const html = renderTool('weatherSystems', MAP_STATE, { gradeLevel: 'Kindergarten' });
    expect(html).toContain('Before, during, and after');
    expect(html).not.toContain('data-weather-meteogram-legend');
  });
});

describe('Weather Systems station-network and experiment charts', () => {
  const NETWORK_STATE = { tab: 'map', scenario: 'coldFront', simHour: 6 };
  const CHECKED = Object.assign({}, NETWORK_STATE, {
    boundaryGuess: 'north-coast',
    boundaryResult: { guess: 'north-coast', correct: true },
  });

  it('scales station colour to the network range instead of a fixed threshold', () => {
    const html = renderTool('weatherSystems', { weatherSystems: NETWORK_STATE }, { gradeLevel: '7th Grade' });
    // A diverging scale always ships its key, naming the range it is centred on.
    expect(html).toContain('data-weather-network-scale');
    expect(html).toContain('Colder');
    expect(html).toContain('Warmer');
    expect(html).toContain('across the network');
    // The old fixed-threshold hues are gone.
    expect(html).not.toContain('#fb7185');
    expect(html).not.toContain('#60a5fa');
  });

  it('re-centres that scale when the scenario shifts the whole network', () => {
    const warm = renderTool('weatherSystems', { weatherSystems: Object.assign({}, NETWORK_STATE, { scenario: 'summerStorm' }) }, { gradeLevel: '7th Grade' });
    const cold = renderTool('weatherSystems', { weatherSystems: Object.assign({}, NETWORK_STATE, { scenario: 'winterStorm' }) }, { gradeLevel: '7th Grade' });
    const range = (html) => (html.match(/\(([-\d.]+)°C to ([-\d.]+)°C across the network\)/) || []).slice(1).map(Number);
    const [warmLow] = range(warm);
    const [coldLow] = range(cold);
    expect(warmLow).toBeGreaterThan(coldLow);
    // Both scenarios still span both poles, so contrast is visible either way.
    [warm, cold].forEach((html) => {
      expect(html).toContain('Colder');
      expect(html).toContain('Warmer');
    });
  });

  it('withholds the neighbour-contrast bars until the learner has answered', () => {
    const before = renderTool('weatherSystems', { weatherSystems: NETWORK_STATE }, { gradeLevel: '7th Grade' });
    expect(before).not.toContain('data-weather-network-contrast-bars');
    const after = renderTool('weatherSystems', { weatherSystems: CHECKED }, { gradeLevel: '7th Grade' });
    expect(after).toContain('data-weather-network-contrast-bars');
    expect(after).toContain('COMBINED CONTRAST BETWEEN NEIGHBOURS');
  });

  it('gives the experiment dumbbell a signed change column and ink-coloured values', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'experiment',
        scenario: 'coldFront',
        experimentVariable: 'humidity',
        experimentResult: {
          hour: 6,
          variable: 'humidity',
          baselineValue: 72,
          testValue: 90,
          direction: 'increase',
          deltas: { precipPotential: 12 },
          control: { temperature: 20, humidity: 72, pressure: 1008, windSpeed: 24, cloudCover: 60, precipPotential: 55 },
          test: { temperature: 20, humidity: 90, pressure: 1008, windSpeed: 24, cloudCover: 78, precipPotential: 67 },
        },
      },
    }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-experiment-chart');
    expect(html).toContain('CHANGE');
    // Metrics the single variable did not touch say so rather than showing a bare zero.
    expect(html).toContain('no change');
    expect(html).toContain('+18%');
    expect(html).toContain('+12%');
    // The unvalidated sky-blue series colour is gone.
    expect(html).not.toContain('#38bdf8"');
  });
});

describe('Weather Systems evidence-lens change bars', () => {
  function lensCards(html) {
    const section = (html.match(/data-weather-change-lens[\s\S]*?Dominant evidence signal/) || [''])[0];
    return section;
  }

  it('fills the bar from a centre line so direction is not lost', () => {
    // Ahead of the front: pressure falling, precipitation rising.
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 2 } }, { gradeLevel: '8th Grade' });
    const lens = lensCards(html);
    // A rise anchors at the centre and grows right; a fall anchors and grows left.
    expect(lens).toMatch(/left:50%/);
    expect(lens).toMatch(/right:50%/);
    // The centre line and its two ends are labelled, so the scale explains itself.
    expect(lens).toContain('falling');
    expect(lens).toContain('rising');
  });

  it('flips a bar when that measure reverses direction', () => {
    // Isolate one card so the assertion is about that measure, not a card tally.
    const card = (html, label) => lensCards(html).split('<button').filter((chunk) => chunk.includes(label))[0] || '';
    const strengthening = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 2 } }, { gradeLevel: '8th Grade' });
    const clearing = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 9 } }, { gradeLevel: '8th Grade' });
    expect(lensCards(strengthening)).toContain('System strengthening');
    expect(lensCards(clearing)).toContain('Clearing signal');

    // Pressure is the measure that reverses across a front passage, and it is the one
    // the two signal narratives disagree about.
    const pressureAhead = card(strengthening, 'Pressure');
    const pressureBehind = card(clearing, 'Pressure');
    expect(pressureAhead).toContain('right:50%');   // falling ahead of the front
    expect(pressureAhead).not.toContain('left:50%');
    expect(pressureBehind).toContain('left:50%');   // rising behind it
    expect(pressureBehind).not.toContain('right:50%');
    // Precipitation moves the opposite way in each case.
    expect(card(strengthening, 'Precipitation')).toContain('left:50%');
    expect(card(clearing, 'Precipitation')).toContain('right:50%');
  });

  it('reuses one hue per measure across the meteogram and the lens', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 4 } }, { gradeLevel: '8th Grade' });
    // Temperature, pressure, wind and precipitation each appear in both panels in one hue.
    ['#eb6834', '#4a3aa7', '#008300', '#2a78d6'].forEach((hex) => {
      const uses = (html.match(new RegExp(hex.replace('#', '#'), 'gi')) || []).length;
      expect(uses, hex + ' should appear in both the chart and the lens').toBeGreaterThan(1);
    });
    // The failing cyan/sky pair (normal-vision ΔE 6.4) is gone from the lens.
    const lens = lensCards(html);
    expect(lens).not.toContain('bg-cyan-500');
    expect(lens).not.toContain('bg-sky-500');
    expect(lens).not.toContain('text-cyan-800');
  });
});

describe('Weather Systems vertical cross-section', () => {
  const render = (weatherSystems, grade) => renderTool('weatherSystems', { weatherSystems }, { gradeLevel: grade || '8th Grade' });
  const boundaryX = (html) => {
    const match = html.match(/<text x="([\d.]+)"[^>]*>▲ boundary at T \+\d+ h<\/text>/);
    return match ? Number(match[1]) : null;
  };
  const section = (html) => (html.match(/data-weather-cross-section[\s\S]*?<\/section>/) || [''])[0];

  it('advances the boundary with model hour and front speed', () => {
    const early = render({ tab: 'map', scenario: 'coldFront', simHour: 0 });
    const late = render({ tab: 'map', scenario: 'coldFront', simHour: 10 });
    expect(boundaryX(early)).not.toBeNull();
    expect(boundaryX(late)).toBeGreaterThan(boundaryX(early));

    // A near-stalled front has barely moved by the same hour.
    const slow = render({ tab: 'map', scenario: 'coldFront', simHour: 10, frontSpeed: 4 });
    expect(boundaryX(slow)).toBeLessThan(boundaryX(late));
    // The caption reports the speed actually modelled, not the scenario default.
    expect(section(slow)).toContain('moving at 4 km/h');
    expect(section(late)).toContain('moving at 36 km/h');
  });

  it('puts each air mass on the side it actually reaches the ground', () => {
    const labelsFor = (html) => {
      const found = [];
      const re = /<text x="([\d.]+)"[^>]*>(COLD AIR|WARM AIR|WARM AIR ALOFT)<\/text>/g;
      let m;
      while ((m = re.exec(section(html)))) found.push({ x: Number(m[1]), text: m[2] });
      return found;
    };

    // Cold front: cold air behind on the left, warm air ahead on the right.
    const cold = labelsFor(render({ tab: 'map', scenario: 'coldFront', simHour: 4 }));
    expect(cold.find((l) => l.text === 'COLD AIR').x).toBeLessThan(cold.find((l) => l.text === 'WARM AIR').x);

    // Warm front: the reverse — warm air behind on the left, cold wedge ahead on the right.
    const warm = labelsFor(render({ tab: 'map', scenario: 'warmFront', simHour: 4 }));
    expect(warm.find((l) => l.text === 'WARM AIR').x).toBeLessThan(warm.find((l) => l.text === 'COLD AIR').x);

    // Occluded: cold air both sides, warm air lifted clear of the surface.
    const occluded = labelsFor(render({ tab: 'map', scenario: 'winterStorm', simHour: 4 }));
    expect(occluded.filter((l) => l.text === 'COLD AIR')).toHaveLength(2);
    expect(occluded.some((l) => l.text === 'WARM AIR ALOFT')).toBe(true);
    expect(occluded.some((l) => l.text === 'WARM AIR')).toBe(false);
  });

  it('grows a taller cloud as instability rises', () => {
    const cloudY = (html) => {
      const match = section(html).match(/<g transform="translate\([\d.]+ ([\d.]+)\)"/);
      return match ? Number(match[1]) : null;
    };
    const calm = render({ tab: 'map', scenario: 'coldFront', simHour: 4, instability: 5 });
    const violent = render({ tab: 'map', scenario: 'coldFront', simHour: 4, instability: 100 });
    // Smaller y is higher on the canvas.
    expect(cloudY(violent)).toBeLessThan(cloudY(calm));
  });

  it('keeps the schematic honest about its vertical scale', () => {
    const html = section(render({ tab: 'map', scenario: 'coldFront', simHour: 4 }));
    expect(html).toContain('Vertical scale exaggerated; heights are schematic.');
    // Bands are named rather than ticked with invented altitudes.
    expect(html).toContain('high cloud');
    expect(html).toContain('mid level');
    expect(html).not.toMatch(/\d+\s*km<\/text>/);
  });
});

describe('Weather Systems station-model notation', () => {
  it('builds wind barbs to the WMO convention in knots', () => {
    const { windBarbSpec } = window.WeatherSystemsKernel;
    // Half barb 5 kt, full barb 10 kt, pennant 50 kt, speed rounded to the nearest 5 kt.
    expect(windBarbSpec(0)).toMatchObject({ calm: true, pennants: 0, fullBarbs: 0, halfBarbs: 0 });
    expect(windBarbSpec(2)).toMatchObject({ calm: true });
    expect(windBarbSpec(9)).toMatchObject({ rounded: 5, fullBarbs: 0, halfBarbs: 1 });
    expect(windBarbSpec(19)).toMatchObject({ rounded: 10, fullBarbs: 1, halfBarbs: 0 });
    expect(windBarbSpec(46)).toMatchObject({ rounded: 25, fullBarbs: 2, halfBarbs: 1 });
    expect(windBarbSpec(93)).toMatchObject({ rounded: 50, pennants: 1, fullBarbs: 0, halfBarbs: 0 });
    expect(windBarbSpec(150)).toMatchObject({ rounded: 80, pennants: 1, fullBarbs: 3, halfBarbs: 0 });
    // km/h is converted, never treated as knots.
    expect(windBarbSpec(93).knots).toBeCloseTo(50.2, 1);
  });

  it('reports sky cover in eighths', () => {
    const { skyCoverOktas } = window.WeatherSystemsKernel;
    expect(skyCoverOktas(0)).toBe(0);
    expect(skyCoverOktas(6)).toBe(0);
    expect(skyCoverOktas(50)).toBe(4);
    expect(skyCoverOktas(100)).toBe(8);
    // Never out of range, whatever it is handed.
    expect(skyCoverOktas(180)).toBe(8);
    expect(skyCoverOktas(-20)).toBe(0);
    expect(skyCoverOktas(undefined)).toBe(0);
  });

  it('draws one barb mark per unit and swaps the staff for a calm ring', () => {
    const plot = (weatherSystems) => {
      const html = renderTool('weatherSystems', { weatherSystems }, { gradeLevel: '8th Grade' });
      return (html.match(/data-weather-station-model-plot[\s\S]*?<\/svg>/) || [''])[0];
    };
    const strongState = { tab: 'map', scenario: 'winterStorm', windSpeed: 102, selectedStation: 'central' };
    expect(plot(strongState)).toContain('<polygon');  // a pennant is drawn
    // The prose decode names the same marks the plot draws.
    expect(renderTool('weatherSystems', { weatherSystems: strongState }, { gradeLevel: '8th Grade' }))
      .toMatch(/1 pennant \(50 kt each\)/);

    const calmState = { tab: 'map', scenario: 'fair', windSpeed: 0, selectedStation: 'central' };
    expect(plot(calmState)).not.toContain('<polygon');
    expect(renderTool('weatherSystems', { weatherSystems: calmState }, { gradeLevel: '8th Grade' })).toContain('calm');
    // The decode table explains the notation rather than restating the raw reading.
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', windSpeed: 46, selectedStation: 'central' } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('Sky cover in eighths');
    expect(html).toContain('points into the wind, from');
    expect(html).toContain('Wind speed in knots');
  });

  it('stays hidden for the grade bands that do not use the notation', () => {
    const young = renderTool('weatherSystems', { weatherSystems: { tab: 'map' } }, { gradeLevel: '4th Grade' });
    expect(young).not.toContain('data-weather-station-model');
  });
});

describe('Weather Systems ensemble, verification and storyline visuals', () => {
  it('ranks the ensemble bars and emphasises the agreeing category', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', scenario: 'coldFront', simHour: 4 } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-ensemble-bars');
    const bars = (html.match(/data-weather-ensemble-bars[\s\S]*?data-weather-ensemble-spread/) || [''])[0];
    const counts = (bars.match(/>(\d)<\/span>/g) || []).map((m) => Number(m.replace(/\D/g, '')));
    // Ranked, largest first.
    expect(counts).toEqual(counts.slice().sort((a, b) => b - a));
  });

  it('plots all nine members on a shared axis rather than printing a bare range', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', scenario: 'coldFront', simHour: 4 } }, { gradeLevel: '8th Grade' });
    const spread = (html.match(/data-weather-ensemble-spread[\s\S]*?sensitivity to starting conditions/) || [''])[0];
    // Two strips, nine dots each.
    expect((spread.match(/<circle/g) || []).length).toBe(18);
    // Describes how the members are distributed, not merely the range they occupy.
    expect(spread).toContain('across the teaching ensemble');
    expect(spread).toMatch(/9 members span/);
    // Each strip wears its own measure's hue.
    expect(spread).toContain('#eb6834');
    expect(spread).toContain('#4a3aa7');
  });

  it('gives each forecast error a signed bias bar with a key', () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');
    // Bias bars read from a centre line, scaled per metric so a 2-degree miss and a
    // 20-hectopascal miss are not drawn the same length.
    expect(source).toContain('function biasBar(metric, definition)');
    expect(source).toContain("{ id: 'temperature', label: 'Temperature error', scale: 6 }");
    expect(source).toContain("{ id: 'pressure', label: 'Pressure error', scale: 12 }");
    expect(source).toContain('data-weather-bias-key');
    expect(source).toContain('forecast too low');
    expect(source).toContain('forecast too high');
  });

  it('separates the score-weighting segments by hue and by a surface gap', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', scenario: 'coldFront' } }, { gradeLevel: '8th Grade' });
    // Validated adjacent order; the old sky/violet neighbours measured deutan ΔE 5.2.
    ['#3987e5', '#d95926', '#199e70', '#c98500'].forEach((hex) => expect(html).toContain(hex));
    expect(html).not.toContain('bg-sky-400"');
    expect(html).not.toContain('bg-violet-400"');
    // Touching segments are parted by surface, not by a stroke around each one.
    expect(html).toContain('margin-left:2px');
  });

  it('draws the storyline chapters on the curve they were sampled from', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 6 } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-storyline-sparklines');
    const sparks = (html.match(/data-weather-storyline-sparklines[\s\S]*?Evidence cue/) || [''])[0];
    // One small multiple per measure — never two scales sharing a plot.
    expect((sparks.match(/<svg/g) || []).length).toBe(3);
    expect(sparks).toContain('across the 24-hour model window');
    // The direction the line travels is stated, not left to the mark alone.
    expect(sparks).toMatch(/rises steadily|falls steadily|climbs to a peak|dips to a low|stays flat/);
    expect(sparks).toContain('at the current chapter, T plus 6 hours');
  });

  it('never prints raw float noise in the storyline prose', () => {
    // Subtracting two rounded projections used to surface as "-1.3000000000000007°C".
    // Attributes are stripped so this pins the words a learner reads, not SVG geometry.
    [0, 3, 6, 9, 12, 18, 24].forEach((simHour) => {
      ['coldFront', 'warmFront', 'summerStorm', 'winterStorm', 'fair'].forEach((scenario) => {
        const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario, simHour } }, { gradeLevel: '8th Grade' });
        const story = (html.match(/data-weather-atmosphere-storyline[\s\S]*?Evidence cue/) || [''])[0];
        const prose = story.replace(/<[^>]*>/g, ' ');
        expect(prose, scenario + ' at T+' + simHour).not.toMatch(/\d\.\d{3,}/);
      });
    });
  });
});

describe('Weather Systems immersive 3D scene', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const source = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');

  it('only outlines a feature the learner actually selected', () => {
    // The fallback used to be 'airMasses', so every scene opened with a
    // depth-test-disabled yellow wireframe around its largest object.
    expect(source()).toContain("selectFeatureVisual(d.immersiveExplainerFeature || '')");
    expect(source()).not.toContain("selectFeatureVisual(d.immersiveExplainerFeature || 'airMasses')");
  });

  it('fades the two air-mass volumes when the scenario has no front', () => {
    const text = source();
    expect(text).toContain("var hasFrontalBoundary = scenario.frontType !== 'none'");
    expect(text).toContain('hasFrontalBoundary ? 0.13 : 0.03');
    expect(text).toContain('hasFrontalBoundary ? 0.11 : 0.03');
  });

  it('builds cloud height from instability rather than three fixed steps', () => {
    const text = source();
    expect(text).toContain('var convective = clamp(state.instability / 100, 0, 1) * (stormy ? 1 : 0.4)');
    // Cluster height and scale vary per cloud instead of cycling through three buckets.
    expect(text).toContain('sceneNoise(cloudIndex * 2.9)');
    expect(text).toContain('sceneNoise(cloudIndex * 5.1)');
    expect(text).not.toContain('6.2 + (cloudIndex % 3) * 1.4');
  });

  it('keeps the terrain edge and the precipitation column out of the sky', () => {
    const text = source();
    // The 44x34 plane ended inside the camera frustum.
    expect(text).toContain('new THREE.PlaneGeometry(72, 58, profile.terrainX, profile.terrainY)');
    // Particles stay under the cloud deck instead of reaching y=11 as "stars".
    expect(text).toContain("particlePositions[particle * 3 + 1] = 0.4 + ((particle * 83) % 70) / 10");
  });
});

describe('Weather Systems chart ink tokens', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const source = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');

  const luminance = (hex) => {
    const c = hex.replace('#', '');
    const channel = (i) => {
      const v = parseInt(c.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it('keeps muted axis text above AA on every surface the charts sit on', () => {
    const text = source();
    const light = (text.match(/var chartMutedInk = dark \? '#[0-9a-f]{6}' : '(#[0-9a-f]{6})'/) || [])[1];
    const darkInk = (text.match(/var chartMutedInk = dark \? '(#[0-9a-f]{6})'/) || [])[1];
    expect(light).toBeTruthy();
    // These are the light backdrops the charts actually render on: the plain panel, the
    // sky tint used by the saturation and cloud panels, and the emerald readiness tint.
    [['#ffffff', 'panel'], ['#f0f9ff', 'sky-50'], ['#ecfdf5', 'emerald-50']].forEach(([surface, name]) => {
      expect(contrast(light, surface), 'muted ink on ' + name).toBeGreaterThanOrEqual(4.5);
    });
    expect(contrast(darkInk, '#0f172a'), 'muted ink on slate-900').toBeGreaterThanOrEqual(4.5);
  });

  it('puts the shape of a distribution into words, not just its range', () => {
    const { describeSpread } = window.WeatherSystemsKernel;
    // A range alone hides whether members agree or split — which is the whole point of the
    // ensemble strip, and all a sighted reader needs one glance to see.
    expect(describeSpread([10, 10.4, 10.8, 11.2, 11.6, 12], '°C')).toContain('spread fairly evenly');
    expect(describeSpread([10, 10.2, 10.3, 18.5, 18.8, 19], '°C')).toContain('two groups');
    expect(describeSpread([10, 10.2, 10.3, 18.5, 18.8, 19], '°C')).toMatch(/3 below and 3 above/);
    expect(describeSpread([12, 12, 12], '°C')).toContain('same value');
    expect(describeSpread([], '°C')).toContain('No members');
    expect(describeSpread([5, 9], ' hPa')).toContain('2 members span 5 to 9 hPa');
  });

  it('puts the direction a line travels into words', () => {
    const { describeTrajectory } = window.WeatherSystemsKernel;
    expect(describeTrajectory([1, 2, 3, 4, 5], '%')).toContain('rises steadily');
    expect(describeTrajectory([5, 4, 3, 2, 1], '%')).toContain('falls steadily');
    // A front passage peaks mid-window; saying only "0 to 88" would lose that entirely.
    expect(describeTrajectory([10, 40, 88, 40, 0], '%')).toContain('climbs to a peak of 88%');
    expect(describeTrajectory([10, 40, 88, 40, 0], '%')).toContain('around hour 2');
    expect(describeTrajectory([20, 8, 4, 9, 21], ' hPa')).toContain('dips to a low of 4 hPa');
    expect(describeTrajectory([7, 7, 7], '°C')).toContain('stays flat');
    expect(describeTrajectory([3], '°C')).toBe('');
  });

  it('names what moved and what held in a controlled test', () => {
    const html = renderTool('weatherSystems', {
      weatherSystems: {
        tab: 'experiment', scenario: 'coldFront', experimentVariable: 'humidity',
        experimentResult: {
          hour: 6, variable: 'humidity', baselineValue: 72, testValue: 90, direction: 'increase',
          deltas: { precipPotential: 12 },
          control: { temperature: 20, humidity: 72, pressure: 1008, windSpeed: 24, cloudCover: 60, precipPotential: 55 },
          test: { temperature: 20, humidity: 90, pressure: 1008, windSpeed: 24, cloudCover: 78, precipPotential: 67 },
        },
      },
    }, { gradeLevel: '8th Grade' });
    const label = (html.match(/aria-label="(Controlled experiment comparison[^"]*)"/) || [])[1] || '';
    // The held variables are the evidence that the test was fair.
    expect(label).toContain('Moved: humidity +18%');
    expect(label).toContain('3 of 6 measures held steady');
    expect(label).toContain('temperature, pressure, wind speed');
  });

  it('declares the chart ink tokens once rather than per panel', () => {
    const text = source();
    // Panels used to re-declare these, and one drifted to a different muted value.
    expect((text.match(/var chartMutedInk =/g) || [])).toHaveLength(1);
    expect((text.match(/var chartInk =/g) || [])).toHaveLength(1);
    expect(text).not.toMatch(/var mutedColor = dark \? '#[0-9a-f]{6}' : '#[0-9a-f]{6}'/);
    expect(text).not.toMatch(/var textColor = dark \? '#[0-9a-f]{6}' : '#[0-9a-f]{6}'/);
  });

  it('formats every signed value through one rounding helper', () => {
    const text = source();
    // Four near-copies existed; one did not round, which is how float noise reached prose.
    expect(text).toContain('function signedNumber(value, unit, places)');
    expect((text.match(/\(rounded > 0 \? '\+' : ''\)/g) || [])).toHaveLength(1);
    expect(text).not.toMatch(/\(value > 0 \? '\+' : ''\) \+ value \+ unit/);
    expect(text).not.toMatch(/\(metric\.error > 0 \? '\+' : ''\)/);
  });

  it('builds every knockout halo from one helper', () => {
    const text = source();
    expect(text).toContain('function textHalo(backdrop, width)');
    // Only the helper itself still names the paint-order trick.
    expect((text.match(/paintOrder: 'stroke'/g) || [])).toHaveLength(1);
  });
});

describe('Weather Systems concept diagrams', () => {
  const render = (weatherSystems, grade) => renderTool('weatherSystems', { weatherSystems }, { gradeLevel: grade || '8th Grade' });
  const sat = (html) => (html.match(/data-weather-saturation-diagram[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];

  it('draws the dew-point spread as a distance on a temperature axis', () => {
    // The spread is referenced by the station panel, station model, meteogram and the
    // reasoning questions, and was explained in prose everywhere.
    const html = render({ tab: 'map', scenario: 'fair', simHour: 4, selectedStation: 'central' });
    expect(html).toContain('data-weather-saturation-diagram');
    expect(sat(html)).toMatch(/dew [-\d.]+°/);
    expect(sat(html)).toMatch(/air [-\d.]+°/);
    expect(sat(html)).toMatch(/cool [\d.]+°C/);
    // The reading is framed as cooling toward saturation, which is what a dew point is.
    expect(html).toContain('must cool');
  });

  it('separates the two markers when the air is close to saturation', () => {
    // Anchor of the dew/air labels themselves — the axis "warmer" label is end-anchored
    // in both cases, so the block as a whole cannot be the assertion.
    const anchorOf = (html, prefix) => {
      const tag = (sat(html).match(new RegExp('<text[^>]*>' + prefix + ' [^<]*</text>')) || [''])[0];
      return (tag.match(/text-anchor="([a-z]+)"/) || [])[1] || 'middle';
    };
    const near = render({ tab: 'map', scenario: 'warmFront', simHour: 6, selectedStation: 'central' });
    expect(anchorOf(near, 'dew')).toBe('end');
    expect(anchorOf(near, 'air')).toBe('start');
    // With the markers far apart each label just centres on its own mark.
    const wide = render({ tab: 'map', scenario: 'fair', simHour: 4, selectedStation: 'central' });
    expect(anchorOf(wide, 'dew')).toBe('middle');
    expect(anchorOf(wide, 'air')).toBe('middle');
  });

  it('spirals a low counterclockwise and a high clockwise', () => {
    // Pinned from the drawn geometry, not from prose: SVG y points down, so a sign slip
    // silently draws anticyclonic flow around a low. Reading the arrow nearest the top of
    // each centre, a Northern Hemisphere low must be heading west and a high east.
    const html = render({ tab: 'map', scenario: 'coldFront', simHour: 4 });
    const block = (html.match(/data-weather-pressure-wind[\s\S]*?<\/svg>/) || [''])[0];
    const arrowsFor = (centre) => {
      const re = new RegExp('<line[^>]*marker-end="url\\(#weather-pressure-arrow-' + centre + '\\)"[^>]*>', 'g');
      return (block.match(re) || []).map((tag) => ({
        x1: Number((tag.match(/ x1="([-\d.]+)"/) || [])[1]),
        y1: Number((tag.match(/ y1="([-\d.]+)"/) || [])[1]),
        x2: Number((tag.match(/ x2="([-\d.]+)"/) || [])[1]),
      }));
    };
    const low = arrowsFor('low');
    const high = arrowsFor('high');
    expect(low.length).toBe(4);
    expect(high.length).toBe(4);
    const topmost = (arrows) => arrows.slice().sort((a, b) => a.y1 - b.y1)[0];
    // North side of a low: flow runs westward (x decreases) — counterclockwise.
    expect(topmost(low).x2).toBeLessThan(topmost(low).x1);
    // North side of a high: flow runs eastward (x increases) — clockwise.
    expect(topmost(high).x2).toBeGreaterThan(topmost(high).x1);
  });

  it('names the hemisphere its spiral directions apply to', () => {
    const html = render({ tab: 'map', scenario: 'coldFront', simHour: 4 });
    expect(html).toContain('Northern Hemisphere');
    expect(html).toContain('South of the equator the Coriolis deflection reverses');
    // Vertical motion is the link to the weather, so both directions are stated.
    expect(html).toContain('Air converges and rises.');
    expect(html).toContain('Air sinks and spreads outward.');
  });

  it('draws reasoning as the link from evidence to claim, not a third item in a list', () => {
    const html = render({ tab: 'forecast', scenario: 'coldFront', simHour: 4 });
    const block = (html.match(/data-weather-cer-structure[\s\S]*?<\/svg>/) || [''])[0];
    expect(block).toBeTruthy();
    expect(block).toContain('EVIDENCE');
    expect(block).toContain('CLAIM');
    expect(block).toContain('REASONING');
    // The shaft runs evidence -> claim and carries an arrowhead, so the direction of
    // support is drawn rather than implied by card order.
    expect(block).toMatch(/marker-end="url\(#weather-cer-arrow-/);
    expect(block).toContain('why this evidence supports that claim');
  });

  it('shows the link as unbuilt until the reasoning is actually written', () => {
    const empty = render({ tab: 'forecast', scenario: 'coldFront', simHour: 4 });
    const done = render({
      tab: 'forecast', scenario: 'coldFront', simHour: 4,
      predictionPrecip: 'rain', predictionTiming: '4-6',
      evidence: ['pressure', 'clouds', 'tempDew'],
      reasoning: 'Pressure fell steadily while the dew point rose, so the air is approaching saturation ahead of the boundary and rain should begin within a few hours.',
    });
    const cer = (html) => (html.match(/data-weather-cer-structure[\s\S]*?<\/svg>/) || [''])[0];
    expect(cer(empty)).toContain('Without the link, the parts are just a list');
    expect(cer(done)).toContain('The link is written');
    // Dashed while unbuilt, solid once written.
    expect(cer(empty)).toContain('stroke-dasharray');
    expect(cer(done)).not.toContain('stroke-dasharray');
    // Marker ids are document-wide, so each state defines its own rather than sharing one.
    expect(cer(empty)).toContain('weather-cer-arrow-idle');
    expect(cer(done)).toContain('weather-cer-arrow-ready');
  });

  it('maps peer-review choices onto the parts they actually refer to', () => {
    const { cerReviewFocus } = window.WeatherSystemsKernel;
    expect(cerReviewFocus('evidence', 'explainLink')).toEqual({ strength: 'evidence', focus: 'reasoning' });
    expect(cerReviewFocus('claim', 'askEvidence')).toEqual({ strength: 'claim', focus: 'evidence' });
    expect(cerReviewFocus('reasoning', 'clarifyAction')).toEqual({ strength: 'reasoning', focus: null });
    // Readiness, uncertainty and transfer are real review dimensions that sit outside the
    // claim-evidence-reasoning core, so they map to nothing rather than being forced onto it.
    expect(cerReviewFocus('safety', 'transfer')).toEqual({ strength: null, focus: null });
    expect(cerReviewFocus('uncertainty', 'considerUncertainty')).toEqual({ strength: null, focus: null });
    expect(cerReviewFocus('', '')).toEqual({ strength: null, focus: null });
  });

  it('shows a review on the same structure the author assembled', () => {
    const reviewed = render({
      tab: 'forecast', scenario: 'coldFront', simHour: 4, forecastsIssued: 1,
      peerReviewStrength: 'evidence', peerReviewMove: 'explainLink',
    });
    const map = (html) => {
      const at = html.indexOf('data-weather-peer-review-map');
      return at === -1 ? '' : html.slice(at, at + 4000);
    };
    const block = map(reviewed);
    expect(block).toContain('Where this feedback lands');
    expect(block).toContain('STRENGTH');
    expect(block).toContain('NEXT STEP');
    expect(block).toContain('Marked on the same structure the author built');

    // With nothing chosen there is nothing to place, so the map stays out of the way.
    const untouched = render({ tab: 'forecast', scenario: 'coldFront', simHour: 4, forecastsIssued: 1 });
    expect(untouched).not.toContain('data-weather-peer-review-map');

    // A review aimed outside the core says so rather than mislabelling a part.
    const outside = render({
      tab: 'forecast', scenario: 'coldFront', simHour: 4, forecastsIssued: 1,
      peerReviewStrength: 'safety', peerReviewMove: 'transfer',
    });
    expect(map(outside)).toContain('sit outside the claim-evidence-reasoning core');
    expect(map(outside)).not.toContain('STRENGTH');
  });

  it('teaches the same hazard-to-action pairing the forecast is scored against', () => {
    const { readinessActionForHazard } = window.WeatherSystemsKernel;
    const html = render({ tab: 'forecast', scenario: 'coldFront', simHour: 4 });
    const guide = (html.match(/data-weather-readiness-guide[\s\S]*?National Weather\s*Service warnings/) || [''])[0];
    expect(guide).toBeTruthy();
    // Pin the pairing itself. Asserting only that the guide agrees with the function is
    // vacuous — the guide is rendered FROM the function, so both move together and the
    // check can never fail. (Confirmed by mutating lightning to 'shelter': it still passed.)
    const expected = {
      none: ['normal', 'Continue normal activities'],
      lightning: ['indoors', 'Move activities indoors'],
      flood: ['avoidTravel', 'Avoid flooded routes and low crossings'],
      ice: ['delayTravel', 'Delay travel for icy conditions'],
      highWind: ['shelter', 'Shelter away from windows'],
    };
    Object.keys(expected).forEach((hazard) => {
      const [actionId, actionText] = expected[hazard];
      expect(readinessActionForHazard(hazard), hazard).toBe(actionId);
      expect(guide, hazard + ' -> ' + actionId).toContain(actionText);
    });
    // And pin the wiring, so the guide keeps deriving from the scorer rather than
    // hardcoding a second copy that could later disagree with it.
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');
    expect(source).toContain('var actionId = readinessActionForHazard(row.hazard);');
  });

  it('explains why each action follows, without revealing this scenario’s hazard', () => {
    const html = render({ tab: 'forecast', scenario: 'summerStorm', simHour: 3 });
    const guide = (html.match(/data-weather-readiness-guide[\s\S]*?National Weather\s*Service warnings/) || [''])[0];
    // Reasoning, not just a lookup table.
    expect(guide).toContain('Flying debris and glass are the risk');
    expect(guide).toContain('hazardous at surprisingly shallow depths');
    // Identifying the hazard from evidence is the task, so no row is pre-marked as current.
    expect(guide).not.toContain('this scenario');
    // Real safety decisions are not this lab's call, and it says so.
    expect(guide).toContain('district emergency plan');
  });

  it('drops the reasoning column for the youngest band but keeps the pairing', () => {
    const young = render({ tab: 'forecast', scenario: 'coldFront' }, 'Kindergarten');
    const guide = (young.match(/data-weather-readiness-guide[\s\S]*?National Weather\s*Service warnings/) || [''])[0];
    expect(guide).toContain('Move activities indoors');
    expect(guide).not.toContain('Flying debris and glass are the risk');
    expect(guide).toContain('Different weather needs a different safe choice.');
  });

  it('picks a cloud family that matches the weather the scenario produces', () => {
    const { likelyCloudFamily, resolvedState, projectConditions, cloudFamilyById } = window.WeatherSystemsKernel;
    const pick = (scenario, simHour) => {
      const state = resolvedState({ scenario, simHour });
      return likelyCloudFamily(state, projectConditions(state, simHour));
    };
    expect(pick('summerStorm', 3)).toBe('cumulonimbus');
    expect(pick('coldFront', 6)).toBe('cumulonimbus');
    // Overrunning warm-front precipitation is layered, not convective.
    expect(pick('warmFront', 6)).toBe('nimbostratus');
    expect(pick('winterStorm', 6)).toBe('nimbostratus');
    // A high-pressure day gets high thin cloud, and the cold front clears to the same.
    expect(pick('fair', 4)).toBe('cirrus');
    expect(pick('coldFront', 12)).toBe('cirrus');
    expect(cloudFamilyById('nimbostratus').height).toContain('3 km');
  });

  it('renders every family on a height axis and says what it is not claiming', () => {
    const html = render({ tab: 'map', scenario: 'warmFront', simHour: 6 });
    expect(html).toContain('data-weather-cloud-guide');
    ['Cirrus', 'Altostratus', 'Nimbostratus', 'Stratus', 'Cumulus', 'Cumulonimbus'].forEach((name) => {
      expect(html, name).toContain(name);
    });
    expect(html).toContain('13 km');
    // Scientific honesty: the model does not resolve cloud genera and says so.
    expect(html).toContain('identified by shape and height in the real sky, not by this model');
    expect(html).toContain('Fits now: Nimbostratus');
  });
});

describe('Weather Systems map readiness detection', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const source = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');

  it('judges readiness by data arriving, not by a flat deadline', () => {
    const text = source();
    // Every map event counts as progress; a filtered network produces none of them.
    ["map.on('dataloading', noteMapProgress)", "map.on('data', noteMapProgress)", "map.on('sourcedata', noteMapProgress)"].forEach((hook) => {
      expect(text).toContain(hook);
    });
    expect(text).toContain('var sinceProgress = Date.now() - lastMapProgressAt');
    expect(text).toContain('var stalled = sinceProgress >= WEATHER_MAP_STALL_MS');
    // The old flat 30s deadline is gone.
    expect(text).not.toContain('WEATHER_MAP_READY_TIMEOUT_MS');
    expect(text).not.toContain('did not become ready within 30 seconds');
  });

  it('does not condemn a slow link for going quiet mid-download', () => {
    const text = source();
    // Silence alone must not fail the map: a throttled connection can exceed the stall
    // window inside one tile download. A blocked host also reports errors, and it is that
    // pairing which separates the two. Verified against a throttled link (succeeds at ~47s)
    // and a blocked tile host (fails at ~21s).
    expect(text).toContain('&& mapResourceErrors > 0');
    expect(text).toContain('mapResourceErrors += 1');
    expect(text).toContain('lastMapErrorAt = Date.now()');
  });

  it('tells the learner what to do when the map really is unreachable', () => {
    expect(source()).toContain('Retry, or switch to Conceptual 3D to keep working.');
  });

  it('still fails fast when nothing arrives, and cannot spin forever', () => {
    const text = source();
    // A stall is caught well before the old deadline would have fired.
    const stall = Number((text.match(/var WEATHER_MAP_STALL_MS = (\d+);/) || [])[1]);
    const ceiling = Number((text.match(/var WEATHER_MAP_MAX_WAIT_MS = (\d+);/) || [])[1]);
    const notice = Number((text.match(/var WEATHER_MAP_SLOW_NOTICE_MS = (\d+);/) || [])[1]);
    expect(stall).toBeLessThan(30000);
    expect(notice).toBeGreaterThan(stall);
    expect(ceiling).toBeGreaterThan(notice);
    expect(text).toContain("elapsed >= WEATHER_MAP_MAX_WAIT_MS");
  });

  it('tells the learner it is slow rather than claiming it failed', () => {
    const text = source();
    expect(text).toContain('The base map is still loading. Tiles are arriving slowly on this connection or device.');
    // The slow notice is a status, never an error.
    expect(text).toContain("update({ geographicMapStatus: slowMessage })");
    expect(text).toContain('if (!mapSlowNoticeSent && elapsed >= WEATHER_MAP_SLOW_NOTICE_MS)');
  });
});

describe('Weather Systems teacher guide', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const source = () => readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_weathersystems.js'), 'utf8');

  it('shares one clipboard implementation instead of two', () => {
    const text = source();
    // The mission builder and the teacher handoff each carried their own copy of the
    // async-API-then-execCommand dance.
    expect((text.match(/document\.execCommand\('copy'\)/g) || [])).toHaveLength(1);
    expect(text).toContain('function copyToClipboard(text, onResult)');
    expect(text).toContain('copyToClipboard(text, function (ok) { copyStatus(ok, label); })');
    expect(text).toContain('copyToClipboard(handoffText, copyResult)');
  });

  it('states honestly what the checkpoint indicators are and are not', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'teacher', scenario: 'coldFront' } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('they are not a grade or proof of scientific understanding');
    // The exportable record warns against putting identifiable student data in it.
    expect(source()).toContain('Do not add student names or sensitive personal information.');
  });

  it('keeps the lesson timings adding up to the advertised duration', () => {
    const text = source();
    const block = (text.match(/var durations = \{[\s\S]*?\};/) || [''])[0];
    const rows = [...block.matchAll(/'(\d+)': \{ label: '[^']*', timing: 'Launch (\d+) min \| Investigate (\d+) min \| Share (\d+) min' \}/g)];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    rows.forEach(([, total, launch, investigate, share]) => {
      expect(Number(launch) + Number(investigate) + Number(share), total + '-minute plan should sum to ' + total).toBe(Number(total));
    });
  });

  it('offers a mission for every grade band', () => {
    ['Kindergarten', '4th Grade', '7th Grade', '11th Grade'].forEach((gradeLevel) => {
      const html = renderTool('weatherSystems', { weatherSystems: { tab: 'teacher', scenario: 'coldFront' } }, { gradeLevel });
      expect(html, gradeLevel).toContain('data-weather-mission-builder');
      expect(html, gradeLevel).toContain('Copy mission brief');
    });
  });
});

describe('Weather Systems geographic map loader resilience', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const PATHS = [
    'stem_lab/stem_tool_weathersystems.js',
    'desktop/web-app/public/stem_lab/stem_tool_weathersystems.js',
  ];

  it('requests a bounded hourly weather window for temporal playback', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain("'&hourly=' + fields + '&past_hours=6&forecast_hours=25&timezone=auto'");
    expect(source).toContain('normalizeHourlyWeatherTimeline(payload, live)');
    expect(source).toContain('geographicRuntimeRef.current.refreshWeatherOverlays = refreshGeographicWeather');
    expect(source).toContain('geographicTerrainProfileWeather: { validAt: terrainProfileWeather.validAt');
  });


  it('loads a multi-location regional field and registers synchronized MapLibre layers', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain("var coordinates = regionalWeatherGridCoordinates(active.latitude, active.longitude, radius, 5)");
    expect(source).toContain("'&hourly=' + fields + '&past_hours=6&forecast_hours=25&timezone=auto'");
    expect(source).toContain("map.addSource('weather-regional-field-cells'");
    expect(source).toContain("id: 'weather-regional-field-fill'");
    expect(source).toContain("id: 'weather-regional-wind-arrow'");
    expect(source).toContain('function refreshRegionalWeatherField(field, layerId, opacity, activeWeather)');
    expect(source).toContain('regionalWeatherFieldStatus(field, activeWeather)');
    expect(source).toContain('Cells visualize model-grid samples, not live radar or official warning boundaries.');
  });

  it('persists future-hour checkpoints for later observation comparison', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain('function saveLiveForecastCheckpoint()');
    expect(source).toContain('liveForecastCheckpoints: checkpoints');
    expect(source).toContain('forecastCheckpointStatus(checkpoint, timeline, d.liveWeather)');
    expect(source).toContain('Forecast error = forecast minus observation');
  });


  it('coordinates glossary terms with conceptual and geographic 3D focus actions', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain('var IMMERSIVE_FEATURE_GLOSSARY = {');
    expect(source).toContain('function explainImmersiveFeature(featureId)');
    expect(source).toContain('applyImmersiveFocus(feature.focus)');
    expect(source).toContain('applyGeographicAnalysisLens(feature.lens, patch');
    expect(source).toContain('function describeImmersiveSceneToLearner()');
    expect(source).toContain('data-weather-visual-encoding-guide');
    expect(source).toContain('data-weather-feature-callout');
    expect(source).toContain('function immersivePickableFeatureId(object)');
    expect(source).toContain("weatherFeatureId = 'airMasses'");
    expect(source).toContain("weatherFeatureId = 'frontBoundary'");
    expect(source).toContain("weatherFeatureId = 'cloudLayer'");
    expect(source).toContain("weatherFeatureId = 'precipitation'");
    expect(source).toContain("weatherFeatureId = 'windVectors'");
    expect(source).toContain("weatherFeatureId = 'stationMarkers'");
    expect(source).toContain("weatherFeatureId = 'terrainBase'");
    expect(source).toContain('var raycaster = new THREE.Raycaster()');
    expect(source).toContain("canvas.addEventListener('pointerup', handleScenePointerUp)");
    expect(source).toContain("canvas.removeEventListener('pointerup', handleScenePointerUp)");
    expect(source).toContain('distance <= 7 && elapsed <= 700');
    expect(source).toContain('new THREE.BoxHelper(root, 0xfef08a)');
    expect(source).toContain('new THREE.BoxHelper(root, 0x67e8f9)');
    expect(source).toContain('function setFeatureHoverVisual(featureId)');
    expect(source).toContain('function publishFeatureHover(featureId)');
    expect(source).toContain('clearFeatureHoverVisual()');
    expect(source).toContain('if (hoverHelper) hoverHelper.update()');
    expect(source).toContain('immersiveRuntimeRef.current.setFeatureHoverVisual = setFeatureHoverVisual');
    expect(source).toContain('function immersiveFeatureConnections(mode, featureId, band)');
    expect(source).toContain('function immersiveFeatureComparison(mode, anchorId, focusId, band)');
    expect(source).toContain('function pinImmersiveComparison(featureId)');
    expect(source).toContain('function clearImmersiveComparison()');
    expect(source).toContain('function setImmersiveInspectorPanel(panelId)');
    expect(source).toContain("immersiveInspectorPanel: 'compare'");
    expect(source).toContain("immersiveInspectorPanel: 'explain'");
    expect(source).toContain('data-weather-inspector-view-controls');
    expect(source).toContain("'aria-label': 'Immersive feature inspector views'");
    expect(source).toContain("'data-weather-inspector-panel': 'explain'");
    expect(source).toContain("'data-weather-inspector-panel': 'evidence'");
    expect(source).toContain("'data-weather-inspector-panel': 'compare'");
    expect(source).toContain("'data-weather-inspector-panel': 'connections'");
    expect(source).toContain('new THREE.BoxHelper(root, 0xe879f9)');
    expect(source).toContain('function setComparisonVisual(featureId)');
    expect(source).toContain('root.visible = true');
    expect(source).toContain("if (mode === 'conceptual') applyImmersiveFocus(d.immersiveFocus || feature.focus || 'system')");
    expect(source).toContain("if (geographicViewState(d).mode === 'conceptual') applyImmersiveFocus(d.immersiveFocus || 'system')");
    expect(source).toContain('clearFeatureComparisonVisual()');
    expect(source).toContain('if (comparisonHelper) comparisonHelper.update()');
    expect(source).toContain('immersiveRuntimeRef.current.setComparisonVisual = setComparisonVisual');
    expect(source).toContain('data-weather-comparison-legend');
    expect(source).toContain('data-weather-feature-compare-workspace');
    expect(source).toContain('data-weather-feature-comparison');
    expect(source).toContain('function immersiveFeatureEvidence(featureId, options)');
    expect(source).toContain('data-weather-feature-evidence');
    expect(source).toContain('data-weather-feature-evidence-source');
    expect(source).toContain('var evidenceKindLabels = {');
    expect(source).toContain("'aria-label': (evidenceKindLabels[metric.kind] || 'Model') + ' value'");
    expect(source).toContain('data-weather-evidence-interpretation');
    expect(source).toContain('data-weather-evidence-encoding');
    expect(source).toContain('data-weather-evidence-limitation');
    expect(source).toContain('data-weather-hover-inspector');
    expect(source).toContain('data-weather-feature-connections');
    expect(source).toContain('data-weather-object-explorer');
    expect(source).toContain('function immersiveTimelineDelta(current, comparison)');
    expect(source).toContain('function immersiveTourCompletedStepList(stepIds)');
    expect(source).toContain('function immersiveTourProgress(data)');
    expect(source).toContain('function immersiveTourHandoffText(data)');
    expect(source).toContain('function copyImmersiveTourHandoff()');
    expect(source).toContain('function downloadImmersiveTourHandoff()');
    expect(source).toContain('data-weather-tour-handoff');
    expect(source).toContain('function toggleImmersiveStageMode()');
    expect(source).toContain('function setLiveWeatherTimelineIndex(index)');
    expect(source).toContain('data-weather-stage-timeline');
    expect(source).toContain('weather-stage-timeline-slider');
    expect(source).toContain('data-weather-stage-timeline-context');
    expect(source).toContain('data-weather-stage-timeline-comparison');
    expect(source).toContain('Change since baseline');
    expect(source).toContain('timelineStageContext');
    expect(source).toContain('data-weather-stage-legend');
    expect(source).toContain('stageLegendItems');
    expect(source).toContain('stageFocusOptions');
    expect(source).toContain('data-weather-stage-focus-controls');
    expect(source).toContain('function toggleImmersiveFocusSpotlight()');
    expect(source).toContain('function setFocusSpotlight(focusId, enabled)');
    expect(source).toContain('new THREE.RingGeometry(radius * 0.72, radius, 64)');
    expect(source).toContain('if (focusSpotlightGroup && focusSpotlightGroup.userData)');
    expect(source).toContain('data-weather-focus-spotlight-badge');
    expect(source).toContain('var focusSpotlightThemes = {');
    expect(source).toContain("immersiveStageMode ? 'hidden xl:block '");
    expect(source).toContain("'data-weather-focus-spotlight-toggle': 'controls'");
    expect(source).toContain("'data-weather-focus-spotlight-toggle': 'stage'");
    expect(source).toContain('data-weather-focus-spotlight');
    expect(source).toContain('function toggleImmersivePresenterMode()');
    expect(source).toContain('data-weather-presenter-overlay');
    expect(source).toContain('data-weather-presenter-mode');
    expect(source).toContain('function toggleImmersiveCheckpointRunner()');
    expect(source).toContain('function advanceImmersiveCheckpointRunner()');
    expect(source).toContain('data-weather-checkpoint-runner');
    expect(source).toContain('function toggleImmersiveSceneSummary()');
    expect(source).toContain('data-weather-scene-summary-panel');
    expect(source).toContain('data-weather-scene-summary');
    expect(source).toContain('var IMMERSIVE_LOCAL_WORKSPACE_KEY =');
    expect(source).toContain('function immersiveLocalWorkspacePayload(data)');
    expect(source).toContain('function validateImmersiveLocalWorkspacePayload(payload)');
    expect(source).toContain('setImmersiveLocalPersistenceEnabled');
    expect(source).toContain('data-weather-local-persistence');
    expect(source).toContain('data-weather-stage-mode');
    expect(source).toContain('data-weather-immersive-layout');
    expect(source).toContain("tourStepId: sceneMode === 'conceptual' ? immersiveTourStep(d.immersiveTourStep).id : '',");
    expect(source).toContain('function toggleImmersiveTourStepCompletion(stepId)');
    expect(source).toContain('data-weather-tour-progress');
    expect(source).toContain('function immersiveSessionSharePayload(data, options)');
    expect(source).toContain('function immersiveSessionDownloadPayload(data)');
    expect(source).toContain('function validateImmersiveSessionPayload(payload)');
    expect(source).toContain('function immersiveEvidenceHandoffText(capture)');
    expect(source).toContain('function immersiveEvidenceCaptureReview(capture)');
    expect(source).toContain('function immersiveEvidenceReviewSummary(captures)');
    expect(source).toContain('function immersiveCaptureComparison(primary, comparison)');
    expect(source).toContain('function immersiveCaptureClaimHandoffText(comparison)');
    expect(source).toContain('data-weather-capture-to-claim');
    expect(source).toContain('data-weather-capture-claim-result');
    expect(source).toContain('data-weather-evidence-review-summary');
    expect(source).toContain('immersiveEvidenceCaptureShowAll');
    expect(source).toContain('function immersiveLessonPresetPayload(data, name, metadata)');
    expect(source).toContain('function validateImmersiveLessonPreset(preset)');
    expect(source).toContain('function immersiveLessonPresetList(presets)');
    expect(source).toContain('data-weather-lesson-presets');
    expect(source).toContain('weather-lesson-preset-name');
    expect(source).toContain('Save current scene');
    expect(source).toContain('function decodeWeatherSession(hash)');
    expect(source).toContain('function setImmersiveAudienceMode(mode)');
    expect(source).toContain('function captureImmersiveEvidence()');
    expect(source).toContain('function copyImmersiveSessionLink()');
    expect(source).toContain('function downloadImmersiveSession()');
    expect(source).toContain('function importImmersiveSessionFile(event)');
    expect(source).toContain('function copyImmersiveEvidenceHandoff(capture)');
    expect(source).toContain('function downloadImmersiveEvidenceHandoff(capture)');
    expect(source).toContain('immersiveShareIncludeLocation');
    expect(source).toContain('weather-immersive-session-import');
    expect(source).toContain('function setImmersiveTimelineComparison(index)');
    expect(source).toContain('function resetImmersiveOrientation()');
    expect(source).toContain('data-weather-evidence-capture-workspace');
    expect(source).toContain('data-weather-accessible-data-table');
    expect(source).toContain('data-weather-timeline-comparison');
    expect(source).toContain('data-weather-live-fallback');
    expect(source).toContain('Location is excluded by default; session downloads include the full local context.');
  });

  it('opens teacher evidence tools with a structured data alternative and saved capture list', () => {
    const html = renderTool('weatherSystems', {
      _threeLoaded: true,
      weatherSystems: {
        tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveAudienceMode: 'teacher', immersiveExplainerFeature: 'airMasses',
        immersiveEvidenceCaptures: [{ id: 'capture-1', feature: { label: 'Air masses' }, source: 'teaching model', location: { label: 'Boston' }, validAt: 'T+0 hours', note: 'I see contrasting layers.' }],
        immersiveEvidenceStatus: 'Captured Air masses at T+0 hours.'
      }
    }, { gradeLevel: '10th Grade' });
    expect(html).toContain('data-weather-audience-mode="teacher"');
    expect(html).toContain('Teacher tools');
    expect(html).toContain('data-weather-evidence-capture-workspace');
    expect(html).toContain('Capture current view');
    expect(html).toContain('Copy share link');
    expect(html).toContain('Download session JSON');
    expect(html).toContain('Import session JSON');
    expect(html).toContain('Include location and coordinates in share links');
    expect(html).toContain('data-weather-evidence-capture-list');
    expect(html).toContain('Copy handoff');
    expect(html).toContain('Download handoff');
    expect(html).toContain('data-weather-evidence-review-summary');
    expect(html).toContain('Needs review');
    expect(html).toContain('I see contrasting layers.');
    expect(html).toContain('data-weather-accessible-data');
    expect(html).toContain('Accessible data view');
    const expandedHtml = renderTool('weatherSystems', { _threeLoaded: true, weatherSystems: { tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveAudienceMode: 'teacher', immersiveEvidenceCaptures: Array.from({ length: 4 }, (_, index) => ({ id: 'capture-' + index, feature: { label: 'Air masses' }, source: 'teaching model', location: { label: 'Boston' }, validAt: 'T+' + index + ' hours', values: { humidity: 70 }, note: 'Observation ' + index })) } }, { gradeLevel: '10th Grade' });
    expect(expandedHtml).toContain('Show all 4 captures');
    const presetHtml = renderTool('weatherSystems', { _threeLoaded: true, weatherSystems: {
      tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveAudienceMode: 'teacher', immersiveLessonPresetDraftName: 'Rainy day', immersiveLessonPresetActiveId: 'preset-1',
      immersiveLessonPresets: [{ schema: 'weather-immersive-preset-v1', id: 'preset-1', name: 'Front warm-up', savedAt: '2026-08-01T12:00:00Z', weatherSystems: { immersiveSceneMode: 'conceptual', immersiveDataSource: 'model', immersiveFocus: 'front', immersiveCameraPreset: 'front' } }]
    } }, { gradeLevel: '10th Grade' });
    expect(presetHtml).toContain('data-weather-lesson-presets');
    expect(presetHtml).toContain('Save current scene');
    expect(presetHtml).toContain('Apply preset');
    expect(presetHtml).toContain('Front warm-up');
    expect(presetHtml).toContain('Active');
    const claimHtml = renderTool('weatherSystems', { _threeLoaded: true, weatherSystems: { tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveAudienceMode: 'teacher', immersiveEvidenceCaptures: [{ id: 'capture-a', feature: { id: 'cloudLayer', label: 'Cloud layer' }, source: 'teaching model', validAt: 'T+0 hours', values: { temperature: 18, humidity: 80 }, note: 'Baseline.' }, { id: 'capture-b', feature: { id: 'cloudLayer', label: 'Cloud layer' }, source: 'teaching model', validAt: 'T+6 hours', values: { temperature: 21, humidity: 70 }, note: 'Comparison.' }] } }, { gradeLevel: '10th Grade' });
    expect(claimHtml).toContain('data-weather-capture-to-claim');
    expect(claimHtml).toContain('Copy CER handoff');
    expect(claimHtml).toContain('Download CER handoff');
    expect(claimHtml).toContain('Open 3D comparison');
    expect(claimHtml).toContain('Claim');
    expect(claimHtml).toContain('Reasoning');
  });

  it('tries multiple CDNs with a timeout instead of a single point of failure', () => {
    PATHS.forEach((filePath) => {
      const source = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      expect(source).toContain('var WEATHER_MAPLIBRE_CDNS = [');
      expect(source).toContain('cdn.jsdelivr.net/npm/maplibre-gl@5.24.0');
      expect(source).toContain('WEATHER_MAPLIBRE_TIMEOUT_MS = 20000');
      // a black-holed request must resolve to the next CDN, not spin forever
      expect(source).toContain('var timer = window.setTimeout(function () { finish(false); }, WEATHER_MAPLIBRE_TIMEOUT_MS)');
      expect(source).toContain('resolve(attempt(index + 1))');
    });
  });

  it('cleans up dead script tags so a retry actually retries (the stuck-spinner bug)', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    // the old code re-listened on a failed script tag whose events never re-fire
    expect(source).toContain('var stale = document.getElementById(scriptId)');
    expect(source).toContain('stale.parentNode.removeChild(stale)');
    expect(source).not.toContain("existing.addEventListener('load', ready");
    // a rejected load clears the cached promise so Retry starts fresh
    expect(source).toContain('window.__weatherMapLibrePromise = null; // allow a fresh Retry');
  });

  it('treats early resource errors as recoverable and times out a truly stalled base map', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain('WEATHER_MAP_STALL_MS = 15000');
    expect(source).toContain('mapLoadWarning = event && event.error');
    expect(source).toContain("geographicMapStatus: 'Geographic layers are still loading. ' + mapLoadWarning");
    // Readiness is judged by whether data is still arriving, not by a flat deadline.
    expect(source).toContain('The geographic base map stopped receiving data after ');
    expect(source).toContain('if (mapLoadTimer) window.clearInterval(mapLoadTimer)');
    expect(source).toContain('geographicTerrainAvailable: terrainAvailable');
  });

  it('shares terrain sampling between pointer and keyboard map-center interactions', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain('function sampleTerrainAtCoordinate(coordinate, methodLabel)');
    expect(source).toContain('geographicRuntimeRef.current.sampleTerrainAtCoordinate = sampleTerrainAtCoordinate');
    expect(source).toContain("'Keyboard map-center sample'");
    expect(source).toContain("'Pointer map selection'");
    expect(source).toContain('geographicTerrainProbeMethod: selectionMethod');
  });

  it('the error overlay offers Retry alongside the conceptual-3D fallback', () => {
    const source = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');
    expect(source).toContain("'Retry loading'");
    expect(source).toContain("geographicMapAttempt: (d.geographicMapAttempt || 0) + 1");
    expect(source).toContain("'Use conceptual 3D instead'");
    // the retry counter re-runs the map effect
    expect(source).toContain('d.geographicMapAttempt, d.liveWeather && d.liveWeather.observedAt');
    // failure explanation names the likely culprit for school deployments
    expect(source).toContain('School network filters sometimes block map services');
  });
});
