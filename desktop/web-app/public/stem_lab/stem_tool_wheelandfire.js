// Wheel & Fire: Pottery Lab
// A volume-aware clay-forming, drying, glazing, and kiln simulation with
// cross-cultural technique studies grounded in named communities and sources.
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      return tool && tool.render ? tool.render(ctx) : null;
    }
  };

  (function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('allo-wheel-fire-css')) return;
    var style = document.createElement('style');
    style.id = 'allo-wheel-fire-css';
    style.textContent = [
      '.wheel-fire-shell{container-type:inline-size}',
      '.wheel-fire-shell button,.wheel-fire-shell input,.wheel-fire-shell select,.wheel-fire-shell textarea,.wheel-fire-shell summary{touch-action:manipulation}',
      '.wheel-fire-shell button:focus-visible,.wheel-fire-shell input:focus-visible,.wheel-fire-shell select:focus-visible,.wheel-fire-shell textarea:focus-visible,.wheel-fire-shell svg:focus-visible,.wheel-fire-shell summary:focus-visible{outline:3px solid #0f766e;outline-offset:3px}',
      '.wheel-fire-main{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px}',
      '.wheel-fire-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
      '.wheel-fire-cycle-bar{height:10px;border-radius:999px;overflow:hidden;background:#e2e8f0}',
      '.wheel-fire-cycle-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#fbbf24,#dc2626);transition:width .25s ease}',
      '.wheel-fire-culture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr));gap:10px}',
      '.wheel-fire-stage-line{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}',
      '.wheel-fire-spin{transform-origin:center;animation:wheelFireSpin 1.4s linear infinite}',
      '@keyframes wheelFireSpin{to{transform:rotate(360deg)}}',
      '@container(max-width:760px){.wheel-fire-main{grid-template-columns:1fr}.wheel-fire-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.wheel-fire-stage-line{grid-template-columns:repeat(3,minmax(0,1fr))}}',
      '@media(max-width:480px){.wheel-fire-stats{grid-template-columns:1fr}}',
      '@media(prefers-reduced-motion:reduce){.wheel-fire-shell *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}',
      '@media(forced-colors:active){.wheel-fire-shell button,.wheel-fire-shell input,.wheel-fire-shell select,.wheel-fire-shell textarea,.wheel-fire-shell svg,.wheel-fire-shell section{border:1px solid ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.wheel-fire-shell *:focus-visible{outline:3px solid Highlight!important}}'
    ].join('');
    document.head.appendChild(style);
  })();

  var RING_COUNT = 36;
  var DIMENSION_MODEL_VERSION = 2;
  var STAGES = ['wet', 'leather-hard', 'bone-dry', 'bisque', 'glazed', 'glaze-fired'];
  var CLAY_BODIES = {
    earthenware: { id: 'earthenware', name: 'Earthenware', plasticity: 0.78, maturity: 1040, shrinkage: 0.075, density: 1.78, color: '#b96543', fired: '#c87550', porosity: 0.16, expansion: 0.58, thermalSensitivity: 0.46 },
    stoneware: { id: 'stoneware', name: 'Stoneware', plasticity: 0.72, maturity: 1220, shrinkage: 0.12, density: 1.86, color: '#9b765c', fired: '#94705a', porosity: 0.035, expansion: 0.46, thermalSensitivity: 0.38 },
    porcelain: { id: 'porcelain', name: 'Porcelain', plasticity: 0.48, maturity: 1280, shrinkage: 0.15, density: 1.82, color: '#ddd6c8', fired: '#eeeae1', porosity: 0.012, expansion: 0.40, thermalSensitivity: 0.66 },
    tempered: { id: 'tempered', name: 'Tempered local clay study', plasticity: 0.64, maturity: 900, shrinkage: 0.055, density: 1.72, color: '#a85f3f', fired: '#9b4f36', porosity: 0.22, expansion: 0.62, thermalSensitivity: 0.28 }
  };
  var GLAZES = {
    clear: { id: 'clear', name: 'Clear glaze', color: '#b98969', maturity: 1080, expansion: 0.48 },
    ash: { id: 'ash', name: 'Ash glaze', color: '#84936c', maturity: 1200, expansion: 0.42 },
    iron: { id: 'iron', name: 'Iron red', color: '#8f321f', maturity: 1180, expansion: 0.55 },
    cobalt: { id: 'cobalt', name: 'Cobalt blue', color: '#255c99', maturity: 1220, expansion: 0.50 },
    celadon: { id: 'celadon', name: 'Celadon study', color: '#87a98d', maturity: 1260, expansion: 0.38 },
    tin: { id: 'tin', name: 'Opaque white glaze', color: '#e9e5d8', maturity: 1040, expansion: 0.62 }
  };
  var CYCLE_PROTOCOLS = [
    { id: 'gentle-care', label: 'Gentle care', cycles: 12, dryingRate: 20, cycleTemperatureDelta: 30, note: 'Short reuse with slower drying and a small temperature swing.' },
    { id: 'everyday-service', label: 'Everyday service', cycles: 24, dryingRate: 45, cycleTemperatureDelta: 80, note: 'A neutral classroom comparison point.' },
    { id: 'harsh-contrast', label: 'Harsh contrast', cycles: 36, dryingRate: 85, cycleTemperatureDelta: 160, note: 'A deliberately demanding comparison, not a care recommendation.' }
  ];

  var CULTURAL_STUDIES = [
    {
      id: 'acoma', name: 'Acoma Pueblo pottery', place: 'Acoma Pueblo (Haak\'u), New Mexico, United States', period: 'Living tradition',
      forming: 'Hand-coiled vessels can have remarkably thin walls; clay, slip, construction, and firing choices are part of individual artists\' practice.',
      use: 'Historically and today, artists create vessels for use, exchange, collection, and cultural expression.',
      science: 'Study how coil compression, particle size, and wall uniformity permit a light but stable vessel.',
      respect: 'Acoma designs belong to artists and tribal traditions. This lab provides no motif stamps. Learn from material control and create marks from your own experience.',
      sourceLabel: 'Sky City Cultural Center & Haak\'u Museum', sourceUrl: 'https://skycityacoma.org/acoma-pueblo/acoma-pottery/',
      experiment: { method: 'coil', clayBody: 'tempered', preset: 'bowl', rpm: 0, kilnType: 'open', kilnTemp: 920, glaze: 'clear' }
    },
    {
      id: 'onggi', name: 'Korean onggi', place: 'Korea', period: 'Living tradition',
      forming: 'Large earthenware jars are built and shaped through practiced hand, paddle, coil, and wheel processes, then fired with careful control of air and flame.',
      use: 'Onggi are closely connected with storing and fermenting foods such as sauces, pastes, vegetables, and kimchi.',
      science: 'Investigate how body porosity, firing temperature, wall thickness, and gas exchange affect a storage vessel.',
      respect: 'Onggi is a specific Korean living craft and food tradition—not a generic brown jar. Credit the tradition when discussing the process.',
      sourceLabel: 'Korea.net cultural series', sourceUrl: 'https://www.korea.net/NewsFocus/Culture/view?articleId=119487',
      experiment: { method: 'coil', clayBody: 'stoneware', preset: 'jar', rpm: 18, kilnType: 'wood', kilnTemp: 1200, glaze: 'ash' }
    },
    {
      id: 'gbari', name: 'Gbari pottery', place: 'Central Nigeria', period: 'Living tradition',
      forming: 'Vessels are formed by pulling and coiling, then may be incised or rouletted. Communal open-clamp firing uses locally available fuel.',
      use: 'Forms include practical vessels such as water-storage jars, with surface treatment contributing function, grip, and visual presence.',
      science: 'Compare open firing with a kiln: temperature uniformity, oxygen, porosity, thermal shock, and surface finish all change.',
      respect: 'Name the Gbari tradition specifically. “African pottery” is far too broad; the continent contains many distinct technologies and communities.',
      sourceLabel: 'British Museum collection record', sourceUrl: 'https://www.britishmuseum.org/collection/object/E_Af1989-14-10',
      experiment: { method: 'coil', clayBody: 'tempered', preset: 'jar', rpm: 0, kilnType: 'open', kilnTemp: 850, glaze: 'clear' }
    },
    {
      id: 'talavera', name: 'Artisanal Talavera processes', place: 'Puebla and Tlaxcala, Mexico; Talavera de la Reina and El Puente del Arzobispo, Spain', period: 'Living heritage',
      forming: 'Community workshops coordinate clay preparation, wheel or mold forming, ornament, pigment and enamel preparation, and kiln firing.',
      use: 'Talavera ceramics have domestic, decorative, and architectural uses, with workshop knowledge transmitted across generations.',
      science: 'Trace a multi-stage material system: clay body, bisque, opaque glaze, pigments, heatwork, and glaze-body fit.',
      respect: 'Talavera is a community-held artisanal process and identity. A blue-and-white surface alone does not make a vessel authentic Talavera.',
      sourceLabel: 'UNESCO Intangible Cultural Heritage', sourceUrl: 'https://ich.unesco.org/en/RL/artisanal-talavera-of-puebla-and-tlaxcala-mexico-and-ceramics-of-talavera-de-la-reina-and-el-puente-del-arzobispo-spain-making-process-01462',
      experiment: { method: 'wheel', clayBody: 'earthenware', preset: 'cylinder', rpm: 62, kilnType: 'electric', kilnTemp: 1040, glaze: 'tin' }
    },
    {
      id: 'jomon', name: 'Jōmon pottery study', place: 'Japanese archipelago', period: 'Historical traditions, with major regional and temporal variation',
      forming: 'Jōmon vessels were handbuilt coil by coil rather than thrown on a wheel; cord marking and sculpted or incised surfaces appear on many examples.',
      use: 'Archaeological vessels include cooking and storage forms. “Jōmon” spans a very long period, so no single vessel represents all communities or times.',
      science: 'Explore how temper, coils, wall thickness, open firing below kiln-vitrification temperatures, and textured surfaces interact.',
      respect: 'Treat this as an archaeological process comparison, not a costume or one-click “ancient Japanese style.” Cite the period and object evidence.',
      sourceLabel: 'The Metropolitan Museum of Art', sourceUrl: 'https://www.metmuseum.org/essays/jomon-culture-ca-10500-ca-300-b-c',
      experiment: { method: 'coil', clayBody: 'tempered', preset: 'bowl', rpm: 0, kilnType: 'open', kilnTemp: 880, glaze: 'clear' }
    }
  ];

  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function finite(value, fallback) { value = Number(value); return isFinite(value) ? value : fallback; }
  function clayBody(id) { return CLAY_BODIES[id] || CLAY_BODIES.stoneware; }
  function glazeById(id) { return GLAZES[id] || GLAZES.clear; }
  function normalizeRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') return null;
    var next = {
      label: String(recipe.label || '').trim().slice(0, 48),
      temperPercent: clamp(finite(recipe.temperPercent, 0), 0, 35),
      plasticityShift: clamp(finite(recipe.plasticityShift, 0), -18, 18),
      shrinkageShift: clamp(finite(recipe.shrinkageShift, 0), -3, 3),
      porosityShift: clamp(finite(recipe.porosityShift, 0), -8, 8)
    };
    if (!next.label && next.temperPercent === 0 && next.plasticityShift === 0 && next.shrinkageShift === 0 && next.porosityShift === 0) return null;
    return next;
  }
  function materialProfile(vesselOrId) {
    var body;
    var recipe = null;
    if (typeof vesselOrId === 'string') {
      body = clayBody(vesselOrId);
    } else if (vesselOrId && vesselOrId.id && CLAY_BODIES[vesselOrId.id] && !vesselOrId.clayBody) {
      body = clayBody(vesselOrId.id);
    } else {
      body = clayBody(vesselOrId && vesselOrId.clayBody);
      recipe = normalizeRecipe(vesselOrId && vesselOrId.materialRecipe);
    }
    if (!recipe) return body;
    var temper = recipe.temperPercent / 100;
    return Object.assign({}, body, {
      name: body.name + (recipe.label ? ' - ' + recipe.label : ' recipe study'),
      plasticity: clamp(body.plasticity - temper * 0.42 + recipe.plasticityShift / 100, 0.18, 0.92),
      shrinkage: clamp(body.shrinkage - temper * 0.055 + recipe.shrinkageShift / 100, 0.025, 0.19),
      porosity: clamp(body.porosity + temper * 0.32 + recipe.porosityShift / 100, 0.005, 0.42),
      density: clamp(body.density - temper * 0.45, 1.35, 2.1),
      expansion: clamp(body.expansion + temper * 0.025, 0.2, 0.85),
      thermalSensitivity: clamp(body.thermalSensitivity + temper * 0.16, 0.12, 0.9),
      recipe: recipe
    });
  }
  function copyArray(values) { return Array.prototype.slice.call(values || []); }
  function copyVessel(vessel) {
    var copy = Object.assign({}, vessel || {});
    copy.radii = copyArray(vessel && vessel.radii);
    copy.thickness = copyArray(vessel && vessel.thickness);
    copy.defects = copyArray(vessel && vessel.defects);
    copy.firingLog = copyArray(vessel && vessel.firingLog);
    copy.materialRecipe = normalizeRecipe(vessel && vessel.materialRecipe);
    copy.lastGlazeOutcome = vessel && vessel.lastGlazeOutcome ? Object.assign({}, vessel.lastGlazeOutcome, { heatwork: vessel.lastGlazeOutcome.heatwork ? Object.assign({}, vessel.lastGlazeOutcome.heatwork) : null }) : null;
    return copy;
  }
  function profileForPreset(preset) {
    var radii = [], thickness = [];
    for (var i = 0; i < RING_COUNT; i++) {
      var t = i / (RING_COUNT - 1);
      var radius, wall;
      if (preset === 'bowl') {
        radius = 4.7 + Math.pow(t, 0.72) * 4.6 - Math.max(0, t - 0.88) * 5;
        wall = i < 3 ? radius : 0.72 + (1 - t) * 0.18;
      } else if (preset === 'cylinder') {
        radius = 6.25 - t * 0.35 + Math.sin(t * Math.PI) * 0.25;
        wall = i < 3 ? radius : 0.74;
      } else if (preset === 'jar') {
        radius = 5.4 + Math.sin(Math.min(1, t * 1.18) * Math.PI) * 3.6;
        if (t > 0.73) radius = 7.4 - (t - 0.73) * 11.1;
        wall = i < 3 ? radius : 0.82 + (1 - t) * 0.12;
      } else {
        radius = 6.4 + Math.sin(t * Math.PI) * 0.65 - t * 0.35;
        var inner = t > 0.18 ? 1.5 + (t - 0.18) * 2.0 : 0;
        wall = Math.max(0.75, radius - inner);
      }
      radii.push(clamp(radius, 1.2, 12));
      thickness.push(clamp(wall, 0.28, radius));
    }
    return { radii: radii, thickness: thickness };
  }
  function makeVessel(bodyId, preset) {
    preset = preset || 'lump';
    var profile = profileForPreset(preset);
    var heights = { lump: 14.5, bowl: 16, cylinder: 22, jar: 24 };
    return {
      version: 1,
      clayBody: CLAY_BODIES[bodyId] ? bodyId : 'stoneware',
      preset: preset,
      radii: profile.radii,
      thickness: profile.thickness,
      heightCm: heights[preset] || heights.lump,
      moisture: preset === 'lump' ? 0.92 : 0.78,
      centered: preset === 'lump' ? 38 : 82,
      wobble: preset === 'lump' ? 0.48 : 0.14,
      compression: preset === 'lump' ? 0.32 : 0.68,
      coilBond: preset === 'lump' ? 0.72 : 0.84,
      stage: 'wet',
      collapsed: false,
      defects: [],
      glazeId: '',
      glazeThickness: 50,
      surfaceColor: clayBody(bodyId).color,
      materialRecipe: null,
      actions: 0,
      removedVolume: 0,
      maturation: 0,
      firedPorosity: null,
      lastHeatwork: null,
      lastGlazeOutcome: null,
      firingLog: [],
      lastOutcome: 'Clay is wet and workable.'
    };
  }
  function normalizeVessel(vessel, bodyId) {
    if (!vessel || !Array.isArray(vessel.radii) || vessel.radii.length !== RING_COUNT || !Array.isArray(vessel.thickness) || vessel.thickness.length !== RING_COUNT) {
      return makeVessel(bodyId || 'stoneware', 'lump');
    }
    var next = copyVessel(vessel);
    next.clayBody = CLAY_BODIES[next.clayBody] ? next.clayBody : (bodyId || 'stoneware');
    next.heightCm = clamp(finite(next.heightCm, 15), 5, 38);
    next.moisture = clamp(finite(next.moisture, 0.8), 0, 1);
    next.centered = clamp(finite(next.centered, 50), 0, 100);
    next.wobble = clamp(finite(next.wobble, 0.3), 0, 1);
    next.compression = clamp(finite(next.compression, 0.55), 0, 1);
    next.coilBond = clamp(finite(next.coilBond, 0.75), 0, 1);
    next.maturation = clamp(finite(next.maturation, 0), 0, 1);
    next.firedPorosity = typeof next.firedPorosity === 'number' && isFinite(next.firedPorosity) ? clamp(next.firedPorosity, 0.005, 0.45) : null;
    next.materialRecipe = normalizeRecipe(next.materialRecipe);
    next.lastGlazeOutcome = next.lastGlazeOutcome && typeof next.lastGlazeOutcome === 'object' ? Object.assign({}, next.lastGlazeOutcome, { heatwork: next.lastGlazeOutcome.heatwork ? Object.assign({}, next.lastGlazeOutcome.heatwork) : null }) : null;
    next.stage = STAGES.indexOf(next.stage) >= 0 ? next.stage : 'wet';
    for (var i = 0; i < RING_COUNT; i++) {
      next.radii[i] = clamp(next.radii[i], 1.2, 12.5);
      next.thickness[i] = clamp(next.thickness[i], 0.2, next.radii[i]);
    }
    return next;
  }
  function vesselVolume(vessel) {
    var dy = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var total = 0;
    for (var i = 0; i < RING_COUNT; i++) {
      var outer = vessel.radii[i];
      var inner = Math.max(0, outer - vessel.thickness[i]);
      total += Math.PI * (outer * outer - inner * inner) * dy;
    }
    return total;
  }
  function vesselCapacity(vessel) {
    var dy = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var total = 0;
    for (var i = 2; i < RING_COUNT; i++) {
      var inner = Math.max(0, vessel.radii[i] - vessel.thickness[i]);
      total += Math.PI * inner * inner * dy;
    }
    return total;
  }
  function preserveVolume(vessel, target) {
    for (var pass = 0; pass < 5; pass++) {
      var current = vesselVolume(vessel);
      if (current <= 0) break;
      var ratio = clamp(target / current, 0.78, 1.28);
      for (var i = 2; i < RING_COUNT; i++) {
        vessel.thickness[i] = clamp(vessel.thickness[i] * ratio, 0.22, vessel.radii[i]);
      }
      if (Math.abs(target - current) / target < 0.004) break;
    }
    return vessel;
  }
  function estimateHeatwork(settings) {
    settings = settings || {};
    var target = clamp(finite(settings.temperature, 950), 600, 1350);
    var ramp = clamp(finite(settings.ramp, 110), 30, 300);
    var soak = clamp(finite(settings.soak, 10), 0, 90);
    var soakGain = Math.log(1 + soak / 12) * 8.5;
    var slowGain = Math.max(0, 95 - ramp) * 0.045;
    var fastLoss = Math.max(0, ramp - 150) * 0.085;
    var effectiveTemp = clamp(target + soakGain + slowGain - fastLoss, 600, 1375);
    var cones = [
      { temperature: 900, label: '010' }, { temperature: 950, label: '08' }, { temperature: 999, label: '06' },
      { temperature: 1060, label: '04' }, { temperature: 1101, label: '02' }, { temperature: 1137, label: '1' },
      { temperature: 1167, label: '2' }, { temperature: 1196, label: '4' }, { temperature: 1222, label: '6' },
      { temperature: 1241, label: '7' }, { temperature: 1263, label: '8' }, { temperature: 1280, label: '9' },
      { temperature: 1305, label: '10' }
    ];
    var nearest = cones[0];
    for (var i = 1; i < cones.length; i++) if (Math.abs(cones[i].temperature - effectiveTemp) < Math.abs(nearest.temperature - effectiveTemp)) nearest = cones[i];
    return { target: target, ramp: ramp, soak: soak, effectiveTemp: effectiveTemp, cone: nearest.label };
  }
  function estimateThermalHistory(settings) {
    settings = settings || {};
    var target = clamp(finite(settings.temperature, 950), 600, 1350);
    var ramp = clamp(finite(settings.ramp, 110), 30, 300);
    var soak = clamp(finite(settings.soak, 10), 0, 90);
    var coolingRate = clamp(finite(settings.coolingRate, 100), 30, 300);
    var roomTemperature = 20;
    var coolingReference = 100;
    var segments = [
      { id: 'ramp', label: 'Ramp up', startC: roomTemperature, endC: target, durationHours: Math.max(0, target - roomTemperature) / ramp },
      { id: 'soak', label: 'Peak soak', startC: target, endC: target, durationHours: soak / 60 },
      { id: 'cool', label: 'Controlled cool', startC: target, endC: coolingReference, durationHours: Math.max(0, target - coolingReference) / coolingRate }
    ];
    var totalHours = segments.reduce(function (sum, segment) { return sum + segment.durationHours; }, 0);
    segments = segments.map(function (segment) { return Object.assign({}, segment, { relativePct: totalHours ? segment.durationHours / totalHours * 100 : 0 }); });
    return { roomTemperature: roomTemperature, coolingReference: coolingReference, totalHours: totalHours, segments: segments };
  }
  function estimateFiredPorosity(bodyOrId, effectiveTemp, kilnType) {
    var body = typeof bodyOrId === 'string' ? clayBody(bodyOrId) : (bodyOrId || CLAY_BODIES.stoneware);
    var maturation = clamp((finite(effectiveTemp, 950) - (body.maturity - 210)) / 210, 0, 1);
    var openPenalty = kilnType === 'open' ? 0.035 : 0;
    return {
      maturation: maturation,
      porosity: clamp(body.porosity + (1 - maturation) * 0.18 + openPenalty, 0.005, 0.42)
    };
  }
  function analyzeGlazeOutcome(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var body = materialProfile(vessel);
    var glaze = glazeById(vessel.glazeId);
    var kilnType = settings.kilnType || 'electric';
    var atmosphere = kilnType === 'electric' ? 'oxidation' : (settings.atmosphere || 'oxidation');
    var heatwork = estimateHeatwork({ temperature: finite(settings.temperature, glaze.maturity), ramp: settings.ramp, soak: settings.soak });
    var effectiveTemp = heatwork.effectiveTemp;
    var meltIndex = clamp((effectiveTemp - (glaze.maturity - 110)) / 180, 0, 1.35);
    var underfire = clamp((glaze.maturity - 70 - effectiveTemp) / 100, 0, 1);
    var overfire = clamp((effectiveTemp - (glaze.maturity + 55)) / 100, 0, 1);
    var coverage = clamp(finite(vessel.glazeThickness, 50), 5, 100) / 100;
    var thinCoverage = clamp((0.28 - coverage) / 0.28, 0, 1);
    var thickCoverage = clamp((coverage - 0.78) / 0.22, 0, 1);
    var fitGap = glaze.expansion - body.expansion;
    var fitRisk = clamp((Math.abs(fitGap) - 0.035) / 0.105, 0, 1);
    var runRisk = clamp(thickCoverage * 0.62 + overfire * 0.72 + (kilnType === 'open' ? 0.08 : 0), 0, 1);
    var pinholeRisk = clamp(underfire * 0.48 + thickCoverage * 0.28 + Math.max(0, finite(settings.ramp, 110) - 170) / 130 * 0.16, 0, 1);
    var crawlingRisk = clamp(thickCoverage * 0.34 + overfire * 0.18 + fitRisk * 0.16, 0, 1);
    var surfaceScore = clamp(100 - underfire * 48 - overfire * 34 - fitRisk * 28 - thinCoverage * 22 - runRisk * 18 - pinholeRisk * 12 - crawlingRisk * 12, 0, 100);
    var fitScore = clamp(100 - fitRisk * 100, 0, 100);
    var status = surfaceScore >= 78 ? 'More controlled modeled surface outcome' : (surfaceScore >= 52 ? 'Mixed modeled surface outcome' : 'High modeled surface variability');
    var summary = 'Heatwork near cone ' + heatwork.cone + '; modeled glaze-body expansion gap ' + fitGap.toFixed(2) + '. ' + (underfire > 0.45 ? 'Heatwork is below the glaze window.' : (overfire > 0.45 ? 'Heatwork is above the glaze window.' : 'Heatwork overlaps the glaze window.'));
    return {
      glazeId: glaze.id,
      glazeName: glaze.name,
      bodyId: body.id,
      bodyName: body.name,
      temperature: finite(settings.temperature, glaze.maturity),
      effectiveTemperature: effectiveTemp,
      heatwork: heatwork,
      atmosphere: atmosphere,
      coveragePct: coverage * 100,
      meltIndexPct: meltIndex * 100,
      fitGap: fitGap,
      fitScore: fitScore,
      runRiskPct: runRisk * 100,
      pinholeRiskPct: pinholeRisk * 100,
      crawlingRiskPct: crawlingRisk * 100,
      surfaceScore: surfaceScore,
      status: status,
      summary: summary
    };
  }
  function analyzeFiringSchedule(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var body = materialProfile(vessel);
    var target = clamp(finite(settings.temperature, body.maturity), 600, 1350);
    var ramp = clamp(finite(settings.ramp, 110), 30, 300);
    var soak = clamp(finite(settings.soak, 10), 0, 90);
    var coolingRate = clamp(finite(settings.coolingRate, 100), 30, 300);
    var kilnType = settings.kilnType || 'electric';
    var atmosphere = kilnType === 'electric' ? 'oxidation' : (settings.atmosphere || 'oxidation');
    var heatwork = estimateHeatwork({ temperature: target, ramp: ramp, soak: soak });
    var thermalHistory = estimateThermalHistory({ temperature: target, ramp: ramp, soak: soak, coolingRate: coolingRate });
    var fired = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
    var thermalRisk = clamp((coolingRate * body.thermalSensitivity) / 140 * 100, 0, 100);
    var rampRisk = clamp((ramp - 150) / 150 * 100, 0, 100);
    var maturityDistance = Math.abs(heatwork.effectiveTemp - body.maturity);
    var maturityRisk = clamp(maturityDistance / 230 * 100, 0, 100);
    var scheduleScore = clamp(100 - thermalRisk * 0.32 - rampRisk * 0.22 - maturityRisk * 0.46 - (kilnType === 'open' ? 8 : 0), 0, 100);
    var glazeOutcome = null;
    if (settings.glazeId || vessel.glazeId) {
      var glazeVessel = copyVessel(vessel);
      glazeVessel.stage = 'glazed';
      glazeVessel.glazeId = settings.glazeId || vessel.glazeId;
      glazeVessel.glazeThickness = clamp(finite(settings.glazeThickness, vessel.glazeThickness || 50), 5, 100);
      glazeOutcome = analyzeGlazeOutcome(glazeVessel, { temperature: target, ramp: ramp, soak: soak, kilnType: kilnType, atmosphere: atmosphere });
    }
    var status = scheduleScore >= 78 ? 'More controlled modeled schedule' : (scheduleScore >= 52 ? 'Mixed modeled schedule' : 'High modeled schedule risk');
    return {
      temperature: target,
      ramp: ramp,
      soak: soak,
      coolingRate: coolingRate,
      kilnType: kilnType,
      atmosphere: atmosphere,
      heatwork: heatwork,
      thermalHistory: thermalHistory,
      maturationPct: fired.maturation * 100,
      porosityPct: fired.porosity * 100,
      thermalRiskPct: thermalRisk,
      rampRiskPct: rampRisk,
      maturityRiskPct: maturityRisk,
      score: scheduleScore,
      status: status,
      glazeOutcome: glazeOutcome,
      summary: 'Effective heatwork ' + Math.round(heatwork.effectiveTemp) + '°C equivalent near cone ' + heatwork.cone + '; modeled body porosity ' + (fired.porosity * 100).toFixed(1) + '%.'
    };
  }
  function compareMaterialProfiles(vesselOrBody, recipe, settings) {
    settings = settings || {};
    var source = typeof vesselOrBody === 'string' ? makeVessel(vesselOrBody, 'bowl') : normalizeVessel(vesselOrBody);
    var baselineVessel = copyVessel(source);
    baselineVessel.materialRecipe = null;
    var baseline = materialProfile(baselineVessel);
    var previewVessel = copyVessel(baselineVessel);
    previewVessel.materialRecipe = normalizeRecipe(recipe);
    var profile = materialProfile(previewVessel);
    var kilnType = settings.kilnType || 'electric';
    var heatwork = estimateHeatwork({ temperature: finite(settings.temperature, baseline.maturity), ramp: settings.ramp, soak: settings.soak });
    var baseFired = estimateFiredPorosity(baseline, heatwork.effectiveTemp, kilnType);
    var recipeFired = estimateFiredPorosity(profile, heatwork.effectiveTemp, kilnType);
    return {
      bodyId: baseline.id,
      recipe: normalizeRecipe(recipe),
      baseline: baseline,
      profile: profile,
      delta: {
        plasticity: profile.plasticity - baseline.plasticity,
        shrinkage: profile.shrinkage - baseline.shrinkage,
        porosity: profile.porosity - baseline.porosity,
        density: profile.density - baseline.density,
        thermalSensitivity: profile.thermalSensitivity - baseline.thermalSensitivity
      },
      heatwork: heatwork,
      baselineFiredPorosity: baseFired,
      firedPorosity: recipeFired
    };
  }
  function analyzeRingRisks(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var body = materialProfile(vessel);
    var ringHeight = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var wetWeakness = clamp((vessel.moisture - 0.72) / 0.28, 0, 1);
    var risks = [];
    for (var i = 0; i < RING_COUNT; i++) {
      var wall = vessel.thickness[i];
      var radius = vessel.radii[i];
      var previousRadius = vessel.radii[Math.max(0, i - 1)];
      var nextRadius = vessel.radii[Math.min(RING_COUNT - 1, i + 1)];
      var outwardSlope = Math.max(0, radius - previousRadius) / Math.max(0.1, ringHeight);
      var overhang = clamp((outwardSlope - 0.48) / 1.2, 0, 1);
      var thin = clamp((0.48 - wall) / 0.48, 0, 1);
      var thick = clamp((wall - 2.6) / 2.6, 0, 1);
      var neighborWall = (vessel.thickness[Math.max(0, i - 1)] + vessel.thickness[Math.min(RING_COUNT - 1, i + 1)]) / 2;
      var irregularity = clamp(Math.abs(wall - neighborWall) / Math.max(0.18, neighborWall) * 0.55, 0, 1);
      var coilJoint = settings.method === 'coil' ? clamp(1 - vessel.coilBond, 0, 1) : clamp(1 - vessel.coilBond, 0, 1) * 0.18;
      var risk = clamp(
        thin * 0.62 + overhang * 0.22 + thick * 0.14 + irregularity * 0.12 + wetWeakness * 0.08 +
        (1 - vessel.compression) * 0.08 + coilJoint * 0.16 + (1 - body.plasticity) * 0.08 + (vessel.collapsed ? 0.7 : 0),
        0, 1
      );
      risks.push({
        index: i,
        wallCm: wall,
        radiusCm: radius,
        outwardSlope: outwardSlope,
        thinRisk: thin,
        overhangRisk: overhang,
        irregularity: irregularity,
        risk: risk,
        status: risk >= 0.67 ? 'High local risk' : (risk >= 0.4 ? 'Watch this ring' : 'Lower local risk')
      });
    }
    return risks;
  }
  function analyzeVessel(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var walls = vessel.thickness.slice(3);
    var sum = walls.reduce(function (a, b) { return a + b; }, 0);
    var average = sum / Math.max(1, walls.length);
    var variance = walls.reduce(function (a, b) { return a + Math.pow(b - average, 2); }, 0) / Math.max(1, walls.length);
    var sd = Math.sqrt(variance);
    var minWall = Math.min.apply(Math, walls);
    var maxWall = Math.max.apply(Math, walls);
    var maxRadius = Math.max.apply(Math, vessel.radii);
    var uniformity = clamp(100 - (sd / Math.max(0.1, average)) * 85, 0, 100);
    var rpm = clamp(finite(settings.rpm, 55), 0, 120);
    var slenderness = vessel.heightCm / Math.max(1, maxRadius * 2);
    var ringHeight = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var maxOutwardSlope = 0;
    for (var ring = 4; ring < RING_COUNT; ring++) maxOutwardSlope = Math.max(maxOutwardSlope, Math.max(0, vessel.radii[ring] - vessel.radii[ring - 1]) / Math.max(0.1, ringHeight));
    var overhangRisk = clamp((maxOutwardSlope - 0.48) / 1.2, 0, 1);
    var jointRisk = clamp(1 - vessel.coilBond, 0, 1) * (settings.method === 'coil' ? 1 : 0.35);
    var centrifugal = Math.pow(rpm / 100, 2) * (maxRadius / 9) * (0.45 + vessel.heightCm / 36 * 0.7);
    var thinRisk = clamp((0.48 - minWall) / 0.48, 0, 1);
    var wetWeakness = clamp((vessel.moisture - 0.72) / 0.28, 0, 1);
    var stability = 100 - vessel.wobble * 40 - centrifugal * (26 + wetWeakness * 12) - thinRisk * 36 - Math.max(0, slenderness - 1.55) * 27 - overhangRisk * 20 - jointRisk * 24 - (1 - vessel.compression) * 11 - (vessel.collapsed ? 75 : 0);
    stability = clamp(stability, 0, 100);
    var capacity = vesselCapacity(vessel);
    var body = materialProfile(vessel);
    var ringRisks = analyzeRingRisks(vessel, settings);
    var criticalRing = ringRisks[0];
    for (var riskIndex = 1; riskIndex < ringRisks.length; riskIndex++) if (ringRisks[riskIndex].risk > criticalRing.risk) criticalRing = ringRisks[riskIndex];
    var volume = vesselVolume(vessel);
    var shape = slenderness > 1.7 ? 'tall vessel' : (vessel.radii[RING_COUNT - 1] < maxRadius * 0.62 ? 'necked jar' : (vessel.heightCm < maxRadius * 2 ? 'bowl form' : 'cylinder form'));
    return {
      volumeCm3: volume,
      massG: volume * body.density,
      capacityMl: capacity,
      minWallCm: minWall,
      maxWallCm: maxWall,
      averageWallCm: average,
      uniformity: uniformity,
      stability: stability,
      risk: 100 - stability,
      maxRadiusCm: maxRadius,
      slenderness: slenderness,
      overhangRisk: overhangRisk * 100,
      compression: vessel.compression * 100,
      coilBond: vessel.coilBond * 100,
      criticalRing: criticalRing.index,
      maxRingRisk: criticalRing.risk * 100,
      shape: shape,
      status: vessel.collapsed ? 'Collapsed' : (stability >= 75 ? 'Stable' : (stability >= 48 ? 'Watch closely' : 'High collapse risk'))
    };
  }
  function applyTool(vessel, tool, ringIndex, settings) {
    vessel = normalizeVessel(vessel);
    if (vessel.stage !== 'wet' && !(vessel.stage === 'leather-hard' && tool === 'trim')) return copyVessel(vessel);
    var next = copyVessel(vessel);
    settings = settings || {};
    ringIndex = Math.round(clamp(finite(ringIndex, RING_COUNT * 0.55), 0, RING_COUNT - 1));
    var pressure = clamp(finite(settings.pressure, 48), 0, 100) / 100;
    var rpm = clamp(finite(settings.rpm, 58), 0, 120);
    var method = settings.method === 'coil' ? 'coil' : 'wheel';
    var body = materialProfile(next);
    var softness = body.plasticity * (0.44 + next.moisture * 0.72);
    var motion = method === 'wheel' ? (0.62 + rpm / 120 * 0.55) : 0.92;
    var force = clamp(pressure * softness * motion, 0.03, 1.1);
    var before = vesselVolume(next);
    var preserve = tool !== 'trim' && tool !== 'add-coil';
    var radiusDelta = 0.16 + force * 0.58;
    var i;

    if (tool === 'center') {
      var smoothed = copyArray(next.radii);
      for (i = 1; i < RING_COUNT - 1; i++) smoothed[i] = (next.radii[i - 1] + next.radii[i] * 2 + next.radii[i + 1]) / 4;
      for (i = 0; i < RING_COUNT; i++) next.radii[i] = next.radii[i] * (1 - force * 0.28) + smoothed[i] * force * 0.28;
      next.centered = clamp(next.centered + force * 21, 0, 100);
      next.wobble = clamp(next.wobble - force * 0.19, 0, 1);
      next.compression = clamp(next.compression + force * 0.07, 0, 1);
      next.lastOutcome = 'The clay became more centered and rotationally even.';
    } else {
      for (i = Math.max(1, ringIndex - 4); i <= Math.min(RING_COUNT - 1, ringIndex + 4); i++) {
        var distance = Math.abs(i - ringIndex) / 5;
        var weight = Math.pow(Math.max(0, 1 - distance), 1.6);
        if (tool === 'open') {
          next.thickness[i] = clamp(next.thickness[i] - radiusDelta * 0.78 * weight, 0.25, next.radii[i]);
          next.radii[i] = clamp(next.radii[i] + radiusDelta * 0.12 * weight, 1.2, 12.5);
          next.heightCm = clamp(next.heightCm + force * 0.045, 5, 38);
          next.lastOutcome = 'The opening widened and displaced clay into the surrounding wall.';
        } else if (tool === 'pull') {
          next.thickness[i] = clamp(next.thickness[i] * (1 - force * 0.075 * weight), 0.22, next.radii[i]);
          next.radii[i] = clamp(next.radii[i] - radiusDelta * 0.06 * weight, 1.2, 12.5);
          next.heightCm = clamp(next.heightCm + force * 0.16 * weight, 5, 38);
          next.compression = clamp(next.compression - force * 0.018 * weight, 0, 1);
          next.lastOutcome = 'The wall stretched upward and became thinner.';
        } else if (tool === 'belly') {
          next.radii[i] = clamp(next.radii[i] + radiusDelta * weight, 1.2, 12.5);
          next.thickness[i] = clamp(next.thickness[i] * (1 - force * 0.035 * weight), 0.22, next.radii[i]);
          next.compression = clamp(next.compression - force * 0.012 * weight, 0, 1);
          next.lastOutcome = 'Outward pressure expanded the vessel profile.';
        } else if (tool === 'collar') {
          next.radii[i] = clamp(next.radii[i] - radiusDelta * 0.72 * weight, 1.2, 12.5);
          next.thickness[i] = clamp(next.thickness[i] + radiusDelta * 0.15 * weight, 0.22, next.radii[i]);
          next.compression = clamp(next.compression + force * 0.018 * weight, 0, 1);
          next.lastOutcome = 'Inward pressure narrowed the profile and gathered the wall.';
        } else if (tool === 'smooth' || tool === 'paddle') {
          var left = next.radii[Math.max(0, i - 1)], right = next.radii[Math.min(RING_COUNT - 1, i + 1)];
          var localAverage = (left + next.radii[i] * 2 + right) / 4;
          next.radii[i] = next.radii[i] * (1 - force * 0.35 * weight) + localAverage * force * 0.35 * weight;
          next.compression = clamp(next.compression + force * (tool === 'paddle' ? 0.045 : 0.026) * weight, 0, 1);
          next.coilBond = clamp(next.coilBond + force * (tool === 'paddle' ? 0.060 : 0.040) * weight, 0, 1);
          next.lastOutcome = tool === 'paddle' ? 'Paddling compressed and regularized the handbuilt wall.' : 'The surface became more continuous without changing the intended form much.';
        } else if (tool === 'trim') {
          if (i < RING_COUNT * 0.34) {
            var oldRadius = next.radii[i];
            next.radii[i] = clamp(next.radii[i] - radiusDelta * 0.42 * weight, 1.2, 12.5);
            next.thickness[i] = clamp(next.thickness[i] - (oldRadius - next.radii[i]) * 0.45, 0.22, next.radii[i]);
          }
          next.lastOutcome = 'Trimming removed clay from the lower exterior; unlike shaping, that material is no longer in the vessel.';
        }
      }
      if (tool === 'add-coil') {
        for (i = RING_COUNT - 5; i < RING_COUNT; i++) {
          next.radii[i] = clamp(next.radii[i] + force * 0.22, 1.2, 12.5);
          next.thickness[i] = clamp(next.thickness[i] + force * 0.32, 0.22, next.radii[i]);
        }
        next.heightCm = clamp(next.heightCm + force * 0.68, 5, 38);
        next.compression = clamp(next.compression - force * 0.055, 0, 1);
        next.coilBond = clamp(next.coilBond - force * 0.11, 0, 1);
        next.lastOutcome = 'A new coil added clay mass and height at the rim. Paddle or smooth the joint to consolidate it before drying.';
      }
    }

    if (preserve) preserveVolume(next, before);
    if (tool === 'trim') next.removedVolume = finite(next.removedVolume, 0) + Math.max(0, before - vesselVolume(next));
    next.actions = finite(next.actions, 0) + 1;
    if (method === 'wheel' && tool !== 'center') {
      var imbalance = (rpm / 120) * pressure * (1 - next.centered / 100);
      next.wobble = clamp(next.wobble + imbalance * 0.035 - (tool === 'smooth' ? force * 0.03 : 0), 0, 1);
    }
    var stats = analyzeVessel(next, settings);
    if (!next.collapsed && stats.stability < 16 && force > 0.43 && tool !== 'center' && tool !== 'smooth' && tool !== 'paddle') {
      next.collapsed = true;
      next.heightCm = clamp(next.heightCm * 0.72, 5, 38);
      for (i = Math.floor(RING_COUNT * 0.48); i < RING_COUNT; i++) {
        var slump = (i / (RING_COUNT - 1) - 0.48) * 1.7;
        next.radii[i] = clamp(next.radii[i] * (1 + slump * 0.28), 1.2, 12.5);
      }
      next.defects.push('structural collapse');
      next.lastOutcome = 'The wall could not support the combined pressure, speed, height, and moisture, so the upper form slumped.';
    }
    return next;
  }
  function scaleVessel(vessel, factor) {
    vessel.heightCm *= factor;
    for (var i = 0; i < RING_COUNT; i++) {
      vessel.radii[i] *= factor;
      vessel.thickness[i] *= factor;
    }
    return vessel;
  }
  function estimateDryingRisk(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var humidity = clamp(finite(settings.humidity, 45), 10, 95) / 100;
    var dryingRate = clamp(finite(settings.dryingRate, 48), 0, 100) / 100;
    var stats = analyzeVessel(vessel, settings);
    return clamp((100 - stats.uniformity) / 100 * 0.34 + dryingRate * 0.28 + (1 - humidity) * 0.18 + Math.max(0, stats.maxWallCm - 2.2) * 0.08 + (1 - vessel.compression) * 0.12 + (1 - vessel.coilBond) * 0.22, 0, 1);
  }
  function dryVessel(vessel, settings) {
    var next = normalizeVessel(vessel);
    if (next.stage !== 'wet' && next.stage !== 'leather-hard') return next;
    settings = settings || {};
    var body = materialProfile(next);
    var crackRisk = estimateDryingRisk(next, settings);
    var stepShrink = body.shrinkage * (next.stage === 'wet' ? 0.28 : 0.24);
    scaleVessel(next, 1 - stepShrink);
    if (crackRisk > 0.66 && next.defects.indexOf('drying crack') === -1) next.defects.push('drying crack');
    if (next.coilBond < 0.46 && crackRisk > 0.54 && next.defects.indexOf('coil separation') === -1) next.defects.push('coil separation');
    if (next.stage === 'wet') {
      next.stage = 'leather-hard';
      next.moisture = 0.34;
      next.lastOutcome = crackRisk > 0.66 ? 'Rapid, uneven drying opened a crack while the piece reached leather-hard.' : 'The piece reached leather-hard and can now be trimmed carefully.';
    } else {
      next.stage = 'bone-dry';
      next.moisture = 0.018;
      next.lastOutcome = crackRisk > 0.66 ? 'The piece reached bone-dry with visible drying stress.' : 'The piece reached bone-dry and is ready for a cautious bisque firing.';
    }
    return next;
  }
  function estimateDryingHistory(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var result = {
      ready: vessel.stage === 'wet' || vessel.stage === 'leather-hard',
      stage: vessel.stage,
      humidity: clamp(finite(settings.humidity, 45), 10, 95),
      dryingRate: clamp(finite(settings.dryingRate, 48), 0, 100),
      segments: [],
      totalMoistureLossPct: 0,
      hotspots: []
    };
    if (!result.ready) {
      result.summary = 'No modeled drying steps remain after the piece reaches ' + vessel.stage + '.';
      return result;
    }
    var current = copyVessel(vessel);
    var guard = 0;
    while ((current.stage === 'wet' || current.stage === 'leather-hard') && guard < 2) {
      var before = copyVessel(current);
      var crackRisk = estimateDryingRisk(before, settings);
      var after = dryVessel(before, settings);
      var moistureStartPct = before.moisture * 100;
      var moistureEndPct = after.moisture * 100;
      var moistureLossPct = Math.max(0, moistureStartPct - moistureEndPct);
      var newDefects = copyArray(after.defects).filter(function (defect) { return copyArray(before.defects).indexOf(defect) === -1; });
      var dryingMultiplier = 0.78 + result.dryingRate / 100 * 0.32 + (1 - result.humidity / 100) * 0.22;
      var hotspots = analyzeRingRisks(before, settings).map(function (ring) {
        var reason = ring.thinRisk >= ring.overhangRisk && ring.thinRisk >= ring.irregularity ? 'thin wall' : (ring.overhangRisk >= ring.irregularity ? 'outward overhang' : 'wall irregularity');
        return { index: ring.index, wallCm: ring.wallCm, riskPct: clamp(ring.risk * dryingMultiplier * 100, 0, 100), reason: reason };
      }).sort(function (a, b) { return b.riskPct - a.riskPct; }).slice(0, 3);
      result.segments.push({
        id: before.stage,
        label: before.stage + ' to ' + after.stage,
        moistureStartPct: moistureStartPct,
        moistureEndPct: moistureEndPct,
        moistureLossPct: moistureLossPct,
        shrinkagePct: before.heightCm ? Math.max(0, (before.heightCm - after.heightCm) / before.heightCm * 100) : 0,
        crackRiskPct: crackRisk * 100,
        hotspots: hotspots,
        newDefects: newDefects
      });
      result.totalMoistureLossPct += moistureLossPct;
      current = after;
      guard += 1;
    }
    result.segments = result.segments.map(function (segment) { return Object.assign({}, segment, { relativePct: result.totalMoistureLossPct ? segment.moistureLossPct / result.totalMoistureLossPct * 100 : 0 }); });
    result.finalStage = current.stage;
    result.hotspots = result.segments.length ? copyArray(result.segments[0].hotspots) : [];
    result.summary = 'The model removes ' + result.totalMoistureLossPct.toFixed(1) + ' moisture percentage points across ' + result.segments.length + ' drying step' + (result.segments.length === 1 ? '' : 's') + '; drying risk is comparative, not a guarantee against cracking.';
    return result;
  }
  function fireVessel(vessel, settings) {
    var next = normalizeVessel(vessel);
    settings = settings || {};
    var target = clamp(finite(settings.temperature, 950), 600, 1350);
    var ramp = clamp(finite(settings.ramp, 110), 30, 300);
    var soak = clamp(finite(settings.soak, 10), 0, 90);
    var coolingRate = clamp(finite(settings.coolingRate, 100), 30, 300);
    var kilnType = settings.kilnType || 'electric';
    var atmosphere = kilnType === 'electric' ? 'oxidation' : (settings.atmosphere || 'oxidation');
    var body = materialProfile(next);
    var heatwork = estimateHeatwork({ temperature: target, ramp: ramp, soak: soak });
    var firedState = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
    var defects = copyArray(next.defects);
    var outcome = [];
    var glazeOutcome = null;
    if (next.stage === 'bone-dry') {
      if (next.moisture > 0.04) defects.push('steam crack');
      if (ramp > 190) defects.push('thermal crack');
      if (coolingRate * body.thermalSensitivity > 100) defects.push('dunting crack');
      if (heatwork.effectiveTemp < 820) defects.push('underfired bisque');
      if (heatwork.effectiveTemp > 1120 && body.id === 'earthenware') defects.push('body deformation');
      scaleVessel(next, 1 - body.shrinkage * 0.23);
      next.stage = 'bisque';
      next.moisture = 0;
      next.surfaceColor = body.fired;
      next.maturation = firedState.maturation;
      next.firedPorosity = firedState.porosity;
      next.lastHeatwork = heatwork;
      outcome.push('Bisque firing completed at ' + Math.round(target) + '°C with modeled heatwork near cone ' + heatwork.cone + '.');
    } else if (next.stage === 'glazed') {
      var glaze = glazeById(next.glazeId);
      glazeOutcome = analyzeGlazeOutcome(next, { temperature: target, ramp: ramp, soak: soak, kilnType: kilnType, atmosphere: atmosphere });
      var delta = heatwork.effectiveTemp - body.maturity;
      if (delta < -90) defects.push('underfired body');
      if (delta > 80) defects.push('overfired body');
      if (coolingRate * body.thermalSensitivity > 100) defects.push('dunting crack');
      if (heatwork.effectiveTemp < glaze.maturity - 70) defects.push('underfired glaze');
      if (next.glazeThickness > 78 && heatwork.effectiveTemp > glaze.maturity + 35) defects.push('running glaze');
      if (next.glazeThickness < 20) defects.push('thin glaze coverage');
      if (glaze.expansion - body.expansion > 0.11) defects.push('crazing risk');
      if (body.expansion - glaze.expansion > 0.11) defects.push('shivering risk');
      if (kilnType === 'open' && heatwork.effectiveTemp > 1000) defects.push('uneven heatwork');
      scaleVessel(next, 1 - body.shrinkage * 0.25);
      next.stage = 'glaze-fired';
      next.maturation = firedState.maturation;
      next.firedPorosity = firedState.porosity;
      next.lastHeatwork = heatwork;
      next.surfaceColor = glaze.color;
      if (atmosphere === 'reduction' && next.glazeId === 'iron') next.surfaceColor = '#5f2d27';
      if (atmosphere === 'reduction' && next.glazeId === 'celadon') next.surfaceColor = '#6f9a86';
      outcome.push('Glaze firing completed at ' + Math.round(target) + '°C in ' + atmosphere + ', with modeled heatwork near cone ' + heatwork.cone + '.');
    } else {
      next.lastOutcome = 'This firing step is not available at the current stage.';
      return next;
    }
    next.lastGlazeOutcome = glazeOutcome;
    next.defects = defects.filter(function (value, index, array) { return array.indexOf(value) === index; });
    next.firingLog.push({ stage: next.stage, temperature: Math.round(target), effectiveTemperature: Math.round(heatwork.effectiveTemp), cone: heatwork.cone, ramp: Math.round(ramp), soak: Math.round(soak), coolingRate: Math.round(coolingRate), kilnType: kilnType, atmosphere: atmosphere, materialRecipe: normalizeRecipe(next.materialRecipe), glazeOutcome: glazeOutcome, maturation: next.maturation, porosity: next.firedPorosity, defects: copyArray(next.defects) });
    next.lastOutcome = outcome.join(' ') + (glazeOutcome ? ' ' + glazeOutcome.summary : '') + (next.defects.length ? ' Inspect: ' + next.defects.join(', ') + '.' : ' No modeled defects were triggered.');
    return next;
  }
  function glazeVessel(vessel, glazeId, thickness) {
    var next = normalizeVessel(vessel);
    if (next.stage !== 'bisque') return next;
    next.stage = 'glazed';
    next.glazeId = GLAZES[glazeId] ? glazeId : 'clear';
    next.glazeThickness = clamp(finite(thickness, 50), 5, 100);
    next.lastOutcome = glazeById(next.glazeId).name + ' applied at ' + Math.round(next.glazeThickness) + '% thickness. The piece is ready for glaze firing.';
    return next;
  }
  function dimensionModelSettings(settings) {
    settings = settings || {};
    var kilnType = ['electric', 'gas', 'wood', 'open'].indexOf(settings.kilnType) >= 0 ? settings.kilnType : 'electric';
    return {
      modelVersion: Math.round(finite(settings.modelVersion, DIMENSION_MODEL_VERSION)),
      clayBody: CLAY_BODIES[settings.clayBody] ? settings.clayBody : '',
      materialRecipe: normalizeRecipe(settings.materialRecipe),
      method: settings.method === 'coil' ? 'coil' : 'wheel',
      humidity: clamp(finite(settings.humidity, 48), 10, 95),
      dryingRate: clamp(finite(settings.dryingRate, 45), 0, 100),
      temperature: clamp(finite(settings.temperature, 1220), 600, 1350),
      ramp: clamp(finite(settings.ramp, 110), 30, 300),
      soak: clamp(finite(settings.soak, 10), 0, 90),
      coolingRate: clamp(finite(settings.coolingRate, 100), 30, 300),
      kilnType: kilnType,
      atmosphere: kilnType === 'electric' ? 'oxidation' : (settings.atmosphere === 'reduction' ? 'reduction' : 'oxidation')
    };
  }
  function compareDimensionModelSettings(recordedSettings, currentSettings) {
    var current = dimensionModelSettings(currentSettings || {});
    if (!recordedSettings || typeof recordedSettings !== 'object') {
      return { status: 'legacy', stale: false, needsReview: true, changedFields: [], missingFields: ['model context'], recorded: null, current: current, summary: 'No model context was stored with this record. Treat comparisons as legacy evidence and recheck the controls before drawing conclusions.' };
    }
    var recorded = dimensionModelSettings(recordedSettings);
    var missingFields = [];
    ['modelVersion', 'clayBody', 'materialRecipe', 'method'].forEach(function (field) {
      if (!Object.prototype.hasOwnProperty.call(recordedSettings, field)) missingFields.push(field === 'modelVersion' ? 'model version' : (field === 'clayBody' ? 'clay body' : (field === 'materialRecipe' ? 'material recipe' : 'forming method')));
    });
    if (missingFields.length) {
      return { status: 'incomplete', stale: false, needsReview: true, changedFields: [], missingFields: missingFields, recorded: recorded, current: current, summary: 'Model context is incomplete; missing ' + missingFields.join(', ') + '. The frozen dimensions remain available, but the comparison needs review.' };
    }
    var changedFields = [];
    var fields = [
      { id: 'modelVersion', label: 'model version' },
      { id: 'clayBody', label: 'clay body' },
      { id: 'materialRecipe', label: 'material recipe' },
      { id: 'method', label: 'forming method' },
      { id: 'humidity', label: 'humidity' },
      { id: 'dryingRate', label: 'drying rate' },
      { id: 'temperature', label: 'temperature' },
      { id: 'ramp', label: 'heating ramp' },
      { id: 'soak', label: 'peak soak' },
      { id: 'coolingRate', label: 'cooling rate' },
      { id: 'kilnType', label: 'kiln type' },
      { id: 'atmosphere', label: 'atmosphere' }
    ];
    fields.forEach(function (field) {
      var left = field.id === 'materialRecipe' ? JSON.stringify(recorded[field.id]) : recorded[field.id];
      var right = field.id === 'materialRecipe' ? JSON.stringify(current[field.id]) : current[field.id];
      if (left !== right) changedFields.push(field.label);
    });
    return {
      status: changedFields.length ? 'stale' : 'current',
      stale: changedFields.length > 0,
      needsReview: changedFields.length > 0,
      changedFields: changedFields,
      missingFields: [],
      recorded: recorded,
      current: current,
      summary: changedFields.length ? 'Model inputs changed since this record: ' + changedFields.join(', ') + '. Residuals remain tied to the frozen record, but do not treat them as a same-condition comparison.' : 'Model inputs match the logged record.'
    };
  }
  function dimensionSnapshot(vessel, label, baseline) {
    vessel = normalizeVessel(vessel);
    var stats = analyzeVessel(vessel, { rpm: 0 });
    var heightCm = finite(vessel.heightCm, 0);
    var diameterCm = Math.max.apply(Math, vessel.radii) * 2;
    var capacityMl = stats.capacityMl;
    return {
      label: label,
      stage: vessel.stage,
      heightCm: heightCm,
      diameterCm: diameterCm,
      capacityMl: capacityMl,
      minWallCm: stats.minWallCm,
      massG: stats.massG,
      heightChangePct: baseline && baseline.heightCm ? (heightCm - baseline.heightCm) / baseline.heightCm * 100 : 0,
      diameterChangePct: baseline && baseline.diameterCm ? (diameterCm - baseline.diameterCm) / baseline.diameterCm * 100 : 0,
      capacityChangePct: baseline && baseline.capacityMl ? (capacityMl - baseline.capacityMl) / baseline.capacityMl * 100 : 0
    };
  }
  function estimateDimensionalHistory(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var dryingSettings = { humidity: clamp(finite(settings.humidity, 48), 10, 95), dryingRate: clamp(finite(settings.dryingRate, 45), 0, 100), method: settings.method };
    var firingSettings = { temperature: clamp(finite(settings.temperature, materialProfile(vessel).maturity), 600, 1350), ramp: clamp(finite(settings.ramp, 110), 30, 300), soak: clamp(finite(settings.soak, 10), 0, 90), coolingRate: clamp(finite(settings.coolingRate, 100), 30, 300), kilnType: settings.kilnType || 'electric', atmosphere: settings.atmosphere || 'oxidation' };
    var baseline = dimensionSnapshot(vessel, 'Current piece', null);
    var snapshots = [baseline];
    var current = copyVessel(vessel);
    var guard = 0;
    while (guard < 5) {
      var next = null;
      var label = '';
      if (current.stage === 'wet' || current.stage === 'leather-hard') {
        next = dryVessel(current, dryingSettings);
        label = next.stage === 'leather-hard' ? 'Leather-hard projection' : 'Bone-dry projection';
      } else if (current.stage === 'bone-dry') {
        next = fireVessel(current, firingSettings);
        label = next.stage === 'bisque' ? 'Bisque projection' : 'Fired projection';
      } else if (current.stage === 'glazed') {
        next = fireVessel(current, firingSettings);
        label = next.stage === 'glaze-fired' ? 'Glaze-fired projection' : 'Fired projection';
      }
      if (!next || next.stage === current.stage) break;
      snapshots.push(dimensionSnapshot(next, label, baseline));
      current = next;
      guard += 1;
    }
    return {
      baseline: baseline,
      snapshots: snapshots,
      finalStage: snapshots[snapshots.length - 1].stage,
      projectedSteps: Math.max(0, snapshots.length - 1),
      summary: snapshots.length > 1 ? 'Forward model projects ' + snapshots.length + ' dimensional checkpoints from ' + vessel.stage + ' to ' + snapshots[snapshots.length - 1].stage + '. Compare the trend with calipers, a scale, or measured water capacity.' : 'No forward dimensional steps remain after ' + vessel.stage + '.'
    };
  }
  function compareDimensionalMeasurements(history, measurements, currentSettings) {
    history = history || {};
    var snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
    var entries = Array.isArray(measurements) ? measurements : [];
    var contextEnabled = !!(currentSettings && typeof currentSettings === 'object');
    var metrics = [
      { id: 'heightCm', label: 'Height', unit: 'cm' },
      { id: 'diameterCm', label: 'Diameter', unit: 'cm' },
      { id: 'capacityMl', label: 'Capacity', unit: 'mL' },
      { id: 'minWallCm', label: 'Min wall', unit: 'cm' }
    ];
    var rows = [];
    entries.slice(0, 16).forEach(function (entry) {
      if (!entry || typeof entry !== 'object') return;
      var index = Math.round(finite(entry.checkpointIndex, -1));
      var snapshot = index >= 0 && index < snapshots.length ? snapshots[index] : null;
      if (!snapshot && entry.checkpointLabel) {
        snapshot = snapshots.filter(function (candidate) { return candidate.label === entry.checkpointLabel; })[0] || null;
      }
      var storedModel = entry.modeled && typeof entry.modeled === 'object' ? entry.modeled : null;
      if (!snapshot && !storedModel) return;
      var measuredValues = entry.measured && typeof entry.measured === 'object' ? entry.measured : entry;
      var measured = {};
      var modeled = {};
      var residuals = {};
      var relativeErrors = {};
      var compared = [];
      var uncertaintyValues = entry.uncertainty && typeof entry.uncertainty === 'object' ? entry.uncertainty : {};
      metrics.forEach(function (metric) {
        var raw = measuredValues[metric.id];
        if (raw === '' || raw === null || raw === undefined) return;
        var measuredValue = Number(raw);
        var modeledValue = Number(storedModel && storedModel[metric.id] !== undefined ? storedModel[metric.id] : (snapshot && snapshot[metric.id]));
        if (!isFinite(measuredValue) || !isFinite(modeledValue)) return;
        var uncertaintyRaw = uncertaintyValues[metric.id];
        var uncertainty = uncertaintyRaw === '' || uncertaintyRaw === null || uncertaintyRaw === undefined ? null : Number(uncertaintyRaw);
        if (!isFinite(uncertainty) || uncertainty < 0) uncertainty = null;
        measured[metric.id] = measuredValue;
        modeled[metric.id] = modeledValue;
        residuals[metric.id] = measuredValue - modeledValue;
        relativeErrors[metric.id] = modeledValue ? (measuredValue - modeledValue) / modeledValue * 100 : 0;
        compared.push({ id: metric.id, label: metric.label, unit: metric.unit, measured: measuredValue, modeled: modeledValue, residual: residuals[metric.id], relativeErrorPct: relativeErrors[metric.id], uncertainty: uncertainty, withinUncertainty: uncertainty === null ? null : Math.abs(residuals[metric.id]) <= uncertainty, uncertaintyRatio: uncertainty !== null && uncertainty > 0 ? Math.abs(residuals[metric.id]) / uncertainty : null });
      });
      if (!compared.length) return;
      var absoluteTotal = compared.reduce(function (sum, item) { return sum + Math.abs(item.residual); }, 0);
      var signedTotal = compared.reduce(function (sum, item) { return sum + item.residual; }, 0);
      var context = contextEnabled ? compareDimensionModelSettings(entry.modelSettings, currentSettings) : null;
      var declaredUncertainty = compared.filter(function (item) { return item.uncertainty !== null; });
      var withinUncertainty = declaredUncertainty.filter(function (item) { return item.withinUncertainty; });
      rows.push({
        id: entry.id || ('measurement-' + rows.length), checkpoint: entry.checkpointLabel || (snapshot && snapshot.label) || 'Recorded checkpoint', stage: entry.stage || (snapshot && snapshot.stage) || 'unknown', modelSource: storedModel ? 'logged' : 'current', context: context, measured: measured, modeled: modeled, residuals: residuals, relativeErrors: relativeErrors, compared: compared,
        meanAbsoluteResidual: absoluteTotal / compared.length, meanSignedResidual: signedTotal / compared.length, uncertaintyCount: declaredUncertainty.length, withinUncertaintyCount: withinUncertainty.length, outOfBandCount: declaredUncertainty.length - withinUncertainty.length, uncertaintyCoveragePct: declaredUncertainty.length ? withinUncertainty.length / declaredUncertainty.length * 100 : null,
        note: String(entry.note || '').slice(0, 240), savedAt: entry.savedAt || ''
      });
    });
    var byMetric = {};
    metrics.forEach(function (metric) {
      var values = [];
      rows.forEach(function (row) {
        row.compared.forEach(function (item) { if (item.id === metric.id) values.push(item); });
      });
      byMetric[metric.id] = {
        label: metric.label, unit: metric.unit, count: values.length,
        meanAbsoluteResidual: values.length ? values.reduce(function (sum, item) { return sum + Math.abs(item.residual); }, 0) / values.length : 0,
        meanSignedResidual: values.length ? values.reduce(function (sum, item) { return sum + item.residual; }, 0) / values.length : 0,
        meanAbsoluteRelativeErrorPct: values.length ? values.reduce(function (sum, item) { return sum + Math.abs(item.relativeErrorPct); }, 0) / values.length : 0,
        uncertaintyCount: values.filter(function (item) { return item.uncertainty !== null; }).length,
        withinUncertaintyCount: values.filter(function (item) { return item.withinUncertainty === true; }).length,
        outOfBandCount: values.filter(function (item) { return item.uncertainty !== null && item.withinUncertainty === false; }).length,
        withinUncertaintyPct: values.filter(function (item) { return item.uncertainty !== null; }).length ? values.filter(function (item) { return item.uncertainty !== null && item.withinUncertainty === true; }).length / values.filter(function (item) { return item.uncertainty !== null; }).length * 100 : null
      };
    });
    var allCompared = rows.reduce(function (items, row) { return items.concat(row.compared); }, []);
    var meanAbsoluteResidual = allCompared.length ? allCompared.reduce(function (sum, item) { return sum + Math.abs(item.residual); }, 0) / allCompared.length : 0;
    var meanSignedResidual = allCompared.length ? allCompared.reduce(function (sum, item) { return sum + item.residual; }, 0) / allCompared.length : 0;
    var meanAbsoluteRelativeErrorPct = allCompared.length ? allCompared.reduce(function (sum, item) { return sum + Math.abs(item.relativeErrorPct); }, 0) / allCompared.length : 0;
    var meanSignedRelativeErrorPct = allCompared.length ? allCompared.reduce(function (sum, item) { return sum + item.relativeErrorPct; }, 0) / allCompared.length : 0;
    var declaredUncertainty = allCompared.filter(function (item) { return item.uncertainty !== null; });
    var withinUncertainty = declaredUncertainty.filter(function (item) { return item.withinUncertainty; });
    var uncertaintyCoveragePct = declaredUncertainty.length ? withinUncertainty.length / declaredUncertainty.length * 100 : null;
    var staleCount = rows.filter(function (row) { return row.context && row.context.status === 'stale'; }).length;
    var incompleteCount = rows.filter(function (row) { return row.context && row.context.status === 'incomplete'; }).length;
    var needsReviewCount = rows.filter(function (row) { return row.context && row.context.needsReview; }).length;
    return {
      rows: rows,
      measurementCount: rows.length,
      dimensionCount: allCompared.length,
      meanAbsoluteResidual: meanAbsoluteResidual,
      meanSignedResidual: meanSignedResidual,
      meanAbsoluteRelativeErrorPct: meanAbsoluteRelativeErrorPct,
      meanSignedRelativeErrorPct: meanSignedRelativeErrorPct,
      staleCount: staleCount,
      incompleteCount: incompleteCount,
      needsReviewCount: needsReviewCount,
      uncertaintyCount: declaredUncertainty.length,
      withinUncertaintyCount: withinUncertainty.length,
      outOfBandCount: declaredUncertainty.length - withinUncertainty.length,
      uncertaintyCoveragePct: uncertaintyCoveragePct,
      byMetric: byMetric,
      contextSummary: staleCount || incompleteCount ? (staleCount ? staleCount + ' logged checkpoint' + (staleCount === 1 ? ' uses' : 's use') + ' changed model inputs.' : '') + (staleCount && incompleteCount ? ' ' : '') + (incompleteCount ? incompleteCount + ' checkpoint' + (incompleteCount === 1 ? ' has' : 's have') + ' incomplete model context.' : '') + ' Frozen values are retained; review the controls before treating records as a same-condition comparison.' : (rows.length ? 'All logged checkpoints have complete model context matching the current controls.' : ''),
      uncertaintySummary: declaredUncertainty.length ? 'Declared uncertainty contains ' + withinUncertainty.length + ' of ' + declaredUncertainty.length + ' compared dimensions (' + uncertaintyCoveragePct.toFixed(0) + '%).' + (declaredUncertainty.length - withinUncertainty.length ? ' Out-of-band residuals may indicate model drift, technique error, or an uncertainty range that was set too narrowly.' : ' Every declared residual is inside its recorded range.') : 'No measurement uncertainty ranges declared yet. Add optional +/- values when logging a checkpoint so residuals can be interpreted against instrument or technique precision.',
      summary: rows.length ? 'Compared ' + allCompared.length + ' measured dimensions across ' + rows.length + ' checkpoint' + (rows.length === 1 ? '' : 's') + '. Mean absolute relative error is ' + meanAbsoluteRelativeErrorPct.toFixed(1) + '%; positive residual means the measurement was larger than the model.' : 'No measured checkpoints logged yet. Enter one or more real dimensions to make the model accountable to evidence.'
    };
  }
  function estimateDimensionalTargets(history, targets) {
    history = history || {};
    targets = targets || {};
    var snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
    var baseline = history.baseline || snapshots[0] || null;
    var finalSnapshot = snapshots[snapshots.length - 1] || baseline;
    var metrics = [
      { id: 'heightCm', label: 'Height', unit: 'cm' },
      { id: 'diameterCm', label: 'Diameter', unit: 'cm' },
      { id: 'capacityMl', label: 'Capacity', unit: 'mL' },
      { id: 'minWallCm', label: 'Min wall', unit: 'cm' }
    ];
    var results = [];
    if (baseline && finalSnapshot) metrics.forEach(function (metric) {
      var rawTarget = targets[metric.id];
      if (rawTarget === '' || rawTarget === null || rawTarget === undefined) return;
      var target = Number(rawTarget);
      var currentValue = Number(baseline[metric.id]);
      var finalValue = Number(finalSnapshot[metric.id]);
      if (!isFinite(target) || target <= 0 || !isFinite(currentValue) || currentValue <= 0 || !isFinite(finalValue) || finalValue <= 0) return;
      var retentionPct = finalValue / currentValue * 100;
      var recommendedCurrent = target / (finalValue / currentValue);
      results.push({ id: metric.id, label: metric.label, unit: metric.unit, targetFinal: target, currentValue: currentValue, finalValue: finalValue, retentionPct: retentionPct, recommendedCurrent: recommendedCurrent, currentChangePct: (recommendedCurrent - currentValue) / currentValue * 100 });
    });
    return {
      baseline: baseline,
      final: finalSnapshot,
      results: results,
      targetedCount: results.length,
      summary: results.length ? 'Reverse scaling estimates the current-stage dimensions needed for ' + results.length + ' target metric' + (results.length === 1 ? '' : 's') + ' at the modeled ' + (finalSnapshot && finalSnapshot.stage || 'final') + ' checkpoint. Recheck the target after forming because shape changes and wall adjustments can break this assumption.' : 'Enter one or more desired final dimensions to estimate a current-stage starting target.'
    };
  }
  function evaluateVesselUse(vessel, testType, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    testType = ['water', 'thermal', 'load', 'permeability', 'cycles'].indexOf(testType) >= 0 ? testType : 'water';
    var ready = vessel.stage === 'bisque' || vessel.stage === 'glaze-fired';
    if (!ready) return { type: testType, ready: false, score: 0, status: 'Fire the piece first', summary: 'Functional tests require a bisque-fired or glaze-fired vessel.' };
    var stats = analyzeVessel(vessel, { rpm: 0, method: 'coil' });
    var body = materialProfile(vessel);
    var porosity = vessel.firedPorosity === null ? clamp(body.porosity + (vessel.stage === 'bisque' ? 0.14 : 0), 0.005, 0.42) : vessel.firedPorosity;
    var glazeSeal = vessel.stage === 'glaze-fired' ? clamp(vessel.glazeThickness / 100 * 0.92, 0, 0.92) : 0;
    var defectWeights = {
      'structural collapse': 1, 'drying crack': 0.52, 'coil separation': 0.58, 'thermal crack': 0.60,
      'dunting crack': 0.68, 'crazing risk': 0.20, 'shivering risk': 0.42, 'body deformation': 0.45,
      'running glaze': 0.12, 'thin glaze coverage': 0.14, 'uneven heatwork': 0.16
    };
    var defectPenalty = vessel.defects.reduce(function (highest, defect) { return Math.max(highest, defectWeights[defect] || 0.08); }, 0);
    var integrity = clamp(1 - defectPenalty, 0, 1);
    var effectivePorosity = clamp(porosity * (1 - glazeSeal) + defectPenalty * 0.055, 0.002, 0.45);
    var base = {
      type: testType, ready: true, porosityPct: effectivePorosity * 100, integrityPct: integrity * 100,
      capacityMl: stats.capacityMl, defects: copyArray(vessel.defects), educationalOnly: true
    };
    if (testType === 'water') {
      var durationHours = clamp(finite(settings.durationHours, 4), 1, 24);
      var seepageMl = stats.capacityMl * (effectivePorosity * 0.018 + defectPenalty * 0.035) * durationHours;
      var waterScore = clamp(100 - effectivePorosity * 250 - defectPenalty * 55, 0, 100);
      return Object.assign(base, { durationHours: durationHours, seepageMl: seepageMl, score: waterScore, status: waterScore >= 82 ? 'Strong modeled water retention' : (waterScore >= 55 ? 'Some modeled absorption or seepage' : 'High modeled leakage risk'), summary: 'Estimated ' + seepageMl.toFixed(1) + ' mL seepage over ' + Math.round(durationHours) + ' hours. This does not establish food safety.' });
    }
    if (testType === 'thermal') {
      var deltaC = clamp(finite(settings.temperatureDelta, 80), 10, 220);
      var wallVariation = clamp((100 - stats.uniformity) / 100, 0, 1);
      var thermalRisk = clamp(deltaC / 140 * body.thermalSensitivity * (0.78 + wallVariation * 0.85 + stats.maxWallCm / 5) * 100 + defectPenalty * 45, 0, 100);
      return Object.assign(base, { temperatureDelta: deltaC, riskPct: thermalRisk, score: 100 - thermalRisk, status: thermalRisk < 28 ? 'Lower modeled thermal-shock risk' : (thermalRisk < 62 ? 'Moderate modeled thermal-shock risk' : 'High modeled thermal-shock risk'), summary: 'A ' + Math.round(deltaC) + '°C temperature change produces ' + Math.round(thermalRisk) + '% modeled stress risk.' });
    }
    if (testType === 'load') {
      var appliedLoadKg = clamp(finite(settings.loadKg, 5), 0.5, 30);
      var shapeFactor = stats.shape === 'tall vessel' ? 0.70 : (stats.shape === 'bowl form' ? 0.90 : 0.82);
      var estimatedCapacityKg = stats.averageWallCm * 42 * (stats.uniformity / 100) * (vessel.compression * 0.55 + 0.45) * integrity * shapeFactor;
      var marginKg = estimatedCapacityKg - appliedLoadKg;
      var loadRisk = clamp(appliedLoadKg / Math.max(0.1, estimatedCapacityKg) * 70 + defectPenalty * 45, 0, 100);
      return Object.assign(base, { loadKg: appliedLoadKg, estimatedCapacityKg: estimatedCapacityKg, marginKg: marginKg, riskPct: loadRisk, score: 100 - loadRisk, status: marginKg >= 2 ? 'Modeled load margin remains' : (marginKg >= 0 ? 'Near the modeled limit' : 'Modeled load exceeds capacity'), summary: 'Estimated teaching-model capacity ' + estimatedCapacityKg.toFixed(1) + ' kg; applied load ' + appliedLoadKg.toFixed(1) + ' kg.' });
    }
    if (testType === 'cycles') {
      var cycles = clamp(finite(settings.cycles, 12), 1, 60);
      var dryingRate = clamp(finite(settings.dryingRate, 45), 5, 100);
      var cycleTemperatureDelta = clamp(finite(settings.cycleTemperatureDelta, 80), 10, 220);
      var dryingFactor = 0.72 + dryingRate / 100 * 0.78;
      var thermalFactor = 0.78 + cycleTemperatureDelta / 100 * body.thermalSensitivity * 0.95;
      var exposureFactor = dryingFactor * thermalFactor;
      var cycleDriverWeights = [
        { id: 'porosity', label: 'Open pore pathways', value: effectivePorosity * 0.42 },
        { id: 'defects', label: 'Modeled defects', value: defectPenalty * 0.68 },
        { id: 'thermal', label: 'Body thermal sensitivity', value: body.thermalSensitivity * 0.055 }
      ];
      var cycleDriverTotal = cycleDriverWeights.reduce(function (sum, driver) { return sum + driver.value; }, 0);
      var cycleDrivers = cycleDriverWeights.map(function (driver) { return { id: driver.id, label: driver.label, relativePct: cycleDriverTotal ? driver.value / cycleDriverTotal * 100 : 0 }; });
      var primaryDriver = cycleDrivers.reduce(function (leader, driver) { return driver.relativePct > leader.relativePct ? driver : leader; }, cycleDrivers[0]);
      var cycleSeverity = cycleDriverTotal * exposureFactor;
      var geometryFactor = 1 + Math.max(0, stats.maxWallCm - 2.2) * 0.05 + (100 - stats.uniformity) * 0.002;
      var defectAmplifier = 1 + defectPenalty * 1.4;
      function damageAtCycle(cycleCount) {
        var count = Math.max(0, cycleCount);
        var linearWear = count * cycleSeverity * 12;
        var acceleratedWear = Math.pow(count / 12, 1.35) * cycleSeverity * 18;
        return clamp((linearWear + acceleratedWear) * geometryFactor * defectAmplifier, 0, 100);
      }
      function cycleStatus(damage) {
        return damage < 22 ? 'Lower modeled cycle damage' : (damage < 52 ? 'Accumulating modeled wear' : 'High modeled cycle damage');
      }
      var checkpointRatios = [0, 0.25, 0.5, 0.75, 1];
      var cycleCheckpoints = [];
      checkpointRatios.forEach(function (ratio, index) {
        var checkpointCycle = index === checkpointRatios.length - 1 ? cycles : Math.max(0, Math.round(cycles * ratio));
        if (cycleCheckpoints.length && cycleCheckpoints[cycleCheckpoints.length - 1].cycles === checkpointCycle) return;
        var checkpointDamage = damageAtCycle(checkpointCycle);
        cycleCheckpoints.push({
          cycles: checkpointCycle, damagePct: checkpointDamage, resiliencePct: 100 - checkpointDamage,
          phase: index === 0 ? 'Baseline' : (index === 1 ? 'Early reuse' : (index === 2 ? 'Mid reuse' : (index === 3 ? 'Late reuse' : 'Endpoint'))),
          status: cycleStatus(checkpointDamage)
        });
      });
      var cycleStress = damageAtCycle(cycles);
      var cycleScore = 100 - cycleStress;
      var uncertaintyInputs = [
        { id: 'baseline', label: 'Base model spread', value: 8 },
        { id: 'porosity', label: 'Open pore pathways', value: effectivePorosity * 32 },
        { id: 'defects', label: 'Modeled defects', value: defectPenalty * 14 },
        { id: 'uniformity', label: 'Wall uniformity variation', value: (100 - stats.uniformity) * 0.04 },
        { id: 'thermal', label: 'Body thermal sensitivity', value: body.thermalSensitivity * 6 }
      ];
      var rawUncertaintyPct = uncertaintyInputs.reduce(function (sum, input) { return sum + input.value; }, 0);
      var uncertaintyPct = clamp(rawUncertaintyPct, 8, 24);
      var uncertaintyDrivers = uncertaintyInputs.map(function (input) {
        return { id: input.id, label: input.label, points: input.value, relativePct: rawUncertaintyPct ? input.value / rawUncertaintyPct * 100 : 0 };
      });
      var damageRange = {
        low: clamp(cycleStress * (1 - uncertaintyPct / 100), 0, 100),
        high: clamp(cycleStress * (1 + uncertaintyPct / 100), 0, 100)
      };
      return Object.assign(base, {
        cycles: cycles, dryingRate: dryingRate, cycleTemperatureDelta: cycleTemperatureDelta, exposureFactor: exposureFactor,
        cycleDrivers: cycleDrivers, primaryDriver: primaryDriver.label,
        damagePct: cycleStress, uncertaintyPct: uncertaintyPct, uncertaintyDrivers: uncertaintyDrivers, damageRange: damageRange, score: cycleScore, cycleCheckpoints: cycleCheckpoints,
        status: cycleStatus(cycleStress),
        summary: 'After ' + Math.round(cycles) + ' wet-dry cycles at ' + Math.round(dryingRate) + '% drying severity and a ' + Math.round(cycleTemperatureDelta) + ' C temperature swing, the teaching model estimates ' + Math.round(cycleStress) + '% accumulated damage, with an uncalibrated sensitivity band of ' + Math.round(damageRange.low) + ' to ' + Math.round(damageRange.high) + '%. The leading modeled driver is ' + primaryDriver.label.toLowerCase() + '. This progression is a comparative heuristic, not a durability certification.'
      });
    }
    var permeabilityIndex = clamp(effectivePorosity * 265 + defectPenalty * 28, 0, 100);
    return Object.assign(base, { permeabilityIndex: permeabilityIndex, score: 100 - permeabilityIndex, status: permeabilityIndex < 22 ? 'Low permeability proxy' : (permeabilityIndex < 62 ? 'Moderate permeability proxy' : 'High permeability proxy'), summary: 'Modeled permeability index ' + Math.round(permeabilityIndex) + '/100. This is a comparative material proxy, not a food-storage or fermentation safety determination.' });
  }
  function compareCycleProtocols(vessel, protocols) {
    vessel = normalizeVessel(vessel);
    protocols = Array.isArray(protocols) ? protocols : CYCLE_PROTOCOLS;
    return protocols.slice(0, 8).map(function (protocol) {
      var result = evaluateVesselUse(vessel, 'cycles', {
        cycles: protocol.cycles, dryingRate: protocol.dryingRate, cycleTemperatureDelta: protocol.cycleTemperatureDelta
      });
      return Object.assign({}, protocol, { result: result });
    });
  }
  function compareCycleSensitivity(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var base = {
      cycles: clamp(Math.round(finite(settings.cycles, 12)), 1, 60),
      dryingRate: clamp(Math.round(finite(settings.dryingRate, 45)), 5, 100),
      cycleTemperatureDelta: clamp(Math.round(finite(settings.cycleTemperatureDelta, 80)), 10, 220)
    };
    var axes = [
      { id: 'cycles', label: 'Cycle count', unit: 'cycles', field: 'cycles', low: Math.max(1, Math.round(base.cycles * 0.5)), high: Math.min(60, Math.round(base.cycles * 1.5)) },
      { id: 'drying', label: 'Drying severity', unit: '% dry', field: 'dryingRate', low: Math.max(5, base.dryingRate - 30), high: Math.min(100, base.dryingRate + 30) },
      { id: 'temperature', label: 'Temperature swing', unit: ' C', field: 'cycleTemperatureDelta', low: Math.max(10, base.cycleTemperatureDelta - 60), high: Math.min(220, base.cycleTemperatureDelta + 60) }
    ];
    return axes.map(function (axis) {
      var points = [
        { id: 'lower', label: 'Lower', value: axis.low },
        { id: 'current', label: 'Current', value: base[axis.field] },
        { id: 'higher', label: 'Higher', value: axis.high }
      ];
      return Object.assign({}, axis, {
        points: points.map(function (point) {
          var runSettings = Object.assign({}, base);
          runSettings[axis.field] = point.value;
          return Object.assign({}, point, { result: evaluateVesselUse(vessel, 'cycles', runSettings) });
        })
      });
    });
  }
  function stageIndex(stage) { return Math.max(0, STAGES.indexOf(stage)); }
  function profileGeometry(vessel) {
    var center = 260, bottom = 406;
    var heightPx = vessel.heightCm / 38 * 322;
    var top = bottom - heightPx;
    var scale = 10.2;
    var left = [], right = [], innerLeft = [], innerRight = [];
    for (var i = 0; i < RING_COUNT; i++) {
      var y = bottom - (i / (RING_COUNT - 1)) * heightPx;
      var r = vessel.radii[i] * scale;
      var inner = Math.max(0, vessel.radii[i] - vessel.thickness[i]) * scale;
      left.push([center - r, y]); right.push([center + r, y]);
      innerLeft.push([center - inner, y]); innerRight.push([center + inner, y]);
    }
    function path(points) { return points.map(function (p, index) { return (index ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    var outer = path(left) + ' ' + path(right.slice().reverse()).replace(/^M/, 'L') + ' Z';
    var cavityPoints = innerLeft.slice(2).reverse().concat(innerRight.slice(2));
    var cavity = path(cavityPoints) + ' Z';
    return { center: center, bottom: bottom, top: top, heightPx: heightPx, scale: scale, left: left, right: right, innerLeft: innerLeft, innerRight: innerRight, outer: outer, cavity: cavity };
  }

  window.__alloPotteryPure = {
    RING_COUNT: RING_COUNT,
    DIMENSION_MODEL_VERSION: DIMENSION_MODEL_VERSION,
    STAGES: STAGES.slice(),
    CLAY_BODIES: CLAY_BODIES,
    GLAZES: GLAZES,
    CYCLE_PROTOCOLS: CYCLE_PROTOCOLS,
    CULTURAL_STUDIES: CULTURAL_STUDIES,
    makeVessel: makeVessel,
    normalizeVessel: normalizeVessel,
    normalizeRecipe: normalizeRecipe,
    materialProfile: materialProfile,
    vesselVolume: vesselVolume,
    vesselCapacity: vesselCapacity,
    estimateHeatwork: estimateHeatwork,
    estimateThermalHistory: estimateThermalHistory,
    estimateFiredPorosity: estimateFiredPorosity,
    analyzeGlazeOutcome: analyzeGlazeOutcome,
    analyzeFiringSchedule: analyzeFiringSchedule,
    compareMaterialProfiles: compareMaterialProfiles,
    analyzeRingRisks: analyzeRingRisks,
    analyzeVessel: analyzeVessel,
    applyTool: applyTool,
    dryVessel: dryVessel,
    fireVessel: fireVessel,
    glazeVessel: glazeVessel,
    dimensionModelSettings: dimensionModelSettings,
    compareDimensionModelSettings: compareDimensionModelSettings,
    estimateDryingRisk: estimateDryingRisk,
    estimateDryingHistory: estimateDryingHistory,
    estimateDimensionalHistory: estimateDimensionalHistory,
    compareDimensionalMeasurements: compareDimensionalMeasurements,
    estimateDimensionalTargets: estimateDimensionalTargets,
    evaluateVesselUse: evaluateVesselUse,
    compareCycleProtocols: compareCycleProtocols,
    compareCycleSensitivity: compareCycleSensitivity,
    profileGeometry: profileGeometry
  };

  window.StemLab.registerTool('wheelAndFire', {
    icon: '🏺',
    label: 'Wheel & Fire: Pottery Lab',
    desc: 'Shape volume-conserving clay by wheel or hand, measure wall and coil stability, control heatwork, test post-firing function, and study pottery technologies in specific cultural contexts.',
    color: 'amber',
    category: 'creative',
    questHooks: [
      { id: 'center_clay', label: 'Center the clay to 80% or better', icon: '🌀', check: function (d) { var v = d && d.vessel; return !!(v && v.centered >= 80); }, progress: function (d) { var v = d && d.vessel; return Math.round(v && v.centered || 0) + '%'; } },
      { id: 'stable_form', label: 'Create a vessel with a wall under 1 cm', icon: '🏺', check: function (d) { var v = d && d.vessel; return !!(v && analyzeVessel(v, d).minWallCm < 1 && analyzeVessel(v, d).stability >= 55); }, progress: function (d) { var v = d && d.vessel; return v ? analyzeVessel(v, d).status : 'Begin shaping'; } },
      { id: 'fire_piece', label: 'Complete a glaze firing', icon: '🔥', check: function (d) { return !!(d && d.vessel && d.vessel.stage === 'glaze-fired'); }, progress: function (d) { return d && d.vessel ? d.vessel.stage : 'wet'; } },
      { id: 'compare_traditions', label: 'Study three pottery traditions', icon: '🌍', check: function (d) { return Object.keys(d && d.visitedTraditions || {}).length >= 3; }, progress: function (d) { return Object.keys(d && d.visitedTraditions || {}).length + '/3'; } },
      { id: 'test_function', label: 'Run two post-firing function tests', icon: '🧪', check: function (d) { return copyArray(d && d.performanceLog).length >= 2; }, progress: function (d) { return Math.min(2, copyArray(d && d.performanceLog).length) + '/2'; } }
    ],
    render: function (ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var data = (ctx.toolData && ctx.toolData.wheelAndFire) || {};
      var vessel = normalizeVessel(data.vessel, data.clayBody || 'stoneware');
      var view = data.view || 'shape';
      var method = data.method === 'coil' ? 'coil' : 'wheel';
      var activeTool = data.activeTool || (method === 'coil' ? 'add-coil' : 'center');
      var workRing = Math.round(clamp(finite(data.workRing, 22), 0, RING_COUNT - 1));
      var pressure = clamp(finite(data.pressure, 48), 5, 100);
      var rpm = method === 'coil' ? 0 : clamp(finite(data.rpm, 58), 0, 120);
      var settings = { pressure: pressure, rpm: rpm, method: method };
      var stats = analyzeVessel(vessel, settings);
      var geometry = profileGeometry(vessel);
      function currentDimensionSettings() {
        var body = materialProfile(vessel);
        var kilnType = data.kilnType || 'electric';
        return dimensionModelSettings({
          clayBody: vessel.clayBody, materialRecipe: vessel.materialRecipe, method: method,
          humidity: data.humidity, dryingRate: data.dryingRate,
          temperature: data.kilnTemp === undefined ? (vessel.stage === 'bone-dry' ? 950 : body.maturity) : data.kilnTemp,
          ramp: data.ramp, soak: data.soak, coolingRate: data.coolingRate,
          kilnType: kilnType, atmosphere: kilnType === 'electric' ? 'oxidation' : data.atmosphere
        });
      }
      var tt = function (key, fallback) {
        try { return typeof ctx.t === 'function' ? (ctx.t(key, fallback) || fallback) : fallback; } catch (error) { return fallback; }
      };
      var announce = ctx.announceToSR || function () {};
      var setToolData = ctx.setToolData || function () {};
      function patchData(patch) {
        setToolData(function (previous) {
          previous = previous || {};
          return Object.assign({}, previous, { wheelAndFire: Object.assign({}, previous.wheelAndFire || {}, patch) });
        });
      }
      function commitVessel(next, message, extra) {
        var history = copyArray(data.history).concat([copyVessel(vessel)]).slice(-24);
        patchData(Object.assign({ vessel: next, history: history, future: [] }, extra || {}));
        announce(message || next.lastOutcome || 'Pottery state updated.');
      }
      function setView(next) { patchData({ view: next }); announce('Opened ' + next + ' section.'); }
      function applyActive(index) {
        if (vessel.stage !== 'wet' && !(vessel.stage === 'leather-hard' && activeTool === 'trim')) {
          announce('Shaping is unavailable after the clay has dried.');
          return;
        }
        var next = applyTool(vessel, activeTool, index, settings);
        commitVessel(next, next.lastOutcome);
      }
      function undo() {
        var history = copyArray(data.history);
        if (!history.length) { announce('Nothing to undo.'); return; }
        var previous = history.pop();
        patchData({ vessel: previous, history: history, future: [copyVessel(vessel)].concat(copyArray(data.future)).slice(0, 24), recipeDraft: normalizeRecipe(previous.materialRecipe) });
        announce('Pottery action undone.');
      }
      function redo() {
        var future = copyArray(data.future);
        if (!future.length) { announce('Nothing to redo.'); return; }
        var next = future.shift();
        patchData({ vessel: next, history: copyArray(data.history).concat([copyVessel(vessel)]).slice(-24), future: future, recipeDraft: normalizeRecipe(next.materialRecipe) });
        announce('Pottery action redone.');
      }
      function resetClay(preset, bodyId) {
        var next = makeVessel(bodyId || vessel.clayBody, preset || 'lump');
        commitVessel(next, (preset === 'lump' ? 'Fresh clay placed on the work surface.' : preset + ' practice blank loaded.'), { clayBody: next.clayBody, recipeDraft: null });
      }
      function percent(value) { return Math.round(value) + '%'; }
      function metricCard(label, value, note, tone) {
        return h('div', { className: 'rounded-xl border p-2 bg-white ' + (tone || 'border-amber-200') },
          h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-slate-500' }, label),
          h('div', { className: 'text-lg font-black text-slate-900' }, value),
          h('div', { className: 'text-[10px] text-slate-600' }, note));
      }
      function rangeControl(id, label, value, min, max, unit, onChange, disabled) {
        return h('label', { htmlFor: id, className: 'block text-xs font-bold text-slate-700' },
          label + ': ', h('output', { htmlFor: id, className: 'text-amber-800' }, Math.round(value) + unit),
          h('input', { id: id, type: 'range', min: min, max: max, value: value, disabled: !!disabled, onChange: function (event) { onChange(Number(event.target.value)); }, className: 'block w-full mt-1 accent-amber-700 disabled:opacity-50' }));
      }
      function tabButton(id, label, icon) {
        var selected = view === id;
        return h('button', { type: 'button', role: 'tab', id: 'wheel-fire-tab-' + id, 'aria-controls': 'wheel-fire-panel-' + id, 'aria-selected': selected, tabIndex: selected ? 0 : -1, onClick: function () { setView(id); }, className: 'min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors ' + (selected ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50') }, icon + ' ' + label);
      }
      function stageStrip() {
        var current = stageIndex(vessel.stage);
        return h('div', { className: 'wheel-fire-stage-line', role: 'list', 'aria-label': 'Pottery lifecycle' }, STAGES.map(function (stage, index) {
          var complete = index <= current;
          return h('div', { key: stage, role: 'listitem', 'aria-current': stage === vessel.stage ? 'step' : undefined, className: 'rounded-lg border px-2 py-1 text-center text-[10px] font-bold ' + (stage === vessel.stage ? 'bg-amber-700 text-white border-amber-800' : (complete ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200')) }, stage.replace('-', ' '));
        }));
      }
      function vesselSvg() {
        var selectedY = geometry.bottom - workRing / (RING_COUNT - 1) * geometry.heightPx;
        var body = materialProfile(vessel);
        var fillColor = vessel.surfaceColor || body.color;
        var cavityColor = data.showCrossSection ? '#f6e4cb' : '#211711';
        var svgLabel = 'Interactive pottery profile: ' + stats.shape + ', ' + vessel.heightCm.toFixed(1) + ' centimeters tall, minimum wall ' + stats.minWallCm.toFixed(2) + ' centimeters, ' + Math.round(stats.stability) + ' percent stability, ' + Math.round(stats.compression) + ' percent compression, stage ' + vessel.stage + '. Active tool ' + activeTool + ' at ring ' + (workRing + 1) + ' of ' + RING_COUNT + '.';
        function ringFromEvent(event) {
          var rect = event.currentTarget.getBoundingClientRect();
          var ratio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
          return Math.round((1 - ratio) * (RING_COUNT - 1));
        }
        return h('svg', {
          viewBox: '0 0 520 460', role: 'img', tabIndex: 0, 'aria-label': svgLabel,
          className: 'w-full min-h-[320px] rounded-2xl border-2 border-amber-300 bg-[#2b211c] cursor-crosshair',
          onPointerDown: function (event) { var index = ringFromEvent(event); patchData({ workRing: index }); applyActive(index); try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {} },
          onPointerMove: function (event) { if (event.buttons === 1) { var index = ringFromEvent(event); patchData({ workRing: index }); applyActive(index); } },
          onKeyDown: function (event) {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); patchData({ workRing: clamp(workRing + (event.key === 'ArrowUp' ? 1 : -1), 0, RING_COUNT - 1) }); }
            else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); applyActive(workRing); }
            else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
          }
        },
          h('defs', null,
            h('linearGradient', { id: 'wheel-fire-clay-gradient', x1: '0', x2: '1' },
              h('stop', { offset: '0%', stopColor: '#4a2c22' }),
              h('stop', { offset: '26%', stopColor: fillColor }),
              h('stop', { offset: '52%', stopColor: '#f0c2a0' }),
              h('stop', { offset: '76%', stopColor: fillColor }),
              h('stop', { offset: '100%', stopColor: '#3b241d' })),
            h('filter', { id: 'wheel-fire-shadow', x: '-30%', y: '-20%', width: '160%', height: '160%' }, h('feDropShadow', { dx: '0', dy: '8', stdDeviation: '7', floodColor: '#000', floodOpacity: '.48' }))
          ),
          h('ellipse', { cx: 260, cy: 426, rx: 150, ry: 22, fill: '#574538', stroke: '#a78b6a', strokeWidth: 4 }),
          method === 'wheel' && rpm > 0 ? h('g', { className: 'wheel-fire-spin', 'aria-hidden': 'true' }, h('path', { d: 'M140 426h240M260 405v42', stroke: '#d6b889', strokeWidth: 3, opacity: .45 })) : null,
          h('path', { d: geometry.outer, fill: data.showCrossSection ? fillColor : 'url(#wheel-fire-clay-gradient)', stroke: '#e2aa82', strokeWidth: 2, filter: 'url(#wheel-fire-shadow)' }),
          h('path', { d: geometry.cavity, fill: cavityColor, stroke: data.showCrossSection ? '#8e5b3d' : '#130d0a', strokeWidth: 2 }),
          [4, 9, 14, 19, 24, 29, 34].map(function (ring) {
            var y = geometry.bottom - ring / (RING_COUNT - 1) * geometry.heightPx;
            var radius = vessel.radii[ring] * geometry.scale;
            return h('ellipse', { key: ring, cx: geometry.center, cy: y, rx: radius, ry: 3.4, fill: 'none', stroke: '#fff1df', strokeWidth: 1, opacity: method === 'coil' ? .26 : .12 });
          }),
          vessel.defects.indexOf('drying crack') >= 0 || vessel.defects.indexOf('thermal crack') >= 0 || vessel.defects.indexOf('dunting crack') >= 0 ? h('path', { d: 'M' + (geometry.center + vessel.radii[19] * geometry.scale * .62) + ',' + (geometry.bottom - 19 / 35 * geometry.heightPx) + ' l-12,18 9,15 -15,17', fill: 'none', stroke: '#2a1711', strokeWidth: 4, strokeLinecap: 'round' }) : null,
          h('line', { x1: 80, x2: 440, y1: selectedY, y2: selectedY, stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7 7', opacity: .9 }),
          h('circle', { cx: 62, cy: selectedY, r: 9, fill: '#06b6d4', stroke: '#cffafe', strokeWidth: 3 }),
          h('text', { x: 20, y: 25, fill: '#fef3c7', fontSize: 13, fontWeight: 800 }, method === 'wheel' ? Math.round(rpm) + ' RPM' : 'Handbuilding'),
          h('text', { x: 500, y: 25, fill: '#fef3c7', fontSize: 13, textAnchor: 'end' }, data.showCrossSection ? 'Cross-section' : 'Surface view')
        );
      }
      function shapePanel() {
        var wheelTools = [
          { id: 'center', label: 'Center', icon: '◎', help: 'Reduce wobble and average the rotational profile.' },
          { id: 'open', label: 'Open', icon: '◯', help: 'Create or widen the interior cavity.' },
          { id: 'pull', label: 'Pull wall', icon: '↟', help: 'Trade wall thickness for height.' },
          { id: 'belly', label: 'Expand', icon: '↔', help: 'Push the profile outward.' },
          { id: 'collar', label: 'Collar', icon: '→←', help: 'Narrow the profile.' },
          { id: 'smooth', label: 'Rib', icon: '≈', help: 'Average nearby rings and smooth the surface.' },
          { id: 'trim', label: 'Trim', icon: '⌁', help: 'Remove clay from the lower exterior.' }
        ];
        var coilTools = [
          { id: 'add-coil', label: 'Add coil', icon: '⊕', help: 'Add clay mass and height at the rim.' },
          { id: 'open', label: 'Pinch open', icon: '◯', help: 'Thin and open the wall locally.' },
          { id: 'belly', label: 'Push out', icon: '↔', help: 'Expand a local section.' },
          { id: 'collar', label: 'Draw in', icon: '→←', help: 'Narrow a local section.' },
          { id: 'paddle', label: 'Paddle', icon: '▥', help: 'Compress and regularize coils.' },
          { id: 'smooth', label: 'Smooth', icon: '≈', help: 'Blend coil transitions.' },
          { id: 'trim', label: 'Scrape', icon: '⌁', help: 'Remove clay at leather-hard or wet stages.' }
        ];
        var tools = method === 'wheel' ? wheelTools : coilTools;
        return h('section', { id: 'wheel-fire-panel-shape', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-shape', className: 'space-y-3' },
          h('div', { className: 'wheel-fire-main' },
            h('div', { className: 'space-y-2' }, vesselSvg(),
              h('p', { className: 'text-[11px] text-slate-600 text-center' }, 'Pointer: press or drag on the vessel. Keyboard: choose a work height with Arrow keys and press Enter or Space to apply the active tool.'),
              h('div', { className: 'wheel-fire-stats', role: 'group', 'aria-label': 'Live vessel measurements' },
                metricCard('Stability', percent(stats.stability), stats.status, stats.stability >= 55 ? 'border-emerald-300' : 'border-red-300'),
                metricCard('Minimum wall', stats.minWallCm.toFixed(2) + ' cm', 'Average ' + stats.averageWallCm.toFixed(2) + ' cm'),
                metricCard('Clay mass', Math.round(stats.massG) + ' g', 'Approx. volume ' + Math.round(stats.volumeCm3) + ' cm³'),
                metricCard('Capacity', Math.round(stats.capacityMl) + ' mL', stats.shape)
              )
            ),
            h('div', { className: 'space-y-3' },
              h('div', { className: 'rounded-xl border border-amber-300 bg-amber-50 p-3' },
                h('h3', { className: 'font-black text-amber-950 mb-2' }, 'Forming method'),
                h('div', { className: 'grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Forming method' },
                  [{ id: 'wheel', label: '🌀 Potter’s wheel' }, { id: 'coil', label: '〰 Handbuild coils' }].map(function (item) {
                    return h('button', { type: 'button', key: item.id, 'aria-pressed': method === item.id, onClick: function () { patchData({ method: item.id, activeTool: item.id === 'coil' ? 'add-coil' : 'center', rpm: item.id === 'coil' ? 0 : finite(data.rpm, 58) }); }, className: 'rounded-lg border px-2 py-2 text-xs font-bold ' + (method === item.id ? 'bg-amber-700 text-white border-amber-800' : 'bg-white border-amber-300 text-amber-950') }, item.label);
                  })
                )
              ),
              h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3 space-y-3' },
                h('label', { htmlFor: 'wheel-fire-clay', className: 'block text-xs font-bold text-slate-700' }, 'Clay body',
                  h('select', { id: 'wheel-fire-clay', value: vessel.clayBody, onChange: function (event) { resetClay(vessel.preset || 'lump', event.target.value); }, className: 'block w-full mt-1 rounded-lg border border-slate-400 px-2 py-2 bg-white' }, Object.keys(CLAY_BODIES).map(function (id) { return h('option', { key: id, value: id }, CLAY_BODIES[id].name); }))),
                rangeControl('wheel-fire-pressure', 'Hand pressure', pressure, 5, 100, '%', function (value) { patchData({ pressure: value }); }),
                rangeControl('wheel-fire-rpm', 'Wheel speed', rpm, 0, 120, ' RPM', function (value) { patchData({ rpm: value }); }, method !== 'wheel'),
                rangeControl('wheel-fire-moisture', 'Clay moisture', vessel.moisture * 100, 5, 100, '%', function (value) { var next = copyVessel(vessel); next.moisture = value / 100; next.lastOutcome = 'Clay moisture adjusted for the simulation.'; commitVessel(next, next.lastOutcome); }),
                rangeControl('wheel-fire-height', 'Work height', workRing + 1, 1, RING_COUNT, ' / ' + RING_COUNT, function (value) { patchData({ workRing: value - 1 }); }),
                h('label', { className: 'flex items-center gap-2 text-xs font-bold text-slate-700' }, h('input', { type: 'checkbox', checked: !!data.showCrossSection, onChange: function (event) { patchData({ showCrossSection: event.target.checked }); } }), 'Show material cross-section')
              ),
              h('div', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3' },
                h('h3', { className: 'font-black text-teal-950 mb-2' }, 'Clay tools'),
                h('div', { className: 'grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Clay shaping tools' }, tools.map(function (tool) {
                  return h('button', { type: 'button', key: tool.id, title: tool.help, 'aria-label': tool.label + '. ' + tool.help, 'aria-pressed': activeTool === tool.id, onClick: function () { patchData({ activeTool: tool.id }); }, className: 'min-h-[42px] rounded-lg border px-2 py-2 text-xs font-bold ' + (activeTool === tool.id ? 'bg-teal-700 text-white border-teal-800' : 'bg-white text-teal-900 border-teal-300') }, tool.icon + ' ' + tool.label);
                })),
                h('button', { type: 'button', onClick: function () { applyActive(workRing); }, className: 'mt-2 w-full rounded-lg bg-teal-800 text-white px-3 py-2 font-black text-sm' }, 'Apply ' + activeTool.replace('-', ' ') + ' at ring ' + (workRing + 1))
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: undo, disabled: !copyArray(data.history).length, className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-40' }, '↶ Undo'),
                h('button', { type: 'button', onClick: redo, disabled: !copyArray(data.future).length, className: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-40' }, '↷ Redo'),
                ['lump', 'bowl', 'cylinder', 'jar'].map(function (preset) { return h('button', { type: 'button', key: preset, onClick: function () { resetClay(preset); }, className: 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900' }, preset === 'lump' ? 'Fresh clay' : preset + ' blank'); })
              )
            )
          )
        );
      }
      function sciencePanel() {
        var logs = copyArray(data.measurementLog);
        var materialScenarios = copyArray(data.materialScenarios);
        var namedBody = clayBody(vessel.clayBody);
        var activeRecipe = normalizeRecipe(vessel.materialRecipe);
        var hasRecipeDraft = Object.prototype.hasOwnProperty.call(data, 'recipeDraft');
        var recipeSource = hasRecipeDraft ? (data.recipeDraft && typeof data.recipeDraft === 'object' ? data.recipeDraft : {}) : (activeRecipe || {});
        var recipeDraft = {
          label: String(recipeSource.label || '').slice(0, 48),
          temperPercent: clamp(finite(recipeSource.temperPercent, 0), 0, 35),
          plasticityShift: clamp(finite(recipeSource.plasticityShift, 0), -18, 18),
          shrinkageShift: clamp(finite(recipeSource.shrinkageShift, 0), -3, 3),
          porosityShift: clamp(finite(recipeSource.porosityShift, 0), -8, 8)
        };
        var previewVessel = copyVessel(vessel);
        previewVessel.materialRecipe = recipeDraft;
        var draftRecipe = normalizeRecipe(recipeDraft);
        var recipeComparison = compareMaterialProfiles(vessel, draftRecipe, { temperature: finite(data.kilnTemp, namedBody.maturity), ramp: finite(data.ramp, 110), soak: finite(data.soak, 10), kilnType: data.kilnType || 'electric' });
        namedBody = recipeComparison.baseline;
        var previewBody = recipeComparison.profile;
        var ringRisks = analyzeRingRisks(vessel, settings);
        var ringZoneDefs = [
          { label: 'Foot', start: 0, end: 5 },
          { label: 'Lower wall', start: 6, end: 11 },
          { label: 'Belly', start: 12, end: 17 },
          { label: 'Shoulder', start: 18, end: 23 },
          { label: 'Upper wall', start: 24, end: 29 },
          { label: 'Rim', start: 30, end: 35 }
        ];
        var ringZones = ringZoneDefs.map(function (zone) {
          var entries = ringRisks.slice(zone.start, zone.end + 1);
          var peak = entries[0];
          var total = 0;
          entries.forEach(function (entry) { total += entry.risk; if (entry.risk > peak.risk) peak = entry; });
          return Object.assign({}, zone, { peak: peak, averageRisk: total / Math.max(1, entries.length) });
        });
        function signed(value, digits) { var rounded = Number(value).toFixed(digits); return (value >= 0 ? '+' : '') + rounded; }
        function riskTone(risk) { return risk >= 0.67 ? 'border-red-300 bg-red-50 text-red-950' : (risk >= 0.4 ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-300 bg-emerald-50 text-emerald-950'); }
        function focusRing(index) { patchData({ view: 'shape', workRing: index }); announce('Focused ring ' + (index + 1) + ' in the Shape section.'); }
        function updateRecipe(key, value) { var next = Object.assign({}, recipeDraft); next[key] = value; patchData({ recipeDraft: next }); }
        function applyRecipe() {
          var next = copyVessel(vessel);
          next.materialRecipe = draftRecipe;
          next.lastOutcome = draftRecipe ? 'Optional material recipe assumptions applied to the current piece for comparison.' : 'The current piece is using the named clay body baseline again.';
          commitVessel(next, next.lastOutcome, { recipeDraft: draftRecipe });
        }
        function saveMaterialScenario() {
          var label = recipeDraft.label || (draftRecipe ? 'Recipe study ' + (materialScenarios.length + 1) : 'Named body baseline');
          var scenario = { id: Date.now(), label: label, clayBody: vessel.clayBody, materialRecipe: draftRecipe, savedAt: new Date().toISOString() };
          patchData({ materialScenarios: [scenario].concat(materialScenarios).slice(0, 8) });
          announce(label + ' saved to the material comparison shelf.');
        }
        function loadMaterialScenario(scenario) {
          var loaded = normalizeRecipe(scenario.materialRecipe);
          patchData({ recipeDraft: loaded || null });
          announce((scenario.label || 'Material scenario') + ' loaded into the preview. Apply it to change the current piece.');
        }
        function removeMaterialScenario(id) {
          patchData({ materialScenarios: materialScenarios.filter(function (scenario) { return scenario.id !== id; }) });
          announce('Material scenario removed from the comparison shelf.');
        }
        function clearRecipe() {
          var next = copyVessel(vessel);
          next.materialRecipe = null;
          next.lastOutcome = 'Material recipe cleared; the named clay body is active again.';
          commitVessel(next, next.lastOutcome, { recipeDraft: null });
        }
        var recipeTradeoffs = [];
        if (recipeDraft.temperPercent > 0) recipeTradeoffs.push('The temper proxy lowers modeled plasticity and drying shrinkage while opening the body and slightly changing thermal response.');
        if (recipeDraft.plasticityShift !== 0) recipeTradeoffs.push((recipeDraft.plasticityShift > 0 ? 'Higher' : 'Lower') + ' plasticity adjustment changes how much pressure the model can absorb before deformation.');
        if (recipeDraft.shrinkageShift !== 0) recipeTradeoffs.push((recipeDraft.shrinkageShift > 0 ? 'Higher' : 'Lower') + ' shrinkage adjustment changes drying and firing scale change.');
        if (recipeDraft.porosityShift !== 0) recipeTradeoffs.push((recipeDraft.porosityShift > 0 ? 'Higher' : 'Lower') + ' porosity adjustment changes the modeled fired pore pathway and permeability proxy.');
        if (!recipeTradeoffs.length) recipeTradeoffs.push('The preview matches the named body baseline. Add a small assumption, then compare the predicted tradeoff before shaping or firing.');
        function logTrial() {
          var row = { id: Date.now(), method: method, materialRecipe: normalizeRecipe(vessel.materialRecipe), rpm: Math.round(rpm), pressure: Math.round(pressure), moisture: Math.round(vessel.moisture * 100), minWall: stats.minWallCm.toFixed(2), uniformity: Math.round(stats.uniformity), compression: Math.round(stats.compression), coilBond: Math.round(stats.coilBond), overhang: Math.round(stats.overhangRisk), stability: Math.round(stats.stability), outcome: stats.status };
          patchData({ measurementLog: logs.concat([row]).slice(-12) });
          announce('Measurement trial logged.');
        }
        return h('section', { id: 'wheel-fire-panel-science', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-science', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-cyan-300 bg-cyan-50 p-4' },
            h('h2', { className: 'text-xl font-black text-cyan-950' }, 'Clay mechanics laboratory'),
            h('p', { className: 'text-sm text-cyan-950 mt-1' }, 'Change one variable, shape the same ring, and log the result. The model tracks approximate clay volume, centrifugal loading, plasticity, moisture weakness, wall uniformity, slenderness, unsupported overhang, particle compression, coil bonding, and wobble.'),
            h('div', { className: 'wheel-fire-stats mt-3' },
              metricCard('Wall uniformity', percent(stats.uniformity), 'Variation across rings'),
              metricCard('Centering', percent(vessel.centered), 'Wobble ' + percent(vessel.wobble * 100)),
              metricCard('Compression', percent(stats.compression), 'Raised by ribs and paddling'),
              metricCard('Coil bond', percent(stats.coilBond), method === 'coil' ? 'Joint consolidation' : 'Not currently limiting'),
              metricCard('Overhang load', percent(stats.overhangRisk), 'Outward wall slope'),
              metricCard('Collapse risk', percent(stats.risk), 'Deterministic model')
            )
          ),
          h('div', { className: 'rounded-xl border border-rose-300 bg-rose-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-rose-950' }, 'Local ring stress map'),
              h('p', { className: 'text-xs text-rose-950 mt-1' }, 'This geometry-based teaching map highlights where thin walls, outward slopes, uneven thickness, moisture, low compression, and weak coil joints combine. It is a comparative risk cue, not a measured stress field.'),
              h('p', { className: 'text-[11px] font-bold text-rose-900 mt-1' }, 'Highest current ring: ' + (stats.criticalRing + 1) + ' of ' + RING_COUNT + ' · ' + Math.round(stats.maxRingRisk) + '% local modeled risk')
            ),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2', role: 'list', 'aria-label': 'Local ring stress zones' }, ringZones.map(function (zone) {
              var peak = zone.peak;
              return h('div', { key: zone.label, role: 'listitem', className: 'min-w-0' },
                h('button', { type: 'button', onClick: function () { focusRing(peak.index); }, title: 'Focus ring ' + (peak.index + 1) + ' in the Shape section', 'aria-label': zone.label + '. Peak at ring ' + (peak.index + 1) + '. ' + peak.status + '. ' + Math.round(peak.risk * 100) + ' percent local risk.', className: 'w-full rounded-lg border p-2 text-left ' + riskTone(peak.risk) },
                  h('span', { className: 'block text-xs font-black' }, zone.label),
                  h('span', { className: 'block text-[10px] font-bold mt-1' }, 'Ring ' + (peak.index + 1) + ' · ' + Math.round(peak.risk * 100) + '%'),
                  h('span', { className: 'block h-2 rounded-full bg-black/10 mt-2 overflow-hidden', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(peak.risk * 100), 'aria-label': zone.label + ' local risk' }, h('span', { className: 'block h-full rounded-full bg-current', style: { width: Math.max(4, Math.round(peak.risk * 100)) + '%' } })),
                  h('span', { className: 'block text-[10px] mt-1' }, peak.wallCm.toFixed(2) + ' cm wall · ' + peak.status)
                )
              );
            })),
            h('p', { className: 'text-[11px] text-rose-950' }, 'Select a zone to jump to its peak ring. Then change one shaping control and return here to see whether the local risk moved.')
          ),
          h('div', { className: 'rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-amber-950' }, 'Optional material recipe study'),
              h('p', { className: 'text-xs text-amber-950 mt-1' }, 'Vary bounded material assumptions and compare the predicted tradeoffs before you shape or fire. This temper control is an abstract classroom proxy, not a recipe for a real clay source or a claim about any cultural tradition.'),
              h('p', { className: 'text-[11px] font-bold text-amber-900 mt-1' }, 'Baseline: ' + namedBody.name + (activeRecipe ? ' · applied recipe: ' + (activeRecipe.label || 'unnamed study') : ' · named body active'))
            ),
            h('div', { className: 'grid md:grid-cols-2 gap-3' },
              h('label', { htmlFor: 'wheel-fire-recipe-label', className: 'block text-xs font-bold text-slate-700' }, 'Study label', h('input', { id: 'wheel-fire-recipe-label', maxLength: 48, value: recipeDraft.label, onChange: function (event) { updateRecipe('label', event.target.value); }, placeholder: 'e.g. coarse temper trial', className: 'block w-full mt-1 rounded-lg border border-amber-300 p-2 bg-white font-normal' })),
              rangeControl('wheel-fire-temper', 'Temper proxy', recipeDraft.temperPercent, 0, 35, '%', function (value) { updateRecipe('temperPercent', value); }),
              rangeControl('wheel-fire-plasticity-shift', 'Plasticity adjustment', recipeDraft.plasticityShift, -18, 18, ' pts', function (value) { updateRecipe('plasticityShift', value); }),
              rangeControl('wheel-fire-shrinkage-shift', 'Shrinkage adjustment', recipeDraft.shrinkageShift, -3, 3, ' pts', function (value) { updateRecipe('shrinkageShift', value); }),
              rangeControl('wheel-fire-porosity-shift', 'Porosity adjustment', recipeDraft.porosityShift, -8, 8, ' pts', function (value) { updateRecipe('porosityShift', value); })
            ),
            h('div', { className: 'wheel-fire-stats' },
              metricCard('Plasticity', percent(previewBody.plasticity * 100), 'Named ' + signed((previewBody.plasticity - namedBody.plasticity) * 100, 1) + ' pts'),
              metricCard('Shrinkage', percent(previewBody.shrinkage * 100), 'Named ' + signed((previewBody.shrinkage - namedBody.shrinkage) * 100, 1) + ' pts'),
              metricCard('Open porosity', percent(previewBody.porosity * 100), 'Named ' + signed((previewBody.porosity - namedBody.porosity) * 100, 1) + ' pts'),
              metricCard('Density', previewBody.density.toFixed(2) + ' g/cm3', 'Named ' + signed((previewBody.density - namedBody.density) * 100, 1) + '%')
            ),
            h('ul', { className: 'list-disc pl-5 text-xs text-amber-950 space-y-1' }, recipeTradeoffs.map(function (tradeoff, index) { return h('li', { key: index }, tradeoff); })),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', onClick: applyRecipe, className: 'rounded-lg bg-amber-800 text-white px-3 py-2 text-xs font-black' }, draftRecipe ? 'Apply recipe to current piece' : 'Use named body baseline'),
              h('button', { type: 'button', onClick: saveMaterialScenario, className: 'rounded-lg border border-amber-400 bg-white text-amber-950 px-3 py-2 text-xs font-bold' }, 'Save comparison scenario'),
              h('button', { type: 'button', onClick: clearRecipe, disabled: !activeRecipe && !draftRecipe, className: 'rounded-lg border border-amber-400 bg-white text-amber-950 px-3 py-2 text-xs font-bold disabled:opacity-40' }, 'Clear recipe')
            )
          ),
          h('div', { className: 'rounded-xl border border-indigo-300 bg-indigo-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-indigo-950' }, 'Material comparison shelf'),
              h('p', { className: 'text-xs text-indigo-950 mt-1' }, 'Saved scenarios preserve the named clay body and assumptions. Loading one changes only the preview draft; apply it separately if you want the current vessel to use it.')
            ),
            materialScenarios.length ? h('div', { className: 'overflow-x-auto rounded-lg border border-indigo-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-3 font-black text-indigo-950' }, 'Saved recipe hypotheses'),
                h('thead', null, h('tr', { className: 'bg-indigo-100' }, ['Scenario', 'Body', 'Plasticity', 'Shrinkage', 'Porosity', 'Fired porosity', 'Actions'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-indigo-200' }, label); }))),
                h('tbody', null, materialScenarios.map(function (scenario) {
                  var scenarioBody = clayBody(scenario.clayBody || vessel.clayBody);
                  var scenarioComparison = compareMaterialProfiles(scenario.clayBody || vessel.clayBody, scenario.materialRecipe, { temperature: finite(data.kilnTemp, scenarioBody.maturity), ramp: finite(data.ramp, 110), soak: finite(data.soak, 10), kilnType: data.kilnType || 'electric' });
                  return h('tr', { key: scenario.id },
                    h('th', { scope: 'row', className: 'text-left align-top p-2 border-b border-indigo-100' }, scenario.label || 'Unnamed scenario'),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, scenarioBody.name),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, percent(scenarioComparison.profile.plasticity * 100)),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, percent(scenarioComparison.profile.shrinkage * 100)),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, percent(scenarioComparison.profile.porosity * 100)),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, percent(scenarioComparison.firedPorosity.porosity * 100)),
                    h('td', { className: 'align-top p-2 border-b border-indigo-100' }, h('div', { className: 'flex flex-wrap gap-1' },
                      h('button', { type: 'button', onClick: function () { loadMaterialScenario(scenario); }, className: 'rounded border border-indigo-300 px-2 py-1 font-bold text-indigo-900' }, 'Load preview'),
                      h('button', { type: 'button', onClick: function () { removeMaterialScenario(scenario.id); }, className: 'rounded border border-red-300 px-2 py-1 font-bold text-red-800' }, 'Remove')
                    ))
                  );
                }))
              )
            ) : h('p', { className: 'rounded-lg border border-dashed border-indigo-300 bg-white p-4 text-center text-xs text-indigo-900' }, 'Save a recipe hypothesis to begin an A/B comparison shelf.')
          ),
          h('div', { className: 'grid md:grid-cols-2 gap-3' },
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3 space-y-3' },
              h('h3', { className: 'font-black text-slate-900' }, 'One-variable investigation'),
              h('label', { htmlFor: 'wheel-fire-hypothesis', className: 'block text-xs font-bold text-slate-700' }, 'Prediction or hypothesis', h('textarea', { id: 'wheel-fire-hypothesis', rows: 3, value: data.hypothesis || '', onChange: function (event) { patchData({ hypothesis: event.target.value }); }, placeholder: 'If I increase wheel speed while holding pressure and moisture steady, then…', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal' })),
              h('button', { type: 'button', onClick: logTrial, className: 'rounded-lg bg-cyan-800 text-white px-3 py-2 text-xs font-black' }, 'Log current measurement'),
              h('p', { className: 'text-[11px] text-slate-600' }, 'Tip: return to Shape, alter one control, apply the same tool at the same ring, then log again.')
            ),
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900 mb-2' }, 'What the model conserves'),
              h('ul', { className: 'list-disc pl-5 text-xs text-slate-700 space-y-2' },
                h('li', null, 'Opening, pulling, expanding, collaring, centering, and smoothing redistribute approximately the same clay volume.'),
                h('li', null, 'Adding a coil increases clay mass. Trimming permanently removes it.'),
                h('li', null, 'New coils begin with weaker joints; paddling or smoothing raises modeled compression and bond quality.'),
                h('li', null, 'Very wet, thin, tall, off-center, poorly consolidated, or strongly overhanging clay becomes less stable—especially at high wheel speed.'),
                h('li', null, 'This is a teaching model, not a structural certification or kiln-control system.'))
            )
          ),
          logs.length ? h('div', { className: 'overflow-x-auto rounded-xl border border-slate-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-slate-900' }, 'Measurement log'),
              h('thead', null, h('tr', { className: 'bg-slate-100' }, ['Method', 'Recipe', 'RPM', 'Pressure', 'Moisture', 'Min wall', 'Uniformity', 'Compression', 'Bond', 'Overhang', 'Stability', 'Outcome'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-slate-300' }, label); }))),
              h('tbody', null, logs.map(function (row) { var rowRecipe = normalizeRecipe(row.materialRecipe); return h('tr', { key: row.id }, h('td', { className: 'p-2 border-b' }, row.method), h('td', { className: 'p-2 border-b' }, rowRecipe ? (rowRecipe.label || (Math.round(rowRecipe.temperPercent) + '% temper')) : 'named body'), h('td', { className: 'p-2 border-b' }, row.rpm), h('td', { className: 'p-2 border-b' }, row.pressure + '%'), h('td', { className: 'p-2 border-b' }, row.moisture + '%'), h('td', { className: 'p-2 border-b' }, row.minWall + ' cm'), h('td', { className: 'p-2 border-b' }, row.uniformity + '%'), h('td', { className: 'p-2 border-b' }, finite(row.compression, 0) + '%'), h('td', { className: 'p-2 border-b' }, finite(row.coilBond, 0) + '%'), h('td', { className: 'p-2 border-b' }, finite(row.overhang, 0) + '%'), h('td', { className: 'p-2 border-b' }, row.stability + '%'), h('td', { className: 'p-2 border-b' }, row.outcome)); }))
            )
          ) : null,
          h('div', { className: 'rounded-xl border border-indigo-300 bg-indigo-50 p-3 grid md:grid-cols-3 gap-3' },
            [['claim', 'Claim'], ['evidence', 'Evidence from trials'], ['reasoning', 'Scientific reasoning']].map(function (item) { return h('label', { key: item[0], className: 'text-xs font-bold text-indigo-950' }, item[1], h('textarea', { rows: 4, value: data[item[0]] || '', onChange: function (event) { var patch = {}; patch[item[0]] = event.target.value; patchData(patch); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 font-normal bg-white' })); })
          )
        );
      }
      function traditionsPanel() {
        var selectedId = data.selectedTradition || CULTURAL_STUDIES[0].id;
        var selected = CULTURAL_STUDIES.filter(function (study) { return study.id === selectedId; })[0] || CULTURAL_STUDIES[0];
        var comparisonChoices = CULTURAL_STUDIES.filter(function (study) { return study.id !== selected.id; });
        var compareId = data.compareTradition || comparisonChoices[0].id;
        var compare = comparisonChoices.filter(function (study) { return study.id === compareId; })[0] || comparisonChoices[0];
        var visited = data.visitedTraditions || {};
        var culturalComparisons = copyArray(data.culturalComparisons);
        function selectStudy(study) {
          var nextVisited = Object.assign({}, visited); nextVisited[study.id] = true;
          patchData({ selectedTradition: study.id, visitedTraditions: nextVisited });
          announce(study.name + ' process study opened.');
        }
        function applyStudy(study) {
          var exp = study.experiment;
          var next = makeVessel(exp.clayBody, exp.preset);
          var nextVisited = Object.assign({}, visited); nextVisited[study.id] = true;
          commitVessel(next, 'Technique study materials configured for ' + study.name + '. The resulting work remains your own study, not an authentic community object.', {
            method: exp.method, activeTool: exp.method === 'coil' ? 'add-coil' : 'center', clayBody: exp.clayBody, rpm: exp.rpm, kilnType: exp.kilnType, kilnTemp: exp.kilnTemp, glazeId: exp.glaze, selectedTradition: study.id, visitedTraditions: nextVisited, studyLabel: study.name + ' materials study', recipeDraft: null
          });
        }
        function saveCulturalComparison() {
          var similarity = String(data.cultureSimilarity || '').trim();
          var difference = String(data.cultureDifference || '').trim();
          var evidence = String(data.cultureEvidence || '').trim();
          if (!similarity || !difference || !evidence) { announce('Complete all three comparison reflections before saving.'); return; }
          var nextVisited = Object.assign({}, visited); nextVisited[selected.id] = true; nextVisited[compare.id] = true;
          var entry = { id: Date.now(), firstId: selected.id, firstName: selected.name, secondId: compare.id, secondName: compare.name, similarity: similarity.slice(0, 500), difference: difference.slice(0, 500), evidence: evidence.slice(0, 500) };
          patchData({ culturalComparisons: [entry].concat(culturalComparisons).slice(0, 8), visitedTraditions: nextVisited, cultureSimilarity: '', cultureDifference: '', cultureEvidence: '' });
          announce('Contextual pottery comparison saved. Both process studies are marked visited.');
        }
        function compareRow(label, first, second) { return h('tr', null, h('th', { scope: 'row', className: 'text-left align-top p-2 border-b border-indigo-200 w-28' }, label), h('td', { className: 'align-top p-2 border-b border-indigo-200' }, first), h('td', { className: 'align-top p-2 border-b border-indigo-200' }, second)); }
        return h('section', { id: 'wheel-fire-panel-traditions', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-traditions', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-fuchsia-300 bg-fuchsia-50 p-4' },
            h('h2', { className: 'text-xl font-black text-fuchsia-950' }, 'Many pottery technologies, specific cultural contexts'),
            h('p', { className: 'text-sm text-fuchsia-950 mt-1' }, 'Compare how local materials, available fuels, foodways, architecture, community knowledge, and intended use shape ceramic decisions. These are process studies—not style filters.'),
            h('p', { className: 'text-xs font-bold text-fuchsia-900 mt-2' }, 'Respectful making rule: credit named communities, avoid copying sacred or restricted imagery, and describe your result as a technique study rather than an authentic traditional object.')
          ),
          h('div', { className: 'wheel-fire-culture-grid' }, CULTURAL_STUDIES.map(function (study) {
            var isSelected = selected.id === study.id;
            return h('article', { key: study.id, className: 'rounded-xl border p-3 ' + (isSelected ? 'border-fuchsia-600 bg-fuchsia-50' : 'border-slate-300 bg-white') },
              h('div', { className: 'flex items-start justify-between gap-2' }, h('h3', { className: 'font-black text-slate-900' }, study.name), visited[study.id] ? h('span', { className: 'text-[10px] rounded-full bg-emerald-100 text-emerald-900 px-2 py-1 font-bold' }, 'Studied') : null),
              h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, study.place + ' · ' + study.period),
              h('p', { className: 'text-xs text-slate-700 mt-2' }, study.forming),
              h('button', { type: 'button', onClick: function () { selectStudy(study); }, className: 'mt-3 rounded-lg border border-fuchsia-300 bg-white text-fuchsia-900 px-3 py-2 text-xs font-bold' }, 'Study this process')
            );
          })),
          h('article', { className: 'rounded-2xl border border-fuchsia-300 bg-white p-4' },
            h('h2', { className: 'text-lg font-black text-slate-900' }, selected.name),
            h('p', { className: 'text-xs font-bold text-fuchsia-800' }, selected.place + ' · ' + selected.period),
            h('dl', { className: 'grid md:grid-cols-3 gap-3 mt-3 text-sm' },
              h('div', { className: 'rounded-lg bg-amber-50 p-3' }, h('dt', { className: 'font-black text-amber-950' }, 'Making'), h('dd', { className: 'mt-1 text-slate-700' }, selected.forming)),
              h('div', { className: 'rounded-lg bg-teal-50 p-3' }, h('dt', { className: 'font-black text-teal-950' }, 'Use and context'), h('dd', { className: 'mt-1 text-slate-700' }, selected.use)),
              h('div', { className: 'rounded-lg bg-cyan-50 p-3' }, h('dt', { className: 'font-black text-cyan-950' }, 'Science question'), h('dd', { className: 'mt-1 text-slate-700' }, selected.science))
            ),
            h('div', { role: 'note', className: 'mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950' }, h('strong', null, 'Cultural care: '), selected.respect),
            h('div', { className: 'mt-3 flex flex-wrap gap-2 items-center' },
              h('button', { type: 'button', onClick: function () { applyStudy(selected); }, className: 'rounded-lg bg-fuchsia-800 text-white px-3 py-2 text-xs font-black' }, 'Set up a materials experiment'),
              h('a', { href: selected.sourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'rounded-lg border border-slate-300 bg-white text-slate-800 px-3 py-2 text-xs font-bold underline' }, 'Read source: ' + selected.sourceLabel)
            )
          ),
          h('div', { className: 'rounded-xl border border-indigo-300 bg-indigo-50 p-3' },
            h('div', { className: 'flex flex-wrap gap-2 items-end mb-2' },
              h('label', { className: 'text-xs font-bold text-indigo-950' }, 'Compare with', h('select', { value: compare.id, onChange: function (event) { patchData({ compareTradition: event.target.value }); }, className: 'block mt-1 rounded-lg border border-indigo-300 bg-white p-2' }, comparisonChoices.map(function (study) { return h('option', { key: study.id, value: study.id }, study.name); })))
            ),
            h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left font-black text-indigo-950 mb-2' }, 'Process comparison'),
              h('thead', null, h('tr', null, h('th', { className: 'text-left p-2' }, 'Lens'), h('th', { scope: 'col', className: 'text-left p-2' }, selected.name), h('th', { scope: 'col', className: 'text-left p-2' }, compare.name))),
              h('tbody', null, compareRow('Place', selected.place, compare.place), compareRow('Forming', selected.forming, compare.forming), compareRow('Use', selected.use, compare.use), compareRow('Science', selected.science, compare.science))
            ))
          ),
          h('div', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-teal-950' }, 'Context before resemblance'),
              h('p', { className: 'text-xs text-teal-950 mt-1' }, 'Use the sources and process table to compare technological choices. Similar-looking vessels can come from different materials, purposes, histories, and knowledge systems; visual resemblance alone is not evidence of a shared tradition.')
            ),
            h('div', { className: 'grid md:grid-cols-3 gap-3' },
              h('label', { className: 'text-xs font-bold text-teal-950' }, 'Process similarity', h('textarea', { rows: 4, maxLength: 500, value: data.cultureSimilarity || '', onChange: function (event) { patchData({ cultureSimilarity: event.target.value }); }, placeholder: 'Both processes respond to…', className: 'block w-full mt-1 rounded-lg border border-teal-300 bg-white p-2 font-normal' })),
              h('label', { className: 'text-xs font-bold text-teal-950' }, 'Contextual difference', h('textarea', { rows: 4, maxLength: 500, value: data.cultureDifference || '', onChange: function (event) { patchData({ cultureDifference: event.target.value }); }, placeholder: 'A material, purpose, or historical difference is…', className: 'block w-full mt-1 rounded-lg border border-teal-300 bg-white p-2 font-normal' })),
              h('label', { className: 'text-xs font-bold text-teal-950' }, 'Evidence and uncertainty', h('textarea', { rows: 4, maxLength: 500, value: data.cultureEvidence || '', onChange: function (event) { patchData({ cultureEvidence: event.target.value }); }, placeholder: 'The named sources support… They do not establish…', className: 'block w-full mt-1 rounded-lg border border-teal-300 bg-white p-2 font-normal' }))
            ),
            h('button', { type: 'button', onClick: saveCulturalComparison, className: 'rounded-lg bg-teal-800 text-white px-3 py-2 text-xs font-black' }, 'Save contextual comparison'),
            culturalComparisons.length ? h('div', { className: 'space-y-2' },
              h('h4', { className: 'text-xs font-black text-teal-950' }, 'Saved comparisons'),
              culturalComparisons.slice(0, 3).map(function (entry) { return h('details', { key: entry.id, className: 'rounded-lg border border-teal-200 bg-white p-2' }, h('summary', { className: 'cursor-pointer text-xs font-bold text-teal-950' }, entry.firstName + ' ↔ ' + entry.secondName), h('dl', { className: 'mt-2 text-xs space-y-1' }, h('div', null, h('dt', { className: 'font-bold' }, 'Similarity'), h('dd', null, entry.similarity)), h('div', null, h('dt', { className: 'font-bold' }, 'Difference'), h('dd', null, entry.difference)), h('div', null, h('dt', { className: 'font-bold' }, 'Evidence and uncertainty'), h('dd', null, entry.evidence)))); })
            ) : null
          )
        );
      }
      function kilnPanel() {
        var humidity = clamp(finite(data.humidity, 48), 10, 95);
        var dryingRate = clamp(finite(data.dryingRate, 45), 0, 100);
        var body = materialProfile(vessel);
        var kilnTemp = clamp(finite(data.kilnTemp, vessel.stage === 'bone-dry' ? 950 : body.maturity), 600, 1350);
        var ramp = clamp(finite(data.ramp, 110), 30, 300);
        var soak = clamp(finite(data.soak, 10), 0, 90);
        var coolingRate = clamp(finite(data.coolingRate, 100), 30, 300);
        var kilnType = data.kilnType || 'electric';
        var atmosphere = kilnType === 'electric' ? 'oxidation' : (data.atmosphere || 'oxidation');
        var dimensionalSettings = currentDimensionSettings();
        var glazeId = data.glazeId || 'clear';
        var glazeThickness = clamp(finite(data.glazeThickness, 50), 5, 100);
        var heatwork = estimateHeatwork({ temperature: kilnTemp, ramp: ramp, soak: soak });
        var projectedFiring = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
        var glazePreviewVessel = copyVessel(vessel);
        glazePreviewVessel.glazeId = glazeId;
        glazePreviewVessel.glazeThickness = glazeThickness;
        var glazePreview = analyzeGlazeOutcome(glazePreviewVessel, { temperature: kilnTemp, ramp: ramp, soak: soak, kilnType: kilnType, atmosphere: atmosphere });
        var firingSchedules = copyArray(data.firingSchedules);
        var scheduleLabel = String(data.scheduleLabel || '').slice(0, 48);
        var currentSchedule = analyzeFiringSchedule(vessel, { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, glazeId: glazeId, glazeThickness: glazeThickness });
        function advanceDrying() { var next = dryVessel(vessel, { humidity: humidity, dryingRate: dryingRate }); commitVessel(next, next.lastOutcome); }
        function fire() { var next = fireVessel(vessel, { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere }); commitVessel(next, next.lastOutcome); }
        function applyGlaze() { var next = glazeVessel(vessel, glazeId, glazeThickness); commitVessel(next, next.lastOutcome); }
        function saveFiringSchedule() {
          var label = scheduleLabel.trim() || 'Firing schedule ' + (firingSchedules.length + 1);
          var schedule = { id: Date.now(), label: label, temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, glazeId: glazeId, glazeThickness: glazeThickness, savedAt: new Date().toISOString() };
          patchData({ firingSchedules: [schedule].concat(firingSchedules).slice(0, 8), scheduleLabel: '' });
          announce(label + ' saved to the firing comparison shelf.');
        }
        function loadFiringSchedule(schedule) {
          patchData({ kilnTemp: schedule.temperature, ramp: schedule.ramp, soak: schedule.soak, coolingRate: schedule.coolingRate, kilnType: schedule.kilnType, atmosphere: schedule.atmosphere, glazeId: schedule.glazeId || glazeId, glazeThickness: schedule.glazeThickness || glazeThickness });
          announce((schedule.label || 'Firing schedule') + ' loaded into the kiln controls. No firing was started.');
        }
        function removeFiringSchedule(id) {
          patchData({ firingSchedules: firingSchedules.filter(function (schedule) { return schedule.id !== id; }) });
          announce('Firing schedule removed from the comparison shelf.');
        }
        function firingCurve() {
          var peakY = 168 - (kilnTemp - 600) / 750 * 124;
          var soakWidth = 18 + soak / 90 * 72;
          var riseEnd = 245;
          var coolStart = riseEnd + soakWidth;
          var curve = 'M28 168 L' + riseEnd + ' ' + peakY.toFixed(1) + ' L' + coolStart.toFixed(1) + ' ' + peakY.toFixed(1) + ' L472 168';
          return h('figure', { className: 'rounded-xl border border-orange-200 bg-orange-50 p-2' },
            h('svg', { viewBox: '0 0 500 190', role: 'img', 'aria-label': 'Simplified kiln schedule rising to ' + Math.round(kilnTemp) + ' degrees Celsius, soaking for ' + Math.round(soak) + ' minutes, then cooling.', className: 'w-full' },
              h('title', null, 'Simplified kiln schedule'),
              h('desc', null, 'The rising line represents heating, the level segment represents soaking at peak temperature, and the falling line represents cooling.'),
              [44, 85, 126, 168].map(function (y) { return h('line', { key: y, x1: 28, x2: 472, y1: y, y2: y, stroke: '#fed7aa', strokeWidth: 1 }); }),
              h('path', { d: curve, fill: 'none', stroke: '#c2410c', strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
              h('circle', { cx: riseEnd, cy: peakY, r: 6, fill: '#9a3412' }),
              h('text', { x: 28, y: 184, fill: '#7c2d12', fontSize: 12 }, 'room'),
              h('text', { x: riseEnd, y: Math.max(16, peakY - 10), textAnchor: 'middle', fill: '#7c2d12', fontSize: 12, fontWeight: 700 }, Math.round(kilnTemp) + '°C'),
              h('text', { x: (riseEnd + coolStart) / 2, y: Math.min(184, peakY + 18), textAnchor: 'middle', fill: '#7c2d12', fontSize: 11 }, Math.round(soak) + ' min soak'),
              h('text', { x: 472, y: 184, textAnchor: 'end', fill: '#7c2d12', fontSize: 12 }, 'cool')
            ),
            h('figcaption', { className: 'text-[11px] text-orange-950' }, 'Modeled effective heatwork: ' + Math.round(heatwork.effectiveTemp) + '°C equivalent · rough cone neighborhood ' + heatwork.cone + '. Witness cones remain the real kiln check.')
          );
        }
        function focusDryingHotspot(index) {
          patchData({ view: 'shape', workRing: index });
          announce('Focused ring ' + (index + 1) + ' for drying inspection.');
        }
        function dryingHistory() {
          var history = estimateDryingHistory(vessel, { humidity: humidity, dryingRate: dryingRate });
          return h('section', { className: 'rounded-xl border border-sky-200 bg-white p-3 space-y-3', 'aria-labelledby': 'wheel-fire-drying-history-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-drying-history-title', className: 'font-black text-sky-950' }, 'Modeled drying history'),
              h('p', { className: 'text-xs text-sky-950 mt-1' }, 'Relative bars show the share of modeled moisture removal, not elapsed time. Humidity and drying speed change the comparative crack-risk signal.')
            ),
            history.ready ? h('div', { className: 'space-y-2', 'aria-label': 'Modeled drying history steps' }, history.segments.map(function (segment) {
              return h('div', { key: segment.id },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700' },
                  h('span', null, segment.label.charAt(0).toUpperCase() + segment.label.slice(1) + ' Â· ' + Math.round(segment.moistureStartPct) + 'â†’' + Math.round(segment.moistureEndPct) + '% moisture'),
                  h('span', null, segment.moistureLossPct.toFixed(1) + ' points Â· ' + Math.round(segment.crackRiskPct) + '% crack-risk signal')
                ),
                h('div', { className: 'h-3 overflow-hidden rounded-full bg-sky-100', 'aria-hidden': 'true' }, h('div', { className: 'h-full rounded-full bg-sky-600', style: { width: Math.max(0, Math.min(100, segment.relativePct)).toFixed(1) + '%' } })),
                h('div', { className: 'text-[11px] text-slate-600' }, 'Modeled shrinkage: ' + segment.shrinkagePct.toFixed(2) + '%' + (segment.newDefects.length ? ' Â· New flags: ' + segment.newDefects.join(', ') : ' Â· No new modeled flags'))
              );
            })) : h('p', { className: 'rounded-lg border border-dashed border-sky-300 bg-sky-50 p-3 text-xs text-sky-950' }, history.summary),
            history.ready ? h('div', { className: 'grid grid-cols-2 gap-2 text-xs' },
              h('div', { className: 'rounded-lg border border-sky-100 bg-sky-50 p-2' }, h('strong', null, 'Modeled moisture removed'), h('div', { className: 'text-lg font-black text-sky-950' }, history.totalMoistureLossPct.toFixed(1) + ' points')),
              h('div', { className: 'rounded-lg border border-sky-100 bg-sky-50 p-2' }, h('strong', null, 'Projected final stage'), h('div', { className: 'text-lg font-black text-sky-950' }, history.finalStage))
            ) : null,
            history.hotspots.length ? h('div', { className: 'rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2', 'aria-label': 'Drying hotspots to inspect' },
              h('h4', { className: 'font-black text-sky-950' }, 'Drying hotspots to inspect'),
              h('p', { className: 'text-[11px] text-sky-950' }, 'These rings combine local wall geometry with the selected drying conditions. Focus one in Shape to inspect the profile.'),
              h('div', { className: 'space-y-1' }, history.hotspots.map(function (hotspot) {
                return h('button', { type: 'button', key: hotspot.index, onClick: function () { focusDryingHotspot(hotspot.index); }, className: 'w-full rounded-lg border border-sky-300 bg-white p-2 text-left text-xs hover:bg-sky-100' }, h('span', { className: 'font-black text-sky-950' }, 'Ring ' + (hotspot.index + 1)), ' Â· ', Math.round(hotspot.riskPct) + '% local signal Â· ' + hotspot.wallCm.toFixed(2) + ' cm wall Â· ' + hotspot.reason)
              }))
            ) : null,
            h('p', { className: 'text-[11px] text-slate-600' }, history.ready ? history.summary : 'Drying history is a comparative teaching model; real outcomes depend on airflow, thickness, support, clay body, and studio conditions.')
          );
        }
        function dimensionalHistory() {
          var history = estimateDimensionalHistory(vessel, dimensionalSettings);
          function pct(value) { return (value >= 0 ? '+' : '') + value.toFixed(1) + '%'; }
          var measurementLog = copyArray(data.dimensionMeasurementLog);
          var calibration = compareDimensionalMeasurements(history, measurementLog, dimensionalSettings);
          var checkpointMax = Math.max(0, history.snapshots.length - 1);
          var checkpointIndex = Math.round(clamp(finite(data.dimensionMeasureCheckpoint, 0), 0, checkpointMax));
          var checkpoint = history.snapshots[checkpointIndex] || history.baseline;
          var targetPlan = estimateDimensionalTargets(history, { heightCm: data.dimensionTargetHeight, diameterCm: data.dimensionTargetDiameter, capacityMl: data.dimensionTargetCapacity, minWallCm: data.dimensionTargetMinWall });
          function inputValue(key) { return data[key] === null || data[key] === undefined ? '' : data[key]; }
          function readMeasurement(key) {
            var raw = data[key];
            if (raw === '' || raw === null || raw === undefined) return null;
            var value = Number(raw);
            return isFinite(value) && value > 0 ? value : null;
          }
          function readUncertainty(key) {
            var raw = data[key];
            if (raw === '' || raw === null || raw === undefined) return null;
            var value = Number(raw);
            return isFinite(value) && value >= 0 ? value : null;
          }
          function metricDigits(id) { return id === 'capacityMl' ? 0 : (id === 'minWallCm' ? 2 : 1); }
          function delta(value, digits) { return (value >= 0 ? '+' : '') + value.toFixed(digits); }
          function saveDimensionMeasurement() {
            var measured = { heightCm: readMeasurement('dimensionMeasureHeight'), diameterCm: readMeasurement('dimensionMeasureDiameter'), capacityMl: readMeasurement('dimensionMeasureCapacity'), minWallCm: readMeasurement('dimensionMeasureMinWall') };
            var uncertainty = { heightCm: readUncertainty('dimensionUncertaintyHeight'), diameterCm: readUncertainty('dimensionUncertaintyDiameter'), capacityMl: readUncertainty('dimensionUncertaintyCapacity'), minWallCm: readUncertainty('dimensionUncertaintyMinWall') };
            var hasValue = Object.keys(measured).some(function (key) { return measured[key] !== null; });
            if (!hasValue) { announce('Enter at least one positive measured dimension before logging the checkpoint.'); return; }
            var entry = { id: Date.now(), checkpointIndex: checkpointIndex, checkpointLabel: checkpoint.label, stage: checkpoint.stage, modeled: { heightCm: checkpoint.heightCm, diameterCm: checkpoint.diameterCm, capacityMl: checkpoint.capacityMl, minWallCm: checkpoint.minWallCm }, modelSettings: dimensionalSettings, measured: measured, uncertainty: uncertainty, note: String(data.dimensionMeasureNote || '').trim().slice(0, 240), savedAt: new Date().toISOString() };
            patchData({ dimensionMeasurementLog: [entry].concat(measurementLog).slice(0, 12), dimensionMeasureHeight: '', dimensionMeasureDiameter: '', dimensionMeasureCapacity: '', dimensionMeasureMinWall: '', dimensionUncertaintyHeight: '', dimensionUncertaintyDiameter: '', dimensionUncertaintyCapacity: '', dimensionUncertaintyMinWall: '', dimensionMeasureNote: '' });
            announce('Measured dimensions saved for ' + checkpoint.label + '.');
          }
          function metricCell(row, id) {
            var item = row.compared.filter(function (candidate) { return candidate.id === id; })[0];
            if (!item) return '—';
            var digits = metricDigits(id);
            var uncertaintyNote = item.uncertainty === null ? '' : '; +/- ' + item.uncertainty.toFixed(digits) + ' ' + item.unit + (item.withinUncertainty ? ' in range' : ' outside range');
            return item.measured.toFixed(digits) + ' ' + item.unit + ' (Δ ' + delta(item.residual, digits) + '; ' + delta(item.relativeErrorPct, 1) + '%' + uncertaintyNote + ')';
          }
          function contextLabel(row) {
            if (!row.context) return 'Frozen model';
            return row.context.status === 'current' ? 'Current controls' : (row.context.status === 'stale' ? 'Needs review' : 'Incomplete context');
          }
          function clearDimensionTargets() {
            patchData({ dimensionTargetHeight: '', dimensionTargetDiameter: '', dimensionTargetCapacity: '', dimensionTargetMinWall: '' });
            announce('Dimensional targets cleared.');
          }
          return h('section', { className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-dimensional-history-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-dimensional-history-title', className: 'font-black text-indigo-950' }, 'Dimensional shrinkage budget'),
              h('p', { className: 'text-xs text-indigo-950 mt-1' }, 'Forward projection from the current stage. Height, diameter, capacity, and minimum wall are model checkpoints—not a substitute for measuring the real piece.')
            ),
            h('div', { className: 'overflow-x-auto rounded-lg border border-indigo-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-indigo-950' }, 'Projected dimensional checkpoints'),
                h('thead', null, h('tr', { className: 'bg-indigo-100' }, ['Checkpoint', 'Height', 'Diameter', 'Capacity', 'Min wall', 'Height Δ', 'Capacity Δ'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-indigo-200' }, label); }))),
                h('tbody', null, history.snapshots.map(function (snapshot) { return h('tr', { key: snapshot.label }, h('th', { scope: 'row', className: 'text-left p-2 border-b align-top font-black' }, snapshot.label), h('td', { className: 'p-2 border-b align-top' }, snapshot.heightCm.toFixed(1) + ' cm'), h('td', { className: 'p-2 border-b align-top' }, snapshot.diameterCm.toFixed(1) + ' cm'), h('td', { className: 'p-2 border-b align-top' }, Math.round(snapshot.capacityMl) + ' mL'), h('td', { className: 'p-2 border-b align-top' }, snapshot.minWallCm.toFixed(2) + ' cm'), h('td', { className: 'p-2 border-b align-top' }, pct(snapshot.heightChangePct)), h('td', { className: 'p-2 border-b align-top' }, pct(snapshot.capacityChangePct))); }))
              )
            ),
            h('div', { className: 'rounded-lg border border-fuchsia-300 bg-fuchsia-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-dimensional-target-title' },
              h('div', null,
                h('h4', { id: 'wheel-fire-dimensional-target-title', className: 'font-black text-fuchsia-950' }, 'Plan backward from a target'),
                h('p', { className: 'text-xs text-fuchsia-950 mt-1' }, 'Enter a desired final dimension. The inverse budget estimates the current-stage target using the modeled retention ratio for this piece and schedule; it does not replace test throwing or later trimming.')
              ),
              h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-4 gap-2' },
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Desired final height (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionTargetHeight'), onChange: function (event) { patchData({ dimensionTargetHeight: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-fuchsia-300 p-2 bg-white', placeholder: targetPlan.final.heightCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Desired final diameter (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionTargetDiameter'), onChange: function (event) { patchData({ dimensionTargetDiameter: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-fuchsia-300 p-2 bg-white', placeholder: targetPlan.final.diameterCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Desired final capacity (mL)', h('input', { type: 'number', min: '0.01', step: '1', value: inputValue('dimensionTargetCapacity'), onChange: function (event) { patchData({ dimensionTargetCapacity: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-fuchsia-300 p-2 bg-white', placeholder: Math.round(targetPlan.final.capacityMl) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Desired final min wall (cm)', h('input', { type: 'number', min: '0.01', step: '0.01', value: inputValue('dimensionTargetMinWall'), onChange: function (event) { patchData({ dimensionTargetMinWall: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-fuchsia-300 p-2 bg-white', placeholder: targetPlan.final.minWallCm.toFixed(2) }))
              ),
              targetPlan.results.length ? h('div', { className: 'overflow-x-auto rounded-lg border border-fuchsia-200 bg-white' },
                h('table', { className: 'w-full text-xs border-collapse' },
                  h('caption', { className: 'text-left p-2 font-black text-fuchsia-950' }, 'Current-stage target estimates'),
                  h('thead', null, h('tr', { className: 'bg-fuchsia-100' }, ['Metric', 'Desired final', 'Current-stage target', 'Modeled retention', 'Target change'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-fuchsia-200' }, label); }))),
                  h('tbody', null, targetPlan.results.map(function (result) { var digits = metricDigits(result.id); return h('tr', { key: result.id }, h('th', { scope: 'row', className: 'text-left p-2 border-b font-black' }, result.label), h('td', { className: 'p-2 border-b' }, result.targetFinal.toFixed(digits) + ' ' + result.unit), h('td', { className: 'p-2 border-b font-black' }, result.recommendedCurrent.toFixed(digits) + ' ' + result.unit), h('td', { className: 'p-2 border-b' }, result.retentionPct.toFixed(1) + '%'), h('td', { className: 'p-2 border-b' }, delta(result.currentChangePct, 1) + '%')); }))
                )
              ) : null,
              h('p', { className: 'text-[11px] text-fuchsia-950' }, targetPlan.summary),
              h('button', { type: 'button', onClick: clearDimensionTargets, className: 'rounded-lg border border-fuchsia-300 bg-white px-3 py-2 text-xs font-black text-fuchsia-900' }, 'Clear target fields')
            ),
            h('div', { className: 'rounded-lg border border-indigo-300 bg-white p-3 space-y-3' },
              h('div', null,
                h('h4', { className: 'font-black text-indigo-950' }, 'Calibrate with a real measurement'),
                h('p', { className: 'text-xs text-indigo-950 mt-1' }, 'Choose the checkpoint you actually measured. Log caliper readings, a scale-based capacity estimate, or one dimension at a time; blank fields stay blank rather than becoming zero. The modeled values and controls are frozen in the record for a stable comparison.')
              ),
              h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-4 gap-2' },
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Checkpoint', h('select', { id: 'wheel-fire-dimension-checkpoint', value: String(checkpointIndex), onChange: function (event) { patchData({ dimensionMeasureCheckpoint: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white' }, history.snapshots.map(function (snapshot, index) { return h('option', { key: snapshot.label, value: String(index) }, snapshot.label + ' · ' + snapshot.stage); }))),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured height (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionMeasureHeight'), onChange: function (event) { patchData({ dimensionMeasureHeight: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: checkpoint.heightCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured diameter (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionMeasureDiameter'), onChange: function (event) { patchData({ dimensionMeasureDiameter: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: checkpoint.diameterCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured capacity (mL)', h('input', { type: 'number', min: '0.01', step: '1', value: inputValue('dimensionMeasureCapacity'), onChange: function (event) { patchData({ dimensionMeasureCapacity: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: Math.round(checkpoint.capacityMl) }))
              ),
              h('div', { className: 'grid sm:grid-cols-2 gap-2' },
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured minimum wall (cm)', h('input', { type: 'number', min: '0.01', step: '0.01', value: inputValue('dimensionMeasureMinWall'), onChange: function (event) { patchData({ dimensionMeasureMinWall: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: checkpoint.minWallCm.toFixed(2) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measurement note (optional)', h('input', { value: inputValue('dimensionMeasureNote'), maxLength: 240, onChange: function (event) { patchData({ dimensionMeasureNote: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: 'e.g. calipers after glaze firing' }))
              ),
              h('div', { className: 'rounded-lg border border-indigo-200 bg-indigo-50 p-2 space-y-2' },
                h('div', null,
                  h('h5', { className: 'font-black text-indigo-950' }, 'Measurement uncertainty (optional)'),
                  h('p', { className: 'text-[11px] text-indigo-950 mt-1' }, 'Enter a non-negative +/- range for each reading based on instrument resolution, technique, or repeatability. Leave blank when unknown.')
                ),
                h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-4 gap-2' },
                  h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Height +/- (cm)', h('input', { type: 'number', min: '0', step: '0.01', value: inputValue('dimensionUncertaintyHeight'), onChange: function (event) { patchData({ dimensionUncertaintyHeight: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: 'e.g. 0.1' })),
                  h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Diameter +/- (cm)', h('input', { type: 'number', min: '0', step: '0.01', value: inputValue('dimensionUncertaintyDiameter'), onChange: function (event) { patchData({ dimensionUncertaintyDiameter: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: 'e.g. 0.1' })),
                  h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Capacity +/- (mL)', h('input', { type: 'number', min: '0', step: '1', value: inputValue('dimensionUncertaintyCapacity'), onChange: function (event) { patchData({ dimensionUncertaintyCapacity: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: 'e.g. 5' })),
                  h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Min wall +/- (cm)', h('input', { type: 'number', min: '0', step: '0.01', value: inputValue('dimensionUncertaintyMinWall'), onChange: function (event) { patchData({ dimensionUncertaintyMinWall: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: 'e.g. 0.02' }))
                )
              ),
              h('button', { type: 'button', onClick: saveDimensionMeasurement, className: 'rounded-lg bg-indigo-800 text-white px-3 py-2 text-xs font-black' }, 'Log measured checkpoint')
            ),
            h('div', { className: 'rounded-lg border border-indigo-300 bg-indigo-100 p-3 space-y-3', 'aria-live': 'polite' },
              h('div', null,
                h('h4', { className: 'font-black text-indigo-950' }, 'Model calibration evidence'),
                h('p', { className: 'text-xs text-indigo-950 mt-1' }, calibration.summary)
              ),
              calibration.needsReviewCount ? h('p', { className: 'rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950', role: 'alert' }, calibration.contextSummary) : null,
              h('p', { className: 'rounded-lg border border-indigo-200 bg-white p-2 text-xs text-indigo-950' }, calibration.uncertaintySummary),
              calibration.rows.length ? h('div', { className: 'space-y-3' },
                h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-2 text-xs' },
                  h('div', { className: 'rounded-lg border border-indigo-200 bg-white p-2' }, h('strong', null, 'Checkpoints logged'), h('div', { className: 'text-lg font-black text-indigo-950' }, calibration.measurementCount)),
                  h('div', { className: 'rounded-lg border border-indigo-200 bg-white p-2' }, h('strong', null, 'Dimensions compared'), h('div', { className: 'text-lg font-black text-indigo-950' }, calibration.dimensionCount)),
                  h('div', { className: 'rounded-lg border border-indigo-200 bg-white p-2' }, h('strong', null, 'Mean absolute error'), h('div', { className: 'text-lg font-black text-indigo-950' }, calibration.meanAbsoluteRelativeErrorPct.toFixed(1) + '%')),
                  h('div', { className: 'rounded-lg border border-indigo-200 bg-white p-2' }, h('strong', null, 'Mean signed error'), h('div', { className: 'text-lg font-black text-indigo-950' }, delta(calibration.meanSignedRelativeErrorPct, 1) + '%')),
                  h('div', { className: 'rounded-lg border border-indigo-200 bg-white p-2' }, h('strong', null, 'Within uncertainty'), h('div', { className: 'text-lg font-black text-indigo-950' }, calibration.uncertaintyCoveragePct === null ? 'not set' : calibration.uncertaintyCoveragePct.toFixed(0) + '%'), h('div', { className: 'text-[11px] text-slate-600' }, calibration.outOfBandCount + ' outside range'))
                ),
                h('div', { className: 'overflow-x-auto rounded-lg border border-indigo-200 bg-white' },
                  h('table', { className: 'w-full text-xs border-collapse' },
                    h('caption', { className: 'text-left p-2 font-black text-indigo-950' }, 'Per-metric calibration summary'),
                    h('thead', null, h('tr', { className: 'bg-indigo-50' }, ['Metric', 'Checks', 'Mean absolute residual', 'Mean absolute relative error', 'Within +/- range'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-indigo-200' }, label); }))),
                    h('tbody', null, [['heightCm', 'Height'], ['diameterCm', 'Diameter'], ['capacityMl', 'Capacity'], ['minWallCm', 'Min wall']].map(function (metric) { var summary = calibration.byMetric[metric[0]]; var digits = metricDigits(metric[0]); return h('tr', { key: metric[0] }, h('th', { scope: 'row', className: 'text-left p-2 border-b font-black' }, metric[1]), h('td', { className: 'p-2 border-b' }, summary.count), h('td', { className: 'p-2 border-b' }, summary.count ? summary.meanAbsoluteResidual.toFixed(digits) + ' ' + (metric[0] === 'capacityMl' ? 'mL' : 'cm') : '—'), h('td', { className: 'p-2 border-b' }, summary.count ? summary.meanAbsoluteRelativeErrorPct.toFixed(1) + '%' : '—'), h('td', { className: 'p-2 border-b' }, summary.withinUncertaintyPct === null ? 'not set' : summary.withinUncertaintyPct.toFixed(0) + '% (' + summary.outOfBandCount + ' out)')); }))
                  )
                ),
                h('div', { className: 'overflow-x-auto rounded-lg border border-indigo-200 bg-white' },
                  h('table', { className: 'w-full text-xs border-collapse' },
                    h('caption', { className: 'text-left p-2 font-black text-indigo-950' }, 'Measured checkpoint log'),
                    h('thead', null, h('tr', { className: 'bg-indigo-50' }, ['Checkpoint', 'Height', 'Diameter', 'Capacity', 'Min wall', 'Context', 'Note'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-indigo-200' }, label); }))),
                    h('tbody', null, calibration.rows.map(function (row) { return h('tr', { key: row.id }, h('th', { scope: 'row', className: 'text-left p-2 border-b align-top font-black' }, row.checkpoint), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'heightCm')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'diameterCm')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'capacityMl')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'minWallCm')), h('td', { className: 'p-2 border-b align-top font-bold' }, contextLabel(row)), h('td', { className: 'p-2 border-b align-top max-w-xs' }, row.note || '—')); }))
                  )
                )
              ) : null
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, history.summary)
          );
        }
        function thermalHistory() {
          var history = currentSchedule.thermalHistory;
          return h('section', { className: 'rounded-xl border border-orange-200 bg-white p-3 space-y-3', 'aria-labelledby': 'wheel-fire-thermal-history-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-thermal-history-title', className: 'font-black text-orange-950' }, 'Modeled thermal history'),
              h('p', { className: 'text-xs text-orange-950 mt-1' }, 'An approximate time sequence from room temperature to the selected peak and back toward ' + Math.round(history.coolingReference) + 'Â°C. The model does not include kiln load, controller cycling, thermocouple lag, or witness-cone behavior.')
            ),
            h('div', { className: 'space-y-2', 'aria-label': 'Modeled thermal history segments' }, history.segments.map(function (segment) {
              return h('div', { key: segment.id },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700' },
                  h('span', null, segment.label + ' Â· ' + Math.round(segment.startC) + 'â†’' + Math.round(segment.endC) + 'Â°C'),
                  h('span', null, segment.durationHours.toFixed(1) + ' h Â· ' + Math.round(segment.relativePct) + '% of modeled time')
                ),
                h('div', { className: 'h-3 overflow-hidden rounded-full bg-orange-100', 'aria-hidden': 'true' }, h('div', { className: segment.id === 'cool' ? 'h-full rounded-full bg-sky-600' : (segment.id === 'soak' ? 'h-full rounded-full bg-red-600' : 'h-full rounded-full bg-orange-600'), style: { width: Math.max(0, Math.min(100, segment.relativePct)).toFixed(1) + '%' } }))
              );
            })),
            h('div', { className: 'grid grid-cols-2 gap-2 text-xs' },
              h('div', { className: 'rounded-lg border border-orange-100 bg-orange-50 p-2' }, h('strong', null, 'Total modeled schedule time'), h('div', { className: 'text-lg font-black text-orange-950' }, history.totalHours.toFixed(1) + ' h')),
              h('div', { className: 'rounded-lg border border-orange-100 bg-orange-50 p-2' }, h('strong', null, 'Cooling risk signal'), h('div', { className: 'text-lg font-black text-orange-950' }, Math.round(currentSchedule.thermalRiskPct) + '%'), h('div', { className: 'text-[11px] text-slate-600' }, 'comparative only'))
            )
          );
        }
        return h('section', { id: 'wheel-fire-panel-kiln', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-kiln', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-orange-300 bg-orange-50 p-4' },
            h('h2', { className: 'text-xl font-black text-orange-950' }, 'Drying shelf & kiln'),
            h('p', { className: 'text-sm text-orange-950 mt-1' }, 'Drying shrinkage and firing heatwork expose weaknesses that may have begun during forming. Progress in order; the simulation will not let wet clay skip safely into a kiln.'),
            h('div', { role: 'alert', className: 'mt-2 text-xs font-bold text-red-900 bg-red-50 border border-red-300 rounded-lg p-2' }, 'Simulation only. Real kilns, glazes, clay dust, and firing fumes require trained supervision, ventilation, rated equipment, and material-specific safety guidance.')
          ),
          stageStrip(),
          h('div', { className: 'grid md:grid-cols-2 gap-3' },
            h('div', { className: 'rounded-xl border border-sky-300 bg-sky-50 p-3 space-y-3' },
              h('h3', { className: 'font-black text-sky-950' }, '1. Controlled drying'),
              rangeControl('wheel-fire-humidity', 'Room humidity', humidity, 10, 95, '%', function (value) { patchData({ humidity: value }); }),
              rangeControl('wheel-fire-drying-rate', 'Drying speed', dryingRate, 0, 100, '%', function (value) { patchData({ dryingRate: value }); }),
              h('button', { type: 'button', disabled: vessel.stage !== 'wet' && vessel.stage !== 'leather-hard', onClick: advanceDrying, className: 'w-full rounded-lg bg-sky-800 text-white px-3 py-2 text-xs font-black disabled:opacity-40' }, vessel.stage === 'wet' ? 'Dry to leather-hard' : 'Dry to bone-dry'),
              dryingHistory(),
              h('p', { className: 'text-xs text-sky-950' }, 'Uneven walls, thick sections, low humidity, and fast drying raise the modeled crack risk.')
            ),
            h('div', { className: 'rounded-xl border border-orange-300 bg-white p-3 space-y-3' },
              h('h3', { className: 'font-black text-orange-950' }, '2. Heatwork'),
              h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Kiln or firing type', h('select', { value: kilnType, onChange: function (event) { var nextType = event.target.value; patchData({ kilnType: nextType, atmosphere: nextType === 'electric' ? 'oxidation' : atmosphere }); }, className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 bg-white' }, ['electric', 'gas', 'wood', 'open'].map(function (id) { return h('option', { key: id, value: id }, id === 'open' ? 'Open firing study' : id + ' kiln'); }))),
              h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Atmosphere', h('select', { value: atmosphere, disabled: kilnType === 'electric', onChange: function (event) { patchData({ atmosphere: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 bg-white disabled:opacity-50' }, h('option', { value: 'oxidation' }, 'Oxidation'), h('option', { value: 'reduction' }, 'Reduction'))),
              rangeControl('wheel-fire-temperature', 'Target temperature', kilnTemp, 600, 1350, '°C', function (value) { patchData({ kilnTemp: value }); }),
              rangeControl('wheel-fire-ramp', 'Heating ramp', ramp, 30, 300, '°C/h', function (value) { patchData({ ramp: value }); }),
              rangeControl('wheel-fire-soak', 'Peak soak', soak, 0, 90, ' min', function (value) { patchData({ soak: value }); }),
              rangeControl('wheel-fire-cooling', 'Cooling rate', coolingRate, 30, 300, '°C/h', function (value) { patchData({ coolingRate: value }); }),
              h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Schedule label', h('input', { maxLength: 48, value: scheduleLabel, onChange: function (event) { patchData({ scheduleLabel: event.target.value }); }, placeholder: 'e.g. slow stoneware test', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal' })),
              h('button', { type: 'button', onClick: saveFiringSchedule, className: 'w-full rounded-lg border border-orange-400 bg-orange-50 text-orange-950 px-3 py-2 text-xs font-black' }, 'Save firing scenario'),
              firingCurve(),
              thermalHistory(),
              dimensionalHistory(),
              vessel.stage === 'bone-dry' ? h('button', { type: 'button', onClick: fire, className: 'w-full rounded-lg bg-orange-800 text-white px-3 py-2 text-xs font-black' }, 'Run bisque firing') : null,
              vessel.stage === 'glazed' ? h('button', { type: 'button', onClick: fire, className: 'w-full rounded-lg bg-red-700 text-white px-3 py-2 text-xs font-black' }, 'Run glaze firing') : null
            )
          ),
          h('div', { className: 'rounded-xl border border-orange-300 bg-orange-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-orange-950' }, 'Firing schedule shelf'),
              h('p', { className: 'text-xs text-orange-950 mt-1' }, 'Save alternate schedules as hypotheses. Loading a schedule changes controls only; firing still requires the explicit run button and the current lifecycle stage.'),
              h('p', { className: 'text-[11px] font-bold text-orange-900 mt-1' }, 'Current schedule: ' + currentSchedule.status + ' · ' + Math.round(currentSchedule.score) + '/100 · ' + currentSchedule.summary)
            ),
            firingSchedules.length ? h('div', { className: 'overflow-x-auto rounded-lg border border-orange-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-3 font-black text-orange-950' }, 'Saved firing hypotheses'),
                h('thead', null, h('tr', { className: 'bg-orange-100' }, ['Schedule', 'Kiln', 'Target', 'Effective', 'Cone', 'Score', 'Porosity', 'Glaze surface', 'Actions'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-orange-200' }, label); }))),
                h('tbody', null, firingSchedules.map(function (schedule) {
                  var scheduleComparison = analyzeFiringSchedule(vessel, schedule);
                  return h('tr', { key: schedule.id },
                    h('th', { scope: 'row', className: 'text-left align-top p-2 border-b border-orange-100' }, schedule.label || 'Unnamed schedule'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, schedule.kilnType || 'electric'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, Math.round(scheduleComparison.temperature) + '°C'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, Math.round(scheduleComparison.heatwork.effectiveTemp) + '°C'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, scheduleComparison.heatwork.cone),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, Math.round(scheduleComparison.score) + '/100'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, scheduleComparison.porosityPct.toFixed(1) + '%'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, scheduleComparison.glazeOutcome ? Math.round(scheduleComparison.glazeOutcome.surfaceScore) + '/100' : 'body only'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, h('div', { className: 'flex flex-wrap gap-1' },
                      h('button', { type: 'button', onClick: function () { loadFiringSchedule(schedule); }, className: 'rounded border border-orange-300 px-2 py-1 font-bold text-orange-900' }, 'Load schedule'),
                      h('button', { type: 'button', onClick: function () { removeFiringSchedule(schedule.id); }, className: 'rounded border border-red-300 px-2 py-1 font-bold text-red-800' }, 'Remove')
                    ))
                  );
                }))
              )
            ) : h('p', { className: 'rounded-lg border border-dashed border-orange-300 bg-white p-4 text-center text-xs text-orange-900' }, 'Save a schedule to compare heatwork and firing outcomes across trials.')
          ),
          h('div', { className: 'rounded-xl border border-violet-300 bg-violet-50 p-3 grid md:grid-cols-2 gap-3' },
            h('div', null,
              h('h3', { className: 'font-black text-violet-950' }, '3. Glaze application'),
              h('label', { className: 'block text-xs font-bold text-violet-950 mt-2' }, 'Glaze chemistry study', h('select', { value: glazeId, onChange: function (event) { patchData({ glazeId: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-violet-300 p-2 bg-white' }, Object.keys(GLAZES).map(function (id) { return h('option', { key: id, value: id }, GLAZES[id].name); }))),
              rangeControl('wheel-fire-glaze-thickness', 'Application thickness', glazeThickness, 5, 100, '%', function (value) { patchData({ glazeThickness: value }); }),
              h('button', { type: 'button', disabled: vessel.stage !== 'bisque', onClick: applyGlaze, className: 'w-full mt-2 rounded-lg bg-violet-800 text-white px-3 py-2 text-xs font-black disabled:opacity-40' }, 'Apply glaze to bisque')
            ),
            h('div', null,
              h('h3', { className: 'font-black text-violet-950' }, 'Material fit'),
              h('dl', { className: 'text-xs mt-2 space-y-2' },
                h('div', null, h('dt', { className: 'font-bold' }, 'Material profile'), h('dd', null, body.name)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Clay maturity'), h('dd', null, body.maturity + '°C')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Modeled total body shrinkage'), h('dd', null, percent(body.shrinkage * 100))),
                h('div', null, h('dt', { className: 'font-bold' }, 'Glaze maturity'), h('dd', null, glazeById(glazeId).maturity + '°C')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Projected maturation'), h('dd', null, percent(projectedFiring.maturation * 100))),
                h('div', null, h('dt', { className: 'font-bold' }, vessel.firedPorosity === null ? 'Projected fired porosity' : 'Recorded fired porosity'), h('dd', null, percent((vessel.firedPorosity === null ? projectedFiring.porosity : vessel.firedPorosity) * 100))),
                h('div', null, h('dt', { className: 'font-bold' }, 'Glaze/body expansion gap'), h('dd', null, Math.abs(glazeById(glazeId).expansion - body.expansion).toFixed(2)))
              )
            )
          ),
          h('div', { className: 'rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-3 space-y-3' },
            h('div', null,
              h('h3', { className: 'font-black text-fuchsia-950' }, 'Glaze outcome preview'),
              h('p', { className: 'text-xs text-fuchsia-950 mt-1' }, 'This preview uses the selected glaze, thickness, body, atmosphere, and heatwork settings. It separates surface variables so a learner can change one control and compare the predicted result.'),
              h('p', { className: 'text-[11px] font-bold text-fuchsia-900 mt-1' }, glazePreview.glazeName + ' on ' + glazePreview.bodyName + ' · ' + glazePreview.atmosphere)
            ),
            h('div', { className: 'wheel-fire-stats' },
              metricCard('Melt window', Math.round(glazePreview.meltIndexPct) + '%', glazePreview.status),
              metricCard('Coverage', Math.round(glazePreview.coveragePct) + '%', glazePreview.coveragePct < 28 ? 'Thin coverage' : (glazePreview.coveragePct > 78 ? 'Heavy coverage' : 'Mid-range application')),
              metricCard('Fit score', Math.round(glazePreview.fitScore) + '/100', 'Gap ' + glazePreview.fitGap.toFixed(2)),
              metricCard('Surface score', Math.round(glazePreview.surfaceScore) + '/100', 'Comparative model')
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 text-[11px] text-fuchsia-950' },
              h('div', { className: 'rounded-lg border border-fuchsia-200 bg-white p-2' }, h('strong', null, 'Run risk '), Math.round(glazePreview.runRiskPct) + '%'),
              h('div', { className: 'rounded-lg border border-fuchsia-200 bg-white p-2' }, h('strong', null, 'Pinhole risk '), Math.round(glazePreview.pinholeRiskPct) + '%'),
              h('div', { className: 'rounded-lg border border-fuchsia-200 bg-white p-2' }, h('strong', null, 'Crawling risk '), Math.round(glazePreview.crawlingRiskPct) + '%')
            ),
            h('p', { role: 'status', 'aria-live': 'polite', className: 'rounded-lg border border-fuchsia-200 bg-white p-2 text-xs text-fuchsia-950' }, glazePreview.summary)
          ),
          vessel.firingLog.length ? h('div', { className: 'overflow-x-auto rounded-xl border border-orange-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-orange-950' }, 'Firing evidence log'),
              h('thead', null, h('tr', { className: 'bg-orange-50' }, ['Stage', 'Target', 'Heatwork', 'Cone', 'Soak', 'Cooling', 'Atmosphere', 'Observed model flags', 'Surface outcome'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-orange-200' }, label); }))),
              h('tbody', null, vessel.firingLog.map(function (entry, index) { return h('tr', { key: entry.stage + '-' + index },
                h('td', { className: 'p-2 border-b' }, entry.stage),
                h('td', { className: 'p-2 border-b' }, finite(entry.temperature, 0) + '°C'),
                h('td', { className: 'p-2 border-b' }, finite(entry.effectiveTemperature, entry.temperature) + '°C eq.'),
                h('td', { className: 'p-2 border-b' }, entry.cone || '—'),
                h('td', { className: 'p-2 border-b' }, finite(entry.soak, 0) + ' min'),
                h('td', { className: 'p-2 border-b' }, finite(entry.coolingRate, 0) + '°C/h'),
                h('td', { className: 'p-2 border-b' }, entry.atmosphere || '—'),
                h('td', { className: 'p-2 border-b' }, copyArray(entry.defects).length ? copyArray(entry.defects).join(', ') : 'none'),
                h('td', { className: 'p-2 border-b' }, entry.glazeOutcome ? entry.glazeOutcome.status + ' - ' + Math.round(finite(entry.glazeOutcome.surfaceScore, 0)) + '/100' : 'n/a')
              ); }))
            )
          ) : null,
          h('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950' }, h('strong', null, 'Latest outcome: '), vessel.lastOutcome),
          vessel.defects.length ? h('div', { className: 'rounded-xl border border-red-300 bg-red-50 p-3' }, h('h3', { className: 'font-black text-red-950' }, 'Modeled defects to inspect'), h('ul', { className: 'list-disc pl-5 text-xs text-red-900 mt-1' }, vessel.defects.map(function (defect) { return h('li', { key: defect }, defect); }))) : h('p', { className: 'rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900' }, 'No modeled defects are currently recorded.')
        );
      }
      function performancePanel() {
        var testType = data.performanceTest || 'water';
        var durationHours = clamp(finite(data.testDurationHours, 4), 1, 24);
        var temperatureDelta = clamp(finite(data.testTemperatureDelta, 80), 10, 220);
        var loadKg = clamp(finite(data.testLoadKg, 5), 0.5, 30);
        var cycles = clamp(finite(data.testCycles, 12), 1, 60);
        var cycleDryingRate = clamp(finite(data.testCycleDryingRate, 45), 5, 100);
        var cycleTemperatureDelta = clamp(finite(data.testCycleTemperatureDelta, 80), 10, 220);
        var savedCycleProtocols = copyArray(data.cycleProtocols);
        var cycleProtocolLabel = String(data.cycleProtocolLabel || '').slice(0, 48);
        var sensitivityLog = copyArray(data.sensitivityLog);
        var sensitivityObservation = String(data.sensitivityObservation || '').slice(0, 240);
        var testSettings = { durationHours: durationHours, temperatureDelta: temperatureDelta, loadKg: loadKg, cycles: cycles, dryingRate: cycleDryingRate, cycleTemperatureDelta: cycleTemperatureDelta };
        var preview = evaluateVesselUse(vessel, testType, testSettings);
        var performanceLog = copyArray(data.performanceLog);
        var labels = { water: 'Water retention', thermal: 'Thermal change', load: 'Static load', permeability: 'Permeability proxy', cycles: 'Repeated wet-dry cycles' };
        function runPerformanceTest() {
          if (!preview.ready) { announce('Fire the piece before running a function test.'); return; }
          var observation = String(data.testObservation || '').trim().slice(0, 240);
          var entry = Object.assign({ id: Date.now(), label: labels[testType], stage: vessel.stage, clayBody: vessel.clayBody, materialRecipe: normalizeRecipe(vessel.materialRecipe), observation: observation }, preview);
          patchData({ performanceLog: [entry].concat(performanceLog).slice(0, 12), testObservation: '' });
          announce(labels[testType] + ' simulation logged. ' + preview.status + (observation ? '. Observation note saved.' : '.'));
        }
        function logSensitivitySweep() {
          if (testType !== 'cycles' || !preview.ready) { announce('Fire the piece and select repeated wet-dry cycles before logging a sensitivity sweep.'); return; }
          var sweep = compareCycleSensitivity(vessel, testSettings);
          var entry = {
            id: Date.now(), label: 'Cycle sensitivity sweep', stage: vessel.stage, clayBody: vessel.clayBody,
            materialRecipe: normalizeRecipe(vessel.materialRecipe), cycles: preview.cycles, dryingRate: preview.dryingRate,
            cycleTemperatureDelta: preview.cycleTemperatureDelta, damagePct: preview.damagePct, damageRange: preview.damageRange,
            axes: sweep.map(function (axis) { return { id: axis.id, label: axis.label, unit: axis.unit, points: axis.points.map(function (point) { return { id: point.id, label: point.label, value: point.value, damagePct: point.result.damagePct, damageRange: point.result.damageRange }; }) }; }),
            observation: sensitivityObservation.trim(), savedAt: new Date().toISOString()
          };
          patchData({ sensitivityLog: [entry].concat(sensitivityLog).slice(0, 8), sensitivityObservation: '' });
          announce('Sensitivity sweep logged.' + (entry.observation ? ' Observation note saved.' : ' Add a field note when you have one.'));
        }
        function resultMetrics() {
          if (!preview.ready) return h('p', { className: 'rounded-xl border border-dashed border-slate-400 p-5 text-center text-sm text-slate-600' }, preview.summary);
          var scoreLabel = testType === 'water' || testType === 'permeability' ? 'Retention score' : 'Resilience score';
          var cards = [
            metricCard(scoreLabel, Math.round(preview.score) + '/100', 'Comparative evidence only'),
            metricCard('Effective porosity', preview.porosityPct.toFixed(1) + '%', vessel.stage),
            metricCard('Integrity remaining', Math.round(preview.integrityPct) + '%', vessel.defects.length + ' modeled flag' + (vessel.defects.length === 1 ? '' : 's'))
          ];
          if (testType === 'water') cards.push(metricCard('Estimated seepage', preview.seepageMl.toFixed(1) + ' mL', Math.round(preview.durationHours) + ' hour test'));
          if (testType === 'thermal') cards.push(metricCard('Stress risk', Math.round(preview.riskPct) + '%', Math.round(preview.temperatureDelta) + '°C change'));
          if (testType === 'load') cards.push(metricCard('Capacity proxy', preview.estimatedCapacityKg.toFixed(1) + ' kg', 'Margin ' + preview.marginKg.toFixed(1) + ' kg'));
          if (testType === 'permeability') cards.push(metricCard('Permeability', Math.round(preview.permeabilityIndex) + '/100', 'Comparative proxy'));
          if (testType === 'cycles') {
            cards.push(metricCard('Accumulated damage', Math.round(preview.damagePct) + '%', Math.round(preview.cycles) + ' wet-dry cycles'));
            cards.push(metricCard('Modeled damage range', Math.round(preview.damageRange.low) + ' to ' + Math.round(preview.damageRange.high) + '%', 'Uncalibrated sensitivity band'));
            cards.push(metricCard('Exposure profile', Math.round(preview.dryingRate) + '% dry / ' + Math.round(preview.cycleTemperatureDelta) + ' C', 'Modeled protocol severity'));
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'wheel-fire-stats' }, cards),
            h('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-950' }, h('strong', null, preview.status + ': '), preview.summary)
          );
        }
        function cycleSensitivityExplainer() {
          if (testType !== 'cycles' || !preview.ready || !preview.uncertaintyDrivers) return null;
          var bandWidth = preview.damageRange.high - preview.damageRange.low;
          return h('section', { className: 'rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-sensitivity-title', className: 'font-black text-slate-900' }, 'Read the sensitivity band'),
              h('p', { className: 'text-xs text-slate-700 mt-1' }, 'The point estimate is a teaching-model center, while the band shows how sensitive that estimate is to simplified assumptions. It is not a statistical confidence interval or a prediction of service life.')
            ),
            h('div', { className: 'grid sm:grid-cols-2 gap-2' },
              h('div', { className: 'rounded-lg border border-slate-200 bg-white p-2' }, h('div', { className: 'text-[11px] font-bold uppercase tracking-wide text-slate-500' }, 'Band width'), h('div', { className: 'text-lg font-black text-slate-900' }, Math.round(bandWidth) + ' percentage points'), h('div', { className: 'text-[11px] text-slate-600' }, 'bounded at Â±' + Math.round(preview.uncertaintyPct) + '% around the estimate')),
              h('div', { className: 'rounded-lg border border-slate-200 bg-white p-2' }, h('div', { className: 'text-[11px] font-bold uppercase tracking-wide text-slate-500' }, 'Use it as a question'), h('div', { className: 'text-sm font-black text-slate-900' }, 'What changes if one input changes?'), h('div', { className: 'text-[11px] text-slate-600' }, 'Compare one variable at a time, then record an observation separately.'))
            ),
            h('div', { className: 'rounded-lg border border-slate-200 bg-white p-3 space-y-2', 'aria-label': 'Sensitivity band contributors' },
              h('h4', { className: 'font-black text-slate-900' }, 'What widens the band?'),
              h('div', { className: 'space-y-2' }, preview.uncertaintyDrivers.map(function (driver) {
                return h('div', { key: driver.id },
                  h('div', { className: 'flex items-center justify-between text-xs font-bold text-slate-700' }, h('span', null, driver.label), h('span', null, Math.round(driver.points * 10) / 10 + ' pts')),
                  h('div', { className: 'wheel-fire-cycle-bar', 'aria-hidden': 'true' }, h('div', { className: 'wheel-fire-cycle-fill', style: { width: Math.max(0, Math.min(100, driver.relativePct)).toFixed(1) + '%' } }))
                );
              }))
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, 'The model caps the displayed sensitivity at 8–24%. Treat the band as a prompt to investigate wall uniformity, defects, porosity, and thermal behavior—not as a measurement of those properties.')
          );
        }
        function cycleSensitivitySweep() {
          if (testType !== 'cycles' || !preview.ready) return null;
          var sweeps = compareCycleSensitivity(vessel, testSettings);
          return h('section', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-sweep-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-sensitivity-sweep-title', className: 'font-black text-teal-950' }, 'One-variable sensitivity sweep'),
              h('p', { className: 'text-xs text-teal-950 mt-1' }, 'Compare lower, current, and higher settings while the other two cycle controls stay fixed. The cells show point damage followed by the uncalibrated band.')
            ),
            h('div', { className: 'overflow-x-auto rounded-lg border border-teal-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-teal-950' }, 'Counterfactual cycle comparison'),
                h('thead', null, h('tr', { className: 'bg-teal-100' }, ['Variable', 'Lower', 'Current', 'Higher'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-teal-200' }, label); }))),
                h('tbody', null, sweeps.map(function (axis) {
                  return h('tr', { key: axis.id },
                    h('th', { scope: 'row', className: 'p-2 border-b text-left font-black align-top' }, axis.label),
                    axis.points.map(function (point) { return h('td', { key: point.id, className: 'p-2 border-b align-top' }, h('div', { className: 'font-bold' }, Math.round(point.value) + axis.unit), h('div', { className: 'font-black text-teal-900 mt-1' }, Math.round(point.result.damagePct) + '% damage'), h('div', { className: 'text-[11px] text-slate-600' }, Math.round(point.result.damageRange.low) + '–' + Math.round(point.result.damageRange.high) + '% band')); })
                  );
                }))
              )
            ),
            h('div', { className: 'rounded-lg border border-teal-200 bg-white p-3 space-y-2' },
              h('label', { htmlFor: 'wheel-fire-sensitivity-observation', className: 'block text-xs font-bold text-slate-700' }, 'Sensitivity observation (optional)', h('textarea', { id: 'wheel-fire-sensitivity-observation', rows: 3, maxLength: 240, value: sensitivityObservation, onChange: function (event) { patchData({ sensitivityObservation: event.target.value }); }, placeholder: 'Record what changed in the real piece when you varied one condition. Keep this separate from the model result.', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal' })),
              h('p', { className: 'text-[11px] text-slate-600' }, 'A field note is evidence to compare later; it does not calibrate or validate the simulation.'),
              h('button', { type: 'button', onClick: logSensitivitySweep, className: 'rounded-lg bg-teal-800 text-white px-3 py-2 text-xs font-black' }, 'Log sweep as experiment')
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, 'This is a controlled comparison of the teaching model. For a real studio study, pair each run with measured drying conditions, fired test pieces, and field notes.')
          );
        }
        function sensitivityEvidenceLog() {
          if (!sensitivityLog.length) return null;
          return h('section', { className: 'rounded-xl border border-cyan-300 bg-cyan-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-log-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-sensitivity-log-title', className: 'font-black text-cyan-950' }, 'Sensitivity experiment log'),
              h('p', { className: 'text-xs text-cyan-950 mt-1' }, 'Saved model comparisons and field notes stay together so you can revisit the question without confusing a prediction with an observation.')
            ),
            h('div', { className: 'space-y-2' }, sensitivityLog.map(function (entry) {
              var axes = copyArray(entry.axes);
              return h('article', { key: entry.id, className: 'rounded-lg border border-cyan-200 bg-white p-3 space-y-2' },
                h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' }, h('strong', { className: 'text-sm text-slate-900' }, entry.label || 'Cycle sensitivity sweep'), h('span', { className: 'text-[11px] text-slate-600' }, String(entry.savedAt || '').slice(0, 10) + ' Â· ' + (entry.stage || 'unknown stage'))),
                h('p', { className: 'text-xs font-bold text-cyan-900' }, 'Baseline: ' + Math.round(finite(entry.damagePct, 0)) + '% damage; ' + Math.round(finite(entry.cycles, 0)) + ' cycles Â· ' + Math.round(finite(entry.dryingRate, 0)) + '% dry Â· ' + Math.round(finite(entry.cycleTemperatureDelta, 0)) + ' C swing'),
                axes.length ? h('ul', { className: 'list-disc pl-5 text-[11px] text-slate-700' }, axes.map(function (axis) { return h('li', { key: axis.id }, axis.label + ': ' + copyArray(axis.points).map(function (point) { return Math.round(finite(point.value, 0)) + axis.unit + ' â†’ ' + Math.round(finite(point.damagePct, 0)) + '%'; }).join(' Â· ')); })) : null,
                h('p', { className: 'text-xs text-slate-700' }, h('strong', null, 'Field note: '), entry.observation || 'No field note saved.')
              );
            }))
          );
        }
        function cycleProgression() {
          if (testType !== 'cycles' || !preview.ready || !preview.cycleCheckpoints || !preview.cycleCheckpoints.length) return null;
          var points = preview.cycleCheckpoints;
          return h('section', { className: 'rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-cycle-progression-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-cycle-progression-title', className: 'font-black text-amber-950' }, 'Modeled damage progression'),
              h('p', { className: 'text-xs text-amber-950 mt-1' }, 'The curve is intentionally comparative: accumulated wear can accelerate as material pathways, defects, and geometry compound across reuse.')
            ),
            h('div', { className: 'space-y-2', 'aria-label': 'Visual damage progression' }, points.map(function (point) {
              return h('div', { key: point.phase + '-' + point.cycles },
                h('div', { className: 'flex items-center justify-between text-xs font-bold text-slate-700' },
                  h('span', null, point.phase + ' Â· ' + Math.round(point.cycles) + ' cycles'),
                  h('span', null, Math.round(point.damagePct) + '% damage')
                ),
                h('div', { className: 'wheel-fire-cycle-bar', 'aria-hidden': 'true' }, h('div', { className: 'wheel-fire-cycle-fill', style: { width: Math.max(0, Math.min(100, point.damagePct)).toFixed(1) + '%' } }))
              );
            })),
            h('div', { className: 'rounded-lg border border-amber-200 bg-white p-3 space-y-2', 'aria-label': 'Relative modeled damage drivers' },
              h('div', null,
                h('h4', { className: 'font-black text-amber-950' }, 'Modeled driver breakdown'),
                h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Relative weights before the selected protocol multiplier. Leading driver: ' + preview.primaryDriver + '.')
              ),
              h('div', { className: 'space-y-2' }, preview.cycleDrivers.map(function (driver) {
                return h('div', { key: driver.id },
                  h('div', { className: 'flex items-center justify-between text-xs font-bold text-slate-700' }, h('span', null, driver.label), h('span', null, Math.round(driver.relativePct) + '%')),
                  h('div', { className: 'wheel-fire-cycle-bar', 'aria-hidden': 'true' }, h('div', { className: 'wheel-fire-cycle-fill', style: { width: Math.max(0, Math.min(100, driver.relativePct)).toFixed(1) + '%' } }))
                );
              }))
            ),
            h('div', { className: 'overflow-x-auto rounded-lg border border-amber-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-amber-950' }, 'Cycle checkpoints'),
                h('thead', null, h('tr', { className: 'bg-amber-100' }, ['Checkpoint', 'Cycles', 'Damage', 'Resilience remaining', 'Interpretation'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-amber-200' }, label); }))),
                h('tbody', null, points.map(function (point) { return h('tr', { key: 'row-' + point.phase + '-' + point.cycles }, h('td', { className: 'p-2 border-b font-bold' }, point.phase), h('td', { className: 'p-2 border-b' }, Math.round(point.cycles)), h('td', { className: 'p-2 border-b' }, Math.round(point.damagePct) + '%'), h('td', { className: 'p-2 border-b' }, Math.round(point.resiliencePct) + '%'), h('td', { className: 'p-2 border-b' }, point.status)); }))
              )
            )
          );
        }
        function cycleProtocolComparison() {
          if (testType !== 'cycles' || !preview.ready) return null;
          var comparisons = compareCycleProtocols(vessel, CYCLE_PROTOCOLS);
          function applyProtocol(protocol) {
            patchData({ testCycles: protocol.cycles, testCycleDryingRate: protocol.dryingRate, testCycleTemperatureDelta: protocol.cycleTemperatureDelta });
            announce(protocol.label + ' loaded into the cycle controls. No test was started.');
          }
          return h('section', { className: 'rounded-xl border border-blue-300 bg-blue-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-cycle-protocols-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-cycle-protocols-title', className: 'font-black text-blue-950' }, 'Compare reuse protocols'),
              h('p', { className: 'text-xs text-blue-950 mt-1' }, 'Run the same fired vessel through three bounded classroom scenarios. These are comparison presets, not care recommendations or service standards.')
            ),
            h('div', { className: 'overflow-x-auto rounded-lg border border-blue-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-blue-950' }, 'Reuse protocol comparison'),
                h('thead', null, h('tr', { className: 'bg-blue-100' }, ['Scenario', 'Cycles', 'Drying', 'Swing', 'Damage', 'Leading driver', 'Action'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-blue-200' }, label); }))),
                h('tbody', null, comparisons.map(function (comparison) {
                  var result = comparison.result;
                  return h('tr', { key: comparison.id },
                    h('td', { className: 'p-2 border-b align-top' }, h('strong', null, comparison.label), h('span', { className: 'block text-[11px] text-slate-600 mt-1' }, comparison.note)),
                    h('td', { className: 'p-2 border-b align-top' }, Math.round(comparison.cycles)),
                    h('td', { className: 'p-2 border-b align-top' }, Math.round(comparison.dryingRate) + '%'),
                    h('td', { className: 'p-2 border-b align-top' }, Math.round(comparison.cycleTemperatureDelta) + ' C'),
                    h('td', { className: 'p-2 border-b align-top font-black' }, Math.round(result.damagePct) + '%'),
                    h('td', { className: 'p-2 border-b align-top' }, result.primaryDriver),
                    h('td', { className: 'p-2 border-b align-top' }, h('button', { type: 'button', onClick: function () { applyProtocol(comparison); }, className: 'rounded-lg border border-blue-400 px-2 py-1 font-bold text-blue-900 hover:bg-blue-100' }, 'Apply'))
                  );
                }))
              )
            )
          );
        }
        function saveCycleProtocol() {
          var label = cycleProtocolLabel.trim() || 'Reuse protocol ' + (savedCycleProtocols.length + 1);
          var protocol = { id: Date.now(), label: label, cycles: cycles, dryingRate: cycleDryingRate, cycleTemperatureDelta: cycleTemperatureDelta, savedAt: new Date().toISOString() };
          patchData({ cycleProtocols: [protocol].concat(savedCycleProtocols).slice(0, 8), cycleProtocolLabel: '' });
          announce(label + ' saved to the reuse protocol shelf.');
        }
        function loadCycleProtocol(protocol) {
          patchData({ testCycles: protocol.cycles, testCycleDryingRate: protocol.dryingRate, testCycleTemperatureDelta: protocol.cycleTemperatureDelta });
          announce((protocol.label || 'Reuse protocol') + ' loaded into the cycle controls. No test was started.');
        }
        function removeCycleProtocol(id) {
          patchData({ cycleProtocols: savedCycleProtocols.filter(function (protocol) { return protocol.id !== id; }) });
          announce('Reuse protocol removed from the shelf.');
        }
        function cycleProtocolShelf() {
          if (testType !== 'cycles' || !preview.ready) return null;
          var evaluated = compareCycleProtocols(vessel, savedCycleProtocols);
          return h('section', { className: 'rounded-xl border border-violet-300 bg-violet-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-cycle-shelf-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-cycle-shelf-title', className: 'font-black text-violet-950' }, 'Saved reuse protocol shelf'),
              h('p', { className: 'text-xs text-violet-950 mt-1' }, 'Name the current cycle settings to carry a hypothesis into another piece or a later journal review. Saved protocols do not change the vessel until you load one.')
            ),
            h('div', { className: 'flex flex-wrap gap-2 items-end' },
              h('label', { className: 'block text-xs font-bold text-slate-700 flex-1 min-w-[190px]' }, 'Protocol label', h('input', { id: 'wheel-fire-cycle-protocol-label', value: cycleProtocolLabel, maxLength: 48, onChange: function (event) { patchData({ cycleProtocolLabel: event.target.value }); }, placeholder: 'e.g. slow studio rinse', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 bg-white' })),
              h('button', { type: 'button', onClick: saveCycleProtocol, className: 'rounded-lg bg-violet-800 text-white px-3 py-2 text-xs font-black' }, 'Save current protocol')
            ),
            savedCycleProtocols.length ? h('div', { className: 'overflow-x-auto rounded-lg border border-violet-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-violet-950' }, 'Saved protocol hypotheses'),
                h('thead', null, h('tr', { className: 'bg-violet-100' }, ['Protocol', 'Cycles', 'Drying', 'Swing', 'Damage', 'Actions'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-violet-200' }, label); }))),
                h('tbody', null, evaluated.map(function (comparison) { return h('tr', { key: comparison.id }, h('td', { className: 'p-2 border-b font-bold' }, comparison.label), h('td', { className: 'p-2 border-b' }, Math.round(finite(comparison.cycles, 0))), h('td', { className: 'p-2 border-b' }, Math.round(finite(comparison.dryingRate, 0)) + '%'), h('td', { className: 'p-2 border-b' }, Math.round(finite(comparison.cycleTemperatureDelta, 0)) + ' C'), h('td', { className: 'p-2 border-b font-black' }, Math.round(finite(comparison.result.damagePct, 0)) + '%'), h('td', { className: 'p-2 border-b' }, h('div', { className: 'flex gap-2' }, h('button', { type: 'button', onClick: function () { loadCycleProtocol(comparison); }, className: 'rounded-lg border border-violet-300 px-2 py-1 font-bold text-violet-900' }, 'Load'), h('button', { type: 'button', onClick: function () { removeCycleProtocol(comparison.id); }, className: 'rounded-lg border border-red-300 px-2 py-1 font-bold text-red-800' }, 'Remove')))); }))
              )
            ) : h('p', { className: 'rounded-lg border border-dashed border-violet-300 bg-white p-3 text-xs text-slate-600' }, 'No custom protocols saved yet.')
          );
        }
        return h('section', { id: 'wheel-fire-panel-performance', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-performance', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-blue-300 bg-blue-50 p-4' },
            h('h2', { className: 'text-xl font-black text-blue-950' }, 'Function & material performance lab'),
            h('p', { className: 'text-sm text-blue-950 mt-1' }, 'Test how firing, porosity, wall geometry, consolidation, glaze coverage, and modeled defects influence use-related behavior. Compare evidence across pieces; do not treat a high score as certification.')
          ),
          h('div', { role: 'alert', className: 'rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-950' },
            h('strong', null, 'Not a food-safety test. '),
            'This simulation cannot detect lead, cadmium, other glaze hazards, microbial risks, or real structural failure. Never use it to approve handmade ware for food, drink, flame, ovens, or microwaves. Real ceramic foodware requires appropriate materials, firing, and applicable laboratory or regulatory testing. ',
            h('a', { href: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cpg-sec-545450-pottery-ceramics-import-and-domestic-lead-contamination', target: '_blank', rel: 'noopener noreferrer', className: 'font-bold underline' }, 'FDA ceramicware guidance'), ' · ',
            h('a', { href: 'https://www.canada.ca/en/health-canada/services/consumer-product-safety/reports-publications/industry-professionals/guide-glazed-ceramics-glassware-regulations/document.html', target: '_blank', rel: 'noopener noreferrer', className: 'font-bold underline' }, 'Health Canada glazed-ceramics guidance')
          ),
          h('div', { className: 'grid md:grid-cols-[minmax(240px,.72fr)_minmax(0,1.28fr)] gap-3' },
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3 space-y-3' },
              h('label', { htmlFor: 'wheel-fire-function-test', className: 'block text-xs font-bold text-slate-700' }, 'Simulated test', h('select', { id: 'wheel-fire-function-test', value: testType, onChange: function (event) { patchData({ performanceTest: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 bg-white' }, Object.keys(labels).map(function (id) { return h('option', { key: id, value: id }, labels[id]); }))),
              testType === 'water' ? rangeControl('wheel-fire-test-duration', 'Test duration', durationHours, 1, 24, ' h', function (value) { patchData({ testDurationHours: value }); }) : null,
              testType === 'thermal' ? rangeControl('wheel-fire-test-delta', 'Temperature change', temperatureDelta, 10, 220, '°C', function (value) { patchData({ testTemperatureDelta: value }); }) : null,
              testType === 'load' ? rangeControl('wheel-fire-test-load', 'Applied static load', loadKg, 0.5, 30, ' kg', function (value) { patchData({ testLoadKg: value }); }) : null,
              testType === 'permeability' ? h('p', { className: 'text-xs text-slate-600' }, 'This proxy compares open pore pathways and modeled glaze sealing. It does not simulate fermentation, gas species, microbes, or food chemistry.') : null,
              testType === 'cycles' ? rangeControl('wheel-fire-test-cycles', 'Wet-dry cycles', cycles, 1, 60, ' cycles', function (value) { patchData({ testCycles: value }); }) : null,
              testType === 'cycles' ? rangeControl('wheel-fire-test-drying', 'Drying severity', cycleDryingRate, 5, 100, ' %', function (value) { patchData({ testCycleDryingRate: value }); }) : null,
              testType === 'cycles' ? rangeControl('wheel-fire-test-cycle-temp', 'Cycle temperature swing', cycleTemperatureDelta, 10, 220, ' C', function (value) { patchData({ testCycleTemperatureDelta: value }); }) : null,
              testType === 'cycles' ? h('p', { className: 'text-xs text-slate-600' }, 'This compares repeated filling, drying, and thermal/environmental stress. Adjust the protocol to compare gentle and harsh reuse conditions. It does not simulate microbes, food chemistry, or real fracture mechanics.') : null,
              h('label', { htmlFor: 'wheel-fire-test-observation', className: 'block text-xs font-bold text-slate-700' }, 'Observed note (optional)', h('textarea', { id: 'wheel-fire-test-observation', rows: 3, maxLength: 240, value: data.testObservation || '', onChange: function (event) { patchData({ testObservation: event.target.value }); }, placeholder: 'Record what you actually saw, measured, or noticed. Keep it separate from the model result.', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal bg-white' })),
              h('p', { className: 'text-[11px] text-slate-600' }, 'Field notes document an observation; they do not validate the model or establish safe use.'),
              h('button', { type: 'button', disabled: !preview.ready, onClick: runPerformanceTest, className: 'w-full rounded-lg bg-blue-800 text-white px-3 py-2 text-xs font-black disabled:opacity-40' }, 'Run and log ' + labels[testType].toLowerCase()),
              h('p', { className: 'text-[11px] text-slate-600' }, preview.ready ? 'Change one variable or load another fired piece, then repeat the same test.' : 'Complete at least a bisque firing before testing.')
            ),
            h('div', null, resultMetrics(), cycleSensitivityExplainer(), cycleSensitivitySweep(), sensitivityEvidenceLog(), cycleProgression(), cycleProtocolComparison(), cycleProtocolShelf())
          ),
          performanceLog.length ? h('div', { className: 'overflow-x-auto rounded-xl border border-blue-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-blue-950' }, 'Performance evidence log'),
              h('thead', null, h('tr', { className: 'bg-blue-50' }, ['Test', 'Stage', 'Clay', 'Score', 'Porosity', 'Integrity', 'Result', 'Observation'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-blue-200' }, label); }))),
              h('tbody', null, performanceLog.map(function (entry) { var entryBody = materialProfile({ clayBody: entry.clayBody, materialRecipe: entry.materialRecipe }); return h('tr', { key: entry.id }, h('td', { className: 'p-2 border-b' }, entry.label), h('td', { className: 'p-2 border-b' }, entry.stage), h('td', { className: 'p-2 border-b' }, entryBody.name), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.score, 0)) + '/100'), h('td', { className: 'p-2 border-b' }, finite(entry.porosityPct, 0).toFixed(1) + '%'), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.integrityPct, 0)) + '%'), h('td', { className: 'p-2 border-b' }, entry.status), h('td', { className: 'p-2 border-b max-w-xs' }, entry.observation || 'No field note')); }))
            )
          ) : null
        );
      }
      function journalPanel() {
        var saved = copyArray(data.gallery);
        var journalRecipe = normalizeRecipe(vessel.materialRecipe);
        var journalModelSettings = currentDimensionSettings();
        var journalTargets = { heightCm: data.dimensionTargetHeight, diameterCm: data.dimensionTargetDiameter, capacityMl: data.dimensionTargetCapacity, minWallCm: data.dimensionTargetMinWall };
        var journalTargetCount = Object.keys(journalTargets).filter(function (key) { return journalTargets[key] !== '' && journalTargets[key] !== null && journalTargets[key] !== undefined && Number(journalTargets[key]) > 0; }).length;
        function loadJournalEntry(entry) {
          var extra = { method: entry.method, studyLabel: entry.studyLabel || '', performanceLog: copyArray(entry.performanceTests), materialScenarios: copyArray(entry.materialScenarios), firingSchedules: copyArray(entry.firingSchedules), cycleProtocols: copyArray(entry.cycleProtocols), sensitivityLog: copyArray(entry.sensitivityStudies), dimensionMeasurementLog: copyArray(entry.dimensionMeasurements), recipeDraft: normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe)) };
          var recordedSettings = entry.modelSettings ? dimensionModelSettings(entry.modelSettings) : null;
          if (recordedSettings) {
            extra.humidity = recordedSettings.humidity;
            extra.dryingRate = recordedSettings.dryingRate;
            extra.kilnTemp = recordedSettings.temperature;
            extra.ramp = recordedSettings.ramp;
            extra.soak = recordedSettings.soak;
            extra.coolingRate = recordedSettings.coolingRate;
            extra.kilnType = recordedSettings.kilnType;
            extra.atmosphere = recordedSettings.atmosphere;
          }
          var targets = entry.dimensionTargets || {};
          extra.dimensionTargetHeight = targets.heightCm === undefined ? '' : targets.heightCm;
          extra.dimensionTargetDiameter = targets.diameterCm === undefined ? '' : targets.diameterCm;
          extra.dimensionTargetCapacity = targets.capacityMl === undefined ? '' : targets.capacityMl;
          extra.dimensionTargetMinWall = targets.minWallCm === undefined ? '' : targets.minWallCm;
          commitVessel(copyVessel(entry.vessel), entry.name + ' loaded from the journal.', extra);
        }
        function savePiece() {
          var name = String(data.pieceName || '').trim().slice(0, 48);
          if (!name) { announce('Name the piece before saving it.'); return; }
          var entry = { id: Date.now(), name: name, vessel: copyVessel(vessel), materialRecipe: normalizeRecipe(vessel.materialRecipe), materialScenarios: copyArray(data.materialScenarios).slice(0, 8), firingSchedules: copyArray(data.firingSchedules).slice(0, 8), cycleProtocols: copyArray(data.cycleProtocols).slice(0, 8), sensitivityStudies: copyArray(data.sensitivityLog).slice(0, 8), dimensionMeasurements: copyArray(data.dimensionMeasurementLog).slice(0, 12), dimensionTargets: journalTargets, modelVersion: DIMENSION_MODEL_VERSION, modelSettings: journalModelSettings, method: method, studyLabel: data.studyLabel || '', statement: data.artistStatement || '', performanceTests: copyArray(data.performanceLog).slice(0, 4), savedAt: new Date().toISOString() };
          patchData({ gallery: [entry].concat(saved).slice(0, 8), pieceName: '' });
          announce(name + ' saved to the pottery journal.');
        }
        return h('section', { id: 'wheel-fire-panel-journal', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-journal', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-emerald-300 bg-emerald-50 p-4' },
            h('h2', { className: 'text-xl font-black text-emerald-950' }, 'Studio journal & gallery'),
            h('p', { className: 'text-sm text-emerald-950 mt-1' }, 'Record process, evidence, cultural credit, and artistic intent—not just the finished silhouette.')
          ),
          h('div', { className: 'grid md:grid-cols-2 gap-3' },
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3 space-y-3' },
              h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Piece name', h('input', { value: data.pieceName || '', maxLength: 48, onChange: function (event) { patchData({ pieceName: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2' })),
              h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Artist statement and process reflection', h('textarea', { rows: 6, value: data.artistStatement || '', onChange: function (event) { patchData({ artistStatement: event.target.value }); }, placeholder: 'What did you intend? Which material evidence changed your decisions? If you studied a named tradition, how will you credit it without claiming authenticity?', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal' })),
              h('button', { type: 'button', onClick: savePiece, className: 'rounded-lg bg-emerald-800 text-white px-3 py-2 text-xs font-black' }, 'Save this process record')
            ),
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900' }, 'Current record'),
              h('dl', { className: 'grid grid-cols-2 gap-2 text-xs mt-2' },
                h('div', null, h('dt', { className: 'font-bold' }, 'Form'), h('dd', null, stats.shape)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Method'), h('dd', null, method)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Stage'), h('dd', null, vessel.stage)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Stability'), h('dd', null, percent(stats.stability))),
                h('div', null, h('dt', { className: 'font-bold' }, 'Clay'), h('dd', null, materialProfile(vessel).name)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Recipe study'), h('dd', null, journalRecipe ? (journalRecipe.label || 'Unnamed assumptions') : 'Named body baseline')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Study credit'), h('dd', null, data.studyLabel || 'Original studio exploration')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Function tests'), h('dd', null, copyArray(data.performanceLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Saved scenarios'), h('dd', null, copyArray(data.materialScenarios).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Firing schedules'), h('dd', null, copyArray(data.firingSchedules).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Reuse protocols'), h('dd', null, copyArray(data.cycleProtocols).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Sensitivity studies'), h('dd', null, copyArray(data.sensitivityLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Dimensional measurements'), h('dd', null, copyArray(data.dimensionMeasurementLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Dimensional targets'), h('dd', null, journalTargetCount)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Model provenance'), h('dd', null, 'v' + journalModelSettings.modelVersion + ' · current controls'))
              )
            )
          ),
          saved.length ? h('div', { className: 'wheel-fire-culture-grid' }, saved.map(function (entry) {
            var entryStats = analyzeVessel(entry.vessel, { rpm: 0 });
            var entryRecipe = normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe));
            var entryContext = compareDimensionModelSettings(entry.modelSettings, journalModelSettings);
            return h('article', { key: entry.id, className: 'rounded-xl border border-emerald-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900' }, entry.name),
              h('p', { className: 'text-[11px] text-slate-600' }, entry.vessel.stage + ' · ' + entryStats.shape + ' · ' + entry.method),
              entryRecipe ? h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: ' + (entryRecipe.label || 'Unnamed recipe study')) : h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: Named body baseline'),
              entry.studyLabel ? h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, 'Process credit: ' + entry.studyLabel) : null,
              copyArray(entry.materialScenarios).length ? h('p', { className: 'text-[11px] font-bold text-indigo-800 mt-1' }, copyArray(entry.materialScenarios).length + ' saved material scenario' + (copyArray(entry.materialScenarios).length === 1 ? '' : 's')) : null,
              copyArray(entry.firingSchedules).length ? h('p', { className: 'text-[11px] font-bold text-orange-800 mt-1' }, copyArray(entry.firingSchedules).length + ' saved firing schedule' + (copyArray(entry.firingSchedules).length === 1 ? '' : 's')) : null,
              copyArray(entry.cycleProtocols).length ? h('p', { className: 'text-[11px] font-bold text-violet-800 mt-1' }, copyArray(entry.cycleProtocols).length + ' saved reuse protocol' + (copyArray(entry.cycleProtocols).length === 1 ? '' : 's')) : null,
              copyArray(entry.sensitivityStudies).length ? h('p', { className: 'text-[11px] font-bold text-cyan-800 mt-1' }, copyArray(entry.sensitivityStudies).length + ' saved sensitivity stud' + (copyArray(entry.sensitivityStudies).length === 1 ? 'y' : 'ies')) : null,
              copyArray(entry.dimensionMeasurements).length ? h('p', { className: 'text-[11px] font-bold text-indigo-800 mt-1' }, copyArray(entry.dimensionMeasurements).length + ' measured checkpoint' + (copyArray(entry.dimensionMeasurements).length === 1 ? '' : 's')) : null,
              h('p', { className: 'text-[11px] font-bold ' + (entryContext.status === 'current' ? 'text-emerald-800' : 'text-amber-800') + ' mt-1' }, 'Model context: ' + (entryContext.status === 'current' ? 'matches current controls' : (entryContext.status === 'stale' ? 'needs review — controls changed' : (entryContext.status === 'incomplete' ? 'incomplete — review before comparing' : 'legacy — no context stored')))),
              copyArray(entry.performanceTests).length ? h('p', { className: 'text-[11px] font-bold text-blue-800 mt-1' }, copyArray(entry.performanceTests).length + ' saved function test' + (copyArray(entry.performanceTests).length === 1 ? '' : 's')) : null,
              entry.statement ? h('p', { className: 'text-xs text-slate-700 mt-2' }, entry.statement) : null,
              h('div', { className: 'flex gap-2 mt-3' },
                h('button', { type: 'button', onClick: function () { loadJournalEntry(entry); }, className: 'rounded-lg border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-900' }, 'Load'),
                h('button', { type: 'button', onClick: function () { patchData({ gallery: saved.filter(function (piece) { return piece.id !== entry.id; }) }); announce(entry.name + ' removed from the journal.'); }, className: 'rounded-lg border border-red-300 px-2 py-1 text-xs font-bold text-red-800' }, 'Delete')
              )
            );
          })) : h('p', { className: 'rounded-xl border border-dashed border-slate-400 p-5 text-center text-sm text-slate-600' }, 'Saved process records will appear here.')
        );
      }

      return h('div', { className: 'wheel-fire-shell space-y-3 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 p-3 sm:p-4', 'data-wheel-fire-lab': 'true' },
        h('header', { className: 'rounded-2xl bg-[#3d251d] text-amber-50 p-4 shadow-lg' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null, h('h1', { className: 'text-2xl font-black' }, '🏺 Wheel & Fire'), h('p', { className: 'font-bold text-amber-200' }, 'Pottery Lab · material science, cultural context, and creative practice')),
            h('div', { className: 'rounded-xl bg-black/25 border border-amber-200/30 px-3 py-2 text-xs' }, h('strong', null, materialProfile(vessel).name), ' · ', vessel.stage, ' · ', stats.status)
          ),
          h('div', { className: 'mt-3' }, stageStrip())
        ),
        h('nav', { role: 'tablist', 'aria-label': 'Wheel and Fire sections', className: 'flex flex-wrap gap-2 rounded-xl border border-amber-300 bg-white p-2' },
          tabButton('shape', 'Shape', '🏺'),
          tabButton('science', 'Clay science', '⚖️'),
          tabButton('traditions', 'Ways of making', '🌍'),
          tabButton('kiln', 'Dry & fire', '🔥'),
          tabButton('performance', 'Use tests', '🧪'),
          tabButton('journal', 'Journal', '📓')
        ),
        view === 'shape' ? shapePanel() : null,
        view === 'science' ? sciencePanel() : null,
        view === 'traditions' ? traditionsPanel() : null,
        view === 'kiln' ? kilnPanel() : null,
        view === 'performance' ? performancePanel() : null,
        view === 'journal' ? journalPanel() : null,
        h('div', { id: 'wheel-fire-live-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700' },
          'Stage ' + vessel.stage + '. ' + Math.round(stats.stability) + '% stability. ' + Math.round(stats.uniformity) + '% wall uniformity. ' + vessel.lastOutcome
        )
      );
    }
  });
})();
