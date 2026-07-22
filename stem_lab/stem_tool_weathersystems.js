// Weather Systems & Forecasting Lab
// A grade-banded, evidence-first weather simulation for K-12 learners.

(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('weatherSystems')) return;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, Number(value) || 0));
  }

  function round(value, places) {
    var p = Math.pow(10, places || 0);
    return Math.round(value * p) / p;
  }

  function gradeBand(label) {
    var value = String(label || '').toLowerCase();
    if (/kindergarten|\bk\b|pre-k|1st|2nd/.test(value)) return 'K-2';
    if (/3rd|4th|5th/.test(value)) return '3-5';
    if (/6th|7th|8th/.test(value)) return '6-8';
    return '9-12';
  }

  function dewPointC(tempC, humidity) {
    var rh = clamp(humidity, 1, 100) / 100;
    var a = 17.625;
    var b = 243.04;
    var gamma = Math.log(rh) + (a * tempC) / (b + tempC);
    return round((b * gamma) / (a - gamma), 1);
  }

  function cardinal(degrees) {
    var labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return labels[Math.round((((Number(degrees) || 0) % 360) / 45)) % 8];
  }

  var SCENARIOS = [
    {
      id: 'fair', name: 'High Pressure Day', icon: '\u2600\uFE0F',
      summary: 'A broad high-pressure system brings sinking air, light wind, and mostly clear skies.',
      temp: 21, humidity: 42, pressure: 1024, windSpeed: 10, windDir: 35,
      frontSpeed: 0, frontType: 'none', instability: 15, terrain: 20,
      truth: { precip: 'none', timing: 'after12', hazard: 'none' }
    },
    {
      id: 'coldFront', name: 'Approaching Cold Front', icon: '\u26C8\uFE0F',
      summary: 'Dense cold air advances beneath warm, humid air. Watch pressure, wind, clouds, and temperature change together.',
      temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 220,
      frontSpeed: 36, frontType: 'cold', instability: 68, terrain: 25,
      truth: { precip: 'storms', timing: '4-6', hazard: 'lightning' }
    },
    {
      id: 'warmFront', name: 'Warm Front Arrival', icon: '\uD83C\uDF27\uFE0F',
      summary: 'Warm air glides over retreating cool air, spreading layered clouds and longer-lasting precipitation.',
      temp: 8, humidity: 83, pressure: 1011, windSpeed: 18, windDir: 125,
      frontSpeed: 20, frontType: 'warm', instability: 30, terrain: 18,
      truth: { precip: 'rain', timing: '4-6', hazard: 'flood' }
    },
    {
      id: 'summerStorm', name: 'Summer Thunderstorm', icon: '\uD83C\uDF29\uFE0F',
      summary: 'Hot, humid surface air rises rapidly. Instability can build a tall storm cloud with heavy rain and lightning.',
      temp: 31, humidity: 76, pressure: 1006, windSpeed: 14, windDir: 190,
      frontSpeed: 12, frontType: 'outflow', instability: 88, terrain: 35,
      truth: { precip: 'storms', timing: '0-3', hazard: 'lightning' }
    },
    {
      id: 'winterStorm', name: 'Coastal Winter Storm', icon: '\u2744\uFE0F',
      summary: 'Cold inland air meets moist maritime air. Small temperature differences can change snow to sleet, freezing rain, or rain.',
      temp: -2, humidity: 91, pressure: 998, windSpeed: 38, windDir: 55,
      frontSpeed: 24, frontType: 'occluded', instability: 42, terrain: 45,
      truth: { precip: 'snow', timing: '0-3', hazard: 'ice' }
    }
  ];

  var STATIONS = [
    { id: 'west', name: 'West Ridge', x: 0.22, y: 0.55, elevation: 520 },
    { id: 'central', name: 'Central School', x: 0.48, y: 0.66, elevation: 90 },
    { id: 'coast', name: 'Harbor Point', x: 0.73, y: 0.72, elevation: 8 },
    { id: 'north', name: 'North Valley', x: 0.58, y: 0.38, elevation: 210 }
  ];

  var TERRAIN_EVIDENCE = { id: 'terrainProfile', label: 'Wind-aligned terrain profile' };

  var EVIDENCE = [
    { id: 'pressure', label: 'Pressure tendency' },
    { id: 'tempDew', label: 'Temperature-dew point spread' },
    { id: 'windShift', label: 'Wind direction and speed' },
    { id: 'clouds', label: 'Cloud type and coverage' },
    { id: 'radar', label: 'Radar reflectivity pattern' },
    { id: 'front', label: 'Front position and motion' }
  ];

  var EXPERIMENT_VARIABLES = [
    { id: 'temp', label: 'Air temperature', min: -15, max: 38, step: 1, unit: '\u00B0C' },
    { id: 'humidity', label: 'Relative humidity', min: 10, max: 100, step: 1, unit: '%' },
    { id: 'pressure', label: 'Sea-level pressure', min: 980, max: 1040, step: 1, unit: ' hPa' },
    { id: 'windSpeed', label: 'Wind speed', min: 0, max: 80, step: 1, unit: ' km/h' },
    { id: 'frontSpeed', label: 'Front speed', min: 0, max: 65, step: 1, unit: ' km/h' },
    { id: 'instability', label: 'Instability', min: 0, max: 100, step: 1, unit: '' },
    { id: 'terrain', label: 'Terrain lift', min: 0, max: 100, step: 1, unit: '' }
  ];

  function scenarioById(id) {
    for (var i = 0; i < SCENARIOS.length; i += 1) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return SCENARIOS[1];
  }

  function resolvedState(data) {
    var scenario = scenarioById(data.scenario || 'coldFront');
    return {
      scenario: scenario.id,
      temp: data.temp != null ? Number(data.temp) : scenario.temp,
      humidity: data.humidity != null ? Number(data.humidity) : scenario.humidity,
      pressure: data.pressure != null ? Number(data.pressure) : scenario.pressure,
      windSpeed: data.windSpeed != null ? Number(data.windSpeed) : scenario.windSpeed,
      windDir: data.windDir != null ? Number(data.windDir) : scenario.windDir,
      frontSpeed: data.frontSpeed != null ? Number(data.frontSpeed) : scenario.frontSpeed,
      instability: data.instability != null ? Number(data.instability) : scenario.instability,
      terrain: data.terrain != null ? Number(data.terrain) : scenario.terrain,
      simHour: data.simHour != null ? Number(data.simHour) : 0,
      radar: data.radar !== false,
      fronts: data.fronts !== false,
      windLayer: data.windLayer !== false,
      motion: data.motion !== false
    };
  }

  function projectConditions(state, hours) {
    var scenario = scenarioById(state.scenario);
    var h = clamp(hours, 0, 24);
    var temp = state.temp;
    var pressure = state.pressure;
    var humidity = state.humidity;
    var windSpeed = state.windSpeed;
    var windDir = state.windDir;
    var forcing = 0;

    if (scenario.id === 'coldFront') {
      forcing = clamp(1 - Math.abs(h - 5) / 6, 0, 1);
      temp -= h > 5 ? Math.min(12, (h - 5) * 1.7) : h * 0.15;
      pressure += h > 5 ? (h - 5) * 1.3 : -h * 0.8;
      humidity -= h > 5 ? (h - 5) * 4 : 0;
      windSpeed += forcing * 18;
      windDir = h > 5 ? 295 : state.windDir;
    } else if (scenario.id === 'warmFront') {
      forcing = clamp(1 - Math.abs(h - 6) / 8, 0, 1);
      temp += h > 6 ? Math.min(10, (h - 6) * 1.1) : h * 0.2;
      pressure -= Math.min(8, h * 0.65);
      humidity += Math.min(10, h * 1.2);
      windSpeed += forcing * 8;
      windDir = h > 7 ? 205 : state.windDir;
    } else if (scenario.id === 'summerStorm') {
      forcing = clamp(1 - Math.abs(h - 2) / 3.5, 0, 1);
      temp -= forcing * 7 + h * 0.1;
      pressure -= forcing * 5;
      humidity += forcing * 8;
      windSpeed += forcing * 28;
      windDir = h > 3 ? 310 : state.windDir;
    } else if (scenario.id === 'winterStorm') {
      forcing = clamp(1 - Math.abs(h - 4) / 7, 0, 1);
      temp += Math.min(4, h * 0.45);
      pressure -= Math.min(13, h * 1.1);
      humidity += Math.min(6, h);
      windSpeed += forcing * 20;
      windDir = 45 + h * 2;
    } else {
      forcing = 0.05;
      temp += Math.sin((h / 24) * Math.PI) * 4;
      pressure += Math.sin(h / 6) * 0.8;
      humidity -= Math.sin((h / 24) * Math.PI) * 8;
    }

    humidity = clamp(humidity, 5, 100);
    var dewPoint = dewPointC(temp, humidity);
    var spread = Math.max(0, temp - dewPoint);
    var lift = state.frontSpeed * 0.55 + state.terrain * 0.25 + state.instability * 0.45;
    var cloudCover = clamp(humidity * 0.72 + forcing * 34 + lift * 0.22 - 24, 0, 100);
    var precipPotential = clamp((humidity - 55) * 1.45 + forcing * 52 + state.instability * 0.28 + state.terrain * 0.12 - spread * 2, 0, 100);
    var precipType = 'none';
    if (precipPotential >= 28) {
      if (scenario.id === 'summerStorm' || (state.instability > 72 && temp > 15)) precipType = 'storms';
      else if (temp <= -1) precipType = 'snow';
      else if (temp < 2) precipType = 'mixed';
      else precipType = 'rain';
    }
    return {
      hour: h,
      temperature: round(temp, 1),
      dewPoint: dewPoint,
      humidity: Math.round(humidity),
      pressure: round(pressure, 1),
      windSpeed: Math.round(windSpeed),
      windDir: ((Math.round(windDir) % 360) + 360) % 360,
      cloudCover: Math.round(cloudCover),
      precipPotential: Math.round(precipPotential),
      precipType: precipType,
      forcing: forcing
    };
  }

  function stationObservation(state, station) {
    var base = projectConditions(state, state.simHour);
    var scenario = scenarioById(state.scenario);
    var elevationCool = station.elevation / 1000 * 6.5;
    var marine = station.id === 'coast' ? 1 : 0;
    var xShift = (station.x - 0.5) * 5;
    var temperature = base.temperature - elevationCool - xShift + marine * (base.temperature > 12 ? -2 : 2);
    var humidity = clamp(base.humidity + marine * 8 + station.y * 4, 5, 100);
    var localPressure = base.pressure;
    var localWindDir = base.windDir + Math.round((station.x - 0.5) * 18);
    var cloudOffset = 0;
    var precipOffset = 0;
    var frontProgress = clamp((state.simHour * state.frontSpeed) / 500, 0, 0.55);
    var frontX = 0.28 + frontProgress;
    var behindFront = station.x < frontX;

    if (behindFront && (scenario.frontType === 'cold' || scenario.frontType === 'outflow')) {
      temperature -= scenario.frontType === 'outflow' ? 3.5 : 6;
      humidity -= scenario.frontType === 'outflow' ? 5 : 13;
      localPressure += scenario.frontType === 'outflow' ? 1.5 : 4;
      localWindDir = 300;
      cloudOffset -= 18;
      precipOffset -= 16;
    } else if (behindFront && scenario.frontType === 'warm') {
      temperature += 4.5;
      humidity += 5;
      localPressure += 1.5;
      localWindDir = 205;
      cloudOffset -= 8;
      precipOffset -= 6;
    } else if (behindFront && scenario.frontType === 'occluded') {
      temperature -= 3;
      humidity -= 7;
      localPressure += 3;
      localWindDir = 305;
      cloudOffset -= 10;
      precipOffset -= 8;
    } else if (!behindFront && scenario.frontType !== 'none') {
      localWindDir = state.windDir;
    }

    humidity = clamp(humidity, 5, 100);
    return {
      id: station.id,
      name: station.name,
      x: station.x,
      y: station.y,
      elevation: station.elevation,
      airMass: behindFront && scenario.frontType !== 'none' ? 'behind' : 'ahead',
      temperature: round(temperature, 1),
      dewPoint: dewPointC(temperature, humidity),
      humidity: Math.round(humidity),
      pressure: round(localPressure - station.elevation / 8500 * 100, 1),
      seaLevelPressure: round(localPressure, 1),
      windSpeed: Math.max(1, Math.round(base.windSpeed + station.x * 4 - station.y * 2)),
      windDir: (Math.round(localWindDir) + 360) % 360,
      cloudCover: clamp(Math.round(base.cloudCover + marine * 8 + station.y * 3 + cloudOffset), 0, 100),
      precipPotential: clamp(Math.round(base.precipPotential + marine * 4 + station.y * 4 + precipOffset), 0, 100)
    };
  }

  function stationNetworkAnalysis(state) {
    var observations = STATIONS.map(function (station) { return stationObservation(state, station); }).sort(function (a, b) { return a.x - b.x; });
    var pairs = [];
    for (var i = 0; i < observations.length - 1; i += 1) {
      var left = observations[i];
      var right = observations[i + 1];
      var rawWindShift = Math.abs(left.windDir - right.windDir);
      var windShift = Math.min(rawWindShift, 360 - rawWindShift);
      var temperatureDifference = round(Math.abs(left.temperature - right.temperature), 1);
      var dewPointDifference = round(Math.abs(left.dewPoint - right.dewPoint), 1);
      var pressureDifference = round(Math.abs(left.seaLevelPressure - right.seaLevelPressure), 1);
      var score = round(temperatureDifference * 2 + dewPointDifference + pressureDifference * 1.5 + windShift / 15, 1);
      var signals = [
        { label: 'temperature', value: temperatureDifference * 2 },
        { label: 'dew point', value: dewPointDifference },
        { label: 'pressure', value: pressureDifference * 1.5 },
        { label: 'wind shift', value: windShift / 15 }
      ].sort(function (a, b) { return b.value - a.value; });
      pairs.push({
        id: left.id + '-' + right.id,
        left: left,
        right: right,
        label: left.name + ' to ' + right.name,
        temperatureDifference: temperatureDifference,
        dewPointDifference: dewPointDifference,
        pressureDifference: pressureDifference,
        windShift: Math.round(windShift),
        score: score,
        strongestSignal: signals[0].label
      });
    }
    var strongest = pairs.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var scenario = scenarioById(state.scenario);
    return {
      observations: observations,
      pairs: pairs,
      strongest: strongest,
      hasFront: scenario.frontType !== 'none',
      frontType: scenario.frontType,
      frontX: 0.28 + clamp((state.simHour * state.frontSpeed) / 500, 0, 0.55)
    };
  }

  function frontPassageHour(state, station) {
    var scenario = scenarioById(state.scenario);
    if (!station || scenario.frontType === 'none' || state.frontSpeed <= 0) return null;
    return round(clamp(((station.x - 0.28) * 500) / state.frontSpeed, 0, 24), 1);
  }

  function stationTimeSeries(state, station, endHour, step) {
    var end = clamp(endHour == null ? 12 : endHour, 1, 24);
    var increment = clamp(step == null ? 1 : step, 1, 6);
    var points = [];
    for (var hour = 0; hour <= end; hour += increment) {
      points.push(stationObservation(Object.assign({}, state, { simHour: hour }), station));
      points[points.length - 1].hour = hour;
    }
    var passage = frontPassageHour(state, station);
    var beforeHour = passage == null ? 0 : clamp(passage - 1.5, 0, end);
    var afterHour = passage == null ? end : clamp(passage + 1.5, 0, end);
    var before = stationObservation(Object.assign({}, state, { simHour: beforeHour }), station);
    var after = stationObservation(Object.assign({}, state, { simHour: afterHour }), station);
    var rawWindShift = Math.abs(after.windDir - before.windDir);
    return {
      station: station.id,
      points: points,
      passageHour: passage,
      beforeHour: round(beforeHour, 1),
      afterHour: round(afterHour, 1),
      before: before,
      after: after,
      deltas: {
        temperature: round(after.temperature - before.temperature, 1),
        dewPoint: round(after.dewPoint - before.dewPoint, 1),
        pressure: round(after.seaLevelPressure - before.seaLevelPressure, 1),
        windShift: Math.round(Math.min(rawWindShift, 360 - rawWindShift)),
        cloudCover: Math.round(after.cloudCover - before.cloudCover),
        precipPotential: Math.round(after.precipPotential - before.precipPotential)
      }
    };
  }

  function expectedForecast(state) {
    var scenario = scenarioById(state.scenario);
    var future = projectConditions(state, 6);
    var precip = future.precipType;
    if (scenario.id === 'coldFront' && state.instability >= 55 && future.precipPotential >= 45) precip = 'storms';
    if (scenario.id === 'warmFront' && precip !== 'none') precip = 'rain';
    if (scenario.id === 'winterStorm') precip = future.temperature <= -1 ? 'snow' : future.temperature < 2 ? 'mixed' : 'rain';
    var hazard = scenario.truth.hazard;
    if (future.precipPotential < 25) hazard = 'none';
    if (scenario.id === 'coldFront' && state.instability < 45) hazard = 'highWind';
    return {
      precip: precip,
      timing: scenario.truth.timing,
      hazard: hazard,
      future: future
    };
  }

  function readinessActionForHazard(hazard) {
    var actions = {
      none: 'normal',
      lightning: 'indoors',
      flood: 'avoidTravel',
      ice: 'delayTravel',
      highWind: 'shelter'
    };
    return actions[hazard] || 'monitor';
  }

  function ensembleForecast(state) {
    var offsets = [
      { t: -2.0, h: -7, p: 2.0, w: -5, i: -10 },
      { t: -1.2, h: 4, p: 1.0, w: 3, i: -4 },
      { t: -0.7, h: -3, p: -1.5, w: 6, i: 3 },
      { t: -0.2, h: 7, p: -0.5, w: -2, i: 8 },
      { t: 0, h: 0, p: 0, w: 0, i: 0 },
      { t: 0.5, h: -5, p: 1.5, w: 4, i: -6 },
      { t: 1.0, h: 5, p: -2.0, w: 8, i: 7 },
      { t: 1.5, h: 2, p: 0.5, w: -4, i: 12 },
      { t: 2.1, h: -2, p: -1.0, w: 2, i: 4 }
    ];
    var counts = { none: 0, rain: 0, snow: 0, mixed: 0, storms: 0 };
    var hazardCounts = { none: 0, lightning: 0, flood: 0, ice: 0, highWind: 0 };
    var members = offsets.map(function (offset, index) {
      var variant = Object.assign({}, state, {
        temp: state.temp + offset.t,
        humidity: clamp(state.humidity + offset.h, 5, 100),
        pressure: state.pressure + offset.p,
        windSpeed: clamp(state.windSpeed + offset.w, 0, 100),
        instability: clamp(state.instability + offset.i, 0, 100)
      });
      var outcome = expectedForecast(variant);
      counts[outcome.precip] = (counts[outcome.precip] || 0) + 1;
      hazardCounts[outcome.hazard] = (hazardCounts[outcome.hazard] || 0) + 1;
      return { id: index + 1, precip: outcome.precip, hazard: outcome.hazard, temperature: outcome.future.temperature, pressure: outcome.future.pressure };
    });
    function dominant(countMap) {
      return Object.keys(countMap).sort(function (a, b) { return countMap[b] - countMap[a]; })[0];
    }
    var dominantPrecip = dominant(counts);
    var temperatures = members.map(function (member) { return member.temperature; });
    var pressures = members.map(function (member) { return member.pressure; });
    return {
      members: members,
      counts: counts,
      hazardCounts: hazardCounts,
      dominantPrecip: dominantPrecip,
      dominantHazard: dominant(hazardCounts),
      agreement: counts[dominantPrecip] / members.length,
      temperatureRange: [Math.min.apply(Math, temperatures), Math.max.apply(Math, temperatures)],
      pressureRange: [Math.min.apply(Math, pressures), Math.max.apply(Math, pressures)]
    };
  }
  function calibrateConfidence(state, confidence) {
    var ensemble = ensembleForecast(state);
    var selected = clamp(Number(confidence), 0, 100);
    var agreement = Math.round(ensemble.agreement * 100);
    var gap = Math.round(selected - agreement);
    var status = Math.abs(gap) <= 15 ? 'well' : gap > 15 ? 'over' : 'under';
    return {
      selected: selected,
      agreement: agreement,
      gap: gap,
      status: status,
      label: status === 'well' ? 'Well calibrated' : status === 'over' ? 'Overconfident' : 'Underconfident'
    };
  }
  function experimentVariableById(id) {
    for (var i = 0; i < EXPERIMENT_VARIABLES.length; i += 1) {
      if (EXPERIMENT_VARIABLES[i].id === id) return EXPERIMENT_VARIABLES[i];
    }
    return EXPERIMENT_VARIABLES[1];
  }

  function runExperiment(state, variable, testValue, hours) {
    var config = experimentVariableById(variable);
    var horizon = clamp(hours, 0, 12);
    var controlState = Object.assign({}, state);
    var testState = Object.assign({}, state);
    testState[config.id] = clamp(testValue, config.min, config.max);
    var control = projectConditions(controlState, horizon);
    var test = projectConditions(testState, horizon);
    var deltas = {
      temperature: round(test.temperature - control.temperature, 1),
      humidity: Math.round(test.humidity - control.humidity),
      pressure: round(test.pressure - control.pressure, 1),
      windSpeed: Math.round(test.windSpeed - control.windSpeed),
      cloudCover: Math.round(test.cloudCover - control.cloudCover),
      precipPotential: Math.round(test.precipPotential - control.precipPotential)
    };
    var direction = deltas.precipPotential > 4 ? 'increase' : deltas.precipPotential < -4 ? 'decrease' : 'steady';
    return {
      variable: config.id,
      baselineValue: state[config.id],
      testValue: testState[config.id],
      unit: config.unit,
      hour: horizon,
      control: control,
      test: test,
      deltas: deltas,
      direction: direction
    };
  }

  function compareScenarioPatterns(state, comparisonId, hours) {
    var hour = clamp(hours != null ? Number(hours) : state.simHour, 0, 24);
    var activeScenario = scenarioById(state.scenario);
    var comparisonScenario = scenarioById(comparisonId);
    var active = projectConditions(state, hour);
    var comparisonState = resolvedState({ scenario: comparisonScenario.id, simHour: hour });
    var comparison = projectConditions(comparisonState, hour);
    var definitions = [
      { id: 'temperature', label: 'Temperature', key: 'temperature', unit: '\u00B0C', min: -20, max: 45 },
      { id: 'dewPoint', label: 'Dew point', key: 'dewPoint', unit: '\u00B0C', min: -30, max: 35 },
      { id: 'pressure', label: 'Pressure', key: 'pressure', unit: ' hPa', min: 980, max: 1040 },
      { id: 'windSpeed', label: 'Wind speed', key: 'windSpeed', unit: ' km/h', min: 0, max: 100 },
      { id: 'cloudCover', label: 'Cloud cover', key: 'cloudCover', unit: '%', min: 0, max: 100 },
      { id: 'precipPotential', label: 'Precipitation potential', key: 'precipPotential', unit: '%', min: 0, max: 100 }
    ];
    var metrics = definitions.map(function (definition) {
      var activeValue = active[definition.key];
      var comparisonValue = comparison[definition.key];
      var range = definition.max - definition.min;
      return Object.assign({}, definition, {
        active: activeValue,
        comparison: comparisonValue,
        delta: round(comparisonValue - activeValue, 1),
        normalizedDifference: range ? Math.abs(comparisonValue - activeValue) / range : 0
      });
    });
    var strongest = metrics.reduce(function (best, metric) {
      return !best || metric.normalizedDifference > best.normalizedDifference ? metric : best;
    }, null);
    return {
      hour: hour,
      activeScenario: activeScenario,
      comparisonScenario: comparisonScenario,
      active: active,
      comparison: comparison,
      metrics: metrics,
      strongest: strongest,
      controlled: false
    };
  }

  function scoreForecast(state, forecast) {
    var truth = expectedForecast(state);
    var evidence = forecast.evidence || [];
    var score = 0;
    if (forecast.precip === truth.precip) score += 40;
    if (forecast.timing === truth.timing) score += 25;
    if (forecast.hazard === truth.hazard) score += 25;
    score += Math.min(10, evidence.length * 4);
    var notes = [];
    notes.push(forecast.precip === truth.precip ? 'Precipitation type matched the model.' : 'Recheck temperature, dew point, and lift before choosing precipitation type.');
    notes.push(forecast.timing === truth.timing ? 'Arrival window matched the model.' : 'Use the front speed and distance to estimate arrival time.');
    notes.push(forecast.hazard === truth.hazard ? 'Primary hazard matched the scenario.' : 'Connect the strongest process to the most likely hazard.');
    if (!evidence.length) notes.push('Add at least one observation as evidence.');
    var expectedAction = readinessActionForHazard(truth.hazard);
    var actionCorrect = forecast.action ? forecast.action === expectedAction : null;
    if (forecast.action) notes.push(actionCorrect ? 'The school-readiness decision matched the modeled hazard.' : 'Reconsider how the modeled hazard should change school activities or travel.');
    var calibration = forecast.confidence ? calibrateConfidence(state, forecast.confidence) : null;
    if (calibration) notes.push(calibration.status === 'well' ? 'Confidence was reasonably calibrated to ensemble agreement.' : calibration.status === 'over' ? 'Confidence was higher than the teaching ensemble supports.' : 'Confidence was lower than the teaching ensemble agreement.');
    return { score: score, truth: truth, notes: notes, expectedAction: expectedAction, actionCorrect: actionCorrect, calibration: calibration };
  }

  var IMMERSIVE_FOCUS_PROFILES = {
    system: { airMasses: true, front: true, clouds: true, precipitation: true, wind: true, stations: true },
    front: { airMasses: true, front: true, clouds: false, precipitation: false, wind: true, stations: true },
    moisture: { airMasses: false, front: false, clouds: true, precipitation: true, wind: true, stations: true },
    stations: { airMasses: false, front: false, clouds: false, precipitation: false, wind: true, stations: true }
  };

  function immersiveFocusProfile(focus) {
    var id = IMMERSIVE_FOCUS_PROFILES[focus] ? focus : 'system';
    return { id: id, layers: Object.assign({}, IMMERSIVE_FOCUS_PROFILES[id]) };
  }

  var GEOGRAPHIC_CAMERA_VIEWS = {
    region: { id: 'region', label: 'regional context', zoom: 8.3, pitch: 38, bearing: 0 },
    local: { id: 'local', label: 'local terrain', zoom: 10.6, pitch: 58, bearing: -18 },
    site: { id: 'site', label: 'street-scale site', zoom: 15.2, pitch: 68, bearing: 22 }
  };

  function geographicCameraView(preset) {
    var id = GEOGRAPHIC_CAMERA_VIEWS[preset] ? preset : 'local';
    return Object.assign({}, GEOGRAPHIC_CAMERA_VIEWS[id]);
  }

  var GEOGRAPHIC_ANALYSIS_LENSES = [
    { id: 'context', label: 'System context', icon: '\u25CE', camera: 'region', detail: 'See the study area and observed downwind flow in regional context.', layers: { studyArea: true, wind: true, transect: false, buildings: false } },
    { id: 'terrain', label: 'Wind + terrain', icon: '\u223F', camera: 'local', detail: 'Compare observed wind with the wind-aligned elevation cross-section.', layers: { studyArea: true, wind: true, transect: true, buildings: false } },
    { id: 'site', label: 'Site detail', icon: '\u2316', camera: 'site', detail: 'Inspect the observation site and available OpenStreetMap buildings.', layers: { studyArea: false, wind: true, transect: false, buildings: true } }
  ];

  function geographicAnalysisLens(lensId) {
    var lens = GEOGRAPHIC_ANALYSIS_LENSES.filter(function (item) { return item.id === lensId; })[0] || GEOGRAPHIC_ANALYSIS_LENSES[1];
    return Object.assign({}, lens, { layers: Object.assign({}, lens.layers) });
  }

  var GEOGRAPHIC_INVESTIGATION_STEPS = [
    { id: 'orient', label: 'Orient the system', lens: 'context', prompt: 'What lies inside the study area, and which direction is downwind?', evidence: 'Use the true-scale ring, observation site, regional labels, and wind vector.' },
    { id: 'terrain', label: 'Trace wind + terrain', lens: 'terrain', prompt: 'Does terrain rise toward the site from upwind or fall away?', evidence: 'Compare the observed wind direction with the elevation cross-section and relief.' },
    { id: 'site', label: 'Inspect local exposure', lens: 'site', prompt: 'What site-scale terrain or buildings could influence this observation?', evidence: 'Separate local exposure clues from the larger regional weather system.' },
    { id: 'claim', label: 'Build an evidence claim', lens: 'terrain', prompt: 'Which mapped evidence most strengthens or weakens your weather explanation?', evidence: 'Cite the observation time, wind vector, terrain profile, and one limitation.' }
  ];

  function geographicInvestigationStep(stepId) {
    var index = GEOGRAPHIC_INVESTIGATION_STEPS.findIndex(function (step) { return step.id === stepId; });
    if (index === -1) index = 0;
    var step = GEOGRAPHIC_INVESTIGATION_STEPS[index];
    return Object.assign({ index: index, total: GEOGRAPHIC_INVESTIGATION_STEPS.length, nextId: GEOGRAPHIC_INVESTIGATION_STEPS[(index + 1) % GEOGRAPHIC_INVESTIGATION_STEPS.length].id }, step);
  }

var IMMERSIVE_TOUR_STEPS = [
    { id: 'scan', label: 'Scan the system', camera: 'overview', focus: 'system', prompt: 'What is the first weather pattern you notice?', evidence: 'Name one visible clue from the whole scene.' },
    { id: 'front', label: 'Inspect the front', camera: 'front', focus: 'front', prompt: 'Where is air being lifted or separated?', evidence: 'Use the sloped boundary, air masses, and wind arrows.' },
    { id: 'moisture', label: 'Trace moisture', camera: 'overview', focus: 'moisture', prompt: 'How do clouds or precipitation connect to humidity and lift?', evidence: 'Connect cloud cover, particles, and the wind field.' },
    { id: 'station', label: 'Ground truth it', camera: 'surface', focus: 'stations', prompt: 'Which surface observation would you trust first?', evidence: 'Use station markers and wind vectors to support a forecast move.' }
  ];

  function immersiveTourStep(stepId) {
    var index = IMMERSIVE_TOUR_STEPS.findIndex(function (step) { return step.id === stepId; });
    if (index === -1) index = 0;
    var step = IMMERSIVE_TOUR_STEPS[index];
    return Object.assign({ index: index, total: IMMERSIVE_TOUR_STEPS.length, nextId: IMMERSIVE_TOUR_STEPS[(index + 1) % IMMERSIVE_TOUR_STEPS.length].id }, step);
  }

var GEOGRAPHY_PROFILES = {
    plains: { id: 'plains', label: 'Interior plains', detail: 'Open terrain emphasizes broad air-mass movement and frontal timing.', coast: 0, ridge: 0.18, river: 0.45, urban: 0.18, terrainBoost: 0.72, color: 0x34785d },
    coastal: { id: 'coastal', label: 'Coastal watershed', detail: 'Ocean water, shoreline contrast, and low coastal terrain shape wind and precipitation.', coast: 1, ridge: 0.16, river: 0.56, urban: 0.22, terrainBoost: 0.58, color: 0x2f7664 },
    mountain: { id: 'mountain', label: 'Mountain valley', detail: 'Ridges and valleys highlight terrain lift, rain shadows, and station elevation.', coast: 0, ridge: 1, river: 0.64, urban: 0.08, terrainBoost: 1.18, color: 0x3f6f4f },
    urban: { id: 'urban', label: 'Urban basin', detail: 'Dense built surfaces and a river corridor help discuss local heat and runoff.', coast: 0.18, ridge: 0.24, river: 0.5, urban: 1, terrainBoost: 0.62, color: 0x365f55 }
  };

  function geographyProfile(id, scenarioId) {
    var defaults = { winterStorm: 'coastal', warmFront: 'coastal', summerStorm: 'urban', coldFront: 'plains', fair: 'plains' };
    var key = GEOGRAPHY_PROFILES[id] ? id : (defaults[scenarioId] || 'plains');
    return Object.assign({}, GEOGRAPHY_PROFILES[key]);
  }

  var GEOGRAPHIC_MAP_SOURCES = {
    mapStyle: 'https://tiles.openfreemap.org/styles/liberty',
    terrain: 'https://tiles.mapterhorn.com/tilejson.json',
    mapLibreScript: 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js',
    mapLibreCss: 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'
  };

  function geographicMetadata(latitude, longitude, label, place) {
    var source = place || {};
    var elevation = source.elevation != null && isFinite(Number(source.elevation)) ? Math.round(Number(source.elevation)) : null;
    return {
      latitude: Math.round(Number(latitude) * 10000) / 10000,
      longitude: Math.round(Number(longitude) * 10000) / 10000,
      label: label || 'Selected location',
      locality: source.name || '',
      admin1: source.admin1 || '',
      admin2: source.admin2 || '',
      country: source.country || '',
      countryCode: source.country_code || '',
      elevation: elevation
    };
  }

  function geographicViewState(data) {
    var values = data || {};
    var live = values.liveWeather || null;
    var hasLatitude = !!live && live.latitude != null && isFinite(Number(live.latitude));
    var hasLongitude = !!live && live.longitude != null && isFinite(Number(live.longitude));
    var latitude = hasLatitude ? Number(live.latitude) : null;
    var longitude = hasLongitude ? Number(live.longitude) : null;
    var available = hasLatitude && hasLongitude && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    var requested = values.immersiveSceneMode === 'geographic';
    var metadata = values.liveGeography || {};
    var context = [metadata.admin2, metadata.admin1, metadata.country].filter(Boolean).join(', ');
    return {
      requested: requested,
      available: available,
      mode: requested && available ? 'geographic' : 'conceptual',
      latitude: available ? latitude : null,
      longitude: available ? longitude : null,
      label: available ? (live.label || metadata.label || 'Selected location') : '',
      context: context,
      elevation: metadata.elevation != null && isFinite(Number(metadata.elevation)) ? Number(metadata.elevation) : null
    };
  }

  function geographicDestination(longitude, latitude, bearingDegrees, distanceKm) {
    var earthRadiusKm = 6371.0088;
    var angularDistance = Math.max(0, Number(distanceKm) || 0) / earthRadiusKm;
    var bearing = (Number(bearingDegrees) || 0) * Math.PI / 180;
    var latitude1 = Number(latitude) * Math.PI / 180;
    var longitude1 = Number(longitude) * Math.PI / 180;
    var latitude2 = Math.asin(Math.sin(latitude1) * Math.cos(angularDistance) + Math.cos(latitude1) * Math.sin(angularDistance) * Math.cos(bearing));
    var longitude2 = longitude1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude1), Math.cos(angularDistance) - Math.sin(latitude1) * Math.sin(latitude2));
    return [round(((longitude2 * 180 / Math.PI + 540) % 360) - 180, 6), round(latitude2 * 180 / Math.PI, 6)];
  }

  function geographicPointComparison(siteLongitude, siteLatitude, siteElevation, pointLongitude, pointLatitude, pointElevation) {
    var longitude1 = Number(siteLongitude);
    var latitude1 = Number(siteLatitude);
    var longitude2 = Number(pointLongitude);
    var latitude2 = Number(pointLatitude);
    var elevation = Number(pointElevation);
    if (![longitude1, latitude1, longitude2, latitude2, elevation].every(isFinite)) return null;
    var radians = Math.PI / 180;
    var latitude1Rad = latitude1 * radians;
    var latitude2Rad = latitude2 * radians;
    var deltaLatitude = (latitude2 - latitude1) * radians;
    var deltaLongitude = (longitude2 - longitude1) * radians;
    var a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) + Math.cos(latitude1Rad) * Math.cos(latitude2Rad) * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
    var distanceKm = 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    var bearingRadians = Math.atan2(Math.sin(deltaLongitude) * Math.cos(latitude2Rad), Math.cos(latitude1Rad) * Math.sin(latitude2Rad) - Math.sin(latitude1Rad) * Math.cos(latitude2Rad) * Math.cos(deltaLongitude));
    var bearing = ((bearingRadians * 180 / Math.PI) + 360) % 360;
    var numericSiteElevation = Number(siteElevation);
    var hasSiteElevation = isFinite(numericSiteElevation);
    var elevationDelta = hasSiteElevation ? Math.round(elevation - numericSiteElevation) : null;
    var relation = elevationDelta == null ? 'Elevation sampled' : elevationDelta >= 20 ? 'Higher than site' : elevationDelta <= -20 ? 'Lower than site' : 'Similar elevation to site';
    return {
      longitude: round(longitude2, 6),
      latitude: round(latitude2, 6),
      distanceKm: round(distanceKm, 2),
      bearing: round(bearing, 1),
      direction: cardinal(bearing),
      elevation: Math.round(elevation),
      siteElevation: hasSiteElevation ? Math.round(numericSiteElevation) : null,
      elevationDelta: elevationDelta,
      relation: relation
    };
  }

  function geographicTerrainWindAnalysis(comparison, windDirection) {
    var sample = comparison || {};
    var bearing = Number(sample.bearing);
    var windFrom = ((Number(windDirection) % 360) + 360) % 360;
    var distanceKm = Number(sample.distanceKm);
    var elevationDelta = Number(sample.elevationDelta);
    if (![bearing, windFrom, distanceKm, elevationDelta].every(isFinite) || distanceKm <= 0) return null;
    var angularDifference = Math.abs(((bearing - windFrom + 540) % 360) - 180);
    var position = angularDifference <= 45 ? 'Upwind' : angularDifference >= 135 ? 'Downwind' : 'Crosswind';
    var gradePercent = round(elevationDelta / (distanceKm * 1000) * 100, 2);
    var slopeDegrees = round(Math.atan(elevationDelta / (distanceKm * 1000)) * 180 / Math.PI, 2);
    var absoluteGrade = Math.abs(gradePercent);
    var gradeLabel = absoluteGrade < 1 ? 'Nearly level average grade' : absoluteGrade < 5 ? 'Gentle average grade' : absoluteGrade < 12 ? 'Moderate average grade' : 'Steep average grade';
    var signalLabel;
    var interpretation;
    if (position === 'Upwind' && elevationDelta >= 50) {
      signalLabel = 'Upwind terrain barrier';
      interpretation = 'The sampled terrain is ' + Math.abs(Math.round(elevationDelta)) + ' m higher in the direction the observed wind comes from. It may force approaching air upward, but moisture and stability evidence are still needed.';
    } else if (position === 'Upwind' && elevationDelta <= -50) {
      signalLabel = 'Lower upwind approach';
      interpretation = 'The observed wind approaches from terrain ' + Math.abs(Math.round(elevationDelta)) + ' m lower than the site. The site may be exposed above the approaching flow rather than sheltered behind an upstream rise.';
    } else if (position === 'Downwind') {
      signalLabel = 'Downwind terrain context';
      interpretation = 'This sample lies mainly downstream of the observed wind. Use it to investigate descending flow, sheltering, or rain-shadow patterns after air crosses the site.';
    } else if (position === 'Crosswind') {
      signalLabel = 'Crosswind terrain context';
      interpretation = 'This sample sits across the observed wind path. Its elevation contrast describes lateral terrain context, not direct evidence that air is being lifted toward the site.';
    } else {
      signalLabel = 'Limited upwind relief';
      interpretation = 'This upwind sample is close to the site elevation, so it provides limited evidence of terrain-forced lifting along the observed wind direction.';
    }
    return {
      position: position,
      label: position + ' sample',
      angularDifference: round(angularDifference, 1),
      gradePercent: gradePercent,
      slopeDegrees: slopeDegrees,
      gradeLabel: gradeLabel,
      signalLabel: signalLabel,
      interpretation: interpretation
    };
  }

  function geographicOverlayData(liveWeather, radiusKm) {
    var live = liveWeather || {};
    var longitude = Number(live.longitude);
    var latitude = Number(live.latitude);
    var radius = clamp(radiusKm != null ? Number(radiusKm) : 10, 2, 50);
    var ring = [];
    for (var i = 0; i <= 64; i += 1) ring.push(geographicDestination(longitude, latitude, i * 360 / 64, radius));
    var downwindBearing = ((Number(live.windDir) || 0) + 180) % 360;
    var windDistance = clamp((Number(live.windSpeed) || 0) * 0.18, 2, 14);
    var windMidpoint = geographicDestination(longitude, latitude, downwindBearing, windDistance * 0.56);
    var windEnd = geographicDestination(longitude, latitude, downwindBearing, windDistance);
    return {
      studyArea: {
        type: 'Feature',
        properties: { radiusKm: radius, label: radius + ' km study area' },
        geometry: { type: 'Polygon', coordinates: [ring] }
      },
      wind: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { kind: 'flow', speed: Number(live.windSpeed) || 0, direction: downwindBearing },
            geometry: { type: 'LineString', coordinates: [[longitude, latitude], windEnd] }
          },
          {
            type: 'Feature',
            properties: { kind: 'arrow', speed: Number(live.windSpeed) || 0, direction: downwindBearing },
            geometry: { type: 'Point', coordinates: windMidpoint }
          },
          {
            type: 'Feature',
            properties: { kind: 'endpoint', speed: Number(live.windSpeed) || 0, direction: downwindBearing },
            geometry: { type: 'Point', coordinates: windEnd }
          }
        ]
      },
      windDistanceKm: round(windDistance, 1),
      downwindBearing: downwindBearing
    };
  }

  function geographicWindTransect(liveWeather, totalDistanceKm, sampleCount) {
    var live = liveWeather || {};
    var longitude = Number(live.longitude);
    var latitude = Number(live.latitude);
    var totalDistance = clamp(totalDistanceKm != null ? Number(totalDistanceKm) : 30, 10, 100);
    var count = Math.round(clamp(sampleCount != null ? Number(sampleCount) : 25, 9, 41));
    if (count % 2 === 0) count += 1;
    var upwindBearing = ((Number(live.windDir) || 0) % 360 + 360) % 360;
    var downwindBearing = (upwindBearing + 180) % 360;
    var coordinates = [];
    for (var i = 0; i < count; i += 1) {
      var offset = -totalDistance / 2 + totalDistance * i / (count - 1);
      coordinates.push(offset < 0
        ? geographicDestination(longitude, latitude, upwindBearing, Math.abs(offset))
        : geographicDestination(longitude, latitude, downwindBearing, offset));
    }
    return {
      type: 'Feature',
      properties: { totalDistanceKm: totalDistance, sampleCount: count, upwindBearing: upwindBearing, downwindBearing: downwindBearing },
      geometry: { type: 'LineString', coordinates: coordinates }
    };
  }

  function analyzeGeographicTerrainProfile(profile) {
    var points = (Array.isArray(profile) ? profile : []).filter(function (point) { return point && isFinite(Number(point.distanceKm)) && isFinite(Number(point.elevation)); }).map(function (point) { return { distanceKm: Number(point.distanceKm), elevation: Number(point.elevation) }; }).sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    if (points.length < 2) return null;
    var elevations = points.map(function (point) { return point.elevation; });
    var minElevation = Math.min.apply(null, elevations);
    var maxElevation = Math.max.apply(null, elevations);
    var distanceMax = points[points.length - 1].distanceKm;
    var sitePoint = points.reduce(function (nearest, point) { return Math.abs(point.distanceKm - distanceMax / 2) < Math.abs(nearest.distanceKm - distanceMax / 2) ? point : nearest; }, points[0]);
    var upwindPoint = points[0];
    var downwindPoint = points[points.length - 1];
    var riseToSite = Math.round(sitePoint.elevation - upwindPoint.elevation);
    var changeAfterSite = Math.round(downwindPoint.elevation - sitePoint.elevation);
    var signalLabel;
    var interpretation;
    if (riseToSite >= 150) {
      signalLabel = 'Strong windward lifting signal';
      interpretation = 'Terrain rises ' + riseToSite + ' m toward the site, so crossing airflow may be forced upward substantially before continuing downwind.';
    } else if (riseToSite >= 50) {
      signalLabel = 'Moderate windward lifting signal';
      interpretation = 'Terrain rises ' + riseToSite + ' m toward the site, which may encourage crossing airflow to rise and cool.';
    } else if (riseToSite >= 15) {
      signalLabel = 'Gentle windward ascent';
      interpretation = 'Terrain rises gradually toward the site. This provides a smaller terrain-lifting signal to compare with moisture and stability evidence.';
    } else if (riseToSite <= -50) {
      signalLabel = 'Descending terrain toward site';
      interpretation = 'Terrain descends ' + Math.abs(riseToSite) + ' m toward the site, so strong windward lifting is not indicated along this transect.';
    } else {
      signalLabel = 'Limited windward relief';
      interpretation = 'Elevation changes little toward the site, so terrain alone provides limited evidence for forced lifting along this transect.';
    }
    return {
      pointCount: points.length,
      distanceKm: round(distanceMax, 1),
      minElevation: Math.round(minElevation),
      maxElevation: Math.round(maxElevation),
      relief: Math.round(maxElevation - minElevation),
      siteElevation: Math.round(sitePoint.elevation),
      riseToSite: riseToSite,
      changeAfterSite: changeAfterSite,
      signalLabel: signalLabel,
      interpretation: interpretation
    };
  }

  function geographicTerrainEvidenceStatus(evidence, liveWeather) {
    if (!evidence) return { current: false, code: 'missing', label: 'No saved terrain evidence', detail: 'Save a terrain profile before using it in a forecast.' };
    var live = liveWeather || null;
    if (!live) return { current: true, code: 'saved', label: 'Saved evidence provenance', detail: 'No active live observation is loaded for comparison.' };
    var evidenceLatitude = Number(evidence.latitude);
    var evidenceLongitude = Number(evidence.longitude);
    var liveLatitude = Number(live.latitude);
    var liveLongitude = Number(live.longitude);
    var coordinatesAvailable = isFinite(evidenceLatitude) && isFinite(evidenceLongitude) && isFinite(liveLatitude) && isFinite(liveLongitude);
    var sameLocation = coordinatesAvailable
      ? Math.abs(evidenceLatitude - liveLatitude) <= 0.0002 && Math.abs(evidenceLongitude - liveLongitude) <= 0.0002
      : cleanLocationPart(evidence.location).toLowerCase() === cleanLocationPart(live.label).toLowerCase();
    if (!sameLocation) return { current: false, code: 'location', label: 'Stale location evidence', detail: 'This terrain profile belongs to ' + (evidence.location || 'a different location') + ', not the active live site.' };
    var sameObservation = !evidence.observedAt || !live.observedAt || String(evidence.observedAt) === String(live.observedAt);
    if (!sameObservation) return { current: false, code: 'observation', label: 'Older observation evidence', detail: 'The terrain profile was paired with an earlier weather observation and should be refreshed before forecasting.' };
    return { current: true, code: 'current', label: 'Current location and observation', detail: 'Terrain, wind direction, location, and observation provenance match the active live site.' };
  }

  function liveObservationFreshness(liveWeather, nowMs) {
    var live = liveWeather || {};
    var observedAt = String(live.observedAt || '').trim();
    if (!observedAt) return { code: 'unknown', current: false, stale: true, ageMinutes: null, badge: 'SAVED', label: 'Saved observation', detail: 'Observation time is unavailable.' };
    var timestamp;
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(observedAt) && isFinite(Number(live.utcOffsetSeconds))) {
      timestamp = Date.parse(observedAt + 'Z') - Number(live.utcOffsetSeconds) * 1000;
    } else {
      timestamp = Date.parse(observedAt);
    }
    if (!isFinite(timestamp)) return { code: 'unknown', current: false, stale: true, ageMinutes: null, badge: 'SAVED', label: 'Saved observation', detail: 'Observation time could not be interpreted.' };
    var reference = isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    var ageMinutes = Math.max(0, Math.round((reference - timestamp) / 60000));
    var ageLabel = ageMinutes < 60 ? ageMinutes + ' min ago' : ageMinutes < 1440 ? Math.round(ageMinutes / 60) + ' h ago' : Math.round(ageMinutes / 1440) + ' d ago';
    if (ageMinutes <= 90) return { code: 'current', current: true, stale: false, ageMinutes: ageMinutes, badge: 'LIVE', label: 'Current observation', detail: 'Observed ' + ageLabel + '.' };
    if (ageMinutes <= 360) return { code: 'recent', current: false, stale: false, ageMinutes: ageMinutes, badge: 'RECENT', label: 'Recent observation', detail: 'Observed ' + ageLabel + '; verify conditions before treating this as current.' };
    return { code: 'stale', current: false, stale: true, ageMinutes: ageMinutes, badge: 'SAVED', label: 'Saved observation', detail: 'Observed ' + ageLabel + '; refresh before making a current-conditions claim.' };
  }

  function geographicBuildingLayerIds(style) {
    var layers = style && Array.isArray(style.layers) ? style.layers : [];
    return layers.filter(function (layer) {
      if (!layer || layer.type !== 'fill-extrusion') return false;
      return /build/i.test(String(layer.id || '')) || /build/i.test(String(layer['source-layer'] || ''));
    }).map(function (layer) { return layer.id; }).filter(Boolean);
  }

  function geographicOrientationSummary(bearing) {
    var raw = isFinite(Number(bearing)) ? Number(bearing) : 0;
    var normalized = ((raw + 180) % 360 + 360) % 360 - 180;
    var northOffset = -normalized;
    var roundedOffset = Math.round(Math.abs(northOffset));
    var detail = roundedOffset <= 1 ? 'North is aligned with screen top.' : 'North is ' + roundedOffset + '\u00B0 ' + (northOffset > 0 ? 'right' : 'left') + ' of screen top.';
    return { bearing: round(normalized, 1), northRotation: round(northOffset, 1), label: detail };
  }

  function geographicObservationSummary(liveWeather) {
    var live = liveWeather || {};
    var parts = [live.label || 'Selected observation'];
    var condition = live.condition || (live.weatherCode != null ? weatherCodeLabel(live.weatherCode) : '');
    if (condition) parts.push(condition);
    if (isFinite(Number(live.temperature))) parts.push(round(Number(live.temperature), 1) + '\u00B0C');
    if (isFinite(Number(live.humidity))) parts.push(Math.round(Number(live.humidity)) + '% RH');
    if (isFinite(Number(live.windSpeed))) parts.push(cardinal(Number(live.windDir) || 0) + ' ' + round(Number(live.windSpeed), 1) + ' km/h wind');
    if (isFinite(Number(live.pressure))) parts.push(round(Number(live.pressure), 1) + ' hPa');
    return parts.join(' | ');
  }

  // Map-engine CDN candidates, tried in order. A single CDN is a single point
  // of failure on filtered school networks; jsDelivr is frequently reachable
  // when unpkg is not (and vice versa).
  var WEATHER_MAPLIBRE_CDNS = [
    { script: GEOGRAPHIC_MAP_SOURCES.mapLibreScript, css: GEOGRAPHIC_MAP_SOURCES.mapLibreCss },
    { script: 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js', css: 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css' }
  ];
  var WEATHER_MAPLIBRE_TIMEOUT_MS = 20000;
  var WEATHER_MAP_READY_TIMEOUT_MS = 30000;

  function ensureWeatherMapLibre() {
    if (window.maplibregl && window.maplibregl.Map) return Promise.resolve(window.maplibregl);
    if (window.__weatherMapLibrePromise) return window.__weatherMapLibrePromise;
    var scriptId = 'weather-maplibre-script';
    function attempt(index) {
      return new Promise(function (resolve, reject) {
        if (index >= WEATHER_MAPLIBRE_CDNS.length) {
          reject(new Error('The open geographic map engine could not be loaded from any source. School network filters sometimes block map services — use Retry, or continue with the conceptual 3D scene.'));
          return;
        }
        var source = WEATHER_MAPLIBRE_CDNS[index];
        // Remove any script tag left by a failed earlier attempt. Its
        // load/error events have already fired and will never fire again, so
        // re-listening on it would hang the loading state forever.
        var stale = document.getElementById(scriptId);
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        var cssId = 'weather-maplibre-css-' + index;
        if (!document.getElementById(cssId)) {
          var link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = source.css;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
        var script = document.createElement('script');
        var settled = false;
        // A filtered network can black-hole the request (no load, no error) —
        // without a timeout the spinner never resolves.
        var timer = window.setTimeout(function () { finish(false); }, WEATHER_MAPLIBRE_TIMEOUT_MS);
        function finish(ok) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (ok && window.maplibregl && window.maplibregl.Map) { resolve(window.maplibregl); return; }
          if (script.parentNode) script.parentNode.removeChild(script);
          resolve(attempt(index + 1)); // fall through to the next CDN
        }
        script.id = scriptId;
        script.src = source.script;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.addEventListener('load', function () { finish(true); }, { once: true });
        script.addEventListener('error', function () { finish(false); }, { once: true });
        document.head.appendChild(script);
      });
    }
    window.__weatherMapLibrePromise = attempt(0).catch(function (error) {
      window.__weatherMapLibrePromise = null; // allow a fresh Retry
      throw error;
    });
    return window.__weatherMapLibrePromise;
  }

  function cleanLocationPart(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function buildLocationQuery(fields) {
    var values = fields || {};
    return [cleanLocationPart(values.city), cleanLocationPart(values.region), cleanLocationPart(values.postalCode), cleanLocationPart(values.country)].filter(Boolean).join(', ');
  }

  function parseLocationCoordinates(value) {
    var query = cleanLocationPart(value);
    var number = '([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
    var pattern = '^' + number + '\\s*\\u00b0?\\s*([NS])?(?:\\s*[,;]\\s*|\\s+)' + number + '\\s*\\u00b0?\\s*([EW])?$';
    var match = query.match(new RegExp(pattern, 'i'));
    if (!match) return null;
    var latitude = Number(match[1]);
    var longitude = Number(match[3]);
    var latitudeHemisphere = (match[2] || '').toUpperCase();
    var longitudeHemisphere = (match[4] || '').toUpperCase();
    if (latitudeHemisphere) latitude = Math.abs(latitude) * (latitudeHemisphere === 'S' ? -1 : 1);
    if (longitudeHemisphere) longitude = Math.abs(longitude) * (longitudeHemisphere === 'W' ? -1 : 1);
    if (!isFinite(latitude) || !isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude: latitude, longitude: longitude };
  }

  function locationSearchCandidates(query, fields) {
    var candidates = [];
    function add(value) {
      var candidate = cleanLocationPart(value).replace(/\s*[|/]\s*/g, ', ');
      if (candidate && candidates.indexOf(candidate) === -1) candidates.push(candidate);
    }
    var fullQuery = cleanLocationPart(query);
    add(fullQuery);
    if (fields) {
      var city = cleanLocationPart(fields.city);
      var region = cleanLocationPart(fields.region);
      var postalCode = cleanLocationPart(fields.postalCode);
      var country = cleanLocationPart(fields.country);
      if (city) {
        add([city, region, country].filter(Boolean).join(', '));
        add([city, country].filter(Boolean).join(', '));
        add(city);
      }
      if (postalCode) {
        add([postalCode, country].filter(Boolean).join(', '));
        add(postalCode);
      }
    } else {
      var commaParts = fullQuery.split(',').map(cleanLocationPart).filter(Boolean);
      if (commaParts.length > 1) add(commaParts[0]);
      var withoutPostal = fullQuery.replace(/(?:,?\s*)\b\d{5}(?:-\d{4})?\b\s*$/, '').trim().replace(/,\s*$/, '');
      if (withoutPostal !== fullQuery) add(withoutPostal);
      var tokens = withoutPostal.split(/\s+/);
      if (tokens.length > 1 && (fullQuery.indexOf(',') === -1 || /^[A-Za-z]{2,3}$/.test(tokens[tokens.length - 1]))) add(tokens.slice(0, -1).join(' '));
    }
    return candidates;
  }

  function chooseLocationResult(results, fields) {
    if (!results || !results.length) return null;
    var values = fields || {};
    var city = cleanLocationPart(values.city).toLowerCase();
    var region = cleanLocationPart(values.region).toLowerCase();
    var postalCode = cleanLocationPart(values.postalCode).toLowerCase();
    var country = cleanLocationPart(values.country).toLowerCase();
    function includes(value, expected) {
      return !expected || cleanLocationPart(value).toLowerCase().indexOf(expected) !== -1;
    }
    return results.slice().sort(function (left, right) {
      function score(place) {
        var total = 0;
        if (city && includes(place.name, city)) total += 12;
        if (region && (includes(place.admin1, region) || includes(place.admin2, region))) total += 7;
        if (country && (includes(place.country, country) || cleanLocationPart(place.country_code).toLowerCase() === country)) total += 6;
        var postcodes = place.postcodes || place.postcode || '';
        if (postalCode && includes(Array.isArray(postcodes) ? postcodes.join(' ') : postcodes, postalCode)) total += 4;
        if (place.feature_code && /^(PPL|PPLA|PPLC)/.test(place.feature_code)) total += 1;
        return total;
      }
      return score(right) - score(left);
    })[0];
  }

  function weatherCodeLabel(code) {
    var value = Number(code);
    if (value === 0) return 'Clear sky';
    if (value <= 3) return 'Partly cloudy';
    if (value === 45 || value === 48) return 'Fog';
    if (value >= 51 && value <= 57) return 'Drizzle';
    if (value >= 61 && value <= 67) return 'Rain';
    if (value >= 71 && value <= 77) return 'Snow';
    if (value >= 80 && value <= 82) return 'Rain showers';
    if (value >= 85 && value <= 86) return 'Snow showers';
    if (value >= 95) return 'Thunderstorms';
    return 'Variable conditions';
  }

  function normalizeLiveWeatherResponse(payload, label, latitude, longitude) {
    if (!payload || !payload.current) throw new Error('Live weather response did not include current conditions.');
    var current = payload.current;
    return {
      label: label || 'Selected location',
      latitude: Math.round(Number(latitude) * 10000) / 10000,
      longitude: Math.round(Number(longitude) * 10000) / 10000,
      observedAt: current.time || '',
      timezone: payload.timezone_abbreviation || payload.timezone || '',
      utcOffsetSeconds: isFinite(Number(payload.utc_offset_seconds)) ? Number(payload.utc_offset_seconds) : null,
      temperature: Number(current.temperature_2m),
      humidity: Number(current.relative_humidity_2m),
      precipitation: Number(current.precipitation || 0),
      weatherCode: Number(current.weather_code),
      condition: weatherCodeLabel(current.weather_code),
      cloudCover: Number(current.cloud_cover || 0),
      pressure: Number(current.surface_pressure),
      windSpeed: Number(current.wind_speed_10m || 0),
      windDir: Number(current.wind_direction_10m || 0),
      visibility: current.visibility != null ? Number(current.visibility) : null,
      source: 'Open-Meteo',
      sourceUrl: 'https://open-meteo.com/'
    };
  }

  window.WeatherSystemsKernel = {
    scenarios: SCENARIOS,
    dewPointC: dewPointC,
    projectConditions: projectConditions,
    stationObservation: stationObservation,
    stationNetworkAnalysis: stationNetworkAnalysis,
    frontPassageHour: frontPassageHour,
    stationTimeSeries: stationTimeSeries,
    expectedForecast: expectedForecast,
    ensembleForecast: ensembleForecast,
    readinessActionForHazard: readinessActionForHazard,
    calibrateConfidence: calibrateConfidence,
    experimentVariables: EXPERIMENT_VARIABLES,
    runExperiment: runExperiment,
    compareScenarioPatterns: compareScenarioPatterns,
    scoreForecast: scoreForecast,
    immersiveFocusProfile: immersiveFocusProfile,
    immersiveTourStep: immersiveTourStep,
    geographicCameraView: geographicCameraView,
    geographicAnalysisLens: geographicAnalysisLens,
    geographicInvestigationStep: geographicInvestigationStep,
    geographyProfile: geographyProfile,
    geographicMetadata: geographicMetadata,
    geographicViewState: geographicViewState,
    geographicDestination: geographicDestination,
    geographicPointComparison: geographicPointComparison,
    geographicTerrainWindAnalysis: geographicTerrainWindAnalysis,
    geographicOverlayData: geographicOverlayData,
    geographicWindTransect: geographicWindTransect,
    analyzeGeographicTerrainProfile: analyzeGeographicTerrainProfile,
    geographicTerrainEvidenceStatus: geographicTerrainEvidenceStatus,
    liveObservationFreshness: liveObservationFreshness,
    geographicBuildingLayerIds: geographicBuildingLayerIds,
    geographicOrientationSummary: geographicOrientationSummary,
    geographicObservationSummary: geographicObservationSummary,
    geographicMapSources: Object.assign({}, GEOGRAPHIC_MAP_SOURCES),
    cleanLocationPart: cleanLocationPart,
    buildLocationQuery: buildLocationQuery,
    parseLocationCoordinates: parseLocationCoordinates,
    locationSearchCandidates: locationSearchCandidates,
    chooseLocationResult: chooseLocationResult,
    weatherCodeLabel: weatherCodeLabel,
    normalizeLiveWeatherResponse: normalizeLiveWeatherResponse,
    resolvedState: resolvedState
  };

  function roundedRect(g, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + radius, y);
    g.arcTo(x + w, y, x + w, y + h, radius);
    g.arcTo(x + w, y + h, x, y + h, radius);
    g.arcTo(x, y + h, x, y, radius);
    g.arcTo(x, y, x + w, y, radius);
    g.closePath();
  }

  function drawCloud(g, x, y, scale, dark, storm) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.shadowColor = 'rgba(2, 6, 23, .35)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 6;
    var fill = storm ? (dark ? '#64748b' : '#475569') : (dark ? '#e2e8f0' : '#f8fafc');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(-20, 3, 17, 0, Math.PI * 2);
    g.arc(0, -7, 24, 0, Math.PI * 2);
    g.arc(25, 1, 19, 0, Math.PI * 2);
    g.rect(-24, 0, 52, 19);
    g.fill();
    g.restore();
  }

  function drawFront(g, width, height, state, scenario, palette) {
    if (!state.fronts || scenario.frontType === 'none') return;
    var progress = clamp((state.simHour * state.frontSpeed) / 500, 0, 0.55);
    var baseX = width * (0.28 + progress);
    var color = scenario.frontType === 'warm' ? '#ef4444' : scenario.frontType === 'occluded' ? '#a855f7' : scenario.frontType === 'outflow' ? '#14b8a6' : '#2563eb';
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.beginPath();
    for (var i = 0; i <= 12; i += 1) {
      var y = height * 0.2 + i * height * 0.052;
      var x = baseX + Math.sin(i * 0.8 + state.simHour * 0.15) * 24;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    for (var j = 1; j < 12; j += 2) {
      var sy = height * 0.2 + j * height * 0.052;
      var sx = baseX + Math.sin(j * 0.8 + state.simHour * 0.15) * 24;
      g.fillStyle = color;
      if (scenario.frontType === 'warm') {
        g.beginPath(); g.arc(sx + 7, sy, 7, -Math.PI / 2, Math.PI / 2); g.fill();
      } else if (scenario.frontType === 'occluded') {
        if (j % 4 === 1) { g.beginPath(); g.arc(sx + 7, sy, 7, -Math.PI / 2, Math.PI / 2); g.fill(); }
        else { g.beginPath(); g.moveTo(sx, sy - 7); g.lineTo(sx + 14, sy); g.lineTo(sx, sy + 7); g.closePath(); g.fill(); }
      } else {
        g.beginPath(); g.moveTo(sx, sy - 7); g.lineTo(sx + 14, sy); g.lineTo(sx, sy + 7); g.closePath(); g.fill();
      }
    }
    g.font = '600 12px system-ui';
    g.fillStyle = palette.text;
    g.fillText(scenario.name, Math.max(12, baseX - 64), height * 0.16);
    g.restore();
  }

  function drawLightning(g, x, y, scale, alpha) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.globalAlpha = alpha;
    g.shadowColor = '#fde047';
    g.shadowBlur = 16;
    g.strokeStyle = '#fef08a';
    g.lineWidth = 3;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(-7, 17); g.lineTo(2, 15); g.lineTo(-5, 34); g.lineTo(12, 11); g.lineTo(4, 12); g.lineTo(10, 0);
    g.stroke();
    g.restore();
  }

  function drawCanvasVisualKey(g, width, height, state, scenario, current, palette, dark, time) {
    var x = width - 246;
    var y = 18;
    var frontColor = scenario.frontType === 'warm' ? '#ef4444' : scenario.frontType === 'occluded' ? '#a855f7' : scenario.frontType === 'outflow' ? '#14b8a6' : scenario.frontType === 'none' ? '#64748b' : '#2563eb';
    g.save();
    roundedRect(g, x, y, 228, 92, 13);
    g.fillStyle = dark ? 'rgba(2,6,23,.80)' : 'rgba(255,255,255,.88)';
    g.fill();
    g.strokeStyle = dark ? 'rgba(125,211,252,.25)' : 'rgba(14,116,144,.22)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = palette.muted;
    g.font = '700 11px system-ui';
    g.fillText('VISIBLE MAP LAYERS', x + 14, y + 19);

    g.fillStyle = frontColor;
    g.beginPath(); g.arc(x + 18, y + 39, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = palette.text; g.font = '600 11px system-ui';
    g.fillText(scenario.frontType === 'none' ? 'No front' : scenario.frontType + ' front', x + 30, y + 43);

    var radarColors = ['#22c55e', '#facc15', '#ef4444'];
    radarColors.forEach(function (color, index) { g.fillStyle = color; g.fillRect(x + 13 + index * 12, y + 55, 9, 9); });
    g.fillStyle = palette.text;
    g.fillText(state.radar ? 'Radar: light to intense' : 'Radar hidden', x + 54, y + 64);

    var angle = (state.windDir - 90) * Math.PI / 180;
    var ax = x + 18; var ay = y + 80;
    g.strokeStyle = dark ? '#7dd3fc' : '#0369a1'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(angle) * 20, ay + Math.sin(angle) * 12); g.stroke();
    g.fillStyle = palette.text;
    g.fillText('Wind ' + cardinal(current.windDir) + ' ' + current.windSpeed + ' km/h', x + 48, y + 84);
    g.restore();

    // Compass rose anchors the simulated map spatially.
    var cx = width - 42; var cy = height - 42;
    g.save();
    g.translate(cx, cy);
    g.fillStyle = dark ? 'rgba(2,6,23,.72)' : 'rgba(255,255,255,.82)';
    g.beginPath(); g.arc(0, 0, 25, 0, Math.PI * 2); g.fill();
    g.strokeStyle = dark ? 'rgba(186,230,253,.45)' : 'rgba(15,23,42,.28)'; g.stroke();
    g.fillStyle = '#38bdf8';
    g.beginPath(); g.moveTo(0, -18); g.lineTo(-6, 4); g.lineTo(0, 0); g.lineTo(6, 4); g.closePath(); g.fill();
    g.fillStyle = palette.text; g.font = '800 11px system-ui'; g.textAlign = 'center'; g.fillText('N', 0, -7);
    g.restore();
  }

  function drawWeatherScene(canvas, state, scenario, selectedStation, time, dark) {
    if (!canvas || !canvas.getContext) return;
    var logicalWidth = 960;
    var logicalHeight = 500;
    if (window.StemLab && window.StemLab.setupHiDPI) window.StemLab.setupHiDPI(canvas, logicalWidth, logicalHeight);
    else {
      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
    }
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    var g = canvas.getContext('2d');
    if (!g) return;
    var dpr = canvas._dpr || 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = logicalWidth;
    var H = logicalHeight;
    var palette = dark ? {
      sky1: '#071a33', sky2: '#123b5d', land: '#184d47', land2: '#2f6b55',
      water: '#0b4f6c', grid: 'rgba(186,230,253,.13)', text: '#e2e8f0', muted: '#bae6fd'
    } : {
      sky1: '#c8e8ff', sky2: '#e6f5ff', land: '#8ac08d', land2: '#5f9f72',
      water: '#4aa7c7', grid: 'rgba(15,23,42,.13)', text: '#0f172a', muted: '#164e63'
    };
    var current = projectConditions(state, state.simHour);
    var grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, palette.sky1);
    grad.addColorStop(0.52, palette.sky2);
    grad.addColorStop(1, dark ? '#0f2d3a' : '#d8eef2');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // A soft horizon glow and storm tint create atmospheric depth while preserving data contrast.
    var horizonGlow = g.createRadialGradient(W * 0.72, 205, 12, W * 0.72, 205, 360);
    horizonGlow.addColorStop(0, current.precipPotential > 65 ? 'rgba(129,140,248,.16)' : (dark ? 'rgba(56,189,248,.19)' : 'rgba(255,255,255,.58)'));
    horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = horizonGlow;
    g.fillRect(0, 0, W, H);
    if (current.precipPotential > 70) {
      g.fillStyle = dark ? 'rgba(30,41,59,.16)' : 'rgba(71,85,105,.10)';
      g.fillRect(0, 0, W, H);
    }

    // Distant atmosphere and terrain establish depth without hiding data layers.
    g.fillStyle = dark ? 'rgba(148,163,184,.13)' : 'rgba(255,255,255,.42)';
    g.beginPath();
    g.moveTo(0, 230);
    for (var m = 0; m <= W; m += 32) g.lineTo(m, 212 + Math.sin(m / 82) * 18 - state.terrain * 0.3);
    g.lineTo(W, 330); g.lineTo(0, 330); g.closePath(); g.fill();

    var landGrad = g.createLinearGradient(0, 250, 0, H);
    landGrad.addColorStop(0, palette.land2);
    landGrad.addColorStop(1, palette.land);
    g.fillStyle = landGrad;
    g.beginPath();
    g.moveTo(0, 255);
    g.bezierCurveTo(210, 225 - state.terrain * 0.5, 340, 285, 510, 258);
    g.bezierCurveTo(680, 230, 720, 315, W, 278);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();

    g.fillStyle = palette.water;
    g.beginPath();
    g.moveTo(620, 327); g.bezierCurveTo(735, 292, 815, 350, W, 308);
    g.lineTo(W, H); g.lineTo(700, H); g.bezierCurveTo(685, 430, 655, 375, 620, 327); g.fill();

    // Perspective analysis grid.
    g.strokeStyle = palette.grid;
    g.lineWidth = 1;
    for (var gy = 280; gy < H; gy += 32) {
      g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy + (gy - 280) * 0.08); g.stroke();
    }
    for (var gx = -220; gx < W + 220; gx += 82) {
      g.beginPath(); g.moveTo(W / 2, 245); g.lineTo(gx, H); g.stroke();
    }

    // Pressure contours.
    g.save();
    g.strokeStyle = dark ? 'rgba(226,232,240,.28)' : 'rgba(15,23,42,.28)';
    g.lineWidth = 1.5;
    for (var ring = 0; ring < 4; ring += 1) {
      g.beginPath();
      g.ellipse(scenario.id === 'fair' ? 690 : 230, 315, 72 + ring * 42, 28 + ring * 18, -0.15, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = palette.text;
    g.font = '700 24px system-ui';
    g.fillText(scenario.id === 'fair' ? 'H' : 'L', scenario.id === 'fair' ? 681 : 221, 322);
    g.font = '500 11px system-ui';
    g.fillText(Math.round(state.pressure) + ' hPa', scenario.id === 'fair' ? 660 : 198, 342);
    g.restore();

    drawFront(g, W, H, state, scenario, palette);

    var cloudCount = Math.round(current.cloudCover / 14);
    for (var c = 0; c < cloudCount; c += 1) {
      var cx = 170 + ((c * 137 + state.simHour * state.windSpeed * 0.9) % 720);
      var cy = 95 + (c % 3) * 47 + Math.sin(c * 2.2) * 10;
      var storm = current.precipPotential > 65 && (c % 2 === 0);
      drawCloud(g, cx, cy, 0.58 + (c % 3) * 0.13, dark, storm);
      if (storm && current.precipType === 'storms' && (c + Math.floor(time / 650)) % 3 === 0) drawLightning(g, cx + 6, cy + 22, 0.72 + (c % 2) * 0.12, 0.72);
      if (current.precipPotential > 28) {
        g.save();
        g.strokeStyle = current.precipType === 'snow' ? '#f8fafc' : current.precipType === 'mixed' ? '#c4b5fd' : '#38bdf8';
        g.lineWidth = current.precipType === 'snow' ? 3 : 1.7;
        var drops = Math.round(current.precipPotential / 18);
        for (var r = 0; r < drops; r += 1) {
          var rx = cx - 34 + r * 15 + ((time / 38 + r * 7) % 9);
          var ry = cy + 27 + ((time / 8 + r * 13) % 45);
          g.beginPath();
          if (current.precipType === 'snow') { g.arc(rx, ry, 2, 0, Math.PI * 2); }
          else { g.moveTo(rx, ry); g.lineTo(rx - 4, ry + 12); }
          g.stroke();
        }
        g.restore();
      }
    }

    // Radar layer uses soft, bounded echoes rather than a decorative wash.
    if (state.radar && current.precipPotential > 18) {
      g.save();
      g.globalCompositeOperation = 'screen';
      var radarX = scenario.id === 'summerStorm' ? 520 : 410 + state.simHour * state.frontSpeed * 0.75;
      var radarY = 336;
      var echoes = [
        { dx: -45, dy: -12, size: 72, color: 'rgba(34,197,94,.17)' },
        { dx: 8, dy: 4, size: 52, color: 'rgba(250,204,21,.20)' },
        { dx: 36, dy: -7, size: 31, color: 'rgba(239,68,68,.22)' }
      ];
      echoes.forEach(function (echo) {
        var rg = g.createRadialGradient(radarX + echo.dx, radarY + echo.dy, 3, radarX + echo.dx, radarY + echo.dy, echo.size);
        rg.addColorStop(0, echo.color); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(radarX + echo.dx, radarY + echo.dy, echo.size, 0, Math.PI * 2); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = dark ? 'rgba(125,211,252,.22)' : 'rgba(3,105,161,.20)';
      g.lineWidth = 1;
      [38, 76, 114].forEach(function (radius) { g.beginPath(); g.arc(radarX, radarY, radius, 0, Math.PI * 2); g.stroke(); });
      var sweepAngle = (time * 0.0012) % (Math.PI * 2);
      var sweep = g.createLinearGradient(radarX, radarY, radarX + Math.cos(sweepAngle) * 116, radarY + Math.sin(sweepAngle) * 116);
      sweep.addColorStop(0, 'rgba(103,232,249,.12)'); sweep.addColorStop(1, 'rgba(103,232,249,.75)');
      g.strokeStyle = sweep; g.lineWidth = 2;
      g.beginPath(); g.moveTo(radarX, radarY); g.lineTo(radarX + Math.cos(sweepAngle) * 116, radarY + Math.sin(sweepAngle) * 116); g.stroke();
      g.fillStyle = '#67e8f9'; g.beginPath(); g.arc(radarX, radarY, 3.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    // Wind tracers communicate direction and speed while remaining visually secondary.
    if (state.windLayer) {
      var radians = (state.windDir - 90) * Math.PI / 180;
      g.save();
      g.strokeStyle = dark ? 'rgba(186,230,253,.56)' : 'rgba(3,105,161,.48)';
      g.lineWidth = 1.5;
      for (var w = 0; w < 22; w += 1) {
        var phase = (time * 0.02 * Math.max(4, state.windSpeed) + w * 47) % 260;
        var wx = (w * 83 + Math.cos(radians) * phase + 80) % W;
        var wy = 265 + ((w * 43 + Math.sin(radians) * phase) % 190);
        var len = 8 + state.windSpeed * 0.38;
        var windEndX = wx + Math.cos(radians) * len;
        var windEndY = wy + Math.sin(radians) * len;
        g.beginPath(); g.moveTo(wx, wy); g.lineTo(windEndX, windEndY); g.stroke();
        if (w % 3 === 0) {
          g.beginPath();
          g.moveTo(windEndX, windEndY);
          g.lineTo(windEndX - Math.cos(radians - 0.55) * 5, windEndY - Math.sin(radians - 0.55) * 5);
          g.moveTo(windEndX, windEndY);
          g.lineTo(windEndX - Math.cos(radians + 0.55) * 5, windEndY - Math.sin(radians + 0.55) * 5);
          g.stroke();
        }
      }
      g.restore();
    }

    STATIONS.forEach(function (station) {
      var x = station.x * W;
      var y = station.y * H;
      var chosen = station.id === selectedStation;
      g.save();
      if (chosen) {
        var pulse = 16 + Math.sin(time / 180) * 3;
        g.strokeStyle = 'rgba(251,191,36,.55)';
        g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, pulse, 0, Math.PI * 2); g.stroke();
      }
      g.fillStyle = chosen ? '#fbbf24' : (dark ? '#f8fafc' : '#0f172a');
      g.strokeStyle = chosen ? '#7c2d12' : (dark ? '#0f172a' : '#f8fafc');
      g.lineWidth = chosen ? 4 : 2;
      g.beginPath(); g.arc(x, y, chosen ? 10 : 7, 0, Math.PI * 2); g.fill(); g.stroke();
      g.font = '600 12px system-ui';
      var labelWidth = g.measureText(station.name).width + 16;
      roundedRect(g, x - labelWidth / 2, y + 14, labelWidth, 24, 8);
      g.fillStyle = dark ? 'rgba(15,23,42,.88)' : 'rgba(248,250,252,.9)'; g.fill();
      g.fillStyle = palette.text; g.textAlign = 'center'; g.fillText(station.name, x, y + 30);
      g.restore();
    });

    drawCanvasVisualKey(g, W, H, state, scenario, current, palette, dark, time);

    // Compact model-time badge.
    g.save();
    roundedRect(g, 18, 18, 154, 54, 12);
    g.fillStyle = dark ? 'rgba(2,6,23,.74)' : 'rgba(255,255,255,.82)'; g.fill();
    g.fillStyle = palette.muted; g.font = '500 11px system-ui'; g.fillText('MODEL TIME', 32, 38);
    g.fillStyle = palette.text; g.font = '700 20px system-ui'; g.fillText('T +' + state.simHour + ' hours', 32, 61);
    g.restore();
  }

  window.StemLab.registerTool('weatherSystems', {
    icon: '\uD83C\uDF26\uFE0F',
    label: 'Weather Systems & Forecasting',
    desc: 'Explore fronts, pressure, humidity, wind, radar, station models, severe-weather hazards, and evidence-based forecasting.',
    color: 'sky',
    category: 'science',
    aliases: ['weather', 'forecast', 'meteorology', 'fronts', 'radar'],
    questHooks: [
      { id: 'inspect_stations', label: 'Inspect three weather stations', icon: '\uD83D\uDCCD', check: function (d) { return Object.keys(d.stationsViewed || {}).length >= 3; }, progress: function (d) { return Object.keys(d.stationsViewed || {}).length + '/3 stations'; } },
      { id: 'detect_boundary', label: 'Locate an air-mass boundary', icon: '\uD83E\uDDED', check: function (d) { return !!d.boundaryDetected; }, progress: function (d) { return d.boundaryDetected ? 'Located!' : 'Compare stations'; } },
      { id: 'adjust_model', label: 'Change a weather variable', icon: '\uD83C\uDF9B\uFE0F', check: function (d) { return !!d.modelAdjusted; }, progress: function (d) { return d.modelAdjusted ? 'Explored!' : 'Try a control'; } },
      { id: 'run_experiment', label: 'Run a controlled weather experiment', icon: '\uD83E\uDDEA', check: function (d) { return (d.experimentsRun || 0) >= 1; }, progress: function (d) { return (d.experimentsRun || 0) + '/1 test'; } },
      { id: 'issue_forecast', label: 'Issue an evidence-based forecast', icon: '\uD83D\uDCE1', check: function (d) { return (d.forecastsIssued || 0) >= 1; }, progress: function (d) { return (d.forecastsIssued || 0) + '/1 forecast'; } },
      { id: 'accurate_forecast', label: 'Score 80 or higher on a forecast', icon: '\uD83C\uDFC6', check: function (d) { return (d.bestForecast || 0) >= 80; }, progress: function (d) { return (d.bestForecast || 0) + '/80'; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var dataRoot = ctx.toolData || {};
      var d = dataRoot.weatherSystems || {};
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var announce = ctx.announceToSR;
      var contrast = !!ctx.isContrast;
      var dark = !!ctx.isDark || contrast;
      var band = gradeBand(ctx.gradeLevel);
      var canvasRef = React.useRef(null);
      var immersiveCanvasRef = React.useRef(null);
      var immersiveRuntimeRef = React.useRef(null);
      var geographicMapRef = React.useRef(null);
      var geographicRuntimeRef = React.useRef(null);
      var state = resolvedState(d);
      var scenario = scenarioById(state.scenario);
      var selectedStation = d.selectedStation || 'central';
      var station = STATIONS.filter(function (item) { return item.id === selectedStation; })[0] || STATIONS[1];
      var observation = stationObservation(state, station);
      var current = projectConditions(state, state.simHour);
      var forecastResult = d.forecastResult || null;
      var experimentVariable = d.experimentVariable || 'humidity';
      var experimentConfig = experimentVariableById(experimentVariable);
      var experimentBump = Math.max(experimentConfig.step, Math.round((experimentConfig.max - experimentConfig.min) * 0.18 / experimentConfig.step) * experimentConfig.step);
      var experimentDefault = clamp(state[experimentVariable] + experimentBump, experimentConfig.min, experimentConfig.max);
      var experimentValue = d.experimentValue != null ? Number(d.experimentValue) : experimentDefault;

      function update(patch) {
        setToolData(function (prev) {
          var next = Object.assign({}, prev);
          next.weatherSystems = Object.assign({}, prev.weatherSystems || {}, patch);
          return next;
        });
      }

      function fetchLiveWeather(latitude, longitude, label, place) {
        update({ liveWeatherLoading: true, liveWeatherError: '', liveWeatherStatus: 'Connecting to live observations...' });
        var fields = 'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility';
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(latitude) + '&longitude=' + encodeURIComponent(longitude) + '&current=' + fields + '&timezone=auto';
        return window.fetch(url).then(function (response) {
          if (!response.ok) throw new Error('Live weather service returned ' + response.status + '.');
          return response.json();
        }).then(function (payload) {
          var live = normalizeLiveWeatherResponse(payload, label, latitude, longitude);
          var geography = geographicMetadata(latitude, longitude, label, place);
          var terrainStatus = geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, live);
          var hadTerrainEvidence = !!d.geographicTerrainEvidence || (d.evidence || []).indexOf(TERRAIN_EVIDENCE.id) !== -1;
          var livePatch = { liveWeather: live, liveGeography: geography, liveWeatherLoading: false, liveWeatherError: '', liveWeatherStatus: 'Live observation loaded for ' + live.label + '.', immersiveDataSource: 'live', terrainEvidenceInvalidatedMessage: '', geographicTerrainProbe: null };
          if (hadTerrainEvidence && !terrainStatus.current) {
            livePatch.evidence = (d.evidence || []).filter(function (id) { return id !== TERRAIN_EVIDENCE.id; });
            livePatch.geographicTerrainEvidence = null;
            livePatch.terrainEvidenceInvalidatedMessage = 'Previous terrain evidence was removed because the live location or observation changed. Sample and save the new profile before forecasting.';
          }
          update(livePatch);
          if (addToast) addToast('Live weather loaded for ' + live.label + '.', 'success');
          if (announce) announce('Live weather loaded for ' + live.label + '. Observed condition: ' + live.condition + '.');
          return live;
        }).catch(function (error) {
          var message = error && error.message ? error.message : 'Live weather could not be loaded.';
          update({ liveWeatherLoading: false, liveWeatherError: message, liveWeatherStatus: '' });
          if (addToast) addToast(message, 'error');
          if (announce) announce('Live weather error. ' + message);
          return null;
        });
      }

      function requestDeviceWeather() {
        if (!window.navigator || !window.navigator.geolocation) {
          update({ liveWeatherError: 'Location services are not available in this browser.' });
          if (addToast) addToast('Location services are not available.', 'warning');
          return;
        }
        update({ liveWeatherLoading: true, liveWeatherError: '', liveWeatherStatus: 'Waiting for location permission...' });
        window.navigator.geolocation.getCurrentPosition(function (position) {
          fetchLiveWeather(position.coords.latitude, position.coords.longitude, 'My location');
        }, function (error) {
          var message = error && error.code === 1 ? 'Location permission was not granted. Search for a place instead.' : 'Your location could not be determined. Search for a place instead.';
          update({ liveWeatherLoading: false, liveWeatherError: message, liveWeatherStatus: '' });
          if (addToast) addToast(message, 'warning');
          if (announce) announce(message);
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      }

      function searchLiveWeather(mode) {
        var structured = mode === 'structured';
        var fields = structured ? {
          city: d.liveLocationCity,
          region: d.liveLocationRegion,
          postalCode: d.liveLocationPostalCode,
          country: d.liveLocationCountry
        } : null;
        var query = structured ? buildLocationQuery(fields) : cleanLocationPart(d.liveLocationQuery);
        if (!query) {
          var emptyMessage = structured ? 'Enter at least one location field.' : 'Enter a place, postal code, or coordinates.';
          if (addToast) addToast(emptyMessage, 'warning');
          if (announce) announce(emptyMessage);
          return;
        }
        var coordinates = parseLocationCoordinates(query);
        if (coordinates) {
          var coordinateLabel = 'Coordinates ' + coordinates.latitude.toFixed(4) + ', ' + coordinates.longitude.toFixed(4);
          fetchLiveWeather(coordinates.latitude, coordinates.longitude, coordinateLabel);
          return;
        }
        if (query.length < 2) {
          if (addToast) addToast('Enter at least two characters for a location search.', 'warning');
          if (announce) announce('Enter at least two characters for a location search.');
          return;
        }
        var candidates = locationSearchCandidates(query, fields);
        update({ liveWeatherLoading: true, liveWeatherError: '', liveWeatherStatus: 'Searching for ' + query + '...' });

        function searchCandidate(index) {
          if (index >= candidates.length) return Promise.resolve(null);
          var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(candidates[index]) + '&count=10&language=en&format=json';
          return window.fetch(url).then(function (response) {
            if (!response.ok) throw new Error('Location search returned ' + response.status + '.');
            return response.json();
          }).then(function (payload) {
            if (payload.results && payload.results.length) return payload.results;
            return searchCandidate(index + 1);
          });
        }

        searchCandidate(0).then(function (results) {
          if (!results || !results.length) throw new Error('No matching location was found. Try a city, postal code, country, or coordinates.');
          var place = chooseLocationResult(results, fields);
          var parts = [place.name, place.admin1, place.country].filter(Boolean);
          return fetchLiveWeather(place.latitude, place.longitude, parts.join(', '), place);
        }).catch(function (error) {
          var message = error && error.message ? error.message : 'Location search failed.';
          update({ liveWeatherLoading: false, liveWeatherError: message, liveWeatherStatus: '' });
          if (addToast) addToast(message, 'error');
          if (announce) announce('Location search error. ' + message);
        });
      }

      function enterWeatherVR() {
        var runtime = immersiveRuntimeRef.current;
        if (!runtime || !runtime.renderer) {
          if (addToast) addToast('The immersive scene is still loading.', 'info');
          if (announce) announce('The immersive weather scene is still loading.');
          return;
        }
        if (!window.navigator || !window.navigator.xr || !window.navigator.xr.isSessionSupported) {
          update({ vrStatus: 'WebXR immersive VR is not available in this browser or device.' });
          if (addToast) addToast('WebXR VR is not available on this device.', 'warning');
          return;
        }
        update({ vrStatus: 'Checking VR headset support...' });
        window.navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
          if (!supported) throw new Error('No immersive VR session is available. You can still orbit the 3D scene.');
          return window.navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        }).then(function (session) {
          return runtime.renderer.xr.setSession(session).then(function () {
            update({ vrStatus: 'VR session active.', vrSessionActive: true });
            if (addToast) addToast('VR weather immersion started.', 'success');
            if (announce) announce('VR weather immersion started.');
            session.addEventListener('end', function () {
              update({ vrStatus: 'VR session ended.', vrSessionActive: false });
              if (announce) announce('VR weather immersion ended.');
            }, { once: true });
          });
        }).catch(function (error) {
          var message = error && error.message ? error.message : 'VR session could not start.';
          update({ vrStatus: message, vrSessionActive: false });
          if (addToast) addToast(message, 'warning');
          if (announce) announce(message);
        });
      }

      function setImmersiveCameraPreset(preset) {
        var runtime = immersiveRuntimeRef.current;
        if (!runtime || !runtime.camera) {
          if (addToast) addToast('The 3D camera is still initializing.', 'info');
          return;
        }
        var frontX = -3 + state.simHour * state.frontSpeed * 0.025;
        var views = {
          overview: { label: 'overview', position: [18, 12, 22], target: [0, 3.2, 0] },
          front: { label: 'front cross-section', position: [frontX + 13, 7.5, 3], target: [frontX, 4.2, 0] },
          surface: { label: 'surface observation', position: [10, 3.4, 15], target: [0, 1.1, 0] }
        };
        var view = views[preset] || views.overview;
        var targetObject = runtime.controls ? runtime.controls.target : null;
        if (runtime.reduceMotion || !targetObject) {
          runtime.camera.position.set(view.position[0], view.position[1], view.position[2]);
          if (targetObject) targetObject.set(view.target[0], view.target[1], view.target[2]);
          runtime.camera.lookAt(view.target[0], view.target[1], view.target[2]);
        } else {
          runtime.cameraTransition = {
            started: Date.now(),
            duration: 720,
            fromPosition: runtime.camera.position.clone(),
            toPosition: new runtime.THREE.Vector3(view.position[0], view.position[1], view.position[2]),
            fromTarget: targetObject.clone(),
            toTarget: new runtime.THREE.Vector3(view.target[0], view.target[1], view.target[2])
          };
        }
        update({ immersiveCameraPreset: preset });
        if (announce) announce('3D camera moved to the ' + view.label + ' view.');
      }

      function setGeographicCameraPreset(preset) {
        var runtime = geographicRuntimeRef.current;
        var geographic = geographicViewState(d);
        if (!runtime || !runtime.map || !geographic.available) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        var view = geographicCameraView(preset);
        var reduceMotion = false;
        try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduceMotion = false; }
        runtime.map.easeTo({ center: [geographic.longitude, geographic.latitude], zoom: view.zoom, pitch: view.pitch, bearing: view.bearing, duration: reduceMotion ? 0 : 850, essential: false });
        update({ geographicCameraPreset: view.id, geographicAnalysisLens: 'custom', geographicInvestigationPaused: true, geographicViewport: { zoom: view.zoom, pitch: view.pitch, bearing: view.bearing } });
        if (announce) announce('Geographic camera moved to ' + view.label + '. Analysis view is now custom.');
      }

      function applyGeographicAnalysisLens(lensId, extraPatch, announcement) {
        var runtime = geographicRuntimeRef.current;
        var geographic = geographicViewState(d);
        if (!runtime || !runtime.map || !geographic.available || !d.geographicMapReady) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        var lens = geographicAnalysisLens(lensId);
        var view = geographicCameraView(lens.camera);
        var layerGroups = {
          studyArea: ['weather-study-area-fill', 'weather-study-area-outline'],
          wind: ['weather-wind-flow', 'weather-wind-arrow', 'weather-wind-endpoint'],
          transect: ['weather-terrain-transect-line']
        };
        Object.keys(layerGroups).forEach(function (kind) {
          layerGroups[kind].forEach(function (layerId) {
            if (runtime.map.getLayer(layerId)) runtime.map.setLayoutProperty(layerId, 'visibility', lens.layers[kind] ? 'visible' : 'none');
          });
        });
        var buildingLayerIds = runtime.buildingLayerIds || geographicBuildingLayerIds(runtime.map.getStyle && runtime.map.getStyle());
        runtime.buildingLayerIds = buildingLayerIds;
        var buildingsAvailable = buildingLayerIds.length > 0;
        var buildingsVisible = lens.layers.buildings && buildingsAvailable;
        buildingLayerIds.forEach(function (layerId) {
          if (runtime.map.getLayer(layerId)) runtime.map.setLayoutProperty(layerId, 'visibility', buildingsVisible ? 'visible' : 'none');
        });
        var reduceMotion = false;
        try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduceMotion = false; }
        runtime.map.easeTo({ center: [geographic.longitude, geographic.latitude], zoom: view.zoom, pitch: view.pitch, bearing: view.bearing, duration: reduceMotion ? 0 : 850, essential: false });
        var patch = {
          geographicAnalysisLens: lens.id,
          geographicCameraPreset: view.id,
          geographicViewport: { zoom: view.zoom, pitch: view.pitch, bearing: view.bearing },
          geographicStudyAreaVisible: lens.layers.studyArea,
          geographicWindVisible: lens.layers.wind,
          geographicTransectVisible: lens.layers.transect,
          geographicBuildings: buildingsVisible,
          geographicBuildingsAvailable: buildingsAvailable,
          geographicInvestigationPaused: false
        };
        if (extraPatch) Object.assign(patch, extraPatch);
        update(patch);
        if (announce) announce(announcement || (lens.label + ' analysis view applied. ' + lens.detail));
      }

      function openGeographicInvestigationStep(stepId) {
        var step = geographicInvestigationStep(stepId);
        applyGeographicAnalysisLens(step.lens, { geographicInvestigationStep: step.id }, 'Geographic field investigation step ' + (step.index + 1) + ' of ' + step.total + ': ' + step.label + '. ' + step.prompt);
      }

      function setGeographicStudyRadius(radius) {
        var nextRadius = clamp(Number(radius), 2, 50);
        var runtime = geographicRuntimeRef.current;
        if (!runtime || !runtime.map || !d.geographicMapReady) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        if (d.liveWeather) {
          var source = runtime.map.getSource('weather-study-area-source');
          if (source && source.setData) source.setData(geographicOverlayData(d.liveWeather, nextRadius).studyArea);
        }
        update({ geographicStudyRadius: nextRadius });
        if (announce) announce('Geographic study area changed to ' + nextRadius + ' kilometers.');
      }

      function setGeographicTerrainExaggeration(exaggeration) {
        var nextExaggeration = clamp(Number(exaggeration), 1, 2);
        var runtime = geographicRuntimeRef.current;
        if (!runtime || !runtime.map || !d.geographicMapReady) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        if (d.geographicTerrainAvailable === false || !runtime.map.getSource('weather-terrain')) {
          if (addToast) addToast('3D terrain is unavailable, but the open base map remains usable.', 'info');
          if (announce) announce('Terrain emphasis is unavailable because the terrain layer did not load.');
          return;
        }
        runtime.map.setTerrain({ source: 'weather-terrain', exaggeration: nextExaggeration });
        update({ geographicTerrainExaggeration: nextExaggeration });
        if (announce) announce('Terrain emphasis changed to ' + nextExaggeration + ' times elevation.');
      }

      function setGeographicOverlayVisibility(kind, visible) {
        var nextVisible = !!visible;
        var runtime = geographicRuntimeRef.current;
        if (!runtime || !runtime.map || !d.geographicMapReady) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        var layerIds = kind === 'studyArea'
          ? ['weather-study-area-fill', 'weather-study-area-outline']
          : kind === 'transect'
            ? ['weather-terrain-transect-line']
            : ['weather-wind-flow', 'weather-wind-arrow', 'weather-wind-endpoint'];
        layerIds.forEach(function (layerId) {
          if (runtime.map.getLayer(layerId)) runtime.map.setLayoutProperty(layerId, 'visibility', nextVisible ? 'visible' : 'none');
        });
        var patch = { geographicAnalysisLens: 'custom', geographicInvestigationPaused: true };
        if (kind === 'studyArea') patch.geographicStudyAreaVisible = nextVisible;
        else if (kind === 'transect') patch.geographicTransectVisible = nextVisible;
        else patch.geographicWindVisible = nextVisible;
        update(patch);
        var label = kind === 'studyArea' ? 'Study-area ring' : kind === 'transect' ? 'Wind-aligned terrain transect' : 'Live wind vector';
        if (announce) announce(label + (nextVisible ? ' shown.' : ' hidden.'));
      }

      function useGeographicTerrainEvidence() {
        var analysis = analyzeGeographicTerrainProfile(d.geographicTerrainProfile);
        if (!analysis || !d.liveWeather) {
          if (addToast) addToast('Wait for the terrain profile to finish sampling.', 'info');
          if (announce) announce('Terrain evidence is still being prepared.');
          return;
        }
        var evidence = (d.evidence || []).slice();
        var selected = evidence.indexOf(TERRAIN_EVIDENCE.id) !== -1;
        var investigationNote = String(d.geographicInvestigationNote || '').trim().slice(0, 2000);
        if (selected && d.geographicTerrainEvidence && geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, d.liveWeather).current) {
          var existingNote = String(d.geographicTerrainEvidence.investigationNote || investigationNote).trim();
          var forecastPatch = { tab: 'forecast' };
          if (existingNote && !String(d.reasoning || '').trim()) forecastPatch.reasoning = existingNote;
          update(forecastPatch);
          if (announce) announce('Forecast Mission opened with terrain evidence and the mapped evidence note carried forward.');
          return;
        }
        if (!selected) evidence.push(TERRAIN_EVIDENCE.id);
        var geographic = geographicViewState(d);
        var evidencePatch = {
          evidence: evidence,
          forecastResult: null,
          terrainEvidenceInvalidatedMessage: '',
          geographicTerrainEvidence: {
            id: TERRAIN_EVIDENCE.id,
            label: TERRAIN_EVIDENCE.label,
            location: geographic.label,
            latitude: d.liveWeather.latitude,
            longitude: d.liveWeather.longitude,
            observedAt: d.liveWeather.observedAt || '',
            upwindDirection: cardinal(d.liveWeather.windDir),
            downwindDirection: cardinal((Number(d.liveWeather.windDir) + 180) % 360),
            relief: analysis.relief,
            riseToSite: analysis.riseToSite,
            changeAfterSite: analysis.changeAfterSite,
            signalLabel: analysis.signalLabel,
            summary: analysis.interpretation,
            investigationNote: investigationNote,
            source: 'Rendered open terrain elevation and learner field note'
          }
        };
        if (investigationNote && !String(d.reasoning || '').trim()) evidencePatch.reasoning = investigationNote;
        update(evidencePatch);
        if (addToast) addToast('Terrain profile added to forecast evidence.', 'success');
        if (announce) announce('Wind-aligned terrain profile added to forecast evidence.');
      }

      function setGeographicBuildings(visible) {
        var nextVisible = !!visible;
        var runtime = geographicRuntimeRef.current;
        if (!runtime || !runtime.map || !d.geographicMapReady) {
          if (addToast) addToast('The geographic map is still initializing.', 'info');
          return;
        }
        var buildingLayerIds = runtime.buildingLayerIds || geographicBuildingLayerIds(runtime.map.getStyle && runtime.map.getStyle());
        if (!buildingLayerIds.length) {
          update({ geographicBuildings: false, geographicBuildingsAvailable: false });
          if (addToast) addToast('This map style does not provide a compatible 3D building layer.', 'info');
          if (announce) announce('Real 3D buildings are unavailable in the current map style.');
          return;
        }
        runtime.buildingLayerIds = buildingLayerIds;
        buildingLayerIds.forEach(function (layerId) {
          if (runtime.map.getLayer(layerId)) runtime.map.setLayoutProperty(layerId, 'visibility', nextVisible ? 'visible' : 'none');
        });
        update({ geographicBuildings: nextVisible, geographicBuildingsAvailable: true, geographicAnalysisLens: 'custom', geographicInvestigationPaused: true });
        if (announce) announce('Real 3D buildings ' + (nextVisible ? 'shown.' : 'hidden.') + ' Analysis view is now custom and the guided investigation is paused.');
      }

      function sampleGeographicMapCenter() {
        var runtime = geographicRuntimeRef.current;
        if (!runtime || !runtime.map || !runtime.sampleTerrainAtCoordinate || !d.geographicMapReady || d.geographicTerrainAvailable === false) {
          if (addToast) addToast('Terrain sampling becomes available after the 3D terrain layer loads.', 'info');
          return;
        }
        var center = runtime.map.getCenter && runtime.map.getCenter();
        if (!center || !runtime.sampleTerrainAtCoordinate([Number(center.lng), Number(center.lat)], 'Keyboard map-center sample')) {
          if (addToast) addToast('Terrain elevation is not available at the map center yet.', 'info');
        }
      }

      function clearGeographicTerrainProbe() {
        var runtime = geographicRuntimeRef.current;
        if (runtime && runtime.map) {
          var source = runtime.map.getSource('weather-terrain-probe');
          if (source && source.setData) source.setData({ type: 'FeatureCollection', features: [] });
        }
        update({ geographicTerrainProbe: null });
        if (announce) announce('Terrain comparison point cleared.');
      }

      function applyImmersiveFocus(focus) {
        var focusState = immersiveFocusProfile(focus);
        var labels = {
          system: 'Full atmospheric system',
          front: 'Front dynamics',
          moisture: 'Moisture and precipitation',
          stations: 'Surface observations'
        };
        var nextFocus = focusState.id;
        var runtime = immersiveRuntimeRef.current;
        if (runtime && runtime.layerGroups) {
          Object.keys(focusState.layers).forEach(function (key) {
            var object = runtime.layerGroups[key];
            if (object) object.visible = focusState.layers[key];
          });
        }
        update({ immersiveFocus: nextFocus });
        if (announce) announce('3D analysis focus changed to ' + labels[nextFocus] + '.');
      }

function openImmersiveTourStep(stepId) {
        var step = immersiveTourStep(stepId);
        update({ immersiveTourStep: step.id });
        applyImmersiveFocus(step.focus);
        if (immersiveRuntimeRef.current && immersiveRuntimeRef.current.camera) setImmersiveCameraPreset(step.camera);
        else update({ immersiveCameraPreset: step.camera });
        if (announce) announce('Immersive investigation step ' + (step.index + 1) + ' of ' + step.total + ': ' + step.label + '. ' + step.prompt);
      }

      function setValue(key, value) {
        var patch = { modelAdjusted: true };
        patch[key] = value;
        update(patch);
      }

      function applyScenario(id) {
        var next = scenarioById(id);
        update({
          scenario: next.id,
          temp: next.temp,
          humidity: next.humidity,
          pressure: next.pressure,
          windSpeed: next.windSpeed,
          windDir: next.windDir,
          frontSpeed: next.frontSpeed,
          instability: next.instability,
          terrain: next.terrain,
          simHour: 0,
          forecastResult: null,
          predictionPrecip: '',
          predictionTiming: '',
          predictionHazard: '',
          readinessAction: '',
          forecastConfidence: '',
          reasoning: '',
          evidence: [],
          lensEvidence: [],
          carriedEvidence: null,
          changeLensViewed: false,
          forecastHistory: [],
          observationLog: [],
          teacherRatings: {},
          teacherConferenceNote: '',
          reflectionShift: '',
          reflectionReadiness: '',
          reflectionQuestion: '',
          reflectionSubmitted: false,
          reasoningPulseResponses: {},
          peerReviewStrength: '',
          peerReviewMove: '',
          peerReviewFeedback: '',
          peerReviewSubmitted: false,
          boundaryGuess: '',
          boundaryResult: null,
          experimentVariable: 'humidity',
          experimentValue: clamp(next.humidity + 16, 10, 100),
          experimentPrediction: '',
          experimentResult: null
        });
        if (announce) announce('Loaded scenario: ' + next.name + '. ' + next.summary);
      }

      function viewStation(id) {
        var viewed = Object.assign({}, d.stationsViewed || {});
        viewed[id] = true;
        update({ selectedStation: id, stationsViewed: viewed });
        var chosen = STATIONS.filter(function (item) { return item.id === id; })[0];
        if (announce && chosen) announce('Selected observation station ' + chosen.name + '.');
      }

      function logObservation() {
        var log = (d.observationLog || []).slice();
        log.push({
          id: selectedStation + '-' + state.simHour + '-' + log.length,
          station: observation.name,
          hour: state.simHour,
          temperature: observation.temperature,
          dewPoint: observation.dewPoint,
          pressure: observation.seaLevelPressure,
          wind: cardinal(observation.windDir) + ' ' + observation.windSpeed + ' km/h',
          cloudCover: observation.cloudCover
        });
        if (log.length > 8) log = log.slice(log.length - 8);
        update({ observationLog: log });
        if (addToast) addToast('Observation logged at ' + observation.name + '.', 'success');
        if (announce) announce('Logged observation at ' + observation.name + ' for model hour ' + state.simHour + '.');
      }

      function advance(hours) {
        var nextHour = clamp(state.simHour + hours, 0, 24);
        update({ simHour: nextHour, timeAdvanced: true });
        if (announce) announce('Model advanced to ' + nextHour + ' hours.');
      }

      function toggleEvidence(id) {
        var evidence = (d.evidence || []).slice();
        var index = evidence.indexOf(id);
        if (index === -1) evidence.push(id); else evidence.splice(index, 1);
        update({ evidence: evidence });
      }

      function checkBoundaryGuess() {
        if (!d.boundaryGuess) {
          if (addToast) addToast('Choose the station pair with the strongest boundary signal.', 'warning');
          if (announce) announce('Choose a station pair before checking the boundary.');
          return;
        }
        var analysis = stationNetworkAnalysis(state);
        var correct = d.boundaryGuess === analysis.strongest.id;
        update({ boundaryResult: { guess: d.boundaryGuess, correct: correct }, boundaryDetected: correct || !!d.boundaryDetected });
        if (correct && !d.boundaryDetected && ctx.awardXP) ctx.awardXP('weatherSystems', 8, 'Air-mass boundary analysis');
        if (addToast) addToast(correct ? 'Boundary supported by the station evidence.' : 'Compare the temperature, dew point, pressure, and wind contrasts again.', correct ? 'success' : 'info');
        if (announce) announce(correct ? 'Boundary supported by the station network.' : 'Try again. The strongest contrast is between ' + analysis.strongest.left.name + ' and ' + analysis.strongest.right.name + '.');
      }

      function issueForecast() {
        var terrainEvidenceStatus = geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, d.liveWeather);
        if ((d.evidence || []).indexOf(TERRAIN_EVIDENCE.id) !== -1 && !terrainEvidenceStatus.current) {
          if (addToast) addToast('Refresh or remove stale terrain evidence before verifying the forecast.', 'warning');
          if (announce) announce('Forecast verification paused because the selected terrain evidence does not match the active live observation.');
          return;
        }
        var reasoningTarget = band === 'K-2' ? 10 : 20;
        var reasoningText = (d.reasoning || '').trim();
        if (!d.predictionPrecip || !d.predictionTiming || !d.predictionHazard || !d.readinessAction || !d.forecastConfidence || reasoningText.length < reasoningTarget) {
          if (addToast) addToast('Complete the forecast choices and explain your reasoning before verification.', 'warning');
          if (announce) announce('Forecast incomplete. Complete precipitation, timing, hazard, school action, confidence, and the reasoning note.');
          return;
        }
        var result = scoreForecast(state, {
          precip: d.predictionPrecip,
          timing: d.predictionTiming,
          hazard: d.predictionHazard,
          action: d.readinessAction,
          confidence: Number(d.forecastConfidence),
          evidence: d.evidence || []
        });
        var issued = (d.forecastsIssued || 0) + 1;
        var best = Math.max(d.bestForecast || 0, result.score);
        var history = (d.forecastHistory || []).slice();
        history.push({
          attempt: issued,
          score: result.score,
          precip: d.predictionPrecip,
          timing: d.predictionTiming,
          hazard: d.predictionHazard,
          action: d.readinessAction,
          confidence: Number(d.forecastConfidence),
          evidenceCount: (d.evidence || []).length,
          reasoning: reasoningText,
          modelHour: state.simHour
        });
        if (history.length > 5) history = history.slice(history.length - 5);
        update({ forecastResult: result, forecastsIssued: issued, bestForecast: best, forecastHistory: history, reflectionSubmitted: false, peerReviewSubmitted: false });
        if (ctx.awardXP) ctx.awardXP('weatherSystems', result.score >= 80 ? 15 : 5, 'Weather forecast');
        if (result.score >= 80 && ctx.celebrate) ctx.celebrate();
        if (addToast) addToast('Forecast verified: ' + result.score + '/100', result.score >= 80 ? 'success' : 'info');
        if (announce) announce('Forecast score ' + result.score + ' out of 100. ' + result.notes.join(' '));
      }

      function performExperiment() {
        if (!d.experimentPrediction) {
          if (addToast) addToast('Predict the effect on precipitation potential before running the test.', 'warning');
          if (announce) announce('Choose whether precipitation potential will increase, decrease, or stay close.');
          return;
        }
        var result = runExperiment(state, experimentVariable, experimentValue, d.experimentHour != null ? Number(d.experimentHour) : 6);
        result.prediction = d.experimentPrediction;
        result.predictionCorrect = result.prediction === result.direction;
        var runs = (d.experimentsRun || 0) + 1;
        update({ experimentResult: result, experimentsRun: runs, experimentCompleted: true });
        if (!d.experimentCompleted && ctx.awardXP) ctx.awardXP('weatherSystems', 8, 'Controlled weather experiment');
        if (addToast) addToast(result.predictionCorrect ? 'Prediction supported by the model.' : 'The model produced a different result?revise your explanation.', result.predictionCorrect ? 'success' : 'info');
        if (announce) announce('Controlled test complete. Precipitation potential changed by ' + result.deltas.precipPotential + ' percentage points.');
      }

      React.useEffect(function () {
        var frame = 0;
        var started = Date.now();
        var reduce = false;
        try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduce = false; }
        function draw() {
          drawWeatherScene(canvasRef.current, state, scenario, selectedStation, state.motion && !reduce ? Date.now() - started : 0, dark);
          if (state.motion && !reduce) frame = window.requestAnimationFrame(draw);
        }
        draw();
        return function () { if (frame) window.cancelAnimationFrame(frame); };
      }, [state.scenario, state.temp, state.humidity, state.pressure, state.windSpeed, state.windDir, state.frontSpeed, state.instability, state.terrain, state.simHour, state.radar, state.fronts, state.windLayer, state.motion, selectedStation, dark]);

      React.useEffect(function () {
        if ((d.tab || 'map') !== 'immersive' || geographicViewState(d).mode === 'geographic') return undefined;
        var canvas = immersiveCanvasRef.current;
        var THREE = window.THREE;
        if (!canvas || !THREE || !dataRoot._threeLoaded) return undefined;
        var live = d.immersiveDataSource === 'live' ? d.liveWeather : null;
        var model = projectConditions(state, state.simHour);
        var temperature = live ? live.temperature : model.temperature;
        var humidity = live ? live.humidity : model.humidity;
        var pressure = live ? live.pressure : model.pressure;
        var windSpeed = live ? live.windSpeed : model.windSpeed;
        var windDir = live ? live.windDir : model.windDir;
        var cloudCover = live ? live.cloudCover : model.cloudCover;
        var precipitation = live ? live.precipitation : (model.precipPotential >= 45 ? model.precipPotential / 35 : 0);
        var weatherCode = live ? live.weatherCode : (model.precipType === 'storms' ? 95 : model.precipType === 'snow' ? 73 : model.precipType === 'rain' ? 63 : 2);
        var geography = geographyProfile(d.immersiveGeography, state.scenario);
        var reduceMotion = false;
        try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduceMotion = false; }
        var quality = d.immersiveQuality || 'high';
        var qualityProfiles = {
          performance: { pixelRatio: 1, terrainX: 22, terrainY: 16, cloudPuffs: 4, maxClouds: 10, maxParticles: 720, shadows: false },
          balanced: { pixelRatio: 1.5, terrainX: 34, terrainY: 26, cloudPuffs: 5, maxClouds: 14, maxParticles: 1500, shadows: true },
          high: { pixelRatio: 2, terrainX: 48, terrainY: 36, cloudPuffs: 6, maxClouds: 18, maxParticles: 2400, shadows: true }
        };
        var profile = qualityProfiles[quality] || qualityProfiles.high;
        var width = Math.max(320, canvas.clientWidth || 960);
        var height = Math.max(360, canvas.clientHeight || 580);
        var scene = new THREE.Scene();
        var stormy = weatherCode >= 51 || precipitation > 0;
        scene.background = new THREE.Color(stormy ? 0x111827 : cloudCover > 65 ? 0x334155 : 0x0c4a6e);
        scene.fog = new THREE.FogExp2(stormy ? 0x1e293b : 0x7dd3fc, stormy ? 0.022 : 0.011);
        var camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 180);
        camera.position.set(18, 12, 22);
        camera.lookAt(0, 4, 0);
        var renderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: quality !== 'performance', alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: quality === 'high' });
        } catch (error) {
          update({ immersiveRenderError: 'WebGL could not start. The Canvas 2D map remains available.' });
          return undefined;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatio));
        renderer.setSize(width, height, false);
        if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
        if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = stormy ? 0.92 : 1.08;
        renderer.shadowMap.enabled = profile.shadows;
        renderer.shadowMap.type = THREE.VSMShadowMap || THREE.PCFSoftShadowMap;
        renderer.sortObjects = true;
        renderer.xr.enabled = true;
        if (renderer.xr.setReferenceSpaceType) renderer.xr.setReferenceSpaceType('local-floor');
        immersiveRuntimeRef.current = { renderer: renderer, scene: scene, camera: camera, controls: null, cameraTransition: null, layerGroups: null, reduceMotion: reduceMotion, THREE: THREE, quality: quality };

        var skyUniforms = {
          topColor: { value: new THREE.Color(stormy ? 0x111827 : 0x075985) },
          horizonColor: { value: new THREE.Color(stormy ? 0x475569 : 0x7dd3fc) },
          groundColor: { value: new THREE.Color(stormy ? 0x172033 : 0xdbeafe) },
          offset: { value: 6.0 },
          exponent: { value: stormy ? 0.72 : 0.48 }
        };
        var sky = new THREE.Mesh(
          new THREE.SphereGeometry(92, quality === 'performance' ? 20 : 36, quality === 'performance' ? 12 : 20),
          new THREE.ShaderMaterial({
            uniforms: skyUniforms,
            vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y; float skyMix = pow(max(h, 0.0), exponent); vec3 upper = mix(horizonColor, topColor, skyMix); vec3 finalColor = mix(groundColor, upper, smoothstep(-0.18, 0.08, h)); gl_FragColor = vec4(finalColor, 1.0); }',
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
          })
        );
        scene.add(sky);

        var hemisphere = new THREE.HemisphereLight(stormy ? 0x94a3b8 : 0xbae6fd, 0x183c32, stormy ? 0.72 : 0.96);
        scene.add(hemisphere);
        var sun = new THREE.DirectionalLight(stormy ? 0xc7d2fe : 0xfff7d6, stormy ? 1.0 : 1.75);
        sun.position.set(-14, 24, 12);
        sun.castShadow = profile.shadows;
        if (sun.shadow) {
          sun.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
          sun.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
          sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
          sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -18;
          sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
          sun.shadow.bias = -0.00035;
          sun.shadow.normalBias = 0.025;
        }
        scene.add(sun);
        var rim = new THREE.DirectionalLight(0x67e8f9, stormy ? 0.46 : 0.32);
        rim.position.set(18, 8, -16); scene.add(rim);
        scene.add(new THREE.AmbientLight(stormy ? 0x334155 : 0x64748b, 0.22));

        var groundGeo = new THREE.PlaneGeometry(44, 34, profile.terrainX, profile.terrainY);
        var positions = groundGeo.attributes.position;
        for (var vertex = 0; vertex < positions.count; vertex += 1) {
          var vx = positions.getX(vertex); var vy = positions.getY(vertex);
var ridgeLift = geography.ridge * 2.15 * Math.exp(-Math.pow((vx + 13) / 5.2, 2));
          var riverCut = geography.river * 0.62 * Math.exp(-Math.pow(vy - Math.sin(vx * 0.28) * 3.1, 2) / 7);
          var coastalShelf = geography.coast * Math.max(0, vx - 10) * 0.08;
          var urbanGrade = geography.urban * 0.24 * Math.exp(-(Math.pow(vx - 2, 2) + Math.pow(vy - 2, 2)) / 58);
          var elevation = Math.sin(vx * 0.28) * 0.45 + Math.cos(vy * 0.34) * 0.34 + Math.max(0, vx + 8) * state.terrain * 0.0022 * geography.terrainBoost + ridgeLift + urbanGrade - riverCut - coastalShelf;
          positions.setZ(vertex, elevation);
        }
        positions.needsUpdate = true;
        groundGeo.computeVertexNormals();
        var groundMat = new THREE.MeshStandardMaterial({ color: stormy ? 0x285142 : geography.color, roughness: 0.82, metalness: 0.03, flatShading: false });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2; ground.position.y = -0.8; ground.receiveShadow = true;
        scene.add(ground);
        var grid = new THREE.GridHelper(40, 20, 0x38bdf8, 0x164e63);
        grid.position.y = -0.66; grid.material.transparent = true; grid.material.opacity = 0.18;
        scene.add(grid);
var geographyGroup = new THREE.Group();
        geographyGroup.name = 'Geographic base map';
        if (geography.coast > 0) {
          var water = new THREE.Mesh(new THREE.PlaneGeometry(14, 34, 1, 1), new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5, metalness: 0.08, transparent: true, opacity: 0.78 }));
          water.rotation.x = -Math.PI / 2;
          water.position.set(16.2, -0.62, 0);
          water.receiveShadow = true;
          geographyGroup.add(water);
          var shore = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.74 }));
          shore.position.set(9.45, -0.52, 0);
          geographyGroup.add(shore);
        }
        if (geography.river > 0) {
          var riverPoints = [];
          for (var r = 0; r < 15; r += 1) {
            var rx = -20 + r * (40 / 14);
            riverPoints.push(new THREE.Vector3(rx, -0.48, Math.sin(rx * 0.28) * 3.1));
          }
          var river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPoints), 40, 0.08 + geography.river * 0.05, 8, false), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 }));
          geographyGroup.add(river);
        }
        if (geography.ridge > 0.4) {
          for (var ridgeIndex = 0; ridgeIndex < 7; ridgeIndex += 1) {
            var peak = new THREE.Mesh(new THREE.ConeGeometry(1.1 + ridgeIndex * 0.05, 2.2 + geography.ridge * 1.4, 4), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.02 }));
            peak.position.set(-15 + ridgeIndex * 2.2, 0.55 + ridgeIndex * 0.02, -10 + (ridgeIndex % 3) * 6.5);
            peak.rotation.y = Math.PI / 4;
            peak.castShadow = profile.shadows;
            geographyGroup.add(peak);
          }
        }
        if (geography.urban > 0.5) {
          for (var blockIndex = 0; blockIndex < 18; blockIndex += 1) {
            var heightBlock = 0.35 + ((blockIndex * 7) % 9) * 0.11;
            var building = new THREE.Mesh(new THREE.BoxGeometry(0.62, heightBlock, 0.82), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.66, metalness: 0.08 }));
            building.position.set(-2 + (blockIndex % 6) * 0.9, -0.35 + heightBlock / 2, 1.5 + Math.floor(blockIndex / 6) * 1.05);
            building.castShadow = profile.shadows;
            geographyGroup.add(building);
          }
        }
        scene.add(geographyGroup);

        var airMassGroup = new THREE.Group();
        airMassGroup.name = 'Air masses';
        var coolMass = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 22), new THREE.MeshPhongMaterial({ color: 0x2563eb, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
        coolMass.position.set(-11, 3.2, 0); airMassGroup.add(coolMass);
        var warmMass = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 22), new THREE.MeshPhongMaterial({ color: 0xf97316, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false }));
        warmMass.position.set(11, 3.2, 0); airMassGroup.add(warmMass);
        scene.add(airMassGroup);
        var frontMat = new THREE.MeshPhongMaterial({ color: scenario.frontType === 'warm' ? 0xef4444 : scenario.frontType === 'occluded' ? 0xa855f7 : 0x38bdf8, transparent: true, opacity: scenario.frontType === 'none' ? 0.08 : 0.38, side: THREE.DoubleSide, depthWrite: false });
        var frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(27, 11), frontMat);
        frontPlane.position.set(-3 + state.simHour * state.frontSpeed * 0.025, 4.4, 0);
        frontPlane.rotation.y = Math.PI / 2.8; frontPlane.rotation.z = -0.18;
        var frontOutline = new THREE.LineSegments(new THREE.EdgesGeometry(frontPlane.geometry), new THREE.LineBasicMaterial({ color: scenario.frontType === 'warm' ? 0xfca5a5 : scenario.frontType === 'occluded' ? 0xd8b4fe : 0x7dd3fc, transparent: true, opacity: scenario.frontType === 'none' ? 0.2 : 0.78 }));
        frontPlane.add(frontOutline);
        scene.add(frontPlane);

        var cloudGroup = new THREE.Group();
        var cloudMaterial = new THREE.MeshStandardMaterial({ color: stormy ? 0x94a3b8 : 0xf8fafc, transparent: true, opacity: stormy ? 0.8 : 0.76, roughness: 0.96, metalness: 0, depthWrite: false });
        var cloudGeometry = new THREE.SphereGeometry(1, quality === 'performance' ? 12 : 20, quality === 'performance' ? 8 : 14);
        var cloudCount = Math.max(2, Math.min(profile.maxClouds, Math.round(cloudCover / 7)));
        for (var cloudIndex = 0; cloudIndex < cloudCount; cloudIndex += 1) {
          var cluster = new THREE.Group();
          for (var puff = 0; puff < profile.cloudPuffs; puff += 1) {
            var cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloudMesh.scale.set(1.5 + puff * 0.18, 0.72 + (puff % 2) * 0.18, 1.05);
            cloudMesh.position.set((puff - 1.5) * 1.1, Math.sin(puff * 1.7) * 0.45, (puff % 2) * 0.65);
            cluster.add(cloudMesh);
          }
          cluster.position.set(-17 + (cloudIndex * 7.1) % 34, 6.2 + (cloudIndex % 3) * 1.4, -10 + (cloudIndex * 5.3) % 20);
          cluster.userData.speed = 0.0015 + windSpeed * 0.000035;
          cloudGroup.add(cluster);
        }
        scene.add(cloudGroup);

        var precipitationPoints = null;
        if (precipitation > 0 || weatherCode >= 51) {
          var particleCount = Math.min(profile.maxParticles, Math.max(220, Math.round(precipitation * 300 + cloudCover * 8)));
          var particlePositions = new Float32Array(particleCount * 3);
          for (var particle = 0; particle < particleCount; particle += 1) {
            particlePositions[particle * 3] = -18 + ((particle * 47) % 360) / 10;
            particlePositions[particle * 3 + 1] = 1 + ((particle * 83) % 100) / 10;
            particlePositions[particle * 3 + 2] = -12 + ((particle * 61) % 240) / 10;
          }
          var particleGeo = new THREE.BufferGeometry();
          particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
          var snowing = weatherCode >= 71 && weatherCode <= 86;
          var particleMat = new THREE.PointsMaterial({ color: snowing ? 0xf8fafc : 0x7dd3fc, size: snowing ? 0.12 : 0.075, transparent: true, opacity: 0.78, depthWrite: false });
          precipitationPoints = new THREE.Points(particleGeo, particleMat);
          scene.add(precipitationPoints);
        }

        var windGroup = new THREE.Group();
        windGroup.name = 'Wind vectors';
        var windRadians = (windDir - 90) * Math.PI / 180;
        for (var arrowIndex = 0; arrowIndex < 12; arrowIndex += 1) {
          var direction = new THREE.Vector3(Math.cos(windRadians), 0.08, Math.sin(windRadians)).normalize();
          var origin = new THREE.Vector3(-15 + (arrowIndex * 5.7) % 30, 1.2 + (arrowIndex % 3) * 1.25, -9 + (arrowIndex * 4.1) % 18);
          var arrow = new THREE.ArrowHelper(direction, origin, 1.8 + windSpeed * 0.055, 0x67e8f9, 0.45, 0.25);
          windGroup.add(arrow);
        }
        scene.add(windGroup);

        var stationsGroup = new THREE.Group();
        stationsGroup.name = 'Observation stations';
        STATIONS.forEach(function (stationItem, stationIndex) {
          var selected = stationItem.id === selectedStation;
          var stationX = (stationItem.x - 0.5) * 32;
          var stationZ = (stationItem.y - 0.5) * 23;
          var stationGroup = new THREE.Group();
          stationGroup.position.set(stationX, 0.1, stationZ);
          stationGroup.userData.station = stationItem.name;
          var marker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 1.5, 12), new THREE.MeshStandardMaterial({ color: selected ? 0xfbbf24 : 0xf8fafc, emissive: selected ? 0x92400e : 0x0f172a, emissiveIntensity: selected ? 0.72 : 0.16, roughness: 0.35, metalness: 0.42 }));
          marker.castShadow = profile.shadows;
          marker.position.y = 0.7;
          stationGroup.add(marker);
          var stationRing = new THREE.Mesh(new THREE.RingGeometry(selected ? 0.62 : 0.45, selected ? 0.78 : 0.56, 28), new THREE.MeshBasicMaterial({ color: selected ? 0xfbbf24 : 0xbae6fd, transparent: true, opacity: selected ? 0.92 : 0.5, side: THREE.DoubleSide, depthWrite: false }));
          stationRing.rotation.x = -Math.PI / 2;
          stationRing.position.y = -0.04;
          stationGroup.add(stationRing);
          if (selected && quality !== 'performance') {
            var beacon = new THREE.PointLight(0xfbbf24, 0.85, 6, 2);
            beacon.position.y = 1.8;
            stationGroup.add(beacon);
          }
          stationsGroup.add(stationGroup);
        });
        scene.add(stationsGroup);

        var focusState = immersiveFocusProfile(d.immersiveFocus);
        var layerGroups = {
          airMasses: airMassGroup,
          front: frontPlane,
          clouds: cloudGroup,
          precipitation: precipitationPoints,
          wind: windGroup,
          stations: stationsGroup,
          geography: geographyGroup
        };
        Object.keys(focusState.layers).forEach(function (key) {
          if (layerGroups[key]) layerGroups[key].visible = focusState.layers[key];
        });
        immersiveRuntimeRef.current.layerGroups = layerGroups;

        var controls = null;
        if (THREE.OrbitControls) {
          controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.065;
          controls.enablePan = true;
          controls.screenSpacePanning = true;
          controls.target.set(0, 3.2, 0);
          controls.minDistance = 7;
          controls.maxDistance = 62;
          controls.minPolarAngle = 0.12;
          controls.maxPolarAngle = Math.PI * 0.49;
          if ('zoomToCursor' in controls) controls.zoomToCursor = true;
        }
        immersiveRuntimeRef.current.controls = controls;
        var clock = new THREE.Clock();
        renderer.setAnimationLoop(function () {
          var delta = Math.min(0.05, clock.getDelta());
          if (!reduceMotion) {
            cloudGroup.children.forEach(function (cluster) {
              cluster.position.x += cluster.userData.speed * delta * 1000;
              if (cluster.position.x > 20) cluster.position.x = -20;
            });
            if (precipitationPoints) {
              var attrs = precipitationPoints.geometry.attributes.position;
              for (var p = 0; p < attrs.count; p += 1) {
                var py = attrs.getY(p) - delta * (weatherCode >= 71 && weatherCode <= 86 ? 1.4 : 7.5);
                attrs.setY(p, py < -0.6 ? 10 : py);
              }
              attrs.needsUpdate = true;
            }
          }
          var runtime = immersiveRuntimeRef.current;
          var transition = runtime && runtime.cameraTransition;
          if (transition) {
            var elapsed = Math.min(1, (Date.now() - transition.started) / transition.duration);
            var eased = elapsed < 0.5 ? 4 * elapsed * elapsed * elapsed : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
            camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
            if (controls) controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
            if (elapsed >= 1) runtime.cameraTransition = null;
          }
          if (controls) controls.update();
          renderer.render(scene, camera);
        });
        function resizeImmersiveScene() {
          var nextWidth = Math.max(320, canvas.clientWidth || 960);
          var nextHeight = Math.max(360, canvas.clientHeight || 580);
          camera.aspect = nextWidth / nextHeight; camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight, false);
        }
        window.addEventListener('resize', resizeImmersiveScene);
        var resizeObserver = window.ResizeObserver ? new window.ResizeObserver(resizeImmersiveScene) : null;
        if (resizeObserver) resizeObserver.observe(canvas);
        update({ immersiveRenderError: '', immersiveSceneReady: true, immersiveActiveQuality: quality });
        return function () {
          window.removeEventListener('resize', resizeImmersiveScene);
          if (resizeObserver) resizeObserver.disconnect();
          renderer.setAnimationLoop(null);
          var session = renderer.xr && renderer.xr.getSession ? renderer.xr.getSession() : null;
          if (session && session.end) { try { session.end(); } catch (e) { } }
          if (controls && controls.dispose) controls.dispose();
          scene.traverse(function (object) {
            if (object.geometry && object.geometry.dispose) object.geometry.dispose();
            if (object.material) {
              var materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach(function (material) { if (material && material.dispose) material.dispose(); });
            }
          });
          renderer.dispose();
          immersiveRuntimeRef.current = null;
        };
      }, [d.tab, d.immersiveSceneMode, dataRoot._threeLoaded, d.immersiveDataSource, d.immersiveQuality, d.liveWeather && d.liveWeather.observedAt, state.scenario, state.simHour, state.temp, state.humidity, state.pressure, state.windSpeed, state.windDir, state.terrain, d.immersiveGeography, selectedStation]);

      React.useEffect(function () {
        var geographic = geographicViewState(d);
        if ((d.tab || 'map') !== 'immersive' || geographic.mode !== 'geographic') return undefined;
        var container = geographicMapRef.current;
        if (!container) return undefined;
        var cancelled = false;
        var map = null;
        var mapReady = false;
        var mapLoadTimer = null;
        var mapLoadWarning = '';
        var resizeObserver = null;
        var terrainExaggeration = clamp(d.geographicTerrainExaggeration != null ? Number(d.geographicTerrainExaggeration) : 1.35, 1, 2);
        var studyRadius = clamp(d.geographicStudyRadius != null ? Number(d.geographicStudyRadius) : 10, 2, 50);
        var showStudyArea = d.geographicStudyAreaVisible !== false;
        var showWind = d.geographicWindVisible !== false;
        var showTransect = d.geographicTransectVisible !== false;
        var showBuildings = d.geographicBuildings === true;
        update({ geographicMapLoading: true, geographicMapReady: false, geographicMapError: '', geographicMapStatus: 'Loading open geographic layers...', geographicBuildingsAvailable: null, geographicTerrainAvailable: null, geographicTerrainProfile: [], geographicTerrainProfileStatus: 'Sampling natural terrain elevation after map tiles load...', geographicTerrainProbe: null });

        ensureWeatherMapLibre().then(function (maplibregl) {
          if (cancelled || !geographicMapRef.current) return;
          var weatherCode = d.liveWeather ? Number(d.liveWeather.weatherCode) : 0;
          var precipitation = d.liveWeather ? Number(d.liveWeather.precipitation || 0) : 0;
          var markerColor = weatherCode >= 95 ? '#f59e0b' : precipitation > 0 ? '#38bdf8' : weatherCode <= 1 ? '#facc15' : '#a5b4fc';
          map = new maplibregl.Map({
            container: geographicMapRef.current,
            style: GEOGRAPHIC_MAP_SOURCES.mapStyle,
            center: [geographic.longitude, geographic.latitude],
            zoom: 10.6,
            pitch: 58,
            bearing: -18,
            maxPitch: 85,
            maxZoom: 18,
            cooperativeGestures: true,
            attributionControl: true,
            canvasContextAttributes: { antialias: true }
          });
          geographicRuntimeRef.current = { map: map, maplibregl: maplibregl };
          mapLoadTimer = window.setTimeout(function () {
            if (cancelled || mapReady) return;
            var timeoutMessage = 'The geographic base map did not become ready within 30 seconds.' + (mapLoadWarning ? ' Last map message: ' + mapLoadWarning : ' School network filters may be blocking map tiles.');
            update({ geographicMapLoading: false, geographicMapReady: false, geographicMapError: timeoutMessage, geographicMapStatus: '' });
            if (announce) announce(timeoutMessage);
          }, WEATHER_MAP_READY_TIMEOUT_MS);
          map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'top-right');
          if (maplibregl.FullscreenControl) map.addControl(new maplibregl.FullscreenControl({ container: container.parentElement || container }), 'top-right');
          if (maplibregl.ScaleControl) map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');
          map.on('moveend', function (event) {
            if (cancelled || !map) return;
            var viewportPatch = { geographicViewport: { zoom: round(map.getZoom(), 1), pitch: Math.round(map.getPitch()), bearing: Math.round(map.getBearing()) } };
            if (event && event.originalEvent) {
              viewportPatch.geographicCameraPreset = 'custom';
              viewportPatch.geographicAnalysisLens = 'custom';
              viewportPatch.geographicInvestigationPaused = true;
            }
            update(viewportPatch);
          });

          map.on('load', function () {
            if (cancelled) return;
            mapReady = true;
            if (mapLoadTimer) { window.clearTimeout(mapLoadTimer); mapLoadTimer = null; }
            try {
              var styleLayers = (map.getStyle() && map.getStyle().layers) || [];
              var firstLabel = styleLayers.filter(function (layer) { return layer.type === 'symbol' && layer.layout && layer.layout['text-field']; })[0];
              var terrainAvailable = true;
              var terrainMessage = '';
              try {
                if (!map.getSource('weather-terrain')) map.addSource('weather-terrain', { type: 'raster-dem', url: GEOGRAPHIC_MAP_SOURCES.terrain, tileSize: 256 });
                if (!map.getLayer('weather-hillshade')) {
                  map.addLayer({
                    id: 'weather-hillshade',
                    type: 'hillshade',
                    source: 'weather-terrain',
                    paint: {
                      'hillshade-shadow-color': '#102a43',
                      'hillshade-highlight-color': '#f8fafc',
                      'hillshade-accent-color': '#0f766e',
                      'hillshade-exaggeration': 0.38
                    }
                  }, firstLabel ? firstLabel.id : undefined);
                }
                map.setTerrain({ source: 'weather-terrain', exaggeration: terrainExaggeration });
              } catch (terrainError) {
                terrainAvailable = false;
                terrainMessage = terrainError && terrainError.message ? terrainError.message : 'Terrain tiles could not be initialized.';
              }
              var buildingLayerIds = geographicBuildingLayerIds({ layers: styleLayers });
              geographicRuntimeRef.current.buildingLayerIds = buildingLayerIds;
              buildingLayerIds.forEach(function (layerId) {
                if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', showBuildings ? 'visible' : 'none');
              });
              var overlays = geographicOverlayData(d.liveWeather, studyRadius);
              var terrainTransect = geographicWindTransect(d.liveWeather, 30, 25);
              var locationData = {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: { title: geographic.label },
                  geometry: { type: 'Point', coordinates: [geographic.longitude, geographic.latitude] }
                }]
              };
              map.addSource('weather-study-area-source', { type: 'geojson', data: overlays.studyArea });
              map.addLayer({
                id: 'weather-study-area-fill',
                type: 'fill',
                source: 'weather-study-area-source',
                layout: { visibility: showStudyArea ? 'visible' : 'none' },
                paint: { 'fill-color': markerColor, 'fill-opacity': 0.08 }
              }, firstLabel ? firstLabel.id : undefined);
              map.addLayer({
                id: 'weather-study-area-outline',
                type: 'line',
                source: 'weather-study-area-source',
                layout: { visibility: showStudyArea ? 'visible' : 'none' },
                paint: { 'line-color': markerColor, 'line-opacity': 0.78, 'line-width': 2 }
              }, firstLabel ? firstLabel.id : undefined);
              map.addSource('weather-wind-vector', { type: 'geojson', data: overlays.wind });
              map.addLayer({
                id: 'weather-wind-flow',
                type: 'line',
                source: 'weather-wind-vector',
                filter: ['==', ['geometry-type'], 'LineString'],
                layout: { visibility: showWind ? 'visible' : 'none', 'line-cap': 'round' },
                paint: { 'line-color': '#0ea5e9', 'line-opacity': 0.9, 'line-width': 5, 'line-blur': 0.6 }
              });
              map.addLayer({
                id: 'weather-wind-arrow',
                type: 'symbol',
                source: 'weather-wind-vector',
                filter: ['==', ['get', 'kind'], 'arrow'],
                layout: {
                  visibility: showWind ? 'visible' : 'none',
                  'text-field': '\u25B2',
                  'text-size': 18,
                  'text-rotate': ['get', 'direction'],
                  'text-rotation-alignment': 'map',
                  'text-allow-overlap': true,
                  'text-ignore-placement': true
                },
                paint: { 'text-color': '#e0f2fe', 'text-halo-color': '#0369a1', 'text-halo-width': 1.5 }
              });
              map.addLayer({
                id: 'weather-wind-endpoint',
                type: 'circle',
                source: 'weather-wind-vector',
                filter: ['==', ['get', 'kind'], 'endpoint'],
                layout: { visibility: showWind ? 'visible' : 'none' },
                paint: { 'circle-radius': 6, 'circle-color': '#0ea5e9', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
              });
              map.addSource('weather-terrain-transect', { type: 'geojson', data: terrainTransect });
              map.addLayer({
                id: 'weather-terrain-transect-line',
                type: 'line',
                source: 'weather-terrain-transect',
                layout: { visibility: showTransect ? 'visible' : 'none', 'line-cap': 'round' },
                paint: { 'line-color': '#c4b5fd', 'line-opacity': 0.9, 'line-width': 2.5, 'line-dasharray': [2, 2] }
              }, firstLabel ? firstLabel.id : undefined);
              map.addSource('weather-selected-location', { type: 'geojson', data: locationData });
              map.addLayer({
                id: 'weather-selected-site-halo',
                type: 'circle',
                source: 'weather-selected-location',
                paint: {
                  'circle-radius': 15,
                  'circle-color': markerColor,
                  'circle-opacity': 0.2,
                  'circle-blur': 0.45
                }
              });
              map.addLayer({
                id: 'weather-selected-site',
                type: 'circle',
                source: 'weather-selected-location',
                paint: {
                  'circle-radius': 7,
                  'circle-color': markerColor,
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 3,
                  'circle-blur': 0.04
                }
              });
              map.addSource('weather-terrain-probe', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
              map.addLayer({
                id: 'weather-terrain-probe-connector',
                type: 'line',
                source: 'weather-terrain-probe',
                filter: ['==', ['geometry-type'], 'LineString'],
                layout: { 'line-cap': 'round' },
                paint: { 'line-color': '#fb7185', 'line-opacity': 0.88, 'line-width': 2, 'line-dasharray': [1.5, 1.5] }
              });
              map.addLayer({
                id: 'weather-terrain-probe-point',
                type: 'circle',
                source: 'weather-terrain-probe',
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#fb7185',
                  'circle-stroke-color': '#ffffff',
                  'circle-stroke-width': 2
                }
              });
              map.addLayer({
                id: 'weather-terrain-probe-label',
                type: 'symbol',
                source: 'weather-terrain-probe',
                filter: ['==', ['geometry-type'], 'Point'],
                layout: {
                  'text-field': ['concat', ['to-string', ['get', 'elevation']], ' m'],
                  'text-size': 12,
                  'text-font': ['Noto Sans Bold'],
                  'text-offset': [0, 1.45],
                  'text-anchor': 'top',
                  'text-allow-overlap': true,
                  'text-ignore-placement': true
                },
                paint: {
                  'text-color': '#fff1f2',
                  'text-halo-color': '#881337',
                  'text-halo-width': 1.5
                }
              });
              var terrainProfileSampled = false;
              map.on('idle', function () {
                if (cancelled || terrainProfileSampled || !terrainAvailable || !map.queryTerrainElevation) return;
                var terrainSettings = map.getTerrain ? map.getTerrain() : null;
                var activeExaggeration = terrainSettings && isFinite(Number(terrainSettings.exaggeration)) && Number(terrainSettings.exaggeration) > 0 ? Number(terrainSettings.exaggeration) : 1;
                var coordinates = terrainTransect.geometry.coordinates;
                var totalDistance = terrainTransect.properties.totalDistanceKm;
                var profile = [];
                coordinates.forEach(function (coordinate, index) {
                  var renderedElevation = map.queryTerrainElevation(coordinate);
                  if (renderedElevation != null && isFinite(Number(renderedElevation))) profile.push({
                    distanceKm: round(totalDistance * index / (coordinates.length - 1), 1),
                    elevation: Math.round(Number(renderedElevation) / activeExaggeration)
                  });
                });
                if (profile.length < Math.ceil(coordinates.length * 0.6)) return;
                terrainProfileSampled = true;
                update({ geographicTerrainProfile: profile, geographicTerrainProfileStatus: 'Natural elevation sampled from the rendered terrain along a 30 km wind-aligned transect.' });
              });
              if (maplibregl.Popup) {
                map.on('mouseenter', 'weather-selected-site', function () { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', 'weather-selected-site', function () { map.getCanvas().style.cursor = ''; });
                map.on('click', 'weather-selected-site', function () {
                  var runtime = geographicRuntimeRef.current;
                  if (runtime && runtime.popup && runtime.popup.remove) runtime.popup.remove();
                  var popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16 })
                    .setMaxWidth('280px')
                    .setLngLat([geographic.longitude, geographic.latitude])
                    .setText(geographicObservationSummary(d.liveWeather))
                    .addTo(map);
                  if (runtime) runtime.popup = popup;
                });
              }
              function sampleTerrainAtCoordinate(coordinate, methodLabel) {
                if (cancelled || !terrainAvailable || !map.queryTerrainElevation || !coordinate || coordinate.length < 2) return false;
                var terrainSettings = map.getTerrain ? map.getTerrain() : null;
                var activeExaggeration = terrainSettings && isFinite(Number(terrainSettings.exaggeration)) && Number(terrainSettings.exaggeration) > 0 ? Number(terrainSettings.exaggeration) : 1;
                var renderedElevation = map.queryTerrainElevation(coordinate);
                if (renderedElevation == null || !isFinite(Number(renderedElevation))) {
                  if (announce) announce('Terrain elevation is not available at that map point yet.');
                  return false;
                }
                var renderedSiteElevation = map.queryTerrainElevation([geographic.longitude, geographic.latitude]);
                var naturalElevation = Number(renderedElevation) / activeExaggeration;
                var naturalSiteElevation = renderedSiteElevation != null && isFinite(Number(renderedSiteElevation)) ? Number(renderedSiteElevation) / activeExaggeration : geographic.elevation;
                var comparison = geographicPointComparison(geographic.longitude, geographic.latitude, naturalSiteElevation, Number(coordinate[0]), Number(coordinate[1]), naturalElevation);
                if (!comparison) return false;
                var probeSource = map.getSource('weather-terrain-probe');
                if (probeSource && probeSource.setData) probeSource.setData({
                  type: 'FeatureCollection',
                  features: [
                    { type: 'Feature', properties: { kind: 'connector' }, geometry: { type: 'LineString', coordinates: [[geographic.longitude, geographic.latitude], coordinate] } },
                    { type: 'Feature', properties: { kind: 'sample', elevation: comparison.elevation }, geometry: { type: 'Point', coordinates: coordinate } }
                  ]
                });
                var selectionMethod = methodLabel || 'Pointer map selection';
                update({ geographicTerrainProbe: comparison, geographicTerrainProbeMethod: selectionMethod });
                var windAnalysis = geographicTerrainWindAnalysis(comparison, d.liveWeather && d.liveWeather.windDir);
                if (announce) announce('Terrain point sampled ' + comparison.distanceKm + ' kilometers ' + comparison.direction + ' of the observation site at ' + comparison.elevation + ' meters elevation using ' + selectionMethod.toLowerCase() + '.' + (windAnalysis ? ' This is a ' + windAnalysis.position.toLowerCase() + ' sample with an average grade of ' + windAnalysis.gradePercent + ' percent.' : ''));
                return true;
              }
              if (geographicRuntimeRef.current) geographicRuntimeRef.current.sampleTerrainAtCoordinate = sampleTerrainAtCoordinate;
              map.on('click', function (event) {
                if (cancelled || !event || !event.lngLat) return;
                var siteFeatures = map.queryRenderedFeatures(event.point, { layers: ['weather-selected-site'] });
                if (siteFeatures && siteFeatures.length) return;
                sampleTerrainAtCoordinate([Number(event.lngLat.lng), Number(event.lngLat.lat)], 'Pointer map selection');
              });
              var capabilityStatus = terrainAvailable
                ? 'Open map, administrative labels, 3D terrain, a true-scale ' + studyRadius + ' km study area, the live downwind vector, a wind-aligned terrain transect, and point elevation inspection loaded for ' + geographic.label + '. Select the site marker for the live observation or another map point to compare terrain.'
                : 'The open base map, administrative labels, study area, and wind overlays loaded for ' + geographic.label + '. 3D terrain is unavailable: ' + terrainMessage;
              update({ geographicMapLoading: false, geographicMapReady: true, geographicMapError: '', geographicTerrainAvailable: terrainAvailable, geographicBuildingsAvailable: buildingLayerIds.length > 0, geographicBuildings: showBuildings && buildingLayerIds.length > 0, geographicTerrainProfileStatus: terrainAvailable ? 'Sampling natural terrain elevation after map tiles load...' : 'Terrain sampling is unavailable because the terrain layer did not load.', geographicMapStatus: capabilityStatus });
              if (announce) announce(terrainAvailable ? 'Geographic 3D terrain loaded for ' + geographic.label + '.' : 'The geographic base map loaded, but 3D terrain is unavailable.');
            } catch (error) {
              var layerMessage = error && error.message ? error.message : 'Terrain layers could not be initialized.';
              update({ geographicMapLoading: false, geographicMapReady: true, geographicMapError: '', geographicTerrainAvailable: false, geographicBuildingsAvailable: false, geographicTerrainProfileStatus: 'Terrain sampling is unavailable because geographic evidence layers did not initialize.', geographicMapStatus: 'The open base map loaded, but geographic evidence layers are unavailable: ' + layerMessage });
            }
          });
          map.on('error', function (event) {
            if (cancelled || mapReady) return;
            mapLoadWarning = event && event.error && event.error.message ? event.error.message : 'A geographic resource reported a loading error.';
            update({ geographicMapStatus: 'Geographic layers are still loading. ' + mapLoadWarning });
          });
          if (window.ResizeObserver) {
            resizeObserver = new window.ResizeObserver(function () { if (map && map.resize) map.resize(); });
            resizeObserver.observe(geographicMapRef.current);
          }
        }).catch(function (error) {
          if (mapLoadTimer) { window.clearTimeout(mapLoadTimer); mapLoadTimer = null; }
          if (cancelled) return;
          var message = error && error.message ? error.message : 'The open geographic map could not be loaded.';
          update({ geographicMapLoading: false, geographicMapReady: false, geographicMapError: message, geographicMapStatus: '' });
          if (announce) announce(message);
        });

        return function () {
          cancelled = true;
          if (mapLoadTimer) window.clearTimeout(mapLoadTimer);
          if (resizeObserver) resizeObserver.disconnect();
          if (map && map.remove) map.remove();
          geographicRuntimeRef.current = null;
        };
      }, [d.tab, d.immersiveSceneMode, d.geographicMapAttempt, d.liveWeather && d.liveWeather.observedAt, d.liveWeather && d.liveWeather.latitude, d.liveWeather && d.liveWeather.longitude]);

      React.useEffect(function () {
        if (!d.playing) return undefined;
        var timer = window.setInterval(function () {
          setToolData(function (prev) {
            var root = Object.assign({}, prev);
            var old = root.weatherSystems || {};
            var now = old.simHour != null ? Number(old.simHour) : 0;
            root.weatherSystems = Object.assign({}, old, { simHour: now >= 24 ? 0 : now + 1, timeAdvanced: true });
            return root;
          });
        }, 1100);
        return function () { window.clearInterval(timer); };
      }, [d.playing]);

      var rootClass = 'min-h-screen overflow-hidden rounded-xl antialiased ' + (dark ? 'bg-slate-950 text-slate-100' : 'bg-sky-50 text-slate-900');
      var panelClass = 'rounded-xl border shadow-sm ' + (dark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-sky-200');
      var mutedClass = dark ? 'text-slate-300' : 'text-slate-600';
      var skyAccentClass = dark ? 'text-sky-300' : 'text-sky-700';
      var cyanAccentClass = dark ? 'text-cyan-300' : 'text-cyan-700';
      var amberAccentClass = dark ? 'text-amber-300' : 'text-amber-700';
      var violetAccentClass = dark ? 'text-violet-300' : 'text-violet-700';
      var fuchsiaAccentClass = dark ? 'text-fuchsia-300' : 'text-fuchsia-700';
      var indigoAccentClass = dark ? 'text-indigo-300' : 'text-indigo-700';
      var emeraldAccentClass = dark ? 'text-emerald-300' : 'text-emerald-700';
      var tealAccentClass = dark ? 'text-teal-300' : 'text-teal-800';
      var inputClass = 'min-h-11 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-300 focus-visible:outline-none ' + (dark ? 'bg-slate-950 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900');
      var buttonClass = 'min-h-11 rounded-lg border px-3 py-2 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none ' + (dark ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-sky-50');

      function meteorologistBadgeBoard() {
        var observationCount = (d.observationLog || []).length;
        var stationCount = Object.keys(d.stationsViewed || {}).length;
        var evidenceCount = (d.evidence || []).length;
        var revisionCount = (d.forecastHistory || []).length;
        var communicationCount = [d.predictionPrecip, d.predictionTiming, d.predictionHazard, d.readinessAction].filter(Boolean).length;
        var badges = [
          { id: 'observer', icon: '\uD83D\uDD2D', title: 'Field Observer', detail: 'Log two station observations', complete: observationCount >= 2, progress: Math.min(2, observationCount) + '/2', tab: 'map', action: 'Log observations' },
          { id: 'scout', icon: '\uD83D\uDDFA\uFE0F', title: 'Station Scout', detail: 'Inspect three weather stations', complete: stationCount >= 3, progress: Math.min(3, stationCount) + '/3', tab: 'map', action: 'Explore stations' },
          { id: 'boundary', icon: '\uD83C\uDF2C\uFE0F', title: 'Boundary Detective', detail: 'Locate the strongest air-mass boundary', complete: !!d.boundaryDetected, progress: d.boundaryDetected ? 'Found' : 'Needed', tab: 'map', action: 'Analyze the network' },
          { id: 'tester', icon: '\uD83E\uDDEA', title: 'Model Tester', detail: 'Run a controlled weather experiment', complete: (d.experimentsRun || 0) >= 1, progress: (d.experimentsRun || 0) >= 1 ? 'Tested' : 'Needed', tab: 'experiment', action: 'Run an experiment' },
          { id: 'evidence', icon: '\uD83D\uDD0E', title: 'Evidence Builder', detail: 'Use three forecast evidence sources', complete: evidenceCount >= 3, progress: Math.min(3, evidenceCount) + '/3', tab: 'forecast', action: 'Gather evidence' },
          { id: 'safety', icon: '\uD83D\uDEE1\uFE0F', title: 'Safety Planner', detail: 'Match a hazard with a readiness action', complete: !!d.predictionHazard && !!d.readinessAction, progress: d.predictionHazard && d.readinessAction ? 'Planned' : 'Needed', tab: 'forecast', action: 'Plan for hazards' },
          { id: 'verifier', icon: '\uD83D\uDCE1', title: 'Forecast Verifier', detail: 'Issue and verify one forecast', complete: (d.forecastsIssued || 0) >= 1, progress: (d.forecastsIssued || 0) >= 1 ? 'Verified' : 'Needed', tab: 'forecast', action: 'Issue a forecast' },
          { id: 'reviser', icon: '\uD83D\uDD01', title: 'Revision Scientist', detail: 'Compare two verified forecasts', complete: revisionCount >= 2, progress: Math.min(2, revisionCount) + '/2', tab: 'forecast', action: 'Revise a forecast' },
          { id: 'communicator', icon: '\uD83C\uDF99\uFE0F', title: 'Science Communicator', detail: 'Complete a public weather briefing', complete: communicationCount === 4, progress: communicationCount + '/4', tab: 'forecast', action: 'Build a briefing' }
        ];
        var earned = badges.filter(function (badge) { return badge.complete; }).length;
        var nextBadge = badges.filter(function (badge) { return !badge.complete; })[0] || null;
        var progress = Math.round(earned / badges.length * 100);
        var open = !!d.badgeBoardOpen;
        return h('section', { className: 'border-b ' + (dark ? 'border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950' : 'border-indigo-100 bg-gradient-to-r from-white via-indigo-50 to-white'), 'data-weather-badge-board': true, 'aria-labelledby': 'meteorologist-badges-title' },
          h('div', { className: 'mx-auto max-w-7xl px-4 py-3' },
            h('div', { className: 'flex flex-wrap items-center gap-3' },
              h('div', { className: 'flex min-w-0 flex-1 items-center gap-3' },
                h('div', { className: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xl shadow-lg', 'aria-hidden': true }, '\uD83C\uDFC5'),
                h('div', { className: 'min-w-0' },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-widest ' + indigoAccentClass }, 'Career pathway'),
                  h('h3', { id: 'meteorologist-badges-title', className: 'text-sm font-black' }, 'Meteorologist Badge Board'),
                  h('p', { className: 'text-xs leading-snug ' + mutedClass }, nextBadge ? 'Next: ' + nextBadge.title + ' - ' + nextBadge.detail : 'All badges earned - keep testing new weather stories!')
                )
              ),
              h('div', { className: 'min-w-[150px] flex-1 sm:max-w-xs' },
                h('div', { className: 'mb-1 flex items-center justify-between text-xs font-bold' }, h('span', null, earned + ' of ' + badges.length + ' earned'), h('span', { className: indigoAccentClass }, progress + '%')),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-indigo-100'), role: 'progressbar', 'aria-label': 'Meteorologist badges earned', 'aria-valuemin': 0, 'aria-valuemax': badges.length, 'aria-valuenow': earned },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 transition-all motion-reduce:transition-none', style: { width: progress + '%' } })
                )
              ),
              nextBadge && h('button', { type: 'button', onClick: function () { update({ tab: nextBadge.tab }); }, className: 'min-h-11 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300' }, nextBadge.action + ' \u2192'),
              h('button', { type: 'button', onClick: function () { update({ badgeBoardOpen: !open }); }, 'aria-expanded': open, 'aria-controls': 'meteorologist-badge-grid', className: buttonClass + ' text-xs' }, open ? 'Hide badges' : 'Show badges')
            ),
            open && h('div', { id: 'meteorologist-badge-grid', className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5', role: 'list', 'aria-label': 'Meteorologist achievement badges' }, badges.map(function (badge) {
              return h('div', { key: badge.id, role: 'listitem', 'aria-label': badge.title + (badge.complete ? ' earned' : ' in progress'), className: 'rounded-xl border p-3 transition-colors motion-reduce:transition-none ' + (badge.complete ? (dark ? 'border-amber-400/40 bg-amber-400/10' : 'border-amber-200 bg-amber-50') : (dark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white/80')) },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('span', { className: 'text-xl ' + (badge.complete ? '' : 'grayscale opacity-60'), 'aria-hidden': true }, badge.icon),
                  h('span', { className: 'rounded-full px-2 py-0.5 text-[11px] font-black ' + (badge.complete ? 'bg-amber-300 text-amber-950' : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')) }, badge.complete ? '\u2713 Earned' : badge.progress)
                ),
                h('p', { className: 'mt-2 text-xs font-black' }, badge.title),
                h('p', { className: 'mt-1 text-xs leading-snug ' + mutedClass }, badge.detail)
              );
            }))
          )
        );
      }

      function investigationNavigator() {
        var early = band === 'K-2';
        var stages = [
          {
            id: 'observe', icon: '\uD83D\uDD2D', label: early ? 'Look closely' : 'Observe',
            detail: early ? 'Save one weather clue.' : 'Log a station observation.', action: 'Log an observation', tab: 'map',
            complete: (d.observationLog || []).length >= 1
          },
          {
            id: 'compare', icon: '\u2194\uFE0F', label: early ? 'Compare' : 'Compare',
            detail: early ? 'Find what changed.' : 'Select evidence or compare systems.', action: 'Compare weather evidence', tab: 'map',
            complete: !!d.patternCompared || (d.lensEvidence || []).length >= 1 || !!d.carriedEvidence
          },
          {
            id: 'test', icon: '\uD83E\uDDEA', label: early ? 'Try a change' : 'Test',
            detail: early ? 'Change one ingredient.' : 'Run a one-variable investigation.', action: 'Run a controlled test', tab: 'experiment',
            complete: (d.experimentsRun || 0) >= 1
          },
          {
            id: 'forecast', icon: '\uD83D\uDCE1', label: early ? 'Share a forecast' : 'Forecast',
            detail: early ? 'Tell what may happen.' : 'Verify an evidence-based forecast.', action: 'Verify a forecast', tab: 'forecast',
            complete: (d.forecastsIssued || 0) >= 1
          },
          {
            id: 'revise', icon: '\uD83D\uDD01', label: early ? 'Make it better' : 'Revise',
            detail: early ? 'Try your forecast again.' : 'Compare two verified forecasts.', action: 'Revise and verify again', tab: 'forecast',
            complete: (d.forecastHistory || []).length >= 2
          }
        ];
        var completedCount = stages.filter(function (stage) { return stage.complete; }).length;
        var nextStage = stages.filter(function (stage) { return !stage.complete; })[0] || null;
        function openStage(stage) {
          update({ tab: stage.tab, navigatorStage: stage.id });
          if (announce) announce(stage.label + ' stage opened. ' + stage.detail);
        }
        return h('nav', {
          className: 'border-b ' + (dark ? 'border-slate-800 bg-slate-950/80' : 'border-sky-200 bg-white/90'),
          'data-weather-investigation-pathway': true,
          'aria-labelledby': 'weather-investigation-pathway-title'
        },
          h('div', { className: 'mx-auto max-w-7xl px-4 py-4' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + tealAccentClass }, 'Learning journey'),
                h('h3', { id: 'weather-investigation-pathway-title', className: 'mt-1 text-base font-black' }, early ? 'Weather Detective Path' : 'Investigation Pathway'),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, nextStage ? 'Recommended next: ' + nextStage.action + '.' : 'Investigation cycle complete. Keep testing new scenarios and improving explanations.')
              ),
              h('div', { className: 'min-w-[150px] text-right' },
                h('p', { className: 'text-sm font-black ' + tealAccentClass }, completedCount + ' of ' + stages.length + ' stages'),
                h('p', { className: 'text-[11px] font-bold ' + mutedClass }, nextStage ? 'Next: ' + nextStage.label : 'Cycle complete'),
                h('div', { className: 'mt-2 h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-teal-100'), role: 'progressbar', 'aria-label': 'Weather investigation pathway progress', 'aria-valuemin': 0, 'aria-valuemax': stages.length, 'aria-valuenow': completedCount },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all motion-reduce:transition-none', style: { width: (completedCount / stages.length * 100) + '%' } })
                )
              )
            ),
            h('ol', { className: 'mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5', 'aria-label': 'Weather investigation stages' }, stages.map(function (stage, index) {
              var recommended = nextStage && nextStage.id === stage.id;
              var stateClass = stage.complete
                ? (dark ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-950')
                : recommended
                  ? (dark ? 'border-sky-300 bg-sky-400/15 text-white ring-2 ring-sky-400/30' : 'border-sky-400 bg-sky-50 text-sky-950 ring-2 ring-sky-200')
                  : (dark ? 'border-slate-700 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800');
              return h('li', { key: stage.id },
                h('button', {
                  type: 'button',
                  onClick: function () { openStage(stage); },
                  'aria-current': recommended ? 'step' : undefined,
                  'aria-label': stage.label + '. ' + (stage.complete ? 'Complete. ' : recommended ? 'Recommended next step. ' : 'Not yet complete. ') + stage.detail,
                  className: 'min-h-24 w-full rounded-xl border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-400 ' + stateClass
                },
                  h('div', { className: 'flex items-start justify-between gap-2' },
                    h('span', { className: 'text-xl', 'aria-hidden': true }, stage.icon),
                    h('span', { className: 'rounded-full px-2 py-0.5 text-[11px] font-black ' + (stage.complete ? 'bg-emerald-300 text-emerald-950' : recommended ? 'bg-sky-300 text-sky-950' : (dark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700')) }, stage.complete ? 'Done' : recommended ? 'Next' : String(index + 1))
                  ),
                  h('span', { className: 'mt-2 block text-xs font-black' }, stage.label),
                  h('span', { className: 'mt-1 block text-[11px] leading-snug opacity-85' }, stage.detail)
                )
              );
            }))
          )
        );
      }

      function header() {
        var tabs = [
          { id: 'map', label: 'Map Lab', icon: '\uD83D\uDDFA\uFE0F' },
          { id: 'immersive', label: 'Immersive 3D', icon: '\uD83C\uDF10' },
          { id: 'experiment', label: 'Cause & Effect Lab', icon: '\uD83E\uDDEA' },
          { id: 'forecast', label: 'Forecast Mission', icon: '\uD83D\uDCE1' },
          { id: 'teacher', label: 'Teacher Guide', icon: '\uD83C\uDF93' }
        ];
        return h('div', { className: 'border-b ' + (dark ? 'border-slate-800 bg-slate-950/95' : 'border-sky-200 bg-white/95') },
          h('div', { className: 'flex flex-wrap items-center gap-3 px-4 py-3' },
            h('button', { type: 'button', onClick: function () { setStemLabTool(null); }, className: buttonClass, 'aria-label': 'Back to STEM tools' }, '\u2190 Back'),
            h('div', { className: 'min-w-0 flex-1' },
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '\uD83C\uDF26\uFE0F'),
                h('h2', { className: 'text-lg font-black tracking-tight' }, 'Weather Systems & Forecasting'),
                h('span', { className: 'rounded-full bg-sky-700 px-2 py-1 text-xs font-black uppercase tracking-wide text-white' }, band)
              ),
              h('p', { className: 'text-xs ' + mutedClass }, 'Observe patterns, test a model, and defend a forecast with evidence.')
            ),
            h('button', {
              type: 'button',
              onClick: function () {
                var snapshots = ctx.toolSnapshots || [];
                if (ctx.setToolSnapshots) ctx.setToolSnapshots(snapshots.concat([{ id: 'weather-' + Date.now(), tool: 'weatherSystems', label: scenario.name + ' at T+' + state.simHour, data: Object.assign({}, d), timestamp: Date.now() }]));
                if (addToast) addToast('Weather snapshot saved.', 'success');
              },
              className: buttonClass
            }, '\uD83D\uDCF8 Snapshot')
          ),
          h('div', { className: 'flex flex-wrap gap-2 px-4 pb-3', role: 'tablist', 'aria-label': 'Weather lab sections' },
            tabs.map(function (tab, tabIndex) {
              var active = (d.tab || 'map') === tab.id;
              return h('button', {
                key: tab.id,
                type: 'button',
                role: 'tab',
                id: 'weather-tab-' + tab.id,
                'aria-selected': active,
                'aria-controls': 'weather-panel-' + tab.id,
                onClick: function () { update({ tab: tab.id }); },
                onKeyDown: function (event) {
                  var nextIndex = null;
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (tabIndex + 1) % tabs.length;
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
                  if (event.key === 'Home') nextIndex = 0;
                  if (event.key === 'End') nextIndex = tabs.length - 1;
                  if (nextIndex == null) return;
                  event.preventDefault();
                  var nextTab = tabs[nextIndex];
                  update({ tab: nextTab.id });
                  if (window.requestAnimationFrame) window.requestAnimationFrame(function () {
                    var target = document.getElementById('weather-tab-' + nextTab.id);
                    if (target) target.focus();
                  });
                  if (announce) announce(nextTab.label + ' selected.');
                },
                className: 'min-h-11 rounded-full px-4 py-2 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none ' + (active ? 'bg-sky-700 text-white' : (dark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-sky-100 text-sky-900 hover:bg-sky-200'))
              }, tab.icon + ' ' + tab.label);
            })
          )
        );
      }

      function rangeControl(key, label, min, max, step, value, unit) {
        var id = 'weather-' + key;
        return h('label', { key: key, htmlFor: id, className: 'block' },
          h('span', { className: 'mb-1 flex items-center justify-between gap-2 text-xs font-bold' },
            h('span', null, label),
            h('span', { className: 'font-mono ' + skyAccentClass }, value + unit)
          ),
          h('input', {
            id: id,
            type: 'range', min: min, max: max, step: step, value: value,
            onChange: function (event) { setValue(key, Number(event.target.value)); },
            className: 'h-6 w-full accent-sky-500'
          })
        );
      }

      function scenarioPicker() {
        return h('div', { className: panelClass + ' p-3' },
          h('label', { htmlFor: 'weather-scenario', className: 'mb-1 block text-xs font-black uppercase tracking-wide ' + skyAccentClass }, 'Scenario'),
          h('select', { id: 'weather-scenario', value: scenario.id, onChange: function (event) { applyScenario(event.target.value); }, className: inputClass },
            SCENARIOS.map(function (item) { return h('option', { key: item.id, value: item.id }, item.name); })
          ),
          h('p', { className: 'mt-2 text-xs leading-relaxed ' + mutedClass }, scenario.summary)
        );
      }

      function stationPanel() {
        var spread = round(observation.temperature - observation.dewPoint, 1);
        var sky = observation.cloudCover < 20 ? 'Clear' : observation.cloudCover < 55 ? 'Partly cloudy' : observation.cloudCover < 85 ? 'Mostly cloudy' : 'Overcast';
        return h('div', { className: panelClass + ' p-4', 'data-weather-station-panel': true },
          h('div', { className: 'mb-3 flex flex-wrap items-start justify-between gap-3' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Observation station'),
              h('h3', { className: 'text-base font-black' }, observation.name),
              h('p', { className: 'text-xs ' + mutedClass }, observation.elevation + ' m elevation | T +' + state.simHour + ' h')
            ),
            h('div', { className: 'text-right' },
              h('p', { className: 'text-2xl font-black ' + skyAccentClass }, observation.temperature + '\u00B0C'),
              h('p', { className: 'text-xs ' + mutedClass }, sky)
            )
          ),
          h('div', { className: 'grid grid-cols-2 gap-2 sm:grid-cols-4' },
            [
              ['Dew point', observation.dewPoint + '\u00B0C'],
              ['Humidity', observation.humidity + '%'],
              ['Sea-level pressure', observation.seaLevelPressure + ' hPa'],
              ['Wind', cardinal(observation.windDir) + ' ' + observation.windSpeed + ' km/h']
            ].map(function (row) {
              return h('div', { key: row[0], className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') },
                h('p', { className: 'text-xs font-bold ' + mutedClass }, row[0]),
                h('p', { className: 'text-sm font-black' }, row[1])
              );
            })
          ),
          h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass },
            band === 'K-2'
              ? 'The air is ' + (spread < 3 ? 'nearly full of water vapor, so clouds are likely.' : 'not full yet, so fewer clouds may form.')
              : 'Temperature-dew point spread: ' + spread + '\u00B0C. ' + (spread < 3 ? 'Near saturation; cloud or fog formation is favored.' : 'A wider spread means the air is farther from saturation.')
          ),
          h('button', { type: 'button', onClick: logObservation, className: buttonClass + ' mt-3 w-full' }, '\uD83D\uDCDD Log this observation')
        );
      }


      function stationNetworkPanel() {
        if (band === 'K-2') return null;
        var analysis = stationNetworkAnalysis(state);
        var checked = !!d.boundaryResult;
        var correct = checked && d.boundaryGuess === analysis.strongest.id;
        var textColor = dark ? '#e2e8f0' : '#0f172a';
        var mutedColor = dark ? '#94a3b8' : '#475569';
        function xFor(value) { return 70 + clamp((value - 0.18) / 0.6, 0, 1) * 580; }
        var networkSummary = analysis.observations.map(function (item) {
          return item.name + ': ' + item.temperature + ' degrees Celsius, dew point ' + item.dewPoint + ', pressure ' + item.seaLevelPressure + ' hectopascals, wind ' + cardinal(item.windDir) + ' ' + item.windSpeed + ' kilometers per hour';
        }).join('. ');
        var strongestMid = (xFor(analysis.strongest.left.x) + xFor(analysis.strongest.right.x)) / 2;
        return h('section', { className: panelClass + ' p-4', 'data-weather-station-network': true, 'aria-labelledby': 'weather-network-title' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + amberAccentClass }, 'Synoptic analysis'),
              h('h3', { id: 'weather-network-title', className: 'text-base font-black' }, 'Station Network: Find the Boundary'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, band === '3-5' ? 'Compare nearby stations. Big changes can show where two air masses meet.' : 'Locate the strongest neighboring contrast in temperature, dew point, pressure, and wind direction.')
            ),
            h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (dark ? 'bg-amber-950/50 text-amber-300' : 'bg-amber-100 text-amber-800') }, 'T +' + state.simHour + ' h')
          ),
          h('svg', {
            viewBox: '0 0 720 205', className: 'mt-3 h-auto w-full', role: 'img',
            'aria-label': 'West-to-east station transect. ' + networkSummary + (checked ? '. Strongest modeled contrast is ' + analysis.strongest.label + '.' : '. Boundary result is hidden until checked.')
          },
            h('line', { x1: 70, y1: 92, x2: 650, y2: 92, stroke: dark ? '#334155' : '#cbd5e1', strokeWidth: 5, strokeLinecap: 'round' }),
            checked && analysis.hasFront && h('g', null,
              h('line', { x1: strongestMid, y1: 35, x2: strongestMid, y2: 155, stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '7 5' }),
              h('text', { x: strongestMid, y: 24, textAnchor: 'middle', fill: '#f59e0b', fontSize: 11, fontWeight: 700 }, 'strongest contrast')
            ),
            analysis.observations.map(function (item) {
              var x = xFor(item.x);
              var warm = item.temperature >= 12;
              return h('g', { key: item.id },
                h('circle', { cx: x, cy: 92, r: item.id === selectedStation ? 19 : 15, fill: warm ? '#fb7185' : '#60a5fa', stroke: item.id === selectedStation ? '#facc15' : (dark ? '#0f172a' : '#ffffff'), strokeWidth: item.id === selectedStation ? 5 : 3 }),
                h('text', { x: x, y: 55, textAnchor: 'middle', fill: textColor, fontSize: 12, fontWeight: 700 }, item.temperature + '\u00B0C'),
                h('text', { x: x, y: 126, textAnchor: 'middle', fill: textColor, fontSize: 11, fontWeight: 700 }, item.name),
                h('text', { x: x, y: 143, textAnchor: 'middle', fill: mutedColor, fontSize: 11 }, 'dew ' + item.dewPoint + '\u00B0 | ' + cardinal(item.windDir)),
                h('text', { x: x, y: 159, textAnchor: 'middle', fill: mutedColor, fontSize: 11 }, item.seaLevelPressure + ' hPa')
              );
            }),
            h('text', { x: 70, y: 190, fill: mutedColor, fontSize: 11, fontWeight: 700 }, 'WEST'),
            h('text', { x: 650, y: 190, textAnchor: 'end', fill: mutedColor, fontSize: 11, fontWeight: 700 }, 'EAST')
          ),
          analysis.hasFront ? h('div', { className: 'mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]' },
            h('label', { htmlFor: 'weather-boundary-guess', className: 'block' },
              h('span', { className: 'mb-1 block text-xs font-black' }, band === '3-5' ? 'Which neighbors are most different?' : 'Where is the strongest air-mass boundary signal?'),
              h('select', {
                id: 'weather-boundary-guess', value: d.boundaryGuess || '',
                onChange: function (event) { update({ boundaryGuess: event.target.value, boundaryResult: null }); },
                className: inputClass
              },
                h('option', { value: '' }, 'Choose a station pair...'),
                analysis.pairs.map(function (pair) { return h('option', { key: pair.id, value: pair.id }, pair.left.name + ' \u2194 ' + pair.right.name); })
              )
            ),
            h('button', { type: 'button', onClick: checkBoundaryGuess, className: buttonClass + ' self-end' }, '\uD83E\uDDED Check boundary')
          ) : h('div', { className: 'mt-3 rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-amber-50') },
            h('p', { className: 'text-xs font-black' }, 'No front in this scenario'),
            h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Small station differences here mainly come from elevation, distance from the coast, and local wind.')
          ),
          checked && analysis.hasFront && h('div', { className: 'mt-3 rounded-lg border p-3 ' + (correct ? (dark ? 'border-emerald-700 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50') : (dark ? 'border-amber-700 bg-amber-950/30' : 'border-amber-200 bg-amber-50')), role: 'status', 'aria-live': 'polite' },
            h('p', { className: 'text-xs font-black' }, correct ? '\u2705 Boundary supported' : '\u21BB Compare the contrasts again'),
            h('p', { className: 'mt-1 text-xs ' + mutedClass }, correct
              ? analysis.strongest.left.name + ' and ' + analysis.strongest.right.name + ' have the strongest combined signal. The largest contributor is ' + analysis.strongest.strongestSignal + '.'
              : 'The strongest modeled contrast is between ' + analysis.strongest.left.name + ' and ' + analysis.strongest.right.name + '. Look for the biggest combined change, not just one number.')
          )
        );
      }

      function stationModelPanel() {
        if (band === 'K-2' || band === '3-5') return null;
        var cx = 150;
        var cy = 83;
        var radians = (observation.windDir - 90) * Math.PI / 180;
        var windX = cx + Math.cos(radians) * 58;
        var windY = cy + Math.sin(radians) * 58;
        var cover = observation.cloudCover;
        var pressureCode = String(Math.round(observation.seaLevelPressure * 10) % 1000).padStart(3, '0');
        var skyFill = dark ? '#e2e8f0' : '#0f172a';
        var baseStroke = dark ? '#cbd5e1' : '#334155';
        return h('section', { className: panelClass + ' p-4', 'data-weather-station-model': true, 'aria-labelledby': 'weather-station-model-title' },
          h('div', { className: 'grid gap-4 md:grid-cols-[320px_1fr]' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Meteorologist notation'),
              h('h3', { id: 'weather-station-model-title', className: 'text-base font-black' }, 'Decode the station model'),
              h('svg', { viewBox: '0 0 300 165', className: 'mt-2 h-auto w-full', role: 'img', 'aria-label': observation.name + ' station model: temperature ' + observation.temperature + ' degrees Celsius, dew point ' + observation.dewPoint + ' degrees Celsius, sea-level pressure ' + observation.seaLevelPressure + ' hectopascals, cloud cover ' + observation.cloudCover + ' percent, wind from ' + cardinal(observation.windDir) + ' at ' + observation.windSpeed + ' kilometers per hour.' },
                h('line', { x1: cx, y1: cy, x2: windX, y2: windY, stroke: baseStroke, strokeWidth: 4, strokeLinecap: 'round' }),
                h('line', { x1: windX, y1: windY, x2: windX - Math.cos(radians - 0.8) * 20, y2: windY - Math.sin(radians - 0.8) * 20, stroke: baseStroke, strokeWidth: 3, strokeLinecap: 'round' }),
                observation.windSpeed >= 25 && h('line', { x1: windX - Math.cos(radians) * 13, y1: windY - Math.sin(radians) * 13, x2: windX - Math.cos(radians) * 13 - Math.cos(radians - 0.8) * 16, y2: windY - Math.sin(radians) * 13 - Math.sin(radians - 0.8) * 16, stroke: baseStroke, strokeWidth: 3, strokeLinecap: 'round' }),
                h('circle', { cx: cx, cy: cy, r: 18, fill: cover >= 75 ? skyFill : 'none', stroke: baseStroke, strokeWidth: 3 }),
                cover >= 30 && cover < 75 && h('path', { d: 'M ' + cx + ' ' + (cy - 18) + ' A 18 18 0 0 1 ' + cx + ' ' + (cy + 18) + ' Z', fill: skyFill }),
                h('text', { x: 78, y: 58, textAnchor: 'end', fill: baseStroke, fontSize: 18, fontWeight: 700 }, observation.temperature + '\u00B0'),
                h('text', { x: 78, y: 120, textAnchor: 'end', fill: baseStroke, fontSize: 18, fontWeight: 700 }, observation.dewPoint + '\u00B0'),
                h('text', { x: 210, y: 58, fill: baseStroke, fontSize: 18, fontWeight: 700 }, pressureCode),
                h('text', { x: 210, y: 120, fill: baseStroke, fontSize: 14, fontWeight: 700 }, cover + '% clouds')
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-2 content-center' },
              [
                ['Upper left', 'Air temperature', observation.temperature + '\u00B0C'],
                ['Lower left', 'Dew point', observation.dewPoint + '\u00B0C'],
                ['Upper right', 'Coded pressure', pressureCode + ' = ' + observation.seaLevelPressure + ' hPa'],
                ['Circle + staff', 'Cloud cover and wind', cover + '% | ' + cardinal(observation.windDir) + ' ' + observation.windSpeed + ' km/h']
              ].map(function (row) {
                return h('div', { key: row[0], className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-wide ' + skyAccentClass }, row[0]),
                  h('p', { className: 'text-xs font-bold' }, row[1]),
                  h('p', { className: 'text-xs ' + mutedClass }, row[2])
                );
              })
            )
          )
        );
      }

      function frontCrossSectionPanel() {
        var type = scenario.frontType;
        var fair = type === 'none';
        var warm = type === 'warm';
        var occluded = type === 'occluded';
        var frontLabel = fair ? 'High pressure: sinking air suppresses cloud growth' : warm ? 'Warm front: warm air rises gradually over cooler air' : occluded ? 'Occluded front: cold air lifts warm air away from the surface' : 'Cold front: dense cold air forces warm air upward quickly';
        var textColor = dark ? '#e2e8f0' : '#0f172a';
        return h('section', { className: panelClass + ' p-4', 'data-weather-cross-section': true, 'aria-labelledby': 'weather-cross-section-title' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'From map to atmosphere'),
              h('h3', { id: 'weather-cross-section-title', className: 'text-base font-black' }, 'Vertical air-mass cross-section')
            ),
            h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (dark ? 'bg-slate-800 text-sky-300' : 'bg-sky-100 text-sky-800') }, scenario.name)
          ),
          h('svg', { viewBox: '0 0 720 245', className: 'mt-3 h-auto w-full', role: 'img', 'aria-label': frontLabel },
            h('defs', null, h('marker', { id: 'weather-cross-arrow', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' }, h('path', { d: 'M0,0 L0,6 L7,3 z', fill: textColor }))),
            h('rect', { x: 0, y: 0, width: '100%', height: 210, rx: 14, fill: dark ? '#0b1830' : '#e0f2fe' }),
            h('line', { x1: 20, y1: 205, x2: 700, y2: 205, stroke: dark ? '#94a3b8' : '#475569', strokeWidth: 3 }),
            fair ? h('g', null,
              h('path', { d: 'M70 205 L70 70 L650 70 L650 205 Z', fill: dark ? '#163b57' : '#bae6fd', opacity: 0.7 }),
              [190, 360, 530].map(function (x) { return h('line', { key: x, x1: x, y1: 75, x2: x, y2: 165, stroke: textColor, strokeWidth: 3, markerEnd: 'url(#weather-cross-arrow)' }); }),
              h('text', { x: 360, y: 42, textAnchor: 'middle', fill: textColor, fontSize: 15, fontWeight: 700 }, 'Sinking, warming air'),
              h('text', { x: 360, y: 190, textAnchor: 'middle', fill: textColor, fontSize: 13 }, 'High pressure | generally fewer clouds')
            ) : h('g', null,
              h('path', { d: warm ? 'M20 205 L20 165 Q250 150 520 70 L700 70 L700 205 Z' : occluded ? 'M20 205 L20 120 Q270 165 360 75 Q450 165 700 120 L700 205 Z' : 'M20 205 L20 70 L250 70 Q330 95 390 205 Z', fill: '#2563eb', opacity: 0.62 }),
              h('path', { d: warm ? 'M20 35 L700 35 L700 70 L520 70 Q250 150 20 165 Z' : occluded ? 'M20 35 L700 35 L700 120 Q450 165 360 75 Q270 165 20 120 Z' : 'M250 70 L700 35 L700 205 L390 205 Q330 95 250 70 Z', fill: '#ef4444', opacity: 0.5 }),
              h('line', { x1: warm ? 230 : 430, y1: 165, x2: warm ? 470 : 350, y2: 58, stroke: textColor, strokeWidth: 3, markerEnd: 'url(#weather-cross-arrow)' }),
              h('line', { x1: warm ? 330 : 500, y1: warm ? 137 : 155, x2: warm ? 555 : 410, y2: 65, stroke: textColor, strokeWidth: 2, markerEnd: 'url(#weather-cross-arrow)' }),
              h('text', { x: 100, y: 190, textAnchor: 'middle', fill: '#dbeafe', fontSize: 14, fontWeight: 700 }, 'COLD AIR'),
              h('text', { x: 590, y: 185, textAnchor: 'middle', fill: dark ? '#fecaca' : '#7f1d1d', fontSize: 14, fontWeight: 700 }, 'WARM AIR'),
              h('g', { transform: 'translate(' + (warm ? 490 : 365) + ' 58)' },
                h('circle', { cx: -24, cy: 7, r: 18, fill: '#f8fafc' }),
                h('circle', { cx: 0, cy: 0, r: 25, fill: '#e2e8f0' }),
                h('circle', { cx: 27, cy: 9, r: 17, fill: '#f8fafc' }),
                current.precipPotential > 28 && [-22, 0, 22].map(function (x) { return h('line', { key: x, x1: x, y1: 28, x2: x - 5, y2: 49, stroke: current.precipType === 'snow' ? '#f8fafc' : '#38bdf8', strokeWidth: 3 }); })
              ),
              h('text', { x: 360, y: 230, textAnchor: 'middle', fill: textColor, fontSize: 14, fontWeight: 700 }, frontLabel)
            )
          )
        );
      }
      function observationLogPanel() {
        var log = d.observationLog || [];
        if (!log.length) return null;
        return h('div', { className: panelClass + ' overflow-hidden', 'data-weather-observation-log': true },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2 border-b p-3 ' + (dark ? 'border-slate-700' : 'border-sky-200') },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Evidence notebook'),
              h('h3', { className: 'text-sm font-black' }, 'Logged observations (' + log.length + ')')
            ),
            h('button', { type: 'button', onClick: function () { update({ observationLog: [] }); }, className: 'min-h-11 rounded-lg px-2 text-xs font-bold ' + skyAccentClass + ' hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none' }, 'Clear log')
          ),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'w-full min-w-[620px] text-left text-xs' },
              h('caption', { className: 'sr-only' }, 'Student weather observations by station and model hour'),
              h('thead', { className: dark ? 'bg-slate-950/70' : 'bg-sky-50' },
                h('tr', null, ['Station', 'Time', 'Temp', 'Dew point', 'Pressure', 'Wind', 'Clouds'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'px-3 py-2 font-black' }, label); }))
              ),
              h('tbody', null, log.map(function (row) {
                return h('tr', { key: row.id, className: 'border-t ' + (dark ? 'border-slate-800' : 'border-sky-100') },
                  h('th', { scope: 'row', className: 'px-3 py-2 font-bold' }, row.station),
                  h('td', { className: 'px-3 py-2' }, 'T+' + row.hour + 'h'),
                  h('td', { className: 'px-3 py-2' }, row.temperature + '\u00B0C'),
                  h('td', { className: 'px-3 py-2' }, row.dewPoint + '\u00B0C'),
                  h('td', { className: 'px-3 py-2' }, row.pressure + ' hPa'),
                  h('td', { className: 'px-3 py-2' }, row.wind),
                  h('td', { className: 'px-3 py-2' }, row.cloudCover + '%')
                );
              }))
            )
          )
        );
      }
      function trendChart() {
        var series = stationTimeSeries(state, station, 12, 1);
        var points = series.points;
        var passageVisible = series.passageHour != null && series.passageHour <= 12;
        function signed(value, unit) { return (value > 0 ? '+' : '') + value + unit; }

        if (band === 'K-2') {
          var storyHours = passageVisible ? [Math.max(0, Math.floor(series.passageHour - 2)), Math.round(series.passageHour), Math.min(12, Math.ceil(series.passageHour + 2))] : [0, 6, 12];
          var storyLabels = passageVisible ? ['Before', 'Near the front', 'After'] : ['Start', 'Middle', 'Later'];
          return h('section', { className: panelClass + ' p-4', 'data-weather-front-meteogram': true, 'aria-labelledby': 'weather-meteogram-title' },
            h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, '12-hour weather story'),
            h('h3', { id: 'weather-meteogram-title', className: 'mt-1 text-base font-black' }, 'Before, during, and after'),
            h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-3' }, storyHours.map(function (hour, index) {
              var point = stationObservation(Object.assign({}, state, { simHour: hour }), station);
              var sky = point.cloudCover < 35 ? 'few clouds' : point.cloudCover < 75 ? 'more clouds' : 'cloudy';
              return h('div', { key: storyLabels[index], className: 'rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') },
                h('p', { className: 'text-xs font-black ' + skyAccentClass }, storyLabels[index] + ' | T +' + hour),
                h('p', { className: 'mt-1 text-lg font-black' }, point.temperature + '\u00B0C'),
                h('p', { className: 'text-xs ' + mutedClass }, sky + ' | wind ' + cardinal(point.windDir))
              );
            })),
            h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass }, passageVisible ? 'Watch how the weather changes as the boundary reaches ' + station.name + '.' : 'This scenario has no front crossing this station in the next 12 hours.')
          );
        }

        function xFor(hour) { return 86 + hour / 12 * 610; }
        function pathFor(field, low, high, top, bottom) {
          return points.map(function (point, index) {
            var x = xFor(point.hour);
            var y = bottom - clamp((point[field] - low) / Math.max(1, high - low), 0, 1) * (bottom - top);
            return (index === 0 ? 'M' : 'L') + x + ' ' + y;
          }).join(' ');
        }
        var temperatures = points.reduce(function (all, point) { all.push(point.temperature, point.dewPoint); return all; }, []);
        var tempLow = Math.floor(Math.min.apply(Math, temperatures) - 2);
        var tempHigh = Math.ceil(Math.max.apply(Math, temperatures) + 2);
        var pressures = points.map(function (point) { return point.seaLevelPressure; });
        var pressureLow = Math.floor(Math.min.apply(Math, pressures) - 1);
        var pressureHigh = Math.ceil(Math.max.apply(Math, pressures) + 1);
        var windHigh = Math.max(20, Math.ceil(Math.max.apply(Math, points.map(function (point) { return point.windSpeed; })) / 10) * 10);
        var textColor = dark ? '#e2e8f0' : '#0f172a';
        var mutedColor = dark ? '#94a3b8' : '#475569';
        var gridColor = dark ? '#334155' : '#cbd5e1';
        var passageX = passageVisible ? xFor(series.passageHour) : null;
        var summary = 'Twelve-hour meteogram for ' + station.name + '. Temperature changes from ' + points[0].temperature + ' to ' + points[points.length - 1].temperature + ' degrees Celsius, pressure from ' + points[0].seaLevelPressure + ' to ' + points[points.length - 1].seaLevelPressure + ' hectopascals, wind from ' + points[0].windSpeed + ' to ' + points[points.length - 1].windSpeed + ' kilometers per hour, and precipitation potential from ' + points[0].precipPotential + ' to ' + points[points.length - 1].precipPotential + ' percent.' + (passageVisible ? ' The modeled front reaches the station near hour ' + series.passageHour + '.' : '');

        return h('section', { className: panelClass + ' p-4', 'data-weather-front-meteogram': true, 'aria-labelledby': 'weather-meteogram-title' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, '12-hour model trend at ' + station.name),
              h('h3', { id: 'weather-meteogram-title', className: 'text-base font-black' }, 'Front-Passage Meteogram'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'A meteogram aligns several station measurements on one time axis.')
            ),
            passageVisible && h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (dark ? 'bg-amber-950/60 text-amber-300' : 'bg-amber-100 text-amber-800') }, 'Front near T +' + series.passageHour + ' h')
          ),
          h('div', { className: 'mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold ' + mutedClass },
            [
              ['#fb923c', 'Temperature'], ['#22d3ee', 'Dew point'], ['#a78bfa', 'Pressure'],
              ['#34d399', 'Wind speed'], ['#38bdf8', 'Precipitation'], ['#94a3b8', 'Cloud cover']
            ].map(function (item) { return h('span', { key: item[1] }, h('span', { className: 'mr-1 inline-block h-2 w-4 rounded', style: { backgroundColor: item[0] } }), item[1]); })
          ),
          h('svg', { viewBox: '0 0 760 355', className: 'mt-2 h-auto w-full', role: 'img', 'aria-label': summary },
            [0, 3, 6, 9, 12].map(function (hour) {
              var x = xFor(hour);
              return h('g', { key: 'hour-' + hour },
                h('line', { x1: x, y1: 35, x2: x, y2: 315, stroke: gridColor, strokeWidth: 1 }),
                h('text', { x: x, y: 340, textAnchor: 'middle', fill: mutedColor, fontSize: 11 }, 'T+' + hour)
              );
            }),
            [
              { y: 42, label: 'Temp / dew' },
              { y: 112, label: 'Pressure' },
              { y: 182, label: 'Wind' },
              { y: 252, label: 'Clouds / precip' }
            ].map(function (lane) {
              return h('g', { key: lane.label },
                h('text', { x: 76, y: lane.y + 26, textAnchor: 'end', fill: textColor, fontSize: 11, fontWeight: 700 }, lane.label),
                h('line', { x1: 86, y1: lane.y + 58, x2: 696, y2: lane.y + 58, stroke: gridColor, strokeWidth: 1 })
              );
            }),
            passageVisible && h('g', null,
              h('line', { x1: passageX, y1: 25, x2: passageX, y2: 315, stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '7 5' }),
              h('text', { x: passageX, y: 18, textAnchor: 'middle', fill: '#f59e0b', fontSize: 11, fontWeight: 700 }, 'FRONT')
            ),
            h('path', { d: pathFor('temperature', tempLow, tempHigh, 42, 100), fill: 'none', stroke: '#fb923c', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('dewPoint', tempLow, tempHigh, 42, 100), fill: 'none', stroke: '#22d3ee', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('seaLevelPressure', pressureLow, pressureHigh, 112, 170), fill: 'none', stroke: '#a78bfa', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('windSpeed', 0, windHigh, 182, 240), fill: 'none', stroke: '#34d399', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('cloudCover', 0, 100, 252, 310), fill: 'none', stroke: '#94a3b8', strokeWidth: 3, strokeDasharray: '6 4', strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('precipPotential', 0, 100, 252, 310), fill: 'none', stroke: '#38bdf8', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            points.filter(function (point) { return point.hour % 3 === 0; }).map(function (point) {
              return h('circle', { key: 'precip-' + point.hour, cx: xFor(point.hour), cy: 310 - point.precipPotential / 100 * 58, r: 4, fill: '#38bdf8' });
            })
          ),
          h('div', { className: 'mt-3 rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') },
            h('p', { className: 'text-xs font-black' }, passageVisible ? 'Modeled front passage near T +' + series.passageHour + ' h' : 'No modeled front passage in this 12-hour window'),
            h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, passageVisible
              ? 'Across the three-hour passage window: temperature ' + signed(series.deltas.temperature, '\u00B0C') + ', dew point ' + signed(series.deltas.dewPoint, '\u00B0C') + ', pressure ' + signed(series.deltas.pressure, ' hPa') + ', wind shifts ' + series.deltas.windShift + '\u00B0, and precipitation potential ' + signed(series.deltas.precipPotential, ' points') + '.'
              : 'Compare the aligned measurements for gradual trends caused by heating, moisture, elevation, or the larger weather system.')
          )
        );
      }

      function atmosphereStoryline() {
        var pastHour = Math.max(0, state.simHour - 3);
        var nextHour = Math.min(24, state.simHour + 3);
        var past = projectConditions(state, pastHour);
        var now = projectConditions(state, state.simHour);
        var next = projectConditions(state, nextHour);
        var chapters = [0, 3, 6, 9, 12, 18, 24];
        var tempChange = now.temperature - past.temperature;
        var pressureChange = now.pressure - past.pressure;
        var precipChange = next.precipPotential - now.precipPotential;
        function signed(value, unit) { return (value > 0 ? '+' : '') + value + unit; }
        function conditionsLine(point) {
          return point.temperature + '\u00B0C | ' + point.pressure + ' hPa | ' + point.precipPotential + '% precipitation potential';
        }
        var pastStory = pastHour === state.simHour
          ? 'This is the starting baseline for comparing later changes.'
          : 'Since this chapter, temperature changed ' + signed(tempChange, '\u00B0C') + ' and pressure changed ' + signed(pressureChange, ' hPa') + '.';
        var nowStory = now.precipPotential >= 70
          ? 'The model shows strong precipitation potential. Compare radar, pressure, and wind before drawing a conclusion.'
          : now.cloudCover >= 70
            ? 'Cloud cover is widespread, but clouds alone do not prove precipitation will occur.'
            : 'Conditions are comparatively quiet. Look for trends rather than relying on one snapshot.';
        var nextStory = nextHour === state.simHour
          ? 'The storyline has reached the 24-hour model boundary.'
          : 'By T +' + nextHour + ', the model changes precipitation potential by ' + signed(precipChange, ' points') + ' and projects ' + next.temperature + '\u00B0C with ' + next.pressure + ' hPa.';
        var watchCue = precipChange >= 10
          ? 'Watch next: precipitation potential is climbing. Check whether pressure, cloud cover, and wind shifts support the same story.'
          : precipChange <= -10
            ? 'Watch next: precipitation potential is falling. Look for clearing, drying, or a change behind the weather system.'
            : Math.abs(next.pressure - now.pressure) >= 3
              ? 'Watch next: pressure is changing quickly. Compare the station network for a boundary or strengthening system.'
              : 'Watch next: the model changes gradually. Log observations so small trends become visible.';
        var cards = [
          { id: 'past', eyebrow: pastHour === state.simHour ? 'Baseline' : 'Previous chapter', hour: pastHour, icon: '\u23EA', story: pastStory, point: past },
          { id: 'now', eyebrow: 'Current chapter', hour: state.simHour, icon: '\uD83D\uDCCD', story: nowStory, point: now },
          { id: 'next', eyebrow: nextHour === state.simHour ? 'Model boundary' : 'Next chapter', hour: nextHour, icon: '\u23E9', story: nextStory, point: next }
        ];
        return h('section', { className: 'overflow-hidden rounded-xl border border-blue-400/30 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white shadow-lg', 'data-weather-atmosphere-storyline': true, 'aria-labelledby': 'atmosphere-storyline-title' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4' },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest text-cyan-300' }, 'Time and change'),
              h('h3', { id: 'atmosphere-storyline-title', className: 'text-lg font-black' }, 'Atmosphere Storyline'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Read the model as a sequence of evidence, not a single weather snapshot.')
            ),
            h('div', { className: 'rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10' },
              h('p', { className: 'text-xl font-black text-cyan-300' }, 'T +' + state.simHour),
              h('p', { className: 'text-[11px] font-bold uppercase tracking-wide text-slate-300' }, state.simHour === 0 ? 'Starting conditions' : state.simHour < 6 ? 'Early evolution' : state.simHour < 12 ? 'Developing pattern' : 'Later outlook')
            )
          ),
          h('div', { className: 'p-4' },
            h('div', { className: 'flex flex-wrap items-center gap-2', role: 'group', 'aria-label': 'Jump to a model-hour chapter' },
              h('span', { className: 'mr-1 text-xs font-black uppercase tracking-wide text-cyan-300' }, 'Jump to chapter'),
              chapters.map(function (hour) {
                var active = state.simHour === hour;
                return h('button', { key: hour, type: 'button', onClick: function () { update({ simHour: hour, playing: false, timeAdvanced: hour > 0 }); if (announce) announce('Atmosphere storyline moved to model hour ' + hour + '.'); }, 'aria-pressed': active, className: 'min-h-11 rounded-full border px-3 py-1.5 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 ' + (active ? 'border-cyan-300 bg-cyan-300 text-cyan-950' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10') }, 'T +' + hour);
              })
            ),
            h('div', { className: 'relative mt-4 grid gap-3 md:grid-cols-3', 'aria-live': 'polite' }, cards.map(function (card) {
              var currentCard = card.id === 'now';
              return h('article', { key: card.id, className: 'relative rounded-xl border p-4 ' + (currentCard ? 'border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/30' : 'border-white/10 bg-white/5') },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('div', null,
                    h('p', { className: 'text-[11px] font-black uppercase tracking-wide ' + (currentCard ? 'text-cyan-300' : 'text-slate-400') }, card.eyebrow),
                    h('p', { className: 'mt-1 text-base font-black' }, 'T +' + card.hour + ' hours')
                  ),
                  h('span', { className: 'text-xl', 'aria-hidden': true }, card.icon)
                ),
                h('p', { className: 'mt-3 rounded-lg bg-black/20 p-2 font-mono text-xs leading-relaxed text-cyan-100' }, conditionsLine(card.point)),
                h('p', { className: 'mt-3 text-xs leading-relaxed text-slate-200' }, card.story)
              );
            })),
            h('div', { className: 'mt-4 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3' },
              h('span', { className: 'text-xl', 'aria-hidden': true }, '\uD83D\uDC41\uFE0F'),
              h('div', null,
                h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-amber-300' }, 'Evidence cue'),
                h('p', { className: 'mt-1 text-xs font-bold leading-relaxed' }, watchCue)
              )
            ),
            h('p', { className: 'mt-3 text-xs leading-relaxed text-slate-400' }, 'Storyline chapters are projections from this transparent teaching model, not observed future weather.')
          )
        );
      }

      function visualSceneStudio() {
        var presets = [
          { id: 'overview', icon: '\uD83C\uDF0E', label: 'Overview', detail: 'All layers together', radar: true, fronts: true, windLayer: true, motion: true },
          { id: 'storm', icon: '\uD83C\uDF29\uFE0F', label: 'Storm scan', detail: 'Radar in motion', radar: true, fronts: false, windLayer: false, motion: true },
          { id: 'front', icon: '\uD83D\uDD3A', label: 'Front analysis', detail: 'Boundary and wind', radar: false, fronts: true, windLayer: true, motion: false },
          { id: 'wind', icon: '\uD83D\uDCA8', label: 'Wind flow', detail: 'Animated tracers', radar: false, fronts: false, windLayer: true, motion: true },
          { id: 'clean', icon: '\u2728', label: 'Clean map', detail: 'Stations and pressure', radar: false, fronts: false, windLayer: false, motion: false }
        ];
        var activePreset = presets.filter(function (preset) {
          return state.radar === preset.radar && state.fronts === preset.fronts && state.windLayer === preset.windLayer && state.motion === preset.motion;
        })[0] || null;
        var layers = [
          { id: 'radar', icon: '\uD83D\uDFE9', label: 'Radar echoes', detail: 'Intensity and sweep', value: state.radar, accent: 'accent-emerald-400' },
          { id: 'fronts', icon: '\uD83D\uDD3A', label: 'Front symbols', detail: 'Air-mass boundary', value: state.fronts, accent: 'accent-blue-400' },
          { id: 'windLayer', icon: '\u2192', label: 'Wind tracers', detail: 'Direction and speed', value: state.windLayer, accent: 'accent-cyan-400' },
          { id: 'motion', icon: '\u25B6', label: 'Animation', detail: 'Weather movement', value: state.motion, accent: 'accent-violet-400' }
        ];
        function applyVisualPreset(preset) {
          update({ radar: preset.radar, fronts: preset.fronts, windLayer: preset.windLayer, motion: preset.motion, visualPresetUsed: true });
          if (addToast) addToast('Visual scene changed to ' + preset.label + '.', 'success');
          if (announce) announce('Weather map visual scene changed to ' + preset.label + '. ' + preset.detail + '. Model data did not change.');
        }
        return h('section', { className: panelClass + ' overflow-hidden', 'data-weather-visual-scene-studio': true, 'aria-labelledby': 'visual-scene-studio-title' },
          h('div', { className: 'flex items-start justify-between gap-2 border-b p-3 ' + (dark ? 'border-slate-700' : 'border-sky-200') },
            h('div', null,
              h('p', { className: 'text-[11px] font-black uppercase tracking-widest ' + violetAccentClass }, 'Map appearance'),
              h('h3', { id: 'visual-scene-studio-title', className: 'text-xs font-black uppercase tracking-wide' }, 'Visual Scene Studio')
            ),
            h('span', { className: 'rounded-full px-2 py-1 text-[11px] font-black ' + (activePreset ? (dark ? 'bg-violet-950 text-violet-300' : 'bg-violet-100 text-violet-800') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')), role: 'status', 'aria-live': 'polite' }, activePreset ? activePreset.label : 'Custom mix')
          ),
          h('div', { className: 'p-3' },
            h('div', { className: 'grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Weather map visual presets' }, presets.map(function (preset) {
              var selected = activePreset && activePreset.id === preset.id;
              return h('button', { key: preset.id, type: 'button', onClick: function () { applyVisualPreset(preset); }, 'aria-pressed': !!selected, className: 'min-h-16 rounded-xl border p-3 text-left transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 ' + (selected ? 'border-violet-400 bg-violet-600 text-white shadow-md' : (dark ? 'border-slate-700 bg-slate-950/60 hover:border-violet-500/50 hover:bg-slate-800' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50')) },
                h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-base', 'aria-hidden': true }, preset.icon), h('span', { className: 'text-xs font-black' }, preset.label)),
                h('p', { className: 'mt-1 text-[11px] leading-snug ' + (selected ? 'text-violet-100' : mutedClass) }, preset.detail)
              );
            })),
            h('div', { className: 'mt-3 border-t pt-3 ' + (dark ? 'border-slate-700' : 'border-sky-100') },
              h('div', { className: 'mb-1 flex items-center justify-between gap-2' },
                h('p', { className: 'text-[11px] font-black uppercase tracking-wide ' + skyAccentClass }, 'Fine-tune layers'),
                h('span', { className: 'text-[11px] ' + mutedClass }, layers.filter(function (layer) { return layer.value; }).length + '/4 visible')
              ),
              layers.map(function (layer) {
                return h('label', { key: layer.id, className: 'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors motion-reduce:transition-none ' + (dark ? 'hover:bg-slate-800' : 'hover:bg-sky-50') },
                  h('span', { className: 'flex items-center gap-2' },
                    h('span', { className: 'flex h-6 w-6 items-center justify-center rounded-md ' + (layer.value ? (dark ? 'bg-sky-950 text-sky-300' : 'bg-sky-100 text-sky-700') : (dark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')), 'aria-hidden': true }, layer.icon),
                    h('span', null, h('span', { className: 'block text-xs font-black' }, layer.label), h('span', { className: 'block text-[11px] ' + mutedClass }, layer.detail))
                  ),
                  h('input', { type: 'checkbox', checked: layer.value, onChange: function (event) { var patch = {}; patch[layer.id] = event.target.checked; update(patch); }, className: 'h-6 w-6 ' + layer.accent, 'aria-label': layer.label })
                );
              })
            ),
            h('p', { className: 'mt-2 rounded-lg p-2 text-[11px] leading-relaxed ' + (dark ? 'bg-slate-950/70 text-slate-400' : 'bg-sky-50 text-slate-600') }, 'Visual presets change only the displayed layers. Weather measurements and model outcomes stay the same.')
          )
        );
      }

      function weatherChangeLens() {
        var futureMode = state.simHour < 24;
        var startHour = futureMode ? state.simHour : Math.max(0, state.simHour - 3);
        var endHour = futureMode ? Math.min(24, state.simHour + 3) : state.simHour;
        var start = projectConditions(state, startHour);
        var end = projectConditions(state, endHour);
        var pressureDelta = round(end.pressure - start.pressure, 1);
        var precipDelta = end.precipPotential - start.precipPotential;
        var rawWindShift = Math.abs(end.windDir - start.windDir);
        var windShift = Math.round(Math.min(rawWindShift, 360 - rawWindShift));
        function direction(delta, threshold) {
          if (Math.abs(delta) < threshold) return { icon: '→', label: 'Steady' };
          return delta > 0 ? { icon: '↑', label: 'Rising' } : { icon: '↓', label: 'Falling' };
        }
        function signedValue(value, unit) {
          return (value > 0 ? '+' : '') + value + unit;
        }
        var metrics = [
          {
            id: 'temperature', icon: '🌡️', label: 'Temperature',
            start: start.temperature, end: end.temperature, delta: round(end.temperature - start.temperature, 1), unit: '°C', threshold: 0.4, scale: 8, evidenceId: 'tempDew',
            card: dark ? 'border-orange-400/25 bg-orange-400/10' : 'border-orange-200 bg-orange-50',
            accent: dark ? 'text-orange-300' : 'text-orange-800', bar: 'bg-orange-500'
          },
          {
            id: 'pressure', icon: '◎', label: 'Pressure',
            start: start.pressure, end: end.pressure, delta: pressureDelta, unit: ' hPa', threshold: 0.5, scale: 8, evidenceId: 'pressure',
            card: dark ? 'border-violet-400/25 bg-violet-400/10' : 'border-violet-200 bg-violet-50',
            accent: dark ? 'text-violet-300' : 'text-violet-800', bar: 'bg-violet-500'
          },
          {
            id: 'wind', icon: '💨', label: 'Wind speed',
            start: start.windSpeed, end: end.windSpeed, delta: end.windSpeed - start.windSpeed, unit: ' km/h', threshold: 2, scale: 24, evidenceId: 'windShift',
            card: dark ? 'border-cyan-400/25 bg-cyan-400/10' : 'border-cyan-200 bg-cyan-50',
            accent: dark ? 'text-cyan-300' : 'text-cyan-800', bar: 'bg-cyan-500'
          },
          {
            id: 'precipitation', icon: '🌧️', label: 'Precipitation',
            start: start.precipPotential, end: end.precipPotential, delta: precipDelta, unit: ' points', threshold: 4, scale: 45, evidenceId: 'clouds',
            card: dark ? 'border-sky-400/25 bg-sky-400/10' : 'border-sky-200 bg-sky-50',
            accent: dark ? 'text-sky-300' : 'text-sky-800', bar: 'bg-sky-500'
          }
        ];
        var signalTitle = 'Gradual evolution';
        var signalIcon = '🧭';
        var signalText = 'The model changes slowly. Compare several observations before making a forecast claim.';
        if (pressureDelta <= -1 && precipDelta >= 5) {
          signalTitle = 'System strengthening';
          signalIcon = '🌀';
          signalText = 'Falling pressure and rising precipitation potential point to a developing or approaching weather system.';
        } else if (pressureDelta >= 1 && precipDelta <= -5) {
          signalTitle = 'Clearing signal';
          signalIcon = '🌤️';
          signalText = 'Rising pressure and falling precipitation potential support a transition toward quieter weather.';
        } else if (windShift >= 45) {
          signalTitle = 'Boundary passage signal';
          signalIcon = '🔺';
          signalText = 'A ' + windShift + '° wind shift is evidence that a front or air-mass boundary may be moving through.';
        } else if (precipDelta >= 8) {
          signalTitle = 'Moistening signal';
          signalIcon = '💧';
          signalText = 'Precipitation potential is climbing. Check cloud cover, humidity, lift, and radar for supporting evidence.';
        } else if (precipDelta <= -8) {
          signalTitle = 'Drying signal';
          signalIcon = '☀️';
          signalText = 'Precipitation potential is dropping. Look for decreasing cloud cover or air moving behind the system.';
        }
        if (band === 'K-2') {
          signalText = signalTitle === 'System strengthening' || signalTitle === 'Moistening signal'
            ? 'The model shows weather becoming wetter or more active. Look for more clouds and rain.'
            : signalTitle === 'Clearing signal' || signalTitle === 'Drying signal'
              ? 'The model shows weather becoming calmer or drier. Look for fewer clouds.'
              : signalTitle === 'Boundary passage signal'
                ? 'The wind changes direction when different kinds of air move past the station.'
                : 'The weather changes a little at a time. Watch more than one clue.';
        }
        var summary = 'Evidence lens from model hour ' + startHour + ' to ' + endHour + '. Temperature changes ' + signedValue(round(end.temperature - start.temperature, 1), ' degrees Celsius') + ', pressure ' + signedValue(pressureDelta, ' hectopascals') + ', wind speed ' + signedValue(end.windSpeed - start.windSpeed, ' kilometers per hour') + ', and precipitation potential ' + signedValue(precipDelta, ' percentage points') + '. Main signal: ' + signalTitle + '. ' + signalText;
        var selectedLensEvidence = (d.lensEvidence || []).slice();
        function toggleLensEvidence(id) {
          var next = selectedLensEvidence.slice();
          var index = next.indexOf(id);
          if (index === -1) next.push(id); else next.splice(index, 1);
          update({ lensEvidence: next });
          var item = EVIDENCE.filter(function (candidate) { return candidate.id === id; })[0];
          if (announce && item) announce(item.label + (index === -1 ? ' selected for the forecast.' : ' removed from the forecast evidence tray.'));
        }
        function carryLensEvidence() {
          if (!selectedLensEvidence.length) {
            if (announce) announce('Select at least one evidence card before opening the Forecast Mission.');
            return;
          }
          var merged = (d.evidence || []).slice();
          selectedLensEvidence.forEach(function (id) { if (merged.indexOf(id) === -1) merged.push(id); });
          update({
            tab: 'forecast',
            changeLensViewed: true,
            evidence: merged,
            carriedEvidence: {
              startHour: startHour,
              endHour: endHour,
              signalTitle: signalTitle,
              signalText: signalText,
              ids: selectedLensEvidence.slice()
            }
          });
          if (announce) announce(selectedLensEvidence.length + ' evidence sources carried into the Forecast Mission.');
        }
        return h('section', {
          className: panelClass + ' overflow-hidden',
          'data-weather-change-lens': true,
          'aria-labelledby': 'weather-change-lens-title',
          'aria-describedby': 'weather-change-lens-summary'
        },
          h('p', { id: 'weather-change-lens-summary', className: 'sr-only' }, summary),
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900' : 'border-sky-200 bg-gradient-to-r from-white via-indigo-50 to-white') },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, 'Compare, then explain'),
              h('h3', { id: 'weather-change-lens-title', className: 'text-base font-black' }, futureMode ? 'Next 3-hour Evidence Lens' : 'Recent 3-hour Evidence Lens'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Select measurable changes to carry into your forecast, then explain how they support your claim.')
            ),
            h('span', { className: 'rounded-full px-3 py-1.5 text-xs font-black ' + (dark ? 'bg-indigo-950 text-indigo-200 ring-1 ring-indigo-400/30' : 'bg-indigo-100 text-indigo-900') }, 'T +' + startHour + ' → T +' + endHour)
          ),
          h('div', { className: 'p-4' },
            h('p', { className: 'mb-3 text-xs font-bold ' + mutedClass, role: 'status', 'aria-live': 'polite' }, selectedLensEvidence.length ? selectedLensEvidence.length + ' evidence card' + (selectedLensEvidence.length === 1 ? '' : 's') + ' selected' : 'Choose one or more evidence cards to build your forecast trail.'),
            h('div', { className: 'grid grid-cols-2 gap-3 lg:grid-cols-4' }, metrics.map(function (metric) {
              var trend = direction(metric.delta, metric.threshold);
              var strength = Math.round(clamp(Math.abs(metric.delta) / metric.scale * 100, 8, 100));
              var lensSelected = selectedLensEvidence.indexOf(metric.evidenceId) !== -1;
              return h('button', {
                key: metric.id,
                type: 'button',
                onClick: function () { toggleLensEvidence(metric.evidenceId); },
                'aria-pressed': lensSelected,
                className: 'min-h-32 w-full rounded-xl border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400 ' + metric.card + (lensSelected ? ' ring-2 ring-indigo-400' : '')
              },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('div', null,
                    h('p', { className: 'text-xs font-black ' + metric.accent }, metric.icon + ' ' + metric.label),
                    h('p', { className: 'mt-1 text-sm font-black' }, metric.start + (metric.id === 'precipitation' ? '%' : metric.unit) + ' → ' + metric.end + (metric.id === 'precipitation' ? '%' : metric.unit))
                  ),
                  h('span', { className: 'rounded-full px-2 py-1 text-xs font-black ' + metric.accent }, lensSelected ? 'Selected' : trend.icon + ' ' + trend.label)
                ),
                h('div', { className: 'mt-3 h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-white'), 'aria-hidden': true },
                  h('div', { className: 'h-full rounded-full ' + metric.bar, style: { width: strength + '%' } })
                ),
                h('p', { className: 'mt-2 text-xs font-bold ' + mutedClass }, 'Change: ' + signedValue(metric.delta, metric.unit))
              );
            })),
            h('div', { className: 'mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ' + (dark ? 'border-indigo-400/25 bg-indigo-400/10' : 'border-indigo-200 bg-indigo-50') },
              h('span', { className: 'text-2xl', 'aria-hidden': true }, signalIcon),
              h('div', { className: 'min-w-0 flex-1' },
                h('p', { className: 'text-xs font-black uppercase tracking-wide ' + indigoAccentClass }, 'Dominant evidence signal'),
                h('p', { className: 'mt-1 text-sm font-black' }, signalTitle),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, signalText)
              ),
              h('button', {
                type: 'button',
                onClick: carryLensEvidence,
                disabled: selectedLensEvidence.length === 0,
                className: buttonClass + ' shrink-0 border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50 ' + (dark ? 'bg-indigo-950 text-indigo-100 hover:bg-indigo-900' : 'bg-white text-indigo-900 hover:bg-indigo-100')
              }, selectedLensEvidence.length ? 'Carry ' + selectedLensEvidence.length + ' to forecast' : 'Select evidence to continue')
            )
          )
        );
      }

      function patternCompareStudio() {
        var alternatives = SCENARIOS.filter(function (item) { return item.id !== scenario.id; });
        var requestedId = d.compareScenario;
        var comparisonId = alternatives.some(function (item) { return item.id === requestedId; }) ? requestedId : alternatives[0].id;
        var comparison = compareScenarioPatterns(state, comparisonId, state.simHour);
        var visibleMetrics = band === 'K-2'
          ? comparison.metrics.filter(function (metric) { return ['temperature', 'cloudCover', 'precipPotential'].indexOf(metric.id) !== -1; })
          : comparison.metrics;
        var activeName = comparison.activeScenario.name;
        var otherName = comparison.comparisonScenario.name;
        var strongest = visibleMetrics.reduce(function (best, metric) {
          return !best || metric.normalizedDifference > best.normalizedDifference ? metric : best;
        }, null);
        function barWidth(value, metric) {
          return clamp((value - metric.min) / (metric.max - metric.min) * 100, 2, 100);
        }
        function differenceText(metric) {
          var amount = Math.abs(metric.delta);
          if (amount < 0.1) return 'Nearly the same';
          return otherName + ' is ' + amount + metric.unit + (metric.delta > 0 ? ' higher' : ' lower');
        }
        var summary = 'Pattern comparison at model hour ' + comparison.hour + '. ' + activeName + ' compared with ' + otherName + '. ' + visibleMetrics.map(function (metric) {
          return metric.label + ': ' + metric.active + metric.unit + ' compared with ' + metric.comparison + metric.unit;
        }).join('. ') + '. The largest normalized contrast is ' + strongest.label + '.';
        return h('section', {
          className: 'overflow-hidden rounded-xl border shadow-lg ' + (dark ? 'border-cyan-400/25 bg-gradient-to-br from-slate-950 via-cyan-950/35 to-fuchsia-950/25' : 'border-cyan-200 bg-gradient-to-br from-white via-cyan-50 to-fuchsia-50'),
          'data-weather-pattern-compare': true,
          'aria-labelledby': 'weather-pattern-compare-title',
          'aria-describedby': 'weather-pattern-compare-summary'
        },
          h('p', { id: 'weather-pattern-compare-summary', className: 'sr-only' }, summary),
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-white/10' : 'border-cyan-100') },
            h('div', null,
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + cyanAccentClass }, 'Compare systems'),
              h('h3', { id: 'weather-pattern-compare-title', className: 'mt-1 text-lg font-black' }, 'Pattern Compare Studio'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, band === 'K-2' ? 'Look for what is the same and different in two kinds of weather.' : 'Compare system-wide patterns at the same model hour before asking what caused the differences.')
            ),
            h('span', { className: 'rounded-full px-3 py-1.5 text-xs font-black ' + (dark ? 'bg-white/10 text-cyan-200 ring-1 ring-white/10' : 'bg-cyan-100 text-cyan-900') }, 'Same time: T +' + comparison.hour)
          ),
          h('div', { className: 'p-4' },
            h('div', { className: 'grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,.55fr)] md:items-end' },
              h('div', { className: 'flex flex-wrap items-center gap-2 text-sm font-black' },
                h('span', { className: 'rounded-full bg-cyan-500 px-3 py-1.5 text-cyan-950' }, comparison.activeScenario.icon + ' ' + activeName),
                h('span', { className: mutedClass, 'aria-hidden': true }, 'vs'),
                h('span', { className: 'rounded-full bg-fuchsia-700 px-3 py-1.5 text-white' }, comparison.comparisonScenario.icon + ' ' + otherName)
              ),
              h('label', { htmlFor: 'weather-compare-scenario', className: 'block' },
                h('span', { className: 'mb-1 block text-xs font-black' }, 'Comparison system'),
                h('select', {
                  id: 'weather-compare-scenario',
                  value: comparisonId,
                  onChange: function (event) {
                    var next = scenarioById(event.target.value);
                    update({ compareScenario: next.id, patternCompared: true });
                    if (announce) announce('Comparing ' + scenario.name + ' with ' + next.name + ' at model hour ' + state.simHour + '.');
                  },
                  className: inputClass
                }, alternatives.map(function (item) { return h('option', { key: item.id, value: item.id }, item.name); }))
              )
            ),
            h('div', { className: 'mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3' }, visibleMetrics.map(function (metric) {
              return h('article', { key: metric.id, className: 'rounded-xl border p-3 ' + (dark ? 'border-white/10 bg-black/15' : 'border-white bg-white/80') },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('p', { className: 'text-xs font-black' }, metric.label),
                  h('span', { className: 'text-[11px] font-bold ' + mutedClass }, differenceText(metric))
                ),
                h('div', { className: 'mt-3 space-y-3' },
                  h('div', null,
                    h('div', { className: 'mb-1 flex items-center justify-between gap-2 text-[11px] font-bold' }, h('span', { className: dark ? 'text-cyan-300' : 'text-cyan-800' }, activeName), h('span', null, metric.active + metric.unit)),
                    h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-cyan-100'), 'aria-hidden': true }, h('div', { className: 'h-full rounded-full bg-cyan-500', style: { width: barWidth(metric.active, metric) + '%' } }))
                  ),
                  h('div', null,
                    h('div', { className: 'mb-1 flex items-center justify-between gap-2 text-[11px] font-bold' }, h('span', { className: dark ? 'text-fuchsia-300' : 'text-fuchsia-800' }, otherName), h('span', null, metric.comparison + metric.unit)),
                    h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-fuchsia-100'), 'aria-hidden': true }, h('div', { className: 'h-full rounded-full bg-fuchsia-500', style: { width: barWidth(metric.comparison, metric) + '%' } }))
                  )
                )
              );
            })),
            h('div', { className: 'mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]' },
              h('div', { className: 'rounded-xl border p-3 ' + (dark ? 'border-amber-300/20 bg-amber-300/10' : 'border-amber-200 bg-amber-50') },
                h('p', { className: 'text-xs font-black uppercase tracking-wide ' + (dark ? 'text-amber-300' : 'text-amber-800') }, 'Largest pattern contrast'),
                h('p', { className: 'mt-1 text-sm font-black' }, strongest.label + ': ' + activeName + ' ' + strongest.active + strongest.unit + ' vs ' + otherName + ' ' + strongest.comparison + strongest.unit),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, band === 'K-2' ? 'This is the biggest difference shown in the cards.' : 'The active side includes your slider changes, while the comparison uses preset defaults. Many starting conditions differ, so this reveals a pattern but does not prove which variable caused it.')
              ),
              h('div', { className: 'flex flex-col justify-center gap-2 rounded-xl border p-3 ' + (dark ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-white') },
                h('p', { className: 'text-xs font-black' }, 'Pattern comparison, not a controlled test'),
                h('button', {
                  type: 'button',
                  onClick: function () {
                    update({ tab: 'experiment' });
                    if (announce) announce('Cause and Effect Lab opened for a one-variable controlled test.');
                  },
                  className: buttonClass
                }, 'Open controlled test')
              )
            )
          )
        );
      }

      function mapLab() {
        var showAdvanced = band === '6-8' || band === '9-12';
        var mapDescription = scenario.name + ' weather map at model hour ' + state.simHour + '. ' + current.cloudCover + ' percent cloud cover, ' + current.precipPotential + ' percent precipitation potential, wind from ' + cardinal(current.windDir) + ' at ' + current.windSpeed + ' kilometers per hour. Visible layers include pressure contours' + (state.fronts ? ', fronts' : '') + (state.radar ? ', radar intensity and sweep' : '') + (state.windLayer ? ', and directional wind tracers' : '') + '. Selected station: ' + station.name + '.';
        return h('div', { className: 'grid gap-4 p-4 lg:grid-cols-[285px_minmax(0,1fr)]' },
          h('aside', { className: 'space-y-3' },
            scenarioPicker(),
            h('div', { className: panelClass + ' space-y-3 p-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('p', { className: 'text-xs font-black uppercase tracking-wide ' + skyAccentClass }, showAdvanced ? 'Model variables' : 'Weather controls'),
                h('button', { type: 'button', onClick: function () { applyScenario(scenario.id); }, className: 'min-h-11 rounded-lg px-2 text-xs font-bold ' + skyAccentClass + ' hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none' }, 'Reset')
              ),
              rangeControl('temp', 'Air temperature', -15, 38, 1, state.temp, '\u00B0C'),
              rangeControl('humidity', 'Relative humidity', 10, 100, 1, state.humidity, '%'),
              showAdvanced && rangeControl('pressure', 'Sea-level pressure', 980, 1040, 1, state.pressure, ' hPa'),
              rangeControl('windSpeed', 'Wind speed', 0, 80, 1, state.windSpeed, ' km/h'),
              showAdvanced && rangeControl('windDir', 'Wind direction', 0, 359, 5, state.windDir, '\u00B0'),
              showAdvanced && rangeControl('frontSpeed', 'Front speed', 0, 65, 1, state.frontSpeed, ' km/h'),
              (band === '9-12') && rangeControl('instability', 'Instability index', 0, 100, 1, state.instability, ''),
              (band === '9-12') && rangeControl('terrain', 'Terrain lift', 0, 100, 1, state.terrain, '')
            ),
            visualSceneStudio()
          ),
          h('main', { className: 'min-w-0 space-y-4' },
            h('div', { className: panelClass + ' overflow-hidden' },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b p-3 ' + (dark ? 'border-slate-700' : 'border-sky-200') },
                h('div', null,
                  h('p', { className: 'text-sm font-black' }, scenario.icon + ' ' + scenario.name),
                  h('p', { className: 'text-xs ' + mutedClass }, current.precipType === 'none' ? 'No precipitation detected' : current.precipType + ' | ' + current.precipPotential + '% precipitation potential')
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { type: 'button', onClick: function () { update({ playing: !d.playing }); }, className: buttonClass, 'aria-pressed': !!d.playing }, d.playing ? '\u23F8 Pause' : '\u25B6 Play'),
                  h('button', { type: 'button', onClick: function () { advance(1); }, className: buttonClass }, '+1 hour'),
                  h('button', { type: 'button', onClick: function () { advance(3); }, className: buttonClass }, '+3 hours')
                )
              ),
              h('div', { className: 'relative overflow-hidden bg-slate-900' },
                h('p', { id: 'weather-map-description', className: 'sr-only' }, mapDescription),
                h('canvas', {
                  ref: canvasRef,
                  className: 'block aspect-[48/25] h-auto w-full',
                  'aria-hidden': 'true',
                  'data-weather-map-canvas': true
                })
              ),
              h('div', { id: 'weather-map-visual-key', className: 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2 text-xs font-bold ' + (dark ? 'border-slate-700 bg-slate-950/80 text-slate-300' : 'border-sky-200 bg-sky-50 text-slate-700'), 'data-weather-canvas-visual-key': true },
                h('span', { className: 'font-black uppercase tracking-wide ' + skyAccentClass }, 'Canvas visual key'),
                h('span', null, '\u25CF Selected station pulses amber'),
                h('span', null, '\u25B3 Front symbols show movement'),
                h('span', null, '\u2192 Wind marks show direction'),
                h('span', null, '\uD83D\uDFE9\uD83D\uDFE8\uD83D\uDFE5 Radar: light to intense')
              ),
              h('div', { className: 'grid gap-2 p-3 sm:grid-cols-4' },
                STATIONS.map(function (item) {
                  var active = item.id === selectedStation;
                  return h('button', {
                    key: item.id,
                    type: 'button',
                    onClick: function () { viewStation(item.id); },
                    'aria-pressed': active,
                    className: 'min-h-14 rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none ' + (active ? 'border-sky-400 bg-sky-700 text-white' : (dark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-sky-200 bg-white hover:bg-sky-50'))
                  }, item.name, h('span', { className: 'mt-0.5 block text-xs font-normal opacity-80' }, item.elevation + ' m'));
                })
              )
            ),
            weatherChangeLens(),
            patternCompareStudio(),
            atmosphereStoryline(),
            frontCrossSectionPanel(),
            stationPanel(),
            stationNetworkPanel(),
            stationModelPanel(),
            observationLogPanel(),
            trendChart()
          )
        );
      }

      function selectField(id, label, value, options, onChange) {
        return h('label', { htmlFor: id, className: 'block' },
          h('span', { className: 'mb-1 block text-xs font-black' }, label),
          h('select', { id: id, value: value || '', onChange: onChange, className: inputClass },
            h('option', { value: '' }, 'Choose...'),
            options.map(function (option) { return h('option', { key: option.value, value: option.value }, option.label); })
          )
        );
      }

      function reasoningPulseQuestions() {
        var fairTest = {
          id: 'fairTest',
          title: band === 'K-2' ? 'Try one change' : 'Fair-test reasoning',
          prompt: band === 'K-2' ? 'You want to see what humidity does. Which is a fair try?' : 'Which design best tests how starting humidity affects precipitation potential?',
          correct: 'oneVariable',
          options: [
            { id: 'oneVariable', label: band === 'K-2' ? 'Change humidity only' : 'Change humidity while holding other starting conditions fixed' },
            { id: 'twoVariables', label: band === 'K-2' ? 'Change humidity and wind' : 'Change humidity and wind speed together' },
            { id: 'everything', label: band === 'K-2' ? 'Change everything' : 'Compare two scenarios with many different starting conditions' }
          ],
          explanation: band === 'K-2' ? 'Changing one ingredient helps you tell what made the difference.' : 'A controlled test changes one variable while holding the others fixed, supporting a causal comparison.'
        };
        if (band === 'K-2') return [
          {
            id: 'clues',
            title: 'Use more than one clue',
            prompt: 'One cloud looks dark. What makes your weather idea stronger?',
            correct: 'moreClues',
            options: [
              { id: 'moreClues', label: 'Look at more weather clues' },
              { id: 'colorOnly', label: 'Use only the cloud color' },
              { id: 'favorite', label: 'Pick the answer you like' }
            ],
            explanation: 'More clues, such as wind, temperature, and clouds, make a weather idea stronger.'
          },
          fairTest
        ];
        var systems = {
          id: 'systems',
          title: band === '3-5' ? 'Read a station pattern' : 'Interpret system signals',
          prompt: band === '3-5' ? 'Several stations show falling pressure, changing wind, and thicker clouds. What is the strongest explanation?' : 'Pressure falls across several stations while winds shift and clouds thicken. Which interpretation is best supported?',
          correct: 'approaching',
          options: [
            { id: 'approaching', label: band === '3-5' ? 'A weather system is moving in' : 'An organized weather system or boundary is approaching' },
            { id: 'singleError', label: 'One thermometer must be broken' },
            { id: 'noChange', label: 'The pattern shows no meaningful change' }
          ],
          explanation: 'A coordinated pressure tendency, wind shift, and cloud increase across stations supports an approaching system more strongly than one isolated measurement.'
        };
        if (band === '9-12') return [
          systems,
          fairTest,
          {
            id: 'ensemble',
            title: 'Interpret ensemble agreement',
            prompt: 'Seven of nine teaching-ensemble members produce rain. What conclusion is warranted?',
            correct: 'sensitivity',
            options: [
              { id: 'sensitivity', label: 'Rain is the dominant modeled outcome under these varied starting conditions' },
              { id: 'probability', label: 'There is exactly a 78% operational probability of rain' },
              { id: 'certainty', label: 'Rain is certain because most members agree' }
            ],
            explanation: 'The small teaching ensemble demonstrates sensitivity and agreement among modeled starts; it is not an operational probability or a guarantee.'
          }
        ];
        var saturation = {
          id: 'saturation',
          title: band === '3-5' ? 'Connect moisture and clouds' : 'Moisture and saturation',
          prompt: band === '3-5' ? 'Which air is more ready to form clouds?' : 'At the same air temperature, which station is closer to saturation and cloud formation?',
          correct: 'smallSpread',
          options: [
            { id: 'smallSpread', label: band === '3-5' ? 'The station where temperature and dew point are close' : 'The station with the smaller temperature-dew point spread' },
            { id: 'temperatureOnly', label: 'Whichever station has the higher air temperature' },
            { id: 'pressureOnly', label: 'Whichever station reports pressure first' }
          ],
          explanation: 'A smaller temperature-dew point spread means higher relative humidity and air closer to saturation, making cloud formation more likely when lift or cooling occurs.'
        };
        return [systems, saturation, fairTest];
      }

      function forecastMission() {
        var truth = forecastResult && forecastResult.truth;
        var terrainEvidenceStatus = geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, d.liveWeather);
        var usableEvidenceIds = (d.evidence || []).filter(function (id) { return id !== TERRAIN_EVIDENCE.id || terrainEvidenceStatus.current; });
        var selectedEvidenceCount = usableEvidenceIds.length;
        var reasoningTarget = band === 'K-2' ? 10 : 20;
        var reasoningLength = (d.reasoning || '').trim().length;
        var ensemble = ensembleForecast(state);
        var forecastEvidenceOptions = EVIDENCE.concat(d.geographicTerrainEvidence ? [TERRAIN_EVIDENCE] : []);
        var readinessItems = [
          { id: 'evidence', icon: '\uD83D\uDD0E', label: 'Select 3 evidence sources', complete: selectedEvidenceCount >= 3, progress: Math.min(1, selectedEvidenceCount / 3), status: selectedEvidenceCount + '/3' },
          { id: 'precip', icon: '\uD83C\uDF27\uFE0F', label: 'Choose precipitation', complete: !!d.predictionPrecip, progress: d.predictionPrecip ? 1 : 0, status: d.predictionPrecip ? 'Chosen' : 'Needed' },
          { id: 'timing', icon: '\u23F1\uFE0F', label: 'Estimate arrival time', complete: !!d.predictionTiming, progress: d.predictionTiming ? 1 : 0, status: d.predictionTiming ? 'Chosen' : 'Needed' },
          { id: 'hazard', icon: '\u26A0\uFE0F', label: 'Identify a hazard', complete: !!d.predictionHazard, progress: d.predictionHazard ? 1 : 0, status: d.predictionHazard ? 'Chosen' : 'Needed' },
          { id: 'action', icon: '\uD83C\uDFEB', label: 'Choose a school action', complete: !!d.readinessAction, progress: d.readinessAction ? 1 : 0, status: d.readinessAction ? 'Chosen' : 'Needed' },
          { id: 'confidence', icon: '\uD83C\uDFAF', label: 'Rate forecast confidence', complete: !!d.forecastConfidence, progress: d.forecastConfidence ? 1 : 0, status: d.forecastConfidence ? d.forecastConfidence + '%' : 'Needed' },
          { id: 'reasoning', icon: '\uD83E\uDDE0', label: 'Explain your reasoning', complete: reasoningLength >= reasoningTarget, progress: Math.min(1, reasoningLength / reasoningTarget), status: reasoningLength >= reasoningTarget ? 'Ready' : reasoningLength + '/' + reasoningTarget + ' chars' }
        ];
        var forecastReadiness = Math.round(readinessItems.reduce(function(sum, item) { return sum + item.progress; }, 0) / readinessItems.length * 100);
        var nextReadinessItem = readinessItems.filter(function(item) { return !item.complete; })[0] || null;
        var scoringWeights = [
          { label: 'Precipitation', points: 40, color: 'bg-sky-400' },
          { label: 'Timing', points: 25, color: 'bg-violet-400' },
          { label: 'Hazard', points: 25, color: 'bg-amber-400' },
          { label: 'Evidence', points: 10, color: 'bg-emerald-400' }
        ];
        function carriedEvidencePanel() {
          var carried = d.carriedEvidence;
          var ids = carried && Array.isArray(carried.ids) ? carried.ids : [];
          if (!carried || !ids.length) return null;
          var items = ids.map(function (id) {
            return EVIDENCE.filter(function (candidate) { return candidate.id === id; })[0];
          }).filter(Boolean);
          return h('section', {
            className: 'overflow-hidden rounded-xl border shadow-sm ' + (dark ? 'border-indigo-400/30 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-cyan-950/60 text-white' : 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50'),
            'data-weather-carried-evidence': true,
            'aria-labelledby': 'weather-carried-evidence-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-white/10' : 'border-indigo-100') },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, 'Map-to-forecast evidence trail'),
                h('h3', { id: 'weather-carried-evidence-title', className: 'mt-1 text-base font-black' }, 'Evidence carried from the Map Lab'),
                h('p', { className: 'mt-1 text-xs ' + (dark ? 'text-slate-300' : 'text-slate-600') }, 'These sources stay selected below, preserving where your forecast evidence came from.')
              ),
              h('span', { className: 'rounded-full px-3 py-1.5 text-xs font-black ' + (dark ? 'bg-white/10 text-indigo-200 ring-1 ring-white/10' : 'bg-indigo-100 text-indigo-900') }, 'T +' + carried.startHour + ' to T +' + carried.endHour)
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'flex flex-wrap gap-2', role: 'list', 'aria-label': 'Evidence carried from the map' }, items.map(function (item) {
                return h('span', { key: item.id, role: 'listitem', className: 'rounded-full px-3 py-1.5 text-xs font-black ' + (dark ? 'bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20' : 'bg-cyan-100 text-cyan-900') }, item.label);
              })),
              h('div', { className: 'mt-4 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ' + (dark ? 'border-amber-300/20 bg-amber-300/10' : 'border-amber-200 bg-amber-50') },
                h('span', { className: 'text-2xl', 'aria-hidden': true }, '\uD83E\uDDED'),
                h('div', { className: 'min-w-0 flex-1' },
                  h('p', { className: 'text-xs font-black uppercase tracking-wide ' + (dark ? 'text-amber-300' : 'text-amber-800') }, 'Dominant signal: ' + carried.signalTitle),
                  h('p', { className: 'mt-1 text-xs leading-relaxed ' + (dark ? 'text-slate-200' : 'text-slate-700') }, carried.signalText)
                ),
                h('button', {
                  type: 'button',
                  onClick: function () {
                    update({ tab: 'map' });
                    if (announce) announce('Map Lab opened with your evidence cards still selected.');
                  },
                  className: buttonClass + ' shrink-0'
                }, 'Review map evidence')
              )
            )
          );
        }
        function geographicTerrainEvidencePanel() {
          var terrainEvidence = d.geographicTerrainEvidence;
          if (!terrainEvidence) return null;
          var provenanceStatus = geographicTerrainEvidenceStatus(terrainEvidence, d.liveWeather);
          return h('section', {
            className: 'rounded-xl border p-4 ' + (dark ? 'border-violet-400/30 bg-violet-950/25' : 'border-violet-200 bg-violet-50'),
            'data-weather-terrain-evidence-trail': true,
            'aria-labelledby': 'weather-terrain-evidence-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + violetAccentClass }, '3D-to-forecast evidence trail'),
                h('h3', { id: 'weather-terrain-evidence-title', className: 'mt-1 text-base font-black' }, terrainEvidence.label),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, terrainEvidence.location + (terrainEvidence.observedAt ? ' | Observed ' + terrainEvidence.observedAt : ''))
              ),
              h('div', { className: 'text-right' },
                h('span', { className: 'inline-block rounded-full px-3 py-1.5 text-xs font-black ' + (provenanceStatus.current ? (dark ? 'bg-emerald-300/15 text-emerald-200' : 'bg-emerald-100 text-emerald-900') : (dark ? 'bg-amber-300/15 text-amber-200' : 'bg-amber-100 text-amber-900')) }, provenanceStatus.label),
                h('p', { className: 'mt-1 text-[11px] font-bold ' + violetAccentClass }, terrainEvidence.signalLabel)
              )
            ),
            h('div', { className: 'mt-3 grid grid-cols-3 gap-2' },
              [['Terrain relief', terrainEvidence.relief + ' m'], ['Rise to site', (terrainEvidence.riseToSite > 0 ? '+' : '') + terrainEvidence.riseToSite + ' m'], ['After site', (terrainEvidence.changeAfterSite > 0 ? '+' : '') + terrainEvidence.changeAfterSite + ' m']].map(function (metric) {
                return h('div', { key: metric[0], className: 'rounded-lg p-2 ' + (dark ? 'bg-black/20' : 'bg-white') }, h('p', { className: 'text-[11px] ' + mutedClass }, metric[0]), h('p', { className: 'mt-1 text-sm font-black' }, metric[1]));
              })
            ),
            !provenanceStatus.current && h('p', { className: 'mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs font-bold ' + (dark ? 'text-amber-100' : 'text-amber-900'), role: 'alert', 'data-weather-terrain-evidence-warning': true }, provenanceStatus.detail + ' It will not count toward forecast readiness or verification.'),
            provenanceStatus.current && h('p', { className: 'mt-3 text-[11px] font-bold ' + (dark ? 'text-emerald-200' : 'text-emerald-800'), 'data-weather-terrain-evidence-current': true }, provenanceStatus.detail),
            h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass }, terrainEvidence.summary),
            terrainEvidence.investigationNote && h('div', { className: 'mt-3 rounded-lg border p-3 ' + (dark ? 'border-cyan-300/25 bg-cyan-300/10' : 'border-cyan-200 bg-cyan-50'), 'data-weather-geographic-note-handoff': true },
              h('p', { className: 'text-[11px] font-black uppercase tracking-wide ' + cyanAccentClass }, 'Mapped evidence note carried into reasoning'),
              h('p', { className: 'mt-1 text-xs leading-relaxed ' + (dark ? 'text-slate-100' : 'text-slate-800') }, terrainEvidence.investigationNote)
            ),
            h('p', { className: 'mt-2 text-[11px] ' + mutedClass }, 'Transect: ' + terrainEvidence.upwindDirection + ' upwind to ' + terrainEvidence.downwindDirection + ' downwind. Use with moisture, stability, and pressure evidence; terrain alone is not a forecast.'),
            h('button', { type: 'button', onClick: function () { update({ tab: 'immersive', immersiveSceneMode: 'geographic' }); if (announce) announce('Geographic 3D terrain evidence reopened.'); }, className: buttonClass + ' mt-3' }, 'Review terrain evidence')
          );
        }
        function cerComposerPanel() {
          var precipLabels = { none: 'no precipitation', rain: 'rain', snow: 'snow', mixed: 'a wintry mix', storms: 'thunderstorms' };
          var timingLabels = { '0-3': 'within 0 to 3 hours', '4-6': 'within 4 to 6 hours', '7-12': 'within 7 to 12 hours', after12: 'after 12 hours or not during this period' };
          var chosenEvidence = forecastEvidenceOptions.filter(function (item) { return usableEvidenceIds.indexOf(item.id) !== -1; });
          var claimComplete = !!d.predictionPrecip && !!d.predictionTiming;
          var evidenceComplete = chosenEvidence.length >= 2;
          var reasoningComplete = reasoningLength >= reasoningTarget;
          var steps = [
            { id: 'claim', icon: '\uD83D\uDCE3', label: 'Claim', detail: 'State what weather you expect and when.', complete: claimComplete },
            { id: 'evidence', icon: '\uD83D\uDD0E', label: 'Evidence', detail: 'Name at least two observations or model signals.', complete: evidenceComplete },
            { id: 'reasoning', icon: '\uD83E\uDDE0', label: 'Reasoning', detail: 'Explain why the evidence supports the claim.', complete: reasoningComplete }
          ];
          var completed = steps.filter(function (step) { return step.complete; }).length;
          var precipPhrase = precipLabels[d.predictionPrecip] || '[type of weather]';
          var timingPhrase = timingLabels[d.predictionTiming] || '[time window]';
          var evidencePhrase = chosenEvidence.length
            ? chosenEvidence.slice(0, 3).map(function (item) { return item.label.toLowerCase(); }).join(', ')
            : '[two observations]';
          var signalPhrase = d.carriedEvidence && d.carriedEvidence.signalTitle
            ? d.carriedEvidence.signalTitle.toLowerCase()
            : 'the pattern in the model';
          var frames = band === 'K-2' ? [
            { id: 'claim', label: 'Add a claim', text: 'I think ' + precipPhrase + ' will happen ' + timingPhrase + '.' },
            { id: 'evidence', label: 'Add evidence', text: 'I noticed ' + evidencePhrase + '.' },
            { id: 'reasoning', label: 'Add why it matters', text: 'This clue matters because it shows how the weather is changing.' }
          ] : [
            { id: 'claim', label: 'Add claim frame', text: 'I predict ' + precipPhrase + ' will begin ' + timingPhrase + '.' },
            { id: 'evidence', label: 'Add evidence frame', text: 'My strongest evidence is ' + evidencePhrase + '.' },
            { id: 'reasoning', label: 'Add reasoning frame', text: 'This evidence supports my claim because ' + signalPhrase + ' connects the observations to the forecast.' }
          ];
          function appendFrame(frame) {
            var existing = (d.reasoning || '').trim();
            var next = existing ? existing + ' ' + frame.text : frame.text;
            update({ reasoning: next, forecastResult: null });
            if (announce) announce(frame.label + ' added to the reasoning note. Edit the sentence in your own words.');
          }
          return h('section', {
            className: 'mt-4 overflow-hidden rounded-xl border ' + (dark ? 'border-teal-400/25 bg-teal-950/20' : 'border-teal-200 bg-teal-50/70'),
            'data-weather-cer-composer': true,
            'aria-labelledby': 'weather-cer-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-3 ' + (dark ? 'border-teal-400/15' : 'border-teal-100') },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + (dark ? 'text-teal-300' : 'text-teal-800') }, 'Build the explanation'),
                h('h4', { id: 'weather-cer-title', className: 'mt-1 text-base font-black' }, band === 'K-2' ? 'Tell Your Weather Story' : 'CER Composer'),
                h('p', { id: 'weather-cer-guidance', className: 'mt-1 text-xs ' + mutedClass }, 'Use the frames as a starting point, then revise them in your own words.')
              ),
              h('div', { className: 'min-w-[110px] text-right' },
                h('p', { className: 'text-sm font-black ' + (dark ? 'text-teal-300' : 'text-teal-800') }, completed + ' of 3'),
                h('p', { className: 'text-[11px] font-bold ' + mutedClass }, completed === 3 ? 'CER structure ready' : 'parts ready'),
                h('div', { className: 'mt-2 h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-white'), role: 'progressbar', 'aria-label': 'Claim Evidence Reasoning completeness', 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': completed },
                  h('div', { className: 'h-full rounded-full bg-teal-500 transition-all motion-reduce:transition-none', style: { width: (completed / 3 * 100) + '%' } })
                )
              )
            ),
            h('div', { className: 'p-3' },
              h('div', { className: 'grid gap-2 sm:grid-cols-3' }, steps.map(function (step) {
                return h('article', { key: step.id, className: 'rounded-lg border p-3 ' + (step.complete ? (dark ? 'border-emerald-400/25 bg-emerald-400/10' : 'border-emerald-200 bg-emerald-50') : (dark ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-white')) },
                  h('div', { className: 'flex items-center justify-between gap-2' },
                    h('span', { className: 'text-lg', 'aria-hidden': true }, step.icon),
                    h('span', { className: 'rounded-full px-2 py-0.5 text-[11px] font-black ' + (step.complete ? 'bg-emerald-300 text-emerald-950' : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')) }, step.complete ? 'Ready' : 'Build')
                  ),
                  h('p', { className: 'mt-2 text-xs font-black' }, step.label),
                  h('p', { className: 'mt-1 text-[11px] leading-snug ' + mutedClass }, step.detail)
                );
              })),
              h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-3', role: 'group', 'aria-label': 'Claim Evidence Reasoning sentence frames' }, frames.map(function (frame) {
                return h('button', {
                  key: frame.id,
                  type: 'button',
                  onClick: function () { appendFrame(frame); },
                  'aria-controls': 'forecast-reasoning',
                  className: 'min-h-20 rounded-lg border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-400 ' + (dark ? 'border-teal-500/30 bg-teal-400/10 hover:bg-teal-400/15' : 'border-teal-200 bg-white hover:bg-teal-100')
                },
                  h('span', { className: 'block text-xs font-black ' + (dark ? 'text-teal-300' : 'text-teal-800') }, frame.label),
                  h('span', { className: 'mt-1 block text-[11px] leading-snug ' + mutedClass }, frame.text)
                );
              }))
            )
          );
        }
        function readinessCard() {
          var checklist = readinessItems.map(function (item) {
            return h('div', { key: item.id, className: 'rounded-xl border p-3 ' + (item.complete ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-white/10 bg-white/5') },
              h('div', { className: 'flex items-start justify-between gap-2' },
                h('span', { className: 'text-lg', 'aria-hidden': true }, item.icon),
                h('span', { className: 'rounded-full px-2 py-0.5 text-[11px] font-black ' + (item.complete ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-slate-200') }, item.complete ? 'Done' : item.status)
              ),
              h('div', { className: 'mt-2 text-xs font-black leading-snug' }, item.label)
            );
          });
          var scoreSegments = scoringWeights.map(function (weight) {
            return h('span', { key: weight.label, className: weight.color, style: { width: weight.points + '%' }, title: weight.label + ': ' + weight.points + ' points' });
          });
          var scoreLabels = scoringWeights.map(function (weight) {
            return h('div', { key: weight.label, className: 'flex items-center justify-between text-[11px] text-slate-300' },
              h('span', null, weight.label),
              h('span', { className: 'font-black text-white' }, weight.points + ' pts')
            );
          });
          return h('section', { className: 'overflow-hidden rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 text-white shadow-lg', 'data-weather-forecast-readiness': true, 'aria-labelledby': 'weather-readiness-title' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4' },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest text-sky-300' }, 'Mission progress'),
                h('h3', { id: 'weather-readiness-title', className: 'mt-1 text-lg font-black' }, 'Forecast Readiness'),
                h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Build a complete, evidence-based forecast before verification.')
              ),
              h('div', { className: 'rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10' },
                h('div', { className: 'text-2xl font-black text-sky-300' }, forecastReadiness + '%'),
                h('div', { className: 'text-[11px] font-bold uppercase tracking-wide text-slate-300' }, forecastReadiness === 100 ? 'Ready to verify' : 'In progress')
              )
            ),
            h('div', { className: 'px-4 pt-3' },
              h('div', { className: 'h-2 overflow-hidden rounded-full bg-black/30', role: 'progressbar', 'aria-label': 'Forecast readiness', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': forecastReadiness },
                h('div', { className: 'h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all motion-reduce:transition-none', style: { width: forecastReadiness + '%' } })
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 xl:grid-cols-5' }, checklist),
            h('div', { className: 'grid gap-3 border-t border-white/10 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]' },
              h('div', { className: 'flex items-start gap-2 rounded-xl bg-white/5 p-3' },
                h('span', { className: 'text-lg', 'aria-hidden': true }, nextReadinessItem ? '\uD83D\uDCA1' : '\u2705'),
                h('div', null,
                  h('div', { className: 'text-[11px] font-black uppercase tracking-wide text-sky-300' }, nextReadinessItem ? 'Your next move' : 'Forecast complete'),
                  h('p', { className: 'mt-0.5 text-xs font-bold' }, nextReadinessItem ? nextReadinessItem.label : 'All readiness signals are complete. Verify when ready.')
                )
              ),
              h('div', { className: 'rounded-xl bg-white/5 p-3', 'data-weather-scoring-guide': true },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('span', { className: 'text-[11px] font-black uppercase tracking-wide text-sky-300' }, 'Transparent scoring rubric'),
                  h('span', { className: 'text-[11px] text-slate-400' }, 'Reasoning: teacher/peer review')
                ),
                h('div', { className: 'mt-2 flex h-2 overflow-hidden rounded-full bg-black/30' }, scoreSegments),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-x-3 gap-y-1' }, scoreLabels)
              )
            )
          );
        }
        function ensemblePanel() {
          if (band === 'K-2' || band === '3-5') return null;
          var labels = { none: 'None', rain: 'Rain', snow: 'Snow', mixed: 'Wintry mix', storms: 'Thunderstorms' };
          var rows = Object.keys(ensemble.counts).filter(function (key) { return ensemble.counts[key] > 0; });
          var agreementCount = Math.round(ensemble.agreement * ensemble.members.length);
          return h('section', { className: panelClass + ' p-4', 'data-weather-ensemble': true, 'aria-labelledby': 'weather-ensemble-title' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + violetAccentClass }, 'Uncertainty lab'),
                h('h3', { id: 'weather-ensemble-title', className: 'text-base font-black' }, '9-member teaching ensemble'),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Each member starts with a slightly different temperature, humidity, pressure, wind, and instability value.')
              ),
              h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-violet-950/60' : 'bg-violet-50') },
                h('p', { className: 'text-xl font-black ' + violetAccentClass }, agreementCount + '/9'),
                h('p', { className: 'text-[11px] font-bold ' + mutedClass }, 'agree on ' + labels[ensemble.dominantPrecip])
              )
            ),
            h('div', { className: 'mt-4 space-y-2' }, rows.map(function (key) {
              var count = ensemble.counts[key];
              return h('div', { key: key, className: 'grid grid-cols-[92px_1fr_34px] items-center gap-2' },
                h('span', { className: 'text-xs font-bold' }, labels[key]),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-slate-200') }, h('div', { className: 'h-full rounded-full bg-violet-400', style: { width: (count / 9 * 100) + '%' } })),
                h('span', { className: 'text-right text-xs font-black' }, count)
              );
            })),
            h('div', { className: 'mt-4 grid grid-cols-2 gap-2 text-xs' },
              h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: mutedClass }, 'Temperature spread'), h('p', { className: 'font-black' }, ensemble.temperatureRange[0] + ' to ' + ensemble.temperatureRange[1] + '\u00B0C')),
              h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: mutedClass }, 'Pressure spread'), h('p', { className: 'font-black' }, ensemble.pressureRange[0] + ' to ' + ensemble.pressureRange[1] + ' hPa'))
            ),
            h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass }, 'These 9 outcomes demonstrate sensitivity to starting conditions. Their agreement is not an operational weather probability.')
          );
        }
        function forecastJournalPanel() {
          var history = d.forecastHistory || [];
          var latest = history.length ? history[history.length - 1] : null;
          var previous = history.length > 1 ? history[history.length - 2] : null;
          var delta = previous ? latest.score - previous.score : null;
          var precipLabels = { none: 'None', rain: 'Rain', snow: 'Snow', mixed: 'Wintry mix', storms: 'Thunderstorms' };
          var hazardLabels = { none: 'No major hazard', lightning: 'Lightning', flood: 'Flooding', ice: 'Ice / travel', highWind: 'Strong wind' };
          var reflection = !latest ? 'Verify a forecast to begin your revision story.' : !previous ? 'First forecast logged. Study the feedback, then revise and verify again.' : delta > 0 ? 'Revision improved by ' + delta + ' points. Identify which evidence changed your thinking.' : delta === 0 ? 'Your score held steady. Try changing one claim and explain why.' : 'Score changed by ' + delta + ' points. Compare the model outcome before revising again.';
          return h('section', { className: panelClass + ' overflow-hidden', 'data-weather-forecast-journal': true, 'aria-labelledby': 'weather-journal-title' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700' : 'border-sky-200') },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + fuchsiaAccentClass }, 'Predict - verify - revise'),
                h('h3', { id: 'weather-journal-title', className: 'text-base font-black' }, 'Forecast Revision Journal'),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Your last five verified forecasts stay visible for comparison.')
              ),
              h('div', { className: 'flex gap-2' },
                h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-fuchsia-950/50' : 'bg-fuchsia-50') },
                  h('p', { className: 'text-lg font-black ' + fuchsiaAccentClass }, history.length),
                  h('p', { className: 'text-[11px] font-bold ' + mutedClass }, history.length === 1 ? 'attempt' : 'attempts')
                ),
                h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-emerald-950/50' : 'bg-emerald-50') },
                  h('p', { className: 'text-lg font-black ' + emeraldAccentClass }, history.length ? Math.max.apply(null, history.map(function (entry) { return entry.score; })) : '--'),
                  h('p', { className: 'text-[11px] font-bold ' + mutedClass }, 'best score')
                )
              )
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'rounded-xl border p-3 ' + (delta != null && delta > 0 ? (dark ? 'border-emerald-700 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50') : (dark ? 'border-fuchsia-800 bg-fuchsia-950/20' : 'border-fuchsia-200 bg-fuchsia-50')) },
                h('p', { className: 'text-xs font-black uppercase tracking-wide ' + fuchsiaAccentClass }, latest ? (delta != null && delta > 0 ? 'Revision momentum' : 'Reflection prompt') : 'Journal ready'),
                h('p', { className: 'mt-1 text-xs font-bold leading-relaxed' }, reflection)
              ),
              history.length > 0 && h('ol', { className: 'mt-3 space-y-2', 'aria-label': 'Verified forecast attempts' }, history.slice().reverse().map(function (entry, reverseIndex) {
                var isLatest = reverseIndex === 0;
                return h('li', { key: entry.attempt + '-' + reverseIndex, className: 'rounded-xl border p-3 ' + (isLatest ? (dark ? 'border-fuchsia-700 bg-fuchsia-950/20' : 'border-fuchsia-200 bg-fuchsia-50/70') : (dark ? 'border-slate-700' : 'border-slate-200')) },
                  h('div', { className: 'flex items-center justify-between gap-3' },
                    h('div', null,
                      h('p', { className: 'text-xs font-black' }, 'Forecast #' + entry.attempt + (isLatest ? ' - latest' : '')),
                      h('p', { className: 'mt-0.5 text-xs ' + mutedClass }, 'Model hour +' + entry.modelHour + ' | ' + entry.evidenceCount + ' evidence sources | ' + entry.confidence + '% confidence')
                    ),
                    h('span', { className: 'rounded-full px-2.5 py-1 text-sm font-black ' + (entry.score >= 80 ? 'bg-emerald-700 text-white' : entry.score >= 55 ? 'bg-amber-400 text-amber-950' : 'bg-rose-600 text-white') }, entry.score)
                  ),
                  h('div', { className: 'mt-2 h-1.5 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-slate-200'), role: 'progressbar', 'aria-label': 'Forecast ' + entry.attempt + ' score', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': entry.score },
                    h('div', { className: 'h-full rounded-full ' + (entry.score >= 80 ? 'bg-emerald-400' : entry.score >= 55 ? 'bg-amber-400' : 'bg-rose-400'), style: { width: entry.score + '%' } })
                  ),
                  h('p', { className: 'mt-2 text-xs leading-relaxed ' + mutedClass }, (precipLabels[entry.precip] || entry.precip) + ' | ' + entry.timing + ' hours | ' + (hazardLabels[entry.hazard] || entry.hazard)),
                  entry.reasoning && h('blockquote', { className: 'mt-2 rounded-lg border-l-4 px-3 py-2 text-xs italic leading-relaxed ' + (dark ? 'border-fuchsia-500 bg-slate-950/60 text-slate-300' : 'border-fuchsia-300 bg-white text-slate-700') }, 'Reasoning: ' + entry.reasoning)
                );
              }))
            )
          );
        }
        function reasoningPulsePanel() {
          var questions = reasoningPulseQuestions();
          var responses = d.reasoningPulseResponses || {};
          var unlocked = (d.forecastsIssued || 0) >= 1;
          var answered = questions.filter(function (question) { return !!responses[question.id]; }).length;
          var supported = questions.filter(function (question) { return responses[question.id] === question.correct; }).length;
          var complete = answered === questions.length;
          var progress = Math.round(answered / questions.length * 100);
          function chooseReasoning(question, optionId) {
            var next = Object.assign({}, responses);
            next[question.id] = optionId;
            update({ reasoningPulseResponses: next });
            if (announce) announce(question.title + ' response selected. ' + (optionId === question.correct ? 'Explanation supported.' : 'Review the feedback and reconsider.'));
          }
          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-reasoning-pulse': true,
            'aria-labelledby': 'weather-reasoning-pulse-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-amber-950/30 to-orange-950/20' : 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50') },
              h('div', { className: 'max-w-2xl' },
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + amberAccentClass }, 'Diagnostic reasoning'),
                h('h3', { id: 'weather-reasoning-pulse-title', className: 'mt-1 text-lg font-black' }, band === 'K-2' ? 'Weather Thinking Check' : 'Reasoning Pulse Check'),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, band === 'K-2' ? 'Choose the idea that uses weather clues best.' : 'Choose the strongest explanation, then use the feedback to revise your reasoning.')
              ),
              h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (complete ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : unlocked ? (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-900') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')) }, !unlocked ? '\uD83D\uDD12 Verify first' : complete ? supported + '/' + questions.length + ' explanations supported' : answered + '/' + questions.length + ' checked')
            ),
            h('div', { className: 'p-4' },
              !unlocked && h('div', { className: 'mb-4 rounded-xl border p-3 text-sm font-bold ' + (dark ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'), role: 'status' }, 'Verify at least one forecast to unlock the reasoning check.'),
              h('div', { className: 'mb-4' },
                h('div', { className: 'mb-1 flex items-center justify-between text-xs font-bold' }, h('span', null, 'Explanations checked'), h('span', { className: amberAccentClass }, answered + '/' + questions.length)),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-amber-100'), role: 'progressbar', 'aria-label': 'Reasoning pulse completion', 'aria-valuemin': 0, 'aria-valuemax': questions.length, 'aria-valuenow': answered },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all motion-reduce:transition-none', style: { width: progress + '%' } })
                )
              ),
              h('div', { className: 'space-y-3', role: 'list', 'aria-label': band + ' weather reasoning prompts' }, questions.map(function (question, index) {
                var selected = responses[question.id] || '';
                var isSupported = selected === question.correct;
                var promptId = 'weather-reasoning-prompt-' + question.id;
                return h('article', { key: question.id, role: 'listitem', className: 'rounded-xl border p-4 ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-widest ' + amberAccentClass }, 'Reasoning prompt ' + (index + 1)),
                  h('h4', { className: 'mt-1 text-sm font-black' }, question.title),
                  h('p', { id: promptId, className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, question.prompt),
                  h('div', { className: 'mt-3 grid gap-2 sm:grid-cols-3', role: 'group', 'aria-labelledby': promptId }, question.options.map(function (option) {
                    var pressed = selected === option.id;
                    return h('button', {
                      key: option.id,
                      type: 'button',
                      disabled: !unlocked,
                      onClick: function () { chooseReasoning(question, option.id); },
                      'aria-pressed': pressed,
                      className: 'min-h-14 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 ' + (pressed ? (isSupported ? (dark ? 'border-emerald-300 bg-emerald-900 text-white' : 'border-emerald-600 bg-emerald-100 text-emerald-950') : (dark ? 'border-amber-300 bg-amber-900 text-white' : 'border-amber-600 bg-amber-100 text-amber-950')) : (dark ? 'border-slate-600 bg-slate-900 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-amber-50'))
                    }, option.label);
                  })),
                  selected && h('div', { className: 'mt-3 rounded-lg border p-3 text-xs font-bold leading-relaxed ' + (isSupported ? (dark ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-900') : (dark ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900')), role: 'status' }, (isSupported ? '\u2713 Supported. ' : '\u21BB Reconsider. ') + question.explanation)
                );
              })),
              h('p', { className: 'mt-4 text-xs leading-relaxed ' + mutedClass }, 'This diagnostic highlights explanations to revisit. It is not a quiz grade, and a selected response can be revised at any time.')
            )
          );
        }

        function peerReviewPanel() {
          var unlocked = (d.forecastsIssued || 0) >= 1;
          var strength = d.peerReviewStrength || '';
          var revisionMove = d.peerReviewMove || '';
          var feedback = (d.peerReviewFeedback || '').trim();
          var feedbackTarget = band === 'K-2' ? 3 : 10;
          var strengthOptions = band === 'K-2' ? [
            { id: 'claim', icon: '\uD83C\uDFAF', label: 'Clear weather idea' },
            { id: 'evidence', icon: '\uD83D\uDD0E', label: 'A helpful clue' },
            { id: 'safety', icon: '\uD83D\uDEE1\uFE0F', label: 'A safe action' }
          ] : [
            { id: 'claim', icon: '\uD83C\uDFAF', label: 'Clear forecast claim' },
            { id: 'evidence', icon: '\uD83D\uDD0E', label: 'Relevant evidence' },
            { id: 'reasoning', icon: '\uD83D\uDD17', label: 'Claim-evidence connection' },
            { id: 'safety', icon: '\uD83D\uDEE1\uFE0F', label: 'Useful readiness action' }
          ].concat(band === '6-8' || band === '9-12' ? [{ id: 'uncertainty', icon: '\uD83C\uDF9A\uFE0F', label: 'Calibrated uncertainty' }] : []);
          var moveOptions = band === 'K-2' ? [
            { id: 'askEvidence', label: 'Add one more weather clue' },
            { id: 'explainLink', label: 'Tell why the clue matters' },
            { id: 'clarifyAction', label: 'Match the weather to a safe action' }
          ] : [
            { id: 'askEvidence', label: 'Add another measurement' },
            { id: 'explainLink', label: 'Explain how the evidence supports the claim' },
            { id: 'clarifyAction', label: 'Connect the hazard to the readiness action' },
            { id: 'transfer', label: 'Test the reasoning in another scenario' }
          ].concat(band === '6-8' || band === '9-12' ? [{ id: 'considerUncertainty', label: 'Name what could change the outcome' }] : []);
          var completedParts = [!!strength, !!revisionMove, feedback.length >= feedbackTarget].filter(Boolean).length;
          var complete = unlocked && completedParts === 3;
          var submitted = complete && !!d.peerReviewSubmitted;
          var progress = Math.round(completedParts / 3 * 100);
          function savePeerReview() {
            if (!complete) {
              var message = unlocked ? 'Complete all three peer-review prompts before saving.' : 'Verify a forecast before beginning peer review.';
              if (addToast) addToast(message, 'warning');
              if (announce) announce(message);
              return;
            }
            update({ peerReviewSubmitted: true });
            if (addToast) addToast('Peer review saved.', 'success');
            if (announce) announce('Peer review saved for the Teacher Handoff Brief.');
          }
          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-peer-review': true,
            'aria-labelledby': 'weather-peer-review-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-violet-950/20' : 'border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50') },
              h('div', { className: 'max-w-2xl' },
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, 'Argument from evidence'),
                h('h3', { id: 'weather-peer-review-title', className: 'mt-1 text-lg font-black' }, band === 'K-2' ? 'Partner Weather Talk' : 'Peer Review Exchange'),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, band === 'K-2' ? 'Listen for a strong idea, then help your partner make it even clearer.' : 'Identify one strength, choose one useful revision move, and leave evidence-focused feedback.')
              ),
              h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (submitted ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : unlocked ? (dark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-900') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')) }, submitted ? '\u2713 Review saved' : unlocked ? completedParts + '/3 complete' : '\uD83D\uDD12 Verify first')
            ),
            h('div', { className: 'p-4' },
              !unlocked && h('div', { className: 'mb-4 rounded-xl border p-3 text-sm font-bold ' + (dark ? 'border-indigo-800 bg-indigo-950/30 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-900'), role: 'status' }, 'Verify at least one forecast before exchanging peer feedback.'),
              h('div', { className: 'mb-4' },
                h('div', { className: 'mb-1 flex items-center justify-between text-xs font-bold' }, h('span', null, 'Peer-review completeness'), h('span', { className: indigoAccentClass }, progress + '%')),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-indigo-100'), role: 'progressbar', 'aria-label': 'Peer review completeness', 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': completedParts },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all motion-reduce:transition-none', style: { width: progress + '%' } })
                )
              ),
              h('fieldset', { disabled: !unlocked },
                h('legend', { className: 'text-sm font-black' }, band === 'K-2' ? '1. What was strong?' : '1. Which part of the forecast is strongest?'),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3', role: 'group', 'aria-label': 'Choose a peer-review strength' }, strengthOptions.map(function (option) {
                  var selected = strength === option.id;
                  return h('button', {
                    key: option.id,
                    type: 'button',
                    onClick: function () { update({ peerReviewStrength: option.id, peerReviewSubmitted: false }); },
                    'aria-pressed': selected,
                    className: 'min-h-14 rounded-xl border px-3 py-2 text-left text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 ' + (selected ? (dark ? 'border-indigo-300 bg-indigo-900 text-white' : 'border-indigo-600 bg-indigo-100 text-indigo-950') : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-indigo-50'))
                  }, h('span', { className: 'mr-1', 'aria-hidden': true }, option.icon), option.label);
                }))
              ),
              h('fieldset', { className: 'mt-4', disabled: !unlocked },
                h('legend', { className: 'text-sm font-black' }, band === 'K-2' ? '2. What could make it even better?' : '2. Choose one actionable revision move'),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3', role: 'group', 'aria-label': 'Choose a peer-review revision move' }, moveOptions.map(function (option) {
                  var selected = revisionMove === option.id;
                  return h('button', {
                    key: option.id,
                    type: 'button',
                    onClick: function () { update({ peerReviewMove: option.id, peerReviewSubmitted: false }); },
                    'aria-pressed': selected,
                    className: 'min-h-14 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 ' + (selected ? (dark ? 'border-violet-300 bg-violet-900 text-white' : 'border-violet-600 bg-violet-100 text-violet-950') : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-violet-50'))
                  }, option.label);
                }))
              ),
              h('label', { htmlFor: 'weather-peer-feedback', className: 'mt-4 block' },
                h('span', { className: 'block text-sm font-black' }, band === 'K-2' ? '3. Finish: I noticed... I wonder...' : '3. Write concise, evidence-focused feedback'),
                h('textarea', {
                  id: 'weather-peer-feedback',
                  value: d.peerReviewFeedback || '',
                  maxLength: 180,
                  disabled: !unlocked,
                  onChange: function (event) { update({ peerReviewFeedback: event.target.value.slice(0, 180), peerReviewSubmitted: false }); },
                  'aria-describedby': 'weather-peer-feedback-count weather-peer-review-purpose',
                  placeholder: band === 'K-2' ? 'I noticed... I wonder...' : 'I notice... I wonder... One next step is...',
                  className: inputClass + ' mt-2 min-h-[100px] resize-y disabled:cursor-not-allowed disabled:opacity-50'
                }),
                h('span', { id: 'weather-peer-feedback-count', className: 'mt-1 block text-right text-[11px] font-bold ' + (feedback.length >= feedbackTarget ? emeraldAccentClass : mutedClass) }, feedback.length + ' / ' + feedbackTarget + ' minimum characters')
              ),
              h('div', { className: 'mt-4 flex flex-wrap items-center justify-between gap-3' },
                h('p', { id: 'weather-peer-review-purpose', className: 'max-w-2xl text-xs leading-relaxed ' + mutedClass }, 'Review the reasoning, not the person. Do not enter names or sensitive information. Peer feedback is not a grade.'),
                h('button', {
                  type: 'button',
                  onClick: savePeerReview,
                  disabled: !complete,
                  className: 'min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50'
                }, submitted ? '\u2713 Peer review saved' : 'Save peer review')
              )
            )
          );
        }

        function reflectionExitTicketPanel() {
          var unlocked = (d.forecastsIssued || 0) >= 1;
          var shift = d.reflectionShift || '';
          var readiness = d.reflectionReadiness || '';
          var question = (d.reflectionQuestion || '').trim();
          var questionTarget = band === 'K-2' ? 3 : 8;
          var shiftOptions = [
            { id: 'station', icon: '\uD83C\uDF21\uFE0F', label: band === 'K-2' ? 'A weather clue' : 'A station measurement' },
            { id: 'pattern', icon: '\uD83D\uDCC8', label: band === 'K-2' ? 'What changed' : 'A pattern over time' },
            { id: 'experiment', icon: '\uD83E\uDDEA', label: band === 'K-2' ? 'Trying one change' : 'The controlled test' },
            { id: 'verification', icon: '\uD83C\uDFAF', label: band === 'K-2' ? 'Checking my idea' : 'Checking the forecast' },
            { id: 'discussion', icon: '\uD83D\uDDE3\uFE0F', label: band === 'K-2' ? 'Talking it through' : 'Explaining to someone' }
          ];
          var readinessOptions = band === 'K-2' ? [
            { id: 'needHelp', label: 'I need help' },
            { id: 'developing', label: 'I can tell with help' },
            { id: 'explain', label: 'I can explain it' },
            { id: 'transfer', label: 'I can try a new story' }
          ] : [
            { id: 'needHelp', label: 'I need a conference' },
            { id: 'developing', label: 'I can explain with a prompt' },
            { id: 'explain', label: 'I can explain with evidence' },
            { id: 'transfer', label: 'I can apply it to a new system' }
          ];
          var completedParts = [!!shift, !!readiness, question.length >= questionTarget].filter(Boolean).length;
          var complete = unlocked && completedParts === 3;
          var submitted = complete && !!d.reflectionSubmitted;
          var progress = Math.round(completedParts / 3 * 100);
          function submitReflection() {
            if (!complete) {
              var message = unlocked ? 'Complete all three reflection prompts before saving the exit ticket.' : 'Verify a forecast before completing the exit ticket.';
              if (addToast) addToast(message, 'warning');
              if (announce) announce(message);
              return;
            }
            update({ reflectionSubmitted: true });
            if (addToast) addToast('Reflection and exit ticket saved.', 'success');
            if (announce) announce('Reflection and exit ticket saved for the teacher handoff.');
          }
          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-reflection-ticket': true,
            'aria-labelledby': 'weather-reflection-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-teal-950/20' : 'border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50') },
              h('div', { className: 'max-w-2xl' },
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + emeraldAccentClass }, 'Metacognition and transfer'),
                h('h3', { id: 'weather-reflection-title', className: 'mt-1 text-lg font-black' }, band === 'K-2' ? 'Think Back & Share' : 'Reflection & Exit Ticket'),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, band === 'K-2' ? 'Think about what helped your weather idea grow.' : 'Name what changed your thinking, assess your explanation readiness, and leave a question for the next investigation.')
              ),
              h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (submitted ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : unlocked ? (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-900') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')) }, submitted ? '\u2713 Saved' : unlocked ? completedParts + '/3 complete' : '\uD83D\uDD12 Verify first')
            ),
            h('div', { className: 'p-4' },
              !unlocked && h('div', { className: 'mb-4 rounded-xl border p-3 text-sm font-bold ' + (dark ? 'border-amber-800 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'), role: 'status' }, 'Verify at least one forecast to unlock the reflection exit ticket.'),
              h('div', { className: 'mb-4' },
                h('div', { className: 'mb-1 flex items-center justify-between text-xs font-bold' }, h('span', null, 'Reflection completeness'), h('span', { className: emeraldAccentClass }, progress + '%')),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-emerald-100'), role: 'progressbar', 'aria-label': 'Learner reflection completeness', 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': completedParts },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all motion-reduce:transition-none', style: { width: progress + '%' } })
                )
              ),
              h('fieldset', { disabled: !unlocked },
                h('legend', { className: 'text-sm font-black' }, band === 'K-2' ? '1. What helped your idea change?' : '1. What most changed or strengthened your thinking?'),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3', role: 'group', 'aria-label': 'Choose what changed your thinking' }, shiftOptions.map(function (option) {
                  var selected = shift === option.id;
                  return h('button', {
                    key: option.id,
                    type: 'button',
                    onClick: function () { update({ reflectionShift: option.id, reflectionSubmitted: false }); },
                    'aria-pressed': selected,
                    className: 'min-h-14 rounded-xl border px-3 py-2 text-left text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 ' + (selected ? (dark ? 'border-emerald-300 bg-emerald-900 text-white' : 'border-emerald-600 bg-emerald-100 text-emerald-950') : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-emerald-50'))
                  }, h('span', { className: 'mr-1', 'aria-hidden': true }, option.icon), option.label);
                }))
              ),
              h('fieldset', { className: 'mt-4', disabled: !unlocked },
                h('legend', { className: 'text-sm font-black' }, band === 'K-2' ? '2. How ready are you to tell your weather story?' : '2. How ready are you to explain your forecast reasoning?'),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4', role: 'group', 'aria-label': 'Choose explanation readiness' }, readinessOptions.map(function (option) {
                  var selected = readiness === option.id;
                  return h('button', {
                    key: option.id,
                    type: 'button',
                    onClick: function () { update({ reflectionReadiness: option.id, reflectionSubmitted: false }); },
                    'aria-pressed': selected,
                    className: 'min-h-14 rounded-xl border px-2 py-2 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50 ' + (selected ? (dark ? 'border-teal-300 bg-teal-900 text-white' : 'border-teal-600 bg-teal-100 text-teal-950') : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-teal-50'))
                  }, option.label);
                }))
              ),
              h('label', { htmlFor: 'weather-reflection-question', className: 'mt-4 block' },
                h('span', { className: 'block text-sm font-black' }, band === 'K-2' ? '3. What do you still wonder?' : '3. What weather question would you investigate next?'),
                h('textarea', {
                  id: 'weather-reflection-question',
                  value: d.reflectionQuestion || '',
                  maxLength: 180,
                  disabled: !unlocked,
                  onChange: function (event) { update({ reflectionQuestion: event.target.value.slice(0, 180), reflectionSubmitted: false }); },
                  'aria-describedby': 'weather-reflection-question-count weather-reflection-purpose',
                  placeholder: band === 'K-2' ? 'I wonder...' : 'I would investigate...',
                  className: inputClass + ' mt-2 min-h-[100px] resize-y disabled:cursor-not-allowed disabled:opacity-50'
                }),
                h('span', { id: 'weather-reflection-question-count', className: 'mt-1 block text-right text-[11px] font-bold ' + (question.length >= questionTarget ? emeraldAccentClass : mutedClass) }, question.length + ' / ' + questionTarget + ' minimum characters')
              ),
              h('div', { className: 'mt-4 flex flex-wrap items-center justify-between gap-3' },
                h('p', { id: 'weather-reflection-purpose', className: 'max-w-2xl text-xs leading-relaxed ' + mutedClass }, 'This self-assessment describes learning readiness, not forecast accuracy or a grade.'),
                h('button', {
                  type: 'button',
                  onClick: submitReflection,
                  disabled: !complete,
                  className: 'min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-emerald-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50'
                }, submitted ? '\u2713 Exit ticket saved' : 'Save exit ticket')
              )
            )
          );
        }

        function forecastBroadcastPanel() {
          var audienceId = d.broadcastAudience || 'school';
          var audiences = [
            { id: 'school', icon: '\uD83C\uDFEB', label: 'School', lead: 'School weather update:' },
            { id: 'families', icon: '\uD83C\uDFE0', label: 'Families', lead: 'Family weather update:' },
            { id: 'young', icon: '\uD83C\uDFA8', label: 'Younger learners', lead: 'Kid-friendly weather update:' }
          ];
          var audience = audiences.filter(function (item) { return item.id === audienceId; })[0] || audiences[0];
          var precipLabels = { none: 'No precipitation', rain: 'Rain', snow: 'Snow', mixed: 'Wintry mix', storms: 'Thunderstorms' };
          var timingLabels = { '0-3': 'within 3 hours', '4-6': 'in 4 to 6 hours', '7-12': 'in 7 to 12 hours', after12: 'after 12 hours, if at all' };
          var hazardLabels = { none: 'no major hazard', lightning: 'lightning', flood: 'flooding', ice: 'ice and slippery travel', highWind: 'strong wind' };
          var actionLabels = { normal: 'continue normal activities', monitor: 'monitor conditions and updates', indoors: 'move activities indoors', avoidTravel: 'avoid flooded routes and low crossings', delayTravel: 'delay travel for icy conditions', shelter: 'shelter away from windows' };
          var communicationItems = [
            { label: 'Weather', complete: !!d.predictionPrecip },
            { label: 'Timing', complete: !!d.predictionTiming },
            { label: 'Hazard', complete: !!d.predictionHazard },
            { label: 'Action', complete: !!d.readinessAction }
          ];
          var completed = communicationItems.filter(function (item) { return item.complete; }).length;
          var communicationReady = completed === communicationItems.length;
          var communicationProgress = Math.round(completed / communicationItems.length * 100);
          var missingLabels = communicationItems.filter(function (item) { return !item.complete; }).map(function (item) { return item.label.toLowerCase(); });
          var precipVerb = d.predictionPrecip === 'storms' ? ' are' : ' is';
          var script = communicationReady
            ? audience.lead + ' ' + precipLabels[d.predictionPrecip] + precipVerb + ' most likely ' + timingLabels[d.predictionTiming] + '. Main concern: ' + hazardLabels[d.predictionHazard] + '. Recommended action: ' + actionLabels[d.readinessAction] + '.' + (d.forecastConfidence ? ' Forecast confidence: ' + d.forecastConfidence + '%.' : '')
            : audience.lead + ' Add ' + missingLabels.join(', ') + ' to complete this briefing.';
          return h('section', { className: 'overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 text-white shadow-lg', 'data-weather-broadcast-studio': true, 'aria-labelledby': 'weather-broadcast-title' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4' },
              h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest text-cyan-300' }, 'Science communication'),
                h('h3', { id: 'weather-broadcast-title', className: 'text-lg font-black' }, 'Weather Broadcast Studio'),
                h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Translate model evidence into a useful briefing for a real audience.')
              ),
              h('span', { className: 'rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ' + (communicationReady ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-cyan-200') }, communicationReady ? '\u25CF On air' : completed + '/4 details')
            ),
            h('div', { className: 'p-4' },
              h('p', { className: 'text-xs font-black uppercase tracking-wide text-cyan-300' }, 'Choose your audience'),
              h('div', { className: 'mt-2 grid grid-cols-3 gap-2' }, audiences.map(function (item) {
                var selected = item.id === audienceId;
                return h('button', { key: item.id, type: 'button', onClick: function () { update({ broadcastAudience: item.id }); }, 'aria-pressed': selected, className: 'min-h-16 rounded-xl border px-2 py-3 text-center text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 ' + (selected ? 'border-cyan-300 bg-cyan-400 text-cyan-950' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10') },
                  h('span', { className: 'mb-1 block text-xl', 'aria-hidden': true }, item.icon), item.label
                );
              })),
              h('div', { className: 'mt-4' },
                h('div', { className: 'mb-2 flex items-center justify-between text-xs font-bold text-slate-300' },
                  h('span', null, 'Briefing completeness'),
                  h('span', null, communicationProgress + '%')
                ),
                h('div', { className: 'h-2 overflow-hidden rounded-full bg-black/30', role: 'progressbar', 'aria-label': 'Broadcast briefing completeness', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': communicationProgress },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all motion-reduce:transition-none', style: { width: communicationProgress + '%' } })
                )
              ),
              h('div', { className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' }, communicationItems.map(function (item) {
                return h('div', { key: item.label, className: 'rounded-lg border px-2 py-2 text-center text-[11px] font-black ' + (item.complete ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400') }, (item.complete ? '\u2713 ' : '') + item.label);
              })),
              h('div', { className: 'mt-4 rounded-xl border border-cyan-300/20 bg-black/20 p-4', role: 'status', 'aria-live': 'polite' },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('p', { className: 'text-xs font-black uppercase tracking-wide text-cyan-300' }, communicationReady ? 'Broadcast script ready' : 'Live script builder'),
                  h('span', { className: 'text-[11px] text-slate-400' }, audience.label + ' audience')
                ),
                h('p', { className: 'mt-2 text-sm font-bold leading-relaxed' }, script)
              ),
              h('p', { className: 'mt-3 text-xs leading-relaxed text-slate-400' }, 'Communication readiness is separate from forecast accuracy. Verify the science before treating the script as a model outcome.')
            )
          );
        }
        return h('div', { className: 'mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]' },
          h('div', { className: 'space-y-4' },
            h('div', { className: panelClass + ' p-4' },
              h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Meteorologist briefing'),
              h('h3', { className: 'mt-1 text-xl font-black' }, 'What will happen in the next 6 hours?'),
              h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, scenario.summary),
              h('div', { className: 'mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4' },
                [
                  ['Temperature', current.temperature + '\u00B0C'],
                  ['Dew point', current.dewPoint + '\u00B0C'],
                  ['Pressure', current.pressure + ' hPa'],
                  ['Wind', cardinal(current.windDir) + ' ' + current.windSpeed + ' km/h']
                ].map(function (row) { return h('div', { key: row[0], className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: 'text-xs ' + mutedClass }, row[0]), h('p', { className: 'text-sm font-black' }, row[1])); })
              )
            ),
            carriedEvidencePanel(),
            geographicTerrainEvidencePanel(),
            ensemblePanel(),
            readinessCard(),
            forecastJournalPanel(),
            forecastBroadcastPanel(),
            reasoningPulsePanel(),
            peerReviewPanel(),
            reflectionExitTicketPanel(),
            h('div', { className: panelClass + ' p-4' },
              h('h3', { className: 'text-base font-black' }, '1. Select evidence'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Choose the observations you used. Strong forecasts connect more than one data source.'),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                forecastEvidenceOptions.map(function (item) {
                  var selected = (d.evidence || []).indexOf(item.id) !== -1;
                  return h('button', {
                    key: item.id, type: 'button', onClick: function () { toggleEvidence(item.id); }, 'aria-pressed': selected,
                    className: 'min-h-11 rounded-full border px-3 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none ' + (selected ? 'border-sky-400 bg-sky-700 text-white' : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-sky-50'))
                  }, selected ? '\u2713 ' + item.label : item.label);
                })
              )
            ),
            h('div', { className: panelClass + ' p-4' },
              h('h3', { className: 'text-base font-black' }, '2. Issue your forecast'),
              h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-3' },
                selectField('forecast-precip', 'Precipitation', d.predictionPrecip, [
                  { value: 'none', label: 'None' }, { value: 'rain', label: 'Rain' }, { value: 'snow', label: 'Snow' }, { value: 'mixed', label: 'Wintry mix' }, { value: 'storms', label: 'Thunderstorms' }
                ], function (event) { update({ predictionPrecip: event.target.value, forecastResult: null }); }),
                selectField('forecast-timing', 'Most likely start', d.predictionTiming, [
                  { value: '0-3', label: '0-3 hours' }, { value: '4-6', label: '4-6 hours' }, { value: '7-12', label: '7-12 hours' }, { value: 'after12', label: 'After 12 hours / none' }
                ], function (event) { update({ predictionTiming: event.target.value, forecastResult: null }); }),
                selectField('forecast-hazard', 'Primary hazard', d.predictionHazard, [
                  { value: 'none', label: 'No major hazard' }, { value: 'lightning', label: 'Lightning' }, { value: 'flood', label: 'Flooding' }, { value: 'ice', label: 'Ice / slippery travel' }, { value: 'highWind', label: 'Strong wind' }
                ], function (event) { update({ predictionHazard: event.target.value, forecastResult: null }); })
              ),
              h('div', { className: 'mt-4' },
                selectField('forecast-action', '3. School readiness decision', d.readinessAction, [
                  { value: 'normal', label: 'Continue normal activities' },
                  { value: 'monitor', label: 'Monitor conditions and updates' },
                  { value: 'indoors', label: 'Move activities indoors' },
                  { value: 'avoidTravel', label: 'Avoid flooded routes and low crossings' },
                  { value: 'delayTravel', label: 'Delay travel for icy conditions' },
                  { value: 'shelter', label: 'Shelter away from windows' }
                ], function (event) { update({ readinessAction: event.target.value, forecastResult: null }); })
              ),
              h('div', { className: 'mt-4' },
                selectField('forecast-confidence', '4. How confident are you?', d.forecastConfidence, [
                  { value: '40', label: '40% - Low confidence' },
                  { value: '60', label: '60% - Some confidence' },
                  { value: '80', label: '80% - High confidence' },
                  { value: '95', label: '95% - Very high confidence' }
                ], function (event) { update({ forecastConfidence: event.target.value, forecastResult: null }); })
              ),
              cerComposerPanel(),
              h('label', { htmlFor: 'forecast-reasoning', className: 'mt-4 block' },
                h('span', { className: 'mb-1 block text-xs font-black' }, band === 'K-2' ? 'Why do you think so?' : 'Claim-Evidence-Reasoning note'),
                h('textarea', {
                  id: 'forecast-reasoning', rows: 4, value: d.reasoning || '',
                  onChange: function (event) { update({ reasoning: event.target.value, forecastResult: null }); },
                  'aria-describedby': 'weather-cer-guidance weather-reasoning-count',
                  placeholder: band === 'K-2' ? 'I think... because I noticed...' : 'I predict... My evidence is... This matters because...',
                  className: inputClass
                }),
                h('span', { id: 'weather-reasoning-count', className: 'mt-1 block text-right text-[11px] font-bold ' + (reasoningLength >= reasoningTarget ? emeraldAccentClass : mutedClass) }, reasoningLength + ' / ' + reasoningTarget + ' minimum characters')
              ),
              h('button', { type: 'button', onClick: issueForecast, className: 'mt-4 min-h-11 w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors motion-reduce:transition-none hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none' }, '\uD83D\uDCE1 Verify forecast')
            )
          ),
          h('aside', { className: 'space-y-4' },
            stationPanel(),
            h('div', { className: panelClass + ' p-4', role: 'status', 'aria-live': 'polite' },
              !forecastResult && h('div', null,
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Forecast desk'),
                h('h3', { className: 'mt-1 text-lg font-black' }, 'Awaiting your forecast'),
                h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'Meteorologists combine observations, patterns, and models. A forecast is a testable claim, not a guess.')
              ),
              forecastResult && h('div', null,
                h('div', { className: 'flex items-end justify-between gap-3' },
                  h('div', null, h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Forecast verification'), h('h3', { className: 'text-lg font-black' }, forecastResult.score >= 80 ? 'Strong forecast' : forecastResult.score >= 55 ? 'Developing forecast' : 'Revise and retry')),
                  h('p', { className: 'text-4xl font-black ' + (forecastResult.score >= 80 ? emeraldAccentClass : 'text-amber-400') }, forecastResult.score)
                ),
                h('div', { className: 'mt-3 h-2 overflow-hidden rounded-full bg-slate-700', role: 'progressbar', 'aria-label': 'Forecast score', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': forecastResult.score }, h('div', { className: forecastResult.score >= 80 ? 'h-full bg-emerald-400' : 'h-full bg-amber-400', style: { width: forecastResult.score + '%' } })),
                h('ul', { className: 'mt-4 space-y-2 text-xs leading-relaxed ' + mutedClass }, forecastResult.notes.map(function (note, index) { return h('li', { key: index }, '\u2022 ' + note); })),
                h('div', { className: 'mt-4 rounded-lg p-3 ' + (dark ? 'bg-slate-950/75' : 'bg-sky-50') },
                  h('p', { className: 'text-xs font-black' }, 'Model outcome at +6 hours'),
                  h('p', { className: 'mt-1 text-xs ' + mutedClass },
                    (truth.precip === 'none' ? 'No precipitation' : truth.precip) + ' | ' + truth.timing + ' | ' + truth.hazard + ' hazard. Temperature ' + truth.future.temperature + '\u00B0C, pressure ' + truth.future.pressure + ' hPa.'
                  )
                ),
                forecastResult.calibration && h('div', { className: 'mt-4 rounded-lg border p-3 ' + (forecastResult.calibration.status === 'well' ? (dark ? 'border-violet-700 bg-violet-950/40' : 'border-violet-200 bg-violet-50') : (dark ? 'border-amber-700 bg-amber-950/40' : 'border-amber-200 bg-amber-50')) },
                  h('div', { className: 'flex items-center justify-between gap-2' },
                    h('p', { className: 'text-xs font-black' }, '\uD83C\uDFAF ' + forecastResult.calibration.label),
                    h('span', { className: 'text-xs font-black ' + violetAccentClass }, forecastResult.calibration.selected + '% vs ' + forecastResult.calibration.agreement + '%')
                  ),
                  h('p', { className: 'mt-1 text-xs ' + mutedClass }, forecastResult.calibration.status === 'well' ? 'Your confidence is close to the teaching ensemble agreement.' : forecastResult.calibration.status === 'over' ? 'Your confidence is higher than ensemble agreement. Name what could change the outcome.' : 'The ensemble agrees more strongly than your confidence suggests. Identify the strongest shared signal.')
                ),
                forecastResult.actionCorrect !== null && h('div', { className: 'mt-4 rounded-lg border p-3 ' + (forecastResult.actionCorrect ? (dark ? 'border-emerald-700 bg-emerald-950/40' : 'border-emerald-200 bg-emerald-50') : (dark ? 'border-amber-700 bg-amber-950/40' : 'border-amber-200 bg-amber-50')) },
                  h('p', { className: 'text-xs font-black' }, forecastResult.actionCorrect ? '\u2705 Readiness decision matches the hazard' : '\u26A0\uFE0F Reconsider the readiness decision'),
                  h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Modeled action: ' + ({ normal: 'continue normal activities', monitor: 'monitor conditions', indoors: 'move activities indoors', avoidTravel: 'avoid flooded routes', delayTravel: 'delay icy travel', shelter: 'shelter away from windows' }[forecastResult.expectedAction] || forecastResult.expectedAction) + '.')
                ),
                h('button', { type: 'button', onClick: function () { update({ forecastResult: null }); }, className: buttonClass + ' mt-4 w-full' }, 'Revise forecast')
              )
            )
          )
        );
      }


      function experimentLab() {
        var allowedIds = band === 'K-2' ? ['temp', 'humidity'] : band === '3-5' ? ['temp', 'humidity', 'windSpeed'] : band === '6-8' ? ['temp', 'humidity', 'pressure', 'windSpeed', 'frontSpeed'] : EXPERIMENT_VARIABLES.map(function (item) { return item.id; });
        var allowed = EXPERIMENT_VARIABLES.filter(function (item) { return allowedIds.indexOf(item.id) !== -1; });
        var result = d.experimentResult || null;
        var horizon = d.experimentHour != null ? Number(d.experimentHour) : 6;
        var predictionLabels = { increase: 'Increase', decrease: 'Decrease', steady: 'Stay close' };

        function chooseVariable(id) {
          var config = experimentVariableById(id);
          var bump = Math.max(config.step, Math.round((config.max - config.min) * 0.18 / config.step) * config.step);
          update({
            experimentVariable: id,
            experimentValue: clamp(state[id] + bump, config.min, config.max),
            experimentPrediction: '',
            experimentResult: null
          });
        }

        function comparisonChart() {
          if (!result) return null;
          var metrics = [
            { label: 'Temperature', key: 'temperature', min: -20, max: 45, unit: '\u00B0C' },
            { label: 'Humidity', key: 'humidity', min: 0, max: 100, unit: '%' },
            { label: 'Pressure', key: 'pressure', min: 970, max: 1050, unit: ' hPa' },
            { label: 'Wind speed', key: 'windSpeed', min: 0, max: 110, unit: ' km/h' },
            { label: 'Cloud cover', key: 'cloudCover', min: 0, max: 100, unit: '%' },
            { label: 'Precip. potential', key: 'precipPotential', min: 0, max: 100, unit: '%' }
          ];
          function xFor(value, metric) {
            return 160 + clamp((value - metric.min) / (metric.max - metric.min), 0, 1) * 475;
          }
          var baseColor = dark ? '#94a3b8' : '#475569';
          var testColor = '#38bdf8';
          var textColor = dark ? '#e2e8f0' : '#0f172a';
          var summary = metrics.map(function (metric) {
            return metric.label + ' ' + result.control[metric.key] + ' to ' + result.test[metric.key] + metric.unit;
          }).join(', ');
          return h('svg', {
            viewBox: '0 0 700 330',
            className: 'mt-4 h-auto w-full',
            role: 'img',
            'data-weather-experiment-chart': true,
            'aria-label': 'Controlled experiment comparison at plus ' + result.hour + ' hours: ' + summary
          },
            h('g', null,
              h('circle', { cx: 185, cy: 22, r: 6, fill: baseColor }),
              h('text', { x: 198, y: 26, fill: textColor, fontSize: 12, fontWeight: 700 }, 'Baseline'),
              h('polygon', { points: '287,15 294,22 287,29 280,22', fill: testColor }),
              h('text', { x: 300, y: 26, fill: textColor, fontSize: 12, fontWeight: 700 }, 'One-variable test')
            ),
            metrics.map(function (metric, index) {
              var y = 66 + index * 46;
              var x1 = xFor(result.control[metric.key], metric);
              var x2 = xFor(result.test[metric.key], metric);
              return h('g', { key: metric.key },
                h('text', { x: 145, y: y + 4, textAnchor: 'end', fill: textColor, fontSize: 12, fontWeight: 700 }, metric.label),
                h('line', { x1: 160, y1: y, x2: 635, y2: y, stroke: dark ? '#334155' : '#cbd5e1', strokeWidth: 2 }),
                h('line', { x1: x1, y1: y, x2: x2, y2: y, stroke: testColor, strokeWidth: 4, strokeLinecap: 'round' }),
                h('circle', { cx: x1, cy: y, r: 7, fill: baseColor }),
                h('polygon', { points: x2 + ',' + (y - 8) + ' ' + (x2 + 8) + ',' + y + ' ' + x2 + ',' + (y + 8) + ' ' + (x2 - 8) + ',' + y, fill: testColor }),
                h('text', { x: x1, y: y - 11, textAnchor: 'middle', fill: baseColor, fontSize: 11, fontWeight: 700 }, result.control[metric.key] + metric.unit),
                h('text', { x: x2, y: y + 21, textAnchor: 'middle', fill: testColor, fontSize: 11, fontWeight: 700 }, result.test[metric.key] + metric.unit)
              );
            })
          );
        }

        var effectWord = result ? (result.direction === 'increase' ? 'increase' : result.direction === 'decrease' ? 'decrease' : 'stay close') : '';
        var changeWord = result ? (result.testValue > result.baselineValue ? 'Increasing' : result.testValue < result.baselineValue ? 'Decreasing' : 'Keeping') : '';
        return h('div', { className: 'mx-auto max-w-6xl space-y-4 p-4', 'data-weather-experiment-lab': true },
          h('section', { className: panelClass + ' p-5', 'aria-labelledby': 'weather-experiment-title' },
            h('p', { className: 'text-xs font-black uppercase tracking-widest ' + cyanAccentClass }, 'Controlled investigation'),
            h('h3', { id: 'weather-experiment-title', className: 'mt-1 text-xl font-black' }, 'Change one thing'),
            h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, band === 'K-2' ? 'Change one weather ingredient. Keep the others the same and see what happens.' : 'Isolate one starting variable while every other condition stays fixed. Predict, test, and explain the modeled effect.')
          ),
          h('div', { className: 'grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]' },
            h('section', { className: panelClass + ' space-y-4 p-4', 'aria-label': 'Controlled experiment setup' },
              h('div', { className: 'rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-cyan-50') },
                h('p', { className: 'text-xs font-black uppercase tracking-wide ' + cyanAccentClass }, 'Fair-test rule'),
                h('p', { className: 'mt-1 text-xs font-bold' }, 'Keep all other starting conditions fixed.')
              ),
              h('label', { htmlFor: 'weather-experiment-variable', className: 'block' },
                h('span', { className: 'mb-1 block text-xs font-black' }, '1. Variable to test'),
                h('select', { id: 'weather-experiment-variable', value: experimentVariable, onChange: function (event) { chooseVariable(event.target.value); }, className: inputClass },
                  allowed.map(function (item) { return h('option', { key: item.id, value: item.id }, item.label); })
                )
              ),
              h('div', null,
                h('div', { className: 'mb-1 flex items-center justify-between gap-2 text-xs font-black' },
                  h('label', { htmlFor: 'weather-experiment-value' }, '2. One-variable test value'),
                  h('span', { className: 'font-mono ' + cyanAccentClass }, experimentValue + experimentConfig.unit)
                ),
                h('input', {
                  id: 'weather-experiment-value', type: 'range',
                  min: experimentConfig.min, max: experimentConfig.max, step: experimentConfig.step, value: experimentValue,
                  onChange: function (event) { update({ experimentValue: Number(event.target.value), experimentResult: null }); },
                  className: 'h-6 w-full accent-cyan-500'
                }),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 text-xs' },
                  h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-slate-100') }, h('p', { className: mutedClass }, 'Baseline'), h('p', { className: 'font-black' }, state[experimentVariable] + experimentConfig.unit)),
                  h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-cyan-950/50' : 'bg-cyan-50') }, h('p', { className: mutedClass }, 'Test'), h('p', { className: 'font-black ' + cyanAccentClass }, experimentValue + experimentConfig.unit))
                )
              ),
              h('label', { htmlFor: 'weather-experiment-hour', className: 'block' },
                h('span', { className: 'mb-1 block text-xs font-black' }, '3. Compare at model time'),
                h('select', { id: 'weather-experiment-hour', value: horizon, onChange: function (event) { update({ experimentHour: Number(event.target.value), experimentResult: null }); }, className: inputClass },
                  [3, 6, 12].map(function (hour) { return h('option', { key: hour, value: hour }, 'T +' + hour + ' hours'); })
                )
              ),
              h('fieldset', null,
                h('legend', { className: 'text-xs font-black' }, '4. Predict precipitation potential'),
                h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
                  ['increase', 'decrease', 'steady'].map(function (choice) {
                    var selected = d.experimentPrediction === choice;
                    return h('button', {
                      key: choice, type: 'button', onClick: function () { update({ experimentPrediction: choice, experimentResult: null }); },
                      'aria-pressed': selected,
                      className: 'min-h-11 rounded-lg border px-2 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none ' + (selected ? 'border-cyan-400 bg-cyan-700 text-white' : (dark ? 'border-slate-600 bg-slate-950' : 'border-slate-300 bg-white'))
                    }, predictionLabels[choice]);
                  })
                )
              ),
              h('button', { type: 'button', onClick: performExperiment, className: 'min-h-11 w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-black text-white hover:bg-cyan-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 focus-visible:outline-none' }, '\uD83E\uDDEA Run controlled test')
            ),
            h('section', { className: panelClass + ' p-4', 'aria-live': 'polite', 'data-weather-experiment-result': !!result },
              !result && h('div', { className: 'flex min-h-[300px] items-center justify-center text-center' },
                h('div', { className: 'max-w-md' },
                  h('div', { className: 'text-5xl', 'aria-hidden': true }, '\u2696\uFE0F'),
                  h('h3', { className: 'mt-3 text-lg font-black' }, 'Set up a fair test'),
                  h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'Choose one variable and make a prediction. The comparison will show the baseline and test model at the same future time.')
                )
              ),
              result && h('div', null,
                h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                  h('div', null,
                    h('p', { className: 'text-xs font-black uppercase tracking-widest ' + cyanAccentClass }, 'Experiment result | T +' + result.hour + ' hours'),
                    h('h3', { className: 'mt-1 text-lg font-black' }, result.predictionCorrect ? 'Prediction supported' : 'Revise your explanation')
                  ),
                  h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (result.predictionCorrect ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-800')) }, result.predictionCorrect ? '\u2713 Match' : '\u21BB Different result')
                ),
                comparisonChart(),
                h('div', { className: 'mt-3 rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-cyan-50') },
                  h('p', { className: 'text-xs font-black' }, 'What the model shows'),
                  h('p', { className: 'mt-1 text-sm leading-relaxed ' + mutedClass }, changeWord + ' ' + experimentConfig.label.toLowerCase() + ' from ' + result.baselineValue + result.unit + ' to ' + result.testValue + result.unit + ' made precipitation potential ' + effectWord + ' by ' + Math.abs(result.deltas.precipPotential) + ' percentage points.'),
                  h('p', { className: 'mt-2 text-xs font-bold ' + cyanAccentClass }, band === 'K-2' ? 'Tell a partner what changed and what stayed the same.' : 'Explain the mechanism: How did this variable affect moisture, lift, saturation, clouds, or precipitation?')
                )
              )
            )
          )
        );
      }

      function immersiveWeatherLab() {
        var live = d.liveWeather || null;
        var useLive = d.immersiveDataSource === 'live' && !!live;
        var observationFreshness = live ? liveObservationFreshness(live) : null;
        var observationFreshnessClass = observationFreshness && observationFreshness.current ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100' : observationFreshness && !observationFreshness.stale ? 'border-amber-300/40 bg-amber-300/15 text-amber-100' : 'border-rose-300/40 bg-rose-300/15 text-rose-100';
        var model = projectConditions(state, state.simHour);
        var windDir = useLive ? live.windDir : model.windDir;
        var windSpeed = useLive ? live.windSpeed : model.windSpeed;
        var sceneLabel = useLive ? live.label : scenario.name + ' teaching model';
        var sceneCondition = useLive ? live.condition : (model.precipType === 'none' ? (model.cloudCover >= 65 ? 'Cloudy model conditions' : 'Quiet model conditions') : model.precipType + ' model conditions');
        var values = useLive ? [
          ['Temperature', live.temperature + '\u00B0C'], ['Humidity', live.humidity + '%'], ['Cloud cover', live.cloudCover + '%'],
          ['Pressure', live.pressure + ' hPa'], ['Wind', cardinal(live.windDir) + ' ' + live.windSpeed + ' km/h'], ['Geography', geographyProfile(d.immersiveGeography, state.scenario).label], ['Visibility', live.visibility != null ? Math.round(live.visibility / 100) / 10 + ' km' : 'Not reported']
        ] : [
          ['Temperature', model.temperature + '\u00B0C'], ['Humidity', model.humidity + '%'], ['Cloud cover', model.cloudCover + '%'],
          ['Pressure', model.pressure + ' hPa'], ['Wind', cardinal(model.windDir) + ' ' + model.windSpeed + ' km/h'], ['Geography', geographyProfile(d.immersiveGeography, state.scenario).label], ['Precipitation potential', model.precipPotential + '%']
        ];
        var engineReady = !!dataRoot._threeLoaded;
        var engineError = dataRoot._threeLoadError || d.immersiveRenderError;
        var xrAvailable = !!(window.navigator && window.navigator.xr);
        var immersiveQuality = d.immersiveQuality || 'high';
        var immersiveCameraPreset = d.immersiveCameraPreset || 'overview';
        var immersiveFocus = d.immersiveFocus || 'system';
        var focusDetails = {
          system: { label: 'Full atmospheric system', detail: 'All analytical layers are visible.' },
          front: { label: 'Front dynamics', detail: 'Air masses, the frontal boundary, wind, and stations are isolated.' },
          moisture: { label: 'Moisture and precipitation', detail: 'Clouds, precipitation, wind, and stations are isolated.' },
          stations: { label: 'Surface observations', detail: 'Wind vectors and observation stations are isolated.' }
        };
        var focusDetail = focusDetails[immersiveFocus] || focusDetails.system;
        var geography = geographyProfile(d.immersiveGeography, state.scenario);
        var geographyOptions = ['plains', 'coastal', 'mountain', 'urban'].map(function (id) { return GEOGRAPHY_PROFILES[id]; });
        var geographic = geographicViewState(d);
        var geographicMode = geographic.mode === 'geographic';
        var terrainExaggeration = d.geographicTerrainExaggeration != null ? Number(d.geographicTerrainExaggeration) : 1.35;
        var geographicCameraPreset = d.geographicCameraPreset || 'local';
        var geographicStudyRadius = clamp(d.geographicStudyRadius != null ? Number(d.geographicStudyRadius) : 10, 2, 50);
        var geographicStudyAreaVisible = d.geographicStudyAreaVisible !== false;
        var geographicWindVisible = d.geographicWindVisible !== false;
        var geographicTransectVisible = d.geographicTransectVisible !== false;
        var geographicBuildingsAvailable = d.geographicBuildingsAvailable;
        var geographicBuildings = d.geographicBuildings === true && geographicBuildingsAvailable !== false;
        var geographicTerrainAvailable = d.geographicTerrainAvailable;
        var geographicTerrainCapability = !d.geographicMapReady ? { code: 'loading', label: 'Terrain pending' } : geographicTerrainAvailable === false ? { code: 'degraded', label: 'Base map only' } : { code: 'ready', label: '3D terrain ' + terrainExaggeration + 'x' };
        var geographicAnalysisLensId = d.geographicAnalysisLens === 'custom' ? 'custom' : geographicAnalysisLens(d.geographicAnalysisLens).id;
        var geographicInvestigationPaused = d.geographicInvestigationPaused === true || geographicAnalysisLensId === 'custom';
        var geographicAnalysisLensDetail = geographicAnalysisLensId === 'custom'
          ? { id: 'custom', label: 'Custom view', detail: 'Camera or layers were adjusted manually. The guided investigation is paused until a coordinated view or numbered step is selected.' }
          : geographicAnalysisLens(geographicAnalysisLensId);
        var geographicOverlays = live ? geographicOverlayData(live, geographicStudyRadius) : null;
        var geographicTerrainProbe = d.geographicTerrainProbe && isFinite(Number(d.geographicTerrainProbe.latitude)) && isFinite(Number(d.geographicTerrainProbe.longitude)) && isFinite(Number(d.geographicTerrainProbe.elevation)) ? d.geographicTerrainProbe : null;
        var geographicTerrainWind = geographicTerrainProbe && live ? geographicTerrainWindAnalysis(geographicTerrainProbe, live.windDir) : null;
        var geographicTerrainProfile = Array.isArray(d.geographicTerrainProfile) ? d.geographicTerrainProfile.filter(function (point) { return point && isFinite(Number(point.distanceKm)) && isFinite(Number(point.elevation)); }).map(function (point) { return { distanceKm: Number(point.distanceKm), elevation: Number(point.elevation) }; }) : [];
        var terrainProfileAnalysis = analyzeGeographicTerrainProfile(geographicTerrainProfile);
        var terrainProfileChart = null;
        if (geographicTerrainProfile.length > 1) {
          var terrainChartWidth = 320, terrainChartHeight = 132, terrainChartLeft = 34, terrainChartRight = 10, terrainChartTop = 14, terrainChartBottom = 26;
          var terrainMin = Math.min.apply(null, geographicTerrainProfile.map(function (point) { return point.elevation; }));
          var terrainMax = Math.max.apply(null, geographicTerrainProfile.map(function (point) { return point.elevation; }));
          var terrainSpan = Math.max(1, terrainMax - terrainMin);
          var terrainDistanceMax = Math.max.apply(null, geographicTerrainProfile.map(function (point) { return point.distanceKm; }));
          var terrainX = function (distance) { return terrainChartLeft + (terrainChartWidth - terrainChartLeft - terrainChartRight) * distance / Math.max(1, terrainDistanceMax); };
          var terrainY = function (elevation) { return terrainChartTop + (terrainChartHeight - terrainChartTop - terrainChartBottom) * (1 - (elevation - terrainMin) / terrainSpan); };
          var terrainLinePath = geographicTerrainProfile.map(function (point, index) { return (index ? 'L' : 'M') + terrainX(point.distanceKm).toFixed(1) + ',' + terrainY(point.elevation).toFixed(1); }).join(' ');
          var terrainAreaPath = terrainLinePath + ' L' + terrainX(terrainDistanceMax).toFixed(1) + ',' + (terrainChartHeight - terrainChartBottom) + ' L' + terrainChartLeft + ',' + (terrainChartHeight - terrainChartBottom) + ' Z';
          var terrainSitePoint = geographicTerrainProfile.reduce(function (nearest, point) { return Math.abs(point.distanceKm - terrainDistanceMax / 2) < Math.abs(nearest.distanceKm - terrainDistanceMax / 2) ? point : nearest; }, geographicTerrainProfile[0]);
          terrainProfileChart = { width: terrainChartWidth, height: terrainChartHeight, left: terrainChartLeft, right: terrainChartRight, top: terrainChartTop, bottom: terrainChartBottom, min: terrainMin, max: terrainMax, distanceMax: terrainDistanceMax, linePath: terrainLinePath, areaPath: terrainAreaPath, siteX: terrainX(terrainSitePoint.distanceKm), siteY: terrainY(terrainSitePoint.elevation) };
        }
        var terrainProbeGraphic = null;
        if (geographicTerrainProbe) {
          var probeSiteElevation = isFinite(Number(geographicTerrainProbe.siteElevation)) ? Number(geographicTerrainProbe.siteElevation) : geographic.elevation;
          var probeElevation = Number(geographicTerrainProbe.elevation);
          if (isFinite(probeSiteElevation) && isFinite(probeElevation)) {
            var probeGraphicMin = Math.min(probeSiteElevation, probeElevation);
            var probeGraphicMax = Math.max(probeSiteElevation, probeElevation);
            var probeGraphicSpan = Math.max(20, probeGraphicMax - probeGraphicMin);
            var probeGraphicY = function (elevation) { return 18 + 54 * (1 - (elevation - (probeGraphicMin - probeGraphicSpan * 0.16)) / (probeGraphicSpan * 1.32)); };
            terrainProbeGraphic = {
              width: 320,
              height: 104,
              siteX: 42,
              sampleX: 278,
              siteY: round(probeGraphicY(probeSiteElevation), 1),
              sampleY: round(probeGraphicY(probeElevation), 1),
              siteElevation: Math.round(probeSiteElevation),
              sampleElevation: Math.round(probeElevation)
            };
          }
        }
        var rawGeographicViewport = d.geographicViewport || {};
        var geographicViewport = {
          zoom: isFinite(Number(rawGeographicViewport.zoom)) ? Number(rawGeographicViewport.zoom) : 10.6,
          pitch: isFinite(Number(rawGeographicViewport.pitch)) ? Number(rawGeographicViewport.pitch) : 58,
          bearing: isFinite(Number(rawGeographicViewport.bearing)) ? Number(rawGeographicViewport.bearing) : -18
        };
        var geographicOrientation = geographicOrientationSummary(geographicViewport.bearing);
        if (geographicMode && values[5]) values[5] = ['Coordinates', geographic.latitude.toFixed(3) + ', ' + geographic.longitude.toFixed(3)];
        var tourStep = immersiveTourStep(d.immersiveTourStep);
        var defaultGeographicFieldStep = geographicAnalysisLensId === 'context' ? 'orient' : geographicAnalysisLensId === 'site' ? 'site' : 'terrain';
        var geographicFieldStep = geographicInvestigationStep(d.geographicInvestigationStep || defaultGeographicFieldStep);
        var tourSource = useLive ? 'live observation' : 'teaching model';
        return h('div', { className: 'mx-auto max-w-[1680px] space-y-4 p-3 sm:p-4', 'data-weather-immersive-lab': true },
          h('section', { className: 'overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-950 via-indigo-950/90 to-cyan-950 text-white shadow-2xl' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5' },
              h('div', { className: 'max-w-2xl' },
                h('p', { className: 'text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300' }, 'Atmospheric analysis workspace'),
                h('h3', { className: 'mt-1 text-2xl font-black' }, 'Immersive 3D Weather Space'),
                h('p', { className: 'mt-2 text-sm leading-relaxed text-slate-300' }, geographicMode ? 'Explore the selected location with an open vector map, published administrative labels, hillshade, and 3D elevation. The highlighted site connects the geographic context to the live observation.' : 'A high-fidelity atmospheric digital twin for inspecting air masses, frontal structure, terrain, cloud layers, precipitation, wind vectors, and observation stations. Live observations can drive the scene while the Canvas map remains the evidence-analysis view.')
              ),
              h('div', { className: 'flex flex-wrap items-center gap-2', 'data-weather-immersive-status-bar': true, role: 'status', 'aria-label': geographicMode ? 'Geographic 3D status' : 'Conceptual 3D status' },
                h('span', { className: 'rounded-full bg-cyan-300 px-3 py-1.5 text-[11px] font-black text-cyan-950' }, geographicMode ? (d.geographicMapReady ? '\u25CF Geographic layers ready' : '\u25CB Loading geographic layers') : (engineReady ? '\u25CF 3D engine ready' : '\u25CB Loading 3D engine')),
                h('span', { className: 'rounded-full px-3 py-1.5 text-[11px] font-black ' + (geographicMode ? 'bg-emerald-300 text-emerald-950' : (xrAvailable ? 'bg-violet-300 text-violet-950' : 'bg-white/10 text-slate-300')) }, geographicMode ? 'Open geographic data' : (xrAvailable ? 'WebXR detected' : 'Desktop 3D available')),
                h('span', { className: 'rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-slate-200', 'data-weather-geographic-terrain-capability': geographicMode ? geographicTerrainCapability.code : undefined }, geographicMode ? geographicTerrainCapability.label : (immersiveQuality === 'high' ? 'High fidelity' : immersiveQuality === 'balanced' ? 'Balanced quality' : 'Performance mode'))
              )
            ),
            h('div', { className: 'grid gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1fr)_380px]' },
              h('div', { className: 'relative min-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.08)] md:min-h-[600px] xl:min-h-[680px]' },
                h('canvas', { ref: immersiveCanvasRef, hidden: geographicMode, className: 'block h-[min(78vh,780px)] min-h-[500px] w-full md:min-h-[600px] xl:min-h-[680px]', 'data-weather-immersive-canvas': true, role: 'img', 'aria-label': 'Interactive three-dimensional weather scene for ' + sceneLabel + '. ' + sceneCondition + '. Use pointer or touch to orbit and zoom.' }),
                !geographicMode && h('div', { className: 'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-cyan-950/10 via-transparent to-slate-950/50', 'data-weather-conceptual-vignette': true, 'aria-hidden': true }),
                geographicMode && h('div', { ref: geographicMapRef, className: 'absolute inset-0 min-h-[500px] w-full md:min-h-[600px] xl:min-h-[680px]', 'data-weather-geographic-map': true, role: 'region', 'aria-label': 'Interactive open geographic map and 3D terrain centered on ' + geographic.label + '. Use map controls, drag, or keyboard navigation to explore.', 'aria-describedby': 'weather-geographic-map-instructions' }),
                geographicMode && h('div', { className: 'pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/45', 'data-weather-geographic-vignette': true, 'aria-hidden': true }),
                geographicMode && h('div', { className: 'pointer-events-none absolute left-3 right-14 top-3 z-20 sm:right-auto', 'data-weather-geographic-camera-controls': true },
                  h('div', { className: 'pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-slate-950/88 p-1.5 shadow-2xl backdrop-blur-md', role: 'group', 'aria-label': 'Geographic camera views', 'data-weather-geographic-command-bar': true },
                    h('span', { className: 'px-2 text-[10px] font-black uppercase tracking-widest text-slate-400', 'aria-hidden': true }, 'View'),
                    [
                      { id: 'region', icon: '\u25A7', label: 'Region' },
                      { id: 'local', icon: '\u2316', label: 'Local' },
                      { id: 'site', icon: '\u25CE', label: 'Site' }
                    ].map(function (view) {
                      var active = geographicCameraPreset === view.id;
                      return h('button', {
                        key: view.id, type: 'button', disabled: !d.geographicMapReady,
                        onClick: function () { setGeographicCameraPreset(view.id); },
                        'aria-label': view.label + ' camera view',
                        'aria-pressed': active,
                        className: 'flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:opacity-40 ' + (active ? 'border-emerald-300 bg-emerald-300 text-emerald-950 shadow-lg' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10')
                      }, h('span', { className: 'text-sm', 'aria-hidden': true }, view.icon), h('span', null, view.label));
                    })
                  )
                ),
                geographicMode && h('div', { className: 'pointer-events-none absolute left-3 top-[72px] z-20 rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur-md', 'data-weather-geographic-legend': true, role: 'group', 'aria-label': 'Geographic layer legend' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-300' }, 'Map legend'),
                  h('div', { className: 'mt-1.5 space-y-1 text-[10px] font-bold text-slate-100' },
                    h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400', 'aria-hidden': true }), h('span', null, 'Observation site')),
                    h('div', { className: 'flex items-center gap-2 ' + (geographicStudyAreaVisible ? '' : 'opacity-45') }, h('span', { className: 'h-2.5 w-4 rounded-sm border-2 border-amber-300 bg-amber-300/10', 'aria-hidden': true }), h('span', null, 'Study area ' + (geographicStudyAreaVisible ? 'on' : 'off'))),
                    h('div', { className: 'flex items-center gap-2 ' + (geographicWindVisible ? '' : 'opacity-45') }, h('span', { className: 'text-sm leading-none text-sky-300', style: { transform: 'rotate(' + (geographicOverlays ? geographicOverlays.downwindBearing : 0) + 'deg)' }, 'aria-hidden': true }, '\u2191'), h('span', null, 'Downwind ' + (geographicWindVisible ? 'on' : 'off'))),
                    h('div', { className: 'flex items-center gap-2 ' + (geographicTransectVisible ? '' : 'opacity-45') }, h('span', { className: 'w-4 border-t-2 border-dashed border-violet-300', 'aria-hidden': true }), h('span', null, 'Transect ' + (geographicTransectVisible ? 'on' : 'off'))),
                    geographicTerrainProbe && h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-400', 'aria-hidden': true }), h('span', null, 'Terrain sample'))
                  ),
                  h('div', { className: 'mt-2 flex items-center gap-2 border-t border-white/10 pt-1.5', 'data-weather-geographic-orientation': true, role: 'img', 'aria-label': geographicOrientation.label },
                    h('span', { className: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/20 text-[11px] font-black text-slate-100', style: { transform: 'rotate(' + geographicOrientation.northRotation + 'deg)' }, 'aria-hidden': true }, '\u2191'),
                    h('span', { className: 'text-[10px] font-bold text-slate-300' }, 'N | ' + geographicOrientation.label)
                  ),
                  h('p', { className: 'mt-1 text-[10px] font-bold text-slate-300', 'data-weather-geographic-telemetry': true }, 'Zoom ' + geographicViewport.zoom.toFixed(1) + ' | Tilt ' + Math.round(geographicViewport.pitch) + '\u00B0 | Bearing ' + Math.round(geographicViewport.bearing) + '\u00B0'),
                  h('p', { id: 'weather-geographic-map-instructions', className: 'mt-2 max-w-[220px] border-t border-white/10 pt-1.5 text-[11px] leading-relaxed text-slate-300' }, 'Keyboard: focus the map, use arrow keys to pan and plus or minus to zoom. Use Sample map center to inspect terrain without a pointer.')
                ),
                !geographicMode && h('div', { className: 'pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2' },
                  h('div', { className: 'pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-slate-950/85 p-1.5 shadow-2xl backdrop-blur-md', role: 'group', 'aria-label': '3D camera views', 'data-weather-camera-controls': true, 'data-weather-conceptual-command-bar': true },
                    h('span', { className: 'px-2 text-[10px] font-black uppercase tracking-widest text-slate-400', 'aria-hidden': true }, 'View'),
                    [
                      { id: 'overview', icon: '\u25A7', label: 'Overview' },
                      { id: 'front', icon: '\u25B3', label: 'Front section' },
                      { id: 'surface', icon: '\u25CE', label: 'Surface' }
                    ].map(function (view) {
                      var active = immersiveCameraPreset === view.id;
                      return h('button', {
                        key: view.id,
                        type: 'button',
                        disabled: !engineReady || !!engineError,
                        onClick: function () { setImmersiveCameraPreset(view.id); },
                        'aria-label': view.label + ' camera view',
                        'aria-pressed': active,
                        className: 'flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:opacity-40 ' + (active ? 'border-cyan-300 bg-cyan-300 text-cyan-950 shadow-lg' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10')
                      }, h('span', { className: 'text-sm', 'aria-hidden': true }, view.icon), h('span', null, view.label));
                    })
                  ),
                  h('div', {
                    className: 'pointer-events-none grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-white/15 bg-slate-950/85 px-4 py-3 shadow-2xl backdrop-blur-md sm:grid-cols-4',
                    'data-weather-scene-hud': true,
                    'data-weather-scene-instruments': true,
                    role: 'group',
                    'aria-label': (useLive ? 'Live observation' : 'Teaching model hour ' + state.simHour) + '. Temperature ' + (useLive ? live.temperature : model.temperature) + ' degrees Celsius. Pressure ' + (useLive ? live.pressure : model.pressure) + ' hectopascals. Wind ' + cardinal(windDir) + ' ' + windSpeed + ' kilometers per hour.'
                  },
                    [
                      [useLive ? 'Observed' : 'Model hour', useLive ? (live.observedAt || 'Latest') : 'T+' + state.simHour + ' h'],
                      ['Temperature', (useLive ? live.temperature : model.temperature) + '\u00B0C'],
                      ['Pressure', (useLive ? live.pressure : model.pressure) + ' hPa'],
                      ['Wind', cardinal(windDir) + ' ' + windSpeed + ' km/h']
                    ].map(function (metric, index) {
                      return h('div', { key: metric[0], className: index === 3 ? 'flex items-center gap-2' : '' },
                        index === 3 && h('span', { className: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-base text-cyan-200', style: { transform: 'rotate(' + windDir + 'deg)' }, 'aria-hidden': true }, '\u2191'),
                        h('div', { className: 'min-w-0' },
                          h('p', { className: 'truncate text-[11px] font-bold uppercase tracking-wide text-slate-400' }, metric[0]),
                          h('p', { className: 'mt-0.5 truncate text-xs font-black text-white' }, metric[1])
                        )
                      );
                    })
                  )
                ),
                !geographicMode && !engineReady && !engineError && h('div', { className: 'absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 text-center' }, h('div', { className: 'max-w-sm p-6' }, h('div', { className: 'mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300', 'aria-hidden': true }), h('p', { className: 'mt-4 text-sm font-black' }, 'Loading the 3D atmosphere engine...'), h('p', { className: 'mt-1 text-xs text-slate-400' }, 'The Canvas 2D map remains available if WebGL cannot load.'))),
                !geographicMode && engineError && h('div', { className: 'absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6 text-center', role: 'alert' }, h('div', { className: 'max-w-md' }, h('p', { className: 'text-base font-black' }, '3D view unavailable'), h('p', { className: 'mt-2 text-sm text-slate-300' }, engineError), h('button', { type: 'button', onClick: function () { update({ tab: 'map' }); }, className: 'mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-black text-white' }, 'Return to 2D Canvas map'))),
                geographicMode && (d.geographicMapLoading || (!d.geographicMapReady && !d.geographicMapError)) && h('div', { className: 'absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 text-center', role: 'status', 'aria-live': 'polite' }, h('div', { className: 'max-w-sm p-6' }, h('div', { className: 'mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-300/20 border-t-emerald-300', 'aria-hidden': true }), h('p', { className: 'mt-4 text-sm font-black' }, 'Loading open geographic layers...'), h('p', { className: 'mt-1 text-xs text-slate-400' }, 'OpenFreeMap, OpenStreetMap labels, and 3D terrain load only in this opt-in mode.'))),
                geographicMode && d.geographicMapError && h('div', { className: 'absolute inset-0 z-10 flex items-center justify-center bg-slate-950/95 p-6 text-center', role: 'alert' }, h('div', { className: 'max-w-md' }, h('p', { className: 'text-base font-black' }, 'Geographic view unavailable'), h('p', { className: 'mt-2 text-sm text-slate-300' }, d.geographicMapError), h('div', { className: 'mt-4 flex flex-wrap items-center justify-center gap-2' },
                  h('button', { type: 'button', onClick: function () { update({ geographicMapError: '', geographicMapAttempt: (d.geographicMapAttempt || 0) + 1 }); }, className: 'min-h-11 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950' }, 'Retry loading'),
                  h('button', { type: 'button', onClick: function () { update({ immersiveSceneMode: 'conceptual', geographicMapError: '' }); }, className: 'min-h-11 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-cyan-950' }, 'Use conceptual 3D instead')))),
                !geographicMode && h('div', { className: 'pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2' },
                  h('div', { className: 'rounded-xl bg-slate-950/75 px-3 py-2 backdrop-blur-sm' }, h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-cyan-300' }, useLive ? observationFreshness.label + ' scene' : 'Teaching model scene'), h('p', { className: 'text-xs font-black' }, sceneLabel)),
                  h('div', { className: 'rounded-xl bg-slate-950/75 px-3 py-2 text-right text-[11px] text-slate-300 backdrop-blur-sm' }, 'Drag to orbit | Scroll or pinch to zoom'),
h('div', { className: 'rounded-xl border border-cyan-300/30 bg-slate-950/78 px-4 py-3 text-left shadow-2xl backdrop-blur-md', 'data-weather-tour-overlay': true },
                    h('p', { className: 'text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300' }, '3D investigation step ' + (tourStep.index + 1) + ' of ' + tourStep.total),
                    h('p', { className: 'mt-1 text-sm font-black text-white' }, tourStep.label),
                    h('p', { className: 'mt-1 text-xs leading-relaxed text-slate-300' }, tourStep.prompt)
                  )
                ),
                geographicMode && h('div', { className: 'pointer-events-none absolute bottom-8 left-3 right-3 z-10 rounded-2xl border border-white/15 bg-slate-950/88 px-4 py-3 shadow-2xl backdrop-blur-md sm:right-auto sm:max-w-[560px]', 'data-weather-geographic-hud': true, role: 'group', 'aria-label': geographicObservationSummary(live) },
                  h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
                    h('div', { className: 'min-w-0' },
                      h('p', { className: 'text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300' }, 'Observation command display'),
                      h('p', { className: 'mt-0.5 truncate text-sm font-black text-white' }, geographic.label),
                      h('p', { className: 'mt-0.5 text-[11px] text-slate-400' }, geographic.latitude.toFixed(4) + ', ' + geographic.longitude.toFixed(4) + (geographic.elevation != null ? ' | Site ' + geographic.elevation + ' m' : ''))
                    ),
                    h('div', { className: 'flex flex-wrap justify-end gap-1.5' },
                      h('span', { className: 'rounded-full border px-2.5 py-1 text-[11px] font-black ' + observationFreshnessClass, 'data-weather-observation-freshness': observationFreshness.code, 'aria-label': observationFreshness.label + '. ' + observationFreshness.detail }, observationFreshness.badge),
                      h('span', { className: 'rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-black text-slate-100' }, live.condition)
                    )
                  ),
                  h('div', { className: 'mt-3 flex items-center gap-3' },
                    geographicOverlays && h('svg', { viewBox: '0 0 96 96', className: 'h-20 w-20 shrink-0 overflow-visible', role: 'img', 'aria-labelledby': 'weather-wind-compass-title weather-wind-compass-desc', 'data-weather-wind-compass': true },
                      h('title', { id: 'weather-wind-compass-title' }, 'Observed wind compass'),
                      h('desc', { id: 'weather-wind-compass-desc' }, 'Wind arrives from ' + cardinal(live.windDir) + ' and flows toward ' + cardinal(geographicOverlays.downwindBearing) + ' at ' + live.windSpeed + ' kilometers per hour.'),
                      h('circle', { cx: 48, cy: 48, r: 37, fill: '#020617', fillOpacity: 0.72, stroke: '#64748b', strokeWidth: 1 }),
                      h('circle', { cx: 48, cy: 48, r: 28, fill: 'none', stroke: '#334155', strokeWidth: 1, strokeDasharray: '2 3' }),
                      h('line', { x1: 48, y1: 15, x2: 48, y2: 81, stroke: '#334155', strokeWidth: 1 }),
                      h('line', { x1: 15, y1: 48, x2: 81, y2: 48, stroke: '#334155', strokeWidth: 1 }),
                      h('text', { x: 48, y: 8, textAnchor: 'middle', fill: '#e2e8f0', fontSize: 8, fontWeight: 500 }, 'N'),
                      h('text', { x: 89, y: 51, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, 'E'),
                      h('text', { x: 48, y: 94, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, 'S'),
                      h('text', { x: 7, y: 51, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, 'W'),
                      h('g', { transform: 'rotate(' + geographicOverlays.downwindBearing + ' 48 48)' },
                        h('line', { x1: 48, y1: 63, x2: 48, y2: 20, stroke: '#38bdf8', strokeWidth: 4, strokeLinecap: 'round' }),
                        h('path', { d: 'M48 12 L41 24 L55 24 Z', fill: '#7dd3fc', stroke: '#e0f2fe', strokeWidth: 1 })
                      ),
                      h('circle', { cx: 48, cy: 48, r: 5, fill: '#0ea5e9', stroke: '#e0f2fe', strokeWidth: 2 })
                    ),
                    h('div', { className: 'grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4', 'data-weather-observation-instruments': true, role: 'group', 'aria-label': 'Live observation instruments' },
                      [
                        ['Temperature', live.temperature + '\u00B0C'],
                        ['Relative humidity', live.humidity + '%'],
                        ['Pressure', live.pressure + ' hPa'],
                        ['Visibility', live.visibility != null ? Math.round(live.visibility / 100) / 10 + ' km' : 'Not reported']
                      ].map(function (metric) {
                        return h('div', { key: metric[0], className: 'min-w-0' },
                          h('p', { className: 'truncate text-[11px] font-bold uppercase tracking-wide text-slate-400' }, metric[0]),
                          h('p', { className: 'mt-0.5 text-xs font-black text-white' }, metric[1])
                        );
                      })
                    )
                  ),
                  geographicOverlays && h('div', { className: 'mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[11px]' },
                    h('span', { className: 'font-black text-sky-200' }, 'FROM ' + cardinal(live.windDir) + ' ' + live.windSpeed + ' km/h'),
                    h('span', { className: 'font-black text-cyan-100' }, 'TO ' + cardinal(geographicOverlays.downwindBearing)),
                    h('span', { className: 'text-slate-400' }, 'Observed ' + (live.observedAt || 'latest') + (live.timezone ? ' ' + live.timezone : '')),
                    h('span', { className: observationFreshness.current ? 'text-emerald-200' : observationFreshness.stale ? 'text-rose-200' : 'text-amber-200' }, observationFreshness.detail)
                  ),
                  geographicOverlays && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-400' }, geographicOverlays.windDistanceKm + ' km teaching vector scaled from observed speed; not a forecast footprint.'),
                  geographicTerrainProbe && h('p', { className: 'mt-2 border-l-2 border-rose-300/60 pl-2 text-[11px] font-bold text-rose-200', 'data-weather-terrain-probe-hud': true }, 'Terrain sample ' + Number(geographicTerrainProbe.elevation).toFixed(0) + ' m | ' + Number(geographicTerrainProbe.distanceKm).toFixed(2) + ' km ' + geographicTerrainProbe.direction + ' of site' + (geographicTerrainWind ? ' | ' + geographicTerrainWind.position : ''))
                )
              ),
              h('aside', { className: 'min-w-0 space-y-3', 'data-weather-immersive-control-rail': true },
                h('section', { className: 'rounded-xl border border-emerald-300/25 bg-emerald-950/20 p-4', 'data-weather-scene-mode': true },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-emerald-300' }, 'Immersive scene mode'),
                  h('div', { className: 'mt-2 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Immersive scene mode' },
                    h('button', { type: 'button', onClick: function () { update({ immersiveSceneMode: 'conceptual', geographicMapError: '' }); }, 'aria-pressed': !geographicMode, className: 'flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-black ' + (!geographicMode ? 'border-cyan-300 bg-cyan-300 text-cyan-950 shadow-lg' : 'border-white/10 bg-white/5 text-white') }, h('span', { className: 'text-base', 'aria-hidden': true }, '\u25C8'), h('span', null, 'Conceptual 3D')),
                    h('button', { type: 'button', disabled: !geographic.available, onClick: function () { update({ immersiveSceneMode: 'geographic', immersiveDataSource: 'live', geographicMapError: '' }); }, 'aria-pressed': geographicMode, 'aria-describedby': 'weather-geographic-mode-help', className: 'flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 ' + (geographicMode ? 'border-emerald-300 bg-emerald-300 text-emerald-950 shadow-lg' : 'border-white/10 bg-white/5 text-white') }, h('span', { className: 'text-base', 'aria-hidden': true }, '\u231E'), h('span', null, 'Geographic terrain'))
                  ),
                  h('p', { id: 'weather-geographic-mode-help', className: 'mt-2 text-[11px] leading-relaxed text-slate-300' }, geographic.available ? 'Opt-in live map centered on ' + geographic.label + '. Switching modes contacts the approved map and terrain providers.' : 'Load a live location below to enable the open geographic map. Nothing loads automatically.')
                ),
                h('section', { className: 'rounded-xl border border-white/10 bg-white/5 p-4', 'data-weather-immersive-source': true },
                  h('div', { className: 'flex items-start justify-between gap-2' }, h('div', null, h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-cyan-300' }, geographicMode ? 'Mapped observation' : 'Scene data'), h('h4', { className: 'text-sm font-black' }, geographicMode ? geographic.label : (useLive ? observationFreshness.label : 'Teaching model'))), h('span', { className: 'rounded-full border px-2 py-1 text-[11px] font-black ' + (useLive ? observationFreshnessClass : 'border-white/10 bg-white/10 text-slate-200'), 'data-weather-source-freshness': useLive ? observationFreshness.code : 'model' }, geographicMode ? 'MAP \u2022 ' + observationFreshness.badge : (useLive ? observationFreshness.badge : 'MODEL'))),
                  !geographicMode && h('div', { className: 'mt-3 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Immersive weather data source' },
                    h('button', { type: 'button', onClick: function () { update({ immersiveDataSource: 'model' }); }, 'aria-pressed': !useLive, className: 'min-h-11 rounded-lg border px-3 py-2 text-[11px] font-black ' + (!useLive ? 'border-cyan-300 bg-cyan-300 text-cyan-950' : 'border-white/10 bg-white/5') }, 'Teaching model'),
                    h('button', { type: 'button', disabled: !live, onClick: function () { update({ immersiveDataSource: 'live' }); }, 'aria-pressed': useLive, className: 'min-h-11 rounded-lg border px-3 py-2 text-[11px] font-black disabled:opacity-40 ' + (useLive ? 'border-emerald-300 bg-emerald-300 text-emerald-950' : 'border-white/10 bg-white/5') }, live ? (observationFreshness.current ? 'Use live weather' : 'Use saved observation') : 'Load live weather')
                  ),
!geographicMode && h('label', { htmlFor: 'weather-immersive-geography', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, 'Conceptual terrain base',
                    h('select', {
                      id: 'weather-immersive-geography',
                      value: geography.id,
                      onChange: function (event) { update({ immersiveGeography: event.target.value }); },
                      className: 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40'
                    },
                      geographyOptions.map(function (item) { return h('option', { key: item.id, value: item.id }, item.label); })
                    )
                  ),
                  !geographicMode && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300', 'data-weather-geography-status': true }, geography.detail),
                  !geographicMode && h('label', { htmlFor: 'weather-immersive-quality', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, 'Rendering quality',
                    h('select', {
                      id: 'weather-immersive-quality',
                      value: immersiveQuality,
                      onChange: function (event) { update({ immersiveQuality: event.target.value }); },
                      className: 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40'
                    },
                      h('option', { value: 'performance' }, 'Performance'),
                      h('option', { value: 'balanced' }, 'Balanced'),
                      h('option', { value: 'high' }, 'High fidelity')
                    )
                  ),
                  !geographicMode && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, immersiveQuality === 'high' ? 'Full terrain detail, atmospheric shading, soft shadows, and denser particles.' : immersiveQuality === 'balanced' ? 'Reduced geometry with full lighting and shadows.' : 'Lower pixel density and particle count for older devices.'),
                  !geographicMode && h('label', { htmlFor: 'weather-immersive-focus', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, 'Analysis focus',
                    h('select', {
                      id: 'weather-immersive-focus',
                      value: immersiveFocus,
                      onChange: function (event) { applyImmersiveFocus(event.target.value); },
                      className: 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40'
                    },
                      h('option', { value: 'system' }, 'Full atmospheric system'),
                      h('option', { value: 'front' }, 'Front dynamics'),
                      h('option', { value: 'moisture' }, 'Moisture and precipitation'),
                      h('option', { value: 'stations' }, 'Surface observations')
                    )
                  ),
                  !geographicMode && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300', role: 'status', 'aria-live': 'polite', 'data-weather-focus-status': true }, focusDetail.detail),
                  geographicMode && h('div', { className: 'mt-3 rounded-xl border border-emerald-300/20 bg-slate-950/45 p-3', 'data-weather-geographic-analysis-lenses': true },
                    h('div', { className: 'flex items-center justify-between gap-3' },
                      h('div', null,
                        h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-emerald-300' }, 'Analysis view'),
                        h('p', { className: 'mt-0.5 text-[11px] text-slate-400' }, 'Coordinate camera + evidence layers')
                      ),
                      h('span', { className: 'rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-black text-slate-200' }, geographicAnalysisLensDetail.label)
                    ),
                    h('div', { className: 'mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3', role: 'group', 'aria-label': 'Geographic analysis views' },
                      GEOGRAPHIC_ANALYSIS_LENSES.map(function (lens) {
                        var active = geographicAnalysisLensId === lens.id;
                        var lensView = geographicCameraView(lens.camera);
                        return h('button', {
                          key: lens.id,
                          type: 'button',
                          disabled: !d.geographicMapReady,
                          onClick: function () { applyGeographicAnalysisLens(lens.id, { geographicInvestigationStep: lens.id === 'context' ? 'orient' : lens.id === 'site' ? 'site' : 'terrain' }); },
                          'aria-pressed': active,
                          'aria-describedby': 'weather-geographic-analysis-status',
                          className: 'group flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-col sm:justify-center sm:text-center xl:flex-row xl:justify-start xl:text-left 2xl:flex-col 2xl:justify-center 2xl:text-center ' + (active ? 'border-emerald-300 bg-emerald-300 text-emerald-950 shadow-lg shadow-emerald-950/30' : 'border-white/15 bg-white/5 text-slate-100 hover:border-emerald-300/40 hover:bg-white/10')
                        },
                          h('span', { className: 'text-xl leading-none', 'aria-hidden': true }, lens.icon),
                          h('span', { className: 'min-w-0' },
                            h('span', { className: 'block text-[11px] font-black leading-tight' }, lens.label),
                            h('span', { className: 'mt-0.5 block text-[11px] leading-tight opacity-75' }, lensView.id.charAt(0).toUpperCase() + lensView.id.slice(1) + ' camera')
                          )
                        );
                      })
                    ),
                    h('p', { id: 'weather-geographic-analysis-status', className: 'mt-3 border-l-2 border-emerald-300/50 pl-2 text-[11px] leading-relaxed text-slate-300', role: 'status', 'aria-live': 'polite' }, geographicAnalysisLensDetail.detail)
                  ),
                  geographicMode && h('div', { className: 'mt-4 flex items-center gap-2 border-t border-white/10 pt-3' },
                    h('span', { className: 'h-px flex-1 bg-white/10', 'aria-hidden': true }),
                    h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-slate-400' }, 'Fine-tune layers'),
                    h('span', { className: 'h-px flex-1 bg-white/10', 'aria-hidden': true })
                  ),
                  geographicMode && h('label', { htmlFor: 'weather-geographic-exaggeration', className: 'mt-3 block text-[11px] font-black text-emerald-200' }, 'Terrain emphasis',
                    h('select', { id: 'weather-geographic-exaggeration', value: String(terrainExaggeration), disabled: !d.geographicMapReady || geographicTerrainAvailable === false, onChange: function (event) { setGeographicTerrainExaggeration(event.target.value); }, className: 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-50' },
                      h('option', { value: '1' }, 'Natural elevation (1x)'),
                      h('option', { value: '1.35' }, 'Classroom emphasis (1.35x)'),
                      h('option', { value: '2' }, 'Strong emphasis (2x)')
                    ),
                    geographicTerrainAvailable === false && h('span', { className: 'mt-1 block text-[11px] font-normal leading-relaxed text-amber-200', 'data-weather-terrain-degraded-help': true }, 'Terrain tiles did not load. The open vector map, study area, and wind overlays remain available.')
                  ),
                  geographicMode && h('label', { htmlFor: 'weather-geographic-radius', className: 'mt-3 block text-[11px] font-black text-emerald-200' }, 'Study-area radius',
                    h('select', { id: 'weather-geographic-radius', value: String(geographicStudyRadius), disabled: !d.geographicMapReady, onChange: function (event) { setGeographicStudyRadius(event.target.value); }, className: 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-50' },
                      [5, 10, 25, 50].map(function (radius) { return h('option', { key: radius, value: String(radius) }, radius + ' km radius'); })
                    )
                  ),
                  geographicMode && h('div', { className: 'mt-3 grid grid-cols-3 gap-2', role: 'group', 'aria-label': 'Geographic overlay visibility', 'data-weather-geographic-layer-controls': true },
                    [
                      { id: 'studyArea', icon: '\u25EF', label: 'Study area', visible: geographicStudyAreaVisible, activeClass: 'border-amber-300/60 bg-amber-300/15 text-amber-100' },
                      { id: 'wind', icon: '\u2197', label: 'Wind vector', visible: geographicWindVisible, activeClass: 'border-sky-300/60 bg-sky-300/15 text-sky-100' },
                      { id: 'transect', icon: '\u223F', label: 'Terrain profile', visible: geographicTransectVisible, activeClass: 'border-violet-300/60 bg-violet-300/15 text-violet-100' }
                    ].map(function (layer) {
                      return h('button', {
                        key: layer.id,
                        type: 'button',
                        disabled: !d.geographicMapReady,
                        onClick: function () { setGeographicOverlayVisibility(layer.id, !layer.visible); },
                        'aria-pressed': layer.visible,
                        className: 'flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 ' + (layer.visible ? layer.activeClass : 'border-white/15 bg-white/5 text-slate-300')
                      },
                        h('span', { className: 'text-base leading-none', 'aria-hidden': true }, layer.icon),
                        h('span', { className: 'mt-1 leading-tight' }, layer.label),
                        h('span', { className: 'mt-0.5 text-[11px] uppercase tracking-wide opacity-70', 'aria-hidden': true }, layer.visible ? 'On' : 'Off')
                      );
                    })
                  ),
                  geographicMode && h('button', {
                    type: 'button', disabled: !d.geographicMapReady || geographicBuildingsAvailable === false, onClick: function () { setGeographicBuildings(!geographicBuildings); },
                    'aria-pressed': geographicBuildings, 'aria-describedby': 'weather-geographic-buildings-help',
                    className: 'mt-3 flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 ' + (geographicBuildings ? 'border-emerald-300/60 bg-emerald-300/15 text-emerald-100' : 'border-white/15 bg-white/5 text-slate-200')
                  }, h('span', null, 'Real 3D buildings'), h('span', { 'aria-hidden': true }, !d.geographicMapReady ? 'Loading' : geographicBuildingsAvailable === false ? 'Unavailable' : geographicBuildings ? 'On' : 'Off')),
                  geographicMode && h('p', { id: 'weather-geographic-buildings-help', className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, !d.geographicMapReady ? 'Map controls unlock after geographic terrain and evidence layers finish loading.' : geographicBuildingsAvailable === false ? 'The current open map style does not provide a compatible 3D building layer. Terrain and other evidence layers remain available.' : geographicBuildingsAvailable == null ? 'Checking the open map style for compatible OpenStreetMap building footprints.' : 'Compatible OpenStreetMap building footprints appear in the street-scale Site view.'),
                  !geographicMode && h('div', { className: 'mt-3 grid grid-cols-2 gap-2' }, values.map(function (metric) { return h('div', { key: metric[0], className: 'rounded-lg bg-black/20 p-2' }, h('p', { className: 'text-[11px] text-slate-300' }, metric[0]), h('p', { className: 'mt-0.5 text-xs font-black' }, metric[1])); })),
                  h('p', { className: 'mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-300' }, sceneCondition + (useLive && live.observedAt ? ' | Observed ' + live.observedAt + (live.timezone ? ' ' + live.timezone : '') + '.' : '.'))
                ),
!geographicMode && h('section', { className: 'rounded-xl border border-cyan-300/25 bg-cyan-950/20 p-4', 'data-weather-immersive-tour': true },
                  h('div', { className: 'flex items-start justify-between gap-3' },
                    h('div', null, h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-cyan-300' }, 'Guided investigation'), h('h4', { className: 'text-sm font-black' }, tourStep.label)),
                    h('span', { className: 'rounded-full bg-cyan-300 px-2 py-1 text-[11px] font-black text-cyan-950' }, (tourStep.index + 1) + '/' + tourStep.total)
                  ),
                  h('p', { className: 'mt-2 text-xs leading-relaxed text-slate-300', 'data-weather-tour-prompt': true }, tourStep.prompt),
                  h('p', { className: 'mt-1 text-[11px] leading-relaxed text-cyan-100' }, tourStep.evidence),
                  h('div', { className: 'mt-3 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Immersive guided investigation steps' },
                    IMMERSIVE_TOUR_STEPS.map(function (step) {
                      var active = step.id === tourStep.id;
                      return h('button', {
                        key: step.id, type: 'button', onClick: function () { openImmersiveTourStep(step.id); }, 'aria-pressed': active,
                        className: 'min-h-11 rounded-lg border px-2 py-2 text-left text-[11px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ' + (active ? 'border-cyan-300 bg-cyan-300 text-cyan-950' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10')
                      }, step.label);
                    })
                  ),
                  h('button', { type: 'button', onClick: function () { openImmersiveTourStep(tourStep.nextId); }, className: 'mt-3 min-h-11 w-full rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-cyan-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white' }, 'Next investigation step'),
                  h('label', { htmlFor: 'weather-immersive-reflection', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, '3D evidence note',
                    h('textarea', { id: 'weather-immersive-reflection', value: d.immersiveReflection || '', onChange: function (event) { update({ immersiveReflection: event.target.value }); }, rows: 3, placeholder: 'I think the ' + tourSource + ' suggests ___ because I observed ___.', className: 'mt-1 min-h-[92px] w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-normal text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40' })
                  )
                ),
                geographicMode && h('section', { className: 'rounded-xl border border-emerald-300/25 bg-gradient-to-br from-emerald-950/35 to-sky-950/25 p-4', 'data-weather-geographic-investigation': true, 'aria-labelledby': 'weather-geographic-investigation-title' },
                  h('div', { className: 'flex items-start justify-between gap-3' },
                    h('div', null,
                      h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-emerald-300' }, 'Guided field investigation'),
                      h('h4', { id: 'weather-geographic-investigation-title', className: 'mt-1 text-sm font-black' }, geographicInvestigationPaused ? 'Custom exploration' : geographicFieldStep.label)
                    ),
                    h('span', { className: 'rounded-full px-2 py-1 text-[11px] font-black ' + (geographicInvestigationPaused ? 'bg-amber-300 text-amber-950' : 'bg-emerald-300 text-emerald-950'), 'aria-label': geographicInvestigationPaused ? 'Guided investigation paused' : 'Step ' + (geographicFieldStep.index + 1) + ' of ' + geographicFieldStep.total }, geographicInvestigationPaused ? 'Paused' : (geographicFieldStep.index + 1) + '/' + geographicFieldStep.total)
                  ),
                  h('p', { id: 'weather-geographic-investigation-prompt', className: 'mt-3 text-xs font-bold leading-relaxed text-white', 'data-weather-geographic-investigation-prompt': true }, geographicInvestigationPaused ? 'Camera or evidence layers were adjusted manually.' : geographicFieldStep.prompt),
                  h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + (geographicInvestigationPaused ? 'text-amber-100' : 'text-emerald-100'), 'data-weather-geographic-investigation-status': geographicInvestigationPaused ? 'paused' : 'active' }, geographicInvestigationPaused ? 'Choose a numbered step or resume the previous step to restore its coordinated camera and layers.' : geographicFieldStep.evidence),
                  h('div', { className: 'mt-3 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Geographic field investigation steps' },
                    GEOGRAPHIC_INVESTIGATION_STEPS.map(function (step, index) {
                      var active = !geographicInvestigationPaused && step.id === geographicFieldStep.id;
                      return h('button', {
                        key: step.id,
                        type: 'button',
                        disabled: !d.geographicMapReady,
                        onClick: function () { openGeographicInvestigationStep(step.id); },
                        'aria-pressed': active,
                        'aria-describedby': active ? 'weather-geographic-investigation-prompt' : undefined,
                        className: 'min-h-12 rounded-lg border px-3 py-2 text-left text-[11px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 ' + (active ? 'border-emerald-300 bg-emerald-300 text-emerald-950 shadow-lg' : 'border-white/10 bg-white/5 text-slate-100 hover:border-emerald-300/40 hover:bg-white/10')
                      },
                        h('span', { className: 'mr-1 opacity-70', 'aria-hidden': true }, (index + 1) + '.'),
                        step.label
                      );
                    })
                  ),
                  h('button', { type: 'button', disabled: !d.geographicMapReady, onClick: function () { openGeographicInvestigationStep(geographicInvestigationPaused ? geographicFieldStep.id : geographicFieldStep.nextId); }, className: 'mt-3 min-h-11 w-full rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50' }, geographicInvestigationPaused ? 'Resume ' + geographicFieldStep.label : geographicFieldStep.id === 'claim' ? 'Review investigation from the start' : 'Next mapped investigation step'),
                  h('label', { htmlFor: 'weather-geographic-investigation-note', className: 'mt-3 block text-[11px] font-black text-emerald-200' }, 'Mapped evidence note',
                    h('textarea', {
                      id: 'weather-geographic-investigation-note',
                      value: d.geographicInvestigationNote || '',
                      onChange: function (event) { update({ geographicInvestigationNote: event.target.value }); },
                      rows: 3,
                      'aria-describedby': 'weather-geographic-investigation-prompt',
                      placeholder: geographicFieldStep.id === 'claim' ? 'My claim is ___ because the mapped evidence shows ___. A limitation is ___.' : 'I notice ___ on the map. This matters because ___.',
                      className: 'mt-1 min-h-[92px] w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-normal text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40'
                    })
                  )
                ),
                geographicMode && h('section', { className: 'rounded-xl border border-emerald-300/25 bg-emerald-950/20 p-4', 'data-weather-geographic-context': true },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-emerald-300' }, 'Geographic evidence'),
                  h('h4', { className: 'mt-1 text-sm font-black' }, geographic.context || geographic.label),
                  h('p', { className: 'mt-2 text-xs leading-relaxed text-slate-300' }, 'Inspect elevation, water, roads, settlements, and published administrative labels. Select the observation-site marker to inspect live conditions, or select another map point to measure its natural elevation and compare it with the site. Ask how terrain or land-water contrasts could redirect wind, lift air, or concentrate precipitation.'),
                  h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-400' }, 'The highlighted true-scale ring marks a ' + geographicStudyRadius + ' km study radius around the selected coordinates; it is not an administrative boundary.'),
                  h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-400' }, 'The cyan line points downwind from the observed wind direction. Its teaching length is scaled from wind speed and is not a forecast path or impact area.'),
                  h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-400' }, 'Camera telemetry updates after each move. Use the map-corner fullscreen control when the browser supports it.'),
                  h('div', { className: 'mt-4 border-t border-white/10 pt-3', 'data-weather-terrain-inspector': true, role: 'region', 'aria-labelledby': 'weather-terrain-inspector-title' },
                    h('div', { className: 'flex items-start justify-between gap-3' },
                      h('div', null,
                        h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-rose-300' }, 'Interactive terrain inspector'),
                        h('h5', { id: 'weather-terrain-inspector-title', className: 'mt-1 text-xs font-black text-white' }, geographicTerrainProbe ? 'Selected ground comparison' : 'Select a ground point')
                      ),
                      geographicTerrainProbe && h('span', { className: 'rounded-full bg-rose-300/15 px-2 py-1 text-[10px] font-black text-rose-100' }, geographicTerrainWind ? geographicTerrainWind.label + ' | ' + geographicTerrainProbe.relation : geographicTerrainProbe.relation)
                    ),
                    !geographicTerrainProbe && h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-300' }, 'Click or tap any map point away from the observation marker, or position the map and sample its center. The inspector will compare natural elevation, average slope, and position relative to the observed wind.'),
                    geographicTerrainProbe && h('div', { className: 'mt-3 grid grid-cols-3 gap-2' },
                      [
                        ['Natural elevation', Number(geographicTerrainProbe.elevation).toFixed(0) + ' m'],
                        ['Difference from site', (Number(geographicTerrainProbe.elevationDelta) > 0 ? '+' : '') + Number(geographicTerrainProbe.elevationDelta).toFixed(0) + ' m'],
                        ['Average grade', geographicTerrainWind ? (geographicTerrainWind.gradePercent > 0 ? '+' : '') + geographicTerrainWind.gradePercent.toFixed(2) + '%' : 'Not available']
                      ].map(function (metric) { return h('div', { key: metric[0], className: 'rounded-lg bg-black/20 p-2' }, h('p', { className: 'text-[10px] text-slate-400' }, metric[0]), h('p', { className: 'mt-1 text-xs font-black text-white' }, metric[1])); })
                    ),
                    terrainProbeGraphic && h('svg', { viewBox: '0 0 ' + terrainProbeGraphic.width + ' ' + terrainProbeGraphic.height, className: 'mt-3 h-auto w-full overflow-visible', role: 'img', 'aria-labelledby': 'weather-terrain-slope-title weather-terrain-slope-desc', 'data-weather-terrain-slope-graphic': true },
                      h('title', { id: 'weather-terrain-slope-title' }, 'Site-to-sample slope comparison'),
                      h('desc', { id: 'weather-terrain-slope-desc' }, 'The observation site is ' + terrainProbeGraphic.siteElevation + ' meters and the sampled terrain is ' + terrainProbeGraphic.sampleElevation + ' meters, ' + Number(geographicTerrainProbe.distanceKm).toFixed(2) + ' kilometers ' + geographicTerrainProbe.direction + ' of the site.'),
                      h('defs', null,
                        h('linearGradient', { id: 'weather-terrain-slope-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                          h('stop', { offset: '0%', stopColor: '#fbbf24', stopOpacity: 0.08 }),
                          h('stop', { offset: '100%', stopColor: '#fb7185', stopOpacity: 0.24 })
                        )
                      ),
                      h('line', { x1: 24, y1: 80, x2: 296, y2: 80, stroke: '#475569', strokeWidth: 1 }),
                      h('line', { x1: terrainProbeGraphic.siteX, y1: terrainProbeGraphic.siteY, x2: terrainProbeGraphic.sampleX, y2: terrainProbeGraphic.siteY, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 4' }),
                      h('path', { d: 'M' + terrainProbeGraphic.siteX + ' ' + terrainProbeGraphic.siteY + ' L' + terrainProbeGraphic.sampleX + ' ' + terrainProbeGraphic.sampleY + ' L' + terrainProbeGraphic.sampleX + ' 80 L' + terrainProbeGraphic.siteX + ' 80 Z', fill: 'url(#weather-terrain-slope-gradient)' }),
                      h('line', { x1: terrainProbeGraphic.siteX, y1: terrainProbeGraphic.siteY, x2: terrainProbeGraphic.sampleX, y2: terrainProbeGraphic.sampleY, stroke: '#fda4af', strokeWidth: 3, strokeLinecap: 'round' }),
                      h('circle', { cx: terrainProbeGraphic.siteX, cy: terrainProbeGraphic.siteY, r: 5, fill: '#fbbf24', stroke: '#ffffff', strokeWidth: 2 }),
                      h('circle', { cx: terrainProbeGraphic.sampleX, cy: terrainProbeGraphic.sampleY, r: 5, fill: '#fb7185', stroke: '#ffffff', strokeWidth: 2 }),
                      h('text', { x: terrainProbeGraphic.siteX, y: Math.max(10, terrainProbeGraphic.siteY - 9), textAnchor: 'middle', fill: '#fde68a', fontSize: 10, fontWeight: 500 }, terrainProbeGraphic.siteElevation + ' m'),
                      h('text', { x: terrainProbeGraphic.sampleX, y: Math.max(10, terrainProbeGraphic.sampleY - 9), textAnchor: 'middle', fill: '#fecdd3', fontSize: 10, fontWeight: 500 }, terrainProbeGraphic.sampleElevation + ' m'),
                      h('text', { x: terrainProbeGraphic.siteX, y: 96, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10 }, 'Site'),
                      h('text', { x: terrainProbeGraphic.sampleX, y: 96, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10 }, 'Sample ' + geographicTerrainProbe.direction),
                      geographicTerrainWind && h('text', { x: 160, y: 94, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, (geographicTerrainWind.gradePercent > 0 ? '+' : '') + geographicTerrainWind.gradePercent.toFixed(2) + '% average grade')
                    ),
                    geographicTerrainProbe && h('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-400', 'data-weather-terrain-probe-coordinates': true }, Number(geographicTerrainProbe.distanceKm).toFixed(2) + ' km ' + geographicTerrainProbe.direction + ' of site | ' + Number(geographicTerrainProbe.latitude).toFixed(5) + ', ' + Number(geographicTerrainProbe.longitude).toFixed(5) + ' | Bearing ' + Number(geographicTerrainProbe.bearing).toFixed(1) + '\u00B0'),
                    geographicTerrainProbe && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-400', 'data-weather-terrain-probe-provenance': true }, 'Source: Mapterhorn raster terrain rendered by MapLibre | Selection: ' + (d.geographicTerrainProbeMethod || 'Saved map point') + ' | Elevation and grade are approximate.'),
                    geographicTerrainWind && h('div', { className: 'mt-3 border-l-2 border-rose-300/60 pl-3', 'data-weather-terrain-wind-analysis': true, role: 'status', 'aria-live': 'polite' },
                      h('p', { className: 'text-[11px] font-black text-rose-200' }, geographicTerrainWind.signalLabel),
                      h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-400' }, 'Observed wind from ' + cardinal(live.windDir) + ' | ' + geographicTerrainWind.angularDifference.toFixed(1) + '\u00B0 from the upwind axis | ' + geographicTerrainWind.gradeLabel + ' (' + (geographicTerrainWind.slopeDegrees > 0 ? '+' : '') + geographicTerrainWind.slopeDegrees.toFixed(2) + '\u00B0)'),
                      h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, geographicTerrainWind.interpretation)
                    ),
                    h('div', { className: 'mt-3 grid gap-2 ' + (geographicTerrainProbe ? 'grid-cols-2' : 'grid-cols-1') },
                      h('button', { type: 'button', disabled: !d.geographicMapReady || geographicTerrainAvailable === false, onClick: sampleGeographicMapCenter, className: 'min-h-11 rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-not-allowed disabled:opacity-50' }, 'Sample map center'),
                      geographicTerrainProbe && h('button', { type: 'button', onClick: clearGeographicTerrainProbe, className: 'min-h-11 rounded-lg border border-rose-300/40 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200' }, 'Clear comparison')
                    )
                  ),
                  geographicTransectVisible && geographicTerrainAvailable !== false && h('div', { className: 'mt-4 border-t border-white/10 pt-3', 'data-weather-terrain-profile': true },
                    h('div', { className: 'flex items-start justify-between gap-3' },
                      h('div', null, h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-violet-300' }, 'Wind-aligned terrain profile'), h('p', { className: 'mt-1 text-[11px] text-slate-300' }, '30 km cross-section from upwind to downwind')),
                      terrainProfileChart && h('span', { className: 'rounded-full bg-violet-300/15 px-2 py-1 text-[10px] font-black text-violet-100' }, Math.round(terrainProfileChart.min) + '\u2013' + Math.round(terrainProfileChart.max) + ' m')
                    ),
                    terrainProfileChart ? h('svg', { viewBox: '0 0 ' + terrainProfileChart.width + ' ' + terrainProfileChart.height, preserveAspectRatio: 'xMidYMid meet', className: 'mt-2 h-auto w-full overflow-visible', role: 'img', 'aria-labelledby': 'weather-terrain-profile-title weather-terrain-profile-desc', 'data-weather-terrain-profile-visual': true },
                      h('title', { id: 'weather-terrain-profile-title' }, 'Wind-aligned natural elevation profile'),
                      h('desc', { id: 'weather-terrain-profile-desc' }, 'Terrain elevation from ' + cardinal(live.windDir) + ' upwind through the selected site toward ' + cardinal(geographicOverlays.downwindBearing) + ' downwind. Elevation ranges from ' + Math.round(terrainProfileChart.min) + ' to ' + Math.round(terrainProfileChart.max) + ' meters.'),
                      h('defs', null,
                        h('linearGradient', { id: 'weather-terrain-profile-gradient', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                          h('stop', { offset: '0%', stopColor: '#c4b5fd', stopOpacity: 0.36 }),
                          h('stop', { offset: '100%', stopColor: '#6d28d9', stopOpacity: 0.04 })
                        )
                      ),
                      [terrainProfileChart.top, (terrainProfileChart.top + terrainProfileChart.height - terrainProfileChart.bottom) / 2, terrainProfileChart.height - terrainProfileChart.bottom].map(function (gridY, index) {
                        return h('line', { key: 'terrain-grid-' + index, x1: terrainProfileChart.left, y1: gridY, x2: terrainProfileChart.width - terrainProfileChart.right, y2: gridY, stroke: '#475569', strokeWidth: 1, strokeDasharray: index === 2 ? undefined : '2 4', strokeOpacity: index === 2 ? 0.9 : 0.55 });
                      }),
                      h('path', { d: terrainProfileChart.areaPath, fill: 'url(#weather-terrain-profile-gradient)' }),
                      h('path', { d: terrainProfileChart.linePath, fill: 'none', stroke: '#c4b5fd', strokeWidth: 2.75, strokeLinejoin: 'round', strokeLinecap: 'round' }),
                      h('line', { x1: terrainProfileChart.siteX, y1: terrainProfileChart.top, x2: terrainProfileChart.siteX, y2: terrainProfileChart.height - terrainProfileChart.bottom, stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '4 3' }),
                      h('circle', { cx: terrainProfileChart.siteX, cy: terrainProfileChart.siteY, r: 4, fill: '#fbbf24', stroke: '#ffffff', strokeWidth: 1.5 }),
                      h('circle', { cx: terrainProfileChart.left, cy: terrainY(geographicTerrainProfile[0].elevation), r: 2.75, fill: '#a78bfa', stroke: '#ffffff', strokeWidth: 1 }),
                      h('circle', { cx: terrainProfileChart.width - terrainProfileChart.right, cy: terrainY(geographicTerrainProfile[geographicTerrainProfile.length - 1].elevation), r: 2.75, fill: '#a78bfa', stroke: '#ffffff', strokeWidth: 1 }),
                      h('text', { x: terrainProfileChart.left, y: 11, fill: '#cbd5e1', fontSize: 9 }, Math.round(terrainProfileChart.max) + ' m'),
                      h('text', { x: terrainProfileChart.left, y: ((terrainProfileChart.top + terrainProfileChart.height - terrainProfileChart.bottom) / 2) - 3, fill: '#94a3b8', fontSize: 8 }, Math.round((terrainProfileChart.min + terrainProfileChart.max) / 2) + ' m'),
                      h('text', { x: terrainProfileChart.left, y: terrainProfileChart.height - terrainProfileChart.bottom - 3, fill: '#cbd5e1', fontSize: 9 }, Math.round(terrainProfileChart.min) + ' m'),
                      h('text', { x: terrainProfileChart.left, y: terrainProfileChart.height - 8, fill: '#cbd5e1', fontSize: 9 }, 'Upwind ' + cardinal(live.windDir)),
                      h('text', { x: terrainProfileChart.siteX, y: terrainProfileChart.height - 8, fill: '#fcd34d', fontSize: 9, textAnchor: 'middle' }, 'Site'),
                      h('text', { x: terrainProfileChart.width - terrainProfileChart.right, y: terrainProfileChart.height - 8, fill: '#cbd5e1', fontSize: 9, textAnchor: 'end' }, 'Downwind ' + cardinal(geographicOverlays.downwindBearing))
                    ) : h('p', { className: 'mt-3 text-[11px] leading-relaxed text-slate-300', role: 'status' }, d.geographicTerrainProfileStatus || 'Sampling natural terrain elevation after map tiles load...'),
                    terrainProfileChart && h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-400' }, d.geographicTerrainProfileStatus || 'Natural elevation sampled from rendered terrain.'),
                    terrainProfileAnalysis && h('div', { className: 'mt-3 grid grid-cols-3 gap-2', 'data-weather-terrain-analysis': true },
                      [['Terrain relief', terrainProfileAnalysis.relief + ' m'], ['Rise to site', (terrainProfileAnalysis.riseToSite > 0 ? '+' : '') + terrainProfileAnalysis.riseToSite + ' m'], ['After site', (terrainProfileAnalysis.changeAfterSite > 0 ? '+' : '') + terrainProfileAnalysis.changeAfterSite + ' m']].map(function (metric) { return h('div', { key: metric[0], className: 'rounded-lg bg-black/20 p-2' }, h('p', { className: 'text-[10px] text-slate-400' }, metric[0]), h('p', { className: 'mt-1 text-xs font-black text-white' }, metric[1])); })
                    ),
                    terrainProfileAnalysis && h('p', { className: 'mt-3 text-[11px] font-black text-violet-200' }, terrainProfileAnalysis.signalLabel),
                    terrainProfileAnalysis && h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, terrainProfileAnalysis.interpretation),
                    terrainProfileAnalysis && d.geographicTerrainEvidence && h('p', { className: 'mt-3 text-[10px] leading-relaxed text-emerald-200', 'data-weather-terrain-evidence-identity': true }, geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, live).detail),
                    terrainProfileAnalysis && h('button', { type: 'button', onClick: useGeographicTerrainEvidence, 'aria-pressed': (d.evidence || []).indexOf(TERRAIN_EVIDENCE.id) !== -1, className: 'mt-3 min-h-11 w-full rounded-lg border border-violet-300/50 bg-violet-300/15 px-3 py-2 text-xs font-black text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200' }, (d.evidence || []).indexOf(TERRAIN_EVIDENCE.id) !== -1 && d.geographicTerrainEvidence && geographicTerrainEvidenceStatus(d.geographicTerrainEvidence, live).current ? 'Open forecast with terrain evidence' : (d.geographicTerrainEvidence ? 'Refresh terrain forecast evidence' : 'Use as forecast evidence'))
                  ),
                  geographicTerrainAvailable === false && h('div', { className: 'mt-4 border-l-2 border-amber-300/70 bg-amber-300/10 p-3', role: 'status', 'data-weather-terrain-degraded': true },
                    h('p', { className: 'text-xs font-black text-amber-100' }, 'Base map available; 3D terrain unavailable'),
                    h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, 'Continue with published map labels, the true-scale study area, and the observed wind vector. Terrain sampling and terrain forecast evidence require a successful terrain-tile load.')
                  ),
                  h('p', { className: 'mt-2 text-[11px] text-slate-300', role: 'status', 'aria-live': 'polite', 'data-weather-geographic-status': true }, d.geographicMapStatus || 'Geographic layers are preparing.'),
                  h('p', { className: 'mt-3 text-[11px] leading-relaxed text-slate-300', 'data-weather-map-attribution': true }, 'Map: ', h('a', { href: 'https://openfreemap.org/', target: '_blank', rel: 'noreferrer', className: 'font-bold text-emerald-300 underline' }, 'OpenFreeMap'), ' with ', h('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noreferrer', className: 'font-bold text-emerald-300 underline' }, 'OpenStreetMap data'), '. 3D terrain: ', h('a', { href: 'https://tiles.mapterhorn.com/', target: '_blank', rel: 'noreferrer', className: 'font-bold text-emerald-300 underline' }, 'Mapterhorn'), '. Renderer: ', h('a', { href: 'https://maplibre.org/', target: '_blank', rel: 'noreferrer', className: 'font-bold text-emerald-300 underline' }, 'MapLibre'), '.')
                ),

                h('section', { className: 'rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4', 'data-weather-live-control': true },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-emerald-300' }, 'Live weather connection'),
                  h('h4', { className: 'text-sm font-black' }, 'Bring local conditions into 3D and maps'),
                  h('p', { className: 'mt-1 text-xs leading-relaxed text-slate-300' }, 'Nothing loads automatically. Use device location, type a flexible location, or open separate address fields.'),
                  h('button', { type: 'button', onClick: requestDeviceWeather, disabled: !!d.liveWeatherLoading, className: 'mt-3 min-h-11 w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:opacity-50' }, d.liveWeatherLoading ? 'Connecting...' : '\uD83D\uDCCD Use my location'),
                  h('form', { className: 'mt-3 space-y-2', onSubmit: function (event) { event.preventDefault(); searchLiveWeather('quick'); }, 'aria-describedby': 'weather-location-format-help' },
                    h('label', { htmlFor: 'weather-location-quick', className: 'block text-xs font-bold text-emerald-100' }, 'Quick location search'),
                    h('div', { className: 'flex gap-2' },
                      h('input', { id: 'weather-location-quick', type: 'search', value: d.liveLocationQuery || '', onChange: function (event) { update({ liveLocationQuery: event.target.value }); }, placeholder: 'Boston, MA or 42.36, -71.06', autoComplete: 'off', inputMode: 'search', className: 'min-h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40' }),
                      h('button', { type: 'submit', disabled: !!d.liveWeatherLoading, className: 'min-h-11 rounded-lg border border-emerald-300/40 bg-white/10 px-3 py-2 text-xs font-black text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:opacity-50' }, 'Search')
                    ),
                    h('p', { id: 'weather-location-format-help', className: 'text-[11px] leading-relaxed text-slate-300' }, 'Accepts city, region, country, postal or ZIP code, or decimal coordinates. Examples: Paris, France; 02108; Tokyo Japan; 42.36 N, 71.06 W.')
                  ),
                  h('button', {
                    type: 'button',
                    onClick: function () { update({ liveLocationDetailsOpen: !d.liveLocationDetailsOpen }); },
                    'aria-expanded': !!d.liveLocationDetailsOpen,
                    'aria-controls': 'weather-location-details',
                    className: 'mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-black text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200'
                  }, h('span', null, d.liveLocationDetailsOpen ? 'Hide location fields' : 'More location fields'), h('span', { 'aria-hidden': true }, d.liveLocationDetailsOpen ? '\u2212' : '+')),
                  h('div', { id: 'weather-location-details', hidden: !d.liveLocationDetailsOpen },
                    d.liveLocationDetailsOpen && h('form', { className: 'mt-2 rounded-xl border border-white/15 bg-black/20 p-3', onSubmit: function (event) { event.preventDefault(); searchLiveWeather('structured'); }, 'aria-labelledby': 'weather-location-details-title' },
                      h('p', { id: 'weather-location-details-title', className: 'text-xs font-black text-white' }, 'Search with separate fields'),
                      h('p', { className: 'mt-1 text-[11px] leading-relaxed text-slate-300' }, 'Fill in any fields you know. City and country usually give the best match.'),
                      h('div', { className: 'mt-3 grid grid-cols-2 gap-2' },
                        h('label', { htmlFor: 'weather-location-city', className: 'col-span-2 block text-[11px] font-bold text-emerald-100' }, 'City or locality',
                          h('input', { id: 'weather-location-city', type: 'text', value: d.liveLocationCity || '', onChange: function (event) { update({ liveLocationCity: event.target.value }); }, autoComplete: 'address-level2', className: 'mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-normal text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40' })
                        ),
                        h('label', { htmlFor: 'weather-location-region', className: 'block text-[11px] font-bold text-emerald-100' }, 'State, province, or region',
                          h('input', { id: 'weather-location-region', type: 'text', value: d.liveLocationRegion || '', onChange: function (event) { update({ liveLocationRegion: event.target.value }); }, autoComplete: 'address-level1', className: 'mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-normal text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40' })
                        ),
                        h('label', { htmlFor: 'weather-location-postal', className: 'block text-[11px] font-bold text-emerald-100' }, 'Postal or ZIP code',
                          h('input', { id: 'weather-location-postal', type: 'text', value: d.liveLocationPostalCode || '', onChange: function (event) { update({ liveLocationPostalCode: event.target.value }); }, autoComplete: 'postal-code', inputMode: 'text', className: 'mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-normal text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40' })
                        ),
                        h('label', { htmlFor: 'weather-location-country', className: 'col-span-2 block text-[11px] font-bold text-emerald-100' }, 'Country',
                          h('input', { id: 'weather-location-country', type: 'text', value: d.liveLocationCountry || '', onChange: function (event) { update({ liveLocationCountry: event.target.value }); }, autoComplete: 'country-name', className: 'mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 py-2 text-xs font-normal text-white focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40' })
                        )
                      ),
                      h('button', { type: 'submit', disabled: !!d.liveWeatherLoading, className: 'mt-3 min-h-11 w-full rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50' }, 'Search these fields')
                    )
                  ),
                  d.liveWeatherStatus && h('p', { className: 'mt-2 text-[11px] font-bold text-emerald-200', role: 'status', 'aria-live': 'polite' }, d.liveWeatherStatus),
                  d.terrainEvidenceInvalidatedMessage && h('p', { className: 'mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 p-2 text-[11px] font-bold text-amber-100', role: 'status', 'aria-live': 'polite', 'data-weather-terrain-evidence-invalidated': true }, d.terrainEvidenceInvalidatedMessage),
                  d.liveWeatherError && h('p', { className: 'mt-2 rounded-lg bg-rose-950/40 p-2 text-[11px] text-rose-200', role: 'alert' }, d.liveWeatherError),
                  live && h('p', { className: 'mt-2 text-[11px] text-slate-300' }, 'Source: ', h('a', { href: live.sourceUrl, target: '_blank', rel: 'noreferrer', className: 'font-bold text-emerald-300 underline' }, live.source), '. Coordinates are rounded and stored only with this local lab state.'),
                  h('p', { className: 'mt-2 text-[11px] text-slate-400' }, 'Educational visualization only; not a safety or operational forecast.')
                ),
                !geographicMode && h('section', { className: 'rounded-xl border border-violet-400/20 bg-violet-950/20 p-4', 'data-weather-vr-control': true },
                  h('p', { className: 'text-[11px] font-black uppercase tracking-wide text-violet-300' }, 'WebXR bridge'),
                  h('h4', { className: 'text-sm font-black' }, 'Enter immersive VR'),
                  h('p', { className: 'mt-1 text-[11px] text-slate-300' }, 'Requires HTTPS, WebXR, and a supported headset. Desktop orbit controls remain available.'),
                  h('button', { type: 'button', onClick: enterWeatherVR, disabled: !engineReady || !!engineError, className: 'mt-3 w-full rounded-lg bg-violet-500 px-3 py-2 text-xs font-black text-white disabled:opacity-40' }, d.vrSessionActive ? 'VR session active' : 'Check headset and enter VR'),
                  d.vrStatus && h('p', { className: 'mt-2 text-[11px] text-violet-200', role: 'status', 'aria-live': 'polite' }, d.vrStatus)
                )
              )
            )
          ),
          h('section', { className: panelClass + ' grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4', 'aria-label': 'Immersive weather layer guide' },
            (geographicMode ? [['Open vector map', 'Published roads, water, places, and boundaries'], [geographicStudyRadius + ' km study area', 'True-scale radius centered on the selected site'], ['Downwind vector', cardinal(geographicOverlays ? geographicOverlays.downwindBearing : 0) + ' from the live observation'], ['3D terrain/profile', 'Elevation, buildings, and a wind-aligned natural terrain cross-section']] : [['Terrain map', geography.label], ['Blue volume', 'Cooler air mass'], ['Orange volume', 'Warmer air mass'], ['Arrows and particles', 'Wind and precipitation']]).map(function (item) { return h('div', { key: item[0], className: 'rounded-xl p-3 ' + (dark ? 'bg-slate-950/60' : 'bg-sky-50') }, h('p', { className: 'text-xs font-black text-sky-500' }, item[0]), h('p', { className: 'mt-1 text-[11px] ' + mutedClass }, item[1])); })
          )
        );
      }

      function teacherGuide() {
        var rows = [
          ['K-2', 'Observe sky, wind, and temperature; describe a pattern; make a picture forecast.'],
          ['3-5', 'Compare a station network, locate large changes, graph patterns over time, and connect measurements to a forecast.'],
          ['6-8', 'Analyze station contrasts, fronts, pressure, humidity, dew point, wind shifts, and radar as interacting evidence.'],
          ['9-12', 'Evaluate model assumptions, instability, terrain lift, uncertainty, controlled experiments, and forecast verification.']
        ];
        function teacherMissionBuilder() {
          var early = band === 'K-2';
          var elementary = band === '3-5';
          var missions = early ? [
            {
              id: 'weatherStory', icon: '\uD83D\uDD2D', title: 'Weather Detective Story', tab: 'map',
              launch: 'What weather clues can help us tell what may happen next?',
              steps: ['Save one useful weather clue.', 'Compare what changed over time.', 'Share a picture or spoken forecast using the clue.'],
              deliverable: 'A picture or spoken forecast that names one weather clue.',
              lookFors: ['Names an observable clue', 'Describes one change', 'Connects the clue to the forecast']
            },
            {
              id: 'oneChange', icon: '\uD83E\uDDEA', title: 'One-Change Weather Test', tab: 'experiment',
              launch: 'What happens when we change one weather ingredient?',
              steps: ['Choose one ingredient.', 'Predict what may happen.', 'Run the test and tell what changed.'],
              deliverable: 'A before-and-after explanation using words, pictures, or gestures.',
              lookFors: ['Changes one ingredient', 'Makes a prediction', 'Describes the result']
            },
            {
              id: 'safeSchool', icon: '\uD83D\uDEE1\uFE0F', title: 'Safe School Weather Plan', tab: 'forecast',
              launch: 'How can weather clues help our school make a safe choice?',
              steps: ['Notice a weather clue.', 'Choose what may happen.', 'Match the weather to a safe action.'],
              deliverable: 'A short weather message with one safe action.',
              lookFors: ['Uses a clue', 'Names likely weather', 'Connects weather to an action']
            }
          ] : [
            {
              id: 'frontBoundary', icon: '\uD83C\uDF2C\uFE0F', title: 'Front Boundary Detective', tab: 'map',
              launch: elementary ? 'Where is the biggest weather change across the station network?' : 'Which station contrasts provide the strongest evidence for an air-mass boundary?',
              steps: ['Inspect and save station evidence.', 'Compare patterns across space and time.', 'Defend the boundary location with measurements.'],
              deliverable: elementary ? 'An annotated station comparison and evidence sentence.' : 'A boundary claim supported by multiple station measurements and a mechanism.',
              lookFors: ['Selects relevant measurements', 'Identifies a meaningful contrast', 'Explains why the contrast supports the boundary']
            },
            {
              id: 'causeEffect', icon: '\uD83E\uDDEA', title: elementary ? 'Weather Ingredient Lab' : 'Atmospheric Cause & Effect Lab', tab: 'experiment',
              launch: elementary ? 'How does changing one weather ingredient affect clouds or precipitation?' : 'How does one starting variable influence moisture, lift, saturation, or precipitation potential?',
              steps: ['Choose one variable and predict.', 'Run a controlled comparison.', 'Explain the result and its limitations.'],
              deliverable: elementary ? 'A before-and-after explanation that names what stayed the same.' : 'A causal explanation using baseline, test result, mechanism, and model limitation.',
              lookFors: ['Changes one variable', 'Uses baseline and test evidence', 'Explains a plausible mechanism']
            },
            {
              id: 'safeForecast', icon: '\uD83D\uDCE1', title: 'Evidence-Based School Forecast', tab: 'forecast',
              launch: 'What weather is most likely, when will it begin, and what should the school do?',
              steps: ['Select multiple evidence sources.', 'Issue and verify a CER forecast.', 'Revise the claim and communicate a readiness action.'],
              deliverable: 'A verified forecast briefing with evidence, reasoning, confidence, and an actionable school decision.',
              lookFors: ['Uses multiple evidence sources', 'Connects evidence to the claim', 'Matches a hazard with a readiness action']
            }
          ].concat(!early && !elementary ? [{
            id: 'uncertainty', icon: '\uD83C\uDF9A\uFE0F', title: 'Ensemble Uncertainty Challenge', tab: 'forecast',
            launch: 'How should ensemble spread change forecast confidence and decision-making?',
            steps: ['Compare the nine modeled outcomes.', 'Calibrate confidence to the evidence.', 'Explain what could change the forecast.'],
            deliverable: 'An uncertainty statement that distinguishes model agreement from operational probability.',
            lookFors: ['Interprets ensemble agreement carefully', 'Calibrates confidence', 'Names assumptions or missing evidence']
          }] : []);
          var durations = {
            '20': { label: '20-minute sprint', timing: 'Launch 3 min | Investigate 10 min | Share 7 min' },
            '35': { label: '35-minute lesson', timing: 'Launch 5 min | Investigate 20 min | Share 10 min' },
            '50': { label: '50-minute deep dive', timing: 'Launch 8 min | Investigate 30 min | Share 12 min' }
          };
          var groupingLabels = { solo: 'Individual', pairs: 'Pairs', teams: 'Teams of 3-4' };
          var supportSets = {
            scaffold: {
              label: 'Scaffolded access',
              description: early ? 'Reduce language load while keeping the weather thinking visible.' : 'Make the evidence pathway explicit without reducing the science goal.',
              supports: early ? [
                'Preview picture icons for cloud, wind, temperature, and rain.',
                'Rehearse with a partner using: I think ___ because I noticed ___.',
                'Accept pointing, drawing, speaking, or acting out the explanation.'
              ] : [
                'Preteach pressure, dew point, boundary, evidence, and uncertainty.',
                'Use a claim-evidence-reasoning organizer with one completed example.',
                'Allow oral, visual, or written evidence explanations.'
              ]
            },
            core: {
              label: 'Core pathway',
              description: 'Keep the grade-banded science target while offering multiple ways to engage and respond.',
              supports: early ? [
                'Offer picture, spoken, or drawn response options.',
                'Ask learners to point to the clue they used.',
                'Use partner talk before whole-group sharing.'
              ] : [
                'Provide the standard mission directions and evidence tools.',
                'Allow written, oral, visual, or broadcast responses.',
                'Require at least two linked evidence sources where grade-appropriate.'
              ]
            },
            extension: {
              label: 'Extension challenge',
              description: early ? 'Transfer the weather idea to a new story and compare patterns.' : 'Increase transfer, uncertainty analysis, and model critique.',
              supports: early ? [
                'Compare a second weather story.',
                'Explain what stayed the same and what changed.',
                'Ask what new clue would make the forecast stronger.'
              ] : [
                'Test the mission in a contrasting scenario.',
                'Critique one model assumption or missing measurement.',
                'Explain how uncertainty changes confidence or action.'
              ]
            }
          };
          var alignmentById = {
            weatherStory: {
              practice: 'Analyzing and interpreting data',
              concept: 'Patterns',
              artifact: 'A picture or spoken forecast that cites an observable weather clue.',
              press: 'What pattern did you notice, and what makes that clue useful?'
            },
            oneChange: {
              practice: 'Planning and carrying out investigations',
              concept: 'Cause and effect',
              artifact: 'A before-and-after explanation that identifies the changed ingredient.',
              press: 'What changed, what stayed the same, and what happened because of the change?'
            },
            safeSchool: {
              practice: 'Constructing explanations and designing solutions',
              concept: 'Cause and effect',
              artifact: 'A weather message that links a clue, likely condition, and safe action.',
              press: 'How does the weather clue support the action you chose?'
            },
            frontBoundary: {
              practice: 'Analyzing and interpreting data',
              concept: 'Patterns',
              artifact: 'A boundary claim supported by spatial and temporal station contrasts.',
              press: 'Which station pair provides the strongest contrast, and which measurement matters most?'
            },
            causeEffect: {
              practice: 'Planning and carrying out investigations',
              concept: 'Cause and effect',
              artifact: 'A controlled-comparison explanation using baseline, test evidence, and mechanism.',
              press: 'How does holding the other variables fixed strengthen the causal claim?'
            },
            safeForecast: {
              practice: 'Engaging in argument from evidence',
              concept: 'Systems and system models',
              artifact: 'A verified CER forecast with calibrated confidence and an actionable readiness decision.',
              press: 'How do the interacting measurements support both the forecast and the school action?'
            },
            uncertainty: {
              practice: 'Developing and using models',
              concept: 'Stability and change',
              artifact: 'A calibrated uncertainty statement that distinguishes agreement from probability.',
              press: 'What ensemble disagreement or model assumption should limit confidence?'
            }
          };
          var selectedId = d.teacherMissionId || missions[0].id;
          var mission = missions.filter(function (item) { return item.id === selectedId; })[0] || missions[0];
          var alignment = alignmentById[mission.id];
          var durationId = durations[d.teacherMissionDuration] ? d.teacherMissionDuration : '35';
          var duration = durations[durationId];
          var groupingId = groupingLabels[d.teacherMissionGrouping] ? d.teacherMissionGrouping : 'pairs';
          var supportId = supportSets[d.teacherMissionSupport] ? d.teacherMissionSupport : 'core';
          var support = supportSets[supportId];
          var missionLines = [
            'WEATHER SYSTEMS CLASSROOM MISSION',
            'Grade band: ' + band,
            'Mission: ' + mission.title,
            'Time: ' + duration.label,
            'Grouping: ' + groupingLabels[groupingId],
            'Learning pathway: ' + support.label,
            '',
            'LAUNCH QUESTION',
            mission.launch,
            '',
            'STUDENT WORKFLOW'
          ];
          mission.steps.forEach(function (step, index) { missionLines.push((index + 1) + '. ' + step); });
          missionLines.push('', 'DELIVERABLE', mission.deliverable, '', 'SUCCESS LOOK-FORS');
          mission.lookFors.forEach(function (item) { missionLines.push('- ' + item); });
          missionLines.push('', 'THREE-DIMENSIONAL LEARNING LENS');
          missionLines.push('Science and engineering practice: ' + alignment.practice);
          missionLines.push('Crosscutting concept: ' + alignment.concept);
          missionLines.push('Evidence artifact: ' + alignment.artifact);
          missionLines.push('Teacher press: ' + alignment.press);
          missionLines.push('Local alignment note: Connect this mission to district performance expectations and adopted curriculum.');
          missionLines.push('', 'UDL ACCESS AND CHALLENGE', support.label + ': ' + support.description);
          support.supports.forEach(function (item) { missionLines.push('- ' + item); });
          missionLines.push('', 'TIMING', duration.timing, '', 'This mission uses a transparent teaching model. Compare with authentic local weather observations when possible.');
          var missionText = missionLines.join('\n');
          var studentSupportSets = {
            scaffold: early ? [
              'Use the picture icons and point to the weather clue you chose.',
              'Practice with a partner: I think ___ because I noticed ___.',
              'You may point, draw, speak, or act out your explanation.'
            ] : [
              'Use the vocabulary bank and completed CER example.',
              'Organize your thinking with the claim-evidence-reasoning frame.',
              'You may respond orally, visually, or in writing.'
            ],
            core: early ? [
              'You may draw, speak, or use pictures for your response.',
              'Point to the clue that supports your weather idea.',
              'Practice with a partner before sharing.'
            ] : [
              'Use the mission evidence tools and grade-level directions.',
              'Choose a written, oral, visual, or broadcast response.',
              'Connect at least two evidence sources when the mission asks for them.'
            ],
            extension: early ? [
              'Compare this weather story with a second story.',
              'Explain what stayed the same and what changed.',
              'Name a new clue that would make your forecast stronger.'
            ] : [
              'Repeat the mission in a contrasting scenario.',
              'Identify one model assumption or missing measurement.',
              'Explain how uncertainty should change confidence or action.'
            ]
          };
          var studentSupports = studentSupportSets[supportId];
          var studentLines = [
            'STUDENT WEATHER MISSION',
            mission.title,
            '',
            'YOUR QUESTION',
            mission.launch,
            '',
            'TIME AND TEAM',
            duration.label + ' | ' + groupingLabels[groupingId],
            '',
            'WHAT TO DO'
          ];
          mission.steps.forEach(function (step, index) { studentLines.push((index + 1) + '. ' + step); });
          studentLines.push('', 'WHAT TO SHARE', mission.deliverable, '', 'CHECK YOUR WORK');
          mission.lookFors.forEach(function (item) { studentLines.push('\u2610 ' + item); });
          studentLines.push('', 'YOUR LEARNING PATHWAY', support.label);
          studentSupports.forEach(function (item) { studentLines.push('- ' + item); });
          studentLines.push(
            '',
            'BEFORE YOU FINISH',
            'Explain what evidence changed your thinking and leave one weather question you still have.',
            '',
            'Remember: This simulation is a teaching model. Model outcomes are evidence to analyze, not a real local forecast.'
          );
          var studentMissionText = studentLines.join('\n');
          function copyStatus(ok, label) {
            var message = ok ? label + ' copied to clipboard.' : 'Copy failed. Select the visible text and copy it manually.';
            if (addToast) addToast(message, ok ? 'success' : 'info');
            if (announce) announce(message);
          }
          function legacyCopy(text, label) {
            try {
              var field = document.createElement('textarea');
              field.value = text;
              field.setAttribute('readonly', '');
              field.style.position = 'fixed';
              field.style.left = '-9999px';
              field.style.top = '0';
              document.body.appendChild(field);
              field.focus();
              field.select();
              var copied = false;
              try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
              document.body.removeChild(field);
              copyStatus(copied, label);
            } catch (error) { copyStatus(false, label); }
          }
          function copyText(text, label) {
            try {
              if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
                window.navigator.clipboard.writeText(text).then(function () { copyStatus(true, label); }).catch(function () { legacyCopy(text, label); });
                return;
              }
            } catch (error) {}
            legacyCopy(text, label);
          }
          function copyMission() {
            copyText(missionText, 'Classroom mission');
          }
          function copyStudentDirections() {
            copyText(studentMissionText, 'Student directions');
          }
          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-mission-builder': true,
            'aria-labelledby': 'weather-mission-builder-title'
          },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-sky-950/30 to-indigo-950/30' : 'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50') },
              h('div', { className: 'max-w-2xl' },
                h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Lesson planning studio'),
                h('h3', { id: 'weather-mission-builder-title', className: 'mt-1 text-lg font-black' }, 'Classroom Mission Builder'),
                h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, 'Build a grade-banded investigation brief without changing any recorded student evidence.')
              ),
              h('button', {
                type: 'button',
                onClick: copyMission,
                'aria-label': 'Copy classroom mission brief to clipboard',
                className: 'min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-sky-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300'
              }, '\uD83D\uDCCB Copy mission brief')
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'grid gap-2 sm:grid-cols-2', role: 'list', 'aria-label': band + ' classroom mission choices' }, missions.map(function (item) {
                var selected = item.id === mission.id;
                return h('button', {
                  key: item.id,
                  type: 'button',
                  role: 'listitem',
                  onClick: function () { update({ teacherMissionId: item.id }); },
                  'aria-pressed': selected,
                  className: 'min-h-16 rounded-xl border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 ' + (selected ? (dark ? 'border-sky-300 bg-sky-900 text-white' : 'border-sky-600 bg-sky-100 text-sky-950') : (dark ? 'border-slate-700 bg-slate-950/60 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-sky-50'))
                },
                  h('span', { className: 'mr-2 text-lg', 'aria-hidden': true }, item.icon),
                  h('span', { className: 'text-sm font-black' }, item.title)
                );
              })),
              h('div', { className: 'mt-4 grid gap-3 sm:grid-cols-3' },
                selectField('weather-mission-duration', 'Lesson length', durationId, [
                  { value: '20', label: durations['20'].label },
                  { value: '35', label: durations['35'].label },
                  { value: '50', label: durations['50'].label }
                ], function (event) { update({ teacherMissionDuration: event.target.value }); }),
                selectField('weather-mission-grouping', 'Student grouping', groupingId, [
                  { value: 'solo', label: groupingLabels.solo },
                  { value: 'pairs', label: groupingLabels.pairs },
                  { value: 'teams', label: groupingLabels.teams }
                ], function (event) { update({ teacherMissionGrouping: event.target.value }); }),
                selectField('weather-mission-support', 'Learning pathway', supportId, [
                  { value: 'scaffold', label: supportSets.scaffold.label },
                  { value: 'core', label: supportSets.core.label },
                  { value: 'extension', label: supportSets.extension.label }
                ], function (event) { update({ teacherMissionSupport: event.target.value }); })
              ),
              h('div', { className: 'mt-4 grid gap-4 lg:grid-cols-[1fr_.85fr]' },
                h('div', { className: 'rounded-xl border p-4 ' + (dark ? 'border-indigo-800 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50') },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, 'Launch question'),
                  h('h4', { className: 'mt-2 text-base font-black' }, mission.launch),
                  h('p', { className: 'mt-3 text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, 'Student deliverable'),
                  h('p', { className: 'mt-1 text-sm leading-relaxed ' + mutedClass }, mission.deliverable)
                ),
                h('div', { className: 'rounded-xl border p-4 ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, duration.label + ' | ' + groupingLabels[groupingId]),
                  h('p', { className: 'mt-2 text-xs font-bold leading-relaxed ' + mutedClass }, duration.timing),
                  h('button', {
                    type: 'button',
                    onClick: function () {
                      update({ tab: mission.tab });
                      if (announce) announce(mission.title + ' first student stage opened. Recorded student evidence was not changed.');
                    },
                    className: buttonClass + ' mt-3 w-full'
                  }, 'Open first student stage \u2192')
                )
              ),
              h('section', { className: 'mt-4 rounded-xl border p-4 ' + (dark ? 'border-emerald-800 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50'), 'aria-labelledby': 'weather-mission-support-title' },
                h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                  h('div', null,
                    h('p', { className: 'text-xs font-black uppercase tracking-widest ' + emeraldAccentClass }, 'UDL access & challenge'),
                    h('h4', { id: 'weather-mission-support-title', className: 'mt-1 text-base font-black' }, support.label)
                  ),
                  h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-900') }, band + ' pathway')
                ),
                h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, support.description),
                h('ul', { className: 'mt-3 grid gap-2 md:grid-cols-3', 'aria-label': support.label + ' mission supports' }, support.supports.map(function (item) {
                  return h('li', { key: item, className: 'rounded-lg border p-3 text-xs font-bold leading-relaxed ' + (dark ? 'border-emerald-900 bg-slate-950/60' : 'border-emerald-100 bg-white') }, '\u2713 ' + item);
                }))
              ),
              h('section', { className: 'mt-4 overflow-hidden rounded-xl border ' + (dark ? 'border-violet-800 bg-violet-950/20' : 'border-violet-200 bg-violet-50'), 'data-weather-learning-lens': true, 'aria-labelledby': 'weather-learning-lens-title' },
                h('div', { className: 'border-b p-4 ' + (dark ? 'border-violet-900' : 'border-violet-200') },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + violetAccentClass }, 'Standards-oriented planning'),
                  h('h4', { id: 'weather-learning-lens-title', className: 'mt-1 text-base font-black' }, 'Three-Dimensional Learning Lens'),
                  h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, 'Connect the mission to a science practice, crosscutting concept, and observable evidence artifact.')
                ),
                h('dl', { className: 'grid gap-3 p-4 sm:grid-cols-2' },
                  [
                    ['Science practice', alignment.practice],
                    ['Crosscutting concept', alignment.concept],
                    ['Evidence artifact', alignment.artifact],
                    ['Teacher press', alignment.press]
                  ].map(function (item) {
                    return h('div', { key: item[0], className: 'rounded-lg border p-3 ' + (dark ? 'border-violet-900 bg-slate-950/60' : 'border-violet-100 bg-white') },
                      h('dt', { className: 'text-[11px] font-black uppercase tracking-widest ' + violetAccentClass }, item[0]),
                      h('dd', { className: 'mt-1 text-xs font-bold leading-relaxed ' + mutedClass }, item[1])
                    );
                  })
                ),
                h('p', { className: 'border-t px-4 py-3 text-xs leading-relaxed ' + (dark ? 'border-violet-900 text-violet-300' : 'border-violet-200 text-violet-900') }, 'Local alignment note: Connect this mission to district performance expectations and adopted curriculum.')
              ),
              h('details', { className: 'mt-4 overflow-hidden rounded-xl border ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                h('summary', { className: 'flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400' }, 'Preview copy-ready mission brief'),
                h('pre', { className: 'whitespace-pre-wrap break-words border-t p-4 font-sans text-xs leading-relaxed ' + (dark ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700'), 'aria-label': 'Classroom mission brief plain text' }, missionText)
              ),
              h('section', {
                className: 'mt-4 overflow-hidden rounded-xl border ' + (dark ? 'border-cyan-800 bg-cyan-950/20' : 'border-cyan-200 bg-cyan-50'),
                'data-weather-student-mission-card': true,
                'aria-labelledby': 'weather-student-mission-card-title'
              },
                h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-cyan-900' : 'border-cyan-200') },
                  h('div', { className: 'max-w-2xl' },
                    h('p', { className: 'text-xs font-black uppercase tracking-widest ' + cyanAccentClass }, 'LMS-ready student handout'),
                    h('h4', { id: 'weather-student-mission-card-title', className: 'mt-1 text-base font-black' }, 'Student Mission Card'),
                    h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, 'A student-facing version with directions, evidence expectations, response options, and reflection.')
                  ),
                  h('button', {
                    type: 'button',
                    onClick: copyStudentDirections,
                    'aria-label': 'Copy student mission directions to clipboard',
                    className: 'min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-cyan-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300'
                  }, '\uD83D\uDCCB Copy student directions')
                ),
                h('details', null,
                  h('summary', { className: 'flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400' }, 'Preview student directions'),
                  h('pre', { className: 'whitespace-pre-wrap break-words border-t p-4 font-sans text-xs leading-relaxed ' + (dark ? 'border-cyan-900 text-slate-200' : 'border-cyan-200 text-slate-700'), 'aria-label': 'Student mission directions plain text' }, studentMissionText)
                ),
                h('p', { className: 'border-t px-4 py-3 text-xs leading-relaxed ' + (dark ? 'border-cyan-900 text-cyan-300' : 'border-cyan-200 text-cyan-900') }, 'Student directions exclude teacher press questions, conference records, and local alignment notes.')
              ),
              h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass }, 'Builder selections affect this planning card only. Opening a stage does not reset the scenario, observations, forecasts, or teacher records.')
            )
          );
        }

        function teacherCheckpointDashboard() {
          var observationCount = (d.observationLog || []).length;
          var stationCount = Object.keys(d.stationsViewed || {}).length;
          var selectedChangeCount = (d.lensEvidence || []).length;
          var comparisonComplete = !!d.patternCompared || selectedChangeCount >= 1 || !!d.carriedEvidence;
          var experimentCount = d.experimentsRun || 0;
          var forecastCount = d.forecastsIssued || 0;
          var history = d.forecastHistory || [];
          var latestForecast = history.length ? history[history.length - 1] : null;
          var reasoningLength = (d.reasoning || (latestForecast && latestForecast.reasoning) || '').trim().length;
          var evidenceCount = Math.max((d.evidence || []).length, latestForecast && latestForecast.evidenceCount || 0);
          var reasoningTarget = band === 'K-2' ? 10 : 20;
          var revisionDelta = history.length >= 2 ? Number(history[history.length - 1].score || 0) - Number(history[history.length - 2].score || 0) : null;
          var checkpoints = [
            {
              id: 'observe', icon: '🔭', title: band === 'K-2' ? 'Weather clues' : 'Observation evidence', tab: 'map', complete: observationCount >= 1, started: stationCount >= 1,
              evidence: observationCount ? observationCount + ' saved station observation' + (observationCount === 1 ? '.' : 's.') : stationCount ? stationCount + ' station' + (stationCount === 1 ? '' : 's') + ' inspected; no observation saved yet.' : 'No station evidence recorded yet.',
              prompt: observationCount ? 'Ask: Which measurement is the strongest clue, and why?' : band === 'K-2' ? 'Invite the learner to save one sky or station clue.' : 'Invite the learner to save a station observation before explaining a pattern.'
            },
            {
              id: 'compare', icon: '↔️', title: band === 'K-2' ? 'Notice a change' : 'Pattern comparison', tab: 'map', complete: comparisonComplete, started: !!d.changeLensViewed || !!d.compareScenario,
              evidence: selectedChangeCount ? selectedChangeCount + ' measurable change signal' + (selectedChangeCount === 1 ? ' selected.' : 's selected.') : d.patternCompared ? 'Two weather systems compared at the same model hour.' : d.carriedEvidence ? 'A change-lens evidence set was carried into the forecast.' : 'No recorded comparison yet.',
              prompt: comparisonComplete ? 'Ask: What stayed the same, what changed, and which contrast matters most?' : band === 'K-2' ? 'Ask the learner to name one thing that looks different.' : 'Have the learner compare two systems or select a recent change signal.'
            },
            {
              id: 'test', icon: '🧪', title: band === 'K-2' ? 'Try one change' : 'Controlled test', tab: 'experiment', complete: experimentCount >= 1, started: !!d.experimentPrediction || !!d.experimentResult,
              evidence: d.experimentResult ? (d.experimentResult.predictionCorrect ? 'The latest one-variable test supported the prediction.' : 'The latest one-variable test produced a result to explain and revise.') : experimentCount ? experimentCount + ' controlled test' + (experimentCount === 1 ? ' recorded.' : 's recorded.') : 'No controlled test recorded yet.',
              prompt: experimentCount ? 'Ask: What changed, what stayed fixed, and what mechanism explains the result?' : band === 'K-2' ? 'Ask the learner to predict what one weather change will do.' : 'Have the learner change one variable, predict, and compare with the baseline.'
            },
            {
              id: 'forecast', icon: '📡', title: band === 'K-2' ? 'Share a forecast' : 'Forecast and CER', tab: 'forecast', complete: forecastCount >= 1, started: !!d.predictionPrecip || reasoningLength > 0,
              evidence: latestForecast ? 'Latest verified model match: ' + latestForecast.score + '/100 with ' + (latestForecast.evidenceCount || 0) + ' evidence source' + ((latestForecast.evidenceCount || 0) === 1 ? '.' : 's.') : forecastCount ? forecastCount + ' verified forecast' + (forecastCount === 1 ? ' recorded.' : 's recorded.') : reasoningLength ? 'Reasoning note started (' + reasoningLength + ' of ' + reasoningTarget + ' minimum characters).' : 'No verified forecast recorded yet.',
              prompt: forecastCount ? (evidenceCount >= 2 && reasoningLength >= reasoningTarget ? 'Ask: How does each evidence source support the claim?' : 'Conference on connecting at least two measurements to the claim.') : band === 'K-2' ? 'Help the learner say what may happen and point to a clue.' : 'Have the learner issue a claim, cite measurements, and explain the mechanism.'
            },
            {
              id: 'revise', icon: '🔁', title: band === 'K-2' ? 'Make it better' : 'Revision', tab: 'forecast', complete: history.length >= 2, started: history.length >= 1,
              evidence: history.length >= 2 ? (revisionDelta > 0 ? 'Latest revision improved the model-match score by ' + revisionDelta + ' points.' : revisionDelta < 0 ? 'Latest revision changed the model-match score by ' + revisionDelta + ' points; compare the evidence choices.' : 'The two latest forecasts have the same model-match score; compare their evidence and reasoning.') : history.length === 1 ? 'One verified forecast is ready to revise and compare.' : 'No forecast revision recorded yet.',
              prompt: history.length >= 2 ? 'Ask: What did you change, why, and what would you test next?' : 'Revisit the forecast after new evidence, then explain what changed in the reasoning.'
            }
          ];
          var readyCount = checkpoints.filter(function (checkpoint) { return checkpoint.complete; }).length;
          var nextCheckpoint = checkpoints.filter(function (checkpoint) { return !checkpoint.complete; })[0] || null;
          var readinessPercent = Math.round(readyCount / checkpoints.length * 100);
          function checkpointStatus(checkpoint) {
            return checkpoint.complete ? 'Ready' : checkpoint.started ? 'Developing' : 'Not yet';
          }
          function openCheckpoint(checkpoint) {
            update({ tab: checkpoint.tab, navigatorStage: checkpoint.id });
            if (announce) announce(checkpoint.title + ' student stage opened.');
          }
          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-teacher-checkpoints': true,
            'aria-labelledby': 'weather-teacher-checkpoints-title'
          },
            h('div', { className: 'border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-teal-950/40 to-indigo-950/40' : 'border-teal-200 bg-gradient-to-r from-teal-50 via-white to-indigo-50') },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', { className: 'max-w-2xl' },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + tealAccentClass }, 'Formative assessment snapshot'),
                  h('h3', { id: 'weather-teacher-checkpoints-title', className: 'mt-1 text-lg font-black' }, 'Teacher Checkpoint Dashboard'),
                  h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'Use the recorded work below to choose a short student conference focus. Open the corresponding student stage to gather stronger evidence.')
                ),
                h('div', { className: 'min-w-[210px] flex-1 sm:max-w-xs' },
                  h('div', { className: 'mb-1 flex items-center justify-between gap-3 text-xs font-bold' },
                    h('span', null, readyCount + ' of ' + checkpoints.length + ' checkpoints ready'),
                    h('span', { className: tealAccentClass }, readinessPercent + '%')
                  ),
                  h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-teal-100'), role: 'progressbar', 'aria-label': 'Teacher checkpoint readiness', 'aria-valuemin': 0, 'aria-valuemax': checkpoints.length, 'aria-valuenow': readyCount },
                    h('div', { className: 'h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 transition-all motion-reduce:transition-none', style: { width: readinessPercent + '%' } })
                  )
                )
              )
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-5', role: 'list', 'aria-label': 'Recorded investigation checkpoints' }, checkpoints.map(function (checkpoint) {
                var status = checkpointStatus(checkpoint);
                var statusClass = checkpoint.complete ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : checkpoint.started ? (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-900') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700');
                return h('article', { key: checkpoint.id, role: 'listitem', className: 'flex min-h-[220px] flex-col rounded-xl border p-3 ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                  h('div', { className: 'flex items-start justify-between gap-2' },
                    h('span', { className: 'text-xl', 'aria-hidden': true }, checkpoint.icon),
                    h('span', { className: 'rounded-full px-2 py-1 text-[11px] font-black ' + statusClass }, status)
                  ),
                  h('h4', { className: 'mt-3 text-sm font-black' }, checkpoint.title),
                  h('p', { className: 'mt-2 text-xs leading-relaxed ' + mutedClass }, checkpoint.evidence),
                  h('p', { className: 'mt-3 border-t pt-3 text-xs font-bold leading-relaxed ' + (dark ? 'border-slate-700 ' + tealAccentClass : 'border-slate-200 ' + tealAccentClass) }, checkpoint.prompt)
                );
              })),
              h('div', { className: 'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ' + (dark ? 'border-indigo-800 bg-indigo-950/30' : 'border-indigo-200 bg-indigo-50') },
                h('div', { className: 'max-w-2xl' },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + indigoAccentClass }, nextCheckpoint ? 'Suggested conference focus: ' + nextCheckpoint.title : 'Suggested conference focus: Transfer and model limits'),
                  h('p', { className: 'mt-1 text-sm leading-relaxed ' + mutedClass }, nextCheckpoint ? nextCheckpoint.prompt : 'Compare the teaching model with local weather observations. Ask which assumptions, missing measurements, or scale differences could explain a mismatch.')
                ),
                nextCheckpoint && h('button', { type: 'button', onClick: function () { openCheckpoint(nextCheckpoint); }, className: buttonClass }, 'Open student stage: ' + nextCheckpoint.title + ' →')
              ),
              h('p', { className: 'mt-3 text-xs leading-relaxed ' + mutedClass }, 'Completion indicators summarize recorded interactions; they are not a grade or proof of scientific understanding. Use student explanations, discussion, and work samples to interpret the evidence.')
            )
          );
        }


        function teacherConferencePlanner() {
          var ratings = d.teacherRatings || {};
          var note = d.teacherConferenceNote || '';
          var criteriaByBand = {
            'K-2': [
              { id: 'observe', title: 'Notice a weather clue', detail: 'Names or pictures a useful sky, wind, or temperature clue.' },
              { id: 'compare', title: 'Tell what changed', detail: 'Describes one way the weather became the same or different.' },
              { id: 'explain', title: 'Try one change', detail: 'Makes a prediction and tells what happened after one ingredient changed.' },
              { id: 'revise', title: 'Share and improve', detail: 'Uses a clue to share a forecast, then makes the forecast better.' }
            ],
            '3-5': [
              { id: 'observe', title: 'Record useful measurements', detail: 'Selects and records measurements that help answer the weather question.' },
              { id: 'compare', title: 'Compare patterns over time', detail: 'Uses station or timeline evidence to describe meaningful changes.' },
              { id: 'explain', title: 'Explain one-variable effects', detail: 'Separates what changed from what stayed fixed and explains the outcome.' },
              { id: 'revise', title: 'Forecast and revise with evidence', detail: 'Supports a forecast with evidence and explains why a revision is stronger.' }
            ],
            '6-8': [
              { id: 'observe', title: 'Select relevant station evidence', detail: 'Chooses measurements that are relevant, precise, and sufficient for the claim.' },
              { id: 'compare', title: 'Analyze interacting patterns', detail: 'Connects pressure, moisture, wind, temperature, fronts, or radar across time and place.' },
              { id: 'explain', title: 'Explain cause and effect', detail: 'Uses a controlled comparison to explain a plausible weather mechanism.' },
              { id: 'revise', title: 'Forecast, justify, and revise', detail: 'Builds a CER forecast, checks it against the model, and explains a revision.' }
            ],
            '9-12': [
              { id: 'observe', title: 'Evaluate evidence quality', detail: 'Judges the relevance, precision, limitations, and sufficiency of measurements.' },
              { id: 'compare', title: 'Analyze interacting systems', detail: 'Synthesizes spatial, temporal, and ensemble patterns without overstating certainty.' },
              { id: 'explain', title: 'Defend causal reasoning', detail: 'Uses controlled evidence and atmospheric mechanisms while acknowledging model assumptions.' },
              { id: 'revise', title: 'Calibrate and revise a forecast', detail: 'Aligns confidence with evidence, verifies the claim, and justifies meaningful revisions.' }
            ]
          };
          var criteria = criteriaByBand[band] || criteriaByBand['6-8'];
          var ratingOptions = [
            { id: '', label: 'Not reviewed' },
            { id: 'emerging', label: 'Emerging' },
            { id: 'developing', label: 'Developing' },
            { id: 'secure', label: 'Secure' }
          ];
          var ratedCount = criteria.filter(function (criterion) { return !!ratings[criterion.id]; }).length;
          var secureCount = criteria.filter(function (criterion) { return ratings[criterion.id] === 'secure'; }).length;
          var focusCriterion = criteria.filter(function (criterion) { return !ratings[criterion.id]; })[0] || criteria.filter(function (criterion) { return ratings[criterion.id] !== 'secure'; })[0] || null;
          var reviewPercent = Math.round(ratedCount / criteria.length * 100);
          function setTeacherRating(criterion, rating) {
            var nextRatings = Object.assign({}, ratings);
            if (rating) nextRatings[criterion.id] = rating;
            else delete nextRatings[criterion.id];
            update({ teacherRatings: nextRatings });
            if (announce) announce(criterion.title + ' marked ' + (rating || 'not reviewed') + '.');
          }
          function ratingLabel(value) {
            var option = ratingOptions.filter(function (item) { return item.id === value; })[0];
            return option ? option.label : 'Not reviewed';
          }
          function focusPrompt() {
            if (!focusCriterion) return 'Invite transfer to a new scenario. Ask which evidence would still matter and which model assumptions could change the conclusion.';
            var value = ratings[focusCriterion.id] || '';
            if (!value) return 'Review this look-for during the next student explanation and record one specific example.';
            if (value === 'emerging') return 'Offer a sentence frame, then ask for one measurable example from the simulation.';
            return 'Ask the learner to connect two pieces of evidence, explain why they matter, and try the reasoning in a new scenario.';
          }
          function teacherHandoffBrief() {
            var observationCount = (d.observationLog || []).length;
            var comparisonReady = !!d.patternCompared || (d.lensEvidence || []).length >= 1 || !!d.carriedEvidence;
            var experimentCount = d.experimentsRun || 0;
            var forecastCount = d.forecastsIssued || 0;
            var history = d.forecastHistory || [];
            var checkpointCount = [observationCount >= 1, comparisonReady, experimentCount >= 1, forecastCount >= 1, history.length >= 2].filter(Boolean).length;
            var latest = history.length ? history[history.length - 1] : null;
            var previous = history.length >= 2 ? history[history.length - 2] : null;
            var scoreChange = latest && previous ? Number(latest.score || 0) - Number(previous.score || 0) : null;
            var reflectionShiftLabels = { station: 'Station measurement', pattern: 'Pattern over time', experiment: 'Controlled test', verification: 'Forecast verification', discussion: 'Explaining to someone' };
            var reflectionReadinessLabels = { needHelp: 'Needs a conference', developing: 'Can explain with a prompt', explain: 'Can explain with evidence', transfer: 'Ready to apply to a new system' };
            var pulseQuestions = reasoningPulseQuestions();
            var pulseResponses = d.reasoningPulseResponses || {};
            var pulseAnswered = pulseQuestions.filter(function (question) { return !!pulseResponses[question.id]; }).length;
            var pulseSupported = pulseQuestions.filter(function (question) { return pulseResponses[question.id] === question.correct; }).length;
            var pulseReview = pulseQuestions.filter(function (question) { return pulseResponses[question.id] && pulseResponses[question.id] !== question.correct; }).map(function (question) { return question.title; });
            var peerStrengthLabels = { claim: 'Clear forecast claim', evidence: 'Relevant evidence', reasoning: 'Claim-evidence connection', uncertainty: 'Calibrated uncertainty', safety: 'Useful readiness action' };
            var peerMoveLabels = { askEvidence: 'Add another measurement', explainLink: 'Explain how the evidence supports the claim', considerUncertainty: 'Name what could change the outcome', clarifyAction: 'Connect the hazard to the readiness action', transfer: 'Test the reasoning in another scenario' };
            var lines = [
              'WEATHER SYSTEMS TEACHER HANDOFF',
              'Grade band: ' + band,
              'Scenario: ' + scenario.name,
              'Model time: T +' + state.simHour + ' hours',
              '',
              'RECORDED INTERACTION EVIDENCE (NOT A GRADE)',
              '- Investigation checkpoints ready: ' + checkpointCount + '/5',
              '- Saved station observations: ' + observationCount,
              '- Pattern comparison recorded: ' + (comparisonReady ? 'Yes' : 'Not yet'),
              '- Controlled tests recorded: ' + experimentCount,
              '- Verified forecasts: ' + forecastCount,
              '- Forecast revisions available: ' + history.length,
              '- Learner exit ticket: ' + (d.reflectionSubmitted ? 'Saved' : 'Not yet'),
              '- Reasoning pulse: ' + (pulseAnswered ? pulseSupported + '/' + pulseQuestions.length + ' explanations supported; ' + pulseAnswered + '/' + pulseQuestions.length + ' answered' : 'Not yet'),
              '- Peer review: ' + (d.peerReviewSubmitted ? 'Saved' : 'Not yet')
            ];
            if (latest) lines.push('- Latest model-match score: ' + latest.score + '/100 with ' + (latest.evidenceCount || 0) + ' evidence source' + ((latest.evidenceCount || 0) === 1 ? '' : 's'));
            if (scoreChange != null) lines.push('- Latest score change: ' + (scoreChange > 0 ? '+' : '') + scoreChange + ' points');
            if (pulseReview.length) lines.push('- Reasoning review focus: ' + pulseReview.join(', '));
            if (d.peerReviewSubmitted) {
              lines.push('- Peer-identified strength: ' + (peerStrengthLabels[d.peerReviewStrength] || 'Not recorded'));
              lines.push('- Peer revision move: ' + (peerMoveLabels[d.peerReviewMove] || 'Not recorded'));
              lines.push('- Peer feedback: ' + ((d.peerReviewFeedback || '').replace(/\s+/g, ' ').trim() || 'Not recorded'));
            }
            if (d.reflectionSubmitted) {
              lines.push('- Thinking changed by: ' + (reflectionShiftLabels[d.reflectionShift] || 'Not recorded'));
              lines.push('- Self-assessed explanation readiness: ' + (reflectionReadinessLabels[d.reflectionReadiness] || 'Not recorded'));
              lines.push('- Learner next question: ' + ((d.reflectionQuestion || '').replace(/\s+/g, ' ').trim() || 'Not recorded'));
            }
            lines.push('', 'TEACHER-AUTHORED LOOK-FORS');
            criteria.forEach(function (criterion) {
              lines.push('- ' + criterion.title + ': ' + ratingLabel(ratings[criterion.id] || ''));
            });
            lines.push(
              '',
              'SUGGESTED NEXT INSTRUCTIONAL MOVE',
              focusPrompt(),
              '',
              'CONFERENCE OBSERVATION NOTE',
              note || 'No teacher note recorded.',
              '',
              'Use student explanations and work samples to interpret this summary. Do not add student names or sensitive personal information.'
            );
            var handoffText = lines.join('\n');
            function copyResult(ok) {
              var message = ok ? 'Teacher handoff copied to clipboard.' : 'Copy failed. Select the visible handoff text and copy it manually.';
              if (addToast) addToast(message, ok ? 'success' : 'info');
              if (announce) announce(message);
            }
            function legacyCopy(text) {
              try {
                var field = document.createElement('textarea');
                field.value = text;
                field.setAttribute('readonly', '');
                field.style.position = 'fixed';
                field.style.left = '-9999px';
                field.style.top = '0';
                document.body.appendChild(field);
                field.focus();
                field.select();
                var copied = false;
                try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
                document.body.removeChild(field);
                copyResult(copied);
              } catch (error) {
                copyResult(false);
              }
            }
            function copyHandoff() {
              try {
                if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
                  window.navigator.clipboard.writeText(handoffText).then(function () { copyResult(true); }).catch(function () { legacyCopy(handoffText); });
                  return;
                }
              } catch (error) {}
              legacyCopy(handoffText);
            }
            return h('section', {
              className: 'mt-4 overflow-hidden rounded-xl border ' + (dark ? 'border-teal-800 bg-teal-950/20' : 'border-teal-200 bg-teal-50'),
              'data-weather-teacher-handoff': true,
              'aria-labelledby': 'weather-teacher-handoff-title'
            },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b p-4 ' + (dark ? 'border-teal-900' : 'border-teal-200') },
                h('div', { className: 'max-w-2xl' },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + tealAccentClass }, 'Portable planning record'),
                  h('h4', { id: 'weather-teacher-handoff-title', className: 'mt-1 text-base font-black' }, 'Teacher Handoff Brief'),
                  h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, 'A plain-language snapshot for lesson notes, instructional teams, or the next conference.')
                ),
                h('button', {
                  type: 'button',
                  onClick: copyHandoff,
                  'aria-label': 'Copy Teacher Handoff Brief to clipboard',
                  className: 'min-h-11 rounded-lg bg-teal-700 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-teal-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300'
                }, '\uD83D\uDCCB Copy handoff brief')
              ),
              h('pre', {
                className: 'whitespace-pre-wrap break-words p-4 font-sans text-xs leading-relaxed ' + (dark ? 'text-slate-200' : 'text-slate-700'),
                'aria-label': 'Teacher Handoff Brief plain text'
              }, handoffText),
              h('p', { className: 'border-t px-4 py-3 text-xs font-bold ' + (dark ? 'border-teal-900 text-teal-300' : 'border-teal-200 text-teal-900') }, 'Plain text only. Review the brief before sharing and keep student-identifying information out of the note.')
            );
          }

          return h('section', {
            className: panelClass + ' overflow-hidden',
            'data-weather-teacher-conference-planner': true,
            'aria-labelledby': 'weather-teacher-conference-title'
          },
            h('div', { className: 'border-b p-4 ' + (dark ? 'border-slate-700 bg-gradient-to-r from-slate-900 via-violet-950/30 to-slate-900' : 'border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50') },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', { className: 'max-w-2xl' },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + violetAccentClass }, 'Teacher-authored evidence'),
                  h('h3', { id: 'weather-teacher-conference-title', className: 'mt-1 text-lg font-black' }, 'Teacher Conference Planner'),
                  h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'Use these grade-banded look-fors during discussion or work review. Ratings reflect teacher judgment and remain separate from the automated checkpoint summary.')
                ),
                h('div', { className: 'min-w-[210px] flex-1 sm:max-w-xs' },
                  h('div', { className: 'mb-1 flex items-center justify-between gap-3 text-xs font-bold' },
                    h('span', null, ratedCount + ' of ' + criteria.length + ' look-fors reviewed'),
                    h('span', { className: violetAccentClass }, secureCount + ' secure')
                  ),
                  h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-violet-100'), role: 'progressbar', 'aria-label': 'Teacher look-fors reviewed', 'aria-valuemin': 0, 'aria-valuemax': criteria.length, 'aria-valuenow': ratedCount },
                    h('div', { className: 'h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-sky-400 transition-all motion-reduce:transition-none', style: { width: reviewPercent + '%' } })
                  )
                )
              )
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'grid gap-3 md:grid-cols-2', role: 'list', 'aria-label': band + ' teacher conference look-fors' }, criteria.map(function (criterion, index) {
                var selected = ratings[criterion.id] || '';
                return h('article', { key: criterion.id, role: 'listitem', className: 'rounded-xl border p-4 ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                  h('div', { className: 'flex items-start justify-between gap-3' },
                    h('div', null,
                      h('p', { className: 'text-[11px] font-black uppercase tracking-widest ' + violetAccentClass }, 'Look-for ' + (index + 1)),
                      h('h4', { className: 'mt-1 text-sm font-black' }, criterion.title)
                    ),
                    h('span', { className: 'shrink-0 rounded-full px-2 py-1 text-[11px] font-black ' + (selected === 'secure' ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : selected === 'developing' ? (dark ? 'bg-sky-950 text-sky-300' : 'bg-sky-100 text-sky-800') : selected === 'emerging' ? (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-900') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')) }, ratingLabel(selected))
                  ),
                  h('p', { className: 'mt-2 text-xs leading-relaxed ' + mutedClass }, criterion.detail),
                  h('div', { className: 'mt-3 grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Rate ' + criterion.title }, ratingOptions.map(function (option) {
                    var pressed = selected === option.id;
                    return h('button', {
                      key: option.id || 'not-reviewed',
                      type: 'button',
                      onClick: function () { setTeacherRating(criterion, option.id); },
                      'aria-pressed': pressed,
                      className: 'min-h-11 rounded-lg border px-2 py-2 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-300 ' + (pressed ? (dark ? 'border-violet-300 bg-violet-900 text-white' : 'border-violet-600 bg-violet-100 text-violet-950') : (dark ? 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-violet-50'))
                    }, option.label);
                  }))
                );
              })),
              h('div', { className: 'mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]' },
                h('div', { className: 'rounded-xl border p-4 ' + (dark ? 'border-fuchsia-900 bg-fuchsia-950/20' : 'border-fuchsia-200 bg-fuchsia-50') },
                  h('p', { className: 'text-xs font-black uppercase tracking-widest ' + fuchsiaAccentClass }, focusCriterion ? 'Suggested next look-for: ' + focusCriterion.title : 'Transfer challenge'),
                  h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, focusPrompt())
                ),
                h('div', { className: 'rounded-xl border p-4 ' + (dark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white') },
                  h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
                    h('label', { htmlFor: 'weather-teacher-conference-note', className: 'text-sm font-black' }, 'Conference observation note'),
                    h('span', { id: 'weather-teacher-note-count', className: 'text-xs font-bold ' + mutedClass }, note.length + ' / 280')
                  ),
                  h('textarea', {
                    id: 'weather-teacher-conference-note',
                    value: note,
                    maxLength: 280,
                    onChange: function (event) { update({ teacherConferenceNote: event.target.value.slice(0, 280) }); },
                    'aria-describedby': 'weather-teacher-note-count weather-teacher-note-privacy',
                    placeholder: 'Record a specific student explanation, misconception, or next instructional move.',
                    className: inputClass + ' mt-2 min-h-[120px] resize-y'
                  }),
                  h('div', { className: 'mt-2 flex flex-wrap items-start justify-between gap-3' },
                    h('p', { id: 'weather-teacher-note-privacy', className: 'max-w-xl text-xs leading-relaxed ' + mutedClass }, 'Use instructional observations only. Do not enter student names or sensitive personal information.'),
                    h('button', {
                      type: 'button',
                      onClick: function () {
                        update({ teacherRatings: {}, teacherConferenceNote: '' });
                        if (announce) announce('Teacher conference ratings and note cleared.');
                      },
                      disabled: ratedCount === 0 && !note,
                      className: buttonClass + ' text-xs disabled:cursor-not-allowed disabled:opacity-50'
                    }, 'Clear conference record')
                  )
                )
              ),
              teacherHandoffBrief()
            )
          );
        }

        return h('div', { className: 'mx-auto max-w-5xl space-y-4 p-4' },
          h('div', { className: panelClass + ' p-5', 'data-weather-teacher-guide': true },
            h('p', { className: 'text-xs font-black uppercase tracking-widest ' + skyAccentClass }, 'Ready-to-teach sequence | 35-50 minutes'),
            h('h3', { className: 'mt-1 text-xl font-black' }, 'Predict - Observe - Explain - Revise'),
            h('div', { className: 'mt-4 grid gap-3 sm:grid-cols-4' },
              [
                ['1. Predict', 'Students issue an initial forecast before advancing time.'],
                ['2. Observe', 'Teams inspect multiple stations and analysis layers.'],
                ['3. Explain', 'Students cite measurements in a CER response.'],
                ['4. Revise', 'Verify against the teaching model and improve the claim.']
              ].map(function (item) { return h('div', { key: item[0], className: 'rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: 'text-sm font-black ' + skyAccentClass }, item[0]), h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, item[1])); })
            )
          ),
          teacherMissionBuilder(),
          teacherCheckpointDashboard(),
          teacherConferencePlanner(),
          h('div', { className: panelClass + ' overflow-hidden' },
            h('div', { className: 'border-b p-4 ' + (dark ? 'border-slate-700' : 'border-sky-200') }, h('h3', { className: 'text-base font-black' }, 'Grade-band progression')),
            h('div', { className: 'divide-y ' + (dark ? 'divide-slate-700' : 'divide-sky-100') },
              rows.map(function (row) { return h('div', { key: row[0], className: 'grid gap-2 p-4 sm:grid-cols-[90px_1fr]' }, h('p', { className: 'font-black ' + skyAccentClass }, row[0]), h('p', { className: 'text-sm ' + mutedClass }, row[1])); })
            )
          ),
          h('div', { className: 'grid gap-4 md:grid-cols-2' },
            h('div', { className: panelClass + ' p-4' },
              h('h3', { className: 'text-base font-black' }, 'Discussion prompts'),
              h('ul', { className: 'mt-3 space-y-2 text-sm leading-relaxed ' + mutedClass },
                h('li', null, '\u2022 Which observation changed first? Which changed most?'),
                h('li', null, '\u2022 In the controlled test, what changed, what stayed fixed, and what mechanism explains the result?'),
                h('li', null, '\u2022 What evidence supports your timing estimate?'),
                h('li', null, '\u2022 Why can two nearby stations report different weather?'),
                h('li', null, '\u2022 Which pair of stations best identifies an air-mass boundary, and which signal contributes most?'),
                h('li', null, '\u2022 What additional measurement would reduce uncertainty?'),
                h('li', null, '\u2022 How did ensemble spread change your confidence or school-readiness decision?'),
                h('li', null, '\u2022 What does the station-model wind barb reveal that a weather icon does not?')
              )
            ),
            h('div', { className: panelClass + ' p-4' },
              h('h3', { className: 'text-base font-black' }, 'Model boundaries'),
              h('p', { className: 'mt-3 text-sm leading-relaxed ' + mutedClass }, 'This is a transparent teaching model, not an operational weather forecast. Scenario outcomes are intentionally simplified so students can isolate relationships among temperature, moisture, pressure, lift, wind, fronts, and hazards. The 9-member ensemble varies starting conditions for comparison; it is not an operational probability forecast.'),
              h('p', { className: 'mt-3 text-xs font-bold ' + skyAccentClass }, 'Use the Live Weather connection or another trusted observation source to compare model patterns with timestamped authentic data.'),
              h('p', { className: 'mt-2 text-xs leading-relaxed ' + mutedClass }, 'Immersive 3D and VR are optional representations. Always keep the Canvas map, numeric metrics, keyboard controls, and verbal descriptions available so learners can choose an accessible evidence view. Live observations describe current conditions and should not be presented as an operational forecast.')
            )
          ),
          h('div', { className: panelClass + ' p-4' },
            h('h3', { className: 'text-base font-black' }, 'Standards connections'),
            h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'NGSS practices: analyzing and interpreting data, developing and using models, constructing explanations, and engaging in argument from evidence. Performance connections include K-ESS2-1, K-ESS3-2, 3-ESS2-1, 3-ESS2-2, MS-ESS2-5, MS-ESS2-6, and HS-ESS2-4.')
          )
        );
      }

      var tab = d.tab || 'map';
      return h('section', { className: rootClass, 'data-weather-systems-root': true },
        header(),
        meteorologistBadgeBoard(),
        investigationNavigator(),
        h('div', {
          role: 'tabpanel',
          id: 'weather-panel-' + tab,
          'aria-labelledby': 'weather-tab-' + tab
        }, tab === 'forecast' ? forecastMission() : tab === 'experiment' ? experimentLab() : tab === 'immersive' ? immersiveWeatherLab() : tab === 'teacher' ? teacherGuide() : mapLab())
      );
    }
  });
})();
