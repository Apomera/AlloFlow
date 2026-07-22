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
    expect(kernel.geographicTerrainEvidenceStatus(savedTerrain, Object.assign({}, matchingLive, { observedAt: '2026-07-16T15:00' }))).toEqual(expect.objectContaining({ current: false, code: 'observation', label: 'Older observation evidence' }));
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
        immersiveReflection: 'Clouds are building near the boundary.'
      }
    }, { gradeLevel: '8th Grade' });
    expect(html).toContain('data-weather-immersive-tour');
    expect(html).toContain('data-weather-tour-overlay');
    expect(html).toContain('Guided investigation');
    expect(html).toContain('Trace moisture');
    expect(html).toContain('3D investigation step 3 of 4');
    expect(html).toContain('How do clouds or precipitation connect to humidity and lift?');
    expect(html).toContain('Connect cloud cover, particles, and the wind field.');
    expect(html).toContain('aria-label="Immersive guided investigation steps"');
    expect(html).toContain('Next investigation step');
    expect(html).toContain('3D evidence note');
    expect(html).toContain('Clouds are building near the boundary.');
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
    expect(html).toContain('Observation command display');
    expect(html).toContain('data-weather-observation-freshness="stale"');
    expect(html).toContain('Saved observation');
    expect(html).toContain('refresh before making a current-conditions claim');
    expect(html).toContain('43.6591, -70.2568 | Site 19 m');
    expect(html).toContain('aria-label="Portland, Maine, United States | Thunderstorms | 28.4\u00B0C | 74% RH | SW 22.1 km/h wind | 1004.6 hPa"');
    expect(html).toContain('data-weather-wind-compass');
    expect(html).toContain('Observed wind compass');
    expect(html).toContain('Wind arrives from SW and flows toward NE at 22.1 kilometers per hour.');
    expect(html).toContain('data-weather-observation-instruments');
    expect(html).toContain('aria-label="Live observation instruments"');
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
    expect(html).toContain('Visible layers include pressure contours, fronts, radar intensity and sweep, and directional wind tracers. Selected station: Central School.');
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
    expect(html).toContain('strongest contrast');
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

describe('Weather Systems geographic map loader resilience', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const PATHS = [
    'stem_lab/stem_tool_weathersystems.js',
    'prismflow-deploy/public/stem_lab/stem_tool_weathersystems.js',
  ];

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
    expect(source).toContain('WEATHER_MAP_READY_TIMEOUT_MS = 30000');
    expect(source).toContain('mapLoadWarning = event && event.error');
    expect(source).toContain("geographicMapStatus: 'Geographic layers are still loading. ' + mapLoadWarning");
    expect(source).toContain('The geographic base map did not become ready within 30 seconds.');
    expect(source).toContain('if (mapLoadTimer) window.clearTimeout(mapLoadTimer)');
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
