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
      '.wheel-fire-shell[data-experience-mode="guided"] .wheel-fire-advanced{display:none!important}',
      '.wheel-fire-shell:not([data-experience-mode="research"]) .wheel-fire-research-only{display:none!important}',
      '.wheel-fire-spin{transform-origin:center;animation:wheelFireSpin 1.4s linear infinite}',
      '.wheel-fire-wheel-motion{animation:wheelFireDash 1s linear infinite}',
      '.wheel-fire-wobble-motion{animation:wheelFireWobble 1.2s linear infinite;transform-box:fill-box;transform-origin:center}',
      '.wheel-fire-flame-motion{animation:wheelFireFlame 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom}',
      '.wheel-fire-flow-motion{animation:wheelFireFlow 1.6s linear infinite}',
      '.wheel-fire-heat-pulse{animation:wheelFireHeat 2.4s ease-in-out infinite}',
      '@keyframes wheelFireSpin{to{transform:rotate(360deg)}}',
      '@keyframes wheelFireDash{to{stroke-dashoffset:var(--wheel-fire-orbit-shift,-420)}}',
      '@keyframes wheelFireWobble{0%,100%{transform:translate(var(--wheel-fire-wobble,0px),0px)}12.5%{transform:translate(var(--wheel-fire-wobble-diag,0px),var(--wheel-fire-wobble-depth-diag,0px))}25%{transform:translate(0px,var(--wheel-fire-wobble-depth,0px))}37.5%{transform:translate(var(--wheel-fire-wobble-diag-neg,0px),var(--wheel-fire-wobble-depth-diag,0px))}50%{transform:translate(var(--wheel-fire-wobble-neg,0px),0px)}62.5%{transform:translate(var(--wheel-fire-wobble-diag-neg,0px),var(--wheel-fire-wobble-depth-diag-neg,0px))}75%{transform:translate(0px,var(--wheel-fire-wobble-depth-neg,0px))}87.5%{transform:translate(var(--wheel-fire-wobble-diag,0px),var(--wheel-fire-wobble-depth-diag-neg,0px))}}',
      '@keyframes wheelFireFlame{50%{transform:scaleY(.9) translateY(2px);opacity:.75}}',
      '@keyframes wheelFireFlow{to{stroke-dashoffset:-40}}',
      '@keyframes wheelFireHeat{50%{opacity:.68}}',
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
  var MEASUREMENT_METHODS = [
    { id: 'calipers', label: 'Calipers / diameter gauge' },
    { id: 'ruler', label: 'Ruler or flexible tape' },
    { id: 'water-fill', label: 'Water fill / graduated volume' },
    { id: 'scale', label: 'Scale + volume estimate' },
    { id: 'profile', label: 'Profile template / visual estimate' },
    { id: 'mixed', label: 'Mixed methods (describe in note)' }
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
  function analyzeOpeningFloor(vessel) {
    vessel = normalizeVessel(vessel);
    var cavityThresholdCm = .6;
    var floorRing = RING_COUNT;
    var floorInnerRadiusCm = 0;
    for (var i = 1; i < RING_COUNT; i++) {
      var innerRadius = Math.max(0, vessel.radii[i] - vessel.thickness[i]);
      if (innerRadius >= cavityThresholdCm) {
        floorRing = i;
        floorInnerRadiusCm = innerRadius;
        break;
      }
    }
    var hasCavity = floorRing < RING_COUNT;
    var ringHeightCm = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var floorThicknessCm = hasCavity ? floorRing * ringHeightCm : vessel.heightCm;
    var cavityDepthCm = hasCavity ? Math.max(0, vessel.heightCm - floorThicknessCm) : 0;
    var targetRing = hasCavity ? floorRing : Math.round((RING_COUNT - 1) * .42);
    var state = !hasCavity ? 'solid-blank' : (floorRing <= 1 ? 'puncture-risk' : (floorThicknessCm < .65 ? 'thin-floor' : (floorThicknessCm <= 1.6 ? 'working-floor' : 'thick-floor')));
    var label = state === 'solid-blank' ? 'solid blank' : (state === 'puncture-risk' ? 'base puncture risk' : (state === 'thin-floor' ? 'thin modeled floor' : (state === 'working-floor' ? 'moderate modeled floor' : 'thick modeled floor')));
    var summary = state === 'solid-blank'
      ? 'No cavity wider than ' + cavityThresholdCm.toFixed(1) + ' cm is detected, so the model treats the blank as solid and suggests opening near ring ' + (targetRing + 1) + '.'
      : (state === 'puncture-risk'
        ? 'The cavity reaches ring ' + (floorRing + 1) + ', leaving only one modeled vertical interval beneath it; another deep opening pass can behave like a base puncture.'
        : 'The cavity begins at ring ' + (floorRing + 1) + ', leaving a ' + floorThicknessCm.toFixed(2) + ' cm modeled floor and a ' + cavityDepthCm.toFixed(2) + ' cm cavity depth.');
    return {
      state: state,
      label: label,
      hasCavity: hasCavity,
      cavityThresholdCm: cavityThresholdCm,
      floorRing: floorRing,
      targetRing: targetRing,
      ringHeightCm: ringHeightCm,
      floorThicknessCm: floorThicknessCm,
      cavityDepthCm: cavityDepthCm,
      floorInnerRadiusCm: floorInnerRadiusCm,
      summary: summary,
      note: 'Floor thickness is a vertical ring-resolution proxy derived from the first cavity ring, not a measured base thickness, wall section, or safe studio instruction.'
    };
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
  var PYROMETRIC_CONES = [
    { label: '010', slowC: 891, mediumC: 903, fastC: 915, temperature: 903 },
    { label: '09', slowC: 907, mediumC: 920, fastC: 930, temperature: 920 },
    { label: '08', slowC: 922, mediumC: 942, fastC: 956, temperature: 942 },
    { label: '07', slowC: 962, mediumC: 976, fastC: 987, temperature: 976 },
    { label: '06', slowC: 981, mediumC: 998, fastC: 1013, temperature: 998 },
    { label: '05', slowC: 1021, mediumC: 1031, fastC: 1044, temperature: 1031 },
    { label: '04', slowC: 1046, mediumC: 1063, fastC: 1077, temperature: 1063 },
    { label: '03', slowC: 1071, mediumC: 1086, fastC: 1104, temperature: 1086 },
    { label: '02', slowC: 1078, mediumC: 1102, fastC: 1122, temperature: 1102 },
    { label: '01', slowC: 1093, mediumC: 1119, fastC: 1138, temperature: 1119 },
    { label: '1', slowC: 1109, mediumC: 1137, fastC: 1154, temperature: 1137 },
    { label: '2', slowC: 1112, mediumC: 1142, fastC: 1164, temperature: 1142 },
    { label: '3', slowC: 1115, mediumC: 1152, fastC: 1170, temperature: 1152 },
    { label: '4', slowC: 1141, mediumC: 1162, fastC: 1183, temperature: 1162 },
    { label: '5', slowC: 1159, mediumC: 1186, fastC: 1207, temperature: 1186 },
    { label: '6', slowC: 1185, mediumC: 1222, fastC: 1243, temperature: 1222 },
    { label: '7', slowC: 1201, mediumC: 1239, fastC: 1257, temperature: 1239 },
    { label: '8', slowC: 1211, mediumC: 1249, fastC: 1271, temperature: 1249 },
    { label: '9', slowC: 1224, mediumC: 1260, fastC: 1280, temperature: 1260 },
    { label: '10', slowC: 1251, mediumC: 1285, fastC: 1305, temperature: 1285 }
  ];
  var WITNESS_CONE_MOUNT_ANGLE_DEGREES = 8;
  function coneReferenceRamp(ramp) {
    var requestedRamp = clamp(finite(ramp, 60), 15, 300);
    return [15, 60, 150].reduce(function (nearest, candidate) { return Math.abs(candidate - requestedRamp) < Math.abs(nearest - requestedRamp) ? candidate : nearest; }, 15);
  }
  function coneReferenceTemperature(cone, ramp) {
    cone = cone || PYROMETRIC_CONES[0];
    var referenceRamp = coneReferenceRamp(ramp);
    return referenceRamp === 15 ? cone.slowC : (referenceRamp === 60 ? cone.mediumC : cone.fastC);
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
    var coneHeatworkTemperature = clamp(target + soakGain, 600, 1375);
    var cones = PYROMETRIC_CONES;
    var nearest = cones[0];
    for (var i = 1; i < cones.length; i++) if (Math.abs(coneReferenceTemperature(cones[i], ramp) - coneHeatworkTemperature) < Math.abs(coneReferenceTemperature(nearest, ramp) - coneHeatworkTemperature)) nearest = cones[i];
    return { target: target, ramp: ramp, soak: soak, effectiveTemp: effectiveTemp, coneHeatworkTemperature: coneHeatworkTemperature, cone: nearest.label, coneTemperature: coneReferenceTemperature(nearest, ramp), coneIndex: cones.indexOf(nearest), referenceRampCPerHour: coneReferenceRamp(ramp) };
  }
  function estimateWitnessConePack(settings) {
    settings = settings || {};
    var ramp = clamp(finite(settings.ramp, 110), 30, 300);
    var targetTemperature = clamp(finite(settings.targetTemperature, finite(settings.temperature, 950)), 600, 1350);
    var targetSoak = clamp(finite(settings.targetSoak, finite(settings.soak, 10)), 0, 90);
    var observedTemperature = clamp(finite(settings.observedTemperature, targetTemperature), 600, 1350);
    var observedSoak = clamp(finite(settings.observedSoak, targetSoak), 0, 90);
    var targetHeatwork = estimateHeatwork({ temperature: targetTemperature, ramp: ramp, soak: targetSoak });
    var observedHeatwork = estimateHeatwork({ temperature: observedTemperature, ramp: ramp, soak: observedSoak });
    var requestedTarget = String(settings.targetCone || targetHeatwork.cone);
    var targetIndex = PYROMETRIC_CONES.findIndex(function (cone) { return cone.label === requestedTarget; });
    if (targetIndex < 0) targetIndex = targetHeatwork.coneIndex;
    function coneState(bendDegrees) {
      return bendDegrees < 5 ? 'standing' : (bendDegrees < 25 ? 'softening' : (bendDegrees <= 75 ? 'bending' : (bendDegrees < 88 ? 'strong bend' : 'fully down')));
    }
    function roleCone(role, offset) {
      var coneIndex = Math.max(0, Math.min(PYROMETRIC_CONES.length - 1, targetIndex + offset));
      var cone = PYROMETRIC_CONES[coneIndex];
      var previous = PYROMETRIC_CONES[Math.max(0, coneIndex - 1)];
      var next = PYROMETRIC_CONES[Math.min(PYROMETRIC_CONES.length - 1, coneIndex + 1)];
      var coneTemperature = coneReferenceTemperature(cone, ramp);
      var previousTemperature = coneReferenceTemperature(previous, ramp);
      var nextTemperature = coneReferenceTemperature(next, ramp);
      var lowerGap = coneIndex > 0 ? coneTemperature - previousTemperature : nextTemperature - coneTemperature;
      var upperGap = coneIndex < PYROMETRIC_CONES.length - 1 ? nextTemperature - coneTemperature : lowerGap;
      var bendWindowC = clamp((lowerGap + upperGap) / 2 * 1.3, 24, 48);
      var bendDegrees = clamp((observedHeatwork.coneHeatworkTemperature - (coneTemperature - bendWindowC / 2)) / bendWindowC, 0, 1) * 90;
      return {
        role: role,
        label: cone.label,
        referenceTemperature: coneTemperature,
        bendWindowC: bendWindowC,
        bendDegrees: bendDegrees,
        state: coneState(bendDegrees),
        duplicatedAtScaleBoundary: coneIndex === targetIndex && offset !== 0
      };
    }
    var cones = [roleCone('guide', -1), roleCone('firing', 0), roleCone('guard', 1)];
    var firingCone = cones[1];
    var interpretation = firingCone.bendDegrees < 25 ? 'below target range' : (firingCone.bendDegrees <= 75 ? 'target range' : 'above target range');
    var summary = 'Guide cone ' + cones[0].label + ' ' + Math.round(cones[0].bendDegrees) + '°; firing cone ' + cones[1].label + ' ' + Math.round(cones[1].bendDegrees) + '° (' + interpretation + '); guard cone ' + cones[2].label + ' ' + Math.round(cones[2].bendDegrees) + '°.';
    return {
      targetCone: PYROMETRIC_CONES[targetIndex].label,
      targetConeTemperature: coneReferenceTemperature(PYROMETRIC_CONES[targetIndex], ramp),
      referenceRampCPerHour: coneReferenceRamp(ramp),
      observedEffectiveTemperature: observedHeatwork.effectiveTemp,
      targetHeatwork: targetHeatwork,
      observedHeatwork: observedHeatwork,
      cones: cones,
      guideCone: cones[0],
      firingCone: firingCone,
      guardCone: cones[2],
      interpretation: interpretation,
      summary: summary,
      note: 'Comparative three-cone teaching model. Reference endpoints use the closest modeled witness-cone chart column at 15, 60, or 150°C/h, while soak response is simplified; real firings require the correct cone type, mounting, heating-rate chart, witness placement, and bend template.'
    };
  }
  function interpretWitnessConeSequence(pack) {
    pack = pack || {};
    var guide = pack.guideCone || {};
    var firing = pack.firingCone || {};
    var guard = pack.guardCone || {};
    var guideBend = clamp(finite(guide.bendDegrees, 0), 0, 90);
    var firingBend = clamp(finite(firing.bendDegrees, 0), 0, 90);
    var guardBend = clamp(finite(guard.bendDegrees, 0), 0, 90);
    var guideLabel = guide.label || '?';
    var firingLabel = firing.label || '?';
    var guardLabel = guard.label || '?';
    var note = 'Use physical witness cones and the correct measurement template to make real firing decisions.';
    if (guideBend >= 88 && firingBend >= 88 && guardBend >= 88) return { phase: 'saturated', label: 'Pack saturated', summary: 'Guide cone ' + guideLabel + ', firing cone ' + firingLabel + ', and guard cone ' + guardLabel + ' are fully down; this pack cannot resolve how far above its modeled range the heatwork went.', note: note };
    if (guardBend >= 5) return { phase: 'excess', label: 'Excess heatwork', summary: 'Guard cone ' + guardLabel + ' has begun responding after firing cone ' + firingLabel + '; this modeled pack is beyond the target neighborhood.', note: note };
    if (firingBend > 75) return { phase: 'above-target', label: 'Above target band', summary: 'Firing cone ' + firingLabel + ' has passed the 25°–75° target band while guard cone ' + guardLabel + ' still stands.', note: note };
    if (firingBend >= 25) return { phase: 'target', label: 'Target band reached', summary: 'Firing cone ' + firingLabel + ' is within the 25°–75° target band while guard cone ' + guardLabel + ' remains below it.', note: note };
    if (firingBend >= 5) return { phase: 'near-target', label: 'Firing cone softening', summary: 'Firing cone ' + firingLabel + ' has begun bending but has not reached the 25° target-band boundary.', note: note };
    if (guideBend >= 5) return { phase: 'approaching', label: 'Approaching target', summary: 'Guide cone ' + guideLabel + ' has responded while firing cone ' + firingLabel + ' still stands; modeled target heatwork has not been reached.', note: note };
    return { phase: 'not-started', label: 'Not yet readable', summary: 'Guide cone ' + guideLabel + ' is still standing; this pack has not begun recording the target heatwork neighborhood.', note: note };
  }
  function interpretConeHeatworkMemory(settings) {
    settings = settings || {};
    var pack = settings.pack || {};
    var guide = pack.guideCone || {};
    var firing = pack.firingCone || {};
    var segmentId = String(settings.segmentId || 'ramp');
    var currentTemperatureC = clamp(finite(settings.currentTemperatureC, 20), -100, 1800);
    var zoneName = String(settings.zoneName || 'Selected zone');
    var guideLabel = guide.label || '?';
    var firingLabel = firing.label || pack.targetCone || '?';
    var guideBend = clamp(finite(guide.bendDegrees, 0), 0, 90);
    var firingBend = clamp(finite(firing.bendDegrees, 0), 0, 90);
    var temperatureLead = zoneName + ' temperature now is about ' + Math.round(currentTemperatureC) + '°C';
    var note = 'The temperature-now label is a modeled zone estimate; retained cone bend is a heatwork record, not a live thermometer.';
    if (segmentId === 'cool') {
      if (firingBend >= 5) return { state: 'retained', label: 'Heatwork retained', visualLabel: 'retained heatwork', summary: temperatureLead + '; firing cone ' + firingLabel + ' retains its ' + Math.round(firingBend) + '° peak-heatwork bend.', note: note };
      if (guideBend >= 5) return { state: 'retained', label: 'Heatwork retained', visualLabel: 'retained heatwork', summary: temperatureLead + '; guide cone ' + guideLabel + ' retains its ' + Math.round(guideBend) + '° peak-heatwork bend while firing cone ' + firingLabel + ' remains standing.', note: note };
      return { state: 'cooling-unreadable', label: 'No target record', visualLabel: 'pack unreadable', summary: temperatureLead + '; the guide cone still stands, so this modeled target pack never entered its readable range.', note: note };
    }
    if (firingBend >= 5) return { state: 'accumulating-target', label: 'Target cone recording', visualLabel: 'heatwork record', summary: temperatureLead + '; firing cone ' + firingLabel + ' is at ' + Math.round(firingBend) + '° as time and temperature accumulate heatwork.', note: note };
    if (guideBend >= 5) return { state: 'accumulating-guide', label: 'Guide cone recording', visualLabel: 'heatwork record', summary: temperatureLead + '; guide cone ' + guideLabel + ' has begun responding while firing cone ' + firingLabel + ' remains standing.', note: note };
    return { state: 'not-recording', label: 'Before cone response', visualLabel: 'not yet recording', summary: temperatureLead + '; guide cone ' + guideLabel + ' still stands, so the target neighborhood is not yet recorded.', note: note };
  }
  function witnessConeGeometry(bendDegrees, settings) {
    settings = settings || {};
    var bend = clamp(finite(bendDegrees, 0), 0, 90);
    var anchorX = finite(settings.x, 0);
    var baseY = finite(settings.baseY, 0);
    var length = clamp(finite(settings.length, 20), 8, 60);
    var baseWidth = clamp(finite(settings.baseWidth, 10), 4, 24);
    var mountAngleDegrees = clamp(finite(settings.mountAngleDegrees, 0), 0, 30);
    var halfBase = baseWidth / 2;
    var visualAngleDegrees = mountAngleDegrees + bend / 90 * (90 - mountAngleDegrees);
    var mountAngle = mountAngleDegrees * Math.PI / 180;
    var angle = visualAngleDegrees * Math.PI / 180;
    var controlAngle = mountAngle + (angle - mountAngle) * .42;
    var controlLength = length * .56;
    var controlX = anchorX + Math.sin(controlAngle) * controlLength;
    var controlY = baseY - Math.cos(controlAngle) * controlLength;
    var tipX = anchorX + Math.sin(angle) * length;
    var tipY = baseY - Math.cos(angle) * length;
    var midHalfWidth = halfBase * .5;
    var normalX = Math.cos(controlAngle);
    var normalY = Math.sin(controlAngle);
    var leftControlX = controlX - normalX * midHalfWidth;
    var leftControlY = controlY - normalY * midHalfWidth;
    var rightControlX = controlX + normalX * midHalfWidth;
    var rightControlY = controlY + normalY * midHalfWidth;
    function point(x, y) { return x.toFixed(1) + ' ' + y.toFixed(1); }
    var baseLeft = { x: anchorX - halfBase, y: baseY };
    var baseRight = { x: anchorX + halfBase, y: baseY };
    return {
      bendDegrees: bend,
      bendRatio: bend / 90,
      mountAngleDegrees: mountAngleDegrees,
      visualAngleDegrees: visualAngleDegrees,
      baseLeft: baseLeft,
      baseRight: baseRight,
      control: { x: controlX, y: controlY },
      tip: { x: tipX, y: tipY },
      path: 'M' + point(baseLeft.x, baseLeft.y) + ' Q' + point(leftControlX, leftControlY) + ' ' + point(tipX, tipY) + ' Q' + point(rightControlX, rightControlY) + ' ' + point(baseRight.x, baseRight.y) + ' Z',
      centerlinePath: 'M' + point(anchorX, baseY) + ' Q' + point(controlX, controlY) + ' ' + point(tipX, tipY)
    };
  }
  function summarizeWitnessConeZones(packs, zoneNames) {
    packs = Array.isArray(packs) ? packs : [];
    zoneNames = Array.isArray(zoneNames) ? zoneNames : [];
    var zones = packs.map(function (pack, index) {
      if (!pack || !pack.firingCone) return null;
      return {
        index: index,
        name: zoneNames[index] || ('Zone ' + (index + 1)),
        bendDegrees: clamp(finite(pack.firingCone.bendDegrees, 0), 0, 90),
        state: pack.firingCone.state || 'standing',
        interpretation: pack.interpretation || 'below target range'
      };
    }).filter(Boolean);
    var note = 'Cone-angle spread is comparative, not a temperature difference or a kiln-uniformity certification.';
    if (!zones.length) return { zones: [], resolution: 'unavailable', label: 'unavailable', spreadDegrees: 0, targetCount: 0, hottestZone: null, coolestZone: null, summary: 'No modeled witness packs are available for comparison.', note: note };
    var hottestZone = zones.reduce(function (best, zone) { return zone.bendDegrees > best.bendDegrees ? zone : best; }, zones[0]);
    var coolestZone = zones.reduce(function (best, zone) { return zone.bendDegrees < best.bendDegrees ? zone : best; }, zones[0]);
    var spreadDegrees = hottestZone.bendDegrees - coolestZone.bendDegrees;
    var targetCount = zones.filter(function (zone) { return zone.interpretation === 'target range'; }).length;
    if (zones.length < 2) return { zones: zones, resolution: 'one-location', label: 'one location', spreadDegrees: 0, targetCount: targetCount, hottestZone: hottestZone, coolestZone: coolestZone, summary: 'One witness location is modeled; compare packs at multiple physical locations to assess heatwork uniformity.', note: note };
    var allStanding = zones.every(function (zone) { return zone.bendDegrees < 5; });
    var allFullyDown = zones.every(function (zone) { return zone.bendDegrees >= 88; });
    if (allStanding) return { zones: zones, resolution: 'limited-standing', label: 'not yet readable', spreadDegrees: spreadDegrees, targetCount: targetCount, hottestZone: hottestZone, coolestZone: coolestZone, summary: 'All ' + zones.length + ' modeled firing cones are still standing, so zone uniformity is not readable yet.', note: note };
    if (allFullyDown) return { zones: zones, resolution: 'limited-saturated', label: 'saturated', spreadDegrees: spreadDegrees, targetCount: targetCount, hottestZone: hottestZone, coolestZone: coolestZone, summary: 'All ' + zones.length + ' modeled firing cones are fully down, so saturation hides any remaining zone difference.', note: note };
    var targetSummary = targetCount === zones.length ? 'All ' + zones.length + ' zones are in the target bend range.' : (targetCount + ' of ' + zones.length + ' zones ' + (targetCount === 1 ? 'is' : 'are') + ' in the target bend range.');
    var label = spreadDegrees <= 5 ? 'closely matched' : (spreadDegrees <= 20 ? 'noticeable difference' : 'uneven heatwork');
    var summary = spreadDegrees <= 5 ? 'Firing-cone bends are closely matched across ' + zones.length + ' modeled zones; spread is about ' + Math.round(spreadDegrees) + '°. ' + targetSummary : hottestZone.name + ' shows more modeled heatwork than ' + coolestZone.name + '; firing-cone bend differs by about ' + Math.round(spreadDegrees) + '°. ' + targetSummary;
    return { zones: zones, resolution: 'readable', label: label, spreadDegrees: spreadDegrees, targetCount: targetCount, hottestZone: hottestZone, coolestZone: coolestZone, summary: summary, note: note };
  }
  function potteryWheelDriveGeometry(rpm, cameraTilt, settings) {
    settings = settings || {};
    var speedRpm = clamp(finite(rpm, 0), 0, 120);
    var tiltDegrees = clamp(finite(cameraTilt, 42), 20, 70);
    var speedRatio = speedRpm / 120;
    var perspectiveDepth = tiltDegrees / 70;
    var centerX = finite(settings.centerX, 260);
    var wheelheadY = finite(settings.wheelheadY, 415);
    var wheelheadRx = clamp(finite(settings.wheelheadRx, 158), 100, 190);
    var wheelheadRy = 16 + perspectiveDepth * 22;
    var wheelheadThickness = clamp(3 + perspectiveDepth * 3, 4, 6);
    var splashPanRx = wheelheadRx + 38;
    var splashPanRy = wheelheadRy + 9;
    var rotationTrackRx = wheelheadRx - 16;
    var rotationTrackRy = Math.max(8, wheelheadRy - 6);
    var rotationCircumference = Math.PI * (3 * (rotationTrackRx + rotationTrackRy) - Math.sqrt((3 * rotationTrackRx + rotationTrackRy) * (rotationTrackRx + 3 * rotationTrackRy)));
    var registrationArcLength = clamp(rotationCircumference * .045, 18, 28);
    var rotationPeriodSeconds = speedRpm > 0 ? 60 / speedRpm : null;
    var rotationSecondsLabel = rotationPeriodSeconds === null ? null : (rotationPeriodSeconds >= 10 ? rotationPeriodSeconds.toFixed(1) : rotationPeriodSeconds.toFixed(2));
    var rotationPeriodLabel = rotationPeriodSeconds === null ? 'stopped' : rotationSecondsLabel + ' s/rev';
    var rotationLabel = rotationPeriodSeconds === null ? 'stopped · 0 RPM' : Math.round(speedRpm) + ' RPM · ' + rotationPeriodLabel;
    var pedalToeY = 441 + speedRatio * 10;
    var pedalTravelPct = Math.round(speedRatio * 100);
    var pedalState = speedRpm <= 2 ? 'released' : (speedRatio < .35 ? 'lightly-pressed' : (speedRatio < .75 ? 'mid-travel' : 'deeply-pressed'));
    var pedalStateLabel = pedalState === 'released' ? 'released' : (pedalState === 'lightly-pressed' ? 'lightly pressed' : (pedalState === 'mid-travel' ? 'mid travel' : 'deeply pressed'));
    function number(value) { return Number(value).toFixed(1); }
    function point(x, y) { return number(x) + ' ' + number(y); }
    function polygon(points) { return 'M' + points.map(function (entry) { return point(entry[0], entry[1]); }).join(' L') + ' Z'; }
    var sideBottomY = wheelheadY + wheelheadThickness;
    var wheelheadSidePath = 'M' + point(centerX - wheelheadRx, wheelheadY) + ' Q' + point(centerX, wheelheadY + wheelheadRy) + ' ' + point(centerX + wheelheadRx, wheelheadY) + ' L' + point(centerX + wheelheadRx, sideBottomY) + ' Q' + point(centerX, sideBottomY + wheelheadRy) + ' ' + point(centerX - wheelheadRx, sideBottomY) + ' Z';
    var pedalPath = polygon([[374, 450], [438, pedalToeY], [430, pedalToeY + 7], [376, 459]]);
    return {
      speedRpm: speedRpm,
      speedRatio: speedRatio,
      tiltDegrees: tiltDegrees,
      perspectiveDepth: perspectiveDepth,
      motionDurationSeconds: rotationPeriodSeconds,
      driveHousingPath: 'M196 424 L324 424 L343 458 L177 458 Z',
      splashPan: { cx: centerX, cy: 420, rx: splashPanRx, ry: splashPanRy },
      wheelhead: { cx: centerX, cy: wheelheadY, rx: wheelheadRx, ry: wheelheadRy, thickness: wheelheadThickness, sidePath: wheelheadSidePath },
      rotation: { state: rotationPeriodSeconds === null ? 'stopped' : 'turning', periodSeconds: rotationPeriodSeconds, secondsLabel: rotationSecondsLabel, periodLabel: rotationPeriodLabel, label: rotationLabel, cx: centerX, cy: wheelheadY, rx: rotationTrackRx, ry: rotationTrackRy, circumferencePx: rotationCircumference, markerLengthPx: registrationArcLength, dashArray: number(registrationArcLength) + ' ' + number(rotationCircumference - registrationArcLength), dashOffset: -rotationCircumference },
      spindle: { path: 'M249 438 L271 438 L274 450 L246 450 Z', hubCx: centerX, hubCy: 450, hubRx: 14, hubRy: 4 },
      pedal: { path: pedalPath, toeX: 438, toeY: pedalToeY, travelPct: pedalTravelPct, state: pedalState, stateLabel: pedalStateLabel, highlightPath: 'M379 450 L433 ' + number(pedalToeY + 1) },
      summary: 'Wheel hardware shows the wheel head, splash pan, drive housing, and a speed pedal at ' + pedalTravelPct + ' percent schematic travel for ' + Math.round(speedRpm) + ' RPM.' + (rotationPeriodSeconds === null ? ' The wheel head is stopped.' : ' The wheel head completes one revolution every ' + rotationSecondsLabel + ' seconds.'),
      note: 'Pedal travel is a linear visual cue, not a model of a specific wheel, controller curve, torque, braking, or safe operating technique. The registration mark uses 60 divided by RPM seconds per revolution; its direction is schematic, and reduced-motion preferences suppress the repeating cue.'
    };
  }
  function potteryWheelWobbleGeometry(wobble, centered, rpm, settings) {
    settings = settings || {};
    var wobbleRatio = clamp(finite(wobble, 0), 0, 1);
    var centeredPercent = clamp(finite(centered, 100), 0, 100);
    var speedRpm = clamp(finite(rpm, 0), 0, 120);
    var depthRatio = clamp(finite(settings.depthRatio, .18), .08, .45);
    var amplitudePx = clamp(wobbleRatio * 16 + (100 - centeredPercent) * .04, 0, 16);
    var depthAmplitudePx = amplitudePx * depthRatio;
    var diagonalAmplitudePx = amplitudePx * Math.SQRT1_2;
    var diagonalDepthPx = depthAmplitudePx * Math.SQRT1_2;
    var cycleSeconds = speedRpm > 0 ? 60 / speedRpm : null;
    var cycleSecondsLabel = cycleSeconds === null ? null : (cycleSeconds >= 10 ? cycleSeconds.toFixed(1) : cycleSeconds.toFixed(2));
    var speedLoadIndex = clamp((amplitudePx / 16) * Math.pow(speedRpm / 60, 2), 0, 4);
    var loadState = speedRpm <= 0 ? 'stopped' : (amplitudePx <= .4 ? 'minimal' : (speedLoadIndex < .25 ? 'low' : (speedLoadIndex < .75 ? 'moderate' : 'high')));
    var motionState = amplitudePx <= .4 ? 'centered' : (speedRpm > 0 ? 'orbiting' : 'stationary-offset');
    var summary = motionState === 'centered' ? 'The modeled clay is visually centered on the wheel axis.' : (motionState === 'stationary-offset' ? 'The clay holds a visible off-center position while the wheel is stopped.' : 'The off-center clay follows an elliptical path once per ' + cycleSecondsLabel + '-second wheel revolution; comparative speed-related imbalance is ' + loadState + '.');
    return {
      wobbleRatio: wobbleRatio,
      centeredPercent: centeredPercent,
      speedRpm: speedRpm,
      amplitudePx: amplitudePx,
      depthAmplitudePx: depthAmplitudePx,
      diagonalAmplitudePx: diagonalAmplitudePx,
      diagonalDepthPx: diagonalDepthPx,
      cycleSeconds: cycleSeconds,
      cycleSecondsLabel: cycleSecondsLabel,
      speedLoadIndex: speedLoadIndex,
      loadState: loadState,
      motionState: motionState,
      summary: summary,
      note: 'Wobble offset is a schematic view derived from centering and wobble, not a displacement measurement. The comparative speed-load cue scales with RPM squared to reflect circular-motion acceleration; it is not force in newtons.'
    };
  }
  function potteryWheelSurfaceKinematics(rpm, radiusCm, settings) {
    settings = settings || {};
    var speedRpm = clamp(finite(rpm, 0), 0, 120);
    var radius = clamp(finite(radiusCm, 0), 0, 50);
    var ringNumber = Math.round(clamp(finite(settings.ringNumber, 1), 1, RING_COUNT));
    var revolutionsPerSecond = speedRpm / 60;
    var circumferenceCm = 2 * Math.PI * radius;
    var angularVelocityRadPerSecond = 2 * Math.PI * revolutionsPerSecond;
    var surfaceSpeedCmPerSecond = circumferenceCm * revolutionsPerSecond;
    var state = speedRpm <= 0 ? 'stopped' : (radius <= 0 ? 'on-axis' : 'moving');
    var speedLabel = surfaceSpeedCmPerSecond < 100 ? surfaceSpeedCmPerSecond.toFixed(1) : Math.round(surfaceSpeedCmPerSecond).toString();
    var displayLabel = Math.round(speedRpm) + ' RPM · ring ' + ringNumber + ' · ' + (state === 'stopped' ? 'stopped' : speedLabel + ' cm/s');
    var summary = state === 'stopped' ? 'At work ring ' + ringNumber + ', local clay surface speed is 0 because the wheel is stopped.' : 'At work ring ' + ringNumber + ', a ' + radius.toFixed(2) + '-centimeter radius at ' + Math.round(speedRpm) + ' RPM gives a local clay surface speed of ' + speedLabel + ' centimeters per second.';
    return {
      state: state,
      speedRpm: speedRpm,
      radiusCm: radius,
      ringNumber: ringNumber,
      revolutionsPerSecond: revolutionsPerSecond,
      circumferenceCm: circumferenceCm,
      angularVelocityRadPerSecond: angularVelocityRadPerSecond,
      surfaceSpeedCmPerSecond: surfaceSpeedCmPerSecond,
      speedLabel: speedLabel,
      displayLabel: displayLabel,
      summary: summary,
      note: 'Local surface speed uses 2 pi times radius times RPM divided by 60. It is tangential clay speed, not hand speed, relative slip, drag, or force.'
    };
  }
  function potteryWheelWholeFormKinematics(rpm, radii) {
    var speedRpm = clamp(finite(rpm, 0), 0, 120);
    var validRadii = (Array.isArray(radii) ? radii : []).map(function (radius) {
      return clamp(finite(radius, 0), 0, 50);
    }).filter(function (radius) { return radius > 0; });
    if (!validRadii.length) validRadii = [0];
    var minRadiusCm = Math.min.apply(Math, validRadii);
    var maxRadiusCm = Math.max.apply(Math, validRadii);
    var revolutionsPerSecond = speedRpm / 60;
    var speedFactor = 2 * Math.PI * revolutionsPerSecond;
    var minSurfaceSpeedCmPerSecond = minRadiusCm * speedFactor;
    var maxSurfaceSpeedCmPerSecond = maxRadiusCm * speedFactor;
    var state = speedRpm <= 0 ? 'stopped' : 'moving';
    function speedLabel(value) { return value < 100 ? value.toFixed(1) : Math.round(value).toString(); }
    var minSpeedLabel = speedLabel(minSurfaceSpeedCmPerSecond);
    var maxSpeedLabel = speedLabel(maxSurfaceSpeedCmPerSecond);
    var rangeLabel = Math.abs(maxSurfaceSpeedCmPerSecond - minSurfaceSpeedCmPerSecond) < .05 ? minSpeedLabel : minSpeedLabel + '–' + maxSpeedLabel;
    var displayLabel = Math.round(speedRpm) + ' RPM · whole form · ' + (state === 'stopped' ? 'stopped' : rangeLabel + ' cm/s');
    var summary = state === 'stopped'
      ? 'Across the whole form, clay surface speed is 0 because the wheel is stopped.'
      : 'Across the whole form at ' + Math.round(speedRpm) + ' RPM, modeled clay surface speed ranges from ' + minSpeedLabel + ' to ' + maxSpeedLabel + ' centimeters per second as radius changes from ' + minRadiusCm.toFixed(2) + ' to ' + maxRadiusCm.toFixed(2) + ' centimeters.';
    return {
      state: state,
      speedRpm: speedRpm,
      revolutionsPerSecond: revolutionsPerSecond,
      minRadiusCm: minRadiusCm,
      maxRadiusCm: maxRadiusCm,
      minSurfaceSpeedCmPerSecond: minSurfaceSpeedCmPerSecond,
      maxSurfaceSpeedCmPerSecond: maxSurfaceSpeedCmPerSecond,
      minSpeedLabel: minSpeedLabel,
      maxSpeedLabel: maxSpeedLabel,
      displayLabel: displayLabel,
      summary: summary,
      note: 'Whole-form surface-speed range uses 2 pi times each modeled ring radius times RPM divided by 60. It reports tangential clay speed across the form, not hand speed, relative slip, drag, or force.'
    };
  }
  function potteryWheelWetFilmGeometry(moisture, lubrication, rpm, pressure, settings) {
    settings = settings || {};
    var method = settings.method === 'coil' ? 'coil' : 'wheel';
    var bodyMoistureRatio = clamp(finite(moisture, .78), 0, 1);
    var lubricationPct = clamp(finite(lubrication, 30), 0, 100);
    var lubricationRatio = lubricationPct / 100;
    var speedRpm = method === 'wheel' ? clamp(finite(rpm, 0), 0, 120) : 0;
    var speedRatio = speedRpm / 120;
    var pressureRatio = clamp(finite(pressure, 48), 0, 100) / 100;
    var excessRatio = clamp((lubricationRatio - .72) / .28, 0, 1);
    var state = lubricationPct < 20 ? 'dry-contact' : (lubricationPct <= 72 ? 'working-film' : 'excess-film');
    var label = state === 'dry-contact' ? 'dry contact' : (state === 'working-film' ? 'working film' : 'excess film');
    var sheenOpacity = clamp(.04 + bodyMoistureRatio * .22 + lubricationRatio * .18, .04, .44);
    var contactFilmOpacity = clamp(lubricationRatio * .62 + excessRatio * .16, 0, .78);
    var contactFilmWidthPx = clamp(1.2 + lubricationRatio * 4.4 + excessRatio * 2.2, 1.2, 7.8);
    var panSlipRatio = method === 'wheel' ? clamp(lubricationRatio * (.32 + pressureRatio * .18) + excessRatio * .5, 0, 1) : 0;
    var panSlipOpacity = method === 'wheel' ? clamp(.08 + panSlipRatio * .68, .08, .76) : 0;
    var panSlipWidthPx = method === 'wheel' ? clamp(.8 + panSlipRatio * 10, .8, 10.8) : 0;
    var splashTendency = method === 'wheel' ? clamp(excessRatio * Math.pow(speedRatio, 2) * (.55 + pressureRatio * .45), 0, 1) : 0;
    var dropletCount = splashTendency > .72 ? 3 : (splashTendency > .38 ? 2 : (splashTendency > .1 ? 1 : 0));
    var centerX = finite(settings.centerX, 260);
    var panY = finite(settings.panY, 420);
    var panRx = clamp(finite(settings.panRx, 196), 80, 240);
    var panRy = clamp(finite(settings.panRy, 38), 12, 80);
    var dropletTemplates = [
      { side: -1, inset: 24, rise: 6, radius: 2.3 },
      { side: 1, inset: 27, rise: 11, radius: 2.7 },
      { side: 1, inset: 8, rise: 19, radius: 2.1 }
    ];
    var droplets = dropletTemplates.slice(0, dropletCount).map(function (drop, index) {
      return {
        id: index + 1,
        cx: centerX + drop.side * (panRx - drop.inset),
        cy: panY - panRy * .34 - splashTendency * drop.rise,
        radius: drop.radius
      };
    });
    var bodyMoisturePct = Math.round(bodyMoistureRatio * 100);
    var summary = state === 'dry-contact'
      ? 'At ' + Math.round(lubricationPct) + '% surface lubrication, the model shows dry contact and comparatively more drag; clay-body moisture remains a separate ' + bodyMoisturePct + '%.'
      : (state === 'working-film'
        ? 'At ' + Math.round(lubricationPct) + '% surface lubrication, the model shows a working film that reduces contact drag; clay-body moisture remains a separate ' + bodyMoisturePct + '%.'
        : 'At ' + Math.round(lubricationPct) + '% surface lubrication, the model shows excess film that broadens the contact cue and reduces control; clay-body moisture remains a separate ' + bodyMoisturePct + '%.');
    if (method === 'coil') summary += ' Handbuilding retains the surface-sheen interpretation but suppresses powered splash-pan accumulation.';
    return {
      method: method,
      state: state,
      label: label,
      bodyMoistureRatio: bodyMoistureRatio,
      bodyMoisturePct: bodyMoisturePct,
      lubricationPct: lubricationPct,
      lubricationRatio: lubricationRatio,
      speedRpm: speedRpm,
      pressureRatio: pressureRatio,
      excessRatio: excessRatio,
      sheenOpacity: sheenOpacity,
      contactFilmOpacity: contactFilmOpacity,
      contactFilmWidthPx: contactFilmWidthPx,
      panSlipRatio: panSlipRatio,
      panSlipOpacity: panSlipOpacity,
      panSlipWidthPx: panSlipWidthPx,
      splashTendency: splashTendency,
      dropletCount: dropletCount,
      pool: { cx: centerX, cy: panY, rx: Math.max(1, panRx - 8), ry: Math.max(1, panRy - 5) },
      droplets: droplets,
      summary: summary,
      note: 'Clay-body moisture and surface lubrication are modeled separately. Sheen, film width, pan slip, and droplets are comparative visual cues, not measurements of water content, slip volume, spray range, material chemistry, or safe cleanup practice.'
    };
  }
  function potteryWheelContactGeometry(tool, method, workRing, pressure, handSupport, contactSpan, settings) {
    settings = settings || {};
    method = method === 'coil' ? 'coil' : 'wheel';
    var wheelProfiles = {
      center: { id: 'centering-brace', label: 'two-hand centering brace', shortLabel: 'centering brace', outsideKind: 'hand-brace', insideKind: 'hand-brace', outsideRole: 'driving brace', insideRole: 'opposing brace', insideSurface: 'outer-left', targetMode: 'whole-form', supportRelevant: false },
      open: { id: 'opening-pair', label: 'opening finger with outside brace', shortLabel: 'opening pair', outsideKind: 'hand', insideKind: 'opening-finger', outsideRole: 'outside brace', insideRole: 'opening finger', targetMode: 'selected-ring', supportRelevant: true },
      pull: { id: 'pulling-pair', label: 'paired-finger pull', shortLabel: 'pull pair', outsideKind: 'hand', insideKind: 'pulling-finger', outsideRole: 'outside finger', insideRole: 'inside supporting finger', targetMode: 'selected-ring', supportRelevant: true },
      belly: { id: 'expansion-pair', label: 'inside expansion with outside guide', shortLabel: 'expansion pair', outsideKind: 'hand', insideKind: 'expansion-finger', outsideRole: 'outside guide', insideRole: 'inside expanding finger', targetMode: 'selected-ring', supportRelevant: true },
      collar: { id: 'collaring-pair', label: 'outside collar with inside guide', shortLabel: 'collaring pair', outsideKind: 'hand', insideKind: 'guiding-finger', outsideRole: 'outside collaring hand', insideRole: 'inside guide', targetMode: 'selected-ring', supportRelevant: true },
      smooth: { id: 'rib-support', label: 'exterior rib with inside support', shortLabel: 'rib + support', outsideKind: 'rib', insideKind: 'supporting-hand', outsideRole: 'exterior rib', insideRole: 'inside support', targetMode: 'selected-ring', supportRelevant: true },
      trim: { id: 'trim-support', label: 'trimming loop with stabilizing hand', shortLabel: 'trim + stabilize', outsideKind: 'trim-loop', insideKind: 'stabilizing-hand', outsideRole: 'trimming edge', insideRole: 'stabilizing hand', targetMode: 'lower-zone', supportRelevant: true }
    };
    var coilProfiles = {
      'add-coil': { id: 'coil-placement', label: 'coil placement with rim support', shortLabel: 'coil placement', outsideKind: 'coil', insideKind: 'rim-support', outsideRole: 'placing hand and coil', insideRole: 'rim support', targetMode: 'rim', supportRelevant: true },
      open: { id: 'pinch-opening', label: 'pinch opening with opposing support', shortLabel: 'pinch pair', outsideKind: 'hand', insideKind: 'pinching-finger', outsideRole: 'outside pinch', insideRole: 'inside pinch support', targetMode: 'selected-ring', supportRelevant: true },
      belly: { id: 'handbuild-expansion', label: 'inside push with outside guide', shortLabel: 'push-out pair', outsideKind: 'hand', insideKind: 'expansion-finger', outsideRole: 'outside guide', insideRole: 'inside push', targetMode: 'selected-ring', supportRelevant: true },
      collar: { id: 'handbuild-collar', label: 'draw-in pinch with inside guide', shortLabel: 'draw-in pair', outsideKind: 'hand', insideKind: 'guiding-finger', outsideRole: 'outside draw-in pinch', insideRole: 'inside guide', targetMode: 'selected-ring', supportRelevant: true },
      paddle: { id: 'paddle-support', label: 'paddle with inside support', shortLabel: 'paddle + support', outsideKind: 'paddle', insideKind: 'supporting-hand', outsideRole: 'outside paddle', insideRole: 'inside support', targetMode: 'selected-ring', supportRelevant: true },
      smooth: { id: 'hand-smoothing', label: 'smoothing fingers with inside support', shortLabel: 'smoothing pair', outsideKind: 'hand', insideKind: 'supporting-hand', outsideRole: 'outside smoothing fingers', insideRole: 'inside support', targetMode: 'selected-ring', supportRelevant: true },
      trim: { id: 'scrape-support', label: 'scraper with stabilizing hand', shortLabel: 'scrape + stabilize', outsideKind: 'scraper', insideKind: 'stabilizing-hand', outsideRole: 'outside scraper', insideRole: 'stabilizing hand', targetMode: 'lower-zone', supportRelevant: true }
    };
    var profiles = method === 'coil' ? coilProfiles : wheelProfiles;
    var fallbackTool = method === 'coil' ? 'add-coil' : 'center';
    var toolId = Object.prototype.hasOwnProperty.call(profiles, tool) ? tool : fallbackTool;
    var profile = profiles[toolId];
    var target = potteryFormingTarget(toolId, workRing);
    var requestedRing = target.requestedRing;
    var targetRing = target.ring;
    var pressurePct = clamp(finite(pressure, 48), 0, 100);
    var supportPct = clamp(finite(handSupport, 55), 0, 100);
    var spanRings = Math.round(clamp(finite(contactSpan, 9), 3, 11));
    var centerX = finite(settings.centerX, 260);
    var bottomY = finite(settings.bottomY, 406);
    var heightPx = clamp(finite(settings.heightPx, 220), 35, 380);
    var scale = clamp(finite(settings.scale, 10.2), 1, 30);
    var rimY = bottomY - heightPx;
    var ringPitchPx = heightPx / Math.max(1, RING_COUNT - 1);
    var radii = Array.isArray(settings.radii) ? settings.radii : [];
    var thickness = Array.isArray(settings.thickness) ? settings.thickness : [];
    var radiusCm = clamp(finite(radii[targetRing], finite(settings.radiusCm, 6)), .4, 20);
    var wallCm = clamp(finite(thickness[targetRing], finite(settings.wallCm, 1)), .1, radiusCm);
    var outerRadiusPx = clamp(radiusCm * scale, 6, 190);
    var innerRadiusPx = clamp(Math.max(.6, radiusCm - wallCm) * scale, 5, Math.max(5, outerRadiusPx - 1));
    var contactY = bottomY - targetRing / Math.max(1, RING_COUNT - 1) * heightPx;
    var modeledSpanRings = profile.targetMode === 'whole-form' ? RING_COUNT : (profile.targetMode === 'rim' ? 5 : spanRings);
    var contactHeightPx = profile.targetMode === 'whole-form'
      ? clamp(heightPx * .38, 18, 68)
      : (profile.targetMode === 'rim' ? clamp(ringPitchPx * 5 * .72, 10, 38) : clamp(spanRings * ringPitchPx * .72, 8, 58));
    var outsideX = centerX + outerRadiusPx + 7;
    var insideX = profile.insideSurface === 'outer-left' ? centerX - outerRadiusPx - 7 : centerX + innerRadiusPx - 4;
    var pressureRatio = pressurePct / 100;
    var supportRatio = supportPct / 100;
    var visualInsideRatio = profile.supportRelevant ? supportRatio : pressureRatio;
    var outsidePad = { cx: outsideX, cy: contactY, rx: 3.8 + pressureRatio * 3.2, ry: contactHeightPx / 2, opacity: .34 + pressureRatio * .58, strokeWidth: 1.4 + pressureRatio * 1.5 };
    var insidePad = { cx: insideX, cy: contactY, rx: 3.8 + visualInsideRatio * 3.2, ry: contactHeightPx / 2, opacity: .28 + visualInsideRatio * .64, strokeWidth: 1.4 + visualInsideRatio * 1.5 };
    function number(value) { return Number(value).toFixed(1); }
    function point(x, y) { return number(x) + ' ' + number(y); }
    function polygon(points) { return 'M' + points.map(function (entry) { return point(entry[0], entry[1]); }).join(' L') + ' Z'; }
    var outsideStartX = clamp(outsideX + 52, outsideX + 18, 506);
    var outsideStartY = clamp(contactY + contactHeightPx * .34 + 20, 78, 442);
    var outsideArmPath = 'M' + point(outsideStartX, outsideStartY) + ' Q' + point(outsideX + 26, contactY + contactHeightPx * .24 + 8) + ' ' + point(outsideX, contactY);
    var insideArmPath;
    if (profile.insideSurface === 'outer-left') {
      var insideStartX = clamp(insideX - 52, 14, insideX - 18);
      var insideStartY = clamp(contactY + contactHeightPx * .34 + 20, 78, 442);
      insideArmPath = 'M' + point(insideStartX, insideStartY) + ' Q' + point(insideX - 26, contactY + contactHeightPx * .24 + 8) + ' ' + point(insideX, contactY);
    } else {
      var cavityStartX = centerX + clamp(innerRadiusPx * .26, 6, 24);
      var cavityStartY = clamp(rimY - 11, 48, bottomY - 12);
      var cavityControlX = centerX + clamp(innerRadiusPx * .52, 10, 48);
      var cavityControlY = clamp(cavityStartY + (contactY - cavityStartY) * .48, 54, bottomY - 5);
      insideArmPath = 'M' + point(cavityStartX, cavityStartY) + ' Q' + point(cavityControlX, cavityControlY) + ' ' + point(insideX, contactY);
    }
    var implement = { kind: 'none' };
    var halfHeight = contactHeightPx / 2;
    if (profile.outsideKind === 'rib') {
      implement = { kind: 'rib', path: 'M' + point(outsideX - 2, contactY - halfHeight - 2) + ' Q' + point(outsideX + 11, contactY - halfHeight * .58) + ' ' + point(outsideX + 10, contactY + halfHeight * .72) + ' L' + point(outsideX + 1, contactY + halfHeight + 2) + ' Z' };
    } else if (profile.outsideKind === 'paddle') {
      implement = { kind: 'paddle', path: polygon([[outsideX - 2, contactY - halfHeight - 3], [outsideX + 13, contactY - halfHeight + 1], [outsideX + 13, contactY + halfHeight - 1], [outsideX - 2, contactY + halfHeight + 3]]) };
    } else if (profile.outsideKind === 'scraper') {
      implement = { kind: 'scraper', path: polygon([[outsideX - 3, contactY - halfHeight], [outsideX + 13, contactY], [outsideX - 3, contactY + halfHeight]]) };
    } else if (profile.outsideKind === 'trim-loop') {
      implement = { kind: 'trim-loop', handlePath: 'M' + point(outsideX + 38, contactY + 22) + ' L' + point(outsideX + 7, contactY + 2), loop: { cx: outsideX + 1, cy: contactY, rx: 7, ry: clamp(halfHeight * .42, 4, 11) } };
    } else if (profile.outsideKind === 'coil') {
      implement = { kind: 'coil', path: 'M' + point(centerX - outerRadiusPx, contactY) + ' A' + number(outerRadiusPx) + ' ' + number(Math.max(3, contactHeightPx * .34)) + ' 0 0 0 ' + point(centerX + outerRadiusPx, contactY) };
    }
    var insideTouchPct = profile.supportRelevant ? supportPct : pressurePct;
    var difference = pressurePct - insideTouchPct;
    var balanceState = Math.abs(difference) <= 12 ? 'balanced' : (difference > 0 ? 'outside-led' : 'inside-led');
    var balanceLabel = profile.supportRelevant
      ? (balanceState === 'balanced' ? 'near-balanced touch' : (balanceState === 'outside-led' ? 'outside-led touch' : 'inside-led touch'))
      : 'matched opposing brace';
    var targetLabel = profile.targetMode === 'whole-form' ? 'the whole modeled form' : (profile.targetMode === 'rim' ? 'the top five modeled rim rings' : (profile.targetMode === 'lower-zone' ? 'lower-exterior work ring ' + (targetRing + 1) + ', constrained to rings ' + (target.minRing + 1) + '–' + (target.maxRing + 1) : 'work ring ' + (targetRing + 1) + ' across ' + modeledSpanRings + ' modeled rings'));
    var summary = profile.label.charAt(0).toUpperCase() + profile.label.slice(1) + ' is shown at ' + targetLabel + '. ';
    if (profile.targetMode === 'whole-form') summary += 'Centering uses the pressure-driven opposing brace and rotational averaging rather than the selected ring or inside-support control.';
    else summary += 'The outside cue follows ' + Math.round(pressurePct) + '% pressure and the inside cue follows ' + Math.round(supportPct) + '% support, producing ' + balanceLabel + ' in this comparative model.';
    return {
      method: method,
      tool: toolId,
      id: profile.id,
      label: profile.label,
      shortLabel: profile.shortLabel,
      outsideKind: profile.outsideKind,
      insideKind: profile.insideKind,
      outsideRole: profile.outsideRole,
      insideRole: profile.insideRole,
      supportRelevant: profile.supportRelevant,
      targetMode: profile.targetMode,
      requestedRing: requestedRing,
      targetRing: targetRing,
      targetMinRing: target.minRing,
      targetMaxRing: target.maxRing,
      targetZoneRingCount: target.zoneRingCount,
      modeledSpanRings: modeledSpanRings,
      contactHeightPx: contactHeightPx,
      pressurePct: pressurePct,
      supportPct: supportPct,
      insideTouchPct: insideTouchPct,
      balanceState: balanceState,
      balanceLabel: balanceLabel,
      outsideArmPath: outsideArmPath,
      insideArmPath: insideArmPath,
      outsideArmWidthPx: 4.8 + pressureRatio * 3.2,
      insideArmWidthPx: 4.8 + visualInsideRatio * 3.2,
      outsidePad: outsidePad,
      insidePad: insidePad,
      implement: implement,
      summary: summary,
      note: 'Contact silhouettes and tool angles are schematic role cues, not hand anatomy, measured contact area, force, posture, ergonomics, or technique and safety instruction.'
    };
  }
  function kilnShelfPerspectiveGeometry(y, settings) {
    settings = settings || {};
    var backY = finite(y, 0);
    var backLeft = finite(settings.backLeft, 151);
    var backRight = Math.max(backLeft + 80, finite(settings.backRight, 405));
    var depth = clamp(finite(settings.depth, 10), 4, 30);
    var frontOutsetLeft = clamp(finite(settings.frontOutsetLeft, finite(settings.leftInset, 15)), 4, 40);
    var frontOutsetRight = clamp(finite(settings.frontOutsetRight, finite(settings.rightInset, 19)), 4, 40);
    var thickness = clamp(finite(settings.thickness, 4), 2, 12);
    var frontY = backY + depth;
    var frontLeft = Math.min(backLeft - 4, finite(settings.frontLeft, backLeft - frontOutsetLeft));
    var frontRight = Math.max(backRight + 4, finite(settings.frontRight, backRight + frontOutsetRight));
    var lowerLeft = frontLeft + Math.min(4, thickness);
    var lowerRight = frontRight - Math.min(4, thickness);
    function point(x, pointY) { return Number(x).toFixed(1) + ' ' + Number(pointY).toFixed(1); }
    var surfacePath = 'M' + point(backLeft, backY) + ' L' + point(backRight, backY) + ' L' + point(frontRight, frontY) + ' L' + point(frontLeft, frontY) + ' Z';
    var frontFacePath = 'M' + point(frontLeft, frontY) + ' L' + point(frontRight, frontY) + ' L' + point(lowerRight, frontY + thickness) + ' L' + point(lowerLeft, frontY + thickness) + ' Z';
    var supportInset = clamp((frontRight - frontLeft) * .055, 10, 22);
    return {
      backY: backY,
      frontY: frontY,
      depth: depth,
      thickness: thickness,
      backLeft: backLeft,
      backRight: backRight,
      frontLeft: frontLeft,
      frontRight: frontRight,
      frontOutsetLeft: frontOutsetLeft,
      frontOutsetRight: frontOutsetRight,
      surfacePath: surfacePath,
      frontFacePath: frontFacePath,
      backEdgePath: 'M' + point(backLeft, backY) + ' L' + point(backRight, backY),
      frontEdgePath: 'M' + point(frontLeft, frontY) + ' L' + point(frontRight, frontY),
      supportXs: [frontLeft + supportInset, frontRight - supportInset]
    };
  }
  function kilnWallCutawayGeometry(settings) {
    settings = settings || {};
    var centerX = finite(settings.centerX, 280);
    var halfWidth = clamp(finite(settings.halfWidth, 204), 140, 250);
    var topY = finite(settings.topY, 28);
    var bottomY = Math.max(topY + 180, finite(settings.bottomY, 344));
    var shoulderY = clamp(finite(settings.shoulderY, 95), topY + 35, bottomY - 70);
    var capHalfWidth = clamp(finite(settings.capHalfWidth, 142), 70, halfWidth - 30);
    var maximumInset = Math.min(60, halfWidth - 80);
    var layerDefinitions = [
      { id: 'outer-casing', label: 'outer casing', inset: 0 },
      { id: 'insulating-refractory', label: 'insulating refractory', inset: 9 },
      { id: 'hot-face-lining', label: 'hot-face lining', inset: 32 },
      { id: 'chamber-opening', label: 'chamber opening', inset: 50 }
    ];
    function number(value) { return Number(value).toFixed(1); }
    function layerGeometry(definition) {
      var inset = clamp(finite(definition.inset, 0), 0, maximumInset);
      var left = centerX - halfWidth + inset;
      var right = centerX + halfWidth - inset;
      var layerTopY = topY + inset * .8;
      var layerBottomY = bottomY - inset * .28;
      var layerShoulderY = shoulderY + inset * .2;
      var controlY = topY + 10 + inset * .76;
      var capLeft = centerX - capHalfWidth + inset * .4;
      var capRight = centerX + capHalfWidth - inset * .4;
      var path = 'M' + number(left) + ' ' + number(layerBottomY) + ' V' + number(layerShoulderY) + ' Q' + number(left) + ' ' + number(controlY) + ' ' + number(capLeft) + ' ' + number(layerTopY) + ' H' + number(capRight) + ' Q' + number(right) + ' ' + number(controlY) + ' ' + number(right) + ' ' + number(layerShoulderY) + ' V' + number(layerBottomY) + ' Z';
      return {
        id: definition.id,
        label: definition.label,
        inset: inset,
        left: left,
        right: right,
        topY: layerTopY,
        bottomY: layerBottomY,
        shoulderY: layerShoulderY,
        controlY: controlY,
        capLeft: capLeft,
        capRight: capRight,
        path: path
      };
    }
    var layers = layerDefinitions.map(layerGeometry);
    return {
      centerX: centerX,
      halfWidth: halfWidth,
      topY: topY,
      bottomY: bottomY,
      layers: layers,
      outerCasing: layers[0],
      insulatingRefractory: layers[1],
      hotFaceLining: layers[2],
      chamberOpening: layers[3]
    };
  }
  function kilnChamberPerspectiveGeometry(wallCutaway, settings) {
    settings = settings || {};
    var cutaway = wallCutaway && wallCutaway.chamberOpening ? wallCutaway : kilnWallCutawayGeometry();
    var front = cutaway.chamberOpening;
    var depth = clamp(finite(settings.depth, 10), 6, 24);
    function number(value) { return Number(value).toFixed(1); }
    function point(x, y) { return number(x) + ' ' + number(y); }
    function polygon(points) { return 'M' + points.map(function (entry) { return point(entry[0], entry[1]); }).join(' L') + ' Z'; }
    var rear = {
      left: front.left + depth,
      right: front.right - depth,
      topY: front.topY + depth * .8,
      bottomY: front.bottomY - depth,
      shoulderY: front.shoulderY + depth * .4,
      controlY: front.controlY + depth * .65,
      capLeft: front.capLeft + depth * .4,
      capRight: front.capRight - depth * .4
    };
    rear.path = 'M' + point(rear.left, rear.bottomY) + ' V' + number(rear.shoulderY) + ' Q' + point(rear.left, rear.controlY) + ' ' + point(rear.capLeft, rear.topY) + ' H' + number(rear.capRight) + ' Q' + point(rear.right, rear.controlY) + ' ' + point(rear.right, rear.shoulderY) + ' V' + number(rear.bottomY) + ' Z';
    var ceilingReturn = { id: 'ceiling', path: polygon([[front.capLeft, front.topY], [front.capRight, front.topY], [rear.capRight, rear.topY], [rear.capLeft, rear.topY]]) };
    var leftReturn = { id: 'left-wall', path: 'M' + point(front.left, front.bottomY) + ' V' + number(front.shoulderY) + ' Q' + point(front.left, front.controlY) + ' ' + point(front.capLeft, front.topY) + ' L' + point(rear.capLeft, rear.topY) + ' Q' + point(rear.left, rear.controlY) + ' ' + point(rear.left, rear.shoulderY) + ' V' + number(rear.bottomY) + ' Z' };
    var rightReturn = { id: 'right-wall', path: 'M' + point(front.capRight, front.topY) + ' Q' + point(front.right, front.controlY) + ' ' + point(front.right, front.shoulderY) + ' V' + number(front.bottomY) + ' L' + point(rear.right, rear.bottomY) + ' V' + number(rear.shoulderY) + ' Q' + point(rear.right, rear.controlY) + ' ' + point(rear.capRight, rear.topY) + ' Z' };
    var hearthFloor = { id: 'hearth-floor', path: polygon([[front.left, front.bottomY], [front.right, front.bottomY], [rear.right, rear.bottomY], [rear.left, rear.bottomY]]) };
    return {
      depth: depth,
      front: front,
      rear: rear,
      ceilingReturn: ceilingReturn,
      leftReturn: leftReturn,
      rightReturn: rightReturn,
      hearthFloor: hearthFloor,
      returns: [ceilingReturn, leftReturn, rightReturn, hearthFloor]
    };
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
  function sampleThermalHistory(history, progressPct) {
    history = history || estimateThermalHistory({});
    var segments = Array.isArray(history.segments) ? history.segments : [];
    var totalHours = finite(history.totalHours, segments.reduce(function (sum, segment) { return sum + Math.max(0, finite(segment.durationHours, 0)); }, 0));
    var progress = clamp(finite(progressPct, 0), 0, 100);
    var elapsedHours = totalHours * progress / 100;
    var cursor = 0;
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      var duration = Math.max(0, finite(segment.durationHours, 0));
      var segmentEnd = cursor + duration;
      if (elapsedHours <= segmentEnd + 0.000001 || i === segments.length - 1) {
        var segmentProgress = duration ? clamp((elapsedHours - cursor) / duration, 0, 1) : 1;
        var startC = finite(segment.startC, history.roomTemperature || 20);
        var endC = finite(segment.endC, startC);
        var segmentId = segment.id || 'ramp';
        return {
          progressPct: progress,
          elapsedHours: elapsedHours,
          totalHours: totalHours,
          segmentId: segmentId,
          phaseLabel: segmentId === 'soak' ? 'Peak soak' : (segmentId === 'cool' ? 'Cooling' : 'Heating'),
          segmentProgressPct: segmentProgress * 100,
          temperatureC: startC + (endC - startC) * segmentProgress
        };
      }
      cursor = segmentEnd;
    }
    return { progressPct: progress, elapsedHours: elapsedHours, totalHours: totalHours, segmentId: 'ramp', phaseLabel: 'Heating', segmentProgressPct: 0, temperatureC: finite(history.roomTemperature, 20) };
  }
  function kilnHeatSourceState(kilnType, sample, settings) {
    settings = settings || {};
    sample = sample || {};
    var supportedTypes = ['electric', 'gas', 'wood', 'open'];
    var type = supportedTypes.indexOf(kilnType) >= 0 ? kilnType : 'electric';
    var segmentId = ['ramp', 'soak', 'cool'].indexOf(sample.segmentId) >= 0 ? sample.segmentId : 'ramp';
    var temperatureC = clamp(finite(sample.temperatureC, 20), 20, 1400);
    var targetTemperatureC = clamp(Math.max(temperatureC, finite(settings.temperature, Math.max(950, temperatureC))), 600, 1400);
    var rampRate = clamp(finite(settings.ramp, 110), 30, 300);
    var temperatureRatio = clamp((temperatureC - 20) / Math.max(80, targetTemperatureC - 20), 0, 1);
    var rampRatio = clamp(rampRate / 300, .1, 1);
    var activeInput = segmentId !== 'cool';
    var state = segmentId === 'cool' ? 'cooling-source-off' : (segmentId === 'soak' ? 'peak-hold' : 'heating-input');
    var sourceActivityRatio = 0;
    if (segmentId === 'ramp') sourceActivityRatio = clamp(.62 + rampRatio * .18 + (1 - temperatureRatio) * .12, .62, .94);
    if (segmentId === 'soak') sourceActivityRatio = type === 'electric' ? .38 : (type === 'gas' ? .46 : .58);
    var activeFlameOpacityRatio = activeInput ? clamp(sourceActivityRatio * (.32 + temperatureRatio * .68), 0, .95) : 0;
    var fuelBedGlowRatio = 0;
    if (type === 'wood' || type === 'open') fuelBedGlowRatio = activeInput ? clamp(.16 + temperatureRatio * .5, .16, .68) : clamp(temperatureRatio * .62, 0, .62);
    var flowVisibilityRatio = segmentId === 'cool' ? clamp(.18 + temperatureRatio * .36, .18, .54) : (segmentId === 'soak' ? .72 : 1);
    var flowMotionSeconds = segmentId === 'cool' ? 4.2 : (segmentId === 'soak' ? 2.4 : 1.6);
    var sourceLabel = '';
    var sceneLabel = '';
    var activeFlowLabel = type === 'electric' ? 'element heat + chamber circulation' : (type === 'gas' ? 'burner → flue circulation' : (type === 'wood' ? 'firebox → flue circulation' : 'flame + plume circulation'));
    if (segmentId === 'cool') {
      if (type === 'electric') { sourceLabel = 'elements off'; sceneLabel = 'elements off · stored heat'; }
      if (type === 'gas') { sourceLabel = 'burner off'; sceneLabel = 'burner off · stored heat'; }
      if (type === 'wood') { sourceLabel = 'active flame ended'; sceneLabel = 'flame ended · firebox embers'; }
      if (type === 'open') { sourceLabel = 'active flame ended'; sceneLabel = 'flame ended · fuel-bed embers'; }
    } else if (segmentId === 'soak') {
      if (type === 'electric') { sourceLabel = 'elements cycling to hold peak'; sceneLabel = 'elements holding peak'; }
      if (type === 'gas') { sourceLabel = 'burner holding peak'; sceneLabel = 'burner holding peak'; }
      if (type === 'wood') { sourceLabel = 'firebox tending at peak'; sceneLabel = 'firebox tending at peak'; }
      if (type === 'open') { sourceLabel = 'fuel bed near peak'; sceneLabel = 'fuel bed near peak'; }
    } else {
      if (type === 'electric') { sourceLabel = 'elements active'; sceneLabel = 'elements active'; }
      if (type === 'gas') { sourceLabel = 'burner active'; sceneLabel = 'burner active'; }
      if (type === 'wood') { sourceLabel = 'firebox active'; sceneLabel = 'firebox active'; }
      if (type === 'open') { sourceLabel = 'open flame active'; sceneLabel = 'open flame active'; }
    }
    var summary = segmentId === 'cool'
      ? sourceLabel + '; chamber glow remains because the kiln and load retain heat, while slower routes show comparative equalization.'
      : (segmentId === 'soak'
        ? sourceLabel + '; reduced source glow distinguishes peak holding from ramp heating.'
        : sourceLabel + '; pulsing source glow marks active heat input while chamber glow tracks modeled temperature.');
    return {
      kilnType: type,
      segmentId: segmentId,
      state: state,
      activeInput: activeInput,
      temperatureC: temperatureC,
      targetTemperatureC: targetTemperatureC,
      storedHeatRatio: temperatureRatio,
      sourceActivityRatio: sourceActivityRatio,
      activeFlameOpacityRatio: activeFlameOpacityRatio,
      fuelBedGlowRatio: fuelBedGlowRatio,
      flowVisibilityRatio: flowVisibilityRatio,
      flowMotionSeconds: flowMotionSeconds,
      flowMode: segmentId === 'cool' ? 'stored-heat-equalization' : 'source-driven-circulation',
      flowLabel: segmentId === 'cool' ? 'stored heat equalizing + venting' : activeFlowLabel,
      sourceLabel: sourceLabel,
      sceneLabel: sceneLabel,
      summary: summary,
      note: 'Source brightness and motion are phase-aware teaching cues, not controller duty cycle, burner setting, fuel rate, draft, or safety evidence. This model treats the cooling segment as source-off stored-heat loss; it does not simulate powered cooling, relights, or individual kiln controls.'
    };
  }
  function estimateKilnMaterialState(vessel, sample, settings) {
    vessel = normalizeVessel(vessel);
    sample = sample || {};
    settings = settings || {};
    var body = materialProfile(vessel);
    var temperature = clamp(finite(sample.temperatureC, 20), 20, 1400);
    var peakTemperature = clamp(finite(settings.temperature, temperature), temperature, 1400);
    var segmentId = sample.segmentId || 'ramp';
    var completedPeak = segmentId === 'soak' || segmentId === 'cool';
    var referenceTemperature = completedPeak ? peakTemperature : temperature;
    var maturityProgress = clamp((referenceTemperature - 550) / Math.max(180, body.maturity - 550), 0, 1);
    var firingShrinkageFactor = vessel.stage === 'glazed' || vessel.stage === 'glaze-fired' ? 0.25 : 0.23;
    var firingShrinkagePct = body.shrinkage * firingShrinkageFactor * maturityProgress * 100;
    var glaze = glazeById(settings.glazeId || vessel.glazeId);
    var glazeEligible = vessel.stage === 'glazed' || vessel.stage === 'glaze-fired';
    var glazeDevelopmentPct = glazeEligible ? clamp((referenceTemperature - (glaze.maturity - 140)) / 180, 0, 1) * 100 : 0;
    var label = 'Warming the kiln load';
    var description = 'The ware is gaining heat; the model has not begun firing shrinkage.';
    if (segmentId === 'cool') {
      if (glazeDevelopmentPct > 20 && temperature > 850) {
        label = 'Glaze melt stiffening';
        description = 'The developed glaze is becoming more rigid while the body contracts.';
      } else if (temperature >= 500 && temperature <= 650) {
        label = 'Silica-change cooling zone';
        description = 'Even cooling through this region matters because different sections can contract at different times.';
      } else if (temperature > 200) {
        label = 'Thermal contraction';
        description = 'The fired body is contracting as stored heat leaves the kiln load.';
      } else {
        label = 'Cooling toward handling range';
        description = 'The material changes are retained, but the kiln is still treated as hot equipment.';
      }
    } else if (segmentId === 'soak') {
      label = glazeDevelopmentPct > 20 ? 'Glaze melt and body maturity' : 'Heatwork accumulating at peak';
      description = 'Time at peak adds heatwork even while the displayed temperature stays level.';
    } else if (temperature < 120) {
      label = 'Warming the kiln load';
      description = 'Temperature is rising through the earliest part of the schedule.';
    } else if (temperature < 250) {
      label = 'Residual water leaving';
      description = 'Slow early heating helps remaining physical water leave porous bone-dry ware.';
    } else if (temperature < 650) {
      label = 'Burnout and mineral change';
      description = 'Organics and chemically bound water change while the ceramic body remains porous.';
    } else if (temperature < 900) {
      label = 'Early sintering';
      description = 'Clay particles begin bonding more strongly and permanent firing shrinkage starts.';
    } else if (temperature < body.maturity - 70) {
      label = 'Body densifying';
      description = 'Porosity falls as bonding and glass formation advance toward the body range.';
    } else {
      label = glazeDevelopmentPct > 20 ? 'Glaze developing and body vitrifying' : 'Maturation and vitrification';
      description = 'The selected peak approaches the modeled maturity range for this clay body.';
    }
    return {
      label: label,
      description: description,
      temperatureC: temperature,
      maturityProgressPct: maturityProgress * 100,
      firingShrinkagePct: firingShrinkagePct,
      glazeDevelopmentPct: glazeDevelopmentPct,
      bodyColor: body.color,
      firedColor: body.fired,
      glazeColor: glaze.color
    };
  }
  function estimateKilnLoadEffects(settings) {
    settings = settings || {};
    var loadDensity = clamp(finite(settings.loadDensity, 55), 20, 95);
    var airAccess = clamp(finite(settings.airAccess, 60), 20, 100);
    var zoneSpreadMultiplier = clamp(1 + (loadDensity - 55) / 160 - (airAccess - 60) / 220, .65, 1.55);
    var heatAccessFactor = clamp(1 + (airAccess - 60) / 200 - (loadDensity - 55) / 180, .58, 1.35);
    var pieceCount = loadDensity < 40 ? 1 : (loadDensity < 75 ? 2 : 3);
    var label = zoneSpreadMultiplier > 1.24 ? 'crowded / restricted heat paths' : (zoneSpreadMultiplier < .82 ? 'open heat paths' : 'balanced heat access');
    return {
      loadDensity: loadDensity,
      airAccess: airAccess,
      zoneSpreadMultiplier: zoneSpreadMultiplier,
      heatAccessFactor: heatAccessFactor,
      coreLagMultiplier: 1 / heatAccessFactor,
      pieceCount: pieceCount,
      label: label,
      summary: Math.round(loadDensity) + '% relative ware load with ' + Math.round(airAccess) + '% air access gives ' + label + '.'
    };
  }
  function kilnHeatFlowGeometry(kilnType, settings) {
    settings = settings || {};
    var supportedTypes = ['electric', 'gas', 'wood', 'open'];
    var type = supportedTypes.indexOf(kilnType) >= 0 ? kilnType : 'electric';
    var loadEffects = estimateKilnLoadEffects(settings);
    var loadRatio = clamp((loadEffects.loadDensity - 20) / 75, 0, 1);
    var airRestrictionRatio = clamp((100 - loadEffects.airAccess) / 80, 0, 1);
    var restrictionRatio = clamp(loadRatio * .55 + airRestrictionRatio * .45, 0, 1);
    var pathwayOpennessRatio = 1 - restrictionRatio;
    var shieldingRatio = clamp(.18 + loadRatio * .52 + airRestrictionRatio * .30, .18, 1);
    var bypassGapPx = 14 + pathwayOpennessRatio * 22;
    var flowOpacity = .34 + pathwayOpennessRatio * .50;
    var strokeWidth = 2.4 + pathwayOpennessRatio * 1.8;
    var shadowOpacity = .06 + shieldingRatio * .34;
    var defaults = [155, 240, 315];
    var suppliedShelfYs = Array.isArray(settings.shelfFrontYs) ? settings.shelfFrontYs : [];
    var shelfFrontYs = defaults.map(function (fallback, index) { return clamp(finite(suppliedShelfYs[index], fallback), 100, 335); });
    var accessLabel = restrictionRatio < .28 ? 'open bypass channels' : (restrictionRatio < .68 ? 'moderate bypass channels' : 'restricted bypass channels');
    var shieldingLabel = shieldingRatio < .38 ? 'light shelf shielding' : (shieldingRatio < .72 ? 'moderate shelf shielding' : 'strong shelf shielding');
    var sourceMode = type === 'electric' ? 'distributed-elements' : (type === 'gas' ? 'burner-to-flue' : (type === 'wood' ? 'firebox-to-flue' : 'open-plume'));
    var mechanismLabel = type === 'electric' ? 'element radiation + buoyant circulation' : (type === 'gas' ? 'burner-to-flue hot-gas circulation' : (type === 'wood' ? 'firebox-to-flue hot-gas circulation' : 'open flame and plume exposure'));
    var shortLabel = type === 'electric' ? 'element heat + chamber circulation' : (type === 'gas' ? 'burner → flue circulation' : (type === 'wood' ? 'firebox → flue circulation' : 'open plume exposure'));
    var note = 'Arrows are schematic circulation routes, not gas velocity or computational fluid dynamics. Dark shelf-shadow bands mark reduced direct radiant line-of-sight; they do not predict cold spots because shelves and ware also absorb, conduct, and re-radiate heat.';
    if (type === 'open') {
      return {
        kilnType: type,
        enclosed: false,
        sourceMode: sourceMode,
        mechanismLabel: mechanismLabel,
        shortLabel: shortLabel,
        accessLabel: accessLabel,
        shieldingLabel: shieldingLabel,
        restrictionRatio: restrictionRatio,
        pathwayOpennessRatio: pathwayOpennessRatio,
        pathwayOpennessPct: pathwayOpennessRatio * 100,
        shieldingRatio: shieldingRatio,
        bypassGapPx: bypassGapPx,
        flowOpacity: flowOpacity,
        strokeWidth: strokeWidth,
        flowPaths: [],
        shelfShadows: [],
        summary: 'Open firing uses plume exposure rather than enclosed shelf-circulation geometry.',
        note: 'Open-firing plume paths are schematic and do not predict local atmosphere, flame contact, ash deposition, or temperature.'
      };
    }
    function number(value) { return Number(value).toFixed(1); }
    function point(x, y) { return number(x) + ' ' + number(y); }
    var flowPaths = [];
    var leftSideX = 148 - restrictionRatio * 10;
    var rightSideX = 412 + restrictionRatio * 10;
    if (type === 'electric') {
      flowPaths.push({
        id: 'left-wall-rise',
        kind: 'main',
        weight: 1.12,
        d: 'M' + point(leftSideX, shelfFrontYs[2] + 18) + ' C' + point(leftSideX - 18, shelfFrontYs[2] - 10) + ' ' + point(leftSideX - 10, shelfFrontYs[1] + 28) + ' ' + point(leftSideX, shelfFrontYs[1] + 10) + ' C' + point(leftSideX + 12, shelfFrontYs[1] - 12) + ' ' + point(leftSideX - 14, shelfFrontYs[0] + 28) + ' ' + point(leftSideX, shelfFrontYs[0] + 9) + ' C' + point(leftSideX + 10, shelfFrontYs[0] - 12) + ' ' + point(190, shelfFrontYs[0] - 38) + ' ' + point(230, shelfFrontYs[0] - 42)
      });
      flowPaths.push({
        id: 'right-wall-return',
        kind: 'main',
        weight: 1.12,
        d: 'M' + point(330, shelfFrontYs[0] - 42) + ' C' + point(378, shelfFrontYs[0] - 37) + ' ' + point(rightSideX - 10, shelfFrontYs[0] - 10) + ' ' + point(rightSideX, shelfFrontYs[0] + 10) + ' C' + point(rightSideX + 14, shelfFrontYs[0] + 30) + ' ' + point(rightSideX - 12, shelfFrontYs[1] - 10) + ' ' + point(rightSideX, shelfFrontYs[1] + 11) + ' C' + point(rightSideX + 12, shelfFrontYs[1] + 32) + ' ' + point(rightSideX + 18, shelfFrontYs[2] - 10) + ' ' + point(rightSideX, shelfFrontYs[2] + 18)
      });
      shelfFrontYs.forEach(function (shelfY, index) {
        var bayY = shelfY - 18 - pathwayOpennessRatio * 4;
        var leftStart = leftSideX + 5;
        var rightStart = rightSideX - 5;
        var leftToRight = index % 2 === 0;
        var d = leftToRight
          ? 'M' + point(leftStart, bayY + 6) + ' C' + point(leftStart + 58, bayY - bypassGapPx / 2) + ' ' + point(rightStart - 58, bayY + bypassGapPx / 2) + ' ' + point(rightStart, bayY - 6)
          : 'M' + point(rightStart, bayY - 6) + ' C' + point(rightStart - 58, bayY + bypassGapPx / 2) + ' ' + point(leftStart + 58, bayY - bypassGapPx / 2) + ' ' + point(leftStart, bayY + 6);
        flowPaths.push({ id: ['upper-bay', 'middle-bay', 'lower-bay'][index], kind: 'bay', weight: .9, d: d });
      });
    } else {
      var woodBias = type === 'wood' ? 12 : 0;
      var lowerBayY = shelfFrontYs[2] - 18 - pathwayOpennessRatio * 4;
      var middleBayY = shelfFrontYs[1] - 18 - pathwayOpennessRatio * 4;
      var upperBayY = shelfFrontYs[0] - 18 - pathwayOpennessRatio * 4;
      flowPaths.push({
        id: 'source-to-exhaust',
        kind: 'main',
        weight: 1.25,
        d: 'M' + point(type === 'wood' ? 82 : 96, 318) + ' C' + point(140 + woodBias, 320) + ' ' + point(160 - woodBias, lowerBayY + 14) + ' ' + point(208, lowerBayY) + ' C' + point(282 + woodBias, lowerBayY - bypassGapPx / 3) + ' ' + point(354, lowerBayY + bypassGapPx / 3) + ' ' + point(rightSideX, lowerBayY - 8) + ' C' + point(rightSideX + 20, middleBayY + 20) + ' ' + point(rightSideX + 14, middleBayY + 3) + ' ' + point(rightSideX - 5, middleBayY) + ' C' + point(342, middleBayY - bypassGapPx / 3) + ' ' + point(232 - woodBias, middleBayY + bypassGapPx / 3) + ' ' + point(leftSideX, middleBayY - 7) + ' C' + point(leftSideX - 18, upperBayY + 22) + ' ' + point(leftSideX - 12, upperBayY + 4) + ' ' + point(leftSideX + 10, upperBayY) + ' C' + point(230, upperBayY - bypassGapPx / 3) + ' ' + point(340 + woodBias, upperBayY + bypassGapPx / 3) + ' ' + point(rightSideX - 2, upperBayY - 8) + ' C' + point(rightSideX + 18, upperBayY - 20) + ' ' + point(438, 92) + ' ' + point(452, 70)
      });
      shelfFrontYs.forEach(function (shelfY, index) {
        var bayY = shelfY - 18 - pathwayOpennessRatio * 4;
        var reverse = index % 2 === 1;
        var left = leftSideX + 8;
        var right = rightSideX - 8;
        var d = reverse
          ? 'M' + point(right, bayY - 5) + ' C' + point(right - 74, bayY + bypassGapPx / 2) + ' ' + point(left + 74, bayY - bypassGapPx / 2) + ' ' + point(left, bayY + 5)
          : 'M' + point(left, bayY + 5) + ' C' + point(left + 74, bayY - bypassGapPx / 2) + ' ' + point(right - 74, bayY + bypassGapPx / 2) + ' ' + point(right, bayY - 5);
        flowPaths.push({ id: ['upper-bypass', 'middle-bypass', 'lower-bypass'][index], kind: 'bay', weight: .72, d: d });
      });
    }
    var shadowShiftX = type === 'electric' ? 0 : 8;
    var shelfShadows = shelfFrontYs.map(function (shelfY, index) {
      return {
        id: ['upper-shelf', 'middle-shelf', 'lower-shelf'][index],
        cx: 280 + shadowShiftX,
        cy: shelfY + 10,
        rx: 58 + shieldingRatio * 40 + index * 3,
        ry: 5 + shieldingRatio * 5,
        opacity: shadowOpacity
      };
    });
    return {
      kilnType: type,
      enclosed: true,
      sourceMode: sourceMode,
      mechanismLabel: mechanismLabel,
      shortLabel: shortLabel,
      accessLabel: accessLabel,
      shieldingLabel: shieldingLabel,
      restrictionRatio: restrictionRatio,
      pathwayOpennessRatio: pathwayOpennessRatio,
      pathwayOpennessPct: pathwayOpennessRatio * 100,
      shieldingRatio: shieldingRatio,
      bypassGapPx: bypassGapPx,
      flowOpacity: flowOpacity,
      strokeWidth: strokeWidth,
      flowPaths: flowPaths,
      shelfShadows: shelfShadows,
      summary: mechanismLabel + ' with ' + accessLabel + ', ' + shieldingLabel + ', and ' + Math.round(pathwayOpennessRatio * 100) + '% comparative pathway openness.',
      note: note
    };
  }
  function estimateWareCoreTemperature(vessel, sample, settings, zoneTemperature) {
    vessel = normalizeVessel(vessel);
    sample = sample || {};
    settings = settings || {};
    var body = materialProfile(vessel);
    var walls = vessel.thickness.slice(3);
    var averageWallCm = walls.reduce(function (sum, wall) { return sum + wall; }, 0) / Math.max(1, walls.length);
    var segmentId = sample.segmentId || 'ramp';
    var zoneC = clamp(finite(zoneTemperature, sample.temperatureC), 20, 1400);
    var rateCPerHour = segmentId === 'cool' ? clamp(finite(settings.coolingRate, 100), 30, 300) : clamp(finite(settings.ramp, 110), 30, 300);
    var thermalFactor = .55 + body.thermalSensitivity;
    var loadEffects = estimateKilnLoadEffects(settings);
    var steadyLagC = clamp(rateCPerHour * Math.pow(Math.max(.2, averageWallCm), 1.45) * thermalFactor / 16 * loadEffects.coreLagMultiplier, 0, 160);
    var lagC = steadyLagC;
    if (segmentId === 'soak') lagC *= 1 - .92 * clamp(finite(sample.segmentProgressPct, 0), 0, 100) / 100;
    var coreC = segmentId === 'cool' ? zoneC + lagC : zoneC - lagC;
    if (segmentId === 'cool') coreC = Math.min(coreC, Math.max(zoneC, clamp(finite(settings.temperature, zoneC), zoneC, 1400)));
    coreC = clamp(coreC, 20, 1400);
    var differenceC = coreC - zoneC;
    var surfaceTemperatureC = zoneC + differenceC * .18;
    var midWallTemperatureC = zoneC + differenceC * .58;
    var surfaceToCoreDifferenceC = coreC - surfaceTemperatureC;
    return {
      zoneTemperatureC: zoneC,
      surfaceTemperatureC: surfaceTemperatureC,
      midWallTemperatureC: midWallTemperatureC,
      coreTemperatureC: coreC,
      differenceC: differenceC,
      lagMagnitudeC: Math.abs(differenceC),
      surfaceToCoreDifferenceC: surfaceToCoreDifferenceC,
      surfaceToCoreGradientC: Math.abs(surfaceToCoreDifferenceC),
      averageWallCm: averageWallCm,
      rateCPerHour: rateCPerHour,
      loadDensity: loadEffects.loadDensity,
      airAccess: loadEffects.airAccess,
      heatAccessFactor: loadEffects.heatAccessFactor,
      direction: Math.abs(differenceC) < 1 ? 'near equilibrium' : (differenceC > 0 ? 'core hotter than zone' : 'core cooler than zone')
    };
  }
  function estimateWareThermalStress(vessel, sample, settings, coreModel) {
    vessel = normalizeVessel(vessel);
    sample = sample || {};
    settings = settings || {};
    var body = materialProfile(vessel);
    var core = coreModel || estimateWareCoreTemperature(vessel, sample, settings, finite(sample.temperatureC, 20));
    var segmentId = sample.segmentId || 'ramp';
    var segmentProgressPct = clamp(finite(sample.segmentProgressPct, 0), 0, 100);
    var zoneTemperatureC = clamp(finite(core.zoneTemperatureC, sample.temperatureC), 20, 1400);
    var activeRateCPerHour = segmentId === 'cool' ? clamp(finite(settings.coolingRate, 100), 30, 300) : clamp(finite(settings.ramp, 110), 30, 300);
    var phaseMotionFactor = segmentId === 'soak' ? clamp((100 - segmentProgressPct) / 100 * .22, 0, .22) : 1;
    var wallFactor = clamp(.72 + core.averageWallCm / 2.4, .85, 2.15);
    var quartzWindow = clamp(1 - Math.abs(zoneTemperatureC - 573) / 150, 0, 1);
    var lowTemperatureCoolingWindow = segmentId === 'cool' ? clamp(1 - Math.abs(zoneTemperatureC - 226) / 120, 0, 1) : 0;
    var transitionMultiplier = 1 + quartzWindow * .55 + lowTemperatureCoolingWindow * .4;
    var gradientContribution = core.surfaceToCoreGradientC * (.75 + body.thermalSensitivity) * wallFactor * 1.3;
    var rateContribution = activeRateCPerHour / 300 * body.thermalSensitivity * 16 * phaseMotionFactor;
    var openExposureMultiplier = settings.kilnType === 'open' ? 1.18 : 1;
    var stressPct = clamp((gradientContribution + rateContribution) * transitionMultiplier * openExposureMultiplier, 0, 100);
    var level = stressPct < 20 ? 'low transient stress' : (stressPct < 45 ? 'watch the gradient' : (stressPct < 70 ? 'high thermal stress' : 'severe thermal stress'));
    var tensionMode = core.surfaceToCoreGradientC < 1 ? 'near-equilibrium wall' : (core.surfaceToCoreDifferenceC > 0 ? 'surface tension while cooling' : (segmentId === 'soak' ? 'core tension during equalization' : 'core tension while heating'));
    var transitionLabel = quartzWindow >= .35 ? 'silica-change neighborhood near 573°C' : (lowTemperatureCoolingWindow >= .35 ? 'low-temperature silica-change neighborhood' : 'outside the highlighted silica-change windows');
    return {
      stressPct: stressPct,
      level: level,
      tensionMode: tensionMode,
      transitionLabel: transitionLabel,
      transitionStrengthPct: Math.max(quartzWindow, lowTemperatureCoolingWindow) * 100,
      zoneTemperatureC: zoneTemperatureC,
      surfaceToCoreGradientC: core.surfaceToCoreGradientC,
      averageWallCm: core.averageWallCm,
      activeRateCPerHour: activeRateCPerHour,
      bodyThermalSensitivity: body.thermalSensitivity,
      segmentId: segmentId,
      summary: Math.round(stressPct) + '% modeled transient stress: ' + level + ', ' + tensionMode + ', ' + transitionLabel + '.'
    };
  }
  function estimateWareThermalTrace(vessel, history, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    history = history || estimateThermalHistory(settings);
    var body = materialProfile(vessel);
    var walls = vessel.thickness.slice(3);
    var averageWallCm = walls.reduce(function (sum, wall) { return sum + wall; }, 0) / Math.max(1, walls.length);
    var loadEffects = estimateKilnLoadEffects(settings);
    var timeConstantHours = clamp(Math.pow(Math.max(.2, averageWallCm), 1.45) * (.55 + body.thermalSensitivity) / 16 * loadEffects.coreLagMultiplier, .006, .75);
    var progressValues = [];
    function addProgress(value) {
      value = clamp(finite(value, 0), 0, 100);
      if (!progressValues.some(function (existing) { return Math.abs(existing - value) < .0001; })) progressValues.push(value);
    }
    for (var index = 0; index <= 40; index++) addProgress(index * 2.5);
    var elapsedBoundary = 0;
    (history.segments || []).forEach(function (segment) {
      elapsedBoundary += Math.max(0, finite(segment.durationHours, 0));
      if (history.totalHours > 0) addProgress(elapsedBoundary / history.totalHours * 100);
    });
    progressValues.sort(function (a, b) { return a - b; });
    var points = [];
    var previousSample = null;
    var coreTemperatureC = finite(history.roomTemperature, 20);
    var maximumLagPoint = null;
    var maximumGradientPoint = null;
    progressValues.forEach(function (progressPct) {
      var sample = sampleThermalHistory(history, progressPct);
      var zoneTemperatureC = clamp(finite(sample.temperatureC, 20), 20, 1400);
      var rateCPerHour = 0;
      if (previousSample) {
        var elapsedStep = Math.max(0, sample.elapsedHours - previousSample.elapsedHours);
        if (elapsedStep > 0) {
          var previousZoneC = clamp(finite(previousSample.temperatureC, 20), 20, 1400);
          rateCPerHour = (zoneTemperatureC - previousZoneC) / elapsedStep;
          var decay = Math.exp(-elapsedStep / timeConstantHours);
          coreTemperatureC = zoneTemperatureC - rateCPerHour * timeConstantHours + (coreTemperatureC - previousZoneC + rateCPerHour * timeConstantHours) * decay;
        }
      } else {
        coreTemperatureC = zoneTemperatureC;
      }
      coreTemperatureC = clamp(coreTemperatureC, 20, 1400);
      var differenceC = coreTemperatureC - zoneTemperatureC;
      var surfaceTemperatureC = zoneTemperatureC + differenceC * .18;
      var midWallTemperatureC = zoneTemperatureC + differenceC * .58;
      var surfaceToCoreDifferenceC = coreTemperatureC - surfaceTemperatureC;
      var coreModel = {
        zoneTemperatureC: zoneTemperatureC,
        surfaceTemperatureC: surfaceTemperatureC,
        midWallTemperatureC: midWallTemperatureC,
        coreTemperatureC: coreTemperatureC,
        differenceC: differenceC,
        lagMagnitudeC: Math.abs(differenceC),
        surfaceToCoreDifferenceC: surfaceToCoreDifferenceC,
        surfaceToCoreGradientC: Math.abs(surfaceToCoreDifferenceC),
        averageWallCm: averageWallCm,
        rateCPerHour: Math.abs(rateCPerHour),
        loadDensity: loadEffects.loadDensity,
        airAccess: loadEffects.airAccess,
        heatAccessFactor: loadEffects.heatAccessFactor,
        direction: Math.abs(differenceC) < 1 ? 'near equilibrium' : (differenceC > 0 ? 'core hotter than zone' : 'core cooler than zone')
      };
      var stress = estimateWareThermalStress(vessel, sample, settings, coreModel);
      var point = Object.assign({}, sample, coreModel, {
        sample: Object.assign({}, sample),
        stress: stress,
        stressPct: stress.stressPct,
        tensionMode: stress.tensionMode
      });
      points.push(point);
      if (!maximumLagPoint || point.lagMagnitudeC > maximumLagPoint.lagMagnitudeC) maximumLagPoint = point;
      if (!maximumGradientPoint || point.surfaceToCoreGradientC > maximumGradientPoint.surfaceToCoreGradientC) maximumGradientPoint = point;
      previousSample = sample;
    });
    maximumLagPoint = maximumLagPoint || points[0] || null;
    maximumGradientPoint = maximumGradientPoint || points[0] || null;
    var maximumLagC = maximumLagPoint ? maximumLagPoint.lagMagnitudeC : 0;
    var maximumLagRelation = !maximumLagPoint || maximumLagPoint.lagMagnitudeC < 1 ? 'near chamber temperature' : (maximumLagPoint.differenceC > 0 ? 'hotter than the chamber' : 'cooler than the chamber');
    return {
      points: points,
      timeConstantHours: timeConstantHours,
      timeConstantMinutes: timeConstantHours * 60,
      averageWallCm: averageWallCm,
      maximumLagC: maximumLagC,
      maximumLagPoint: maximumLagPoint,
      maximumGradientC: maximumGradientPoint ? maximumGradientPoint.surfaceToCoreGradientC : 0,
      maximumGradientPoint: maximumGradientPoint,
      summary: 'Largest modeled chamber-to-core difference ' + Math.round(maximumLagC) + '°C during ' + (maximumLagPoint ? maximumLagPoint.phaseLabel.toLowerCase() : 'the schedule') + ' near chamber ' + Math.round(maximumLagPoint ? maximumLagPoint.zoneTemperatureC : 20) + '°C, with the core ' + maximumLagRelation + '.',
      note: 'Continuous first-order comparative heat-response model; not a thermocouple, finite-element analysis, or crack prediction.'
    };
  }
  function sampleWareThermalTrace(trace, progressPct, zoneTemperature) {
    var points = trace && Array.isArray(trace.points) ? trace.points : [];
    if (!points.length) return null;
    var progress = clamp(finite(progressPct, 0), 0, 100);
    var before = points[0];
    var after = points[points.length - 1];
    for (var index = 1; index < points.length; index++) {
      if (progress <= points[index].progressPct) {
        before = points[index - 1];
        after = points[index];
        break;
      }
      before = points[index];
    }
    if (progress <= points[0].progressPct) after = points[0];
    if (progress >= points[points.length - 1].progressPct) before = after = points[points.length - 1];
    var span = Math.max(.000001, after.progressPct - before.progressPct);
    var ratio = before === after ? 0 : clamp((progress - before.progressPct) / span, 0, 1);
    function mix(field) { return finite(before[field], 0) + (finite(after[field], finite(before[field], 0)) - finite(before[field], 0)) * ratio; }
    var sampled = {
      progressPct: progress,
      elapsedHours: mix('elapsedHours'),
      totalHours: mix('totalHours'),
      segmentId: ratio < .5 ? before.segmentId : after.segmentId,
      phaseLabel: ratio < .5 ? before.phaseLabel : after.phaseLabel,
      segmentProgressPct: mix('segmentProgressPct'),
      zoneTemperatureC: mix('zoneTemperatureC'),
      surfaceTemperatureC: mix('surfaceTemperatureC'),
      midWallTemperatureC: mix('midWallTemperatureC'),
      coreTemperatureC: mix('coreTemperatureC'),
      averageWallCm: mix('averageWallCm'),
      rateCPerHour: mix('rateCPerHour'),
      loadDensity: mix('loadDensity'),
      airAccess: mix('airAccess'),
      heatAccessFactor: mix('heatAccessFactor'),
      stressPct: mix('stressPct'),
      tensionMode: ratio < .5 ? before.tensionMode : after.tensionMode,
      timeConstantHours: finite(trace.timeConstantHours, 0)
    };
    if (typeof zoneTemperature === 'number' && isFinite(zoneTemperature)) {
      var zoneOffsetC = clamp(zoneTemperature, 20, 1400) - sampled.zoneTemperatureC;
      sampled.zoneTemperatureC = clamp(sampled.zoneTemperatureC + zoneOffsetC, 20, 1400);
      sampled.surfaceTemperatureC = clamp(sampled.surfaceTemperatureC + zoneOffsetC, 20, 1400);
      sampled.midWallTemperatureC = clamp(sampled.midWallTemperatureC + zoneOffsetC, 20, 1400);
      sampled.coreTemperatureC = clamp(sampled.coreTemperatureC + zoneOffsetC, 20, 1400);
    }
    sampled.differenceC = sampled.coreTemperatureC - sampled.zoneTemperatureC;
    sampled.lagMagnitudeC = Math.abs(sampled.differenceC);
    sampled.surfaceToCoreDifferenceC = sampled.coreTemperatureC - sampled.surfaceTemperatureC;
    sampled.surfaceToCoreGradientC = Math.abs(sampled.surfaceToCoreDifferenceC);
    sampled.direction = Math.abs(sampled.differenceC) < 1 ? 'near equilibrium' : (sampled.differenceC > 0 ? 'core hotter than zone' : 'core cooler than zone');
    return sampled;
  }
  function estimateScheduleThermalStress(vessel, history, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    history = history || estimateThermalHistory(settings);
    var peakStress = null;
    var peakSample = null;
    var trace = estimateWareThermalTrace(vessel, history, settings);
    trace.points.forEach(function (point) {
      var sample = point.sample;
      var stress = point.stress;
      if (!peakStress || stress.stressPct > peakStress.stressPct) {
        peakStress = stress;
        peakSample = sample;
      }
    });
    peakStress = peakStress || estimateWareThermalStress(vessel, {}, settings);
    peakSample = peakSample || sampleThermalHistory(history, 0);
    return {
      peakStressPct: peakStress.stressPct,
      peakStress: peakStress,
      peakSample: peakSample,
      trace: trace,
      summary: 'Peak modeled transient stress ' + Math.round(peakStress.stressPct) + '% (' + peakStress.level + ') during ' + peakSample.phaseLabel.toLowerCase() + ' near ' + Math.round(peakSample.temperatureC) + '°C.'
    };
  }
  function estimateThermalTransitionWindows(history, vessel) {
    history = history || estimateThermalHistory({});
    vessel = normalizeVessel(vessel || makeVessel('stoneware', 'bowl'));
    var body = materialProfile(vessel);
    var segments = Array.isArray(history.segments) ? history.segments : [];
    var totalHours = Math.max(.0001, finite(history.totalHours, 0));
    var definitions = [
      { id: 'silica-heat', segmentId: 'ramp', label: 'Silica-change neighborhood · heat-up', shortLabel: '573° heat-up', entryC: 500, exitC: 650 },
      { id: 'silica-cool', segmentId: 'cool', label: 'Silica-change neighborhood · cool-down', shortLabel: '573° cool-down', entryC: 650, exitC: 500 },
      { id: 'low-silica-cool', segmentId: 'cool', label: 'Low-temperature silica-change neighborhood · cool-down', shortLabel: 'low-temp cool', entryC: 300, exitC: 150 }
    ];
    var windows = [];
    var cursorHours = 0;
    segments.forEach(function (segment) {
      var durationHours = Math.max(0, finite(segment.durationHours, 0));
      definitions.filter(function (definition) { return definition.segmentId === segment.id; }).forEach(function (definition) {
        var segmentStartC = finite(segment.startC, 20);
        var segmentEndC = finite(segment.endC, segmentStartC);
        var minimumC = Math.min(segmentStartC, segmentEndC);
        var maximumC = Math.max(segmentStartC, segmentEndC);
        var entryC = clamp(definition.entryC, minimumC, maximumC);
        var exitC = clamp(definition.exitC, minimumC, maximumC);
        if (Math.abs(entryC - exitC) < 1 || Math.abs(segmentEndC - segmentStartC) < 1) return;
        var entryRatio = clamp((entryC - segmentStartC) / (segmentEndC - segmentStartC), 0, 1);
        var exitRatio = clamp((exitC - segmentStartC) / (segmentEndC - segmentStartC), 0, 1);
        var entryHours = cursorHours + durationHours * entryRatio;
        var exitHours = cursorHours + durationHours * exitRatio;
        var startHours = Math.min(entryHours, exitHours);
        var endHours = Math.max(entryHours, exitHours);
        windows.push({
          id: definition.id,
          label: definition.label,
          shortLabel: definition.shortLabel,
          direction: segment.id === 'cool' ? 'cooling' : 'heating',
          startTemperatureC: Math.min(entryC, exitC),
          endTemperatureC: Math.max(entryC, exitC),
          startElapsedHours: startHours,
          endElapsedHours: endHours,
          startProgressPct: startHours / totalHours * 100,
          endProgressPct: endHours / totalHours * 100,
          bodySensitivityPct: body.thermalSensitivity * 100,
          note: definition.label + ' is a comparative teaching band; exact mineral changes depend on the clay recipe.'
        });
      });
      cursorHours += durationHours;
    });
    return windows;
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
    var thermalTransitionWindows = estimateThermalTransitionWindows(thermalHistory, vessel);
    var fired = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
    var thermalStressSettings = { temperature: target, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, loadDensity: finite(settings.loadDensity, finite(settings.kilnLoadDensity, 55)), airAccess: finite(settings.airAccess, finite(settings.kilnAirAccess, 60)) };
    var thermalStress = estimateScheduleThermalStress(vessel, thermalHistory, thermalStressSettings);
    var wareThermalTrace = thermalStress.trace;
    var thermalRisk = thermalStress.peakStressPct;
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
      thermalTransitionWindows: thermalTransitionWindows,
      thermalStress: thermalStress,
      wareThermalTrace: wareThermalTrace,
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
    var handSupport = clamp(finite(settings.handSupport, 0), 0, 100) / 100;
    var lubrication = clamp(finite(settings.lubrication, 30), 0, 100) / 100;
    var excessLubrication = clamp((lubrication - 0.72) / 0.28, 0, 1);
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
      var supportBenefit = handSupport * (thin * 0.1 + overhang * 0.06);
      var signals = [
        { id: 'thin-wall', label: 'thin wall', strength: thin * 0.62 },
        { id: 'outward-overhang', label: 'outward overhang', strength: overhang * 0.22 },
        { id: 'thick-section', label: 'thick section', strength: thick * 0.14 },
        { id: 'wall-irregularity', label: 'wall irregularity', strength: irregularity * 0.12 },
        { id: 'coil-joint', label: 'weak coil joint', strength: coilJoint * 0.16 },
        { id: 'wet-clay', label: 'very wet clay', strength: wetWeakness * 0.08 },
        { id: 'low-compression', label: 'low compression', strength: (1 - vessel.compression) * 0.08 },
        { id: 'body-plasticity', label: 'lower body plasticity', strength: (1 - body.plasticity) * 0.08 },
        { id: 'excess-lubrication', label: 'excess lubrication', strength: excessLubrication * 0.1 },
        { id: 'collapsed-form', label: 'existing collapse', strength: vessel.collapsed ? 0.7 : 0 }
      ];
      var dominantSignal = signals[0];
      for (var signalIndex = 1; signalIndex < signals.length; signalIndex++) if (signals[signalIndex].strength > dominantSignal.strength) dominantSignal = signals[signalIndex];
      var risk = clamp(
        thin * 0.62 + overhang * 0.22 + thick * 0.14 + irregularity * 0.12 + wetWeakness * 0.08 +
        (1 - vessel.compression) * 0.08 + coilJoint * 0.16 + (1 - body.plasticity) * 0.08 + excessLubrication * 0.1 - supportBenefit + (vessel.collapsed ? 0.7 : 0),
        0, 1
      );
      risks.push({
        index: i,
        wallCm: wall,
        radiusCm: radius,
        outwardSlope: outwardSlope,
        thinRisk: thin,
        thickRisk: thick,
        overhangRisk: overhang,
        irregularity: irregularity,
        dominantSignalId: dominantSignal.id,
        dominantSignalLabel: dominantSignal.label,
        risk: risk,
        status: risk >= 0.67 ? 'High local risk' : (risk >= 0.4 ? 'Watch this ring' : 'Lower local risk')
      });
    }
    return risks;
  }
  function summarizeRingRiskProfile(vessel, settings) {
    var risks = analyzeRingRisks(vessel, settings);
    var critical = risks[0];
    var highCount = 0;
    var watchCount = 0;
    for (var i = 0; i < risks.length; i++) {
      if (risks[i].risk > critical.risk) critical = risks[i];
      if (risks[i].risk >= 0.67) highCount += 1;
      else if (risks[i].risk >= 0.4) watchCount += 1;
    }
    var lowerCount = Math.max(0, risks.length - highCount - watchCount);
    return {
      rings: risks,
      criticalRing: critical.index,
      criticalRiskPct: critical.risk * 100,
      criticalStatus: critical.status,
      criticalSignalId: critical.dominantSignalId,
      criticalSignalLabel: critical.dominantSignalLabel,
      highCount: highCount,
      watchCount: watchCount,
      lowerCount: lowerCount,
      summary: 'Ring ' + (critical.index + 1) + ' carries the highest comparative local signal at ' + Math.round(critical.risk * 100) + '%, led by ' + critical.dominantSignalLabel + '. The profile contains ' + highCount + ' high, ' + watchCount + ' watch, and ' + lowerCount + ' lower-signal rings.',
      note: 'Ring risk combines modeled wall thickness, slope, irregularity, moisture, compression, material, support, and handling inputs. It is not measured stress, failure probability, a safe-thickness limit, or studio safety guidance.'
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
    var handSupport = clamp(finite(settings.handSupport, 0), 0, 100) / 100;
    var lubrication = clamp(finite(settings.lubrication, 30), 0, 100) / 100;
    var excessLubrication = clamp((lubrication - 0.72) / 0.28, 0, 1);
    var slenderness = vessel.heightCm / Math.max(1, maxRadius * 2);
    var ringHeight = vessel.heightCm / Math.max(1, RING_COUNT - 1);
    var maxOutwardSlope = 0;
    for (var ring = 4; ring < RING_COUNT; ring++) maxOutwardSlope = Math.max(maxOutwardSlope, Math.max(0, vessel.radii[ring] - vessel.radii[ring - 1]) / Math.max(0.1, ringHeight));
    var overhangRisk = clamp((maxOutwardSlope - 0.48) / 1.2, 0, 1);
    var jointRisk = clamp(1 - vessel.coilBond, 0, 1) * (settings.method === 'coil' ? 1 : 0.35);
    var centrifugal = Math.pow(rpm / 100, 2) * (maxRadius / 9) * (0.45 + vessel.heightCm / 36 * 0.7);
    var thinRisk = clamp((0.48 - minWall) / 0.48, 0, 1);
    var wetWeakness = clamp((vessel.moisture - 0.72) / 0.28, 0, 1);
    var supportBenefit = handSupport * (thinRisk * 8 + overhangRisk * 5);
    var stability = 100 - vessel.wobble * 40 - centrifugal * (26 + wetWeakness * 12) - thinRisk * 36 - Math.max(0, slenderness - 1.55) * 27 - overhangRisk * 20 - jointRisk * 24 - (1 - vessel.compression) * 11 + supportBenefit - excessLubrication * 9 - (vessel.collapsed ? 75 : 0);
    stability = clamp(stability, 0, 100);
    var capacity = vesselCapacity(vessel);
    var openingFloor = analyzeOpeningFloor(vessel);
    var body = materialProfile(vessel);
    var ringRiskProfile = summarizeRingRiskProfile(vessel, settings);
    var volume = vesselVolume(vessel);
    var shape = slenderness > 1.7 ? 'tall vessel' : (vessel.radii[RING_COUNT - 1] < maxRadius * 0.62 ? 'necked jar' : (vessel.heightCm < maxRadius * 2 ? 'bowl form' : 'cylinder form'));
    return {
      volumeCm3: volume,
      massG: volume * body.density,
      capacityMl: capacity,
      floorThicknessCm: openingFloor.floorThicknessCm,
      cavityDepthCm: openingFloor.cavityDepthCm,
      openingFloorState: openingFloor.state,
      openingFloorRing: openingFloor.floorRing,
      minWallCm: minWall,
      maxWallCm: maxWall,
      averageWallCm: average,
      uniformity: uniformity,
      stability: stability,
      risk: 100 - stability,
      maxRadiusCm: maxRadius,
      slenderness: slenderness,
      overhangRisk: overhangRisk * 100,
      handSupport: handSupport * 100,
      lubrication: lubrication * 100,
      contactSpan: Math.round(clamp(finite(settings.contactSpan, 9), 3, 11)),
      compression: vessel.compression * 100,
      coilBond: vessel.coilBond * 100,
      ringRiskProfile: ringRiskProfile,
      criticalRing: ringRiskProfile.criticalRing,
      maxRingRisk: ringRiskProfile.criticalRiskPct,
      criticalRingSignal: ringRiskProfile.criticalSignalLabel,
      highRiskRingCount: ringRiskProfile.highCount,
      watchRiskRingCount: ringRiskProfile.watchCount,
      shape: shape,
      status: vessel.collapsed ? 'Collapsed' : (stability >= 75 ? 'Stable' : (stability >= 48 ? 'Watch closely' : 'High collapse risk'))
    };
  }
  function analyzeFailureContributors(vessel, settings) {
    vessel = normalizeVessel(vessel);
    settings = settings || {};
    var defects = copyArray(vessel.defects);
    var hasFailure = !!vessel.collapsed || defects.length > 0;
    if (!hasFailure) return { ready: false, eventLabel: 'No modeled failure', contributors: [], defects: [] };
    var stats = analyzeVessel(vessel, settings);
    var body = materialProfile(vessel);
    var contributors = [];
    function add(id, label, evidence, action, severity) {
      if (contributors.some(function (item) { return item.id === id; })) return;
      contributors.push({ id: id, label: label, evidence: evidence, action: action, severity: clamp(finite(severity, 0), 0, 100) });
    }
    var structural = vessel.collapsed || defects.indexOf('structural collapse') >= 0;
    var openingFailure = defects.indexOf('base puncture') >= 0;
    var drying = defects.indexOf('drying crack') >= 0 || defects.indexOf('coil separation') >= 0 || defects.indexOf('steam crack') >= 0;
    var thermal = defects.indexOf('thermal crack') >= 0 || defects.indexOf('dunting crack') >= 0 || defects.indexOf('body deformation') >= 0 || defects.indexOf('uneven heatwork') >= 0;
    var glaze = defects.some(function (defect) { return ['underfired glaze', 'running glaze', 'thin glaze coverage', 'crazing risk', 'shivering risk'].indexOf(defect) >= 0; });
    var maturity = defects.some(function (defect) { return ['underfired bisque', 'underfired body', 'overfired body'].indexOf(defect) >= 0; });
    if (structural) {
      if (finite(settings.pressure, 48) >= 68) add('pressure', 'High forming pressure', Math.round(finite(settings.pressure, 48)) + '% hand-pressure setting increased deformation.', 'Undo to the safe checkpoint, then reduce pressure and repeat at the same ring.', finite(settings.pressure, 48));
      if (settings.method !== 'coil' && finite(settings.rpm, 58) >= 72) add('rpm', 'High wheel speed', Math.round(finite(settings.rpm, 58)) + ' RPM increased the modeled centrifugal load.', 'Lower wheel speed while holding pressure and work zone constant.', finite(settings.rpm, 58) / 1.2);
      if (vessel.moisture >= 0.78) add('moisture', 'Very soft clay', Math.round(vessel.moisture * 100) + '% modeled moisture reduced wall support.', 'Compare the same move at a slightly lower moisture setting.', vessel.moisture * 100);
      if (stats.minWallCm < 0.55) add('thin-wall', 'Thin load-bearing wall', 'The minimum modeled wall is ' + stats.minWallCm.toFixed(2) + ' cm.', 'Support or thicken the vulnerable zone before adding height or outward volume.', clamp((0.7 - stats.minWallCm) / 0.7 * 100, 0, 100));
      if (stats.overhangRisk >= 22) add('overhang', 'Unsupported outward profile', Math.round(stats.overhangRisk) + '% modeled overhang load concentrated stress above the belly.', 'Collar or compress the shoulder before extending the form.', stats.overhangRisk);
      if (stats.handSupport < 35 && (stats.minWallCm < 0.68 || stats.overhangRisk >= 18)) add('hand-support', 'Low inside-hand support', Math.round(stats.handSupport) + '% inside support left exterior force less balanced.', 'Repeat the move with more inside-hand support while holding pressure and wheel speed constant.', 70 - stats.handSupport);
      if (stats.lubrication > 78) add('lubrication', 'Excess surface lubrication', Math.round(stats.lubrication) + '% lubrication reduced control and softened the contact zone.', 'Use less water or slip and repeat at the same support, pressure, and wheel speed.', stats.lubrication - 12);
      if (vessel.centered < 65 || vessel.wobble > 0.42) add('centering', 'Centering and wobble', Math.round(vessel.centered) + '% centered with ' + Math.round(vessel.wobble * 100) + '% wobble.', 'Center the clay before repeating the shaping move.', Math.max(100 - vessel.centered, vessel.wobble * 100));
      if (settings.method === 'coil' && stats.coilBond < 58) add('coil-bond', 'Weak coil consolidation', Math.round(stats.coilBond) + '% modeled coil bond reduced continuity.', 'Paddle or smooth the joint before adding another coil.', 100 - stats.coilBond);
    }
    if (openingFailure) {
      var openingFloor = analyzeOpeningFloor(vessel);
      add('base-puncture', 'Opening reached the modeled base', openingFloor.summary, 'Undo to the previous checkpoint, focus the cavity floor, and compare one gentler or shallower opening pass.', 92);
    }
    if (drying) {
      var dryingRisk = estimateDryingRisk(vessel, settings) * 100;
      add('drying', 'Uneven or aggressive drying', Math.round(dryingRisk) + '% comparative drying-risk signal under the selected humidity and drying speed.', 'Slow drying, support the form, and compare the same geometry under one changed condition.', dryingRisk);
      if (stats.uniformity < 78) add('uniformity', 'Wall-thickness variation', Math.round(stats.uniformity) + '% wall uniformity implies uneven shrinkage demand.', 'Return to a safe wet or leather-hard checkpoint and regularize the wall.', 100 - stats.uniformity);
      if (defects.indexOf('coil separation') >= 0) add('coil-separation', 'Unconsolidated coil joint', Math.round(stats.coilBond) + '% modeled bond was carried into drying.', 'Compress each joint before the next drying trial.', 100 - stats.coilBond);
    }
    if (thermal) {
      if (finite(settings.ramp, 110) > 170) add('ramp', 'Fast heating ramp', Math.round(finite(settings.ramp, 110)) + '°C/h increased the modeled thermal-gradient signal.', 'Save a comparison schedule with a slower ramp.', clamp((finite(settings.ramp, 110) - 130) / 1.7, 0, 100));
      if (finite(settings.coolingRate, 100) * body.thermalSensitivity > 82) add('cooling', 'Fast cooling for this body', Math.round(finite(settings.coolingRate, 100)) + '°C/h interacted with the ' + body.name + ' thermal-sensitivity proxy.', 'Compare a slower cooling schedule while holding peak heatwork constant.', clamp(finite(settings.coolingRate, 100) * body.thermalSensitivity, 0, 100));
      if (defects.indexOf('uneven heatwork') >= 0) add('kiln-uniformity', 'Uneven open-firing heatwork', 'The simplified open-firing model adds a temperature-uniformity penalty.', 'Treat the result as a firing-location question and compare witness-cone evidence in a real supervised firing.', 72);
    }
    if (maturity) {
      var effectiveTemperature = vessel.lastHeatwork ? finite(vessel.lastHeatwork.effectiveTemp, body.maturity) : finite(settings.temperature, body.maturity);
      add('maturity', 'Body maturity mismatch', 'Modeled effective heatwork was about ' + Math.round(effectiveTemperature) + '°C versus the ' + body.name + ' reference near ' + Math.round(body.maturity) + '°C.', 'Compare a schedule nearer the body range; use real witness cones and manufacturer guidance in a studio.', clamp(Math.abs(effectiveTemperature - body.maturity) / 2, 0, 100));
    }
    if (glaze) {
      var glazeOutcome = vessel.lastGlazeOutcome || {};
      if (defects.indexOf('running glaze') >= 0) add('glaze-run', 'Excess melt or application thickness', Math.round(finite(vessel.glazeThickness, 50)) + '% application thickness combined with the selected heatwork.', 'Use a test tile and compare one lower thickness or heatwork setting.', Math.max(65, finite(glazeOutcome.runRiskPct, 0)));
      if (defects.indexOf('thin glaze coverage') >= 0) add('glaze-thin', 'Thin glaze coverage', Math.round(finite(vessel.glazeThickness, 50)) + '% application thickness left a sparse modeled layer.', 'Compare a bounded test tile at a slightly higher application thickness.', 62);
      if (defects.indexOf('crazing risk') >= 0 || defects.indexOf('shivering risk') >= 0) add('glaze-fit', 'Glaze–body expansion mismatch', 'The modeled expansion gap is ' + finite(glazeOutcome.fitGap, 0).toFixed(2) + '.', 'Compare another glaze–body pairing on supervised test tiles.', Math.max(68, 100 - finite(glazeOutcome.fitScore, 100)));
      if (defects.indexOf('underfired glaze') >= 0) add('glaze-melt', 'Insufficient glaze heatwork', 'The selected heatwork remained below the modeled glaze window.', 'Compare a schedule closer to the glaze range without changing application thickness.', 70);
    }
    if (!contributors.length) add('recorded-flags', 'Recorded model flags', defects.join(', ') || 'The vessel entered a modeled failure state.', 'Return to a safe checkpoint and change one input before repeating.', 55);
    contributors.sort(function (a, b) { return b.severity - a.severity; });
    var eventLabel = structural ? 'Structural collapse' : (openingFailure ? 'Opening-floor failure' : (drying ? 'Drying failure' : (thermal ? 'Thermal failure' : (glaze ? 'Glaze-surface failure' : (maturity ? 'Maturation mismatch' : 'Modeled defect')))));
    var primary = contributors[0];
    return {
      ready: true,
      eventLabel: eventLabel,
      contributors: contributors.slice(0, 4),
      defects: defects,
      criticalRing: stats.criticalRing,
      responseLabel: 'Ring ' + (stats.criticalRing + 1) + ' carried the highest local signal at ' + Math.round(stats.maxRingRisk) + '%.',
      outcomeLabel: vessel.lastOutcome || (defects.length ? defects.join(', ') : eventLabel),
      primaryCause: primary.label,
      primaryAction: primary.action
    };
  }
  function potteryFormingTarget(tool, requestedRing) {
    var toolId = String(tool || 'shape');
    var requested = Math.round(clamp(finite(requestedRing, RING_COUNT * .55), 0, RING_COUNT - 1));
    if (toolId === 'center') {
      return { mode: 'whole-form', requestedRing: requested, ring: Math.round((RING_COUNT - 1) * .44), minRing: 0, maxRing: RING_COUNT - 1, zoneRingCount: RING_COUNT, label: 'whole modeled form' };
    }
    if (toolId === 'add-coil') {
      return { mode: 'rim', requestedRing: requested, ring: RING_COUNT - 1, minRing: RING_COUNT - 5, maxRing: RING_COUNT - 1, zoneRingCount: 5, label: 'top five modeled rim rings' };
    }
    if (toolId === 'trim') {
      var trimMaxRing = Math.max(1, Math.floor(RING_COUNT * .34) - 1);
      return { mode: 'lower-zone', requestedRing: requested, ring: Math.round(clamp(requested, 1, trimMaxRing)), minRing: 1, maxRing: trimMaxRing, zoneRingCount: trimMaxRing, label: 'lower exterior rings 2–' + (trimMaxRing + 1) };
    }
    return { mode: 'selected-ring', requestedRing: requested, ring: requested, minRing: 0, maxRing: RING_COUNT - 1, zoneRingCount: RING_COUNT, label: 'selected work ring' };
  }
  function estimateFormingDisplacement(beforeVessel, afterVessel, ringIndex, tool) {
    var before = normalizeVessel(beforeVessel);
    var after = normalizeVessel(afterVessel, before.clayBody);
    var activeTool = String(tool || 'shape');
    var target = potteryFormingTarget(activeTool, ringIndex);
    var requestedRing = target.requestedRing;
    var sampleRing = activeTool === 'add-coil' ? RING_COUNT - 2 : target.ring;
    var beforeOuter = before.radii[sampleRing];
    var afterOuter = after.radii[sampleRing];
    var beforeInner = Math.max(0, beforeOuter - before.thickness[sampleRing]);
    var afterInner = Math.max(0, afterOuter - after.thickness[sampleRing]);
    var outerDeltaCm = afterOuter - beforeOuter;
    var innerDeltaCm = afterInner - beforeInner;
    var wallDeltaCm = after.thickness[sampleRing] - before.thickness[sampleRing];
    var heightDeltaCm = after.heightCm - before.heightCm;
    var clayVolumeDeltaCm3 = vesselVolume(after) - vesselVolume(before);
    var threshold = .005;
    var changes = [];
    if (activeTool === 'add-coil' && clayVolumeDeltaCm3 > .5) changes.push('clay is added at the rim');
    if (activeTool === 'trim' && clayVolumeDeltaCm3 < -.5) changes.push('clay is removed from the lower exterior');
    if (Math.abs(outerDeltaCm) >= threshold) changes.push('outer wall moves ' + Math.abs(outerDeltaCm).toFixed(2) + ' cm ' + (outerDeltaCm > 0 ? 'outward' : 'inward'));
    if (Math.abs(innerDeltaCm) >= threshold) changes.push('cavity ' + (innerDeltaCm > 0 ? 'widens' : 'narrows') + ' ' + Math.abs(innerDeltaCm).toFixed(2) + ' cm');
    if (Math.abs(wallDeltaCm) >= threshold) changes.push('wall ' + (wallDeltaCm > 0 ? 'thickens' : 'thins') + ' ' + Math.abs(wallDeltaCm).toFixed(2) + ' cm');
    if (Math.abs(heightDeltaCm) >= threshold) changes.push('height ' + (heightDeltaCm > 0 ? 'rises' : 'falls') + ' ' + Math.abs(heightDeltaCm).toFixed(2) + ' cm');
    if (!changes.length && activeTool === 'center') changes.push('the rotating profile averages toward neighboring rings');
    if (!changes.length && (activeTool === 'smooth' || activeTool === 'paddle')) changes.push('nearby rings become more even with little local displacement');
    if (!changes.length) changes.push('little measurable displacement is predicted at this ring');
    return {
      requestedRing: requestedRing,
      sampleRing: sampleRing,
      tool: activeTool,
      outerDeltaCm: outerDeltaCm,
      innerDeltaCm: innerDeltaCm,
      wallDeltaCm: wallDeltaCm,
      heightDeltaCm: heightDeltaCm,
      clayVolumeDeltaCm3: clayVolumeDeltaCm3,
      changed: Math.abs(outerDeltaCm) >= threshold || Math.abs(innerDeltaCm) >= threshold || Math.abs(wallDeltaCm) >= threshold || Math.abs(heightDeltaCm) >= threshold || Math.abs(clayVolumeDeltaCm3) >= .5,
      summary: changes.join('; ') + '.'
    };
  }
  function formingToolGestureMode(tool) {
    if (tool === 'center') return 'single-global';
    if (tool === 'add-coil') return 'single-rim';
    return 'ring-drag';
  }
  function applyTool(vessel, tool, ringIndex, settings) {
    vessel = normalizeVessel(vessel);
    if (vessel.stage !== 'wet' && !(vessel.stage === 'leather-hard' && tool === 'trim')) return copyVessel(vessel);
    var next = copyVessel(vessel);
    settings = settings || {};
    ringIndex = potteryFormingTarget(tool, ringIndex).ring;
    var pressure = clamp(finite(settings.pressure, 48), 0, 100) / 100;
    var rpm = clamp(finite(settings.rpm, 58), 0, 120);
    var method = settings.method === 'coil' ? 'coil' : 'wheel';
    var handSupport = clamp(finite(settings.handSupport, 0), 0, 100) / 100;
    var lubrication = clamp(finite(settings.lubrication, 30), 0, 100) / 100;
    var contactSpan = Math.round(clamp(finite(settings.contactSpan, 9), 3, 11));
    var contactRadius = Math.max(1, Math.floor(contactSpan / 2));
    var excessLubrication = clamp((lubrication - 0.72) / 0.28, 0, 1);
    var body = materialProfile(next);
    var softness = body.plasticity * (0.44 + next.moisture * 0.72);
    var motion = method === 'wheel' ? (0.62 + rpm / 120 * 0.55) : 0.92;
    var force = clamp(pressure * softness * motion * (0.88 + lubrication * 0.4), 0.03, 1.1);
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
      for (i = Math.max(1, ringIndex - contactRadius); i <= Math.min(RING_COUNT - 1, ringIndex + contactRadius); i++) {
        var distance = Math.abs(i - ringIndex) / (contactRadius + 1);
        var weight = Math.pow(Math.max(0, 1 - distance), 1.6);
        if (tool === 'open') {
          next.thickness[i] = clamp(next.thickness[i] - radiusDelta * (0.78 - handSupport * 0.25) * weight, 0.25, next.radii[i]);
          next.radii[i] = clamp(next.radii[i] + radiusDelta * 0.12 * weight, 1.2, 12.5);
          next.heightCm = clamp(next.heightCm + force * 0.045, 5, 38);
          next.lastOutcome = 'The opening widened and displaced clay into the surrounding wall.';
        } else if (tool === 'pull') {
          next.thickness[i] = clamp(next.thickness[i] * (1 - force * (0.075 - handSupport * 0.036) * weight), 0.22, next.radii[i]);
          next.radii[i] = clamp(next.radii[i] - radiusDelta * 0.06 * weight, 1.2, 12.5);
          next.heightCm = clamp(next.heightCm + force * (0.16 + handSupport * 0.06) * weight, 5, 38);
          next.compression = clamp(next.compression - force * (0.018 - handSupport * 0.011) * weight, 0, 1);
          next.lastOutcome = handSupport >= 0.55 ? 'Balanced inside support helped the wall stretch upward with less thinning.' : 'The wall stretched upward and became thinner.';
        } else if (tool === 'belly') {
          next.radii[i] = clamp(next.radii[i] + radiusDelta * weight, 1.2, 12.5);
          next.thickness[i] = clamp(next.thickness[i] * (1 - force * (0.035 - handSupport * 0.018) * weight), 0.22, next.radii[i]);
          next.compression = clamp(next.compression - force * 0.012 * weight, 0, 1);
          next.lastOutcome = handSupport >= 0.55 ? 'Balanced inside and outside pressure expanded the vessel profile.' : 'Outward pressure expanded the vessel profile.';
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
        next.heightCm = clamp(next.heightCm + force * (0.58 + handSupport * 0.18), 5, 38);
        next.compression = clamp(next.compression - force * (0.07 - handSupport * 0.025), 0, 1);
        next.coilBond = clamp(next.coilBond - force * (0.15 - handSupport * 0.07), 0, 1);
        next.lastOutcome = handSupport >= 0.55
          ? 'A supported coil added clay mass and height at the rim. Paddle or smooth the joint to consolidate it before drying.'
          : 'A new coil added clay at the rim, but limited support left a weaker modeled joint. Support, paddle, or smooth it before drying.';
      }
      if (tool === 'open' || tool === 'pull' || tool === 'belly' || tool === 'collar') next.compression = clamp(next.compression + handSupport * force * 0.012, 0, 1);
    }

    if (preserve) preserveVolume(next, before);
    if (tool === 'open') {
      var openingFloor = analyzeOpeningFloor(next);
      if (openingFloor.state === 'puncture-risk') {
        if (next.defects.indexOf('base puncture') === -1) next.defects.push('base puncture');
        next.lastOutcome = 'The cavity reached the lowest modeled opening interval, creating a base-puncture flag. Undo and compare a shallower opening pass.';
      }
    }
    if (tool === 'trim') next.removedVolume = finite(next.removedVolume, 0) + Math.max(0, before - vesselVolume(next));
    next.actions = finite(next.actions, 0) + 1;
    if (method === 'wheel' && tool !== 'center') {
      var imbalance = (rpm / 120) * pressure * (1 - next.centered / 100);
      next.wobble = clamp(next.wobble + imbalance * 0.035 * (1 - handSupport * 0.42) + excessLubrication * pressure * 0.025 - (tool === 'smooth' ? force * 0.03 : 0), 0, 1);
    }
    if (!next.collapsed && tool !== 'center' && tool !== 'smooth' && tool !== 'paddle') {
      var stats = analyzeVessel(next, settings);
      if (stats.stability < 16 && force > 0.43) {
        next.collapsed = true;
        next.heightCm = clamp(next.heightCm * 0.72, 5, 38);
        for (i = Math.floor(RING_COUNT * 0.48); i < RING_COUNT; i++) {
          var slump = (i / (RING_COUNT - 1) - 0.48) * 1.7;
          next.radii[i] = clamp(next.radii[i] * (1 + slump * 0.28), 1.2, 12.5);
        }
        next.defects.push('structural collapse');
        next.lastOutcome = 'The wall could not support the combined pressure, speed, touch balance, height, and moisture, so the upper form slumped.';
      }
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
    var thermalHistory = estimateThermalHistory({ temperature: target, ramp: ramp, soak: soak, coolingRate: coolingRate });
    var thermalStress = estimateScheduleThermalStress(next, thermalHistory, { temperature: target, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, loadDensity: finite(settings.loadDensity, 55), airAccess: finite(settings.airAccess, 60) });
    var peakThermalSegment = thermalStress.peakSample.segmentId;
    var loadEffects = estimateKilnLoadEffects(settings);
    var firedState = estimateFiredPorosity(body, heatwork.effectiveTemp, kilnType);
    var defects = copyArray(next.defects);
    var outcome = [];
    var glazeOutcome = null;
    if (next.stage === 'bone-dry') {
      if (next.moisture > 0.04) defects.push('steam crack');
      if (ramp > 190 || (thermalStress.peakStressPct >= 70 && peakThermalSegment !== 'cool')) defects.push('thermal crack');
      if (coolingRate * body.thermalSensitivity > 100 || (thermalStress.peakStressPct >= 70 && peakThermalSegment === 'cool')) defects.push('dunting crack');
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
      if (thermalStress.peakStressPct >= 70 && peakThermalSegment !== 'cool') defects.push('thermal crack');
      if (coolingRate * body.thermalSensitivity > 100 || (thermalStress.peakStressPct >= 70 && peakThermalSegment === 'cool')) defects.push('dunting crack');
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
    next.firingLog.push({ stage: next.stage, temperature: Math.round(target), effectiveTemperature: Math.round(heatwork.effectiveTemp), cone: heatwork.cone, ramp: Math.round(ramp), soak: Math.round(soak), coolingRate: Math.round(coolingRate), kilnType: kilnType, atmosphere: atmosphere, loadDensity: loadEffects.loadDensity, airAccess: loadEffects.airAccess, thermalStressPct: thermalStress.peakStressPct, thermalStressPhase: thermalStress.peakSample.phaseLabel, thermalStressTemperature: thermalStress.peakSample.temperatureC, materialRecipe: normalizeRecipe(next.materialRecipe), glazeOutcome: glazeOutcome, maturation: next.maturation, porosity: next.firedPorosity, defects: copyArray(next.defects) });
    outcome.push(thermalStress.summary);
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
  function normalizeMeasurementMethod(method) {
    var id = String(method || '').trim();
    return MEASUREMENT_METHODS.some(function (candidate) { return candidate.id === id; }) ? id : 'unknown';
  }
  function measurementMethodLabel(method) {
    var id = normalizeMeasurementMethod(method);
    var found = MEASUREMENT_METHODS.filter(function (candidate) { return candidate.id === id; })[0];
    return found ? found.label : 'Not recorded';
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
      var methodId = normalizeMeasurementMethod(entry.measurementMethod);
      var declaredUncertainty = compared.filter(function (item) { return item.uncertainty !== null; });
      var withinUncertainty = declaredUncertainty.filter(function (item) { return item.withinUncertainty; });
      rows.push({
        id: entry.id || ('measurement-' + rows.length), checkpointIndex: index, checkpoint: entry.checkpointLabel || (snapshot && snapshot.label) || 'Recorded checkpoint', stage: entry.stage || (snapshot && snapshot.stage) || 'unknown', measurementMethod: methodId, measurementMethodLabel: measurementMethodLabel(methodId), modelSource: storedModel ? 'logged' : 'current', context: context, measured: measured, modeled: modeled, residuals: residuals, relativeErrors: relativeErrors, compared: compared,
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
  function summarizeMeasurementRepeatability(rows) {
    var entries = Array.isArray(rows) ? rows : [];
    var metrics = [
      { id: 'heightCm', label: 'Height', unit: 'cm' },
      { id: 'diameterCm', label: 'Diameter', unit: 'cm' },
      { id: 'capacityMl', label: 'Capacity', unit: 'mL' },
      { id: 'minWallCm', label: 'Min wall', unit: 'cm' }
    ];
    var grouped = {};
    entries.forEach(function (row) {
      if (!row || typeof row !== 'object' || !Array.isArray(row.compared) || !row.compared.length) return;
      var index = Math.round(finite(row.checkpointIndex, -1));
      var label = String(row.checkpoint || 'Recorded checkpoint');
      var stage = String(row.stage || 'unknown');
      var key = index >= 0 ? 'index:' + index : 'label:' + label + '|stage:' + stage;
      if (!grouped[key]) grouped[key] = { key: key, checkpointIndex: index, checkpoint: label, stage: stage, rows: [], values: {}, methods: {} };
      grouped[key].rows.push(row);
      var methodId = normalizeMeasurementMethod(row.measurementMethod);
      grouped[key].methods[methodId] = (grouped[key].methods[methodId] || 0) + 1;
      row.compared.forEach(function (item) {
        if (!item || !metrics.some(function (metric) { return metric.id === item.id; }) || !isFinite(Number(item.measured))) return;
        if (!grouped[key].values[item.id]) grouped[key].values[item.id] = [];
        grouped[key].values[item.id].push(item);
      });
    });
    var groups = Object.keys(grouped).map(function (key) {
      var group = grouped[key];
      var metricSummaries = {};
      metrics.forEach(function (metric) {
        var values = group.values[metric.id] || [];
        var numbers = values.map(function (item) { return Number(item.measured); });
        var count = numbers.length;
        var mean = count ? numbers.reduce(function (sum, value) { return sum + value; }, 0) / count : null;
        var min = count ? Math.min.apply(null, numbers) : null;
        var max = count ? Math.max.apply(null, numbers) : null;
        var range = count ? max - min : null;
        var squared = count > 1 ? numbers.reduce(function (sum, value) { return sum + Math.pow(value - mean, 2); }, 0) / (count - 1) : 0;
        var declared = values.filter(function (item) { return item.uncertainty !== null && item.uncertainty !== undefined; });
        metricSummaries[metric.id] = {
          id: metric.id, label: metric.label, unit: metric.unit, count: count, mean: mean, min: min, max: max, range: range,
          sampleStdDev: count ? Math.sqrt(squared) : null, spreadPct: count && mean !== 0 ? range / Math.abs(mean) * 100 : null,
          uncertaintyCount: declared.length, meanUncertainty: declared.length ? declared.reduce(function (sum, item) { return sum + Number(item.uncertainty); }, 0) / declared.length : null
        };
      });
      var summaries = Object.keys(metricSummaries).map(function (id) { return metricSummaries[id]; });
      var methodIds = Object.keys(group.methods);
      var methodConsistency = methodIds.length === 1 ? (methodIds[0] === 'unknown' ? 'unknown' : 'consistent') : 'mixed';
      return {
        key: group.key, checkpointIndex: group.checkpointIndex, checkpoint: group.checkpoint, stage: group.stage, rowCount: group.rows.length, dimensionCount: summaries.reduce(function (sum, item) { return sum + item.count; }, 0),
        repeatedDimensionCount: summaries.filter(function (item) { return item.count > 1; }).length, metricSummaries: metricSummaries, methodIds: methodIds, methodLabels: methodIds.map(function (id) { return measurementMethodLabel(id); }), methodConsistency: methodConsistency
      };
    });
    var repeatedGroups = groups.filter(function (group) { return group.rowCount > 1; });
    var repeatedDimensionCount = groups.reduce(function (sum, group) { return sum + group.repeatedDimensionCount; }, 0);
    var mixedMethodGroupCount = groups.filter(function (group) { return group.methodConsistency === 'mixed'; }).length;
    return {
      groups: groups,
      groupCount: groups.length,
      repeatedGroupCount: repeatedGroups.length,
      repeatedDimensionCount: repeatedDimensionCount,
      mixedMethodGroupCount: mixedMethodGroupCount,
      summary: repeatedGroups.length ? 'Repeated evidence covers ' + repeatedDimensionCount + ' dimension' + (repeatedDimensionCount === 1 ? '' : 's') + ' across ' + repeatedGroups.length + ' checkpoint' + (repeatedGroups.length === 1 ? '' : 's') + '. Range and sample spread show how much readings vary within each checkpoint.' + (mixedMethodGroupCount ? ' ' + mixedMethodGroupCount + ' checkpoint' + (mixedMethodGroupCount === 1 ? ' uses' : 's use') + ' mixed measurement methods; compare like-with-like before interpreting spread.' : '') : entries.length ? 'No checkpoint has multiple logs yet. Log the same checkpoint again with the same method to estimate repeatability.' : 'No measured checkpoints are available for a repeatability study yet.'
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
      'dunting crack': 0.68, 'base puncture': 0.78, 'crazing risk': 0.20, 'shivering risk': 0.42, 'body deformation': 0.45,
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
    MEASUREMENT_METHODS: MEASUREMENT_METHODS,
    CULTURAL_STUDIES: CULTURAL_STUDIES,
    makeVessel: makeVessel,
    normalizeVessel: normalizeVessel,
    normalizeRecipe: normalizeRecipe,
    materialProfile: materialProfile,
    vesselVolume: vesselVolume,
    vesselCapacity: vesselCapacity,
    analyzeOpeningFloor: analyzeOpeningFloor,
    estimateHeatwork: estimateHeatwork,
    PYROMETRIC_CONES: PYROMETRIC_CONES.map(function (cone) { return Object.assign({}, cone); }),
    WITNESS_CONE_MOUNT_ANGLE_DEGREES: WITNESS_CONE_MOUNT_ANGLE_DEGREES,
    coneReferenceRamp: coneReferenceRamp,
    coneReferenceTemperature: coneReferenceTemperature,
    estimateWitnessConePack: estimateWitnessConePack,
    interpretWitnessConeSequence: interpretWitnessConeSequence,
    interpretConeHeatworkMemory: interpretConeHeatworkMemory,
    witnessConeGeometry: witnessConeGeometry,
    summarizeWitnessConeZones: summarizeWitnessConeZones,
    potteryWheelDriveGeometry: potteryWheelDriveGeometry,
    potteryWheelWobbleGeometry: potteryWheelWobbleGeometry,
    potteryWheelSurfaceKinematics: potteryWheelSurfaceKinematics,
    potteryWheelWholeFormKinematics: potteryWheelWholeFormKinematics,
    potteryWheelWetFilmGeometry: potteryWheelWetFilmGeometry,
    potteryWheelContactGeometry: potteryWheelContactGeometry,
    kilnShelfPerspectiveGeometry: kilnShelfPerspectiveGeometry,
    kilnWallCutawayGeometry: kilnWallCutawayGeometry,
    kilnChamberPerspectiveGeometry: kilnChamberPerspectiveGeometry,
    kilnHeatFlowGeometry: kilnHeatFlowGeometry,
    estimateThermalHistory: estimateThermalHistory,
    sampleThermalHistory: sampleThermalHistory,
    kilnHeatSourceState: kilnHeatSourceState,
    estimateKilnMaterialState: estimateKilnMaterialState,
    estimateKilnLoadEffects: estimateKilnLoadEffects,
    estimateWareCoreTemperature: estimateWareCoreTemperature,
    estimateWareThermalStress: estimateWareThermalStress,
    estimateWareThermalTrace: estimateWareThermalTrace,
    sampleWareThermalTrace: sampleWareThermalTrace,
    estimateScheduleThermalStress: estimateScheduleThermalStress,
    estimateThermalTransitionWindows: estimateThermalTransitionWindows,
    estimateFiredPorosity: estimateFiredPorosity,
    analyzeGlazeOutcome: analyzeGlazeOutcome,
    analyzeFiringSchedule: analyzeFiringSchedule,
    compareMaterialProfiles: compareMaterialProfiles,
    analyzeRingRisks: analyzeRingRisks,
    summarizeRingRiskProfile: summarizeRingRiskProfile,
    analyzeVessel: analyzeVessel,
    analyzeFailureContributors: analyzeFailureContributors,
    estimateFormingDisplacement: estimateFormingDisplacement,
    potteryFormingTarget: potteryFormingTarget,
    formingToolGestureMode: formingToolGestureMode,
    applyTool: applyTool,
    dryVessel: dryVessel,
    fireVessel: fireVessel,
    glazeVessel: glazeVessel,
    dimensionModelSettings: dimensionModelSettings,
    compareDimensionModelSettings: compareDimensionModelSettings,
    normalizeMeasurementMethod: normalizeMeasurementMethod,
    measurementMethodLabel: measurementMethodLabel,
    estimateDryingRisk: estimateDryingRisk,
    estimateDryingHistory: estimateDryingHistory,
    estimateDimensionalHistory: estimateDimensionalHistory,
    compareDimensionalMeasurements: compareDimensionalMeasurements,
    summarizeMeasurementRepeatability: summarizeMeasurementRepeatability,
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
    gradeRange: '4-12',
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
      var experienceMode = ['guided', 'studio', 'research'].indexOf(data.experienceMode) >= 0 ? data.experienceMode : 'studio';
      var vessel = normalizeVessel(data.vessel, data.clayBody || 'stoneware');
      var view = data.view || 'shape';
      var method = data.method === 'coil' ? 'coil' : 'wheel';
      var activeTool = data.activeTool || (method === 'coil' ? 'add-coil' : 'center');
      var activeGestureMode = formingToolGestureMode(activeTool);
      var requestedWorkRing = Math.round(clamp(finite(data.workRing, 22), 0, RING_COUNT - 1));
      var activeTarget = potteryFormingTarget(activeTool, requestedWorkRing);
      var workRing = activeTarget.mode === 'lower-zone' ? activeTarget.ring : requestedWorkRing;
      var pressure = clamp(finite(data.pressure, 48), 5, 100);
      var rpm = method === 'coil' ? 0 : clamp(finite(data.rpm, 58), 0, 120);
      var handSupport = clamp(finite(data.handSupport, 55), 0, 100);
      var lubrication = clamp(finite(data.lubrication, 30), 0, 100);
      var contactSpan = Math.round(clamp(finite(data.contactSpan, 9), 3, 11));
      var cameraTilt = clamp(finite(data.cameraTilt, 42), 20, 70);
      var settings = { pressure: pressure, rpm: rpm, method: method, handSupport: handSupport, lubrication: lubrication, contactSpan: contactSpan };
      var stats = analyzeVessel(vessel, settings);
      var ringRiskProfile = stats.ringRiskProfile;
      var openingFloor = analyzeOpeningFloor(vessel);
      var failureSettings = Object.assign({}, settings, { humidity: data.humidity, dryingRate: data.dryingRate, temperature: data.kilnTemp, ramp: data.ramp, soak: data.soak, coolingRate: data.coolingRate, kilnType: data.kilnType, atmosphere: data.atmosphere });
      var failureReport = analyzeFailureContributors(vessel, failureSettings);
      var geometry = profileGeometry(vessel);
      var formingPreviewAvailable = vessel.stage === 'wet' || (vessel.stage === 'leather-hard' && activeTool === 'trim');
      var formingPreviewVessel = formingPreviewAvailable ? applyTool(vessel, activeTool, workRing, settings) : copyVessel(vessel);
      var formingPreviewFloor = analyzeOpeningFloor(formingPreviewVessel);
      var formingFlow = estimateFormingDisplacement(vessel, formingPreviewVessel, workRing, activeTool);
      var formingPreviewStats = analyzeVessel(formingPreviewVessel, settings);
      var formingPreviewRiskProfile = formingPreviewStats.ringRiskProfile;
      var formingPreviewGeometry = profileGeometry(formingPreviewVessel);
      var formingPreviewStabilityDelta = formingPreviewStats.stability - stats.stability;
      var formingPreviewWallDelta = formingPreviewStats.minWallCm - stats.minWallCm;
      var formingPreviewCapacityDelta = formingPreviewStats.capacityMl - stats.capacityMl;
      var formingPreviewHeightDelta = formingPreviewVessel.heightCm - vessel.heightCm;
      var formingPreviewFloorDelta = formingPreviewFloor.floorThicknessCm - openingFloor.floorThicknessCm;
      var formingPreviewPeakRiskDelta = formingPreviewRiskProfile.criticalRiskPct - ringRiskProfile.criticalRiskPct;
      var formingPreviewChanged = formingFlow.changed || Math.abs(formingPreviewStabilityDelta) >= 0.05 || Math.abs(formingPreviewWallDelta) >= 0.001 || Math.abs(formingPreviewCapacityDelta) >= 0.05 || Math.abs(formingPreviewHeightDelta) >= 0.01 || (activeTool === 'open' && Math.abs(formingPreviewFloorDelta) >= 0.01) || formingPreviewVessel.collapsed !== vessel.collapsed;
      var formingPreviewRisky = formingPreviewVessel.collapsed || formingPreviewStats.stability < 48 || formingPreviewStabilityDelta < -6 || formingPreviewStats.minWallCm < 0.45 || (activeTool === 'open' && (formingPreviewFloor.state === 'puncture-risk' || formingPreviewFloor.floorThicknessCm < .5));
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
      var VIEW_IDS = ['shape', 'science', 'traditions', 'kiln', 'performance', 'journal'];
      var VIEW_LABELS = { shape: 'Shape', science: 'Clay science', traditions: 'Ways of making', kiln: 'Dry & fire', performance: 'Use tests', journal: 'Journal' };
      function viewLabel(id) { return VIEW_LABELS[id] || id; }
      function stageLabel(stage) {
        return String(stage || 'unknown').split('-').map(function (part) { return part ? part.charAt(0).toUpperCase() + part.slice(1) : part; }).join(' ');
      }
      function patchData(patch) {
        setToolData(function (previous) {
          previous = previous || {};
          return Object.assign({}, previous, { wheelAndFire: Object.assign({}, previous.wheelAndFire || {}, patch) });
        });
      }
      function vesselChange(previous, next, beforeStats, afterStats) {
        beforeStats = beforeStats || analyzeVessel(previous, settings);
        afterStats = afterStats || analyzeVessel(next, settings);
        return {
          beforeStage: previous.stage,
          afterStage: next.stage,
          stabilityDelta: afterStats.stability - beforeStats.stability,
          centeredDelta: next.centered - previous.centered,
          minWallDelta: afterStats.minWallCm - beforeStats.minWallCm,
          capacityDelta: afterStats.capacityMl - beforeStats.capacityMl,
          massDelta: afterStats.massG - beforeStats.massG,
          outcome: next.lastOutcome || ''
        };
      }
      function commitVessel(next, message, extra) {
        var history = copyArray(data.history).concat([copyVessel(vessel)]).slice(-24);
        patchData(Object.assign({ vessel: next, history: history, future: [], lastChange: vesselChange(vessel, next, stats), dragStartVessel: null, dragging: false }, extra || {}));
        announce(message || next.lastOutcome || 'Pottery state updated.');
      }
      function setView(next) {
        var safeView = VIEW_IDS.indexOf(next) >= 0 ? next : 'shape';
        patchData({ view: safeView });
        announce('Opened ' + viewLabel(safeView) + ' section.');
      }
      function handleTabKey(event, id) {
        var index = VIEW_IDS.indexOf(id);
        if (index < 0) return;
        var nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % VIEW_IDS.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + VIEW_IDS.length) % VIEW_IDS.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = VIEW_IDS.length - 1;
        else return;
        event.preventDefault();
        var nextId = VIEW_IDS[nextIndex];
        setView(nextId);
        var tab = event.currentTarget && event.currentTarget.parentNode && event.currentTarget.parentNode.querySelector('#wheel-fire-tab-' + nextId);
        if (tab && typeof tab.focus === 'function') tab.focus();
      }
      function applyActive(index, options) {
        if (vessel.stage !== 'wet' && !(vessel.stage === 'leather-hard' && activeTool === 'trim')) {
          announce('Shaping is unavailable after the clay has dried.');
          return;
        }
        var targetIndex = potteryFormingTarget(activeTool, index).ring;
        var next = applyTool(vessel, activeTool, targetIndex, settings);
        if (options && options.drag) {
          patchData({ vessel: next, workRing: targetIndex, future: [], dragStartVessel: options.start ? copyVessel(vessel) : (data.dragStartVessel || copyVessel(vessel)), dragging: true });
          return;
        }
        commitVessel(next, next.lastOutcome);
      }
      function finishGesture() {
        if (!data.dragStartVessel) return;
        var history = copyArray(data.history).concat([copyVessel(data.dragStartVessel)]).slice(-24);
        patchData({ history: history, future: [], lastChange: vesselChange(data.dragStartVessel, vessel), dragStartVessel: null, dragging: false });
        announce(vessel.lastOutcome || 'Pottery drag gesture completed.');
      }
      function undo() {
        var history = copyArray(data.history);
        if (!history.length) { announce('Nothing to undo.'); return; }
        var previous = history.pop();
        patchData({ vessel: previous, history: history, future: [copyVessel(vessel)].concat(copyArray(data.future)).slice(0, 24), recipeDraft: normalizeRecipe(previous.materialRecipe), lastChange: vesselChange(vessel, previous), dragStartVessel: null, dragging: false });
        announce('Pottery action undone.');
      }
      function redo() {
        var future = copyArray(data.future);
        if (!future.length) { announce('Nothing to redo.'); return; }
        var next = future.shift();
        patchData({ vessel: next, history: copyArray(data.history).concat([copyVessel(vessel)]).slice(-24), future: future, recipeDraft: normalizeRecipe(next.materialRecipe), lastChange: vesselChange(vessel, next), dragStartVessel: null, dragging: false });
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
      function signed(value, digits, unit) {
        var amount = finite(value, 0);
        return (amount >= 0 ? '+' : '') + amount.toFixed(digits) + unit;
      }
      function changeFeedback() {
        var change = data.lastChange;
        if (!change || typeof change !== 'object') return null;
        var items = [];
        if (change.beforeStage !== change.afterStage) items.push('Stage ' + stageLabel(change.beforeStage) + ' → ' + stageLabel(change.afterStage));
        if (Math.abs(finite(change.stabilityDelta, 0)) >= 0.5) items.push('stability ' + signed(change.stabilityDelta, 1, ' pts'));
        if (Math.abs(finite(change.centeredDelta, 0)) >= 0.5) items.push('centering ' + signed(change.centeredDelta, 1, ' pts'));
        if (Math.abs(finite(change.minWallDelta, 0)) >= 0.01) items.push('minimum wall ' + signed(change.minWallDelta, 2, ' cm'));
        if (Math.abs(finite(change.capacityDelta, 0)) >= 0.5) items.push('capacity ' + signed(change.capacityDelta, 1, ' mL'));
        if (Math.abs(finite(change.massDelta, 0)) >= 0.5) items.push('clay mass ' + signed(change.massDelta, 1, ' g'));
        if (!items.length) items.push('the tracked measures changed only slightly');
        return h('div', { className: 'rounded-xl border border-cyan-300 bg-cyan-50 p-2 text-xs text-cyan-950', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
          h('strong', null, 'What changed since the previous checkpoint: '), items.join(' · '),
          change.outcome ? h('p', { className: 'mt-1 text-[11px]' }, 'Outcome: ' + change.outcome) : null);
      }
      function rangeControl(id, label, value, min, max, unit, onChange, disabled) {
        return h('label', { htmlFor: id, className: 'block text-xs font-bold text-slate-700' },
          label + ': ', h('output', { htmlFor: id, className: 'text-amber-800' }, Math.round(value) + unit),
          h('input', { id: id, type: 'range', min: min, max: max, value: value, disabled: !!disabled, onChange: function (event) { onChange(Number(event.target.value)); }, className: 'block w-full mt-1 accent-amber-700 disabled:opacity-50' }));
      }
      function tabButton(id, label, icon) {
        var selected = view === id;
        return h('button', { type: 'button', role: 'tab', id: 'wheel-fire-tab-' + id, 'aria-controls': selected ? 'wheel-fire-panel-' + id : undefined, 'aria-selected': selected, tabIndex: selected ? 0 : -1, onClick: function () { setView(id); }, onKeyDown: function (event) { handleTabKey(event, id); }, className: 'min-h-[42px] px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors ' + (selected ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50') }, icon + ' ' + label);
      }
      function experienceModeControl() {
        var modes = [
          { id: 'guided', label: 'Guided', description: 'Keeps the next action, core simulation, evidence graph, and safety guidance visible while hiding advanced shelves and wide research logs.' },
          { id: 'studio', label: 'Studio', description: 'Shows the complete making lifecycle and all current comparison tools. This is the default workspace.' },
          { id: 'research', label: 'Research', description: 'Keeps the complete studio and adds explicit model-audit information for deeper investigations.' }
        ];
        var selected = modes.filter(function (mode) { return mode.id === experienceMode; })[0] || modes[1];
        function selectMode(id) {
          patchData({ experienceMode: id });
          var chosen = modes.filter(function (mode) { return mode.id === id; })[0];
          announce((chosen ? chosen.label : 'Studio') + ' experience mode selected.');
        }
        return h('section', { className: 'rounded-xl border border-stone-300 bg-white p-2 flex flex-wrap items-center gap-2', 'aria-labelledby': 'wheel-fire-experience-mode-title' },
          h('h2', { id: 'wheel-fire-experience-mode-title', className: 'text-xs font-black text-stone-800 mr-1' }, 'Workspace depth'),
          h('div', { className: 'flex flex-wrap gap-1', role: 'group', 'aria-label': 'Pottery workspace depth' }, modes.map(function (mode) {
            return h('button', { type: 'button', key: mode.id, 'aria-pressed': experienceMode === mode.id, onClick: function () { selectMode(mode.id); }, className: 'rounded-lg border px-3 py-2 text-xs font-bold ' + (experienceMode === mode.id ? 'border-stone-800 bg-stone-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50') }, mode.label);
          })),
          h('p', { className: 'text-[11px] text-stone-600 flex-1 min-w-[220px]', 'aria-live': 'polite' }, selected.description)
        );
      }
      function safeHistoryIndex() {
        var history = copyArray(data.history);
        for (var index = history.length - 1; index >= 0; index -= 1) {
          var candidate = normalizeVessel(history[index]);
          if (!candidate.collapsed && !copyArray(candidate.defects).length) return index;
        }
        return -1;
      }
      function restoreLastSafeCheckpoint() {
        var history = copyArray(data.history);
        var index = safeHistoryIndex();
        if (index < 0) { announce('No earlier safe checkpoint is available. Load fresh clay or a saved journal record.'); return; }
        var safe = copyVessel(history[index]);
        patchData({ vessel: safe, history: history.slice(0, index), future: [copyVessel(vessel)].concat(copyArray(data.future)).slice(0, 24), recipeDraft: normalizeRecipe(safe.materialRecipe), lastChange: vesselChange(vessel, safe), dragStartVessel: null, dragging: false, view: 'shape', workRing: failureReport.criticalRing });
        announce('Restored the last checkpoint before modeled failure. Change one input before repeating the trial.');
      }
      function failureAutopsy() {
        if (!failureReport.ready) return null;
        var checkpointIndex = safeHistoryIndex();
        var primary = failureReport.contributors[0];
        return h('section', { className: 'rounded-2xl border border-rose-400 bg-rose-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-autopsy-title' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
            h('div', null,
              h('h2', { id: 'wheel-fire-autopsy-title', className: 'font-black text-rose-950' }, 'Modeled outcome autopsy · ' + failureReport.eventLabel),
              h('p', { className: 'text-xs text-rose-950 mt-1' }, 'This traces contributors inside the teaching model. It is a diagnostic hypothesis, not proof of what caused a real ceramic failure.')
            ),
            h('span', { className: 'rounded-full border border-rose-300 bg-white px-2 py-1 text-[11px] font-bold text-rose-900' }, failureReport.defects.length + ' modeled flag' + (failureReport.defects.length === 1 ? '' : 's'))
          ),
          h('ol', { className: 'grid md:grid-cols-3 gap-2 text-xs text-rose-950', 'aria-label': 'Modeled failure chain' },
            h('li', { className: 'rounded-lg border border-rose-200 bg-white p-2' }, h('strong', { className: 'block' }, '1. Input or condition'), primary.label, h('span', { className: 'block text-[11px] text-slate-600 mt-1' }, primary.evidence)),
            h('li', { className: 'rounded-lg border border-rose-200 bg-white p-2' }, h('strong', { className: 'block' }, '2. Vulnerable response'), failureReport.responseLabel),
            h('li', { className: 'rounded-lg border border-rose-200 bg-white p-2' }, h('strong', { className: 'block' }, '3. Modeled outcome'), failureReport.outcomeLabel)
          ),
          h('details', { className: 'rounded-lg border border-rose-200 bg-white p-2', open: experienceMode === 'research' ? true : undefined },
            h('summary', { className: 'cursor-pointer text-xs font-black text-rose-950' }, 'Ranked contributors and next tests'),
            h('ol', { className: 'list-decimal pl-5 mt-2 space-y-2 text-xs text-rose-950' }, failureReport.contributors.map(function (item) {
              return h('li', { key: item.id }, h('strong', null, item.label + ': '), item.evidence, h('span', { className: 'block text-[11px] text-slate-700' }, 'Next controlled test: ' + item.action));
            }))
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function () { patchData({ view: 'shape', workRing: failureReport.criticalRing }); announce('Focused the highest-risk ring in Shape.'); }, className: 'rounded-lg border border-rose-400 bg-white px-3 py-2 text-xs font-black text-rose-900' }, 'Inspect ring ' + (failureReport.criticalRing + 1)),
            checkpointIndex >= 0 ? h('button', { type: 'button', onClick: restoreLastSafeCheckpoint, className: 'rounded-lg bg-rose-800 px-3 py-2 text-xs font-black text-white' }, 'Restore last safe checkpoint') : h('p', { className: 'text-[11px] text-rose-900 self-center' }, 'No safe checkpoint is stored; load fresh clay or a journal record.')
          )
        );
      }
      function stageStrip() {
        var current = stageIndex(vessel.stage);
        return h('div', { className: 'wheel-fire-stage-line', role: 'list', 'aria-label': 'Pottery lifecycle' }, STAGES.map(function (stage, index) {
          var complete = index <= current;
          return h('div', { key: stage, role: 'listitem', 'aria-current': stage === vessel.stage ? 'step' : undefined, className: 'rounded-lg border px-2 py-1 text-center text-[10px] font-bold ' + (stage === vessel.stage ? 'bg-amber-700 text-white border-amber-800' : (complete ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200')) }, stageLabel(stage));
        }));
      }
      function guidancePanel() {
        var isNew = !copyArray(data.history).length && vessel.stage === 'wet';
        var nextView = vessel.stage === 'wet' || vessel.stage === 'leather-hard' ? 'shape' : (vessel.stage === 'glaze-fired' ? 'performance' : 'kiln');
        var nextLabel = nextView === 'shape' ? 'Open Shape' : (nextView === 'kiln' ? 'Open Dry & fire' : 'Open Use tests');
        var visitedTraditions = Object.keys(data.visitedTraditions || {}).length;
        var performanceCount = copyArray(data.performanceLog).length;
        var challenges = [
          { label: 'Center the clay', progress: Math.round(vessel.centered) + '%', complete: vessel.centered >= 80 },
          { label: 'Make a stable thin wall', progress: stats.minWallCm.toFixed(2) + ' cm', complete: stats.minWallCm < 1 && stats.stability >= 55 },
          { label: 'Study three named traditions', progress: Math.min(3, visitedTraditions) + '/3', complete: visitedTraditions >= 3 },
          { label: 'Run two use tests', progress: Math.min(2, performanceCount) + '/2', complete: performanceCount >= 2 }
        ];
        var guideText = isNew ? 'Pottery is a sequence: shape → dry slowly → fire → optionally glaze → fire again → test. Start with one small shaping change and watch the measurements respond.' : (
          vessel.stage === 'wet' ? 'Make one small change at a time. Center acts once across the whole form; local tools use the selected work zone. Apply one action or drag through new rings, then read the outcome below the canvas.' :
          vessel.stage === 'leather-hard' ? 'Leather-hard clay is firm but still trimmable. Use Trim or Scrape for a controlled change, then review drying before firing.' :
          vessel.stage === 'bone-dry' ? 'Bone-dry means free water has left the clay. Review the modeled drying history, then run the bisque firing when the schedule makes sense.' :
          vessel.stage === 'bisque' ? 'Bisque is the first fired checkpoint. Apply a glaze in Dry & fire, then run a glaze firing; the surface outcome is still a model to test.' :
          vessel.stage === 'glazed' ? 'The glaze is on the bisque. Review fit and heatwork, then run the glaze firing when the schedule is appropriate.' :
          'The piece is glaze-fired. Run a use test, write an observation, and compare the result with the model instead of treating the score as certification.'
        );
        var collapseNote = vessel.collapsed ? h('div', { className: 'rounded-lg border border-red-400 bg-red-50 p-2 text-xs text-red-950', role: 'alert' }, h('strong', null, 'The form collapsed. '), 'Undo the last action, lower one input, and try again. A collapse is feedback about the current combination of variables, not a failure.') : null;
        return h('section', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3 space-y-2', 'aria-labelledby': 'wheel-fire-guidance-title' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
            h('h2', { id: 'wheel-fire-guidance-title', className: 'font-black text-teal-950' }, isNew ? 'Start here' : 'Next suggested step'),
            h('span', { className: 'rounded-full border border-teal-300 bg-white px-2 py-1 text-[11px] font-bold text-teal-900' }, 'Phase ' + (stageIndex(vessel.stage) + 1) + ' of ' + STAGES.length)
          ),
          h('p', { className: 'text-xs text-teal-950' }, guideText),
          isNew ? h('ol', { className: 'list-decimal pl-5 text-xs text-teal-950 space-y-1' },
            h('li', null, 'Choose Potter\'s wheel or Handbuild coils.'),
            h('li', null, 'Choose Center for one whole-form action, Add coil for one rim action, or a local tool to click or drag; the blue dashed line appears only for a local work zone.'),
            h('li', null, 'Apply the tool and watch stability, wall thickness, capacity, and the latest outcome.')
          ) : null,
          collapseNote,
          vessel.collapsed && copyArray(data.history).length ? h('button', { type: 'button', onClick: undo, className: 'rounded-lg border border-red-400 bg-white px-3 py-2 text-xs font-black text-red-900' }, 'Undo the collapse') : null,
          nextView !== view ? h('button', { type: 'button', onClick: function () { setView(nextView); }, className: 'rounded-lg border border-teal-400 bg-white px-3 py-2 text-xs font-black text-teal-900' }, nextLabel) : null,
          changeFeedback(),
          h('details', { className: 'rounded-lg border border-teal-200 bg-white p-2' },
            h('summary', { className: 'cursor-pointer text-xs font-black text-teal-950' }, 'Optional studio challenges'),
            h('ul', { className: 'mt-2 space-y-1 text-[11px] text-teal-950' }, challenges.map(function (challenge) {
              return h('li', { key: challenge.label, className: 'flex flex-wrap items-center justify-between gap-2' }, h('span', { className: 'font-bold' }, challenge.complete ? 'Complete: ' : 'Try: ', challenge.label), h('span', null, challenge.progress));
            }))
          )
        );
      }
      function vesselSvg() {
        var selectedY = geometry.bottom - workRing / (RING_COUNT - 1) * geometry.heightPx;
        var selectedOuterRadius = vessel.radii[workRing] * geometry.scale;
        var selectedInnerRadius = Math.max(8, (vessel.radii[workRing] - vessel.thickness[workRing]) * geometry.scale);
        var selectedWallCm = vessel.thickness[workRing];
        var selectedWallState = selectedWallCm < .45 ? 'very thin' : (selectedWallCm < .75 ? 'thin' : (selectedWallCm > 2.2 ? 'thick' : 'moderate'));
        var selectedWallColor = selectedWallCm < .45 ? '#fb7185' : (selectedWallCm < .75 ? '#fbbf24' : (selectedWallCm > 2.2 ? '#fdba74' : '#bef264'));
        var selectedWallLabel = 'Ring ' + (workRing + 1) + ' wall ' + selectedWallCm.toFixed(2) + ' cm · ' + selectedWallState;
        var wholeFormTarget = activeGestureMode === 'single-global';
        var rimTarget = activeGestureMode === 'single-rim';
        var localRingTarget = activeGestureMode === 'ring-drag';
        var lowerZoneTarget = activeTarget.mode === 'lower-zone';
        var openingToolTarget = activeTool === 'open';
        var localSurface = potteryWheelSurfaceKinematics(method === 'wheel' ? rpm : 0, vessel.radii[workRing], { ringNumber: workRing + 1 });
        var wholeFormSurface = potteryWheelWholeFormKinematics(method === 'wheel' ? rpm : 0, vessel.radii);
        var displayedSurface = wholeFormTarget ? wholeFormSurface : localSurface;
        var showTouchForces = data.showTouchForces !== false;
        var modeledInsideTouch = wholeFormTarget ? pressure : handSupport;
        var touchDifference = pressure - modeledInsideTouch;
        var touchDifferenceMagnitude = Math.abs(touchDifference);
        var touchRelationship = wholeFormTarget ? 'matched opposing centering brace' : (touchDifferenceMagnitude <= 12 ? 'near-balanced touch' : (touchDifference > 0 ? 'outside touch exceeds inside support by ' + Math.round(touchDifferenceMagnitude) + ' points' : 'inside support exceeds outside touch by ' + Math.round(touchDifferenceMagnitude) + ' points'));
        var outsideForceLength = 24 + pressure * .44;
        var insideForceLength = 24 + modeledInsideTouch * .44;
        var showFormingFlow = data.showFormingPreview !== false && formingPreviewAvailable && formingPreviewChanged && formingFlow.changed;
        var flowRing = formingFlow.sampleRing;
        var flowY = geometry.bottom - flowRing / (RING_COUNT - 1) * geometry.heightPx;
        var flowOuterRadius = vessel.radii[flowRing] * geometry.scale;
        var flowInnerRadius = Math.max(8, (vessel.radii[flowRing] - vessel.thickness[flowRing]) * geometry.scale);
        var outerFlowLength = clamp(Math.abs(formingFlow.outerDeltaCm) * geometry.scale * 3.2, 18, 52);
        var innerFlowLength = clamp(Math.abs(formingFlow.innerDeltaCm) * geometry.scale * 3.2, 18, 52);
        var heightFlowLength = clamp(Math.abs(formingFlow.heightDeltaCm) * 90, 18, 48);
        var wheelDrive = potteryWheelDriveGeometry(rpm, cameraTilt);
        var wetFilm = potteryWheelWetFilmGeometry(vessel.moisture, lubrication, method === 'wheel' ? rpm : 0, pressure, { method: method, centerX: wheelDrive.splashPan.cx, panY: wheelDrive.splashPan.cy, panRx: wheelDrive.splashPan.rx, panRy: wheelDrive.splashPan.ry });
        var contactGeometry = potteryWheelContactGeometry(activeTool, method, workRing, pressure, handSupport, contactSpan, { centerX: geometry.center, bottomY: geometry.bottom, heightPx: geometry.heightPx, scale: geometry.scale, radii: vessel.radii, thickness: vessel.thickness });
        var perspectiveDepth = wheelDrive.perspectiveDepth;
        var wheelEllipseRy = wheelDrive.wheelhead.ry;
        var rimOuterRx = vessel.radii[RING_COUNT - 1] * geometry.scale;
        var rimInnerRx = Math.max(5, (vessel.radii[RING_COUNT - 1] - vessel.thickness[RING_COUNT - 1]) * geometry.scale);
        var rimEllipseRy = Math.max(3, rimOuterRx * (0.055 + perspectiveDepth * 0.075));
        var selectedWorkRingRx = selectedOuterRadius + 3;
        var selectedWorkRingRy = Math.max(3, selectedWorkRingRx * (0.035 + perspectiveDepth * 0.035));
        var selectedWorkRingLeft = geometry.center - selectedWorkRingRx;
        var selectedWorkRingRight = geometry.center + selectedWorkRingRx;
        var selectedWorkRingRearPath = 'M' + selectedWorkRingLeft.toFixed(1) + ' ' + selectedY.toFixed(1) + ' A' + selectedWorkRingRx.toFixed(1) + ' ' + selectedWorkRingRy.toFixed(1) + ' 0 0 1 ' + selectedWorkRingRight.toFixed(1) + ' ' + selectedY.toFixed(1);
        var selectedWorkRingFrontPath = 'M' + selectedWorkRingLeft.toFixed(1) + ' ' + selectedY.toFixed(1) + ' A' + selectedWorkRingRx.toFixed(1) + ' ' + selectedWorkRingRy.toFixed(1) + ' 0 0 0 ' + selectedWorkRingRight.toFixed(1) + ' ' + selectedY.toFixed(1);
        var lowerZoneTopY = geometry.bottom - activeTarget.maxRing / (RING_COUNT - 1) * geometry.heightPx;
        var lowerZoneBottomY = geometry.bottom - activeTarget.minRing / (RING_COUNT - 1) * geometry.heightPx;
        var openingFloorY = openingFloor.hasCavity ? geometry.bottom - openingFloor.floorRing / (RING_COUNT - 1) * geometry.heightPx : geometry.top;
        var previewOpeningFloorY = formingPreviewFloor.hasCavity ? geometry.bottom - formingPreviewFloor.floorRing / (RING_COUNT - 1) * geometry.heightPx : geometry.top;
        var openingFloorColor = openingFloor.state === 'puncture-risk' ? '#fb7185' : (openingFloor.state === 'thin-floor' ? '#fbbf24' : '#67e8f9');
        var criticalRisk = ringRiskProfile.rings[ringRiskProfile.criticalRing];
        var criticalRiskY = geometry.bottom - criticalRisk.index / (RING_COUNT - 1) * geometry.heightPx;
        var criticalRiskX = geometry.center + vessel.radii[criticalRisk.index] * geometry.scale;
        var previewCriticalRisk = formingPreviewRiskProfile.rings[formingPreviewRiskProfile.criticalRing];
        var previewCriticalRiskY = formingPreviewGeometry.bottom - previewCriticalRisk.index / (RING_COUNT - 1) * formingPreviewGeometry.heightPx;
        var previewCriticalRiskX = formingPreviewGeometry.center + formingPreviewVessel.radii[previewCriticalRisk.index] * formingPreviewGeometry.scale;
        var showPredictedRiskPeak = data.showFormingPreview !== false && formingPreviewAvailable && formingPreviewChanged && (previewCriticalRisk.index !== criticalRisk.index || Math.abs(formingPreviewPeakRiskDelta) >= .5);
        function ringRiskColor(ringRisk) { return ringRisk.risk >= .67 ? '#fb7185' : (ringRisk.risk >= .4 ? '#fbbf24' : '#a3e635'); }
        function ringRiskWidth(ringRisk) { return ringRisk.risk >= .67 ? 6.5 : (ringRisk.risk >= .4 ? 4.8 : 3.2); }
        function ringRiskDash(ringRisk) { return ringRisk.risk >= .67 ? undefined : (ringRisk.risk >= .4 ? '6 3' : '2 4'); }
        var wheelWobble = potteryWheelWobbleGeometry(vessel.wobble, vessel.centered, method === 'wheel' ? rpm : 0, { depthRatio: wheelDrive.rotation.ry / wheelDrive.rotation.rx });
        var wobblePx = method === 'wheel' ? wheelWobble.amplitudePx : 0;
        var wobbleLabel = vessel.wobble <= .12 && vessel.centered >= 90 ? 'low wobble' : (vessel.wobble <= .28 && vessel.centered >= 70 ? 'visible wobble' : 'strong wobble');
        var body = materialProfile(vessel);
        var fillColor = vessel.surfaceColor || body.color;
        var cavityColor = data.showCrossSection ? '#f6e4cb' : '#211711';
        var activeTargetDescription = wholeFormTarget ? 'across the whole form' : (rimTarget ? 'at the rim' : (lowerZoneTarget ? 'at lower-exterior ring ' + (workRing + 1) + ', constrained to rings ' + (activeTarget.minRing + 1) + ' through ' + (activeTarget.maxRing + 1) : 'at ring ' + (workRing + 1) + ' of ' + RING_COUNT));
        var targetControlSummary = wholeFormTarget
          ? ', with ' + Math.round(pressure) + ' percent matched brace pressure and ' + Math.round(lubrication) + ' percent lubrication. Inside-hand support, contact span, and work height do not affect this Center pass. '
          : (rimTarget
            ? ', with ' + Math.round(handSupport) + ' percent rim support and ' + Math.round(lubrication) + ' percent lubrication. Contact span and work height do not affect this Add coil pass. '
            : (lowerZoneTarget
              ? ', with ' + Math.round(handSupport) + ' percent stabilizing support, ' + Math.round(lubrication) + ' percent lubrication, and a ' + contactSpan + ' ring contact span. Upper pointer positions are clamped to the modeled lower trim zone. The selected wall is ' + selectedWallCm.toFixed(2) + ' centimeters, ' + selectedWallState + '. '
              : ', with ' + Math.round(handSupport) + ' percent inside support, ' + Math.round(lubrication) + ' percent lubrication, and a ' + contactSpan + ' ring contact span. Outside touch is ' + Math.round(pressure) + ' percent and inside support is ' + Math.round(handSupport) + ' percent: ' + touchRelationship + '. The selected wall is ' + selectedWallCm.toFixed(2) + ' centimeters, ' + selectedWallState + '. '));
        var svgLabel = 'Interactive pottery profile: ' + stats.shape + ', ' + vessel.heightCm.toFixed(1) + ' centimeters tall, minimum wall ' + stats.minWallCm.toFixed(2) + ' centimeters, ' + Math.round(stats.stability) + ' percent stability, ' + Math.round(vessel.centered) + ' percent centered with ' + wobbleLabel + ', ' + Math.round(stats.compression) + ' percent compression, stage ' + stageLabel(vessel.stage) + '. Active tool ' + activeTool + ' ' + activeTargetDescription + targetControlSummary + wetFilm.summary + ' ' + wetFilm.note + (formingPreviewAvailable ? ' ' + contactGeometry.summary + ' ' + contactGeometry.note : ' Contact geometry is inactive because the clay is no longer in a modeled forming stage.') + (formingPreviewAvailable && formingPreviewChanged ? ' The dashed profile predicts the next result, with stability changing by ' + formingPreviewStabilityDelta.toFixed(1) + ' points. Clay-flow preview: ' + formingFlow.summary : '') + (openingToolTarget ? ' Opening-floor proxy: ' + openingFloor.summary + ' ' + openingFloor.note : '') + (data.showCrossSection ? ' Wall-risk scan: ' + ringRiskProfile.summary + ' ' + ringRiskProfile.note + (showPredictedRiskPeak ? ' The gold dashed halo marks the predicted peak at ring ' + (previewCriticalRisk.index + 1) + ', ' + Math.round(previewCriticalRisk.risk * 100) + ' percent.' : '') : '') + (method === 'wheel' ? ' ' + displayedSurface.summary + ' ' + displayedSurface.note + ' ' + wheelDrive.summary + ' ' + wheelDrive.note + ' ' + wheelWobble.summary + ' ' + wheelWobble.note : ' The wheel hardware is stationary for handbuilding; no powered pedal response is shown.');
        function ringFromEvent(event) {
          var rect = event.currentTarget.getBoundingClientRect();
          var ratio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
          return potteryFormingTarget(activeTool, Math.round((1 - ratio) * (RING_COUNT - 1))).ring;
        }
        return h('svg', {
          viewBox: '0 0 520 460', role: 'img', tabIndex: 0, 'aria-label': svgLabel, 'aria-describedby': 'wheel-fire-vessel-help', 'aria-keyshortcuts': localRingTarget ? 'ArrowUp ArrowDown Enter Space' : 'Enter Space', 'data-wheel-fire-target-mode': formingPreviewAvailable ? contactGeometry.targetMode : activeTarget.mode, 'data-wheel-fire-target-constrained': lowerZoneTarget ? 'true' : undefined, 'data-wheel-fire-target-zone-min': lowerZoneTarget ? activeTarget.minRing + 1 : undefined, 'data-wheel-fire-target-zone-max': lowerZoneTarget ? activeTarget.maxRing + 1 : undefined, 'data-wheel-fire-opening-floor-state': openingToolTarget ? openingFloor.state : undefined, 'data-wheel-fire-opening-floor-cm': openingToolTarget ? openingFloor.floorThicknessCm.toFixed(2) : undefined, 'data-wheel-fire-opening-floor-ring': openingToolTarget && openingFloor.hasCavity ? openingFloor.floorRing + 1 : undefined, 'data-wheel-fire-wet-film': wetFilm.state, 'data-wheel-fire-body-moisture': wetFilm.bodyMoisturePct, 'data-wheel-fire-surface-lubrication': Math.round(wetFilm.lubricationPct), 'data-wheel-fire-splash-tendency': wetFilm.splashTendency.toFixed(3), 'data-wheel-fire-contact-mode': formingPreviewAvailable ? contactGeometry.id : undefined, 'data-wheel-fire-contact-target': formingPreviewAvailable ? contactGeometry.targetMode : undefined,
          'data-wheel-fire-ring-risk-map-visible': data.showCrossSection ? 'true' : undefined,
          'data-wheel-fire-risk-peak-ring': data.showCrossSection ? criticalRisk.index + 1 : undefined,
          'data-wheel-fire-risk-peak-pct': data.showCrossSection ? (criticalRisk.risk * 100).toFixed(1) : undefined,
          'data-wheel-fire-risk-preview-ring': data.showCrossSection && showPredictedRiskPeak ? previewCriticalRisk.index + 1 : undefined,
          className: 'w-full min-h-[320px] rounded-2xl border-2 border-amber-300 bg-[#2b211c] ' + (localRingTarget ? 'cursor-crosshair' : 'cursor-pointer'),
          onPointerDown: function (event) {
            if (event.button !== 0) return;
            var index = ringFromEvent(event);
            var canShape = vessel.stage === 'wet' || (vessel.stage === 'leather-hard' && activeTool === 'trim');
            if (!canShape) { if (localRingTarget) patchData({ workRing: index }); return; }
            if (!localRingTarget) { applyActive(rimTarget ? RING_COUNT - 1 : workRing); return; }
            event.currentTarget.__wheelFireLastAppliedRing = index;
            applyActive(index, { drag: true, start: true });
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
          },
          onPointerMove: function (event) {
            if (event.buttons !== 1 || activeGestureMode !== 'ring-drag') return;
            var index = ringFromEvent(event);
            if (event.currentTarget.__wheelFireLastAppliedRing === index || index === workRing) return;
            event.currentTarget.__wheelFireLastAppliedRing = index;
            applyActive(index, { drag: true });
          },
          onPointerUp: function (event) { if (activeGestureMode === 'ring-drag') finishGesture(); event.currentTarget.__wheelFireLastAppliedRing = null; try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (error) {} },
          onPointerCancel: function (event) { if (activeGestureMode === 'ring-drag') finishGesture(); if (event.currentTarget) event.currentTarget.__wheelFireLastAppliedRing = null; },
          onKeyDown: function (event) {
            if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && localRingTarget) { event.preventDefault(); patchData({ workRing: potteryFormingTarget(activeTool, workRing + (event.key === 'ArrowUp' ? 1 : -1)).ring }); }
            else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); applyActive(rimTarget ? RING_COUNT - 1 : workRing); }
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
            h('linearGradient', { id: 'wheel-fire-wet-sheen', x1: '0', y1: '0', x2: '1', y2: '.18' },
              h('stop', { offset: '0%', stopColor: '#e0f2fe', stopOpacity: 0 }),
              h('stop', { offset: '39%', stopColor: '#f0f9ff', stopOpacity: .08 }),
              h('stop', { offset: '58%', stopColor: '#f8fafc', stopOpacity: .82 }),
              h('stop', { offset: '73%', stopColor: '#bae6fd', stopOpacity: .12 }),
              h('stop', { offset: '100%', stopColor: '#e0f2fe', stopOpacity: 0 })),
            h('linearGradient', { id: 'wheel-fire-metal-gradient', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#b8a58f' }),
              h('stop', { offset: '48%', stopColor: '#66574c' }),
              h('stop', { offset: '100%', stopColor: '#2a2522' })),
            h('radialGradient', { id: 'wheel-fire-workshop-glow', cx: '50%', cy: '30%', r: '75%' },
              h('stop', { offset: '0%', stopColor: '#5b4638' }),
              h('stop', { offset: '100%', stopColor: '#171210' })),
            h('filter', { id: 'wheel-fire-shadow', x: '-30%', y: '-20%', width: '160%', height: '160%' }, h('feDropShadow', { dx: '0', dy: '8', stdDeviation: '7', floodColor: '#000', floodOpacity: '.48' })),
            h('marker', { id: 'wheel-fire-force-outside', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' }, h('path', { d: 'M0 0 L8 4 L0 8 Z', fill: '#fb923c' })),
            h('marker', { id: 'wheel-fire-force-support', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' }, h('path', { d: 'M0 0 L8 4 L0 8 Z', fill: '#2dd4bf' })),
            h('marker', { id: 'wheel-fire-clay-flow-arrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' }, h('path', { d: 'M0 0 L8 4 L0 8 Z', fill: '#facc15' }))
          ),
          h('rect', { x: 0, y: 0, width: 520, height: 460, rx: 18, fill: 'url(#wheel-fire-workshop-glow)', 'aria-hidden': 'true' }),
          h('path', { d: 'M0 315 L520 275 L520 460 L0 460 Z', fill: '#241b17', opacity: .78, 'aria-hidden': 'true' }),
          [55, 150, 260, 370, 465].map(function (x) { return h('line', { key: 'floor-' + x, x1: 260, y1: 300, x2: x, y2: 460, stroke: '#8a6f5c', strokeWidth: 1, opacity: .16, 'aria-hidden': 'true' }); }),
          lowerZoneTarget ? h('g', { 'data-wheel-fire-trim-zone': 'true', 'data-wheel-fire-trim-zone-min': activeTarget.minRing + 1, 'data-wheel-fire-trim-zone-max': activeTarget.maxRing + 1, 'aria-hidden': 'true' },
            h('rect', { x: 14, y: lowerZoneTopY, width: 492, height: Math.max(8, lowerZoneBottomY - lowerZoneTopY), rx: 8, fill: '#cbd5e1', opacity: .08 }),
            h('path', { d: 'M30 ' + lowerZoneTopY.toFixed(1) + ' H54 M38 ' + lowerZoneTopY.toFixed(1) + ' V' + lowerZoneBottomY.toFixed(1) + ' M30 ' + lowerZoneBottomY.toFixed(1) + ' H54', fill: 'none', stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 4', opacity: .9 }),
            h('text', { x: 58, y: lowerZoneTopY + 14, fill: '#f8fafc', fontSize: 11, fontWeight: 700 }, 'lower trim zone · rings ' + (activeTarget.minRing + 1) + '–' + (activeTarget.maxRing + 1))
          ) : null,
          h('g', { 'data-wheel-fire-wheel-hardware': 'true', 'aria-hidden': 'true' },
            h('path', { 'data-wheel-fire-drive-housing': 'true', d: wheelDrive.driveHousingPath, fill: 'url(#wheel-fire-metal-gradient)', stroke: '#181311', strokeWidth: 3 }),
            h('ellipse', { 'data-wheel-fire-splash-pan': 'true', cx: wheelDrive.splashPan.cx, cy: wheelDrive.splashPan.cy, rx: wheelDrive.splashPan.rx, ry: wheelDrive.splashPan.ry, fill: '#201a17', stroke: '#8a7664', strokeWidth: 4 }),
            method === 'wheel' && wetFilm.panSlipRatio > .005 ? h('ellipse', { 'data-wheel-fire-pan-slip': wetFilm.state, 'data-wheel-fire-pan-slip-ratio': wetFilm.panSlipRatio.toFixed(3), cx: wetFilm.pool.cx, cy: wetFilm.pool.cy, rx: wetFilm.pool.rx, ry: wetFilm.pool.ry, fill: 'none', stroke: '#7dd3fc', strokeWidth: wetFilm.panSlipWidthPx, opacity: wetFilm.panSlipOpacity }) : null,
            h('path', { 'data-wheel-fire-wheel-head-side': 'true', d: wheelDrive.wheelhead.sidePath, fill: '#3d332d', stroke: '#171311', strokeWidth: 2 }),
            h('ellipse', { 'data-wheel-fire-wheel-head': 'true', cx: wheelDrive.wheelhead.cx, cy: wheelDrive.wheelhead.cy, rx: wheelDrive.wheelhead.rx, ry: wheelDrive.wheelhead.ry, fill: 'url(#wheel-fire-metal-gradient)', stroke: '#d0b99e', strokeWidth: 4 }),
            method === 'wheel' ? h('ellipse', { 'data-wheel-fire-rotation-track': 'true', cx: wheelDrive.rotation.cx, cy: wheelDrive.rotation.cy, rx: wheelDrive.rotation.rx, ry: wheelDrive.rotation.ry, fill: 'none', stroke: '#d0b99e', strokeWidth: 1.5, opacity: .24 }) : null,
            method === 'wheel' ? h('ellipse', { 'data-wheel-fire-rotation-marker': wheelDrive.rotation.state, 'data-wheel-fire-revolution-seconds': wheelDrive.rotation.periodSeconds === null ? 'stopped' : wheelDrive.rotation.periodSeconds.toFixed(3), className: wheelDrive.rotation.periodSeconds === null ? undefined : 'wheel-fire-wheel-motion', cx: wheelDrive.rotation.cx, cy: wheelDrive.rotation.cy, rx: wheelDrive.rotation.rx, ry: wheelDrive.rotation.ry, fill: 'none', stroke: '#f5d7a8', strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: wheelDrive.rotation.dashArray, strokeDashoffset: 0, opacity: wheelDrive.rotation.periodSeconds === null ? .48 : .9, style: wheelDrive.rotation.periodSeconds === null ? undefined : { animationDuration: wheelDrive.rotation.periodSeconds.toFixed(3) + 's', '--wheel-fire-orbit-shift': wheelDrive.rotation.dashOffset.toFixed(1) } }) : null,
            h('g', { 'data-wheel-fire-spindle': 'true' },
              h('path', { d: wheelDrive.spindle.path, fill: '#433a34', stroke: '#171311', strokeWidth: 1.5 }),
              h('ellipse', { cx: wheelDrive.spindle.hubCx, cy: wheelDrive.spindle.hubCy, rx: wheelDrive.spindle.hubRx, ry: wheelDrive.spindle.hubRy, fill: '#a28e7d', stroke: '#211915', strokeWidth: 1.5 })
            ),
            method === 'wheel' ? h('g', { 'data-wheel-fire-speed-pedal': wheelDrive.pedal.travelPct, 'data-wheel-fire-pedal-state': wheelDrive.pedal.state },
              h('path', { d: wheelDrive.pedal.path, fill: '#6f5c4c', stroke: '#211915', strokeWidth: 2 }),
              h('path', { d: wheelDrive.pedal.highlightPath, fill: 'none', stroke: '#cbb69f', strokeWidth: 2, strokeLinecap: 'round' })
            ) : null,
            method === 'wheel' ? h('g', { 'data-wheel-fire-hardware-labels': 'true' },
              h('text', { 'data-wheel-fire-hardware-label': 'splash-pan', x: 20, y: 397, fill: '#fef3c7', fontSize: 11, fontWeight: 700 }, 'splash pan'),
              h('line', { x1: 80, y1: 394, x2: 96, y2: 408, stroke: '#d0b99e', strokeWidth: 1.5 }),
              h('text', { 'data-wheel-fire-wet-film-label': wetFilm.state, x: 20, y: 414, fill: wetFilm.state === 'excess-film' ? '#fecdd3' : '#bae6fd', fontSize: 11, fontWeight: 700 }, wetFilm.label + ' · body ' + wetFilm.bodyMoisturePct + '% moisture'),
              h('text', { 'data-wheel-fire-hardware-label': 'wheel-head', x: 500, y: 370, fill: '#fef3c7', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'wheel head'),
              h('text', { 'data-wheel-fire-rotation-label': 'true', x: 500, y: 384, fill: '#fef3c7', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, wheelDrive.rotation.label),
              h('line', { x1: 454, y1: 389, x2: 416, y2: 404, stroke: '#d0b99e', strokeWidth: 1.5 }),
              h('text', { 'data-wheel-fire-hardware-label': 'speed-pedal', x: 500, y: 438, fill: '#fef3c7', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'speed pedal · ' + wheelDrive.pedal.travelPct + '%'),
              h('line', { x1: 458, y1: 435, x2: wheelDrive.pedal.toeX + 3, y2: wheelDrive.pedal.toeY, stroke: '#d0b99e', strokeWidth: 1.5 })
            ) : null
          ),
          formingPreviewAvailable ? h('rect', { 'data-wheel-fire-contact-zone': contactGeometry.targetMode, x: 78, y: contactGeometry.outsidePad.cy - contactGeometry.contactHeightPx / 2, width: 364, height: contactGeometry.contactHeightPx, rx: 8, fill: '#22d3ee', opacity: .12, 'aria-hidden': 'true' }) : null,
          method === 'wheel' ? h('g', { 'data-wheel-fire-centering-axis': 'true', 'aria-hidden': 'true' },
            h('line', { x1: geometry.center, x2: geometry.center, y1: Math.max(58, geometry.top - 18), y2: wheelDrive.wheelhead.cy + 4, stroke: '#fef3c7', strokeWidth: 1.5, strokeDasharray: '5 6', opacity: .28 }),
            h('circle', { cx: geometry.center, cy: wheelDrive.wheelhead.cy, r: 3.5, fill: '#fef3c7', opacity: .55 })
          ) : null,
          method === 'wheel' && wobblePx > .6 ? h('ellipse', { 'data-wheel-fire-wobble-orbit': wheelWobble.motionState, 'data-wheel-fire-speed-load': wheelWobble.loadState, 'data-wheel-fire-wobble-cycle-seconds': wheelWobble.cycleSeconds === null ? 'stopped' : wheelWobble.cycleSeconds.toFixed(3), cx: geometry.center, cy: geometry.top, rx: rimOuterRx + wobblePx, ry: rimEllipseRy + wheelWobble.depthAmplitudePx, fill: 'none', stroke: '#fb7185', strokeWidth: 1.5, strokeDasharray: '6 6', opacity: .72, 'aria-hidden': 'true' }) : null,
          method === 'wheel' && localRingTarget && wetFilm.contactFilmOpacity > .01 ? h('path', { 'data-wheel-fire-contact-film': 'rear', 'data-wheel-fire-film-state': wetFilm.state, d: selectedWorkRingRearPath, fill: 'none', stroke: '#bae6fd', strokeWidth: wetFilm.contactFilmWidthPx, strokeLinecap: 'round', opacity: wetFilm.contactFilmOpacity * .48, 'aria-hidden': 'true' }) : null,
          method === 'wheel' && localRingTarget ? h('path', { 'data-wheel-fire-work-ring-arc': 'rear', d: selectedWorkRingRearPath, fill: 'none', stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7 7', strokeLinecap: 'round', opacity: .42, 'aria-hidden': 'true' }) : null,
          h('g', { 'data-wheel-fire-clay-orbit': method === 'wheel' ? wheelWobble.motionState : undefined, 'data-wheel-fire-speed-load': method === 'wheel' ? wheelWobble.loadState : undefined, 'data-wheel-fire-wobble-cycle-seconds': method === 'wheel' ? (wheelWobble.cycleSeconds === null ? 'stopped' : wheelWobble.cycleSeconds.toFixed(3)) : undefined, className: method === 'wheel' && wheelWobble.motionState === 'orbiting' ? 'wheel-fire-wobble-motion' : undefined, style: method === 'wheel' ? { '--wheel-fire-wobble': wobblePx.toFixed(1) + 'px', '--wheel-fire-wobble-neg': (-wobblePx).toFixed(1) + 'px', '--wheel-fire-wobble-diag': wheelWobble.diagonalAmplitudePx.toFixed(1) + 'px', '--wheel-fire-wobble-diag-neg': (-wheelWobble.diagonalAmplitudePx).toFixed(1) + 'px', '--wheel-fire-wobble-depth': wheelWobble.depthAmplitudePx.toFixed(1) + 'px', '--wheel-fire-wobble-depth-neg': (-wheelWobble.depthAmplitudePx).toFixed(1) + 'px', '--wheel-fire-wobble-depth-diag': wheelWobble.diagonalDepthPx.toFixed(1) + 'px', '--wheel-fire-wobble-depth-diag-neg': (-wheelWobble.diagonalDepthPx).toFixed(1) + 'px', animationDuration: wheelWobble.cycleSeconds === null ? undefined : wheelWobble.cycleSeconds.toFixed(3) + 's', transform: wheelWobble.motionState === 'stationary-offset' ? 'translate(' + wobblePx.toFixed(1) + 'px, 0px)' : undefined } : undefined },
            h('path', { d: geometry.outer, fill: data.showCrossSection ? fillColor : 'url(#wheel-fire-clay-gradient)', stroke: '#e2aa82', strokeWidth: 2, filter: 'url(#wheel-fire-shadow)' }),
            h('path', { 'data-wheel-fire-clay-sheen': wetFilm.state, 'data-wheel-fire-body-moisture': wetFilm.bodyMoisturePct, d: geometry.outer, fill: 'url(#wheel-fire-wet-sheen)', opacity: wetFilm.sheenOpacity, pointerEvents: 'none', 'aria-hidden': 'true' }),
            h('path', { d: geometry.cavity, fill: cavityColor, stroke: data.showCrossSection ? '#8e5b3d' : '#130d0a', strokeWidth: 2 }),
            h('ellipse', { cx: geometry.center, cy: geometry.top, rx: rimOuterRx, ry: rimEllipseRy, fill: fillColor, stroke: '#f1c39f', strokeWidth: 2, opacity: .98, 'aria-hidden': 'true' }),
            h('path', { 'data-wheel-fire-rim-sheen': wetFilm.state, d: 'M' + (geometry.center - rimOuterRx).toFixed(1) + ' ' + geometry.top.toFixed(1) + ' A' + rimOuterRx.toFixed(1) + ' ' + rimEllipseRy.toFixed(1) + ' 0 0 1 ' + (geometry.center + rimOuterRx).toFixed(1) + ' ' + geometry.top.toFixed(1), fill: 'none', stroke: '#f0f9ff', strokeWidth: 2.2, strokeLinecap: 'round', opacity: wetFilm.sheenOpacity * .9, 'aria-hidden': 'true' }),
            h('ellipse', { cx: geometry.center, cy: geometry.top, rx: rimInnerRx, ry: Math.max(2, rimEllipseRy * .72), fill: cavityColor, stroke: '#704832', strokeWidth: 2, 'aria-hidden': 'true' }),
            data.showCrossSection ? h('g', { 'data-wheel-fire-ring-risk-map': 'true', 'data-wheel-fire-risk-peak-ring': criticalRisk.index + 1, 'data-wheel-fire-risk-peak-pct': (criticalRisk.risk * 100).toFixed(1), 'data-wheel-fire-risk-high-count': ringRiskProfile.highCount, 'data-wheel-fire-risk-watch-count': ringRiskProfile.watchCount, pointerEvents: 'none', 'aria-hidden': 'true' },
              ringRiskProfile.rings.slice(1).map(function (ringRisk) {
                var lowerIndex = ringRisk.index - 1;
                var x1 = geometry.center + vessel.radii[lowerIndex] * geometry.scale;
                var y1 = geometry.bottom - lowerIndex / (RING_COUNT - 1) * geometry.heightPx;
                var x2 = geometry.center + vessel.radii[ringRisk.index] * geometry.scale;
                var y2 = geometry.bottom - ringRisk.index / (RING_COUNT - 1) * geometry.heightPx;
                var statusId = ringRisk.risk >= .67 ? 'high' : (ringRisk.risk >= .4 ? 'watch' : 'lower');
                return h('path', { key: 'wall-risk-' + ringRisk.index, 'data-wheel-fire-ring-risk': ringRisk.index + 1, 'data-wheel-fire-ring-risk-status': statusId, 'data-wheel-fire-ring-risk-pct': (ringRisk.risk * 100).toFixed(1), 'data-wheel-fire-ring-risk-signal': ringRisk.dominantSignalId, d: 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1), fill: 'none', stroke: ringRiskColor(ringRisk), strokeWidth: ringRiskWidth(ringRisk), strokeDasharray: ringRiskDash(ringRisk), strokeLinecap: 'round', opacity: ringRisk.risk >= .4 ? .96 : .66 });
              }),
              h('circle', { 'data-wheel-fire-risk-peak-marker': 'current', cx: criticalRiskX, cy: criticalRiskY, r: 8, fill: 'none', stroke: '#f8fafc', strokeWidth: 2.5 }),
              showPredictedRiskPeak ? h('circle', { 'data-wheel-fire-risk-peak-marker': 'predicted', 'data-wheel-fire-risk-preview-ring': previewCriticalRisk.index + 1, 'data-wheel-fire-risk-preview-pct': (previewCriticalRisk.risk * 100).toFixed(1), cx: previewCriticalRiskX, cy: previewCriticalRiskY, r: 12, fill: 'none', stroke: '#facc15', strokeWidth: 2.5, strokeDasharray: '4 3' }) : null
            ) : null,
            data.showFormingPreview !== false && formingPreviewAvailable && formingPreviewChanged ? h('path', { d: formingPreviewGeometry.outer, fill: 'none', stroke: formingPreviewVessel.collapsed ? '#fb7185' : '#fbbf24', strokeWidth: 3, strokeDasharray: '9 6', opacity: .95, pointerEvents: 'none', 'aria-hidden': 'true' }) : null,
            [4, 9, 14, 19, 24, 29, 34].map(function (ring) {
              var y = geometry.bottom - ring / (RING_COUNT - 1) * geometry.heightPx;
              var radius = vessel.radii[ring] * geometry.scale;
              return h('ellipse', { key: ring, cx: geometry.center, cy: y, rx: radius, ry: Math.max(2.4, radius * (0.035 + perspectiveDepth * 0.035)), fill: 'none', stroke: '#fff1df', strokeWidth: 1, opacity: method === 'coil' ? .3 : .16 });
            }),
            localRingTarget ? h('g', { 'data-wheel-fire-local-wall-ruler': 'true', 'aria-hidden': 'true' },
              h('line', { x1: geometry.center + selectedInnerRadius, x2: geometry.center + selectedOuterRadius, y1: selectedY, y2: selectedY, stroke: selectedWallColor, strokeWidth: 5, strokeLinecap: 'round' }),
              h('line', { x1: geometry.center + selectedInnerRadius, x2: geometry.center + selectedInnerRadius, y1: selectedY - 6, y2: selectedY + 6, stroke: selectedWallColor, strokeWidth: 2 }),
              h('line', { x1: geometry.center + selectedOuterRadius, x2: geometry.center + selectedOuterRadius, y1: selectedY - 6, y2: selectedY + 6, stroke: selectedWallColor, strokeWidth: 2 }),
              h('line', { x1: geometry.center + selectedOuterRadius + 5, x2: 498, y1: selectedY, y2: selectedY, stroke: selectedWallColor, strokeWidth: 1, strokeDasharray: '4 4', opacity: .8 }),
              h('text', { x: 500, y: clamp(selectedY - 9, 62, 406), fill: '#fff7ed', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, selectedWallLabel)
            ) : null,
            vessel.defects.indexOf('drying crack') >= 0 || vessel.defects.indexOf('thermal crack') >= 0 || vessel.defects.indexOf('dunting crack') >= 0 ? h('path', { d: 'M' + (geometry.center + vessel.radii[19] * geometry.scale * .62) + ',' + (geometry.bottom - 19 / 35 * geometry.heightPx) + ' l-12,18 9,15 -15,17', fill: 'none', stroke: '#2a1711', strokeWidth: 4, strokeLinecap: 'round' }) : null
          ),
          openingToolTarget ? h('g', { 'data-wheel-fire-opening-floor': 'true', 'data-wheel-fire-opening-floor-state': openingFloor.state, 'aria-hidden': 'true' },
            h('line', { 'data-wheel-fire-opening-floor-bracket': 'true', x1: 70, x2: 70, y1: geometry.bottom, y2: openingFloorY, stroke: openingFloorColor, strokeWidth: 3, strokeLinecap: 'round' }),
            h('line', { x1: 62, x2: 78, y1: geometry.bottom, y2: geometry.bottom, stroke: openingFloorColor, strokeWidth: 2 }),
            h('line', { x1: 62, x2: 78, y1: openingFloorY, y2: openingFloorY, stroke: openingFloorColor, strokeWidth: 2 }),
            h('line', { 'data-wheel-fire-opening-floor-level': 'current', x1: 78, x2: geometry.center, y1: openingFloorY, y2: openingFloorY, stroke: openingFloorColor, strokeWidth: 2, strokeDasharray: '6 5', opacity: .9 }),
            h('circle', { cx: geometry.center, cy: openingFloorY, r: 4.5, fill: openingFloorColor, stroke: '#ecfeff', strokeWidth: 1.5 }),
            h('text', { x: 84, y: clamp(openingFloorY - 8, 96, 394), fill: openingFloorColor, fontSize: 11, fontWeight: 700 }, 'floor proxy ' + openingFloor.floorThicknessCm.toFixed(2) + ' cm'),
            formingPreviewAvailable && Math.abs(formingPreviewFloorDelta) >= .01 ? h('g', { 'data-wheel-fire-opening-floor-preview': formingPreviewFloor.state },
              h('line', { x1: 78, x2: geometry.center, y1: previewOpeningFloorY, y2: previewOpeningFloorY, stroke: '#facc15', strokeWidth: 2.5, strokeDasharray: '4 4', opacity: .95 }),
              h('text', { x: 84, y: clamp(previewOpeningFloorY + 15, 110, 404), fill: '#fef08a', fontSize: 11, fontWeight: 700 }, 'next ' + formingPreviewFloor.floorThicknessCm.toFixed(2) + ' cm')
            ) : null
          ) : null,
          h('path', { 'data-wheel-fire-splash-pan-front': 'true', d: 'M64 420 A196 ' + (wheelEllipseRy + 9).toFixed(1) + ' 0 0 0 456 420', fill: 'none', stroke: '#c1a98f', strokeWidth: 5, opacity: .75, 'aria-hidden': 'true' }),
          method === 'wheel' && wetFilm.droplets.length ? h('g', { 'data-wheel-fire-slip-splash': wetFilm.state, 'data-wheel-fire-slip-droplet-count': wetFilm.dropletCount, 'aria-hidden': 'true' }, wetFilm.droplets.map(function (drop) { return h('circle', { key: 'slip-drop-' + drop.id, 'data-wheel-fire-slip-droplet': 'true', cx: drop.cx, cy: drop.cy, r: drop.radius, fill: '#bae6fd', stroke: '#e0f2fe', strokeWidth: .8, opacity: .88 }); })) : null,
          method === 'wheel' && localRingTarget && wetFilm.contactFilmOpacity > .01 ? h('path', { 'data-wheel-fire-contact-film': 'front', 'data-wheel-fire-film-state': wetFilm.state, d: selectedWorkRingFrontPath, fill: 'none', stroke: '#e0f2fe', strokeWidth: wetFilm.contactFilmWidthPx, strokeLinecap: 'round', opacity: wetFilm.contactFilmOpacity, 'aria-hidden': 'true' }) : null,
          localRingTarget ? (method === 'wheel' ? h('g', { 'data-wheel-fire-work-ring-kinematics': 'true', 'data-wheel-fire-surface-state': localSurface.state, 'data-wheel-fire-local-surface-speed': localSurface.surfaceSpeedCmPerSecond.toFixed(2), 'aria-hidden': 'true' },
            h('line', { x1: 71, x2: Math.max(71, selectedWorkRingLeft), y1: selectedY, y2: selectedY, stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7 7', opacity: .9 }),
            h('path', { 'data-wheel-fire-work-ring': 'true', 'data-wheel-fire-work-ring-arc': 'front', d: selectedWorkRingFrontPath, fill: 'none', stroke: '#67e8f9', strokeWidth: 2.5, strokeDasharray: '7 7', strokeLinecap: 'round', opacity: .95 })
          ) : h('line', { 'data-wheel-fire-work-ring': 'true', x1: 80, x2: 440, y1: selectedY, y2: selectedY, stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7 7', opacity: .9 })) : null,
          formingPreviewAvailable ? h('g', { 'data-wheel-fire-contact-geometry': contactGeometry.id, 'data-wheel-fire-contact-tool': contactGeometry.tool, 'data-wheel-fire-contact-target': contactGeometry.targetMode, 'data-wheel-fire-contact-balance': contactGeometry.balanceState, 'data-wheel-fire-contact-span-rings': contactGeometry.modeledSpanRings, pointerEvents: 'none', 'aria-hidden': 'true' },
            h('path', { 'data-wheel-fire-contact-silhouette': 'outside', d: contactGeometry.outsideArmPath, fill: 'none', stroke: '#fdba74', strokeWidth: contactGeometry.outsideArmWidthPx, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .48 }),
            h('path', { 'data-wheel-fire-contact-silhouette': 'inside', d: contactGeometry.insideArmPath, fill: 'none', stroke: '#99f6e4', strokeWidth: contactGeometry.insideArmWidthPx, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .46 }),
            h('ellipse', { 'data-wheel-fire-contact-pad': 'outside', 'data-wheel-fire-contact-kind': contactGeometry.outsideKind, 'data-wheel-fire-contact-role': contactGeometry.outsideRole, cx: contactGeometry.outsidePad.cx, cy: contactGeometry.outsidePad.cy, rx: contactGeometry.outsidePad.rx, ry: contactGeometry.outsidePad.ry, fill: '#fb923c', stroke: '#ffedd5', strokeWidth: contactGeometry.outsidePad.strokeWidth, opacity: contactGeometry.outsidePad.opacity }),
            h('ellipse', { 'data-wheel-fire-contact-pad': 'inside', 'data-wheel-fire-contact-kind': contactGeometry.insideKind, 'data-wheel-fire-contact-role': contactGeometry.insideRole, cx: contactGeometry.insidePad.cx, cy: contactGeometry.insidePad.cy, rx: contactGeometry.insidePad.rx, ry: contactGeometry.insidePad.ry, fill: '#2dd4bf', stroke: '#ccfbf1', strokeWidth: contactGeometry.insidePad.strokeWidth, opacity: contactGeometry.insidePad.opacity }),
            contactGeometry.implement.kind === 'trim-loop' ? h('g', { 'data-wheel-fire-contact-implement': 'trim-loop' },
              h('path', { d: contactGeometry.implement.handlePath, fill: 'none', stroke: '#d6b27a', strokeWidth: 5, strokeLinecap: 'round' }),
              h('ellipse', { cx: contactGeometry.implement.loop.cx, cy: contactGeometry.implement.loop.cy, rx: contactGeometry.implement.loop.rx, ry: contactGeometry.implement.loop.ry, fill: 'none', stroke: '#cbd5e1', strokeWidth: 2.4 })
            ) : (contactGeometry.implement.kind !== 'none' ? h('path', { 'data-wheel-fire-contact-implement': contactGeometry.implement.kind, d: contactGeometry.implement.path, fill: contactGeometry.implement.kind === 'coil' ? 'none' : (contactGeometry.implement.kind === 'scraper' ? '#cbd5e1' : '#d6b27a'), stroke: contactGeometry.implement.kind === 'coil' ? '#e2aa82' : '#f8fafc', strokeWidth: contactGeometry.implement.kind === 'coil' ? 5 : 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .96 }) : null),
            h('text', { 'data-wheel-fire-contact-label': contactGeometry.id, x: 20, y: 84, fill: '#fef3c7', fontSize: 11, fontWeight: 700 }, 'Contact · ' + contactGeometry.shortLabel)
          ) : null,
          showTouchForces && formingPreviewAvailable ? h('g', { 'data-wheel-fire-touch-forces': 'true', 'data-wheel-fire-force-target': contactGeometry.targetMode, 'data-wheel-fire-inside-touch': contactGeometry.insideTouchPct, 'aria-hidden': 'true' },
            h('line', { x1: contactGeometry.outsidePad.cx + 8 + outsideForceLength, x2: contactGeometry.outsidePad.cx + 8, y1: contactGeometry.outsidePad.cy - 11, y2: contactGeometry.outsidePad.cy - 11, stroke: '#fb923c', strokeWidth: 2.4 + pressure * .025, strokeLinecap: 'round', markerEnd: 'url(#wheel-fire-force-outside)' }),
            h('line', { x1: contactGeometry.insidePad.cx - 8 - insideForceLength, x2: contactGeometry.insidePad.cx - 8, y1: contactGeometry.insidePad.cy + 11, y2: contactGeometry.insidePad.cy + 11, stroke: '#2dd4bf', strokeWidth: 2.4 + modeledInsideTouch * .025, strokeLinecap: 'round', markerEnd: 'url(#wheel-fire-force-support)' }),
            h('text', { x: 20, y: 65, fill: '#fff7ed', fontSize: 11, fontWeight: 700 }, wholeFormTarget ? 'Matched centering brace · ' + Math.round(pressure) + '% each side · whole-form target' : (rimTarget ? 'Rim placement · pressure ' + Math.round(pressure) + '% · rim support ' + Math.round(handSupport) + '%' : (lowerZoneTarget ? 'Trim touch · tool pressure ' + Math.round(pressure) + '% · stabilizing support ' + Math.round(handSupport) + '%' : 'Relative touch: outside ' + Math.round(pressure) + '% · inside support ' + Math.round(handSupport) + '% · ' + touchRelationship)))
          ) : null,
          showFormingFlow ? h('g', { 'data-wheel-fire-forming-flow': 'true', 'aria-hidden': 'true' },
            Math.abs(formingFlow.outerDeltaCm) >= .005 ? h('g', null,
              h('line', { x1: formingFlow.outerDeltaCm > 0 ? geometry.center + flowOuterRadius + 10 : geometry.center + flowOuterRadius + 10 + outerFlowLength, x2: formingFlow.outerDeltaCm > 0 ? geometry.center + flowOuterRadius + 10 + outerFlowLength : geometry.center + flowOuterRadius + 10, y1: clamp(flowY - 34, 88, 398), y2: clamp(flowY - 34, 88, 398), stroke: '#facc15', strokeWidth: 3, strokeDasharray: '6 4', markerEnd: 'url(#wheel-fire-clay-flow-arrow)' }),
              h('text', { x: Math.min(496, geometry.center + flowOuterRadius + 14), y: clamp(flowY - 41, 80, 390), fill: '#fef08a', fontSize: 11, fontWeight: 700 }, 'outer ' + (formingFlow.outerDeltaCm > 0 ? '+' : '−') + Math.abs(formingFlow.outerDeltaCm).toFixed(2) + ' cm')
            ) : null,
            Math.abs(formingFlow.innerDeltaCm) >= .005 ? h('g', null,
              h('line', { x1: formingFlow.innerDeltaCm > 0 ? geometry.center + flowInnerRadius - 10 - innerFlowLength : geometry.center + flowInnerRadius - 10, x2: formingFlow.innerDeltaCm > 0 ? geometry.center + flowInnerRadius - 10 : geometry.center + flowInnerRadius - 10 - innerFlowLength, y1: clamp(flowY + 34, 92, 402), y2: clamp(flowY + 34, 92, 402), stroke: '#facc15', strokeWidth: 3, strokeDasharray: '6 4', markerEnd: 'url(#wheel-fire-clay-flow-arrow)' }),
              h('text', { x: geometry.center + flowInnerRadius - 14, y: clamp(flowY + 49, 106, 418), fill: '#fef08a', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'cavity ' + (formingFlow.innerDeltaCm > 0 ? '+' : '−') + Math.abs(formingFlow.innerDeltaCm).toFixed(2) + ' cm')
            ) : null,
            Math.abs(formingFlow.heightDeltaCm) >= .005 ? h('g', null,
              h('line', { x1: 98, x2: 98, y1: formingFlow.heightDeltaCm > 0 ? geometry.top + 58 : geometry.top + 58 - heightFlowLength, y2: formingFlow.heightDeltaCm > 0 ? geometry.top + 58 - heightFlowLength : geometry.top + 58, stroke: '#facc15', strokeWidth: 3, strokeDasharray: '6 4', markerEnd: 'url(#wheel-fire-clay-flow-arrow)' }),
              h('text', { x: 108, y: geometry.top + 52 - heightFlowLength / 2, fill: '#fef08a', fontSize: 11, fontWeight: 700 }, 'height ' + (formingFlow.heightDeltaCm > 0 ? '+' : '−') + Math.abs(formingFlow.heightDeltaCm).toFixed(2) + ' cm')
            ) : null,
            activeTool === 'trim' && formingFlow.clayVolumeDeltaCm3 < -.5 ? h('g', null, [0, 1, 2].map(function (chip) { return h('circle', { key: 'chip-' + chip, cx: geometry.center + flowOuterRadius + 22 + chip * 10, cy: flowY - 5 + chip * 7, r: 2.5 + chip * .5, fill: '#facc15' }); })) : null
          ) : null,
          localRingTarget ? h('circle', { 'data-wheel-fire-work-ring-marker': 'true', cx: 62, cy: selectedY, r: 9, fill: '#06b6d4', stroke: '#cffafe', strokeWidth: 3 }) : null,
          h('text', { 'data-wheel-fire-surface-speed-label': method === 'wheel' ? 'true' : undefined, 'data-wheel-fire-surface-scope': method === 'wheel' ? (wholeFormTarget ? 'whole-form' : 'selected-ring') : undefined, 'data-wheel-fire-whole-form-kinematics': method === 'wheel' && wholeFormTarget ? 'true' : undefined, 'data-wheel-fire-min-surface-speed': method === 'wheel' && wholeFormTarget ? wholeFormSurface.minSurfaceSpeedCmPerSecond.toFixed(2) : undefined, 'data-wheel-fire-max-surface-speed': method === 'wheel' && wholeFormTarget ? wholeFormSurface.maxSurfaceSpeedCmPerSecond.toFixed(2) : undefined, x: 20, y: 25, fill: '#fef3c7', fontSize: 13, fontWeight: 800 }, method === 'wheel' ? displayedSurface.displayLabel : 'Handbuilding'),
          h('text', { x: 500, y: 25, fill: '#fef3c7', fontSize: 13, textAnchor: 'end' }, data.showCrossSection ? 'Material cutaway' : '3D wheel · ' + Math.round(cameraTilt) + '° tilt'),
          h('text', { x: 20, y: 45, fill: wetFilm.state === 'excess-film' ? '#fecdd3' : '#cffafe', fontSize: 11, fontWeight: 700 }, wholeFormTarget ? 'Brace pressure ' + Math.round(pressure) + '% · ' + wetFilm.label + ' ' + Math.round(lubrication) + '% · all ' + RING_COUNT + ' rings' : (rimTarget ? 'Rim support ' + Math.round(handSupport) + '% · ' + wetFilm.label + ' ' + Math.round(lubrication) + '% · top 5 rings' : (lowerZoneTarget ? 'Trim ring ' + (workRing + 1) + ' · lower zone ' + (activeTarget.minRing + 1) + '–' + (activeTarget.maxRing + 1) + ' · ' + contactSpan + '-ring contact' : (openingToolTarget ? 'Floor proxy ' + openingFloor.floorThicknessCm.toFixed(2) + ' cm · cavity depth ' + openingFloor.cavityDepthCm.toFixed(2) + ' cm · ring ' + (workRing + 1) : 'Support ' + Math.round(handSupport) + '% · ' + wetFilm.label + ' ' + Math.round(lubrication) + '% · ' + contactSpan + '-ring contact')))),
          method === 'wheel' ? h('text', { x: 500, y: 45, fill: vessel.centered >= 70 ? '#d9f99d' : '#fecdd3', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'Centering ' + Math.round(vessel.centered) + '% · ' + wobbleLabel) : null
        );
      }
      function shapePanel() {
        var wheelTools = [
          { id: 'center', label: 'Center', icon: '◎', help: 'Reduce wobble and average the rotational profile.' },
          { id: 'open', label: 'Open', icon: '◯', help: 'Widen the cavity and study the remaining modeled floor.' },
          { id: 'pull', label: 'Pull wall', icon: '↟', help: 'Trade wall thickness for height.' },
          { id: 'belly', label: 'Expand', icon: '↔', help: 'Push the profile outward.' },
          { id: 'collar', label: 'Collar', icon: '→←', help: 'Narrow the profile.' },
          { id: 'smooth', label: 'Rib', icon: '≈', help: 'Average nearby rings and smooth the surface.' },
          { id: 'trim', label: 'Trim', icon: '⌁', help: 'Remove clay from the lower exterior.' }
        ];
        var coilTools = [
          { id: 'add-coil', label: 'Add coil', icon: '⊕', help: 'Add clay mass and height at the rim.' },
          { id: 'open', label: 'Pinch open', icon: '◯', help: 'Pinch the cavity locally and monitor the modeled floor.' },
          { id: 'belly', label: 'Push out', icon: '↔', help: 'Expand a local section.' },
          { id: 'collar', label: 'Draw in', icon: '→←', help: 'Narrow a local section.' },
          { id: 'paddle', label: 'Paddle', icon: '▥', help: 'Compress and regularize coils.' },
          { id: 'smooth', label: 'Smooth', icon: '≈', help: 'Blend coil transitions.' },
          { id: 'trim', label: 'Scrape', icon: '⌁', help: 'Remove clay at leather-hard or wet stages.' }
        ];
        var tools = method === 'wheel' ? wheelTools : coilTools;
        var selectedTool = tools.filter(function (tool) { return tool.id === activeTool; })[0] || tools[0];
        var selectedGestureMode = formingToolGestureMode(selectedTool.id);
        var selectedTarget = potteryFormingTarget(selectedTool.id, workRing);
        var selectedLowerZone = selectedTarget.mode === 'lower-zone';
        var selectedOpeningTool = selectedTool.id === 'open';
        var selectedTargetRing = selectedTarget.ring;
        var canFocusRiskRing = selectedTarget.mode === 'selected-ring';
        var selectedRingRisk = ringRiskProfile.rings[selectedTargetRing];
        var previewSelectedRingRisk = formingPreviewRiskProfile.rings[selectedTargetRing];
        var applyButtonLabel = selectedGestureMode === 'single-global' ? 'Center whole form' : (selectedGestureMode === 'single-rim' ? 'Add one coil at rim' : (selectedLowerZone ? 'Apply ' + selectedTool.label + ' at lower-zone ring ' + (selectedTargetRing + 1) + ' of ' + (selectedTarget.maxRing + 1) : 'Apply ' + selectedTool.label + ' at work zone ' + (workRing + 1) + ' of ' + RING_COUNT));
        function toolAllowed(tool) { return vessel.stage === 'wet' || (vessel.stage === 'leather-hard' && tool.id === 'trim'); }
        var toolStageNote = vessel.stage === 'wet' ? 'Wet clay accepts the full forming toolkit.' : (vessel.stage === 'leather-hard' ? 'Leather-hard clay only accepts Trim/Scrape in this model.' : 'Shaping is paused after leather-hard; continue in Dry & fire.');
        function focusOpeningFloor() {
          patchData({ workRing: openingFloor.targetRing, showCrossSection: true });
          announce('Focused the modeled cavity floor at ring ' + (openingFloor.targetRing + 1) + ' and opened the material cutaway.');
        }
        function inspectHighestRiskRing() {
          var riskPatch = { showCrossSection: true };
          if (canFocusRiskRing) riskPatch.workRing = ringRiskProfile.criticalRing;
          patchData(riskPatch);
          announce((canFocusRiskRing ? 'Focused' : 'Revealed') + ' the highest comparative wall-risk signal at ring ' + (ringRiskProfile.criticalRing + 1) + ' in the material cutaway.');
        }
        function useSaferTouchSetup() {
          var safer = {
            pressure: Math.round(clamp(pressure - 15, 15, 80)),
            lubrication: Math.round(clamp(lubrication, 20, 60))
          };
          if (selectedGestureMode !== 'single-global') safer.handSupport = Math.round(Math.max(75, handSupport));
          if (selectedGestureMode === 'ring-drag') safer.contactSpan = Math.round(Math.max(7, contactSpan));
          if (method === 'wheel') safer.rpm = Math.round(clamp(rpm - 15, 20, 75));
          patchData(safer);
          announce('Loaded a safer comparative touch setup. Review the new forecast before applying the tool.');
        }
        function formingForecast() {
          if (!formingPreviewAvailable) return null;
          var reasons = [];
          if (pressure >= 75) reasons.push('high pressure');
          if (method === 'wheel' && rpm >= 80) reasons.push('high wheel speed');
          if (selectedGestureMode !== 'single-global' && handSupport < 35) reasons.push(selectedGestureMode === 'single-rim' ? 'low rim support' : 'low inside support');
          if (lubrication > 78) reasons.push('excess lubrication');
          if (selectedGestureMode === 'ring-drag' && contactSpan <= 4) reasons.push('concentrated contact');
          if (selectedOpeningTool && formingPreviewFloor.state === 'puncture-risk') reasons.push('opening reaches the lowest modeled floor interval');
          var title = formingPreviewVessel.collapsed ? 'Collapse forecast' : (formingPreviewRisky ? 'High-risk forecast' : 'Before you shape');
          var outcome = formingPreviewChanged ? (formingPreviewVessel.lastOutcome || 'The model predicts a measurable profile change.') : 'This setup predicts little measurable change at the selected ring.';
          var reasonText = reasons.length ? 'Main setup signals: ' + reasons.join(', ') + '.' : 'The selected touch inputs remain within the model’s lower-risk comparative range.';
          return h('section', { className: 'rounded-xl border p-3 space-y-2 ' + (formingPreviewRisky ? 'border-rose-400 bg-rose-50 text-rose-950' : 'border-amber-300 bg-amber-50 text-amber-950'), role: 'status', 'aria-live': 'polite', 'aria-labelledby': 'wheel-fire-forming-forecast-title' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('h3', { id: 'wheel-fire-forming-forecast-title', className: 'font-black' }, title),
              h('span', { className: 'text-[11px] font-bold' }, 'Preview only · no clay changed')
            ),
            h('p', { className: 'text-xs' }, outcome),
            h('p', { className: 'text-[11px] font-bold' }, 'Predicted: stability ' + signed(formingPreviewStabilityDelta, 1, ' pts') + ' · minimum wall ' + signed(formingPreviewWallDelta, 2, ' cm') + ' · height ' + signed(formingPreviewHeightDelta, 2, ' cm') + ' · capacity ' + signed(formingPreviewCapacityDelta, 0, ' mL')),
            selectedOpeningTool ? h('p', { 'data-wheel-fire-opening-floor-forecast': formingPreviewFloor.state, 'data-wheel-fire-opening-floor-current': openingFloor.floorThicknessCm.toFixed(2), 'data-wheel-fire-opening-floor-next': formingPreviewFloor.floorThicknessCm.toFixed(2), className: 'text-[11px]' },
              h('strong', null, 'Opening floor: '), openingFloor.floorThicknessCm.toFixed(2) + ' cm now → ' + formingPreviewFloor.floorThicknessCm.toFixed(2) + ' cm predicted. ',
              Math.abs(formingPreviewFloorDelta) < .01 ? 'This work ring widens the cavity without changing the vertical floor proxy; focus the cavity floor to study opening depth.' : (formingPreviewFloorDelta < 0 ? 'The modeled cavity deepens by ' + Math.abs(formingPreviewFloorDelta).toFixed(2) + ' cm.' : 'The modeled floor proxy increases by ' + formingPreviewFloorDelta.toFixed(2) + ' cm after volume redistribution.')
            ) : null,
            formingPreviewChanged ? h('p', { className: 'text-[11px]' }, h('strong', null, 'Clay-flow preview: '), formingFlow.summary, selectedGestureMode === 'single-global' ? ' The arrow samples ring ' + (formingFlow.sampleRing + 1) + '; Center still acts across all ' + RING_COUNT + ' modeled rings.' : (selectedGestureMode === 'single-rim' ? ' The cue stays at the top five modeled rim rings; pressing or dragging elsewhere does not move the coil target.' : (selectedLowerZone ? ' The cue and work ring stay within lower-exterior rings ' + (selectedTarget.minRing + 1) + '–' + (selectedTarget.maxRing + 1) + '; higher pointer positions clamp to the top of that zone.' : (formingFlow.sampleRing !== formingFlow.requestedRing ? ' The cue is shown at ring ' + (formingFlow.sampleRing + 1) + ', where this tool acts.' : '')))) : null,
            h('p', { className: 'text-[11px]' }, reasonText),
            h('div', { className: 'flex flex-wrap items-center gap-3' },
              h('label', { className: 'flex items-center gap-2 text-xs font-bold' }, h('input', { type: 'checkbox', checked: data.showFormingPreview !== false, onChange: function (event) { patchData({ showFormingPreview: event.target.checked }); } }), 'Show predicted profile and clay flow'),
              formingPreviewRisky ? h('button', { type: 'button', onClick: useSaferTouchSetup, className: 'rounded-lg border border-rose-500 bg-white px-3 py-2 text-xs font-black text-rose-900' }, 'Use safer touch setup') : null
            )
          );
        }
        return h('section', { id: 'wheel-fire-panel-shape', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-shape', className: 'space-y-3' },
          h('div', { className: 'wheel-fire-main' },
            h('div', { className: 'space-y-2' }, vesselSvg(),
              h('p', { id: 'wheel-fire-vessel-help', className: 'text-[11px] text-slate-600 text-center' },
                h('span', { className: 'block font-bold text-slate-700' }, 'Center applies once to the whole form. Add coil applies once at the rim. Trim/Scrape stays in the highlighted lower zone. Open adds a cavity-floor ruler. Other local tools apply where you press or drag, once per newly entered ring.'),
                selectedGestureMode === 'single-global'
                  ? h('span', { className: 'block', 'data-wheel-fire-whole-form-help': 'true' }, 'Center target: press once anywhere on the vessel or use Center whole form. The pale cyan band and paired braces represent a whole-form pass, so no local work-ring marker or wall ruler is shown. Orange and teal arrows show matched opposing brace pressure; inside-hand support, contact span, and work height do not affect Center. The dashed amber outline predicts the next profile. Keyboard: press Enter or Space to apply Center.')
                  : (selectedGestureMode === 'single-rim'
                    ? h('span', { className: 'block', 'data-wheel-fire-rim-target-help': 'true' }, 'Rim target: press once anywhere on the vessel or use Add one coil at rim. The coil and support cues stay at the top five modeled rings, so no local work-ring marker or wall ruler is shown. Hand pressure, rim support, surface lubrication, and clay moisture affect placement; contact span and work height do not. Paddle or smooth the new joint before drying. Keyboard: press Enter or Space to add one coil.')
                    : (selectedLowerZone
                      ? h('span', { className: 'block', 'data-wheel-fire-lower-zone-help': 'true' }, 'Lower trim target: press or drag within the highlighted lower-exterior band. Pointer positions above the band clamp to its top ring, so Trim/Scrape cannot report removing clay from an unaffected upper wall. The blue dashed line and wall ruler show the actual constrained ring; the pale cyan band shows contact span. Trimming removes modeled mass rather than redistributing it. Keyboard: Arrow keys stay within rings ' + (selectedTarget.minRing + 1) + '–' + (selectedTarget.maxRing + 1) + ', then Enter or Space applies the tool.')
                      : (selectedOpeningTool
                        ? h('span', { className: 'block', 'data-wheel-fire-opening-floor-help': 'true' }, 'Opening target: press or drag on the cavity. The cyan bracket shows the current modeled floor proxy from the wheel head to the first open cavity ring; a gold line predicts the next floor when the selected pass would deepen it. Use Focus cavity floor to move the work ring to that boundary and open the material cutaway. Repeated deep passes can add a recoverable base-puncture flag, so compare the forecast before applying. The ruler is a vertical ring-resolution proxy, not measured base thickness or studio safety guidance. Keyboard: use Arrow keys, then Enter or Space to apply Open.')
                        : h('span', { className: 'block', 'data-wheel-fire-local-target-help': 'true' }, 'Local target: press or drag on the vessel. The blue dashed line is the selected work ring; the pale cyan band shows the active contact zone. The local wall ruler measures from the cavity to the outer surface. Orange and teal arrows compare outside touch with inside support at that contact zone; their percentages are relative controls, not force in newtons. Gold arrows show measured predicted displacement of the outer wall, cavity, or height. Neutral orange and teal contact silhouettes show outside and inside roles; their height follows the modeled contact span, and the outside shape becomes a rib, paddle, or scraper when applicable. These silhouettes show interaction roles—not hand anatomy, measured contact area, force, posture, ergonomics, or technique and safety instruction. The dashed amber outline predicts the next profile. Keyboard: use Arrow keys, then press Enter or Space to apply the active tool.')))),
                selectedGestureMode === 'single-global'
                  ? h('span', { className: 'block mt-1' }, ' In wheel mode, the whole-form speed range reports the slowest and fastest modeled ring speeds from 2πr × RPM ÷ 60. Wider rings travel farther each revolution. This is tangential clay speed, not hand speed, relative slip, drag, or force.')
                  : (selectedGestureMode === 'single-rim'
                    ? h('span', { className: 'block mt-1' }, ' Handbuilding keeps the powered wheel stationary. The highlighted top-five-ring band is a schematic coil-placement target, not a measured coil diameter, contact area, or hand position.')
                    : h('span', { className: 'block mt-1' }, ' In wheel mode, the cyan work-ring ellipse reports local clay speed from 2πr × RPM ÷ 60, so wider rings travel farther each revolution. This is tangential clay speed, not hand speed, relative slip, drag, or force.')),
                h('span', { className: 'block mt-1' }, selectedGestureMode === 'single-global' ? ' Clay-body moisture and surface lubrication are separate modeled inputs. Center uses the whole-form sheen and splash-pan trace instead of a selected-ring film. Moderate lubrication shows a working film; above 72% it becomes excess film, reduces modeled control, and can produce a comparative splash cue as wheel speed rises. Film width, pan slip, and droplets are schematic—not measured water content, slip volume, spray range, chemistry, or cleanup guidance.' : (selectedGestureMode === 'single-rim' ? ' Clay-body moisture and surface lubrication are separate modeled inputs. Handbuilding keeps the clay sheen but suppresses powered splash-pan accumulation. Lubrication remains a comparative contact-film control, not measured water content, slip volume, material chemistry, or cleanup guidance.' : ' Clay-body moisture and surface lubrication are separate modeled inputs. The clay sheen combines both, while the selected-ring film and splash-pan trace respond to surface lubrication. Moderate lubrication shows a working film; above 72% it becomes excess film, reduces modeled control, and can produce a comparative splash cue as wheel speed rises. Film width, pan slip, and droplets are schematic—not measured water content, slip volume, spray range, chemistry, or cleanup guidance.')),
                data.showCrossSection ? h('span', { className: 'block mt-1', 'data-wheel-fire-ring-risk-help': 'true' }, ' The material cutaway adds a wall-risk scan along the right profile edge: thin lime dashes mean lower signal, amber dashes mean watch, and a rose solid edge means high. A white circle marks the current peak; a gold dashed halo marks the predicted peak when the next pass changes it. The scan combines wall thickness, slope, irregularity, moisture, compression, material, support, and handling inputs. It is comparative—not measured stress, failure probability, a safe-thickness limit, or studio safety guidance.') : null,
                h('span', { className: 'block mt-1' }, ' Off-center clay follows one perspective-compressed elliptical wobble path per revolution; reduced-motion settings hold one visible phase. The gold registration mark makes one circuit per modeled revolution (60 divided by RPM). The labeled speed pedal follows selected RPM as a schematic travel cue. The orbit and pedal travel are schematic; they do not model measured displacement, rotation direction, a specific wheel\'s pedal curve, torque, braking, or safe operating technique.')
              ),
              formingForecast(),
              h('div', { className: 'wheel-fire-stats', role: 'group', 'aria-label': 'Live vessel measurements' },
                metricCard('Stability', percent(stats.stability), stats.status, stats.stability >= 55 ? 'border-emerald-300' : 'border-red-300'),
                metricCard('Minimum wall', stats.minWallCm.toFixed(2) + ' cm', 'Average ' + stats.averageWallCm.toFixed(2) + ' cm'),
                metricCard('Clay mass', Math.round(stats.massG) + ' g', 'Approx. volume ' + Math.round(stats.volumeCm3) + ' cm³'),
                metricCard('Capacity', Math.round(stats.capacityMl) + ' mL', stats.shape),
                selectedOpeningTool ? metricCard('Opening floor', openingFloor.floorThicknessCm.toFixed(2) + ' cm proxy', openingFloor.cavityDepthCm.toFixed(2) + ' cm cavity · ' + openingFloor.label, openingFloor.state === 'puncture-risk' ? 'border-rose-400' : 'border-cyan-300') : null
              ),
              h('details', { className: 'rounded-xl border border-amber-200 bg-amber-50 p-3' },
                h('summary', { className: 'cursor-pointer text-xs font-black text-amber-950' }, 'What do these numbers mean?'),
                h('dl', { className: 'grid sm:grid-cols-2 gap-2 mt-2 text-[11px] text-amber-950' },
                  h('div', null, h('dt', { className: 'font-black' }, 'Stability'), h('dd', null, 'How well the current shape tolerates pressure, speed, moisture, height, and overhang.')),
                  h('div', null, h('dt', { className: 'font-black' }, 'Minimum wall'), h('dd', null, 'The thinnest modeled zone. Thinner can save clay but may reduce strength or make drying harder to control.')),
                  h('div', null, h('dt', { className: 'font-black' }, 'Clay mass'), h('dd', null, 'An approximate amount of clay. Adding a coil increases mass; trimming removes it.')),
                  h('div', null, h('dt', { className: 'font-black' }, 'Capacity'), h('dd', null, 'Modeled interior volume. Opening, pulling, and expanding change it even when the outside silhouette looks similar.')),
                  selectedOpeningTool ? h('div', { 'data-wheel-fire-opening-floor-definition': 'true' }, h('dt', { className: 'font-black' }, 'Opening floor'), h('dd', null, 'A vertical ring-resolution proxy from the wheel head to the first open cavity ring. It helps compare opening depth, but it is not a measured base thickness or safety instruction.')) : null
                )
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
                rangeControl('wheel-fire-hand-support', selectedLowerZone ? 'Stabilizing support' : 'Inside-hand support', handSupport, 0, 100, '%', function (value) { patchData({ handSupport: value }); }, selectedGestureMode === 'single-global'),
                rangeControl('wheel-fire-lubrication', 'Surface lubrication', lubrication, 0, 100, '%', function (value) { patchData({ lubrication: value }); }),
                h('div', { className: 'wheel-fire-advanced' }, rangeControl('wheel-fire-contact-span', 'Contact span', contactSpan, 3, 11, ' rings', function (value) { patchData({ contactSpan: Math.round(value) }); }, selectedGestureMode !== 'ring-drag')),
                h('div', { className: 'wheel-fire-advanced' }, rangeControl('wheel-fire-camera-tilt', '3D camera tilt', cameraTilt, 20, 70, '°', function (value) { patchData({ cameraTilt: value }); })),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Clay moisture describes modeled water in the body; surface lubrication describes added water or slip at contact. A moderate film reduces modeled drag; above 72% it becomes excess and reduces control. A wider contact span distributes the same move across more rings.'),
                rangeControl('wheel-fire-rpm', 'Wheel speed', rpm, 0, 120, ' RPM', function (value) { patchData({ rpm: value }); }, method !== 'wheel'),
                rangeControl('wheel-fire-moisture', 'Clay moisture', vessel.moisture * 100, 5, 100, '%', function (value) { var next = copyVessel(vessel); next.moisture = value / 100; next.lastOutcome = 'Clay moisture adjusted for the simulation.'; commitVessel(next, next.lastOutcome); }),
                rangeControl('wheel-fire-height', selectedLowerZone ? 'Trim height (lower ring)' : 'Work height (ring)', workRing + 1, selectedLowerZone ? selectedTarget.minRing + 1 : 1, selectedLowerZone ? selectedTarget.maxRing + 1 : RING_COUNT, ' / ' + (selectedLowerZone ? selectedTarget.maxRing + 1 : RING_COUNT), function (value) { patchData({ workRing: potteryFormingTarget(selectedTool.id, value - 1).ring }); }, selectedGestureMode !== 'ring-drag'),
                selectedGestureMode === 'single-global' ? h('p', { 'data-wheel-fire-whole-form-controls': 'true', className: 'rounded-lg border border-teal-200 bg-teal-50 p-2 text-[11px] font-bold text-teal-950' }, 'Center target · all ' + RING_COUNT + ' rings. Hand pressure, wheel speed, surface lubrication, and clay moisture affect this pass. Inside-hand support, contact span, and work height are disabled because Center does not use them.') : null,
                selectedGestureMode === 'single-rim' ? h('p', { 'data-wheel-fire-rim-controls': 'true', className: 'rounded-lg border border-teal-200 bg-teal-50 p-2 text-[11px] font-bold text-teal-950' }, 'Add coil target · top 5 rim rings. Hand pressure, inside support, surface lubrication, and clay moisture affect placement. Contact span and work height are disabled because the target stays at the rim.') : null,
                selectedLowerZone ? h('p', { 'data-wheel-fire-lower-zone-controls': 'true', className: 'rounded-lg border border-slate-300 bg-slate-50 p-2 text-[11px] font-bold text-slate-800' }, selectedTool.label + ' target · lower exterior rings ' + (selectedTarget.minRing + 1) + '–' + (selectedTarget.maxRing + 1) + '. Pointer, keyboard, slider, preview, and physics all use this same constrained zone; clay removed here is subtracted from modeled mass.') : null,
                selectedOpeningTool ? h('div', { 'data-wheel-fire-opening-floor-controls': 'true', 'data-wheel-fire-opening-floor-control-state': openingFloor.state, className: 'rounded-lg border p-2 space-y-2 ' + (openingFloor.state === 'puncture-risk' ? 'border-rose-300 bg-rose-50 text-rose-950' : 'border-cyan-300 bg-cyan-50 text-cyan-950') },
                  h('p', { className: 'text-[11px]' }, h('strong', null, 'Opening floor · ' + openingFloor.floorThicknessCm.toFixed(2) + ' cm proxy · ' + openingFloor.cavityDepthCm.toFixed(2) + ' cm cavity. '), openingFloor.label + '. ' + openingFloor.summary),
                  h('button', { type: 'button', 'data-wheel-fire-opening-floor-focus': 'true', onClick: focusOpeningFloor, className: 'rounded-lg border border-cyan-700 bg-white px-3 py-2 text-xs font-black text-cyan-950' }, 'Focus cavity floor · ring ' + (openingFloor.targetRing + 1))
                ) : null,
                h('div', { 'data-wheel-fire-ring-risk-controls': 'true', 'data-wheel-fire-ring-risk-current-peak': ringRiskProfile.criticalRiskPct.toFixed(1), 'data-wheel-fire-ring-risk-preview-peak': formingPreviewRiskProfile.criticalRiskPct.toFixed(1), className: 'rounded-lg border p-2 space-y-2 ' + (ringRiskProfile.criticalRiskPct >= 67 ? 'border-rose-300 bg-rose-50 text-rose-950' : (ringRiskProfile.criticalRiskPct >= 40 ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-lime-300 bg-lime-50 text-lime-950')) },
                  h('p', { className: 'text-[11px]' }, h('strong', null, 'Wall-risk scan · peak ring ' + (ringRiskProfile.criticalRing + 1) + ' at ' + Math.round(ringRiskProfile.criticalRiskPct) + '%. '), ringRiskProfile.criticalStatus + '; strongest signal: ' + ringRiskProfile.criticalSignalLabel + '. Profile count: ' + ringRiskProfile.highCount + ' high · ' + ringRiskProfile.watchCount + ' watch · ' + ringRiskProfile.lowerCount + ' lower.'),
                  h('p', { 'data-wheel-fire-selected-ring-risk': selectedTargetRing + 1, 'data-wheel-fire-selected-ring-risk-current': (selectedRingRisk.risk * 100).toFixed(1), 'data-wheel-fire-selected-ring-risk-next': (previewSelectedRingRisk.risk * 100).toFixed(1), className: 'text-[11px]' }, formingPreviewAvailable ? (canFocusRiskRing ? 'Selected ring ' + (selectedTargetRing + 1) + ': ' + Math.round(selectedRingRisk.risk * 100) + '% now → ' + Math.round(previewSelectedRingRisk.risk * 100) + '% predicted; current signal led by ' + selectedRingRisk.dominantSignalLabel + '. Predicted profile peak: ring ' + (formingPreviewRiskProfile.criticalRing + 1) + ' at ' + Math.round(formingPreviewRiskProfile.criticalRiskPct) + '%.' : 'Next ' + selectedTool.label + ' preview: peak ' + Math.round(ringRiskProfile.criticalRiskPct) + '% at ring ' + (ringRiskProfile.criticalRing + 1) + ' → ' + Math.round(formingPreviewRiskProfile.criticalRiskPct) + '% at ring ' + (formingPreviewRiskProfile.criticalRing + 1) + '.') : 'Next-pass risk preview is paused because this clay is no longer in an active forming stage.'),
                  h('p', { 'data-wheel-fire-ring-risk-legend': 'true', className: 'text-[11px]' }, 'Cutaway edge: lime dashed = lower · amber dashed = watch · rose solid = high. White circle = current peak; gold dashed halo = predicted peak. Comparative model only—not a safe-thickness rule.'),
                  h('button', { type: 'button', 'data-wheel-fire-ring-risk-inspect': 'true', onClick: inspectHighestRiskRing, className: 'rounded-lg border border-slate-500 bg-white px-3 py-2 text-xs font-black text-slate-900' }, canFocusRiskRing ? 'Inspect highest-risk ring · ' + (ringRiskProfile.criticalRing + 1) : 'Reveal wall-risk scan · peak ring ' + (ringRiskProfile.criticalRing + 1))
                ),
                h('div', { className: 'flex flex-wrap gap-3' },
                  h('label', { className: 'flex items-center gap-2 text-xs font-bold text-slate-700' }, h('input', { type: 'checkbox', checked: !!data.showCrossSection, onChange: function (event) { patchData({ showCrossSection: event.target.checked }); } }), 'Show material cross-section + wall-risk scan'),
                  h('label', { className: 'flex items-center gap-2 text-xs font-bold text-slate-700' }, h('input', { type: 'checkbox', checked: data.showTouchForces !== false, onChange: function (event) { patchData({ showTouchForces: event.target.checked }); } }), 'Show touch-force arrows')
                )
              ),
              h('div', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3' },
                h('h3', { className: 'font-black text-teal-950 mb-2' }, 'Clay tools'),
                h('p', { className: 'text-[11px] text-teal-950 mb-2' }, toolStageNote),
                h('p', { className: 'text-[11px] text-teal-950 mb-2' }, 'Active tool: ', h('strong', null, selectedTool.label), ' — ', selectedTool.help),
                h('div', { className: 'grid grid-cols-2 gap-2', role: 'group', 'aria-label': 'Clay shaping tools' }, tools.map(function (tool) {
                  return h('button', { type: 'button', key: tool.id, 'data-tooltip': tool.help, disabled: !toolAllowed(tool), 'aria-label': tool.label + '. ' + tool.help, 'aria-pressed': activeTool === tool.id, onClick: function () { patchData({ activeTool: tool.id }); }, className: 'min-h-[42px] rounded-lg border px-2 py-2 text-xs font-bold disabled:opacity-40 ' + (activeTool === tool.id ? 'bg-teal-700 text-white border-teal-800' : 'bg-white text-teal-900 border-teal-300') }, tool.icon + ' ' + tool.label);
                })),
                h('button', { type: 'button', disabled: !toolAllowed(selectedTool), onClick: function () { applyActive(selectedTargetRing); }, className: 'mt-2 w-full rounded-lg bg-teal-800 text-white px-3 py-2 font-black text-sm disabled:opacity-40' }, applyButtonLabel)
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
        var allLogs = copyArray(data.measurementLog);
        var seriesNames = {};
        var seriesOrder = [];
        allLogs.forEach(function (row) {
          var rowSeriesId = String(row.seriesId || 'series-legacy');
          var rowSeriesName = String(row.seriesName || '').trim();
          if (!Object.prototype.hasOwnProperty.call(seriesNames, rowSeriesId)) seriesOrder.push(rowSeriesId);
          if (rowSeriesName || !Object.prototype.hasOwnProperty.call(seriesNames, rowSeriesId)) seriesNames[rowSeriesId] = rowSeriesName || (rowSeriesId === 'series-legacy' ? 'Unassigned trials' : 'Untitled series');
        });
        var inferredSeriesId = allLogs.length ? String(allLogs[allLogs.length - 1].seriesId || 'series-legacy') : 'series-1';
        var activeSeriesId = String(data.trialSeriesId || inferredSeriesId);
        if (!Object.prototype.hasOwnProperty.call(seriesNames, activeSeriesId)) seriesOrder.push(activeSeriesId);
        var activeSeriesName = String(data.trialSeriesName || seriesNames[activeSeriesId] || '').trim() || (activeSeriesId === 'series-legacy' ? 'Unassigned trials' : 'Current mechanics study');
        seriesNames[activeSeriesId] = activeSeriesName;
        var seriesCatalog = seriesOrder.map(function (id) { return { id: id, name: id === activeSeriesId ? activeSeriesName : seriesNames[id] }; });
        var logs = allLogs.filter(function (row) { return String(row.seriesId || 'series-legacy') === activeSeriesId; });
        var trialBaselineIds = data.trialBaselineIds && typeof data.trialBaselineIds === 'object' ? data.trialBaselineIds : {};
        function trialKey(row, index) { return row && row.id !== undefined ? String(row.id) : 'legacy-' + index; }
        var selectedBaselineId = String(trialBaselineIds[activeSeriesId] || '');
        var baselineLog = null;
        for (var baselineIndex = 0; baselineIndex < logs.length; baselineIndex += 1) {
          if (trialKey(logs[baselineIndex], baselineIndex) === selectedBaselineId) { baselineLog = logs[baselineIndex]; break; }
        }
        if (!baselineLog && logs.length) baselineLog = logs[0];
        var activeBaselineId = baselineLog ? trialKey(baselineLog, logs.indexOf(baselineLog)) : '';
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
          var row = { id: Date.now(), seriesId: activeSeriesId, seriesName: activeSeriesName, method: method, clayBody: vessel.clayBody, tool: activeTool, workRing: workRing, hypothesis: String(data.hypothesis || '').trim().slice(0, 240), observation: String(data.trialObservation || '').trim().slice(0, 240), stage: vessel.stage, materialRecipe: normalizeRecipe(vessel.materialRecipe), rpm: Math.round(rpm), pressure: Math.round(pressure), handSupport: Math.round(handSupport), lubrication: Math.round(lubrication), contactSpan: Math.round(contactSpan), moisture: Math.round(vessel.moisture * 100), minWall: stats.minWallCm.toFixed(2), uniformity: Math.round(stats.uniformity), compression: Math.round(stats.compression), coilBond: Math.round(stats.coilBond), overhang: Math.round(stats.overhangRisk), stability: Math.round(stats.stability), outcome: stats.status };
          var nextSeriesLogs = logs.concat([row]).slice(-12);
          var nextLogs = allLogs.filter(function (candidate) { return String(candidate.seriesId || 'series-legacy') !== activeSeriesId; }).concat(nextSeriesLogs);
          patchData({ measurementLog: nextLogs, trialObservation: '', removedMechanicsTrial: null });
          announce('Measurement trial logged.');
        }
        function selectTrialSeries(id) {
          var nextId = String(id || 'series-1');
          var nextName = seriesNames[nextId] || (nextId === 'series-legacy' ? 'Unassigned trials' : 'Untitled series');
          patchData({ trialSeriesId: nextId, trialSeriesName: nextName });
          announce('Switched to the ' + nextName + ' experiment series. Only this series is compared here.');
        }
        function selectTrialBaseline(id) {
          var nextId = String(id || '');
          var nextBaselines = Object.assign({}, trialBaselineIds);
          nextBaselines[activeSeriesId] = nextId;
          var selectedIndex = -1;
          logs.forEach(function (row, index) { if (trialKey(row, index) === nextId) selectedIndex = index; });
          patchData({ trialBaselineIds: nextBaselines });
          announce('Reference trial set to Trial ' + (selectedIndex + 1) + ' for the ' + activeSeriesName + ' series.');
        }
        function startTrialSeries() {
          var nextId = 'series-' + Date.now();
          patchData({ trialSeriesId: nextId, trialSeriesName: '' });
          announce('New mechanics experiment series started. Earlier trials remain saved in the journal.');
        }
        function replayTrial(row) {
          var replayMethod = row.method === 'coil' ? 'coil' : 'wheel';
          var wheelTools = ['center', 'open', 'pull', 'belly', 'collar', 'smooth', 'trim'];
          var coilTools = ['add-coil', 'open', 'belly', 'collar', 'paddle', 'smooth', 'trim'];
          var allowedTools = replayMethod === 'coil' ? coilTools : wheelTools;
          var replayTool = allowedTools.indexOf(row.tool) >= 0 ? row.tool : (replayMethod === 'coil' ? 'add-coil' : 'center');
          var replayRing = Math.round(clamp(finite(row.workRing, workRing), 0, RING_COUNT - 1));
          var replayPatch = { view: 'shape', method: replayMethod, activeTool: replayTool, workRing: replayRing, rpm: replayMethod === 'coil' ? 0 : clamp(finite(row.rpm, rpm), 0, 120), pressure: clamp(finite(row.pressure, pressure), 5, 100), handSupport: clamp(finite(row.handSupport, handSupport), 0, 100), lubrication: clamp(finite(row.lubrication, lubrication), 0, 100), contactSpan: Math.round(clamp(finite(row.contactSpan, contactSpan), 3, 11)), hypothesis: row.hypothesis || data.hypothesis || '' };
          var replayRecipeLabel = '';
          if (Object.prototype.hasOwnProperty.call(row, 'materialRecipe')) {
            var replayRecipe = normalizeRecipe(row.materialRecipe);
            var replayVessel = copyVessel(vessel);
            if (row.clayBody && CLAY_BODIES[row.clayBody]) replayVessel.clayBody = row.clayBody;
            replayVessel.materialRecipe = replayRecipe;
            replayPatch.vessel = normalizeVessel(replayVessel);
            replayPatch.recipeDraft = replayRecipe;
            replayRecipeLabel = replayRecipe ? (replayRecipe.label || 'recipe study') : 'named body baseline';
          }
          patchData(replayPatch);
          announce('Loaded the ' + replayTool + ' setup at ring ' + (replayRing + 1) + (replayRecipeLabel ? ' with ' + replayRecipeLabel : '') + ' in Shape. Change one input before the next trial.');
        }
        function removeTrial(row, index) {
          var removedKey = trialKey(row, index);
          var allIndex = allLogs.indexOf(row);
          if (allIndex < 0) return;
          var nextLogs = allLogs.slice();
          nextLogs.splice(allIndex, 1);
          var remaining = logs.filter(function (candidate) { return candidate !== row; });
          var nextBaselines = Object.assign({}, trialBaselineIds);
          var wasReference = activeBaselineId === removedKey;
          if (wasReference) {
            var fallbackIndex = Math.min(index, Math.max(0, remaining.length - 1));
            nextBaselines[activeSeriesId] = remaining.length ? trialKey(remaining[fallbackIndex], fallbackIndex) : '';
          }
          patchData({
            measurementLog: nextLogs,
            trialBaselineIds: nextBaselines,
            removedMechanicsTrial: {
              row: Object.assign({}, row),
              allIndex: allIndex,
              seriesId: activeSeriesId,
              seriesName: activeSeriesName,
              trialLabel: 'Trial ' + (index + 1),
              removedKey: removedKey,
              wasReference: wasReference
            }
          });
          announce('Trial ' + (index + 1) + ' removed from the ' + activeSeriesName + ' series. Restore is available below the evidence trail.');
        }
        function restoreRemovedTrial() {
          var removed = data.removedMechanicsTrial;
          if (!removed || !removed.row) return;
          var nextLogs = copyArray(data.measurementLog);
          var insertIndex = Math.round(clamp(finite(removed.allIndex, nextLogs.length), 0, nextLogs.length));
          var restoredRow = Object.assign({}, removed.row);
          nextLogs.splice(insertIndex, 0, restoredRow);
          var nextBaselines = Object.assign({}, trialBaselineIds);
          if (removed.wasReference) {
            var restoredSeriesId = String(removed.seriesId || restoredRow.seriesId || 'series-legacy');
            var restoredSeries = nextLogs.filter(function (candidate) { return String(candidate.seriesId || 'series-legacy') === restoredSeriesId; });
            var restoredSeriesIndex = restoredSeries.indexOf(restoredRow);
            nextBaselines[restoredSeriesId] = trialKey(restoredRow, restoredSeriesIndex);
          }
          patchData({ measurementLog: nextLogs, trialBaselineIds: nextBaselines, removedMechanicsTrial: null });
          announce((removed.trialLabel || 'Removed trial') + ' restored to the ' + (removed.seriesName || 'mechanics') + ' series.');
        }
        function trialComparison() {
          if (logs.length < 2) return null;
          var reference = baselineLog || logs[0];
          var current = logs[logs.length - 1];
          var referenceIndex = logs.indexOf(reference);
          var currentIndex = logs.indexOf(current);
          if (!reference || reference === current || referenceIndex < 0 || currentIndex < 0) return null;
          var comparisonSpan = 'Trial ' + (referenceIndex + 1) + ' → Trial ' + (currentIndex + 1);
          var changed = [];
          function compareInput(field, label, formatter) {
            var before = reference[field];
            var after = current[field];
            var beforeKey = JSON.stringify(before === undefined ? null : before);
            var afterKey = JSON.stringify(after === undefined ? null : after);
            if (beforeKey !== afterKey) changed.push(label + ' (' + formatter(before) + ' → ' + formatter(after) + ')');
          }
          compareInput('method', 'forming method', function (value) { return value || 'unknown'; });
          compareInput('clayBody', 'clay body', function (value) { return value && CLAY_BODIES[value] ? CLAY_BODIES[value].name : 'not recorded'; });
          compareInput('materialRecipe', 'material recipe', function (value) { var recipe = normalizeRecipe(value); return recipe ? (recipe.label || (Math.round(recipe.temperPercent) + '% temper')) : 'named body'; });
          compareInput('tool', 'tool', function (value) { return value || 'not recorded'; });
          compareInput('workRing', 'work zone', function (value) { return value === undefined ? 'not recorded' : 'ring ' + (Number(value) + 1); });
          compareInput('rpm', 'wheel speed', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + ' RPM'; });
          compareInput('pressure', 'hand pressure', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + '%'; });
          compareInput('handSupport', 'inside-hand support', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + '%'; });
          compareInput('lubrication', 'surface lubrication', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + '%'; });
          compareInput('contactSpan', 'contact span', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + ' rings'; });
          compareInput('moisture', 'clay moisture', function (value) { return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + '%'; });
          var deltas = [];
          [['stability', 'stability', ' pts'], ['uniformity', 'wall uniformity', ' pts'], ['minWall', 'minimum wall', ' cm'], ['compression', 'compression', ' pts'], ['coilBond', 'coil bond', ' pts'], ['overhang', 'overhang load', ' pts']].forEach(function (item) {
            var before = finite(reference[item[0]], 0);
            var after = finite(current[item[0]], 0);
            if (Math.abs(after - before) >= (item[0] === 'minWall' ? 0.01 : 0.5)) deltas.push(item[1] + ' ' + signed(after - before, item[0] === 'minWall' ? 2 : 1) + item[2]);
          });
          var setupText = changed.length === 0 ? 'No setup input changed from ' + comparisonSpan + '; this is a repeatability check.' : (changed.length === 1 ? 'One setup input changed from ' + comparisonSpan + ': ' + changed[0] + '.' : changed.length + ' setup inputs changed from ' + comparisonSpan + ': ' + changed.join(', ') + '.');
          var deltaText = deltas.length ? deltas.join(' · ') : 'No displayed model metric changed enough to report.';
          var readingText = changed.length === 0 ? 'How to read it: this is a repeatability check. Similar results strengthen confidence that the setup is stable; different results invite another look at technique and measurement.' : (changed.length === 1 ? 'How to read it: this is a controlled clue, not a rule. Repeat the comparison before making a general claim.' : 'How to read it: more than one setup input changed, so treat the direction as exploratory rather than causal.');
          return h('div', { className: 'rounded-xl border border-cyan-300 bg-cyan-50 p-3 space-y-1', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
            h('h3', { className: 'font-black text-cyan-950' }, 'Reference-to-latest comparison'),
            h('p', { className: 'text-xs text-cyan-950' }, setupText),
            h('p', { className: 'text-[11px] text-cyan-950' }, h('strong', null, 'Model deltas: '), deltaText),
            h('p', { className: 'text-[11px] text-cyan-950' }, readingText),
            current.hypothesis ? h('p', { className: 'text-[11px] text-cyan-950' }, h('strong', null, 'Prediction recorded: '), current.hypothesis) : null,
            current.observation ? h('p', { className: 'text-[11px] text-cyan-950' }, h('strong', null, 'Observation recorded: '), current.observation) : null
          );
        }
        function seriesEvidenceSummary() {
          if (!logs.length) return null;
          var baseline = baselineLog || logs[0];
          var latest = logs[logs.length - 1];
          var baselinePosition = logs.indexOf(baseline);
          var baselineLabel = 'Trial ' + (baselinePosition + 1);
          var pathLogs = logs.slice(Math.max(0, baselinePosition));
          var setupDefs = [
            { key: 'method', label: 'forming method' },
            { key: 'clayBody', label: 'clay body' },
            { key: 'materialRecipe', label: 'material recipe' },
            { key: 'tool', label: 'tool' },
            { key: 'workRing', label: 'work zone' },
            { key: 'rpm', label: 'wheel speed' },
            { key: 'pressure', label: 'hand pressure' },
            { key: 'handSupport', label: 'inside-hand support' },
            { key: 'lubrication', label: 'surface lubrication' },
            { key: 'contactSpan', label: 'contact span' },
            { key: 'moisture', label: 'clay moisture' }
          ];
          var metricDefs = [
            { key: 'stability', label: 'Stability', unit: '%', digits: 0 },
            { key: 'uniformity', label: 'Wall uniformity', unit: '%', digits: 0 },
            { key: 'minWall', label: 'Minimum wall', unit: ' cm', digits: 2 }
          ];
          function setupValue(row, setup) {
            var value = row[setup.key];
            if (setup.key === 'method') return value === 'coil' ? 'coil' : 'wheel';
            if (setup.key === 'clayBody') return value && CLAY_BODIES[value] ? CLAY_BODIES[value].name : 'not recorded';
            if (setup.key === 'materialRecipe') { var recipe = normalizeRecipe(value); return recipe ? (recipe.label || (Math.round(recipe.temperPercent) + '% temper')) : 'named body'; }
            if (setup.key === 'workRing') return value === undefined ? 'not recorded' : 'ring ' + (Number(value) + 1);
            if (setup.key === 'rpm') return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + ' RPM';
            if (setup.key === 'pressure' || setup.key === 'handSupport' || setup.key === 'lubrication' || setup.key === 'moisture') return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + '%';
            if (setup.key === 'contactSpan') return value === undefined ? 'not recorded' : Math.round(finite(value, 0)) + ' rings';
            return value || 'not recorded';
          }
          function setupChanged(setup) {
            var before = baseline[setup.key] === undefined ? null : baseline[setup.key];
            var after = latest[setup.key] === undefined ? null : latest[setup.key];
            return JSON.stringify(before) !== JSON.stringify(after);
          }
          var setupChanges = setupDefs.filter(setupChanged).map(function (setup) { return setup.label + ' (' + setupValue(baseline, setup) + ' to ' + setupValue(latest, setup) + ')'; });
          var setupAudit;
          if (pathLogs.length < 2) setupAudit = 'Reference only: log a new trial beyond the selected reference before auditing setup changes.';
          else if (!setupChanges.length) setupAudit = 'No reference-to-latest setup input changed; this is a repeatability path.';
          else if (setupChanges.length === 1 && pathLogs.length === 2) setupAudit = 'One reference-to-latest input changed: ' + setupChanges[0] + '. This is a one-variable candidate; repeat it before making a general claim.';
          else setupAudit = setupChanges.length + ' reference-to-latest inputs changed: ' + setupChanges.join(', ') + '. Treat this series as exploratory rather than a clean one-variable test.';
          function metricValue(row, metric) { return finite(row[metric.key], 0); }
          function displayValue(row, metric) { return metricValue(row, metric).toFixed(metric.digits) + metric.unit; }
          function displayDelta(metric) {
            var change = metricValue(latest, metric) - metricValue(baseline, metric);
            return signed(change, metric.digits) + metric.unit;
          }
          function pathLabel(metric) {
            if (pathLogs.length < 2) return 'needs another trial';
            var values = pathLogs.map(function (row) { return metricValue(row, metric); });
            var rising = true;
            var falling = true;
            for (var index = 1; index < values.length; index += 1) {
              if (values[index] < values[index - 1]) rising = false;
              if (values[index] > values[index - 1]) falling = false;
            }
            if (rising && falling) return 'unchanged';
            if (rising) return 'rising path';
            if (falling) return 'falling path';
            return 'mixed path';
          }
          var pathSummary = metricDefs.map(function (metric) { return metric.label.toLowerCase() + ': ' + pathLabel(metric); }).join(' · ');
          var guidance = pathLogs.length === 1 ? baselineLabel + ' is the reference. Change one control, keep the ring and material context steady, then log again.' : 'Reference is ' + baselineLabel + '; latest is the most recent trial. These modeled paths show association, not proof of causation.';
          return h('div', { className: 'rounded-xl border border-violet-300 bg-violet-50 p-3 space-y-2', role: 'region', 'aria-label': 'Series evidence trail' },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' },
              h('h3', { className: 'font-black text-violet-950' }, 'Series evidence trail'),
              h('span', { className: 'text-[11px] font-bold text-violet-900' }, activeSeriesName + ' · ' + logs.length + ' logged trial' + (logs.length === 1 ? '' : 's'))
            ),
            h('p', { className: 'text-xs text-violet-950' }, guidance),
            h('p', { className: 'text-[11px] text-violet-950' }, h('strong', null, 'Reference: '), baselineLabel),
            h('p', { className: 'text-[11px] text-violet-950' }, h('strong', null, 'Setup audit: '), setupAudit),
            h('div', { className: 'overflow-x-auto rounded-lg border border-violet-200 bg-white' },
              h('table', { className: 'w-full text-xs border-collapse' },
                h('caption', { className: 'text-left p-2 font-black text-violet-950' }, 'Reference to latest modeled metrics'),
                h('thead', null, h('tr', { className: 'bg-violet-100' }, ['Metric', 'Reference', 'Latest', 'Change', 'Logged path'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-violet-200' }, label); }))),
                h('tbody', null, metricDefs.map(function (metric) { return h('tr', { key: metric.key }, h('th', { scope: 'row', className: 'text-left p-2 border-b border-violet-100' }, metric.label), h('td', { className: 'p-2 border-b border-violet-100' }, displayValue(baseline, metric)), h('td', { className: 'p-2 border-b border-violet-100' }, displayValue(latest, metric)), h('td', { className: 'p-2 border-b border-violet-100 font-bold' }, displayDelta(metric)), h('td', { className: 'p-2 border-b border-violet-100' }, pathLabel(metric))); }))
              )
            ),
            h('p', { className: 'text-[11px] text-violet-950' }, h('strong', null, 'Path summary: '), pathSummary)
          );
        }
        function trialEvidenceGraph() {
          if (!baselineLog || logs.length < 2) return null;
          var baselinePosition = logs.indexOf(baselineLog);
          var pathLogs = logs.slice(Math.max(0, baselinePosition));
          if (pathLogs.length < 2) return null;
          var metrics = [
            { key: 'stability', label: 'Stability', unit: '%', digits: 0, color: '#0e7490' },
            { key: 'uniformity', label: 'Wall uniformity', unit: '%', digits: 0, color: '#7c3aed' },
            { key: 'minWall', label: 'Minimum wall', unit: ' cm', digits: 2, color: '#b45309' }
          ];
          function metricTrack(metric) {
            var values = pathLogs.map(function (row) { return finite(row[metric.key], 0); });
            var minimum = Math.min.apply(Math, values);
            var maximum = Math.max.apply(Math, values);
            var padding = Math.max((maximum - minimum) * 0.18, metric.key === 'minWall' ? 0.03 : 2);
            var low = minimum - padding;
            var high = maximum + padding;
            var span = Math.max(0.0001, high - low);
            function x(index) { return 22 + index / Math.max(1, pathLogs.length - 1) * 476; }
            function y(value) { return 10 + (high - value) / span * 40; }
            var points = values.map(function (value, index) { return { x: x(index), y: y(value), value: value, trial: baselinePosition + index + 1 }; });
            var path = points.map(function (point, index) { return (index ? 'L' : 'M') + point.x.toFixed(1) + ',' + point.y.toFixed(1); }).join(' ');
            var start = values[0];
            var finish = values[values.length - 1];
            var change = finish - start;
            var direction = Math.abs(change) < (metric.key === 'minWall' ? 0.01 : 0.5) ? 'essentially unchanged' : (change > 0 ? 'higher' : 'lower');
            var summary = metric.label + ' moved from ' + start.toFixed(metric.digits) + metric.unit + ' at Trial ' + (baselinePosition + 1) + ' to ' + finish.toFixed(metric.digits) + metric.unit + ' at Trial ' + logs.length + ', ' + direction + ' by ' + Math.abs(change).toFixed(metric.digits) + metric.unit + '.';
            return h('div', { key: metric.key, className: 'grid sm:grid-cols-[150px_minmax(0,1fr)] gap-2 items-center' },
              h('div', { className: 'text-xs text-slate-800' },
                h('strong', { className: 'block' }, metric.label),
                h('span', { className: 'text-[11px] text-slate-600' }, start.toFixed(metric.digits) + metric.unit + ' → ' + finish.toFixed(metric.digits) + metric.unit + ' · ' + signed(change, metric.digits) + metric.unit)
              ),
              h('svg', { viewBox: '0 0 520 72', role: 'img', 'aria-label': summary, className: 'w-full min-h-[72px]' },
                h('title', null, metric.label + ' selected-reference path'),
                h('desc', null, summary),
                h('line', { x1: 22, x2: 498, y1: 51, y2: 51, stroke: '#cbd5e1', strokeWidth: 1 }),
                h('path', { d: path, fill: 'none', stroke: metric.color, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' }),
                points.map(function (point, index) {
                  var isReference = index === 0;
                  var isLatest = index === points.length - 1;
                  var showLabel = points.length <= 6 || isReference || isLatest;
                  return h('g', { key: point.trial },
                    isReference ? h('rect', { x: point.x - 5, y: point.y - 5, width: 10, height: 10, rx: 1, fill: '#ffffff', stroke: metric.color, strokeWidth: 3 }) : h('circle', { cx: point.x, cy: point.y, r: isLatest ? 5 : 4, fill: isLatest ? '#ffffff' : metric.color, stroke: metric.color, strokeWidth: isLatest ? 3 : 1 }),
                    h('title', null, 'Trial ' + point.trial + ': ' + point.value.toFixed(metric.digits) + metric.unit + (isReference ? ', selected reference' : (isLatest ? ', latest trial' : ''))),
                    showLabel ? h('text', { x: point.x, y: 67, textAnchor: index === 0 ? 'start' : (index === points.length - 1 ? 'end' : 'middle'), fill: '#334155', fontSize: 10, fontWeight: 700 }, 'T' + point.trial) : null
                  );
                })
              )
            );
          }
          return h('figure', { className: 'rounded-xl border border-cyan-300 bg-white p-3 space-y-3', 'aria-labelledby': 'wheel-fire-trial-graph-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-trial-graph-title', className: 'font-black text-cyan-950' }, 'Selected-reference evidence graph'),
              h('p', { className: 'text-xs text-cyan-950 mt-1' }, 'Read each path from the selected reference through the latest logged trial in ' + activeSeriesName + '.')
            ),
            h('div', { className: 'space-y-2' }, metrics.map(metricTrack)),
            h('figcaption', { className: 'text-[11px] text-slate-600' }, 'Square marker = selected reference; outlined final marker = latest trial. Each metric uses its own vertical scale, so compare direction and labeled values rather than line steepness across tracks.')
          );
        }
        function researchModelLens() {
          return h('section', { className: 'wheel-fire-research-only rounded-xl border border-slate-400 bg-slate-50 p-3 text-xs text-slate-800', 'aria-labelledby': 'wheel-fire-model-audit-title' },
            h('h3', { id: 'wheel-fire-model-audit-title', className: 'font-black text-slate-900' }, 'Research model-audit lens'),
            h('p', { className: 'mt-1' }, 'Deterministic teaching model · ' + RING_COUNT + ' radial rings · dimension model v' + DIMENSION_MODEL_VERSION + '. Forming conserves approximate clay volume except for added coils and trimming. Pressure, inside support, lubrication, and contact span are simplified comparative inputs, not instrument-calibrated hand measurements. Trial paths are associations generated from logged model states, not causal estimates or calibrated material tests.'),
            h('p', { className: 'mt-1 text-[11px] text-slate-600' }, baselineLog ? 'Current audit reference: Trial ' + (logs.indexOf(baselineLog) + 1) + ' in ' + activeSeriesName + '.' : 'No mechanics reference is logged yet.')
          );
        }
        function trialCoach() {
          var setup = (method === 'coil' ? 'Coil' : 'Wheel') + ' · ' + activeTool + ' · Ring ' + (workRing + 1) + ' · ' + (method === 'coil' ? 'hand-built' : Math.round(rpm) + ' RPM') + ' · ' + Math.round(pressure) + '% pressure · ' + Math.round(handSupport) + '% support · ' + Math.round(lubrication) + '% slip · ' + contactSpan + '-ring contact · ' + Math.round(vessel.moisture * 100) + '% moisture';
          var referenceIndex = baselineLog ? logs.indexOf(baselineLog) : -1;
          var referenceLabel = baselineLog ? 'Trial ' + (referenceIndex + 1) : '';
          var hasReferenceComparison = referenceIndex >= 0 && logs.length - 1 > referenceIndex;
          var title = logs.length === 0 ? 'Baseline not logged yet' : (hasReferenceComparison ? 'Comparison ready — interpret the evidence' : 'Reference logged — comparison needs one more trial');
          var instruction = logs.length === 0 ? 'Log this setup before changing a control. It becomes the reference for your next trial.' : (hasReferenceComparison ? 'Review the latest comparison, decide whether the result supports your prediction, and write the reasoning below.' : 'Open Shape, change one control, keep ' + referenceLabel + ' and the same ring and material context steady, then log again.');
          return h('div', { className: 'rounded-xl border border-teal-300 bg-teal-50 p-3 space-y-1', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' }, h('strong', { className: 'text-sm text-teal-950' }, title), h('span', { className: 'text-[11px] font-bold text-teal-900' }, logs.length + ' logged trial' + (logs.length === 1 ? '' : 's'))),
            h('p', { className: 'text-[11px] text-teal-950' }, h('strong', null, 'Series: '), activeSeriesName),
            referenceLabel ? h('p', { className: 'text-[11px] text-teal-950' }, h('strong', null, 'Reference: '), referenceLabel) : null,
            h('p', { className: 'text-xs text-teal-950' }, instruction),
            h('p', { className: 'text-[11px] text-teal-950' }, h('strong', null, 'Current setup: '), setup)
          );
        }
        function studyProtocol() {
          var reference = baselineLog;
          var referenceIndex = reference ? logs.indexOf(reference) : -1;
          var selectedReferenceLabel = reference ? 'Trial ' + (referenceIndex + 1) : '';
          var referenceRecipe = reference ? normalizeRecipe(reference.materialRecipe) : null;
          var referenceBody = reference && reference.clayBody && CLAY_BODIES[reference.clayBody] ? CLAY_BODIES[reference.clayBody].name : 'current clay body';
          var referenceRing = reference && reference.workRing !== undefined ? 'ring ' + (Number(reference.workRing) + 1) : 'work zone not recorded';
          var referenceMethod = reference ? (reference.method === 'coil' ? 'coil' : 'wheel') : method;
          var referenceTool = reference && reference.tool ? reference.tool : 'tool not recorded';
          var referenceSpeed = reference ? (reference.method === 'coil' ? 'hand-built' : Math.round(finite(reference.rpm, 0)) + ' RPM') : 'speed not recorded';
          var referencePressure = reference && reference.pressure !== undefined ? Math.round(finite(reference.pressure, 0)) + '% pressure' : 'pressure not recorded';
          var referenceSupport = reference && reference.handSupport !== undefined ? Math.round(finite(reference.handSupport, 0)) + '% support' : 'support not recorded';
          var referenceLubrication = reference && reference.lubrication !== undefined ? Math.round(finite(reference.lubrication, 0)) + '% slip' : 'lubrication not recorded';
          var referenceContact = reference && reference.contactSpan !== undefined ? Math.round(finite(reference.contactSpan, 0)) + '-ring contact' : 'contact span not recorded';
          var referenceMoisture = reference && reference.moisture !== undefined ? Math.round(finite(reference.moisture, 0)) + '% moisture' : 'moisture not recorded';
          var referenceText = reference ? selectedReferenceLabel + ' · ' + referenceMethod + ' · ' + referenceBody + ' · ' + referenceRing + ' · ' + referenceTool + ' · ' + referenceSpeed + ' · ' + referencePressure + ' · ' + referenceSupport + ' · ' + referenceLubrication + ' · ' + referenceContact + ' · ' + referenceMoisture + (referenceRecipe ? ' · ' + (referenceRecipe.label || 'recipe study') : ' · named body') : 'No baseline yet — log the current setup first.';
          var nextVariable = method === 'coil' ? 'hand pressure, inside support, lubrication, contact span, tool, work zone, or moisture' : 'wheel speed, hand pressure, inside support, lubrication, contact span, tool, work zone, or moisture';
          var observation = String(data.trialObservation || '').trim();
          var observationText = observation ? 'Field note ready: ' + observation.slice(0, 180) + (observation.length > 180 ? '…' : '') : 'Add what you feel, see, hear, or measure. The model cannot sense touch, drag, wobble, sound, or cracks.';
          var latest = logs.length ? logs[logs.length - 1] : null;
          var hasReferenceComparison = referenceIndex >= 0 && logs.length - 1 > referenceIndex;
          var interpretationText = hasReferenceComparison ? 'Compare the latest result with the selected reference in the evidence trail, then complete claim, evidence, and reasoning below.' : 'After a new log beyond the selected reference, compare the model deltas with your field observation and reasoning.';
          var nextMove;
          if (!reference) nextMove = 'Log the current setup as a baseline before changing a control.';
          else if (!hasReferenceComparison) nextMove = 'Change one bounded input, keep this selected reference setup steady, and log the comparison.';
          else {
            var stabilityDelta = finite(latest.stability, 0) - finite(reference.stability, 0);
            var uniformityDelta = finite(latest.uniformity, 0) - finite(reference.uniformity, 0);
            var overhangDelta = finite(latest.overhang, 0) - finite(reference.overhang, 0);
            if (stabilityDelta <= -3 || uniformityDelta <= -3 || overhangDelta >= 3) nextMove = 'Repeat the latest setup once, inspect the highest-risk ring, then reduce one stress input such as speed or pressure.';
            else if (stabilityDelta >= 3 && uniformityDelta >= 0) nextMove = 'Repeat the same change under the same context once more to see whether the improvement holds.';
            else nextMove = 'Keep the context steady and repeat the latest trial, or make one small change before interpreting the direction.';
          }
          return h('div', { className: 'rounded-xl border border-sky-300 bg-sky-50 p-3 space-y-2', role: 'region', 'aria-label': 'Study protocol' },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' },
              h('h3', { className: 'font-black text-sky-950' }, 'Study protocol'),
              h('span', { className: 'text-[11px] font-bold text-sky-900' }, logs.length ? 'Reference setup available' : 'Baseline needed')
            ),
            h('p', { className: 'text-xs text-sky-950' }, reference ? 'Use ' + selectedReferenceLabel + ' as your selected reference, then make one intentional change and record what the clay—not only the model—does.' : 'Log a baseline setup, then make one intentional change and record what the clay—not only the model—does.'),
            h('p', { className: 'text-[11px] text-sky-950' }, h('strong', null, 'Next move. '), nextMove),
            h('ol', { className: 'grid md:grid-cols-2 gap-2 text-[11px] text-sky-950' },
              h('li', { className: 'border-l-4 border-sky-700 pl-2' }, h('strong', null, 'Hold constant. '), referenceText),
              h('li', { className: 'border-l-4 border-sky-700 pl-2' }, h('strong', null, 'Change one thing. '), 'Choose one next variable: ' + nextVariable + '. Keep the other inputs steady.'),
              h('li', { className: 'border-l-4 border-sky-700 pl-2' }, h('strong', null, 'Observe. '), observationText),
              h('li', { className: 'border-l-4 border-sky-700 pl-2' }, h('strong', null, 'Interpret. '), interpretationText)
            )
          );
        }
        function trialSeriesControl() {
          function trialOptionLabel(row, index) { return 'Trial ' + (index + 1) + ' - ' + (row.method === 'coil' ? 'coil' : 'wheel') + ' - ' + (row.method === 'coil' ? 'hand-built' : Math.round(finite(row.rpm, 0)) + ' RPM') + ' - ' + (row.tool || 'tool not recorded') + ' - ring ' + (row.workRing === undefined ? 'not recorded' : (Number(row.workRing) + 1)); }
          return h('div', { className: 'rounded-xl border border-teal-300 bg-white p-3 space-y-2' },
            h('div', { className: 'grid md:grid-cols-3 gap-2' },
              h('label', { htmlFor: 'wheel-fire-trial-series', className: 'block text-xs font-bold text-slate-700' }, 'Experiment series', h('select', { id: 'wheel-fire-trial-series', value: activeSeriesId, onChange: function (event) { selectTrialSeries(event.target.value); }, className: 'block w-full mt-1 rounded-lg border border-teal-300 bg-white p-2' }, seriesCatalog.map(function (series) { return h('option', { key: series.id, value: series.id }, series.name); }))),
              h('label', { htmlFor: 'wheel-fire-trial-series-name', className: 'block text-xs font-bold text-slate-700' }, 'Series name (optional)', h('input', { id: 'wheel-fire-trial-series-name', maxLength: 60, value: data.trialSeriesName || '', onChange: function (event) { patchData({ trialSeriesName: event.target.value }); }, placeholder: 'e.g. speed and rim stability', className: 'block w-full mt-1 rounded-lg border border-teal-300 p-2 font-normal' })),
              logs.length ? h('label', { htmlFor: 'wheel-fire-trial-baseline', className: 'block text-xs font-bold text-slate-700' }, 'Reference trial', h('select', { id: 'wheel-fire-trial-baseline', value: activeBaselineId, onChange: function (event) { selectTrialBaseline(event.target.value); }, className: 'block w-full mt-1 rounded-lg border border-teal-300 bg-white p-2' }, logs.map(function (row, index) { return h('option', { key: trialKey(row, index), value: trialKey(row, index) }, trialOptionLabel(row, index)); }))) : null
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('button', { type: 'button', onClick: startTrialSeries, className: 'rounded-lg border border-teal-400 bg-white px-3 py-2 text-xs font-bold text-teal-900' }, 'Start a new series'),
              h('p', { className: 'text-[11px] text-slate-600' }, 'Only trials in the selected series are compared. Earlier series stay available in the Journal.')
            )
          );
        }
        return h('section', { id: 'wheel-fire-panel-science', role: 'tabpanel', 'aria-labelledby': 'wheel-fire-tab-science', className: 'space-y-3' },
          h('div', { className: 'rounded-2xl border border-cyan-300 bg-cyan-50 p-4' },
            h('h2', { className: 'text-xl font-black text-cyan-950' }, 'Clay mechanics laboratory'),
            h('p', { className: 'text-sm text-cyan-950 mt-1' }, 'Change one variable, shape the same ring, and log the result. The model tracks approximate clay volume, centrifugal loading, touch balance, lubrication, contact span, plasticity, moisture weakness, wall uniformity, slenderness, unsupported overhang, particle compression, coil bonding, and wobble.'),
            h('ol', { className: 'grid md:grid-cols-3 gap-2 mt-3 text-xs text-cyan-950', 'aria-label': 'One-variable experiment loop' },
              h('li', { className: 'border-l-4 border-cyan-700 pl-2' }, h('strong', null, '1. Predict. '), 'Write what you expect to change.'),
              h('li', { className: 'border-l-4 border-cyan-700 pl-2' }, h('strong', null, '2. Change one thing. '), 'Keep the ring and other controls steady.'),
              h('li', { className: 'border-l-4 border-cyan-700 pl-2' }, h('strong', null, '3. Compare. '), 'Log the new measurements and explain why.')
            ),
            trialSeriesControl(),
            trialCoach(),
            studyProtocol(),
            researchModelLens(),
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
                h('button', { type: 'button', onClick: function () { focusRing(peak.index); }, 'data-tooltip': 'Focus ring ' + (peak.index + 1) + ' in the Shape section', 'aria-label': zone.label + '. Peak at ring ' + (peak.index + 1) + '. ' + peak.status + '. ' + Math.round(peak.risk * 100) + ' percent local risk.', className: 'w-full rounded-lg border p-2 text-left ' + riskTone(peak.risk) },
                  h('span', { className: 'block text-xs font-black' }, zone.label),
                  h('span', { className: 'block text-[10px] font-bold mt-1' }, 'Ring ' + (peak.index + 1) + ' · ' + Math.round(peak.risk * 100) + '%'),
                  h('span', { className: 'block h-2 rounded-full bg-black/10 mt-2 overflow-hidden', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(peak.risk * 100), 'aria-label': zone.label + ' local risk' }, h('span', { className: 'block h-full rounded-full bg-current', style: { width: Math.max(4, Math.round(peak.risk * 100)) + '%' } })),
                  h('span', { className: 'block text-[10px] mt-1' }, peak.wallCm.toFixed(2) + ' cm wall · ' + peak.status)
                )
              );
            })),
            h('p', { className: 'text-[11px] text-rose-950' }, 'Select a zone to jump to its peak ring. Then change one shaping control and return here to see whether the local risk moved.')
          ),
          h('div', { className: 'wheel-fire-advanced rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3' },
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
          h('div', { className: 'wheel-fire-advanced rounded-xl border border-indigo-300 bg-indigo-50 p-3 space-y-3' },
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
              h('label', { htmlFor: 'wheel-fire-trial-observation', className: 'block text-xs font-bold text-slate-700' }, 'Studio observation (optional)', h('textarea', { id: 'wheel-fire-trial-observation', rows: 3, maxLength: 240, value: data.trialObservation || '', onChange: function (event) { patchData({ trialObservation: event.target.value }); }, placeholder: 'What did you feel, hear, see, or notice? The model cannot sense drag, wobble, sound, cracks, or touch.', className: 'block w-full mt-1 rounded-lg border border-slate-400 p-2 font-normal' })),
              h('button', { type: 'button', onClick: logTrial, className: 'rounded-lg bg-cyan-800 text-white px-3 py-2 text-xs font-black' }, 'Log current measurement'),
              h('p', { className: 'text-[11px] text-slate-600' }, 'Tip: return to Shape, alter one control, apply the same tool at the same ring, then log again.')
            ),
            h('div', { className: 'wheel-fire-advanced rounded-xl border border-slate-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900 mb-2' }, 'What the model conserves'),
              h('ul', { className: 'list-disc pl-5 text-xs text-slate-700 space-y-2' },
                h('li', null, 'Opening, pulling, expanding, collaring, centering, and smoothing redistribute approximately the same clay volume.'),
                h('li', null, 'Adding a coil increases clay mass. Trimming permanently removes it.'),
                h('li', null, 'New coils begin with weaker joints; paddling or smoothing raises modeled compression and bond quality.'),
                h('li', null, 'Very wet, thin, tall, off-center, poorly consolidated, or strongly overhanging clay becomes less stable—especially at high wheel speed.'),
                h('li', null, 'This is a teaching model, not a structural certification or kiln-control system.'))
            )
          ),
          trialComparison(),
          seriesEvidenceSummary(),
          trialEvidenceGraph(),
          data.removedMechanicsTrial && data.removedMechanicsTrial.row ? h('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2' },
            h('p', { className: 'text-xs text-amber-950' }, h('strong', null, data.removedMechanicsTrial.trialLabel || 'Trial'), ' removed from ', data.removedMechanicsTrial.seriesName || 'this mechanics series', '. Comparisons and journal evidence now omit it.'),
            h('button', { type: 'button', onClick: restoreRemovedTrial, className: 'rounded-lg border border-amber-500 bg-white px-3 py-2 text-xs font-black text-amber-950 hover:bg-amber-100' }, 'Restore removed trial')
          ) : null,
          logs.length ? h('div', { className: 'wheel-fire-advanced overflow-x-auto rounded-xl border border-slate-300 bg-white' },
            h('table', { className: 'w-full text-xs border-collapse' },
              h('caption', { className: 'text-left p-3 font-black text-slate-900' }, 'Measurement log · ' + activeSeriesName),
              h('thead', null, h('tr', { className: 'bg-slate-100' }, ['Method', 'Tool', 'Ring', 'Recipe', 'RPM', 'Pressure', 'Moisture', 'Min wall', 'Uniformity', 'Compression', 'Bond', 'Overhang', 'Stability', 'Outcome', 'Observation', 'Actions'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-slate-300' }, label); }))),
              h('tbody', null, logs.map(function (row, index) { var rowRecipe = normalizeRecipe(row.materialRecipe); var ringText = row.workRing === undefined ? 'not recorded' : 'Ring ' + (Number(row.workRing) + 1); return h('tr', { key: trialKey(row, index) }, h('td', { className: 'p-2 border-b whitespace-nowrap' }, row.method === 'coil' ? 'Coil' : 'Wheel'), h('td', { className: 'p-2 border-b whitespace-nowrap' }, row.tool || 'not recorded'), h('td', { className: 'p-2 border-b whitespace-nowrap' }, ringText), h('td', { className: 'p-2 border-b' }, rowRecipe ? (rowRecipe.label || (Math.round(rowRecipe.temperPercent) + '% temper')) : 'named body'), h('td', { className: 'p-2 border-b' }, row.rpm), h('td', { className: 'p-2 border-b' }, row.pressure + '%'), h('td', { className: 'p-2 border-b' }, row.moisture + '%'), h('td', { className: 'p-2 border-b' }, row.minWall + ' cm'), h('td', { className: 'p-2 border-b' }, row.uniformity + '%'), h('td', { className: 'p-2 border-b' }, finite(row.compression, 0) + '%'), h('td', { className: 'p-2 border-b' }, finite(row.coilBond, 0) + '%'), h('td', { className: 'p-2 border-b' }, finite(row.overhang, 0) + '%'), h('td', { className: 'p-2 border-b' }, row.stability + '%'), h('td', { className: 'p-2 border-b' }, row.outcome), h('td', { className: 'p-2 border-b max-w-xs' }, row.observation || 'No field note'), h('td', { className: 'p-2 border-b' }, h('div', { className: 'flex flex-wrap gap-1' }, h('button', { type: 'button', 'data-tooltip': 'Load this trial setup in Shape', 'aria-label': 'Replay Trial ' + (index + 1) + ' in Shape', onClick: function () { replayTrial(row); }, className: 'rounded border border-cyan-400 px-2 py-1 text-[11px] font-bold text-cyan-900 hover:bg-cyan-50' }, 'Replay in Shape'), h('button', { type: 'button', 'data-tooltip': 'Remove this trial from the active series; it can be restored immediately', 'aria-label': 'Remove Trial ' + (index + 1) + ' from series', onClick: function () { removeTrial(row, index); }, className: 'rounded border border-rose-300 px-2 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-50' }, 'Remove from series')))); }))
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
              h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left p-2' }, 'Lens'), h('th', { scope: 'col', className: 'text-left p-2' }, selected.name), h('th', { scope: 'col', className: 'text-left p-2' }, compare.name))),
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
        var kilnProbeZone = ['top', 'middle', 'bottom'].indexOf(data.kilnProbeZone) >= 0 ? data.kilnProbeZone : 'middle';
        var atmosphere = kilnType === 'electric' ? 'oxidation' : (data.atmosphere || 'oxidation');
        var kilnLoadDensity = clamp(finite(data.kilnLoadDensity, 55), 20, 95);
        var kilnAirAccess = clamp(finite(data.kilnAirAccess, 60), 20, 100);
        var kilnLoadEffects = estimateKilnLoadEffects({ loadDensity: kilnLoadDensity, airAccess: kilnAirAccess });
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
        var currentSchedule = analyzeFiringSchedule(vessel, { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, loadDensity: kilnLoadDensity, airAccess: kilnAirAccess, glazeId: glazeId, glazeThickness: glazeThickness });
        var previewSegments = currentSchedule.thermalHistory.segments;
        var previewDefaultElapsed = previewSegments[0].durationHours + previewSegments[1].durationHours * .5;
        var previewDefaultPhase = currentSchedule.thermalHistory.totalHours ? previewDefaultElapsed / currentSchedule.thermalHistory.totalHours * 100 : 50;
        var kilnPreviewPhase = clamp(finite(data.kilnPreviewPhase, previewDefaultPhase), 0, 100);
        var kilnSample = sampleThermalHistory(currentSchedule.thermalHistory, kilnPreviewPhase);
        var kilnSourceState = kilnHeatSourceState(kilnType, kilnSample, { temperature: kilnTemp, ramp: ramp });
        var kilnPreviewLabel = kilnSample.phaseLabel;
        var kilnPreviewTemp = kilnSample.temperatureC;
        var kilnMaterialState = estimateKilnMaterialState(vessel, kilnSample, { temperature: kilnTemp, glazeId: glazeId });
        var wareTraceSettings = { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, loadDensity: kilnLoadDensity, airAccess: kilnAirAccess };
        var wareThermalTrace = currentSchedule.wareThermalTrace || estimateWareThermalTrace(vessel, currentSchedule.thermalHistory, wareTraceSettings);
        var kilnWarePoint = sampleWareThermalTrace(wareThermalTrace, kilnPreviewPhase, kilnPreviewTemp) || estimateWareCoreTemperature(vessel, kilnSample, wareTraceSettings, kilnPreviewTemp);
        function advanceDrying() { var next = dryVessel(vessel, { humidity: humidity, dryingRate: dryingRate }); commitVessel(next, next.lastOutcome); }
        function fire() { var next = fireVessel(vessel, { temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, loadDensity: kilnLoadDensity, airAccess: kilnAirAccess }); commitVessel(next, next.lastOutcome); }
        function applyGlaze() { var next = glazeVessel(vessel, glazeId, glazeThickness); commitVessel(next, next.lastOutcome); }
        function saveFiringSchedule() {
          var label = scheduleLabel.trim() || 'Firing schedule ' + (firingSchedules.length + 1);
          var schedule = { id: Date.now(), label: label, temperature: kilnTemp, ramp: ramp, soak: soak, coolingRate: coolingRate, kilnType: kilnType, atmosphere: atmosphere, kilnLoadDensity: kilnLoadDensity, kilnAirAccess: kilnAirAccess, glazeId: glazeId, glazeThickness: glazeThickness, savedAt: new Date().toISOString() };
          patchData({ firingSchedules: [schedule].concat(firingSchedules).slice(0, 8), scheduleLabel: '' });
          announce(label + ' saved to the firing comparison shelf.');
        }
        function loadFiringSchedule(schedule) {
          patchData({ kilnTemp: schedule.temperature, ramp: schedule.ramp, soak: schedule.soak, coolingRate: schedule.coolingRate, kilnType: schedule.kilnType, atmosphere: schedule.atmosphere, kilnLoadDensity: finite(schedule.kilnLoadDensity, kilnLoadDensity), kilnAirAccess: finite(schedule.kilnAirAccess, kilnAirAccess), glazeId: schedule.glazeId || glazeId, glazeThickness: schedule.glazeThickness || glazeThickness });
          announce((schedule.label || 'Firing schedule') + ' loaded into the kiln controls. No firing was started.');
        }
        function removeFiringSchedule(id) {
          patchData({ firingSchedules: firingSchedules.filter(function (schedule) { return schedule.id !== id; }) });
          announce('Firing schedule removed from the comparison shelf.');
        }
        function firingCurve() {
          var plotStart = 28;
          var plotEnd = 472;
          var plotWidth = plotEnd - plotStart;
          var history = currentSchedule.thermalHistory;
          var rampShare = history.totalHours ? history.segments[0].durationHours / history.totalHours : .45;
          var soakShare = history.totalHours ? history.segments[1].durationHours / history.totalHours : .1;
          var riseEnd = plotStart + plotWidth * rampShare;
          var coolStart = riseEnd + plotWidth * soakShare;
          var peakY = 168 - clamp((kilnTemp - 20) / 1330, 0, 1) * 124;
          var markerX = plotStart + plotWidth * kilnPreviewPhase / 100;
          var markerY = 168 - clamp((kilnPreviewTemp - 20) / 1330, 0, 1) * 124;
          var coreMarkerY = 168 - clamp((kilnWarePoint.coreTemperatureC - 20) / 1330, 0, 1) * 124;
          var coreDifferenceMagnitude = Math.abs(kilnWarePoint.differenceC);
          var coreDifferenceLabel = coreDifferenceMagnitude < 1 ? 'near chamber temperature' : Math.round(coreDifferenceMagnitude) + '°C ' + (kilnWarePoint.differenceC > 0 ? 'hotter' : 'cooler') + ' than the chamber';
          var coreLabelX = markerX > 360 ? markerX - 10 : markerX + 10;
          var coreLabelAnchor = markerX > 360 ? 'end' : 'start';
          var coreLabelY = clamp(coreMarkerY + (coreDifferenceMagnitude < 3 ? 36 : (kilnWarePoint.differenceC > 0 ? -11 : 16)), 38, 158);
          var peakStressSample = currentSchedule.thermalStress.peakSample;
          var peakStressX = plotStart + plotWidth * peakStressSample.progressPct / 100;
          var peakStressY = 168 - clamp((peakStressSample.temperatureC - 20) / 1330, 0, 1) * 124;
          var peakStressLabelY = peakStressY < 54 ? peakStressY + 24 : peakStressY - 10;
          var peakStressDiamond = 'M' + peakStressX.toFixed(1) + ' ' + (peakStressY - 7).toFixed(1) + ' L' + (peakStressX + 7).toFixed(1) + ' ' + peakStressY.toFixed(1) + ' L' + peakStressX.toFixed(1) + ' ' + (peakStressY + 7).toFixed(1) + ' L' + (peakStressX - 7).toFixed(1) + ' ' + peakStressY.toFixed(1) + ' Z';
          var transitionWindows = currentSchedule.thermalTransitionWindows || [];
          var curve = 'M28 168 L' + riseEnd + ' ' + peakY.toFixed(1) + ' L' + coolStart.toFixed(1) + ' ' + peakY.toFixed(1) + ' L472 168';
          var coreCurve = wareThermalTrace.points.map(function (point, index) {
            var pointX = plotStart + plotWidth * point.progressPct / 100;
            var pointY = 168 - clamp((point.coreTemperatureC - 20) / 1330, 0, 1) * 124;
            return (index ? 'L' : 'M') + pointX.toFixed(1) + ' ' + pointY.toFixed(1);
          }).join(' ');
          var maximumLagPoint = wareThermalTrace.maximumLagPoint;
          var maximumLagDescription = maximumLagPoint ? Math.round(wareThermalTrace.maximumLagC) + ' degrees Celsius during ' + maximumLagPoint.phaseLabel.toLowerCase() + ' near chamber ' + Math.round(maximumLagPoint.zoneTemperatureC) + ' degrees Celsius' : 'not available';
          return h('figure', { className: 'rounded-xl border border-orange-200 bg-orange-50 p-2' },
            h('svg', { viewBox: '0 0 500 190', role: 'img', 'aria-label': 'Time-scaled kiln schedule at ' + kilnSample.elapsedHours.toFixed(1) + ' of ' + history.totalHours.toFixed(1) + ' modeled hours, currently ' + kilnPreviewLabel.toLowerCase() + '. The kiln chamber is about ' + Math.round(kilnPreviewTemp) + ' degrees Celsius and the representative ware core is about ' + Math.round(kilnWarePoint.coreTemperatureC) + ' degrees Celsius, ' + coreDifferenceLabel + '. The solid orange line follows chamber temperature and the dashed blue line follows the continuous comparative ware-core response. Largest modeled chamber-to-core difference: ' + maximumLagDescription + '. A diamond marks peak modeled transient stress of ' + Math.round(currentSchedule.thermalStress.peakStressPct) + ' percent during ' + peakStressSample.phaseLabel.toLowerCase() + ' near ' + Math.round(peakStressSample.temperatureC) + ' degrees Celsius. Three labeled teaching bands mark silica-change neighborhoods on heat-up and cool-down.', className: 'w-full' },
              h('title', null, 'Time-scaled kiln schedule'),
              h('desc', null, 'The horizontal position is proportional to modeled schedule time. A solid orange line shows chamber temperature; a directly labeled dashed blue line shows a representative ware core responding continuously over time. Two connected markers show the current chamber-to-core difference. A labeled diamond marks peak thermal stress; translucent labeled bands mark two silica-change neighborhoods during cooling and one during heating.'),
              transitionWindows.map(function (transitionWindow) {
                var startX = plotStart + plotWidth * transitionWindow.startProgressPct / 100;
                var endX = plotStart + plotWidth * transitionWindow.endProgressPct / 100;
                var bandColor = transitionWindow.id === 'low-silica-cool' ? '#ddd6fe' : '#fef3c7';
                var edgeColor = transitionWindow.id === 'low-silica-cool' ? '#7c3aed' : '#b45309';
                return h('g', { key: transitionWindow.id, 'data-wheel-fire-transition-window': transitionWindow.id, 'aria-hidden': 'true' },
                  h('rect', { x: startX, y: 24, width: Math.max(4, endX - startX), height: 144, fill: bandColor, opacity: .42 }),
                  h('line', { x1: startX, x2: startX, y1: 24, y2: 168, stroke: edgeColor, strokeWidth: 1.5, strokeDasharray: '4 4', opacity: .72 }),
                  h('line', { x1: endX, x2: endX, y1: 24, y2: 168, stroke: edgeColor, strokeWidth: 1.5, strokeDasharray: '4 4', opacity: .72 })
                );
              }),
              [44, 85, 126, 168].map(function (y) { return h('line', { key: y, x1: 28, x2: 472, y1: y, y2: y, stroke: '#fed7aa', strokeWidth: 1 }); }),
              transitionWindows.map(function (transitionWindow, index) {
                var startX = plotStart + plotWidth * transitionWindow.startProgressPct / 100;
                var endX = plotStart + plotWidth * transitionWindow.endProgressPct / 100;
                var centerX = (startX + endX) / 2;
                var textAnchor = centerX > 430 ? 'end' : (centerX < 70 ? 'start' : 'middle');
                var labelX = clamp(centerX, 70, 430);
                return h('text', { key: transitionWindow.id + '-label', x: labelX, y: [36, 58, 80][index] || 80, textAnchor: textAnchor, fill: transitionWindow.id === 'low-silica-cool' ? '#5b21b6' : '#92400e', fontSize: 11, fontWeight: 700, 'aria-hidden': 'true' }, transitionWindow.shortLabel);
              }),
              h('path', { d: curve, fill: 'none', stroke: '#c2410c', strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
              h('path', { 'data-wheel-fire-core-trace': 'true', d: coreCurve, fill: 'none', stroke: '#1d4ed8', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: '8 5' }),
              h('line', { x1: markerX, x2: markerX, y1: 24, y2: 168, stroke: '#0f766e', strokeWidth: 2, strokeDasharray: '5 5', opacity: .8, 'aria-hidden': 'true' }),
              h('line', { 'data-wheel-fire-current-core-gap': 'true', x1: markerX, x2: markerX, y1: markerY, y2: coreMarkerY, stroke: '#1e3a8a', strokeWidth: 4, strokeLinecap: 'round', 'aria-hidden': 'true' }),
              h('path', { 'data-wheel-fire-peak-stress': 'true', d: peakStressDiamond, fill: '#be123c', stroke: '#fff7ed', strokeWidth: 2, 'aria-hidden': 'true' }),
              h('text', { x: clamp(peakStressX, 72, 428), y: peakStressLabelY, textAnchor: 'middle', fill: '#881337', fontSize: 11, fontWeight: 700 }, 'peak stress ' + Math.round(currentSchedule.thermalStress.peakStressPct) + '%'),
              h('circle', { cx: markerX, cy: markerY, r: 7, fill: '#0f766e', stroke: '#ccfbf1', strokeWidth: 3, 'aria-hidden': 'true' }),
              h('circle', { 'data-wheel-fire-current-core': 'true', cx: markerX, cy: coreMarkerY, r: 5.5, fill: '#1d4ed8', stroke: '#dbeafe', strokeWidth: 2.5, 'aria-hidden': 'true' }),
              h('text', { 'data-wheel-fire-core-label': 'true', x: coreLabelX, y: coreLabelY, textAnchor: coreLabelAnchor, fill: '#1e3a8a', fontSize: 11, fontWeight: 700 }, 'ware core ' + Math.round(kilnWarePoint.coreTemperatureC) + '°C'),
              h('text', { x: clamp(markerX, 55, 445), y: 20, textAnchor: 'middle', fill: '#115e59', fontSize: 11, fontWeight: 700 }, kilnSample.elapsedHours.toFixed(1) + ' h'),
              h('circle', { cx: riseEnd, cy: peakY, r: 6, fill: '#9a3412' }),
              h('text', { x: 28, y: 184, fill: '#7c2d12', fontSize: 12 }, 'room'),
              h('text', { x: riseEnd, y: Math.max(16, peakY - 10), textAnchor: 'middle', fill: '#7c2d12', fontSize: 12, fontWeight: 700 }, 'kiln chamber ' + Math.round(kilnTemp) + '°C'),
              h('text', { x: (riseEnd + coolStart) / 2, y: Math.min(184, peakY + 18), textAnchor: 'middle', fill: '#7c2d12', fontSize: 11 }, Math.round(soak) + ' min soak'),
              h('text', { x: 472, y: 184, textAnchor: 'end', fill: '#7c2d12', fontSize: 12 }, 'cool')
            ),
            h('figcaption', { className: 'text-[11px] text-orange-950' }, 'Teal marker: ' + kilnSample.elapsedHours.toFixed(1) + ' of ' + history.totalHours.toFixed(1) + ' modeled hours. Solid orange: kiln chamber · dashed blue: representative ware core. At the selected time the core is ' + coreDifferenceLabel + '. ' + wareThermalTrace.summary + ' Effective heatwork: ' + Math.round(heatwork.effectiveTemp) + '°C equivalent · rough cone neighborhood ' + heatwork.cone + '. The trace is comparative; witness cones and kiln-rated instruments remain the real kiln checks.')
          );
        }
        function kilnCutaway() {
          var heatRatio = clamp((kilnPreviewTemp - 100) / 1200, 0, 1);
          var baseZoneSpread = kilnType === 'open' ? 120 : (kilnType === 'wood' ? 55 : (kilnType === 'gas' ? 28 : 14));
          var zoneSpread = baseZoneSpread * kilnLoadEffects.zoneSpreadMultiplier;
          var zoneTemps = [kilnPreviewTemp - zoneSpread * .45, kilnPreviewTemp, kilnPreviewTemp + zoneSpread * .55];
          var probeZoneIds = ['top', 'middle', 'bottom'];
          var probeIndex = Math.max(0, probeZoneIds.indexOf(kilnProbeZone));
          var probeZoneNames = kilnType === 'open' ? ['Upper plume', 'Ware level', 'Fuel bed'] : ['Top shelf', 'Middle shelf', 'Bottom shelf'];
          var probeZoneName = probeZoneNames[probeIndex];
          var probeTemperature = zoneTemps[probeIndex];
          var wareZoneTemperature = kilnType === 'open' ? zoneTemps[1] : probeTemperature;
          var wareCore = sampleWareThermalTrace(wareThermalTrace, kilnPreviewPhase, wareZoneTemperature) || estimateWareCoreTemperature(vessel, kilnSample, wareTraceSettings, wareZoneTemperature);
          var wareCoreDifferenceMagnitude = Math.abs(wareCore.differenceC);
          var wareCoreDifferenceLabel = wareCoreDifferenceMagnitude < 1 ? 'near its surrounding zone' : Math.round(wareCoreDifferenceMagnitude) + '°C ' + (wareCore.differenceC > 0 ? 'hotter' : 'cooler') + ' than its surrounding zone';
          var wareCoreLocation = kilnType === 'open' ? 'Ware-level' : probeZoneName;
          var wareCoreMarkerColor = wareCore.differenceC > 1 ? '#fb7185' : (wareCore.differenceC < -1 ? '#facc15' : '#86efac');
          var wareSurfaceMarkerColor = wareCore.differenceC > 1 ? '#67e8f9' : (wareCore.differenceC < -1 ? '#fb923c' : '#86efac');
          var wareMidMarkerColor = wareCore.differenceC > 1 ? '#fbbf24' : (wareCore.differenceC < -1 ? '#fde68a' : '#bbf7d0');
          var wareThermalDirection = wareCore.surfaceToCoreGradientC < 1 ? 'nearly uniform through the wall' : (wareCore.surfaceToCoreDifferenceC > 0 ? 'core warmer than surface' : 'surface warmer than core');
          var wareThermalStress = estimateWareThermalStress(vessel, kilnSample, { temperature: kilnTemp, ramp: ramp, coolingRate: coolingRate, kilnType: kilnType, loadDensity: kilnLoadDensity, airAccess: kilnAirAccess }, wareCore);
          var wareStressColor = wareThermalStress.stressPct >= 70 ? '#fb7185' : (wareThermalStress.stressPct >= 45 ? '#f97316' : (wareThermalStress.stressPct >= 20 ? '#facc15' : '#86efac'));
          var wareStressRadius = 15 + wareThermalStress.stressPct / 100 * 8;
          var coneSoakMinutes = kilnSample.segmentId === 'ramp' ? 0 : (kilnSample.segmentId === 'soak' ? soak * kilnSample.segmentProgressPct / 100 : soak);
          var coneReferenceBase = kilnSample.segmentId === 'cool' ? kilnTemp : kilnPreviewTemp;
          var zoneConePacks = [-zoneSpread * .45, 0, zoneSpread * .55].map(function (zoneOffset) {
            return estimateWitnessConePack({
              targetTemperature: kilnTemp,
              targetSoak: soak,
              targetCone: heatwork.cone,
              observedTemperature: clamp(coneReferenceBase + zoneOffset, 600, 1350),
              observedSoak: coneSoakMinutes,
              ramp: ramp
            });
          });
          var probeConePack = zoneConePacks[probeIndex];
          var probeConeReading = interpretWitnessConeSequence(probeConePack);
          var probeObservation = interpretConeHeatworkMemory({ segmentId: kilnSample.segmentId, currentTemperatureC: probeTemperature, zoneName: probeZoneName, pack: probeConePack });
          var probeConeBend = probeConePack.firingCone.bendDegrees;
          var coneZoneSummary = summarizeWitnessConeZones(kilnType === 'open' ? [probeConePack] : zoneConePacks, kilnType === 'open' ? [probeZoneName] : probeZoneNames);
          var showZones = data.showKilnHeatZones !== false;
          var temperatureDelta = Math.abs(zoneTemps[2] - zoneTemps[0]);
          var previewScale = 1 - kilnMaterialState.firingShrinkagePct / 100;
          var bodyDevelopmentOpacity = clamp(kilnMaterialState.maturityProgressPct / 100, 0, 1);
          var glazeDevelopmentOpacity = clamp(kilnMaterialState.glazeDevelopmentPct / 100, 0, 1);
          function enclosedLoadLayout(index) {
            if (kilnLoadEffects.pieceCount === 1) return [{ x: 280, scale: .86 - index * .04 }];
            if (kilnLoadEffects.pieceCount === 2) return [{ x: 210 + index * 28, scale: .92 - index * .06 }, { x: 330 - index * 18, scale: .72 }];
            return [{ x: 190 + index * 10, scale: .7 - index * .02 }, { x: 280, scale: .8 - index * .03 }, { x: 370 - index * 10, scale: .68 }];
          }
          function openLoadLayout() {
            var count = kilnLoadEffects.pieceCount + (kilnLoadDensity >= 90 ? 1 : 0);
            if (count === 1) return [{ x: 280, baseY: 306, scale: 1.05 }];
            if (count === 2) return [{ x: 228, baseY: 306, scale: 1.05 }, { x: 318, baseY: 314, scale: .86 }];
            if (count === 3) return [{ x: 198, baseY: 308, scale: .78 }, { x: 280, baseY: 306, scale: .9 }, { x: 362, baseY: 314, scale: .74 }];
            return [{ x: 170, baseY: 310, scale: .68 }, { x: 242, baseY: 306, scale: .76 }, { x: 318, baseY: 312, scale: .72 }, { x: 390, baseY: 310, scale: .64 }];
          }
          var kilnWallCutaway = kilnWallCutawayGeometry();
          var kilnChamberPerspective = kilnChamberPerspectiveGeometry(kilnWallCutaway);
          var kilnShelfYs = [145, 230, 305];
          var kilnShelfGeometries = kilnShelfYs.map(function (shelfY) { return kilnShelfPerspectiveGeometry(shelfY); });
          var kilnHeatFlow = kilnHeatFlowGeometry(kilnType, { loadDensity: kilnLoadDensity, airAccess: kilnAirAccess, shelfFrontYs: kilnShelfGeometries.map(function (shelf) { return shelf.frontY; }) });
          var kilnHeatFlowColor = atmosphere === 'reduction' ? '#d8b4fe' : (kilnType === 'electric' ? '#fde68a' : '#fed7aa');
          var selectedShelf = kilnShelfGeometries[probeIndex];
          var selectedShelfY = selectedShelf.frontY;
          var selectedWare = enclosedLoadLayout(probeIndex)[0];
          var selectedWareX = selectedWare.x;
          var selectedWareScale = selectedWare.scale;
          var selectedWareCoreY = selectedShelfY - 2 - vessel.heightCm * selectedWareScale * previewScale * .5;
          var openLoadPieces = openLoadLayout();
          var openThermalPiece = openLoadPieces[0];
          var openThermalX = openThermalPiece.x;
          var openThermalY = openThermalPiece.baseY - 7;
          var representativePieceCount = kilnType === 'open' ? openLoadPieces.length : kilnLoadEffects.pieceCount;
          var representativePieceLabel = representativePieceCount + ' representative ' + (representativePieceCount === 1 ? 'piece' : 'pieces') + (kilnType === 'open' ? ' around the fuel bed' : ' per shelf');
          function thermalStressIndicator(cx, cy, key) {
            var outward = wareThermalStress.tensionMode.indexOf('surface tension') === 0;
            var directions = wareThermalStress.tensionMode === 'near-equilibrium wall' ? [] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
            var startRadius = outward ? wareStressRadius - 2 : wareStressRadius + 8;
            var endRadius = outward ? wareStressRadius + 8 : wareStressRadius - 2;
            return h('g', { key: key, 'data-wheel-fire-thermal-stress': 'true', 'data-wheel-fire-stress-mode': wareThermalStress.tensionMode, 'aria-hidden': 'true' },
              h('circle', { cx: cx, cy: cy, r: wareStressRadius, fill: 'none', stroke: wareStressColor, strokeWidth: 1.5 + wareThermalStress.stressPct / 100 * 2.5, strokeDasharray: wareThermalStress.stressPct < 20 ? '2 5' : (wareThermalStress.stressPct < 45 ? '5 4' : null), opacity: .95 }),
              directions.map(function (direction, index) { return h('line', { key: index, x1: cx + direction[0] * startRadius, y1: cy + direction[1] * startRadius, x2: cx + direction[0] * endRadius, y2: cy + direction[1] * endRadius, stroke: wareStressColor, strokeWidth: 2, markerEnd: 'url(#wheel-fire-stress-arrow)', opacity: (.35 + wareThermalStress.stressPct / 100 * .65).toFixed(2) }); })
            );
          }
          function piecePath(cx, baseY, scale) {
            var left = [], right = [];
            var visualScale = scale * previewScale;
            for (var index = 0; index < RING_COUNT; index += 4) {
              var ratio = index / (RING_COUNT - 1);
              var y = baseY - ratio * vessel.heightCm * visualScale;
              var radius = vessel.radii[index] * visualScale;
              left.push((cx - radius).toFixed(1) + ' ' + y.toFixed(1));
              right.unshift((cx + radius).toFixed(1) + ' ' + y.toFixed(1));
            }
            return 'M' + left.join(' L') + ' L' + right.join(' L') + ' Z';
          }
          function miniaturePiece(cx, baseY, scale, key) {
            var visualScale = scale * previewScale;
            var path = piecePath(cx, baseY, scale);
            return h('g', { key: key, 'data-wheel-fire-load-piece': 'true', 'aria-hidden': 'true' },
              h('ellipse', { cx: cx, cy: baseY + 2, rx: vessel.radii[0] * visualScale, ry: Math.max(2, vessel.radii[0] * visualScale * .22), fill: '#1f1410', opacity: .45 }),
              h('path', { d: path, fill: kilnMaterialState.bodyColor, stroke: '#f5c6a0', strokeWidth: 1.5 }),
              h('path', { d: path, fill: kilnMaterialState.firedColor, opacity: bodyDevelopmentOpacity.toFixed(2), stroke: 'none' }),
              glazeDevelopmentOpacity > .01 ? h('path', { d: path, fill: kilnMaterialState.glazeColor, opacity: (.14 + glazeDevelopmentOpacity * .72).toFixed(2), stroke: '#fff7ed', strokeWidth: glazeDevelopmentOpacity > .7 ? 1.2 : .4 }) : null,
              h('ellipse', { cx: cx, cy: baseY - vessel.heightCm * visualScale, rx: vessel.radii[RING_COUNT - 1] * visualScale, ry: Math.max(2, vessel.radii[RING_COUNT - 1] * visualScale * .2), fill: glazeDevelopmentOpacity > .2 ? kilnMaterialState.glazeColor : '#2a1711', stroke: '#f5c6a0', strokeWidth: 1, opacity: glazeDevelopmentOpacity > .2 ? (.55 + glazeDevelopmentOpacity * .4).toFixed(2) : 1 })
            );
          }
          function kilnFurniturePost(cx, topY, bottomY, key) {
            var topHalfWidth = 5;
            var bottomHalfWidth = 4;
            var postPath = 'M' + (cx - topHalfWidth) + ' ' + topY + ' L' + (cx + topHalfWidth) + ' ' + topY + ' L' + (cx + bottomHalfWidth) + ' ' + bottomY + ' L' + (cx - bottomHalfWidth) + ' ' + bottomY + ' Z';
            return h('g', { key: key, 'data-wheel-fire-kiln-post': key, 'aria-hidden': 'true' },
              h('path', { d: postPath, fill: '#6f5445', stroke: '#2f1d17', strokeWidth: 1.5 }),
              h('line', { x1: cx - 1, y1: topY + 2, x2: cx - 1, y2: bottomY - 1, stroke: '#d6a77f', strokeWidth: 1.5, opacity: .55 }),
              h('ellipse', { cx: cx, cy: topY, rx: topHalfWidth, ry: 2.2, fill: '#b18a70', stroke: '#f2c49f', strokeWidth: 1 })
            );
          }
          function witnessConePackVisual(pack, centerX, baseY, key, selected) {
            var roleColors = { guide: '#fde68a', firing: '#67e8f9', guard: '#c4b5fd' };
            var spacing = selected ? 42 : 28;
            var coneLength = selected ? 26 : 19;
            var coneWidth = selected ? 11 : 9;
            var plaqueLeft = centerX - spacing - coneWidth;
            var plaqueRight = centerX + spacing + coneWidth;
            var plaqueDepth = selected ? 7 : 5;
            var plaquePath = 'M' + plaqueLeft + ' ' + (baseY - 1) + ' L' + plaqueRight + ' ' + (baseY - 1) + ' L' + (plaqueRight - 5) + ' ' + (baseY + plaqueDepth) + ' L' + (plaqueLeft + 5) + ' ' + (baseY + plaqueDepth) + ' Z';
            return h('g', { key: key, 'data-wheel-fire-witness-pack': key, 'data-wheel-fire-cone-form': 'large-plaque', 'data-wheel-fire-selected-cone-pack': selected ? 'true' : undefined, 'data-wheel-fire-heatwork-memory': selected ? probeObservation.state : undefined, 'aria-hidden': 'true' },
              selected ? h('rect', { x: centerX - 68, y: baseY - 48, width: 136, height: 56, rx: 8, fill: '#083344', opacity: .28, stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '5 4' }) : null,
              selected ? [25, 75].map(function (boundaryAngle) {
                var boundaryGeometry = witnessConeGeometry(boundaryAngle, { x: centerX, baseY: baseY, length: coneLength, baseWidth: coneWidth, mountAngleDegrees: WITNESS_CONE_MOUNT_ANGLE_DEGREES });
                return h('path', { key: 'target-boundary-' + boundaryAngle, 'data-wheel-fire-cone-target-boundary': String(boundaryAngle), d: boundaryGeometry.path, fill: 'none', stroke: roleColors.firing, strokeWidth: 1.4, strokeDasharray: boundaryAngle === 25 ? '3 3' : '6 3', opacity: .58 });
              }) : null,
              h('path', { 'data-wheel-fire-cone-plaque': 'true', d: plaquePath, fill: '#9a6b4f', stroke: selected ? '#fed7aa' : '#5b3525', strokeWidth: selected ? 1.5 : 1 }),
              pack.cones.map(function (cone, index) { return h('ellipse', { key: 'slot-' + cone.role, 'data-wheel-fire-cone-plaque-slot': cone.role, cx: centerX + (index - 1) * spacing, cy: baseY + 1, rx: coneWidth * .58, ry: selected ? 2.4 : 1.8, fill: '#3f251a', stroke: selected ? '#fed7aa' : '#5b3525', strokeWidth: .8 }); }),
              pack.cones.map(function (cone, index) {
                var x = centerX + (index - 1) * spacing;
                var geometry = witnessConeGeometry(cone.bendDegrees, { x: x, baseY: baseY, length: coneLength, baseWidth: coneWidth, mountAngleDegrees: WITNESS_CONE_MOUNT_ANGLE_DEGREES });
                return h('g', { key: cone.role },
                  h('path', { 'data-wheel-fire-cone-role': cone.role, 'data-wheel-fire-cone-curved': 'true', 'data-wheel-fire-cone-state': cone.state, 'data-wheel-fire-cone-bend': Math.round(cone.bendDegrees), 'data-wheel-fire-cone-mount-angle': WITNESS_CONE_MOUNT_ANGLE_DEGREES, d: geometry.path, fill: selected ? roleColors[cone.role] : '#f5deb3', stroke: selected ? roleColors[cone.role] : '#5b3525', strokeWidth: selected ? 2 : 1 }),
                  selected ? h('path', { 'data-wheel-fire-cone-spine': cone.role, d: geometry.centerlinePath, fill: 'none', stroke: '#fff7ed', strokeWidth: 1, opacity: .42 }) : null
                );
              }),
              selected ? pack.cones.map(function (cone, index) { return h('text', { key: 'label-' + cone.role, 'data-wheel-fire-cone-role-label': cone.role, x: centerX + (index - 1) * spacing, y: baseY - 35, fill: roleColors[cone.role], fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, cone.role + ' ' + cone.label); }) : null,
              selected ? h('text', { 'data-wheel-fire-heatwork-memory-label': 'true', x: centerX, y: baseY + 19, fill: '#a5f3fc', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, probeObservation.visualLabel) : null
            );
          }
          var sceneLabel = (kilnType === 'open' ? 'Open-firing section' : kilnType + ' kiln cutaway') + ' during ' + kilnPreviewLabel.toLowerCase() + ' at about ' + Math.round(kilnPreviewTemp) + ' degrees Celsius. Inspecting the ' + probeZoneName.toLowerCase() + ' at about ' + Math.round(probeTemperature) + ' degrees Celsius; its modeled witness three-cone pack targets cone ' + probeConePack.targetCone + '. The rendered large cones use a three-hole plaque and an 8-degree starting lean; self-supporting cones instead have their mounting height and angle built in. ' + probeConePack.summary + ' Read the selected pack: ' + probeConeReading.summary + ' A magnified representative ware section at ' + wareCoreLocation.toLowerCase() + ' runs from a modeled surface near ' + Math.round(wareCore.surfaceTemperatureC) + ' degrees through mid-wall near ' + Math.round(wareCore.midWallTemperatureC) + ' degrees to a core near ' + Math.round(wareCore.coreTemperatureC) + ' degrees, with a surface-to-core difference of about ' + Math.round(wareCore.surfaceToCoreGradientC) + ' degrees and the ' + wareThermalDirection + '. Material state: ' + kilnMaterialState.label + '. Modeled firing shrinkage ' + kilnMaterialState.firingShrinkagePct.toFixed(1) + ' percent. Atmosphere: ' + atmosphere + '. ' + (showZones ? 'Modeled top, middle, and bottom temperatures are labeled.' : 'Heat-zone labels are hidden.');
          sceneLabel += ' Temperature now versus heatwork: ' + probeObservation.summary + ' ' + probeObservation.note;
          sceneLabel += ' Heat source state: ' + kilnSourceState.summary + ' ' + kilnSourceState.note;
          sceneLabel += ' Loading model: ' + kilnLoadEffects.summary + ' The scene shows ' + representativePieceLabel + '.';
          sceneLabel += ' Modeled transient thermal stress is ' + Math.round(wareThermalStress.stressPct) + ' percent: ' + wareThermalStress.level + ', ' + wareThermalStress.tensionMode + ', ' + wareThermalStress.transitionLabel + '.';
          sceneLabel += ' Witness comparison: ' + coneZoneSummary.summary;
          if (kilnType !== 'open') {
            sceneLabel += ' Heat-route cue: ' + kilnHeatFlow.summary + ' ' + kilnHeatFlow.note;
            sceneLabel += ' Perspective kiln furniture shows three shelves supported by six posts; these are placement cues rather than loading or clearance guidance.';
            sceneLabel += ' The wall cutaway separates an outer casing, insulating refractory, and hot-face lining around the chamber. Layer widths and colors are schematic; they are not construction specifications, condition assessments, or surface-temperature readings.';
            sceneLabel += ' Chamber perspective shows a smaller rear arch, curved ceiling and side returns, a hearth floor, and shelf fronts widening toward the opening. These are schematic depth cues, not measured interior dimensions, placement, or loading clearances.';
          }
          var enclosedScene = h('g', null,
            h('path', { 'data-wheel-fire-wall-layer': 'outer-casing', d: kilnWallCutaway.outerCasing.path, fill: 'url(#wheel-fire-kiln-wall)', stroke: '#211915', strokeWidth: 5 }),
            h('path', { 'data-wheel-fire-wall-layer': 'insulating-refractory', d: kilnWallCutaway.insulatingRefractory.path, fill: 'url(#wheel-fire-kiln-insulation)', stroke: '#4a2d21', strokeWidth: 1 }),
            h('path', { 'data-wheel-fire-wall-layer': 'hot-face-lining', d: kilnWallCutaway.hotFaceLining.path, fill: 'url(#wheel-fire-kiln-hot-face)', stroke: '#8a5a3c', strokeWidth: 1 }),
            h('path', { 'data-wheel-fire-chamber-opening': 'true', d: kilnWallCutaway.chamberOpening.path, fill: '#28100c', stroke: '#f4b183', strokeWidth: 4 }),
            h('g', { 'data-wheel-fire-chamber-depth': 'true', 'aria-hidden': 'true' },
              h('path', { 'data-wheel-fire-rear-chamber': 'true', d: kilnChamberPerspective.rear.path, fill: 'url(#wheel-fire-kiln-rear)', stroke: '#7c4a32', strokeWidth: 1.5 }),
              h('path', { 'data-wheel-fire-chamber-return': 'ceiling', d: kilnChamberPerspective.ceilingReturn.path, fill: '#6a4532', opacity: .88 }),
              h('path', { 'data-wheel-fire-chamber-return': 'left-wall', d: kilnChamberPerspective.leftReturn.path, fill: '#5a3829', opacity: .92 }),
              h('path', { 'data-wheel-fire-chamber-return': 'right-wall', d: kilnChamberPerspective.rightReturn.path, fill: '#40271e', opacity: .94 }),
              h('path', { 'data-wheel-fire-chamber-return': 'hearth-floor', 'data-wheel-fire-hearth-floor': 'true', d: kilnChamberPerspective.hearthFloor.path, fill: 'url(#wheel-fire-kiln-hearth)' })
            ),
            h('rect', { className: kilnSourceState.activeInput ? 'wheel-fire-heat-pulse' : undefined, 'data-wheel-fire-chamber-heat': kilnSourceState.activeInput ? 'active-input' : 'stored-heat', x: 130, y: 72, width: 300, height: 254, rx: 28, fill: 'url(#wheel-fire-kiln-heat)', opacity: (.12 + heatRatio * .72).toFixed(2) }),
            h('g', { 'data-wheel-fire-shelf-shielding': 'true', 'aria-hidden': 'true' },
              kilnHeatFlow.shelfShadows.map(function (shadow) { return h('ellipse', { key: shadow.id, 'data-wheel-fire-shelf-shadow': shadow.id, cx: shadow.cx, cy: shadow.cy, rx: shadow.rx, ry: shadow.ry, fill: '#120706', opacity: shadow.opacity.toFixed(2) }); })
            ),
            h('g', { 'data-wheel-fire-air-path': 'true', 'data-wheel-fire-flow-mechanism': kilnHeatFlow.sourceMode, 'data-wheel-fire-flow-mode': kilnSourceState.flowMode, 'aria-hidden': 'true' },
              kilnHeatFlow.flowPaths.map(function (route) { return h('path', { key: route.id, className: 'wheel-fire-flow-motion', style: { animationDuration: kilnSourceState.flowMotionSeconds + 's' }, 'data-wheel-fire-heat-flow-path': route.id, 'data-wheel-fire-flow-kind': route.kind, d: route.d, fill: 'none', stroke: kilnHeatFlowColor, strokeWidth: (kilnHeatFlow.strokeWidth * finite(route.weight, 1)).toFixed(2), strokeLinecap: 'round', strokeDasharray: route.kind === 'main' ? '10 8' : '7 7', markerEnd: 'url(#wheel-fire-flow-arrow)', opacity: (kilnHeatFlow.flowOpacity * (.28 + heatRatio * .72) * kilnSourceState.flowVisibilityRatio).toFixed(2) }); })
            ),
            h('text', { x: 150, y: 88, fill: '#fff7ed', fontSize: 11 }, 'modeled routes · ' + kilnHeatFlow.accessLabel),
            kilnHeatFlow.enclosed ? h('g', { 'data-wheel-fire-shelf-shadow-label': 'true', 'aria-hidden': 'true' },
              h('line', { x1: 126, y1: kilnHeatFlow.shelfShadows[1].cy + 14, x2: kilnHeatFlow.shelfShadows[1].cx - kilnHeatFlow.shelfShadows[1].rx + 4, y2: kilnHeatFlow.shelfShadows[1].cy, stroke: '#fed7aa', strokeWidth: 1.5 }),
              h('text', { x: 122, y: kilnHeatFlow.shelfShadows[1].cy + 18, fill: '#fff7ed', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'shelf shielding')
            ) : null,
            h('g', { 'data-wheel-fire-depth-labels': 'true', 'aria-hidden': 'true' },
              h('text', { 'data-wheel-fire-depth-label': 'rear-chamber', x: 280, y: 108, fill: '#ffedd5', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, 'rear chamber'),
              h('line', { x1: 280, y1: 334, x2: 280, y2: 325, stroke: '#fed7aa', strokeWidth: 1.5 }),
              h('text', { 'data-wheel-fire-depth-label': 'hearth-floor', x: 280, y: 348, fill: '#ffedd5', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, 'hearth floor')
            ),
            h('g', { 'data-wheel-fire-wall-labels': 'true', 'aria-hidden': 'true' },
              h('text', { 'data-wheel-fire-wall-label': 'outer-casing', x: 14, y: 180, fill: '#d6ccc6', fontSize: 11, fontWeight: 700 }, 'casing'),
              h('line', { x1: 53, y1: 176, x2: 80, y2: 176, stroke: '#d6ccc6', strokeWidth: 1.5 }),
              h('text', { 'data-wheel-fire-wall-label': 'insulating-refractory', x: 14, y: 206, fill: '#e7b98c', fontSize: 11, fontWeight: 700 }, 'insulation'),
              h('line', { x1: 72, y1: 202, x2: 96, y2: 202, stroke: '#e7b98c', strokeWidth: 1.5 }),
              h('text', { 'data-wheel-fire-wall-label': 'hot-face-lining', x: 14, y: 232, fill: '#fed7aa', fontSize: 11, fontWeight: 700 }, 'hot face'),
              h('line', { x1: 63, y1: 228, x2: 116, y2: 228, stroke: '#fed7aa', strokeWidth: 1.5 })
            ),
            h('g', { 'data-wheel-fire-kiln-furniture': 'true', 'aria-hidden': 'true' },
              kilnShelfGeometries.map(function (shelf, shelfIndex) {
                var supportBottomY = shelfIndex < kilnShelfGeometries.length - 1 ? kilnShelfGeometries[shelfIndex + 1].frontY : kilnChamberPerspective.front.bottomY;
                return shelf.supportXs.map(function (postX, postIndex) { return kilnFurniturePost(postX, shelf.frontY + shelf.thickness, supportBottomY, 'shelf-' + shelfIndex + '-post-' + postIndex); });
              }),
              h('line', { x1: 126, y1: 190, x2: kilnShelfGeometries[0].supportXs[0], y2: 190, stroke: '#f2c49f', strokeWidth: 1.5 }),
              h('text', { x: 122, y: 194, fill: '#fff7ed', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'kiln posts')
            ),
            kilnShelfGeometries.map(function (shelf, index) {
              return h('g', { key: 'shelf-' + shelf.backY },
                h('path', { 'data-wheel-fire-kiln-shelf': 'surface', 'data-wheel-fire-shelf-depth': shelf.depth, d: shelf.surfacePath, fill: '#8b6b59', stroke: '#f2c49f', strokeWidth: 2 }),
                h('path', { 'data-wheel-fire-kiln-shelf-front': 'true', d: shelf.frontFacePath, fill: '#5f463a', stroke: '#2f1d17', strokeWidth: 1.5 }),
                h('path', { 'data-wheel-fire-kiln-shelf-back-edge': 'true', d: shelf.backEdgePath, fill: 'none', stroke: '#f6d3b5', strokeWidth: 1, opacity: .72 }),
                index === probeIndex ? h('path', { 'data-wheel-fire-selected-shelf': probeZoneIds[index], d: shelf.surfacePath, fill: 'none', stroke: '#67e8f9', strokeWidth: 4, opacity: .95, 'aria-hidden': 'true' }) : null,
                enclosedLoadLayout(index).map(function (piece, pieceIndex) { return miniaturePiece(piece.x, shelf.frontY - 2, piece.scale, 'piece-' + shelf.backY + '-' + pieceIndex); })
              );
            }),
            h('g', { 'data-wheel-fire-ware-core': 'true', 'data-wheel-fire-thermal-section': 'true', 'aria-hidden': 'true' },
              thermalStressIndicator(selectedWareX, selectedWareCoreY, 'enclosed-stress'),
              h('circle', { cx: selectedWareX, cy: selectedWareCoreY, r: 12, fill: wareSurfaceMarkerColor, stroke: '#fff7ed', strokeWidth: 2 }),
              h('circle', { cx: selectedWareX, cy: selectedWareCoreY, r: 8, fill: wareMidMarkerColor, stroke: '#7c2d12', strokeWidth: 1 }),
              h('circle', { cx: selectedWareX, cy: selectedWareCoreY, r: 4, fill: wareCoreMarkerColor, stroke: '#fff7ed', strokeWidth: 1 }),
              h('line', { x1: selectedWareX - 10, y1: selectedWareCoreY - 5, x2: selectedWareX - 30, y2: selectedWareCoreY - 17, stroke: wareCoreMarkerColor, strokeWidth: 1.5 }),
              h('text', { x: selectedWareX - 34, y: selectedWareCoreY - 5, fill: wareStressColor, fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'stress ' + Math.round(wareThermalStress.stressPct) + '% | ' + wareThermalStress.tensionMode),
              h('text', { x: selectedWareX - 34, y: selectedWareCoreY - 19, fill: '#fff7ed', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'section ' + Math.round(wareCore.surfaceTemperatureC) + '° → ' + Math.round(wareCore.coreTemperatureC) + '°')
            ),
            h('g', { 'aria-hidden': 'true' },
              h('path', { d: 'M476 ' + [118, 207, 296][probeIndex] + ' H350', fill: 'none', stroke: '#67e8f9', strokeWidth: 3, strokeDasharray: '7 5' }),
              h('circle', { 'data-wheel-fire-temperature-now': Math.round(probeTemperature), cx: 350, cy: [118, 207, 296][probeIndex], r: 7, fill: '#083344', stroke: '#a5f3fc', strokeWidth: 3 }),
              h('text', { x: 472, y: [106, 195, 284][probeIndex], fill: '#cffafe', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'T now')
            ),
            kilnType === 'electric' ? h('g', { 'data-wheel-fire-heat-source': 'electric-elements', 'data-wheel-fire-source-state': kilnSourceState.state, 'data-wheel-fire-source-active': String(kilnSourceState.activeInput), 'aria-hidden': 'true' }, [105, 155, 205, 255].map(function (y) {
              var elementPath = 'M132 ' + y + ' q14 -12 28 0 t28 0 M428 ' + y + ' q-14 -12 -28 0 t-28 0';
              return h('g', { key: y, 'data-wheel-fire-element-bank': String(y) },
                h('path', { className: kilnSourceState.activeInput ? 'wheel-fire-heat-pulse' : undefined, d: elementPath, fill: 'none', stroke: '#fb923c', strokeWidth: 11, opacity: (kilnSourceState.sourceActivityRatio * .22).toFixed(2) }),
                h('path', { d: elementPath, fill: 'none', stroke: kilnSourceState.activeInput ? '#ffb347' : '#7c6254', strokeWidth: 5, opacity: (kilnSourceState.activeInput ? .58 + kilnSourceState.sourceActivityRatio * .42 : .62).toFixed(2) })
              );
            })) : h('g', { className: kilnSourceState.activeInput ? 'wheel-fire-flame-motion' : undefined, 'data-wheel-fire-heat-source': kilnType + '-source', 'data-wheel-fire-source-state': kilnSourceState.state, 'data-wheel-fire-source-active': String(kilnSourceState.activeInput), 'aria-hidden': 'true' },
              kilnType === 'wood' ? h('ellipse', { className: kilnSourceState.activeInput ? 'wheel-fire-heat-pulse' : undefined, 'data-wheel-fire-fuel-glow': 'wood-firebox', cx: 108, cy: 307, rx: 34, ry: 12, fill: '#fb923c', opacity: kilnSourceState.fuelBedGlowRatio.toFixed(2) }) : null,
              h('path', { 'data-wheel-fire-active-flame': String(kilnSourceState.activeInput), d: 'M90 310 C138 322 150 278 186 294 C224 310 192 252 238 266 C286 280 268 216 318 232 C370 248 354 168 414 182', fill: 'none', stroke: atmosphere === 'reduction' ? '#c084fc' : '#fb923c', strokeWidth: 16, strokeLinecap: 'round', opacity: kilnSourceState.activeInput ? (.18 + kilnSourceState.activeFlameOpacityRatio * .78).toFixed(2) : '0.00' }),
              h('path', { d: 'M94 310 C150 318 158 280 196 292 C244 306 218 252 260 266 C312 280 298 224 344 234 C390 244 390 196 424 190', fill: 'none', stroke: '#fde68a', strokeWidth: 5, strokeLinecap: 'round', opacity: kilnSourceState.activeInput ? kilnSourceState.activeFlameOpacityRatio.toFixed(2) : '0.00' })
            ),
            h('path', { className: 'wheel-fire-flow-motion', style: { animationDuration: kilnSourceState.flowMotionSeconds + 's' }, 'data-wheel-fire-exhaust-mode': kilnSourceState.flowMode, d: 'M434 90 Q468 88 480 60', fill: 'none', stroke: atmosphere === 'reduction' ? '#a78bfa' : '#7dd3fc', strokeWidth: 7, strokeDasharray: '12 8', opacity: ((.45 + kilnAirAccess / 200) * kilnSourceState.flowVisibilityRatio).toFixed(2), 'aria-hidden': 'true' }),
            h('text', { x: 458, y: 48, fill: '#fff7ed', fontSize: 11, textAnchor: 'end' }, 'exhaust'),
            h('text', { x: 94, y: 48, fill: '#fff7ed', fontSize: 11 }, 'Load ' + Math.round(kilnLoadDensity) + '% | air access ' + Math.round(kilnAirAccess) + '%'),
            h('text', { 'data-wheel-fire-flow-label': 'true', x: 280, y: 66, fill: '#fff7ed', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, kilnSourceState.flowLabel),
            h('text', { 'data-wheel-fire-source-label': 'true', x: 94, y: 327, fill: '#fff7ed', fontSize: 11 }, kilnSourceState.sceneLabel),
            showZones ? zoneTemps.map(function (temperature, index) { var y = [118, 207, 296][index]; return h('g', { key: 'zone-' + index }, h('line', { x1: 440, x2: 467, y1: y, y2: y, stroke: '#fef3c7', strokeWidth: 1 }), h('text', { x: 474, y: y + 4, fill: '#fff7ed', fontSize: 11, textAnchor: 'end' }, Math.round(temperature) + '°')); }) : null,
            kilnShelfGeometries.map(function (shelf, index) { return witnessConePackVisual(zoneConePacks[index], 390, shelf.frontY - 5, 'zone-' + probeZoneIds[index], index === probeIndex); })
          );
          var openScene = h('g', null,
            h('path', { d: 'M20 330 Q150 300 280 326 T540 322 V380 H20 Z', fill: '#4a3023', stroke: '#24150f', strokeWidth: 4 }),
            h('ellipse', { cx: 280, cy: 322, rx: 190, ry: 38, fill: '#1e1410', stroke: '#8d6e57', strokeWidth: 4 }),
            h('ellipse', { className: kilnSourceState.activeInput ? 'wheel-fire-heat-pulse' : undefined, 'data-wheel-fire-fuel-glow': 'open-fuel-bed', cx: 280, cy: 318, rx: 128, ry: 24, fill: '#fb923c', opacity: kilnSourceState.fuelBedGlowRatio.toFixed(2), 'aria-hidden': 'true' }),
            [[170, 322, 310, 282], [215, 286, 356, 326], [128, 302, 256, 344], [290, 340, 422, 296]].map(function (log, index) { return h('line', { key: 'log-' + index, x1: log[0], y1: log[1], x2: log[2], y2: log[3], stroke: index % 2 ? '#8b5e3c' : '#6b4226', strokeWidth: 18, strokeLinecap: 'round' }); }),
            openLoadPieces.map(function (piece, index) { return miniaturePiece(piece.x, piece.baseY, piece.scale, 'open-piece-' + index); }),
            h('g', { className: kilnSourceState.activeInput ? 'wheel-fire-flame-motion' : undefined, 'data-wheel-fire-heat-source': 'open-fuel-bed', 'data-wheel-fire-source-state': kilnSourceState.state, 'data-wheel-fire-source-active': String(kilnSourceState.activeInput), 'aria-hidden': 'true' },
              h('path', { 'data-wheel-fire-active-flame': String(kilnSourceState.activeInput), d: 'M160 306 C138 248 190 238 178 182 C222 216 216 260 232 300 Z M248 310 C224 236 284 224 266 142 C330 206 286 246 326 306 Z M330 308 C322 258 370 244 352 190 C408 236 374 278 398 312 Z', fill: 'url(#wheel-fire-open-flame)', opacity: kilnSourceState.activeInput ? (.18 + kilnSourceState.activeFlameOpacityRatio * .78).toFixed(2) : '0.00' })
            ),
            h('g', { 'data-wheel-fire-ware-core': 'true', 'data-wheel-fire-thermal-section': 'true', 'aria-hidden': 'true' },
              thermalStressIndicator(openThermalX, openThermalY, 'open-stress'),
              h('circle', { cx: openThermalX, cy: openThermalY, r: 12, fill: wareSurfaceMarkerColor, stroke: '#fff7ed', strokeWidth: 2 }),
              h('circle', { cx: openThermalX, cy: openThermalY, r: 8, fill: wareMidMarkerColor, stroke: '#7c2d12', strokeWidth: 1 }),
              h('circle', { cx: openThermalX, cy: openThermalY, r: 4, fill: wareCoreMarkerColor, stroke: '#fff7ed', strokeWidth: 1 }),
              h('line', { x1: openThermalX + 10, y1: openThermalY - 5, x2: openThermalX + 28, y2: openThermalY - 23, stroke: wareCoreMarkerColor, strokeWidth: 1.5 }),
              h('text', { x: openThermalX + 32, y: openThermalY - 10, fill: wareStressColor, fontSize: 11, fontWeight: 700 }, 'stress ' + Math.round(wareThermalStress.stressPct) + '% | ' + wareThermalStress.tensionMode),
              h('text', { x: openThermalX + 32, y: openThermalY - 26, fill: '#fff7ed', fontSize: 11, fontWeight: 700 }, 'section ' + Math.round(wareCore.surfaceTemperatureC) + '° → ' + Math.round(wareCore.coreTemperatureC) + '°')
            ),
            h('path', { className: 'wheel-fire-flow-motion', style: { animationDuration: kilnSourceState.flowMotionSeconds + 's' }, 'data-wheel-fire-air-path': 'true', 'data-wheel-fire-flow-mode': kilnSourceState.flowMode, d: 'M250 135 C210 90 286 72 250 28 M330 172 C382 118 310 94 352 42', fill: 'none', stroke: atmosphere === 'reduction' ? '#a78bfa' : '#cbd5e1', strokeWidth: 12, strokeLinecap: 'round', opacity: ((.08 + kilnAirAccess / 200) * kilnSourceState.flowVisibilityRatio).toFixed(2), strokeDasharray: '18 12' }),
            h('text', { x: 24, y: 28, fill: '#fff7ed', fontSize: 11 }, 'Load ' + Math.round(kilnLoadDensity) + '% | air access ' + Math.round(kilnAirAccess) + '%'),
            h('g', { 'aria-hidden': 'true' },
              h('ellipse', { cx: 300, cy: [96, 220, 310][probeIndex], rx: 70, ry: probeIndex === 2 ? 22 : 28, fill: 'none', stroke: '#67e8f9', strokeWidth: 2, strokeDasharray: '7 5' }),
              h('path', { d: 'M510 ' + [96, 220, 310][probeIndex] + ' H300', fill: 'none', stroke: '#67e8f9', strokeWidth: 3, strokeDasharray: '7 5' }),
              h('circle', { 'data-wheel-fire-temperature-now': Math.round(probeTemperature), cx: 300, cy: [96, 220, 310][probeIndex], r: 7, fill: '#083344', stroke: '#a5f3fc', strokeWidth: 3 }),
              h('text', { x: 500, y: [84, 208, 298][probeIndex], fill: '#cffafe', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, 'T now')
            ),
            witnessConePackVisual(probeConePack, 420, 112, 'open-' + kilnProbeZone, true),
            showZones ? h('g', null, h('text', { x: 24, y: 56, fill: '#fff7ed', fontSize: 12, fontWeight: 700 }, 'Upper plume ≈ ' + Math.round(zoneTemps[0]) + '°C'), h('text', { x: 24, y: 76, fill: '#fff7ed', fontSize: 12, fontWeight: 700 }, 'Fuel bed ≈ ' + Math.round(zoneTemps[2]) + '°C')) : null,
            h('text', { 'data-wheel-fire-source-label': 'true', x: 24, y: 356, fill: '#fff7ed', fontSize: 11 }, kilnSourceState.sceneLabel),
            h('text', { x: 510, y: 356, fill: '#fff7ed', fontSize: 11, textAnchor: 'end' }, 'Open firing: uneven heat and atmosphere exposure')
          );
          return h('figure', { className: 'rounded-xl border border-orange-300 bg-[#24130e] p-3 space-y-2', 'aria-labelledby': 'wheel-fire-kiln-cutaway-title' },
            h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2 text-orange-50' }, h('h3', { id: 'wheel-fire-kiln-cutaway-title', className: 'font-black' }, kilnType === 'open' ? 'Open-firing 3D section' : '3D kiln cutaway'), h('span', { className: 'text-xs font-bold' }, kilnPreviewLabel + ' · ' + Math.round(kilnPreviewTemp) + '°C · ' + atmosphere + ' · ' + kilnSample.elapsedHours.toFixed(1) + '/' + kilnSample.totalHours.toFixed(1) + ' h')),
            h('svg', { viewBox: '0 0 560 380', role: 'img', 'aria-label': sceneLabel, className: 'w-full min-h-[300px] rounded-xl bg-[#1b0d09]' },
              h('defs', null,
                h('linearGradient', { id: 'wheel-fire-kiln-wall', x1: '0', x2: '1' }, h('stop', { offset: '0%', stopColor: '#292421' }), h('stop', { offset: '46%', stopColor: '#918077' }), h('stop', { offset: '100%', stopColor: '#372e2a' })),
                h('linearGradient', { id: 'wheel-fire-kiln-insulation', x1: '0', x2: '1' }, h('stop', { offset: '0%', stopColor: '#654333' }), h('stop', { offset: '48%', stopColor: '#b9825f' }), h('stop', { offset: '100%', stopColor: '#684434' })),
                h('linearGradient', { id: 'wheel-fire-kiln-hot-face', x1: '0', x2: '1' }, h('stop', { offset: '0%', stopColor: '#8b5a3c' }), h('stop', { offset: '48%', stopColor: '#e7b98c' }), h('stop', { offset: '100%', stopColor: '#8f5d3f' })),
                h('radialGradient', { id: 'wheel-fire-kiln-rear', cx: '50%', cy: '42%', r: '66%' }, h('stop', { offset: '0%', stopColor: '#442016' }), h('stop', { offset: '72%', stopColor: '#24100c' }), h('stop', { offset: '100%', stopColor: '#120706' })),
                h('linearGradient', { id: 'wheel-fire-kiln-hearth', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#321a13' }), h('stop', { offset: '100%', stopColor: '#80563e' })),
                h('linearGradient', { id: 'wheel-fire-kiln-heat', x1: '0', y1: '1', x2: '0', y2: '0' }, h('stop', { offset: '0%', stopColor: '#dc2626' }), h('stop', { offset: '48%', stopColor: '#fb923c' }), h('stop', { offset: '100%', stopColor: '#fde68a' })),
                h('linearGradient', { id: 'wheel-fire-open-flame', x1: '0', y1: '1', x2: '0', y2: '0' }, h('stop', { offset: '0%', stopColor: '#dc2626' }), h('stop', { offset: '55%', stopColor: '#fb923c' }), h('stop', { offset: '100%', stopColor: '#fef3c7' })),
                h('marker', { id: 'wheel-fire-flow-arrow', markerWidth: 7, markerHeight: 7, refX: 6, refY: 3.5, orient: 'auto', markerUnits: 'strokeWidth' }, h('path', { d: 'M0 0 L7 3.5 L0 7 Z', fill: kilnHeatFlowColor })),
                h('marker', { id: 'wheel-fire-stress-arrow', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' }, h('path', { d: 'M0 0 L6 3 L0 6 Z', fill: wareStressColor }))
              ),
              kilnType === 'open' ? openScene : enclosedScene
            ),
            h('div', { role: 'status', 'aria-live': 'polite', className: 'space-y-1 text-orange-50' },
              h('p', { className: 'text-xs' }, h('strong', null, kilnMaterialState.label + '. '), kilnMaterialState.description),
              h('p', { 'data-wheel-fire-loading-status': 'true', className: 'text-[11px] font-bold text-amber-100' }, 'Loading model: ' + Math.round(kilnLoadDensity) + '% relative ware load | ' + Math.round(kilnAirAccess) + '% air access | ' + kilnLoadEffects.label + ' | zone spread x' + kilnLoadEffects.zoneSpreadMultiplier.toFixed(2) + ' | core lag x' + kilnLoadEffects.coreLagMultiplier.toFixed(2) + ' | ' + representativePieceLabel),
              h('p', { 'data-wheel-fire-source-status': kilnSourceState.state, className: 'text-[11px] font-bold text-amber-100' }, 'Heat source now: ' + kilnSourceState.summary),
              kilnType !== 'open' ? h('p', { 'data-wheel-fire-heat-flow-status': 'true', className: 'text-[11px] font-bold text-amber-100' }, 'Heat-route cue: ' + kilnHeatFlow.summary) : null,
              h('p', { className: 'text-[11px] font-bold text-orange-100' }, 'Modeled firing shrinkage ' + kilnMaterialState.firingShrinkagePct.toFixed(1) + '% · body development ' + Math.round(kilnMaterialState.maturityProgressPct) + '%' + (kilnMaterialState.glazeDevelopmentPct > 0 ? ' · glaze development ' + Math.round(kilnMaterialState.glazeDevelopmentPct) + '%' : '') + ' · load Δ ≈ ' + Math.round(temperatureDelta) + '°C'),
              h('p', { 'data-wheel-fire-cone-pack-status': 'true', className: 'text-[11px] font-bold text-cyan-100' }, 'Probe: ' + probeZoneName + ' · ' + Math.round(probeTemperature) + '°C · three-cone pack targeting cone ' + probeConePack.targetCone + ' · large cones in an 8° plaque mount · guide ' + probeConePack.guideCone.label + ' ' + Math.round(probeConePack.guideCone.bendDegrees) + '° · firing ' + probeConePack.firingCone.label + ' ' + Math.round(probeConeBend) + '° (' + probeConePack.interpretation + ') · guard ' + probeConePack.guardCone.label + ' ' + Math.round(probeConePack.guardCone.bendDegrees) + '°'),
              h('p', { 'data-wheel-fire-cone-reading': probeConeReading.phase, className: 'text-[11px] font-bold text-cyan-100' }, 'Read the pack — ' + probeConeReading.label + ': ' + probeConeReading.summary + ' Temperature now vs heatwork — ' + probeObservation.label + ': ' + probeObservation.summary),
              h('p', { 'data-wheel-fire-cone-uniformity': coneZoneSummary.resolution, className: 'text-[11px] font-bold text-cyan-100' }, (kilnType === 'open' ? 'Witness comparison: ' : 'Across modeled packs: ') + coneZoneSummary.summary + ' ' + coneZoneSummary.note),
              h('p', { 'data-wheel-fire-thermal-stress-status': 'true', className: 'text-[11px] font-bold text-yellow-100' }, 'Representative ware thermal section: ' + wareCoreLocation + ' · surface ≈ ' + Math.round(wareCore.surfaceTemperatureC) + '°C → mid-wall ≈ ' + Math.round(wareCore.midWallTemperatureC) + '°C → core ≈ ' + Math.round(wareCore.coreTemperatureC) + '°C · surface↔core Δ ≈ ' + Math.round(wareCore.surfaceToCoreGradientC) + '°C · ' + wareThermalDirection + ' · ' + wareCoreDifferenceLabel + ' · ' + wareThermalStress.summary + ' Cycle peak ' + Math.round(currentSchedule.thermalStress.peakStressPct) + '% during ' + currentSchedule.thermalStress.peakSample.phaseLabel.toLowerCase() + ' near ' + Math.round(currentSchedule.thermalStress.peakSample.temperatureC) + '°C · average wall ' + wareCore.averageWallCm.toFixed(2) + ' cm')
            ),
            h('div', { className: 'rounded-lg bg-orange-50 p-2 space-y-2' },
              rangeControl('wheel-fire-kiln-phase', 'Preview schedule time', kilnPreviewPhase, 0, 100, '%', function (value) { patchData({ kilnPreviewPhase: value }); }),
              h('button', { type: 'button', 'data-wheel-fire-jump-peak': 'true', onClick: function () { patchData({ kilnPreviewPhase: currentSchedule.thermalStress.peakSample.progressPct }); announce('Preview moved to cycle peak modeled transient stress: ' + Math.round(currentSchedule.thermalStress.peakStressPct) + '% during ' + currentSchedule.thermalStress.peakSample.phaseLabel.toLowerCase() + ' near ' + Math.round(currentSchedule.thermalStress.peakSample.temperatureC) + '°C.'); }, className: 'rounded-lg border border-orange-400 bg-white px-3 py-2 text-xs font-black text-orange-950' }, 'Jump to peak stress (' + Math.round(currentSchedule.thermalStress.peakStressPct) + '%)')
            ),
            h('div', { className: 'flex flex-wrap items-end gap-3' },
              h('label', { htmlFor: 'wheel-fire-kiln-probe-zone', className: 'flex-1 min-w-[180px] text-xs font-bold text-orange-50' }, 'Inspect heatwork zone', h('select', { id: 'wheel-fire-kiln-probe-zone', value: kilnProbeZone, onChange: function (event) { patchData({ kilnProbeZone: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-orange-200 bg-white p-2 text-slate-900' }, probeZoneIds.map(function (id, index) { return h('option', { key: id, value: id }, probeZoneNames[index]); }))),
              h('label', { className: 'flex items-center gap-2 pb-2 text-xs font-bold text-orange-50' }, h('input', { type: 'checkbox', checked: showZones, onChange: function (event) { patchData({ showKilnHeatZones: event.target.checked }); } }), 'Show modeled heat zones')
            ),
            h('p', { className: 'text-[11px] text-orange-100' }, 'Stress halo arrows point outward for modeled surface tension during cooling and inward for modeled core tension during heating. This is a comparative teaching estimate, not a crack prediction. Load and air-access controls are not kiln capacity, stacking, clearance, or safe-loading guidance.' + (kilnType !== 'open' ? ' Kiln wall bands are schematic and do not indicate safe-touch temperatures, construction condition, or a kiln specification. Chamber-depth cues likewise do not show measured loading or clearance geometry.' : '')),
            h('figcaption', { className: 'text-[11px] text-orange-100' }, 'Schedule position follows the selected ramp, soak, and cooling durations. In each three-cone pack the guide responds first, the firing cone is the target, and the guard responds after excess heatwork. “T now” marks the modeled instantaneous zone temperature; cone bend records accumulated heatwork and retains its peak response during cooling. ' + kilnSourceState.note + (kilnType !== 'open' ? ' ' + kilnHeatFlow.note + ' Enclosed-kiln shelf surfaces, front faces, and support posts are perspective placement cues—not loading, clearance, structural, or capacity guidance. Wall bands distinguish outer casing, insulating refractory, and hot face; their widths and colors are schematic—not a kiln design, condition assessment, or surface-temperature reading. The rear arch, curved returns, hearth plane, and widening shelf fronts are schematic depth cues—not measured chamber geometry, placement, or clearance guidance. Real kiln construction varies by kiln type and manufacturer.' : '') + ' The rendered pack represents large witness cones in a three-hole plaque with an 8° starting lean. Self-supporting witness cones instead provide their own base, height, and built-in angle and do not use this plaque. On the selected pack, dashed 25° and 75° silhouettes bracket the firing cone’s comparative target band. Reference endpoints use the closest modeled witness-cone 15, 60, or 150°C/h chart column; modeled soak response remains simplified. The 25°–75° firing-cone target band is comparative—not a controller program; real cone selection and bend interpretation depend on cone type, mounting, heating rate, manufacturer charts, witness placement, and measurement templates. Curved cone silhouettes show modeled deformation, not a measurement template. The magnified thermal rings are schematic, not wall-thickness scale. Their surface, mid-wall, and core temperatures are comparative estimates based on average wall thickness, clay-body thermal sensitivity, and the selected ramp or cooling rate—not thermocouple readings. Spatial temperatures, transformations, shrinkage, and flow paths are comparative teaching cues, not computational fluid dynamics. Real firings use witness cones, kiln-rated instruments, ventilation, and trained supervision.')
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
                  h('span', null, segment.label.charAt(0).toUpperCase() + segment.label.slice(1) + ' · ' + Math.round(segment.moistureStartPct) + '→' + Math.round(segment.moistureEndPct) + '% moisture'),
                  h('span', null, segment.moistureLossPct.toFixed(1) + ' points · ' + Math.round(segment.crackRiskPct) + '% crack-risk signal')
                ),
                h('div', { className: 'h-3 overflow-hidden rounded-full bg-sky-100', 'aria-hidden': 'true' }, h('div', { className: 'h-full rounded-full bg-sky-600', style: { width: Math.max(0, Math.min(100, segment.relativePct)).toFixed(1) + '%' } })),
                h('div', { className: 'text-[11px] text-slate-600' }, 'Modeled shrinkage: ' + segment.shrinkagePct.toFixed(2) + '%' + (segment.newDefects.length ? ' · New flags: ' + segment.newDefects.join(', ') : ' · No new modeled flags'))
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
                return h('button', { type: 'button', key: hotspot.index, onClick: function () { focusDryingHotspot(hotspot.index); }, className: 'w-full rounded-lg border border-sky-300 bg-white p-2 text-left text-xs hover:bg-sky-100' }, h('span', { className: 'font-black text-sky-950' }, 'Ring ' + (hotspot.index + 1)), ' · ', Math.round(hotspot.riskPct) + '% local signal · ' + hotspot.wallCm.toFixed(2) + ' cm wall · ' + hotspot.reason)
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
          var repeatability = summarizeMeasurementRepeatability(calibration.rows);
          var checkpointMax = Math.max(0, history.snapshots.length - 1);
          var checkpointIndex = Math.round(clamp(finite(data.dimensionMeasureCheckpoint, 0), 0, checkpointMax));
          var checkpoint = history.snapshots[checkpointIndex] || history.baseline;
          var measurementMethod = normalizeMeasurementMethod(data.dimensionMeasureMethod || 'calipers');
          if (measurementMethod === 'unknown') measurementMethod = 'calipers';
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
            var entry = { id: Date.now(), checkpointIndex: checkpointIndex, checkpointLabel: checkpoint.label, stage: checkpoint.stage, measurementMethod: measurementMethod, modeled: { heightCm: checkpoint.heightCm, diameterCm: checkpoint.diameterCm, capacityMl: checkpoint.capacityMl, minWallCm: checkpoint.minWallCm }, modelSettings: dimensionalSettings, measured: measured, uncertainty: uncertainty, note: String(data.dimensionMeasureNote || '').trim().slice(0, 240), savedAt: new Date().toISOString() };
            patchData({ dimensionMeasurementLog: [entry].concat(measurementLog).slice(0, 12), dimensionMeasureHeight: '', dimensionMeasureDiameter: '', dimensionMeasureCapacity: '', dimensionMeasureMinWall: '', dimensionUncertaintyHeight: '', dimensionUncertaintyDiameter: '', dimensionUncertaintyCapacity: '', dimensionUncertaintyMinWall: '', dimensionMeasureMethod: '', dimensionMeasureNote: '' });
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
          function repeatabilityCell(group, id) {
            var summary = group.metricSummaries[id];
            if (!summary || !summary.count) return '—';
            var digits = metricDigits(id);
            return summary.count + ' readings; range ' + summary.range.toFixed(digits) + ' ' + summary.unit + '; sample SD ' + summary.sampleStdDev.toFixed(digits) + ' ' + summary.unit;
          }
          function repeatabilityMethodCell(group) {
            if (group.methodConsistency === 'mixed') return 'Mixed: ' + group.methodLabels.join(' + ');
            return group.methodLabels[0] || 'Not recorded';
          }
          function clearDimensionTargets() {
            patchData({ dimensionTargetHeight: '', dimensionTargetDiameter: '', dimensionTargetCapacity: '', dimensionTargetMinWall: '' });
            announce('Dimensional targets cleared.');
          }
          var repeatedGroups = repeatability.groups.filter(function (group) { return group.rowCount > 1; });
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-dimensional-history-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-dimensional-history-title', className: 'font-black text-indigo-950' }, 'Dimensional shrinkage budget'),
              h('p', { className: 'text-xs text-indigo-950 mt-1' }, 'Forward projection from the current stage. Height, diameter, capacity, and minimum wall are model checkpoints—not a substitute for measuring the real piece.')
            ),
            h('div', { role: 'region', tabIndex: 0, 'aria-label': 'Projected dimensional checkpoints table', className: 'overflow-x-auto rounded-lg border border-indigo-200 bg-white' },
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
              h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-5 gap-2' },
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Checkpoint', h('select', { id: 'wheel-fire-dimension-checkpoint', value: String(checkpointIndex), onChange: function (event) { patchData({ dimensionMeasureCheckpoint: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white' }, history.snapshots.map(function (snapshot, index) { return h('option', { key: snapshot.label, value: String(index) }, snapshot.label + ' · ' + stageLabel(snapshot.stage)); }))),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measurement method', h('select', { value: measurementMethod, onChange: function (event) { patchData({ dimensionMeasureMethod: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white' }, MEASUREMENT_METHODS.map(function (methodOption) { return h('option', { key: methodOption.id, value: methodOption.id }, methodOption.label); }))),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured height (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionMeasureHeight'), onChange: function (event) { patchData({ dimensionMeasureHeight: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: checkpoint.heightCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured diameter (cm)', h('input', { type: 'number', min: '0.01', step: '0.1', value: inputValue('dimensionMeasureDiameter'), onChange: function (event) { patchData({ dimensionMeasureDiameter: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: checkpoint.diameterCm.toFixed(1) })),
                h('label', { className: 'block text-xs font-bold text-slate-700' }, 'Measured capacity (mL)', h('input', { type: 'number', min: '0.01', step: '1', value: inputValue('dimensionMeasureCapacity'), onChange: function (event) { patchData({ dimensionMeasureCapacity: event.target.value }); }, className: 'block w-full mt-1 rounded-lg border border-indigo-300 p-2 bg-white', placeholder: Math.round(checkpoint.capacityMl) }))
              ),
              h('p', { className: 'text-[11px] text-indigo-950' }, 'Use the same method when repeating a checkpoint. If you combine methods, choose “Mixed methods” and describe the protocol in the note.'),
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
                    h('thead', null, h('tr', { className: 'bg-indigo-50' }, ['Checkpoint', 'Height', 'Diameter', 'Capacity', 'Min wall', 'Method', 'Context', 'Note'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-indigo-200' }, label); }))),
                    h('tbody', null, calibration.rows.map(function (row) { return h('tr', { key: row.id }, h('th', { scope: 'row', className: 'text-left p-2 border-b align-top font-black' }, row.checkpoint), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'heightCm')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'diameterCm')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'capacityMl')), h('td', { className: 'p-2 border-b align-top' }, metricCell(row, 'minWallCm')), h('td', { className: 'p-2 border-b align-top' }, row.measurementMethodLabel), h('td', { className: 'p-2 border-b align-top font-bold' }, contextLabel(row)), h('td', { className: 'p-2 border-b align-top max-w-xs' }, row.note || '—')); }))
                  )
                )
              ) : null
            ),
            h('div', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-3 space-y-3', 'aria-live': 'polite' },
              h('div', null,
                h('h4', { className: 'font-black text-violet-950' }, 'Repeatability study'),
                h('p', { className: 'text-xs text-violet-950 mt-1' }, repeatability.summary)
              ),
              repeatedGroups.length ? h('div', { className: 'overflow-x-auto rounded-lg border border-violet-200 bg-white' },
                h('table', { className: 'w-full text-xs border-collapse' },
                  h('caption', { className: 'text-left p-2 font-black text-violet-950' }, 'Repeated checkpoint spread'),
                  h('thead', null, h('tr', { className: 'bg-violet-100' }, ['Checkpoint', 'Logs', 'Method', 'Height spread', 'Diameter spread', 'Capacity spread', 'Min wall spread'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-violet-200' }, label); }))),
                  h('tbody', null, repeatedGroups.map(function (group) { return h('tr', { key: group.key }, h('th', { scope: 'row', className: 'text-left p-2 border-b align-top font-black' }, group.checkpoint), h('td', { className: 'p-2 border-b align-top' }, group.rowCount), h('td', { className: 'p-2 border-b align-top' }, repeatabilityMethodCell(group)), h('td', { className: 'p-2 border-b align-top' }, repeatabilityCell(group, 'heightCm')), h('td', { className: 'p-2 border-b align-top' }, repeatabilityCell(group, 'diameterCm')), h('td', { className: 'p-2 border-b align-top' }, repeatabilityCell(group, 'capacityMl')), h('td', { className: 'p-2 border-b align-top' }, repeatabilityCell(group, 'minWallCm'))); }))
                )
              ) : h('p', { className: 'rounded-lg border border-dashed border-violet-300 bg-white p-2 text-xs text-violet-950' }, 'Repeated measurements become useful here when the same checkpoint is logged more than once. Keep the checkpoint, tool, and measuring technique consistent when you want to estimate repeatability.'),
              h('p', { className: 'text-[11px] text-violet-950' }, 'Range is max minus min; sample SD describes spread among repeated readings. Neither is a pass/fail threshold or a substitute for calibrated instruments.')
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, history.summary)
          );
        }
        function thermalHistory() {
          var history = currentSchedule.thermalHistory;
          return h('section', { className: 'rounded-xl border border-orange-200 bg-white p-3 space-y-3', 'aria-labelledby': 'wheel-fire-thermal-history-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-thermal-history-title', className: 'font-black text-orange-950' }, 'Modeled thermal history'),
              h('p', { className: 'text-xs text-orange-950 mt-1' }, 'An approximate time sequence from room temperature to the selected peak and back toward ' + Math.round(history.coolingReference) + '°C. The chamber schedule itself omits controller cycling and thermocouple behavior. The dashed ware-core trace adds only a comparative response to wall thickness, body sensitivity, load density, and air access; it is not a measurement or witness-cone model.')
            ),
            h('div', { className: 'space-y-2', 'aria-label': 'Modeled thermal history segments' }, history.segments.map(function (segment) {
              return h('div', { key: segment.id },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700' },
                  h('span', null, segment.label + ' · ' + Math.round(segment.startC) + '→' + Math.round(segment.endC) + '°C'),
                  h('span', null, segment.durationHours.toFixed(1) + ' h · ' + Math.round(segment.relativePct) + '% of modeled time')
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
          kilnCutaway(),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
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
              h('div', { className: 'wheel-fire-advanced space-y-3' },
                rangeControl('wheel-fire-kiln-load', 'Relative ware load', kilnLoadDensity, 20, 95, '%', function (value) { patchData({ kilnLoadDensity: value }); }),
                rangeControl('wheel-fire-kiln-air', 'Air access around ware', kilnAirAccess, 20, 100, '%', function (value) { patchData({ kilnAirAccess: value }); }),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Comparative teaching controls only: not kiln capacity, stacking, clearance, or safe-loading guidance.')
              ),
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
                h('thead', null, h('tr', { className: 'bg-orange-100' }, ['Schedule', 'Kiln', 'Loading', 'Target', 'Effective', 'Cone', 'Score', 'Porosity', 'Glaze surface', 'Actions'].map(function (label) { return h('th', { key: label, scope: 'col', className: 'text-left p-2 border-b border-orange-200' }, label); }))),
                h('tbody', null, firingSchedules.map(function (schedule) {
                  var scheduleComparison = analyzeFiringSchedule(vessel, schedule);
                  return h('tr', { key: schedule.id },
                    h('th', { scope: 'row', className: 'text-left align-top p-2 border-b border-orange-100' }, schedule.label || 'Unnamed schedule'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, schedule.kilnType || 'electric'),
                    h('td', { className: 'align-top p-2 border-b border-orange-100' }, Math.round(finite(schedule.kilnLoadDensity, 55)) + '% load / ' + Math.round(finite(schedule.kilnAirAccess, 60)) + '% air'),
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
                h('td', { className: 'p-2 border-b' }, stageLabel(entry.stage)),
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
            metricCard('Effective porosity', preview.porosityPct.toFixed(1) + '%', stageLabel(vessel.stage)),
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
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-sensitivity-title', className: 'font-black text-slate-900' }, 'Read the sensitivity band'),
              h('p', { className: 'text-xs text-slate-700 mt-1' }, 'The point estimate is a teaching-model center, while the band shows how sensitive that estimate is to simplified assumptions. It is not a statistical confidence interval or a prediction of service life.')
            ),
            h('div', { className: 'grid sm:grid-cols-2 gap-2' },
              h('div', { className: 'rounded-lg border border-slate-200 bg-white p-2' }, h('div', { className: 'text-[11px] font-bold uppercase tracking-wide text-slate-500' }, 'Band width'), h('div', { className: 'text-lg font-black text-slate-900' }, Math.round(bandWidth) + ' percentage points'), h('div', { className: 'text-[11px] text-slate-600' }, 'bounded at ±' + Math.round(preview.uncertaintyPct) + '% around the estimate')),
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
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-teal-300 bg-teal-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-sweep-title' },
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
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-cyan-300 bg-cyan-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-sensitivity-log-title' },
            h('div', null,
              h('h3', { id: 'wheel-fire-sensitivity-log-title', className: 'font-black text-cyan-950' }, 'Sensitivity experiment log'),
              h('p', { className: 'text-xs text-cyan-950 mt-1' }, 'Saved model comparisons and field notes stay together so you can revisit the question without confusing a prediction with an observation.')
            ),
            h('div', { className: 'space-y-2' }, sensitivityLog.map(function (entry) {
              var axes = copyArray(entry.axes);
              return h('article', { key: entry.id, className: 'rounded-lg border border-cyan-200 bg-white p-3 space-y-2' },
                h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2' }, h('strong', { className: 'text-sm text-slate-900' }, entry.label || 'Cycle sensitivity sweep'), h('span', { className: 'text-[11px] text-slate-600' }, String(entry.savedAt || '').slice(0, 10) + ' · ' + stageLabel(entry.stage || 'unknown stage'))),
                h('p', { className: 'text-xs font-bold text-cyan-900' }, 'Baseline: ' + Math.round(finite(entry.damagePct, 0)) + '% damage; ' + Math.round(finite(entry.cycles, 0)) + ' cycles · ' + Math.round(finite(entry.dryingRate, 0)) + '% dry · ' + Math.round(finite(entry.cycleTemperatureDelta, 0)) + ' C swing'),
                axes.length ? h('ul', { className: 'list-disc pl-5 text-[11px] text-slate-700' }, axes.map(function (axis) { return h('li', { key: axis.id }, axis.label + ': ' + copyArray(axis.points).map(function (point) { return Math.round(finite(point.value, 0)) + axis.unit + ' → ' + Math.round(finite(point.damagePct, 0)) + '%'; }).join(' · ')); })) : null,
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
                  h('span', null, point.phase + ' · ' + Math.round(point.cycles) + ' cycles'),
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
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-blue-300 bg-blue-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-cycle-protocols-title' },
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
          return h('section', { className: 'wheel-fire-advanced rounded-xl border border-violet-300 bg-violet-50 p-3 space-y-3', 'aria-labelledby': 'wheel-fire-cycle-shelf-title' },
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
              h('tbody', null, performanceLog.map(function (entry) { var entryBody = materialProfile({ clayBody: entry.clayBody, materialRecipe: entry.materialRecipe }); return h('tr', { key: entry.id }, h('td', { className: 'p-2 border-b' }, entry.label), h('td', { className: 'p-2 border-b' }, stageLabel(entry.stage)), h('td', { className: 'p-2 border-b' }, entryBody.name), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.score, 0)) + '/100'), h('td', { className: 'p-2 border-b' }, finite(entry.porosityPct, 0).toFixed(1) + '%'), h('td', { className: 'p-2 border-b' }, Math.round(finite(entry.integrityPct, 0)) + '%'), h('td', { className: 'p-2 border-b' }, entry.status), h('td', { className: 'p-2 border-b max-w-xs' }, entry.observation || 'No field note')); }))
            )
          ) : null
        );
      }
      function journalPanel() {
        var saved = copyArray(data.gallery);
        var mechanicsTrials = copyArray(data.measurementLog);
        function referenceSummary(trials, seriesId, baselineIds) {
          var scopedTrials = trials.filter(function (row) { return String(row.seriesId || 'series-legacy') === String(seriesId || 'series-legacy'); });
          var selectedId = baselineIds && typeof baselineIds === 'object' ? String(baselineIds[seriesId] || '') : '';
          var selectedIndex = -1;
          scopedTrials.forEach(function (row, index) {
            var rowKey = row && row.id !== undefined ? String(row.id) : 'legacy-' + index;
            if (rowKey === selectedId) selectedIndex = index;
          });
          if (selectedIndex < 0 && scopedTrials.length) selectedIndex = 0;
          if (selectedIndex < 0) return null;
          var row = scopedTrials[selectedIndex];
          var methodText = row.method === 'coil' ? 'coil / hand-built' : 'wheel / ' + Math.round(finite(row.rpm, 0)) + ' RPM';
          var ringText = row.workRing === undefined ? 'ring not recorded' : 'ring ' + (Number(row.workRing) + 1);
          return { label: 'Trial ' + (selectedIndex + 1), text: 'Trial ' + (selectedIndex + 1) + ' · ' + methodText + ' · ' + ringText };
        }
        var mechanicsSeriesId = String(data.trialSeriesId || (mechanicsTrials.length ? mechanicsTrials[mechanicsTrials.length - 1].seriesId || 'series-legacy' : ''));
        var mechanicsReference = referenceSummary(mechanicsTrials, mechanicsSeriesId, data.trialBaselineIds);
        var latestMechanicsTrial = mechanicsTrials.length ? mechanicsTrials[mechanicsTrials.length - 1] : null;
        var journalRecipe = normalizeRecipe(vessel.materialRecipe);
        var journalModelSettings = currentDimensionSettings();
        var journalTargets = { heightCm: data.dimensionTargetHeight, diameterCm: data.dimensionTargetDiameter, capacityMl: data.dimensionTargetCapacity, minWallCm: data.dimensionTargetMinWall };
        var journalTargetCount = Object.keys(journalTargets).filter(function (key) { return journalTargets[key] !== '' && journalTargets[key] !== null && journalTargets[key] !== undefined && Number(journalTargets[key]) > 0; }).length;
        var reflectionCount = ['claim', 'evidence', 'reasoning'].filter(function (key) { return String(data[key] || '').trim(); }).length;
        var culturalComparisons = copyArray(data.culturalComparisons);
        var selectedTraditionStudy = CULTURAL_STUDIES.filter(function (study) { return study.id === data.selectedTradition; })[0] || null;
        function loadJournalEntry(entry) {
          var extra = { method: entry.method, studyLabel: entry.studyLabel || '', artistStatement: entry.statement || '', performanceLog: copyArray(entry.performanceTests), materialScenarios: copyArray(entry.materialScenarios), firingSchedules: copyArray(entry.firingSchedules), cycleProtocols: copyArray(entry.cycleProtocols), sensitivityLog: copyArray(entry.sensitivityStudies), dimensionMeasurementLog: copyArray(entry.dimensionMeasurements), measurementLog: copyArray(entry.measurementTrials), hypothesis: entry.hypothesis || '', claim: entry.claim || '', evidence: entry.evidence || '', reasoning: entry.reasoning || '', cultureSimilarity: entry.cultureSimilarity || '', cultureDifference: entry.cultureDifference || '', cultureEvidence: entry.cultureEvidence || '', culturalComparisons: copyArray(entry.culturalComparisons), selectedTradition: entry.selectedTradition || '', compareTradition: entry.compareTradition || '', visitedTraditions: entry.visitedTraditions && typeof entry.visitedTraditions === 'object' ? Object.assign({}, entry.visitedTraditions) : {}, trialSeriesId: entry.trialSeriesId || '', trialSeriesName: entry.trialSeriesName || '', trialBaselineIds: entry.trialBaselineIds && typeof entry.trialBaselineIds === 'object' ? Object.assign({}, entry.trialBaselineIds) : {}, recipeDraft: normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe)) };
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
          var entry = { id: Date.now(), name: name, vessel: copyVessel(vessel), materialRecipe: normalizeRecipe(vessel.materialRecipe), materialScenarios: copyArray(data.materialScenarios).slice(0, 8), firingSchedules: copyArray(data.firingSchedules).slice(0, 8), cycleProtocols: copyArray(data.cycleProtocols).slice(0, 8), sensitivityStudies: copyArray(data.sensitivityLog).slice(0, 8), dimensionMeasurements: copyArray(data.dimensionMeasurementLog).slice(0, 12), measurementTrials: copyArray(data.measurementLog).slice(0, 12), hypothesis: String(data.hypothesis || '').trim().slice(0, 240), claim: String(data.claim || '').trim().slice(0, 1200), evidence: String(data.evidence || '').trim().slice(0, 1200), reasoning: String(data.reasoning || '').trim().slice(0, 1200), cultureSimilarity: String(data.cultureSimilarity || '').trim().slice(0, 500), cultureDifference: String(data.cultureDifference || '').trim().slice(0, 500), cultureEvidence: String(data.cultureEvidence || '').trim().slice(0, 500), culturalComparisons: copyArray(data.culturalComparisons).slice(0, 8), selectedTradition: data.selectedTradition || '', compareTradition: data.compareTradition || '', visitedTraditions: data.visitedTraditions && typeof data.visitedTraditions === 'object' ? Object.assign({}, data.visitedTraditions) : {}, trialSeriesId: data.trialSeriesId || '', trialSeriesName: String(data.trialSeriesName || '').trim().slice(0, 60), trialBaselineIds: data.trialBaselineIds && typeof data.trialBaselineIds === 'object' ? Object.assign({}, data.trialBaselineIds) : {}, dimensionTargets: journalTargets, modelVersion: DIMENSION_MODEL_VERSION, modelSettings: journalModelSettings, method: method, studyLabel: data.studyLabel || '', statement: data.artistStatement || '', performanceTests: copyArray(data.performanceLog).slice(0, 4), savedAt: new Date().toISOString() };
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
                h('div', null, h('dt', { className: 'font-bold' }, 'Stage'), h('dd', null, stageLabel(vessel.stage))),
                h('div', null, h('dt', { className: 'font-bold' }, 'Stability'), h('dd', null, percent(stats.stability))),
                h('div', null, h('dt', { className: 'font-bold' }, 'Clay'), h('dd', null, materialProfile(vessel).name)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Recipe study'), h('dd', null, journalRecipe ? (journalRecipe.label || 'Unnamed assumptions') : 'Named body baseline')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Study credit'), h('dd', null, data.studyLabel || 'Original studio exploration')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Function tests'), h('dd', null, copyArray(data.performanceLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Saved scenarios'), h('dd', null, copyArray(data.materialScenarios).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Firing schedules'), h('dd', null, copyArray(data.firingSchedules).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Reuse protocols'), h('dd', null, copyArray(data.cycleProtocols).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Sensitivity studies'), h('dd', null, copyArray(data.sensitivityLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Mechanics trials'), h('dd', null, mechanicsTrials.length)),
                latestMechanicsTrial && latestMechanicsTrial.observation ? h('div', { className: 'col-span-2' }, h('dt', { className: 'font-bold' }, 'Latest field observation'), h('dd', { className: 'text-slate-700' }, latestMechanicsTrial.observation)) : null,
                h('div', null, h('dt', { className: 'font-bold' }, 'Reflection fields'), h('dd', null, reflectionCount + '/3 recorded')),
                h('div', null, h('dt', { className: 'font-bold' }, 'Cultural comparisons'), h('dd', null, culturalComparisons.length)),
                selectedTraditionStudy ? h('div', { className: 'col-span-2' }, h('dt', { className: 'font-bold' }, 'Tradition context'), h('dd', null, selectedTraditionStudy.name)) : null,
                data.trialSeriesName ? h('div', { className: 'col-span-2' }, h('dt', { className: 'font-bold' }, 'Mechanics series'), h('dd', null, data.trialSeriesName)) : null,
                mechanicsReference ? h('div', { className: 'col-span-2' }, h('dt', { className: 'font-bold' }, 'Mechanics reference'), h('dd', null, mechanicsReference.text)) : null,
                h('div', null, h('dt', { className: 'font-bold' }, 'Dimensional measurements'), h('dd', null, copyArray(data.dimensionMeasurementLog).length)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Dimensional targets'), h('dd', null, journalTargetCount)),
                h('div', null, h('dt', { className: 'font-bold' }, 'Model provenance'), h('dd', null, 'v' + journalModelSettings.modelVersion + ' · current controls'))
              )
            )
          ),
          saved.length ? h('div', { className: 'wheel-fire-culture-grid' }, saved.map(function (entry) {
            var entryStats = analyzeVessel(entry.vessel, { rpm: 0 });
            var entryRecipe = normalizeRecipe(entry.materialRecipe || (entry.vessel && entry.vessel.materialRecipe));
            var entryMechanicsTrials = copyArray(entry.measurementTrials);
            var entrySeriesId = String(entry.trialSeriesId || (entryMechanicsTrials.length ? entryMechanicsTrials[entryMechanicsTrials.length - 1].seriesId || 'series-legacy' : ''));
            var entryReference = referenceSummary(entryMechanicsTrials, entrySeriesId, entry.trialBaselineIds);
            var latestEntryTrial = entryMechanicsTrials.length ? entryMechanicsTrials[entryMechanicsTrials.length - 1] : null;
            var entryReflectionCount = ['claim', 'evidence', 'reasoning'].filter(function (key) { return String(entry[key] || '').trim(); }).length;
            var entryCulturalComparisons = copyArray(entry.culturalComparisons);
            var entryTraditionStudy = CULTURAL_STUDIES.filter(function (study) { return study.id === entry.selectedTradition; })[0] || null;
            var entryContext = compareDimensionModelSettings(entry.modelSettings, journalModelSettings);
            return h('article', { key: entry.id, className: 'rounded-xl border border-emerald-300 bg-white p-3' },
              h('h3', { className: 'font-black text-slate-900' }, entry.name),
              h('p', { className: 'text-[11px] text-slate-600' }, stageLabel(entry.vessel.stage) + ' · ' + entryStats.shape + ' · ' + entry.method),
              entryRecipe ? h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: ' + (entryRecipe.label || 'Unnamed recipe study')) : h('p', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, 'Material: Named body baseline'),
              entry.studyLabel ? h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, 'Process credit: ' + entry.studyLabel) : null,
              copyArray(entry.materialScenarios).length ? h('p', { className: 'text-[11px] font-bold text-indigo-800 mt-1' }, copyArray(entry.materialScenarios).length + ' saved material scenario' + (copyArray(entry.materialScenarios).length === 1 ? '' : 's')) : null,
              copyArray(entry.firingSchedules).length ? h('p', { className: 'text-[11px] font-bold text-orange-800 mt-1' }, copyArray(entry.firingSchedules).length + ' saved firing schedule' + (copyArray(entry.firingSchedules).length === 1 ? '' : 's')) : null,
              copyArray(entry.cycleProtocols).length ? h('p', { className: 'text-[11px] font-bold text-violet-800 mt-1' }, copyArray(entry.cycleProtocols).length + ' saved reuse protocol' + (copyArray(entry.cycleProtocols).length === 1 ? '' : 's')) : null,
              copyArray(entry.sensitivityStudies).length ? h('p', { className: 'text-[11px] font-bold text-cyan-800 mt-1' }, copyArray(entry.sensitivityStudies).length + ' saved sensitivity stud' + (copyArray(entry.sensitivityStudies).length === 1 ? 'y' : 'ies')) : null,
              entryMechanicsTrials.length ? h('p', { className: 'text-[11px] font-bold text-cyan-800 mt-1' }, entryMechanicsTrials.length + ' saved mechanics trial' + (entryMechanicsTrials.length === 1 ? '' : 's')) : null,
              latestEntryTrial && latestEntryTrial.observation ? h('p', { className: 'text-[11px] text-slate-700 mt-1' }, h('strong', null, 'Latest field note: '), latestEntryTrial.observation) : null,
              entryReflectionCount ? h('p', { className: 'text-[11px] font-bold text-indigo-800 mt-1' }, entryReflectionCount + '/3 reflection fields saved') : null,
              entryCulturalComparisons.length ? h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, entryCulturalComparisons.length + ' saved cultural comparison' + (entryCulturalComparisons.length === 1 ? '' : 's')) : null,
              entryTraditionStudy ? h('p', { className: 'text-[11px] font-bold text-fuchsia-800 mt-1' }, 'Tradition context: ' + entryTraditionStudy.name) : null,
              entry.trialSeriesName ? h('p', { className: 'text-[11px] font-bold text-cyan-800 mt-1' }, 'Trial series: ' + entry.trialSeriesName) : null,
              entryReference ? h('p', { className: 'text-[11px] font-bold text-cyan-800 mt-1' }, 'Reference trial: ' + entryReference.text) : null,
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

      return h('div', { className: 'wheel-fire-shell space-y-3 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 p-3 sm:p-4', 'data-wheel-fire-lab': 'true', 'data-experience-mode': experienceMode },
        h('header', { className: 'rounded-2xl bg-[#3d251d] text-amber-50 p-4 shadow-lg' },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
            h('div', null, h('h1', { className: 'text-2xl font-black' }, '🏺 Wheel & Fire'), h('p', { className: 'font-bold text-amber-200' }, 'Pottery Lab · material science, cultural context, and creative practice')),
            h('div', { className: 'rounded-xl bg-black/25 border border-amber-200/30 px-3 py-2 text-xs' }, h('strong', null, materialProfile(vessel).name), ' · ', stageLabel(vessel.stage), ' · ', stats.status)
          ),
          h('div', { className: 'mt-3' }, stageStrip())
        ),
        h('nav', { role: 'tablist', 'aria-label': 'Wheel and Fire sections', 'aria-orientation': 'horizontal', className: 'flex flex-wrap gap-2 rounded-xl border border-amber-300 bg-white p-2' },
          tabButton('shape', 'Shape', '🏺'),
          tabButton('science', 'Clay science', '⚖️'),
          tabButton('traditions', 'Ways of making', '🌍'),
          tabButton('kiln', 'Dry & fire', '🔥'),
          tabButton('performance', 'Use tests', '🧪'),
          tabButton('journal', 'Journal', '📓')
        ),
        experienceModeControl(),
        guidancePanel(),
        failureAutopsy(),
        view === 'shape' ? shapePanel() : null,
        view === 'science' ? sciencePanel() : null,
        view === 'traditions' ? traditionsPanel() : null,
        view === 'kiln' ? kilnPanel() : null,
        view === 'performance' ? performancePanel() : null,
        view === 'journal' ? journalPanel() : null,
          h('div', { id: 'wheel-fire-live-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700' },
          'Stage ' + stageLabel(vessel.stage) + '. ' + Math.round(stats.stability) + '% stability. ' + Math.round(stats.uniformity) + '% wall uniformity. ' + vessel.lastOutcome
        )
      );
    }
  });
})();
