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
  function estimateFiredPorosity(bodyOrId, effectiveTemp, kilnType) {
    var body = typeof bodyOrId === 'string' ? clayBody(bodyOrId) : (bodyOrId || CLAY_BODIES.stoneware);
    var maturation = clamp((finite(effectiveTemp, 950) - (body.maturity - 210)) / 210, 0, 1);
    var openPenalty = kilnType === 'open' ? 0.035 : 0;
    return {
      maturation: maturation,
      porosity: clamp(body.porosity + (1 - maturation) * 0.18 + openPenalty, 0.005, 0.42)
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
  function dryVessel(vessel, settings) {
    var next = normalizeVessel(vessel);
    if (next.stage !== 'wet' && next.stage !== 'leather-hard') return next;
    settings = settings || {};
    var humidity = clamp(finite(settings.humidity, 45), 10, 95) / 100;
    var dryingRate = clamp(finite(settings.dryingRate, 48), 0, 100) / 100;
    var stats = analyzeVessel(next, settings);
    var body = materialProfile(next);
    var stepShrink = body.shrinkage * (next.stage === 'wet' ? 0.28 : 0.24);
    scaleVessel(next, 1 - stepShrink);
    var crackRisk = clamp((100 - stats.uniformity) / 100 * 0.34 + dryingRate * 0.28 + (1 - humidity) * 0.18 + Math.max(0, stats.maxWallCm - 2.2) * 0.08 + (1 - next.compression) * 0.12 + (1 - next.coilBond) * 0.22, 0, 1);
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
    next.defects = defects.filter(function (value, index, array) { return array.indexOf(value) === index; });
    next.firingLog.push({ stage: next.stage, temperature: Math.round(target), effectiveTemperature: Math.round(heatwork.effectiveTemp), cone: heatwork.cone, ramp: Math.round(ramp), soak: Math.round(soak), coolingRate: Math.round(coolingRate), kilnType: kilnType, atmosphere: atmosphere, materialRecipe: normalizeRecipe(next.materialRecipe), maturation: next.maturation, porosity: next.firedPorosity, defects: copyArray(next.defects) });
    next.lastOutcome = outcome.join(' ') + (next.defects.length ? ' Inspect: ' + next.defects.join(', ') + '.' : ' No modeled defects were triggered.');
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
  function evaluateVesselUse(vessel, testType, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    testType = ['water', 'thermal', 'load', 'permeability'].indexOf(testType) >= 0 ? testType : 'water';
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
    var permeabilityIndex = clamp(effectivePorosity * 265 + defectPenalty * 28, 0, 100);
    return Object.assign(base, { permeabilityIndex: permeabilityIndex, score: 100 - permeabilityIndex, status: permeabilityIndex < 22 ? 'Low permeability proxy' : (permeabilityIndex < 62 ? 'Moderate permeability proxy' : 'High permeability proxy'), summary: 'Modeled permeability index ' + Math.round(permeabilityIndex) + '/100. This is a comparative material proxy, not a food-storage or fermentation safety determination.' });
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
    STAGES: STAGES.slice(),
    CLAY_BODIES: CLAY_BODIES,
    GLAZES: GLAZES,
    CULTURAL_STUDIES: CULTURAL_STUDIES,
    makeVessel: makeVessel,
    normalizeVessel: normalizeVessel,
    normalizeRecipe: normalizeRecipe,
    materialProfile: materialProfile,
    vesselVolume: vesselVolume,
    vesselCapacity: vesselCapacity,
    estimateHeatwork: estimateHeatwork,
    estimateFiredPorosity: estimateFiredPorosity,
    compareMaterialProfiles: compareMaterialProfiles,
    analyzeVessel: analyzeVessel,
    applyTool: applyTool,
    dryVessel: dryVessel,
    fireVessel: fireVessel,
    glazeVessel: glazeVessel,
    evaluateVesselUse: evaluateVesselUse,
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
        function signed(value, digits) { var rounded = Number(value).toFixed(digits); return (value >= 0 ? '+' : '') + rounded; }
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
        var glazeId = data.glazeId || 'clear';
        var glazeThickness = clamp(finite(data.glazeThickness, 50), 5, 100);
        var heatwork = estimateHeatwork({ temperature: kilnTemp, ramp: ramp, soak: soak });
        var projectedFiring = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
        function advanceDrying() { var next = dryVessel(vessel, { humidity: humidity, dryingRate: dryingRate }); commitVessel(next, next.lastOutcome); }
        function fire() { var next = fireVessel(vessel, { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere }); commitVessel(next, next.lastOutcome); }
        function applyGlaze() { var next = glazeVessel(vessel, glazeId, glazeThickness); commitVessel(next, next.lastOutcome); }
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
              firingCurve(),
              vessel.stage === 'bone-dry' ? h('button', { type: 'button', onClick: fire, className: 'w-full rounded-lg bg-orange-800 text-white px-3 py-2 text-xs font-black' }, 'Run bisque firing') : null,
              vessel.stage === 'glazed' ? h('button', { type: 'button', onClick: fire, className: 'w-full rounded-lg bg-red-700 text-white px-3 py-2 text-xs font-black' }, 'Run glaze firing') : null
            )
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
          vessel.firingLog.length ? h('div', { className: 'overflow-x-auto rounded-xl border border-orange-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-orange-950' }, 'Firing evidence log'),
              h('thead', null, h('tr', { className: 'bg-orange-50' }, ['Stage', 'Target', 'Heatwork', 'Cone', 'Soak', 'Cooling', 'Atmosphere', 'Observed model flags'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-orange-200' }, label); }))),
              h('tbody', null, vessel.firingLog.map(function (entry, index) { return h('tr', { key: entry.stage + '-' + index },
                h('td', { className: 'p-2 border-b' }, entry.stage),
                h('td', { className: 'p-2 border-b' }, finite(entry.temperature, 0) + '°C'),
                h('td', { className: 'p-2 border-b' }, finite(entry.effectiveTemperature, entry.temperature) + '°C eq.'),
                h('td', { className: 'p-2 border-b' }, entry.cone || '—'),
                h('td', { className: 'p-2 border-b' }, finite(entry.soak, 0) + ' min'),
                h('td', { className: 'p-2 border-b' }, finite(entry.coolingRate, 0) + '°C/h'),
                h('td', { className: 'p-2 border-b' }, entry.atmosphere || '—'),
                h('td', { className: 'p-2 border-b' }, copyArray(entry.defects).length ? copyArray(entry.defects).join(', ') : 'none')
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
        var testSettings = { durationHours: durationHours, temperatureDelta: temperatureDelta, loadKg: loadKg };
        var preview = evaluateVesselUse(vessel, testType, testSettings);
        var performanceLog = copyArray(data.performanceLog);
        var labels = { water: 'Water retention', thermal: 'Thermal change', load: 'Static load', permeability: 'Permeability proxy' };
        function runPerformanceTest() {
          if (!preview.ready) { announce('Fire the piece before running a function test.'); return; }
          var entry = Object.assign({ id: Date.now(), label: labels[testType], stage: vessel.stage, clayBody: vessel.clayBody, materialRecipe: normalizeRecipe(vessel.materialRecipe) }, preview);
          patchData({ performanceLog: [entry].concat(performanceLog).slice(0, 12) });
          announce(labels[testType] + ' simulation logged. ' + preview.status + '.');
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
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'wheel-fire-stats' }, cards),
            h('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-950' }, h('strong', null, preview.status + ': '), preview.summary)
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
              h('button', { type: 'button', disabled: !preview.ready, onClick: runPerformanceTest, className: 'w-full rounded-lg bg-blue-800 text-white px-3 py-2 text-xs font-black disabled:opacity-40' }, 'Run and log ' + labels[testType].toLowerCase()),
              h('p', { className: 'text-[11px] text-slate-600' }, preview.ready ? 'Change one variable or load another fired piece, then repeat the same test.' : 'Complete at least a bisque firing before testing.')
            ),
            h('div', null, resultMetrics())
          ),
          performanceLog.length ? h('div', { className: 'overflow-x-auto rounded-xl border border-blue-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-blue-950' }, 'Performance evidence log'),
              h('thead', null, h('tr', { className: 'bg-blue-50' }, ['Test', 'Stage', 'Clay', 'Score', 'Porosity', 'Integrity', 'Result'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-blue-200' }, label); }))),
              h('tbody', null, performanceLog.map(function (entry) { var entryBody = materialProfile({ clayBody: entry.clayBody, materialRecipe: entry.materialRecipe }); return h('tr', { key: entry.id }, h('td', { className: 'p-2 border-b' }, entry.label), h('td', { className: 'p-2 border-b' }, entry.stage), h('td', { className: 'p-2 border-b' }, entryBody.name), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.score, 0)) + '/100'), h('td', { className: 'p-2 border-b' }, finite(entry.porosityPct, 0).toFixed(1) + '%'), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.integrityPct, 0)) + '%'), h('td', { className: 'p-2 border-b' }, entry.status)); }))
            )
          ) : null
        );
      }
      function journalPanel() {
        var saved = copyArray(data.gallery);
        var journalRecipe = normalizeRecipe(vessel.materialRecipe);
        function savePiece() {
          var name = String(data.pieceName || '').trim().slice(0, 48);
          if (!name) { announce('Name the piece before saving it.'); return; }
          var entry = { id: Date.now(), name: name, vessel: copyVessel(vessel), materialRecipe: normalizeRecipe(vessel.materialRecipe), materialScenarios: copyArray(data.materialScenarios).slice(0, 8), method: method, studyLabel: data.studyLabel || '', statement: data.artistStatement || '', performanceTests: copyArray(data.performanceLog).slice(0, 4), savedAt: new Date().toISOString() };
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
                h('div', null, h('dt', { className: 'font-bold' }, 'Saved scenarios'), h('dd', null, copyArray(data.materialScenarios).length))
              )
            )
          ),
          saved.length ? h('div', { className: 'wheel-fire-culture-grid' }, saved.map(function (entry) {
            var entryStats = analyzeVessel(entry.vessel, { rpm: 0 });
            var entryRecipe = normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe));
            return h('article', { key: entry.id, className: 'rounded-xl border border-emerald-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900' }, entry.name),
              h('p', { className: 'text-[11px] text-slate-600' }, entry.vessel.stage + ' · ' + entryStats.shape + ' · ' + entry.method),
              entryRecipe ? h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: ' + (entryRecipe.label || 'Unnamed recipe study')) : h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: Named body baseline'),
              entry.studyLabel ? h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, 'Process credit: ' + entry.studyLabel) : null,
              copyArray(entry.materialScenarios).length ? h('p', { className: 'text-[11px] font-bold text-indigo-800 mt-1' }, copyArray(entry.materialScenarios).length + ' saved material scenario' + (copyArray(entry.materialScenarios).length === 1 ? '' : 's')) : null,
              copyArray(entry.performanceTests).length ? h('p', { className: 'text-[11px] font-bold text-blue-800 mt-1' }, copyArray(entry.performanceTests).length + ' saved function test' + (copyArray(entry.performanceTests).length === 1 ? '' : 's')) : null,
              entry.statement ? h('p', { className: 'text-xs text-slate-700 mt-2' }, entry.statement) : null,
              h('div', { className: 'flex gap-2 mt-3' },
                h('button', { type: 'button', onClick: function () { commitVessel(copyVessel(entry.vessel), entry.name + ' loaded from the journal.', { method: entry.method, studyLabel: entry.studyLabel || '', performanceLog: copyArray(entry.performanceTests), materialScenarios: copyArray(entry.materialScenarios), recipeDraft: normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe)) }); }, className: 'rounded-lg border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-900' }, 'Load'),
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
