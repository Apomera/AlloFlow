// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_renewables.js — Renewables Lab
// The PHYSICS and ENGINEERING of how each renewable source generates
// electricity. Sister tool to Climate Explorer (which covers the POLICY /
// MIX-DESIGN / JUSTICE side). This tool answers "how does it actually work?"
//   • Solar PV — photovoltaic effect, irradiance × cos(angle), series/parallel
//   • Wind — Betz limit, ½·ρ·A·v³ cube-of-wind-speed power curve
//   • Hydro — P = ρ·g·h·Q·η head + flow sim, Pelton/Francis/Kaplan
//   • Geothermal — heat gradient + dry-steam / flash / binary plants + GSHP
//   • Solar thermal (CSP) — parabolic trough / power tower / molten-salt storage
//   • Wave & tidal — oscillating water column + tidal stream
//   • Biomass / biogas — combustion + anaerobic digestion
//   • Storage — Li-ion / flow / pumped hydro / green hydrogen
// Quiz at the end + cited resources (NREL, DOE, IRENA, IEA, EIA, BOEM, Maine GEO).
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

// ── RenewablesLab keyframes (mastery celebration) ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('renewables-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'renewables-celeb-css';
  st.textContent = [
    '@keyframes renewables-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('renewablesLab'))) {

(function() {
  'use strict';

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-renewables')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-renewables';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-rn-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-rn-focus-css';
    st.textContent = '[data-rn-focusable]:focus-visible{outline:3px solid #facc15!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  // Rate-limited announcer (mirror the firstresponse / roadready pattern)
  var _rnPoliteTimer = null;
  function rnAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-renewables');
    if (!lr) return;
    if (_rnPoliteTimer) clearTimeout(_rnPoliteTimer);
    lr.textContent = '';
    _rnPoliteTimer = setTimeout(function() { lr.textContent = String(text || ''); _rnPoliteTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: CITED RESOURCES
  // Every quantitative claim in this tool traces to one of these.
  // ─────────────────────────────────────────────────────────
  var RESOURCES = {
    primary: [
      { name: 'NREL — National Renewable Energy Laboratory', contact: 'nrel.gov',
        desc: 'US DOE lab. Capacity factors, levelized cost of energy (LCOE), Annual Technology Baseline.',
        url: 'https://www.nrel.gov', icon: '☀️' },
      { name: 'US Department of Energy', contact: 'energy.gov',
        desc: 'Federal energy policy + research. Solar Futures Study, Wind Vision report.',
        url: 'https://www.energy.gov', icon: '⚡' },
      { name: 'EIA — US Energy Information Administration', contact: 'eia.gov',
        desc: 'Official US energy statistics. Generation by source, retail prices, monthly outlooks.',
        url: 'https://www.eia.gov', icon: '📊' },
      { name: 'IRENA — International Renewable Energy Agency', contact: 'irena.org',
        desc: 'Global renewables stats, technology cost trends, country profiles.',
        url: 'https://www.irena.org', icon: '🌐' },
      { name: 'IEA — International Energy Agency', contact: 'iea.org',
        desc: 'World Energy Outlook, Renewables annual report, real-time tracker.',
        url: 'https://www.iea.org', icon: '🌎' }
    ],
    sourceSpecific: [
      { name: 'BOEM — Bureau of Ocean Energy Management', contact: 'boem.gov',
        desc: 'Offshore wind leasing. Gulf of Maine planning area covers 13.7 million acres.',
        url: 'https://www.boem.gov', icon: '🌊' },
      { name: 'AWEA / ACP — American Clean Power', contact: 'cleanpower.org',
        desc: 'US wind + solar industry data. Project map, capacity by state.',
        url: 'https://cleanpower.org', icon: '🌬️' },
      { name: 'Geothermal Rising', contact: 'geothermal.org',
        desc: 'US geothermal industry association. Plant directory, GSHP guides.',
        url: 'https://www.geothermal.org', icon: '🌋' },
      { name: 'Hydropower.org — IHA', contact: 'hydropower.org',
        desc: 'International Hydropower Association. Global hydro + pumped-storage stats.',
        url: 'https://www.hydropower.org', icon: '🌊' },
      { name: 'Tethys (PNNL)', contact: 'tethys.pnnl.gov',
        desc: 'Marine energy environmental science clearinghouse. Wave + tidal projects.',
        url: 'https://tethys.pnnl.gov', icon: '🌊' },
      { name: 'EESI — Environmental & Energy Study Institute', contact: 'eesi.org',
        desc: 'Plain-English explainers on biogas, biomass, hydrogen.',
        url: 'https://www.eesi.org', icon: '🌱' }
    ],
    maine: [
      { name: 'Maine Governor’s Energy Office', contact: 'maine.gov/energy',
        desc: 'State energy plan, offshore wind roadmap, heat-pump rebates.',
        url: 'https://www.maine.gov/energy', icon: '🌲' },
      { name: 'Efficiency Maine', contact: 'efficiencymaine.com',
        desc: 'Rebates for heat pumps, solar, EVs, weatherization. Maine’s ratepayer-funded efficiency utility.',
        url: 'https://www.efficiencymaine.com', icon: '🌲' },
      { name: 'University of Maine Composites Center', contact: 'composites.umaine.edu',
        desc: 'Floating offshore wind research. Built VolturnUS, the first US floating wind turbine.',
        url: 'https://composites.umaine.edu', icon: '🌊' },
      { name: 'ORPC (Ocean Renewable Power Co.)', contact: 'orpc.co',
        desc: 'Eastport, ME tidal energy pioneer. RivGen / TidGen turbine projects.',
        url: 'https://www.orpc.co', icon: '🌊' }
    ],
    classroom: [
      { name: 'NEED Project (National Energy Education Development)', contact: 'need.org',
        desc: 'Free K-12 energy curriculum, hands-on kits, teacher PD.',
        url: 'https://www.need.org', icon: '📚' },
      { name: 'KidWind', contact: 'kidwind.org',
        desc: 'Build-it-yourself wind turbine + solar kits for classrooms. Annual KidWind Challenge competition.',
        url: 'https://www.kidwind.org', icon: '🔧' },
      { name: 'PBS LearningMedia — Energy', contact: 'pbslearningmedia.org',
        desc: 'Free standards-aligned video + lesson collection on energy sources.',
        url: 'https://www.pbslearningmedia.org', icon: '🎬' }
    ]
  };

  // Maine-specific reality (mirrors the firstresponse MAINE_EMS pattern).
  var MAINE_RENEWABLES = {
    offshore: 'The Gulf of Maine has some of the strongest, steadiest offshore winds in the US. Water is too deep for fixed-bottom turbines, so Maine pioneered floating turbines (UMaine’s VolturnUS, deployed 2013). BOEM’s 2024 lease area covers 13.7M acres.',
    tidal: 'Eastport / Cobscook Bay has the largest tides in the Lower 48 (~6 m / 20 ft range). Ocean Renewable Power Co. tested the TidGen turbine here — the first grid-connected tidal generator in US waters.',
    hydro: 'Maine has ~104 hydroelectric dams, the most per capita of any US state. Most are small (<10 MW). Many are 100+ years old, originally built for paper mills.',
    heatPumps: 'Maine leads the US in heat-pump adoption per capita. 100,000+ ground-source + air-source units installed since 2019, driven by Efficiency Maine rebates + heating-oil prices.',
    solar: 'Despite winters, Maine produces solar competitively — cold + sun = high panel efficiency. Net-metering policy debates have been intense; check current rules at the PUC.',
    biomass: 'Maine’s wood-pellet + cordwood heating tradition is one of the densest in the US. Several biomass power plants run on logging residues, though some have closed as utility-scale solar undercut them.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: SOURCE-SPECIFIC FACT BANKS
  // Each renewable has a card stack with the science + a sim/quiz prompt.
  // Numbers verified against NREL ATB 2024 + IEA 2024 unless noted.
  // ─────────────────────────────────────────────────────────

  // Per-source quick-reference card (used at top of each module view).
  var SOURCE_CARDS = {
    solarPv: {
      icon: '☀️', name: 'Solar PV', principle: 'The photovoltaic effect',
      oneLiner: 'Photons knock electrons loose in a silicon semiconductor; the electrons flow as DC current through an external circuit.',
      capacityFactor: '15–27% (varies by latitude + tracking)',
      lcoe: '$28–41 / MWh utility-scale (NREL ATB 2024)',
      growth: 'Global solar capacity doubled every ~3 years through the 2020s. Now the cheapest electricity ever produced.'
    },
    wind: {
      icon: '🌬️', name: 'Wind', principle: 'Betz’s law + cube-of-wind-speed',
      oneLiner: 'Spinning blades convert kinetic energy of moving air into rotational shaft power, driving a generator. Theoretical max efficiency: 59.3% (Betz limit).',
      capacityFactor: '35–45% onshore, 45–55% offshore',
      lcoe: '$24–75 / MWh land-based (NREL ATB 2024)',
      growth: 'Land-based wind is the cheapest form of new bulk electricity in most US states. Offshore is scaling fast.'
    },
    hydro: {
      icon: '🌊', name: 'Hydropower', principle: 'P = ρ·g·h·Q·η',
      oneLiner: 'Falling water spins a turbine. Power scales linearly with HEAD (vertical drop) and FLOW (volume per second). Efficiency η typically 0.85–0.95.',
      capacityFactor: '35–60% (varies wildly by season + dam type)',
      lcoe: '$50–150 / MWh (existing dams: $5–20 / MWh)',
      growth: 'Largest single source of renewable electricity worldwide (~16% of global supply, IEA 2024). Most US sites already developed.'
    },
    geothermal: {
      icon: '🌋', name: 'Geothermal', principle: 'Earth’s thermal gradient',
      oneLiner: 'Heat from radioactive decay + planetary cooling raises rock temperature ~25–30°C per km of depth. Drill deep enough to reach steam or hot water; pipe it to a turbine. Or use the constant ~10°C shallow ground temp for home heating/cooling (GSHP).',
      capacityFactor: '70–95% (highest of any electricity source)',
      lcoe: '$60–110 / MWh utility-scale geothermal',
      growth: 'Underused. Enhanced Geothermal Systems (EGS) could unlock terawatts. Heat-pump (GSHP) market is growing fast.'
    },
    solarThermal: {
      icon: '🔆', name: 'Solar Thermal (CSP)', principle: 'Concentrated heat → steam → turbine',
      oneLiner: 'Mirrors focus sunlight onto a fluid (oil or molten salt). The hot fluid boils water; steam spins a conventional turbine. Molten-salt storage lets a CSP plant run for 6–10 hours after sunset.',
      capacityFactor: '25–55% (with storage)',
      lcoe: '$75–130 / MWh (more expensive than PV, but storage included)',
      growth: 'Niche — PV got cheaper faster. CSP’s edge is built-in thermal storage, useful in deserts (Spain, Morocco, US Southwest).'
    },
    waveTidal: {
      icon: '🌀', name: 'Wave & Tidal', principle: 'Marine kinetic + potential energy',
      oneLiner: 'Wave: bobbing buoys / oscillating water columns capture surface motion. Tidal stream: underwater turbines spin in tidal currents. Tidal barrage: dam an estuary, run hydro both ways. Predictable to the minute, decades ahead.',
      capacityFactor: '20–45% (highly site-specific)',
      lcoe: '$130–280 / MWh (early tech, expected to fall)',
      growth: 'Pre-commercial. UK / France / Canada / Maine leading R&D. Eastport, ME hosts the first US grid-connected tidal generator.'
    },
    biomass: {
      icon: '🌾', name: 'Biomass & Biogas', principle: 'Combustion or anaerobic digestion',
      oneLiner: 'Burn wood / pellets / crop residue (combustion) OR let bacteria break down food/manure waste with no oxygen, producing methane (anaerobic digestion). Both yield heat + electricity. Counts as renewable IF feedstock regrows on a similar timescale.',
      capacityFactor: '70–85% (dispatchable like a fossil plant)',
      lcoe: '$60–140 / MWh',
      growth: 'Niche, controversial. Competes with food + forests. Anaerobic digestion of waste streams (dairy, food scraps) is the strongest case.'
    },
    storage: {
      icon: '🔋', name: 'Storage (the answer to intermittency)', principle: 'Move energy across time',
      oneLiner: 'Sun and wind don’t run on demand — storage shifts surplus midday solar or windy-night wind to evening peak. Lithium-ion dominates new builds. Pumped hydro is 95% of installed storage globally.',
      capacityFactor: 'N/A — measured in round-trip efficiency (see Storage view)',
      lcoe: 'Adds $20–80 / MWh to paired generation (battery, 2024)',
      growth: 'Battery prices fell ~90% in the 2010s. Grid-scale battery deployments doubled annually 2020–2024.'
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 3: FORMULA DESCRIPTIONS (used by sim panels)
  // ─────────────────────────────────────────────────────────

  // Wind: P = 0.5 * ρ * A * v³ * Cp where Cp ≤ 0.593 (Betz)
  // ρ (rho) = 1.225 kg/m³ sea-level air density
  // A = swept area = π r² (m²)
  // v = wind speed (m/s)
  // Cp = power coefficient (real turbines ~0.35–0.45)
  function windPowerWatts(v_ms, rotorRadius_m, Cp) {
    var rho = 1.225;
    var A = Math.PI * rotorRadius_m * rotorRadius_m;
    return 0.5 * rho * A * Math.pow(v_ms, 3) * Cp;
  }

  // Solar PV: power = irradiance * area * efficiency * cos(tilt error from sun)
  // irradiance: peak ~1000 W/m² at midday equinox, latitude-corrected
  function solarPvWatts(irradiance_Wm2, panelArea_m2, eff, tiltErrorDeg) {
    var cosLoss = Math.cos((Math.abs(tiltErrorDeg) * Math.PI) / 180);
    if (cosLoss < 0) cosLoss = 0;
    return irradiance_Wm2 * panelArea_m2 * eff * cosLoss;
  }

  // Hydro: P = ρ * g * h * Q * η
  // ρ = 1000 kg/m³ water density
  // g = 9.81 m/s²
  // h = head (m), Q = flow (m³/s), η = efficiency (~0.9)
  function hydroPowerWatts(head_m, flow_m3s, eff) {
    var rho = 1000;
    var g = 9.81;
    return rho * g * head_m * flow_m3s * eff;
  }

  // Geothermal gradient: temp at depth d (km) = surface_temp + gradient * d
  // gradient typical 25–30 °C/km, hot zones 60–80, hot spots (Iceland) 200+
  function geoTempAtDepth_C(surfaceC, gradient_CkmDepth, depth_km) {
    return surfaceC + gradient_CkmDepth * depth_km;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 4: QUIZ BANK — 10 questions across all sources
  // ─────────────────────────────────────────────────────────
  var QUIZ = [
    { id: 'q1', icon: '☀️',
      stem: 'A solar panel works because of the photovoltaic effect. What does sunlight knock loose to create electric current?',
      choices: ['Protons inside the nucleus of each silicon atom', 'Electrons in the silicon’s outer shell', 'Helium atoms inside the panel', 'Photons from the cell itself'],
      correct: 1, why: 'Photons hit silicon atoms and give energy to outer-shell electrons. The freed electrons flow through an external circuit — that flow is the electric current.' },
    { id: 'q2', icon: '🌬️',
      stem: 'A wind turbine’s power output is proportional to wind speed CUBED (v³). If wind speed doubles from 5 m/s to 10 m/s, the power output multiplies by approximately:',
      choices: ['2×', '4×', '8×', '16×'],
      correct: 2, why: '2³ = 8. That’s why turbine sites are picked obsessively for wind speed — a small increase in average wind makes a huge difference in lifetime energy output.' },
    { id: 'q3', icon: '🌬️',
      stem: 'The Betz limit says no wind turbine can extract more than ~59.3% of the kinetic energy in the wind passing through its rotor. Why is this not just an engineering problem we could solve with better blades?',
      choices: ['It’s a manufacturing limit — carbon fiber blades simply cannot be made stiff enough to survive spinning any faster', 'It’s a physics limit — if you extracted 100%, the air behind the rotor would have zero velocity and pile up', 'It’s a financial limit — utilities cap how much wind power they will purchase from any one site', 'It’s a noise limit — aviation regulators cap how fast the rotor tips are allowed to move'],
      correct: 1, why: 'If a turbine took ALL the air’s energy, the air would stop dead behind the blades and no more air could flow through. Real turbines hit ~35–45% efficiency — close to but below Betz.' },
    { id: 'q4', icon: '🌊',
      stem: 'A hydroelectric plant’s power output depends on HEAD (the vertical drop) and FLOW (volume of water per second). If you double the head AND keep the same flow, the power output:',
      choices: ['Stays the same', 'Doubles', 'Quadruples', 'Falls in half'],
      correct: 1, why: 'P = ρ·g·h·Q·η — head and flow each appear once (linear). Double either one and you double the power.' },
    { id: 'q5', icon: '🌊',
      stem: 'You’re designing a small hydro plant for a high mountain stream with very little water but a 200 m drop. Which turbine type is best?',
      choices: ['Pelton (high head, low flow)', 'Francis (medium head, medium flow)', 'Kaplan (low head, high flow)', 'A wind turbine'],
      correct: 0, why: 'Pelton wheels use buckets struck by jets of high-velocity water — perfect for tall drops and small streams. Francis is the all-rounder; Kaplan is for big rivers with little drop.' },
    { id: 'q6', icon: '🌋',
      stem: 'The Earth’s temperature increases roughly 25–30°C for every kilometer you drill down. To reach 200°C (suitable for a flash-steam geothermal plant) starting from a 10°C surface, you’d need to drill approximately:',
      choices: ['~600 m (0.6 km)', '~3 km', '~6.3 km', '~30 km'],
      correct: 2, why: '(200 − 10) / 30 ≈ 6.3 km. That’s deeper than most oil wells — which is why utility-scale geothermal usually targets natural hot zones (volcanic regions like Iceland, Italy, the Western US) where the gradient is much steeper.' },
    { id: 'q7', icon: '🌋',
      stem: 'A ground-source heat pump (GSHP) for a Maine home does NOT generate electricity — it MOVES heat. In winter, where does the heat come from?',
      choices: ['It is created inside the heat pump itself by resistance heating from electricity', 'It is pulled from the ~10°C ground 1–2 m below the surface and concentrated', 'It is pulled from sunlight hitting the panels', 'It is recycled from the home’s exhaust air'],
      correct: 1, why: 'Below the frost line the soil stays a near-constant ~10°C year-round. A GSHP uses electricity to RUN a refrigeration cycle that concentrates that ground heat into your house. For each unit of electricity in, you typically get 3–5 units of heat out (COP 3–5).' },
    { id: 'q8', icon: '🔆',
      stem: 'Concentrated Solar Power (CSP) plants have one major advantage over photovoltaic (PV) panels for utility-scale generation. What is it?',
      choices: ['CSP generates at night even without any storage attached', 'CSP can store the captured heat in molten salt for 6–10 hours', 'CSP produces cheaper electricity per MWh than photovoltaics', 'CSP keeps working under full cloud cover, with no direct sunlight'],
      correct: 1, why: 'PV converts photons → electrons instantly; you can’t store electrons cheaply. CSP heats molten salt to 565°C, then runs the steam turbine on stored heat for hours after sunset — effectively built-in storage.' },
    { id: 'q9', icon: '🌊',
      stem: 'Tidal energy has one big advantage over wind and solar that critics often overlook. What is it?',
      choices: ['Tides deliver more total power than wind and solar combined', 'Tides are predictable decades in advance from astronomy', 'Tidal turbines are cheaper to build', 'Tides work in shallow water everywhere'],
      correct: 1, why: 'Tides are driven by the Moon’s and Sun’s gravity — we can predict them to the minute, years out. That predictability is enormously valuable for grid operators trying to plan around weather-dependent solar and wind.' },
    { id: 'q10', icon: '🔋',
      stem: 'Pumped hydro storage works by pumping water UP to a high reservoir when electricity is cheap (excess solar/wind) and letting it flow DOWN through a turbine when electricity is expensive (evening peak). What round-trip efficiency does it typically achieve?',
      choices: ['~30%', '~50%', '~75–85%', '~95–99%'],
      correct: 2, why: 'Pumped hydro recovers about 75–85% of the electricity used to pump water up. It’s old tech (1890s) and still ~95% of the world’s installed grid storage — batteries are catching up fast but pumped hydro dwarfs them in total MWh stored.' },
    { id: 'q11', icon: '🌐',
      stem: 'The North American grid operates near a nominal 60 Hz. If demand suddenly spikes and generation lags, what initially happens to grid frequency?',
      choices: ['It stays at 60 Hz — the grid auto-corrects instantly', 'It drops below 60 Hz', 'It rises above 60 Hz', 'It oscillates between 50 and 70 Hz'],
      correct: 1, why: 'When demand exceeds supply, synchronized rotating machines initially slow and frequency tends to drop. Controls, reserves, storage, and sometimes load shedding respond on different timescales.' },
    { id: 'q12', icon: '🦆',
      stem: 'In a high-solar grid like California\'s, the daytime "net load" curve looks like a duck — solar floods the grid mid-day, then drops out at sunset just as demand peaks. What is this called and what fixes it?',
      choices: ['The "swan song" — fixed by more nuclear', 'The "duck curve" — fixed by storage, demand response, and load-shifting', 'The "death spiral" — fixed by removing solar', 'The "sunset wall" — fixed by building far more long-distance transmission'],
      correct: 1, why: 'The "duck curve" is the textbook bug of solar-heavy grids. Solutions: batteries charged at noon and discharged at evening, demand response, and shifting loads (EV charging, heat-pump pre-heating) into the solar belly.' },
    { id: 'q13', icon: '💨',
      stem: 'Roughly 95% of hydrogen produced in the world today is "gray." What does that mean?',
      choices: ['Made by electrolysis powered by coal', 'Made from natural gas with NO carbon capture', 'A new color code for unverified hydrogen sources', 'Hydrogen mixed with sulfur impurities'],
      correct: 1, why: 'Gray hydrogen comes from steam methane reforming of natural gas with no CCS, releasing ~9–11 kg of CO₂ for every kg of H₂. The "hydrogen economy" pitch usually means switching to GREEN hydrogen, which today is a small fraction of supply.' },
    { id: 'q14', icon: '🏠',
      stem: 'A modern cold-climate air-source heat pump in Maine can hit a COP of 3 even at −15°C. What does COP 3 mean?',
      choices: ['The heat pump is 3 times louder than the older models it replaces', 'For every 1 unit of electricity, the heat pump MOVES 3 units of heat into your home', 'On the coldest days, the compressor has to spin 3 times faster to keep up with heating demand', 'The unit costs 3 times the price of a comparable gas furnace'],
      correct: 1, why: 'COP (Coefficient of Performance) = heat moved ÷ electricity used. A COP of 3 means 300% efficient compared to electric resistance heat. The trick: you\'re NOT making heat from electricity, you\'re moving heat from outside (or the ground) into the house.' },
    { id: 'q15', icon: '⚖️',
      stem: 'The US average household spends about 3% of income on energy. What is the average for low-income households (≤200% of the federal poverty line)?',
      choices: ['1.5% — they use less so it costs less', '3% — same as everyone', '8.6% — almost 3× the national average', '15% — almost the entire monthly budget'],
      correct: 2, why: '"Energy burden" is the % of income spent on energy. Low-income households average 8.6%; the highest-burden households spend 30%+. They typically live in older, leakier housing with electric resistance heat. Weatherization + heat pumps cut this faster than any other intervention.' },
    { id: 'q16', icon: '🌬️',
      stem: 'Why are offshore wind turbines so much bigger than land-based ones?',
      choices: ['Saltwater spray makes blades less efficient as they age, so offshore designs need far more swept area to deliver the same electricity as an identical turbine on land', 'Offshore wind is steadier + stronger, and transport / installation costs are dominated by the boat — so making bigger turbines spreads that cost over more MW', 'Offshore turbines need to be tall enough to be visible to ships', 'Bigger blades reduce noise pollution underwater'],
      correct: 1, why: 'Once you\'ve paid for the specialized installation vessel and the seabed work, doubling turbine size barely doubles cost but does double output. So offshore turbines are massive (12–18 MW each, blades 100m+).' },
    { id: 'q17', icon: '🧰',
      stem: 'Wind turbine technician was projected by the Bureau of Labor Statistics 2022–2032 outlook as one of the fastest-growing US occupations. What\'s the typical training pathway?',
      choices: ['A 4-year university degree in electrical engineering with a professional license', '2-year technical college program OR military electronics + on-the-job training', 'A PhD in fluid dynamics or aerospace engineering', 'High school diploma — no further training needed'],
      correct: 1, why: 'A 2-year program at a technical college (or equivalent military training) is the typical entry point. Median pay $61K. Must be willing to climb 80–120m and work in weather. Many programs in TX, IA, and increasingly the Northeast.' },
    { id: 'q18', icon: '🔆',
      stem: 'A Concentrated Solar Power (CSP) tower can run for 6–10 hours after sunset on stored heat. How is that heat stored?',
      choices: ['In giant banks of lithium-ion batteries', 'In a tank of molten salt at ~565°C', 'In compressed air underground', 'In a large reservoir of hot water'],
      correct: 1, why: 'CSP\'s edge over photovoltaic (PV) panels is that the working fluid (molten salt) IS the storage. Insulated tanks hold the salt at 565°C; flowing it through a heat exchanger when needed makes steam to spin the same turbine that runs during daytime. Heat is much cheaper to store than electrons.' }
  ];

  // The authored bank put 72% of correct answers in slot 2 (measured
  // 1/13/4/0) — passable by position. Rotate each question ONCE here: the
  // quiz re-reads QUIZ[qIdx] on every render, so a random shuffle would
  // deal new options mid-question. Grading is by index (i === q.correct)
  // and the printable answer key reads choices[correct] with a recomputed
  // letter, so `correct` is remapped with the choices; `why` is one string.
  (function () {
    for (var qi = 0; qi < QUIZ.length; qi++) {
      var q = QUIZ[qi];
      if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || typeof q.correct !== 'number') continue;
      var n = q.choices.length;
      var shift = ((qi * 7) + 3) % n;
      if (shift === 0) continue;
      var moved = new Array(n);
      for (var i = 0; i < n; i++) moved[(i + shift) % n] = q.choices[i];
      q.choices = moved;
      q.correct = (q.correct + shift) % n;
    }
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION 5: TURBINE / PLANT TYPE DICTIONARIES
  // ─────────────────────────────────────────────────────────

  var HYDRO_TURBINES = [
    { id: 'pelton', name: 'Pelton wheel', icon: '⛲',
      head: 'High (50–1800 m)', flow: 'Low',
      how: 'Free-spinning wheel with cup-shaped buckets. High-velocity water JET strikes the buckets, transferring momentum.',
      use: 'Mountain streams, alpine valleys. Famous installs: Bieudron (Switzerland) at 1869 m head.',
      eff: '~90–93%' },
    { id: 'francis', name: 'Francis turbine', icon: '🌀',
      head: 'Medium (10–350 m)', flow: 'Medium–high',
      how: 'Water enters radially, exits axially through a spiral casing. Most common turbine type worldwide.',
      use: 'Workhorse of large dams: Hoover Dam, Three Gorges, Itaipú.',
      eff: '~90–95%' },
    { id: 'kaplan', name: 'Kaplan turbine', icon: '🌪️',
      head: 'Low (1.5–20 m)', flow: 'Very high',
      how: 'Looks like a propeller. Adjustable blade pitch lets it stay efficient as river flow varies.',
      use: 'Large slow rivers and run-of-river plants.',
      eff: '~90–93%' }
  ];

  var GEO_PLANT_TYPES = [
    { id: 'drySteam', name: 'Dry steam', icon: '💨',
      tempReq: '≥ 235°C natural steam',
      how: 'Pure steam comes up the well, drives a turbine directly. Simplest design.',
      where: 'The Geysers (California) — the world’s largest geothermal complex; Larderello (Italy, 1904, the first ever).' },
    { id: 'flash', name: 'Flash steam', icon: '💧',
      tempReq: '≥ 180°C high-pressure hot water',
      how: 'High-pressure hot water is sprayed into a low-pressure tank — most of it instantly “flashes” to steam.',
      where: 'Most utility geothermal plants worldwide. Iceland (Krafla, Hellisheidi); Philippines, Kenya, US.' },
    { id: 'binary', name: 'Binary cycle', icon: '♻️',
      tempReq: '57–182°C moderate hot water',
      how: 'Hot water heats a SECOND fluid (isobutane or pentane) with a lower boiling point. The secondary fluid vaporizes and drives the turbine.',
      where: 'Best for moderate-temperature resources. Most new geothermal plants are binary.' },
    { id: 'gshp', name: 'Ground-source heat pump (GSHP)', icon: '🏠',
      tempReq: '~10°C constant ground temp',
      how: 'NOT electricity generation — a refrigeration cycle that MOVES heat between the constant-temperature ground and your house. COP 3–5 (3–5× more heat out than electricity in).',
      where: 'Maine leads the US in heat-pump adoption. Efficiency Maine offers rebates up to $8,000.' }
  ];

  var STORAGE_TYPES = [
    { id: 'liion', name: 'Lithium-ion battery', icon: '🔋',
      duration: '1–6 hours typical', rte: '85–95% round-trip',
      how: 'Lithium ions shuttle between graphite anode and metal-oxide cathode through a liquid electrolyte. Same chemistry as your phone, scaled up.',
      pros: 'Fast response, modular, dropping cost (~$140/kWh in 2024 vs $1100/kWh in 2010).',
      cons: 'Short duration (hours, not days). Mining lithium + cobalt has labor + ecological costs.' },
    { id: 'flow', name: 'Vanadium flow battery', icon: '🛢️',
      duration: '4–12+ hours', rte: '70–80% round-trip',
      how: 'Two tanks of liquid electrolyte (different vanadium oxidation states) pumped past a membrane. Energy capacity = tank size; power = membrane area — they scale independently.',
      pros: '20+ year lifespan, no degradation from cycling, non-flammable.',
      cons: 'Lower energy density than Li-ion (bigger footprint). Higher upfront cost.' },
    { id: 'pumpedHydro', name: 'Pumped hydro storage', icon: '⛰️',
      duration: '4–100+ hours', rte: '75–85% round-trip',
      how: 'Pump water UP to a high reservoir when electricity is cheap, let it flow DOWN through a turbine when expensive. The reservoir IS the battery.',
      pros: '95% of world’s installed grid storage. 50–100 year asset life.',
      cons: 'Geographically limited (need two reservoirs at different elevations). Decade-long permitting.' },
    { id: 'hydrogen', name: 'Green hydrogen', icon: '⚛️',
      duration: 'Days to seasons', rte: '30–40% round-trip',
      how: 'Use surplus renewable electricity to electrolyze water (H₂O → H₂ + ½ O₂). Store H₂ in tanks or salt caverns. Burn it in a turbine, react in a fuel cell, or use it as industrial feedstock (steel, fertilizer).',
      pros: 'Only economic option for week+ storage. Already used to decarbonize steel and ammonia.',
      cons: 'Low round-trip efficiency. Most current H₂ is “gray” (made from natural gas).' },
    { id: 'thermal', name: 'Thermal storage (molten salt)', icon: '🌡️',
      duration: '6–15 hours', rte: '~50% (heat → elec) but 95%+ (heat in / heat out)',
      how: 'Heat molten salt or stones to 500–600°C with surplus electricity or concentrated sunlight. Insulate. Run a steam cycle when needed.',
      pros: 'Cheap material (sodium nitrate). Long duration. Pairs perfectly with CSP.',
      cons: 'Needs insulation engineering. Limited to high-temperature applications.' }
  ];

  var WAVE_TIDAL_TECH = [
    { id: 'owc', name: 'Oscillating water column', icon: '🌊',
      family: 'Wave',
      how: 'A partly-submerged chamber traps a column of air above the rising and falling water surface. The trapped air pumps in and out through a turbine at the top.',
      where: 'Mutriku (Spain), LIMPET (Scotland — first commercial). Quiet and shore-based.' },
    { id: 'pointAbsorber', name: 'Point absorber buoy', icon: '🎊',
      family: 'Wave',
      how: 'A floating buoy bobs up and down with the waves; that motion drives a hydraulic pump or linear generator anchored to the seabed.',
      where: 'PowerBuoy (US), CorPower (Sweden). Compact and modular.' },
    { id: 'tidalStream', name: 'Tidal stream turbine', icon: '🌀',
      family: 'Tidal',
      how: 'Looks like an underwater wind turbine. Spins in tidal currents. Predictable to the minute from astronomy.',
      where: 'MeyGen (Scotland) — world’s largest tidal array. ORPC TidGen tested at Eastport, ME.' },
    { id: 'tidalBarrage', name: 'Tidal barrage', icon: '🌊',
      family: 'Tidal',
      how: 'A dam across a tidal estuary with low-head Kaplan-style turbines. Lets tide flow in and out through the turbines.',
      where: 'La Rance (France, 1966 — still operating). Massive ecological impact — not built much anymore.' }
  ];

  var BIO_PATHS = [
    { id: 'combust', name: 'Direct combustion', icon: '🔥',
      what: 'Wood, pellets, crop residue, or municipal solid waste burned to make steam → turbine → electricity. Same Rankine cycle as a coal plant, swapped fuel.',
      eff: '20–40% electrical (75–85% if heat is also used — combined heat and power)',
      caveat: 'Carbon-neutral ONLY if the feedstock regrows on a timescale similar to combustion. Burning old-growth forests is decidedly NOT carbon-neutral.' },
    { id: 'anaerobic', name: 'Anaerobic digestion (biogas)', icon: '💩',
      what: 'Bacteria break down food waste, manure, or sewage in an oxygen-free tank, producing biogas (~60% methane). Burn the methane in a generator or scrub it to pipeline-grade renewable natural gas.',
      eff: '25–40% electrical from generator; the leftover digestate is fertilizer.',
      caveat: 'BEST circular case: capturing methane that would otherwise leak from manure lagoons or landfills (methane is ~84× worse than CO₂ over 20 years).' },
    { id: 'gasification', name: 'Gasification', icon: '⚛️',
      what: 'Heat biomass to ~700–900°C with limited oxygen → produces syngas (CO + H₂). Syngas runs a turbine or is upgraded to liquid fuels.',
      eff: '40–55% electrical (combined cycle)',
      caveat: 'Higher efficiency than direct combustion. Still developing for biomass at commercial scale.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.5: COMPARISON TABLE — all sources, side by side
  // Numbers reconciled across NREL ATB 2024, IEA 2024, IRENA Costs 2024.
  // Land use figures: Hertwich 2015 + DOE Land-Use studies (m² per MWh annual).
  // Lifecycle gCO₂/kWh: IPCC AR6 WG3 Annex III median values.
  // Dispatchability: 0 (none) – 5 (fully dispatchable like a peaker plant).
  // ─────────────────────────────────────────────────────────
  var COMPARE_TABLE = [
    { id: 'solarPv',      icon: '☀️', name: 'Solar PV',       cf: '15–27%', lcoe: '$28–41', land: 'Med',     water: 'Very low', co2: '40 g',  dispatch: 1, intermittent: true },
    { id: 'wind',         icon: '🌬️', name: 'Wind',           cf: '35–55%', lcoe: '$24–75', land: 'High*',    water: 'Very low', co2: '11 g',  dispatch: 1, intermittent: true,
      note: '* Land BENEATH wind turbines is still farmable / grazable; only ~3% is permanently used. The footprint number includes setbacks.' },
    { id: 'hydro',        icon: '🌊', name: 'Hydro',          cf: '35–60%', lcoe: '$50–150', land: 'Very high', water: 'Very high', co2: '24 g', dispatch: 4, intermittent: false,
      note: 'Reservoirs flood land + alter rivers. Run-of-river plants have far smaller footprint. Tropical reservoirs can emit methane from rotting vegetation.' },
    { id: 'geothermal',   icon: '🌋', name: 'Geothermal',     cf: '70–95%', lcoe: '$60–110', land: 'Low',      water: 'Med',       co2: '38 g',  dispatch: 5, intermittent: false },
    { id: 'solarThermal', icon: '🔆', name: 'CSP (with storage)', cf: '25–55%', lcoe: '$75–130', land: 'High',     water: 'Med–high',  co2: '27 g',  dispatch: 4, intermittent: false },
    { id: 'waveTidal',    icon: '🌀', name: 'Wave / Tidal',   cf: '20–45%', lcoe: '$130–280', land: 'None',     water: 'N/A',       co2: '8 g',   dispatch: 3, intermittent: false,
      note: 'Tidal is predictable to the minute decades out; wave is variable but can be forecasted hours ahead.' },
    { id: 'biomass',      icon: '🌾', name: 'Biomass',        cf: '70–85%', lcoe: '$60–140', land: 'Very high', water: 'High',      co2: '230 g', dispatch: 5, intermittent: false,
      note: 'CO₂ value assumes sustainably-harvested feedstock. Old-growth combustion can hit 1000+ g/kWh.' },
    { id: 'nuclear',      icon: '⚛️', name: 'Nuclear (low-C, not renew.)', cf: '90–95%', lcoe: '$31–82 (existing) / $130–200 (new US)', land: 'Very low', water: 'Very high', co2: '12 g', dispatch: 5, intermittent: false,
      note: 'Included for honest comparison. Not renewable (uranium is finite) but very low-carbon and dispatchable. Waste + cost are real challenges.' },
    // Reference rows (NOT renewables — included so students can see the gap)
    { id: 'gas',          icon: '🔥', name: '(Reference) Natural gas', cf: '55–87%', lcoe: '$45–73', land: 'Low',  water: 'Med', co2: '490 g', dispatch: 5, intermittent: false, ref: true },
    { id: 'coal',         icon: '🏭', name: '(Reference) Coal',         cf: '40–80%', lcoe: '$65–152', land: 'Med', water: 'High', co2: '820 g', dispatch: 5, intermittent: false, ref: true }
  ];
  // Column legend (rendered alongside the table):
  //   cf = capacity factor; lcoe = unsubsidized $/MWh from NREL ATB 2024
  //   land = qualitative footprint per MWh annual generation
  //   water = lifecycle water consumption (Macknick 2012 + NREL)
  //   co2 = IPCC AR6 lifecycle median in grams CO2-equivalent per kWh
  //   dispatch = 0–5 ability to ramp up on demand (5 = fully dispatchable)

  // ─────────────────────────────────────────────────────────
  // SECTION 5.6: GLOSSARY — terms students see throughout
  // ─────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'kW vs kWh', def: 'kW is POWER (rate of energy use, like mph). kWh is ENERGY (total amount, like total miles driven). A 5 kW solar array running for 4 hours produces 20 kWh.' },
    { term: 'Capacity factor', def: 'Actual annual energy output divided by what the plant would produce if it ran at 100% rated power 24/7/365. Solar can\'t exceed ~25% in most US locations because of nighttime + weather.' },
    { term: 'LCOE (Levelized Cost of Energy)', def: 'The total lifetime cost of building and running a plant divided by the total energy it produces, expressed in $/MWh. The single best apples-to-apples cost comparison.' },
    { term: 'Dispatchable', def: 'A plant that can ramp output up or down on demand within minutes. Hydro, geothermal, biomass, gas, and nuclear are dispatchable. Solar and wind are NOT — they generate when the resource is available.' },
    { term: 'Baseload', def: 'Generation that runs steadily 24/7. Old framing. Modern grids care less about baseload and more about FLEXIBILITY + STORAGE.' },
    { term: 'Intermittent', def: 'A source that can\'t generate on demand because it depends on weather (solar, wind). Better word: "variable." Still useful — just needs storage or backup.' },
    { term: 'Curtailment', def: 'When a renewable plant is told to STOP producing because the grid can\'t use the surplus and storage is full. Common in California spring afternoons. A signal that more storage or transmission is needed.' },
    { term: 'Grid (transmission vs distribution)', def: 'Transmission = high-voltage long-distance lines (think highway). Distribution = the lower-voltage lines that deliver power to homes (think local roads).' },
    { term: 'AC vs DC', def: 'Solar panels and batteries produce DIRECT current (DC) — flows one way. The grid uses ALTERNATING current (AC) — switches direction 60 times per second. Inverters convert DC → AC.' },
    { term: 'Inverter', def: 'The box that converts DC from solar panels or batteries into AC for the grid. Often the first part of a solar system to fail (10–15 year lifespan vs 25+ for panels).' },
    { term: 'Net metering', def: 'A billing arrangement where home solar exports to the grid run your meter BACKWARDS. Rules vary by state and have been heavily contested in Maine.' },
    { term: 'Power Purchase Agreement (PPA)', def: 'A contract where a utility (or company) agrees to buy a project\'s output at a fixed price for 15–25 years. The financial backbone of utility-scale renewables.' },
    { term: 'Betz limit', def: 'The maximum 59.3% of wind kinetic energy that ANY rotor can extract. A physics limit, not engineering. Real turbines: 35–45%.' },
    { term: 'COP (Coefficient of Performance)', def: 'For heat pumps: heat moved per unit of electricity used. Maine ground-source units typically run COP 3–5 — 3 to 5 units of heat for every unit of electricity.' },
    { term: 'Round-trip efficiency', def: 'For storage: energy you get OUT divided by energy you put IN. Li-ion: 85–95%. Pumped hydro: 75–85%. Green hydrogen: 30–40%.' },
    { term: 'Behind-the-meter', def: 'Generation or storage on the customer side of the utility meter (your rooftop solar, your home battery). The utility doesn\'t see the kWh — only the net.' },
    { term: 'Frequency regulation', def: 'Rapid adjustments that keep grid frequency close to its nominal value. Batteries can respond quickly, alongside other controls and resources.' },
    { term: 'Cost-per-kWh-stored', def: 'For batteries: $/kWh of capacity. Li-ion fell from ~$1100/kWh (2010) to ~$140/kWh (2024) — driving the storage boom.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.7: COMMON MYTHS — corrected with sources
  // ─────────────────────────────────────────────────────────
  var MYTHS = [
    { myth: '"Solar panels don\'t work in winter / cold climates."',
      truth: 'Cold improves PV efficiency (semiconductors lose voltage as they heat up). Maine\'s winter sun is weaker (low angle, short days), but the cold is a BENEFIT. Snow that slides off bifacial panels can even reflect extra light. Germany — at Maine\'s latitude — leads Europe in solar production.',
      source: 'NREL Solar Resource Assessment' },
    { myth: '"Wind turbines kill more birds than fossil fuels."',
      truth: 'US Fish & Wildlife estimates wind turbines kill ~500K birds/yr. Cats kill ~2.4 BILLION. Buildings kill ~600M. Power lines (existing infrastructure for ALL energy) kill ~25M. Fossil fuel air pollution + climate change kill far more birds in aggregate. Wind is bad for individual raptors near siting errors, addressable by careful site selection + radar deterrents.',
      source: 'USFWS + Smithsonian Migratory Bird Center 2014' },
    { myth: '"Renewables are too expensive."',
      truth: 'Out of date. Onshore wind ($24–75/MWh) and utility solar ($28–41/MWh) are now the CHEAPEST forms of new bulk electricity in most US states — cheaper than natural gas ($45–73/MWh) and far cheaper than new coal or nuclear. The challenge has shifted from cost to grid integration + storage.',
      source: 'NREL Annual Technology Baseline 2024' },
    { myth: '"You need 100% storage to go 100% renewable."',
      truth: 'Modeling studies (Princeton Net-Zero America, NREL Solar Futures, IEA Net-Zero) suggest 4–8 hours of battery storage covers ~80–90% of the variability problem. Long-duration storage (pumped hydro + hydrogen) handles the rest. Geographic diversity (transmission across time zones) further reduces storage needs.',
      source: 'NREL Solar Futures Study 2021' },
    { myth: '"Manufacturing solar panels emits more CO₂ than the panels save."',
      truth: 'Energy payback time for modern PV is 1–2 years; lifetime is 25–30 years. So a panel produces 12–25× the energy used to make it. Lifecycle CO₂ is ~40 g/kWh — vs ~820 g/kWh for coal. Studies that claim otherwise are typically using 1990s data.',
      source: 'IEA PVPS Task 12 + Fthenakis 2021' },
    { myth: '"Hydro is always carbon-free."',
      truth: 'Operationally, yes — water moving through a turbine emits nothing. But TROPICAL reservoirs (Brazil, Southeast Asia) flooded over rainforest can emit methane for decades from decomposing biomass. Temperate-climate reservoirs (Maine, Norway) are very low-carbon — IPCC median 24 g/kWh. Run-of-river plants with no reservoir are even lower.',
      source: 'IPCC AR6 WG3 + Deemer 2016' },
    { myth: '"We can\'t electrify everything — the grid couldn\'t handle it."',
      truth: 'NREL\'s 2018 Electrification Futures Study modeled it: full electrification of vehicles + heat would roughly DOUBLE US electricity demand by 2050. That sounds huge, but the grid grew 4× from 1950 to 2000. The challenge is transmission siting + permitting, not generation capacity.',
      source: 'NREL Electrification Futures Study 2018' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.8: NUCLEAR — included for honest comparison
  // Not renewable (uranium is finite) but is low-carbon + dispatchable.
  // Many student questions about clean-energy futures involve nuclear.
  // ─────────────────────────────────────────────────────────
  var NUCLEAR_BASICS = {
    icon: '⚛️',
    principle: 'Controlled fission of U-235 / Pu-239',
    oneLiner: 'Heavy uranium nuclei split when struck by a neutron, releasing energy + 2-3 more neutrons that split more nuclei (chain reaction). The heat boils water → steam → turbine. Same Rankine cycle as coal, swapped fuel.',
    capacityFactor: '90–95% (highest of any large-scale source)',
    lcoe: '$31–82 / MWh (existing US fleet, paid-off), $130–200+ / MWh (new US builds)',
    co2: '~12 g CO₂ / kWh lifecycle (IPCC AR6 median)',
    why: 'Included here because (a) every honest "clean energy" conversation includes it; (b) it complements renewables — dispatchable + low-carbon + small footprint; (c) students ask, and a renewables tool that ignores nuclear is incomplete.',
    pros: [
      'Lowest-carbon dispatchable source.',
      'Tiny land footprint (1000 MW plant ≈ 1–4 km²).',
      '90%+ capacity factor — highest of any source.',
      'Fuel is energy-dense (1 kg uranium ≈ 3 million kg coal in energy content).'
    ],
    cons: [
      'New US builds are extraordinarily expensive ($10–15B per GW, decade-long construction).',
      'Long-lived radioactive waste with no permanent US disposal site (interim storage at every plant).',
      'Catastrophic-but-rare accident risk (Chernobyl, Fukushima — both addressable by modern designs but still public-trust issues).',
      'Uranium mining + enrichment have water + community impacts (often on Indigenous lands).'
    ],
    designs: [
      { name: 'PWR (Pressurized Water Reactor)', what: 'The dominant design — water pressurized to 150 atm so it stays liquid at 320°C. ~65% of world reactors.' },
      { name: 'BWR (Boiling Water Reactor)', what: 'Water boils directly inside the reactor vessel. Simpler but radioactive steam runs the turbine. Fukushima units were BWRs.' },
      { name: 'SMR (Small Modular Reactor)', what: 'Factory-built units of 50–300 MW. NuScale received first US design certification 2023. Promise: lower upfront cost + faster build. None operating commercially yet in the US.' },
      { name: 'Gen-IV (sodium-cooled, molten-salt, etc.)', what: 'Demonstration phase. Promise inherent safety + fuel-cycle efficiency + ability to consume existing nuclear waste. TerraPower, X-energy, Kairos prototypes underway.' }
    ],
    fusion: 'Nuclear FUSION (combining light nuclei, like the Sun does) is fundamentally different — no long-lived waste, no meltdown risk, fuel from seawater. Net-energy gain demonstrated at NIF (Lawrence Livermore) in Dec 2022. Commercial deployment: 2040s+ optimistic; later more likely. Worth tracking, not yet on the planning horizon.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 5.9: AI PRACTICE SCENARIOS + GROUND-TRUTH RUBRICS
  // Six "design an electricity system for X" scenarios. Each has:
  //  - prompt: what the student is solving for
  //  - rubric: the criteria a sound design hits (used by AI critique + local fallback)
  //  - hint: a teacher-style nudge
  // Ground-truth list is used to constrain AI critiques (no hallucinated facts).
  // ─────────────────────────────────────────────────────────
  var AI_SCENARIOS = [
    { id: 'mainecabin', icon: '🌲',
      title: 'Off-grid Maine cabin in winter',
      prompt: 'A family wants a year-round off-grid cabin in northern Maine. Design their electricity system. They use ~10 kWh/day in summer, ~25 kWh/day in winter (heating + lights). Mid-winter has only ~3–4 hours of useful sunlight. They have a small stream nearby (~0.1 m³/s flow, 5 m drop) and a windy ridge.',
      rubric: [
        'Acknowledges seasonal mismatch — winter demand is highest exactly when solar is weakest',
        'Uses MULTIPLE sources (not all-solar) — likely solar + wind + small hydro',
        'Includes battery storage sized for multi-day cloudy stretches (≥3 days autonomy)',
        'Addresses backup heat / generator for extended dead-calm + overcast',
        'Mentions ground-source heat pump or wood backup to slash electric heating load'
      ],
      hint: 'Solar alone fails in mid-winter Maine — clouds + short days. Real off-grid Maine homes pair solar with wind or microhydro and significant battery storage, plus a fuel backup.' },
    { id: 'school', icon: '🏫',
      title: 'School cafeteria carbon-neutral target',
      prompt: 'A 700-student middle school in Portland, ME wants its cafeteria to be carbon-neutral by 2030. The cafeteria uses ~400 kWh/day for refrigeration, ovens, lighting, dishwashing. The school has a flat 1,200 m² roof and ~50 tons/year of food waste. Design a plan.',
      rubric: [
        'Sizes rooftop solar reasonably (1200 m² × 20% × ~1300 kWh/m²/yr ≈ 312 MWh/yr — ~2× cafeteria load)',
        'Considers an on-site battery to reduce afternoon-peak grid import',
        'Mentions anaerobic digestion of food waste (50 tons/yr → ~3 MWh of biogas + fertilizer)',
        'Addresses cooking electrification — induction stoves vs gas',
        'Notes net-metering and PPA financing as ways to skip upfront cost'
      ],
      hint: 'Don’t forget: solar runs in the daytime when school is open — perfect time-match for cafeteria load. Anaerobic digestion of food waste does double duty (renewable energy + landfill diversion).' },
    { id: 'island', icon: '🏝️',
      title: 'Remote Maine island microgrid',
      prompt: 'A 200-resident Maine island currently runs on diesel generators ($0.40/kWh delivered). They want to cut dependence on diesel. Strong winds (avg 8 m/s offshore), tidal currents, lots of roof space. Submarine cable to mainland is too expensive. Demand: 1.2 MW peak, 0.6 MW avg.',
      rubric: [
        'Wind is the dominant resource at 8 m/s — sizes a wind farm or 1–2 utility turbines',
        'Includes tidal as predictable supplement (the headline Maine tidal advantage)',
        'Has multi-day battery + diesel fallback for dead-calm low-tide periods',
        'Addresses how to handle months with low resource — keep diesel for emergencies, not abandon it',
        'Notes that even 70% renewable saves enormous diesel cost — perfection is not required'
      ],
      hint: 'On islands, replacing 100% of diesel is rarely cost-optimal. The 80/20 rule applies — 70–80% renewable + diesel backup is usually cheaper than 100% renewable + huge battery.' },
    { id: 'city', icon: '🌆',
      title: 'Mid-sized US city by 2040',
      prompt: 'A US city of 250,000 wants 100% clean electricity by 2040. Currently 35% gas, 25% coal, 20% nuclear, 15% hydro, 5% wind/solar. Peak demand 800 MW summer afternoons; minimum 350 MW spring nights. Design the transition.',
      rubric: [
        'Keeps existing nuclear + hydro as low-carbon dispatchable backbone',
        'Massively expands wind + solar, paired with 4–8 hour battery storage',
        'Phases out coal first (highest emissions per kWh), then gas',
        'Notes transmission upgrades + demand response as cheap "virtual capacity"',
        'Acknowledges that some long-duration storage (pumped hydro / hydrogen) will be needed for the last 10–15%'
      ],
      hint: 'Don’t dismantle the nuclear — replacing dispatchable nuclear with intermittent renewables is harder than replacing coal/gas. The hard part is the last 15–20%, not the first 80%.' },
    { id: 'datacenter', icon: '💾',
      title: 'Carbon-free data center, 24/7',
      prompt: 'A tech company wants to run a 50 MW data center on 100% carbon-free energy ROUND-THE-CLOCK (not just annual matching). Site is in the desert Southwest US. Goal: zero fossil dispatch every hour of every day.',
      rubric: [
        '24/7 carbon-free is FAR harder than annual matching — needs storage / dispatchable clean sources',
        'Pairs utility-scale solar + battery (4–8h) for daytime + early evening',
        'Adds wind for nights + cloudy periods (negatively correlated with solar)',
        'Considers geothermal or new nuclear (SMR) as 24/7 dispatchable backbone',
        'Long-duration storage (CSP-thermal or green hydrogen) for multi-day low-resource stretches'
      ],
      hint: 'Annual matching ≠ hourly matching. Buying enough solar to match 100% of yearly use is easy; matching every hour is the unsolved frontier of clean-energy buying.' },
    { id: 'rural', icon: '🚜',
      title: 'Rural farm electrification',
      prompt: 'A 200-acre Maine dairy farm with 150 cows wants to electrify everything: barn, robotic milking, tractors, home, plus heat the barn in winter. Currently uses ~200 kWh/day electric + ~3,000 gal/year diesel + ~600 gal/year heating oil. Has lots of manure.',
      rubric: [
        'Covers obvious: rooftop solar on the barn (large flat roof, no shading)',
        'Anaerobic digester for manure — solves both methane emissions and energy needs',
        'Heat pump (ground-source if budget allows) replaces heating oil',
        'Electric tractor charging from on-farm solar (timing matters)',
        'Battery storage to firm farm-load match — milking happens at fixed times of day'
      ],
      hint: 'Dairy manure is gold for biogas — methane already wants to come out, you just capture and burn it. The digestate is higher-quality fertilizer than raw manure too.' }
  ];
  // Ground-truth list constrains AI critiques: never hallucinate beyond these.
  var AI_GROUND_TRUTH = [
    'Solar PV capacity factor in Maine: ~16–20%. Useful sun in mid-winter: ~3–4 hr/day.',
    'Onshore wind capacity factor: ~35–45%. Cube law: power scales with v³.',
    'Hydro: P = ρ·g·h·Q·η. Small streams (Q ~0.1 m³/s) at 5 m head produce only ~3.5 kW gross.',
    'Lifecycle CO₂ medians (g/kWh): solar 40, wind 11, hydro 24, geo 38, nuclear 12, gas 490, coal 820.',
    'Battery (Li-ion) cost ~$140/kWh in 2024. Round-trip efficiency 85–95%.',
    'Pumped hydro round-trip: 75–85%. Green hydrogen: 30–40%.',
    'Maine has text-to-911 statewide (irrelevant here, but a Maine constant).',
    'Anaerobic digestion of food/manure: ~60% methane biogas. Fits dairy farms + cafeterias.',
    'Heat pumps (ground-source) move ~3–5 units of heat per unit electricity (COP 3–5).',
    'Federal ITC for solar: 30% through 2032 under current law.',
    'NEVER promise specific $/payback unless the question gives all needed data.',
    'NEVER recommend behind-the-meter installation choices that require professional design (electrical safety).'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.10: SMART GRID 101 — how a real grid balances supply+demand
  // The often-skipped half of "renewable transition" — generation is only
  // half the problem; the grid has to absorb it second by second.
  // ─────────────────────────────────────────────────────────
  var SMART_GRID_CONCEPTS = [
    { id: 'frequency', icon: '〰️', title: '60 Hz frequency regulation',
      what: 'In North America the grid runs at exactly 60 cycles per second. If demand jumps and generation lags, frequency drops below 60 Hz; if generation exceeds demand, it rises. Either case is bad — equipment can fail, generators can desync.',
      who: 'Grid operators (in New England: ISO-NE) constantly balance generation against demand to keep frequency at 60 ± 0.05 Hz.',
      why: 'Batteries are uniquely good at this — they respond in milliseconds. Grid-scale Li-ion frequency regulation is one of the highest-value uses of storage.' },
    { id: 'tou', icon: '⏰', title: 'Time-of-use (TOU) pricing',
      what: 'Electricity costs more to generate at peak demand (hot summer afternoons) than at low demand (3 AM). TOU rates pass that variation to customers — high prices 4–9 PM, low prices overnight.',
      who: 'Increasingly common in California, Hawaii, parts of New England. Maine residential customers can opt in via CMP / Versant.',
      why: 'TOU rates make rooftop solar + home battery economics work — you store cheap midday solar, use it during expensive evening peak. Without TOU, batteries pay back much slower.' },
    { id: 'dr', icon: '🎚️', title: 'Demand response (DR)',
      what: 'Utility programs that PAY customers to reduce or shift load during peak events. Typical: AC pre-cool / set back; pool pumps off; EV charging delayed; large industrial loads dialed down for an hour.',
      who: 'Most US utilities have residential + commercial DR programs. ISO-NE\'s Forward Capacity Market explicitly counts demand-side resources.',
      why: 'Cheaper than building a new peaker plant. A "negawatt" (avoided demand) is functionally identical to a megawatt of generation but with zero emissions.' },
    { id: 'v2g', icon: '🔌', title: 'Vehicle-to-grid (V2G)',
      what: 'Electric vehicles spend ~95% of their time parked. With bidirectional charging, the EV battery can feed power BACK to the grid (or your home) during peak — then recharge overnight when it\'s cheap.',
      who: 'Ford F-150 Lightning + Nissan Leaf already support it. Real V2G fleet pilots in California, Massachusetts, the UK. Maine starting to roll out compatible charging stations.',
      why: 'A typical EV battery (60–100 kWh) is roughly 4–7 days of average home electricity. Imagine 100 million EVs as distributed storage — that\'s a grid-scale resource without building a single new battery.' },
    { id: 'transmission', icon: '🗼', title: 'Transmission as the bottleneck',
      what: 'The best wind sites are the Great Plains; the best solar is the Southwest; the load is on the coasts. Long-distance high-voltage transmission lines are the cheapest way to bridge that gap.',
      who: 'Permitting takes 7–15 years per project. The "interconnection queue" of pending US generation projects is now ~2 TW (more than current US generating capacity) — almost all stuck waiting for transmission upgrades.',
      why: 'NREL and others routinely conclude transmission siting + permitting is now a bigger barrier than generation cost. Expect more federal-vs-state legal battles.' },
    { id: 'derms', icon: '🧠', title: 'DERMS / smart meters',
      what: 'Distributed Energy Resource Management Systems — software that sees and orchestrates millions of small generators, batteries, EVs, and smart appliances on the distribution grid in real time.',
      who: 'Every major US utility is building one. CMP (Maine) and Versant Power are mid-deployment.',
      why: 'Without DERMS, distributed solar + storage is invisible to the grid operator. With it, the grid can use small assets the way it used to use a few big plants.' },
    { id: 'inertia', icon: '🌀', title: 'Grid inertia (the under-appreciated problem)',
      what: 'Big spinning steam turbines (coal, gas, nuclear, hydro) literally have rotational inertia — when demand suddenly spikes, they slow slightly and provide stabilizing energy for ~seconds before controls kick in.',
      who: 'Solar inverters and batteries have NO rotational mass. As we replace big turbines with inverter-based generation, real engineering work is needed (grid-forming inverters, synchronous condensers).',
      why: 'This is one of the genuine technical concerns about high-renewable grids. It\'s solvable — it just isn\'t free.' },
    { id: 'duckcurve', icon: '🦆', title: 'The "duck curve"',
      what: 'In high-solar grids (California is the textbook example), the daytime net-load chart looks like a duck — solar floods the grid midday (deep belly), then drops out at sunset just as demand peaks (steep neck up). Operators have to ramp dispatchable plants up FAST to fill the gap.',
      who: 'CAISO + ERCOT see this daily. New England hasn\'t hit the same scale yet but is heading there.',
      why: 'The duck curve is the "obvious bug" of solar-heavy grids — and it\'s fixable with batteries (charge midday, discharge evening), demand response, and shifting loads (EV charging, heat-pump pre-heating) into the belly.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.11: CAREER PATHWAYS — where this curriculum can lead
  // 14 careers spanning trades + technical + analytical + policy.
  // Salary medians from BLS OEWS 2024 where available.
  // ─────────────────────────────────────────────────────────
  var CAREER_PATHS = [
    { id: 'windtech', icon: '🌬️', title: 'Wind turbine technician',
      salary: '$61,770 median (2024 BLS)',
      growth: 'Fastest-growing occupation 2022–2032 per BLS — projected +60%',
      edu: '2-yr technical college program OR military electronics + on-the-job training. Must be willing to climb 80–120 m and work in weather.',
      where: 'Maine: emerging — early offshore-wind training programs. Today most jobs are land-based in TX, IA, OK, KS, IL.',
      tags: ['trade', 'apprenticeship', 'field'] },
    { id: 'solarinst', icon: '☀️', title: 'Solar PV installer',
      salary: '$48,180 median',
      growth: 'High demand — projected +22% through 2032',
      edu: 'NABCEP entry-level certificate (~6 weeks) or community college solar program. Often paired with electrical apprenticeship.',
      where: 'Maine: ReVision Energy, Sundog Solar, Maine Solar Solutions among many. Efficiency Maine maintains an installer registry.',
      tags: ['trade', 'OJT possible', 'field'] },
    { id: 'lineworker', icon: '⚡', title: 'Electrical lineworker',
      salary: '$85,420 median',
      growth: 'Steady — wage growth driven by grid expansion + storm hardening',
      edu: '4-year IBEW apprenticeship (paid earn-while-you-learn). Highly competitive entry. ~6,000 hours OJT + classroom.',
      where: 'Maine: IBEW Local 567 (Lewiston) and Local 1837 (Bangor) run apprenticeships. CMP, Versant, contractor companies.',
      tags: ['trade', 'apprenticeship', 'field', 'union'] },
    { id: 'hvac', icon: '🏠', title: 'HVAC / heat pump installer',
      salary: '$50,590 median',
      growth: 'Heat-pump boom in Maine + Northeast = strong demand',
      edu: 'EPA 608 cert + NATE cert. Community college HVAC program (~12 months) or apprenticeship.',
      where: 'Maine: Efficiency Maine maintains a registered installer list. Year-round work because of the heat-pump push.',
      tags: ['trade', 'cert-driven', 'field'] },
    { id: 'auditor', icon: '🔍', title: 'Energy auditor',
      salary: '$52,260 median (varies a lot)',
      growth: 'Steady — every weatherization grant program needs auditors',
      edu: 'BPI Building Analyst cert (1-2 weeks) OR HERS Rater cert. Often paired with construction or HVAC background.',
      where: 'Maine: Efficiency Maine + private firms. Federal IRA $$$ flowing to home weatherization is creating jobs.',
      tags: ['cert-driven', 'field+desk'] },
    { id: 'battery', icon: '🔋', title: 'Battery storage technician',
      salary: '~$60,000 (emerging, less BLS data)',
      growth: 'Brand-new field — grid-scale battery installs doubling annually',
      edu: 'Electrician background + manufacturer-specific training (Tesla, Fluence, Powin). Some 2-yr energy storage programs starting to appear.',
      where: 'Following the battery sites — currently CA, TX, AZ. Maine: small but coming.',
      tags: ['trade', 'emerging', 'field'] },
    { id: 'offshorewind', icon: '🌊', title: 'Offshore wind specialist',
      salary: '$70,000–120,000 (skilled trades + GWO certified)',
      growth: 'Just starting US-side — Maine + Massachusetts + RI leasing rounds 2024-2030',
      edu: 'GWO (Global Wind Organisation) Basic Safety Training + Sea Survival. Often offshore O&G crossover.',
      where: 'Maine: UMaine Composites Center is the US-side R&D leader. Eventual O&M jobs in Searsport, Eastport, Portland.',
      tags: ['trade', 'emerging', 'maritime', 'maine-relevant'] },
    { id: 'engr', icon: '📐', title: 'Power systems / electrical engineer',
      salary: '$103,320 median',
      growth: 'Steady; grid modernization is a permanent driver',
      edu: 'BS Electrical Engineering minimum. PE license for senior roles. Many specialize in renewables / power electronics in grad school.',
      where: 'Utilities (CMP, Versant), ISO-NE, equipment makers (GE, Siemens, ABB), consulting firms.',
      tags: ['professional', 'BS+', 'office+field'] },
    { id: 'civil', icon: '🛠️', title: 'Civil / structural engineer (renewables)',
      salary: '$95,000 median in renewables',
      growth: 'Strong — every solar farm + wind project needs site engineering',
      edu: 'BS Civil Engineering. PE license for stamping plans.',
      where: 'EPC (engineering-procurement-construction) firms; project developers; consulting.',
      tags: ['professional', 'BS+', 'office+field'] },
    { id: 'analyst', icon: '📊', title: 'Energy analyst / modeler',
      salary: '$78,000 median',
      growth: 'High — every utility, ISO, lab, advocacy group, and investor needs them',
      edu: 'BS in econ, engineering, statistics, or environmental science. Strong skills in Python / R / Excel modeling. MS often preferred.',
      where: 'Labs (NREL, LBNL), utilities, ISO-NE, NGOs (RMI, Acadia Center), investment / consulting firms.',
      tags: ['professional', 'BS+', 'office', 'analytic'] },
    { id: 'policy', icon: '📜', title: 'Energy policy / regulator',
      salary: '$70,000–120,000',
      growth: 'Steady — IRA + state climate laws driving hiring',
      edu: 'BS or MS / JD in policy, law, energy, environmental science. Public-service experience matters more than the degree.',
      where: 'Maine PUC, GEO, Department of Environmental Protection. Federal: FERC, DOE, EPA.',
      tags: ['professional', 'office', 'public-service'] },
    { id: 'climate', icon: '🌎', title: 'Climate scientist / atmospheric researcher',
      salary: '$98,940 median',
      growth: 'Funded by IRA + DOE + NOAA + NASA',
      edu: 'PhD typical for research; MS for some applied roles.',
      where: 'Universities (UMaine Climate Change Institute), labs, NGOs, federal science agencies.',
      tags: ['research', 'PhD-track', 'academic'] },
    { id: 'sustain', icon: '🌱', title: 'Sustainability manager (corporate)',
      salary: '$85,000 median, $100k+ for senior',
      growth: 'High — every public company has scope 1–3 reporting requirements',
      edu: 'BS + 5-10 yr experience. MBA helps for senior roles. LEED / BREEAM cert common.',
      where: 'Corporate offices everywhere; growing demand from manufacturers, real estate, retailers.',
      tags: ['professional', 'BS+', 'office'] },
    { id: 'driller', icon: '🌋', title: 'Geothermal / GSHP driller',
      salary: '$64,720 median',
      growth: 'Emerging with heat-pump boom; deep geothermal still niche',
      edu: 'OJT or 2-yr drilling tech program. CDL helps.',
      where: 'Maine: a handful of GSHP-specialty drilling firms; deep geothermal still mostly Western US.',
      tags: ['trade', 'OJT possible', 'field'] }
  ];

  // Maine-specific training pipeline — pulled out so it's prominently displayed.
  var MAINE_TRAINING = [
    { name: 'Maine Community College System — Energy Programs', what: 'Wind/solar/HVAC/electrical at Northern Maine CC, Eastern Maine CC, Kennebec Valley CC, Southern Maine CC.', url: 'https://www.mccs.me.edu' },
    { name: 'UMaine Advanced Structures and Composites Center', what: 'US-leading offshore-wind composites research; undergrad + grad pathways.', url: 'https://composites.umaine.edu' },
    { name: 'IBEW Local 567 (Lewiston)', what: 'Inside electrician + lineworker apprenticeships. Earn-while-you-learn.', url: 'https://www.ibew567.org' },
    { name: 'IBEW Local 1837 (Bangor)', what: 'Outside lineworker apprenticeship. Covers Maine, NH, VT.', url: 'https://www.ibew1837.org' },
    { name: 'Efficiency Maine — Registered Vendors', what: 'Find existing solar/heat-pump installers; many take entry-level apprentices.', url: 'https://www.efficiencymaine.com' },
    { name: 'Maine Apprenticeship Program', what: 'State-run program connecting apprentices to registered employers across trades.', url: 'https://www.maine.gov/labor/jobs_training/apprenticeship' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.12: HEAT PUMP DEEP DIVE
  // Maine leads the US in per-capita heat-pump adoption. Currently scattered
  // across Geothermal + Career; deserves its own page so the Maine-relevant
  // tech gets the depth it warrants.
  // ─────────────────────────────────────────────────────────
  var HEAT_PUMP_FACTS = {
    intro: 'A heat pump does NOT generate heat — it MOVES heat. It uses a refrigeration cycle (the same one in your fridge, run "in reverse") to move thermal energy between two places. In winter it pulls heat from outside (cold air or ground) into your home; in summer it pushes heat from inside to outside.',
    cop: 'Coefficient of Performance (COP) measures heat moved ÷ electricity used. A COP of 4 means 4 units of heat are moved for every 1 unit of electricity consumed — 400% efficient compared to electric resistance heat. The trick: you\'re NOT making heat from electricity, you\'re moving it.',
    types: [
      { id: 'ashp', name: 'Air-source heat pump (ASHP)',
        how: 'Outdoor unit + indoor air handler(s). Pulls heat from outdoor air (yes, even in winter — cold air still has thermal energy above absolute zero).',
        cop: '2.5–4.0 typical; modern cold-climate models stay above 2.0 down to −15 °C',
        cost: '$3,000–8,000 per zone (single mini-split) up to $15,000+ for whole-home',
        best: 'Most retrofits in Maine. Quick to install; modular zone-by-zone.' },
      { id: 'gshp', name: 'Ground-source heat pump (GSHP)',
        how: 'Loops of pipe buried in the ground (horizontal trench) or drilled wells (vertical bores) circulate water/antifreeze. Below the frost line the ground stays a near-constant ~10 °C year-round.',
        cop: '3.5–5.5 typical; rarely drops below 3.0',
        cost: '$20,000–45,000 installed (ground loop is the expensive part)',
        best: 'New construction or major retrofit on a property with land. Lower lifetime operating cost; longest equipment life (30+ yr indoor, 50+ yr ground loop).' },
      { id: 'wshp', name: 'Water-source heat pump',
        how: 'Same as GSHP but uses a pond, lake, or well water as the thermal source instead of ground loops.',
        cop: '4.0–5.5 typical',
        cost: 'Variable — depends entirely on water source proximity',
        best: 'Lakefront / waterfront properties. Niche but very efficient when the geography fits.' },
      { id: 'hpwh', name: 'Heat pump water heater (HPWH)',
        how: 'Standalone water heater that uses a small heat pump to heat water from ambient air heat. Bonus: cools + dehumidifies the room (a basement is ideal).',
        cop: '2.5–4.0 typical',
        cost: '$1,500–3,500 installed; ~$700 federal tax credit + Efficiency Maine rebate',
        best: 'Replacing an electric resistance water heater. Pays back in ~3–5 years on Maine electric rates.' }
    ],
    myths: [
      { myth: '"Heat pumps don\'t work below freezing."',
        truth: 'Old myth. Modern cold-climate ASHPs (Mitsubishi Hyper-Heat, Fujitsu Halcyon, Daikin Aurora etc.) maintain rated capacity down to −15 °C and still output heat at −25 °C. NEEP keeps a list of cold-climate verified models.' },
      { myth: '"They cost more to run than oil/gas in winter."',
        truth: 'Depends on local prices. In Maine 2024: ASHP at COP 2.5 costs ~$0.084/kWh-thermal at $0.21/kWh electric; oil at $4/gal heating value 138K BTU/gal at 85% boiler efficiency costs ~$0.115/kWh-thermal. Heat pump wins by ~25%.' },
      { myth: '"You still need a backup oil/gas system."',
        truth: 'Whole-home ASHPs sized correctly handle Maine winters without backup. Some homeowners keep their old oil burner as backup for the very coldest nights, but it\'s a comfort decision not a necessity.' },
      { myth: '"Geothermal is too expensive."',
        truth: 'Upfront, yes. But the federal 30% ITC + Efficiency Maine rebate ($8,000+) + 20-year operating savings often beats oil/propane on lifetime cost. New construction is the sweet spot — drill the wells before pouring the foundation.' }
    ],
    integration: [
      'Solar + heat pump: pair them. Summer solar surplus runs the AC; shoulder-season solar runs the heat pump. Heat pump is the biggest electric load in a Maine home — sizing solar to match it makes the math work.',
      'Smart thermostat: pre-cool during midday solar peak; pre-heat during cheap overnight (TOU rates). Reduces grid stress and saves money.',
      'Battery: a small home battery (10 kWh) covers heat pump demand for ~3–6 hours, useful for brief outages.',
      'Weatherize FIRST: a leaky house wastes any heating system. Air seal + insulate before sizing your heat pump — you\'ll need a smaller (cheaper) unit.'
    ],
    maine: [
      'Maine has installed 100,000+ heat pumps since 2019 — leading the US per capita. Goal: 100,000 more by 2027.',
      'Efficiency Maine rebates: $1,200/zone for ASHP, up to $8,000 for GSHP, plus federal 30% ITC for GSHP + ~$2,000 federal for ASHP.',
      'Maine\'s electric grid is one of the cleanest in the lower 48 (lots of NEPOOL hydro + nuclear), so a heat pump in Maine is also low-carbon.',
      'NEEP (Northeast Energy Efficiency Partnerships) maintains the cold-climate verified list — neep.org/heating-cooling/cchpgz.'
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 5.13: REAL-WORLD PLANT TOUR
  // 16 famous installations with capacity, year, story.
  // Filterable by source type. Builds geographic intuition.
  // ─────────────────────────────────────────────────────────
  var WORLD_PLANTS = [
    // Hydro
    { id: 'threegorges', tag: 'hydro', icon: '🌊', name: 'Three Gorges Dam',
      where: 'Hubei, China · 2003 (final 2012) · 22,500 MW',
      story: 'World\'s largest power plant by capacity. Generates ~95 TWh/yr. Displaced 1.3 million people. Reservoir is 660 km long.' },
    { id: 'itaipu', tag: 'hydro', icon: '🌊', name: 'Itaipu',
      where: 'Brazil/Paraguay border · 1984 · 14,000 MW',
      story: 'Until Three Gorges, the world\'s biggest. Runs on the Paraná river. Supplies ~10% of Brazil\'s + ~90% of Paraguay\'s electricity. Joint Brazil-Paraguay binational project.' },
    { id: 'hoover', tag: 'hydro', icon: '🌊', name: 'Hoover Dam',
      where: 'Nevada/Arizona, USA · 1936 · 2,080 MW',
      story: 'Built during the Great Depression in 5 years. 17 Francis turbines. Lake Mead reservoir; declining water level since 2000 has cut output significantly.' },
    // Wind
    { id: 'hornsea', tag: 'wind', icon: '🌬️', name: 'Hornsea Wind Farm',
      where: 'North Sea, UK · 2019–ongoing · 1,200 MW (H-1) + expansions',
      story: 'World\'s largest offshore wind farm. 174 turbines, each 8 MW, Siemens Gamesa. Visible from Yorkshire on a clear day. Hornsea 2 (1,386 MW) operating; H-3 + H-4 in development.' },
    { id: 'gansu', tag: 'wind', icon: '🌬️', name: 'Gansu Wind Farm',
      where: 'Gansu province, China · 2009–ongoing · ~8,000+ MW',
      story: 'World\'s largest land-based wind farm. Built in the Gobi Desert. Curtailment problems early — built faster than transmission to coastal demand. Now better integrated.' },
    { id: 'block', tag: 'wind', icon: '🌬️', name: 'Block Island Wind Farm',
      where: 'Off Block Island, RI · 2016 · 30 MW',
      story: 'First commercial offshore wind in the US. Just 5 turbines but a watershed moment. Replaced 1 million gal/yr of diesel that the island used to burn for power.' },
    // Solar
    { id: 'bhadla', tag: 'solar', icon: '☀️', name: 'Bhadla Solar Park',
      where: 'Rajasthan, India · 2018–2020 · 2,245 MW',
      story: 'World\'s largest single solar farm by some measures. ~57 km² of panels in the Thar desert. Surface temps hit 55 °C — robotic dry cleaners replace water washing.' },
    { id: 'tengger', tag: 'solar', icon: '☀️', name: 'Tengger Desert Solar Park',
      where: 'Ningxia, China · 2017 · 1,547 MW',
      story: 'Nicknamed the "Great Wall of Solar." 43 km² of panels visible from space. Pairs with a small CSP plant for storage.' },
    // CSP
    { id: 'noor', tag: 'csp', icon: '🔆', name: 'Noor Ouarzazate',
      where: 'Morocco · 2016–2018 · 580 MW',
      story: 'World\'s largest concentrated solar (CSP) complex. Combines parabolic trough + power tower + PV. 7+ hours molten-salt storage means it dispatches into the evening peak.' },
    { id: 'ivanpah', tag: 'csp', icon: '🔆', name: 'Ivanpah Solar Power Facility',
      where: 'Mojave Desert, California · 2014 · 392 MW',
      story: 'Three power towers, 173,500 heliostats. Has been controversial — bird kills from solar flux, lower-than-projected output, no thermal storage means it doesn\'t outperform PV.' },
    // Geothermal
    { id: 'geysers', tag: 'geothermal', icon: '🌋', name: 'The Geysers',
      where: 'Sonoma & Lake counties, CA · since 1960 · 1,517 MW',
      story: 'World\'s largest geothermal complex by capacity. 22 dry-steam plants. Output declining since the 90s — operators inject treated wastewater to keep the reservoir alive.' },
    { id: 'larderello', tag: 'geothermal', icon: '🌋', name: 'Larderello',
      where: 'Tuscany, Italy · 1904 (first ever) · 800 MW',
      story: 'The original. First geothermal plant ever, opened 1904 with a single dynamo. Still operating after 120+ years. Volcanic gradient ~80 °C/km — exceptional resource.' },
    { id: 'hellisheidi', tag: 'geothermal', icon: '🌋', name: 'Hellisheiði',
      where: 'Iceland · 2006 · 303 MW + 400 MW thermal',
      story: 'Combined heat + power for greater Reykjavík. Hosts the Climeworks/CarbFix CO₂ capture experiment that mineralizes carbon dioxide into rock.' },
    // Tidal / Wave
    { id: 'rance', tag: 'wave', icon: '🌀', name: 'Rance Tidal Power Station',
      where: 'Brittany, France · 1966 · 240 MW',
      story: 'World\'s first tidal power plant; ran for 50+ years. A 750 m barrage across the Rance estuary with 24 reversible bulb turbines. Massive ecological impact — not built much anymore.' },
    { id: 'meygen', tag: 'wave', icon: '🌀', name: 'MeyGen',
      where: 'Pentland Firth, Scotland · 2016–ongoing · 6 MW (Phase 1, scaling to 86 MW)',
      story: 'World\'s largest tidal stream array. Underwater turbines spin in 5 m/s currents. World\'s first commercial-scale demonstration of underwater wind-style turbines for tides.' },
    // Maine
    { id: 'orpc', tag: 'wave', icon: '🌀', name: 'ORPC TidGen (Eastport, ME)',
      where: 'Cobscook Bay, Maine · 2012 · 180 kW (test)',
      story: 'First grid-connected tidal generator in US waters. Tested by Ocean Renewable Power Co. Cobscook Bay sees 6 m / 20 ft tides — among the largest in the lower 48.' }
  ];
  var PLANT_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'hydro', label: '🌊 Hydro' },
    { id: 'wind', label: '🌬️ Wind' },
    { id: 'solar', label: '☀️ Solar' },
    { id: 'csp', label: '🔆 CSP' },
    { id: 'geothermal', label: '🌋 Geo' },
    { id: 'wave', label: '🌊 Wave/Tidal' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.14: HYDROGEN ECONOMY
  // The most-discussed and most-confused topic in clean energy. Color codes
  // are jargon worth decoding; production routes have very different climate
  // impacts; end uses are limited but important.
  // ─────────────────────────────────────────────────────────
  var HYDROGEN_COLORS = [
    { id: 'green', label: 'Green', emoji: '🟢',
      how: 'Electrolysis powered by renewable electricity. Water → H₂ + ½ O₂.',
      co2: '~0–1 kg CO₂ / kg H₂',
      cost: '$3–6 / kg today, target $1–2 / kg by 2030 (DOE Hydrogen Shot)',
      verdict: 'The goal. Truly low-carbon. Cost-limited today.' },
    { id: 'blue', label: 'Blue', emoji: '🔵',
      how: 'Steam methane reforming (SMR) of natural gas + carbon capture & storage (CCS).',
      co2: '~2–4 kg CO₂ / kg H₂ (assuming ~85–95% capture)',
      cost: '$1.5–3 / kg',
      verdict: 'Cheaper than green, but only as clean as the CCS performs. Methane leaks upstream are the real wildcard.' },
    { id: 'gray', label: 'Gray', emoji: '⚫',
      how: 'Steam methane reforming WITHOUT carbon capture. The default H₂ today (~95% of global production).',
      co2: '~9–11 kg CO₂ / kg H₂',
      cost: '$1–2 / kg',
      verdict: 'NOT clean. This is the elephant in the room — most "hydrogen" today is gray.' },
    { id: 'pink', label: 'Pink (a.k.a. Purple/Red)', emoji: '🌸',
      how: 'Electrolysis powered by nuclear electricity.',
      co2: '~0–1 kg CO₂ / kg H₂',
      cost: '$2–5 / kg',
      verdict: 'Low-carbon and dispatchable. Several US nuclear plants exploring this for revenue diversification.' },
    { id: 'turquoise', label: 'Turquoise', emoji: '💎',
      how: 'Methane pyrolysis. Methane → H₂ + solid carbon (no CO₂ emitted, byproduct is graphite or carbon black).',
      co2: '~0–2 kg CO₂ / kg H₂ if powered by renewables',
      cost: '$2–4 / kg (early-stage)',
      verdict: 'Promising — solid carbon byproduct can be sold. Still pre-commercial scale.' },
    { id: 'white', label: 'White (Natural / Geologic)', emoji: '⚪',
      how: 'Hydrogen extracted from natural underground reservoirs (only recently confirmed at exploitable scale, e.g. Mali).',
      co2: 'Near-zero direct emissions',
      cost: '$1–2 / kg projected if scalable',
      verdict: 'Wildcard. Big finds in France + Mali 2023–24. Could be transformative if it scales — "the new fossil fuel" except it\'s renewable on geological timescales.' },
    { id: 'gold', label: 'Gold (a.k.a. Orange)', emoji: '🟡',
      how: 'In-situ from depleted oil/gas wells — inject water, microbes/heat strip H₂ from residual hydrocarbons.',
      co2: '~1–3 kg CO₂ / kg H₂',
      cost: 'Pilot stage',
      verdict: 'Speculative — could valorize abandoned wells, but real climate accounting is still being worked out.' }
  ];
  var HYDROGEN_USES = [
    { id: 'fertilizer', icon: '🌾', name: 'Ammonia / fertilizer',
      pct: '~40% of global H₂ today',
      what: 'NH₃ for nitrogen fertilizer (Haber-Bosch process). Feeds ~50% of humanity. Also used for explosives + refrigerants.',
      verdict: 'Highest-impact decarbonization target. Green ammonia plants under construction in Saudi Arabia, Australia, Texas.' },
    { id: 'refining', icon: '🏭', name: 'Oil refining',
      pct: '~30% of global H₂ today',
      what: 'Hydrocracking + desulfurization in petroleum refining.',
      verdict: 'Use shrinks as oil demand falls. Replacing gray with green here is a quick win.' },
    { id: 'steel', icon: '🔩', name: 'Steel-making (DRI)',
      pct: 'Currently ~0%; potentially huge',
      what: 'Direct Reduced Iron (DRI) using H₂ instead of coke. Iron oxide + H₂ → iron + H₂O. Fundamentally replaces coal in steel.',
      verdict: 'Hot area — SSAB / HYBRIT (Sweden), H2 Green Steel, ArcelorMittal pilots. Steel = 7–9% of global CO₂.' },
    { id: 'transport', icon: '🚛', name: 'Heavy transport',
      pct: 'Niche today',
      what: 'Long-haul trucking, shipping, aviation, trains where batteries are too heavy. Fuel cells convert H₂ + O₂ → electricity + water.',
      verdict: 'Battle with battery EVs ongoing. Likely outcome: batteries win light-duty + most trucking; H₂ wins shipping + aviation + some heavy industrial.' },
    { id: 'storage', icon: '🔋', name: 'Long-duration grid storage',
      pct: 'Pilot stage',
      what: 'Convert surplus summer solar to H₂; store in salt caverns or tanks; burn in turbine in winter. Round-trip ~30–40%.',
      verdict: 'Only economic option for >100-hr storage. Round-trip efficiency is bad but cost-per-kWh-stored gets attractive at long durations.' },
    { id: 'buildings', icon: '🏠', name: 'Heating buildings',
      pct: 'Tiny',
      what: 'Burning H₂ in modified gas boilers. Some UK + EU pilots.',
      verdict: 'Probably the WORST use. Heat pumps deliver 3-5× more useful heat per unit of low-carbon energy. Hydrogen gas industry pushes hard for this; most independent analyses are skeptical.' }
  ];
  var HYDROGEN_KEYS = [
    'Round-trip efficiency for green H₂ as storage: 30–40%. Compare to 85–95% for batteries.',
    '1 kg H₂ ≈ 33 kWh of energy (LHV) — about 3× the energy density of gasoline by mass, but H₂ is so light it has poor VOLUMETRIC energy density.',
    'Most hydrogen today is gray. Saying "hydrogen is clean" without specifying color is meaningless.',
    'Hydrogen + heat-pumps fight for the same molecule of clean electricity. Heat pumps win for buildings; hydrogen wins for steel + ammonia + ships.',
    'IRA Section 45V: production tax credit up to $3/kg for green H₂ — the biggest US hydrogen subsidy ever. Final rules contested through 2024–25.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.15: CLIMATE JUSTICE LENS
  // The energy transition is technical AND political. Who pays, who profits,
  // who loses, who decides — these matter as much as kWh.
  // ─────────────────────────────────────────────────────────
  var JUSTICE_TOPICS = [
    { id: 'burden', icon: '💸', title: 'Energy burden',
      what: 'Energy burden = % of household income spent on energy bills. The US average is ~3%. Low-income households (≤200% federal poverty line) average 8.6%; the highest-burden households spend 30%+.',
      who: 'Hits hardest in old housing stock — leaky, electric-resistance heat, no AC during heat waves. Predominantly Black, Latino, rural, and elderly households.',
      action: 'Weatherization + heat pumps cut energy burden faster than any other intervention. Federal WAP + IRA HOMES rebates explicitly target low-income households. Maine: Efficiency Maine\'s low-income programs cover 100% of weatherization for qualifying homes.',
      source: 'ACEEE Energy Burden Report 2022; DOE WAP' },
    { id: 'frontline', icon: '🏘️', title: 'Front-line communities',
      what: 'Communities that bear the worst pollution from fossil-fuel infrastructure — oil refineries, gas plants, coal-ash dumps, petrochemical complexes. "Cancer Alley" along the lower Mississippi. The Navajo Nation coal plant. Appalachian coal regions.',
      who: 'Disproportionately Black, Latino, Indigenous, and low-income — the result of decades of zoning + redlining + tribal-land policy. Higher rates of asthma, cancer, cardiovascular disease.',
      action: 'A real transition shuts these plants AND invests in the communities — IRA Justice40 mandates 40% of climate dollars go to disadvantaged communities. Implementation is ongoing and contested.',
      source: 'EPA EJScreen; Tessum 2021 (Science); Justice40 Initiative' },
    { id: 'transition', icon: '⛏️', title: 'Just transition for fossil-fuel workers',
      what: 'A coal miner in West Virginia or an oil worker in Louisiana can\'t simply "learn to code." Real just transition means jobs of comparable pay, in the same region, with health benefits and pension protection.',
      who: 'Coal employment ~40K (down from 90K in 2010). Oil & gas ~135K direct, hundreds of thousands of contractors. Heavily concentrated geographically.',
      action: 'IRA contains the largest US labor + community-investment package in decades — bonus tax credits for projects in former coal communities, prevailing-wage requirements on most clean-energy projects, apprenticeship requirements. Working in some places (offshore wind in WV port towns), uneven elsewhere.',
      source: 'IRA Energy Communities provisions; BlueGreen Alliance' },
    { id: 'siting', icon: '⚖️', title: 'Siting fights',
      what: 'Renewable projects get sited where land is cheap and politically powerless to refuse. Wind farms on tribal land or near reservation borders. Solar on prime farmland. Lithium mining in Indigenous water-rights areas (Thacker Pass, NV). Offshore wind vs commercial fishing.',
      who: 'Indigenous nations, working-class rural areas, fishing communities — the same groups historically forced to host fossil infrastructure now sometimes asked to host renewable infrastructure too.',
      action: 'Real procedural justice: free, prior, and informed consent (FPIC) for tribal projects; community benefit agreements; co-ownership models where the host community gets equity, not just royalties.',
      source: 'Sovereign Energy (Powless 2022); Native American Rights Fund' },
    { id: 'indigenous', icon: '🪶', title: 'Indigenous leadership',
      what: 'Indigenous nations are NOT just affected parties — they are increasingly project leaders. Navajo Nation deploying 250+ MW of solar on reclaimed coal-plant land. Standing Rock Sioux fighting AND building. Maine: Penobscot Nation involved in offshore-wind discussions.',
      who: '574 federally-recognized tribes in the US, ~100 million acres of tribal land — much of it with strong renewable resources.',
      action: 'Tribal-owned utilities + microgrids. Tribal-priority transmission queues. The Department of Energy\'s Office of Indian Energy supports tribal projects.',
      source: 'Native Renewables; Office of Indian Energy (energy.gov/indianenergy)' },
    { id: 'procedural', icon: '🗳️', title: 'Procedural justice — who\'s at the table',
      what: 'When state PUCs, regional grid operators, and utility boards make billion-dollar decisions, who\'s in the room? Historically: utility execs, large industrial customers, big-NGO lawyers. Often missing: residential ratepayers, small-business owners, Indigenous nations, environmental-justice orgs.',
      who: 'Most US PUCs are appointed; some are elected (Georgia, Oklahoma). State PUCs vary wildly in how seriously they treat justice considerations.',
      action: 'Maine PUC has begun including equity in rate-case docket questions. Several states (NY, CA, IL, NJ) now require justice analysis in major proceedings. Citizen intervenor funding (where available) lets advocacy groups participate professionally.',
      source: 'NARUC Equity Issues Group; Maine Office of the Public Advocate' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.16: TEACHER GUIDE — make this usable in classrooms
  // NGSS alignment + discussion prompts + hands-on activities + pacing.
  // Aaron's audience includes both students and teachers.
  // ─────────────────────────────────────────────────────────
  var NGSS_ALIGNMENT = [
    { source: 'Solar PV',     standards: 'MS-PS3-3 (energy transfer), HS-PS4-3 (waves & EM radiation), HS-ETS1 (engineering design)' },
    { source: 'Wind',         standards: 'MS-PS3-3 (kinetic energy), HS-PS3-1 (energy conservation), HS-ETS1' },
    { source: 'Hydro',        standards: 'MS-PS3-2 (potential energy), HS-PS3-1 (energy conservation)' },
    { source: 'Geothermal',   standards: 'MS-ESS3-1 (Earth\'s resources), HS-ESS3-1 (Earth\'s mineral & energy resources)' },
    { source: 'Storage',      standards: 'HS-PS1-4 (chemical reactions release/store energy), HS-ETS1' },
    { source: 'Smart Grid',   standards: 'HS-ESS3-2 (cost-benefit), HS-ETS1 (engineering tradeoffs)' },
    { source: 'Climate Justice', standards: 'HS-ETS1-3 (criteria + constraints in design), Cross-cutting: science, technology, society & environment' }
  ];
  var DISCUSSION_PROMPTS = [
    { source: 'Solar PV', prompts: [
      'If solar panels work better in cold weather, why doesn\'t Antarctica have huge solar arrays?',
      'Your roof faces east-west, not south. What\'s the trade-off vs a south-facing roof?',
      'Why do utility solar farms cover their panels with tracking mounts that follow the sun, but home solar usually doesn\'t?'
    ] },
    { source: 'Wind', prompts: [
      'A turbine\'s power scales with v³. If a site has half the wind speed of another, how much MORE rotor area does it need to make the same power?',
      'Why are offshore wind turbines so much bigger than land-based ones?',
      'Is "wind takes up too much land" a strong argument? Why or why not?'
    ] },
    { source: 'Hydro', prompts: [
      'Your stream has 3 m of head and 0.5 m³/s flow. Is microhydro practical? Use the formula.',
      'What ecological tradeoffs come with damming a river? What are run-of-river designs?',
      'Why is most of US hydro 50+ years old, with very few new dams being built?'
    ] },
    { source: 'Energy Mix', prompts: [
      'Design a 100% renewable mix for your state. What\'s the hardest constraint to satisfy?',
      'If transmission lines could be built instantly with no opposition, would that change your mix?',
      'Should we count nuclear as part of "clean energy"? Argue both sides.'
    ] },
    { source: 'Climate Justice', prompts: [
      'Whose backyard should host the next wind farm? How would you decide?',
      'A coal plant in your community is closing. What does a "just transition" look like for the 200 workers?',
      'When a utility raises rates to pay for grid upgrades, who pays the most as a % of income?'
    ] }
  ];
  var HANDS_ON_ACTIVITIES = [
    { id: 'kidwind', name: 'KidWind Challenge: build a wind turbine',
      grade: '5–12',
      what: 'Students design and build small wind turbines with provided generator + materials. Annual KidWind Challenge competition (regional + national). $50–200 / kit.',
      url: 'https://www.kidwind.org' },
    { id: 'lemon', name: 'Lemon battery + voltmeter',
      grade: 'K–5',
      what: 'Lemons + zinc nails + copper coins → working battery (~0.9V). Hooks intuition for electrochemical energy. Costs <$5 / class.',
      url: null },
    { id: 'parabolic', name: 'Aluminum foil + cardboard parabolic dish solar cooker',
      grade: '3–8',
      what: 'Build a parabolic solar cooker from cardboard + foil. Cook a hot dog or melt chocolate. Mirrors CSP (Concentrated Solar Power) physics. <$10 / station.',
      url: null },
    { id: 'foamblade', name: 'Foam-board wind blade design lab',
      grade: '4–10',
      what: 'Test different blade pitches, lengths, and counts on a fan-driven generator. Measure RPM + voltage. Connects to Betz limit + cube law.',
      url: 'https://www.kidwind.org/curriculum' },
    { id: 'pelton', name: '3D-printed Pelton wheel under a faucet',
      grade: '6–12',
      what: 'Print or buy a small Pelton wheel; spin it under a faucet at different flow rates. Measure RPM. Visceral understanding of hydropower head + flow.',
      url: 'https://www.thingiverse.com (search "pelton wheel")' },
    { id: 'audit', name: 'Home energy audit',
      grade: '6–12',
      what: 'Students audit one room of their home — count loads, calculate kWh/month from appliance labels, compare to utility bill. Ties to capacity factor + LCOE.',
      url: 'https://www.energy.gov/energysaver/diy-home-energy-assessments' },
    { id: 'pvled', name: 'PV cell + LED demonstrator',
      grade: '3–8',
      what: 'Small solar cell ($2) + LED. Move it under different lights — sunshine, cloudy, fluorescent — see the LED brightness change.',
      url: null },
    { id: 'pumpedhydro', name: 'Pumped hydro demonstrator (water bottles + tubing)',
      grade: '5–10',
      what: 'Two water bottles at different heights, peristaltic pump, small generator. Charge by pumping up; discharge by letting water flow down. Models grid storage.',
      url: null }
  ];
  var TEACHER_PACING = [
    { id: '1week', label: '1-week unit', sequence: 'Day 1: Menu + Compare table. Day 2: Source modules (4 sources, jigsaw). Day 3: Mix Designer + storage. Day 4: Maine Home Solar calc + Diagrams. Day 5: Quiz + AI Practice.' },
    { id: '2week', label: '2-week unit', sequence: 'Week 1 same as 1-week unit, slower. Week 2 adds Smart Grid + Heat Pumps + Plant Tour + Climate Justice + Career Pathways.' },
    { id: 'semester', label: 'Semester elective', sequence: 'Module per week + cross-curriculum: Pair Energy Mix Designer with civics Climate Justice. Include 2-3 hands-on activities. Capstone: AI Practice scenarios + presentations.' },
    { id: 'unit-substitute', label: 'Substitute teacher day', sequence: 'Recognize → Compare → Quiz. Three modules students can run mostly independently. Pre-print the Diagrams page as a worksheet.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5.17: TAKE ACTION — bridge from knowledge to agency
  // Aaron's tools generally try to land at "what can I do about it?". The
  // Renewables Lab needs that capstone. Concrete actions across four scales:
  // home, school, community, civic.
  // ─────────────────────────────────────────────────────────
  var TAKE_ACTION = {
    home: [
      { id: 'audit', icon: '🔍', what: 'Audit your home energy use',
        how: 'Walk through your home with the DOE\'s DIY audit checklist. Note every always-on device (router, fridge, idle TVs); read your meter at the start + end of a week. Compare to your bill.',
        impact: 'Most homes find 10–25% of usage in "phantom load" — eliminating it is a $200–500/yr saver with zero behavior change.',
        url: 'https://www.energy.gov/energysaver/diy-home-energy-assessments' },
      { id: 'phantom', icon: '🔌', what: 'Kill phantom loads',
        how: 'Smart power strips ($15–30) for entertainment + computer setups. Unplug chargers when not in use. Switch off the basement freezer if half-empty.',
        impact: 'Phantom load = ~5–10% of US residential electricity. Free hardware-store fix.',
        url: null },
      { id: 'leds', icon: '💡', what: 'Replace any remaining incandescent / halogen bulbs with LED',
        how: 'Hardware store LEDs are $2–4 each, last 15–25 years, use ~85% less power than incandescents.',
        impact: 'Each LED swap saves ~$5–10/yr per bulb. 20-bulb home: $100–200/yr.',
        url: null },
      { id: 'thermostat', icon: '🌡️', what: 'Get a smart / programmable thermostat',
        how: 'ENERGY STAR-certified models start at ~$80. Set back 5–10°F at night and when away. Time-of-use rates? Pre-cool / pre-heat in the cheap window.',
        impact: 'Programmable thermostat saves ~10% on heating + cooling. Smart thermostat with TOU rates can save 20%+.',
        url: 'https://www.energystar.gov/products/heating_cooling/programmable_thermostats' }
    ],
    school: [
      { id: 'energyclub', icon: '👥', what: 'Start (or join) an energy / environment club',
        how: 'Track the school\'s monthly utility bills. Identify top energy hogs. Propose a pilot — solar panel demo, lighting upgrade, school garden, bike-to-school day.',
        impact: 'Visible, low-cost, builds civic muscle. Many schools have unused EE budgets students can unlock.',
        url: null },
      { id: 'auditschool', icon: '📋', what: 'Audit ONE school system',
        how: 'Pick the cafeteria, the gym lights, or computer lab. Use a Kill-A-Watt meter ($25 from a library or buy-and-share). Document. Present findings to admin.',
        impact: 'Real numbers move admin where vague concerns don\'t.',
        url: 'https://www.energy.gov/eere/femp/operations-and-maintenance' },
      { id: 'kidwind', icon: '🌬️', what: 'Run a KidWind challenge',
        how: 'Order or build a KidWind kit ($50–200). Compete in regional + national challenges (in-person + virtual divisions).',
        impact: 'Hands-on engineering. Looks great on transcripts. Some students go to NYC / DC for nationals.',
        url: 'https://www.kidwind.org' },
      { id: 'climate-action-plan', icon: '🎯', what: 'Help your school write a Climate Action Plan',
        how: 'Many districts are required to have one but few do it well. Volunteer to review. Bring data + ideas, not just outrage.',
        impact: 'A school CAP becomes a public document — turns "we should" into "we will, by Year X."',
        url: null }
    ],
    community: [
      { id: 'eff-maine', icon: '🌲', what: '(Maine) Get an Efficiency Maine home assessment',
        how: 'Free or low-cost professional energy audit. Available to renters with landlord permission. Includes thermal imaging.',
        impact: 'Identifies the biggest fixes for YOUR house. Often qualifies for $1,000–8,000+ in rebates.',
        url: 'https://www.efficiencymaine.com/at-home/home-energy-savings-program' },
      { id: 'community-solar', icon: '☀️', what: 'Subscribe to community solar',
        how: 'You don\'t need a roof. Subscribe to a local community solar farm; your share offsets your electric bill.',
        impact: '5–15% bill reduction with no upfront cost. Available in 22 US states + DC.',
        url: 'https://www.energysage.com/community-solar/' },
      { id: 'tool-library', icon: '🛠️', what: 'Start or use a tool library',
        how: 'Many cities have free / borrow-fee tool libraries. Saves households from buying expensive tools they use once.',
        impact: 'Reduces embodied energy of stuff. Builds neighborhood ties.',
        url: 'https://localtools.org' },
      { id: 'mutual-aid', icon: '🤝', what: 'Connect to a mutual-aid network',
        how: 'During heat waves, ice storms, blackouts — neighbors helping neighbors saves lives. Find or join your local network.',
        impact: 'Maine winters + an aging electric grid = real need. Resilience is local.',
        url: 'https://www.mutualaidhub.org' }
    ],
    civic: [
      { id: 'puc', icon: '🏛️', what: 'Comment on your state PUC dockets',
        how: 'Maine PUC posts open dockets at maine.gov/mpuc. Anyone can file a public comment online. Format: name, address, docket number, your point in 1-2 paragraphs.',
        impact: 'PUCs decide rate cases, transmission projects, net-metering rules. Few citizens comment — yours stands out.',
        url: 'https://www.maine.gov/mpuc' },
      { id: 'school-board', icon: '🪑', what: 'Speak at a school-board meeting',
        how: 'Open public-comment periods are required by law. Sign up to speak (3 min typical). Bring a single specific ask: "Approve the solar feasibility study," "Adopt a Climate Action Plan."',
        impact: 'Local boards often hear from very few students. One specific, sourced request can shift a vote.',
        url: null },
      { id: 'rep', icon: '✉️', what: 'Write to your state legislator',
        how: 'Find your Maine rep at legislature.maine.gov/house. Hand-written letters or phone calls weighted heavier than form emails. Be specific about the bill or issue.',
        impact: 'Most Maine legislators get only a few constituent contacts per week. You will be heard.',
        url: 'https://legislature.maine.gov' },
      { id: 'vote', icon: '🗳️', what: 'When eligible, vote in EVERY election',
        how: 'Federal, state, AND local. Local PUC commissioners + town council members make ~70% of the energy decisions that affect your bill, even if national news barely covers them.',
        impact: 'Maine has ranked-choice voting + same-day registration. Voting infrastructure is excellent.',
        url: 'https://www.maine.gov/sos/cec/elec' }
    ]
  };
  var ACTION_BANNERS = {
    starter: 'New to action? Pick ONE box. Doing one thing well beats half-doing four.',
    momentum: 'Already engaged? Stack actions across scales — home + school + civic compounds.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 5.18: PRINT PACK options + html builder
  // Teachers consistently want printable handouts. This bundles selected
  // content into a self-contained window the user can File→Print.
  // ─────────────────────────────────────────────────────────
  var PRINT_OPTIONS = [
    { id: 'sources', label: 'All 8 source-module key facts (1 page)', kind: 'sourceCards' },
    { id: 'compare', label: 'Comparison table (capacity factor + LCOE + CO₂)', kind: 'compare' },
    { id: 'glossary', label: 'Glossary (18 terms)', kind: 'glossary' },
    { id: 'myths',   label: 'Common myths corrected (7)', kind: 'myths' },
    { id: 'quiz',    label: 'Quiz (18 questions, no answer key)', kind: 'quizQ' },
    { id: 'quizKey', label: 'Quiz answer key (with explanations)', kind: 'quizA' },
    { id: 'ngss',    label: 'NGSS alignment (for lesson planning)', kind: 'ngss' },
    { id: 'activities', label: 'Hands-on activities list', kind: 'activities' }
  ];
  // Render selected sections to a self-contained HTML string.
  function buildPrintPackHtml(selected) {
    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    var parts = [];
    parts.push('<!doctype html><html><head><meta charset="utf-8"><title>Renewables Lab — Print Pack</title>');
    parts.push('<style>');
    parts.push('body{font-family:Georgia,serif;line-height:1.5;color:#111;max-width:740px;margin:24px auto;padding:0 20px;}');
    parts.push('h1{border-bottom:3px solid #16a34a;padding-bottom:6px;font-size:24px;}');
    parts.push('h2{margin-top:32px;color:#065f46;font-size:18px;border-bottom:1px solid #ccc;padding-bottom:4px;}');
    parts.push('h3{margin-top:20px;color:#0f172a;font-size:15px;}');
    parts.push('table{border-collapse:collapse;width:100%;font-size:11px;margin:8px 0;}');
    parts.push('th,td{border:1px solid #999;padding:5px 7px;text-align:left;}');
    parts.push('th{background:#f1f5f9;}');
    parts.push('.card{border:1px solid #ccc;padding:10px 12px;margin:8px 0;border-radius:4px;break-inside:avoid;}');
    parts.push('.dim{color:#666;font-size:11px;font-style:italic;}');
    parts.push('.box{background:#f0fdf4;border-left:3px solid #16a34a;padding:8px 12px;margin:8px 0;font-size:12px;}');
    parts.push('@media print{body{margin:0;}a{text-decoration:none;color:#000;}}');
    parts.push('@page{margin:0.6in;}');
    parts.push('</style></head><body>');
    parts.push('<h1>⚡ Renewables Lab — Print Pack</h1>');
    parts.push('<div class="dim">Generated ' + new Date().toLocaleDateString() + ' · From AlloFlow Renewables Lab · Educational use.</div>');

    // Source cards
    if (selected.sources) {
      parts.push('<h2>Renewable energy sources at a glance</h2>');
      ['solarPv', 'wind', 'hydro', 'geothermal', 'solarThermal', 'waveTidal', 'biomass', 'storage'].forEach(function(k) {
        var c = SOURCE_CARDS[k]; if (!c) return;
        parts.push('<div class="card">');
        parts.push('<h3>' + esc(c.icon) + ' ' + esc(c.name) + '</h3>');
        parts.push('<div class="dim">Principle: ' + esc(c.principle) + '</div>');
        parts.push('<p>' + esc(c.oneLiner) + '</p>');
        parts.push('<div class="dim">CF: ' + esc(c.capacityFactor) + ' · LCOE: ' + esc(c.lcoe) + '</div>');
        parts.push('</div>');
      });
    }

    // Compare table
    if (selected.compare) {
      parts.push('<h2>Comparison table</h2>');
      parts.push('<table><thead><tr>');
      ['Source', 'CF', 'LCOE $/MWh', 'Land', 'Water', 'CO₂ g/kWh', 'Dispatch'].forEach(function(c) {
        parts.push('<th>' + esc(c) + '</th>');
      });
      parts.push('</tr></thead><tbody>');
      COMPARE_TABLE.forEach(function(r) {
        parts.push('<tr>');
        parts.push('<td>' + esc(r.icon) + ' ' + esc(r.name) + '</td>');
        parts.push('<td>' + esc(r.cf) + '</td>');
        parts.push('<td>' + esc(r.lcoe) + '</td>');
        parts.push('<td>' + esc(r.land) + '</td>');
        parts.push('<td>' + esc(r.water) + '</td>');
        parts.push('<td>' + esc(r.co2) + '</td>');
        parts.push('<td>' + r.dispatch + '/5</td>');
        parts.push('</tr>');
      });
      parts.push('</tbody></table>');
      parts.push('<div class="dim">Sources: NREL ATB 2024, IPCC AR6 WG3, Macknick 2012, Hertwich 2015.</div>');
    }

    // Glossary
    if (selected.glossary) {
      parts.push('<h2>Glossary</h2>');
      GLOSSARY.forEach(function(g) {
        parts.push('<div class="card"><h3>' + esc(g.term) + '</h3><p>' + esc(g.def) + '</p></div>');
      });
    }

    // Myths
    if (selected.myths) {
      parts.push('<h2>Common myths corrected</h2>');
      MYTHS.forEach(function(m) {
        parts.push('<div class="card">');
        parts.push('<h3>❌ Myth: ' + esc(m.myth) + '</h3>');
        parts.push('<p><strong>✓ Truth:</strong> ' + esc(m.truth) + '</p>');
        parts.push('<div class="dim">Source: ' + esc(m.source) + '</div>');
        parts.push('</div>');
      });
    }

    // Quiz (questions only)
    if (selected.quizQ) {
      parts.push('<h2>Quiz (18 questions)</h2>');
      QUIZ.forEach(function(q, i) {
        parts.push('<div class="card">');
        parts.push('<p><strong>' + (i + 1) + '.</strong> ' + esc(q.icon) + ' ' + esc(q.stem) + '</p>');
        parts.push('<ol type="A" style="margin:4px 0 0 18px;">');
        q.choices.forEach(function(c) { parts.push('<li>' + esc(c) + '</li>'); });
        parts.push('</ol>');
        parts.push('</div>');
      });
    }

    // Quiz answer key
    if (selected.quizA) {
      parts.push('<h2>Quiz answer key + explanations</h2>');
      QUIZ.forEach(function(q, i) {
        var letter = String.fromCharCode(65 + q.correct);
        parts.push('<div class="card">');
        parts.push('<p><strong>' + (i + 1) + '. Correct answer: ' + letter + ')</strong> ' + esc(q.choices[q.correct]) + '</p>');
        parts.push('<div class="box">' + esc(q.why) + '</div>');
        parts.push('</div>');
      });
    }

    // NGSS alignment
    if (selected.ngss) {
      parts.push('<h2>NGSS alignment (lesson planning)</h2>');
      parts.push('<table><thead><tr><th>Module</th><th>Standards</th></tr></thead><tbody>');
      NGSS_ALIGNMENT.forEach(function(r) {
        parts.push('<tr><td>' + esc(r.source) + '</td><td>' + esc(r.standards) + '</td></tr>');
      });
      parts.push('</tbody></table>');
    }

    // Activities
    if (selected.activities) {
      parts.push('<h2>Hands-on activities</h2>');
      HANDS_ON_ACTIVITIES.forEach(function(a) {
        parts.push('<div class="card">');
        parts.push('<h3>' + esc(a.name) + ' <span class="dim">(grades ' + esc(a.grade) + ')</span></h3>');
        parts.push('<p>' + esc(a.what) + '</p>');
        if (a.url) parts.push('<div class="dim">' + esc(a.url) + '</div>');
        parts.push('</div>');
      });
    }

    parts.push('<hr style="margin-top:32px;border:none;border-top:1px solid #ccc;">');
    parts.push('<div class="dim" style="text-align:center;">Renewables Lab — part of AlloFlow STEAM Lab. Sources cited: NREL, IEA, IRENA, EIA, BOEM, IPCC. Educational only.</div>');
    parts.push('</body></html>');
    return parts.join('');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────

  // Deterministic, hourly classroom model. Inputs are illustrative, not a
  // reconstruction of the US grid. GW over a one-hour interval equals GWh.
  var RN_REGIONS = [
    {id:'west',name:'Pacific',x:-7,z:0,weight:.17,sun:.95,wind:.8,offset:-3,solar:.23,turbines:.12,hydro:.34},
    {id:'mountain',name:'Mountain',x:-3.6,z:-.4,weight:.10,sun:1.08,wind:1.08,offset:-2,solar:.22,turbines:.17,hydro:.17},
    {id:'plains',name:'Great Plains',x:0,z:-.4,weight:.13,sun:.96,wind:1.3,offset:-1,solar:.13,turbines:.32,hydro:.10},
    {id:'texas',name:'South Central',x:0,z:3.4,weight:.16,sun:1.02,wind:1.1,offset:-1,solar:.16,turbines:.20,hydro:.04},
    {id:'northeast',name:'Northeast',x:6,z:-.7,weight:.23,sun:.79,wind:.85,offset:0,solar:.12,turbines:.12,hydro:.20},
    {id:'southeast',name:'Southeast',x:5.4,z:3.2,weight:.21,sun:.9,wind:.55,offset:0,solar:.14,turbines:.07,hydro:.15}
  ];

  var RN_DEFAULT = {year:2035,solarBuild:25,windBuild:18,batteryBuild:10,duration:4,transmission:25,retirement:4,growth:1,efficiency:8,weather:'fair',season:'summer',
    hours:72,transferLoss:3,flexDemand:0,reserve:0,outageRegion:'none',outageStart:24,outageHours:24};
  function rnNumber(v,fallback,min,max) { return typeof v==='number'&&isFinite(v)?Math.max(min,Math.min(max,v)):fallback; }
  function rnSettings(input) {
    input=input&&typeof input==='object'?input:{};
    var limits={year:[2025,2050],solarBuild:[0,80],windBuild:[0,60],batteryBuild:[0,40],duration:[1,24],transmission:[0,100],retirement:[0,16],growth:[0,3],efficiency:[0,30],transferLoss:[0,15],flexDemand:[0,30],reserve:[0,50]},s={};
    Object.keys(limits).forEach(function(k){s[k]=rnNumber(input[k],RN_DEFAULT[k],limits[k][0],limits[k][1]);});
    s.year=Math.round(s.year);
    s.weather=['fair','lull','heatwave'].indexOf(input.weather)>=0?input.weather:RN_DEFAULT.weather;
    s.season=['summer','winter','spring'].indexOf(input.season)>=0?input.season:RN_DEFAULT.season;
    s.hours=input.hours===168?168:72;
    s.outageRegion=RN_REGIONS.some(function(r){return r.id===input.outageRegion;})?input.outageRegion:'none';
    s.outageStart=Math.round(rnNumber(input.outageStart,24,0,s.hours-1));
    s.outageHours=Math.round(rnNumber(input.outageHours,Math.min(24,s.hours-s.outageStart),1,Math.min(72,s.hours-s.outageStart)));
    s.siting={};
    RN_REGIONS.forEach(function(r){
      var raw=input.siting&&input.siting[r.id]||{},v={};
      ['solar','wind','battery'].forEach(function(k){v[k]=rnNumber(raw[k],100,0,300);});
      s.siting[r.id]=v;
    });
    return s;
  }
  function rnPortfolio(input) {
    var s=rnSettings(input),years=s.year-2025;
    var cap={solar:240+years*s.solarBuild,wind:160+years*s.windBuild,hydro:80,nuclear:95,fossil:Math.max(0,550-years*s.retirement),
      batteryPower:30+years*s.batteryBuild,batteryEnergy:(30+years*s.batteryBuild)*s.duration,
      demand:500*Math.pow(1+s.growth/100,years)*(1-s.efficiency/100),link:s.transmission};
    var keys={solar:'solar',wind:'turbines',battery:'weight'},shares={};
    Object.keys(keys).forEach(function(k){
      var sum=RN_REGIONS.reduce(function(n,r){return n+r[keys[k]]*s.siting[r.id][k];},0);
      shares[k]=RN_REGIONS.map(function(r){return sum>0?r[keys[k]]*s.siting[r.id][k]/sum:r[keys[k]];});
    });
    cap.regions=RN_REGIONS.map(function(r,i){
      var power=30*r.weight+years*s.batteryBuild*shares.battery[i];
      return {id:r.id,solar:240*r.solar+years*s.solarBuild*shares.solar[i],wind:160*r.turbines+years*s.windBuild*shares.wind[i],
        hydro:80*r.hydro,nuclear:95*r.weight,fossil:cap.fossil*r.weight,batteryPower:power,batteryEnergy:power*s.duration,
        newSolarShare:shares.solar[i],newWindShare:shares.wind[i],newBatteryShare:shares.battery[i]};
    });
    return cap;
  }
  function rnDemandShape(hour) {
    return .78+.20*Math.exp(-Math.pow((hour-8)/3,2))+.38*Math.exp(-Math.pow((hour-19)/4,2));
  }
  function rnSimulate(input) {
    var s=rnSettings(input),cap=rnPortfolio(s),eta=Math.sqrt(.88),wireEfficiency=1-s.transferLoss/100;
    var batteries=RN_REGIONS.map(function(){return {energy:0,renewable:0};});
    var evening=0;for(var eh=17;eh<=21;eh++)evening+=rnDemandShape(eh);
    var movedPerMiddayHour=evening*s.flexDemand/100/5;
    var totals={demand:0,renewable:0,nuclear:0,fossil:0,charge:0,discharge:0,loss:0,curtail:0,unmet:0,servedRenewable:0,transfer:0,transmissionLoss:0,shifted:0,reserveRelease:0};
    var hours=[],gapHours=0,longestGap=0,streak=0,worstHour=0,peakUnmet=0,peakFossil=0,peakFossilHour=0;
    for(var t=0;t<s.hours;t++) {
      var rows=RN_REGIONS.map(function(r,i) {
        var rc=cap.regions[i],localHour=((t+r.offset)%24+24)%24;
        var daylight=s.season==='winter'?9:s.season==='summer'?15:12,sunrise=12-daylight/2;
        var sun=localHour<sunrise||localHour>sunrise+daylight?0:Math.max(0,Math.sin(Math.PI*(localHour-sunrise)/daylight));
        var solarFactor=Math.min(1,sun*r.sun*(s.weather==='lull'?.32:.9));
        var windFactor=Math.max(.02,Math.min(.85,(.34+.14*Math.sin(t*.21+i*1.4)+.08*Math.cos(t*.53+i))*r.wind*(s.weather==='lull'?.23:s.weather==='heatwave'?.65:1)));
        var rawShape=rnDemandShape(localHour),shape=rawShape;
        if(localHour>=17&&localHour<=21)shape*=1-s.flexDemand/100;
        if(localHour>=10&&localHour<=14)shape+=movedPerMiddayHour;
        var demandScale=cap.demand*r.weight*(s.weather==='heatwave'?1.20:1)*(s.season==='winter'?1.08:1);
        var demand=shape*demandScale,solar=rc.solar*solarFactor,wind=rc.wind*windFactor,hydro=rc.hydro*(s.season==='spring'?.65:.45);
        var nuclear=rc.nuclear*.9,renewable=solar+wind+hydro,generation=renewable+nuclear;
        var direct=Math.min(demand,generation),fraction=generation>0?renewable/generation:0;
        var offline=r.id===s.outageRegion&&t>=s.outageStart&&t<s.outageStart+s.outageHours;
        return {id:r.id,demand:demand,originalDemand:rawShape*demandScale,shifted:Math.max(0,(rawShape-shape)*demandScale),
          solar:solar,wind:wind,hydro:hydro,renewable:renewable,nuclear:nuclear,sun:solarFactor,windFactor:windFactor,
          direct:direct,servedRenewable:direct*fraction,surplus:Math.max(0,generation-demand),shortage:Math.max(0,demand-generation),renFraction:fraction,
          imports:0,exports:0,charge:0,discharge:0,loss:0,curtail:0,unmet:0,fossil:0,battery:0,transmissionLoss:0,reserveRelease:0,
          batteryCapacity:rc.batteryEnergy,batteryPower:rc.batteryPower,link:offline?0:cap.link,linkOffline:offline};
      });
      // The transfer loss is applied once, end-to-end, to gross exports.
      var offered=rows.reduce(function(v,r){return v+Math.min(r.surplus,r.link);},0);
      var wanted=rows.reduce(function(v,r){return v+Math.min(r.shortage,r.link);},0);
      var transfer=Math.min(offered*wireEfficiency,wanted),renPool=0;
      rows.forEach(function(r){
        r.exports=offered>0?transfer/wireEfficiency*Math.min(r.surplus,r.link)/offered:0;
        r.transmissionLoss=r.exports*(1-wireEfficiency);
        renPool+=r.exports*wireEfficiency*r.renFraction;r.surplus=Math.max(0,r.surplus-r.exports);
      });
      rows.forEach(function(r,i){
        r.imports=wanted>0?transfer*Math.min(r.shortage,r.link)/wanted:0;
        r.shortage=Math.max(0,r.shortage-r.imports);
        r.servedRenewable+=transfer>0?r.imports*renPool/transfer:0;
        var b=batteries[i];
        function discharge(limit){
          var delivered=Math.max(0,Math.min(r.shortage,r.batteryPower-r.discharge,limit*eta));
          var renewableFraction=b.energy>0?b.renewable/b.energy:0;
          r.servedRenewable+=delivered*renewableFraction;
          b.energy=Math.max(0,b.energy-delivered/eta);b.renewable=Math.max(0,b.renewable-delivered/eta*renewableFraction);
          r.loss+=delivered/eta-delivered;r.shortage=Math.max(0,r.shortage-delivered);r.discharge+=delivered;
          return delivered;
        }
        if(r.surplus>0){
          r.charge=Math.max(0,Math.min(r.surplus,r.batteryPower,(r.batteryCapacity-b.energy)/eta));
          b.energy+=r.charge*eta;b.renewable+=r.charge*eta*r.renFraction;
          r.loss=r.charge*(1-eta);r.curtail=Math.max(0,r.surplus-r.charge);
        }else if(r.shortage>0){
          discharge(Math.max(0,b.energy-r.batteryCapacity*s.reserve/100));
        }
        r.fossil=Math.min(r.shortage,cap.regions[i].fossil);
        r.shortage=Math.max(0,r.shortage-r.fossil);
        // Reserve is available for shortages, still within the battery power limit.
        if(r.shortage>0&&b.energy>0&&r.charge===0)r.reserveRelease=discharge(b.energy);
        r.unmet=r.shortage;r.battery=b.energy;
        r.linkCongested=!r.linkOffline&&r.link>0&&(r.imports>=r.link-1e-6||r.exports>=r.link-1e-6);
      });
      var hour={hour:t,regions:rows,transfer:transfer,battery:0};
      Object.keys(totals).filter(function(k){return k!=='transfer';}).forEach(function(k){
        hour[k]=rows.reduce(function(v,r){return v+(r[k]||0);},0);totals[k]+=hour[k];
      });
      hour.battery=rows.reduce(function(v,r){return v+r.battery;},0);
      if(hour.unmet>1e-6){gapHours++;streak++;}else streak=0;
      longestGap=Math.max(longestGap,streak);
      if(hour.unmet>peakUnmet){peakUnmet=hour.unmet;worstHour=t;}
      if(hour.fossil>peakFossil){peakFossil=hour.fossil;peakFossilHour=t;}
      totals.transfer+=transfer;hours.push(hour);
    }
    totals.renewableShare=totals.demand?100*totals.servedRenewable/totals.demand:0;
    totals.demandMet=totals.demand?100*(1-totals.unmet/totals.demand):100;
    totals.endBattery=hours[hours.length-1].battery;
    Object.assign(totals,{gapHours:gapHours,longestGap:longestGap,peakUnmet:peakUnmet,worstHour:worstHour,peakFossil:peakFossil,peakFossilHour:peakFossilHour});
    var regionTotals=RN_REGIONS.map(function(r,i){
      var sum={id:r.id,name:r.name,demand:0,unmet:0,servedRenewable:0,imports:0,exports:0,curtail:0,fossil:0,congestedHours:0,offlineHours:0};
      hours.forEach(function(hour){var row=hour.regions[i];
        ['demand','unmet','servedRenewable','imports','exports','curtail','fossil'].forEach(function(k){sum[k]+=row[k];});
        if(row.linkCongested)sum.congestedHours++;if(row.linkOffline)sum.offlineHours++;
      });
      sum.renewableShare=100*sum.servedRenewable/sum.demand;return sum;
    });
    return {version:2,settings:s,capacity:cap,hours:hours,totals:totals,regionTotals:regionTotals};
  }
  var RN_STRESS_CASES=[
    {id:'summer',label:'Summer variability',patch:{season:'summer',weather:'fair',outageRegion:'none'}},
    {id:'winter',label:'Winter renewable lull',patch:{season:'winter',weather:'lull',outageRegion:'none'}},
    {id:'heat',label:'Summer heat wave',patch:{season:'summer',weather:'heatwave',outageRegion:'none'}},
    {id:'outage',label:'Northeast link outage',patch:{season:'summer',weather:'fair',outageRegion:'northeast',outageStart:48,outageHours:48}}
  ];
  function rnStressSuite(input){
    var s=rnSettings(input);
    return RN_STRESS_CASES.map(function(c){
      var run=rnSimulate(Object.assign({},s,c.patch,{hours:168}));
      return {id:c.id,label:c.label,settings:run.settings,totals:run.totals};
    });
  }

  var RN_SWEEP_VARIABLES=[
    {key:'solarBuild',label:'New solar',unit:'GW/yr',values:[0,20,40,60,80]},
    {key:'windBuild',label:'New wind',unit:'GW/yr',values:[0,15,30,45,60]},
    {key:'batteryBuild',label:'New battery power',unit:'GW/yr',values:[0,10,20,30,40]},
    {key:'duration',label:'Battery duration',unit:'h',values:[1,4,8,12,24]},
    {key:'transmission',label:'Link capacity per region',unit:'GW',values:[0,25,50,75,100]},
    {key:'flexDemand',label:'Evening demand shifted to midday',unit:'%',values:[0,5,10,20,30]},
    {key:'efficiency',label:'Demand reduction',unit:'%',values:[0,5,10,20,30]},
    {key:'reserve',label:'Storage reserve target',unit:'%',values:[0,10,20,35,50]}
  ];
  function rnSweep(input,variable){
    var spec=RN_SWEEP_VARIABLES.find(function(v){return v.key===variable;});
    if(!spec)return null;
    var base=rnSimulate(input),s=base.settings;
    var values=spec.values.concat([s[variable]]).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
    return {variable:variable,label:spec.label,unit:spec.unit,baseline:{settings:s,totals:base.totals},items:values.map(function(value){
      var patch={};patch[variable]=value;var run=value===s[variable]?base:rnSimulate(Object.assign({},s,patch));
      return {value:value,settings:run.settings,totals:run.totals,delta:{
        fossil:run.totals.fossil-base.totals.fossil,unmet:run.totals.unmet-base.totals.unmet,
        curtail:run.totals.curtail-base.totals.curtail,renewableShare:run.totals.renewableShare-base.totals.renewableShare}};
    })};
  }
  function rnSweepFresh(study,input,variable){
    if(!study||study.variable!==variable||!study.baseline)return false;
    var s=rnSettings(input);s[variable]=study.baseline.settings[variable];
    return JSON.stringify(s)===JSON.stringify(study.baseline.settings);
  }
  var RN_CHALLENGES=[
    {id:'evening',title:'Carry solar into the evening',description:'A solar-heavy build spills midday energy and leaves an evening gap. Improve storage and demand timing without adding generation.',
      baseline:{year:2050,solarBuild:65,windBuild:8,batteryBuild:5,duration:2,transmission:10,retirement:10},
      allowed:['batteryBuild','duration','flexDemand','transmission'],
      targets:[{metric:'fossil',label:'Cut fossil use by at least 40%',relative:.60,unit:'GWh',direction:'max'},
        {metric:'unmet',label:'Cut unserved energy by at least 80%',relative:.20,unit:'GWh',direction:'max'}]},
    {id:'connections',title:'Share the regional surplus',description:'The regions start disconnected. Keep the same generation and storage fleet; use the network to share available electricity.',
      baseline:{year:2040,solarBuild:65,windBuild:40,batteryBuild:5,duration:4,transmission:0,retirement:8},
      allowed:['transmission'],
      targets:[{metric:'fossil',label:'Cut fossil use by at least 45%',relative:.55,unit:'GWh',direction:'max'},
        {metric:'gapHours',label:'Cover demand in every test hour',value:0,unit:'h',direction:'max'}]},
    {id:'winter',title:'Prepare for a winter lull',description:'A full week of weak sun and wind meets growing demand and rapid fossil retirement. Find a mix of demand reduction, firm backup, and new construction.',
      baseline:{year:2045,hours:168,weather:'lull',season:'winter',retirement:16,solarBuild:25,windBuild:18,batteryBuild:10,growth:2},
      allowed:['solarBuild','windBuild','batteryBuild','duration','transmission','retirement','efficiency','flexDemand','reserve'],
      targets:[{metric:'demandMet',label:'Serve at least 99% of test demand',value:99,unit:'%',direction:'min'},
        {metric:'renewableShare',label:'Supply at least 35% of demand from renewables',value:35,unit:'%',direction:'min'},
        {metric:'fossil',label:'Use no more fossil energy than the starting plan',relative:1,unit:'GWh',direction:'max'}]}
  ];
  function rnAssessChallenge(id,input,existingRun){
    var challenge=RN_CHALLENGES.find(function(c){return c.id===id;});if(!challenge)return null;
    var reference=rnSimulate(challenge.baseline),run=existingRun||rnSimulate(input),s=run.settings;
    var changed=Object.keys(reference.settings).filter(function(k){return challenge.allowed.indexOf(k)<0&&JSON.stringify(s[k])!==JSON.stringify(reference.settings[k]);});
    var targets=challenge.targets.map(function(t){
      var target=t.relative==null?t.value:reference.totals[t.metric]*t.relative,value=run.totals[t.metric];
      return {label:t.label,metric:t.metric,unit:t.unit,direction:t.direction,target:target,value:value,
        passed:t.direction==='max'?value<=target+1e-7:value>=target-1e-7};
    });
    return {id:id,valid:changed.length===0,changed:changed,targets:targets,passed:changed.length===0&&targets.every(function(t){return t.passed;}),
      baseline:reference.settings,baselineTotals:reference.totals};
  }
  function rnExplainHour(run,index,id){
    var hour=run.hours[Math.max(0,Math.min(run.hours.length-1,Math.floor(Number(index)||0)))];
    var i=RN_REGIONS.findIndex(function(r){return r.id===id;});if(i<0)i=0;
    var row=hour.regions[i],cap=run.capacity.regions[i],before=hour.hour?run.hours[hour.hour-1].regions[i].battery:0,notes=[];
    function note(code,text){notes.push({code:code,text:text});}
    if(row.sun<1e-8)note('night','Solar output is zero at this local hour. Extra solar capacity cannot supply this hour directly.');
    if(row.linkOffline)note('offline','The regional link is offline. Imports and exports are both zero until the outage ends.');
    else if(row.link===0)note('disconnected','Link capacity is zero. This region must use local generation and storage.');
    else if(row.linkCongested)note('link-limit','The regional link has reached its power limit in this hour.');
    else if(row.fossil+row.unmet>1e-6)note('link-room','The regional link has unused capacity. Imports also depend on surplus and link capacity elsewhere.');
    if(row.fossil+row.unmet>1e-6){
      if(row.discharge>=row.batteryPower-1e-6&&row.battery>1e-6)note('discharge-limit','The battery reaches its discharge power limit while energy remains in storage.');
      if(row.battery<1e-6)note(before<1e-6?'empty-start':'empty-end',before<1e-6?'Storage starts this hour empty. More duration alone would not create stored energy.':'Storage is depleted by the end of this hour.');
      else if(run.settings.reserve>0&&row.battery<=row.batteryCapacity*run.settings.reserve/100+1e-6&&row.reserveRelease<1e-6)
        note('reserve','Remaining stored energy is within the reserve target; routine dispatch uses fossil backup before releasing it.');
    }
    if(row.reserveRelease>1e-6)note('reserve-release','Storage reserve is released because fossil capacity cannot cover the remaining demand.');
    if(row.unmet>1e-6&&row.fossil>=cap.fossil-1e-6)note('fossil-limit','Available fossil capacity is fully used, and some demand is still unserved.');
    if(row.curtail>1e-6){
      if(row.battery>=row.batteryCapacity-1e-6)note('full','The battery reaches its energy capacity. Remaining surplus cannot be stored this hour.');
      if(row.charge>=row.batteryPower-1e-6)note('charge-limit','Charging reaches the battery power limit. More duration does not increase that charging rate.');
      note('curtailment','Surplus remains after regional transfers and battery charging, so the model curtails it.');
    }
    if(!notes.length)note('covered','The modeled dispatch covers local demand in this hour. Compare a different hour or weather test before drawing a wider conclusion.');
    var supply=[{label:'Renewables generated',value:row.renewable},{label:'Nuclear generated',value:row.nuclear},{label:'Fossil generation',value:row.fossil},{label:'Battery discharge',value:row.discharge},{label:'Imports received',value:row.imports}];
    var uses=[{label:'Demand served',value:row.demand-row.unmet},{label:'Battery charging',value:row.charge},{label:'Exports sent',value:row.exports},{label:'Generation curtailed',value:row.curtail}];
    return {hour:hour.hour,region:row.id,notes:notes,supply:supply,uses:uses,storageBefore:before,storageAfter:row.battery,storageLoss:row.loss,
      sourcePower:supply.reduce(function(n,r){return n+r.value;},0),usedPower:uses.reduce(function(n,r){return n+r.value;},0)};
  }

  window.StemLab.renewablesModel={version:2,simulate:rnSimulate,portfolio:rnPortfolio,settings:rnSettings,regions:RN_REGIONS,stressSuite:rnStressSuite,sweep:rnSweep,sweepFresh:rnSweepFresh,sweepVariables:RN_SWEEP_VARIABLES,challenges:RN_CHALLENGES,assessChallenge:rnAssessChallenge,explainHour:rnExplainHour};


  // Individual energy workbenches: teaching models, independent of the national dispatch.
  var RN_ENERGY_SPECS=[
    {id:'solarPv',name:'Solar PV',icon:'☀',lesson:'solarPv',tag:'Light → electricity',primary:'irradiance',
      intro:'Aim a photovoltaic array at incoming sunlight. Change the illuminated area and conversion efficiency, then follow DC power through the inverter.',
      controls:[['irradiance','Direct irradiance',0,1100,50,800,'W/m²'],['area','Panel area',5,100,5,20,'m²'],['efficiency','Module efficiency',10,30,1,20,'%'],['incidence','Angle from the panel normal',0,90,5,20,'°']],
      components:[['resource','Sunlight','The yellow rays represent the direct beam. The projected collecting area decreases with the cosine of the incidence angle.'],['converter','PV array','Semiconductor cells produce DC electricity. The blue array tilts as the incidence control changes.'],['generator','Inverter','The illustrative inverter delivers 96% of the DC power as AC electricity.']],
      formula:'P_AC = irradiance × area × cos(angle) × module efficiency × 0.96 / 1,000',
      limits:'Direct-beam model only: no diffuse sky light, shading, temperature effects, tracking schedule, or inverter clipping. A 90° beam contributes zero. This is not a daily yield estimate.',
      prompt:'Save a reading, then turn the array 60° away from normal. Does output halve?',
      source:'https://www.energy.gov/cmei/systems/how-does-solar-work'},
    {id:'wind',name:'Wind',icon:'🌬',lesson:'wind',tag:'Moving air → rotation',primary:'speed',
      intro:'Explore the rotor, drivetrain, and generator. Wind power grows with speed cubed until the generator rating or protective shutdown limits output.',
      controls:[['speed','Wind speed',0,30,1,8,'m/s'],['radius','Rotor radius',10,80,5,40,'m'],['cp','Rotor power coefficient',10,59,1,40,'%'],['rating','Generator rating',500,8000,500,3000,'kW']],
      components:[['resource','Air stream','The swept disk contains kinetic power proportional to air density, rotor area, and wind speed cubed.'],['converter','Rotor blades','The rotor extracts only a fraction of the stream power. Its displayed radius changes with your input; motion is illustrative, not calculated RPM.'],['generator','Nacelle & generator','The model assumes 94% drivetrain efficiency, starts at 3 m/s, caps at the selected rating, and shuts down at 25 m/s.']],
      formula:'P = min(½ × 1.225 × πr² × v³ × Cₚ × 0.94 / 1,000, rating), for 3 ≤ v < 25 m/s',
      limits:'Uniform wind and a constant selected power coefficient. Cut-in 3 m/s, cut-out 25 m/s, and 94% drivetrain efficiency are teaching assumptions, not a manufacturer power curve. No wakes, gusts, fatigue, or pitch-control dynamics.',
      prompt:'Compare 5 and 10 m/s with a large generator rating. Then test 25 m/s.',
      source:'https://www.energy.gov/sites/prod/files/2015/05/f22/Enabling%20Wind%20Power%20Nationwide_18MAY2015_FINAL.pdf'},
    {id:'hydro',name:'Hydropower',icon:'💧',lesson:'hydro',tag:'Elevated water → rotation',primary:'flow',
      intro:'Follow water from the upper reservoir through a penstock and turbine into the tailrace. Head and flow are separate ways to change available power.',
      controls:[['head','Water head',5,150,5,30,'m'],['flow','Water flow',0,50,1,5,'m³/s'],['efficiency','Turbine and generator efficiency',50,95,1,90,'%']],
      components:[['resource','Upper reservoir','Head is the vertical drop to the tailwater. The reservoir height responds to the head control; the scene uses a compressed vertical scale.'],['converter','Penstock & runner','Flowing water gives up gravitational potential energy to the turbine. Changing flow changes power without changing head.'],['generator','Powerhouse','The combined efficiency represents hydraulic, mechanical, and generator losses. Water exits into the lower tailrace.']],
      formula:'P = 1,000 × 9.81 × head × flow × efficiency / 1,000',
      limits:'Steady head and flow with a combined efficiency. No seasonal inflows, reservoir depletion, environmental releases, fish passage, or transient pressure model. The scene is a cutaway, not a dam design.',
      prompt:'Double flow while holding head fixed, then double head instead. Compare the output ratios.',
      source:'https://www.energy.gov/cmei/water/types-hydropower-plants'},
    {id:'geothermal',name:'Geothermal',icon:'🌋',lesson:'geothermal',tag:'Underground heat → electricity',primary:'hot',
      intro:'Inspect a binary-cycle cutaway: hot geothermal fluid gives heat to a separate working-fluid loop, then returns underground.',
      controls:[['hot','Produced fluid temperature',75,300,5,180,'°C'],['returnTemp','Reinjection temperature',40,100,5,70,'°C'],['flow','Geothermal fluid flow',0,100,5,40,'kg/s'],['utilization','Fraction of Carnot limit',10,55,5,40,'%']],
      components:[['resource','Hot reservoir & wells','Hot fluid rises through the production well; the cooler return pipe represents reinjection. Temperatures are imposed, not predicted from drilling depth.'],['converter','Heat exchanger','Heat passes to a separate working-fluid circuit. The geothermal water does not pass through the generator turbine.'],['generator','Binary turbine & cooling','The engine efficiency is a selected fraction of an ideal Carnot bound using a 25°C sink. Rejected heat leaves through cooling.']],
      formula:'Q = flow × 4.18 × max(T_hot − T_return, 0); P = Q × (1 − 298.15 / (T_hot + 273.15)) × utilization',
      limits:'Gross electrical output from a simplified steady heat balance. Water heat capacity is 4.18 kJ/(kg·K); cooling sink is fixed at 25°C. No pumping load, pressure, boiling, reservoir drawdown, or working-fluid property model.',
      prompt:'Increase reinjection temperature while holding hot temperature fixed. What happens to extracted heat?',
      source:'https://www.eia.gov/energyexplained/geothermal/geothermal-power-plants.php'},
    {id:'solarThermal',name:'Concentrating solar',icon:'🔆',lesson:'solarThermal',tag:'Mirrors → heat → electricity',primary:'dni',
      intro:'Trace reflected sunlight from a heliostat field to a tower receiver, then follow the heat into a turbine and generator.',
      controls:[['dni','Direct normal irradiance',0,1100,50,900,'W/m²'],['area','Mirror aperture area',1000,30000,1000,10000,'m²'],['optical','Optical and receiver efficiency',30,90,5,65,'%'],['cycle','Heat-to-electricity efficiency',15,45,1,35,'%']],
      components:[['resource','Heliostat field','Mirrors collect direct sunlight and aim it at the elevated receiver. Their displayed footprint changes with total aperture area.'],['converter','Tower receiver','Concentrated light heats a fluid. Optical and receiver losses reduce the thermal power reaching the power block.'],['generator','Heat engine & generator','A selected fraction of delivered heat becomes electricity. This bench shows direct operation without thermal storage.']],
      formula:'P = DNI × mirror area × optical efficiency × cycle efficiency / 1,000',
      limits:'Steady direct-normal sunlight and fixed aggregate efficiencies. No thermal storage, warm-up, receiver temperature, sun tracking geometry, or parasitic load. Reflected rays are schematic.',
      prompt:'Compare a clear sky with half the DNI. Can a larger mirror field compensate in this model?',
      source:'https://www.energy.gov/cmei/systems/concentrating-solar-thermal-power-basics'},
    {id:'wave',name:'Wave energy',icon:'🌊',lesson:'waveTidal',tag:'Surface motion → electricity',primary:'height',
      intro:'Explore a heaving buoy and its power take-off. Wave height and energy period determine the mean incident power in this deep-water approximation.',
      controls:[['height','Significant wave height',0,6,.5,2,'m'],['period','Wave energy period',4,16,1,8,'s'],['width','Capture frontage',2,20,1,8,'m'],['efficiency','Capture and conversion efficiency',5,60,5,30,'%']],
      components:[['resource','Incident waves','Deep-water mean wave power per metre of crest is approximately 0.49 × Hₛ² × Tₑ kW/m. The regular animated surface only illustrates height and period.'],['converter','Heaving buoy','A buoy rises and falls relative to its reference structure. The selected frontage defines a teaching capture area, not a device performance curve.'],['generator','Power take-off','The assumed combined efficiency converts mean incident wave power across that frontage to electrical output.']],
      formula:'P = (1,025 × 9.81² / (64π × 1,000)) × Hₛ² × Tₑ × frontage × efficiency',
      limits:'Deep-water, irregular-wave mean-power relation. The rendered sinusoid is illustrative; it does not simulate a sea spectrum, buoy resonance, moorings, storms, or instantaneous electrical output.',
      prompt:'Double significant wave height. Compare that effect with doubling wave period.',
      source:'https://www.energy.gov/cmei/water/marine-energy-basics'},
    {id:'tidal',name:'Tidal stream',icon:'🌀',lesson:'waveTidal',tag:'Ocean current → rotation',primary:'speed',
      intro:'Rotate around a submerged turbine. Reverse the current and compare its direction with the magnitude of generated power.',
      controls:[['speed','Signed tidal current',-4,4,.25,2,'m/s'],['radius','Underwater rotor radius',2,12,1,5,'m'],['cp','Tidal rotor power coefficient',10,59,1,40,'%'],['rating','Tidal generator rating',100,3000,100,1000,'kW']],
      components:[['resource','Tidal current','Positive and negative values represent opposite flow directions. Available kinetic power depends on the cube of speed magnitude, using seawater density 1,025 kg/m³.'],['converter','Submerged rotor','The rotor extracts a selected fraction of kinetic power. This reversible teaching turbine changes illustrated rotation when flow reverses.'],['generator','Sealed generator','The generator applies a 90% conversion efficiency and the selected rating limit. Slack water supplies zero power.']],
      formula:'P = min(½ × 1,025 × πr² × |v|³ × Cₚ × 0.90 / 1,000, rating)',
      limits:'Uniform, externally selected current. No astronomical tide schedule, turbulence, cavitation, cut-in control, or marine ecology model. Rotor direction and motion are illustrative.',
      prompt:'Compare +2 and −2 m/s, then set slack water at zero. Does direction change the power magnitude?',
      source:'https://www.energy.gov/cmei/water/marine-energy-basics'},
    {id:'biomass',name:'Biomass',icon:'🌾',lesson:'biomass',tag:'Fuel → heat → electricity',primary:'feed',
      intro:'Follow a solid-fuel feed through a boiler and steam turbine. Separate fuel energy, useful boiler heat, and electrical output.',
      controls:[['feed','Fuel feed rate',0,2000,50,500,'kg/h'],['heating','As-fired heating value',5,20,1,12,'MJ/kg'],['boiler','Boiler efficiency',50,95,5,80,'%'],['cycle','Steam-cycle efficiency',10,40,1,25,'%']],
      components:[['resource','Fuel hopper','Feed rate times as-fired heating value gives fuel energy per hour. The chosen heating value already reflects the fuel condition; moisture is not deducted again.'],['converter','Boiler','Combustion transfers part of the chemical energy to steam. The remaining energy is counted as boiler loss.'],['generator','Steam turbine & generator','Steam heat is partly converted to electricity and partly rejected. This scene illustrates combustion; the linked lesson also covers biogas.']],
      formula:'P = feed rate × heating value / 3.6 × boiler efficiency × steam-cycle efficiency',
      limits:'Steady combustion with prescribed efficiencies. No combustion chemistry, pollution control, fuel supply, land use, or lifecycle carbon accounting. Burning biomass releases CO₂; this model does not assume carbon neutrality.',
      prompt:'Reduce fuel heating value while keeping the feed rate fixed. Which stage loses input power?',
      source:'https://www.energy.gov/cmei/fuels/biopower-energy-heat-and-electricity'},
    {id:'storage',name:'Battery storage',icon:'🔋',lesson:'storage',tag:'Electricity → storage → electricity',primary:'power',
      intro:'Scrub a two-hour cycle: charge for the first hour, then discharge for the second. Watch energy capacity, power limits, and losses constrain the battery.',
      controls:[['capacity','Battery energy capacity',10,500,10,100,'kWh'],['power','Charge and discharge power limit',0,200,5,50,'kW'],['roundtrip','Round-trip efficiency',50,100,1,88,'%'],['initial','Initial state of charge',0,100,5,0,'%']],
      components:[['resource','Charging supply','The external source offers the selected power for the first 60 minutes. Energy accepted is limited by the room remaining in storage.'],['converter','Battery cells','The green fill is stored energy divided by energy capacity. Charging and discharging each use the square root of round-trip efficiency.'],['generator','Inverter & load','From minute 60 to 120, the battery serves the load at the selected power until depleted. Losses prevent recovering all charging energy.']],
      formula:'η = √(round-trip efficiency); stored = initial + accepted charge × η − delivered energy / η',
      limits:'Deterministic two-hour cycle, with energy integrated exactly within each phase. No degradation, thermal behavior, self-discharge, reserve dispatch, or chemistry-specific voltage model. Storage shifts energy; it is not a primary renewable source.',
      prompt:'Start empty, finish the full cycle, and compare delivered energy with accepted charging energy.',
      source:'https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php'}
  ];
  function rnEnergySpec(id){return RN_ENERGY_SPECS.find(function(s){return s.id===id;})||RN_ENERGY_SPECS[0];}
  function rnEnergySettings(id,input){
    var spec=rnEnergySpec(id),s={};input=input||{};
    spec.controls.forEach(function(c){s[c[0]]=rnNumber(input[c[0]],c[5],c[2],c[3]);});return s;
  }
  function rnEnergyRun(id,input,minute){
    var spec=rnEnergySpec(id),s=rnEnergySettings(spec.id,input),available=0,converted=0,power=0,status='Generating',stages=[],extra={};
    function stage(label,value){stages.push({label:label,value:value,unit:'kW'});}
    if(spec.id==='solarPv'){
      available=s.irradiance*s.area*Math.max(0,Math.cos(s.incidence*Math.PI/180))/1000;
      if(s.incidence===90)available=0;converted=available*s.efficiency/100;power=converted*.96;
      stage('Light intercepted',available);stage('DC electricity',converted);stage('AC electricity',power);
    }else if(spec.id==='wind'||spec.id==='tidal'){
      var wind=spec.id==='wind',speed=Math.abs(s.speed);
      available=.5*(wind?1.225:1025)*Math.PI*s.radius*s.radius*Math.pow(speed,3)/1000;
      converted=available*s.cp/100;power=Math.min(converted*(wind?.94:.90),s.rating);
      if(wind&&(s.speed<3||s.speed>=25)){power=0;converted=0;status=s.speed<3?'Below cut-in':'Protective shutdown';}
      else if(power>=s.rating)status='At generator rating';
      if(!wind&&speed===0)status='Slack water';
      stage('Kinetic stream power',available);stage('Rotor extraction',converted);stage('Electricity delivered',power);
    }else if(spec.id==='hydro'){
      available=9.81*s.head*s.flow;power=available*s.efficiency/100;
      stage('Hydraulic power',available);stage('Electricity delivered',power);
    }else if(spec.id==='geothermal'){
      available=s.flow*4.18*Math.max(0,s.hot-s.returnTemp);
      extra.carnot=1-298.15/(s.hot+273.15);extra.efficiency=extra.carnot*s.utilization/100;
      power=available*extra.efficiency;stage('Extracted thermal power',available);stage('Gross electricity',power);
    }else if(spec.id==='solarThermal'){
      available=s.dni*s.area/1000;converted=available*s.optical/100;power=converted*s.cycle/100;
      stage('Incident sunlight',available);stage('Heat to power block',converted);stage('Gross electricity',power);
    }else if(spec.id==='wave'){
      extra.flux=1025*9.81*9.81/(64*Math.PI*1000)*s.height*s.height*s.period;
      available=extra.flux*s.width;power=available*s.efficiency/100;
      stage('Incident wave power',available);stage('Mean electricity',power);
    }else if(spec.id==='biomass'){
      available=s.feed*s.heating/3.6;converted=available*s.boiler/100;power=converted*s.cycle/100;
      stage('Fuel chemical power',available);stage('Heat to steam cycle',converted);stage('Gross electricity',power);
    }else{
      var t=rnNumber(minute,0,0,120),eta=Math.sqrt(s.roundtrip/100),initial=s.capacity*s.initial/100;
      var charge=Math.min(s.power*Math.min(t,60)/60,(s.capacity-initial)/eta);
      var peak=initial+charge*eta,delivered=t>60?Math.min(s.power*(t-60)/60,peak*eta):0;
      var stored=Math.max(0,peak-delivered/eta),loss=charge*(1-eta)+delivered/eta-delivered;
      var charging=t<60&&stored<s.capacity-1e-8,discharging=t>=60&&t<120&&stored>1e-8;
      power=discharging?s.power:0;available=charging?s.power:0;
      status=t===120?'Cycle complete':charging&&s.power>0?'Charging':discharging&&s.power>0?'Discharging':stored>=s.capacity-1e-8?'Full':'Idle';
      extra={minute:t,initial:initial,stored:stored,charge:charge,delivered:delivered,loss:loss,soc:100*stored/s.capacity,eta:eta,charging:charging&&s.power>0};
      stage('Charging input now',available);stage('Discharging output now',power);
      return {version:1,id:spec.id,settings:s,power:power,available:available,loss:loss,status:status,stages:stages,extra:extra};
    }
    if(power<1e-9&&status==='Generating')status='No output';
    extra.efficiency=available?power/available:0;
    return {version:1,id:spec.id,settings:s,power:power,available:available,loss:Math.max(0,available-power),status:status,stages:stages,extra:extra};
  }

  var RN_ENERGY_PROGRAMS={
    solarPv:[
      {id:'clouds',name:'Passing clouds',duration:120,key:'irradiance',points:[[0,1],[25,1],[40,.15],[65,.15],[80,1],[120,1]],prompt:'Keep panel area fixed. Compare the energy delivered with and without a cloud crossing.'},
      {id:'daylight',name:'Sunrise to sunset',duration:720,key:'irradiance',points:[[0,0],[180,.7],[360,1],[540,.7],[720,0]],prompt:'Which minutes produce the most electricity? Compare peak power with total energy.'}],
    wind:[
      {id:'gust',name:'Strong wind and shutdown',duration:120,key:'speed',points:[[0,.5],[25,1],[50,3.5],[70,3.5],[95,1],[120,.5]],prompt:'A larger wind resource can stop the turbine. Find the shutdown interval, then compare total energy with another rotor size.'},
      {id:'lull',name:'Wind lull and recovery',duration:120,key:'speed',points:[[0,1],[25,1],[40,.1],[75,.1],[100,1],[120,1]],prompt:'Can a larger generator rating help when wind is below cut-in? Hold rotor radius fixed.'}],
    hydro:[
      {id:'dry',name:'Falling river flow',duration:120,key:'flow',points:[[0,1],[30,1],[90,.2],[120,.2]],prompt:'Compare changing flow with changing head. This profile prescribes flow; it does not calculate reservoir depletion.'},
      {id:'release',name:'Controlled water release',duration:120,key:'flow',points:[[0,.3],[20,.3],[40,1.5],[70,1.5],[90,.3],[120,.3]],prompt:'Find the peak output, then compare energy at two turbine efficiencies.'}],
    geothermal:[
      {id:'interruption',name:'Fluid-flow interruption',duration:120,key:'flow',points:[[0,1],[35,1],[40,0],[65,0],[70,1],[120,1]],prompt:'The heat resource stays hot while fluid flow is interrupted. Does temperature alone produce electricity?'},
      {id:'ramp',name:'Production-flow ramp',duration:120,key:'flow',points:[[0,.25],[30,.5],[60,1],[90,1.5],[120,1.5]],prompt:'Keep produced and reinjection temperatures fixed. Compare electrical energy as fluid flow rises.'}],
    solarThermal:[
      {id:'clouds',name:'Clouds over the mirror field',duration:120,key:'dni',points:[[0,1],[25,1],[40,.1],[65,.1],[80,1],[120,1]],prompt:'This direct-operation model has no thermal storage. Follow the loss of power as direct sunlight falls.'},
      {id:'haze',name:'Increasing haze',duration:120,key:'dni',points:[[0,1],[30,.85],[60,.6],[90,.4],[120,.25]],prompt:'Compare a larger mirror field at the same hazy conditions. What happens to total energy?'}],
    wave:[
      {id:'swell',name:'Building and easing swell',duration:120,key:'height',points:[[0,.5],[30,1],[60,2],[90,1],[120,.5]],prompt:'Wave power depends on height squared. Compare the middle of the test with its beginning.'},
      {id:'calm',name:'Calm interval',duration:120,key:'height',points:[[0,1],[30,1],[45,0],[75,0],[90,1],[120,1]],prompt:'Does a longer wave period help when wave height is zero? Compare the same minute.'}],
    tidal:[
      {id:'reversal',name:'Current reversal and slack water',duration:720,key:'speed',points:[[0,0],[180,1],[360,0],[540,-1],[720,0]],prompt:'Compare equal positive and negative currents. This illustrative sequence is not an astronomical tide prediction.'},
      {id:'weak',name:'Weaker reversing currents',duration:720,key:'speed',points:[[0,0],[180,.5],[360,0],[540,-.5],[720,0]],prompt:'Halve the current magnitude while holding radius fixed. Compare energy with the stronger reversing-current profile.'}],
    biomass:[
      {id:'feed',name:'Fuel-feed interruption',duration:120,key:'feed',points:[[0,1],[30,1],[35,0],[60,0],[65,1],[120,1]],prompt:'Track the fuel, heat, and electricity stages when the feed is interrupted.'},
      {id:'quality',name:'Lower-energy fuel batch',duration:120,key:'heating',points:[[0,1],[30,1],[45,.5],[85,.5],[100,1],[120,1]],prompt:'Hold feed rate fixed. Compare a lower as-fired heating value with increasing fuel throughput.'}],
    storage:[
      {id:'evening',name:'Charge, wait, then meet demand',duration:240,segments:[[0,60,'charge',50],[60,90,'idle',0],[90,180,'discharge',25],[180,240,'discharge',75]],prompt:'Demand eventually exceeds the power rating. Compare a larger battery with a higher power limit.'},
      {id:'interrupted',name:'Interrupted charging supply',duration:240,segments:[[0,30,'charge',50],[30,90,'idle',0],[90,150,'charge',25],[150,240,'discharge',50]],prompt:'How much evening demand can the battery cover after an interruption in charging? Start empty to isolate stored charging energy.'}]
  };
  function rnEnergyProgram(id,programId){return (RN_ENERGY_PROGRAMS[id]||[]).find(function(p){return p.id===programId;})||null;}
  function rnEnergyFactor(points,t){
    if(t<=points[0][0])return points[0][1];
    for(var i=1;i<points.length;i++){if(t<=points[i][0]){var a=points[i-1],b=points[i];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);}}
    return points[points.length-1][1];
  }
  function rnEnergyScenario(id,input,programId){
    var profile=rnEnergyProgram(id,programId);if(!profile)return null;
    var base=rnEnergySettings(id,input),rows=[],total={input:0,delivered:0,remainder:0,requested:0,unserved:0},peakMinute=0,leastMinute=0;
    var initial=id==='storage'?base.capacity*base.initial/100:0,stored=initial,eta=id==='storage'?Math.sqrt(base.roundtrip/100):1;
    for(var minute=0;minute<=profile.duration;minute++){
      var run,request=0,unserved=0,charge=0,delivered=0,loss=0,mode='',nextStored=stored,clipped=false;
      if(id==='storage'){
        var segment=profile.segments.find(function(v){return minute>=v[0]&&minute<v[1];}),factor=segment?segment[3]:0;
        mode=segment?segment[2]:'complete';request=factor;
        if(mode==='charge')charge=Math.min(request,base.power,(base.capacity-stored)*60/eta);
        if(mode==='discharge')delivered=Math.min(request,base.power,stored*eta*60);
        charge=Math.max(0,charge);delivered=Math.max(0,delivered);unserved=mode==='discharge'?Math.max(0,request-delivered):0;
        loss=charge/60*(1-eta)+delivered/60/eta-delivered/60;
        nextStored=Math.max(0,Math.min(base.capacity,stored+charge/60*eta-delivered/60/eta));
        var status=mode==='complete'?'Scenario complete':mode==='idle'?'Waiting':mode==='charge'?(charge>0?'Charging':'Full'):(delivered>0?(unserved>1e-7?'Demand limited':'Discharging'):'Empty');
        if(base.power===0&&mode!=='complete')status='Idle';
        run={version:1,id:id,settings:base,power:delivered,available:charge,loss:total.remainder,status:status,
          stages:[{label:'Charging input next minute',value:charge,unit:'kW'},{label:'Discharging output next minute',value:delivered,unit:'kW'}],
          extra:{minute:minute,initial:initial,stored:stored,charge:total.input,delivered:total.delivered,loss:total.remainder,soc:100*stored/base.capacity,eta:eta,charging:charge>0,request:request,unserved:unserved,mode:mode}};
      }else{
        var raw=Object.assign({},base);raw[profile.key]=base[profile.key]*rnEnergyFactor(profile.points,minute);
        run=rnEnergyRun(id,raw,0);clipped=run.settings[profile.key]!==raw[profile.key];
        charge=run.available;delivered=run.power;loss=run.loss/60;
      }
      rows.push({minute:minute,run:run,energy:Object.assign({},total),clipped:clipped,requested:request,unserved:unserved});
      if(minute<profile.duration){
        if(run.power>rows[peakMinute].run.power)peakMinute=minute;
        if(run.power<rows[leastMinute].run.power)leastMinute=minute;
        total.input+=charge/60;total.delivered+=delivered/60;total.remainder+=loss;
        if(id==='storage'&&mode==='discharge'){total.requested+=request/60;total.unserved+=unserved/60;}
        stored=nextStored;
      }
    }
    return {version:1,id:id,profileId:profile.id,label:profile.name,duration:profile.duration,baseSettings:base,rows:rows,totals:total,initial:initial,endStored:stored,
      peakMinute:peakMinute,leastMinute:leastMinute,shutdownMinutes:rows.slice(0,-1).filter(function(r){return r.run.status==='Protective shutdown';}).length};
  }
  function rnEnergyResolveReading(id,reading){
    reading=reading||{};var profile=rnEnergyProgram(id,reading.profileId),s=rnEnergySettings(id,reading.settings);
    if(profile){var study=rnEnergyScenario(id,s,profile.id),minute=Math.floor(rnNumber(reading.phase,0,0,profile.duration)),row=study.rows[minute];
      return {profileId:profile.id,profileName:profile.name,phase:minute,baseSettings:s,run:row.run,energy:row.energy,totals:study.totals};
    }
    var phase=rnNumber(reading.phase,0,0,id==='storage'?120:60);
    return {profileId:'steady',profileName:id==='storage'?'Two-hour cycle':'Steady conditions',phase:phase,baseSettings:s,run:rnEnergyRun(id,s,phase),energy:null,totals:null};
  }
  function rnEnergyCompareResolved(id,a,b){
    var changes=rnEnergySpec(id).controls.filter(function(c){return a.baseSettings[c[0]]!==b.baseSettings[c[0]];}).map(function(c){return {key:c[0],label:c[1],before:a.baseSettings[c[0]],after:b.baseSettings[c[0]],unit:c[6]};});
    var sameContext=a.profileId===b.profileId&&(a.profileId==='steady'&&id!=='storage'||a.phase===b.phase);
    var context=[];
    if(a.profileId!==b.profileId)context.push('Operating scenario changed: '+a.profileName+' → '+b.profileName);
    if((a.profileId!=='steady'||b.profileId!=='steady'||id==='storage')&&a.phase!==b.phase)context.push('Selected minute changed: '+a.phase+' → '+b.phase);
    return {first:a,second:b,changes:changes,context:context,comparable:sameContext,controlled:sameContext&&changes.length===1,
      powerDelta:b.run.power-a.run.power,powerPercent:a.run.power>1e-8?100*(b.run.power-a.run.power)/a.run.power:null,
      energyDelta:a.energy&&b.energy?b.energy.delivered-a.energy.delivered:null};
  }

  function rnEnergyCompareReadings(id,first,second){return rnEnergyCompareResolved(id,rnEnergyResolveReading(id,first),rnEnergyResolveReading(id,second));}

  function rnEnergyPosition(state,id,value){
    var profile=rnEnergyProgram(id,state.scenarios&&state.scenarios[id]&&state.scenarios[id].profileId);
    if(profile){var scenarios=Object.assign({},state.scenarios);scenarios[id]=Object.assign({},scenarios[id],{minute:Math.floor(rnNumber(value,0,0,profile.duration))});return Object.assign({},state,{scenarios:scenarios});}
    var phases=Object.assign({},state.phases);phases[id]=rnNumber(value,0,0,id==='storage'?120:60);return Object.assign({},state,{phases:phases});
  }


  var RN_ENERGY_EXPERIMENTS={
    solarPv:{key:'area',question:'How much does a larger array help during the same sunlight conditions?'},
    wind:{key:'radius',question:'When does a larger rotor stop increasing electrical output?'},
    hydro:{key:'head',question:'How does head change electricity when the flow sequence stays the same?'},
    geothermal:{key:'hot',question:'How does hotter fluid change heat extraction and electrical output?'},
    solarThermal:{key:'area',question:'How does mirror area change electricity through the same cloud sequence?'},
    wave:{key:'height',question:'Is the gain from larger waves proportional to wave height?'},
    tidal:{key:'radius',question:'When does a larger submerged rotor reach the generator limit?'},
    biomass:{key:'feed',question:'How does fuel throughput change electricity with the same fuel quality?'},
    storage:{key:'capacity',question:'Does more battery capacity help when the charging supply is limited?'}
  };
  function rnEnergySweepConfig(id,input,profileId){
    input=input||{};var spec=rnEnergySpec(id),c=spec.controls.find(function(v){return v[0]===input.key;})||spec.controls.find(function(v){return v[0]===RN_ENERGY_EXPERIMENTS[spec.id].key;});
    function snap(value,fallback){return Number(Math.min(c[3],Math.max(c[2],c[2]+Math.round((rnNumber(value,fallback,c[2],c[3])-c[2])/c[4])*c[4])).toFixed(8));}
    var energy=!!rnEnergyProgram(spec.id,profileId)||spec.id==='storage',metric=energy?'energy':'power';
    var target=input.metric&&input.metric!==metric?null:input.target;
    var invalidTarget=target!=null&&target!==''&&(typeof target!=='number'||!Number.isFinite(target)||target<0);
    var low=snap(input.low,c[2]),high=snap(input.high,c[3]);
    return {key:c[0],label:c[1],unit:c[6],low:low,high:high,count:[5,9,13].indexOf(input.count)>=0?input.count:9,
      metric:metric,target:target==null||target===''||invalidTarget?null:target,
      error:invalidTarget?'Enter a finite delivery target of zero or more.':low>=high?'The upper value must be greater than the lower value.':''};
  }
  function rnEnergySweepMeasure(id,settings,profileId){
    var study=rnEnergyScenario(id,settings,profileId);
    if(study)return {value:study.totals.delivered,input:study.totals.input,remainder:study.totals.remainder,
      requested:id==='storage'?study.totals.requested:null,unserved:id==='storage'?study.totals.unserved:null,
      initial:study.initial,endStored:study.endStored,shutdownMinutes:study.shutdownMinutes,
      clippedMinutes:study.rows.slice(0,-1).filter(function(r){return r.clipped;}).length,status:'Full scenario'};
    var run=rnEnergyRun(id,settings,id==='storage'?120:0);
    if(id==='storage')return {value:run.extra.delivered,input:run.extra.charge,remainder:run.extra.loss,initial:run.extra.initial,endStored:run.extra.stored,requested:null,unserved:null,shutdownMinutes:0,clippedMinutes:0,status:'Full two-hour cycle'};
    return {value:run.power,input:run.available,remainder:run.loss,requested:null,unserved:null,initial:0,endStored:0,shutdownMinutes:0,clippedMinutes:0,status:run.status};
  }
  function rnEnergySweep(id,request){
    if(!RN_ENERGY_SPECS.some(function(s){return s.id===id;}))return null;
    request=request||{};var profile=rnEnergyProgram(id,request.profileId),profileId=profile?profile.id:'steady';
    var config=rnEnergySweepConfig(id,request.config,profileId);if(config.error)return null;
    var settings=rnEnergySettings(id,request.settings),spec=rnEnergySpec(id),c=spec.controls.find(function(v){return v[0]===config.key;}),values=[];
    for(var i=0;i<config.count;i++){
      var raw=config.low+(config.high-config.low)*i/(config.count-1);
      var value=Number(Math.min(config.high,Math.max(config.low,c[2]+Math.round((raw-c[2])/c[4])*c[4])).toFixed(8));
      if(values.indexOf(value)<0)values.push(value);
    }
    var reference=rnEnergySweepMeasure(id,settings,profileId);
    var rows=values.map(function(value,index){
      var inputs=Object.assign({},settings);inputs[config.key]=value;
      var result=rnEnergySweepMeasure(id,inputs,profileId),delta=result.value-reference.value,percent=reference.value>0?100*delta/reference.value:null;
      return {index:index,value:value,settings:inputs,result:result,delta:delta,percent:percent!=null&&Number.isFinite(percent)?percent:null,
        meetsTarget:config.target==null?null:result.value+Math.max(result.value,config.target)*1e-10>=config.target};
    });
    var peak=Math.max.apply(null,rows.map(function(r){return r.result.value;})),least=Math.min.apply(null,rows.map(function(r){return r.result.value;}));
    return {version:1,id:id,profileId:profileId,profileName:profile?profile.name:id==='storage'?'Two-hour cycle':'Steady conditions',
      phase:Math.floor(rnNumber(request.phase,0,0,profile?profile.duration:id==='storage'?120:60)),
      duration:profile?profile.duration:id==='storage'?120:null,baseSettings:settings,config:config,
      metric:config.metric,unit:config.metric==='energy'?'kWh':'kW',metricLabel:config.metric==='energy'?'Electricity over the full sequence':'Electrical output',
      reference:reference,rows:rows,peak:peak,least:least,
      highest:rows.filter(function(r){return Math.abs(r.result.value-peak)<=peak*1e-9;}).map(function(r){return r.index;}),
      targetMatches:rows.filter(function(r){return r.meetsTarget;}).map(function(r){return r.index;}),
      prediction:typeof request.prediction==='string'?request.prediction.slice(0,1500):''};
  }


  var RN_ENERGY_MAP_AXES={solarPv:['area','efficiency'],wind:['radius','rating'],hydro:['head','efficiency'],geothermal:['hot','returnTemp'],solarThermal:['area','cycle'],wave:['height','period'],tidal:['radius','rating'],biomass:['feed','heating'],storage:['capacity','power']};
  var RN_ENERGY_MAP_RULES='Each cell replays one combination of two base inputs. Other base inputs, the operating scenario, and the inspection minute are captured at run time. Steady generators compare kW; operating scenarios and batteries compare delivered kWh over the full sequence. Values follow control steps and duplicate samples are removed. Bars compare sampled output on one scale. Highest and target results apply only to tested combinations; no interpolation, cost, or installation optimum is calculated.';
  function rnEnergyMapConfig(id,input,profileId){
    input=input||{};var spec=rnEnergySpec(id),defaults=RN_ENERGY_MAP_AXES[spec.id];
    function axis(value,fallback){value=value||{};var key=spec.controls.some(function(c){return c[0]===value.key;})?value.key:fallback,c=rnEnergySweepConfig(spec.id,{key:key,low:value.low,high:value.high},profileId);return {key:c.key,label:c.label,unit:c.unit,low:c.low,high:c.high,error:c.error};}
    var x=axis(input.x,defaults[0]),y=axis(input.y,defaults[1]),measure=rnEnergySweepConfig(spec.id,{metric:input.metric,target:input.target},profileId),error=x.key===y.key?'Choose two different inputs.':x.error?'Horizontal range: '+x.error:y.error?'Vertical range: '+y.error:measure.error;
    delete x.error;delete y.error;
    return {x:x,y:y,count:[3,5,7].indexOf(input.count)>=0?input.count:5,metric:measure.metric,target:measure.target,error:error};
  }
  function rnEnergyMap(id,request){
    if(!RN_ENERGY_SPECS.some(function(s){return s.id===id;}))return null;
    request=request||{};var profile=rnEnergyProgram(id,request.profileId),profileId=profile?profile.id:'steady',config=rnEnergyMapConfig(id,request.config,profileId);if(config.error)return null;
    var settings=rnEnergySettings(id,request.settings),spec=rnEnergySpec(id);
    function values(axis){var c=spec.controls.find(function(c){return c[0]===axis.key;}),out=[];for(var i=0;i<config.count;i++){var raw=axis.low+(axis.high-axis.low)*i/(config.count-1),n=Number(Math.min(axis.high,Math.max(axis.low,c[2]+Math.round((raw-c[2])/c[4])*c[4])).toFixed(8));if(out.indexOf(n)<0)out.push(n);}return out;}
    var xs=values(config.x),ys=values(config.y),reference=rnEnergySweepMeasure(id,settings,profileId),rows=[];
    ys.forEach(function(y,yi){xs.forEach(function(x,xi){var inputs=Object.assign({},settings);inputs[config.x.key]=x;inputs[config.y.key]=y;var result=rnEnergySweepMeasure(id,inputs,profileId),delta=result.value-reference.value,percent=reference.value>0?100*delta/reference.value:null;rows.push({index:rows.length,xi:xi,yi:yi,x:x,y:y,settings:inputs,result:result,delta:delta,percent:percent!=null&&Number.isFinite(percent)?percent:null,meetsTarget:config.target==null?null:result.value+Math.max(result.value,config.target)*1e-10>=config.target});});});
    var peak=Math.max.apply(null,rows.map(function(r){return r.result.value;})),least=Math.min.apply(null,rows.map(function(r){return r.result.value;}));
    return {version:1,mechanismVersion:1,id:id,profileId:profileId,profileName:profile?profile.name:id==='storage'?'Two-hour cycle':'Steady conditions',phase:Math.floor(rnNumber(request.phase,0,0,profile?profile.duration:id==='storage'?120:60)),duration:profile?profile.duration:id==='storage'?120:null,baseSettings:settings,config:config,metric:config.metric,unit:config.metric==='energy'?'kWh':'kW',metricLabel:config.metric==='energy'?'Electricity over the full sequence':'Electrical output',reference:reference,xValues:xs,yValues:ys,rows:rows,peak:peak,least:least,highest:rows.filter(function(r){return Math.abs(r.result.value-peak)<=peak*1e-9;}).map(function(r){return r.index;}),targetMatches:rows.filter(function(r){return r.meetsTarget;}).map(function(r){return r.index;}),variedScenarioInput:profile&&[config.x.key,config.y.key].indexOf(profile.key)>=0?profile.key:null,prediction:typeof request.prediction==='string'?request.prediction.slice(0,1500):'',assumptions:RN_ENERGY_MAP_RULES};
  }
  function rnEnergyMapCsv(result){
    var headers=['technology','scenario','inspection_minute','duration_minutes','trial','horizontal_input','horizontal_value','horizontal_unit','vertical_input','vertical_value','vertical_unit','output_unit','output','reference_output','change_from_reference','percent_change','target','meets_target','highest_sampled','input_resource','remainder','requested_kWh','unserved_kWh','initial_stored_kWh','ending_stored_kWh','shutdown_minutes','clipped_minutes','status','map_version','mechanism_version','case_settings_json','reference_settings_json'];
    var rows=result.rows.map(function(r){var m=r.result;return [result.id,result.profileId,result.phase,result.duration,r.index+1,result.config.x.key,r.x,result.config.x.unit,result.config.y.key,r.y,result.config.y.unit,result.unit,m.value,result.reference.value,r.delta,r.percent,result.config.target,r.meetsTarget,result.highest.indexOf(r.index)>=0,m.input,m.remainder,m.requested,m.unserved,m.initial,m.endStored,m.shutdownMinutes,m.clippedMinutes,m.status,result.version,result.mechanismVersion,JSON.stringify(r.settings),JSON.stringify(result.baseSettings)];});
    return [headers].concat(rows).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }


  var RN_ENERGY_MAP_EXPLANATION_RULES='Four cases replay the recorded reference, each selected input separately, and both together. Extra combined effect = joint change minus the two separate changes. This compares model outputs at these settings; it is not an efficiency, an energy loss, or a general attribution. The two orders are alternative comparisons of the same four cases, not successive operating periods.';
  function rnEnergyMapExplanation(map,selected){
    if(!map||!map.rows||!map.rows.length)return null;
    selected=Math.floor(rnNumber(selected,0,0,map.rows.length-1));
    var trial=map.rows[selected],x=map.config.x,y=map.config.y,base=map.baseSettings;
    function make(key,label,settings,measurement){var result=measurement||rnEnergySweepMeasure(map.id,settings,map.profileId);return {key:key,label:label,settings:Object.assign({},settings),result:result,delta:result.value-map.reference.value,meetsTarget:map.config.target==null?null:result.value+Math.max(result.value,map.config.target)*1e-10>=map.config.target};}
    var xs=Object.assign({},base),ys=Object.assign({},base);xs[x.key]=trial.x;ys[y.key]=trial.y;
    var cases=[make('reference','Reference',base,map.reference),make('horizontal','Horizontal input only',xs),make('vertical','Vertical input only',ys),make('both','Both inputs',trial.settings,trial.result)],a=cases[1].delta,b=cases[2].delta,joint=cases[3].delta,extra=joint-a-b,scale=Math.max.apply(null,cases.map(function(c){return Math.abs(c.result.value);})),tolerance=Math.max(scale,1e-20)*1e-9;
    return {version:1,mapVersion:map.version,mechanismVersion:map.mechanismVersion,id:map.id,profileId:map.profileId,profileName:map.profileName,phase:map.phase,duration:map.duration,selected:selected,unit:map.unit,metric:map.metric,metricLabel:map.metricLabel,axes:{x:x,y:y},target:map.config.target,baseSettings:Object.assign({},base),cases:cases,effects:{horizontalAlone:a,verticalAlone:b,combined:joint,extraCombined:extra,horizontalAfterVertical:cases[3].result.value-cases[2].result.value,verticalAfterHorizontal:cases[3].result.value-cases[1].result.value},unchanged:{horizontal:base[x.key]===trial.x,vertical:base[y.key]===trial.y},tolerance:tolerance,relationship:Math.abs(extra)<=tolerance?'additive':extra>0?'above':'below',assumptions:RN_ENERGY_MAP_EXPLANATION_RULES};
  }
  function rnEnergyMapExplanationCsv(analysis,observation){
    var headers=['technology','scenario','inspection_minute','duration_minutes','selected_map_trial','case','horizontal_input','horizontal_value','horizontal_unit','vertical_input','vertical_value','vertical_unit','output_unit','output','change_from_reference','target','meets_target','input_resource','remainder','requested_kWh','unserved_kWh','initial_stored_kWh','ending_stored_kWh','shutdown_minutes','clipped_minutes','status','horizontal_change_alone','vertical_change_alone','combined_change','extra_combined_effect','horizontal_change_after_vertical','vertical_change_after_horizontal','relationship','display_tolerance','explanation_version','map_version','mechanism_version','case_settings_json','reference_settings_json','observation','comparison_rules'];
    var e=analysis.effects,x=analysis.axes.x,y=analysis.axes.y,note=typeof observation==='string'?observation.slice(0,2000):'';
    var rows=analysis.cases.map(function(c){var m=c.result;return [analysis.id,analysis.profileId,analysis.phase,analysis.duration,analysis.selected+1,c.key,x.key,c.settings[x.key],x.unit,y.key,c.settings[y.key],y.unit,analysis.unit,m.value,c.delta,analysis.target,c.meetsTarget,m.input,m.remainder,m.requested,m.unserved,m.initial,m.endStored,m.shutdownMinutes,m.clippedMinutes,m.status,e.horizontalAlone,e.verticalAlone,e.combined,e.extraCombined,e.horizontalAfterVertical,e.verticalAfterHorizontal,analysis.relationship,analysis.tolerance,analysis.version,analysis.mapVersion,analysis.mechanismVersion,JSON.stringify(c.settings),JSON.stringify(analysis.baseSettings),note,analysis.assumptions];});
    return [headers].concat(rows).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }

  window.StemLab.renewablesEnergyModel={version:1,specs:RN_ENERGY_SPECS,settings:rnEnergySettings,simulate:rnEnergyRun,programs:RN_ENERGY_PROGRAMS,scenario:rnEnergyScenario,resolveReading:rnEnergyResolveReading,compareReadings:rnEnergyCompareReadings,designMapConfig:rnEnergyMapConfig,designMap:rnEnergyMap,designMapCsv:rnEnergyMapCsv,designMapRules:RN_ENERGY_MAP_RULES,designMapExplanation:rnEnergyMapExplanation,designMapExplanationCsv:rnEnergyMapExplanationCsv,experimentGuides:RN_ENERGY_EXPERIMENTS,sweepConfig:rnEnergySweepConfig,sweep:rnEnergySweep};



  var RN_MICROGRID_LOADS=[
    {id:'flat',name:'Constant demand',points:[[0,1],[1,1]]},
    {id:'evening',name:'Demand rises later',points:[[0,.45],[.3,.45],[.5,1],[.75,1.8],[.85,1.8],[1,.6]]},
    {id:'pulse',name:'Short demand surge',points:[[0,.7],[.35,.7],[.4,2],[.6,2],[.65,.7],[1,.7]]}
  ];

  var RN_MICROGRID_POLICIES=[
    {id:'fixed',name:'Fixed reserve',description:'Use the battery for deficits whenever possible, while holding the selected reserve even during an outage.'},
    {id:'release',name:'Release during outages',description:'Hold the selected reserve while grid backup is available, then allow it to serve demand when the grid is unavailable.'},
    {id:'backup',name:'Save for outages',description:'Use grid backup for deficits while it is available. Hold all stored energy for outages, when discharge can continue down to empty.'}
  ];

  var RN_MICROGRID_ASSUMPTIONS='Teaching model of an electrical energy balance, sampled in one-minute intervals. Enabled generators combine before serving demand; surplus may charge the battery, and stored energy permitted by the selected battery strategy may cover a deficit. Grid backup supplies any remaining deficit up to the optional import limit when available. No grid charging, electricity exports, transmission losses, voltage, frequency, battery degradation, or protection dynamics are modeled. Resource and demand profiles are synthetic. Initial stored energy has no assigned source; it is not counted as newly generated renewable electricity.';
  var RN_HYBRID_TIMING='The primary source sets the system duration. The second source keeps its scenario’s original minute scale; a positive offset moves its events later, and a negative offset moves them earlier. Before its first point and after its last point, the resource holds that endpoint value. Curves are neither stretched nor automatically repeated. These synthetic profiles are not correlated weather forecasts.';
  function rnMicrogridCompanion(input,duration){
    input=input||{};var source=RN_ENERGY_SPECS.some(function(s){return s.id===input.source&&s.id!=='storage';})?input.source:'wind',profile=rnEnergyProgram(source,input.profileId);
    return {enabled:input.enabled===true,source:source,sourceSettings:rnEnergySettings(source,input.sourceSettings),profileId:profile?profile.id:'steady',
      sourceUnits:Math.round(rnNumber(input.sourceUnits,1,0,50)),offset:Math.round(rnNumber(input.offset,0,-duration,duration))};
  }
  function rnMicrogridResourceAt(source,settings,profileId,minute,duration,offset){
    var profile=rnEnergyProgram(source,profileId),time=minute-(offset||0),profileMinute=profile?Math.max(0,Math.min(profile.duration,time)):null;
    var raw=Object.assign({},settings);if(profile)raw[profile.key]=settings[profile.key]*rnEnergyFactor(profile.points,profileMinute);
    var run=rnEnergyRun(source,raw,0),clipped=!!(profile&&run.settings[profile.key]!==raw[profile.key]);
    if(minute===duration)run=Object.assign({},run,{power:0,available:0,loss:0,status:'Sequence complete',stages:run.stages.map(function(r){return Object.assign({},r,{value:0});})});
    return {run:run,clipped:clipped,profileMinute:profileMinute,timing:!profile?'steady':time<0?'before':time>profile.duration?'after':'active'};
  }
  var RN_DEMAND_SHIFT_RULES='Demand shifting selects a share of the original demand in one window and spreads exactly that energy uniformly across another window in the same sequence. All other demand stays in its original minutes. Overlapping windows can cancel some or all of the timing change. No demand is deleted, moved beyond the horizon, or assumed to use less energy. Short receiving windows can create high power peaks. This prescribed schedule does not optimize against a forecast or model appliance deadlines, comfort, ramping, or rebound losses.';
  function rnDemandShiftSettings(input,duration){
    input=input||{};duration=Math.floor(rnNumber(duration,240,1,720));
    var from=Math.floor(rnNumber(input.fromStart,Math.floor(duration*2/3),0,duration-1)),to=Math.floor(rnNumber(input.toStart,Math.floor(duration/6),0,duration-1));
    return {enabled:input.enabled===true,percent:rnNumber(input.percent,50,0,100),fromStart:from,fromMinutes:Math.floor(rnNumber(input.fromMinutes,Math.min(Math.max(1,Math.floor(duration/3)),duration-from),1,duration-from)),
      toStart:to,toMinutes:Math.floor(rnNumber(input.toMinutes,Math.min(Math.max(1,Math.floor(duration/3)),duration-to),1,duration-to))};
  }
  function rnDemandSchedule(input){
    var s=rnMicrogridSettings(input),f=s.flex,load=RN_MICROGRID_LOADS.find(function(p){return p.id===s.loadId;}),rows=[],pool=0;
    for(var minute=0;minute<=s.duration;minute++){
      var baseline=minute===s.duration?0:s.demand*rnEnergyFactor(load.points,minute/s.duration);
      var removed=f.enabled&&minute<s.duration&&minute>=f.fromStart&&minute<f.fromStart+f.fromMinutes?baseline*f.percent/100:0;
      rows.push({minute:minute,baselineDemand:baseline,shiftedOut:removed,shiftedIn:0,demand:baseline});pool+=removed;
    }
    var added=pool/f.toMinutes,baselineEnergy=0,scheduledEnergy=0,moved=0,baselinePeak=0,scheduledPeak=0,maxIncrease=0,largestIncrease=null;
    rows.forEach(function(row){
      row.shiftedIn=row.minute<s.duration&&row.minute>=f.toStart&&row.minute<f.toStart+f.toMinutes?added:0;
      row.demand=Math.max(0,row.baselineDemand-row.shiftedOut+row.shiftedIn);
      baselineEnergy+=row.baselineDemand/60;scheduledEnergy+=row.demand/60;moved+=Math.max(0,row.demand-row.baselineDemand)/60;
      baselinePeak=Math.max(baselinePeak,row.baselineDemand);scheduledPeak=Math.max(scheduledPeak,row.demand);
      if(row.demand-row.baselineDemand>maxIncrease){maxIncrease=row.demand-row.baselineDemand;largestIncrease=row.minute;}
    });
    return {version:1,rows:rows,summary:{settings:f,baselineEnergy:baselineEnergy,scheduledEnergy:scheduledEnergy,allocatedEnergy:pool/60,netShiftedEnergy:moved,
      baselinePeak:baselinePeak,scheduledPeak:scheduledPeak,addedPower:added,largestIncrease:largestIncrease,overlapMinutes:Math.max(0,Math.min(f.fromStart+f.fromMinutes,f.toStart+f.toMinutes)-Math.max(f.fromStart,f.toStart))}};
  }
  var RN_GRID_LIMIT_RULES='The optional grid limit caps imports after direct generation and battery dispatch. It applies only while grid backup is available; outages and islanded operation supply zero grid power. Grid availability still controls reserve strategies: Save for outages holds the battery while the grid is available, even if the import limit leaves demand unmet. A zero import limit does not switch the grid to an outage. No grid charging, export, tariffs, voltage, frequency, or connection protection dynamics are modeled.';
  function rnMicrogridGridLimit(input){input=input||{};return {enabled:input.enabled===true,power:rnNumber(input.power,5,0,1000000)};}
  function rnMicrogridSettings(input){
    input=input||{};var source=RN_ENERGY_SPECS.some(function(s){return s.id===input.source&&s.id!=='storage';})?input.source:'solarPv';
    var settings=rnEnergySettings(source,input.sourceSettings),profile=rnEnergyProgram(source,input.profileId),duration=profile?profile.duration:240;
    var start=Math.floor(rnNumber(input.outageStart,Math.floor(duration/3),0,duration-1));
    return {source:source,sourceSettings:settings,profileId:profile?profile.id:'steady',sourceUnits:Math.round(rnNumber(input.sourceUnits,1,1,50)),
      companion:rnMicrogridCompanion(input.companion,duration),flex:rnDemandShiftSettings(input.flex,duration),battery:rnEnergySettings('storage',input.battery),batteryUnits:Math.round(rnNumber(input.batteryUnits,1,0,100)),reserve:rnNumber(input.reserve,0,0,90),
      demand:rnNumber(input.demand,Math.max(1,Math.round(rnEnergyRun(source,settings,0).power*.65*100)/100),0,1000000),
      policy:RN_MICROGRID_POLICIES.some(function(p){return p.id===input.policy;})?input.policy:'fixed',
      loadId:RN_MICROGRID_LOADS.some(function(p){return p.id===input.loadId;})?input.loadId:'flat',
      grid:['island','connected','outage'].indexOf(input.grid)>=0?input.grid:'island',gridLimit:rnMicrogridGridLimit(input.gridLimit),
      outageStart:start,outageMinutes:Math.floor(rnNumber(input.outageMinutes,Math.min(Math.floor(duration/3),duration-start),1,duration-start)),duration:duration};
  }
  function rnMicrogridRun(input){
    var s=rnMicrogridSettings(input);
    var schedule=rnDemandSchedule(s),capacity=s.battery.capacity*s.batteryUnits,power=s.battery.power*s.batteryUnits,eta=Math.sqrt(s.battery.roundtrip/100);
    var initial=capacity*s.battery.initial/100,stored=initial,reserve=capacity*s.reserve/100,rows=[];
    var total={generation:0,primaryGeneration:0,companionGeneration:0,demand:0,direct:0,charge:0,discharge:0,grid:0,unserved:0,curtailed:0,loss:0,gridRequested:0,gridLimited:0,gridUnavailable:0};
    var without={grid:0,unserved:0,curtailed:0},firstUnserved=null,mostCurtailed=null,lowestStored=0,unservedMinutes=0,gridSummary={peakImport:0,peakRequested:0,peakImportMinute:null,peakRequestedMinute:null,firstLimited:null,limitedMinutes:0};
    for(var minute=0;minute<=s.duration;minute++){
      var end=minute===s.duration,source=rnMicrogridResourceAt(s.source,s.sourceSettings,s.profileId,minute,s.duration,0),sourceRun=source.run;
      var companion=s.companion.enabled?rnMicrogridResourceAt(s.companion.source,s.companion.sourceSettings,s.companion.profileId,minute,s.duration,s.companion.offset):null;
      var primaryGeneration=sourceRun.power*s.sourceUnits,companionGeneration=companion?companion.run.power*s.companion.sourceUnits:0;
      var generation=primaryGeneration+companionGeneration,demand=schedule.rows[minute].demand;
      var gridAvailable=s.grid==='connected'||s.grid==='outage'&&!(minute>=s.outageStart&&minute<s.outageStart+s.outageMinutes);
      var dischargeFloor=s.policy==='fixed'?reserve:gridAvailable?(s.policy==='backup'?capacity:reserve):0;
      var direct=Math.min(generation,demand),surplus=Math.max(0,generation-direct),deficit=Math.max(0,demand-direct);
      var charge=end?0:Math.max(0,Math.min(surplus,power,(capacity-stored)*60/eta));
      var discharge=end?0:Math.max(0,Math.min(deficit,power,Math.max(0,stored-dischargeFloor)*eta*60));
      var remaining=Math.max(0,deficit-discharge),gridRequested=gridAvailable?remaining:0,gridCapacity=end?0:gridAvailable?(s.gridLimit.enabled?s.gridLimit.power:null):0;
      var grid=gridAvailable?Math.min(gridRequested,s.gridLimit.enabled?s.gridLimit.power:Infinity):0,unserved=Math.max(0,remaining-grid),gridLimited=gridAvailable?unserved:0,gridUnavailable=gridAvailable?0:unserved,gridHeadroom=gridCapacity===null?null:Math.max(0,gridCapacity-grid),curtailed=Math.max(0,surplus-charge);
      var loss=charge/60*(1-eta)+discharge/60/eta-discharge/60;
      var nextStored=Math.max(0,Math.min(capacity,stored+charge/60*eta-discharge/60/eta));
      var status=end?'Sequence complete':charge>1e-9?'Charging surplus':discharge>1e-9?'Serving deficit':power===0?'No battery power':deficit>0&&s.policy==='backup'&&gridAvailable?'Saving for outage':deficit>0&&stored<=dischargeFloor+1e-8?'Reserve reached':surplus>0&&stored>=capacity-1e-8?'Battery full':'Waiting';
      var batteryRun={version:1,id:'storage',settings:Object.assign({},s.battery,{capacity:capacity,power:power}),power:discharge,available:charge,loss:total.loss,status:status,
        stages:[{label:'Charging from generation',value:charge,unit:'kW'},{label:'Discharging to demand',value:discharge,unit:'kW'}],
        extra:{minute:minute,initial:initial,stored:stored,charge:total.charge,delivered:total.discharge,loss:total.loss,soc:capacity?stored/capacity*100:0,eta:eta,charging:charge>1e-9}};
      rows.push({minute:minute,sourceRun:sourceRun,companionRun:companion?companion.run:null,companionProfileMinute:companion?companion.profileMinute:null,companionTiming:companion?companion.timing:null,primaryGeneration:primaryGeneration,companionGeneration:companionGeneration,batteryRun:batteryRun,generation:generation,demand:demand,baselineDemand:schedule.rows[minute].baselineDemand,shiftedOut:schedule.rows[minute].shiftedOut,shiftedIn:schedule.rows[minute].shiftedIn,direct:direct,charge:charge,discharge:discharge,grid:grid,unserved:unserved,curtailed:curtailed,
        gridAvailable:gridAvailable,gridRequested:gridRequested,gridLimited:gridLimited,gridUnavailable:gridUnavailable,gridCapacity:gridCapacity,gridHeadroom:gridHeadroom,stored:stored,reserve:dischargeFloor,energy:Object.assign({},total),clipped:source.clipped||!!(companion&&companion.clipped),primaryClipped:source.clipped,companionClipped:!!(companion&&companion.clipped)});
      if(stored<rows[lowestStored].stored)lowestStored=minute;
      if(!end){
        if(unserved>Math.max(demand,Number.MIN_VALUE)*1e-9){if(firstUnserved===null)firstUnserved=minute;unservedMinutes++;}
        if(grid>gridSummary.peakImport){gridSummary.peakImport=grid;gridSummary.peakImportMinute=minute;}
        if(gridRequested>gridSummary.peakRequested){gridSummary.peakRequested=gridRequested;gridSummary.peakRequestedMinute=minute;}
        if(gridLimited>Math.max(demand,Number.MIN_VALUE)*1e-9){if(gridSummary.firstLimited===null)gridSummary.firstLimited=minute;gridSummary.limitedMinutes++;}
        if(curtailed>1e-8&&(mostCurtailed===null||curtailed>rows[mostCurtailed].curtailed))mostCurtailed=minute;
        ['generation','primaryGeneration','companionGeneration','demand','direct','charge','discharge','grid','unserved','curtailed','gridRequested','gridLimited','gridUnavailable'].forEach(function(k){total[k]+=rows[minute][k]/60;});
        var withoutImport=gridAvailable?Math.min(deficit,s.gridLimit.enabled?s.gridLimit.power:Infinity):0;
        total.loss+=loss;without.grid+=withoutImport/60;without.unserved+=(deficit-withoutImport)/60;without.curtailed+=surplus/60;
        stored=nextStored;
      }
    }
    return {version:5,settings:s,duration:s.duration,rows:rows,gridSummary:gridSummary,demandSchedule:schedule.summary,totals:total,withoutBattery:without,initialStored:initial,endStored:stored,capacity:capacity,power:power,reserveEnergy:reserve,
      servedPercent:total.demand>0?100*Math.max(0,Math.min(1,(total.demand-total.unserved)/total.demand)):null,firstUnserved:firstUnserved,mostCurtailed:mostCurtailed,lowestStored:lowestStored,unservedMinutes:unservedMinutes,
      avoidedGrid:without.grid-total.grid,avoidedUnserved:without.unserved-total.unserved,avoidedCurtailment:without.curtailed-total.curtailed};
  }


  var RN_GRID_STUDY_RULES='Each sampled connection rating replays the captured system from minute zero under all three battery strategies. Equipment, initial stored energy, resource profiles, demand schedule, and grid outages stay fixed. The import cap is enabled for every candidate, including zero kW; it never changes grid availability. Demand served includes direct generation, battery discharge, and grid imports. Targets apply to energy over the whole sequence, not every minute. The lowest passing sampled rating is not an exact minimum, optimum, cost estimate, or reliability guarantee. No demand means the target is not evaluated.';
  function rnGridStudyConfig(settings,input){
    var s=rnMicrogridSettings(settings);input=input||{};
    var low=rnNumber(input.min,0,0,1000000),high=rnNumber(input.max,Math.min(1000000,Math.max(1,s.demand*2,s.gridLimit.enabled?s.gridLimit.power:0)),0,1000000);
    return {min:Math.min(low,high),max:Math.max(low,high),count:[5,9,17].indexOf(input.count)>=0?input.count:5,target:rnNumber(input.target,100,0,100)};
  }
  function rnGridStudyCase(settings,power,policy){
    return rnMicrogridSettings(Object.assign({},settings,{gridLimit:{enabled:true,power:power},policy:policy}));
  }
  function rnGridStudyMetrics(run,target){
    return {policy:run.settings.policy,totals:run.totals,coverage:run.servedPercent,initialStored:run.initialStored,endStored:run.endStored,
      firstUnserved:run.firstUnserved,unservedMinutes:run.unservedMinutes,gridSummary:run.gridSummary,
      meetsTarget:run.totals.demand>0?run.totals.unserved<=run.totals.demand*(1-target/100)+run.totals.demand*1e-9:null};
  }
  function rnGridStudySetup(request){
    request=request||{};var settings=rnMicrogridSettings(request.settings),config=rnGridStudyConfig(settings,request.config),powers=[];
    for(var i=0;i<config.count;i++){var power=i===config.count-1?config.max:config.min+(config.max-config.min)*i/(config.count-1);if(powers.indexOf(power)<0)powers.push(power);}
    return {settings:settings,config:config,duration:settings.duration,samples:powers.map(function(power,index){return {index:index,power:power};})};
  }
  function rnGridStudy(request){
    var setup=rnGridStudySetup(request),settings=setup.settings,config=setup.config;
    var samples=setup.samples.map(function(sample){return {index:sample.index,power:sample.power,strategies:RN_MICROGRID_POLICIES.map(function(p){return rnGridStudyMetrics(rnMicrogridRun(rnGridStudyCase(settings,sample.power,p.id)),config.target);})};});
    var strategies=RN_MICROGRID_POLICIES.map(function(p,j){var matches=samples.filter(function(r){return r.strategies[j].meetsTarget;});return {policy:p.id,name:p.name,passing:matches.length,lowestPassingIndex:matches.length?matches[0].index:null,lowestPassingPower:matches.length?matches[0].power:null};});
    return {version:1,microgridVersion:5,settings:settings,config:config,duration:settings.duration,samples:samples,strategies:strategies,baseline:rnGridStudyMetrics(rnMicrogridRun(settings),config.target),assumptions:RN_GRID_STUDY_RULES};
  }
  function rnGridStudyCsv(study){
    var headers=['rating_kW','strategy','target_percent','demand_served_percent','meets_target','demand_kWh','grid_import_kWh','unserved_kWh','connection_limit_unserved_kWh','grid_unavailable_unserved_kWh','battery_discharge_kWh','initial_storage_kWh','final_storage_kWh','first_unserved_min','unserved_intervals','peak_import_kW','peak_request_kW','lowest_passing_sample','microgrid_version','study_version','case_settings_json'],data=[];
    study.samples.forEach(function(sample){sample.strategies.forEach(function(e,j){data.push([sample.power,e.policy,study.config.target,e.coverage,e.meetsTarget,e.totals.demand,e.totals.grid,e.totals.unserved,e.totals.gridLimited,e.totals.gridUnavailable,e.totals.discharge,e.initialStored,e.endStored,e.firstUnserved,e.unservedMinutes,e.gridSummary.peakImport,e.gridSummary.peakRequested,study.strategies[j].lowestPassingIndex===sample.index,study.microgridVersion,study.version,JSON.stringify(rnGridStudyCase(study.settings,sample.power,e.policy))]);});});
    return [headers].concat(data).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }


  var RN_GRID_PAIR_RULES='A and B replay the same captured experiment from minute zero. Only their grid import rating and battery strategy may differ; the recorded baseline retains its original limit setting and strategy. All changes are B minus A. Unmet-demand reductions and increases are evaluated separately at each one-minute interval; equal total energy can hide different timing. Stored energy is measured at interval boundaries. The final endpoint adds no power or energy. This comparison is a deterministic teaching replay, not a forecast or an optimized design.';
  var RN_GRID_PAIR_FIELDS=['grid','unserved','discharge','charge','curtailed','gridLimited','gridUnavailable','stored'];
  function rnGridPairChoices(study){
    var s=study.settings,choices=[{key:'baseline',index:null,policy:s.policy,name:'Recorded baseline',settings:s}];
    study.samples.forEach(function(row){RN_MICROGRID_POLICIES.forEach(function(p){choices.push({key:row.index+':'+p.id,index:row.index,policy:p.id,name:row.power.toLocaleString(undefined,{maximumSignificantDigits:10})+' kW · '+p.name,settings:rnGridStudyCase(s,row.power,p.id)});});});return choices;
  }

  var RN_GRID_PERIOD_RULES='Periods join consecutive minutes where B has less or more unmet demand than A. A change of no more than one billionth of that minute’s demand is treated as roundoff and ends a period. End minutes are excluded. Improvement and worsening energy are counted separately, so equal net change can still hide trade-offs. Raw changes in the remaining intervals are retained in the energy reconciliation. Stored energy is measured at the start and end boundaries; these values are not summed. Availability changes do not split a period if its direction stays the same. Energy ranking uses twelve significant digits, with ties ordered by start time; exports retain the raw values.';
  function rnGridPeriodPrefs(input){input=input||{};return {open:input.open===true,kind:['improved','worsened'].indexOf(input.kind)>=0?input.kind:'all',sort:['energy','duration'].indexOf(input.sort)>=0?input.sort:'time',page:Math.floor(rnNumber(input.page,0,0,720)),selected:typeof input.selected==='string'?input.selected.slice(0,100):null,moment:['start','last'].indexOf(input.moment)>=0?input.moment:'peak'};}
  function rnGridPairPeriods(pair){
    var episodes=[],active=null,fields=RN_GRID_PAIR_FIELDS.filter(function(k){return k!=='stored';}),totals={avoidedUnserved:0,addedUnserved:0,remainingEnergyChange:0,netEnergyChange:0,improvedMinutes:0,worsenedMinutes:0,unchangedMinutes:0};
    function zero(){var out={};fields.forEach(function(k){out[k]=0;});return out;}
    function finish(){if(!active)return;active.minutes=active.end-active.start;active.key=active.kind+':'+active.start+':'+active.end;active.magnitude=Math.abs(active.delta.unserved);episodes.push(active);active=null;}
    pair.rows.forEach(function(row){if(row.minute>=pair.duration)return;var difference=row.delta.unserved,tolerance=Math.max(row.demand,Number.MIN_VALUE)*1e-9,kind=difference>tolerance?'worsened':difference< -tolerance?'improved':null;
      totals.netEnergyChange+=difference/60;
      if(!kind){finish();totals.unchangedMinutes++;totals.remainingEnergyChange+=difference/60;return;}
      if(kind==='improved'){totals.improvedMinutes++;totals.avoidedUnserved-=difference/60;}else{totals.worsenedMinutes++;totals.addedUnserved+=difference/60;}
      if(active&&active.kind!==kind)finish();
      if(!active)active={kind:kind,start:row.minute,end:row.minute+1,demand:0,generation:0,direct:0,a:zero(),b:zero(),delta:zero(),startStored:{a:row.a.stored,b:row.b.stored},endStored:{a:row.a.stored,b:row.b.stored},availableMinutes:0,unavailableMinutes:0,peakDifference:0,peakMinute:row.minute};
      active.end=row.minute+1;active.demand+=row.demand/60;active.generation+=row.generation/60;active.direct+=Math.min(row.demand,row.generation)/60;
      fields.forEach(function(k){active.a[k]+=row.a[k]/60;active.b[k]+=row.b[k]/60;active.delta[k]+=row.delta[k]/60;});
      var boundary=pair.rows[row.minute+1];active.endStored={a:boundary.a.stored,b:boundary.b.stored};if(row.gridAvailable)active.availableMinutes++;else active.unavailableMinutes++;
      if(Math.abs(difference)>active.peakDifference){active.peakDifference=Math.abs(difference);active.peakMinute=row.minute;}
    });finish();
    return {version:1,comparisonVersion:pair.version,microgridVersion:pair.microgridVersion,duration:pair.duration,episodes:episodes,totals:totals,assumptions:RN_GRID_PERIOD_RULES};
  }
  function rnGridPeriodView(analysis,input){
    var prefs=rnGridPeriodPrefs(input),episodes=analysis.episodes.filter(function(e){return prefs.kind==='all'||e.kind===prefs.kind;});
    episodes.sort(function(a,b){return (prefs.sort==='energy'?Number(b.magnitude.toPrecision(12))-Number(a.magnitude.toPrecision(12)):prefs.sort==='duration'?b.minutes-a.minutes:0)||a.start-b.start;});
    var pages=Math.max(1,Math.ceil(episodes.length/6)),page=Math.min(prefs.page,pages-1),selected=episodes.find(function(e){return e.key===prefs.selected;})||episodes[page*6]||null;
    if(selected)page=Math.floor(episodes.indexOf(selected)/6);
    return {prefs:prefs,page:page,pages:pages,episodes:episodes,visible:episodes.slice(page*6,page*6+6),selected:selected,minute:selected?(prefs.moment==='start'?selected.start:prefs.moment==='last'?selected.end-1:selected.peakMinute):null};
  }
  function rnGridPeriodCsv(pair){
    var headers=['direction','start_min','end_min_exclusive','duration_min','unserved_change_kWh','absolute_impact_kWh','peak_difference_kW','peak_min','demand_kWh','direct_generation_kWh','a_unserved_kWh','b_unserved_kWh','a_grid_kWh','b_grid_kWh','grid_change_kWh','a_discharge_kWh','b_discharge_kWh','discharge_change_kWh','a_start_storage_kWh','b_start_storage_kWh','a_end_storage_kWh','b_end_storage_kWh','grid_available_minutes','grid_unavailable_minutes','connection_limit_change_kWh','grid_unavailable_change_kWh','case_a','case_b','microgrid_version','comparison_version','period_version','case_a_settings_json','case_b_settings_json'];
    var analysis=pair.periods||rnGridPairPeriods(pair),as=JSON.stringify(pair.a.settings),bs=JSON.stringify(pair.b.settings),rows=analysis.episodes.map(function(e){return [e.kind,e.start,e.end,e.minutes,e.delta.unserved,e.magnitude,e.peakDifference,e.peakMinute,e.demand,e.direct,e.a.unserved,e.b.unserved,e.a.grid,e.b.grid,e.delta.grid,e.a.discharge,e.b.discharge,e.delta.discharge,e.startStored.a,e.startStored.b,e.endStored.a,e.endStored.b,e.availableMinutes,e.unavailableMinutes,e.delta.gridLimited,e.delta.gridUnavailable,pair.a.key,pair.b.key,pair.microgridVersion,pair.version,analysis.version,as,bs];});
    return [headers].concat(rows).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }

  function rnGridPairState(study,input){
    input=input||{};var choices=rnGridPairChoices(study);
    function key(value,fallback){return choices.some(function(c){return c.key===value;})?value:fallback;}
    return {a:key(input.a,'baseline'),b:key(input.b,'0:fixed'),minute:Math.floor(rnNumber(input.minute,0,0,study.duration)),chart:['unserved','grid','stored'].indexOf(input.chart)>=0?input.chart:'unserved',open:input.open===true,note:typeof input.note==='string'?input.note.slice(0,3000):'',periods:rnGridPeriodPrefs(input.periods)};
  }
  function rnGridPair(study,input){
    var view=rnGridPairState(study,input),choices=rnGridPairChoices(study),a=choices.find(function(c){return c.key===view.a;}),b=choices.find(function(c){return c.key===view.b;}),ar=rnMicrogridRun(a.settings),br=rnMicrogridRun(b.settings);
    var summary={improvedMinutes:0,worsenedMinutes:0,unchangedMinutes:0,firstDifference:null,largestReduction:0,largestReductionMinute:null,largestIncrease:0,largestIncreaseMinute:null},deltas={};
    Object.keys(ar.totals).forEach(function(k){deltas[k]=br.totals[k]-ar.totals[k];});
    var rows=ar.rows.map(function(row,i){var other=br.rows[i],av={},bv={},delta={};RN_GRID_PAIR_FIELDS.forEach(function(k){av[k]=row[k];bv[k]=other[k];delta[k]=other[k]-row[k];});
      if(i<study.duration){var tolerance=Math.max(row.demand,Number.MIN_VALUE)*1e-9,difference=delta.unserved;
        if(difference>tolerance){summary.worsenedMinutes++;if(summary.firstDifference===null)summary.firstDifference=i;if(difference>summary.largestIncrease){summary.largestIncrease=difference;summary.largestIncreaseMinute=i;}}
        else if(difference< -tolerance){summary.improvedMinutes++;if(summary.firstDifference===null)summary.firstDifference=i;if(-difference>summary.largestReduction){summary.largestReduction=-difference;summary.largestReductionMinute=i;}}
        else summary.unchangedMinutes++;
      }
      return {minute:row.minute,demand:row.demand,generation:row.generation,gridAvailable:row.gridAvailable,a:av,b:bv,delta:delta};});
    function pack(choice,run){return {key:choice.key,index:choice.index,policy:choice.policy,name:choice.name,settings:run.settings,totals:run.totals,coverage:run.servedPercent,initialStored:run.initialStored,endStored:run.endStored};}
    var result={version:1,microgridVersion:5,duration:study.duration,view:view,a:pack(a,ar),b:pack(b,br),deltaTotals:deltas,deltaEndStored:br.endStored-ar.endStored,summary:summary,rows:rows,assumptions:RN_GRID_PAIR_RULES};
    result.periods=rnGridPairPeriods(result);var selected=rnGridPeriodView(result.periods,view.periods);result.periodSelection={key:selected.selected?selected.selected.key:null,page:selected.page,minute:selected.minute};return result;
  }
  function rnGridPairCsv(pair){
    var headers=['minute','case_a','case_b','demand_kW','generation_kW','grid_available'];
    ['a','b','change'].forEach(function(prefix){RN_GRID_PAIR_FIELDS.forEach(function(k){headers.push(prefix+'_'+k+(k==='stored'?'_kWh':'_kW'));});});
    headers.push('microgrid_version','comparison_version','case_a_settings_json','case_b_settings_json');
    var as=JSON.stringify(pair.a.settings),bs=JSON.stringify(pair.b.settings),rows=pair.rows.map(function(r){var values=[r.minute,pair.a.key,pair.b.key,r.demand,r.generation,r.gridAvailable];[r.a,r.b,r.delta].forEach(function(source){RN_GRID_PAIR_FIELDS.forEach(function(k){values.push(source[k]);});});return values.concat([pair.microgridVersion,pair.version,as,bs]);});
    return [headers].concat(rows).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }

  function rnOutageConfig(settings,input){
    var s=rnMicrogridSettings(settings);input=input||{};
    return {minutes:Math.floor(rnNumber(input.minutes,Math.min(60,s.duration),1,s.duration)),count:[5,13,25].indexOf(input.count)>=0?input.count:13};
  }
  function rnOutageSignature(settings){
    var s=rnMicrogridSettings(settings);['policy','grid','outageStart','outageMinutes'].forEach(function(k){delete s[k];});return JSON.stringify(s);
  }
  function rnOutageStudy(request){
    request=request||{};var settings=rnMicrogridSettings(request.settings),config=rnOutageConfig(settings,request.config),last=settings.duration-config.minutes,starts=[];
    for(var i=0;i<config.count;i++){var start=Math.round(last*i/(config.count-1));if(starts.indexOf(start)<0)starts.push(start);}
    var samples=starts.map(function(start,index){
      var end=start+config.minutes;
      return {index:index,start:start,end:end,strategies:RN_MICROGRID_POLICIES.map(function(policy){
        var run=rnMicrogridRun(Object.assign({},settings,{grid:'outage',outageStart:start,outageMinutes:config.minutes,policy:policy.id}));
        var demand=0,unserved=0,firstGap=null,gapMinutes=0,maxGap=0;
        for(var minute=start;minute<end;minute++){
          var row=run.rows[minute];demand+=row.demand/60;unserved+=row.unserved/60;maxGap=Math.max(maxGap,row.unserved);
          if(row.unserved>Math.max(row.demand,Number.MIN_VALUE)*1e-9){if(firstGap===null)firstGap=minute;gapMinutes++;}
        }
        return {policy:policy.id,demand:demand,unserved:unserved,served:Math.max(0,demand-unserved),
          coverage:demand>0?100*Math.max(0,Math.min(1,(demand-unserved)/demand)):null,fullyServed:demand>0&&firstGap===null,noDemand:demand===0,
          firstGap:firstGap,gapMinutes:gapMinutes,maxGap:maxGap,storedAtStart:run.rows[start].stored,storedAtEnd:run.rows[end].stored,
          gridBeforeOutage:run.rows[start].energy.grid,systemTotals:run.totals};
      })};
    });
    var strategies=RN_MICROGRID_POLICIES.map(function(policy,j){
      var entries=samples.map(function(r){return r.strategies[j];}),worst=0;
      entries.forEach(function(r,i){if(r.unserved>entries[worst].unserved)worst=i;});
      return {policy:policy.id,name:policy.name,covered:entries.filter(function(r){return r.fullyServed;}).length,
        evaluated:entries.filter(function(r){return !r.noDemand;}).length,noDemand:entries.filter(function(r){return r.noDemand;}).length,
        worstIndex:worst,worstUnserved:entries[worst].unserved};
    });
    return {version:1,microgridVersion:5,settings:settings,config:config,duration:settings.duration,samples:samples,strategies:strategies,
      assumptions:'Each case replays the same source, demand, and initial charge from minute zero. Grid backup is available outside the sampled outage, subject to the captured import limit. All three battery strategies use the same equipment, conversion efficiency, and configured reserve; Save for outages holds all energy while the grid is available. No grid charging or forecast-based precharging. Samples are not outage probabilities or a reliability guarantee.'};
  }

  function rnBatteryDesignConfig(settings,input){
    var s=rnMicrogridSettings(settings);input=input||{};
    var low=rnNumber(input.capacityMin,10,10,500),high=rnNumber(input.capacityMax,Math.min(500,Math.max(50,s.battery.capacity*2)),10,500);
    var plow=rnNumber(input.powerMin,0,0,200),phigh=rnNumber(input.powerMax,Math.min(200,Math.max(10,s.battery.power*2)),0,200);
    return {capacityMin:Math.min(low,high),capacityMax:Math.max(low,high),powerMin:Math.min(plow,phigh),powerMax:Math.max(plow,phigh),
      count:input.count===9?9:5,target:rnNumber(input.target,90,0,100),initialMode:input.initialMode==='percent'?'percent':'energy'};
  }
  function rnBatteryDesignCase(settings,config,capacity,power){
    var s=rnMicrogridSettings(settings),battery=rnEnergySettings('storage',Object.assign({},s.battery,{capacity:capacity,power:power}));config=rnBatteryDesignConfig(s,config);
    if(config.initialMode==='energy')battery.initial=Math.min(100,s.battery.capacity*s.battery.initial/battery.capacity);
    return rnMicrogridSettings(Object.assign({},s,{battery:battery}));
  }
  function rnBatteryDesignMetrics(run,target){
    var demand=run.totals.demand,local=run.totals.direct+run.totals.discharge,coverage=demand>0?100*Math.max(0,Math.min(1,local/demand)):null;
    var firstGap=null,powerLimitedMinutes=0,energyLimitedMinutes=0,eta=Math.sqrt(run.settings.battery.roundtrip/100);
    run.rows.forEach(function(row){
      var tolerance=Math.max(row.demand,Number.MIN_VALUE)*1e-9,deficit=row.demand-row.direct;
      if(row.grid+row.unserved>tolerance){
        if(firstGap===null)firstGap=row.minute;
        if(deficit-run.power>tolerance)powerLimitedMinutes++;
        if(deficit-Math.max(0,row.stored-row.reserve)*eta*60>tolerance)energyLimitedMinutes++;
      }
    });
    return {capacity:run.capacity,power:run.power,initialStored:run.initialStored,endStored:run.endStored,localEnergy:local,demand:demand,coverage:coverage,
      meetsTarget:coverage!==null&&coverage>=target-Math.max(target,Number.MIN_VALUE)*1e-9,firstGap:firstGap,powerLimitedMinutes:powerLimitedMinutes,energyLimitedMinutes:energyLimitedMinutes,totals:run.totals};
  }
  function rnBatteryDesignStudy(request){
    request=request||{};var settings=rnMicrogridSettings(request.settings),config=rnBatteryDesignConfig(settings,request.config);
    function axis(min,max){var values=[];for(var i=0;i<config.count;i++){var value=Number((min+(max-min)*i/(config.count-1)).toFixed(6));if(values.indexOf(value)<0)values.push(value);}return values;}
    var capacities=axis(config.capacityMin,config.capacityMax),powers=axis(config.powerMin,config.powerMax);
    var baseline=rnBatteryDesignMetrics(rnMicrogridRun(settings),config.target),samples=[];
    if(settings.batteryUnits>0)capacities.forEach(function(capacity,ci){powers.forEach(function(power,pi){
      var candidate=rnBatteryDesignCase(settings,config,capacity,power),entry=rnBatteryDesignMetrics(rnMicrogridRun(candidate),config.target);
      samples.push(Object.assign(entry,{index:samples.length,capacityIndex:ci,powerIndex:pi,unitCapacity:capacity,unitPower:power,
        initialPercent:candidate.battery.initial,initialClipped:config.initialMode==='energy'&&entry.capacity<baseline.initialStored-1e-9}));
    });});
    var passing=samples.filter(function(e){return e.meetsTarget;}),frontier=passing.filter(function(e){return !passing.some(function(other){
      return other.capacity<=e.capacity&&other.power<=e.power&&(other.capacity<e.capacity||other.power<e.power);
    });}).map(function(e){return e.index;});
    return {version:1,microgridVersion:5,settings:settings,config:config,capacities:capacities,powers:powers,baseline:baseline,samples:samples,frontier:frontier,
      passing:passing.length,clipped:samples.filter(function(e){return e.initialClipped;}).length,
      assumptions:'Each design replays the captured source, demand, grid schedule and import limit, reserve, and dispatch strategy from minute zero. Capacity and power vary per unit; the unit count and efficiency stay fixed. Local coverage counts direct generation and battery discharge, excluding grid imports. Initial stored energy has no assigned source. Same starting energy caps the captured initial kWh at each candidate capacity; same starting percentage gives larger banks more initial energy. Compact options meet the target with no other sampled passing design using both no more capacity and no more power, with at least one strictly lower. These are sampled teaching comparisons, not installation recommendations or guaranteed optima.'};
  }

  var RN_SUPPLY_GAP_PARTS=[
    ['noBank','No battery bank','The system has no installed battery units.'],
    ['power','Battery power limit','The part of the generation deficit above the bank power rating is assigned first.'],
    ['energy','Stored-energy limit','Within the power rating, this part cannot be delivered from the energy currently stored, including discharge losses.'],
    ['held','Energy held by strategy','Energy physically available within the power rating is held by the reserve or backup strategy.']
  ];
  var RN_SUPPLY_GAP_RULES='A local supply gap is demand left after direct generation and battery discharge. Grid imports plus unserved demand equal that gap. Unserved demand is split into imports blocked by a connection limit while the grid is available and demand unmet while the grid is unavailable. Episodes join consecutive one-minute intervals with a gap; the end minute is excluded. Gaps no larger than one billionth of that minute’s demand are treated as numerical roundoff for episode detection. Gap accounting assigns demand above battery power first, then the stored-energy limit within that power rating, then energy held by the strategy. With no installed bank, the entire gap is assigned to no battery bank. These are an ordered accounting of the current replay, not independent causes or predictions of the benefit from changing equipment. Stored energy includes the initial charge and has no assigned generation source.';
  function rnSupplyGapAnalysis(run){
    var eta=Math.sqrt(run.settings.battery.roundtrip/100),totals={localGap:0,grid:0,unserved:0,gridLimited:0,gridUnavailable:0,noBank:0,power:0,energy:0,held:0};
    var rows=run.rows.map(function(row){
      var deficit=Math.max(0,row.demand-row.direct),localGap=row.grid+row.unserved,parts={noBank:0,power:0,energy:0,held:0};
      if(localGap>0){
        if(run.settings.batteryUnits===0)parts.noBank=localGap;
        else{
          var within=Math.min(deficit,run.power),physical=Math.min(within,Math.max(0,row.stored)*eta*60);
          parts.power=Math.max(0,deficit-run.power);parts.energy=Math.max(0,within-physical);parts.held=Math.max(0,physical-row.discharge);
        }
      }
      var item={minute:row.minute,localGap:localGap,grid:row.grid,unserved:row.unserved,gridLimited:row.gridLimited,gridUnavailable:row.gridUnavailable,parts:parts};
      ['localGap','grid','unserved','gridLimited','gridUnavailable'].forEach(function(k){totals[k]+=item[k]/60;});
      RN_SUPPLY_GAP_PARTS.forEach(function(p){totals[p[0]]+=parts[p[0]]/60;});
      return item;
    });
    function episodes(key){
      var result=[],active=null;
      function finish(){
        if(!active)return;
        active.endStored=run.rows[active.end].stored;active.minutes=active.end-active.start;
        active.key=active.start+':'+active.end;result.push(active);active=null;
      }
      rows.forEach(function(row){
        var original=run.rows[row.minute],threshold=Math.max(original.demand,Number.MIN_VALUE)*1e-9;
        if(row.minute===run.duration||row[key]<=threshold){finish();return;}
        if(!active)active={start:row.minute,end:row.minute+1,demand:0,direct:0,discharge:0,localGap:0,grid:0,unserved:0,gridLimited:0,gridUnavailable:0,parts:{noBank:0,power:0,energy:0,held:0},startStored:original.stored,endStored:0,peak:0,peakMinute:row.minute,firstUnserved:null};
        active.end=row.minute+1;
        ['demand','direct','discharge'].forEach(function(k){active[k]+=original[k]/60;});
        ['localGap','grid','unserved','gridLimited','gridUnavailable'].forEach(function(k){active[k]+=row[k]/60;});
        RN_SUPPLY_GAP_PARTS.forEach(function(p){active.parts[p[0]]+=row.parts[p[0]]/60;});
        if(row[key]>active.peak){active.peak=row[key];active.peakMinute=row.minute;}
        if(row.unserved>threshold&&active.firstUnserved===null)active.firstUnserved=row.minute;
      });finish();return result;
    }
    return {version:1,microgridVersion:run.version,duration:run.duration,settings:run.settings,demand:run.totals.demand,totals:totals,rows:rows,localEpisodes:episodes('localGap'),unservedEpisodes:episodes('unserved'),assumptions:RN_SUPPLY_GAP_RULES};
  }
  function rnSupplyGapView(analysis,input){
    input=input||{};var scope=input.scope==='unserved'?'unserved':'local',sort=['energy','duration','time'].indexOf(input.sort)>=0?input.sort:'energy';
    var episodes=(scope==='local'?analysis.localEpisodes:analysis.unservedEpisodes).slice(),key=scope==='local'?'localGap':'unserved';
    episodes.sort(function(a,b){return (sort==='energy'?b[key]-a[key]:sort==='duration'?b.minutes-a.minutes:0)||a.start-b.start;});
    var pages=Math.max(1,Math.ceil(episodes.length/8)),page=Math.floor(rnNumber(input.page,0,0,pages-1));
    var selected=episodes.find(function(e){return e.key===input.selected;})||episodes[page*8]||null;
    if(selected)page=Math.floor(episodes.indexOf(selected)/8);
    return {scope:scope,sort:sort,page:page,pages:pages,episodes:episodes,visible:episodes.slice(page*8,page*8+8),selected:selected,note:typeof input.note==='string'?input.note.slice(0,3000):''};
  }
  function rnSupplyGapCsv(analysis,scope,minutes){
    scope=scope==='unserved'?'unserved':'local';var headers,data;
    if(minutes){
      headers=['minute','local_gap_kW','grid_kW','unserved_kW','no_bank_kW','power_limit_kW','stored_energy_limit_kW','strategy_held_kW','grid_limit_unserved_kW','grid_unavailable_unserved_kW'];
      data=analysis.rows.map(function(r){return [r.minute,r.localGap,r.grid,r.unserved,r.parts.noBank,r.parts.power,r.parts.energy,r.parts.held,r.gridLimited,r.gridUnavailable];});
    }else{
      headers=['scope','start_min','end_min_exclusive','duration_min','local_gap_kWh','grid_kWh','unserved_kWh','no_bank_kWh','power_limit_kWh','stored_energy_limit_kWh','strategy_held_kWh','peak_gap_kW','peak_minute','first_unserved_minute','start_stored_kWh','end_stored_kWh','demand_kWh','direct_kWh','discharge_kWh','microgrid_version','analysis_version','settings_json','grid_limit_unserved_kWh','grid_unavailable_unserved_kWh'];
      data=(scope==='local'?analysis.localEpisodes:analysis.unservedEpisodes).map(function(e){return [scope,e.start,e.end,e.minutes,e.localGap,e.grid,e.unserved,e.parts.noBank,e.parts.power,e.parts.energy,e.parts.held,e.peak,e.peakMinute,e.firstUnserved,e.startStored,e.endStored,e.demand,e.direct,e.discharge,analysis.microgridVersion,analysis.version,JSON.stringify(analysis.settings),e.gridLimited,e.gridUnavailable];});
    }
    return [headers].concat(data).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  }

  window.StemLab.renewablesMicrogridModel={version:5,gridStudyPair:function(request,input){return rnGridPair(rnGridStudySetup(request),input);},gridPairPeriods:rnGridPairPeriods,gridPeriodView:rnGridPeriodView,gridPeriodCsv:rnGridPeriodCsv,gridPeriodRules:RN_GRID_PERIOD_RULES,gridPairCsv:rnGridPairCsv,gridPairRules:RN_GRID_PAIR_RULES,gridStudyConfig:rnGridStudyConfig,gridStudyCase:rnGridStudyCase,gridStudy:rnGridStudy,gridStudyCsv:rnGridStudyCsv,gridStudyRules:RN_GRID_STUDY_RULES,gridLimitSettings:rnMicrogridGridLimit,gridLimitRules:RN_GRID_LIMIT_RULES,settings:rnMicrogridSettings,simulate:rnMicrogridRun,loads:RN_MICROGRID_LOADS,policies:RN_MICROGRID_POLICIES,assumptions:RN_MICROGRID_ASSUMPTIONS,outageConfig:rnOutageConfig,outageStudy:rnOutageStudy,outageSignature:rnOutageSignature,designConfig:rnBatteryDesignConfig,designCase:rnBatteryDesignCase,designStudy:rnBatteryDesignStudy,companionSettings:rnMicrogridCompanion,hybridTiming:RN_HYBRID_TIMING,demandShiftSettings:rnDemandShiftSettings,demandSchedule:rnDemandSchedule,demandShiftRules:RN_DEMAND_SHIFT_RULES,supplyGaps:function(input){return rnSupplyGapAnalysis(rnMicrogridRun(input));},supplyGapView:rnSupplyGapView,supplyGapCsv:rnSupplyGapCsv,supplyGapRules:RN_SUPPLY_GAP_RULES};

  function RenewablesEnergyScene(props){
    var React=props.React,h=React.createElement,mount=React.useRef(null),live=React.useRef(props),api=React.useRef(null);
    var statusState=React.useState('loading'),status=statusState[0],retry=React.useState(0),inspectionState=React.useState({id:props.id,layout:'assembled',isolated:false,labels:true});
    var inspection=inspectionState[0].id===props.id?inspectionState[0]:{id:props.id,layout:'assembled',isolated:false,labels:true},selected=rnEnergySpec(props.id).components.find(function(c){return c[0]===props.selected;})||rnEnergySpec(props.id).components[1];
    function inspect(patch){inspectionState[1](Object.assign({},inspection,patch));}
    React.useEffect(function(){inspectionState[1]({id:props.id,layout:'assembled',isolated:false,labels:true});},[props.id]);
    live.current=Object.assign({},props,{selected:selected[0],inspection:inspection});
    React.useEffect(function(){
      var disposed=false,renderer,scene,camera,raf=0,observer,intersection,visible=true,dirty=true,lastProps=null,resize,drag=null;
      var listeners=[],pickables=[],updaters=[],view={yaw:.52,pitch:.5,zoom:1,target:[0,1.4,0]},groups={},labels={},context,fitView=null,focusTarget=null,fitPending=false,lastInspection=null,container=mount.current;
      statusState[1]('loading');
      function bind(target,event,handler){target.addEventListener(event,handler);listeners.push([target,event,handler]);}
      function position(){if(!camera)return;camera.position.set(view.target[0]+Math.sin(view.yaw)*Math.cos(view.pitch)*20,view.target[1]+Math.sin(view.pitch)*20,view.target[2]+Math.cos(view.yaw)*Math.cos(view.pitch)*20);camera.lookAt(view.target[0],view.target[1],view.target[2]);camera.zoom=view.zoom;camera.updateProjectionMatrix();dirty=true;}
      api.current=function(action){
        if(action==='left')view.yaw-=.3;if(action==='right')view.yaw+=.3;
        if(action==='in')view.zoom=Math.min(4,view.zoom*1.2);if(action==='out')view.zoom=Math.max(.15,view.zoom/1.2);
        if(action==='focus'){focusTarget=live.current.selected;fitPending=true;}
        if(action==='top')view.pitch=1.45;
        if(action==='home'){view={yaw:.52,pitch:.5,zoom:1,target:[0,1.4,0]};focusTarget=null;fitPending=live.current.inspection.layout==='exploded'||live.current.inspection.isolated;}
        position();
      };
      function release(){
        if(!scene)return;var geometry=new Set(),materials=new Set(),textures=new Set();
        scene.traverse(function(o){if(o.geometry)geometry.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);if(m.map)textures.add(m.map);});});
        geometry.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});textures.forEach(function(t){t.dispose();});
      }
      var engine=window.THREE?Promise.resolve(window.THREE):window.StemLab.ensureThree?window.StemLab.ensureThree():Promise.reject(new Error('No 3D runtime'));
      engine.then(function(THREE){
        if(disposed)return;
        scene=new THREE.Scene();scene.background=new THREE.Color('#0d2432');context=new THREE.Group();context.name='energy-context';scene.add(context);
        camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100);position();
        renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputEncoding=THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';renderer.domElement.setAttribute('aria-hidden','true');
        scene.add(new THREE.HemisphereLight('#daf5ff','#334036',.95));
        var sun=new THREE.DirectionalLight('#fff0d3',1.05);sun.position.set(-4,12,6);scene.add(sun);
        function material(color,opacity){var m=new THREE.MeshStandardMaterial({color:color,roughness:.58,metalness:.1,transparent:opacity!=null,opacity:opacity==null?1:opacity});m.color.convertSRGBToLinear();return m;}
        function mesh(parent,geometry,color,x,y,z,opacity){var m=new THREE.Mesh(geometry,material(color,opacity));m.position.set(x||0,y||0,z||0);parent.add(m);return m;}
        function box(parent,x,y,z,w,ht,d,color,opacity){return mesh(parent,new THREE.BoxGeometry(w,ht,d),color,x,y,z,opacity);}
        function cylinder(parent,x,y,z,radius,height,color){return mesh(parent,new THREE.CylinderGeometry(radius,radius,height,24),color,x,y,z);}
        function ball(parent,x,y,z,radius,color){return mesh(parent,new THREE.SphereGeometry(radius,16,10),color,x,y,z);}
        function pipe(parent,points,color,radius){
          var curve=new THREE.CatmullRomCurve3(points.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}),false,'centripetal');
          var m=new THREE.Mesh(new THREE.TubeGeometry(curve,40,radius||.085,8,false),material(color));parent.add(m);return curve;
        }
        function particles(parent,curve,color,enabled,speed){
          for(var n=0;n<6;n++){(function(index){var dot=ball(parent,0,0,0,.085,color);updaters.push(function(p){dot.visible=enabled(p);dot.position.copy(curve.getPoint(((p.phase*(speed||.025)+index/6)%1+1)%1));});})(n);}
        }
        function label(text,x,y,z){
          var canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;var ctx=canvas.getContext('2d');
          ctx.fillStyle='#102d3a';ctx.fillRect(0,0,512,80);ctx.strokeStyle='#709ca4';ctx.strokeRect(1,1,510,78);
          ctx.fillStyle='#f0fff8';ctx.font='600 40px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,40,490);
          var texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
          var sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(4.1,.64,1);sprite.renderOrder=10;var key=['resource','converter','generator'][Number(text.charAt(0))-1];sprite.name='energy-label-'+key;sprite.userData.origin=[x,y,z];labels[key]=sprite;scene.add(sprite);
        }
        function rotor(parent,x,y,z,size,color){
          var group=new THREE.Group();group.position.set(x,y,z);parent.add(group);ball(group,0,0,0,.18,color);
          for(var b=0;b<3;b++){var arm=new THREE.Group();arm.rotation.z=b*Math.PI*2/3;group.add(arm);
            var blade=box(arm,.05,size*.51,0,.22,size,.095,color);blade.rotation.z=-.10;}
          return group;
        }

        function runner(parent,x,y,z,size,color){
          var group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
          var rim=new THREE.Mesh(new THREE.TorusGeometry(size,.06,8,32),material(color));group.add(rim);ball(group,0,0,0,size*.23,color);
          for(var n=0;n<12;n++){var blade=new THREE.Group();blade.rotation.z=n*Math.PI/6;group.add(blade);var fin=box(blade,0,size*.63,0,size*.20,size*.55,.10,color);fin.rotation.z=.35;}return group;
        }
        function electricity(parent,points){
          var path=pipe(parent,points,'#f2bf58',.04);particles(parent,path,'#fff2ab',function(p){return p.run.power>1e-8;},.045);
        }
        ['resource','converter','generator'].forEach(function(id){groups[id]=new THREE.Group();groups[id].name='energy-'+id;groups[id].userData.component=id;scene.add(groups[id]);});
        var A=groups.resource,B=groups.converter,C=groups.generator,id=props.id;
        box(context,0,-.28,0,13,.45,8.5,'#315849');
        var grid=new THREE.GridHelper(8,8,'#4b786b','#416959');grid.position.y=-.045;context.add(grid);
        // Common generator output load.
        var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');box(C,4.6,1.28,2.6,1.45,.16,1.15,'#395b60');
        var lamp=ball(C,4.6,1.65,2.6,.16,'#e4b34d');
        updaters.push(function(p){lamp.material.emissive.set(p.run.power>1e-8?'#efb95a':'#000000');lamp.material.emissiveIntensity=.7;});
        if(id==='solarPv'){
          ball(A,-4,5,0,.55,'#ffd378');
          var array=new THREE.Group();array.position.set(-1.5,1.15,0);B.add(array);
          for(var n=0;n<12;n++){var x=(n%4-1.5)*.94,z=(Math.floor(n/4)-1)*.85;
            box(array,x,0,z,.88,.10,.79,'#2768ad');box(array,x,.06,z,.025,.015,.78,'#93cef2');box(array,x,.06,z,.86,.015,.025,'#93cef2');}
          [-2.5,-.5].forEach(function(x){cylinder(B,x,.5,0,.07,1,'#9fb5be');});
          for(var n=0;n<5;n++){var x=-3+n*.6;pipe(A,[[x,4.4,-.2],[x,2.2,-.2]],'#ffcf65',.025);}
          box(C,2,1,0,1.2,1.8,.8,'#dce9e3');box(C,2,1.3,.43,.55,.35,.06,'#47ad91');
          electricity(C,[[-.3,.5,1.5],[2,.3,1.5],[4.6,.3,2.6]]);
          updaters.push(function(p){array.rotation.z=-p.run.settings.incidence*Math.PI/180;var size=Math.sqrt(p.run.settings.area/20);array.scale.set(size*.75,1,size*.75);sun.intensity=.2+p.run.settings.irradiance/1100;A.visible=p.run.settings.irradiance>0;});
          label('1  Direct sunlight',-3.8,5.8,0);label('2  PV array',-1.2,.55,2.4);label('3  Inverter',2,2.5,0);
        }else if(id==='wind'||id==='tidal'){
          var marine=id==='tidal';if(marine){box(context,0,.9,0,12,2,8,'#16506a',.25);box(context,0,-.03,0,12,.07,8,'#587b72');}
          var tower=cylinder(B,-1.1,1.9,0,.14,3.8,marine?'#f2b553':'#dce9ef');
          var hub=box(C,-1.1,3.65,-.3,.55,.52,1.1,'#c5dee5'),blade=rotor(B,-1.1,3.65,.35,2.05,marine?'#f0ce77':'#f5f5e6');
          if(marine){tower.scale.y=.6;tower.position.y=1.1;hub.position.y=2.25;blade.position.y=2.25;}
          for(var n=0;n<4;n++){var path=pipe(A,[[-4+n*.8,2,3],[-4+n*.8,2,-3]],marine?'#53b8d2':'#6a9cbb',.025);
            particles(A,path,'#b7f2ff',function(p){return Math.abs(p.run.settings.speed)>0;},.02);}
          electricity(C,[[-.9,.2,0],[2,.2,0],[4.6,.2,2.6]]);
          updaters.push(function(p){var size=marine?p.run.settings.radius/5:p.run.settings.radius/40;blade.scale.setScalar(.65+size*.35);
            blade.rotation.z=p.run.power>1e-8?-p.phase*Math.sign(p.run.settings.speed)*Math.min(1.3,Math.abs(p.run.settings.speed)*.12):0;
            A.rotation.y=p.run.settings.speed<0?Math.PI:0;});
          label(marine?'1  Reversible current':'1  Wind stream',-3.9,marine?3.3:3.7,2.4);
          label('2  Rotor',-1.2,marine?4.5:6.4,.6);label('3  Generator',1.5,marine?3.4:4.5,-1.4);
        }else if(id==='hydro'){
          var reservoir=box(A,-3,2,0,3,3.8,4,'#407461');var reservoirWater=box(A,-3,4,0,2.9,.15,3.9,'#3c9dcb',.8);
          var dam=box(B,-1.15,1.8,0,.5,3.5,4.3,'#8b9e9e');
          var hydroRunner=runner(B,1,.8,.7,.6,'#edc36e');var casing=cylinder(B,1,.8,0,.8,1.15,'#769ea7');casing.rotation.x=Math.PI/2;casing.material.transparent=true;casing.material.opacity=.3;
          var penstock=pipe(B,[[-2.5,3.7,1.1],[-.8,3,1.1],[.2,.8,1.1],[1,.8,.8]],'#77d0e3',.19);particles(B,penstock,'#d9fbff',function(p){return p.run.settings.flow>0;},.04);
          box(C,2.2,.65,-.4,1.1,1.25,1.6,'#d1e4d9');box(context,2,.05,1.7,4,.15,1.4,'#368eac',.8);electricity(C,[[2.2,.3,-.4],[3.8,.3,-.4],[4.6,.3,2.6]]);
          var previousHead=null;updaters.push(function(p){var scale=.70+p.run.settings.head/180;reservoir.scale.y=scale;reservoir.position.y=scale*1.9;reservoirWater.position.y=scale*3.8+.1;dam.scale.y=scale;dam.position.y=scale*1.75;hydroRunner.rotation.z=p.run.power>0?-p.phase*.6:0;
            if(previousHead!==p.run.settings.head){previousHead=p.run.settings.head;penstock.points[0].y=scale*3.8;penstock.points[1].y=scale*2.8;penstock.updateArcLengths();B.traverse(function(o){if(o.geometry&&o.geometry.type==='TubeGeometry'&&o.geometry.parameters.path===penstock){o.geometry.dispose();o.geometry=new THREE.TubeGeometry(penstock,40,.19,8,false);}});}});
          label('1  Reservoir & head',-3.2,5,0);label('2  Penstock & runner',0,2.1,2);label('3  Powerhouse',3,2.3,-.6);
        }else if(id==='geothermal'){
          box(A,-2.5,.7,0,5,1.4,4.5,'#aa6249');box(A,-2.5,1.6,0,5,.35,4.5,'#75634c');box(A,-2.5,2,0,5,.35,4.5,'#568371');
          var hot=pipe(A,[[-4,.2,2.4],[-4,3,2.4],[-1,3,2.4],[.2,2,0]],'#f19462',.12);
          var cool=pipe(A,[[.5,1,0],[-2,2.6,2.4],[-2,.2,2.4]],'#55a9d1',.12);
          particles(A,hot,'#ffd2a5',function(p){return p.run.available>0;},.03);particles(A,cool,'#b4e6ff',function(p){return p.run.available>0;},.03);
          cylinder(B,.5,1.6,0,.7,2,'#d4a465');for(var n=0;n<4;n++)pipe(B,[[0,1+n*.3,.65],[1,1+n*.3,.65]],'#f2d598',.035);
          pipe(B,[[1.1,2,0],[2,2,0],[2,1,-1],[1.1,1,-1]],'#d8ba7a',.08);
          var rotorGeo=runner(C,2.4,1.5,.8,.55,'#d6edf1');box(C,2.4,.7,0,1,1.3,1.4,'#688c99');
          cylinder(C,3.9,.9,-2,.65,1.7,'#afc7c6');electricity(C,[[2.4,.2,0],[3.5,.2,0],[4.6,.2,2.6]]);
          updaters.push(function(p){rotorGeo.rotation.z=p.run.power>0?-p.phase*.7:0;});
          label('1  Production / reinjection',-2.7,4,0);label('2  Heat exchanger',.5,3.2,0);label('3  Binary power block',3.5,3,-1.5);
        }else if(id==='solarThermal'){
          var field=new THREE.Group();A.add(field);
          for(var n=0;n<12;n++){var x=-4+(n%4)*1.15,z=-2+Math.floor(n/4)*1.6;var mirror=box(field,x,.6,z,.9,.10,.85,'#b5dce3');mirror.rotation.z=-.35;
            cylinder(field,x,.28,z,.045,.5,'#b0beb9');pipe(field,[[x,.7,z],[.5,4.6,0]],'#efc761',.015);}
          cylinder(B,.5,2.2,0,.22,4.4,'#b6c7ba');var receiver=box(B,.5,4.6,0,.8,.8,.8,'#e99c46');
          var thermal=pipe(B,[[.65,4.5,0],[.65,.3,0],[2.5,.6,0]],'#e58b4c',.09);particles(B,thermal,'#ffdeb2',function(p){return p.run.power>0;},.03);
          box(C,2.6,.9,-.3,1.4,1.7,1.2,'#d6e3d8');electricity(C,[[2.6,.2,0],[3.8,.2,0],[4.6,.2,2.6]]);
          updaters.push(function(p){field.scale.setScalar(.6+.4*Math.sqrt(p.run.settings.area/10000));receiver.material.emissive.set('#bf5d14');receiver.material.emissiveIntensity=p.run.settings.dni/1100;});
          label('1  Heliostat field',-3,2.2,2.5);label('2  Tower receiver',.5,5.7,0);label('3  Power block',3.2,2.5,-.5);
        }else if(id==='wave'){
          var ocean=new THREE.Mesh(new THREE.PlaneGeometry(12,7.6,48,24),new THREE.MeshStandardMaterial({color:'#286e91',roughness:.3,metalness:.25,side:THREE.DoubleSide}));
          ocean.material.color.convertSRGBToLinear();ocean.rotation.x=-Math.PI/2;ocean.position.y=1;A.add(ocean);
          var buoy=cylinder(B,-1,1.5,0,.75,.75,'#ffc35b');cylinder(B,-1,.55,0,.14,1.5,'#b8d2d9');box(C,2,1.1,0,1.8,2,1.4,'#accad1');
          pipe(B,[[-1,.35,0],[-1,.35,2],[2,.35,2],[2,1,0]],'#abcad0',.10);electricity(C,[[2,.25,0],[3.4,.25,0],[4.6,.25,2.6]]);
          updaters.push(function(p){var array=ocean.geometry.attributes.position;
            for(var i=0;i<array.count;i++){var x=array.getX(i);array.setZ(i,Math.sin(x*.9-p.phase*2*Math.PI/p.run.settings.period)*p.run.settings.height*.13);}
            array.needsUpdate=true;ocean.geometry.computeVertexNormals();buoy.position.y=1.5+Math.sin(-.9-p.phase*2*Math.PI/p.run.settings.period)*p.run.settings.height*.13;});
          label('1  Surface waves',-3.6,3,-1);label('2  Heaving buoy',-1,3,1);label('3  Power take-off',2.6,3,-.5);
        }else if(id==='biomass'){
          var hopper=box(A,-3.7,.75,0,2.1,1.4,2.2,'#96815b');for(var n=0;n<10;n++)ball(A,-4.2+(n%3)*.5,1.4+Math.floor(n/3)*.12,-.6+(n%4)*.4,.20,'#d4b172');
          var feed=pipe(A,[[-3.7,.8,0],[-2,.8,0],[-1,1.2,0]],'#9caa9f',.20);particles(A,feed,'#f4d999',function(p){return p.run.settings.feed>0;},.04);
          box(B,-.7,1.45,0,2,2.8,2.1,'#879fa4');var fire=ball(B,-.7,.7,1.1,.45,'#f6a850');cylinder(B,-1,3.5,-.6,.2,2.3,'#859293');
          var steam=pipe(B,[[0,2.5,0],[1.8,2.5,0],[2.3,1.2,0]],'#d1e3dd',.13);particles(B,steam,'#f8f9e3',function(p){return p.run.power>0;},.035);
          var steamRotor=runner(C,2.5,1.1,.6,.6,'#d9ede3');box(C,2.5,.6,-.2,1.5,1.1,1.4,'#557f8d');electricity(C,[[2.5,.25,0],[3.5,.25,0],[4.6,.25,2.6]]);
          updaters.push(function(p){fire.visible=p.run.settings.feed>0;fire.scale.setScalar(.5+p.run.settings.feed/2000);steamRotor.rotation.z=p.run.power>0?-p.phase*.65:0;});
          label('1  Fuel hopper',-3.7,2.7,0);label('2  Boiler',-.8,4.9,0);label('3  Steam turbine',2.7,2.7,.6);
        }else{
          box(A,-4,1,0,1.4,2,1.3,'#a7bace');box(A,-4,1.5,.67,.8,.4,.04,'#5d9eba');
          for(var n=0;n<3;n++){var x=-1.5+n*1.05;box(B,x,1.3,0,.86,2.6,1.3,'#6c8c94',.45);
            var fill=box(B,x,.15,.05,.68,.1,1.05,'#55d7a3');(function(m){updaters.push(function(p){var ht=Math.max(.02,p.run.extra.soc/100*2.3);m.scale.y=ht/.1;m.position.y=.15+ht/2;});})(fill);}
          box(C,2.8,1,0,1.2,1.9,1.4,'#d9e7df');
          var inPath=pipe(A,[[-4,.4,1.1],[-3,.4,1.1],[-1.4,.4,1.1]],'#e8c775',.055);
          particles(A,inPath,'#fff0ac',function(p){return p.run.extra.charging;},.025);
          var outPath=pipe(C,[[.7,.4,1.1],[2.8,.4,1.1],[4.6,.4,2.6]],'#66ddb0',.055);particles(C,outPath,'#b5ffe0',function(p){return p.run.power>0;},.025);
          label('1  Charging supply',-4,3,0);label('2  Stored energy',-.4,3.7,0);label('3  Inverter & load',3.4,3,1.1);
        }
        Object.keys(groups).forEach(function(key){groups[key].traverse(function(o){if(o.isMesh){o.userData.component=key;pickables.push(o);}});});
        fitView=function(key){
          var bounds=new THREE.Box3();scene.updateMatrixWorld(true);
          Object.keys(groups).forEach(function(k){if(key&&k!==key)return;bounds.union(new THREE.Box3().setFromObject(groups[k]));if(labels[k].visible)bounds.union(new THREE.Box3().setFromObject(labels[k]));});
          if(bounds.isEmpty())return;var center=bounds.getCenter(new THREE.Vector3());view.target=[center.x,center.y,center.z];view.zoom=1;position();camera.updateMatrixWorld(true);
          var maxX=0,maxY=0;[bounds.min.x,bounds.max.x].forEach(function(x){[bounds.min.y,bounds.max.y].forEach(function(y){[bounds.min.z,bounds.max.z].forEach(function(z){var point=new THREE.Vector3(x,y,z).project(camera);maxX=Math.max(maxX,Math.abs(point.x));maxY=Math.max(maxY,Math.abs(point.y));});});});
          view.zoom=Math.max(.15,Math.min(4,.84/Math.max(maxX,maxY,.01)));position();
        };
        var raycaster=new THREE.Raycaster();
        bind(renderer.domElement,'webglcontextlost',function(e){e.preventDefault();cancelAnimationFrame(raf);if(!disposed)statusState[1]('failed');});
        bind(renderer.domElement,'pointerdown',function(e){if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,touch:e.pointerType==='touch',moved:false};if(!drag.touch)renderer.domElement.setPointerCapture(e.pointerId);});
        bind(renderer.domElement,'pointermove',function(e){if(!drag||drag.touch)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
          if(Math.abs(e.clientX-drag.sx)+Math.abs(e.clientY-drag.sy)>5)drag.moved=true;
          if(drag.moved){view.yaw-=dx*.006;view.pitch=Math.max(.12,Math.min(1.45,view.pitch+dy*.006));position();}drag.x=e.clientX;drag.y=e.clientY;});
        function pointerEnd(e){if(!drag)return;var moved=drag.moved||Math.abs(e.clientX-drag.sx)+Math.abs(e.clientY-drag.sy)>8;drag=null;if(moved||e.type==='pointercancel')return;
          var rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
          var hit=raycaster.intersectObjects(pickables).find(function(x){var p=x.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});
          if(hit)live.current.onPick(hit.object.userData.component);
        }
        bind(renderer.domElement,'pointerup',pointerEnd);bind(renderer.domElement,'pointercancel',pointerEnd);
        resize=function(){if(disposed)return;var w=container.clientWidth||700,ht=container.clientHeight||440,aspect=w/ht,halfY=Math.max(5.8,8/aspect);
          camera.left=-halfY*aspect;camera.right=halfY*aspect;camera.top=halfY;camera.bottom=-halfY;camera.updateProjectionMatrix();renderer.setSize(w,ht,false);if(focusTarget||live.current.inspection.layout==='exploded'||live.current.inspection.isolated)fitPending=true;dirty=true;};
        if(window.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(container);}else bind(window,'resize',resize);resize();
        if(window.IntersectionObserver){intersection=new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;});intersection.observe(container);}
        function frame(){if(disposed)return;raf=requestAnimationFrame(frame);var p=live.current;
          if(document.hidden||!visible||(!dirty&&p===lastProps))return;dirty=false;lastProps=p;
          Object.keys(groups).forEach(function(key){groups[key].visible=true;});
          updaters.forEach(function(update){update(p);});
          var inspection=p.inspection,inspectionKey=inspection.layout+'|'+inspection.isolated+'|'+inspection.labels+'|'+p.selected;
          Object.keys(groups).forEach(function(key,index){var offset=inspection.layout==='exploded'?(index-1)*3.4:0,lift=inspection.layout==='exploded'&&index===1?.8:0,g=groups[key],label=labels[key];g.position.set(offset,lift,0);g.visible=g.visible&&(!inspection.isolated||key===p.selected);label.position.set(label.userData.origin[0]+offset,label.userData.origin[1]+lift,label.userData.origin[2]);label.visible=inspection.labels&&(!inspection.isolated||key===p.selected);});
          context.visible=!inspection.isolated;
          if(lastInspection!==inspectionKey){
            var previous=lastInspection&&lastInspection.split('|');
            if(previous&&(previous[0]!==inspection.layout||previous[1]!==String(inspection.isolated))){focusTarget=null;fitPending=true;}
            if(inspection.isolated||focusTarget){focusTarget=p.selected;fitPending=true;}
            if(previous&&previous[2]!==String(inspection.labels)&&(inspection.layout==='exploded'||focusTarget))fitPending=true;
            lastInspection=inspectionKey;
          }
          if(fitPending){fitPending=false;fitView(inspection.isolated?p.selected:focusTarget);}
          container.setAttribute('data-inspection-layout',inspection.layout);container.setAttribute('data-inspection-isolated',inspection.isolated?p.selected:'none');
          container.setAttribute('data-inspection-labels',String(inspection.labels));
          pickables.forEach(function(m){if(m.material.emissive&&m!==lamp){m.material.emissive.set(m.userData.component===p.selected?'#206852':'#000000');m.material.emissiveIntensity=.35;}});
          renderer.render(scene,camera);
        }
        raf=requestAnimationFrame(frame);statusState[1]('ready');
      }).catch(function(){if(!disposed){cancelAnimationFrame(raf);statusState[1]('failed');}});
      return function(){disposed=true;cancelAnimationFrame(raf);api.current=null;
        if(observer)observer.disconnect();if(intersection)intersection.disconnect();listeners.forEach(function(v){v[0].removeEventListener(v[1],v[2]);});release();
        if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
      };
    },[props.id,retry[0]]);
    return h('div',{className:'rn-energy-scene'},
      h('div',{ref:mount,className:'rn-energy-webgl',role:'img','aria-label':rnEnergySpec(props.id).name+' 3D mechanism. Select the component buttons below for equivalent explanations.','data-energy-render-status':status}),
      status!=='ready'&&h('div',{className:'rn-energy-fallback',role:'status'},status==='loading'?'Preparing the 3D workbench…':'3D is unavailable. Controls, calculations, and the energy-flow view remain available.',
        status==='failed'&&h('button',{type:'button',onClick:function(){retry[1](retry[0]+1);}},'Retry mechanism 3D')),
      h('div',{className:'rn-energy-camera','aria-label':'Mechanism camera controls'},[['focus','Focus selected component'],['left','Rotate left'],['right','Rotate right'],['in','Zoom in'],['out','Zoom out'],['top','Top view'],['home','Reset camera']].map(function(a){return h('button',{type:'button',key:a[0],disabled:status!=='ready',onClick:function(){if(api.current)api.current(a[0]);}},a[1]);})),
      h('div',{className:'rn-energy-camera rn-energy-inspection','aria-label':'Mechanism inspection controls'},
        ['assembled','exploded'].map(function(layout){return h('button',{key:layout,type:'button',disabled:status!=='ready','aria-pressed':inspection.layout===layout,onClick:function(){inspect({layout:layout});}},layout==='assembled'?'Assembled view':'Exploded view');}),
        h('button',{type:'button',disabled:status!=='ready','aria-pressed':inspection.isolated,onClick:function(){inspect({isolated:!inspection.isolated});}},'Isolate selected component'),
        h('button',{type:'button',disabled:status!=='ready','aria-pressed':inspection.labels,onClick:function(){inspect({labels:!inspection.labels});}},'Component labels'),
        h('button',{type:'button',disabled:status!=='ready',onClick:function(){inspect({layout:'assembled',isolated:false,labels:true});if(api.current)api.current('home');}},'Restore full mechanism')),
      h('p',{className:'rn-energy-inspection-status','aria-live':'polite','aria-atomic':'true'},(inspection.isolated?'Isolated: ':'Selected: ')+selected[1]+'. '+(inspection.layout==='exploded'?'Assemblies are separated for inspection; gaps do not represent operating distances.':'Assemblies are shown together.')),
      h('p',{className:'rn-energy-scene-note'},'These controls change the view only. Choose a component below to inspect another assembly.'));

  }

  var RN_ENERGY_CSS="\n.rn-energy-lab{max-width:1280px;margin:auto;padding:22px;color:var(--re-text);font:14px/1.5 system-ui,sans-serif}.rn-energy-lab *{box-sizing:border-box}\n.rn-energy-lab button,.rn-energy-lab input,.rn-energy-lab textarea{font:inherit}.rn-energy-lab button{min-height:40px;padding:8px 12px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-card);color:var(--re-text);cursor:pointer}.rn-energy-lab button:hover{background:var(--re-alt)}.rn-energy-lab button[aria-pressed=true]{background:var(--re-text);color:var(--re-bg)}.rn-energy-lab button:disabled{opacity:.55;cursor:default}\n.rn-energy-lab :is(button,input,textarea,summary,[tabindex]):focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-energy-lab h2{font-size:27px;margin:0;letter-spacing:-.7px}.rn-energy-lab h3{font-size:16px;margin:0 0 10px}.rn-energy-lab p{margin:6px 0 14px}.rn-energy-lab small,.rn-energy-muted{color:var(--re-muted)}.rn-energy-lab a{color:var(--re-accent)}\n.rn-energy-top,.rn-energy-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.rn-energy-kicker{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--re-accent);font-weight:700}.rn-energy-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:18px 0}.rn-energy-gallery button{text-align:left;display:flex;align-items:center;gap:10px}.rn-energy-gallery b{font-size:21px}.rn-energy-gallery strong{display:block;font-size:13px}.rn-energy-gallery span{display:block;font-size:11px}\n.rn-energy-workspace{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px}.rn-energy-panel{background:var(--re-card);border:1px solid var(--re-border);border-radius:12px;padding:16px;min-width:0;margin-bottom:14px}.rn-energy-controls{align-self:start}.rn-energy-control{margin:0 0 18px}.rn-energy-control label{display:flex;justify-content:space-between;gap:8px;font-size:12px}.rn-energy-control strong{white-space:nowrap}.rn-energy-control input{width:100%;height:25px;accent-color:var(--re-accent);margin:7px 0 0}\n.rn-energy-stage{background:#0d2432;border:1px solid #597e85;border-radius:12px;overflow:hidden;position:relative}.rn-energy-webgl{height:440px;width:100%}.rn-energy-fallback{position:absolute;inset:25% 10% auto;padding:16px;background:#163641;color:#effdf6;border:1px solid #64868c;border-radius:10px}.rn-energy-fallback button{display:block;margin:10px auto 0}.rn-energy-camera{padding:10px;display:flex;gap:6px;flex-wrap:wrap}.rn-energy-camera button{background:#173b47;color:#effdf7;border-color:#6d9297;min-height:34px;font-size:11px;padding:5px 9px}.rn-energy-camera button:hover{background:#305362}.rn-energy-camera button[aria-pressed=true]{background:#e1f6ee;color:#10352d;border-color:#e1f6ee}.rn-energy-inspection{border-top:1px solid #597e85;padding-top:12px}.rn-energy-inspection-status{color:#effdf7;font-size:12px;padding:0 14px}.rn-energy-scene .rn-energy-scene-note{margin-bottom:8px}.rn-energy-scene-note{color:#c8e3de;font-size:11px;padding:0 14px 12px}\n.rn-energy-time{margin:14px 0;padding:14px;background:var(--re-alt);border-radius:10px}.rn-energy-time .rn-energy-control{margin:12px 0 0}.rn-energy-parts{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.rn-energy-parts button{font-size:12px;flex:1;min-width:140px;text-align:left}.rn-energy-component{border-left:3px solid var(--re-accent);padding:12px 16px;background:var(--re-alt);border-radius:0 8px 8px 0;margin-bottom:14px}.rn-energy-component p{margin:0;font-size:13px}\n.rn-energy-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.rn-energy-metrics>div{padding:12px;border:1px solid var(--re-border);border-radius:9px;background:var(--re-card)}.rn-energy-metrics strong{display:block;font-size:23px;letter-spacing:-.5px}.rn-energy-metrics small{display:block;font-size:11px}\n.rn-energy-flow{list-style:none;padding:0;margin:10px 0;display:flex;gap:10px;flex-wrap:wrap}.rn-energy-flow li{flex:1;min-width:150px;background:var(--re-alt);border:1px solid var(--re-border);border-radius:8px;padding:12px;display:flex;gap:10px}.rn-energy-flow li>span{color:var(--re-muted);font-size:11px}.rn-energy-flow strong{font-size:12px}.rn-energy-flow p{margin:4px 0 0;font-size:19px}\n.rn-energy-formula{font:12px/1.7 ui-monospace,monospace;background:var(--re-alt);padding:12px;border-radius:8px;overflow-wrap:anywhere}.rn-energy-chart-scroll{overflow:auto}.rn-energy-chart-scroll svg{display:block;width:100%;min-width:480px}.rn-energy-table{overflow:auto;max-height:300px}.rn-energy-lab table{border-collapse:collapse;width:100%;font-size:12px}.rn-energy-lab td,.rn-energy-lab th{padding:9px;border-bottom:1px solid var(--re-border);text-align:right;white-space:nowrap}.rn-energy-lab th:first-child{text-align:left}.rn-energy-lab caption{text-align:left;color:var(--re-muted);padding:8px 0}.rn-energy-lab details{margin-top:14px}.rn-energy-lab summary{font-weight:650;cursor:pointer;padding:6px 0}.rn-energy-lab textarea{display:block;width:100%;margin-top:7px;min-height:90px;resize:vertical;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);padding:10px}.rn-energy-study-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}\n@media(max-width:850px){.rn-energy-workspace,.rn-energy-study-grid{grid-template-columns:1fr}.rn-energy-controls{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.rn-energy-controls h3,.rn-energy-controls p,.rn-energy-controls>button{grid-column:1/-1}.rn-energy-webgl{height:410px}}\n@media(max-width:500px){.rn-energy-lab{padding:12px}.rn-energy-gallery{grid-template-columns:1fr 1fr}.rn-energy-gallery button{padding:8px}.rn-energy-gallery span{font-size:10px}.rn-energy-webgl{height:320px}.rn-energy-controls{display:block}.rn-energy-metrics{grid-template-columns:1fr}.rn-energy-metrics strong{font-size:25px}.rn-energy-lab h2{font-size:23px}.rn-energy-parts{display:grid;grid-template-columns:1fr}.rn-energy-flow{display:block}.rn-energy-flow li{margin:8px 0}}\n";


  function RenewablesEnergyExperiment(props){
    var React=props.React,h=React.createElement,id=props.id,spec=rnEnergySpec(id),state=props.state||{},profileId=props.profileId||'steady';
    var config=rnEnergySweepConfig(id,state.config,profileId),control=spec.controls.find(function(c){return c[0]===config.key;});
    var result=React.useMemo(function(){return state.run?rnEnergySweep(id,state.run):null;},[id,JSON.stringify(state.run)]);
    var selected=result?Math.floor(rnNumber(state.selected,0,0,result.rows.length-1)):0,uid=props.uid;
    function fmt(n){return Number(n).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function configure(patch){change({config:Object.assign({},config,patch)});}
    function run(){change({config:config,run:{version:1,settings:Object.assign({},props.settings),profileId:profileId,phase:props.phase,config:config,prediction:state.prediction||''},selected:0,conclusion:''});}
    function csv(){
      var headers=['technology','scenario','duration_minutes','varied_input','input_value','output_unit','output','change_from_reference','percent_change','target','meets_target','resource_input','remainder','requested_kWh','unserved_kWh','initial_stored_kWh','ending_stored_kWh','shutdown_minutes','clipped_minutes'].concat(spec.controls.map(function(c){return c[0]+' ['+c[6]+']';}));
      var rows=result.rows.map(function(r){var m=r.result;return [id,result.profileId,result.duration,result.config.key,r.value,result.unit,m.value,r.delta,r.percent,result.config.target,r.meetsTarget,m.input,m.remainder,m.requested,m.unserved,m.initial,m.endStored,m.shutdownMinutes,m.clippedMinutes].concat(spec.controls.map(function(c){return r.settings[c[0]];}));});
      function cell(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}
      var text=[headers].concat(rows).map(function(row){return row.map(cell).join(',');}).join('\r\n');
      var url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-'+id+'-experiment.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }
    function chart(){
      var w=800,ht=250,left=75,right=20,top=25,bottom=55,max=Math.max(result.peak,result.reference.value,result.config.target||0)||1;
      function x(value){return left+(value-result.config.low)/(result.config.high-result.config.low)*(w-left-right);}
      function y(value){return ht-bottom-value/max*(ht-top-bottom);}
      var points=result.rows.map(function(r){return x(r.value)+','+y(r.result.value);}).join(' ');
      return h('div',{className:'rn-energy-chart-scroll',role:'region',tabIndex:0,'aria-label':'Experiment result chart'},h('svg',{viewBox:'0 0 '+w+' '+ht,role:'img','aria-label':result.metricLabel+' in '+result.unit+' versus '+result.config.label+'. Exact values and trial controls follow in the results table.'},
        h('title',null,result.metricLabel+' across '+result.rows.length+' sampled '+result.config.label+' values'),
        [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:left,x2:w-right,y1:y(max*f),y2:y(max*f),stroke:'var(--re-border)',strokeDasharray:'3 5'}),h('text',{x:left-10,y:y(max*f)+4,textAnchor:'end',fill:'var(--re-muted)',fontSize:12},fmt(max*f)));}),
        h('line',{x1:left,x2:w-right,y1:y(result.reference.value),y2:y(result.reference.value),stroke:'var(--re-muted)',strokeWidth:2,strokeDasharray:'8 5'}),
        result.config.target!=null&&h('line',{x1:left,x2:w-right,y1:y(result.config.target),y2:y(result.config.target),stroke:'var(--re-text)',strokeWidth:2,strokeDasharray:'2 4'}),
        h('polyline',{points:points,fill:'none',stroke:'var(--re-accent)',strokeWidth:3}),
        result.rows.map(function(r){return h('circle',{key:r.index,cx:x(r.value),cy:y(r.result.value),r:r.index===selected?7:4,fill:'var(--re-accent)',stroke:'var(--re-card)',strokeWidth:2});}),
        [result.config.low,(result.config.low+result.config.high)/2,result.config.high].map(function(v,i){return h('text',{key:i,x:x(v),y:ht-bottom+22,textAnchor:i===0?'start':i===2?'end':'middle',fill:'var(--re-muted)',fontSize:12},fmt(v));}),
        h('text',{x:15,y:15,fill:'var(--re-muted)',fontSize:12},result.unit),
        h('text',{x:(left+w-right)/2,y:ht-8,textAnchor:'middle',fill:'var(--re-muted)',fontSize:12},result.config.label+' ('+result.config.unit+')')));
    }

    var pending=result&&(JSON.stringify(config)!==JSON.stringify(result.config)||(state.prediction||'')!==result.prediction);
    var sameContext=result&&profileId===result.profileId;
    var matches=result&&sameContext&&JSON.stringify(props.settings)===JSON.stringify(result.baseSettings);
    var currentTrial=result&&sameContext?result.rows.find(function(r){return JSON.stringify(r.settings)===JSON.stringify(props.settings);}):null;
    var targetUnit=config.metric==='energy'?'kWh':'kW';
    return h('section',{id:uid,className:'rn-energy-panel rn-energy-experiment',tabIndex:-1,'aria-label':'Controlled experiment bench'},
      h('div',{className:'rn-energy-toolbar'},h('div',null,h('div',{className:'rn-energy-kicker'},'Experiment bench'),h('h3',null,'Test one input across a range')),result&&btn('Export experiment CSV',csv)),
      h('p',null,config.key===RN_ENERGY_EXPERIMENTS[id].key?RN_ENERGY_EXPERIMENTS[id].question:'How does changing '+control[1].toLowerCase()+' change '+(config.metric==='energy'?'total delivered electricity':'electrical output')+' when the other inputs stay fixed?'),
      h('p',{className:'rn-energy-muted'},'Choose one input, predict the result, then run several trials with the other inputs fixed. Each technology keeps its latest experiment.'),
      h('div',{className:'rn-energy-experiment-fields'},
        h('label',{htmlFor:uid+'key'},'Input to vary',h('select',{id:uid+'key','aria-label':'Experiment input',value:config.key,onChange:function(e){var c=spec.controls.find(function(v){return v[0]===e.target.value;});configure({key:c[0],low:c[2],high:c[3]});}},spec.controls.map(function(c){return h('option',{value:c[0],key:c[0]},c[1]);}))),
        h('label',{htmlFor:uid+'count'},'Requested trials',h('select',{id:uid+'count','aria-label':'Experiment trial count',value:config.count,onChange:function(e){configure({count:Number(e.target.value)});}},[5,9,13].map(function(n){return h('option',{key:n,value:n},n+' trials');}))),
        h('label',{htmlFor:uid+'low'},'Lower value: '+fmt(config.low)+' '+control[6],h('input',{id:uid+'low',type:'range',min:control[2],max:control[3],step:control[4],value:config.low,'aria-label':'Experiment lower value','aria-valuetext':fmt(config.low)+' '+control[6],onChange:function(e){configure({low:Number(e.target.value)});}})),
        h('label',{htmlFor:uid+'high'},'Upper value: '+fmt(config.high)+' '+control[6],h('input',{id:uid+'high',type:'range',min:control[2],max:control[3],step:control[4],value:config.high,'aria-label':'Experiment upper value','aria-valuetext':fmt(config.high)+' '+control[6],onChange:function(e){configure({high:Number(e.target.value)});}})),
        h('label',{htmlFor:uid+'target'},'Optional delivery target ('+targetUnit+')',h('input',{id:uid+'target',type:'number',min:0,step:'any',value:config.error&&state.config&&typeof state.config.target==='number'&&Number.isFinite(state.config.target)&&state.config.target<0?state.config.target:config.target==null?'':config.target,'aria-label':'Experiment delivery target',placeholder:'No target',onChange:function(e){configure({target:e.target.value===''?null:Number(e.target.value)});}})),
        h('div',{className:'rn-energy-experiment-scope'},h('strong',null,config.metric==='energy'?'Measure the full sequence':'Measure steady power'),h('small',null,profileId==='steady'?(id==='storage'?'The full 120-minute battery cycle.':'The current resource conditions, held fixed.'):(rnEnergyProgram(id,profileId)||{}).name+' · '+((rnEnergyProgram(id,profileId)||{}).duration||0)+' minutes.'))),
      h('label',{className:'rn-energy-experiment-writing',htmlFor:uid+'prediction'},'Prediction',h('textarea',{id:uid+'prediction','aria-label':'Experiment prediction',maxLength:1500,value:state.prediction||'',placeholder:'What do you expect to change, and why?',onChange:function(e){change({prediction:e.target.value});}})),
      id==='storage'&&h('p',{className:'rn-energy-muted',style:{fontSize:12}},profileId==='steady'?'The original cycle uses selected battery power for both supply and demand. Use an operating scenario to hold external requests fixed.':config.key==='capacity'&&props.settings.initial>0?'Initial charge stays at '+fmt(props.settings.initial)+'% across these trials, so larger batteries also start with more stored energy. Set initial charge to zero to compare empty batteries.':'Charging offers and discharge requests stay fixed across these trials.'),
      config.error&&h('p',{role:'alert'},config.error),
      h('div',{className:'rn-energy-toolbar'},btn(result?'Run experiment again':'Run experiment',run,{disabled:!!config.error,'aria-label':'Run controlled experiment'}),h('small',null,'Values follow the input control steps; duplicate values are removed.')),
      pending&&h('p',{className:'rn-energy-experiment-notice',role:'status'},'Setup changed. Run again to update the saved experiment.'),
      result&&h('div',{className:'rn-energy-experiment-results','aria-label':'Saved experiment results'},
        h('h3',null,result.config.label+' experiment'),
        h('p',null,result.profileName+(result.duration?' · full '+result.duration+'-minute sequence':' · steady power')+' · '+result.rows.length+' distinct trials'),
        h('p',{className:'rn-energy-experiment-notice'},matches?'Workbench matches the experiment reference.':currentTrial?'Workbench shows trial '+(currentTrial.index+1)+' of this experiment.':'Workbench conditions have changed. These results retain their recorded inputs.'),
        h('div',{className:'rn-energy-scenario-metrics'},
          h('div',null,h('small',null,'Reference result'),h('strong',null,fmt(result.reference.value)+' '+result.unit),h('small',null,result.config.label+': '+fmt(result.baseSettings[result.config.key])+' '+result.config.unit)),
          h('div',null,h('small',null,'Highest sampled result'),h('strong',null,fmt(result.peak)+' '+result.unit),h('small',null,result.highest.length+' trial'+(result.highest.length===1?'':'s')+' at this output')),
          h('div',null,h('small',null,result.config.target==null?'Result range':'Trials meeting target'),h('strong',null,result.config.target==null?fmt(result.least)+'–'+fmt(result.peak)+' '+result.unit:result.targetMatches.length+' / '+result.rows.length),h('small',null,result.config.target==null?'Across the sampled inputs':'Target: '+fmt(result.config.target)+' '+result.unit))),
        chart(),
        h('p',{className:'rn-energy-muted',style:{fontSize:12}},'Solid line: sampled trials. Dashed line: recorded reference.'+(result.config.target==null?'':' Dotted line: delivery target.')+' Lines join samples for readability; behavior between them is not evaluated.'),
        result.config.target!=null&&h('p',null,result.targetMatches.length?'Lowest sampled input meeting the target: '+fmt(result.rows[result.targetMatches[0]].value)+' '+result.config.unit+'. This is not a continuous threshold or a cost optimum.':'No sampled input meets this target. Other inputs, operating conditions, or unsampled values may change the result.'),
        h('div',{className:'rn-energy-toolbar rn-energy-trial-inspector'},
          h('label',{htmlFor:uid+'trial'},'Choose a trial to inspect',h('select',{id:uid+'trial','aria-label':'Experiment trial to inspect',value:selected,onChange:function(e){change({selected:Number(e.target.value)});}},result.rows.map(function(r){return h('option',{key:r.index,value:r.index},'Trial '+(r.index+1)+': '+fmt(r.value)+' '+result.config.unit+' → '+fmt(r.result.value)+' '+result.unit);}))),
          btn('Inspect trial in 3D',function(){props.onInspect(result.rows[selected].settings,result.profileId,result.phase);}),
          btn('Restore experiment reference',function(){props.onInspect(result.baseSettings,result.profileId,result.phase);})),
        h('p',{className:'rn-energy-muted',style:{fontSize:12}},'Inspection restores the recorded inputs, scenario, and minute in the workbench. The experiment results stay fixed.'),
        h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Experiment trial results'},h('table',null,
          h('caption',null,result.metricLabel+'. Deltas use the recorded reference, which may lie outside the sampled range.'),
          h('thead',null,h('tr',null,['Trial',result.config.label+' ('+result.config.unit+')','Output ('+result.unit+')','Change ('+result.unit+')','Change %'].concat(id==='storage'&&result.profileId!=='steady'?['Unserved (kWh)']:[]).concat(['Target','Model behavior']).map(function(v){return h('th',{key:v,scope:'col'},v);}))),
          h('tbody',null,result.rows.map(function(r){var m=r.result;return h('tr',{key:r.index,'data-selected-trial':r.index===selected?'true':undefined},
            h('th',{scope:'row'},r.index+1),h('td',null,fmt(r.value)),h('td',null,fmt(m.value)),h('td',null,(r.delta>0?'+':'')+fmt(r.delta)),h('td',null,r.percent==null?(result.reference.value===0?'Undefined (zero reference)':'Outside numeric range'):fmt(r.percent)+'%'),
            id==='storage'&&result.profileId!=='steady'&&h('td',null,fmt(m.unserved)),h('td',null,r.meetsTarget==null?'Not set':r.meetsTarget?'Met':'Below'),
            h('td',null,m.shutdownMinutes?m.shutdownMinutes+' min shutdown':m.clippedMinutes?m.clippedMinutes+' min input clamped':m.status));})))),
        h('details',null,h('summary',null,'Review experiment conditions'),
          h('p',null,result.prediction?'Prediction at run time: '+result.prediction:'No prediction was recorded.'),
          h('dl',{className:'rn-energy-experiment-inputs'},spec.controls.map(function(c){return h('div',{key:c[0]},h('dt',null,c[1]),h('dd',null,c[0]===result.config.key?'Varied from '+fmt(result.config.low)+' to '+fmt(result.config.high)+' '+c[6]:fmt(result.baseSettings[c[0]])+' '+c[6]));})),
          h('p',null,'Inspect at minute '+result.phase+' when using a scenario or battery cycle. Steady generator animation time does not affect the result.'),
          id==='storage'&&h('p',null,result.profileId==='steady'?'In the original cycle, selected battery power also sets the charging supply and discharge request. Choose an operating scenario to compare power limits against fixed external requests.':'External charging offers and discharge requests are fixed across all trials. Initial state of charge stays at the selected percentage; changing capacity therefore also changes initial stored energy unless starting empty.'),
          h('p',null,'These trials reuse the workbench teaching model. They do not estimate construction cost, land use, or a real installation optimum.'),
          result.rows.some(function(r){return r.result.clippedMinutes;})&&h('p',null,'Some effective scenario inputs reach the control bounds. See clamped-minute counts in the CSV export.')),
        h('label',{className:'rn-energy-experiment-writing',htmlFor:uid+'conclusion'},'Conclusion from the results',h('textarea',{id:uid+'conclusion','aria-label':'Experiment conclusion',maxLength:3000,value:state.conclusion||'',placeholder:'What pattern or limit did you find? Use a trial value as evidence.',onChange:function(e){change({conclusion:e.target.value});}})),
        h('p',{className:'rn-energy-muted',style:{fontSize:12}},'Export the mechanism investigation below to include this experiment, its prediction, and your conclusion.')));
  }

  var RN_ENERGY_EXPERIMENT_CSS="\n.rn-energy-experiment{margin-top:18px}.rn-energy-experiment h3{margin-bottom:5px}.rn-energy-experiment-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 20px;margin:16px 0}.rn-energy-experiment label{display:block;font-size:12px}.rn-energy-experiment select,.rn-energy-experiment input[type=number]{display:block;width:100%;min-height:40px;margin:6px 0 0;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-energy-experiment input[type=range]{width:100%;height:28px;accent-color:var(--re-accent)}.rn-energy-experiment select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-energy-experiment-scope{padding:9px 12px;background:var(--re-alt);border-radius:8px;font-size:12px}.rn-energy-experiment-scope small{display:block;margin-top:5px}.rn-energy-experiment-writing{margin:14px 0}.rn-energy-experiment-writing textarea{min-height:65px}.rn-energy-experiment-results{border-top:1px solid var(--re-border);padding-top:20px;margin-top:20px}.rn-energy-experiment-notice{border-left:3px solid var(--re-accent);background:var(--re-alt);padding:9px 12px;font-size:12px}.rn-energy-trial-inspector{margin:15px 0}.rn-energy-trial-inspector label{flex:1;min-width:200px}.rn-energy-experiment-inputs>div{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:5px 0;font-size:12px}.rn-energy-experiment-inputs dd{margin:0}.rn-energy-experiment [data-selected-trial=true]{background:var(--re-alt)}.rn-energy-experiment details p{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}\n@media(max-width:700px){.rn-energy-experiment-fields{grid-template-columns:1fr 1fr}}\n@media(max-width:420px){.rn-energy-experiment-fields{grid-template-columns:1fr}.rn-energy-trial-inspector label{min-width:0;width:100%;flex-basis:100%}}\n";

  RN_ENERGY_EXPERIMENT_CSS+="\n.rn-energy-experiment-fields{grid-template-areas:\"input low high\" \"count target scope\"}.rn-energy-experiment-fields>:nth-child(1){grid-area:input}.rn-energy-experiment-fields>:nth-child(2){grid-area:count}.rn-energy-experiment-fields>:nth-child(3){grid-area:low}.rn-energy-experiment-fields>:nth-child(4){grid-area:high}.rn-energy-experiment-fields>:nth-child(5){grid-area:target}.rn-energy-experiment-fields>:nth-child(6){grid-area:scope}\n@media(max-width:700px){.rn-energy-experiment-fields{grid-template-areas:\"input input\" \"low high\" \"count target\" \"scope scope\"}}\n@media(max-width:420px){.rn-energy-experiment-fields{grid-template-areas:\"input\" \"low\" \"high\" \"count\" \"target\" \"scope\"}}\n";


  function RenewablesEnergyDesignMap(props){
    var React=props.React,h=React.createElement,id=props.id,spec=rnEnergySpec(id),state=props.state||{},uid=props.uid,profileId=props.profileId||'steady',config=rnEnergyMapConfig(id,state.config,profileId);
    var result=React.useMemo(function(){return state.run?rnEnergyMap(id,state.run):null;},[id,JSON.stringify(state.run)]),selected=result?Math.floor(rnNumber(state.selected,0,0,result.rows.length-1)):0,trial=result&&result.rows[selected];
    var explanationState=state.explanation,explanation=React.useMemo(function(){return result&&explanationState?rnEnergyMapExplanation(result,selected):null;},[result,selected,!!explanationState]),observation=explanationState&&explanationState.selected===selected&&typeof explanationState.observation==='string'?explanationState.observation.slice(0,2000):'';
    function fmt(n){return n!==0&&Math.abs(n)<.0001?Number(n).toExponential(3):Number(n).toLocaleString(undefined,{maximumSignificantDigits:5});}
    function signed(n){return (n>0?'+':'')+fmt(n===0?0:n);}
    function btn(label,action,extra){return h('button',Object.assign({type:'button',onClick:action},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function configure(patch){change({config:Object.assign({},config,patch)});}
    function explain(patch){change({explanation:Object.assign({open:explanationState&&explanationState.open===true,selected:selected,observation:observation},patch)});}
    function selectTrial(index){if(index===selected)return;change({selected:index,explanation:explanationState?{open:explanationState.open===true,selected:index,observation:''}:null});}
    function axis(side){var a=config[side],name=side==='x'?'Horizontal':'Vertical',c=spec.controls.find(function(c){return c[0]===a.key;});
      function set(patch){var next={};next[side]=Object.assign({},a,patch);configure(next);}
      return h('fieldset',null,h('legend',null,name+' axis'),h('label',null,'Input',h('select',{'aria-label':'Map '+name.toLowerCase()+' input',value:a.key,onChange:function(e){var c=spec.controls.find(function(c){return c[0]===e.target.value;});set({key:c[0],low:c[2],high:c[3]});}},spec.controls.map(function(c){return h('option',{key:c[0],value:c[0],disabled:c[0]===config[side==='x'?'y':'x'].key},c[1]);}))),
        ['low','high'].map(function(key){var label=name+' '+(key==='low'?'lower':'upper')+' value';return h('label',{key:key},label+': '+fmt(a[key])+' '+a.unit,h('input',{type:'range',min:c[2],max:c[3],step:c[4],value:a[key],'aria-label':'Map '+label.toLowerCase(),'aria-valuetext':fmt(a[key])+' '+a.unit,onChange:function(e){var next={};next[key]=Number(e.target.value);set(next);}}));}));
    }
    function run(){change({open:true,config:config,run:{version:1,settings:Object.assign({},props.settings),profileId:profileId,phase:props.phase,config:config,prediction:typeof state.prediction==='string'?state.prediction:''},selected:0,conclusion:'',explanation:null});}
    function csv(){var url=URL.createObjectURL(new Blob([rnEnergyMapCsv(result)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-'+id+'-design-map.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
    function explanationPanel(){
      var a=explanation,e=a&&a.effects;
      function measure(n){return signed(Math.abs(n)<=a.tolerance?0:n)+' '+a.unit;}
      function exportCases(){var url=URL.createObjectURL(new Blob([rnEnergyMapExplanationCsv(a,observation)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='renewables-'+id+'-map-trial-'+(selected+1)+'-explanation.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
      return h('details',{className:'rn-energy-map-explanation','aria-label':'Design map explanation',open:!!(explanationState&&explanationState.open),onToggle:function(event){if(event.currentTarget.open!==!!(explanationState&&explanationState.open))explain({open:event.currentTarget.open});}},h('summary',null,'Explain this combination'),a&&h('div',{'aria-label':'Four-case comparison'},
        h('h4',null,'What changes when these inputs act together?'),h('p',null,'Trial '+(selected+1)+' · '+a.profileName+'. Compare each change with the recorded reference. All other base inputs stay fixed.'),
        (a.unchanged.horizontal||a.unchanged.vertical)&&h('p',{className:'rn-energy-experiment-notice'},a.unchanged.horizontal&&a.unchanged.vertical?'Both selected inputs equal the reference. All four cases coincide.':(a.unchanged.horizontal?a.axes.x.label:a.axes.y.label)+' is unchanged from the reference. Two pairs of cases coincide; there is no extra combined effect.'),
        h('div',{className:'rn-energy-map-cases'},a.cases.map(function(c){return h('section',{key:c.key,className:'rn-energy-map-case','aria-label':'Explanation case: '+c.label},h('h5',null,c.label),h('p',null,a.axes.x.label+': '+fmt(c.settings[a.axes.x.key])+' '+a.axes.x.unit+' · '+a.axes.y.label+': '+fmt(c.settings[a.axes.y.key])+' '+a.axes.y.unit),h('strong',{className:'rn-energy-map-case-output'},fmt(c.result.value)+' '+a.unit),h('p',null,measure(c.delta)+' from reference'+(c.meetsTarget==null?'':c.meetsTarget?' · Target met':' · Below target')),h('p',{className:'rn-energy-muted'},c.result.status+(c.result.shutdownMinutes?' · '+c.result.shutdownMinutes+' min in protective shutdown':'')+(c.result.clippedMinutes?' · '+c.result.clippedMinutes+' min with a scenario input clamped':'')),btn('Inspect '+c.label.toLowerCase()+' in 3D',function(){props.onInspect(c.settings,a.profileId,a.phase);}));})),
        h('div',{className:'rn-energy-map-interaction'},h('h5',null,'Extra combined effect'),h('strong',{className:'rn-energy-map-case-output'},measure(e.extraCombined)),h('p',null,a.relationship==='additive'?'The combined change equals the sum of the separate changes within display tolerance.':a.relationship==='above'?'The combined change is above the sum of the separate changes.':'The combined change is below the sum of the separate changes.'),h('p',null,'Joint change '+measure(e.combined)+' − horizontal change alone ('+measure(e.horizontalAlone)+') − vertical change alone ('+measure(e.verticalAlone)+').'),h('p',{className:'rn-energy-muted'},'This describes how the two changes combine at these settings. The sign does not by itself tell you whether the design is better. This difference is not an efficiency or an energy loss.')),
        h('h5',null,'Compare the two orders'),h('div',{className:'rn-energy-map-orders'},h('p',null,h('strong',null,'Horizontal first'),h('br'),fmt(a.cases[0].result.value)+' → '+fmt(a.cases[1].result.value)+' → '+fmt(a.cases[3].result.value)+' '+a.unit,h('br'),'Horizontal: '+measure(e.horizontalAlone)+'. Then vertical: '+measure(e.verticalAfterHorizontal)+'.'),h('p',null,h('strong',null,'Vertical first'),h('br'),fmt(a.cases[0].result.value)+' → '+fmt(a.cases[2].result.value)+' → '+fmt(a.cases[3].result.value)+' '+a.unit,h('br'),'Vertical: '+measure(e.verticalAlone)+'. Then horizontal: '+measure(e.horizontalAfterVertical)+'.')),
        h('p',{className:'rn-energy-muted'},'Each arrow compares two complete cases, not successive operating periods. '+(a.duration?'Outputs cover the full '+a.duration+'-minute sequence; 3D inspection opens minute '+a.phase+'.':'Outputs are steady power; 3D inspection restores the recorded animation position.')),
        h('label',{className:'rn-energy-experiment-writing'},'Observation for this combination',h('textarea',{'aria-label':'Combination observation',maxLength:2000,value:observation,placeholder:'Explain how the two inputs combine, or where a limit appears.',onChange:function(event){explain({observation:event.target.value});}})),h('p',{className:'rn-energy-muted'},'The observation belongs to this selected trial. Selecting a different trial or running a new map clears it. Exports retain exact values and all four sets of inputs.'),h('div',{className:'rn-energy-toolbar'},btn('Export four-case comparison CSV',exportCases))));
    }

    var explanationCase=explanation&&profileId===explanation.profileId?explanation.cases.find(function(c){return JSON.stringify(c.settings)===JSON.stringify(props.settings);}):null;
    var pending=result&&(JSON.stringify(config)!==JSON.stringify(result.config)||(state.prediction||'')!==result.prediction),sameContext=result&&profileId===result.profileId,matches=result&&sameContext&&JSON.stringify(props.settings)===JSON.stringify(result.baseSettings),current=result&&sameContext?result.rows.find(function(r){return JSON.stringify(r.settings)===JSON.stringify(props.settings);}):null;
    return h('details',{id:uid,className:'rn-energy-panel rn-energy-experiment rn-energy-design-map',tabIndex:-1,'aria-label':'Two-input design map',open:state.open===true,onToggle:function(e){if(e.currentTarget.open!==(state.open===true))change({open:e.currentTarget.open});}},
      h('summary',null,'Two-input design map'),h('h3',null,'Explore combinations of two inputs'),h('p',null,'Compare a grid of combinations while holding the other base inputs and operating scenario fixed. Select a cell to review it, then inspect the recorded trial in 3D.'),
      h('div',{className:'rn-energy-design-fields'},axis('x'),axis('y')),
      h('div',{className:'rn-energy-design-options'},h('label',null,'Samples per axis',h('select',{'aria-label':'Map samples per axis',value:config.count,onChange:function(e){configure({count:Number(e.target.value)});}},[3,5,7].map(function(n){return h('option',{key:n,value:n},n+' × '+n+' · up to '+n*n+' trials');}))),
        h('label',null,'Optional delivery target ('+(config.metric==='energy'?'kWh':'kW')+')',h('input',{type:'number',min:0,step:'any','aria-label':'Map delivery target',value:config.error&&state.config&&typeof state.config.target==='number'&&Number.isFinite(state.config.target)&&state.config.target<0?state.config.target:config.target==null?'':config.target,placeholder:'No target',onChange:function(e){configure({target:e.target.value===''?null:Number(e.target.value)});}}))),
      h('p',{className:'rn-energy-muted'},config.metric==='power'?'Map values are steady electrical power in kW.':'Map values are total delivered electricity in kWh over '+(rnEnergyProgram(id,profileId)?rnEnergyProgram(id,profileId).name+' ('+rnEnergyProgram(id,profileId).duration+' minutes).':'the full 120-minute battery cycle.')),
      id==='storage'&&h('p',{className:'rn-energy-experiment-notice'},profileId==='steady'?'In the two-hour cycle, selected power also sets charging supply and discharge request. Initial charge is a percentage, so a larger bank can start with more energy.':'The operating scenario keeps charging offers and discharge requests fixed. Initial charge is a percentage, so a larger bank starts with more energy unless you start empty.'),
      h('label',{className:'rn-energy-experiment-writing'},'Prediction',h('textarea',{'aria-label':'Map prediction',maxLength:1500,value:typeof state.prediction==='string'?state.prediction:'',placeholder:'Which combinations will help, and where might the output stop increasing?',onChange:function(e){change({prediction:e.target.value});}})),
      config.error&&h('p',{role:'alert'},config.error),h('div',{className:'rn-energy-toolbar'},btn(result?'Run design map again':'Run design map',run,{disabled:!!config.error,'aria-label':'Run two-input design map'}),h('small',null,'Values follow control steps; duplicate samples are removed.')),
      pending&&h('p',{role:'status',className:'rn-energy-experiment-notice'},'Map setup changed. Run again to update the recorded combinations.'),
      result&&h('div',{className:'rn-energy-experiment-results','aria-label':'Recorded design map'},h('h3',null,result.config.x.label+' × '+result.config.y.label),h('p',null,result.profileName+' · '+result.xValues.length+' columns × '+result.yValues.length+' rows · '+result.rows.length+' recorded trials'),
        h('p',{className:'rn-energy-experiment-notice'},matches?'Workbench matches the map reference.':current?'Workbench shows map trial '+(current.index+1)+'.':explanationCase?'Workbench shows explanation case: '+explanationCase.label.toLowerCase()+'.':'Workbench conditions have changed. The map retains its recorded inputs.'),
        h('div',{className:'rn-energy-scenario-metrics'},h('div',null,h('small',null,'Recorded reference'),h('strong',null,fmt(result.reference.value)+' '+result.unit)),h('div',null,h('small',null,'Highest sampled output'),h('strong',null,fmt(result.peak)+' '+result.unit),h('small',null,result.highest.length+' trial'+(result.highest.length===1?'':'s')+' at this output')),h('div',null,h('small',null,result.config.target==null?'Sampled output range':'Trials meeting target'),h('strong',null,result.config.target==null?fmt(result.least)+'–'+fmt(result.peak)+' '+result.unit:result.targetMatches.length+' / '+result.rows.length))),
        h('p',{id:uid+'help',className:'rn-energy-muted'},'Columns: '+result.config.x.label+' ('+result.config.x.unit+'). Rows: '+result.config.y.label+' ('+result.config.y.unit+'). Each bar uses the same output scale. Select cells with the keyboard; focus the map region and use arrow keys to scroll on small screens.'),
        h('div',{className:'rn-energy-map-scroll',role:'region',tabIndex:0,'aria-label':'Two-input output map','aria-describedby':uid+'help'},h('table',{style:{minWidth:Math.max(560,result.xValues.length*110+180)}},
          h('caption',null,result.metricLabel+' ('+result.unit+'). Every cell is a simulated combination; untested values are not inferred.'),h('thead',null,h('tr',null,h('th',{scope:'col'},result.config.y.label+' ↓ / '+result.config.x.label+' →'),result.xValues.map(function(x){return h('th',{key:x,scope:'col'},fmt(x)+' '+result.config.x.unit);}))),
          h('tbody',null,result.yValues.map(function(y,yi){return h('tr',{key:y},h('th',{scope:'row'},fmt(y)+' '+result.config.y.unit),result.xValues.map(function(x,xi){var r=result.rows[yi*result.xValues.length+xi],highest=result.highest.indexOf(r.index)>=0;return h('td',{key:x},btn(h(React.Fragment,null,h('strong',null,fmt(r.result.value)),h('span',{className:'rn-energy-map-bar','aria-hidden':true},h('span',{style:{width:(result.peak?100*r.result.value/result.peak:0)+'%'}})),h('span',null,r.meetsTarget==null?(highest?'Top sample':'Trial '+(r.index+1)):r.meetsTarget?'Target met':'Below target')),function(){selectTrial(r.index);},{'aria-pressed':r.index===selected,'aria-label':'Select map trial '+(r.index+1)+': '+result.config.x.label+' '+fmt(x)+' '+result.config.x.unit+', '+result.config.y.label+' '+fmt(y)+' '+result.config.y.unit+', '+fmt(r.result.value)+' '+result.unit+(r.meetsTarget==null?'':r.meetsTarget?', target met':', below target')}));}));})))),
        h('div',{className:'rn-energy-toolbar rn-energy-map-actions'},btn('Select highest map output',function(){selectTrial(result.highest[0]);}),btn('Select first map target match',function(){selectTrial(result.targetMatches[0]);},{disabled:!result.targetMatches.length}),btn('Export design map CSV',csv)),
        h('section',{className:'rn-energy-map-selected','aria-label':'Selected design map trial'},h('h4',null,'Map trial '+(trial.index+1)+' · '+fmt(trial.x)+' '+result.config.x.unit+' × '+fmt(trial.y)+' '+result.config.y.unit),h('p',null,result.config.x.label+': '+fmt(trial.x)+' '+result.config.x.unit+'. '+result.config.y.label+': '+fmt(trial.y)+' '+result.config.y.unit+'.'),
          h('p',null,result.metricLabel+': '+fmt(trial.result.value)+' '+result.unit+'; change from reference: '+signed(trial.delta)+' '+result.unit+(trial.percent==null?' (percentage unavailable from this reference).':' ('+signed(trial.percent)+'%).')+(trial.meetsTarget==null?'':trial.meetsTarget?' Delivery target met.':' Below the delivery target.')),
          h('p',null,id==='storage'?'Initially stored '+fmt(trial.result.initial)+' kWh + accepted charging '+fmt(trial.result.input)+' kWh = delivered '+fmt(trial.result.value)+' kWh + conversion loss '+fmt(trial.result.remainder)+' kWh + ending storage '+fmt(trial.result.endStored)+' kWh.':'Input resource '+fmt(trial.result.input)+' '+result.unit+' = electricity '+fmt(trial.result.value)+' '+result.unit+' + '+fmt(trial.result.remainder)+' '+result.unit+' not delivered as electricity.'),
          trial.result.unserved!=null&&h('p',null,'Unserved scheduled requests: '+fmt(trial.result.unserved)+' kWh.'),h('p',null,'Model behavior: '+trial.result.status+(trial.result.shutdownMinutes?' · '+trial.result.shutdownMinutes+' minutes in protective shutdown':'')+(trial.result.clippedMinutes?' · '+trial.result.clippedMinutes+' minutes with a scenario input clamped to control bounds':'')+'.'),
          h('p',{className:'rn-energy-muted'},'3D inspection restores the recorded inputs and '+(result.duration?'minute '+result.phase+'. The map measures the full sequence, even when this minute has no output.':'animation position. Animation time does not change steady power.')),
          h('div',{className:'rn-energy-toolbar'},btn('Inspect selected map trial in 3D',function(){props.onInspect(trial.settings,result.profileId,result.phase);}),btn('Restore map reference in 3D',function(){props.onInspect(result.baseSettings,result.profileId,result.phase);})),explanationPanel()),
        h('details',null,h('summary',null,'Review recorded map conditions'),h('p',null,result.prediction?'Prediction at run time: '+result.prediction:'No prediction was recorded.'),h('dl',{className:'rn-energy-experiment-inputs'},spec.controls.map(function(c){var varied=[result.config.x,result.config.y].find(function(a){return a.key===c[0];});return h('div',{key:c[0]},h('dt',null,c[1]),h('dd',null,varied?'Varied: '+fmt(varied.low)+'–'+fmt(varied.high)+' '+c[6]:fmt(result.baseSettings[c[0]])+' '+c[6]));})),result.variedScenarioInput&&h('p',null,'A varied input also sets the base for the resource scenario. Its prescribed time pattern is applied to each trial, then effective inputs are clamped to their control bounds.'),h('p',null,RN_ENERGY_MAP_RULES)),
        h('label',{className:'rn-energy-experiment-writing'},'Conclusion',h('textarea',{'aria-label':'Map conclusion',maxLength:3000,value:typeof state.conclusion==='string'?state.conclusion:'',placeholder:'Record a useful combination, a plateau, or a trade-off.',onChange:function(e){change({conclusion:e.target.value});}})),h('p',{className:'rn-energy-muted'},'The mechanism investigation export includes this recorded map, prediction, selected trial, conclusion, and any four-case explanation.')));
  }
  var RN_ENERGY_MAP_CSS='\n.rn-energy-design-map>h3{margin-top:14px}.rn-energy-design-fields,.rn-energy-design-options{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.rn-energy-design-fields fieldset{min-width:0;border:1px solid var(--re-border);border-radius:8px;padding:12px}.rn-energy-design-fields legend{font-weight:650;font-size:13px;padding:0 5px}.rn-energy-design-fields label{margin-bottom:12px}.rn-energy-map-scroll{overflow:auto;margin:14px 0}.rn-energy-map-scroll th:first-child{white-space:normal;min-width:150px;max-width:190px}.rn-energy-map-scroll td{padding:6px}.rn-energy-map-scroll button{width:100%;min-height:74px;text-align:center}.rn-energy-map-scroll button>strong,.rn-energy-map-scroll button>span{display:block;color:inherit}.rn-energy-map-scroll button>strong{font-size:16px}.rn-energy-map-scroll button>span{font-size:11px}.rn-energy-map-bar{height:5px;margin:7px 0;background:var(--re-border);border-radius:3px;overflow:hidden}.rn-energy-map-bar>span{display:block;height:100%;background:currentColor}.rn-energy-map-actions{justify-content:flex-start;margin:16px 0}.rn-energy-map-selected{padding:14px;border:1px solid var(--re-border);background:var(--re-alt);border-radius:10px;margin:14px 0}.rn-energy-map-selected h4{margin-top:0}.rn-energy-map-selected .rn-energy-toolbar{justify-content:flex-start}@media(max-width:600px){.rn-energy-design-fields,.rn-energy-design-options{grid-template-columns:1fr}.rn-energy-map-actions>button,.rn-energy-map-selected .rn-energy-toolbar>button{width:100%}}\n';

  RN_ENERGY_MAP_CSS+='\n.rn-energy-map-explanation{margin-top:18px;border-top:1px solid var(--re-border);padding-top:14px}.rn-energy-map-explanation summary{font-weight:650;cursor:pointer}.rn-energy-map-explanation h4{margin-top:18px}.rn-energy-map-explanation h5{font-size:14px;margin:0 0 8px}.rn-energy-map-cases,.rn-energy-map-orders{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:16px 0}.rn-energy-map-case{min-width:0;padding:16px;background:var(--re-card);border:1px solid var(--re-border);border-radius:9px;display:flex;flex-direction:column;align-items:flex-start}.rn-energy-map-case p{margin:6px 0 12px;overflow-wrap:anywhere}.rn-energy-map-case button{margin-top:auto;max-width:100%;white-space:normal}.rn-energy-map-case-output{font-size:23px;line-height:1.3;color:var(--re-text)}.rn-energy-map-interaction{border-left:3px solid var(--re-accent);padding:14px 16px;margin:18px 0;background:var(--re-card)}.rn-energy-map-orders p{margin:0;padding:12px;border:1px solid var(--re-border);border-radius:8px;line-height:1.7;overflow-wrap:anywhere}@media(max-width:600px){.rn-energy-map-cases,.rn-energy-map-orders{grid-template-columns:minmax(0,1fr)}.rn-energy-map-case button{width:100%}}\n';

  function RenewablesEnergyLab(props){
    var React=props.ctx.React,h=React.createElement,T=props.theme,state=props.state||{},spec=rnEnergySpec(state.selected),id=spec.id;
    var settings=rnEnergySettings(id,state.settings&&state.settings[id]),profile=rnEnergyProgram(id,state.scenarios&&state.scenarios[id]&&state.scenarios[id].profileId);
    var duration=profile?profile.duration:id==='storage'?120:60;
    var phase=profile?Math.floor(rnNumber(state.scenarios[id].minute,0,0,duration)):rnNumber(state.phases&&state.phases[id],0,0,duration);
    var study=React.useMemo(function(){return profile?rnEnergyScenario(id,settings,profile.id):null;},[id,JSON.stringify(settings),profile&&profile.id]);
    var steadyRun=React.useMemo(function(){return rnEnergyRun(id,settings,phase);},[id,JSON.stringify(settings),id==='storage'?phase:0]),run=study?study.rows[phase].run:steadyRun;
    var componentState=React.useState('converter'),selected=componentState[0],playingState=React.useState(false),playing=playingState[0],modeState=React.useState('3d');
    var noticeState=React.useState(''),uid=React.useId().replace(/:/g,''),live=React.useRef(null);
    live.current={state:state,props:props,phase:phase,id:id,duration:duration,step:profile?Math.max(1,Math.round(duration/120)):1};
    React.useEffect(function(){playingState[1](false);componentState[1]('converter');noticeState[1]('');},[id]);
    React.useEffect(function(){
      if(!playing)return;
      var timer=setInterval(function(){if(document.hidden)return;var p=live.current,max=p.duration;
        if(p.phase>=max){playingState[1](false);return;}
        p.props.onChange(rnEnergyPosition(p.state,p.id,Math.min(max,p.phase+p.step)));
      },200);
      return function(){clearInterval(timer);};
    },[playing,id]);
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function update(k,value){playingState[1](false);var all=Object.assign({},state.settings),next=Object.assign({},settings);next[k]=value;all[id]=rnEnergySettings(id,next);change({settings:all});}
    function time(value){playingState[1](false);props.onChange(rnEnergyPosition(state,id,value));}
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});}
    function button(label,action,pressed,extra){return h('button',Object.assign({type:'button',onClick:action,'aria-pressed':pressed==null?undefined:pressed},extra||{}),label);}
    var readings=(state.readings&&Array.isArray(state.readings[id])?state.readings[id]:[]).filter(function(r){return r&&r.settings;}).slice(-3);
    var resolvedReadings=React.useMemo(function(){return readings.map(function(row){return rnEnergyResolveReading(id,row);});},[id,state.readings&&state.readings[id]]);
    var currentReading={profileId:profile?profile.id:'steady',profileName:profile?profile.name:id==='storage'?'Two-hour cycle':'Steady conditions',phase:phase,baseSettings:settings,run:run,energy:study?study.rows[phase].energy:null,totals:study?study.totals:null};
    var comparison=resolvedReadings.length?rnEnergyCompareResolved(id,resolvedReadings[0],currentReading):null;
    function save(){
      var all=Object.assign({},state.readings),entry={settings:settings,phase:phase,profileId:profile?profile.id:'steady',name:state.readingNames&&state.readingNames[id]||'',note:state.notes&&state.notes[id]||''};
      var match=readings.findIndex(function(r,i){var a=resolvedReadings[i];return JSON.stringify(a.baseSettings)===JSON.stringify(settings)&&a.profileId===entry.profileId&&(entry.profileId==='steady'&&id!=='storage'||a.phase===phase);});
      all[id]=match>=0?readings.map(function(r,i){return i===match?entry:r;}):(readings.length>=3?[readings[0],readings[readings.length-1],entry]:readings.concat([entry]));change({readings:all});
      noticeState[1](match>=0?'Updated this reading and its note.':'Reading saved. Change one input, then save another to compare.');
    }
    function download(){
      var payload={title:'Renewables Lab: individual energy mechanisms',modelVersion:1,selected:id,settings:settings,phase:phase,result:run,note:state.notes&&state.notes[id]||'',assumptions:activeLimits,scenarioAssumptions:profile?scenarioAssumptions:null,formula:spec.formula,source:spec.source,operatingScenario:study?{version:1,profileId:study.profileId,label:study.label,baseSettings:study.baseSettings,duration:study.duration,selectedMinute:phase,totals:study.totals,samples:study.rows}:null,comparison:comparison,
        experiments:RN_ENERGY_SPECS.map(function(c){var saved=state.experiments&&state.experiments[c.id];var result=saved&&saved.run?rnEnergySweep(c.id,saved.run):null;return result?{result:result,conclusion:typeof saved.conclusion==='string'?saved.conclusion.slice(0,3000):''}:null;}).filter(Boolean),
        designMaps:RN_ENERGY_SPECS.map(function(c){var saved=state.designMaps&&state.designMaps[c.id],result=saved&&saved.run?rnEnergyMap(c.id,saved.run):null;return result?{result:result,view:{open:saved.open===true,selected:Math.floor(rnNumber(saved.selected,0,0,result.rows.length-1))},explanation:saved.explanation?{analysis:rnEnergyMapExplanation(result,saved.selected),open:saved.explanation.open===true,observation:saved.explanation.selected===Math.floor(rnNumber(saved.selected,0,0,result.rows.length-1))&&typeof saved.explanation.observation==='string'?saved.explanation.observation.slice(0,2000):''}:null,conclusion:typeof saved.conclusion==='string'?saved.conclusion.slice(0,3000):''}:null;}).filter(Boolean),
        notebooks:RN_ENERGY_SPECS.map(function(c){return {id:c.id,name:c.name,readings:(state.readings&&Array.isArray(state.readings[c.id])?state.readings[c.id]:[]).filter(function(r){return r&&r.settings;}).slice(-3).map(function(r){var resolved=rnEnergyResolveReading(c.id,r);return {name:r.name||'',note:r.note||'',profileId:resolved.profileId,phase:resolved.phase,baseSettings:resolved.baseSettings,result:resolved.run,accumulatedEnergy:resolved.energy,scenarioTotals:resolved.totals};})};})};
      var url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='renewables-mechanisms.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);noticeState[1]('Exported this mechanism and all saved technology readings.');
    }
    function inspectExperiment(inputs,profileId,minute){playingState[1](false);modeState[1]('3d');var next=Object.assign({},state.settings),scenarios=Object.assign({},state.scenarios),phases=Object.assign({},state.phases);next[id]=inputs;scenarios[id]={profileId:profileId,minute:minute};if(profileId==='steady')phases[id]=minute;change({settings:next,scenarios:scenarios,phases:phases});setTimeout(function(){var stage=document.getElementById(uid+'workbench');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);}
    function flow(){
      return h('ol',{className:'rn-energy-flow','aria-label':'Energy conversion pathway'},run.stages.map(function(stage,i){return h('li',{key:stage.label},h('span',null,String(i+1).padStart(2,'0')),h('div',null,h('strong',null,stage.label),h('p',null,fmt(stage.value)+' '+stage.unit)));}));
    }

    function operatingPanel(){
      var control=profile&&profile.key?spec.controls.find(function(c){return c[0]===profile.key;}):null;
      return h('section',{className:'rn-energy-panel rn-energy-operating','aria-label':'Operating conditions'},
        h('div',{className:'rn-energy-toolbar'},h('div',null,h('h3',null,'Test changing conditions'),h('p',{className:'rn-energy-muted'},'Choose a repeatable operating story, then watch the mechanism and energy totals respond.')),
          h('label',{htmlFor:uid+'program'},'Operating scenario',h('select',{id:uid+'program','aria-label':'Operating scenario',value:profile?profile.id:'steady',onChange:function(e){
            playingState[1](false);var scenarios=Object.assign({},state.scenarios);scenarios[id]={profileId:e.target.value,minute:0};change({scenarios:scenarios});
          }},h('option',{value:'steady'},id==='storage'?'Original two-hour cycle':'Steady conditions'),(RN_ENERGY_PROGRAMS[id]||[]).map(function(p){return h('option',{value:p.id,key:p.id},p.name);})))),
        profile&&h('div',null,h('p',null,profile.prompt),
          h('div',{className:'rn-energy-live-condition','aria-label':'Current operating condition'},h('strong',null,profile.name+' · minute '+phase+' of '+duration),
            control?h('p',null,control[1]+': '+fmt(settings[control[0]])+' '+control[6]+' baseline → '+fmt(run.settings[control[0]])+' '+control[6]+' at this minute. '+(study.rows[phase].clipped?'The resource value is clipped to this control’s supported range.':''))
              :h('p',null,'Scheduled action: '+run.extra.mode+' · request '+fmt(run.extra.request)+' kW · battery power limit '+fmt(settings.power)+' kW. Charging offers and demand requests stay fixed when you change the battery.')),
          h('small',null,'Synthetic teaching sequence. '+(control?'The resource slider sets the baseline; this scenario scales it over time while holding all other inputs fixed.':'Charge, wait, and discharge intervals are prescribed; no weather or grid forecast is used.')),
          h('details',null,h('summary',null,'Read the prescribed operating sequence'),
            h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Operating sequence'},h('table',null,
              h('caption',null,control?'Linear interpolation between the resource multipliers below; values are then bounded by the control range.':'Fixed requests for each interval. The battery may accept or deliver less because of its power or energy limit.'),
              h('thead',null,h('tr',null,(control?['Minute','Baseline multiplier']:['Start minute','End minute','Action','Requested kW']).map(function(v){return h('th',{key:v,scope:'col'},v);}))),
              h('tbody',null,(control?profile.points:profile.segments).map(function(row,i){return h('tr',{key:i},row.map(function(v,j){return h(j===0?'th':'td',{key:j,scope:j===0?'row':undefined},v);}));})))))));
    }
    function scenarioResults(){
      if(!study)return null;
      var row=study.rows[phase],stored=id==='storage',max=Math.max.apply(null,[1].concat(study.rows.map(function(r){return stored?r.run.extra.stored:r.run.power;}))),W=800,H=225,L=58,R=20,B=35;
      var x=function(m){return L+m/duration*(W-L-R);},y=function(v){return H-B-v/max*(H-B-20);};
      var shutdown=study.rows.find(function(r){return r.run.status==='Protective shutdown';}),firstGap=stored&&study.rows.find(function(r){return r.unserved>1e-7;});
      return h('section',{className:'rn-energy-panel','aria-label':'Operating scenario results'},
        h('div',{className:'rn-energy-toolbar'},h('h3',null,stored?'Follow the stored energy through the schedule':'Follow output through the operating story'),
          h('div',{className:'rn-energy-toolbar'},button('Inspect peak scenario output',function(){time(study.peakMinute);}),button('Inspect lowest scenario output',function(){time(study.leastMinute);}),
            shutdown&&button('Inspect first shutdown',function(){time(shutdown.minute);}),firstGap&&button('Inspect first unmet request',function(){time(firstGap.minute);}))),
        h('div',{className:'rn-energy-scenario-metrics'},
          h('div',null,h('small',null,'Electricity delivered so far'),h('strong',null,fmt(row.energy.delivered)+' kWh')),
          h('div',null,h('small',null,'Electricity over the full scenario'),h('strong',null,fmt(study.totals.delivered)+' kWh')),
          h('div',null,h('small',null,stored?'Unserved requests over the scenario':'Average power over the scenario'),h('strong',null,fmt(stored?study.totals.unserved:study.totals.delivered/(duration/60))+(stored?' kWh':' kW')))),
        h('div',{className:'rn-energy-chart-scroll',tabIndex:0,role:'region','aria-label':'Scrollable scenario chart'},h('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':stored?'Stored energy over the operating schedule in kWh. Use the scenario-minute slider or table for exact readings.':'Electrical output over the operating schedule in kW. Use the scenario-minute slider or table for exact readings.'},
          [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:L,x2:W-R,y1:y(max*f),y2:y(max*f),stroke:T.border,strokeDasharray:'3 4'}),h('text',{x:L-8,y:y(max*f)+4,textAnchor:'end',fill:T.muted,fontSize:12},fmt(max*f)));}),
          h('polyline',{points:study.rows.map(function(r){return x(r.minute)+','+y(stored?r.run.extra.stored:r.run.power);}).join(' '),fill:'none',stroke:T.accentHi,strokeWidth:2.5}),
          h('line',{x1:x(phase),x2:x(phase),y1:15,y2:H-B,stroke:T.text,strokeDasharray:'4 4'}),
          h('circle',{cx:x(phase),cy:y(stored?run.extra.stored:run.power),r:4,fill:T.text}),
          [0,duration/4,duration/2,3*duration/4,duration].map(function(t){return h('text',{key:t,x:x(t),y:H-12,textAnchor:'middle',fill:T.muted,fontSize:12},t+'m');}),
          h('text',{x:8,y:13,fontSize:12,fill:T.muted},stored?'kWh':'kW'))),
        h('p',{className:'rn-energy-muted',style:{fontSize:12}},stored?'Stored energy is measured at the start of each minute. The table reports average charging and discharging power during that minute.':'The resource changes at one-minute resolution. Electricity is integrated using those interval power values, so the final endpoint adds no extra energy. '+study.shutdownMinutes+' minutes in protective shutdown.'),
        h('p',null,stored?'Full schedule: '+fmt(study.initial)+' kWh initially stored + '+fmt(study.totals.input)+' kWh accepted charging = '+fmt(study.totals.delivered)+' kWh delivered + '+fmt(study.totals.remainder)+' kWh conversion loss + '+fmt(study.endStored)+' kWh remaining.'
          :'Full scenario: '+fmt(study.totals.input)+' kWh input resource energy = '+fmt(study.totals.delivered)+' kWh electricity + '+fmt(study.totals.remainder)+' kWh not delivered as electricity.'),
        h('details',null,h('summary',null,'Read minute-by-minute results'),
          h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Minute-by-minute scenario data'},h('table',null,
            h('caption',null,'Energy totals accumulate up to the selected minute. The final row is an endpoint, not an extra interval.'),
            h('thead',null,h('tr',null,['Minute','Status','Input kW','Output kW','Delivered so far kWh',stored?'Stored kWh':'Input so far kWh'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
            h('tbody',null,study.rows.map(function(r){return h('tr',{key:r.minute},h('th',{scope:'row'},r.minute),h('td',null,r.run.status),h('td',null,fmt(r.run.available)),h('td',null,fmt(r.run.power)),h('td',null,fmt(r.energy.delivered)),h('td',null,fmt(stored?r.run.extra.stored:r.energy.input)));}))))));
    }
    function comparisonPanel(){
      if(!comparison)return h('p',{className:'rn-energy-muted'},'Save a baseline to see exactly which inputs changed and how output differs.');
      var c=comparison,first=readings[0],verdict=c.controlled?'One input changed':!c.comparable?'Different operating conditions':c.changes.length===0?'Same modeled conditions':'Several inputs changed';
      function signed(v){return (v>1e-8?'+':'')+fmt(Math.abs(v)<1e-8?0:v);}
      return h('section',{className:'rn-energy-comparison','aria-label':'Current versus saved baseline'},
        h('h3',null,'Current vs '+(first.name||'first saved reading')),
        h('p',{className:'rn-energy-comparison-verdict'},verdict),
        h('p',null,'Electrical output: '+fmt(c.first.run.power)+' → '+fmt(c.second.run.power)+' kW ('+signed(c.powerDelta)+' kW'+(c.powerPercent==null?'; percentage change is undefined from a zero-output baseline':'; '+signed(c.powerPercent)+'%')+').'),
        c.energyDelta!=null&&h('p',null,'Delivered by the selected minute: '+fmt(c.first.energy.delivered)+' → '+fmt(c.second.energy.delivered)+' kWh ('+signed(c.energyDelta)+' kWh).'),
        c.context.length>0&&h('ul',null,c.context.map(function(v){return h('li',{key:v},v);})),
        c.changes.length>0&&h('ul',null,c.changes.map(function(v){return h('li',{key:v.key},v.label+': '+fmt(v.before)+' → '+fmt(v.after)+' '+v.unit);})),
        h('small',null,c.controlled?'The technology, scenario, and meaningful time are held fixed. This isolates one changed input within this model.':c.comparable&&c.changes.length===0?'The inputs match. Add or revise your observation, or change one input for a new experiment.':'These readings are useful comparisons, but the output difference cannot be attributed to just one input.'));
    }
    function savedDetails(){
      if(!readings.length)return null;
      return h('details',{className:'rn-energy-saved-detail'},h('summary',null,'Review saved inputs and observations'),
        readings.map(function(row,i){var r=resolvedReadings[i];return h('article',{key:i},h('div',{className:'rn-energy-toolbar'},h('h3',null,row.name||'Reading '+(i+1)),
          i>0&&button('Use as baseline',function(){var next=Object.assign({},state.readings);next[id]=[row].concat(readings.filter(function(_,j){return j!==i;}));change({readings:next});},null,{'aria-label':'Use reading '+(i+1)+' as baseline'})),
          h('p',null,r.profileName+(r.profileId!=='steady'||id==='storage'?' · minute '+r.phase:'')),
          h('dl',null,spec.controls.map(function(control){return h('div',{key:control[0]},h('dt',null,control[1]),h('dd',null,fmt(r.baseSettings[control[0]])+' '+control[6]));})),
          h('p',{className:'rn-energy-saved-note'},row.note||'No observation saved.'));}));
    }

    function responseChart(){
      var samples,control=spec.controls.find(function(c){return c[0]===spec.primary;}),storage=id==='storage';
      if(storage)samples=Array.from({length:25},function(_,i){var r=rnEnergyRun(id,settings,i*5);return {x:i*5,y:r.extra.stored};});
      else samples=Array.from({length:25},function(_,i){var x=control[2]+(control[3]-control[2])*i/24,patch=Object.assign({},settings);patch[control[0]]=x;return {x:x,y:rnEnergyRun(id,patch).power};});
      var W=600,H=200,L=52,B=35,R=18,max=Math.max.apply(null,[1].concat(samples.map(function(r){return r.y;}))),x0=samples[0].x,x1=samples[samples.length-1].x;
      var x=function(v){return L+(v-x0)/(x1-x0)*(W-L-R);},y=function(v){return H-B-v/max*(H-B-18);};
      return h('section',{className:'rn-energy-panel','aria-label':storage?'Battery cycle history':'Mechanism response curve'},
        h('h3',null,storage?'Where does the charging energy go?':'Change one input, see the response'),
        h('p',{className:'rn-energy-muted'},storage?'A complete charge-then-discharge cycle at the current capacity, power, efficiency, and initial charge.':'Sweep '+control[1].toLowerCase()+' while holding your other inputs fixed. The line connects 25 sampled calculations.'),
        h('div',{className:'rn-energy-chart-scroll',tabIndex:0,role:'region','aria-label':'Scrollable mechanism chart'},h('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':storage?'Stored energy through 120 minutes, in kWh. Use the timeline for exact readings.':'Electrical power versus '+control[1]+'. Exact sampled values are available below.'},
          [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:L,x2:W-R,y1:y(max*f),y2:y(max*f),stroke:T.border,strokeDasharray:'3 4'}),h('text',{x:L-7,y:y(max*f)+4,textAnchor:'end',fill:T.muted,fontSize:11},fmt(max*f)));}),
          h('polyline',{points:samples.map(function(r){return x(r.x)+','+y(r.y);}).join(' '),fill:'none',stroke:T.accentHi,strokeWidth:3}),
          [x0,(x0+x1)/2,x1].map(function(v){return h('text',{key:v,x:x(v),y:H-15,textAnchor:'middle',fill:T.muted,fontSize:11},fmt(v));}),
          h('text',{x:8,y:12,fill:T.muted,fontSize:11},storage?'kWh':'kW'),
          h('circle',{cx:x(storage?phase:settings[control[0]]),cy:y(storage?run.extra.stored:run.power),r:5,fill:T.text}))),
        h('small',null,storage?'Horizontal axis: minutes. Marker: selected time.':'Horizontal axis: '+control[1]+' ('+control[6]+'). Marker: your current setting.'),
        h('details',null,h('summary',null,'Read response data'),h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Response data'},h('table',null,
          h('caption',null,storage?'Stored energy by minute.':'Current inputs, with only '+control[1].toLowerCase()+' varied.'),
          h('thead',null,h('tr',null,h('th',{scope:'col'},storage?'Minute':control[1]+' ('+control[6]+')'),h('th',{scope:'col'},storage?'Stored energy (kWh)':'Electricity (kW)'))),
          h('tbody',null,samples.map(function(r){return h('tr',{key:r.x},h('th',{scope:'row'},fmt(r.x)),h('td',null,fmt(r.y)));}))))));
    }
    var component=spec.components.find(function(c){return c[0]===selected;})||spec.components[1],storage=id==='storage';
    var componentText=component[2];
    if(storage&&profile&&selected==='resource')componentText='The operating schedule prescribes fixed charging offers. The battery accepts no more than its power rating and available energy capacity; idle intervals interrupt charging.';
    if(storage&&profile&&selected==='generator')componentText='Scheduled demand is served only during discharge intervals. The battery may leave demand unserved because its power limit is too low or its stored energy runs out. Displayed power is averaged over the following minute.';
    var scenarioAssumptions='Synthetic resource sequences and battery requests are prescribed teaching inputs. Power is held over each one-minute interval; the final endpoint adds no energy. Battery requests remain fixed when capacity or power is changed.';
    var activeLimits=storage&&profile?'A prescribed charge, wait, and discharge schedule is recalculated from the chosen initial state. Separate power and energy bounds apply with the square root of round-trip efficiency for each conversion. No degradation, thermal behavior, self-discharge, reserve dispatch, or chemistry-specific voltage model.':spec.limits;
    return h('section',{className:'rn-energy-lab','aria-label':'Individual 3D energy simulations',style:{'--re-bg':T.bg,'--re-card':T.card,'--re-alt':T.cardAlt,'--re-text':T.text,'--re-muted':T.muted,'--re-border':T.border,'--re-accent':T.accentHi}},
      h('style',null,RN_ENERGY_CSS+RN_ENERGY_EXPERIMENT_CSS+RN_ENERGY_MAP_CSS+"\n.rn-energy-operating select{display:block;min-height:40px;max-width:100%;margin-top:5px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-card);color:var(--re-text);font:inherit}.rn-energy-operating label{font-size:12px}.rn-energy-operating select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}\n.rn-energy-operating .rn-energy-toolbar>div{flex:1;min-width:220px}.rn-energy-live-condition{border-left:3px solid var(--re-accent);padding:10px 14px;background:var(--re-alt);margin:12px 0}.rn-energy-live-condition p{margin:5px 0 0;font-size:12px}\n.rn-energy-name{display:block;margin:12px 0;font-size:12px}.rn-energy-name input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--re-border);border-radius:8px;padding:8px;background:var(--re-bg);color:var(--re-text)}\n.rn-energy-comparison{padding:14px;background:var(--re-alt);border:1px solid var(--re-border);border-radius:10px;margin:12px 0}.rn-energy-comparison p,.rn-energy-comparison li{font-size:12px}.rn-energy-comparison-verdict{font-weight:700}.rn-energy-comparison ul{padding-left:20px}.rn-energy-scenario-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.rn-energy-scenario-metrics strong{display:block;font-size:24px}.rn-energy-scenario-metrics small{display:block;font-size:11px}\n.rn-energy-saved-detail article{border-top:1px solid var(--re-border);padding:14px 0}.rn-energy-saved-detail article h3{font-size:14px;margin:0}.rn-energy-saved-detail dl>div{display:flex;justify-content:space-between;gap:12px;font-size:12px}.rn-energy-saved-detail dd{margin:0;white-space:nowrap}.rn-energy-saved-note{white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;border-left:3px solid var(--re-accent);background:var(--re-alt)}.rn-energy-scenario-notebook{max-width:100%}\n@media(max-width:600px){.rn-energy-scenario-metrics{grid-template-columns:1fr}.rn-energy-operating select{width:100%}.rn-energy-operating .rn-energy-toolbar>label{width:100%}.rn-energy-comparison h3{overflow-wrap:anywhere}}\n"),
      h('div',{className:'rn-energy-top'},h('div',null,h('div',{className:'rn-energy-kicker'},'Renewables Lab / mechanism studio'),h('h2',null,'Individual 3D energy simulations')),button('← Lab library',props.onBack)),
      h('p',{className:'rn-energy-muted'},'Open a mechanism, change the resource, and trace the conversion from input energy to electricity. Each technology keeps its own settings and readings.'),
      h('nav',{className:'rn-energy-gallery','aria-label':'Choose an energy mechanism'},RN_ENERGY_SPECS.map(function(c){return button(h(React.Fragment,null,h('b',{'aria-hidden':'true'},c.icon),h('div',null,h('strong',null,c.name),h('span',null,c.tag))),function(){change({selected:c.id});},id===c.id,{key:c.id,'aria-label':'Explore '+c.name});})),
      h('div',{className:'rn-energy-toolbar'},h('h3',null,spec.name+' workbench'),h('div',{className:'rn-energy-toolbar'},button('Storage & demand',props.onMicrogrid),button('Two-input map',function(){playingState[1](false);var maps=Object.assign({},state.designMaps);maps[id]=Object.assign({},maps[id],{open:true});change({designMaps:maps});setTimeout(function(){var el=document.getElementById(uid+'designMap');if(el){el.scrollIntoView({block:'start'});el.focus({preventScroll:true});}},0);}),button('Experiment bench',function(){var el=document.getElementById(uid+'experiment');if(el){el.scrollIntoView({block:'start'});el.focus({preventScroll:true});}}),button('Open '+spec.name+' lesson',function(){props.onLesson(spec.lesson);}),button('US transition sandbox',props.onTransition))),
      h('p',{className:'rn-energy-muted'},storage&&profile?'Follow a prescribed charging and demand schedule, then examine when power and stored energy limit the battery.':spec.intro),
      operatingPanel(),
      h('div',{id:uid+'workbench',className:'rn-energy-workspace',tabIndex:-1},
        h('aside',{className:'rn-energy-panel rn-energy-controls','aria-label':'Mechanism inputs'},h('h3',null,'Set the conditions'),
          spec.controls.map(function(c){return h('div',{className:'rn-energy-control',key:id+c[0]},h('label',{htmlFor:uid+c[0]},c[1],h('strong',null,fmt(settings[c[0]])+' '+c[6])),
            h('input',{id:uid+c[0],type:'range',min:c[2],max:c[3],step:c[4],value:settings[c[0]],'aria-label':c[1],'aria-valuetext':fmt(settings[c[0]])+' '+c[6],onChange:function(e){update(c[0],Number(e.target.value));}}));}),
          button('Reset '+spec.name+' inputs',function(){playingState[1](false);var next=Object.assign({},state.settings);next[id]=rnEnergySettings(id,{});props.onChange(rnEnergyPosition(Object.assign({},state,{settings:next}),id,0));}),
          h('p',{className:'rn-energy-muted',style:{fontSize:12,marginTop:14}},spec.prompt)),
        h('div',{style:{minWidth:0}},
          h('div',{className:'rn-energy-toolbar',style:{marginBottom:10}},h('strong',null,'Look inside the mechanism'),h('div',{className:'rn-energy-toolbar'},
            button('3D mechanism',function(){modeState[1]('3d');},modeState[0]==='3d'),button('Energy flow',function(){modeState[1]('flow');},modeState[0]==='flow'))),
          modeState[0]==='3d'?h('div',{className:'rn-energy-stage'},h(RenewablesEnergyScene,{React:React,id:id,run:run,phase:phase,selected:selected,onPick:componentState[1]}),h('div',{className:'rn-energy-scene-note'},'Schematic scale · drag to orbit · click a component · gold indicates electricity')):h('div',{className:'rn-energy-panel'},flow(),h('p',{className:'rn-energy-muted'},'Equivalent energy pathway. Select a component below to read how it works.')),
          h('div',{className:'rn-energy-time'},h('div',{className:'rn-energy-toolbar'},button(playing?'Pause mechanism':'Play mechanism',function(){if(!playing&&phase>=duration)props.onChange(rnEnergyPosition(state,id,0));playingState[1](!playing);},playing),button('Step forward',function(){time(Math.min(duration,phase+1));}),h('small',null,profile?profile.name:storage?'Two-hour charge / discharge cycle':'Motion illustrates the selected steady conditions')),
            h('div',{className:'rn-energy-control'},h('label',{htmlFor:uid+'phase'},profile?'Scenario minute':storage?'Cycle minute':'Animation position',h('strong',null,phase+(profile||storage?' min':' s'))),
              h('input',{id:uid+'phase',type:'range',min:0,max:duration,step:1,value:phase,'aria-label':profile?'Scenario minute':storage?'Cycle minute':'Animation position',onChange:function(e){time(Number(e.target.value));}})),
            h('small',null,profile?'Synthetic conditions change with the selected minute. Playback is accelerated; energy is integrated in one-minute steps.':storage?'0–60 min: charge. 60–120 min: discharge. Playback is accelerated; the calculation uses the labeled minutes.':'Playback starts paused. Rotor speed and flow particles are illustrative, not measured RPM or fluid velocity.')),
          h('div',{className:'rn-energy-parts','aria-label':'Inspect mechanism components'},spec.components.map(function(c,i){return button((i+1)+'. '+c[1],function(){componentState[1](c[0]);},selected===c[0],{key:c[0],'aria-label':'Inspect '+c[1]});})),
          h('div',{className:'rn-energy-component','aria-label':'Selected component explanation'},h('h3',null,component[1]),h('p',null,componentText)))),
      h('section',{'aria-label':'Mechanism measurements'},
        h('div',{className:'rn-energy-metrics'},[
          [storage?(profile?'Discharge power next minute':'Electricity delivered now'):'Electrical output',fmt(run.power)+' kW',run.status],
          storage?['Stored energy',fmt(run.extra.stored)+' kWh',fmt(run.extra.soc)+'% state of charge']:['Input resource power',fmt(run.available)+' kW','At the stated conditions'],
          storage?['Conversion loss so far',fmt(run.extra.loss)+' kWh','Charging plus discharging losses']:['Overall conversion',fmt(run.extra.efficiency*100)+'%',id==='wind'||id==='tidal'?'Includes power rating and operating limits':'Electrical output / input resource power']
        ].map(function(m){return h('div',{key:m[0]},h('small',null,m[0]),h('strong',null,m[1]),h('small',null,m[2]));})),
        h('div',{className:'rn-energy-panel'},h('h3',null,'Follow the energy accounting'),flow(),
          storage?h('p',null,'Initial '+fmt(run.extra.initial)+' kWh + accepted charge '+fmt(run.extra.charge)+' kWh − delivered '+fmt(run.extra.delivered)+' kWh − conversion losses '+fmt(run.extra.loss)+' kWh = stored '+fmt(run.extra.stored)+' kWh.')
            :h('p',null,'Input '+fmt(run.available)+' kW = electricity '+fmt(run.power)+' kW + '+fmt(run.loss)+' kW not delivered as electricity. This remainder includes unextracted resource energy and conversion losses.'),
          h('div',{className:'rn-energy-formula'},spec.formula),
          h('p',{className:'rn-energy-muted',style:{fontSize:12,marginTop:10}},profile?(storage?'Stored energy and losses are accumulated up to the selected minute. Power values are averages for the following minute; the final endpoint has zero power. Rewinding recalculates the same sequence.':'Power is sampled at each minute and held for that one-minute interval. Accumulated electricity is the sum of power × 1/60 hour. These prescribed resource profiles are not weather forecasts.'):storage?'The two phases are recalculated from the initial charge whenever an input changes. Rewinding the timeline does not create energy.':'kW measures power. If these conditions held for exactly one hour, the electrical energy would be '+fmt(run.power)+' kWh. Real resource conditions vary.'))),
      scenarioResults(),
      h(RenewablesEnergyExperiment,{React:React,id:id,uid:uid+'experiment',settings:settings,profileId:profile?profile.id:'steady',phase:phase,state:state.experiments&&state.experiments[id],onChange:function(value){playingState[1](false);var experiments=Object.assign({},state.experiments);experiments[id]=value;change({experiments:experiments});},onInspect:inspectExperiment}),
      h(RenewablesEnergyDesignMap,{React:React,id:id,uid:uid+'designMap',settings:settings,profileId:profile?profile.id:'steady',phase:phase,state:state.designMaps&&state.designMaps[id],onChange:function(value){playingState[1](false);var maps=Object.assign({},state.designMaps);maps[id]=value;change({designMaps:maps});},onInspect:inspectExperiment}),
      h('div',{className:study?'rn-energy-scenario-notebook':'rn-energy-study-grid'},!study&&responseChart(),
        h('section',{className:'rn-energy-panel','aria-label':'Mechanism investigation notebook'},h('div',{className:'rn-energy-toolbar'},h('h3',null,'Compare readings'),button('Save mechanism reading',save)),
          comparisonPanel(),
          h('p',{className:'rn-energy-muted'},'Keep a baseline and your two most recent comparisons for each technology. Restore a reading to revisit its inputs and observation.'),
          h('label',{className:'rn-energy-name',htmlFor:uid+'readingname'},'Name this reading',h('input',{id:uid+'readingname',type:'text',maxLength:60,value:state.readingNames&&state.readingNames[id]||'','aria-label':'Reading name',placeholder:'For example: larger rotor, same wind',onChange:function(e){var names=Object.assign({},state.readingNames);names[id]=e.target.value;change({readingNames:names});}})),
          h('label',{htmlFor:uid+'note'},'Prediction and observation',h('textarea',{id:uid+'note','aria-label':'Mechanism observation',maxLength:3000,value:state.notes&&state.notes[id]||'',placeholder:spec.prompt,onChange:function(e){var notes=Object.assign({},state.notes);notes[id]=e.target.value;change({notes:notes});}})),
          h('div',{role:'status','aria-live':'polite',style:{margin:'10px 0'}},noticeState[0]),
          readings.length>0&&h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Saved mechanism readings'},h('table',null,
            h('caption',null,spec.name+' readings, recalculated with mechanism model 1.'),
            h('thead',null,h('tr',null,['Reading','Output kW',storage?'Stored kWh':'Input kW','Actions'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
            h('tbody',null,readings.map(function(row,i){var saved=resolvedReadings[i],r=saved.run;return h('tr',{key:i},
              h('th',{scope:'row'},row.name||i+1),h('td',null,fmt(r.power)),h('td',null,fmt(storage?r.extra.stored:r.available)),
              h('td',null,button('Restore',function(){playingState[1](false);var next=Object.assign({},state.settings),phases=Object.assign({},state.phases),notes=Object.assign({},state.notes),scenarios=Object.assign({},state.scenarios),names=Object.assign({},state.readingNames);
                next[id]=saved.baseSettings;phases[id]=saved.profileId==='steady'?saved.phase:phases[id];scenarios[id]={profileId:saved.profileId,minute:saved.profileId==='steady'?0:saved.phase};notes[id]=row.note||'';names[id]=row.name||'';change({settings:next,phases:phases,notes:notes,scenarios:scenarios,readingNames:names});},null,{'aria-label':'Restore mechanism reading '+(i+1)}),
                ' ',button('Remove',function(){var next=Object.assign({},state.readings);next[id]=readings.filter(function(_,j){return i!==j;});change({readings:next});},null,{'aria-label':'Remove mechanism reading '+(i+1)})));})))),
          savedDetails(),button('Export mechanism investigation',download))),
      h('details',{className:'rn-energy-panel'},h('summary',null,'Assumptions and reference for '+spec.name),h('p',null,activeLimits),profile&&h('p',null,scenarioAssumptions),
        h('p',null,'The geometry and default values are illustrative teaching assumptions. These independent workbenches do not resize or change the US transition portfolio.'),
        h('a',{href:spec.source,target:'_blank',rel:'noopener noreferrer'},spec.name+' concept reference')));
  }



  function RenewablesCompanionConditions(props){
    var h=props.React.createElement,c=props.settings.companion;if(!c||!c.enabled)return h('p',null,'Second source: off.');
    var spec=rnEnergySpec(c.source),profile=rnEnergyProgram(c.source,c.profileId);
    return h('div',null,h('h4',null,'Recorded second source'),h('p',null,spec.name+' · '+c.sourceUnits+' unit(s) · '+(profile?profile.name+' ('+profile.duration+' min), offset '+c.offset+' min':'Steady resource')+'.'),
      h('dl',{className:'rn-outage-inputs'},spec.controls.map(function(control){return h('div',{key:control[0]},h('dt',null,control[1]),h('dd',null,c.sourceSettings[control[0]]+' '+control[6]));})),
      h('p',null,RN_HYBRID_TIMING),h('p',null,spec.formula),h('p',null,spec.limits),h('a',{href:spec.source,target:'_blank',rel:'noopener noreferrer'},spec.name+' concept reference'));
  }

  function RenewablesOutageStudy(props){
    var React=props.React,h=React.createElement,state=props.state||{},uid=props.uid,config=rnOutageConfig(props.settings,state.config);
    var study=React.useMemo(function(){return state.request?rnOutageStudy(state.request):null;},[JSON.stringify(state.request)]);
    var index=study?Math.floor(rnNumber(state.selected&&state.selected.index,0,0,study.samples.length-1)):0;
    var policy=RN_MICROGRID_POLICIES.find(function(p){return p.id===(state.selected&&state.selected.policy);})||RN_MICROGRID_POLICIES[0];
    var sample=study&&study.samples[index],entry=sample&&sample.strategies.find(function(p){return p.policy===policy.id;});
    var changed=study&&rnOutageSignature(props.settings)!==rnOutageSignature(study.settings),pending=study&&JSON.stringify(config)!==JSON.stringify(study.config);
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function configure(patch){change({config:Object.assign({},config,patch)});}
    function run(){change({config:config,request:{version:1,settings:rnMicrogridSettings(props.settings),config:config},selected:{index:0,policy:props.settings.policy},note:''});}
    function inspect(i,id){var row=study.samples[i],e=row.strategies.find(function(p){return p.policy===id;});props.onInspect(study.settings,{index:i,policy:id,start:row.start,minutes:study.config.minutes,minute:e.firstGap===null?row.start:e.firstGap});}
    function csv(){
      var headers=['source','source_scenario','outage_start_min','outage_end_min','strategy','outage_demand_kWh','outage_served_kWh','outage_unserved_kWh','outage_coverage_percent','first_unserved_interval_min','unserved_intervals','peak_unserved_kW','stored_at_start_kWh','stored_at_end_kWh','grid_import_before_outage_kWh','full_sequence_grid_import_kWh','second_source','second_scenario','second_units','second_offset_min','second_settings_json','primary_generation_kWh','second_generation_kWh','demand_shift_enabled','shift_percent','shift_from_start_min','shift_from_end_min','shift_to_start_min','shift_to_end_min','grid_limit_enabled','grid_limit_kW','full_sequence_grid_limit_unserved_kWh','full_sequence_grid_unavailable_unserved_kWh'];
      var data=[];study.samples.forEach(function(r){r.strategies.forEach(function(e){data.push([study.settings.source,study.settings.profileId,r.start,r.end,e.policy,e.demand,e.served,e.unserved,e.coverage,e.firstGap,e.gapMinutes,e.maxGap,e.storedAtStart,e.storedAtEnd,e.gridBeforeOutage,e.systemTotals.grid,study.settings.companion.enabled?study.settings.companion.source:null,study.settings.companion.enabled?study.settings.companion.profileId:null,study.settings.companion.enabled?study.settings.companion.sourceUnits:0,study.settings.companion.enabled?study.settings.companion.offset:null,study.settings.companion.enabled?JSON.stringify(study.settings.companion.sourceSettings):null,e.systemTotals.primaryGeneration,e.systemTotals.companionGeneration,study.settings.flex.enabled,study.settings.flex.percent,study.settings.flex.fromStart,study.settings.flex.fromStart+study.settings.flex.fromMinutes,study.settings.flex.toStart,study.settings.flex.toStart+study.settings.flex.toMinutes,study.settings.gridLimit.enabled,study.settings.gridLimit.power,e.systemTotals.gridLimited,e.systemTotals.gridUnavailable]);});});
      var text=[headers].concat(data).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
      var url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-outage-strategies.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }
    return h('section',{id:uid,className:'rn-energy-panel rn-outage-study',tabIndex:-1,'aria-label':'Outage timing study'},
      h('div',{className:'rn-energy-toolbar'},h('div',null,h('div',{className:'rn-energy-kicker'},'Resilience bench'),h('h3',null,'Does outage timing change the result?')),study&&btn('Export outage study CSV',csv)),
      h('p',null,'Compare all three battery strategies across the same sampled outage starts. Equipment, source conditions, demand, and initial charge stay fixed.'),
      h('div',{className:'rn-outage-controls'},
        h('label',{htmlFor:uid+'length'},'Outage length: '+config.minutes+' min',h('input',{id:uid+'length',type:'range',min:1,max:props.settings.duration,step:1,value:config.minutes,'aria-label':'Study outage length','aria-valuetext':config.minutes+' minutes',onChange:function(e){configure({minutes:Number(e.target.value)});}})),
        h('label',{htmlFor:uid+'count'},'Requested start times',h('select',{id:uid+'count','aria-label':'Outage start samples',value:config.count,onChange:function(e){configure({count:Number(e.target.value)});}},[5,13,25].map(function(n){return h('option',{key:n,value:n},n+' start times');}))),
        h('div',null,btn(study?'Run outage study again':'Run outage study',run,{'aria-label':'Run outage timing study'}))),
      h('p',{className:'rn-energy-muted'},'Every case replays from minute zero. Grid backup is available before and after the outage. There is no automatic precharging from the grid. Starts are rounded to whole minutes and duplicates are removed.'),
      (changed||pending)&&h('p',{className:'rn-outage-notice',role:'status'},changed?'System inputs changed. This study retains the recorded design. Run again to test the current system.':'Study setup changed. Run again to update these results.'),
      study&&h('div',{'aria-label':'Outage study results'},
        h('p',{role:'status'},study.samples.length+' outage starts × 3 strategies = '+study.samples.length*3+' cases. Each outage lasts '+study.config.minutes+' minutes.'),
        h('p',{className:'rn-energy-muted'},'Counts describe sampled cases, not outage probabilities or a reliability guarantee. Percentages below measure demand served during each outage.'),
        h('div',{className:'rn-outage-summary'},study.strategies.map(function(s){return h('article',{key:s.policy},h('h3',null,s.name),
          h('strong',null,s.evaluated?s.covered+' / '+s.evaluated:'No demand'),h('p',null,s.evaluated?'sampled outages with all demand served':'in the sampled outage windows'),
          h('small',null,'Largest unmet energy: '+fmt(s.worstUnserved)+' kWh'),
          btn('Inspect largest shortfall',function(){inspect(s.worstIndex,s.policy);},{disabled:s.worstUnserved===0,'aria-label':'Inspect largest shortfall for '+s.name}));})),
        h('p',null,'Choose a cell to restore this recorded design and inspect that outage in the 3D battery view. The table scrolls horizontally on small screens.'),
        h('div',{className:'rn-outage-matrix',tabIndex:0,role:'region','aria-label':'Outage strategy comparison'},h('table',null,
          h('caption',null,rnEnergySpec(study.settings.source).name+' · '+(rnEnergyProgram(study.settings.source,study.settings.profileId)||{name:'Steady resource'}).name+' · '+study.duration+'-minute sequence'),
          h('thead',null,h('tr',null,h('th',{scope:'col'},'Outage window'),RN_MICROGRID_POLICIES.map(function(p){return h('th',{scope:'col',key:p.id},p.name);}))),
          h('tbody',null,study.samples.map(function(r){return h('tr',{key:r.index},h('th',{scope:'row'},r.start+'–'+r.end+' min'),r.strategies.map(function(e){var p=RN_MICROGRID_POLICIES.find(function(p){return p.id===e.policy;});return h('td',{key:e.policy},
            btn(h(React.Fragment,null,h('strong',null,e.noDemand?'No demand':fmt(e.coverage)+'% served'),h('span',null,fmt(e.unserved)+' kWh unmet')),function(){inspect(r.index,e.policy);},{'aria-label':'Inspect '+p.name+' outage starting at '+r.start+' min','data-outage-status':e.noDemand?'empty':e.fullyServed?'covered':'gap','data-selected-case':index===r.index&&policy.id===e.policy?'true':undefined}));}));})))),
        h('section',{className:'rn-outage-case','aria-label':'Selected outage case'},h('h3',null,policy.name+' · '+sample.start+'–'+sample.end+' min'),
          h('div',{className:'rn-outage-case-metrics'},
            h('div',null,h('small',null,'Stored when the outage starts'),h('strong',null,fmt(entry.storedAtStart)+' kWh')),
            h('div',null,h('small',null,'First interval with unmet demand'),h('strong',null,entry.firstGap===null?'None':entry.firstGap+' min')),
            h('div',null,h('small',null,'Grid imports over the full sequence'),h('strong',null,fmt(entry.systemTotals.grid)+' kWh'))),
          h('p',null,'Outage demand: '+fmt(entry.demand)+' kWh. Unmet: '+fmt(entry.unserved)+' kWh across '+entry.gapMinutes+' minute intervals. Largest average power gap: '+fmt(entry.maxGap)+' kW.'),
          h('p',{className:'rn-energy-muted'},'Preserving energy for an outage can increase grid imports before it. Compare outage coverage and full-sequence imports together.'),
          btn('Restore recorded system',function(){props.onRestore(study.settings);})),
        h('details',null,h('summary',null,'Review recorded study conditions'),h(RenewablesGridConditions,{React:React,settings:study.settings}),h(RenewablesDemandConditions,{React:React,settings:study.settings}),h(RenewablesCompanionConditions,{React:React,settings:study.settings}),
          h('p',null,study.assumptions),
          h('dl',{className:'rn-outage-inputs'},[
            ['Generation units',study.settings.sourceUnits],['Demand pattern',RN_MICROGRID_LOADS.find(function(p){return p.id===study.settings.loadId;}).name],
            ['Base demand',fmt(study.settings.demand)+' kW'],['Battery units',study.settings.batteryUnits],
            ['Bank capacity',fmt(study.settings.battery.capacity*study.settings.batteryUnits)+' kWh'],['Bank power',fmt(study.settings.battery.power*study.settings.batteryUnits)+' kW'],
            ['Initial charge',fmt(study.settings.battery.initial)+'%'],['Round-trip efficiency',fmt(study.settings.battery.roundtrip)+'%'],
            ['Configured reserve',fmt(study.settings.reserve)+'%']
          ].concat(rnEnergySpec(study.settings.source).controls.map(function(c){return [c[1],fmt(study.settings.sourceSettings[c[0]])+' '+c[6]];})).map(function(v){return h('div',{key:v[0]},h('dt',null,v[0]),h('dd',null,String(v[1])));}))),
        h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'What did the timing study reveal?',h('textarea',{id:uid+'note','aria-label':'Outage study observation',maxLength:3000,value:state.note||'',placeholder:'Compare two start times or strategies. What explains the difference?',onChange:function(e){change({note:e.target.value});}})),
        h('p',{className:'rn-energy-muted'},'The energy system JSON export below includes this recorded study and its observation. CSV exports one row per outage and strategy.')));
  }

  var RN_OUTAGE_STUDY_CSS="\n.rn-outage-study{margin-top:18px}.rn-outage-study h3{margin:0 0 8px}.rn-outage-controls{display:grid;grid-template-columns:2fr 1fr 1fr;gap:18px;align-items:end;margin:18px 0}.rn-outage-controls label{display:block;font-size:12px}.rn-outage-controls input{display:block;width:100%;height:28px;accent-color:var(--re-accent);margin-top:8px}.rn-outage-controls select{display:block;width:100%;min-height:40px;margin-top:6px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-outage-controls select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-outage-notice{padding:12px;border-left:3px solid var(--re-accent);background:var(--re-alt)}.rn-outage-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0}.rn-outage-summary article{border:1px solid var(--re-border);border-radius:10px;padding:14px;background:var(--re-alt)}.rn-outage-summary strong{font-size:25px}.rn-outage-summary small{display:block;margin:8px 0}.rn-outage-summary button{font-size:12px}.rn-outage-matrix{overflow:auto;max-height:650px;margin:14px 0}.rn-outage-matrix table{min-width:650px}.rn-outage-matrix td{padding:7px}.rn-outage-matrix th{white-space:normal}.rn-outage-matrix button{display:block;width:100%;min-height:64px;white-space:normal;text-align:left;padding:10px}.rn-outage-matrix button strong,.rn-outage-matrix button span{display:block}.rn-outage-matrix button span{font-size:11px;margin-top:4px}.rn-outage-matrix [data-outage-status=covered]{background:var(--re-alt)}.rn-outage-matrix [data-outage-status=gap]{border-left:4px solid var(--mg-gap)}.rn-outage-matrix [data-selected-case=true]{outline:2px solid var(--re-accent);outline-offset:1px}.rn-outage-case{padding:16px;border:1px solid var(--re-border);border-radius:10px;margin-top:16px}.rn-outage-case-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:12px 0}.rn-outage-case-metrics small,.rn-outage-case-metrics strong{display:block}.rn-outage-case-metrics strong{font-size:21px}.rn-outage-case p,.rn-outage-study>.rn-energy-muted{font-size:12px}.rn-outage-inputs>div{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:5px 0;font-size:12px}.rn-outage-inputs dd{margin:0}.rn-outage-note{display:block;margin:16px 0;font-size:13px}.rn-outage-study details p{font-size:12px}\n@media(max-width:700px){.rn-outage-controls{grid-template-columns:1fr 1fr}.rn-outage-controls>label:first-child{grid-column:1/-1}.rn-outage-summary,.rn-outage-case-metrics{grid-template-columns:1fr}.rn-outage-controls>div button{width:100%}}\n@media(max-width:380px){.rn-outage-controls{grid-template-columns:1fr}}\n";

  function RenewablesBatteryDesignStudy(props){
    var React=props.React,h=React.createElement,state=props.state||{},uid=props.uid,config=rnBatteryDesignConfig(props.settings,state.config);
    var study=React.useMemo(function(){return state.request?rnBatteryDesignStudy(state.request):null;},[JSON.stringify(state.request)]);
    var index=study&&study.samples.length?Math.floor(rnNumber(state.selected,0,0,study.samples.length-1)):0,entry=study&&study.samples[index];
    var candidate=entry&&rnBatteryDesignCase(study.settings,study.config,entry.unitCapacity,entry.unitPower);
    var sameOriginal=study&&JSON.stringify(props.settings)===JSON.stringify(study.settings),sameCandidate=candidate&&state.inspected&&JSON.stringify(props.settings)===JSON.stringify(candidate);
    var changed=study&&!sameOriginal&&!sameCandidate,pending=study&&JSON.stringify(config)!==JSON.stringify(study.config);
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});}
    function coverage(e){return e.coverage===null?'No demand':fmt(e.coverage)+'%';}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function configure(patch){change({config:Object.assign({},config,patch)});}
    function range(label,key,min,max,step,unit){return h('label',null,label+': '+fmt(config[key])+' '+unit,h('input',{type:'range',min:min,max:max,step:step,value:config[key],'aria-label':label,'aria-valuetext':fmt(config[key])+' '+unit,onChange:function(e){var p={};p[key]=Number(e.target.value);configure(p);}}));}
    function select(label,key,options){return h('label',null,label,h('select',{'aria-label':label,value:config[key],onChange:function(e){var p={};p[key]=key==='count'?Number(e.target.value):e.target.value;configure(p);}},options.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})));}
    function run(){change({config:config,request:{version:1,settings:rnMicrogridSettings(props.settings),config:config},selected:0,inspected:false,note:''});}
    function inspect(i){var e=study.samples[i];props.onInspect(rnBatteryDesignCase(study.settings,study.config,e.unitCapacity,e.unitPower),i,e.firstGap===null?0:e.firstGap);}
    function csv(){
      var headers=['source','scenario','grid','strategy','battery_units','initial_comparison','target_percent','unit_capacity_kWh','unit_power_kW','bank_capacity_kWh','bank_power_kW','initial_kWh','initial_capped','local_demand_coverage_percent','meets_target','compact_option','demand_kWh','local_supply_kWh','grid_import_kWh','unserved_kWh','curtailed_kWh','battery_loss_kWh','final_storage_kWh','first_local_shortfall_min','power_limited_intervals','energy_or_strategy_limited_intervals','second_source','second_scenario','second_units','second_offset_min','second_settings_json','primary_generation_kWh','second_generation_kWh','demand_shift_enabled','shift_percent','shift_from_start_min','shift_from_end_min','shift_to_start_min','shift_to_end_min','grid_limit_enabled','grid_limit_kW','full_sequence_grid_limit_unserved_kWh','full_sequence_grid_unavailable_unserved_kWh'];
      var data=study.samples.map(function(e){return [study.settings.source,study.settings.profileId,study.settings.grid,study.settings.policy,study.settings.batteryUnits,study.config.initialMode,study.config.target,e.unitCapacity,e.unitPower,e.capacity,e.power,e.initialStored,e.initialClipped,e.coverage,e.meetsTarget,study.frontier.indexOf(e.index)>=0,e.demand,e.localEnergy,e.totals.grid,e.totals.unserved,e.totals.curtailed,e.totals.loss,e.endStored,e.firstGap,e.powerLimitedMinutes,e.energyLimitedMinutes,study.settings.companion.enabled?study.settings.companion.source:null,study.settings.companion.enabled?study.settings.companion.profileId:null,study.settings.companion.enabled?study.settings.companion.sourceUnits:0,study.settings.companion.enabled?study.settings.companion.offset:null,study.settings.companion.enabled?JSON.stringify(study.settings.companion.sourceSettings):null,e.totals.primaryGeneration,e.totals.companionGeneration,study.settings.flex.enabled,study.settings.flex.percent,study.settings.flex.fromStart,study.settings.flex.fromStart+study.settings.flex.fromMinutes,study.settings.flex.toStart,study.settings.flex.toStart+study.settings.flex.toMinutes,study.settings.gridLimit.enabled,study.settings.gridLimit.power,e.totals.gridLimited,e.totals.gridUnavailable];});
      var text=[headers].concat(data).map(function(row){return row.map(function(v){return v==null?'':typeof v==='number'?String(v):'"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
      var url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-battery-designs.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }
    return h('section',{id:uid,className:'rn-energy-panel rn-outage-study rn-design-study',tabIndex:-1,'aria-label':'Battery design bench'},
      h('div',{className:'rn-energy-toolbar'},h('div',null,h('div',{className:'rn-energy-kicker'},'Design bench'),h('h3',null,'More energy, more power, or both?')),study&&entry&&btn('Export battery designs CSV',csv)),
      h('p',null,'Compare battery capacity (how much energy fits) with power (how quickly energy moves). Each design uses your recorded source, demand, grid schedule, and battery strategy over the full sequence.'),
      h('div',{className:'rn-design-controls'},
        range('Minimum unit capacity','capacityMin',10,config.capacityMax,1,'kWh'),range('Maximum unit capacity','capacityMax',config.capacityMin,500,1,'kWh'),
        range('Minimum unit power','powerMin',0,config.powerMax,1,'kW'),range('Maximum unit power','powerMax',config.powerMin,200,1,'kW'),
        range('Local demand coverage target','target',0,100,1,'%'),select('Design samples per axis','count',[[5,'5 × 5 designs'],[9,'9 × 9 designs']]),
        select('Starting charge comparison','initialMode',[['energy','Same starting energy (kWh)'],['percent','Same starting percentage (%)']]),
        h('div',null,btn(study?'Compare battery designs again':'Compare battery designs',run,{'aria-label':'Run battery design study',disabled:props.settings.batteryUnits===0}))),
      h('p',{className:'rn-energy-muted'},'Ranges apply to each unit. The bank keeps '+props.settings.batteryUnits+' unit(s). Matrix labels show the whole bank. Equal range endpoints produce one value on that axis.'),
      props.settings.batteryUnits===0&&h('p',{role:'status'},'Add at least one battery unit in Battery bank setup to run a design comparison.'),
      h('p',{className:'rn-energy-muted'},config.initialMode==='energy'?'Same starting energy uses the recorded initial kWh, capped at each candidate bank’s capacity. A bigger empty bank does not gain free starting energy.':'Same starting percentage gives bigger banks more initial energy. Compare the initial kWh as well as coverage before attributing gains to equipment size.'),
      h('p',{className:'rn-energy-muted'},'Local demand coverage counts direct generation plus battery discharge; grid imports do not count. Initial battery energy has no assigned source, so local coverage is not a renewable-energy percentage.'),
      changed&&h('p',{className:'rn-outage-notice',role:'status'},'System inputs changed. These battery designs retain the recorded conditions. Run again to compare the current system.'),
      pending&&h('p',{className:'rn-outage-notice',role:'status'},'Design setup changed. Run again to apply the new ranges, target, or starting charge comparison.'),
      study&&h('div',{'aria-label':'Battery design results'},
        h('p',{role:'status'},study.samples.length+' sampled designs · '+study.passing+' meet the '+fmt(study.config.target)+'% local coverage target.'),
        study.baseline.coverage===null&&h('p',null,'No demand in this sequence. Coverage and target results are not evaluated.'),
        study.clipped>0&&h('p',null,study.clipped+' designs cap starting energy because their bank cannot hold the recorded '+fmt(study.baseline.initialStored)+' kWh.'),
        h('div',{className:'rn-outage-summary'},
          h('article',null,h('h3',null,'Recorded bank'),h('strong',null,coverage(study.baseline)),h('p',null,'local demand coverage'),h('small',null,fmt(study.baseline.capacity)+' kWh · '+fmt(study.baseline.power)+' kW'),h('small',null,fmt(study.baseline.initialStored)+' kWh at the start')),
          h('article',null,h('h3',null,'Designs meeting the target'),h('strong',null,study.passing+' / '+study.samples.length),h('p',null,'at least '+fmt(study.config.target)+'% local coverage'),h('small',null,'Same '+study.settings.duration+'-minute sequence for every design')),
          h('article',null,h('h3',null,'Compact options'),h('strong',null,study.frontier.length),h('p',null,'sampled capacity–power trade-offs'),h('small',null,'No other passing design uses no more of both ratings and less of at least one.'))),
        study.frontier.length>0&&h('div',{className:'rn-energy-toolbar rn-design-options','aria-label':'Compact battery options'},study.frontier.map(function(i){var e=study.samples[i];return btn(fmt(e.capacity)+' kWh / '+fmt(e.power)+' kW',function(){inspect(i);},{key:i,'aria-label':'Inspect compact design '+i+': '+fmt(e.capacity)+' kWh, '+fmt(e.power)+' kW'});})),
        study.passing===0&&study.baseline.coverage!==null&&h('p',null,'No sampled design meets this target. Explore a wider range, more generation, a different demand profile, or another battery strategy.'),
        h('p',null,'Choose a cell to restore its recorded conditions and inspect the first local supply shortfall in 3D. Compact labels describe this sample only; they do not establish cost or an optimal installation.'),
        entry&&h('div',{className:'rn-outage-matrix rn-design-matrix',role:'region',tabIndex:0,'aria-label':'Battery capacity and power comparison'},h('table',null,
          h('caption',null,'Whole-bank capacity down rows; whole-bank power across columns. '+study.settings.batteryUnits+' unit(s). '+(study.config.initialMode==='energy'?'Same starting kWh, capped to capacity.':'Same starting percentage.')),
          h('thead',null,h('tr',null,h('th',{scope:'col'},'Energy / power'),study.powers.map(function(p,i){return h('th',{scope:'col',key:i},fmt(p*study.settings.batteryUnits)+' kW');}))),
          h('tbody',null,study.capacities.map(function(c,ci){return h('tr',{key:ci},h('th',{scope:'row'},fmt(c*study.settings.batteryUnits)+' kWh'),study.powers.map(function(p,pi){var e=study.samples[ci*study.powers.length+pi],compact=study.frontier.indexOf(e.index)>=0;return h('td',{key:pi},
            btn(h(React.Fragment,null,h('strong',null,coverage(e)),h('span',null,e.coverage===null?'Not evaluated':e.meetsTarget?'Target met':'Below target'),compact&&h('span',null,'◆ Compact option')),
              function(){inspect(e.index);},{'aria-label':'Inspect battery design '+e.index+': '+fmt(e.capacity)+' kWh, '+fmt(e.power)+' kW. '+coverage(e)+' local coverage. '+(e.coverage===null?'Not evaluated.':e.meetsTarget?'Target met.':'Below target.')+(compact?' Compact option.':''),'data-outage-status':e.coverage===null?'empty':e.meetsTarget?'covered':'gap','data-selected-case':state.inspected&&index===e.index?'true':undefined}));}));})))),
        entry&&h('section',{className:'rn-outage-case','aria-label':'Selected battery design'},h('h3',null,fmt(entry.capacity)+' kWh capacity · '+fmt(entry.power)+' kW power'),
          h('p',null,sameCandidate?'This recorded design is open in the simulation.':'Selected recorded result. Inspect this design to open its simulation.'),
          h('div',{className:'rn-outage-case-metrics'},h('div',null,h('small',null,'Local demand coverage'),h('strong',null,coverage(entry))),h('div',null,h('small',null,'Grid imports'),h('strong',null,fmt(entry.totals.grid)+' kWh')),h('div',null,h('small',null,'Unserved demand'),h('strong',null,fmt(entry.totals.unserved)+' kWh'))),
          h('p',null,'Initial storage: '+fmt(entry.initialStored)+' kWh ('+fmt(entry.initialPercent)+'%). Final storage: '+fmt(entry.endStored)+' kWh. Battery losses: '+fmt(entry.totals.loss)+' kWh.'),
          entry.coverage!==null&&h('p',null,'Coverage change from recorded bank: '+fmt(entry.coverage-study.baseline.coverage)+' percentage points.'),
          h('h3',null,'What limits local supply?'),h('p',null,entry.firstGap===null?'No interval needs grid imports or has unmet demand.':'First interval needing grid supply or leaving demand unmet: minute '+entry.firstGap+'.'),
          h('p',null,'Power rating below the generation deficit: '+entry.powerLimitedMinutes+' intervals. Stored energy permitted by the strategy below that deficit: '+entry.energyLimitedMinutes+' intervals. These counts can overlap and include only intervals with a local shortfall.'),
          h('p',null,'The energy limit includes efficiency and the current discharge floor. Holding charge for outages can cause an energy/strategy limit even when the battery is full.'),
          h('div',{className:'rn-energy-toolbar'},btn('Inspect selected battery design in 3D',function(){inspect(index);}),btn('Restore design baseline',function(){props.onRestore(study.settings);}))),
        h('details',null,h('summary',null,'Review battery design conditions'),h(RenewablesGridConditions,{React:React,settings:study.settings}),h(RenewablesDemandConditions,{React:React,settings:study.settings}),h(RenewablesCompanionConditions,{React:React,settings:study.settings}),h('p',null,rnEnergySpec(study.settings.source).name+' · '+(rnEnergyProgram(study.settings.source,study.settings.profileId)||{name:'Steady resource'}).name+' · '+study.settings.sourceUnits+' generation unit(s) · '+study.settings.demand+' kW base demand · '+RN_MICROGRID_LOADS.find(function(p){return p.id===study.settings.loadId;}).name),
          h('p',null,'Grid: '+study.settings.grid+(study.settings.grid==='outage'?' ('+study.settings.outageStart+'–'+(study.settings.outageStart+study.settings.outageMinutes)+' min outage)':'')+'. Strategy: '+RN_MICROGRID_POLICIES.find(function(p){return p.id===study.settings.policy;}).name+'. Reserve: '+fmt(study.settings.reserve)+'%. Efficiency: '+fmt(study.settings.battery.roundtrip)+'%.'),
          h('dl',{className:'rn-outage-inputs'},rnEnergySpec(study.settings.source).controls.map(function(c){return h('div',{key:c[0]},h('dt',null,c[1]),h('dd',null,fmt(study.settings.sourceSettings[c[0]])+' '+c[6]));})),h('p',null,study.assumptions)),
        h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'Design observation',h('textarea',{id:uid+'note','aria-label':'Battery design observation',value:typeof state.note==='string'?state.note:'',maxLength:3000,placeholder:'Did more kWh or more kW help? How did starting charge and the strategy affect the result?',onChange:function(e){change({note:e.target.value});}}))));
  }
  var RN_BATTERY_DESIGN_CSS='\n.rn-design-controls{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0;align-items:end}.rn-design-controls label{display:block;font-size:12px}.rn-design-controls input{display:block;width:100%;height:28px;accent-color:var(--re-accent);margin-top:8px}.rn-design-controls select{display:block;width:100%;min-height:40px;margin-top:6px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-design-controls select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-design-matrix table{min-width:820px}.rn-design-options{justify-content:flex-start;margin:14px 0}.rn-design-study>.rn-energy-muted{font-size:12px}@media(max-width:600px){.rn-design-controls{grid-template-columns:1fr}.rn-design-controls button{width:100%}}\n';

  function RenewablesDemandConditions(props){
    var h=props.React.createElement,f=props.settings.flex;if(!f||!f.enabled)return h('p',null,'Demand shifting: off.');
    return h('div',null,h('h4',null,'Recorded demand shift'),h('p',null,'Reschedule '+f.percent+'% of original demand from minutes '+f.fromStart+'–'+(f.fromStart+f.fromMinutes)+' uniformly into minutes '+f.toStart+'–'+(f.toStart+f.toMinutes)+'.'),h('p',null,RN_DEMAND_SHIFT_RULES));
  }
  function RenewablesDemandShiftBench(props){
    var h=props.React.createElement,s=props.settings,f=s.flex,summary=props.result.demandSchedule,original=props.original,uid=props.uid;
    var noChange=summary.netShiftedEnergy<=Math.max(summary.baselineEnergy,Number.MIN_VALUE)*1e-9;
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,action,extra){return h('button',Object.assign({type:'button',onClick:action},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},f,patch));}
    function range(label,key,min,max,unit){return h('label',{htmlFor:uid+key},label+': '+fmt(f[key])+' '+unit,h('input',{id:uid+key,type:'range',min:min,max:max,step:1,value:f[key],'aria-label':label,'aria-valuetext':fmt(f[key])+' '+unit,onChange:function(e){var patch={};patch[key]=Number(e.target.value);change(patch);}}));}
    return h('section',{id:uid,className:'rn-energy-panel rn-demand-shift',tabIndex:-1,'aria-label':'Demand shifting bench'},
      h('div',{className:'rn-energy-toolbar'},h('div',null,h('div',{className:'rn-energy-kicker'},'Demand flexibility'),h('h3',null,'Use the same energy at a different time'))),
      h('p',null,'Move part of the demand into another window, then compare the same generators, battery, initial charge, and grid schedule. Total requested energy stays the same.'),
      h('label',{className:'rn-flex-toggle'},h('input',{type:'checkbox',checked:f.enabled,'aria-label':'Enable demand shifting',onChange:function(e){change({enabled:e.target.checked});}}),' Enable demand shifting'),
      f.enabled&&h(props.React.Fragment,null,
        h('div',{className:'rn-design-controls'},range('Share of source-window demand','percent',0,100,'%'),h('p',{className:'rn-energy-muted'},'This share is taken from each original demand interval in the source window and spread evenly across the receiving window.'),
          range('Source window starts','fromStart',0,s.duration-1,'min'),range('Source window length','fromMinutes',1,s.duration-f.fromStart,'min'),range('Receiving window starts','toStart',0,s.duration-1,'min'),range('Receiving window length','toMinutes',1,s.duration-f.toStart,'min')),
        h('p',null,'From '+f.fromStart+'–'+(f.fromStart+f.fromMinutes)+' min → '+f.toStart+'–'+(f.toStart+f.toMinutes)+' min. Windows stay within this '+s.duration+'-minute sequence; their end minutes are excluded.'),
        h('p',{className:'rn-energy-muted'},'Short receiving windows can increase the peak load. This schedule is prescribed; it does not automatically find the best time or cancel unmet demand.'),
        summary.overlapMinutes>0&&h('p',{className:'rn-outage-notice'},'The windows overlap for '+summary.overlapMinutes+' minutes. Increases and decreases in those minutes can cancel. The timing-change total below accounts for that.'),
        h('div',{className:'rn-energy-scenario-metrics','aria-label':'Demand shifting summary'},
          h('div',null,h('small',null,'Requested energy'),h('strong',null,fmt(summary.scheduledEnergy)+' kWh'),h('small',null,'Original: '+fmt(summary.baselineEnergy)+' kWh')),
          h('div',null,h('small',null,'Energy moved between minutes'),h('strong',null,fmt(summary.netShiftedEnergy)+' kWh'),h('small',null,fmt(summary.allocatedEnergy)+' kWh selected from the source window')),
          h('div',null,h('small',null,'Peak scheduled demand'),h('strong',null,fmt(summary.scheduledPeak)+' kW'),h('small',null,'Original peak: '+fmt(summary.baselinePeak)+' kW'))),
        noChange&&h('p',{role:'status'},'These settings do not change demand timing. Try a different share or window.'),
        original&&h(props.React.Fragment,null,h('h3',null,'What changed in the system?'),h('p',{className:'rn-energy-muted'},'Change = shifted minus original. The table scrolls horizontally on small screens.'),
          h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Original and shifted demand results'},h('table',null,h('caption',null,'Same equipment and total requested energy over '+s.duration+' minutes.'),
            h('thead',null,h('tr',null,['Energy (kWh)','Original timing','Shifted timing','Change'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),
            h('tbody',null,[['Energy requested','demand'],['Direct generation to demand','direct'],['Battery discharge','discharge'],['Grid imports','grid'],['Unserved demand','unserved'],['Curtailed generation','curtailed'],['Battery losses','loss']].map(function(item){var a=original.totals[item[1]],b=props.result.totals[item[1]],difference=Math.abs(b-a)<.005?0:b-a;return h('tr',{key:item[1]},h('th',{scope:'row'},item[0]),h('td',null,fmt(a)),h('td',null,fmt(b)),h('td',null,(difference>0?'+':'')+fmt(difference)));})))),
          h('p',null,'Final storage: '+fmt(original.endStored)+' kWh with original timing; '+fmt(props.result.endStored)+' kWh after shifting. Generation is identical in both runs.')),
        h('div',{className:'rn-energy-toolbar'},btn('Compare demand timing',props.onChart),btn('Inspect largest demand increase in 3D',function(){props.onInspect(summary.largestIncrease);},{disabled:noChange||summary.largestIncrease===null})),
        h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'Demand-shift observation',h('textarea',{id:uid+'note','aria-label':'Demand-shift observation',value:typeof props.note==='string'?props.note:'',maxLength:3000,placeholder:'Did shifting reduce a supply gap, or did the new peak make it harder to serve demand?',onChange:function(e){props.onNote(e.target.value);}})),
        h('p',{className:'rn-energy-muted'},'The outage and battery-design benches use this schedule. Their captured studies preserve it when you inspect or restore a case. System JSON includes this comparison and observation; CSV records the original demand, removed load, and added load each minute.')),
      h('details',null,h('summary',null,'Demand-shifting rules'),h('p',null,RN_DEMAND_SHIFT_RULES)));
  }
  var RN_DEMAND_SHIFT_CSS='\n.rn-demand-shift{margin-top:18px}.rn-demand-shift .rn-energy-table{max-height:none}.rn-demand-shift h3{margin-top:0}.rn-flex-toggle{display:flex;gap:9px;align-items:center;min-height:44px;font-size:14px}.rn-flex-toggle input{width:18px;height:18px;accent-color:var(--re-accent)}.rn-demand-shift>.rn-energy-muted{font-size:12px}\n';

  function RenewablesSupplyGapExplorer(props){
    var h=props.React.createElement,a=props.analysis,state=props.state||{},v=rnSupplyGapView(a,state),selected=v.selected,uid=props.uid;
    function fmt(value){return Number(value).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,action,extra){return h('button',Object.assign({type:'button',onClick:action},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,{scope:v.scope,sort:v.sort,page:v.page,selected:selected?selected.key:null},patch));}
    function csv(minutes){var url=URL.createObjectURL(new Blob([rnSupplyGapCsv(a,v.scope,minutes)],{type:'text/csv;charset=utf-8'})),el=document.createElement('a');el.href=url;el.download=minutes?'renewables-gap-minutes.csv':'renewables-'+v.scope+'-gap-episodes.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
    function select(label,key,options){return h('label',{htmlFor:uid+key},label,h('select',{id:uid+key,'aria-label':label,value:v[key],onChange:function(e){var patch={page:0,selected:null};patch[key]=e.target.value;change(patch);}},options.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})));}
    function x(minute){return 24+minute/a.duration*772;}
    var longest=v.episodes.reduce(function(n,e){return Math.max(n,e.minutes);},0),energy=v.scope==='local'?a.totals.localGap:a.totals.unserved;
    return h('section',{id:uid,className:'rn-energy-panel rn-gap-explorer',tabIndex:-1,'aria-label':'Supply gap explorer'},
      h('div',{className:'rn-energy-toolbar'},h('div',null,h('div',{className:'rn-energy-kicker'},'Reliability diagnostics'),h('h3',null,'Find and explain supply gaps')),btn('Export gap episodes CSV',function(){csv(false);})),
      h('p',null,'Find continuous periods when generation and battery discharge cannot cover demand. Grid backup may serve a local supply gap; an unserved gap means demand remains unmet. Results follow the current system as you change it.'),
      h('div',{className:'rn-gap-controls'},select('Gaps to investigate','scope',[['local','All local supply gaps'],['unserved','Unserved demand only']]),select('Sort supply gaps','sort',[['energy','Largest gap energy'],['duration','Longest duration'],['time','Earliest first']])),
      h('div',{className:'rn-energy-scenario-metrics','aria-label':'Supply gap summary'},
        h('div',null,h('small',null,v.scope==='local'?'Local gap episodes':'Unserved gap episodes'),h('strong',null,v.episodes.length),h('small',null,'Consecutive one-minute intervals')),
        h('div',null,h('small',null,'Longest episode'),h('strong',null,longest+' min'),h('small',null,'Within this '+a.duration+'-minute sequence')),
        h('div',null,h('small',null,v.scope==='local'?'Total local gap':'Total unserved energy'),h('strong',null,fmt(energy)+' kWh'),h('small',null,fmt(a.totals.grid)+' kWh supplied by grid; '+fmt(a.totals.unserved)+' kWh unserved in the full sequence'))),
      h('div',{className:'rn-energy-chart-scroll',tabIndex:0,role:'region','aria-label':'Supply gap timeline'},h('svg',{viewBox:'0 0 820 145',role:'img','aria-label':'Local and unserved gap episodes over time. Choose a period below for exact values and 3D inspection.'},
        [['local',a.localEpisodes,32,'Local supply gaps','var(--re-accent)'],['unserved',a.unservedEpisodes,83,'Unserved demand','var(--mg-gap)']].map(function(lane){return h('g',{key:lane[0]},
          h('text',{x:24,y:lane[2]-10,fill:'var(--re-text)',fontSize:12},lane[3]),
          h('rect',{x:24,y:lane[2],width:772,height:22,fill:'var(--re-alt)',stroke:'var(--re-border)'}),
          lane[1].map(function(e){return h('rect',{key:e.key,x:x(e.start),y:lane[2],width:Math.max(.7,x(e.end)-x(e.start)),height:22,fill:lane[4]});}),
          selected&&v.scope===lane[0]&&h('rect',{x:x(selected.start)-1,y:lane[2]-3,width:Math.max(.7,x(selected.end)-x(selected.start))+2,height:28,fill:'none',stroke:'var(--re-text)',strokeWidth:2}));}),
        [0,.25,.5,.75,1].map(function(f){return h('text',{key:f,x:x(a.duration*f),y:132,textAnchor:f===0?'start':f===1?'end':'middle',fill:'var(--re-muted)',fontSize:12},Math.round(a.duration*f)+' min');}))),
      h('p',{className:'rn-energy-muted'},'Blocks show gap duration, not power. An outlined block is selected. End minutes are excluded; grid-covered intervals remain in the top lane.'),
      !v.episodes.length&&h('p',{role:'status',className:'rn-gap-empty'},a.demand===0?'No demand is scheduled, so there are no supply gaps.':v.scope==='unserved'?'All demand is served in this replay. Switch to all local supply gaps to see where grid backup was needed.':'Generation and battery discharge cover demand in every interval of this replay.'),
      v.episodes.length>0&&h(props.React.Fragment,null,
        h('div',{className:'rn-gap-episodes','aria-label':'Supply gap periods'},v.visible.map(function(e){var value=v.scope==='local'?e.localGap:e.unserved;return btn(h(props.React.Fragment,null,h('strong',null,e.start+'–'+e.end+' min'),h('span',null,e.minutes+' min · '+fmt(value)+' kWh '+(v.scope==='local'?'local gap':'unserved'))),function(){change({selected:e.key});},{key:e.key,'aria-pressed':selected&&e.key===selected.key,'aria-label':'Select '+v.scope+' gap from '+e.start+' to '+e.end+' minutes, '+fmt(value)+' kWh'});})),
        h('div',{className:'rn-energy-toolbar'},btn('Previous gap periods',function(){change({page:v.page-1,selected:null});},{disabled:v.page===0}),h('span',{role:'status'},'Periods '+(v.page*8+1)+'–'+Math.min(v.episodes.length,(v.page+1)*8)+' of '+v.episodes.length),btn('Next gap periods',function(){change({page:v.page+1,selected:null});},{disabled:v.page>=v.pages-1}))),
      selected&&h('section',{className:'rn-gap-detail','aria-label':'Selected supply gap'},
        h('h3',null,(v.scope==='local'?'Local supply gap':'Unserved demand')+' · '+selected.start+'–'+selected.end+' min'),
        h('p',null,fmt(selected.demand)+' kWh demand = '+fmt(selected.direct)+' direct generation + '+fmt(selected.discharge)+' battery discharge + '+fmt(selected.grid)+' grid imports + '+fmt(selected.unserved)+' unserved.'),
        selected.unserved>0&&h('p',null,'Unserved demand in this period: '+fmt(selected.gridLimited)+' kWh from the connection limit + '+fmt(selected.gridUnavailable)+' kWh while grid backup is unavailable.'),
        h('p',null,'Peak '+(v.scope==='local'?'local gap':'unserved demand')+': '+fmt(selected.peak)+' kW at minute '+selected.peakMinute+'. Storage: '+fmt(selected.startStored)+' kWh at minute '+selected.start+' → '+fmt(selected.endStored)+' kWh at minute '+selected.end+'.'),
        h('p',{className:'rn-energy-muted'},'3D inspection opens the battery when installed, otherwise the primary generator. Both follow the selected system minute.'),h('h4',null,'Account for the local gap'),
        h('p',{className:'rn-energy-muted'},'These amounts add to '+fmt(selected.localGap)+' kWh. Power is assigned first; stored energy and strategy restrictions account for the remainder. Changing one limit can reveal another.'),
        h('dl',{className:'rn-gap-accounting','aria-label':'Gap accounting'},RN_SUPPLY_GAP_PARTS.map(function(part){return h('div',{key:part[0]},h('dt',null,part[1]),h('dd',null,fmt(selected.parts[part[0]])+' kWh'),h('dd',{className:'rn-gap-bar','aria-hidden':true},h('span',{style:{width:(selected.localGap?Math.min(100,selected.parts[part[0]]/selected.localGap*100):0)+'%'}})));})),
        h('div',{className:'rn-energy-toolbar'},btn('Inspect gap start in 3D',function(){props.onInspect(selected.start);}),btn('Inspect peak gap in 3D',function(){props.onInspect(selected.peakMinute);}),btn('Inspect final gap minute in 3D',function(){props.onInspect(selected.end-1);})),
        h('details',null,h('summary',null,'What to investigate next'),
          selected.parts.noBank>0&&h('p',null,'Add battery units to test storage. A bank needs stored energy or earlier surplus generation to supply demand.'),
          selected.parts.power>0&&h('p',null,'Compare bank power ratings in the battery design bench. More power still requires enough stored energy.'),
          selected.parts.energy>0&&h('p',null,'Investigate earlier surplus generation, demand timing, or initial charge. Increasing empty capacity alone does not create electricity.'),
          selected.parts.held>0&&h('p',null,'Compare reserve and battery strategies. Releasing held energy now can leave less available for later deficits.'),
          selected.grid>0&&h('p',null,'Grid backup serves part of this local gap. Use the outage study to test loss of that backup.'),
          h('div',{className:'rn-energy-toolbar'},btn('Open battery design bench',function(){props.onOpen('designStudy');}),btn('Open demand shifting',function(){props.onOpen('flexLab');}),btn('Open outage timing study',function(){props.onOpen('outageStudy');})))),
      h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'Supply-gap observation',h('textarea',{id:uid+'note','aria-label':'Supply-gap observation',maxLength:3000,value:v.note,placeholder:'Which constraint explains the gap, and what happened when you changed it?',onChange:function(e){change({note:e.target.value});}})),
      h('div',{className:'rn-energy-toolbar'},btn('Export gap minutes CSV',function(){csv(true);})),
      h('p',{className:'rn-energy-muted'},'Episode CSV includes current settings. Minute CSV records the gap accounting at each interval. System JSON includes both episode lists, all gap minutes, the rules, and this observation. This explorer updates live; recorded outage and battery studies keep their own captured conditions.'),
      h('details',null,h('summary',null,'How gap accounting works'),h('p',null,RN_SUPPLY_GAP_RULES),RN_SUPPLY_GAP_PARTS.map(function(part){return h('p',{key:part[0]},h('strong',null,part[1]+': '),part[2]);})));
  }
  var RN_SUPPLY_GAP_CSS='\n.rn-gap-explorer{margin-top:18px}.rn-gap-controls{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.rn-gap-controls label{font-size:12px}.rn-gap-controls select{display:block;width:100%;margin-top:6px;min-height:40px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-gap-controls select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-gap-episodes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.rn-gap-episodes button{text-align:left}.rn-gap-episodes strong,.rn-gap-episodes span{display:block}.rn-gap-episodes button[aria-pressed=true] :is(strong,span){color:var(--re-bg)}.rn-gap-episodes button[aria-pressed=false] :is(strong,span){color:var(--re-text)}.rn-gap-episodes span{font-size:12px}.rn-gap-detail{margin:18px 0;padding:16px;background:var(--re-alt);border:1px solid var(--re-border);border-radius:10px}.rn-gap-detail h4{margin:18px 0 6px}.rn-gap-detail p,.rn-gap-explorer>.rn-energy-muted{font-size:12px}.rn-gap-accounting{margin:14px 0}.rn-gap-accounting>div{display:grid;grid-template-columns:1fr auto;gap:5px 12px;margin:12px 0;font-size:12px}.rn-gap-accounting dd{margin:0}.rn-gap-bar{height:7px;background:var(--re-card);border:1px solid var(--re-border);border-radius:3px;grid-column:1/-1;overflow:hidden}.rn-gap-bar span{display:block;height:100%;background:var(--re-accent)}.rn-gap-empty{padding:12px;border-left:3px solid var(--re-accent);background:var(--re-alt)}@media(max-width:600px){.rn-gap-controls,.rn-gap-episodes{grid-template-columns:1fr}.rn-gap-detail .rn-energy-toolbar button{width:100%}}\n';




  function RenewablesGridPeriods(props){
    var h=props.React.createElement,pair=props.pair,uid=props.uid,v=rnGridPeriodView(pair.periods,props.state),e=v.selected,t=pair.periods.totals;
    function fmt(value){var n=Number(value);return n!==0&&Math.abs(n)<.0001?n.toExponential(3):n.toLocaleString(undefined,{maximumSignificantDigits:6});}
    function signed(n){return (n>0?'+':'')+fmt(n===0?0:n);}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function update(patch,move){var prefs=Object.assign({},v.prefs,patch),next=rnGridPeriodView(pair.periods,prefs);props.onChange(prefs,move&&next.selected?next.minute:undefined);}
    function select(label,key,options){return h('label',null,label,h('select',{'aria-label':label,value:v.prefs[key],onChange:function(event){var patch={selected:null,page:0};patch[key]=event.target.value;update(patch,false);}},options.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})));}
    function csv(){var url=URL.createObjectURL(new Blob([rnGridPeriodCsv(pair)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-grid-change-periods.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
    function inspect(side){props.onInspect(side,v.minute,Object.assign({},v.prefs,{selected:e.key,page:v.page}));}
    function metric(label,key){return h('tr',{key:key},h('th',{scope:'row'},label),h('td',null,fmt(e.a[key])),h('td',null,fmt(e.b[key])),h('td',null,signed(e.delta[key])));}
    function boundary(label,key){return h('tr',{key:key},h('th',{scope:'row'},label),h('td',null,fmt(e[key].a)),h('td',null,fmt(e[key].b)),h('td',null,signed(e[key].b-e[key].a)));}
    function x(minute){return 105+minute/pair.duration*520;}
    return h('details',{className:'rn-grid-periods',id:uid,'aria-label':'Explore periods of change',open:v.prefs.open,onToggle:function(event){if(event.currentTarget.open!==v.prefs.open)update({open:event.currentTarget.open},false);}},
      h('summary',null,'Explore periods of change'),h('div',{className:'rn-grid-period-body'},
        h('h4',null,'When does B help or hurt?'),h('p',null,'Each period joins consecutive minutes with the same direction of unmet-demand change. Improvement and worsening can occur in the same comparison.'),
        h('div',{className:'rn-outage-case-metrics'},h('div',null,h('small',null,'Unserved energy avoided by B'),h('strong',null,fmt(t.avoidedUnserved)+' kWh')),h('div',null,h('small',null,'Unserved energy added by B'),h('strong',null,fmt(t.addedUnserved)+' kWh')),h('div',null,h('small',null,'Periods of change'),h('strong',null,pair.periods.episodes.length))),
        h('p',{className:'rn-energy-muted'},'Whole sequence: '+fmt(t.addedUnserved)+' added − '+fmt(t.avoidedUnserved)+' avoided + ('+fmt(t.remainingEnergyChange)+') from remaining intervals = '+signed(t.netEnergyChange)+' kWh net change.'),
        h('div',{className:'rn-grid-period-controls'},select('Change periods to show','kind',[['all','All change periods'],['improved','B improves coverage'],['worsened','B worsens coverage']]),select('Order change periods','sort',[['time','Start time'],['energy','Largest energy impact'],['duration','Longest duration']])),
        h('p',{id:uid+'scroll',className:'rn-energy-muted'},'Scroll the period map and ledger horizontally on small screens. With a keyboard, focus a region and use the arrow keys.'),
        h('div',{className:'rn-grid-period-map',role:'region',tabIndex:0,'aria-label':'Improvement and worsening period map','aria-describedby':uid+'scroll'},h('svg',{viewBox:'0 0 650 125',role:'img','aria-labelledby':uid+'mapTitle '+uid+'mapDesc'},h('title',{id:uid+'mapTitle'},'Periods where B improves or worsens unmet demand'),h('desc',{id:uid+'mapDesc'},'The upper lane shows improvement periods and the lower lane worsening periods. Width indicates duration. An outline marks the selected period. Use the period buttons below to select.'),
          ['improved','worsened'].map(function(kind,i){var y=20+i*40;return h('g',{key:kind},h('text',{x:5,y:y+18,fill:'var(--re-text)',fontSize:12},i?'B worsens':'B helps'),h('line',{x1:105,x2:625,y1:y+13,y2:y+13,stroke:'var(--re-border)'}),v.episodes.filter(function(p){return p.kind===kind;}).map(function(p){return h('rect',{key:p.key,x:x(p.start),y:y,width:Math.max(.75,x(p.end)-x(p.start)),height:26,rx:2,fill:kind==='improved'?'var(--re-accent)':'var(--mg-gap)',stroke:e&&e.key===p.key?'var(--re-text)':'none',strokeWidth:3});}));}),
          [0,.5,1].map(function(f){return h('text',{key:f,x:x(pair.duration*f),y:115,textAnchor:f===0?'start':f===1?'end':'middle',fill:'var(--re-muted)',fontSize:11},fmt(pair.duration*f)+' min');}))),
        h('p',{className:'rn-energy-muted'},'Map blocks show duration, not power or energy. End minutes are excluded. Choose a period to move the comparison cursor to its selected moment.'),
        !v.episodes.length&&h('p',{role:'status'},pair.a.totals.demand===0?'No demand in the recorded sequence, so there are no change periods.':pair.periods.episodes.length?'No periods match this filter.':'No interval has a meaningful unmet-demand difference. Imports and storage may still differ.'),
        v.episodes.length>0&&h(props.React.Fragment,null,
          h('div',{className:'rn-grid-period-list','aria-label':'Change period choices'},v.visible.map(function(p){return btn(h(props.React.Fragment,null,h('strong',null,(p.kind==='improved'?'B helps':'B worsens')+' · '+p.start+'–'+p.end+' min'),h('span',null,fmt(p.magnitude)+' kWh '+(p.kind==='improved'?'avoided':'added')+' · '+p.minutes+' min')),function(){update({selected:p.key},true);},{key:p.key,'aria-label':'Select '+p.kind+' period from '+p.start+' to '+p.end+' minutes','aria-pressed':e&&p.key===e.key});})),
          h('div',{className:'rn-energy-toolbar'},btn('Previous change periods',function(){update({page:v.page-1,selected:null},false);},{disabled:v.page===0}),h('span',{role:'status'},'Periods '+(v.page*6+1)+'–'+Math.min(v.episodes.length,v.page*6+6)+' of '+v.episodes.length),btn('Next change periods',function(){update({page:v.page+1,selected:null},false);},{disabled:v.page>=v.pages-1}))),
        e&&h('section',{className:'rn-outage-case','aria-label':'Selected change period'},h('h4',null,(e.kind==='improved'?'B improves coverage':'B worsens coverage')+' · '+e.start+'–'+e.end+' min'),
          h('p',null,fmt(e.magnitude)+' kWh '+(e.kind==='improved'?'less':'more')+' unserved energy in B across '+e.minutes+' minute intervals. Largest difference: '+fmt(e.peakDifference)+' kW at minute '+e.peakMinute+'.'),
          h('p',null,'Grid backup is available for '+e.availableMinutes+' minutes and unavailable for '+e.unavailableMinutes+' minutes in this period. Shared demand: '+fmt(e.demand)+' kWh; direct generation: '+fmt(e.direct)+' kWh.'),
          h('div',{className:'rn-grid-period-moment'},h('label',null,'Period moment',h('select',{'aria-label':'Period moment',value:v.prefs.moment,onChange:function(event){update({moment:event.target.value},true);}},[['start','Period start'],['peak','Largest difference'],['last','Final affected minute']].map(function(item){return h('option',{key:item[0],value:item[0]},item[1]);})))),
          h('p',null,'Selected moment: minute '+v.minute+'. Both inspections restore their recorded case at this minute.'),
          h('div',{className:'rn-energy-toolbar'},btn('Show period on comparison chart',function(){props.onTimeline(Object.assign({},v.prefs,{selected:e.key,page:v.page}),v.minute);}),btn('Inspect period in case A',function(){inspect('a');}),btn('Inspect period in case B',function(){inspect('b');})),
          h('details',null,h('summary',null,'Compare this period’s energy and storage'),h('div',{className:'rn-energy-table',role:'region',tabIndex:0,'aria-label':'Change period energy and storage','aria-describedby':uid+'scroll'},h('table',null,h('caption',null,'All values are kWh. Change is B minus A. Storage rows are boundary values.'),h('thead',null,h('tr',null,['Quantity','A','B','Change'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),h('tbody',null,metric('Unserved demand','unserved'),metric('Grid imports','grid'),metric('Battery discharge','discharge'),metric('Battery charge','charge'),metric('Curtailed generation','curtailed'),metric('Connection-limit unserved energy','gridLimited'),metric('Grid-unavailable unserved energy','gridUnavailable'),boundary('Storage at minute '+e.start,'startStored'),boundary('Storage at minute '+e.end,'endStored')))))),
        h('div',{className:'rn-energy-toolbar'},btn('Export all change periods CSV',csv)),h('p',{className:'rn-energy-muted'},'The export includes all periods in start-time order and both cases’ recorded settings, regardless of the current filter.'),h('details',null,h('summary',null,'How change periods are counted'),h('p',null,RN_GRID_PERIOD_RULES))));
  }
  var RN_GRID_PERIOD_CSS='\n.rn-grid-periods{margin:16px 0;padding:12px;border:1px solid var(--re-border);border-radius:8px}.rn-grid-period-body{padding-top:14px}.rn-grid-period-controls{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}.rn-grid-periods label{font-size:12px}.rn-grid-periods select{display:block;width:100%;min-height:40px;margin-top:6px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-grid-periods select:focus-visible,.rn-grid-period-map:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-grid-period-map{overflow-x:auto}.rn-grid-period-map svg{display:block;width:100%;min-width:560px}.rn-grid-period-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.rn-grid-period-list button{text-align:left}.rn-grid-period-list strong,.rn-grid-period-list span{display:block}.rn-grid-period-list span{font-size:12px;margin-top:5px}.rn-grid-period-list button[aria-pressed=true] :is(strong,span){color:var(--re-bg)}.rn-grid-period-list button[aria-pressed=false] :is(strong,span){color:var(--re-text)}.rn-grid-periods .rn-outage-case{padding:12px}.rn-grid-periods .rn-energy-table table{min-width:650px}@media(max-width:600px){.rn-grid-periods{padding:8px}.rn-grid-period-controls,.rn-grid-period-list{grid-template-columns:1fr}.rn-grid-periods .rn-outage-case{padding:8px}}\n';

  function RenewablesGridPair(props){
    var React=props.React,h=React.createElement,uid=props.uid,study=props.study,view=rnGridPairState(study,props.state),active=!!props.state;
    var choices=React.useMemo(function(){return rnGridPairChoices(study);},[study]);
    var pair=React.useMemo(function(){return active?rnGridPair(study,{a:view.a,b:view.b}):null;},[study,view.a,view.b,active]);
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumSignificantDigits:6});}
    function signed(v){return (v>0?'+':'')+fmt(v===0?0:v);}
    function change(patch){props.onChange(Object.assign({},view,patch));}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function choose(label,key){return h('label',null,label,h('select',{'aria-label':label,value:view[key],onChange:function(e){var patch={minute:0,periods:Object.assign({},view.periods,{selected:null,page:0})};patch[key]=e.target.value;change(patch);}},choices.map(function(c){return h('option',{key:c.key,value:c.key},c.name);})));}
    function inspect(side,minute,periods){var c=pair[side],selectedMinute=minute===undefined?view.minute:minute,patch={minute:selectedMinute};if(periods){patch.periods=periods;patch.chart='unserved';}props.onInspect(c.settings,c.index===null?null:{index:c.index,policy:c.policy},selectedMinute,patch);}
    function csv(){var url=URL.createObjectURL(new Blob([rnGridPairCsv(pair)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-grid-case-comparison.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
    function condition(c){return (c.index===null?'Recorded baseline · ':'')+RN_MICROGRID_POLICIES.find(function(p){return p.id===c.policy;}).name+' · '+(c.settings.gridLimit.enabled?fmt(c.settings.gridLimit.power)+' kW import limit':'unlimited imports while available');}
    function chart(){
      var field=view.chart,storage=field==='stored',max=Math.max.apply(null,pair.rows.map(function(r){return Math.max(r.a[field],r.b[field]);}))||1;
      function x(t){return 58+t/pair.duration*580;}function y(v){return 180-v/max*145;}
      return h('div',{id:uid+'timeline',className:'rn-grid-pair-chart',tabIndex:0,role:'region','aria-label':'Two-case timeline chart','aria-describedby':uid+'scroll'},h('svg',{viewBox:'0 0 670 220',role:'img','aria-labelledby':uid+'title '+uid+'description'},
        h('title',{id:uid+'title'},(storage?'Stored energy':field==='grid'?'Grid imports':'Unmet demand')+' in cases A and B'),h('desc',{id:uid+'description'},'Solid line is A; dashed line is B. Vertical line is the selected minute. '+(storage?'Stored energy in kWh is measured at minute boundaries.':'Power in kW is constant over each modeled minute.')+(selectedPeriod?' The outlined period is '+selectedPeriod.start+' to '+selectedPeriod.end+' minutes.':'')+' Exact values are available below the chart.'),
        study.settings.grid==='outage'&&h('rect',{x:x(study.settings.outageStart),y:30,width:x(study.settings.outageStart+study.settings.outageMinutes)-x(study.settings.outageStart),height:150,fill:'var(--re-border)',opacity:.3}),
        [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:58,x2:638,y1:y(max*f),y2:y(max*f),stroke:'var(--re-border)'}),h('text',{x:52,y:y(max*f)+4,textAnchor:'end',fill:'var(--re-muted)',fontSize:11},fmt(max*f)));}),
        h('text',{x:58,y:18,fill:'var(--re-muted)',fontSize:11},storage?'Stored energy (kWh)':field==='grid'?'Grid imports (kW)':'Unmet demand (kW)'),
        [0,.25,.5,.75,1].map(function(f){return h('text',{key:f,x:x(pair.duration*f),y:201,textAnchor:f===0?'start':f===1?'end':'middle',fill:'var(--re-muted)',fontSize:11},fmt(pair.duration*f)+' min');}),
        selectedPeriod&&h('rect',{'data-grid-period-band':selectedPeriod.key,x:x(selectedPeriod.start),y:30,width:x(selectedPeriod.end)-x(selectedPeriod.start),height:150,fill:'none',stroke:selectedPeriod.kind==='improved'?'var(--re-accent)':'var(--mg-gap)',strokeWidth:2,strokeDasharray:'5 3'}),
        ['a','b'].map(function(side){return h('polyline',{key:side,'data-grid-pair-series':side,points:pair.rows.filter(function(r){return storage||r.minute<pair.duration;}).map(function(r){var point=x(r.minute)+','+y(r[side][field]);return storage?point:point+' '+x(r.minute+1)+','+y(r[side][field]);}).join(' '),fill:'none',stroke:side==='a'?'var(--re-accent)':'var(--mg-gap)',strokeWidth:2.5,strokeDasharray:side==='a'?'':'8 4'});}),
        h('line',{x1:x(view.minute),x2:x(view.minute),y1:30,y2:180,stroke:'var(--re-text)',strokeDasharray:'3 3'})));
    }
    var row=pair&&pair.rows[view.minute],unit=view.chart==='stored'?'kWh':'kW',periodView=pair&&rnGridPeriodView(pair.periods,view.periods),selectedPeriod=periodView&&periodView.prefs.open&&periodView.selected;
    return h('details',{id:uid,className:'rn-grid-pair',tabIndex:-1,'aria-label':'Compare two grid cases',open:view.open,onToggle:function(e){if(e.currentTarget.open!==view.open)change({open:e.currentTarget.open});}},
      h('summary',null,'Compare two grid cases'),pair&&h('div',{className:'rn-grid-pair-body'},
        h('h3',null,'What changes from A to B?'),h('p',null,'Compare any two cases from this recorded experiment, including its baseline. Choosing cases changes this comparison. Use the inspection buttons to load a case in the 3D simulation.'),
        h('div',{className:'rn-grid-study-controls'},choose('Case A','a'),choose('Case B','b')),
        h('div',{className:'rn-energy-toolbar'},btn('Swap A and B',function(){change({a:view.b,b:view.a,periods:Object.assign({},view.periods,{selected:null,page:0})});}),btn('Export comparison minutes CSV',csv)),
        h('p',null,'A: '+condition(pair.a)+'.'),h('p',null,'B: '+condition(pair.b)+'.'),
        h('p',{className:'rn-energy-muted'},'Both cases have '+fmt(pair.a.totals.demand)+' kWh demand, '+fmt(pair.a.totals.generation)+' kWh generation, and '+fmt(pair.a.initialStored)+' kWh initial stored energy. Changes below are B minus A.'),
        h('div',{className:'rn-outage-case-metrics'},h('div',null,h('small',null,'Unserved energy change'),h('strong',null,signed(pair.deltaTotals.unserved)+' kWh')),h('div',null,h('small',null,'Grid import change'),h('strong',null,signed(pair.deltaTotals.grid)+' kWh')),h('div',null,h('small',null,'Final storage change'),h('strong',null,signed(pair.deltaEndStored)+' kWh'))),
        h('p',null,'B has less unmet demand in '+pair.summary.improvedMinutes+' minute intervals, more in '+pair.summary.worsenedMinutes+', and the same amount in '+pair.summary.unchangedMinutes+'. Negative unserved-energy change means B leaves less demand unmet overall.'),
        pair.summary.firstDifference===null&&h('p',{role:'status'},'Unmet demand is the same in every interval. Imports or stored energy may still differ.'),
        h(RenewablesGridPeriods,{React:React,uid:uid+'periods',pair:pair,state:view.periods,onChange:function(periods,minute){change(Object.assign({periods:periods},minute===undefined?{}:{minute:minute,chart:'unserved'}));},onInspect:inspect,onTimeline:function(periods,minute){change({periods:periods,minute:minute,chart:'unserved'});setTimeout(function(){var region=document.getElementById(uid+'timeline');if(region){region.scrollIntoView({block:'start'});region.focus({preventScroll:true});}},0);}}),
        h('p',{id:uid+'scroll',className:'rn-energy-muted'},'Scroll the chart and tables horizontally on small screens. With a keyboard, focus a region and use the arrow keys.'),
        h('div',{className:'rn-energy-toolbar'},[['unserved','Compare unmet demand'],['grid','Compare grid imports'],['stored','Compare stored energy']].map(function(item){return btn(item[1],function(){change({chart:item[0]});},{key:item[0],'aria-pressed':view.chart===item[0]});})),chart(),
        h('p',{className:'rn-energy-muted'},'Solid line: A. Dashed line: B. Curves overlap when values match. '+(study.settings.grid==='outage'?'Shading marks the recorded grid outage. ':'')+'The cursor selects a minute for both cases.'+(selectedPeriod?' The outlined band marks the selected change period.':'')),
        h('div',{className:'rn-energy-control'},h('label',{htmlFor:uid+'minute'},'Comparison minute',h('strong',null,view.minute+' min')),h('input',{id:uid+'minute',type:'range',min:0,max:pair.duration,step:1,value:view.minute,'aria-label':'Grid comparison minute','aria-valuetext':view.minute+' minutes',onChange:function(e){change({minute:Number(e.target.value)});}})),
        h('div',{className:'rn-energy-toolbar'},btn('Previous comparison minute',function(){change({minute:view.minute-1});},{disabled:view.minute===0}),btn('Next comparison minute',function(){change({minute:view.minute+1});},{disabled:view.minute===pair.duration}),btn('First unmet-demand difference',function(){change({minute:pair.summary.firstDifference});},{disabled:pair.summary.firstDifference===null}),btn('Largest unmet-demand reduction',function(){change({minute:pair.summary.largestReductionMinute});},{disabled:pair.summary.largestReductionMinute===null}),btn('Largest unmet-demand increase',function(){change({minute:pair.summary.largestIncreaseMinute});},{disabled:pair.summary.largestIncreaseMinute===null})),
        h('section',{className:'rn-outage-case','aria-label':'Selected comparison minute'},h('h4',null,'Minute '+view.minute+' · '+(view.chart==='stored'?'stored energy':view.chart==='grid'?'grid imports':'unmet demand')),
          h('div',{className:'rn-outage-case-metrics'},h('div',null,h('small',null,'Case A'),h('strong',null,fmt(row.a[view.chart])+' '+unit)),h('div',null,h('small',null,'Case B'),h('strong',null,fmt(row.b[view.chart])+' '+unit)),h('div',null,h('small',null,'B minus A'),h('strong',null,signed(row.delta[view.chart])+' '+unit))),
          h('p',null,view.minute===pair.duration?'Sequence endpoint: power is zero and no extra energy interval is added. Stored energy is the final boundary value.':'Values apply to minute '+view.minute+'–'+(view.minute+1)+'. Stored energy is measured at its start. Grid backup is '+(row.gridAvailable?'available.':'unavailable.')),
          h('div',{className:'rn-energy-toolbar'},btn('Inspect case A in 3D',function(){inspect('a');}),btn('Inspect case B in 3D',function(){inspect('b');})),
          h('details',null,h('summary',null,'Read all selected-minute values'),h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Selected minute A and B values','aria-describedby':uid+'scroll'},h('table',null,h('caption',null,'Power in kW; stored energy in kWh. Changes are B minus A.'),h('thead',null,h('tr',null,['Quantity','A','B','Change'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),h('tbody',null,[['Grid imports','grid'],['Unmet demand','unserved'],['Battery discharge','discharge'],['Battery charge','charge'],['Curtailed generation','curtailed'],['Connection-limit unmet demand','gridLimited'],['Grid-unavailable unmet demand','gridUnavailable'],['Stored energy','stored']].map(function(item){return h('tr',{key:item[1]},h('th',{scope:'row'},item[0]),h('td',null,fmt(row.a[item[1]])),h('td',null,fmt(row.b[item[1]])),h('td',null,signed(row.delta[item[1]])));})))))),
        h('details',null,h('summary',null,'Compare full-sequence energy totals'),h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Full-sequence A and B energy','aria-describedby':uid+'scroll'},h('table',null,h('caption',null,'All values are kWh. Changes are B minus A.'),h('thead',null,h('tr',null,['Energy','A','B','Change'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),h('tbody',null,[['Unserved demand','unserved'],['Grid imports','grid'],['Battery discharge','discharge'],['Battery charge','charge'],['Curtailed generation','curtailed'],['Battery losses','loss']].map(function(item){return h('tr',{key:item[1]},h('th',{scope:'row'},item[0]),h('td',null,fmt(pair.a.totals[item[1]])),h('td',null,fmt(pair.b.totals[item[1]])),h('td',null,signed(pair.deltaTotals[item[1]])));}))))),
        h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'Two-case observation',h('textarea',{id:uid+'note','aria-label':'Two-case observation',maxLength:3000,value:view.note,placeholder:'Where did B improve or worsen coverage? What happened to imports and stored energy?',onChange:function(e){change({note:e.target.value});}})),
        h('p',{className:'rn-energy-muted'},RN_GRID_PAIR_RULES)));
  }
  var RN_GRID_PAIR_CSS='\n.rn-grid-pair{margin:18px 0;padding:14px;border:1px solid var(--re-border);border-radius:10px}.rn-grid-pair-body{padding-top:16px}.rn-grid-pair .rn-energy-table{max-height:none}.rn-grid-pair .rn-energy-table table{min-width:600px}.rn-grid-pair-chart{overflow-x:auto}.rn-grid-pair-chart svg{display:block;width:100%;min-width:580px}.rn-grid-pair-chart:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-grid-pair h4{margin-top:0}.rn-grid-pair .rn-energy-toolbar{gap:8px;justify-content:flex-start}@media(max-width:600px){.rn-grid-pair{padding:10px}.rn-grid-pair .rn-outage-case{padding:10px}}\n';

  function RenewablesGridStudy(props){
    var React=props.React,h=React.createElement,state=props.state||{},uid=props.uid,config=rnGridStudyConfig(props.settings,state.config);
    var study=React.useMemo(function(){return state.request?rnGridStudy(state.request):null;},[JSON.stringify(state.request)]);
    var index=study?Math.floor(rnNumber(state.selected&&state.selected.index,0,0,study.samples.length-1)):0;
    var policy=RN_MICROGRID_POLICIES.find(function(p){return p.id===(state.selected&&state.selected.policy);})||RN_MICROGRID_POLICIES[0],sample=study&&study.samples[index],entry=sample&&sample.strategies.find(function(e){return e.policy===policy.id;});
    var candidate=sample&&rnGridStudyCase(study.settings,sample.power,policy.id),sameCandidate=state.inspected&&candidate&&JSON.stringify(props.settings)===JSON.stringify(candidate);
    var changed=study&&!sameCandidate&&JSON.stringify(props.settings)!==JSON.stringify(study.settings),pending=study&&JSON.stringify(config)!==JSON.stringify(study.config);
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumSignificantDigits:6});}
    function coverage(e){return e.coverage===null?'No demand':fmt(e.coverage)+'%';}
    function btn(label,fn,extra){return h('button',Object.assign({type:'button',onClick:fn},extra||{}),label);}
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function configure(patch){change({config:Object.assign({},config,patch)});}
    function number(label,key,min,max,step){return h('label',null,label,h('input',{type:'number',min:min,max:max,step:step,value:config[key],'aria-label':label,onChange:function(e){var p={};p[key]=Number(e.target.value);configure(p);}}));}
    function run(){change({open:true,config:config,request:{version:1,settings:rnMicrogridSettings(props.settings),config:config},selected:{index:0,policy:props.settings.policy},inspected:false,note:'',comparison:null});}
    function inspect(i,id){var row=study.samples[i],e=row.strategies.find(function(e){return e.policy===id;});props.onInspect(rnGridStudyCase(study.settings,row.power,id),{index:i,policy:id},e.firstUnserved===null?(e.gridSummary.peakRequestedMinute===null?0:e.gridSummary.peakRequestedMinute):e.firstUnserved);}
    function csv(){var url=URL.createObjectURL(new Blob([rnGridStudyCsv(study)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='renewables-grid-capacity.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);}
    function chart(){
      var low=study.samples[0].power,high=study.samples[study.samples.length-1].power,max=Math.max(0,Math.max.apply(null,study.samples.map(function(s){return Math.max.apply(null,s.strategies.map(function(e){return e.totals.unserved;}));}))),scale=max||1;
      function x(p){return high===low?340:54+(p-low)/(high-low)*572;}function y(v){return 170-v/scale*142;}
      return h(React.Fragment,null,h('div',{className:'rn-grid-study-chart',role:'region',tabIndex:0,'aria-label':'Grid capacity shortfall chart','aria-describedby':uid+'scroll'},h('svg',{viewBox:'0 0 660 210',role:'img','aria-labelledby':uid+'chartTitle '+uid+'chartDesc'},
        h('title',{id:uid+'chartTitle'},'Unserved energy at each tested grid rating'),h('desc',{id:uid+'chartDesc'},'Horizontal axis: grid import rating in kW. Vertical axis: unserved energy in kWh. Solid line: Fixed reserve. Long dashes: Release during outages. Dots: Save for outages. Exact results are in the comparison below.'),
        [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:54,x2:626,y1:y(f*scale),y2:y(f*scale),stroke:'var(--re-border)'}),h('text',{x:49,y:y(f*scale)+4,textAnchor:'end',fill:'var(--re-muted)',fontSize:11},fmt(f*scale)));}),
        h('text',{x:54,y:15,fill:'var(--re-muted)',fontSize:11},'Unserved energy (kWh)'),
        (low===high?[low]:[low,(low+high)/2,high]).map(function(p,i){return h('text',{key:i,x:x(p),y:187,textAnchor:p===low&&low!==high?'start':p===high&&low!==high?'end':'middle',fill:'var(--re-muted)',fontSize:11},fmt(p)+' kW');}),
        RN_MICROGRID_POLICIES.map(function(p,j){var color=['var(--re-accent)','var(--re-text)','var(--mg-gap)'][j];return h('g',{key:p.id},h('polyline',{'data-grid-study-series':p.id,points:study.samples.map(function(s){return x(s.power)+','+y(s.strategies[j].totals.unserved);}).join(' '),fill:'none',stroke:color,strokeWidth:2.5,strokeDasharray:['','9 4','2 5'][j]}),study.samples.map(function(s){return h('circle',{key:s.index,cx:x(s.power),cy:y(s.strategies[j].totals.unserved),r:2.5,fill:color});}));}))),
        h('p',{className:'rn-energy-muted'},'Solid: Fixed reserve. Long dashes: Release during outages. Dots: Save for outages. Curves overlap when strategies give the same result. Lines connect tested ratings; values between points were not simulated.'));
    }
    return h('details',{id:uid,className:'rn-energy-panel rn-outage-study rn-grid-study',tabIndex:-1,'aria-label':'Grid capacity experiment',open:state.open===true,onToggle:function(e){if(e.currentTarget.open!==(state.open===true))change({open:e.currentTarget.open});}},
      h('summary',null,'Grid capacity experiment'),h('div',{className:'rn-grid-study-body'},
      h('h3',null,'How does grid capacity change the outcome?'),h('p',null,'Test connection ratings under every battery strategy using the same recorded system. Each run starts with the same stored energy and replays the whole sequence.'),
      h('div',{className:'rn-grid-study-controls'},number('Minimum tested grid rating (kW)','min',0,config.max,'any'),number('Maximum tested grid rating (kW)','max',config.min,1000000,'any'),number('Demand served target (%)','target',0,100,'any'),
        h('label',null,'Grid rating samples',h('select',{'aria-label':'Grid rating samples',value:config.count,onChange:function(e){configure({count:Number(e.target.value)});}},[5,9,17].map(function(n){return h('option',{key:n,value:n},n+' ratings × 3 strategies');})))),
      h('div',{className:'rn-energy-toolbar'},btn(study?'Run grid capacity experiment again':'Run grid capacity experiment',run,{'aria-label':'Run grid capacity experiment'}),study&&btn('Export grid capacity CSV',csv)),
      h('p',{className:'rn-energy-muted'},'Demand served includes grid imports. The target measures energy over the full sequence; a passing case may still have brief shortfalls. Equal range endpoints test one rating.'),
      changed&&h('p',{className:'rn-outage-notice',role:'status'},'System inputs changed. This grid experiment retains its recorded conditions. Run again to test the current system.'),
      pending&&h('p',{className:'rn-outage-notice',role:'status'},'Experiment setup changed. Run again to apply the new range, sample count, or target.'),
      study&&h('div',{'aria-label':'Grid capacity experiment results'},
        h('p',{role:'status'},study.samples.length+' tested ratings × 3 strategies · '+study.duration+' minutes · '+fmt(study.config.target)+'% demand served target.'),
        study.baseline.coverage===null&&h('p',null,'No demand in this recorded sequence. Coverage and targets are not evaluated.'),
        study.settings.grid==='island'&&h('p',null,'The recorded system is islanded. Grid ratings have no effect while grid backup is unavailable.'),
        h('div',{className:'rn-outage-summary'},study.strategies.map(function(p){return h('article',{key:p.policy},h('h3',null,p.name),h('strong',null,study.baseline.coverage===null?'Not evaluated':p.lowestPassingPower===null?'No tested rating':fmt(p.lowestPassingPower)+' kW'),h('p',null,'lowest tested rating meeting the target'),h('small',null,p.passing+' of '+study.samples.length+' ratings pass'),p.lowestPassingIndex!==null&&btn('Inspect lowest passing rating',function(){inspect(p.lowestPassingIndex,p.policy);},{'aria-label':'Inspect lowest passing grid rating for '+p.name}));})),
        h('p',null,'Recorded baseline: '+coverage(study.baseline)+' demand served · '+fmt(study.baseline.totals.grid)+' kWh imported · '+fmt(study.baseline.totals.unserved)+' kWh unserved. The baseline retains its original strategy and connection setting.'),
        h('p',{id:uid+'scroll',className:'rn-energy-muted'},'Scroll the chart horizontally on small screens and scroll the comparison to see all ratings and strategies. With a keyboard, focus each region and use the arrow keys.'),chart(),
        h('p',null,'Choose a case to restore its recorded conditions and inspect its first unmet-demand minute in 3D. Fully served cases open at their peak import request, or minute zero when no imports are requested.'),
        h('div',{className:'rn-outage-matrix',role:'region',tabIndex:0,'aria-label':'Grid ratings and battery strategies','aria-describedby':uid+'scroll'},h('table',null,
          h('caption',null,'Whole-system import capacity. Each cell shows demand served and unserved energy over the full sequence.'),h('thead',null,h('tr',null,h('th',{scope:'col'},'Grid rating'),RN_MICROGRID_POLICIES.map(function(p){return h('th',{key:p.id,scope:'col'},p.name);}))),
          h('tbody',null,study.samples.map(function(row){return h('tr',{key:row.index},h('th',{scope:'row'},fmt(row.power)+' kW'),row.strategies.map(function(e){var name=RN_MICROGRID_POLICIES.find(function(p){return p.id===e.policy;}).name;return h('td',{key:e.policy},btn(h(React.Fragment,null,h('strong',null,coverage(e)),h('span',null,fmt(e.totals.unserved)+' kWh unserved'),h('span',null,e.meetsTarget===null?'Not evaluated':e.meetsTarget?'Target met':'Below target')),function(){inspect(row.index,e.policy);},{'aria-label':'Inspect grid rating '+fmt(row.power)+' kW with '+name,'data-outage-status':e.meetsTarget===null?'empty':e.meetsTarget?'covered':'gap','data-selected-case':state.inspected&&index===row.index&&policy.id===e.policy?'true':undefined,'aria-current':state.inspected&&index===row.index&&policy.id===e.policy?'true':undefined}));}));})))),
        h('section',{className:'rn-outage-case','aria-label':'Selected grid capacity case'},h('h3',null,fmt(sample.power)+' kW · '+policy.name),h('p',null,sameCandidate?'This recorded case is open in the simulation.':'Inspect this recorded case to open its simulation.'),
          h('div',{className:'rn-outage-case-metrics'},h('div',null,h('small',null,'Demand served'),h('strong',null,coverage(entry))),h('div',null,h('small',null,'Grid imports'),h('strong',null,fmt(entry.totals.grid)+' kWh')),h('div',null,h('small',null,'Unserved demand'),h('strong',null,fmt(entry.totals.unserved)+' kWh'))),
          h('p',null,'Unserved energy: '+fmt(entry.totals.gridLimited)+' kWh from the connection limit + '+fmt(entry.totals.gridUnavailable)+' kWh while the grid is unavailable.'),
          h('p',null,'Battery discharge: '+fmt(entry.totals.discharge)+' kWh. Initial storage: '+fmt(entry.initialStored)+' kWh. Final storage: '+fmt(entry.endStored)+' kWh. Peak imports: '+fmt(entry.gridSummary.peakImport)+' kW.'),
          h('p',null,entry.firstUnserved===null?'No unmet-demand interval.':entry.unservedMinutes+' unmet-demand intervals; first at minute '+entry.firstUnserved+'.'),
          h('div',{className:'rn-energy-toolbar'},btn('Inspect selected grid case in 3D',function(){inspect(index,policy.id);}),btn('Restore grid experiment baseline',function(){props.onRestore(study.settings);}),btn('Compare selected grid case',function(){change({comparison:Object.assign({},state.comparison,{open:true,b:index+':'+policy.id,periods:Object.assign({},state.comparison&&state.comparison.periods,{selected:null,page:0})})});setTimeout(function(){var panel=document.getElementById(uid+'pair');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}},0);}))),
        h(RenewablesGridPair,{React:React,uid:uid+'pair',study:study,state:state.comparison,onChange:function(value){change({comparison:value});},onInspect:props.onInspect}),
        h('details',null,h('summary',null,'Review grid experiment conditions'),h(RenewablesGridConditions,{React:React,settings:study.settings}),h(RenewablesDemandConditions,{React:React,settings:study.settings}),h(RenewablesCompanionConditions,{React:React,settings:study.settings}),
          h('p',null,rnEnergySpec(study.settings.source).name+' · '+study.settings.sourceUnits+' unit(s) · '+(rnEnergyProgram(study.settings.source,study.settings.profileId)||{name:'Steady resource'}).name+' · '+fmt(study.settings.demand)+' kW base demand · '+RN_MICROGRID_LOADS.find(function(p){return p.id===study.settings.loadId;}).name),
          h('p',null,'Grid: '+study.settings.grid+(study.settings.grid==='outage'?' · outage '+study.settings.outageStart+'–'+(study.settings.outageStart+study.settings.outageMinutes)+' min':'')+'. Battery: '+study.settings.batteryUnits+' unit(s), '+fmt(study.settings.battery.capacity)+' kWh and '+fmt(study.settings.battery.power)+' kW per unit, '+fmt(study.settings.battery.initial)+'% initial charge, '+fmt(study.settings.battery.roundtrip)+'% round-trip efficiency. Reserve: '+fmt(study.settings.reserve)+'%.'),
          h('dl',{className:'rn-outage-inputs'},rnEnergySpec(study.settings.source).controls.map(function(c){return h('div',{key:c[0]},h('dt',null,c[1]),h('dd',null,fmt(study.settings.sourceSettings[c[0]])+' '+c[6]));}))),
        h('label',{className:'rn-outage-note',htmlFor:uid+'note'},'Grid capacity observation',h('textarea',{id:uid+'note','aria-label':'Grid capacity observation',value:typeof state.note==='string'?state.note:'',maxLength:3000,placeholder:'Which tested rating met the target? What trade-off did the battery strategy introduce?',onChange:function(e){change({note:e.target.value});}}))),
      h('p',{className:'rn-energy-muted'},RN_GRID_STUDY_RULES)));
  }
  var RN_GRID_STUDY_CSS='\n.rn-grid-study-body{padding-top:16px}.rn-grid-study-controls{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.rn-grid-study-controls label{font-size:12px}.rn-grid-study-controls input,.rn-grid-study-controls select{display:block;width:100%;min-height:40px;margin-top:6px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-grid-study-controls :is(input,select):focus-visible,.rn-grid-study-chart:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-grid-study-chart{overflow-x:auto}.rn-grid-study-chart svg{display:block;min-width:560px;width:100%}.rn-grid-study .rn-outage-matrix{max-height:650px}.rn-grid-study .rn-outage-matrix table{min-width:680px}.rn-grid-study p{font-size:12px}.rn-grid-study button[data-selected-case=true] :is(strong,span){color:var(--re-text)}@media(max-width:600px){.rn-grid-study-controls{grid-template-columns:1fr}.rn-grid-study .rn-energy-toolbar button{width:100%}}\n';

  function RenewablesGridConditions(props){
    var f=props.settings.gridLimit||rnMicrogridGridLimit();
    return props.React.createElement('p',null,'Recorded grid import limit: '+(f.enabled?f.power.toLocaleString()+' kW while the grid is available.':'off; unlimited while the grid is available.'));
  }
  function RenewablesGridReview(props){
    var h=props.React.createElement,r=props.result,s=r.settings,g=r.gridSummary,u=props.unlimited;
    function fmt(value){return Number(value).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,action,extra){return h('button',Object.assign({type:'button',onClick:action},extra||{}),label);}
    return h('details',{id:props.uid,className:'rn-energy-panel rn-grid-review',tabIndex:-1,'aria-label':'Grid connection review',open:props.open===true,onToggle:function(e){if(e.currentTarget.open!==(props.open===true))props.onToggle(e.currentTarget.open);}},
      h('summary',null,'Grid connection review'),
      h('div',{'aria-label':'Grid connection results'},
        h('h3',null,'Can the connection cover the remaining demand?'),
        h('p',null,s.grid==='island'?'This system is islanded: grid imports are zero. A configured import limit is retained for when grid backup is available.':s.gridLimit.enabled?'The connection can import up to '+fmt(s.gridLimit.power)+' kW while the grid is available.':'Grid imports are unlimited while the grid is available in this teaching model.'),
        h('div',{className:'rn-energy-scenario-metrics'},
          h('div',null,h('small',null,'Peak grid import'),h('strong',null,fmt(g.peakImport)+' kW'),h('small',null,'Peak request while available: '+fmt(g.peakRequested)+' kW')),
          h('div',null,h('small',null,'Unserved: connection limit'),h('strong',null,fmt(r.totals.gridLimited)+' kWh'),h('small',null,g.limitedMinutes+' minute intervals limited')),
          h('div',null,h('small',null,'Unserved: grid unavailable'),h('strong',null,fmt(r.totals.gridUnavailable)+' kWh'),h('small',null,'Outage or islanded operation'))),
        h('p',null,'Total unserved demand: '+fmt(r.totals.unserved)+' kWh = '+fmt(r.totals.gridLimited)+' from the connection limit + '+fmt(r.totals.gridUnavailable)+' while grid backup is unavailable.'),
        s.policy==='backup'&&s.gridLimit.enabled&&h('p',{className:'rn-outage-notice'},'Save for outages holds the battery while the grid is available, even if the connection limit leaves demand unmet. A zero import limit does not trigger outage dispatch.'),
        u&&h(props.React.Fragment,null,h('h4',null,'Same system with unlimited grid imports'),
          h('p',{className:'rn-energy-muted'},'Only the import limit is disabled. Both replays keep the same generators, demand schedule, battery, initial charge, grid outages, and dispatch strategy.'),
          h('p',{id:props.uid+'scroll',className:'rn-energy-muted rn-grid-scroll-hint'},'Scroll the comparison horizontally to see both results. With a keyboard, focus the table and use the arrow keys.'),
          h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Limited and unlimited grid comparison','aria-describedby':props.uid+'scroll'},h('table',null,
            h('caption',null,'Full '+r.duration+'-minute sequence. All values are kWh; outages apply in both runs.'),
            h('thead',null,h('tr',null,['Energy','Limited connection','Unlimited connection'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),
            h('tbody',null,[['Grid imports','grid'],['Unserved demand','unserved'],['Battery discharge','discharge']].map(function(item){return h('tr',{key:item[1]},h('th',{scope:'row'},item[0]),h('td',null,fmt(r.totals[item[1]])),h('td',null,fmt(u.totals[item[1]])));})))),
          h('p',{className:'rn-energy-muted'},'Final storage: '+fmt(r.endStored)+' kWh with the limit and '+fmt(u.endStored)+' kWh without it. Battery dispatch responds to demand and grid availability; the import limit does not automatically change the battery strategy.')),
        h('div',{className:'rn-energy-toolbar'},
          btn('Inspect first connection shortfall in 3D',function(){props.onInspect(g.firstLimited);},{disabled:g.firstLimited===null}),
          btn('Inspect peak import request in 3D',function(){props.onInspect(g.peakRequestedMinute);},{disabled:g.peakRequestedMinute===null}),
          btn('Open grid import chart',props.onChart),btn('Compare connection ratings',props.onStudy)),
        h('label',{className:'rn-outage-note',htmlFor:props.uid+'note'},'Grid connection observation',h('textarea',{id:props.uid+'note','aria-label':'Grid connection observation',maxLength:3000,value:typeof props.note==='string'?props.note:'',placeholder:'Did the connection, grid outage, or battery strategy leave demand unmet?',onChange:function(e){props.onNote(e.target.value);}})),
        h('p',{className:'rn-energy-muted'},RN_GRID_LIMIT_RULES)));
  }
  var RN_GRID_LIMIT_CSS='\n.rn-grid-limit-controls{min-width:0;margin:14px 0;padding:12px;border:1px solid var(--re-border);border-radius:8px}.rn-grid-limit-controls legend{font-size:12px;font-weight:650}.rn-grid-limit-controls .rn-grid-limit-toggle{display:flex;align-items:center;gap:8px;min-height:40px;font-size:12px}.rn-grid-limit-toggle input{width:18px;height:18px;accent-color:var(--re-accent)}.rn-grid-limit-controls label{display:block;font-size:12px}.rn-grid-review>div{padding-top:16px}.rn-grid-review .rn-energy-table{max-height:none}.rn-grid-scroll-hint{display:none}.rn-grid-review p{font-size:12px}.rn-grid-review h4{margin:18px 0 6px}@media(max-width:600px){.rn-grid-scroll-hint{display:block}.rn-grid-review .rn-energy-toolbar button{width:100%}}\n';

  function RenewablesMicrogridLab(props){
    var React=props.ctx.React,h=React.createElement,T=props.theme,state=props.state||{},s=rnMicrogridSettings(state),uid=React.useId().replace(/:/g,'')+'grid';
    var result=React.useMemo(function(){return rnMicrogridRun(s);},[JSON.stringify(s)]),minute=Math.floor(rnNumber(state.minute,0,0,result.duration)),row=result.rows[minute],spec=rnEnergySpec(s.source),companionSpec=rnEnergySpec(s.companion.source);
    var gapAnalysis=React.useMemo(function(){return rnSupplyGapAnalysis(result);},[result]),gapView=rnSupplyGapView(gapAnalysis,state.gapExplorer);
    var unlimitedGrid=React.useMemo(function(){return s.gridLimit.enabled?rnMicrogridRun(Object.assign({},s,{gridLimit:Object.assign({},s.gridLimit,{enabled:false})})):null;},[JSON.stringify(s)]);
    var primaryOnly=React.useMemo(function(){return s.companion.enabled?rnMicrogridRun(Object.assign({},s,{companion:Object.assign({},s.companion,{enabled:false})})):null;},[JSON.stringify(s)]);
    var originalDemand=React.useMemo(function(){return s.flex.enabled?rnMicrogridRun(Object.assign({},s,{flex:Object.assign({},s.flex,{enabled:false})})):null;},[JSON.stringify(s)]);
    var playingPair=React.useState(false),playing=playingPair[0],partPair=React.useState('converter'),scene=['source','battery','flow','companion'].indexOf(state.scene)>=0&&(state.scene!=='companion'||s.companion.enabled)?state.scene:'source',chartMode=state.chart==='grid'?'grid':state.chart==='battery'?'battery':state.chart==='demand'?'demand':state.chart==='sources'&&s.companion.enabled?'sources':'power',live=React.useRef(null);
    live.current={state:state,props:props,minute:minute,duration:result.duration};
    React.useEffect(function(){if(!playing)return;var timer=setInterval(function(){if(document.hidden)return;var p=live.current;if(p.minute>=p.duration){playingPair[1](false);return;}p.props.onChange(Object.assign({},p.state,{minute:Math.min(p.duration,p.minute+Math.max(1,Math.round(p.duration/120)))}));},200);return function(){clearInterval(timer);};},[playing]);
    function change(patch){playingPair[1](false);props.onChange(Object.assign({},state,s,patch));}
    function fmt(v){return Number(v).toLocaleString(undefined,{maximumFractionDigits:2});}
    function btn(label,action,extra){return h('button',Object.assign({type:'button',onClick:action},extra||{}),label);}
    function select(label,value,options,action){return h('label',null,label,h('select',{'aria-label':label,value:value,onChange:function(e){action(e.target.value);}},options.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})));}
    function slider(label,value,min,max,step,unit,action){return h('div',{className:'rn-energy-control',key:label},h('label',{htmlFor:uid+label.replace(/[^a-zA-Z0-9]/g,'')},label,h('strong',null,fmt(value)+' '+unit)),h('input',{id:uid+label.replace(/[^a-zA-Z0-9]/g,''),type:'range','aria-label':label,'aria-valuetext':fmt(value)+' '+unit,min:min,max:max,step:step,value:value,onChange:function(e){action(Number(e.target.value));}}));}
    function time(value){change({minute:Math.min(result.duration,Math.max(0,value))});}
    function copySource(source,resetLoad){
      var inputs=rnEnergySettings(source,props.workbenches.settings&&props.workbenches.settings[source]),profileId=props.workbenches.scenarios&&props.workbenches.scenarios[source]&&props.workbenches.scenarios[source].profileId||'steady';
      var patch={source:source,sourceSettings:inputs,profileId:profileId,minute:0};
      if(resetLoad){patch.sourceUnits=1;patch.demand=rnMicrogridSettings(patch).demand;}change(patch);
    }
    function companionChange(patch){change({companion:Object.assign({},s.companion,patch)});}
    function copyCompanion(source){companionChange({source:source,sourceSettings:rnEnergySettings(source,props.workbenches.settings&&props.workbenches.settings[source]),profileId:props.workbenches.scenarios&&props.workbenches.scenarios[source]&&props.workbenches.scenarios[source].profileId||'steady',offset:0});}
    function preset(kind){
      var setup={source:'solarPv',sourceSettings:rnEnergySettings('solarPv',{}),sourceUnits:1,companion:{enabled:false},flex:{enabled:false},gridLimit:{enabled:false},gridReviewOpen:false,battery:rnEnergySettings('storage',{}),batteryUnits:1,reserve:0,policy:'fixed',demand:2,minute:0,grid:'island',profileId:kind==='evening'?'daylight':'clouds',loadId:kind==='evening'?'evening':'flat'};
      if(kind==='outage'){setup.profileId='steady';setup.loadId='pulse';setup.grid='outage';setup.outageStart=84;setup.outageMinutes=72;}
      if(kind==='hybrid'){setup.companion={enabled:true,source:'wind',sourceSettings:{radius:10,speed:4,cp:40,rating:500},profileId:'lull',sourceUnits:1,offset:45};setup.demand=3;setup.battery={capacity:10,power:5,initial:0,roundtrip:88};setup.scene='companion';setup.chart='sources';}
      if(kind==='flex'){setup.profileId='daylight';setup.loadId='evening';setup.demand=2;setup.batteryUnits=0;setup.flex={enabled:true,percent:75,fromStart:540,fromMinutes:180,toStart:240,toMinutes:180};setup.chart='demand';setup.scene='source';}
      if(kind==='gaps'||kind==='gridlimit'){setup.profileId='steady';setup.sourceSettings.irradiance=0;setup.demand=8;setup.loadId='flat';setup.battery={capacity:10,power:5,initial:100,roundtrip:100};setup.reserve=20;setup.grid='outage';setup.outageStart=90;setup.outageMinutes=60;setup.scene='battery';setup.chart='battery';setup.gapExplorer=Object.assign({},state.gapExplorer,{scope:'local',sort:'energy',page:0,selected:null});}
      if(kind==='gridlimit'){setup.grid='connected';setup.gridLimit={enabled:true,power:2};setup.chart='grid';setup.gridReviewOpen=true;}
      change(setup);
      if(kind==='gridlimit')setTimeout(function(){var panel=document.getElementById(uid+'gridReview');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}},0);
      if(kind==='gaps')setTimeout(function(){var panel=document.getElementById(uid+'gapExplorer');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}},0);
    }
    function download(csv){
      var content,type,name;
      if(csv){
        var keys=['minute','generation','demand','direct','charge','discharge','grid','unserved','curtailed','stored','reserve','gridAvailable','primaryGeneration','companionGeneration','baselineDemand','shiftedOut','shiftedIn','gridRequested','gridLimited','gridUnavailable','gridCapacity','gridHeadroom'];
        content=[keys.map(function(k){return k==='minute'?'minute':k==='stored'||k==='reserve'?k+'_kWh':k==='gridAvailable'?k:k+'_kW';}).join(',')].concat(result.rows.map(function(r){return keys.map(function(k){return r[k]===null?'':String(r[k]);}).join(',');})).join('\r\n');
        type='text/csv;charset=utf-8';name='renewables-storage-demand.csv';
      }else{content=JSON.stringify({title:'Renewables Lab: storage and demand',modelVersion:5,selectedMinute:minute,result:result,observation:typeof state.note==='string'?state.note.slice(0,3000):'',assumptions:RN_MICROGRID_ASSUMPTIONS,sourceFormula:spec.formula,sourceLimits:spec.limits,sourceReference:spec.source,companionReference:s.companion.enabled?companionSpec.source:null,companionFormula:s.companion.enabled?companionSpec.formula:null,companionLimits:s.companion.enabled?companionSpec.limits:null,hybridTiming:RN_HYBRID_TIMING,gridConnection:{rules:RN_GRID_LIMIT_RULES,observation:typeof state.gridNote==='string'?state.gridNote.slice(0,3000):'',unlimitedComparison:unlimitedGrid?{settings:unlimitedGrid.settings,totals:unlimitedGrid.totals,endStored:unlimitedGrid.endStored,gridSummary:unlimitedGrid.gridSummary}:null},gridCapacityStudy:state.gridStudy&&state.gridStudy.request?{result:rnGridStudy(state.gridStudy.request),comparison:state.gridStudy.comparison?rnGridPair(rnGridStudySetup(state.gridStudy.request),state.gridStudy.comparison):null,observation:typeof state.gridStudy.note==='string'?state.gridStudy.note.slice(0,3000):''}:null,supplyGaps:{result:gapAnalysis,view:{scope:gapView.scope,sort:gapView.sort,selected:gapView.selected?gapView.selected.key:null},observation:gapView.note},demandShiftRules:RN_DEMAND_SHIFT_RULES,demandShiftObservation:typeof state.flexNote==='string'?state.flexNote.slice(0,3000):'',originalDemandComparison:originalDemand?{settings:originalDemand.settings,totals:originalDemand.totals,endStored:originalDemand.endStored,demandSchedule:originalDemand.demandSchedule}:null,primaryOnlyComparison:primaryOnly?{settings:primaryOnly.settings,totals:primaryOnly.totals,endStored:primaryOnly.endStored}:null,batteryDesignStudy:state.designStudy&&state.designStudy.request?{result:rnBatteryDesignStudy(state.designStudy.request),observation:typeof state.designStudy.note==='string'?state.designStudy.note.slice(0,3000):''}:null,outageStudy:state.outageStudy&&state.outageStudy.request?{result:rnOutageStudy(state.outageStudy.request),observation:typeof state.outageStudy.note==='string'?state.outageStudy.note.slice(0,3000):''}:null},null,2);type='application/json';name='renewables-storage-demand.json';}
      var url=URL.createObjectURL(new Blob([content],{type:type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
    }
    function chart(){
      var w=820,ht=270,l=72,r=20,t=25,b=50;
      var max=chartMode==='battery'?Math.max(1,result.capacity):chartMode==='demand'?Math.max(1,result.demandSchedule.baselinePeak,result.demandSchedule.scheduledPeak):Math.max(1,Math.max.apply(null,result.rows.map(function(v){return Math.max(v.generation,v.demand);})));
      if(chartMode==='grid')max=Math.max(1,Math.max.apply(null,result.rows.map(function(v){return Math.max(v.gridRequested,v.grid,v.gridCapacity||0);})));
      function x(v){return l+v/result.duration*(w-l-r);}function y(v){return ht-b-v/max*(ht-t-b);}
      var series=chartMode==='grid'?[['grid','var(--re-accent)',''],['gridRequested','var(--re-text)','8 4']].concat(s.gridLimit.enabled?[['gridCapacity','var(--mg-gap)','2 5']]:[]):chartMode==='battery'?[['stored','var(--re-accent)','']]:chartMode==='demand'?[['baselineDemand','var(--re-text)','8 4'],['demand','var(--re-accent)','']]:chartMode==='sources'?[['generation','var(--re-text)',''],['primaryGeneration','var(--re-accent)','8 4'],['companionGeneration','var(--mg-gap)','2 4']]:[['generation','var(--re-accent)',''],['demand','var(--re-text)','7 4'],['unserved','var(--mg-gap)','3 3']];
      return h('div',{className:'rn-energy-chart-scroll',role:'region',tabIndex:0,'aria-label':'Storage and demand chart'},h('svg',{viewBox:'0 0 '+w+' '+ht,role:'img','aria-label':chartMode==='grid'?'Actual and requested grid imports, with available import capacity when limited. Exact values are in the minute table.':chartMode==='battery'?'Stored battery energy and reserve through the sequence. Exact values are in the minute table.':chartMode==='demand'?'Original and scheduled demand through the sequence. Exact values are in the minute table.':chartMode==='sources'?'Primary, second-source, and total generation. Exact values are in the minute table.':'Generation, demand, and unmet demand through the sequence. Exact values are in the minute table.'},
        s.grid==='outage'&&chartMode!=='demand'&&h('rect',{x:x(s.outageStart),y:t,width:x(s.outageStart+s.outageMinutes)-x(s.outageStart),height:ht-b-t,fill:'var(--mg-gap)',opacity:.08}),
        chartMode==='demand'&&s.flex.enabled&&h('rect',{x:x(s.flex.fromStart),y:t,width:x(s.flex.fromStart+s.flex.fromMinutes)-x(s.flex.fromStart),height:ht-b-t,fill:'var(--mg-gap)',opacity:.1}),
        chartMode==='demand'&&s.flex.enabled&&h('rect',{x:x(s.flex.toStart),y:t,width:x(s.flex.toStart+s.flex.toMinutes)-x(s.flex.toStart),height:ht-b-t,fill:'var(--re-accent)',opacity:.1}),
        [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:l,x2:w-r,y1:y(max*f),y2:y(max*f),stroke:'var(--re-border)',strokeDasharray:'3 5'}),h('text',{x:l-9,y:y(max*f)+4,textAnchor:'end',fill:'var(--re-muted)',fontSize:12},fmt(max*f)));}),
        series.map(function(v){return h('polyline',{key:v[0],'data-series':v[0],points:result.rows.filter(function(r){return chartMode==='battery'||r.minute<result.duration;}).map(function(r){var point=x(r.minute)+','+y(r[v[0]]);return v[0]==='gridCapacity'?point+' '+x(r.minute+1)+','+y(r[v[0]]):point;}).join(' '),fill:'none',stroke:v[1],strokeWidth:2.5,strokeDasharray:v[2]});}),
        chartMode==='battery'&&h('polyline',{points:result.rows.map(function(r,i){var next=result.rows[i+1];return x(r.minute)+','+y(r.reserve)+(next?' '+x(next.minute)+','+y(r.reserve):'');}).join(' '),fill:'none',stroke:'var(--re-text)',strokeDasharray:'6 4'}),
        h('line',{x1:x(minute),x2:x(minute),y1:t,y2:ht-b,stroke:'var(--re-muted)',strokeDasharray:'5 4'}),
        [0,.25,.5,.75,1].map(function(f){return h('text',{key:f,x:x(result.duration*f),y:ht-b+22,textAnchor:f===0?'start':f===1?'end':'middle',fill:'var(--re-muted)',fontSize:12},Math.round(result.duration*f)+' min');}),
        h('text',{x:14,y:15,fill:'var(--re-muted)',fontSize:12},chartMode==='battery'?'kWh':'kW')));
    }
    var table=React.useMemo(function(){return h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Minute-by-minute microgrid data'},h('table',null,h('caption',null,'Power is averaged over the following minute. Stored energy is measured at the start of each minute. Final endpoint powers are zero.'),
      h('thead',null,h('tr',null,['Minute','Generation kW','Demand kW','Direct kW','Charge kW','Discharge kW','Grid kW','Unserved kW','Curtailed kW','Stored kWh','Discharge floor kWh','Grid available','Primary generation kW','Second generation kW','Original demand kW','Shifted out kW','Shifted in kW','Requested grid kW','Connection-limit unserved kW','Grid-unavailable unserved kW','Grid capacity kW','Unused grid capacity kW'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
      h('tbody',null,result.rows.map(function(r){return h('tr',{key:r.minute},h('th',{scope:'row'},r.minute),['generation','demand','direct','charge','discharge','grid','unserved','curtailed','stored','reserve'].map(function(k){return h('td',{key:k},fmt(r[k]));}),h('td',null,r.gridAvailable?'Yes':'No'),h('td',null,fmt(r.primaryGeneration)),h('td',null,fmt(r.companionGeneration)),h('td',null,fmt(r.baselineDemand)),h('td',null,fmt(r.shiftedOut)),h('td',null,fmt(r.shiftedIn)),['gridRequested','gridLimited','gridUnavailable','gridCapacity','gridHeadroom'].map(function(k){return h('td',{key:k},r[k]===null?'Unlimited':fmt(r[k]));}));}))));},[result]);
    var batteryParts=[['resource','Surplus generation','Only generation left over after serving demand can charge this battery. Grid imports never charge it.'],['converter','Battery bank','Stored energy changes with accepted charging, delivered electricity, and conversion losses. The selected strategy sets the discharge floor; it may protect stored energy while the grid is available and release it during an outage.'],['generator','Battery inverter','The inverter supplies deficits within its power rating and usable stored energy. Grid backup, when available, supplies any remaining deficit up to its configured import limit.']];
    var parts=scene==='battery'?batteryParts:scene==='companion'?companionSpec.components:spec.components,part=parts.find(function(p){return p[0]===partPair[0];})||parts[1];
    return h('section',{className:'rn-energy-lab rn-microgrid','aria-label':'Storage and demand lab',style:{'--re-bg':T.bg,'--re-card':T.card,'--re-alt':T.cardAlt,'--re-text':T.text,'--re-muted':T.muted,'--re-border':T.border,'--re-accent':T.accentHi,'--mg-gap':props.ctx.isDark?'#ffbc88':'#a13710'}},
      h('style',null,RN_ENERGY_CSS+RN_MICROGRID_CSS+RN_OUTAGE_STUDY_CSS+RN_BATTERY_DESIGN_CSS+RN_DEMAND_SHIFT_CSS+RN_SUPPLY_GAP_CSS+RN_GRID_STUDY_CSS+RN_GRID_PAIR_CSS+RN_GRID_PERIOD_CSS+RN_GRID_LIMIT_CSS),
      h('div',{className:'rn-energy-top'},h('div',null,h('div',{className:'rn-energy-kicker'},'Renewables Lab / local energy systems'),h('h2',null,'Storage & demand lab')),h('div',{className:'rn-energy-toolbar'},btn('Grid connection review',function(){change({gridReviewOpen:true});setTimeout(function(){var panel=document.getElementById(uid+'gridReview');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}},0);}),btn('Supply gap explorer',function(){var panel=document.getElementById(uid+'gapExplorer');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}),btn('Demand shifting',function(){var panel=document.getElementById(uid+'flexLab');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}),btn('Battery design bench',function(){var panel=document.getElementById(uid+'designStudy');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}),btn('Outage timing study',function(){var panel=document.getElementById(uid+'outageStudy');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}),btn('← 3D workbenches',props.onBack),btn('Lab library',props.onLibrary))),
      h('p',{className:'rn-energy-muted'},'Connect up to two renewable sources to a load and a battery bank. Follow each minute of generation, storage, grid backup, and unmet demand.'),
      h('div',{className:'rn-energy-toolbar rn-mg-presets','aria-label':'Starter systems'},h('strong',null,'Try a system'),btn('Clouds and a battery',function(){preset('clouds');}),btn('Rising demand later',function(){preset('evening');}),btn('A grid outage',function(){preset('outage');}),btn('Solar + wind',function(){preset('hybrid');}),btn('Shift demand into daylight',function(){preset('flex');}),btn('Explain a supply gap',function(){preset('gaps');}),btn('Limited grid backup',function(){preset('gridlimit');})),
      h('div',{className:'rn-mg-layout'},
        h('div',null,
          h('section',{className:'rn-energy-panel rn-mg-form','aria-label':'Generation setup'},h('h3',null,'1. Generation'),
            select('Generation technology',s.source,RN_ENERGY_SPECS.filter(function(c){return c.id!=='storage';}).map(function(c){return [c.id,c.name];}),function(v){copySource(v,true);}),
            select('Generation operating scenario',s.profileId,[['steady','Steady resource for four hours']].concat(RN_ENERGY_PROGRAMS[s.source].map(function(p){return [p.id,p.name+' · '+p.duration+' min'];})),function(v){change({profileId:v,minute:0});}),
            slider('Generation units',s.sourceUnits,1,50,1,'units',function(v){change({sourceUnits:v});}),
            h('div',{className:'rn-energy-toolbar'},btn('Copy source workbench settings',function(){copySource(s.source,false);}),btn('Open source workbench',function(){props.onSource(s.source);})),
            h('details',null,h('summary',null,'Adjust source inputs'),spec.controls.map(function(c){return slider(c[1],s.sourceSettings[c[0]],c[2],c[3],c[4],c[6],function(v){var inputs=Object.assign({},s.sourceSettings);inputs[c[0]]=v;change({sourceSettings:inputs});});})),
            h('p',{className:'rn-energy-muted'},'Copies are independent of your workbench experiments. Changing technology also resets demand to a starting value for that source.')),
          h('section',{className:'rn-energy-panel rn-mg-form rn-mg-companion','aria-label':'Second source setup'},h('h3',null,'Add a second source'),
            h('label',null,h('input',{type:'checkbox',checked:s.companion.enabled,'aria-label':'Enable second generator',onChange:function(e){change({companion:Object.assign({},s.companion,{enabled:e.target.checked}),scene:!e.target.checked&&scene==='companion'?'source':scene});}}),' Enable second generator'),
            h('p',{className:'rn-energy-muted'},'Explore whether another source fills gaps or adds surplus. Both generators share this battery and demand.'),
            s.companion.enabled&&h(React.Fragment,null,
              select('Second generation technology',s.companion.source,RN_ENERGY_SPECS.filter(function(c){return c.id!=='storage';}).map(function(c){return [c.id,c.name];}),copyCompanion),
              select('Second generation scenario',s.companion.profileId,[['steady','Steady resource']].concat(RN_ENERGY_PROGRAMS[s.companion.source].map(function(p){return [p.id,p.name+' · '+p.duration+' min'];})),function(v){companionChange({profileId:v});}),
              slider('Second generation units',s.companion.sourceUnits,0,50,1,'units',function(v){companionChange({sourceUnits:v});}),
              s.companion.profileId!=='steady'&&slider('Second scenario time offset',s.companion.offset,-result.duration,result.duration,1,'min',function(v){companionChange({offset:v});}),
              h('div',{className:'rn-energy-toolbar'},btn('Copy second source workbench settings',function(){copyCompanion(s.companion.source);}),btn('Open second source workbench',function(){props.onSource(s.companion.source);})),
              h('details',null,h('summary',null,'Adjust second source inputs'),companionSpec.controls.map(function(c){return slider('Second source: '+c[1],s.companion.sourceSettings[c[0]],c[2],c[3],c[4],c[6],function(v){var inputs=Object.assign({},s.companion.sourceSettings);inputs[c[0]]=v;companionChange({sourceSettings:inputs});});})),
              h('details',null,h('summary',null,'How the two timelines align'),h('p',null,RN_HYBRID_TIMING),h('p',null,'System duration: '+result.duration+' min. Second scenario: '+(rnEnergyProgram(s.companion.source,s.companion.profileId)||{duration:'steady'}).duration+(s.companion.profileId==='steady'?'':' min, shifted by '+s.companion.offset+' min')+'.')))),
          h('section',{className:'rn-energy-panel rn-mg-form','aria-label':'Demand and grid setup'},h('h3',null,'2. Demand & grid'),
            h('label',null,'Base demand (kW)',h('input',{type:'number',min:0,max:1000000,step:'any',value:s.demand,'aria-label':'Base demand kW',onChange:function(e){change({demand:Number(e.target.value)});}})),
            select('Demand pattern',s.loadId,RN_MICROGRID_LOADS.map(function(p){return [p.id,p.name];}),function(v){change({loadId:v});}),
            select('Grid connection',s.grid,[['island','Islanded: no grid supply'],['connected','Grid backup available'],['outage','Grid backup with an outage']],function(v){change({grid:v});}),
            s.grid==='outage'&&h(React.Fragment,null,slider('Outage starts at',s.outageStart,0,result.duration-1,1,'min',function(v){change({outageStart:v});}),slider('Outage duration',s.outageMinutes,1,result.duration-s.outageStart,1,'min',function(v){change({outageMinutes:v});})),
            h('fieldset',{className:'rn-grid-limit-controls'},h('legend',null,'Grid import capacity'),h('label',{className:'rn-grid-limit-toggle'},h('input',{type:'checkbox',checked:s.gridLimit.enabled,'aria-label':'Limit grid imports',onChange:function(e){change({gridLimit:Object.assign({},s.gridLimit,{enabled:e.target.checked})});}}),'Limit grid imports'),s.gridLimit.enabled&&h('label',null,'Maximum grid import (kW)',h('input',{type:'number',min:0,max:1000000,step:'any',value:s.gridLimit.power,'aria-label':'Maximum grid import kW',onChange:function(e){change({gridLimit:Object.assign({},s.gridLimit,{power:Number(e.target.value)})});}})),h('p',null,s.grid==='island'?'The import limit is retained but has no effect while islanded.':s.gridLimit.enabled?'The cap applies after battery dispatch, only while grid backup is available.':'Imports are unlimited while grid backup is available.')),
            h('p',{className:'rn-energy-muted'},'Demand patterns are prescribed relative to the '+result.duration+'-minute sequence. The grid never charges the battery.')),
          h('section',{className:'rn-energy-panel rn-mg-form','aria-label':'Battery bank setup'},h('h3',null,'3. Battery bank'),
            slider('Battery units',s.batteryUnits,0,100,1,'units',function(v){change({batteryUnits:v});}),
            select('Battery strategy',s.policy,RN_MICROGRID_POLICIES.map(function(p){return [p.id,p.name];}),function(v){change({policy:v});}),
            h('p',{className:'rn-energy-muted'},RN_MICROGRID_POLICIES.find(function(p){return p.id===s.policy;}).description),
            slider('Battery reserve',s.reserve,0,90,5,'%',function(v){change({reserve:v});}),
            h('p',null,h('strong',null,fmt(result.capacity)+' kWh'), ' capacity · ',h('strong',null,fmt(result.power)+' kW'),' power limit'),
            btn('Copy battery workbench settings',function(){change({battery:rnEnergySettings('storage',props.workbenches.settings&&props.workbenches.settings.storage)});}),
            h('details',null,h('summary',null,'Adjust each battery unit'),rnEnergySpec('storage').controls.map(function(c){return slider(c[1],s.battery[c[0]],c[2],c[3],c[4],c[6],function(v){var battery=Object.assign({},s.battery);battery[c[0]]=v;change({battery:battery});});})),
            h('p',{className:'rn-energy-muted'},'Initial charge: '+fmt(result.initialStored)+' kWh. Configured reserve: '+fmt(result.reserveEnergy)+' kWh.'+(s.policy==='backup'?' Save for outages holds all stored energy while the grid is available; the reserve slider applies only to the other two strategies.':'')+' Set units to zero to remove the battery bank.'))),
        h('div',{style:{minWidth:0}},
          h('div',{className:'rn-energy-toolbar',style:{marginBottom:10}},btn('Source in 3D',function(){partPair[1]('converter');change({scene:'source'});},{'aria-pressed':scene==='source'}),s.companion.enabled&&btn('Second source in 3D',function(){partPair[1]('converter');change({scene:'companion'});},{'aria-pressed':scene==='companion'}),btn('Battery in 3D',function(){partPair[1]('converter');change({scene:'battery'});},{'aria-pressed':scene==='battery'}),btn('Power flow',function(){change({scene:'flow'});},{'aria-pressed':scene==='flow'})),
          scene!=='flow'&&h('div',{id:uid+'outageScene',className:'rn-energy-stage',tabIndex:-1},h(RenewablesEnergyScene,{React:React,id:scene==='battery'?'storage':scene==='companion'?s.companion.source:s.source,run:scene==='battery'?row.batteryRun:scene==='companion'?row.companionRun:row.sourceRun,phase:minute,selected:partPair[0],onPick:partPair[1]}),
            h('div',{className:'rn-energy-scene-note'},scene==='battery'?'Schematic bank of '+s.batteryUnits+' identical units · fill shows bank state of charge':scene==='companion'?(s.companion.sourceUnits?'One of '+s.companion.sourceUnits+' second-source units':'Second-source mechanism preview · zero installed units')+' · '+companionSpec.name:'One of '+s.sourceUnits+' primary generation units · '+spec.name)),
          scene!=='flow'&&h(React.Fragment,null,h('div',{className:'rn-energy-parts'},parts.map(function(p){return btn('Inspect '+p[1],function(){partPair[1](p[0]);},{key:p[0],'aria-pressed':partPair[0]===p[0]});})),h('div',{className:'rn-energy-component','aria-label':'Microgrid component explanation'},h('h3',null,part[1]),h('p',null,part[2]))),
          h('div',{className:'rn-energy-time'},h('div',{className:'rn-energy-toolbar'},btn(playing?'Pause energy system':'Play energy system',function(){if(!playing&&minute>=result.duration)props.onChange(Object.assign({},state,{minute:0}));playingPair[1](!playing);},{'aria-pressed':playing}),btn('Step energy system',function(){time(minute+1);}),h('strong',null,'Minute '+minute+' / '+result.duration)),
            slider('Energy system minute',minute,0,result.duration,1,'min',time),
            h('small',null,minute===result.duration?'Sequence complete. This endpoint adds no energy.':'Power is averaged over the following minute; stored energy is measured at this boundary. Playback is accelerated.')),
          h('section',{className:'rn-energy-panel','aria-label':'Current electricity balance'},h('div',{className:'rn-energy-toolbar'},h('h3',null,'Where electricity goes'),h('strong',null,minute===result.duration?'Sequence complete':row.gridAvailable?(s.gridLimit.enabled?'Grid available · '+fmt(s.gridLimit.power)+' kW import limit':'Grid backup available'):s.grid==='island'?'Islanded':'Grid outage')),
            h('div',{className:'rn-mg-flow'},[['Generation',row.generation],['Direct to demand',row.direct],['Charging battery',row.charge],['Battery to demand',row.discharge],['Grid to demand',row.grid],['Unserved demand',row.unserved],['Curtailed surplus',row.curtailed]].map(function(v){return h('div',{key:v[0]},h('small',null,v[0]),h('strong',null,fmt(v[1])+' kW'));})),
            s.companion.enabled&&h('p',null,'Primary '+spec.name+': '+fmt(row.primaryGeneration)+' kW + second '+companionSpec.name+': '+fmt(row.companionGeneration)+' kW = '+fmt(row.generation)+' kW combined.'),
            s.companion.enabled&&h('p',null,row.companionProfileMinute===null?'Second source runs at its steady resource setting.':'Second-source profile minute '+row.companionProfileMinute+' · '+(row.companionTiming==='before'?'holding its first resource value before the scenario':row.companionTiming==='after'?'holding its last resource value after the scenario':'following the scenario')+'.'),
            s.flex.enabled&&h('p',null,'Original demand '+fmt(row.baselineDemand)+' − shifted out '+fmt(row.shiftedOut)+' + shifted in '+fmt(row.shiftedIn)+' = '+fmt(row.demand)+' kW scheduled.'),
            h('p',null,'Demand '+fmt(row.demand)+' kW = direct '+fmt(row.direct)+' + battery '+fmt(row.discharge)+' + grid '+fmt(row.grid)+' + unserved '+fmt(row.unserved)+' kW.'),
            h('p',null,'Unserved demand: '+fmt(row.gridLimited)+' kW from the connection limit + '+fmt(row.gridUnavailable)+' kW while grid backup is unavailable.'),
            s.gridLimit.enabled&&minute<result.duration&&h('p',null,'Grid request after battery dispatch: '+fmt(row.gridRequested)+' kW · available import capacity: '+fmt(row.gridCapacity)+' kW · unused capacity: '+fmt(row.gridHeadroom)+' kW.'),
            h('p',null,'Battery: '+fmt(row.stored)+' kWh stored · '+fmt(row.batteryRun.extra.soc)+'% charged · '+row.batteryRun.status+'. Discharge floor now: '+fmt(row.reserve)+' kWh.'),
            row.primaryClipped&&h('p',null,'The primary resource input is clamped to its workbench control bounds.'),row.companionClipped&&h('p',null,'The second-source resource input is clamped to its workbench control bounds.')),
          h('section',{id:uid+'timeline',className:'rn-energy-panel',tabIndex:-1,'aria-label':'Energy system timeline'},h('div',{className:'rn-energy-toolbar'},h('h3',null,'Follow the sequence'),btn('Power balance chart',function(){change({chart:'power'});},{'aria-pressed':chartMode==='power'}),btn('Battery energy chart',function(){change({chart:'battery'});},{'aria-pressed':chartMode==='battery'}),btn('Demand timing chart',function(){change({chart:'demand'});},{'aria-pressed':chartMode==='demand'}),btn('Grid import chart',function(){change({chart:'grid'});},{'aria-pressed':chartMode==='grid'}),s.companion.enabled&&btn('Generation mix chart',function(){change({chart:'sources'});},{'aria-pressed':chartMode==='sources'})),chart(),
            h('p',{className:'rn-energy-muted'},chartMode==='grid'?'Solid line: imports. Long dashes: requested imports after battery dispatch.'+(s.gridLimit.enabled?' Dots: available import capacity.':'')+' Requests and capacity are zero while the grid is unavailable.':chartMode==='battery'?'Solid line: stored energy. Dashed line: the strategy’s discharge floor. Vertical line: selected minute.':chartMode==='demand'?'Solid line: scheduled demand. Long dashes: original demand. Vertical line: selected minute.':chartMode==='sources'?'Solid line: combined generation. Long dashes: primary source. Short dashes: second source. Vertical line: selected minute.':'Solid line: generation. Long dashes: demand. Short dashes: unmet demand. Vertical line: selected minute.'),
            chartMode==='demand'&&s.flex.enabled&&h('p',{className:'rn-energy-muted'},'Source window: '+s.flex.fromStart+'–'+(s.flex.fromStart+s.flex.fromMinutes)+' min. Receiving window: '+s.flex.toStart+'–'+(s.flex.toStart+s.flex.toMinutes)+' min.'),
            s.grid==='outage'&&chartMode!=='demand'&&h('p',{className:'rn-energy-muted'},'Shaded outage interval: '+s.outageStart+'–'+(s.outageStart+s.outageMinutes)+' min.'),
            h('div',{className:'rn-energy-toolbar'},btn('First unmet demand',function(){time(result.firstUnserved);},{disabled:result.firstUnserved===null}),btn('Most curtailed surplus',function(){time(result.mostCurtailed);},{disabled:result.mostCurtailed===null}),btn('Lowest stored energy',function(){time(result.lowestStored);}),s.grid==='outage'&&btn('Start of grid outage',function(){time(s.outageStart);}))))),
      h(RenewablesSupplyGapExplorer,{React:React,uid:uid+'gapExplorer',analysis:gapAnalysis,state:state.gapExplorer,onChange:function(value){change({gapExplorer:value});},onInspect:function(minute){change({minute:minute,scene:s.batteryUnits>0?'battery':'source'});setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);},onOpen:function(target){var panel=document.getElementById(uid+target);if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}}),
      h(RenewablesDemandShiftBench,{React:React,uid:uid+'flexLab',settings:s,result:result,original:originalDemand,note:state.flexNote,onChange:function(flex){change({flex:flex});},onNote:function(note){change({flexNote:note});},onChart:function(){change({chart:'demand'});var chart=document.getElementById(uid+'timeline');if(chart){chart.scrollIntoView({block:'start'});chart.focus({preventScroll:true});}},onInspect:function(minute){change({minute:minute,scene:'battery'});setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);}}),
      primaryOnly&&h('section',{className:'rn-energy-panel rn-mg-hybrid-results','aria-label':'Combined source comparison'},h('h3',null,'What does the second source change?'),
        h('p',null,'Compare '+spec.name+' alone with '+spec.name+' + '+companionSpec.name+'. Both runs use the same demand, battery, initial stored energy, grid schedule, and strategy. This adds equipment; it is not an equal-capacity or cost comparison.'),
        h('div',{className:'rn-energy-scenario-metrics'},h('div',null,h('small',null,'Primary generation'),h('strong',null,fmt(result.totals.primaryGeneration)+' kWh')),h('div',null,h('small',null,'Second-source generation'),h('strong',null,fmt(result.totals.companionGeneration)+' kWh')),h('div',null,h('small',null,'Combined generation'),h('strong',null,fmt(result.totals.generation)+' kWh'))),
        h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'Primary and combined energy results'},h('table',null,h('caption',null,'Whole '+result.duration+'-minute sequence. Change = combined minus primary alone.'),
          h('thead',null,h('tr',null,['Energy (kWh)','Primary alone','Combined','Change'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),
          h('tbody',null,[['Direct generation to demand','direct'],['Battery discharge','discharge'],['Grid imports','grid'],['Unserved demand','unserved'],['Curtailed generation','curtailed'],['Battery losses','loss']].map(function(item){var a=primaryOnly.totals[item[1]],b=result.totals[item[1]],d=b-a;return h('tr',{key:item[1]},h('th',{scope:'row'},item[0]),h('td',null,fmt(a)),h('td',null,fmt(b)),h('td',null,(d>0?'+':'')+fmt(d)));})))),
        h('p',null,'Final stored energy: '+fmt(primaryOnly.endStored)+' kWh with the primary source alone; '+fmt(result.endStored)+' kWh combined. Charging and demand are balanced after the sources combine; battery energy is not assigned back to either generator.'),
        h('div',{className:'rn-energy-toolbar'},btn('Inspect combined generation chart',function(){change({chart:'sources'});var chart=document.getElementById(uid+'timeline');if(chart){chart.scrollIntoView({block:'start'});chart.focus({preventScroll:true});}}))),
      h('section',{className:'rn-energy-panel','aria-label':'Full energy system results'},h('h3',null,'Results over the full '+result.duration+'-minute sequence'),
        h('div',{className:'rn-energy-scenario-metrics'},h('div',null,h('small',null,'Demand served'),h('strong',null,result.servedPercent===null?'No demand':fmt(result.servedPercent)+'%'),h('small',null,fmt(result.totals.demand)+' kWh requested')),h('div',null,h('small',null,'Unserved demand'),h('strong',null,fmt(result.totals.unserved)+' kWh'),h('small',null,result.unservedMinutes+' minute intervals with unmet demand')),h('div',null,h('small',null,'Grid imports'),h('strong',null,fmt(result.totals.grid)+' kWh'),h('small',null,'No electricity exports or grid charging'))),
        h(RenewablesGridReview,{React:React,uid:uid+'gridReview',onStudy:function(){change({gridStudy:Object.assign({},state.gridStudy,{open:true})});setTimeout(function(){var panel=document.getElementById(uid+'gridStudy');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}},0);},result:result,unlimited:unlimitedGrid,open:state.gridReviewOpen,note:state.gridNote,onToggle:function(open){change({gridReviewOpen:open});},onNote:function(note){change({gridNote:note});},onInspect:function(minute){change({minute:minute,scene:s.batteryUnits>0?'battery':'source'});setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);},onChart:function(){change({chart:'grid'});var panel=document.getElementById(uid+'timeline');if(panel){panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});}}}),
        h(RenewablesGridStudy,{React:React,uid:uid+'gridStudy',settings:s,state:state.gridStudy,onChange:function(value){change({gridStudy:value});},onInspect:function(saved,selected,minute,comparisonPatch){change(Object.assign({},saved,{minute:minute,scene:saved.batteryUnits>0?'battery':'source',gridStudy:Object.assign({},state.gridStudy,{selected:selected||(state.gridStudy&&state.gridStudy.selected),inspected:!!selected},comparisonPatch?{comparison:Object.assign({},state.gridStudy&&state.gridStudy.comparison,comparisonPatch)}:{})}));setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);},onRestore:function(saved){change(Object.assign({},saved,{minute:0,gridStudy:Object.assign({},state.gridStudy,{inspected:false})}));}}),
        h('h3',null,'What did the battery change?'),
        h('div',{className:'rn-energy-table',tabIndex:0,role:'region','aria-label':'With and without battery comparison'},h('table',null,h('caption',null,'Same generation, demand, and grid availability; the comparison removes all battery units and initial stored energy.'),h('thead',null,h('tr',null,['Energy (kWh)','Without battery','With battery','Reduction'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),h('tbody',null,[['Unserved demand','unserved',result.avoidedUnserved],['Grid imports','grid',result.avoidedGrid],['Curtailed generation','curtailed',result.avoidedCurtailment]].map(function(v){return h('tr',{key:v[1]},h('th',{scope:'row'},v[0]),h('td',null,fmt(result.withoutBattery[v[1]])),h('td',null,fmt(result.totals[v[1]])),h('td',null,fmt(v[2])));})))) ,
        h('p',null,'Generation '+fmt(result.totals.generation)+' + grid imports '+fmt(result.totals.grid)+' + initial storage '+fmt(result.initialStored)+' = served demand '+fmt(result.totals.demand-result.totals.unserved)+' + curtailed generation '+fmt(result.totals.curtailed)+' + battery losses '+fmt(result.totals.loss)+' + final storage '+fmt(result.endStored)+' kWh.'),
        h('p',{className:'rn-energy-muted'},'This is an electrical energy ledger. Generation conversion losses are already accounted for in the source workbench. Initial stored energy is not assumed to be renewable.'),
        h('details',null,h('summary',null,'Read all minute-by-minute results'),table)),
      h(RenewablesBatteryDesignStudy,{React:React,uid:uid+'designStudy',settings:s,state:state.designStudy,onChange:function(value){change({designStudy:value});},onInspect:function(saved,index,minute){change(Object.assign({},saved,{minute:minute,scene:'battery',designStudy:Object.assign({},state.designStudy,{selected:index,inspected:true})}));setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);},onRestore:function(saved){change(Object.assign({},saved,{minute:0,designStudy:Object.assign({},state.designStudy,{inspected:false})}));}}),
      h(RenewablesOutageStudy,{React:React,uid:uid+'outageStudy',settings:s,state:state.outageStudy,onChange:function(value){change({outageStudy:value});},onInspect:function(saved,sample){change(Object.assign({},saved,{grid:'outage',policy:sample.policy,outageStart:sample.start,outageMinutes:sample.minutes,minute:sample.minute,scene:'battery',outageStudy:Object.assign({},state.outageStudy,{selected:{index:sample.index,policy:sample.policy}})}));setTimeout(function(){var stage=document.getElementById(uid+'outageScene');if(stage){stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});}},0);},onRestore:function(saved){change(Object.assign({},saved,{minute:0}));}}),
      h('section',{className:'rn-energy-panel'},h('h3',null,'Record your investigation'),h('p',{className:'rn-energy-muted'},'JSON includes the system inputs, model limits, results, and observation. CSV contains the minute-by-minute power and stored-energy table.'),h('label',{htmlFor:uid+'note'},'System observation',h('textarea',{id:uid+'note','aria-label':'Energy system observation',maxLength:3000,value:state.note||'',placeholder:'What limited demand coverage: generation, battery power, usable stored energy, or the grid outage?',onChange:function(e){change({note:e.target.value});}})),h('div',{className:'rn-energy-toolbar',style:{marginTop:12}},btn('Export energy system JSON',function(){download(false);}),btn('Export energy system CSV',function(){download(true);}))),
      h('details',{className:'rn-energy-panel'},h('summary',null,'Model rules and limits'),h('p',null,RN_MICROGRID_ASSUMPTIONS),h('p',null,RN_GRID_LIMIT_RULES),h('p',null,'Fixed reserve holds its floor even during outages. Release during outages and Save for outages allow discharge down to empty when the grid is unavailable. Save for outages prevents battery discharge whenever grid backup is available. No strategy refills the battery from the grid. The model assumes equipment can operate while islanded and does not evaluate whether a real inverter or installation supports that.'),h('p',null,RN_HYBRID_TIMING),h('p',null,RN_DEMAND_SHIFT_RULES),s.companion.enabled&&h(RenewablesCompanionConditions,{React:React,settings:s}),h('p',null,'Each primary generation unit uses: '+spec.formula),h('p',null,spec.limits),h('a',{href:spec.source,target:'_blank',rel:'noopener noreferrer'},spec.name+' concept reference')));
  }

  var RN_MICROGRID_CSS="\n.rn-mg-layout{display:grid;grid-template-columns:310px minmax(0,1fr);gap:18px;margin-top:18px}.rn-mg-presets{justify-content:flex-start;padding:12px 0}.rn-mg-form>label,.rn-mg-form select{display:block;width:100%}.rn-mg-form>label{font-size:12px;margin:12px 0}.rn-mg-form select,.rn-mg-form input[type=number]{display:block;width:100%;min-height:40px;margin-top:5px;padding:8px;border:1px solid var(--re-border);border-radius:8px;background:var(--re-bg);color:var(--re-text);font:inherit}.rn-mg-form select:focus-visible{outline:3px solid var(--re-accent);outline-offset:3px}.rn-mg-form p,.rn-mg-form button{font-size:12px}.rn-mg-form .rn-energy-control{margin-top:15px}.rn-mg-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:15px 0}.rn-mg-flow>div{padding:10px;background:var(--re-alt);border:1px solid var(--re-border);border-radius:8px}.rn-mg-flow small{display:block;font-size:11px}.rn-mg-flow strong{display:block;font-size:19px}.rn-microgrid .rn-energy-webgl{height:390px}.rn-microgrid [aria-label=\"Current electricity balance\"] p{font-size:12px}.rn-microgrid [aria-label=\"Energy system timeline\"] p{font-size:12px}\n@media(max-width:900px){.rn-mg-layout{grid-template-columns:1fr}.rn-mg-layout>div:first-child{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rn-mg-form .rn-energy-control label{flex-wrap:wrap}}\n@media(max-width:700px){.rn-mg-layout>div:first-child{display:block}.rn-mg-flow{grid-template-columns:1fr 1fr}.rn-microgrid .rn-energy-webgl{height:320px}}\n\n.rn-microgrid .rn-energy-scenario-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0}.rn-microgrid .rn-energy-scenario-metrics strong{display:block;font-size:26px}.rn-microgrid .rn-energy-scenario-metrics small{display:block;font-size:12px}@media(max-width:600px){.rn-microgrid .rn-energy-scenario-metrics{grid-template-columns:1fr}}\n";

  function RenewablesLandscape(props) {
    var React=props.React,h=React.createElement,mount=React.useRef(null),live=React.useRef(props),api=React.useRef(null);
    live.current=props;
    var statusPair=React.useState('loading'),status=statusPair[0],setStatus=statusPair[1],retryPair=React.useState(0);
    React.useEffect(function(){
      var disposed=false,renderer,scene,camera,raf=0,resize,observer,io,visible=true,meshes=[],rotors=[],links=[],panels=[],last=0,dirty=true,lastProps=null,pickables=[],raycaster,drag=null,onDown,onMove,onUp;
      var container=mount.current,reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
      var viewCamera={yaw:.15,pitch:.78,distance:22};setStatus('loading');
      function positionCamera(){
        if(!camera)return;
        camera.position.set(Math.sin(viewCamera.yaw)*Math.cos(viewCamera.pitch)*viewCamera.distance,Math.sin(viewCamera.pitch)*viewCamera.distance,Math.cos(viewCamera.yaw)*Math.cos(viewCamera.pitch)*viewCamera.distance);
        camera.lookAt(0,0,0);dirty=true;
      }
      api.current=function(action){
        if(action==='left')viewCamera.yaw-=.22;if(action==='right')viewCamera.yaw+=.22;
        if(action==='in')viewCamera.distance=Math.max(16,viewCamera.distance-3);
        if(action==='out')viewCamera.distance=Math.min(46,viewCamera.distance+3);
        if(action==='top'){viewCamera.pitch=1.48;viewCamera.yaw=0;}
        if(action==='home')viewCamera={yaw:.15,pitch:.78,distance:22};
        positionCamera();
      };
      var engine=window.THREE?Promise.resolve(window.THREE):window.StemLab.ensureThree?window.StemLab.ensureThree():Promise.reject(new Error('3D unavailable'));
      function release(){
        if(!scene)return;var geometries=new Set(),materials=new Set();
        scene.traverse(function(o){if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){materials.add(m);});});
        geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});
      }
      function lost(event){event.preventDefault();cancelAnimationFrame(raf);setStatus('failed');}
      engine.then(function(THREE){
        if(disposed)return;
        scene=new THREE.Scene();scene.background=new THREE.Color('#102b3a');scene.fog=new THREE.Fog('#102b3a',42,80);
        camera=new THREE.PerspectiveCamera(40,1,.1,100);positionCamera();
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
        container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
        renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y';
        renderer.domElement.addEventListener('webglcontextlost',lost);
        var ambient=new THREE.HemisphereLight(0xd6f4ff,0x233d27,.7);scene.add(ambient);
        var light=new THREE.DirectionalLight(0xffedcb,.95);light.position.set(-8,18,12);scene.add(light);
        function box(parent,x,y,z,w,ht,depth,color){
          var m=new THREE.Mesh(new THREE.BoxGeometry(w,ht,depth),new THREE.MeshStandardMaterial({color:color,roughness:.8}));
          m.position.set(x,y,z);parent.add(m);return m;
        }
        function line(points,color){
          var geometry=new THREE.BufferGeometry().setFromPoints(points.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}));
          var l=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:color}));scene.add(l);return l;
        }
        function turbine(parent,x,z,idx,ordinal){
          var assembly=new THREE.Group();parent.add(assembly);parent=assembly;
          var tower=new THREE.Mesh(new THREE.CylinderGeometry(.065,.13,2.7,7),new THREE.MeshStandardMaterial({color:'#dcebe6'}));tower.position.set(x,1.7,z);parent.add(tower);
          box(parent,x,3.1,z,.35,.22,.5,'#f0f4f1');
          var rotor=new THREE.Group();rotor.position.set(x,3.12,z+.3);parent.add(rotor);
          for(var b=0;b<3;b++){var arm=new THREE.Group();box(arm,0,.61,0,.12,1.35,.05,'#f8fbeb');arm.rotation.z=b*Math.PI*2/3;rotor.add(arm);}
          rotors.push({mesh:rotor,index:idx,assembly:assembly,number:ordinal});
        }
        var outline=[[-10,-4.2],[-6,-4.5],[-2,-4.1],[2,-4.2],[3.1,-3.2],[5,-3.8],[7.4,-4.6],[9.4,-5.4],[9.8,-4],[8.2,-1.2],[7.8,1.8],[6.8,3.4],[7.9,6.2],[6.8,5.6],[5.7,3.6],[3.5,3.8],[1.2,3.6],[.2,5.1],[-1.3,4.7],[-2.2,2.9],[-5,2.6],[-7.2,1.8],[-8.5,-.2],[-9.4,-2.3]];
        var shape=new THREE.Shape();outline.forEach(function(p,i){if(i===0)shape.moveTo(p[0],-p[1]);else shape.lineTo(p[0],-p[1]);});shape.closePath();
        var land=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.45,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.12,bevelThickness:.12}),new THREE.MeshStandardMaterial({color:'#47786b',roughness:1}));
        land.rotation.x=-Math.PI/2;land.position.y=-.1;scene.add(land);
        RN_REGIONS.forEach(function(r,i){
          var group=new THREE.Group();group.position.set(r.x,.46,r.z);scene.add(group);
          var marker=box(group,0,-.04,0,2.65,.12,2.6,'#6b9178');meshes.push({marker:marker,index:i});
          for(var n=0;n<12;n++){var panel=box(group,-1+(n%4)*.48,.22,-1+Math.floor(n/4)*.48,.4,.045,.37,'#183f74');panel.rotation.x=-.32;panels.push({mesh:panel,index:i,number:n});}
          turbine(group,-.8,1,i,0);turbine(group,.5,.55,i,1);turbine(group,.4,-.8,i,2);
          box(group,1,.5,-.5,.45,.85,.6,'#cbd9d6');box(group,1,.97,-.5,.52,.08,.65,'#244d50');
          meshes[i].battery=box(group,.65,.35,1.3,.4,.45,.65,'#4fe0b0');
          group.traverse(function(o){if(o.isMesh){o.userData.rnRegion=r.id;pickables.push(o);}});
          links.push({mesh:line([[r.x,.85,r.z],[r.x,.85,1.1],[2.6,.85,1.1]],'#66cbbc'),index:i});
        });
        box(scene,2.6,.78,1.1,.6,.4,.7,'#f2c879');
        [-6.1,-4.8].forEach(function(x,i){var mountain=new THREE.Mesh(new THREE.ConeGeometry(.75,1.3,4),new THREE.MeshStandardMaterial({color:'#8dafa4'}));mountain.position.set(x,1,-2.8+i*.2);scene.add(mountain);});
        scene.traverse(function(o){if(o.material&&o.material.color)o.material.color.convertSRGBToLinear();});
        resize=function(){if(!renderer||disposed)return;var w=container.clientWidth||640,ht=container.clientHeight||360;renderer.setSize(w,ht,false);camera.aspect=w/ht;camera.fov=2*Math.atan(Math.max(12,26/camera.aspect)/44)*180/Math.PI;camera.updateProjectionMatrix();dirty=true;};
        if(window.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(container);}else window.addEventListener('resize',resize);
        resize();
        raycaster=new THREE.Raycaster();
        onDown=function(e){if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,touch:e.pointerType==='touch'};if(!drag.touch)renderer.domElement.setPointerCapture(e.pointerId);};
        onMove=function(e){if(!drag||drag.touch)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>5)drag.moved=true;if(drag.moved){viewCamera.yaw-=dx*.006;viewCamera.pitch=Math.max(.25,Math.min(1.48,viewCamera.pitch+dy*.006));positionCamera();}drag.x=e.clientX;drag.y=e.clientY;};
        onUp=function(e){if(!drag)return;var moved=drag.moved||Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>8;drag=null;if(moved||e.type==='pointercancel')return;var rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);var hit=raycaster.intersectObjects(pickables,false).find(function(item){var o=item.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(hit&&live.current.onPick)live.current.onPick(hit.object.userData.rnRegion);};
        renderer.domElement.style.cursor='grab';
        renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('pointerup',onUp);renderer.domElement.addEventListener('pointercancel',onUp);
        if(window.IntersectionObserver){io=new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;});io.observe(container);}
        function frame(time){
          if(disposed)return;raf=requestAnimationFrame(frame);
          if(document.hidden||!visible||time-last<45)return;
          var dt=Math.min(.1,(time-last)/1000);last=time;var p=live.current,rows=p.hour.regions;
          var animate=p.motion&&!(reduce&&reduce.matches);
          if(!dirty&&!animate&&lastProps===p)return;dirty=false;lastProps=p;
          var daylight=rows.reduce(function(n,r){return n+r.sun;},0)/rows.length;ambient.intensity=.35+daylight*.65;light.intensity=.2+daylight*1.3;scene.background.set(daylight>.05?'#102b3a':'#081724');
          meshes.forEach(function(item){var r=rows[item.index];item.marker.material.color.set(r.id===p.selected?'#f5d487':r.unmet>.01?'#ba6c68':'#6b9178').convertSRGBToLinear();item.battery.scale.y=.15+.85*(r.batteryCapacity?r.battery/r.batteryCapacity:0);});
          panels.forEach(function(item){item.mesh.material.color.set(rows[item.index].sun>.1?'#174783':'#101e35').convertSRGBToLinear();item.mesh.visible=item.number<Math.min(12,Math.ceil(3*p.capacity.regions[item.index].solar/(240*RN_REGIONS[item.index].solar)));});
          links.forEach(function(item){var r=rows[item.index];item.mesh.visible=p.network;item.mesh.material.color.set(r.linkOffline?'#fc716b':r.imports>.1?'#f4c55f':r.exports>.1?'#6effd3':'#396679').convertSRGBToLinear();});
          rotors.forEach(function(rotor){rotor.assembly.visible=rotor.number<Math.min(3,Math.ceil(p.capacity.regions[rotor.index].wind/(200*RN_REGIONS[rotor.index].turbines)));if(animate)rotor.mesh.rotation.z-=dt*rows[rotor.index].windFactor*3;});
          renderer.render(scene,camera);
        }
        raf=requestAnimationFrame(frame);setStatus('ready');
      }).catch(function(){if(!disposed){cancelAnimationFrame(raf);setStatus('failed');}});
      return function(){
        disposed=true;cancelAnimationFrame(raf);api.current=null;
        if(observer)observer.disconnect();if(io)io.disconnect();if(resize)window.removeEventListener('resize',resize);
        release();
        if(renderer){renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointermove',onMove);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('pointercancel',onUp);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.forceContextLoss();if(renderer.domElement.parentNode)renderer.domElement.remove();}
      };
    },[retryPair[0]]);
    return h('div',{className:'rn-landscape'},
      h('div',{ref:mount,className:'rn-webgl',role:'img','aria-label':'3D landscape of six illustrative US regions. Solar arrays, turbines, batteries, and electricity links reflect the selected hour. Exact readings are in the region inspector.','data-render-status':status}),
      status!=='ready'&&h('div',{className:'rn-scene-status',role:'status'},status==='loading'?'Loading the 3D landscape…':'3D is unavailable. The map, chart, and simulation still work.',status==='failed'&&h('button',{type:'button',onClick:function(){retryPair[1](retryPair[0]+1);}},'Retry 3D')),
      h('div',{className:'rn-camera','aria-label':'3D camera controls'},[['left','Rotate left'],['right','Rotate right'],['in','Zoom in'],['out','Zoom out'],['top','Top view'],['home','Reset camera']].map(function(a){return h('button',{key:a[0],type:'button',disabled:status!=='ready',onClick:function(){if(api.current)api.current(a[0]);}},a[1]);})));
  }


  function RenewablesTransition(props) {
    var React=props.ctx.React,h=React.createElement,T=props.theme,state=props.state||{};
    var s=rnSettings(state.settings),key=JSON.stringify(s);
    var result=React.useMemo(function(){return rnSimulate(s);},[key]),total=result.totals,capacity=result.capacity;
    var hourState=React.useState(12),hourIndex=Math.min(hourState[0],result.hours.length-1),setHour=hourState[1];
    var playState=React.useState(false),playing=playState[0],setPlaying=playState[1];
    var modeState=React.useState('3d'),mode=modeState[0];
    var regionState=React.useState('west'),selected=regionState[0];
    var motionState=React.useState(false),motion=motionState[0];
    var noticeState=React.useState(''),notice=noticeState[0];
    var stressState=React.useState(null),pathwayState=React.useState(null);
    var sweepState=React.useState(null),sweepVariable=React.useState('duration'),compactState=React.useState(false);
    var challengeAssessment=React.useMemo(function(){return state.challenge?rnAssessChallenge(state.challenge.id,s,result):null;},[state.challenge&&state.challenge.id,key]);
    var uid=React.useId().replace(/:/g,'');
    var current=result.hours[hourIndex],region=current.regions.find(function(r){return r.id===selected;})||current.regions[0];
    var regionInfo=RN_REGIONS.find(function(r){return r.id===region.id;});
    var snapshots=React.useMemo(function(){return (Array.isArray(state.snapshots)?state.snapshots:[]).filter(function(x){return x&&x.settings;}).slice(-4).map(function(x){var run=rnSimulate(x.settings);return Object.assign({},x,{modelVersion:2,settings:run.settings,totals:run.totals});});},[state.snapshots]);
    React.useEffect(function(){
      if(!playing)return;
      var timer=setInterval(function(){if(!document.hidden)setHour(function(v){if(v>=s.hours-1){setPlaying(false);return s.hours-1;}return v+1;});},650);
      return function(){clearInterval(timer);};
    },[playing,s.hours]);
    React.useEffect(function(){setPlaying(false);setHour(function(v){return Math.min(v,s.hours-1);});noticeState[1]('');},[key]);
    React.useEffect(function(){
      if(!window.matchMedia)return;
      var query=window.matchMedia('(max-width: 600px)'),update=function(){compactState[1](query.matches);};update();
      if(query.addEventListener)query.addEventListener('change',update);else if(query.addListener)query.addListener(update);
      return function(){if(query.removeEventListener)query.removeEventListener('change',update);else if(query.removeListener)query.removeListener(update);};
    },[]);
    function change(patch){props.onChange(Object.assign({},state,patch));}
    function setting(k,v){var next=Object.assign({},s);next[k]=v;change({settings:next});}
    function fmt(v,d){return Number(v).toLocaleString(undefined,{maximumFractionDigits:d==null?1:d});}
    function button(text,fn,active,extra){return h('button',Object.assign({type:'button',onClick:fn,'aria-pressed':active==null?undefined:active},extra||{}),text);}
    function slider(k,label,min,max,step,unit,hint){
      return h('div',{className:'rn-control',key:k},
        h('label',{htmlFor:uid+k},label,h('strong',null,(k==='year'?String(s[k]):fmt(s[k]))+' '+unit)),
        h('input',{id:uid+k,type:'range',min:min,max:max,step:step,value:s[k],'aria-valuetext':fmt(s[k])+' '+unit,onChange:function(e){setting(k,Number(e.target.value));}}),
        hint&&h('small',null,hint));
    }
    function choose(k,label,options){
      return h('label',{className:'rn-select',key:k,htmlFor:uid+k},label,h('select',{id:uid+k,'aria-label':label,value:s[k],onChange:function(e){setting(k,k==='hours'?Number(e.target.value):e.target.value);}},options.map(function(o){return h('option',{key:o[0],value:o[0]},o[1]);})));
    }
    function save(){
      var match=snapshots.findIndex(function(x){return JSON.stringify(rnSettings(x.settings))===key;});
      if(match>=0){
        if(snapshots[match].prediction!==(state.prediction||'')||snapshots[match].reflection!==(state.reflection||'')){
          change({snapshots:snapshots.map(function(x,i){return i===match?Object.assign({},x,{prediction:state.prediction||'',reflection:state.reflection||''}):x;})});noticeState[1]('Notes updated for the saved scenario.');
        }else noticeState[1]('This scenario is already saved. Change a setting to compare another.');return;
      }
      var entry={modelVersion:2,settings:s,totals:total,label:'Scenario '+(Number(state.savedCount||0)+1),prediction:state.prediction||'',reflection:state.reflection||''};
      change({snapshots:snapshots.concat([entry]).slice(-4),savedCount:Number(state.savedCount||0)+1});
      noticeState[1]('Scenario saved. Compare it with your next experiment below.');
    }
    function differences(settings){
      if(!snapshots.length)return 'Baseline';
      var labels={year:'year',solarBuild:'solar build',windBuild:'wind build',batteryBuild:'battery build',duration:'storage duration',transmission:'link capacity',retirement:'fossil retirement',growth:'demand growth',efficiency:'efficiency',weather:'weather',season:'season',hours:'test hours',transferLoss:'transfer loss',flexDemand:'demand flexibility',reserve:'storage reserve',outageRegion:'outage region',outageStart:'outage start',outageHours:'outage length'};
      var first=rnSettings(snapshots[0].settings);var changes=Object.keys(labels).filter(function(k){return first[k]!==settings[k];}).map(function(k){return labels[k]+': '+first[k]+' → '+settings[k];});
      RN_REGIONS.forEach(function(r){['solar','wind','battery'].forEach(function(k){if(first.siting[r.id][k]!==settings.siting[r.id][k])changes.push(r.name+' '+k+' weight: '+first.siting[r.id][k]+' → '+settings.siting[r.id][k]);});});return changes.join('; ')||'Baseline';
    }
    function download(){
      var payload={title:'Renewables Lab: US transition investigation',modelVersion:2,assumptions:'Six illustrative regions, hourly dispatch, capacity-limited hub links with explicit end-to-end losses and timed outages, energy-conserving demand shifts, empty starting storage, 88% round-trip storage efficiency. Not calibrated to the US grid; not a forecast.',result:result,stressSuite:stressState[0]&&stressState[0].key===key?stressState[0].items:null,pathway:pathwayState[0]&&pathwayState[0].key===JSON.stringify(Object.assign({},s,{year:2025}))?pathwayState[0].items:null,experiment:rnSweepFresh(sweepState[0],s,sweepVariable[0])?sweepState[0]:null,challenge:challengeAssessment,selectedHour:rnExplainHour(result,hourIndex,selected),comparisons:snapshots,prediction:state.prediction||'',reflection:state.reflection||''};
      var url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='renewables-investigation.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1500);
      noticeState[1]('Investigation exported with settings, hourly results, and notes.');
    }

    function stamp(index){return 'Day '+(Math.floor(index/24)+1)+' · '+String(index%24).padStart(2,'0')+':00';}
    function setSiting(technology,value){
      var siting=Object.assign({},s.siting);siting[selected]=Object.assign({},siting[selected]);siting[selected][technology]=value;setting('siting',siting);
    }
    function sitingPanel(){
      var rc=capacity.regions.find(function(r){return r.id===selected;});
      return h('details',{className:'rn-siting'},h('summary',null,'Plan new construction in '+regionInfo.name),
        h('p',{className:'rn-muted'},'Change where the national build is placed. A weight of 100 uses the default resource distribution. Other regions adjust automatically; national capacity stays fixed.'),
        ['solar','wind','battery'].map(function(k){
          var label={solar:'Solar siting weight',wind:'Wind siting weight',battery:'Battery siting weight'}[k],share={solar:rc.newSolarShare,wind:rc.newWindShare,battery:rc.newBatteryShare}[k];
          return h('div',{key:k,className:'rn-control'},h('label',{htmlFor:uid+'siting'+k},label,h('strong',null,s.siting[selected][k]+' / 100')),
            h('input',{id:uid+'siting'+k,'aria-label':label+' in '+regionInfo.name,type:'range',min:0,max:300,step:1,value:s.siting[selected][k],onChange:function(e){setSiting(k,Number(e.target.value));}}),
            h('small',null,fmt(share*100)+'% of national new '+k+' capacity allocated here.'));
        }),
        h('p',null,'Installed here: '+fmt(rc.solar)+' GW solar · '+fmt(rc.wind)+' GW wind · '+fmt(rc.batteryPower)+' GW / '+fmt(rc.batteryEnergy)+' GWh storage.'),
        h('div',{className:'rn-toolbar'},
          button('Reset all siting weights',function(){setting('siting',{});}),
          button('Build near demand',function(){
            var weights={};RN_REGIONS.forEach(function(r){weights[r.id]={solar:Math.round(100*r.weight/r.solar),wind:Math.round(100*r.weight/r.turbines),battery:100};});setting('siting',weights);
          })),
        h('small',null,'Existing 2025 capacity stays in place. If every weight for a technology is zero, its default distribution is used.'));
    }
    function storageChart(){
      var W=880,H=125,L=48,R=16,max=Math.max(1,capacity.batteryEnergy),x=function(i){return L+i/(s.hours-1)*(W-L-R);},y=function(v){return 96-v/max*77;};
      var points=result.hours.map(function(r,i){return x(i)+','+y(r.battery);}).join(' ');
      return h('div',{className:'rn-storage-chart'},h('h3',null,'Stored energy through the test'),
        h('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Stored energy in GWh, starting empty and ending at '+fmt(total.endBattery)+'. Battery capacity '+fmt(capacity.batteryEnergy)+' GWh. Reserve target '+s.reserve+' percent.'},
          h('polygon',{points:x(0)+',96 '+points+' '+x(s.hours-1)+',96',fill:T.accentHi,opacity:.18}),
          h('polyline',{points:points,fill:'none',stroke:T.accentHi,strokeWidth:2}),
          [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:L,x2:W-R,y1:y(f*max),y2:y(f*max),stroke:T.border,strokeDasharray:'3 4',opacity:.4}),h('text',{x:L-7,y:y(f*max)+4,textAnchor:'end',fontSize:11,fill:T.muted},fmt(f*max,0)));}),
          s.reserve>0&&h('line',{x1:L,x2:W-R,y1:y(max*s.reserve/100),y2:y(max*s.reserve/100),stroke:T.warm,strokeDasharray:'5 4',strokeWidth:2}),
          h('line',{x1:x(hourIndex),x2:x(hourIndex),y1:15,y2:96,stroke:T.text,strokeWidth:1.5}),
          h('text',{x:8,y:11,fontSize:11,fill:T.muted},'GWh'),
          [0,Math.floor((s.hours-1)/2),s.hours-1].map(function(i){return h('text',{key:i,x:x(i),y:117,fontSize:11,fill:T.muted,textAnchor:'middle'},i+'h');})),
        h('small',null,'Selected hour: '+fmt(current.battery)+' GWh stored. '+(s.reserve?'Dashed line: '+s.reserve+'% reserve, released if fossil backup cannot cover demand.':'Reserve target: 0%.')));
    }
    function inspect(index){
      setPlaying(false);setHour(index);
      var rows=result.hours[index].regions;
      var hardest=rows.reduce(function(best,r){return (r.unmet>.001?r.unmet+10000:r.fossil)>(best.unmet>.001?best.unmet+10000:best.fossil)?r:best;},rows[0]);regionState[1](hardest.id);
    }
    function diagnosticPanel(){
      var peak=total.peakUnmet>.001?total.worstHour:total.peakFossilHour;
      var mostCurtailed=result.hours.reduce(function(a,b){return b.curtail>a.curtail?b:a;});
      var mostDischarged=result.hours.reduce(function(a,b){return b.discharge>a.discharge?b:a;});
      return h('section',{className:'rn-panel rn-results','aria-label':'Grid diagnostics'},
        h('h3',null,'Find the weak point'),
        h('div',{className:'rn-diagnostic-grid'},
          h('div',null,h('small',null,'Unserved electricity'),h('strong',null,fmt(total.unmet)+' GWh')),
          h('div',null,h('small',null,'Largest demand gap'),h('strong',null,fmt(total.peakUnmet)+' GW')),
          h('div',null,h('small',null,'Longest continuous shortfall'),h('strong',null,total.longestGap+' h')),
          h('div',null,h('small',null,'Energy shifted to midday'),h('strong',null,fmt(total.shifted)+' GWh'))),
        h('div',{className:'rn-presets'},
          button((total.peakUnmet>.001?'Inspect largest gap':'Inspect peak fossil use')+' · '+stamp(peak),function(){inspect(peak);}),
          button('Inspect largest surplus',function(){inspect(mostCurtailed.hour);}),
          button('Inspect peak battery discharge',function(){inspect(mostDischarged.hour);}),
          s.outageRegion!=='none'&&button('Inspect outage start',function(){setPlaying(false);setHour(s.outageStart);regionState[1](s.outageRegion);})),
        h('p',{className:'rn-muted'},'A national total can hide local constraints. Compare regional shortages, surplus, and full-capacity links before choosing your next investment.'),
        h('details',null,h('summary',null,'Regional outcomes across the test'),
          h('div',{className:'rn-table-wrap',tabIndex:0,'aria-label':'Scrollable regional outcomes'},h('table',null,
            h('caption',null,'GWh across '+s.hours+' hours. A congested link reaches its sending or receiving power limit; an offline link is counted separately.'),
            h('thead',null,h('tr',null,['Region','Renewable demand share','Fossil GWh','Unmet GWh','Curtailed GWh','Congested hours','Offline hours'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
            h('tbody',null,result.regionTotals.map(function(r){return h('tr',{key:r.id},h('th',{scope:'row'},r.name),[fmt(r.renewableShare)+'%',fmt(r.fossil),fmt(r.unmet),fmt(r.curtail),r.congestedHours,r.offlineHours].map(function(v,i){return h('td',{key:i},v);}));}))))));
    }
    function stressPanel(){
      var data=stressState[0],fresh=data&&data.key===key;
      return h('section',{className:'rn-panel rn-results','aria-label':'Seven-day stress suite'},
        h('div',{className:'rn-toolbar'},h('h3',{style:{margin:0}},'Does the plan hold up across a difficult week?'),
          button(data?'Rerun stress suite':'Run four stress tests',function(){stressState[1]({key:key,items:rnStressSuite(s)});noticeState[1]('Four seven-day stress tests completed.');})),
        h('p',{className:'rn-muted'},'Compare summer variability, a winter renewable lull, a heat wave, and a 48-hour Northeast link outage. Each test starts with empty storage and keeps this plan’s build rates, siting, demand flexibility, and reserve policy.'),
        data&&!fresh&&h('p',{role:'status',className:'rn-stale'},'The plan has changed. Rerun the suite to refresh these results.'),
        data&&h('div',{className:'rn-table-wrap',tabIndex:0,role:'region','aria-label':'Stress test results'},h('table',null,
          h('caption',null,'Each test spans 168 hours. Results describe these synthetic weeks; they are not annual reliability estimates.'),
          h('thead',null,h('tr',null,['Stress case','Demand met','Renewable share','Fossil TWh','Unmet GWh','Longest gap','Inspect'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
          h('tbody',null,data.items.map(function(r){return h('tr',{key:r.id},h('th',{scope:'row'},r.label),h('td',null,fmt(r.totals.demandMet,2)+'%'),h('td',null,fmt(r.totals.renewableShare)+'%'),h('td',null,fmt(r.totals.fossil/1000,2)),h('td',null,fmt(r.totals.unmet)),h('td',null,r.totals.longestGap+' h'),
            h('td',null,button('Load test',function(){change({settings:r.settings});setHour(r.totals.peakUnmet>.001?r.totals.worstHour:r.totals.peakFossilHour);},null,{disabled:!fresh,'aria-label':'Load '+r.label})));})))),
        !data&&h('div',{className:'rn-coach'},'Try the same plan with 0% and 20% demand flexibility, or with four-hour and twelve-hour storage. Keep the other settings fixed, then rerun the suite.'));
    }
    function pathwayPanel(){
      var path=pathwayState[0],pathKey=JSON.stringify(Object.assign({},s,{year:2025})),fresh=path&&path.key===pathKey;
      return h('details',{className:'rn-panel rn-results','aria-label':'Adoption pathway'},h('summary',null,'Trace this build plan from 2025 to 2050'),
        h('p',{className:'rn-muted'},'Hold weather, test length, siting, and policy fixed. Rebuild the portfolio at six milestones to see whether demand growth or retirement outruns new capacity.'),
        button(path?'Recalculate milestones':'Calculate six milestones',function(){
          pathwayState[1]({key:pathKey,items:[2025,2030,2035,2040,2045,2050].map(function(year){var run=rnSimulate(Object.assign({},s,{year:year}));return {year:year,settings:run.settings,totals:run.totals};})});
          noticeState[1]('Six adoption milestones calculated.');
        }),
        path&&!fresh&&h('p',{role:'status',className:'rn-stale'},'Plan assumptions changed. Recalculate the milestones.'),
        path&&h('div',{className:'rn-table-wrap',tabIndex:0,role:'region','aria-label':'Adoption milestone results'},h('table',null,h('caption',null,'Each milestone repeats the same '+path.items[0].settings.hours+'-hour test; intervening years are not continuously simulated.'),
          h('thead',null,h('tr',null,['Year','Renewable demand share','Demand met','Fossil TWh','Largest gap GW','Inspect'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
          h('tbody',null,path.items.map(function(r){return h('tr',{key:r.year},h('th',{scope:'row'},r.year),h('td',null,fmt(r.totals.renewableShare)+'%'),h('td',null,fmt(r.totals.demandMet,2)+'%'),h('td',null,fmt(r.totals.fossil/1000,2)),h('td',null,fmt(r.totals.peakUnmet)),
            h('td',null,button('Inspect year',function(){setting('year',r.year);},null,{disabled:!fresh,'aria-label':'Inspect year '+r.year})));})))));
    }


    function explainPanel(){
      var evidence=rnExplainHour(result,hourIndex,selected);
      return h('details',{className:'rn-explanation','aria-label':'Selected hour explanation'},
        h('summary',null,'Explain this hour in '+regionInfo.name),
        h('p',{className:'rn-muted'},'Observed limits in this modeled hour. Use a controlled experiment below to test a possible improvement.'),
        h('ul',{className:'rn-observations'},evidence.notes.map(function(n){return h('li',{key:n.code},n.text);})),
        h('div',{className:'rn-ledger'},[['Power into the region',evidence.supply,evidence.sourcePower],['Power accounted for',evidence.uses,evidence.usedPower]].map(function(group){
          return h('div',{key:group[0]},h('h4',null,group[0]),h('dl',null,group[1].map(function(row){return h('div',{key:row.label},h('dt',null,row.label),h('dd',null,fmt(row.value,2)+' GW'));})),h('strong',null,'Total: '+fmt(group[2],2)+' GW'));
        })),
        h('p',{className:'rn-muted'},'Storage: '+fmt(evidence.storageBefore,2)+' GWh at the start → '+fmt(evidence.storageAfter,2)+' GWh at the end. Conversion loss this hour: '+fmt(evidence.storageLoss,2)+' GWh. Exports include electricity lost in transit; imports are measured after those losses. Unserved demand is not an energy use.'));
    }
    function challengePanel(){
      var active=RN_CHALLENGES.find(function(c){return state.challenge&&c.id===state.challenge.id;}),assessment=challengeAssessment;
      var labels={year:'scenario year',hours:'test length',weather:'weather',season:'season',siting:'regional siting',growth:'demand growth',retirement:'fossil retirement',transferLoss:'transfer loss',outageRegion:'outage region',outageStart:'outage start',outageHours:'outage duration'};
      RN_SWEEP_VARIABLES.forEach(function(v){labels[v.key]=v.label.toLowerCase();});
      function start(c){change({settings:rnSettings(c.baseline),challenge:{id:c.id,returnSettings:state.challenge&&state.challenge.returnSettings||s}});setHour(12);setPlaying(false);}
      return h('section',{className:'rn-panel rn-results',style:{marginBottom:14},'aria-label':'Planning challenges'},
        h('details',{open:active?true:undefined},h('summary',null,active?'Planning challenge: '+active.title:'Try a planning challenge'),
          h('p',{className:'rn-muted'},'Start from a difficult portfolio, work within its rules, and compare measurable targets. These are classroom goals for synthetic test days. Your current plan is kept so you can return to it.'),
          h('div',{className:'rn-challenges'},RN_CHALLENGES.map(function(c){return h('div',{key:c.id,className:'rn-challenge-card'},
            h('h3',null,c.title),h('p',null,c.description),button(active&&active.id===c.id?'Restart challenge':'Start challenge',function(){start(c);},null,{'aria-label':(active&&active.id===c.id?'Restart ':'Start ')+c.title}));})),
          active&&assessment&&h('div',{className:'rn-challenge-progress'},
            h('div',{className:'rn-toolbar'},h('h3',null,assessment.passed?'Challenge targets met':'Your progress'),
              h('div',{className:'rn-toolbar'},button('Keep plan and leave challenge',function(){change({challenge:null});}),button('Return to previous plan',function(){change({settings:rnSettings(state.challenge.returnSettings),challenge:null});}))),
            h('p',null,'Allowed changes: '+active.allowed.map(function(k){return labels[k]||k;}).join(', ')+'. All other settings must match the starting plan.'),
            !assessment.valid&&h('p',{className:'rn-stale',role:'status'},'Outside the challenge rules: '+assessment.changed.map(function(k){return labels[k]||k;}).join(', ')+'. ',
              button('Restore required settings',function(){var next=rnSettings(active.baseline);active.allowed.forEach(function(k){next[k]=s[k];});change({settings:next});})),
            h('ul',{className:'rn-targets'},assessment.targets.map(function(t){return h('li',{key:t.metric},
              h('span',{className:'rn-target-state'},t.passed?'Met':'In progress'),h('div',null,h('strong',null,t.label),h('small',null,'Current '+fmt(t.value,2)+' '+t.unit+' · target '+(t.direction==='max'?'≤ ':'≥ ')+fmt(t.target,2)+' '+t.unit)));})),
            h('p',{className:'rn-muted'},assessment.passed?'All targets and rules are satisfied for these test conditions. Save the scenario and explain which change helped most.':'Change the allowed controls or use the experiment bench to compare one variable. Targets update as you explore.'))));
    }
    function sweepChart(study){
      var W=compactState[0]?360:820,H=215,L=compactState[0]?44:50,R=16,B=38,Tp=17,items=study.items,lo=items[0].value,hi=items[items.length-1].value;
      var x=function(v){return L+(v-lo)/Math.max(1,hi-lo)*(W-L-R);},y=function(v){return H-B-v/100*(H-B-Tp);};
      var series=[{key:'renewableShare',label:'Renewable share',color:T.accentHi,dash:undefined},{key:'demandMet',label:'Demand met',color:T.text,dash:'6 4'}];
      return h('div',{className:'rn-sweep-chart'},
        h('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':study.label+' experiment. Solid line: renewable share of demand. Dashed line: demand met. Both use a 0 to 100 percent scale. Exact values and load buttons are in the table below.'},
          [0,25,50,75,100].map(function(v){return h('g',{key:v},h('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:T.border,strokeDasharray:'3 4',opacity:.45}),h('text',{x:L-8,y:y(v)+4,textAnchor:'end',fill:T.muted,fontSize:11},v+'%'));}),
          series.map(function(line){return h('g',{key:line.key},h('polyline',{points:items.map(function(r){return x(r.value)+','+y(r.totals[line.key]);}).join(' '),fill:'none',stroke:line.color,strokeWidth:2.5,strokeDasharray:line.dash}),
            items.map(function(r){return h('circle',{key:r.value,cx:x(r.value),cy:y(r.totals[line.key]),r:r.value===study.baseline.settings[study.variable]?5:3,fill:line.color});}));}),
          h('line',{x1:x(study.baseline.settings[study.variable]),x2:x(study.baseline.settings[study.variable]),y1:Tp,y2:H-B,stroke:T.muted,strokeDasharray:'2 4'}),
          items.filter(function(r){return RN_SWEEP_VARIABLES.find(function(v){return v.key===study.variable;}).values.indexOf(r.value)>=0;}).map(function(r){return h('text',{key:r.value,x:x(r.value),y:H-19,textAnchor:'middle',fill:T.muted,fontSize:11},fmt(r.value));})),
        h('div',{className:'rn-legend'},h('span',null,'Solid: renewable share'),h('span',null,'Dashed: demand met'),h('span',null,'Horizontal axis: '+study.label+' ('+study.unit+') · dotted marker: baseline')),
        h('small',null,'Lines connect sampled runs; values between points are not simulated.'));
    }
    function sweepPanel(){
      var study=sweepState[0],fresh=rnSweepFresh(study,s,sweepVariable[0]);
      var spec=RN_SWEEP_VARIABLES.find(function(v){return v.key===sweepVariable[0];});
      function delta(value){return (value>1e-7?'+':'')+fmt(Math.abs(value)<1e-7?0:value,1);}
      return h('section',{className:'rn-panel rn-results','aria-label':'Controlled experiment bench'},
        h('div',{className:'rn-toolbar'},h('h3',{style:{margin:0}},'What changes when you move one lever?'),
          h('div',{className:'rn-toolbar'},h('label',{className:'rn-select',htmlFor:uid+'sweep'},'Experiment variable',
            h('select',{id:uid+'sweep','aria-label':'Experiment variable',value:sweepVariable[0],onChange:function(e){sweepVariable[1](e.target.value);}},RN_SWEEP_VARIABLES.map(function(v){return h('option',{key:v.key,value:v.key},v.label);}))),
            button(study?'Rerun experiment':'Run controlled experiment',function(){sweepState[1](rnSweep(s,sweepVariable[0]));noticeState[1]('Controlled experiment complete. Each sampled run changes only '+spec.label.toLowerCase()+'.');}))),
        h('p',{className:'rn-muted'},'Use the current plan as a baseline, then test five settings plus your current value. All other assumptions stay fixed. This compares outcomes, not costs or an optimal build plan.'),
        study&&!fresh&&h('p',{className:'rn-stale',role:'status'},'The experiment variable or another assumption changed. Rerun the experiment before loading a result.'),
        study&&h(React.Fragment,null,
          h('p',null,'Baseline: '+study.label+' = '+fmt(study.baseline.settings[study.variable])+' '+study.unit+' · '+study.baseline.settings.year+' · '+study.baseline.settings.season+' · '+study.baseline.settings.weather+' · '+study.baseline.settings.hours+' hours.'),
          sweepChart(study),
          h('div',{className:'rn-table-wrap',tabIndex:0,role:'region','aria-label':'Controlled experiment results'},h('table',null,
            h('caption',null,'Changes are relative to the captured baseline. Negative fossil and unmet-energy changes mean less energy used or unserved. Loading a value keeps the comparison baseline fixed.'),
            h('thead',null,h('tr',null,[study.label+' ('+study.unit+')','Renewable share','Demand met','Fossil change GWh','Unmet change GWh','Curtailed change GWh','Inspect'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
            h('tbody',null,study.items.map(function(r){return h('tr',{key:r.value,'data-baseline':r.value===study.baseline.settings[study.variable]?'true':undefined},
              h('th',{scope:'row'},fmt(r.value)+(r.value===study.baseline.settings[study.variable]?' · baseline':'')),
              h('td',null,fmt(r.totals.renewableShare)+'%'),h('td',null,fmt(r.totals.demandMet,2)+'%'),
              h('td',null,delta(r.delta.fossil)),h('td',null,delta(r.delta.unmet)),h('td',null,delta(r.delta.curtail)),
              h('td',null,button('Load value',function(){setting(study.variable,r.value);setPlaying(false);setHour(r.totals.peakUnmet>1e-6?r.totals.worstHour:r.totals.peakFossilHour);},null,
                {disabled:!fresh,'aria-label':'Load '+study.label+' '+r.value+' '+study.unit})));}))))),
        !study&&h('div',{className:'rn-coach'},'Start with battery duration. Does adding hours of storage help when the batteries never charge? Compare the winter lull with a sunny summer test.'));
    }

    function map(){
      var outline='M30 75 L150 65 270 75 365 65 420 85 500 50 550 20 565 70 520 150 495 220 530 295 500 280 470 230 360 225 320 275 290 260 260 220 165 205 100 170 65 130 Z';
      return h('svg',{viewBox:'0 0 600 320',role:'img','aria-label':'Schematic contiguous-US map with six illustrative regions. Use the region buttons below to inspect measurements.',className:'rn-flat-map'},
        h('path',{d:outline,fill:'#47786b',stroke:'#9ec7b5',strokeWidth:2}),
        RN_REGIONS.map(function(r,i){var x=300+r.x*25,y=135+r.z*23,row=current.regions[i];
          return h('g',{key:r.id},h('path',{d:'M'+x+' '+y+' L365 160',stroke:row.linkOffline?'#fc9d92':row.exports>.1?'#6effd3':row.imports>.1?'#f4c55f':'#6a989c',fill:'none',strokeWidth:2,strokeDasharray:row.linkOffline?'5 4':undefined}),
            h('circle',{cx:x,cy:y,r:r.id===selected?13:9,fill:row.unmet>.01?'#fc9d92':r.id===selected?'#ffe0a0':'#c5f3df',stroke:'#173b42',strokeWidth:2}),
            h('text',{x:x,y:y-20,textAnchor:'middle',fill:'#fff',fontSize:13,fontWeight:700,stroke:'#153844',strokeWidth:3,paintOrder:'stroke'},r.name));}));
    }
    function chart(){
      var W=880,H=210,L=46,R=16,top=15,bottom=32,max=Math.max.apply(null,result.hours.map(function(r){return r.demand;}))*1.12;
      var x=function(i){return L+i/(s.hours-1)*(W-L-R);},y=function(v){return H-bottom-v/max*(H-top-bottom);};
      var bands=[
        {label:'Renewables delivered',color:'#2bbf96',value:function(r){return r.servedRenewable;}},
        {label:'Nuclear delivered',color:'#70a8e3',value:function(r){return Math.max(0,r.demand-r.unmet-r.fossil-r.servedRenewable);}},
        {label:'Fossil backup',color:'#a89882',value:function(r){return r.fossil;}},
        {label:'Unmet demand',color:'#e57069',value:function(r){return r.unmet;}}
      ],base=result.hours.map(function(){return 0;});
      var paths=bands.map(function(b){
        var upper=base.map(function(v,i){return v+b.value(result.hours[i]);});
        var points=upper.map(function(v,i){return x(i)+','+y(v);}).concat(base.map(function(v,i){return x(i)+','+y(v);}).reverse()).join(' ');
        base=upper;return h('polygon',{key:b.label,points:points,fill:b.color});
      });
      return h('div',null,h('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':s.hours+'-hour demand coverage chart, '+fmt(total.renewableShare)+' percent of demand supplied by renewables, '+total.gapHours+' hours with unmet demand. Use the hour slider or data table for values.',className:'rn-chart'},
        [0,.5,1].map(function(v){return h('g',{key:v},h('line',{x1:L,x2:W-R,y1:y(v*max),y2:y(v*max),stroke:T.border,strokeDasharray:'3 4',opacity:.35}),h('text',{x:L-7,y:y(v*max)+4,textAnchor:'end',fill:T.muted,fontSize:11},Math.round(v*max)));}),
        paths,h('polyline',{points:result.hours.map(function(r,i){return x(i)+','+y(r.demand);}).join(' '),fill:'none',stroke:T.text,strokeWidth:2,strokeDasharray:'5 3'}),
        (s.hours===168?[0,24,48,72,96,120,144,167]:[0,12,24,36,48,60,71]).map(function(i){return h('text',{key:i,x:x(i),y:H-9,textAnchor:'middle',fill:T.muted,fontSize:11},i===0?'0h':i+'h');}),
        h('text',{x:9,y:12,fill:T.muted,fontSize:11},'GW'),
        h('line',{x1:x(hourIndex),x2:x(hourIndex),y1:top,y2:H-bottom,stroke:T.text,strokeWidth:2}),
        h('circle',{cx:x(hourIndex),cy:y(current.demand),r:4,fill:T.text})),
        h('div',{className:'rn-legend'},bands.map(function(b){return h('span',{key:b.label},h('i',{style:{background:b.color}}),b.label);}),h('span',null,'Dashed line: demand')));
    }
    var lesson=total.gapHours>0?'The portfolio leaves demand unmet. Test slower fossil retirement, lower demand, or more capacity that is available during the shortage hours.':
      total.curtail>500?'Some generation cannot be used. Compare stronger regional links with longer storage before adding more generation.':
      total.fossil/total.demand>.3?'Fossil backup is still doing substantial work. Scrub to the evening, then test wind, storage duration, or efficiency.':
      'This portfolio covers this test with limited fossil backup. Test a winter weather lull before drawing a wider conclusion.';
    return h('section',{className:'rn-transition','aria-label':'US energy transition sandbox',style:{'--rn-bg':T.bg,'--rn-card':T.card,'--rn-alt':T.cardAlt,'--rn-text':T.text,'--rn-muted':T.muted,'--rn-border':T.border,'--rn-accent':T.accentHi}},
      h('style',null,`
        .rn-transition{padding:20px;max-width:1320px;margin:auto;color:var(--rn-text);font:14px/1.5 system-ui,sans-serif}
        .rn-transition *{box-sizing:border-box}.rn-transition button,.rn-transition select,.rn-transition textarea{font:inherit}
        .rn-transition button{border:1px solid var(--rn-border);background:var(--rn-card);color:var(--rn-text);border-radius:8px;padding:8px 12px;cursor:pointer;min-height:38px}
        .rn-transition button:hover{background:var(--rn-alt)}.rn-transition button[aria-pressed=true]{background:var(--rn-text);color:var(--rn-bg)}
        .rn-transition button:disabled{opacity:.55;cursor:default}.rn-transition :is(button,input,select,textarea,summary):focus-visible{outline:3px solid var(--rn-accent);outline-offset:3px}
        .rn-transition h2{font-size:25px;letter-spacing:-.7px;margin:0}.rn-transition h3{font-size:15px;margin:0 0 12px}.rn-transition p{margin:6px 0 14px}
        .rn-transition small,.rn-transition .rn-muted{color:var(--rn-muted)}.rn-topline,.rn-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        .rn-topline{margin-bottom:14px}.rn-kicker{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:750;color:var(--rn-accent)}
        .rn-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
        .rn-metric{padding:13px 16px;background:var(--rn-card);border:1px solid var(--rn-border);border-radius:12px}
        .rn-metric strong{display:block;font-size:25px;letter-spacing:-.6px}.rn-metric span{display:block;font-size:12px;color:var(--rn-muted)}
        .rn-workspace{display:grid;grid-template-columns:280px minmax(0,1fr);gap:14px}.rn-inputs{align-self:start}.rn-panel{padding:16px;background:var(--rn-card);border:1px solid var(--rn-border);border-radius:12px;min-width:0}
        .rn-control{margin:0 0 15px}.rn-control label{display:flex;justify-content:space-between;gap:8px;font-size:12px}.rn-control input{width:100%;accent-color:var(--rn-accent);height:22px;margin:5px 0 0}
        .rn-control small{display:block;font-size:11px}.rn-control strong{white-space:nowrap}.rn-year{display:flex;align-items:center;gap:20px;background:var(--rn-alt);border:1px solid var(--rn-border);border-radius:12px;padding:12px 16px}
        .rn-year .rn-control{flex:1;margin:0}.rn-year-number{font-size:30px;font-weight:750;line-height:1.1}.rn-year small{font-size:11px}
        .rn-select{display:flex;flex-direction:column;gap:5px;font-size:12px}.rn-select select{width:100%;color:var(--rn-text);background:var(--rn-card);border:1px solid var(--rn-border);border-radius:7px;padding:8px}
        .rn-conditions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}
        .rn-stage{overflow:hidden;background:#102b3a;border:1px solid var(--rn-border);border-radius:12px;position:relative}
        .rn-stage-title{display:flex;justify-content:space-between;padding:13px 16px;color:#ecfff7;gap:12px;font-size:12px}
        .rn-stage-title small{color:#b9d4d4}.rn-webgl{width:100%;height:350px}.rn-landscape{position:relative}
        .rn-scene-status{position:absolute;inset:30% 15% auto;color:#effff9;text-align:center;background:#102b3a;padding:14px;border-radius:8px}
        .rn-camera{display:flex;gap:5px;flex-wrap:wrap;padding:8px 12px}.rn-camera button{font-size:10px;padding:5px 8px;min-height:32px;background:#153c48;color:#eefbf9;border-color:#668d94}
        .rn-camera button:hover{background:#285563}.rn-flat-map{width:100%;height:390px;display:block}
        .rn-region-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0}.rn-region-buttons button{text-align:left;font-size:11px;line-height:1.4;padding:8px}
        .rn-region-buttons span{display:block;font-size:10px}.rn-inspector{padding:12px 14px;background:var(--rn-alt);border-radius:10px}
        .rn-inspector dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0 0}.rn-inspector dt{font-size:10px;color:var(--rn-muted)}.rn-inspector dd{font-size:13px;font-weight:700;margin:0}
        .rn-presets{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 15px}.rn-presets button{font-size:11px;padding:6px 9px}
        .rn-transition details{margin-top:14px}.rn-transition summary{cursor:pointer;font-weight:650;padding:5px 0}
        .rn-time{display:flex;gap:12px;align-items:center;margin:12px 0}.rn-time .rn-control{flex:1;margin:0}
        .rn-chart{display:block;width:100%;min-height:150px}.rn-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--rn-muted)}.rn-legend i{display:inline-block;width:10px;height:10px;margin-right:5px;border-radius:2px}
        .rn-results{margin-top:14px}.rn-coach{padding:13px 16px;border-left:3px solid var(--rn-accent);background:var(--rn-alt);border-radius:0 8px 8px 0;margin:14px 0}
        .rn-notes{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.rn-notes label{font-size:12px;font-weight:600}
        .rn-notes textarea{display:block;width:100%;resize:vertical;min-height:85px;margin-top:5px;border:1px solid var(--rn-border);border-radius:8px;padding:9px;background:var(--rn-bg);color:var(--rn-text)}
        .rn-table-wrap{overflow:auto;max-height:340px}.rn-transition table{border-collapse:collapse;width:100%;font-size:12px}
        .rn-transition th,.rn-transition td{padding:8px 10px;border-bottom:1px solid var(--rn-border);text-align:right;white-space:nowrap}.rn-transition th:first-child,.rn-transition td:first-child{text-align:left}
        .rn-transition caption{text-align:left;padding:10px 0;color:var(--rn-muted)}.rn-transition a{color:var(--rn-accent);text-decoration:underline}.rn-assumptions{font-size:12px}.rn-siting{padding:12px;background:var(--rn-card);border:1px solid var(--rn-border);border-radius:10px}.rn-siting p,.rn-siting small{font-size:12px}.rn-storage-chart{margin-top:20px;padding-top:14px;border-top:1px solid var(--rn-border)}.rn-storage-chart svg{display:block;width:100%;min-height:105px}.rn-diagnostic-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.rn-diagnostic-grid strong{display:block;font-size:21px}.rn-stale{padding:10px;border-left:3px solid var(--rn-accent);background:var(--rn-alt)}
        @media(max-width:850px){.rn-workspace{grid-template-columns:1fr}.rn-inputs{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.rn-inputs h3,.rn-inputs details{grid-column:1/-1}.rn-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:480px){.rn-conditions{grid-template-columns:1fr}.rn-transition{padding:12px}.rn-transition h2{font-size:22px}.rn-inputs{display:block}.rn-webgl{height:270px}.rn-flat-map{height:280px}.rn-year{gap:12px}.rn-region-buttons{grid-template-columns:1fr 1fr}.rn-inspector dl{grid-template-columns:1fr 1fr}.rn-notes{grid-template-columns:1fr}.rn-metric{padding:10px}.rn-metric strong{font-size:23px}.rn-topline{align-items:flex-start}}

        .rn-explanation{padding-top:10px;border-top:1px solid var(--rn-border)}.rn-explanation p{font-size:12px}.rn-observations{padding-left:20px;margin:12px 0;font-size:12px}.rn-observations li{margin:7px 0}
        .rn-ledger{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rn-ledger h4{font-size:12px;margin:0 0 7px}.rn-ledger dl{display:block;margin:0 0 8px}.rn-ledger dl>div{display:flex;justify-content:space-between;gap:10px;padding:3px 0}.rn-ledger dt{font-size:11px}.rn-ledger dd{white-space:nowrap;font-size:11px}.rn-ledger strong{font-size:12px}
        .rn-challenges{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rn-challenge-card{border:1px solid var(--rn-border);border-radius:9px;padding:14px;background:var(--rn-alt);display:flex;flex-direction:column}.rn-challenge-card p{font-size:12px;flex:1}.rn-challenge-card h3{font-size:14px}.rn-challenge-card button{align-self:flex-start}.rn-challenge-progress{margin-top:16px;padding-top:16px;border-top:1px solid var(--rn-border)}
        .rn-targets{list-style:none;padding:0;margin:14px 0;display:grid;gap:8px}.rn-targets li{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--rn-border);border-radius:8px}.rn-targets strong{font-size:12px}.rn-targets small{display:block;font-size:11px}.rn-target-state{padding:4px 8px;background:var(--rn-alt);border-radius:5px;font-size:11px;min-width:82px;text-align:center}
        .rn-sweep-chart svg{display:block;width:100%;min-height:140px}.rn-sweep-chart{margin:14px 0}.rn-sweep-chart small{display:block;margin-top:8px}.rn-transition tr[data-baseline=true]{background:var(--rn-alt)}
        @media(max-width:850px){.rn-challenges{grid-template-columns:1fr}.rn-challenge-card{display:block}}@media(max-width:480px){.rn-ledger{grid-template-columns:1fr}.rn-targets li{align-items:flex-start}}

        @media(prefers-reduced-motion:reduce){.rn-transition *{scroll-behavior:auto}}
      `),
      h('div',{className:'rn-topline'},h('div',null,h('div',{className:'rn-kicker'},'Renewables Lab / systems studio'),h('h2',null,'US transition sandbox')),
        button('← Lab library',props.onBack)),
      h('p',{className:'rn-muted'},'Build a portfolio. Follow the electricity. Test changing weather across six illustrative regions.'),
      h('div',{className:'rn-year'},h('div',null,h('div',{className:'rn-year-number'},s.year),h('small',null,'Scenario year')),
        slider('year','Adoption timeline',2025,2050,1,'','2025 starting portfolio → 2050 scenario')),
      h('div',{className:'rn-metrics','aria-label':s.hours+'-hour scenario summary'},
        [['Renewable share of demand',fmt(total.renewableShare)+'%','Delivered, including stored renewables'],
          ['Demand met',fmt(total.demandMet,2)+'%',total.gapHours+' of '+s.hours+' hours have a shortfall'],
          ['Fossil backup used',fmt(total.fossil/1000,2)+' TWh','Across this '+(s.hours/24)+'-day test'],
          ['Generation curtailed',fmt(total.curtail/1000,2)+' TWh','Surplus that could not be used or stored']].map(function(m){return h('div',{className:'rn-metric',key:m[0]},h('span',null,m[0]),h('strong',null,m[1]),h('span',null,m[2]));})),
      h('div',{className:'rn-presets','aria-label':'Scenario starting points'},
        button('Balanced build',function(){change({settings:Object.assign({},RN_DEFAULT,{year:s.year})});}),
        button('Solar sprint',function(){change({settings:Object.assign({},RN_DEFAULT,{year:s.year,solarBuild:65,windBuild:8,batteryBuild:5,transmission:10})});}),
        button('Wind + connected regions',function(){change({settings:Object.assign({},RN_DEFAULT,{year:s.year,solarBuild:30,windBuild:45,batteryBuild:18,transmission:65,duration:8})});})),
      challengePanel(),
      h('div',{className:'rn-workspace'},
        h('aside',{className:'rn-panel rn-inputs','aria-label':'Portfolio controls'},h('h3',null,'Build each year'),
          slider('solarBuild','New solar',0,80,5,'GW/yr'),
          slider('windBuild','New wind',0,60,3,'GW/yr'),
          slider('batteryBuild','New battery power',0,40,2,'GW/yr'),
          slider('duration','Battery duration',1,24,1,'h','Energy capacity = power × duration.'),
          slider('transmission','Link capacity per region',0,100,5,'GW','A shared hub connects all six regions.'),
          slider('efficiency','Demand reduction',0,30,1,'%','Applied to the entire selected year.'),
          h('details',null,h('summary',null,'Demand & retirement'),
            slider('growth','Annual demand growth',0,3,.25,'%/yr'),
            slider('retirement','Fossil capacity retired',0,16,1,'GW/yr'),
            slider('flexDemand','Evening demand shifted to midday',0,30,5,'%','Moves use from 17:00–21:00 to 10:00–14:00 local time; total energy is unchanged.'),
            h('p',{className:'rn-muted'},'Hydro and nuclear capacity remain fixed. New solar and wind are distributed using illustrative resource weights.'),
            h('p',null,'Installed in '+s.year+': '+fmt(capacity.solar)+' GW solar · '+fmt(capacity.wind)+' GW wind · '+fmt(capacity.batteryPower)+' GW / '+fmt(capacity.batteryEnergy)+' GWh batteries · '+fmt(capacity.fossil)+' GW fossil.')),
          h('details',null,h('summary',null,'Network & storage resilience'),
            slider('transferLoss','End-to-end transfer loss',0,15,1,'%','Illustrative loss on regional exports, applied once per transfer.'),
            slider('reserve','Storage reserve target',0,50,5,'%','Held during routine dispatch; released when fossil capacity cannot cover demand.'),
            choose('outageRegion','Region with a link outage',[['none','No outage']].concat(RN_REGIONS.map(function(r){return [r.id,r.name];}))),
            s.outageRegion!=='none'&&h('div',{style:{marginTop:12}},slider('outageStart','Outage starts at hour',0,s.hours-1,1,'h'),slider('outageHours','Outage duration',1,Math.min(72,s.hours-s.outageStart),1,'h')),
            h('small',null,'An outage disconnects the region from the hub. Its local generation and storage still operate.'))),
        h('div',{style:{minWidth:0}},
          h('div',{className:'rn-toolbar'},h('h3',{style:{margin:0}},'Follow a day on the grid'),h('div',{className:'rn-toolbar'},
            button('3D landscape',function(){modeState[1]('3d');},mode==='3d'),
            button('Map',function(){modeState[1]('map');},mode==='map'),
            mode==='3d'&&button('Turbine motion',function(){motionState[1](!motion);},motion))),
          h('div',{className:'rn-conditions'},
            choose('hours','Test length',[[72,'Three days · 72 hours'],[168,'Seven days · 168 hours']]),
            choose('weather','Weather test',[['fair','Typical variability'],['lull','Cloudy + low wind throughout'],['heatwave','Heat wave: higher demand']]),
            choose('season','Season',[['summer','Summer'],['winter','Winter'],['spring','Spring']])),
          h('div',{className:'rn-stage'},
            h('div',{className:'rn-stage-title'},h('strong',null,'Day '+(Math.floor(hourIndex/24)+1)+' · '+String(hourIndex%24).padStart(2,'0')+':00 Eastern'),h('small',null,'Schematic contiguous US')),
            mode==='3d'?h(RenewablesLandscape,{React:React,hour:current,capacity:capacity,selected:selected,onPick:regionState[1],motion:motion,network:true}):map(),
            h('div',{className:'rn-stage-title'},h('small',null,'Mint: exports · gold: imports · red: offline'),h('small',null,'Click a region · drag to rotate · symbols track regional capacity'))),
          h('div',{className:'rn-region-buttons','aria-label':'Inspect a region'},RN_REGIONS.map(function(r,i){var row=current.regions[i];return button(h(React.Fragment,null,r.name,h('span',null,fmt(row.demand)+' GW demand · '+(row.linkOffline?'link offline':row.unmet>.01?'shortfall':row.imports>.1?'importing':row.exports>.1?'exporting':'local balance'))),function(){regionState[1](r.id);},r.id===selected,{key:r.id,'aria-label':'Inspect '+r.name});})),
          h('div',{className:'rn-inspector','aria-label':'Selected region measurements'},h('strong',null,regionInfo.name+' · '+String(((hourIndex+regionInfo.offset)%24+24)%24).padStart(2,'0')+':00 local scenario time'),
            h('dl',null,[['Solar + wind',fmt(region.solar+region.wind)+' GW'],['Hydro + nuclear',fmt(region.hydro+region.nuclear)+' GW'],['Fossil backup',fmt(region.fossil)+' GW'],['Unmet demand',fmt(region.unmet)+' GW'],
              ['Imports / exports',fmt(region.imports)+' / '+fmt(region.exports)+' GW'],['Stored energy',fmt(region.battery)+' GWh'],['Charge / discharge',fmt(region.charge)+' / '+fmt(region.discharge)+' GW'],['Curtailed',fmt(region.curtail)+' GW'],['Link state',region.linkOffline?'Offline':region.linkCongested?'At capacity':'Available'],['Reserve released',fmt(region.reserveRelease)+' GW']].map(function(pair){return h('div',{key:pair[0]},h('dt',null,pair[0]),h('dd',null,pair[1]));})),explainPanel()),sitingPanel())),
      h('section',{className:'rn-panel rn-results','aria-label':'Hourly energy accounting'},
        h('div',{className:'rn-toolbar'},h('h3',{style:{margin:0}},'Can this portfolio cover demand?'),h('small',null,'One-hour steps · '+s.hours+'-hour test')),
        h('div',{className:'rn-time'},button(playing?'Pause timeline':'Play timeline',function(){if(!playing&&hourIndex===s.hours-1)setHour(0);setPlaying(!playing);},playing),
          h('div',{className:'rn-control'},h('label',{htmlFor:uid+'hour'},'Inspect hour',h('strong',null,'Day '+(Math.floor(hourIndex/24)+1)+' · '+String(hourIndex%24).padStart(2,'0')+':00')),
            h('input',{id:uid+'hour',type:'range',min:0,max:s.hours-1,step:1,value:hourIndex,onChange:function(e){setPlaying(false);setHour(Number(e.target.value));}}))),
        chart(),storageChart(),
        h('p',{className:'rn-muted',style:{fontSize:12,marginTop:12}},'Storage starts empty; ending energy: '+fmt(total.endBattery)+' GWh. Conversion losses: '+fmt(total.loss)+' GWh. Transmission losses: '+fmt(total.transmissionLoss)+' GWh. Regional transfers delivered: '+fmt(total.transfer)+' GWh. Nuclear is low-carbon but is not renewable.'),
        h('div',{className:'rn-coach'},h('strong',null,'What to investigate next'),h('div',null,lesson)),
        h('details',null,h('summary',null,'Read hourly data'),
          h('div',{className:'rn-table-wrap',tabIndex:0,'aria-label':'Scrollable hourly energy table'},
            h('table',null,h('caption',null,'Hourly power in GW; stored energy in GWh. Each row spans one hour.'),
              h('thead',null,h('tr',null,['Hour (Eastern)','Demand','Renewables generated','Nuclear generated','Fossil','Charge','Discharge','Curtailed','Unmet','Stored GWh','Transfer loss','Shifted demand','Reserve release'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
              h('tbody',null,result.hours.map(function(r){return h('tr',{key:r.hour},h('th',{scope:'row'},'D'+(Math.floor(r.hour/24)+1)+' '+String(r.hour%24).padStart(2,'0')+':00'),
                [r.demand,r.renewable,r.nuclear,r.fossil,r.charge,r.discharge,r.curtail,r.unmet,r.battery,r.transmissionLoss,r.shifted,r.reserveRelease].map(function(v,i){return h('td',{key:i},fmt(v));}));})))))),
      diagnosticPanel(),sweepPanel(),stressPanel(),pathwayPanel(),
      h('section',{className:'rn-panel rn-results','aria-label':'Investigation notebook'},
        h('div',{className:'rn-toolbar'},h('h3',{style:{margin:0}},'Compare your experiments'),h('div',{className:'rn-toolbar'},button('Save scenario',save),button('Export investigation',download))),
        h('p',{className:'rn-muted'},'Save a baseline, change one variable, and compare the evidence. Up to four scenarios are kept.'),
        h('div',{role:'status','aria-live':'polite','aria-atomic':'true'},notice),
        snapshots.length>0&&h('div',{className:'rn-table-wrap',tabIndex:0,role:'region','aria-label':'Saved scenario results'},h('table',null,h('caption',null,'Saved plans are recalculated with model version 2 for consistent accounting. Restore a scenario to inspect its settings.'),
          h('thead',null,h('tr',null,['Scenario','Year / test','Renewable demand share','Fossil TWh','Shortfall hours','Changes from baseline','Actions'].map(function(v){return h('th',{key:v,scope:'col'},v);}))),
          h('tbody',null,snapshots.map(function(row,i){return h('tr',{key:i},h('th',{scope:'row'},row.label),
            h('td',null,row.settings.year+' / '+row.settings.season+' / '+row.settings.weather+' / '+row.settings.hours+'h'),
            h('td',null,fmt(row.totals.renewableShare)+'%'),h('td',null,fmt(row.totals.fossil/1000,2)),h('td',null,row.totals.gapHours),h('td',{style:{whiteSpace:'normal',minWidth:200,maxWidth:320}},differences(rnSettings(row.settings))),
            h('td',null,button('Restore',function(){change({settings:row.settings,prediction:row.prediction||'',reflection:row.reflection||''});},null,{'aria-label':'Restore '+row.label}),
              ' ',button('Remove',function(){change({snapshots:snapshots.filter(function(_,idx){return idx!==i;})});},null,{'aria-label':'Remove '+row.label})));})))),
        h('div',{className:'rn-notes'},h('label',null,'My prediction',h('textarea',{'aria-label':'My prediction',value:state.prediction||'',maxLength:3000,placeholder:'If I change… I expect… because…',onChange:function(e){change({prediction:e.target.value});}})),
          h('label',null,'What the evidence shows',h('textarea',{'aria-label':'What the evidence shows',value:state.reflection||'',maxLength:5000,placeholder:'Compare a number, explain the tradeoff, and name a limitation.',onChange:function(e){change({reflection:e.target.value});}})))),
      h('details',{className:'rn-panel rn-assumptions'},h('summary',null,'Model assumptions & sources'),
        h('p',null,'This is an exploratory classroom model of electricity, not a forecast or a grid planning tool. The six regions, resource weights, build rates, and demand profiles are invented teaching assumptions. Alaska, Hawaii, territories, and cross-border exchanges are excluded. Region markers are schematic, not actual grid boundaries.'),
        h('p',null,'Starting capacity in 2025: 240 GW solar, 160 GW wind, 80 GW hydro, 95 GW nuclear, 550 GW fossil, and 30 GW batteries. The demand scale is 500 GW before hourly shaping, growth, and efficiency. These figures are illustrative and are not calibrated to EIA statistics.'),
        h('p',null,'Each scenario year adds constant annual solar, wind, and battery capacity and retires fossil capacity. It then reruns the same synthetic three-day or seven-day weather sequence; years between endpoints are not continuously simulated. Hydro and nuclear capacity stay fixed.'),
        h('p',null,'Dispatch order: local renewables and nuclear, surplus transfers, batteries, then fossil backup. The hub has one capacity-limited link per region, with an adjustable end-to-end transfer loss (default 3%, a teaching assumption). Loss is applied to exported energy once. A timed link outage isolates one region; it is not a model of the real US interconnections. New construction is distributed by normalized regional siting weights; existing capacity is fixed. Demand flexibility shifts selected evening use to midday, conserving each region’s daily energy. Storage reserves are released only after available fossil capacity is used. Batteries start empty with 88% round-trip efficiency split equally between charging and discharging, and separate power and energy limits. Stored renewable energy is tracked to avoid counting nuclear discharge as renewable.'),
        h('p',null,'No prices, investment budgets, land use, permitting, ramp rates, random plant outages, frequency dynamics, or lifecycle emissions are modeled. Coverage across these test days is not annual reliability. All hourly demand and output profiles are deterministic; the weather tests are not meteorological forecasts.'),
        h('p',null,'For demand-shifting concepts see ',h('a',{href:'https://www.energy.gov/cmei/systems/integrating-solar-day-day-system-operations',target:'_blank',rel:'noopener noreferrer'},'DOE: Integrating solar into system operations'),'. For the role of transmission see ',h('a',{href:'https://www.eia.gov/energyexplained/electricity/delivery-to-consumers.php',target:'_blank',rel:'noopener noreferrer'},'EIA: Delivery to consumers'),'. The model’s transfer-loss setting is an assumption, not a measured national loss rate.'),
        h('p',null,'For observed generation statistics see ',h('a',{href:'https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php',target:'_blank',rel:'noopener noreferrer'},'EIA: Electricity in the United States'),'. For power, energy, and storage losses see ',h('a',{href:'https://www.eia.gov/energyexplained/electricity/energy-storage-for-electricity-generation.php',target:'_blank',rel:'noopener noreferrer'},'EIA: Energy storage for electricity generation'),'. These sources explain concepts; they do not validate this model.')));
  }

  window.StemLab.registerTool('renewablesLab', {
    name: 'Renewables Lab',
    icon: '⚡',
    category: 'physics-chemistry',
    description: 'Explore a 3D US energy transition sandbox with hourly regional dispatch, storage, and weather stress tests. Learn how each renewable energy source works — the physics and engineering. Solar PV, wind (Betz limit), hydro (head + flow), geothermal, CSP, wave/tidal, biomass, and storage. Live sliders driven by the real formulas. Cited to NREL, IEA, IRENA, DOE.',
    tags: ['energy', 'physics', 'engineering', 'climate', 'renewables', 'solar', 'wind', 'hydro', 'geothermal', 'maine'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;

      var d = (ctx.toolData && ctx.toolData['renewablesLab']) || {};
      var upd = function(key, val) { ctx.update('renewablesLab', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('renewablesLab', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[Renewables]', msg); };

      var view = d.view || 'menu';
      var modulesVisited = d.modulesVisited || {};
      var badges = d.badges || {};
      var quizMastery = d.quizMastery || {};
      var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

      // ── Hydration + Canvas-survival persistence ──
      // Window slot wins over localStorage on mount (host's handleLoadProject
      // populates the slot from a project JSON load). The StemLab host's
      // localStorage block does not include renewablesLab, so without this
      // every reload wipes badges + module visits + quiz mastery.
      var React = ctx.React;
      var _renHydrated = React.useRef(false);
      if (!_renHydrated.current) {
        _renHydrated.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowRenewablesLab) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('renewablesLab.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.badges && d.badges === undefined) merge.badges = seed.badges;
            if (seed.modulesVisited && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (seed.quizMastery && d.quizMastery === undefined) merge.quizMastery = seed.quizMastery;
            if (seed.installerCo && d.installerCo === undefined) merge.installerCo = seed.installerCo;
            if (seed.transitionLab && d.transitionLab === undefined) merge.transitionLab = seed.transitionLab;
            if (seed.energyLab && d.energyLab === undefined) merge.energyLab = seed.energyLab;
            if (Object.keys(merge).length > 0) {
              Object.keys(merge).forEach(function (k) { upd(k, merge[k]); });
            }
          }
        } catch (e) {}
      }

      // First-correct celebration state (auto-clears after 3.5s).
      var _renCeleb = React.useState(null);
      var renCeleb = _renCeleb[0];
      var setRenCeleb = _renCeleb[1];

      // Mirror persistent state to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = {
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            quizMastery: d.quizMastery || {},
            installerCo: d.installerCo || null,
            transitionLab: d.transitionLab || null,
            energyLab: d.energyLab || null,
            _ts: Date.now()
          };
          window.__alloflowRenewablesLab = snapshot;
          try { localStorage.setItem('renewablesLab.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.badges, d.modulesVisited, d.quizMastery, d.installerCo, d.transitionLab, d.energyLab]);

      // Hot-reload from project-JSON load mid-session.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowRenewablesLab || {};
            if (w.badges) upd('badges', w.badges);
            if (w.modulesVisited) upd('modulesVisited', w.modulesVisited);
            if (w.quizMastery) upd('quizMastery', w.quizMastery);
            if (w.transitionLab) upd('transitionLab', w.transitionLab);
            if (w.energyLab) upd('energyLab', w.energyLab);
          } catch (e) {}
        }
        window.addEventListener('alloflow-renewableslab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-renewableslab-restored', onRestore); };
      }, []);

      // Sim state defaults
      var simWindV = d.simWindV != null ? d.simWindV : 8;        // m/s
      var simWindR = d.simWindR != null ? d.simWindR : 40;       // rotor radius m
      var simWindCp = d.simWindCp != null ? d.simWindCp : 0.40;  // power coef
      var simSolarIrr = d.simSolarIrr != null ? d.simSolarIrr : 800; // W/m²
      var simSolarArea = d.simSolarArea != null ? d.simSolarArea : 20; // m²
      var simSolarEff = d.simSolarEff != null ? d.simSolarEff : 0.20;
      var simSolarTilt = d.simSolarTilt != null ? d.simSolarTilt : 0; // deg from optimal
      var simHydroHead = d.simHydroHead != null ? d.simHydroHead : 30; // m
      var simHydroFlow = d.simHydroFlow != null ? d.simHydroFlow : 5;  // m³/s
      var simHydroEff = d.simHydroEff != null ? d.simHydroEff : 0.90;
      var simGeoSurfC = d.simGeoSurfC != null ? d.simGeoSurfC : 10;
      var simGeoGrad = d.simGeoGrad != null ? d.simGeoGrad : 30;
      var simGeoDepth = d.simGeoDepth != null ? d.simGeoDepth : 3;
      // Energy mix designer (% shares)
      var mixSolar = d.mixSolar != null ? d.mixSolar : 30;
      var mixWind = d.mixWind != null ? d.mixWind : 30;
      var mixHydro = d.mixHydro != null ? d.mixHydro : 10;
      var mixGeo = d.mixGeo != null ? d.mixGeo : 5;
      var mixNuclear = d.mixNuclear != null ? d.mixNuclear : 10;
      var mixGas = d.mixGas != null ? d.mixGas : 15;
      // Maine home solar payback calc
      var mhRoofM2 = d.mhRoofM2 != null ? d.mhRoofM2 : 30;       // m² of usable south-facing roof
      var mhBillMo = d.mhBillMo != null ? d.mhBillMo : 150;     // monthly electric bill ($)
      var mhRebatePct = d.mhRebatePct != null ? d.mhRebatePct : 30; // federal ITC % (currently 30 through 2032)
      // AI Practice state
      var aiScenarioId = d.aiScenarioId || null;
      var aiResponse = d.aiResponse || '';
      var aiCritique = d.aiCritique || null; // { text, source }
      var aiLoadingCritique = !!d.aiLoadingCritique;
      var diagramView = d.diagramView || 'solarPv';
      // Solar PV view sub-tab + day-curve sim state
      var solarPvMode = d.solarPvMode || 'calc';      // 'calc' | 'curve'
      var simDayLat = d.simDayLat != null ? d.simDayLat : 44;     // Maine ~44°N
      var simDayOfYear = d.simDayOfYear != null ? d.simDayOfYear : 80; // ~spring equinox
      // Plant tour filter
      var plantFilter = d.plantFilter || 'all';
      // Print Pack: which sections selected (default all on)
      var printSel = d.printSel || { sources: true, compare: true, glossary: true, myths: false, quizQ: false, quizA: false, ngss: true, activities: false };

      function awardBadge(id, label) {
        if (badges[id]) return;
        // Defer the state write + toast out of render: awardBadge is called inline during render in
        // ~14 views, and upd()/addToast() during render is a React anti-pattern (warns, extra pass).
        // The synchronous guard above still prevents scheduling a duplicate for an already-earned badge.
        setTimeout(function () {
          var nextBadges = Object.assign({}, badges);
          nextBadges[id] = { earned: new Date().toISOString(), label: label };
          upd('badges', nextBadges);
          addToast('🏅 Badge: ' + label);
          rnAnnounce('Badge earned: ' + label);
        }, 0);
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
        // Award explorer badge once enough modules visited
        var count = Object.keys(nextVisited).length;
        if (count >= 4) awardBadge('renewables_explorer', 'Renewables Explorer');
        if (count >= 8) awardBadge('renewables_pro', 'Energy-Mix Designer');
      }

      // Theme — green/teal clean-energy palette (distinct from firstResponse red).
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var T = isContrast ? {
        bg: '#000000', card: '#000000', cardAlt: '#0a0a0a', border: '#fbbf24',
        text: '#ffffff', muted: '#ffffff', dim: '#ffffff',
        accent: '#fbbf24', accentHi: '#ffff00', warm: '#ffff00',
        warn: '#ffff00', danger: '#ff6b6b', link: '#00ffff'
      } : isDark ? {
        bg: '#0f1f1c', card: '#1a302a', cardAlt: '#0d1916', border: '#2f5247',
        text: '#ecfeff', muted: '#cbe8e0', dim: '#88a89e',
        accent: '#10b981', accentHi: '#86efac', warm: '#facc15',
        warn: '#f97316', danger: '#ef4444', link: '#7dd3fc'
      } : {
        bg: '#f0fdf4', card: '#ffffff', cardAlt: '#ecfdf5', border: '#4b7669',
        text: '#052e2b', muted: '#28594f', dim: '#3f685f',
        accent: '#047857', accentHi: '#065f46', warm: '#a16207',
        warn: '#c2410c', danger: '#b91c1c', link: '#0369a1'
      };

      function btn(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left'
        }, extra || {});
      }
      function btnPrimary(extra) {
        return Object.assign(btn({ background: T.accent, color: '#06281f', border: '1px solid ' + T.accent }), extra || {});
      }

      // ─────────────────────────────────────────
      // Reusable: source-card header (used at top of each module view)
      // ─────────────────────────────────────────
      function openEnergyLab(srcKey) { updMulti({view:'energy3d',energyLab:Object.assign({},d.energyLab,{selected:srcKey==='waveTidal'?'wave':srcKey})}); }
      function sourceCard(srcKey) {
        var s = SOURCE_CARDS[srcKey]; if (!s) return null;
        return h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 16 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, s.icon),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 17, color: T.text } }, s.name),
              h('div', { style: { fontSize: 12, color: T.accentHi } }, 'Principle: ' + s.principle))
          ),
          h('p', { style: { margin: '6px 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } }, s.oneLiner),
          h('button',{type:'button',style:btn({marginBottom:12}),onClick:function(){openEnergyLab(srcKey);}},'Explore '+s.name+' in 3D'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11, color: T.dim } },
            h('div', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.capacity_factor', 'Capacity factor: ')), s.capacityFactor),
            h('div', null, h('strong', { style: { color: T.text } }, 'LCOE: '), s.lcoe),
            h('div', { style: { gridColumn: '1 / -1' } }, h('strong', { style: { color: T.text } }, 'Trend: '), s.growth)
          )
        );
      }

      // ─────────────────────────────────────────
      // Reusable: slider with label + units
      // ─────────────────────────────────────────
      function slider(opts) {
        // opts: { id, label, value, min, max, step, unit, onChange, hint }
        return h('div', { style: { marginBottom: 14 } },
          h('label', { htmlFor: opts.id, style: { display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 } },
            opts.label, ': ',
            h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, opts.value + ' ' + (opts.unit || ''))
          ),
          h('input', { id: opts.id, 'data-rn-focusable': true, type: 'range',
            min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value,
            'aria-valuemin': opts.min, 'aria-valuemax': opts.max, 'aria-valuenow': opts.value,
            'aria-label': opts.label + ' slider, current value ' + opts.value + ' ' + (opts.unit || ''),
            onChange: function(e) { opts.onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: T.accent, cursor: 'pointer' }
          }),
          opts.hint && h('div', { style: { fontSize: 11, color: T.dim, marginTop: 2, lineHeight: 1.4 } }, opts.hint)
        );
      }

      // Reusable: power readout bar (visualizes a 0-100% bar)
      function powerBar(label, fraction, valueText) {
        var pct = Math.max(0, Math.min(1, fraction)) * 100;
        return h('div', { style: { marginTop: 8, padding: 10, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
            h('div', { style: { fontSize: 12, color: T.muted, fontWeight: 600 } }, label),
            h('div', { style: { fontSize: 16, fontWeight: 700, color: T.accentHi, fontFamily: 'monospace' } }, valueText)
          ),
          h('div', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct),
            'aria-label': label + ', ' + Math.round(pct) + ' percent of scale',
            style: { height: 12, borderRadius: 8, background: '#06281f', overflow: 'hidden' } },
            h('div', { style: { width: pct + '%', height: '100%', background: 'linear-gradient(90deg,' + T.accent + ',' + T.accentHi + ')', transition: 'width 0.2s ease' } })
          )
        );
      }

      // Reusable: back-bar
      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', { 'data-rn-focusable': true,
            'aria-label': __alloT('stem.renewables.back_to_renewables_lab_menu', 'Back to Renewables Lab menu'),
            onClick: function() { upd('view', 'menu'); rnAnnounce(__alloT('stem.renewables.sr_back_to_menu', 'Back to menu')); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.renewables.menu', '← Menu')),
          h('h2', { style: { margin: 0, fontSize: 20, color: T.text } }, title)
        );
      }

      // Goal banner — small green-tinted ribbon that names what the
      // student is supposed to be doing with this sim. Placed under
      // the sourceCard on each interactive view so it reads as the
      // first orienting sentence before any sliders or charts.
      function goalBanner(text) {
        return h('div', {
          role: 'note',
          style: {
            marginBottom: 14, padding: '8px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.04) 100%)',
            border: '1px solid ' + T.accent + '55',
            borderLeft: '3px solid ' + T.accent,
            color: T.text, fontSize: 12, lineHeight: 1.55,
            display: 'flex', alignItems: 'flex-start', gap: 8
          }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 14, flexShrink: 0 } }, '🎯'),
          h('span', { style: { flex: 1 } }, text)
        );
      }

      // Reusable: footer disclaimer + cite
      function footer() {
        return h('div', { role: 'contentinfo', 'aria-label': __alloT('stem.renewables.source_attribution', 'Source attribution'),
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          __alloT('stem.renewables.numbers_traced_to', 'Numbers traced to '),
          h('a', { href: 'https://www.nrel.gov', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'NREL'),
          ' · ',
          h('a', { href: 'https://www.iea.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'IEA'),
          ' · ',
          h('a', { href: 'https://www.irena.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'IRENA'),
          ' · ',
          h('a', { href: 'https://www.eia.gov', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'EIA'),
          __alloT('stem.renewables.sims_are_simplified_real_plants_involv', '. Sims are simplified — real plants involve additional losses (wake, transmission, parasitic load).')
        );
      }

      // ─────────────────────────────────────────
      // MENU
      // ─────────────────────────────────────────
      var MENU_TILES = [
        { id: 'microgrid', icon: '🔌', label: 'Storage & demand lab', desc: 'Connect generation to demand, dispatch a battery bank, and explore grid outages with a minute-by-minute energy balance.' },
        { id: 'energy3d', icon: '⚙️', label: 'Individual 3D energy simulations', desc: 'Nine mechanisms: adjust the resource, inspect components, trace losses, and compare readings.' },
        { id: 'transition', icon: '🌎', label: __alloT('stem.renewables.transition_studio', 'US transition sandbox'), desc: __alloT('stem.renewables.transition_studio_desc', 'Site new capacity, explore a 3D energy landscape, and stress-test three to seven days of electricity demand.') },
        // Source modules (the "how does it work?" core)
        { id: 'solarPv',     icon: '☀️',     label: __alloT('stem.renewables.solar_pv', 'Solar PV'),          desc: __alloT('stem.renewables.photovoltaic_effect_irradiance_area_si', 'Photovoltaic effect + irradiance × area sim.') },
        { id: 'wind',        icon: '🌬️', label: __alloT('stem.renewables.wind', 'Wind'),              desc: __alloT('stem.renewables.betz_limit_cube_of_wind_speed_power_cu', 'Betz limit + cube-of-wind-speed power curve.') },
        { id: 'hydro',       icon: '🌊',     label: __alloT('stem.renewables.hydropower', 'Hydropower'),        desc: __alloT('stem.renewables.head_flow_sim_pelton_francis_kaplan', 'Head × flow sim + Pelton / Francis / Kaplan.') },
        { id: 'geothermal',  icon: '🌋',     label: __alloT('stem.renewables.geothermal', 'Geothermal'),        desc: __alloT('stem.renewables.earth_s_gradient_3_plant_types_gshp', 'Earth’s gradient + 3 plant types + GSHP.') },
        { id: 'solarThermal',icon: '🔆',     label: __alloT('stem.renewables.solar_thermal_csp', 'Solar Thermal (CSP)'),desc: __alloT('stem.renewables.mirrors_molten_salt_steam_turbine', 'Mirrors → molten salt → steam turbine.') },
        { id: 'waveTidal',   icon: '🌀',     label: __alloT('stem.renewables.wave_tidal', 'Wave & Tidal'),      desc: __alloT('stem.renewables.marine_kinetic_tides_predictable_for_d', 'Marine kinetic + tides predictable for decades.') },
        { id: 'biomass',     icon: '🌾',     label: __alloT('stem.renewables.biomass_biogas', 'Biomass & Biogas'),  desc: __alloT('stem.renewables.combustion_vs_anaerobic_digestion', 'Combustion vs anaerobic digestion.') },
        { id: 'storage',     icon: '🔋',     label: __alloT('stem.renewables.storage', 'Storage'),           desc: __alloT('stem.renewables.li_ion_flow_pumped_hydro_hydrogen', 'Li-ion / flow / pumped hydro / hydrogen.') },
        // Synthesis + applied
        { id: 'compare',     icon: '📊',     label: __alloT('stem.renewables.compare_all_sources', 'Compare all sources'),desc: __alloT('stem.renewables.side_by_side_table_capacity_factor_exp', 'Side-by-side table + capacity factor explainer.') },
        { id: 'mix',         icon: '🎛️', label: __alloT('stem.renewables.energy_mix_designer', 'Energy Mix Designer'),  desc: __alloT('stem.renewables.slide_each_source_see_co_reliability_s', 'Slide each source. See CO₂, reliability, storage need.') },
        { id: 'homePayback', icon: '🏠',     label: __alloT('stem.renewables.maine_home_solar_calc', 'Maine home solar calc'),desc: __alloT('stem.renewables.roof_area_bill_kwh_yr_payback_co_avoid', 'Roof area + bill → kWh/yr, payback, CO₂ avoided.') },
        { id: 'installerCo', icon: '☀️',     label: __alloT('stem.renewables.solar_installer_co', 'Solar Installer Co.'), desc: __alloT('stem.renewables.4_year_campaign_running_a_small_maine_', '4-year campaign running a small Maine solar firm. Bid on contracts, pick suppliers, hire installers, manage cash flow. Workforce + business-scale view of clean energy.') },
        { id: 'heatPump',    icon: '♨️',  label: __alloT('stem.renewables.heat_pumps_deep_dive', 'Heat Pumps Deep Dive'),desc: __alloT('stem.renewables.ashp_gshp_hpwh_cop_myths_integration_m', 'ASHP / GSHP / HPWH, COP, myths, integration. Maine leads US.') },
        { id: 'plants',      icon: '🗺️', label: __alloT('stem.renewables.plant_tour', 'Plant Tour'),           desc: __alloT('stem.renewables.16_famous_installations_across_all_sou', '16 famous installations across all sources. Filter + browse.') },
        // Visual + applied practice
        { id: 'diagrams',    icon: '🔬',     label: __alloT('stem.renewables.diagrams', 'Diagrams'),           desc: __alloT('stem.renewables.9_labeled_svg_schematics_pv_cell_turbi', '9 labeled SVG schematics: PV cell, turbine, dam, CSP tower, GSHP, OWC, digester, pumped hydro.') },
        { id: 'aiPractice',  icon: '🤖',     label: __alloT('stem.renewables.ai_practice', 'AI Practice'),        desc: __alloT('stem.renewables.design_a_system_for_6_real_scenarios_a', 'Design a system for 6 real scenarios. AI critiques against rubric.') },
        { id: 'smartGrid',   icon: '🌐',     label: __alloT('stem.renewables.smart_grid_101', 'Smart Grid 101'),     desc: __alloT('stem.renewables.how_a_real_grid_balances_supply_demand', 'How a real grid balances supply + demand. Frequency, demand response, V2G, duck curve.') },
        { id: 'hydrogen',    icon: '💨',     label: __alloT('stem.renewables.hydrogen_economy', 'Hydrogen Economy'),   desc: __alloT('stem.renewables.color_codes_green_blue_gray_etc_produc', 'Color codes (green/blue/gray/etc), production routes, end uses, controversy.') },
        { id: 'justice',     icon: '⚖️',  label: __alloT('stem.renewables.climate_justice', 'Climate Justice'),     desc: __alloT('stem.renewables.energy_burden_front_line_communities_j', 'Energy burden, front-line communities, just transition, siting fights, Indigenous leadership.') },
        { id: 'careers',     icon: '🧰',     label: __alloT('stem.renewables.career_pathways', 'Career Pathways'),    desc: __alloT('stem.renewables.14_careers_trades_engineering_policy_r', '14 careers — trades, engineering, policy, research. Maine training pipeline.') },
        { id: 'teacher',     icon: '🎓',     label: __alloT('stem.renewables.teacher_guide', 'Teacher Guide'),      desc: __alloT('stem.renewables.ngss_alignment_discussion_prompts_hand', 'NGSS alignment, discussion prompts, hands-on activities, unit pacing.') },
        { id: 'printPack',   icon: '🖨',      label: __alloT('stem.renewables.print_pack', 'Print Pack'),         desc: __alloT('stem.renewables.build_a_printable_handout_from_selecte', 'Build a printable handout from selected sections. Worksheet, quiz, answer key.') },
        { id: 'takeAction',  icon: '🌱',     label: __alloT('stem.renewables.take_action', 'Take Action'),        desc: __alloT('stem.renewables.concrete_steps_you_can_take_at_home_sc', 'Concrete steps you can take at home, school, in community, civically.') },
        // Reference
        { id: 'nuclear',     icon: '⚛️', label: __alloT('stem.renewables.nuclear_low_c', 'Nuclear (low-C)'),   desc: __alloT('stem.renewables.not_renewable_but_always_asked_about_h', 'Not renewable, but always asked about. Honest pros/cons.') },
        { id: 'glossary',    icon: '📖',     label: __alloT('stem.renewables.glossary', 'Glossary'),          desc: __alloT('stem.renewables.18_key_terms_kw_vs_kwh_lcoe_dispatchab', '18 key terms — kW vs kWh, LCOE, dispatchable, etc.') },
        { id: 'myths',       icon: '🧐',     label: __alloT('stem.renewables.myths_busted', 'Myths busted'),      desc: __alloT('stem.renewables.7_common_misconceptions_sourced_correc', '7 common misconceptions, sourced corrections.') },
        // Assessment
        { id: 'quiz',        icon: '📝',     label: __alloT('stem.renewables.18_question_quiz', '18-question quiz'),  desc: __alloT('stem.renewables.test_your_understanding_of_all_sources', 'Test your understanding of all sources.') },
        { id: 'mastery',     icon: '🏅',     label: __alloT('stem.renewables.energy_mastery', 'Energy Mastery'),     desc: __alloT('stem.renewables.cross_attempt_log_of_every_quiz_questi', 'Cross-attempt log of every quiz question you have nailed, rolled up by source.') },
        { id: 'siteSelector', icon: '🕵️',  label: __alloT('stem.renewables.site_selector', 'Site Selector'),     desc: __alloT('stem.renewables.10_location_profiles_for_each_pick_the', '10 location profiles. For each, pick the best renewable from 8 options (rooftop solar / utility solar / onshore wind / offshore wind / hydro / geothermal / wave-tidal / biomass). Maine + global scenarios; tests siting reasoning.') },
        { id: 'resources',   icon: '📚',     label: __alloT('stem.renewables.resources', 'Resources'),         desc: __alloT('stem.renewables.every_org_cited_in_this_tool', 'Every org cited in this tool.') },
        // Inquiry-pattern widget (H7b'' validated design)
        { id: 'gridBalance', icon: '⚡',     label: __alloT('stem.renewables.grid_balance_discovery', 'Grid balance discovery'), desc: __alloT('stem.renewables.adjust_generation_demand_storage_disco', 'Compare generation, demand, storage duration, and state of charge across three classroom states.') }
      ];

      function renderMenu() {
        var visitedCount = Object.keys(modulesVisited).length;
        var RENEWABLES_CORE_TILES = ['energy3d', 'microgrid', 'transition', 'solarPv', 'wind', 'compare', 'mix', 'gridBalance', 'quiz'];
        var showFullRenewablesMenu = !!d.showRenewablesLibrary;
        var visibleRenewablesTiles = showFullRenewablesMenu ? MENU_TILES : MENU_TILES.filter(function(tile) {
          return RENEWABLES_CORE_TILES.indexOf(tile.id) !== -1;
        });
        var renewablesLaunchTiles = ['energy3d', 'microgrid', 'transition', 'solarPv', 'mix', 'gridBalance'].map(function(id) {
          return MENU_TILES.find(function(tile) { return tile.id === id; });
        }).filter(Boolean);
        // Adaptive "Start Here" suggestion based on visited count.
        // Goal: reduce decision fatigue across 26 tiles.
        function startHereCard() {
          var suggestion;
          if (visitedCount === 0) {
            suggestion = {
              tone: 'fresh',
              header: __alloT('stem.renewables.first_time_here_try_this_5_tile_path', '👋 First time here? Try this 5-tile path:'),
              body: __alloT('stem.renewables.start_with_solar_pv_most_familiar_then', 'Start with ☀️ Solar PV (most familiar), then 🌬️ Wind (the formula trick), then 📊 Compare All Sources (the synthesis), then 🎛️ Energy Mix Designer (apply it), then 📝 the quiz. About 30–40 minutes.')
            };
          } else if (visitedCount < 4) {
            suggestion = {
              tone: 'progressing',
              header: __alloT('stem.renewables.already_started_want_a_path_through_th', '👍 Already started — want a path through the rest?'),
              body: __alloT('stem.renewables.pick_2_more_source_modules_you_haven_t', 'Pick 2 more source modules you haven\'t opened, then 🔬 Diagrams to ground the visuals, then 🌐 Smart Grid 101 to see how the grid actually integrates them.')
            };
          } else if (visitedCount < 8) {
            suggestion = {
              tone: 'engaged',
              header: __alloT('stem.renewables.you_re_moving_branch_into_applied_valu', '🚀 You\'re moving — branch into applied + values:'),
              body: __alloT('stem.renewables.try_ai_practice_design_a_system_for_a_', 'Try 🤖 AI Practice (design a system for a real scenario), 🏠 Maine Home Solar Calc (apply it to your house), and ⚖️ Climate Justice (the political half). Then 🌱 Take Action.')
            };
          } else if (visitedCount < 16) {
            suggestion = {
              tone: 'deep',
              header: __alloT('stem.renewables.deep_mode_things_often_missed', '🎓 Deep mode: things often missed'),
              body: __alloT('stem.renewables.most_students_skip_these_hydrogen_econ', 'Most students skip these: 💨 Hydrogen Economy (color codes), 🧐 Myths Busted, 🗺️ Plant Tour, 🧰 Career Pathways, ♨️ Heat Pumps. Each is 3–5 minutes.')
            };
          } else {
            suggestion = {
              tone: 'comprehensive',
              header: __alloT('stem.renewables.you_ve_gone_broad_capstone_moves', '🏁 You\'ve gone broad — capstone moves'),
              body: __alloT('stem.renewables.you_ve_seen_most_of_it_take_action_tur', 'You\'ve seen most of it. 🌱 Take Action turns reading into doing, and 🎓 Teacher Guide is useful if you\'re prepping a unit. Try the 18-Q quiz if you haven\'t.')
            };
          }
          return h('div', { role: 'region', 'aria-label': __alloT('stem.renewables.recommended_path_through_the_lab', 'Recommended path through the lab'),
            style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, suggestion.header),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } }, suggestion.body)
          );
        }
        return h('div', { style: { padding: 20, maxWidth: '62.5rem', width: '100%', margin: '0 auto', color: T.text } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
            h('h2', { style: { margin: 0, fontSize: 22 } }, __alloT('stem.renewables.renewables_lab', '⚡ Renewables Lab')),
            h('div', { style: { fontSize: 12, color: T.dim } },
              __alloT('stem.renewables.modules_visited', 'Modules visited: '), h('strong', { style: { color: T.text } }, visitedCount + ' / ' + (MENU_TILES.length - 2)))
          ),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.renewables.how_does_each_renewable_source_actuall', 'How does each renewable source actually generate electricity? This lab walks through the physics and engineering with live sliders. Pair with '),
            h('strong', { style: { color: T.text } }, __alloT('stem.renewables.climate_explorer', 'Climate Explorer')),
            __alloT('stem.renewables.for_the_policy_mix_design_side', ' for the policy + mix-design side.')),
          h('section', { 'data-renewables-launch-panel': 'true',
            style: { padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, rgba(6,78,59,0.88), rgba(15,23,42,0.94))', border: '1px solid ' + T.accent + '77', marginBottom: 14, color: '#ecfdf5', boxShadow: '0 16px 38px rgba(2,8,23,0.22)' } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 12 } },
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#86efac', letterSpacing: 0, marginBottom: 4 } }, 'Energy launch board'),
                h('div', { style: { fontSize: 21, fontWeight: 900, lineHeight: 1.15, marginBottom: 6 } }, __alloT('stem.renewables.pick_a_useful_starting_route', 'Pick a useful starting route')),
                h('p', { style: { margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, color: '#cbd5e1' } },
                  __alloT('stem.renewables.launch_panel_copy', 'Start with the physics, compare sources, design a mix, or test grid balance. Open the full module library when you want deeper topics.')),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 } },
                  renewablesLaunchTiles.map(function(tile) {
                    var visited = !!modulesVisited[tile.id];
                    return h('button', { key: tile.id, type: 'button', 'aria-label': tile.label + (visited ? ' visited' : ''),
                      onClick: function() { upd('view', tile.id); markVisited(tile.id); rnAnnounce('Opening ' + tile.label); },
                      style: { minHeight: 82, padding: 10, textAlign: 'left', borderRadius: 8, border: '1px solid ' + (visited ? T.accent : 'rgba(134,239,172,0.25)'), background: visited ? 'rgba(16,185,129,0.18)' : 'rgba(15,23,42,0.55)', color: '#ecfdf5', cursor: 'pointer' } },
                      h('div', { style: { fontSize: 12, fontWeight: 900, marginBottom: 3 } }, tile.icon + ' ' + tile.label),
                      h('div', { style: { fontSize: 10, lineHeight: 1.35, color: '#bbf7d0' } }, tile.desc)
                    );
                  })
                )
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, alignContent: 'start' } },
                [
                  { label: __alloT('stem.renewables.modules_seen', 'Seen'), value: visitedCount + '/' + (MENU_TILES.length - 2) },
                  { label: __alloT('stem.renewables.library', 'Library'), value: showFullRenewablesMenu ? __alloT('stem.renewables.expanded', 'Expanded') : __alloT('stem.renewables.core', 'Core') },
                  { label: __alloT('stem.renewables.quiz', 'Quiz'), value: ((d.quizMastery && Object.keys(d.quizMastery).length) || 0) + '/' + QUIZ.length },
                  { label: __alloT('stem.renewables.badges', 'Badges'), value: Object.keys(badges).length }
                ].map(function(card) {
                  return h('div', { key: card.label, style: { padding: 9, borderRadius: 8, background: 'rgba(2,6,23,0.34)', border: '1px solid rgba(148,163,184,0.18)' } },
                    h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 } }, card.label),
                    h('div', { style: { fontSize: 15, fontWeight: 900, color: '#f8fafc' } }, card.value)
                  );
                }),
                h('button', { type: 'button', 'aria-expanded': showFullRenewablesMenu ? 'true' : 'false',
                  onClick: function() { upd('showRenewablesLibrary', !d.showRenewablesLibrary); },
                  style: { gridColumn: '1 / -1', marginTop: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(134,239,172,0.32)', background: 'rgba(16,185,129,0.12)', color: '#bbf7d0', fontSize: 11, fontWeight: 900, cursor: 'pointer' } },
                  showFullRenewablesMenu ? __alloT('stem.renewables.hide_full_module_library', 'Hide full module library') : __alloT('stem.renewables.show_full_module_library', 'Show full module library'))
              )
            )
          ),
          startHereCard(),
          // ── Energy Mastery summary tile (clickable → Mastery view) ──
          (function () {
            var mastery2 = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
            var totalQ2 = QUIZ.length;
            var masteredCount2 = QUIZ.filter(function (q) { return !!mastery2[q.id]; }).length;
            var pct2 = totalQ2 > 0 ? Math.round((masteredCount2 / totalQ2) * 100) : 0;
            return h('button', {
              onClick: function () { upd('view', 'mastery'); },
              'aria-label': 'Open Energy Mastery — ' + masteredCount2 + ' of ' + totalQ2 + ' quiz questions mastered',
              'data-rn-focusable': true,
              style: {
                width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: 14, marginBottom: 14, borderRadius: 12,
                background: 'linear-gradient(110deg, rgba(16,185,129,0.10) 0%, rgba(6,182,212,0.18) 50%, rgba(99,102,241,0.10) 100%)',
                border: '1px solid ' + T.accent + '88',
                color: T.text, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
              }
            },
              h('div', { style: { textAlign: 'center', minWidth: 90 } },
                h('div', { style: { fontSize: 26, fontWeight: 900, color: T.accentHi, lineHeight: 1 } }, masteredCount2 + ' / ' + totalQ2),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 } }, __alloT('stem.renewables.mastered', 'Mastered'))
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 4 } }, __alloT('stem.renewables.energy_source_mastery', '🏅 Energy Source Mastery')),
                h('div', { style: { height: 6, background: T.cardAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 5 }, 'aria-hidden': 'true' },
                  h('div', { style: { width: pct2 + '%', height: '100%', background: T.accent, transition: 'width 0.3s' } })
                ),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } },
                  masteredCount2 === 0 ? 'Take the 18-question quiz — every question you nail the first time locks in here permanently.'
                  : masteredCount2 === totalQ2 ? '🏆 Full coverage — every quiz question mastered.'
                  : pct2 + '% of the quiz bank mastered. ' + (totalQ2 - masteredCount2) + ' to go.'
                )
              ),
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22, color: T.accentHi, fontWeight: 900, flexShrink: 0 } }, '→')
            );
          })(),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
            visibleRenewablesTiles.map(function(tile) {
              var visited = !!modulesVisited[tile.id];
              return h('div', { key: tile.id, role: 'listitem' }, h('button', { 'data-rn-focusable': true,
                'aria-label': tile.label + (visited ? ' (visited)' : ''),
                onClick: function() {
                  upd('view', tile.id);
                  markVisited(tile.id);
                  rnAnnounce('Opening ' + tile.label);
                },
                style: btn({
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: 14, minHeight: 110,
                  background: T.card, cursor: 'pointer',
                  borderColor: visited ? T.accent : T.border
                })
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 15, flex: 1 } }, tile.label),
                  visited && h('span', { 'aria-hidden': 'true', style: { color: T.accent, fontSize: 14 } }, '✓')
                ),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
              ));
            })
          ),
          // Maine flavor card
          h('div', { style: { marginTop: 18, padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, __alloT('stem.renewables.why_maine_matters_here', '🌲 Why Maine matters here')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('li', null, MAINE_RENEWABLES.offshore),
              h('li', null, MAINE_RENEWABLES.tidal),
              h('li', null, MAINE_RENEWABLES.heatPumps)
            )
          ),
          Object.keys(badges).length > 0 && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, __alloT('stem.renewables.badges_earned', '🏅 Badges earned')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid,
                  style: { fontSize: 11, padding: '4px 10px', borderRadius: 999, background: T.accent, color: '#06281f', fontWeight: 700 } },
                  badges[bid].label || bid);
              })
            )
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SOLAR PV
      // ─────────────────────────────────────────
      // ── Day-curve helper: compute hourly clear-sky power for given lat + day-of-year ──
      function solarDayCurvePoints(lat_deg, dayOfYear, panelArea_m2, eff) {
        // Cooper's equation for solar declination
        var decl = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365);
        var latR = lat_deg * Math.PI / 180;
        var declR = decl * Math.PI / 180;
        var pts = [];
        var totalKWh = 0;
        for (var hour = 0; hour <= 24; hour += 0.5) {
          var H_deg = 15 * (hour - 12);
          var H_R = H_deg * Math.PI / 180;
          var sinAlt = Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(H_R);
          var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))); // radians
          // Clear-sky irradiance scales with sin(altitude); below horizon = 0
          var irr = sinAlt > 0 ? 1000 * Math.max(0, sinAlt) : 0;
          var watts = irr * panelArea_m2 * eff;
          pts.push({ hour: hour, alt: alt, irradiance: irr, watts: watts });
          // Riemann sum at 0.5h step → kWh
          if (hour > 0) totalKWh += watts * 0.5 / 1000;
        }
        return { points: pts, totalKWh: totalKWh, declDeg: decl };
      }

      // Render an SVG line chart of the day curve.
      function svgDayCurve(curve) {
        var W = 560, Hh = 220, padL = 50, padR = 16, padT = 24, padB = 30;
        var plotW = W - padL - padR;
        var plotH = Hh - padT - padB;
        var maxW = 0;
        curve.points.forEach(function(p) { if (p.watts > maxW) maxW = p.watts; });
        if (maxW <= 0) maxW = 1; // avoid divide-by-zero in flat polar-night case
        function xAt(hour) { return padL + (hour / 24) * plotW; }
        function yAt(watts) { return padT + plotH - (watts / maxW) * plotH; }
        var pathD = curve.points.map(function(p, i) {
          return (i === 0 ? 'M ' : 'L ') + xAt(p.hour).toFixed(1) + ' ' + yAt(p.watts).toFixed(1);
        }).join(' ');
        return h('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: '100%', height: '100%',
          role: 'img', 'aria-label': __alloT('stem.renewables.solar_power_output_curve_over_24_hours', 'Solar power output curve over 24 hours; peaks near solar noon, zero before sunrise and after sunset'),
          style: { background: '#0b1426', borderRadius: 8 } },
          // Axes
          h('line', { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: '#475569', strokeWidth: 1 }),
          h('line', { x1: padL, y1: padT + plotH, x2: padL + plotW, y2: padT + plotH, stroke: '#475569', strokeWidth: 1 }),
          // Gridlines (every 6 hours)
          [6, 12, 18].map(function(h6) {
            return h('g', { key: 'g' + h6 },
              h('line', { x1: xAt(h6), y1: padT, x2: xAt(h6), y2: padT + plotH, stroke: '#1e293b', strokeWidth: 1, strokeDasharray: '2,3' }),
              h('text', { x: xAt(h6), y: padT + plotH + 14, fill: '#cbe8e0', fontSize: 10, textAnchor: 'middle' }, h6 + ':00')
            );
          }),
          h('text', { x: xAt(0), y: padT + plotH + 14, fill: '#cbe8e0', fontSize: 10, textAnchor: 'middle' }, '0:00'),
          h('text', { x: xAt(24), y: padT + plotH + 14, fill: '#cbe8e0', fontSize: 10, textAnchor: 'middle' }, '24:00'),
          // Y-axis label (max watts)
          h('text', { x: padL - 6, y: padT + 6, fill: '#facc15', fontSize: 10, textAnchor: 'end' }, (maxW / 1000).toFixed(2) + ' kW'),
          h('text', { x: padL - 6, y: padT + plotH + 4, fill: '#cbe8e0', fontSize: 10, textAnchor: 'end' }, '0'),
          // Solar-noon marker
          h('line', { x1: xAt(12), y1: padT, x2: xAt(12), y2: padT + plotH, stroke: '#facc15', strokeWidth: 1, strokeDasharray: '4,3', opacity: 0.5 }),
          // Curve fill (area under)
          h('path', { d: pathD + ' L ' + xAt(24).toFixed(1) + ' ' + (padT + plotH).toFixed(1) + ' L ' + xAt(0).toFixed(1) + ' ' + (padT + plotH).toFixed(1) + ' Z',
            fill: '#facc15', opacity: 0.18 }),
          // Curve line
          h('path', { d: pathD, fill: 'none', stroke: '#facc15', strokeWidth: 2.5, style: { filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.55))' } }),
          // Title
          h('text', { x: padL, y: 16, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.power_output_w_by_hour_of_day', 'Power output (W) by hour of day')),
          h('text', { x: padL + plotW, y: 16, fill: '#cbe8e0', fontSize: 10, textAnchor: 'end' }, __alloT('stem.renewables.noon', '☀️ noon →'))
        );
      }

      function renderSolarPv() {
        var watts = solarPvWatts(simSolarIrr, simSolarArea, simSolarEff, simSolarTilt);
        var kW = watts / 1000;
        var fracOfPeak = watts / (1000 * simSolarArea * simSolarEff); // vs peak STC
        // Day curve (only computed when curve mode is active — cheap enough to compute always)
        var dayCurve = solarDayCurvePoints(simDayLat, simDayOfYear, simSolarArea, simSolarEff);
        // Day-of-year → date label
        function doyToLabel(doy) {
          // Use a non-leap base year so day-of-year 365 maps to Dec 31 (not Dec 30 as leap years would).
          var d2 = new Date(2025, 0, 1);
          d2.setDate(doy);
          var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return m[d2.getMonth()] + ' ' + d2.getDate();
        }

        function tabBtn(id, label) {
          var active = solarPvMode === id;
          return h('button', { 'data-rn-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('solarPvMode', id); rnAnnounce(label + ' view'); },
            style: btn({
              background: active ? T.accent : T.card,
              color: active ? '#06281f' : T.text,
              border: '1px solid ' + (active ? T.accent : T.border),
              padding: '6px 12px', fontSize: 12
            })
          }, label);
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('☀️ Solar PV'),
          sourceCard('solarPv'),
          goalBanner('Goal: maximize daily kWh per m² of roof. Try different tilt angles, irradiance levels, and panel efficiencies. The Maine Home Solar Calculator from the menu uses these same inputs to estimate real-world payback.'),
          // Mode tabs (calculator vs day curve)
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.renewables.solar_pv_interactive_views', 'Solar PV interactive views'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            tabBtn('calc', '🔬 Power calculator'),
            tabBtn('curve', '📈 Day curve')
          ),
          solarPvMode === 'curve' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.solar_power_across_a_day', '📈 Solar power across a day')),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              __alloT('stem.renewables.solar_elevation_angle_drives_clear_sky', 'Solar elevation angle drives clear-sky irradiance. Adjust latitude (where) and day-of-year (when) to see how the daily power curve changes shape. This is what "capacity factor" actually looks like.')),
            slider({ id: 'sl-dlat', label: __alloT('stem.renewables.latitude', 'Latitude'), value: simDayLat, min: 0, max: 70, step: 1, unit: '°N',
              hint: __alloT('stem.renewables.maine_44_n_florida_25_n_equator_0_stoc', 'Maine ~44°N. Florida 25°N. Equator 0°. Stockholm 59°N. UK 54°N.'),
              onChange: function(v) { upd('simDayLat', v); } }),
            slider({ id: 'sl-doy', label: 'Day of year (' + doyToLabel(simDayOfYear) + ')', value: simDayOfYear, min: 1, max: 365, step: 1, unit: '',
              hint: __alloT('stem.renewables.day_80_spring_equinox_day_172_summer_s', 'Day 80 ≈ spring equinox. Day 172 ≈ summer solstice. Day 355 ≈ winter solstice.'),
              onChange: function(v) { upd('simDayOfYear', v); } }),
            h('div', { style: { width: '100%', maxWidth: 560, margin: '12px auto', aspectRatio: '560 / 220' } },
              svgDayCurve(dayCurve)),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('div', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.solar_declination_today', 'Solar declination today: ')), dayCurve.declDeg.toFixed(1) + '°  ',
                h('span', { style: { color: T.dim, fontSize: 11 } }, __alloT('stem.renewables.earth_s_axis_tilt_projected_onto_the_s', '(Earth\'s axis tilt projected onto the sun-Earth line)'))),
              h('div', { style: { marginTop: 4 } }, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.daily_energy_clear_sky', 'Daily energy (clear sky): ')),
                h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, dayCurve.totalKWh.toFixed(2) + ' kWh')),
              h('div', { style: { marginTop: 4, fontSize: 11, color: T.dim } },
                __alloT('stem.renewables.note_real_world_output_is_lower_becaus', 'Note: real-world output is lower because of clouds + soiling + system losses. Annual capacity factor in Maine: 16–20%.'))
            )
          ),
          solarPvMode === 'calc' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.how_it_works_step_by_step', 'How it works — step by step')),
            h('ol', { style: { margin: '0 0 0 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } },
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.photons_arrive', 'Photons arrive')), __alloT('stem.renewables.sunlight_is_a_stream_of_photons_each_c', ' — sunlight is a stream of photons, each carrying a tiny packet of energy.')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.photon_hits_silicon', 'Photon hits silicon')), __alloT('stem.renewables.if_the_photon_has_enough_energy_to_cro', ' — if the photon has enough energy to cross silicon’s '), h('em', null, __alloT('stem.renewables.band_gap', 'band gap')), __alloT('stem.renewables.1_12_ev_it_knocks_an_outer_shell_elect', ' (~1.12 eV), it knocks an outer-shell electron loose.')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.p_n_junction_sorts_the_charges', 'P-N junction sorts the charges')), __alloT('stem.renewables.the_panel_is_two_layers_of_silicon_dop', ' — the panel is two layers of silicon doped with different impurities (boron / phosphorus). The electric field at their boundary pushes electrons one way, “holes” the other.')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.electrons_flow_as_dc_current', 'Electrons flow as DC current')), __alloT('stem.renewables.they_travel_through_the_external_circu', ' — they travel through the external circuit (your house, an inverter, the grid).')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.inverter_converts_dc_ac', 'Inverter converts DC → AC')), __alloT('stem.renewables.grid_most_appliances_run_on_alternatin', ' — grid + most appliances run on alternating current.'))
            )
          ),
          solarPvMode === 'calc' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.try_it_solar_pv_power_calculator', '🔬 Try it: solar PV power calculator')),
            h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 10 } },
              __alloT('stem.renewables.power_irradiance_area_efficiency_cos_t', 'Power = Irradiance × Area × Efficiency × cos(tilt error). Drag the sliders to see how each factor changes output.')),
            slider({ id: 'sl-irr', label: __alloT('stem.renewables.sunlight_intensity_irradiance', 'Sunlight intensity (irradiance)'), value: simSolarIrr, min: 100, max: 1000, step: 50, unit: 'W/m²',
              hint: __alloT('stem.renewables.1000_w_m_at_solar_noon_on_a_clear_summ', '~1000 W/m² at solar noon on a clear summer day. ~200 W/m² on overcast days.'),
              onChange: function(v) { upd('simSolarIrr', v); } }),
            slider({ id: 'sl-area', label: __alloT('stem.renewables.total_panel_area', 'Total panel area'), value: simSolarArea, min: 1, max: 200, step: 1, unit: 'm²',
              hint: __alloT('stem.renewables.a_typical_home_rooftop_array_20_40_m_a', 'A typical home rooftop array: 20–40 m². A megawatt utility array: ~5,000 m².'),
              onChange: function(v) { upd('simSolarArea', v); } }),
            slider({ id: 'sl-eff', label: __alloT('stem.renewables.module_efficiency', 'Module efficiency'), value: Math.round(simSolarEff * 100), min: 10, max: 28, step: 1, unit: '%',
              hint: __alloT('stem.renewables.commercial_panels_18_23_lab_record_mul', 'Commercial panels: 18–23%. Lab record (multi-junction): 47%. Cheap thin-film: 10–12%.'),
              onChange: function(v) { upd('simSolarEff', v / 100); } }),
            slider({ id: 'sl-tilt', label: __alloT('stem.renewables.tilt_error_from_optimal', 'Tilt error from optimal'), value: simSolarTilt, min: 0, max: 80, step: 5, unit: '°',
              hint: __alloT('stem.renewables.0_perfectly_aimed_at_the_sun_90_parall', '0° = perfectly aimed at the sun. 90° = parallel to sunlight (zero output). Trackers cut this to near-zero.'),
              onChange: function(v) { upd('simSolarTilt', v); } }),
            powerBar('Instantaneous power output', fracOfPeak, kW.toFixed(2) + ' kW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              __alloT('stem.renewables.a_home_consumes_1_kw_continuous_on_ave', 'A home consumes ~1 kW continuous on average. So this array could power roughly '),
              h('strong', { style: { color: T.accentHi } }, kW.toFixed(1) + ' homes'),
              __alloT('stem.renewables.at_this_instant_annual_energy_depends_', ' at this instant. Annual energy depends on capacity factor (typically 15–27%).'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.series_vs_parallel_wiring', '🔌 Series vs parallel wiring')),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Series:'), __alloT('stem.renewables.voltages_add_current_stays_the_same_a_', ' voltages add, current stays the same. A weak / shaded panel limits the entire string.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Parallel:'), __alloT('stem.renewables.currents_add_voltage_stays_the_same_sh', ' currents add, voltage stays the same. Shading one panel only loses that panel’s output. Most modern arrays use module-level optimizers / microinverters to get the best of both.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.solar)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // WIND
      // ─────────────────────────────────────────
      function renderWind() {
        var watts = windPowerWatts(simWindV, simWindR, simWindCp);
        var MW = watts / 1e6;
        var swept = Math.PI * simWindR * simWindR;
        // Show power vs Betz max (Cp = 0.593) for the same wind+rotor
        var betzMaxW = windPowerWatts(simWindV, simWindR, 0.593);
        var fracOfBetz = betzMaxW > 0 ? watts / betzMaxW : 0;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌬️ Wind'),
          sourceCard('wind'),
          goalBanner('Goal: see how wind speed cubes (v³) drives turbine output. The Betz limit (Cp = 0.593) is a hard physics ceiling. Even a perfect blade cannot extract more than 59.3% of the wind\'s kinetic energy.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.why_wind_power_scales_with_v', 'Why wind power scales with v³')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.kinetic_energy_of_moving_air_m_v_the_m', 'Kinetic energy of moving air = ½ m v². The mass passing through a rotor per second is ρ·A·v (density × area × speed). Multiply: '),
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.p_a_v', 'P = ½·ρ·A·v³')),
              __alloT('stem.renewables.so_wind_power_scales_with_the_cube_of_', '. So wind power scales with the CUBE of wind speed.')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.betz_s_law', 'Betz’s law:')),
              __alloT('stem.renewables.the_absolute_maximum_power_any_rotor_c', ' the absolute maximum power any rotor can extract is '),
              h('strong', { style: { color: T.accentHi } }, '59.3%'),
              __alloT('stem.renewables.of_the_wind_s_kinetic_energy_if_you_to', ' of the wind’s kinetic energy. If you took 100%, the air behind would be motionless and no more air could flow through. Real turbines hit Cp ≈ 0.35–0.45.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.try_it_wind_turbine_power', '🔬 Try it: wind turbine power')),
            slider({ id: 'sl-wv', label: __alloT('stem.renewables.wind_speed', 'Wind speed'), value: simWindV, min: 1, max: 25, step: 0.5, unit: 'm/s',
              hint: __alloT('stem.renewables.cut_in_3_m_s_rated_12_15_m_s_cut_out_2', 'Cut-in ~3 m/s. Rated ~12–15 m/s. Cut-out ~25 m/s (turbine pitches blades to feather and stops). 1 m/s ≈ 2.24 mph.'),
              onChange: function(v) { upd('simWindV', v); } }),
            slider({ id: 'sl-wr', label: __alloT('stem.renewables.rotor_radius', 'Rotor radius'), value: simWindR, min: 5, max: 120, step: 1, unit: 'm',
              hint: __alloT('stem.renewables.small_wind_2_5_m_modern_utility_onshor', 'Small wind: 2–5 m. Modern utility onshore: 50–80 m. Offshore giants: 100–120 m+ (Haliade-X: 110 m).'),
              onChange: function(v) { upd('simWindR', v); } }),
            slider({ id: 'sl-wcp', label: __alloT('stem.renewables.power_coefficient_cp', 'Power coefficient (Cp)'), value: Math.round(simWindCp * 100), min: 10, max: 59, step: 1, unit: '%',
              hint: __alloT('stem.renewables.real_turbines_35_45_betz_limit_59_3_hi', 'Real turbines: 35–45%. Betz limit: 59.3%. Higher Cp = better blade aerodynamics + control.'),
              onChange: function(v) { upd('simWindCp', v / 100); } }),
            powerBar('Power output (vs same rotor at Betz max)', fracOfBetz, MW.toFixed(3) + ' MW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              __alloT('stem.renewables.swept_area', 'Swept area: '),
              h('strong', { style: { color: T.accentHi } }, swept.toFixed(0) + ' m²'),
              __alloT('stem.renewables.doubling_the_rotor_radius_quadruples_t', '. Doubling the rotor radius QUADRUPLES the swept area — that’s why turbines keep getting bigger.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.onshore_vs_offshore', '🗼 Onshore vs offshore')),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Onshore:'), __alloT('stem.renewables.cheaper_to_install_maintain_land_confl', ' cheaper to install + maintain. Land conflicts (viewsheds, wildlife). Capacity factor 35–45%.')),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'Offshore:'), __alloT('stem.renewables.steadier_wind_larger_rotors_saltwater_', ' steadier wind + larger rotors. Saltwater corrosion + installation cost. Capacity factor 45–55%. Deep water (Gulf of Maine) requires '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.floating_platforms', 'floating platforms')),
                __alloT('stem.renewables.a_maine_specialty', ' — a Maine specialty.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality_2', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.offshore)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // HYDRO
      // ─────────────────────────────────────────
      function renderHydro() {
        var watts = hydroPowerWatts(simHydroHead, simHydroFlow, simHydroEff);
        var MW = watts / 1e6;
        // Reference: scale relative to a small-mid hydro plant (~100 MW max)
        var fracOfRef = Math.min(1, MW / 100);
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌊 Hydropower'),
          sourceCard('hydro'),
          goalBanner('Goal: feel how head (height) and flow (volume) both matter. Pelton turbines want high head + low flow; Kaplan turbines run on low head + high flow. Pick the right turbine for the site.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.the_hydro_power_formula', 'The hydro power formula')),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#06281f', border: '1px solid ' + T.border, fontFamily: 'monospace', fontSize: 14, color: T.accentHi, textAlign: 'center', marginBottom: 8 } },
              __alloT('stem.renewables.p_g_h_q', 'P = ρ × g × h × Q × η')),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, color: T.muted, fontSize: 12, lineHeight: 1.6 } },
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.rho', 'ρ (rho)')), __alloT('stem.renewables.water_density_1000_kg_m', ' = water density = 1000 kg/m³')),
              h('li', null, h('strong', { style: { color: T.text } }, 'g'), __alloT('stem.renewables.gravity_9_81_m_s', ' = gravity = 9.81 m/s²')),
              h('li', null, h('strong', { style: { color: T.text } }, 'h'), __alloT('stem.renewables.head_vertical_drop_in_meters', ' = head = vertical drop in meters')),
              h('li', null, h('strong', { style: { color: T.text } }, 'Q'), __alloT('stem.renewables.flow_rate_in_m_s', ' = flow rate in m³/s')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.eta', 'η (eta)')), __alloT('stem.renewables.turbine_efficiency_typically_0_85_0_95', ' = turbine efficiency, typically 0.85–0.95'))
            ),
            h('p', { style: { margin: '8px 0 0', color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
              __alloT('stem.renewables.notice_both_head_and_flow_appear_once_', 'Notice both head and flow appear ONCE — power is linear in each. Doubling either doubles the power; doubling both quadruples it.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.try_it_hydro_plant_calculator', '🔬 Try it: hydro plant calculator')),
            slider({ id: 'sl-hh', label: __alloT('stem.renewables.head_vertical_drop', 'Head (vertical drop)'), value: simHydroHead, min: 1, max: 800, step: 1, unit: 'm',
              hint: __alloT('stem.renewables.run_of_river_dam_5_20_m_medium_dam_30_', 'Run-of-river dam: 5–20 m. Medium dam: 30–100 m. High alpine plant: 500–1800 m.'),
              onChange: function(v) { upd('simHydroHead', v); } }),
            slider({ id: 'sl-hq', label: __alloT('stem.renewables.flow_rate', 'Flow rate'), value: simHydroFlow, min: 0.1, max: 200, step: 0.1, unit: 'm³/s',
              hint: __alloT('stem.renewables.mountain_stream_0_5_5_m_s_mid_sized_ri', 'Mountain stream: 0.5–5 m³/s. Mid-sized river: 50–100 m³/s. Mississippi: ~17,000 m³/s.'),
              onChange: function(v) { upd('simHydroFlow', v); } }),
            slider({ id: 'sl-he', label: __alloT('stem.renewables.turbine_efficiency', 'Turbine efficiency (η)'), value: Math.round(simHydroEff * 100), min: 60, max: 95, step: 1, unit: '%',
              hint: __alloT('stem.renewables.modern_turbines_90_95_older_or_poorly_', 'Modern turbines: 90–95%. Older or poorly matched: 75–85%.'),
              onChange: function(v) { upd('simHydroEff', v / 100); } }),
            powerBar('Power output (scale: small–mid plant)', fracOfRef, MW.toFixed(3) + ' MW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              __alloT('stem.renewables.for_comparison_hoover_dam_2_080_mw_a_t', 'For comparison: Hoover Dam = 2,080 MW. A typical Maine hydro: 1–20 MW. A microhydro on a farm stream: 5–50 kW.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.three_turbine_families_pick_by_site', 'Three turbine families — pick by site')),
            HYDRO_TURBINES.map(function(t) {
              return h('div', { key: t.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, t.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, t.name)),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                  h('strong', null, 'Head: '), t.head, '  ·  ',
                  h('strong', null, 'Flow: '), t.flow, '  ·  ',
                  h('strong', null, 'Eff: '), t.eff),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 3 } }, t.how),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontStyle: 'italic' } }, t.use)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality_3', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.hydro)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // GEOTHERMAL
      // ─────────────────────────────────────────
      function renderGeo() {
        var tempC = geoTempAtDepth_C(simGeoSurfC, simGeoGrad, simGeoDepth);
        // Plant suitability
        var plant;
        if (tempC < 90) plant = { id: 'gshp', name: __alloT('stem.renewables.too_cool_for_electricity_use_a_ground_', 'Too cool for electricity — use a ground-source heat pump for direct heating'), color: T.warm };
        else if (tempC < 180) plant = { id: 'binary', name: __alloT('stem.renewables.binary_cycle_90_180_c', 'Binary cycle (~90–180°C)'), color: T.accentHi };
        else if (tempC < 235) plant = { id: 'flash', name: __alloT('stem.renewables.flash_steam_180_235_c', 'Flash steam (180–235°C)'), color: T.accent };
        else plant = { id: 'drySteam', name: __alloT('stem.renewables.dry_steam_235_c', 'Dry steam (≥ 235°C)'), color: T.accentHi };
        var fracOfMax = Math.min(1, tempC / 350);
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌋 Geothermal'),
          sourceCard('geothermal'),
          goalBanner('Goal: find the depth that gets you to flash-steam temperature (above 150°C). Below that, you fall back to binary cycle or ground-source heat pumps. Surface temp + thermal gradient + depth set the available energy.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.where_does_the_heat_come_from', 'Where does the heat come from?')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.two_sources_leftover_heat_from_earth_s', 'Two sources: leftover heat from Earth’s formation 4.5 billion years ago, and ongoing radioactive decay of uranium, thorium, and potassium-40 in the mantle. The result: temperature climbs roughly '),
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.25_30_c_per_kilometer', '25–30°C per kilometer')),
              __alloT('stem.renewables.as_you_go_down_in_volcanic_regions_ice', ' as you go down. In volcanic regions (Iceland, Yellowstone, Italy) the gradient is much steeper — 60–200°C/km.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.try_it_how_deep_before_you_reach_steam', '🔬 Try it: how deep before you reach steam?')),
            slider({ id: 'sl-gs', label: __alloT('stem.renewables.surface_temperature', 'Surface temperature'), value: simGeoSurfC, min: -10, max: 35, step: 1, unit: '°C',
              hint: __alloT('stem.renewables.maine_annual_avg_7_c_death_valley_summ', 'Maine annual avg ~7°C. Death Valley summer ~45°C. Antarctic interior − 50°C.'),
              onChange: function(v) { upd('simGeoSurfC', v); } }),
            slider({ id: 'sl-gg', label: __alloT('stem.renewables.geothermal_gradient', 'Geothermal gradient'), value: simGeoGrad, min: 15, max: 200, step: 5, unit: '°C/km',
              hint: __alloT('stem.renewables.25_30_c_km_is_normal_continental_crust', '25–30°C/km is normal continental crust. 60–100 in volcanic zones. 200+ at Iceland’s rift.'),
              onChange: function(v) { upd('simGeoGrad', v); } }),
            slider({ id: 'sl-gd', label: __alloT('stem.renewables.drill_depth', 'Drill depth'), value: simGeoDepth, min: 0.1, max: 10, step: 0.1, unit: 'km',
              hint: __alloT('stem.renewables.most_us_oil_wells_1_3_km_deepest_geoth', 'Most US oil wells: 1–3 km. Deepest geothermal: ~5 km. Kola Superdeep (research): 12.3 km.'),
              onChange: function(v) { upd('simGeoDepth', v); } }),
            powerBar('Resource temperature reached (vs 350°C max)', fracOfMax, tempC.toFixed(0) + ' °C'),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + plant.color } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, __alloT('stem.renewables.best_matched_plant_type_at_this_temper', 'Best matched plant type at this temperature:')),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: plant.color } }, plant.name))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.four_plant_designs', 'Four plant designs')),
            GEO_PLANT_TYPES.map(function(t) {
              return h('div', { key: t.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, t.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, t.name),
                  h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.accentHi, fontFamily: 'monospace' } }, t.tempReq)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 3 } }, t.how),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, t.where)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality_4', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.heatPumps)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SOLAR THERMAL (CSP)
      // ─────────────────────────────────────────
      function renderSolarThermal() {
        var designs = [
          { id: 'trough', icon: '🌞', name: __alloT('stem.renewables.parabolic_trough', 'Parabolic trough'),
            how: 'Long curved mirrors focus sunlight onto a tube of synthetic oil. Oil heats to ~390°C, runs through a heat exchanger to make steam.',
            where: 'Andasol (Spain), Mojave Solar (US, 280 MW). The most-deployed CSP design.' },
          { id: 'tower', icon: '🗼', name: __alloT('stem.renewables.power_tower_heliostat', 'Power tower (heliostat)'),
            how: 'Thousands of flat tracking mirrors (heliostats) focus light on a receiver atop a central tower. Molten salt circulates, hits 565°C.',
            where: 'Ivanpah (US, 392 MW), Crescent Dunes (US, 110 MW + 10h storage), Noor (Morocco).' },
          { id: 'dish', icon: '🌎', name: __alloT('stem.renewables.parabolic_dish_stirling_engine', 'Parabolic dish + Stirling engine'),
            how: 'Single dish concentrates sunlight onto a Stirling engine at the focal point. Modular — each dish is a stand-alone generator.',
            where: 'Mostly demo / R&D. Highest known solar-to-electric efficiency (~30%+).' },
          { id: 'fresnel', icon: '🔲', name: __alloT('stem.renewables.linear_fresnel', 'Linear Fresnel'),
            how: 'Like a parabolic trough but uses flat strips of mirrors at slight angles. Cheaper to build, slightly lower efficiency.',
            where: 'Several MW-scale plants in Spain, India, Australia.' }
        ];
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔆 Solar Thermal (CSP)'),
          sourceCard('solarThermal'),
          goalBanner('Goal: balance mirror area against salt-tank storage hours. More storage equals more dispatchable power AFTER the sun goes down. The defining advantage of CSP over PV is exactly this overnight delivery.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.csp_vs_pv_the_big_difference', 'CSP vs PV — the big difference')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.pv_photovoltaic', 'PV (Photovoltaic):')), __alloT('stem.renewables.photons_electrons_directly_instantly_c', ' photons → electrons directly, instantly. Cheaper. But you can’t store electrons in bulk — need separate batteries.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.csp_concentrated_solar_power', 'CSP (Concentrated Solar Power):')), __alloT('stem.renewables.photons_heat_steam_electricity_more_ex', ' photons → heat → steam → electricity. More expensive. But heat is CHEAP to store in molten salt at 565°C — a CSP plant can run 6–10 hours after sunset on stored heat.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.four_csp_designs', 'Four CSP designs')),
            designs.map(function(d2) {
              return h('div', { key: d2.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, d2.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, d2.name)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 3 } }, d2.how),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontStyle: 'italic' } }, d2.where)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.why_csp_works_in_deserts_but_not_maine', 'Why CSP works in deserts but not Maine')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              __alloT('stem.renewables.csp_needs', 'CSP needs '),
              h('strong', { style: { color: T.text } }, 'direct'),
              __alloT('stem.renewables.sunlight_mirrors_can_t_focus_diffuse_c', ' sunlight — mirrors can’t focus diffuse cloudy light. The economic threshold is ~2000 kWh/m²/year of direct normal irradiance (DNI). Maine averages 1000–1400 kWh/m²/year DNI, well below the cutoff. Spain, Morocco, Nevada, Arizona, Australian outback get 2200–2800 — ideal CSP territory.'))
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // WAVE & TIDAL
      // ─────────────────────────────────────────
      function renderWaveTidal() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌀 Wave & Tidal'),
          sourceCard('waveTidal'),
          goalBanner('Goal: compare wave power (H² × period) to tidal power (v³, like wind but in 800× denser water). Tidal wins for predictability; wave wins for surface energy density. Both are still pre-commercial in most markets.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.wave_vs_tidal_different_physics', 'Wave vs tidal — different physics')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.wave_power', 'Wave power')), __alloT('stem.renewables.comes_from_wind_transferring_energy_to', ' comes from wind transferring energy to the ocean surface (waves are wind’s downstream effect). Wave heights are stochastic and depend on storms thousands of km away.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.tidal_power', 'Tidal power')), __alloT('stem.renewables.comes_from_gravitational_pull_of_the_m', ' comes from gravitational pull of the Moon and Sun. Predictable to the minute, '),
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.decades_in_advance', 'decades in advance')),
              __alloT('stem.renewables.that_predictability_is_incredibly_valu', '. That predictability is incredibly valuable for grid operators.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.four_marine_energy_designs', 'Four marine-energy designs')),
            WAVE_TIDAL_TECH.map(function(t) {
              return h('div', { key: t.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, t.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, t.name),
                  h('span', { style: { marginLeft: 'auto', fontSize: 10, color: T.dim, padding: '2px 8px', borderRadius: 999, background: '#06281f', border: '1px solid ' + T.border } }, t.family)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 3 } }, t.how),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontStyle: 'italic' } }, t.where)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality_5', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.tidal)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // BIOMASS / BIOGAS
      // ─────────────────────────────────────────
      function renderBiomass() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌾 Biomass & Biogas'),
          sourceCard('biomass'),
          goalBanner('Goal: see why combustion of sustainably-grown biomass is treated as carbon-neutral, and why anaerobic digestion (manure -> biogas) is often the better climate move. Compare the two pathways side by side.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.three_pathways_from_organic_matter_to_', 'Three pathways from organic matter to electricity')),
            BIO_PATHS.map(function(p) {
              return h('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, p.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, p.name)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, p.what),
                h('div', { style: { fontSize: 11, color: T.accentHi, marginBottom: 3 } }, h('strong', null, 'Efficiency: '), p.eff),
                h('div', { style: { fontSize: 11, color: T.warm, fontStyle: 'italic', lineHeight: 1.5 } }, h('strong', null, __alloT('stem.renewables.caveat', '⚠ Caveat: ')), p.caveat)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.is_biomass_really_renewable', 'Is biomass really renewable?')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.it_depends_on_the_timescale_burning_a_', 'It depends on the timescale. Burning a tree releases CO₂ today; that carbon was pulled from the atmosphere over decades. If the next tree grows back at the same rate, the cycle is closed — '),
              h('em', null, 'roughly'),
              __alloT('stem.renewables.carbon_neutral_but_if_you_cut_faster_t', ' carbon-neutral. But if you cut faster than regrowth, it’s a net emitter for decades.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.the_strongest_renewable_case_is_anaero', 'The strongest renewable case is anaerobic digestion of waste streams')),
              __alloT('stem.renewables.dairy_manure_food_waste_sewage_landfil', ' — dairy manure, food waste, sewage, landfill gas. That methane was going to be released anyway; capturing and burning it converts CH₂ into CO₂ (much weaker greenhouse gas) AND yields useful electricity + heat.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_reality_6', '🌲 Maine reality')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, MAINE_RENEWABLES.biomass)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // STORAGE
      // ─────────────────────────────────────────
      function renderStorage() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔋 Storage — the answer to intermittency'),
          sourceCard('storage'),
          goalBanner('Goal: pick a storage tech for your use case. Li-ion is fast and portable; pumped hydro is huge and cheap but geography-locked; hydrogen is the only seasonal-scale option. The right answer depends on whether you need hours, days, or months of storage.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.the_intermittency_problem_and_why_stor', 'The intermittency problem — and why storage solves it')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.sun_and_wind_don_t_generate_on_demand_', 'Sun and wind don’t generate on demand. Solar peaks at noon; demand peaks 6–10 PM. Wind is windy when it’s windy. Without storage, a 100% wind-and-solar grid has hours of surplus and hours of nothing.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.storage_moves_energy_across_time_absor', 'Storage moves energy across time — absorb the midday solar surplus, release it at the evening peak. Different storage tech handles different durations: batteries for hours, pumped hydro for days, hydrogen for seasons.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.five_storage_technologies_compared', 'Five storage technologies compared')),
            STORAGE_TYPES.map(function(s) {
              return h('div', { key: s.id, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 8, fontSize: 11, color: T.dim } },
                  h('div', null, h('strong', { style: { color: T.text } }, 'Duration: '), s.duration),
                  h('div', null, h('strong', { style: { color: T.text } }, 'Round-trip: '), s.rte)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 6 } }, s.how),
                h('div', { style: { fontSize: 11, color: T.accentHi, lineHeight: 1.5, marginBottom: 3 } }, h('strong', null, __alloT('stem.renewables.pros', '✓ Pros: ')), s.pros),
                h('div', { style: { fontSize: 11, color: T.warm, lineHeight: 1.5 } }, h('strong', null, __alloT('stem.renewables.cons', '⚠ Cons: ')), s.cons)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.which_storage_do_you_actually_need', 'Which storage do you actually need?')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.hours_1_6_h', 'Hours (1–6 h):')), __alloT('stem.renewables.lithium_ion_batteries_daily_solar_shif', ' Lithium-ion batteries. Daily solar shifting, peak shaving, frequency regulation.')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.days_10_100_h', 'Days (10–100 h):')), __alloT('stem.renewables.pumped_hydro_flow_batteries_compressed', ' Pumped hydro, flow batteries, compressed air.')),
              h('li', null, h('strong', { style: { color: T.text } }, 'Seasons:'), __alloT('stem.renewables.green_hydrogen_only_economic_option_fo', ' Green hydrogen. Only economic option for storing summer solar to use in winter.')),
              h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.heat_for_buildings', 'Heat for buildings:')), __alloT('stem.renewables.hot_water_tanks_ice_storage_building_t', ' Hot-water tanks, ice storage, building thermal mass. Cheap, mature, underused.'))
            )
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // QUIZ
      // ─────────────────────────────────────────
      function renderQuiz() {
        var qIdx = quizState.idx || 0;
        var done = qIdx >= QUIZ.length;
        if (done) {
          var score = quizState.score || 0;
          var pct = Math.round((score / QUIZ.length) * 100);
          var label = pct >= 90 ? 'Energy Engineer' : pct >= 70 ? 'Renewables Pro' : pct >= 50 ? 'Renewables Apprentice' : 'Keep going — try a module';
          return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
            backBar('📝 Quiz — Results'),
            h('div', { style: { padding: 24, borderRadius: 14, background: T.card, border: '2px solid ' + T.accent, textAlign: 'center', marginBottom: 14 } },
              h('div', { style: { fontSize: 42, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } }, score + ' / ' + QUIZ.length),
              h('div', { style: { fontSize: 18, color: T.text, marginTop: 6 } }, pct + '%'),
              h('div', { style: { fontSize: 14, color: T.accentHi, fontWeight: 700, marginTop: 8 } }, label)),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-rn-focusable': true,
                onClick: function() { upd('quizState', { idx: 0, score: 0, answered: false, lastChoice: null }); rnAnnounce(__alloT('stem.renewables.sr_quiz_reset', 'Quiz reset')); },
                style: btn() }, __alloT('stem.renewables.try_again', '🔄 Try again')),
              h('button', { 'data-rn-focusable': true,
                onClick: function() { upd('view', 'menu'); },
                style: btnPrimary() }, __alloT('stem.renewables.back_to_menu', '← Back to menu'))),
            (function() { if (pct >= 70) awardBadge('renewables_quiz_pass', 'Quiz Passed (70%+)'); return null; })(),
            (function() { if (pct >= 90) awardBadge('renewables_quiz_ace', 'Quiz Ace (90%+)'); return null; })(),
            footer()
          );
        }
        var q = QUIZ[qIdx];
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('📝 Quiz'),
          // Pre-quiz brief — auto-opens on Q1 so first-timers see the
          // scope, collapses by default once they have progressed.
          h('details', {
            open: qIdx === 0,
            style: { marginBottom: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border }
          },
            h('summary', { style: { cursor: 'pointer', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: T.accentHi, listStyle: 'none' } }, __alloT('stem.renewables.what_this_quiz_covers_click_to_toggle', '📜 What this quiz covers (click to toggle)')),
            h('div', { style: { padding: '0 12px 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('p', { style: { margin: '0 0 6px' } }, QUIZ.length + ' questions spanning the 8 sources + storage + grid integration. ', __alloT('stem.renewables.pass_at_70_earns_the_quiz_passed_badge', 'Pass at 70% earns the Quiz Passed badge; 90% earns Quiz Ace.')),
              h('ul', { style: { margin: 0, paddingLeft: 18 } },
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.solar_pv_2', 'Solar PV:')), __alloT('stem.renewables.irradiance_efficiency_tilt_capacity_fa', ' irradiance, efficiency, tilt, capacity factor.')),
                h('li', null, h('strong', { style: { color: T.text } }, 'Wind:'), __alloT('stem.renewables.v_law_betz_limit_capacity_factor_by_cl', ' v³ law, Betz limit, capacity factor by class.')),
                h('li', null, h('strong', { style: { color: T.text } }, 'Hydro:'), __alloT('stem.renewables.head_flow_turbine_types_pumped_storage', ' head + flow, turbine types, pumped storage.')),
                h('li', null, h('strong', { style: { color: T.text } }, 'Geothermal:'), __alloT('stem.renewables.thermal_gradient_flash_vs_binary_vs_gs', ' thermal gradient, flash vs binary vs GSHP.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.wave_tidal_2', 'Wave / Tidal:')), __alloT('stem.renewables.wave_power_formula_tidal_vs_water_dens', ' wave power formula, tidal vs water density.')),
                h('li', null, h('strong', { style: { color: T.text } }, 'Biomass:'), __alloT('stem.renewables.combustion_anaerobic_digestion_carbon_', ' combustion, anaerobic digestion, carbon accounting.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.storage_grid', 'Storage + Grid:')), __alloT('stem.renewables.li_ion_vs_flow_vs_pumped_vs_hydrogen_c', ' Li-ion vs flow vs pumped vs hydrogen, capacity factor, dispatchability.'))
              )
            )
          ),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
            __alloT('stem.renewables.question', 'Question '), h('strong', { style: { color: T.text } }, (qIdx + 1) + ' of ' + QUIZ.length),
            __alloT('stem.renewables.score', '  ·  Score: '), h('strong', { style: { color: T.accentHi } }, (quizState.score || 0))),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, q.icon),
              h('div', { style: { fontSize: 14, color: T.text, lineHeight: 1.55, fontWeight: 600 } }, q.stem)),
            q.choices.map(function(c, i) {
              var picked = quizState.lastChoice === i;
              var correct = q.correct === i;
              var bg = T.cardAlt, bd = T.border;
              if (quizState.answered) {
                if (correct) { bg = '#064e3b'; bd = T.accent; }
                else if (picked) { bg = '#7f1d1d'; bd = T.danger; }
              } else if (picked) { bg = T.cardAlt; bd = T.accentHi; }
              return h('button', { key: i, 'data-rn-focusable': true,
                disabled: quizState.answered,
                'aria-label': 'Choice ' + (i + 1) + ': ' + c + (quizState.answered && correct ? ' (correct answer)' : '') + (quizState.answered && picked && !correct ? ' (your answer, incorrect)' : ''),
                onClick: function() {
                  if (quizState.answered) return;
                  var isCorrect = i === q.correct;
                  upd('quizState', {
                    idx: qIdx,
                    score: (quizState.score || 0) + (isCorrect ? 1 : 0),
                    answered: true,
                    lastChoice: i
                  });
                  // ── Quiz Mastery: per-question first-correct log ──
                  // Quiz scores reset between attempts; mastery sticks. Each
                  // question is keyed by its stable id. First-correct fires
                  // a celebration overlay.
                  if (isCorrect) {
                    var prevMastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
                    var existingEntry = prevMastery[q.id];
                    var nowIso = new Date().toISOString();
                    var nextMastery = Object.assign({}, prevMastery);
                    if (existingEntry) {
                      nextMastery[q.id] = Object.assign({}, existingEntry, {
                        lastCorrectAt: nowIso,
                        correctCount: (existingEntry.correctCount || 0) + 1
                      });
                    } else {
                      nextMastery[q.id] = {
                        firstCorrectAt: nowIso,
                        lastCorrectAt: nowIso,
                        correctCount: 1,
                        icon: q.icon
                      };
                      try { setRenCeleb({ icon: q.icon, stem: q.stem, total: Object.keys(nextMastery).length, at: Date.now() }); } catch (e) {}
                      try { setTimeout(function () { setRenCeleb(null); }, 3500); } catch (e) {}
                    }
                    upd('quizMastery', nextMastery);
                  }
                  rnAnnounce(isCorrect ? 'Correct!' : 'Not quite. ' + q.why);
                },
                style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: bg, border: '2px solid ' + bd, color: T.text, fontSize: 13, cursor: quizState.answered ? 'default' : 'pointer' }
              }, c);
            }),
            quizState.answered && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.accent } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, 'Why:'),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, q.why))
          ),
          quizState.answered && h('button', { 'data-rn-focusable': true,
            onClick: function() {
              upd('quizState', { idx: qIdx + 1, score: quizState.score || 0, answered: false, lastChoice: null });
            },
            style: btnPrimary({ width: '100%' }) }, qIdx + 1 >= QUIZ.length ? '🏁 See results' : 'Next question →'),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SITE SELECTOR (net-new mini-game)
      // 10 location profiles; player picks the best renewable energy source
      // from 7 options. Tests siting reasoning — what resource matches the
      // location's wind, solar, water, geology, and waste constraints. Mix
      // of Maine-specific + global scenarios.
      // ─────────────────────────────────────────
      function renderSiteSelector() {
        var SOURCES = [
          { id: 'roofPv',      label: __alloT('stem.renewables.rooftop_solar_pv', 'Rooftop solar PV'),     color: '#f59e0b', icon: '☀️',
            def: 'Distributed, residential or commercial rooftop. ~5 kW typical. Payback 6-12 yrs. Limited by roof area + orientation.' },
          { id: 'utilPv',      label: __alloT('stem.renewables.utility_solar_farm', 'Utility solar farm'),   color: '#fbbf24', icon: '🌞',
            def: 'Centralized PV at scale (10-500 MW+). Needs flat open land + grid interconnect. Cheapest electricity in history per kWh.' },
          { id: 'onshore',     label: __alloT('stem.renewables.onshore_wind', 'Onshore wind'),         color: '#22c55e', icon: '🌬️',
            def: 'Land turbines, typically 2-5 MW each. Needs sustained 6-9 m/s winds + open terrain. Largest cumulative renewable installed in US.' },
          { id: 'offshore',    label: __alloT('stem.renewables.offshore_wind', 'Offshore wind'),        color: '#0284c7', icon: '🌊',
            def: 'Marine turbines, typically 8-15 MW each. Higher capacity factor than onshore (~50% vs 35%); higher install cost. Continental shelf siting.' },
          { id: 'hydro',       label: __alloT('stem.renewables.hydropower_2', 'Hydropower'),           color: '#0ea5e9', icon: '💧',
            def: 'Stored gravitational energy of water via dam or run-of-river. Needs vertical drop + steady flow. Dispatchable (unlike most renewables).' },
          { id: 'geothermal',  label: __alloT('stem.renewables.geothermal_2', 'Geothermal'),           color: '#dc2626', icon: '🌋',
            def: 'Earth-internal heat (volcanic / hot-springs zones for power; ground-source heat pumps work everywhere for heating/cooling).' },
          { id: 'waveTidal',   label: __alloT('stem.renewables.wave_tidal_3', 'Wave / Tidal'),         color: '#06b6d4', icon: '🌀',
            def: 'Marine kinetic energy. Tidal streams predictable for decades. Less mature; high marine-environment cost.' },
          { id: 'biomass',     label: __alloT('stem.renewables.biomass_biogas_2', 'Biomass / biogas'),     color: '#84cc16', icon: '🌾',
            def: 'Combustion of wood waste, agricultural residues, or anaerobic digestion of organic matter to methane. Best where waste streams already exist.' }
        ];
        var V = [
          { id: 1, location: 'Aroostook County potato farm in northern Maine. Large flat fields, regular winds 6-9 m/s, no major rivers nearby, good (but not exceptional) sunlight. Looking for utility-scale generation that can be sited on existing farmland with minimal disruption.', correct: 'onshore',
            why: 'Open flat land + sustained wind speeds in the right range = canonical onshore wind. Aroostook is part of Maine\'s wind-energy expansion plans. Farms can lease land to wind developers and continue farming around the turbines (~99% of land remains usable). Solar would also work but uses more land per MW.' },
          { id: 2, location: 'Coastal Bath, Maine. Strong tidal currents twice daily through narrow inlet (Kennebec River mouth). Existing maritime industrial infrastructure (Bath Iron Works). Looking for a pilot-scale dispatchable renewable.', correct: 'waveTidal',
            why: 'Tidal currents are highly predictable (decades in advance) — a major advantage for grid integration. Narrow inlets concentrate current speeds. Maine is one of a few US states with viable tidal-current resources. Existing maritime infrastructure (BIW) means trained workforce + dock access. Still pre-commercial in most US markets but Bath is a leading pilot site.' },
          { id: 3, location: 'Reykjavík metropolitan area, Iceland. Active volcanic geology, abundant hot springs at 200°C+. ~80% of homes already heated this way. Looking to expand power generation capacity.', correct: 'geothermal',
            why: 'Iceland sits on the Mid-Atlantic Ridge — one of the most geothermally active places on Earth. ~30% of Iceland\'s electricity is geothermal; ~85% of homes use geothermal heat. The high-temperature volcanic-zone resource enables both power generation (flash steam) and direct-use heating. Geothermal heat pumps work everywhere; full geothermal POWER plants need this kind of resource.' },
          { id: 4, location: 'Single-family home in Phoenix, Arizona. South-facing roof with 600 sq ft of usable area. ~300 sunny days/yr. Homeowner wants to reduce a $250/mo electric bill. Wants distributed (own-the-equipment) solution.', correct: 'roofPv',
            why: 'Hot dry climate + south-facing roof + high electric bill = textbook rooftop solar PV case. ~6 kW system covers most household consumption; payback 5-8 years in Arizona with current incentives. Compared to utility solar: rooftop is more expensive per kWh but the homeowner captures the savings directly + has resilience.' },
          { id: 5, location: 'Maine paper mill with year-round wood-product byproducts (sawdust, bark, scrap chips). Existing steam-turbine infrastructure for process heat. Looking to displace fuel oil currently used for boiler.', correct: 'biomass',
            why: 'Co-located waste stream + existing combustion infrastructure = ideal biomass case. The mill already burns fuel; switching to wood waste turns a disposal cost into an energy revenue. Maine paper industry has been doing this since the 1980s. Net carbon benefit depends on whether the wood is genuine waste vs grown for fuel.' },
          { id: 6, location: 'Mountain canyon in Pacific Northwest. Steady year-round flow from snowmelt. Existing reservoir 200 ft above downstream powerhouse site. Project will be dispatchable and serve grid balancing.', correct: 'hydro',
            why: 'Vertical drop (head) + steady flow = classic hydropower. The dispatchability is the key advantage: unlike wind/solar, hydro can be ramped up/down in minutes to balance grid demand. PNW hydro is ~60% of regional electricity. New dam construction is rare now (environmental impact + best sites already taken); pumped-storage hydro retrofits are growing.' },
          { id: 7, location: 'Mojave Desert, southern California. Several thousand acres of flat undeveloped land. 320+ sunny days per year. Existing 500 kV transmission line crosses the property. Investor seeks utility-scale clean generation.', correct: 'utilPv',
            why: 'Best solar resource in the contiguous US + cheap flat land + transmission interconnect = utility-scale solar farm. Modern utility PV beats every other generation source on cost per MWh. Mojave hosts some of the largest solar installations in the world. Compare to rooftop: utility PV is ~50% cheaper per kWh but the homeowner captures none of the savings.' },
          { id: 8, location: 'North Sea continental shelf, 30 km off the UK coast. Constant strong winds (10+ m/s annual average). Water depth ~30 m (within fixed-foundation range). Existing offshore-wind installation expanding capacity.', correct: 'offshore',
            why: 'Strong sustained winds (much higher than onshore averages) + shallow continental shelf = offshore wind heartland. Capacity factors are 50%+ vs ~35% for onshore. The North Sea hosts the world\'s largest offshore wind installations. Higher CapEx than onshore wind (marine construction is expensive) but higher output per turbine offsets it.' },
          { id: 9, location: 'Vermont single-family home. Existing electric baseboard heat costs $400/mo in winter. Modest sunshine (lower than Arizona). Homeowner has $30k budget for a renewable + heat-pump combo.', correct: 'roofPv',
            why: 'Even in lower-sun climates, rooftop solar makes sense when paired with a heat pump (replacing inefficient electric resistance heat). The combo: solar PV (~5 kW) + air-source heat pump can cut heating costs by 60-70% AND offset most household electricity. Vermont and Maine both have strong policy incentives for this stack. Geothermal heat pumps (GSHPs) are even better but cost 2-3x more upfront.' },
          { id: 10, location: 'Pacific Northwest sawmill complex producing 50,000 tons/year of wood-product residues. Currently paying landfill fees to dispose of bark + sawdust. Local utility offers $0.08/kWh purchase contract for renewable power.', correct: 'biomass',
            why: 'Existing waste stream that costs money to dispose of + utility willing to buy the resulting power = biomass economics work. Sawmills, paper mills, and lumber operations are the canonical US biomass sites. Pellet exports to Europe + on-site power generation are both common. Like #5, the carbon math depends on whether the wood is genuine waste.' }
        ];

        var rsIdx = d.rsIdx == null ? -1 : d.rsIdx;
        var rsSeed = d.rsSeed || 1;
        var rsAns = !!d.rsAns;
        var rsPick = d.rsPick;
        var rsScore = d.rsScore || 0;
        var rsRounds = d.rsRounds || 0;
        var rsStreak = d.rsStreak || 0;
        var rsBest = d.rsBest || 0;
        var rsShown = d.rsShown || [];

        function startRs() {
          var pool = [];
          for (var i = 0; i < V.length; i++) if (rsShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); rsShown = []; }
          var seedNext = ((rsSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('rsSeed', seedNext);
          upd('rsIdx', pick);
          upd('rsAns', false);
          upd('rsPick', null);
          upd('rsShown', rsShown.concat([pick]));
        }
        function pickRs(srcId) {
          if (rsAns) return;
          var v = V[rsIdx];
          var correct = srcId === v.correct;
          var newScore = rsScore + (correct ? 1 : 0);
          var newStreak = correct ? (rsStreak + 1) : 0;
          var newBest = Math.max(rsBest, newStreak);
          upd('rsAns', true);
          upd('rsPick', srcId);
          upd('rsScore', newScore);
          upd('rsRounds', rsRounds + 1);
          upd('rsStreak', newStreak);
          upd('rsBest', newBest);
        }

        if (rsIdx < 0) {
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🕵️ Site Selector'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 16, color: T.text } }, __alloT('stem.renewables.10_location_profiles_pick_the_best_ren', '10 location profiles — pick the best renewable')),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.renewables.for_each_location_pick_the_best_renewa', 'For each location, pick the best renewable energy source from 8 options. Vignettes mix Maine-specific (Aroostook wind, Bath tidal, paper-mill biomass) and global (Iceland geothermal, Mojave utility PV, North Sea offshore wind, PNW hydro). Coaching cites the resource match + the trade-offs against alternatives.'))
            ),
            goalBanner('Goal: "best" means lowest levelized cost of energy (LCOE) for THAT site, given its actual resource profile. The same source can be the right answer in one location and wrong in another. Different priorities (carbon, equity, reliability) can pick different winners; this game scores you against an engineering / resource-match rubric.'),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, __alloT('stem.renewables.the_8_renewable_sources', 'The 8 renewable sources')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                SOURCES.map(function(s) {
                  return h('div', { key: s.id, style: { padding: '8px 10px', borderRadius: 8, background: s.color + '15', border: '1px solid ' + s.color + '55' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                      h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, s.icon),
                      h('span', { style: { color: s.color, fontWeight: 800, fontSize: 12 } }, s.label)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, s.def)
                  );
                })
              )
            ),
            h('button', {
              onClick: startRs,
              style: { width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
            }, __alloT('stem.renewables.start_site_1_of_10', '🕵️ Start — site 1 of 10'))
          );
        }

        var v = V[rsIdx];
        var pickedCorrect = rsAns && rsPick === v.correct;
        var pct = rsRounds > 0 ? Math.round((rsScore / rsRounds) * 100) : 0;
        var allDone = rsShown.length >= V.length && rsAns;
        var correctSrc = SOURCES.filter(function(s) { return s.id === v.correct; })[0];
        var pickedSrc = rsPick ? SOURCES.filter(function(s) { return s.id === rsPick; })[0] : null;

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🕵️ Site Selector'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12, color: T.dim, marginBottom: 12 } },
            h('span', null, __alloT('stem.renewables.site', 'Site '), h('strong', { style: { color: T.text } }, rsShown.length)),
            h('span', null, __alloT('stem.renewables.score_2', 'Score '), h('strong', { style: { color: T.good || '#22c55e' } }, rsScore + ' / ' + rsRounds)),
            rsRounds > 0 && h('span', null, __alloT('stem.renewables.accuracy', 'Accuracy '), h('strong', { style: { color: T.link || '#0ea5e9' } }, pct + '%')),
            h('span', null, __alloT('stem.renewables.streak', 'Streak '), h('strong', { style: { color: T.warm || '#f59e0b' } }, rsStreak)),
            h('span', null, __alloT('stem.renewables.best', 'Best '), h('strong', { style: { color: T.accentHi || '#fbbf24' } }, rsBest))
          ),
          h('section', { style: { padding: 16, borderRadius: 12, background: T.card, border: '2px solid ' + T.accent + '88', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Site ' + rsShown.length + ' of ' + V.length),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, v.location)
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': __alloT('stem.renewables.pick_the_best_renewable_for_this_site', 'Pick the best renewable for this site') },
            SOURCES.map(function(s) {
              var picked = rsAns && rsPick === s.id;
              var isRight = rsAns && s.id === v.correct;
              var bg, border, color;
              if (rsAns) {
                if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#bbf7d0'; }
                else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = '#ef4444'; color = '#fecaca'; }
                else { bg = T.cardAlt; border = T.border; color = T.dim; }
              } else {
                bg = s.color + '15'; border = s.color + '55'; color = T.text;
              }
              return h('button', { key: s.id, role: 'radio',
                'aria-checked': picked ? 'true' : 'false',
                'aria-label': s.label,
                disabled: rsAns,
                onClick: function() { pickRs(s.id); },
                style: { padding: '10px 12px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: rsAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                  h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, s.icon),
                  h('span', { style: { color: rsAns ? color : s.color, fontSize: 12, fontWeight: 800 } }, s.label)
                ),
                h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: rsAns ? color : T.muted } }, s.def)
              );
            })
          ),
          rsAns && h('section', {
            style: {
              marginTop: 12, padding: '12px 14px', borderRadius: 10,
              background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
              border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)')
            }
          },
            h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#86efac' : '#fca5a5' } },
              pickedCorrect
                ? '✅ Correct — ' + correctSrc.label
                : '❌ Best fit is ' + correctSrc.label + (pickedSrc ? ' (you picked ' + pickedSrc.label + ')' : '')
            ),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 12, lineHeight: 1.55 } }, v.why),
            allDone
              ? h('div', { style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.accent } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: T.accentHi, marginBottom: 4 } }, __alloT('stem.renewables.all_10_sites_complete', '🏆 All 10 sites complete')),
                  h('div', { style: { color: T.text, fontSize: 12, lineHeight: 1.5 } },
                    'Final: ', h('strong', null, rsScore + ' / ' + V.length + ' (' + Math.round((rsScore / V.length) * 100) + '%)'),
                    rsScore === V.length ? ' — every siting decision correct. Ready for actual project siting work.' :
                    rsScore >= 8 ? ' — strong siting reasoning. The most-confused pair is usually rooftop vs utility solar (homeowner-distributed vs centralized) and onshore vs offshore wind (cost vs capacity factor trade-off).' :
                    rsScore >= 6 ? ' — solid baseline. Reflexes worth building: open flat windy = onshore wind, sunny + transmission line = utility solar, existing waste stream = biomass, dispatchability needed = hydro.' :
                    ' — these decisions take practice. Re-read the rationales on misses; siting is fundamentally about matching the resource to the location\'s natural endowments.'
                  ),
                  h('button', {
                    onClick: function() { upd('rsIdx', -1); upd('rsShown', []); upd('rsScore', 0); upd('rsRounds', 0); upd('rsStreak', 0); },
                    style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                  }, __alloT('stem.renewables.restart', '🔄 Restart'))
                )
              : h('button', {
                  onClick: startRs,
                  style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                }, __alloT('stem.renewables.next_site', '➡️ Next site'))
          )
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES
      // ─────────────────────────────────────────
      function renderResources() {
        function section(title, items) {
          return h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, title),
            items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, r.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text } }, r.name)),
                h('div', { style: { fontSize: 13, color: T.accentHi, fontWeight: 600, marginLeft: 24 } },
                  r.url
                    ? h('a', { href: r.url, target: '_blank', rel: 'noopener', style: { color: T.accentHi, textDecoration: 'underline' }, 'aria-label': r.name + ' — ' + r.contact + ' (opens in new tab)' }, r.contact)
                    : r.contact),
                h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 24, lineHeight: 1.5 } }, r.desc)
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.renewables.every_organization_cited_in_this_tool_', 'Every organization cited in this tool. NREL is the single best free resource for capacity factors and cost trends; the Annual Technology Baseline (ATB) is updated yearly.')),
          section('🌐 Primary data sources', RESOURCES.primary),
          section('⚡ Source-specific orgs', RESOURCES.sourceSpecific),
          section('🌲 Maine + regional', RESOURCES.maine),
          section('📚 Classroom + curriculum', RESOURCES.classroom),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // COMPARE — comparison table + capacity factor explainer
      // ─────────────────────────────────────────
      function renderCompare() {
        function dispatchDots(n) {
          var dots = '';
          for (var i = 0; i < 5; i++) dots += i < n ? '●' : '○';
          return dots;
        }
        return h('div', { style: { padding: 20, maxWidth: '62.5rem', width: '100%', margin: '0 auto', color: T.text } },
          backBar('📊 Compare All Sources'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.first_what_is_capacity_factor_and_why_', 'First — what is "capacity factor" and why does it matter?')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.capacity_factor_2', 'Capacity factor')),
              __alloT('stem.renewables.actual_annual_energy_output_what_the_p', ' = actual annual energy output ÷ what the plant would produce at 100% rated power 24/7/365.')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.example_a_1_mw_solar_farm_in_maine_gen', 'Example: a 1 MW solar farm in Maine generates ~1.7 GWh per year. If it ran flat-out 24/7 it would produce 8.76 GWh. So its capacity factor is 1.7 / 8.76 ≈ '),
              h('strong', { style: { color: T.accentHi } }, '19%'),
              '.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.this_is_why_1_gw_of_solar_and_1_gw_of_', 'This is why "1 GW of solar" and "1 GW of nuclear" are NOT equivalent — the nuclear plant runs near 90% CF, the solar farm near 20%. To match annual energy from 1 GW nuclear, you need ~4–5 GW of solar (plus storage to match dispatchability).'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.side_by_side_comparison', 'Side-by-side comparison')),
            h('table', { 'aria-label': __alloT('stem.renewables.comparison_table_of_renewable_and_refe', 'Comparison table of renewable and reference electricity sources'),
              style: { width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 12 } },
              h('thead', null,
                h('tr', { style: { background: T.cardAlt } },
                  ['Source', 'Capacity factor', 'LCOE $/MWh', 'Land use', 'Water use', 'CO₂ g/kWh', 'Dispatchable'].map(function(c, i) {
                    return h('th', { key: i, scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi, borderBottom: '2px solid ' + T.border } }, c);
                  })
                )
              ),
              h('tbody', null,
                COMPARE_TABLE.map(function(row, i) {
                  return h('tr', { key: row.id, style: { background: row.ref ? '#3a1a1a' : (i % 2 === 0 ? T.cardAlt : T.card), borderBottom: '1px solid ' + T.border } },
                    h('td', { style: { padding: '8px 10px', color: T.text, fontWeight: 600 } },
                      h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, row.icon),
                      row.name),
                    h('td', { style: { padding: '8px 10px', color: T.muted, fontFamily: 'monospace' } }, row.cf),
                    h('td', { style: { padding: '8px 10px', color: T.muted, fontFamily: 'monospace' } }, row.lcoe),
                    h('td', { style: { padding: '8px 10px', color: T.muted } }, row.land),
                    h('td', { style: { padding: '8px 10px', color: T.muted } }, row.water),
                    h('td', { style: { padding: '8px 10px', color: row.ref ? T.warn : T.accentHi, fontFamily: 'monospace', fontWeight: 700 } }, row.co2),
                    h('td', { style: { padding: '8px 10px', color: T.accent, fontFamily: 'monospace', letterSpacing: 2,
                      title: row.dispatch + ' of 5' } }, dispatchDots(row.dispatch))
                  );
                })
              )
            ),
            h('div', { style: { marginTop: 10, fontSize: 10, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.renewables.sources_nrel_annual_technology_baselin', 'Sources: NREL Annual Technology Baseline 2024 (LCOE, capacity factor); IPCC AR6 WG3 Annex III (lifecycle CO₂ medians); Macknick 2012 + NREL (water); Hertwich 2015 + DOE (land use). The two reference rows (red) are NOT renewables — included for honest comparison.'))
          ),
          // Footnotes for rows that have a note
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.important_caveats', 'Important caveats')),
            COMPARE_TABLE.filter(function(r) { return r.note; }).map(function(r) {
              return h('div', { key: r.id, style: { fontSize: 11, color: T.muted, marginBottom: 6, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.icon + ' ' + r.name + ': '),
                r.note);
            })
          ),
          // Capacity-factor bar chart — the renewables-literacy crux: nameplate MW is misleading;
          // what matters is the fraction of that nameplate actually delivered over a year. Typical
          // values (consistent with the cf column ranges above; sources cited in the table footer).
          (function() {
            var CF = [
              { icon: '☀️', name: __alloT('stem.renewables.solar_pv_3', 'Solar PV'), cf: 23, color: '#fbbf24' },
              { icon: '🌬️', name: __alloT('stem.renewables.wind_2', 'Wind'), cf: 35, color: '#38bdf8' },
              { icon: '🌊', name: __alloT('stem.renewables.hydro', 'Hydro'), cf: 40, color: '#22d3ee' },
              { icon: '🌋', name: __alloT('stem.renewables.geothermal_3', 'Geothermal'), cf: 74, color: '#f97316' },
              { icon: '🔥', name: __alloT('stem.renewables.gas_combined_cycle', 'Gas (combined-cycle)'), cf: 57, color: '#94a3b8' },
              { icon: '⚛️', name: __alloT('stem.renewables.nuclear', 'Nuclear'), cf: 93, color: '#a78bfa' }
            ];
            var W = 290, rowH = 20, padT = 8, barX = 120, barW = 150;
            var Hh = padT + CF.length * rowH + 4;
            var sx = function(p) { return (p / 100) * barW; };
            return h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 } }, __alloT('stem.renewables.capacity_factor_typical_of_nameplate_a', 'Capacity factor — typical % of nameplate actually delivered')),
              h('div', { style: { fontSize: 10, color: T.muted, marginBottom: 6, lineHeight: 1.45 } }, __alloT('stem.renewables.a_1_mw_solar_farm_and_a_1_mw_nuclear_p', 'A 1 MW solar farm and a 1 MW nuclear plant have the same nameplate — but very different annual output. This is why nameplate MW alone is misleading.')),
              h('svg', { viewBox: '0 0 ' + W + ' ' + Hh, width: '100%', role: 'img', 'aria-label': 'Capacity factor by source: ' + CF.map(function(s) { return s.name + ' ' + s.cf + '%'; }).join(', ') + '.' },
                CF.map(function(s, i) {
                  var y = padT + i * rowH;
                  return h('g', { key: s.name },
                    h('text', { x: 2, y: y + 11, fontSize: 9, fill: T.text }, s.icon + ' ' + s.name),
                    h('rect', { x: barX, y: y + 2, width: barW, height: 11, rx: 3, fill: 'rgba(148,163,184,0.18)' }),
                    h('rect', { x: barX, y: y + 2, width: sx(s.cf), height: 11, rx: 3, fill: s.color }),
                    h('text', { x: barX + sx(s.cf) + 4, y: y + 11, fontSize: 9, fontWeight: 700, fill: T.text }, s.cf + '%'));
                })
              )
            );
          })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // ENERGY MIX DESIGNER — synthesis sim
      // Sliders for each source's % share. Computes weighted average
      // CO₂/kWh + reliability score + storage need flag.
      // ─────────────────────────────────────────
      function renderMix() {
        // Hard-cap each share so total never exceeds 100; remainder is "fossil gap"
        var mixTotal = mixSolar + mixWind + mixHydro + mixGeo + mixNuclear + mixGas;
        var mixGap = Math.max(0, 100 - mixTotal);
        var mixOver = Math.max(0, mixTotal - 100);
        // Lifecycle CO₂ g/kWh (IPCC AR6 medians)
        var co2 = (mixSolar * 40 + mixWind * 11 + mixHydro * 24 + mixGeo * 38 + mixNuclear * 12 + mixGas * 490 + mixGap * 820) / 100;
        // Reliability score: weighted avg of dispatchability (0-5) where solar/wind = 1
        var rel = (mixSolar * 1 + mixWind * 1 + mixHydro * 4 + mixGeo * 5 + mixNuclear * 5 + mixGas * 5 + mixGap * 5) / 100;
        // Variable share — drives storage need
        var variableShare = mixSolar + mixWind;
        var storageHint = variableShare < 30 ? 'Light storage (1–2 h batteries enough).'
          : variableShare < 60 ? 'Substantial storage (4–6 h batteries + some pumped hydro).'
          : variableShare < 80 ? 'Heavy storage (8+ h batteries + transmission + some hydrogen).'
          : 'Very heavy storage + diverse geography. Hydrogen or long-duration tech essential.';
        // Compare to all-coal baseline (820 g/kWh)
        var pctReduction = Math.round((1 - co2 / 820) * 100);
        var renewablesShare = mixSolar + mixWind + mixHydro + mixGeo;

        function mixSlider(idKey, label, value, color, max, hint) {
          return h('div', { style: { marginBottom: 12 } },
            h('label', { htmlFor: 'mix-' + idKey, style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 } },
              h('span', null, label),
              h('span', { style: { color: color, fontFamily: 'monospace' } }, value + '%')
            ),
            h('input', { id: 'mix-' + idKey, 'data-rn-focusable': true, type: 'range',
              min: 0, max: (max || 100), step: 1, value: value,
              'aria-label': label + ' share, ' + value + ' percent',
              onChange: function(e) { upd(idKey, parseInt(e.target.value, 10)); },
              style: { width: '100%', accentColor: color, cursor: 'pointer' }
            }),
            hint && h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } }, hint)
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎛️ Energy Mix Designer'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.renewables.design_an_electricity_mix_for_a_region', 'Design an electricity mix for a region. Slide each source. The remainder fills with coal (the dirtiest baseline). See lifecycle CO₂, reliability, and how much storage you would need.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            mixSlider('mixSolar',   '☀️ Solar PV',     mixSolar,   '#facc15', 100, 'CF ~20%. Cheap. Variable. Daytime.'),
            mixSlider('mixWind',    '🌬️ Wind',          mixWind,    '#7dd3fc', 100, 'CF ~40%. Cheap. Variable. Often complementary to solar.'),
            mixSlider('mixHydro',   '🌊 Hydro',          mixHydro,   '#06b6d4', 50, 'CF ~45%. Dispatchable. Limited by geography.'),
            mixSlider('mixGeo',     '🌋 Geothermal',     mixGeo,     '#fb7185', 30, 'CF ~85%. Dispatchable. Site-limited.'),
            mixSlider('mixNuclear', '⚛️ Nuclear (low-C)', mixNuclear, '#a78bfa', 60, 'CF ~92%. Dispatchable. Expensive new builds.'),
            mixSlider('mixGas',     '🔥 Natural gas (transition)', mixGas, '#f97316', 50, '490 gCO₂/kWh — transition fuel, not net-zero.')
          ),
          mixOver > 0 && h('div', { style: { padding: 10, borderRadius: 8, background: '#7f1d1d', border: '1px solid ' + T.danger, color: '#fde2e2', fontSize: 12, marginBottom: 12 } },
            '⚠ Total exceeds 100% by ' + mixOver + '%. Reduce some sliders.'),
          mixGap > 0 && h('div', { style: { padding: 10, borderRadius: 8, background: '#3a1a1a', border: '1px solid ' + T.warn, color: T.warm, fontSize: 12, marginBottom: 12 } },
            '⚠ ' + mixGap + '% unfilled — defaulting to coal (820 g CO₂/kWh) for honest accounting.'),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.your_mix_at_a_glance', '📈 Your mix at a glance')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.lifecycle_co', 'Lifecycle CO₂')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: co2 < 100 ? T.accent : co2 < 300 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  co2.toFixed(0) + ' g/kWh'),
                h('div', { style: { fontSize: 10, color: T.dim } }, pctReduction + '% below coal baseline')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.reliability_score', 'Reliability score')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: rel >= 3 ? T.accent : rel >= 2 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  rel.toFixed(1) + ' / 5'),
                h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.higher_more_dispatchable', 'Higher = more dispatchable'))),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.renewable_share', 'Renewable share')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  renewablesShare + '%'),
                h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.solar_wind_hydro_geo', 'Solar + wind + hydro + geo')))
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, '🔋 Storage outlook for ' + variableShare + '% variable share:'),
              h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5 } }, storageHint))
          ),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 0, mixHydro: 7, mixGeo: 0, mixNuclear: 19, mixGas: 36 });
                rnAnnounce(__alloT('stem.renewables.sr_loaded_2024_us_grid_average', 'Loaded: 2024 US grid average'));
              }, style: btn() }, __alloT('stem.renewables.load_2024_us_grid', 'Load: 2024 US grid')),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 30, mixWind: 35, mixHydro: 20, mixGeo: 5, mixNuclear: 5, mixGas: 5 });
                rnAnnounce(__alloT('stem.renewables.sr_loaded_2050_net_zero_scenario', 'Loaded: 2050 net-zero scenario'));
              }, style: btn() }, __alloT('stem.renewables.load_2050_net_zero', 'Load: 2050 net-zero')),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 56, mixHydro: 1, mixGeo: 0, mixNuclear: 0, mixGas: 9 });
                rnAnnounce(__alloT('stem.renewables.sr_loaded_denmark_wind_heavy', 'Loaded: Denmark wind-heavy'));
              }, style: btn() }, __alloT('stem.renewables.load_denmark_mix', 'Load: Denmark mix')),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 0, mixHydro: 70, mixGeo: 30, mixNuclear: 0, mixGas: 0 });
                rnAnnounce(__alloT('stem.renewables.sr_loaded_iceland_renewable', 'Loaded: Iceland renewable'));
              }, style: btn() }, __alloT('stem.renewables.load_iceland', 'Load: Iceland')),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 30, mixWind: 30, mixHydro: 10, mixGeo: 5, mixNuclear: 10, mixGas: 15 });
                rnAnnounce(__alloT('stem.renewables.sr_reset_to_default', 'Reset to default'));
              }, style: btn() }, __alloT('stem.renewables.reset', '↺ Reset'))
          ),
          (function() { if (renewablesShare >= 60) awardBadge('mix_designer', 'Mix Designer (60%+ renewable)'); return null; })(),
          (function() { if (renewablesShare >= 90 && co2 < 60) awardBadge('mix_master', 'Mix Master (90%+ renewable, <60g CO₂)'); return null; })(),
          // ── 24-hour grid balance simulator ──
          // Shows hourly supply (stacked by source) vs demand. Storage smooths
          // the gap. The whole point of renewable integration in one chart.
          (function() {
            // Diurnal supply profiles (fraction of nameplate per hour, 0..23)
            // Solar: bell curve peaking ~noon; zero at night.
            // Wind: noisy but generally peaks at night; mean ~0.4
            // Baseload (hydro/geo/nuclear/gas): flat
            var solarP = [0,0,0,0,0,0.05,0.15,0.30,0.50,0.70,0.85,0.95,1.00,0.95,0.85,0.70,0.50,0.30,0.15,0.05,0,0,0,0];
            var windP  = [0.55,0.60,0.62,0.60,0.55,0.50,0.45,0.40,0.35,0.32,0.30,0.30,0.32,0.35,0.40,0.45,0.50,0.55,0.60,0.65,0.65,0.60,0.55,0.55];
            // Demand: residential-style with morning + evening peaks
            var demand = [0.45,0.40,0.40,0.40,0.45,0.55,0.70,0.80,0.75,0.65,0.60,0.60,0.65,0.65,0.65,0.70,0.80,0.95,1.00,0.95,0.85,0.75,0.60,0.50];
            // Build hourly supply: each share% × profile gives a normalized fraction
            // Express in arbitrary units where total demand peak = 1.0
            // Calibrate so that if total share = 100 with average CF ~0.5 → matches demand
            // Simpler: just use share/100 directly as a multiplier for nameplate, then × profile
            var hours = [];
            // Storage capacity in peak-demand-hours. Start SOC is explicit so
            // the midnight boundary does not silently assume an empty battery.
            var battCap = d.gridBattHrs != null ? d.gridBattHrs : 4;
            var battStartSoc = d.gridBattStartSoc != null ? d.gridBattStartSoc : 50;
            var battRoundTripEff = 0.90;
            var battOneWayEff = Math.sqrt(battRoundTripEff);
            var batteryLevel = battCap * battStartSoc / 100;
            var summary = {
              totalSupply: 0, totalDemand: 0, unmetHrs: 0, curtailHrs: 0,
              battThroughput: 0, chargedInput: 0, dischargedOutput: 0, storageLoss: 0
            };            for (var hr = 0; hr < 24; hr++) {
              var sUnits = (mixSolar / 100) * solarP[hr];
              var wUnits = (mixWind  / 100) * windP[hr];
              var bUnits = (mixHydro / 100) * 0.55 + (mixGeo / 100) * 0.85 + (mixNuclear / 100) * 0.92 + (mixGas / 100) * 0.55;
              var supply = sUnits + wUnits + bUnits;
              var dem = demand[hr] * 1.0;  // peak-normalized
              summary.totalSupply += supply;
              summary.totalDemand += dem;
              // Battery dynamics
              var net = supply - dem;
              var battDelta = 0, served = supply, curtailed = 0;
              if (net > 0 && battCap > 0) {
                var room = Math.max(0, battCap - batteryLevel);
                var chargeInput = Math.min(net, room / battOneWayEff);
                var storedEnergy = chargeInput * battOneWayEff;
                batteryLevel += storedEnergy;
                curtailed = net - chargeInput;
                battDelta = storedEnergy;
                summary.chargedInput += chargeInput;
                summary.battThroughput += chargeInput;
                summary.storageLoss += chargeInput - storedEnergy;
                if (curtailed > 0.01) summary.curtailHrs++;
              } else if (net < 0 && battCap > 0) {
                var need = -net;
                var delivered = Math.min(need, batteryLevel * battOneWayEff);
                var withdrawn = delivered / battOneWayEff;
                batteryLevel = Math.max(0, batteryLevel - withdrawn);
                served = supply + delivered;
                battDelta = -withdrawn;
                summary.dischargedOutput += delivered;
                summary.battThroughput += delivered;
                summary.storageLoss += withdrawn - delivered;
                if (delivered < need - 0.01) summary.unmetHrs++;
              } else if (net > 0) {
                curtailed = net;
                if (curtailed > 0.01) summary.curtailHrs++;
              } else if (net < 0) {
                summary.unmetHrs++;
              }              hours.push({ hr: hr, sUnits: sUnits, wUnits: wUnits, bUnits: bUnits, supply: supply, demand: dem, served: served, batt: batteryLevel, battDelta: battDelta });
            }
            summary.endSocPct = battCap > 0 ? (batteryLevel / battCap) * 100 : 0;
            // SVG chart
            var W = 600, H = 240;
            var pad = { l: 36, r: 14, t: 18, b: 30 };
            var maxY = 1.4;  // headroom
            var sx = function(hr) { return pad.l + (hr / 23) * (W - pad.l - pad.r); };
            var sy = function(v)  { return pad.t + (1 - v / maxY) * (H - pad.t - pad.b); };
            // Build stacked path: baseload (bottom), wind, solar
            function pathFill(getStart, getEnd) {
              var top = []; var bot = [];
              for (var i = 0; i < 24; i++) {
                top.push([sx(i), sy(getEnd(hours[i]))]);
                bot.push([sx(i), sy(getStart(hours[i]))]);
              }
              return 'M ' + top.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ') +
                     ' L ' + bot.reverse().map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ') + ' Z';
            }
            var basePath = pathFill(function() { return 0; }, function(p) { return p.bUnits; });
            var windPath = pathFill(function(p) { return p.bUnits; }, function(p) { return p.bUnits + p.wUnits; });
            var solarPath = pathFill(function(p) { return p.bUnits + p.wUnits; }, function(p) { return p.supply; });
            // Demand line
            var demPts = hours.map(function(p) { return [sx(p.hr), sy(p.demand)]; });
            var demLine = 'M ' + demPts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
            return h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '2px solid ' + T.accent, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.24_hour_grid_balance', '⚡ 24-hour grid balance')),
              h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                __alloT('stem.renewables.stacked_supply_baseload_wind_solar_vs_', 'Stacked supply (baseload + wind + solar) vs hourly demand for a residential grid. Adjust the storage slider to see how batteries smooth the gap.')),
              // Storage slider
              h('div', { style: { marginBottom: 12 } },
                h('label', { htmlFor: 'grid-batt', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 } },
                  h('span', null, __alloT('stem.renewables.battery_capacity', '🔋 Battery capacity')),
                  h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, battCap.toFixed(1) + ' h')
                ),
                h('input', { id: 'grid-batt', 'data-rn-focusable': true, type: 'range',
                  min: 0, max: 12, step: 0.5, value: battCap,
                  'aria-label': __alloT('stem.renewables.battery_capacity_in_hours_of_peak_dema', 'Battery capacity in hours of peak demand'),
                  onChange: function(e) { upd('gridBattHrs', parseFloat(e.target.value)); },
                  style: { width: '100%', accentColor: T.accent, cursor: 'pointer' }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } },
                  __alloT('stem.renewables.0_h_no_storage_4_h_typical_tesla_power', '0 h = no storage. 4 h ≈ typical Tesla Powerwall stack. 8+ h needed for high-renewable grids.'))
              ),
              h('div', { style: { marginBottom: 12, padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                h('label', { htmlFor: 'grid-batt-soc', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 } },
                  h('span', null, 'Starting state of charge'),
                  h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, battStartSoc.toFixed(0) + '%')
                ),
                h('input', {
                  id: 'grid-batt-soc', 'data-rn-focusable': true, type: 'range',
                  min: 0, max: 100, step: 5, value: battStartSoc,
                  'aria-label': __alloT('stem.renewables.a11y_battery_starting_state_of_charge', 'Battery starting state of charge'),
                  'aria-valuetext': battStartSoc.toFixed(0) + ' percent charged at midnight',
                  onChange: function(e) { upd('gridBattStartSoc', parseFloat(e.target.value)); },
                  style: { width: '100%', accentColor: T.accent, cursor: 'pointer' }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } },
                  'Starting energy: ' + (battCap * battStartSoc / 100).toFixed(2) + ' peak-demand-hours. Change this to test how the midnight boundary affects results.'
                )
              ),              h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
                role: 'img',
                'aria-label': '24-hour grid balance chart. Total supply ' + summary.totalSupply.toFixed(1) + ' demand units, total demand ' + summary.totalDemand.toFixed(1) + '. Unmet hours: ' + summary.unmetHrs + '. Curtailed hours: ' + summary.curtailHrs + '.',
                style: { background: '#0b1020', borderRadius: 8 } },
                // Hour gridlines
                [0, 6, 12, 18, 23].map(function(hr) {
                  return h('g', { key: hr },
                    h('line', { x1: sx(hr), y1: pad.t, x2: sx(hr), y2: H - pad.b, stroke: '#1f2937', strokeWidth: 1 }),
                    h('text', { x: sx(hr), y: H - pad.b + 14, textAnchor: 'middle', fontSize: 10, fill: T.dim }, hr + ':00')
                  );
                }),
                // Y axis ticks
                [0.5, 1.0].map(function(v) {
                  return h('g', { key: v },
                    h('line', { x1: pad.l, y1: sy(v), x2: W - pad.r, y2: sy(v), stroke: '#1f2937', strokeWidth: 1 }),
                    h('text', { x: pad.l - 4, y: sy(v) + 3, textAnchor: 'end', fontSize: 9, fill: T.dim }, v.toFixed(1))
                  );
                }),
                // Stacked supply
                h('path', { d: basePath, fill: '#a78bfa', opacity: 0.55 }),
                h('path', { d: windPath, fill: '#7dd3fc', opacity: 0.65 }),
                h('path', { d: solarPath, fill: '#facc15', opacity: 0.75 }),
                // Demand line
                h('path', { d: demLine, fill: 'none', stroke: '#f87171', strokeWidth: 2.5, strokeDasharray: '6 3' }),
                // Axes
                h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
                h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
                // Legend
                h('rect', { x: pad.l, y: 4, width: 10, height: 10, fill: '#a78bfa', opacity: 0.55 }),
                h('text', { x: pad.l + 14, y: 13, fontSize: 10, fill: '#a78bfa' }, __alloT('stem.renewables.baseload', 'Baseload')),
                h('rect', { x: pad.l + 70, y: 4, width: 10, height: 10, fill: '#7dd3fc', opacity: 0.65 }),
                h('text', { x: pad.l + 84, y: 13, fontSize: 10, fill: '#7dd3fc' }, __alloT('stem.renewables.wind_3', 'Wind')),
                h('rect', { x: pad.l + 124, y: 4, width: 10, height: 10, fill: '#facc15', opacity: 0.75 }),
                h('text', { x: pad.l + 138, y: 13, fontSize: 10, fill: '#facc15' }, __alloT('stem.renewables.solar', 'Solar')),
                h('line', { x1: pad.l + 178, y1: 9, x2: pad.l + 198, y2: 9, stroke: '#f87171', strokeWidth: 2.5, strokeDasharray: '6 3' }),
                h('text', { x: pad.l + 202, y: 13, fontSize: 10, fill: '#f87171' }, __alloT('stem.renewables.demand', 'Demand'))
              ),
              // Summary cards
              h('div', { style: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.daily_supply_demand', 'Daily supply / demand')),
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: summary.totalSupply >= summary.totalDemand ? T.accent : T.warm, fontFamily: 'monospace' } },
                    summary.totalSupply.toFixed(1) + ' / ' + summary.totalDemand.toFixed(1)),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.totalSupply >= summary.totalDemand ? 'Sufficient capacity' : 'Capacity shortfall')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + (summary.unmetHrs > 0 ? T.danger : T.border) } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.hours_of_unmet_demand', 'Hours of unmet demand')),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: summary.unmetHrs > 0 ? T.danger : T.accent, fontFamily: 'monospace' } },
                    summary.unmetHrs + ' h'),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.unmetHrs === 0 ? '✓ Always served' : 'Blackouts likely')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.hours_of_curtailed_surplus', 'Hours of curtailed surplus')),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: summary.curtailHrs > 6 ? T.warm : T.text, fontFamily: 'monospace' } },
                    summary.curtailHrs + ' h'),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.curtailHrs > 0 ? 'Energy wasted' : '✓ All used')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.battery_throughput_day', 'Battery throughput / day')),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                    summary.battThroughput.toFixed(2)),
                  h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.peak_demand_hours', '× peak-demand-hours'))
                )
              ),
              h('div', {
                role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
                style: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }
              },
                h('div', { style: { padding: 9, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Ending state of charge'),
                  h('strong', { style: { display: 'block', color: T.accentHi, fontFamily: 'monospace', fontSize: 16 } }, summary.endSocPct.toFixed(1) + '%')
                ),
                h('div', { style: { padding: 9, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Storage conversion losses'),
                  h('strong', { style: { display: 'block', color: T.warm, fontFamily: 'monospace', fontSize: 16 } }, summary.storageLoss.toFixed(2)),
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'peak-demand-hours at 90% round-trip efficiency')
                )
              ),
              h('div', { style: { marginTop: 8, fontSize: 10.5, color: T.dim, lineHeight: 1.5 } },
                'Model boundary: fixed hourly profiles, no transmission constraints, reserves, degradation, or storage power limit. Results are scenario comparisons, not reliability forecasts.'
              ),              // Teaching notes
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.what_to_notice', 'What to notice: ')),
                summary.unmetHrs > 0
                  ? 'Your grid has ' + summary.unmetHrs + ' hour(s) of blackout. Either add more dispatchable capacity (hydro / geo / nuclear) or scale up battery storage.'
                  : (summary.curtailHrs > 6
                      ? 'You\'re generating MORE than you can use ' + summary.curtailHrs + ' hours/day. Either curtail (waste), store more, or export. Real grids face this challenge constantly.'
                      : 'Well-balanced. Storage is filling during surplus and discharging when needed.')
              )
            );
          })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // MAINE HOME SOLAR PAYBACK CALCULATOR
      // Concrete + personal. Uses Efficiency Maine + federal ITC numbers.
      // ─────────────────────────────────────────
      function renderHomePayback() {
        // Maine sun: ~1200–1400 kWh/m²/yr global tilted irradiation. Use 1300.
        var SUN_MAINE = 1300;       // kWh/m²/yr
        var EFF = 0.20;             // panel efficiency
        var PERF_RATIO = 0.80;      // system losses (inverter, wiring, soiling)
        var ELECTRIC_RATE = 0.21;   // $/kWh CMP residential ~2024
        var INSTALL_COST_PER_M2 = 350; // ~$350/m² installed Maine 2024
        var EFFICIENCY_MAINE_REBATE = 800; // flat residential rebate (illustrative)

        var annualKWh = mhRoofM2 * SUN_MAINE * EFF * PERF_RATIO;
        var annualSavings = annualKWh * ELECTRIC_RATE;
        var annualUseKWh = (mhBillMo * 12) / ELECTRIC_RATE;
        var pctOfBill = annualUseKWh > 0 ? Math.min(100, (annualKWh / annualUseKWh) * 100) : 0;
        var grossCost = mhRoofM2 * INSTALL_COST_PER_M2;
        var afterITC = grossCost * (1 - mhRebatePct / 100);
        var afterMaine = Math.max(0, afterITC - EFFICIENCY_MAINE_REBATE);
        var paybackYrs = annualSavings > 0 ? afterMaine / annualSavings : 99;
        // Lifetime savings over 25 years (after payback)
        var lifetime = annualSavings * 25 - afterMaine;
        // CO₂ avoided per year (CMP grid: ~280 gCO₂/kWh thanks to Maine hydro + nuclear via NEPOOL)
        var co2Avoided = (annualKWh * 280) / 1000; // kg/yr

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏠 Maine Home Solar Calculator'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.renewables.rough_estimate_for_a_maine_rooftop_rea', 'Rough estimate for a Maine rooftop. Real quotes vary by orientation, shading, and contractor. Numbers below assume CMP territory + south-facing roof + 2024–25 incentive levels. Always get 3 quotes.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            slider({ id: 'mh-roof', label: __alloT('stem.renewables.usable_south_facing_roof_area', '🏠 Usable south-facing roof area'), value: mhRoofM2, min: 5, max: 100, step: 1, unit: 'm²',
              hint: __alloT('stem.renewables.a_typical_maine_2_story_has_30_60_m_of', 'A typical Maine 2-story has 30–60 m² of usable south slope. 1 m² ≈ 10.8 ft².'),
              onChange: function(v) { upd('mhRoofM2', v); } }),
            slider({ id: 'mh-bill', label: __alloT('stem.renewables.average_monthly_electric_bill', '💵 Average monthly electric bill'), value: mhBillMo, min: 50, max: 500, step: 10, unit: '$/mo',
              hint: __alloT('stem.renewables.maine_residential_average_130_mo_2024_', 'Maine residential average ~$130/mo (2024). Heat-pump homes run $200–400/mo in winter.'),
              onChange: function(v) { upd('mhBillMo', v); } }),
            slider({ id: 'mh-itc', label: __alloT('stem.renewables.federal_investment_tax_credit', '🇺🇸 Federal Investment Tax Credit'), value: mhRebatePct, min: 0, max: 30, step: 1, unit: '%',
              hint: __alloT('stem.renewables.30_through_2032_under_current_law_26_i', '30% through 2032 under current law. 26% if installed before 2022 or if law changes.'),
              onChange: function(v) { upd('mhRebatePct', v); } })
          ),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.estimated_outcome', '📊 Estimated outcome')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 } },
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.annual_generation', 'Annual generation')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  annualKWh.toFixed(0) + ' kWh'),
                h('div', { style: { fontSize: 10, color: T.dim } }, '~' + pctOfBill.toFixed(0) + '% of your usage')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.annual_savings', 'Annual savings')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: 'monospace' } },
                  '$' + annualSavings.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'at $' + ELECTRIC_RATE.toFixed(2) + '/kWh')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.after_incentive_cost', 'After-incentive cost')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.warm, fontFamily: 'monospace' } },
                  '$' + afterMaine.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Gross $' + grossCost.toFixed(0) + ' − ITC − $800 EM rebate')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.payback_time', 'Payback time')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: paybackYrs < 10 ? T.accent : paybackYrs < 15 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  paybackYrs.toFixed(1) + ' yr'),
                h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.25_yr_panel_lifespan', '25-yr panel lifespan'))),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.25_yr_net_savings', '25-yr net savings')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: lifetime > 0 ? T.accent : T.danger, fontFamily: 'monospace' } },
                  '$' + lifetime.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, __alloT('stem.renewables.excludes_electricity_rate_inflation_ty', 'Excludes electricity-rate inflation (typically +)'))),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, __alloT('stem.renewables.co_avoided_yr', 'CO₂ avoided / yr')),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  co2Avoided.toFixed(0) + ' kg'),
                h('div', { style: { fontSize: 10, color: T.dim } }, '~' + (co2Avoided / 4600).toFixed(2) + ' cars/yr equiv.'))
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.maine_specific_notes', '🌲 Maine-specific notes')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.6 } },
              h('li', null, __alloT('stem.renewables.cold_sun_high_efficiency_maine_winter_', 'Cold + sun = high efficiency. Maine winter sun is short but the cold actually boosts panel output.')),
              h('li', null, __alloT('stem.renewables.net_metering_rules_in_maine_have_shift', 'Net metering rules in Maine have shifted multiple times. Current law gives ~retail rate credit; check the PUC for the current arrangement before signing.')),
              h('li', null, __alloT('stem.renewables.snow_on_panels_tilt_30_lets_snow_slide', 'Snow on panels: tilt ≥ 30° lets snow slide off. Bifacial panels can pick up reflected light from snow on the ground.')),
              h('li', null, __alloT('stem.renewables.pair_with_a_heat_pump_for_biggest_impa', 'Pair with a heat pump for biggest impact: summer solar runs the heat pump in shoulder seasons; you also free up oil dollars.')),
              h('li', null, __alloT('stem.renewables.efficiency_maine_offers_0_loans_up_to_', 'Efficiency Maine offers 0% loans up to $15,000 for solar + heat pump combos.'))
            )
          ),
          h('div', { style: { marginTop: 12, padding: 10, borderRadius: 10, background: T.card, border: '1px dashed ' + T.accent, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.adding_an_ev', '🔗 Adding an EV?')),
            __alloT('stem.renewables.layer_in_ev_charging_math_from_alloflo', ' Layer in EV charging math from AlloFlow '),
            h('strong', { style: { color: T.text } }, 'RoadReady'),
            __alloT('stem.renewables.a_typical_maine_commute_30_mi_day_adds', '. A typical Maine commute (~30 mi/day) adds ~7–10 kWh/day to your home load — significant for solar sizing, and EVs unlock V2G later.')),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SOLAR INSTALLER CO. — 4-year business sim
      // ─────────────────────────────────────────
      // Pedagogy: this is the missing scale across AlloFlow's STEM
      // Lab. Students see solar as "consumer" (Maine Home Solar Calc)
      // or "policy" (Climate Explorer) but rarely the business in the
      // middle. This sim is "what does the solar-installer job
      // actually look like from inside the firm?" Workforce + business-
      // scale angle for clean energy careers (especially relevant for
      // Maine's IBEW + EMCC cleantech pipeline).
      //
      // Mechanics:
      // - Pick a service area (Portland metro / midcoast / rural N. Maine)
      // - Each year: leads appear → you bid on subset → choose supplier
      //   → adjust workforce → resolve bids → events fire → year-end P&L
      // - Win: stay solvent 4 years AND grow to 100+ cumulative installs
      // - Lose: cash < $0 two consecutive years → bankruptcy
      //         custSat < 50 → reputation collapse, leads dry up
      // ─────────────────────────────────────────

      var INSTALLER_AREAS = [
        { id: 'portland', icon: '🏙', name: __alloT('stem.renewables.portland_metro', 'Portland Metro'),
          desc: __alloT('stem.renewables.dense_urban_suburb_lots_of_roofs_but_m', 'Dense urban + suburb. Lots of roofs, but more competing firms. Average household electric bill $145/mo.'),
          competition: 1.30,      // bid-win multiplier (higher = harder to win)
          drive: 1.0,             // labor-time multiplier
          billAvg: 145, leadVolume: 10, premiumPct: 0.20 },
        { id: 'midcoast', icon: '⛵', name: __alloT('stem.renewables.midcoast_maine', 'Midcoast Maine'),
          desc: __alloT('stem.renewables.mix_of_year_round_homes_summer_only_ca', 'Mix of year-round homes + summer-only camps. Premium roofs (slate, complex). Tourist economy seasonality. Average bill $160/mo.'),
          competition: 1.10,
          drive: 1.15,
          billAvg: 160, leadVolume: 8, premiumPct: 0.45 },
        { id: 'rural',   icon: '🌲', name: __alloT('stem.renewables.rural_northern_maine', 'Rural Northern Maine'),
          desc: __alloT('stem.renewables.low_population_density_long_drives_bet', 'Low population density, long drives between jobs. Lower price ceiling but grid-resilience + winter demand high. Average bill $175/mo.'),
          competition: 0.85,
          drive: 1.40,
          billAvg: 175, leadVolume: 7, premiumPct: 0.15 }
      ];

      var INSTALLER_SUPPLIERS = [
        { id: 'tier1', icon: '⭐', name: __alloT('stem.renewables.tier_1_maxeon_rec', 'Tier-1 (Maxeon / REC)'), costPerW: 2.20, warrantyYears: 25, claimRate: 0.02, satBoost: +5,
          desc: __alloT('stem.renewables.premium_panels_higher_upfront_cost_25_', 'Premium panels. Higher upfront cost, 25-yr power warranty, low warranty-claim rate. Customers notice the brand.') },
        { id: 'tier2', icon: '💰', name: __alloT('stem.renewables.tier_2_mid_chinese', 'Tier-2 (mid-Chinese)'), costPerW: 1.50, warrantyYears: 12, claimRate: 0.08, satBoost: -3,
          desc: __alloT('stem.renewables.lower_cost_panels_12_yr_warranty_highe', 'Lower cost panels. 12-yr warranty + higher claim rate. Margin advantage if quality holds; reputation risk if it does not.') }
      ];

      var INSTALLER_LEAD_TYPES = [
        { id: 'resPriceSens',  icon: '🏠', label: __alloT('stem.renewables.residential_price_sensitive', 'Residential · price-sensitive'),
          kwAvg: 7, kwSpread: 2, bidSensitivity: 1.4, satMod: 0,
          notes: 'Family of 4, wants quickest payback. Will switch to the lowest bid.' },
        { id: 'resQuality',    icon: '🏡', label: __alloT('stem.renewables.residential_quality_driven', 'Residential · quality-driven'),
          kwAvg: 10, kwSpread: 3, bidSensitivity: 0.8, satMod: +3,
          notes: 'Bigger budget, wants tier-1 panels, expects clean install. Less price-sensitive.' },
        { id: 'commSmall',     icon: '🏢', label: __alloT('stem.renewables.small_commercial', 'Small commercial'),
          kwAvg: 30, kwSpread: 10, bidSensitivity: 1.0, satMod: +1,
          notes: 'Local business / nonprofit. Mid-range price sensitivity. Big single contract.' },
        { id: 'commMunicipal', icon: '🏛', label: __alloT('stem.renewables.municipal', 'Municipal'),
          kwAvg: 60, kwSpread: 20, bidSensitivity: 1.2, satMod: +2,
          notes: 'School / town hall / library. Procurement process; lowest-responsive-bid rules. Huge if you win it.' }
      ];

      var INSTALLER_EVENTS = [
        { id: 'itcChange',     icon: '📋', headline: 'Federal ITC steps down', text: __alloT('stem.renewables.congress_passed_a_step_down_the_30_itc', 'Congress passed a step-down: the 30% ITC drops to 26% starting next year. Customer demand softens; expect ~10% fewer leads next year.'),     effect: { leadMult: 0.9 } },
        { id: 'panelDelay',    icon: '🚢', headline: 'Supply-chain delay', text: __alloT('stem.renewables.panels_stuck_at_port_for_6_weeks_half_', 'Panels stuck at port for 6 weeks. Half this year\'s installs slip into next year. Cash hit but no permanent damage.'),                            effect: { revMult: 0.5 } },
        { id: 'badWinter',     icon: '❄', headline: 'Brutal winter slows installs',  text: __alloT('stem.renewables.three_feet_of_snow_in_march_pushed_ins', 'Three feet of snow in March pushed installs back. Labor hours up 20%, no extra revenue.'),                                            effect: { laborMult: 1.2 } },
        { id: 'competitor',    icon: '⚔', headline: 'Competitor undercuts',  text: __alloT('stem.renewables.a_big_out_of_state_firm_entered_your_m', 'A big out-of-state firm entered your market with aggressive pricing. Win-rate drops 15% this year only.'),                                    effect: { winMult: 0.85 } },
        { id: 'referral',      icon: '🎉', headline: 'Customer-referral cascade', text: __alloT('stem.renewables.your_last_six_customers_loved_you_thre', 'Your last six customers loved you. Three referrals come in unprompted; satisfaction-boosted leads next year.'),                          effect: { leadMult: 1.15, satBoost: +5 } },
        { id: 'inflationCost', icon: '💸', headline: 'Inflation hits inventory', text: __alloT('stem.renewables.panel_inverter_prices_up_8_mid_year_co', 'Panel + inverter prices up 8% mid-year. COGS rises until you sign new supplier contracts next year.'),                                    effect: { cogsMult: 1.08 } },
        { id: 'permitOk',      icon: '✅', headline: 'Permitting streamlined', text: __alloT('stem.renewables.state_rolled_out_a_one_page_interconne', 'State rolled out a one-page interconnection form. Permit costs drop $200 per install; labor 0.5 day shorter.'),                              effect: { permitCut: 200, laborMult: 0.95 } },
        { id: 'workerWin',     icon: '🏆', headline: 'IBEW apprentice grad', text: __alloT('stem.renewables.three_apprentices_from_emcc_finish_the', 'Three apprentices from EMCC finish their hours this quarter. You can hire any of them at the lower trainee rate.'),                            effect: { laborMult: 0.93 } }
      ];

      function defaultInstallerState() {
        return {
          phase: 'setup',                // setup | year | yearEnd | debrief | bankrupt
          areaId: null,
          year: 0,                       // 0..3 inclusive (4-year campaign)
          quarter: 0,
          cash: 50000,                   // starting capital, $
          installs: 0,                   // cumulative completed installs
          custSat: 70,                   // 0..100
          // Workforce
          installers: 2,
          inspectors: 1,
          sales: 1,
          // Current year tactical inputs
          supplierId: 'tier1',
          bidPricePerW: 3.50,            // $/W charged to customer
          // Generated leads + bidded set this year
          leads: [],                     // [{id, typeId, kw, compBid, won, picked, status}]
          // History + event log
          events: [],                    // {year, headline, text}
          yearLog: [],                   // {year, revenue, cogs, labor, profit, installs, endingCash, custSat}
          // Year tracking
          consecNegYears: 0,
          // Win/lose latched flag
          finalOutcome: null             // null | 'win' | 'bankrupt' | 'collapse'
        };
      }

      function renderInstallerCo() {
        var inst = (d.installerCo && d.installerCo.phase) ? d.installerCo : null;

        // Helper: clamp + format
        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
        function fmt$(n) { return '$' + Math.round(n).toLocaleString(); }
        function pct(n) { return Math.round(n * 100) + '%'; }

        function startInstaller(areaId) {
          var st = defaultInstallerState();
          st.areaId = areaId;
          st.phase = 'year';
          st.leads = generateLeads(st);
          upd('installerCo', st);
          var instArea = window.StemLab && window.StemLab.findById ? window.StemLab.findById(INSTALLER_AREAS, areaId) : null;
          rnAnnounce('Started Solar Installer Co. in ' + (instArea ? instArea.name : 'the selected area'));
        }

        function resetInstaller() {
          upd('installerCo', defaultInstallerState());
          rnAnnounce(__alloT('stem.renewables.sr_reset_to_area_pick', 'Reset to area pick'));
        }

        // Deterministic-ish lead generation from the year + areaId seed.
        function generateLeads(st) {
          var area = INSTALLER_AREAS.find(function(a){return a.id===st.areaId;}) || INSTALLER_AREAS[0];
          var rngSeed = (st.year * 9973 + st.areaId.length * 47 + 13) % 2147483647;
          function rng() { rngSeed = (rngSeed * 48271) % 2147483647; return rngSeed / 2147483647; }
          var n = area.leadVolume + Math.floor((rng() * 3) - 1);  // ±1 lead
          var leads = [];
          for (var i = 0; i < n; i++) {
            var typeRoll = rng();
            var typeId = typeRoll < 0.5 ? 'resPriceSens'
                       : typeRoll < 0.8 ? 'resQuality'
                       : typeRoll < 0.95 ? 'commSmall'
                       : 'commMunicipal';
            var type = INSTALLER_LEAD_TYPES.find(function(t){return t.id===typeId;});
            var kw = Math.round(type.kwAvg + (rng() - 0.5) * 2 * type.kwSpread);
            kw = Math.max(3, kw);
            // Competitor bid: $/W. Tighter band around $3.00 baseline.
            var compBid = 2.80 + rng() * 0.80;       // $2.80–$3.60/W competitor
            leads.push({
              id: st.year + '-' + i,
              typeId: typeId,
              kw: kw,
              compBid: parseFloat(compBid.toFixed(2)),
              picked: false,
              won: false,
              status: 'open' // open | bid | won | lost | installed | warrantyClaim
            });
          }
          return leads;
        }

        function togglePickLead(leadId) {
          if (!inst || inst.phase !== 'year') return;
          var bidCap = 2 + (inst.sales || 0);
          var newLeads = inst.leads.map(function(l) {
            if (l.id !== leadId) return l;
            if (l.picked) return Object.assign({}, l, { picked: false });
            var pickedCount = inst.leads.filter(function(x){return x.picked;}).length;
            if (pickedCount >= bidCap) {
              rnAnnounce(__alloT('stem.renewables.sr_at_sales_team_bid_limit_hire_more_sales_staff_to', 'At sales-team bid limit. Hire more sales staff to bid on additional leads.'));
              return l;
            }
            return Object.assign({}, l, { picked: true });
          });
          upd('installerCo', Object.assign({}, inst, { leads: newLeads }));
        }

        function setBidPrice(v) {
          upd('installerCo', Object.assign({}, inst, { bidPricePerW: v }));
        }

        function setSupplier(id) {
          upd('installerCo', Object.assign({}, inst, { supplierId: id }));
        }

        function adjustWorkforce(role, delta) {
          var st = Object.assign({}, inst);
          var key = role;
          var current = st[key] || 0;
          var next = Math.max(0, current + delta);
          // Hiring uses cash up front; firing returns nothing (severance assumed = 0 for sim simplicity)
          var hireCost = role === 'installers' ? 5000 : role === 'inspectors' ? 4000 : 3000;
          if (delta > 0) {
            if (st.cash < hireCost) {
              rnAnnounce('Not enough cash to hire another ' + role.slice(0, -1));
              return;
            }
            st.cash -= hireCost;
          }
          st[key] = next;
          upd('installerCo', st);
        }

        // Resolve the year: every picked lead is resolved against the
        // competitor bid using a logistic-ish curve. Won leads become
        // installs that pay revenue minus per-install costs. Labor
        // costs are paid from the workforce headcount. Random events
        // fire after the year resolves. Then year-end is shown.
        function advanceYear() {
          if (!inst || inst.phase !== 'year') return;
          var st = Object.assign({}, inst);
          var area = INSTALLER_AREAS.find(function(a){return a.id===st.areaId;}) || INSTALLER_AREAS[0];
          var supplier = INSTALLER_SUPPLIERS.find(function(s){return s.id===st.supplierId;}) || INSTALLER_SUPPLIERS[0];

          // Pre-event modifiers (default neutral)
          var winMult = 1.0, revMult = 1.0, cogsMult = 1.0, laborMult = 1.0, leadMult = 1.0, permitCut = 0, satEventBoost = 0;

          // Roll an event (75% chance per year after year 0)
          var newEvent = null;
          if (st.year >= 0 && Math.random() < 0.75) {
            newEvent = INSTALLER_EVENTS[Math.floor(Math.random() * INSTALLER_EVENTS.length)];
            if (newEvent.effect) {
              if (newEvent.effect.winMult)   winMult *= newEvent.effect.winMult;
              if (newEvent.effect.revMult)   revMult *= newEvent.effect.revMult;
              if (newEvent.effect.cogsMult)  cogsMult *= newEvent.effect.cogsMult;
              if (newEvent.effect.laborMult) laborMult *= newEvent.effect.laborMult;
              if (newEvent.effect.leadMult)  leadMult *= newEvent.effect.leadMult;
              if (newEvent.effect.permitCut) permitCut += newEvent.effect.permitCut;
              if (newEvent.effect.satBoost)  satEventBoost += newEvent.effect.satBoost;
            }
          }

          // Resolve picked leads
          var revenue = 0, cogs = 0, perInstallCost = 0;
          var newInstalls = 0;
          var newLeads = st.leads.map(function(l) {
            if (!l.picked) return Object.assign({}, l, { status: 'open' });
            var type = INSTALLER_LEAD_TYPES.find(function(t){return t.id===l.typeId;}) || INSTALLER_LEAD_TYPES[0];
            // Win probability: higher when our bid is below competitor's, weighted by
            // customer price sensitivity + reputation (custSat) + area competition.
            var bidDelta = (l.compBid - st.bidPricePerW) * type.bidSensitivity;
            var repBonus = (st.custSat - 50) * 0.01;  // ±0.5 max
            var raw = 0.5 + bidDelta * 0.7 + repBonus;
            var winProb = clamp(raw / area.competition, 0.05, 0.95) * winMult;
            var won = Math.random() < winProb;
            if (won) {
              newInstalls += 1;
              var revPerInstall = st.bidPricePerW * 1000 * l.kw * revMult;          // $/W × W
              var supplierCost  = supplier.costPerW * 1000 * l.kw * cogsMult;
              var laborPerKw    = 180 * area.drive * laborMult;                      // $ labor per kW
              var permits       = Math.max(0, 800 - permitCut);
              var perInst       = supplierCost + laborPerKw * l.kw + permits;
              revenue += revPerInstall;
              cogs    += perInst;
              return Object.assign({}, l, { picked: true, won: true, status: 'installed' });
            }
            return Object.assign({}, l, { picked: true, won: false, status: 'lost' });
          });

          // Labor headcount cost (annual salaries)
          var laborSalaries = (st.installers * 50000) + (st.inspectors * 45000) + (st.sales * 40000);

          // Warranty reserve — 2% (tier-1) or 8% (tier-2) of revenue set aside as cash cost
          var warrantyReserve = revenue * supplier.claimRate;

          // Customer satisfaction shift this year
          var satFromSupplier = supplier.satBoost;
          var satFromWorkforce = 0;
          // Under-staffed if installers per install < threshold (10 installs / installer)
          var installerLoad = st.installers > 0 ? (newInstalls / st.installers) : 999;
          if (installerLoad > 12) satFromWorkforce -= 6;
          else if (installerLoad < 4) satFromWorkforce += 2;
          // Mean type-satisfaction modifier of WON jobs
          var wonTypes = newLeads.filter(function(l){return l.won;}).map(function(l) {
            var t = INSTALLER_LEAD_TYPES.find(function(t){return t.id===l.typeId;});
            return t ? t.satMod : 0;
          });
          var satFromMix = wonTypes.length ? Math.round(wonTypes.reduce(function(a,b){return a+b;}, 0) / wonTypes.length) : 0;
          var newSat = clamp(st.custSat + satFromSupplier + satFromWorkforce + satFromMix + satEventBoost, 0, 100);

          var profit = revenue - cogs - laborSalaries - warrantyReserve;
          var newCash = st.cash + profit;

          // Update state
          var yearLog = (st.yearLog || []).concat([{
            year: st.year + 1,
            revenue: revenue, cogs: cogs, labor: laborSalaries, warranty: warrantyReserve,
            profit: profit, installs: newInstalls, endingCash: newCash, custSat: newSat,
            event: newEvent ? newEvent.headline : null
          }]);
          var events = newEvent ? (st.events || []).concat([{ year: st.year + 1, headline: newEvent.icon + ' ' + newEvent.headline, text: newEvent.text }]) : (st.events || []);

          // Consecutive negative-cash years (bankruptcy trigger)
          var consec = newCash < 0 ? (st.consecNegYears || 0) + 1 : 0;

          // Outcome check
          var outcome = null;
          if (consec >= 2) outcome = 'bankrupt';
          else if (newSat < 50 && st.year >= 1) outcome = 'collapse';
          else if (st.year + 1 >= 4) outcome = (st.installs + newInstalls >= 100) ? 'win' : 'shortfall';

          // Apply leadMult to next year's lead volume by stashing on state (used in generateLeads)
          var stNext = Object.assign({}, st, {
            year: st.year + 1,
            quarter: 0,
            cash: newCash,
            installs: st.installs + newInstalls,
            custSat: newSat,
            yearLog: yearLog,
            events: events,
            consecNegYears: consec,
            phase: outcome ? 'debrief' : 'yearEnd',
            finalOutcome: outcome
          });
          // Generate next year's leads (if continuing)
          if (!outcome) {
            stNext.leads = generateLeads(stNext);
            // Apply leadMult to lead count for the immediate next year only
            if (leadMult !== 1.0) {
              var keep = Math.round(stNext.leads.length * leadMult);
              stNext.leads = stNext.leads.slice(0, Math.max(2, keep));
            }
          }
          upd('installerCo', stNext);
        }

        function continueToNextYear() {
          if (!inst) return;
          upd('installerCo', Object.assign({}, inst, { phase: 'year' }));
        }

        // ─────────────────────────────────────────
        // SETUP PHASE — pick a service area
        // ─────────────────────────────────────────
        if (!inst || inst.phase === 'setup') {
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('☀️ Solar Installer Co.'),
            // ── Pre-game brief ──
            h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, __alloT('stem.renewables.how_the_sim_works', '📜 How the sim works')),
              h('p', { style: { margin: '0 0 8px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                'You are running a small solar installation firm in Maine. ',
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.4_years_4_decisions_per_year_survive_a', '4 years. 4 decisions per year. Survive AND grow to 100+ installs to win.'))),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 8 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.renewables.each_year_you_decide', '🎯 Each year you decide')),
                  h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                    h('li', null, __alloT('stem.renewables.which_leads_to_bid_on', 'Which leads to bid on')),
                    h('li', null, __alloT('stem.renewables.bid_price_per_watt', 'Bid price per watt')),
                    h('li', null, __alloT('stem.renewables.tier_1_vs_tier_2_panel_supplier', 'Tier-1 vs tier-2 panel supplier')),
                    h('li', null, __alloT('stem.renewables.hire_fire_installers_inspectors_sales', 'Hire / fire installers, inspectors, sales'))
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.renewables.failure_modes', '⚠ Failure modes')),
                  h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                    h('li', null, __alloT('stem.renewables.cash_0_for_two_years_in_a_row_bankrupt', 'Cash < $0 for two years in a row → bankruptcy')),
                    h('li', null, __alloT('stem.renewables.customer_satisfaction_50_reputation_co', 'Customer satisfaction < 50 → reputation collapse, leads dry up')),
                    h('li', null, __alloT('stem.renewables.year_4_ends_fewer_than_100_cumulative_', 'Year 4 ends + fewer than 100 cumulative installs → short of target'))
                  )
                )
              ),
              h('p', { style: { margin: 0, fontSize: 12, color: T.dim, lineHeight: 1.55, fontStyle: 'italic' } },
                __alloT('stem.renewables.numbers_are_maine_realistic_panel_cost', 'Numbers are Maine-realistic: panel cost ~$1.50 to $2.20/W wholesale, installs sold at $3 to $4/W, typical firm does 50 to 200 installs/yr. Carries some randomness (events, win-rolls) so two runs are not identical.'))
            ),
            // ── Area picker ──
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.pick_your_service_area', '🗺 Pick your service area')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              INSTALLER_AREAS.map(function(area) {
                return h('button', { key: area.id, 'data-rn-focusable': true,
                  onClick: function() { startInstaller(area.id); },
                  style: { textAlign: 'left', padding: 14, borderRadius: 12, background: T.card, border: '2px solid ' + T.border, cursor: 'pointer', color: T.text } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, area.icon),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: T.accentHi } }, area.name)
                  ),
                  h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.muted, lineHeight: 1.55 } }, area.desc),
                  h('div', { style: { fontSize: 11, color: T.dim, fontFamily: 'monospace' } },
                    'Leads/yr ~' + area.leadVolume + ' · Competition ' + Math.round(area.competition * 100) + '% · Drive time ' + Math.round(area.drive * 100) + '%')
                );
              })
            ),
            footer()
          );
        }

        // ─────────────────────────────────────────
        // YEAR-END DEBRIEF (between years)
        // ─────────────────────────────────────────
        if (inst.phase === 'yearEnd') {
          var lastYear = inst.yearLog[inst.yearLog.length - 1] || {};
          var profitClr = lastYear.profit >= 0 ? T.accentHi : T.danger;
          var lastEvent = inst.events[inst.events.length - 1];
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('☀️ Solar Installer Co.'),
            h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 18, color: T.accentHi } }, '📊 End of Year ' + lastYear.year + ' / 4'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
                statBlock('Installs this yr', lastYear.installs + '', T.text),
                statBlock('Revenue', fmt$(lastYear.revenue), T.accentHi),
                statBlock('COGS', fmt$(-lastYear.cogs), T.warm),
                statBlock('Labor', fmt$(-lastYear.labor), T.warm),
                statBlock('Warranty reserve', fmt$(-lastYear.warranty), T.warm),
                statBlock('Profit', (lastYear.profit >= 0 ? '+' : '') + fmt$(lastYear.profit), profitClr),
                statBlock('Ending cash', fmt$(lastYear.endingCash), lastYear.endingCash >= 0 ? T.accentHi : T.danger),
                statBlock('Customer sat', Math.round(lastYear.custSat) + '%', lastYear.custSat >= 70 ? T.accentHi : lastYear.custSat >= 50 ? T.warm : T.danger)
              )
            ),
            lastEvent && lastEvent.year === lastYear.year && h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 } }, __alloT('stem.renewables.event_this_year', 'Event this year')),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 } }, lastEvent.headline),
              h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, lastEvent.text)
            ),
            h('button', { 'data-rn-focusable': true,
              onClick: continueToNextYear,
              style: { width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#053920', fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              '▶ Continue to Year ' + (inst.year + 1)),
            footer()
          );
        }

        // ─────────────────────────────────────────
        // FINAL DEBRIEF (win / bankrupt / collapse / shortfall)
        // ─────────────────────────────────────────
        if (inst.phase === 'debrief') {
          var outcome = inst.finalOutcome || 'shortfall';
          var outcomeMeta = outcome === 'win'        ? { color: T.accent,    title: '🏆 Successful firm · 4 years, ' + inst.installs + ' installs', body: __alloT('stem.renewables.you_hit_the_100_install_target_without', 'You hit the 100+ install target without going bankrupt or losing reputation. Real-world equivalent: a small Maine firm running profitable, employing local labor, building grid-scale capacity one rooftop at a time.') }
                            : outcome === 'bankrupt'   ? { color: T.danger,    title: __alloT('stem.renewables.bankruptcy_cash_hit_0_two_years_runnin', '💸 Bankruptcy · cash hit $0 two years running'), body: __alloT('stem.renewables.two_consecutive_negative_cash_years_cl', 'Two consecutive negative-cash years closed the firm. Common causes: under-bidding leads, over-hiring before revenue ramps, or eating warranty claims from a low-quality supplier. Try again with tighter bids or a smaller workforce.') }
                            : outcome === 'collapse'   ? { color: T.warm,      title: __alloT('stem.renewables.reputation_collapse_customer_satisfact', '📉 Reputation collapse · customer satisfaction fell below 50'), body: __alloT('stem.renewables.word_got_around_leads_dried_up_often_c', 'Word got around. Leads dried up. Often caused by tier-2 panels failing under warranty, or over-loaded installers cutting corners. The math: customer-sat compounds across years. Stay above 60 to compound positively.') }
                            :                            { color: T.warm,      title: '📊 Survived 4 years · ' + inst.installs + ' installs (target 100)', body: __alloT('stem.renewables.you_stayed_solvent_and_kept_your_reput', 'You stayed solvent and kept your reputation, but did not reach 100 cumulative installs. The firm exists, but did not scale enough to call it a strong outcome. Try a bigger workforce or a higher-volume service area.') };
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('☀️ Solar Installer Co.'),
            h('div', { style: { padding: 18, borderRadius: 14, background: T.card, border: '2px solid ' + outcomeMeta.color, marginBottom: 14, textAlign: 'center' } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 22, color: outcomeMeta.color } }, outcomeMeta.title),
              h('p', { style: { margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, outcomeMeta.body),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
                statBlock('Years played', inst.year + '', T.text),
                statBlock('Total installs', inst.installs + '', T.accentHi),
                statBlock('Final cash', fmt$(inst.cash), inst.cash >= 0 ? T.accentHi : T.danger),
                statBlock('Customer sat', Math.round(inst.custSat) + '%', T.accentHi)
              )
            ),
            // Year-by-year history table
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, __alloT('stem.renewables.year_by_year', '📋 Year-by-year')),
              h('table', { style: { width: '100%', fontSize: 11, color: T.muted } },
                h('thead', null,
                  h('tr', null,
                    ['Yr', 'Installs', 'Revenue', 'Profit', 'Cash end', 'Sat', 'Event'].map(function(c, i) {
                      return h('th', { key: i, scope: 'col', style: { textAlign: 'left', padding: '4px 6px', color: T.dim, fontWeight: 700, borderBottom: '1px solid ' + T.border } }, c);
                    })
                  )
                ),
                h('tbody', null,
                  (inst.yearLog || []).map(function(yl, i) {
                    return h('tr', { key: i },
                      h('td', { style: { padding: '4px 6px' } }, yl.year),
                      h('td', { style: { padding: '4px 6px' } }, yl.installs),
                      h('td', { style: { padding: '4px 6px', color: T.text } }, fmt$(yl.revenue)),
                      h('td', { style: { padding: '4px 6px', color: yl.profit >= 0 ? T.accentHi : T.danger } }, (yl.profit >= 0 ? '+' : '') + fmt$(yl.profit)),
                      h('td', { style: { padding: '4px 6px', color: yl.endingCash >= 0 ? T.text : T.danger } }, fmt$(yl.endingCash)),
                      h('td', { style: { padding: '4px 6px' } }, Math.round(yl.custSat) + '%'),
                      h('td', { style: { padding: '4px 6px', fontSize: 10, color: T.dim } }, yl.event || '·')
                    );
                  })
                )
              )
            ),
            h('button', { 'data-rn-focusable': true,
              onClick: resetInstaller,
              style: { width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#053920', fontSize: 14, fontWeight: 800, cursor: 'pointer' } },
              __alloT('stem.renewables.run_a_new_campaign', '🔁 Run a new campaign')),
            footer()
          );
        }

        // ─────────────────────────────────────────
        // YEAR PHASE — main interactive screen
        // ─────────────────────────────────────────
        var area = INSTALLER_AREAS.find(function(a){return a.id===inst.areaId;}) || INSTALLER_AREAS[0];
        var supplier = INSTALLER_SUPPLIERS.find(function(s){return s.id===inst.supplierId;}) || INSTALLER_SUPPLIERS[0];
        var bidCap = 2 + (inst.sales || 0);
        var pickedCount = (inst.leads || []).filter(function(l){return l.picked;}).length;
        var custSatColor = inst.custSat >= 70 ? T.accentHi : inst.custSat >= 50 ? T.warm : T.danger;
        var cashColor = inst.cash >= 25000 ? T.accentHi : inst.cash >= 0 ? T.warm : T.danger;

        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('☀️ Solar Installer Co. · ' + area.name),
          // ── Top status strip ──
          h('div', { style: { padding: 12, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 } },
            statBlock('Year', (inst.year + 1) + ' / 4', T.accentHi),
            statBlock('Cash', fmt$(inst.cash), cashColor),
            statBlock('Installs YTD', inst.installs + '', T.text),
            statBlock('Customer sat', Math.round(inst.custSat) + '%', custSatColor),
            statBlock('Workforce', inst.installers + 'I / ' + inst.inspectors + 'X / ' + inst.sales + 'S', T.text),
            statBlock('Goal', '100+ by Yr 4', T.dim)
          ),
          // ── Lead pipeline ──
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 } },
              h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.incoming_leads_pick_which_to_bid_on', '📞 Incoming leads — pick which to bid on')),
              h('div', { style: { fontSize: 12, color: T.muted, fontFamily: 'monospace' } }, 'Bids picked: ' + pickedCount + ' / ' + bidCap)
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              'Your sales team has bandwidth for ' + bidCap + ' bids this year (2 + 1 per sales staff). Each lead shows roof size in kW, customer profile, and the competitor\'s bid — undercut to win, but watch your margin.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 } },
              (inst.leads || []).map(function(l) {
                var type = INSTALLER_LEAD_TYPES.find(function(t){return t.id===l.typeId;}) || INSTALLER_LEAD_TYPES[0];
                var isPicked = !!l.picked;
                return h('button', { key: l.id, 'data-rn-focusable': true,
                  onClick: function() { togglePickLead(l.id); },
                  'aria-pressed': isPicked,
                  style: { textAlign: 'left', padding: 10, borderRadius: 8, background: isPicked ? 'rgba(16,185,129,0.12)' : T.cardAlt, border: '2px solid ' + (isPicked ? T.accent : T.border), cursor: 'pointer', color: T.text } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true' }, type.icon),
                    h('span', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi } }, type.label),
                    h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.dim, fontFamily: 'monospace' } }, l.kw + ' kW')
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.45, marginBottom: 4 } }, type.notes),
                  h('div', { style: { fontSize: 11, color: T.dim, fontFamily: 'monospace' } },
                    'Competitor bid: $' + l.compBid.toFixed(2) + '/W',
                    h('span', { style: { color: isPicked ? T.accent : T.dim, marginLeft: 8 } }, isPicked ? '✓ BIDDING' : 'click to bid'))
                );
              })
            )
          ),
          // ── Bid price + supplier ──
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 } },
            // Bid price slider
            h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.bid_price', '💵 Bid price')),
              h('p', { style: { margin: '0 0 8px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
                __alloT('stem.renewables.charge_per_watt_competitors_bid_2_80_3', 'Charge per watt. Competitors bid $2.80–$3.60/W. Low = more wins, lower margin. High = fewer wins, fatter margin.')),
              h('input', { type: 'range', min: 2.50, max: 4.50, step: 0.05, value: inst.bidPricePerW,
                onChange: function(e) { setBidPrice(parseFloat(e.target.value)); },
                'aria-label': __alloT('stem.renewables.bid_price_per_watt_2', 'Bid price per watt'),
                style: { width: '100%' } }),
              h('div', { style: { textAlign: 'center', fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: T.accentHi } }, '$' + inst.bidPricePerW.toFixed(2) + ' / W')
            ),
            // Supplier picker
            h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.panel_supplier', '🏭 Panel supplier')),
              INSTALLER_SUPPLIERS.map(function(s) {
                var picked = s.id === inst.supplierId;
                return h('button', { key: s.id, 'data-rn-focusable': true,
                  onClick: function() { setSupplier(s.id); },
                  style: { display: 'block', width: '100%', textAlign: 'left', padding: 10, borderRadius: 8, marginTop: 6, background: picked ? 'rgba(16,185,129,0.12)' : T.cardAlt, border: '2px solid ' + (picked ? T.accent : T.border), cursor: 'pointer', color: T.text } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, marginBottom: 2 } }, s.icon + ' ' + s.name),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45, marginBottom: 4 } }, s.desc),
                  h('div', { style: { fontSize: 10, color: T.dim, fontFamily: 'monospace' } },
                    '$' + s.costPerW.toFixed(2) + '/W · warranty ' + s.warrantyYears + 'yr · claim ' + Math.round(s.claimRate * 100) + '%')
                );
              })
            )
          ),
          // ── Workforce ──
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.workforce', '👷 Workforce')),
            h('p', { style: { margin: '0 0 8px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.renewables.installers_do_the_work_inspectors_hand', 'Installers do the work. Inspectors handle QA. Sales staff expands your bid bandwidth. Each annual headcount has a salary. Hiring costs $3K–$5K up front.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              workforceCtrl('installers', '🔧 Installers', '$50K/yr salary. Aim for ~10 installs / installer per year.', inst.installers, adjustWorkforce),
              workforceCtrl('inspectors', '🔍 Inspectors', '$45K/yr salary. 1 per 30 installs keeps QA tight.', inst.inspectors, adjustWorkforce),
              workforceCtrl('sales', '📞 Sales', '$40K/yr salary. Each sales rep adds +1 to your bid-bandwidth cap.', inst.sales, adjustWorkforce)
            )
          ),
          // ── Event log (if any) ──
          (inst.events && inst.events.length > 0) && h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, __alloT('stem.renewables.recent_events', '📋 Recent events')),
            inst.events.slice(-3).reverse().map(function(ev, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: T.card, marginBottom: 4, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'Yr ' + ev.year + ' · ' + ev.headline), ' — ', ev.text);
            })
          ),
          // ── Advance Year button ──
          pickedCount === 0
            ? h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.warm, color: T.warm, textAlign: 'center', fontSize: 12 } },
                __alloT('stem.renewables.pick_at_least_one_lead_to_bid_on_befor', '⚠ Pick at least one lead to bid on before advancing the year.'))
            : h('button', { 'data-rn-focusable': true,
                onClick: advanceYear,
                style: { width: '100%', padding: '14px 18px', borderRadius: 12, border: 'none', background: T.accent, color: '#053920', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' } },
                '▶ Run Year ' + (inst.year + 1) + ' (resolve bids + roll event + end-of-year P&L)'),
          footer()
        );

        // Helper: small stat block
        function statBlock(label, value, color) {
          return h('div', { style: { textAlign: 'center' } },
            h('div', { style: { fontSize: 10, color: T.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' } }, label),
            h('div', { style: { fontSize: 16, fontWeight: 800, color: color || T.text, fontFamily: 'monospace', marginTop: 2 } }, value)
          );
        }
        function workforceCtrl(role, label, hint, current, adj) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, marginBottom: 2 } }, label),
            h('div', { style: { fontSize: 10, color: T.dim, lineHeight: 1.4, marginBottom: 8 } }, hint),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              h('button', { 'data-rn-focusable': true,
                onClick: function() { adj(role, -1); },
                'aria-label': 'Fire one ' + role.slice(0, -1),
                style: { width: 32, height: 32, borderRadius: 6, border: '1px solid ' + T.border, background: T.card, color: T.text, cursor: current > 0 ? 'pointer' : 'not-allowed', fontWeight: 800 }, disabled: current === 0 }, '−'),
              h('div', { style: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, color: T.text, fontFamily: 'monospace' } }, current),
              h('button', { 'data-rn-focusable': true,
                onClick: function() { adj(role, +1); },
                'aria-label': 'Hire one ' + role.slice(0, -1),
                style: { width: 32, height: 32, borderRadius: 6, border: '1px solid ' + T.border, background: T.card, color: T.text, cursor: 'pointer', fontWeight: 800 } }, '+')
            )
          );
        }
      }

      // ─────────────────────────────────────────
      // GLOSSARY
      // ─────────────────────────────────────────
      function renderGlossary() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📖 Glossary'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.renewables.terms_used_throughout_this_lab_and_thr', 'Terms used throughout this lab — and throughout any conversation about energy. Skim before reading the news; come back when something is fuzzy.')),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 } },
            GLOSSARY.map(function(g, i) {
              return h('div', { key: i, role: 'listitem',
                style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, g.term),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, g.def)
              );
            })
          ),
          (function() { if (Object.keys(modulesVisited).length >= 10) awardBadge('glossary_master', 'Read the Glossary'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // MYTHS BUSTED
      // ─────────────────────────────────────────
      function renderMyths() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🧐 Common myths — corrected'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.renewables.seven_misconceptions_you_will_hear_in_', 'Seven misconceptions you will hear in news, comment threads, or family arguments. Each correction is sourced — bring receipts.')),
          MYTHS.map(function(m, i) {
            return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } },
                __alloT('stem.renewables.myth', '❌ Myth: '), h('span', { style: { color: T.text } }, m.myth)),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.what_s_actually_true', '✓ What\'s actually true: ')),
                m.truth),
              h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                'Source: ', m.source)
            );
          }),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // NUCLEAR — included for honest comparison
      // ─────────────────────────────────────────
      function renderNuclear() {
        var n = NUCLEAR_BASICS;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('⚛️ Nuclear (low-carbon, not renewable)'),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#3a1a1a', border: '1px solid ' + T.warn, marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } }, __alloT('stem.renewables.a_note_on_scope', '⚠ A note on scope')),
            h('p', { style: { margin: 0, fontSize: 12, color: '#fde2e2', lineHeight: 1.55 } }, n.why)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, n.icon),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 17, color: T.text } }, __alloT('stem.renewables.nuclear_fission', 'Nuclear fission')),
                h('div', { style: { fontSize: 12, color: T.accentHi } }, 'Principle: ' + n.principle))),
            h('p', { style: { margin: '6px 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, n.oneLiner),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11, color: T.dim } },
              h('div', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.capacity_factor_3', 'Capacity factor: ')), n.capacityFactor),
              h('div', null, h('strong', { style: { color: T.text } }, 'LCOE: '), n.lcoe),
              h('div', null, h('strong', { style: { color: T.text } }, __alloT('stem.renewables.lifecycle_co_2', 'Lifecycle CO₂: ')), n.co2)
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: '#064e3b', border: '1px solid ' + T.accent } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 8 } }, __alloT('stem.renewables.pros_2', '✓ Pros')),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: '#dcfce7', lineHeight: 1.6 } },
                n.pros.map(function(p, i) { return h('li', { key: i }, p); }))
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 8 } }, __alloT('stem.renewables.cons_2', '⚠ Cons')),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: '#fde2e2', lineHeight: 1.6 } },
                n.cons.map(function(p, i) { return h('li', { key: i }, p); }))
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.reactor_designs', 'Reactor designs')),
            n.designs.map(function(d2, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('strong', { style: { color: T.text, fontSize: 13 } }, d2.name),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 3 } }, d2.what)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 6 } }, __alloT('stem.renewables.what_about_fusion', '🔬 What about fusion?')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } }, n.fusion)
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // AI PRACTICE — design scenarios + AI critique with local fallback
      // ─────────────────────────────────────────
      function renderAiPractice() {
        var callGemini = ctx.callGemini || null;
        var scenario = AI_SCENARIOS.filter(function(s) { return s.id === aiScenarioId; })[0] || null;

        function selectScenario(id) {
          updMulti({ aiScenarioId: id, aiResponse: '', aiCritique: null });
          rnAnnounce(__alloT('stem.renewables.sr_scenario_loaded', 'Scenario loaded.'));
        }

        function getCritique() {
          if (!scenario || !aiResponse.trim()) return;
          if (!callGemini) {
            // Local fallback — keyword + topic check against the rubric.
            var resp = aiResponse.toLowerCase();
            var checks = scenario.rubric.map(function(r) {
              // Crude topic match: split rubric into keywords and check if any are in the response
              var lc = r.toLowerCase();
              var keywords = lc.match(/[a-z][a-z\-]{3,}/g) || [];
              var hits = 0;
              keywords.forEach(function(k) { if (resp.indexOf(k) !== -1) hits++; });
              return { ok: hits >= 2, msg: r };
            });
            var summary = 'Local rubric check (no AI available):\n\n' + checks.map(function(c) {
              return (c.ok ? '✓ ' : '○ ') + c.msg;
            }).join('\n') + '\n\nThe checks above flag whether your response touched on each rubric criterion. They are crude — a real AI critique would do much better.';
            upd('aiCritique', { text: summary, source: 'local' });
            rnAnnounce(__alloT('stem.renewables.sr_local_check_ready', 'Local check ready.'));
            return;
          }
          upd('aiLoadingCritique', true);
          rnAnnounce(__alloT('stem.renewables.sr_getting_critique', 'Getting critique...'));
          var prompt = 'You are a renewable-energy engineering instructor reviewing a student’s system design.\n\n' +
            'SCENARIO:\n' + scenario.prompt + '\n\n' +
            'STUDENT DESIGN:\n' + aiResponse + '\n\n' +
            'RUBRIC (criteria a sound design hits):\n' + scenario.rubric.map(function(r, i) { return (i + 1) + '. ' + r; }).join('\n') + '\n\n' +
            'GROUND-TRUTH FACTS (do not deviate; if student response conflicts, flag):\n' +
            AI_GROUND_TRUTH.map(function(p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\n' +
            'CRITIQUE specifically:\n' +
            '1. Which rubric items did they hit? (cite numbers)\n' +
            '2. Which did they miss?\n' +
            '3. Any factual errors against the ground-truth list?\n' +
            '4. One concrete suggestion to strengthen the design.\n\n' +
            'Tone: warm, specific, like a school engineering teacher. 5–7 sentences. ' +
            'End with: "Educational only — real designs need a licensed engineer."';
          callGemini(prompt, { maxOutputTokens: 500 })
            .then(function(text) {
              var clean = String(text || '').trim();
              if (!clean) throw new Error('Empty response');
              updMulti({ aiCritique: { text: clean, source: 'ai' }, aiLoadingCritique: false });
              awardBadge('ai_designer', 'AI Practice (got a design critiqued)');
              rnAnnounce(__alloT('stem.renewables.sr_critique_ready', 'Critique ready.'));
            })
            .catch(function(e) {
              console.warn('[Renewables] AI critique failed; falling back.', e);
              upd('aiLoadingCritique', false);
              addToast('AI unavailable — try the local check.');
            });
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤖 AI Practice — design a system'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.renewables.pick_a_scenario_write_4_8_sentences_de', 'Pick a scenario. Write 4–8 sentences describing how you would design the electricity system. '),
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.ai_critiques_your_reasoning', 'AI critiques your reasoning')),
              __alloT('stem.renewables.against_an_engineering_rubric_and_the_', ' against an engineering rubric and the same ground-truth facts you read in the source modules.'))
          ),
          // Rubric framing — students should know what a "good answer"
          // looks like before they write. Same pattern as the BehaviorLab
          // Function Sleuth four-functions primer.
          goalBanner('A strong answer (1) cites a real number from one of the source sims (kWh, capacity factor, dollars per kW), (2) names at least one trade-off (cost vs reliability, footprint vs output, dispatchability vs intermittency), and (3) considers feasibility for the specific scenario (climate, geography, grid context). The AI weighs all three.'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.pick_a_scenario', '📋 Pick a scenario')),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
              AI_SCENARIOS.map(function(s) {
                var picked = aiScenarioId === s.id;
                return h('div', { key: s.id, role: 'listitem' }, h('button', { 'data-rn-focusable': true,
                  'aria-label': s.title + (picked ? ' (selected)' : ''),
                  'aria-pressed': picked ? 'true' : 'false',
                  onClick: function() { selectScenario(s.id); },
                  style: btn({
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                    padding: 10, minHeight: 60,
                    background: picked ? T.cardAlt : T.card,
                    borderColor: picked ? T.accent : T.border
                  })
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, s.icon),
                    h('span', { style: { fontWeight: 700, fontSize: 13 } }, s.title)
                  )
                ));
              })
            )
          ),
          scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, scenario.icon + ' ' + scenario.title),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.6 } }, scenario.prompt),
            h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              h('strong', { style: { color: T.warm } }, __alloT('stem.renewables.hint', '💡 Hint: ')), scenario.hint)
          ),
          scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('label', { htmlFor: 'rn-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
              __alloT('stem.renewables.your_design_4_8_sentences', '✏️ Your design (4–8 sentences)')),
            h('textarea', { id: 'rn-ai-response', 'data-rn-focusable': true,
              value: aiResponse,
              onChange: function(e) { upd('aiResponse', e.target.value); },
              placeholder: __alloT('stem.renewables.walk_through_your_system_which_sources', 'Walk through your system. Which sources? Why? What storage? What backup? Any failure modes you would address?'),
              'aria-label': __alloT('stem.renewables.your_renewable_energy_system_design', 'Your renewable energy system design'),
              rows: 6,
              style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('div', { style: { marginTop: 6, fontSize: 11, color: T.dim, marginBottom: 10 } },
              aiResponse.length, __alloT('stem.renewables.characters_aim_for_300_800', ' characters. Aim for ~300–800.')),
            h('button', { 'data-rn-focusable': true,
              'aria-label': aiLoadingCritique ? 'Getting critique' : 'Get critique of your design',
              'aria-busy': aiLoadingCritique ? 'true' : 'false',
              disabled: aiLoadingCritique || !aiResponse.trim(),
              onClick: getCritique,
              style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
            }, aiLoadingCritique ? '⏳ Critiquing...' : (callGemini ? '🎓 Get AI critique' : '📋 Local rubric check'))
          ),
          aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#0d2a4a', border: '1px solid #1e40af', color: '#dbeafe', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: '#bfdbfe' } }, __alloT('stem.renewables.critique', '🎓 Critique')),
            h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
            h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
              aiCritique.source === 'ai' ? 'Critique from AI; constrained against the source-module ground-truth.' : 'Local rubric check (AI unavailable).')
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // DIAGRAMS — labeled SVG schematics for the visually-oriented learner
      // 4 schematics: solar PV cell, wind turbine cutaway, geothermal flash plant,
      // ground-source heat pump cycle. Hand-drawn inline SVG with text labels.
      // ─────────────────────────────────────────
      var DIAGRAM_TABS = [
        { id: 'solarPv',    icon: '☀️', label: __alloT('stem.renewables.solar_pv_cell', 'Solar PV cell') },
        { id: 'wind',       icon: '🌬️', label: __alloT('stem.renewables.wind_turbine', 'Wind turbine') },
        { id: 'hydro',      icon: '🌊', label: __alloT('stem.renewables.hydro_dam', 'Hydro dam') },
        { id: 'geothermal', icon: '🌋', label: __alloT('stem.renewables.geothermal_flash_plant', 'Geothermal flash plant') },
        { id: 'csp',        icon: '🔆', label: __alloT('stem.renewables.csp_power_tower', 'CSP power tower') },
        { id: 'gshp',       icon: '🏠', label: __alloT('stem.renewables.ground_source_heat_pump', 'Ground-source heat pump') },
        { id: 'owc',        icon: '🌀', label: __alloT('stem.renewables.wave_owc', 'Wave OWC') },
        { id: 'digester',   icon: '🌾', label: __alloT('stem.renewables.anaerobic_digester', 'Anaerobic digester') },
        { id: 'pumpedHydro',icon: '⛰️', label: __alloT('stem.renewables.pumped_hydro_storage', 'Pumped hydro storage') }
      ];
      function svgSolarPvCell() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-solarpv-title svg-solarpv-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-solarpv-title' }, __alloT('stem.renewables.cross_section_of_a_silicon_photovoltai', 'Cross-section of a silicon photovoltaic cell')),
          h('desc', { id: 'svg-solarpv-desc' }, __alloT('stem.renewables.photons_arrive_from_above_hit_silicon_', 'Photons arrive from above, hit silicon, knock electrons loose. The P-N junction sorts charges. Electrons flow through an external circuit as DC current.')),
          // Sun
          h('circle', { cx: 80, cy: 50, r: 24, fill: '#facc15' }),
          h('text', { x: 80, y: 28, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.sunlight', 'Sunlight')),
          // Photon arrows
          [120, 180, 240, 300, 360, 420].map(function(x, i) {
            return h('g', { key: 'p' + i },
              h('line', { x1: x - 20, y1: 30, x2: x, y2: 100, stroke: '#fde047', strokeWidth: 1.5, strokeDasharray: '3,3' }),
              h('polygon', { points: x + ',95 ' + (x - 4) + ',88 ' + (x + 4) + ',88', fill: '#fde047' })
            );
          }),
          // N-type silicon layer
          h('rect', { x: 80, y: 100, width: 440, height: 40, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }),
          h('text', { x: 300, y: 125, fill: '#fff', fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, __alloT('stem.renewables.n_type_silicon_extra_electrons', 'N-type silicon (extra electrons)')),
          // P-N junction line
          h('line', { x1: 80, y1: 140, x2: 520, y2: 140, stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '6,3' }),
          h('text', { x: 540, y: 144, fill: '#fbbf24', fontSize: 11 }, __alloT('stem.renewables.p_n_junction', 'P-N junction')),
          // P-type silicon layer
          h('rect', { x: 80, y: 140, width: 440, height: 60, fill: '#1e40af', stroke: '#1e3a8a', strokeWidth: 2 }),
          h('text', { x: 300, y: 175, fill: '#fff', fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, __alloT('stem.renewables.p_type_silicon_electron_holes', 'P-type silicon (electron "holes")')),
          // Electron flow arrow (top)
          h('line', { x1: 80, y1: 90, x2: 30, y2: 90, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('polygon', { points: '32,90 38,86 38,94', fill: '#22c55e' }),
          h('text', { x: 50, y: 80, fill: '#22c55e', fontSize: 11 }, 'e⁻'),
          // External circuit (bulb)
          h('line', { x1: 30, y1: 90, x2: 30, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 30, y1: 250, x2: 280, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('circle', { cx: 300, cy: 250, r: 22, fill: 'none', stroke: '#facc15', strokeWidth: 3 }),
          h('text', { x: 300, y: 256, fill: '#facc15', fontSize: 18, textAnchor: 'middle' }, '💡'),
          h('text', { x: 300, y: 290, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.external_circuit_lamp_home', 'External circuit (lamp, home)')),
          h('line', { x1: 320, y1: 250, x2: 570, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 570, y1: 250, x2: 570, y2: 200, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 570, y1: 200, x2: 520, y2: 200, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('polygon', { points: '525,200 531,196 531,204', fill: '#22c55e' }),
          // Caption labels
          h('text', { x: 300, y: 330, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle' }, __alloT('stem.renewables.1_photon_arrives_2_knocks_electron_loo', '1. Photon arrives  →  2. Knocks electron loose  →  3. P-N junction sorts charges  →  4. Electrons flow as DC current'))
        );
      }
      function svgWindTurbine() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-wind-title svg-wind-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-wind-title' }, __alloT('stem.renewables.wind_turbine_cutaway', 'Wind turbine cutaway')),
          h('desc', { id: 'svg-wind-desc' }, __alloT('stem.renewables.wind_spins_the_rotor_blades_which_turn', 'Wind spins the rotor blades, which turn a low-speed shaft connected to a gearbox, which spins a high-speed shaft into the generator. The generator produces electricity. The yaw drive points the turbine into the wind. Cables carry power down through the tower to the grid.')),
          // Sky/ground
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#1f2937' }),
          // Tower
          h('polygon', { points: '290,300 310,300 320,90 280,90', fill: '#94a3b8' }),
          h('text', { x: 200, y: 250, fill: '#94a3b8', fontSize: 12 }, __alloT('stem.renewables.tower_80_120_m_tall', 'Tower (80–120 m tall)')),
          // Nacelle (the box at the top)
          h('rect', { x: 250, y: 70, width: 130, height: 40, fill: '#475569', stroke: '#1f2937', strokeWidth: 2 }),
          // Rotor hub
          h('circle', { cx: 240, cy: 90, r: 14, fill: '#94a3b8', stroke: '#1f2937', strokeWidth: 2 }),
          // Three blades
          h('polygon', { points: '240,90 130,40 145,75 240,90', fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1 }),
          h('polygon', { points: '240,90 200,200 230,180 240,90', fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1 }),
          h('polygon', { points: '240,90 350,140 320,100 240,90', fill: '#cbd5e1', stroke: '#475569', strokeWidth: 1 }),
          // Internals labels (gearbox + generator)
          h('rect', { x: 270, y: 78, width: 30, height: 24, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 1 }),
          h('text', { x: 285, y: 93, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.gear', 'Gear')),
          h('rect', { x: 320, y: 78, width: 50, height: 24, fill: '#22c55e', stroke: '#166534', strokeWidth: 1 }),
          h('text', { x: 345, y: 93, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.generator', 'Generator')),
          // Wind arrows
          [50, 80, 120, 160].map(function(y, i) {
            return h('g', { key: 'w' + i },
              h('line', { x1: 30, y1: y, x2: 100, y2: y, stroke: '#7dd3fc', strokeWidth: 2 }),
              h('polygon', { points: '102,' + y + ' 95,' + (y - 4) + ' 95,' + (y + 4), fill: '#7dd3fc' })
            );
          }),
          h('text', { x: 60, y: 30, fill: '#7dd3fc', fontSize: 12, fontWeight: 700 }, __alloT('stem.renewables.wind_4', 'Wind →')),
          // Cable down tower
          h('line', { x1: 300, y1: 110, x2: 300, y2: 280, stroke: '#facc15', strokeWidth: 2, strokeDasharray: '4,3' }),
          h('text', { x: 380, y: 200, fill: '#facc15', fontSize: 11 }, __alloT('stem.renewables.power_cable', 'Power cable')),
          h('text', { x: 380, y: 215, fill: '#facc15', fontSize: 11 }, __alloT('stem.renewables.to_grid', 'to grid')),
          // Component labels with arrows
          h('text', { x: 130, y: 30, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.1_blades_capture_kinetic_energy', '1. Blades capture kinetic energy')),
          h('text', { x: 410, y: 65, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.2_hub_low_speed_shaft', '2. Hub + low-speed shaft')),
          h('text', { x: 410, y: 80, fill: '#fbbf24', fontSize: 11 }, __alloT('stem.renewables.3_gearbox_80', '3. Gearbox (× ~80)')),
          h('text', { x: 410, y: 95, fill: '#22c55e', fontSize: 11 }, __alloT('stem.renewables.4_generator', '4. Generator')),
          h('text', { x: 410, y: 115, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.5_yaw_drive_aims_at_wind', '5. Yaw drive aims at wind')),
          // Caption
          h('text', { x: 300, y: 335, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle' }, __alloT('stem.renewables.power_scales_with_v_cube_of_wind_speed', 'Power scales with v³ (cube of wind speed). Betz limit: max 59.3% extractable.'))
        );
      }
      function svgGeothermalFlash() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-geo-title svg-geo-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-geo-title' }, __alloT('stem.renewables.flash_steam_geothermal_power_plant', 'Flash-steam geothermal power plant')),
          h('desc', { id: 'svg-geo-desc' }, __alloT('stem.renewables.hot_pressurized_water_is_pumped_up_the', 'Hot pressurized water is pumped up the production well. Pressure drops in the flash tank, instantly vaporizing most of it to steam. The steam spins a turbine. After condensing, the cooled water is reinjected to the reservoir.')),
          // Surface
          h('rect', { x: 0, y: 180, width: 600, height: 180, fill: '#1f2937' }),
          h('text', { x: 10, y: 170, fill: '#94a3b8', fontSize: 11 }, __alloT('stem.renewables.surface', 'Surface')),
          // Hot rock
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#7f1d1d' }),
          h('text', { x: 300, y: 330, fill: '#fde047', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.hot_rock_reservoir_180_300_c', 'Hot rock reservoir (180–300 °C)')),
          // Production well (left)
          h('rect', { x: 110, y: 180, width: 14, height: 160, fill: '#dc2626' }),
          h('text', { x: 70, y: 240, fill: '#fca5a5', fontSize: 10 }, __alloT('stem.renewables.hot_water', 'Hot water')),
          h('text', { x: 70, y: 252, fill: '#fca5a5', fontSize: 10 }, 'up'),
          h('polygon', { points: '117,170 110,180 124,180', fill: '#dc2626' }),
          // Flash tank
          h('rect', { x: 100, y: 110, width: 90, height: 60, fill: '#1e3a8a', stroke: '#3b82f6', strokeWidth: 2 }),
          h('text', { x: 145, y: 135, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.flash', 'Flash')),
          h('text', { x: 145, y: 150, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'tank'),
          // Steam pipe to turbine
          h('line', { x1: 190, y1: 130, x2: 290, y2: 130, stroke: '#cbe8e0', strokeWidth: 4 }),
          h('text', { x: 235, y: 120, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.steam', 'Steam')),
          // Turbine
          h('circle', { cx: 320, cy: 130, r: 24, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 320, y: 135, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.turbine', 'Turbine')),
          // Generator
          h('rect', { x: 360, y: 110, width: 60, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 390, y: 135, fill: '#000', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.generator_2', 'Generator')),
          // Power lines out
          h('line', { x1: 420, y1: 130, x2: 480, y2: 130, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '482,130 475,126 475,134', fill: '#facc15' }),
          h('text', { x: 510, y: 135, fill: '#facc15', fontSize: 11 }, __alloT('stem.renewables.to_grid_2', 'To grid')),
          // Condenser cooling
          h('line', { x1: 320, y1: 154, x2: 320, y2: 200, stroke: '#7dd3fc', strokeWidth: 3 }),
          h('rect', { x: 295, y: 200, width: 50, height: 30, fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          h('text', { x: 320, y: 220, fill: '#fff', fontSize: 10, textAnchor: 'middle' }, __alloT('stem.renewables.condenser', 'Condenser')),
          // Injection well (right)
          h('rect', { x: 470, y: 180, width: 14, height: 160, fill: '#0e7490' }),
          h('text', { x: 495, y: 240, fill: '#7dd3fc', fontSize: 10 }, __alloT('stem.renewables.cool_water', 'Cool water')),
          h('text', { x: 495, y: 252, fill: '#7dd3fc', fontSize: 10 }, 'reinjected'),
          h('line', { x1: 345, y1: 215, x2: 470, y2: 215, stroke: '#7dd3fc', strokeWidth: 2.5 }),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11 }, __alloT('stem.renewables.1_production_well', '1. Production well →')),
          h('text', { x: 30, y: 45, fill: '#fde047', fontSize: 11 }, __alloT('stem.renewables.2_flash_to_steam', '2. Flash to steam')),
          h('text', { x: 30, y: 60, fill: '#fde047', fontSize: 11 }, __alloT('stem.renewables.3_spin_turbine', '3. Spin turbine')),
          h('text', { x: 30, y: 75, fill: '#fde047', fontSize: 11 }, __alloT('stem.renewables.4_condense_reinject', '4. Condense + reinject')),
          h('text', { x: 300, y: 95, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.flash_steam_plant', 'Flash-steam plant'))
        );
      }
      function svgGshp() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-gshp-title svg-gshp-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-gshp-title' }, __alloT('stem.renewables.ground_source_heat_pump_cycle', 'Ground-source heat pump cycle')),
          h('desc', { id: 'svg-gshp-desc' }, __alloT('stem.renewables.a_refrigeration_cycle_that_moves_heat_', 'A refrigeration cycle that moves heat between the constant-temperature ground and a home. In winter, evaporator absorbs heat from the ground loop; compressor raises temperature; condenser releases heat to the home; expansion valve resets the cycle. COP 3 to 5 means 3 to 5 units of heat moved per unit of electricity used.')),
          // House outline
          h('polygon', { points: '60,160 60,80 110,40 160,80 160,160', fill: '#1e293b', stroke: '#94a3b8', strokeWidth: 2 }),
          h('rect', { x: 80, y: 100, width: 60, height: 60, fill: '#334155' }),
          h('text', { x: 110, y: 175, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.home', 'Home')),
          // Ground line
          h('line', { x1: 0, y1: 200, x2: 600, y2: 200, stroke: '#92400e', strokeWidth: 2 }),
          h('rect', { x: 0, y: 200, width: 600, height: 160, fill: '#451a03' }),
          h('text', { x: 540, y: 215, fill: '#d97706', fontSize: 10 }, __alloT('stem.renewables.ground_10_c', 'Ground (~10°C)')),
          // Ground loop pipe (U-shape buried)
          h('path', { d: 'M 250 200 L 250 320 L 350 320 L 350 200', stroke: '#7dd3fc', strokeWidth: 4, fill: 'none' }),
          h('text', { x: 300, y: 340, fill: '#7dd3fc', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.ground_loop_water_antifreeze', 'Ground loop (water + antifreeze)')),
          // Heat pump unit (the box with the cycle)
          h('rect', { x: 220, y: 80, width: 200, height: 90, fill: '#0f172a', stroke: '#22c55e', strokeWidth: 2 }),
          h('text', { x: 320, y: 70, fill: '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.heat_pump_unit', 'Heat pump unit')),
          // Cycle inside: evaporator, compressor, condenser, expansion valve
          // Evaporator (left, cold)
          h('rect', { x: 230, y: 130, width: 50, height: 30, fill: '#0e7490', stroke: '#155e75', strokeWidth: 1 }),
          h('text', { x: 255, y: 150, fill: '#fff', fontSize: 9, textAnchor: 'middle' }, 'Evap.'),
          // Compressor (top, hot)
          h('circle', { cx: 320, cy: 100, r: 14, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1 }),
          h('text', { x: 320, y: 104, fill: '#fff', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'Comp.'),
          // Condenser (right, hot)
          h('rect', { x: 360, y: 130, width: 50, height: 30, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1 }),
          h('text', { x: 385, y: 150, fill: '#fff', fontSize: 9, textAnchor: 'middle' }, 'Cond.'),
          // Expansion valve (bottom)
          h('polygon', { points: '320,165 308,150 332,150', fill: '#7dd3fc', stroke: '#0e7490', strokeWidth: 1 }),
          h('text', { x: 360, y: 175, fill: '#7dd3fc', fontSize: 9 }, 'Exp.'),
          // Cycle arrows (refrigerant flow)
          h('path', { d: 'M 280 145 Q 300 120 308 105', stroke: '#fbbf24', strokeWidth: 1.5, fill: 'none' }),
          h('path', { d: 'M 332 105 Q 350 120 360 145', stroke: '#fbbf24', strokeWidth: 1.5, fill: 'none' }),
          h('path', { d: 'M 360 160 Q 340 168 320 165', stroke: '#fbbf24', strokeWidth: 1.5, fill: 'none' }),
          h('path', { d: 'M 320 165 Q 290 165 280 160', stroke: '#fbbf24', strokeWidth: 1.5, fill: 'none' }),
          // Connection: ground loop -> evaporator
          h('line', { x1: 250, y1: 200, x2: 250, y2: 160, stroke: '#7dd3fc', strokeWidth: 2.5 }),
          h('line', { x1: 350, y1: 200, x2: 280, y2: 200, stroke: '#7dd3fc', strokeWidth: 2.5 }),
          // Connection: condenser -> home
          h('line', { x1: 360, y1: 145, x2: 160, y2: 145, stroke: '#dc2626', strokeWidth: 2.5 }),
          h('text', { x: 200, y: 138, fill: '#fca5a5', fontSize: 10 }, __alloT('stem.renewables.warm_air', 'Warm air')),
          h('text', { x: 200, y: 158, fill: '#fca5a5', fontSize: 10 }, __alloT('stem.renewables.to_home', 'to home')),
          // Electricity input
          h('line', { x1: 320, y1: 30, x2: 320, y2: 80, stroke: '#facc15', strokeWidth: 2 }),
          h('polygon', { points: '320,82 316,75 324,75', fill: '#facc15' }),
          h('text', { x: 330, y: 50, fill: '#facc15', fontSize: 11 }, __alloT('stem.renewables.electricity_in', '⚡ Electricity in')),
          // Caption
          h('text', { x: 300, y: 25, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.heat_pump_moves_heat_it_does_not_gener', 'Heat pump MOVES heat — it does not generate it')),
          h('text', { x: 300, y: 360, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.cop_3_5_every_1_unit_of_electricity_mo', 'COP 3–5: every 1 unit of electricity moves 3–5 units of heat into the home'))
        );
      }

      // ── Hydro dam cross-section ──
      function svgHydroDam() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-hydro-title svg-hydro-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-hydro-title' }, __alloT('stem.renewables.hydroelectric_dam_cross_section', 'Hydroelectric dam cross-section')),
          h('desc', { id: 'svg-hydro-desc' }, __alloT('stem.renewables.a_reservoir_behind_a_concrete_dam_stor', 'A reservoir behind a concrete dam stores water at high elevation. Water flows down through the penstock, spins a turbine, drives a generator, and exits the tailrace. Power equals density times gravity times head times flow times efficiency.')),
          // Sky
          h('rect', { x: 0, y: 0, width: 600, height: 280, fill: '#0f172a' }),
          // Dam body
          h('polygon', { points: '230,80 310,80 350,300 220,300', fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }),
          // Reservoir water (left side, high)
          h('rect', { x: 0, y: 100, width: 230, height: 200, fill: '#1e40af' }),
          h('text', { x: 100, y: 160, fill: '#dbeafe', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.reservoir', 'Reservoir')),
          h('text', { x: 100, y: 180, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.potential_energy', '(potential energy)')),
          // Head height arrow
          h('line', { x1: 30, y1: 110, x2: 30, y2: 290, stroke: '#facc15', strokeWidth: 1.5, strokeDasharray: '4,3' }),
          h('polygon', { points: '30,110 26,118 34,118', fill: '#facc15' }),
          h('polygon', { points: '30,290 26,282 34,282', fill: '#facc15' }),
          h('text', { x: 40, y: 200, fill: '#facc15', fontSize: 12, fontWeight: 700 }, __alloT('stem.renewables.head_h', 'Head (h)')),
          // Penstock — diagonal pipe down through the dam
          h('polygon', { points: '255,140 280,140 320,290 295,290', fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          h('text', { x: 220, y: 200, fill: '#7dd3fc', fontSize: 11 }, __alloT('stem.renewables.penstock', 'Penstock')),
          // Turbine
          h('circle', { cx: 320, cy: 290, r: 18, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 320, y: 295, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.turbine_2', 'Turbine')),
          // Generator
          h('rect', { x: 350, y: 270, width: 70, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 385, y: 295, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.generator_3', 'Generator')),
          // Power lines
          h('line', { x1: 420, y1: 290, x2: 580, y2: 290, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '582,290 575,286 575,294', fill: '#facc15' }),
          h('text', { x: 500, y: 282, fill: '#facc15', fontSize: 11 }, __alloT('stem.renewables.to_grid_3', 'To grid')),
          // Tailrace water (right, low)
          h('rect', { x: 350, y: 310, width: 250, height: 50, fill: '#1e3a8a' }),
          h('text', { x: 470, y: 340, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.tailrace_low_elevation', 'Tailrace (low elevation)')),
          // River bed (left ground)
          h('rect', { x: 0, y: 300, width: 230, height: 60, fill: '#451a03' }),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11, fontWeight: 700 }, __alloT('stem.renewables.hydro_power_p_g_h_q', 'Hydro power: P = ρ · g · h · Q · η')),
          h('text', { x: 30, y: 48, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.1_reservoir_holds_water_at_high_elevat', '1. Reservoir holds water at high elevation (potential energy)')),
          h('text', { x: 30, y: 62, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.2_penstock_pipes_water_down_gains_kine', '2. Penstock pipes water down — gains kinetic energy')),
          h('text', { x: 30, y: 76, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.3_turbine_generator_convert_to_electri', '3. Turbine + generator convert to electricity')),
          // Caption
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.doubling_either_head_or_flow_doubles_t', 'Doubling either head OR flow doubles the power output'))
        );
      }

      // ── CSP power tower ──
      function svgCspTower() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-csp-title svg-csp-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-csp-title' }, __alloT('stem.renewables.concentrated_solar_power_tower_with_mo', 'Concentrated Solar Power tower with molten salt storage')),
          h('desc', { id: 'svg-csp-desc' }, __alloT('stem.renewables.a_field_of_mirrors_called_heliostats_f', 'A field of mirrors called heliostats focuses sunlight onto a central tower receiver. Molten salt circulates through the receiver, heating to 565 degrees Celsius. Hot salt is stored in an insulated tank. Demand-side, hot salt flows through a heat exchanger to make steam, which spins a turbine and generator. Cold salt returns to a second tank to be reheated.')),
          // Sky + sun
          h('rect', { x: 0, y: 0, width: 600, height: 240, fill: '#0f172a' }),
          h('circle', { cx: 80, cy: 60, r: 22, fill: '#facc15' }),
          h('text', { x: 80, y: 35, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, 'Sun'),
          // Heliostat field (rows of small mirrors)
          [80, 100, 130, 165, 205, 250].map(function(y, row) {
            return h('g', { key: 'r' + row },
              [80, 130, 180, 230, 280, 330, 380].map(function(x, col) {
                return h('rect', { key: 'r' + row + 'c' + col,
                  x: x + (row * 4), y: y + 80, width: 16, height: 6, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 0.5 });
              })
            );
          }),
          // Sunlight rays converging on tower
          [100, 200, 300, 400].map(function(x, i) {
            return h('line', { key: 'ray' + i,
              x1: x, y1: 80, x2: 470, y2: 110, stroke: '#fde047', strokeWidth: 1, strokeDasharray: '3,2', opacity: 0.7 });
          }),
          h('text', { x: 220, y: 90, fill: '#fde047', fontSize: 11, fontWeight: 700 }, __alloT('stem.renewables.heliostat_field_1000s_of_mirrors', 'Heliostat field (1000s of mirrors)')),
          // Tower
          h('rect', { x: 460, y: 100, width: 20, height: 180, fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }),
          // Receiver at top of tower
          h('circle', { cx: 470, cy: 100, r: 16, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 2 }),
          h('text', { x: 470, y: 105, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, '565°C'),
          h('text', { x: 470, y: 80, fill: '#fca5a5', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.receiver', 'Receiver')),
          // Hot salt tank (right side, red)
          h('rect', { x: 510, y: 140, width: 60, height: 50, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 2 }),
          h('text', { x: 540, y: 165, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.hot_salt', 'Hot salt')),
          h('text', { x: 540, y: 180, fill: '#fff', fontSize: 9, textAnchor: 'middle' }, '(storage)'),
          // Cold salt tank (right side, blue)
          h('rect', { x: 510, y: 210, width: 60, height: 50, fill: '#1e3a8a', stroke: '#1e40af', strokeWidth: 2 }),
          h('text', { x: 540, y: 235, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.cold_salt', 'Cold salt')),
          // Connection: receiver → hot tank
          h('line', { x1: 480, y1: 110, x2: 510, y2: 150, stroke: '#dc2626', strokeWidth: 2.5 }),
          // Heat exchanger
          h('rect', { x: 350, y: 250, width: 60, height: 40, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 380, y: 268, fill: '#000', fontSize: 9, textAnchor: 'middle' }, __alloT('stem.renewables.heat', 'Heat')),
          h('text', { x: 380, y: 280, fill: '#000', fontSize: 9, textAnchor: 'middle' }, 'exchanger'),
          // Hot salt pipe to heat exchanger
          h('line', { x1: 510, y1: 165, x2: 410, y2: 260, stroke: '#dc2626', strokeWidth: 2 }),
          // Cold salt pipe back
          h('line', { x1: 410, y1: 280, x2: 510, y2: 230, stroke: '#1e3a8a', strokeWidth: 2 }),
          // Turbine + generator
          h('circle', { cx: 250, cy: 270, r: 18, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 250, y: 274, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.turbine_3', 'Turbine')),
          h('rect', { x: 180, y: 250, width: 50, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 205, y: 275, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Gen.'),
          // Steam line
          h('line', { x1: 350, y1: 270, x2: 270, y2: 270, stroke: '#cbe8e0', strokeWidth: 3 }),
          h('text', { x: 310, y: 260, fill: '#cbe8e0', fontSize: 10, textAnchor: 'middle' }, __alloT('stem.renewables.steam_2', 'Steam')),
          // Power out
          h('line', { x1: 180, y1: 270, x2: 80, y2: 270, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '78,270 85,266 85,274', fill: '#facc15' }),
          h('text', { x: 120, y: 262, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.to_grid_4', 'To grid')),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.csp_power_tower_with_thermal_energy_st', 'CSP power tower with thermal energy storage')),
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.hot_salt_can_run_the_turbine_for_6_10_', 'Hot salt can run the turbine for 6–10 hours after sunset'))
        );
      }

      // ── Wave Oscillating Water Column (OWC) ──
      function svgWaveOwc() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-owc-title svg-owc-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-owc-title' }, __alloT('stem.renewables.oscillating_water_column_wave_energy_c', 'Oscillating water column wave-energy converter')),
          h('desc', { id: 'svg-owc-desc' }, __alloT('stem.renewables.a_partly_submerged_chamber_traps_a_col', 'A partly submerged chamber traps a column of air above the rising and falling sea surface. As waves push the water up and down inside the chamber, the trapped air is forced in and out through a Wells turbine — which spins the same direction regardless of which way the air flows. The turbine drives a generator.')),
          // Sky
          h('rect', { x: 0, y: 0, width: 600, height: 200, fill: '#0f172a' }),
          // Sea surface (left, outside chamber)
          h('rect', { x: 0, y: 200, width: 200, height: 160, fill: '#1e3a8a' }),
          h('path', { d: 'M 0 210 Q 50 195 100 210 Q 150 225 200 210', stroke: '#7dd3fc', strokeWidth: 2, fill: 'none' }),
          // Chamber walls (concrete or steel structure)
          h('polygon', { points: '200,80 280,80 280,300 200,300', fill: '#475569', stroke: '#1f2937', strokeWidth: 2 }),
          h('polygon', { points: '380,80 460,80 460,300 380,300', fill: '#475569', stroke: '#1f2937', strokeWidth: 2 }),
          // Water inside chamber (rising/falling)
          h('rect', { x: 280, y: 230, width: 100, height: 70, fill: '#1e40af' }),
          h('path', { d: 'M 280 235 Q 305 225 330 235 Q 355 245 380 235', stroke: '#7dd3fc', strokeWidth: 2, fill: 'none' }),
          // Sea surface (right)
          h('rect', { x: 460, y: 200, width: 140, height: 160, fill: '#1e3a8a' }),
          h('path', { d: 'M 460 215 Q 510 200 560 215 Q 600 225 600 215', stroke: '#7dd3fc', strokeWidth: 2, fill: 'none' }),
          // Up/down arrows (water column oscillation)
          h('line', { x1: 330, y1: 250, x2: 330, y2: 200, stroke: '#fde047', strokeWidth: 2 }),
          h('polygon', { points: '330,200 326,208 334,208', fill: '#fde047' }),
          h('line', { x1: 320, y1: 200, x2: 320, y2: 250, stroke: '#fde047', strokeWidth: 2 }),
          h('polygon', { points: '320,250 316,242 324,242', fill: '#fde047' }),
          h('text', { x: 300, y: 175, fill: '#fde047', fontSize: 11, fontWeight: 700 }, __alloT('stem.renewables.water_rises_falls', 'Water rises/falls')),
          // Air column above water
          h('rect', { x: 280, y: 80, width: 100, height: 150, fill: 'none', stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4,3' }),
          h('text', { x: 330, y: 130, fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' }, __alloT('stem.renewables.air_column', 'Air column')),
          h('text', { x: 330, y: 145, fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' }, '(compressed)'),
          // Wells turbine in roof
          h('circle', { cx: 330, cy: 70, r: 18, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 330, y: 65, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.wells', 'Wells')),
          h('text', { x: 330, y: 78, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'turbine'),
          // Air flow arrows in/out turbine
          h('line', { x1: 330, y1: 80, x2: 330, y2: 50, stroke: '#7dd3fc', strokeWidth: 2 }),
          h('polygon', { points: '330,50 326,58 334,58', fill: '#7dd3fc' }),
          h('text', { x: 350, y: 50, fill: '#7dd3fc', fontSize: 10 }, __alloT('stem.renewables.air', 'Air ↕')),
          // Generator
          h('rect', { x: 410, y: 60, width: 60, height: 30, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 440, y: 80, fill: '#000', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.generator_4', 'Generator')),
          h('line', { x1: 348, y1: 70, x2: 410, y2: 75, stroke: '#cbd5e1', strokeWidth: 2 }),
          // Power line
          h('line', { x1: 470, y1: 75, x2: 580, y2: 75, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '582,75 575,71 575,79', fill: '#facc15' }),
          h('text', { x: 525, y: 67, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.to_grid_5', 'To grid')),
          // Wave coming in arrow
          h('line', { x1: 30, y1: 240, x2: 180, y2: 240, stroke: '#7dd3fc', strokeWidth: 2 }),
          h('polygon', { points: '182,240 175,236 175,244', fill: '#7dd3fc' }),
          h('text', { x: 100, y: 230, fill: '#7dd3fc', fontSize: 11 }, __alloT('stem.renewables.incoming_wave', 'Incoming wave →')),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.oscillating_water_column_owc', 'Oscillating water column (OWC)')),
          h('text', { x: 300, y: 340, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.wells_turbine_spins_the_same_direction', 'Wells turbine spins the SAME direction whether air flows in OR out — clever bidirectional design'))
        );
      }

      // ── Anaerobic biogas digester ──
      function svgDigester() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-dig-title svg-dig-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-dig-title' }, __alloT('stem.renewables.anaerobic_digester_biogas_system', 'Anaerobic digester biogas system')),
          h('desc', { id: 'svg-dig-desc' }, __alloT('stem.renewables.food_waste_manure_or_sewage_enters_a_s', 'Food waste, manure, or sewage enters a sealed tank where bacteria break it down without oxygen. The tank produces biogas — about 60 percent methane — which is burned in a generator or upgraded to pipeline-grade renewable natural gas. The leftover digestate is high-quality fertilizer.')),
          // Ground
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#451a03' }),
          // Feedstock pile (left)
          h('polygon', { points: '40,280 100,280 90,230 50,230', fill: '#92400e', stroke: '#451a03', strokeWidth: 2 }),
          h('text', { x: 70, y: 220, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' }, __alloT('stem.renewables.feedstock', 'Feedstock')),
          h('text', { x: 70, y: 232, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, '(food/manure)'),
          // Input pipe to digester
          h('line', { x1: 100, y1: 250, x2: 200, y2: 200, stroke: '#7dd3fc', strokeWidth: 4 }),
          h('polygon', { points: '202,200 195,196 195,206', fill: '#7dd3fc' }),
          // Digester tank (large dome)
          h('ellipse', { cx: 290, cy: 200, rx: 100, ry: 80, fill: '#16a34a', stroke: '#14532d', strokeWidth: 3 }),
          h('text', { x: 290, y: 195, fill: '#dcfce7', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.sealed_digester_tank', 'Sealed digester tank')),
          h('text', { x: 290, y: 215, fill: '#dcfce7', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.no_oxygen', '(no oxygen)')),
          h('text', { x: 290, y: 232, fill: '#dcfce7', fontSize: 9, textAnchor: 'middle', fontStyle: 'italic' }, __alloT('stem.renewables.bacteria_35_55_c', 'Bacteria + 35–55 °C')),
          // Bubble decoration showing methane production
          h('circle', { cx: 250, cy: 170, r: 4, fill: '#facc15' }),
          h('circle', { cx: 280, cy: 160, r: 5, fill: '#facc15' }),
          h('circle', { cx: 310, cy: 165, r: 3, fill: '#facc15' }),
          h('circle', { cx: 330, cy: 175, r: 4, fill: '#facc15' }),
          // Biogas pipe up
          h('line', { x1: 290, y1: 120, x2: 290, y2: 60, stroke: '#facc15', strokeWidth: 4 }),
          h('text', { x: 310, y: 90, fill: '#facc15', fontSize: 11, fontWeight: 700 }, __alloT('stem.renewables.biogas_60_ch', 'Biogas (~60% CH₄)')),
          // Generator
          h('rect', { x: 360, y: 40, width: 80, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 400, y: 65, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Gen-set'),
          h('line', { x1: 290, y1: 60, x2: 360, y2: 60, stroke: '#facc15', strokeWidth: 3 }),
          // Power out
          h('line', { x1: 440, y1: 60, x2: 570, y2: 60, stroke: '#fde047', strokeWidth: 2.5 }),
          h('polygon', { points: '572,60 565,56 565,64', fill: '#fde047' }),
          h('text', { x: 505, y: 50, fill: '#fde047', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.electricity_heat', 'Electricity + heat')),
          // Digestate output
          h('line', { x1: 380, y1: 260, x2: 480, y2: 280, stroke: '#92400e', strokeWidth: 4 }),
          h('polygon', { points: '480,278 480,290 472,283', fill: '#92400e' }),
          h('rect', { x: 480, y: 280, width: 80, height: 30, fill: '#a16207', stroke: '#78350f', strokeWidth: 1 }),
          h('text', { x: 520, y: 300, fill: '#fff', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.digestate', 'Digestate')),
          h('text', { x: 520, y: 325, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, '(fertilizer)'),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11, fontWeight: 700 }, __alloT('stem.renewables.anaerobic_digestion_capture_methane_th', 'Anaerobic digestion: capture methane that would otherwise leak')),
          h('text', { x: 30, y: 48, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.1_feedstock_in_food_waste_manure_sewag', '1. Feedstock in (food waste, manure, sewage)')),
          h('text', { x: 30, y: 62, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.2_bacteria_digest_in_sealed_warm_tank', '2. Bacteria digest in sealed warm tank')),
          h('text', { x: 30, y: 76, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.3_biogas_generator_or_upgrade_to_pipel', '3. Biogas → generator OR upgrade to pipeline gas')),
          h('text', { x: 30, y: 90, fill: '#cbe8e0', fontSize: 11 }, __alloT('stem.renewables.4_digestate_out_as_fertilizer', '4. Digestate out as fertilizer')),
          // Caption
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.methane_is_84_worse_than_co_over_20_yr', 'Methane is ~84× worse than CO₂ over 20 yr — burning it is a NET WIN'))
        );
      }

      // ── Pumped hydro storage cycle ──
      function svgPumpedHydro() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-ph-title svg-ph-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-ph-title' }, __alloT('stem.renewables.pumped_hydro_energy_storage', 'Pumped hydro energy storage')),
          h('desc', { id: 'svg-ph-desc' }, __alloT('stem.renewables.pumped_hydro_stores_electricity_by_pum', 'Pumped hydro stores electricity by pumping water from a low reservoir up to a high reservoir when power is cheap. When power is needed, the water flows back down through a reversible pump-turbine that drives a generator. Round-trip efficiency 75 to 85 percent. About 95 percent of the world installed grid storage is pumped hydro.')),
          // Sky
          h('rect', { x: 0, y: 0, width: 600, height: 360, fill: '#0f172a' }),
          // Mountain (the geographic asset)
          h('polygon', { points: '120,260 330,80 540,260', fill: '#475569', stroke: '#1f2937', strokeWidth: 2 }),
          // Upper reservoir (top)
          h('rect', { x: 270, y: 80, width: 120, height: 30, fill: '#1e3a8a' }),
          h('path', { d: 'M 270 85 Q 300 78 330 85 Q 360 92 390 85', stroke: '#7dd3fc', strokeWidth: 1.5, fill: 'none' }),
          h('text', { x: 330, y: 75, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.upper_reservoir', 'Upper reservoir')),
          // Lower reservoir (bottom)
          h('rect', { x: 80, y: 290, width: 440, height: 50, fill: '#1e40af' }),
          h('path', { d: 'M 80 295 Q 150 285 220 295 Q 290 305 360 295 Q 430 285 520 295', stroke: '#7dd3fc', strokeWidth: 1.5, fill: 'none' }),
          h('text', { x: 300, y: 320, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.lower_reservoir', 'Lower reservoir')),
          // Penstock (diagonal pipe through mountain)
          h('polygon', { points: '320,110 360,110 460,290 420,290', fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          // Reversible pump-turbine
          h('circle', { cx: 440, cy: 290, r: 22, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 440, y: 287, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.reversible', 'Reversible')),
          h('text', { x: 440, y: 297, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'pump-turbine'),
          // Generator/motor
          h('rect', { x: 470, y: 270, width: 70, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 505, y: 287, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.motor', 'Motor /')),
          h('text', { x: 505, y: 298, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'generator'),
          // CHARGING arrows (water flows UP)
          h('line', { x1: 360, y1: 270, x2: 340, y2: 130, stroke: '#7dd3fc', strokeWidth: 2.5, strokeDasharray: '5,3' }),
          h('polygon', { points: '340,130 336,140 344,140', fill: '#7dd3fc' }),
          h('text', { x: 220, y: 175, fill: '#7dd3fc', fontSize: 11, fontWeight: 700 }, 'CHARGING:'),
          h('text', { x: 220, y: 190, fill: '#7dd3fc', fontSize: 10 }, __alloT('stem.renewables.cheap_solar_noon', '(cheap solar @ noon)')),
          h('text', { x: 220, y: 205, fill: '#7dd3fc', fontSize: 10 }, __alloT('stem.renewables.pump_water_up', 'Pump water UP')),
          // DISCHARGING arrows (water flows DOWN)
          h('line', { x1: 360, y1: 145, x2: 380, y2: 285, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '380,285 376,275 384,275', fill: '#facc15' }),
          h('text', { x: 460, y: 175, fill: '#facc15', fontSize: 11, fontWeight: 700 }, 'DISCHARGING:'),
          h('text', { x: 460, y: 190, fill: '#facc15', fontSize: 10 }, __alloT('stem.renewables.evening_peak_demand', '(evening peak demand)')),
          h('text', { x: 460, y: 205, fill: '#facc15', fontSize: 10 }, __alloT('stem.renewables.water_flows_down', 'Water flows DOWN')),
          // Power line
          h('line', { x1: 540, y1: 290, x2: 590, y2: 290, stroke: '#fde047', strokeWidth: 2.5 }),
          h('text', { x: 555, y: 280, fill: '#fde047', fontSize: 11 }, __alloT('stem.renewables.grid', 'Grid')),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, __alloT('stem.renewables.pumped_hydro_storage_the_original_grid', 'Pumped hydro storage — the original grid battery')),
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, __alloT('stem.renewables.round_trip_efficiency_75_85_95_of_the_', 'Round-trip efficiency 75–85%. ~95% of the world\'s installed grid storage.'))
        );
      }

      function renderDiagrams() {
        var current = diagramView;
        var svg;
        var caption;
        if (current === 'wind') {
          svg = svgWindTurbine();
          caption = 'A modern utility-scale wind turbine has 3 blades, a rotor hub, gearbox, generator, yaw drive (to face the wind), and a tall steel tower. Wind power scales with v³ — the cube of wind speed. Betz’s law caps the theoretical maximum at 59.3% of wind kinetic energy.';
        } else if (current === 'hydro') {
          svg = svgHydroDam();
          caption = 'A hydroelectric dam stores water at high elevation. Falling water drives a turbine + generator. The power formula P = ρ·g·h·Q·η means doubling either the head (drop) OR the flow (volume per second) doubles the output. Three turbine families — Pelton, Francis, Kaplan — match different head/flow combinations.';
        } else if (current === 'geothermal') {
          svg = svgGeothermalFlash();
          caption = 'Flash-steam plants tap reservoirs at 180–300 °C. Hot pressurized water flashes instantly to steam in the flash tank when pressure drops. The steam spins a turbine; the condensed water is reinjected to keep the reservoir alive. The most common utility-scale geothermal design.';
        } else if (current === 'csp') {
          svg = svgCspTower();
          caption = 'A Concentrated Solar Power (CSP) tower uses thousands of mirrors (heliostats) to focus sunlight on a central receiver, heating molten salt to 565 °C. The hot salt is stored in an insulated tank; flowing through a heat exchanger it makes steam to spin a conventional turbine. Storage means the plant can run for 6–10 hours after sunset.';
        } else if (current === 'gshp') {
          svg = svgGshp();
          caption = 'A ground-source heat pump uses a refrigeration cycle to MOVE heat between the constant-temperature ground (~10 °C) and a home. In winter it pulls ground heat into the house; in summer it dumps house heat into the ground. COP 3–5 means 3–5 units of heat move per unit of electricity — dramatically more efficient than electric resistance heat.';
        } else if (current === 'owc') {
          svg = svgWaveOwc();
          caption = 'An Oscillating Water Column traps a column of air above the rising and falling sea surface. Waves push water up and down inside the chamber, forcing air through a Wells turbine — a clever bidirectional turbine that spins the same direction regardless of which way the air flows. Quiet and shore-based.';
        } else if (current === 'digester') {
          svg = svgDigester();
          caption = 'An anaerobic digester uses bacteria to break down food waste, manure, or sewage in a sealed warm tank with no oxygen. The product is biogas (~60% methane) — burned in a generator or upgraded to pipeline-grade renewable natural gas. The leftover digestate is high-quality fertilizer. Best case: capturing methane that would otherwise leak from manure lagoons or landfills.';
        } else if (current === 'pumpedHydro') {
          svg = svgPumpedHydro();
          caption = 'Pumped hydro pumps water UP to a high reservoir when electricity is cheap (excess solar/wind), then lets it flow DOWN through a reversible pump-turbine when expensive (evening peak). Round-trip efficiency 75–85%. About 95% of the world\'s installed grid storage is pumped hydro — far more than batteries.';
        } else {
          svg = svgSolarPvCell();
          caption = 'A silicon photovoltaic cell is two layers of silicon doped with different impurities (boron and phosphorus). Sunlight knocks electrons loose; the P-N junction’s electric field pushes them out one side; they flow through an external circuit as DC current; an inverter converts to AC for the grid.';
        }
        var diagramTabKeyDown = function(e, index) {
          var nextIndex = -1;
          var total = DIAGRAM_TABS.length;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % total;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + total - 1) % total;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = total - 1;
          if (nextIndex < 0) return;
          e.preventDefault();
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        };
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🔬 Diagrams'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.renewables.labeled_cross_sections_of_how_four_com', 'Labeled cross-sections of how four common renewable systems actually work. Switch tabs to compare designs.')),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.renewables.schematic_diagrams', 'Schematic diagrams'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            DIAGRAM_TABS.map(function(t, tabIndex) {
              var picked = current === t.id;
              return h('button', { key: t.id, role: 'tab',
                id: 'renewables-diagram-tab-' + t.id,
                'aria-controls': 'renewables-diagram-panel-' + t.id,
                'aria-selected': picked ? 'true' : 'false',
                tabIndex: picked ? 0 : -1,
                onKeyDown: function(e) { diagramTabKeyDown(e, tabIndex); },
                'data-rn-focusable': true,
                onClick: function() { upd('diagramView', t.id); rnAnnounce(t.label + ' diagram'); },
                style: btn({
                  background: picked ? T.accent : T.card,
                  color: picked ? '#06281f' : T.text,
                  border: '1px solid ' + (picked ? T.accent : T.border),
                  padding: '8px 14px',
                  fontSize: 13
                })
              }, t.icon + ' ' + t.label);
            })
          ),
          h('div', { role: 'tabpanel', id: 'renewables-diagram-panel-' + current,
            'aria-labelledby': 'renewables-diagram-tab-' + current, tabIndex: 0,
            style: { padding: 12, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { width: '100%', maxWidth: 920, margin: '0 auto', aspectRatio: '600 / 360' } }, svg),
            h('p', { style: { margin: '12px 4px 0', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, caption)
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
            __alloT('stem.renewables.these_are_simplified_schematics_for_le', 'These are simplified schematics for learning. Real plants have additional safety, control, and efficiency systems (cooling, lubrication, transformers, switchgear, protection relays, SCADA). Use these to build intuition; consult engineering references for design.')),
          (function() { awardBadge('diagrams_viewed', 'Read the Diagrams'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SMART GRID 101 — how a real grid balances supply + demand
      // ─────────────────────────────────────────
      function renderSmartGrid() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌐 Smart Grid 101'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.the_bedrock_fact_about_electricity', 'The bedrock fact about electricity')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.generation_must_equal_consumption_ever', 'Generation must equal consumption every single second.')),
              __alloT('stem.renewables.electricity_in_the_grid_travels_at_the', ' Electrical disturbances propagate quickly, while the bulk network itself stores little usable energy. Inertia, storage, responsive generation, demand response, and protection systems help operators balance supply and demand across multiple timescales.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.for_most_of_grid_history_balancing_mea', 'For most of grid history, "balancing" meant adjusting a few large dispatchable plants. As wind + solar grow, the grid is becoming a million-piece orchestra instead of a string quartet — and '),
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.smart_grid_technology', 'smart-grid technology')),
              __alloT('stem.renewables.is_the_conductor', ' is the conductor.'))
          ),
          SMART_GRID_CONCEPTS.map(function(c) {
            return h('div', { key: c.id, style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.icon),
                h('h3', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, c.title)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.what_it_is', 'What it is: ')), c.what),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.who_runs_it', 'Who runs it: ')), c.who),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.why_it_matters', 'Why it matters: ')), c.why)
            );
          }),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px dashed ' + T.accent, marginTop: 10 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.big_takeaway', '🎯 Big takeaway')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              __alloT('stem.renewables.a_high_renewable_future_depends_just_a', 'A high-renewable future depends just as much on smart-grid software, transmission, and demand-side flexibility as it does on the next solar farm or wind turbine. The "boring" infrastructure pieces are where most of the engineering happens.'))
          ),
          (function() { awardBadge('smart_grid', 'Smart Grid 101 read'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // CAREER PATHWAYS
      // ─────────────────────────────────────────
      function renderCareers() {
        function tagPill(text, color) {
          return h('span', { key: text,
            style: { fontSize: 10, padding: '2px 8px', borderRadius: 999, background: color || T.bg, color: T.text, border: '1px solid ' + T.border, marginRight: 4, marginBottom: 4, display: 'inline-block' } },
            text);
        }
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🧰 Career Pathways'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.renewable_energy_spans_every_level_of_', 'Renewable energy spans every level of training: high-school cert programs, 2-year community college, apprenticeships, 4-year engineering degrees, graduate research, policy work. Salaries from BLS OEWS 2024 medians; growth projections from BLS 2022–2032 outlook. Local Maine pipelines highlighted.'))
          ),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
            CAREER_PATHS.map(function(c) {
              return h('div', { key: c.id, role: 'listitem',
                style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.icon),
                  h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, c.title)),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', marginBottom: 8 } },
                  c.tags.map(function(t) { return tagPill(t); })),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                  h('strong', { style: { color: T.accent } }, __alloT('stem.renewables.salary', '💵 Salary: ')), c.salary),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                  h('strong', { style: { color: T.warm } }, __alloT('stem.renewables.outlook', '📈 Outlook: ')), c.growth),
                h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 4, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.text } }, __alloT('stem.renewables.how_to_get_there', '🎓 How to get there: ')), c.edu),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.text } }, __alloT('stem.renewables.where', '📍 Where: ')), c.where)
              );
            })
          ),
          h('div', { style: { marginTop: 18, padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.maine_training_pipeline', '🌲 Maine training pipeline')),
            MAINE_TRAINING.map(function(m) {
              return h('div', { key: m.name, style: { padding: '8px 0', borderBottom: '1px solid ' + T.border, fontSize: 12 } },
                h('a', { href: m.url, target: '_blank', rel: 'noopener',
                  style: { color: T.accentHi, fontWeight: 700, textDecoration: 'underline' },
                  'aria-label': m.name + ' (opens in new tab)' }, m.name),
                h('div', { style: { fontSize: 11, color: T.muted, marginTop: 3, lineHeight: 1.5 } }, m.what)
              );
            })
          ),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.card, border: '1px dashed ' + T.accent } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, __alloT('stem.renewables.pair_with', '🔗 Pair with')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'AlloFlow ', h('strong', { style: { color: T.text } }, __alloT('stem.renewables.allobot_sage', 'AlloBot Sage')),
              __alloT('stem.renewables.uses_retrieval_practice_combat_to_dril', ' uses retrieval-practice combat to drill terminology + facts from this tool — useful for kids who want career-skill "credits" before transcripts catch up.'))
          ),
          (function() { awardBadge('careers', 'Career-curious'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // HEAT PUMP DEEP DIVE — Maine-relevant, currently scattered across other views
      // ─────────────────────────────────────────
      function renderHeatPump() {
        var hp = HEAT_PUMP_FACTS;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏠 Heat Pumps Deep Dive'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.heat_pumps_don_t_generate_heat_they_mo', 'Heat pumps don\'t generate heat — they MOVE it')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } }, hp.intro)
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.the_cop_magic_trick', '⚡ The COP magic trick')),
            h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 } }, hp.cop)
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.four_flavors_of_heat_pump', 'Four flavors of heat pump')),
            hp.types.map(function(t) {
              return h('div', { key: t.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('h4', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, t.name),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                  h('strong', { style: { color: T.text } }, 'How: '), t.how),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, fontSize: 11, color: T.dim, marginBottom: 6 } },
                  h('div', null, h('strong', { style: { color: T.warm } }, 'COP: '), t.cop),
                  h('div', null, h('strong', { style: { color: T.accent } }, 'Cost: '), t.cost)),
                h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic' } },
                  h('strong', { style: { color: T.text, fontStyle: 'normal' } }, __alloT('stem.renewables.best_for', 'Best for: ')), t.best)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.common_myths', '🧐 Common myths')),
            hp.myths.map(function(m, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: T.warm, marginBottom: 4 } }, '❌ ', h('span', { style: { color: T.text } }, m.myth)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.truth', '✓ Truth: ')), m.truth)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.pairing_with_renewables', '🔌 Pairing with renewables')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              hp.integration.map(function(line, i) { return h('li', { key: i, style: { marginBottom: 4 } }, line); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, __alloT('stem.renewables.maine_the_heat_pump_capital', '🌲 Maine: the heat-pump capital')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              hp.maine.map(function(line, i) { return h('li', { key: i, style: { marginBottom: 4 } }, line); })
            )
          ),
          (function() { awardBadge('heatpump_pro', 'Heat Pump Deep Dive'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // REAL-WORLD PLANT TOUR — 16 famous installations
      // ─────────────────────────────────────────
      function renderPlantTour() {
        var visible = plantFilter === 'all'
          ? WORLD_PLANTS
          : WORLD_PLANTS.filter(function(p) { return p.tag === plantFilter; });
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🗺️ Real-World Plant Tour'),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            __alloT('stem.renewables.16_famous_renewable_installations_acro', '16 famous renewable installations across all 8 sources. Capacities are nameplate (rated max). Filter to compare across one source or browse all.')),
          h('div', { role: 'group', 'aria-label': __alloT('stem.renewables.filter_plants_by_source_type', 'Filter plants by source type'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            PLANT_FILTERS.map(function(f) {
              var active = plantFilter === f.id;
              return h('button', { key: f.id, 'data-rn-focusable': true,
                'aria-pressed': active ? 'true' : 'false',
                onClick: function() { upd('plantFilter', f.id); rnAnnounce('Filtered to ' + f.label); },
                style: btn({
                  background: active ? T.accent : T.card,
                  color: active ? '#06281f' : T.text,
                  border: '1px solid ' + (active ? T.accent : T.border),
                  padding: '6px 12px', fontSize: 12
                })
              }, f.label);
            })
          ),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
            visible.length === 0
              ? [h('div', { key: 'empty', style: { padding: 24, color: T.dim, fontStyle: 'italic', textAlign: 'center', gridColumn: '1 / -1' } }, __alloT('stem.renewables.no_plants_in_this_filter', 'No plants in this filter.'))]
              : visible.map(function(p) {
                  return h('div', { key: p.id, role: 'listitem',
                    style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.icon),
                      h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, p.name)),
                    h('div', { style: { fontSize: 11, color: T.warm, fontFamily: 'monospace', marginBottom: 8 } }, p.where),
                    h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, p.story)
                  );
                })
          ),
          h('div', { style: { marginTop: 14, fontSize: 11, color: T.dim, textAlign: 'center' } },
            'Showing ' + visible.length + ' of ' + WORLD_PLANTS.length + ' plants. Sources: IEA + IRENA project databases, IEEE biographies, plant operator filings.'),
          (function() { if (Object.keys(modulesVisited).length >= 12) awardBadge('world_traveler', 'World Plant Tour'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // HYDROGEN ECONOMY
      // ─────────────────────────────────────────
      function renderHydrogen() {
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('💨 Hydrogen Economy'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.hydrogen_101', 'Hydrogen 101')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.hydrogen_h_is_an_energy', 'Hydrogen (H₂) is an energy '),
              h('strong', { style: { color: T.text } }, 'carrier'),
              __alloT('stem.renewables.not_an_energy', ', not an energy '),
              h('strong', { style: { color: T.text } }, 'source'),
              __alloT('stem.renewables.you_spend_energy_to_make_it_you_get_en', '. You spend energy to make it; you get energy back when you burn it or run it through a fuel cell. Whether that\'s clean depends entirely on HOW you made it — hence the color codes.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.critical_fact', 'Critical fact: ')),
              __alloT('stem.renewables.95_of_hydrogen_produced_today_is_gray_', '~95% of hydrogen produced today is "gray" — made from natural gas with NO carbon capture. The "hydrogen economy" pitch usually means switching to GREEN hydrogen, which is a much smaller current reality.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.the_color_taxonomy', '🎨 The color taxonomy')),
            HYDROGEN_COLORS.map(function(c) {
              return h('div', { key: c.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.emoji),
                  h('strong', { style: { color: T.accentHi, fontSize: 14 } }, c.label + ' hydrogen')),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                  h('strong', { style: { color: T.text } }, 'How: '), c.how),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 11, color: T.dim, marginBottom: 4 } },
                  h('div', null, h('strong', { style: { color: T.warm } }, 'CO₂: '), c.co2),
                  h('div', null, h('strong', { style: { color: T.accent } }, 'Cost: '), c.cost)),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontStyle: 'italic', lineHeight: 1.5 } },
                  h('strong', null, __alloT('stem.renewables.verdict', '⚖ Verdict: ')), c.verdict)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.where_hydrogen_actually_makes_sense', '🎯 Where hydrogen actually makes sense')),
            HYDROGEN_USES.map(function(u) {
              return h('div', { key: u.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, u.icon),
                  h('strong', { style: { color: T.text, fontSize: 14, flex: 1 } }, u.name),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 8px', borderRadius: 999, background: T.bg, border: '1px solid ' + T.border } }, u.pct)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 3 } }, u.what),
                h('div', { style: { fontSize: 11, color: T.accentHi, fontStyle: 'italic' } },
                  h('strong', null, '⚖ '), u.verdict)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.five_things_worth_remembering', '💡 Five things worth remembering')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              HYDROGEN_KEYS.map(function(k, i) { return h('li', { key: i, style: { marginBottom: 4 } }, k); })
            )
          ),
          (function() { awardBadge('hydrogen_pro', 'Hydrogen 101'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // CLIMATE JUSTICE LENS
      // ─────────────────────────────────────────
      function renderJustice() {
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('⚖️ Climate Justice'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.the_energy_transition_is_technical_and', 'The energy transition is technical AND political')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.every_other_module_in_this_lab_focuses', 'Every other module in this lab focuses on the engineering — the physics of how each source generates electricity. This page asks the harder questions: '),
              h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.who_pays_who_profits_who_loses_who_dec', 'who pays, who profits, who loses, who decides.')),
              __alloT('stem.renewables.these_outcomes_are_not_natural_consequ', ' These outcomes are not natural consequences of physics. They are choices, made by people, with very different stakes for different communities.')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.the_transition_can_be_designed_to_redu', 'The transition CAN be designed to reduce the historical injustices of the fossil economy. Or it can repeat them. Both paths are technically possible.'))
          ),
          JUSTICE_TOPICS.map(function(t) {
            return h('div', { key: t.id, style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, t.icon),
                h('h3', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, t.title)),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.what_it_is_2', '⓵ What it is: ')), t.what),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.renewables.who_is_affected', '⓶ Who is affected: ')), t.who),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.accent } }, __alloT('stem.renewables.what_action_looks_like', '⓷ What action looks like: ')), t.action),
              h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                'Source: ', t.source)
            );
          }),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.accent, marginTop: 6 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.cross_link_this_is_connected_to', '🌐 Cross-link: this is connected to')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.climate_explorer_2', 'Climate Explorer')), __alloT('stem.renewables.the_climate_justice_map_and_the_design', ' — the climate-justice map and the design-a-renewable-mix sim go deeper on policy + impact.')),
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.civic_action_rights_dissent', 'Civic Action / Rights & Dissent')), __alloT('stem.renewables.when_these_issues_escalate_to_policy_c', ' — when these issues escalate to policy, civic engagement is how decisions get made.')),
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.fire_ecology', 'Fire Ecology')), __alloT('stem.renewables.indigenous_fire_stewardship_is_a_model', ' — Indigenous fire stewardship is a model for how Indigenous-led environmental management actually works.'))
            )
          ),
          (function() { awardBadge('justice_lens', 'Climate Justice lens'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // TEACHER GUIDE
      // ─────────────────────────────────────────
      function renderTeacher() {
        return h('div', { style: { padding: 20, maxWidth: '62.5rem', width: '100%', margin: '0 auto', color: T.text } },
          backBar('🎓 Teacher Guide'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.this_is_a_resource_page_for_educators_', 'This is a resource page for educators. NGSS alignment per source, discussion prompts, hands-on activities, and pacing suggestions for unit planning.'))
          ),
          // NGSS alignment table
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.ngss_standards_alignment', '📐 NGSS standards alignment')),
            h('table', { 'aria-label': __alloT('stem.renewables.ngss_standards_alignment_per_module', 'NGSS standards alignment per module'),
              style: { width: '100%', minWidth: 540, borderCollapse: 'collapse', fontSize: 12 } },
              h('thead', null,
                h('tr', { style: { background: T.cardAlt } },
                  h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi, borderBottom: '2px solid ' + T.border } }, __alloT('stem.renewables.module', 'Module')),
                  h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi, borderBottom: '2px solid ' + T.border } }, __alloT('stem.renewables.standards', 'Standards')))),
              h('tbody', null,
                NGSS_ALIGNMENT.map(function(r, i) {
                  return h('tr', { key: i, style: { background: i % 2 === 0 ? T.cardAlt : T.card, borderBottom: '1px solid ' + T.border } },
                    h('td', { style: { padding: '8px 10px', color: T.text, fontWeight: 600 } }, r.source),
                    h('td', { style: { padding: '8px 10px', color: T.muted, fontFamily: 'monospace', fontSize: 11 } }, r.standards));
                })
              )
            )
          ),
          // Discussion prompts
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.discussion_prompts', '💬 Discussion prompts')),
            DISCUSSION_PROMPTS.map(function(p) {
              return h('div', { key: p.source, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, p.source),
                h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
                  p.prompts.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })
                )
              );
            })
          ),
          // Hands-on activities
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.hands_on_activities', '🛠️ Hands-on activities')),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
              HANDS_ON_ACTIVITIES.map(function(a) {
                return h('div', { key: a.id, role: 'listitem',
                  style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                    h('strong', { style: { color: T.accentHi, fontSize: 13 } }, a.name),
                    h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border } }, 'Gr ' + a.grade)),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, a.what),
                  a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                    style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                    'aria-label': a.name + ' resource link (opens in new tab)' }, __alloT('stem.renewables.open_resource', '→ Open resource')));
              })
            )
          ),
          // Pacing suggestions
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.suggested_pacing', '🗓️ Suggested pacing')),
            TEACHER_PACING.map(function(p) {
              return h('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('strong', { style: { color: T.accentHi, fontSize: 13 } }, p.label),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 4 } }, p.sequence)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.renewables.more_teacher_resources', '📚 More teacher resources')),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, h('a', { href: 'https://www.need.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, __alloT('stem.renewables.need_project', 'NEED Project')), __alloT('stem.renewables.free_k_12_energy_curriculum_teacher_pd', ' — free K-12 energy curriculum + teacher PD')),
              h('li', null, h('a', { href: 'https://www.kidwind.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, 'KidWind'), __alloT('stem.renewables.turbine_kits_lesson_plans_annual_chall', ' — turbine kits, lesson plans, annual challenge competition')),
              h('li', null, h('a', { href: 'https://www.pbslearningmedia.org', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, __alloT('stem.renewables.pbs_learningmedia_energy', 'PBS LearningMedia — Energy')), __alloT('stem.renewables.standards_aligned_video_activities', ' — standards-aligned video + activities')),
              h('li', null, h('a', { href: 'https://www.energy.gov/eere/education/energy-literacy-essential-principles-energy-education', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, __alloT('stem.renewables.doe_energy_literacy', 'DOE Energy Literacy')), __alloT('stem.renewables.7_essential_principles_framework', ' — 7 essential principles framework')),
              h('li', null, h('a', { href: 'https://www.maine.gov/education/learning/standards', target: '_blank', rel: 'noopener', style: { color: T.link, textDecoration: 'underline' } }, __alloT('stem.renewables.maine_learning_results', 'Maine Learning Results')), __alloT('stem.renewables.maine_s_state_science_standards_mlr_ad', ' — Maine\'s state science standards (MLR adopt NGSS as a base)'))
            )
          ),
          (function() { awardBadge('teacher_guide', 'Teacher Guide read'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // TAKE ACTION — concrete agency-building
      // ─────────────────────────────────────────
      function renderTakeAction() {
        function actionList(title, banner, items) {
          return h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 } },
              h('h3', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, title),
              h('div', { style: { fontSize: 11, color: T.dim } }, items.length + ' actions')),
            banner && h('p', { style: { margin: '4px 0 10px', fontSize: 11, color: T.dim, fontStyle: 'italic' } }, banner),
            items.map(function(a) {
              return h('div', { key: a.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, a.icon),
                  h('strong', { style: { color: T.text, fontSize: 13, flex: 1 } }, a.what)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                  h('strong', { style: { color: T.text } }, __alloT('stem.renewables.how', '⓵ How: ')), a.how),
                h('div', { style: { fontSize: 12, color: T.accentHi, lineHeight: 1.55, marginBottom: a.url ? 4 : 0 } },
                  h('strong', null, __alloT('stem.renewables.why_it_matters_2', '⓶ Why it matters: ')), a.impact),
                a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                  style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                  'aria-label': a.what + ' — open resource (new tab)' }, __alloT('stem.renewables.open_resource_2', '→ Open resource'))
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: '62.5rem', width: '100%', margin: '0 auto', color: T.text } },
          backBar('🌱 Take Action'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.from_knowledge_to_agency', 'From knowledge to agency')),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.knowing_how_solar_panels_work_doesn_t_', 'Knowing how solar panels work doesn\'t change anything by itself. The transition happens when millions of people make small decisions in the same direction. Here are concrete actions at four scales — pick what fits your time and energy.')),
            h('p', { style: { margin: 0, color: T.warm, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } }, ACTION_BANNERS.starter)
          ),
          actionList('🏠 At home', 'Where you live, every day. Smallest unit; quickest feedback.', TAKE_ACTION.home),
          actionList('🏫 At school', 'School is a system you can study + influence as a student.', TAKE_ACTION.school),
          actionList('🌲 In your community', null, TAKE_ACTION.community),
          actionList('🏛️ In civic life', 'Public-comment periods + ballots are the low-traffic ways most decisions get made.', TAKE_ACTION.civic),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.accent } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, __alloT('stem.renewables.maine_students_a_starter_combo', '🎯 Maine students: a starter combo')),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              __alloT('stem.renewables.pick_one_from_each_scale', 'Pick ONE from each scale: '),
              h('strong', { style: { color: T.text } }, 'home'), __alloT('stem.renewables.swap_to_leds_smart_strips', ': swap to LEDs + smart strips. '),
              h('strong', { style: { color: T.text } }, 'school'), __alloT('stem.renewables.join_or_start_the_environment_club_pro', ': join (or start) the environment club + propose a Kill-A-Watt audit. '),
              h('strong', { style: { color: T.text } }, 'community'), __alloT('stem.renewables.your_family_books_an_efficiency_maine_', ': your family books an Efficiency Maine assessment. '),
              h('strong', { style: { color: T.text } }, 'civic'), __alloT('stem.renewables.pick_one_maine_puc_docket_per_semester', ': pick ONE Maine PUC docket per semester and file a 1-paragraph comment. '),
              __alloT('stem.renewables.cumulative_effect_over_4_years_a_measu', 'Cumulative effect over 4 years: a measurable carbon footprint, a transcript-worthy STEM track, and a civic muscle most adults never build.'))
          ),
          h('div', { style: { marginTop: 10, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.renewables.want_depth_on_civic_action', '🔗 Want depth on civic action?')),
            ' AlloFlow ',
            h('strong', { style: { color: T.text } }, __alloT('stem.renewables.civic_action_rights_dissent_2', 'Civic Action / Rights & Dissent')),
            __alloT('stem.renewables.goes_deeper_on_how_to_write_effective_', ' goes deeper on how to write effective public comments, plan a school-board ask, run a campaign, and what counts as protected speech vs. trespass. Useful before your first PUC filing or board appearance.')),
          (function() { awardBadge('take_action', 'Take Action'); return null; })(),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // PRINT PACK — generate a print-ready window of selected content
      // ─────────────────────────────────────────
      function renderPrintPack() {
        var anySelected = false;
        Object.keys(printSel).forEach(function(k) { if (printSel[k]) anySelected = true; });

        function generatePack() {
          if (!anySelected) {
            addToast('Pick at least one section to print.');
            return;
          }
          var html = buildPrintPackHtml(printSel);
          // Open in a new tab; if blocked (popup blocker), fall back to a data URL.
          var win = window.open('', '_blank');
          if (win && win.document) {
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
            rnAnnounce(__alloT('stem.renewables.sr_print_pack_opened_in_a_new_tab_use_your_browser_s', 'Print pack opened in a new tab. Use your browser\'s File then Print menu.'));
          } else {
            // Popup blocker fallback: copy to clipboard.
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(html);
                addToast('Pop-up blocked — HTML copied to clipboard. Paste into a doc + print.');
              } else {
                addToast('Pop-up blocked. Allow pop-ups for this site to use Print Pack.');
              }
            } catch (e) {
              addToast('Could not open Print Pack. Allow pop-ups for this site.');
            }
          }
          awardBadge('print_pack', 'Print Pack generated');
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🖨 Print Pack'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.renewables.build_a_printable_handout', 'Build a printable handout')),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              __alloT('stem.renewables.pick_what_you_want_included_the_genera', 'Pick what you want included. The "Generate" button opens a clean printable HTML view in a new browser tab — use your browser\'s '),
              h('strong', { style: { color: T.text } }, __alloT('stem.renewables.file_print', 'File → Print')),
              __alloT('stem.renewables.menu_to_print_or_save_as_pdf_useful_fo', ' menu to print or save as PDF. Useful for sub-day worksheets, lesson handouts, or quiz / answer-key bundles.'))
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, __alloT('stem.renewables.sections_to_include', '✅ Sections to include')),
            h('div', { role: 'group', 'aria-label': __alloT('stem.renewables.sections_to_include_in_print_pack', 'Sections to include in print pack') },
              PRINT_OPTIONS.map(function(o) {
                var checked = !!printSel[o.kind];
                return h('label', { key: o.id, htmlFor: 'print-' + o.id,
                  style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: T.text } },
                  h('input', { id: 'print-' + o.id, 'data-rn-focusable': true, type: 'checkbox',
                    checked: checked,
                    onChange: function(e) {
                      var next = Object.assign({}, printSel);
                      next[o.kind] = !!e.target.checked;
                      upd('printSel', next);
                    },
                    style: { marginTop: 3, accentColor: T.accent, cursor: 'pointer' }
                  }),
                  h('span', null, o.label));
              })
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
              h('button', { 'data-rn-focusable': true,
                onClick: function() {
                  var allOn = {};
                  PRINT_OPTIONS.forEach(function(o) { allOn[o.kind] = true; });
                  upd('printSel', allOn);
                  rnAnnounce(__alloT('stem.renewables.sr_all_sections_selected', 'All sections selected'));
                },
                style: btn({ padding: '6px 12px', fontSize: 12 })
              }, __alloT('stem.renewables.select_all', 'Select all')),
              h('button', { 'data-rn-focusable': true,
                onClick: function() {
                  var allOff = {};
                  PRINT_OPTIONS.forEach(function(o) { allOff[o.kind] = false; });
                  upd('printSel', allOff);
                  rnAnnounce(__alloT('stem.renewables.sr_all_sections_cleared', 'All sections cleared'));
                },
                style: btn({ padding: '6px 12px', fontSize: 12 })
              }, __alloT('stem.renewables.clear_all', 'Clear all'))
            )
          ),
          h('button', { 'data-rn-focusable': true,
            'aria-label': __alloT('stem.renewables.generate_print_pack_with_selected_sect', 'Generate print pack with selected sections'),
            disabled: !anySelected,
            onClick: generatePack,
            style: btnPrimary({ width: '100%', padding: '12px 16px', fontSize: 14, opacity: anySelected ? 1 : 0.6 })
          }, __alloT('stem.renewables.generate_print_pack', '🖨 Generate Print Pack')),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 12, color: T.dim, lineHeight: 1.6 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 4 } }, __alloT('stem.renewables.print_pack_tips', 'Print pack tips')),
            h('ul', { style: { margin: 0, paddingLeft: 18 } },
              h('li', null, __alloT('stem.renewables.for_a_sub_day_handout_pick_source_modu', 'For a sub-day handout: pick "Source-module key facts" + "Comparison table" + "Quiz" — fits on 4–6 pages.')),
              h('li', null, __alloT('stem.renewables.for_a_unit_kickoff_add_ngss_alignment_', 'For a unit kickoff: add "NGSS alignment" + "Activities" — gives co-teachers a quick orientation.')),
              h('li', null, __alloT('stem.renewables.for_a_review_session_pick_just_quiz_an', 'For a review session: pick just "Quiz" + "Answer key" — print double-sided.')),
              h('li', null, __alloT('stem.renewables.if_your_pop_up_blocker_prevents_the_ne', 'If your pop-up blocker prevents the new tab, the HTML auto-copies to your clipboard — paste into a Google Doc + print from there.'))
            )
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // SOURCE MASTERY VIEW — cross-attempt log of quiz questions correctly
      // answered, rolled up into the eight source-module clusters.
      // Mirrors the BirdLab life list / OpticsLab AP-mastery pattern.
      // ─────────────────────────────────────────
      function renderRenewablesMastery() {
        var mastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
        var totalQ = QUIZ.length;
        var masteredQs = QUIZ.filter(function (q) { return !!mastery[q.id]; });
        var masteredCount = masteredQs.length;
        var pctOverall = totalQ > 0 ? Math.round((masteredCount / totalQ) * 100) : 0;
        // Map quiz icon → source cluster. The 18 questions cluster cleanly
        // by their icon since each one is anchored to a specific source.
        var ICON_TO_CLUSTER = {
          '☀️': 'solarPv',  '🌬️': 'wind',     '🌊': 'hydro',     '🌋': 'geothermal',
          '🔆': 'solarThermal', '🌀': 'waveTidal', '🌾': 'biomass',  '🔋': 'storage',
          '🦆': 'mix',      '🌐': 'mix',     '💨': 'hydrogen',  '🏠': 'homePayback', '⚖️': 'justice'
        };
        var CLUSTERS = [
          { id: 'solarPv',      label: __alloT('stem.renewables.solar_pv_4', '☀️ Solar PV'),          color: '#fbbf24' },
          { id: 'wind',         label: __alloT('stem.renewables.wind_5', '🌬️ Wind'),              color: '#06b6d4' },
          { id: 'hydro',        label: __alloT('stem.renewables.hydropower_3', '🌊 Hydropower'),        color: '#0ea5e9' },
          { id: 'geothermal',   label: __alloT('stem.renewables.geothermal_4', '🌋 Geothermal'),        color: '#dc2626' },
          { id: 'solarThermal', label: __alloT('stem.renewables.solar_thermal', '🔆 Solar Thermal'),     color: '#f59e0b' },
          { id: 'waveTidal',    label: __alloT('stem.renewables.wave_tidal_4', '🌀 Wave & Tidal'),      color: '#3b82f6' },
          { id: 'biomass',      label: __alloT('stem.renewables.biomass_biogas_3', '🌾 Biomass & Biogas'),  color: '#84cc16' },
          { id: 'storage',      label: __alloT('stem.renewables.storage_2', '🔋 Storage'),           color: '#a855f7' },
          { id: 'mix',          label: __alloT('stem.renewables.grid_mix', '🌐 Grid + Mix'),        color: '#22c55e' },
          { id: 'hydrogen',     label: __alloT('stem.renewables.hydrogen', '💨 Hydrogen'),          color: '#0891b2' },
          { id: 'homePayback',  label: __alloT('stem.renewables.heat_pumps_home', '🏠 Heat pumps + home'), color: '#10b981' },
          { id: 'justice',      label: __alloT('stem.renewables.climate_justice_2', '⚖️ Climate justice'),  color: '#8b5cf6' }
        ];
        function fmtDate(iso) {
          if (!iso) return '';
          try {
            var dd = new Date(iso);
            return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch (e) { return iso.substring(0, 10); }
        }
        var clusterStats = CLUSTERS.map(function (c) {
          var qs = QUIZ.filter(function (q) { return ICON_TO_CLUSTER[q.icon] === c.id; });
          var done = qs.filter(function (q) { return !!mastery[q.id]; });
          return { cluster: c, questions: qs, doneCount: done.length };
        }).filter(function (cs) { return cs.questions.length > 0; });
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🏅 Energy Mastery'),
          // Hero
          h('div', { style: { padding: 18, borderRadius: 14, marginBottom: 14,
                              background: 'linear-gradient(135deg, ' + T.cardAlt + ' 0%, ' + T.card + ' 100%)',
                              border: '2px solid ' + T.accent } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
              h('div', { style: { textAlign: 'center', minWidth: 110 } },
                h('div', { style: { fontSize: 38, fontWeight: 900, color: T.accentHi, lineHeight: 1 } }, masteredCount + ' / ' + totalQ),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, __alloT('stem.renewables.quiz_questions_mastered', 'Quiz questions mastered'))
              ),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🏅'),
                  h('h3', { style: { margin: 0, fontSize: 17, color: T.text, fontWeight: 800 } }, __alloT('stem.renewables.energy_source_mastery_2', 'Energy Source Mastery'))
                ),
                h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                  __alloT('stem.renewables.every_quiz_question_you_nail_at_least_', 'Every quiz question you nail at least once locks in here permanently. Quiz attempts give you per-attempt scores; this view shows what you have demonstrated across every attempt — by source.')
                ),
                h('div', { style: { height: 8, background: T.cardAlt, borderRadius: 4, overflow: 'hidden' }, 'aria-hidden': 'true' },
                  h('div', { style: { width: pctOverall + '%', height: '100%', background: T.accent, transition: 'width 0.3s' } })
                ),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontWeight: 700 } },
                  pctOverall === 100 ? '🏆 Full coverage — every source mastered'
                  : masteredCount === 0 ? 'Take the 18-question quiz to start building mastery'
                  : pctOverall + '% complete · ' + (totalQ - masteredCount) + ' to go'
                )
              )
            )
          ),
          // Per-cluster cards
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 } },
            clusterStats.map(function (cs) {
              var pct = cs.questions.length > 0 ? Math.round((cs.doneCount / cs.questions.length) * 100) : 0;
              var statusLabel = cs.doneCount === 0 ? 'Untouched'
                : cs.doneCount === cs.questions.length ? '✓ All mastered'
                : cs.doneCount + ' / ' + cs.questions.length;
              var statusColor = cs.doneCount === 0 ? T.dim
                : cs.doneCount === cs.questions.length ? T.ok
                : cs.cluster.color;
              return h('div', { key: cs.cluster.id,
                style: { padding: 12, borderRadius: 12, background: T.card,
                         border: '1px solid ' + (cs.doneCount > 0 ? cs.cluster.color + 'aa' : T.border) }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: T.text, flex: 1 } }, cs.cluster.label),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: statusColor } }, statusLabel)
                ),
                h('div', { style: { height: 5, background: T.cardAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }, 'aria-hidden': 'true' },
                  h('div', { style: { width: pct + '%', height: '100%', background: cs.cluster.color, transition: 'width 0.3s' } })
                ),
                h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
                  cs.questions.map(function (q) {
                    var entry = mastery[q.id];
                    var done = !!entry;
                    return h('li', { key: q.id,
                      style: { display: 'flex', alignItems: 'flex-start', gap: 6,
                               fontSize: 11, color: done ? T.muted : T.dim, lineHeight: 1.45 }
                    },
                      h('span', { 'aria-hidden': 'true', style: { color: done ? T.ok : T.dim, fontWeight: 700, flexShrink: 0, marginTop: 1 } }, done ? '✓' : '○'),
                      h('span', { style: { flex: 1, minWidth: 0 } },
                        q.stem.length > 80 ? q.stem.substring(0, 77) + '…' : q.stem,
                        done && entry.firstCorrectAt && h('span', { style: { color: T.dim, fontSize: 10, marginLeft: 6, fontStyle: 'italic' } }, '· ' + fmtDate(entry.firstCorrectAt))
                      )
                    );
                  })
                )
              );
            })
          ),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('button', { 'data-rn-focusable': true,
              onClick: function () { upd({ view: 'quiz', quizState: { idx: 0, score: 0, answered: false, lastChoice: null } }); },
              style: btnPrimary({ width: '100%' })
            }, masteredCount === 0 ? '📝 Take the 18-question quiz to start'
              : masteredCount === totalQ ? '🏆 All mastered — re-attempt to reinforce'
              : '📝 Take another quiz attempt — fill in gaps')
          ),
          footer()
        );
      }

      // First-correct celebration overlay (renders on top of any view).
      function renCelebOverlay() {
        if (!renCeleb) return null;
        return h('div', {
          role: 'status', 'aria-live': 'assertive',
          style: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                   zIndex: 9999, pointerEvents: 'none',
                   animation: 'renewables-celeb-rise 3.5s ease-out forwards', maxWidth: 480 }
        },
          h('div', { style: { background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #6366f1 100%)',
                              color: '#fff', padding: '14px 22px', borderRadius: 16,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', border: '4px solid #fff',
                              display: 'flex', alignItems: 'center', gap: 12 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, renCeleb.icon),
            h('div', null,
              h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.95 } }, __alloT('stem.renewables.concept_locked_in', 'Concept locked in')),
              h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3 } }, renCeleb.stem.length > 90 ? (renCeleb.stem.substring(0, 87) + '…') : renCeleb.stem),
              h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, renCeleb.total + ' / ' + QUIZ.length + ' questions mastered')
            )
          )
        );
      }

      // === H7b'' inquiry widget: grid balance discovery ===
      function renderGridBalance() {
        var iq = d.gridHunt || { gen: 1000, demand: 1000, storage: 200, duration: 2, soc: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { upd('gridHunt', Object.assign({}, iq, patch)); }
        var imbalance = iq.gen - iq.demand;
        var storageDuration = Math.max(0.5, iq.duration || 2);
        var storageSocPct = iq.soc != null ? iq.soc : 50;
        var storagePowerMW = iq.storage / storageDuration;
        var storageCanAct = imbalance < 0 ? storageSocPct > 0 : imbalance > 0 ? storageSocPct < 100 : true;
        var bufferCapacity = storageCanAct ? storagePowerMW : 0;
        var absImbalance = Math.abs(imbalance);
        var bufferedImbalance = Math.max(0, absImbalance - bufferCapacity);
        var state;
        if (bufferedImbalance < 50) state = 'balanced';
        else if (imbalance < 0) state = 'blackout';
        else state = 'curtailed';
        var stateMeta = {
          balanced:  { label: __alloT('stem.renewables.grid_balanced', '🟢 Within modeled balance band'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.renewables.supply_meets_demand_within_buffer_tole', 'Residual imbalance is within this activity\'s arbitrary 50 MW band; no frequency is calculated.') },
          blackout:  { label: __alloT('stem.renewables.brownout_blackout_risk', '🔴 Modeled demand shortage'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.renewables.demand_exceeds_generation_storage_disc', 'Modeled demand shortage remains after the available storage power is applied.') },
          curtailed: { label: __alloT('stem.renewables.excess_generation_curtailed', '🟡 Modeled supply surplus'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.renewables.generation_exceeds_demand_storage_abso', 'Modeled supply surplus remains after available charging power; real operators may curtail, export, or shift demand.') }
        }[state];
        function logObs() {
          setIQ({ log: (iq.log || []).concat([{ g: iq.gen, d: iq.demand, s: iq.storage, p: Math.round(storagePowerMW), soc: storageSocPct, st: state }]).slice(-8) });
        }
        return h('div', { className: 'p-4 rounded-xl bg-white border border-emerald-200 shadow-sm' },
          h('h3', { className: 'text-sm font-black text-emerald-700 mb-1' }, __alloT('stem.renewables.grid_balance_discovery_2', '⚡ Grid balance discovery')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            'Compare generation and demand with a simplified storage system. Energy capacity (MWh), duration (h), and state of charge determine available power (MW). The three labels are classroom categories, not grid forecasts.'),
          h('div', { className: 'mb-3 p-3 rounded-lg text-center', role: 'status', 'aria-live': 'polite', style: { background: stateMeta.bg, border: '2px solid ' + stateMeta.border } },
            h('div', { className: 'text-lg font-black', style: { color: stateMeta.color } }, stateMeta.label),
            h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1' }, stateMeta.desc)
          ),
          h('div', { className: 'mb-3 p-2 rounded bg-slate-50 border border-slate-200 text-[0.6875rem] text-slate-700' },
            h('strong', null, 'Storage rating: '), Math.round(storagePowerMW) + ' MW = ' + iq.storage + ' MWh / ' + storageDuration + ' h. ' +
            'Current stored energy: ' + (iq.storage * storageSocPct / 100).toFixed(1) + ' MWh at ' + storageSocPct + '% state of charge.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-5 gap-3 mb-3' },
            [
              { key: 'gen',      label: __alloT('stem.renewables.generation_mw', 'Generation (MW)'), val: iq.gen, min: 0, max: 2500, step: 50 },
              { key: 'demand',   label: __alloT('stem.renewables.demand_mw', 'Demand (MW)'), val: iq.demand, min: 0, max: 2500, step: 50 },
              { key: 'storage',  label: 'Storage energy capacity (MWh)', val: iq.storage, min: 0, max: 800, step: 25 },
              { key: 'duration', label: 'Storage duration at rated power (h)', val: storageDuration, min: 0.5, max: 8, step: 0.5 },
              { key: 'soc',      label: 'State of charge (%)', val: storageSocPct, min: 0, max: 100, step: 5 }
            ].map(function(s) {
              return h('div', { key: s.key },
                h('label', { htmlFor: 'gb-' + s.key, className: 'block text-[0.6875rem] font-bold text-slate-700 mb-1' },
                  s.label + ': ', h('span', { className: 'font-mono text-emerald-700' }, s.val)),
                h('input', { id: 'gb-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                  onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                  className: 'w-full', 'aria-label': s.label }));
            })
          ),
          h('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
            h('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.renewables.log', '📋 Log')),
            h('button', { onClick: function() { setIQ({ gen: 1000, demand: 1000, storage: 200, duration: 2, soc: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
              className: 'px-2 py-1 rounded bg-white hover:bg-slate-50 text-[0.6875rem] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.renewables.reset_2', '↺ Reset')),
            (iq.log || []).length > 0 && h('span', { className: 'text-[0.625rem] text-slate-500 italic' }, (iq.log || []).length + ' logged')
          ),
          (iq.log || []).length > 0 && h('table', { className: 'text-[0.625rem] w-full border-collapse text-slate-700 mb-3', 'aria-label': __alloT('stem.renewables.a11y_logged_grid_balance_comparisons', 'Logged grid balance comparisons') },
            h('thead', null, h('tr', { className: 'bg-slate-100' },
              ['gen MW', 'demand MW', 'energy MWh', 'power MW', 'SoC %', 'state'].map(function(c, i) { return h('th', { key: 'h' + i, scope: 'col', className: 'px-1 border border-slate-200 text-left' }, c); }))),
            h('tbody', null, iq.log.map(function(o, idx) {
              return h('tr', { key: 'lr' + idx },
                h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.g),
                h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.d),
                h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.s),
                h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.p != null ? o.p : '—'),
                h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.soc != null ? o.soc : '—'),
                h('td', { className: 'px-1 border border-slate-200' }, o.st));
            }))
          ),
          h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
            'aria-label': __alloT('stem.renewables.hypothesis_input', 'Renewable-grid hypothesis'), placeholder: __alloT('stem.renewables.hypothesis_free_text_how_much_storage_', 'Hypothesis: How do energy capacity, duration, and state of charge limit the power available for a mismatch?'),
            className: 'w-full text-[0.75rem] border border-slate-300 rounded p-2 font-mono leading-snug mb-3', rows: 3 }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
            className: 'px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-[0.6875rem] font-bold text-amber-800 border border-amber-300 mb-3' },
            __alloT('stem.renewables.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
          iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed mb-3' },
            h('ul', { className: 'list-disc pl-5 space-y-1' },
              h('li', null, __alloT('stem.renewables.hold_two_sliders_steady_move_the_third', 'Hold two sliders steady. Move the third. Watch.')),
              h('li', null, __alloT('stem.renewables.find_two_settings_that_produce_the_sam', 'Find two settings that produce the same state. What do they share?')),
              h('li', null, __alloT('stem.renewables.renewables_are_intermittent_investigat', 'Wind and solar output are variable. Investigate how storage power and energy ratings affect the modeled band.')),
              h('li', null, __alloT('stem.renewables.real_grids_run_at_1_frequency_why_migh', 'Real grids operate near a nominal frequency within tight reliability limits. What controls help keep them there?')))),
          h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
            h('label', { className: 'flex items-center gap-2 text-[0.75rem] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
              __alloT('stem.renewables.i_think_i_understand_let_me_explain', 'I think I understand — let me explain')),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
              'aria-label': __alloT('stem.renewables.explanation_input', 'Renewable-grid explanation'), placeholder: __alloT('stem.renewables.explain_how_generation_demand_and_stor', 'Explain how generation, demand, and storage interact to determine grid state.'),
              className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[0.625rem] italic text-slate-600' },
            __alloT('stem.renewables.design_note_discrete_3_state_outcome_n', 'Model limit: one-instant classroom classifier with an arbitrary 50 MW tolerance. It omits network constraints, reserves, ramp rates, losses, state evolution, market dispatch, protection systems, and actual frequency dynamics; labels are prompts, not predictions.'))
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER — wraps view in a fragment with the celebration overlay.
      // ─────────────────────────────────────────
      var viewBody;
      switch (view) {
        case 'energy3d': viewBody = h(RenewablesEnergyLab,{ctx:ctx,theme:T,state:d.energyLab,onChange:function(next){upd('energyLab',next);},onBack:function(){upd('view','menu');},onLesson:function(id){upd('view',id);},onTransition:function(){upd('view','transition');},onMicrogrid:function(){var workbenches=Object.assign({},d.energyLab),source=workbenches.selected==='storage'?'solarPv':rnEnergySpec(workbenches.selected).id;if(!workbenches.microgrid)workbenches.microgrid={source:source,sourceSettings:workbenches.settings&&workbenches.settings[source],profileId:workbenches.scenarios&&workbenches.scenarios[source]&&workbenches.scenarios[source].profileId,battery:workbenches.settings&&workbenches.settings.storage};updMulti({view:'microgrid',energyLab:workbenches});}}); break;
        case 'microgrid': viewBody=h(RenewablesMicrogridLab,{ctx:ctx,theme:T,state:d.energyLab&&d.energyLab.microgrid,workbenches:d.energyLab||{},onChange:function(next){upd('energyLab',Object.assign({},d.energyLab,{microgrid:next}));},onBack:function(){upd('view','energy3d');},onLibrary:function(){upd('view','menu');},onSource:openEnergyLab}); break;
        case 'transition': viewBody = h(RenewablesTransition, { ctx: ctx, theme: T, state: d.transitionLab, onChange: function(next) { upd('transitionLab', next); }, onBack: function() { upd('view', 'menu'); } }); break;
        case 'solarPv':      viewBody = renderSolarPv(); break;
        case 'wind':         viewBody = renderWind(); break;
        case 'hydro':        viewBody = renderHydro(); break;
        case 'geothermal':   viewBody = renderGeo(); break;
        case 'solarThermal': viewBody = renderSolarThermal(); break;
        case 'waveTidal':    viewBody = renderWaveTidal(); break;
        case 'biomass':      viewBody = renderBiomass(); break;
        case 'storage':      viewBody = renderStorage(); break;
        case 'compare':      viewBody = renderCompare(); break;
        case 'mix':          viewBody = renderMix(); break;
        case 'homePayback':  viewBody = renderHomePayback(); break;
        case 'installerCo':  viewBody = renderInstallerCo(); break;
        case 'heatPump':     viewBody = renderHeatPump(); break;
        case 'plants':       viewBody = renderPlantTour(); break;
        case 'hydrogen':     viewBody = renderHydrogen(); break;
        case 'justice':      viewBody = renderJustice(); break;
        case 'teacher':      viewBody = renderTeacher(); break;
        case 'takeAction':   viewBody = renderTakeAction(); break;
        case 'printPack':    viewBody = renderPrintPack(); break;
        case 'glossary':     viewBody = renderGlossary(); break;
        case 'myths':        viewBody = renderMyths(); break;
        case 'nuclear':      viewBody = renderNuclear(); break;
        case 'aiPractice':   viewBody = renderAiPractice(); break;
        case 'diagrams':     viewBody = renderDiagrams(); break;
        case 'smartGrid':    viewBody = renderSmartGrid(); break;
        case 'careers':      viewBody = renderCareers(); break;
        case 'quiz':         viewBody = renderQuiz(); break;
        case 'resources':    viewBody = renderResources(); break;
        case 'mastery':      viewBody = renderRenewablesMastery(); break;
        case 'siteSelector': viewBody = renderSiteSelector(); break;
        case 'gridBalance':  viewBody = renderGridBalance(); break;
        case 'menu':
        default:             viewBody = renderMenu(); break;
      }
      return React.createElement('div', { 'data-renewables-root': 'true', style: { background: T.bg, borderRadius: 12 } }, renCelebOverlay(), viewBody);
      } catch(e) {
        console.error('[Renewables] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Renewables Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}
