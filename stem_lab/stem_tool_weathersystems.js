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

  window.WeatherSystemsKernel = {
    scenarios: SCENARIOS,
    dewPointC: dewPointC,
    projectConditions: projectConditions,
    stationObservation: stationObservation,
    stationNetworkAnalysis: stationNetworkAnalysis,
    expectedForecast: expectedForecast,
    ensembleForecast: ensembleForecast,
    readinessActionForHazard: readinessActionForHazard,
    calibrateConfidence: calibrateConfidence,
    experimentVariables: EXPERIMENT_VARIABLES,
    runExperiment: runExperiment,
    scoreForecast: scoreForecast,
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
    g.font = '700 10px system-ui';
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
    g.fillStyle = palette.text; g.font = '800 10px system-ui'; g.textAlign = 'center'; g.fillText('N', 0, -7);
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
      var dark = ctx.darkMode !== false;
      var band = gradeBand(ctx.gradeLevel);
      var canvasRef = React.useRef(null);
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
          evidence: [],
          forecastHistory: [],
          observationLog: [],
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
        if (!d.predictionPrecip || !d.predictionTiming || !d.predictionHazard || !d.readinessAction || !d.forecastConfidence) {
          if (addToast) addToast('Complete precipitation, timing, hazard, school action, and confidence before issuing the forecast.', 'warning');
          if (announce) announce('Forecast incomplete. Choose precipitation, timing, hazard, school action, and confidence.');
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
          modelHour: state.simHour
        });
        if (history.length > 5) history = history.slice(history.length - 5);
        update({ forecastResult: result, forecastsIssued: issued, bestForecast: best, forecastHistory: history });
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

      var rootClass = 'min-h-screen rounded-xl overflow-hidden ' + (dark ? 'bg-slate-950 text-slate-100' : 'bg-sky-50 text-slate-900');
      var panelClass = 'rounded-xl border shadow-sm ' + (dark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-sky-200');
      var mutedClass = dark ? 'text-slate-300' : 'text-slate-600';
      var inputClass = 'w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none ' + (dark ? 'bg-slate-950 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900');
      var buttonClass = 'rounded-lg px-3 py-2 text-sm font-bold border transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none ' + (dark ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-sky-50');

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
                  h('p', { className: 'text-[9px] font-black uppercase tracking-widest text-indigo-400' }, 'Career pathway'),
                  h('h3', { id: 'meteorologist-badges-title', className: 'text-sm font-black' }, 'Meteorologist Badge Board'),
                  h('p', { className: 'truncate text-[10px] ' + mutedClass }, nextBadge ? 'Next: ' + nextBadge.title + ' - ' + nextBadge.detail : 'All badges earned - keep testing new weather stories!')
                )
              ),
              h('div', { className: 'min-w-[150px] flex-1 sm:max-w-xs' },
                h('div', { className: 'mb-1 flex items-center justify-between text-[10px] font-bold' }, h('span', null, earned + ' of ' + badges.length + ' earned'), h('span', { className: 'text-indigo-400' }, progress + '%')),
                h('div', { className: 'h-2 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-indigo-100'), role: 'progressbar', 'aria-label': 'Meteorologist badges earned', 'aria-valuemin': 0, 'aria-valuemax': badges.length, 'aria-valuenow': earned },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 transition-all', style: { width: progress + '%' } })
                )
              ),
              nextBadge && h('button', { type: 'button', onClick: function () { update({ tab: nextBadge.tab }); }, className: 'rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-black text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-yellow-400' }, nextBadge.action + ' \u2192'),
              h('button', { type: 'button', onClick: function () { update({ badgeBoardOpen: !open }); }, 'aria-expanded': open, 'aria-controls': 'meteorologist-badge-grid', className: buttonClass + ' text-xs' }, open ? 'Hide badges' : 'Show badges')
            ),
            open && h('div', { id: 'meteorologist-badge-grid', className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5', role: 'list', 'aria-label': 'Meteorologist achievement badges' }, badges.map(function (badge) {
              return h('div', { key: badge.id, role: 'listitem', 'aria-label': badge.title + (badge.complete ? ' earned' : ' in progress'), className: 'rounded-xl border p-3 transition-colors ' + (badge.complete ? (dark ? 'border-amber-400/40 bg-amber-400/10' : 'border-amber-200 bg-amber-50') : (dark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white/80')) },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('span', { className: 'text-xl ' + (badge.complete ? '' : 'grayscale opacity-60'), 'aria-hidden': true }, badge.icon),
                  h('span', { className: 'rounded-full px-2 py-0.5 text-[9px] font-black ' + (badge.complete ? 'bg-amber-300 text-amber-950' : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')) }, badge.complete ? '\u2713 Earned' : badge.progress)
                ),
                h('p', { className: 'mt-2 text-xs font-black' }, badge.title),
                h('p', { className: 'mt-1 text-[10px] leading-snug ' + mutedClass }, badge.detail)
              );
            }))
          )
        );
      }

      function header() {
        var tabs = [
          { id: 'map', label: 'Map Lab', icon: '\uD83D\uDDFA\uFE0F' },
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
                h('span', { className: 'rounded-full bg-sky-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white' }, band)
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
            tabs.map(function (tab) {
              var active = (d.tab || 'map') === tab.id;
              return h('button', {
                key: tab.id,
                type: 'button',
                role: 'tab',
                'aria-selected': active,
                onClick: function () { update({ tab: tab.id }); },
                className: 'rounded-full px-4 py-2 text-xs font-black transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none ' + (active ? 'bg-sky-600 text-white' : (dark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-sky-100 text-sky-900 hover:bg-sky-200'))
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
            h('span', { className: 'font-mono text-sky-500' }, value + unit)
          ),
          h('input', {
            id: id,
            type: 'range', min: min, max: max, step: step, value: value,
            onChange: function (event) { setValue(key, Number(event.target.value)); },
            className: 'w-full accent-sky-500'
          })
        );
      }

      function scenarioPicker() {
        return h('div', { className: panelClass + ' p-3' },
          h('label', { htmlFor: 'weather-scenario', className: 'mb-1 block text-xs font-black uppercase tracking-wide text-sky-500' }, 'Scenario'),
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Observation station'),
              h('h3', { className: 'text-base font-black' }, observation.name),
              h('p', { className: 'text-xs ' + mutedClass }, observation.elevation + ' m elevation | T +' + state.simHour + ' h')
            ),
            h('div', { className: 'text-right' },
              h('p', { className: 'text-2xl font-black text-sky-500' }, observation.temperature + '\u00B0C'),
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
                h('p', { className: 'text-[10px] font-bold ' + mutedClass }, row[0]),
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-amber-500' }, 'Synoptic analysis'),
              h('h3', { id: 'weather-network-title', className: 'text-base font-black' }, 'Station Network: Find the Boundary'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, band === '3-5' ? 'Compare nearby stations. Big changes can show where two air masses meet.' : 'Locate the strongest neighboring contrast in temperature, dew point, pressure, and wind direction.')
            ),
            h('span', { className: 'rounded-full px-3 py-1 text-[10px] font-black ' + (dark ? 'bg-amber-950/50 text-amber-300' : 'bg-amber-100 text-amber-800') }, 'T +' + state.simHour + ' h')
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
                h('text', { x: x, y: 143, textAnchor: 'middle', fill: mutedColor, fontSize: 10 }, 'dew ' + item.dewPoint + '\u00B0 | ' + cardinal(item.windDir)),
                h('text', { x: x, y: 159, textAnchor: 'middle', fill: mutedColor, fontSize: 10 }, item.seaLevelPressure + ' hPa')
              );
            }),
            h('text', { x: 70, y: 190, fill: mutedColor, fontSize: 10, fontWeight: 700 }, 'WEST'),
            h('text', { x: 650, y: 190, textAnchor: 'end', fill: mutedColor, fontSize: 10, fontWeight: 700 }, 'EAST')
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Meteorologist notation'),
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
                  h('p', { className: 'text-[9px] font-black uppercase tracking-wide text-sky-500' }, row[0]),
                  h('p', { className: 'text-xs font-bold' }, row[1]),
                  h('p', { className: 'text-[10px] ' + mutedClass }, row[2])
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'From map to atmosphere'),
              h('h3', { id: 'weather-cross-section-title', className: 'text-base font-black' }, 'Vertical air-mass cross-section')
            ),
            h('span', { className: 'rounded-full px-3 py-1 text-[10px] font-black ' + (dark ? 'bg-slate-800 text-sky-300' : 'bg-sky-100 text-sky-800') }, scenario.name)
          ),
          h('svg', { viewBox: '0 0 720 245', className: 'mt-3 h-auto w-full', role: 'img', 'aria-label': frontLabel },
            h('defs', null, h('marker', { id: 'weather-cross-arrow', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto' }, h('path', { d: 'M0,0 L0,6 L7,3 z', fill: textColor }))),
            h('rect', { x: 0, y: 0, width: 720, height: 210, rx: 14, fill: dark ? '#0b1830' : '#e0f2fe' }),
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Evidence notebook'),
              h('h3', { className: 'text-sm font-black' }, 'Logged observations (' + log.length + ')')
            ),
            h('button', { type: 'button', onClick: function () { update({ observationLog: [] }); }, className: 'text-xs font-bold text-sky-500 hover:underline focus:ring-2 focus:ring-yellow-400 focus:outline-none' }, 'Clear log')
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
        var points = [];
        for (var hour = 0; hour <= 12; hour += 2) points.push(projectConditions(state, hour));
        function pathFor(field, low, high) {
          return points.map(function (point, index) {
            var x = 45 + index * 83;
            var y = 125 - ((point[field] - low) / Math.max(1, high - low)) * 82;
            return (index === 0 ? 'M' : 'L') + x + ' ' + clamp(y, 28, 128);
          }).join(' ');
        }
        var temps = points.map(function (p) { return p.temperature; });
        var lowTemp = Math.min.apply(Math, temps) - 2;
        var highTemp = Math.max.apply(Math, temps) + 2;
        return h('div', { className: panelClass + ' p-3' },
          h('div', { className: 'mb-2 flex flex-wrap items-center justify-between gap-2' },
            h('div', null,
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, '12-hour model trend'),
              h('p', { className: 'text-xs ' + mutedClass }, 'Temperature and precipitation potential are linked to the same evolving air mass.')
            ),
            h('div', { className: 'flex gap-3 text-[10px] font-bold ' + mutedClass },
              h('span', null, h('span', { className: 'mr-1 inline-block h-2 w-4 rounded bg-orange-400' }), 'Temperature'),
              h('span', null, h('span', { className: 'mr-1 inline-block h-2 w-4 rounded bg-sky-400' }), 'Precipitation potential')
            )
          ),
          h('svg', { viewBox: '0 0 570 150', className: 'h-auto w-full', role: 'img', 'aria-label': 'Forecast trend from zero to twelve hours. Temperature ranges from ' + lowTemp + ' to ' + highTemp + ' degrees Celsius and precipitation potential changes with the weather system.' },
            [0, 1, 2, 3].map(function (line) { return h('line', { key: 'g' + line, x1: 45, y1: 38 + line * 28, x2: 545, y2: 38 + line * 28, stroke: dark ? '#334155' : '#cbd5e1', strokeWidth: 1 }); }),
            h('path', { d: pathFor('temperature', lowTemp, highTemp), fill: 'none', stroke: '#fb923c', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('path', { d: pathFor('precipPotential', 0, 100), fill: 'none', stroke: '#38bdf8', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            points.map(function (point, index) {
              var x = 45 + index * 83;
              return h('g', { key: point.hour },
                h('circle', { cx: x, cy: clamp(125 - ((point.temperature - lowTemp) / Math.max(1, highTemp - lowTemp)) * 82, 28, 128), r: 4, fill: '#fb923c' }),
                h('circle', { cx: x, cy: clamp(125 - point.precipPotential / 100 * 82, 28, 128), r: 4, fill: '#38bdf8' }),
                h('text', { x: x, y: 145, textAnchor: 'middle', fill: dark ? '#cbd5e1' : '#334155', fontSize: 10 }, '+' + point.hour + 'h')
              );
            })
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-cyan-300' }, 'Time and change'),
              h('h3', { id: 'atmosphere-storyline-title', className: 'text-lg font-black' }, 'Atmosphere Storyline'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Read the model as a sequence of evidence, not a single weather snapshot.')
            ),
            h('div', { className: 'rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10' },
              h('p', { className: 'text-xl font-black text-cyan-300' }, 'T +' + state.simHour),
              h('p', { className: 'text-[9px] font-bold uppercase tracking-wide text-slate-300' }, state.simHour === 0 ? 'Starting conditions' : state.simHour < 6 ? 'Early evolution' : state.simHour < 12 ? 'Developing pattern' : 'Later outlook')
            )
          ),
          h('div', { className: 'p-4' },
            h('div', { className: 'flex flex-wrap items-center gap-2', role: 'group', 'aria-label': 'Jump to a model-hour chapter' },
              h('span', { className: 'mr-1 text-[10px] font-black uppercase tracking-wide text-cyan-300' }, 'Jump to chapter'),
              chapters.map(function (hour) {
                var active = state.simHour === hour;
                return h('button', { key: hour, type: 'button', onClick: function () { update({ simHour: hour, playing: false, timeAdvanced: hour > 0 }); if (announce) announce('Atmosphere storyline moved to model hour ' + hour + '.'); }, 'aria-pressed': active, className: 'rounded-full border px-3 py-1.5 text-[10px] font-black transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 ' + (active ? 'border-cyan-300 bg-cyan-300 text-cyan-950' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10') }, 'T +' + hour);
              })
            ),
            h('div', { className: 'relative mt-4 grid gap-3 md:grid-cols-3', 'aria-live': 'polite' }, cards.map(function (card) {
              var currentCard = card.id === 'now';
              return h('article', { key: card.id, className: 'relative rounded-xl border p-4 ' + (currentCard ? 'border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/30' : 'border-white/10 bg-white/5') },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('div', null,
                    h('p', { className: 'text-[9px] font-black uppercase tracking-wide ' + (currentCard ? 'text-cyan-300' : 'text-slate-400') }, card.eyebrow),
                    h('p', { className: 'mt-1 text-base font-black' }, 'T +' + card.hour + ' hours')
                  ),
                  h('span', { className: 'text-xl', 'aria-hidden': true }, card.icon)
                ),
                h('p', { className: 'mt-3 rounded-lg bg-black/20 p-2 font-mono text-[10px] leading-relaxed text-cyan-100' }, conditionsLine(card.point)),
                h('p', { className: 'mt-3 text-xs leading-relaxed text-slate-200' }, card.story)
              );
            })),
            h('div', { className: 'mt-4 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3' },
              h('span', { className: 'text-xl', 'aria-hidden': true }, '\uD83D\uDC41\uFE0F'),
              h('div', null,
                h('p', { className: 'text-[9px] font-black uppercase tracking-wide text-amber-300' }, 'Evidence cue'),
                h('p', { className: 'mt-1 text-xs font-bold leading-relaxed' }, watchCue)
              )
            ),
            h('p', { className: 'mt-3 text-[10px] leading-relaxed text-slate-400' }, 'Storyline chapters are projections from this transparent teaching model, not observed future weather.')
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
              h('p', { className: 'text-[9px] font-black uppercase tracking-widest text-violet-400' }, 'Map appearance'),
              h('h3', { id: 'visual-scene-studio-title', className: 'text-xs font-black uppercase tracking-wide' }, 'Visual Scene Studio')
            ),
            h('span', { className: 'rounded-full px-2 py-1 text-[9px] font-black ' + (activePreset ? (dark ? 'bg-violet-950 text-violet-300' : 'bg-violet-100 text-violet-800') : (dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')), role: 'status', 'aria-live': 'polite' }, activePreset ? activePreset.label : 'Custom mix')
          ),
          h('div', { className: 'p-3' },
            h('div', { className: 'grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Weather map visual presets' }, presets.map(function (preset) {
              var selected = activePreset && activePreset.id === preset.id;
              return h('button', { key: preset.id, type: 'button', onClick: function () { applyVisualPreset(preset); }, 'aria-pressed': !!selected, className: 'rounded-xl border p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 ' + (selected ? 'border-violet-400 bg-violet-600 text-white shadow-md' : (dark ? 'border-slate-700 bg-slate-950/60 hover:border-violet-500/50 hover:bg-slate-800' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50')) },
                h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-base', 'aria-hidden': true }, preset.icon), h('span', { className: 'text-[10px] font-black' }, preset.label)),
                h('p', { className: 'mt-1 text-[9px] leading-snug ' + (selected ? 'text-violet-100' : mutedClass) }, preset.detail)
              );
            })),
            h('div', { className: 'mt-3 border-t pt-3 ' + (dark ? 'border-slate-700' : 'border-sky-100') },
              h('div', { className: 'mb-1 flex items-center justify-between gap-2' },
                h('p', { className: 'text-[9px] font-black uppercase tracking-wide text-sky-500' }, 'Fine-tune layers'),
                h('span', { className: 'text-[9px] ' + mutedClass }, layers.filter(function (layer) { return layer.value; }).length + '/4 visible')
              ),
              layers.map(function (layer) {
                return h('label', { key: layer.id, className: 'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors ' + (dark ? 'hover:bg-slate-800' : 'hover:bg-sky-50') },
                  h('span', { className: 'flex items-center gap-2' },
                    h('span', { className: 'flex h-6 w-6 items-center justify-center rounded-md ' + (layer.value ? (dark ? 'bg-sky-950 text-sky-300' : 'bg-sky-100 text-sky-700') : (dark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')), 'aria-hidden': true }, layer.icon),
                    h('span', null, h('span', { className: 'block text-[10px] font-black' }, layer.label), h('span', { className: 'block text-[9px] ' + mutedClass }, layer.detail))
                  ),
                  h('input', { type: 'checkbox', checked: layer.value, onChange: function (event) { var patch = {}; patch[layer.id] = event.target.checked; update(patch); }, className: 'h-4 w-4 ' + layer.accent, 'aria-label': layer.label })
                );
              })
            ),
            h('p', { className: 'mt-2 rounded-lg p-2 text-[9px] leading-relaxed ' + (dark ? 'bg-slate-950/70 text-slate-400' : 'bg-sky-50 text-slate-600') }, 'Visual presets change only the displayed layers. Weather measurements and model outcomes stay the same.')
          )
        );
      }

      function mapLab() {
        var showAdvanced = band === '6-8' || band === '9-12';
        return h('div', { className: 'grid gap-4 p-4 lg:grid-cols-[285px_minmax(0,1fr)]' },
          h('aside', { className: 'space-y-3' },
            scenarioPicker(),
            h('div', { className: panelClass + ' space-y-3 p-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('p', { className: 'text-xs font-black uppercase tracking-wide text-sky-500' }, showAdvanced ? 'Model variables' : 'Weather controls'),
                h('button', { type: 'button', onClick: function () { applyScenario(scenario.id); }, className: 'text-xs font-bold text-sky-500 hover:underline focus:ring-2 focus:ring-yellow-400 focus:outline-none' }, 'Reset')
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
                h('canvas', {
                  ref: canvasRef,
                  width: 960,
                  height: 500,
                  className: 'block h-auto w-full',
                  role: 'img',
                  'aria-describedby': 'weather-map-visual-key',
                  'aria-label': scenario.name + ' weather map at model hour ' + state.simHour + '. ' + current.cloudCover + ' percent cloud cover, ' + current.precipPotential + ' percent precipitation potential, wind from ' + cardinal(current.windDir) + ' at ' + current.windSpeed + ' kilometers per hour. Visible layers include pressure contours' + (state.fronts ? ', fronts' : '') + (state.radar ? ', radar intensity and sweep' : '') + (state.windLayer ? ', and directional wind tracers' : '') + '.'
                })
              ),
              h('div', { id: 'weather-map-visual-key', className: 'flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2 text-[10px] font-bold ' + (dark ? 'border-slate-700 bg-slate-950/80 text-slate-300' : 'border-sky-200 bg-sky-50 text-slate-700'), 'data-weather-canvas-visual-key': true },
                h('span', { className: 'font-black uppercase tracking-wide text-sky-500' }, 'Canvas visual key'),
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
                    className: 'rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none ' + (active ? 'border-sky-400 bg-sky-600 text-white' : (dark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-sky-200 bg-white hover:bg-sky-50'))
                  }, item.name, h('span', { className: 'mt-0.5 block text-[10px] font-normal opacity-80' }, item.elevation + ' m'));
                })
              )
            ),
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

      function forecastMission() {
        var truth = forecastResult && forecastResult.truth;
        var selectedEvidenceCount = (d.evidence || []).length;
        var reasoningLength = (d.reasoning || '').trim().length;
        var ensemble = ensembleForecast(state);
        var readinessItems = [
          { id: 'evidence', icon: '\uD83D\uDD0E', label: 'Select 3 evidence sources', complete: selectedEvidenceCount >= 3, progress: Math.min(1, selectedEvidenceCount / 3), status: selectedEvidenceCount + '/3' },
          { id: 'precip', icon: '\uD83C\uDF27\uFE0F', label: 'Choose precipitation', complete: !!d.predictionPrecip, progress: d.predictionPrecip ? 1 : 0, status: d.predictionPrecip ? 'Chosen' : 'Needed' },
          { id: 'timing', icon: '\u23F1\uFE0F', label: 'Estimate arrival time', complete: !!d.predictionTiming, progress: d.predictionTiming ? 1 : 0, status: d.predictionTiming ? 'Chosen' : 'Needed' },
          { id: 'hazard', icon: '\u26A0\uFE0F', label: 'Identify a hazard', complete: !!d.predictionHazard, progress: d.predictionHazard ? 1 : 0, status: d.predictionHazard ? 'Chosen' : 'Needed' },
          { id: 'action', icon: '\uD83C\uDFEB', label: 'Choose a school action', complete: !!d.readinessAction, progress: d.readinessAction ? 1 : 0, status: d.readinessAction ? 'Chosen' : 'Needed' },
          { id: 'confidence', icon: '\uD83C\uDFAF', label: 'Rate forecast confidence', complete: !!d.forecastConfidence, progress: d.forecastConfidence ? 1 : 0, status: d.forecastConfidence ? d.forecastConfidence + '%' : 'Needed' },
          { id: 'reasoning', icon: '\uD83E\uDDE0', label: 'Explain your reasoning', complete: reasoningLength >= 20, progress: Math.min(1, reasoningLength / 20), status: reasoningLength >= 20 ? 'Ready' : reasoningLength + '/20 chars' }
        ];
        var forecastReadiness = Math.round(readinessItems.reduce(function(sum, item) { return sum + item.progress; }, 0) / readinessItems.length * 100);
        var nextReadinessItem = readinessItems.filter(function(item) { return !item.complete; })[0] || null;
        var scoringWeights = [
          { label: 'Precipitation', points: 40, color: 'bg-sky-400' },
          { label: 'Timing', points: 25, color: 'bg-violet-400' },
          { label: 'Hazard', points: 25, color: 'bg-amber-400' },
          { label: 'Evidence', points: 10, color: 'bg-emerald-400' }
        ];
        function readinessCard() {
          var checklist = readinessItems.map(function (item) {
            return h('div', { key: item.id, className: 'rounded-xl border p-3 ' + (item.complete ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-white/10 bg-white/5') },
              h('div', { className: 'flex items-start justify-between gap-2' },
                h('span', { className: 'text-lg', 'aria-hidden': true }, item.icon),
                h('span', { className: 'rounded-full px-2 py-0.5 text-[9px] font-black ' + (item.complete ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-slate-200') }, item.complete ? 'Done' : item.status)
              ),
              h('div', { className: 'mt-2 text-[10px] font-black leading-snug' }, item.label)
            );
          });
          var scoreSegments = scoringWeights.map(function (weight) {
            return h('span', { key: weight.label, className: weight.color, style: { width: weight.points + '%' }, title: weight.label + ': ' + weight.points + ' points' });
          });
          var scoreLabels = scoringWeights.map(function (weight) {
            return h('div', { key: weight.label, className: 'flex items-center justify-between text-[9px] text-slate-300' },
              h('span', null, weight.label),
              h('span', { className: 'font-black text-white' }, weight.points + ' pts')
            );
          });
          return h('section', { className: 'overflow-hidden rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 text-white shadow-lg', 'data-weather-forecast-readiness': true, 'aria-labelledby': 'weather-readiness-title' },
            h('div', { className: 'flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4' },
              h('div', null,
                h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-300' }, 'Mission progress'),
                h('h3', { id: 'weather-readiness-title', className: 'mt-1 text-lg font-black' }, 'Forecast Readiness'),
                h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Build a complete, evidence-based forecast before verification.')
              ),
              h('div', { className: 'rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10' },
                h('div', { className: 'text-2xl font-black text-sky-300' }, forecastReadiness + '%'),
                h('div', { className: 'text-[9px] font-bold uppercase tracking-wide text-slate-300' }, forecastReadiness === 100 ? 'Ready to verify' : 'In progress')
              )
            ),
            h('div', { className: 'px-4 pt-3' },
              h('div', { className: 'h-2 overflow-hidden rounded-full bg-black/30', role: 'progressbar', 'aria-label': 'Forecast readiness', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': forecastReadiness },
                h('div', { className: 'h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all', style: { width: forecastReadiness + '%' } })
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 xl:grid-cols-5' }, checklist),
            h('div', { className: 'grid gap-3 border-t border-white/10 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]' },
              h('div', { className: 'flex items-start gap-2 rounded-xl bg-white/5 p-3' },
                h('span', { className: 'text-lg', 'aria-hidden': true }, nextReadinessItem ? '\uD83D\uDCA1' : '\u2705'),
                h('div', null,
                  h('div', { className: 'text-[9px] font-black uppercase tracking-wide text-sky-300' }, nextReadinessItem ? 'Your next move' : 'Forecast complete'),
                  h('p', { className: 'mt-0.5 text-xs font-bold' }, nextReadinessItem ? nextReadinessItem.label : 'All readiness signals are complete. Verify when ready.')
                )
              ),
              h('div', { className: 'rounded-xl bg-white/5 p-3', 'data-weather-scoring-guide': true },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('span', { className: 'text-[9px] font-black uppercase tracking-wide text-sky-300' }, 'Transparent scoring rubric'),
                  h('span', { className: 'text-[9px] text-slate-400' }, 'Reasoning: teacher/peer review')
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
                h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-violet-400' }, 'Uncertainty lab'),
                h('h3', { id: 'weather-ensemble-title', className: 'text-base font-black' }, '9-member teaching ensemble'),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Each member starts with a slightly different temperature, humidity, pressure, wind, and instability value.')
              ),
              h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-violet-950/60' : 'bg-violet-50') },
                h('p', { className: 'text-xl font-black text-violet-400' }, agreementCount + '/9'),
                h('p', { className: 'text-[9px] font-bold ' + mutedClass }, 'agree on ' + labels[ensemble.dominantPrecip])
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
            h('p', { className: 'mt-3 text-[10px] leading-relaxed ' + mutedClass }, 'These 9 outcomes demonstrate sensitivity to starting conditions. Their agreement is not an operational weather probability.')
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
                h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-fuchsia-400' }, 'Predict - verify - revise'),
                h('h3', { id: 'weather-journal-title', className: 'text-base font-black' }, 'Forecast Revision Journal'),
                h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Your last five verified forecasts stay visible for comparison.')
              ),
              h('div', { className: 'flex gap-2' },
                h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-fuchsia-950/50' : 'bg-fuchsia-50') },
                  h('p', { className: 'text-lg font-black text-fuchsia-400' }, history.length),
                  h('p', { className: 'text-[9px] font-bold ' + mutedClass }, history.length === 1 ? 'attempt' : 'attempts')
                ),
                h('div', { className: 'rounded-lg px-3 py-2 text-center ' + (dark ? 'bg-emerald-950/50' : 'bg-emerald-50') },
                  h('p', { className: 'text-lg font-black text-emerald-400' }, history.length ? Math.max.apply(null, history.map(function (entry) { return entry.score; })) : '--'),
                  h('p', { className: 'text-[9px] font-bold ' + mutedClass }, 'best score')
                )
              )
            ),
            h('div', { className: 'p-4' },
              h('div', { className: 'rounded-xl border p-3 ' + (delta != null && delta > 0 ? (dark ? 'border-emerald-700 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50') : (dark ? 'border-fuchsia-800 bg-fuchsia-950/20' : 'border-fuchsia-200 bg-fuchsia-50')) },
                h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-fuchsia-400' }, latest ? (delta != null && delta > 0 ? 'Revision momentum' : 'Reflection prompt') : 'Journal ready'),
                h('p', { className: 'mt-1 text-xs font-bold leading-relaxed' }, reflection)
              ),
              history.length > 0 && h('ol', { className: 'mt-3 space-y-2', 'aria-label': 'Verified forecast attempts' }, history.slice().reverse().map(function (entry, reverseIndex) {
                var isLatest = reverseIndex === 0;
                return h('li', { key: entry.attempt + '-' + reverseIndex, className: 'rounded-xl border p-3 ' + (isLatest ? (dark ? 'border-fuchsia-700 bg-fuchsia-950/20' : 'border-fuchsia-200 bg-fuchsia-50/70') : (dark ? 'border-slate-700' : 'border-slate-200')) },
                  h('div', { className: 'flex items-center justify-between gap-3' },
                    h('div', null,
                      h('p', { className: 'text-xs font-black' }, 'Forecast #' + entry.attempt + (isLatest ? ' - latest' : '')),
                      h('p', { className: 'mt-0.5 text-[10px] ' + mutedClass }, 'Model hour +' + entry.modelHour + ' | ' + entry.evidenceCount + ' evidence sources | ' + entry.confidence + '% confidence')
                    ),
                    h('span', { className: 'rounded-full px-2.5 py-1 text-sm font-black ' + (entry.score >= 80 ? 'bg-emerald-500 text-white' : entry.score >= 55 ? 'bg-amber-400 text-amber-950' : 'bg-rose-500 text-white') }, entry.score)
                  ),
                  h('div', { className: 'mt-2 h-1.5 overflow-hidden rounded-full ' + (dark ? 'bg-slate-800' : 'bg-slate-200'), role: 'progressbar', 'aria-label': 'Forecast ' + entry.attempt + ' score', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': entry.score },
                    h('div', { className: 'h-full rounded-full ' + (entry.score >= 80 ? 'bg-emerald-400' : entry.score >= 55 ? 'bg-amber-400' : 'bg-rose-400'), style: { width: entry.score + '%' } })
                  ),
                  h('p', { className: 'mt-2 text-[10px] leading-relaxed ' + mutedClass }, (precipLabels[entry.precip] || entry.precip) + ' | ' + entry.timing + ' hours | ' + (hazardLabels[entry.hazard] || entry.hazard))
                );
              }))
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
                h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-cyan-300' }, 'Science communication'),
                h('h3', { id: 'weather-broadcast-title', className: 'text-lg font-black' }, 'Weather Broadcast Studio'),
                h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Translate model evidence into a useful briefing for a real audience.')
              ),
              h('span', { className: 'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ' + (communicationReady ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-cyan-200') }, communicationReady ? '\u25CF On air' : completed + '/4 details')
            ),
            h('div', { className: 'p-4' },
              h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-300' }, 'Choose your audience'),
              h('div', { className: 'mt-2 grid grid-cols-3 gap-2' }, audiences.map(function (item) {
                var selected = item.id === audienceId;
                return h('button', { key: item.id, type: 'button', onClick: function () { update({ broadcastAudience: item.id }); }, 'aria-pressed': selected, className: 'rounded-xl border px-2 py-3 text-center text-[10px] font-black transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 ' + (selected ? 'border-cyan-300 bg-cyan-400 text-cyan-950' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10') },
                  h('span', { className: 'mb-1 block text-xl', 'aria-hidden': true }, item.icon), item.label
                );
              })),
              h('div', { className: 'mt-4' },
                h('div', { className: 'mb-2 flex items-center justify-between text-[10px] font-bold text-slate-300' },
                  h('span', null, 'Briefing completeness'),
                  h('span', null, communicationProgress + '%')
                ),
                h('div', { className: 'h-2 overflow-hidden rounded-full bg-black/30', role: 'progressbar', 'aria-label': 'Broadcast briefing completeness', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': communicationProgress },
                  h('div', { className: 'h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all', style: { width: communicationProgress + '%' } })
                )
              ),
              h('div', { className: 'mt-3 grid grid-cols-4 gap-2' }, communicationItems.map(function (item) {
                return h('div', { key: item.label, className: 'rounded-lg border px-2 py-2 text-center text-[9px] font-black ' + (item.complete ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400') }, (item.complete ? '\u2713 ' : '') + item.label);
              })),
              h('div', { className: 'mt-4 rounded-xl border border-cyan-300/20 bg-black/20 p-4', role: 'status', 'aria-live': 'polite' },
                h('div', { className: 'flex items-center justify-between gap-2' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-300' }, communicationReady ? 'Broadcast script ready' : 'Live script builder'),
                  h('span', { className: 'text-[9px] text-slate-400' }, audience.label + ' audience')
                ),
                h('p', { className: 'mt-2 text-sm font-bold leading-relaxed' }, script)
              ),
              h('p', { className: 'mt-3 text-[10px] leading-relaxed text-slate-400' }, 'Communication readiness is separate from forecast accuracy. Verify the science before treating the script as a model outcome.')
            )
          );
        }
        return h('div', { className: 'mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]' },
          h('div', { className: 'space-y-4' },
            h('div', { className: panelClass + ' p-4' },
              h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Meteorologist briefing'),
              h('h3', { className: 'mt-1 text-xl font-black' }, 'What will happen in the next 6 hours?'),
              h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, scenario.summary),
              h('div', { className: 'mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4' },
                [
                  ['Temperature', current.temperature + '\u00B0C'],
                  ['Dew point', current.dewPoint + '\u00B0C'],
                  ['Pressure', current.pressure + ' hPa'],
                  ['Wind', cardinal(current.windDir) + ' ' + current.windSpeed + ' km/h']
                ].map(function (row) { return h('div', { key: row[0], className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: 'text-[10px] ' + mutedClass }, row[0]), h('p', { className: 'text-sm font-black' }, row[1])); })
              )
            ),
            ensemblePanel(),
            readinessCard(),
            forecastJournalPanel(),
            forecastBroadcastPanel(),
            h('div', { className: panelClass + ' p-4' },
              h('h3', { className: 'text-base font-black' }, '1. Select evidence'),
              h('p', { className: 'mt-1 text-xs ' + mutedClass }, 'Choose the observations you used. Strong forecasts connect more than one data source.'),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                EVIDENCE.map(function (item) {
                  var selected = (d.evidence || []).indexOf(item.id) !== -1;
                  return h('button', {
                    key: item.id, type: 'button', onClick: function () { toggleEvidence(item.id); }, 'aria-pressed': selected,
                    className: 'rounded-full border px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none ' + (selected ? 'border-sky-400 bg-sky-600 text-white' : (dark ? 'border-slate-600 bg-slate-950 hover:bg-slate-800' : 'border-slate-300 bg-white hover:bg-sky-50'))
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
              h('label', { htmlFor: 'forecast-reasoning', className: 'mt-4 block' },
                h('span', { className: 'mb-1 block text-xs font-black' }, band === 'K-2' ? 'Why do you think so?' : 'Claim-Evidence-Reasoning note'),
                h('textarea', {
                  id: 'forecast-reasoning', rows: 4, value: d.reasoning || '',
                  onChange: function (event) { update({ reasoning: event.target.value }); },
                  placeholder: band === 'K-2' ? 'I think... because I noticed...' : 'I predict... My evidence is... This matters because...',
                  className: inputClass
                })
              ),
              h('button', { type: 'button', onClick: issueForecast, className: 'mt-4 w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-sky-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none' }, '\uD83D\uDCE1 Verify forecast')
            )
          ),
          h('aside', { className: 'space-y-4' },
            stationPanel(),
            h('div', { className: panelClass + ' p-4', role: 'status', 'aria-live': 'polite' },
              !forecastResult && h('div', null,
                h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Forecast desk'),
                h('h3', { className: 'mt-1 text-lg font-black' }, 'Awaiting your forecast'),
                h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, 'Meteorologists combine observations, patterns, and models. A forecast is a testable claim, not a guess.')
              ),
              forecastResult && h('div', null,
                h('div', { className: 'flex items-end justify-between gap-3' },
                  h('div', null, h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Forecast verification'), h('h3', { className: 'text-lg font-black' }, forecastResult.score >= 80 ? 'Strong forecast' : forecastResult.score >= 55 ? 'Developing forecast' : 'Revise and retry')),
                  h('p', { className: 'text-4xl font-black ' + (forecastResult.score >= 80 ? 'text-emerald-400' : 'text-amber-400') }, forecastResult.score)
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
                    h('span', { className: 'text-xs font-black text-violet-400' }, forecastResult.calibration.selected + '% vs ' + forecastResult.calibration.agreement + '%')
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
                h('text', { x: x1, y: y - 11, textAnchor: 'middle', fill: baseColor, fontSize: 10, fontWeight: 700 }, result.control[metric.key] + metric.unit),
                h('text', { x: x2, y: y + 21, textAnchor: 'middle', fill: testColor, fontSize: 10, fontWeight: 700 }, result.test[metric.key] + metric.unit)
              );
            })
          );
        }

        var effectWord = result ? (result.direction === 'increase' ? 'increase' : result.direction === 'decrease' ? 'decrease' : 'stay close') : '';
        var changeWord = result ? (result.testValue > result.baselineValue ? 'Increasing' : result.testValue < result.baselineValue ? 'Decreasing' : 'Keeping') : '';
        return h('div', { className: 'mx-auto max-w-6xl space-y-4 p-4', 'data-weather-experiment-lab': true },
          h('section', { className: panelClass + ' p-5', 'aria-labelledby': 'weather-experiment-title' },
            h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-cyan-500' }, 'Controlled investigation'),
            h('h3', { id: 'weather-experiment-title', className: 'mt-1 text-xl font-black' }, 'Change one thing'),
            h('p', { className: 'mt-2 text-sm leading-relaxed ' + mutedClass }, band === 'K-2' ? 'Change one weather ingredient. Keep the others the same and see what happens.' : 'Isolate one starting variable while every other condition stays fixed. Predict, test, and explain the modeled effect.')
          ),
          h('div', { className: 'grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]' },
            h('section', { className: panelClass + ' space-y-4 p-4', 'aria-label': 'Controlled experiment setup' },
              h('div', { className: 'rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-cyan-50') },
                h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-cyan-500' }, 'Fair-test rule'),
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
                  h('span', { className: 'font-mono text-cyan-500' }, experimentValue + experimentConfig.unit)
                ),
                h('input', {
                  id: 'weather-experiment-value', type: 'range',
                  min: experimentConfig.min, max: experimentConfig.max, step: experimentConfig.step, value: experimentValue,
                  onChange: function (event) { update({ experimentValue: Number(event.target.value), experimentResult: null }); },
                  className: 'w-full accent-cyan-500'
                }),
                h('div', { className: 'mt-2 grid grid-cols-2 gap-2 text-xs' },
                  h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-slate-950/70' : 'bg-slate-100') }, h('p', { className: mutedClass }, 'Baseline'), h('p', { className: 'font-black' }, state[experimentVariable] + experimentConfig.unit)),
                  h('div', { className: 'rounded-lg p-2 ' + (dark ? 'bg-cyan-950/50' : 'bg-cyan-50') }, h('p', { className: mutedClass }, 'Test'), h('p', { className: 'font-black text-cyan-500' }, experimentValue + experimentConfig.unit))
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
                      className: 'rounded-lg border px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none ' + (selected ? 'border-cyan-400 bg-cyan-600 text-white' : (dark ? 'border-slate-600 bg-slate-950' : 'border-slate-300 bg-white'))
                    }, predictionLabels[choice]);
                  })
                )
              ),
              h('button', { type: 'button', onClick: performExperiment, className: 'w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-black text-white hover:bg-cyan-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none' }, '\uD83E\uDDEA Run controlled test')
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
                    h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-cyan-500' }, 'Experiment result | T +' + result.hour + ' hours'),
                    h('h3', { className: 'mt-1 text-lg font-black' }, result.predictionCorrect ? 'Prediction supported' : 'Revise your explanation')
                  ),
                  h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (result.predictionCorrect ? (dark ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (dark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-800')) }, result.predictionCorrect ? '\u2713 Match' : '\u21BB Different result')
                ),
                comparisonChart(),
                h('div', { className: 'mt-3 rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-cyan-50') },
                  h('p', { className: 'text-xs font-black' }, 'What the model shows'),
                  h('p', { className: 'mt-1 text-sm leading-relaxed ' + mutedClass }, changeWord + ' ' + experimentConfig.label.toLowerCase() + ' from ' + result.baselineValue + result.unit + ' to ' + result.testValue + result.unit + ' made precipitation potential ' + effectWord + ' by ' + Math.abs(result.deltas.precipPotential) + ' percentage points.'),
                  h('p', { className: 'mt-2 text-xs font-bold text-cyan-500' }, band === 'K-2' ? 'Tell a partner what changed and what stayed the same.' : 'Explain the mechanism: How did this variable affect moisture, lift, saturation, clouds, or precipitation?')
                )
              )
            )
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
        return h('div', { className: 'mx-auto max-w-5xl space-y-4 p-4' },
          h('div', { className: panelClass + ' p-5', 'data-weather-teacher-guide': true },
            h('p', { className: 'text-[10px] font-black uppercase tracking-widest text-sky-500' }, 'Ready-to-teach sequence | 35-50 minutes'),
            h('h3', { className: 'mt-1 text-xl font-black' }, 'Predict - Observe - Explain - Revise'),
            h('div', { className: 'mt-4 grid gap-3 sm:grid-cols-4' },
              [
                ['1. Predict', 'Students issue an initial forecast before advancing time.'],
                ['2. Observe', 'Teams inspect multiple stations and analysis layers.'],
                ['3. Explain', 'Students cite measurements in a CER response.'],
                ['4. Revise', 'Verify against the teaching model and improve the claim.']
              ].map(function (item) { return h('div', { key: item[0], className: 'rounded-lg p-3 ' + (dark ? 'bg-slate-950/70' : 'bg-sky-50') }, h('p', { className: 'text-sm font-black text-sky-500' }, item[0]), h('p', { className: 'mt-1 text-xs leading-relaxed ' + mutedClass }, item[1])); })
            )
          ),
          h('div', { className: panelClass + ' overflow-hidden' },
            h('div', { className: 'border-b p-4 ' + (dark ? 'border-slate-700' : 'border-sky-200') }, h('h3', { className: 'text-base font-black' }, 'Grade-band progression')),
            h('div', { className: 'divide-y ' + (dark ? 'divide-slate-700' : 'divide-sky-100') },
              rows.map(function (row) { return h('div', { key: row[0], className: 'grid gap-2 p-4 sm:grid-cols-[90px_1fr]' }, h('p', { className: 'font-black text-sky-500' }, row[0]), h('p', { className: 'text-sm ' + mutedClass }, row[1])); })
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
              h('p', { className: 'mt-3 text-xs font-bold text-sky-500' }, 'Use real local observations after the lab to compare model patterns with authentic weather data.')
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
        tab === 'forecast' ? forecastMission() : tab === 'experiment' ? experimentLab() : tab === 'teacher' ? teacherGuide() : mapLab()
      );
    }
  });
})();
