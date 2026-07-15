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
});

describe('Weather Systems grade-banded views', () => {
  it('renders the map lab with observations, model controls, and trend data', () => {
    const html = renderTool('weatherSystems', { weatherSystems: { tab: 'map', scenario: 'coldFront' } }, { gradeLevel: '7th Grade' });
    expect(html).toContain('Weather Systems &amp; Forecasting');
    expect(html).toContain('Observation station');
    expect(html).toContain('Log this observation');
    expect(html).toContain('Vertical air-mass cross-section');
    expect(html).toContain('Decode the station model');
    expect(html).toContain('data-weather-cross-section');
    expect(html).toContain('data-weather-station-model');
    expect(html).toContain('12-hour model trend');
    expect(html).toContain('Front speed');
    expect(html).toContain('aria-label="Approaching Cold Front weather map');
    expect(html).toContain('data-weather-atmosphere-storyline');
    expect(html).toContain('Atmosphere Storyline');
    expect(html).toContain('data-weather-canvas-visual-key');
    expect(html).toContain('Canvas visual key');
    expect(html).toContain('Selected station pulses amber');
    expect(html).toContain('Radar: light to intense');
    expect(html).toContain('aria-describedby="weather-map-visual-key"');
    expect(html).toContain('Visible layers include pressure contours, fronts, radar intensity and sweep, and directional wind tracers.');
    expect(html).toContain('data-weather-visual-scene-studio');
    expect(html).toContain('Visual Scene Studio');
    expect(html).toContain('aria-label="Weather map visual presets"');
    expect(html).toContain('Fine-tune layers');
    expect(html).toContain('4/4 visible');
    expect(html).toContain('Visual presets change only the displayed layers.');
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
    expect(html).not.toContain('Instability index');
    expect(html).not.toContain('Sea-level pressure</span>');
    expect(html).not.toContain('Decode the station model');
    expect(html).not.toContain('Station Network: Find the Boundary');
    expect(html).toContain('The air is');
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
    expect(forecast).toContain('Your next move');
    expect(forecast).toContain('data-weather-forecast-journal');
    expect(forecast).toContain('Forecast Revision Journal');
    expect(forecast).toContain('Verify a forecast to begin your revision story.');
    expect(forecast).toContain('data-weather-broadcast-studio');
    expect(forecast).toContain('Weather Broadcast Studio');
    expect(forecast).toContain('Add weather, timing, hazard, action to complete this briefing.');
    expect(forecast).toContain('aria-label="Broadcast briefing completeness"');

    const guide = renderTool('weatherSystems', { weatherSystems: { tab: 'teacher' } }, { gradeLevel: '5th Grade' });
    expect(guide).toContain('Predict - Observe - Explain - Revise');
    expect(guide).toContain('Grade-band progression');
    expect(guide).toContain('Model boundaries');
    expect(guide).toContain('MS-ESS2-5');
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
        { attempt: 2, score: 85, precip: 'storms', timing: '4-6', hazard: 'lightning', action: 'indoors', confidence: 80, evidenceCount: 3, modelHour: 3 }
      ]
    } }, { gradeLevel: '10th Grade' });
    expect(html).toContain('Forecast Revision Journal');
    expect(html).toContain('Revision improved by 30 points');
    expect(html).toContain('Forecast #2 - latest');
    expect(html).toContain('3 evidence sources');
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
