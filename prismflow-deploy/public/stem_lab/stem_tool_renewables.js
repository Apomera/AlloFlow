// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
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
      choices: ['Protons inside the silicon nucleus', 'Electrons in the silicon’s outer shell', 'Helium atoms inside the panel', 'Photons from the cell itself'],
      correct: 1, why: 'Photons hit silicon atoms and give energy to outer-shell electrons. The freed electrons flow through an external circuit — that flow is the electric current.' },
    { id: 'q2', icon: '🌬️',
      stem: 'A wind turbine’s power output is proportional to wind speed CUBED (v³). If wind speed doubles from 5 m/s to 10 m/s, the power output multiplies by approximately:',
      choices: ['2×', '4×', '8×', '16×'],
      correct: 2, why: '2³ = 8. That’s why turbine sites are picked obsessively for wind speed — a small increase in average wind makes a huge difference in lifetime energy output.' },
    { id: 'q3', icon: '🌬️',
      stem: 'The Betz limit says no wind turbine can extract more than ~59.3% of the kinetic energy in the wind passing through its rotor. Why is this not just an engineering problem we could solve with better blades?',
      choices: ['It’s a manufacturing limit — carbon fiber can’t be made stiffer', 'It’s a physics limit — if you extracted 100%, the air behind the rotor would have zero velocity and pile up', 'It’s a financial limit set by utilities', 'It’s a noise limit imposed by the FAA'],
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
      choices: ['It is created inside the heat pump from electricity', 'It is pulled from the ~10°C ground 1–2 m below the surface and concentrated', 'It is pulled from sunlight hitting the panels', 'It is recycled from the home’s exhaust air'],
      correct: 1, why: 'Below the frost line the soil stays a near-constant ~10°C year-round. A GSHP uses electricity to RUN a refrigeration cycle that concentrates that ground heat into your house. For each unit of electricity in, you typically get 3–5 units of heat out (COP 3–5).' },
    { id: 'q8', icon: '🔆',
      stem: 'Concentrated Solar Power (CSP) plants have one major advantage over photovoltaic (PV) panels for utility-scale generation. What is it?',
      choices: ['CSP works at night without storage', 'CSP can store the captured heat in molten salt for 6–10 hours', 'CSP is cheaper per MWh than PV', 'CSP doesn’t need any direct sunlight'],
      correct: 1, why: 'PV converts photons → electrons instantly; you can’t store electrons cheaply. CSP heats molten salt to 565°C, then runs the steam turbine on stored heat for hours after sunset — effectively built-in storage.' },
    { id: 'q9', icon: '🌊',
      stem: 'Tidal energy has one big advantage over wind and solar that critics often overlook. What is it?',
      choices: ['Tides produce more power than wind', 'Tides are predictable decades in advance from astronomy', 'Tidal turbines are cheaper to build', 'Tides work in shallow water everywhere'],
      correct: 1, why: 'Tides are driven by the Moon’s and Sun’s gravity — we can predict them to the minute, years out. That predictability is enormously valuable for grid operators trying to plan around weather-dependent solar and wind.' },
    { id: 'q10', icon: '🔋',
      stem: 'Pumped hydro storage works by pumping water UP to a high reservoir when electricity is cheap (excess solar/wind) and letting it flow DOWN through a turbine when electricity is expensive (evening peak). What round-trip efficiency does it typically achieve?',
      choices: ['~30%', '~50%', '~75–85%', '~99%'],
      correct: 2, why: 'Pumped hydro recovers about 75–85% of the electricity used to pump water up. It’s old tech (1890s) and still ~95% of the world’s installed grid storage — batteries are catching up fast but pumped hydro dwarfs them in total MWh stored.' },
    { id: 'q11', icon: '🌐',
      stem: 'The North American grid runs at exactly 60 Hz. If demand suddenly spikes and generation lags, what happens to grid frequency?',
      choices: ['It stays at 60 Hz — the grid auto-corrects instantly', 'It drops below 60 Hz', 'It rises above 60 Hz', 'It oscillates between 50 and 70 Hz'],
      correct: 1, why: 'When demand exceeds supply, the spinning generators slow down slightly to compensate, dropping frequency. Operators must add generation (or shed load) within seconds. Batteries excel at this because they respond in milliseconds.' },
    { id: 'q12', icon: '🦆',
      stem: 'In a high-solar grid like California\'s, the daytime "net load" curve looks like a duck — solar floods the grid mid-day, then drops out at sunset just as demand peaks. What is this called and what fixes it?',
      choices: ['The "swan song" — fixed by more nuclear', 'The "duck curve" — fixed by storage, demand response, and load-shifting', 'The "death spiral" — fixed by removing solar', 'The "sunset wall" — fixed by more transmission'],
      correct: 1, why: 'The "duck curve" is the textbook bug of solar-heavy grids. Solutions: batteries charged at noon and discharged at evening, demand response, and shifting loads (EV charging, heat-pump pre-heating) into the solar belly.' },
    { id: 'q13', icon: '💨',
      stem: 'Roughly 95% of hydrogen produced in the world today is "gray." What does that mean?',
      choices: ['Made by electrolysis powered by coal', 'Made from natural gas with NO carbon capture', 'A new color code for unverified hydrogen sources', 'Hydrogen mixed with sulfur impurities'],
      correct: 1, why: 'Gray hydrogen comes from steam methane reforming of natural gas with no CCS, releasing ~9–11 kg of CO₂ for every kg of H₂. The "hydrogen economy" pitch usually means switching to GREEN hydrogen, which today is a small fraction of supply.' },
    { id: 'q14', icon: '🏠',
      stem: 'A modern cold-climate air-source heat pump in Maine can hit a COP of 3 even at −15°C. What does COP 3 mean?',
      choices: ['The heat pump is 3 times louder than older models', 'For every 1 unit of electricity, the heat pump MOVES 3 units of heat into your home', 'The heat pump runs 3 times faster on cold days', 'The unit costs 3 times the price of a furnace'],
      correct: 1, why: 'COP (Coefficient of Performance) = heat moved ÷ electricity used. A COP of 3 means 300% efficient compared to electric resistance heat. The trick: you\'re NOT making heat from electricity, you\'re moving heat from outside (or the ground) into the house.' },
    { id: 'q15', icon: '⚖️',
      stem: 'The US average household spends about 3% of income on energy. What is the average for low-income households (≤200% of the federal poverty line)?',
      choices: ['1.5% — they use less so it costs less', '3% — same as everyone', '8.6% — almost 3× the national average', '15% — almost the entire monthly budget'],
      correct: 2, why: '"Energy burden" is the % of income spent on energy. Low-income households average 8.6%; the highest-burden households spend 30%+. They typically live in older, leakier housing with electric resistance heat. Weatherization + heat pumps cut this faster than any other intervention.' },
    { id: 'q16', icon: '🌬️',
      stem: 'Why are offshore wind turbines so much bigger than land-based ones?',
      choices: ['Saltwater makes blades less efficient, so they need more area', 'Offshore wind is steadier + stronger, and transport / installation costs are dominated by the boat — so making bigger turbines spreads that cost over more MW', 'Offshore turbines need to be tall enough to be visible to ships', 'Bigger blades reduce noise pollution underwater'],
      correct: 1, why: 'Once you\'ve paid for the specialized installation vessel and the seabed work, doubling turbine size barely doubles cost but does double output. So offshore turbines are massive (12–18 MW each, blades 100m+).' },
    { id: 'q17', icon: '🧰',
      stem: 'Wind turbine technician was projected by the Bureau of Labor Statistics 2022–2032 outlook as one of the fastest-growing US occupations. What\'s the typical training pathway?',
      choices: ['4-year electrical engineering degree', '2-year technical college program OR military electronics + on-the-job training', 'PhD in fluid dynamics', 'High school diploma — no further training needed'],
      correct: 1, why: 'A 2-year program at a technical college (or equivalent military training) is the typical entry point. Median pay $61K. Must be willing to climb 80–120m and work in weather. Many programs in TX, IA, and increasingly the Northeast.' },
    { id: 'q18', icon: '🔆',
      stem: 'A Concentrated Solar Power (CSP) tower can run for 6–10 hours after sunset on stored heat. How is that heat stored?',
      choices: ['In giant lithium-ion batteries', 'In a tank of molten salt at ~565°C', 'In compressed air underground', 'In a large reservoir of hot water'],
      correct: 1, why: 'CSP\'s edge over photovoltaic (PV) panels is that the working fluid (molten salt) IS the storage. Insulated tanks hold the salt at 565°C; flowing it through a heat exchanger when needed makes steam to spin the same turbine that runs during daytime. Heat is much cheaper to store than electrons.' }
  ];

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
    { term: 'Frequency regulation', def: 'Sub-second adjustments to keep the grid at exactly 60 Hz. Batteries are uniquely good at this — they respond in milliseconds.' },
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
    parts.push('<div class="dim" style="text-align:center;">Renewables Lab — part of AlloFlow STEM Lab. Sources cited: NREL, IEA, IRENA, EIA, BOEM, IPCC. Educational only.</div>');
    parts.push('</body></html>');
    return parts.join('');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 6: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────
  window.StemLab.registerTool('renewablesLab', {
    name: 'Renewables Lab',
    icon: '⚡',
    category: 'physics-chemistry',
    description: 'How each renewable energy source actually works — the physics and engineering. Solar PV, wind (Betz limit), hydro (head + flow), geothermal, CSP, wave/tidal, biomass, and storage. Live sliders driven by the real formulas. Cited to NREL, IEA, IRENA, DOE.',
    tags: ['energy', 'physics', 'engineering', 'climate', 'renewables', 'solar', 'wind', 'hydro', 'geothermal', 'maine'],

    render: function(ctx) {
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
      var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

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
        var nextBadges = Object.assign({}, badges);
        nextBadges[id] = { earned: new Date().toISOString(), label: label };
        upd('badges', nextBadges);
        addToast('🏅 Badge: ' + label);
        rnAnnounce('Badge earned: ' + label);
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
      var T = {
        bg: '#0f1f1c', card: '#1a302a', cardAlt: '#0d1916', border: '#2f5247',
        text: '#ecfeff', muted: '#cbe8e0', dim: '#88a89e',
        accent: '#10b981', accentHi: '#86efac',
        warm: '#facc15', warn: '#f97316', danger: '#ef4444',
        link: '#7dd3fc'
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
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11, color: T.dim } },
            h('div', null, h('strong', { style: { color: T.text } }, 'Capacity factor: '), s.capacityFactor),
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
            'aria-label': 'Back to Renewables Lab menu',
            onClick: function() { upd('view', 'menu'); rnAnnounce('Back to menu'); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, '← Menu'),
          h('h2', { style: { margin: 0, fontSize: 20, color: T.text } }, title)
        );
      }

      // Reusable: footer disclaimer + cite
      function footer() {
        return h('div', { role: 'contentinfo', 'aria-label': 'Source attribution',
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          'Numbers traced to ',
          h('a', { href: 'https://www.nrel.gov', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'NREL'),
          ' · ',
          h('a', { href: 'https://www.iea.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'IEA'),
          ' · ',
          h('a', { href: 'https://www.irena.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'IRENA'),
          ' · ',
          h('a', { href: 'https://www.eia.gov', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'EIA'),
          '. Sims are simplified — real plants involve additional losses (wake, transmission, parasitic load).'
        );
      }

      // ─────────────────────────────────────────
      // MENU
      // ─────────────────────────────────────────
      var MENU_TILES = [
        // Source modules (the "how does it work?" core)
        { id: 'solarPv',     icon: '☀️',     label: 'Solar PV',          desc: 'Photovoltaic effect + irradiance × area sim.' },
        { id: 'wind',        icon: '🌬️', label: 'Wind',              desc: 'Betz limit + cube-of-wind-speed power curve.' },
        { id: 'hydro',       icon: '🌊',     label: 'Hydropower',        desc: 'Head × flow sim + Pelton / Francis / Kaplan.' },
        { id: 'geothermal',  icon: '🌋',     label: 'Geothermal',        desc: 'Earth’s gradient + 3 plant types + GSHP.' },
        { id: 'solarThermal',icon: '🔆',     label: 'Solar Thermal (CSP)',desc: 'Mirrors → molten salt → steam turbine.' },
        { id: 'waveTidal',   icon: '🌀',     label: 'Wave & Tidal',      desc: 'Marine kinetic + tides predictable for decades.' },
        { id: 'biomass',     icon: '🌾',     label: 'Biomass & Biogas',  desc: 'Combustion vs anaerobic digestion.' },
        { id: 'storage',     icon: '🔋',     label: 'Storage',           desc: 'Li-ion / flow / pumped hydro / hydrogen.' },
        // Synthesis + applied
        { id: 'compare',     icon: '📊',     label: 'Compare all sources',desc: 'Side-by-side table + capacity factor explainer.' },
        { id: 'mix',         icon: '🎛️', label: 'Energy Mix Designer',  desc: 'Slide each source. See CO₂, reliability, storage need.' },
        { id: 'homePayback', icon: '🏠',     label: 'Maine home solar calc',desc: 'Roof area + bill → kWh/yr, payback, CO₂ avoided.' },
        { id: 'heatPump',    icon: '♨️',  label: 'Heat Pumps Deep Dive',desc: 'ASHP / GSHP / HPWH, COP, myths, integration. Maine leads US.' },
        { id: 'plants',      icon: '🗺️', label: 'Plant Tour',           desc: '16 famous installations across all sources. Filter + browse.' },
        // Visual + applied practice
        { id: 'diagrams',    icon: '🔬',     label: 'Diagrams',           desc: '9 labeled SVG schematics: PV cell, turbine, dam, CSP tower, GSHP, OWC, digester, pumped hydro.' },
        { id: 'aiPractice',  icon: '🤖',     label: 'AI Practice',        desc: 'Design a system for 6 real scenarios. AI critiques against rubric.' },
        { id: 'smartGrid',   icon: '🌐',     label: 'Smart Grid 101',     desc: 'How a real grid balances supply + demand. Frequency, demand response, V2G, duck curve.' },
        { id: 'hydrogen',    icon: '💨',     label: 'Hydrogen Economy',   desc: 'Color codes (green/blue/gray/etc), production routes, end uses, controversy.' },
        { id: 'justice',     icon: '⚖️',  label: 'Climate Justice',     desc: 'Energy burden, front-line communities, just transition, siting fights, Indigenous leadership.' },
        { id: 'careers',     icon: '🧰',     label: 'Career Pathways',    desc: '14 careers — trades, engineering, policy, research. Maine training pipeline.' },
        { id: 'teacher',     icon: '🎓',     label: 'Teacher Guide',      desc: 'NGSS alignment, discussion prompts, hands-on activities, unit pacing.' },
        { id: 'printPack',   icon: '🖨',      label: 'Print Pack',         desc: 'Build a printable handout from selected sections. Worksheet, quiz, answer key.' },
        { id: 'takeAction',  icon: '🌱',     label: 'Take Action',        desc: 'Concrete steps you can take at home, school, in community, civically.' },
        // Reference
        { id: 'nuclear',     icon: '⚛️', label: 'Nuclear (low-C)',   desc: 'Not renewable, but always asked about. Honest pros/cons.' },
        { id: 'glossary',    icon: '📖',     label: 'Glossary',          desc: '18 key terms — kW vs kWh, LCOE, dispatchable, etc.' },
        { id: 'myths',       icon: '🧐',     label: 'Myths busted',      desc: '7 common misconceptions, sourced corrections.' },
        // Assessment
        { id: 'quiz',        icon: '📝',     label: '18-question quiz',  desc: 'Test your understanding of all sources.' },
        { id: 'resources',   icon: '📚',     label: 'Resources',         desc: 'Every org cited in this tool.' }
      ];

      function renderMenu() {
        var visitedCount = Object.keys(modulesVisited).length;
        // Adaptive "Start Here" suggestion based on visited count.
        // Goal: reduce decision fatigue across 26 tiles.
        function startHereCard() {
          var suggestion;
          if (visitedCount === 0) {
            suggestion = {
              tone: 'fresh',
              header: '👋 First time here? Try this 5-tile path:',
              body: 'Start with ☀️ Solar PV (most familiar), then 🌬️ Wind (the formula trick), then 📊 Compare All Sources (the synthesis), then 🎛️ Energy Mix Designer (apply it), then 📝 the quiz. About 30–40 minutes.'
            };
          } else if (visitedCount < 4) {
            suggestion = {
              tone: 'progressing',
              header: '👍 Already started — want a path through the rest?',
              body: 'Pick 2 more source modules you haven\'t opened, then 🔬 Diagrams to ground the visuals, then 🌐 Smart Grid 101 to see how the grid actually integrates them.'
            };
          } else if (visitedCount < 8) {
            suggestion = {
              tone: 'engaged',
              header: '🚀 You\'re moving — branch into applied + values:',
              body: 'Try 🤖 AI Practice (design a system for a real scenario), 🏠 Maine Home Solar Calc (apply it to your house), and ⚖️ Climate Justice (the political half). Then 🌱 Take Action.'
            };
          } else if (visitedCount < 16) {
            suggestion = {
              tone: 'deep',
              header: '🎓 Deep mode: things often missed',
              body: 'Most students skip these: 💨 Hydrogen Economy (color codes), 🧐 Myths Busted, 🗺️ Plant Tour, 🧰 Career Pathways, ♨️ Heat Pumps. Each is 3–5 minutes.'
            };
          } else {
            suggestion = {
              tone: 'comprehensive',
              header: '🏁 You\'ve gone broad — capstone moves',
              body: 'You\'ve seen most of it. 🌱 Take Action turns reading into doing, and 🎓 Teacher Guide is useful if you\'re prepping a unit. Try the 18-Q quiz if you haven\'t.'
            };
          }
          return h('div', { role: 'region', 'aria-label': 'Recommended path through the lab',
            style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, suggestion.header),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } }, suggestion.body)
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
            h('h2', { style: { margin: 0, fontSize: 22 } }, '⚡ Renewables Lab'),
            h('div', { style: { fontSize: 12, color: T.dim } },
              'Modules visited: ', h('strong', { style: { color: T.text } }, visitedCount + ' / ' + (MENU_TILES.length - 2)))
          ),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'How does each renewable source actually generate electricity? This lab walks through the physics and engineering with live sliders. Pair with ',
            h('strong', { style: { color: T.text } }, 'Climate Explorer'),
            ' for the policy + mix-design side.'),
          startHereCard(),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
            MENU_TILES.map(function(tile) {
              var visited = !!modulesVisited[tile.id];
              return h('button', { key: tile.id, role: 'listitem',
                'data-rn-focusable': true,
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
              );
            })
          ),
          // Maine flavor card
          h('div', { style: { marginTop: 18, padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, '🌲 Why Maine matters here'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('li', null, MAINE_RENEWABLES.offshore),
              h('li', null, MAINE_RENEWABLES.tidal),
              h('li', null, MAINE_RENEWABLES.heatPumps)
            )
          ),
          Object.keys(badges).length > 0 && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, '🏅 Badges earned'),
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
          role: 'img', 'aria-label': 'Solar power output curve over 24 hours; peaks near solar noon, zero before sunrise and after sunset',
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
          h('path', { d: pathD, fill: 'none', stroke: '#facc15', strokeWidth: 2.5 }),
          // Title
          h('text', { x: padL, y: 16, fill: '#cbe8e0', fontSize: 11 }, 'Power output (W) by hour of day'),
          h('text', { x: padL + plotW, y: 16, fill: '#cbe8e0', fontSize: 10, textAnchor: 'end' }, '☀️ noon →')
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
          // Mode tabs (calculator vs day curve)
          h('div', { role: 'tablist', 'aria-label': 'Solar PV interactive views',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            tabBtn('calc', '🔬 Power calculator'),
            tabBtn('curve', '📈 Day curve')
          ),
          solarPvMode === 'curve' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📈 Solar power across a day'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Solar elevation angle drives clear-sky irradiance. Adjust latitude (where) and day-of-year (when) to see how the daily power curve changes shape. This is what "capacity factor" actually looks like.'),
            slider({ id: 'sl-dlat', label: 'Latitude', value: simDayLat, min: 0, max: 70, step: 1, unit: '°N',
              hint: 'Maine ~44°N. Florida 25°N. Equator 0°. Stockholm 59°N. UK 54°N.',
              onChange: function(v) { upd('simDayLat', v); } }),
            slider({ id: 'sl-doy', label: 'Day of year (' + doyToLabel(simDayOfYear) + ')', value: simDayOfYear, min: 1, max: 365, step: 1, unit: '',
              hint: 'Day 80 ≈ spring equinox. Day 172 ≈ summer solstice. Day 355 ≈ winter solstice.',
              onChange: function(v) { upd('simDayOfYear', v); } }),
            h('div', { style: { width: '100%', maxWidth: 560, margin: '12px auto', aspectRatio: '560 / 220' } },
              svgDayCurve(dayCurve)),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('div', null, h('strong', { style: { color: T.text } }, 'Solar declination today: '), dayCurve.declDeg.toFixed(1) + '°  ',
                h('span', { style: { color: T.dim, fontSize: 11 } }, '(Earth\'s axis tilt projected onto the sun-Earth line)')),
              h('div', { style: { marginTop: 4 } }, h('strong', { style: { color: T.text } }, 'Daily energy (clear sky): '),
                h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, dayCurve.totalKWh.toFixed(2) + ' kWh')),
              h('div', { style: { marginTop: 4, fontSize: 11, color: T.dim } },
                'Note: real-world output is lower because of clouds + soiling + system losses. Annual capacity factor in Maine: 16–20%.')
            )
          ),
          solarPvMode === 'calc' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'How it works — step by step'),
            h('ol', { style: { margin: '0 0 0 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } },
              h('li', null, h('strong', { style: { color: T.text } }, 'Photons arrive'), ' — sunlight is a stream of photons, each carrying a tiny packet of energy.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Photon hits silicon'), ' — if the photon has enough energy to cross silicon’s ', h('em', null, 'band gap'), ' (~1.12 eV), it knocks an outer-shell electron loose.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'P-N junction sorts the charges'), ' — the panel is two layers of silicon doped with different impurities (boron / phosphorus). The electric field at their boundary pushes electrons one way, “holes” the other.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Electrons flow as DC current'), ' — they travel through the external circuit (your house, an inverter, the grid).'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Inverter converts DC → AC'), ' — grid + most appliances run on alternating current.')
            )
          ),
          solarPvMode === 'calc' && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🔬 Try it: solar PV power calculator'),
            h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 10 } },
              'Power = Irradiance × Area × Efficiency × cos(tilt error). Drag the sliders to see how each factor changes output.'),
            slider({ id: 'sl-irr', label: 'Sunlight intensity (irradiance)', value: simSolarIrr, min: 100, max: 1000, step: 50, unit: 'W/m²',
              hint: '~1000 W/m² at solar noon on a clear summer day. ~200 W/m² on overcast days.',
              onChange: function(v) { upd('simSolarIrr', v); } }),
            slider({ id: 'sl-area', label: 'Total panel area', value: simSolarArea, min: 1, max: 200, step: 1, unit: 'm²',
              hint: 'A typical home rooftop array: 20–40 m². A megawatt utility array: ~5,000 m².',
              onChange: function(v) { upd('simSolarArea', v); } }),
            slider({ id: 'sl-eff', label: 'Module efficiency', value: Math.round(simSolarEff * 100), min: 10, max: 28, step: 1, unit: '%',
              hint: 'Commercial panels: 18–23%. Lab record (multi-junction): 47%. Cheap thin-film: 10–12%.',
              onChange: function(v) { upd('simSolarEff', v / 100); } }),
            slider({ id: 'sl-tilt', label: 'Tilt error from optimal', value: simSolarTilt, min: 0, max: 80, step: 5, unit: '°',
              hint: '0° = perfectly aimed at the sun. 90° = parallel to sunlight (zero output). Trackers cut this to near-zero.',
              onChange: function(v) { upd('simSolarTilt', v); } }),
            powerBar('Instantaneous power output', fracOfPeak, kW.toFixed(2) + ' kW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              'A home consumes ~1 kW continuous on average. So this array could power roughly ',
              h('strong', { style: { color: T.accentHi } }, kW.toFixed(1) + ' homes'),
              ' at this instant. Annual energy depends on capacity factor (typically 15–27%).')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, '🔌 Series vs parallel wiring'),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Series:'), ' voltages add, current stays the same. A weak / shaded panel limits the entire string.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Parallel:'), ' currents add, voltage stays the same. Shading one panel only loses that panel’s output. Most modern arrays use module-level optimizers / microinverters to get the best of both.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Why wind power scales with v³'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Kinetic energy of moving air = ½ m v². The mass passing through a rotor per second is ρ·A·v (density × area × speed). Multiply: ',
              h('strong', { style: { color: T.text } }, 'P = ½·ρ·A·v³'),
              '. So wind power scales with the CUBE of wind speed.'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'Betz’s law:'),
              ' the absolute maximum power any rotor can extract is ',
              h('strong', { style: { color: T.accentHi } }, '59.3%'),
              ' of the wind’s kinetic energy. If you took 100%, the air behind would be motionless and no more air could flow through. Real turbines hit Cp ≈ 0.35–0.45.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🔬 Try it: wind turbine power'),
            slider({ id: 'sl-wv', label: 'Wind speed', value: simWindV, min: 1, max: 25, step: 0.5, unit: 'm/s',
              hint: 'Cut-in ~3 m/s. Rated ~12–15 m/s. Cut-out ~25 m/s (turbine pitches blades to feather and stops). 1 m/s ≈ 2.24 mph.',
              onChange: function(v) { upd('simWindV', v); } }),
            slider({ id: 'sl-wr', label: 'Rotor radius', value: simWindR, min: 5, max: 120, step: 1, unit: 'm',
              hint: 'Small wind: 2–5 m. Modern utility onshore: 50–80 m. Offshore giants: 100–120 m+ (Haliade-X: 110 m).',
              onChange: function(v) { upd('simWindR', v); } }),
            slider({ id: 'sl-wcp', label: 'Power coefficient (Cp)', value: Math.round(simWindCp * 100), min: 10, max: 59, step: 1, unit: '%',
              hint: 'Real turbines: 35–45%. Betz limit: 59.3%. Higher Cp = better blade aerodynamics + control.',
              onChange: function(v) { upd('simWindCp', v / 100); } }),
            powerBar('Power output (vs same rotor at Betz max)', fracOfBetz, MW.toFixed(3) + ' MW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              'Swept area: ',
              h('strong', { style: { color: T.accentHi } }, swept.toFixed(0) + ' m²'),
              '. Doubling the rotor radius QUADRUPLES the swept area — that’s why turbines keep getting bigger.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, '🗼 Onshore vs offshore'),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Onshore:'), ' cheaper to install + maintain. Land conflicts (viewsheds, wildlife). Capacity factor 35–45%.'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'Offshore:'), ' steadier wind + larger rotors. Saltwater corrosion + installation cost. Capacity factor 45–55%. Deep water (Gulf of Maine) requires ',
                h('strong', { style: { color: T.accentHi } }, 'floating platforms'),
                ' — a Maine specialty.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'The hydro power formula'),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#06281f', border: '1px solid ' + T.border, fontFamily: 'monospace', fontSize: 14, color: T.accentHi, textAlign: 'center', marginBottom: 8 } },
              'P = ρ × g × h × Q × η'),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, color: T.muted, fontSize: 12, lineHeight: 1.6 } },
              h('li', null, h('strong', { style: { color: T.text } }, 'ρ (rho)'), ' = water density = 1000 kg/m³'),
              h('li', null, h('strong', { style: { color: T.text } }, 'g'), ' = gravity = 9.81 m/s²'),
              h('li', null, h('strong', { style: { color: T.text } }, 'h'), ' = head = vertical drop in meters'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Q'), ' = flow rate in m³/s'),
              h('li', null, h('strong', { style: { color: T.text } }, 'η (eta)'), ' = turbine efficiency, typically 0.85–0.95')
            ),
            h('p', { style: { margin: '8px 0 0', color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
              'Notice both head and flow appear ONCE — power is linear in each. Doubling either doubles the power; doubling both quadruples it.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🔬 Try it: hydro plant calculator'),
            slider({ id: 'sl-hh', label: 'Head (vertical drop)', value: simHydroHead, min: 1, max: 800, step: 1, unit: 'm',
              hint: 'Run-of-river dam: 5–20 m. Medium dam: 30–100 m. High alpine plant: 500–1800 m.',
              onChange: function(v) { upd('simHydroHead', v); } }),
            slider({ id: 'sl-hq', label: 'Flow rate', value: simHydroFlow, min: 0.1, max: 200, step: 0.1, unit: 'm³/s',
              hint: 'Mountain stream: 0.5–5 m³/s. Mid-sized river: 50–100 m³/s. Mississippi: ~17,000 m³/s.',
              onChange: function(v) { upd('simHydroFlow', v); } }),
            slider({ id: 'sl-he', label: 'Turbine efficiency (η)', value: Math.round(simHydroEff * 100), min: 60, max: 95, step: 1, unit: '%',
              hint: 'Modern turbines: 90–95%. Older or poorly matched: 75–85%.',
              onChange: function(v) { upd('simHydroEff', v / 100); } }),
            powerBar('Power output (scale: small–mid plant)', fracOfRef, MW.toFixed(3) + ' MW'),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              'For comparison: Hoover Dam = 2,080 MW. A typical Maine hydro: 1–20 MW. A microhydro on a farm stream: 5–50 kW.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Three turbine families — pick by site'),
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
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
        if (tempC < 90) plant = { id: 'gshp', name: 'Too cool for electricity — use a ground-source heat pump for direct heating', color: T.warm };
        else if (tempC < 180) plant = { id: 'binary', name: 'Binary cycle (~90–180°C)', color: T.accentHi };
        else if (tempC < 235) plant = { id: 'flash', name: 'Flash steam (180–235°C)', color: T.accent };
        else plant = { id: 'drySteam', name: 'Dry steam (≥ 235°C)', color: T.accentHi };
        var fracOfMax = Math.min(1, tempC / 350);
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌋 Geothermal'),
          sourceCard('geothermal'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Where does the heat come from?'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Two sources: leftover heat from Earth’s formation 4.5 billion years ago, and ongoing radioactive decay of uranium, thorium, and potassium-40 in the mantle. The result: temperature climbs roughly ',
              h('strong', { style: { color: T.accentHi } }, '25–30°C per kilometer'),
              ' as you go down. In volcanic regions (Iceland, Yellowstone, Italy) the gradient is much steeper — 60–200°C/km.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🔬 Try it: how deep before you reach steam?'),
            slider({ id: 'sl-gs', label: 'Surface temperature', value: simGeoSurfC, min: -10, max: 35, step: 1, unit: '°C',
              hint: 'Maine annual avg ~7°C. Death Valley summer ~45°C. Antarctic interior − 50°C.',
              onChange: function(v) { upd('simGeoSurfC', v); } }),
            slider({ id: 'sl-gg', label: 'Geothermal gradient', value: simGeoGrad, min: 15, max: 200, step: 5, unit: '°C/km',
              hint: '25–30°C/km is normal continental crust. 60–100 in volcanic zones. 200+ at Iceland’s rift.',
              onChange: function(v) { upd('simGeoGrad', v); } }),
            slider({ id: 'sl-gd', label: 'Drill depth', value: simGeoDepth, min: 0.1, max: 10, step: 0.1, unit: 'km',
              hint: 'Most US oil wells: 1–3 km. Deepest geothermal: ~5 km. Kola Superdeep (research): 12.3 km.',
              onChange: function(v) { upd('simGeoDepth', v); } }),
            powerBar('Resource temperature reached (vs 350°C max)', fracOfMax, tempC.toFixed(0) + ' °C'),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + plant.color } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 2 } }, 'Best matched plant type at this temperature:'),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: plant.color } }, plant.name))
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Four plant designs'),
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
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
          { id: 'trough', icon: '🌞', name: 'Parabolic trough',
            how: 'Long curved mirrors focus sunlight onto a tube of synthetic oil. Oil heats to ~390°C, runs through a heat exchanger to make steam.',
            where: 'Andasol (Spain), Mojave Solar (US, 280 MW). The most-deployed CSP design.' },
          { id: 'tower', icon: '🗼', name: 'Power tower (heliostat)',
            how: 'Thousands of flat tracking mirrors (heliostats) focus light on a receiver atop a central tower. Molten salt circulates, hits 565°C.',
            where: 'Ivanpah (US, 392 MW), Crescent Dunes (US, 110 MW + 10h storage), Noor (Morocco).' },
          { id: 'dish', icon: '🌎', name: 'Parabolic dish + Stirling engine',
            how: 'Single dish concentrates sunlight onto a Stirling engine at the focal point. Modular — each dish is a stand-alone generator.',
            where: 'Mostly demo / R&D. Highest known solar-to-electric efficiency (~30%+).' },
          { id: 'fresnel', icon: '🔲', name: 'Linear Fresnel',
            how: 'Like a parabolic trough but uses flat strips of mirrors at slight angles. Cheaper to build, slightly lower efficiency.',
            where: 'Several MW-scale plants in Spain, India, Australia.' }
        ];
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔆 Solar Thermal (CSP)'),
          sourceCard('solarThermal'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'CSP vs PV — the big difference'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'PV (Photovoltaic):'), ' photons → electrons directly, instantly. Cheaper. But you can’t store electrons in bulk — need separate batteries.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'CSP (Concentrated Solar Power):'), ' photons → heat → steam → electricity. More expensive. But heat is CHEAP to store in molten salt at 565°C — a CSP plant can run 6–10 hours after sunset on stored heat.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Four CSP designs'),
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
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, 'Why CSP works in deserts but not Maine'),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'CSP needs ',
              h('strong', { style: { color: T.text } }, 'direct'),
              ' sunlight — mirrors can’t focus diffuse cloudy light. The economic threshold is ~2000 kWh/m²/year of direct normal irradiance (DNI). Maine averages 1000–1400 kWh/m²/year DNI, well below the cutoff. Spain, Morocco, Nevada, Arizona, Australian outback get 2200–2800 — ideal CSP territory.')
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
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Wave vs tidal — different physics'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'Wave power'), ' comes from wind transferring energy to the ocean surface (waves are wind’s downstream effect). Wave heights are stochastic and depend on storms thousands of km away.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'Tidal power'), ' comes from gravitational pull of the Moon and Sun. Predictable to the minute, ',
              h('strong', { style: { color: T.accentHi } }, 'decades in advance'),
              '. That predictability is incredibly valuable for grid operators.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Four marine-energy designs'),
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
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Three pathways from organic matter to electricity'),
            BIO_PATHS.map(function(p) {
              return h('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, p.icon),
                  h('strong', { style: { color: T.text, fontSize: 14 } }, p.name)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, p.what),
                h('div', { style: { fontSize: 11, color: T.accentHi, marginBottom: 3 } }, h('strong', null, 'Efficiency: '), p.eff),
                h('div', { style: { fontSize: 11, color: T.warm, fontStyle: 'italic', lineHeight: 1.5 } }, h('strong', null, '⚠ Caveat: '), p.caveat)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, 'Is biomass really renewable?'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'It depends on the timescale. Burning a tree releases CO₂ today; that carbon was pulled from the atmosphere over decades. If the next tree grows back at the same rate, the cycle is closed — ',
              h('em', null, 'roughly'),
              ' carbon-neutral. But if you cut faster than regrowth, it’s a net emitter for decades.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, 'The strongest renewable case is anaerobic digestion of waste streams'),
              ' — dairy manure, food waste, sewage, landfill gas. That methane was going to be released anyway; capturing and burning it converts CH₂ into CO₂ (much weaker greenhouse gas) AND yields useful electricity + heat.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
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
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'The intermittency problem — and why storage solves it'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Sun and wind don’t generate on demand. Solar peaks at noon; demand peaks 6–10 PM. Wind is windy when it’s windy. Without storage, a 100% wind-and-solar grid has hours of surplus and hours of nothing.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Storage moves energy across time — absorb the midday solar surplus, release it at the evening peak. Different storage tech handles different durations: batteries for hours, pumped hydro for days, hydrogen for seasons.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Five storage technologies compared'),
            STORAGE_TYPES.map(function(s) {
              return h('div', { key: s.id, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 8, fontSize: 11, color: T.dim } },
                  h('div', null, h('strong', { style: { color: T.text } }, 'Duration: '), s.duration),
                  h('div', null, h('strong', { style: { color: T.text } }, 'Round-trip: '), s.rte)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 6 } }, s.how),
                h('div', { style: { fontSize: 11, color: T.accentHi, lineHeight: 1.5, marginBottom: 3 } }, h('strong', null, '✓ Pros: '), s.pros),
                h('div', { style: { fontSize: 11, color: T.warm, lineHeight: 1.5 } }, h('strong', null, '⚠ Cons: '), s.cons)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, 'Which storage do you actually need?'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, h('strong', { style: { color: T.text } }, 'Hours (1–6 h):'), ' Lithium-ion batteries. Daily solar shifting, peak shaving, frequency regulation.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Days (10–100 h):'), ' Pumped hydro, flow batteries, compressed air.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Seasons:'), ' Green hydrogen. Only economic option for storing summer solar to use in winter.'),
              h('li', null, h('strong', { style: { color: T.text } }, 'Heat for buildings:'), ' Hot-water tanks, ice storage, building thermal mass. Cheap, mature, underused.')
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
                onClick: function() { upd('quizState', { idx: 0, score: 0, answered: false, lastChoice: null }); rnAnnounce('Quiz reset'); },
                style: btn() }, '🔄 Try again'),
              h('button', { 'data-rn-focusable': true,
                onClick: function() { upd('view', 'menu'); },
                style: btnPrimary() }, '← Back to menu')),
            (function() { if (pct >= 70) awardBadge('renewables_quiz_pass', 'Quiz Passed (70%+)'); return null; })(),
            (function() { if (pct >= 90) awardBadge('renewables_quiz_ace', 'Quiz Ace (90%+)'); return null; })(),
            footer()
          );
        }
        var q = QUIZ[qIdx];
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('📝 Quiz'),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
            'Question ', h('strong', { style: { color: T.text } }, (qIdx + 1) + ' of ' + QUIZ.length),
            '  ·  Score: ', h('strong', { style: { color: T.accentHi } }, (quizState.score || 0))),
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
            'Every organization cited in this tool. NREL is the single best free resource for capacity factors and cost trends; the Annual Technology Baseline (ATB) is updated yearly.'),
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
        return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          backBar('📊 Compare All Sources'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'First — what is "capacity factor" and why does it matter?'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.text } }, 'Capacity factor'),
              ' = actual annual energy output ÷ what the plant would produce at 100% rated power 24/7/365.'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Example: a 1 MW solar farm in Maine generates ~1.7 GWh per year. If it ran flat-out 24/7 it would produce 8.76 GWh. So its capacity factor is 1.7 / 8.76 ≈ ',
              h('strong', { style: { color: T.accentHi } }, '19%'),
              '.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'This is why "1 GW of solar" and "1 GW of nuclear" are NOT equivalent — the nuclear plant runs near 90% CF, the solar farm near 20%. To match annual energy from 1 GW nuclear, you need ~4–5 GW of solar (plus storage to match dispatchability).')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Side-by-side comparison'),
            h('table', { 'aria-label': 'Comparison table of renewable and reference electricity sources',
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
              'Sources: NREL Annual Technology Baseline 2024 (LCOE, capacity factor); IPCC AR6 WG3 Annex III (lifecycle CO₂ medians); Macknick 2012 + NREL (water); Hertwich 2015 + DOE (land use). The two reference rows (red) are NOT renewables — included for honest comparison.')
          ),
          // Footnotes for rows that have a note
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'Important caveats'),
            COMPARE_TABLE.filter(function(r) { return r.note; }).map(function(r) {
              return h('div', { key: r.id, style: { fontSize: 11, color: T.muted, marginBottom: 6, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.icon + ' ' + r.name + ': '),
                r.note);
            })
          ),
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
              'Design an electricity mix for a region. Slide each source. The remainder fills with coal (the dirtiest baseline). See lifecycle CO₂, reliability, and how much storage you would need.')
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
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '📈 Your mix at a glance'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Lifecycle CO₂'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: co2 < 100 ? T.accent : co2 < 300 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  co2.toFixed(0) + ' g/kWh'),
                h('div', { style: { fontSize: 10, color: T.dim } }, pctReduction + '% below coal baseline')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Reliability score'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: rel >= 3 ? T.accent : rel >= 2 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  rel.toFixed(1) + ' / 5'),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Higher = more dispatchable')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Renewable share'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  renewablesShare + '%'),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Solar + wind + hydro + geo'))
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, '🔋 Storage outlook for ' + variableShare + '% variable share:'),
              h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5 } }, storageHint))
          ),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 0, mixHydro: 7, mixGeo: 0, mixNuclear: 19, mixGas: 36 });
                rnAnnounce('Loaded: 2024 US grid average');
              }, style: btn() }, 'Load: 2024 US grid'),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 30, mixWind: 35, mixHydro: 20, mixGeo: 5, mixNuclear: 5, mixGas: 5 });
                rnAnnounce('Loaded: 2050 net-zero scenario');
              }, style: btn() }, 'Load: 2050 net-zero'),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 56, mixHydro: 1, mixGeo: 0, mixNuclear: 0, mixGas: 9 });
                rnAnnounce('Loaded: Denmark wind-heavy');
              }, style: btn() }, 'Load: Denmark mix'),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 0, mixWind: 0, mixHydro: 70, mixGeo: 30, mixNuclear: 0, mixGas: 0 });
                rnAnnounce('Loaded: Iceland renewable');
              }, style: btn() }, 'Load: Iceland'),
            h('button', { 'data-rn-focusable': true,
              onClick: function() {
                updMulti({ mixSolar: 30, mixWind: 30, mixHydro: 10, mixGeo: 5, mixNuclear: 10, mixGas: 15 });
                rnAnnounce('Reset to default');
              }, style: btn() }, '↺ Reset')
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
            var batteryLevel = 0;
            // Storage capacity in "kWh per kW peak demand-hours" — slider
            var battCap = d.gridBattHrs != null ? d.gridBattHrs : 4;
            var battEff = 0.92;
            var summary = { totalSupply: 0, totalDemand: 0, unmetHrs: 0, curtailHrs: 0, battThroughput: 0 };
            for (var hr = 0; hr < 24; hr++) {
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
              if (net > 0) {
                // Surplus — try to fill battery
                var room = battCap - batteryLevel;
                var stored = Math.min(net, room);
                batteryLevel += stored * battEff;
                curtailed = net - stored;
                battDelta = stored;
                if (curtailed > 0.01) summary.curtailHrs++;
                summary.battThroughput += stored;
              } else if (net < 0) {
                // Deficit — try to drain battery
                var need = -net;
                var drawn = Math.min(need, batteryLevel);
                batteryLevel -= drawn;
                served = supply + drawn;
                if (drawn < need - 0.01) summary.unmetHrs++;
                battDelta = -drawn;
              }
              hours.push({ hr: hr, sUnits: sUnits, wUnits: wUnits, bUnits: bUnits, supply: supply, demand: dem, served: served, batt: batteryLevel, battDelta: battDelta });
            }
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '⚡ 24-hour grid balance'),
              h('p', { style: { margin: '0 0 10px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                'Stacked supply (baseload + wind + solar) vs hourly demand for a residential grid. Adjust the storage slider to see how batteries smooth the gap.'),
              // Storage slider
              h('div', { style: { marginBottom: 12 } },
                h('label', { htmlFor: 'grid-batt', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 } },
                  h('span', null, '🔋 Battery capacity'),
                  h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, battCap.toFixed(1) + ' h')
                ),
                h('input', { id: 'grid-batt', 'data-rn-focusable': true, type: 'range',
                  min: 0, max: 12, step: 0.5, value: battCap,
                  'aria-label': 'Battery capacity in hours of peak demand',
                  onChange: function(e) { upd('gridBattHrs', parseFloat(e.target.value)); },
                  style: { width: '100%', accentColor: T.accent, cursor: 'pointer' }
                }),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } },
                  '0 h = no storage. 4 h ≈ typical Tesla Powerwall stack. 8+ h needed for high-renewable grids.')
              ),
              h('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
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
                h('text', { x: pad.l + 14, y: 13, fontSize: 10, fill: '#a78bfa' }, 'Baseload'),
                h('rect', { x: pad.l + 70, y: 4, width: 10, height: 10, fill: '#7dd3fc', opacity: 0.65 }),
                h('text', { x: pad.l + 84, y: 13, fontSize: 10, fill: '#7dd3fc' }, 'Wind'),
                h('rect', { x: pad.l + 124, y: 4, width: 10, height: 10, fill: '#facc15', opacity: 0.75 }),
                h('text', { x: pad.l + 138, y: 13, fontSize: 10, fill: '#facc15' }, 'Solar'),
                h('line', { x1: pad.l + 178, y1: 9, x2: pad.l + 198, y2: 9, stroke: '#f87171', strokeWidth: 2.5, strokeDasharray: '6 3' }),
                h('text', { x: pad.l + 202, y: 13, fontSize: 10, fill: '#f87171' }, 'Demand')
              ),
              // Summary cards
              h('div', { style: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Daily supply / demand'),
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: summary.totalSupply >= summary.totalDemand ? T.accent : T.warm, fontFamily: 'monospace' } },
                    summary.totalSupply.toFixed(1) + ' / ' + summary.totalDemand.toFixed(1)),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.totalSupply >= summary.totalDemand ? 'Sufficient capacity' : 'Capacity shortfall')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + (summary.unmetHrs > 0 ? T.danger : T.border) } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Hours of unmet demand'),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: summary.unmetHrs > 0 ? T.danger : T.accent, fontFamily: 'monospace' } },
                    summary.unmetHrs + ' h'),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.unmetHrs === 0 ? '✓ Always served' : 'Blackouts likely')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Hours of curtailed surplus'),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: summary.curtailHrs > 6 ? T.warm : T.text, fontFamily: 'monospace' } },
                    summary.curtailHrs + ' h'),
                  h('div', { style: { fontSize: 10, color: T.dim } }, summary.curtailHrs > 0 ? 'Energy wasted' : '✓ All used')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border } },
                  h('div', { style: { fontSize: 10, color: T.dim } }, 'Battery throughput / day'),
                  h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                    summary.battThroughput.toFixed(2)),
                  h('div', { style: { fontSize: 10, color: T.dim } }, '× peak-demand-hours')
                )
              ),
              // Teaching notes
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'What to notice: '),
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
              'Rough estimate for a Maine rooftop. Real quotes vary by orientation, shading, and contractor. Numbers below assume CMP territory + south-facing roof + 2024–25 incentive levels. Always get 3 quotes.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            slider({ id: 'mh-roof', label: '🏠 Usable south-facing roof area', value: mhRoofM2, min: 5, max: 100, step: 1, unit: 'm²',
              hint: 'A typical Maine 2-story has 30–60 m² of usable south slope. 1 m² ≈ 10.8 ft².',
              onChange: function(v) { upd('mhRoofM2', v); } }),
            slider({ id: 'mh-bill', label: '💵 Average monthly electric bill', value: mhBillMo, min: 50, max: 500, step: 10, unit: '$/mo',
              hint: 'Maine residential average ~$130/mo (2024). Heat-pump homes run $200–400/mo in winter.',
              onChange: function(v) { upd('mhBillMo', v); } }),
            slider({ id: 'mh-itc', label: '🇺🇸 Federal Investment Tax Credit', value: mhRebatePct, min: 0, max: 30, step: 1, unit: '%',
              hint: '30% through 2032 under current law. 26% if installed before 2022 or if law changes.',
              onChange: function(v) { upd('mhRebatePct', v); } })
          ),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '📊 Estimated outcome'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 } },
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Annual generation'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  annualKWh.toFixed(0) + ' kWh'),
                h('div', { style: { fontSize: 10, color: T.dim } }, '~' + pctOfBill.toFixed(0) + '% of your usage')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Annual savings'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: 'monospace' } },
                  '$' + annualSavings.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'at $' + ELECTRIC_RATE.toFixed(2) + '/kWh')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'After-incentive cost'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.warm, fontFamily: 'monospace' } },
                  '$' + afterMaine.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Gross $' + grossCost.toFixed(0) + ' − ITC − $800 EM rebate')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Payback time'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: paybackYrs < 10 ? T.accent : paybackYrs < 15 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  paybackYrs.toFixed(1) + ' yr'),
                h('div', { style: { fontSize: 10, color: T.dim } }, '25-yr panel lifespan')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, '25-yr net savings'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: lifetime > 0 ? T.accent : T.danger, fontFamily: 'monospace' } },
                  '$' + lifetime.toFixed(0)),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Excludes electricity-rate inflation (typically +)')),
              h('div', null,
                h('div', { style: { fontSize: 11, color: T.dim } }, 'CO₂ avoided / yr'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } },
                  co2Avoided.toFixed(0) + ' kg'),
                h('div', { style: { fontSize: 10, color: T.dim } }, '~' + (co2Avoided / 4600).toFixed(2) + ' cars/yr equiv.'))
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine-specific notes'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.6 } },
              h('li', null, 'Cold + sun = high efficiency. Maine winter sun is short but the cold actually boosts panel output.'),
              h('li', null, 'Net metering rules in Maine have shifted multiple times. Current law gives ~retail rate credit; check the PUC for the current arrangement before signing.'),
              h('li', null, 'Snow on panels: tilt ≥ 30° lets snow slide off. Bifacial panels can pick up reflected light from snow on the ground.'),
              h('li', null, 'Pair with a heat pump for biggest impact: summer solar runs the heat pump in shoulder seasons; you also free up oil dollars.'),
              h('li', null, 'Efficiency Maine offers 0% loans up to $15,000 for solar + heat pump combos.')
            )
          ),
          h('div', { style: { marginTop: 12, padding: 10, borderRadius: 10, background: T.card, border: '1px dashed ' + T.accent, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🔗 Adding an EV?'),
            ' Layer in EV charging math from AlloFlow ',
            h('strong', { style: { color: T.text } }, 'RoadReady'),
            '. A typical Maine commute (~30 mi/day) adds ~7–10 kWh/day to your home load — significant for solar sizing, and EVs unlock V2G later.'),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // GLOSSARY
      // ─────────────────────────────────────────
      function renderGlossary() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📖 Glossary'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Terms used throughout this lab — and throughout any conversation about energy. Skim before reading the news; come back when something is fuzzy.'),
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
            'Seven misconceptions you will hear in news, comment threads, or family arguments. Each correction is sourced — bring receipts.'),
          MYTHS.map(function(m, i) {
            return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } },
                '❌ Myth: ', h('span', { style: { color: T.text } }, m.myth)),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.accentHi } }, '✓ What\'s actually true: '),
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
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } }, '⚠ A note on scope'),
            h('p', { style: { margin: 0, fontSize: 12, color: '#fde2e2', lineHeight: 1.55 } }, n.why)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, n.icon),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 17, color: T.text } }, 'Nuclear fission'),
                h('div', { style: { fontSize: 12, color: T.accentHi } }, 'Principle: ' + n.principle))),
            h('p', { style: { margin: '6px 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, n.oneLiner),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11, color: T.dim } },
              h('div', null, h('strong', { style: { color: T.text } }, 'Capacity factor: '), n.capacityFactor),
              h('div', null, h('strong', { style: { color: T.text } }, 'LCOE: '), n.lcoe),
              h('div', null, h('strong', { style: { color: T.text } }, 'Lifecycle CO₂: '), n.co2)
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
            h('div', { style: { padding: 12, borderRadius: 10, background: '#064e3b', border: '1px solid ' + T.accent } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 8 } }, '✓ Pros'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: '#dcfce7', lineHeight: 1.6 } },
                n.pros.map(function(p, i) { return h('li', { key: i }, p); }))
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 8 } }, '⚠ Cons'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: '#fde2e2', lineHeight: 1.6 } },
                n.cons.map(function(p, i) { return h('li', { key: i }, p); }))
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Reactor designs'),
            n.designs.map(function(d2, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('strong', { style: { color: T.text, fontSize: 13 } }, d2.name),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 3 } }, d2.what)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 6 } }, '🔬 What about fusion?'),
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
          rnAnnounce('Scenario loaded.');
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
            rnAnnounce('Local check ready.');
            return;
          }
          upd('aiLoadingCritique', true);
          rnAnnounce('Getting critique...');
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
              rnAnnounce('Critique ready.');
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
              'Pick a scenario. Write 4–8 sentences describing how you would design the electricity system. ',
              h('strong', { style: { color: T.accentHi } }, 'AI critiques your reasoning'),
              ' against an engineering rubric and the same ground-truth facts you read in the source modules.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, '📋 Pick a scenario'),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
              AI_SCENARIOS.map(function(s) {
                var picked = aiScenarioId === s.id;
                return h('button', { key: s.id, role: 'listitem',
                  'data-rn-focusable': true,
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
                );
              })
            )
          ),
          scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, scenario.icon + ' ' + scenario.title),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.6 } }, scenario.prompt),
            h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              h('strong', { style: { color: T.warm } }, '💡 Hint: '), scenario.hint)
          ),
          scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('label', { htmlFor: 'rn-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
              '✏️ Your design (4–8 sentences)'),
            h('textarea', { id: 'rn-ai-response', 'data-rn-focusable': true,
              value: aiResponse,
              onChange: function(e) { upd('aiResponse', e.target.value); },
              placeholder: 'Walk through your system. Which sources? Why? What storage? What backup? Any failure modes you would address?',
              'aria-label': 'Your renewable energy system design',
              rows: 6,
              style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }
            }),
            h('div', { style: { marginTop: 6, fontSize: 11, color: T.dim, marginBottom: 10 } },
              aiResponse.length, ' characters. Aim for ~300–800.'),
            h('button', { 'data-rn-focusable': true,
              'aria-label': aiLoadingCritique ? 'Getting critique' : 'Get critique of your design',
              'aria-busy': aiLoadingCritique ? 'true' : 'false',
              disabled: aiLoadingCritique || !aiResponse.trim(),
              onClick: getCritique,
              style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
            }, aiLoadingCritique ? '⏳ Critiquing...' : (callGemini ? '🎓 Get AI critique' : '📋 Local rubric check'))
          ),
          aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#0d2a4a', border: '1px solid #1e40af', color: '#dbeafe', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: '#bfdbfe' } }, '🎓 Critique'),
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
        { id: 'solarPv',    icon: '☀️', label: 'Solar PV cell' },
        { id: 'wind',       icon: '🌬️', label: 'Wind turbine' },
        { id: 'hydro',      icon: '🌊', label: 'Hydro dam' },
        { id: 'geothermal', icon: '🌋', label: 'Geothermal flash plant' },
        { id: 'csp',        icon: '🔆', label: 'CSP power tower' },
        { id: 'gshp',       icon: '🏠', label: 'Ground-source heat pump' },
        { id: 'owc',        icon: '🌀', label: 'Wave OWC' },
        { id: 'digester',   icon: '🌾', label: 'Anaerobic digester' },
        { id: 'pumpedHydro',icon: '⛰️', label: 'Pumped hydro storage' }
      ];
      function svgSolarPvCell() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-solarpv-title svg-solarpv-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-solarpv-title' }, 'Cross-section of a silicon photovoltaic cell'),
          h('desc', { id: 'svg-solarpv-desc' }, 'Photons arrive from above, hit silicon, knock electrons loose. The P-N junction sorts charges. Electrons flow through an external circuit as DC current.'),
          // Sun
          h('circle', { cx: 80, cy: 50, r: 24, fill: '#facc15' }),
          h('text', { x: 80, y: 28, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, 'Sunlight'),
          // Photon arrows
          [120, 180, 240, 300, 360, 420].map(function(x, i) {
            return h('g', { key: 'p' + i },
              h('line', { x1: x - 20, y1: 30, x2: x, y2: 100, stroke: '#fde047', strokeWidth: 1.5, strokeDasharray: '3,3' }),
              h('polygon', { points: x + ',95 ' + (x - 4) + ',88 ' + (x + 4) + ',88', fill: '#fde047' })
            );
          }),
          // N-type silicon layer
          h('rect', { x: 80, y: 100, width: 440, height: 40, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }),
          h('text', { x: 300, y: 125, fill: '#fff', fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, 'N-type silicon (extra electrons)'),
          // P-N junction line
          h('line', { x1: 80, y1: 140, x2: 520, y2: 140, stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '6,3' }),
          h('text', { x: 540, y: 144, fill: '#fbbf24', fontSize: 11 }, 'P-N junction'),
          // P-type silicon layer
          h('rect', { x: 80, y: 140, width: 440, height: 60, fill: '#1e40af', stroke: '#1e3a8a', strokeWidth: 2 }),
          h('text', { x: 300, y: 175, fill: '#fff', fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, 'P-type silicon (electron "holes")'),
          // Electron flow arrow (top)
          h('line', { x1: 80, y1: 90, x2: 30, y2: 90, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('polygon', { points: '32,90 38,86 38,94', fill: '#22c55e' }),
          h('text', { x: 50, y: 80, fill: '#22c55e', fontSize: 11 }, 'e⁻'),
          // External circuit (bulb)
          h('line', { x1: 30, y1: 90, x2: 30, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 30, y1: 250, x2: 280, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('circle', { cx: 300, cy: 250, r: 22, fill: 'none', stroke: '#facc15', strokeWidth: 3 }),
          h('text', { x: 300, y: 256, fill: '#facc15', fontSize: 18, textAnchor: 'middle' }, '💡'),
          h('text', { x: 300, y: 290, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, 'External circuit (lamp, home)'),
          h('line', { x1: 320, y1: 250, x2: 570, y2: 250, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 570, y1: 250, x2: 570, y2: 200, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('line', { x1: 570, y1: 200, x2: 520, y2: 200, stroke: '#22c55e', strokeWidth: 2.5 }),
          h('polygon', { points: '525,200 531,196 531,204', fill: '#22c55e' }),
          // Caption labels
          h('text', { x: 300, y: 330, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle' }, '1. Photon arrives  →  2. Knocks electron loose  →  3. P-N junction sorts charges  →  4. Electrons flow as DC current')
        );
      }
      function svgWindTurbine() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-wind-title svg-wind-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-wind-title' }, 'Wind turbine cutaway'),
          h('desc', { id: 'svg-wind-desc' }, 'Wind spins the rotor blades, which turn a low-speed shaft connected to a gearbox, which spins a high-speed shaft into the generator. The generator produces electricity. The yaw drive points the turbine into the wind. Cables carry power down through the tower to the grid.'),
          // Sky/ground
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#1f2937' }),
          // Tower
          h('polygon', { points: '290,300 310,300 320,90 280,90', fill: '#94a3b8' }),
          h('text', { x: 200, y: 250, fill: '#94a3b8', fontSize: 12 }, 'Tower (80–120 m tall)'),
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
          h('text', { x: 285, y: 93, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Gear'),
          h('rect', { x: 320, y: 78, width: 50, height: 24, fill: '#22c55e', stroke: '#166534', strokeWidth: 1 }),
          h('text', { x: 345, y: 93, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Generator'),
          // Wind arrows
          [50, 80, 120, 160].map(function(y, i) {
            return h('g', { key: 'w' + i },
              h('line', { x1: 30, y1: y, x2: 100, y2: y, stroke: '#7dd3fc', strokeWidth: 2 }),
              h('polygon', { points: '102,' + y + ' 95,' + (y - 4) + ' 95,' + (y + 4), fill: '#7dd3fc' })
            );
          }),
          h('text', { x: 60, y: 30, fill: '#7dd3fc', fontSize: 12, fontWeight: 700 }, 'Wind →'),
          // Cable down tower
          h('line', { x1: 300, y1: 110, x2: 300, y2: 280, stroke: '#facc15', strokeWidth: 2, strokeDasharray: '4,3' }),
          h('text', { x: 380, y: 200, fill: '#facc15', fontSize: 11 }, 'Power cable'),
          h('text', { x: 380, y: 215, fill: '#facc15', fontSize: 11 }, 'to grid'),
          // Component labels with arrows
          h('text', { x: 130, y: 30, fill: '#cbe8e0', fontSize: 11 }, '1. Blades capture kinetic energy'),
          h('text', { x: 410, y: 65, fill: '#cbe8e0', fontSize: 11 }, '2. Hub + low-speed shaft'),
          h('text', { x: 410, y: 80, fill: '#fbbf24', fontSize: 11 }, '3. Gearbox (× ~80)'),
          h('text', { x: 410, y: 95, fill: '#22c55e', fontSize: 11 }, '4. Generator'),
          h('text', { x: 410, y: 115, fill: '#cbe8e0', fontSize: 11 }, '5. Yaw drive aims at wind'),
          // Caption
          h('text', { x: 300, y: 335, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle' }, 'Power scales with v³ (cube of wind speed). Betz limit: max 59.3% extractable.')
        );
      }
      function svgGeothermalFlash() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-geo-title svg-geo-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-geo-title' }, 'Flash-steam geothermal power plant'),
          h('desc', { id: 'svg-geo-desc' }, 'Hot pressurized water is pumped up the production well. Pressure drops in the flash tank, instantly vaporizing most of it to steam. The steam spins a turbine. After condensing, the cooled water is reinjected to the reservoir.'),
          // Surface
          h('rect', { x: 0, y: 180, width: 600, height: 180, fill: '#1f2937' }),
          h('text', { x: 10, y: 170, fill: '#94a3b8', fontSize: 11 }, 'Surface'),
          // Hot rock
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#7f1d1d' }),
          h('text', { x: 300, y: 330, fill: '#fde047', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, 'Hot rock reservoir (180–300 °C)'),
          // Production well (left)
          h('rect', { x: 110, y: 180, width: 14, height: 160, fill: '#dc2626' }),
          h('text', { x: 70, y: 240, fill: '#fca5a5', fontSize: 10 }, 'Hot water'),
          h('text', { x: 70, y: 252, fill: '#fca5a5', fontSize: 10 }, 'up'),
          h('polygon', { points: '117,170 110,180 124,180', fill: '#dc2626' }),
          // Flash tank
          h('rect', { x: 100, y: 110, width: 90, height: 60, fill: '#1e3a8a', stroke: '#3b82f6', strokeWidth: 2 }),
          h('text', { x: 145, y: 135, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Flash'),
          h('text', { x: 145, y: 150, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'tank'),
          // Steam pipe to turbine
          h('line', { x1: 190, y1: 130, x2: 290, y2: 130, stroke: '#cbe8e0', strokeWidth: 4 }),
          h('text', { x: 235, y: 120, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Steam'),
          // Turbine
          h('circle', { cx: 320, cy: 130, r: 24, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 320, y: 135, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Turbine'),
          // Generator
          h('rect', { x: 360, y: 110, width: 60, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 390, y: 135, fill: '#000', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Generator'),
          // Power lines out
          h('line', { x1: 420, y1: 130, x2: 480, y2: 130, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '482,130 475,126 475,134', fill: '#facc15' }),
          h('text', { x: 510, y: 135, fill: '#facc15', fontSize: 11 }, 'To grid'),
          // Condenser cooling
          h('line', { x1: 320, y1: 154, x2: 320, y2: 200, stroke: '#7dd3fc', strokeWidth: 3 }),
          h('rect', { x: 295, y: 200, width: 50, height: 30, fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          h('text', { x: 320, y: 220, fill: '#fff', fontSize: 10, textAnchor: 'middle' }, 'Condenser'),
          // Injection well (right)
          h('rect', { x: 470, y: 180, width: 14, height: 160, fill: '#0e7490' }),
          h('text', { x: 495, y: 240, fill: '#7dd3fc', fontSize: 10 }, 'Cool water'),
          h('text', { x: 495, y: 252, fill: '#7dd3fc', fontSize: 10 }, 'reinjected'),
          h('line', { x1: 345, y1: 215, x2: 470, y2: 215, stroke: '#7dd3fc', strokeWidth: 2.5 }),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11 }, '1. Production well →'),
          h('text', { x: 30, y: 45, fill: '#fde047', fontSize: 11 }, '2. Flash to steam'),
          h('text', { x: 30, y: 60, fill: '#fde047', fontSize: 11 }, '3. Spin turbine'),
          h('text', { x: 30, y: 75, fill: '#fde047', fontSize: 11 }, '4. Condense + reinject'),
          h('text', { x: 300, y: 95, fill: '#cbe8e0', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, 'Flash-steam plant')
        );
      }
      function svgGshp() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-gshp-title svg-gshp-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-gshp-title' }, 'Ground-source heat pump cycle'),
          h('desc', { id: 'svg-gshp-desc' }, 'A refrigeration cycle that moves heat between the constant-temperature ground and a home. In winter, evaporator absorbs heat from the ground loop; compressor raises temperature; condenser releases heat to the home; expansion valve resets the cycle. COP 3 to 5 means 3 to 5 units of heat moved per unit of electricity used.'),
          // House outline
          h('polygon', { points: '60,160 60,80 110,40 160,80 160,160', fill: '#1e293b', stroke: '#94a3b8', strokeWidth: 2 }),
          h('rect', { x: 80, y: 100, width: 60, height: 60, fill: '#334155' }),
          h('text', { x: 110, y: 175, fill: '#fff', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Home'),
          // Ground line
          h('line', { x1: 0, y1: 200, x2: 600, y2: 200, stroke: '#92400e', strokeWidth: 2 }),
          h('rect', { x: 0, y: 200, width: 600, height: 160, fill: '#451a03' }),
          h('text', { x: 540, y: 215, fill: '#d97706', fontSize: 10 }, 'Ground (~10°C)'),
          // Ground loop pipe (U-shape buried)
          h('path', { d: 'M 250 200 L 250 320 L 350 320 L 350 200', stroke: '#7dd3fc', strokeWidth: 4, fill: 'none' }),
          h('text', { x: 300, y: 340, fill: '#7dd3fc', fontSize: 11, textAnchor: 'middle' }, 'Ground loop (water + antifreeze)'),
          // Heat pump unit (the box with the cycle)
          h('rect', { x: 220, y: 80, width: 200, height: 90, fill: '#0f172a', stroke: '#22c55e', strokeWidth: 2 }),
          h('text', { x: 320, y: 70, fill: '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 700 }, 'Heat pump unit'),
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
          h('text', { x: 200, y: 138, fill: '#fca5a5', fontSize: 10 }, 'Warm air'),
          h('text', { x: 200, y: 158, fill: '#fca5a5', fontSize: 10 }, 'to home'),
          // Electricity input
          h('line', { x1: 320, y1: 30, x2: 320, y2: 80, stroke: '#facc15', strokeWidth: 2 }),
          h('polygon', { points: '320,82 316,75 324,75', fill: '#facc15' }),
          h('text', { x: 330, y: 50, fill: '#facc15', fontSize: 11 }, '⚡ Electricity in'),
          // Caption
          h('text', { x: 300, y: 25, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'Heat pump MOVES heat — it does not generate it'),
          h('text', { x: 300, y: 360, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'COP 3–5: every 1 unit of electricity moves 3–5 units of heat into the home')
        );
      }

      // ── Hydro dam cross-section ──
      function svgHydroDam() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-hydro-title svg-hydro-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-hydro-title' }, 'Hydroelectric dam cross-section'),
          h('desc', { id: 'svg-hydro-desc' }, 'A reservoir behind a concrete dam stores water at high elevation. Water flows down through the penstock, spins a turbine, drives a generator, and exits the tailrace. Power equals density times gravity times head times flow times efficiency.'),
          // Sky
          h('rect', { x: 0, y: 0, width: 600, height: 280, fill: '#0f172a' }),
          // Dam body
          h('polygon', { points: '230,80 310,80 350,300 220,300', fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }),
          // Reservoir water (left side, high)
          h('rect', { x: 0, y: 100, width: 230, height: 200, fill: '#1e40af' }),
          h('text', { x: 100, y: 160, fill: '#dbeafe', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'Reservoir'),
          h('text', { x: 100, y: 180, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle' }, '(potential energy)'),
          // Head height arrow
          h('line', { x1: 30, y1: 110, x2: 30, y2: 290, stroke: '#facc15', strokeWidth: 1.5, strokeDasharray: '4,3' }),
          h('polygon', { points: '30,110 26,118 34,118', fill: '#facc15' }),
          h('polygon', { points: '30,290 26,282 34,282', fill: '#facc15' }),
          h('text', { x: 40, y: 200, fill: '#facc15', fontSize: 12, fontWeight: 700 }, 'Head (h)'),
          // Penstock — diagonal pipe down through the dam
          h('polygon', { points: '255,140 280,140 320,290 295,290', fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          h('text', { x: 220, y: 200, fill: '#7dd3fc', fontSize: 11 }, 'Penstock'),
          // Turbine
          h('circle', { cx: 320, cy: 290, r: 18, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 320, y: 295, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Turbine'),
          // Generator
          h('rect', { x: 350, y: 270, width: 70, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 385, y: 295, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Generator'),
          // Power lines
          h('line', { x1: 420, y1: 290, x2: 580, y2: 290, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '582,290 575,286 575,294', fill: '#facc15' }),
          h('text', { x: 500, y: 282, fill: '#facc15', fontSize: 11 }, 'To grid'),
          // Tailrace water (right, low)
          h('rect', { x: 350, y: 310, width: 250, height: 50, fill: '#1e3a8a' }),
          h('text', { x: 470, y: 340, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle' }, 'Tailrace (low elevation)'),
          // River bed (left ground)
          h('rect', { x: 0, y: 300, width: 230, height: 60, fill: '#451a03' }),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11, fontWeight: 700 }, 'Hydro power: P = ρ · g · h · Q · η'),
          h('text', { x: 30, y: 48, fill: '#cbe8e0', fontSize: 11 }, '1. Reservoir holds water at high elevation (potential energy)'),
          h('text', { x: 30, y: 62, fill: '#cbe8e0', fontSize: 11 }, '2. Penstock pipes water down — gains kinetic energy'),
          h('text', { x: 30, y: 76, fill: '#cbe8e0', fontSize: 11 }, '3. Turbine + generator convert to electricity'),
          // Caption
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Doubling either head OR flow doubles the power output')
        );
      }

      // ── CSP power tower ──
      function svgCspTower() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-csp-title svg-csp-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-csp-title' }, 'Concentrated Solar Power tower with molten salt storage'),
          h('desc', { id: 'svg-csp-desc' }, 'A field of mirrors called heliostats focuses sunlight onto a central tower receiver. Molten salt circulates through the receiver, heating to 565 degrees Celsius. Hot salt is stored in an insulated tank. Demand-side, hot salt flows through a heat exchanger to make steam, which spins a turbine and generator. Cold salt returns to a second tank to be reheated.'),
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
          h('text', { x: 220, y: 90, fill: '#fde047', fontSize: 11, fontWeight: 700 }, 'Heliostat field (1000s of mirrors)'),
          // Tower
          h('rect', { x: 460, y: 100, width: 20, height: 180, fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }),
          // Receiver at top of tower
          h('circle', { cx: 470, cy: 100, r: 16, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 2 }),
          h('text', { x: 470, y: 105, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, '565°C'),
          h('text', { x: 470, y: 80, fill: '#fca5a5', fontSize: 11, textAnchor: 'middle' }, 'Receiver'),
          // Hot salt tank (right side, red)
          h('rect', { x: 510, y: 140, width: 60, height: 50, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 2 }),
          h('text', { x: 540, y: 165, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Hot salt'),
          h('text', { x: 540, y: 180, fill: '#fff', fontSize: 9, textAnchor: 'middle' }, '(storage)'),
          // Cold salt tank (right side, blue)
          h('rect', { x: 510, y: 210, width: 60, height: 50, fill: '#1e3a8a', stroke: '#1e40af', strokeWidth: 2 }),
          h('text', { x: 540, y: 235, fill: '#fff', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Cold salt'),
          // Connection: receiver → hot tank
          h('line', { x1: 480, y1: 110, x2: 510, y2: 150, stroke: '#dc2626', strokeWidth: 2.5 }),
          // Heat exchanger
          h('rect', { x: 350, y: 250, width: 60, height: 40, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 380, y: 268, fill: '#000', fontSize: 9, textAnchor: 'middle' }, 'Heat'),
          h('text', { x: 380, y: 280, fill: '#000', fontSize: 9, textAnchor: 'middle' }, 'exchanger'),
          // Hot salt pipe to heat exchanger
          h('line', { x1: 510, y1: 165, x2: 410, y2: 260, stroke: '#dc2626', strokeWidth: 2 }),
          // Cold salt pipe back
          h('line', { x1: 410, y1: 280, x2: 510, y2: 230, stroke: '#1e3a8a', strokeWidth: 2 }),
          // Turbine + generator
          h('circle', { cx: 250, cy: 270, r: 18, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 250, y: 274, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Turbine'),
          h('rect', { x: 180, y: 250, width: 50, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 205, y: 275, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Gen.'),
          // Steam line
          h('line', { x1: 350, y1: 270, x2: 270, y2: 270, stroke: '#cbe8e0', strokeWidth: 3 }),
          h('text', { x: 310, y: 260, fill: '#cbe8e0', fontSize: 10, textAnchor: 'middle' }, 'Steam'),
          // Power out
          h('line', { x1: 180, y1: 270, x2: 80, y2: 270, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '78,270 85,266 85,274', fill: '#facc15' }),
          h('text', { x: 120, y: 262, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, 'To grid'),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'CSP power tower with thermal energy storage'),
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Hot salt can run the turbine for 6–10 hours after sunset')
        );
      }

      // ── Wave Oscillating Water Column (OWC) ──
      function svgWaveOwc() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-owc-title svg-owc-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-owc-title' }, 'Oscillating water column wave-energy converter'),
          h('desc', { id: 'svg-owc-desc' }, 'A partly submerged chamber traps a column of air above the rising and falling sea surface. As waves push the water up and down inside the chamber, the trapped air is forced in and out through a Wells turbine — which spins the same direction regardless of which way the air flows. The turbine drives a generator.'),
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
          h('text', { x: 300, y: 175, fill: '#fde047', fontSize: 11, fontWeight: 700 }, 'Water rises/falls'),
          // Air column above water
          h('rect', { x: 280, y: 80, width: 100, height: 150, fill: 'none', stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4,3' }),
          h('text', { x: 330, y: 130, fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' }, 'Air column'),
          h('text', { x: 330, y: 145, fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' }, '(compressed)'),
          // Wells turbine in roof
          h('circle', { cx: 330, cy: 70, r: 18, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 330, y: 65, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'Wells'),
          h('text', { x: 330, y: 78, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'turbine'),
          // Air flow arrows in/out turbine
          h('line', { x1: 330, y1: 80, x2: 330, y2: 50, stroke: '#7dd3fc', strokeWidth: 2 }),
          h('polygon', { points: '330,50 326,58 334,58', fill: '#7dd3fc' }),
          h('text', { x: 350, y: 50, fill: '#7dd3fc', fontSize: 10 }, 'Air ↕'),
          // Generator
          h('rect', { x: 410, y: 60, width: 60, height: 30, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 440, y: 80, fill: '#000', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Generator'),
          h('line', { x1: 348, y1: 70, x2: 410, y2: 75, stroke: '#cbd5e1', strokeWidth: 2 }),
          // Power line
          h('line', { x1: 470, y1: 75, x2: 580, y2: 75, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '582,75 575,71 575,79', fill: '#facc15' }),
          h('text', { x: 525, y: 67, fill: '#facc15', fontSize: 11, textAnchor: 'middle' }, 'To grid'),
          // Wave coming in arrow
          h('line', { x1: 30, y1: 240, x2: 180, y2: 240, stroke: '#7dd3fc', strokeWidth: 2 }),
          h('polygon', { points: '182,240 175,236 175,244', fill: '#7dd3fc' }),
          h('text', { x: 100, y: 230, fill: '#7dd3fc', fontSize: 11 }, 'Incoming wave →'),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'Oscillating water column (OWC)'),
          h('text', { x: 300, y: 340, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Wells turbine spins the SAME direction whether air flows in OR out — clever bidirectional design')
        );
      }

      // ── Anaerobic biogas digester ──
      function svgDigester() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-dig-title svg-dig-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-dig-title' }, 'Anaerobic digester biogas system'),
          h('desc', { id: 'svg-dig-desc' }, 'Food waste, manure, or sewage enters a sealed tank where bacteria break it down without oxygen. The tank produces biogas — about 60 percent methane — which is burned in a generator or upgraded to pipeline-grade renewable natural gas. The leftover digestate is high-quality fertilizer.'),
          // Ground
          h('rect', { x: 0, y: 280, width: 600, height: 80, fill: '#451a03' }),
          // Feedstock pile (left)
          h('polygon', { points: '40,280 100,280 90,230 50,230', fill: '#92400e', stroke: '#451a03', strokeWidth: 2 }),
          h('text', { x: 70, y: 220, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' }, 'Feedstock'),
          h('text', { x: 70, y: 232, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, '(food/manure)'),
          // Input pipe to digester
          h('line', { x1: 100, y1: 250, x2: 200, y2: 200, stroke: '#7dd3fc', strokeWidth: 4 }),
          h('polygon', { points: '202,200 195,196 195,206', fill: '#7dd3fc' }),
          // Digester tank (large dome)
          h('ellipse', { cx: 290, cy: 200, rx: 100, ry: 80, fill: '#16a34a', stroke: '#14532d', strokeWidth: 3 }),
          h('text', { x: 290, y: 195, fill: '#dcfce7', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'Sealed digester tank'),
          h('text', { x: 290, y: 215, fill: '#dcfce7', fontSize: 11, textAnchor: 'middle' }, '(no oxygen)'),
          h('text', { x: 290, y: 232, fill: '#dcfce7', fontSize: 9, textAnchor: 'middle', fontStyle: 'italic' }, 'Bacteria + 35–55 °C'),
          // Bubble decoration showing methane production
          h('circle', { cx: 250, cy: 170, r: 4, fill: '#facc15' }),
          h('circle', { cx: 280, cy: 160, r: 5, fill: '#facc15' }),
          h('circle', { cx: 310, cy: 165, r: 3, fill: '#facc15' }),
          h('circle', { cx: 330, cy: 175, r: 4, fill: '#facc15' }),
          // Biogas pipe up
          h('line', { x1: 290, y1: 120, x2: 290, y2: 60, stroke: '#facc15', strokeWidth: 4 }),
          h('text', { x: 310, y: 90, fill: '#facc15', fontSize: 11, fontWeight: 700 }, 'Biogas (~60% CH₄)'),
          // Generator
          h('rect', { x: 360, y: 40, width: 80, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 400, y: 65, fill: '#000', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Gen-set'),
          h('line', { x1: 290, y1: 60, x2: 360, y2: 60, stroke: '#facc15', strokeWidth: 3 }),
          // Power out
          h('line', { x1: 440, y1: 60, x2: 570, y2: 60, stroke: '#fde047', strokeWidth: 2.5 }),
          h('polygon', { points: '572,60 565,56 565,64', fill: '#fde047' }),
          h('text', { x: 505, y: 50, fill: '#fde047', fontSize: 11, textAnchor: 'middle' }, 'Electricity + heat'),
          // Digestate output
          h('line', { x1: 380, y1: 260, x2: 480, y2: 280, stroke: '#92400e', strokeWidth: 4 }),
          h('polygon', { points: '480,278 480,290 472,283', fill: '#92400e' }),
          h('rect', { x: 480, y: 280, width: 80, height: 30, fill: '#a16207', stroke: '#78350f', strokeWidth: 1 }),
          h('text', { x: 520, y: 300, fill: '#fff', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Digestate'),
          h('text', { x: 520, y: 325, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, '(fertilizer)'),
          // Step labels
          h('text', { x: 30, y: 30, fill: '#fde047', fontSize: 11, fontWeight: 700 }, 'Anaerobic digestion: capture methane that would otherwise leak'),
          h('text', { x: 30, y: 48, fill: '#cbe8e0', fontSize: 11 }, '1. Feedstock in (food waste, manure, sewage)'),
          h('text', { x: 30, y: 62, fill: '#cbe8e0', fontSize: 11 }, '2. Bacteria digest in sealed warm tank'),
          h('text', { x: 30, y: 76, fill: '#cbe8e0', fontSize: 11 }, '3. Biogas → generator OR upgrade to pipeline gas'),
          h('text', { x: 30, y: 90, fill: '#cbe8e0', fontSize: 11 }, '4. Digestate out as fertilizer'),
          // Caption
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Methane is ~84× worse than CO₂ over 20 yr — burning it is a NET WIN')
        );
      }

      // ── Pumped hydro storage cycle ──
      function svgPumpedHydro() {
        return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
          role: 'img', 'aria-labelledby': 'svg-ph-title svg-ph-desc',
          style: { background: '#0b1426', borderRadius: 8 } },
          h('title', { id: 'svg-ph-title' }, 'Pumped hydro energy storage'),
          h('desc', { id: 'svg-ph-desc' }, 'Pumped hydro stores electricity by pumping water from a low reservoir up to a high reservoir when power is cheap. When power is needed, the water flows back down through a reversible pump-turbine that drives a generator. Round-trip efficiency 75 to 85 percent. About 95 percent of the world installed grid storage is pumped hydro.'),
          // Sky
          h('rect', { x: 0, y: 0, width: 600, height: 360, fill: '#0f172a' }),
          // Mountain (the geographic asset)
          h('polygon', { points: '120,260 330,80 540,260', fill: '#475569', stroke: '#1f2937', strokeWidth: 2 }),
          // Upper reservoir (top)
          h('rect', { x: 270, y: 80, width: 120, height: 30, fill: '#1e3a8a' }),
          h('path', { d: 'M 270 85 Q 300 78 330 85 Q 360 92 390 85', stroke: '#7dd3fc', strokeWidth: 1.5, fill: 'none' }),
          h('text', { x: 330, y: 75, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Upper reservoir'),
          // Lower reservoir (bottom)
          h('rect', { x: 80, y: 290, width: 440, height: 50, fill: '#1e40af' }),
          h('path', { d: 'M 80 295 Q 150 285 220 295 Q 290 305 360 295 Q 430 285 520 295', stroke: '#7dd3fc', strokeWidth: 1.5, fill: 'none' }),
          h('text', { x: 300, y: 320, fill: '#bfdbfe', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Lower reservoir'),
          // Penstock (diagonal pipe through mountain)
          h('polygon', { points: '320,110 360,110 460,290 420,290', fill: '#0e7490', stroke: '#155e75', strokeWidth: 2 }),
          // Reversible pump-turbine
          h('circle', { cx: 440, cy: 290, r: 22, fill: '#facc15', stroke: '#92400e', strokeWidth: 2 }),
          h('text', { x: 440, y: 287, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'Reversible'),
          h('text', { x: 440, y: 297, fill: '#000', fontSize: 8, textAnchor: 'middle', fontWeight: 700 }, 'pump-turbine'),
          // Generator/motor
          h('rect', { x: 470, y: 270, width: 70, height: 40, fill: '#22c55e', stroke: '#166534', strokeWidth: 2 }),
          h('text', { x: 505, y: 287, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'Motor /'),
          h('text', { x: 505, y: 298, fill: '#000', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, 'generator'),
          // CHARGING arrows (water flows UP)
          h('line', { x1: 360, y1: 270, x2: 340, y2: 130, stroke: '#7dd3fc', strokeWidth: 2.5, strokeDasharray: '5,3' }),
          h('polygon', { points: '340,130 336,140 344,140', fill: '#7dd3fc' }),
          h('text', { x: 220, y: 175, fill: '#7dd3fc', fontSize: 11, fontWeight: 700 }, 'CHARGING:'),
          h('text', { x: 220, y: 190, fill: '#7dd3fc', fontSize: 10 }, '(cheap solar @ noon)'),
          h('text', { x: 220, y: 205, fill: '#7dd3fc', fontSize: 10 }, 'Pump water UP'),
          // DISCHARGING arrows (water flows DOWN)
          h('line', { x1: 360, y1: 145, x2: 380, y2: 285, stroke: '#facc15', strokeWidth: 2.5 }),
          h('polygon', { points: '380,285 376,275 384,275', fill: '#facc15' }),
          h('text', { x: 460, y: 175, fill: '#facc15', fontSize: 11, fontWeight: 700 }, 'DISCHARGING:'),
          h('text', { x: 460, y: 190, fill: '#facc15', fontSize: 10 }, '(evening peak demand)'),
          h('text', { x: 460, y: 205, fill: '#facc15', fontSize: 10 }, 'Water flows DOWN'),
          // Power line
          h('line', { x1: 540, y1: 290, x2: 590, y2: 290, stroke: '#fde047', strokeWidth: 2.5 }),
          h('text', { x: 555, y: 280, fill: '#fde047', fontSize: 11 }, 'Grid'),
          // Caption
          h('text', { x: 300, y: 30, fill: '#cbe8e0', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'Pumped hydro storage — the original grid battery'),
          h('text', { x: 300, y: 350, fill: '#cbe8e0', fontSize: 11, textAnchor: 'middle' }, 'Round-trip efficiency 75–85%. ~95% of the world\'s installed grid storage.')
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
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('🔬 Diagrams'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Labeled cross-sections of how four common renewable systems actually work. Switch tabs to compare designs.'),
          h('div', { role: 'tablist', 'aria-label': 'Schematic diagrams',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            DIAGRAM_TABS.map(function(t) {
              var picked = current === t.id;
              return h('button', { key: t.id, role: 'tab',
                'aria-selected': picked ? 'true' : 'false',
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
          h('div', { role: 'tabpanel',
            style: { padding: 12, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { width: '100%', maxWidth: 920, margin: '0 auto', aspectRatio: '600 / 360' } }, svg),
            h('p', { style: { margin: '12px 4px 0', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, caption)
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
            'These are simplified schematics for learning. Real plants have additional safety, control, and efficiency systems (cooling, lubrication, transformers, switchgear, protection relays, SCADA). Use these to build intuition; consult engineering references for design.'),
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'The bedrock fact about electricity'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, 'Generation must equal consumption every single second.'),
              ' Electricity in the grid travels at ~⅔ the speed of light and there is essentially no buffer. If a power plant trips offline, frequency drops within seconds; if a city loses load, frequency rises. Grid operators run a perpetual real-time balancing act.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'For most of grid history, "balancing" meant adjusting a few large dispatchable plants. As wind + solar grow, the grid is becoming a million-piece orchestra instead of a string quartet — and ',
              h('strong', { style: { color: T.text } }, 'smart-grid technology'),
              ' is the conductor.')
          ),
          SMART_GRID_CONCEPTS.map(function(c) {
            return h('div', { key: c.id, style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.icon),
                h('h3', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, c.title)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.text } }, 'What it is: '), c.what),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.text } }, 'Who runs it: '), c.who),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
                h('strong', { style: { color: T.accentHi } }, 'Why it matters: '), c.why)
            );
          }),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px dashed ' + T.accent, marginTop: 10 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '🎯 Big takeaway'),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              'A high-renewable future depends just as much on smart-grid software, transmission, and demand-side flexibility as it does on the next solar farm or wind turbine. The "boring" infrastructure pieces are where most of the engineering happens.')
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
              'Renewable energy spans every level of training: high-school cert programs, 2-year community college, apprenticeships, 4-year engineering degrees, graduate research, policy work. Salaries from BLS OEWS 2024 medians; growth projections from BLS 2022–2032 outlook. Local Maine pipelines highlighted.')
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
                  h('strong', { style: { color: T.accent } }, '💵 Salary: '), c.salary),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                  h('strong', { style: { color: T.warm } }, '📈 Outlook: '), c.growth),
                h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 4, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.text } }, '🎓 How to get there: '), c.edu),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.text } }, '📍 Where: '), c.where)
              );
            })
          ),
          h('div', { style: { marginTop: 18, padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🌲 Maine training pipeline'),
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
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, '🔗 Pair with'),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              'AlloFlow ', h('strong', { style: { color: T.text } }, 'AlloBot Sage'),
              ' uses retrieval-practice combat to drill terminology + facts from this tool — useful for kids who want career-skill "credits" before transcripts catch up.')
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Heat pumps don\'t generate heat — they MOVE it'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } }, hp.intro)
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '⚡ The COP magic trick'),
            h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 } }, hp.cop)
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, 'Four flavors of heat pump'),
            hp.types.map(function(t) {
              return h('div', { key: t.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('h4', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, t.name),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                  h('strong', { style: { color: T.text } }, 'How: '), t.how),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, fontSize: 11, color: T.dim, marginBottom: 6 } },
                  h('div', null, h('strong', { style: { color: T.warm } }, 'COP: '), t.cop),
                  h('div', null, h('strong', { style: { color: T.accent } }, 'Cost: '), t.cost)),
                h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic' } },
                  h('strong', { style: { color: T.text, fontStyle: 'normal' } }, 'Best for: '), t.best)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🧐 Common myths'),
            hp.myths.map(function(m, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: T.warm, marginBottom: 4 } }, '❌ ', h('span', { style: { color: T.text } }, m.myth)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.accentHi } }, '✓ Truth: '), m.truth)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🔌 Pairing with renewables'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              hp.integration.map(function(line, i) { return h('li', { key: i, style: { marginBottom: 4 } }, line); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, '🌲 Maine: the heat-pump capital'),
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
            '16 famous renewable installations across all 8 sources. Capacities are nameplate (rated max). Filter to compare across one source or browse all.'),
          h('div', { role: 'group', 'aria-label': 'Filter plants by source type',
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
              ? [h('div', { key: 'empty', style: { padding: 24, color: T.dim, fontStyle: 'italic', textAlign: 'center', gridColumn: '1 / -1' } }, 'No plants in this filter.')]
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Hydrogen 101'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Hydrogen (H₂) is an energy ',
              h('strong', { style: { color: T.text } }, 'carrier'),
              ', not an energy ',
              h('strong', { style: { color: T.text } }, 'source'),
              '. You spend energy to make it; you get energy back when you burn it or run it through a fuel cell. Whether that\'s clean depends entirely on HOW you made it — hence the color codes.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              h('strong', { style: { color: T.accentHi } }, 'Critical fact: '),
              '~95% of hydrogen produced today is "gray" — made from natural gas with NO carbon capture. The "hydrogen economy" pitch usually means switching to GREEN hydrogen, which is a much smaller current reality.')
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🎨 The color taxonomy'),
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
                  h('strong', null, '⚖ Verdict: '), c.verdict)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🎯 Where hydrogen actually makes sense'),
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, '💡 Five things worth remembering'),
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'The energy transition is technical AND political'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Every other module in this lab focuses on the engineering — the physics of how each source generates electricity. This page asks the harder questions: ',
              h('strong', { style: { color: T.accentHi } }, 'who pays, who profits, who loses, who decides.'),
              ' These outcomes are not natural consequences of physics. They are choices, made by people, with very different stakes for different communities.'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'The transition CAN be designed to reduce the historical injustices of the fossil economy. Or it can repeat them. Both paths are technically possible.')
          ),
          JUSTICE_TOPICS.map(function(t) {
            return h('div', { key: t.id, style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, t.icon),
                h('h3', { style: { margin: 0, fontSize: 15, color: T.accentHi } }, t.title)),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 } },
                h('strong', { style: { color: T.text } }, '⓵ What it is: '), t.what),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 8 } },
                h('strong', { style: { color: T.text } }, '⓶ Who is affected: '), t.who),
              h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
                h('strong', { style: { color: T.accent } }, '⓷ What action looks like: '), t.action),
              h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                'Source: ', t.source)
            );
          }),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.accent, marginTop: 6 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, '🌐 Cross-link: this is connected to'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, 'Climate Explorer'), ' — the climate-justice map and the design-a-renewable-mix sim go deeper on policy + impact.'),
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, 'Civic Action / Rights & Dissent'), ' — when these issues escalate to policy, civic engagement is how decisions get made.'),
              h('li', null, 'AlloFlow ', h('strong', { style: { color: T.accentHi } }, 'Fire Ecology'), ' — Indigenous fire stewardship is a model for how Indigenous-led environmental management actually works.')
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
        return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          backBar('🎓 Teacher Guide'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'This is a resource page for educators. NGSS alignment per source, discussion prompts, hands-on activities, and pacing suggestions for unit planning.')
          ),
          // NGSS alignment table
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📐 NGSS standards alignment'),
            h('table', { 'aria-label': 'NGSS standards alignment per module',
              style: { width: '100%', minWidth: 540, borderCollapse: 'collapse', fontSize: 12 } },
              h('thead', null,
                h('tr', { style: { background: T.cardAlt } },
                  h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi, borderBottom: '2px solid ' + T.border } }, 'Module'),
                  h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi, borderBottom: '2px solid ' + T.border } }, 'Standards'))),
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
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '💬 Discussion prompts'),
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
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🛠️ Hands-on activities'),
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
                    'aria-label': a.name + ' resource link (opens in new tab)' }, '→ Open resource'));
              })
            )
          ),
          // Pacing suggestions
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🗓️ Suggested pacing'),
            TEACHER_PACING.map(function(p) {
              return h('div', { key: p.id, style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, marginBottom: 8 } },
                h('strong', { style: { color: T.accentHi, fontSize: 13 } }, p.label),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 4 } }, p.sequence)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.border } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '📚 More teacher resources'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              h('li', null, h('a', { href: 'https://www.need.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'NEED Project'), ' — free K-12 energy curriculum + teacher PD'),
              h('li', null, h('a', { href: 'https://www.kidwind.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'KidWind'), ' — turbine kits, lesson plans, annual challenge competition'),
              h('li', null, h('a', { href: 'https://www.pbslearningmedia.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'PBS LearningMedia — Energy'), ' — standards-aligned video + activities'),
              h('li', null, h('a', { href: 'https://www.energy.gov/eere/education/energy-literacy-essential-principles-energy-education', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'DOE Energy Literacy'), ' — 7 essential principles framework'),
              h('li', null, h('a', { href: 'https://www.maine.gov/education/learning/standards', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'Maine Learning Results'), ' — Maine\'s state science standards (MLR adopt NGSS as a base)')
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
                  h('strong', { style: { color: T.text } }, '⓵ How: '), a.how),
                h('div', { style: { fontSize: 12, color: T.accentHi, lineHeight: 1.55, marginBottom: a.url ? 4 : 0 } },
                  h('strong', null, '⓶ Why it matters: '), a.impact),
                a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                  style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                  'aria-label': a.what + ' — open resource (new tab)' }, '→ Open resource')
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          backBar('🌱 Take Action'),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'From knowledge to agency'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Knowing how solar panels work doesn\'t change anything by itself. The transition happens when millions of people make small decisions in the same direction. Here are concrete actions at four scales — pick what fits your time and energy.'),
            h('p', { style: { margin: 0, color: T.warm, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } }, ACTION_BANNERS.starter)
          ),
          actionList('🏠 At home', 'Where you live, every day. Smallest unit; quickest feedback.', TAKE_ACTION.home),
          actionList('🏫 At school', 'School is a system you can study + influence as a student.', TAKE_ACTION.school),
          actionList('🌲 In your community', null, TAKE_ACTION.community),
          actionList('🏛️ In civic life', 'Public-comment periods + ballots are the low-traffic ways most decisions get made.', TAKE_ACTION.civic),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px dashed ' + T.accent } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, '🎯 Maine students: a starter combo'),
            h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
              'Pick ONE from each scale: ',
              h('strong', { style: { color: T.text } }, 'home'), ': swap to LEDs + smart strips. ',
              h('strong', { style: { color: T.text } }, 'school'), ': join (or start) the environment club + propose a Kill-A-Watt audit. ',
              h('strong', { style: { color: T.text } }, 'community'), ': your family books an Efficiency Maine assessment. ',
              h('strong', { style: { color: T.text } }, 'civic'), ': pick ONE Maine PUC docket per semester and file a 1-paragraph comment. ',
              'Cumulative effect over 4 years: a measurable carbon footprint, a transcript-worthy STEM track, and a civic muscle most adults never build.')
          ),
          h('div', { style: { marginTop: 10, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🔗 Want depth on civic action?'),
            ' AlloFlow ',
            h('strong', { style: { color: T.text } }, 'Civic Action / Rights & Dissent'),
            ' goes deeper on how to write effective public comments, plan a school-board ask, run a campaign, and what counts as protected speech vs. trespass. Useful before your first PUC filing or board appearance.'),
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
            rnAnnounce('Print pack opened in a new tab. Use your browser\'s File then Print menu.');
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
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Build a printable handout'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
              'Pick what you want included. The "Generate" button opens a clean printable HTML view in a new browser tab — use your browser\'s ',
              h('strong', { style: { color: T.text } }, 'File → Print'),
              ' menu to print or save as PDF. Useful for sub-day worksheets, lesson handouts, or quiz / answer-key bundles.')
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, '✅ Sections to include'),
            h('div', { role: 'group', 'aria-label': 'Sections to include in print pack' },
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
                  rnAnnounce('All sections selected');
                },
                style: btn({ padding: '6px 12px', fontSize: 12 })
              }, 'Select all'),
              h('button', { 'data-rn-focusable': true,
                onClick: function() {
                  var allOff = {};
                  PRINT_OPTIONS.forEach(function(o) { allOff[o.kind] = false; });
                  upd('printSel', allOff);
                  rnAnnounce('All sections cleared');
                },
                style: btn({ padding: '6px 12px', fontSize: 12 })
              }, 'Clear all')
            )
          ),
          h('button', { 'data-rn-focusable': true,
            'aria-label': 'Generate print pack with selected sections',
            disabled: !anySelected,
            onClick: generatePack,
            style: btnPrimary({ width: '100%', padding: '12px 16px', fontSize: 14, opacity: anySelected ? 1 : 0.6 })
          }, '🖨 Generate Print Pack'),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 12, color: T.dim, lineHeight: 1.6 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 4 } }, 'Print pack tips'),
            h('ul', { style: { margin: 0, paddingLeft: 18 } },
              h('li', null, 'For a sub-day handout: pick "Source-module key facts" + "Comparison table" + "Quiz" — fits on 4–6 pages.'),
              h('li', null, 'For a unit kickoff: add "NGSS alignment" + "Activities" — gives co-teachers a quick orientation.'),
              h('li', null, 'For a review session: pick just "Quiz" + "Answer key" — print double-sided.'),
              h('li', null, 'If your pop-up blocker prevents the new tab, the HTML auto-copies to your clipboard — paste into a Google Doc + print from there.')
            )
          ),
          footer()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      switch (view) {
        case 'solarPv':      return renderSolarPv();
        case 'wind':         return renderWind();
        case 'hydro':        return renderHydro();
        case 'geothermal':   return renderGeo();
        case 'solarThermal': return renderSolarThermal();
        case 'waveTidal':    return renderWaveTidal();
        case 'biomass':      return renderBiomass();
        case 'storage':      return renderStorage();
        case 'compare':      return renderCompare();
        case 'mix':          return renderMix();
        case 'homePayback':  return renderHomePayback();
        case 'heatPump':     return renderHeatPump();
        case 'plants':       return renderPlantTour();
        case 'hydrogen':     return renderHydrogen();
        case 'justice':      return renderJustice();
        case 'teacher':      return renderTeacher();
        case 'takeAction':   return renderTakeAction();
        case 'printPack':    return renderPrintPack();
        case 'glossary':     return renderGlossary();
        case 'myths':        return renderMyths();
        case 'nuclear':      return renderNuclear();
        case 'aiPractice':   return renderAiPractice();
        case 'diagrams':     return renderDiagrams();
        case 'smartGrid':    return renderSmartGrid();
        case 'careers':      return renderCareers();
        case 'quiz':         return renderQuiz();
        case 'resources':    return renderResources();
        case 'menu':
        default:             return renderMenu();
      }
      } catch(e) {
        console.error('[Renewables] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Renewables Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}
