// ═══════════════════════════════════════════════════════════════
// stem_tool_aquaculture.js — AquacultureLab: Mussel Farm Sim
//
// 3D immersive simulator powered by three.js (r128, lazy-loaded
// from cdnjs). Player owns a 1-acre Limited Purpose Aquaculture
// (LPA) lease on the Bagaduce River and operates a small Maine
// shellfish farm. Curriculum spans boating navigation (same as
// FisherLab — IALA-B buoyage, COLREGS, charts, narrow-channel
// piloting) and aquaculture fundamentals (site selection, water
// quality, rope culture, lease tiers, climate stress, economics).
//
// Maine-default (Bagaduce + Damariscotta) with region toggle
// (Chesapeake / PNW / Great Lakes are v1 placeholders).
//
// Sources cited inline:
//  - Maine Department of Marine Resources (DMR) Aquaculture Division
//  - Maine Aquaculture Association
//  - Maine Sea Grant
//  - Bigelow Laboratory for Ocean Sciences
//  - Island Institute (working waterfront data)
//  - Gulf of Maine Research Institute
//
// Registered tool ID: "aquacultureLab"
// Category: science (aquaculture + place-based + vocational)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('aquacultureLab'))) {

(function() {
  'use strict';

  // ─── Live region (ARIA) ───
  (function() {
    if (document.getElementById('allo-live-aq')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-aq';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function aqAnnounce(msg) {
    var lr = document.getElementById('allo-live-aq');
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }

  // ─── Tool-scoped CSS ───
  (function() {
    if (document.getElementById('aquaculturelab-css')) return;
    var s = document.createElement('style');
    s.id = 'aquaculturelab-css';
    s.textContent = [
      '.aq-btn:focus-visible { outline: 2px solid #14b8a6; outline-offset: 2px; }',
      '.aq-card { background: linear-gradient(135deg, rgba(8,30,28,0.92), rgba(4,18,18,0.92)); border: 1px solid rgba(20,184,166,0.22); border-radius: 12px; padding: 14px 16px; color: #e2e8f0; }',
      '.aq-pill { display:inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(20,184,166,0.12); color:#a7f3d0; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }',
      '@media (prefers-reduced-motion: reduce) { .aq-bob { animation: none !important; } .aq-pulse { animation: none !important; } }',
      '@keyframes aq-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }',
      '.aq-pulse { animation: aq-pulse 1.6s ease-in-out infinite; }'
    ].join('\n');
    document.head.appendChild(s);
  })();

  // ───────────────────────────────────────────────────────────
  // DATA: REGIONS
  // ───────────────────────────────────────────────────────────
  var REGIONS = {
    maine: {
      id: 'maine', label: 'Maine (Bagaduce + Damariscotta)',
      buoyage: 'IALA-B', portName: 'Bagaduce River',
      portCoords: 'Bagaduce River, Penobscot Bay · 44.4° N, 68.8° W',
      famousLeases: ['Bagaduce River', 'Damariscotta River', 'Casco Bay'],
      dmrAuthority: 'Maine Department of Marine Resources — Aquaculture Division',
      complete: true
    },
    chesapeake: {
      id: 'chesapeake', label: 'Chesapeake Bay',
      buoyage: 'IALA-B', portName: 'Tilghman Island', complete: false
    },
    pnw: {
      id: 'pnw', label: 'Pacific Northwest',
      buoyage: 'IALA-B', portName: 'Shelton, WA', complete: false
    },
    greatlakes: {
      id: 'greatlakes', label: 'Great Lakes (limited)',
      buoyage: 'IALA-B', portName: 'Apostle Islands', complete: false
    }
  };
  var DEFAULT_REGION = 'maine';

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE SPECIES
  // ───────────────────────────────────────────────────────────
  var SPECIES = [
    { id: 'mussel', name: 'Blue Mussel', sci: 'Mytilus edulis', emoji: '🪨', method: 'Rope / raft culture',
      growthMonths: '18-24 months seed to market',
      yield: '4-7 kg per meter of rope at harvest',
      marketPrice: '$1.50-$3.50/lb wholesale (Maine, 2024)',
      tempRange: '5-22°C optimal',
      salinityRange: '20-32 PSU',
      stressors: ['biofouling', 'ice damage in winter', 'sea-duck predation', 'paralytic shellfish toxin events'],
      whyMaine: 'Cold clean water + protected estuaries + tidal flushing → world-class mussels. Bagaduce + Penobscot Bay yields are legendary.',
      cite: 'Maine Aquaculture Association 2024' },
    { id: 'oyster', name: 'Eastern Oyster', sci: 'Crassostrea virginica', emoji: '🦪', method: 'Bag-on-bottom / floating cage / suspended',
      growthMonths: '24-36 months seed to market',
      yield: '50-150 oysters per cage at harvest',
      marketPrice: '$0.50-$1.20 per oyster (direct sales, Maine premium)',
      tempRange: '10-30°C tolerant, optimal 18-25°C',
      salinityRange: '14-30 PSU (wide tolerance)',
      stressors: ['MSX disease', 'Dermo disease (less in cold ME)', 'mud blister worm', 'ocean acidification on larvae'],
      whyMaine: 'Damariscotta oysters command premium prices. Damariscotta + Bagaduce + Casco Bay are major production areas.',
      cite: 'NOAA + Maine Sea Grant 2024' },
    { id: 'kelp', name: 'Sugar Kelp', sci: 'Saccharina latissima', emoji: '🌿', method: 'Longline (suspended) — winter crop',
      growthMonths: '6-9 months (Nov seed → May harvest)',
      yield: '7-15 lb per meter of line',
      marketPrice: '$0.50-$2.00/lb fresh',
      tempRange: '0-15°C (cold-water crop)',
      salinityRange: '25-35 PSU',
      stressors: ['warm spring water cuts season short', 'biofouling by bryozoans late in season', 'epiphytes'],
      whyMaine: 'Maine\'s expanding kelp industry pairs perfectly with winter season — uses same boats + leases that are idle Nov-May. Climate-positive (no inputs needed).',
      cite: 'Maine Sea Grant kelp toolkit 2023' },
    { id: 'scallop', name: 'Sea Scallop', sci: 'Placopecten magellanicus', emoji: '🐚', method: 'Lantern net (suspended)',
      growthMonths: '36-48 months seed to market',
      yield: 'Slow grower; high-value niche',
      marketPrice: '$25-$45/lb meats (premium roe-on)',
      tempRange: '4-12°C',
      salinityRange: '28-34 PSU',
      stressors: ['slow growth = long capital tie-up', 'predation by starfish', 'storm damage to suspended gear'],
      whyMaine: 'Aquaculture scallops in Maine are still small but growing. Inspired by 30+ year Japanese hanging-line method.',
      cite: 'NOAA scallop science + Hokkaido aquaculture transfer programs' },
    { id: 'softshell', name: 'Soft-shell Clam (Steamer)', sci: 'Mya arenaria', emoji: '🥄', method: 'Intertidal flat (bottom culture)',
      growthMonths: '3-4 years to legal size',
      yield: 'Bushel harvest',
      marketPrice: '$200-$400/bushel wholesale',
      tempRange: 'tolerates wide range; tidal exposure tolerant',
      salinityRange: '15-32 PSU (estuarine)',
      stressors: ['green crab predation (BIG problem in warming Gulf of Maine)', 'shore erosion', 'algal blooms', 'declining native populations'],
      whyMaine: 'Wild fishery in decline; aquaculture is one path to recovery. Town-managed in Maine — each town has clam committee.',
      cite: 'Maine DMR shellfish program 2024' },
    { id: 'razor-clam', name: 'Atlantic Razor Clam', sci: 'Ensis directus', emoji: '🥢', method: 'Wild harvest + emerging culture trials',
      growthMonths: '~3 years to harvest size in wild',
      yield: 'Premium-priced for Asian markets',
      marketPrice: '$5-$10/lb (premium)',
      tempRange: '5-22°C',
      salinityRange: '20-30 PSU',
      stressors: ['highly mobile in sediment (challenging to enclose)', 'salinity sensitivity', 'predation'],
      whyMaine: 'Native species with growing export demand. Trial aquaculture at UMaine + Bigelow.',
      cite: 'UMaine + DMR research' },
    { id: 'quahog', name: 'Hard-Shell Clam (Quahog)', sci: 'Mercenaria mercenaria', emoji: '🦪', method: 'Bottom culture / bag systems',
      growthMonths: '24-36 months to legal harvest',
      yield: 'Bushels',
      marketPrice: '$0.30-$0.60 each retail (varies by size: littleneck/cherrystone/chowder)',
      tempRange: '8-25°C', salinityRange: '20-32 PSU',
      stressors: ['green crab predation', 'sediment hypoxia', 'warming reducing southern range stress'],
      whyMaine: 'Southern Maine has reliable quahog flats. Northern Maine waters too cold for fast growth.',
      cite: 'Maine DMR' },
    { id: 'bayscallop', name: 'Bay Scallop', sci: 'Argopecten irradians', emoji: '🐚', method: 'Lantern net / mesh bags',
      growthMonths: '12-18 months (faster than sea scallop)',
      yield: 'Smaller meats than sea scallop but quick turnover',
      marketPrice: '$18-$30/lb meats',
      tempRange: '8-25°C', salinityRange: '20-32 PSU',
      stressors: ['warming + acidification on larvae', 'eelgrass decline removes nursery habitat'],
      whyMaine: 'Bay scallop populations crashed in 1980s with eelgrass decline. Now experimental aquaculture trials in S Maine + N Mass.',
      cite: 'NOAA + UMaine' },
    { id: 'urchin', name: 'Green Sea Urchin', sci: 'Strongylocentrotus droebachiensis', emoji: '🟢', method: 'Wild harvest + experimental culture',
      growthMonths: '5-7 years in wild to market size',
      yield: 'Roe ("uni") is the product — premium Asian market',
      marketPrice: '$10-$25/lb live; uni $80-$200/lb',
      tempRange: '0-12°C (cold-water species)', salinityRange: '28-34 PSU',
      stressors: ['warming Gulf of Maine reducing range', 'historic overharvest', 'urchin barrens (where they grazed away kelp)'],
      whyMaine: 'Maine\'s urchin fishery boomed in 90s + collapsed by 2000. Slow recovery; aquaculture R&D ongoing (UMaine + DMR).',
      cite: 'UMaine Center for Cooperative Aquaculture Research' },
    { id: 'kelp-winged', name: 'Winged Kelp (Maine Wakame)', sci: 'Alaria esculenta', emoji: '🌿', method: 'Longline (suspended) — alternative kelp species',
      growthMonths: '6 months (Nov seed → late spring harvest)',
      yield: '5-12 lb/m line', marketPrice: 'Premium $2-$4/lb fresh (specialty)',
      tempRange: '0-12°C', salinityRange: '28-34 PSU',
      stressors: ['warmer water = early die-back', 'similar fouling profile to sugar kelp'],
      whyMaine: 'Maine\'s second commercial kelp species. Crunchier texture than sugar kelp; premium sushi + salad markets.',
      cite: 'Maine Sea Grant' },
    { id: 'kelp-skinny', name: 'Skinny Kelp / Dulse', sci: 'Saccharina angustissima / Palmaria palmata', emoji: '🌿', method: 'Longline; dulse intertidal',
      growthMonths: '6-9 months',
      yield: 'Premium small market',
      marketPrice: 'Premium ($5-$15/lb fresh dulse)',
      tempRange: '0-15°C', salinityRange: '25-35 PSU',
      stressors: ['similar to other kelps'],
      whyMaine: 'Atlantic dulse has long Indigenous + Maritime Canadian harvest tradition. Aquaculture trials growing.',
      cite: 'Bigelow Lab + tribal sources' },
    { id: 'mussel-ribbed', name: 'Ribbed Mussel', sci: 'Geukensia demissa', emoji: '🪨', method: 'Salt-marsh hybrid; experimental',
      growthMonths: '24+ months',
      yield: 'Smaller individual; salt-marsh wild stocks',
      marketPrice: 'Limited market; experimental food + ecosystem-services',
      tempRange: '4-25°C', salinityRange: '20-30 PSU',
      stressors: ['hardy but commercial market underdeveloped'],
      whyMaine: 'Climate adaptation interest: marsh-associated mussel for nutrient capture + shoreline stabilization. Trials at UMaine.',
      cite: 'UMaine Sea Grant' },
    { id: 'finfish-cod', name: 'Atlantic Cod (Aquaculture)', sci: 'Gadus morhua', emoji: '🐟', method: 'Sea cage / RAS (recirculating aquaculture systems)',
      growthMonths: '24-36 months', yield: 'Per-fish grow-out',
      marketPrice: 'Variable; commodity competition with wild',
      tempRange: '4-12°C', salinityRange: '32-35 PSU',
      stressors: ['disease', 'price competition with wild', 'environmental footprint of cage farming', 'feed-conversion ratio'],
      whyMaine: 'Cod aquaculture was big in Norway. Maine pilots in early 2000s mostly failed economically. Land-based RAS may revive.',
      cite: 'NOAA aquaculture office' },
    { id: 'finfish-salmon', name: 'Atlantic Salmon (Aquaculture)', sci: 'Salmo salar', emoji: '🐟', method: 'Sea cage (Cooke Aquaculture) + experimental RAS',
      growthMonths: '18-24 months in saltwater',
      yield: 'Per-fish grow-out',
      marketPrice: 'Commodity-priced; large-volume operations',
      tempRange: '4-15°C', salinityRange: '30-35 PSU',
      stressors: ['sea lice (parasitic copepods)', 'disease', 'escape pollution', 'PCB + dioxin from sea-bottom buildup', 'right-whale entanglement issues'],
      whyMaine: 'Cooke Aquaculture (Cobscook Bay) is Maine\'s largest aquaculture operation. Controversial — environmental + tribal concerns. Industry shrinking; land-based RAS may replace.',
      cite: 'Maine DMR + Cooke Aquaculture + tribal communications' },
    { id: 'finfish-yellowtail', name: 'Yellowtail Flounder (RAS)', sci: 'Limanda ferruginea', emoji: '🐟', method: 'Land-based RAS',
      growthMonths: '24+ months',
      yield: 'Per-fish grow-out', marketPrice: 'Premium fresh',
      tempRange: '10-18°C', salinityRange: '32-35 PSU',
      stressors: ['high capital + energy cost for RAS', 'feed dependency'],
      whyMaine: 'Land-based marine aquaculture (RAS) is climate-resilient + biosecure. Maine has nascent industry — Whole Oceans (Bucksport).',
      cite: 'Whole Oceans + NOAA aquaculture office' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: LEASE TIERS (Maine)
  // ───────────────────────────────────────────────────────────
  var LEASE_TIERS = [
    { id: 'lpa', tier: 'LPA — Limited Purpose Aquaculture', maxAcres: '1 acre', term: '3 years', renewable: 'Yes',
      fee: 'Modest annual fee',
      requires: 'Maine resident, $50 application fee, site approval by DMR, town review.',
      whoUses: 'Entry-level farmers, demonstration projects, side income. Many Maine farms start here.',
      growLimits: 'No size limit on individual gear; just total acreage cap.',
      pubHearing: 'No public hearing required for LPA — much faster permitting.' },
    { id: 'standard', tier: 'Standard Lease', maxAcres: 'Up to 100 acres', term: '20 years', renewable: 'Yes',
      fee: 'Higher fees + DMR application + public hearing.',
      requires: 'Detailed business plan, environmental assessment, public hearing where abutters can object.',
      whoUses: 'Established farms scaling up; multi-species operations.',
      growLimits: 'Limited by acreage + gear-density rules.',
      pubHearing: 'Required — most contentious step. Abutter objections (view shed, navigation, water access) are routine.' },
    { id: 'experimental', tier: 'Experimental Lease', maxAcres: '4 acres', term: '3 years', renewable: 'No (must convert to standard)',
      fee: 'Lower than standard, higher than LPA.',
      requires: 'Affiliated with research institution OR DMR-approved new-species/new-method trial.',
      whoUses: 'Bigelow Lab, GMRI, UMaine, NOAA scientists; commercial farmers trialing new species.',
      growLimits: 'Limited by acreage + experiment scope.',
      pubHearing: 'Required.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WATER QUALITY PARAMETERS
  // ───────────────────────────────────────────────────────────
  var WATER_QUALITY = [
    { param: 'Temperature (T)', symbol: '°C', optimal: '8-18°C (mussel + oyster); <15°C (kelp)',
      effect: 'Drives growth rate AND mortality. Warm spikes in late summer kill stressed stock; cold winter freezes ice damage gear.',
      monitor: 'Continuous (datalogger).',
      action: 'If T > 22°C for >3 days, lower socks deeper if possible.' },
    { param: 'Salinity (S)', symbol: 'PSU', optimal: '20-32 PSU (mussels); 14-30 PSU (oyster)',
      effect: 'Freshwater pulse after heavy rain stresses + kills shellfish in estuaries.',
      monitor: 'Daily during spring rain events.',
      action: 'Move stock to deeper / more saline water if possible during rainfall.' },
    { param: 'Dissolved Oxygen (DO)', symbol: 'mg/L', optimal: '>6 mg/L',
      effect: 'Bivalves filter water; DO depletion in dense beds during warm calm = mass mortality.',
      monitor: 'Daily in summer; continuous during heatwaves.',
      action: 'Thin density. Aeration not practical at sea scale.' },
    { param: 'pH', symbol: '—', optimal: '7.8-8.2',
      effect: 'Ocean acidification (declining pH) dissolves larval shells before they can form. Hatchery work-around: buffered water until shell formed.',
      monitor: 'Weekly in season; coordinate with Bigelow / NERACOOS.',
      action: 'Hatchery-sourced seed if pH < 7.8 events frequent.' },
    { param: 'Chlorophyll-a', symbol: 'µg/L', optimal: '2-15 µg/L',
      effect: 'Proxy for phytoplankton — the food. Too low = slow growth. Too high (>30) = potential HAB (harmful algal bloom).',
      monitor: 'Weekly during bloom season (Mar-Oct).',
      action: 'Check DMR shellfish-closure bulletins. Closed shore = no harvest.' },
    { param: 'Turbidity', symbol: 'NTU', optimal: '<20 NTU',
      effect: 'Heavy sediment clogs gills + smothers seed. Common after storms or upstream erosion.',
      monitor: 'After storms.',
      action: 'Wait for sediment to settle; rinse gear if needed.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BUOYAGE + COLREGS — same content as FisherLab
  // ───────────────────────────────────────────────────────────
  var BUOYAGE_LATERAL = [
    { type: 'nun', color: 'red', shape: 'conical', side: 'right when entering harbor',
      meaning: 'Red-right-returning. In Region B (Americas), keep red on your starboard when heading into harbor.',
      numbering: 'Even numbers, increasing toward port.', light: 'Red flashing' },
    { type: 'can', color: 'green', shape: 'cylindrical', side: 'left when entering harbor',
      meaning: 'Green-left-returning. Keep green on your port when heading into harbor.',
      numbering: 'Odd numbers, increasing toward port.', light: 'Green flashing' }
  ];

  var COLREGS = [
    { rule: 'Rule 5', title: 'Look-out', plain: 'Maintain a proper look-out by sight + hearing at all times.' },
    { rule: 'Rule 6', title: 'Safe Speed', plain: 'Speed must allow effective avoiding action + stopping. Slow in fog.' },
    { rule: 'Rule 13', title: 'Overtaking', plain: 'Overtaking vessel must keep clear of the overtaken vessel — always.' },
    { rule: 'Rule 14', title: 'Head-on', plain: 'Two power vessels head-on: both turn to starboard, pass port-to-port.' },
    { rule: 'Rule 15', title: 'Crossing', plain: 'Vessel with other on starboard side gives way.' },
    { rule: 'Rule 18', title: 'Hierarchy', plain: 'Power gives way to sail; both give way to fishing vessels; all give way to vessels not under command.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ECONOMICS — starter farm cost calculator
  // ───────────────────────────────────────────────────────────
  var ECONOMICS = {
    startup: [
      { item: 'LPA permit + DMR application', cost: 250, recurring: 'annual modest' },
      { item: 'Skiff (used 18-20 ft)', cost: 12000, recurring: '$1500/yr maintenance + fuel' },
      { item: 'Outboard motor', cost: 6000, recurring: '$500/yr service' },
      { item: 'Longline gear (anchors, main line, droppers)', cost: 4000, recurring: '~$500/yr replacement' },
      { item: 'Mussel seed (initial)', cost: 1500, recurring: '$1500/yr' },
      { item: 'PFDs, foul-weather gear, gloves, etc.', cost: 800, recurring: '$300/yr' },
      { item: 'Mooring + dock fees', cost: 600, recurring: 'annual' }
    ],
    revenue: {
      yearOne: 'Mostly zero — seed-out year. Maybe some half-grown mussels by month 12.',
      yearTwo: '$10,000-$25,000 gross on a 1-acre LPA mussel farm (highly variable).',
      yearThree: '$15,000-$35,000 gross if biofouling + winter ice are managed.'
    },
    notes: [
      'Net (after costs) is much smaller than gross — fuel, gear replacement, time.',
      'Side-by-side lobstering is common; the seasons stack well (mussel work peaks fall-winter, lobster peaks summer).',
      'Direct-to-consumer (farmers market, restaurant) doubles your effective price vs. wholesale.'
    ]
  };

  // ───────────────────────────────────────────────────────────
  // DATA: CAREERS
  // ───────────────────────────────────────────────────────────
  var CAREERS = [
    { id: 'farmer', title: 'Shellfish Farmer / Operator',
      desc: 'Owns LPA or standard lease; manages seed-to-harvest cycle on a small farm.',
      training: 'On-the-job; many farmers learned from sternman + apprenticeship-style starts.',
      pay: 'Highly variable — $20K-$200K gross depending on scale + species + market.',
      future: 'Industry expanding in Maine (Maine Aquaculture Association: 2x growth in active operations since 2015).' },
    { id: 'hatchery', title: 'Hatchery Technician',
      desc: 'Spawns broodstock, conditions seed, manages larval tanks.',
      training: 'Certificate or AS in aquaculture; UMaine + community college programs exist.',
      pay: '$32K-$55K full-time. Seasonal hatchery spikes pay more.',
      future: 'Key chokepoint — Maine hatcheries are oversubscribed.' },
    { id: 'extension', title: 'Marine Extension Agent',
      desc: 'University + Sea Grant outreach to farmers; troubleshoots water-quality + disease.',
      training: 'MS in aquaculture / biology + practical experience.',
      pay: '$50K-$80K (university scale).',
      future: 'Maine Sea Grant employs several. Networked across coast.' },
    { id: 'dmrAquaCoord', title: 'DMR Aquaculture Coordinator',
      desc: 'Reviews lease applications, mediates abutter disputes, enforces gear marking + density rules.',
      training: 'BS biology/policy + state hiring.',
      pay: '$55K-$80K + state benefits.',
      future: 'Growing role — Maine\'s lease pipeline is busy.' },
    { id: 'processor', title: 'Shellfish Processor / Distributor',
      desc: 'Shoreside grading, depuration, packaging, cold chain to market.',
      training: 'HACCP food safety cert + on-the-job.',
      pay: '$18-$30/hr; managers $55K+.',
      future: 'Direct-to-consumer + value-add (smoked, frozen) growing.' },
    { id: 'kelpProcessor', title: 'Kelp Processor / Value-add',
      desc: 'Cuts, blanches, freezes, sells fresh + dried + powdered kelp products.',
      training: 'Food-handling cert; product-development skill.',
      pay: 'Variable — entrepreneurial. Atlantic Sea Farms is industry anchor.',
      future: 'Emerging Maine industry — climate-friendly story drives consumer demand.' },
    { id: 'rasOp', title: 'Land-based RAS Operator',
      desc: 'Runs recirculating aquaculture systems (Whole Oceans, etc.). Monitors water chemistry + biofilters + fish health continuously.',
      training: 'Aquaculture cert or degree; HVAC + electrical experience helpful.',
      pay: '$45K-$70K; salary + benefits',
      future: 'Whole Oceans (Bucksport, ME) is opening one of the world\'s largest RAS facilities. Industry expanding rapidly globally.' },
    { id: 'spat-supplier', title: 'Seed / Spat Supplier',
      desc: 'Spawns broodstock, settles spat on cultch, sells to growers. Specialized hatchery role.',
      training: 'Aquaculture degree; reproductive biology + spawning protocols.',
      pay: '$40K-$70K depending on operation size.',
      future: 'Critical Maine industry chokepoint — hatcheries are oversubscribed. Mook Sea Farms is THE oyster seed supplier for Northeast.' },
    { id: 'diver', title: 'Commercial Aquaculture Diver',
      desc: 'Underwater work: gear inspection, harvest assist, anchor inspection, urchin / cucumber / scallop harvesting.',
      training: 'Commercial diving cert + USCG endorsements + scuba advanced.',
      pay: '$25-$50/hr; project work.',
      future: 'Niche role; aging workforce. Maine has very limited supply.' },
    { id: 'shellfish-officer', title: 'Local Shellfish Warden / Officer',
      desc: 'Town-level enforcement of soft-shell clam + shellfish flat regulations. Issues commercial + recreational permits.',
      training: 'Town-level appointment; some training from Maine DMR.',
      pay: 'Often a town part-time role; some full-time in larger towns.',
      future: 'Critical for managing town clam flats — protects local resource + access.' },
    { id: 'sales-marketing', title: 'Direct-to-Consumer Sales / Brand',
      desc: 'Farmers-market presence, restaurant accounts, e-commerce, story-driven marketing of Maine shellfish.',
      training: 'No formal credential. Storytelling + food-safety basics + business skill.',
      pay: 'Variable — entrepreneurial. Doubles farm-gate prices when done well.',
      future: 'Growing — consumers want to know where their food comes from.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: HATCHERY OPERATIONS DEEP DIVE
  // ───────────────────────────────────────────────────────────
  // The hatchery is where seed begins. Maine's growers depend on
  // a small handful of hatcheries; understanding their workflow
  // is essential aquaculture literacy.
  var HATCHERY = [
    { id: 'broodstock', title: 'Broodstock Selection + Conditioning',
      body: 'Adult shellfish selected for spawning ("broodstock") are conditioned in temperature + food regimes for 6-10 weeks to ripen gonads. Selection emphasizes growth rate, disease resistance, shell quality, environmental tolerance.',
      practical: 'Mook Sea Farms in Walpole, ME maintains genetic lines for eastern oyster. Hatcheries swap broodstock to maintain genetic diversity.' },
    { id: 'spawning', title: 'Spawning',
      body: 'Trigger spawn via temperature shocks (5-10°C shifts) or chemical cues (serotonin injection in some species). Eggs + sperm released into separate buckets. Fertilization controlled in-vitro.',
      practical: 'A single oyster female can release 10-100 million eggs per spawn. Survival to settlement is very low (<1%).' },
    { id: 'larval-rearing', title: 'Larval Rearing (D-stage → setting)',
      body: 'Larvae are pelagic for 2-3 weeks. Fed cultured microalgae (Tetraselmis, Isochrysis, Chaetoceros). Tanks 100-3000 L; daily water changes; constant water quality monitoring.',
      practical: 'Hatchery investment dominates startup cost — clean filtered seawater + heated holding + algae production is capital-intensive.' },
    { id: 'setting', title: 'Setting (metamorphosis)',
      body: 'Around D2-stage, larvae develop eyespots + foot. They settle on substrate ("cultch" — old shell, screen, or mesh) + undergo metamorphosis to juvenile form ("spat"). Set is a critical bottleneck — many die at this transition.',
      practical: 'Remote-setting is when growers bring eyed larvae home + set them on their own cultch — saves hatchery labor.' },
    { id: 'nursery', title: 'Nursery Phase',
      body: 'Newly-set spat grown in protected upweller systems (flow-thru tanks) until 2-6 mm shell — large enough to survive in open water. 4-8 weeks typically.',
      practical: 'FLUPSY (FLoating UPwellinG SYstem) = floating barge with upwellers — a common nursery design in Maine harbors.' },
    { id: 'seed-grading', title: 'Seed Grading + Sale',
      body: 'Spat sorted by size, packed wet in chilled mesh bags, shipped overnight to growers.',
      practical: 'Maine seed sales: ~$5-$20 per 1000 spat depending on size + species. Growers buy from spring through summer.' },
    { id: 'remote-setting', title: 'Remote Setting (grower-side)',
      body: 'Cost-saving alternative: hatchery ships eyed larvae (D-stage); grower sets them on own cultch in dockside tanks. Requires water quality monitoring + algae feed.',
      practical: 'Saves grower 30-50% over buying set seed. Higher mortality risk but higher upside.' },
    { id: 'biosecurity', title: 'Biosecurity',
      body: 'Hatcheries must prevent pathogen introduction (MSX, Dermo, OsHV-1 oyster herpes). Quarantine, water filtration, UV/ozone sterilization.',
      practical: 'A single OsHV-1 outbreak can collapse an entire hatchery + ripple through grower fleet.' },
    { id: 'genetics', title: 'Genetics + Selective Breeding',
      body: 'Decades of selective breeding (esp. oysters) for growth rate + disease resistance. "Triploid oysters" (3 sets of chromosomes) grow faster + don\'t spawn — increasingly the commercial standard.',
      practical: 'Triploid spat costs more but grows ~30% faster + retains marketability through summer.' },
    { id: 'maine-hatcheries', title: 'Major Maine + NE Hatcheries',
      body: 'Mook Sea Farms (Walpole, ME) — oyster anchor. Muscongus Bay Aquaculture (Bremen, ME) — multi-species. Maine Sea Farms — kelp. UMaine Center for Cooperative Aquaculture Research — research + small-scale supply.',
      practical: 'Hatchery capacity is a known industry constraint — most expansions hit a seed wall.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: DISEASES + PESTS
  // ───────────────────────────────────────────────────────────
  var DISEASES = [
    { id: 'msx', name: 'MSX (Multinucleated Sphere X / Haplosporidium nelsoni)',
      species: 'Eastern oyster',
      transmission: 'Waterborne parasite; route incompletely understood — possibly via intermediate host.',
      symptoms: 'Slow growth, watery meats, mortality during warm summer months.',
      management: 'Selective breeding for resistance (DEBY, NEH lines, NOPS — "MSX-resistant"). Triploid grow-outs reduce summer stress.',
      maine: 'Less severe in cold Maine waters than south of Cape Cod, but moving north with warming.' },
    { id: 'dermo', name: 'Dermo (Perkinsus marinus)',
      species: 'Eastern oyster',
      transmission: 'Waterborne; thrives in warm water + low salinity.',
      symptoms: 'Slow growth + summer mortality, especially in 3+ year-old stock.',
      management: 'Selective breeding (DEBY) + harvest at younger ages (before disease takes hold) + triploid stock.',
      maine: 'Minimal in Maine\'s cold water historically. Watch list as Gulf warms.' },
    { id: 'oshv1', name: 'OsHV-1 (Pacific Oyster Herpes Virus)',
      species: 'Pacific oyster (C. gigas) — not eastern oyster',
      transmission: 'Highly contagious among Pacific oysters.',
      symptoms: 'Mass mortality of seed + juveniles. Especially at temperatures >16°C.',
      management: 'Biosecurity, surveillance, depopulation of infected stocks. EU + Pacific Northwest have suffered major outbreaks.',
      maine: 'Eastern oyster appears resistant. Maine\'s eastern-oyster industry is therefore protected from this specific virus. Vigilance against any C. gigas trial introductions.' },
    { id: 'blister-worm', name: 'Mud Blister Worm (Polydora spp.)',
      species: 'Oysters, mussels',
      transmission: 'Polychaete worm bores into shell; not a true parasite — just shell damage.',
      symptoms: 'Brown mud blisters in shell. Cosmetic — doesn\'t kill but reduces market value.',
      management: 'Tumbling oysters (mechanical agitation in cages) discourages worm settlement. Periodic drying out of bags.',
      maine: 'Common in Maine waters. Manageable with good gear practices.' },
    { id: 'qpx', name: 'QPX (Quahog Parasite X / Mucochytrium quahogii)',
      species: 'Hard-shell clams (quahog)',
      transmission: 'Likely waterborne. Triggers under stress.',
      symptoms: 'Tissue lesions + summer mortality of older clams.',
      management: 'Selective breeding + monitoring; thin density to reduce stress.',
      maine: 'Periodic Maine outbreaks. Maine DMR monitors.' },
    { id: 'green-crab-aq', name: 'Green Crab (Carcinus maenas) — invasive predator',
      species: 'All bivalves; especially soft-shell clams',
      transmission: 'Already established in Maine; populations explode in warm summers.',
      symptoms: 'Eats young + adult clams; destroys eelgrass nursery habitat.',
      management: 'Trapping + bounties + research on commercial harvest. Some experimental green-crab products (bisque, fertilizer).',
      maine: 'MAJOR Maine problem. Multi-million-dollar damages annually to soft-shell clam fishery.' },
    { id: 'tunicate-fouling', name: 'Tunicate Fouling (Sea Squirts, esp. Botryllus + Didemnum)',
      species: 'All gear + product shells',
      transmission: 'Settling larvae on hard surfaces.',
      symptoms: 'Heavy mats reduce water flow to mussels + add weight to gear.',
      management: 'Tumbling, air-drying (some tunicates die in 24-hr air exposure), brushing.',
      maine: 'Increasing with warming water. Cycle gear out of water during fouling-heavy seasons.' },
    { id: 'starfish-pred', name: 'Starfish + Sea Star Predation',
      species: 'Mussels, oysters, scallops',
      transmission: 'Wild population; abundant where bivalves are.',
      symptoms: 'Empty + cleanly-opened shells; starfish stomach inverted through bivalve shell to digest.',
      management: 'Lift gear off bottom (suspended culture), use bag systems off bottom, "starfish mops" (drag chain mats).',
      maine: 'Persistent issue. Acceptable losses if managed.' },
    { id: 'eider-pred', name: 'Common Eider (Sea Duck) Predation',
      species: 'Mussels',
      transmission: 'Diving sea ducks consume mussels — protected species so can\'t cull.',
      symptoms: 'Reduced standing crop, especially in nearshore farms in winter.',
      management: 'Suspended culture (deeper than divers can reach efficiently), gear netting.',
      maine: 'Documented losses on Maine farms. Tolerable in well-sited farms.' },
    { id: 'hab', name: 'HABs (Harmful Algal Blooms) — esp. PSP',
      species: 'All bivalves',
      transmission: 'Toxin accumulation from filter-feeding during bloom.',
      symptoms: 'No visible product damage — but human health hazard.',
      management: 'DMR closures. No harvest during closures. Tissue clears in 2-6 weeks post-bloom.',
      maine: 'Maine has periodic spring + summer closures, especially in eastern Maine. NERACOOS HAB monitoring helps predict.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CLIMATE IMPACTS (deep dive)
  // ───────────────────────────────────────────────────────────
  var CLIMATE_DEEP = [
    { id: 'warming', title: 'Gulf of Maine Warming — Magnitude',
      body: 'Gulf of Maine SST warmed at ~0.03°C/yr during 2004-2013 (Pershing 2015) — ~4× global ocean rate. Maine is one of the fastest-warming marine regions on Earth.',
      farming: 'Stress on cold-water shellfish (mussels) increasing; opportunity for warm-water species (oysters, kelp seasonal timing) shifting.',
      cite: 'Pershing 2015 + GMRI 2024' },
    { id: 'acid', title: 'Ocean Acidification — Carbonate Chemistry',
      body: 'Atmospheric CO₂ → dissolved CO₂ in seawater → carbonic acid → reduced pH + reduced calcium carbonate saturation. Larval shellfish need supersaturated aragonite (a form of CaCO₃) to form shells.',
      farming: 'Hatcheries buffer water during shell-formation stage. Acidification adds cost + risk; ongoing breeding for tolerance.',
      cite: 'Bigelow Lab' },
    { id: 'salinity', title: 'Salinity Variability — More Extreme',
      body: 'Heavier short-duration rain events + drier intervals. Salinity swings stress bivalves; some species (oysters) tolerate wider range than others (mussels narrower).',
      farming: 'Deeper gear during freshets; species choice (oyster more tolerant than mussel).',
      cite: 'Maine Climate Council' },
    { id: 'do', title: 'Dissolved Oxygen — Hypoxia Risk',
      body: 'Warmer water holds less oxygen. Dense bivalve beds + warm calm summers = hypoxia events. Less of a Maine issue than Chesapeake — but watch.',
      farming: 'Thin stocking density. Avoid back coves with poor flushing in warm conditions.',
      cite: 'NERACOOS' },
    { id: 'algal-blooms', title: 'HAB Frequency + Timing Shifts',
      body: 'Earlier spring blooms + autumn extensions. Some HAB-forming species (Alexandrium) thrive in warmer temperatures.',
      farming: 'Longer closure seasons expected. Diversify with species + sites less HAB-prone.',
      cite: 'NOAA + DMR' },
    { id: 'extremeweather', title: 'Extreme Weather — Storms + Ice',
      body: 'More intense nor\'easters + more variable winter ice. Storm damage to gear; ice flexes + breaks lines.',
      farming: 'Heavier gear, more frequent inspections, off-season gear retrieval.',
      cite: 'Maine Climate Council' },
    { id: 'rangeshift', title: 'Species Range Shifts',
      body: 'Black sea bass + summer flounder pushing north — both filter-feeding competitors + predators on aquaculture stock. Mussel populations shifting deeper / further north.',
      farming: 'Site selection becomes a moving target. Diversify species + revisit assumptions every 5 years.',
      cite: 'NEFSC climate vulnerability' },
    { id: 'positive-feedback', title: 'Climate-positive Aquaculture',
      body: 'Bivalves filter ~100-300 L water/day. Kelp absorbs nitrogen + CO₂. Both regenerate water quality. Maine\'s shellfish + kelp industries are CARBON-NEGATIVE — among the rare food production systems that net-sequester.',
      farming: 'Marketing story: "eating local mussels improves water quality" is technically true.',
      cite: 'Bricker + Rice et al. 2014 + NOAA' },
    { id: 'right-whale-aqua', title: 'Right Whale + Vertical Lines',
      body: 'North Atlantic right whale entanglement risk from vertical mooring lines (aquaculture + lobster gear).',
      farming: 'Ropeless or "on-call" gear development. Some areas seasonal closures.',
      cite: 'NOAA Office of Protected Resources' },
    { id: 'climate-actions', title: 'What Farmers Can Do',
      body: 'Diversify species, diversify sites, invest in selective breeding for resilient strains, monitor real-time water-quality data (NERACOOS), join climate research partnerships (Bigelow + UMaine offer collaborations).',
      farming: 'Climate-adapted farms are the future. Plan 10-20 yr horizon, not just next season.',
      cite: 'Maine Aquaculture Association climate working group' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE AQUACULTURE HISTORY
  // ───────────────────────────────────────────────────────────
  var HISTORY = [
    { era: 'Pre-contact (12,000+ years ago to 1600s)',
      events: ['Wabanaki peoples managed shellfish flats through seasonal harvest + middens (shell mounds), some 6,000+ years old in Maine. Damariscotta + Whaleback shell middens are Maine\'s most prominent.',
        'Sustainable management was norm — middens show selective harvest patterns over millennia.',
        'Aquaculture as such was not practiced, but stewardship was.'],
      cite: 'Maine Historical Society + Indigenous oral history' },
    { era: 'Colonial (1600s-1800s)',
      events: ['English + French colonists harvested oysters + clams intensively. Damariscotta River oyster reefs were once vast.',
        'Wild oyster populations in Maine collapsed by 1800s from overharvest + sedimentation.',
        'Sardine canneries (1860s onward) — Lubec, Eastport became sardine capitals.'],
      cite: 'Maine Sea Grant historical review' },
    { era: 'Industrial Era (1800s-1950s)',
      events: ['Maine\'s sardine industry peaked early 1900s.',
        'Lobstering shifted from family subsistence to commercial export.',
        'Wild shellfish flats still primary source.',
        'No commercial aquaculture in Maine yet.'],
      cite: 'Penobscot Marine Museum' },
    { era: 'Aquaculture Founding (1960s-1980s)',
      events: ['1970s: First trial salmon aquaculture in Cobscook Bay (eastern Maine).',
        'Late 1970s-80s: Mussel raft culture trials (initially Western European method imports).',
        'Damariscotta River Restoration Project (1970s) trialed oyster aquaculture for ecological + commercial purposes.',
        'Maine Aquaculture Association founded 1977.'],
      cite: 'MAA + DMR' },
    { era: 'Commercial Expansion (1990s-2010s)',
      events: ['Mook Sea Farms (Walpole) becomes anchor oyster hatchery, founded 1985.',
        'Salmon aquaculture grew under Cooke Aquaculture in Cobscook Bay, peaked early 2000s, has been declining.',
        'Mussel aquaculture matured into multi-million-dollar industry.',
        'Maine\'s lease law (LPA created 2005) opened entry to small operators.'],
      cite: 'MAA 2024' },
    { era: 'Current Era (2015-present)',
      events: ['Kelp aquaculture industry founded (Atlantic Sea Farms 2016 + multiple smaller operators).',
        'Oyster industry boomed — Maine oysters now nationally recognized premium product.',
        'Whole Oceans (Bucksport) breaking ground on world-leading land-based RAS salmon facility.',
        'Climate concerns drive species diversification + research investment.',
        'Tribal sovereignty conversations regarding aquaculture in tribal-rights waters intensifying.',
        'Industry value: ~$100M+/yr (Maine, 2024).'],
      cite: 'MAA + DMR + Whole Oceans' },
    { era: 'Notable Maine Farms + Operators',
      events: ['Mook Sea Farms (Walpole) — oyster hatchery + farm; THE Maine oyster brand.',
        'Bagaduce River Mussels (Penobscot) — heritage mussel operation.',
        'Atlantic Sea Farms (Saco, Biddeford) — kelp pioneer; partners with multiple farmers across coast.',
        'Cooke Aquaculture (multi-site Cobscook + Machias Bay) — salmon; controversial.',
        'Whole Oceans (Bucksport) — under construction; land-based RAS salmon.',
        'American Mussel Harvesters (Bath, RI but Maine-supplied) — major mussel distributor.',
        'Heritage Shellfish Hatchery (Bremen) — clam + scallop research + supply.'],
      cite: 'Maine Aquaculture Association directory' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NSSP (National Shellfish Sanitation Program)
  // ───────────────────────────────────────────────────────────
  var NSSP = [
    { id: 'overview', title: 'NSSP Overview',
      body: 'Federal-state cooperative program managing safety of harvested shellfish (oysters, clams, mussels, scallops). DMR Bureau of Public Health classifies Maine waters.' },
    { id: 'classifications', title: 'Water Classifications',
      body: 'APPROVED: harvest year-round (clean water). CONDITIONALLY APPROVED: harvest except after rain (rain-triggered closures). RESTRICTED: depuration-only or relay-only. PROHIBITED: no harvest ever (heavily polluted or sewage outfall).' },
    { id: 'tagging', title: 'Tagging + Traceability',
      body: 'Every commercial harvest must be tagged with harvester license, harvest date, harvest area, species. Tag must remain on container all the way to retail. Allows trace-back during a foodborne illness outbreak.' },
    { id: 'time-temp', title: 'Time + Temperature Controls',
      body: 'Shellfish must be cooled to ≤45°F within strict time windows from harvest. Hot summer days = shorter "good" window. Logs required.' },
    { id: 'depuration', title: 'Depuration',
      body: 'Holding shellfish in clean filtered seawater (48+ hr) to purge contaminants. Used after some closures or for relay-classified waters. Regulated process.' },
    { id: 'closures', title: 'Closures',
      body: 'Triggered by: rain events (cond-approved areas), HABs (Alexandrium + PSP), sewage spills, vibrio outbreaks. DMR publishes daily closure bulletins.' },
    { id: 'biotoxins', title: 'Biotoxin Monitoring',
      body: 'PSP (paralytic) — Maine\'s main concern. ASP (amnesic, domoic acid) — rare in Maine. DSP (diarrhetic, okadaic acid) — also rare. NSP (neurotoxic) — Gulf of Mexico species.' },
    { id: 'enforcement', title: 'Enforcement + Penalties',
      body: 'DMR + town wardens + State Police. Penalties: fines, license revocation, criminal charges for repeat or willful violation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NERACOOS + Monitoring
  // ───────────────────────────────────────────────────────────
  var NERACOOS = [
    { id: 'overview', title: 'What is NERACOOS?',
      body: 'Northeast Regional Association of Coastal Ocean Observing Systems. Federal-supported regional ocean data system. Buoys + shore stations measure real-time temperature, salinity, DO, wave height, weather, currents.' },
    { id: 'use', title: 'How Farmers Use NERACOOS',
      body: 'Daily check of nearest buoy for trends. Cross-check own site with regional pattern. Trigger to deploy probe + decide on harvest timing.' },
    { id: 'buoys', title: 'Major Maine NERACOOS Stations',
      body: 'Buoy A01 (Massachusetts Bay), B01 (Casco Bay), C02 (Eastern Maine), D02 (Penobscot Bay), I01 (Eastern Maine Shelf), M01 (Jordan Basin), N01 (Northeast Channel). Each transmits at intervals via satellite.' },
    { id: 'apps', title: 'Apps + Data Access',
      body: 'neracoos.org website + iOS/Android apps. CartoView for spatial data. API for technical users.' },
    { id: 'hab-monitor', title: 'HAB Monitoring',
      body: 'Maine DMR + Bigelow Lab use HAB sensors + weekly water samples to predict closures. NERACOOS hosts the data + alerts.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MOORING + GEAR ANCHORING
  // ───────────────────────────────────────────────────────────
  var MOORING = [
    { id: 'anchor-types', title: 'Anchor Types for Longline',
      body: 'Mushroom anchors (200-1000 lb) — gold standard for permanent mooring in soft bottom. Concrete blocks (cheap, good for sand). Helix screw anchors (modern, sand+mud). Storm anchors larger than working anchors.' },
    { id: 'rope-types', title: 'Rope Selection',
      body: 'Sinking rope vs floating rope is a regulatory + safety issue (right-whale entanglement). Polypropylene = floats; nylon/polyester = sinks. Maine requires sinking rope for many gear types now.' },
    { id: 'scope', title: 'Anchor Scope Math',
      body: 'Anchor line length ÷ water depth = scope ratio. 5:1 for fair-weather; 7:1 for storms; 10:1+ for hurricane. Maine\'s 9-12 ft tidal range = scope must account for high tide depth.' },
    { id: 'marking', title: 'Mark Your Gear',
      body: 'Maine DMR requires identifying tags + color codes on aquaculture gear. Helps recovery after storm + prevents conflict with other gear.' },
    { id: 'sea-state', title: 'Anchoring in Maine Sea State',
      body: 'Northeast nor\'easters = primary anchor stress test. Heavy mushroom + 6-8:1 scope + chain (not just rope) = baseline. Track gear position via GPS each visit; sliding = inadequate.' },
    { id: 'tidal-ranges', title: 'Tidal Range Considerations',
      body: 'Bagaduce: 8-10 ft range. Damariscotta: 8-10 ft. Eastport: 18-25 ft. Higher range = more chain needed + more cyclic stress on hardware.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MARKETING + DIRECT-TO-CONSUMER
  // ───────────────────────────────────────────────────────────
  var MARKETING = [
    { id: 'price-tiers', title: 'Price Tiers — Wholesale to D2C',
      body: 'Mussels: $0.50-$1.20/lb wholesale; $2-$4/lb retail. Oysters: $0.30-$0.60 each wholesale; $1-$3 each at farmers market; $3-$5 each at restaurant. Direct-to-consumer often DOUBLES gross income.' },
    { id: 'farmers-market', title: 'Farmers Market Sales',
      body: 'Saturday markets in Portland, Bath, Belfast, Bar Harbor. Year-round (winter indoor) options growing. Requires food-safety cert + setup investment.' },
    { id: 'restaurant', title: 'Restaurant Accounts',
      body: 'Chef relationships are gold. Maine chefs increasingly source named-farm shellfish. Tell your story; deliver consistently; price for premium.' },
    { id: 'csa', title: 'Aquaculture CSA / Subscriptions',
      body: 'Bi-weekly seafood subscriptions are growing. Customers pay upfront; you commit to volume. Cash-flow + market predictability.' },
    { id: 'ecommerce', title: 'E-Commerce + Overnight Shipping',
      body: 'Maine oysters ship overnight nationwide. Insulated packaging + ice packs. Higher-margin but logistics-intensive.' },
    { id: 'terroir', title: 'Terroir + Brand Story',
      body: 'Maine oysters: Pemaquid, Glidden Point, Bagaduce, Damariscotta — each region has distinct salinity + minerality. Marketing the terroir doubles perceived value.' },
    { id: 'certifications', title: 'Certifications + Sustainability Labels',
      body: 'Best Aquaculture Practices (BAP), Aquaculture Stewardship Council (ASC), Monterey Bay Aquarium Seafood Watch (Best Choice for Maine bivalves). Verified labels = retail premium.' },
    { id: 'maine-grown', title: 'Maine Grown / Maine Made Branding',
      body: 'State + industry-association marks. "Maine Aquaculture" identity = quality halo. Helps differentiate from Pacific or imported product.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ACHIEVEMENTS
  // ───────────────────────────────────────────────────────────
  var ACHIEVEMENTS = [
    { id: 'first-cast', name: 'First Cast', icon: '⚓', desc: 'Cast off from the dock for the first time.' },
    { id: 'red-right', name: 'Red Right Returning', icon: '🟥', desc: 'Pass a red nun on starboard correctly.' },
    { id: 'first-dropper', name: 'First Dropper', icon: '🪢', desc: 'Deploy your first seeded line.' },
    { id: 'full-farm', name: 'Full Farm', icon: '🦪', desc: 'Deploy all 5 droppers.' },
    { id: 'first-probe', name: 'First Probe', icon: '💧', desc: 'Take your first water-quality probe reading.' },
    { id: 'monitoring-mastery', name: 'Monitoring Mastery', icon: '📊', desc: 'Take 10 probe readings.' },
    { id: 'storm-survivor', name: 'Storm Survivor', icon: '⛈️', desc: 'Complete a mission in storm conditions.' },
    { id: 'kelp-harvest', name: 'Kelp Harvester', icon: '🌿', desc: 'Complete a kelp harvest cycle.' },
    { id: 'oyster-farmer', name: 'Oyster Farmer', icon: '🦪', desc: 'Complete an oyster grow-out cycle.' },
    { id: 'navigator', name: 'Bagaduce Navigator', icon: '🧭', desc: 'Plot a fix in narrow river channel.' },
    { id: 'climate-aware', name: 'Climate Aware', icon: '🌡️', desc: 'Read all climate deep-dive entries.' },
    { id: 'history-reader', name: 'History Reader', icon: '📜', desc: 'Read all Maine aquaculture history entries.' },
    { id: 'hatchery-student', name: 'Hatchery Student', icon: '🧫', desc: 'Read all hatchery operation entries.' },
    { id: 'disease-watch', name: 'Disease Watcher', icon: '🦠', desc: 'Read all disease + pest entries.' },
    { id: 'market-savvy', name: 'Market Savvy', icon: '💰', desc: 'Read all marketing entries.' },
    { id: 'nssp-aware', name: 'NSSP Aware', icon: '🛡️', desc: 'Read all NSSP entries.' },
    { id: 'quiz-master', name: 'Quiz Master', icon: '🏆', desc: 'Score 90%+ on the full quiz.' },
    { id: 'glossary-scholar', name: 'Glossary Scholar', icon: '📖', desc: 'Read at least 50 glossary terms.' },
    { id: 'wabanaki-reader', name: 'Wabanaki Heritage Reader', icon: '🪶', desc: 'Read all Wabanaki shellfish heritage entries.' },
    { id: 'sustainable-farmer', name: 'Sustainable Farmer', icon: '🌱', desc: 'Complete a mission with zero environmental violations.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WABANAKI SHELLFISH HERITAGE
  // ───────────────────────────────────────────────────────────
  var WABANAKI = [
    { id: 'overview', title: 'Wabanaki Shellfish Stewardship',
      body: 'Wabanaki nations (Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq) have managed Maine shellfish flats for 12,000+ years. Shell middens (mounded heaps of consumed shells) dot the Maine coast — some 6,000+ years old.' },
    { id: 'middens', title: 'Shell Middens — Living Archaeology',
      body: 'Damariscotta + Whaleback shell middens are among the largest on the Atlantic coast. They show: (1) continuous Wabanaki use for millennia, (2) sustainable harvest patterns, (3) shifts in dominant species over time (climate signals).',
      cite: 'Maine Historical Society + Maine Archaeological Society' },
    { id: 'sustenance', title: 'Subsistence + Cultural Continuity',
      body: 'Soft-shell clams, oysters, mussels, scallops, urchins all part of Wabanaki diet + ceremony. Shells used for tools, jewelry, currency (wampum).' },
    { id: 'colonial-impact', title: 'Colonial Impact on Wabanaki Shellfish Access',
      body: 'Land theft + treaty violations + industrial-scale wild harvests collapsed many Maine shellfish populations by 1800s — disproportionately affecting tribal nations who depended on them.' },
    { id: 'modern-rights', title: 'Modern Tribal Aquaculture Rights',
      body: 'Maine Indian Claims Settlement Act (1980) + Maine Implementing Act define ongoing tribal fishing + harvesting rights. Aquaculture in tribal-claim waters remains contested. Tribal-led aquaculture projects emerging (Passamaquoddy seaweed harvest, etc.).',
      cite: 'Maine-Wabanaki Truth + Reconciliation Commission report' },
    { id: 'damariscotta-mills', title: 'Damariscotta Mills Alewife Fishway',
      body: 'Multi-generational Maine alewife restoration. Wabanaki + state + town partnership rebuilding fishway access. Spring alewife run is community celebration + ecological reconnection.',
      cite: 'Damariscotta Mills Fish Ladder Restoration' },
    { id: 'penobscot-restoration', title: 'Penobscot River Restoration',
      body: 'Multi-tribal-led river restoration removed dams, restored 1000+ river miles. Affects sea-run fish + downstream shellfish productivity. Penobscot Nation\'s sovereignty over watershed health affirmed.',
      cite: 'Penobscot River Restoration Trust' },
    { id: 'curriculum', title: 'For Educators',
      body: 'Maine Indian Education (LD 291, 2001) requires tribal content in K-12. Wabanaki REACH curriculum materials available. Centerpiece: tribal nations are living communities, not historical artifacts.',
      cite: 'Maine DOE + Wabanaki REACH' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KNOTS (same as FisherLab; mariners need them)
  // ───────────────────────────────────────────────────────────
  var KNOTS = [
    { id: 'bowline', name: 'Bowline', use: 'Forms a non-slipping loop at line end.', where: 'Tying to a piling, hauling a person.',
      mnemonic: 'Rabbit out of hole, around tree, back down hole.' },
    { id: 'clove', name: 'Clove Hitch', use: 'Quick attachment to a post.', where: 'Fender lines, temporary dock-line.',
      mnemonic: 'Two half-hitches around post.' },
    { id: 'cleat', name: 'Cleat Hitch', use: 'Securing dock line to cleat.', where: 'Every dock + boat fitting.',
      mnemonic: 'Bottom turn, cross, underhand loop, locked overhand.' },
    { id: 'fishermansbend', name: 'Fisherman\'s Bend (Anchor Bend)', use: 'Line to anchor ring.', where: 'Anchor rode termination.',
      mnemonic: 'Two turns, half-hitch back, half-hitch above.' },
    { id: 'rolling', name: 'Rolling Hitch', use: 'Snubbing anchor rode, hanging fender.', where: 'Load along line axis.',
      mnemonic: 'Two diagonals, hitch above on loaded side.' },
    { id: 'trucker', name: 'Trucker\'s Hitch', use: 'Mechanical advantage tensioning.', where: 'Lashing gear, securing covers.',
      mnemonic: 'Loop, pull bitter through, half-hitches.' },
    { id: 'sheet-bend', name: 'Sheet Bend', use: 'Join two lines of unequal diameter.', where: 'Extending a line.',
      mnemonic: 'Bend (loop) larger line; smaller goes through + around + tucks under itself.' },
    { id: 'figure-eight', name: 'Figure-Eight Stopper', use: 'Stopper at line end.', where: 'End of running line.',
      mnemonic: 'Loop, twist once, pass tail through. Looks like 8.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: PUBLIC HEARING SIMULATOR
  // ───────────────────────────────────────────────────────────
  var PUBLIC_HEARING = [
    { id: 'overview', title: 'Why Public Hearings Matter',
      body: 'Standard + experimental aquaculture leases in Maine require a public hearing where abutters + the public can object. Many lease applications stall or fail because of poorly-managed hearings.' },
    { id: 'common-objections', title: 'Common Objections + How to Address',
      body: '"Will obstruct navigation" → Marine Patrol can confirm channel clearance. "Will block my view" → bring renderings showing sight-lines at typical heights. "Will pollute water" → DMR data shows aquaculture improves water quality. "Will reduce property values" → research shows aquaculture coexists with property values when properly sited. Be prepared for each.' },
    { id: 'preparation', title: 'How to Prepare',
      body: 'Talk with abutters BEFORE the hearing. Bring a site map + business plan + photographs. Address concerns directly. Bring testimonials from existing local farms.' },
    { id: 'tribal-engagement', title: 'Tribal Engagement',
      body: 'Where leases touch tribal-claim waters or traditional harvest areas, engage tribal nations early + directly. Not optional — both legally + ethically.' },
    { id: 'maine-friends', title: 'Friends of the Aquaculture Industry',
      body: 'Maine Aquaculture Association can advocate at hearings + provide template materials. Maine Sea Grant + UMaine extension also help with technical questions.' },
    { id: 'after-hearing', title: 'After the Hearing',
      body: 'DMR adjudicator drafts decision. May approve, modify, or deny. Approval includes conditions (boundaries, gear types, depth, marking).' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SITE SELECTION DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var SITE_SELECTION = [
    { factor: 'Salinity',
      criteria: '20-32 PSU for mussels; 14-30 PSU for oysters; 28-35 PSU for kelp/scallops.',
      assessment: 'Multi-season probe data. Tidal variability matters more than mean.',
      red_flag: 'Wide swings after rain → freshwater stress events.' },
    { factor: 'Temperature',
      criteria: 'Mussels 5-22°C; oysters 10-30°C; kelp <15°C.',
      assessment: 'Summer maxima are the killer. Profile depth-wise (deeper = cooler).',
      red_flag: 'Temperatures >22°C in late summer.' },
    { factor: 'Dissolved Oxygen',
      criteria: '>6 mg/L; bivalves can survive lower briefly but stress mounts.',
      assessment: 'Continuous datalogger ideal. Sample at dawn (lowest).',
      red_flag: 'DO <5 mg/L for hours.' },
    { factor: 'pH',
      criteria: '7.8-8.2 ideal; lower → larval shell formation issues.',
      assessment: 'Monthly samples; trend over years.',
      red_flag: 'pH <7.7 during shell-forming periods.' },
    { factor: 'Current Speed',
      criteria: '0.2-1.0 kt typical; some flow needed for food + waste exchange.',
      assessment: 'Drogue measurements at multiple tide stages.',
      red_flag: 'Stagnant (<0.1 kt) or scouring (>2 kt).' },
    { factor: 'Depth',
      criteria: '4-15 m for most longline; deeper for bay scallop lantern nets.',
      assessment: 'Sounder + tidal chart cross-check.',
      red_flag: 'Too shallow → ice damage in winter. Too deep → expensive gear.' },
    { factor: 'Bottom Substrate',
      criteria: 'Mud + sand for anchoring; hard rock = challenging.',
      assessment: 'Bottom grab samples + diver survey.',
      red_flag: 'Pure rock or shifting sand.' },
    { factor: 'Freshwater Inflow',
      criteria: 'Modest stream input provides nutrients; too much = salinity stress.',
      assessment: 'Map upstream watershed for size + agricultural runoff.',
      red_flag: 'Major river mouth or sewage outfall nearby.' },
    { factor: 'Wave Exposure',
      criteria: 'Protected to semi-protected; full exposure damages gear.',
      assessment: 'Site visit during nor\'easter conditions (or model from NOAA).',
      red_flag: 'Wave heights >2 m typical in winter.' },
    { factor: 'Vessel Traffic',
      criteria: 'Off navigation channels + ferry routes; gear color-marked.',
      assessment: 'Coast Pilot + DMR + local knowledge.',
      red_flag: 'In active commercial channels or ferry approach.' },
    { factor: 'Sewage + Pollution',
      criteria: 'NSSP-approved waters; rain-triggered closures acceptable for some products.',
      assessment: 'DMR sanitation classification map; historical closure data.',
      red_flag: 'Prohibited or seasonally restricted area.' },
    { factor: 'Abutters + Neighbors',
      criteria: 'Talk to neighbors BEFORE submitting lease application.',
      assessment: 'Visit homes, meet at coffee, address concerns proactively.',
      red_flag: 'Vocal opposition discovered at public hearing.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: LESSON PLANS (for teachers)
  // ───────────────────────────────────────────────────────────
  var LESSON_PLANS = [
    { id: 'lp-1', title: 'Grade 6: How does a mussel attach to a rope?',
      grade: '6', subject: 'Life Science / Place-Based',
      objectives: [
        'Identify byssal threads as the attachment mechanism',
        'Describe the byssal gland in a mussel\'s foot',
        'Connect biological adaptation to aquaculture method'
      ],
      materials: ['AquacultureLab Species tab', 'Live mussels (collect from intertidal flat)', 'Hand lens', 'Diagram of mussel anatomy'],
      flow: '10 min field collection (or pre-collected) → 20 min observation (use hand lens to see byssal threads) → 20 min direct teach (Species tab) → 20 min sketching anatomy → 20 min connection to rope-culture method (Hatchery tab).',
      assessment: 'Anatomical sketch with byssal gland labeled. Quiz Q on byssal threads.',
      crosscuts: ['Biology: adaptation + anatomy', 'Engineering: bio-inspired design', 'Place-based: Maine working waterfront'] },
    { id: 'lp-2', title: 'Grade 7: Water Quality + Shellfish Mortality (90 min)',
      grade: '7', subject: 'Chemistry / Ecology',
      objectives: [
        'Identify the 5 main water-quality parameters affecting bivalves',
        'Predict mortality outcomes from probe readings',
        'Explain how aquaculture farmers adapt to changing conditions'
      ],
      materials: ['AquacultureLab Water Quality tab', 'YSI probe (if available)', 'Sample bay water + freshwater for salinity comparison', 'Graphing paper'],
      flow: '15 min hook (show 2025 die-off news clip) → 20 min direct teach → 30 min sim Mission 7 (probe + adjust) → 15 min graph mortality vs DO → 10 min closure',
      assessment: 'Predicted mortality at given parameter combinations. Sim Mission 7 result.',
      crosscuts: ['Chemistry: dissolved gas, ionic concentrations', 'Stats: regression', 'Ecology: stress response'] },
    { id: 'lp-3', title: 'Grade 8: Climate-Positive Food Systems (2 class periods)',
      grade: '8', subject: 'Earth Science / Sustainability',
      objectives: [
        'Calculate carbon sequestration potential of bivalve + kelp aquaculture',
        'Compare aquaculture to terrestrial protein production for climate impact',
        'Evaluate "blue carbon" credit markets'
      ],
      materials: ['AquacultureLab Climate Deep Dive tab', 'NOAA blue carbon factsheets', 'Calculator', 'Spreadsheet'],
      flow: 'Day 1: 45 min direct teach + climate data analysis. Day 2: 45 min carbon-accounting math + Sim Mission 11 (climate adaptation) + debate.',
      assessment: 'Carbon-footprint comparison essay (1 page).',
      crosscuts: ['Climate science', 'Economics: carbon credits', 'Ethics: working-waterfront preservation'] },
    { id: 'lp-4', title: 'High School: Lease Application Public Hearing Role-Play (2-3 classes)',
      grade: '9-12', subject: 'Civics / Public Policy',
      objectives: [
        'Apply lease tier criteria to a hypothetical application',
        'Anticipate + respond to abutter concerns',
        'Evaluate competing stakeholder claims (working waterfront vs property values)'
      ],
      materials: ['AquacultureLab Lease + Site Selection + Public Hearing tabs', 'Mock application packet', 'Stakeholder role cards (applicant, abutter, fisherman, DMR, tribal rep)'],
      flow: 'Class 1: 90 min prep + role assignment + research. Class 2: 90 min mock hearing. Class 3: debrief + analysis.',
      assessment: 'Stakeholder advocacy memo (1 page) + classroom hearing performance.',
      crosscuts: ['Civics', 'Persuasion + rhetoric', 'Maine public policy', 'Tribal sovereignty'] },
    { id: 'lp-5', title: 'Cross-Disciplinary: Damariscotta Field Trip (full day)',
      grade: '6-12', subject: 'Multi-disciplinary',
      objectives: [
        'Tour active oyster farm + Mook Sea Farms hatchery',
        'Observe Wabanaki shell midden at Damariscotta (Whaleback or Glidden)',
        'Connect lab science to real working waterfront'
      ],
      materials: ['Field journal', 'Pre-trip reading (AquacultureLab Hatchery + Wabanaki tabs)', 'Camera', 'Permission slips'],
      flow: 'Pre-trip: 1 class day prep. Day-of: morning farm tour, lunch + reflection, afternoon midden visit. Post-trip: 1 class day debrief.',
      assessment: 'Field journal entry with sketches + reflection.',
      crosscuts: ['Place-based learning (EL Education aligned)', 'History + archaeology', 'Aquaculture biology', 'Wabanaki heritage'] },
    { id: 'lp-6', title: 'High School: Carbon Math + Blue Economy',
      grade: '9-12', subject: 'Economics + Earth Science',
      objectives: [
        'Calculate per-acre carbon sequestration of kelp + bivalves',
        'Model blue-carbon-credit revenue + market dynamics',
        'Compare to terrestrial offsets'
      ],
      materials: ['Spreadsheet template', 'NOAA carbon data', 'AquacultureLab Climate tab'],
      flow: 'Hook (carbon-credit news article) → guided spreadsheet work → student-led revenue model → policy debate.',
      assessment: 'Carbon-credit business model proposal.',
      crosscuts: ['Economics', 'Earth science', 'Policy'] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BIBLIOGRAPHY
  // ───────────────────────────────────────────────────────────
  var BIBLIOGRAPHY = [
    { id: 'mossop', authors: 'Mossop, K.', year: 'ongoing', title: 'Maine Aquaculture Association — publications + factsheets',
      type: 'industry', url: 'maineaquaculture.org', notes: 'Industry trade group. Excellent intro materials.' },
    { id: 'maine-sg', authors: 'Maine Sea Grant', year: 'ongoing', title: 'Aquaculture extension publications',
      type: 'university', url: 'seagrant.umaine.edu', notes: 'UMaine extension. Maine-specific technical resources.' },
    { id: 'noaa-aq', authors: 'NOAA Office of Aquaculture', year: 'ongoing', title: 'NOAA aquaculture office publications',
      type: 'federal', url: 'fisheries.noaa.gov/topic/aquaculture', notes: 'Federal aquaculture policy + science.' },
    { id: 'dmr-aq', authors: 'Maine DMR Aquaculture Division', year: 'ongoing', title: 'Maine DMR aquaculture website',
      type: 'state', url: 'maine.gov/dmr/aquaculture', notes: 'Lease applications, rules, public hearings, current closures.' },
    { id: 'bigelow', authors: 'Bigelow Laboratory for Ocean Sciences', year: 'ongoing', title: 'Bigelow Lab research publications',
      type: 'research', url: 'bigelow.org', notes: 'Bigelow Lab East Boothbay focuses on ocean biogeochemistry + acidification.' },
    { id: 'gmri', authors: 'Gulf of Maine Research Institute', year: 'ongoing', title: 'GMRI research + climate publications',
      type: 'research', url: 'gmri.org', notes: 'Maine\'s primary fisheries-science org.' },
    { id: 'shumway', authors: 'Shumway, S. E. (Ed.)', year: 2011, title: 'Shellfish Aquaculture and the Environment',
      type: 'book', notes: 'Comprehensive academic reference. Wiley-Blackwell.' },
    { id: 'kennedy', authors: 'Kennedy, V. S., et al. (Eds.)', year: 1996, title: 'The Eastern Oyster: Crassostrea virginica',
      type: 'book', notes: 'Maryland Sea Grant. The definitive reference on eastern oysters.' },
    { id: 'pershing-2015', authors: 'Pershing, A. J., et al.', year: 2015,
      title: 'Slow adaptation in the face of rapid warming leads to collapse of the Gulf of Maine cod fishery',
      type: 'journal', journal: 'Science 350:809-812', notes: 'Foundational Gulf of Maine warming paper.' },
    { id: 'ekstrom-acid', authors: 'Ekstrom, J. A., et al.', year: 2015,
      title: 'Vulnerability + adaptation of US shellfisheries to ocean acidification',
      type: 'journal', journal: 'Nature Climate Change 5:207-214', notes: 'Defining vulnerability assessment.' },
    { id: 'bricker-2014', authors: 'Bricker, S. B., et al.', year: 2014,
      title: 'Bivalve aquaculture remediation of nutrient pollution in Long Island Sound',
      type: 'journal', journal: 'Aquaculture Environment Interactions',
      notes: 'Quantifies water-quality benefits of bivalve aquaculture.' },
    { id: 'whoi-blue', authors: 'WHOI Sea Grant', year: 'ongoing', title: 'Blue Carbon resources',
      type: 'university', url: 'whoi.edu', notes: 'WHOI on blue carbon + restoration economics.' },
    { id: 'penobscot-pp', authors: 'Penobscot Nation', year: 'ongoing', title: 'Penobscot Nation cultural + natural resources',
      type: 'tribal', url: 'penobscotnation.org', notes: 'Penobscot Nation public resources.' },
    { id: 'passamaquoddy', authors: 'Passamaquoddy Tribe', year: 'ongoing', title: 'Passamaquoddy Tribe at Pleasant Point + Indian Township',
      type: 'tribal', url: 'wabanaki.com', notes: 'Two Passamaquoddy communities in Maine.' },
    { id: 'wabanaki-reach', authors: 'Wabanaki REACH', year: 'ongoing', title: 'Wabanaki REACH curriculum + outreach',
      type: 'curriculum', url: 'wabanakireach.org', notes: 'Educational program led by Wabanaki + allies.' },
    { id: 'whales-2024', authors: 'NOAA Office of Protected Resources', year: 'ongoing',
      title: 'North Atlantic Right Whale fishery interaction', type: 'federal',
      url: 'fisheries.noaa.gov/topic/protected-species', notes: 'Right whale entanglement + closures.' },
    { id: 'maine-aquaculture-association', authors: 'Maine Aquaculture Association', year: 'ongoing',
      title: 'Maine Aquaculture Association — climate + training programs', type: 'industry', url: 'maineaquaculture.org',
      notes: 'Climate working group + training calendar.' },
    { id: 'island-institute', authors: 'Island Institute', year: 'ongoing', title: 'Working Waterfront program',
      type: 'ngo', url: 'islandinstitute.org', notes: 'Rockland-based; advocates working waterfront preservation.' },
    { id: 'us-fda-shellfish', authors: 'US FDA', year: 'ongoing',
      title: 'FDA Office of Aquaculture / Shellfish + Aquaculture Policy', type: 'federal',
      url: 'fda.gov', notes: 'Food safety + NSSP federal lead.' },
    { id: 'mass-aquaculture', authors: 'Massachusetts Division of Marine Fisheries', year: 'ongoing',
      title: 'Massachusetts aquaculture resources (regional comparator)', type: 'state',
      url: 'mass.gov/dmf', notes: 'Useful for understanding regional industry context.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SAFETY EQUIPMENT (aquaculture-specific)
  // ───────────────────────────────────────────────────────────
  var SAFETY = [
    { id: 'pfd', name: 'PFDs (Personal Flotation Devices)', emoji: '🦺',
      required: 'USCG-approved PFD per person aboard. Maine state law: under-13 must WEAR underway.',
      reality: 'Most boating drownings = PFD not on body. Wear yours. Maine waters are cold.' },
    { id: 'vhf', name: 'VHF Marine Radio', emoji: '📻',
      required: 'Not legally required for non-commercial but essential.',
      reality: 'Channel 16 = distress + hailing. Coast Guard monitors. Cell phones do not work offshore.' },
    { id: 'epirb', name: 'EPIRB or PLB', emoji: '📡',
      required: 'EPIRB optional for non-commercial. PLB worn on PFD recommended.',
      reality: '406 MHz satellite signal gets your position to Coast Guard within minutes.' },
    { id: 'first-aid', name: 'First Aid Kit + Cold-Water Survival Training', emoji: '🩹',
      required: 'Not legally mandated; essential.',
      reality: 'Maine waters drop below 50°F most of year. Hypothermia kills fast.' },
    { id: 'fire-ext', name: 'Fire Extinguisher', emoji: '🧯',
      required: 'B-I or B-II rated. Required by USCG for vessels with fuel.',
      reality: 'Outboard fuel + electronics = fire risk. Have it accessible.' },
    { id: 'visual', name: 'Visual Distress Signals', emoji: '🚩',
      required: 'For boats >16 ft on coastal water: 3 day + 3 night signals.',
      reality: 'Pyrotechnic flares + LED SOS strobes. Replace before expiration.' },
    { id: 'sound', name: 'Sound-Producing Device', emoji: '📢',
      required: 'Required by COLREGS.',
      reality: 'Air horn for big-boat signals; athletic whistle backup on PFD.' },
    { id: 'gloves', name: 'Cold-Weather Gloves + Foul-Weather Gear', emoji: '🧤',
      required: 'Not mandated; essential.',
      reality: 'Maine fall + winter water work without dry gloves = numb hands = injury risk.' },
    { id: 'knife', name: 'Marine Knife', emoji: '🔪',
      required: 'Not mandated; essential.',
      reality: 'Cutting tangled lines + emergencies. Carry on PFD.' },
    { id: 'tools', name: 'Tools + Spare Engine Parts', emoji: '🔧',
      required: 'Not mandated; common sense.',
      reality: 'Spare prop, belts, impellers, sparkplugs. Has saved many a trip home.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BOATS (aquaculture-specific working vessels)
  // ───────────────────────────────────────────────────────────
  var BOATS = [
    { id: 'skiff', name: 'Open Working Skiff (16-22 ft)', emoji: '🚤',
      use: 'Small LPA + mid-size oyster operations.',
      power: '40-115 hp outboard',
      crew: '1-3',
      pros: 'Cheap to operate; nimble; trailerable; access shallow areas.',
      cons: 'Limited weather window; small payload.',
      typical: '$8K-$25K used. $30K-$60K new.' },
    { id: 'work-boat', name: 'Aquaculture Work Boat (22-30 ft)', emoji: '⚓',
      use: 'Standard-lease farms; oyster + mussel operations.',
      power: 'Diesel inboard 150-300 hp OR twin outboards',
      crew: '2-4',
      pros: 'Bigger deck for gear handling; davit-capable; weather-tolerant.',
      cons: 'Higher fuel + maintenance.',
      typical: '$50K-$200K depending on age + outfit.' },
    { id: 'mussel-boat', name: 'Mussel Harvest Boat (custom)', emoji: '🚢',
      use: 'Mussel harvest at scale. Built around longline-pull workflow.',
      power: 'Diesel inboard 300-500 hp',
      crew: '2-4',
      pros: 'Optimized for one job. Big winches + grading conveyors onboard.',
      cons: 'Single-purpose; expensive build.',
      typical: '$300K-$700K. Often custom-built.' },
    { id: 'kelp-boat', name: 'Kelp Cutter / Harvester', emoji: '🌿',
      use: 'Kelp harvest. Custom rig with cutting + bagging onboard.',
      power: 'Outboard or diesel.',
      crew: '2-3',
      pros: 'Spring kelp harvest is fast-paced; specialized rig speeds it.',
      cons: 'Single-season use.',
      typical: '$30K-$80K (adapted from workboat).' },
    { id: 'sea-truck', name: 'Sea Truck (landing craft style)', emoji: '🚛',
      use: 'Hauling cages, mooring blocks, seed.',
      power: 'Outboard 60-150 hp.',
      crew: '1-2',
      pros: 'Beach-accessible. Cargo deck.',
      cons: 'Slow; rough ride.',
      typical: '$30K-$60K.' },
    { id: 'punt', name: 'Punt / Tender (smallest)', emoji: '🛶',
      use: 'Shore-to-mooring; oyster inspection in tight spots.',
      power: '5-15 hp outboard or oars.',
      crew: '1-2',
      pros: 'Cheap; gets to where bigger boats can\'t.',
      cons: 'Tiny payload.',
      typical: '$1K-$5K.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BLUE CARBON + ECOSYSTEM SERVICES
  // ───────────────────────────────────────────────────────────
  var BLUE_CARBON = [
    { id: 'overview', title: 'What is Blue Carbon?',
      body: '"Blue carbon" refers to carbon captured + stored by ocean + coastal ecosystems — seagrass meadows, salt marshes, mangroves, and (newly recognized) kelp + shellfish aquaculture.' },
    { id: 'kelp-sequester', title: 'Kelp Carbon Sequestration',
      body: 'Kelp absorbs CO₂ from seawater to build tissue. Sugar kelp grows 1-3 m in one season. Per hectare, sugar kelp can fix as much carbon as a young forest — but the long-term storage path is debated (some sinks deep, some recycles quickly).' },
    { id: 'shellfish-mineralize', title: 'Shellfish Carbon Accounting',
      body: 'Shellfish CaCO₃ shells lock up carbon long-term in their shells. But forming shell releases some CO₂ — net accounting depends on water chemistry. Generally bivalve aquaculture is at-worst neutral, at-best modestly carbon-negative.' },
    { id: 'nutrient-removal', title: 'Nutrient (Nitrogen) Removal',
      body: 'A single oyster filters 50-100 L water/day, removing nitrogen + phytoplankton. This is the most-quantified ecosystem benefit. Long Island Sound + Chesapeake have priced this at $100-$1000/lb N removed.' },
    { id: 'eelgrass-link', title: 'Eelgrass + Aquaculture Synergy',
      body: 'Shellfish improve water clarity, helping eelgrass meadows. Eelgrass provides nursery habitat for juveniles + fish. Long-term: aquaculture can support broader ecosystem recovery.' },
    { id: 'carbon-credits', title: 'Carbon-Credit Markets',
      body: 'Voluntary markets pay $5-$100/ton CO₂-equivalent. Compliance markets (CA, EU ETS) pay $30-$80. Aquaculture-based credits emerging but methodologies still maturing.' },
    { id: 'imta', title: 'IMTA — Integrated Multi-Trophic Aquaculture',
      body: 'Co-locate species so waste of one feeds another. Example: salmon cage feeds dissolved nutrients to nearby kelp + shellfish. Maximizes ecosystem services + reduces net waste. Active research at UMaine + Bigelow.' },
    { id: 'limits', title: 'Limits + Critical Perspectives',
      body: 'Climate scientists caution against overstating aquaculture\'s carbon role. Most carbon is recycled, not sequestered. Best framing: "neutral-to-positive" food system, not "carbon negative." Marketing claims must be honest.' },
    { id: 'maine-leadership', title: 'Maine\'s Leadership',
      body: 'Maine\'s scale + cold-water species mix put it among US states best-positioned to develop credible aquaculture-based blue carbon programs. UMaine + Bigelow + GMRI + tribes + farms collaborating.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WATER COLUMN BIOLOGY (aquaculture-specific)
  // ───────────────────────────────────────────────────────────
  var WATER_COLUMN_AQ = [
    { zone: 'Surface (0-2 m)', use: 'Sugar kelp + winged kelp longlines (winter); some oyster floating cages',
      considerations: 'Light availability optimal but ice damage risk in winter; biofouling heavy in summer.' },
    { zone: 'Sub-surface (2-8 m)', use: 'Mussel dropper lines (main growing zone); oyster suspended cages',
      considerations: 'Temperature moderation; food (chl-a) typically peaks here in spring.' },
    { zone: 'Mid-depth (8-15 m)', use: 'Mussel droppers continued; scallop lantern nets',
      considerations: 'Reduced biofouling; cooler in summer; more difficult access.' },
    { zone: 'Deep (15+ m)', use: 'Some scallop aquaculture; experimental urchin lantern nets',
      considerations: 'Cold + dark; food limited but mortality risks low.' },
    { zone: 'Bottom (sediment)', use: 'Bag-on-bottom oysters; soft-shell clam beds; quahog beds',
      considerations: 'Sediment composition critical. Buried predator pressure (whelks, sea stars).' },
    { zone: 'Intertidal Zone', use: 'Soft-shell clams; quahogs; ribbed mussels (salt marsh experimental)',
      considerations: 'Exposed at low tide; thermal + freshwater stress; town-managed access.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE-SPECIFIC WEATHER + TIDE
  // ───────────────────────────────────────────────────────────
  var WEATHER_AQ = [
    { id: 'noreaster', name: 'Nor\'easter',
      threat: 'Storm surge + wave damage. Ice flows in winter.',
      response: 'Pull at-risk gear before storm. Add anchor scope. Secure dock + boat. Monitor real-time via NERACOOS.' },
    { id: 'spring-runoff', name: 'Spring Freshwater Runoff',
      threat: 'Salinity drop stresses bivalves. Sediment + nutrient pulse.',
      response: 'Sample salinity 3-5x post-rain. Consider deeper gear during peak runoff.' },
    { id: 'summer-heat', name: 'Summer Heat Wave',
      threat: 'DO depletion in back coves. Temperature stress on mussels.',
      response: 'Reduce stocking density. Monitor early-AM DO. Lower socks deeper if possible.' },
    { id: 'algal-bloom', name: 'HAB (Harmful Algal Bloom)',
      threat: 'PSP toxin closure. Harvest prohibited; product still alive but unsalable.',
      response: 'Wait for clearance. Switch to species not in season. Diversify lease portfolio.' },
    { id: 'storm-surge', name: 'Storm Surge',
      threat: 'High-water inundation. Damage to shore infrastructure + intertidal beds.',
      response: 'Storm-elevated mooring scope. Secure boats. Pre-position emergency supplies.' },
    { id: 'ice-formation', name: 'Winter Ice',
      threat: 'Ice scour on droppers. Damage to floats. Boat access blocked.',
      response: 'Pull gear or pre-position deeper. Use ice-breaker boat. Plan winter operations for non-ice days.' },
    { id: 'fog', name: 'Fog',
      threat: 'Boat collision + lost gear orientation.',
      response: 'COLREGS Rule 6 — safe speed. Sound signals. GPS chart + radar. Don\'t go out in dense fog if possible.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NOTABLE MAINE OPERATORS PROFILES
  // ───────────────────────────────────────────────────────────
  var OPERATOR_PROFILES = [
    { id: 'mook', name: 'Mook Sea Farms (Walpole, ME)',
      founded: '1985 by Bill Mook',
      operation: 'Oyster hatchery + grow-out operation on the Damariscotta River. Supplies seed to Maine + East Coast farmers + grows their own oysters under the Mook brand.',
      role: 'Maine\'s oyster anchor. Without Mook, the Maine oyster industry would barely exist.',
      lesson: 'Hatchery innovation drives industry growth. Mook\'s investments in genetic selection + disease resistance enabled Maine\'s oyster boom.' },
    { id: 'atlantic-sf', name: 'Atlantic Sea Farms (Saco, ME)',
      founded: '2009 (originally Ocean Approved)',
      operation: 'Kelp pioneer. Buys kelp from ~20 Maine farmer-partners + processes into retail products (kelp pasta, salsa, frozen blanched kelp).',
      role: 'Built Maine\'s kelp industry. Made kelp a viable winter income for lobster + finfish fishermen.',
      lesson: 'Aggregation + value-add unlocks small farm economics. Single farms can\'t do marketing; aggregator can.' },
    { id: 'bagaduce-mussel', name: 'Bagaduce Mussel Company',
      founded: '1985',
      operation: 'Heritage mussel rope-culture on the Bagaduce River. Direct-to-restaurant + co-op sales.',
      role: 'Pioneering Maine mussel rope-culture. Bagaduce River is Maine\'s most famous mussel water.',
      lesson: 'Place-based branding (Bagaduce mussels) creates retail differentiation.' },
    { id: 'cooke', name: 'Cooke Aquaculture',
      founded: '~2000 expansion into Maine (parent company from New Brunswick)',
      operation: 'Atlantic salmon sea-cage aquaculture in Cobscook + Machias Bay. Maine\'s largest single aquaculture operation by tonnage.',
      role: 'Salmon industry anchor; controversial environmental + tribal record.',
      lesson: 'Industrial-scale finfish aquaculture has different tradeoffs from extensive shellfish farming. Both have a place — communicate honestly.' },
    { id: 'whole-oceans', name: 'Whole Oceans (Bucksport, ME)',
      founded: '2018-2019 site secured; under construction',
      operation: 'Land-based RAS salmon facility — among world\'s largest planned.',
      role: 'Maine\'s land-based aquaculture pioneer. Climate-resilient + biosecure salmon production.',
      lesson: 'RAS may be the future of finfish aquaculture in Maine — bypassing environmental controversies of sea cages.' },
    { id: 'ccar', name: 'UMaine Center for Cooperative Aquaculture Research (CCAR, Franklin, ME)',
      founded: '~2000s',
      operation: 'University research + small-scale seed production. Public-private partnership.',
      role: 'R&D engine for Maine industry. Trial species + new methods.',
      lesson: 'Public research investment is essential — single farms can\'t fund the experimentation that grows the industry.' },
    { id: 'whole-oceans-deep', name: 'Whole Oceans (Bucksport)',
      founded: '2018 site secured; under construction',
      operation: 'Land-based RAS (recirculating aquaculture system) salmon facility. Among the world\'s largest planned (initial phase ~5,000 tons/yr). Treats incoming + outgoing water; biosecure.',
      role: 'Maine\'s big bet on the future of finfish aquaculture. Avoids sea-cage environmental + tribal-rights issues.',
      lesson: 'RAS technology is capital-intensive ($300M+ to build) but climate-resilient + community-acceptable. Could be Maine\'s aquaculture growth model.' },
    { id: 'mer-deep', name: 'Maine Sea Farms (multi-site)',
      founded: '2017',
      operation: 'Kelp aquaculture + research partnership. Multiple lease sites along Maine coast.',
      role: 'Anchor in kelp industry development. Partners with growers + processors.',
      lesson: 'Kelp industry is emerging; partnership models reduce risk for individual operators.' },
    { id: 'heritage', name: 'Heritage Shellfish Hatchery (Bremen, ME)',
      founded: '~2010',
      operation: 'Soft-shell clam + scallop seed production. Research partnership with Maine DMR.',
      role: 'Restoration-oriented hatchery; recovery of declining native species.',
      lesson: 'Conservation + commercial breeding overlap. Restoration science benefits commercial farmers + vice versa.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MONTHLY FARM CALENDAR (Maine mussel + oyster)
  // ───────────────────────────────────────────────────────────
  var FARM_CALENDAR = [
    { month: 'January', conditions: 'Ice + storms; water 1-4°C',
      tasks: 'Maintenance + repair gear in shop. Plan seed orders. Pull at-risk gear from ice exposure. Apply for permits if needed.',
      threats: 'Ice flow scour; nor\'easter damage; freezing fingers.',
      notes: 'Off-season; focus on prep.' },
    { month: 'February', conditions: 'Coldest water (1-3°C)',
      tasks: 'Kelp harvest STARTS — sugar kelp ready by month\'s end. Gear pre-positioning for spring.',
      threats: 'Ice + late nor\'easters.',
      notes: 'Kelp work in survival suits. Pay attention to forecast.' },
    { month: 'March', conditions: 'Mid-3-7°C; spring melt starts',
      tasks: 'Kelp HARVEST PEAK. Place spring oyster + mussel seed orders. Monitor salinity (freshwater runoff).',
      threats: 'Freshwater pulse stresses bivalves; melting ice; rapidly changing weather.',
      notes: 'High-tempo month. Long hours when weather allows.' },
    { month: 'April', conditions: '7-12°C; spring blooms beginning',
      tasks: 'Pick up mussel seed from hatchery. Deploy on droppers. Oyster cages from winter storage out.',
      threats: 'Salinity swings; early algal blooms.',
      notes: 'Long workdays. Hatchery seed coordination critical.' },
    { month: 'May', conditions: '12-18°C; spring bloom in full swing',
      tasks: 'Mussel growth + transfer to socks. Oyster cages worked + tumbled. Begin season for direct-to-restaurant sales.',
      threats: 'HAB onset possible; rapid growth = need to keep up.',
      notes: 'Restaurant + farmers market season starts.' },
    { month: 'June', conditions: '15-22°C',
      tasks: 'Maintenance + thinning. Tourists arrive; tour groups + sales.',
      threats: 'Warm-water risk for mussels; biofouling begins.',
      notes: 'High demand; ensure NSSP-compliant supply.' },
    { month: 'July', conditions: '18-22°C+ (peak summer)',
      tasks: 'Constant monitoring (probe). Tumble oysters frequently. Manage biofouling.',
      threats: 'Heat stress; HAB closures possible; vibrio risk.',
      notes: 'Most stressful month for shellfish.' },
    { month: 'August', conditions: '18-22°C+ (continued)',
      tasks: 'Same as July; harvest summer oysters; manage stress.',
      threats: 'HAB peak risk; warm-water mortality.',
      notes: 'Watch for closures + comply.' },
    { month: 'September', conditions: '15-20°C cooling',
      tasks: 'Oyster harvest PEAK. Plan for fall sales channels. Begin mussel harvest.',
      threats: 'Hurricane season + nor\'easters.',
      notes: 'Big income month if all goes well.' },
    { month: 'October', conditions: '10-15°C',
      tasks: 'Mussel HARVEST PEAK. Final oyster harvest. Plan kelp seed deployment.',
      threats: 'Storms; cooling stress on warm-water-adapted strains.',
      notes: 'Biggest revenue month for mussel operations.' },
    { month: 'November', conditions: '5-10°C',
      tasks: 'Kelp seed deployment. Mussel cleanup. Begin storm season prep.',
      threats: 'Nor\'easters; ice forming offshore.',
      notes: 'Setting up winter operations + next year\'s start.' },
    { month: 'December', conditions: '2-7°C; first ice',
      tasks: 'Final gear pull. Storm reinforcement. Holiday market sales (oysters!).',
      threats: 'Ice + storms; year-end gear damage.',
      notes: 'Christmas oysters are premium market.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: IMTA — Integrated Multi-Trophic Aquaculture (deep dive)
  // ───────────────────────────────────────────────────────────
  var IMTA = [
    { id: 'concept', title: 'What is IMTA?',
      body: 'Integrated Multi-Trophic Aquaculture co-locates species so waste of one feeds another. Classic example: salmon cage → kelp → bivalves. Salmon waste = dissolved nutrients; kelp absorbs nutrients; bivalves filter remaining particles.',
      benefit: 'Net waste reduction + multiple income streams from one site.' },
    { id: 'maine-trials', title: 'Maine IMTA Trials',
      body: 'UMaine + Bigelow Lab + commercial partners have run IMTA trials for ~15 years. Cobscook + Pleasant Bay sites combined salmon + kelp + mussels.',
      benefit: 'Showed substantial nutrient capture by kelp + mussels. Some farms now commercially integrated.',
      cite: 'UMaine Center for Cooperative Aquaculture Research' },
    { id: 'scale', title: 'Scale Considerations',
      body: 'IMTA works best at moderate scale. Too small = inefficient. Too large = lease + management complexity. Maine\'s LPA + standard lease tiers allow flexible IMTA.',
      benefit: 'Climate-adaptive food production at appropriate scale.' },
    { id: 'limitations', title: 'IMTA Limitations',
      body: 'Not a silver bullet. Site selection critical (currents match between species). Different species have different growing seasons. Regulatory complexity.',
      benefit: 'Honest framing: IMTA is one of several approaches, not a universal solution.' },
    { id: 'future', title: 'Future of IMTA in Maine',
      body: 'Climate + regulatory pressure pushing finfish to RAS (land-based). Will IMTA models adapt? Some research showing how to combine RAS effluent with constructed wetlands + bivalve filtration.',
      benefit: 'Maine well-positioned to lead due to research infrastructure + diverse industry base.',
      cite: 'NOAA aquaculture office' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE FOOD SAFETY (deep)
  // ───────────────────────────────────────────────────────────
  var FOOD_SAFETY = [
    { id: 'vibrio', title: 'Vibrio (Vp + Vv)',
      body: 'Vibrio parahaemolyticus + V. vulnificus are naturally-occurring bacteria that thrive in warm water (>15°C). Cause gastroenteritis (Vp) or fatal sepsis (Vv) when consumed in raw shellfish.',
      management: 'Summer harvest must move from boat to refrigeration FAST. Maine DMR Vibrio Control Plan dictates time-temperature limits. Major HACCP focus.',
      cite: 'FDA + Maine DMR Vibrio Control Plan' },
    { id: 'time-temp', title: 'Time-Temperature Controls',
      body: 'Shellfish must be ≤45°F within strict windows. Hot day after harvest = clock starts ticking faster. Maine\'s control plan specifies hourly windows depending on ambient temp.',
      management: 'Ice on board. Insulated coolers. Quick transfer to walk-in cooler at shore.' },
    { id: 'tagging', title: 'Tagging + Trace-back',
      body: 'Every commercial shellfish container must carry a tag with harvester license, date, area, species. Tag stays with product all the way to restaurant or retail. Allows trace-back within hours if an outbreak occurs.',
      management: 'Pre-printed tags ordered from supplier. Logged daily.' },
    { id: 'closures', title: 'Closure Compliance',
      body: 'Harvesting during a closure is a serious federal crime. DMR + state police + Coast Guard all enforce. Penalties: heavy fines, license revocation, criminal charges.',
      management: 'Check DMR closure bulletin daily. Sign up for SMS alerts.' },
    { id: 'haccp', title: 'HACCP (Hazard Analysis Critical Control Points)',
      body: 'Required certification for processors + many growers. Defines critical control points where contamination could occur + monitoring/correction procedures.',
      management: 'Training programs offered by Maine Sea Grant + UMaine.' },
    { id: 'depuration', title: 'Depuration Tank Operation',
      body: 'Holding shellfish in UV-sterilized seawater 48+ hr to purge contaminants. Regulated process — specific tank design + flow rates + monitoring.',
      management: 'Some farms have own depuration; others rent capacity at certified facilities.' },
    { id: 'storage', title: 'Wet vs Dry Storage',
      body: 'Wet storage = holding live shellfish in flowing water until sale. Dry storage = on ice in cooler. Wet preserves quality longer but adds NSSP requirements.',
      management: 'Choose based on volume + sales window.' },
    { id: 'allergens', title: 'Allergens + Food Safety Beyond Bacteria',
      body: 'Shellfish are a major allergen — kitchens + processors must prevent cross-contamination with non-allergen products. Mollusks vs crustaceans = different allergen classes.',
      management: 'Label clearly. Wholesale customers warned. Direct sales: ask customers about allergies.' },
    { id: 'biotoxin-monitor', title: 'Biotoxin Monitoring Program',
      body: 'Maine DMR + Bigelow Lab run weekly biotoxin sampling at multiple stations. Tests for saxitoxin (PSP), domoic acid (ASP), okadaic acid (DSP). Results inform DMR closures.',
      management: 'Farmer-side: stay informed; some farms volunteer for additional sampling sites.',
      cite: 'Maine DMR + Bigelow Lab' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COOPERATIVE MODELS
  // ───────────────────────────────────────────────────────────
  var COOPERATIVES = [
    { id: 'lobster-coops', title: 'Lobster Co-ops (Maine model)',
      body: 'Maine has 15+ lobster cooperatives. Members own shares; co-op buys catch + markets jointly. Stonington, Vinalhaven, Spruce Head, others.',
      relevance: 'Aquaculture cooperatives less common but growing. Stonington Lobster Co-op model could translate.' },
    { id: 'island-institute', title: 'Island Institute + Working Waterfront',
      body: 'Rockland-based nonprofit. Connects Maine islands + coastal communities. Advocacy for working-waterfront preservation. Climate adaptation support.',
      relevance: 'Important convener for aquaculture-related climate work.' },
    { id: 'maa', title: 'Maine Aquaculture Association',
      body: 'Industry trade group; ~200+ member operations. Advocacy + training + lease application help + technical consultation.',
      relevance: 'First call for any new Maine aquaculture operator.' },
    { id: 'amh', title: 'American Mussel Harvesters (RI but Maine-supplied)',
      body: 'Major mussel distributor in RI/MA. Buys from many Maine farms. Their grading + marketing standards shape what Maine growers produce.',
      relevance: 'Aggregator-distributor model. Allows small Maine farms to access big restaurant + retail markets.' },
    { id: 'asfca', title: 'Atlantic Sea Farms Co-op Model',
      body: 'Atlantic Sea Farms buys kelp from ~20 Maine grower-partners on contract. Provides seed, training, market.',
      relevance: 'Industry-builder; lower-risk path for individual operators.' },
    { id: 'wabanaki-coops', title: 'Tribal-led Aquaculture',
      body: 'Penobscot + Passamaquoddy + Maliseet exploring tribally-owned aquaculture operations. Sovereignty-affirming + community-benefit-focused.',
      relevance: 'Future of Maine aquaculture is more tribal-led.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: BUSINESS PLAN TEMPLATE (educational)
  // ───────────────────────────────────────────────────────────
  var BUSINESS_PLAN = [
    { section: 'Executive Summary',
      content: '2-3 sentence elevator pitch. Species, scale, market position. "I will grow X acres of [species] on [lease type] in [location] selling to [market] generating $[range] year 3."' },
    { section: 'Market Analysis',
      content: 'Wholesale market price for product. Direct-to-consumer pricing. Competition (other Maine farms + imports). Market trends (Maine oyster premiumization, kelp emergence, etc.).' },
    { section: 'Operations Plan',
      content: 'Species + culture method. Seed source. Site selection rationale. Lease application timeline + status. Anchor + gear specs. Labor + crew. Boat + equipment.' },
    { section: 'Marketing + Sales',
      content: 'Channels (wholesale, restaurant, farmers market, online). Branding (place-based, terroir, sustainability story). Customer acquisition plan.' },
    { section: 'Financial Projections',
      content: 'Year-1 startup costs (boat, gear, seed, permits, working capital). Year-1 zero or modest revenue. Year-2-3 revenue ramp. Break-even analysis. Cash-flow timing (long capital tie-up before first harvest).' },
    { section: 'Risk Management',
      content: 'Weather + storm; HAB closures; disease; market shifts; theft; gear damage. Insurance options. Diversification across species + sites.' },
    { section: 'Climate Adaptation',
      content: 'How will the farm adapt to 20-year climate trends? Species shifts? Site rotation? Genetic selection?' },
    { section: 'Workforce Plan',
      content: 'Owner-operator scale; future expansion needs; apprenticeship + crew development. Local hiring.' },
    { section: 'Community + Tribal Engagement',
      content: 'Abutter conversations; tribal-rights waters? Working-waterfront access. Town clam committee relations.' },
    { section: 'Exit + Succession Plan',
      content: 'Lease is asset (transferable with state approval). Family succession or sale. Conservation easement options for retention.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GLOBAL CONTEXT (Maine in world aquaculture)
  // ───────────────────────────────────────────────────────────
  var GLOBAL_CONTEXT = [
    { region: 'Global Scale', body: 'Global aquaculture produces ~120 million tonnes/yr (FAO 2024) — more than wild fisheries. Most growth in Asia (China, Indonesia, India). Western aquaculture is a small share.', maine: 'Maine\'s ~$100M annual is tiny globally but punches above weight in oyster premium markets + climate-adaptive species.' },
    { region: 'Mussel Aquaculture', body: 'Global leaders: China + Spain + Chile + New Zealand. Maine is a tiny player but produces premium-priced mussels for US markets.', maine: 'Maine mussel production: ~5-10 million lbs/yr (varies widely). Imports dominate US mussel market.' },
    { region: 'Oyster Aquaculture', body: 'Global leaders: China + South Korea + Japan + France. US oyster industry centered in Chesapeake + Gulf of Mexico + Pacific NW + Maine.', maine: 'Maine oyster premium price ($1-$3/oyster retail) + branded terroir makes Maine globally distinctive at the high end.' },
    { region: 'Salmon Aquaculture', body: 'Global leaders: Norway + Chile + Scotland + Canada. Net pen aquaculture controversial environmentally + politically.', maine: 'Maine\'s salmon industry has shrunk; Cooke remains. Whole Oceans land-based RAS may revive industry in different form.' },
    { region: 'Kelp Aquaculture', body: 'Global leaders: China + South Korea. Atlantic kelp aquaculture new. Norway + Maine + Maritime Canada all expanding.', maine: 'Atlantic Sea Farms + multiple growers = US East Coast kelp leadership.' },
    { region: 'Climate Vulnerability', body: 'Globally, aquaculture-suitable areas shifting. Tropical countries face increasing storms + heat; temperate (incl. Maine) face new species mixes + acidification.', maine: 'Maine\'s cold + diverse water mix means adaptation, not abandonment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: REGULATORY AGENCIES (deep)
  // ───────────────────────────────────────────────────────────
  var REGULATORY = [
    { agency: 'Maine Department of Marine Resources (DMR)',
      role: 'Primary state regulator for aquaculture + fisheries.',
      responsibilities: 'Lease applications, water classifications, biotoxin monitoring, marine patrol, license issuance.',
      contact: 'maine.gov/dmr; offices in Augusta + Boothbay Harbor + regional posts.' },
    { agency: 'NOAA NMFS (National Marine Fisheries Service)',
      role: 'Federal fisheries regulator.',
      responsibilities: 'Federal-waters fisheries; ESA-listed species; right-whale rules; stock assessments.',
      contact: 'fisheries.noaa.gov' },
    { agency: 'US FDA',
      role: 'Federal food safety lead.',
      responsibilities: 'NSSP federal coordination; shellfish import inspection; HACCP standards.',
      contact: 'fda.gov' },
    { agency: 'USCG (US Coast Guard)',
      role: 'Maritime safety + enforcement.',
      responsibilities: 'Vessel inspection, distress response, navigation aid maintenance, captain licensing.',
      contact: 'uscg.mil' },
    { agency: 'EPA (Environmental Protection Agency)',
      role: 'Water quality + Clean Water Act enforcement.',
      responsibilities: 'NPDES permits for some aquaculture; water quality standards.',
      contact: 'epa.gov' },
    { agency: 'USACE (Army Corps of Engineers)',
      role: 'Navigable waters + structures.',
      responsibilities: 'Section 10 permits for any new in-water structure (including aquaculture).',
      contact: 'usace.army.mil' },
    { agency: 'Town clam + shellfish committees',
      role: 'Local soft-shell clam + intertidal management.',
      responsibilities: 'Permit issuance, town water classifications, local rules. Each town different.',
      contact: 'Town offices.' },
    { agency: 'Tribal governments (Penobscot, Passamaquoddy, etc.)',
      role: 'Sovereign jurisdiction in tribal-claim waters.',
      responsibilities: 'Tribal-rights enforcement, fisheries co-management, cultural protection.',
      contact: 'Penobscot Nation, Passamaquoddy Tribe, Maliseet, Mi\'kmaq.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CARBON ACCOUNTING DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var CARBON_DETAIL = [
    { stage: 'Shell Formation (CaCO₃)',
      science: '1 gram CaCO₃ = 0.44 g C captured. But forming requires releasing 1 mole CO₂ per 2 moles HCO₃⁻ consumed (net release in atomic accounting).',
      net: 'Slightly net release on shell-forming step. Considered "neutral" by standard frameworks.',
      cite: 'Filgueira et al. 2019 Mar Pollut Bull' },
    { stage: 'Tissue Growth',
      science: 'Bivalve tissue (~50% organic carbon by dry weight). Filter-fed organic matter is incorporated into tissue.',
      net: 'Modest carbon capture in tissue. Most cycles back when shellfish eaten (or decomposed).',
      cite: 'Bricker et al. 2014' },
    { stage: 'Pseudofeces + Feces',
      science: 'Bivalves filter + reject particles as pseudofeces; metabolize others into feces. Some settles + may bury (carbon storage); some resuspends + cycles.',
      net: 'Partial sequestration when sediment burial happens. Site-specific.',
      cite: 'NOAA blue carbon' },
    { stage: 'Kelp Growth',
      science: 'Kelp photosynthesizes CO₂ + nutrients into biomass. Sugar kelp can produce 5-15 kg dry weight per linear m of line.',
      net: 'High carbon capture during growth season. Storage fate depends on downstream use (food = recycled; deep-sea sinking = sequestered).',
      cite: 'NOAA + Smale et al. 2013' },
    { stage: 'Nitrogen Removal',
      science: 'A single oyster filters 50-100 L water/day. Nitrogen removed is permanently exported from the water body when bivalve harvested.',
      net: 'Significant ecosystem service. Long Island Sound priced at $100-$1000/lb N removed.',
      cite: 'Bricker et al. 2014' },
    { stage: 'Compared to Beef',
      science: '1 kg beef = ~25 kg CO₂e (industrial). 1 kg oyster aquaculture protein = roughly 1-5 kg CO₂e.',
      net: 'Bivalve aquaculture is 5-25× lower-carbon than beef per kg protein.',
      cite: 'Carbon Trust + Hilborn et al. 2018' },
    { stage: 'Compared to Wild Fishing',
      science: 'Wild fishing has fuel + bycatch costs. Aquaculture is more efficient per kg protein but has feed + infrastructure costs (for fed species).',
      net: 'Bivalve aquaculture (unfed) is the lowest-carbon protein system except maybe carp/tilapia in best conditions.',
      cite: 'Hilborn et al. 2018' },
    { stage: 'Honesty on Carbon Claims',
      science: 'Most carbon cycled back to atmosphere when product consumed + decomposed. True sequestration only when carbon is permanently buried.',
      net: 'Best framing: "low-carbon" + "water-improving" rather than "carbon-negative." Honesty builds long-term trust.',
      cite: 'Bayraktarov + Saderne et al. 2020' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE-CAREER PROFILES (deeper)
  // ───────────────────────────────────────────────────────────
  var CAREER_PROFILES = [
    { id: 'tabitha', name: 'Tabitha — Oyster Farm Owner-Operator',
      path: 'BS Marine Biology UMaine → 2-yr crew on family farm → started own LPA in 2018 → expanded to 5-acre standard 2022.',
      day: 'Up at 5am Apr-Oct. Boat out for cage tumbling + harvest. Back by 1pm. Pack + sell at farmers market on weekends. Off-water Nov-Mar = repairs + planning.',
      challenges: 'Climate (heat events, HAB closures). Capital. Market relationships.',
      rewards: 'Independence; place-based work; community connection; intergenerational potential.',
      pay: '~$45K-$80K net after 5 years.',
      advice: 'Start LPA + small. Build relationships before applying for standard lease. Crew on someone else\'s farm first.' },
    { id: 'liam', name: 'Liam — Hatchery Technician',
      path: 'Aquaculture cert at UMaine + hatchery internship → full-time at Mook Sea Farms.',
      day: '7am-3pm. Water-quality checks at multiple tanks. Larval feeding + monitoring. Spat grading.',
      challenges: 'Very precise + repetitive work. Long hours during spawn season.',
      rewards: 'Steady income + benefits. Close to research. Foundation for entrepreneurship.',
      pay: '$36K-$55K with experience.',
      advice: 'Hatcheries always hiring. Critical industry chokepoint. Path to other careers.' },
    { id: 'mira', name: 'Mira — Maine DMR Aquaculture Coordinator',
      path: 'BA Policy → MS Environmental Policy → state hire → 8 years at DMR.',
      day: 'Reviewing lease applications. Mediating disputes between farmers + abutters + Coast Guard. Field visits to confirm lease boundaries.',
      challenges: 'Stakeholder conflict. Limited resources. Political pressure.',
      rewards: 'Shaping Maine\'s aquaculture future. State benefits + stability.',
      pay: '$60K-$85K.',
      advice: 'Policy + biology dual training valued. Engage with industry early.' },
    { id: 'eli', name: 'Eli — Kelp Farmer + Atlantic Sea Farms Partner',
      path: 'Lobsterman 15 years → diversified with 3-acre kelp lease 2018 → expanded to 8-acre 2022.',
      day: 'Winter: kelp harvest. Spring: kelp seed deployment + lobster preparation. Summer-Fall: lobster.',
      challenges: 'Two seasons of risk; gear management; cold winter work.',
      rewards: 'Income smoothing; climate-adaptive; community leadership.',
      pay: '~$65K-$120K (combined lobster + kelp).',
      advice: 'Diversify carefully. Atlantic Sea Farms partnership lowers risk. Lobster training transfers well.' },
    { id: 'shane', name: 'Shane — RAS Operator at Whole Oceans',
      path: 'HVAC tech background + aquaculture cert → hired in pre-opening team.',
      day: 'Shift work managing water filtration, fish health, feed delivery. Constant monitoring.',
      challenges: 'High-tech + capital-intensive operation; new industry with growing pains.',
      rewards: 'Steady salary; cutting-edge technology; climate-resilient industry.',
      pay: '$50K-$75K starting; up to $100K+ for shift supervisors.',
      advice: 'Land-based RAS is the future. Get technical skills now (HVAC, electrical, instrumentation).' },
    { id: 'jane', name: 'Jane — Wabanaki Aquaculture Coordinator (Passamaquoddy)',
      path: 'Tribal community member; community college aquaculture cert; tribal hire.',
      day: 'Coordinating tribal aquaculture trials. Liaison with state + federal agencies. Cultural revitalization work.',
      challenges: 'Sovereignty navigation. Capacity building. Skepticism from state.',
      rewards: 'Sovereignty + food security + cultural continuity. Building something new.',
      pay: 'Tribal-determined; comparable to state coordinator levels.',
      advice: 'Honor cultural protocols. Build relationships across nations. Patience.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EXTENDED AQUACULTURE GLOSSARY (alphabetical)
  // ───────────────────────────────────────────────────────────
  var EXTENDED_GLOSSARY = [
    { letter: 'A', entries: [
      'ABUTTER — Adjacent property owner with legal standing at lease hearings.',
      'ACIDIFICATION — Decline of ocean pH from CO₂ absorption.',
      'ACRE — Unit of area: 43,560 sq ft.',
      'ADAPTATION — Adjusting practices for climate or market changes.',
      'AERATION — Adding oxygen to water; relevant for some species.',
      'AGRICULTURAL — Of farming on land; aquaculture is the marine equivalent.',
      'ALGA / ALGAE — Photosynthetic single-cell or multi-cell aquatic organism.',
      'ALGAL BLOOM — Rapid algal population growth.',
      'ALGAL FEED — Cultured algae used to feed bivalve larvae in hatcheries.',
      'ALLELE — Variant form of a gene.',
      'ALLOMETRIC — Of relationship between traits across body size.',
      'AMBIENT — Surrounding environmental conditions.',
      'AMMONIA — Nitrogen waste; common in fish aquaculture.',
      'AMOEBOID — Cell type with irregular shape.',
      'AMPHIBIAN — Tetrapod animal (not aquaculture target in Maine).',
      'ANADROMOUS — Living in saltwater, spawning in fresh.',
      'ANCHOR — Hold gear in place.',
      'ANISOPTERA — Dragonfly suborder (rare aquaculture target).',
      'ANTHROPOGENIC — Human-caused; relevant for climate, pollution.',
      'AQUACULTURE — Controlled cultivation of aquatic organisms.',
      'AQUARIUM — Display container for aquatic organisms.',
      'ARTHROPOD — Phylum including crabs + lobsters.',
      'ASC — Aquaculture Stewardship Council certification.',
      'ASCIDIAN — Sea squirt; tunicate; aquaculture fouling organism.',
      'ASP — Amnesic Shellfish Poisoning.',
      'ATLANTIC SEA FARMS — Maine kelp aggregator.'
    ]},
    { letter: 'B', entries: [
      'BAA — Beneficial Algae Application.',
      'BACTERIA — Single-celled organisms; shellfish food safety concern.',
      'BAFFLE — Internal structure in tank (free surface effect).',
      'BAG (OYSTER) — Plastic mesh container holding oysters.',
      'BAG-ON-BOTTOM — Oyster culture method on intertidal flats.',
      'BAGADUCE — Maine river famous for mussel aquaculture.',
      'BAIT — Less applicable to aquaculture; relevant for trap fishery.',
      'BALANCED FEED — Nutritionally balanced fish food.',
      'BAMBOO — Sometimes used in aquaculture gear.',
      'BAP — Best Aquaculture Practices certification.',
      'BARGE — Flat-bottomed boat used for heavy gear deployment.',
      'BAY — Body of water bordering coast.',
      'BENTHIC — On the seafloor.',
      'BIOACCUMULATION — Build-up of substances in tissue.',
      'BIOFILTER — Biological filtration system in RAS.',
      'BIOFOULING — Unwanted organism growth on gear.',
      'BIOMASS — Total weight of living organisms.',
      'BIOSECURITY — Preventing pathogen introduction.',
      'BIOTOXIN — Toxin produced by living organism (PSP, ASP, DSP).',
      'BIVALVE — Mollusk with two hinged shells.',
      'BLOOM — Rapid increase in phytoplankton.',
      'BLUE CARBON — Carbon captured by ocean + coastal ecosystems.',
      'BMP — Best Management Practice.',
      'BOEM — Bureau of Ocean Energy Management.',
      'BOTTLE-NECK — Limiting factor in production.',
      'BOTRYLLUS — Tunicate genus; biofouling.',
      'BREEDING — Selective reproduction for desired traits.',
      'BREEDING PROGRAM — Multi-generation selection program.',
      'BROODSTOCK — Adult shellfish used for spawning.',
      'BRYOZOAN — Phylum; aquaculture fouling organisms.',
      'BUOY — Floating marker.',
      'BUOYANCY — Tendency to float.',
      'BYSSAL GLAND — Mussel\'s gland producing byssal threads.',
      'BYSSAL THREADS — Mussel\'s anchoring proteins.'
    ]},
    { letter: 'C', entries: [
      'CAGE — Enclosed structure for aquaculture (oyster, fish).',
      'CALCIUM CARBONATE — Mineral forming bivalve shells.',
      'CALCIUM CARBONATE SATURATION — How thermodynamically favorable shell formation is.',
      'CALORIE — Energy unit; relevant for fish feed.',
      'CARBON CREDITS — Tradable units for climate mitigation.',
      'CARRYING CAPACITY — Maximum sustainable load for ecosystem.',
      'CARBONATE CHEMISTRY — Water chemistry of CO₂ + bicarbonate + carbonate.',
      'CARCINUS — Genus of green crab (Carcinus maenas).',
      'CCAR — UMaine Center for Cooperative Aquaculture Research.',
      'CHLOROPHYLL-A — Pigment in phytoplankton; biomass proxy.',
      'CILIATED — Having cilia (e.g., bivalve gills).',
      'CLAM — Generic term for various bivalve species.',
      'CLEAN WATER — NSSP classification.',
      'CLIMATE-POSITIVE — Reducing net carbon footprint or capturing it.',
      'CLIMATE-RESILIENT — Withstanding climate stresses.',
      'CO2 — Carbon dioxide; key climate gas.',
      'COD — Atlantic cod aquaculture is small + experimental.',
      'COLREGS — International Collision Regulations.',
      'CONDITIONALLY APPROVED — NSSP water classification.',
      'CONNECTIVITY — Ecological + hydrodynamic connectivity between sites.',
      'COOLING — Refrigeration; cold-chain.',
      'COOPERATIVE — Member-owned business model.',
      'COOKE — Cooke Aquaculture (salmon).',
      'COPULATION — Reproductive activity.',
      'COTTON SOCK — Biodegradable mesh tube for mussel spat.',
      'CRYOPRESERVATION — Cold-storage of gametes for genetic preservation.',
      'CRUSTACEAN — Arthropod class; lobster, crab, shrimp.',
      'CULTCH — Substrate for oyster spat settlement.',
      'CULTIVATE — Grow under management.',
      'CULTIVATION — Aquaculture activity.',
      'CULTIVATION METHOD — Specific culture method (rope, cage, longline).',
      'CULTURE TANK — Hatchery vessel.',
      'CURRENT — Water motion.',
      'CYCLE — Annual or longer pattern.',
      'CYCLIC LOADING — Repeated stress on gear from waves + tides.'
    ]},
    { letter: 'D', entries: [
      'DAILY OPERATIONS — Routine farm work.',
      'D-LARVAE — D-shaped early larval stage.',
      'DAMARISCOTTA — Maine premier oyster river.',
      'DATALOGGER — Automatic recording instrument.',
      'DAVIT — Crane on boat.',
      'DECAY — Biological breakdown.',
      'DEEPWATER — Below 100 ft depth.',
      'DEFOLIATE — Removing leaves (relevant for some kelp processing).',
      'DEMERSAL — Bottom-dwelling.',
      'DENSITY — Stocking density of cultured organisms.',
      'DEPLETED STOCK — Population below sustainable level.',
      'DEPLOY — Place gear in water.',
      'DEPLOYMENT — Process of placing gear.',
      'DEPTH — Vertical position in water column.',
      'DEPURATION — Holding shellfish in clean water to purge contaminants.',
      'DERMO — Disease affecting eastern oysters (Perkinsus marinus).',
      'DIAGENESIS — Sediment alteration over time.',
      'DIATOM — Single-celled algae with silica shells.',
      'DIESEL — Engine fuel.',
      'DIET — Food consumed.',
      'DINOFLAGELLATE — Group of marine algae; some toxic.',
      'DIRECT-TO-CONSUMER — Selling without intermediary.',
      'DISCHARGE — Releasing water or waste.',
      'DISEASE — Pathological condition; surveillance + management focus.',
      'DISEASE RESISTANT — Genetic + breeding trait.',
      'DISSOLVED OXYGEN — Critical water quality parameter.',
      'DIVE — Underwater work.',
      'DIVERSITY — Multiple species or genetic variation.',
      'DMR — Maine Department of Marine Resources.',
      'DOMOIC ACID — ASP toxin.',
      'DOWNSTREAM — Toward water flow direction.',
      'DRIBBLE LINE — Continuous seeded line wound around dropper.',
      'DROPPER — Vertical line hanging from longline header.',
      'DROUGHT — Extended dry period.',
      'DSP — Diarrhetic Shellfish Poisoning.',
      'DUST — Fine particles; biofouling source.'
    ]},
    { letter: 'E', entries: [
      'EASTERN OYSTER — Crassostrea virginica; Maine\'s primary aquaculture oyster.',
      'EBB TIDE — Falling tide.',
      'ECOLOGY — Study of interactions between organisms + environment.',
      'ECOSYSTEM — Biological + physical environment as a unit.',
      'ECOSYSTEM SERVICE — Benefit ecosystems provide to humans.',
      'EELGRASS — Submerged grass habitat.',
      'EFFLUENT — Output water from aquaculture.',
      'EGGS — Female reproductive cells.',
      'EIDER — Sea duck (Somateria mollissima); aquaculture predator.',
      'ELECTRICAL — Boat + hatchery electrical systems.',
      'EL NIÑO — Pacific climate cycle (small Maine effect).',
      'ELVER — Juvenile eel.',
      'EMBRYO — Early developmental stage.',
      'ENDANGERED SPECIES — ESA-listed species.',
      'ENTANGLEMENT — Gear interaction with marine mammals.',
      'ENVIRONMENTAL ASSESSMENT — Required for some lease applications.',
      'ENZYME — Biological catalyst; relevant for digestion + aquaculture.',
      'EPIFAUNA — Organisms living on bottom surface.',
      'EPIPHYTE — Organism growing on another (often kelp).',
      'EQUIPMENT — Tools + gear used in aquaculture.',
      'ESCAPE — When farmed organisms enter wild environment.',
      'ESCAPE VENT — Required opening in lobster traps.',
      'ESTUARY — Where freshwater meets saltwater.',
      'ETHICS — Moral principles in aquaculture.',
      'EUHALINE — Marine salinity (30+ PSU).',
      'EUTROPHIC — Nutrient-rich water.',
      'EUTROPHICATION — Excessive nutrient enrichment.',
      'EVOLUTION — Change in population over generations.',
      'EXPERIMENTAL LEASE — Smaller Maine lease type for research.',
      'EXTERNAL FERTILIZATION — Reproduction in open water.',
      'EYED LARVAE — Late-stage larvae ready to settle.',
      'EYESPOT — Larval shellfish eye precursor.'
    ]},
    { letter: 'G', entries: [
      'GAMETE — Sex cell.',
      'GAMETOGENESIS — Process of forming sex cells.',
      'GEAR — Equipment used in aquaculture.',
      'GENETIC DIVERSITY — Variation in populations.',
      'GENETIC DRIFT — Random changes in allele frequency.',
      'GENOME — Complete DNA of organism.',
      'GENOMIC SELECTION — Modern selective breeding using DNA data.',
      'GENOTYPE — Genetic basis of trait.',
      'GMO — Genetically modified organism.',
      'GOOD AQUACULTURE PRACTICES (GAP) — Standardized husbandry guidelines.',
      'GROW-OUT — Phase of growing organisms to market size.',
      'GROW-OUT METHOD — Specific cultivation method.',
      'GULF OF MAINE — Maine\'s primary marine ecosystem.',
      'GULF STREAM — Warm Atlantic current.'
    ]},
    { letter: 'H', entries: [
      'HAB — Harmful Algal Bloom.',
      'HACCP — Hazard Analysis Critical Control Points.',
      'HALICHOERUS — Gray seal genus.',
      'HARVEST — Collection of grown organisms.',
      'HARVEST GEAR — Equipment for harvesting.',
      'HATCHERY — Facility producing seed.',
      'HEAD ROPE — Main horizontal line of longline.',
      'HEALTH — Organism health.',
      'HEAVY METALS — Pollutants of concern.',
      'HEAT EVENT — Temperature spike causing stress.',
      'HEIGHT — Vertical position.',
      'HETEROSIS — Hybrid vigor.',
      'HIGH ENERGY — Strong wave + current environment.',
      'HIGH TIDE — Maximum water level.',
      'HISTORIC — Of past times.',
      'HISTORICAL — Past events; aquaculture\'s short Maine history.',
      'HMS — Highly Migratory Species (HMS focus, not aquaculture).',
      'HOMARUS — American lobster genus.',
      'HORSE MUSSEL — Modiolus modiolus; offshore relative.',
      'HUSBANDRY — Animal management.',
      'HYDROCARBON — Petroleum compound.',
      'HYDRODYNAMIC — Water motion physics.',
      'HYDROGRAPHY — Mapping water bodies.',
      'HYPERTONIC — Higher solute concentration.',
      'HYPOTONIC — Lower solute concentration.',
      'HYPOXIA — Low dissolved oxygen.'
    ]},
    { letter: 'I', entries: [
      'IALA — International Association of Marine Aids to Navigation + Lighthouse Authorities.',
      'IBM — International + binational management.',
      'ICCAT — International Commission for the Conservation of Atlantic Tunas.',
      'ICE — Frozen water; aquaculture hazard.',
      'IFQ — Individual Fishing Quota (more relevant to wild capture).',
      'IMC — Integrated Multi-Trophic Aquaculture (synonym).',
      'IMTA — Integrated Multi-Trophic Aquaculture.',
      'INBREEDING — Reproduction among related individuals.',
      'INBREEDING COEFFICIENT — Statistical measure of relatedness.',
      'INCOME — Revenue from operation.',
      'INDIGENOUS — Native; Indigenous peoples + species.',
      'INDUCED SPAWNING — Triggering spawn via temperature or chemical signal.',
      'INDUSTRY — Aquaculture industry as a whole.',
      'INFAUNA — Organisms living within sediment.',
      'INFRASTRUCTURE — Physical + organizational structures supporting industry.',
      'INHERITANCE — Genetic transmission across generations.',
      'IN-SITU — In place; at the location.',
      'INSPECTION — Examination of stock or gear.',
      'INTERTIDAL — Zone between high + low tide.',
      'INTRODUCTION — Bringing new species or stocks.',
      'INVASIVE — Non-native species causing ecological harm.',
      'INVERTEBRATE — Animal without backbone.',
      'ION — Charged atom or molecule.',
      'IRON OXIDE — Rust; concern for steel gear.',
      'ISLAND INSTITUTE — Rockland-based working waterfront nonprofit.',
      'ISOLATED DANGER MARK — Buoy indicating specific hazard.'
    ]},
    { letter: 'J', entries: [
      'JACOB\'S LADDER — Climbing ladder onboard.',
      'JIB — Triangular sail.',
      'JILE — Spelling variant of jibe.',
      'JIM — Person\'s name (common Maine fisherman name).',
      'JONESPORT — Maine lobsterboat building heritage town.'
    ]},
    { letter: 'K', entries: [
      'KCAL — Kilocalories; energy unit.',
      'KEEL — Center hull spine.',
      'KELP — Brown algae; aquaculture target.',
      'KELP FOREST — Underwater habitat dominated by kelp.',
      'KILN — Drying chamber.',
      'KINETICS — Reaction rates.',
      'KING TIDE — Highest astronomical tide of year.',
      'KIT — Equipment set.',
      'KNIVES — Cutting tools used in shellfish handling.',
      'KNOT — (1) Speed unit. (2) Tied rope structure.',
      'KOMBU — Edible kelp (Japanese term).'
    ]},
    { letter: 'L', entries: [
      'LABEL — NSSP-required identification on shellfish.',
      'LAB — Laboratory; diagnostic + research facility.',
      'LABEL CLAIM — Marketing claim on product.',
      'LANTERN NET — Stacked disc-shaped chambers for scallop + oyster aquaculture.',
      'LARVAE — Early life stage.',
      'LARVAL DRIFT — Pelagic dispersal of larvae.',
      'LARVAL FOOD — Algae for larval feeding.',
      'LARVAL REARING — Hatchery stage from D-larvae to setting.',
      'LATERAL FLOW — Horizontal water movement.',
      'LATTICE — Grid structure (some gear designs).',
      'LAW — Legal framework.',
      'LEASE — Tract of water assigned to aquaculture operator.',
      'LEASE APPLICATION — Formal request for lease.',
      'LEASE TIER — Classification (LPA, Standard, Experimental).',
      'LEATHER — Some uses in old aquaculture (e.g., flank leather).',
      'LENGTH — Linear measurement.',
      'LICENSE — Permit for operation.',
      'LIFE CYCLE — Stages of organism\'s life.',
      'LIFE HISTORY — Pattern of life stages + reproduction.',
      'LIFESPAN — Maximum age.',
      'LIGHTING — Day-night cycle; relevant for hatcheries + monitoring.',
      'LIMITED ENTRY — Restricting number of permits issued.',
      'LIMNETIC — Of open water in lake.',
      'LINE — Rope; especially gear lines (head rope, dropper, mooring).',
      'LINEAR DENSITY — Mass per unit length.',
      'LITTORAL ZONE — Coastal water zone.',
      'LIVELIHOOD — Means of earning living.',
      'LOAD — Vessel cargo or product weight.',
      'LOG — Recordkeeping document.',
      'LOG ENTRIES — Daily records.',
      'LONGEVITY — Longer-than-average life.',
      'LONGLINE — Horizontal head rope with droppers.',
      'LONGLINING — Operating longline farm.',
      'LOOKBACK — Retrospective analysis.',
      'LOSS — Mortality or damage to stock.',
      'LOW TIDE — Minimum water level.',
      'LOW-PRESSURE SYSTEM — Storm precursor.',
      'LPA — Limited Purpose Aquaculture (Maine entry-level lease).'
    ]},
    { letter: 'M', entries: [
      'MACROALGAE — Multi-cell seaweed.',
      'MAINE — State known for cold-water aquaculture.',
      'MAINE DMR — Department of Marine Resources.',
      'MAINE INDIAN IMPLEMENTING ACT — 1980 federal-state-tribal settlement.',
      'MAINTENANCE — Routine farm + gear care.',
      'MAJOR REGULATION — Significant rule change.',
      'MANAGEMENT — Industry + agency management.',
      'MAR. — Marine; abbreviation.',
      'MARINE BIOLOGIST — Scientist studying marine organisms.',
      'MARINE PATROL — Law enforcement on water.',
      'MARK + RECAPTURE — Population estimation technique.',
      'MARKET — Where products are sold.',
      'MARKETING — Promotional activity.',
      'MASSACHUSETTS — Neighbor state with similar industry.',
      'MASS PRODUCTION — High-volume manufacturing.',
      'MAT — Sleeping or work mat.',
      'MATERIAL — Substance.',
      'MATURATION — Reproductive maturity.',
      'MATURE — Sexually mature.',
      'MAXIMUM SUSTAINABLE YIELD — Highest sustainable harvest level.',
      'MEAN — Average.',
      'MEAT — Edible tissue.',
      'MECHANICAL — Of machinery.',
      'MEDIA — Communications channels; also: data storage.',
      'MELANISTIC — Dark pigment variation.',
      'MEMBRANE — Cell membrane; probe membrane.',
      'MERIDIAN — Longitude line.',
      'MESH — Net or screen with holes.',
      'MESH SIZE — Hole opening size.',
      'METAMORPHOSIS — Body transformation.',
      'METHOD — Specific approach.',
      'MICRO — Small; prefix.',
      'MICROALGAE — Single-cell algae.',
      'MIGRATION — Movement.',
      'MINIMUM SIZE — Smallest harvestable size.',
      'MITIGATION — Reducing impact.',
      'MIXED USE — Multiple uses of same area.',
      'MOLD — Fungal growth.',
      'MOLLUSK — Phylum including bivalves.',
      'MOLT — Shedding shell (lobster) or exoskeleton (crab).',
      'MOMENT — Brief time.',
      'MONITORING — Routine observation.',
      'MOORING — Permanent anchor system.',
      'MORTALITY — Death rate.',
      'MOUSE — Test (mouse bioassay; obsolete for toxin testing).',
      'MOUNT — Mountain or rise.',
      'MSY — Maximum Sustainable Yield.',
      'MSX — Multinucleated Sphere X (oyster disease).',
      'MUSCLE — Tissue type.',
      'MUSSEL — Blue mussel.',
      'MYTILUS — Mussel genus.'
    ]},
    { letter: 'F', entries: [
      'FAC — Federal Aviation Authority.',
      'FAN-COOLING — Heat dissipation method.',
      'FANTAIL — Stern shape of boat.',
      'FAO — Food + Agriculture Organization (UN).',
      'FCR — Feed Conversion Ratio (fish aquaculture).',
      'FECAL COLIFORM — Bacterial indicator for water classification.',
      'FECES — Solid waste; pollution source from aquaculture.',
      'FEED — Pelleted food for fed species.',
      'FEED CONVERSION RATIO — Weight of feed per weight of fish produced.',
      'FEEDING — Process of providing food.',
      'FELLOWSHIP — Research training programs.',
      'FERMENTATION — Anaerobic breakdown of organic matter.',
      'FERTILE — Capable of reproduction.',
      'FERTILIZATION — Egg + sperm fusion.',
      'FILTER FEEDER — Organism feeding by filtering water.',
      'FILTRATION — Removing particles from water.',
      'FINFISH — Bony fish (vs invertebrate).',
      'FISH — Generic term for bony or cartilaginous aquatic vertebrates.',
      'FISHING — Wild-capture, contrast to aquaculture.',
      'FLAT — Intertidal flat.',
      'FLOATING CAGE — Surface-suspended aquaculture cage.',
      'FLOATING LINE — Line that floats on surface.',
      'FLOOD TIDE — Rising tide.',
      'FLUSHING — Water exchange rate.',
      'FLUSHING TIME — Average time to replace bay water via tides.',
      'FLUKE — (1) Anchor flukes. (2) Summer flounder (fluke).',
      'FOOD CHAIN — Sequence of who eats whom.',
      'FOOD WEB — Network of feeding relationships.',
      'FOULING — Unwanted biological growth (biofouling).',
      'FOULING COMMUNITY — Community of fouling organisms.',
      'FUNGUS — Eukaryotic microorganism; rare aquaculture issue.',
      'FUTURE — What lies ahead.'
    ]}
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE AQUACULTURE FAMILIES (composite profiles)
  // ───────────────────────────────────────────────────────────
  var AQUA_FAMILIES = [
    { profile: 'Damariscotta First-Generation Oyster Farmer',
      story: 'Started with 1-acre LPA in 2018. Year 1 zero income; learning curve steep. Year 2 some sales at farmers market. Year 3 restaurant accounts in Portland. Now has 5-acre standard lease + 100,000 oysters annual. Two seasonal employees.',
      lessons: 'First-generation entry is possible. LPA pathway works. D2C is path to viable economics.',
      challenges: 'Capital tight in early years; weather variability; learning curve.' },
    { profile: 'Bagaduce Mussel Family (3rd generation)',
      story: 'Grandfather started mussel rope-culture experiments in 1980s. Father expanded to 8-acre standard lease. Current operator brought modern marketing + D2C strategy. Family ownership multi-generation.',
      lessons: 'Multi-generation continuity in Maine aquaculture is possible. Each generation adds.',
      challenges: 'Climate adaptation; market shifts; family succession.' },
    { profile: 'Atlantic Sea Farms Kelp Partner',
      story: 'Lobsterman in Penobscot Bay. Added 3-acre kelp lease 2020 in partnership with Atlantic Sea Farms. Winter kelp work complements summer lobster. Income smoothing + climate-friendly story.',
      lessons: 'Diversification via cooperative model works. Existing fishermen can add aquaculture.',
      challenges: 'Two seasons of work; gear management.' },
    { profile: 'Passamaquoddy Tribal Aquaculture Coordinator',
      story: 'Passamaquoddy Tribal member coordinating tribal-led aquaculture initiative. Working with UMaine + Bigelow + Maine Aquaculture Association. Tribally-owned operations emerging.',
      lessons: 'Tribal sovereignty + economic development + cultural continuity converge in aquaculture.',
      challenges: 'Capacity building; state engagement; intergenerational continuity.' },
    { profile: 'Mook Sea Farms Multi-Generation',
      story: 'Bill Mook founded 1985. Family + employees operate hatchery + grow-out. Genetic selection + technical excellence. Maine\'s oyster industry largely depends on Mook seed.',
      lessons: 'Industry-essential infrastructure can be family-owned. Long-term investment + technical excellence.',
      challenges: 'Industry chokepoint; hatchery capacity oversubscribed.' },
    { profile: 'Whole Oceans RAS Pioneer',
      story: 'Multi-investor + community-engaged project building world-class land-based RAS salmon facility in Bucksport. Climate-resilient + biosecure + community-acceptable model.',
      lessons: 'Industry can adopt new technology + community-acceptable methods.',
      challenges: 'Capital intensive; new technology; market acceptance.' },
    { profile: 'Maine Aquaculture Association Member-Operator',
      story: 'Active MAA member. Engages in policy debates + training programs. Mentors new operators. Sustainable + growing operation.',
      lessons: 'Industry engagement = industry sustainability.',
      challenges: 'Time commitment; advocacy fatigue.' },
    { profile: 'Female + Diverse Operator',
      story: 'Increasing diversity in Maine aquaculture. Female + tribal + first-generation operators expanding. Industry inclusion improving.',
      lessons: 'Industry opening up. Persistence + good mentors are key.',
      challenges: 'Historic barriers; building networks.' },
    { profile: 'Climate-Adaptive Diversified Operator',
      story: 'Multi-species portfolio: oyster + kelp + mussel + potentially scallop. Climate-resilient through diversification. Multiple revenue streams.',
      lessons: 'Diversification = climate resilience.',
      challenges: 'Operational complexity; multiple gear types; multiple markets.' },
    { profile: 'Climate-Skeptical Traditional Operator',
      story: 'Single-species mussel operator. Resistant to diversification. Family tradition + established methods. Climate change skepticism.',
      lessons: 'Traditional approaches have value but climate adaptation may be needed.',
      challenges: 'Climate vulnerability; market changes.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE STUDENT-CAREER DECISION GUIDE
  // ───────────────────────────────────────────────────────────
  var STUDENT_CAREER = [
    { question: 'Should I pursue aquaculture as a career?',
      decision_factors: 'Love being on the water? Comfortable with physical work? Patient + observant? Interested in food systems + sustainability? Willing to be entrepreneurial + take risks?',
      pathways: 'High school marine science classes; community college aquaculture certificate; UMaine BS; commercial internship; family business.',
      key_steps: '(1) Visit working farms; (2) Take aquaculture courses; (3) Get hands-on experience via internship; (4) Identify your specialty (hatchery, farm operations, RAS, marketing); (5) Build network with industry.',
      timeline: '5-10 years from interest to operation.' },
    { question: 'What aquaculture role fits my interests?',
      decision_factors: 'Outdoor + physical: farm operations. Precision + chemistry: hatchery technician. Business + marketing: D2C operator. Science + research: marine biologist. Technology + automation: RAS operator. Policy + community: extension agent or DMR.',
      pathways: 'Each role has different training pathway. UMaine + community college programs cover most.',
      key_steps: 'Sample multiple roles via internship before committing. Talk to people in roles.',
      timeline: '2-5 years to identify + train for role.' },
    { question: 'Should I start my own farm or work for someone?',
      decision_factors: 'Capital + risk tolerance + entrepreneurial drive vs steady employment + benefits. Each path has merit.',
      pathways: 'Working for established operation: skills + relationships + savings. Own farm: LPA application + 2-3 years to revenue + entrepreneurial freedom.',
      key_steps: 'Work for 2-5 years for experienced operator. Save for capital. Apply for LPA. Plan transition.',
      timeline: '5-15 years to own established farm.' },
    { question: 'What\'s the future of aquaculture in Maine?',
      decision_factors: 'Industry growing 10-20% annually in oyster + kelp segments. Climate adaptation creates new opportunities. Working waterfront preservation continues. Tribal sovereignty conversations evolving.',
      pathways: 'Multiple paths. Industry expanding + diversifying.',
      key_steps: 'Engage with Maine Aquaculture Association. Stay current with industry trends.',
      timeline: '20+ year career horizon. Plan for change.' },
    { question: 'How do I make it economically viable?',
      decision_factors: 'Diversification + smart marketing + cost discipline + relationships.',
      pathways: 'Multi-species portfolio. D2C marketing. Cooperative membership. Multi-generation family operations.',
      key_steps: 'Develop business plan + financial reserves + relationships before commitment.',
      timeline: '3-5 years to economic stability after starting.' },
    { question: 'What if I\'m from a non-traditional background?',
      decision_factors: 'Maine aquaculture historically male-dominated + concentrated in coastal white families. But industry expanding inclusion. Persistence + finding good mentors are key.',
      pathways: 'Same as anyone else: education + internship + LPA application. Some additional support via UMaine + Maine Aquaculture Association.',
      key_steps: 'Build community + don\'t give up.',
      timeline: 'Same as anyone else with extra patience.' },
    { question: 'Can I combine aquaculture with another career?',
      decision_factors: 'Many Maine operators have multiple income streams: lobster + aquaculture; charter + aquaculture; teaching + aquaculture.',
      pathways: 'Diversification + portfolio careers common.',
      key_steps: 'Identify complementary skills + time commitments.',
      timeline: 'Variable.' },
    { question: 'What about climate change risks?',
      decision_factors: 'Climate uncertainty is real but Maine well-positioned. Climate adaptation strategies + diversification mitigate risk.',
      pathways: 'Diversify species + sites. Stay current with climate science. Engage in adaptation conversations.',
      key_steps: 'Don\'t avoid the industry because of climate; engage with it.',
      timeline: 'Climate adaptation is industry-wide ongoing effort.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COOPERATIVE MODELS DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var COOP_DEEP = [
    { topic: 'Atlantic Sea Farms Hub-and-Spoke Model',
      content: 'Aggregator + ~20 partner growers. Aggregator provides seed + training + market; growers provide labor + lease. Risk-sharing.',
      relevance: 'Industry-building cooperative model.' },
    { topic: 'Mussel Co-op Possibilities',
      content: 'Maine mussel growers organizing toward cooperative model (similar to lobster co-ops). Shared processing + marketing infrastructure.',
      relevance: 'Industry coordination opportunity.' },
    { topic: 'Oyster Co-op Trends',
      content: 'Some Maine oyster growers exploring cooperatives. Shared infrastructure + brand + marketing power. Damariscotta + similar regions.',
      relevance: 'Coop model emerging in oysters.' },
    { topic: 'Tribal-Led Cooperatives',
      content: 'Penobscot + Passamaquoddy + Maliseet exploring tribally-owned cooperative aquaculture. Sovereignty + community benefit + cultural continuity.',
      relevance: 'Future of Maine aquaculture more tribally-led + cooperative.' },
    { topic: 'Cooperative Benefits',
      content: 'Lower individual risk + costs. Collective bargaining power. Shared processing + marketing. Multi-generational continuity. Community ownership.',
      relevance: 'Why coops work for Maine industry.' },
    { topic: 'Cooperative Challenges',
      content: 'Governance complexity. Cultural fit requirements. Trust + relationships matter. Decision-making slower than corporate. Conflict resolution informal.',
      relevance: 'Coops aren\'t for everyone or every situation.' },
    { topic: 'Industry Future via Cooperation',
      content: 'Cooperatives + aggregators + partnerships likely to grow. Reduces capital barrier for new entrants. Strengthens industry collective voice.',
      relevance: 'Industry growth model.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WORKING WATERFRONT DEEP
  // ───────────────────────────────────────────────────────────
  var WATERFRONT_DEEP = [
    { topic: 'What is Working Waterfront',
      content: 'Maine\'s "working waterfront" includes docks, processing facilities, boat ramps, ice plants, fuel docks, cold storage, gear sheds, slipways + supporting infrastructure that supports commercial fishing + aquaculture industries.',
      relevance: 'Industry depends entirely on continued waterfront access.' },
    { topic: 'Threat from Coastal Gentrification',
      content: 'Coastal Maine property values have risen dramatically. Working-waterfront sites converted to residential + tourist uses. Many traditional facilities + family operations lost.',
      relevance: 'Major industry threat.' },
    { topic: 'Maine Working Waterfront Access Protection Program',
      content: 'State-level program using conservation easements + zoning protections to preserve working waterfront. Maine Coast Heritage Trust + Island Institute partner.',
      relevance: 'State-led preservation effort.' },
    { topic: 'Conservation Easements',
      content: 'Legal agreements limiting development on protected properties. Working-waterfront easements ensure permanent use for commercial fishing + aquaculture. Federally tax-deductible.',
      relevance: 'Legal tool for preservation.' },
    { topic: 'Specific Maine Working Waterfront Sites Protected',
      content: 'Multiple Maine working-waterfront sites protected via easements. Examples include processing facilities, fish piers, gear sheds, boat ramps in coastal towns.',
      relevance: 'Concrete preservation outcomes.' },
    { topic: 'Industry Advocacy',
      content: 'Maine Lobstermen\'s Association + Maine Aquaculture Association + Maine Coast Fishermen\'s Association + Island Institute + Maine Coast Heritage Trust all advocate for working-waterfront preservation.',
      relevance: 'Multi-stakeholder coordination essential.' },
    { topic: 'Aquaculture + Working Waterfront',
      content: 'Aquaculture industry expansion requires working-waterfront access (boat ramps + shore facilities). Industry growth + preservation interdependent.',
      relevance: 'Aquaculture industry has growing voice in preservation.' },
    { topic: 'Climate Change Implications',
      content: 'Sea level rise threatens working waterfront infrastructure. Storm surge + climate variability create new challenges. Adaptation requires investment.',
      relevance: 'Climate adaptation overlay on preservation.' },
    { topic: 'Tribal Working Waterfront',
      content: 'Wabanaki nations have ancestral connections to specific shorelines. Tribal aquaculture + restoration initiatives include working-waterfront elements.',
      relevance: 'Tribal sovereignty + waterfront preservation overlap.' },
    { topic: 'Future of Working Waterfront',
      content: 'Active preservation continues. Coastal gentrification pressure continues. Industry advocacy + state funding both essential. Maine\'s coastal future depends on outcome.',
      relevance: 'Industry sustainability depends on this.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE PUBLIC HEARING DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var HEARING_DEEP = [
    { topic: 'When Public Hearing Required',
      content: 'Maine standard + experimental aquaculture leases require public hearings. LPA leases do NOT require public hearings. Many controversies happen at standard-lease hearings.',
      relevance: 'Plan for hearing preparation if applying for standard lease.' },
    { topic: 'Who Has Legal Standing',
      content: 'Abutters (adjacent property owners), general public, tribal authorities (in tribal-claim waters), municipal officials. Anyone can testify; abutters have strongest legal standing.',
      relevance: 'Engage all potential objectors before hearing.' },
    { topic: 'Common Objections',
      content: '1. View obstruction; 2. Navigation impact; 3. Water access for personal use; 4. Environmental concerns (eelgrass, sensitive habitat); 5. Cultural significance; 6. Property values; 7. Noise + visual impact during operations.',
      relevance: 'Anticipate + address each objection proactively.' },
    { topic: 'Pre-Hearing Engagement',
      content: 'Talk to all abutters individually BEFORE submitting application. Listen to concerns. Address what you can; explain what you can\'t. Build relationships, not adversaries.',
      relevance: 'Most successful applications have engaged abutters early.' },
    { topic: 'Preparation Materials',
      content: 'Site map at multiple scales; business plan summary; gear specifications; sight-line analysis if view-obstruction is a concern; environmental impact summary; testimonials from supportive abutters + local officials.',
      relevance: 'Quality materials demonstrate seriousness.' },
    { topic: 'Tribal Engagement',
      content: 'Where waters are in tribal-claim or near tribal harvest areas, engage tribal authorities EARLY. Some sites are inappropriate; others may be collaborative opportunities. Tribal sovereignty is legal + ethical principle.',
      relevance: 'Tribal sovereignty must be respected.' },
    { topic: 'Hearing Procedure',
      content: 'DMR adjudicator runs hearing. Applicant presents. Public testimony. Applicant may respond. Cross-examination limited. Adjudicator may ask clarifying questions. Hearing typically 2-4 hours.',
      relevance: 'Know procedure; be prepared.' },
    { topic: 'Effective Responses',
      content: 'Listen first; respond factually + respectfully. Don\'t engage personal attacks. Reference site analysis + business plan. Show willingness to address legitimate concerns.',
      relevance: 'Stay professional + factual.' },
    { topic: 'Adjudicator Decision',
      content: 'DMR adjudicator drafts decision weeks-to-months after hearing. May approve, modify, or deny. Conditions attached to approvals (boundaries, gear types, marking).',
      relevance: 'Plan for time before final decision.' },
    { topic: 'After Decision',
      content: 'Comply with conditions if approved. Send thank-you notes to supportive testifiers. Consider appeals if denied (rare; expensive). Build relationships for future renewals.',
      relevance: 'Long-term relationship management.' },
    { topic: 'Hearing Case Studies',
      content: 'Maine Aquaculture Association has examples of well-managed + poorly-managed hearings. Learn from both. Talk to operators who\'ve been through the process.',
      relevance: 'Industry knowledge is valuable.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE FAMILY OPERATIONS
  // ───────────────────────────────────────────────────────────
  var FAMILY_OPERATIONS = [
    { topic: 'Family Business Tradition',
      content: 'Many Maine aquaculture operations are family businesses. Multi-generation involvement; intergenerational knowledge transfer; cultural anchor in coastal communities.',
      relevance: 'Family ownership = long-term commitment + community investment.' },
    { topic: 'Generational Succession',
      content: 'Aquaculture lease can transfer within family. Some operators have multi-generation plans. Younger generation often brings new methods + marketing approaches.',
      relevance: 'Plan succession early.' },
    { topic: 'Mook Sea Farms Multi-Generation',
      content: 'Bill Mook + family have operated Mook Sea Farms since 1985. Multi-generation ownership + continued family commitment.',
      relevance: 'Industry continuity model.' },
    { topic: 'Female + Diverse Family Operations',
      content: 'More female + diverse family-led aquaculture operations emerging. Industry inclusion improving.',
      relevance: 'Industry diversification.' },
    { topic: 'Tribal Family + Community Operations',
      content: 'Tribal aquaculture initiatives often family + community-led. Connects industry with tribal sovereignty + cultural continuity.',
      relevance: 'Future of Maine aquaculture more tribally-led + community-owned.' },
    { topic: 'Family Risk Management',
      content: 'Family operations face succession risk + intergenerational disagreement. Diversification + planning + legal structure all matter.',
      relevance: 'Family operations need governance.' },
    { topic: 'Family + Business Balance',
      content: 'Aquaculture is demanding work + can strain family relationships. Many operations have policies separating family + business decisions. Healthy boundaries.',
      relevance: 'Operations management matters.' },
    { topic: 'Industry Support for Family Operations',
      content: 'Maine Aquaculture Association + Maine Sea Grant provide family-business-specific resources. UMaine + community college aquaculture programs include family-succession content.',
      relevance: 'Support exists; access it.' },
    { topic: 'Climate Adaptation in Family Operations',
      content: 'Multi-generation families have multi-decade time horizons + can plan climate adaptation accordingly. Trade-off: also potentially stuck in old methods.',
      relevance: 'Generational wisdom + flexibility both matter.' },
    { topic: 'Future of Family Aquaculture',
      content: 'Family operations likely to continue but with evolving structure. New blended models with cooperative + corporate elements emerging.',
      relevance: 'Industry structure evolving.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SCALLOP + URCHIN AQUACULTURE DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var SCALLOP_URCHIN = [
    { topic: 'Sea Scallop Aquaculture (Maine)',
      content: 'Maine sea scallop aquaculture is small + emerging. Lantern net method adapted from Japanese Hokkaido tradition. Slow grower (5+ years to commercial size) = long capital tie-up. Premium pricing when reached.',
      relevance: 'Niche commercial opportunity; long-term investment.' },
    { topic: 'Bay Scallop Trials',
      content: 'Bay scallop (Argopecten irradians) faster-growing than sea scallop (12-18 months). Trials in S Maine + N MA. Some commercial promise.',
      relevance: 'Smaller meats but quicker turnover.' },
    { topic: 'Sea Urchin Status',
      content: 'Wild green urchin fishery boomed in 1990s + collapsed by 2000. Slow recovery. Aquaculture trials at UMaine CCAR + commercial partners exploring.',
      relevance: 'Historic Maine fishery; aquaculture restoration option.' },
    { topic: 'Urchin Roe (Uni) Market',
      content: 'Uni (urchin roe) is premium Japanese market product. $80-$200/lb. Maine urchin roe among world\'s best when in season.',
      relevance: 'Premium market opportunity.' },
    { topic: 'Sea Cucumber Aquaculture',
      content: 'Sea cucumber wild fishery in Maine has commercial value. Aquaculture trials at UMaine + Bigelow exploring potential.',
      relevance: 'Niche emerging industry.' },
    { topic: 'Halibut Aquaculture',
      content: 'Atlantic halibut aquaculture exists globally (Norway + Scotland). US trials limited. Maine has some history but small scale.',
      relevance: 'Possible future industry.' },
    { topic: 'Cod Aquaculture (Revival?)',
      content: 'Cod aquaculture exists in Norway. US trials failed in early 2000s due to feed-conversion + market price issues. Land-based RAS could revive.',
      relevance: 'Industry restart possible with new technology.' },
    { topic: 'Yellowtail Flounder (RAS)',
      content: 'Land-based RAS production trials at UMaine + commercial partners. Market premium for fresh fish.',
      relevance: 'Emerging diversification.' },
    { topic: 'Aquaculture Diversification Strategy',
      content: 'Maine industry expanding into multiple species + methods. Reduces single-species risk. Climate-adaptive.',
      relevance: 'Diversification = industry resilience.' },
    { topic: 'Future Species Trials',
      content: 'Razor clam, sea urchin, bay scallop, kelp varieties, dulse, halibut, yellowtail all under research + trial. Future Maine industry diversification.',
      relevance: 'Industry future is multi-species.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE FUTURE OUTLOOK — LAND-BASED RAS
  // ───────────────────────────────────────────────────────────
  var RAS_DEEP = [
    { topic: 'What is RAS',
      content: 'Recirculating Aquaculture System (RAS) is land-based closed-loop fish farming. Tanks + biological + mechanical + UV filtration recycle water. Climate-controlled + biosecure + low-impact alternative to sea cages.',
      relevance: 'Future of finfish aquaculture in places where sea-cage operations are controversial.' },
    { topic: 'Whole Oceans (Bucksport, Maine)',
      content: 'Whole Oceans is building world-class land-based RAS salmon facility in Bucksport, Maine. Among world\'s largest planned RAS operations. $300M+ capital project.',
      relevance: 'Maine\'s industry pivot from sea-cage salmon to land-based.' },
    { topic: 'Why RAS',
      content: 'Climate resilient (controlled environment); biosecure (no escape risk to wild); reduced environmental footprint vs sea cages; eliminates right-whale entanglement risk; community-acceptable; year-round production.',
      relevance: 'Solves many sea-cage controversies.' },
    { topic: 'Challenges',
      content: 'High capital cost ($300M+ for major facility); high energy use (water pumping + climate control); complex engineering; market acceptance still building; trained workforce needed.',
      relevance: 'Significant barriers despite benefits.' },
    { topic: 'Industry Adoption',
      content: 'Rapid growth globally. Norway + Iceland + Canada + Atlantic Sea Farms + Whole Oceans + Atlantic Sapphire (Florida) all major operators. Maine well-positioned with Bucksport.',
      relevance: 'Maine joining global trend; opportunity for jobs + supply chain.' },
    { topic: 'Workforce Development',
      content: 'RAS requires different skills than traditional aquaculture: water chemistry, biofiltration, HVAC, electrical, automation. UMaine + Maine community colleges expanding programs.',
      relevance: 'Workforce pipeline development needed.' },
    { topic: 'Market Position',
      content: 'RAS-produced salmon can be marketed as "climate-friendly + biosecure + community-acceptable." Premium positioning available.',
      relevance: 'Branding + storytelling opportunity.' },
    { topic: 'Climate Resilience',
      content: 'RAS facilities controlled environment shields from climate-driven sea-temperature changes. Long-term outlook: climate-resilient food production.',
      relevance: 'Future-proof against climate uncertainty.' },
    { topic: 'Whole Oceans Schedule',
      content: 'Bucksport facility under construction. Production scheduled to begin within 2-3 years. Initial 5,000 tonnes/yr planned; scalable.',
      relevance: 'Major industry expansion underway.' },
    { topic: 'Broader Impact',
      content: 'Whole Oceans operation will employ 100+ people, create supply chain, transform Bucksport + region. Demonstrates climate-adaptive industry.',
      relevance: 'Major Maine economic + workforce development.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE TECHNICAL DETAILS
  // ───────────────────────────────────────────────────────────
  var TECHNICAL_DEEP = [
    { topic: 'Mussel Spat Settlement',
      content: 'Mussel larvae settle from water column onto substrate. Spat ~1-2mm initially. Attach via byssal threads within 24 hours. Density: 50-100 spat/m initially; survival 30-50% to harvest.',
      relevance: 'Foundation of rope-culture operation.' },
    { topic: 'Oyster Cultch Setting',
      content: 'Oyster spat settle on cultch (old shell) substrate. Hatchery setting in tanks with cultch + larvae + algae food. Some "cultchless" systems set on tiny grit particles for premium single oysters.',
      relevance: 'Spat-on-shell vs cultchless = product differentiation.' },
    { topic: 'Kelp Sporophyte Development',
      content: 'Kelp life cycle: spores → gametophytes → sporophytes (the kelp we know). Hatchery seeds gametophytes on rope; sporophytes develop + grow into harvestable kelp.',
      relevance: 'Different from animal aquaculture; requires understanding life cycle.' },
    { topic: 'Triploid Bivalve Production',
      content: 'Triploid bivalves (3 sets of chromosomes) produced by hatchery via heat-shock or chemical treatment at egg stage. Don\'t spawn; faster growth; year-round marketability.',
      relevance: 'Increasingly standard for premium oyster industry.' },
    { topic: 'Selective Breeding for Disease Resistance',
      content: 'Multi-generation breeding for traits like MSX resistance (in oysters) + growth rate + heat tolerance. Industry-collaborative breeding programs in Maine.',
      relevance: 'Climate adaptation strategy.' },
    { topic: 'IMTA Implementation',
      content: 'Integrated Multi-Trophic Aquaculture: salmon + kelp + bivalves in single site. Each species\' waste feeds next. Reduces net waste + adds revenue. Research + commercial trials.',
      relevance: 'Future of integrated farming.' },
    { topic: 'Genetic Diversity Management',
      content: 'Hatcheries maintain broodstock pedigrees + rotate genetic lines. Prevents inbreeding + maintains adaptability. Industry-collaborative gene-pool management.',
      relevance: 'Long-term industry sustainability.' },
    { topic: 'Hatchery Biosecurity',
      content: 'UV sterilization + sand filtration + quarantine + diagnostic surveillance protect against pathogen introduction. Mass mortality events from disease can collapse industry segments.',
      relevance: 'Critical to industry survival.' },
    { topic: 'Climate-Adapted Strains',
      content: 'Selective breeding for heat tolerance + acidification resistance + early-maturity. Bigelow + UMaine + commercial partners active in research.',
      relevance: '5-15 year horizon for major impact.' },
    { topic: 'Workforce Specialization',
      content: 'Different aquaculture roles require different skills: hatchery (precision chemistry + biology), grow-out (boat handling + gear maintenance), processing (food safety + cold chain), RAS (HVAC + electrical + biofiltration).',
      relevance: 'Career diversity within aquaculture.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KELP INDUSTRY CASE STUDY (DEEP)
  // ───────────────────────────────────────────────────────────
  var KELP_INDUSTRY = [
    { topic: 'Origin of Maine Kelp Industry',
      content: 'Maine kelp aquaculture emerged in early 2010s. Atlantic Sea Farms (originally Ocean Approved) founded ~2009. UMaine + Bigelow Lab + commercial partners worked to develop seeding + grow-out + market.',
      relevance: 'New industry; rapid growth potential.' },
    { topic: 'Sugar Kelp Biology',
      content: 'Sugar kelp (Saccharina latissima) is a brown algae. Photosynthesizes CO₂ + nutrients into biomass. Grows 1-3m in single winter season. Annual crop cycle.',
      relevance: 'Climate-positive crop; cold-water specific.' },
    { topic: 'Cultivation Method',
      content: 'Seedling (microscopic gametophyte stage) deployed on rope in October-November. Grows through winter. Harvested April-May before warming triggers degradation. Single-season cycle.',
      relevance: 'Different rhythm from bivalve aquaculture; opposite season from most fisheries.' },
    { topic: 'Aggregator Model',
      content: 'Atlantic Sea Farms aggregates kelp from ~20+ Maine partner growers. Provides seed + training + market. Lowers risk for individual operators. Industry-building partnership model.',
      relevance: 'Cooperative aggregator model is industry-building.' },
    { topic: 'Why Now',
      content: 'Climate-friendly food story; consumer interest; complementary winter season for lobster + finfish fishermen; cooperative model lowers barrier; expanding research support.',
      relevance: 'Multiple favorable factors converging.' },
    { topic: 'Production + Market',
      content: 'Maine kelp production ~1,000+ tonnes/year + growing. Wholesale $0.50-$2/lb fresh; specialty products higher. Domestic + export demand.',
      relevance: 'Rapid market growth.' },
    { topic: 'Climate-Positive Story',
      content: 'Kelp absorbs CO₂ + nutrients during growth. Per acre, kelp can capture as much carbon as a young forest. Nitrogen + nutrient capture also improves water quality.',
      relevance: 'Climate-friendly food + ecosystem service.' },
    { topic: 'Challenges',
      content: 'Warming spring water causes premature die-off; biofouling by bryozoans late in season; storms during winter; market acceptance still building; processing capacity limited.',
      relevance: 'Industry overcoming hurdles.' },
    { topic: 'Diversification Strategy',
      content: 'Many Maine lobster + finfish operators are adding kelp as winter portfolio element. Income smoothing; gear synergy; climate-friendly story.',
      relevance: 'Industry growth driven by diversification.' },
    { topic: 'Future of Maine Kelp Industry',
      content: 'Industry expected to grow 20%+ annually. Multiple new operators entering. Atlantic Sea Farms scaling. Other companies emerging. Climate-friendly food trend supports.',
      relevance: 'Bright outlook with continued investment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SALMON INDUSTRY CASE STUDY (DEEP)
  // ───────────────────────────────────────────────────────────
  var SALMON_INDUSTRY = [
    { topic: 'Wild Atlantic Salmon Decline',
      content: 'Maine wild Atlantic salmon (Salmo salar) populations decimated by industrial fishing 1700s-1900s + dam construction blocking spawning runs. By 1900s, salmon nearly extirpated from Maine rivers. Federal Endangered Species Act listing 2009.',
      relevance: 'Wild salmon protected; aquaculture is salmon\'s commercial form in Maine.' },
    { topic: 'Salmon Aquaculture Origins (1970s)',
      content: 'First commercial salmon aquaculture in Cobscook Bay, eastern Maine. Sea-cage method imported from Norway. Industry grew through 1980s-2000s.',
      relevance: 'Maine\'s salmon aquaculture has 50+ year history; among first US.' },
    { topic: 'Cooke Aquaculture (Major Operator)',
      content: 'Cooke Aquaculture (parent company in New Brunswick, Canada) expanded into Maine 2000s. Operates sea cages in Cobscook + Machias Bay. Maine\'s largest aquaculture operation by tonnage.',
      relevance: 'Dominant Maine salmon producer. Controversial environmentally + tribally.' },
    { topic: 'Sea-Cage Method',
      content: 'Salmon raised in floating cages in coastal saltwater. After freshwater smolting phase ashore. 18-24 month grow-out. Industrial-scale operation.',
      relevance: 'Method dominant globally but increasingly controversial.' },
    { topic: 'Environmental Concerns',
      content: 'Sea lice (parasitic copepods) transmit to wild fish; nutrient pollution from cages; escape risk (genetic dilution of wild populations); seafloor sediment buildup under cages; right whale entanglement.',
      relevance: 'Multiple concerns drive industry transition.' },
    { topic: 'Tribal-Rights Conflicts',
      content: 'Some Cooke operations in Passamaquoddy-claim waters. Tribal sovereignty + traditional fishing rights conflict with sea-cage operations.',
      relevance: 'Ongoing legal + cultural tension.' },
    { topic: 'Industry Shrinkage',
      content: 'Maine salmon industry has shrunk over time. Environmental + market + tribal pressures + competition from Norwegian + Chilean imports. Some Cooke operations closed.',
      relevance: 'Industry transition underway.' },
    { topic: 'Land-Based RAS (Whole Oceans)',
      content: 'Whole Oceans land-based recirculating aquaculture system facility under construction in Bucksport. Climate-resilient + biosecure + community-acceptable. Among world\'s largest planned.',
      relevance: 'Future of Maine salmon aquaculture likely land-based RAS.' },
    { topic: 'Restoration of Wild Salmon',
      content: 'Federal ESA + state + tribal efforts attempting to recover wild salmon. Penobscot River Restoration removed dams. Conservation hatcheries augment. Multi-decade effort.',
      relevance: 'Wild + farmed salmon coexist; restoration is long-term.' },
    { topic: 'Future of Maine Salmon Industry',
      content: 'Sea-cage industry continuing to shrink. Land-based RAS growing. Wild salmon restoration ongoing. Industry pivot underway.',
      relevance: 'Significant industry transformation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: OYSTER INDUSTRY CASE STUDY (DEEP)
  // ───────────────────────────────────────────────────────────
  var OYSTER_INDUSTRY = [
    { topic: 'History of Maine Oyster Industry',
      content: 'Damariscotta River + other Maine estuaries had vast oyster reefs (Wabanaki shell middens 6,000+ years old prove the abundance). Colonial overfishing + sedimentation collapsed wild populations by 1800. For 150+ years, Maine had essentially no commercial oyster fishery.',
      relevance: 'Maine\'s oyster industry today is rebuilding on different model than original wild reefs.' },
    { topic: 'Modern Aquaculture Origins (1985)',
      content: 'Bill Mook founded Mook Sea Farms in Walpole, ME in 1985. Built oyster hatchery + grow-out operation. Selective breeding + technical excellence. Industry mentorship + training.',
      relevance: 'Mook is foundational. Most Maine oyster farms get seed from Mook (or other hatcheries Mook helped establish).' },
    { topic: 'Aquaculture Method Choice',
      content: 'Maine oyster farms primarily use floating cages (premium method) + bag-on-bottom (cheaper). Floating cages tumbled periodically to produce uniform deep-cupped oysters. Selective breeding for traits. Triploid stock increasingly standard.',
      relevance: 'Method choice affects product quality + premium positioning.' },
    { topic: 'Damariscotta River Terroir',
      content: 'Damariscotta\'s cold + saline + tidally well-flushed estuary + minimal MSX/Dermo disease = world-class oyster water. Pemaquid + Glidden Point + Bagaduce + Mookhouse all have distinct terroirs.',
      relevance: 'Place-based identity + storytelling = premium pricing.' },
    { topic: 'Brand + Marketing',
      content: 'Maine oysters named for farm + estuary (Glidden Point, Pemaquid Mussel Point, etc.). Each brand has distinct flavor signature. Restaurants + raw bars + online sellers feature Maine oysters prominently.',
      relevance: 'Branding + storytelling drives premium pricing.' },
    { topic: 'Direct-to-Consumer Channels',
      content: 'Maine oyster farms increasingly D2C: farmers market + restaurant accounts + online + tours. D2C doubles or triples wholesale price.',
      relevance: 'Smart D2C operators capture more of retail margin.' },
    { topic: 'Climate Adaptation in Oyster Industry',
      content: 'Cold-water adaptation: cooler Maine waters historically. Climate warming creates both stress (HAB closures, Vibrio risk) + opportunity (oysters tolerate slightly warmer water than mussels). Hatcheries breeding for resilience.',
      relevance: 'Long-term outlook positive for oyster but requires adaptation.' },
    { topic: 'NSSP Compliance',
      content: 'Oysters operate under NSSP framework: water classification + tagging + cold-chain + closures. Vibrio Control Plan specific to oysters in summer.',
      relevance: 'Compliance is non-negotiable + cost of doing business.' },
    { topic: 'Industry Growth Trajectory',
      content: 'Maine oyster industry grew from $0 in 1985 to $20-30M+ annually by 2024. Continued 10-20% annual growth in oyster + kelp segments.',
      relevance: 'Significant employment + economic opportunity.' },
    { topic: 'Future of Maine Oyster Industry',
      content: 'Climate-resilient + premium-positioned. Limited only by working-waterfront access + hatchery capacity. Industry positioned for next 20+ years if working waterfront + hatchery capacity preserved.',
      relevance: 'Active advocacy required for continued growth.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MUSSEL INDUSTRY CASE STUDY (DEEP)
  // ───────────────────────────────────────────────────────────
  var MUSSEL_INDUSTRY = [
    { topic: 'Maine Mussel Industry History',
      content: 'Wild mussel beds harvested historically. Aquaculture began 1970s with European rope-culture methods. Industry grew through 1980s-2000s. Bagaduce Mussel Company + similar operations pioneered.',
      relevance: 'Aquaculture rebuilt + scaled Maine mussel industry.' },
    { topic: 'Rope Culture Method',
      content: 'Spat (newly-settled mussels) loaded into mesh socks + wrapped around dropper lines. Mussels anchor via byssal threads. Mesh degrades over months. Grow 18-24 months to market size.',
      relevance: 'Standard Maine method. Familiar to all Maine operators.' },
    { topic: 'Bagaduce River Terroir',
      content: 'Bagaduce + Penobscot Bay waters produce premium mussels. Cold + clean + protected. Bagaduce Mussel Company brand globally recognized.',
      relevance: 'Place-based identity + quality reputation.' },
    { topic: 'Industry Challenges',
      content: 'Heat stress in summer; ice damage in winter; biofouling year-round; sea duck predation; HAB closures; competition with cheaper imports (Pacific NW + Chile).',
      relevance: 'Multiple operational + market pressures.' },
    { topic: 'Industry Growth',
      content: '~5-10M lbs/yr Maine mussel production. Industry roughly stable; growth limited by competitive pressure + capacity.',
      relevance: 'Mature industry; differentiation matters.' },
    { topic: 'Market Channels',
      content: 'Wholesale $1.50-$3.50/lb; D2C $3-$8/lb. Restaurant + farmers market premium achievable.',
      relevance: 'D2C captures more value.' },
    { topic: 'Climate Adaptation',
      content: 'Mussels prefer cold water (5-22°C optimal). Warming creates summer stress. Some mortality during heat waves. Industry adapting via depth + species portfolio.',
      relevance: 'Climate is mussel industry challenge.' },
    { topic: 'Cooperative Models',
      content: 'Some mussel growers in cooperative arrangements. Atlantic Sea Farms model could expand to mussels. Industry exploring.',
      relevance: 'Cooperation could enable smaller farms to access wider markets.' },
    { topic: 'Right Whale + Vertical Lines',
      content: 'Mussel longline gear has vertical lines (mooring + dropper). Right whale rules increasingly affect mussel aquaculture. Industry retrofitting toward ropeless or compliant gear.',
      relevance: 'Industry transition cost.' },
    { topic: 'Future of Maine Mussel Industry',
      content: 'Maine mussel industry mature + sustainable but growth-constrained. Industry strength: terroir + brand + cold-water quality.',
      relevance: 'Mussels likely remain Maine industry component for foreseeable future.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ADVANCED ECONOMICS — DETAILED BUSINESS METRICS
  // ───────────────────────────────────────────────────────────
  var ADVANCED_ECONOMICS = [
    { metric: 'Net Profit Margin (Mussel Farm)',
      value: '15-35% typical',
      detail: 'Mussel farms typically run 15-35% net profit margin in established operations. Year 1-2 typically zero or negative (capital investment + seeding). By year 3-5 if well-managed: 25-35%. Diversified operations may run higher due to revenue smoothing.',
      planning: 'Plan financial reserves to cover Year 1-2 losses. Build customer relationships early.' },
    { metric: 'Net Profit Margin (Oyster Farm)',
      value: '20-40% typical',
      detail: 'Oyster farms can achieve higher margins than mussels due to D2C + premium positioning. 20-40% in established operations. Some premium-brand farms 45%+.',
      planning: 'Premium positioning requires sustained quality + branding investment.' },
    { metric: 'Net Profit Margin (Kelp Farm via Atlantic Sea Farms)',
      value: '10-25% typical',
      detail: 'Lower margin but income smoothing makes it valuable diversification. Atlantic Sea Farms contracts provide guaranteed market at agreed price.',
      planning: 'Kelp as portfolio diversification, not primary operation.' },
    { metric: 'Customer Acquisition Cost (D2C)',
      value: '$5-$30 per customer',
      detail: 'For direct-to-consumer Maine farms: customer acquisition through farmers market + social media + word-of-mouth. Cost varies dramatically by channel + content quality.',
      planning: 'Track CAC. Calculate customer lifetime value. Optimize.' },
    { metric: 'Customer Lifetime Value (D2C)',
      value: '$200-$2000+',
      detail: 'Maine aquaculture D2C customers (oyster CSAs, mussel subscribers) often buy 10-100 times over years. LTV calculation: avg order value × purchase frequency × retention years.',
      planning: 'High LTV justifies investment in customer relationships.' },
    { metric: 'Capital Investment Payback Period',
      value: '2-4 years (well-managed LPA)',
      detail: 'Plan for 2-4 year payback on initial $25K-$50K LPA investment. Year 1 zero revenue + Year 2-3 ramp + Year 4 break-even + Year 5+ profitable.',
      planning: 'Cash flow planning critical. Maintain reserves.' },
    { metric: 'Insurance Cost per Acre',
      value: '$500-$3000+ annually',
      detail: 'Property + crop + liability coverage. Higher for finfish than shellfish. Storm-related claims drive rates up over time.',
      planning: 'Annual budget item. Premiums increasing with climate volatility.' },
    { metric: 'Labor Cost per Production Cycle',
      value: '$15-$25/hour typical wage rate',
      detail: 'Farm crew + harvest help. Specialty (diving, hatchery technician) higher. Wages increasing as labor market tight.',
      planning: 'Workforce development + competitive wages.' },
    { metric: 'Fuel Cost per Trip',
      value: '$20-$100+ per trip',
      detail: 'Outboard motor at trolling speed: ~3-5 gph. Hour-long farm visit + return: ~$30-$60. Daily fuel cost is meaningful operational expense.',
      planning: 'Plan trips efficiently. Multi-task on each visit.' },
    { metric: 'NSSP Compliance Costs',
      value: '$1000-$5000+ annually',
      detail: 'HACCP training + testing equipment + tagging + compliance audits + cold storage maintenance. Cost of doing business.',
      planning: 'Budget annually. Include in business plan.' },
    { metric: 'Lease Application Cost (Standard)',
      value: '$2000-$10000+',
      detail: 'Standard lease applications require legal counsel + environmental assessment + survey + public hearing preparation. Costs add up.',
      planning: 'Cost-benefit analysis: standard lease ROI must justify application cost.' },
    { metric: 'Marketing + Branding Investment',
      value: '$2000-$20,000+ annually',
      detail: 'Logo + photos + website + farmers market presence + social media + content creation. Investment increases with scale + ambitions.',
      planning: 'Budget appropriately. Marketing pays for itself in D2C revenue.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SUSTAINABILITY CERTIFICATIONS DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var CERTIFICATIONS = [
    { cert: 'Best Aquaculture Practices (BAP)',
      issuer: 'Global Seafood Alliance',
      scope: 'Production + processing + feed mill + hatchery operations.',
      requirements: 'Environmental responsibility + social welfare + food safety + animal welfare. 4 levels of certification.',
      cost: 'Multi-thousand-dollar audit + annual maintenance fee.',
      benefit: 'Retail premium + market access. Required by some retailers.' },
    { cert: 'Aquaculture Stewardship Council (ASC)',
      issuer: 'World Wildlife Fund + IDH',
      scope: 'Site + production + feed.',
      requirements: 'Strict environmental + social + animal welfare standards. Multi-species standards.',
      cost: 'Multi-thousand-dollar audit + annual maintenance.',
      benefit: 'Strong retail premium + market access. Stricter than BAP for environmental.' },
    { cert: 'Monterey Bay Aquarium Seafood Watch',
      issuer: 'Monterey Bay Aquarium',
      scope: 'Buying guides for consumers + chefs. Not a certification per se but a rating.',
      requirements: 'Sustainability assessment based on multiple criteria.',
      cost: 'No cost to producer; ratings are independent.',
      benefit: '"Best Choice" rating = strong market advantage. Maine bivalves consistently rated Best Choice.' },
    { cert: 'Marine Stewardship Council (MSC)',
      issuer: 'MSC',
      scope: 'Wild capture fisheries primarily; some aquaculture.',
      requirements: 'Sustainability + chain of custody.',
      cost: 'Multi-million-dollar full fishery certification.',
      benefit: 'Top sustainability label for retail.' },
    { cert: 'US Department of Agriculture Organic',
      issuer: 'USDA',
      scope: 'Organic certification framework.',
      requirements: 'Strict feed + organic husbandry standards.',
      cost: 'Annual audit + certification fee.',
      benefit: 'Organic premium. Limited for shellfish (most rules don\'t fit).' },
    { cert: 'NSSP Compliance (not technically certification)',
      issuer: 'FDA + state regulators',
      scope: 'Food safety for shellfish.',
      requirements: 'Strict adherence to NSSP rules.',
      cost: 'Cost of doing business; routine audits.',
      benefit: 'Legal requirement for commercial shellfish operation.' },
    { cert: 'Maine Made / Maine Grown branding',
      issuer: 'Maine state + industry association',
      scope: 'Place-of-origin branding.',
      requirements: 'Maine-grown product.',
      cost: 'Minimal.',
      benefit: 'Maine reputation halo. Useful for direct sales.' },
    { cert: 'Fair Trade certification',
      issuer: 'Fair Trade USA + multiple bodies',
      scope: 'Fair pay + worker welfare.',
      requirements: 'Wage + working condition standards.',
      cost: 'Variable.',
      benefit: 'Ethical consumer premium.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NOTABLE AQUACULTURE PEOPLE
  // ───────────────────────────────────────────────────────────
  var NOTABLE_PEOPLE = [
    { name: 'Bill Mook (Mook Sea Farms founder)', era: '1985-present',
      role: 'Maine oyster industry pioneer + Mook Sea Farms founder.',
      contribution: 'Built Mook Sea Farms into Maine\'s anchor oyster hatchery. Selective breeding + technical excellence. Industry mentorship.',
      legacy: 'Maine oyster industry largely depends on Mook hatchery seed.' },
    { name: 'Briana Warner (Atlantic Sea Farms CEO)', era: '2016-present',
      role: 'Atlantic Sea Farms leader + kelp industry advocate.',
      contribution: 'Built ASF kelp aggregator model + partner-grower network. Industry storytelling + national + international advocacy.',
      legacy: 'Maine kelp industry is industry-building model.' },
    { name: 'Sebastian Belle (Maine Aquaculture Association ED)', era: '2010s-present',
      role: 'Maine Aquaculture Association executive director.',
      contribution: 'Decade-plus of industry advocacy + training + technical support. Voice of Maine aquaculture in policy debates.',
      legacy: 'MAA continues to grow + serve.' },
    { name: 'Dr. Heather Leslie (Bigelow Lab researcher)', era: '2010s-present',
      role: 'Climate + acidification scientist at Bigelow Lab.',
      contribution: 'Research on ocean acidification + shellfish vulnerability + adaptation strategies.',
      legacy: 'Science foundation for Maine industry climate adaptation.' },
    { name: 'Carl Wilson (Maine DMR lobster scientist)', era: '1980s-present',
      role: 'Maine DMR lobster biologist for decades.',
      contribution: 'Stock assessments + v-notch program science + climate research. Bridge between science + industry.',
      legacy: 'Foundational to Maine lobster management.' },
    { name: 'Dr. Jeff Goldenberg (UMaine CCAR director)', era: '2010s-present',
      role: 'UMaine Center for Cooperative Aquaculture Research director.',
      contribution: 'Research + workforce training + industry partnership. New species trials.',
      legacy: 'CCAR is industry R&D engine.' },
    { name: 'Andy Pershing (GMRI senior scientist + Pershing 2015 author)', era: '2010s-present',
      role: 'Senior scientist + climate-fisheries researcher.',
      contribution: '2015 Science paper on Gulf of Maine cod + warming. Foundation paper for climate-fisheries science.',
      legacy: 'Industry + management now climate-aware.' },
    { name: 'Whole Oceans Founders + Team', era: '2015-present',
      role: 'Building world-class land-based RAS salmon facility in Bucksport.',
      contribution: 'Climate-resilient + biosecure + community-acceptable salmon aquaculture model.',
      legacy: 'Industry transition model.' },
    { name: 'Maine Aquaculture Industry Pioneers (1970s-)',
      era: '1970s-present',
      role: 'First-generation Maine aquaculture entrepreneurs.',
      contribution: 'Built industry from scratch. Took entrepreneurial + technical + advocacy risks.',
      legacy: 'Industry exists because of their commitment.' },
    { name: 'Wabanaki Aquaculture Coordinators (Penobscot + Passamaquoddy)',
      era: '2020s-present',
      role: 'Tribal-led aquaculture initiative coordinators.',
      contribution: 'Building tribal capacity + sovereignty in aquaculture sector.',
      legacy: 'Future of Maine aquaculture increasingly tribal-led.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GLOBAL AQUACULTURE PERSPECTIVES
  // ───────────────────────────────────────────────────────────
  var GLOBAL_PERSPECTIVES = [
    { region: 'China — World\'s Largest Aquaculture Producer',
      production: '~70 million tonnes/yr (60%+ of global). Dominant in carp, tilapia, mussels, oysters, kelp.',
      maine_comparison: 'Maine is tiny by comparison (~10,000 tonnes/yr). Different scale + species mix.',
      lessons: 'China shows scale potential. Maine focuses on premium niche.' },
    { region: 'Norway — Salmon Aquaculture Leader',
      production: '~1.5 million tonnes/yr salmon. Major sea-cage industry.',
      maine_comparison: 'Maine\'s salmon industry shrunk from peak. Land-based RAS (Whole Oceans) potentially competitive.',
      lessons: 'Norway shows benefits + risks of intensive single-species aquaculture.' },
    { region: 'Chile — Major Salmon + Mussel',
      production: '~1.5 million tonnes salmon + mussel.',
      maine_comparison: 'Chile is industrial-scale; Maine is artisanal-scale premium.',
      lessons: 'Different model.' },
    { region: 'Spain (Galicia) — Mussel Aquaculture Leader',
      production: '~250,000 tonnes/yr mussels on raft systems.',
      maine_comparison: 'Maine uses longline (lower exposure waters). Smaller scale.',
      lessons: 'Different gear + scale.' },
    { region: 'France — Oyster Tradition',
      production: '~100,000 tonnes/yr Pacific + flat oysters. Brittany + Bordeaux.',
      maine_comparison: 'Different oyster species; similar premium positioning + storytelling.',
      lessons: 'Premium branding + place-based identity works.' },
    { region: 'South Korea — Major Kelp Producer',
      production: '~1+ million tonnes/yr kelp + nori.',
      maine_comparison: 'Maine kelp industry is small but growing.',
      lessons: 'Kelp can be major commercial commodity.' },
    { region: 'Atlantic Canada — Maritime Provinces',
      production: '~50,000+ tonnes mussels + oysters + salmon.',
      maine_comparison: 'Direct neighbor + similar climate + species mix. Some industry collaboration.',
      lessons: 'Climate + market parallel; cross-border collaboration possible.' },
    { region: 'Australia + New Zealand — Pearl Oyster + Mussel',
      production: 'Specialized oyster + mussel + pearl industries.',
      maine_comparison: 'Different species + waters.',
      lessons: 'Niche specialization.' },
    { region: 'Japan — Sea Scallop + Oyster + Pearl',
      production: 'Major hanging-line scallop industry; oyster + pearl traditions.',
      maine_comparison: 'Maine scallop aquaculture has adopted Hokkaido hanging-line model.',
      lessons: 'Technology + tradition transferable.' },
    { region: 'US Pacific Northwest — Oyster + Geoduck',
      production: 'Major oyster + geoduck industries. Multiple federal + state lease frameworks.',
      maine_comparison: 'Different species + larger leases + different regulatory framework.',
      lessons: 'Lease framework alternatives + scale alternatives.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: TRIBAL-LED AQUACULTURE INITIATIVES
  // ───────────────────────────────────────────────────────────
  var TRIBAL_INITIATIVES = [
    { initiative: 'Passamaquoddy Aquaculture Program',
      content: 'Passamaquoddy Tribe (Pleasant Point + Indian Township) has explored aquaculture in tribal-claim waters since 2010s. Trials with kelp + shellfish. Partnership with UMaine + Bigelow. Sovereignty + economic development + cultural continuity converge.',
      partnerships: 'UMaine + Maine Sea Grant + Bigelow Lab + Maine Aquaculture Association.',
      future: 'Expanding scale + species. Workforce + capacity building.' },
    { initiative: 'Penobscot Nation Sea-Run Fish + Aquaculture Programs',
      content: 'Penobscot Nation manages sea-run fish restoration on Penobscot River (alewife, shad, salmon, sturgeon). Aquaculture initiatives complement restoration. Federal + state + tribal partnership.',
      partnerships: 'Federal NMFS + Maine DMR + Penobscot River Restoration Trust + tribal scientists.',
      future: 'Continued restoration; potential commercial aquaculture in tribal-claim waters.' },
    { initiative: 'Maliseet Tribal Aquaculture',
      content: 'Houlton Band of Maliseet exploring aquaculture options. Smaller scale than Passamaquoddy + Penobscot but emerging.',
      partnerships: 'UMaine + Maine Aquaculture Association + tribal community.',
      future: 'Capacity building.' },
    { initiative: 'Wabanaki REACH Educational Programming',
      content: 'Tribal-led education program teaching Wabanaki history + culture in Maine schools. Includes content on aquaculture + traditional shellfish stewardship.',
      partnerships: 'Maine DOE + tribal nations + schools + Wabanaki REACH.',
      future: 'Continuing LD 291 implementation.' },
    { initiative: 'Damariscotta Mills Alewife Restoration',
      content: 'Annual Penobscot Nation + community + state celebration of alewife run restoration. Combines fishway maintenance + cultural recognition + tourism.',
      partnerships: 'Penobscot Nation + Maine DMR + Maine Rivers + community.',
      future: 'Annual event; growing visibility.' },
    { initiative: 'Penobscot River Restoration (2004-2016)',
      content: 'Multi-tribal-led river restoration. Two dams removed + one bypassed. 1,000+ river miles reopened for sea-run fish.',
      partnerships: 'Penobscot Nation + Penobscot River Restoration Trust + multiple federal + state + NGO partners.',
      future: 'Model for other Maine rivers.' },
    { initiative: 'Tribal Co-Management of Sea-Run Fish',
      content: 'Penobscot Nation + Maine DMR co-manage sea-run fish on Penobscot River. Joint scientific assessment; joint enforcement; tribal-led restoration.',
      partnerships: 'Penobscot Nation + Maine DMR + NMFS.',
      future: 'Model for other tribal nations + Maine rivers.' },
    { initiative: 'Tribal Engagement in DMR Aquaculture Process',
      content: 'Maine DMR aquaculture leases in tribal-claim waters require tribal engagement. Process being formalized over time. Some applicants engage tribes early + others belatedly.',
      partnerships: 'Maine DMR + tribal authorities + applicants.',
      future: 'Continued formalization + best practices.' },
    { initiative: 'Wabanaki-Led Climate Adaptation',
      content: 'Tribal nations integrating traditional ecological knowledge with modern climate science. Penobscot + Passamaquoddy active in climate adaptation work.',
      partnerships: 'Tribal nations + Bigelow + UMaine + federal partners.',
      future: 'Tribal knowledge increasingly informing management.' },
    { initiative: 'Tribal Workforce Development',
      content: 'Tribal-led training programs preparing tribal members for aquaculture + fisheries careers. Internships + apprenticeships within tribal nations.',
      partnerships: 'Tribal nations + UMaine + Maine Aquaculture Association.',
      future: 'Workforce pipeline.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE AQUACULTURE INDUSTRY ASSOCIATIONS + GROUPS
  // ───────────────────────────────────────────────────────────
  var INDUSTRY_GROUPS = [
    { group: 'Maine Aquaculture Association (MAA)',
      role: 'Industry trade group; ~200+ member operations.',
      function: 'Advocacy at state + federal level. Training programs. Technical consultation. Lease application help. Annual conference.',
      contact: 'maineaquaculture.org. Headquartered in Augusta.',
      relevance: 'New entrants should join + engage.' },
    { group: 'Maine Aquaculture Hub',
      role: 'Multi-organization industry collaborative.',
      function: 'Information sharing; conferences; research priorities.',
      contact: 'maineaquaculture.org.',
      relevance: 'Multi-stakeholder coordination.' },
    { group: 'Maine Sea Grant Aquaculture Extension',
      role: 'University extension service. UMaine + NOAA partnership.',
      function: 'Free extension services; training; technical advisory; research.',
      contact: 'seagrant.umaine.edu.',
      relevance: 'Aspiring + active operators benefit from extension services.' },
    { group: 'Maine Coast Heritage Trust Working Waterfront',
      role: 'Conservation NGO with working-waterfront focus.',
      function: 'Conservation easements; advocacy; community engagement.',
      contact: 'mcht.org.',
      relevance: 'Industry depends on preserved working waterfront.' },
    { group: 'Island Institute',
      role: 'Maine coastal community advocacy NGO.',
      function: 'Climate + fisheries + working-waterfront support.',
      contact: 'islandinstitute.org. Rockland-based.',
      relevance: 'Maine coastal community advocacy.' },
    { group: 'Maine Lobstermen\'s Association',
      role: 'Lobster industry trade group.',
      function: 'Advocacy + apprentice program coordination + cooperative.',
      contact: 'mainelobstermens.com.',
      relevance: 'Cross-references with aquaculture; many Maine working operators do both.' },
    { group: 'Maine Coast Fishermen\'s Association',
      role: 'Independent voice for Maine commercial fishermen.',
      function: 'Advocacy + community + working-waterfront.',
      contact: 'mainecoastfishermen.org.',
      relevance: 'Alternative advocacy voice.' },
    { group: 'Maine Department of Marine Resources Aquaculture Division',
      role: 'State agency.',
      function: 'Lease applications + administration + marine patrol + biotoxin monitoring.',
      contact: 'maine.gov/dmr/aquaculture.',
      relevance: 'Direct regulator. Every operator interacts.' },
    { group: 'UMaine Cooperative Extension',
      role: 'University extension service.',
      function: 'Training + community workshops + research.',
      contact: 'extension.umaine.edu.',
      relevance: 'Free + paid programs.' },
    { group: 'Atlantic Sea Farms',
      role: 'Industry leader (kelp aggregator).',
      function: 'Provides seed + training + market to grower-partners.',
      contact: 'atlanticseafarms.com.',
      relevance: 'Industry-building partner; many Maine kelp growers work with them.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE TERMINOLOGY ESSAYS
  // ───────────────────────────────────────────────────────────
  var TERMINOLOGY_ESSAYS = [
    { term: 'Aquaculture', essay: 'The controlled cultivation of aquatic organisms — animals + plants — under managed conditions. Comes from Latin "aqua" (water) + "cultura" (cultivation). Distinct from wild capture fisheries. Global industry produces 120+ million tonnes/year (FAO 2024) — more than wild capture. Maine focuses on bivalve mollusks (oysters, mussels, scallops, clams) + macroalgae (kelp) + some finfish (salmon, etc.).' },
    { term: 'Abutter', essay: 'Adjacent property owner with legal standing at public hearings for aquaculture lease applications. Maine standard leases require public hearings where abutters can object on grounds like view obstruction, navigation, water access, environmental concerns. LPA (Limited Purpose Aquaculture) leases don\'t require public hearings. Engaging abutters BEFORE submission greatly improves chances of approval.' },
    { term: 'Bivalve', essay: 'Mollusks with two hinged shells. Includes oysters, clams, mussels, scallops. All filter-feeders. All sedentary as adults (anchored by byssal threads in mussels, cemented in oysters). All capable of being aquaculture targets. Maine\'s primary aquaculture animal group.' },
    { term: 'Broodstock', essay: 'Adult shellfish (or finfish) used in a hatchery for spawning. Selected for desirable traits: growth rate, disease resistance, shell quality, climate tolerance. Selective breeding over generations improves traits. Mook Sea Farms + other hatcheries maintain genetic lines + pedigrees of broodstock.' },
    { term: 'Byssal Threads', essay: 'Strong protein threads secreted by mussels from a gland in their foot. Used to anchor to substrate. Each thread is a tiny rope-like structure. In aquaculture: mussels anchor to dropper lines via byssal threads. Threads can be released + re-attached, allowing mussels to move incrementally.' },
    { term: 'Cultch', essay: 'Substrate on which oyster spat settles. Traditionally old oyster shell (recycled from harvest). Modern aquaculture uses microcultch (tiny grit particles) for single-cultched oysters that command premium prices. Setting (metamorphosis from larva to spat) requires cultch.' },
    { term: 'Depuration', essay: 'Process of holding shellfish in clean filtered seawater (typically 48+ hours) to allow them to naturally purge accumulated contaminants. Regulated under NSSP. Used after certain closures or for restricted-water harvest. Specific tank designs + flow rates + monitoring required.' },
    { term: 'DMR', essay: 'Maine Department of Marine Resources. State agency with jurisdiction over Maine state-waters fisheries + aquaculture + working waterfront. Lease applications, water classifications, marine patrol enforcement, biotoxin monitoring. Headquartered in Augusta + Boothbay Harbor; regional offices.' },
    { term: 'Floating Cage', essay: 'Oyster + bivalve cultivation method using floating cages at water surface. Cages typically tumbled (rotated) periodically to break apart clumps + reduce biofouling + produce uniform deep-cupped oysters. Premium Maine method.' },
    { term: 'Hatchery', essay: 'Facility producing shellfish + finfish seed (juvenile organisms) for growers. Maine\'s primary oyster hatchery is Mook Sea Farms (Walpole). Workflow: broodstock conditioning, spawning, larval rearing, setting, nursery, sale to growers. Capital-intensive ($500K-$2M+). Major industry chokepoint.' },
    { term: 'HACCP', essay: 'Hazard Analysis Critical Control Points. Federal food safety framework. Required for shellfish processors + many growers. Identifies critical control points where contamination could occur + specifies monitoring + correction procedures. Training programs available through Maine Sea Grant + UMaine.' },
    { term: 'IMTA', essay: 'Integrated Multi-Trophic Aquaculture. Co-locating species so waste of one feeds another. Classic example: salmon (fed) → kelp (extractive) → bivalves (filter). Reduces net waste + adds multiple income streams. Active research at UMaine + Bigelow + commercial partners.' },
    { term: 'Larval Rearing', essay: 'Hatchery stage from fertilized egg (D-stage) to eyed larvae ready to settle. 2-3 weeks. Most demanding stage: daily monitoring, algae feeding, water-quality control. Mass mortality possible from any failure. Larval rearing limits hatchery output more than any other stage.' },
    { term: 'Lease', essay: 'Maine state assignment of aquaculture rights to specific water area. Maine offers three lease types: LPA (Limited Purpose Aquaculture, 1 acre, 3-year, no public hearing); Standard (up to 100 acres, 20-year, requires public hearing); Experimental (up to 4 acres, 3-year, research). Lease is the legal foundation.' },
    { term: 'Longline', essay: 'Aquaculture method using horizontal head rope suspended in water column with droppers hanging from it. Mussel + kelp standard method. Each longline can be 50-200+ feet. Multiple longlines form a farm. Mooring blocks anchor each end + sometimes middle.' },
    { term: 'NSSP', essay: 'National Shellfish Sanitation Program. Federal-state cooperative framework managing safety of harvested shellfish. FDA federal lead + state implementation. Tagging + cold-chain + water classification + closures all governed. Every commercial shellfish operation operates under NSSP.' },
    { term: 'Sock (Mussel)', essay: 'Cylindrical mesh tube (cotton or biodegradable material) loaded with mussel seed + wrapped around dropper line. Mussels anchor with byssal threads within days. Mesh degrades over months as mussels grow. Standard Maine mussel-deployment method.' },
    { term: 'Spat', essay: 'Newly-settled juvenile bivalve. The "seed" that growers buy from hatcheries. Result of larval metamorphosis. Small (1-2 mm initially). Grows in nursery upwellers before deployment to grow-out gear.' },
    { term: 'Standard Lease', essay: 'Maine\'s larger aquaculture lease type. Up to 100 acres. 20-year term. Requires public hearing where abutters + public can testify. More substantial application fees + documentation than LPA. For scaling operations + multi-species farms.' },
    { term: 'Triploid', essay: 'Bivalve with three sets of chromosomes instead of normal two. Triploids don\'t channel energy into spawning. Faster growth + year-round marketability (no summer "milking"). Increasingly standard for premium oyster industry. Maine hatcheries produce triploid stock.' },
    { term: 'Working Waterfront', essay: 'Maine\'s designation for commercial fishing + aquaculture infrastructure: docks, processing, cold storage, ice plants, boat ramps. Increasingly threatened by coastal gentrification. Maine\'s Working Waterfront Access Protection Program uses conservation easements + zoning to preserve.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE GEAR MASTER LIST
  // ───────────────────────────────────────────────────────────
  var GEAR_MASTER = [
    { category: 'Hatchery Equipment',
      items: [
        'Conditioning tanks — broodstock 200-2000L',
        'Spawning tanks — large + easy-clean',
        'Larval tanks — 200-3000L glass + fiberglass',
        'Setting tanks — with cultch substrate',
        'Upweller systems — flow-through nursery',
        'Algae culture system — CO₂-bubbled + lit',
        'Water treatment — UV sterilizer + sand filter',
        'Salinity + temperature controls',
        'pH buffering system',
        'Microscopy + lab equipment',
        'Backup power + alarms',
        'YSI water quality probes'
      ] },
    { category: 'Grow-Out — Mussel Longline',
      items: [
        'Header rope — 3/4-1" polypropylene/polyester',
        'Dropper lines — 1/2-3/4"',
        'Subsurface floats',
        'Surface buoys — color-coded per DMR',
        'Mussel socks — cotton/biodegradable mesh',
        'Mooring blocks — multi-ton mushroom anchors',
        'Anchor chain + shackles',
        'Marker tags + ID',
        'Davit / boom for handling',
        'Hydraulic winch (commercial scale)'
      ] },
    { category: 'Grow-Out — Oyster Cage',
      items: [
        'Oyster cages — plastic mesh',
        'Floating cage systems',
        'Bottom cage systems',
        'Tumbling mechanisms (manual or motorized)',
        'Cage marking + identification',
        'Mooring system',
        'Surface markers',
        'Lift hardware',
        'Sock-on-rope systems'
      ] },
    { category: 'Grow-Out — Kelp Longline',
      items: [
        'Seeded line (pre-seeded with gametophytes)',
        'Header rope (suspended)',
        'Subsurface floats',
        'Surface buoys',
        'Anchor system',
        'Marker tags'
      ] },
    { category: 'Water Quality Monitoring',
      items: [
        'YSI Pro30 (handheld DO/salinity/temp)',
        'Probe sensors (replaceable)',
        'Calibration solutions',
        'Datalogger systems',
        'pH meters + buffers',
        'Refractometer (backup salinity)',
        'Chlorophyll-a meter',
        'NERACOOS data access',
        'Field notebooks'
      ] },
    { category: 'Boat + Marine Equipment',
      items: [
        'Open skiff or work boat 16-30 ft',
        'Outboard or inboard engine',
        'Davit / boom for gear handling',
        'GPS chartplotter',
        'VHF radio',
        'Depth sounder',
        'Anchor + rode',
        'PFDs',
        'Fire extinguisher',
        'Visual distress signals',
        'Sound signal (horn)',
        'Navigation lights',
        'Bilge pump',
        'Tools + spare parts'
      ] },
    { category: 'Cold Chain + Processing',
      items: [
        'Insulated transport totes',
        'Ice packs / ice machine',
        'Walk-in cooler (shore-side)',
        'Sanitation supplies',
        'NSSP pre-printed tags',
        'Trace-back recordkeeping software',
        'Refrigerated van (for transport)',
        'Packing supplies (boxes, ice, padding)'
      ] },
    { category: 'Diagnostic + Safety',
      items: [
        'Sample bottles for water quality + tissue',
        'Specimen containers for pathology samples',
        'Cooler for sample transport',
        'First aid kit (marine + commercial-grade)',
        'CPR + first aid certification',
        'EPIRB / PLB',
        'Survival suit (offshore)'
      ] },
    { category: 'Documentation',
      items: [
        'Harvest log book',
        'Time-temperature log',
        'Probe reading log',
        'Mortality log',
        'Financial records system',
        'Annual reporting templates',
        'NSSP compliance records'
      ] },
    { category: 'Marketing + Sales',
      items: [
        'Branded packaging materials',
        'Storytelling materials (photos, brochures)',
        'Customer database / CRM',
        'E-commerce platform',
        'Cold-shipping supplies',
        'Farmers market setup (tent, scale, signage)',
        'Mobile payment system (Square, etc.)'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: VOICES FROM MAINE AQUACULTURE
  // ───────────────────────────────────────────────────────────
  var VOICES = [
    { speaker: 'Damariscotta River Oyster Farmer (5 years operating)',
      quote: 'I started with a 1-acre LPA. Year 1 was zero income — just expense + learning. Year 3 I was making real money. Now I sell at farmers market + 3 Portland restaurants. I tell every potential farmer: start small, learn the water, build relationships before scaling.',
      context: 'First-generation aquaculture success. LPA pathway works.' },
    { speaker: 'Mook Sea Farms Production Manager',
      quote: 'We supply seed to most Maine oyster farms. Hatchery is precision work — daily water-quality checks, larval monitoring, biosecurity. We\'re also breeding for climate resilience. Industry future depends on hatchery innovation.',
      context: 'Industry chokepoint perspective.' },
    { speaker: 'Atlantic Sea Farms Partner-Grower',
      quote: 'I lobster summers + grow kelp winters. Atlantic Sea Farms provides seed, training, market. My income smooths across seasons. Industry partnership reduces my risk.',
      context: 'Cooperative + aggregator model working.' },
    { speaker: 'Passamaquoddy Aquaculture Coordinator',
      quote: 'My nation is exploring tribally-owned aquaculture in our claim waters. We\'re building capacity, training, partnerships with UMaine + Bigelow. Sovereignty + food security + community benefit converge here. Future Maine aquaculture will be more tribally-led.',
      context: 'Tribal sovereignty + industry development.' },
    { speaker: 'Maine DMR Aquaculture Coordinator',
      quote: 'I process 50-100 lease applications a year. Each one is unique. Climate adaptation, tribal sovereignty, working-waterfront preservation all factor in. The future of Maine aquaculture is being shaped case by case.',
      context: 'State-level shaping of industry.' },
    { speaker: 'Whole Oceans Construction Manager',
      quote: 'We\'re building one of the world\'s largest land-based RAS salmon facilities. Bucksport, Maine. Climate-resilient + biosecure + community-acceptable. When operational: revolutionary for Maine salmon industry.',
      context: 'Industry forward-looking model.' },
    { speaker: 'Bigelow Lab Climate Researcher',
      quote: 'Maine\'s aquaculture industry needs climate-adaptive breeding. We\'re identifying genetic markers for heat + acidification tolerance. Multi-generation effort. By 2030: climate-resilient strains commercially available.',
      context: 'Research-industry partnership.' },
    { speaker: 'Maine Aquaculture Association Executive Director',
      quote: 'Our industry is ~$100M annually + growing 10-20% in oyster + kelp segments. Workforce expanding. Climate-resilient food production. Tribal-led initiatives growing. Working-waterfront preservation continuing. Maine aquaculture is well-positioned for next 20 years.',
      context: 'Industry-wide perspective.' },
    { speaker: 'Lubec Salmon Aquaculture Worker',
      quote: 'I\'ve worked at Cooke for 20 years. The industry has shrunk. Right-whale rules + environmental + tribal concerns are real. Whole Oceans land-based model is the future. I\'ve already trained on the new technology.',
      context: 'Industry transition from worker perspective.' },
    { speaker: 'UMaine Aquaculture Extension Agent',
      quote: 'Maine Sea Grant programs help new farmers + existing operations adapt to climate + market changes. We bridge science + practice. Our office gets calls daily from people considering LPA application or expansion. Industry growing because support exists.',
      context: 'Extension service role.' },
    { speaker: 'Maine Coast Heritage Trust Working Waterfront Director',
      quote: 'Working waterfront infrastructure has been disappearing for decades due to coastal gentrification. Maine\'s state-level conservation easement program is preserving it. Aquaculture expansion requires continued waterfront access. Active advocacy required.',
      context: 'Conservation + industry interdependence.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MENTORSHIP GUIDE FOR AQUACULTURE
  // ───────────────────────────────────────────────────────────
  var MENTORSHIP_GUIDE = [
    { topic: 'Why Maine Aquaculture Has Informal Mentorship',
      content: 'Unlike Maine lobster\'s formal apprenticeship, aquaculture has less structured mentorship. But experienced operators routinely host interns + new entrants. The Maine Aquaculture Association + Maine Sea Grant facilitate this. Hatchery-to-farm relationships often serve as informal mentorship.',
      practical: 'Reach out to operators in your target region. Express interest. Be willing to crew during peak season.' },
    { topic: 'Finding an Aquaculture Mentor',
      content: 'Strategies: (1) Attend Maine Aquaculture Association events. (2) Visit operations + introduce yourself. (3) Take UMaine + community college courses. (4) Contact Maine Sea Grant extension. (5) Email + offer to work for free during a season.',
      practical: 'Persistence + respect + reliability open doors. Many operators want to help next generation.' },
    { topic: 'What to Learn from a Mentor',
      content: 'Technical: site selection rationale; water quality monitoring; gear maintenance; harvest workflow; sales channels. Cultural: relationships with abutters + buyers + co-op members; navigation of regulatory process; balance of work + family + community. Climate: how your mentor is adapting their farm; trends + challenges.',
      practical: 'Take notes. Ask questions. Observe. Try things yourself.' },
    { topic: 'From Mentee to Independent Operator',
      content: 'After 1-3 years apprenticing/crewing, consider: own LPA application; or continue as employee; or scale to standard lease eventually. Each path has its rewards + risks. Many keep working for mentor while building own operation.',
      practical: 'Plan financial transition carefully. Maine Sea Grant + MAA can help.' },
    { topic: 'Becoming a Mentor',
      content: 'Experienced operators have responsibility + opportunity to mentor. Mentorship strengthens industry + community. Mentor commitment: 1-3 hours/week minimum during active season. Reward: pride + community + workforce development.',
      practical: 'Start with one apprentice. Document hours. Communicate expectations clearly.' },
    { topic: 'Tribal Mentorship + Sovereignty',
      content: 'Wabanaki nations have multi-generational fishing + harvesting traditions. Tribal-led aquaculture initiatives include training + mentorship for tribal members. Non-tribal operators can support tribal-led training through Maine Aquaculture Association partnerships.',
      practical: 'Engage respectfully. Listen to tribal voices. Support sovereignty-affirming initiatives.' },
    { topic: 'Female + Diverse Mentees',
      content: 'Maine aquaculture has historically been male-dominated + concentrated in coastal white families. Recent years: more women + diverse + tribal entrants. Mentorship + community support help break barriers.',
      practical: 'If you\'re from non-traditional background: persistence + finding good mentors are key.' },
    { topic: 'Workforce Development + Community Impact',
      content: 'Mentorship is foundational to industry + community sustainability. Maine\'s rural coastal communities depend on continued industry vitality. Mentees = future industry leaders + community anchors.',
      practical: 'Approach mentorship as community investment + your career investment.' },
    { topic: 'Mentorship Best Practices',
      content: 'For mentees: respect mentor\'s time + decisions; document your hours; ask thoughtful questions; reciprocate with labor + helpfulness. For mentors: communicate clearly; provide constructive feedback; protect mentee from unsafe situations; celebrate mentee growth.',
      practical: 'Healthy mentorship benefits both parties + the industry.' },
    { topic: 'Beyond One-on-One Mentorship',
      content: 'Group mentorship: Maine Aquaculture Association training programs; UMaine internships; community college + 4-year college programs. Peer learning: industry conferences + farmer field schools. Tribal-led training programs.',
      practical: 'Combine 1-on-1 mentorship with group programs for fullest development.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE FUTURE OUTLOOK + RESEARCH FRONTIERS
  // ───────────────────────────────────────────────────────────
  var FUTURE_OUTLOOK = [
    { topic: 'Land-Based RAS (Recirculating Aquaculture Systems)',
      content: 'Closed-loop land-based aquaculture is the fastest-growing segment of global aquaculture. Maine\'s Whole Oceans (Bucksport) is among the largest planned. Benefits: biosecurity, climate-resilient, controlled production, no sea-cage environmental controversies, year-round production. Challenges: high capital ($300M+), high energy use, complex engineering, market acceptance. Industry transitioning rapidly. Maine may host 3+ major facilities by 2030.',
      maine_implications: 'Maine\'s industry pivot from sea cages to land-based. Could revive salmon production with reduced environmental footprint.' },
    { topic: 'IMTA (Integrated Multi-Trophic Aquaculture)',
      content: 'Co-locating species so waste of one feeds another. Salmon (fed) → kelp + bivalves (extractive). Multiple research trials in Maine (UMaine + Bigelow + commercial partners). Benefits: reduced net waste, multiple income streams from one site, climate-positive food system. Challenges: complex management, regulatory frameworks not always aligned, market acceptance.',
      maine_implications: 'Future of integrated multi-species Maine farms. Active research moving toward commercial deployment.' },
    { topic: 'Climate-Adapted Selective Breeding',
      content: 'Researchers breeding shellfish for heat tolerance + acidification resistance + faster growth. UMaine + Bigelow + Mook Sea Farms active. Multi-generation effort. Some genetic markers identified. Goal: deliver "climate-resilient" stock to growers.',
      maine_implications: '5-15 year horizon for major commercial impact. Will reshape industry as warming continues.' },
    { topic: 'Triploid Oyster Standard',
      content: 'Triploid oysters (3 sets of chromosomes; don\'t spawn) becoming increasingly standard in premium oyster industry. Faster growth, year-round marketability, no summer "milking." Some controversy over triploid genetics.',
      maine_implications: 'Maine premium oyster market increasingly triploid-based. Allows year-round Maine oyster sales.' },
    { topic: 'Tribal-Led Aquaculture',
      content: 'Wabanaki nations (Passamaquoddy, Penobscot, Maliseet) exploring tribally-owned aquaculture operations. Sovereignty + economic + cultural benefit to communities. Trial operations beginning.',
      maine_implications: 'Future of Maine aquaculture is more tribally-led. Sovereignty + cultural continuity drive industry evolution.' },
    { topic: 'Blue Carbon + Carbon Credits',
      content: 'Aquaculture (especially kelp + bivalves) emerging as potential carbon-credit-generating activity. Methodologies still developing. Voluntary markets paying $5-$100/ton CO₂e; compliance markets higher. Maine could lead due to scale + research.',
      maine_implications: 'New revenue stream possible if methodology matures. Climate-positive aquaculture story strengthens market position.' },
    { topic: 'Ocean Acidification Research + Adaptation',
      content: 'Bigelow Lab + UMaine + NOAA researching shellfish vulnerability to acidification. Hatchery water-quality buffering protocols developing. Selective breeding for tolerance. Climate-resilient strains emerging.',
      maine_implications: 'Maine\'s hatcheries are leaders in acidification-adaptation. Industry-protective investment.' },
    { topic: 'Right Whale Compliance + Ropeless Gear',
      content: 'Industry transitioning to ropeless aquaculture + lobster gear. Acoustic-release buoys. On-call gear systems. Costs $1000s per unit. Industry-wide retrofitting expected over 5-10 years.',
      maine_implications: 'Maine working waterfront economic transition. Innovation opportunity for gear designers.' },
    { topic: 'Working Waterfront Preservation',
      content: 'Maine Working Waterfront Access Protection Program continues. Conservation easements + zoning protections. Industry advocacy ongoing through Maine Aquaculture Association + Maine Coast Heritage Trust + Island Institute.',
      maine_implications: 'Industry sustainability depends on continued waterfront access. Active advocacy required.' },
    { topic: 'New Species Trials',
      content: 'Trial commercial species: Atlantic surfclam, sea urchin, sea cucumber, kelp varieties (skinny kelp, dulse), shellfish (razor clam, oyster strains). UMaine CCAR + commercial partners testing.',
      maine_implications: 'Maine industry diversifying. Climate + market drive species selection.' },
    { topic: 'Climate-Driven Range Shifts',
      content: 'Climate warming brings warm-water species north + may push cold-water species further north over time. Black sea bass + summer flounder now Maine residents. Mussels + Atlantic salmon may eventually struggle in warming southern Maine.',
      maine_implications: 'Industry must adapt species mix over 20-50 year horizon.' },
    { topic: 'Workforce + Training',
      content: 'Industry growth requires workforce growth. Maine community colleges + UMaine expanding aquaculture programs. Maine Aquaculture Association mentoring. Tribal-led training programs.',
      maine_implications: 'Education + training pipeline = sustainability.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE INDUSTRY ECONOMICS DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var ECONOMICS_DEEP = [
    { metric: 'Maine total aquaculture industry value (2024)',
      value: '~$100M+ annually',
      context: 'Mussels + oysters + kelp + salmon + scallops combined.',
      breakdown: 'Salmon ~$30-50M; oysters ~$20-30M; mussels ~$10-15M; kelp ~$2-5M (fastest growth); other ~$5M.',
      growth: '10-20% annual growth in oyster + kelp segments.' },
    { metric: 'Maine LPA lease starting capital',
      value: '$25,000-$50,000 typical',
      context: 'Includes boat + outboard + gear + seed + working capital.',
      breakdown: 'Used skiff $8K-$15K; outboard $4K-$8K; longline gear $4K-$8K; seed $1K-$3K; permits + insurance $500-$2K; working capital reserve $10K+.',
      growth: 'Higher with full new gear.' },
    { metric: 'Mussel grow-out per dropper',
      value: '4-7 kg/m at harvest',
      context: 'After 18-24 months. Yield depends on water quality + management.',
      breakdown: 'Spat density 50-100 mussels/m initially; survival ~30-50% to harvest; final weight 4-7 kg/m of dropper.',
      growth: 'Premium farms achieve top yield consistently.' },
    { metric: 'Oyster grow-out per cage',
      value: '50-150 oysters/cage at harvest',
      context: '24-36 months. Floating cage method.',
      breakdown: 'Seed 100-200 spat per cage; survival 50-75%; market size 3-4 inches.',
      growth: 'Selective breeding + management raise yields.' },
    { metric: 'Wholesale mussel price (Maine)',
      value: '$1.50-$3.50/lb',
      context: 'Varies by season + buyer + size.',
      breakdown: 'High quality + named brand commands top of range. Generic + offload prices lower.',
      growth: 'D2C doubles per-lb price.' },
    { metric: 'Wholesale oyster price (Maine)',
      value: '$0.30-$0.60/oyster',
      context: 'Varies by size + named brand + season.',
      breakdown: 'Premium Maine oysters at top of range. Larger oysters commanded by raw bar trade.',
      growth: 'D2C $1-$5/oyster.' },
    { metric: 'Wholesale kelp price',
      value: '$0.50-$2.00/lb fresh',
      context: 'Fresh kelp; processed products higher.',
      breakdown: 'Atlantic Sea Farms partner-contract baseline. Specialty + value-add products $5-$15/lb.',
      growth: 'Industry growing rapidly; market demand strong.' },
    { metric: 'Maine aquaculture jobs (direct)',
      value: '~1,000+ direct',
      context: 'Farm operations + hatcheries + processing.',
      breakdown: 'Salmon ~300+; oyster + mussel + kelp combined ~700+.',
      growth: 'Industry growth = workforce growth.' },
    { metric: 'Wholesale-vs-D2C revenue multiplier',
      value: '2-5×',
      context: 'D2C generally 2-5× wholesale per unit.',
      breakdown: 'Mussels: $1.50 wholesale → $4-$8 D2C. Oysters: $0.50 wholesale → $2-$5 D2C.',
      growth: 'Story + relationship + freshness justify premium.' },
    { metric: 'Lease application cost',
      value: '$50-$2000+ depending on tier',
      context: 'LPA = $50. Standard = $500-$2000+ with hearing.',
      breakdown: 'LPA streamlined; Standard requires legal + environmental + survey costs.',
      growth: 'Industry advocacy may streamline standard process.' },
    { metric: 'Hatchery seed cost',
      value: '$0.05-$1.00 per spat depending on species + size',
      context: 'Mussel seed cheapest; oyster spat $0.05-$0.20; specialty species higher.',
      breakdown: 'Volume discounts available. Direct hatchery purchase cheaper than re-sellers.',
      growth: 'Limited capacity; pre-order critical.' },
    { metric: 'Insurance cost per acre',
      value: '$500-$3000+ annual',
      context: 'Property + crop + liability coverage.',
      breakdown: 'Higher for finfish (salmon) than shellfish. Storm-related claims drive rates up over time.',
      growth: 'Increasing with climate volatility.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE SAFETY MANUAL
  // ───────────────────────────────────────────────────────────
  var SAFETY_MANUAL = [
    { topic: 'PFDs (Personal Flotation Devices)',
      detail: 'Required on every boat for every person. USCG-approved. Wear yours — most boating drowning deaths involve PFD aboard but not worn. Maine cold water is unforgiving of mistakes.',
      training: 'Inspect annually for damage. Replace 10-year-old PFDs.',
      best_practice: 'WEAR your PFD while on the water — Maine water + cold = no margin for error.' },
    { topic: 'Cold-Water Survival',
      detail: 'Maine waters 50-65°F most of year. 1-minute cold shock; 10-minute useful muscle function; 1-hour to hypothermia in 50°F water. HELP (solo) or huddle (multiple) positions.',
      training: 'Take a cold-water survival course.',
      best_practice: 'PFD on; minimize movement; signal + wait for rescue.' },
    { topic: 'VHF Marine Radio',
      detail: 'Channel 16 international distress + hailing. Required monitoring while underway. MAYDAY (life-threatening), PAN-PAN (urgent), SÉCURITÉ (safety).',
      training: 'Practice radio checks on Ch 9. Memorize MAYDAY format.',
      best_practice: 'Maintain VHF monitoring; keep transmissions brief.' },
    { topic: 'EPIRB / PLB',
      detail: '406 MHz satellite distress beacons. EPIRB registered to vessel; PLB to person worn on PFD.',
      training: 'Test self-diagnostic monthly. Replace battery per manufacturer.',
      best_practice: 'Have one + know how to activate.' },
    { topic: 'Float Plan',
      detail: 'File with someone ashore before each trip: vessel, crew, route, expected return, contact info.',
      training: 'Develop a float plan template + use consistently.',
      best_practice: 'Saves lives. Use every trip.' },
    { topic: 'Fire Onboard',
      detail: 'PASS technique: Pull, Aim, Squeeze, Sweep. B-I or B-II rated extinguishers required.',
      training: 'Practice with empty extinguisher.',
      best_practice: 'Multiple extinguishers + crew briefing on locations.' },
    { topic: 'Man Overboard',
      detail: 'Shout MOB + identify side. Throw flotation. Maintain visual. Circle back from downwind.',
      training: 'Quarterly practice with buoy.',
      best_practice: 'Practice before need.' },
    { topic: 'Cold-Water Work (Aquaculture Specific)',
      detail: 'Dry suits or chest waders required for in-water work. Layered clothing. Limit immersion to 30 min in winter.',
      training: 'Cold-water work training; buddy system.',
      best_practice: 'Never solo. Warm-up breaks ashore.' },
    { topic: 'Hatchery Power Failures',
      detail: 'Power outage = catastrophic risk for larvae + spat. Backup generator essential. Alarms for water-quality excursions.',
      training: 'Test backup generator monthly. Develop power-failure protocol.',
      best_practice: 'Pre-positioned alarm + response plan.' },
    { topic: 'Heavy-Weather Operations',
      detail: 'Reduce speed; head into seas. Crew below + PFDs on. Deploy drogue if needed.',
      training: 'Develop heavy-weather protocols.',
      best_practice: 'Avoid going out in deteriorating weather. Plan + monitor.' },
    { topic: 'Lightning',
      detail: 'Stay low; away from metal. Don\'t use radio during active storm. Inspect electronics after.',
      training: 'Storm tracking + return-to-harbor protocols.',
      best_practice: 'Be in harbor when lightning threatens.' },
    { topic: 'NSSP-Compliance Disasters',
      detail: 'Tagging errors + time-temperature violations + cold chain breaks = recalled product, lost income, license risk.',
      training: 'Annual HACCP refresher. Daily NSSP compliance audit.',
      best_practice: 'Build NSSP compliance into all routines.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE PLAYBOOKS
  // ───────────────────────────────────────────────────────────
  var PLAYBOOKS = [
    { situation: 'Day 1 on a New Oyster Farm',
      walkthrough: [
        'Before sunrise: arrive at boat. Check tide + weather. Pre-trip safety inspection.',
        'Cast off + leave dock (idle through marina; pass commercial traffic).',
        'Reach lease site (chartplotter to corner buoy).',
        'Approach + position over cages. Engage davit if equipped.',
        'Pull cage to deck. Tumble (manual or mechanical) to reduce clumping + biofouling.',
        'Inspect for damage: mesh tears, broken hardware. Note for repair.',
        'Inspect oysters: count + sample for size + health. Photograph if concerns.',
        'Replace cage. Move to next cage.',
        'After tumbling cycle: check water-quality probe readings at multiple depths.',
        'Return to dock. Clean boat.',
        'Document day: cages tumbled, observations, water quality.',
        'Plan next visit + maintenance.'
      ],
      learning: 'Aquaculture is intensive but rewarding. Patience + observation are key.' },
    { situation: 'Mussel Harvest Day',
      walkthrough: [
        'Pre-harvest: confirm DMR open status for area. Confirm weather + tide. Confirm buyer ready.',
        'Pre-chill totes + transport. Ice packs ready.',
        'PFD + safety equipment. File float plan.',
        'Reach lease. Position over dropper line.',
        'Pull dropper (manual or hydraulic). Strip mussels with sharp tool or hands.',
        'Grade on deck: separate keepers (1.5"+) from small. Pack keepers in chilled totes.',
        'Discard byssal threads + cleaning debris (back to water; biodegradable).',
        'Maintain cold-chain: keep harvested mussels chilled.',
        'Repeat for additional droppers as planned.',
        'Return to dock before tide turns.',
        'Transfer to shore-side walk-in cooler.',
        'Pack for shipment: apply NSSP tags; label boxes.',
        'Transport to buyer (refrigerated van or insulated boxes with cold packs).',
        'Log harvest: volume, location, time, temperature.',
        'Update buyers + farmers market customers.'
      ],
      learning: 'Harvest is labor + time + cold-chain critical. NSSP compliance is law + culture.' },
    { situation: 'Hatchery Workflow (Daily)',
      walkthrough: [
        'Open hatchery at first light. Inspect all systems: pumps, filters, UV, alarms.',
        'Check water quality at multiple tanks: T, S, DO, pH, NH₃.',
        'Inspect broodstock conditioning tanks: gonad development; ripening trajectory.',
        'Larval rearing tanks: sample for size + survival via microscope. Feed algae.',
        'Setting tanks: check spat settlement; adjust cultch as needed.',
        'Nursery upweller: monitor flow + temperature. Sample for size + survival.',
        'Outdoor tanks (if applicable): inspect for biofouling + storm damage.',
        'Algae culture rooms: harvest from peak; restart culture cycles.',
        'Outgoing seed: pack + ship to growers per pre-orders.',
        'Inspect biosecurity: UV systems, quarantine + clean-water lines.',
        'Document everything in hatchery log.',
        'Plan tomorrow: feeding schedules, sampling, spawn induction if applicable.'
      ],
      learning: 'Hatchery operation is precision work. Daily routine is foundation of seed quality.' },
    { situation: 'NSSP Closure Day (Sudden)',
      walkthrough: [
        'Receive alert: email + SMS from Maine DMR Bureau of Public Health.',
        'Stop ALL harvest from affected area immediately.',
        'Communicate with buyers: notify of supply delay; offer alternative supplier referral if possible.',
        'Move at-risk product to wet storage if applicable.',
        'Plan: hold + wait for reopen, or move to depuration if eligible.',
        'Document financial impact for insurance + tax.',
        'Monitor DMR alerts daily for reopening.',
        'After reopening: resume harvest with full NSSP compliance.',
        'Communicate with buyers: confirm supply resumed.',
        'Reflect on response + improve protocol for next time.'
      ],
      learning: 'Closures are routine + sudden. Pre-positioned customer relationships make survival possible.' },
    { situation: 'Public Hearing Day',
      walkthrough: [
        'Arrive early. Set up presentation materials.',
        'Greet attendees: be cordial; introduce yourself.',
        'When called: present application clearly. Site map + business plan + photos + sustainability information.',
        'Listen to all comments: take notes.',
        'Respond to comments respectfully + factually: site analysis + management practices + tribal engagement.',
        'Take any questions for clarification.',
        'Defer to DMR adjudicator on procedural matters.',
        'Don\'t engage personal attacks; stay professional.',
        'After hearing: thank attendees; offer to follow up.',
        'Send thank-you notes to supportive attendees.',
        'Wait for DMR adjudicator decision: weeks to months.',
        'Comply with conditions if approved.'
      ],
      learning: 'Public hearings are democratic processes. Patience + preparation + respect drive outcomes.' },
    { situation: 'Climate Adaptation Planning (Annual)',
      walkthrough: [
        'Review past year\'s observations: water temperature trends, mortality events, harvest data.',
        'Review NEFSC + GMRI climate data for your area.',
        'Identify trends: warming? acidification? salinity swings?',
        'Consider species portfolio: mussel-only operations may want to add oysters or kelp.',
        'Consider site portfolio: 1 site only is risky; consider 2-3 sites.',
        'Consider gear changes: ropeless gear for right whale compliance.',
        'Consider genetic stock: discuss with hatchery about climate-adapted strains.',
        'Build 5-year plan: incremental changes.',
        'Communicate plan with bank, insurance, customers.',
        'Implement: incremental + monitored.',
        'Review again next year: adapt based on outcomes.'
      ],
      learning: 'Climate adaptation is multi-year + iterative + collaborative.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE BIBLIOGRAPHY EXTENSION
  // ───────────────────────────────────────────────────────────
  var BIBLIOGRAPHY_EXT = [
    { author: 'Bricker, Suzanne B., et al.', year: 2014,
      title: 'Bivalve aquaculture remediation of nutrient pollution in Long Island Sound',
      publisher: 'Aquaculture Environment Interactions',
      type: 'academic journal',
      relevance: 'Quantifies water-quality benefits of bivalve aquaculture.',
      use: 'Foundational for "ecosystem services" framing of aquaculture.' },
    { author: 'Cooke, Jason B.', year: 'Ongoing', title: 'Cooke Aquaculture publications',
      publisher: 'Cooke Aquaculture',
      type: 'corporate communications',
      relevance: 'Maine\'s largest aquaculture operation; salmon perspective.',
      use: 'Industry insider view.' },
    { author: 'Kennedy, V.S., et al. (Eds.)', year: 1996, title: 'The Eastern Oyster: Crassostrea virginica',
      publisher: 'Maryland Sea Grant',
      type: 'academic textbook',
      relevance: 'Definitive reference on eastern oysters.',
      use: 'Required for serious oyster biology study.' },
    { author: 'Mook Sea Farms', year: 'Ongoing', title: 'Mook Sea Farms publications',
      publisher: 'Mook Sea Farms',
      type: 'industry leader',
      relevance: 'Maine\'s oyster industry anchor.',
      use: 'Industry insider; founding story; technical practices.' },
    { author: 'Atlantic Sea Farms', year: 'Ongoing', title: 'Atlantic Sea Farms publications',
      publisher: 'Atlantic Sea Farms',
      type: 'industry leader',
      relevance: 'Maine kelp industry founder.',
      use: 'Industry transformation case study.' },
    { author: 'Maine Aquaculture Association', year: 'Ongoing', title: 'MAA publications',
      publisher: 'MAA',
      type: 'industry association',
      relevance: 'Trade group advocate + service provider.',
      use: 'maineaquaculture.org' },
    { author: 'Maine Sea Grant', year: 'Ongoing', title: 'Maine Sea Grant publications',
      publisher: 'UMaine + NOAA',
      type: 'university extension',
      relevance: 'Aquaculture extension services.',
      use: 'seagrant.umaine.edu' },
    { author: 'UMaine Center for Cooperative Aquaculture Research (CCAR)', year: 'Ongoing',
      title: 'CCAR research publications', publisher: 'UMaine',
      type: 'university research center',
      relevance: 'R&D engine for Maine aquaculture.',
      use: 'umaine.edu/aquaculture' },
    { author: 'Bigelow Laboratory for Ocean Sciences', year: 'Ongoing',
      title: 'Bigelow Lab research', publisher: 'Bigelow Lab',
      type: 'research institute',
      relevance: 'East Boothbay-based; ocean biogeochemistry + acidification.',
      use: 'bigelow.org' },
    { author: 'GMRI (Gulf of Maine Research Institute)', year: 'Ongoing',
      title: 'GMRI publications', publisher: 'GMRI',
      type: 'research + outreach',
      relevance: 'Maine\'s primary marine science org.',
      use: 'gmri.org' },
    { author: 'Maine DMR Aquaculture Division', year: 'Ongoing',
      title: 'DMR aquaculture publications', publisher: 'Maine DMR',
      type: 'state agency',
      relevance: 'Source-of-truth for Maine state-waters aquaculture rules.',
      use: 'maine.gov/dmr/aquaculture' },
    { author: 'Ekstrom, Julia A., et al.', year: 2015,
      title: 'Vulnerability + adaptation of US shellfisheries to ocean acidification',
      publisher: 'Nature Climate Change 5:207-214',
      type: 'academic journal',
      relevance: 'Defining vulnerability assessment.',
      use: 'Climate-aquaculture intersection.' },
    { author: 'Hilborn, Ray, et al.', year: 2018, title: 'The environmental cost of animal source foods',
      publisher: 'Frontiers in Ecology + the Environment',
      type: 'academic journal',
      relevance: 'Compares aquaculture to terrestrial protein for climate + environment.',
      use: 'Sustainability claims based on this kind of analysis.' },
    { author: 'NOAA Office of Aquaculture', year: 'Ongoing', title: 'NOAA Aquaculture publications',
      publisher: 'NOAA',
      type: 'federal agency',
      relevance: 'Federal aquaculture policy + science.',
      use: 'fisheries.noaa.gov/topic/aquaculture' },
    { author: 'FDA', year: 'Ongoing', title: 'FDA Aquaculture + Shellfish Safety',
      publisher: 'FDA',
      type: 'federal agency',
      relevance: 'Food safety standards.',
      use: 'fda.gov' },
    { author: 'NSSP National Shellfish Sanitation Program', year: 'Ongoing',
      title: 'NSSP Model Ordinance', publisher: 'FDA + NSSP',
      type: 'federal-state cooperation framework',
      relevance: 'Required compliance framework for shellfish industry.',
      use: 'Industry foundational document.' },
    { author: 'Shumway, S.E. (Ed.)', year: 2011, title: 'Shellfish Aquaculture and the Environment',
      publisher: 'Wiley-Blackwell',
      type: 'academic textbook',
      relevance: 'Comprehensive academic reference.',
      use: 'Required reading for serious aquaculture science.' },
    { author: 'Penobscot Nation', year: 'Ongoing', title: 'Penobscot Nation cultural + natural resources',
      publisher: 'Penobscot Nation', type: 'tribal nation',
      relevance: 'Tribal sovereignty + heritage.',
      use: 'penobscotnation.org' },
    { author: 'Passamaquoddy Tribe', year: 'Ongoing', title: 'Passamaquoddy Tribe at Pleasant Point + Indian Township',
      publisher: 'Passamaquoddy Tribe', type: 'tribal nation',
      relevance: 'Tribal sovereignty + heritage.',
      use: 'wabanaki.com' },
    { author: 'Wabanaki REACH', year: 'Ongoing', title: 'Wabanaki REACH curriculum + outreach',
      publisher: 'Wabanaki REACH', type: 'tribal-led education',
      relevance: 'Maine\'s leading tribal education resource.',
      use: 'wabanakireach.org' },
    { author: 'Maine Indian Education', year: 'Ongoing', title: 'Maine Indian Education curriculum (LD 291)',
      publisher: 'Maine DOE', type: 'state curriculum',
      relevance: 'Required Maine K-12 tribal content.',
      use: 'maine.gov/doe' },
    { author: 'Island Institute', year: 'Ongoing', title: 'Working Waterfront program',
      publisher: 'Island Institute', type: 'NGO',
      relevance: 'Maine working-waterfront advocacy + service.',
      use: 'islandinstitute.org' },
    { author: 'NOAA Office of Protected Resources', year: 'Ongoing',
      title: 'Right whale + endangered species publications', publisher: 'NOAA',
      type: 'federal agency',
      relevance: 'Right whale entanglement + closures.',
      use: 'fisheries.noaa.gov/topic/protected-species' },
    { author: 'Maine Aquaculture Innovation Center', year: 'Ongoing',
      title: 'MAIC publications', publisher: 'MAIC',
      type: 'research + industry partnership',
      relevance: 'Maine aquaculture R&D + commercialization.',
      use: 'maineaquaculture.org' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KEY AQUACULTURE REFERENCE NUMBERS
  // ───────────────────────────────────────────────────────────
  var REFERENCE_NUMBERS = [
    { metric: 'Maine aquaculture industry annual value',
      value: '~$100M+',
      context: '2024 figure. Mussels + oysters + kelp + salmon + scallop combined.',
      practical: 'Growing industry. Diverse species portfolio.' },
    { metric: 'Maine LPA leases (Limited Purpose Aquaculture)',
      value: '~1,500+ active',
      context: 'Maine\'s entry-level lease type. 1 acre, 3-year term.',
      practical: 'Most-common path for new operators.' },
    { metric: 'Maine standard aquaculture leases',
      value: '~100+ active',
      context: 'Up to 100 acres, 20-year term.',
      practical: 'For scaling operations + multi-species farms.' },
    { metric: 'Maine LPA acreage limit',
      value: '1 acre',
      context: 'Entry-level scale.',
      practical: 'Manageable for new operators.' },
    { metric: 'Standard lease acreage maximum',
      value: '100 acres',
      context: 'Most leases much smaller.',
      practical: 'Allows substantial operations.' },
    { metric: 'Mussel growing cycle (seed to harvest)',
      value: '18-24 months',
      context: 'Cold-water grow-out.',
      practical: 'Long capital tie-up before revenue.' },
    { metric: 'Oyster growing cycle (seed to market)',
      value: '24-36 months',
      context: 'Cold-water grow-out for premium product.',
      practical: 'Longer than mussels; premium pricing.' },
    { metric: 'Kelp growing season',
      value: 'Nov seed → Apr-May harvest',
      context: 'Single annual cycle.',
      practical: 'Winter-specific; complements other fisheries.' },
    { metric: 'Bivalve filtering rate',
      value: '50-100 L/day per adult',
      context: 'Filter-feeding rate.',
      practical: 'Ecosystem service: water filtration.' },
    { metric: 'Mook Sea Farms founding',
      value: '1985',
      context: 'Maine\'s anchor oyster hatchery + farm.',
      practical: 'Industry pillar. Walpole, ME.' },
    { metric: 'Maine soft-shell clam wild fishery (declining)',
      value: 'Declining',
      context: 'Green crab invasion + warming.',
      practical: 'Aquaculture trials in progress.' },
    { metric: 'Gulf of Maine warming rate',
      value: '~4× global ocean average',
      context: 'Pershing 2015.',
      practical: 'Climate adaptation is permanent feature.' },
    { metric: 'NA right whale population',
      value: '~340 individuals',
      context: 'Critically endangered.',
      practical: 'Industry transitioning to ropeless gear.' },
    { metric: 'NSSP closures: typical % of Maine shellfish waters',
      value: '10-15% at any time',
      context: 'Rain + HAB + sewage triggers.',
      practical: 'Plan around closures; diversify sites.' },
    { metric: 'Maine aquaculture jobs',
      value: '~1,000+ direct + many indirect',
      context: 'Growing employment.',
      practical: 'Career opportunities for next generation.' },
    { metric: 'Maine Aquaculture Association membership',
      value: '~200+ active operations',
      context: 'Industry trade group; founded 1977.',
      practical: 'New entrants should join + engage.' },
    { metric: 'Wholesale mussel price (Maine)',
      value: '$1.50-$3.50/lb',
      context: 'Varies by market + season.',
      practical: 'Direct-to-consumer doubles per-lb value.' },
    { metric: 'Wholesale oyster price (Maine)',
      value: '$0.30-$0.60/oyster',
      context: 'Premium Maine commands top of range.',
      practical: 'D2C $1-$5+/oyster restaurant + farmers market.' },
    { metric: 'Average startup capital (1-acre LPA mussel)',
      value: '$25,000-$50,000',
      context: 'Boat + gear + seed + permits + working capital.',
      practical: '2-3 year payback timeline.' },
    { metric: 'Land-based RAS facility cost (Whole Oceans-scale)',
      value: '$300M+',
      context: 'Massive capital project.',
      practical: 'Climate-resilient + biosecure; potentially industry-transforming.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NOTABLE EVENTS IN MAINE AQUACULTURE HISTORY
  // ───────────────────────────────────────────────────────────
  var NOTABLE_EVENTS = [
    { event: '1970s — Salmon Aquaculture Trials',
      year: '1970s',
      cause: 'Experimental Atlantic salmon aquaculture in Cobscook Bay.',
      response: 'Industry developed; Cooke Aquaculture became major operator.',
      lessons: 'Aquaculture is multi-decade investment + scaling.',
      maine_implications: 'Salmon industry has shrunk + reshaping with land-based RAS emerging.' },
    { event: '1977 — Maine Aquaculture Association Founded',
      year: 1977,
      cause: 'Industry organization need.',
      response: 'Trade association founded.',
      lessons: 'Industry organization is foundational.',
      maine_implications: 'Maine Aquaculture Association is ongoing advocate + service provider.' },
    { event: '1985 — Mook Sea Farms Founded',
      year: 1985,
      cause: 'Oyster hatchery investment.',
      response: 'Bill Mook + family founded operation in Walpole, ME.',
      lessons: 'Hatchery innovation builds industry.',
      maine_implications: 'Mook is Maine\'s oyster anchor.' },
    { event: '2005 — Maine LPA Lease Created',
      year: 2005,
      cause: 'Maine legislature created Limited Purpose Aquaculture as entry tier.',
      response: 'Lower barrier to entry; rapid LPA growth.',
      lessons: 'Policy framework matters for industry development.',
      maine_implications: 'Maine\'s LPA tier is among most accessible aquaculture lease frameworks in US.' },
    { event: '2009 — Atlantic Sea Farms Founded (originally Ocean Approved)',
      year: 2009,
      cause: 'Kelp industry investment.',
      response: 'Atlantic Sea Farms became aggregator + processor; partner with ~20 growers.',
      lessons: 'Aggregator model lowers grower risk.',
      maine_implications: 'Maine kelp industry built on partnership model.' },
    { event: '2016 — Penobscot River Restoration Completion',
      year: 2016,
      cause: 'Multi-tribal-led restoration (2004-2016).',
      response: 'Two dams removed; one bypassed.',
      lessons: 'Multi-stakeholder + multi-tribal partnership can deliver landscape restoration.',
      maine_implications: 'Sea-run fish returning; ecosystem recovery; cross-references aquaculture sustainability.' },
    { event: '2018 — Whole Oceans Bucksport Site Secured',
      year: 2018,
      cause: 'Land-based RAS salmon facility planning.',
      response: 'Bucksport site secured + funded.',
      lessons: 'Climate-resilient + biosecure aquaculture future.',
      maine_implications: 'Industry forward-looking model.' },
    { event: '2020-2024 — Right Whale Crisis Intensifies',
      year: '2020-2024',
      cause: 'NA right whale population continues decline; entanglement risk.',
      response: 'NOAA implements vessel speed zones + ropeless gear requirements.',
      lessons: 'Conservation responses to critically-endangered species create industry transitions.',
      maine_implications: 'Aquaculture + lobster industries reshaping toward compliant gear.' },
    { event: '2024 — Maine Aquaculture Industry Reaches ~$100M',
      year: 2024,
      cause: 'Multi-decade growth.',
      response: 'Industry milestone.',
      lessons: 'Sustained investment + cooperation yields industry growth.',
      maine_implications: 'Maine aquaculture is now major economic + cultural anchor.' },
    { event: 'Ongoing — Tribal Sovereignty Conversations',
      year: 'Ongoing',
      cause: 'Continuing legal + cultural evolution of tribal rights.',
      response: 'Tribal-led aquaculture initiatives emerging.',
      lessons: 'Sovereignty is legal + ethical principle.',
      maine_implications: 'Future of Maine aquaculture is more tribal-led.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CULINARY USES OF MAINE AQUACULTURE PRODUCTS
  // ───────────────────────────────────────────────────────────
  var CULINARY = [
    { product: 'Maine Mussels',
      species: 'Blue mussel',
      preparation: 'Mussels marinière (white wine + shallot + butter), mussel chowder, smoked mussels, paella-style with chorizo + saffron, marinated mussels.',
      pairing: 'Crusty bread, dry white wine (Sauvignon Blanc, Muscadet), garlic butter, parsley.',
      market: 'Wholesale $1.50-$3.50/lb; D2C $3-$8/lb. Restaurant + farmers market premium.',
      best_season: 'Year-round; peak fall harvest. Mid-tide steaming preferred.',
      cultural: 'Iconic European-influenced dish adopted as Maine tradition.' },
    { product: 'Maine Oysters',
      species: 'Eastern oyster',
      preparation: 'On the half shell (raw with mignonette + lemon), Rockefeller (cream + spinach + cheese), Casino (bacon + bell pepper + breadcrumb), oyster stew, fried oysters.',
      pairing: 'Champagne, dry rosé, pilsner beer, Sancerre, Muscadet, mignonette.',
      market: 'Wholesale $0.30-$0.60/oyster; restaurant $2-$5/oyster; oyster bar $3-$8/oyster.',
      best_season: 'Year-round (with triploids); traditional September-April for diploids.',
      cultural: 'Ancient European + Indigenous tradition. Modern Maine premium positioning.' },
    { product: 'Maine Kelp',
      species: 'Sugar kelp (Saccharina latissima) + winged kelp (Alaria esculenta)',
      preparation: 'Sushi nori (winged kelp), fresh kelp salads, blanched + frozen for stir-fry, kelp pasta (Atlantic Sea Farms), kelp salsa, dehydrated for trail snack, kelp burger patties.',
      pairing: 'Asian cuisines (Japanese, Korean), salads, soups, smoothies.',
      market: 'Wholesale $0.50-$2/lb fresh; specialty products $5-$15/lb dried.',
      best_season: 'Spring harvest (April-May).',
      cultural: 'Adapted from Japanese + Korean + Atlantic Canadian (Maritime) traditions. Maine\'s newest food.' },
    { product: 'Maine Scallops',
      species: 'Sea scallop (Placopecten magellanicus) or bay scallop',
      preparation: 'Seared in butter (golden brown crust on outside, just-set inside), ceviche, sashimi-grade raw, with seasonal vegetables.',
      pairing: 'Chardonnay, riesling, sake, light butter sauces, citrus.',
      market: 'Sea scallop $25-$45/lb meats; roe-on premium. Bay scallop $18-$30/lb.',
      best_season: 'Fall harvest most common.',
      cultural: 'Premium ingredient; coveted by chefs.' },
    { product: 'Maine Atlantic Salmon (Aquaculture)',
      species: 'Salmo salar (farmed)',
      preparation: 'Grilled, baked, sushi, smoked, gravlax (cured), poached.',
      pairing: 'Dill, lemon, Pinot Noir, riesling, Champagne.',
      market: 'Wholesale price commodity; restaurant $10-$25/lb.',
      best_season: 'Year-round.',
      cultural: 'Globalized commodity; Maine salmon has place-based authenticity emerging.' },
    { product: 'Maine Soft-Shell Clams (Steamers)',
      species: 'Mya arenaria',
      preparation: 'Steamed with drawn butter (the classic), clam chowder, fried clams, clam cakes.',
      pairing: 'Beer, dry white wine, drawn butter, lemon.',
      market: 'Wholesale $200-$400/bushel; restaurant clam roll $15-$25.',
      best_season: 'Spring through fall.',
      cultural: 'Maine\'s most-iconic shellfish + family casual dish.' },
    { product: 'Maine Hard-Shell Clams (Quahog)',
      species: 'Mercenaria mercenaria',
      preparation: 'Littleneck (raw bar), cherrystone (raw bar), chowder (large size), stuffed clams.',
      pairing: 'Wine + cocktail sauce + horseradish + lemon.',
      market: '$0.30-$0.60 each retail (varies size).',
      best_season: 'Year-round.',
      cultural: 'New England staple.' },
    { product: 'Maine Lobster (Cross-Reference)',
      species: 'American lobster',
      preparation: 'Steamed whole (the classic), lobster roll, lobster bake, lobster bisque, lobster stew, lobster tail.',
      pairing: 'Butter, lemon, crusty bread, Chardonnay, beer.',
      market: 'Wholesale $4-$10+/lb whole live; restaurant retail varies.',
      best_season: 'Year-round; peak summer.',
      cultural: 'Maine\'s signature seafood. Cultural anchor.' },
    { product: 'Maine Alewife (Sea-Run Fish)',
      species: 'Alewife',
      preparation: 'Pickled (Maine tradition), smoked, dried.',
      pairing: 'Rye bread, sour cream, onion, mustard.',
      market: 'Limited commercial market; Wabanaki cultural anchor.',
      best_season: 'Spring run.',
      cultural: 'Indigenous + colonial tradition. Damariscotta Mills festival.' },
    { product: 'Maine Sea Urchin Roe (Uni)',
      species: 'Green sea urchin (Strongylocentrotus droebachiensis)',
      preparation: 'Raw sushi-style on rice, with soy + wasabi.',
      pairing: 'Sake, Champagne, very dry white wine.',
      market: 'Premium $80-$200/lb.',
      best_season: 'Winter peak quality.',
      cultural: 'Japanese influence; Maine roe is among world\'s best.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WORKFORCE PIPELINE FOR AQUACULTURE
  // ───────────────────────────────────────────────────────────
  var WORKFORCE_PIPELINE = [
    { stage: 'High School (Grades 9-12)',
      activities: 'Introduction to aquaculture + marine science + Maine industry. Field trips to working farms + hatcheries. EL Education partnerships with King Middle School. Boat handling.',
      partnerships: 'Maine Sea Grant + Maine Aquaculture Association + commercial farms.',
      outcomes: 'Maine boater education certification; pipeline to community college + apprenticeship.' },
    { stage: 'Community College / 2-Year Certificate',
      activities: 'UMaine + Maine community college aquaculture certificates. Field + hatchery training. NASBLA + HACCP + boat-handling certifications.',
      partnerships: 'UMaine Cooperative Extension + Maine Aquaculture Association + commercial farms hosting interns.',
      outcomes: 'Hatchery tech + farm crew employment; entry to 4-year programs.' },
    { stage: '4-Year College (BS in Marine Biology / Aquaculture / Marine Sciences)',
      activities: 'Comprehensive marine science. Research opportunities. Industry internships at Mook Sea Farms + similar.',
      partnerships: 'Bigelow Lab + GMRI + UMaine + Maine Aquaculture Association.',
      outcomes: 'Entry to research + agency + industry technical roles; graduate-school preparation.' },
    { stage: 'Aquaculture Operator Apprenticeship',
      activities: 'Hands-on training under licensed operator. Site management + water quality monitoring + harvest cycle.',
      partnerships: 'Maine Aquaculture Association + farm hosts + Maine Sea Grant.',
      outcomes: 'Skills + relationships to start LPA operation.' },
    { stage: 'Graduate School (MS/PhD)',
      activities: 'Specialized research: aquaculture genetics, ocean acidification, climate adaptation, disease management.',
      partnerships: 'UMaine Marine Biology + Bigelow Lab + GMRI + NOAA NEFSC + WHOI.',
      outcomes: 'PhD-track research positions; faculty; agency leadership; specialized industry roles.' },
    { stage: 'Industry Career — Farm Operator',
      activities: 'Start LPA (1-acre, 3-year). Scale to standard lease if successful.',
      partnerships: 'Hatcheries (Mook + Muscongus Bay); Maine Aquaculture Association; lenders + insurance.',
      outcomes: 'Multi-decade career as farm operator. Family business potential.' },
    { stage: 'Industry Career — Hatchery Technician',
      activities: 'Specialized work in spawning + larval rearing + nursery management.',
      partnerships: 'Mook Sea Farms + Muscongus Bay + Heritage Shellfish + UMaine CCAR.',
      outcomes: 'Career path; key industry chokepoint.' },
    { stage: 'Industry Career — Marine Extension Agent',
      activities: 'Maine Sea Grant + UMaine field-extension roles. Bridge science + operators.',
      partnerships: 'UMaine + Maine Sea Grant.',
      outcomes: 'Career in extension + advocacy + research-translation.' },
    { stage: 'Industry Career — DMR Aquaculture Coordinator',
      activities: 'State agency role overseeing lease applications + administration.',
      partnerships: 'Maine DMR + Maine Aquaculture Association + tribal nations.',
      outcomes: 'Long-term agency career with state benefits.' },
    { stage: 'Continuing Education + Mentorship',
      activities: 'Annual training: HACCP refresher, climate adaptation, sustainability certifications. Mentor next generation.',
      partnerships: 'Maine Aquaculture Association + UMaine + Maine Sea Grant + industry conferences.',
      outcomes: 'Industry sustainability + community resilience.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EMERGENCY PROCEDURES FOR AQUACULTURE
  // ───────────────────────────────────────────────────────────
  var EMERGENCY_PROCEDURES = [
    { emergency: 'Mass Mortality Event',
      response: [
        '1. Document immediately: location, count, suspected cause, conditions',
        '2. Photograph affected stock with date stamp',
        '3. Sample stock for diagnostic analysis (cool + preserve)',
        '4. Notify Maine DMR Bureau of Public Health immediately',
        '5. Quarantine affected lot from healthy stock',
        '6. Submit sample to Maine DMR diagnostic lab',
        '7. Implement DMR-recommended response (quarantine, treatment, depopulation)',
        '8. Communicate with neighbors if disease may spread',
        '9. File mortality report with DMR',
        '10. Document everything for insurance + lessons learned'
      ],
      training: 'Annual disease-management refresher; pathology consultation.' },
    { emergency: 'NSSP Closure Issued',
      response: [
        '1. Receive alert via DMR subscription',
        '2. Cease harvest from affected area immediately',
        '3. Communicate with buyers about delay',
        '4. Move at-risk product to wet storage if applicable',
        '5. Coordinate depuration if option available',
        '6. Monitor for reopening notification',
        '7. Track financial impact for insurance + tax',
        '8. After reopening: resume harvest with full NSSP compliance'
      ],
      training: 'Subscribe to DMR alerts; develop closure-response checklist.' },
    { emergency: 'Storm Damage to Gear',
      response: [
        '1. Wait for storm to pass + safe conditions',
        '2. Inspect all gear: anchor lines, dropper lines, cages, buoys',
        '3. Photograph damage for insurance documentation',
        '4. Begin recovery: secure displaced gear; replace damaged components',
        '5. File insurance claim with marine insurance carrier',
        '6. Coordinate with Maine Coast Heritage Trust if working-waterfront infrastructure damaged',
        '7. Communicate with buyers about supply impact',
        '8. Plan long-term: increased anchor scope; gear pre-positioning'
      ],
      training: 'Pre-storm checklist; insurance review annually.' },
    { emergency: 'Hatchery Power Outage',
      response: [
        '1. Activate backup generator immediately',
        '2. Monitor water quality continuously (DO especially)',
        '3. Move at-risk larvae to backup tanks if possible',
        '4. Communicate with emergency services if extended outage',
        '5. Document time of outage + impacts',
        '6. After power restoration: assess + document losses',
        '7. Review backup-power capacity + plan improvements'
      ],
      training: 'Test backup generator monthly; UV system + monitoring crucial.' },
    { emergency: 'Vibrio Outbreak (Customer Illness)',
      response: [
        '1. Cease distribution from affected lot immediately',
        '2. Track all distributions of suspected lot',
        '3. Coordinate with FDA + DMR + Maine CDC',
        '4. Initiate recall protocol if necessary',
        '5. Investigate cold-chain + harvest conditions',
        '6. Document for legal + insurance purposes',
        '7. Implement corrective actions + retrain crew',
        '8. Reopen distribution only with DMR clearance'
      ],
      training: 'Annual HACCP refresher; tagging discipline.' },
    { emergency: 'Boat / Boat-Crew Emergency',
      response: [
        '1. Follow standard maritime emergency procedures',
        '2. VHF Ch 16 for MAYDAY or PAN-PAN',
        '3. PFDs on; secure crew',
        '4. Coordinate with USCG response',
        '5. Document for insurance + investigation'
      ],
      training: 'CPR + first aid + cold-water survival training.' },
    { emergency: 'Right Whale Closure Notification',
      response: [
        '1. Receive NOAA right whale alert',
        '2. Verify gear is compliant with seasonal rules',
        '3. Retrieve non-compliant gear immediately',
        '4. Deploy compliant (ropeless or seasonal-pull) gear',
        '5. Adjust harvest schedule around closures',
        '6. Document compliance for regulatory + insurance'
      ],
      training: 'Subscribe to NOAA alerts; ropeless gear training.' },
    { emergency: 'Tribal Dispute over Lease',
      response: [
        '1. Stop operations pending resolution',
        '2. Communicate immediately with tribal authority',
        '3. Document all interactions',
        '4. Coordinate with DMR + legal counsel',
        '5. Pursue good-faith resolution; consider site modification or relocation',
        '6. Document outcome for future reference + industry learning'
      ],
      training: 'Tribal sovereignty awareness; pre-emptive engagement.' },
    { emergency: 'Crew Injury Onboard',
      response: [
        '1. Stabilize crew member; basic first aid',
        '2. If serious: PAN-PAN or MAYDAY on Ch 16 for MEDEVAC',
        '3. Provide position + nature + crew count',
        '4. Coordinate with USCG response',
        '5. Continue care until rescue',
        '6. Document everything for workers comp + insurance'
      ],
      training: 'CPR + first aid certification; emergency communication.' },
    { emergency: 'Theft or Vandalism',
      response: [
        '1. Document damage with photos',
        '2. Report to Maine Marine Patrol immediately',
        '3. Report to state police if substantial',
        '4. Coordinate with insurance carrier',
        '5. Tighten security: gear marking + locks + surveillance',
        '6. Communicate with neighbors + DMR for pattern detection'
      ],
      training: 'Gear marking + secure storage practices.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — REGULATORY FRAMEWORK FOR AQUACULTURE
  // ───────────────────────────────────────────────────────────
  var REG_FRAMEWORK = [
    { law: 'Maine Aquaculture Lease Law (Maine Title 12, Chapter 605, §6072)',
      year: 'Current statute',
      scope: 'Maine state law governing aquaculture lease application + administration. DMR enforces.',
      relevance: 'Foundation of Maine aquaculture industry. Defines LPA + Standard + Experimental lease tiers.',
      keys: 'Lease tier rules; application process; abutter rights; tribal sovereignty considerations.' },
    { law: 'National Shellfish Sanitation Program (NSSP)',
      year: '1925-; periodically updated',
      scope: 'Federal-state cooperative program. FDA-administered with states implementing.',
      relevance: 'Every commercial shellfish harvest in Maine operates under NSSP.',
      keys: 'Water classification; tagging; time-temperature; closures; Vibrio Control Plan.' },
    { law: 'Marine Mammal Protection Act (1972)',
      year: 1972,
      scope: 'Prohibits "take" of marine mammals.',
      relevance: 'Right whale + seal + dolphin protections affect aquaculture gear + vessel speed.',
      keys: 'Vertical-line entanglement rules; right whale 10-knot zones; seal-aquaculture interactions.' },
    { law: 'Endangered Species Act (1973)',
      year: 1973,
      scope: 'Protects federally-listed species.',
      relevance: 'Atlantic salmon + Atlantic sturgeon + right whale all relevant to Maine aquaculture.',
      keys: 'Take prohibitions; consultation requirements; recovery plans.' },
    { law: 'Clean Water Act (1972)',
      year: 1972,
      scope: 'Federal water pollution law.',
      relevance: 'Aquaculture facilities may require NPDES discharge permits. Cleaner Water Act protections.',
      keys: 'NPDES; water quality standards; coastal water protection.' },
    { law: 'Section 10 (Rivers + Harbors Act of 1899)',
      year: 1899,
      scope: 'USACE jurisdiction over structures in navigable waters.',
      relevance: 'Aquaculture leases + gear require Section 10 permit.',
      keys: 'Federal navigation authority over aquaculture installations.' },
    { law: 'COLREGS (1972 international convention)',
      year: 1972,
      scope: 'International rules of the road for vessels.',
      relevance: 'Aquaculture vessels + gear vessels follow COLREGS.',
      keys: '38 rules organized by visibility, lights/sounds, vessel hierarchy.' },
    { law: 'Maine Indian Implementing Act + Maine Indian Claims Settlement Act (1980)',
      year: 1980,
      scope: 'Settled major land claims + defined tribal rights.',
      relevance: 'Tribal sovereignty considerations in Maine aquaculture lease applications.',
      keys: 'Treaty-based rights; tribal authority; continuing legal interpretation.' },
    { law: 'Magnuson-Stevens Fishery Conservation + Management Act (1976)',
      year: 1976,
      scope: 'US federal fisheries law.',
      relevance: 'Less direct on aquaculture but informs broader marine ecosystem context.',
      keys: 'EEZ; regional councils; sustainability requirements.' },
    { law: 'Atlantic States Marine Fisheries Compact (1942)',
      year: 1942,
      scope: 'Multi-state coordination of Atlantic coastal fisheries.',
      relevance: 'Shellfish + right whale + other species coordination.',
      keys: 'ASMFC role; multi-state action.' },
    { law: 'Animal + Plant Health Inspection Service (APHIS)',
      year: 'Ongoing',
      scope: 'USDA agency overseeing animal health + plant pest issues.',
      relevance: 'Aquaculture animal-health issues; some species movement rules.',
      keys: 'Disease surveillance; movement permits.' },
    { law: 'FDA Office of Aquaculture',
      year: 'Ongoing',
      scope: 'Federal lead on aquaculture-related food safety + drug approvals.',
      relevance: 'Shellfish food safety; drug approvals for finfish.',
      keys: 'NSSP federal coordination; drug + chemical approvals.' },
    { law: 'BOEM (Bureau of Ocean Energy Management)',
      year: 'Ongoing',
      scope: 'Federal agency for offshore federal waters.',
      relevance: 'Offshore aquaculture in federal waters (>3 nm) requires BOEM authorization.',
      keys: 'Federal authorization for offshore aquaculture; Aquaculture Opportunity Areas.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — EQUIPMENT MAINTENANCE SCHEDULES
  // ───────────────────────────────────────────────────────────
  var MAINTENANCE_SCHEDULES = [
    { equipment: 'Hatchery Water Treatment',
      daily: 'Check UV bulb status; visual inspection of filtration system; backflush as needed.',
      weekly: 'Replace particulate prefilters; check pump pressure.',
      monthly: 'Service UV lamp + sand filter; sterility check.',
      annually: 'Complete system overhaul; replace bulbs + media.' },
    { equipment: 'Larval Tanks',
      daily: 'Sample for size + survival; observe water quality; algae feed.',
      weekly: 'Partial water change; clean tank walls.',
      monthly: 'Detailed cleaning between batches.',
      annually: 'Sanitization + repair as needed.' },
    { equipment: 'Boat — Outboard',
      daily: 'Visual inspection; check fuel + oil; fresh-water flush after saltwater trip.',
      weekly: 'Clean salt deposits; inspect propeller.',
      monthly: 'Oil change (per hours); inspect spark plugs; check anodes.',
      annually: 'Full service; lower unit gear oil; spark plug replacement.' },
    { equipment: 'Mooring Lines + Hardware',
      daily: 'Visual check from boat.',
      weekly: 'Inspect for chafe + damage.',
      monthly: 'Replace damaged hardware.',
      annually: 'Complete inspection + replacement of degraded components.' },
    { equipment: 'Dropper Lines + Socks',
      daily: 'N/A (in-water).',
      weekly: 'Sample inspection of representative droppers.',
      monthly: 'Detailed inspection of full longline.',
      annually: 'Replace 20-30% of gear as routine; full inventory.' },
    { equipment: 'Oyster Cages',
      daily: 'N/A.',
      weekly: 'Tumbling cycle.',
      monthly: 'Detailed inspection for damage.',
      annually: 'Cage rotation + replacement of damaged units.' },
    { equipment: 'Water Quality Probes',
      daily: 'Visual check; battery level.',
      weekly: 'Sensor membrane inspection.',
      monthly: 'Calibrate with standard solutions.',
      annually: 'Sensor membrane replacement; full sensor service.' },
    { equipment: 'Walk-in Cooler',
      daily: 'Verify temperature; check log.',
      weekly: 'Inspect seals + door alignment.',
      monthly: 'Clean condensate drain; inspect refrigerant level.',
      annually: 'Compressor service; full inspection.' },
    { equipment: 'Generator + Backup Power',
      daily: 'Visual inspection.',
      weekly: 'Test run (5 min); check fuel level.',
      monthly: 'Full test (1 hr); change oil + filter if hours-based.',
      annually: 'Comprehensive service; battery replacement if needed.' },
    { equipment: 'Boat Bilge Pump',
      daily: 'Visual inspection.',
      weekly: 'Test float switch + actual pumping.',
      monthly: 'Clean debris from impeller.',
      annually: 'Replace pump after 5-year typical lifespan.' },
    { equipment: 'VHF Marine Radio',
      daily: 'Power check.',
      weekly: 'Radio check on Channel 9.',
      monthly: 'Antenna connection inspection.',
      annually: 'Full check by marine electronics shop.' },
    { equipment: 'Safety Equipment (PFDs + flares + fire ext.)',
      daily: 'Verify accessibility + count.',
      monthly: 'Inspect each PFD for damage.',
      annually: 'Replace expired flares; service fire extinguishers; check inflatable PFD CO₂ cylinders.',
      every5yr: 'Replace inflatable PFD components per manufacturer; replace EPIRB battery.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: PUBLIC FAQ
  // ───────────────────────────────────────────────────────────
  var FAQ_PUBLIC = [
    { q: 'What is aquaculture?',
      a: 'Aquaculture is the controlled cultivation of aquatic organisms — animals + plants — under managed conditions. Like farming, but underwater. Maine aquaculture focuses on oysters, mussels, kelp, salmon, scallops, soft-shell clams, and a few experimental species. Different from wild capture fisheries.' },
    { q: 'Is farmed shellfish safe to eat?',
      a: 'Yes. Maine aquaculture is regulated under NSSP (National Shellfish Sanitation Program) — strictly more rigorous than wild capture. Tagging + cold chain + time-temperature controls ensure safety. Buy from reputable sources.' },
    { q: 'How can you tell wild from farmed shellfish?',
      a: 'Wild oysters typically more irregular shape; farmed are uniform from cage rotation. Wild mussels often vary in shell color + size; farmed are more uniform. Hatchery seed has subtle genetic markers (in research). Most consumers can\'t tell from product; reputable producers + retailers identify source on tag or menu.' },
    { q: 'Why are Maine oysters so distinct?',
      a: 'Maine\'s cold-clean water environment + slow growth + selective breeding + place-based terroir create premium product. Different Maine estuaries (Damariscotta, Pemaquid, Bagaduce) have different mineral + salinity profiles. Each farm + estuary has subtle flavor signature.' },
    { q: 'Is salmon aquaculture sustainable?',
      a: 'Sea-cage salmon (Cooke Aquaculture in Maine) has environmental impacts: sea lice, disease, sediment nutrients, escape risk. Land-based RAS (Whole Oceans in Bucksport) is climate-resilient + biosecure alternative. Industry transitioning. Honest framing: trade-offs exist; ongoing improvement needed.' },
    { q: 'How does kelp aquaculture work?',
      a: 'Sugar + winged kelp deployed on longline rope (microscopic seedlings) in fall. Grows through winter (cold-water species). Harvest April-May before warming water triggers degradation. Annual crop. Climate-positive (CO₂ + nutrient capture).' },
    { q: 'Why is Maine aquaculture growing now?',
      a: 'Multiple factors: (1) Wild fishery declines opening market for aquaculture supply. (2) Climate change shifts species suitable for aquaculture in Maine. (3) Working waterfront preservation creates infrastructure. (4) Public + restaurant interest in local + sustainable food. (5) Research investment + cooperative models.' },
    { q: 'What is the difference between LPA and Standard lease?',
      a: 'LPA (Limited Purpose Aquaculture): up to 1 acre, 3-year term, no public hearing required. Entry-level + most common for new operators. Standard: up to 100 acres, 20-year term, public hearing required. For scaling + multi-species operations. Experimental: smaller research-affiliated leases.' },
    { q: 'How do I start an aquaculture farm?',
      a: 'Steps: (1) Research + visit + intern at existing farm. (2) Apply for LPA lease through Maine DMR. (3) Acquire equipment + boat. (4) Source seed from hatchery (Mook + Muscongus Bay + others). (5) Deploy gear + maintain. (6) Connect with Maine Aquaculture Association for training + community. Plan 2-3 years to first significant revenue.' },
    { q: 'Why is the Bagaduce River famous?',
      a: 'Premium mussel aquaculture water — cold, clean, tidally well-flushed, protected. Bagaduce River Mussels operations have built world-class brand on this terroir. Damariscotta River is famous for oysters for similar reasons.' },
    { q: 'How long does it take to grow an oyster?',
      a: '2-3 years from spat (newly-settled) to market-size (3"+). Cold-water grow-out slower than southern waters. Selective breeding + triploid stock reduce time + improve quality.' },
    { q: 'What is NERACOOS?',
      a: 'Northeast Regional Association of Coastal Ocean Observing Systems. Federally-supported regional ocean data network. Maine farmers use daily for real-time temperature + salinity + DO + weather data. neracoos.org' },
    { q: 'What is a shellfish closure?',
      a: 'Maine DMR closes shellfish waters when: (1) Heavy rain runs untreated runoff into estuaries; (2) HAB (harmful algal bloom) triggers biotoxin accumulation; (3) Sewage spills contaminate. Closures protect public health. Subscribe to DMR alerts.' },
    { q: 'Why are right whales important to aquaculture?',
      a: 'Critically endangered (~340 individuals). Vertical mooring + dropper lines on aquaculture gear can entangle whales. New federal rules require ropeless or seasonal-pull gear. Industry transitioning.' },
    { q: 'How does climate change affect Maine aquaculture?',
      a: 'Warming: stress on cold-water species (mussels), opportunity for warm-water species (oysters thrive in slightly warmer water). Acidification: harder for larvae to form shells; hatcheries buffer water. HAB: longer + more frequent closures. Adaptation: species diversification, selective breeding, climate-informed planning.' },
    { q: 'Is aquaculture climate-positive?',
      a: 'Modestly + honestly. Bivalves filter water + capture nitrogen. Kelp absorbs CO₂ + nutrients. Land-based RAS is biosecure but energy-intensive. Bivalve aquaculture per-kg-protein is ~25× lower-carbon than beef. Best framing: "low-carbon + water-improving" rather than dramatic "carbon-negative" claims.' },
    { q: 'How do tribal sovereignty concerns affect aquaculture?',
      a: 'In tribal-claim waters, engage tribal authorities (Penobscot, Passamaquoddy, etc.) early. Some sites may be inappropriate; others may be collaborative opportunities. Tribal-led aquaculture initiatives emerging. Sovereignty is legal + ethical principle, not optional.' },
    { q: 'What is Whole Oceans?',
      a: 'Land-based RAS salmon facility under construction in Bucksport, Maine. Climate-resilient + biosecure alternative to sea cages. Among world\'s largest planned. Industry forward-looking model for sustainable salmon aquaculture.' },
    { q: 'How can I support Maine aquaculture?',
      a: 'Buy Maine oysters + mussels + kelp at restaurants + farmers markets + grocery stores. Visit a Maine aquaculture farm. Tell friends. Support working waterfront preservation. Educate yourself about industry practices. Choose Maine over imports when possible.' },
    { q: 'What\'s the difference between farmed + wild seafood for sustainability?',
      a: 'Both can be sustainable or unsustainable. Maine bivalve + kelp aquaculture rates "Best Choice" on Monterey Bay Seafood Watch. Some wild fisheries (cod, salmon) are stressed; others (haddock, pollock) are sustainable. Choose certified sustainable products from either category.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE TRAINING CHECKLIST
  // ───────────────────────────────────────────────────────────
  var TRAINING_CHECKLIST = [
    { module: 'Module 1: Basic Aquaculture Knowledge',
      skills: [
        'Define aquaculture vs wild capture',
        'Name 5 Maine aquaculture species',
        'Explain bivalve life cycle',
        'Describe basic culture methods (rope, cage, bag, lantern net)',
        'Identify Maine\'s major aquaculture regions',
        'Locate Mook Sea Farms + Atlantic Sea Farms + Whole Oceans on map'
      ],
      duration: '1 month self-study + farm tour',
      certification: 'Pass quiz; visit a Maine farm' },
    { module: 'Module 2: Water Quality + Site Selection',
      skills: [
        'Use a water-quality probe (YSI or equivalent)',
        'Calibrate probe with standard solutions',
        'Interpret T, S, DO, pH, Chl-a readings',
        'Identify optimal ranges for each species',
        'Apply 12-factor site selection framework',
        'Cross-check own readings against NERACOOS regional data'
      ],
      duration: '2 weeks training + field practice',
      certification: 'Submit weekly probe-reading log; passes basic competency test' },
    { module: 'Module 3: Lease Application Process',
      skills: [
        'Identify Maine lease tiers (LPA, Standard, Experimental)',
        'Complete DMR LPA application',
        'Engage abutters effectively',
        'Prepare for public hearing (Standard lease)',
        'Engage tribal authorities where applicable',
        'Maintain annual reports'
      ],
      duration: '1 month preparation; 4-12 months for application processing',
      certification: 'Successfully submit + receive approval for LPA' },
    { module: 'Module 4: Hatchery + Grow-Out Operations',
      skills: [
        'Source seed from reputable hatchery',
        'Deploy seed (sock mussels, set oyster seed, etc.)',
        'Maintain gear (tumbling cages, replacing lines)',
        'Monitor for disease + pests',
        'Manage stocking density',
        'Handle storm prep + recovery'
      ],
      duration: '3-6 months apprenticeship + first season',
      certification: 'Demonstrate competency on existing farm before independent operation' },
    { module: 'Module 5: NSSP Compliance',
      skills: [
        'Maintain harvest log with all required information',
        'Apply pre-printed NSSP tags correctly',
        'Maintain cold-chain time-temperature controls',
        'Subscribe to + respond to DMR closure alerts',
        'Pass HACCP certification training',
        'Develop Vibrio Control Plan'
      ],
      duration: '2 weeks training + HACCP course',
      certification: 'HACCP certificate; pass DMR audit' },
    { module: 'Module 6: Boat Operation + Safety',
      skills: [
        'Operate small boat safely (DMR boater education compliant)',
        'Use VHF radio (Ch 16 monitoring + hailing protocols)',
        'Implement MAYDAY + PAN-PAN procedures',
        'Operate in fog + heavy weather',
        'Manage gear handling safely',
        'Cold-water survival skills'
      ],
      duration: '2 weeks training + supervised practice',
      certification: 'Maine boater education certificate; demonstration of skills' },
    { module: 'Module 7: Disease + Pest Management',
      skills: [
        'Identify common diseases (MSX, Dermo, blister worm, etc.)',
        'Routine visual surveillance of stock',
        'Submit suspicious mortality samples to Maine DMR diagnostic lab',
        'Implement biosecurity protocols',
        'Manage green crab + tunicate fouling',
        'Apply treatments only as DMR recommends'
      ],
      duration: 'Ongoing learning; periodic refresher',
      certification: 'Demonstrated competency over a season' },
    { module: 'Module 8: Business + Marketing',
      skills: [
        'Develop a complete business plan',
        'Maintain financial records + tax preparation',
        'Build wholesale + restaurant + D2C relationships',
        'Develop brand + storytelling',
        'Negotiate prices + contracts',
        'Track break-even + profitability metrics'
      ],
      duration: 'Ongoing; intensive training in first year',
      certification: 'Submit complete business plan + Year 1 financial summary' },
    { module: 'Module 9: Climate + Sustainability',
      skills: [
        'Apply climate vulnerability framework',
        'Calculate carbon + nitrogen capture',
        'Implement diversification strategy',
        'Pursue sustainability certifications (BAP, ASC, Seafood Watch)',
        'Communicate sustainability story honestly',
        'Develop 10-year climate adaptation plan'
      ],
      duration: 'Annual review',
      certification: 'Climate-adaptive plan in writing' },
    { module: 'Module 10: Community + Tribal Engagement',
      skills: [
        'Engage abutters + neighbors proactively',
        'Understand tribal sovereignty principles',
        'Build relationships with Maine Aquaculture Association',
        'Participate in DMR public hearings + comment periods',
        'Mentor next-generation operators',
        'Support working waterfront preservation'
      ],
      duration: 'Ongoing; foundational',
      certification: 'Demonstrated engagement over years' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STUDENT-FACING ACTIVITIES
  // ───────────────────────────────────────────────────────────
  var STUDENT_ACTIVITIES = [
    { activity: 'Activity 1: Mussel Anatomy Sketch',
      content: 'Examine live + dead mussels with hand lens + dissecting tools (where allowed). Sketch: shell, byssal threads, foot, gills, mantle, adductor muscles. Label each structure with function.',
      learning_objectives: ['Understand bivalve anatomy', 'Connect structure to function', 'Practice scientific drawing'],
      materials: ['Live mussels (with permit)', 'Hand lens', 'Dissecting tools', 'Sketching materials'],
      time: '90 min' },
    { activity: 'Activity 2: Build a Mini-Hatchery Aquarium',
      content: 'Classroom aquarium 30+ gallon. Maintain over 8-12 weeks. Stock with oyster seed from local hatchery (with permission). Monitor water quality daily. Document growth weekly. Present findings.',
      learning_objectives: ['Apply hatchery principles', 'Sustained data collection', 'System maintenance + observation'],
      materials: ['Aquarium + filter + heater', 'YSI starter probe', 'Hatchery seed', 'Algae food'],
      time: '8-12 weeks' },
    { activity: 'Activity 3: Water Quality Field Measurements',
      content: 'Visit a local saltwater site. Take probe readings at multiple depths + times. Document patterns over a week. Compare to NERACOOS buoy data nearby. Analyze for tidal influence.',
      learning_objectives: ['Field measurement skills', 'Tide-water-quality relationships', 'Data analysis'],
      materials: ['YSI or similar probe', 'Field notebook', 'NERACOOS data', 'Tide tables'],
      time: '1 week ongoing' },
    { activity: 'Activity 4: Site Selection Score Sheet',
      content: 'Apply 12-factor site selection framework to a hypothetical Maine lease site. Score each factor + identify strengths + concerns. Prepare 1-page recommendation memo.',
      learning_objectives: ['Apply systematic site analysis', 'Weigh competing factors', 'Communicate recommendation'],
      materials: ['Site selection framework', 'Hypothetical site data', 'Memo template'],
      time: '90 min + write-up' },
    { activity: 'Activity 5: Business Plan Workshop',
      content: 'Draft a complete LPA business plan for a hypothetical 1-acre operation. Include all 10 sections (executive summary, market, operations, marketing, financials, etc.). Peer review + revise.',
      learning_objectives: ['Business planning', 'Financial projection', 'Communication'],
      materials: ['Business plan template', 'Cost data', 'Spreadsheet'],
      time: '2-3 weeks project' },
    { activity: 'Activity 6: Carbon Math Calculations',
      content: 'Calculate carbon + nitrogen capture for hypothetical operations. Compare to other food systems. Build case for "low-carbon" or "climate-positive" claims (honestly).',
      learning_objectives: ['Apply carbon math', 'Sustainability comparisons', 'Honest framing'],
      materials: ['Calculator', 'Reference data sheets', 'Spreadsheet'],
      time: '90 min + write-up' },
    { activity: 'Activity 7: Mock NSSP Closure Scenario',
      content: 'You\'re a Maine oyster farmer. DMR issues PSP closure on Friday. You have 200 lbs of orders for the weekend. Plan + execute response. Document decisions + reasoning.',
      learning_objectives: ['Compliance + decision-making under pressure', 'Customer communication', 'Adaptability'],
      materials: ['Scenario packet', 'NSSP reference materials'],
      time: '90 min role-play + debrief' },
    { activity: 'Activity 8: Public Hearing Role-Play',
      content: 'Class divides into stakeholder roles for hypothetical aquaculture lease hearing. Roles: applicant, abutter, tribal representative, environmental advocate, DMR adjudicator. Hold 90-min hearing.',
      learning_objectives: ['Stakeholder perspective-taking', 'Public communication', 'Tribal sovereignty awareness'],
      materials: ['Background packets per role', 'Hearing rules'],
      time: '2 class periods preparation + 90 min hearing + 1 class debrief' },
    { activity: 'Activity 9: Field Trip to Maine Aquaculture Farm',
      content: 'Visit working farm (Mook Sea Farms, Atlantic Sea Farms partner, or other). Tour operations. Interview operator. Document observations. Write 3-page field report.',
      learning_objectives: ['Place-based learning', 'Industry relationships', 'Connect classroom to workplace'],
      materials: ['Permission slips', 'Field journal', 'Interview questions', 'Camera'],
      time: 'Full day or half-day + class debrief' },
    { activity: 'Activity 10: Tribal Sovereignty Research',
      content: 'Research Wabanaki nations\' relationship with Maine aquaculture (past, present, future). Use Wabanaki REACH + tribal websites + primary sources. Present 5-page paper or video.',
      learning_objectives: ['Maine Indian Education compliance', 'Sovereignty awareness', 'Research skills'],
      materials: ['Wabanaki REACH curriculum', 'Tribal-website resources', 'Research guide'],
      time: '1-2 weeks project' },
    { activity: 'Activity 11: Cooking + Tasting Aquacultured Seafood',
      content: 'Acquire commercial Maine aquaculture products. Cook simple dishes: oyster on the half shell, mussels marinière, kelp salad. Taste + compare to wild-caught + imported. Discuss flavor + sustainability.',
      learning_objectives: ['Sensory analysis', 'Comparative tasting', 'Cooking skills'],
      materials: ['Aquaculture seafood + ingredients', 'Cooking facility', 'Tasting forms'],
      time: 'Half-day + lunch' },
    { activity: 'Activity 12: Climate Adaptation Plan',
      content: 'Design a 10-year climate-adaptation plan for hypothetical operation. Include: species diversification, site selection, gear changes, training, market positioning. Present as illustrated plan.',
      learning_objectives: ['Long-term planning', 'Climate science application', 'Strategic thinking'],
      materials: ['Plan template', 'Climate data', 'Spreadsheet'],
      time: '2-3 weeks project' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMMUNITY ENGAGEMENT MODELS
  // ───────────────────────────────────────────────────────────
  var COMMUNITY_MODELS = [
    { model: 'Atlantic Sea Farms Hub-and-Spoke',
      description: 'Aggregator + many partner growers. Aggregator provides seed + training + market; growers provide labor + lease. Risk-sharing model.',
      example: 'Atlantic Sea Farms (Saco) partners with ~20 kelp growers along Maine coast.',
      strengths: 'Lowers individual risk + entry barrier. Aggregator handles marketing + processing.',
      limitations: 'Growers depend on single buyer. Market dynamics shape contracts.',
      lesson: 'Hub-and-spoke works for emerging industries + complex markets.' },
    { model: 'Oyster Co-op (Mussel + Oyster)',
      description: 'Multi-grower cooperative shares processing facility, marketing, distribution. Members own shares; profits + decisions democratic.',
      example: 'Some Maine oyster + mussel growers organizing toward this model.',
      strengths: 'Shared infrastructure costs; collective bargaining power.',
      limitations: 'Governance complexity; trust + culture required.',
      lesson: 'Co-op model is mature in lobstering + emerging in aquaculture.' },
    { model: 'Tribal-Led Aquaculture',
      description: 'Tribal nations operate aquaculture under tribal sovereignty. Cultural + economic benefit to tribal communities.',
      example: 'Passamaquoddy + Penobscot exploring tribally-owned operations.',
      strengths: 'Sovereignty + cultural continuity + community benefit.',
      limitations: 'Capacity-building takes time. Funding sources vary.',
      lesson: 'Tribal sovereignty is foundational; future of Maine aquaculture likely more tribally-led.' },
    { model: 'Public-Private Research Partnerships',
      description: 'UMaine + Bigelow + commercial growers collaborate on research + breeding. Public funding leverages industry contribution.',
      example: 'UMaine CCAR + Mook Sea Farms genetic research.',
      strengths: 'Knowledge transfer + acceleration; cost-sharing.',
      limitations: 'Funding cycles; IP issues.',
      lesson: 'Public research investment yields industry-wide benefit.' },
    { model: 'Town-Level Shellfish Management',
      description: 'Maine soft-shell clam fishery is town-managed. Clam committees set local rules + issue permits.',
      example: 'Each Maine coastal town has elected/appointed clam committee.',
      strengths: 'Local knowledge + local participation.',
      limitations: 'Inconsistency between towns; expertise varies.',
      lesson: 'Decentralized + community-based management works for specific species.' },
    { model: 'NGO Advocacy + Service',
      description: 'Maine Aquaculture Association, Maine Sea Grant, Island Institute, Maine Coast Heritage Trust — non-profit support.',
      example: 'MAA advocates at state + federal level; offers training + technical support.',
      strengths: 'Long-term planning + multi-stakeholder coordination.',
      limitations: 'Funding-dependent + competing priorities.',
      lesson: 'Strong civil society anchors industry.' },
    { model: 'Industry-Government Partnerships',
      description: 'DMR + industry collaborate on regulations + enforcement + science. Both shape each other.',
      example: 'V-notch became federal law after industry self-enforced first. Maine lease law refined through industry input.',
      strengths: 'Practical regulations reflecting real conditions.',
      limitations: 'Sometimes industry captures regulatory process.',
      lesson: 'Healthy partnerships require ongoing dialogue + accountability.' },
    { model: 'Climate Adaptation Networks',
      description: 'Maine Aquaculture Association climate working group + Bigelow + GMRI + research partners coordinate response.',
      example: 'Selective breeding for climate-resilient strains; shared monitoring; policy advocacy.',
      strengths: 'Collective response to shared problem.',
      limitations: 'Requires sustained funding + commitment.',
      lesson: 'Climate adaptation requires sustained collective action.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE SUCCESS STORIES
  // ───────────────────────────────────────────────────────────
  var SUCCESS_STORIES = [
    { name: 'Maine Oyster Industry Renaissance (1985-)',
      story: 'Maine\'s wild oyster fishery had collapsed by 1800s. Aquaculture began 1985 with Mook Sea Farms (Walpole). Industry built through hatchery innovation + selective breeding + place-based branding.',
      keys: 'Hatchery innovation + selective breeding + cold-water terroir + branding + restaurant relationships.',
      result: 'Maine oysters now nationally-recognized premium product. ~30+ farms; $10M+ annual industry.',
      lessons: 'Industry can rebuild on different model than original. Premium positioning + storytelling matters.' },
    { name: 'Damariscotta Mills Alewife Restoration',
      story: 'Community-led restoration of historic alewife fishway. Renovations 2000s-present. Annual celebration draws thousands.',
      keys: 'Community ownership + state + nonprofit + tribal partnership + cultural anchor.',
      result: 'Alewife run continuing + growing. Cultural revival.',
      lessons: 'Community ownership of restoration is durable. Cultural celebration sustains political will.' },
    { name: 'Mook Sea Farms Hatchery (1985-)',
      story: 'Bill Mook + family founded oyster hatchery + grow-out operation on Damariscotta River 1985. Built genetic lines + sales relationships.',
      keys: 'Long-term investment + technical expertise + family business model.',
      result: 'Maine\'s anchor oyster hatchery. Supplies seed to many Maine + East Coast farms. Industry would be much smaller without it.',
      lessons: 'Hatchery investment pays long-term dividends + builds industry. Family business model works for aquaculture.' },
    { name: 'Atlantic Sea Farms Kelp Industry Building (2009-)',
      story: 'Atlantic Sea Farms founded ~2009. Built relationships with 20+ Maine farmer-partners. Processes + markets kelp products.',
      keys: 'Aggregator-distributor model + partnership with growers + climate-friendly story.',
      result: 'Maine kelp industry expanded from near-zero to ~$2M+ annual + growing.',
      lessons: 'Building new industries requires aggregator + market builder + risk-sharing model.' },
    { name: 'Penobscot River Restoration (2004-2016)',
      story: 'Multi-tribal-led river restoration. Two dams removed; one bypassed. 1,000+ river miles opened.',
      keys: 'Tribal leadership + state + federal + NGO partnership + sustained commitment.',
      result: 'Sea-run fish returning. Ecosystem recovery.',
      lessons: 'River-scale restoration works with multi-stakeholder commitment + tribal leadership.' },
    { name: 'Whole Oceans Land-Based Salmon (2018-)',
      story: 'Land-based RAS salmon facility under construction in Bucksport. Climate-resilient + biosecure alternative to sea cages.',
      keys: 'Capital investment + technology + industry pivot.',
      result: 'When complete: among world\'s largest land-based salmon facilities. Could revive Maine salmon industry in new form.',
      lessons: 'Industry can pivot to address environmental + tribal concerns. Capital + technology + commitment required.' },
    { name: 'Damariscotta Estuary Restoration + Aquaculture',
      story: 'Damariscotta River was historic oyster reef; reefs collapsed 1800s. Aquaculture from 1985 built premium oyster industry on same waters.',
      keys: 'Cold-clean-water ecosystem + technical expertise + branding.',
      result: 'World-class oyster production water + sustainable + premium-priced industry.',
      lessons: 'Aquaculture can restore both industry + ecosystem when properly designed.' },
    { name: 'Maine Aquaculture Association (1977-)',
      story: 'Industry trade association founded 1977. Has provided advocacy + training + technical support through industry growth.',
      keys: 'Long-term industry organization + advocacy + member services.',
      result: '200+ member operations supported. Industry has grown substantially.',
      lessons: 'Strong trade association is foundational to industry development + protection.' },
    { name: 'Maine Sea Grant + UMaine Aquaculture (1980s-)',
      story: 'Public investment in research + extension + training through Maine Sea Grant + UMaine. Center for Cooperative Aquaculture Research (CCAR) opened.',
      keys: 'Public investment + university partnership + applied research.',
      result: 'Industry technical capacity + workforce pipeline + climate research.',
      lessons: 'Public-sector investment is essential infrastructure for emerging industries.' },
    { name: 'Maine Working Waterfront Access Protection Program',
      story: 'State legislation + conservation easements protect commercial fishing + aquaculture infrastructure against coastal gentrification.',
      keys: 'State funding + nonprofit implementation + community engagement.',
      result: 'Multiple Maine working-waterfront sites protected.',
      lessons: 'Preservation programs work but require sustained funding + political support.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EXTENDED GLOSSARY N-Z
  // ───────────────────────────────────────────────────────────
  var EXTENDED_GLOSSARY_NZ = [
    { letter: 'N', entries: [
      'NACELLE — Engine housing.',
      'NATURAL — Existing in nature.',
      'NATURAL SET — Wild spat collection.',
      'NAUTICAL MILE — 6076 feet.',
      'NAVIGATION — Determining course.',
      'NE — Northeast.',
      'NEFMC — New England Fishery Management Council.',
      'NEFSC — NOAA Northeast Fisheries Science Center.',
      'NERACOOS — Northeast regional ocean observing network.',
      'NET — Mesh container or fishing implement.',
      'NEUTRAL — In equilibrium.',
      'NICK — Small cut or dent.',
      'NICKEL — Mineral; not aquaculture.',
      'NIGHT — Time after sunset.',
      'NMFS — National Marine Fisheries Service.',
      'NOAA — National Oceanic + Atmospheric Administration.',
      'NOMINAL — Typical or named.',
      'NON-COMMERCIAL — Not for-profit.',
      'NORM — Standard.',
      'NORTH — Cardinal direction.',
      'NORTH AMERICAN — Of N. America.',
      'NOTIFY — Inform.',
      'NSSP — National Shellfish Sanitation Program.',
      'NURSERY — Hatchery + grower nursery phase.',
      'NUTRIENTS — Chemical elements + compounds in feeding.',
      'NUTRIENT REMOVAL — Bivalves take up nitrogen + phosphorous.'
    ]},
    { letter: 'O', entries: [
      'OAS — Ocean Acidification.',
      'OBSERVATION — Watching + recording.',
      'OBSTRUCTION — Obstacle to navigation.',
      'OCEAN — Saltwater body.',
      'OCEAN ACIDIFICATION — CO₂-driven pH decline.',
      'OCEANOGRAPHY — Study of oceans.',
      'OFF-BOTTOM — Suspended culture.',
      'OFFSHORE — Outside state waters.',
      'OFFSEASON — Out-of-production period.',
      'OFFTAKE — Harvest amount.',
      'OIL — Lubricant.',
      'ONBOARD — On the boat.',
      'ON-DEMAND — As needed.',
      'OPERATION — Aquaculture business.',
      'OPTIMAL — Best.',
      'ORDER — Taxonomic level; also: customer order.',
      'ORGANIC — Of life or carbon-based.',
      'ORGANISM — Living thing.',
      'OSCILLATE — Move back + forth.',
      'OSHV-1 — Pacific oyster herpes virus.',
      'OTC — Over-the-counter (for some treatments).',
      'OUTBREAK — Sudden disease spread.',
      'OUTGOING — Out-bound.',
      'OUTLET — Channel; also: store.',
      'OUTPUT — Production.',
      'OUTRIGGER — Side-extended structure.',
      'OUTSOURCE — Use external supplier.',
      'OVERFISHED — Population below sustainable level.',
      'OVERHEAD — Costs above raw materials.',
      'OVERHEAD COST — Operating expense.',
      'OVERSUBSCRIBED — Demand exceeding capacity (e.g., hatchery).',
      'OVERTAKING — One vessel passing another from behind.',
      'OXYGEN — Element.',
      'OYSTER — Crassostrea virginica (eastern oyster).',
      'OYSTER REEF — Wild oyster habitat.',
      'OZONE — O₃; treatment chemical.'
    ]},
    { letter: 'P', entries: [
      'PACIFIC — Pacific Ocean.',
      'PACIFIC OYSTER — Crassostrea gigas (not Maine).',
      'PACK — Bundle product for shipment.',
      'PACKAGING — Containers for shipping.',
      'PADDLE — Hand-driven propulsion.',
      'PALOMAR — Knot type.',
      'PAN-PAN — Urgency VHF call.',
      'PARASITE — Organism living off another.',
      'PARTNERSHIP — Business or cooperative arrangement.',
      'PASSAMAQUODDY — Maine tribal nation.',
      'PATHOGEN — Disease-causing agent.',
      'PAYBACK — Return on investment.',
      'PCB — Polychlorinated biphenyl.',
      'PCR — Polymerase chain reaction.',
      'PEAK — Highest point.',
      'PEDIGREE — Lineage record.',
      'PEDIVELIGER — Late larval stage.',
      'PELLET — Compressed food.',
      'PENNANT — Mooring buoy line.',
      'PENOBSCOT — Maine tribal nation + river.',
      'PER UNIT — Per single item.',
      'PERMIT — Authorization.',
      'PEST — Unwanted organism.',
      'pH — Acidity scale.',
      'PHASE — Stage.',
      'PHENOTYPE — Observable trait.',
      'PHOTOSYNTHESIS — Energy fixation from sunlight.',
      'PHYTOPLANKTON — Microscopic plant plankton.',
      'PILE — Tall stack.',
      'PILE-UP — Vehicle accident; rare maritime.',
      'PLANKTON — Drifting microorganisms.',
      'PLAN — Strategy.',
      'PLATE — Tectonic plate.',
      'POACHING — Illegal harvest.',
      'POINT — Geographic location.',
      'POLLINATION — Plant fertilization (not applicable).',
      'POND — Small water body.',
      'POOR — Low quality or income.',
      'PORE — Small opening.',
      'PORT — Left side or harbor.',
      'POSITION — Location.',
      'POST-HARVEST — After harvest.',
      'POSTNATAL — After birth.',
      'POTASSIUM — Element.',
      'POURABLE — Suitable for pouring.',
      'POWER — Energy or vessel propulsion.',
      'PRACTICAL — Useful.',
      'PRECEDENT — Past example.',
      'PRECIPITATION — Rain + snow.',
      'PRE-COMMERCIAL — Before market-size.',
      'PRECOOKED — Cooked before sale.',
      'PRECISION — Accuracy.',
      'PREDATION — Being eaten.',
      'PREDATOR — Organism that eats others.',
      'PREDICT — Forecast.',
      'PRE-DRYING — Drying before processing.',
      'PRE-HARVEST — Before harvest.',
      'PRELOAD — Pre-position load.',
      'PREPARATION — Pre-work.',
      'PRE-SHIP — Before shipping.',
      'PRESS — Public press.',
      'PREVENT — Stop in advance.',
      'PRICE — Cost or sale value.',
      'PRINCIPAL — Main person or amount.',
      'PRIORITIZE — Sequence importance.',
      'PRIOR — Before.',
      'PROBE — Water quality measurement device.',
      'PROCEDURE — Step-by-step process.',
      'PROCESS — Sequence of operations.',
      'PROCESSING — Handling product.',
      'PROCESSING FACILITY — Shellfish + fish processing plant.',
      'PRODUCER — Manufacturer.',
      'PRODUCT — Marketable item.',
      'PRODUCTION — Output volume.',
      'PRODUCTIVITY — Output rate.',
      'PROFESSIONAL — Trained specialist.',
      'PROFIT — Revenue minus cost.',
      'PROHIBITED — NSSP closed waters.',
      'PROLOGUE — Introduction.',
      'PROPAGATION — Hatching + breeding.',
      'PROPELLER — Rotating screw.',
      'PROTEIN — Macromolecule.',
      'PROTOZOAN — Single-celled organism.',
      'PROVENANCE — Origin.',
      'PROVISIONS — Food supplies.',
      'PSP — Paralytic Shellfish Poisoning.',
      'PSU — Practical Salinity Unit.',
      'PUBLIC — Available to all.',
      'PUBLIC HEARING — Lease application formal meeting.',
      'PUMP — Mechanical fluid pump.',
      'PUNISH — Penalize.',
      'PURCHASE — Buy.',
      'PURE — Without contamination.',
      'PURIFIER — Cleaning device.',
      'PURPLE — Color.',
      'PURPOSE — Goal.',
      'PURSE SEINE — Encircling fishing net.'
    ]},
    { letter: 'Q', entries: [
      'QUAHOG — Hard-shell clam.',
      'QUALITY — Excellence; consistency.',
      'QUALITY CONTROL — Standards-based inspection.',
      'QUANTIFY — Measure numerically.',
      'QUANTITY — Amount.',
      'QUARANTINE — Isolation to prevent disease.',
      'QUARRY — Stone-cutting site.',
      'QUART — Volume unit (US: 1/4 gallon).',
      'QUARTERLY — Every three months.',
      'QUERY — Question.',
      'QUEUE — Line of waiting items.',
      'QUICK — Fast.',
      'QUIET — Calm.',
      'QUINTAL — Unit of weight (~50 kg historically).',
      'QUOTA — Allowed harvest amount.'
    ]},
    { letter: 'R', entries: [
      'RACE — Strong tidal current.',
      'RACK — Storage rack.',
      'RACK-AND-BAG — Oyster culture method.',
      'RADAR — Radio detection + ranging.',
      'RADIATION — Electromagnetic energy.',
      'RAFT — Floating platform.',
      'RAFT CULTURE — Aquaculture from raft.',
      'RAIL — Boat rail.',
      'RAILROAD — Old transport.',
      'RAIN — Precipitation.',
      'RAINBOW — Color array.',
      'RAMP — Boat launching surface.',
      'RANGE — Geographic extent or spectrum.',
      'RANGE SHIFT — Species migration with climate.',
      'RAS — Recirculating Aquaculture System.',
      'RATE — Speed or charge.',
      'RATIONALIZATION — Industry consolidation.',
      'RECEIVE — Get.',
      'RECEPTION — Welcome.',
      'RECEIVING — Wholesale receiver function.',
      'RECIRCULATING — Recycled flow.',
      'RECOMMEND — Advise.',
      'RECONSIDER — Think again.',
      'RECORDKEEPING — Daily logs.',
      'RECOVERY — Stock rebuilding.',
      'RECRUITMENT — Survivors joining population.',
      'RECREATIONAL — Non-commercial.',
      'RED LIGHT — Port-side vessel light.',
      'REDFISH — Acadian redfish.',
      'REDUCE — Lower.',
      'REDUCED — Lowered.',
      'REDUNDANCY — Backup.',
      'REEF — Underwater ridge or oyster reef.',
      'REFRIGERATION — Cold storage.',
      'REGENERATION — Tissue or species recovery.',
      'REGISTRATION — Official record.',
      'REGULATION — Rule or law.',
      'REHABILITATION — Recovery program.',
      'RELATIVE — Related to something.',
      'RELAY — Move shellfish for natural purging.',
      'RELEASE — Return to water.',
      'RELIABILITY — Consistency.',
      'REMINISCENCE — Past memory.',
      'REMOTE SETTING — Grower-side spat settlement.',
      'REMOVE — Take out.',
      'RENEWABLE — Replenishable.',
      'RENEWAL — Re-issuance.',
      'REPLACE — Substitute.',
      'REPOPULATE — Restock area.',
      'REPRODUCE — Have offspring.',
      'REPRODUCTION — Sexual or asexual.',
      'REQUEST — Ask.',
      'REQUIRE — Need.',
      'REQUIREMENT — Necessary item.',
      'RESEARCH — Systematic investigation.',
      'RESEARCHER — Investigator.',
      'RESERVE — Stockpile.',
      'RESERVOIR — Storage facility.',
      'RESIDENT — Population permanently in area.',
      'RESIDUE — Leftover.',
      'RESILIENCE — Bounce-back capacity.',
      'RESILIENT — Capable of recovery.',
      'RESPECT — Honor.',
      'RESPECTIVE — Belonging to each.',
      'RESPIRATION — Cellular oxygen consumption.',
      'RESPOND — React.',
      'RESPONSE — Reaction.',
      'RESPONSIBILITY — Duty.',
      'RESPONSIBLE — Accountable.',
      'REST — Pause or break.',
      'RESTAURANT — Eating establishment.',
      'RESTORE — Return to former state.',
      'RESTRICTED — NSSP restricted waters.',
      'RESULT — Outcome.',
      'RETENTION — Keeping.',
      'RETIREMENT — End of working period.',
      'RETIRE — End working career.',
      'RETURN — Sea-run fish returning to river.',
      'REVENUE — Income.',
      'REVIEW — Examine.',
      'RIBBED MUSSEL — Salt-marsh mussel.',
      'RIDE — Sea swell pattern.',
      'RIGHT — Direction; correct.',
      'RIGHT WHALE — North Atlantic right whale.',
      'RIGID — Inflexible.',
      'RING — Circular shape.',
      'RIP CURRENT — Narrow strong current.',
      'RISE — Increase.',
      'RISK — Probability of loss.',
      'RIVER — Flowing water body.',
      'ROCK — Stone.',
      'ROCKLAND — Maine port.',
      'ROE — Eggs.',
      'ROLE — Function.',
      'ROOK — Term for novice.',
      'ROOM — Onboard space.',
      'ROOT — Origin.',
      'ROPE — Marine line.',
      'ROPELESS GEAR — Anti-entanglement gear.',
      'ROUND — Cycle.',
      'ROUTINE — Regular activity.',
      'ROUTING — Path planning.',
      'RULE — Regulation.',
      'RUNAWAY — Out of control.',
      'RUNG — Ladder step.',
      'RUSH — Rapid activity.'
    ]},
    { letter: 'T', entries: [
      'TACK — Sailing maneuver.',
      'TAG — NSSP identifier.',
      'TAGGING — Identification process.',
      'TANK — Container.',
      'TASK — Job.',
      'TAXONOMY — Classification.',
      'TEAM — Crew + workforce.',
      'TECHNICIAN — Specialist worker.',
      'TECHNIQUE — Method.',
      'TECHNOLOGY — Applied science.',
      'TEMPERATURE — Heat measurement.',
      'TEMPLATE — Standard format.',
      'TEMPORARY — Short-term.',
      'TENANT — Renter.',
      'TENDER — Small auxiliary boat.',
      'TENSION — Stress in line.',
      'TERM — Lease duration.',
      'TERMINAL — End point.',
      'TERN — Seabird.',
      'TERROIR — Place-based character.',
      'TEST — Examination.',
      'TEXAS RIG — Fishing rig (not aquaculture).',
      'TEXT — Written content.',
      'THAW — Defrost.',
      'THEME — Topic.',
      'THERMAL — Heat-related.',
      'THERMOCLINE — Temperature transition layer.',
      'THICKEN — Make thicker.',
      'THIN — Reduce stocking density.',
      'THIRD-PARTY — External evaluator.',
      'THISTLE — Plant; rare aquaculture.',
      'THOROUGH — Complete.',
      'THREAD — Filament.',
      'THREATEN — Risk.',
      'THREATENED — ESA status.',
      'THREE-STAR — Quality rating.',
      'THROAT — Anatomical part.',
      'THROUGH — Path through.',
      'THROW — Toss.',
      'THUMB — Anatomical part.',
      'TIDAL — Of tides.',
      'TIDAL RANGE — Difference between high + low.',
      'TIDE — Water level cycle.',
      'TIE — Secure with line.',
      'TIGHT — Snug.',
      'TIME — Temporal.',
      'TIME-TEMPERATURE — NSSP control framework.',
      'TIMER — Time measurement.',
      'TINY — Very small.',
      'TIP — Suggestion.',
      'TISSUE — Body tissue.',
      'TITLE — Document.',
      'TODAY — Current day.',
      'TOLERANCE — Acceptance range.',
      'TOLL — Cost.',
      'TONG — Pickup tool.',
      'TONNAGE — Vessel size.',
      'TOOL — Implement.',
      'TOP — Highest point.',
      'TOPMARK — Buoy top symbol.',
      'TORQUE — Rotational force.',
      'TOTE — Plastic transport bin.',
      'TOTAL — Sum.',
      'TOUCH — Contact.',
      'TOW — Pull.',
      'TOXIC — Poisonous.',
      'TOXIN — Poisonous substance.',
      'TRACE-BACK — Following back to source.',
      'TRACK — Path; also: predict.',
      'TRADE — Commercial.',
      'TRADITION — Long-established practice.',
      'TRAFFIC — Vessel + traffic.',
      'TRAIN — Educate.',
      'TRAINING — Education + skills.',
      'TRANSFER — Move.',
      'TRANSFORM — Change.',
      'TRANSITION — Change phase.',
      'TRANSITIONAL — Between phases.',
      'TRANSLATE — Convert.',
      'TRANSMIT — Send signal.',
      'TRANSOM — Flat back of boat.',
      'TRANSPORT — Move from one place to another.',
      'TRAVEL — Movement.',
      'TRAWL — Bottom-dragging fishing net.',
      'TREATMENT — Procedure.',
      'TREE — Plant.',
      'TRELLIS — Support structure.',
      'TREMENDOUS — Large.',
      'TRIANGULAR — Three-sided.',
      'TRIBE — Indigenous nation.',
      'TRIBAL — Of tribe.',
      'TRIBAL-CLAIM — Subject to tribal sovereignty.',
      'TRIBAL ENGAGEMENT — Working with tribal authorities.',
      'TRIM — Adjustment.',
      'TRIO — Three.',
      'TRIP — Voyage.',
      'TRIPLOID — Three chromosome sets (e.g., triploid oyster).',
      'TROL — Trolley.',
      'TROLL — Pull lure behind boat.',
      'TROLLEY — Tow line.',
      'TROPHIC — Of feeding levels.',
      'TROPHIC LEVEL — Food-web position.',
      'TROUT — Salmonid fish.',
      'TROW — Trawl variant.',
      'TRUCK — Vehicle.',
      'TRUE — Genuine.',
      'TRUE NORTH — Geographic north.',
      'TRUMP — Boat slang (specific).',
      'TRUSS — Structural support.',
      'TRY — Attempt.',
      'TUBE — Cylindrical container.',
      'TUMBLER — Oyster cage tumbling system.',
      'TUMBLE — Rotate oyster cages.',
      'TUMBLING — Cage rotation.',
      'TUNA — Bluefin + other tunas.',
      'TUNICATE — Sea squirt.',
      'TURBIDITY — Water cloudiness.',
      'TURBINE — Rotating engine.',
      'TURN — Change direction.',
      'TWO-LIGHT — Pair of lighthouses.',
      'TYRE — Tire (British spelling).'
    ]},
    { letter: 'U-Z', entries: [
      'UPWELLER — Hatchery nursery tank.',
      'UPWELLING — Cold water rising.',
      'URCHIN — Sea urchin.',
      'USCG — US Coast Guard.',
      'USDA — Department of Agriculture.',
      'V-NOTCH — Lifetime lobster protection mark.',
      'VARIABILITY — Range of variation.',
      'VARIETY — Diversity.',
      'VECTOR — Direction + magnitude.',
      'VENT — Opening; trap escape vent.',
      'VENTILATION — Air or water flow.',
      'VESSEL — Boat or ship.',
      'VHF — Marine radio.',
      'VIBRIO — Marine bacterium.',
      'VOLUME — Quantity.',
      'WABANAKI — Maine tribal confederacy.',
      'WAKE — Water disturbance behind boat.',
      'WATER QUALITY — Suitability of water.',
      'WATERFRONT — Coastal land.',
      'WEATHER — Atmospheric conditions.',
      'WHALES — Marine mammals.',
      'WHARF — Coastal landing structure.',
      'WHEEL — Steering wheel.',
      'WHELK — Marine snail.',
      'WHOLE OCEANS — Maine RAS salmon facility.',
      'WHOLESALE — Bulk sale.',
      'WHOI — Woods Hole Oceanographic Institution.',
      'WILD — Not captive.',
      'WIND — Air motion.',
      'WINGED KELP — Alaria esculenta.',
      'WINTER — Cold season.',
      'WORK — Labor.',
      'WORKING WATERFRONT — Commercial fishing + aquaculture infrastructure.',
      'WORKING WATERFRONT COALITION — Maine preservation alliance.',
      'X — Coordinate.',
      'YEAR — Calendar year.',
      'YEAR-CLASS — Cohort.',
      'YIELD — Harvest amount.',
      'YOUTH — Young people.',
      'ZONE — Designated area.',
      'ZONE COUNCIL — Maine lobster zone governance.',
      'ZOOPLANKTON — Animal microplankton.'
    ]},
    { letter: 'S', entries: [
      'SAFETY — Boating + work safety.',
      'SALINE — Salt-containing.',
      'SALINITY — Salt content (PSU).',
      'SALMON — Atlantic salmon.',
      'SALMONIDE — Salmon-like.',
      'SALT — Sodium chloride.',
      'SALT MARSH — Coastal wetland.',
      'SAMPLE — Representative collection.',
      'SAND — Coarse sediment.',
      'SAND LANCE — Sand eel.',
      'SANITATION — Health practice.',
      'SAS — Sass; flippancy.',
      'SAW — Cutting tool.',
      'SAXITOXIN — PSP toxin.',
      'SCALLOP — Pectinidae bivalve.',
      'SCARCITY — Limited supply.',
      'SCARE — Frighten.',
      'SCHED — Schedule.',
      'SCHEDULE — Planned timing.',
      'SCIENCE — Knowledge from study.',
      'SCRATCH — Marking technique.',
      'SCRUTINY — Examination.',
      'SEA — Body of saltwater.',
      'SEA-BASED — Conducted at sea.',
      'SEA CAGE — Marine cage for fish.',
      'SEA RUN — Anadromous fish.',
      'SEABED — Floor of sea.',
      'SEAFOOD — Marine food.',
      'SEAGOING — At sea.',
      'SEAGRASS — Submerged grass.',
      'SEAGRANT — Maine Sea Grant program.',
      'SEAL — Marine mammal.',
      'SEAMANSHIP — Boating skill.',
      'SEARCH — Look for.',
      'SEASON — Calendar period.',
      'SEAWEED — Macroalgae.',
      'SECONDARY — Less important.',
      'SECTION — Part.',
      'SEDIMENT — Bottom material.',
      'SEED — Aquaculture juvenile.',
      'SEED-OUT — Deploy seed.',
      'SEINE — Encircling net.',
      'SELECT — Choose.',
      'SELECTIVE — Choosy.',
      'SELECTIVITY — Gear specificity.',
      'SELF — Individual.',
      'SEMI-DIURNAL — Two highs + two lows daily.',
      'SENSE — Perception.',
      'SENSITIVITY — Response strength.',
      'SENSOR — Measurement instrument.',
      'SEPARATE — Divide.',
      'SERIES — Sequence.',
      'SERVE — Provide service.',
      'SET — (1) Direction of current. (2) Larval settlement.',
      'SETTING — Larval metamorphosis.',
      'SETTLE — Anchor digs in OR larval settles.',
      'SETTLEMENT — Founding of community.',
      'SETTLEMENT (LARVAL) — Larval metamorphosis.',
      'SHADE — Cover from sun.',
      'SHADOW — Shade.',
      'SHAPE — Form.',
      'SHARE — Distribute.',
      'SHARED — Together.',
      'SHEDDER — Soft-shell lobster.',
      'SHEET — Sail control line.',
      'SHELF — Continental shelf.',
      'SHELL — Bivalve outer covering.',
      'SHELLFISH — Bivalves + crustaceans.',
      'SHELL-FREE — Cultchless oyster seed.',
      'SHELLFISH SANITATION — NSSP rules.',
      'SHELTER — Refuge.',
      'SHIM — Adjustment wedge.',
      'SHIP — Large vessel.',
      'SHIPMENT — Transport.',
      'SHORE — Land edge.',
      'SHORT — Less than legal.',
      'SHORTAGE — Insufficient supply.',
      'SHORT-SHELL — Sub-legal lobster.',
      'SHRIMP — Crustacean.',
      'SHUTDOWN — Closure of operation.',
      'SIDE — Edge.',
      'SIDE LIGHTS — Nav lights.',
      'SIGN — Indicator.',
      'SIGNAL — Communication.',
      'SIGNATURE — Mark.',
      'SILICA — SiO₂; diatom shell.',
      'SILT — Fine sediment.',
      'SILVER — Color or metal.',
      'SIMPLE — Easy.',
      'SIMULATION — Model.',
      'SINGULAR — One.',
      'SINK — (1) Drain. (2) Carbon sink.',
      'SITE — Location.',
      'SIZE — Magnitude.',
      'SIZE LIMIT — Harvest size.',
      'SKILL — Trained ability.',
      'SLACK — (1) Loose. (2) Slack tide.',
      'SLAVE — Forced labor (historically; not modern aquaculture).',
      'SLOOP — Sailing rig.',
      'SLOT — Harvest size range.',
      'SLOUGH — Slough off; shed.',
      'SLOW — Not fast.',
      'SMELT — Small anadromous fish.',
      'SMOKE — Smoked product.',
      'SNAFU — Boat slang.',
      'SOCK — Mesh tube for spat.',
      'SOFT — Soft.',
      'SOFT-SHELL — Recently molted.',
      'SOFT-SHELL CLAM — Steamer clam.',
      'SOLAR — Of sun.',
      'SOLE — Boat floor.',
      'SOLID — Not liquid or gas.',
      'SOLO — Alone.',
      'SOLUTION — Liquid mixture or answer.',
      'SOLUBLE — Dissolvable.',
      'SOMETIMES — Occasionally.',
      'SONAR — Sound detection.',
      'SORT — Arrange.',
      'SOUND — (1) Audible. (2) Body of water.',
      'SOURCE — Origin.',
      'SOUTH — Direction.',
      'SOY — Soybean.',
      'SOLE — Bottom feeder fish.',
      'SPARE — Backup.',
      'SPARGE — Aerate or distribute (rare).',
      'SPAT — Newly-settled juvenile bivalve.',
      'SPATIAL — Of space.',
      'SPATTERN — Spat catch pattern.',
      'SPAWN — Reproduce.',
      'SPECIES — Biological category.',
      'SPECIFICITY — Selectivity.',
      'SPEED — Velocity.',
      'SPEND — Use up.',
      'SPENT — Used up post-spawn.',
      'SPHERE — Round shape.',
      'SPILL — Accidental release.',
      'SPILLWAY — Water release structure.',
      'SPOIL — Go bad.',
      'SPONGE — Aquatic invertebrate.',
      'SPRAY — Fine droplets.',
      'SPREAD — Distribute.',
      'SPRING — Season; bursting forth.',
      'SPRING TIDE — Highest tidal range.',
      'STABLE — Not changing.',
      'STAFF — Personnel.',
      'STAGE — Phase.',
      'STAGGER — Spread events over time.',
      'STAIN — Mark from contact.',
      'STAINLESS — Resistant to corrosion.',
      'STAND-ON — COLREGS vessel maintaining course.',
      'STANDARD — Customary.',
      'STANDARD LEASE — Maine larger aquaculture lease.',
      'STARBOARD — Right.',
      'STARFISH — Echinoderm; pest.',
      'START — Begin.',
      'STARTUP — New operation.',
      'STATE — Government level or condition.',
      'STATIONARY — Not moving.',
      'STATISTIC — Datum.',
      'STATUS — Condition.',
      'STATE-OF-THE-ART — Most modern.',
      'STAY — Sailboat rigging line.',
      'STEAM — Travel by ship; also: water vapor.',
      'STEAMER — Soft-shell clam.',
      'STEEL — Iron-carbon alloy.',
      'STEEP — Sloping.',
      'STEM — Forward of boat.',
      'STERN — Back of boat.',
      'STERNMAN — Lobster crew.',
      'STEWARDSHIP — Resource care.',
      'STICKY — Adhesive.',
      'STIFF — Not flexible.',
      'STIPULATE — Specify.',
      'STIRRER — Mixing device.',
      'STOCK — Population; also: inventory.',
      'STOCKING — Adding seed.',
      'STOMACH — Digestive organ.',
      'STONE — Rock.',
      'STONINGTON — Maine lobster capital.',
      'STOOP — Bend down.',
      'STOP — Cease.',
      'STORAGE — Holding facility.',
      'STORE — Hold or shop.',
      'STORM — Severe weather.',
      'STRAIN — Genetic line.',
      'STRESS — Pressure.',
      'STRETCH — Span or stretch.',
      'STRIP — Cut strip.',
      'STRIPED BASS — Morone saxatilis.',
      'STUDENT — Learner.',
      'SUBSTRATE — Bottom material.',
      'SUBSURFACE — Below water surface.',
      'SUBSURFACE FLOAT — Below-water flotation.',
      'SUBTIDAL — Below low tide line.',
      'SUCCESSION — Sequential community change.',
      'SUFFICIENT — Adequate.',
      'SUGAR KELP — Saccharina latissima.',
      'SULFUR — Element.',
      'SUMMER — Season.',
      'SUNRISE — Dawn.',
      'SUNSET — Dusk.',
      'SUPPLEMENT — Add to.',
      'SUPPLIER — Provider.',
      'SUPPORT — Help.',
      'SUPPRESS — Hold down.',
      'SURE — Confident.',
      'SURFACE — Top water level.',
      'SURPLUS — Excess.',
      'SURVEY — Systematic check.',
      'SURVIVAL — Continued existence.',
      'SUSPENDED — Off the bottom.',
      'SUSTAINABILITY — Long-term resource health.',
      'SUSTAINABLE — Maintainable long-term.'
    ]}
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPREHENSIVE AQUACULTURE STUDY GUIDE
  // ───────────────────────────────────────────────────────────
  var STUDY_GUIDE = [
    { unit: 'Unit 1: What is Aquaculture',
      essential_questions: [
        'What is aquaculture + how is it different from wild capture fisheries?',
        'Why does aquaculture matter for food security + climate?',
        'How is Maine\'s aquaculture industry structured + how has it evolved?',
        'What are the different scales + types of aquaculture (extensive, semi-intensive, intensive)?',
        'Why is Maine a good location for cold-water aquaculture?'
      ],
      key_concepts: 'aquaculture vs wild capture, food security, FAO production data, Maine industry overview, intensive vs extensive culture, climate-resilient species.',
      assessments: 'Industry overview infographic; visit Maine aquaculture farm; compare aquaculture to terrestrial agriculture.' },
    { unit: 'Unit 2: Aquaculture Species + Biology',
      essential_questions: [
        'What species are cultivated in Maine + what are their key biology?',
        'How does each species\' biology shape the aquaculture method?',
        'What is the life cycle of a bivalve mollusk + how does it apply to aquaculture?',
        'How does kelp aquaculture work + why is it climate-positive?',
        'What is selective breeding + why does it matter?'
      ],
      key_concepts: 'bivalve life cycle, spawning, larvae, settlement, byssal threads, cultch, hatchery, selective breeding, triploid, sustainable food.',
      assessments: 'Species profile cards; life-cycle diagram; build a mini-hatchery aquarium; field journal of observation.' },
    { unit: 'Unit 3: Maine Lease System + Regulation',
      essential_questions: [
        'How is Maine\'s aquaculture lease system structured (LPA, Standard, Experimental)?',
        'What is the process of applying for + maintaining a lease?',
        'What are NSSP food safety rules + why are they important?',
        'How does tribal sovereignty interact with aquaculture leasing?',
        'How do public hearings work + how should they be navigated?'
      ],
      key_concepts: 'LPA, Standard lease, Experimental lease, public hearing, NSSP, tagging, time-temperature, Vibrio Control Plan, tribal sovereignty.',
      assessments: 'Mock lease application; mock public hearing role-play; NSSP compliance walkthrough; lease tier comparison.' },
    { unit: 'Unit 4: Water Quality + Site Selection',
      essential_questions: [
        'What are the 6 key water-quality parameters + why does each matter?',
        'How do you select a site for aquaculture + what 12+ factors should you evaluate?',
        'What is NERACOOS + how do farmers use it?',
        'How do hydrodynamics + currents shape aquaculture success?',
        'How do you calibrate + use a water-quality probe?'
      ],
      key_concepts: 'temperature, salinity, dissolved oxygen, pH, chlorophyll-a, turbidity, site selection 12-factor framework, NERACOOS, hydrodynamics, probe calibration.',
      assessments: 'Site selection score-sheet for a hypothetical lease; probe demonstration; water-quality monitoring plan.' },
    { unit: 'Unit 5: Hatchery + Grow-Out Operations',
      essential_questions: [
        'What is a hatchery + how does it work?',
        'What are the 10 stages from broodstock to grower-ready spat?',
        'How does grow-out work for different species (rope-culture, lantern net, bag-on-bottom)?',
        'How do you manage disease + biosecurity?',
        'How do you handle storms + climate stress events?'
      ],
      key_concepts: 'broodstock, gametogenesis, spawning, larval rearing, setting, metamorphosis, nursery, biosecurity, disease management, climate adaptation.',
      assessments: 'Build a mini-hatchery; design a grow-out farm plan; disease scenario response.' },
    { unit: 'Unit 6: Business + Economics',
      essential_questions: [
        'How do aquaculture businesses make money?',
        'What are startup costs + revenue projections for a small-scale operation?',
        'What\'s the difference between wholesale + direct-to-consumer markets?',
        'How do cooperative models work?',
        'How do you build relationships with chefs + restaurants?'
      ],
      key_concepts: 'business plan, startup capital, break-even analysis, wholesale vs D2C pricing, cooperative model, market relationships, branding + storytelling.',
      assessments: 'Build a full business plan; pricing model; chef pitch.' },
    { unit: 'Unit 7: Climate + Sustainability',
      essential_questions: [
        'How does climate change affect Maine aquaculture?',
        'What are the climate-positive aspects of bivalve + kelp aquaculture?',
        'How does carbon math work for aquaculture food systems?',
        'How does aquaculture compare to terrestrial protein sources for climate impact?',
        'What are the limits of "climate-positive food" claims?'
      ],
      key_concepts: 'Gulf of Maine warming, ocean acidification, carbon sequestration, nitrogen capture, IMTA, blue carbon, climate adaptation.',
      assessments: 'Carbon math calculations; sustainability certification analysis; climate adaptation plan for a hypothetical farm.' },
    { unit: 'Unit 8: Wabanaki Heritage + Tribal Sovereignty',
      essential_questions: [
        'What is the Wabanaki Confederacy + what are tribal nations\' relationships with Maine waters?',
        'How are shell middens evidence of long-term Indigenous stewardship?',
        'What is the legal framework of modern tribal sovereignty in Maine?',
        'How is tribal-led aquaculture emerging?',
        'How should non-tribal operators engage respectfully?'
      ],
      key_concepts: 'Wabanaki Confederacy, shell middens, sea-run fish, Maine Indian Implementing Act, tribal-led aquaculture.',
      assessments: 'Research project on one Wabanaki nation; tribal speaker reflection; field visit to historic midden.' },
    { unit: 'Unit 9: Career Pathways',
      essential_questions: [
        'What aquaculture careers exist + at what education levels?',
        'How do you start a career in aquaculture?',
        'What support exists for new entrants?',
        'How is climate change changing career opportunities?',
        'What can a Maine high school + community college student do now?'
      ],
      key_concepts: 'farm owner-operator, hatchery technician, marine extension agent, DMR aquaculture coordinator, RAS operator, sea farm careers.',
      assessments: 'Career interest exploration; informational interview; mentorship plan.' },
    { unit: 'Unit 10: Working Waterfront + Community',
      essential_questions: [
        'Why does the "working waterfront" matter?',
        'How is it threatened + how is it protected?',
        'How does aquaculture fit into Maine\'s coastal community fabric?',
        'How do you build relationships with neighbors + abutters?',
        'How does your community + climate context shape your operation?'
      ],
      key_concepts: 'working waterfront, Maine Working Waterfront Coalition, abutter engagement, community-based stewardship.',
      assessments: 'Local advocacy plan; community meeting facilitation; case study of a successful Maine farm.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE FACTS
  // ───────────────────────────────────────────────────────────
  var AQ_FACTS = [
    { fact: 'Maine aquaculture industry value: ~$100M+ annually (2024).',
      context: 'Mussels + oysters + kelp + salmon + other species combined.',
      implication: 'Growing industry; significant opportunity for new entrants + community development.' },
    { fact: 'Maine has ~1,500+ active LPA leases + 100+ standard leases.',
      context: 'LPA = entry-level 1-acre 3-year; Standard = larger 20-year.',
      implication: 'Diverse industry from family operations to commercial scale.' },
    { fact: 'Damariscotta River is world-class oyster water.',
      context: 'Cold + saline + tidally well-flushed + free of MSX/Dermo.',
      implication: 'Premium oyster terroir; place-based branding works.' },
    { fact: 'Mook Sea Farms supplies most of Maine\'s oyster seed.',
      context: 'Founded 1985, Walpole, ME. Industry chokepoint.',
      implication: 'Hatchery capacity is a bottleneck for industry growth.' },
    { fact: 'Maine sugar kelp aquaculture is a winter crop (Nov seed → Apr-May harvest).',
      context: 'Cold-water specific; opposite season from most fisheries.',
      implication: 'Climate-positive + income-smoothing for diversifying fishermen.' },
    { fact: 'Atlantic Sea Farms partners with ~20 grower-partners.',
      context: 'Hub-and-spoke aggregator model lowers risk for individual operators.',
      implication: 'Cooperative + aggregator models are emerging.' },
    { fact: 'Gulf of Maine has warmed at ~4× global ocean rate.',
      context: 'Climate change is shifting species ranges + creating challenges + opportunities.',
      implication: 'Climate adaptation is permanent feature of Maine aquaculture industry.' },
    { fact: 'A single oyster filters 50-100 L water per day.',
      context: 'Bivalves are ecosystem engineers — water filtration is a major benefit.',
      implication: 'Aquaculture can improve coastal water quality.' },
    { fact: 'Maine has ~5+ active aquaculture hatcheries.',
      context: 'Mook, Muscongus Bay, Heritage Shellfish, CCAR, others.',
      implication: 'Limited but growing capacity. Hatchery expansion critical.' },
    { fact: 'Cooke Aquaculture is Maine\'s largest aquaculture by tonnage.',
      context: 'Salmon sea cages in Cobscook + Machias Bay.',
      implication: 'Controversial environmentally + tribal-rights-wise; industry shifting toward land-based.' },
    { fact: 'Whole Oceans (Bucksport) is building world-class land-based RAS salmon facility.',
      context: '$300M+ investment; climate-resilient + biosecure.',
      implication: 'Future of Maine finfish aquaculture is likely land-based.' },
    { fact: 'NSSP closures protect ~10-15% of Maine shellfish waters at any time.',
      context: 'Bacterial + biotoxin + sewage triggers.',
      implication: 'Operators must plan around closures; multi-site portfolios reduce risk.' },
    { fact: 'Mussel rope-culture cycle: 18-24 months from seed to market.',
      context: 'Long capital tie-up before revenue.',
      implication: 'Plan cash flow carefully; multiple cohorts smooth income.' },
    { fact: 'Maine oyster premium price: $1-$5+ per oyster at retail.',
      context: 'Place-based branding + storytelling + quality.',
      implication: 'D2C marketing can double or triple wholesale revenue.' },
    { fact: 'V-notch lobster rule is self-enforced industry tradition.',
      context: 'Egg-bearing females are marked + protected for life.',
      implication: 'Example of "tragedy of commons reversed" — community-based conservation works.' },
    { fact: 'Right whale entanglement is leading cause of human-related mortality.',
      context: 'Critically endangered (~340 individuals).',
      implication: 'Industry transitioning to ropeless gear + seasonal closures.' },
    { fact: 'Maine Aquaculture Association advocates for industry across federal + state policy.',
      context: 'Trade group founded 1977; ~200 member operations.',
      implication: 'Engaging with MAA accelerates new-operator learning + advocacy.' },
    { fact: 'Maine Sea Grant provides extension services for aquaculture industry.',
      context: 'UMaine-affiliated; technical + business support.',
      implication: 'Free + paid programs available to new + existing operators.' },
    { fact: 'Bigelow Lab researches ocean biogeochemistry + acidification.',
      context: 'East Boothbay-based; world-class research.',
      implication: 'Science base supports industry adaptation.' },
    { fact: 'Tribal sovereignty considerations are increasingly part of Maine aquaculture conversations.',
      context: '1980 Maine Indian Implementing Act; ongoing legal evolution.',
      implication: 'Operators should engage tribal authorities; sovereignty is legal + ethical principle.' },
    { fact: 'Maine has 6 commercial finfish RAS facilities planned or operating.',
      context: 'Whole Oceans + smaller operations.',
      implication: 'Industry diversifying beyond traditional sea-cage methods.' },
    { fact: 'Damariscotta Mills alewife run is iconic annual Maine event.',
      context: 'Spring (mid-April through early June) run draws community celebration.',
      implication: 'Cultural + ecological + economic anchor for region.' },
    { fact: 'Maine aquaculture creates ~1,000+ direct jobs + many more in supply chain.',
      context: 'Growing employment; rural coastal community support.',
      implication: 'Industry preservation = community preservation.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: APPENDIX — DETAILED PROCEDURES + CHECKLISTS
  // ───────────────────────────────────────────────────────────
  var PROCEDURES = [
    { title: 'Procedure 1: Pre-Deployment Site Verification',
      content: [
        'Step 1: Confirm DMR lease approval + boundaries. Reference lease documentation.',
        'Step 2: Verify NSSP water classification. Should be APPROVED or CONDITIONALLY APPROVED at minimum.',
        'Step 3: Visit site at multiple tide stages. Note depth, current, accessibility.',
        'Step 4: Take baseline water quality readings: temperature, salinity, DO, pH, Chl-a. Document.',
        'Step 5: Identify navigation considerations: traffic patterns, depth restrictions, hazards.',
        'Step 6: Engage abutters + neighbors. Discuss plans. Address concerns proactively.',
        'Step 7: Review insurance requirements. Confirm coverage adequate.',
        'Step 8: File float plan with shore-based contact.',
        'Step 9: Pre-position needed gear: anchors, lines, buoys, seed (if applicable), safety equipment.',
        'Step 10: Confirm weather window for deployment day. Avoid storm forecasts.'
      ] },
    { title: 'Procedure 2: Mussel Sock Deployment',
      content: [
        'Step 1: Confirm spat is ready. Acquire from hatchery or wild-set in advance.',
        'Step 2: Pre-position dropper lines on longline header rope.',
        'Step 3: At lease site, approach upcurrent of dropper. Use davit or boom for handling.',
        'Step 4: Wrap pre-seeded mesh sock around dropper. Spiral wrap to evenly distribute spat.',
        'Step 5: Tie at top + bottom of sock with marlinspike-style overhand knots.',
        'Step 6: Confirm spat is secure + not clumping at one end.',
        'Step 7: Move to next dropper. Repeat.',
        'Step 8: Document deployment: number deployed, density per dropper, photos.',
        'Step 9: Set monitoring schedule: weekly checks for first month; bi-weekly thereafter.',
        'Step 10: Within 1-2 weeks, spat will anchor via byssal threads. Mesh sock will degrade naturally over months as mussels grow.'
      ] },
    { title: 'Procedure 3: Oyster Cage Tumbling',
      content: [
        'Step 1: Set tumbling schedule based on growth rate + biofouling pressure. Typically weekly during summer.',
        'Step 2: Approach cage with boat. Stop downcurrent of cage.',
        'Step 3: Position davit or boom. Lift cage with handle.',
        'Step 4: Flip cage 180° + return to water. Allow oysters to redistribute.',
        'Step 5: Inspect cage for damage: tears in mesh, broken hardware. Note for repair.',
        'Step 6: Remove + dispose any tunicates or biofouling visible.',
        'Step 7: Move to next cage. Repeat.',
        'Step 8: Document tumbling: cages tumbled, mortality observed, biofouling level.',
        'Step 9: Adjust schedule if biofouling severe or growth slow.',
        'Step 10: Periodic deep clean: pull cage to shore for thorough biofouling removal + tumbling system service.'
      ] },
    { title: 'Procedure 4: Water Quality Probe Deployment',
      content: [
        'Step 1: Calibrate probe before each trip: T, S, DO, pH standards.',
        'Step 2: Pre-trip checklist: battery charged, sensor membrane intact, cable secured.',
        'Step 3: At site, position boat to allow vertical probe lowering.',
        'Step 4: Lower probe to standard depths: 1m, 3m, 5m (or species-appropriate).',
        'Step 5: Hold each depth ~1 minute for reading stabilization.',
        'Step 6: Record: time, GPS coords, depth, T, S, DO, pH, Chl-a, observations.',
        'Step 7: Compare to expected range for species. Flag concerns.',
        'Step 8: Take photo of probe reading at each depth.',
        'Step 9: Cross-check against NERACOOS regional data.',
        'Step 10: Document in farm log. Trend analysis monthly.'
      ] },
    { title: 'Procedure 5: Pre-Storm Gear Securing',
      content: [
        'Step 1: Monitor forecast. Identify storm 24-48 hours out.',
        'Step 2: Inventory at-risk gear: surface floats, droppers, mooring lines.',
        'Step 3: Add scope to mooring lines (8:1 minimum, 10:1+ for major storm).',
        'Step 4: Pull at-risk gear to shore if possible.',
        'Step 5: Secure boats: extra dock lines, fenders, hatches closed.',
        'Step 6: Brief crew on storm plan. File float plan.',
        'Step 7: Top off fuel + critical supplies.',
        'Step 8: Check VHF + EPIRB batteries. Ensure backup power.',
        'Step 9: Move boats to most-protected harbor if possible.',
        'Step 10: After storm: inspect all gear, document damage, report any insurance claims.'
      ] },
    { title: 'Procedure 6: NSSP Compliance Audit (Self-Check)',
      content: [
        'Quarterly: Review tag inventory. Order new pre-printed tags. Refresh trace-back log.',
        'Quarterly: Inspect cooler temperature logs. Ensure 24/7 monitoring.',
        'Quarterly: Confirm Vibrio Control Plan training current.',
        'Annually: Update HACCP plan. Refresh training certifications.',
        'Annually: Review water classification map for your area. Note any changes.',
        'Annually: Insurance review. Confirm liability + crop + property coverage adequate.',
        'Daily during operations: Maintain harvest log entries. Time + place + species + amount + temperature.',
        'Daily during operations: Confirm cold chain. Probe temperatures of coolers + transport.',
        'When closure issued: Verify alert received. Cease harvest from affected area immediately.',
        'When closure lifted: Document reopening + resume operations.',
        'Maintain records 90+ days minimum. Federal requirement.'
      ] },
    { title: 'Procedure 7: Harvest Day Workflow',
      content: [
        'Pre-harvest: Check weather + tide + DMR closures. Confirm buyer ready to receive.',
        'Pre-harvest: Pre-chill totes + transport. Ice packs ready.',
        'Pre-harvest: PFD + safety equipment + first aid + VHF + EPIRB.',
        'Pre-harvest: File float plan. Confirm crew briefing.',
        'En route to lease: Monitor weather. Plan return route.',
        'At lease: Pull dropper or cage. Sort + grade on deck.',
        'On deck: Cull undersized. Discard with byssal threads (don\'t waste).',
        'On deck: Pack keepers in totes. Maintain cold.',
        'En route to dock: Maintain refrigeration. Update buyer if delays.',
        'Shore-side: Transfer to walk-in cooler. Tag each container per NSSP.',
        'Pre-shipment: Verify orders. Pack for transport. Print + apply NSSP tags.',
        'Shipment: Cold-chain transport to buyer. Log time-temperature.',
        'Post-harvest: Clean + sanitize totes + cooler.',
        'Post-harvest: Update harvest log + financial records.',
        'End-of-day: Brief crew on observations. Plan next harvest.'
      ] },
    { title: 'Procedure 8: Disease Surveillance',
      content: [
        'Routine: Visual inspection of stock weekly. Note mortality, growth rate, abnormal appearance.',
        'Routine: Photo-document suspicious finds.',
        'Routine: Maintain mortality log: date, location, count, suspected cause.',
        'Trigger: Sudden mass mortality (>10% in week) — escalate.',
        'Trigger: Visible disease signs (yellowing meats, slow growth, shell abnormalities) — escalate.',
        'Escalation: Contact Maine DMR Bureau of Public Health. Request pathology sampling.',
        'Escalation: Sample collection per DMR protocol. Cool storage. Submit to DMR lab.',
        'Escalation: Quarantine affected lot if possible.',
        'Diagnostic: Wait for DMR diagnosis. Discuss with veterinary fisheries specialist.',
        'Response: Implement DMR-recommended treatment or depopulation as appropriate.',
        'Post-event: Document everything. File mortality reports. Communicate with neighbors if disease may spread.'
      ] },
    { title: 'Procedure 9: Public Hearing Preparation',
      content: [
        '4+ months before: Decide to apply for standard lease. Begin site selection.',
        '3+ months before: Talk to abutters individually. Listen. Address concerns honestly.',
        '3+ months before: Engage tribal authorities if waters are in tribal-claim or near tribal harvest areas.',
        '2-3 months before: Submit DMR standard lease application with complete supporting materials.',
        '2 months before: Prepare presentation materials: site map, business plan, photographs, sight-line analysis.',
        '1 month before: Print testimonial letters from supportive neighbors + local officials.',
        '1 week before: Practice presentation. Anticipate likely objections + responses.',
        'Day of hearing: Arrive early. Set up materials. Greet attendees + DMR adjudicator.',
        'During hearing: Present clearly. Listen to objections. Respond respectfully + factually.',
        'Post-hearing: Send thank-you notes. Address any follow-up.',
        'Decision: DMR adjudicator may approve, modify, or deny. Be prepared for any outcome.',
        'Approval: Implement conditions. Begin operations.',
        'Denial or modification: Consider next steps; possible appeals.'
      ] },
    { title: 'Procedure 10: Annual Business Review',
      content: [
        'End-of-year: Compile annual harvest data by species, area, month.',
        'End-of-year: Reconcile financial records. Profit/loss statement.',
        'End-of-year: Submit annual DMR harvest report.',
        'End-of-year: Tax preparation (separate from harvest reporting).',
        'End-of-year: Insurance review. Adjust coverage based on growth.',
        'End-of-year: Equipment audit. Plan major purchases for next year.',
        'End-of-year: Climate + market trend review. Identify opportunities + threats.',
        'End-of-year: Lease tier review. Consider expansion or renewal.',
        'End-of-year: Crew + workforce planning. Apprentice training pipeline.',
        'End-of-year: Marketing review. Adjust pricing + channels based on Year results.',
        'End-of-year: Climate adaptation plan. Update 5-year horizon.',
        'End-of-year: Mentor + relationship review. Network with industry peers.',
        'End-of-year: Set goals for next year. Document.'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPLETE AQUACULTURE TEXTBOOK CHAPTERS
  // ───────────────────────────────────────────────────────────
  var TEXTBOOK_CHAPTERS = [
    { chapter: 'Chapter 1: Introduction to Aquaculture',
      sections: [
        'Aquaculture is the controlled cultivation of aquatic organisms — animals + plants — under managed conditions. It contrasts with capture fisheries (wild-harvest). Globally, aquaculture produces more aquatic protein than capture fisheries combined (FAO 2024).',
        'Modern aquaculture began thousands of years ago in China (carp culture) + ancient Egypt + Hawaii. Industrial aquaculture emerged in the 20th century with salmon (Norway), shrimp (SE Asia), + bivalves (Pacific NW + Europe).',
        'Maine\'s aquaculture industry is young (1970s-onwards) but expanding rapidly. Focus areas: oysters, mussels, kelp, salmon, scallops, soft-shell clams. Approximately 200+ active operations + ~$100M annual industry value (2024).',
        'Aquaculture types: (1) Extensive — minimal inputs, low density, e.g., wild-set mussels on rope. (2) Semi-intensive — moderate inputs, moderate density, e.g., hatchery-supplied + rope-cultured mussels. (3) Intensive — high inputs, high density, e.g., salmon sea cage or RAS finfish. Each has different ecology + economics.',
        'Why aquaculture? (1) Food security as wild fisheries depleted. (2) Lower environmental impact than terrestrial livestock for many species. (3) Job creation in coastal communities. (4) Climate adaptation (some species thrive in changing waters where wild populations decline).'
      ] },
    { chapter: 'Chapter 2: Aquaculture Species Biology',
      sections: [
        'Aquaculture species span many phyla: bivalve mollusks (oyster, clam, mussel, scallop), gastropods (whelk, conch), crustaceans (lobster, shrimp), echinoderms (sea cucumber, urchin), tunicates, finfish (salmon, cod, tilapia), and macroalgae (kelp, dulse).',
        'Maine focuses on bivalves + kelp + a few finfish species. Each has unique biology that drives aquaculture method.',
        'Bivalves: filter feeders that eat phytoplankton + organic particles from water. Adults are sessile (immobile) — anchored to substrate by byssal threads (mussels) or cement (oysters). Larvae are pelagic — drift in water column. Aquaculture exploits this life cycle by collecting larvae or hatchery-spawned seed + providing growing substrate.',
        'Mussels (Mytilus edulis): blue mussel is Maine\'s primary aquaculture mussel. Other species include ribbed mussel (M. demissa) for ecosystem services + horse mussel (Modiolus modiolus) for offshore.',
        'Oysters (Crassostrea virginica): eastern oyster is Maine\'s primary aquaculture oyster. Pacific oyster (C. gigas) is the other major commercial species but doesn\'t grow well in Maine + has disease vulnerability (OsHV-1).',
        'Scallops: sea scallop (Placopecten magellanicus) is Maine\'s commercial species. Bay scallop (Argopecten irradians) is smaller + faster-growing but historically southern. Both target with lantern net aquaculture.',
        'Kelp: sugar kelp (Saccharina latissima) is Maine\'s primary aquaculture kelp. Winged kelp (Alaria esculenta) is the second species. Both photosynthesize CO₂ + nutrients into biomass during a single winter growing season.',
        'Finfish: Atlantic salmon (Salmo salar) is the major Maine aquaculture finfish. Smaller industry: cod, halibut, yellowtail flounder + emerging RAS species.'
      ] },
    { chapter: 'Chapter 3: Site Selection',
      sections: [
        'Site selection is the single biggest determinant of aquaculture farm success or failure. A bad site cannot be made good with effort.',
        'Key parameters: salinity, temperature, dissolved oxygen, pH, chlorophyll-a, turbidity, currents, depth, bottom substrate, freshwater inflow, wave exposure, vessel traffic, sewage/pollution sources, abutters + neighbors.',
        'Each species has specific tolerance ranges (see Water Quality Thresholds tab). Sites should be within optimal range for chosen species — and ideally with some safety margin for climate-driven shifts.',
        'Currents matter: too slow = stagnation + waste accumulation; too fast = scour + biofouling. Ideal: 0.2-1.0 kt typical.',
        'Bottom substrate: mud + sand preferred for anchoring; pure rock challenging; eelgrass + sensitive habitat = problematic.',
        'Site walk-through: visit multiple times at different tides + seasons. Photograph + measure. Document conditions.',
        'Permitting overlay: confirm waters are NSSP-approved + free from competing uses + within tribal rights consultation.',
        'Long-term thinking: climate will shift conditions. Site selection should consider 10-20 year horizon, not just current year.'
      ] },
    { chapter: 'Chapter 4: Maine Lease Tiers',
      sections: [
        'Maine offers three aquaculture lease types: Limited Purpose Aquaculture (LPA), Standard, and Experimental.',
        'LPA — up to 1 acre, 3-year term, no public hearing required, modest application fee ($50). The entry-level + most common new-operator path. ~1500+ active LPA leases in Maine.',
        'Standard — up to 100 acres, 20-year term, public hearing required, more substantial application fees + supporting documentation. For scaling operations + multi-species farms.',
        'Experimental — up to 4 acres, 3-year term (non-renewable; must convert to standard). For research + new-species/new-method trials. Affiliated with research institutions OR DMR-approved trials.',
        'Application process: pre-application research (review existing leases, site selection), application preparation (site description, gear specs), DMR review, decision, compliance, annual reporting.',
        'Standard lease public hearing: abutters + general public can testify + object. Major points of contention: navigation, view shed, water quality, sensitive habitat, traditional use.',
        'Tribal sovereignty consideration: in tribal-claim waters, engage tribal authorities before submission. Some sites may require tribal consent or be inappropriate.',
        'Annual obligations: harvest reporting, lease-status reporting, compliance with conditions, gear marking.'
      ] },
    { chapter: 'Chapter 5: Hatchery Operations',
      sections: [
        'Hatcheries supply seed (juvenile organisms) to growers. The hatchery is the start of the production cycle + a major industry chokepoint in Maine.',
        'Maine\'s primary oyster hatchery: Mook Sea Farms (Walpole). Also: Muscongus Bay Aquaculture (Bremen), Heritage Shellfish Hatchery (Bremen), UMaine CCAR (Franklin).',
        'Workflow: broodstock conditioning (6-10 wk), spawning (1 day), fertilization (24-48 hr), larval rearing (2-3 wk), setting (1-3 days), nursery (4-8 wk), sale to growers.',
        'Each stage has bottlenecks + failure modes. Larval rearing especially demanding — daily monitoring + algae feed + water-quality control.',
        'Setting (metamorphosis from larva to spat) is a critical transition. Many die; setting success rate 10-80% in good conditions.',
        'Hatchery capital costs: $500K-$2M+ for moderate-scale operation. Operating costs: energy (heating, lighting, filtration), labor, algae feed, broodstock.',
        'Genetics + selective breeding: hatcheries select for desirable traits (growth, disease resistance, climate tolerance) over generations. Triploid stock is increasingly standard for premium oyster markets.',
        'Biosecurity: prevent disease introduction. UV sterilization + quarantine + diagnostic surveillance. Single outbreak can be catastrophic.',
        'Industry concern: Maine hatchery capacity is oversubscribed. Multi-year waitlists for seed in some years. Industry growth depends on hatchery expansion.'
      ] },
    { chapter: 'Chapter 6: Grow-Out Methods',
      sections: [
        'Once growers receive seed, they deploy in chosen culture system + grow to market size. Cycle is 18 months to 4+ years depending on species.',
        'Mussel rope culture: hatchery seed is loaded into mesh "socks" + tied to dropper lines hanging from longline header rope. Mussels attach via byssal threads + grow. Single dropper produces 4-7 kg/m at harvest.',
        'Oyster floating cage: oyster spat placed in plastic mesh cages floating at surface. Cages "tumbled" periodically to break clumps + reduce biofouling + produce uniform shape. Premium method for Maine oysters.',
        'Oyster bag-on-bottom: bags of oysters placed directly on intertidal substrate. Lower cost, lower-margin product.',
        'Oyster rack-and-bag: bags on raised racks. Hybrid of bottom + floating advantages.',
        'Kelp longline: seeded line (microscopic gametophyte stage) deployed in fall. Kelp grows through winter; harvested April-May.',
        'Scallop lantern net: stacked disc-shaped chambers. Standard for premium scallop aquaculture.',
        'Soft-shell clam bottom culture: in protected intertidal flats. Slow-growth, town-managed.',
        'Each method has different gear costs, labor intensity, density tolerances, climate sensitivity.'
      ] },
    { chapter: 'Chapter 7: Water Quality Management',
      sections: [
        'Water quality determines aquaculture success. Six key parameters: temperature, salinity, dissolved oxygen, pH, chlorophyll-a, turbidity.',
        'Temperature: each species has optimal + tolerance range. Mussels stressed >22°C; oysters tolerate wider range. Heat waves can cause mass mortality.',
        'Salinity: Atlantic Maine waters typically 25-32 PSU. Heavy rain pulses freshwater + can stress bivalves. Species like oysters more tolerant of variability.',
        'DO: minimum >5 mg/L for most bivalves. Dense beds + warm calm summers = hypoxia risk. Stocking density matters.',
        'pH: optimum 7.8-8.2. Ocean acidification reduces pH; affects larval shell formation. Hatcheries buffer for shell-forming stages.',
        'Chlorophyll-a: food availability. Low = slow growth. High (>30 µg/L) = potential HAB warning.',
        'Turbidity: high sediment clogs gills + smothers seed. Post-storm events.',
        'Monitoring frequency: weekly minimum; daily during stress events. Multiple depths + GPS-logged.',
        'NERACOOS provides regional buoy data. Cross-check own site with regional pattern.',
        'Calibration: monthly with standard solutions. Reliable data depends on properly-calibrated instruments.'
      ] },
    { chapter: 'Chapter 8: Disease + Pest Management',
      sections: [
        'Maine aquaculture faces several diseases + pests. Each requires management strategy.',
        'MSX (Multinucleated Sphere X): protozoan parasite affecting eastern oysters. Cold Maine water less severe than south of Cape Cod, but moving north with warming.',
        'Dermo (Perkinsus marinus): protozoan, similar to MSX. Less Maine impact historically.',
        'OsHV-1 (Pacific oyster herpes virus): doesn\'t affect Maine\'s eastern oysters. Vigilance against any Pacific oyster introduction.',
        'Polydora mud blister worm: cosmetic shell damage. Manage with tumbling + drying.',
        'Sea lice (on farmed salmon): parasitic copepods. Major issue in salmon aquaculture; controlled with cleaner fish + chemical treatments.',
        'Green crab: invasive species devastating soft-shell clam flats. Trap + remove; some commercial harvest experiments.',
        'Tunicate fouling: settling tunicates add weight + reduce flow. Air-dry gear; tumble cages.',
        'Starfish + sea star predation: traditional shellfish predator. Lift gear off bottom; "starfish mops" (drag chain mats).',
        'Common Eider sea duck: protected predator of mussels. Suspended culture deeper than divers can reach.',
        'Biosecurity: source seed from reputable hatcheries; quarantine; routine disease surveillance.'
      ] },
    { chapter: 'Chapter 9: NSSP + Food Safety',
      sections: [
        'National Shellfish Sanitation Program (NSSP) is federal-state cooperative managing shellfish safety. Every commercial harvest operates under NSSP.',
        'Water classification: APPROVED (always harvest); CONDITIONALLY APPROVED (rain-triggered closure); RESTRICTED (depuration-only); PROHIBITED (no harvest ever).',
        'Maine DMR Bureau of Public Health maintains classification. Subscribe to closure alerts.',
        'Tagging requirements: every shellfish container at harvest must carry tag with harvester license, harvest date, harvest area, species. Stays with product to retail. Trace-back-able.',
        'Time-temperature control: shellfish must reach ≤45°F (refrigeration) within strict time windows. Hot day = shorter window. Vibrio Control Plan codifies.',
        'Vibrio (Vp + Vv): naturally-occurring bacteria, grows in warm water. Summer-specific time-temperature controls.',
        'Biotoxin monitoring: PSP (saxitoxin), ASP (domoic acid), DSP (okadaic acid). Routine sampling. Closures triggered by exceeded thresholds.',
        'HACCP (Hazard Analysis Critical Control Points): required for processors + many growers. Training available through Maine Sea Grant + UMaine.',
        'Recordkeeping: harvest logs, water-quality, time-temperature, training. Maintained 90+ days.',
        'Enforcement: DMR + state police + Coast Guard. Penalties: fines, license revocation, criminal charges.'
      ] },
    { chapter: 'Chapter 10: Climate Adaptation',
      sections: [
        'The Gulf of Maine has warmed at ~4× global ocean rate. Climate adaptation is the defining challenge for Maine aquaculture.',
        'Warming impacts: heat stress on cold-water species (mussels); range shifts (cold species north, warm species north); HAB frequency + timing changes; acidification.',
        'Adaptation strategies: (1) Species diversification — mix cold-water (mussel) + warm-tolerant (oyster) + emerging (kelp) species. (2) Site rotation — keep options for cooler sites. (3) Selective breeding — develop heat + acidification-resistant strains. (4) Hatchery buffering for acidification. (5) Climate-informed planning — 10-20 year horizon, not just season.',
        'Emerging opportunities: kelp is climate-positive (net carbon-capturing). Land-based RAS facilities (Whole Oceans, Bucksport) are climate-resilient.',
        'Risk management: insurance, diversification, financial reserves, multi-cohort production for staggered harvests.',
        'Climate research partnerships: Bigelow Lab + UMaine + GMRI are active partners with growers. Take advantage.',
        'Long-term outlook: Maine aquaculture has advantages (diverse species portfolio, cold-water terroir, working waterfront infrastructure). Climate-adaptive industry can thrive.',
        'Right whale + Marine Mammal Protection Act considerations: vertical gear lines are entanglement risk. New rules (ropeless or seasonal-pull gear) reshaping industry.',
        'Working with regulators + research community: stay engaged. Industry voice influences science + policy.',
        'Education + workforce: next-generation operators need climate literacy + adaptive skills.'
      ] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: EXTENDED AQUACULTURE ESSAYS
  // ───────────────────────────────────────────────────────────
  var EXTENDED_ESSAYS = [
    { title: 'Why Maine Oysters Command Premium Prices',
      content: 'Maine\'s oyster industry has gone from near-extinct to nationally-recognized premium product in three decades. Several factors drive premium pricing: (1) Cold-water terroir — Maine oysters mature slowly in cold + saline water, developing the distinct briny + mineral character connoisseurs love. (2) Brand storytelling — named farms (Glidden Point, Pemaquid, Bagaduce, Damariscotta) tell place-based stories that justify $1-$5 per oyster at retail. (3) Disease resistance — cold Maine water keeps MSX + Dermo less prevalent than southern waters; healthier stock. (4) Aquaculture method — Maine farms typically grow in floating cages or rack-and-bag systems that produce uniform, deep-cupped, premium-shape oysters. (5) Direct-to-consumer + restaurant channels — many Maine farms sell directly rather than through wholesale aggregators, doubling per-oyster revenue. (6) Maine reputation — broader Maine seafood quality narrative supports premium pricing.',
      practical: 'For new operators: invest in storytelling + relationship-building, not just production. Premium pricing depends on premium positioning.' },
    { title: 'The Mussel Industry Cycle',
      content: 'Maine mussel aquaculture follows a roughly 18-24 month cycle from seed to market. Year 0: hatchery (or wild-set) spat collected + supplied to growers. Spring of Year 1: growers sock spat onto droppers + deploy. Year 1: mussels anchor + begin growing; some natural mortality + some predation. Year 1 winter: ice + storm risk. Year 2 spring: continued growth + sock replacement as mussels outgrow original sock. Year 2 summer-fall: harvest as mussels reach commercial size (typically >1.5"). Year 2-3 winter: market season for premium mussels. Key economic insight: 18+ month capital tie-up before revenue. Most farms have multiple cohorts at different ages for continuous production.',
      practical: 'Plan cash flow carefully. Start small + add cohorts gradually. Diversify into oysters or kelp for seasonal income smoothing.' },
    { title: 'Kelp Aquaculture — Why Now',
      content: 'Maine\'s kelp industry barely existed a decade ago. Today: ~$1-3M annual value + growing. Why now? (1) Climate change is reducing winter ice + extending the growing season slightly. (2) Atlantic Sea Farms + similar companies have aggregator-distributor models that reduce risk for individual operators. (3) Consumer demand for low-carbon + climate-friendly food is growing. (4) Existing lobster + groundfish boats can deploy kelp lines using same gear + boats — low marginal capital investment. (5) State + federal aquaculture policy increasingly supportive of seaweed culture. (6) Kelp is unique among Maine aquaculture: it requires zero feed inputs + sequesters carbon + nitrogen. Growing season opposite to most fisheries (winter) means it complements rather than competes with traditional fishing seasons.',
      practical: 'For diversifying lobstermen + new farmers: kelp + lobster + groundfish portfolio = climate-resilient + income-smoothing.' },
    { title: 'Shellfish + Climate Adaptation',
      content: 'Maine aquaculture sits at the intersection of climate vulnerability + climate solution. Vulnerabilities: (1) Acidifying water (CO₂ dissolution) makes shell formation harder for larvae — hatcheries buffer to compensate; (2) Heat events stress + kill warm-water-sensitive species (mussels >22°C); (3) Salinity swings from heavier precipitation; (4) HAB events extending earlier + later in seasons; (5) Storm intensity increasing. Solutions: (1) Bivalves filter water + capture nitrogen — water quality service; (2) Kelp absorbs CO₂ + nutrients during growth — modest carbon capture; (3) Aquaculture is one of the lowest-carbon protein production systems; (4) Diversification across species + sites builds resilience. Maine aquaculture is climate-aware + climate-adaptive — leading among US states.',
      practical: 'Plan farm operations for 10-20 year climate horizon. Diversify species + sites. Invest in selective breeding for resilient strains.' },
    { title: 'Working Waterfront — What\'s at Stake',
      content: 'Maine\'s "working waterfront" is the system of docks, processing facilities, boat shops, ice plants, cold storage, + harbor infrastructure that supports commercial fishing + aquaculture. It\'s shrinking due to coastal gentrification, climate impacts, + economic pressure on family operations. Maine\'s Working Waterfront Access Protection Program uses state-level conservation easements + zoning to protect critical infrastructure. Aquaculture industry growth depends on continued access to this infrastructure. Recent reports (Maine Coast Heritage Trust, Island Institute) document continued erosion. New aquaculture facilities are themselves part of preserving working waterfront — a positive-feedback loop.',
      practical: 'When considering location for new operation: check working-waterfront preservation status. Engage with local + state preservation efforts.' },
    { title: 'Tribal Sovereignty + Aquaculture',
      content: 'Maine aquaculture in or near tribal-claim waters intersects with ongoing tribal sovereignty conversations. The 1980 Maine Indian Claims Settlement Act + Maine Implementing Act defined some boundaries but continuing legal + political disputes remain. Aquaculture leases require state DMR approval but may also implicate tribal rights. Best practices for non-tribal operators: (1) Engage tribal authorities early. (2) Respect traditional + sacred sites. (3) Avoid areas with documented tribal subsistence + ceremonial harvest use. (4) Support tribal-led aquaculture initiatives — Penobscot + Passamaquoddy + Maliseet are exploring tribally-owned operations. (5) Recognize tribal rights as legal + ethical principle, not optional. Maine\'s aquaculture future is likely more tribal-led than current.',
      practical: 'For new operators: engage tribal nations early. Build relationships across coastal communities.' },
    { title: 'Restaurant + Direct-to-Consumer Economics',
      content: 'Wholesale vs direct-to-consumer pricing differs dramatically. Wholesale oyster: $0.30-$0.60 each. Restaurant: $1-$3 each. Farmers market: $1-$3 each. Online: $1.50-$3 each. The 2× to 5× markup from wholesale to D2C is achievable but requires: (1) High-quality consistent product; (2) Branding + storytelling; (3) Customer relationships; (4) Logistics (cold chain + delivery); (5) Marketing time + budget; (6) Possibly retail/farmers market presence; (7) NSSP compliance throughout. Small Maine farms (1-5 acre) often start with farmers market + direct restaurant accounts, then scale to wholesale + e-commerce as volume grows.',
      practical: 'Calculate realistic D2C revenue carefully. Time required + logistics cost can eat margin if not managed.' },
    { title: 'Cooperative Models in Aquaculture',
      content: 'Maine has rich cooperative tradition (lobster co-ops since 1900s) that\'s emerging in aquaculture. Models include: (1) Atlantic Sea Farms hub-and-spoke — single buyer aggregates from many partner growers, provides seed + training + market. (2) Lobster co-op style — multiple members own shares, co-op handles marketing + distribution. (3) Equipment sharing co-ops — multiple farms share expensive equipment (boats, hatchery access). (4) Lease-pooling co-ops — multiple operators share a larger lease + work it cooperatively. Benefits: lower individual risk; shared marketing power; collective bargaining; mutual support. Challenges: governance complexity; cultural fit; conflict resolution.',
      practical: 'For new operators in established regions: explore co-op membership before going solo. Established co-ops can dramatically lower risk + capital needs.' },
    { title: 'The Right Whale Crisis in Aquaculture Terms',
      content: 'North Atlantic right whale population (~340 individuals) is critically endangered. Fishing + aquaculture gear entanglement is leading non-natural mortality cause. NOAA + USCG implementing increasingly strict rules: seasonal closures, ropeless gear mandates, vessel-speed restrictions (10-kt zones), real-time monitoring + alerts. For aquaculture: vertical mooring lines + dropper lines are the entanglement risk. New ropeless or "on-call" gear (acoustic release of stored buoys) is being developed + deployed. Maine industry is in transition — many farms reconfiguring gear + operations. Compliance costs add up; but right whale survival is at stake.',
      practical: 'For new + existing operations: stay current on right whale rules. Plan gear that\'s compliant. Engage with policy-making + technology innovation.' },
    { title: 'Climate-Positive Food Branding',
      content: 'Maine aquaculture is among the lowest-carbon protein production systems. Bivalves: ~1-5 kg CO₂e per kg edible protein. Kelp: net carbon-capturing during growth. Compared to beef (~25 kg CO₂e/kg) or even chicken (~5-10 kg), bivalves + kelp are radically lower. Marketing this honestly: (1) Don\'t overclaim ("carbon-negative" is mostly inaccurate — be honest about cycle); (2) Emphasize "low-carbon" + "water-improving" rather than dramatic numbers; (3) Use third-party certifications (BAP, ASC, Seafood Watch); (4) Tell the story of place + sustainability practice; (5) Engage with school + youth + climate-aware consumers. Maine\'s aquaculture industry is well-positioned for climate-friendly food branding.',
      practical: 'Develop a clear honest sustainability story + measurement. Use it consistently in marketing.' },
    { title: 'Genetic Diversity + Selective Breeding',
      content: 'Aquaculture genetics matter for long-term industry sustainability. Issues: (1) Hatchery populations have smaller effective size than wild populations, risking inbreeding; (2) Selective breeding for fast growth or disease resistance can reduce diversity + introduce new vulnerabilities; (3) Wild-farm interbreeding (when farmed individuals escape) can affect wild populations; (4) Genomic tools allow precise selection but raise concerns about ethics. Maine hatcheries (Mook + others) maintain broodstock pedigrees + rotate genetic lines. Active research at UMaine + Bigelow on climate-adapted strains.',
      practical: 'Source seed from reputable hatcheries. Support broader research investment.' },
    { title: 'Disease Management in Aquaculture',
      content: 'Disease is a constant aquaculture concern. Major Maine concerns: (1) MSX (Multinucleated Sphere X) — protozoan affecting eastern oysters, less severe in cold Maine water; (2) Dermo (Perkinsus marinus) — similar to MSX; (3) Polydora "mud blister worm" — cosmetic shell damage; (4) Disease in finfish (sea lice on salmon, etc.); (5) Emerging: OsHV-1 in Pacific oysters (doesn\'t affect Maine\'s eastern oysters but watch); (6) Disease surveillance is critical — Maine DMR diagnostic lab + Bigelow Lab provide testing. Management: biosecurity, selective breeding for resistance, environmental control (depth, density), triploid stock (immune-system advantages).',
      practical: 'Submit suspicious mortality events to Maine DMR for diagnosis. Maintain biosecurity protocols.' },
    { title: 'Water Quality Monitoring in Practice',
      content: 'Real-world water quality monitoring on a Maine farm: (1) Weekly minimum probe deployment at standard depths. (2) Daily during heat waves + post-rain events. (3) Multiple parameters: T, S, DO, pH, Chl-a, turbidity. (4) Log everything; trend analysis catches problems early. (5) Cross-check own readings against NERACOOS buoy data nearby. (6) Calibrate probes monthly with standard solutions. (7) Have backup probe ready. (8) Subscribe to DMR closure alerts + Bigelow Lab HAB updates. Investment in monitoring pays off in disease prevention, harvest planning, + decision support.',
      practical: 'Set up monitoring routine before first crisis. Build it into operations from Day 1.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: DETAILED HATCHERY WORKFLOW
  // ───────────────────────────────────────────────────────────
  var HATCHERY_WORKFLOW = [
    { stage: 'Stage 1: Broodstock Acquisition',
      detail: 'Select adult oysters with desired traits (large + healthy + disease-resistant). Maintain genetic diversity by sourcing from multiple lineages. Maine hatcheries may use Mook lines, NEH lines (MSX-resistant), or other regional broodstock.',
      duration: '1-2 weeks',
      challenges: 'Pricing of broodstock; quarantine before integration with hatchery population.' },
    { stage: 'Stage 2: Conditioning (Gametogenesis)',
      detail: 'Hold broodstock at controlled temperature (cooler than ambient) for 6-10 weeks. Provide ample algae food. Monitor gonad development weekly.',
      duration: '6-10 weeks',
      challenges: 'Some broodstock fail to ripen — varies by individual. Stagger groups to ensure spawning material.' },
    { stage: 'Stage 3: Spawning Induction',
      detail: 'Temperature shock (5-10°C rise over hours) or chemical induction (serotonin injection in oysters) triggers spawning. Sex-segregate gametes in separate buckets.',
      duration: 'Same day',
      challenges: 'Synchronization; not all individuals spawn on the same trigger.' },
    { stage: 'Stage 4: Fertilization',
      detail: 'Combine eggs + sperm in controlled ratios to maximize fertilization without over-stress. Check microscopically for cleavage (cell divisions indicating fertilized eggs).',
      duration: '24-48 hours',
      challenges: 'Sperm + egg quality vary; not all combinations fertilize equally well.' },
    { stage: 'Stage 5: Larval Rearing (D-stage to Eyed)',
      detail: 'Larvae transferred to rearing tanks at appropriate density. Daily water changes + algae feeding. Monitor growth + survival weekly via microscope.',
      duration: '2-3 weeks',
      challenges: 'Mass mortality possible from poor water quality or feed crashes. Most labor-intensive stage.' },
    { stage: 'Stage 6: Setting',
      detail: 'Eyed larvae develop foot + eyespots; ready to settle. Provide clean cultch (old shell) substrate. Larvae attach + undergo metamorphosis to spat.',
      duration: '1-3 days',
      challenges: 'Setting success rate varies (10-80%+ in good batches). Many die at metamorphosis transition.' },
    { stage: 'Stage 7: Nursery (Upweller)',
      detail: 'Newly-set spat in flow-through nursery tanks for 4-8 weeks until 2-6 mm shell.',
      duration: '4-8 weeks',
      challenges: 'Continued water-quality control; food supply.' },
    { stage: 'Stage 8: Sale to Growers',
      detail: 'Spat sorted by size, packed wet, shipped overnight.',
      duration: 'Same day or 24-hr',
      challenges: 'Logistics; reaching growers during their deployment window.' },
    { stage: 'Stage 9: Broodstock Renewal',
      detail: 'Replenish broodstock continually. Select for desirable traits + maintain genetic diversity.',
      duration: 'Ongoing',
      challenges: 'Long-term thinking; pedigree management.' },
    { stage: 'Stage 10: Biosecurity Maintenance',
      detail: 'Continuous biosecurity: UV sterilization, quarantine, disease surveillance. Outbreak response protocol.',
      duration: 'Ongoing',
      challenges: 'Constant vigilance; single breach can be catastrophic.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE EQUIPMENT DETAIL
  // ───────────────────────────────────────────────────────────
  var EQUIPMENT_DETAIL = [
    { name: 'Mussel Sock',
      description: 'Cotton or biodegradable mesh tube. Pre-loaded with spat. Wound around dropper line. Mesh breaks down over months as mussels grow.',
      cost: '$0.50-$2.00 per sock (varies by length).',
      lifespan: 'Single-use; breaks down naturally.',
      maintenance: 'None; wraps around droppers + degrades.' },
    { name: 'Longline Header Rope',
      description: '3/4-1" polypropylene or polyester rope. Suspended at depth via subsurface floats. Droppers attached at intervals.',
      cost: '$2-$5/m installed.',
      lifespan: '5-7 years; UV + abrasion degrade.',
      maintenance: 'Inspect annually for chafe; replace as needed.' },
    { name: 'Dropper Line',
      description: '1/2-3/4" line attached to longline. Where mussel socks attach + grow.',
      cost: '$1-$3/m.',
      lifespan: '3-5 years.',
      maintenance: 'Replace with damage.' },
    { name: 'Subsurface Float',
      description: 'Buoyancy element on longline. Maintains depth + supports gear weight.',
      cost: '$30-$80 each.',
      lifespan: '10+ years.',
      maintenance: 'Inspect for damage; clear biofouling.' },
    { name: 'Surface Float / Buoy',
      description: 'Visible marker buoy at line endpoints. Color-coded per Maine DMR rules.',
      cost: '$50-$200 each.',
      lifespan: '5-10 years.',
      maintenance: 'Inspect color + visibility; replace damaged.' },
    { name: 'Mooring Block (Mushroom Anchor)',
      description: 'Multi-ton cast-iron anchor + chain. Holds longline in position.',
      cost: '$500-$2000 each + barge installation cost.',
      lifespan: '20+ years if properly inspected.',
      maintenance: 'Annual chain + shackle inspection.' },
    { name: 'Oyster Floating Cage',
      description: 'Multi-cage system with mesh sides + flotation. Cages tumble periodically (manual or automated).',
      cost: '$50-$200 per cage.',
      lifespan: '5-10 years.',
      maintenance: 'Clean biofouling; replace damaged mesh.' },
    { name: 'Oyster Bag-on-Bottom',
      description: 'Plastic mesh bags filled with oysters placed directly on intertidal substrate.',
      cost: '$5-$15 per bag.',
      lifespan: '2-5 years.',
      maintenance: 'Periodic inspection + relocation as needed.' },
    { name: 'Lantern Net (Scallop)',
      description: 'Stacked disc-shaped chambers, ~6-10 layers per stack. Used for scallops + experimental species.',
      cost: '$80-$200 per stack.',
      lifespan: '5-10 years.',
      maintenance: 'Clean biofouling; gentle handling.' },
    { name: 'Tumbler (Oyster Cage Automation)',
      description: 'Solar-powered or wave-driven rotation system that turns cages.',
      cost: '$200-$1000 per system.',
      lifespan: '5-10 years.',
      maintenance: 'Battery + motor; biofouling.' },
    { name: 'YSI Water-Quality Meter',
      description: 'Handheld probe measuring T, S, DO, pH, sometimes Chl-a.',
      cost: '$1000-$5000.',
      lifespan: '5-10 years.',
      maintenance: 'Monthly calibration; sensor membrane replacement annually.' },
    { name: 'Refractometer (Salinity)',
      description: 'Simple optical device for spot salinity measurement.',
      cost: '$30-$100.',
      lifespan: '10+ years.',
      maintenance: 'Calibrate with distilled water.' },
    { name: 'Pre-printed NSSP Tags',
      description: 'Pre-printed tags with harvester info; fill in date/area/species.',
      cost: '$0.05-$0.20 each.',
      lifespan: 'Single use.',
      maintenance: 'Order in advance; never run out.' },
    { name: 'Insulated Totes',
      description: 'Heavy-duty plastic totes for cold-chain transport.',
      cost: '$50-$200 each.',
      lifespan: '5-10 years.',
      maintenance: 'Clean + sanitize between uses.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: DAILY OPERATIONS LOG TEMPLATES
  // ───────────────────────────────────────────────────────────
  var DAILY_OPS = [
    { task: 'Pre-trip Safety Check',
      details: 'PFDs accessible + count. Fire extinguisher accessible + charged. VHF on + tested. EPIRB battery green. First aid kit accessible. Float plan filed ashore.',
      time: '10 min before each trip' },
    { task: 'Water Quality Sampling',
      details: 'Deploy probe at standard depths (1m, 3m, 5m typically). Log: time, GPS coords, depth, T, S, DO, pH, Chl-a. Photo of probe reading.',
      time: '15-30 min weekly minimum; daily during heat waves or post-rain' },
    { task: 'Gear Inspection',
      details: 'Sample 5-10 droppers visually. Check anchor lines for chafe. Check buoys for damage. Replace damaged hardware.',
      time: '30-60 min weekly' },
    { task: 'Tumbling Oyster Cages',
      details: 'Cycle each cage: open, redistribute, close. Reduces clumping + biofouling. More frequent in warm season.',
      time: '2-4 hr weekly during growing season' },
    { task: 'Pre-Harvest Tide + Weather Check',
      details: 'NOAA Marine Forecast + tide chart. Confirm safe conditions. Coordinate with buyers.',
      time: '5-10 min before harvest day' },
    { task: 'Harvest Workflow',
      details: 'Pull dropper. Sort + grade onboard. Pack in chilled totes. Transport to shore. Process in walk-in. Tag for customer.',
      time: '4-8 hr per harvest day' },
    { task: 'Sales + Customer Communication',
      details: 'Confirm orders 24-48 hr ahead. Send updates on arrival times. Maintain customer database.',
      time: '15-30 min daily' },
    { task: 'Recordkeeping',
      details: 'Harvest logs (volume, location, time, temperature). NSSP compliance records. Financial tracking.',
      time: '30 min daily' },
    { task: 'Storm Prep (when forecast)',
      details: 'Add anchor scope. Pull at-risk gear. Secure dock + boat. Brief crew. File float plan.',
      time: '4-8 hr before forecasted storm' },
    { task: 'Annual DMR Reporting',
      details: 'Annual harvest report + lease status to DMR. Includes harvest volumes by species + by area + by month.',
      time: '4-8 hr at year-end' },
    { task: 'Permit Renewals',
      details: 'LPA renews every 3 years; standard every 20 years. Track timing carefully.',
      time: 'Document throughout year; finalize at renewal time' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMMON QUESTIONS FROM PUBLIC + CHEFS
  // ───────────────────────────────────────────────────────────
  var FAQ = [
    { question: 'How long do farmed oysters take to grow?',
      answer: '24-36 months from seed to market size. Slower in cold water; faster in warm. Hatchery + nursery is 4-8 months; then grow-out in cages or bags.' },
    { question: 'Are farmed oysters as good as wild oysters?',
      answer: 'Many people prefer farmed: more consistent size + shape, generally cleaner, faster turnover. Wild oysters can have stronger "merroir" character. Both have a place.' },
    { question: 'Are oysters alive when I eat them raw?',
      answer: 'Yes. Live oysters are presumed safe (filter-feed clean water in their natural state + reach you cold). NSSP regulates sanitation. If alive when you shuck = safe.' },
    { question: 'Why are some Maine waters closed to harvest?',
      answer: 'NSSP classifies waters: approved, conditionally approved (rain-triggered closures), restricted, prohibited. Closures protect public health from bacteria + HAB toxins.' },
    { question: 'What is "merroir"?',
      answer: 'Wine\'s "terroir" applied to seafood. The unique flavor profile imparted by specific water conditions (salinity, mineralogy, food). Maine oysters from Damariscotta vs Pemaquid vs Bagaduce taste different.' },
    { question: 'Is salmon aquaculture sustainable?',
      answer: 'Sea-cage salmon has environmental impacts: sea lice transfer to wild fish, disease risk, nutrient pollution, escape genetic risk. Land-based RAS facilities (like Whole Oceans) are climate-resilient + biosecure alternatives.' },
    { question: 'How does kelp aquaculture help the climate?',
      answer: 'Kelp absorbs CO₂ + nutrients while growing. Per acre, kelp can capture as much carbon as a young forest. Nitrogen + nutrient capture also improves water quality.' },
    { question: 'What is "blue carbon"?',
      answer: 'Carbon captured + stored by ocean + coastal ecosystems. Seagrass meadows, salt marshes, mangroves are classic examples. Kelp + shellfish aquaculture are emerging.' },
    { question: 'Are mussels safe to harvest from the wild?',
      answer: 'Only from waters classified as approved by Maine DMR. Otherwise risk of HAB toxins + bacterial contamination. Check before harvest!' },
    { question: 'Why are right whales relevant to aquaculture?',
      answer: 'Vertical mooring lines on aquaculture gear + lobster gear can entangle right whales. New federal rules require ropeless or seasonal-pull gear. Reshaping Maine industry.' },
    { question: 'Why is Maine oyster industry growing while wild populations declined?',
      answer: 'Aquaculture provides controlled conditions + selective breeding + disease resistance. Wild populations were overhauled by 1800s; aquaculture is rebuilding the industry on a different model.' },
    { question: 'What\'s the difference between "littleneck" + "cherrystone" + "chowder"?',
      answer: 'Quahog (hard-shell clam) size grades. Littleneck = smallest (raw bar size, premium). Cherrystone = medium. Chowder = largest (cooking only, lower-priced).' },
    { question: 'Can I start an aquaculture farm without a science degree?',
      answer: 'Yes! Many successful Maine operators learned on the job. Crew first; then LPA. Maine Sea Grant + UMaine + MAA all offer training programs.' },
    { question: 'How does ocean acidification affect Maine shellfish?',
      answer: 'Lower pH makes shell formation harder for larvae (calcium carbonate dissolves). Hatcheries buffer water during shell-forming stages. Selective breeding for tolerance is ongoing research.' },
    { question: 'Why do I see different Maine oyster brands in restaurants?',
      answer: 'Each Maine oyster is named for its specific farm + estuary. Damariscotta = saline + clean; Pemaquid = colder + harder; Bagaduce = a mix. Each has distinct merroir.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SEASONAL TASKS BY SPECIES
  // ───────────────────────────────────────────────────────────
  var SEASONAL_TASKS = [
    { species: 'Mussels',
      spring: 'Pick up + deploy hatchery seed. Sock seed onto droppers.',
      summer: 'Monitor water quality. Manage biofouling. Some early harvests.',
      fall: 'Peak harvest season. Sales + customer communication.',
      winter: 'Pull at-risk gear. Plan next year.' },
    { species: 'Oysters',
      spring: 'Deploy seed. Begin restaurant + market sales.',
      summer: 'Tumble cages. Monitor Vibrio. Peak sales season.',
      fall: 'Continued sales + cage tumbling. Plan year-end.',
      winter: 'Sink cages or sock down for cold-weather protection.' },
    { species: 'Kelp',
      spring: 'HARVEST PEAK. Process + sell.',
      summer: 'Off-season. Repairs + planning. Some seed planning.',
      fall: 'SEED OUT — deploy seeded line in Oct-Nov.',
      winter: 'Growth phase. Monitor for ice + storm damage.' },
    { species: 'Soft-shell Clam',
      spring: 'Town permits + dig season begins.',
      summer: 'Active harvest. Watch for green crab predation.',
      fall: 'Continued harvest before winter.',
      winter: 'Limited harvest; flats often frozen.' },
    { species: 'Scallop',
      spring: 'Monitor + maintain lantern nets.',
      summer: 'Growth phase + biofouling management.',
      fall: 'Continued monitoring.',
      winter: 'Storm protection.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMMON MISTAKES BY FIRST-YEAR FARMERS
  // ───────────────────────────────────────────────────────────
  var COMMON_MISTAKES = [
    { mistake: 'Buying too much seed in Year 1',
      consequence: 'Cash-flow problem; can\'t maintain large stocking density.',
      fix: 'Start small. Plan capacity carefully. Add complexity year-by-year.' },
    { mistake: 'Skipping water-quality monitoring',
      consequence: 'Missed early-warning signs of mortality events.',
      fix: 'Probe at least weekly + log everything. Build calibration into routine.' },
    { mistake: 'Not engaging abutters before application',
      consequence: 'Surprise opposition at public hearing.',
      fix: 'Talk to abutters BEFORE submitting. Address concerns.' },
    { mistake: 'Underestimating storm impact',
      consequence: 'Gear damage; lost stock.',
      fix: 'Storm-rated anchor system. Pre-storm protocols.' },
    { mistake: 'Ignoring NSSP rules',
      consequence: 'License revocation; fines.',
      fix: 'Get HACCP-certified. Subscribe to closure alerts. Document everything.' },
    { mistake: 'Underpricing direct-to-consumer',
      consequence: 'Below-market revenue; can\'t support operation.',
      fix: 'Research D2C market. Story + freshness justify premium.' },
    { mistake: 'Skipping tribal engagement',
      consequence: 'Legal risk + ethical problem.',
      fix: 'Engage tribal nations early in any tribal-claim waters. Listen + adapt.' },
    { mistake: 'Buying outdated equipment',
      consequence: 'Inefficient operations; high maintenance.',
      fix: 'Industry-vetted suppliers; talk to other operators.' },
    { mistake: 'Single-species commitment',
      consequence: 'Catastrophic risk in disease or market downturn.',
      fix: 'Diversify gradually as you grow.' },
    { mistake: 'Skipping insurance',
      consequence: 'Catastrophic financial loss in major event.',
      fix: 'Property + crop + liability insurance. Discuss with MAA.' },
    { mistake: 'Poor business recordkeeping',
      consequence: 'Tax + compliance problems; can\'t track profitability.',
      fix: 'Use simple accounting software from Day 1.' },
    { mistake: 'Not asking for help',
      consequence: 'Costly trial-and-error.',
      fix: 'Maine Aquaculture Association + Sea Grant + UMaine + experienced peers all want you to succeed.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COLD CHAIN + LOGISTICS
  // ───────────────────────────────────────────────────────────
  var COLD_CHAIN = [
    { stage: 'Harvest Boat',
      requirements: 'Insulated coolers with ice. Pre-chilled before harvest if hot day.',
      time_temp: '<45°F within 2-6 hours of harvest (NSSP Vibrio Control Plan windows).',
      challenges: 'Hot summer days narrow the window.',
      cost: 'Insulated totes $50-$200 each; ice $5/bag.' },
    { stage: 'Shore-side Cooler',
      requirements: 'Walk-in cooler 38-45°F. Inspected + HACCP-compliant.',
      time_temp: '<45°F. Logged daily.',
      challenges: 'Power outage = catastrophic loss. Backup generator essential.',
      cost: '$15,000-$50,000 walk-in cooler install.' },
    { stage: 'Packing + Grading',
      requirements: 'Stainless or food-grade plastic surfaces. HACCP-compliant.',
      time_temp: 'Maintain cold during packing.',
      challenges: 'Time-consuming. Quality grading takes skill.',
      cost: '$5,000-$20,000 packing setup.' },
    { stage: 'Tagging',
      requirements: 'Each container gets NSSP-compliant tag (harvester, date, area, species).',
      time_temp: 'N/A',
      challenges: 'Easy to forget; trace-back depends on it.',
      cost: 'Pre-printed tags $0.05-$0.20 each.' },
    { stage: 'Transport',
      requirements: 'Refrigerated van or truck. Insulated boxes with cold packs for shorter trips.',
      time_temp: '<45°F throughout.',
      challenges: 'Long-distance shipping requires temperature data logging.',
      cost: 'Refrigerated van $50K-$80K; insulated box + cold packs $50-$200 per shipment.' },
    { stage: 'Wholesale Receiver',
      requirements: 'HACCP-compliant cooler. Inventory + trace-back system.',
      time_temp: 'Receiver inspection.',
      challenges: 'Receiver may reject shipment if cold-chain broken.',
      cost: 'Receiver business overhead.' },
    { stage: 'Direct-to-Consumer',
      requirements: 'Insulated coolers + cold packs. Often overnight shipping.',
      time_temp: '<45°F arrival.',
      challenges: 'Final-mile delivery; package theft.',
      cost: 'Shipping $30-$60 per box (varies by distance).' },
    { stage: 'Restaurant Receiving',
      requirements: 'Restaurant\'s walk-in cooler.',
      time_temp: '<45°F.',
      challenges: 'Restaurant may want specific size + count.',
      cost: 'Embedded in their kitchen.' },
    { stage: 'Consumer',
      requirements: 'Consumer fridge or live-tank.',
      time_temp: '<45°F; cook within 7 days raw.',
      challenges: 'Consumer education needed.',
      cost: 'Embedded.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: RESTAURANT + CHEF PARTNERSHIPS
  // ───────────────────────────────────────────────────────────
  var RESTAURANT_PARTNERSHIPS = [
    { stage: 'Identifying Chefs',
      detail: 'Local restaurants + chefs who care about sourcing. Read menus + reviews. Visit + introduce yourself.',
      tips: 'Don\'t cold-call during dinner service. Email mid-week.' },
    { stage: 'Sample Delivery',
      detail: 'Bring fresh samples on ice. Educate on your farming method + place.',
      tips: 'Small initial order — let chef try. Free samples are usually welcome.' },
    { stage: 'Pricing Negotiation',
      detail: 'Restaurants pay above wholesale. Typical: 30-50% above wholesale, often weekly invoiced.',
      tips: 'Be flexible early; build relationship; raise prices over time as quality + reliability established.' },
    { stage: 'Order Process',
      detail: 'Establish standing weekly order + flexibility for special requests.',
      tips: 'Use a simple ordering system (Google Sheet, app, email). Confirm orders 24-48 hr ahead.' },
    { stage: 'Delivery Logistics',
      detail: 'Deliver fresh + cold. Pick a time chef requests (often morning before service).',
      tips: 'Cold transport + good packaging. Chefs notice quality.' },
    { stage: 'Quality Issues',
      detail: 'If a shipment arrives below standard, replace it. Cost of relationship.',
      tips: 'Communicate honestly. Quality consistency beats one-time deals.' },
    { stage: 'Marketing Collaboration',
      detail: 'Some chefs feature farm on menu (named oysters). Social media collaborations.',
      tips: 'Provide chef with bio + photos to share with diners.' },
    { stage: 'Special Events',
      detail: 'Oyster festivals, farm-to-table dinners, chef collaborations.',
      tips: 'These build brand + relationships. Worth the time investment.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: CARBON MATH WORKED EXAMPLES
  // ───────────────────────────────────────────────────────────
  var CARBON_EXAMPLES = [
    { example: '1 acre LPA mussel farm — annual nitrogen capture',
      math: '~5,000 lb of mussel harvest per acre. Each lb contains ~0.5% nitrogen by weight. So 5,000 × 0.005 = 25 lb of nitrogen removed from water per acre per year.',
      context: 'Long Island Sound prices this at $100-$1000/lb = $2,500-$25,000 of nutrient-removal value per acre per year. Mostly uncompensated; emerging credit markets.',
      cite: 'Bricker et al. 2014' },
    { example: '1 acre kelp farm — annual carbon capture',
      math: '~10,000 lb dry-weight kelp per acre. Kelp is ~30% carbon by dry weight. So 10,000 × 0.30 = 3,000 lb (~1.4 tons) of carbon fixed per acre per year.',
      context: 'Equivalent to ~5 tons CO₂. Carbon credit value at $50/ton = $250 per acre. Storage fate depends on use.',
      cite: 'NOAA blue carbon' },
    { example: 'Carbon footprint comparison',
      math: '1 kg edible mussel meat ≈ 1 kg CO₂e from production. 1 kg edible beef ≈ 25 kg CO₂e. So mussels = 25× lower carbon per kg protein.',
      context: 'Eating Maine mussels instead of beef is a meaningful climate choice.',
      cite: 'Hilborn et al. 2018; Carbon Trust' },
    { example: 'Oyster nitrogen filtration',
      math: '1 oyster filters ~50 L water/day. 1 oyster × 365 days = 18,250 L/yr. 100,000 oysters = 1.8 billion L/yr.',
      context: 'A working oyster farm can filter the volume of a small lake annually.',
      cite: 'Newell 2004 Coast. Estuar. Res. Federation' },
    { example: 'Wholesale vs D2C revenue',
      math: '$100,000 wholesale revenue. Switch 50% to D2C at 2× price = $50K + $100K = $150K. 50% increase by selling half D2C.',
      context: 'Direct-to-consumer doubles per-unit price. Worth the time + logistics if scale supports.',
      cite: 'Maine Aquaculture Association' },
    { example: 'LPA payback period',
      math: 'Startup: $25,000 capital. Year 1: $0 revenue. Year 2: $20K gross. Year 3: $35K gross. Total Y1-3: $55K gross before costs. Net of ~$30-40K after fuel + maintenance. Payback by end Year 3.',
      context: 'Plan for 2-3 year payback minimum on LPA mussel farm. Plan for longer on oyster (24-36 month grow-out).',
      cite: 'Maine Aquaculture Association financial models' },
    { example: 'Hatchery throughput',
      math: '1 spawn event of broodstock can produce 100M eggs. Survival to spat: ~0.1%. So 100M × 0.001 = 100,000 spat. Hatcheries typically produce 50-200M spat per year by combining spawns.',
      context: 'Bottlenecks: tank space + algae food + setting success. Hatcheries plan months in advance.',
      cite: 'Mook Sea Farms operating data (estimates)' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: ADDITIONAL LESSON PLANS
  // ───────────────────────────────────────────────────────────
  var EXTRA_LESSON_PLANS = [
    { id: 'lp-7', title: 'Kindergarten: Find a Mussel (45 min, EL Education Adventure)',
      grade: 'K-2', subject: 'Place-Based Adventure',
      objectives: ['Identify mussels in the intertidal', 'Practice careful observation', 'Begin understanding ecosystem connections'],
      materials: ['Trip to a Maine beach at low tide', 'Hand lens', 'Field journal'],
      flow: '10 min walk to beach + safety briefing → 25 min observation + sketching → 10 min sharing what we noticed.',
      assessment: 'Drawing + 1-sentence description.',
      crosscuts: ['Science: observation skills', 'EL: place-based learning'] },
    { id: 'lp-8', title: 'Grade 3-5: Build a Mini-Hatchery Aquarium',
      grade: '3-5', subject: 'Science',
      objectives: ['Understand life cycle of mussel + oyster', 'Practice water-quality measurement', 'Maintain a living system over time'],
      materials: ['Classroom aquarium', 'YSI starter kit', 'Hatchery-donated spat or wild larvae (with permits)', 'Algae feed'],
      flow: 'Week 1: setup. Week 2-12: daily care + data collection. End: present findings.',
      assessment: 'Lab notebook + final presentation.',
      crosscuts: ['Biology', 'Math (graphs of growth)', 'Responsibility'] },
    { id: 'lp-9', title: 'Grade 9-12: Aquaculture Policy Simulation',
      grade: '9-12', subject: 'Civics + Policy',
      objectives: ['Apply public-hearing procedure to a contested lease', 'Develop persuasive arguments from multiple perspectives', 'Understand tribal sovereignty considerations'],
      materials: ['Mock case file (provided)', 'Role assignments', 'Time keeper'],
      flow: 'Class 1: 90 min — case + role research. Class 2: 90 min — mock hearing. Class 3: 90 min — analysis + writing.',
      assessment: 'Stakeholder advocacy memo + classroom hearing performance.',
      crosscuts: ['Civics', 'Communication', 'Ethics', 'Tribal sovereignty'] },
    { id: 'lp-10', title: 'Grade 9-12: Business Plan Workshop',
      grade: '9-12', subject: 'Business + Economics',
      objectives: ['Draft a complete aquaculture business plan', 'Calculate startup costs + revenue projections', 'Identify risk factors + mitigations'],
      materials: ['Business plan template', 'Cost data', 'Spreadsheet template'],
      flow: '2-week multi-class project. Independent work + group review + revision.',
      assessment: 'Final business plan document.',
      crosscuts: ['Business', 'Math', 'Communication'] },
    { id: 'lp-11', title: 'Grade 4-8: Wabanaki Shellfish Story (60 min)',
      grade: '4-8', subject: 'Maine Indian Education (LD 291)',
      objectives: ['Learn about Wabanaki shellfish heritage', 'Understand connection between Indigenous food + waterways', 'Recognize tribal sovereignty + ongoing rights'],
      materials: ['AquacultureLab Wabanaki tab', 'Wabanaki REACH curriculum (or guest speaker)', 'Map of Maine + Wabanaki territories'],
      flow: '10 min intro → 25 min content (Wabanaki tab + REACH materials) → 20 min discussion + reflection → 5 min closure.',
      assessment: 'Reflection paragraph or art project.',
      crosscuts: ['Maine Indian Education', 'History', 'Geography', 'Ecology'] },
    { id: 'lp-12', title: 'Aquaculture STEM Career Fair (full school day)',
      grade: '6-12', subject: 'Career Awareness',
      objectives: ['Meet local aquaculture professionals', 'Explore career pathways', 'Build connections + mentorship opportunities'],
      materials: ['Speakers (5-10 from MAA + Maine Sea Grant + tribal aquaculture initiatives)', 'Career profile handouts', 'Tour buses if including farm visit'],
      flow: 'Half-day rotating-speaker stations. Half-day farm field trip.',
      assessment: 'Reflection + 1-page career-interest letter.',
      crosscuts: ['Career awareness', 'Multiple disciplines'] }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE NEWS + CURRENT EVENTS TOPICS
  // ───────────────────────────────────────────────────────────
  var CURRENT_EVENTS = [
    { topic: 'Tribal Sovereignty + Aquaculture',
      summary: 'Ongoing legal + policy conversations about tribal rights in Maine coastal waters. New tribally-led aquaculture initiatives emerging.',
      sources: 'Penobscot Nation, Passamaquoddy Tribe websites; Press Herald reporting; Maine-Wabanaki Commission' },
    { topic: 'Right Whale + Lobster Gear',
      summary: 'New federal rules on lobster gear (ropeless or seasonal closures) to protect critically-endangered N Atlantic right whale (~340 individuals). Reshaping industry.',
      sources: 'NOAA Office of Protected Resources; Maine Lobstermen\'s Association' },
    { topic: 'Climate-Driven Range Shifts',
      summary: 'Black sea bass + summer flounder reliably in Maine waters now. Cold-water species (lobster, mussel, kelp) potentially shifting north over time.',
      sources: 'NEFSC + GMRI + Pershing 2015' },
    { topic: 'Land-Based RAS Expansion',
      summary: 'Whole Oceans (Bucksport) under construction. Could revive Maine\'s salmon industry in climate-resilient form.',
      sources: 'Whole Oceans; Penobscot Bay Pilot' },
    { topic: 'Working Waterfront Preservation',
      summary: 'Maine\'s working waterfront infrastructure (docks, processing) declining due to coastal gentrification. State-level program protects critical sites.',
      sources: 'Island Institute; Maine Working Waterfront Coalition' },
    { topic: 'Carbon Credit Markets',
      summary: 'Aquaculture (esp. kelp + bivalves) emerging as potential credit-generating activity. Methodologies still under development.',
      sources: 'NOAA blue carbon; Maine Sea Grant; UMaine research' },
    { topic: 'OsHV-1 Pacific Oyster Virus',
      summary: 'Continuing global outbreaks. Maine\'s eastern oyster industry appears resistant. Vigilance critical.',
      sources: 'FAO; FDA; Maine DMR' },
    { topic: 'Climate Adaptation + Selective Breeding',
      summary: 'UMaine + Bigelow + others researching disease + heat + acidification resistance through selective breeding + genomics.',
      sources: 'UMaine CCAR; Bigelow Lab' },
    { topic: 'Sustainable Seafood Labeling',
      summary: 'Multiple certifications (BAP, ASC, Seafood Watch) increasingly important for retail premium. Maine bivalves consistently rate "Best Choice."',
      sources: 'Monterey Bay Aquarium Seafood Watch; BAP; ASC' },
    { topic: 'Public Hearing Controversies',
      summary: 'Several high-profile recent standard-lease hearings have drawn opposition. Process is evolving; tribal engagement increasingly part of conversation.',
      sources: 'Press Herald; Bangor Daily News; DMR public hearing transcripts' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: HATCHERY EQUIPMENT + COSTS
  // ───────────────────────────────────────────────────────────
  var HATCHERY_GEAR = [
    { item: 'Conditioning tanks (insulated fiberglass, 200-2000 L each)',
      purpose: 'Hold broodstock for 6-10 wk gonad ripening at controlled temperature.',
      typical: '$2,000-$8,000 each.', notes: 'Multiple tanks allow staggered spawn timing.' },
    { item: 'Spawning tanks (large, easy-cleaning)',
      purpose: 'Hold gametogenically-ready adults during induced spawn.',
      typical: '$3,000-$10,000.', notes: 'Often modified bivalve culture tanks.' },
    { item: 'Larval tanks (200-3000 L glass + fiberglass)',
      purpose: 'Rear larvae through D-stage → setting.',
      typical: '$1,500-$8,000 each.', notes: 'Multiple cohorts simultaneously.' },
    { item: 'Setting tanks (with cultch substrate)',
      purpose: 'Facilitate metamorphosis from larval → spat.',
      typical: '$1,000-$5,000.', notes: 'Hard for first-timers; many die at this stage.' },
    { item: 'Algae culture system (CO₂-bubbled + lit, multiple species)',
      purpose: 'Produce live algae feed for larvae.',
      typical: '$15,000-$80,000.', notes: 'Critical investment; algae crash = larvae die.' },
    { item: 'Water treatment (UV sterilizer + sand filter + degasser)',
      purpose: 'Clean intake seawater. Critical for biosecurity + larval survival.',
      typical: '$25,000-$100,000+.', notes: 'Quality of water treatment determines hatchery success.' },
    { item: 'Salinity + temperature controls (heat exchangers, chillers)',
      purpose: 'Maintain specific temperature + salinity regimes.',
      typical: '$30,000-$100,000.', notes: 'Energy-intensive; ongoing operating cost.' },
    { item: 'pH buffering (CO₂ scrubber, sodium carbonate dosing)',
      purpose: 'Counter ocean acidification effects during shell formation.',
      typical: '$10,000-$50,000.', notes: 'Necessary in Gulf of Maine waters now.' },
    { item: 'Microscopy + lab equipment',
      purpose: 'Sample larvae + spat for size + survival assessment.',
      typical: '$5,000-$30,000.', notes: 'Daily monitoring requires this.' },
    { item: 'Backup power + alarms',
      purpose: 'Generator + automatic switch-over for power outages. Alarms for water-quality excursions.',
      typical: '$10,000-$40,000.', notes: 'Power outage = catastrophic loss of larvae.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: NSSP RULES IN DETAIL
  // ───────────────────────────────────────────────────────────
  var NSSP_RULES = [
    { rule: 'Water Quality Classification',
      detail: 'States classify shellfish waters by sampling fecal coliform bacteria + assessing risk factors (sewage outfalls, septic systems, runoff). 4 classifications: Approved, Conditionally Approved, Restricted, Prohibited. Maine\'s waters mapped + updated.',
      practical: 'Check Maine DMR shellfish sanitation map before harvesting. Plan around closures.' },
    { rule: 'Tagging Requirements',
      detail: 'Every shellfish container at harvest must carry a tag with: harvester license, harvest date, harvest area, species. Tag stays with product all the way to retail consumer.',
      practical: 'Pre-printed tags available from approved suppliers. Tag MUST stay attached + legible.' },
    { rule: 'Time + Temperature Control',
      detail: 'Live shellfish must reach ≤45°F (refrigeration) within strict time-from-harvest windows. Hot day = shorter window. Maine has Vibrio Control Plan specifying allowed time-temperatures.',
      practical: 'Boats need ice + insulated coolers. Shore facilities need walk-in coolers.' },
    { rule: 'Handler Certification',
      detail: 'Commercial harvesters + processors require HACCP-style food safety training. Maine offers approved courses.',
      practical: 'Training programs by Maine Sea Grant, UMaine, industry partners.' },
    { rule: 'Recordkeeping',
      detail: 'Daily harvest logs (volume, location, time, temperature). Trace-back-able records maintained for 90+ days.',
      practical: 'Many farmers use spreadsheet or dedicated software.' },
    { rule: 'Wet Storage',
      detail: 'Live shellfish in flowing seawater between harvest + sale. NSSP defines water quality + tank requirements.',
      practical: 'Some farms have own wet storage; others rent.' },
    { rule: 'Depuration',
      detail: 'Holding in UV-sterilized seawater for 48+ hours to purge contaminants. Used for restricted-water harvest. Regulated facility process.',
      practical: 'Specific tank designs + flow rates + monitoring required.' },
    { rule: 'Relay',
      detail: 'Moving shellfish from contaminated to clean waters + letting them naturally filter clean. Alternative to depuration.',
      practical: 'Approved relay sites only. Time-limited.' },
    { rule: 'Closures + Reopenings',
      detail: 'DMR issues + lifts closures based on routine monitoring + event-triggered sampling (rain, HAB).',
      practical: 'Subscribe to DMR closure alerts (SMS, email).' },
    { rule: 'Vibrio Control',
      detail: 'Summer-specific time-temperature rules to prevent Vibrio parahaemolyticus growth in shellfish (especially oysters). Hot day = stricter timing.',
      practical: 'Plan harvest in early morning during heat waves.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: PERMIT WORKFLOW STEP-BY-STEP (LPA)
  // ───────────────────────────────────────────────────────────
  var PERMIT_WORKFLOW = [
    { step: '1. Pre-application research',
      action: 'Review DMR LPA rules + chart of existing leases. Visit + photograph proposed site.',
      time: '2-4 weeks',
      cost: 'Time only.' },
    { step: '2. Site selection',
      action: 'Apply site-selection criteria (12-factor checklist). Talk to neighbors + town officials.',
      time: '2-6 weeks',
      cost: 'Time + potentially survey costs.' },
    { step: '3. Application preparation',
      action: 'Complete DMR LPA application form. Include site description, business plan summary, anchor + gear specs.',
      time: '1-2 weeks',
      cost: '$50 application fee.' },
    { step: '4. DMR review',
      action: 'DMR aquaculture coordinator reviews application; may request clarifications. Site visit to confirm boundaries + suitability.',
      time: '2-4 months',
      cost: 'No direct cost; respond to requests.' },
    { step: '5. Decision',
      action: 'DMR issues 3-year LPA with conditions (boundaries, gear specs, marking).',
      time: 'End of review',
      cost: 'Annual fee ~$200-$500.' },
    { step: '6. Compliance',
      action: 'Comply with conditions; submit annual reports.',
      time: 'Ongoing',
      cost: 'Time + administrative cost.' },
    { step: '7. Renewal',
      action: 'Renew at 3-year intervals (LPA) or move to standard lease tier.',
      time: '3 years out from initial issue',
      cost: 'Annual fee + potential survey.' },
    { step: 'Standard lease difference',
      action: 'Standard leases (up to 100 acres, 20 years) require: public hearing, environmental assessment, full business plan. Months-longer process.',
      time: '6-18+ months total',
      cost: '$500-$2000+ application fees + legal + survey + hearing prep.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE EXAM REVIEW + REGULATIONS
  // ───────────────────────────────────────────────────────────
  var REGS_DETAIL = [
    { topic: 'License Tiers',
      summary: 'LPA (Limited Purpose), Standard, Experimental. Each tier has different size limits + duration + permitting requirements.',
      key_rule: 'Maine state aquaculture leases overseen by DMR. Federal waters (>3 nm) under NOAA + BOEM.' },
    { topic: 'Public Hearing',
      summary: 'Standard + experimental leases require public hearing.',
      key_rule: 'Engage abutters before hearing. Hearing run by DMR adjudicator.' },
    { topic: 'Gear Marking',
      summary: 'All aquaculture gear must be marked with identifying tags + color codes.',
      key_rule: 'Marine Patrol enforces marking rules.' },
    { topic: 'Environmental Compliance',
      summary: 'Lease must not significantly impact: navigation, public access, water quality, eelgrass, riparian rights, traditional fishing use, sensitive habitat.',
      key_rule: 'Site-specific. Document everything.' },
    { topic: 'Reporting Requirements',
      summary: 'Annual harvest reports + lease-status reports to DMR.',
      key_rule: 'Non-compliance can result in lease revocation.' },
    { topic: 'Tribal Engagement',
      summary: 'In tribal-claim waters, engage tribal authorities. Some leases may require tribal-government consent.',
      key_rule: 'Maine Indian Implementing Act + ongoing legal interpretation.' },
    { topic: 'Right-Whale Compliance',
      summary: 'NOAA right-whale closures + gear modifications apply to aquaculture (esp. salmon).',
      key_rule: 'Check NOAA right-whale alerts; deploy compliant gear.' },
    { topic: 'Working Waterfront',
      summary: 'Maine\'s Working Waterfront Access Protection Program protects commercial fishing + aquaculture infrastructure.',
      key_rule: 'Conservation easement option for retention.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: WATER QUALITY THRESHOLDS BY SPECIES
  // ───────────────────────────────────────────────────────────
  var WQ_THRESHOLDS = [
    { species: 'Blue Mussel',
      temp_range: '5-22°C optimal; >22°C stress',
      salinity_range: '20-32 PSU',
      DO_min: '5 mg/L (4 mg/L stress)',
      pH_range: '7.8-8.2',
      stress_indicators: 'Slow growth, mortality, abnormal molting (rare in bivalves but observable as shell defects).' },
    { species: 'Eastern Oyster',
      temp_range: '10-30°C tolerant; optimal 18-25°C',
      salinity_range: '14-30 PSU (very tolerant)',
      DO_min: '5 mg/L',
      pH_range: '7.5-8.3',
      stress_indicators: 'Slow growth, watery meats, summer mortality.' },
    { species: 'Sugar Kelp',
      temp_range: '0-15°C; >15°C die-off',
      salinity_range: '25-35 PSU',
      DO_min: 'Not relevant (autotroph)',
      pH_range: '7.8-8.4',
      stress_indicators: 'Premature sloughing, bryozoan fouling, frayed edges.' },
    { species: 'Sea Scallop',
      temp_range: '4-12°C',
      salinity_range: '28-34 PSU',
      DO_min: '5 mg/L',
      pH_range: '7.8-8.2',
      stress_indicators: 'Reduced growth (slow already), shell deformities, mortality.' },
    { species: 'Soft-shell Clam',
      temp_range: 'Tolerates wide range',
      salinity_range: '15-32 PSU (estuarine)',
      DO_min: '4 mg/L (tolerates lower briefly)',
      pH_range: '7.5-8.3',
      stress_indicators: 'Shell defects, slow growth, predation vulnerability.' },
    { species: 'Quahog (hard-shell clam)',
      temp_range: '8-25°C',
      salinity_range: '20-32 PSU',
      DO_min: '4 mg/L',
      pH_range: '7.5-8.3',
      stress_indicators: 'Shell defects, slow growth.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: SPECIES DEEP DIVES (multi-paragraph essays)
  // ───────────────────────────────────────────────────────────
  var SPECIES_DEEP_DIVES = [
    { id: 'mussel-deep', name: 'Blue Mussel (Mytilus edulis) — Deep Dive',
      taxonomy: 'Phylum Mollusca, Class Bivalvia, Family Mytilidae. Maine\'s premier aquaculture mussel species. Native + wild populations also harvested.',
      lifeHistory: 'Spawn in spring + early summer (water 10-15°C). Massive gamete release. Eggs + sperm meet in water; free-swimming larvae for 3-4 weeks; settle as "spat" with byssal threads onto suitable substrate. Maturity at 1-2 years. Lifespan 5-15+ years.',
      biology: 'Byssal threads (anchoring proteins) secreted from gland in foot. Threads cement to substrate; can release + reattach. Filter-feeds phytoplankton + organic particles. ~50-100 L water filtered per day per adult. Highly efficient ecosystem service.',
      aquaculture: 'Rope-culture method standard in Maine. Hatchery-supplied or wild-set spat tied to sock (mesh tube) wound around dropper line. Mussels attach via byssal threads + grow. 18-24 month grow-out.',
      market: 'Maine market: wholesale $1.50-$3.50/lb; D2C up to $4-$8/lb. Premium-priced for Maine cold-water terroir. Bagaduce River + Penobscot Bay = world-class names.',
      stressors: 'Heat events (>22°C), HAB closures, ice damage, eider duck predation, biofouling, ocean acidification on larvae.',
      stewardship: 'Climate-positive food system. Filter feeders improve water quality. Aim for diversified portfolio (mussel + kelp + oyster) for resilience.',
      cite: 'Maine DMR + Maine Aquaculture Association' },
    { id: 'oyster-deep', name: 'Eastern Oyster (Crassostrea virginica) — Deep Dive',
      taxonomy: 'Phylum Mollusca, Class Bivalvia, Family Ostreidae. THE oyster of US Atlantic coast.',
      lifeHistory: 'Spawn summer (water 18-25°C). Massive gamete release; fertilization in water column; planktonic larvae 2-3 weeks; settle as "spat" on cultch (old shell). Sequential hermaphrodite (males first, females later). Mature at 2-3 years.',
      biology: 'Filter feeder. ~50-100 L water/day per adult. Reef-building species in wild — historic Maine + Chesapeake oyster reefs were vast.',
      aquaculture: 'Multiple culture methods: bag-on-bottom, rack-and-bag, floating cage, suspended cages, lantern nets. Maine premium: floating cage with tumbling. 24-36 month grow-out for premium-size oysters.',
      market: 'Maine market: wholesale $0.30-$0.60/oyster; restaurant + farmers market $1-$5/oyster. Damariscotta + Pemaquid + Glidden Point = brand names that command premium.',
      stressors: 'MSX + Dermo disease (less in cold Maine waters), Polydora blister worm (manageable), oyster herpes virus (OsHV-1, doesn\'t affect eastern oyster — Pacific oyster only), ocean acidification on larvae.',
      stewardship: 'Reef-restoration efforts (Damariscotta River Restoration). Climate-positive. Aquaculture revitalizing this once-dominant species.',
      cite: 'Mook Sea Farms + NOAA + Maine Aquaculture Association' },
    { id: 'kelp-deep', name: 'Sugar Kelp (Saccharina latissima) — Deep Dive',
      taxonomy: 'Phylum Heterokontophyta. Brown algae. Maine\'s primary aquaculture kelp species.',
      lifeHistory: 'Spores released in fall; settle + grow into haploid gametophytes; gametophytes produce eggs + sperm; sporophyte (the kelp we know) grows rapidly through winter; matures spring; releases spores. ANNUAL crop in Maine aquaculture cycle.',
      biology: 'Photosynthesizes CO₂ + nutrients into biomass. Grows 1-3 m in one season. Massive carbon + nitrogen capture during growth. Climate-positive food.',
      aquaculture: 'Seeded (microscopic gametophyte stage) onto longline rope in fall. Grows through winter. Harvest April-May before warming water triggers degradation. Cooperative model with Atlantic Sea Farms common.',
      market: 'Maine market: $0.50-$2.00/lb fresh wholesale; specialty products (kelp pasta, salsa, frozen) at premium D2C. Emerging industry; demand growing for climate-friendly food.',
      stressors: 'Warming spring water (early die-off), biofouling by bryozoans late in season, epiphytes, storms during winter.',
      stewardship: 'Climate-positive crop. Helps farmers diversify away from declining cod + into resilient new industry. Cooperative model lowers entry barrier.',
      cite: 'Atlantic Sea Farms + Maine Sea Grant + UMaine' },
    { id: 'scallop-deep', name: 'Sea Scallop + Bay Scallop — Deep Dive',
      taxonomy: 'Phylum Mollusca, Class Bivalvia, Family Pectinidae. Sea scallop (Placopecten magellanicus) is Maine\'s primary wild + aquaculture scallop; bay scallop (Argopecten irradians) is southern species.',
      lifeHistory: 'Spawn spring-summer. Sequential hermaphrodite (males first, females later). Pelagic larvae; settle on hard substrate. Maturity at 2-4 years. Slow growth — sea scallop takes 5+ years to commercial size.',
      biology: 'Filter feeders. Have eyes around the mantle (~60-100 in some scallops). Swim by clapping shells. Famous adductor muscle (the meat) is what we eat.',
      aquaculture: 'Hokkaido-style hanging-line aquaculture. Lantern nets (stacked disc-shaped chambers). Slow growth = long capital tie-up. Premium value when reached.',
      market: 'Sea scallop $25-$45/lb meats; roe-on premium. Bay scallop $18-$30/lb. Aquaculture-produced scallops are emerging specialty.',
      stressors: 'Slow growth (long capital tie-up), starfish predation, storm damage to gear, larval acidification stress.',
      stewardship: 'Aquaculture can supplement wild fisheries; long-cycle commitment means it\'s a multi-generational investment.',
      cite: 'NOAA + Bigelow Lab' },
    { id: 'softshell-deep', name: 'Soft-shell Clam (Mya arenaria) — Deep Dive',
      taxonomy: 'Phylum Mollusca, Class Bivalvia, Family Myidae. Maine\'s iconic "steamer" clam.',
      lifeHistory: 'Spawn spring-summer. Pelagic larvae 2-3 weeks; settle in soft sediment. Buried in mudflats with siphon to surface. Maturity at 2-3 years. Reaches legal harvest size at 3-4 years.',
      biology: 'Filter feeder via siphon. Burrowing — protected from most predators by depth. But green crabs dig + eat young clams.',
      aquaculture: 'Mostly wild harvest. Town-managed flats with local clam committees. Aquaculture trials (Heritage Shellfish Hatchery, others). Bottom culture in protected flats.',
      market: 'Maine market: $200-$400/bushel wholesale. Steamer clam is regional culinary anchor.',
      stressors: 'GREEN CRAB INVASION (devastating juvenile clams). Climate warming reducing winter ice + extending green crab activity. Shoreline erosion. Algal closures.',
      stewardship: 'Town committees + state DMR co-manage. Restoration via aquaculture seed + green crab removal. Cultural + economic anchor in many Maine towns.',
      cite: 'Maine DMR shellfish + Maine Sea Grant' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: PRACTICAL TECHNIQUES + SEAMANSHIP (aquaculture)
  // ───────────────────────────────────────────────────────────
  var TECHNIQUES = [
    { skill: 'Site Walk-Through',
      details: 'Before submitting any lease application, walk + boat the proposed site multiple times. Note tides, currents, fetch, neighbor activity. Take measurements at different times.',
      mistake: 'Assuming based on a single visit. Sites look different at different tides + seasons.',
      practice: 'Do this annually for established farms — sites change.' },
    { skill: 'Calibrating Water-Quality Probes',
      details: 'YSI + similar probes require calibration with standard solutions monthly. Salinity = saltwater (35 PSU) + freshwater (0 PSU). DO = water-saturated air or zero-DO solution. pH = buffer 7 + buffer 10.',
      mistake: 'Skipping calibration; using out-of-date solutions.',
      practice: 'Build calibration into monthly maintenance schedule.' },
    { skill: 'Mussel Sock Deployment',
      details: 'Pre-seeded mussel sock (mesh tube) is wrapped around dropper line + tied at top + bottom. Spat anchor with byssal threads within days. Sock material breaks down + falls away as mussels grow.',
      mistake: 'Wrapping too loose (spat fall off) or too tight (limits flow + growth).',
      practice: 'Practice on land first. Get rhythm + speed.' },
    { skill: 'Oyster Tumbling',
      details: 'Oysters in floating cages are tumbled (manually flipped or auto-rotated) periodically. Disrupts mud-blister worm settlement + breaks apart clumps + produces deeper-cupped uniform oysters.',
      mistake: 'Skipping tumbling; tumbling at wrong life-stage; over-tumbling (stress).',
      practice: 'Develop a tumbling schedule based on growth + biofouling pressure.' },
    { skill: 'Storm Prep',
      details: 'Before forecasted storm: increase anchor scope, pull at-risk surface gear, secure deck items, check bilge pumps, top off fuel, file float plan ashore, brief crew on storm tactics.',
      mistake: 'Underestimating storm forecast; leaving things to the last minute.',
      practice: 'Develop a checklist; execute it routinely.' },
    { skill: 'Harvest Day Workflow',
      details: 'Plan for: pre-harvest probe + tide check, gear pull, sorting + grading on boat, transport in chilled totes, packaging in shore facility, customer notification + delivery. Time-temperature critical for vibrio control.',
      mistake: 'Skipping cooling step; mixing harvest + processed product.',
      practice: 'Time your harvest cycle + optimize.' },
    { skill: 'Hatchery Larval Care',
      details: 'Daily water changes (or continuous flow). Monitor temperature + salinity + DO + pH. Feed algae at appropriate density. Sample for size + survival.',
      mistake: 'Letting one parameter drift; insufficient food (slow growth) or excess food (degraded water).',
      practice: 'Train extensively before doing it solo. Get certified.' },
    { skill: 'Mooring Block Deployment',
      details: 'Setting a multi-ton mushroom anchor: barge with crane, position over chosen GPS coords, lower gently to bottom. Mark with surface buoy + label.',
      mistake: 'Setting in wrong substrate; insufficient marking.',
      practice: 'Contract with experienced mooring outfit for first installations.' },
    { skill: 'Working in Cold Water',
      details: 'Dry suits or chest waders required for in-water work. Layered clothing under. Limit immersion to 30 min max in winter waters.',
      mistake: 'Pushing through cold without warmth breaks; underdressing.',
      practice: 'Cold-water training + buddy system.' },
    { skill: 'Marketing Pitch',
      details: 'Develop a 30-second elevator pitch for your product. Story (family, place, sustainability), proof (certifications, awards), call-to-action.',
      mistake: 'Generic pitch; no specific call-to-action.',
      practice: 'Practice at farmers market every week. Refine based on customer questions.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: AQUACULTURE SCENARIOS (decision-tree exercises)
  // ───────────────────────────────────────────────────────────
  var SCENARIOS = [
    { id: 'scenario-1', title: 'HAB Closure in Peak Sales Week',
      situation: 'October. Your mussels are ready. You have 200 lbs of restaurant orders. DMR issues PSP closure at 5pm Friday.',
      options: [
        '1. Notify restaurants immediately; offer alternative supplier referral.',
        '2. Hold mussels in flow-through tank; wait for reopening; risk delayed delivery.',
        '3. Try to harvest before alert spreads (ILLEGAL — federal crime).',
        '4. Move to depuration facility (if available + classification allows).'
      ],
      best: 'Option 1: be transparent with customers immediately. They\'ll respect honesty + return when reopened.',
      worst: 'Option 3: never. License + criminal consequences + you poison customers.',
      lesson: 'Plan for HAB risk. Build customer relationships that survive disruptions.' },
    { id: 'scenario-2', title: 'Abutter Threatens to Sue Over Lease Hearing',
      situation: 'Your standard-lease application is at hearing in 4 weeks. Wealthy abutter has hired attorney; threatens lawsuit over "view obstruction."',
      options: [
        '1. Reduce lease boundaries to address sight-line concerns.',
        '2. Hold firm; respond at hearing with rendered sight-line analysis.',
        '3. Withdraw application.',
        '4. Talk privately with abutter; explore compromise.'
      ],
      best: 'Option 4: try direct conversation first. If fails, Option 2 with strong evidence at hearing.',
      worst: 'Option 3: don\'t withdraw if you have legitimate plan + science behind you.',
      lesson: 'Public hearings reward preparation. Privately-resolved concerns make for shorter hearings.' },
    { id: 'scenario-3', title: 'Storm Damage Mid-Growout',
      situation: 'Nor\'easter destroys 40% of your mussel droppers. 9 months from harvest. Insurance coverage limited.',
      options: [
        '1. Re-deploy with limited remaining seed; smaller harvest in 9 months.',
        '2. Buy emergency seed; re-deploy at full capacity.',
        '3. Use insurance payout to pay debts + downsize permanently.',
        '4. Sell what survives early as undersized (market-discounted).'
      ],
      best: 'Mix of 1 + 2 based on cash flow. Many farmers survive storm damage by adapting capacity rather than expanding.',
      worst: 'Option 3 if recovery is possible. Don\'t exit prematurely.',
      lesson: 'Build insurance + cash reserves before scaling. Storm events are routine in Maine.' },
    { id: 'scenario-4', title: 'Climate-Driven Site Decision',
      situation: 'Your 5-acre lease has marginal salinity + temperature trends over 5 years. New 10-acre lease available 3 miles north (cooler, fresher water).',
      options: [
        '1. Stay; bet on selective breeding to adapt.',
        '2. Apply for new lease; phase out old over 3 years.',
        '3. Buy time with deeper droppers + thermal-tolerant strains.',
        '4. Diversify species at current site.'
      ],
      best: 'Option 2 if waitlist permits. Climate trends shape long-term decisions.',
      worst: 'Option 1 ignoring trend data. Adaptation is real industry need.',
      lesson: 'Watch trends, not single years. Plan 5-10 years out.' },
    { id: 'scenario-4b', title: 'Disease Outbreak in Hatchery',
      situation: 'You\'re a hatchery operator. Spat are dying at unusually high rate. Suspect MSX or OsHV outbreak.',
      options: [
        '1. Continue + hope for the best.',
        '2. Quarantine immediately; tests through Maine DMR + Bigelow Lab.',
        '3. Sell remaining stock fast before more die.',
        '4. Depopulate + disinfect entire facility.'
      ],
      best: 'Option 2: rapid response + diagnostics. Maine DMR has rapid pathology turnaround.',
      worst: 'Option 3: selling diseased stock spreads outbreak + violates regulations.',
      lesson: 'Biosecurity + early detection are core to hatchery operations. Maintain professional relationships with diagnostic labs.' },
    { id: 'scenario-4c', title: 'Multi-Species Diversification',
      situation: 'Your 2-acre lease has good mussel + oyster + kelp potential. You\'re considering all three.',
      options: [
        '1. Stick with mussels — they\'re your expertise.',
        '2. Add kelp (winter cycle) for income diversification.',
        '3. Add kelp + oysters (multi-species).',
        '4. Switch entirely to oysters (higher per-unit price).'
      ],
      best: 'Option 2 or 3: diversification reduces risk + smooths seasonal cash flow. Don\'t bet everything on one species.',
      worst: 'Option 4 if it means abandoning working mussel knowledge before learning oysters.',
      lesson: 'Diversification is climate adaptation. Add new species gradually; maintain expertise base.' },
    { id: 'scenario-4d', title: 'Right Whale Closure',
      situation: 'NOAA announces seasonal closure of your lease area for right whale protection. You have gear in the water.',
      options: [
        '1. Retrieve gear immediately.',
        '2. Convert to ropeless gear (if you have it ready).',
        '3. Ignore the closure (significant legal risk).',
        '4. Petition for exemption.'
      ],
      best: 'Option 1 or 2. Comply with regulations + adapt operations long-term.',
      worst: 'Option 3: federal enforcement is aggressive. Risk = license loss + criminal charges.',
      lesson: 'Right whale rules are reshaping Maine industry. Plan operations to handle seasonal closures.' },
    { id: 'scenario-5', title: 'Tribal Engagement on New Lease',
      situation: 'Your proposed lease site is in waters with Wabanaki traditional + claimed harvest rights.',
      options: [
        '1. Engage tribal representatives directly before submitting application; co-design.',
        '2. Submit application; respond to any concerns raised.',
        '3. Wait until next year + research more.',
        '4. Drop the site.'
      ],
      best: 'Option 1: tribal engagement BEFORE submission is essential. Some sites are inappropriate; others are collaborative opportunities.',
      worst: 'Option 2: rolling over tribal rights is both unethical + often unviable.',
      lesson: 'Sovereignty is a real legal + ethical principle. Build relationships first.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: TOP TEN AQUACULTURE FAILURE MODES — what kills farms
  // ───────────────────────────────────────────────────────────
  var FAILURE_MODES = [
    { mode: 'Inadequate site selection',
      detail: 'Wrong depth, wrong flow, wrong substrate. Years of work lost. Mitigation: rigorous site assessment + Maine Sea Grant + DMR consultation BEFORE leasing.' },
    { mode: 'Insufficient capital reserve',
      detail: 'Year 1–2 losses bankrupt operator before profitability. Mitigation: 2-year operating reserve + day-job bridge + conservative growth.' },
    { mode: 'Hatchery seed problems',
      detail: 'Disease, quality, timing. Mitigation: established hatchery relationships + multiple seed sources + biosecurity.' },
    { mode: 'Gear failure in storms',
      detail: 'Anchors drag, lines part, gear lost. Mitigation: oversized rigging + storm-prep protocols + insurance.' },
    { mode: 'Biofouling unmanaged',
      detail: 'Sea-squirts, hydroids, kelp coat gear → shellfish smothered. Mitigation: regular flipping + cleaning schedule + appropriate gear.' },
    { mode: 'HAB closures extended',
      detail: 'PSP toxin closes harvest weeks-months. Mitigation: financial reserve + cash-flow planning + diversification.' },
    { mode: 'Theft + vandalism',
      detail: 'Gear cut, oysters stolen. Rare but devastating. Mitigation: monitor sites + community relationships + insurance.' },
    { mode: 'Market collapse',
      detail: 'COVID-style restaurant closures + price crash. Mitigation: multiple market channels (retail + restaurant + processing) + DTC.' },
    { mode: 'Operator injury + burnout',
      detail: 'Solo or small operations vulnerable to operator health events. Mitigation: cross-trained help + insurance + realistic workload.' },
    { mode: 'Climate event (heat wave, freeze)',
      detail: 'Sustained extreme temperatures kill stocks. Mitigation: site selection for thermal stability + species selection for tolerance + insurance.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KEY METRICS REFERENCE
  // ───────────────────────────────────────────────────────────
  var AQ_KEY_METRICS = [
    { metric: 'Maine aquaculture economic output', value: '~$80M/yr (2022)', context: 'Growing from <$20M/yr a decade prior. Modest vs lobster ($400M+/yr) but high-growth sector.' },
    { metric: 'Maine oyster harvest', value: '~$10M+/yr', context: 'Damariscotta region dominates; Pemaquid + Bagaduce + Belfast also significant.' },
    { metric: 'Maine mussel harvest', value: '~$5M/yr', context: 'Bagaduce + Frenchman Bay + Eggemoggin Reach primary regions.' },
    { metric: 'Maine kelp harvest', value: '~$2M+/yr + growing', context: 'Fastest-growing sector. Atlantic Sea Farms + others lead.' },
    { metric: 'Maine soft-shell clam harvest', value: '~$10M/yr', context: 'Wild fishery, not aquaculture per se, but related + town-managed.' },
    { metric: 'Maine farmed-salmon harvest', value: '~$50M+/yr', context: 'Cobscook + Machias Bays. Industry has consolidated; sustainability + environmental concerns ongoing.' },
    { metric: 'Number of Maine aquaculture leases', value: '~500+ active', context: 'Mix of LPA (small) + standard (larger). Growing 5–10% per year recently.' },
    { metric: 'Total Maine aquaculture acreage', value: '~2,000+ acres leased', context: 'Tiny fraction of Maine\'s 36,000+ sq mi of state waters.' },
    { metric: 'Maine Aquaculture jobs', value: '~700 direct + supporting', context: 'Plus seasonal hires + indirect economic effects.' },
    { metric: 'Gulf of Maine sea-surface temperature trend', value: '+0.5–0.7°C/decade', context: '~4× global ocean average. Pershing et al 2015 + ongoing data.' },
    { metric: 'Damariscotta River oysters annual production', value: '~5M+ oysters', context: 'Among largest oyster production rivers on East Coast.' },
    { metric: 'Average startup capital — LPA shellfish operation', value: '$20–50K', context: 'Lease application + initial gear + first seed.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MAINE AQUACULTURE TIMELINE — industry history
  // ───────────────────────────────────────────────────────────
  var AQ_TIMELINE = [
    { era: 'Pre-1600s', event: 'Wabanaki harvest', detail: 'Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki peoples manage shellfish populations sustainably for ~13,000 years. Shell middens along Maine coast (Damariscotta Oyster Shell Heaps among largest in North America) testify to long human-shellfish relationship. Traditional harvest practices included rotation + seasonal restrictions encoded in cultural practice — early forms of resource management.' },
    { era: '1607–1800s', event: 'Colonial + commercial harvest', detail: 'European arrival rapidly intensifies wild shellfish harvest. Damariscotta oyster beds depleted by 1700s. Soft-shell clam fisheries expand. Lobster originally considered "poor food" — fed to prisoners + servants — until canning + rail transport made it valuable mid-1800s.' },
    { era: '1850s–1900', event: 'Industrial scale harvest + first conservation', detail: 'Wild shellfish + finfish stocks decline. First Maine fisheries laws + warden system established. Conservation movement begins to recognize finite nature of marine resources.' },
    { era: '1908', event: 'Maine sea-run salmon hatchery', detail: 'Maine experiments with salmon enhancement to supplement declining wild runs. Early aquaculture infrastructure built but with limited long-term success for sea-run salmon restoration.' },
    { era: '1970s', event: 'Salmon farming research', detail: 'Cobscook Bay salmon farming research begins. Atlantic salmon (S. salar) trial farms established. Industry grows through 1980s+.' },
    { era: '1973', event: 'Maine DMR established', detail: 'Department of Marine Resources created from earlier Sea & Shore Fisheries Department. Modern regulatory framework begins. Aquaculture office created within DMR.' },
    { era: '1976', event: 'First commercial Maine oyster aquaculture', detail: 'Glidden Point Oyster Sea Farm + others begin commercial oyster operations in Damariscotta. Bottom-plant + cage-grown stocks tested.' },
    { era: '1980s', event: 'Mussel rope-culture pioneered', detail: 'European-style mussel longline + rope culture introduced to Maine waters. Initial experiments on Bagaduce + Eggemoggin Reach + Frenchman Bay. Industry slow to expand.' },
    { era: '1980s–1990s', event: 'Salmon farming peak + crisis', detail: 'Maine salmon farming reaches >$80M/yr by 1990s. Disease outbreaks (Infectious Salmon Anemia 2000–2003) + environmental concerns + corporate consolidation reshape industry. Many small Maine salmon farms close.' },
    { era: '1990s–2000s', event: 'Shellfish aquaculture matures', detail: 'Damariscotta oyster industry establishes brand identity + premium market. Maine Aquaculture Association founded. University of Maine research support expands.' },
    { era: '2000s', event: 'Lobster boom + climate concerns', detail: 'Maine lobster landings increase dramatically as Gulf warms (cold-tolerant species benefits initially). By 2016 lobster hits ~125M lb landed — record. But scientists warn warming is not friend forever — lobster center of distribution shifts north.' },
    { era: '2010', event: 'Kelp pioneers begin', detail: 'Sugar kelp pilot farms established. Atlantic Sea Farms (founded 2009 as Ocean Approved) begins building Maine kelp industry.' },
    { era: '2014', event: 'Kelp regulatory framework', detail: 'DMR establishes formal kelp aquaculture leasing framework. Industry scales rapidly through 2015–2025.' },
    { era: '2015', event: 'Climate science clarifies', detail: 'Pershing et al publishes landmark paper showing Gulf of Maine warming faster than 99% of world oceans. Industry begins serious climate-adaptation planning.' },
    { era: '2015–2020', event: 'New entrant programs', detail: 'Maine Aquaculture Association launches Aquaculture in Shared Waters program. Bigelow Lab + UMaine + Sea Grant expand training programs. New entrants from outside traditional fishing communities begin entering industry.' },
    { era: '2018+', event: 'Standard lease boom', detail: 'Number of standard (large) aquaculture leases grows. Some conflict over lease density + traditional fishing access. Maine Aquaculture Roadmap policy work underway.' },
    { era: '2020', event: 'COVID disruption', detail: 'Restaurant closures collapse oyster + premium-shellfish demand. Industry pivots to direct-to-consumer + retail. Many farms struggle; some innovate + survive stronger.' },
    { era: '2020+', event: 'Climate impacts intensify', detail: 'Summer SST records hit annually. HAB closures more frequent + longer. Vibrio advisories common. Industry adapts: deeper lease siting, kelp expansion (winter crop), thermal-tolerant strains.' },
    { era: '2022', event: 'Marine economy report', detail: 'Maine\'s marine economy assessed at $3.2B+/yr. Aquaculture component ~$80M/yr + growing. Lobster remains dominant at ~$400M+/yr.' },
    { era: '2023+', event: 'Restorative aquaculture frontier', detail: 'Research + pilots in regenerative + ecosystem-positive aquaculture intensify. Polyculture + integrated multi-trophic operations (IMTA) move from research to commercial trials.' },
    { era: 'Future (2030+)', event: 'Climate-adapted industry', detail: 'Maine aquaculture trajectory points toward: scaled kelp + shellfish (climate-positive species), expanded Indigenous-led + cooperative operations, integrated polyculture, expanded hatchery capacity, continued working-waterfront preservation. Threats: pace of warming, hurricane frequency, market shifts, regulatory complexity.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: STUDENT FAQ — common aquaculture questions
  // ───────────────────────────────────────────────────────────
  var STUDENT_FAQ_AQ = [
    { q: 'What is aquaculture exactly?',
      a: 'Aquaculture = farming aquatic plants + animals. In Maine, the main species are: blue mussels (rope culture), eastern oysters (floating cages + bottom plant), sugar kelp (winter grow lines), winged kelp (specialty), soft-shell clams (intertidal enhancement). Aquaculture supplies about half the seafood eaten globally — the other half is wild-caught.' },
    { q: 'Why farm shellfish instead of catching wild?',
      a: 'Wild shellfish populations are limited + variable. Farming provides reliable supply + reduces pressure on wild stocks + allows water-filtering benefits. Maine mussels + oysters are filter feeders — they clean the water as they grow. No feed is added (unlike fish farming or land animal farming). Aquaculture is among the most ecologically efficient food production known.' },
    { q: 'Is shellfish farming bad for the environment?',
      a: 'Done well in suitable sites: no. Maine bivalve farming has very low ecological impact + provides ecosystem services (water filtering, denitrification, habitat for small fish under cages). Done poorly or in unsuitable sites: can cause local sediment buildup, navigation conflicts, visual impact, displacement of fishermen. Maine\'s lease application process is designed to weigh these tradeoffs publicly.' },
    { q: 'Can I start a shellfish farm in Maine?',
      a: 'Yes. Maine has the Limited Purpose Aquaculture (LPA) license — up to 1 acre, 3-year renewable. Application costs ~$50 + needs site approval. LPA is the recommended starter path. Standard leases up to 100 acres + 20 years exist for larger operations + require more involved permitting. Many Maine farms start as LPA + grow to standard.' },
    { q: 'How much money can you make farming oysters?',
      a: 'Realistic numbers: Year 1–2 you invest + lose money. Year 3+ you break even or profit. A productive 1-acre LPA can net $5,000–15,000/yr. A 5-acre operation can scale to $50,000+. The best farms develop direct-to-restaurant sales for premium pricing. Most farmers also have second income source for early years.' },
    { q: 'Are farmed oysters as good as wild?',
      a: 'Both excellent. Farmed oysters from cold + clean Maine waters are widely considered some of the best in the world. Wild oysters in Maine are limited (most wild populations were depleted historically). Restaurant oysters in the US are mostly farmed today. Different regions (Damariscotta, Pemaquid, Bagaduce) have different "merroir" — distinct flavors based on water + plankton.' },
    { q: 'Why are mussels so cheap compared to oysters?',
      a: 'Mussels grow faster (1.5 yr to market vs 2–4 for oysters), grow at higher density (rope culture), require less labor (no flipping), have less variable pricing, are sold in bulk for cooking rather than half-shell. Oysters command premium because of half-shell market + slower growth + more handling. Different business models, both viable.' },
    { q: 'What\'s the deal with kelp?',
      a: 'Kelp is the newest + fastest-growing Maine aquaculture sector. Winter crop (Oct–April), 4–6 month grow cycle, low labor, no seed feeding needed, climate-positive (absorbs carbon + nitrogen). Sold to processors who turn it into food products. Maine is the largest US kelp producer. Buyers + processing capacity are the current bottleneck — supply is growing faster than demand.' },
    { q: 'Can shellfish farming help with climate change?',
      a: 'Some + complicated. Shellfish themselves absorb some carbon to build shells (sequestered for some time). Kelp absorbs CO2 + nitrogen. Both farming forms produce protein with near-zero feed input + low water use vs land farming. However, scale matters — global shellfish carbon impact is small vs total emissions. Best framing: aquaculture is part of climate-positive food systems, not a single-handed solution.' },
    { q: 'Do farmers compete with fishermen?',
      a: 'Sometimes yes — particularly over use of waterfront infrastructure + harbor space + lease siting near traditional fishing grounds. Maine has worked to integrate aquaculture into existing working waterfront communities. The most successful operations work WITH local fishing communities + employ fishermen seasonally + share dock space. Conflict happens; coexistence is the goal.' },
    { q: 'What are the risks I should know about?',
      a: 'Biological: HAB closures (PSP, Alexandrium toxin), disease outbreaks (Vibrio, OsHV-1), predation, climate stress. Physical: storms, ice, gear loss, boat issues. Economic: market price swings, restaurant slowdowns (especially 2020 COVID lesson), insurance costs. Regulatory: permit changes, food-safety closures. Most Maine farms diversify (multiple species, multiple markets) to spread risk.' },
    { q: 'What\'s the gender + age makeup of Maine aquaculture?',
      a: 'Increasingly diverse. Historically male-dominated like fishing. Currently: many young entrants + significant female participation + immigrant Maine farmers (especially from Vietnam in some regions). Maine Aquaculture Association + university programs actively recruit + train diverse new farmers. Average age of new entrants ~30 — younger than commercial fishing entry.' },
    { q: 'How do I learn more or get started?',
      a: 'Maine Aquaculture Association (mainaquaculture.org) — training programs, mentorship, advocacy. Maine Sea Grant — research + extension. University of Maine Cooperative Extension — courses. DMR — permitting. Maine Aquaculture Innovation Center — business development. Talk to existing farmers — most are happy to share knowledge with serious learners.' },
    { q: 'Can Indigenous communities participate in aquaculture?',
      a: 'Yes. Wabanaki communities have legal harvest rights + cultural connections to coastal resources going back ~13,000 years. Tribal natural resource departments + economic development programs include aquaculture pathways. Some Wabanaki entrepreneurs are entering shellfish farming with cultural + economic dimensions. State + federal programs exist for tribal aquaculture development.' },
    { q: 'Is aquaculture food safe to eat?',
      a: 'Yes — generally safer than wild because of regulated harvesting + testing. Maine farmed bivalves undergo regular DMR testing for biotoxins (PSP/Alexandrium) + bacterial counts (NSSP standards). Closures happen when toxins detected. Pasteurization + processing for some products further reduces risk. Raw shellfish always carries some Vibrio risk especially in warm months — pregnant + immunocompromised people should avoid raw.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: HATCHERY DEEP DIVE — bivalve hatchery operations
  // ───────────────────────────────────────────────────────────
  var HATCHERY_DEEP = [
    { topic: 'Hatchery Overview',
      summary: 'Maine bivalve aquaculture depends on hatcheries that produce reliable seed (spat). Without hatchery seed, the industry could not scale beyond wild-set recruitment. Hatcheries control: broodstock selection + spawning, larval rearing, algal feed, settlement + setting, seed conditioning + delivery.',
      maine_examples: 'University of Maine Aquaculture Research Institute (Walpole), Mook Sea Farm Hatchery (Walpole), Pemaquid Oyster (Damariscotta), Glidden Point (Edgecomb), Coastal Enterprises Hatchery partnerships, Maine Aquaculture Innovation Center.',
      scale: 'Largest produce 100M+ oyster spat per year. Mussel hatcheries smaller scale + more recent. Clam hatcheries (soft-shell + hard) regional + research-oriented.' },

    { topic: 'Broodstock Selection',
      criteria: 'Adult bivalves selected as parents based on: growth rate, disease resistance, climate tolerance (Maine increasingly focuses on warm-water + low-pH tolerance), shell shape, meat-yield. Different lines maintained for different end-markets.',
      sources: 'Wild-collected (gene diversity), pedigreed broodstock from selective breeding programs, NOAA + university programs.',
      genetic_concerns: 'Avoid inbreeding (rotation of broodstock lines), maintain genetic diversity, document parentage. Maine policy generally favors native Gulf-of-Maine genetics to avoid introducing non-local genes that could escape + interact with wild populations.' },

    { topic: 'Spawning + Conditioning',
      process: 'Broodstock conditioned by gradual temperature rise + abundant algal feed simulating spring. After 4–8 weeks, "spawning trigger" applied: thermal shock (sudden warm water), or addition of sperm/eggs from spawning individuals to induce conspecific response.',
      yield: 'A single female oyster produces 10–100 million eggs per spawn. Sperm + eggs combined in spawning tanks, fertilization observed under microscope.',
      hatchery_skill: 'Timing + conditions matter intensely. Failed spawn = lost weeks of preparation + revenue. Skilled hatchery techs are valued staff — combining biology, chemistry, animal husbandry, and patience.' },

    { topic: 'Larval Rearing — Free-Swimming Stage',
      biology: 'Fertilized eggs develop into trochophore larvae within 24 hr, then veliger larvae with characteristic bivalve "shell" forming. Larvae swim freely + feed on microalgae in water column for 2–3 weeks (oysters) to 4 weeks (mussels).',
      tank_conditions: 'Filtered seawater 22–24°C, salinity 28–32 ppt, gentle aeration, daily water changes, density control (~5–10 larvae/mL).',
      feed: 'Live microalgae cultures — typically Isochrysis, Pavlova, Chaetoceros, Tetraselmis — fed at species-specific ratios. Algal-culture room is the largest single operational subsystem of any hatchery.',
      mortality: 'Larval mortality is normal — 30–70% losses through veliger stage common. Disease pressure (Vibrio, OsHV-1 virus in oysters) is constant operational risk.' },

    { topic: 'Settlement + Setting',
      transition: 'Around day 15–25, larvae transition to "pediveliger" stage with foot — searching for settlement substrate. Hatchery provides cultch (substrate to settle on): finely ground shell, ceramic chips, or — for cultchless single-set spat — small "microcultch" particles.',
      remote_set: 'Some Maine growers buy "eyed larvae" (just-pre-settlement) + set their own at farm-side remote-setting tanks. Reduces hatchery storage + transport stress.',
      single_set: 'For premium oysters (especially half-shell market), spat set individually on tiny cultch particles → produces uniform single oysters. Higher value but more hatchery work.',
      cultch_set: 'For commodity oysters (shucked/canned market), spat allowed to set on larger cultch in clusters. Lower per-oyster cost.' },

    { topic: 'Nursery Phase',
      after_set: 'Newly-set spat held in nursery systems — upwellers or floating nursery — for 6–10 weeks. Filtered seawater pumped through; spat feed naturally on phytoplankton + algae from hatchery cultures.',
      growth_rate: 'Spat grow from <1 mm at set to 4–10 mm at hatchery sale size. Hatchery typically sells when robust enough to survive farm deployment.',
      grading: 'Multiple size grades — smaller spat cheaper but riskier deployment; larger spat more reliable survival but more expensive.',
      packing: 'Spat packed wet in mesh bags, stacked in coolers with ice packs, transported to farms within 24 hr. Cold-chain critical — temperature shock kills small spat.' },

    { topic: 'Algae Culture — The Hatchery\'s Engine',
      species: 'Multiple algal species cultured simultaneously. Each provides different nutrition for bivalve larvae + spat. Common Maine hatchery species: Isochrysis galbana (lipid-rich), Pavlova lutheri (high EPA fatty acid), Chaetoceros muelleri (silica diatom), Tetraselmis suecica (high protein).',
      cascade_system: 'Cultures scaled from test tubes → 250 mL flasks → 4 L carboys → 20 L carboys → 200 L bag systems → 1000+ L bag systems → daily harvest into larval tanks. Each step is a controlled population growth at specific temp + light + nutrients.',
      contamination: 'Algal cultures vulnerable to contamination from wild algae, ciliates, bacteria. Sterile technique throughout. Single contaminated culture can crash entire hatchery feed supply within days.',
      cost: 'Algal-room operation is 30–50% of hatchery operating cost. Skilled algae technicians as valuable as the hatchery biologist.' },

    { topic: 'Triploid Oyster Production',
      what: 'Most premium half-shell oysters in US are "triploids" — 3 sets of chromosomes instead of 2. Triploids are typically sterile (no spawning energy diverted to gametes) → grow faster + better meat year-round (no "milky" reproductive season).',
      how_made: 'Two methods: (1) Chemical induction (cytochalasin B during fertilization blocks second polar body release, retaining extra chromosome set) — older method, declining use. (2) Tetraploid × diploid cross — tetraploid broodstock (4n) crossed with normal diploid (2n) produces consistent triploid (3n) offspring. This is the modern preferred method.',
      maine_use: 'Most Maine oyster farms grow triploids for half-shell market. Diploid oysters still used for restoration + breeding + some specialty markets.',
      ethical_practical: 'Sterile triploids cannot reproduce in wild — escape risk lower. But also means dependent on hatchery for every generation; no wild rescue if hatcheries fail.' },

    { topic: 'Disease Management',
      msx_dermo: 'Oyster diseases historically devastating in Chesapeake; less in Maine due to cooler waters but increasingly relevant as Gulf warms. MSX (Multinucleated Sphere X) + Dermo (Perkinsus marinus) detected in Maine but at lower prevalence than south.',
      oshv: 'OsHV-1 microvariant (Ostreid Herpesvirus) caused mass mortalities in Europe + Pacific. Maine has had localized outbreaks. Bio-secure hatcheries + monitoring critical.',
      qpx: 'QPX (Quahog Parasite X) affects hard clams. Maine has experience with this; monitoring ongoing.',
      bio_security: 'Hatcheries quarantine new broodstock, sterilize equipment + footbaths, test water inputs, monitor mortality patterns. State of Maine veterinary regs apply to bivalve disease.',
      genetic_resistance: 'Selective breeding programs select for disease tolerance — a key role of organizations like NOAA + Rutgers + University of Maine breeding programs.' },

    { topic: 'Climate-Forward Breeding',
      ocean_acidification: 'Lower pH water inhibits larval shell formation. Hatcheries can buffer water with sodium bicarbonate or borate. Costs $0.05–0.10 per gallon treated. Multi-state research consortium (NOAA Ocean Acidification Program) studies this.',
      thermal_tolerance: 'Some lines selected for upper-thermal tolerance — relevant as Gulf of Maine warms.',
      maine_programs: 'University of Maine + Hurricane Island + Bigelow Lab partnerships on climate-resilient genetics. Lines being developed for next 20 years of warming.',
      open_question: 'Is selective breeding sufficient or does industry need fundamental species shifts (e.g., move toward more thermally-tolerant species)? Active debate.' },

    { topic: 'Economics of Hatchery Operations',
      capital: 'Modern hatchery startup capital $1–5M+ depending on scale. Algae rooms, larval tanks, biosecure facility, pumps, filtration, backup power, refrigeration.',
      operating: 'Annual operating costs include energy (huge — pumping + heating + cooling), personnel (skilled labor), water (saltwater intake + freshwater for cleaning), supplies (nutrients, chemicals, broodstock).',
      pricing: 'Spat sold by size + quantity. Single-set 6mm oyster spat: $0.005–0.015 per spat. Mussel spat-on-rope: $1–3 per meter of rope (10,000+ spat). Kelp gametophyte string: $5–20 per linear meter.',
      maine_market: 'Maine demand for hatchery seed has grown faster than supply. Some Maine farmers source from out-of-state hatcheries (Virginia, New Brunswick) — risks include disease introduction + reduced local capacity.',
      policy_advocacy: 'Industry + state work to expand Maine hatchery capacity. NOAA grants + state economic-development funds have supported hatchery expansion 2015–2025.' },

    { topic: 'Career Paths at Hatchery',
      hatchery_technician: 'Entry-level (high school + training). Daily larval tank work, algae culture maintenance, water quality testing. Hands-on biology. Salary $35–50k.',
      hatchery_biologist: 'Bachelor\'s + experience. Manages production cycles, troubleshoots biology, selects broodstock. Salary $50–80k.',
      hatchery_manager: 'Senior role. Master\'s typical. Manages production schedule, customer orders, staffing, facility. Salary $80–120k.',
      research_scientist: 'PhD typical for breeding-program or basic-research roles. University, NOAA, Bigelow. Salary $80–130k.',
      careers_to_farms: 'Many hatchery techs go on to start their own farms — combining hatchery knowledge with farming reduces risk substantially.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: COMPOSITE GROW SEASONS — 18-month narrated cycles
  // ───────────────────────────────────────────────────────────
  var COMPOSITE_GROW_SEASONS = [
    { title: 'Bagaduce Blue Mussel Rope Culture — 18 Month Cycle',
      site: '1-acre LPA lease, mid-river, 4 m mean depth, 1.0 kt peak tidal current, salinity 28 ppt, summer SST max 22°C',
      gear: '300 m head rope + 240 droppers @ 1.0 m spacing, droppers 4 m, biodegradable mesh socking material',
      narrative: [
        'MONTH 0 (May Year 1): Order spat-on-rope from Maine Aquaculture Co-op hatchery. ~50,000 spat per dropper purchased. Hatchery delivers Bagaduce-water-conditioned product to reduce settlement shock.',
        'MONTH 0–1 (May–June): Drop droppers from skiff. Tie each to main longline at 1.0 m spacing. Check spat retention — biodegradable mesh holds spat to rope ~3 weeks until byssal threads form.',
        'MONTH 2 (July): First inspection. Spat well-attached, mesh degrading on schedule, shell length ~8 mm. Water temp 19°C. DO 7.2 mg/L. No mortality of concern.',
        'MONTH 3–6 (Aug–Nov): Growth phase. Shell length 8 → 25 mm. Biofouling begins (sea-squirts, hydroids, mud-tube worms). Schedule first mechanical de-fouling pass — pull droppers, mild pressure-wash, return to water within 30 min.',
        'MONTH 6 (Nov): Winterizing. Ensure droppers hang below ice line (≥1 m below surface low tide). Bagaduce sees thin ice + occasional drift ice; main risk is ice-scour at surface.',
        'MONTH 7–9 (Dec–Feb): Winter pause. Periodic site visits between weather windows. Check buoys for ice damage. Mussel growth slow in cold water — physiological dormancy.',
        'MONTH 10 (Mar): Spring inspection. Shell length 35 mm. No winter losses beyond expected. Some droppers heavy with growth — risk of self-shedding (mussel clumps falling off own weight).',
        'MONTH 10–11 (Mar–Apr): Re-sock. Pull droppers, separate clumps gently, re-sock into wider-mesh socking material to give mussels room to grow without falling. Density: ~80% of original spat retained typically.',
        'MONTH 12 (May Year 2): Second growing season begins. Shell 40 mm. Bloom-season risk: monitor for HAB (harmful algal bloom) via DMR weekly water test schedule. Shellfish closure possible.',
        'MONTH 14 (July Year 2): HAB closure 9 days due to Alexandrium. Harvest paused. Site re-opened after toxin-test below 80 µg/100g.',
        'MONTH 16 (Sept Year 2): Shell length 55–65 mm. Test-harvest a dropper — meat-to-shell ratio 30%, color cream/orange, excellent quality.',
        'MONTH 17–18 (Oct–Nov Year 2): Full harvest. Pull droppers, declump, grade to 50 mm+ size, bag in 25 lb mesh bags, transport on ice to processing facility within 4 hours.',
        'Total yield: ~8,500 lb per 240 droppers ≈ 35 lb/dropper. At $1.50/lb wholesale = ~$12,750 gross. Less seed + labor + boat + ice + lease fee ≈ $4,500 net for the cycle (one-acre, single cycle).'
      ],
      lessons: 'Real numbers: spat → ~80% retention through re-sock → ~35 lb/dropper. Climate variability + HAB closures are operational risks built into business plan. Net margins thin per acre — scale + D2C improve viability.',
      lesson_id: 'cycle-bagaduce-mussel' },

    { title: 'Damariscotta Floating-Cage Oyster — Year 1 to Year 3',
      site: '2-acre LPA + 1 standard application pending, mid-Damariscotta, 4 m depth, fully tidal',
      gear: '200 floating bags (OysterGro / FlipFarm style) in 4 rows of 50, plus 80 longline cages for second-year stock',
      narrative: [
        'MONTH 0 (June Y1): Purchase 200,000 single-set spat from Maine Sea Grant-supported hatchery. ~1,000 per bag in floating gear. Spat size 4 mm.',
        'MONTH 1–3 (June–Aug Y1): Spat grow rapidly. Weekly flipping of cages to dry-shock biofouling. Biofouling pressure intense in nutrient-rich Damariscotta water — discipline matters.',
        'MONTH 4 (Sept Y1): Grade to two size cohorts. Larger spat moved to lower-density bags (~500 per bag). Small spat consolidated.',
        'MONTH 6 (Nov Y1): Winterization. Damariscotta gets ice — gear must be sunk below ice line via release of bag buoyancy or transferred to bottom cages. Loss of gear = significant cost if missed.',
        'MONTH 7–9 (Dec–Feb Y1): Winter rest. Oysters in dormancy.',
        'MONTH 10–12 (Mar–May Y2): Spring restart. Flip schedule resumes. Growth accelerates as water warms past 12°C.',
        'MONTH 13–18 (June–Nov Y2): Major growth year. Shells reach 60–75 mm. Begin first harvests of larger oysters at month 16–18. ~30,000 oysters cocktail-grade at $0.50/each = $15,000 first revenue.',
        'MONTH 19–24 (Dec Y2–May Y3): Second winter. Carryover stock ~150,000 + new spat purchased for Y3 cycle (continuous rolling cohorts).',
        'MONTH 25–30 (June–Nov Y3): Heavy harvest season. ~120,000 oysters market-grade @ avg $0.55–$0.85/each (size dependent), gross ~$80,000.',
        'Year 3 economics: Gross ~$95,000 (harvest + carryover) less labor ($25,000 for self + 1 seasonal hand) less seed ($8,000) less gear/maintenance ($10,000) less boat/fuel ($5,000) less lease/insurance ($3,000) = ~$44,000 net before tax. Year 3 is the first profitable year.'
      ],
      lessons: 'Floating-cage oysters scale up but require intensive labor (flipping). Three-year ramp to first profitable year is realistic. Damariscotta brand premium ($0.65+/oyster wholesale vs $0.30 commodity) makes thin-margin business viable.',
      lesson_id: 'cycle-damariscotta-oyster' },

    { title: 'Eastern Casco Bay Kelp Winter Crop',
      site: '0.5-acre LPA, 8 m depth, mid-bay, salinity 31 ppt, winter SST 2–4°C',
      gear: '600 m horizontal grow line at 1.5 m depth, sugar kelp seedling string from hatchery',
      narrative: [
        'MONTH 0 (October): Receive sugar kelp seed-string from hatchery (Saccharina latissima, gametophytes already wound onto twine).',
        'MONTH 1 (Nov): Deploy grow line + spin seed-string around grow line. Water cold enough (≤14°C) for kelp growth to initiate.',
        'MONTH 2–4 (Dec–Feb): Rapid growth phase. Daylight low but photosynthesis active. Blade length 10 cm → 40 cm by Feb.',
        'MONTH 5 (March): Major growth. Blades 60–100 cm. Water still cold + nutrient-rich. Some biofouling beginning as days lengthen.',
        'MONTH 6 (April): Harvest. Pull grow line in segments. Blades 1.5–2 m. Total wet biomass ~6,000 lb per 600 m line.',
        'Post-harvest: Sell wet to Maine processor (Atlantic Sea Farms, Ocean Approved, etc.) at ~$0.50/lb wet → $3,000 gross per line. Multiple lines stacked on same lease scale revenue.',
        'Summer: Bare lease. Kelp does not grow warm-season in Maine waters. Lease can be combined with mussels (warm-season) for year-round revenue.'
      ],
      lessons: 'Kelp = winter-only crop in Maine. Low labor compared to shellfish. Excellent climate-positive story (kelp sequesters carbon + nitrogen). Buyers + processing capacity remain the bottleneck for industry growth.',
      lesson_id: 'cycle-kelp-cascobay' },

    { title: 'Penobscot Bay Bottom-Plant Soft-Shell Clam',
      site: 'Intertidal flat, town-managed clam-flat permit (not aquaculture lease per se, but related)',
      gear: 'No gear — wild fishery enhanced via spat-protection netting + town management',
      narrative: [
        'SPRING: Town clam committee + harvesters meet. Decide on flat closures (rotation), spat-protection netting purchases (predator exclusion against green crabs), and license allocation.',
        'SPRING–SUMMER: Spat-protection netting laid over identified high-recruitment flats. Reduces green-crab predation on juvenile clams by ~70% based on town pilot data.',
        'SUMMER: Town harvest seasons opened on rotation. Each commercial harvester (~$300 license + permit) digs at low tide; daily quota set by town.',
        'FALL: End-of-season biomass survey + management review. Some flats may close 2–3 years for recovery.',
        'WINTER: Off-season — clam committee, marketing, equipment repair, planning.'
      ],
      lessons: 'Town-managed commons is one of Maine\'s oldest fisheries management models. Green-crab climate impact (warmer water = more crabs = more clam loss) is forcing innovation. Spat-protection netting is the leading climate-adaptation tool.',
      lesson_id: 'cycle-softshell-clam' },

    { title: 'Frenchman Bay Mixed Operation — Mussels + Kelp + Oysters',
      site: '5-acre standard lease, 12 m depth, salinity 30 ppt, fully tidal',
      gear: 'Multi-species: 600 mussel droppers (3 lines) + 1000 m kelp grow line + 300 oyster floating cages',
      narrative: [
        'WINTER (Nov–Apr): Kelp grow line active — winter-season crop. Mussels in winter dormancy. Oysters sunk in winter bottom cages.',
        'APRIL: Kelp harvest (~10,000 lb wet, $5,000 gross).',
        'MAY–JULY: Mussel re-sock + spring oyster start-up. Spat purchases.',
        'JULY–OCT: Oyster intensive flipping + mussel growth + biofouling management.',
        'SEPT–NOV: Mussel harvest (~12,000 lb, $18,000 gross). Oyster harvest of mature cohorts (~$20,000 gross).',
        'NOV: Winter setup. Kelp grow line deployed again. Cycle repeats.',
        'Annual gross ~$43,000. Net ~$15,000 after labor, materials, boat. Diversification reduces seasonal employment + spreads climate risk.'
      ],
      lessons: 'Diversification is a climate-adaptation + economic-stability strategy. Single-species operations are vulnerable to species-specific events (HAB, disease, market). Multi-species = labor + capital demands across the year + resilience to single-species shock.',
      lesson_id: 'cycle-frenchman-mixed' },

    { title: 'Smaller LPA Pilot — First-Year Farmer Year 1',
      site: '1-acre LPA, novice operator (school psychologist transitioning to farming)',
      gear: 'Modest: 50 oyster floating bags + 60 mussel droppers — small-scale learning operation',
      narrative: [
        'MONTH 0: Operator completes Maine Aquaculture Association 6-week course, sites lease, submits LPA application.',
        'MONTH 2: DMR approval after harbor master consultation + 30-day public comment period.',
        'MONTH 3 (Spring Y1): First deployment. Bags + droppers ordered. Hatchery delivery scheduled.',
        'MONTH 3–6: First-year learning curve. Two bag losses (rope chafe), one near-injury (hand caught in line haul). Mentor (existing Bagaduce farmer) makes 3 site visits.',
        'MONTH 6: Winterization with mentor assistance.',
        'MONTH 7–12: Off-season planning, books, marketing prep. Direct conversations with 4 Portland restaurants for Year 2.',
        'YEAR 2: First harvest of mussels (~1,500 lb @ $2/lb wholesale = $3,000). Oysters need more time. Total Y1+Y2 = -$3,000 net (capital still in negative territory).',
        'YEAR 3: First profitable year — net ~$5,000. Operator continues day job + farms 20 hr/week. Path is real but slow.'
      ],
      lessons: 'First-generation entry is real but requires (a) a day job to bridge the first 2 years, (b) mentorship from existing farmers, (c) education investment, and (d) realistic capital expectations. Many fail in Year 2 — those who persist see Year 3 profitability.',
      lesson_id: 'cycle-novice-firstyear' },

    { title: 'Climate-Stressed Year — 2020 Heat Wave Composite',
      site: 'Mid-coast Maine farm composite, scaled to typical 5-acre standard mussel + oyster',
      gear: 'Standard',
      narrative: [
        'JUNE: Forecast unusually warm summer based on long-range models.',
        'JULY: SST hits 24°C at lease — exceeds mussel thermal tolerance threshold (sustained ~22°C is upper limit before mortality). Mortality observed in upper-water-column droppers.',
        'AUG: Vibrio bacteria advisory issued — temperature dependent — Vp + Vv risk. Harvest restricted to cool-shock hold within 6 hr of harvest.',
        'SEPT: Mussel mortality estimate ~40% of crop. Oysters less affected (more thermally tolerant) but biofouling extreme.',
        'OCT: Reduced harvest. Insurance claim if covered (most operations under-insured).',
        'POST-SEASON: Adaptation plan: deeper deployment (cooler water layer), shift to oyster-heavier mix, kelp expansion (winter), accept Maine\'s warming reality as new baseline.'
      ],
      lessons: 'Climate impact is not theoretical — 2020 + subsequent warm summers have caused real Maine farm losses. Adaptation strategies are operationally specific. Vibrio is a public-health + regulatory + market issue.',
      lesson_id: 'cycle-climate-stressed' },

    { title: 'Cooperative Marketing Year — Damariscotta Co-op Composite',
      site: 'Cooperative of 12 farms aggregating ~3 million oysters/yr',
      gear: 'Various',
      narrative: [
        'JAN–MARCH: Co-op board meetings. Annual marketing plan. Brand investment. Joint food-safety audit. Bulk shipping logistics.',
        'APRIL: Open distribution to ~80 restaurants in Boston + NYC + Portland. Joint logistics reduces freight costs ~40% vs individual farms.',
        'MAY–NOV: Member farms harvest, deliver to co-op cooler, co-op grades + packs + ships. Each farm paid based on quality + size grading.',
        'DEC: Annual settlement. Co-op member margin 12–15% higher than non-co-op equivalents due to (a) shared marketing, (b) shared logistics, (c) joint food-safety expense, (d) collective price-setting power.'
      ],
      lessons: 'Cooperatives reduce small-farm overhead + amplify market position. Maine\'s lobster co-op model has translated successfully to shellfish (Pemaquid Oyster Co., etc.).',
      lesson_id: 'cycle-coop-marketing' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: KELP DEEP DIVE
  // ───────────────────────────────────────────────────────────
  var KELP_DEEP = [
    { topic: 'Species — Sugar Kelp (Saccharina latissima)',
      bio: 'Dominant Maine kelp aquaculture species. Cold-water alga, 1–4 m blade length, single broad ruffled blade, holdfast attached to substrate or grow line. Native Gulf of Maine.',
      culture: 'Grown on horizontal grow lines (typically 100–500 m) at 1.5–3 m depth (light + temp optimum). Seeded from hatchery-produced gametophyte string. Winter crop in Maine (October seed, April harvest).',
      market: 'Wet sold to processors at ~$0.40–0.60/lb wet. Processed into noodles, broth, salt, frozen blocks, kelp cubes. Higher-value processed = $5–20+/lb dry equivalent.',
      bottlenecks: 'Processing capacity in Maine remains limited despite recent expansion. Buyers concentrated in 4–5 main companies. Drying + freezing infrastructure needed for shelf-stable products.' },

    { topic: 'Species — Winged Kelp (Alaria esculenta)',
      bio: 'Smaller than sugar kelp, distinctive midrib, "wings" on either side. Common Gulf of Maine. Higher-value than sugar kelp for some food applications (better texture for some preparations).',
      culture: 'Similar grow-line method, slightly different optimal depth + temp. Less common in commercial Maine production but growing interest for specialty market.',
      market: 'Premium pricing on processed products targeted to Asian + specialty food markets.' },

    { topic: 'Hatchery Process — Gametophyte Stage',
      explanation: 'Adult sporophytes (the visible blade form) release zoospores in fall. Hatchery collects spores → germinates into microscopic gametophytes (male + female, haploid) → mates them under controlled light/temp → resulting young sporophytes settle on twine wound around PVC frames. Twine + young plants are sold to farmers as "seed string" for deployment.',
      why_complex: 'Two-generation life cycle (sporophyte → gametophyte → sporophyte). Hatchery must maintain gametophyte cultures + understand red/blue light triggers. Maine has ~6 hatcheries serving the industry.',
      maine_hatcheries: 'University of New Hampshire JEL Hatchery (also serves Maine), Coastal Enterprises Inc partnerships, Springtide Seaweed, Atlantic Sea Farms partners, Maine Sea Grant supported hatcheries.' },

    { topic: 'Climate Co-Benefits',
      carbon: 'Kelp sequesters carbon via photosynthesis. Estimates suggest sugar kelp can sequester ~1.5 kg C / m² of grow line over a season. At Maine scale (~2000 acres × ~4000 ft of line/acre = 8M ft × 0.3 m spacing = 2.4M m of line × 1.5 = ~3,600 metric tons C / season — significant but small vs Maine emissions.)',
      nitrogen: 'Kelp absorbs dissolved nitrogen — useful for nutrient-loaded coastal waters (excess N from runoff causes algal blooms + eutrophication). Some restoration projects use kelp for nutrient removal.',
      acidification: 'Localized pH buffering — kelp photosynthesis consumes CO2 → raises local pH → reduces local acidification stress on shellfish growing nearby (oyster + mussel polyculture concept).',
      caveats: 'Carbon sequestration permanence depends on where biomass ends up. Eaten as food → C re-released. Sunk to deep sediment → potentially long-term. Most Maine kelp is harvested + eaten → carbon impact is short-term avoided-emissions, not deep sequestration. Honest accounting matters.' },

    { topic: 'Polyculture — Mussel + Kelp + Oyster',
      concept: 'Co-locating species on same lease for ecological + economic synergy. Mussels filter water → reduce turbidity → better light for kelp. Kelp consumes nutrients + CO2 → benefits shellfish. Different harvest seasons → year-round operation.',
      barriers: 'Lease design must accommodate 3D water column. Permitting allowance variable. Operational complexity higher. Many small farms struggle to manage multi-species — staffing + gear + expertise demands.',
      research: 'University of Maine Aquaculture Research Institute + Bigelow + Maine Sea Grant actively studying IMTA (integrated multi-trophic aquaculture).' },

    { topic: 'Buyers + Processing',
      atlantic_sea_farms: 'Largest Maine kelp buyer. Buys wet from ~30 contracted farmers, processes into branded retail products (kelp cubes, salsa, slaw). Maine-based growth story.',
      ocean_approved: 'Earlier mover in space, branded products.',
      springtide_seaweed: 'Premium specialty processor, focuses on minimally-processed products.',
      university_research: 'University of Maine Cooperative Extension + Sea Grant + ARI supply technical assistance + market research.',
      international: 'Some Maine kelp exports to Asian food markets but tariffs + perishability limit international scale.' },

    { topic: 'Regulations',
      lease: 'Standard DMR aquaculture lease processes apply. Special considerations: kelp lines are surface-near, so navigation marking + buoy spacing standards are critical. Public-trust review weighs visual + navigation impact.',
      species_native: 'Sugar kelp + winged kelp are native — no invasive-species permits required. Non-native species would face stricter review.',
      food_safety: 'Kelp products fall under FDA food regulations. Maine has state guidance on harvesting + drying + processing standards. Most growers sell wet to processors who hold the food-safety certifications.',
      contaminants: 'Heavy metals testing required for human-consumption kelp (arsenic, cadmium, lead, mercury). Maine waters generally test clean but bay-specific testing recommended.' },

    { topic: 'Economics — A 1-Acre Sugar Kelp Operation',
      capital: 'Lease application + permitting fees ~$1,500. Mooring system + grow lines + buoys ~$5,000. Annual seed string ~$2,000. Boat (assumed existing) — capital nominal if borrowed.',
      labor: 'Approx 200 hr/yr (deploy, monitor, harvest, deck work). Solo operator-feasible.',
      revenue: 'Yield ~6,000 lb wet @ $0.50/lb = $3,000/yr per 1-acre.',
      margin: 'Thin. ~$1,000–1,500 net annual after seed + line replacement + boat costs. Kelp alone is supplemental income — works as a polyculture addon, not a stand-alone business at small scale.',
      growth_path: 'Multiple-acre operations (10+ acres) + processing contracts + brand development can scale into viable single-species business.' },

    { topic: 'Maine Industry Trajectory',
      growth: 'Sugar kelp acreage grew ~25%/yr 2015–2022, now stabilizing. Maine is largest US kelp producer.',
      buyers: 'Concentration in 3–4 main buyers creates oligopsony market structure — price-setting power favors buyers.',
      research: 'University-industry partnerships ongoing. Bigelow Laboratory in particular leading nitrogen + carbon research.',
      outlook: 'Kelp is climate-positive story + scaling but bottlenecked on (a) processing capacity, (b) consumer market education + adoption, (c) buyer competition, (d) consistent water-quality data + scale economics.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: GLOSSARY
  // ───────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'spat', def: 'Newly-settled juvenile shellfish (mussels, oysters, clams). The "seed" that growers buy from hatcheries.' },
    { term: 'byssal threads', def: 'The strong protein "ropes" that mussels secrete to anchor themselves to substrate. How rope-culture mussels stay attached.' },
    { term: 'longline', def: 'A horizontal line suspended in the water column with droppers hanging from it. The workhorse of mussel + kelp aquaculture.' },
    { term: 'head rope', def: 'The main horizontal line of a longline. Holds the droppers.' },
    { term: 'dropper line', def: 'The vertical line hanging from the head rope. Mussels attach here as they grow.' },
    { term: 'sock', def: 'Cylindrical mesh tube into which mussel seed is loaded. Holds them onto the dropper until byssal threads anchor them.' },
    { term: 'dribble line', def: 'A continuous loop of seeded line wound around the dropper. Alternative to sock method.' },
    { term: 'lantern net', def: 'A vertical stack of disk-shaped mesh chambers used to grow scallops + oysters in mid-water.' },
    { term: 'depuration', def: 'Process where shellfish are held in clean filtered seawater to purge contaminants before sale. Required after some closure events.' },
    { term: 'biofouling', def: 'Unwanted organisms (barnacles, tunicates, algae, bryozoans) growing on gear or product shells. Reduces flow + adds weight.' },
    { term: 'HAB (Harmful Algal Bloom)', def: 'Toxin-producing phytoplankton bloom. Triggers DMR shellfish closures. Red tide is one example.' },
    { term: 'PSP (Paralytic Shellfish Poisoning)', def: 'Toxin from Alexandrium dinoflagellates accumulated in shellfish. Triggers Maine\'s most common closures.' },
    { term: 'NERACOOS', def: 'Northeast Regional Association of Coastal Ocean Observing Systems — provides real-time water quality data Maine farmers use.' },
    { term: 'abutter', def: 'A neighbor whose property abuts the proposed lease area. Has legal standing at public hearings to object.' },
    { term: 'LPA', def: 'Limited Purpose Aquaculture — Maine\'s entry-level lease, up to 1 acre, 3-year term, no public hearing.' },
    { term: 'standard lease', def: 'Larger Maine aquaculture lease (up to 100 acres, 20-year term). Requires public hearing.' },
    { term: 'standing crop', def: 'The total biomass currently on your farm. Counted for some management rules.' },
    { term: 'hatchery seed', def: 'Spat produced in a controlled hatchery and sold to growers. Alternative to wild-set seed.' },
    { term: 'wild-set seed', def: 'Spat collected from natural recruitment onto suitable substrate.' },
    { term: 'depth profile', def: 'How water properties (temp, salinity, DO) change with depth. Bivalves can be moved to better profile by moving droppers deeper.' },
    { term: 'COLREGS', def: 'International Collision Regulations — the rules of the road for boats. Same on a farm boat as on a fishing boat.' },
    { term: 'PFD', def: 'Personal Flotation Device. Required on every boat. Wear it — cold water hits fast in Maine.' },
    { term: 'gunwale', def: 'The top edge of the boat\'s side, where you grip when boarding.' },
    { term: 'starboard / port', def: 'Right / left when facing forward. Same on every vessel.' },
    { term: 'set + drift', def: 'Direction + speed of current. Determines where your gear actually ends up vs where you placed it.' },
    { term: 'BOEM', def: 'Bureau of Ocean Energy Management — federal agency reviewing offshore aquaculture proposals beyond state waters.' },
    { term: 'broodstock', def: 'Adult shellfish used in a hatchery for spawning. Selected for desirable traits (growth, disease resistance).' },
    { term: 'cultch', def: 'Substrate (usually old oyster shell or other hard material) on which oyster spat settles.' },
    { term: 'D-stage larvae', def: 'Early larval stage of bivalves (shaped like the letter D). Veliger stage.' },
    { term: 'eyed larvae', def: 'Late-stage larvae just before metamorphosis. Visible eyespot. Ready for setting.' },
    { term: 'FLUPSY', def: 'FLoating UPwellinG SYstem. Barge or floating dock holding upweller tanks for spat nursery.' },
    { term: 'metamorphosis', def: 'Transition from planktonic larva to settled juvenile (spat). Critical bottleneck in shellfish aquaculture.' },
    { term: 'triploid', def: 'A shellfish with three sets of chromosomes instead of the normal two (diploid). Triploids don\'t spawn — channel energy into growth. Faster-growing, can be marketed year-round.' },
    { term: 'aragonite saturation', def: 'A measure of how thermodynamically favorable shell formation is. Lower saturation (associated with acidification) makes shell-building energetically expensive.' },
    { term: 'spat-on-shell (SoS)', def: 'Oyster seed where spat has settled directly on old shell cultch. Traditional + cheap method.' },
    { term: 'cultchless / "shell-free" seed', def: 'Oyster spat raised individually (each on a tiny grit particle). Produces single oysters, premium-priced.' },
    { term: 'tumbling', def: 'Mechanical agitation of oyster cages to break apart clumps + discourage mud-blister worm settlement.' },
    { term: 'depuration', def: 'Holding harvested shellfish in clean filtered seawater for 48+ hours to purge contaminants. Regulated process.' },
    { term: 'relay', def: 'Moving shellfish from contaminated waters to clean waters + letting them filter clean. Alternative to depuration.' },
    { term: 'shellfish closure', def: 'DMR-issued prohibition on harvesting from a designated area due to bacterial / biotoxin / sewage contamination.' },
    { term: 'NSSP', def: 'National Shellfish Sanitation Program — federal-state program managing safety of shellfish harvest.' },
    { term: 'NSF', def: 'National Sanitation Foundation. NSF certification on water filtration + sanitation equipment.' },
    { term: 'BAP', def: 'Best Aquaculture Practices — third-party aquaculture sustainability certification.' },
    { term: 'ASC', def: 'Aquaculture Stewardship Council — sustainability certification from WWF + Dutch IDH.' },
    { term: 'GBE', def: 'Generally Biologically Equivalent — used in aquaculture FDA approval pathways.' },
    { term: 'RAS', def: 'Recirculating Aquaculture System — land-based system that filters + reuses water. Biosecure but capital-intensive.' },
    { term: 'IMTA', def: 'Integrated Multi-Trophic Aquaculture — co-locating species so wastes of one feed another (e.g., fish + kelp + shellfish).' },
    { term: 'feed conversion ratio (FCR)', def: 'Weight of feed in ÷ weight of fish produced. Lower = more efficient. Bivalves don\'t need feed (filter from water); fin fish FCR varies 1.2-2.0.' },
    { term: 'biofouling community', def: 'Suite of organisms that settle on gear: barnacles, tunicates, bryozoans, hydroids, algae.' },
    { term: 'eutrophication', def: 'Excessive nutrient enrichment of water leading to algal blooms + oxygen depletion. Aquaculture can contribute but bivalve + kelp aquaculture mitigate.' },
    { term: 'phytoplankton', def: 'Microscopic photosynthetic plankton — base of marine food web. Bivalve food source.' },
    { term: 'zooplankton', def: 'Microscopic animal plankton — copepods, krill larvae. Some bivalves consume zooplankton + phytoplankton.' },
    { term: 'chlorophyll-a', def: 'Pigment in phytoplankton. Proxy for phytoplankton biomass + food availability.' },
    { term: 'turbidity', def: 'Cloudiness of water from suspended sediment. Reduces light + can clog bivalve gills.' },
    { term: 'PSU', def: 'Practical Salinity Unit — modern unit for ocean salinity. ~equivalent to parts-per-thousand (ppt) by mass.' },
    { term: 'mg/L', def: 'Milligrams per liter — concentration unit for dissolved oxygen + nutrients.' },
    { term: 'µg/L', def: 'Micrograms per liter — concentration unit for chlorophyll-a + many trace constituents.' },
    { term: 'datalogger', def: 'Autonomous instrument that records sensor data over time at set intervals.' },
    { term: 'YSI', def: 'Common brand of water-quality probes (Yellow Springs Instrument). YSI Pro30 is a standard handheld DO/salinity/temp meter.' },
    { term: 'NERACOOS', def: 'Northeast Regional Association of Coastal Ocean Observing Systems — regional buoy + sensor network providing real-time data.' },
    { term: 'GMRI', def: 'Gulf of Maine Research Institute — Portland-based marine science org.' },
    { term: 'Bigelow Lab', def: 'Bigelow Laboratory for Ocean Sciences — East Boothbay, ME. Ocean biogeochemistry research.' },
    { term: 'UMaine SeaGrant', def: 'University of Maine Sea Grant program — extension + research bridge between university + working waterfront.' },
    { term: 'CCAR', def: 'Center for Cooperative Aquaculture Research — UMaine\'s aquaculture R&D + seed production facility (Franklin, ME).' },
    { term: 'PFD', def: 'Personal Flotation Device. Required on every boat.' },
    { term: 'COLREGS', def: 'International Collision Regulations — rules of the road.' },
    { term: 'EPIRB', def: 'Emergency Position-Indicating Radio Beacon — satellite-based marine distress beacon.' },
    { term: 'PLB', def: 'Personal Locator Beacon — wearable distress device on PFD.' },
    { term: 'Mayday', def: 'International distress call — life-threatening emergency. VHF Ch 16.' },
    { term: 'PAN-PAN', def: 'Urgency call — situation requires assistance but not immediately life-threatening.' },
    { term: 'tilling', def: '(Oyster gardening) Adjusting cage position seasonally for optimal water + temperature exposure.' },
    { term: 'sandbar', def: 'Submerged ridge — often a hazard but also indicates current patterns.' },
    { term: 'mooring scope', def: 'Anchor line length ÷ water depth. 5:1 fair-weather; 7:1+ stormy.' },
    { term: 'ropeless gear', def: 'Aquaculture / lobster gear without persistent vertical lines (which entangle whales). Triggered-buoy gear released by acoustic signal. Mandated in some seasons.' },
    { term: 'pop-up gear', def: 'Modern ropeless concept — gear with onboard pingers + buoy released on remote command.' },
    { term: 'sock', def: 'Cylindrical mesh tube holding mussel seed. Tied to droppers.' },
    { term: 'longline (mussel)', def: 'Horizontal head-rope suspended in water column with droppers hanging from it.' },
    { term: 'dribble line', def: 'Continuous seeded line wound around dropper. Alternative to socking.' },
    { term: 'dropper line', def: 'Vertical line hanging from longline head-rope. Where mussels grow.' },
    { term: 'lantern net', def: 'Stacked disc-shaped mesh chambers for growing scallops + sometimes oysters in mid-water.' },
    { term: 'bag-on-bottom', def: 'Oyster culture method — bags of oysters placed directly on intertidal bottom.' },
    { term: 'floating cage', def: 'Oyster culture in surface cages — easier maintenance + visible status.' },
    { term: 'rack-and-bag', def: 'Bags suspended on racks at fixed height — combines bottom + floating advantages.' },
    { term: 'byssus / byssal threads', def: 'Strong protein threads that mussels use to anchor to substrate. Secreted from byssal gland in the foot.' },
    { term: 'attached / settled', def: 'Sessile state of an adult bivalve — fixed in place. Contrast with planktonic larva.' },
    { term: 'gametes', def: 'Sex cells — eggs + sperm. Released during spawning.' },
    { term: 'spawning', def: 'Release of gametes into water column. Triggered by temperature shifts or chemical signals.' },
    { term: 'recruitment', def: 'Process by which young larvae survive + join the population.' },
    { term: 'mortality', def: 'Death rate. In aquaculture, total mortality includes natural + predation + disease + handling.' },
    { term: 'GMP', def: 'Good Manufacturing Practices — food safety standard.' },
    { term: 'HACCP', def: 'Hazard Analysis + Critical Control Points — federal food safety framework. Required certification for many aquaculture processors.' },
    { term: 'PSP', def: 'Paralytic Shellfish Poisoning — saxitoxin from Alexandrium blooms.' },
    { term: 'ASP', def: 'Amnesic Shellfish Poisoning — domoic acid from Pseudo-nitzschia. Rare in Maine.' },
    { term: 'DSP', def: 'Diarrhetic Shellfish Poisoning — okadaic acid. Rare in Maine.' },
    { term: 'NSP', def: 'Neurotoxic Shellfish Poisoning — brevetoxin. Gulf of Mexico species.' },
    { term: 'Vibrio', def: 'Genus of bacteria including V. parahaemolyticus + V. vulnificus. Naturally present + thrives in warm water + raw shellfish. Cause of summer Vp outbreaks.' },
    { term: 'Salmonella', def: 'Bacterial pathogen. Shellfish can accumulate from sewage-contaminated water.' },
    { term: 'depuration tank', def: 'Tank used for the depuration process — UV-sterilized seawater recirculation.' },
    { term: 'BAA', def: 'Beneficial Algae Application — sometimes referenced in IMTA + remediation contexts.' },
    { term: 'tribal-claim waters', def: 'Maine coastal waters subject to tribal sovereignty or treaty rights. Aquaculture leases here require tribal engagement.' },
    { term: 'Working Waterfront', def: 'Maine\'s designation for commercial fishing + aquaculture infrastructure. Protected via Maine\'s Working Waterfront Access Protection Program.' },
    { term: 'Mook Sea Farms', def: 'Walpole, ME. THE Maine oyster hatchery + farm. Founded 1985.' },
    { term: 'Atlantic Sea Farms', def: 'Saco-based kelp pioneer. Founded 2016. Partners with multiple Maine kelp growers.' },
    { term: 'Cooke Aquaculture', def: 'Salmon-farming operation in Cobscook + Machias Bay. Maine\'s largest aquaculture by tonnage. Controversial.' },
    { term: 'Whole Oceans', def: 'Bucksport, ME. Under-construction land-based RAS salmon facility. Among world\'s largest planned.' },
    { term: 'Maine Aquaculture Association', def: 'Industry trade group — advocacy + training + technical support.' },
    { term: 'Damariscotta Estuary', def: 'One of Maine\'s most productive shellfish estuaries. World-class oyster terroir.' },
    { term: 'Bagaduce River', def: 'Premier Maine mussel aquaculture region. Bagaduce River Mussels = heritage operation.' },
    { term: 'shellfish midden', def: 'Mound of consumed shells. Archaeological evidence of long-term Wabanaki harvest patterns. Maine\'s Damariscotta + Whaleback middens are major examples.' },
    { term: 'WHOI', def: 'Woods Hole Oceanographic Institution — neighboring marine science partner.' },
    { term: 'mollusk', def: 'Phylum Mollusca: oysters, clams, mussels, scallops (bivalves) + snails + octopuses + squid. Maine aquaculture focuses on bivalves.' },
    { term: 'bivalve', def: 'Mollusk with two hinged shells (oyster, clam, mussel, scallop).' },
    { term: 'gastropod', def: 'Mollusk with a single coiled shell (snail, whelk). Some have been aquaculture targets but not currently in Maine.' },
    { term: 'macroalgae', def: 'Multi-cellular seaweeds. Includes kelp, dulse, sea lettuce. Maine aquaculture produces sugar kelp + winged kelp + dulse.' },
    { term: 'microalgae', def: 'Single-celled algae (phytoplankton). Hatcheries culture for larval feed.' },
    { term: 'cyst', def: 'Dormant resting stage of some algae + bacteria. Settles in sediment + germinates when conditions favorable. Alexandrium PSP cysts overwinter in Maine sediment.' },
    { term: 'gametogenesis', def: 'Sex-cell formation. Triggered by temperature in bivalves.' },
    { term: 'conditioning', def: 'Process of preparing broodstock for spawning. Controlled temperature + food regimes.' },
    { term: 'serotonin injection', def: 'Common hatchery technique to trigger bivalve spawning.' },
    { term: 'sperm density', def: 'Concentration of sperm cells in fertilization tank. Optimized to maximize fertilization rate without over-stress.' },
    { term: 'cleavage', def: 'Early cell divisions of fertilized egg. Microscope-observable.' },
    { term: 'trochophore', def: 'Earliest larval stage of bivalves. Free-swimming, ~24 hours post-fertilization.' },
    { term: 'veliger', def: 'Larval stage with ciliated velum (swimming organ) + early shell.' },
    { term: 'pediveliger', def: 'Late larval stage with foot. Ready for setting.' },
    { term: 'shell hash', def: 'Crushed shell substrate used as cultch.' },
    { term: 'remote setting', def: 'Bringing eyed larvae to a grower\'s site for metamorphosis. Cost-saving but higher-risk than buying set seed.' },
    { term: 'on-bottom culture', def: 'Growing oysters directly on the substrate (not in cages or bags). Cheaper but slower growth + more predation.' },
    { term: 'in-water culture', def: 'Growing in cages, bags, or longlines off the bottom. Faster growth + better quality control.' },
    { term: 'longline farm', def: 'Aquaculture farm using horizontal head-ropes with droppers. Standard for Maine mussels + kelp.' },
    { term: 'raft culture', def: 'Aquaculture from a floating raft. Common in Mediterranean + Asia. Limited use in Maine due to storms.' },
    { term: 'lantern net farm', def: 'Aquaculture using stacked disc cages. Standard for scallops + some oysters.' },
    { term: 'rack-and-bag', def: 'Bags of oysters on intertidal racks. Hybrid of on-bottom + in-water.' },
    { term: 'intertidal', def: 'The zone between high + low tide. Exposed at low tide.' },
    { term: 'subtidal', def: 'Below low-tide line. Always underwater.' },
    { term: 'photic zone', def: 'Depth zone where light penetrates. Phytoplankton + macroalgae grow here.' },
    { term: 'aphotic zone', def: 'Below light penetration. Limited primary productivity.' },
    { term: 'estuary', def: 'Where freshwater meets saltwater. Maine has many — Damariscotta, Bagaduce, Casco Bay tributaries, Sheepscot.' },
    { term: 'salinity gradient', def: 'Change in salinity from freshwater to saltwater within an estuary. Affects species distribution.' },
    { term: 'oligohaline', def: 'Low-salinity estuary (0.5-5 PSU). Upper estuary.' },
    { term: 'mesohaline', def: 'Moderate salinity (5-18 PSU). Middle estuary.' },
    { term: 'polyhaline', def: 'High salinity (18-30 PSU). Lower estuary.' },
    { term: 'euhaline', def: 'Marine salinity (30-35+ PSU). Outer estuary + open ocean.' },
    { term: 'eelgrass', def: 'Submerged aquatic grass (Zostera marina). Important nursery habitat. Maine eelgrass declining in many areas.' },
    { term: 'salt marsh', def: 'Coastal wetland dominated by salt-tolerant grasses. Important ecosystem services + ribbed mussel habitat.' },
    { term: 'wrack line', def: 'Line of debris (kelp, shells, plastic) deposited at the high tide mark on beaches.' },
    { term: 'tidal flat', def: 'Mudflat or sandflat exposed at low tide. Soft-shell clam habitat.' },
    { term: 'sheltering', def: 'Reducing wave + wind exposure of a site, naturally (islands, coves) or artificially (breakwaters).' },
    { term: 'flushing time', def: 'Average time for water in a bay to be replaced by tidal exchange. Longer = less waste dispersal.' },
    { term: 'stratification', def: 'Layering of water by density (temperature + salinity). Strong stratification limits vertical mixing.' },
    { term: 'thermocline', def: 'Sharp transition between warm surface + cold deeper water. Summer phenomenon.' },
    { term: 'halocline', def: 'Sharp salinity transition layer.' },
    { term: 'pycnocline', def: 'Sharp density transition layer (combined temp + salinity).' },
    { term: 'upwelling', def: 'Process of deeper, nutrient-rich water rising to surface. Maine has limited upwelling but some coastal upwelling brings cold + nutrients.' },
    { term: 'downwelling', def: 'Sinking water motion. Less ecologically productive but transports oxygen.' },
    { term: 'gyre', def: 'Large-scale circular ocean current pattern. Maine is influenced by the Labrador Current + Gulf Stream interactions.' },
    { term: 'Gulf Stream', def: 'Warm western boundary current of the North Atlantic. Crosses south of Maine; rising influence as climate warms.' },
    { term: 'Labrador Current', def: 'Cold southward current along Canadian Atlantic coast + reaching Maine. Brings cold + nutrients.' },
    { term: 'GoMOOS', def: 'Gulf of Maine Ocean Observing System (predecessor to NERACOOS).' },
    { term: 'remote sensing', def: 'Satellite or aerial measurement of ocean parameters (temperature, color, algae).' },
    { term: 'in situ measurement', def: 'Direct measurement at the location (e.g., probe). Higher accuracy but less spatial coverage.' },
    { term: 'modeling', def: 'Computer simulation of ocean processes. Combined with measurements for predictions + understanding.' },
    { term: 'hydrodynamic model', def: 'Model of water motion (currents, mixing). Used in lease siting + larval dispersal predictions.' },
    { term: 'lagrangian', def: 'Following an individual water parcel (or larva) through space + time.' },
    { term: 'eulerian', def: 'Measuring at fixed locations through time.' },
    { term: 'CTD', def: 'Conductivity, Temperature, Depth — primary oceanographic profiling instrument.' },
    { term: 'rosette', def: 'A multi-bottle water sampler with CTD attached, lowered to collect water at multiple depths.' },
    { term: 'secchi disk', def: 'A black + white disk lowered into water to measure transparency. Cheap + classic field method.' },
    { term: 'plankton net', def: 'A fine-mesh net towed to collect plankton.' },
    { term: 'sediment grab', def: 'A device that closes on the seafloor to grab a sediment sample. Used in benthic surveys.' },
    { term: 'core sample', def: 'A cylindrical sediment sample showing layers over time. Used in paleo + monitoring.' },
    { term: 'benthic survey', def: 'Sampling + analysis of seafloor community.' },
    { term: 'sampling design', def: 'Systematic plan for collecting representative measurements. Statistics-driven.' },
    { term: 'BMP', def: 'Best Management Practice — industry-standard recommended approach.' },
    { term: 'GAP', def: 'Good Aquaculture Practice — standardized husbandry + sanitation guidelines.' },
    { term: 'BAP certification', def: 'Best Aquaculture Practices — third-party sustainability + safety certification.' },
    { term: 'ASC certification', def: 'Aquaculture Stewardship Council — sustainability certification from WWF + Dutch IDH.' },
    { term: 'Seafood Watch', def: 'Monterey Bay Aquarium\'s sustainability rating program. Maine bivalves rated "Best Choice."' },
    { term: 'fair-trade certification', def: 'Certification for products meeting fair-trade standards. Some aquaculture eligible.' },
    { term: 'organic aquaculture', def: 'USDA NOP standards for organic certification. Limited for shellfish (most rules don\'t fit).' },
    { term: 'PSP toxin', def: 'Saxitoxin (+ relatives) from Alexandrium dinoflagellates. Causes paralytic shellfish poisoning.' },
    { term: 'ASP toxin', def: 'Domoic acid from Pseudo-nitzschia. Causes amnesic shellfish poisoning. Rare in Maine.' },
    { term: 'DSP toxin', def: 'Okadaic acid from Dinophysis. Causes diarrhetic shellfish poisoning. Rare in Maine.' },
    { term: 'NSP toxin', def: 'Brevetoxin from Karenia brevis. Gulf of Mexico-typical. Not Maine.' },
    { term: 'biotoxin', def: 'Toxin produced by a living organism. PSP/ASP/DSP/NSP all biotoxins.' },
    { term: 'mussel toxicity', def: 'Different bivalve species accumulate biotoxins at different rates. Mussels are sentinels — accumulate fast + clear fast.' },
    { term: 'tomalley', def: 'The greenish digestive gland inside a lobster. Edible but accumulates contaminants (PCBs, mercury) — pregnant women + children should avoid.' },
    { term: 'shellfish toxicity testing', def: 'Lab analysis (HPLC, mouse bioassay) measuring toxin levels in shellfish meat.' },
    { term: 'mouse bioassay (historical)', def: 'Historical toxicity test. Replaced by HPLC + receptor-binding assays.' },
    { term: 'HPLC', def: 'High-Performance Liquid Chromatography — modern toxin testing method.' },
    { term: 'ELISA', def: 'Enzyme-Linked Immunosorbent Assay — antibody-based test for toxins + pathogens.' },
    { term: 'PCR', def: 'Polymerase Chain Reaction — DNA amplification technique. Used to detect pathogens + species ID.' },
    { term: 'genome sequencing', def: 'Reading the genetic code of an organism. Modern aquaculture uses for selective breeding + disease diagnosis.' },
    { term: 'transgenic', def: 'Organism with introduced genes from another species. AquaBounty\'s salmon (faster-growing) is transgenic — controversial.' },
    { term: 'gene editing (CRISPR)', def: 'Modern technique for precise genome modification. Aquaculture research using CRISPR for disease resistance.' },
    { term: 'selective breeding', def: 'Traditional approach: select + breed for desirable traits over generations. Used for decades in oyster aquaculture.' },
    { term: 'population genetics', def: 'Study of genetic diversity within + among populations. Important for sustainable aquaculture.' },
    { term: 'inbreeding depression', def: 'Reduced fitness from breeding closely-related individuals. A risk in small captive populations.' },
    { term: 'effective population size (Ne)', def: 'Genetics measure of breeding population diversity. Ne < census size; small Ne = vulnerable population.' },
    { term: 'broodstock pedigree', def: 'Genetic family tree of broodstock. Hatcheries maintain to manage diversity + selection.' },
    { term: 'heritability', def: 'How much trait variation is genetically determined. Important for selective breeding.' },
    { term: 'phenotype', def: 'Observable trait (size, color, growth rate).' },
    { term: 'genotype', def: 'The genetic basis of a phenotype.' },
    { term: 'plasticity', def: 'Ability of an organism to change phenotype in response to environment. Some shellfish very plastic.' },
    { term: 'allele', def: 'A version of a gene. Multiple alleles per gene allow population diversity.' },
    { term: 'locus', def: 'A specific location on a chromosome.' },
    { term: 'epigenetic', def: 'Changes in gene expression without changes in DNA sequence. Emerging area in aquaculture science.' },
    { term: 'QTL', def: 'Quantitative Trait Locus — a region of the genome influencing a complex trait. Mapped via genetic studies.' },
    { term: 'marker-assisted selection', def: 'Using DNA markers to identify + breed desirable individuals. Faster than traditional phenotype selection.' },
    { term: 'genomic selection', def: 'Modern approach using whole-genome data for breeding decisions.' },
    { term: 'inbreeding coefficient', def: 'Statistical measure of how related two individuals\' parents were. High = inbreeding.' },
    { term: 'F1 hybrid', def: 'First-generation cross of two different lines. Often shows "heterosis" or hybrid vigor.' },
    { term: 'backcross', def: 'Crossing F1 hybrid back to a parental line.' },
    { term: 'selection differential', def: 'Difference in trait value between selected breeders + population average.' },
    { term: 'selection response', def: 'Trait change in offspring of selected breeders. Heritability × selection differential.' },
    { term: 'population bottleneck', def: 'A drastic reduction in population size, reducing genetic diversity.' },
    { term: 'founder effect', def: 'Reduced diversity from starting a population with few individuals.' },
    { term: 'genetic drift', def: 'Random changes in allele frequencies, especially in small populations.' },
    { term: 'gene flow', def: 'Movement of genes between populations. Important for maintaining diversity.' },
    { term: 'wild × farm interbreeding', def: 'When farmed individuals escape + breed with wild populations. Concern in salmon aquaculture.' },
    { term: 'mariculture', def: 'Saltwater aquaculture. The "marine" version of aquaculture.' },
    { term: 'freshwater aquaculture', def: 'Aquaculture in fresh water. Maine has some (rainbow trout, etc.) but most Maine aquaculture is mariculture.' },
    { term: 'land-based aquaculture', def: 'RAS or pond systems on land. Climate-resilient + biosecure.' },
    { term: 'open-ocean aquaculture', def: 'Offshore aquaculture, beyond state waters. Federal jurisdiction. Largely experimental in US.' },
    { term: 'BOEM permitting', def: 'Bureau of Ocean Energy Management — federal permitting for offshore aquaculture. Slow + complex.' },
    { term: 'AAA (Aquaculture Opportunity Areas)', def: 'NOAA-designated zones for aquaculture in federal waters. Streamlines permitting.' },
    { term: 'siting analysis', def: 'Systematic evaluation of potential aquaculture sites against criteria.' },
    { term: 'ESI (Environmental Sensitivity Index)', def: 'NOAA mapping tool ranking shoreline sensitivity to oil spills + other impacts. Used in siting.' },
    { term: 'EFH (Essential Fish Habitat)', def: 'Federally-designated habitat needed for fish life cycles. Aquaculture in EFH requires additional review.' },
    { term: 'consultation (federal)', def: 'Required review under ESA + EFH provisions. Adds time to permitting.' },
    { term: 'cumulative impact', def: 'Combined effect of multiple aquaculture + other activities on an area.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: QUIZ
  // ───────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'What does "LPA" stand for in Maine aquaculture?',
      a: ['Lobster Permit Application', 'Limited Purpose Aquaculture', 'Local Production Area', 'Licensed Pelagic Authority'],
      correct: 1,
      explain: 'LPA = Limited Purpose Aquaculture. Maine\'s entry-level lease type: up to 1 acre, 3-year term, no public hearing required. The most common starting point for new farmers.' },
    { q: 'Where do blue mussels attach to rope-culture droppers?',
      a: ['Suction cups', 'Byssal threads', 'Calcium pegs', 'Glue from their foot'], correct: 1,
      explain: 'Mussels secrete strong protein "byssal threads" from a gland in their foot. These thread bundles cement them to the dropper line, rock, or any hard substrate. They can release + re-attach if conditions change.' },
    { q: 'You\'re piloting your skiff in the Bagaduce River + see a red conical nun ahead of you. You\'re heading INTO the river from Castine. Which side do you pass it on?',
      a: ['Port (left)', 'Starboard (right)', 'Either', 'Stop and call DMR'], correct: 1,
      explain: 'Red Right Returning. Heading INTO river/harbor in IALA-B = keep red on your starboard (right). Reversed when leaving.' },
    { q: 'A harmful algal bloom triggers a DMR shellfish closure. What does this mean for your mussels?',
      a: ['They die immediately', 'You can\'t harvest until reopened', 'You must move them', 'Nothing — closure is for clams only'], correct: 1,
      explain: 'During a DMR closure (PSP, vibrio, sewage, etc.), no shellfish from that area can be sold. The shellfish themselves often survive — the toxin is accumulated in their tissue + clears with time. But you can\'t market until DMR reopens the area.' },
    { q: 'What is "depuration"?',
      a: ['Sorting by size', 'Cleaning gear', 'Holding shellfish in clean water to purge contaminants', 'A lease renewal step'], correct: 2,
      explain: 'Depuration = holding shellfish in clean filtered seawater (usually 48 hours) to let them naturally purge accumulated contaminants. Used after some closures or when shellfish are harvested from marginal areas.' },
    { q: 'Why is Damariscotta-region water particularly good for oyster aquaculture?',
      a: ['Warm summer temps', 'Saline + tidally well-flushed estuary', 'Freshwater inflow', 'Shallow sandy bottom'], correct: 1,
      explain: 'Damariscotta River is a saline, tidally well-flushed estuary with consistent salinity, good food (chlorophyll-a from regular tidal exchange), + cold-enough water to limit MSX/Dermo disease. World-class oyster water.' },
    { q: 'What is a "v-notch" on a lobster, and is it relevant for AquacultureLab?',
      a: ['Aquaculture method — yes', 'Conservation mark — only relevant to lobstering', 'Type of gear damage', 'A water sample notation'], correct: 1,
      explain: 'V-notch is a conservation mark cut into the tail flipper of egg-bearing female lobsters by Maine lobstermen, protecting her from harvest for life. NOT directly relevant to shellfish farming, but every Maine waterman knows it.' },
    { q: 'A standard aquaculture lease in Maine has a maximum size of:',
      a: ['1 acre', '10 acres', '100 acres', '1000 acres'], correct: 2,
      explain: 'Maine standard leases can be up to 100 acres (vs 1-acre LPA and 4-acre experimental). 100 acres is rare in practice; most farms are 5-30 acres.' },
    { q: 'What is biofouling?',
      a: ['Bacteria in food', 'Unwanted organisms growing on gear or shells', 'Algae bloom in summer', 'Sediment in nets'], correct: 1,
      explain: 'Biofouling = barnacles, tunicates, hydroids, bryozoans, algae growing on your ropes, socks, cages, or product shells. Adds weight, reduces water flow, can smother product. Every farmer plans for it.' },
    { q: 'In Maine aquaculture, "abutter" refers to:',
      a: ['The skiff captain', 'A neighboring property owner who can object at a lease hearing', 'A seed supplier', 'A buyer'], correct: 1,
      explain: 'Abutters = adjacent landowners. They have legal standing at public hearings for standard leases. Common objections: view shed, navigation, water access for personal use. LPA leases skip this step.' },
    { q: 'What does pH measure, and why does it matter for shellfish larvae?',
      a: ['Plankton density; affects food', 'Acidity; lower pH dissolves larval shells', 'Pressure; affects deep gear', 'Phosphate; eutrophication'], correct: 1,
      explain: 'pH measures acidity (low pH = acidic). The Gulf of Maine is acidifying (CO₂ + freshwater inputs). Low pH dissolves calcium carbonate larval shells before they can form. Maine hatcheries buffer water during shell-formation stage.' },
    { q: 'What is the typical "seed-to-market" time for blue mussels in Maine?',
      a: ['3-6 months', '12-18 months', '18-24 months', '4-5 years'], correct: 2,
      explain: '18-24 months in Maine waters. Faster in warmer waters; slower in cold deep water. The 1.5-2 year capital tie-up is one reason aquaculture is hard to enter.' },
    { q: 'Kelp aquaculture in Maine is primarily a:',
      a: ['Summer crop', 'Year-round crop', 'Winter crop (Nov-May harvest)', 'Spring-only crop'], correct: 2,
      explain: 'Sugar kelp is a winter crop in Maine — seed in October-November, harvest April-May. Uses the same boats + leases that are idle during winter mussel + lobster off-season. Climate-friendly + good income-stacking.' },
    { q: 'You hear a "MAYDAY" call on Channel 16 while on your skiff. What\'s the appropriate response?',
      a: ['Switch to Channel 9 immediately', 'Listen, respond if you can render aid, do not transmit unless asked', 'Tell them to call the Coast Guard', 'Ignore — it\'s for big boats'], correct: 1,
      explain: 'MAYDAY = life-threatening emergency. Coast Guard answers. As a nearby vessel, you LISTEN, render aid if asked + capable. Do not transmit on Ch 16 unless necessary — that channel needs to stay clear for the distress traffic.' },
    { q: 'What does the ocean acidification trend mean for Maine shellfish aquaculture long-term?',
      a: ['No effect — shells are tough', 'Faster growth from CO₂', 'Increased larval mortality + hatchery costs to buffer', 'Better-tasting product'], correct: 2,
      explain: 'Acidifying water increases mortality at the larval stage, when shells are first forming. Hatcheries buffer water during this window — but it adds cost + risk. Selective breeding for tolerance is active research at Bigelow + UMaine.' },
    { q: 'A triploid oyster is one that:',
      a: ['Has three colors', 'Has three sets of chromosomes + doesn\'t spawn', 'Lives in groups of three', 'Has three valves'], correct: 1,
      explain: 'Triploid shellfish (three chromosome sets vs diploid two) don\'t channel energy into spawning. Faster growth + year-round marketability.' },
    { q: 'What is FLUPSY in aquaculture?',
      a: ['A type of feed', 'A boat type', 'A FLoating UPwellinG SYstem for nursery spat', 'An invasive species'], correct: 2,
      explain: 'FLUPSY = floating barge with upweller tanks for the nursery phase of shellfish. Common in Maine harbors.' },
    { q: 'Why is "cultch" important in oyster aquaculture?',
      a: ['It\'s the food', 'It\'s the substrate spat settles on', 'It\'s a disease', 'It\'s a regulation'], correct: 1,
      explain: 'Cultch = substrate (usually old oyster shell) that spat lands on + grows attached to. Without it, you can\'t do spat-on-shell. Cultchless seed = each spat grows individually on a tiny grit particle.' },
    { q: 'NSSP closure for a shellfish flat would NOT typically be triggered by:',
      a: ['Heavy rain in a cond-approved area', 'PSP toxin levels', 'Vibrio outbreak', 'Slow tides'], correct: 3,
      explain: 'Closures trigger from rain (cond-approved areas), HABs/biotoxins (PSP, ASP), sewage spills, vibrio. Slow tides aren\'t a closure trigger.' },
    { q: 'Mook Sea Farms is best known as:',
      a: ['A kelp processor', 'Maine\'s leading oyster hatchery + farm (Walpole, ME)', 'A salmon farmer', 'A research institute only'], correct: 1,
      explain: 'Mook Sea Farms in Walpole, ME has been Maine\'s oyster industry anchor since 1985. They supply seed + farm oysters under the Mook brand.' },
    { q: 'Damariscotta Mills is famous for:',
      a: ['A windmill', 'Annual alewife river run + fishway', 'Lobster harbor', 'Hatchery'], correct: 1,
      explain: 'Damariscotta Mills alewife run is one of Maine\'s most iconic sea-run fish events, and the fishway restoration involves multiple stakeholders including Wabanaki nations. Annual run draws community + tourism.' },
    { q: 'In NSSP terminology, what does "depuration" mean?',
      a: ['Drying out shellfish', 'Cleaning gear', 'Holding shellfish in clean filtered seawater 48+ hrs to purge contaminants', 'Selling at premium'], correct: 2,
      explain: 'Depuration = regulated process of clean-water holding for ≥48 hr to purge contaminants. Used after some closures.' },
    { q: 'Black sea bass arriving in Maine waters reliably is a sign of:',
      a: ['Improved water quality', 'Climate-driven range shift north', 'Aquaculture escape', 'Recovery from overfishing'], correct: 1,
      explain: 'Black sea bass historically range south of Cape Cod. Warming Gulf of Maine has pushed them reliably into Maine waters in past decade.' },
    { q: 'The Penobscot River Restoration Project notably:',
      a: ['Removed 2 dams + bypassed 1 to restore 1000+ river miles for sea-run fish', 'Built new dams', 'Filled the river with hatchery fish', 'Only affected freshwater fishing'], correct: 0,
      explain: 'Multi-tribal-led Penobscot Project (2004-2016) removed Great Works + Veazie dams + bypassed Howland. Restored sea-run fish access. Major restoration win.' },
    { q: 'In Maine LPA leases, abutters CAN object at:',
      a: ['Public hearing', 'A public hearing is not required for LPA', 'After application is approved', 'Only at renewal'], correct: 1,
      explain: 'LPA (Limited Purpose Aquaculture) leases do NOT require public hearing. Standard + experimental leases do. That\'s a major advantage of LPA for new entrants.' },
    { q: 'What is one ecosystem service shellfish aquaculture provides for free?',
      a: ['Higher tides', 'Wave damping', 'Water filtration + nitrogen capture', 'Beach replenishment'], correct: 2,
      explain: 'A single oyster filters 50-100 L/day. Bivalve farms can substantially improve coastal water quality + capture nutrients. Increasingly valued ecosystem service.' },
    { q: 'Maine\'s salmon aquaculture industry (Cooke Aquaculture) is centered in:',
      a: ['Portland', 'Cobscook + Machias Bay (eastern Maine)', 'Casco Bay', 'Long Lake'], correct: 1,
      explain: 'Cooke operates in eastern Maine bays (Cobscook + Machias). The industry has shrunk significantly since peak. Land-based RAS may replace.' },
    { q: 'OsHV-1 (oyster herpes virus) is a major problem for:',
      a: ['Maine\'s eastern oysters', 'Pacific oysters in EU + Pacific NW', 'Quahogs', 'Mussels'], correct: 1,
      explain: 'OsHV-1 attacks Pacific oysters (C. gigas). Eastern oysters (C. virginica), the Maine species, appear resistant. Vigilance against any Pacific oyster introduction protects this resistance.' },
    { q: 'The Gulf of Maine warmed at what rate compared to global ocean during 2004-2013?',
      a: ['About the same', '2× faster', '4× faster', '10× faster'], correct: 2,
      explain: 'Pershing 2015 documented ~4× global ocean rate. Maine is among the fastest-warming marine regions on Earth.' },
    { q: 'What\'s the difference between aquaculture "wild-set seed" and "hatchery seed"?',
      a: ['No difference', 'Wild-set comes from natural recruitment; hatchery is produced in controlled spawn', 'Wild-set is more expensive', 'Hatchery seed grows in fresh water'], correct: 1,
      explain: 'Wild-set seed is collected from natural spat recruitment on suitable substrate. Hatchery seed is spawned + reared under controlled conditions. Most Maine farms use hatchery seed for consistency.' },
    { q: 'Why are kelp + bivalve aquaculture considered "climate-positive"?',
      a: ['They use no fuel', 'They sequester carbon + capture nitrogen', 'They are tax-deductible', 'They grow underwater'], correct: 1,
      explain: 'Bivalves filter water + capture nitrogen; kelp absorbs CO₂ + nutrients while growing. Both can be net carbon-negative food systems — among the few.' },
    { q: 'A "right whale entanglement" is a fisheries concern because:',
      a: ['Aquaculture vertical lines can entangle critically-endangered N Atlantic right whales (~340 individuals)', 'Whales eat shellfish', 'Whales damage gear by colliding', 'Right whales transmit disease'], correct: 0,
      explain: 'Vertical mooring lines in lobster + aquaculture gear can entangle right whales. With only ~340 individuals + a critically-endangered designation, every entanglement matters. New "ropeless gear" rules emerging.' },
    { q: 'NERACOOS is:',
      a: ['Maine\'s fisheries lobby', 'Northeast Regional Association of Coastal Ocean Observing Systems — buoy + sensor network', 'A type of aquaculture gear', 'A nonprofit'], correct: 1,
      explain: 'NERACOOS operates a regional ocean observation network. Maine farmers use it daily for real-time water-quality + weather data.' },
    { q: 'A green crab in Maine is best described as:',
      a: ['Native + abundant', 'Invasive + a major threat to soft-shell clams + eelgrass', 'Protected species', 'A premium food product'], correct: 1,
      explain: 'Carcinus maenas is invasive. Causes major damage to Maine soft-shell clam flats + eelgrass habitats. Also one of the BEST baits for tautog — turning the problem into an opportunity.' },
    { q: 'In Maine, who has legal standing to object at a standard aquaculture lease hearing?',
      a: ['Only the state', 'Only abutters', 'Abutters + the general public', 'Only commercial fishermen'], correct: 2,
      explain: 'Standard lease public hearings are open. Abutters (adjacent property owners) + members of the public can testify + object. DMR adjudicator weighs concerns.' },
    { q: 'What does it mean if shellfish are "in the slot"?',
      a: ['They\'re packaged ready', 'They are within legal harvest size range', 'They\'re in the storage tank', 'They have a parasite'], correct: 1,
      explain: 'For some species (esp. striped bass), slot rules require fish be within a min-max size range. For shellfish, similar size grading applies — undersized released, oversized typically marketable for chowders.' },
    { q: 'The Wabanaki nations include all of these EXCEPT:',
      a: ['Penobscot', 'Passamaquoddy', 'Maliseet', 'Wampanoag'], correct: 3,
      explain: 'The Wabanaki Confederacy: Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq. Wampanoag are a separate nation centered in southern Massachusetts + Cape Cod.' },
    { q: 'Whole Oceans is building what kind of aquaculture facility in Bucksport, ME?',
      a: ['Sea cage salmon farm', 'Land-based RAS (recirculating aquaculture system) salmon facility', 'Kelp processor', 'Lobster hatchery'], correct: 1,
      explain: 'Whole Oceans Bucksport facility is a land-based RAS salmon operation — among the world\'s largest planned. Climate-resilient + biosecure.' },
    { q: 'Why does Maine have specific tides + currents that aquaculture farmers must plan around?',
      a: ['Maine has no significant tides', 'Maine has semidiurnal tides with 8-25 ft range; currents drive water exchange critical for bivalve growth', 'Tides only matter for shellfish at intertidal sites', 'Tides are only relevant for boating'], correct: 1,
      explain: 'Maine tides are semidiurnal (2 highs + 2 lows daily). Range varies from ~9 ft (Casco Bay) to 25+ ft (Eastport/Bay of Fundy). Currents drive food + waste exchange at lease sites + access timing.' },
    { q: 'Maine\'s soft-shell clam industry is town-managed because:',
      a: ['State law was never written', 'Towns set local rules + issue commercial + recreational digging permits via local clam committees', 'Federal jurisdiction', 'Private property rights'], correct: 1,
      explain: 'Maine\'s soft-shell clams are managed by individual towns through clam committees that set seasons + bag limits + issue permits. Each town\'s rules differ. Decentralized + community-based.' },
    { q: 'In IMTA (Integrated Multi-Trophic Aquaculture), what species combination is classic?',
      a: ['Salmon + chickens + cows', 'Fed species (salmon) + extractive species (kelp) + filter feeders (bivalves)', 'Only finfish', 'Only shellfish'], correct: 1,
      explain: 'Classic IMTA: salmon (fed) provides dissolved + particulate nutrients. Kelp extracts dissolved nutrients. Bivalves filter particulate. Each species\' waste = the next\'s input. Reduces net waste + adds income streams.' },
    { q: 'You\'re a hatchery operator. Larvae are at "eyed" stage. What\'s next?',
      a: ['Discard', 'Setting (settlement on cultch + metamorphosis)', 'Spawning', 'Harvest'], correct: 1,
      explain: 'Eyed larvae are ready to settle. Hatchery provides cultch (shell or screen) + induces settlement. Critical bottleneck stage — many die at metamorphosis. After setting, they\'re "spat."' },
    { q: 'A triploid oyster\'s commercial advantage is:',
      a: ['Bigger shell', 'Doesn\'t spawn — channels energy into growth + remains marketable year-round (no "fat" summer oysters)', 'Resistant to all disease', 'Faster to harvest'], correct: 1,
      explain: 'Diploid oysters spawn in summer + become "milky" + thin-meated. Triploids don\'t spawn — they keep growing + stay marketable. Increasingly the commercial standard for premium markets.' },
    { q: 'The "blue carbon" framing of aquaculture is best characterized as:',
      a: ['Always carbon-negative', 'Modestly carbon-neutral-to-positive for bivalves; carbon-capture for kelp; honest about limits', 'Marketing only', 'Federal mandate'], correct: 1,
      explain: 'Aquaculture\'s climate benefits are real but modest + variable. Bivalves: roughly neutral on CO₂ (shell forming releases some CO₂); kelp: captures carbon during growth + provides ecosystem services. Best framing: low-carbon + water-improving food system.' },
    { q: 'You\'re considering a 1-acre LPA lease. Approximate first-year revenue?',
      a: ['$100,000+', '$25,000-$50,000', 'Mostly zero (seed year)', 'Same as a standard lease'], correct: 2,
      explain: 'Year 1 of a mussel LPA is almost entirely investment + seed-out. Real revenue starts year 2. Plan for 18-24 month payback minimum. Budget accordingly.' },
    { q: 'Maine\'s "working waterfront access" is:',
      a: ['Always private', 'Protected by Maine Working Waterfront Access Protection Program — state-level conservation easements + zoning to preserve commercial fishing + aquaculture infrastructure', 'A federal program', 'Open to all without restriction'], correct: 1,
      explain: 'Maine\'s Working Waterfront Access Protection Program uses conservation easements + zoning to preserve commercial fishing + aquaculture dock + warehouse + processing space. Critical for industry survival against waterfront gentrification.' },
    { q: 'What is "remote setting" in oyster aquaculture?',
      a: ['Hatchery far away', 'Grower buys eyed larvae + sets them on own cultch at home', 'Distance learning', 'Underwater setting'], correct: 1,
      explain: 'Remote setting saves 30-50% over buying set seed. Grower receives eyed larvae from hatchery + sets them on own cultch in dockside tanks. Requires water-quality monitoring + algae feed but is cost-effective.' },
    { q: 'In NSSP, what does "Conditionally Approved" water classification mean?',
      a: ['Harvest always allowed', 'Harvest allowed except after specified trigger events (e.g., heavy rain causes 24-hr closure)', 'No harvest ever', 'Depuration required'], correct: 1,
      explain: 'Conditionally Approved waters allow harvest UNLESS a trigger event (rain, sewage spill) closes them temporarily. Common for many Maine areas. Farmers track triggers + manage harvest schedule around them.' },
    { q: 'What is a "shellfish midden"?',
      a: ['A bait container', 'Mound of accumulated discarded shells from human harvest — archaeological evidence of long-term shellfish use', 'A fish trap', 'A type of boat'], correct: 1,
      explain: 'Maine shell middens at Damariscotta + Whaleback are among the largest on the Atlantic coast — 6,000+ years of Wabanaki harvest. Archaeological + cultural record.' },
    { q: 'The Penobscot River Restoration Project removed how many dams?',
      a: '1|2|3|4'.split('|'), correct: 1,
      explain: '2 dams removed (Great Works + Veazie) + 1 bypass (Howland). Opened 1,000+ river miles to sea-run fish. Multi-tribal-led; one of largest river restorations in N. America.' },
    { q: 'What is a "phytoplankton bloom"?',
      a: ['Algae growing on equipment', 'Rapid increase in microscopic algae triggered by nutrient + light conditions; foundation of marine food web (or HAB if toxic species dominate)', 'A type of seed', 'A vibrant water color'], correct: 1,
      explain: 'Phytoplankton blooms drive food webs. Most beneficial; toxic blooms (Alexandrium, Pseudo-nitzschia) cause closures. Maine has spring + fall blooms; summer warm-water blooms are climate-shifting.' },
    { q: 'Mook Sea Farms\' contribution to Maine industry is best described as:',
      a: ['Sells consumer oysters only', 'Provides seed to Maine oyster industry + grows own brand on Damariscotta River', 'Only research', 'Federal contractor'], correct: 1,
      explain: 'Mook Sea Farms (founded 1985, Walpole ME) is Maine\'s anchor oyster hatchery. Supplies seed to most Maine oyster farms. Also grows + brands their own oysters. Without Mook, Maine\'s oyster industry would barely exist.' },
    { q: 'Why is the Damariscotta River particularly good for oyster aquaculture?',
      a: ['Warm water', 'Saline + tidally well-flushed estuary with consistent salinity + good food + cold enough to suppress MSX/Dermo disease', 'Freshwater spring', 'Volcanic seabed'], correct: 1,
      explain: 'Damariscotta River is a saline + tidally well-flushed estuary. Cold water suppresses warm-water diseases. Premium oyster terroir. The "Bordeaux of US oysters."' },
    { q: 'When does Maine\'s sugar kelp season run?',
      a: ['Summer', 'Year-round', 'Late fall through late spring (Nov seed → Apr-May harvest)', 'Only spring'], correct: 2,
      explain: 'Sugar kelp is a winter crop in Maine. Seeded in October-November; rapid growth through cold winter; harvested April-May before warming water triggers degradation. Climate-positive + climate-resilient.' },
    { q: 'In Maine aquaculture, a "tribally-led" aquaculture project means:',
      a: ['Tribal members work the farm', 'Operated under tribal government sovereignty; sometimes in tribal-claim waters; tribal economic + cultural benefit', 'Only on reservations', 'Always small-scale'], correct: 1,
      explain: 'Tribally-led aquaculture (Penobscot, Passamaquoddy, etc.) operates under tribal sovereignty + benefits tribal community. Emerging area; affirms tribal rights + food sovereignty.' },
    { q: 'You\'re a kelp farmer. Late spring temperatures rise above 12°C. What\'s happening?',
      a: ['Better growth', 'Kelp will slough + degrade — time to harvest', 'Need more seed', 'Nothing'], correct: 1,
      explain: 'Sugar kelp thrives in cold water. As spring warms above ~12-15°C, kelp degrades + sloughs. Harvest BEFORE this happens. Climate-positive species in cold-water regions.' },
    { q: 'A "vibrio control plan" in NSSP is:',
      a: ['Random regulations', 'Time-temperature controls during summer to prevent Vibrio parahaemolyticus growth in shellfish', 'A type of pest', 'A vaccine'], correct: 1,
      explain: 'Vp grows in warm water + warm shellfish. Maine summer harvest must move from boat to refrigeration in strict time windows depending on ambient temp. Federal NSSP framework, state-implemented.' },
    { q: 'What is the difference between a "wholesale" + "direct-to-consumer" price for an oyster?',
      a: ['No difference', 'Wholesale ~$0.30-$0.60; D2C $1-$3+ — D2C often DOUBLES income', 'D2C is cheaper', 'Wholesale is illegal'], correct: 1,
      explain: 'D2C (farmers market, restaurant, online) commands premium prices vs wholesale (distributor). For small Maine farms, D2C can double effective income. Story + relationship + freshness are competitive advantages.' },
    { q: 'A "lease application" in Maine aquaculture involves:',
      a: ['Just a fee', 'Site selection + application + (for standard) public hearing + DMR review + adjudicator decision; takes 6-18 months', 'Instant approval', 'Town committee only'], correct: 1,
      explain: 'Standard + experimental leases require detailed site selection + business plan + environmental assessment + public hearing + DMR review. Months-long process. LPA is faster (no public hearing).' },
    { q: 'The Atlantic Sea Farms model in Maine is:',
      a: ['Single large farm', 'Hub: buys kelp from ~20 partner growers + processes + markets to retail', 'Hatchery only', 'Boat builder'], correct: 1,
      explain: 'Atlantic Sea Farms aggregates kelp from many small Maine partner growers. Provides seed + training + market. Lowers risk for individual operators. Industry-builder model.' },
    { q: 'Why is the Bagaduce River known for mussels?',
      a: ['Random', 'Protected estuary + good tidal flushing + cold clean water = ideal mussel growing conditions', 'Federal designation', 'Sea ice'], correct: 1,
      explain: 'Bagaduce is a protected estuary on Penobscot Bay. Tidal flushing + cold + clean water + manageable salinity + protected from major storms = world-class mussel water. Bagaduce River Mussels was a pioneering operation.' },
    { q: 'A "PSP closure" prohibits harvest because:',
      a: ['Workers strike', 'Saxitoxin levels in shellfish exceed safe thresholds — paralytic shellfish poisoning risk to humans', 'Weather', 'Out of season'], correct: 1,
      explain: 'PSP (paralytic shellfish poisoning) is caused by saxitoxin from Alexandrium dinoflagellates. Shellfish accumulate the toxin while filter-feeding during a bloom. Eating contaminated shellfish causes paralysis + death. DMR closes affected areas until tissue tests clear.' },
    { q: 'Maine\'s aquaculture industry is at approximately what economic scale?',
      a: ['$1M/yr', '$100M+/yr (combining mussel, oyster, kelp, salmon, finfish)', '$1B/yr', '$10B/yr'], correct: 1,
      explain: 'Maine aquaculture totals ~$100M annually. Mussels + oysters + kelp + salmon + finfish combined. Industry growing significantly + projected to expand with land-based RAS facilities + climate adaptation.' },
    { q: 'Your mussel droppers are accumulating heavy tunicate fouling. What\'s the standard response?',
      a: ['Ignore', 'Air-drying the droppers in air for 24 hr kills most tunicates; tumbling oyster cages also helps', 'Use bleach', 'Burn'], correct: 1,
      explain: 'Tunicate fouling adds weight + competition. Many tunicates die after 24+ hours of air exposure. Some farmers pull + dry gear periodically. Tumbling oyster cages mechanically disrupts settling.' },
    { q: 'What is an "abutter" in Maine aquaculture lease law?',
      a: ['A type of buoy', 'An adjacent property owner with legal standing to object at a standard-lease public hearing', 'A processor', 'A vendor'], correct: 1,
      explain: 'Abutters (adjacent landowners) have legal standing at public hearings for standard-lease applications. Their concerns must be addressed by the applicant. Engage them BEFORE submitting application.' },
    { q: 'A "downwelling" in oceanography means:',
      a: ['Tide going out', 'Surface water sinking; opposite of upwelling', 'Algae bloom', 'Hurricane'], correct: 1,
      explain: 'Downwelling = surface water sinking. Less productive (no nutrient resupply from depths) but transports oxygen down. Maine has limited large-scale upwelling/downwelling but coastal versions occur.' },
    { q: 'Cooke Aquaculture, Maine\'s salmon producer, is centered in:',
      a: ['Portland', 'Cobscook + Machias Bay (eastern Maine)', 'Casco Bay', 'Damariscotta'], correct: 1,
      explain: 'Cooke operates salmon sea cages in eastern Maine bays. Maine\'s largest aquaculture by tonnage; controversial environmentally + due to tribal-rights conflicts.' },
    { q: 'Whole Oceans is building what kind of facility in Bucksport, ME?',
      a: ['Lobster hatchery', 'Land-based RAS (recirculating aquaculture system) salmon facility — among world\'s largest planned', 'Mussel farm', 'Sardine cannery'], correct: 1,
      explain: 'Whole Oceans land-based RAS salmon facility under construction in Bucksport. Climate-resilient + biosecure + reduces sea-cage environmental issues. Industry forward-looking.' },
    { q: 'What does it mean to "set" an anchor properly?',
      a: ['Throw it overboard', 'Lower gently to bottom, pay out scope, let wind/current pull boat back to dig anchor in, check for hold (not dragging)', 'Tie to a rock', 'Use multiple anchors'], correct: 1,
      explain: 'Setting an anchor: drop gently (not throw), pay out 5:1+ scope, let wind/current pull boat backward to drag anchor + set. Check for non-drag (use shore landmarks). Then secure rode.' },
    { q: 'What is "spat fall" in aquaculture?',
      a: ['Falling tide', 'Mass settlement of bivalve larvae onto suitable substrate', 'Storm damage', 'Failed spawn'], correct: 1,
      explain: 'Spat fall = wild larvae settling on substrate (cultch). Hatcheries induce this with control; growers can also catch wild spat by deploying clean substrate at the right time.' }
  ];

  // ───────────────────────────────────────────────────────────
  // DATA: MISSIONS
  // ───────────────────────────────────────────────────────────
  var MISSIONS = [
    { id: 'mission-1', title: 'First Day on the Bagaduce',
      brief: 'Cast off from the town landing in Castine. Navigate the Bagaduce River channel (red-right-returning) to your 1-acre LPA lease. Deploy 5 dropper lines pre-seeded with mussel spat. Return to dock.',
      objectives: [
        'Cast off + safety check',
        'Pass at least one red nun on your starboard side going up-river',
        'Reach your lease (yellow buoy waypoint)',
        'Press F at the lease to drop a seeded line (5 drops total)',
        'Return to landing'
      ],
      reward: 'Unlocks Mission 2 + first lease log entry' },
    { id: 'mission-2', title: 'Water Quality Check',
      brief: 'August. Heat wave. You\'re worried about your mussels — DO depletion + warm spikes have killed crops downriver. Trip out, deploy water-quality probe at three depths, log the readings. Decide whether to act.',
      objectives: [
        'Reach lease',
        'Deploy probe at 1m, 4m, 8m (press F at each)',
        'Log readings (compare to optimal ranges)',
        'Return + decision: lower socks? thin density? wait?'
      ],
      reward: 'Unlocks economics tab + Mission 3' },
    { id: 'mission-3', title: 'Harvest Run',
      brief: 'November. Your 18-month mussels are ready. Pull all 5 droppers, sort + grade, totes to the dock, weighing + market math. Watch your fuel + your tide window.',
      objectives: [
        'Reach lease before high tide turns',
        'Pull all 5 droppers',
        'Grade keepers (≥1.5") vs unders',
        'Return + log harvest tonnage'
      ],
      reward: 'Unlocks Free Sim Mode' },
    { id: 'mission-4', title: 'Public Hearing Day',
      brief: 'You\'re applying for a 5-acre standard lease. Public hearing is in 2 weeks. Prepare presentation; respond to abutter concerns; navigate the process.',
      objectives: [
        'Talk to all 4 abutter properties beforehand',
        'Prepare site map + business plan',
        'Address common objections at hearing',
        'Receive DMR adjudicator decision'
      ],
      reward: 'Lease Application card.' },
    { id: 'mission-5', title: 'HAB Closure Decision',
      brief: 'DMR has just issued PSP closure for your area. Your mussels are ready to harvest but you can\'t sell. Plan response.',
      objectives: [
        'Check DMR closure bulletin',
        'Calculate: hold + wait, or harvest later?',
        'Coordinate with buyers (delays)',
        'Monitor biotoxin levels for reopening'
      ],
      reward: 'Crisis Management card.' },
    { id: 'mission-6', title: 'Kelp Harvest Cycle (Winter)',
      brief: 'February. Sugar kelp is ready. Cold weather, rough seas, but a profitable winter income.',
      objectives: [
        'Check weather + tide windows',
        'Pull longlines',
        'Cut + bag fresh kelp',
        'Pre-arrange buyer pickup at dock'
      ],
      reward: 'Kelp Farmer card + winter income unlock.' },
    { id: 'mission-7', title: 'Probe + Adjust',
      brief: 'August heatwave. DO crashing in your back cove. Decide: thin density, deepen socks, or wait it out.',
      objectives: [
        'Take probe readings at 3 depths',
        'Calculate growth-rate + mortality models',
        'Make + execute response decision',
        'Track outcome over following weeks'
      ],
      reward: 'Adaptive Manager card.' },
    { id: 'mission-8', title: 'Hatchery Trip',
      brief: 'Pick up seasonal seed from Mook Sea Farms hatchery. Plan transport + cold-chain handling.',
      objectives: [
        'Place order in season',
        'Pickup at hatchery',
        'Cold-chain transport home',
        'Settle into nursery within window'
      ],
      reward: 'Hatchery Partner card.' },
    { id: 'mission-9', title: 'Storm Prep + Recovery',
      brief: 'Nor\'easter forecast 36 hr out. Prepare gear; ride out storm; recover any damage.',
      objectives: [
        'Add scope to anchor lines',
        'Pull at-risk gear',
        'Secure dock + boat',
        'Inventory damage post-storm',
        'Submit insurance claim if needed'
      ],
      reward: 'Storm Veteran card.' },
    { id: 'mission-10', title: 'Direct-to-Consumer Launch',
      brief: 'Start a CSA-style oyster subscription. Brand, price, market, deliver.',
      objectives: [
        'Develop brand + story',
        'Set subscription tier prices',
        'Acquire 10 subscribers',
        'Deliver weekly for 4 weeks',
        'Earn first month revenue'
      ],
      reward: 'Entrepreneur card.' },
    { id: 'mission-11', title: 'Climate Adaptation Plan',
      brief: 'You\'ve been farming 10 years. Climate is shifting your assumptions. Diversify species + sites.',
      objectives: [
        'Review climate impact data',
        'Identify 2 species to trial',
        'Identify 1 alternate site',
        'Build 5-year plan'
      ],
      reward: 'Climate-Adaptive Farmer card.' },
    { id: 'mission-12', title: 'Apprentice an Aquaculture Student',
      brief: 'You\'ve taken on a UMaine + CCAR student summer apprentice. Show them the cycle.',
      objectives: [
        'Walk through site selection lessons',
        'Demonstrate seed deployment',
        'Teach water quality monitoring',
        'Help them plan an independent project'
      ],
      reward: 'Mentor card.' },
    { id: 'mission-13', title: 'Free Sim — Bagaduce',
      brief: 'Open mode. Run your farm at your pace.',
      objectives: ['Cast off', 'Deploy + monitor + harvest as you choose', 'Track over multiple sim seasons'],
      reward: 'Personal logbook entries.' }
  ];

  // ───────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────
  var AQ_KEY = 'aquacultureLab.state.v1';
  function loadState() {
    try {
      var raw = window.localStorage.getItem(AQ_KEY);
      var s = raw ? JSON.parse(raw) : {};
      return Object.assign({
        region: DEFAULT_REGION,
        completedMissions: {},
        harvests: [], // [{species, kg, date}]
        droppersDeployed: 0,
        probeReadings: [],
        a11y: { staticCamera: false }
      }, s);
    } catch (_) {
      return { region: DEFAULT_REGION, completedMissions: {}, harvests: [], droppersDeployed: 0, probeReadings: [], a11y: {} };
    }
  }
  function saveState(s) { try { window.localStorage.setItem(AQ_KEY, JSON.stringify(s)); } catch (_) {} }

  // ───────────────────────────────────────────────────────────
  // THREE.JS LOADER
  // ───────────────────────────────────────────────────────────
  function ensureThreeJS(onReady, onError) {
    if (window.THREE) { onReady(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = function() { console.log('[AquacultureLab] three.js loaded'); onReady(); };
    s.onerror = function() {
      console.error('[AquacultureLab] three.js failed to load');
      if (onError) onError();
    };
    document.head.appendChild(s);
  }

  // ───────────────────────────────────────────────────────────
  // 3D SCENE — Bagaduce River farm
  // ───────────────────────────────────────────────────────────
  function initFarmSim(canvas, opts) {
    var THREE = window.THREE;
    if (!THREE || !canvas) return null;

    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
    if (opts && opts.staticCamera) reducedMotion = true;

    var W = canvas.clientWidth || 720;
    var H = canvas.clientHeight || 420;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc4d8e3); // overcast Maine sky
    scene.fog = new THREE.Fog(0xb0c8d8, 60, 380);

    var camera = new THREE.PerspectiveCamera(65, W / H, 0.5, 1000);
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 1.5, 0);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);

    // Lights
    var ambient = new THREE.AmbientLight(0xe6eef2, 0.7);
    scene.add(ambient);
    var sun = new THREE.DirectionalLight(0xfff2c8, 0.7);
    sun.position.set(50, 80, 30);
    scene.add(sun);
    var hemi = new THREE.HemisphereLight(0xc8d8e0, 0x3a5a4f, 0.55);
    scene.add(hemi);

    // Water plane (river — slightly browner than open ocean)
    var waterGeo = new THREE.PlaneGeometry(1200, 1200, 80, 80);
    var waterMat = new THREE.MeshLambertMaterial({ color: 0x3a6b6c, transparent: true, opacity: 0.95 });
    var water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    var waterPositions = waterGeo.attributes.position;
    var waterPosArr = waterPositions.array;
    var initialZ = new Float32Array(waterPosArr.length / 3);
    for (var iw = 0; iw < waterPosArr.length / 3; iw++) initialZ[iw] = waterPosArr[iw * 3 + 2];

    // Boat (working skiff — stubbier than fishing skiff, more deck for gear)
    var boat = new THREE.Group();
    var hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 5.0), new THREE.MeshLambertMaterial({ color: 0xe8e3d0 }));
    hull.position.y = 0.3;
    boat.add(hull);
    var deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 4.5), new THREE.MeshLambertMaterial({ color: 0xb09a7c }));
    deck.position.y = 0.62;
    boat.add(deck);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a5566 }));
    cabin.position.set(0, 1.1, 1.0);
    boat.add(cabin);
    // davit (gear-handling boom)
    var davit = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), new THREE.MeshLambertMaterial({ color: 0x444444 }));
    davit.position.set(0.7, 1.8, -0.5);
    davit.rotation.z = Math.PI / 8;
    boat.add(davit);
    var motor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.5), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    motor.position.set(0, 0.6, -2.4);
    boat.add(motor);
    boat.position.set(0, 0, 6);
    scene.add(boat);

    // Buoyage — narrow channel
    var buoys = [];
    function addBuoy(x, z, type) {
      var g = new THREE.Group();
      if (type === 'red-nun') {
        var coneGeo = new THREE.ConeGeometry(0.5, 1.4, 16);
        var cone = new THREE.Mesh(coneGeo, new THREE.MeshLambertMaterial({ color: 0xc8302a }));
        cone.position.y = 0.7;
        g.add(cone);
      } else if (type === 'green-can') {
        var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 16), new THREE.MeshLambertMaterial({ color: 0x2a7c44 }));
        cyl.position.y = 0.7;
        g.add(cyl);
      }
      g.position.set(x, 0, z);
      g.userData = { type: type };
      scene.add(g);
      buoys.push(g);
    }
    // up-river is +z (toward land) in our convention; player starts south of channel, heads north.
    addBuoy(-4, -5, 'red-nun');
    addBuoy(4, -5, 'green-can');
    addBuoy(-4, -25, 'red-nun');
    addBuoy(4, -25, 'green-can');
    addBuoy(-4, -50, 'red-nun');
    addBuoy(4, -50, 'green-can');

    // ─── Lease (yellow corner buoys marking 1-acre rectangle)
    var lease = new THREE.Group();
    var leasePoints = [[-8, -75], [8, -75], [8, -95], [-8, -95]];
    leasePoints.forEach(function(p) {
      var pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8),
        new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x332200, emissiveIntensity: 0.3 })
      );
      pole.position.set(p[0], 1.2, p[1]);
      lease.add(pole);
    });
    scene.add(lease);
    // central yellow waypoint marker
    var leaseMarker = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x553300, emissiveIntensity: 0.5 }));
    leaseMarker.position.set(0, 1.5, -85);
    leaseMarker.userData = { label: 'YOUR LPA LEASE' };
    scene.add(leaseMarker);

    // Existing droppers (visible if any deployed)
    var droppersGroup = new THREE.Group();
    scene.add(droppersGroup);

    function rebuildDroppers(count) {
      while (droppersGroup.children.length) droppersGroup.remove(droppersGroup.children[0]);
      // Up to 5 droppers along a horizontal line
      var existing = Math.min(5, count || 0);
      for (var di = 0; di < existing; di++) {
        var rope = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 3, 8),
          new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        rope.position.set(-6 + di * 3, -1.5, -85);
        droppersGroup.add(rope);
        // mussel cluster (sphere)
        var cluster = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 10, 8),
          new THREE.MeshLambertMaterial({ color: 0x2a2233 })
        );
        cluster.position.set(-6 + di * 3, -1.5, -85);
        droppersGroup.add(cluster);
        // float at surface
        var float_ = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 10, 8),
          new THREE.MeshLambertMaterial({ color: 0xfff7d0 })
        );
        float_.position.set(-6 + di * 3, 0.2, -85);
        droppersGroup.add(float_);
      }
    }
    rebuildDroppers(opts && opts.initialDroppers);

    // Dock + landing
    var dock = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 2), new THREE.MeshLambertMaterial({ color: 0x8a6c47 }));
    dock.position.set(0, 0.1, 9);
    scene.add(dock);

    // Land (Bagaduce river bank — green forested)
    var land = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 8), new THREE.MeshLambertMaterial({ color: 0x4a6a3a }));
    land.position.set(0, 1.5, 15);
    scene.add(land);
    // Castine-style point landmark (church spire)
    var spireBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.8), new THREE.MeshLambertMaterial({ color: 0xf5f1e8 }));
    spireBase.position.set(-12, 3.2, 14);
    scene.add(spireBase);
    var spireTop = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0x6c8a4a }));
    spireTop.position.set(-12, 4.5, 14);
    scene.add(spireTop);

    // ─── Boat state
    var boatState = {
      pos: new THREE.Vector3(0, 0, 6),
      heading: 0, // facing north (+z) — toward lease up-river
      speed: 0,
      throttle: 0,
      droppersDeployed: (opts && opts.initialDroppers) || 0,
      probeReadingsCount: 0,
      passedRedNun: false,
      reachedLease: false,
      returnedHome: false,
      fuel: 100
    };
    boat.position.copy(boatState.pos);

    // Probe readings: realistic-but-randomized
    function takeProbeReading() {
      var temp = 18 + (Math.random() - 0.5) * 8; // 14-22
      var salinity = 26 + (Math.random() - 0.5) * 6;
      var DO = 5 + Math.random() * 3;
      var pH = 7.7 + Math.random() * 0.4;
      var chl = 4 + Math.random() * 12;
      return {
        temp: temp.toFixed(1),
        salinity: salinity.toFixed(1),
        DO: DO.toFixed(2),
        pH: pH.toFixed(2),
        chlA: chl.toFixed(1),
        timestamp: Date.now(),
        // Quick assessment
        warnings: (function() {
          var w = [];
          if (temp > 21) w.push('Temp high (>21°C) — mussel stress risk');
          if (DO < 5) w.push('DO low (<5 mg/L) — monitor');
          if (pH < 7.8) w.push('pH low (<7.8) — acidification window');
          if (chl > 25) w.push('Chl-a high — check DMR for HAB closures');
          return w;
        })()
      };
    }

    var keys = {};
    function onKeyDown(e) {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    var cameraTarget = new THREE.Vector3();

    var hudCb = (opts && opts.onHudUpdate) || function() {};
    var statusCb = (opts && opts.onStatus) || function() {};

    var t0 = performance.now();
    var raf = null;
    var alive = true;
    var lastT = t0;
    var elapsed = 0;

    function tick() {
      if (!alive) return;
      var now = performance.now();
      var dt = Math.min(0.08, (now - lastT) / 1000);
      lastT = now;
      elapsed += dt;

      // Input
      var accel = 0, steer = 0;
      if (keys['w'] || keys['arrowup']) accel = 1;
      if (keys['s'] || keys['arrowdown']) accel = -0.6;
      if (keys['a'] || keys['arrowleft']) steer = 1;
      if (keys['d'] || keys['arrowright']) steer = -1;
      if (keys[' ']) accel = 1.4;

      boatState.throttle += (accel - boatState.throttle) * 0.04;
      boatState.speed += boatState.throttle * 5 * dt;
      boatState.speed *= 0.985;
      if (boatState.speed > 7) boatState.speed = 7;
      if (boatState.speed < -2.5) boatState.speed = -2.5;
      boatState.heading += steer * dt * 0.85 * Math.min(1, Math.abs(boatState.speed) / 2 + 0.2);

      // Up-river current (gentle southerly drift — water flows out toward sea)
      var currentDrift = 0.05; // small constant southerly drift
      var dx = Math.sin(boatState.heading) * boatState.speed * dt;
      var dz = Math.cos(boatState.heading) * boatState.speed * dt;
      boatState.pos.x += dx;
      boatState.pos.z -= dz; // -z is up-river/north
      boatState.pos.z += currentDrift * dt * 8; // current pushes player back south
      boatState.fuel -= Math.abs(boatState.throttle) * dt * 0.4;

      boat.position.x = boatState.pos.x;
      boat.position.z = boatState.pos.z;
      boat.rotation.y = boatState.heading;
      if (!reducedMotion) {
        boat.position.y = Math.sin(elapsed * 1.4) * 0.05;
        boat.rotation.z = Math.sin(elapsed * 1.1) * 0.035;
      } else { boat.position.y = 0; boat.rotation.z = 0; }

      // Mission events
      if (!boatState.passedRedNun) {
        for (var ib = 0; ib < buoys.length; ib++) {
          var bb = buoys[ib];
          if (bb.userData.type !== 'red-nun') continue;
          var d = boat.position.distanceTo(bb.position);
          if (d < 4) {
            var toBuoy = new THREE.Vector3().subVectors(bb.position, boat.position);
            var localX = Math.cos(boatState.heading) * toBuoy.x + Math.sin(boatState.heading) * toBuoy.z;
            if (localX > 0.4) {
              boatState.passedRedNun = true;
              aqAnnounce('Correctly passed red nun on starboard heading up-river. Red right returning.');
              statusCb({ type: 'milestone', text: 'Passed first red nun on starboard ✓' });
            } else if (localX < -0.4) {
              aqAnnounce('Wrong side. In IALA-B, returning vessels keep red on starboard. The Bagaduce up-river counts as "returning."');
              statusCb({ type: 'violation', text: 'Buoyage violation — review IALA-B' });
            }
          }
        }
      }

      // Reached lease
      if (!boatState.reachedLease) {
        var dLease = boat.position.distanceTo(leaseMarker.position);
        if (dLease < 6) {
          boatState.reachedLease = true;
          aqAnnounce('Reached your LPA lease. Press F to drop a seeded line, or P to take a water-quality probe reading.');
          statusCb({ type: 'milestone', text: 'Reached lease — press F to drop dropper, P to probe' });
        }
      }

      // F = drop seeded line (only at lease, up to 5)
      if (boatState.reachedLease && keys['f']) {
        keys['f'] = false;
        if (boatState.droppersDeployed >= 5) {
          statusCb({ type: 'info', text: 'All 5 droppers deployed.' });
        } else {
          boatState.droppersDeployed += 1;
          rebuildDroppers(boatState.droppersDeployed);
          statusCb({ type: 'dropper', text: 'Dropper ' + boatState.droppersDeployed + '/5 deployed with mussel seed' });
          aqAnnounce('Dropper ' + boatState.droppersDeployed + ' of 5 deployed');
        }
      }

      // P = probe reading (at lease)
      if (boatState.reachedLease && keys['p']) {
        keys['p'] = false;
        var r = takeProbeReading();
        boatState.probeReadingsCount += 1;
        statusCb({
          type: 'probe',
          reading: r,
          text: 'Probe: T=' + r.temp + '°C  S=' + r.salinity + ' PSU  DO=' + r.DO + ' mg/L  pH=' + r.pH + '  Chl-a=' + r.chlA + ' µg/L' + (r.warnings.length ? '  ⚠ ' + r.warnings.length + ' warning(s)' : '')
        });
        aqAnnounce('Probe reading taken. ' + (r.warnings.length ? r.warnings.length + ' warnings.' : 'All parameters in optimal range.'));
      }

      // Returned home
      if (boatState.reachedLease && !boatState.returnedHome) {
        var dDock = boat.position.distanceTo(dock.position);
        if (dDock < 4 && Math.abs(boatState.speed) < 1) {
          boatState.returnedHome = true;
          aqAnnounce('Docked. Mission summary available.');
          statusCb({ type: 'complete', text: 'Mission complete — review summary' });
        }
      }

      // Wave displacement
      if (!reducedMotion) {
        for (var iv = 0; iv < waterPosArr.length / 3; iv++) {
          var px = waterPosArr[iv * 3];
          var pz = waterPosArr[iv * 3 + 1];
          waterPosArr[iv * 3 + 2] = initialZ[iv] + Math.sin(px * 0.09 + elapsed * 1.0) * 0.12 + Math.cos(pz * 0.10 + elapsed * 0.85) * 0.10;
        }
        waterPositions.needsUpdate = true;
      }

      // Camera follow
      var desiredCam = new THREE.Vector3(
        boat.position.x - Math.sin(boatState.heading) * 9,
        4,
        boat.position.z + Math.cos(boatState.heading) * 9
      );
      camera.position.lerp(desiredCam, reducedMotion ? 0.25 : 0.08);
      cameraTarget.set(boat.position.x, 1.5, boat.position.z);
      camera.lookAt(cameraTarget);

      // HUD
      hudCb({
        speed: boatState.speed,
        heading: boatState.heading,
        fuel: boatState.fuel,
        droppersDeployed: boatState.droppersDeployed,
        probeReadingsCount: boatState.probeReadingsCount,
        passedRedNun: boatState.passedRedNun,
        reachedLease: boatState.reachedLease,
        returnedHome: boatState.returnedHome,
        elapsed: elapsed
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onResize() {
      var nw = canvas.clientWidth || 720;
      var nh = canvas.clientHeight || 420;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    return {
      dispose: function() {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        try { renderer.dispose(); } catch (_) {}
      }
    };
  }

  // ───────────────────────────────────────────────────────────
  // REGISTER
  // ───────────────────────────────────────────────────────────
  window.StemLab.registerTool('aquacultureLab', {
    label: 'AquacultureLab: Mussel Farm Sim',
    title: 'AquacultureLab: Mussel Farm Sim',
    icon: '🦪',
    color: 'teal',
    category: 'science',
    description: 'Run a Maine shellfish farm. Pilot your skiff out to a lease on the Bagaduce, work the longline, monitor water quality, harvest mussels and oysters, navigate weather and tides. Full 3D simulator teaching boating navigation alongside aquaculture fundamentals.',
    desc: 'Pilot your skiff to your Bagaduce River lease. Deploy droppers, monitor water quality, harvest mussels, learn IALA-B buoyage + lease tiers + climate stressors in a 3D sim.',
    tags: ['aquaculture', 'shellfish', 'boating', 'navigation', 'maine', '3d', 'sim'],
    ready: true,
    render: function(ctx) { return _renderAquacultureLab(ctx); }
  });

  function _renderAquacultureLab(ctx) {
    var React = window.React || (ctx && ctx.React);
    var h = React ? React.createElement : null;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

    var stateInit = loadState();
    var tabHook = useState('home');
    var tab = tabHook[0], setTab = tabHook[1];
    var regionHook = useState(stateInit.region);
    var region = regionHook[0], setRegion = regionHook[1];
    var simHook = useState({ active: false, threeLoaded: !!window.THREE, threeError: false, loading: false });
    var sim = simHook[0], setSim = simHook[1];
    var hudHook = useState({});
    var hud = hudHook[0], setHud = hudHook[1];
    var statusHook = useState([]);
    var status = statusHook[0], setStatus = statusHook[1];
    var probeHook = useState(stateInit.probeReadings || []);
    var probes = probeHook[0], setProbes = probeHook[1];
    var droppersHook = useState(stateInit.droppersDeployed || 0);
    var droppersDeployed = droppersHook[0], setDroppers = droppersHook[1];
    var canvasRef = useRef(null);
    var farmRef = useRef(null);

    useEffect(function() {
      var s = loadState();
      s.region = region;
      saveState(s);
    }, [region]);

    function pushStatus(ev) {
      setStatus(function(prev) { return (prev || []).concat([ev]).slice(-8); });
      if (ev.type === 'probe') {
        var ns = probes.concat([ev.reading]);
        setProbes(ns);
        var s2 = loadState();
        s2.probeReadings = ns;
        saveState(s2);
      }
      if (ev.type === 'dropper') {
        setDroppers(function(c) {
          var nv = c + 1;
          var s2 = loadState();
          s2.droppersDeployed = nv;
          saveState(s2);
          return nv;
        });
      }
    }

    function startSim() {
      function actuallyStart() {
        var c = canvasRef.current;
        if (!c) return;
        if (farmRef.current && farmRef.current.dispose) farmRef.current.dispose();
        farmRef.current = initFarmSim(c, {
          onHudUpdate: setHud,
          onStatus: pushStatus,
          initialDroppers: loadState().droppersDeployed || 0
        });
        setSim({ active: true, threeLoaded: true, threeError: false, loading: false });
        aqAnnounce('AquacultureLab 3D sim launched. WASD/arrow keys to steer, F to drop a seeded line at lease, P to take a water-quality probe reading.');
      }
      if (window.THREE) actuallyStart();
      else {
        setSim(function(s) { return Object.assign({}, s, { loading: true }); });
        ensureThreeJS(actuallyStart, function() {
          setSim({ active: false, threeLoaded: false, threeError: true, loading: false });
          aqAnnounce('3D engine could not load. Use Chart Mode (2D fallback) instead.');
        });
      }
    }
    function stopSim() {
      if (farmRef.current && farmRef.current.dispose) farmRef.current.dispose();
      farmRef.current = null;
      setSim({ active: false, threeLoaded: !!window.THREE, threeError: false, loading: false });
    }

    useEffect(function() {
      return function() { if (farmRef.current && farmRef.current.dispose) farmRef.current.dispose(); };
    }, []);

    var cardStyle = { background: 'linear-gradient(135deg, rgba(8,30,28,0.92), rgba(4,18,18,0.92))', border: '1px solid rgba(20,184,166,0.22)', borderRadius: 12, padding: 14, color: '#e2e8f0', marginBottom: 12 };
    var headerStyle = { fontSize: 13, fontWeight: 900, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 };

    var TABS = [
      { id: 'home', label: '🏠 Home' },
      { id: 'sim', label: '🎮 3D Sim' },
      { id: 'chart', label: '🗺 Chart Room' },
      { id: 'species', label: '🦪 Species & Methods' },
      { id: 'water', label: '💧 Water Quality' },
      { id: 'site', label: '📍 Site Selection' },
      { id: 'lease', label: '📋 Lease Tiers' },
      { id: 'hearing', label: '🏛 Public Hearing' },
      { id: 'hatchery', label: '🧫 Hatchery' },
      { id: 'disease', label: '🦠 Diseases & Pests' },
      { id: 'climate', label: '🌡 Climate Deep Dive' },
      { id: 'history', label: '📜 Maine History' },
      { id: 'nssp', label: '🛡 NSSP Rules' },
      { id: 'neracoos', label: '📡 NERACOOS' },
      { id: 'mooring', label: '⚓ Mooring & Gear' },
      { id: 'marketing', label: '💰 Marketing' },
      { id: 'econ', label: '💵 Economics' },
      { id: 'buoyage', label: '🟢 Buoyage' },
      { id: 'colregs', label: '⚓ COLREGS' },
      { id: 'knots', label: '🪢 Knots' },
      { id: 'wabanaki', label: '🪶 Wabanaki Heritage' },
      { id: 'safety', label: '🦺 Safety' },
      { id: 'boats', label: '🚤 Boats' },
      { id: 'bluecarbon', label: '🌳 Blue Carbon' },
      { id: 'watercol', label: '🏛 Water Column' },
      { id: 'weatheraq', label: '🌦 Weather' },
      { id: 'profiles', label: '🏢 Operator Profiles' },
      { id: 'lessonplans', label: '📓 Lesson Plans' },
      { id: 'bibliography', label: '📚 Bibliography' },
      { id: 'calendar', label: '📅 Farm Calendar' },
      { id: 'imta', label: '🔄 IMTA' },
      { id: 'foodsafety', label: '🦠 Food Safety' },
      { id: 'coops', label: '🤝 Cooperatives' },
      { id: 'businessplan', label: '📝 Business Plan' },
      { id: 'global', label: '🌍 Global Context' },
      { id: 'agencies', label: '🏛 Agencies' },
      { id: 'carbon', label: '📊 Carbon Detail' },
      { id: 'careerprofiles', label: '👤 Career Profiles' },
      { id: 'deepdives', label: '🔬 Species Deep Dives' },
      { id: 'techniques', label: '🛠 Practical Techniques' },
      { id: 'hatcherygear', label: '🧪 Hatchery Gear' },
      { id: 'nssprules', label: '📋 NSSP Rules Detail' },
      { id: 'permitwf', label: '🪪 Permit Workflow' },
      { id: 'regsdetail', label: '⚖️ Regs Detail' },
      { id: 'wqthresh', label: '📏 WQ Thresholds' },
      { id: 'coldchain', label: '❄️ Cold Chain' },
      { id: 'chefs', label: '👨‍🍳 Chef Partnerships' },
      { id: 'carbonmath', label: '🧮 Carbon Math' },
      { id: 'extralp', label: '📚 More Lesson Plans' },
      { id: 'news', label: '📰 Current Events' },
      { id: 'dailyops', label: '📋 Daily Ops Log' },
      { id: 'faq', label: '❓ FAQ' },
      { id: 'seasonal', label: '🌗 Seasonal Tasks' },
      { id: 'mistakes', label: '⚠️ Common Mistakes' },
      { id: 'extessays', label: '📜 Extended Essays' },
      { id: 'hatchwf', label: '🧪 Hatchery Workflow' },
      { id: 'equipment', label: '🔧 Equipment Detail' },
      { id: 'textbook', label: '📘 Textbook Chapters' },
      { id: 'procedures', label: '📝 Procedures Manual' },
      { id: 'studyguide', label: '🎓 Study Guide' },
      { id: 'aqfacts', label: '💡 Facts' },
      { id: 'extglossary', label: '📒 Extended Glossary' },
      { id: 'activities', label: '🎯 Student Activities' },
      { id: 'community', label: '🤝 Community Models' },
      { id: 'success', label: '🏆 Success Stories' },
      { id: 'faqpub', label: '❓ Public FAQ' },
      { id: 'training', label: '📚 Training Checklist' },
      { id: 'regframework', label: '⚖️ Reg Framework' },
      { id: 'maintenance', label: '🔧 Maintenance Schedules' },
      { id: 'workforce', label: '🎓 Workforce Pipeline' },
      { id: 'emergency', label: '🚨 Emergency Procedures' },
      { id: 'culinary', label: '🍽 Culinary Uses' },
      { id: 'refnumbers', label: '🔢 Key Numbers' },
      { id: 'events', label: '📅 Notable Events' },
      { id: 'bibext', label: '📚 Extended Bibliography' },
      { id: 'playbooks', label: '📕 Operational Playbooks' },
      { id: 'safetyman', label: '🛟 Safety Manual' },
      { id: 'future', label: '🔮 Future Outlook' },
      { id: 'econdeep', label: '📊 Economics Deep Dive' },
      { id: 'voices', label: '🗣️ Voices' },
      { id: 'mentorship', label: '🎓 Mentorship Guide' },
      { id: 'gearmaster', label: '🧰 Gear Master List' },
      { id: 'termessays', label: '📖 Term Essays' },
      { id: 'tribalinit', label: '🪶 Tribal Initiatives' },
      { id: 'indgroups', label: '🤝 Industry Groups' },
      { id: 'notablepeople', label: '👤 Notable People' },
      { id: 'globalperspectives', label: '🌍 Global Perspectives' },
      { id: 'advecon', label: '📈 Advanced Economics' },
      { id: 'certifications', label: '✅ Sustainability Certs' },
      { id: 'oysterdeep', label: '🦪 Oyster Industry Deep' },
      { id: 'musseldeep', label: '🪨 Mussel Industry Deep' },
      { id: 'kelpdeep', label: '🌿 Kelp Industry Deep' },
      { id: 'salmondeep', label: '🐟 Salmon Industry Deep' },
      { id: 'rasdeep', label: '🏭 RAS Future' },
      { id: 'techdeep', label: '🔬 Technical Deep' },
      { id: 'scallopdeep', label: '🐚 Scallop + Urchin Deep' },
      { id: 'hearingdeep', label: '🏛 Public Hearing Deep' },
      { id: 'familydeep', label: '👨‍👩‍👧 Family Operations' },
      { id: 'waterfrontdeep', label: '⚓ Working Waterfront Deep' },
      { id: 'coopdeep', label: '🤝 Cooperative Models Deep' },
      { id: 'studcareer', label: '🎓 Student Career Guide' },
      { id: 'growcycles', label: '🔄 Grow-Season Cycles' },
      { id: 'kelpdeep', label: '🌿 Kelp Deep Dive' },
      { id: 'hatchery', label: '🏭 Hatchery Deep Dive' },
      { id: 'aqtimeline', label: '📅 Maine Aquaculture Timeline' },
      { id: 'aqmetrics', label: '📊 Key Metrics' },
      { id: 'failures', label: '⚠️ Top Failure Modes' },
      { id: 'studentfaq', label: '❓ Student FAQ' },
      { id: 'aquafamilies', label: '👨‍👩‍👧 Aquaculture Families' },
      { id: 'scenarios', label: '🧠 Scenarios' },
      { id: 'careers', label: '🧰 Careers' },
      { id: 'achievements', label: '🏆 Achievements' },
      { id: 'glossary', label: '📖 Glossary' },
      { id: 'quiz', label: '✅ Quiz' }
    ];

    function tabBar() {
      return h('div', { role: 'tablist', 'aria-label': 'AquacultureLab sections',
        style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
        TABS.map(function(t) {
          var selected = tab === t.id;
          return h('button', { key: t.id, role: 'tab', 'aria-selected': selected,
            className: 'aq-btn',
            onClick: function() { setTab(t.id); aqAnnounce(t.label + ' tab open'); },
            style: { padding: '8px 12px', background: selected ? '#14b8a6' : 'rgba(15,23,42,0.7)',
              color: selected ? '#04141f' : '#cbd5e1', border: '1px solid ' + (selected ? '#5eead4' : 'rgba(100,116,139,0.4)'),
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, t.label);
        }));
    }

    function regionBar() {
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(15,23,42,0.55)', borderRadius: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('label', { htmlFor: 'aq-region-select', style: { fontSize: 11, fontWeight: 700, color: '#94a3b8' } }, 'Region:'),
        h('select', { id: 'aq-region-select', value: region,
          onChange: function(e) { setRegion(e.target.value); aqAnnounce('Region set to ' + REGIONS[e.target.value].label); },
          style: { background: '#0f1c2f', color: '#e2e8f0', border: '1px solid rgba(20,184,166,0.4)', borderRadius: 6, padding: '4px 8px', fontSize: 12 } },
          Object.keys(REGIONS).map(function(rk) {
            return h('option', { key: rk, value: rk }, REGIONS[rk].label + (REGIONS[rk].complete ? '' : ' (preview)'));
          })),
        !REGIONS[region].complete ? h('span', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'Preview region — full data in v1.1. Maine shown.') : null);
    }

    function homeTab() {
      var st = loadState();
      var completedCount = Object.keys(st.completedMissions || {}).length;
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🦪 AquacultureLab — Mussel Farm Sim'),
          h('p', { style: { fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' } },
            'You own a 1-acre Limited Purpose Aquaculture (LPA) lease on the Bagaduce River. Pilot your skiff out, deploy seeded longlines, monitor water quality (temp, salinity, DO, pH, chlorophyll-a), harvest at 18-24 months, navigate weather and tides. Learn boating navigation (IALA-B, COLREGS, charts) alongside the full shellfish farming cycle.'),
          h('p', { style: { fontSize: 12, color: '#94a3b8', margin: '0 0 10px', fontStyle: 'italic' } },
            'Built for Maine\'s expanding aquaculture industry. Pairs with FisherLab for marine-trades curriculum. Maine DMR rules default; region toggle lets you preview Chesapeake, PNW, or Great Lakes (v1.1).'),
          h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(20,184,166,0.18)' } },
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#86efac' } }, completedCount),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Missions complete')),
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbbf24' } }, droppersDeployed + '/5'),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Droppers deployed')),
            h('div', null,
              h('div', { style: { fontSize: 22, fontWeight: 900, color: '#5eead4' } }, (probes || []).length),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 } }, 'Probe readings')))),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Missions (v1)'),
          MISSIONS.map(function(m, i) {
            var done = !!(loadState().completedMissions || {})[m.id];
            return h('div', { key: m.id, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '3px solid ' + (done ? '#86efac' : '#14b8a6') } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: done ? '#86efac' : '#5eead4', marginBottom: 4 } },
                (done ? '✓ ' : (i + 1) + '. ') + m.title),
              h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, m.brief),
              h('ul', { style: { margin: '4px 0 0 18px', padding: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
                m.objectives.map(function(o, oi) { return h('li', { key: oi }, o); })));
          })),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'How to play'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            h('p', null, h('b', null, 'Steering: '), 'WASD/arrows. W/Up = throttle, S/Down = reverse, A/D = turn, Space = boost.'),
            h('p', null, h('b', null, 'Farm work: '), 'When you reach your lease (yellow buoys mark the 1-acre rectangle), press F to drop a seeded mussel line. Press P to take a water-quality probe reading.'),
            h('p', null, h('b', null, 'Navigation: '), 'Pass red nuns on starboard heading up-river (red-right-returning). The Bagaduce has narrow channels; watch your set + drift on the current.'),
            h('p', null, h('b', null, 'Accessibility: '), 'Keyboard parity, reduced-motion supported, 2D Chart fallback if WebGL fails.'))));
    }

    function simTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '3D Farm Simulator'),
          !sim.threeLoaded && !sim.threeError && !sim.loading ? h('div', { style: { textAlign: 'center', padding: 20 } },
            h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 14 } }, 'three.js r128 loads from cdnjs (~600 KB) on demand.'),
            h('button', { className: 'aq-btn', onClick: startSim,
              style: { padding: '12px 24px', background: '#14b8a6', color: '#04141f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
              '▶ Load 3D engine + launch sim')) : null,
          sim.loading ? h('div', { style: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 } }, '⏳ Loading three.js…') : null,
          sim.threeError ? h('div', { style: { padding: 14, background: 'rgba(220,38,38,0.15)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.4)' } },
            h('div', { style: { color: '#fca5a5', fontWeight: 800, marginBottom: 6 } }, '⚠ 3D engine failed to load'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Chart Mode (2D) works as a fallback. All other curriculum tabs (Species, Water Quality, Lease, Economics, Buoyage, COLREGS, Quiz) are unaffected.')) : null,
          sim.threeLoaded && !sim.active ? h('div', { style: { textAlign: 'center', padding: 14 } },
            h('button', { className: 'aq-btn', onClick: startSim,
              style: { padding: '12px 24px', background: '#14b8a6', color: '#04141f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' } },
              '▶ Cast off — head up-river to your lease')) : null,
          sim.active ? h('div', { style: { position: 'relative' } },
            h('canvas', { ref: canvasRef, style: { width: '100%', height: 460, display: 'block', borderRadius: 8, background: '#c4d8e3' },
              'aria-label': '3D Bagaduce River farm scene. WASD or arrow keys to pilot, F to drop a seeded line at lease, P to take a water-quality probe reading.' }),
            h('div', { style: { position: 'absolute', top: 10, left: 10, background: 'rgba(4,18,18,0.78)', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#e2e8f0', fontFamily: 'ui-monospace, Menlo, monospace' } },
              h('div', null, 'Speed: ', h('b', { style: { color: '#86efac' } }, (hud.speed || 0).toFixed(1) + ' kt')),
              h('div', null, 'Fuel: ', h('b', { style: { color: (hud.fuel || 100) < 30 ? '#fb923c' : '#86efac' } }, Math.max(0, hud.fuel || 0).toFixed(0) + '%')),
              h('div', null, 'Droppers: ', h('b', { style: { color: '#fbbf24' } }, (hud.droppersDeployed || 0) + '/5')),
              h('div', null, 'Probes: ', h('b', { style: { color: '#5eead4' } }, hud.probeReadingsCount || 0))),
            h('div', { style: { position: 'absolute', top: 10, right: 10, background: 'rgba(4,18,18,0.78)', padding: '8px 12px', borderRadius: 8, fontSize: 11, color: '#e2e8f0', maxWidth: 220 } },
              h('div', { style: { fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, 'Mission 1'),
              h('div', { style: { fontSize: 10 } }, hud.passedRedNun ? '✓ Passed red nun' : '• Pass red nun on starboard'),
              h('div', { style: { fontSize: 10 } }, hud.reachedLease ? '✓ Reached lease' : '• Reach lease (yellow buoys)'),
              h('div', { style: { fontSize: 10 } }, (hud.droppersDeployed >= 5) ? '✓ All droppers deployed' : '• Deploy 5 droppers (F)'),
              h('div', { style: { fontSize: 10 } }, hud.returnedHome ? '✓ Returned' : '• Return to landing')),
            h('div', { style: { position: 'absolute', bottom: 10, left: 10, right: 10, maxHeight: 100, overflowY: 'auto', background: 'rgba(4,18,18,0.85)', padding: 8, borderRadius: 8 } },
              (status || []).slice(-4).map(function(ev, ei) {
                var color = ev.type === 'probe' ? '#5eead4' : (ev.type === 'dropper' ? '#fbbf24' : (ev.type === 'violation' ? '#fb923c' : (ev.type === 'complete' ? '#86efac' : '#a7f3d0')));
                return h('div', { key: ei, style: { fontSize: 11, color: color, marginBottom: 2 } }, '• ' + ev.text);
              })),
            h('button', { onClick: stopSim, className: 'aq-btn',
              style: { position: 'absolute', bottom: 10, right: 10, padding: '6px 12px', background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '✕ Exit sim')) : null
        ),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Controls'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 11 } },
            [
              { k: 'W / ↑', d: 'Throttle forward', c: '#86efac' },
              { k: 'S / ↓', d: 'Reverse', c: '#fb923c' },
              { k: 'A / ←', d: 'Turn left', c: '#a7f3d0' },
              { k: 'D / →', d: 'Turn right', c: '#a7f3d0' },
              { k: 'Space', d: 'Boost', c: '#fbbf24' },
              { k: 'F', d: 'Drop seeded line (at lease)', c: '#5eead4' },
              { k: 'P', d: 'Probe water quality (at lease)', c: '#bef264' }
            ].map(function(c, i) {
              return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '3px solid ' + c.c } },
                h('div', { style: { fontWeight: 800, color: c.c, fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 2 } }, c.k),
                h('div', { style: { color: '#cbd5e1' } }, c.d));
            }))));
    }

    function chartTab() {
      return h('div', null, regionBar(), h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗺 Chart Room (Bagaduce River)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Stylized Bagaduce River chart. In a real sim, you\'d use NOAA chart 13309 (Penobscot Bay). Narrow channels — set + drift on river current matters as much as wind.'),
        h('svg', { viewBox: '0 0 600 400', style: { width: '100%', maxWidth: 720, background: '#dbe7ef', borderRadius: 8, border: '1px solid rgba(20,184,166,0.3)' }, 'aria-label': 'Bagaduce River chart showing channel buoys and lease area' },
          h('rect', { x: 0, y: 0, width: 600, height: 60, fill: '#a8c595' }),
          h('text', { x: 18, y: 28, fill: '#3b4d2b', fontSize: 13, fontWeight: 700 }, 'Castine / Penobscot Peninsula'),
          h('rect', { x: 0, y: 320, width: 600, height: 80, fill: '#a8c595' }),
          h('text', { x: 18, y: 360, fill: '#3b4d2b', fontSize: 13, fontWeight: 700 }, 'Brooksville side'),
          h('rect', { x: 270, y: 60, width: 60, height: 10, fill: '#8a6c47' }),
          h('text', { x: 275, y: 56, fill: '#3b4d2b', fontSize: 10 }, 'Town landing'),
          h('text', { x: 18, y: 75, fill: '#3b4d2b', fontSize: 10, fontStyle: 'italic' }, 'Bagaduce River — narrow, ~3 nm long'),
          // Channel buoys
          h('g', null,
            [{ x: 250, y: 110 }, { x: 250, y: 180 }, { x: 250, y: 250 }].map(function(b, i) {
              return h('g', { key: 'r' + i },
                h('polygon', { points: (b.x - 7) + ',' + (b.y + 10) + ' ' + (b.x + 7) + ',' + (b.y + 10) + ' ' + b.x + ',' + (b.y - 4), fill: '#c8302a' }),
                h('text', { x: b.x + 12, y: b.y + 5, fill: '#9b1c17', fontSize: 9, fontWeight: 700 }, 'R' + (i * 2 + 2)));
            })),
          h('g', null,
            [{ x: 350, y: 110 }, { x: 350, y: 180 }, { x: 350, y: 250 }].map(function(b, i) {
              return h('g', { key: 'g' + i },
                h('rect', { x: b.x - 6, y: b.y - 4, width: 12, height: 14, fill: '#2a7c44' }),
                h('text', { x: b.x + 12, y: b.y + 5, fill: '#155b2f', fontSize: 9, fontWeight: 700 }, 'G' + (i * 2 + 1)));
            })),
          // Lease rectangle
          h('rect', { x: 270, y: 280, width: 60, height: 30, fill: 'none', stroke: '#facc15', strokeWidth: 2, strokeDasharray: '4,3' }),
          h('circle', { cx: 280, cy: 285, r: 3, fill: '#facc15' }),
          h('circle', { cx: 320, cy: 285, r: 3, fill: '#facc15' }),
          h('circle', { cx: 280, cy: 305, r: 3, fill: '#facc15' }),
          h('circle', { cx: 320, cy: 305, r: 3, fill: '#facc15' }),
          h('text', { x: 340, y: 298, fill: '#9a7800', fontSize: 10, fontWeight: 700 }, 'Your LPA (1 acre)'),
          // Depth labels
          h('text', { x: 130, y: 175, fill: '#5a8ba5', fontSize: 9 }, 'depths 4-12 m'),
          // Compass
          h('g', { transform: 'translate(70, 360)' },
            h('circle', { cx: 0, cy: 0, r: 22, fill: 'rgba(255,255,255,0.5)', stroke: '#5a8ba5', strokeWidth: 1 }),
            h('text', { x: 0, y: -10, fill: '#3b4d2b', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, 'N')))));
    }

    function speciesTab() {
      return h('div', null,
        regionBar(),
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🦪 Species & Methods'),
          SPECIES.map(function(s, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
              h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 6 } },
                h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, s.emoji),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4' } }, s.name),
                  h('div', { style: { fontSize: 11, fontStyle: 'italic', color: '#94a3b8' } }, s.sci),
                  h('span', { className: 'aq-pill' }, s.method))),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Growth time: '), s.growthMonths),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Yield: '), s.yield),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Market: '), s.marketPrice),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Optimal: '), s.tempRange + ' · ' + s.salinityRange),
              h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Stressors: '), (s.stressors || []).join(' · ')),
              h('div', { style: { fontSize: 11, color: '#86efac', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(100,116,139,0.25)' } },
                h('b', null, 'Why Maine: '), s.whyMaine,
                h('span', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginLeft: 6 } }, '(' + s.cite + ')')));
          })));
    }

    function waterTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '💧 Water Quality Parameters'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } }, 'Six parameters every shellfish farmer monitors. NERACOOS + Bigelow + Maine DMR all provide near-real-time data along the coast.'),
          WATER_QUALITY.map(function(p, i) {
            return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, p.param + ' (' + p.symbol + ')'),
              h('div', { style: { fontSize: 11, color: '#bef264', marginBottom: 3 } }, h('b', null, 'Optimal: '), p.optimal),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Effect: '), p.effect),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Monitor: '), p.monitor),
              h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Action: '), p.action));
          })),
        probes && probes.length ? h('div', { style: cardStyle },
          h('div', { style: headerStyle }, 'Your probe readings (' + probes.length + ')'),
          probes.slice(-10).reverse().map(function(r, i) {
            var ts = new Date(r.timestamp);
            return h('div', { key: i, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 } },
              h('div', { style: { color: '#94a3b8' } }, ts.toLocaleString()),
              h('div', null, 'T=', h('b', { style: { color: '#86efac' } }, r.temp + '°C'),
                ' · S=', h('b', { style: { color: '#bae6fd' } }, r.salinity + ' PSU'),
                ' · DO=', h('b', { style: { color: '#5eead4' } }, r.DO + ' mg/L'),
                ' · pH=', h('b', { style: { color: '#fbbf24' } }, r.pH),
                ' · Chl-a=', h('b', { style: { color: '#bef264' } }, r.chlA + ' µg/L')),
              (r.warnings && r.warnings.length) ? h('div', { style: { color: '#fb923c', fontSize: 10, marginTop: 4 } },
                '⚠ ' + r.warnings.join(' · ')) : null);
          })) : null);
    }

    function leaseTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '📋 Maine Lease Tiers'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Maine aquaculture leases come in three tiers. The right tier depends on scale + capital + tolerance for public process.'),
          LEASE_TIERS.map(function(l, i) {
            return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (l.id === 'lpa' ? '#5eead4' : (l.id === 'standard' ? '#fbbf24' : '#a78bfa')) } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, l.tier),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Max acres: '), l.maxAcres),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Term: '), l.term + ' · Renewable: ' + l.renewable),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Fee: '), l.fee),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Requires: '), l.requires),
              h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Public hearing: '), l.pubHearing),
              h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Who uses it: '), l.whoUses));
          })));
    }

    function econTab() {
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '💰 Starter Farm Economics (1-acre LPA)'),
          h('p', { style: { fontSize: 11, color: '#fb923c', fontStyle: 'italic', marginBottom: 10 } },
            'Order-of-magnitude only. Real numbers vary by zone, used vs new gear, market price, fuel, weather. Verify with Maine Aquaculture Association before signing checks.'),
          h('h4', { style: { fontSize: 12, color: '#5eead4', marginBottom: 6 } }, 'Startup capital'),
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#cbd5e1', marginBottom: 14 } },
            h('thead', null, h('tr', { style: { background: 'rgba(20,184,166,0.15)' } },
              ['Item', 'Cost', 'Annual recurring'].map(function(c, ci) {
                return h('th', { key: ci, style: { padding: '6px 8px', textAlign: 'left', color: '#a7f3d0', fontWeight: 700 } }, c);
              }))),
            h('tbody', null,
              ECONOMICS.startup.map(function(item, i) {
                return h('tr', { key: i, style: { borderBottom: '1px solid rgba(100,116,139,0.18)' } },
                  h('td', { style: { padding: '6px 8px' } }, item.item),
                  h('td', { style: { padding: '6px 8px', fontWeight: 700, color: '#fbbf24' } }, '$' + item.cost.toLocaleString()),
                  h('td', { style: { padding: '6px 8px', color: '#94a3b8' } }, item.recurring));
              }),
              h('tr', { style: { background: 'rgba(20,184,166,0.1)', fontWeight: 800 } },
                h('td', { style: { padding: '6px 8px' } }, 'TOTAL STARTUP'),
                h('td', { style: { padding: '6px 8px', color: '#86efac' } },
                  '$' + ECONOMICS.startup.reduce(function(s, x) { return s + x.cost; }, 0).toLocaleString()),
                h('td', { style: { padding: '6px 8px' } }, '—')))),
          h('h4', { style: { fontSize: 12, color: '#5eead4', marginBottom: 6 } }, 'Revenue trajectory (1-acre mussel LPA)'),
          h('div', { style: { padding: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 6, marginBottom: 8, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
            h('div', null, h('b', { style: { color: '#86efac' } }, 'Year 1: '), ECONOMICS.revenue.yearOne),
            h('div', null, h('b', { style: { color: '#86efac' } }, 'Year 2: '), ECONOMICS.revenue.yearTwo),
            h('div', null, h('b', { style: { color: '#86efac' } }, 'Year 3+: '), ECONOMICS.revenue.yearThree)),
          h('h4', { style: { fontSize: 12, color: '#5eead4', marginBottom: 6 } }, 'Notes'),
          h('ul', { style: { margin: '0 0 0 20px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
            ECONOMICS.notes.map(function(n, i) { return h('li', { key: i }, n); }))));
    }

    function buoyageTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🟢 IALA Region B Buoyage'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 10 } },
          'Same convention you use lobstering or fishing — ', h('b', { style: { color: '#fbbf24' } }, '"Red Right Returning."'), ' Heading INTO river / harbor: keep red on starboard. Reversed when leaving. The Bagaduce up-river counts as "returning."'),
        BUOYAGE_LATERAL.map(function(b, i) {
          return h('div', { key: i, style: { padding: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, marginBottom: 6, borderLeft: '3px solid ' + (b.color === 'red' ? '#c8302a' : '#2a7c44') } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#e2e8f0' } }, b.type + ' · ' + b.shape + ' · ' + b.color),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, b.meaning));
        })));
    }

    function colregsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚓ COLREGS — Rules of the Road'),
        COLREGS.map(function(r, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '3px solid #14b8a6' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#5eead4', marginBottom: 4 } }, r.rule + ' · ' + r.title),
            h('div', { style: { fontSize: 12, color: '#e2e8f0' } }, r.plain));
        })));
    }

    function careersTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧰 Career Pathways'),
        CAREERS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, c.title),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, c.desc),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', { style: { color: '#fbbf24' } }, 'Training: '), c.training),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', { style: { color: '#86efac' } }, 'Pay: '), c.pay),
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, h('b', { style: { color: '#a78bfa' } }, 'Future: '), c.future));
        })));
    }

    function glossaryTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📖 Glossary'),
        GLOSSARY.map(function(g, i) {
          return h('div', { key: i, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#5eead4', marginBottom: 2 } }, g.term),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, g.def));
        })));
    }

    var quizStateHook = useState({ idx: 0, answers: {}, finished: false, score: 0 });
    var quizState = quizStateHook[0], setQuizState = quizStateHook[1];

    function quizTab() {
      if (quizState.finished) {
        return h('div', null, h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '✅ Quiz Results'),
          h('div', { style: { fontSize: 28, fontWeight: 900, color: '#5eead4', marginBottom: 8 } },
            quizState.score + ' / ' + QUIZ_QUESTIONS.length),
          h('p', { style: { fontSize: 12, color: '#cbd5e1' } },
            quizState.score >= QUIZ_QUESTIONS.length * 0.85 ? '🏆 Mastery — ready for your own lease.' :
            quizState.score >= QUIZ_QUESTIONS.length * 0.7 ? '✓ Solid — review missed items + retry.' :
            '⚠ Keep studying — review Species, Water Quality, Lease tabs.'),
          h('div', { style: { marginTop: 10 } },
            QUIZ_QUESTIONS.map(function(q, qi) {
              var picked = quizState.answers[qi];
              var correct = picked === q.correct;
              return h('div', { key: qi, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '3px solid ' + (correct ? '#86efac' : '#fb923c') } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: correct ? '#86efac' : '#fb923c', marginBottom: 4 } }, (correct ? '✓ ' : '✕ ') + 'Q' + (qi + 1) + ': ' + q.q),
                h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Your answer: ' + (typeof picked === 'number' ? q.a[picked] : 'skipped')),
                !correct ? h('div', { style: { fontSize: 11, color: '#86efac', marginTop: 2 } }, 'Correct: ' + q.a[q.correct]) : null,
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, q.explain));
            })),
          h('button', { className: 'aq-btn', onClick: function() { setQuizState({ idx: 0, answers: {}, finished: false, score: 0 }); },
            style: { marginTop: 14, padding: '10px 20px', background: '#14b8a6', color: '#04141f', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' } }, 'Retake quiz')));
      }
      var q = QUIZ_QUESTIONS[quizState.idx];
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '✅ AquacultureLab Quiz — Q' + (quizState.idx + 1) + ' of ' + QUIZ_QUESTIONS.length),
        h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12 } }, q.q),
        q.a.map(function(opt, oi) {
          return h('button', { key: oi, className: 'aq-btn',
            onClick: function() {
              var newAnswers = Object.assign({}, quizState.answers);
              newAnswers[quizState.idx] = oi;
              var nextIdx = quizState.idx + 1;
              if (nextIdx >= QUIZ_QUESTIONS.length) {
                var sc = 0;
                for (var qq = 0; qq < QUIZ_QUESTIONS.length; qq++) {
                  if (newAnswers[qq] === QUIZ_QUESTIONS[qq].correct) sc++;
                }
                setQuizState({ idx: nextIdx, answers: newAnswers, finished: true, score: sc });
                aqAnnounce('Quiz complete. Score ' + sc + ' of ' + QUIZ_QUESTIONS.length);
              } else {
                setQuizState({ idx: nextIdx, answers: newAnswers, finished: false, score: 0 });
              }
            },
            style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6,
              background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(20,184,166,0.3)',
              borderRadius: 8, fontSize: 12, cursor: 'pointer' } },
            String.fromCharCode(65 + oi) + '. ' + opt);
        })));
    }

    // ─── SITE SELECTION tab
    function siteTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📍 Site Selection — 12 Factors'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Choosing the right lease site is the single biggest determinant of farm success. These 12 factors should be evaluated BEFORE submitting an application.'),
        SITE_SELECTION.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, s.factor),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Criteria: '), s.criteria),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'How to assess: '), s.assessment),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, '🚩 Red flag: '), s.red_flag));
        })));
    }

    // ─── PUBLIC HEARING tab
    function hearingTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Public Hearing — Navigating the Process'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Public hearings can make or break a standard lease application. Preparation matters more than presentation.'),
        PUBLIC_HEARING.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, p.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, p.body));
        })));
    }

    // ─── HATCHERY tab
    function hatcheryTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧫 Hatchery Operations Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The hatchery is where the production cycle begins. Maine\'s industry depends on a handful of hatcheries.'),
        HATCHERY.map(function(hs, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, hs.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, hs.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), hs.practical));
        })));
    }

    // ─── DISEASE tab
    function diseaseTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦠 Diseases + Pests'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Every aquaculture species faces specific disease + pest pressures. Understanding them is preventive management.'),
        DISEASES.map(function(d, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, d.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Species affected: '), d.species),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Transmission: '), d.transmission),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Symptoms: '), d.symptoms),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Management: '), d.management),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine context: '), d.maine));
        })));
    }

    // ─── CLIMATE DEEP DIVE tab
    function climateTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌡 Climate Impacts — Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s coast is warming ~4× faster than the global ocean. Climate-adapted aquaculture is the only path forward.'),
        CLIMATE_DEEP.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, c.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'For farmers: '), c.farming),
            c.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '(' + c.cite + ')') : null);
        })));
    }

    // ─── HISTORY tab
    function historyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📜 Maine Aquaculture History'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s aquaculture industry is younger than its commercial fisheries — but builds on 12,000+ years of Indigenous shellfish stewardship.'),
        HISTORY.map(function(hh, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, hh.era),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              hh.events.map(function(e, ei) { return h('li', { key: ei }, e); })),
            hh.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + hh.cite + ')') : null);
        })));
    }

    // ─── NSSP tab
    function nsspTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🛡 NSSP — Shellfish Sanitation'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'National Shellfish Sanitation Program. Federal-state framework governing shellfish safety. Every aquaculture farm operates under NSSP.'),
        NSSP.map(function(n, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, n.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, n.body));
        })));
    }

    // ─── NERACOOS tab
    function neracoosTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📡 NERACOOS — Real-Time Ocean Data'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Northeast Regional Association of Coastal Ocean Observing Systems. Free real-time buoy + sensor data Maine farmers depend on.'),
        NERACOOS.map(function(nn, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, nn.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, nn.body));
        })));
    }

    // ─── MOORING tab
    function mooringTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚓ Mooring + Gear Anchoring'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine winters + nor\'easters stress gear. Anchor system design is do-or-die.'),
        MOORING.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, m.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, m.body));
        })));
    }

    // ─── MARKETING tab
    function marketingTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '💰 Marketing + Direct-to-Consumer'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Where you sell + how you tell your story can double your effective income vs commodity wholesale.'),
        MARKETING.map(function(mk, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, mk.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, mk.body));
        })));
    }

    // ─── KNOTS tab
    function knotsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪢 Mariner Knots'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Same knots a lobsterman needs, an aquaculture farmer needs. Mooring + dropper + gear lashing all rely on these 8.'),
        KNOTS.map(function(k, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, k.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Use: '), k.use, ' · ', h('b', null, 'Where: '), k.where),
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, h('b', null, 'Mnemonic: '), k.mnemonic));
        })));
    }

    // ─── WABANAKI tab
    function wabanakiTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪶 Wabanaki Shellfish Heritage'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s shellfish industry rests on 12,000+ years of Wabanaki stewardship. Modern aquaculture interacts with ongoing tribal sovereignty issues.'),
        WABANAKI.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, w.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, w.body),
            w.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + w.cite + ')') : null);
        })));
    }

    // ─── ACHIEVEMENTS tab
    function achievementsTab() {
      var st = loadState();
      var unlocked = st.achievements || {};
      return h('div', null,
        h('div', { style: cardStyle },
          h('div', { style: headerStyle }, '🏆 Achievements (' + Object.keys(unlocked).length + ' / ' + ACHIEVEMENTS.length + ')'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
            'Unlock by playing missions, completing the quiz, reading curriculum modules.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 } },
            ACHIEVEMENTS.map(function(a, i) {
              var done = !!unlocked[a.id];
              return h('div', { key: a.id, style: { padding: 10, background: done ? 'rgba(134,239,172,0.12)' : 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid ' + (done ? '#86efac' : '#475569'), opacity: done ? 1 : 0.65 } },
                h('div', { style: { fontSize: 22, marginBottom: 4 } }, a.icon),
                h('div', { style: { fontSize: 12, fontWeight: 800, color: done ? '#86efac' : '#cbd5e1', marginBottom: 2 } }, (done ? '✓ ' : '') + a.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.4 } }, a.desc));
            }))));
    }

    // ─── SAFETY tab
    function safetyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦺 Aquaculture Safety Equipment'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Aquaculture means working from boats in cold water. Federal minimums + best-practice additions:'),
        SAFETY.map(function(s, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fdba74' } }, s.emoji + ' ' + s.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 4 } }, h('b', null, 'Required: '), s.required),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginTop: 4, fontStyle: 'italic' } }, h('b', null, 'Reality: '), s.reality));
        })));
    }

    // ─── BOATS tab
    function boatsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🚤 Aquaculture Work Boats'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'From small punts to custom mussel harvesters — Maine aquaculture uses a wide range of boats.'),
        BOATS.map(function(b, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, b.emoji + ' ' + b.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Use: '), b.use),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Power: '), b.power, ' · ', h('b', null, 'Crew: '), b.crew),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, '✓ Pros: '), b.pros),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, '✗ Cons: '), b.cons),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Cost: '), b.typical));
        })));
    }

    // ─── BLUE CARBON tab
    function blueCarbonTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌳 Blue Carbon + Ecosystem Services'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine aquaculture isn\'t just neutral environmental impact — it can provide real ecosystem services. Here\'s the science.'),
        BLUE_CARBON.map(function(b, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, b.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, b.body));
        })));
    }

    // ─── WATER COLUMN tab
    function waterColumnTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Water Column Biology'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Where in the water column you grow determines what you can grow + how well.'),
        WATER_COLUMN_AQ.map(function(z, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, z.zone),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Uses: '), z.use),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Considerations: '), z.considerations));
        })));
    }

    // ─── WEATHER AQ tab
    function weatherAqTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌦 Aquaculture Weather Scenarios'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Weather threats specific to aquaculture operations. Each requires a response playbook.'),
        WEATHER_AQ.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, w.name),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, '⚠ Threat: '), w.threat),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, '✓ Response: '), w.response));
        })));
    }

    // ─── OPERATOR PROFILES tab
    function profilesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏢 Notable Maine Aquaculture Operators'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The operators who built Maine\'s aquaculture industry. Their stories illustrate the diversity of approaches + lessons.'),
        OPERATOR_PROFILES.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, p.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Founded: '), p.founded),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Operation: '), p.operation),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), p.role),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lesson: '), p.lesson));
        })));
    }

    // ─── LESSON PLANS tab
    function lessonPlansTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📓 Lesson Plans'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Ready-to-use templates aligned to Maine + EL Education + NGSS. Build on these for your context.'),
        LESSON_PLANS.map(function(lp, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 6 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac' } }, lp.title),
              h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Grade ' + lp.grade + ' · ' + lp.subject)),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 6 } }, h('b', null, 'Objectives:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              lp.objectives.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Materials: '), lp.materials.join(' · ')),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Flow: '), lp.flow),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Assessment: '), lp.assessment),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Cross-cuts: '), lp.crosscuts.join(' · ')));
        })));
    }

    // ─── BIBLIOGRAPHY tab
    function bibliographyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Bibliography'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'All claims in AquacultureLab trace to one of these sources.'),
        BIBLIOGRAPHY.map(function(b, i) {
          return h('div', { key: i, style: { padding: 8, marginBottom: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
            h('div', null,
              h('b', { style: { color: '#5eead4' } }, b.authors + ' (' + b.year + '). '),
              h('span', { style: { fontStyle: 'italic' } }, b.title),
              b.journal ? h('span', null, '. ' + b.journal) : null,
              h('span', { style: { color: '#94a3b8' } }, ' [' + b.type + ']')),
            b.notes ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, b.notes) : null,
            b.url ? h('div', { style: { fontSize: 10, color: '#86efac', marginTop: 2 } }, b.url) : null);
        })));
    }

    // ─── FARM CALENDAR tab
    function calendarTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📅 Annual Farm Calendar'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A month-by-month rhythm of Maine aquaculture work. Mussel + oyster + kelp seasons interlock.'),
        FARM_CALENDAR.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, m.month),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Conditions: '), m.conditions),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Tasks: '), m.tasks),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Threats: '), m.threats),
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, h('b', null, 'Notes: '), m.notes));
        })));
    }

    // ─── IMTA tab
    function imtaTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔄 IMTA — Integrated Multi-Trophic Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Combining species so waste of one feeds another. Maine has active IMTA research + small-scale trials.'),
        IMTA.map(function(i, idx) {
          return h('div', { key: idx, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, i.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, i.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Benefit: '), i.benefit),
            i.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + i.cite + ')') : null);
        })));
    }

    // ─── FOOD SAFETY tab
    function foodSafetyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦠 Aquaculture Food Safety'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Shellfish food safety is rigorously regulated. Understanding the framework is essential business knowledge.'),
        FOOD_SAFETY.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, f.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.body),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Management: '), f.management),
            f.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + f.cite + ')') : null);
        })));
    }

    // ─── COOPERATIVES tab
    function coopsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Cooperative + Industry Models'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine has a rich tradition of cooperative + collaborative business models. New aquaculture cooperatives are emerging.'),
        COOPERATIVES.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, c.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), c.relevance));
        })));
    }

    // ─── BUSINESS PLAN tab
    function businessPlanTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📝 Aquaculture Business Plan Template'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A complete business plan covers all the dimensions of an aquaculture operation. Use this as a checklist.'),
        BUSINESS_PLAN.map(function(b, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, b.section),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, b.content));
        })));
    }

    // ─── GLOBAL CONTEXT tab
    function globalTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌍 Maine Aquaculture in Global Context'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How does Maine fit into the world aquaculture picture? Small scale, but distinctive niche.'),
        GLOBAL_CONTEXT.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 6 } }, g.region),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, g.body),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine: '), g.maine));
        })));
    }

    // ─── AGENCIES tab
    function agenciesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Regulatory Agencies'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine aquaculture intersects with many regulators. Knowing who does what is essential.'),
        REGULATORY.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, r.agency),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), r.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Responsibilities: '), r.responsibilities),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Contact: '), r.contact));
        })));
    }

    // ─── CARBON DETAIL tab
    function carbonTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📊 Carbon Accounting — Honest Detail'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The science behind aquaculture\'s climate claims. Most are positive but honesty matters more than marketing.'),
        CARBON_DETAIL.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, c.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 3 } }, h('b', null, 'Science: '), c.science),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Net: '), c.net),
            c.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + c.cite + ')') : null);
        })));
    }

    // ─── CAREER PROFILES tab
    function careerProfilesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👤 Aquaculture Career Profiles'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed "day in the life" profiles of real Maine aquaculture roles. Composite portraits.'),
        CAREER_PROFILES.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, p.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Path: '), p.path),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Day: '), p.day),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Challenges: '), p.challenges),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Rewards: '), p.rewards),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Pay: '), p.pay),
            h('div', { style: { fontSize: 11, color: '#bae6fd', fontStyle: 'italic' } }, h('b', null, 'Advice: '), p.advice));
        })));
    }

    // ─── STUDY GUIDE tab
    function studyGuideTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Comprehensive Study Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Unit-by-unit study guide with essential questions + key concepts + suggested assessments.'),
        STUDY_GUIDE.map(function(u, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#c4b5fd', marginBottom: 8 } }, u.unit),
            h('div', { style: { fontSize: 12, color: '#5eead4', marginBottom: 6 } }, h('b', null, 'Essential Questions:')),
            h('ul', { style: { margin: '0 0 10px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              u.essential_questions.map(function(q, qi) { return h('li', { key: qi, style: { marginBottom: 3 } }, q); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Key Concepts: '), u.key_concepts),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Assessments: '), u.assessments));
        })));
    }

    // ─── FAILURE MODES tab
    function failuresTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚠️ Top 10 Aquaculture Failure Modes — What Kills Farms'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Honest look at how Maine aquaculture operations fail. Each mode includes mitigation. Knowing what kills farms is part of knowing how to build resilient ones.'),
        FAILURE_MODES.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #ef4444' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fca5a5', marginBottom: 4 } }, '⚠️ ' + (i+1) + '. ' + f.mode),
            h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.6 } }, f.detail));
        })));
    }

    // ─── AQ METRICS tab
    function aqMetricsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📊 Maine Aquaculture — Key Metrics At-A-Glance'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Headline numbers for understanding Maine\'s aquaculture industry scale + trends. Values approximate + drawn from DMR, Maine Aquaculture Association, Sea Grant, NOAA, and university sources.'),
        AQ_KEY_METRICS.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #14b8a6' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 } },
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#5eead4' } }, m.metric),
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac' } }, m.value)),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, m.context));
        })));
    }

    // ─── AQ TIMELINE tab
    function aqTimelineTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📅 Maine Aquaculture Timeline — 13,000 Years to Today'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine\'s aquaculture history reaches deep — from Wabanaki shellfish stewardship through colonial extraction, 20th-century industrialization, late-1900s commercial aquaculture emergence, and 21st-century climate-driven transformation.'),
        AQ_TIMELINE.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #06b6d4' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#67e8f9', marginBottom: 4 } }, '📅 ' + t.era + ' — ' + t.event),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, t.detail));
        })));
    }

    // ─── STUDENT FAQ tab
    function studentFaqAqTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❓ Student FAQ — Common Questions About Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Real questions middle-schoolers ask about shellfish farming + kelp + careers in Maine aquaculture. Plain-language answers.'),
        STUDENT_FAQ_AQ.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #f97316' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, '❓ ' + f.q),
            h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, f.a));
        })));
    }

    // ─── HATCHERY DEEP DIVE tab
    function hatcheryTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏭 Bivalve Hatchery Operations — Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine aquaculture depends on hatcheries producing reliable seed. This module covers broodstock selection, spawning, larval rearing, algae culture, settlement, nursery, triploid production, disease management, climate-forward breeding, economics, and careers.'),
        HATCHERY_DEEP.map(function(d, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #ec4899' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#f9a8d4', marginBottom: 6 } }, '🏭 ' + d.topic),
            d.summary ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Summary: '), d.summary) : null,
            d.maine_examples ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Maine examples: '), d.maine_examples) : null,
            d.scale ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Scale: '), d.scale) : null,
            d.criteria ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Criteria: '), d.criteria) : null,
            d.sources ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Sources: '), d.sources) : null,
            d.genetic_concerns ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Genetic concerns: '), d.genetic_concerns) : null,
            d.process ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Process: '), d.process) : null,
            d.yield ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Yield: '), d.yield) : null,
            d.hatchery_skill ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Skill: '), d.hatchery_skill) : null,
            d.biology ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Biology: '), d.biology) : null,
            d.tank_conditions ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Tank conditions: '), d.tank_conditions) : null,
            d.feed ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Feed: '), d.feed) : null,
            d.mortality ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Mortality: '), d.mortality) : null,
            d.transition ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Transition: '), d.transition) : null,
            d.remote_set ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Remote set: '), d.remote_set) : null,
            d.single_set ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Single set: '), d.single_set) : null,
            d.cultch_set ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Cultch set: '), d.cultch_set) : null,
            d.after_set ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'After set: '), d.after_set) : null,
            d.growth_rate ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Growth rate: '), d.growth_rate) : null,
            d.grading ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Grading: '), d.grading) : null,
            d.packing ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Packing: '), d.packing) : null,
            d.species ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Species: '), d.species) : null,
            d.cascade_system ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Cascade system: '), d.cascade_system) : null,
            d.contamination ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Contamination: '), d.contamination) : null,
            d.cost ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Cost: '), d.cost) : null,
            d.what ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'What: '), d.what) : null,
            d.how_made ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'How made: '), d.how_made) : null,
            d.maine_use ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Maine use: '), d.maine_use) : null,
            d.ethical_practical ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Ethical/practical: '), d.ethical_practical) : null,
            d.msx_dermo ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'MSX/Dermo: '), d.msx_dermo) : null,
            d.oshv ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'OsHV-1: '), d.oshv) : null,
            d.qpx ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'QPX: '), d.qpx) : null,
            d.bio_security ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Biosecurity: '), d.bio_security) : null,
            d.genetic_resistance ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Genetic resistance: '), d.genetic_resistance) : null,
            d.ocean_acidification ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Ocean acidification: '), d.ocean_acidification) : null,
            d.thermal_tolerance ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Thermal tolerance: '), d.thermal_tolerance) : null,
            d.maine_programs ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Maine programs: '), d.maine_programs) : null,
            d.open_question ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Open question: '), d.open_question) : null,
            d.capital ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Capital: '), d.capital) : null,
            d.operating ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Operating: '), d.operating) : null,
            d.pricing ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Pricing: '), d.pricing) : null,
            d.maine_market ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Maine market: '), d.maine_market) : null,
            d.policy_advocacy ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Policy/advocacy: '), d.policy_advocacy) : null,
            d.hatchery_technician ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Hatchery technician: '), d.hatchery_technician) : null,
            d.hatchery_biologist ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Hatchery biologist: '), d.hatchery_biologist) : null,
            d.hatchery_manager ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Hatchery manager: '), d.hatchery_manager) : null,
            d.research_scientist ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Research scientist: '), d.research_scientist) : null,
            d.careers_to_farms ? h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Careers → farms: '), d.careers_to_farms) : null);
        })));
    }

    // ─── GROW CYCLES tab
    function growCyclesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔄 Composite 18-Month Grow-Season Cycles'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Eight composite grow-season narratives walking through full Maine aquaculture cycles — site, gear, month-by-month decisions, real numbers. Composite = assembled from realistic operations, not a single farm.'),
        COMPOSITE_GROW_SEASONS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 14, background: 'rgba(15,23,42,0.6)', borderRadius: 10, borderLeft: '5px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#2dd4bf', marginBottom: 6 } }, '🔄 ' + c.title),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Site: '), c.site),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 8 } }, h('b', null, 'Gear: '), c.gear),
            h('div', { style: { padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 6, marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6 } }, 'Month-by-month narrative:'),
              c.narrative.map(function(line, j) {
                return h('div', { key: j, style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 4, paddingLeft: 6, borderLeft: '2px solid rgba(20,184,166,0.3)' } }, line);
              })),
            h('div', { style: { fontSize: 11, color: '#86efac', padding: 8, background: 'rgba(134,239,172,0.08)', borderRadius: 6 } }, h('b', null, 'Lessons: '), c.lessons));
        })));
    }

    // ─── KELP DEEP DIVE tab
    function kelpDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌿 Kelp Aquaculture — Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Kelp is Maine\'s fastest-growing aquaculture sector + most climate-positive. Sugar kelp (Saccharina latissima) dominates; winged kelp (Alaria) is a specialty. This module covers biology, hatchery, climate co-benefits, polyculture, buyers, regulations, and economics.'),
        KELP_DEEP.map(function(k, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 10, borderLeft: '5px solid #84cc16' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#bef264', marginBottom: 6 } }, '🌿 ' + k.topic),
            k.bio ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Biology: '), k.bio) : null,
            k.culture ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Culture: '), k.culture) : null,
            k.market ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Market: '), k.market) : null,
            k.bottlenecks ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Bottlenecks: '), k.bottlenecks) : null,
            k.explanation ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Explanation: '), k.explanation) : null,
            k.why_complex ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Why complex: '), k.why_complex) : null,
            k.maine_hatcheries ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Maine hatcheries: '), k.maine_hatcheries) : null,
            k.carbon ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Carbon: '), k.carbon) : null,
            k.nitrogen ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Nitrogen: '), k.nitrogen) : null,
            k.acidification ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Acidification: '), k.acidification) : null,
            k.caveats ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Caveats: '), k.caveats) : null,
            k.concept ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Concept: '), k.concept) : null,
            k.barriers ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Barriers: '), k.barriers) : null,
            k.research ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Research: '), k.research) : null,
            k.atlantic_sea_farms ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Atlantic Sea Farms: '), k.atlantic_sea_farms) : null,
            k.ocean_approved ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Ocean Approved: '), k.ocean_approved) : null,
            k.springtide_seaweed ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Springtide Seaweed: '), k.springtide_seaweed) : null,
            k.university_research ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'University research: '), k.university_research) : null,
            k.international ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'International: '), k.international) : null,
            k.lease ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Lease: '), k.lease) : null,
            k.species_native ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Native species: '), k.species_native) : null,
            k.food_safety ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Food safety: '), k.food_safety) : null,
            k.contaminants ? h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Contaminants: '), k.contaminants) : null,
            k.capital ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Capital: '), k.capital) : null,
            k.labor ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Labor: '), k.labor) : null,
            k.revenue ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Revenue: '), k.revenue) : null,
            k.margin ? h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Margin: '), k.margin) : null,
            k.growth_path ? h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 6 } }, h('b', null, 'Growth path: '), k.growth_path) : null,
            k.growth ? h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Growth: '), k.growth) : null,
            k.buyers ? h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 6 } }, h('b', null, 'Buyers: '), k.buyers) : null,
            k.outlook ? h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Outlook: '), k.outlook) : null);
        })));
    }

    // ─── AQUACULTURE FAMILIES tab
    function aquaFamiliesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👨‍👩‍👧 Maine Aquaculture Family Profiles'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Composite profiles representing Maine aquaculture operators + families. Diverse experiences + paths.'),
        AQUA_FAMILIES.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, f.profile),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.story),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Lessons: '), f.lessons),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Challenges: '), f.challenges));
        })));
    }

    // ─── STUDENT CAREER tab
    function studCareerTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Aquaculture Student Career Decision Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Questions to help students decide if aquaculture is their path + how to pursue it.'),
        STUDENT_CAREER.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, '❓ ' + s.question),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4 } }, h('b', null, 'Consider: '), s.decision_factors),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 4 } }, h('b', null, 'Pathways: '), s.pathways),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4 } }, h('b', null, 'Key steps: '), s.key_steps),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Timeline: '), s.timeline));
        })));
    }

    // ─── COOPERATIVE DEEP tab
    function coopDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Cooperative Models in Maine Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Cooperative + partnership models building Maine aquaculture industry.'),
        COOP_DEEP.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, c.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), c.relevance));
        })));
    }

    // ─── WATERFRONT DEEP tab
    function waterfrontDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚓ Maine Working Waterfront — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Industry-essential infrastructure + ongoing preservation efforts.'),
        WATERFRONT_DEEP.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, w.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, w.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), w.relevance));
        })));
    }

    // ─── HEARING DEEP tab
    function hearingDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏛 Aquaculture Public Hearing — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Navigating Maine\'s public hearing process for standard + experimental aquaculture leases.'),
        HEARING_DEEP.map(function(h_, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, h_.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, h_.content),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Relevance: '), h_.relevance));
        })));
    }

    // ─── FAMILY OPERATIONS tab
    function familyDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👨‍👩‍👧 Aquaculture Family Operations'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Family + multi-generation aquaculture in Maine.'),
        FAMILY_OPERATIONS.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, f.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), f.relevance));
        })));
    }

    // ─── SCALLOP + URCHIN DEEP tab
    function scallopDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐚 Scallop + Urchin + Niche Species — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Emerging niche aquaculture species in Maine.'),
        SCALLOP_URCHIN.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, s.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), s.relevance));
        })));
    }

    // ─── RAS DEEP tab
    function rasDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏭 Land-Based RAS — Future of Maine Finfish Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Climate-resilient + biosecure alternative to sea cages. Whole Oceans Bucksport is leading Maine.'),
        RAS_DEEP.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, r.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, r.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), r.relevance));
        })));
    }

    // ─── TECHNICAL DEEP tab
    function techDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔬 Aquaculture Technical Details'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Technical details of Maine aquaculture operations. Foundation of skilled practice.'),
        TECHNICAL_DEEP.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, t.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, t.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), t.relevance));
        })));
    }

    // ─── KELP INDUSTRY DEEP tab
    function kelpDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌿 Maine Kelp Industry — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Emerging climate-friendly Maine aquaculture industry.'),
        KELP_INDUSTRY.map(function(k, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 4 } }, k.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, k.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), k.relevance));
        })));
    }

    // ─── SALMON INDUSTRY DEEP tab
    function salmonDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🐟 Maine Salmon Industry — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine salmon aquaculture transition: sea-cage to RAS; environmental + tribal considerations.'),
        SALMON_INDUSTRY.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, s.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), s.relevance));
        })));
    }

    // ─── OYSTER INDUSTRY DEEP tab
    function oysterDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🦪 Maine Oyster Industry — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'From extinct wild reefs to nationally-recognized premium aquaculture industry.'),
        OYSTER_INDUSTRY.map(function(o, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, o.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, o.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), o.relevance));
        })));
    }

    // ─── MUSSEL INDUSTRY DEEP tab
    function musselDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪨 Maine Mussel Industry — Deep Case Study'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine mussel industry status + trajectory.'),
        MUSSEL_INDUSTRY.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, m.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, m.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Relevance: '), m.relevance));
        })));
    }

    // ─── ADVANCED ECONOMICS tab
    function advEconTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📈 Advanced Economics — Business Metrics'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed business metrics for Maine aquaculture operations.'),
        ADVANCED_ECONOMICS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, e.metric),
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#86efac', marginBottom: 3 } }, e.value),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Detail: '), e.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Planning: '), e.planning));
        })));
    }

    // ─── CERTIFICATIONS tab
    function certificationsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '✅ Sustainability Certifications + Standards'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Certifications available to Maine aquaculture operators. Market access + retail premium.'),
        CERTIFICATIONS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 4 } }, '✅ ' + c.cert),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Issuer: '), c.issuer),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Scope: '), c.scope),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Requirements: '), c.requirements),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Cost: '), c.cost),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Benefit: '), c.benefit));
        })));
    }

    // ─── NOTABLE PEOPLE tab
    function notablePeopleTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👤 Notable Maine Aquaculture People'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'People shaping Maine aquaculture industry. Industry leaders, scientists, advocates, tribal coordinators.'),
        NOTABLE_PEOPLE.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, p.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Era: '), p.era),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), p.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Contribution: '), p.contribution),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Legacy: '), p.legacy));
        })));
    }

    // ─── GLOBAL PERSPECTIVES tab
    function globalPerspectivesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌍 Global Aquaculture Perspectives'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How Maine compares to global aquaculture regions. Lessons from + comparison with other producers.'),
        GLOBAL_PERSPECTIVES.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, g.region),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Production: '), g.production),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Maine comparison: '), g.maine_comparison),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lessons: '), g.lessons));
        })));
    }

    // ─── TRIBAL INITIATIVES tab
    function tribalInitTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪶 Tribal-Led Aquaculture Initiatives'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Wabanaki nation-led aquaculture + sea-run fish + cultural revitalization initiatives.'),
        TRIBAL_INITIATIVES.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, t.initiative),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, t.content),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Partnerships: '), t.partnerships),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Future: '), t.future));
        })));
    }

    // ─── INDUSTRY GROUPS tab
    function indGroupsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Maine Aquaculture Industry Groups + Associations'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Trade groups, associations, agencies, NGOs supporting Maine aquaculture.'),
        INDUSTRY_GROUPS.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, g.group),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Role: '), g.role),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Function: '), g.function),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Contact: '), g.contact),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Relevance: '), g.relevance));
        })));
    }

    // ─── TERMINOLOGY ESSAYS tab
    function termEssaysTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📖 Aquaculture Term Essays'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Expanded explanations of common aquaculture terminology.'),
        TERMINOLOGY_ESSAYS.map(function(t, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, t.term),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } }, t.essay));
        })));
    }

    // ─── GEAR MASTER LIST tab
    function gearMasterTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧰 Comprehensive Aquaculture Gear + Equipment Master List'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Every piece of gear for Maine aquaculture operations.'),
        GEAR_MASTER.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, g.category),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              g.items.map(function(it, ii) { return h('li', { key: ii, style: { marginBottom: 2 } }, it); })));
        })));
    }

    // ─── VOICES tab
    function voicesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🗣️ Voices from Maine Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Composite quotes representing Maine aquaculture operators, scientists, advocates, tribal voices.'),
        VOICES.map(function(v, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 12, color: '#5eead4', marginBottom: 4 } }, h('b', null, v.speaker)),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 4 } }, '"' + v.quote + '"'),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Context: '), v.context));
        })));
    }

    // ─── MENTORSHIP tab
    function mentorshipTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Aquaculture Mentorship Guide'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How mentorship works in Maine aquaculture. For mentors + mentees.'),
        MENTORSHIP_GUIDE.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, m.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, m.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), m.practical));
        })));
    }

    // ─── FUTURE OUTLOOK tab
    function futureTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔮 Aquaculture Future Outlook + Research Frontiers'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Where Maine aquaculture is heading. Research + technology + climate + sovereignty + community.'),
        FUTURE_OUTLOOK.map(function(f, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, f.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, f.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Maine implications: '), f.maine_implications));
        })));
    }

    // ─── ECONOMICS DEEP DIVE tab
    function econDeepTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📊 Economics Deep Dive'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed economic metrics for Maine aquaculture industry. For business planning + advocacy.'),
        ECONOMICS_DEEP.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, e.metric),
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#86efac', marginBottom: 3 } }, e.value),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Context: '), e.context),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Breakdown: '), e.breakdown),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Growth: '), e.growth));
        })));
    }

    // ─── SAFETY MANUAL tab
    function safetyManTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🛟 Aquaculture Safety Manual'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed safety topics for Maine aquaculture work. Cold water + heavy gear = preparation matters.'),
        SAFETY_MANUAL.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, '🛟 ' + s.topic),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3, lineHeight: 1.5 } }, h('b', null, 'Detail: '), s.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Training: '), s.training),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Best practice: '), s.best_practice));
        })));
    }

    // ─── PLAYBOOKS tab
    function playbooksTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📕 Aquaculture Operational Playbooks'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed step-by-step walkthroughs of common Maine aquaculture operations.'),
        PLAYBOOKS.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 6 } }, '📕 ' + p.situation),
            h('ol', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              p.walkthrough.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s); })),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Learning: '), p.learning));
        })));
    }

    // ─── BIBLIOGRAPHY EXT tab
    function bibExtTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Extended Bibliography'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Comprehensive reading list — books, papers, websites, organizations.'),
        BIBLIOGRAPHY_EXT.map(function(b, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
            h('div', null,
              h('b', { style: { color: '#5eead4' } }, b.author + ' (' + b.year + '). '),
              h('span', { style: { fontStyle: 'italic' } }, b.title),
              h('span', null, ' '), h('span', null, b.publisher),
              h('span', { style: { color: '#94a3b8' } }, ' [' + b.type + ']')),
            h('div', { style: { fontSize: 10, color: '#86efac', marginTop: 2 } }, h('b', null, 'Relevance: '), b.relevance),
            h('div', { style: { fontSize: 10, color: '#fbbf24', marginTop: 2 } }, h('b', null, 'Use: '), b.use));
        })));
    }

    // ─── REFERENCE NUMBERS tab
    function refNumbersTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔢 Key Maine Aquaculture Reference Numbers'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Important quantitative facts. Memorize these for industry literacy.'),
        REFERENCE_NUMBERS.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, r.metric),
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#86efac', marginBottom: 3 } }, r.value),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Context: '), r.context),
            h('div', { style: { fontSize: 11, color: '#5eead4' } }, h('b', null, 'Practical: '), r.practical));
        })));
    }

    // ─── NOTABLE EVENTS tab
    function eventsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📅 Notable Events in Maine Aquaculture History'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Major events shaping Maine aquaculture industry.'),
        NOTABLE_EVENTS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, '📅 ' + e.event),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Year: '), e.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Cause: '), e.cause),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Response: '), e.response),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Lessons: '), e.lessons),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Maine: '), e.maine_implications));
        })));
    }

    // ─── CULINARY tab
    function culinaryTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🍽 Culinary Uses of Maine Aquaculture'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Where the farm meets the kitchen. Maine aquaculture products + culinary applications.'),
        CULINARY.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, '🍽 ' + c.product),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Species: '), c.species),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Preparation: '), c.preparation),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 3 } }, h('b', null, 'Pairing: '), c.pairing),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Market: '), c.market),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Best season: '), c.best_season),
            h('div', { style: { fontSize: 11, color: '#a78bfa' } }, h('b', null, 'Cultural: '), c.cultural));
        })));
    }

    // ─── WORKFORCE PIPELINE tab
    function workforceTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎓 Maine Aquaculture Workforce Pipeline'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Educational + career pipeline for Maine aquaculture industry.'),
        WORKFORCE_PIPELINE.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, s.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Activities: '), s.activities),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Partnerships: '), s.partnerships),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Outcomes: '), s.outcomes));
        })));
    }

    // ─── EMERGENCY tab
    function emergencyTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🚨 Aquaculture Emergency Procedures'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Standard response procedures for aquaculture emergencies. Practice + document.'),
        EMERGENCY_PROCEDURES.map(function(e, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #dc2626' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fca5a5', marginBottom: 6 } }, '🚨 ' + e.emergency),
            h('ol', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              e.response.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s.replace(/^\d+\.\s*/, '')); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Training: '), e.training));
        })));
    }

    // ─── REG FRAMEWORK tab
    function regFrameworkTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚖️ Aquaculture Regulatory Framework'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Federal + state + tribal laws shaping Maine aquaculture.'),
        REG_FRAMEWORK.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, r.law),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Year: '), r.year),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Scope: '), r.scope),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Maine relevance: '), r.relevance),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Keys: '), r.keys));
        })));
    }

    // ─── MAINTENANCE SCHEDULES tab
    function maintenanceTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔧 Equipment Maintenance Schedules'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Daily + weekly + monthly + annual maintenance for aquaculture equipment.'),
        MAINTENANCE_SCHEDULES.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, m.equipment),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Daily: '), m.daily),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Weekly: '), m.weekly),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Monthly: '), m.monthly),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Annually: '), m.annually),
            m.every5yr ? h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, '5-year: '), m.every5yr) : null);
        })));
    }

    // ─── PUBLIC FAQ tab
    function faqPubTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❓ Public Frequently Asked Questions'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Common questions about Maine aquaculture from public + students + chefs.'),
        FAQ_PUBLIC.map(function(f, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, 'Q: ' + f.q),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, h('b', null, 'A: '), f.a));
        })));
    }

    // ─── TRAINING CHECKLIST tab
    function trainingTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 Comprehensive Training Checklist'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          '10-module training program covering all aspects of Maine aquaculture operation.'),
        TRAINING_CHECKLIST.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, m.module),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 4 } }, h('b', null, 'Skills:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              m.skills.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s); })),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Duration: '), m.duration),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Certification: '), m.certification));
        })));
    }

    // ─── STUDENT ACTIVITIES tab
    function activitiesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🎯 Student Hands-On Activities'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Practical hands-on activities for grades 6-12 + community education.'),
        STUDENT_ACTIVITIES.map(function(a, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, a.activity),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, a.content),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 4 } }, h('b', null, 'Learning Objectives:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              a.learning_objectives.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Materials: '), a.materials.join(' · ')),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Time: '), a.time));
        })));
    }

    // ─── COMMUNITY MODELS tab
    function communityTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🤝 Maine Community Governance Models'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How Maine aquaculture communities organize + govern. Models of cooperation + sovereignty + partnership.'),
        COMMUNITY_MODELS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #a78bfa' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#c4b5fd', marginBottom: 6 } }, c.model),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.description),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Example: '), c.example),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Strengths: '), c.strengths),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Limitations: '), c.limitations),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lesson: '), c.lesson));
        })));
    }

    // ─── SUCCESS STORIES tab
    function successTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🏆 Aquaculture Success Stories'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Maine aquaculture restoration + industry-building stories. Proof that long-term investment works.'),
        SUCCESS_STORIES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, '🏆 ' + s.name),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, s.story),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 3 } }, h('b', null, 'Keys: '), s.keys),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Result: '), s.result),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Lessons: '), s.lessons));
        })));
    }

    // ─── EXTENDED GLOSSARY tab
    function extGlossaryTab() {
      var allEntries = EXTENDED_GLOSSARY.concat(EXTENDED_GLOSSARY_NZ);
      allEntries.sort(function(a, b) {
        return a.letter.charCodeAt(0) - b.letter.charCodeAt(0);
      });
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📒 Extended Aquaculture Glossary (A-S)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Comprehensive alphabetical glossary. Continuation of main Glossary tab.'),
        allEntries.map(function(g, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, g.letter),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              g.entries.map(function(e, ei) { return h('li', { key: ei, style: { marginBottom: 2 } }, e); })));
        })));
    }

    // ─── FACTS tab
    function aqFactsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '💡 Key Maine Aquaculture Facts'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Surprising + important facts about Maine aquaculture — for quick reference + classroom discussion.'),
        AQ_FACTS.map(function(f, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fde047', marginBottom: 4 } }, '🔑 ' + f.fact),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Context: '), f.context),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Implication: '), f.implication));
        })));
    }

    // ─── PROCEDURES MANUAL tab
    function proceduresTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📝 Procedures Manual — Step-by-Step'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Detailed step-by-step procedures for core aquaculture operations. Use as checklist + training tool.'),
        PROCEDURES.map(function(p, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 8 } }, p.title),
            h('ol', { style: { margin: '0 0 0 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 } },
              p.content.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 4 } }, s.replace(/^Step \d+:\s*/, '').replace(/^[A-Z][a-z]+:\s*/, function(m) { return '[' + m.replace(':', '') + '] '; })); })));
        })));
    }

    // ─── TEXTBOOK CHAPTERS tab
    function textbookTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📘 Aquaculture Textbook Chapters'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Comprehensive multi-section chapters covering the full aquaculture curriculum. Suitable for high school + community college courses.'),
        TEXTBOOK_CHAPTERS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 14, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 15, fontWeight: 900, color: '#5eead4', marginBottom: 10 } }, c.chapter),
            c.sections.map(function(s, si) {
              return h('div', { key: si, style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(20,184,166,0.3)' } },
                h('p', { style: { margin: 0 } }, s));
            }));
        })));
    }

    // ─── EXTENDED ESSAYS tab
    function extEssaysTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📜 Extended Aquaculture Essays'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-paragraph essays on key aquaculture topics. Deep pedagogical content for educators + advanced learners.'),
        EXTENDED_ESSAYS.map(function(e, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 8 } }, e.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 6 } }, e.content),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), e.practical));
        })));
    }

    // ─── HATCHERY WORKFLOW tab
    function hatchWfTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧪 Hatchery Workflow — Stage by Stage'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A working hatchery is a 10-stage cycle from broodstock to grower-ready spat. Each stage has its own challenges.'),
        HATCHERY_WORKFLOW.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, s.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Details: '), s.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Duration: '), s.duration),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Challenges: '), s.challenges));
        })));
    }

    // ─── EQUIPMENT tab
    function equipmentTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔧 Aquaculture Equipment — Detail'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Equipment used in Maine aquaculture, with costs + lifespan + maintenance.'),
        EQUIPMENT_DETAIL.map(function(e, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 3 } }, e.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Description: '), e.description),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Cost: '), e.cost),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Lifespan: '), e.lifespan),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Maintenance: '), e.maintenance));
        })));
    }

    // ─── DAILY OPS tab
    function dailyOpsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📋 Daily Operations Log Templates'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'What does a working farm day look like? Routine + meticulous.'),
        DAILY_OPS.map(function(d, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 6, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, d.task),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Details: '), d.details),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Time: '), d.time));
        })));
    }

    // ─── FAQ tab
    function faqTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❓ Common Questions from Public + Chefs'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Questions you\'ll get asked. Memorize answers.'),
        FAQ.map(function(f, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#bae6fd', marginBottom: 4 } }, 'Q: ' + f.question),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, h('b', null, 'A: '), f.answer));
        })));
    }

    // ─── SEASONAL TASKS tab
    function seasonalTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🌗 Seasonal Tasks by Species'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Each species has its own seasonal rhythm. Below: what to do when by species.'),
        SEASONAL_TASKS.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, s.species),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, 'Spring: '), s.spring),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Summer: '), s.summer),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Fall: '), s.fall),
            h('div', { style: { fontSize: 11, color: '#bae6fd' } }, h('b', null, 'Winter: '), s.winter));
        })));
    }

    // ─── MISTAKES tab
    function mistakesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚠️ Common First-Year Mistakes (+ How to Avoid)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Learn from others\' mistakes. Most are preventable.'),
        COMMON_MISTAKES.map(function(m, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 4 } }, '⚠ ' + m.mistake),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Consequence: '), m.consequence),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Fix: '), m.fix));
        })));
    }

    // ─── COLD CHAIN tab
    function coldChainTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '❄️ Cold Chain + Logistics'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Shellfish are perishable + temperature-sensitive. Every stage of post-harvest matters.'),
        COLD_CHAIN.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #38bdf8' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, c.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Requirements: '), c.requirements),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3 } }, h('b', null, 'Time/Temp: '), c.time_temp),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, 'Challenges: '), c.challenges),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Cost: '), c.cost));
        })));
    }

    // ─── CHEFS tab
    function chefsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '👨‍🍳 Restaurant + Chef Partnerships'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'How to build profitable restaurant relationships. The story of farm-to-table starts with relationships.'),
        RESTAURANT_PARTNERSHIPS.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 4 } }, p.stage),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Approach: '), p.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Tips: '), p.tips));
        })));
    }

    // ─── CARBON MATH tab
    function carbonMathTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧮 Carbon Math — Worked Examples'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Quantitative examples of aquaculture\'s climate + economic impact. Math made concrete.'),
        CARBON_EXAMPLES.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac', marginBottom: 6 } }, c.example),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3, fontFamily: 'ui-monospace, Menlo, monospace' } }, h('b', null, 'Math: '), c.math),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Context: '), c.context),
            c.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '(' + c.cite + ')') : null);
        })));
    }

    // ─── EXTRA LESSON PLANS tab
    function extraLpTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📚 More Lesson Plans (K-12)'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Additional lesson plan templates across grades + topics.'),
        EXTRA_LESSON_PLANS.map(function(lp, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #86efac' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 6 } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: '#86efac' } }, lp.title),
              h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Grade ' + lp.grade + ' · ' + lp.subject)),
            h('div', { style: { fontSize: 11, color: '#5eead4', marginBottom: 6 } }, h('b', null, 'Objectives:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              lp.objectives.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Materials: '), lp.materials.join(' · ')),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6 } }, h('b', null, 'Flow: '), lp.flow),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Assessment: '), lp.assessment),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Cross-cuts: '), lp.crosscuts.join(' · ')));
        })));
    }

    // ─── NEWS tab
    function newsTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📰 Current Events + Live Topics'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Hot topics in Maine aquaculture. Discussion-starters + research-paper topics.'),
        CURRENT_EVENTS.map(function(c, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fbbf24' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fde047', marginBottom: 4 } }, c.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, c.summary),
            h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, 'Sources: ' + c.sources));
        })));
    }

    // ─── HATCHERY GEAR tab
    function hatcheryGearTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧪 Hatchery Equipment + Costs'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'A working hatchery is capital-intensive. Below are typical equipment + costs.'),
        HATCHERY_GEAR.map(function(g, i) {
          return h('div', { key: i, style: { padding: 10, marginBottom: 8, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4', marginBottom: 4 } }, g.item),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Purpose: '), g.purpose),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Cost: '), g.typical),
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, h('b', null, 'Notes: '), g.notes));
        })));
    }

    // ─── NSSP RULES DETAIL tab
    function nsspRulesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📋 NSSP Rules — Detailed'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'National Shellfish Sanitation Program rules in working detail. Every commercial harvest operates under these.'),
        NSSP_RULES.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, r.rule),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, r.detail),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Practical: '), r.practical));
        })));
    }

    // ─── PERMIT WORKFLOW tab
    function permitWfTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🪪 LPA Permit Workflow — Step by Step'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The complete workflow for an LPA (Limited Purpose Aquaculture) lease application. Standard leases follow similar steps + add public hearing.'),
        PERMIT_WORKFLOW.map(function(p, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } }, p.step),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Action: '), p.action),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 3 } }, h('b', null, 'Time: '), p.time),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Cost: '), p.cost));
        })));
    }

    // ─── REGS DETAIL tab
    function regsDetailTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '⚖️ Maine Aquaculture Regulations — Detail'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'The regulatory landscape of Maine aquaculture. Multi-layered: state + federal + tribal.'),
        REGS_DETAIL.map(function(r, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, r.topic),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 4 } }, r.summary),
            h('div', { style: { fontSize: 11, color: '#fbbf24' } }, h('b', null, 'Key Rule: '), r.key_rule));
        })));
    }

    // ─── WATER QUALITY THRESHOLDS tab
    function wqThreshTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '📏 Water Quality Thresholds by Species'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Species-specific water-quality parameters + thresholds. Cross-check your probe readings against species needs.'),
        WQ_THRESHOLDS.map(function(w, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, w.species),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Temperature: '), w.temp_range),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'Salinity: '), w.salinity_range),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'DO min: '), w.DO_min),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 3 } }, h('b', null, 'pH: '), w.pH_range),
            h('div', { style: { fontSize: 11, color: '#fb923c' } }, h('b', null, 'Stress signs: '), w.stress_indicators));
        })));
    }

    // ─── SPECIES DEEP DIVES tab
    function deepDivesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🔬 Aquaculture Species Deep Dives'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Multi-paragraph essays on Maine\'s top aquaculture species. Taxonomy, life history, biology, aquaculture method, market, stressors, stewardship.'),
        SPECIES_DEEP_DIVES.map(function(s, i) {
          return h('div', { key: i, style: { padding: 14, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 8 } }, s.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, h('b', null, 'Taxonomy: '), s.taxonomy),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Life History: '), s.lifeHistory),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Biology: '), s.biology),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.6 } }, h('b', null, 'Aquaculture: '), s.aquaculture),
            h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 6 } }, h('b', null, 'Market: '), s.market),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 6 } }, h('b', null, 'Stressors: '), s.stressors),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Stewardship: '), s.stewardship),
            s.cite ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } }, '(' + s.cite + ')') : null);
        })));
    }

    // ─── TECHNIQUES tab
    function techniquesTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🛠 Practical Techniques'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Hands-on skills every Maine aquaculture operator needs.'),
        TECHNIQUES.map(function(t, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 10, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #14b8a6' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 6 } }, t.skill),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.5 } }, h('b', null, 'How: '), t.details),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 4 } }, h('b', null, 'Mistake: '), t.mistake),
            h('div', { style: { fontSize: 11, color: '#86efac' } }, h('b', null, 'Practice: '), t.practice));
        })));
    }

    // ─── SCENARIOS tab
    function scenariosTab() {
      return h('div', null, h('div', { style: cardStyle },
        h('div', { style: headerStyle }, '🧠 Decision Scenarios'),
        h('p', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 } },
          'Decision-tree exercises. What would you do? Compare your reasoning to the "best" + "worst" outcomes.'),
        SCENARIOS.map(function(s, i) {
          return h('div', { key: i, style: { padding: 12, marginBottom: 12, background: 'rgba(15,23,42,0.55)', borderRadius: 8, borderLeft: '4px solid #fb923c' } },
            h('div', { style: { fontSize: 13, fontWeight: 900, color: '#fdba74', marginBottom: 6 } }, s.title),
            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6, fontStyle: 'italic' } }, s.situation),
            h('div', { style: { fontSize: 11, color: '#bae6fd', marginBottom: 4 } }, h('b', null, 'Options:')),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
              s.options.map(function(o, oi) { return h('li', { key: oi }, o); })),
            h('div', { style: { fontSize: 11, color: '#86efac', marginBottom: 3 } }, h('b', null, '✓ Best: '), s.best),
            h('div', { style: { fontSize: 11, color: '#fb923c', marginBottom: 3 } }, h('b', null, '✗ Worst: '), s.worst),
            h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, h('b', null, 'Lesson: '), s.lesson));
        })));
    }

    return h('div', { style: { padding: 16, background: '#021816', minHeight: 400 } },
      tabBar(),
      tab === 'home' ? homeTab() :
      tab === 'sim' ? simTab() :
      tab === 'chart' ? chartTab() :
      tab === 'species' ? speciesTab() :
      tab === 'water' ? waterTab() :
      tab === 'site' ? siteTab() :
      tab === 'lease' ? leaseTab() :
      tab === 'hearing' ? hearingTab() :
      tab === 'hatchery' ? hatcheryTab() :
      tab === 'disease' ? diseaseTab() :
      tab === 'climate' ? climateTab() :
      tab === 'history' ? historyTab() :
      tab === 'nssp' ? nsspTab() :
      tab === 'neracoos' ? neracoosTab() :
      tab === 'mooring' ? mooringTab() :
      tab === 'marketing' ? marketingTab() :
      tab === 'econ' ? econTab() :
      tab === 'buoyage' ? buoyageTab() :
      tab === 'colregs' ? colregsTab() :
      tab === 'knots' ? knotsTab() :
      tab === 'wabanaki' ? wabanakiTab() :
      tab === 'safety' ? safetyTab() :
      tab === 'boats' ? boatsTab() :
      tab === 'bluecarbon' ? blueCarbonTab() :
      tab === 'watercol' ? waterColumnTab() :
      tab === 'weatheraq' ? weatherAqTab() :
      tab === 'profiles' ? profilesTab() :
      tab === 'lessonplans' ? lessonPlansTab() :
      tab === 'bibliography' ? bibliographyTab() :
      tab === 'calendar' ? calendarTab() :
      tab === 'imta' ? imtaTab() :
      tab === 'foodsafety' ? foodSafetyTab() :
      tab === 'coops' ? coopsTab() :
      tab === 'businessplan' ? businessPlanTab() :
      tab === 'global' ? globalTab() :
      tab === 'agencies' ? agenciesTab() :
      tab === 'carbon' ? carbonTab() :
      tab === 'careerprofiles' ? careerProfilesTab() :
      tab === 'deepdives' ? deepDivesTab() :
      tab === 'techniques' ? techniquesTab() :
      tab === 'hatcherygear' ? hatcheryGearTab() :
      tab === 'nssprules' ? nsspRulesTab() :
      tab === 'permitwf' ? permitWfTab() :
      tab === 'regsdetail' ? regsDetailTab() :
      tab === 'wqthresh' ? wqThreshTab() :
      tab === 'coldchain' ? coldChainTab() :
      tab === 'chefs' ? chefsTab() :
      tab === 'carbonmath' ? carbonMathTab() :
      tab === 'extralp' ? extraLpTab() :
      tab === 'news' ? newsTab() :
      tab === 'dailyops' ? dailyOpsTab() :
      tab === 'faq' ? faqTab() :
      tab === 'seasonal' ? seasonalTab() :
      tab === 'mistakes' ? mistakesTab() :
      tab === 'extessays' ? extEssaysTab() :
      tab === 'hatchwf' ? hatchWfTab() :
      tab === 'equipment' ? equipmentTab() :
      tab === 'textbook' ? textbookTab() :
      tab === 'procedures' ? proceduresTab() :
      tab === 'studyguide' ? studyGuideTab() :
      tab === 'aqfacts' ? aqFactsTab() :
      tab === 'extglossary' ? extGlossaryTab() :
      tab === 'activities' ? activitiesTab() :
      tab === 'community' ? communityTab() :
      tab === 'success' ? successTab() :
      tab === 'faqpub' ? faqPubTab() :
      tab === 'training' ? trainingTab() :
      tab === 'regframework' ? regFrameworkTab() :
      tab === 'maintenance' ? maintenanceTab() :
      tab === 'workforce' ? workforceTab() :
      tab === 'emergency' ? emergencyTab() :
      tab === 'culinary' ? culinaryTab() :
      tab === 'refnumbers' ? refNumbersTab() :
      tab === 'events' ? eventsTab() :
      tab === 'bibext' ? bibExtTab() :
      tab === 'playbooks' ? playbooksTab() :
      tab === 'safetyman' ? safetyManTab() :
      tab === 'future' ? futureTab() :
      tab === 'econdeep' ? econDeepTab() :
      tab === 'voices' ? voicesTab() :
      tab === 'mentorship' ? mentorshipTab() :
      tab === 'gearmaster' ? gearMasterTab() :
      tab === 'termessays' ? termEssaysTab() :
      tab === 'tribalinit' ? tribalInitTab() :
      tab === 'indgroups' ? indGroupsTab() :
      tab === 'notablepeople' ? notablePeopleTab() :
      tab === 'globalperspectives' ? globalPerspectivesTab() :
      tab === 'advecon' ? advEconTab() :
      tab === 'certifications' ? certificationsTab() :
      tab === 'oysterdeep' ? oysterDeepTab() :
      tab === 'musseldeep' ? musselDeepTab() :
      tab === 'kelpdeep' ? kelpDeepTab() :
      tab === 'salmondeep' ? salmonDeepTab() :
      tab === 'rasdeep' ? rasDeepTab() :
      tab === 'techdeep' ? techDeepTab() :
      tab === 'scallopdeep' ? scallopDeepTab() :
      tab === 'hearingdeep' ? hearingDeepTab() :
      tab === 'familydeep' ? familyDeepTab() :
      tab === 'waterfrontdeep' ? waterfrontDeepTab() :
      tab === 'coopdeep' ? coopDeepTab() :
      tab === 'studcareer' ? studCareerTab() :
      tab === 'growcycles' ? growCyclesTab() :
      tab === 'kelpdeep' ? kelpDeepTab() :
      tab === 'hatchery' ? hatcheryTab() :
      tab === 'aqtimeline' ? aqTimelineTab() :
      tab === 'aqmetrics' ? aqMetricsTab() :
      tab === 'failures' ? failuresTab() :
      tab === 'studentfaq' ? studentFaqAqTab() :
      tab === 'aquafamilies' ? aquaFamiliesTab() :
      tab === 'scenarios' ? scenariosTab() :
      tab === 'careers' ? careersTab() :
      tab === 'achievements' ? achievementsTab() :
      tab === 'glossary' ? glossaryTab() :
      tab === 'quiz' ? quizTab() :
      h('div', null, 'Unknown tab'));
  }

})();

}
