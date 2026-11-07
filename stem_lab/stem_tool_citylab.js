// =====================================================================
// AlloFlow STEAM Lab - City Planning Lab
//
// Design doc: docs/city_planning_lab_design.md
//
// A constraint-satisfaction design tool, NOT a city-builder game. The town
// is frozen. It does not grow, tick, or score. Every number on screen is a
// pure function of the plan as it currently stands.
//
// The load-bearing decision is epistemic, not mechanical. In a planning
// simulation the coefficients ARE claims, so indicators are sorted into
// three tiers:
//
//   TIER 1 MEASURED   geometry and accounting. No coefficient, no disputable
//                     step, hand-checkable with a pencil.
//   TIER 2 MODELED    a published formula with named parameters. Always
//                     shipped with the formula, the parameter values, the
//                     published range and the source visible.
//   TIER 3 CONTESTED  rent, displacement, growth, crime, property values.
//                     NEVER rendered as a number the plan produces. Enforced
//                     by the "tier separation" block of tests/city_lab_core.test.js,
//                     not by good intentions.
//
// The Assumption Lab runs one plan under two documented parameter sets and
// asks which conclusions survive both. That is the actual learning target:
// a conclusion robust to the parameters you are least sure of is one you can
// defend. It is also, unlike any planning fact, uncontested.
//
// House rules followed: every control is a real button or labelled input
// (never div + role + tabIndex), plan state is pure data with no functions
// in it, derived values are computed and never stored, and the board is real
// DOM rather than canvas so keyboard and screen reader support is structural.
// =====================================================================
(function () {
  'use strict';
  // Tool-owned contrast rules. The host forces span ink yellow and each parcel's button black, so the corner
  // plate is the only place the map keeps its land-use and lens colours: keep the colour, pick an ink that reads on it.
  (function () {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-citylab-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-citylab-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"cityLab\"] button[id^=\"citylab-parcel-\"] > span:is([style*=\"background-color: rgb(255, 255, 0)\"],[style*=\"background-color: rgb(224, 242, 254)\"],[style*=\"background-color: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(246, 238, 222)\"],[style*=\"background-color: rgb(0, 255, 255)\"],[style*=\"background-color: rgb(239, 225, 196)\"],[style*=\"background-color: rgb(253, 224, 71)\"],[style*=\"background-color: rgb(232, 211, 160)\"],[style*=\"background-color: rgb(220, 197, 122)\"],[style*=\"background-color: rgb(196, 185, 94)\"],[style*=\"background-color: rgb(56, 189, 248)\"],[style*=\"background-color: rgb(216, 165, 33)\"],[style*=\"background-color: rgb(251, 146, 60)\"],[style*=\"background-color: rgb(147, 173, 92)\"],[style*=\"background-color: rgb(127, 157, 132)\"],[style*=\"background-color: rgb(224, 123, 24)\"],[style*=\"background-color: rgb(49, 166, 86)\"],[style*=\"background-color: rgb(95, 159, 102)\"],[style*=\"background-color: rgb(150, 110, 40)\"],[style*=\"background-color: rgb(203, 75, 22)\"],[style*=\"background-color: rgb(13, 124, 178)\"]){color:#000!important;text-shadow:none}.theme-contrast [data-stem-tool-shell=\"cityLab\"] button[id^=\"citylab-parcel-\"] > span:is([style*=\"background-color: rgb(44, 127, 111)\"]),.theme-contrast [data-stem-tool-shell=\"cityLab\"] button[id^=\"citylab-parcel-\"]:hover > span:is([style*=\"background-color: rgb(44, 127, 111)\"]){color:#fff!important;text-shadow:none}.theme-contrast [data-stem-tool-shell=\"cityLab\"] button[id^=\"citylab-parcel-\"]:hover > span:is([style*=\"background-color: rgb(37, 99, 235)\"],[style*=\"background-color: rgb(147, 51, 234)\"],[style*=\"background-color: rgb(15, 118, 110)\"],[style*=\"background-color: rgb(91, 102, 117)\"],[style*=\"background-color: rgb(3, 105, 161)\"],[style*=\"background-color: rgb(185, 28, 28)\"],[style*=\"background-color: rgb(20, 96, 107)\"],[style*=\"background-color: rgb(12, 74, 110)\"],[style*=\"background-color: rgb(127, 29, 29)\"],[style*=\"background-color: rgb(11, 61, 77)\"],[style*=\"background-color: rgb(0, 0, 0)\"],[style*=\"background-color: rgb(15, 23, 42)\"]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"cityLab\"] button[id^=\"citylab-parcel-\"] > span.top-0.left-0.leading-none{z-index:1}";
    document.head.appendChild(st);
  })();
  // end tool-owned contrast rules
  // Fallback-aware translator reachable from every call site in this tool.
  var __alloCtx_citylab = null;
  // Module-scope strings (town briefs, requirement labels, discussion, history,
  // model explanations) are GETTERS that call this, so they translate at read
  // time once render() has stored ctx, and read as plain English in the tests.
  var __alloT = function (k, fb) {
    var v;
    try { v = (__alloCtx_citylab && typeof __alloCtx_citylab.t === "function") ? __alloCtx_citylab.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null || v === k || typeof v !== 'string') ? (fb != null ? fb : k) : v;
  };
  // Whole-sentence placeholders. Each {name} is swapped with a function
  // replacement, so a value holding "$&" or "$'" is inserted literally.
  // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
  function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
  function fmt(s, vals) {
    var out = String(s);
    Object.keys(vals || {}).forEach(function (name) {
      var pat = new RegExp('\\{' + name + '\\}', 'g');
      out = out.replace(pat, function () { return String(vals[name]); });
    });
    return __alloOneWord(out);
  }
  // Stage D: lookups keyed by saved or imported text. `own` keeps "constructor",
  // "toString" or "__proto__" from resolving to Object.prototype members, and
  // `str` turns a non-string (e.g. {"toString":null}) into '' instead of throwing.
  function own(o, k) { return !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); }
  function str(v) { return typeof v === 'string' ? v : (typeof v === 'number' && isFinite(v) ? String(v) : ''); }

  // ===================================================================
  // SECTION 1 - SCENARIO DATA (authored, never generated)
  // ===================================================================

  var COLS = 'ABCDEFGHIJKL';
  var N_COLS = 12, N_ROWS = 12;
  var HA_PER_PARCEL = 1;          // 100 m x 100 m
  var METRES_PER_EDGE = 100;
  var WALK_KMH = 5;               // 100 m therefore takes 1.2 minutes
  var MIN_PER_HOP = (METRES_PER_EDGE / 1000) / WALK_KMH * 60;

  // Land uses. `units` is dwellings per hectare, `C` the rational-method
  // runoff coefficient. Both are DATA, both are shown in the inspector, and
  // C is scaled by the active assumption set. `code` is drawn inside the
  // parcel so land use never depends on colour alone.
  //
  // Every C sits inside the range FHWA HEC-22 (Urban Drainage Design Manual,
  // 3rd ed., Table 3-1) prints for that land use. Light industry was 0.85,
  // above HEC-22's 0.50-0.80 for light industrial areas; it is now 0.80.
  //
  // `imperv` (share of the parcel that is roof or pavement) and `canopy`
  // (share under tree cover) feed the surface-heat model only. imperv is
  // USDA NRCS TR-55 (1986) Table 2-2a where it has a row: commercial 85%,
  // industrial 72%, town houses 65% (mid density, and mixed use is taken at
  // the commercial figure), quarter-acre lots 38% (low density). Civic 50%
  // and park 5% have no row there and were chosen for this tool, as were
  // every canopy share. The UI says which is which.
  var USES = [
    { id: 'preserve',    code: 'Pr', get label() { return __alloT('stem.citylab.use_preserve', 'Preserve / wetland'); },   units: 0,  C: 0.10, storeys: 0, natural: true,  fill: '#0f766e', pattern: 'dots', imperv: 0, canopy: 0 },
    { id: 'farm',        code: 'Fm', get label() { return __alloT('stem.citylab.use_farm', 'Farmland'); },             units: 0,  C: 0.20, storeys: 0, natural: true,  fill: '#966e28', pattern: 'vert', imperv: 0, canopy: 0 },
    { id: 'field',       code: 'Fd', get label() { return __alloT('stem.citylab.use_field', 'Open field (vacant)'); },  units: 0,  C: 0.20, storeys: 0, natural: true,  fill: '#7f9d84', pattern: 'none', imperv: 0, canopy: 0 },
    { id: 'park',        code: 'Pk', get label() { return __alloT('stem.citylab.use_park', 'Park / open space'); },    units: 0,  C: 0.20, storeys: 0, natural: false, fill: '#31a656', pattern: 'dots', imperv: 0.05, canopy: 0.30 },
    { id: 'housing_low', code: 'Hl', get label() { return __alloT('stem.citylab.use_housing_low', 'Housing, low density'); }, units: 12, C: 0.45, storeys: 2, natural: false, fill: '#d8a521', pattern: 'hatch', imperv: 0.38, canopy: 0.25 },
    { id: 'housing_mid', code: 'Hm', get label() { return __alloT('stem.citylab.use_housing_mid', 'Housing, mid density'); }, units: 45, C: 0.65, storeys: 4, natural: false, fill: '#e07b18', pattern: 'hatch', imperv: 0.65, canopy: 0.15 },
    { id: 'mixed',       code: 'Mx', get label() { return __alloT('stem.citylab.use_mixed', 'Mixed use'); },            units: 60, C: 0.75, storeys: 5, natural: false, fill: '#cb4b16', pattern: 'cross', imperv: 0.85, canopy: 0.08 },
    { id: 'commercial',  code: 'Cm', get label() { return __alloT('stem.citylab.use_commercial', 'Commercial'); },           units: 0,  C: 0.85, storeys: 2, natural: false, fill: '#9333ea', pattern: 'cross', imperv: 0.85, canopy: 0.05 },
    { id: 'civic',       code: 'Cv', get label() { return __alloT('stem.citylab.use_civic', 'Civic (school, clinic)'); }, units: 0, C: 0.75, storeys: 2, natural: false, fill: '#2563eb', pattern: 'vert', imperv: 0.50, canopy: 0.15 },
    { id: 'industry',    code: 'In', get label() { return __alloT('stem.citylab.use_industry', 'Light industry'); },       units: 0,  C: 0.80, storeys: 1, natural: false, fill: '#5b6675', pattern: 'hatch', imperv: 0.72, canopy: 0.03 },
    { id: 'water',       code: '~~', get label() { return __alloT('stem.citylab.use_water', 'River'); },                units: 0,  C: 1.00, storeys: 0, natural: true,  fill: '#0d7cb2', pattern: 'none', fixed: true, imperv: 0, canopy: 0 }
  ];
  var USE_BY_ID = {};
  for (var _u = 0; _u < USES.length; _u++) USE_BY_ID[USES[_u].id] = USES[_u];

  // Uses a student may assign. River is terrain and cannot be rezoned.
  // `storeys` is DISPLAY ONLY, in the same category as fill, code and pattern.
  // It exists so the 3D view can give every built use some bulk: commercial,
  // civic and industry all have units: 0, so massing by dwellings per hectare
  // would render the school, the shops and the factory as pancakes.
  //
  // It is indicative, not modelled. Nothing in any indicator reads it, and a
  // test asserts the scorecard is byte-identical whatever it is set to.
  var METRES_PER_STOREY = 3;
  // One vertical exaggeration for everything, stated on screen. Terrain and
  // buildings differ by more than an order of magnitude in these towns, so no
  // single factor flatters both; see the note on the surge planes.
  // W2 (2026-11-04): 8 -> 4, still ONE factor for ground and buildings, so the
  // town reads before the hills do; the ground also starts at the town's
  // lowest point (see buildMassing), which the panel says.
  var VERT_EXAG = 4;

  var PALETTE_IDS = ['field', 'park', 'preserve', 'farm', 'housing_low', 'housing_mid',
    'mixed', 'commercial', 'civic', 'industry'];

  var BASE_CHARS = {
    '.': 'field', '~': 'water', 'f': 'farm', 'w': 'preserve',
    'h': 'housing_low', 'c': 'civic', 'x': 'commercial'
  };

  // Riverbend as it stands today. The river meanders south-east; the old town
  // sits on the west bank around a single bridge on row 6.
  // -------------------------------------------------------------------
  // SCENARIOS. Everything that makes a town a town lives here as DATA:
  // terrain, existing buildings, the road it already has, its brief, and
  // which requirements it is judged against. No scenario-specific logic
  // exists anywhere else in this file. Adding a third town should mean
  // adding an entry here and nothing more, which is the property the
  // second town was written to prove.
  // -------------------------------------------------------------------
  var SCENARIOS = {

    riverbend: {
      id: 'riverbend',
      town: 'Riverbend',
      get blurb() { return __alloT('stem.citylab.rb_blurb', 'A river town. Stormwater is the constraint that bites.'); },
      get intro() {
        return __alloT('stem.citylab.rb_intro', 'Riverbend has to find room for 1,200 more homes over the next twenty years. ' +
          'The floodplain is off limits to new housing, the bond is fixed, and the planning ' +
          'board wants families within a short walk of a park. Show them a plan.');
      },
      get floodLabel() { return __alloT('stem.citylab.rb_flood_label', 'the mapped 100-year floodplain'); },
      coreParcel: 'D6',
      elevBaseM: 8, elevStepM: 3,
      modelsWater: false,
      designStormMmPerHour: 50,
      baseMap: [
        '....~...ffff',
        '....~...ffff',
        '...h~....fff',
        '..hh~....fff',
        '.hhc~.....ff',
        '.hcx~.....ff',
        '.hhx.~....ff',
        '..hh.~....ff',
        '.....~....ff',
        '......~ww..f',
        '......~www..',
        '.......~www.'
      ],
      // Three existing buildings sit inside the floodplain, including the
      // school at D5. Deliberate, and true to how towns actually are. It is
      // reported as an observation, never as the student's violation.
      floodMap: [
        '000111000000',
        '000111000000',
        '000111000000',
        '000111000000',
        '000111000000',
        '000111100000',
        '000011100000',
        '000011110000',
        '000011110000',
        '000001111100',
        '000001111110',
        '000000111111'
      ],
      elevMap: [
        '554323455666',
        '554323455666',
        '544322445566',
        '543322345566',
        '443322344556',
        '433322234555',
        '433322234455',
        '333322234455',
        '333222233445',
        '332222112344',
        '222221111234',
        '222211111233'
      ],
      // ACCESS RULE: a parcel is reached when a road link runs INTO it. A road
      // on the next parcel does not count, because links run centre to centre
      // and the walk-access model measures along those same links; letting
      // "next to a road" count for homes but not for walking would make the
      // two disagree. So the town is authored with the lanes its existing
      // homes really use: B5 and B7 hang off the main street at B6.
      roads: [
        { kind: 'row', row: 6, from: 0, to: 11 },     // main street, over the one bridge
        { kind: 'col', col: 3, from: 2, to: 9 },      // column D spine
        { kind: 'col', col: 2, from: 4, to: 8 },
        { kind: 'col', col: 1, from: 5, to: 7 }       // the lane serving B5 and B7
      ],
      targetNewUnits: 1200,
      runoffCeilingRatio: 1.25,
      bondDollars: 22000000,
      parkWalkMinutes: 5,
      parkAccessTarget: 0.90,
      civicWalkMinutes: 10,
      farmlandCeilingHa: 15,
      requirements: [
        { id: 'req_units',  hard: true,  get label() { return __alloT('stem.citylab.rb_req_units', 'Add at least 1,200 new homes that a road actually reaches'); } },
        { id: 'req_flood',  hard: true,  get label() { return __alloT('stem.citylab.rb_req_flood', 'No new homes inside the mapped 100-year floodplain'); } },
        { id: 'req_runoff', hard: true,  get label() { return __alloT('stem.citylab.rb_req_runoff', 'Peak stormwater runoff no more than 25 percent above today'); } },
        { id: 'req_cost',   hard: true,  get label() { return __alloT('stem.citylab.rb_req_cost', 'Public infrastructure cost at or under the 22 million dollar bond'); } },
        { id: 'req_park',   hard: false, get label() { return __alloT('stem.citylab.rb_req_park', 'At least 90 percent of homes within a 5-minute walk of a park'); } },
        { id: 'req_farm_max', hard: false, get label() { return __alloT('stem.citylab.rb_req_farm_max', 'Convert no more than 15 hectares of active farmland'); } },
        { id: 'req_preserve', hard: false, get label() { return __alloT('stem.citylab.rb_req_preserve', 'Build on none of the protected wetland'); } }
      ]
    },

    // The second town exists to make one point: the binding constraint is a
    // property of the PLACE, not of the tool. Here there is no river to
    // bridge and stormwater is a footnote. What runs out is water, and the
    // only large supply of it is already being drunk by the farms, so the
    // hard constraint and the soft one pull in opposite directions.
    mesahollow: {
      id: 'mesahollow',
      town: 'Mesa Hollow',
      get blurb() { return __alloT('stem.citylab.mh_blurb', 'A desert town. Water supply is the constraint that bites, and farmland is drinking it.'); },
      get intro() {
        return __alloT('stem.citylab.mh_intro', 'Mesa Hollow needs room for 600 more homes, and the aquifer under it recharges ' +
          'at a fixed rate that nobody can vote to increase. The irrigated fields along the wash ' +
          'take most of that water today. The board wants the homes, wants the farms kept, and ' +
          'cannot have both. Show them a plan.');
      },
      get floodLabel() { return __alloT('stem.citylab.mh_flood_label', 'the flash-flood wash'); },
      coreParcel: 'D6',
      elevBaseM: 8, elevStepM: 3,
      modelsWater: true,
      designStormMmPerHour: 65,          // desert storms are short and violent
      landLabels: {
        get field() { return __alloT('stem.citylab.mh_use_field', 'Desert scrub (vacant)'); },
        get preserve() { return __alloT('stem.citylab.mh_use_preserve', 'Protected desert'); },
        get farm() { return __alloT('stem.citylab.mh_use_farm', 'Irrigated farmland'); }
      },
      baseMap: [
        '...ff.......',
        '...ff.......',
        '..fff.......',
        '..fhf.......',
        '.hhcf.......',
        '.hhxf.......',
        '.hhxff......',
        '..hh.ff.....',
        '......ff....',
        'ww....ff....',
        'www....ff...',
        'www.....ff..'
      ],
      // The wash. It floods perhaps twice a decade and carries everything in
      // it away when it does. One existing house at D4 sits in it.
      floodMap: [
        '000110000000',
        '000110000000',
        '001110000000',
        '001110000000',
        '000011000000',
        '000011000000',
        '000011100000',
        '000001100000',
        '000001110000',
        '000000110000',
        '000000111000',
        '000000011100'
      ],
      elevMap: [
        '765443455667',
        '765443455667',
        '654332455667',
        '654332445566',
        '655432445566',
        '654322345566',
        '654322234556',
        '655432234556',
        '665432233455',
        '776542123455',
        '777654112345',
        '777655111234'
      ],
      // Column D starts at row 4: the road runs INTO the existing house at D4,
      // under the access rule set out above Riverbend's roads.
      roads: [
        { kind: 'row', row: 6, from: 0, to: 5 },      // the short main street
        { kind: 'col', col: 1, from: 5, to: 7 },
        { kind: 'col', col: 2, from: 4, to: 8 },
        { kind: 'col', col: 3, from: 4, to: 8 }
      ],
      targetNewUnits: 600,
      runoffCeilingRatio: 1.40,
      bondDollars: 12000000,
      parkWalkMinutes: 5,
      parkAccessTarget: 0.85,
      civicWalkMinutes: 10,
      farmlandFloorHa: 12,
      // Safe yield of the aquifer, in cubic metres per day. A physical
      // property of the basin, not a policy number.
      aquiferYieldM3PerDay: 1400,
      requirements: [
        { id: 'req_units',  hard: true,  get label() { return __alloT('stem.citylab.mh_req_units', 'Add at least 600 new homes that a road actually reaches'); } },
        { id: 'req_flood',  hard: true,  get label() { return __alloT('stem.citylab.mh_req_flood', 'No new homes inside the flash-flood wash'); } },
        { id: 'req_water',  hard: true,  get label() { return __alloT('stem.citylab.mh_req_water', 'Total water demand within the safe yield of the aquifer'); } },
        { id: 'req_cost',   hard: true,  get label() { return __alloT('stem.citylab.mh_req_cost', 'Public infrastructure cost at or under the 12 million dollar bond'); } },
        { id: 'req_park',   hard: false, get label() { return __alloT('stem.citylab.mh_req_park', 'At least 85 percent of homes within a 5-minute walk of a park'); } },
        { id: 'req_farm_min', hard: false, get label() { return __alloT('stem.citylab.mh_req_farm_min', 'Keep at least 12 hectares of irrigated farmland'); } },
        { id: 'req_runoff', hard: false, get label() { return __alloT('stem.citylab.mh_req_runoff', 'Flash-flood runoff no more than 40 percent above today'); } },
        { id: 'req_preserve', hard: false, get label() { return __alloT('stem.citylab.mh_req_preserve', 'Build on none of the protected desert'); } }
      ]
    }
  };

  // The third town asks a question the other two cannot: not "does this plan
  // work", but "does it still work later". The land that is safe to build on
  // is not a fixed map here. It is derived from ground elevation plus the
  // rise the board asked you to plan for, and that allowance is an assumption
  // set parameter. Change the assumption and the safe area of the map
  // physically changes.
  //
  // Framing matters and is stated in the panel: the allowance is what the
  // board told you to plan for, NOT a prediction. This tool does not forecast
  // sea level and does not claim to.
  //
  // HORIZON: 2100, not 2050 (changed 2026-11-03). The allowances are 0.3, 0.6
  // and 1.0 m. NOAA's 2022 Sea Level Rise Technical Report (Sweet et al., NOAA
  // Tech. Rep. NOS 01) puts the rise along US coasts from 2020 to 2050 at
  // about 0.25-0.30 m on average, so 0.6 and 0.9 m "by 2050" were outside
  // anything it publishes. Its 2100 scenarios (global mean, relative to 2000)
  // are Low 0.3, Intermediate-Low 0.5, Intermediate 1.0, Intermediate-High
  // 1.5 and High 2.0 m, so 0.3 and 1.0 are named scenarios and 0.6 sits
  // between two of them. Homes permitted now will still stand in 2100, which
  // is why long-lived planning uses that horizon.
  SCENARIOS.harborlight = {
    id: 'harborlight',
    town: 'Harborlight',
    get blurb() { return __alloT('stem.citylab.hl_blurb', 'A coastal town. The constraint is time: homes built now must still be safe in 2100.'); },
    get intro() {
      return __alloT('stem.citylab.hl_intro', 'Harborlight needs room for 700 more homes. The hard part is not this year: ' +
        'homes built now will still be standing in 2100. The board has asked for a plan that keeps new housing out of the ' +
        'storm surge today AND out of the reach it is planned to have by 2100, and the higher ' +
        'ground is a narrow band. Show them a plan that still stands up later.');
    },
    get floodLabel() { return __alloT('stem.citylab.hl_flood_label', 'the storm surge reach'); },
    coreParcel: 'F8',
    modelsWater: false,
    modelsSeaRise: true,
    designStormMmPerHour: 55,
    // Coastal ground is measured in tenths of a metre. A 3 m elevation band
    // would make every parcel identical to a sea-level question.
    elevBaseM: 0.2, elevStepM: 0.3,
    // Elevation the storm surge reaches today, before any allowance.
    surgeBaseElevationM: 1.45,
    landLabels: {
      get preserve() { return __alloT('stem.citylab.hl_use_preserve', 'Salt marsh'); },
      get water() { return __alloT('stem.citylab.hl_use_water', 'The bay'); }
    },
    baseMap: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '..........~~',
      '....hh...~~~',
      '...hcxh..w~~',
      '...hhxh.ww~~',
      '....hh..ww~~',
      '......wwww~~',
      '.....wwww~~~'
    ],
    // Today's surge reach. Derived from the elevation map below at the base
    // elevation, and a test asserts the two never drift apart.
    floodMap: [
      '000000000000',
      '000000000000',
      '000000000000',
      '000000000001',
      '000000000011',
      '000000000111',
      '000000001111',
      '000000111111',
      '000001111111',
      '000011111111',
      '000111111111',
      '001111111111'
    ],
    elevMap: [
      '999888777666',
      '998887776665',
      '988877766655',
      '888777666554',
      '887776665543',
      '877766655432',
      '777666554321',
      '776655443210',
      '766554432100',
      '665544321000',
      '655443210000',
      '554432100000'
    ],
    // G8 to G9 is the lane into the existing house at G9 (the access rule is
    // set out above Riverbend's roads).
    roads: [
      { kind: 'row', row: 8, from: 0, to: 6 },
      { kind: 'col', col: 4, from: 7, to: 10 },
      { kind: 'col', col: 5, from: 7, to: 10 },
      { kind: 'col', col: 3, from: 8, to: 9 },
      { kind: 'col', col: 6, from: 8, to: 9 }
    ],
    targetNewUnits: 700,
    runoffCeilingRatio: 1.30,
    bondDollars: 16000000,
    parkWalkMinutes: 5,
    parkAccessTarget: 0.85,
    civicWalkMinutes: 10,
    requirements: [
      { id: 'req_units',  hard: true,  get label() { return __alloT('stem.citylab.hl_req_units', 'Add at least 700 new homes that a road actually reaches'); } },
      { id: 'req_flood',  hard: true,  get label() { return __alloT('stem.citylab.hl_req_flood', 'No new homes inside the storm surge reach today'); } },
      { id: 'req_future_flood', hard: true, get label() { return __alloT('stem.citylab.hl_req_future_flood', 'No new homes inside the surge reach planned for 2100'); } },
      { id: 'req_cost',   hard: true,  get label() { return __alloT('stem.citylab.hl_req_cost', 'Public infrastructure cost at or under the 16 million dollar bond'); } },
      { id: 'req_park',   hard: false, get label() { return __alloT('stem.citylab.hl_req_park', 'At least 85 percent of homes within a 5-minute walk of a park'); } },
      { id: 'req_preserve', hard: false, get label() { return __alloT('stem.citylab.hl_req_preserve', 'Build on none of the salt marsh'); } },
      { id: 'req_runoff', hard: false, get label() { return __alloT('stem.citylab.hl_req_runoff', 'Peak runoff no more than 30 percent above today'); } }
    ]
  };

  // ===================================================================
  // THE OTHER HALF OF TIER 3
  //
  // Section 3 of the design doc excludes contested quantities from the
  // scorecard and promises they reappear as discussion, "naming the
  // disagreement and the sides". Excluding them without delivering that is
  // avoidance rather than a position, so here it is.
  //
  // Rules these were written under, and that anything added later must keep:
  //   - Name at least two positions that serious people actually hold.
  //   - Give each its reasoning, not a caricature.
  //   - Do not resolve it. There is no "correct" side marked anywhere.
  //   - `toolSays` states plainly what this tool did and did not contribute,
  //     which is usually "counted something and then stopped".
  //   - No invented statistics and no cited studies. These are questions,
  //     not evidence summaries.
  // ===================================================================
  var SHARED_DISCUSSION = [
    {
      id: 'disc_rents',
      get question() { return __alloT('stem.citylab.disc_rents_question', 'You added homes. What happens to what it costs to live here?'); },
      get why() { return __alloT('stem.citylab.disc_rents_why', 'This is the number the tool refuses to print, and this is why.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_rents_side1_label', 'More homes eases pressure'); },
          get view() { return __alloT('stem.citylab.disc_rents_side1_view', 'More homes for the same number of households means fewer people competing for ' +
            'each one, so prices rise more slowly than they otherwise would have.'); } },
        { get label() { return __alloT('stem.citylab.disc_rents_side2_label', 'Where you build changes the answer'); },
          get view() { return __alloT('stem.citylab.disc_rents_side2_view', 'Building in one neighbourhood can speed up change in that neighbourhood even ' +
            'while helping the region overall, so a regional effect and a local one can point ' +
            'in opposite directions at the same time.'); } },
        { get label() { return __alloT('stem.citylab.disc_rents_side3_label', 'What gets built matters more than how much'); },
          get view() { return __alloT('stem.citylab.disc_rents_side3_view', 'The mix, the price point, and whether anything is held below market may matter ' +
            'more than the raw count of homes.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_rents_toolSays', 'This tool counts homes. It does not model prices at all. People who study ' +
        'this for a living genuinely disagree, so a number here would be one position dressed ' +
        'up as arithmetic.'); }
    },
    {
      id: 'disc_displacement',
      get question() { return __alloT('stem.citylab.disc_displacement_question', 'If a neighbourhood changes, who ends up living there afterwards?'); },
      get why() { return __alloT('stem.citylab.disc_displacement_why', 'Displacement is one of the things the scorecard refuses to put a number on.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_displacement_side1_label', 'Investment can help the people already there'); },
          get view() { return __alloT('stem.citylab.disc_displacement_side1_view', 'Money spent on a neighbourhood that has had none for decades can mean better ' +
            'services, repaired streets and more choice for households who have been asking ' +
            'for exactly that.'); } },
        { get label() { return __alloT('stem.citylab.disc_displacement_side2_label', 'The people already there may not be the ones who benefit'); },
          get view() { return __alloT('stem.citylab.disc_displacement_side2_view', 'Renters have the least protection when costs rise, and a neighbourhood can ' +
            'improve on every measure you could name while many of the households who lived ' +
            'through the difficult years are no longer in it.'); } },
        { get label() { return __alloT('stem.citylab.disc_displacement_side3_label', 'It turns on what comes with the building'); },
          get view() { return __alloT('stem.citylab.disc_displacement_side3_view', 'Whether anyone has to leave can depend on tenant protections, on whether homes ' +
            'are added or replaced, and on what a household can actually afford to move to. ' +
            'None of those is a property of the buildings themselves.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_displacement_toolSays', 'The tool does not know who lives anywhere. It counts dwellings, not ' +
        'households, and it cannot tell you who is in them before or after.'); }
    },
    {
      id: 'disc_room',
      get question() { return __alloT('stem.citylab.disc_room_question', 'Who actually decides this, and who is in the room?'); },
      get why() { return __alloT('stem.citylab.disc_room_why', 'You made every decision in this tool alone, in about forty minutes.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_room_side1_label', 'The people who show up'); },
          get view() { return __alloT('stem.citylab.disc_room_side1_view', 'Planning boards hear from whoever comes to an evening meeting, which is not a ' +
            'random sample of a town.'); } },
        { get label() { return __alloT('stem.citylab.disc_room_side2_label', 'The people who cannot'); },
          get view() { return __alloT('stem.citylab.disc_room_side2_view', 'People who rent, work nights, care for someone, or do not speak the language ' +
            'the meeting is held in are affected by the plan and are often not there.'); } },
        { get label() { return __alloT('stem.citylab.disc_room_side3_label', 'The people who do not exist yet'); },
          get view() { return __alloT('stem.citylab.disc_room_side3_view', 'Most of the people who will live with a twenty-year plan have no way to be ' +
            'consulted about it.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_room_toolSays', 'Nothing here models politics, objections, lawsuits, or a landowner who says ' +
        'no. A real plan takes years and a great many arguments.'); }
    },
    {
      id: 'disc_pays',
      get question() { return __alloT('stem.citylab.disc_pays_question', 'The bond paid for roads and parks. Builders paid for the buildings. Is that split right?'); },
      get why() { return __alloT('stem.citylab.disc_pays_why', 'The tool assumed one answer and told you it was assuming.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_pays_side1_label', 'Builders should pay'); },
          get view() { return __alloT('stem.citylab.disc_pays_side1_view', 'A development creates the need for the road, so the project should carry that ' +
            'cost rather than everyone else.'); } },
        { get label() { return __alloT('stem.citylab.disc_pays_side2_label', 'The town should pay'); },
          get view() { return __alloT('stem.citylab.disc_pays_side2_view', 'Infrastructure outlasts any one project and serves everyone, and loading fees ' +
            'onto building raises the cost of the homes.'); } },
        { get label() { return __alloT('stem.citylab.disc_pays_side3_label', 'Somewhere in between'); },
          get view() { return __alloT('stem.citylab.disc_pays_side3_view', 'Most places land on a mix, and where exactly is argued over constantly.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_pays_toolSays', 'The bond covers public infrastructure only. That was a modelling choice, and ' +
        'changing it would change which plans fit the budget.'); }
    },
    // Added 2026-11-03 (stage B) with the bus-stop walk measure. The tool
    // measures who is within a walk of a stop; how many people would RIDE is
    // mode share, which is contested and never printed (CONTESTED_IDS).
    {
      id: 'disc_mode_share',
      get question() { return __alloT('stem.citylab.disc_mode_question', 'Put a bus stop near every home. Will people actually take the bus?'); },
      get why() { return __alloT('stem.citylab.disc_mode_why', 'The scorecard tells you who can walk to a stop. It will not tell you who rides.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_mode_side1_label', 'Access comes first'); },
          get view() { return __alloT('stem.citylab.disc_mode_side1_view', 'Nobody rides a bus they cannot reach. A stop within an easy walk is the ' +
            'precondition for everything else, and towns that never provide it never find out what demand there was.'); } },
        { get label() { return __alloT('stem.citylab.disc_mode_side2_label', 'Frequency and destinations matter more'); },
          get view() { return __alloT('stem.citylab.disc_mode_side2_view', 'A stop next door is worth little if the bus comes once an hour or does not go ' +
            'where people work, shop and study. What a route connects can matter more than how close the stop is.'); } },
        { get label() { return __alloT('stem.citylab.disc_mode_side3_label', 'It comes down to the whole trip'); },
          get view() { return __alloT('stem.citylab.disc_mode_side3_view', 'People compare the door-to-door time and cost of every option they have. ' +
            'Free parking, wide roads and habit can keep a car the easier choice even beside a good stop.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_mode_toolSays', 'The tool counts homes within a five-minute walk of a stop along streets and ' +
        'paths. It does not model how often a bus runs, where it goes, fares or ridership, and it does not predict how many people would leave the car at home.'); }
    }
  ];

  SCENARIOS.riverbend.discussion = [
    {
      id: 'disc_rb_flood',
      get question() { return __alloT('stem.citylab.disc_rb_flood_question', 'Homes and a school already sit in the floodplain. What should the town do about them?'); },
      get why() { return __alloT('stem.citylab.disc_rb_flood_why', 'The tool grandfathered them, counted them, and moved on.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_rb_flood_side1_label', 'Buy out over time'); },
          get view() { return __alloT('stem.citylab.disc_rb_flood_side1_view', 'Purchase properties as they come up for sale and let the land go back to ' +
            'floodplain, which is slow and expensive but permanent.'); } },
        { get label() { return __alloT('stem.citylab.disc_rb_flood_side2_label', 'Protect what is there'); },
          get view() { return __alloT('stem.citylab.disc_rb_flood_side2_view', 'Engineering can reduce the risk, though it has to keep working and has to be ' +
            'maintained by someone.'); } },
        { get label() { return __alloT('stem.citylab.disc_rb_flood_side3_label', 'Leave them and require flood-proofing'); },
          get view() { return __alloT('stem.citylab.disc_rb_flood_side3_view', 'People live there now, moving is not free, and requiring changes at sale ' +
            'spreads the cost over decades.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_rb_flood_toolSays', 'The tool told you how many homes are exposed. It does not price any of these ' +
        'options and has no view on which is right.'); }
    },
    {
      id: 'disc_rb_farm',
      get question() { return __alloT('stem.citylab.disc_rb_farm_question', 'Is farmland worth keeping in a town that needs houses?'); },
      get why() { return __alloT('stem.citylab.disc_rb_farm_why', 'The brief set a ceiling of 15 hectares. It did not justify it.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_rb_farm_side1_label', 'Keep it'); },
          get view() { return __alloT('stem.citylab.disc_rb_farm_side1_view', 'Food grown close to where it is eaten, open land, and a working landscape are ' +
            'hard to get back once built on.'); } },
        { get label() { return __alloT('stem.citylab.disc_rb_farm_side2_label', 'Build on it'); },
          get view() { return __alloT('stem.citylab.disc_rb_farm_side2_view', 'Flat farmland is often the cheapest land to build on, so protecting it pushes ' +
            'housing further out, which has its own costs.'); } },
        { get label() { return __alloT('stem.citylab.disc_rb_farm_side3_label', 'It may not be the town that decides'); },
          get view() { return __alloT('stem.citylab.disc_rb_farm_side3_view', 'Somebody owns that field. They may want to sell it, they may be the fourth ' +
            'generation farming it, and a zoning line drawn on a map does not by itself settle ' +
            'what happens next on land somebody else holds.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_rb_farm_toolSays', 'The ceiling was a number in the brief. The tool measured your compliance with ' +
        'it and has no opinion about whether it was the right ceiling.'); }
    }
  ];

  SCENARIOS.mesahollow.discussion = [
    {
      id: 'disc_mh_rights',
      get question() { return __alloT('stem.citylab.disc_mh_rights_question', 'The aquifer is fixed. Who is entitled to the water in it?'); },
      get why() { return __alloT('stem.citylab.disc_mh_rights_why', 'You retired hectares of irrigated farmland with a click. In a real basin that is ' +
        'a water right somebody holds.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_mh_rights_side1_label', 'Whoever has used it longest'); },
          get view() { return __alloT('stem.citylab.disc_mh_rights_side1_view', 'Across much of the arid west, water law runs on seniority: earlier users are ' +
            'served in full before later ones get anything. That is the law, whatever anyone ' +
            'thinks of it.'); } },
        { get label() { return __alloT('stem.citylab.disc_mh_rights_side2_label', 'Whoever owns the land above it'); },
          get view() { return __alloT('stem.citylab.disc_mh_rights_side2_view', 'Other legal traditions tie the right to use water to ownership of the land ' +
            'it sits under, which makes the question who holds the deeds rather than who got ' +
            'there first.'); } },
        { get label() { return __alloT('stem.citylab.disc_mh_rights_side3_label', 'Tribal nations with reserved rights'); },
          get view() { return __alloT('stem.citylab.disc_mh_rights_side3_view', 'Reserved water rights can predate a state entirely, and in some basins they ' +
            'are still being quantified in court.'); } },
        { get label() { return __alloT('stem.citylab.disc_mh_rights_side4_label', 'Everyone, held in trust'); },
          get view() { return __alloT('stem.citylab.disc_mh_rights_side4_view', 'On this view water is a public resource that a government holds for everybody ' +
            'rather than a thing that can be owned outright.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_mh_rights_toolSays', 'This is law and values, not arithmetic, and the tool does not model any of it. ' +
        'It compared demand with yield and stopped there.'); }
    },
    {
      id: 'disc_mh_growth',
      get question() { return __alloT('stem.citylab.disc_mh_growth_question', 'If the aquifer cannot supply more, should the town grow at all?'); },
      get why() { return __alloT('stem.citylab.disc_mh_growth_why', 'The brief told you to add 600 homes. It never asked whether you should.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_mh_growth_side1_label', 'Growth is how a town survives'); },
          get view() { return __alloT('stem.citylab.disc_mh_growth_side1_view', 'Places that stop adding housing get older and more expensive, and young ' +
            'families leave.'); } },
        { get label() { return __alloT('stem.citylab.disc_mh_growth_side2_label', 'A town can choose its size'); },
          get view() { return __alloT('stem.citylab.disc_mh_growth_side2_view', 'Some communities decide a physical limit is a real limit and plan to stay ' +
            'the size their water supports.'); } },
        { get label() { return __alloT('stem.citylab.disc_mh_growth_side3_label', 'Reduce demand instead'); },
          get view() { return __alloT('stem.citylab.disc_mh_growth_side3_view', 'Efficiency, different crops, and different landscaping change the arithmetic ' +
            'without changing the number of people.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_mh_growth_toolSays', 'The tool obeys the brief. Whether the brief was reasonable is outside it.'); }
    }
  ];

  SCENARIOS.harborlight.discussion = [
    {
      id: 'disc_hl_retreat',
      get question() { return __alloT('stem.citylab.disc_hl_retreat_question', 'Homes are already inside the reach planned for 2100. Defend, raise, or move them?'); },
      get why() { return __alloT('stem.citylab.disc_hl_retreat_why', 'The tool counted them and stopped.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_hl_retreat_side1_label', 'Defend'); },
          get view() { return __alloT('stem.citylab.disc_hl_retreat_side1_view', 'Build protection. It works until it does not, it has to be maintained forever, ' +
            'and what it protects tends to become more valuable and more built up.'); } },
        { get label() { return __alloT('stem.citylab.disc_hl_retreat_side2_label', 'Raise and accommodate'); },
          get view() { return __alloT('stem.citylab.disc_hl_retreat_side2_view', 'Lift buildings and design for water. Cheaper per building, and it does not ' +
            'help the streets, pipes, or anyone who cannot afford the work.'); } },
        { get label() { return __alloT('stem.citylab.disc_hl_retreat_side3_label', 'Move over time'); },
          get view() { return __alloT('stem.citylab.disc_hl_retreat_side3_view', 'Buy out and relocate across decades. It is real practice, it is permanent, ' +
            'and where it has been tried it has often been deeply unpopular with the people ' +
            'asked to go.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_hl_retreat_toolSays', 'The tool does not price a sea wall, model whether one holds, or know anything ' +
        'about what it is like to be told to leave a house.'); }
    },
    {
      id: 'disc_hl_permit',
      get question() { return __alloT('stem.citylab.disc_hl_permit_question', 'Should the town keep issuing permits on ground that is dry today and inside the 2100 reach?'); },
      get why() { return __alloT('stem.citylab.disc_hl_permit_why', 'You watched the safe area of the map change when you changed the allowance.'); },
      sides: [
        { get label() { return __alloT('stem.citylab.disc_hl_permit_side1_label', 'Yes, with conditions'); },
          get view() { return __alloT('stem.citylab.disc_hl_permit_side1_view', 'Require raised construction and let people make their own decisions about ' +
            'risk they are told about.'); } },
        { get label() { return __alloT('stem.citylab.disc_hl_permit_side2_label', 'No, stop now'); },
          get view() { return __alloT('stem.citylab.disc_hl_permit_side2_view', 'Every home permitted there is one somebody has to deal with later, and the ' +
            'cost of that lands on the public.'); } },
        { get label() { return __alloT('stem.citylab.disc_hl_permit_side3_label', 'It depends whose allowance you plan to'); },
          get view() { return __alloT('stem.citylab.disc_hl_permit_side3_view', 'The answer changes with the number, and nobody can hand you the right number.'); } }
      ],
      get toolSays() { return __alloT('stem.citylab.disc_hl_permit_toolSays', 'This is the whole reason the coastal town exists. The tool showed you that ' +
        'the answer depends on an assumption. It cannot tell you which assumption to make.'); }
    }
  ];

  function discussionFor(planOrId) {
    return (scenarioOf(planOrId).discussion || []).concat(SHARED_DISCUSSION);
  }

  // ===================================================================
  // THE HEARING (grades 9-12). Two stakeholder briefs per town, authored to
  // the discussion rules above: real positions, reasoning not caricature, no
  // statistics. `watches` lists the scorecard indicators each would point to,
  // which is how the memo's counter-argument is checked for RELEVANT evidence
  // without anything reading the prose.
  // ===================================================================
  SCENARIOS.riverbend.stakeholders = [
    { id: 'rb_farm',
      get name() { return __alloT('stem.citylab.sh_rb_farm_name', 'The Riverbend farm cooperative'); },
      get wants() { return __alloT('stem.citylab.sh_rb_farm_wants', 'Keep the eastern fields in production. Farmland lost to houses does not come back, and the members farming it now have nowhere else to go.'); },
      get asks() { return __alloT('stem.citylab.sh_rb_farm_asks', 'How much farmland does your plan take, and did you need to take any of it?'); },
      watches: ['farmlandConvertedHa', 'farmHa', 'builtAreaHa', 'runoffRatio'] },
    { id: 'rb_homes',
      get name() { return __alloT('stem.citylab.sh_rb_homes_name', 'Families on the housing waiting list'); },
      get wants() { return __alloT('stem.citylab.sh_rb_homes_wants', 'As many homes as the brief allows, near the old town, with a park, a school or clinic and a bus within walking distance.'); },
      get asks() { return __alloT('stem.citylab.sh_rb_homes_asks', 'How many families does your plan actually house, and can they walk to what they need?'); },
      watches: ['newUnitsServed', 'parkAccessPct', 'civicAccessPct', 'transitAccessPct'] }
  ];
  SCENARIOS.mesahollow.stakeholders = [
    { id: 'mh_irrigation',
      get name() { return __alloT('stem.citylab.sh_mh_irr_name', 'The irrigation district'); },
      get wants() { return __alloT('stem.citylab.sh_mh_irr_wants', 'Keep the irrigated fields along the wash. The farms were here first and the district holds the water they use.'); },
      get asks() { return __alloT('stem.citylab.sh_mh_irr_asks', 'Whose water are your new homes drinking, and how much farmland did you retire to get it?'); },
      watches: ['farmHa', 'waterDemandM3PerDay', 'waterHeadroomM3PerDay', 'farmlandConvertedHa'] },
    { id: 'mh_young',
      get name() { return __alloT('stem.citylab.sh_mh_young_name', 'Young families who grew up here'); },
      get wants() { return __alloT('stem.citylab.sh_mh_young_wants', 'Homes they can live in without leaving town, on streets that are not baking hot in summer, near a park.'); },
      get asks() { return __alloT('stem.citylab.sh_mh_young_asks', 'Does your plan leave room for us, and will the new streets be bearable in a desert summer?'); },
      watches: ['newUnitsServed', 'homeSurfaceHeatC', 'parkAccessPct', 'transitAccessPct'] }
  ];
  SCENARIOS.harborlight.stakeholders = [
    { id: 'hl_harbour',
      get name() { return __alloT('stem.citylab.sh_hl_harbour_name', 'Waterfront business owners'); },
      get wants() { return __alloT('stem.citylab.sh_hl_harbour_wants', 'Homes close to the harbour, where the shops, the jobs and the old town already are, not up a hill a long walk away.'); },
      get asks() { return __alloT('stem.citylab.sh_hl_harbour_asks', 'Why put the new homes so far from everything the town already has?'); },
      watches: ['newUnitsServed', 'civicAccessPct', 'transitAccessPct', 'capitalCost'] },
    { id: 'hl_resilience',
      get name() { return __alloT('stem.citylab.sh_hl_res_name', 'The county coastal resilience officer'); },
      get wants() { return __alloT('stem.citylab.sh_hl_res_wants', 'Nothing new inside the reach planned for 2100, even under the cautious allowance, and the salt marsh left alone.'); },
      get asks() { return __alloT('stem.citylab.sh_hl_res_asks', 'Which of your new homes would someone have to defend, raise or move later?'); },
      watches: ['newUnitsInFutureSurge', 'landAtRiskHa', 'preserveConvertedHa', 'existingUnitsInFutureSurge'] }
  ];

  // ===================================================================
  // THE READING LAYER
  //
  // Section 3 lists documented case studies as the third route by which
  // contested subject matter reaches a student. These clear the integrity
  // bar that a modelled rent number does not, for one reason: they are
  // ARCHIVAL RECORD rather than inference. The maps exist. The statutes
  // exist. What people argue about is what any of it caused, and each entry
  // says so in its own `contested` field rather than leaving the reader to
  // guess where the record stops.
  //
  // Rules, enforced by tests where they can be:
  //   - `what` is what is documented. `contested` is what is argued about.
  //     Every entry carries both, because an entry with only the first
  //     reads as settled and an entry with only the second reads as opinion.
  //   - No statistics, no casualty or displacement counts, no cited studies.
  //     A fabricated number here would be worse than in any other part of
  //     this tool, because history is exactly where a made-up figure gets
  //     repeated.
  //   - `toolSays` names the limit of the SIMULATION the student just used.
  //     This is the adjacency guard: put documented history beside a model
  //     and a reader will assume the model explains it.
  //   - The towns are invented and these places are not, and the panel
  //     says so at the top.
  // ===================================================================
  var CASE_STUDIES = [
    {
      id: 'case_holc',
      get title() { return __alloT('stem.citylab.case_holc_title', 'Grading neighbourhoods on a map'); },
      get place() { return __alloT('stem.citylab.case_holc_place', 'United States'); },
      get period() { return __alloT('stem.citylab.case_holc_period', '1930s onward'); },
      get what() { return __alloT('stem.citylab.case_holc_what', 'A federal agency, the Home Owners Loan Corporation, produced colour-graded maps ' +
        'of American cities. Neighbourhoods were graded A to D. D was printed in red, which is ' +
        'where the word redlining comes from. The written area descriptions filed alongside the ' +
        'maps recorded the racial and ethnic makeup of each neighbourhood and named it as a ' +
        'reason for the grade.'); },
      get record() { return __alloT('stem.citylab.case_holc_record', 'The maps and their area descriptions survive in the national archives and have ' +
        'been digitised and published by university researchers. You can read the sheets and ' +
        'the descriptions themselves rather than take anybody at their word for what they say.'); },
      get contested() { return __alloT('stem.citylab.case_holc_contested', 'That the maps exist and say what they say is not in dispute. What historians ' +
        'and economists argue about is how far the maps CAUSED the disinvestment that followed ' +
        'and how far they recorded decisions lenders were already making, and how much of the ' +
        'difference between neighbourhoods today traces to them rather than to everything that ' +
        'happened afterwards.'); },
      get toolSays() { return __alloT('stem.citylab.case_holc_toolSays', 'You have just spent an hour assigning grades to squares on a map of a town. ' +
        'This tool scored your grades against a brief. It has no way to tell you what a line ' +
        'drawn on a map does to the people inside it, and no simulation does.'); }
    },
    {
      id: 'case_renewal',
      get title() { return __alloT('stem.citylab.case_renewal_title', 'Clearance, and roads through neighbourhoods'); },
      get place() { return __alloT('stem.citylab.case_renewal_place', 'United States'); },
      get period() { return __alloT('stem.citylab.case_renewal_period', 'roughly 1949 to the 1970s'); },
      get what() { return __alloT('stem.citylab.case_renewal_what', 'Federal programmes paid for clearing areas officially designated as blighted and ' +
        'redeveloping the cleared land. Highway building in the same decades routed new roads ' +
        'through neighbourhoods that already existed. Homes and businesses were demolished and ' +
        'the people in them moved.'); },
      get record() { return __alloT('stem.citylab.case_renewal_record', 'The programmes were created by named federal statutes, the blight designations ' +
        'were made in public documents, and city archives, minutes and newspapers recorded what ' +
        'was cleared, when, and by whose decision.'); },
      get contested() { return __alloT('stem.citylab.case_renewal_contested', 'What is argued about is why particular neighbourhoods were chosen, what ' +
        'alternatives were genuinely available at the time, what the people displaced were ' +
        'owed, and how much of what followed would have happened regardless.'); },
      get toolSays() { return __alloT('stem.citylab.case_renewal_toolSays', 'In this tool you changed land use with a click and it reported hectares. ' +
        'Nobody had to move, because nobody in Riverbend exists. That gap between a hectare ' +
        'and a household is the whole of what the record above is about.'); }
    },
    {
      id: 'case_japan',
      get title() { return __alloT('stem.citylab.case_japan_title', 'Zoning set nationally, and zones that nest'); },
      get place() { return __alloT('stem.citylab.case_japan_place', 'Japan'); },
      get period() { return __alloT('stem.citylab.case_japan_period', 'current system'); },
      get what() { return __alloT('stem.citylab.case_japan_what', 'Japan sets land-use zoning through national law rather than leaving each ' +
        'municipality to write its own, using a small number of zone categories. The categories ' +
        'broadly nest: uses allowed in a quieter zone are generally also allowed in a busier ' +
        'one, so a shop is not automatically excluded from a residential street.'); },
      get record() { return __alloT('stem.citylab.case_japan_record', 'The system is set out in national legislation and the zone categories and what ' +
        'each permits are published.'); },
      get contested() { return __alloT('stem.citylab.case_japan_contested', 'What is argued about is how much this structure explains differences in what ' +
        'actually gets built, and how much is down to other things entirely: how buildings are ' +
        'taxed and valued as they age, demographics, and the aftermath of particular economic ' +
        'periods.'); },
      get toolSays() { return __alloT('stem.citylab.case_japan_toolSays', 'The briefs here let you put any use on any parcel with no process and no ' +
        'objection. That is a simplification made to keep the exercise doable, not a proposal.'); }
    },
    {
      id: 'case_nl',
      get title() { return __alloT('stem.citylab.case_nl_title', 'A street where cars are the guests'); },
      get place() { return __alloT('stem.citylab.case_nl_place', 'Netherlands'); },
      get period() { return __alloT('stem.citylab.case_nl_period', '1970s onward'); },
      get what() { return __alloT('stem.citylab.case_nl_what', 'Dutch street design widely separates cycling from motor traffic with its own ' +
        'infrastructure, and the woonerf, a street built so that motor vehicles move at walking ' +
        'pace among people, originated there and has a legal definition. This was a deliberate ' +
        'change of direction argued over and made across decades. It is not an old tradition ' +
        'that was always there.'); },
      get record() { return __alloT('stem.citylab.case_nl_record', 'The design standards are published, the woonerf is defined in traffic law, and ' +
        'the period in which the change was pushed for and adopted is well documented.'); },
      get contested() { return __alloT('stem.citylab.case_nl_contested', 'What is argued about is how far the approach transfers to places built at ' +
        'different densities and around longer distances, and what it would actually take to ' +
        'get there from wherever somewhere else is starting.'); },
      get toolSays() { return __alloT('stem.citylab.case_nl_toolSays', 'This tool draws a road or a path and counts what it costs. It knows nothing ' +
        'about what either is like to use, or about how long it takes a place to change its mind.'); }
    }
  ];

  var SCENARIO_IDS = Object.keys(SCENARIOS);
  var DEFAULT_SCENARIO = 'riverbend';

  function scenarioOf(planOrId) {
    if (!planOrId) return SCENARIOS[DEFAULT_SCENARIO];
    var id = typeof planOrId === 'string' ? planOrId : planOrId.scenarioId;
    return own(SCENARIOS, id) ? SCENARIOS[id] : SCENARIOS[DEFAULT_SCENARIO];
  }

  // Display label for a land use, honouring any per-scenario rename. Open
  // field is desert scrub in Mesa Hollow, and calling it a field there would
  // be a small lie in a tool whose whole argument is about not telling those.
  function useLabel(useId, planOrId) {
    var sc = scenarioOf(planOrId);
    var over = sc.landLabels && sc.landLabels[useId];
    return over || (USE_BY_ID[useId] ? USE_BY_ID[useId].label : useId);
  }

  // Roads that already exist. Free, and cannot be removed.
  function buildExistingEdges(scenarioId) {
    var sc = scenarioOf(scenarioId);
    var out = [];
    sc.roads.forEach(function (seg) {
      var i;
      if (seg.kind === 'row') {
        for (i = seg.from; i < seg.to; i++) out.push(edgeKey(pid(i, seg.row), pid(i + 1, seg.row)));
      } else {
        for (i = seg.from; i < seg.to; i++) out.push(edgeKey(pid(seg.col, i), pid(seg.col, i + 1)));
      }
    });
    return out;
  }

  // Kept as an alias so callers that predate the second town keep working.
  // Anything scenario-aware should use scenarioOf(plan) instead.
  var BRIEF = SCENARIOS[DEFAULT_SCENARIO];

  // -------------------------------------------------------------------
  // Assumption sets. Deliberately framed as the LOW and HIGH ends of the
  // published range rather than as ideological positions, so the comparison
  // is about parameter uncertainty and not about politics.
  // -------------------------------------------------------------------
  //
  // Where each range comes from is listed in PARAMETER_SOURCES below and shown
  // on screen next to the model it feeds.
  var ASSUMPTION_SETS = [
    {
      id: 'central',
      get label() { return __alloT('stem.citylab.set_central_label', 'Central estimates'); },
      get blurb() { return __alloT('stem.citylab.set_central_blurb', 'Midpoint of the published range for every parameter.'); },
      runoffScale: 1.00, giCredit: 0.15, costScale: 1.00, householdSize: 2.4,
      litresPerPersonPerDay: 300, farmIrrigationM3PerHaPerDay: 40, parkIrrigationM3PerHaPerDay: 25,
      planningSeaRiseM: 0.6,
      // Surface heat, degrees C (see surfaceHeatOf and PARAMETER notes there).
      heatHardC: 38, heatShadeC: 18, heatCoolRoofC: 28
    },
    {
      id: 'conservative',
      get label() { return __alloT('stem.citylab.set_conservative_label', 'Conservative estimates (high end)'); },
      get blurb() {
        return __alloT('stem.citylab.set_conservative_blurb', 'Runoff coefficients and unit costs at the top of the published range, ' +
          'and the green-infrastructure credit at the bottom of its range. What a cautious engineer assumes.');
      },
      runoffScale: 1.10, giCredit: 0.10, costScale: 1.20, householdSize: 2.6,
      litresPerPersonPerDay: 380, farmIrrigationM3PerHaPerDay: 50, parkIrrigationM3PerHaPerDay: 32,
      // NOAA 2022 Intermediate scenario for 2100. Was 0.9 "by 2050".
      planningSeaRiseM: 1.0,
      // Hot surfaces at the top of EPA's range; shade and cool roofs at the bottom.
      heatHardC: 50, heatShadeC: 11, heatCoolRoofC: 20
    },
    {
      id: 'optimistic',
      get label() { return __alloT('stem.citylab.set_optimistic_label', 'Optimistic estimates (low end)'); },
      get blurb() {
        return __alloT('stem.citylab.set_optimistic_blurb', 'Runoff coefficients and unit costs at the bottom of the published range, ' +
          'and the green-infrastructure credit at the top of its range. What an enthusiastic proposal assumes.');
      },
      runoffScale: 0.90, giCredit: 0.20, costScale: 0.85, householdSize: 2.2,
      litresPerPersonPerDay: 240, farmIrrigationM3PerHaPerDay: 30, parkIrrigationM3PerHaPerDay: 18,
      // NOAA 2022 Low scenario for 2100.
      planningSeaRiseM: 0.3,
      heatHardC: 27, heatShadeC: 25, heatCoolRoofC: 33
    }
  ];
  var SET_BY_ID = Object.create(null);   // no prototype: SET_BY_ID['constructor'] is undefined
  for (var _s = 0; _s < ASSUMPTION_SETS.length; _s++) SET_BY_ID[ASSUMPTION_SETS[_s].id] = ASSUMPTION_SETS[_s];

  // Unit costs in dollars, scaled by costScale. ILLUSTRATIVE, and labelled so
  // on screen: no single price list stands behind them. civic_each ($9M) is
  // clinic or branch-library scale; a whole new school usually costs several
  // times that, and the cost model says so rather than hiding it.
  var COSTS = {
    road_local: 180000,        // per 100 m segment, carriageway plus utilities
    road_arterial: 420000,
    path: 45000,               // walking and cycling only
    bridge_road: 2800000,      // any road segment touching a river parcel
    bridge_path: 900000,
    park_per_ha: 600000,
    green_infra_per_ha: 250000,
    civic_each: 9000000,
    // An accessible stop: boarding pad, shelter, sign. Illustrative like the
    // rest. Running the bus is an operating cost and is NOT on the bond.
    transit_stop: 60000
  };

  // Surface heat. One shared roof share of the hard surface (chosen for this
  // tool), the canopy a green-infrastructure parcel gains (chosen: the GI
  // overlay is described as including trees), and the walk-shed of a stop.
  var HEAT_ROOF_SHARE = 0.4;
  var GI_CANOPY_GAIN = 0.15;
  var TRANSIT_WALK_MINUTES = 5;
  // The heat mission lets the homes' average surface heat rise this much over
  // today's homes, under the central estimates.
  // Sized so mid density passes with cool roofs, and mixed use only with
  // cool roofs AND shade (checked in tests/citylab_deep_stageb_model.test.js).
  var HEAT_MISSION_ALLOWANCE_C = 6;

  // -------------------------------------------------------------------
  // TIER 3. Never computed, never rendered, never exported. The "tier
  // separation" block of tests/city_lab_core.test.js asserts this set never
  // intersects the rendered indicator ids.
  // -------------------------------------------------------------------
  var CONTESTED_IDS = ['rent', 'affordability', 'displacement', 'gentrification',
    'jobs', 'economicGrowth', 'propertyValue', 'crime', 'approval', 'happiness',
    'healthOutcome', 'schoolQuality', 'tax_revenue',
    // Stage B: who would ride, and what heat does to health, stay contested.
    'modeShare', 'ridership', 'heatIllness', 'airTemperature'];

  var TIER1_IDS = ['newUnitsServed', 'totalUnitsServed', 'unitsUnserved', 'builtAreaHa',
    'farmlandConvertedHa', 'preserveConvertedHa', 'newUnitsInFloodplain',
    'existingUnitsInFloodplain', 'parkHa', 'farmHa', 'parkAccessPct',
    'parkAccessPctAsCrowFlies', 'civicAccessPct', 'newRoadMetres', 'transitAccessPct'];
  var TIER2_IDS = ['runoffCoefficient', 'peakRunoffQ', 'baselineRunoffQ', 'runoffRatio',
    'capitalCost', 'population', 'parkHaPer1000',
    'waterDemandM3PerDay', 'waterHeadroomM3PerDay',
    'newUnitsInFutureSurge', 'existingUnitsInFutureSurge', 'landAtRiskHa',
    'surfaceHeatC', 'homeSurfaceHeatC'];

  // Water only exists in a town that has a water problem. renderedIndicatorIds()
  // stays the UNION across every scenario, because the contested-tier guard must
  // not be narrowed by which town happens to be open.
  var WATER_IDS = ['waterDemandM3PerDay', 'waterHeadroomM3PerDay'];
  var SEA_IDS = ['newUnitsInFutureSurge', 'existingUnitsInFutureSurge', 'landAtRiskHa'];
  function visibleIndicatorIds(tierIds, planOrId) {
    var sc = scenarioOf(planOrId);
    return tierIds.filter(function (id) {
      if (!sc.modelsWater && WATER_IDS.indexOf(id) !== -1) return false;
      if (!sc.modelsSeaRise && SEA_IDS.indexOf(id) !== -1) return false;
      return true;
    });
  }

  function renderedIndicatorIds() { return TIER1_IDS.concat(TIER2_IDS); }

  // Nineteen label-and-number rows in a flat column is a spreadsheet dump, not
  // a scorecard. These groups are display only; the tier an indicator belongs
  // to is still what decides whether an assumption can move it.
  //
  // A grouped list can silently drop an indicator that nobody put in a group,
  // so a test asserts every id in TIER1_IDS and TIER2_IDS appears in exactly
  // one group here.
  var TIER1_GROUPS = [
    { id: 'homes', get label() { return __alloT('stem.citylab.group_homes', 'Homes'); },
      ids: ['newUnitsServed', 'totalUnitsServed', 'unitsUnserved'] },
    { id: 'land', get label() { return __alloT('stem.citylab.group_land', 'Land'); },
      ids: ['builtAreaHa', 'parkHa', 'farmHa', 'farmlandConvertedHa', 'preserveConvertedHa'] },
    { id: 'exposure', get label() { return __alloT('stem.citylab.group_exposure', 'Exposure'); },
      ids: ['newUnitsInFloodplain', 'existingUnitsInFloodplain'] },
    { id: 'access', get label() { return __alloT('stem.citylab.group_access', 'Getting around'); },
      ids: ['parkAccessPct', 'parkAccessPctAsCrowFlies', 'civicAccessPct', 'transitAccessPct', 'newRoadMetres'] }
  ];
  var TIER2_GROUPS = [
    { id: 'storm', get label() { return __alloT('stem.citylab.group_storm', 'Stormwater'); },
      ids: ['runoffCoefficient', 'peakRunoffQ', 'baselineRunoffQ', 'runoffRatio'] },
    { id: 'money', get label() { return __alloT('stem.citylab.group_money', 'Money'); },
      ids: ['capitalCost'] },
    { id: 'people', get label() { return __alloT('stem.citylab.group_people', 'People'); },
      ids: ['population', 'parkHaPer1000'] },
    { id: 'water', get label() { return __alloT('stem.citylab.group_water', 'Water supply'); },
      ids: ['waterDemandM3PerDay', 'waterHeadroomM3PerDay'] },
    { id: 'sea', get label() { return __alloT('stem.citylab.group_sea', 'Sea level'); },
      ids: ['newUnitsInFutureSurge', 'existingUnitsInFutureSurge', 'landAtRiskHa'] },
    { id: 'heat', get label() { return __alloT('stem.citylab.group_heat', 'Surface heat'); },
      ids: ['surfaceHeatC', 'homeSurfaceHeatC'] }
  ];

  // SLACK: how far a requirement is from failing, 0 to 1. Full means plenty of
  // room, empty means sitting right on the edge, negative means past it.
  //
  // It reports slack rather than "how much of the allowance you have used"
  // because that first version was ambiguous in a way that took a screenshot
  // to notice: a full bar meant "target met" on an at-least target and "almost
  // out of room" on an at-most limit. Same picture, opposite meanings, sitting
  // one row apart. Slack means the same thing on every row.
  //
  // Deliberately NOT accompanied by a "this is your binding constraint" label.
  // The memo asks the student to name it, and naming it for them would answer
  // the question the assignment exists to ask. Showing the slack lets them see
  // it; saying it out loud would do the seeing for them.
  function headroomFraction(row) {
    if (!row || typeof row.actual !== 'number' || typeof row.target !== 'number') return null;
    if (row.unit === 'ratio') {
      // A ratio is measured against today, so the span that matters is the
      // allowed INCREASE, not the whole number.
      if (row.target <= 1) return null;
      return (row.target - row.actual) / (row.target - 1);
    }
    if (row.target === 0) return row.met ? 1 : -1;          // "none of this at all"
    if (row.floor) return Math.min(1, (row.actual - row.target) / row.target);
    return (row.target - row.actual) / row.target;
  }

  // ===================================================================
  // SECTION 2 - PURE MODEL
  // ===================================================================

  function pid(col, row) { return COLS.charAt(col) + row; }          // row is 1-based
  function parcelCol(id) { return COLS.indexOf(id.charAt(0)); }
  function parcelRow(id) { return parseInt(id.slice(1), 10); }
  function inGrid(col, row) { return col >= 0 && col < N_COLS && row >= 1 && row <= N_ROWS; }

  function edgeKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function edgeEnds(key) { return key.split('|'); }

  function allParcelIds() {
    var out = [];
    for (var r = 1; r <= N_ROWS; r++) for (var c = 0; c < N_COLS; c++) out.push(pid(c, r));
    return out;
  }

  function terrainAt(id, planOrId) {
    var sc = scenarioOf(planOrId);
    var c = parcelCol(id), r = parcelRow(id);
    return {
      id: id, col: c, row: r,
      baseUse: BASE_CHARS[sc.baseMap[r - 1].charAt(c)],
      floodplain: sc.floodMap[r - 1].charAt(c) === '1',
      elevationM: Math.round((sc.elevBaseM + parseInt(sc.elevMap[r - 1].charAt(c), 10) * sc.elevStepM) * 100) / 100
    };
  }

  function neighbours(id) {
    var c = parcelCol(id), r = parcelRow(id), out = [];
    if (inGrid(c, r - 1)) out.push({ dir: 'N', id: pid(c, r - 1) });
    if (inGrid(c + 1, r)) out.push({ dir: 'E', id: pid(c + 1, r) });
    if (inGrid(c, r + 1)) out.push({ dir: 'S', id: pid(c, r + 1) });
    if (inGrid(c - 1, r)) out.push({ dir: 'W', id: pid(c - 1, r) });
    return out;
  }

  // Ground at or below (today's surge reach + the planning allowance). This
  // is the only place in the tool where the SET OF BUILDABLE PARCELS depends
  // on an assumption, which is what makes the coastal town's lesson physical
  // rather than numerical: change the allowance and the safe map changes.
  function futureSurgeElevationM(planOrId, assumptions) {
    var sc = scenarioOf(planOrId);
    if (!sc.modelsSeaRise) return -Infinity;
    return sc.surgeBaseElevationM + (assumptions ? assumptions.planningSeaRiseM : 0);
  }
  function inFutureSurge(id, planOrId, assumptions) {
    var sc = scenarioOf(planOrId);
    if (!sc.modelsSeaRise) return false;
    var t = terrainAt(id, planOrId);
    if (t.baseUse === 'water') return false;              // already the bay
    return t.elevationM <= futureSurgeElevationM(planOrId, assumptions) + 1e-9;
  }

  function isWater(id, planOrId) { return terrainAt(id, planOrId).baseUse === 'water'; }
  function edgeIsBridge(key, planOrId) {
    var e = edgeEnds(key);
    return isWater(e[0], planOrId) || isWater(e[1], planOrId);
  }

  // A plan is PURE DATA. No functions, ever. Anything derived is recomputed.
  function basePlan(scenarioId) {
    var sc = scenarioOf(scenarioId);
    var uses = {};
    var ids = allParcelIds();
    for (var i = 0; i < ids.length; i++) uses[ids[i]] = terrainAt(ids[i], sc.id).baseUse;
    var edges = {};
    var ex = buildExistingEdges(sc.id);
    for (var j = 0; j < ex.length; j++) edges[ex[j]] = 'existing';
    return {
      v: 1,
      scenarioId: sc.id,
      uses: uses,
      edges: edges,          // key -> 'existing' | 'local' | 'arterial' | 'path'
      greenInfra: {},        // parcel id -> true
      assumptionSetId: 'central',
      // bindingConstraint holds a requirement ID (older plans hold its English
      // label; normaliseBinding() migrates them). evidence lists the indicator
      // ids the student cites, so the memo can be checked for evidence
      // without anything reading the prose.
      // stakeholder / counter / rebuttal / counterEvidence are the hearing
      // (grades 9-12): the strongest objection, the answer, and the numbers
      // cited in it. Added in stage B; older plans load with them empty.
      memo: { bindingConstraint: '', tradeoff: '', text: '', evidence: [],
        stakeholder: '', counter: '', rebuttal: '', counterEvidence: [] },
      // Stage B overlays, both parcel id -> true. A cool roof is a building
      // owner's choice and costs the bond nothing; a bus stop is a public cost.
      coolRoofs: {},
      transit: {},
      // The access-gap discussion: which gap the student would close first.
      equity: { priority: '', note: '' },
      predictions: [],
      editCount: 0,
      // null means unlimited. A number starts a limited-move challenge.
      moveBudget: null,
      // Recorded so the class view can report how many students actually
      // ran the Assumption Lab, which is the mode the whole design rests on.
      ranAssumptionLab: false
    };
  }

  function clonePlan(plan) { return JSON.parse(JSON.stringify(plan)); }

  // Import is MERGE-ONLY: it starts from the named town's baseline and lays
  // the imported choices on top, keeping only keys it recognises. A plan file
  // can therefore never introduce terrain, a land use, or an edge kind that
  // this build does not know about, and a truncated or hand-edited file
  // degrades to a partial plan rather than a broken one.
  //
  // Returns { ok, plan, error, warnings } and never throws.
  function importPlan(raw) {
    var data;
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (e) { return { ok: false, error: __alloT('stem.citylab.import_not_json', 'That file is not valid JSON.') }; }
    if (!data || typeof data !== 'object') return { ok: false, error: __alloT('stem.citylab.import_not_plan', 'That file is not a plan.') };
    if (data.v !== 1) return { ok: false, error: __alloT('stem.citylab.import_wrong_version', 'That plan was saved by a different version of this tool.') };
    if (!own(SCENARIOS, data.scenarioId)) {
      return { ok: false, error: fmt(__alloT('stem.citylab.import_unknown_town', 'That plan is for a town this build does not have ({town}).'),
        { town: str(data.scenarioId).slice(0, 40) }) };
    }

    var out = basePlan(data.scenarioId);
    var warnings = [];
    var skippedUses = 0, skippedEdges = 0;

    if (data.uses && typeof data.uses === 'object') {
      Object.keys(data.uses).forEach(function (id) {
        if (!own(out.uses, id)) { skippedUses++; return; }
        if (isWater(id, out.scenarioId)) return;              // terrain is not importable
        if (PALETTE_IDS.indexOf(data.uses[id]) === -1) { skippedUses++; return; }
        out.uses[id] = data.uses[id];
      });
    }
    if (data.edges && typeof data.edges === 'object') {
      Object.keys(data.edges).forEach(function (key) {
        var kind = data.edges[key];
        if (['local', 'arterial', 'path'].indexOf(kind) === -1) {
          if (kind !== 'existing') skippedEdges++;
          return;                                             // existing edges come from the baseline
        }
        var e = edgeEnds(key);
        // Both ends real parcels AND side by side: a hand-edited "A1|L12"
        // would otherwise be a 1.5 km road billed as one 100 m segment.
        // Stored under the canonical key, so "B6|A6" cannot duplicate (and
        // re-bill) the existing road A6|B6.
        var adjacent = e.length === 2 && own(out.uses, e[0]) && own(out.uses, e[1]) &&
          neighbours(e[0]).some(function (n) { return n.id === e[1]; });
        if (!adjacent) { skippedEdges++; return; }
        var canon = edgeKey(e[0], e[1]);
        if (out.edges[canon] === 'existing') return;
        out.edges[canon] = kind;
      });
    }
    if (data.greenInfra && typeof data.greenInfra === 'object') {
      Object.keys(data.greenInfra).forEach(function (id) {
        if (own(out.uses, id) && data.greenInfra[id] && canGreenInfra(out.uses[id])) {
          out.greenInfra[id] = true;
        }
      });
    }
    if (data.coolRoofs && typeof data.coolRoofs === 'object') {
      Object.keys(data.coolRoofs).forEach(function (id) {
        if (own(out.uses, id) && data.coolRoofs[id] && canCoolRoof(out.uses[id])) out.coolRoofs[id] = true;
      });
    }
    if (data.transit && typeof data.transit === 'object') {
      Object.keys(data.transit).forEach(function (id) {
        if (own(out.uses, id) && data.transit[id] && !isWater(id, out.scenarioId)) out.transit[id] = true;
      });
    }
    if (data.equity && typeof data.equity === 'object') {
      out.equity = {
        priority: EQUITY_KINDS.indexOf(data.equity.priority) !== -1 ? data.equity.priority : '',
        note: str(data.equity.note).slice(0, 2000)
      };
    }
    if (own(SET_BY_ID, data.assumptionSetId)) out.assumptionSetId = data.assumptionSetId;
    if (data.memo && typeof data.memo === 'object') {
      var known = TIER1_IDS.concat(TIER2_IDS);
      var cleanIds = function (list) {
        return Array.isArray(list)
          ? list.filter(function (id, i, arr) {
              return typeof id === 'string' && known.indexOf(id) !== -1 && arr.indexOf(id) === i;
            }).slice(0, 12)
          : [];
      };
      var shIds = (scenarioOf(out.scenarioId).stakeholders || []).map(function (s) { return s.id; });
      out.memo = {
        bindingConstraint: str(data.memo.bindingConstraint).slice(0, 400),
        tradeoff: str(data.memo.tradeoff).slice(0, 4000),
        text: str(data.memo.text).slice(0, 4000),
        evidence: cleanIds(data.memo.evidence),
        stakeholder: shIds.indexOf(data.memo.stakeholder) !== -1 ? data.memo.stakeholder : '',
        counter: str(data.memo.counter).slice(0, 4000),
        rebuttal: str(data.memo.rebuttal).slice(0, 4000),
        counterEvidence: cleanIds(data.memo.counterEvidence)
      };
      out.memo.bindingConstraint = normaliseBinding(out.memo.bindingConstraint, out.scenarioId);
    }
    // A negative count would hand a move-budget challenge extra moves.
    out.editCount = typeof data.editCount === 'number' && isFinite(data.editCount) ? Math.max(0, Math.floor(data.editCount)) : 0;
    out.moveBudget = typeof data.moveBudget === 'number' && data.moveBudget > 0 && isFinite(data.moveBudget)
      ? Math.max(1, Math.min(999, Math.round(data.moveBudget))) : null;
    out.ranAssumptionLab = !!data.ranAssumptionLab;

    if (skippedUses) warnings.push(fmt(__alloT('stem.citylab.import_skipped_uses', 'Parcel entries not recognised and skipped: {n}.'), { n: skippedUses }));
    if (skippedEdges) warnings.push(fmt(__alloT('stem.citylab.import_skipped_edges', 'Connections not recognised and skipped: {n}.'), { n: skippedEdges }));
    return { ok: true, plan: out, warnings: warnings };
  }

  function isRoadKind(kind) { return kind === 'existing' || kind === 'local' || kind === 'arterial'; }

  // Adjacency for a chosen edge filter.
  function adjacency(plan, roadsOnly) {
    var adj = {};
    var keys = Object.keys(plan.edges);
    for (var i = 0; i < keys.length; i++) {
      var kind = plan.edges[keys[i]];
      if (roadsOnly && !isRoadKind(kind)) continue;
      var e = edgeEnds(keys[i]);
      (adj[e[0]] = adj[e[0]] || []).push(e[1]);
      (adj[e[1]] = adj[e[1]] || []).push(e[0]);
    }
    return adj;
  }

  // Which parcels a vehicle can reach from the old town centre. A parcel that
  // no road reaches is NOT served, and its dwellings do not count toward the
  // housing requirement. This is what makes the road budget bind.
  function servedParcels(plan) {
    var adj = adjacency(plan, true);
    var core = scenarioOf(plan).coreParcel;
    var seen = {}, queue = [core];
    seen[core] = true;
    while (queue.length) {
      var cur = queue.shift();
      var nbrs = adj[cur] || [];
      for (var i = 0; i < nbrs.length; i++) {
        if (!seen[nbrs[i]]) { seen[nbrs[i]] = true; queue.push(nbrs[i]); }
      }
    }
    return seen;
  }

  // Multi-source breadth-first search over roads AND paths, in hops. Straight
  // line distance would be the comfortable lie here: a parcel across an
  // unbridged river is not 200 metres away, it is unreachable.
  function hopsToNearest(plan, sourceIds) {
    var adj = adjacency(plan, false);
    var dist = {}, queue = [];
    for (var i = 0; i < sourceIds.length; i++) {
      if (dist[sourceIds[i]] === undefined) { dist[sourceIds[i]] = 0; queue.push(sourceIds[i]); }
    }
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      var nbrs = adj[cur] || [];
      for (var j = 0; j < nbrs.length; j++) {
        if (dist[nbrs[j]] === undefined) { dist[nbrs[j]] = dist[cur] + 1; queue.push(nbrs[j]); }
      }
    }
    return dist;
  }

  function unitsOnParcel(plan, id) {
    var use = USE_BY_ID[plan.uses[id]];
    return use ? use.units * HA_PER_PARCEL : 0;
  }

  function effectiveC(plan, id, assumptions) {
    var use = USE_BY_ID[plan.uses[id]];
    if (!use) return 0;
    var c = use.C;
    if (use.id !== 'water') c = Math.min(1, c * assumptions.runoffScale);
    if (plan.greenInfra[id] && !use.natural) {
      var floor = Math.min(1, USE_BY_ID.field.C * assumptions.runoffScale);
      c = Math.max(floor, c - assumptions.giCredit);
    }
    return c;
  }

  // SURFACE HEAT, a screening model of how much hotter a parcel's ground and
  // roofs get than shaded, vegetated ground on a clear summer afternoon, in
  // degrees C. Modelled tier: three parameters, each a published range.
  //
  //   shaded = hard - canopy x shade          (canopy shades its share of the hard surface)
  //   roof   = shaded - coolRoof              (only where the owner chose a cool roof)
  //   excess = imperv x (roofShare x roof + (1 - roofShare) x shaded)
  //
  // hard: sunlit roofs and pavement run 27 to 50 C above the air (EPA, Reducing
  // Urban Heat Islands: Compendium of Strategies, Urban Heat Island Basics).
  // shade: shaded surfaces run 11 to 25 C below the peak of unshaded ones (same
  // compendium, Trees and Vegetation). coolRoof: cool roofs stay up to 28 to
  // 33 C cooler at peak (same compendium, Cool Roofs); 20 is this tool's low
  // end because "up to" is a best case. It is SURFACE temperature, not air:
  // EPA puts the daytime AIR difference between a city and its outskirts at
  // only about 1 to 4 C (1 to 7 F). Open ground counts as the reference, which
  // understates bare desert soil, and the panel says so.
  function surfaceHeatOf(plan, id, assumptions) {
    var use = USE_BY_ID[plan.uses[id]];
    if (!use || use.id === 'water') return null;
    var imperv = use.imperv || 0;
    if (imperv <= 0) return 0;
    var canopy = Math.min(1, (use.canopy || 0) + ((plan.greenInfra || {})[id] ? GI_CANOPY_GAIN : 0));
    var shaded = Math.max(0, assumptions.heatHardC - canopy * assumptions.heatShadeC);
    var roof = (plan.coolRoofs || {})[id] ? Math.max(0, shaded - assumptions.heatCoolRoofC) : shaded;
    return imperv * (HEAT_ROOF_SHARE * roof + (1 - HEAT_ROOF_SHARE) * shaded);
  }

  // A cool roof needs a roof: a built use with at least one storey.
  function canCoolRoof(useId) {
    var use = USE_BY_ID[useId];
    return !!(use && !use.natural && use.storeys > 0);
  }

  function weightedC(plan, assumptions) {
    var ids = allParcelIds(), total = 0;
    for (var i = 0; i < ids.length; i++) total += effectiveC(plan, ids[i], assumptions);
    return total / ids.length;
  }

  // Rational method, Q = C * i * A. A screening estimate for a small
  // watershed, not a drainage design, and the UI says so.
  function peakRunoff(plan, assumptions) {
    var C = weightedC(plan, assumptions);
    var iMetresPerSecond = (scenarioOf(plan).designStormMmPerHour / 1000) / 3600;
    var areaM2 = allParcelIds().length * HA_PER_PARCEL * 10000;
    return { C: C, Q: C * iMetresPerSecond * areaM2 };
  }

  function capitalCost(plan, assumptions) {
    var base = basePlan(plan.scenarioId);
    var lines = [];
    var scale = assumptions.costScale;
    var roadM = 0, bridgeCount = 0;

    var newLocal = 0, newArterial = 0, newPath = 0, bridgeRoad = 0, bridgePath = 0;
    var keys = Object.keys(plan.edges);
    for (var i = 0; i < keys.length; i++) {
      if (base.edges[keys[i]]) continue;               // already built, already paid for
      var kind = plan.edges[keys[i]];
      var bridge = edgeIsBridge(keys[i], plan);
      if (bridge) bridgeCount++;
      if (kind === 'path') { if (bridge) bridgePath++; else newPath++; }
      else if (kind === 'arterial') { if (bridge) bridgeRoad++; else newArterial++; }
      else { if (bridge) bridgeRoad++; else newLocal++; }
      if (isRoadKind(kind)) roadM += METRES_PER_EDGE;
    }

    var parkHa = 0, giHa = 0, civicCount = 0;
    var ids = allParcelIds();
    for (var j = 0; j < ids.length; j++) {
      var id = ids[j];
      if (plan.uses[id] === 'park' && base.uses[id] !== 'park') parkHa += HA_PER_PARCEL;
      if (plan.uses[id] === 'civic' && base.uses[id] !== 'civic') civicCount++;
      if (plan.greenInfra[id]) giHa += HA_PER_PARCEL;
    }

    function line(id, label, qty, unitCost, note) {
      if (!qty) return;
      lines.push({ id: id, label: label, qty: qty, unitCost: Math.round(unitCost * scale),
        total: Math.round(qty * unitCost * scale), note: note || '' });
    }
    line('road_local', __alloT('stem.citylab.cost_road_local', 'Local road segments (100 m)'), newLocal, COSTS.road_local);
    line('road_arterial', __alloT('stem.citylab.cost_road_arterial', 'Arterial road segments (100 m)'), newArterial, COSTS.road_arterial);
    line('bridge_road', __alloT('stem.citylab.cost_bridge_road', 'Road segments crossing the river'), bridgeRoad, COSTS.bridge_road,
      __alloT('stem.citylab.cost_bridge_road_note', 'bridge structure'));
    line('path', __alloT('stem.citylab.cost_path', 'Walking and cycling paths (100 m)'), newPath, COSTS.path);
    line('bridge_path', __alloT('stem.citylab.cost_bridge_path', 'Foot crossings of the river'), bridgePath, COSTS.bridge_path,
      __alloT('stem.citylab.cost_bridge_path_note', 'footbridge'));
    line('park', __alloT('stem.citylab.cost_park', 'New park land (ha)'), parkHa, COSTS.park_per_ha);
    line('gi', __alloT('stem.citylab.cost_gi', 'Green infrastructure (ha)'), giHa, COSTS.green_infra_per_ha,
      __alloT('stem.citylab.cost_gi_note', 'rain gardens, permeable paving, canopy'));
    line('civic', __alloT('stem.citylab.cost_civic', 'New civic buildings'), civicCount, COSTS.civic_each,
      __alloT('stem.citylab.cost_civic_note', 'priced at clinic or branch-library scale; a whole new school usually costs several times this'));
    var stopCount = Object.keys(plan.transit || {}).filter(function (sid) { return plan.transit[sid]; }).length;
    line('transit', __alloT('stem.citylab.cost_transit', 'Bus stops'), stopCount, COSTS.transit_stop,
      __alloT('stem.citylab.cost_transit_note', 'pad, shelter and sign; running the buses is an operating cost, not on the bond'));

    var total = 0;
    for (var k = 0; k < lines.length; k++) total += lines[k].total;
    return { total: total, lines: lines, newRoadMetres: roadM, bridgeCount: bridgeCount };
  }

  // Memo for scorecard(). A render asks for the same plan's scorecard many
  // times (constraints, missions, access gaps, the described map), and the
  // stage C timing put a parcel click at ~55 ms in jsdom. Keyed on the plan
  // OBJECT, and checked against a signature of every field the scorecard
  // reads, so a plan mutated after it was scored is simply scored again.
  // The language is in the signature too: cost-line labels are translated
  // when computed. Nothing mutates a returned scorecard.
  var SC_CACHE = typeof WeakMap === 'function' ? new WeakMap() : null;
  function scoreSig(plan, setId) {
    var ids = allParcelIds(), uses = [], k, parts;
    for (var i = 0; i < ids.length; i++) uses.push(plan.uses ? plan.uses[ids[i]] : '');
    function flags(m) { return Object.keys(m || {}).filter(function (x) { return m[x]; }).sort().join(','); }
    var edges = plan.edges || {};
    var ek = Object.keys(edges).sort();
    parts = [];
    for (k = 0; k < ek.length; k++) parts.push(ek[k] + '=' + edges[ek[k]]);
    return [plan.scenarioId, setId, uses.join(';'), parts.join(','), flags(plan.greenInfra), flags(plan.coolRoofs),
      flags(plan.transit), __alloT('stem.citylab.cost_park', 'New park land (ha)')].join('|');
  }
  function scorecard(plan, assumptionSetId) {
    if (!SC_CACHE || !plan || typeof plan !== 'object') return scorecardUncached(plan, assumptionSetId);
    var setKey = assumptionSetId || plan.assumptionSetId || 'central';
    var sig = scoreSig(plan, setKey);
    var rec = SC_CACHE.get(plan);
    if (rec && rec[setKey] && rec[setKey].sig === sig) return rec[setKey].value;
    var value = scorecardUncached(plan, assumptionSetId);
    if (!rec) { rec = {}; SC_CACHE.set(plan, rec); }
    rec[setKey] = { sig: sig, value: value };
    return value;
  }

  // The whole scorecard, as a pure function of (plan, assumption set).
  function scorecardUncached(plan, assumptionSetId) {
    var assumptions = SET_BY_ID[assumptionSetId || plan.assumptionSetId] || SET_BY_ID.central;
    var sc = scenarioOf(plan);
    var base = basePlan(sc.id);
    var ids = allParcelIds();
    var served = servedParcels(plan);

    var totalUnitsServed = 0, baseUnitsServed = 0, unitsUnserved = 0;
    var newUnitsInFloodplain = 0, existingUnitsInFloodplain = 0;
    var builtAreaHa = 0, parkHa = 0, farmHa = 0, farmlandConvertedHa = 0, preserveConvertedHa = 0;
    var newUnitsInFutureSurge = 0, existingUnitsInFutureSurge = 0, landAtRiskHa = 0;
    var housingParcels = [], parkParcels = [], civicParcels = [], stopParcels = [];
    var heat = {}, heatSum = 0, heatLand = 0, homeHeatSum = 0;
    var stops = plan.transit || {};

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], t = terrainAt(id, sc.id);
      var use = USE_BY_ID[plan.uses[id]];
      var baseUse = USE_BY_ID[base.uses[id]];
      var u = unitsOnParcel(plan, id);
      var baseU = baseUse ? baseUse.units * HA_PER_PARCEL : 0;
      var hx = surfaceHeatOf(plan, id, assumptions);
      if (hx !== null) { heat[id] = hx; heatSum += hx; heatLand++; }
      // A stop counts only where a bus can get to it: on a road from the centre.
      if (stops[id] && served[id]) stopParcels.push(id);

      if (u > 0) {
        if (served[id]) { totalUnitsServed += u; housingParcels.push(id); if (hx !== null) homeHeatSum += hx * u; }
        else unitsUnserved += u;
      }
      if (baseU > 0 && served[id]) baseUnitsServed += baseU;

      if (t.floodplain) {
        var added = Math.max(0, u - baseU);
        if (served[id]) newUnitsInFloodplain += added;
        existingUnitsInFloodplain += Math.min(u, baseU);
      }
      if (sc.modelsSeaRise && inFutureSurge(id, sc.id, assumptions)) {
        var addedFut = Math.max(0, u - baseU);
        if (served[id]) newUnitsInFutureSurge += addedFut;
        existingUnitsInFutureSurge += Math.min(u, baseU);
        if (!t.floodplain) landAtRiskHa += HA_PER_PARCEL;   // dry today, not later
      }
      if (use && !use.natural) builtAreaHa += HA_PER_PARCEL;
      if (use && use.id === 'park') { parkHa += HA_PER_PARCEL; parkParcels.push(id); }
      if (use && use.id === 'civic') civicParcels.push(id);
      if (use && use.id === 'farm') farmHa += HA_PER_PARCEL;
      if (baseUse && baseUse.id === 'farm' && use && use.id !== 'farm') farmlandConvertedHa += HA_PER_PARCEL;
      if (baseUse && baseUse.id === 'preserve' && use && use.id !== 'preserve') preserveConvertedHa += HA_PER_PARCEL;
    }

    // Walk access. Only dwellings a road reaches are counted, because an
    // unreachable dwelling is not a home anyone lives in. Both figures are
    // pure geometry over the network, so neither can move when the
    // assumption set changes.
    function accessShare(destinations, minutes) {
      var limit = Math.floor(minutes / MIN_PER_HOP);
      var dist = hopsToNearest(plan, destinations);
      var withAccess = 0, considered = 0;
      for (var p = 0; p < housingParcels.length; p++) {
        var hid = housingParcels[p];
        var hu = unitsOnParcel(plan, hid);
        considered += hu;
        var dd = dist[hid];
        if (dd !== undefined && dd <= limit) withAccess += hu;
      }
      return { share: considered > 0 ? withAccess / considered : 0, limit: limit, dist: dist };
    }
    // The same question asked the dishonest way, on purpose. "As the crow
    // flies" ignores whether a street exists and whether a river is in the
    // way, which is the classic route by which a planning dashboard reports
    // access a resident does not have. Both numbers are shown, and the gap
    // between them is the teaching.
    function straightLineShare(destinations, minutes) {
      var limit = minutes / MIN_PER_HOP;      // in parcels, and 1 parcel = 100 m
      var withAccess = 0, considered = 0;
      for (var p = 0; p < housingParcels.length; p++) {
        var hid = housingParcels[p], hu = unitsOnParcel(plan, hid);
        considered += hu;
        var hc = parcelCol(hid), hr = parcelRow(hid), best = Infinity;
        for (var q = 0; q < destinations.length; q++) {
          var dc = parcelCol(destinations[q]) - hc, dr = parcelRow(destinations[q]) - hr;
          var d = Math.sqrt(dc * dc + dr * dr);
          if (d < best) best = d;
        }
        if (best <= limit) withAccess += hu;
      }
      return considered > 0 ? withAccess / considered : 0;
    }

    var parkAccess = accessShare(parkParcels, sc.parkWalkMinutes);
    var civicAccess = accessShare(civicParcels, sc.civicWalkMinutes);
    var parkAccessCrow = straightLineShare(parkParcels, sc.parkWalkMinutes);
    var transitAccess = accessShare(stopParcels, TRANSIT_WALK_MINUTES);
    var hopLimit = parkAccess.limit;
    var parkAccessPct = parkAccess.share;

    var runoff = peakRunoff(plan, assumptions);
    var baseRunoff = peakRunoff(base, assumptions);
    var cost = capitalCost(plan, assumptions);
    var population = Math.round(totalUnitsServed * assumptions.householdSize);

    // Water balance, for towns that have a water problem. Straight addition of
    // three demands against a fixed physical yield. The yield is a property of
    // the basin; the three demand rates are published ranges, which is why the
    // whole thing is modelled rather than measured.
    var waterDemand = 0, waterHeadroom = 0;
    if (sc.modelsWater) {
      waterDemand = (population * assumptions.litresPerPersonPerDay) / 1000
        + farmHa * assumptions.farmIrrigationM3PerHaPerDay
        + parkHa * assumptions.parkIrrigationM3PerHaPerDay;
      waterHeadroom = sc.aquiferYieldM3PerDay - waterDemand;
    }

    return {
      assumptionSetId: assumptions.id,
      tier1: {
        newUnitsServed: totalUnitsServed - baseUnitsServed,
        totalUnitsServed: totalUnitsServed,
        unitsUnserved: unitsUnserved,
        builtAreaHa: builtAreaHa,
        farmlandConvertedHa: farmlandConvertedHa,
        preserveConvertedHa: preserveConvertedHa,
        newUnitsInFloodplain: newUnitsInFloodplain,
        existingUnitsInFloodplain: existingUnitsInFloodplain,
        parkHa: parkHa,
        farmHa: farmHa,
        parkAccessPct: parkAccessPct,
        parkAccessPctAsCrowFlies: parkAccessCrow,
        civicAccessPct: civicAccess.share,
        newRoadMetres: cost.newRoadMetres,
        transitAccessPct: transitAccess.share
      },
      tier2: {
        runoffCoefficient: runoff.C,
        peakRunoffQ: runoff.Q,
        baselineRunoffQ: baseRunoff.Q,
        runoffRatio: baseRunoff.Q > 0 ? runoff.Q / baseRunoff.Q : 0,
        capitalCost: cost.total,
        population: population,
        parkHaPer1000: population > 0 ? parkHa / (population / 1000) : 0,
        waterDemandM3PerDay: waterDemand,
        waterHeadroomM3PerDay: waterHeadroom,
        newUnitsInFutureSurge: newUnitsInFutureSurge,
        existingUnitsInFutureSurge: existingUnitsInFutureSurge,
        landAtRiskHa: landAtRiskHa,
        surfaceHeatC: heatLand ? heatSum / heatLand : 0,
        homeSurfaceHeatC: totalUnitsServed ? homeHeatSum / totalUnitsServed : 0
      },
      surfaceHeat: heat,
      transitDistance: transitAccess.dist,
      transitHopLimit: transitAccess.limit,
      transitStops: stopParcels,
      costLines: cost.lines,
      futureSurgeElevationM: futureSurgeElevationM(plan, assumptions),
      parkHopLimit: hopLimit,
      civicHopLimit: civicAccess.limit,
      parkDistance: parkAccess.dist,
      civicDistance: civicAccess.dist
    };
  }

  // Requirement checks live in a module-scope registry keyed by string id, so
  // a scenario stores only the id. That is the same discipline the plan itself
  // follows: no functions anywhere that has to survive serialization, and a
  // new town needs no new logic, only a new list of ids.
  //
  // Each check returns { met, actual, target, detail }. `unit` tells the UI
  // how to render the two numbers without it having to know what they mean.
  var CHECKS = {
    req_units: function (s, sc) {
      return {
        met: s.tier1.newUnitsServed >= sc.targetNewUnits,
        actual: s.tier1.newUnitsServed, target: sc.targetNewUnits, unit: 'count', floor: true,
        detail: s.tier1.unitsUnserved > 0
          ? fmt(__alloT('stem.citylab.detail_units_unserved', 'Homes zoned on parcels that no road runs into: {n}. ' +
              'They are not counted. A road on the next parcel does not count, because a road only serves the parcels it enters.'),
              { n: s.tier1.unitsUnserved })
          : ''
      };
    },
    req_flood: function (s, sc) {
      return {
        met: s.tier1.newUnitsInFloodplain === 0,
        actual: s.tier1.newUnitsInFloodplain, target: 0, unit: 'count',
        detail: s.tier1.existingUnitsInFloodplain > 0
          ? fmt(__alloT('stem.citylab.detail_flood_existing', 'Existing homes already in {zone}: {n}. ' +
              'They are grandfathered and are not counted against you, but they are still exposed.'),
              { n: s.tier1.existingUnitsInFloodplain, zone: sc.floodLabel })
          : ''
      };
    },
    req_runoff: function (s, sc) {
      return {
        met: s.tier2.runoffRatio <= sc.runoffCeilingRatio + 1e-9,
        actual: s.tier2.runoffRatio, target: sc.runoffCeilingRatio, unit: 'ratio',
        detail: __alloT('stem.citylab.detail_runoff', 'Modelled, not measured. Open the runoff model to see the formula and the coefficients.')
      };
    },
    req_cost: function (s, sc) {
      return {
        met: s.tier2.capitalCost <= sc.bondDollars,
        actual: s.tier2.capitalCost, target: sc.bondDollars, unit: 'money',
        detail: __alloT('stem.citylab.detail_cost', 'The bond covers public infrastructure only. Private buildings are not the town budget.')
      };
    },
    req_park: function (s, sc) {
      return {
        met: s.tier1.parkAccessPct >= sc.parkAccessTarget - 1e-9,
        actual: s.tier1.parkAccessPct, target: sc.parkAccessTarget, unit: 'percent', floor: true,
        detail: __alloT('stem.citylab.detail_park', 'Network distance along streets and paths, not straight-line distance.')
      };
    },
    req_farm_max: function (s, sc) {
      return {
        met: s.tier1.farmlandConvertedHa <= sc.farmlandCeilingHa,
        actual: s.tier1.farmlandConvertedHa, target: sc.farmlandCeilingHa, unit: 'hectares',
        detail: ''
      };
    },
    // The mirror image of req_farm_max, and the reason both exist. In a river
    // town the worry is losing farmland to houses. In a desert town the farms
    // are drinking the water the houses need, so the pressure runs the other
    // way and the board has to ask for a floor instead of a ceiling.
    req_farm_min: function (s, sc) {
      return {
        met: s.tier1.farmHa >= sc.farmlandFloorHa,
        actual: s.tier1.farmHa, target: sc.farmlandFloorHa, unit: 'hectares', floor: true,
        detail: __alloT('stem.citylab.detail_farm_min', 'Every hectare kept in production draws irrigation water that the homes cannot then use.')
      };
    },
    // Protected land was described as protected and was in fact free to
    // rezone. Reporting it was not enough: an indicator nobody is judged
    // against reads as a statistic rather than a cost. It is a target in
    // every town, deliberately soft, so the trade-off stays available and
    // has to be argued for in the memo rather than taken silently.
    req_preserve: function (s) {
      return {
        met: s.tier1.preserveConvertedHa === 0,
        actual: s.tier1.preserveConvertedHa, target: 0, unit: 'hectares',
        detail: __alloT('stem.citylab.detail_preserve', 'Protected land is not off limits, but taking it is a choice the board will ask about.')
      };
    },
    req_future_flood: function (s, sc) {
      return {
        met: s.tier2.newUnitsInFutureSurge === 0,
        actual: s.tier2.newUnitsInFutureSurge, target: 0, unit: 'count',
        detail: __alloT('stem.citylab.detail_future_flood', 'MODELLED, and the only requirement here whose MAP moves. The safe area is ' +
          'ground above the surge reach plus the allowance the board asked you to plan for, ' +
          'and that allowance differs between the assumption sets. A plan that only works ' +
          'under one of them is a plan that only works if that guess was right.') +
          (s.tier2.existingUnitsInFutureSurge > 0
            ? ' ' + fmt(__alloT('stem.citylab.detail_future_existing', 'Homes already standing inside it: {n}. They ' +
                'are not counted against you, and they are also not going anywhere.'),
                { n: s.tier2.existingUnitsInFutureSurge })
            : '')
      };
    },
    req_water: function (s, sc) {
      return {
        met: s.tier2.waterDemandM3PerDay <= sc.aquiferYieldM3PerDay + 1e-9,
        actual: s.tier2.waterDemandM3PerDay, target: sc.aquiferYieldM3PerDay, unit: 'water',
        detail: __alloT('stem.citylab.detail_water', 'Safe yield is a property of the basin, not a policy anyone can vote to raise. ' +
          'The three demand rates are published ranges, so open the water model to see them.')
      };
    }
  };

  // Constraint checking reports margins. It never grades and never scores.
  function constraintReport(plan, assumptionSetId) {
    var s = scorecard(plan, assumptionSetId);
    var sc = scenarioOf(plan);
    var out = [];

    sc.requirements.forEach(function (req) {
      var check = CHECKS[req.id];
      if (!check) return;
      var r = check(s, sc);
      out.push({ id: req.id, hard: !!req.hard, label: req.label,
        met: r.met, actual: r.actual, target: r.target,
        unit: r.unit, floor: !!r.floor, detail: r.detail });
    });

    var hardMet = 0, hardTotal = 0, softMet = 0, softTotal = 0;
    for (var j = 0; j < out.length; j++) {
      if (out[j].hard) { hardTotal++; if (out[j].met) hardMet++; }
      else { softTotal++; if (out[j].met) softMet++; }
    }
    return { rows: out, hardMet: hardMet, hardTotal: hardTotal, softMet: softMet, softTotal: softTotal,
      allHardMet: hardMet === hardTotal, scorecard: s };
  }

  // The Assumption Lab. One plan, two documented parameter sets, and the one
  // question worth asking: which conclusions survive both?
  function compareAssumptions(plan, setAId, setBId) {
    var a = constraintReport(plan, setAId);
    var b = constraintReport(plan, setBId);
    var rows = [];
    var t1 = TIER1_IDS, t2 = TIER2_IDS, i;
    for (i = 0; i < t1.length; i++) {
      rows.push({ id: t1[i], tier: 1, a: a.scorecard.tier1[t1[i]], b: b.scorecard.tier1[t1[i]] });
    }
    for (i = 0; i < t2.length; i++) {
      rows.push({ id: t2[i], tier: 2, a: a.scorecard.tier2[t2[i]], b: b.scorecard.tier2[t2[i]] });
    }
    for (i = 0; i < rows.length; i++) {
      rows[i].changed = Math.abs((rows[i].a || 0) - (rows[i].b || 0)) > 1e-9;
    }
    var flipped = [];
    for (i = 0; i < a.rows.length; i++) {
      if (a.rows[i].met !== b.rows[i].met) {
        flipped.push({ id: a.rows[i].id, label: a.rows[i].label, metUnderA: a.rows[i].met });
      }
    }
    return { setA: setAId, setB: setBId, reportA: a, reportB: b, rows: rows, flipped: flipped,
      robust: flipped.length === 0 };
  }

  // -------------------------------------------------------------------
  // Move budget. An optional challenge: a fixed number of parcel edits, so
  // the board cannot be brute-forced by shuffling land uses until the
  // dashboard turns green. Undo restores the whole plan including its edit
  // count, so a spent move comes back with it and the budget stays honest
  // in both directions.
  // -------------------------------------------------------------------
  function movesLeft(plan) {
    if (!plan || typeof plan.moveBudget !== 'number') return Infinity;
    return Math.max(0, plan.moveBudget - (plan.editCount || 0));
  }
  function outOfMoves(plan) { return movesLeft(plan) <= 0; }

  // -------------------------------------------------------------------
  // Plan edits. Each returns a NEW plan; none mutates its input.
  // -------------------------------------------------------------------
  // Green infrastructure may only go where it can actually do something. The
  // credit is floored at the open-field coefficient, so on a park (C = 0.20,
  // already at the floor) it would change no number at all while still
  // charging the bond $250k per hectare. A control that silently bills for
  // nothing is worse than a missing one.
  function canGreenInfra(useId) {
    var use = USE_BY_ID[useId];
    if (!use || use.natural) return false;
    return use.C > USE_BY_ID.field.C;
  }

  function setUse(plan, id, useId) {
    if (isWater(id, plan)) return plan;                 // terrain, not zoning
    if (!USE_BY_ID[useId]) return plan;
    if (plan.uses[id] === useId) return plan;           // a no-op must not cost a move
    if (outOfMoves(plan)) return plan;
    var next = clonePlan(plan);
    next.uses[id] = useId;
    if (!canGreenInfra(useId)) delete next.greenInfra[id];
    if (next.coolRoofs && !canCoolRoof(useId)) delete next.coolRoofs[id];
    next.editCount = (next.editCount || 0) + 1;
    return next;
  }

  function toggleCoolRoof(plan, id) {
    if (!canCoolRoof(plan.uses[id])) return plan;
    if (outOfMoves(plan)) return plan;
    var next = clonePlan(plan);
    next.coolRoofs = next.coolRoofs || {};
    if (next.coolRoofs[id]) delete next.coolRoofs[id];
    else next.coolRoofs[id] = true;
    next.editCount = (next.editCount || 0) + 1;
    return next;
  }

  // Does any road (not a footpath) run into this parcel? A bus needs one.
  function roadInto(plan, id) {
    var adj = adjacency(plan, true);
    return !!(adj[id] && adj[id].length);
  }

  // A stop can be ADDED only where a road runs in. Removing one is always
  // allowed, so a stop stranded by a removed road can still be taken away.
  function toggleTransit(plan, id) {
    if (isWater(id, plan)) return plan;
    var has = !!(plan.transit && plan.transit[id]);
    if (!has && !roadInto(plan, id)) return plan;
    if (outOfMoves(plan)) return plan;
    var next = clonePlan(plan);
    next.transit = next.transit || {};
    if (has) delete next.transit[id];
    else next.transit[id] = true;
    next.editCount = (next.editCount || 0) + 1;
    return next;
  }

  function toggleGreenInfra(plan, id) {
    if (!canGreenInfra(plan.uses[id])) return plan;     // nothing to mitigate
    if (outOfMoves(plan)) return plan;
    var next = clonePlan(plan);
    if (next.greenInfra[id]) delete next.greenInfra[id];
    else next.greenInfra[id] = true;
    next.editCount = (next.editCount || 0) + 1;
    return next;
  }

  function setEdge(plan, a, b, kind) {
    var key = edgeKey(a, b);
    var base = basePlan(plan.scenarioId);
    if (base.edges[key]) return plan;                   // existing roads stay
    if (plan.edges[key] === kind) return plan;
    if (outOfMoves(plan)) return plan;
    var next = clonePlan(plan);
    if (!kind) delete next.edges[key];
    else next.edges[key] = kind;
    next.editCount = (next.editCount || 0) + 1;
    return next;
  }

  function startChallenge(scenarioId, budget) {
    var p = basePlan(scenarioId);
    p.moveBudget = Math.max(1, Math.round(budget));
    return p;
  }

  // Hypsometric tint: the map convention for showing height, low ground dark
  // and cool, high ground pale and warm. It exists because Harborlight's whole
  // question is "which ground is high enough", and a land-use map answers that
  // nowhere. The two are separate VIEWS rather than one overloaded fill, since
  // stacking height onto land-use colour would wreck both.
  var TERRAIN_RAMP = ['#0b3d4d', '#14606b', '#2c7f6f', '#5f9f66', '#93ad5c',
    '#c4b95e', '#dcc57a', '#e8d3a0', '#efe1c4', '#f6eede'];

  // Heat view: one fill per HEAT_BANDS band, pale to dark red. Access view:
  // homes by how many of the three are missing, pale to dark blue; parcels
  // with no homes stay neutral. The view also prints the number on the
  // parcel, so neither ramp is the only carrier of its value.
  var HEAT_RAMP = ['#f1f5f9', '#fde68a', '#f59e0b', '#dc2626', '#7f1d1d'];
  var ACCESS_RAMP = ['#dbeafe', '#93c5fd', '#2563eb', '#1e3a8a'];
  var ACCESS_NONE = '#f1f5f9';

  // The parcel code is drawn on eleven different land-use fills and a ten-step
  // terrain ramp, and white-on-everything was the wrong answer on the pale
  // ones: white on the low-density housing yellow measured about 2.2 to 1.
  // Pick whichever ink actually has more contrast against the fill, measured.
  //
  // The fills themselves were nudged by a few percent so that the better ink
  // clears 4.5 to 1 on every one of them. Matching the RATIO is the thing;
  // eyeballing which looks lighter is how the yellow got missed.
  function relativeLuminance(hex) {
    var c = String(hex).replace('#', '');
    var ch = [0, 2, 4].map(function (i) {
      var x = parseInt(c.substr(i, 2), 16) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrastRatio(a, b) {
    var l1 = relativeLuminance(a), l2 = relativeLuminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  var INK_LIGHT = '#ffffff', INK_DARK = '#1e293b';
  // The dark half of a dashed walking path, and the reason a path stays
  // visible on ground of any lightness.
  var PATH_INK = '#bef264', PATH_GAP = '#132033';
  function readableInk(background) {
    return contrastRatio(INK_LIGHT, background) >= contrastRatio(INK_DARK, background)
      ? INK_LIGHT : INK_DARK;
  }

  function terrainColour(elevationM, minM, maxM) {
    if (maxM <= minM) return TERRAIN_RAMP[0];
    var t = (elevationM - minM) / (maxM - minM);
    var i = Math.max(0, Math.min(TERRAIN_RAMP.length - 1,
      Math.round(t * (TERRAIN_RAMP.length - 1))));
    return TERRAIN_RAMP[i];
  }

  // ===================================================================
  // THE 3D MODEL, AS DATA
  //
  // buildMassing() turns a plan into a plain list of boxes and planes. It
  // touches no WebGL and no Three.js, which is the point: the geometry can be
  // tested, and the renderer becomes a thin thing that reads this list.
  //
  // Two decisions worth keeping:
  //
  //  1. ONE vertical exaggeration for everything, stated on screen. Terrain
  //     relief in Harborlight is 2.7 m and a five-storey building is 15 m, so
  //     no single factor flatters both. Exaggerating them differently would be
  //     a lie about which is taller.
  //
  //  2. The surge plane's signal is COVERAGE, not height. A 0.6 m change in
  //     allowance is invisible next to a 15 m building however it is scaled,
  //     but the AREA it covers changes a great deal, and that is the actual
  //     lesson: not that the water is higher, but that more ground is under
  //     it. Submerged parcels are marked, and the plane spreads.
  //
  // World units: one parcel is 1 unit across, so 1 unit is 100 m on the
  // ground. Vertical metres are multiplied by VERT_EXAG and divided by 100 to
  // land in the same space.
  // ===================================================================

  function metresToWorld(m) { return (m * VERT_EXAG) / 100; }
  // The slab the lowest parcel stands on, in world units (W2).
  var GROUND_PLINTH = 0.08;

  function buildMassing(plan, assumptionSetId, selectedId) {
    var sc = scenarioOf(plan);
    var assumptions = SET_BY_ID[assumptionSetId || plan.assumptionSetId] || SET_BY_ID.central;
    var ids = allParcelIds();
    var served = servedParcels(plan);
    var half = N_COLS / 2;

    var ground = [], buildings = [], marks = [], features = [];
    var overlays = { coolRoofs: 0, busStops: 0, greenInfra: 0 };
    var minElev = Infinity, maxElev = -Infinity;
    ids.forEach(function (id) {
      var e = terrainAt(id, plan).elevationM;
      if (e < minElev) minElev = e;
      if (e > maxElev) maxElev = e;
    });
    // W2: the ground is drawn from the town's LOWEST point, on a thin plinth,
    // not from sea level. Every difference in height is still the same one
    // factor, so the relief is true; only the solid columns under it are gone.
    var datum = metresToWorld(minElev) - GROUND_PLINTH;
    function lift(m) { return metresToWorld(m) - datum; }

    ids.forEach(function (id) {
      var t = terrainAt(id, plan);
      var use = USE_BY_ID[plan.uses[id]];
      var x = parcelCol(id) - half + 0.5;
      var z = parcelRow(id) - 1 - half + 0.5;
      var topY = lift(t.elevationM);

      ground.push({
        id: id, x: x, z: z, use: use.id,
        top: topY,
        height: Math.max(0.02, topY),
        colour: use.fill,
        floodplain: t.floodplain,
        water: use.id === 'water',
        // Which ground is under each line. A translucent sheet cannot answer
        // this from above: seen through, it tints everything behind it
        // whatever the depth. The parcels have to say so themselves.
        underToday: !!(sc.modelsSeaRise && use.id !== 'water' &&
          t.elevationM <= sc.surgeBaseElevationM + 1e-9),
        underFuture: !!(sc.modelsSeaRise && use.id !== 'water' &&
          inFutureSurge(id, plan, assumptions))
      });

      var storeys = use.storeys || 0;
      if (storeys > 0) {
        buildings.push({
          id: id, x: x, z: z, use: use.id,
          base: topY,
          height: metresToWorld(storeys * METRES_PER_STOREY),
          colour: use.fill,
          storeys: storeys,
          unserved: unitsOnParcel(plan, id) > 0 && !served[id],
          // Stage C: the overlays are drawn, not only listed. A cool roof is
          // a pale cap on the block; it changes no height.
          coolRoof: !!(plan.coolRoofs && plan.coolRoofs[id] && canCoolRoof(use.id))
        });
        if (plan.coolRoofs && plan.coolRoofs[id] && canCoolRoof(use.id)) overlays.coolRoofs++;
      }
      if (plan.transit && plan.transit[id]) {
        // A bus stop is a post and sign at the parcel's north-west corner.
        // `served` is false where no road reaches it, matching the scorecard,
        // which does not count such a stop.
        // Kept apart from `marks`, which is the selection marker only.
        // W2: on the pavement of the parcel's street cross, clear of the
        // buildings, which now stand in the four corners.
        features.push({ id: id, x: x - 0.22, z: z - 0.1, base: topY, kind: 'stop', served: !!served[id] });
        overlays.busStops++;
      }
      if (plan.greenInfra && plan.greenInfra[id]) {
        features.push({ id: id, x: x + 0.22, z: z + 0.1, base: topY, kind: 'gi' });
        overlays.greenInfra++;
      }
      if (id === selectedId) marks.push({ id: id, x: x, z: z, base: topY, kind: 'selected' });
    });

    // Roads and paths as ribbons between parcel centres, sitting on the higher
    // of the two ends so a road never sinks into a hillside.
    var links = Object.keys(plan.edges).map(function (key) {
      var e = edgeEnds(key), kind = plan.edges[key];
      var a = e[0], b = e[1];
      var ax = parcelCol(a) - half + 0.5, az = parcelRow(a) - 1 - half + 0.5;
      var bx = parcelCol(b) - half + 0.5, bz = parcelRow(b) - 1 - half + 0.5;
      var y = Math.max(lift(terrainAt(a, plan).elevationM), lift(terrainAt(b, plan).elevationM));
      return {
        key: key, a: a, b: b,
        x: (ax + bx) / 2, z: (az + bz) / 2, y: y,
        horizontal: az === bz,
        kind: kind,
        colour: kind === 'path' ? PATH_INK : (kind === 'existing' ? '#cbd5e1' : '#ffffff')
      };
    });

    // Water sheets. Only a town whose flood line is an ELEVATION can have
    // one; Riverbend and Mesa Hollow map their flood zone by parcel, so their
    // exposure is marked on the ground instead of floated above it.
    var sheets = [];
    if (sc.modelsSeaRise) {
      // Low opacity on purpose. The sheets say "there is water at this
      // height"; the CAPS on the parcels say which ground is under it, and
      // that is the part a student needs to read.
      sheets.push({ id: 'surge_today', y: lift(sc.surgeBaseElevationM),
        colour: '#0e7490', opacity: 0.16, label: __alloT('stem.citylab.sheet_today', 'storm surge today') });
      // The id predates the move of the planning horizon to 2100; ids are kept.
      sheets.push({ id: 'surge_2050',
        y: lift(futureSurgeElevationM(plan, assumptions)),
        colour: '#38bdf8', opacity: 0.14,
        label: __alloT('stem.citylab.sheet_future', 'surge reach planned for 2100') });
    }

    return {
      scenarioId: sc.id,
      ground: ground, buildings: buildings, links: links, sheets: sheets, marks: marks,
      features: features, overlays: overlays,
      extent: N_COLS / 2,
      minElevationM: minElev, maxElevationM: maxElev,
      datumY: datum, plinth: GROUND_PLINTH,
      verticalExaggeration: VERT_EXAG,
      metresPerStorey: METRES_PER_STOREY
    };
  }

  // What the viewer rebuilds on. Cheap to compute and changes exactly when the
  // geometry would, so an orbit or a resize never triggers a scene rebuild.
  // W1 (2026-11-04): the SELECTION is no longer in it. Every arrow key moved
  // the selection and so rebuilt 220-600 meshes; the selection and hover
  // outlines are now moved by the scene's tick instead. The third argument is
  // accepted for old callers and ignored.
  function massingSignature(plan, assumptionSetId) {
    var ids = allParcelIds();
    var uses = ids.map(function (id) { return plan.uses[id]; }).join('');
    // Key AND kind: a road and a path on the same link draw differently.
    var edges = Object.keys(plan.edges).sort().map(function (k) { return k + '=' + plan.edges[k]; }).join(',');
    // The overlays change the scene too. Without them here, adding a cool
    // roof or a bus stop would never rebuild the model.
    function flags(m) { return Object.keys(m || {}).filter(function (k) { return m[k]; }).sort().join(','); }
    return [plan.scenarioId, assumptionSetId || plan.assumptionSetId, uses, edges,
      flags(plan.coolRoofs), flags(plan.transit), flags(plan.greenInfra)].join('|');
  }

  // ---- W1: one edit API and the 3D board's choices, as pure data --------
  // The tools the 3D board offers, in palette order: look, the ten uses, then
  // the connection and overlay tools. Every one maps onto an op applyOp knows.
  var STAGE_TOOL_IDS = ['inspect'].concat(PALETTE_IDS, ['road', 'path', 'stop', 'cool', 'gi']);
  // W4: 'model' is the 3D board; every other id is a lens shown on the map.
  var BOARD_VIEW_IDS = ['use', 'elevation', 'model', 'heat', 'access', 'park', 'transit', 'rain', 'flood'];

  function areNeighbours(a, b) {
    return neighbours(a).some(function (n) { return n.id === b; });
  }

  // The op one action on one parcel would make, or null when it cannot be
  // made at all. The grid, the inspector, the table and the 3D board all ask
  // this, so a land use set from any of them is the same op, staged, budgeted
  // and announced the same way. `refused` says why nothing could happen.
  function parcelOp(plan, action, id, extra) {
    extra = extra || {};
    if (!plan || !USE_BY_ID[plan.uses[id]]) return { op: null, refused: 'unknown' };
    var water = isWater(id, plan);
    if (action === 'use') {
      if (water) return { op: null, refused: 'water' };
      if (!USE_BY_ID[extra.useId] || PALETTE_IDS.indexOf(extra.useId) === -1) return { op: null, refused: 'unknown' };
      return { op: { kind: 'use', id: id, useId: extra.useId } };
    }
    if (action === 'gi') {
      if (!canGreenInfra(plan.uses[id])) return { op: null, refused: water ? 'water' : 'gi' };
      return { op: { kind: 'gi', id: id } };
    }
    if (action === 'cool') {
      if (!canCoolRoof(plan.uses[id])) return { op: null, refused: water ? 'water' : 'cool' };
      return { op: { kind: 'cool', id: id } };
    }
    if (action === 'transit') {
      if (water) return { op: null, refused: 'water' };
      if (!(plan.transit && plan.transit[id]) && !roadInto(plan, id)) return { op: null, refused: 'stop' };
      return { op: { kind: 'transit', id: id } };
    }
    if (action === 'edge') {
      var b = extra.b;
      if (!b || !USE_BY_ID[plan.uses[b]] || !areNeighbours(id, b)) return { op: null, refused: 'apart' };
      var key = edgeKey(id, b);
      if (basePlan(plan.scenarioId).edges[key]) return { op: null, refused: 'existing' };
      var has = plan.edges[key];
      return { op: { kind: 'edge', a: id, b: b, edgeKind: has ? null : (extra.edgeKind === 'path' ? 'path' : 'local') } };
    }
    return { op: null, refused: 'unknown' };
  }

  // Render tiers. T0: no viewer or no WebGL, the map is the board. T1: a
  // low-power or reduced-motion device, 3D only on request. T2: 3D is offered
  // first on a wide screen. Read from facts the page can see, never guessed.
  function renderTier(env) {
    env = env || {};
    if (!env.viewer || !env.webgl) return 'T0';
    if (env.reducedMotion) return 'T1';
    if (typeof env.cores === 'number' && env.cores > 0 && env.cores <= 4) return 'T1';
    if (typeof env.memory === 'number' && env.memory > 0 && env.memory <= 4) return 'T1';
    return 'T2';
  }
  // A saved choice always wins (it is the student's); otherwise 3D at 768 px
  // and wider, the map on phones and where there is no WebGL (T0).
  // W4 (lead, after W3): T1 shows 3D too, standing still and drawn on demand,
  // because most school Chromebooks are T1 and they must see the town.
  function defaultBoardView(env, saved) {
    if (typeof saved === 'string' && BOARD_VIEW_IDS.indexOf(saved) !== -1) return saved;
    return renderTier(env) !== 'T0' && (env && env.width) >= 768 ? 'model' : 'use';
  }

  // Camera presets, in the caller-owned camera's own terms.
  var CAM_HOME = { rotY: 34, rotX: 26, zoom: 1 };
  var CAM_PRESETS = {
    bird: { rotY: 0, rotX: 80, zoom: 1.05 },
    corner: { rotY: 45, rotX: 34, zoom: 1.3 },
    street: { rotY: 22, rotX: 6, zoom: 2.2 },
    home: CAM_HOME
  };

  // ---- W3 (2026-11-04): what the camera frames ------------------------------
  // A frame is a centre and half-sizes on the ground, in world units (one
  // parcel = 1, the map runs from -6 to 6). The scene turns it into the
  // viewer's target and fit points, so zoom and orbit keep working on top.
  // The first view frames the existing town (where the buildings are); Reset
  // shows the whole map; a parcel frame zooms in on one district.
  var BUILT_USE_IDS = ['housing_low', 'housing_mid', 'mixed', 'commercial', 'civic', 'industry'];
  var FRAME_PAD = 1;           // one parcel of margin round the buildings
  var FRAME_MIN_HALF = 2.5;    // never frame tighter than five parcels across
  var FRAME_PARCEL_HALF = 1.75;
  function mapHalf() { return N_COLS / 2; }
  function wholeFrame() { return { kind: 'all', x: 0, z: 0, hx: mapHalf(), hz: mapHalf() }; }
  function clampFrame(f) {
    var e = mapHalf();
    var hx = Math.min(e, f.hx), hz = Math.min(e, f.hz);
    var out = Object.assign({}, f, { hx: hx, hz: hz });
    out.x = Math.max(-e, Math.min(e, f.x));
    out.z = Math.max(-e, Math.min(e, f.z));
    return out;
  }
  function townFrame(plan) {
    var x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    allParcelIds().forEach(function (id) {
      if (BUILT_USE_IDS.indexOf(plan.uses[id]) === -1) return;
      var c = parcelCentre(id);
      x0 = Math.min(x0, c.x - 0.5); x1 = Math.max(x1, c.x + 0.5);
      z0 = Math.min(z0, c.z - 0.5); z1 = Math.max(z1, c.z + 0.5);
    });
    if (x0 === Infinity) return wholeFrame();
    var e = mapHalf();
    x0 = Math.max(-e, x0 - FRAME_PAD); x1 = Math.min(e, x1 + FRAME_PAD);
    z0 = Math.max(-e, z0 - FRAME_PAD); z1 = Math.min(e, z1 + FRAME_PAD);
    var hx = Math.max(FRAME_MIN_HALF, (x1 - x0) / 2), hz = Math.max(FRAME_MIN_HALF, (z1 - z0) / 2);
    var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // A minimum-size frame near the edge stays on the map.
    cx = Math.max(-e + Math.min(hx, e), Math.min(e - Math.min(hx, e), cx));
    cz = Math.max(-e + Math.min(hz, e), Math.min(e - Math.min(hz, e), cz));
    return clampFrame({ kind: 'town', x: cx, z: cz, hx: hx, hz: hz });
  }
  function parcelFrame(id) {
    var c = parcelCentre(id), e = mapHalf() - FRAME_PARCEL_HALF;
    return clampFrame({ kind: 'parcel', id: id, x: Math.max(-e, Math.min(e, c.x)), z: Math.max(-e, Math.min(e, c.z)),
      hx: FRAME_PARCEL_HALF, hz: FRAME_PARCEL_HALF });
  }
  // Slide a frame over the ground; its centre stays on the map.
  function panFrame(f, dx, dz) {
    return clampFrame(Object.assign({}, f || wholeFrame(), { kind: 'pan', x: (f || wholeFrame()).x + dx, z: (f || wholeFrame()).z + dz }));
  }
  // Screen-relative slide (right, and away from the camera) to a ground move,
  // for the camera's current turn. Camera right on the ground is
  // (cos ry, -sin ry); away from the camera is (-sin ry, -cos ry).
  function screenPan(rotY, right, away) {
    var ry = (rotY || 0) * Math.PI / 180;
    return { dx: right * Math.cos(ry) - away * Math.sin(ry), dz: -right * Math.sin(ry) - away * Math.cos(ry) };
  }
  // Is a parcel inside a frame (its centre)?
  function inFrame(f, id) {
    var c = parcelCentre(id);
    return Math.abs(c.x - f.x) <= f.hx + 1e-9 && Math.abs(c.z - f.z) <= f.hz + 1e-9;
  }
  // W8: in full screen the HUD covers part of the model. Where should a
  // parcel's projected point go to be clear of every HUD box? Null when it is
  // already clear; else the nearest clear point (page px, `margin` round each
  // box and inside the area); with none clear, the middle of the area.
  var FOLLOW_MARGIN = 28;
  var FOLLOW_MS = 320;
  function followPoint(pt, area, blockers, margin) {
    var m = margin == null ? FOLLOW_MARGIN : margin;
    var L = area.left + m, R = area.right - m, T = area.top + m, B = area.bottom - m;
    if (!(L <= R && T <= B)) return null;
    var bl = (blockers || []).filter(function (b) { return b && b.right > b.left && b.bottom > b.top; }).map(function (b) {
      return { left: b.left - m, right: b.right + m, top: b.top - m, bottom: b.bottom + m };
    });
    function clear(x, y) {
      if (x < L - 1e-6 || x > R + 1e-6 || y < T - 1e-6 || y > B + 1e-6) return false;
      for (var i = 0; i < bl.length; i++) {
        if (x > bl[i].left + 1e-6 && x < bl[i].right - 1e-6 && y > bl[i].top + 1e-6 && y < bl[i].bottom - 1e-6) return false;
      }
      return true;
    }
    var known = !!pt && !pt.behind && isFinite(pt.x) && isFinite(pt.y);
    if (known && clear(pt.x, pt.y)) return null;
    var px = known ? pt.x : (L + R) / 2, py = known ? pt.y : (T + B) / 2;
    var xs = [Math.max(L, Math.min(R, px)), L, R], ys = [Math.max(T, Math.min(B, py)), T, B];
    bl.forEach(function (b) { xs.push(b.left, b.right); ys.push(b.top, b.bottom); });
    var best = null;
    xs.forEach(function (x) {
      ys.forEach(function (y) {
        if (!clear(x, y)) return;
        var dd = (x - px) * (x - px) + (y - py) * (y - py);
        if (!best || dd < best.d) best = { x: x, y: y, d: dd };
      });
    });
    return best ? { x: best.x, y: best.y } : { x: (L + R) / 2, y: (T + B) / 2, none: true };
  }
  // A frame's aim: the target and four fit points the scene's aimAt uses, so
  // a follow is solved for the frame the camera goes to.
  function cityAim(parcelTop, f, extent, topAll) {
    f = f || { x: 0, z: 0, hx: extent, hz: extent };
    var fTop = 0;
    Object.keys(parcelTop || {}).forEach(function (id) {
      var p = parcelTop[id];
      if (Math.abs(p.x - f.x) <= f.hx + 0.5 && Math.abs(p.z - f.z) <= f.hz + 0.5) fTop = Math.max(fTop, p.roof);
    });
    if (!fTop) fTop = topAll || 0;
    return { frame: { x: f.x, z: f.z, hx: f.hx, hz: f.hz }, top: fTop, target: [f.x, fTop * 0.35, f.z],
      pts: [[f.x - f.hx, 0, f.z - f.hz], [f.x + f.hx, fTop + 0.4, f.z + f.hz], [f.x - f.hx, fTop + 0.4, f.z + f.hz], [f.x + f.hx, 0, f.z - f.hz]] };
  }

  // ---- W3: the first-two-minutes coach --------------------------------------
  // The fields the coach tints in step 1: open fields a road runs into,
  // outside the flood zone and above the 2100 line, nearest the town first.
  // Where a town has none of those, any field a road runs into. Positions
  // only: nothing here changes the plan.
  function coachFields(plan) {
    var ids = servedOpenParcels(plan);
    if (!ids.length) {
      var served = servedParcels(plan);
      ids = allParcelIds().filter(function (id) { return served[id] && plan.uses[id] === 'field'; });
    }
    var f = townFrame(plan);
    return ids.slice().sort(function (a, b) {
      var ca = parcelCentre(a), cb = parcelCentre(b);
      var da = Math.abs(ca.x - f.x) + Math.abs(ca.z - f.z), db = Math.abs(cb.x - f.x) + Math.abs(cb.z - f.z);
      return da - db || (a < b ? -1 : 1);
    });
  }
  // The K-5 "simple" presentation: the teacher's setting wins, otherwise on
  // for grades K-2 and 3-5. Presentation only: nothing it hides is gone.
  function simpleViewOn(gradeBand, teacherSimple) {
    if (teacherSimple === 'on') return true;
    if (teacherSimple === 'off') return false;
    return gradeBand === 'k2' || gradeBand === 'g35';
  }
  // The palette, grouped. Build shows the common uses, More uses the rest
  // (one tap away), Connect the network, Improve the add-ons.
  var PALETTE_GROUPS = {
    build: ['housing_low', 'housing_mid', 'mixed', 'commercial', 'park', 'civic'],
    more: ['field', 'preserve', 'farm', 'industry'],
    connect: ['road', 'path', 'stop'],
    improve: ['cool', 'gi']
  };
  var TOOL_ICONS = {
    inspect: '\uD83D\uDD0D', housing_low: '\uD83C\uDFE0', housing_mid: '\uD83C\uDFE2', mixed: '\uD83C\uDFEC',
    commercial: '\uD83D\uDED2', park: '\uD83C\uDF33', civic: '\uD83C\uDFEB', field: '\uD83C\uDF3E',
    preserve: '\uD83E\uDD86', farm: '\uD83D\uDE9C', industry: '\uD83C\uDFED', road: '\uD83D\uDEE3\uFE0F',
    path: '\uD83D\uDEB6', stop: '\uD83D\uDE8F', cool: '\u2600\uFE0F', gi: '\uD83C\uDF3F'
  };

  // Where a staged op happens, for the "?" ghost: a parcel, or the middle of
  // a connection. Positions only; nothing here reads the model's results.
  function stagedGhost(op) {
    if (!op) return null;
    if (op.kind === 'edge') return { a: op.a, b: op.b };
    return op.id ? { a: op.id } : null;
  }

  // ---- W2 (2026-11-04): the city responds ---------------------------------
  // Everything the scene shows ABOUT THE MODEL (who lives where, which roads
  // carry a car, where a bus waits, which homes no road reaches) comes from
  // livingCity, a pure function of the plan built on the model's own
  // functions. The renderer decides nothing; it places what this returns.
  var PEOPLE_PER_FIGURE = 12;     // one figure for every 12 homes a road reaches
  var ROADS_PER_CAR = 3;          // one car on every third road a vehicle can use
  var CAR_CAP = 24;
  var GROW_MS = 400;
  var CITY_IDLE_MS = 20000;       // the animation pauses after this long untouched
  var C_DELTA_EPS = 0.0005;       // the spoken delta's threshold for "unchanged"

  function parcelCentre(id) {
    return { x: parcelCol(id) - N_COLS / 2 + 0.5, z: parcelRow(id) - 1 - N_COLS / 2 + 0.5 };
  }
  // A repeatable number in [0, 1), so one plan always puts the same figure
  // in the same place.
  function cityHash(a, b) {
    var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  var CITY_ARMS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function livingCity(plan, assumptionSetId) {
    var setId = assumptionSetId || plan.assumptionSetId || 'central';
    var sc = scorecard(plan, setId);
    var served = servedParcels(plan);
    var ids = allParcelIds();
    var homes = [], people = [], noRoad = [];
    var share = 0, placed = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], u = unitsOnParcel(plan, id);
      if (u <= 0) continue;
      var ok = !!served[id];
      homes.push({ id: id, units: u, served: ok });
      // Homes no road reaches are not counted by the scorecard, so nobody
      // walks there: dark windows and a "no road" sign instead.
      if (!ok) { noRoad.push(id); continue; }
      // A running total, rounded, so the town has exactly round(homes / 12)
      // figures and each served parcel holds its own share of them.
      share += u / PEOPLE_PER_FIGURE;
      var n = Math.round(share) - placed;
      var c = parcelCentre(id), col = parcelCol(id), row = parcelRow(id);
      for (var k = 0; k < n; k++) {
        var slot = placed + k;
        var arm = CITY_ARMS[Math.floor(cityHash(col * 13 + k, row * 7 + slot) * 4) % 4];
        var off = 0.095 * (cityHash(slot, col + row) < 0.5 ? -1 : 1);
        // A stretch of pavement along one arm of the parcel's street cross.
        people.push({
          id: id,
          x0: c.x + arm[0] * 0.1 + (arm[1] ? off : 0), z0: c.z + arm[1] * 0.1 + (arm[0] ? off : 0),
          x1: c.x + arm[0] * 0.44 + (arm[1] ? off : 0), z1: c.z + arm[1] * 0.44 + (arm[0] ? off : 0),
          phase: cityHash(slot + 1, col * 3 + row)
        });
      }
      placed += n;
    }
    // Cars: sparse and uniform, on roads a vehicle can reach from the centre.
    // Traffic is not modelled, so they say nothing about how busy a road is.
    var keys = Object.keys(plan.edges || {}).sort(), roads = [];
    for (var j = 0; j < keys.length; j++) {
      var e = edgeEnds(keys[j]);
      if (isRoadKind(plan.edges[keys[j]]) && served[e[0]] && served[e[1]]) roads.push(keys[j]);
    }
    var cars = [];
    for (var r = 0; r < roads.length && cars.length < CAR_CAP; r += ROADS_PER_CAR) {
      var ends = edgeEnds(roads[r]), ca = parcelCentre(ends[0]), cb = parcelCentre(ends[1]);
      cars.push({ key: roads[r], a: ends[0], b: ends[1], x0: ca.x, z0: ca.z, x1: cb.x, z1: cb.z,
        phase: cityHash(r + 3, cars.length + 1) });
    }
    // Buses wait at the stops the scorecard counts. No route is drawn,
    // because no route is modelled.
    var buses = (sc.transitStops || []).map(function (sid) {
      var c2 = parcelCentre(sid);
      return { id: sid, x: c2.x - 0.2, z: c2.z - 0.035 };
    });
    return {
      ratio: PEOPLE_PER_FIGURE, roadsPerCar: ROADS_PER_CAR,
      people: people, cars: cars, buses: buses, homes: homes, noRoad: noRoad,
      unitsServed: sc.tier1.totalUnitsServed, unitsUnserved: sc.tier1.unitsUnserved,
      servedRoads: roads.length
    };
  }

  // What grows in after a change: parcels whose use changed or that gained a
  // cool roof, green infrastructure or a stop, and connections built or
  // changed. A new town is opening a problem, not a change, so nothing grows.
  function planGrowth(prev, next) {
    if (!prev || !next || prev.scenarioId !== next.scenarioId) return { ids: [], edges: [] };
    function on(m0, m1, id) { return !!(m1 && m1[id]) && !(m0 && m0[id]); }
    var ids = allParcelIds().filter(function (id) {
      if (!USE_BY_ID[next.uses[id]]) return false;
      return prev.uses[id] !== next.uses[id] || on(prev.coolRoofs, next.coolRoofs, id) ||
        on(prev.greenInfra, next.greenInfra, id) || on(prev.transit, next.transit, id);
    });
    var pe = prev.edges || {};
    var edges = Object.keys(next.edges || {}).filter(function (k) { return pe[k] !== next.edges[k]; });
    return { ids: ids, edges: edges };
  }

  // The three numbers the spoken delta reads after every edit. The chips on
  // the board are built from the same values, so the two cannot disagree.
  function deltaValues(before, after) {
    return {
      units: after.tier1.newUnitsServed, dUnits: after.tier1.newUnitsServed - before.tier1.newUnitsServed,
      c: after.tier2.runoffCoefficient, dC: after.tier2.runoffCoefficient - before.tier2.runoffCoefficient,
      cost: after.tier2.capitalCost, dCost: after.tier2.capitalCost - before.tier2.capitalCost
    };
  }
  function deltaChips(v) {
    var out = [];
    if (v.dUnits) out.push({ id: 'homes', up: v.dUnits > 0, text: String(Math.abs(v.dUnits)) });
    if (Math.abs(v.dC) > C_DELTA_EPS) out.push({ id: 'c', up: v.dC > 0, text: Math.abs(v.dC).toFixed(3) });
    if (v.dCost) out.push({ id: 'cost', up: v.dCost > 0, text: fmtMoney(Math.abs(v.dCost)) });
    return out;
  }

  // ---- W4 (2026-11-04): lenses. ONE per-parcel function per lens: the map
  // and the 3D board both draw what lensCells returns (a class, a fill, the
  // value, the glyph that says the class without colour, and for rain the
  // share that runs off), so the two boards cannot disagree.
  var LENS_IDS = ['use', 'elevation', 'heat', 'park', 'transit', 'rain', 'flood', 'access'];
  // Each fill clears 4.5:1 with white or dark ink (the parcel code sits on it).
  // W6: rain that runs off is slate with a hatch, never the river's blue.
  var LENS_FILL = { walkIn: '#15803d', busIn: '#0f766e', out: '#f1f5f9',
    shed: '#475569', soak: '#4ade80', zone: '#0e7490', future: '#fb923c', dry: '#f1f5f9' };
  var LENS_HATCH = { light: '#0f172a', dark: '#0b1220', contrast: '#000000' };
  // W6: each lens fill's twin on the dark scene (no near-white glare) and in
  // high contrast (black, white and pure hues only). Keyed by the light fill,
  // so lensCells stays the one model and the theme is applied when drawing.
  // Every value still clears 4.5:1 with white or dark ink (a test checks).
  var LENS_THEME_FILL = {
    dark: { '#f1f5f9': '#334155', '#475569': '#64748b', '#4ade80': '#166534', '#fb923c': '#c2410c',
      '#fde68a': '#854d0e', '#f59e0b': '#b45309', '#7f1d1d': '#f87171',
      '#dbeafe': '#172554', '#93c5fd': '#1e40af', '#2563eb': '#2563eb', '#1e3a8a': '#93c5fd' },
    contrast: { '#15803d': '#ffff00', '#0f766e': '#ffff00', '#f1f5f9': '#000000', '#475569': '#ffffff', '#4ade80': '#000000',
      '#0e7490': '#00ffff', '#fb923c': '#ffff00', '#fde68a': '#7f1d1d', '#f59e0b': '#b91c1c', '#dc2626': '#fb923c', '#7f1d1d': '#fde047',
      '#dbeafe': '#0c4a6e', '#93c5fd': '#0369a1', '#2563eb': '#38bdf8', '#1e3a8a': '#e0f2fe' }
  };
  function lensThemeFill(fill, theme) {
    if (!fill || theme !== 'dark' && theme !== 'contrast') return fill;
    var f = String(fill).toLowerCase(), hit = LENS_THEME_FILL[theme][f];
    if (hit) return hit;
    // The height ramp and anything unlisted: dimmed on the dark scene, as is in contrast.
    return theme === 'dark' && /^#[0-9a-f]{6}$/.test(f) ? mixHex(f, '#0b1220', 0.6) : fill;
  }
  // W6 high contrast: a colour snapped to black, white or a full-strength hue,
  // so no part of the contrast scene is a mid grey.
  function hcSnap(hex) {
    var h0 = String(hex || '').toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(h0)) return hex;
    var n = parseInt(h0.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var hi = Math.max(r, g, b), lo = Math.min(r, g, b);
    if (hi - lo < 48) return relativeLuminance(h0) > 0.18 ? '#ffffff' : '#000000';
    var k = 255 / hi, out = 0;
    [r, g, b].forEach(function (v) { out = out * 256 + Math.round(v * k); });
    return '#' + (0x1000000 + out).toString(16).slice(1);
  }
  var LENS_GLYPH_TEXT = { yes: '✓', no: '✗', zone: '≈', future: '2100', '0': '0', '1': '1', '2': '2', '3': '3' };
  function lensCells(plan, assumptionSetId, lensId) {
    var lens = LENS_IDS.indexOf(lensId) === -1 ? 'use' : lensId;
    var setId = assumptionSetId || plan.assumptionSetId || 'central';
    var assumptions = SET_BY_ID[setId] || SET_BY_ID.central;
    var s = scorecard(plan, setId);
    var scen = scenarioOf(plan);
    var served = servedParcels(plan);
    var ids = allParcelIds(), cells = {}, gaps = {}, lo = Infinity, hi = -Infinity;
    if (lens === 'elevation') {
      ids.forEach(function (id) { var e = terrainAt(id, plan).elevationM; if (e < lo) lo = e; if (e > hi) hi = e; });
    }
    if (lens === 'access') accessGaps(plan).rows.forEach(function (g) { gaps[g.id] = g; });
    function walk(dist, limit, id, fillIn, homes) {
      var inside = dist[id] !== undefined && dist[id] <= limit;
      return { cls: inside ? 'in' : 'out', fill: inside ? fillIn : LENS_FILL.out,
        glyph: homes ? (inside ? 'yes' : 'no') : null, value: dist[id] === undefined ? null : dist[id] };
    }
    ids.forEach(function (id) {
      var use = USE_BY_ID[plan.uses[id]], terr = terrainAt(id, plan);
      var homes = unitsOnParcel(plan, id) > 0 && !!served[id];
      var cell = { cls: use.id, fill: use.fill, glyph: null, value: null };
      if (lens === 'rain') {
        // Every parcel, the river too: C is the share of the design storm
        // that runs off, exactly the coefficient the rational method sums.
        var c = effectiveC(plan, id, assumptions);
        cell = { cls: 'rain', fill: LENS_FILL.shed, fill2: LENS_FILL.soak, glyph: null, value: c, split: c };
      } else if (use.id === 'water' || lens === 'use') {
        if (use.id === 'water') cell.cls = 'water';
      } else if (lens === 'elevation') {
        cell = { cls: 'height', fill: terrainColour(terr.elevationM, lo, hi), glyph: null, value: terr.elevationM };
      } else if (lens === 'heat') {
        var hv = s.surfaceHeat[id], band = heatBand(hv);
        cell = { cls: 'b' + band, fill: HEAT_RAMP[band], glyph: null, value: hv };
      } else if (lens === 'park') {
        cell = walk(s.parkDistance, s.parkHopLimit, id, LENS_FILL.walkIn, homes);
      } else if (lens === 'transit') {
        cell = walk(s.transitDistance, s.transitHopLimit, id, LENS_FILL.busIn, homes);
      } else if (lens === 'flood') {
        // The same tests the scorecard counts: the mapped zone, then (sea-rise
        // towns) ground that is dry today but inside the 2100 reach.
        var fc = terr.floodplain ? 'zone' : (scen.modelsSeaRise && inFutureSurge(id, plan, assumptions) ? 'future' : 'dry');
        cell = { cls: fc, fill: LENS_FILL[fc], glyph: fc !== 'dry' && unitsOnParcel(plan, id) > 0 ? fc : null, value: terr.elevationM };
      } else if (lens === 'access') {
        var g = gaps[id], n = g ? g.missing.length : -1;
        cell = { cls: g ? 'm' + n : 'none', fill: g ? ACCESS_RAMP[n] : ACCESS_NONE, glyph: g ? String(n) : null, value: g ? n : null };
      }
      cells[id] = cell;
    });
    return { lens: lens, setId: setId, cells: cells };
  }

  // ---- W2: what the town looks like. Pure data again: every part is a
  // box, a roof prism, a round or pointed tree crown, a water tile, a flood
  // cap, a sign, a figure or a car. The renderer draws each kind as ONE
  // instanced batch, so a fully built town costs a handful of draw calls.
  // Shape tells the uses apart as well as colour: pitched-roof houses,
  // blocks with window rows, shops with awnings and big windows, a civic hall
  // with columns and a flag, sheds with a chimney, trees, crop rows, water.
  function mixHex(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), out = 0;
    for (var s = 16; s >= 0; s -= 8) {
      var ca = (pa >> s) & 255, cb = (pb >> s) & 255;
      out = out * 256 + Math.round(ca + (cb - ca) * t);
    }
    return '#' + (0x1000000 + out).toString(16).slice(1);
  }
  // W6: high contrast is its own scene, not dark's: Canvas/CanvasText (black
  // ground, white edges and walls) plus a few full-strength hues, no greys.
  // Land use is never left to colour there: every parcel floats its code.
  function scenePalette(theme) {
    var hc = theme === 'contrast', dark = theme === 'dark' || hc;
    return {
      theme: hc ? 'contrast' : (dark ? 'dark' : 'light'),
      clear: hc ? '#000000' : (dark ? '#0b1220' : '#dfe6ef'),
      paving: hc ? '#000000' : '#d3cfc6',
      ground: hc ? '#000000' : null,
      edge: hc ? '#ffffff' : null,
      wall: hc ? '#ffffff' : null,
      asphalt: hc ? '#ffffff' : (dark ? '#2a303b' : '#4b5260'),
      marking: hc ? '#000000' : '#f5f0dc',
      markingOld: hc ? '#000000' : '#f2d675',
      lit: hc ? '#ffff00' : '#ffd76a',
      unlit: hc ? '#000000' : '#1b2230',
      glass: hc ? '#000000' : '#a9c7e3',
      roof: hc ? '#ffff00' : '#9a4a3a',
      stone: hc ? '#ffffff' : '#e7e5e4',
      trunk: hc ? '#ffffff' : '#6b4f2a',
      leaf: hc ? '#00ff00' : '#2f8f46',
      conifer: hc ? '#00ff00' : '#1f6b4f',
      crop: hc ? '#ffff00' : '#5d8a2f',
      water: hc ? '#00e5ff' : (dark ? '#1d5f94' : '#2b7bb9'),
      car: hc ? '#ffffff' : '#e5e7eb',
      bus: hc ? '#ffff00' : '#14b8a6',
      clothes: hc ? ['#ffffff', '#ffff00', '#00ffff', '#00ff00'] : ['#1d4ed8', '#be123c', '#047857', '#7c3aed'],
      // The selection, hover and road-start outlines.
      sel: hc ? '#ffff00' : '#1f5eb0', hover: hc ? '#ff40ff' : '#fde047', from: hc ? '#00ffff' : '#22d3ee'
    };
  }
  function groundTone(useId, pal) {
    var u = USE_BY_ID[useId];
    if (!u) return pal.paving;
    if (pal.theme === 'contrast') return useId === 'water' ? pal.water : pal.ground;
    var c;
    switch (useId) {
      case 'field': c = '#a3bd8a'; break;
      case 'park': c = '#5cae63'; break;
      case 'preserve': c = '#3f8a73'; break;
      case 'farm': c = '#a8834f'; break;
      case 'water': return pal.water;
      default: c = mixHex(u.fill, pal.paving, 0.72);
    }
    return pal.theme === 'dark' ? mixHex(c, '#0b1220', 0.18) : c;
  }

  function townParts(m, living, pal, grow, lens) {
    var out = { box: [], prism: [], round: [], cone: [], water: [], flood: [], sign: [], people: [], cars: [], tops: {}, roofs: {},
      tags: [], rain: [] };
    var gset = {}, eset = {}, lit = {};
    ((grow && grow.ids) || []).forEach(function (id) { gset[id] = true; });
    ((grow && grow.edges) || []).forEach(function (k) { eset[k] = true; });
    ((living && living.homes) || []).forEach(function (hm) { lit[hm.id] = hm.served; });
    var ST = metresToWorld(METRES_PER_STOREY), QO = 0.26;
    var Q = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    function put(list, id, gy, gr, x, y, z, sx, sy, sz, c, ry) {
      list.push({ id: id, gy: gy, grow: gr, x: x, y: y, z: z, sx: sx, sy: sy, sz: sz, c: c, ry: ry || 0 });
    }
    function tree(id, gy, gr, tx, tz, pointed) {
      put(out.box, id, gy, gr, tx, gy + 0.03, tz, 0.022, 0.06, 0.022, pal.trunk);
      if (pointed) put(out.cone, id, gy, gr, tx, gy + 0.15, tz, 0.13, 0.22, 0.13, pal.conifer);
      else put(out.round, id, gy, gr, tx, gy + 0.13, tz, 0.17, 0.16, 0.17, pal.leaf);
    }

    m.ground.forEach(function (g) {
      var id = g.id, gy = g.top, gr = gset[id] ? 'up' : null;
      out.tops[id] = gy;
      out.roofs[id] = gy;
      var tile = { id: id, gy: 0, grow: null, x: g.x, y: gy / 2, z: g.z, sx: 0.98, sy: Math.max(0.02, gy), sz: 0.98, c: groundTone(g.use, pal), ry: 0, k: 'ground' };
      if (g.water) out.water.push(tile); else out.box.push(tile);
      // W6 contrast: every parcel framed in white, so its edge is never a colour step.
      if (pal.edge) {
        var ee = 0.475;
        [[0, -ee, 0.98, 0.022], [0, ee, 0.98, 0.022], [-ee, 0, 0.022, 0.98], [ee, 0, 0.022, 0.98]].forEach(function (b0) {
          out.box.push({ id: id, gy: gy, grow: null, x: g.x + b0[0], y: gy + 0.004, z: g.z + b0[1], sx: b0[2], sy: 0.01, sz: b0[3], c: pal.edge, ry: 0, k: 'edge' });
        });
      }
      var cap = g.underToday ? '#0e7490' : ((g.underFuture || (g.floodplain && !g.water)) ? '#38bdf8' : null);
      if (cap) {
        // A light wash plus a solid frame: the exposure reads at a glance and
        // the land use still shows through it.
        put(out.flood, id, gy, null, g.x, gy + 0.006, g.z, 0.98, 0.01, 0.98, cap);
        var fe = 0.465;
        put(out.box, id, gy, null, g.x, gy + 0.008, g.z - fe, 0.98, 0.014, 0.05, cap);
        put(out.box, id, gy, null, g.x, gy + 0.008, g.z + fe, 0.98, 0.014, 0.05, cap);
        put(out.box, id, gy, null, g.x - fe, gy + 0.008, g.z, 0.05, 0.014, 0.98, cap);
        put(out.box, id, gy, null, g.x + fe, gy + 0.008, g.z, 0.05, 0.014, 0.98, cap);
        for (var ck = 1; ck <= 4; ck++) out.box[out.box.length - ck].k = 'cap';
      }
      var x = g.x, z = g.z;
      if (g.use === 'park') {
        Q.forEach(function (q, i) {
          tree(id, gy, gr, x + q[0] * (QO + 0.04 * cityHash(i, x)), z + q[1] * (QO + 0.04 * cityHash(z, i)), false);
        });
        put(out.box, id, gy, gr, x, gy + 0.003, z, 0.9, 0.006, 0.06, '#e7dcc3');
        put(out.box, id, gy, gr, x, gy + 0.003, z, 0.06, 0.006, 0.9, '#e7dcc3');
      } else if (g.use === 'preserve') {
        Q.forEach(function (q, i) {
          tree(id, gy, gr, x + q[0] * (0.18 + 0.12 * cityHash(i, x + z)), z + q[1] * (0.18 + 0.12 * cityHash(x, i)), true);
        });
        tree(id, gy, gr, x + 0.04, z - 0.03, true);
        put(out.box, id, gy, gr, x - 0.05, gy + 0.004, z + 0.1, 0.26, 0.008, 0.16, '#4f9fb8');
      } else if (g.use === 'farm') {
        Q.forEach(function (q) {
          for (var r = -1; r <= 1; r++) put(out.box, id, gy, gr, x + q[0] * QO + r * 0.09, gy + 0.015, z + q[1] * QO, 0.035, 0.03, 0.3, pal.crop);
        });
      }
    });

    m.buildings.forEach(function (b) {
      var id = b.id, x = b.x, z = b.z, gy = b.base, h = b.height, gr = gset[id] ? 'up' : null;
      var u = USE_BY_ID[b.use];
      if (!u) return;
      var wall = pal.wall || mixHex(u.fill, '#ffffff', 0.18);
      var win = u.units > 0 ? (lit[id] === false ? pal.unlit : pal.lit) : pal.glass;
      var cool = !!b.coolRoof, top = gy + h, roofTop = top;
      function body(px, pz, w, d, hh, c) { put(out.box, id, gy, gr, px, gy + hh / 2, pz, w, hh, d, c); }
      function bands(px, pz, w, d, from, to, c) {
        for (var s = from; s < to; s++) put(out.box, id, gy, gr, px, gy + s * ST + ST * 0.55, pz, w + 0.012, ST * 0.3, d + 0.012, c);
      }
      function flatRoof(px, pz, w, d) {
        if (cool) put(out.box, id, gy, gr, px, top + 0.006, pz, w + 0.004, 0.012, d + 0.004, '#f8fafc');
        else put(out.box, id, gy, gr, px + w * 0.15, top + 0.02, pz - d * 0.15, w * 0.3, 0.04, d * 0.3, '#94a3b8');
        roofTop = Math.max(roofTop, top + 0.04);
      }
      if (b.use === 'housing_low') {
        Q.forEach(function (q, i) {
          var px = x + q[0] * QO, pz = z + q[1] * QO;
          body(px, pz, 0.24, 0.22, h, wall);
          bands(px, pz, 0.24, 0.22, 0, b.storeys, win);
          put(out.prism, id, gy, gr, px, top + 0.045, pz, 0.27, 0.09, 0.25, cool ? '#f8fafc' : pal.roof, i % 2 ? Math.PI / 2 : 0);
        });
        roofTop = top + 0.09;
      } else if (b.use === 'housing_mid') {
        Q.forEach(function (q) {
          var px = x + q[0] * QO, pz = z + q[1] * QO;
          body(px, pz, 0.28, 0.28, h, wall);
          bands(px, pz, 0.28, 0.28, 0, b.storeys, win);
          flatRoof(px, pz, 0.28, 0.28);
        });
      } else if (b.use === 'mixed') {
        Q.forEach(function (q) {
          var px = x + q[0] * QO, pz = z + q[1] * QO;
          body(px, pz, 0.28, 0.28, h, wall);
          put(out.box, id, gy, gr, px, gy + ST * 0.4, pz, 0.292, ST * 0.6, 0.292, pal.glass);
          put(out.box, id, gy, gr, px - q[0] * 0.16, gy + ST * 0.82, pz, 0.04, 0.015, 0.26, mixHex(u.fill, '#000000', 0.15));
          bands(px, pz, 0.28, 0.28, 1, b.storeys, win);
          flatRoof(px, pz, 0.28, 0.28);
        });
      } else if (b.use === 'commercial') {
        Q.forEach(function (q) {
          var px = x + q[0] * QO, pz = z + q[1] * QO;
          body(px, pz, 0.3, 0.26, h, wall);
          put(out.box, id, gy, gr, px, gy + ST * 0.42, pz, 0.312, ST * 0.62, 0.272, pal.glass);
          put(out.box, id, gy, gr, px, gy + ST * 0.86, pz, 0.312, ST * 0.16, 0.272, mixHex(u.fill, '#000000', 0.35));
          put(out.box, id, gy, gr, px - q[0] * 0.17, gy + ST * 0.76, pz, 0.05, 0.015, 0.24, mixHex(u.fill, '#ffffff', 0.6));
          bands(px, pz, 0.3, 0.26, 1, b.storeys, pal.glass);
          flatRoof(px, pz, 0.3, 0.26);
        });
      } else if (b.use === 'civic') {
        var hx = x - QO, hz = z - QO;
        body(hx, hz, 0.3, 0.24, h, wall);
        put(out.prism, id, gy, gr, hx, top + 0.035, hz, 0.26, 0.07, 0.32, cool ? '#f8fafc' : pal.stone, Math.PI / 2);
        for (var cI = 0; cI < 4; cI++) put(out.box, id, gy, gr, hx - 0.11 + cI * 0.0733, gy + h * 0.45, hz + 0.155, 0.022, h * 0.9, 0.022, pal.stone);
        put(out.box, id, gy, gr, hx, gy + h * 0.92, hz + 0.15, 0.3, 0.025, 0.06, pal.stone);
        put(out.box, id, gy, gr, x + QO, gy + 0.25, z - QO, 0.012, 0.5, 0.012, '#cbd5e1');
        put(out.box, id, gy, gr, x + QO + 0.05, gy + 0.46, z - QO, 0.09, 0.055, 0.006, '#dc2626');
        body(x - QO, z + QO, 0.3, 0.22, h, wall);
        bands(x - QO, z + QO, 0.3, 0.22, 0, b.storeys, pal.glass);
        put(out.box, id, gy, gr, x + QO, gy + 0.004, z + QO, 0.3, 0.008, 0.3, '#5cae63');
        tree(id, gy, gr, x + QO, z + QO, false);
        roofTop = Math.max(gy + 0.5, top + 0.07);
      } else if (b.use === 'industry') {
        [[-1, -1], [1, 1]].forEach(function (q) {
          var px = x + q[0] * QO, pz = z + q[1] * QO;
          body(px, pz, 0.32, 0.3, h, wall);
          for (var s = 0; s < 3; s++) put(out.prism, id, gy, gr, px - 0.107 + s * 0.107, top + 0.03, pz, 0.107, 0.06, 0.3, cool ? '#f8fafc' : '#9ca3af');
        });
        put(out.box, id, gy, gr, x + QO, gy + 0.22, z - QO, 0.05, 0.44, 0.05, '#78716c');
        put(out.box, id, gy, gr, x + QO, gy + 0.41, z - QO, 0.056, 0.03, 0.056, '#b91c1c');
        put(out.box, id, gy, gr, x - QO - 0.04, gy + 0.025, z + QO, 0.14, 0.05, 0.06, '#c2410c');
        put(out.box, id, gy, gr, x - QO + 0.05, gy + 0.025, z + QO + 0.09, 0.14, 0.05, 0.06, '#0369a1');
        roofTop = gy + 0.44;
      } else {
        body(x, z, 0.62, 0.62, h, wall);
      }
      out.roofs[id] = Math.max(out.roofs[id], roofTop);
    });

    (m.features || []).forEach(function (f) {
      var gr = gset[f.id] ? 'up' : null;
      if (f.kind === 'stop') {
        put(out.box, f.id, f.base, gr, f.x, f.base + 0.09, f.z, 0.02, 0.18, 0.02, '#334155');
        put(out.box, f.id, f.base, gr, f.x, f.base + 0.19, f.z, 0.08, 0.05, 0.015, f.served ? '#facc15' : '#ef4444');
        out.box[out.box.length - 2].k = 'feature';
        out.box[out.box.length - 1].k = 'feature';
      } else if (f.kind === 'gi') {
        put(out.box, f.id, f.base, gr, f.x, f.base + 0.015, f.z, 0.22, 0.03, 0.05, '#15803d');
        out.box[out.box.length - 1].k = 'feature';
      }
    });

    m.links.forEach(function (l) {
      var gr = eset[l.key] ? 'len' : null, path = l.kind === 'path';
      var w = path ? 0.06 : (l.kind === 'arterial' ? 0.18 : 0.14);
      var y = l.y + 0.012;
      function road(x, yy, z, sx, sy, sz, c) {
        out.box.push({ id: l.key, gy: y, grow: gr, ox: l.x, oz: l.z, x: x, y: yy, z: z, sx: sx, sy: sy, sz: sz, c: c, ry: 0 });
      }
      road(l.x, y, l.z, l.horizontal ? 1 + w : w, 0.02, l.horizontal ? w : 1 + w, path ? PATH_INK : pal.asphalt);
      if (path) return;
      for (var s = -1; s <= 1; s++) {
        road(l.horizontal ? l.x + s * 0.33 : l.x, y + 0.011, l.horizontal ? l.z : l.z + s * 0.33,
          l.horizontal ? 0.14 : 0.014, 0.004, l.horizontal ? 0.014 : 0.14, l.kind === 'existing' ? pal.markingOld : pal.marking);
      }
    });

    if (living) {
      living.buses.forEach(function (bs) {
        var by = (out.tops[bs.id] || 0) + 0.022 + 0.035;
        put(out.box, bs.id, out.tops[bs.id] || 0, gset[bs.id] ? 'up' : null, bs.x, by, bs.z, 0.22, 0.07, 0.075, pal.bus);
        put(out.box, bs.id, out.tops[bs.id] || 0, gset[bs.id] ? 'up' : null, bs.x, by + 0.012, bs.z, 0.224, 0.022, 0.079, '#0f172a');
        out.box[out.box.length - 2].k = 'feature';
        out.box[out.box.length - 1].k = 'feature';
      });
      living.noRoad.forEach(function (id) {
        var c = parcelCentre(id);
        // W6: in contrast mode the parcel's code floats there, so the sign sits above it.
        put(out.sign, id, null, null, c.x, out.roofs[id] + (pal.theme === 'contrast' ? 0.42 : 0.14), c.z, 0.46, 0.13, 1, '#ffffff');
      });
      living.people.forEach(function (p, i) {
        out.people.push({ id: p.id, x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1, y: (out.tops[p.id] || 0) + 0.046,
          phase: p.phase, c: pal.clothes[i % pal.clothes.length] });
      });
      living.cars.forEach(function (cr) {
        var cy = Math.max(out.tops[cr.a] || 0, out.tops[cr.b] || 0) + 0.022 + 0.0175;
        out.cars.push({ id: cr.key, x0: cr.x0, z0: cr.z0, x1: cr.x1, z1: cr.z1, y: cy, phase: cr.phase, c: pal.car });
      });
    }
    if (lens && lens.cells && lens.lens !== 'use') lensParts(out, m, pal, lens);
    // W6 contrast: no part is a mid grey (every colour snaps to black, white
    // or a full hue), and each parcel floats its land-use code, the map's own
    // two letters, so land use never rests on colour.
    out.codes = [];
    if (pal.theme === 'contrast') {
      ['box', 'prism', 'round', 'cone', 'flood', 'people', 'cars'].forEach(function (kind) {
        // The ground already carries the contrast lens ramp (an ordered ramp, not snapped).
        out[kind].forEach(function (s) { if (s.k !== 'lid' && s.k !== 'hatch' && s.k !== 'ground') s.c = hcSnap(s.c); });
      });
      // Hunt: a code on all 144 parcels buried the town at full view. An open
      // field (the blank default) is quiet: its code shows only while it is
      // selected or under the pointer (the tick places it), and the legend
      // and the map, which keeps every code, say so. A code also clears the
      // trees of a park or preserve, which hid half of "Pr".
      m.ground.forEach(function (g) {
        var u = USE_BY_ID[g.use];
        if (!u) return;
        var trees = u.id === 'preserve' ? 0.26 : (u.id === 'park' ? 0.21 : 0);
        out.codes.push({ id: g.id, use: u.id, code: u.code, cell: CODE_ATLAS_IDS.indexOf(u.id), quiet: u.id === 'field',
          x: g.x, y: Math.max(out.roofs[g.id] || g.top, g.top + trees) + 0.17, z: g.z, sx: 0.46, sy: 0.27, sz: 1, c: '#ffffff', ry: 0 });
      });
    }
    return out;
  }

  // W4: a lens on the 3D board, from the same lensCells the map draws. The
  // ground takes the lens fill; what stands on a parcel takes a lighter mix
  // of it (dark windows of homes no road reaches keep their meaning). Rain is
  // the exception: a two-part lid over each parcel splits the design storm
  // into what runs off (C) and what soaks in (1 - C), with the town in clay
  // below it. Flood exposure caps stay where the subject is the ground.
  var LENS_LID_W = 0.96;
  // W6: the fills are the theme's twins (lensThemeFill); in contrast mode only
  // the ground carries the lens and what stands on it stays white. Shed rain
  // is slate with a hatch (stripes across the lid, a fixed spacing, so a wider
  // shed share simply has more of them), and the glyph badges are larger.
  var LENS_HATCH_GAP = 0.075, LENS_TAG = { w: 0.4, wFuture: 0.62, h: 0.36 };
  function lensParts(out, m, pal, lens) {
    var L = lens.lens, cells = lens.cells, th = pal.theme, hc = th === 'contrast';
    var tf = function (f) { return lensThemeFill(f, th); };
    var clay = hc ? '#ffffff' : (th === 'dark' ? '#cbd5e1' : '#e7e5e4');
    // The wash would muddy a lens fill; the flood lens's fill IS the cap.
    out.flood = [];
    if (L !== 'elevation' && L !== 'flood') {
      out.box = out.box.filter(function (s) { return s.k !== 'cap'; });
    }
    var topOf = {};
    ['box', 'prism', 'round', 'cone', 'water'].forEach(function (kind) {
      out[kind].forEach(function (s) {
        var cell = cells[s.id];
        topOf[s.id] = Math.max(topOf[s.id] || 0, s.y + s.sy / 2);
        if (!cell || s.k === 'feature' || s.k === 'cap' || s.k === 'edge' || kind === 'water') return;
        if (s.k === 'ground') { if (L !== 'rain') s.c = tf(cell.fill); return; }
        if (s.c === pal.unlit || hc) return;
        if (L === 'rain') { s.c = clay; return; }
        s.c = (s.c === pal.lit || s.c === pal.glass) ? mixHex(tf(cell.fill), '#000000', 0.35) : mixHex(tf(cell.fill), '#94a3b8', 0.25);
      });
    });
    var hatchInk = LENS_HATCH[th] || LENS_HATCH.light;
    var maxTop = 0;
    Object.keys(topOf).forEach(function (id) { if (topOf[id] > maxTop) maxTop = topOf[id]; });
    m.ground.forEach(function (g, gi) {
      var cell = cells[g.id];
      if (!cell) return;
      var top = topOf[g.id] || g.top;
      if (L === 'rain') {
        var c = Math.max(0, Math.min(1, cell.split)), w = LENS_LID_W, x0 = g.x - w / 2, y = top + 0.03;
        out.box.push({ id: g.id, gy: y, grow: null, x: x0 + w * c / 2, y: y, z: g.z, sx: Math.max(0.0001, w * c), sy: 0.012, sz: w,
          c: tf(cell.fill), ry: 0, k: 'lid', part: 'shed', share: c });
        out.box.push({ id: g.id, gy: y, grow: null, x: x0 + w * c + w * (1 - c) / 2, y: y, z: g.z, sx: Math.max(0.0001, w * (1 - c)), sy: 0.012, sz: w,
          c: tf(cell.fill2), ry: 0, k: 'lid', part: 'soak', share: 1 - c });
        // The hatch: dark stripes laid across the shed part only.
        for (var hx = x0 + LENS_HATCH_GAP / 2; hx < x0 + w * c - 0.01; hx += LENS_HATCH_GAP) {
          out.box.push({ id: g.id, gy: y, grow: null, x: hx, y: y + 0.008, z: g.z, sx: 0.016, sy: 0.006, sz: w * 0.96,
            c: hatchInk, ry: 0, k: 'hatch' });
        }
        // Uniform rain: the same two streaks on every parcel, falling at one
        // speed. Nothing about them varies, because the storm does not.
        for (var r = 0; r < 2; r++) {
          out.rain.push({ id: g.id, x: g.x + (cityHash(gi, r) - 0.5) * 0.8, z: g.z + (cityHash(r + 7, gi) - 0.5) * 0.8,
            y0: top + 0.05, y1: maxTop + 1.6, phase: cityHash(gi + 3, r + 11), c: pal.theme === 'light' ? '#2563eb' : '#93c5fd' });
        }
      }
      if (cell.glyph) {
        // Above the contrast scene's code label, where there is one.
        out.tags.push({ id: g.id, glyph: cell.glyph, x: g.x, y: top + (hc ? 0.72 : 0.3), z: g.z,
          sx: cell.glyph === 'future' ? LENS_TAG.wFuture : LENS_TAG.w, sy: LENS_TAG.h, sz: 1, c: '#ffffff', ry: 0 });
      }
    });
  }

  // The plan as a self-contained SVG, for the memo export. Pure, so it is
  // testable, and string-only so the memo stays one file with nothing to load.
  //
  // SVG presentation attributes cannot take var(), exactly like canvas cannot,
  // so every colour here is a literal. The memo is also read on paper and in
  // whatever theme the reader happens to have, so it commits to one light
  // palette rather than trying to follow a theme it cannot see.
  function planSvg(plan, assumptionSetId) {
    var sc = scenarioOf(plan);
    var CELL = 34, PAD = 16;
    var w = N_COLS * CELL + PAD * 2, hgt = N_ROWS * CELL + PAD * 2;
    var served = servedParcels(plan);
    var out = [];

    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + hgt +
      '" width="' + w + '" height="' + hgt + '" role="img" ' +
      'aria-labelledby="planTitle planDesc">');
    out.push('<title id="planTitle">' + esc(fmt(__alloT('stem.citylab.svg_title', '{town} as planned'), { town: sc.town })) + '</title>');
    out.push('<desc id="planDesc">' + esc(fmt(__alloT('stem.citylab.svg_desc', 'A {cols} by {rows} grid of one-hectare ' +
      'parcels. Each parcel carries a two-letter land use code. The table below lists every ' +
      'parcel that was changed, so nothing here depends on seeing the picture.'), { cols: N_COLS, rows: N_ROWS })) + '</desc>');
    out.push('<rect width="' + w + '" height="' + hgt + '" fill="#ffffff"/>');

    allParcelIds().forEach(function (id) {
      var t = terrainAt(id, plan);
      var use = USE_BY_ID[plan.uses[id]];
      var x = PAD + parcelCol(id) * CELL;
      var y = PAD + (parcelRow(id) - 1) * CELL;
      out.push('<rect x="' + x + '" y="' + y + '" width="' + CELL + '" height="' + CELL +
        '" fill="' + use.fill + '" stroke="#1e293b" stroke-width="0.5"/>');
      if (t.floodplain) {
        out.push('<rect x="' + (x + 1.5) + '" y="' + (y + 1.5) + '" width="' + (CELL - 3) +
          '" height="' + (CELL - 3) + '" fill="none" stroke="#0ea5e9" stroke-width="2"/>');
      }
      out.push('<text x="' + (x + 3) + '" y="' + (y + 11) + '" font-family="system-ui,sans-serif" ' +
        'font-size="9" font-weight="700" fill="' + readableInk(use.fill) + '">' +
        esc(use.code) + '</text>');
      if (unitsOnParcel(plan, id) > 0 && !served[id]) {
        out.push('<text x="' + (x + 3) + '" y="' + (y + CELL - 3) +
          '" font-family="system-ui,sans-serif" font-size="10" font-weight="700" ' +
          'fill="#b91c1c">!</text>');
      }
    });

    Object.keys(plan.edges).forEach(function (key) {
      var e = edgeEnds(key), kind = plan.edges[key];
      var x1 = PAD + parcelCol(e[0]) * CELL + CELL / 2;
      var y1 = PAD + (parcelRow(e[0]) - 1) * CELL + CELL / 2;
      var x2 = PAD + parcelCol(e[1]) * CELL + CELL / 2;
      var y2 = PAD + (parcelRow(e[1]) - 1) * CELL + CELL / 2;
      out.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
        '" stroke="#0f172a" stroke-width="' + (kind === 'path' ? 1.5 : 3) + '"' +
        (kind === 'path' ? ' stroke-dasharray="4 3"' : '') + ' stroke-linecap="round"/>');
    });

    // No legend text inside the SVG: it does not wrap, and the first version
    // ran off the right edge. It lives in the figcaption, which does wrap.
    out.push('</svg>');
    return out.join('');
  }

  // What the student actually changed, which is the useful table in a memo.
  // All 144 rows would bury it, and 130 of them would say "unchanged".
  function planChanges(plan) {
    var base = basePlan(plan.scenarioId);
    var rows = [];
    allParcelIds().forEach(function (id) {
      var from = base.uses[id], to = plan.uses[id];
      var gi = !!plan.greenInfra[id];
      if (from === to && !gi) return;
      rows.push({ id: id, from: from, to: to, greenInfra: gi,
        units: unitsOnParcel(plan, id),
        floodplain: terrainAt(id, plan).floodplain });
    });
    return rows;
  }

  // ===================================================================
  // SECTION 3a - PREDICT BEFORE COMMIT, MISSIONS, SAVED PLANS, XP RULES
  //
  // All pure. Render only wires these to buttons.
  // ===================================================================

  // Run fn with no host translator, so getters return their English
  // fallback. Used to recognise a binding constraint stored as an English
  // label by plans saved before ids were stored.
  function inEnglish(fn) {
    var keep = __alloCtx_citylab;
    __alloCtx_citylab = null;
    try { return fn(); } finally { __alloCtx_citylab = keep; }
  }

  function normaliseBinding(value, scenarioId) {
    var v = String(value == null ? '' : value);
    if (!v) return '';
    var reqs = scenarioOf(scenarioId).requirements;
    for (var i = 0; i < reqs.length; i++) if (reqs[i].id === v) return v;
    var english = inEnglish(function () { return reqs.map(function (r) { return r.label; }); });
    for (var j = 0; j < reqs.length; j++) {
      if (english[j] === v || reqs[j].label === v) return reqs[j].id;
    }
    return v.slice(0, 400);
  }

  function requirementLabel(id, planOrId) {
    var reqs = scenarioOf(planOrId).requirements;
    for (var i = 0; i < reqs.length; i++) if (reqs[i].id === id) return reqs[i].label;
    return id;
  }

  // ---- Predict before commit -------------------------------------------
  // Indicators a student may predict. Every one is Tier 1 or Tier 2: a
  // contested quantity is never offered, so it can never be "checked".
  // `same` is the dead band for "about the same"; `bands` split a real change
  // into small / medium / large, in the indicator's own unit. They are sized
  // for ONE edit: one hectare of 144 moves C by at most 0.8 / 144 = 0.0056.
  var PREDICT_INDICATORS = [
    { id: 'runoffCoefficient', same: 0.0005, bands: [0.002, 0.004] },
    { id: 'newUnitsServed', same: 0.5, bands: [15, 50] },
    { id: 'capitalCost', same: 1, bands: [200000, 1000000] },
    { id: 'parkAccessPct', same: 0.0005, bands: [0.05, 0.20] },
    { id: 'waterDemandM3PerDay', same: 0.5, bands: [20, 50], only: 'modelsWater' },
    { id: 'newUnitsInFutureSurge', same: 0.5, bands: [15, 50], only: 'modelsSeaRise' },
    // One parcel of about 140 land parcels: a new mixed-use block adds about
    // 0.2 C to the town average, a cool roof takes off a few hundredths.
    { id: 'surfaceHeatC', same: 0.005, bands: [0.05, 0.15] }
  ];
  var PREDICT_BY_ID = {};
  PREDICT_INDICATORS.forEach(function (p) { PREDICT_BY_ID[p.id] = p; });

  function predictIndicatorsFor(planOrId) {
    var sc = scenarioOf(planOrId);
    return PREDICT_INDICATORS.filter(function (p) { return !p.only || sc[p.only]; });
  }

  function indicatorValue(s, id) {
    if (s.tier1[id] !== undefined) return s.tier1[id];
    return s.tier2[id];
  }

  // direction: 'up' | 'down' | 'about the same'. size: 'none' | 'small' |
  // 'medium' | 'large'. The direction words are stored in saved plans, so
  // they stay English data; the screen translates them.
  function classifyChange(indicatorId, delta) {
    var spec = PREDICT_BY_ID[indicatorId];
    if (!spec || typeof delta !== 'number' || isNaN(delta)) return null;
    var mag = Math.abs(delta);
    if (mag < spec.same) return { direction: 'about the same', size: 'none' };
    return {
      direction: delta > 0 ? 'up' : 'down',
      size: mag < spec.bands[0] ? 'small' : (mag < spec.bands[1] ? 'medium' : 'large')
    };
  }

  // One edit, as data. Staged edits are stored as these and re-applied to
  // the plan as it stands when the student commits, so a memo typed while an
  // edit waits is never lost.
  function applyOp(plan, op) {
    if (!op || !plan) return plan;
    if (op.kind === 'use') return setUse(plan, op.id, op.useId);
    if (op.kind === 'gi') return toggleGreenInfra(plan, op.id);
    if (op.kind === 'cool') return toggleCoolRoof(plan, op.id);
    if (op.kind === 'transit') return toggleTransit(plan, op.id);
    if (op.kind === 'edge') return setEdge(plan, op.a, op.b, op.edgeKind || null);
    return plan;
  }

  // Resolve a prediction against the real model. Nothing here is a score:
  // the record says what was guessed and what happened.
  function resolvePrediction(plan, op, indicatorId, guess, guessSize) {
    var next = applyOp(plan, op);
    var before = scorecard(plan, plan.assumptionSetId);
    var after = scorecard(next, next.assumptionSetId);
    var from = indicatorValue(before, indicatorId), to = indicatorValue(after, indicatorId);
    var c = classifyChange(indicatorId, to - from) || { direction: 'about the same', size: 'none' };
    return {
      next: next,
      record: {
        at: next.editCount || 0, indicator: indicatorId,
        guess: guess, actual: c.direction,
        size: guessSize || '', actualSize: c.size,
        from: from, to: to,
        // Kept for plans and tests that predate the indicator choice.
        fromC: before.tier2.runoffCoefficient, toC: after.tier2.runoffCoefficient
      }
    };
  }

  // ---- Saved plans --------------------------------------------------------
  // The same gate an imported file goes through, plus the two things only a
  // saved plan carries: the prediction log and where the plan came from.
  // Returns null for anything that is not a plan, never throws.
  function restorePlan(raw) {
    var data = raw;
    try { if (typeof raw === 'string') data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || typeof data !== 'object') return null;
    var res = importPlan(data);
    if (!res.ok) return null;
    var out = res.plan;
    if (Array.isArray(data.predictions)) {
      out.predictions = data.predictions.filter(function (p) {
        return p && typeof p === 'object' && typeof p.guess === 'string';
      }).slice(-200).map(function (p) {
        var r = {};
        Object.keys(p).forEach(function (k) {
          if (typeof p[k] === 'string' || typeof p[k] === 'number') r[k] = p[k];
        });
        return r;
      });
    }
    if (data.imported) out.imported = true;
    return out;
  }

  // Stage E: does a plan hold anybody's work (map, overlays, memo, access
  // note, predictions), as against the town as it stands? Keys are sorted,
  // so field order never reads as a change.
  function planHasWork(plan) {
    if (!plan || typeof plan !== 'object') return false;
    var canon = function (v) {
      if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
      if (v && typeof v === 'object') {
        return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
      }
      return JSON.stringify(v === undefined ? null : v);
    };
    var pick = function (p) {
      return canon([p.uses || {}, p.edges || {}, p.greenInfra || {}, p.coolRoofs || {}, p.transit || {},
        p.memo || {}, p.equity || {}, p.predictions || []]);
    };
    return pick(plan) !== pick(basePlan(plan.scenarioId));
  }

  // ---- Missions (grades 6-8 start here) -----------------------------------
  // Staged pieces of the brief, each checked by the model, never by a
  // self-report. Targets scale with the town, so "half the homes" is 600 in
  // Riverbend and 300 in Mesa Hollow.
  var MISSION_IDS = ['m_park', 'm_bond', 'm_runoff', 'm_town', 'm_heat'];

  // Today's homes, under the central estimates, plus the allowance, rounded
  // UP to the half degree so the target never reads tighter than it is.
  var HEAT_TARGET_CACHE = {};
  function heatTarget(planOrId) {
    var sc = scenarioOf(planOrId);
    if (HEAT_TARGET_CACHE[sc.id] === undefined) {
      var today = scorecard(basePlan(sc.id), 'central').tier2.homeSurfaceHeatC;
      HEAT_TARGET_CACHE[sc.id] = Math.ceil((today + HEAT_MISSION_ALLOWANCE_C) * 2) / 2;
    }
    return HEAT_TARGET_CACHE[sc.id];
  }

  function missionTargets(planOrId) {
    var sc = scenarioOf(planOrId);
    var ceiling = sc.runoffCeilingRatio || 1.25;
    return {
      homes: Math.round(sc.targetNewUnits / 2),
      runoff: Math.round((1 + (ceiling - 1) / 2) * 100) / 100,
      park: sc.parkAccessTarget,
      bond: sc.bondDollars,
      heat: heatTarget(sc.id)
    };
  }

  function missionConds(mid, planOrId) {
    var sc = scenarioOf(planOrId), tg = missionTargets(planOrId);
    if (mid === 'm_park') return [{ k: 'park', target: tg.park }];
    if (mid === 'm_bond') return [{ k: 'homes', target: tg.homes }, { k: 'cost', target: tg.bond }];
    if (mid === 'm_runoff') return [{ k: 'homes', target: tg.homes }, { k: 'runoff', target: tg.runoff }];
    if (mid === 'm_town') {
      if (sc.modelsWater) return [{ k: 'homes', target: tg.homes }, { k: 'water', target: sc.aquiferYieldM3PerDay }];
      if (sc.modelsSeaRise) return [{ k: 'homes', target: tg.homes }, { k: 'future', target: 0, set: 'conservative' }];
      return [{ k: 'homes', target: tg.homes }, { k: 'farm', target: sc.farmlandCeilingHa || 15 },
        { k: 'preserve', target: 0 }];
    }
    if (mid === 'm_heat') return [{ k: 'homes', target: tg.homes }, { k: 'heat', target: tg.heat, set: 'central' }];
    return [];
  }

  // setId overrides the plan's own set (stage E: the standard-set check).
  function condValue(cond, plan, setId) {
    var setUsed = setId || plan.assumptionSetId;
    if (cond.k === 'future') return scorecard(plan, cond.set).tier2.newUnitsInFutureSurge;
    if (cond.k === 'heat') return scorecard(plan, cond.set || setUsed).tier2.homeSurfaceHeatC;
    var s = scorecard(plan, setUsed);
    if (cond.k === 'park') return s.tier1.parkAccessPct;
    if (cond.k === 'homes') return s.tier1.newUnitsServed;
    if (cond.k === 'cost') return s.tier2.capitalCost;
    if (cond.k === 'runoff') return s.tier2.runoffRatio;
    if (cond.k === 'water') return s.tier2.waterDemandM3PerDay;
    if (cond.k === 'farm') return s.tier1.farmlandConvertedHa;
    if (cond.k === 'preserve') return s.tier1.preserveConvertedHa;
    return 0;
  }

  // Floors (at least) and ceilings (at most) by kind.
  function condMet(cond, value) {
    if (cond.k === 'park' || cond.k === 'homes') return value >= cond.target - 1e-9;
    return value <= cond.target + 1e-9;
  }

  // Stage E: a mission is judged under the student's set AND the central
  // estimates, so loosening the assumptions cannot pass it. Every condition
  // is one-sided, so passing both is passing the stricter of the two values;
  // a whole-set check, not a per-parameter hybrid, because a mix of
  // parameters from different sets is no published estimate. `value` stays
  // the student's own result. A condition pinned to a set (heat, the 2100
  // reach) is judged on that set alone.
  var STANDARD_SET = 'central';
  function judgeCond(c, plan) {
    var v = condValue(c, plan);
    var ownMet = condMet(c, v);
    var stdV = (c.set || plan.assumptionSetId === STANDARD_SET) ? v : condValue(c, plan, STANDARD_SET);
    var stdMet = condMet(c, stdV);
    return { k: c.k, target: c.target, value: v, met: ownMet && stdMet, ownMet: ownMet,
      standardValue: stdV, standardMet: stdMet, standardOnly: ownMet && !stdMet, set: c.set || null };
  }
  // Stage E2: the full brief follows the same rule. Every required part must be
  // met under the student's set AND the central one (no brief requirement is
  // pinned to a set). standardOnly lists the required parts met only under
  // the student's set; the rows the student sees stay on their own set.
  function briefJudged(plan, ownReport) {
    var own = ownReport || constraintReport(plan, plan.assumptionSetId);
    var std = plan.assumptionSetId === STANDARD_SET ? own : constraintReport(plan, STANDARD_SET);
    var stdRow = {};
    std.rows.forEach(function (r) { stdRow[r.id] = r; });
    var standardOnly = own.rows.filter(function (r) { return r.hard && r.met && stdRow[r.id] && !stdRow[r.id].met; })
      .map(function (r) { return r.id; });
    return { allHardMet: own.allHardMet && std.allHardMet, ownAllHardMet: own.allHardMet,
      standardOnly: standardOnly, standardRows: stdRow };
  }

  // Named misconceptions, diagnosed from the plan. Each id has a message in
  // the render layer. Only ones that explain an UNMET condition are named.
  function diagnoseMission(mid, plan) {
    var conds = missionConds(mid, plan);
    var s = scorecard(plan, plan.assumptionSetId);
    var sc = scenarioOf(plan);
    var served = servedParcels(plan);
    var unmet = {};
    conds.forEach(function (c) { if (!judgeCond(c, plan).met) unmet[c.k] = true; });
    var out = [];
    var base = basePlan(plan.scenarioId);
    var newUnserved = allParcelIds().filter(function (id) {
      return unitsOnParcel(plan, id) > unitsOnParcel(base, id) && !served[id];
    });
    if ((unmet.homes || unmet.park) && newUnserved.length) {
      var nextDoor = newUnserved.some(function (id) {
        return neighbours(id).some(function (n) { return served[n.id]; });
      });
      out.push(nextDoor ? 'road_next_door' : 'unreached_homes');
    }
    if (unmet.park) {
      if (s.tier1.parkAccessPctAsCrowFlies >= sc.parkAccessTarget - 1e-9) out.push('crow_flies');
      var adj = adjacency(plan, false);
      var lonelyPark = allParcelIds().some(function (id) { return plan.uses[id] === 'park' && !adj[id]; });
      if (lonelyPark) out.push('park_off_network');
      if (!allParcelIds().some(function (id) { return plan.uses[id] === 'park'; })) out.push('no_park');
    }
    if (unmet.cost) {
      var ids = s.costLines.map(function (l) { return l.id; });
      if (ids.indexOf('bridge_road') !== -1 || ids.indexOf('bridge_path') !== -1) out.push('bridge_cost');
      if (ids.indexOf('civic') !== -1) out.push('civic_cost');
      if (ids.indexOf('road_local') !== -1 && ids.indexOf('bridge_road') === -1) out.push('road_cost');
    }
    if (unmet.runoff && !Object.keys(plan.greenInfra || {}).length) out.push('hard_surfaces');
    if (unmet.water && s.tier1.farmHa > 0) out.push('thirsty_farms');
    if (unmet.future) {
      var dryToday = allParcelIds().some(function (id) {
        return unitsOnParcel(plan, id) > unitsOnParcel(base, id) && !terrainAt(id, plan).floodplain &&
          inFutureSurge(id, plan, SET_BY_ID.conservative);
      });
      if (dryToday) out.push('dry_today');
    }
    if (unmet.farm || unmet.preserve) out.push('land_taken');
    if (unmet.heat) {
      // The new homes, judged on what the student did to them.
      var newHomes = allParcelIds().filter(function (id) {
        return served[id] && unitsOnParcel(plan, id) > unitsOnParcel(base, id);
      });
      if (newHomes.length && !newHomes.some(function (id) { return (plan.coolRoofs || {})[id]; })) out.push('heat_dark_roofs');
      if (newHomes.length && !newHomes.some(function (id) { return plan.greenInfra[id]; })) out.push('heat_no_shade');
    }
    return out;
  }

  function missionStatus(mid, plan) {
    var conds = missionConds(mid, plan).map(function (c) { return judgeCond(c, plan); });
    var met = conds.length > 0 && conds.every(function (c) { return c.met; });
    // Met under the student's own set, short only under the central one.
    var standardOnly = !met && conds.every(function (c) { return c.met || c.standardOnly; });
    return { id: mid, met: met, conds: conds, standardOnly: standardOnly,
      misconceptions: met ? [] : diagnoseMission(mid, plan) };
  }

  // ---- W5 (2026-11-04): missions inside the 3D town --------------------
  // The lens each mission is about. The strip OFFERS it as a button
  // (DECISIONS #8); nothing switches by itself. A mission with no lens of
  // its own (the bond, the aquifer) gets a readout instead.
  function missionLens(mid, planOrId) {
    var sc = scenarioOf(planOrId);
    if (mid === 'm_park') return { lens: 'park', readout: null };
    if (mid === 'm_bond') return { lens: null, readout: 'cost' };
    if (mid === 'm_runoff') return { lens: 'rain', readout: null };
    if (mid === 'm_heat') return { lens: 'heat', readout: null };
    if (mid === 'm_town') {
      if (sc.modelsWater) return { lens: null, readout: 'water' };
      if (sc.modelsSeaRise) return { lens: 'flood', readout: null };
      return { lens: 'use', readout: null };
    }
    return { lens: null, readout: null };
  }
  // The parcels a mission's FLOOR row already counts, under the plan's own
  // set: homes with a park in walking reach (the park row, the same test as
  // parkAccessPct), or parcels whose new homes a road reaches (the homes
  // row, the same test as newUnitsServed). Only what the scorecard already
  // counts: never open land, never a place to build next, and nothing for a
  // ceiling row (marking those would point at what to fix).
  function missionMarks(plan, mid) {
    var ks = {};
    missionConds(mid, plan).forEach(function (c) { ks[c.k] = true; });
    var kind = ks.park ? 'park' : (ks.homes ? 'homes' : null);
    if (!kind) return { kind: null, ids: [] };
    var s = scorecard(plan, plan.assumptionSetId), served = servedParcels(plan);
    var base = kind === 'homes' ? basePlan(plan.scenarioId) : null;
    var ids = allParcelIds().filter(function (id) {
      var u = unitsOnParcel(plan, id);
      if (!(u > 0) || !served[id]) return false;
      if (kind === 'park') { var dd = s.parkDistance[id]; return dd !== undefined && dd <= s.parkHopLimit; }
      return u > unitsOnParcel(base, id);
    });
    return { kind: kind, ids: ids };
  }
  // A pass is celebrated only when it COUNTS: met under the student's set
  // and the central one (st.met), on the student's own plan, and not after
  // the strategy was revealed. Only checkMission asks, so never before Check.
  function missionCelebrates(st, rec, plan) {
    return !!(st && st.met === true && !st.standardOnly && plan && !plan.imported && !(rec && rec.revealed));
  }
  // ---- W6 (2026-11-04): the full brief gets a strip too (the 9-12
  // default). Each required part and target, judged like the Missions box
  // judges a mission: met only under the student's set AND the central one.
  function briefRows(plan, ownReport) {
    var own = ownReport || constraintReport(plan, plan.assumptionSetId);
    var bj = briefJudged(plan, own);
    return own.rows.map(function (r) {
      var std = bj.standardRows[r.id];
      var stdMet = std ? !!std.met : !!r.met;
      return { id: r.id, hard: !!r.hard, label: r.label, unit: r.unit, floor: !!r.floor,
        actual: r.actual, target: r.target, ownMet: !!r.met, met: !!r.met && stdMet,
        standardOnly: !!r.met && !stdMet, standardActual: std ? std.actual : r.actual };
    });
  }
  // The lens (or readout) that shows each requirement. A button, never a switch.
  function briefLens(reqId) {
    switch (reqId) {
      case 'req_flood': case 'req_future_flood': return { lens: 'flood', readout: null };
      case 'req_runoff': return { lens: 'rain', readout: null };
      case 'req_park': return { lens: 'park', readout: null };
      case 'req_cost': return { lens: null, readout: 'cost' };
      case 'req_water': return { lens: null, readout: 'water' };
      case 'req_units': case 'req_farm_max': case 'req_farm_min': case 'req_preserve': return { lens: 'use', readout: null };
      default: return { lens: null, readout: null };
    }
  }
  // The same gate as a mission pass: only from Check, only met under both
  // sets, only on the student's own plan.
  function briefCelebrates(bj, plan) {
    return !!(bj && bj.allHardMet === true && plan && !plan.imported);
  }
  // Every cue and celebration the panel shows, in order: the test seam.
  var CITY_CELEBRATIONS = [];
  // Fireworks over the town: three bursts, one instanced batch.
  var FW_MS = 2200, FW_BURSTS = 3, FW_PER = 32, FW_LIFE = 1.3, FW_GAP = 0.45;
  var FW_COLOURS = ['#f97316', '#facc15', '#38bdf8', '#f472b6', '#a3e635'];
  // W6: the bursts grow with what the camera frames, so they read at the
  // default zoom (the town frame is at least 5 parcels wide): 1.3x there.
  function fwScale(frame) {
    var hx = frame && frame.hx ? Math.max(frame.hx, frame.hz || 0) : 2.5;
    return Math.max(1.3, Math.min(2.6, 1.3 * hx / 2.5));
  }
  // W6: the land-use codes the contrast scene floats over each parcel, one
  // cell each in a single atlas texture (one draw call for every code).
  var CODE_ATLAS_IDS = USES.map(function (u) { return u.id; });
  // Mission cue tones: quiet, and never the only signal.
  var CUE_GAIN = 0.08;

  // The worked example for the first mission is COMPUTED from the town,
  // never authored: greedily add the park that helps most until the target
  // is met, nothing helps any more, or three parks are in. Candidates are
  // open land a road already reaches, or open land beside it joined by one
  // new footpath (`via`), so the example never takes a home.
  var PARK_EXAMPLE_CACHE = {};
  function parkExample(scenarioId) {
    var sc = scenarioOf(scenarioId);
    if (PARK_EXAMPLE_CACHE[sc.id]) return PARK_EXAMPLE_CACHE[sc.id];
    var plan = basePlan(sc.id);
    var steps = [];
    var startPct = scorecard(plan, 'central').tier1.parkAccessPct;
    var current = startPct;
    for (var round = 0; round < 3; round++) {
      var served = servedParcels(plan);
      var best = null;
      allParcelIds().forEach(function (id) {
        var use = plan.uses[id];
        if (use !== 'field' && use !== 'farm') return;
        var trials = [];
        if (served[id]) trials.push({ via: null, plan: setUse(plan, id, 'park') });
        else {
          neighbours(id).forEach(function (n) {
            if (served[n.id] && !isWater(n.id, plan)) {
              trials.push({ via: n.id, plan: setEdge(setUse(plan, id, 'park'), id, n.id, 'path') });
            }
          });
        }
        trials.forEach(function (tr) {
          var pct = scorecard(tr.plan, 'central').tier1.parkAccessPct;
          // A park reached directly beats one that needs a path, at a tie.
          if (!best || pct > best.pct + 1e-9 || (Math.abs(pct - best.pct) <= 1e-9 && best.via && !tr.via)) {
            best = { id: id, via: tr.via, pct: pct, plan: tr.plan };
          }
        });
      });
      if (!best || best.pct <= current + 1e-9) break;
      steps.push({ id: best.id, via: best.via, pct: best.pct, wasUse: plan.uses[best.id] });
      plan = best.plan;
      current = best.pct;
      if (best.pct >= sc.parkAccessTarget - 1e-9) break;
    }
    var out = { startPct: startPct, steps: steps,
      reaches: steps.length > 0 && steps[steps.length - 1].pct >= sc.parkAccessTarget - 1e-9,
      hopLimit: Math.floor(sc.parkWalkMinutes / MIN_PER_HOP) };
    PARK_EXAMPLE_CACHE[sc.id] = out;
    return out;
  }

  // For the second mission's partly worked example: open parcels a road
  // already enters, outside the flood zone. Building there costs no road.
  function servedOpenParcels(plan) {
    var served = servedParcels(plan);
    return allParcelIds().filter(function (id) {
      var t = terrainAt(id, plan);
      return served[id] && !t.floodplain && plan.uses[id] === 'field' &&
        !inFutureSurge(id, plan, SET_BY_ID.conservative);
    });
  }

  // ---- The memo, checked for evidence without reading the prose -----------
  function memoReadiness(plan, opts) {
    var memo = plan.memo || {};
    var words = String(memo.tradeoff || '').trim().split(/\s+/).filter(Boolean).length;
    var binding = normaliseBinding(memo.bindingConstraint, plan.scenarioId);
    var reqIds = scenarioOf(plan).requirements.map(function (r) { return r.id; });
    var evidence = Array.isArray(memo.evidence) ? memo.evidence : [];
    var missing = [];
    if (reqIds.indexOf(binding) === -1) missing.push('binding');
    if (words < 12) missing.push('tradeoff');
    if (!evidence.length) missing.push('evidence');
    if (opts && opts.hearing) {
      var hr = hearingReadiness(plan);
      missing = missing.concat(hr.missing);
      return { ok: missing.length === 0, missing: missing, words: words, hearing: hr };
    }
    return { ok: missing.length === 0, missing: missing, words: words };
  }

  function wordCount(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

  function stakeholderById(id, planOrId) {
    var list = scenarioOf(planOrId).stakeholders || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // The hearing, checked without reading the prose: an objection chosen from
  // a real stakeholder, stated in the student's words, answered, and the
  // answer backed by at least one number that stakeholder actually watches.
  var COUNTER_MIN_WORDS = 10, REBUTTAL_MIN_WORDS = 12;
  function hearingReadiness(plan) {
    var memo = plan.memo || {};
    var sh = stakeholderById(memo.stakeholder, plan);
    var cited = Array.isArray(memo.counterEvidence) ? memo.counterEvidence : [];
    var missing = [];
    if (!sh) missing.push('stakeholder');
    if (wordCount(memo.counter) < COUNTER_MIN_WORDS) missing.push('counter');
    if (wordCount(memo.rebuttal) < REBUTTAL_MIN_WORDS) missing.push('rebuttal');
    if (!cited.length) missing.push('counterEvidence');
    else if (sh && !cited.some(function (id) { return sh.watches.indexOf(id) !== -1; })) missing.push('relevance');
    return { ok: missing.length === 0, missing: missing,
      counterWords: wordCount(memo.counter), rebuttalWords: wordCount(memo.rebuttal) };
  }

  // Grades 9-12 get the hearing by default. A teacher setting wins, then the
  // learner's own choice.
  function hearingOn(gradeBand, learnerChoice, teacherSetting) {
    if (teacherSetting === 'on') return true;
    if (teacherSetting === 'off') return false;
    if (learnerChoice === true || learnerChoice === false) return learnerChoice;
    return gradeBand === 'g912';
  }

  // ---- The "Start here" learning path (stage C) ---------------------------
  // An ordered short list per band, ticked ONLY from progress the tool
  // already keeps: mission records (or their flat missionsDone flags, which
  // the autosave whitelist can carry), memo/hearing submissions, XP ids, and
  // the plan itself. Nothing here awards anything.
  //   missions path (grades 6-8 and below): worked example, then the five
  //     missions in their fixed order.
  //   brief path (grades 9-12): meet the brief, Assumption Lab, memo,
  //     hearing (left out when a teacher has switched it off), access gaps.
  // A teacher's level setting picks the path; the learner's own toggle does not.
  function missionDoneIn(d, town, mid) {
    var ms = (d && d.missions && d.missions[town]) || {};
    return !!((ms[mid] && ms[mid].done) || (d && d.missionsDone && d.missionsDone[town + ':' + mid]));
  }
  function learningPath(gradeBand, teacherRaw, d, plan) {
    var teacher = teacherSettings(teacherRaw);
    var town = plan.scenarioId;
    var dd = d || {};
    var kind = startingLevel(gradeBand, '', teacher.level) === 'missions' ? 'missions' : 'brief';
    var steps;
    if (kind === 'missions') {
      steps = [{ id: 'example', done: !!((dd.exampleRead && dd.exampleRead[town]) || missionDoneIn(dd, town, 'm_park')) }]
        .concat(MISSION_IDS.map(function (mid) { return { id: mid, done: missionDoneIn(dd, town, mid) }; }));
    } else {
      var paid = dd.xpAwarded || {};
      steps = [
        // W7: a passing Check ticks it (or brief XP paid earlier), not a plan
        // that only meets it: like the XP, the tick waits for Check.
        { id: 'brief', done: !!(paid[xpId('brief', town)] || (dd.briefPassed && dd.briefPassed[town])) },
        { id: 'lab', done: !!(plan.ranAssumptionLab || paid[xpId('lab', town)]) },
        { id: 'memo', done: !!(dd.memoSubmitted && dd.memoSubmitted[town]) }
      ];
      if (teacher.hearing !== 'off') steps.push({ id: 'hearing', done: !!(dd.hearingSubmitted && dd.hearingSubmitted[town]) });
      steps.push({ id: 'access', done: !!(plan.equity && plan.equity.priority) });
    }
    var next = null;
    steps.forEach(function (s) { if (!next && !s.done) next = s.id; });
    return { kind: kind, steps: steps, next: next,
      doneCount: steps.filter(function (s) { return s.done; }).length };
  }

  // ---- Access gaps (the equity view). MEASURED, and deliberately not a
  // score: for every home a road reaches, which of the three things it lacks
  // within the walk thresholds. Counts of homes, never a ranking of places.
  var EQUITY_KINDS = ['park', 'transit', 'clinic'];
  function accessGaps(plan) {
    var s = scorecard(plan, plan.assumptionSetId);
    var sc = scenarioOf(plan);
    var served = servedParcels(plan);
    var rows = [];
    var lack = { park: 0, transit: 0, clinic: 0 };
    var byMissing = [0, 0, 0, 0];
    var homes = 0;
    var within = function (dist, id, limit) { return dist[id] !== undefined && dist[id] <= limit; };
    allParcelIds().forEach(function (id) {
      var u = unitsOnParcel(plan, id);
      if (u <= 0 || !served[id]) return;
      var has = {
        park: within(s.parkDistance, id, s.parkHopLimit),
        transit: within(s.transitDistance, id, s.transitHopLimit),
        clinic: within(s.civicDistance, id, s.civicHopLimit)
      };
      var missing = EQUITY_KINDS.filter(function (k) { return !has[k]; });
      missing.forEach(function (k) { lack[k] += u; });
      byMissing[missing.length] += u;
      homes += u;
      rows.push({ id: id, units: u, missing: missing });
    });
    return { rows: rows, homes: homes, lack: lack, byMissing: byMissing,
      lackAny: homes - byMissing[0], lackAll: byMissing[3],
      minutes: { park: sc.parkWalkMinutes, transit: TRANSIT_WALK_MINUTES, clinic: sc.civicWalkMinutes } };
  }

  // ---- XP rules -----------------------------------------------------------
  // Modest, once per distinct item, for VERIFIED milestones only. Never for
  // a prediction coming out right (predictions are never scored), never for
  // anything in the contested tier (it has no numbers to verify), and never
  // for a plan loaded from a file rather than built here.
  var XP_POINTS = { brief: 20, lab: 10, memo: 15, mission: 10, hearing: 10 };
  function xpId(kind, scenarioId, extra) {
    return 'citylab_' + kind + '_' + scenarioOf(scenarioId).id + (extra ? '_' + extra : '');
  }
  function briefXpEligible(plan) {
    if (!plan || plan.imported) return false;
    if (!planChanges(plan).length) return false;
    return briefJudged(plan).allHardMet;
  }

  // ---- Teacher settings ---------------------------------------------------
  // Plain data in toolData._cityLab.teacher, so they travel with the project
  // to every student who opens it. Anything unrecognised is dropped.
  function teacherSettings(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var budget = typeof r.moveBudget === 'number' && r.moveBudget > 0 ? Math.min(999, Math.round(r.moveBudget)) : null;
    return {
      lockTown: own(SCENARIOS, r.lockTown) ? r.lockTown : '',
      moveBudget: budget,
      lockSets: !!r.lockSets,
      setA: own(SET_BY_ID, r.setA) ? r.setA : 'conservative',
      setB: own(SET_BY_ID, r.setB) ? r.setB : 'optimistic',
      scoreSet: own(SET_BY_ID, r.scoreSet) ? r.scoreSet : '',
      predictEvery: !!r.predictEvery,
      allowReveal: r.allowReveal !== false,
      level: (r.level === 'missions' || r.level === 'brief') ? r.level : '',
      hearing: (r.hearing === 'on' || r.hearing === 'off') ? r.hearing : '',
      // Stage C: hide the "Start here" path (it is on unless switched off).
      pathOff: !!r.pathOff,
      // W3: the K-5 picture palette and short scorecard: '' follows the
      // grade band, 'on' or 'off' for everyone.
      simple: (r.simple === 'on' || r.simple === 'off') ? r.simple : ''
    };
  }

  // Grades 6-8 and below start on missions, 9-12 on the open brief. The
  // learner's own choice wins unless the teacher fixed it.
  function startingLevel(gradeBand, learnerChoice, teacherLevel) {
    if (teacherLevel === 'missions' || teacherLevel === 'brief') return teacherLevel;
    if (learnerChoice === 'missions' || learnerChoice === 'brief') return learnerChoice;
    if (gradeBand === 'k2' || gradeBand === 'g35' || gradeBand === 'g68') return 'missions';
    return 'brief';
  }

  // ---- The described map --------------------------------------------------
  // A row-by-row text twin of whatever the map is showing, for anyone who
  // cannot see it. Runs of identical parcels are merged ("A to D open
  // field"), so a row reads as a sentence rather than twelve items.
  // Heat bands, in degrees C above shaded ground. The map colours use the
  // same edges, so the words and the colours always agree.
  var HEAT_BANDS = [2, 10, 20, 30];
  function heatBand(v) {
    if (v === null || v === undefined) return -1;
    for (var i = 0; i < HEAT_BANDS.length; i++) if (v < HEAT_BANDS[i]) return i;
    return HEAT_BANDS.length;
  }
  function heatBandLabel(band) {
    switch (band) {
      case 0: return __alloT('stem.citylab.heat_band_0', 'no hard surface to speak of');
      case 1: return __alloT('stem.citylab.heat_band_1', 'mild');
      case 2: return __alloT('stem.citylab.heat_band_2', 'warm');
      case 3: return __alloT('stem.citylab.heat_band_3', 'hot');
      default: return __alloT('stem.citylab.heat_band_4', 'very hot');
    }
  }
  // One whole phrase per combination, so no list is glued together.
  function gapsPhrase(missing) {
    switch ((missing || []).join(',')) {
      case '': return __alloT('stem.citylab.gaps_none', 'homes with all three nearby');
      case 'park': return __alloT('stem.citylab.gaps_p', 'homes with no park nearby');
      case 'transit': return __alloT('stem.citylab.gaps_t', 'homes with no bus stop nearby');
      case 'clinic': return __alloT('stem.citylab.gaps_c', 'homes with no school or clinic nearby');
      case 'park,transit': return __alloT('stem.citylab.gaps_pt', 'homes with no park or bus stop nearby');
      case 'park,clinic': return __alloT('stem.citylab.gaps_pc', 'homes with no park or school or clinic nearby');
      case 'transit,clinic': return __alloT('stem.citylab.gaps_tc', 'homes with no bus stop or school or clinic nearby');
      default: return __alloT('stem.citylab.gaps_ptc', 'homes with none of the three nearby');
    }
  }
  function gapKindName(k) {
    if (k === 'park') return __alloT('stem.citylab.gap_name_park', 'Park');
    if (k === 'transit') return __alloT('stem.citylab.gap_name_transit', 'Bus stop');
    return __alloT('stem.citylab.gap_name_clinic', 'School or clinic');
  }

  function colRuns(cols) {
    var out = [], i = 0;
    cols = cols.slice().sort(function (a, b) { return a - b; });
    while (i < cols.length) {
      var j = i;
      while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++;
      out.push(i === j ? COLS.charAt(cols[i])
        : fmt(__alloT('stem.citylab.desc_cols_many', '{from} to {to}'), { from: COLS.charAt(cols[i]), to: COLS.charAt(cols[j]) }));
      i = j + 1;
    }
    return out.join(', ');
  }

  function describeMapRows(plan, view) {
    var s = scorecard(plan, plan.assumptionSetId);
    var sc = scenarioOf(plan);
    var served = servedParcels(plan);
    var adjRoad = adjacency(plan, true);
    var gaps = {};
    if (view === 'access') accessGaps(plan).rows.forEach(function (g) { gaps[g.id] = g; });
    var lensRow = (view === 'park' || view === 'transit' || view === 'rain' || view === 'flood') ? lensCells(plan, plan.assumptionSetId, view) : null;
    var out = [];
    for (var r = 1; r <= N_ROWS; r++) {
      var tokens = [], roads = [], stops = [], flood = [], homes = 0, unreached = 0;
      var lo = Infinity, hi = -Infinity, hiCol = 0, hot = -1, hotCol = 0;
      for (var c = 0; c < N_COLS; c++) {
        var id = pid(c, r), use = plan.uses[id], units = unitsOnParcel(plan, id);
        var terr = terrainAt(id, plan), what;
        if (view === 'heat') {
          var hv = s.surfaceHeat[id];
          what = hv === undefined ? useLabel(use, plan) : heatBandLabel(heatBand(hv));
          if (hv !== undefined && hv > hot) { hot = hv; hotCol = c; }
        } else if (view === 'access') {
          if (gaps[id]) {
            what = gapsPhrase(gaps[id].missing);
          } else if (units > 0) what = __alloT('stem.citylab.desc_homes_unreached', 'homes no road reaches');
          else what = __alloT('stem.citylab.desc_no_homes', 'no homes');
        } else {
          what = useLabel(use, plan);
        }
        tokens.push(what);
        if (units > 0) { if (served[id]) homes += units; else unreached += units; }
        if (adjRoad[id] && adjRoad[id].length) roads.push(c);
        if (plan.transit && plan.transit[id]) stops.push(c);
        if (terr.floodplain) flood.push(c);
        if (terr.elevationM < lo) lo = terr.elevationM;
        if (terr.elevationM > hi) { hi = terr.elevationM; hiCol = c; }
      }
      var runs = [], k = 0;
      while (k < tokens.length) {
        var m = k;
        while (m + 1 < tokens.length && tokens[m + 1] === tokens[k]) m++;
        runs.push(k === m
          ? fmt(__alloT('stem.citylab.desc_run_one', '{col} {what}'), { col: COLS.charAt(k), what: tokens[k] })
          : fmt(__alloT('stem.citylab.desc_run_many', '{from} to {to} {what}'), { from: COLS.charAt(k), to: COLS.charAt(m), what: tokens[k] }));
        k = m + 1;
      }
      var parts = [fmt(__alloT('stem.citylab.desc_row', 'Row {row}: {runs}.'), { row: r, runs: runs.join('; ') })];
      if (view === 'elevation') {
        parts.push(fmt(__alloT('stem.citylab.desc_row_height', 'Ground from {lo} m to {hi} m, highest at {col}.'), { lo: lo, hi: hi, col: COLS.charAt(hiCol) }));
      } else if (view === 'heat') {
        if (hot > 0) parts.push(fmt(__alloT('stem.citylab.desc_row_hot', 'Hottest at {col}, about {c} degrees above shaded ground.'), { col: COLS.charAt(hotCol), c: Math.round(hot) }));
      } else if (view !== 'access') {
        if (homes) parts.push(fmt(__alloT('stem.citylab.desc_row_homes', 'Homes a road reaches: {n}.'), { n: homes }));
        if (unreached) parts.push(fmt(__alloT('stem.citylab.desc_row_unreached', 'Homes no road reaches: {n}.'), { n: unreached }));
        if (roads.length) parts.push(fmt(__alloT('stem.citylab.desc_row_roads', 'A road runs into {cols}.'), { cols: colRuns(roads) }));
        if (stops.length) parts.push(fmt(__alloT('stem.citylab.desc_row_stops', 'Bus stop at {cols}.'), { cols: colRuns(stops) }));
        if (flood.length) parts.push(fmt(__alloT('stem.citylab.desc_row_flood', 'Inside {zone}: {cols}.'), { zone: sc.floodLabel, cols: colRuns(flood) }));
        // W4: the lens's own row facts, from the same lensCells the boards draw.
        if (lensRow) {
          var inCols = [], futCols = [], cLo = Infinity, cHi = -Infinity;
          for (var c2 = 0; c2 < N_COLS; c2++) {
            var lc2 = lensRow.cells[pid(c2, r)];
            if (lc2.cls === 'in') inCols.push(c2);
            if (lc2.cls === 'future') futCols.push(c2);
            if (view === 'rain') { cLo = Math.min(cLo, lc2.split); cHi = Math.max(cHi, lc2.split); }
          }
          if (view === 'park') parts.push(inCols.length ? fmt(__alloT('stem.citylab.desc_row_park_in', 'Within a 5-minute walk of a park: {cols}.'), { cols: colRuns(inCols) })
            : __alloT('stem.citylab.desc_row_park_none', 'Nothing in this row is within a 5-minute walk of a park.'));
          if (view === 'transit') parts.push(inCols.length ? fmt(__alloT('stem.citylab.desc_row_bus_in', 'Within a 5-minute walk of a bus stop: {cols}.'), { cols: colRuns(inCols) })
            : __alloT('stem.citylab.desc_row_bus_none', 'Nothing in this row is within a 5-minute walk of a bus stop.'));
          if (view === 'rain') parts.push(fmt(__alloT('stem.citylab.desc_row_rain', 'Runoff coefficient from {lo} to {hi}.'), { lo: cLo.toFixed(2), hi: cHi.toFixed(2) }));
          if (view === 'flood' && futCols.length) parts.push(fmt(__alloT('stem.citylab.desc_row_future', 'Dry today, inside the 2100 reach: {cols}.'), { cols: colRuns(futCols) }));
        }
      }
      out.push(parts.join(' '));
    }
    return out;
  }

  // ---- Sonification -------------------------------------------------------
  // One tone per requirement, in the order the brief lists them. Pitch is
  // the slack: an octave above 440 Hz is plenty of room, an octave below is
  // as far past the limit as the bar shows. Met is a smooth sine, not met a
  // buzzier square, so pass and fail never rest on pitch alone.
  function sonifyRequirements(report) {
    return report.rows.map(function (row) {
      var f = headroomFraction(row);
      if (f === null) f = row.met ? 1 : -1;
      f = Math.max(-1, Math.min(1, f));
      return { id: row.id, met: !!row.met, slack: f, freq: Math.round(220 * Math.pow(2, 1 + f)), wave: row.met ? 'sine' : 'square' };
    });
  }
  // A row of numbers (height or surface heat) as rising and falling pitch,
  // lowest value 220 Hz to highest 880 Hz. A missing value is a rest.
  function sonifyRow(values) {
    var finite = values.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    var lo = finite.length ? Math.min.apply(null, finite) : 0;
    var hi = finite.length ? Math.max.apply(null, finite) : 0;
    return values.map(function (v) {
      if (typeof v !== 'number' || !isFinite(v)) return { freq: null, wave: 'sine' };
      var t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
      return { freq: Math.round(220 * Math.pow(2, 2 * t)), wave: 'sine' };
    });
  }

  // ===================================================================
  // SECTION 3b - THE CLASS VIEW
  //
  // A teacher collects exported plan files and reads them together. All of
  // it is local: nothing is uploaded, and the aggregation below is a pure
  // function of the plans handed to it.
  //
  // Two rules the spec in the design doc got wrong, corrected here:
  //
  //   1. Free text is never aggregated and never exported. Student writing
  //      can contain names. The MEMO is not read; only whether one exists
  //      and which binding constraint was chosen, and that is a structured
  //      select rather than prose.
  //   2. The doc asked for "how many named a robust conclusion in the memo".
  //      That cannot be detected from free text honestly, so it is not
  //      claimed. What IS reported is who ran the Assumption Lab at all,
  //      which is a fact rather than an inference.
  // ===================================================================

  var MIN_CLASS_N = 3;   // signals below this are withheld, and n is always shown

  function classSummary(entries, scenarioId, assumptionSetId) {
    var sc = scenarioOf(scenarioId);
    var mine = [], otherTown = 0;
    (entries || []).forEach(function (e) {
      if (!e || !e.plan) return;
      if (e.plan.scenarioId !== sc.id) { otherTown++; return; }
      mine.push(e);
    });

    var n = mine.length;
    var perRequirement = sc.requirements.map(function (req) {
      return { id: req.id, label: req.label, hard: !!req.hard, met: 0, missed: 0 };
    });
    var reqIndex = {};
    perRequirement.forEach(function (r, i) { reqIndex[r.id] = i; });

    var ranLab = 0, memoDone = 0, usedChallenge = 0;
    var bindingChoice = {};
    // Stage C: heat, transit and the hearing, MEASURED facts only. Surface
    // heat itself is modelled, so it is not reported: what is counted is what
    // each plan did about it (cool roofs, green infrastructure on new homes).
    // The hearing is counted from structured fields and word counts; its
    // prose is never read or exported.
    // hearing = complete as the tool checks it (a stakeholder, the objection
    // and answer at length, and a number that stakeholder watches).
    var heatTransit = { heatAction: 0, newHomesCovered: 0, anyStop: 0, allStop: 0, hearingStarted: 0, hearing: 0 };
    var stakeholderChoice = {};
    var tradeOffs = { farmland: 0, preserve: 0, parkAccess: 0, overBudget: 0, floodplain: 0 };
    var rows = [];

    mine.forEach(function (e) {
      var rep = constraintReport(e.plan, assumptionSetId);
      var s = rep.scorecard;
      rep.rows.forEach(function (r) {
        var idx = reqIndex[r.id];
        if (idx === undefined) return;
        if (r.met) perRequirement[idx].met++; else perRequirement[idx].missed++;
      });
      if (e.plan.ranAssumptionLab) ranLab++;
      if (e.plan.memo && e.plan.memo.bindingConstraint && e.plan.memo.tradeoff) memoDone++;
      if (typeof e.plan.moveBudget === 'number') usedChallenge++;
      if (e.plan.memo && e.plan.memo.bindingConstraint) {
        // Old memos stored the English label, new ones the id: count them together.
        var k = normaliseBinding(e.plan.memo.bindingConstraint, sc.id);
        bindingChoice[k] = (bindingChoice[k] || 0) + 1;
      }
      // What each plan actually gave up. These are the discussion starter.
      if (s.tier1.farmlandConvertedHa > 0) tradeOffs.farmland++;
      if (s.tier1.preserveConvertedHa > 0) tradeOffs.preserve++;
      if (s.tier1.newUnitsInFloodplain > 0) tradeOffs.floodplain++;
      if (s.tier2.capitalCost > sc.bondDollars) tradeOffs.overBudget++;
      if (s.tier1.parkAccessPct < sc.parkAccessTarget - 1e-9) tradeOffs.parkAccess++;

      var ht = planHeatTransitHearing(e.plan, s);
      if (ht.coolRoofParcels + ht.greenInfraParcels > 0) heatTransit.heatAction++;
      if (ht.newHomeParcels > 0 && ht.newHomesCovered === ht.newHomeParcels) heatTransit.newHomesCovered++;
      if (ht.busStops > 0) heatTransit.anyStop++;
      if (ht.busStops > 0 && s.tier1.totalUnitsServed > 0 && s.tier1.transitAccessPct >= 1 - 1e-9) heatTransit.allStop++;
      if (ht.hearingStakeholder) heatTransit.hearingStarted++;
      if (ht.hearingPresent) heatTransit.hearing++;
      if (ht.hearingStakeholder) stakeholderChoice[ht.hearingStakeholder] = (stakeholderChoice[ht.hearingStakeholder] || 0) + 1;

      rows.push({
        coolRoofParcels: ht.coolRoofParcels,
        greenInfraParcels: ht.greenInfraParcels,
        newHomeParcels: ht.newHomeParcels,
        newHomesCovered: ht.newHomesCovered,
        busStops: ht.busStops,
        transitAccessPct: s.tier1.transitAccessPct,
        hearingPresent: ht.hearingPresent,
        hearingStakeholder: ht.hearingStakeholder,
        hearingCitesTheirNumber: ht.hearingCitesTheirNumber,
        code: e.code,
        hardMet: rep.hardMet, hardTotal: rep.hardTotal,
        softMet: rep.softMet, softTotal: rep.softTotal,
        newUnits: s.tier1.newUnitsServed,
        farmlandConvertedHa: s.tier1.farmlandConvertedHa,
        preserveConvertedHa: s.tier1.preserveConvertedHa,
        newUnitsInFloodplain: s.tier1.newUnitsInFloodplain,
        parkAccessPct: s.tier1.parkAccessPct,
        capitalCost: s.tier2.capitalCost,
        ranAssumptionLab: !!e.plan.ranAssumptionLab,
        memoPresent: !!(e.plan.memo && e.plan.memo.bindingConstraint && e.plan.memo.tradeoff),
        moveBudget: typeof e.plan.moveBudget === 'number' ? e.plan.moveBudget : null,
        requirements: rep.rows.map(function (r) { return { id: r.id, met: r.met }; })
      });
    });

    return {
      scenarioId: sc.id, town: sc.town, n: n, otherTown: otherTown,
      enoughToShowSignals: n >= MIN_CLASS_N, minN: MIN_CLASS_N,
      perRequirement: perRequirement,
      tradeOffs: tradeOffs,
      ranLab: ranLab, memoDone: memoDone, usedChallenge: usedChallenge,
      bindingChoice: bindingChoice,
      heatTransit: heatTransit, stakeholderChoice: stakeholderChoice,
      rows: rows
    };
  }

  // One plan's heat, transit and hearing facts, all measured or structured.
  // `s` is that plan's scorecard (any set: none of these move with one).
  function planHeatTransitHearing(plan, s) {
    var base = basePlan(plan.scenarioId);
    var served = servedParcels(plan);
    var roofs = 0, gi = 0, newHomes = 0, covered = 0;
    allParcelIds().forEach(function (id) {
      var use = USE_BY_ID[plan.uses[id]];
      var roof = !!(plan.coolRoofs && plan.coolRoofs[id] && use && canCoolRoof(use.id));
      var green = !!(plan.greenInfra && plan.greenInfra[id]);
      if (roof) roofs++;
      if (green) gi++;
      if (served[id] && unitsOnParcel(plan, id) > unitsOnParcel(base, id)) {
        newHomes++;
        if (roof || green) covered++;
      }
    });
    var memo = plan.memo || {};
    var hr = hearingReadiness(plan);
    var sh = stakeholderById(memo.stakeholder, plan);
    var cited = Array.isArray(memo.counterEvidence) ? memo.counterEvidence : [];
    return {
      coolRoofParcels: roofs, greenInfraParcels: gi,
      newHomeParcels: newHomes, newHomesCovered: covered,
      busStops: (s || scorecard(plan, plan.assumptionSetId)).transitStops.length,
      hearingPresent: hr.ok,
      hearingStakeholder: sh ? sh.id : '',
      hearingCitesTheirNumber: !!(sh && cited.some(function (id) { return sh.watches.indexOf(id) !== -1; }))
    };
  }

  // One row per plan. Structured fields only; no free text ever leaves here.
  function classCsv(entries, scenarioId, assumptionSetId) {
    var summary = classSummary(entries, scenarioId, assumptionSetId);
    var sc = scenarioOf(scenarioId);
    var reqIds = sc.requirements.map(function (r) { return r.id; });
    var header = ['code', 'town', 'hard_met', 'hard_total', 'soft_met', 'soft_total',
      'new_homes', 'farmland_converted_ha', 'preserve_converted_ha', 'homes_in_floodplain',
      'park_access_pct', 'capital_cost', 'assumption_lab_run', 'memo_present', 'move_budget',
      // Stage C, appended so older spreadsheets keep their column letters.
      'cool_roof_parcels', 'green_infra_parcels', 'new_home_parcels', 'new_home_parcels_cooled',
      'bus_stops_reached', 'transit_access_pct', 'hearing_present', 'hearing_stakeholder', 'hearing_cites_their_number']
      .concat(reqIds);

    function cell(v) {
      var t = String(v == null ? '' : v);
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }

    var lines = [header.join(',')];
    summary.rows.forEach(function (r) {
      var byId = {};
      r.requirements.forEach(function (x) { byId[x.id] = x.met ? 'met' : 'missed'; });
      lines.push([
        r.code, sc.town, r.hardMet, r.hardTotal, r.softMet, r.softTotal,
        r.newUnits, r.farmlandConvertedHa, r.preserveConvertedHa, r.newUnitsInFloodplain,
        (r.parkAccessPct * 100).toFixed(0), Math.round(r.capitalCost),
        r.ranAssumptionLab ? 'yes' : 'no', r.memoPresent ? 'yes' : 'no',
        r.moveBudget == null ? '' : r.moveBudget,
        r.coolRoofParcels, r.greenInfraParcels, r.newHomeParcels, r.newHomesCovered,
        r.busStops, (r.transitAccessPct * 100).toFixed(0),
        r.hearingPresent ? 'yes' : 'no', r.hearingStakeholder, r.hearingCitesTheirNumber ? 'yes' : 'no'
      ].concat(reqIds.map(function (id) { return byId[id] || ''; })).map(cell).join(','));
    });
    // UTF-8 BOM so a spreadsheet opens it in the right encoding.
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  // ===================================================================
  // SECTION 3 - TEST SEAM
  // Exposed before the StemLab guard so the suite can load this file
  // without the lab shell present.
  // ===================================================================
  window.__alloCityLabPure = {
    COLS: COLS, N_COLS: N_COLS, N_ROWS: N_ROWS, MIN_PER_HOP: MIN_PER_HOP,
    USES: USES, USE_BY_ID: USE_BY_ID, PALETTE_IDS: PALETTE_IDS,
    BRIEF: BRIEF, COSTS: COSTS, ASSUMPTION_SETS: ASSUMPTION_SETS,
    SCENARIOS: SCENARIOS, SCENARIO_IDS: SCENARIO_IDS, DEFAULT_SCENARIO: DEFAULT_SCENARIO,
    scenarioOf: scenarioOf, useLabel: useLabel, CHECKS: CHECKS,
    visibleIndicatorIds: visibleIndicatorIds, WATER_IDS: WATER_IDS,
    CONTESTED_IDS: CONTESTED_IDS, TIER1_IDS: TIER1_IDS, TIER2_IDS: TIER2_IDS,
    renderedIndicatorIds: renderedIndicatorIds, headroomFraction: headroomFraction,
    TIER1_GROUPS: TIER1_GROUPS, TIER2_GROUPS: TIER2_GROUPS,
    pid: pid, parcelCol: parcelCol, parcelRow: parcelRow, edgeKey: edgeKey,
    allParcelIds: allParcelIds, terrainAt: terrainAt, neighbours: neighbours,
    isWater: isWater, edgeIsBridge: edgeIsBridge,
    inFutureSurge: inFutureSurge, futureSurgeElevationM: futureSurgeElevationM,
    SEA_IDS: SEA_IDS,
    basePlan: basePlan, clonePlan: clonePlan,
    servedParcels: servedParcels, hopsToNearest: hopsToNearest,
    canGreenInfra: canGreenInfra,
    readableInk: readableInk, contrastRatio: contrastRatio,
    TERRAIN_RAMP: TERRAIN_RAMP, INK_LIGHT: INK_LIGHT, INK_DARK: INK_DARK,
    HEAT_RAMP: HEAT_RAMP, ACCESS_RAMP: ACCESS_RAMP, ACCESS_NONE: ACCESS_NONE,
    PATH_INK: PATH_INK, PATH_GAP: PATH_GAP,
    planSvg: planSvg, planChanges: planChanges,
    buildMassing: buildMassing, massingSignature: massingSignature,
    buildCityScene: buildCityScene,
    metresToWorld: metresToWorld, VERT_EXAG: VERT_EXAG,
    METRES_PER_STOREY: METRES_PER_STOREY,
    effectiveC: effectiveC, weightedC: weightedC, peakRunoff: peakRunoff,
    capitalCost: capitalCost, scorecard: scorecard, constraintReport: constraintReport,
    compareAssumptions: compareAssumptions,
    setUse: setUse, toggleGreenInfra: toggleGreenInfra, setEdge: setEdge,
    importPlan: importPlan, movesLeft: movesLeft, outOfMoves: outOfMoves,
    SHARED_DISCUSSION: SHARED_DISCUSSION, discussionFor: discussionFor,
    CASE_STUDIES: CASE_STUDIES,
    classSummary: classSummary, classCsv: classCsv, startChallenge: startChallenge,
    // Section 3a, added 2026-11-03.
    fmt: fmt, normaliseBinding: normaliseBinding, requirementLabel: requirementLabel,
    PREDICT_INDICATORS: PREDICT_INDICATORS, predictIndicatorsFor: predictIndicatorsFor,
    classifyChange: classifyChange, applyOp: applyOp, resolvePrediction: resolvePrediction,
    restorePlan: restorePlan,
    MISSION_IDS: MISSION_IDS, missionTargets: missionTargets, missionConds: missionConds,
    missionStatus: missionStatus, diagnoseMission: diagnoseMission,
    parkExample: parkExample, servedOpenParcels: servedOpenParcels,
    memoReadiness: memoReadiness, XP_POINTS: XP_POINTS, xpId: xpId,
    briefXpEligible: briefXpEligible, teacherSettings: teacherSettings,
    startingLevel: startingLevel,
    // Stage B, added 2026-11-03.
    surfaceHeatOf: surfaceHeatOf, canCoolRoof: canCoolRoof, toggleCoolRoof: toggleCoolRoof,
    toggleTransit: toggleTransit, roadInto: roadInto, HEAT_ROOF_SHARE: HEAT_ROOF_SHARE,
    GI_CANOPY_GAIN: GI_CANOPY_GAIN, TRANSIT_WALK_MINUTES: TRANSIT_WALK_MINUTES,
    heatTarget: heatTarget, HEAT_BANDS: HEAT_BANDS, heatBand: heatBand,
    accessGaps: accessGaps, EQUITY_KINDS: EQUITY_KINDS, gapsPhrase: gapsPhrase,
    describeMapRows: describeMapRows, sonifyRequirements: sonifyRequirements, sonifyRow: sonifyRow,
    hearingReadiness: hearingReadiness, hearingOn: hearingOn, stakeholderById: stakeholderById,
    COUNTER_MIN_WORDS: COUNTER_MIN_WORDS, REBUTTAL_MIN_WORDS: REBUTTAL_MIN_WORDS,
    // Stage C, added 2026-11-03.
    learningPath: learningPath, missionDoneIn: missionDoneIn,
    planHeatTransitHearing: planHeatTransitHearing, scorecardUncached: scorecardUncached,
    // Stage D (hoisted declarations further down this file).
    condSentence: condSentence, sharpen: sharpen,
    // Stage E.
    judgeCond: judgeCond, condStandardNote: condStandardNote, STANDARD_SET: STANDARD_SET, briefJudged: briefJudged,
    planHasWork: planHasWork,
    // W1 3D board (2026-11-04).
    STAGE_TOOL_IDS: STAGE_TOOL_IDS, BOARD_VIEW_IDS: BOARD_VIEW_IDS, areNeighbours: areNeighbours,
    parcelOp: parcelOp, renderTier: renderTier, defaultBoardView: defaultBoardView,
    CAM_HOME: CAM_HOME, CAM_PRESETS: CAM_PRESETS, stagedGhost: stagedGhost,
    cityPick: cityPick, cityProject: cityProject, cityBuildCount: function () { return CITY_BUILDS; },
    // W2 the city responds (2026-11-04).
    livingCity: livingCity, planGrowth: planGrowth, deltaValues: deltaValues, deltaChips: deltaChips,
    townParts: townParts, scenePalette: scenePalette, groundTone: groundTone, parcelCentre: parcelCentre,
    PEOPLE_PER_FIGURE: PEOPLE_PER_FIGURE, ROADS_PER_CAR: ROADS_PER_CAR, CAR_CAP: CAR_CAP,
    GROW_MS: GROW_MS, CITY_IDLE_MS: CITY_IDLE_MS, GROUND_PLINTH: GROUND_PLINTH,
    cityReducedMotion: function () { return cityReducedMotion(); },
    // W3 first two minutes and K-5 (2026-11-04).
    townFrame: townFrame, wholeFrame: wholeFrame, parcelFrame: parcelFrame, panFrame: panFrame,
    screenPan: screenPan, inFrame: inFrame, coachFields: coachFields, simpleViewOn: simpleViewOn,
    PALETTE_GROUPS: PALETTE_GROUPS, BUILT_USE_IDS: BUILT_USE_IDS,
    // W4 lenses in 3D (2026-11-04).
    LENS_IDS: LENS_IDS, LENS_FILL: LENS_FILL, LENS_GLYPH_TEXT: LENS_GLYPH_TEXT, lensCells: lensCells,
    lensParts: lensParts, LENS_LID_W: LENS_LID_W, mixHex: mixHex,
    // W5 missions and feedback (2026-11-04).
    missionLens: missionLens, missionMarks: missionMarks, missionCelebrates: missionCelebrates,
    celebrationLog: function () { return CITY_CELEBRATIONS.slice(); },
    FW_MS: FW_MS, CUE_GAIN: CUE_GAIN,
    // W6 hardening (2026-11-04).
    LENS_THEME_FILL: LENS_THEME_FILL, LENS_HATCH: LENS_HATCH, lensThemeFill: lensThemeFill, hcSnap: hcSnap,
    CODE_ATLAS_IDS: CODE_ATLAS_IDS, briefRows: briefRows, briefLens: briefLens, briefCelebrates: briefCelebrates,
    fwScale: fwScale,
    // W8 (2026-11-04).
    followPoint: followPoint, cityAim: cityAim, FOLLOW_MARGIN: FOLLOW_MARGIN, FOLLOW_MS: FOLLOW_MS
  };

  // ===================================================================
  // THE 3D SCENE
  //
  // Reads the plain box list from buildMassing and puts Three.js objects in
  // S.model. Kept out of the viewer closure and exported on the test seam so
  // a browser harness can drive it against real WebGL: the geometry is the
  // part most likely to be wrong, and it is invisible to every jsdom test.
  //
  // Materials are cached per build and thrown away with the group the viewer
  // disposes, so a rebuild never leaks them.
  // ===================================================================
  var cityMatCache = null;
  // W1: the live scene, captured at build so a click can be raycast to a
  // parcel, and a build counter so a test can prove selection does not rebuild.
  var CITY_S = null, CITY_BUILDS = 0;

  function cityMaterial(THREE, colour, opts) {
    opts = opts || {};
    var key = colour + '|' + (opts.opacity || 1) + '|' + (opts.doubleSided ? 'd' : 's');
    if (!cityMatCache) cityMatCache = {};
    if (!cityMatCache[key]) {
      cityMatCache[key] = new THREE.MeshLambertMaterial({
        color: new THREE.Color(colour),
        transparent: opts.opacity != null && opts.opacity < 1,
        opacity: opts.opacity != null ? opts.opacity : 1,
        side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide
      });
    }
    return cityMatCache[key];
  }

  // W2: reduced motion, read live. One MediaQueryList for the module: the
  // scene reads `.matches` inside every frame and the panel subscribes to
  // its change event, so a switch mid-animation snaps to the end state.
  var CITY_RMQ = null;
  function cityRMQuery() {
    if (CITY_RMQ === null) {
      try {
        CITY_RMQ = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
          ? window.matchMedia('(prefers-reduced-motion: reduce)') : false;
      } catch (_) { CITY_RMQ = false; }
    }
    return CITY_RMQ || null;
  }
  function cityReducedMotion() { var q = cityRMQuery(); return !!(q && q.matches); }
  // Hunt: in full screen the page behind the stage is inert, so browse mode
  // and Tab cannot reach what the stage covers. Live regions (and the path
  // down to them) are left alone so announcements still speak. Only what
  // this adds is recorded, and only that is restored.
  var CITY_LIVE_SEL = '[aria-live], [role="status"], [role="alert"], [role="log"]';
  function cityInertOutside(keep, done) {
    if (!keep || typeof document === 'undefined' || !document.body || !keep.parentElement) return done;
    function shut(el) {
      if (!el || el.nodeType !== 1 || el === keep || el.contains(keep)) return;
      if (el.hasAttribute('inert') || /^(SCRIPT|STYLE|LINK|TEMPLATE|META)$/.test(el.tagName)) return;
      if (el.matches && el.matches(CITY_LIVE_SEL)) return;
      if (el.querySelector && el.querySelector(CITY_LIVE_SEL)) { Array.prototype.forEach.call(el.children, shut); return; }
      el.setAttribute('inert', '');
      done.push(el);
    }
    for (var n = keep; n && n !== document.body && n.parentElement; n = n.parentElement) {
      Array.prototype.forEach.call(n.parentElement.children, function (sib) { if (sib !== n) shut(sib); });
    }
    return done;
  }
  function cityInertRestore(done) {
    (done || []).forEach(function (el) { try { el.removeAttribute('inert'); } catch (_) {} });
  }
  function cityPingPong(v) {
    var w = ((v % 2) + 2) % 2;
    return w < 1 ? { f: w, dir: 1 } : { f: 2 - w, dir: -1 };
  }

  // W2 geometries, each drawn as one instanced batch. A triangular prism for
  // pitched roofs, and a figure (body and head in ONE geometry): r128 loads
  // no merge helper, so both are built here.
  function cityPrism(THREE) {
    if (!THREE.BufferGeometry || !THREE.Float32BufferAttribute) return null;
    var A = [-0.5, -0.5, 0.5], B = [0.5, -0.5, 0.5], C = [0, 0.5, 0.5];
    var D = [-0.5, -0.5, -0.5], E = [0.5, -0.5, -0.5], F = [0, 0.5, -0.5];
    var tris = [A, B, C, E, D, F, A, C, F, A, F, D, B, E, F, B, F, C, A, D, E, A, E, B];
    var pos = [];
    tris.forEach(function (v) { pos.push(v[0], v[1], v[2]); });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }
  function cityFigure(THREE) {
    if (!THREE.CylinderGeometry || !THREE.OctahedronGeometry || !THREE.BufferGeometry || !THREE.Float32BufferAttribute) return null;
    var made = [new THREE.CylinderGeometry(0.3, 0.42, 0.7, 6), new THREE.OctahedronGeometry(0.22, 0)];
    var lifts = [-0.15, 0.36], pos = [], nor = [];
    made.forEach(function (g0, i) {
      var g = g0.index ? g0.toNonIndexed() : g0;
      g.translate(0, lifts[i], 0);
      Array.prototype.push.apply(pos, Array.prototype.slice.call(g.attributes.position.array));
      Array.prototype.push.apply(nor, Array.prototype.slice.call(g.attributes.normal.array));
      if (g !== g0) g.dispose();
      g0.dispose();
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return geo;
  }
  // The "no road" sign, in the student's language. A textured plane in one
  // instanced batch, turned to face the camera by the tick (not a Sprite:
  // one draw call for every sign rather than one each).
  function citySignTexture(THREE, text) {
    if (!THREE.CanvasTexture || typeof document === 'undefined') return null;
    try {
      var cv = document.createElement('canvas');
      cv.width = 256; cv.height = 72;
      var g = cv.getContext && cv.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#7f1d1d'; g.fillRect(3, 3, 250, 66);
      g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.strokeRect(3, 3, 250, 66);
      var size = 40;
      g.font = 'bold ' + size + 'px sans-serif';
      while (size > 16 && g.measureText(text).width > 226) { size -= 2; g.font = 'bold ' + size + 'px sans-serif'; }
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 128, 38);
      return new THREE.CanvasTexture(cv);
    } catch (_) { return null; }
  }

  // W4: a lens glyph as a badge texture (dark disc, white ring, white mark),
  // drawn as shapes so no font is needed for the check, the cross or the
  // waves. One texture per glyph, one instanced batch per glyph.
  // W6: drawn at twice the size (2x), with a dark outer edge outside the
  // white ring, so the badge reads on pale ground and on dark ground alike.
  function cityGlyphTexture(THREE, glyph) {
    if (!THREE.CanvasTexture || typeof document === 'undefined') return null;
    try {
      var wide = glyph === 'future';
      var cv = document.createElement('canvas');
      cv.width = wide ? 384 : 256; cv.height = 224;
      var g = cv.getContext && cv.getContext('2d');
      if (!g) return null;
      var W = cv.width, H = cv.height;
      g.scale(2, 2);
      W = W / 2; H = H / 2;
      g.fillStyle = '#0f172a';
      g.beginPath();
      if (g.roundRect) g.roundRect(4, 4, W - 8, H - 8, 26); else g.rect(4, 4, W - 8, H - 8);
      g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0f172a'; g.stroke();
      g.beginPath();
      if (g.roundRect) g.roundRect(9, 9, W - 18, H - 18, 22); else g.rect(9, 9, W - 18, H - 18);
      g.lineWidth = 7; g.strokeStyle = '#ffffff'; g.stroke();
      g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 12;
      var cx = W / 2, cy = H / 2;
      g.beginPath();
      if (glyph === 'yes') { g.moveTo(cx - 26, cy + 2); g.lineTo(cx - 6, cy + 22); g.lineTo(cx + 28, cy - 20); g.stroke(); }
      else if (glyph === 'no') { g.moveTo(cx - 22, cy - 22); g.lineTo(cx + 22, cy + 22); g.moveTo(cx + 22, cy - 22); g.lineTo(cx - 22, cy + 22); g.stroke(); }
      else if (glyph === 'zone') {
        [-12, 12].forEach(function (dy) {
          g.moveTo(cx - 30, cy + dy);
          g.bezierCurveTo(cx - 15, cy + dy - 14, cx - 5, cy + dy + 14, cx, cy + dy);
          g.bezierCurveTo(cx + 5, cy + dy - 14, cx + 15, cy + dy + 14, cx + 30, cy + dy);
        });
        g.stroke();
      } else {
        g.font = 'bold ' + (wide ? 52 : 64) + 'px sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(LENS_GLYPH_TEXT[glyph] || String(glyph), cx, cy + 3);
      }
      return new THREE.CanvasTexture(cv);
    } catch (_) { return null; }
  }

  // W6 contrast: every land-use code in ONE atlas (a black plate, a white
  // edge, white letters), drawn at 2x. The canvas's sRGB values go straight
  // to the screen: the texture is left in the renderer's own (linear, i.e.
  // unconverted) encoding and drawn unlit, so white is white and black black.
  var CODE_ATLAS_COLS = 4, CODE_CELL_W = 160, CODE_CELL_H = 96;
  function cityCodeAtlas(THREE) {
    if (!THREE.CanvasTexture || typeof document === 'undefined') return null;
    try {
      var rows = Math.ceil(CODE_ATLAS_IDS.length / CODE_ATLAS_COLS);
      var cv = document.createElement('canvas');
      cv.width = CODE_ATLAS_COLS * CODE_CELL_W; cv.height = rows * CODE_CELL_H;
      var g = cv.getContext && cv.getContext('2d');
      if (!g) return null;
      g.clearRect(0, 0, cv.width, cv.height);
      CODE_ATLAS_IDS.forEach(function (uid, i) {
        var cx = (i % CODE_ATLAS_COLS) * CODE_CELL_W, cy = Math.floor(i / CODE_ATLAS_COLS) * CODE_CELL_H;
        g.fillStyle = '#000000';
        g.fillRect(cx + 4, cy + 4, CODE_CELL_W - 8, CODE_CELL_H - 8);
        g.lineWidth = 8; g.strokeStyle = '#ffffff';
        g.strokeRect(cx + 8, cy + 8, CODE_CELL_W - 16, CODE_CELL_H - 16);
        g.fillStyle = '#ffffff'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(USE_BY_ID[uid].code, cx + CODE_CELL_W / 2, cy + CODE_CELL_H / 2 + 3);
      });
      var tex = new THREE.CanvasTexture(cv);
      tex.cityRows = rows;
      return tex;
    } catch (_) { return null; }
  }
  // An unlit, instanced, atlas-reading material: aCell (an instance attribute)
  // picks each instance's cell, so 144 codes are one draw call.
  function cityCodeMaterial(THREE, tex) {
    if (!tex || !THREE.ShaderMaterial) return null;
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uGrid: { value: new THREE.Vector2(CODE_ATLAS_COLS, tex.cityRows || 3) } },
      vertexShader: [
        'attribute vec2 aCell;', 'uniform vec2 uGrid;', 'varying vec2 vUv;',
        'void main() {',
        '  vUv = (uv + vec2(aCell.x, uGrid.y - 1.0 - aCell.y)) / uGrid;',
        '  vec4 p = vec4(position, 1.0);',
        '  #ifdef USE_INSTANCING', '  p = instanceMatrix * p;', '  #endif',
        '  gl_Position = projectionMatrix * modelViewMatrix * p;',
        '}'].join('\n'),
      fragmentShader: [
        'uniform sampler2D map;', 'varying vec2 vUv;',
        'void main() { vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; gl_FragColor = vec4(c.rgb, 1.0); }'].join('\n'),
      side: THREE.DoubleSide
    });
  }

  // One kind of part as ONE InstancedMesh (colour per instance). Without
  // InstancedMesh (the jsdom stand-ins) each part is a plain mesh, so the
  // same scene code is testable there.
  function cityBatch(THREE, S, geo, mat, specs, opts) {
    opts = opts || {};
    if (!specs || !specs.length) return null;
    var n = specs.length;
    var b = { specs: specs, n: n, mesh: null, meshes: null, grow: [] };
    for (var i = 0; i < n; i++) if (specs[i].grow) b.grow.push(i);
    if (mat) {
      var mesh = new THREE.InstancedMesh(geo, mat, n);
      // r128 sizes instanceColor from the CURRENT count on the first
      // setColorAt; allocated here at full size instead.
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      mesh.frustumCulled = false;       // its bounds are one unit part, not the town
      if (opts.order) mesh.renderOrder = opts.order;
      var col = new THREE.Color();
      for (var j = 0; j < n; j++) { col.set(specs[j].c); mesh.setColorAt(j, col); }
      mesh.instanceColor.needsUpdate = true;
      b.mesh = mesh;
      b.dummy = new THREE.Object3D();
      S.model.add(mesh);
    } else {
      b.meshes = specs.map(function (s) {
        var mm = new THREE.Mesh(geo, cityMaterial(THREE, s.c, opts.matOpts));
        S.model.add(mm);
        return mm;
      });
    }
    // W6: rx tilts a camera-facing part to the camera's pitch (yaw, then pitch).
    b.place = function (k, x, y, z, sx, sy, sz, ry, rx) {
      if (b.mesh) {
        var dm = b.dummy;
        dm.rotation.order = 'YXZ';
        dm.position.set(x, y, z); dm.rotation.set(rx || 0, ry || 0, 0); dm.scale.set(sx, sy, sz);
        dm.updateMatrix();
        b.mesh.setMatrixAt(k, dm.matrix);
      } else {
        var mm = b.meshes[k];
        mm.position.set(x, y, z); mm.scale.set(sx, sy, sz);
        if (mm.rotation) { mm.rotation.y = ry || 0; mm.rotation.x = rx || 0; }
      }
    };
    // Place part k at growth k2 in [0, 1]: 'up' rises from the ground, 'len'
    // (a new connection) spreads out from its middle.
    b.at = function (k, k2) {
      var s = specs[k], x = s.x, y = s.y, z = s.z, sx = s.sx, sy = s.sy, sz = s.sz;
      if (k2 < 1 && s.grow) {
        var kk = Math.max(0.02, k2);
        if (s.grow === 'len') { x = s.ox + (x - s.ox) * kk; z = s.oz + (z - s.oz) * kk; sx *= kk; sz *= kk; }
        else { y = s.gy + (y - s.gy) * kk; sy *= kk; }
      }
      b.place(k, x, y, z, sx, sy, sz, s.ry);
    };
    b.flush = function () { if (b.mesh) b.mesh.instanceMatrix.needsUpdate = true; };
    for (var a = 0; a < n; a++) b.at(a, 1);
    b.flush();
    return b;
  }

  function buildCityScene(THREE, S, data) {
    cityMatCache = null;
    var m = data && data.massing;
    if (!m) return;
    CITY_BUILDS++;
    CITY_S = S;
    // Textures belong to no material the viewer disposes. They are let go
    // here, at the NEXT build, after the last frame that drew them.
    (S.cityTexes || []).forEach(function (tx) { try { tx.dispose(); } catch (_) {} });
    S.cityTexes = [];
    if (S.cityTex) { try { S.cityTex.dispose(); } catch (_) {} S.cityTex = null; }
    S.pick = [];
    S.parcelTop = {};
    var box = new THREE.BoxGeometry(1, 1, 1);
    var pal = scenePalette(data.theme || (data.dark === false ? 'light' : 'dark'));
    var dark = pal.theme !== 'light';

    // makeOrbitViewer does NOT light the scene. makeBayViewer does, which is
    // an easy thing to assume applies to both: the first real render of this
    // model came back as a correct silhouette in near-total black. Lights go
    // in S.model so they are disposed and rebuilt with the rest of the group.
    // W6: contrast is lit almost flat, so a white wall stays near white on
    // every face (the faces still differ a little, which is what shows depth).
    var hcScene = pal.theme === 'contrast';
    S.model.add(new THREE.AmbientLight(0xffffff, hcScene ? 0.86 : (dark ? 0.55 : 0.66)));
    var key = new THREE.DirectionalLight(hcScene ? 0xffffff : 0xfff4e0, hcScene ? 0.3 : (dark ? 0.85 : 0.78));
    key.position.set(-6, 10, 7);
    S.model.add(key);
    var fill = new THREE.DirectionalLight(0xbcd4ff, hcScene ? 0 : (dark ? 0.34 : 0.3));
    fill.position.set(7, 5, -6);
    S.model.add(fill);
    if (S.renderer && S.renderer.setClearColor) S.renderer.setClearColor(pal.clear, 1);

    function addBox(x, y, z, sx, sy, sz, colour, opts) {
      var mesh = new THREE.Mesh(box, cityMaterial(THREE, colour, opts));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, Math.max(0.0005, sy), sz);
      S.model.add(mesh);
      return mesh;
    }

    // W2: the town as instanced batches, one draw call per kind of part.
    var INST = typeof THREE.InstancedMesh === 'function' && typeof THREE.Object3D === 'function' &&
      typeof THREE.InstancedBufferAttribute === 'function';
    var lam = INST ? new THREE.MeshLambertMaterial({ color: 0xffffff }) : null;
    var waterMat = INST ? (THREE.MeshPhongMaterial
      ? new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 70, specular: 0x557799 }) : lam) : null;
    var floodMat = INST ? new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }) : null;
    var signTex = INST ? citySignTexture(THREE, (data.labels && data.labels.noRoad) || 'no road') : null;
    if (signTex) S.cityTexes.push(signTex);
    var signMat = INST ? ((signTex && THREE.MeshBasicMaterial)
      ? new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide }) : lam) : null;
    var geoPrism = cityPrism(THREE) || box;
    var geoRound = THREE.IcosahedronGeometry ? new THREE.IcosahedronGeometry(0.5, 0) : box;
    var geoCone = THREE.ConeGeometry ? new THREE.ConeGeometry(0.5, 1, 6) : box;
    var geoFigure = cityFigure(THREE) || box;
    var geoPlane = THREE.PlaneGeometry ? new THREE.PlaneGeometry(1, 1) : box;

    // Growth runs once per change, and only for a change made just now: a
    // board reopened later shows the town as it stands.
    var grow = data.grow || null;
    var fresh = !!(grow && grow.token && grow.token !== S.cityGrowSeen && (Date.now() - (grow.at || 0)) < 1500);
    var parts = townParts(m, data.living || null, pal, fresh ? grow : null, data.lens || null);
    function agentSpec(car) {
      return function (p) {
        return { id: p.id, x: p.x0, y: p.y, z: p.z0, sx: car ? 0.1 : 0.038, sy: car ? 0.035 : 0.088, sz: car ? 0.05 : 0.038,
          c: p.c, ry: 0, a: p };
      };
    }
    var B = S.cityBatches = {
      box: cityBatch(THREE, S, box, lam, parts.box),
      prism: cityBatch(THREE, S, geoPrism, lam, parts.prism),
      round: cityBatch(THREE, S, geoRound, lam, parts.round),
      cone: cityBatch(THREE, S, geoCone, lam, parts.cone),
      water: cityBatch(THREE, S, box, waterMat, parts.water),
      flood: cityBatch(THREE, S, box, floodMat, parts.flood, { order: 2, matOpts: { opacity: 0.6 } }),
      sign: cityBatch(THREE, S, geoPlane, signMat, parts.sign, { order: 3, matOpts: { doubleSided: true } }),
      people: cityBatch(THREE, S, geoFigure, lam, parts.people.map(agentSpec(false))),
      cars: cityBatch(THREE, S, box, lam, parts.cars.map(agentSpec(true))),
      // W4: the rain lens's uniform streaks (one batch).
      rain: cityBatch(THREE, S, box, lam, parts.rain.map(function (r) {
        return { id: r.id, x: r.x, y: r.y1, z: r.z, sx: 0.008, sy: 0.14, sz: 0.008, c: r.c, ry: 0, a: r };
      }))
    };
    // W4: the lens glyphs, one textured batch per glyph, facing the camera
    // like the signs. A lens with no glyphs (or no lens) costs no draw call.
    var tagGroups = {};
    parts.tags.forEach(function (tg) { (tagGroups[tg.glyph] = tagGroups[tg.glyph] || []).push(tg); });
    S.cityTags = Object.keys(tagGroups).sort().map(function (glyph) {
      var tex = INST ? cityGlyphTexture(THREE, glyph) : null;
      if (tex) S.cityTexes.push(tex);
      var mat = INST ? ((tex && THREE.MeshBasicMaterial)
        ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false }) : lam) : null;
      // W6: a badge is a label: drawn last and over everything (the sea
      // sheets dimmed it), white so its instance colour leaves the texture as drawn.
      var tb = cityBatch(THREE, S, geoPlane, mat, tagGroups[glyph], { order: 6, matOpts: { doubleSided: true } });
      if (tb) { tb.glyph = glyph; tb.facePitch = true; }
      return tb;
    }).filter(Boolean);
    // W6: the contrast scene's land-use codes, one atlas batch facing the camera.
    S.cityCodeN = parts.codes.length;
    S.cityCodes = null;
    if (parts.codes.length) {
      var codeTex = INST ? cityCodeAtlas(THREE) : null;
      if (codeTex) S.cityTexes.push(codeTex);
      var codeMat = codeTex ? cityCodeMaterial(THREE, codeTex) : null;
      var geoCode = THREE.PlaneGeometry ? new THREE.PlaneGeometry(1, 1) : box;
      if (codeMat && geoCode.setAttribute) {
        var cells = new Float32Array(parts.codes.length * 2);
        parts.codes.forEach(function (cd, i) { cells[i * 2] = cd.cell % CODE_ATLAS_COLS; cells[i * 2 + 1] = Math.floor(cd.cell / CODE_ATLAS_COLS); });
        geoCode.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
      }
      S.cityCodes = cityBatch(THREE, S, geoCode, codeMat || (INST ? lam : null), parts.codes, { order: 4, matOpts: { doubleSided: true } });
      if (S.cityCodes) S.cityCodes.facePitch = true;
      S.cityCodeShow = {};
      S.cityCodeFocus = null;
    }
    function applyGrow(k) {
      S.cityGrowK = k;
      Object.keys(B).forEach(function (name) {
        var b = B[name];
        if (!b || !b.grow.length) return;
        for (var i = 0; i < b.grow.length; i++) b.at(b.grow[i], k);
        b.flush();
      });
    }
    S.cityGrowing = false;
    S.cityGrowK = 1;
    if (fresh) {
      S.cityGrowSeen = grow.token;
      if (Object.keys(B).some(function (name) { return B[name] && B[name].grow.length; })) {
        S.cityGrowing = true;
        S.cityGrowT0 = null;
        S.cityGrowArmed = false;
        S.cityGrowEnd = null;
        applyGrow(0);
      }
    }

    // Picking: one invisible box per parcel, ground to roof. Never drawn (no
    // draw call), still raycast, and disposed with the group.
    var proxyMat = INST && THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({ color: 0x000000 }) : cityMaterial(THREE, '#000000');
    var top = 0;
    m.ground.forEach(function (g) {
      var roof = parts.roofs[g.id] != null ? parts.roofs[g.id] : g.top;
      top = Math.max(top, roof);
      var px = new THREE.Mesh(box, proxyMat);
      px.position.set(g.x, roof / 2, g.z);
      px.scale.set(0.98, Math.max(0.02, roof), 0.98);
      px.visible = false;
      px.userData = { parcel: g.id };
      S.model.add(px);
      S.pick.push(px);
      S.parcelTop[g.id] = { x: g.x, z: g.z, top: g.top, roof: roof };
    });

    // The water sheets. Full extent and translucent, so what reads is which
    // ground has gone under rather than how high the sheet sits.
    // W4: when the assumption set moves a sheet, it EASES from where it was
    // to where the new set puts it (the tick runs it; reduced motion, a still
    // board or a slow device snaps it). Its last height is kept on S, which
    // outlives a rebuild.
    var sheetPrev = (S.citySheetScen === m.scenarioId && S.citySheetY) ? S.citySheetY : {};
    S.citySheetScen = m.scenarioId;
    S.citySheetY = {};
    S.citySheets = [];
    var sheetMoves = false;
    m.sheets.forEach(function (sh) {
      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(m.extent * 2 + 0.6, m.extent * 2 + 0.6),
        cityMaterial(THREE, sh.colour, { opacity: sh.opacity, doubleSided: true })
      );
      var from = typeof sheetPrev[sh.id] === 'number' ? sheetPrev[sh.id] : sh.y;
      if (Math.abs(from - sh.y) > 1e-9) sheetMoves = true;
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, from, 0);
      S.model.add(plane);
      S.citySheetY[sh.id] = from;
      S.citySheets.push({ id: sh.id, mesh: plane, from: from, to: sh.y });
    });
    S.citySheetAnim = sheetMoves ? { t0: null, armed: false, k: 0 } : null;
    if (sheetMoves) { S.citySheetEaseFrames = 0; S.citySheetSnapped = false; }
    function placeSheets(k) {
      S.citySheets.forEach(function (sh) {
        var y = sh.from + (sh.to - sh.from) * k;
        sh.mesh.position.set(0, y, 0);
        S.citySheetY[sh.id] = y;
      });
    }

    m.marks.forEach(function (mk) {
      addBox(mk.x, mk.base + 0.6, mk.z, 0.08, 1.2, 0.08, '#ffffff');
    });

    // W3: the camera looks at a FRAME (the town, the whole map, one district
    // or wherever the student slid it). Same four-point fit as before, over
    // the frame instead of the whole map; the tick re-aims it when the frame
    // in the data changes, without a rebuild.
    function aimAt(f) {
      var a = cityAim(S.parcelTop, f, m.extent, top);
      S.target = new THREE.Vector3(a.target[0], a.target[1], a.target[2]);
      S.fitPts = a.pts.map(function (q) { return new THREE.Vector3(q[0], q[1], q[2]); });
      S.cityFrame = a.frame;
      S.cityFrameTop = a.top;
    }
    S.cityExtent = m.extent;
    S.cityTopAll = top;
    aimAt(null);
    S.cityFrameKey = null;
    S.cityFrameAnim = null;

    // W3: the coach's step-1 tint, a yellow frame on each field a road runs
    // into. One instanced batch of four bars per parcel, all hidden until the
    // data names some, so it costs no draw call when the coach is not on.
    var hintB = null;
    if (INST) {
      var hintSpecs = [];
      m.ground.forEach(function (g) {
        for (var hb = 0; hb < 4; hb++) hintSpecs.push({ id: g.id, x: g.x, y: 0, z: g.z, sx: 0.0001, sy: 0.0001, sz: 0.0001, c: '#facc15' });
      });
      hintB = cityBatch(THREE, S, box, lam, hintSpecs);
      if (hintB && hintB.mesh) hintB.mesh.visible = false;
    }
    S.cityHintKey = '';
    S.cityHintN = 0;
    function placeHints(ids) {
      var key = (ids || []).join(',');
      if (key === S.cityHintKey) return;
      S.cityHintKey = key;
      S.cityHintN = 0;
      if (!hintB) return;
      var on = {};
      (ids || []).forEach(function (id) { on[id] = true; });
      for (var i = 0; i < hintB.n; i += 4) {
        var sp = hintB.specs[i], p = S.parcelTop[sp.id];
        if (!on[sp.id] || !p) {
          for (var q = 0; q < 4; q++) hintB.place(i + q, sp.x, 0, sp.z, 0.0001, 0.0001, 0.0001, 0);
          continue;
        }
        S.cityHintN++;
        var y = p.top + 0.05, k = 0.1, e = 0.5 - k / 2;
        hintB.place(i, p.x, y, p.z - e, 1, 0.08, k, 0);
        hintB.place(i + 1, p.x, y, p.z + e, 1, 0.08, k, 0);
        hintB.place(i + 2, p.x - e, y, p.z, k, 0.08, 1, 0);
        hintB.place(i + 3, p.x + e, y, p.z, k, 0.08, 1, 0);
      }
      hintB.flush();
      if (hintB.mesh) hintB.mesh.visible = S.cityHintN > 0;
    }

    // W5: the parcels the mission already counts, a faint frame each. Same
    // shape as the coach tint (four bars a parcel, one batch, hidden until
    // the data names some), thinner, and green rather than yellow.
    var markB = null;
    if (INST) {
      var markSpecs = [], markCol = dark ? '#34d399' : '#047857';
      m.ground.forEach(function (g) {
        for (var mb = 0; mb < 4; mb++) markSpecs.push({ id: g.id, x: g.x, y: 0, z: g.z, sx: 0.0001, sy: 0.0001, sz: 0.0001, c: markCol });
      });
      markB = cityBatch(THREE, S, box, lam, markSpecs);
      if (markB && markB.mesh) markB.mesh.visible = false;
    }
    S.cityMarkKey = null;
    S.cityMarkIds = [];
    S.cityMarkN = 0;
    function placeMarks(ids) {
      var key = (ids || []).join(',');
      if (key === S.cityMarkKey) return;
      S.cityMarkKey = key;
      S.cityMarkIds = (ids || []).filter(function (id) { return !!S.parcelTop[id]; });
      S.cityMarkN = 0;
      if (!markB) return;
      var on = {};
      S.cityMarkIds.forEach(function (id) { on[id] = true; });
      for (var i = 0; i < markB.n; i += 4) {
        var sp = markB.specs[i], p = S.parcelTop[sp.id];
        if (!on[sp.id] || !p) {
          for (var q = 0; q < 4; q++) markB.place(i + q, sp.x, 0, sp.z, 0.0001, 0.0001, 0.0001, 0);
          continue;
        }
        S.cityMarkN++;
        var y = p.top + 0.03, k = 0.05, e = 0.5 - 0.06 - k / 2;
        markB.place(i, p.x, y, p.z - e, 0.88, 0.04, k, 0);
        markB.place(i + 1, p.x, y, p.z + e, 0.88, 0.04, k, 0);
        markB.place(i + 2, p.x - e, y, p.z, k, 0.04, 0.88, 0);
        markB.place(i + 3, p.x + e, y, p.z, k, 0.04, 0.88, 0);
      }
      markB.flush();
      if (markB.mesh) markB.mesh.visible = S.cityMarkN > 0;
    }

    // W5: fireworks over the town for a mission that PASSED on Check. One
    // batch of small crowns, hidden (no draw call) unless a show is running.
    // The show itself lives on S (it outlives a rebuild); the tick plays it.
    var fwB = null;
    if (INST) {
      var fwSpecs = [];
      for (var fi = 0; fi < FW_BURSTS * FW_PER; fi++) {
        fwSpecs.push({ id: 'fw' + fi, x: 0, y: 0, z: 0, sx: 0.0001, sy: 0.0001, sz: 0.0001, c: FW_COLOURS[fi % FW_COLOURS.length] });
      }
      var fwMat = THREE.MeshBasicMaterial ? new THREE.MeshBasicMaterial({ color: 0xffffff }) : lam;
      fwB = cityBatch(THREE, S, geoRound, fwMat, fwSpecs, { order: 5 });
      if (fwB && fwB.mesh) fwB.mesh.visible = false;
    }
    S.cityFwVisible = false;
    // k: the share of the show gone by, 0 to 1; below 0 hides it all.
    function placeFw(k) {
      S.cityFwVisible = k >= 0 && k < 1;
      if (!fwB) return;
      if (fwB.mesh) fwB.mesh.visible = S.cityFwVisible;
      if (!S.cityFwVisible) return;
      var fr = S.cityFrame || { x: 0, z: 0, hx: m.extent, hz: m.extent };
      var top = S.cityFrameTop || 0, secs = k * FW_MS / 1000;
      var cx = [-0.35, 0.3, 0], cz = [0.2, -0.3, 0.35];
      // W6: larger bursts, scaled to the frame, so they read at default zoom.
      var gs = fwScale(fr);
      S.cityFwScale = gs;
      for (var i = 0; i < fwB.n; i++) {
        var b = Math.floor(i / FW_PER), j = i % FW_PER, tau = secs - b * FW_GAP;
        if (tau < 0 || tau > FW_LIFE) { fwB.place(i, 0, 0, 0, 0.0001, 0.0001, 0.0001, 0); continue; }
        var u = (j + 0.5) / FW_PER, inc = Math.acos(1 - 2 * u), az = j * 2.39996;
        var r = 1.3 * gs * (1 - Math.exp(-3 * tau)), sz = (0.075 * (1 - tau / FW_LIFE) + 0.012) * gs;
        fwB.place(i, fr.x + cx[b] * fr.hx + Math.sin(inc) * Math.cos(az) * r,
          top + (1.5 + 0.3 * b) * gs + Math.cos(inc) * r - 0.35 * gs * tau * tau,
          fr.z + cz[b] * fr.hz + Math.sin(inc) * Math.sin(az) * r, sz, sz, sz, 0);
      }
      fwB.flush();
    }

    // ---- W1: what moves WITHOUT a rebuild. Built once per scene, hidden,
    // and placed by the tick from S.data, so hover, selection, the road start
    // and the staged "?" never touch the signature. WebGL ignores lineWidth,
    // so an outline is four thin boxes rather than a line.
    function ring(colour, thick, lift) {
      var bars = [];
      for (var i = 0; i < 4; i++) {
        var bar = addBox(0, 0, 0, 1, 0.03, 1, colour);
        bar.visible = false;
        bars.push(bar);
      }
      return { bars: bars, thick: thick, lift: lift, at: null };
    }
    function placeRing(r, id) {
      var p = id ? S.parcelTop[id] : null;
      r.at = p ? id : null;
      for (var i = 0; i < 4; i++) r.bars[i].visible = !!p;
      if (!p) return;
      var y = p.top + r.lift, k = r.thick, e = 0.5 - k / 2;
      r.bars[0].position.set(p.x, y, p.z - e); r.bars[0].scale.set(1, 0.03, k);
      r.bars[1].position.set(p.x, y, p.z + e); r.bars[1].scale.set(1, 0.03, k);
      r.bars[2].position.set(p.x - e, y, p.z); r.bars[2].scale.set(k, 0.03, 1);
      r.bars[3].position.set(p.x + e, y, p.z); r.bars[3].scale.set(k, 0.03, 1);
    }
    var hoverRing = ring(pal.hover, 0.07, 0.03);
    var selRing = ring(pal.sel, 0.1, 0.035);
    var fromRing = ring(pal.from, 0.13, 0.04);
    var pole = addBox(0, 0, 0, 0.08, 1.2, 0.08, '#ffffff');
    pole.visible = false;
    var ghost = addBox(0, 0, 0, 1, 1, 1, '#e2e8f0', { opacity: 0.55 });
    ghost.visible = false;
    var qSprite = null;
    if (THREE.Sprite && THREE.SpriteMaterial && THREE.CanvasTexture && typeof document !== 'undefined') {
      try {
        var cv = document.createElement('canvas');
        cv.width = 128; cv.height = 128;
        var g2 = cv.getContext && cv.getContext('2d');
        if (g2) {
          g2.fillStyle = '#0f172a'; g2.beginPath(); g2.arc(64, 64, 56, 0, Math.PI * 2); g2.fill();
          g2.lineWidth = 8; g2.strokeStyle = '#ffffff'; g2.stroke();
          g2.fillStyle = '#ffffff'; g2.font = 'bold 84px sans-serif';
          g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('?', 64, 70);
          S.cityTex = new THREE.CanvasTexture(cv);
          qSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.cityTex, depthTest: false, transparent: true }));
          qSprite.scale.set(0.6, 0.6, 1);
          qSprite.renderOrder = 10;
          qSprite.visible = false;
          S.model.add(qSprite);
        }
      } catch (_) { qSprite = null; }
    }
    S.cityDyn = { hover: hoverRing, sel: selRing, from: fromRing, ghost: ghost, mark: qSprite };

    // ---- W2: the living city. Figures walk their stretch of pavement and
    // cars drive their road, on a clock that only runs while motion is
    // allowed; otherwise everything stands at its place on the clock.
    var signB = B.sign, peopleB = B.people, carsB = B.cars;
    S.cityHasAgents = !!(peopleB || carsB || B.rain);
    S.cityAnimFrames = S.cityAnimFrames || 0;
    S.cityWdSkip = 20;
    S.cityClock = S.cityClock || 0;
    S.citySignRot = null;
    function placeAgents(T) {
      if (peopleB) {
        for (var i = 0; i < peopleB.n; i++) {
          var p = peopleB.specs[i].a, len = (Math.abs(p.x1 - p.x0) + Math.abs(p.z1 - p.z0)) || 1;
          var u = cityPingPong(T * 0.05 / len + p.phase);
          peopleB.place(i, p.x0 + (p.x1 - p.x0) * u.f, p.y, p.z0 + (p.z1 - p.z0) * u.f, 0.038, 0.088, 0.038, 0);
        }
        peopleB.flush();
      }
      if (carsB) {
        for (var j = 0; j < carsB.n; j++) {
          var c = carsB.specs[j].a, v = cityPingPong(T * 0.16 + c.phase);
          var dx = (c.x1 - c.x0) * v.dir, dz = (c.z1 - c.z0) * v.dir;
          // Keep right: the lane is offset to the right of the heading.
          carsB.place(j, c.x0 + (c.x1 - c.x0) * v.f - dz * 0.035, c.y, c.z0 + (c.z1 - c.z0) * v.f + dx * 0.035,
            0.1, 0.035, 0.05, Math.atan2(-dz, dx));
        }
        carsB.flush();
      }
    }
    placeAgents(S.cityClock);
    // W6: the lens badges and the contrast codes also tilt to the camera's
    // pitch, so they still read from Bird's eye (a sign standing upright is
    // edge-on from straight above).
    function faceSigns(ry, rx) {
      S.cityCodeVis = 0;
      [signB].concat(S.cityTags || [], S.cityCodes ? [S.cityCodes] : []).forEach(function (fb) {
        if (!fb) return;
        var codes = fb === S.cityCodes;
        for (var i = 0; i < fb.n; i++) {
          var s = fb.specs[i];
          // A quiet code (an open field) is shrunk away unless it is in focus.
          var hide = codes && s.quiet && !(S.cityCodeShow && S.cityCodeShow[s.id]);
          if (codes && !hide) S.cityCodeVis++;
          fb.place(i, s.x, s.y, s.z, hide ? 0.0001 : s.sx, hide ? 0.0001 : s.sy, 1, ry, fb.facePitch ? -rx : 0);
        }
        fb.flush();
      });
    }
    // W4: the rain falls at one speed everywhere, on the motion clock.
    var rainB = B.rain;
    function placeRain(T) {
      if (!rainB) return;
      for (var i = 0; i < rainB.n; i++) {
        var r = rainB.specs[i].a, span = Math.max(0.1, r.y1 - r.y0);
        var y = r.y1 - (((T * 1.4) + r.phase * span) % span);
        rainB.place(i, r.x, y, r.z, 0.008, 0.14, 0.008, 0);
      }
      rainB.flush();
    }
    placeRain(S.cityClock);

    S.tick = function (now) {
      now = now || 0;
      var d = S.data || {};
      // W3: the frame and the coach's tints ride in the data, like the selection.
      var fr = d.frame || null;
      var fk = fr ? [fr.x, fr.z, fr.hx, fr.hz].join(',') : 'all';
      // W8: a follow frame (the HUD keeping the selected parcel clear) eases
      // over FOLLOW_MS on the armed clock; reduced motion, a still board or a
      // waiting edit snap it. Any other frame, and the first after a build, snaps.
      var frameMotion = !!d.motion && !d.frozen && !cityReducedMotion() && !S.cityWdTripped;
      if (fk !== S.cityFrameKey) {
        var follow = !!(fr && fr.kind === 'follow');
        var easeIt = follow && S.cityFrameKey !== null && !!S.cityFrame && frameMotion;
        S.cityFrameKey = fk;
        if (follow) { S.cityFrameEaseFrames = 0; S.cityFrameSnapped = !easeIt; }
        if (easeIt) S.cityFrameAnim = { from: S.cityFrame, to: fr, t0: null, armed: false };
        else { S.cityFrameAnim = null; aimAt(fr); }
      }
      var fa = S.cityFrameAnim;
      if (fa) {
        var fek = 0;
        if (!frameMotion) fek = 1;
        else if (!fa.armed) fa.armed = true;
        else {
          if (fa.t0 == null) fa.t0 = now;
          fek = Math.min(1, (now - fa.t0) / FOLLOW_MS);
        }
        if (fek > 0 && fek < 1) S.cityFrameEaseFrames = (S.cityFrameEaseFrames || 0) + 1;
        if (fek >= 1) { S.cityFrameAnim = null; S.cityFrameSnapped = !frameMotion; aimAt(fa.to); }
        else {
          var fe = 1 - Math.pow(1 - fek, 3);
          aimAt({ x: fa.from.x + (fa.to.x - fa.from.x) * fe, z: fa.from.z + (fa.to.z - fa.from.z) * fe,
            hx: fa.from.hx + (fa.to.hx - fa.from.hx) * fe, hz: fa.from.hz + (fa.to.hz - fa.from.hz) * fe });
        }
      }
      placeHints(d.hint || null);
      placeMarks(d.marks || null);
      placeRing(hoverRing, d.hoverId && d.hoverId !== d.selectedId ? d.hoverId : null);
      placeRing(selRing, d.selectedId || null);
      var sp = d.selectedId ? S.parcelTop[d.selectedId] : null;
      pole.visible = !!sp;
      if (sp) pole.position.set(sp.x, sp.roof + 0.6, sp.z);
      placeRing(fromRing, d.roadFrom || null);
      // The staged change is only a place and a "?": every model-tied mesh
      // above is still the plan as it was, because the plan has not changed.
      var gh = d.ghost, ga = gh ? S.parcelTop[gh.a] : null, gb = gh && gh.b ? S.parcelTop[gh.b] : null;
      ghost.visible = !!ga;
      var qy = 0, qx = 0, qz = 0;
      if (ga && gb) {
        var across = ga.z === gb.z;
        qx = (ga.x + gb.x) / 2; qz = (ga.z + gb.z) / 2;
        var ry0 = Math.max(ga.top, gb.top) + 0.06;
        ghost.scale.set(across ? 1 : 0.26, 0.1, across ? 0.26 : 1);
        ghost.position.set(qx, ry0, qz);
        qy = ry0 + 0.5;
      } else if (ga) {
        qx = ga.x; qz = ga.z;
        ghost.scale.set(0.72, 0.6, 0.72);
        ghost.position.set(ga.x, ga.roof + 0.3, ga.z);
        qy = ga.roof + 0.95;
      }
      if (qSprite) {
        qSprite.visible = !!ga;
        if (ga) qSprite.position.set(qx, qy, qz);
      }

      // W2. Signs face the camera; the camera only moves on a push.
      var ry = (S.rotY || 0) * Math.PI / 180, rxp = (S.rotX || 0) * Math.PI / 180;
      // Hunt: the selected and the hovered parcel always show their code.
      var cf = (d.selectedId || '') + '|' + (d.hoverId || '');
      if (S.cityCodes && cf !== S.cityCodeFocus) {
        S.cityCodeFocus = cf;
        S.cityCodeShow = {};
        if (d.selectedId) S.cityCodeShow[d.selectedId] = true;
        if (d.hoverId) S.cityCodeShow[d.hoverId] = true;
        S.citySignRot = null;
      }
      if (S.citySignRot !== ry + ':' + rxp) { S.citySignRot = ry + ':' + rxp; faceSigns(ry, rxp); }
      // Reduced motion is read HERE, every frame, as well as by the panel:
      // a switch mid-growth snaps to the end state on the very next frame.
      var motionOK = !!d.motion && !cityReducedMotion() && !S.cityWdTripped;
      // While an edit waits for a prediction the model is frozen: nothing
      // moves, and nothing new is shown.
      var moving = motionOK && !d.frozen;
      if (d !== S.cityLastData) { S.cityLastData = d; S.cityIdleUntil = now + CITY_IDLE_MS; S.cityLastNow = 0; }
      var raw = S.cityLastNow ? now - S.cityLastNow : 0;
      S.cityLastNow = now;
      if (S.cityGrowing) {
        // The clock starts on the first frame AFTER the rebuild was drawn:
        // that frame carries the upload, and on a slow GPU it would otherwise
        // eat most of the 400 ms before anyone saw it.
        var k = 0;
        if (!motionOK) k = 1;
        else if (!S.cityGrowArmed) S.cityGrowArmed = true;
        else {
          if (S.cityGrowT0 == null) S.cityGrowT0 = now;
          k = Math.min(1, (now - S.cityGrowT0) / GROW_MS);
        }
        applyGrow(k >= 1 ? 1 : 1 - Math.pow(1 - k, 3));
        if (k >= 1) { S.cityGrowing = false; S.cityGrowEnd = now; }
      }
      // W4: a sea sheet eases to the height the new assumption set gives it,
      // over 700 ms on the same armed clock as growth; without motion it snaps.
      var sa = S.citySheetAnim;
      if (sa) {
        var sk = 0;
        if (!motionOK) sk = 1;
        else if (!sa.armed) sa.armed = true;
        else {
          if (sa.t0 == null) sa.t0 = now;
          sk = Math.min(1, (now - sa.t0) / 700);
        }
        sa.k = sk;
        if (sk > 0 && sk < 1) S.citySheetEaseFrames = (S.citySheetEaseFrames || 0) + 1;
        placeSheets(sk >= 1 ? 1 : 1 - Math.pow(1 - sk, 3));
        if (sk >= 1) { S.citySheetAnim = null; S.citySheetSnapped = !motionOK; }
      }
      // W5: fireworks for a Check that passed, on the same armed clock. Only
      // a celebration made just now plays (a board reopened later does not
      // replay it), never on a still board or under reduced motion, and if
      // either turns on mid-show the sky clears on that very frame.
      var cel = d.celebrate || null;
      if (cel && cel.token !== S.cityFwSeen) {
        S.cityFwSeen = cel.token;
        if (motionOK && !d.frozen && (Date.now() - (cel.at || 0)) < 1500) S.cityFw = { t0: null, armed: false, frames: 0 };
        else S.cityFwSkipped = (S.cityFwSkipped || 0) + 1;
      }
      if (S.cityFw) {
        var fw = S.cityFw, fwk = 0;
        if (!motionOK || d.frozen) fwk = -1;
        else if (!fw.armed) fw.armed = true;
        else {
          if (fw.t0 == null) fw.t0 = now;
          fwk = (now - fw.t0) / FW_MS;
        }
        if (fwk < 0 || fwk >= 1) {
          S.cityFw = null;
          placeFw(-1);
          if (fwk < 0) S.cityFwStopped = (S.cityFwStopped || 0) + 1;
          else S.cityFwDone = (S.cityFwDone || 0) + 1;
        } else {
          fw.frames++;
          S.cityFwFrames = fw.frames;
          placeFw(fwk);
        }
      }
      var walking = moving && S.cityHasAgents && now < S.cityIdleUntil;
      if (walking) {
        S.cityClock += Math.min(50, Math.max(0, raw)) / 1000;
        placeAgents(S.cityClock);
        placeRain(S.cityClock);
      }
      var active = !!(S.cityGrowing || walking || S.citySheetAnim || S.cityFw || S.cityFrameAnim);
      if (active) {
        S.cityAnimFrames++;
        // Watchdog: two windows of 90 frames in a row averaging over 33 ms
        // drop the board to still (T1). The first frames after a build
        // (shader compiles, first upload) are not counted, nor is a frame
        // that carried new data from the panel.
        if (S.cityWdSkip > 0) S.cityWdSkip--;
        else if (raw > 0 && raw < 250) {
          var wd = S.cityWd || (S.cityWd = { n: 0, sum: 0, slowRuns: 0 });
          wd.n++; wd.sum += raw;
          if (wd.n >= 90) {
            wd.slowRuns = wd.sum / wd.n > 33 ? wd.slowRuns + 1 : 0;
            if (wd.slowRuns >= 2 && !S.cityWdTripped) {
              S.cityWdTripped = true;
              if (typeof d.onSlow === 'function') { try { d.onSlow(); } catch (_) {} }
            }
            wd.n = 0; wd.sum = 0;
          }
        }
      }
      S.cityActive = active;
      // Render on demand: nothing moving, so the viewer stops asking for frames.
      if (!active) d.static = true;
    };
  }

  // The live scene for picking, or null while there is none to trust.
  function cityLive() {
    var S = CITY_S;
    return S && S.renderer && S.camera && S.pick && !S.disposing && !S.contextLost && !S.failed ? S : null;
  }

  // The parcel under a screen point, raycast against the ground columns and
  // the blocks. Null off the model or with no live scene.
  function cityPick(clientX, clientY) {
    var S = cityLive();
    var THREE = S && (S.THREE || window.THREE);
    if (!S || !THREE || !THREE.Raycaster) return null;
    var r = S.renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var nx = ((clientX - r.left) / r.width) * 2 - 1, ny = -((clientY - r.top) / r.height) * 2 + 1;
    if (Math.abs(nx) > 1 || Math.abs(ny) > 1) return null;
    var rc = new THREE.Raycaster();
    if (S.camera.updateMatrixWorld) S.camera.updateMatrixWorld();
    rc.setFromCamera(new THREE.Vector2(nx, ny), S.camera);
    var hits = rc.intersectObjects(S.pick, false) || [];
    for (var i = 0; i < hits.length; i++) {
      var u = hits[i].object && hits[i].object.userData;
      if (u && u.parcel) return u.parcel;
    }
    return null;
  }

  // A parcel's top (its roof where it has a block) in page pixels: the test
  // seam a browser spec clicks at.
  function cityProject(id) {
    var S = cityLive();
    var THREE = S && (S.THREE || window.THREE);
    if (!S || !THREE || !S.parcelTop[id]) return null;
    var p = S.parcelTop[id];
    var v = new THREE.Vector3(p.x, p.roof, p.z);
    v.project(S.camera);
    var r = S.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height,
      onScreen: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1 };
  }

  // W8: the HUD boxes of a full-screen stage, in page px.
  function cityHudRects(el) {
    if (!el || !el.querySelectorAll) return [];
    return Array.prototype.slice.call(el.querySelectorAll('[data-citylab-hud-part]')).map(function (n) {
      var b = n.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    }).filter(function (b) { return b.right > b.left && b.bottom > b.top; });
  }
  // The camera the host viewer would pose for frame f and camera cam: the
  // same four-point fit (slack 1.05, no pad, the camera's fov), for the
  // canvas rect r. City Lab sets no fitPad, fitSlack, fov or camera hook.
  function cityPoseFor(S, THREE, f, cam, r) {
    var a = cityAim(S.parcelTop, f, S.cityExtent || mapHalf(), S.cityTopAll || 0);
    var c = S.camera.clone();
    c.aspect = r.width / Math.max(1, r.height);
    var ry = (cam.rotY || 0) * Math.PI / 180, rx = (cam.rotX || 0) * Math.PI / 180;
    var dir = new THREE.Vector3(Math.cos(rx) * Math.sin(ry), Math.sin(rx), Math.cos(rx) * Math.cos(ry)).normalize();
    var right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    var upv = new THREE.Vector3().crossVectors(dir, right).normalize();
    var tanV = Math.tan(c.fov * Math.PI / 360), tanH = tanV * Math.max(0.2, c.aspect);
    var tgt = new THREE.Vector3(a.target[0], a.target[1], a.target[2]);
    var fit = 1;
    a.pts.forEach(function (q) {
      var rel = new THREE.Vector3(q[0], q[1], q[2]).sub(tgt);
      var along = rel.dot(dir);
      fit = Math.max(fit, Math.abs(rel.dot(right)) / tanH + along, Math.abs(rel.dot(upv)) / tanV + along);
    });
    var dist = fit * 1.05 / Math.max(0.3, cam.zoom || 1);
    c.position.copy(tgt).addScaledVector(dir, dist);
    c.near = Math.max(0.05, dist * 0.01);
    c.far = dist * 8 + 200;
    c.updateProjectionMatrix();
    c.lookAt(tgt);
    c.updateMatrixWorld();
    return c;
  }
  // W8: the frame that keeps parcel id's point clear of the HUD boxes for
  // camera cam, or null when it is clear already (or nothing is live). The
  // point goes to followPoint's nearest clear spot by sliding the frame over
  // the ground; solved again (a slide can change the frame's roof height) up
  // to four times. The map's edge can stop it short.
  function cityFollowFrame(id, cam, blockers, margin) {
    var S = cityLive();
    var THREE = S && (S.THREE || window.THREE);
    if (!S || !THREE || !THREE.Raycaster || !S.parcelTop[id] || !S.camera.clone) return null;
    var r = S.renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var vw = window.innerWidth || r.right, vh = window.innerHeight || r.bottom;
    var area = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(vw, r.right), bottom: Math.min(vh, r.bottom) };
    var p = S.parcelTop[id], at = new THREE.Vector3(p.x, p.roof, p.z);
    var f = cam.frame || wholeFrame(), moved = false;
    for (var it = 0; it < 4; it++) {
      var c = cityPoseFor(S, THREE, f, cam, r);
      var q = at.clone().project(c);
      var want = followPoint({ x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height, behind: q.z > 1 || q.z < -1 },
        area, blockers, margin);
      if (!want) break;
      var rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(((want.x - r.left) / r.width) * 2 - 1, -((want.y - r.top) / r.height) * 2 + 1), c);
      var o = rc.ray.origin, dv = rc.ray.direction;
      if (Math.abs(dv.y) < 1e-6) break;
      var s = (p.roof - o.y) / dv.y;
      if (!(s > 0)) break;
      var nf = panFrame(f, p.x - (o.x + dv.x * s), p.z - (o.z + dv.z * s));
      if (Math.abs(nf.x - f.x) < 1e-4 && Math.abs(nf.z - f.z) < 1e-4) break;
      f = nf; moved = true;
    }
    return moved ? Object.assign({}, f, { kind: 'follow', id: id }) : null;
  }

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ===================================================================
  // THE 3D VIEWER
  //
  // makeOrbitViewer, not makeBayViewer: it owns WebGL context-loss rebuild,
  // pause-when-hidden, theme rebuild, the silent no-WebGL fallback, and
  // `static: true` render-on-demand. The last matters most. A town sitting
  // idle at 60 fps on a school Chromebook is the regression that has bitten
  // the orbit bays before, so this scene renders only when something has
  // actually changed or the camera is moving.
  //
  // The viewer is created ONCE at module scope. Building it per render would
  // tear down and rebuild the WebGL context on every state change.
  //
  // The caller owns the camera: rotY, rotX and zoom must be in every push or
  // the scene freezes at its opening angle, because the viewer has no drag
  // handler of its own. The drag and the buttons live in the panel below.
  // ===================================================================
  var CITY_VIEWER = typeof window.StemLab.makeOrbitViewer === 'function'
    ? window.StemLab.makeOrbitViewer({
        // A GETTER, read when the viewer attaches (after render has stored
        // ctx), so the message is in the student's language. A plain string
        // here was fixed in English at load time.
        get failMessage() {
          return __alloT('stem.citylab.no_3d_fail_message', 'The 3D model is unavailable on this device. The map and the parcel ' +
            'table show the same plan.');
        },
        home: { yaw: 0, pitch: 0, dist: 1 },
        build: buildCityScene,
        // The test seam: what a browser spec needs to click a parcel and to
        // prove a selection change moved the outline without a rebuild.
        debug: function (S) {
          var d = S.data || {}, dyn = S.cityDyn || {}, B = S.cityBatches || {};
          var meshes = 0;
          if (S.model && S.model.traverse) S.model.traverse(function (o) { if (o.isMesh) meshes++; });
          var batches = {};
          Object.keys(B).forEach(function (k) { batches[k] = B[k] ? B[k].n : 0; });
          var info = S.renderer && S.renderer.info && S.renderer.info.render;
          return {
            cityLab: true, builds: CITY_BUILDS, meshes: meshes, pickables: (S.pick || []).length,
            // W2: draw calls in the last frame, the batches, and the animation state.
            calls: info ? info.calls : null, batches: batches,
            growing: !!S.cityGrowing, growK: S.cityGrowK == null ? 1 : S.cityGrowK, active: !!S.cityActive,
            growStart: S.cityGrowT0 == null ? null : S.cityGrowT0, growEnd: S.cityGrowEnd == null ? null : S.cityGrowEnd,
            animFrames: S.cityAnimFrames || 0, slow: !!S.cityWdTripped,
            static: !!d.static, motion: !!d.motion, frozen: !!d.frozen, theme: d.theme || null,
            selectedId: d.selectedId || null, hoverId: d.hoverId || null, roadFrom: d.roadFrom || null,
            ghost: !!(dyn.ghost && dyn.ghost.visible), mark: !!(dyn.mark && dyn.mark.visible),
            selAt: dyn.sel ? dyn.sel.at : null, hoverAt: dyn.hover ? dyn.hover.at : null,
            rotY: S.rotY, rotX: S.rotX, zoom: S.zoom,
            // W3: what the camera is framed on, and the coach's tinted fields.
            frame: S.cityFrame || null, target: S.target ? { x: S.target.x, y: S.target.y, z: S.target.z } : null,
            hints: S.cityHintN || 0,
            // W4: the lens in the scene, its glyph batches and the sea sheets.
            lens: d.lens ? d.lens.lens : null,
            tags: (S.cityTags || []).reduce(function (o, tb) { o[tb.glyph] = tb.n; return o; }, {}),
            sheets: (S.citySheets || []).map(function (sh) { return { id: sh.id, y: S.citySheetY[sh.id], to: sh.to }; }),
            sheetEasing: !!S.citySheetAnim, sheetEaseFrames: S.citySheetEaseFrames || 0, sheetSnapped: !!S.citySheetSnapped,
            // W8: the HUD follow's slide.
            frameEasing: !!S.cityFrameAnim, frameEaseFrames: S.cityFrameEaseFrames || 0, frameSnapped: !!S.cityFrameSnapped,
            frameKind: d.frame ? d.frame.kind || null : null,
            // W5: the mission's framed parcels and the fireworks.
            marks: (S.cityMarkIds || []).slice(), markN: S.cityMarkN || 0,
            fw: { playing: !!S.cityFw, visible: !!S.cityFwVisible, frames: S.cityFwFrames || 0,
              seen: S.cityFwSeen == null ? null : S.cityFwSeen, done: S.cityFwDone || 0,
              stopped: S.cityFwStopped || 0, skipped: S.cityFwSkipped || 0, scale: S.cityFwScale || null },
            // W6: the contrast scene's code labels and the scene palette in use.
            codes: S.cityCodeN || 0, codeBatch: !!(S.cityCodes && S.cityCodes.mesh), palette: d.theme || null,
            codesShown: S.cityCodes ? (S.cityCodeVis || 0) : 0,
            project: cityProject, pick: cityPick
          };
        }
      })
    : null;

  // Stable identity. A fresh callback each render makes React tear the viewer
  // down and rebuild it on every state change.
  // W1: the status subscriber is handed over again on every attach. The host
  // drops it a microtask after a real detach, so after a switch to Land use
  // and back, a context loss reached nobody and the board never fell back.
  var CITY_STATUS_FN = null;
  // What the page can see about this device, for renderTier.
  function boardEnv() {
    var env = { viewer: !!CITY_VIEWER, webgl: false, width: 0, reducedMotion: false, cores: undefined, memory: undefined };
    try {
      env.webgl = typeof window.WebGLRenderingContext !== 'undefined';
      env.width = window.innerWidth || 0;
      env.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (typeof navigator !== 'undefined') { env.cores = navigator.hardwareConcurrency; env.memory = navigator.deviceMemory; }
    } catch (_) {}
    return env;
  }
  function cityViewerAttach(node) {
    if (!CITY_VIEWER) return;
    if (node && CITY_STATUS_FN) CITY_VIEWER.onStatusChange(CITY_STATUS_FN);
    CITY_VIEWER.attach(node || null);
  }

  // ===================================================================
  // SECTION 4 - PRESENTATION HELPERS
  // ===================================================================

  var STORE_KEY = 'allo_citylab_plan_v1';

  // How many edits the limited-move challenge grants. Sized so a student
  // cannot shuffle land uses until the dashboard turns green, but can still
  // build a district and the streets to reach it if they plan it first.
  var CHALLENGE_MOVES = 45;

  // How many edits pass between invitations to predict, when the student has
  // not asked to predict every change.
  var PREDICT_EVERY_N = 6;

  // Handles negatives, which matters because the Assumption Lab shows
  // differences. Without the abs() a -7,420,000 delta fell past both
  // thresholds and printed as the raw "$-7420000".
  function fmtMoney(n) {
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    if (a >= 1000000) return sign + '$' + (a / 1000000).toFixed(2) + 'M';
    if (a >= 1000) return sign + '$' + Math.round(a / 1000) + 'k';
    return sign + '$' + Math.round(a);
  }
  function fmtPct(x) { return (x * 100).toFixed(0) + '%'; }
  // Stage D: a value that misses its target must never PRINT as the target
  // ("19.0 C, must be 19.0 C or less: not met"). render(v, extra) formats v
  // with `extra` more decimals; add them until value and target differ.
  function sharpen(render, value, target, met) {
    if (met || typeof value !== 'number' || typeof target !== 'number') return render(value, 0);
    for (var e = 0; e < 4; e++) if (render(value, e) !== render(target, e)) return render(value, e);
    return render(value, 4);
  }
  function fmtMoneyAt(n, e) {
    if (!e) return fmtMoney(n);
    var sign = n < 0 ? '-' : '', a = Math.abs(n);
    if (a >= 1000000) return sign + '$' + (a / 1000000).toFixed(2 + e) + 'M';
    if (a >= 1000) return sign + '$' + (a / 1000).toFixed(e) + 'k';
    return sign + '$' + a.toFixed(e);
  }
  function numAt(n, e) {
    if (!e) return Math.round(n).toLocaleString();
    try { return n.toLocaleString(undefined, { minimumFractionDigits: e, maximumFractionDigits: e }); } catch (_) { return n.toFixed(e); }
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // One literal call per label so the key scanner can see every one.
  function indicatorLabel(id) {
    switch (id) {
      case 'newUnitsServed': return __alloT('stem.citylab.ind_new_units_served', 'New homes a road reaches');
      case 'totalUnitsServed': return __alloT('stem.citylab.ind_total_units_served', 'Total homes a road reaches');
      case 'unitsUnserved': return __alloT('stem.citylab.ind_units_unserved', 'Homes zoned but not reached by a road');
      case 'builtAreaHa': return __alloT('stem.citylab.ind_built_area', 'Built land (ha)');
      case 'farmlandConvertedHa': return __alloT('stem.citylab.ind_farmland_converted', 'Farmland converted (ha)');
      case 'preserveConvertedHa': return __alloT('stem.citylab.ind_preserve_converted', 'Preserve converted (ha)');
      case 'newUnitsInFloodplain': return __alloT('stem.citylab.ind_new_in_floodplain', 'New homes in the floodplain');
      case 'existingUnitsInFloodplain': return __alloT('stem.citylab.ind_existing_in_floodplain', 'Existing homes in the floodplain');
      case 'parkHa': return __alloT('stem.citylab.ind_park_ha', 'Park land (ha)');
      case 'farmHa': return __alloT('stem.citylab.ind_farm_ha', 'Farmland in production (ha)');
      case 'parkAccessPct': return __alloT('stem.citylab.ind_park_access', 'Homes within a 5-minute walk of a park');
      case 'parkAccessPctAsCrowFlies': return __alloT('stem.citylab.ind_park_access_crow', 'The same, measured as the crow flies');
      case 'civicAccessPct': return __alloT('stem.citylab.ind_civic_access', 'Homes within a 10-minute walk of a school or clinic');
      case 'newRoadMetres': return __alloT('stem.citylab.ind_new_road', 'New road built (m)');
      case 'runoffCoefficient': return __alloT('stem.citylab.ind_runoff_c_v2', 'How much rain runs off the land (runoff coefficient C)');
      case 'peakRunoffQ': return __alloT('stem.citylab.ind_peak_q', 'Peak runoff Q (cubic metres per second)');
      case 'baselineRunoffQ': return __alloT('stem.citylab.ind_baseline_q', 'Baseline peak runoff today');
      case 'runoffRatio': return __alloT('stem.citylab.ind_runoff_ratio', 'Runoff versus today');
      case 'capitalCost': return __alloT('stem.citylab.ind_capital_cost', 'Public infrastructure cost');
      case 'population': return __alloT('stem.citylab.ind_population', 'Residents (capacity)');
      case 'parkHaPer1000': return __alloT('stem.citylab.ind_park_per_1000', 'Park hectares per 1,000 residents');
      case 'waterDemandM3PerDay': return __alloT('stem.citylab.ind_water_demand', 'Water demand (cubic metres per day)');
      case 'waterHeadroomM3PerDay': return __alloT('stem.citylab.ind_water_headroom', 'Water left under the safe yield');
      case 'newUnitsInFutureSurge': return __alloT('stem.citylab.ind_new_in_future', 'New homes inside the 2100 surge reach');
      case 'existingUnitsInFutureSurge': return __alloT('stem.citylab.ind_existing_in_future', 'Existing homes inside the 2100 surge reach');
      case 'landAtRiskHa': return __alloT('stem.citylab.ind_land_at_risk', 'Land dry today, inside the 2100 reach (ha)');
      case 'transitAccessPct': return __alloT('stem.citylab.ind_transit_access', 'Homes within a 5-minute walk of a bus stop');
      case 'surfaceHeatC': return __alloT('stem.citylab.ind_surface_heat', 'Surface heat, town average (C above shaded ground)');
      case 'homeSurfaceHeatC': return __alloT('stem.citylab.ind_home_heat', 'Surface heat where the homes are (C above shaded ground)');
      default: return id;
    }
  }

  // The short name a prediction sentence uses ("the runoff coefficient was").
  function predictName(id) {
    switch (id) {
      case 'runoffCoefficient': return __alloT('stem.citylab.pname_runoff', 'runoff coefficient');
      case 'newUnitsServed': return __alloT('stem.citylab.pname_homes', 'number of new homes a road reaches');
      case 'capitalCost': return __alloT('stem.citylab.pname_cost', 'public infrastructure cost');
      case 'parkAccessPct': return __alloT('stem.citylab.pname_park', 'share of homes within a 5-minute walk of a park');
      case 'waterDemandM3PerDay': return __alloT('stem.citylab.pname_water', 'water demand');
      case 'newUnitsInFutureSurge': return __alloT('stem.citylab.pname_future', 'number of new homes inside the 2100 reach');
      case 'surfaceHeatC': return __alloT('stem.citylab.pname_heat', 'town average surface heat');
      default: return indicatorLabel(id);
    }
  }

  // Saved predictions store English direction words; the screen translates.
  function dirLabel(dir) {
    if (dir === 'up') return __alloT('stem.citylab.dir_up', 'up');
    if (dir === 'down') return __alloT('stem.citylab.dir_down', 'down');
    return __alloT('stem.citylab.dir_same', 'about the same');
  }
  function sizeLabel(size) {
    if (size === 'small') return __alloT('stem.citylab.size_small', 'small');
    if (size === 'medium') return __alloT('stem.citylab.size_medium', 'medium');
    if (size === 'large') return __alloT('stem.citylab.size_large', 'large');
    return __alloT('stem.citylab.size_none', 'no change');
  }

  function fmtIndicator(id, v) {
    if (v === undefined || v === null) return '-';
    if (id === 'parkAccessPct' || id === 'parkAccessPctAsCrowFlies' ||
        id === 'civicAccessPct' || id === 'transitAccessPct') return fmtPct(v);
    if (id === 'capitalCost') return fmtMoney(v);
    if (id === 'runoffCoefficient') return v.toFixed(3);
    if (id === 'surfaceHeatC' || id === 'homeSurfaceHeatC') return fmt(__alloT('stem.citylab.fmt_deg_c', '{n} C'), { n: v.toFixed(1) });
    if (id === 'peakRunoffQ' || id === 'baselineRunoffQ') return v.toFixed(2);
    if (id === 'runoffRatio') return fmt(__alloT('stem.citylab.fmt_of_today', '{pct}% of today'), { pct: (v * 100).toFixed(0) });
    if (id === 'parkHaPer1000') return v.toFixed(2);
    return Math.round(v).toLocaleString();
  }

  // A difference is not the same shape as a level. A ratio that moves from
  // 124% to 116% of today has fallen 8 percentage POINTS; rendering that as
  // "-8% of today" would be a different and wrong claim.
  function fmtDelta(id, delta) {
    var sign = delta > 0 ? '+' : '';
    if (id === 'runoffRatio' || id === 'parkAccessPct' ||
        id === 'parkAccessPctAsCrowFlies' || id === 'civicAccessPct' || id === 'transitAccessPct') {
      return fmt(__alloT('stem.citylab.fmt_points', '{n} points'), { n: sign + (delta * 100).toFixed(0) });
    }
    if (id === 'capitalCost') return fmtMoney(delta);
    if (id === 'runoffCoefficient') return sign + delta.toFixed(3);
    if (id === 'surfaceHeatC' || id === 'homeSurfaceHeatC') return fmt(__alloT('stem.citylab.fmt_deg_c', '{n} C'), { n: sign + delta.toFixed(2) });
    if (id === 'peakRunoffQ' || id === 'baselineRunoffQ') return sign + delta.toFixed(2);
    if (id === 'parkHaPer1000') return sign + delta.toFixed(2);
    return sign + Math.round(delta).toLocaleString();
  }

  // A size band edge, in the indicator's own unit, for the prediction card.
  function fmtBand(id, v) {
    if (id === 'parkAccessPct') return fmt(__alloT('stem.citylab.fmt_points', '{n} points'), { n: Math.round(v * 100) });
    if (id === 'capitalCost') return fmtMoney(v);
    if (id === 'runoffCoefficient') return v.toFixed(3);
    if (id === 'surfaceHeatC') return fmt(__alloT('stem.citylab.fmt_deg_c', '{n} C'), { n: v.toFixed(2) });
    return Math.round(v).toLocaleString();
  }

  // Land use never depends on colour alone: each carries a two-letter code
  // and a distinct fill pattern.
  function patternCss(pattern, ink) {
    if (pattern === 'hatch') return 'repeating-linear-gradient(45deg,' + ink + ' 0 1px,transparent 1px 6px)';
    if (pattern === 'cross') return 'repeating-linear-gradient(45deg,' + ink + ' 0 1px,transparent 1px 7px),' +
      'repeating-linear-gradient(-45deg,' + ink + ' 0 1px,transparent 1px 7px)';
    if (pattern === 'vert') return 'repeating-linear-gradient(90deg,' + ink + ' 0 1px,transparent 1px 6px)';
    if (pattern === 'dots') return 'radial-gradient(' + ink + ' 1px, transparent 1.2px)';
    return 'none';
  }

  // ---- Mission copy. Literal keys, numbers through placeholders. -----------
  function missionCopy(mid, planOrId) {
    var sc = scenarioOf(planOrId), tg = missionTargets(planOrId);
    var homes = tg.homes.toLocaleString();
    var hectares = Math.ceil(tg.homes / 60);
    if (mid === 'm_park') {
      return {
        title: __alloT('stem.citylab.m_park_title', 'Fix park access'),
        goal: fmt(__alloT('stem.citylab.m_park_goal', 'Get at least {pct} of homes within a 5-minute walk of a park, measured along streets and paths.'), { pct: fmtPct(tg.park) }),
        hints: [
          __alloT('stem.citylab.m_park_hint1', 'A park counts for a home when it is at most 4 steps of 100 m away along streets or paths.'),
          __alloT('stem.citylab.m_park_hint2', 'Use the star marks on the map: a star means those homes have no park within a 5-minute walk.'),
          __alloT('stem.citylab.m_park_hint3', 'One park near the middle of the old town can cover most of it. Then check the far corners.')
        ],
        reveal: __alloT('stem.citylab.m_park_reveal', 'One way: put a park on open land that a street already reaches, near the middle of the existing homes. Then find the homes still more than 4 steps away and give them a second park or a footpath.')
      };
    }
    if (mid === 'm_bond') {
      return {
        title: __alloT('stem.citylab.m_bond_title', 'Meet the bond'),
        goal: fmt(__alloT('stem.citylab.m_bond_goal', 'Add at least {homes} new homes that a road reaches, and keep public infrastructure cost at or under the {bond} bond.'), { homes: homes, bond: fmtMoney(tg.bond) }),
        hints: [
          __alloT('stem.citylab.m_bond_hint1', 'Homes count only on parcels a road runs into.'),
          __alloT('stem.citylab.m_bond_hint2', 'Mixed use puts 60 homes on one hectare; low density puts 12. Fewer parcels need fewer roads.'),
          __alloT('stem.citylab.m_bond_hint3', 'Open the cost model under the scorecard to see what each line of spending costs.')
        ],
        reveal: __alloT('stem.citylab.m_bond_reveal', 'One way: zone open parcels that existing roads already enter as mixed use (60 homes each, no road to pay for), then add short local roads to the nearest open land. Stay away from the river: every crossing is priced as a bridge.')
      };
    }
    if (mid === 'm_runoff') {
      return {
        title: fmt(__alloT('stem.citylab.m_runoff_title', 'Keep runoff under {pct} of today'), { pct: fmtPct(tg.runoff) }),
        goal: fmt(__alloT('stem.citylab.m_runoff_goal', 'Add at least {homes} new homes that a road reaches, and keep peak runoff at or under {pct} of today.'), { homes: homes, pct: fmtPct(tg.runoff) }),
        hints: [
          __alloT('stem.citylab.m_runoff_hint1', 'Runoff depends on how much of the town is hard surface.'),
          __alloT('stem.citylab.m_runoff_hint2', 'Green infrastructure lowers a parcel\'s runoff coefficient. It costs money, so keep an eye on the bond as well.'),
          __alloT('stem.citylab.m_runoff_hint3', 'Parks and open fields drain like open ground. Building densely on fewer parcels leaves more of them.')
        ],
        reveal: __alloT('stem.citylab.m_runoff_reveal', 'One way: build the homes as mixed use on as few parcels as possible, add green infrastructure to those parcels, and turn one or two open parcels into parks.')
      };
    }
    if (mid === 'm_heat') {
      return {
        title: __alloT('stem.citylab.m_heat_title', 'Keep the new streets cool'),
        goal: fmt(__alloT('stem.citylab.m_heat_goal', 'Add at least {homes} new homes that a road reaches, and keep the surface heat where the homes are at or under {c} C above shaded ground, under the central estimates.'), { homes: homes, c: tg.heat.toFixed(1) }),
        hints: [
          __alloT('stem.citylab.m_heat_hint1', 'Switch the map to Heat. Roofs and pavement in full sun are what get hot; open ground and parks barely do.'),
          __alloT('stem.citylab.m_heat_hint2', 'A cool roof reflects sunlight. It costs the bond nothing, because the building owner pays for it, but it still takes a move.'),
          __alloT('stem.citylab.m_heat_hint3', 'Green infrastructure adds tree canopy, and shade cools the pavement under it. Density with shade and cool roofs can stay cooler than you might expect.')
        ],
        reveal: __alloT('stem.citylab.m_heat_reveal', 'One way: build the homes as mid density with a cool roof on every new parcel. If you use mixed use instead, it needs both cool roofs and green infrastructure on every new parcel.')
      };
    }
    if (sc.modelsWater) {
      return {
        title: __alloT('stem.citylab.m_water_title', 'Stay inside the aquifer'),
        goal: fmt(__alloT('stem.citylab.m_water_goal', 'Add at least {homes} new homes that a road reaches, and keep total water demand within the safe yield of {yield} cubic metres a day.'), { homes: homes, yield: sc.aquiferYieldM3PerDay.toLocaleString() }),
        hints: [
          __alloT('stem.citylab.m_water_hint1', 'Open the water model: residents, farms and parks all draw on the same aquifer.'),
          __alloT('stem.citylab.m_water_hint2', 'One hectare of irrigated farmland draws as much water as dozens of homes.'),
          __alloT('stem.citylab.m_water_hint3', 'Retiring a little farmland frees water. The full brief still asks you to keep at least 12 hectares.')
        ],
        reveal: __alloT('stem.citylab.m_water_reveal', 'One way: build mixed use on the dry scrub east of the wash, in columns G to I, and retire two or three hectares of irrigated farmland to scrub to free its water.')
      };
    }
    if (sc.modelsSeaRise) {
      return {
        title: __alloT('stem.citylab.m_future_title', 'Build above the 2100 line'),
        goal: fmt(__alloT('stem.citylab.m_future_goal', 'Add at least {homes} new homes that a road reaches, with none of them inside the reach planned for 2100 under the conservative estimates.'), { homes: homes }),
        hints: [
          __alloT('stem.citylab.m_future_hint1', 'Switch the map to Height: pale is higher ground.'),
          __alloT('stem.citylab.m_future_hint2', 'The 2100 reach is widest under the conservative estimates. Plan for that one.'),
          __alloT('stem.citylab.m_future_hint3', 'The highest ground is in the top rows. A road up column A reaches it from the main street.')
        ],
        reveal: __alloT('stem.citylab.m_future_reveal', 'One way: build on the highest ground, rows 1 and 2, reached by a new road up column A from the main street, and keep every new home off the low ground.')
      };
    }
    return {
      title: __alloT('stem.citylab.m_land_title', 'Keep the farms and the wetland'),
      goal: fmt(__alloT('stem.citylab.m_land_goal', 'Add at least {homes} new homes that a road reaches, convert no more than {farm} hectares of farmland, and build on none of the wetland.'), { homes: homes, farm: sc.farmlandCeilingHa || 15 }),
      hints: [
        __alloT('stem.citylab.m_land_hint1', 'Farmland and wetland carry the codes Fm and Pr on the map.'),
        __alloT('stem.citylab.m_land_hint2', 'The west bank has open fields north and south of the old town.'),
        fmt(__alloT('stem.citylab.m_land_hint3', 'Count it out: {homes} homes at 60 a hectare needs about {ha} hectares of mixed use.'), { homes: homes, ha: hectares })
      ],
      reveal: __alloT('stem.citylab.m_land_reveal', 'One way: put the new homes on the open fields of the west bank, north and south of the old town, reached from column D and the main street, and leave the farms and the wetland alone.')
    };
  }

  // One sentence per mission condition, with the live value and the target.
  function condSentence(c) {
    var pctAt = function (v, e) { return (v * 100).toFixed(e) + '%'; };
    // c.value is the student's own result, so it is sharpened by its own verdict.
    var near = function (render) { return sharpen(render, c.value, c.target, c.ownMet === undefined ? c.met : c.ownMet); };
    switch (c.k) {
      case 'park': return fmt(__alloT('stem.citylab.cond_park', 'Homes within a 5-minute walk of a park: {value} (needs {target} or more).'), { value: near(pctAt), target: fmtPct(c.target) });
      case 'homes': return fmt(__alloT('stem.citylab.cond_homes', 'New homes a road reaches: {value} (needs {target} or more).'), { value: Math.round(c.value).toLocaleString(), target: Math.round(c.target).toLocaleString() });
      case 'cost': return fmt(__alloT('stem.citylab.cond_cost', 'Public infrastructure cost: {value} (must be {target} or less).'), { value: near(fmtMoneyAt), target: fmtMoney(c.target) });
      case 'runoff': return fmt(__alloT('stem.citylab.cond_runoff', 'Peak runoff: {value} of today (must be {target} or less).'), { value: near(pctAt), target: fmtPct(c.target) });
      case 'water': return fmt(__alloT('stem.citylab.cond_water', 'Water demand: {value} cubic metres a day (must be {target} or less).'), { value: near(numAt), target: Math.round(c.target).toLocaleString() });
      case 'future': return fmt(__alloT('stem.citylab.cond_future', 'New homes inside the 2100 reach under the conservative estimates: {value} (must be 0).'), { value: Math.round(c.value) });
      case 'farm': return fmt(__alloT('stem.citylab.cond_farm', 'Farmland converted: {value} ha (must be {target} or less).'), { value: c.value, target: c.target });
      case 'preserve': return fmt(__alloT('stem.citylab.cond_preserve', 'Wetland built on: {value} ha (must be 0).'), { value: c.value });
      case 'heat': return fmt(__alloT('stem.citylab.cond_heat', 'Surface heat where the homes are, under the central estimates: {value} C (must be {target} C or less).'), { value: near(function (v, e) { return v.toFixed(1 + e); }), target: c.target.toFixed(1) });
      default: return c.k;
    }
  }

  // Stage E: said plainly when a condition passes only under the student's set.
  function condStandardNote(c) {
    return fmt(__alloT('stem.citylab.cond_standard_only', 'That is met under your assumption set, but every mission is also checked under the central estimates, and there it is not met: {sentence}'),
      { sentence: condSentence({ k: c.k, target: c.target, value: c.standardValue, met: false }) });
  }
  function condLine(c) { return condSentence(c) + (c.standardOnly ? ' ' + condStandardNote(c) : ''); }

  // Named misconceptions: a short name and what to do about it.
  function misconceptionCopy(id) {
    switch (id) {
      case 'road_next_door': return { name: __alloT('stem.citylab.mis_next_door_name', 'A road next door is not a road in'),
        text: __alloT('stem.citylab.mis_next_door', 'Some new homes sit beside a road, but no road runs into their parcel. In this model a road serves only the parcels it enters, so those homes are not counted yet. Build one connection into the parcel.') };
      case 'unreached_homes': return { name: __alloT('stem.citylab.mis_unreached_name', 'Homes with no road'),
        text: __alloT('stem.citylab.mis_unreached', 'Some new homes have no road anywhere near them, so they are not counted. Homes count only when a road from the town centre reaches their parcel.') };
      case 'crow_flies': return { name: __alloT('stem.citylab.mis_crow_name', 'As the crow flies'),
        text: __alloT('stem.citylab.mis_crow', 'The park looks close on the map, and in a straight line it would be. People walk along streets and paths, and along those it is more than 5 minutes. Add a path or move the park.') };
      case 'park_off_network': return { name: __alloT('stem.citylab.mis_lonely_park_name', 'A park nobody can walk into'),
        text: __alloT('stem.citylab.mis_lonely_park', 'A park with no street or path into it is close to nobody. Connect it.') };
      case 'no_park': return { name: __alloT('stem.citylab.mis_no_park_name', 'No park yet'),
        text: __alloT('stem.citylab.mis_no_park', 'There is no park on the map yet, so no home has one nearby.') };
      case 'bridge_cost': return { name: __alloT('stem.citylab.mis_bridge_name', 'Bridges are expensive'),
        text: fmt(__alloT('stem.citylab.mis_bridge', 'Every road that touches the river is priced as a bridge, about {cost} each before scaling. One crossing can take a large share of the bond.'), { cost: fmtMoney(COSTS.bridge_road) }) };
      case 'civic_cost': return { name: __alloT('stem.citylab.mis_civic_name', 'Buildings on the bond'),
        text: fmt(__alloT('stem.citylab.mis_civic', 'A new civic building costs about {cost} from the bond. Check whether this mission needs one.'), { cost: fmtMoney(COSTS.civic_each) }) };
      case 'road_cost': return { name: __alloT('stem.citylab.mis_road_name', 'Roads add up'),
        text: fmt(__alloT('stem.citylab.mis_road', 'Each 100 m of new local road costs about {cost}. Homes on parcels a road already enters need no new road at all.'), { cost: fmtMoney(COSTS.road_local) }) };
      case 'hard_surfaces': return { name: __alloT('stem.citylab.mis_hard_name', 'Hard surfaces shed water'),
        text: __alloT('stem.citylab.mis_hard', 'Roofs and pavement send rain straight off. Green infrastructure, keeping parks and open land, or building on fewer parcels lowers the runoff coefficient.') };
      case 'thirsty_farms': return { name: __alloT('stem.citylab.mis_farms_name', 'The farms drink first'),
        text: __alloT('stem.citylab.mis_farms', 'Irrigated farmland draws far more water per hectare than homes do. More homes fit inside the safe yield only if some of that water is freed.') };
      case 'dry_today': return { name: __alloT('stem.citylab.mis_dry_today_name', 'Dry today is not dry in 2100'),
        text: __alloT('stem.citylab.mis_dry_today', 'Some new homes are on ground that is dry today but inside the reach planned for 2100. Look at the Height view: the higher ground is to the north-west.') };
      case 'land_taken': return { name: __alloT('stem.citylab.mis_land_name', 'Land you cannot get back'),
        text: __alloT('stem.citylab.mis_land', 'Farmland or wetland was built on beyond what this mission allows. Look for open fields first.') };
      case 'heat_dark_roofs': return { name: __alloT('stem.citylab.mis_dark_roofs_name', 'Dark roofs soak up the sun'),
        text: __alloT('stem.citylab.mis_dark_roofs', 'None of the new homes has a cool roof. A dark roof in summer sun gets far hotter than the air. A cool roof reflects most of that sunlight, costs the bond nothing, and is often the biggest single change you can make.') };
      case 'heat_no_shade': return { name: __alloT('stem.citylab.mis_no_shade_name', 'No shade over the pavement'),
        text: __alloT('stem.citylab.mis_no_shade', 'None of the new homes has green infrastructure, so the streets and car parks around them sit in full sun. Trees shade the hard surface under them, and shaded pavement stays much cooler.') };
      // Stage C: the hearing names its two misconceptions the same way.
      case 'hearing_talking_past': return { name: __alloT('stem.citylab.mis_talking_past_name', 'Talking past them'),
        text: __alloT('stem.citylab.mis_talking_past', 'An answer lands only if it speaks to what this person cares about. A number they never look at, however good it is, answers a different question. Their numbers are marked in the list.') };
      case 'hearing_no_evidence': return { name: __alloT('stem.citylab.mis_no_evidence_name', 'A claim with nothing under it'),
        text: __alloT('stem.citylab.mis_no_evidence', 'At a hearing, "trust me" loses to one number. Pick a number from the scorecard that shows what your plan does about their worry.') };
      default: return { name: id, text: '' };
    }
  }

  // ===================================================================
  // SECTION 5 - REGISTRATION
  // ===================================================================

  window.StemLab.registerTool('cityLab', {
    icon: '🏙️',
    label: 'City Planning Lab',
    // This string is not decoration: dev-tools/build_tool_index.cjs harvests it
    // into the capability index, which is how STEM Lab search finds features
    // that live INSIDE a tool. It has to name what the tool actually teaches.
    // ONE literal, under the harvester's 320-character cap (see the design
    // doc, section on the tool index), with the search terms near the front.
    desc: 'Plan a town under conflicting constraints: Riverbend stormwater and a bond, Mesa Hollow a fixed aquifer, Harborlight sea level rise to 2100. Runoff, walk access, bus stops, urban heat island, cool roofs, equity gaps, redlining and urban renewal history, a stakeholder hearing, 3D model, missions, a described map.',
    color: 'teal',
    category: 'engineering',
    gradeRange: '6-12',
    // Search terms are the only way a teacher finds this among 147 tools, and
    // the list predated three of the five models. Anything the tool actually
    // teaches belongs here, including the towns by name.
    aliases: ['urban planning', 'city planning', 'city builder', 'zoning', 'land use', 'town planning',
      'walkability', 'stormwater', 'runoff', 'floodplain', 'density', 'infrastructure', 'trade-offs',
      'constraints', 'civics', 'geography', 'planning', 'rational method', 'hydrology',
      'sea level rise', 'sea level', 'storm surge', 'coastal', 'managed retreat', 'climate adaptation',
      'water supply', 'aquifer', 'groundwater', 'drought', 'water rights', 'irrigation',
      'housing', 'affordable housing', 'transport', 'walk score', 'green infrastructure',
      'redlining', 'urban renewal', 'displacement', 'gentrification', 'land use history',
      'uncertainty', 'assumptions', 'sensitivity analysis', 'decision making',
      'riverbend', 'mesa hollow', 'harborlight', '3d city', 'massing',
      'urban heat island', 'heat island', 'cool roofs', 'tree canopy', 'surface temperature',
      'public transit', 'bus stop', 'walk shed', 'mode share', 'equity', 'access to services',
      'stakeholders', 'debate', 'counter-argument', 'sonification', 'described map'],

    models: window.__alloCityLabPure,

    // Labels are read when the quest list renders, so they translate.
    questHooks: [
      { id: 'city_units', get label() { return __alloT('stem.citylab.quest_units', 'Meet your town\'s housing target on streets that reach the homes'); }, icon: '🏠',
        check: function (d) { return !!(d && d.metUnits); } },
      { id: 'city_all_hard', get label() { return __alloT('stem.citylab.quest_all_hard', 'Meet every required part of a town\'s brief at once'); }, icon: '✅',
        check: function (d) { return !!(d && d.metAllHard); } },
      { id: 'city_assumptions', get label() { return __alloT('stem.citylab.quest_assumptions', 'Run your plan under two assumption sets'); }, icon: '⚖️',
        check: function (d) { return !!(d && d.comparedSets); } },
      { id: 'city_robust', get label() { return __alloT('stem.citylab.quest_robust', 'Find a conclusion that holds under both sets'); }, icon: '🔍',
        check: function (d) { return !!(d && d.foundRobust); } },
      { id: 'city_predict', get label() { return __alloT('stem.citylab.quest_predict', 'Predict the effect of three changes before you make them'); }, icon: '🎯',
        check: function (d) { return !!(d && (d.predictions || 0) >= 3); } },
      { id: 'city_memo', get label() { return __alloT('stem.citylab.quest_memo', 'Write the memo naming the trade-off you accepted'); }, icon: '📝',
        check: function (d) { return !!(d && d.memoDone); } }
    ],

    render: function (ctx) {
      try { __alloCtx_citylab = ctx; } catch (e) {}
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; }; // extraction anchor: the codemod requires a ctx.t-shaped init
      t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; }; // robust: a host t() that returns undefined or the raw key on a pack miss (see stem_tool_geologyexplorer.js's note) must still yield the English fallback
      var announceToSR = ctx.announceToSR || function () {};
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var isDark = ctx.theme !== 'light';
      var isTeacher = ctx.isTeacherMode === true;
      // ★isDark answers "is the APP theme dark". Almost nothing here needs that.
      // In dark theme the host wraps the tool in a WHITE card (stem_lab_module.js
      // ~1633) and this tool paints only TRANSLUCENT panels over it -- its dark
      // panelBg is rgba(148,163,184,0.08), i.e. essentially the card -- so the dark
      // inks #e2e8f0 / #94a3b8 landed on white: 143 nodes, 1.15-2.56:1, the tool
      // title among them. What the tokens actually need is "is my SUBSTRATE dark",
      // which is true only in contrast mode, where the host keeps a black surface.
      // The one exception is the map canvas below, an opaque surface this tool
      // paints itself; that stays on isDark.
      var onDark = ctx.theme === 'contrast';

      var d = (ctx.toolData && ctx.toolData._cityLab) || {};
      var teacher = teacherSettings(d.teacher);

      // Every hook is declared unconditionally, before any branching. A hook
      // after a render-time conditional is the TDZ crash class that has bitten
      // other tools in this lab on navigation.
      //
      // The plan is saved in toolData (it travels with a project save) and in
      // localStorage (a convenience on this machine). toolData wins when both
      // exist; a localStorage-only plan is migrated into toolData by the save
      // effect below. Both go through restorePlan, the same gate an imported
      // file goes through, so an unknown land use can never reach the board.
      // Stage E: this machine's copy may be another student's (a shared
      // computer, a new project). Nothing on the device says whose it is, so
      // a copy holding any work opens marked imported (no XP, the file-import
      // rule) and the student is told. A project reload never gets here.
      var openedFromDevice = false;
      var stPlan = React.useState(function () {
        var fromProject = d.plan ? restorePlan(d.plan) : null;
        if (fromProject) return fromProject;
        try {
          var raw = window.localStorage.getItem(STORE_KEY);
          if (raw) {
            var saved = restorePlan(raw);
            if (saved && planHasWork(saved)) { saved.imported = true; openedFromDevice = true; }
            else if (saved) delete saved.imported;   // the bare town is nobody's work
            if (saved) return saved;
          }
        } catch (_) { /* corrupt or unavailable storage falls back to a fresh plan */ }
        return basePlan(teacher.lockTown || undefined);
      });
      var plan = stPlan[0], setPlan = stPlan[1];
      var scen = scenarioOf(plan);

      var stTab = React.useState('design');
      var tab = stTab[0], setTab = stTab[1];
      var stSel = React.useState(function () { return scenarioOf(stPlan[0]).coreParcel; });
      var selected = stSel[0], setSelected = stSel[1];
      var stRoadKind = React.useState('local');
      var roadKind = stRoadKind[0], setRoadKind = stRoadKind[1];
      var stOpenModel = React.useState('');
      var openModel = stOpenModel[0], setOpenModel = stOpenModel[1];
      var stCmpA = React.useState('conservative');
      var cmpAOwn = stCmpA[0], setCmpA = stCmpA[1];
      var stCmpB = React.useState('optimistic');
      var cmpBOwn = stCmpB[0], setCmpB = stCmpB[1];
      var stCompared = React.useState(false);
      var compared = stCompared[0], setCompared = stCompared[1];
      // The staged edit waiting for a prediction: { op, message } or null.
      var stPredict = React.useState(null);
      var staged = stPredict[0], setStaged = stPredict[1];
      var stPredictResult = React.useState('');
      var predictResult = stPredictResult[0], setPredictResult = stPredictResult[1];
      // Edit count at the last prediction. Null until the first edit sets it.
      var checkpointRef = React.useRef(null);
      // Undo history holds whole plans. They are pure data and small, so this
      // is a plain array rather than a diff log, and it cannot drift from the
      // plan it describes.
      var stHist = React.useState({ past: [], future: [] });
      var hist = stHist[0], setHist = stHist[1];
      // The caller owns the camera, so it lives here. Omit any of these from a
      // push and the scene freezes at its opening angle.
      // W3: and the FRAME it looks at, which starts on the town's buildings.
      var stCam = React.useState(function () { return { rotY: 34, rotX: 26, zoom: 1, frame: townFrame(stPlan[0]) }; });
      var cam = stCam[0], setCam = stCam[1];
      var stFull = React.useState(false);
      var fullscreen = stFull[0], setFullscreen = stFull[1];
      // The 68vh growth below was the whole of 'full screen' here: on a laptop it
      // left the model in a window, and inside the Canvas embed it was the only
      // thing a student got. The stage now goes to the shared helper as well, so
      // this really fills the screen; the flag still drives the taller layout and
      // the button label, and now follows the helper rather than only the click.
      var cityFsRef = React.useRef(null);
      var stGl = React.useState(CITY_VIEWER ? CITY_VIEWER.status() : 'failed');
      var glStatus = stGl[0], setGlStatus = stGl[1];
      var dragRef = React.useRef(null);
      // 'use' | 'elevation' | 'model' | 'heat' | 'access'. W1: the student's
      // last choice (toolData.boardView) wins; otherwise 3D on a wide, capable
      // device and the map everywhere else (DECISIONS.md #1).
      var stBoardView = React.useState(function () { return defaultBoardView(boardEnv(), d.boardView); });
      var boardView = stBoardView[0], setBoardView = stBoardView[1];
      // Declared here, not inside modelView(): that function returns early when
      // WebGL is unavailable, so an effect below the branch would change the hook
      // count between renders ("Rendered more hooks than during the previous render").
      React.useEffect(function () {
        var el = cityFsRef.current;
        if (!el || typeof MutationObserver !== 'function') return;
        var sync = function () {
          setFullscreen(!!(el.hasAttribute('data-allo-fullscreen-active')
            || document.fullscreenElement === el
            || document.webkitFullscreenElement === el));
        };
        var mo = new MutationObserver(sync);
        mo.observe(el, { attributes: true, attributeFilter: ['data-allo-fullscreen-active'] });
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        sync();
        return function () {
          mo.disconnect();
          document.removeEventListener('fullscreenchange', sync);
          document.removeEventListener('webkitfullscreenchange', sync);
        };
      }, [boardView, glStatus]);
      var stShortcuts = React.useState(false);
      var showShortcuts = stShortcuts[0], setShowShortcuts = stShortcuts[1];
      // Held in memory only, never in localStorage. Persisting a class set
      // would leave other students' work sitting on a shared machine.
      var stClass = React.useState([]);
      var classSet = stClass[0], setClassSet = stClass[1];
      var stClassNote = React.useState('');
      var classNote = stClassNote[0], setClassNote = stClassNote[1];
      var stImportNote = React.useState('');
      var importNote = stImportNote[0], setImportNote = stImportNote[1];
      var stConfirmReset = React.useState(false);
      var confirmReset = stConfirmReset[0], setConfirmReset = stConfirmReset[1];
      // Added 2026-11-03. Declared after every older hook so the render
      // tests that swap the first 'design' and first `false` state still
      // reach the tab and the comparison flag.
      var stPredInd = React.useState('runoffCoefficient');
      var predInd = stPredInd[0], setPredInd = stPredInd[1];
      var stPredSize = React.useState('');
      var predSize = stPredSize[0], setPredSize = stPredSize[1];
      var stMissionNote = React.useState(null);     // { mid, met, conds, misconceptions }
      var missionNote = stMissionNote[0], setMissionNote = stMissionNote[1];
      var stMemoNote = React.useState('');
      var memoNote = stMemoNote[0], setMemoNote = stMemoNote[1];
      var stExportNote = React.useState('');
      var exportNote = stExportNote[0], setExportNote = stExportNote[1];
      var stTeacherOpen = React.useState(true);
      var teacherOpen = stTeacherOpen[0], setTeacherOpen = stTeacherOpen[1];
      var stBudgetDraft = React.useState('');
      var budgetDraft = stBudgetDraft[0], setBudgetDraft = stBudgetDraft[1];
      // XP ids already paid in this session, in case toolData lags a render.
      var xpPaidRef = React.useRef({});
      // Stage B (2026-11-03), declared after every older hook for the same
      // reason as the block above.
      var stDescribe = React.useState(false);
      var describeOpen = stDescribe[0], setDescribeOpen = stDescribe[1];
      var stSoundNote = React.useState('');
      var soundNote = stSoundNote[0], setSoundNote = stSoundNote[1];
      // { ctx, nodes, timer } while tones are playing. Torn down on unmount.
      var audioRef = React.useRef(null);
      React.useEffect(function () {
        return function () { stopTones(true); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // Stage C (2026-11-03), declared after every older hook for the same
      // reason as the blocks above.
      var stPathOpen = React.useState(true);
      var pathOpen = stPathOpen[0], setPathOpen = stPathOpen[1];
      var stExampleOpen = React.useState(false);       // the worked example, reopened from the path
      var exampleOpen = stExampleOpen[0], setExampleOpen = stExampleOpen[1];
      var stLabPred = React.useState('');               // '' | 'none' | requirement id
      var labPred = stLabPred[0], setLabPred = stLabPred[1];
      var stLabPredNote = React.useState('');
      var labPredNote = stLabPredNote[0], setLabPredNote = stLabPredNote[1];
      // Stage E, after every older hook: true when this mount opened the
      // device's saved plan (set by the plan initializer in this same render).
      var stDevicePlan = React.useState(function () { return openedFromDevice; });
      var devicePlanNote = stDevicePlan[0] && !!plan.imported;
      // An element id to focus once the next render has put it on screen.
      var pendingFocusRef = React.useRef(null);
      React.useEffect(function () {
        var id = pendingFocusRef.current;
        if (!id || typeof document === 'undefined') return;
        var node = document.getElementById(id);
        if (node && node.focus) { pendingFocusRef.current = null; try { node.focus(); } catch (_) {} }
      });
      // Review 11-05: the answer to a press can land below the fold (Check's verdict, 1 line off a 844 px phone; the predict
      // card, 2,300 px below the map). Bring it into view without moving focus; never in full screen, where the HUD holds it.
      var revealRef = React.useRef(null);
      React.useEffect(function () {
        var sel = revealRef.current;
        if (!sel || typeof document === 'undefined') return;
        revealRef.current = null;
        var node = fullscreen ? null : document.querySelector(sel);
        if (node && node.scrollIntoView) { try { node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {} }
      });
      // W1 (2026-11-04), after every older hook: the 3D board.
      var stTool = React.useState('inspect');           // a STAGE_TOOL_IDS entry
      var tool = stTool[0], setTool = stTool[1];
      var stRoadFrom = React.useState(null);            // first parcel of a road or path
      var roadFrom = stRoadFrom[0], setRoadFrom = stRoadFrom[1];
      var stHover = React.useState(null);
      var hover = stHover[0], setHover = stHover[1];
      var stGlLost = React.useState(false);             // fell back after the model was live
      var glLost = stGlLost[0], setGlLost = stGlLost[1];
      var stStageFocus = React.useState(false);
      var stageFocus = stStageFocus[0], setStageFocus = stStageFocus[1];
      var stStageNote = React.useState('');
      var stageNote = stStageNote[0], setStageNote = stStageNote[1];
      // The map's edit note sticks to the bottom of the view (mapEditNote). Keep the parcel being worked on clear of it,
      // for a tap and for the arrow keys alike (WCAG 2.4.11).
      React.useEffect(function () {
        if (!stageNote || fullscreen || boardView === 'model' || typeof document === 'undefined') return;
        var note = document.querySelector('[data-citylab-stage-note]'), cell = document.getElementById('citylab-parcel-' + selected);
        if (!note || !cell) return;
        var over = cell.getBoundingClientRect().bottom + 6 - note.getBoundingClientRect().top;
        if (over <= 0) return;
        for (var box = note.parentElement; box; box = box.parentElement) {
          var oy = window.getComputedStyle(box).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) { box.scrollTop += over; return; }
        }
      }, [stageNote, selected]);
      var stageRef = React.useRef(null);
      var pointersRef = React.useRef({});
      var glWasReadyRef = React.useRef(false);
      // W2 (2026-11-04), after every older hook: the city responds.
      var stRM = React.useState(function () { return cityReducedMotion(); });
      var reducedMotion = stRM[0], setReducedMotion = stRM[1];
      var stSlow = React.useState(false);               // the frame watchdog turned motion off
      var slow = stSlow[0], setSlow = stSlow[1];
      var stChips = React.useState(null);               // deltaChips of the last applied edit
      var lastChips = stChips[0], setLastChips = stChips[1];
      var stCamMore = React.useState(false);            // phones: the "More camera" disclosure
      var camMore = stCamMore[0], setCamMore = stCamMore[1];
      // The plan the scene last saw, and what grew between it and this one.
      var growRef = React.useRef({ plan: null, token: 0, ids: [], edges: [], at: 0 });
      var slowCbRef = React.useRef(null);
      // W3 (2026-11-04), after every older hook: the first two minutes.
      var stOptions = React.useState(false);            // the Options disclosure
      var optionsOpen = stOptions[0], setOptionsOpen = stOptions[1];
      // The coach: 0 = not showing, else the step (1-3). Shown once per
      // student: a closed or finished coach is remembered in toolData
      // (coachOff), and a plan that already has work never opens it.
      var stCoach = React.useState(function () {
        var p0 = stPlan[0];
        return (!d.coachOff && !(p0 && p0.imported) && !planHasWork(p0)) ? 1 : 0;
      });
      var coachStep = stCoach[0], setCoachStep = stCoach[1];
      var stCoachInfo = React.useState(null);           // what the student's homes did (step 3)
      var coachInfo = stCoachInfo[0], setCoachInfo = stCoachInfo[1];
      var coachPlanRef = React.useRef(null);
      var stPathPeek = React.useState(false);           // Start here, opened while the coach runs
      var pathPeek = stPathPeek[0], setPathPeek = stPathPeek[1];
      var stMoreUses = React.useState(false);           // the palette's "More uses"
      var moreUses = stMoreUses[0], setMoreUses = stMoreUses[1];
      var stFullScore = React.useState(false);          // K-5: the full scorecard disclosure
      var fullScore = stFullScore[0], setFullScore = stFullScore[1];
      // W4 (2026-11-04), after every older hook: the lens BOTH boards show.
      // On the map, boardView is the lens itself (as saved before W4); on the
      // 3D board boardView is 'model' and the lens is kept here and in toolData.
      var stLens = React.useState(function () {
        var bv = stBoardView[0];
        if (bv !== 'model' && LENS_IDS.indexOf(bv) !== -1) return bv;
        return LENS_IDS.indexOf(d.lens) !== -1 ? d.lens : 'use';
      });
      var lensSt = stLens[0], setLensSt = stLens[1];
      var lens = boardView === 'model' ? lensSt : (LENS_IDS.indexOf(boardView) !== -1 ? boardView : 'use');
      // Subscribed live, removed on unmount; the scene ALSO reads it per frame.
      // Its OWN MediaQueryList, not the scene's: Chromium updates an MQL's
      // cached value whenever `.matches` is read, so the list the frame reads
      // every frame never fires `change` (measured, 2026-11-04).
      React.useEffect(function () {
        var mq = null;
        try {
          mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        } catch (_) { mq = null; }
        if (!mq) return undefined;
        var on = function () { setReducedMotion(!!mq.matches); };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', on);
        else if (typeof mq.addListener === 'function') mq.addListener(on);
        on();
        return function () {
          if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', on);
          else if (typeof mq.removeListener === 'function') mq.removeListener(on);
        };
      }, []);
      var sceneTheme = ctx.theme === 'contrast' ? 'contrast' : (isDark ? 'dark' : 'light');
      // W6: under 768 px the tabs, the lens bar and the palette are each one
      // row that scrolls sideways, so the board is not pushed down the page.
      var narrowUi = typeof window !== 'undefined' && window.innerWidth < 768;
      // T2 animates; T1 (reduced motion, a low-power device) and the student's
      // own switch keep the city still; the watchdog can drop T2 to still.
      var rmNow = reducedMotion || cityReducedMotion();
      var motionTier = renderTier(Object.assign(boardEnv(), { reducedMotion: rmNow }));
      var motionOn = motionTier === 'T2' && !d.motionOff && !slow;
      // The 3D board is live: the predict card docks beside the stage.
      var stageLive = boardView === 'model' && !!CITY_VIEWER && glStatus !== 'failed' && !glLost;
      // A lost context drops the board to the map with focus kept on the
      // selected parcel; a restore offers "Back to 3D" rather than moving the
      // view out from under the student.
      React.useEffect(function () {
        if (glStatus === 'ready') {
          if (glLost) announceToSR(t('stem.citylab.sr_gl_back', 'The 3D model is available again. Press Back to 3D to return to it.'));
          glWasReadyRef.current = true;
          return;
        }
        if (glStatus !== 'failed' || !glWasReadyRef.current || glLost) return;
        setGlLost(true);
        setRoadFrom(null); setHover(null);
        if (boardView !== 'model' || typeof document === 'undefined') return;
        // Hunt: in full screen the stage (and the HUD on it) would stay over the
        // page with nothing to press: leave full screen so the map is reachable.
        var fsEl = cityFsRef.current;
        if (fsEl && ((fsEl.hasAttribute && fsEl.hasAttribute('data-allo-fullscreen-active'))
            || document.fullscreenElement === fsEl || document.webkitFullscreenElement === fsEl)) {
          if (typeof window.__alloStemFS === 'function') { try { window.__alloStemFS(fsEl); } catch (_) {} }
        } else if (fullscreen) setFullscreen(false);
        var ae = document.activeElement;
        if (!ae || ae === document.body || (stageRef.current && stageRef.current.contains(ae))) {
          pendingFocusRef.current = 'citylab-parcel-' + selected;
        }
        announceToSR(fmt(t('stem.citylab.sr_gl_lost', 'The 3D model stopped working on this device. Nothing is lost: the map shows the same plan, and parcel {parcel} is selected.'), { parcel: selected }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [glStatus]);
      // Zoom on Ctrl + wheel (and trackpad pinch, which arrives as one). A
      // plain wheel scrolls the page: a stage that swallowed it would be the
      // same scroll trap touch-action: none was. Native, non-passive listener,
      // because React's wheel handler cannot preventDefault.
      React.useEffect(function () {
        var el = stageRef.current;
        if (!el || typeof el.addEventListener !== 'function') return;
        var onWheel = function (e) {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          orbit(0, 0, e.deltaY < 0 ? 1.1 : 1 / 1.1);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return function () { el.removeEventListener('wheel', onWheel, { passive: false }); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [boardView, glStatus, glLost, tab]);

      var cmpA = teacher.lockSets ? teacher.setA : cmpAOwn;
      var cmpB = teacher.lockSets ? teacher.setB : cmpBOwn;
      var predictEvery = teacher.predictEvery || !!d.predictEvery;
      var level = startingLevel(ctx.gradeBand, d.level, teacher.level);
      var hearingActive = hearingOn(ctx.gradeBand, d.hearing, teacher.hearing);
      // W3: K-2 and 3-5 see a picture palette and a short scorecard by
      // default; the teacher's setting wins. Presentation only.
      var simpleView = simpleViewOn(ctx.gradeBand, teacher.simple);
      var coachFieldIds = coachStep ? coachFields(plan) : [];

      // W3: the coach moves on only when the STUDENT acts. Step 1 is done
      // when they select a field a road runs into; step 2 when an edit of
      // theirs puts homes a road reaches on the map (on any surface, and
      // after a prediction if one was due). The coach itself changes nothing.
      React.useEffect(function () {
        if (coachStep === 1 && coachFieldIds.indexOf(selected) !== -1) setCoachStep(2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [selected, coachStep]);
      React.useEffect(function () {
        var prev = coachPlanRef.current;
        coachPlanRef.current = plan;
        if (!prev || prev === plan || (coachStep !== 1 && coachStep !== 2)) return;
        if (prev.scenarioId !== plan.scenarioId) return;
        var a = scorecard(prev, prev.assumptionSetId), b = scorecard(plan, plan.assumptionSetId);
        if (!(b.tier1.newUnitsServed > a.tier1.newUnitsServed)) return;
        var v = deltaValues(a, b);
        setCoachInfo({
          homes: v.dUnits,
          figures: livingCity(plan, plan.assumptionSetId).people.length - livingCity(prev, prev.assumptionSetId).people.length,
          cFrom: a.tier2.runoffCoefficient, cTo: b.tier2.runoffCoefficient
        });
        setCoachStep(3);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [plan]);

      function upd(patch) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._cityLab) || {}, patch);
          var next = Object.assign({}, prev);
          next._cityLab = cur;
          return next;
        });
      }
      // For nested records (xpAwarded, missions, teacher): the patch is built
      // from the latest stored value, never from this render's copy.
      function updWith(fn) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._cityLab) || {});
          Object.assign(cur, fn(cur) || {});
          var next = Object.assign({}, prev);
          next._cityLab = cur;
          return next;
        });
      }

      // Once per id, ever: the toolData record survives reloads and project
      // saves, the ref covers the gap before toolData comes back round.
      function awardOnce(id, points, reason) {
        // Every award here is for THIS plan (missions, memo, hearing, lab,
        // brief), and an imported file is somebody's finished work: it earns
        // none of them, the same rule briefXpEligible applies to the brief.
        if (plan && plan.imported) return false;
        if (xpPaidRef.current[id] || (d.xpAwarded && d.xpAwarded[id])) return false;
        xpPaidRef.current[id] = true;
        if (typeof ctx.awardXP === 'function') {
          try { ctx.awardXP(id, points, reason); } catch (_) {}
        }
        updWith(function (cur) {
          var paid = Object.assign({}, cur.xpAwarded || {});
          paid[id] = true;
          return { xpAwarded: paid };
        });
        return true;
      }

      // ---- Tones. Only ever started by a button, never on their own, and
      // stopped on unmount. Nothing is said ONLY in sound: every sequence is
      // announced in words first and the same facts are on screen.
      function stopTones() {
        var a = audioRef.current;
        if (!a) return;
        audioRef.current = null;
        if (a.timer) clearTimeout(a.timer);
        a.nodes.forEach(function (n) { try { n.stop(); } catch (_) {} });
        try { if (a.ctx && typeof a.ctx.close === 'function') a.ctx.close(); } catch (_) {}
      }
      function playTones(seq, startMsg) {
        stopTones();
        var AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        var ac = null;
        try { ac = AC ? new AC() : null; } catch (_) { ac = null; }
        if (!ac) {
          var none = t('stem.citylab.sound_unavailable', 'Sound is not available in this browser. Everything the tones say is also written on screen.');
          setSoundNote(none); announceToSR(none);
          return false;
        }
        var nodes = [], step = 0.4, dur = 0.3, t0 = (ac.currentTime || 0) + 0.05;
        seq.forEach(function (tone, i) {
          if (!tone.freq) return;
          var osc = ac.createOscillator(), gain = ac.createGain(), at = t0 + i * step;
          osc.type = tone.wave || 'sine';
          osc.frequency.setValueAtTime(tone.freq, at);
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(tone.wave === 'square' ? 0.05 : 0.15, at + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          osc.connect(gain); gain.connect(ac.destination);
          osc.start(at); osc.stop(at + dur + 0.02);
          nodes.push(osc);
        });
        var rec = { ctx: ac, nodes: nodes, timer: null };
        rec.timer = setTimeout(function () { if (audioRef.current === rec) stopTones(); }, Math.ceil((seq.length * step + 0.4) * 1000));
        audioRef.current = rec;
        setSoundNote(startMsg); announceToSR(startMsg);
        return true;
      }

      // Persist on every plan change: the project copy and the local copy.
      React.useEffect(function () {
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify(plan)); } catch (_) {}
        upd({ plan: plan });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [plan]);

      // Teacher locks are applied to the plan rather than only to the
      // controls, so a plan opened before the lock was set obeys it too.
      React.useEffect(function () {
        if (teacher.lockTown && plan.scenarioId !== teacher.lockTown) {
          setHist(function (hs) { return { past: hs.past.concat([plan]).slice(-50), future: [] }; });
          var fresh = basePlan(teacher.lockTown);
          if (teacher.moveBudget) fresh.moveBudget = teacher.moveBudget;
          setPlan(fresh);
          setSelected(SCENARIOS[teacher.lockTown].coreParcel);
          setCam(function (c) { return Object.assign({}, c, { frame: townFrame(fresh) }); });
          setStaged(null); checkpointRef.current = null;
          return;
        }
        var patch = null;
        if (teacher.moveBudget && plan.moveBudget !== teacher.moveBudget) patch = { moveBudget: teacher.moveBudget };
        if (teacher.scoreSet && plan.assumptionSetId !== teacher.scoreSet) {
          patch = Object.assign(patch || {}, { assumptionSetId: teacher.scoreSet });
        }
        if (patch) setPlan(function (prev) { return Object.assign(clonePlan(prev), patch); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [teacher.lockTown, teacher.moveBudget, teacher.scoreSet, plan.scenarioId, plan.moveBudget, plan.assumptionSetId]);

      React.useEffect(function () {
        if (!CITY_VIEWER) return;
        CITY_STATUS_FN = setGlStatus;
        CITY_VIEWER.onStatusChange(setGlStatus);
        // W1: the viewer can reach 'ready' (ensureThree resolves in a
        // microtask) before this effect subscribes, and then React never
        // learnt the model was live. Read it once now.
        setGlStatus(CITY_VIEWER.status());
        return function () { CITY_STATUS_FN = null; CITY_VIEWER.onStatusChange(null); };
      }, []);

      // Push after paint, never during render. `static: true` means the viewer
      // draws this frame and then stops until something changes again.
      // W2: what changed since the scene last saw the plan grows in. Tracked
      // on every plan change, whichever board made it.
      React.useEffect(function () {
        var gr = growRef.current;
        if (gr.plan === plan) return;
        var ch = planGrowth(gr.plan, plan);
        gr.plan = plan;
        if (ch.ids.length || ch.edges.length) { gr.token++; gr.ids = ch.ids; gr.edges = ch.edges; gr.at = Date.now(); }
      }, [plan]);
      React.useEffect(function () {
        if (slow) announceToSR(t('stem.citylab.sr_motion_slow', 'Animation turned off: this device was drawing the model slowly. The model still shows the whole plan.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [slow]);

      React.useEffect(function () {
        if (!CITY_VIEWER || boardView !== 'model') return;
        // W1: the selection, hover, road start and staged "?" ride in the data
        // and the scene's tick places them, so none of them is in `sig`. The
        // theme is: it changes the lights and the clear colour.
        // W2: the living city is computed from the plan, so it is in `sig`
        // through the plan. While an edit is staged the plan has not changed,
        // so nothing model-tied changes, and `frozen` stops the motion too.
        var gr = growRef.current;
        var noRoadLabel = t('stem.citylab.sign_no_road', 'no road');
        if (!slowCbRef.current) slowCbRef.current = function () { setSlow(true); };
        CITY_VIEWER.push({
          // W4: the lens is in the signature: it recolours the town.
          sig: massingSignature(plan, plan.assumptionSetId) + '|' + sceneTheme + '|' + noRoadLabel + '|' + lens,
          massing: buildMassing(plan, plan.assumptionSetId, null),
          living: livingCity(plan, plan.assumptionSetId),
          lens: lensCells(plan, plan.assumptionSetId, lens),
          grow: gr.token ? { token: gr.token, ids: gr.ids, edges: gr.edges, at: gr.at } : null,
          labels: { noRoad: noRoadLabel },
          selectedId: selected, hoverId: hover, roadFrom: roadFrom,
          ghost: staged ? stagedGhost(staged.op) : null,
          rotY: cam.rotY, rotX: cam.rotX, zoom: cam.zoom,
          // W3: what the camera frames, and the coach's step-1 tint.
          frame: cam.frame || null, hint: coachStep === 1 && coachFieldIds.length ? coachFieldIds : null,
          // W5: the mission's counted parcels, and a pass that earned fireworks.
          marks: stripMarkIds,
          celebrate: celebration && celebration.fx && !celebration.again ? { token: celebration.token, at: celebration.at } : null,
          dark: isDark, theme: sceneTheme,
          motion: motionOn, frozen: !!staged, onSlow: slowCbRef.current,
          static: !motionOn || !!staged
        });
      });

      var report = constraintReport(plan, plan.assumptionSetId);
      var sc = report.scorecard;
      var unitsRow = report.rows.filter(function (r) { return r.id === 'req_units'; })[0] || report.rows[0];
      var briefJ = briefJudged(plan, report);

      React.useEffect(function () {
        var patch = {};
        if (unitsRow.met) patch.metUnits = true;
        // W7: metAllHard is set by a passing brief Check (checkBrief), not here.
        if (plan.memo && plan.memo.bindingConstraint && plan.memo.tradeoff) patch.memoDone = true;
        patch.predictions = (plan.predictions || []).length;
        if (Object.keys(patch).length) upd(patch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [unitsRow.met, plan.memo.bindingConstraint, plan.memo.tradeoff,
        (plan.predictions || []).length]);

      // W7 (Aaron): the brief's XP is no longer paid by itself when the plan
      // meets the brief. It is checkBrief's (Check my plan), once per town.

      // W5 (2026-11-04), after every older hook: the mission strip.
      var stStripMid = React.useState(null);            // null: follow the current mission
      var stripMidSt = stStripMid[0], setStripMid = stStripMid[1];
      var stCeleb = React.useState(null);               // { mid, token, at, fx, why } from Check only
      var celebration = stCeleb[0], setCelebration = stCeleb[1];
      var stRowCue = React.useState(null);              // { key, ks }: rows that just turned met
      var rowCue = stRowCue[0], setRowCue = stRowCue[1];
      var stReadout = React.useState(false);
      var readoutOpen = stReadout[0], setReadoutOpen = stReadout[1];
      // While the coach runs the strip shows closed (like Start here), and
      // opening it then is for this visit only.
      var stStripPeek = React.useState(false);
      var stripPeek = stStripPeek[0], setStripPeek = stStripPeek[1];
      var stripClosedNow = coachStep ? !stripPeek : !!d.stripClosed;
      // W6, after every older hook: the brief strip's last Check, and its readout.
      var stBriefNote = React.useState(null);           // { met, standardOnly, unmet }
      var briefNote = stBriefNote[0], setBriefNote = stBriefNote[1];
      var stBriefReadout = React.useState(null);        // null | 'cost' | 'water'
      var briefReadout = stBriefReadout[0], setBriefReadout = stBriefReadout[1];
      // The fullscreen HUD: entering puts focus on the model; leaving (Exit,
      // Escape, or the browser's own exit) puts it back on Full screen.
      var fsWasRef = React.useRef(false);
      var fsNodeRef = React.useRef(null);
      // Leaving the tool (or the 3D board) in full screen would leave the
      // host's fill-the-frame lock on the page: release it on the way out.
      React.useEffect(function () {
        return function () {
          var el = fsNodeRef.current;
          if (!el || typeof document === 'undefined') return;
          var on = el.hasAttribute && el.hasAttribute('data-allo-fullscreen-active');
          var real = document.fullscreenElement === el || document.webkitFullscreenElement === el;
          if ((on || real) && typeof window.__alloStemFS === 'function') { try { window.__alloStemFS(el); } catch (_) {} }
        };
      }, []);
      React.useEffect(function () {
        var was = fsWasRef.current;
        fsWasRef.current = fullscreen;
        if (fullscreen) fsNodeRef.current = cityFsRef.current;
        if (fullscreen === was || typeof document === 'undefined') return;
        // Hunt: after a lost context the stage column is hidden: focus is the
        // map's (the selected parcel), not a Full screen button nobody can see.
        var target = fullscreen ? document.getElementById('citylab-stage')
          : (glLost ? null : (document.getElementById('citylab-fs-toggle') || document.querySelector('[data-citylab-cam-more]')));
        if (target && target.focus) { try { target.focus(); } catch (_) {} }
        announceToSR(fullscreen
          ? t('stem.citylab.sr_hud_on_v2', 'Full screen. The tools, the lenses, the mission, the parcel buttons and the camera float over the model. Tab moves through them. On the model, Enter or Space uses the chosen tool on the selected parcel, and Escape leaves full screen.')
          : t('stem.citylab.sr_hud_off', 'Left full screen.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [fullscreen]);
      var celebTokenRef = React.useRef(0);
      var rowMetRef = React.useRef(null);
      var stripScenRef = React.useRef(plan.scenarioId);
      // W7: towns whose brief already had its fireworks this visit (toolData
      // briefFx keeps it across reloads), and the plan the student's own last
      // edit made: only that plan may cue "Just met" (not Undo, Redo or a lock).
      var briefFxRef = React.useRef({});
      var cueEditRef = React.useRef(null);
      // Mission cue sounds: this panel's OWN AudioContext, made on the first
      // gesture after Sounds is switched on, never before, closed on unmount.
      var cueAudioRef = React.useRef(null);
      React.useEffect(function () {
        return function () { closeCueAudio(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      // Hunt (2026-11-04): the page behind full screen is inert while it lasts
      // (every render, so a panel that mounts meanwhile is covered too), and
      // given back on exit and on unmount. A focus move that waited on it
      // (a parcel after a lost context) is made once it is free.
      var fsInertRef = React.useRef([]);
      React.useEffect(function () {
        if (fullscreen && cityFsRef.current) { cityInertOutside(cityFsRef.current, fsInertRef.current); return; }
        if (!fsInertRef.current.length) return;
        cityInertRestore(fsInertRef.current);
        fsInertRef.current = [];
        var id = pendingFocusRef.current, node = id ? document.getElementById(id) : null;
        // After a lost context the parcel's own focus move ran while it was
        // still inert and came to nothing: make it now.
        var ae = document.activeElement;
        if (!node && glLost && (!ae || ae === document.body || (cityFsRef.current && cityFsRef.current.contains(ae)))) {
          node = document.getElementById('citylab-parcel-' + selected);
        }
        if (node && node.focus) { pendingFocusRef.current = null; try { node.focus(); } catch (_) {} }
      });
      React.useEffect(function () {
        return function () { cityInertRestore(fsInertRef.current); fsInertRef.current = []; };
      }, []);
      var stripOn = level === 'missions';
      // W6: the full brief (the 9-12 default) has a strip of its own.
      var briefStripOn = level === 'brief';
      var stripKind = stripOn ? 'mission' : (briefStripOn ? 'brief' : null);
      var stripCur = null;
      MISSION_IDS.forEach(function (mid) { if (!stripCur && !missionRecord(mid).done) stripCur = mid; });
      var stripMid = MISSION_IDS.indexOf(stripMidSt) !== -1 ? stripMidSt : (stripCur || MISSION_IDS[MISSION_IDS.length - 1]);
      var stripStatus = stripOn ? missionStatus(stripMid, plan) : null;
      var stripMarks = stripOn ? missionMarks(plan, stripMid) : { kind: null, ids: [] };
      var stripMarkIds = stripOn && !stripClosedNow && stripMarks.kind ? stripMarks.ids : null;
      // A row turning met, by the student's own change to the plan, gets a
      // small cue. Not on mount, not on switching mission, not on an imported
      // plan, and never a mission pass: that is only ever Check's to say.
      // W6: the brief strip's rows follow the same rule (keyed 'brief').
      var stripRowList = stripStatus ? stripStatus.conds.map(function (c) { return { k: c.k, met: !!c.met }; })
        : (briefStripOn ? briefRows(plan, report).map(function (r) { return { k: r.id, met: r.met }; }) : null);
      React.useEffect(function () {
        var key = plan.scenarioId + ':' + (briefStripOn ? 'brief' : stripMid);
        var mets = stripRowList ? stripRowList.map(function (c) { return c.met; }) : [];
        var prev = rowMetRef.current;
        rowMetRef.current = { key: key, mets: mets, plan: plan };
        if (!stripRowList || !prev || prev.key !== key || prev.plan === plan) return;
        var turned = [];
        mets.forEach(function (m2, i) { if (m2 && !prev.mets[i]) turned.push(stripRowList[i].k); });
        if (turned.length && !plan.imported && cueEditRef.current === plan) {
          setRowCue({ key: key, ks: turned });
          logCelebration('row', briefStripOn ? 'brief' : stripMid);
          playCue('row');
        } else if (rowCue) setRowCue(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [plan, stripMid, stripOn, briefStripOn]);
      React.useEffect(function () {
        if (stripScenRef.current === plan.scenarioId) return;
        stripScenRef.current = plan.scenarioId;
        setStripMid(null); setCelebration(null); setRowCue(null); setReadoutOpen(false);
        setBriefNote(null); setBriefReadout(null);
      }, [plan.scenarioId]);
      // W8 (2026-11-04), after every older hook: the parcel the HUD picker
      // moved to is kept clear of the HUD (the frame slides as little as it
      // must), and a fresh plan that drops a waiting change says so.
      var followRef = React.useRef(null);
      var stDropNote = React.useState('');
      var dropNote = stDropNote[0], setDropNote = stDropNote[1];
      React.useEffect(function () {
        var want = followRef.current;
        if (!want) return;
        followRef.current = null;
        if (want !== selected || boardView !== 'model') return;
        var f = hudFollow(selected, cam);
        if (f) setCam(function (c) { return Object.assign({}, c, { frame: f }); });
      });

      // ---- theme tokens, defined for BOTH themes so neither borrows the other
      var ink = onDark ? '#e2e8f0' : '#1e293b';
      var dim = onDark ? '#94a3b8' : '#475569';
      var panelBg = onDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)';
      var panelBorder = onDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)';
      var okColour = onDark ? '#1baf7a' : '#12805a';
      var missColour = onDark ? '#eb6834' : '#b8410f';
      var linkColour = onDark ? '#93c5fd' : '#1f5eb0';
      var softBlue = onDark ? 'rgba(42,120,214,0.14)' : 'rgba(42,120,214,0.10)';
      var softRow = onDark ? 'rgba(15,23,42,0.35)' : 'rgba(241,245,249,0.85)';
      // W6: lens fills follow the scene's theme on every surface (3D, map, keys).
      function themed(f) { return lensThemeFill(f, sceneTheme); }
      function hatchCss() {
        return 'repeating-linear-gradient(90deg, ' + (LENS_HATCH[sceneTheme] || LENS_HATCH.light) + ' 0 1px, transparent 1px 4px)';
      }

      // W6: `compact` (the board's own panel) trims the padding above the board.
      function panel(key, title, children, headingId, compact) {
        return h('section', { key: key, className: 'rounded-xl border mb-3 ' + (compact ? 'p-2' : 'p-3'),
          style: { background: panelBg, borderColor: panelBorder } },
          title ? h('h3', { id: headingId || undefined, tabIndex: headingId ? -1 : undefined,
            className: 'text-[0.75rem] font-black ' + (compact ? 'mb-1' : 'mb-2'), style: { color: ink } }, title) : null,
          children);
      }

      function smallBtn(label, onClick, opts) {
        opts = opts || {};
        return h('button', {
          key: opts.key, id: opts.id || undefined, type: 'button', onClick: onClick, disabled: !!opts.disabled,
          'aria-label': opts.aria || undefined,
          'aria-pressed': opts.pressed === undefined ? undefined : (opts.pressed ? 'true' : 'false'),
          className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
          style: { background: opts.primary ? '#1f5eb0' : (opts.pressed ? '#1f5eb0' : panelBg),
            color: (opts.primary || opts.pressed) ? '#ffffff' : ink,
            borderColor: (opts.primary || opts.pressed) ? '#1f5eb0' : panelBorder,
            minHeight: '44px', minWidth: '44px', opacity: opts.disabled ? 0.5 : 1 }
        }, label);
      }

      // W2: the numbers come from deltaValues, which the board's chips also
      // read, so the spoken delta and the chips cannot disagree.
      function deltaSentences(before, after) {
        var v = deltaValues(before, after);
        var dUnits = v.dUnits, dC = v.dC, dCost = v.dCost;
        var parts = [];
        parts.push(dUnits
          ? fmt(dUnits > 0 ? t('stem.citylab.sr_homes_up', 'New homes {n}, up {d}.') : t('stem.citylab.sr_homes_down', 'New homes {n}, down {d}.'),
              { n: v.units, d: Math.abs(dUnits) })
          : fmt(t('stem.citylab.sr_homes_same', 'New homes {n}, unchanged.'), { n: v.units }));
        parts.push(Math.abs(dC) > C_DELTA_EPS
          ? fmt(dC > 0 ? t('stem.citylab.sr_c_up', 'Runoff coefficient {c}, up {d}.') : t('stem.citylab.sr_c_down', 'Runoff coefficient {c}, down {d}.'),
              { c: v.c.toFixed(3), d: Math.abs(dC).toFixed(3) })
          : fmt(t('stem.citylab.sr_c_same', 'Runoff coefficient {c}, unchanged.'), { c: v.c.toFixed(3) }));
        parts.push(dCost
          ? fmt(dCost > 0 ? t('stem.citylab.sr_cost_up', 'Cost {c}, up {d}.') : t('stem.citylab.sr_cost_down', 'Cost {c}, down {d}.'),
              { c: fmtMoney(v.cost), d: fmtMoney(Math.abs(dCost)) })
          : fmt(t('stem.citylab.sr_cost_same', 'Cost {c}, unchanged.'), { c: fmtMoney(v.cost) }));
        return parts.join(' ');
      }
      // The chip a delta becomes on the board. One literal call per text.
      function chipText(ch) {
        if (ch.id === 'homes') return fmt(ch.up ? t('stem.citylab.chip_homes_up', '+{d} homes reached') : t('stem.citylab.chip_homes_down', '-{d} homes reached'), { d: ch.text });
        if (ch.id === 'c') return fmt(ch.up ? t('stem.citylab.chip_c_up', 'Runoff C +{d}') : t('stem.citylab.chip_c_down', 'Runoff C -{d}'), { d: ch.text });
        return fmt(ch.up ? t('stem.citylab.chip_cost_up', 'Cost +{d}') : t('stem.citylab.chip_cost_down', 'Cost -{d}'), { d: ch.text });
      }

      // ---- edits, all announced with the DELTA rather than just the action
      function applyPlan(next, message, skipHistory, lead) {
        if (next === plan) {
          // The commonest reason an edit produces no change is a spent move
          // budget, and silence there reads as a broken control.
          if (outOfMoves(plan)) {
            announceToSR(t('stem.citylab.sr_no_moves', 'No moves left in this challenge. Undo to take one back, or end the challenge to keep planning.'));
          }
          return;
        }
        var before = sc;
        var after = scorecard(next, next.assumptionSetId);
        if (!skipHistory) setHist({ past: hist.past.concat([plan]).slice(-50), future: [] });
        setPlan(next);
        cueEditRef.current = next;
        if (dropNote) setDropNote('');
        setLastChips(deltaChips(deltaValues(before, after)));
        announceToSR([lead || '', message, deltaSentences(before, after)].filter(Boolean).join(' '));
      }

      // Every single edit (land use, green infrastructure, a connection)
      // comes through here. It either applies, or, when a prediction is due,
      // waits as a STAGED edit: the scorecard keeps showing the plan as it
      // was, and the screen reader hears no new numbers until the student
      // has committed to a prediction.
      function predictionDue() {
        if (predictEvery) return true;
        if (checkpointRef.current === null) checkpointRef.current = plan.editCount || 0;
        return (plan.editCount || 0) - checkpointRef.current >= PREDICT_EVERY_N;
      }

      function edit(op, message) {
        var next = applyOp(plan, op);
        if (next === plan) { applyPlan(next, message); return; }
        if (predictionDue()) {
          var replacing = !!staged;
          var avail = predictIndicatorsFor(plan).map(function (p) { return p.id; });
          if (avail.indexOf(predInd) === -1) setPredInd('runoffCoefficient');
          setStaged({ op: op, message: message });
          revealRef.current = '[data-citylab-predict-card]';
          setLastChips(null);   // no numbers on the board until the prediction is in
          setPredSize('');
          setPredictResult('');
          announceToSR(fmt(replacing
            ? t('stem.citylab.sr_staged_replaced', 'The waiting change is now: {change} It is not applied yet. Predict first: will the {name} go up, go down or stay about the same? The new numbers are held back until you answer.')
            : t('stem.citylab.sr_staged', 'Waiting, not applied yet: {change} Predict first: will the {name} go up, go down or stay about the same? The new numbers are held back until you answer.'),
            { change: message, name: predictName(avail.indexOf(predInd) === -1 ? 'runoffCoefficient' : predInd) }));
          return;
        }
        applyPlan(next, message);
      }

      function commitPrediction(guess) {
        if (!staged) return;
        var res = resolvePrediction(plan, staged.op, predInd, guess, predSize);
        setStaged(null);
        if (res.next === plan) { applyPlan(plan, staged.message); return; }
        checkpointRef.current = res.next.editCount || 0;
        var logged = clonePlan(res.next);
        logged.predictions = (plan.predictions || []).concat([res.record]);
        var r = res.record;
        var vals = { guess: dirLabel(r.guess), actual: dirLabel(r.actual),
          from: fmtIndicator(predInd, r.from), to: fmtIndicator(predInd, r.to), name: predictName(predInd) };
        var text = r.guess === r.actual
          ? fmt(t('stem.citylab.predict_result_match', 'You said {guess}, and it went {actual}: {from} to {to}. Nothing is scored here.'), vals)
          : fmt(t('stem.citylab.predict_result_differ', 'You said {guess}. It actually went {actual}: {from} to {to}. Worth a look at which parcels moved it. Nothing is scored here.'), vals);
        if (r.size && r.actual !== 'about the same') {
          text += ' ' + fmt(t('stem.citylab.predict_size_result', 'You expected a {guess} change; it was a {actual} one ({delta}).'),
            { guess: sizeLabel(r.size), actual: sizeLabel(r.actualSize), delta: fmtDelta(predInd, r.to - r.from) });
        }
        setPredictResult(text);
        applyPlan(logged, staged.message, false, text);
      }

      function skipPrediction() {
        if (!staged) return;
        var s = staged;
        setStaged(null);
        checkpointRef.current = (plan.editCount || 0) + 1;
        applyPlan(applyOp(plan, s.op), s.message);
      }

      function cancelStaged() {
        setStaged(null);
        announceToSR(t('stem.citylab.sr_staged_cancelled', 'Change cancelled. Nothing was applied.'));
      }

      // Switching town is opening a different problem, not editing this one.
      // The outgoing plan goes onto the undo stack, so a mis-click costs one
      // press of Undo rather than an afternoon of work.
      function switchScenario(id) {
        if (!SCENARIOS[id] || id === plan.scenarioId) return;
        if (teacher.lockTown && id !== teacher.lockTown) return;
        var next = basePlan(id);
        if (teacher.moveBudget) next.moveBudget = teacher.moveBudget;
        setHist({ past: hist.past.concat([plan]).slice(-50), future: [] });
        setPlan(next);
        setSelected(SCENARIOS[id].coreParcel);
        setCam(function (c) { return Object.assign({}, c, { frame: townFrame(next) }); });
        setCompared(false);
        setConfirmReset(false);
        var dropLead = stagedDropLead();
        setStaged(null); checkpointRef.current = null;
        setLastChips(null);
        setMissionNote(null);
        setDropNote(dropLead);
        announceToSR([dropLead, fmt(t('stem.citylab.sr_opened_town', 'Opened {town}. {blurb} Your previous plan is one Undo away.'),
          { town: SCENARIOS[id].town, blurb: SCENARIOS[id].blurb })].filter(Boolean).join(' '));
      }

      function undo() {
        if (staged) { cancelStaged(); return; }
        if (!hist.past.length) { announceToSR(__alloT('stem.citylab.sr_nothing_to_undo', 'Nothing to undo.')); return; }
        var prev = hist.past[hist.past.length - 1];
        setHist({ past: hist.past.slice(0, -1), future: [plan].concat(hist.future).slice(0, 50) });
        setPlan(prev);
        cueEditRef.current = null;
        setLastChips(null);
        var after = scorecard(prev, prev.assumptionSetId);
        announceToSR(fmt(t('stem.citylab.sr_undone', 'Undone. New homes {n}, cost {cost}.'),
          { n: after.tier1.newUnitsServed, cost: fmtMoney(after.tier2.capitalCost) }));
      }

      function redo() {
        // Hunt: redo would change the model under a change that is waiting
        // for its prediction (Undo cancels the waiting change instead).
        if (staged) return;
        if (!hist.future.length) { announceToSR(__alloT('stem.citylab.sr_nothing_to_redo', 'Nothing to redo.')); return; }
        var next = hist.future[0];
        setHist({ past: hist.past.concat([plan]).slice(-50), future: hist.future.slice(1) });
        setPlan(next);
        cueEditRef.current = null;
        setLastChips(null);
        var after = scorecard(next, next.assumptionSetId);
        announceToSR(fmt(t('stem.citylab.sr_redone', 'Redone. New homes {n}, cost {cost}.'),
          { n: after.tier1.newUnitsServed, cost: fmtMoney(after.tier2.capitalCost) }));
      }

      // The assumption set the scorecard and map use. Not an edit: it costs
      // no move and changes nothing the student drew.
      function useAssumptionSet(id) {
        if (!SET_BY_ID[id] || teacher.scoreSet) return;
        setPlan(function (prev) { var nx = clonePlan(prev); nx.assumptionSetId = id; return nx; });
        announceToSR(fmt(t('stem.citylab.sr_set_applied', 'The scorecard and the map now use {set}. Your plan is unchanged.'),
          { set: SET_BY_ID[id].label }));
      }

      function setUseMessage(id, useId) {
        return fmt(t('stem.citylab.msg_set_use', '{parcel} set to {use}.'), { parcel: id, use: useLabel(useId, plan) });
      }

      // W1: the ONE edit API. The grid, the inspector, the table and the 3D
      // board all come through here, so staging, the move budget, undo and the
      // spoken deltas hold on every surface, and the same action on any of
      // them is the same op with the same words.
      function refusalText(why, a, b) {
        if (why === 'water') return t('stem.citylab.the_river_is_terrain_not_zoning_it_can', 'The river is terrain, not zoning. It cannot be built on.');
        if (why === 'gi') return t('stem.citylab.gi_useless', 'Green infrastructure would change nothing here (this land already drains)');
        if (why === 'cool') return t('stem.citylab.cool_useless', 'No buildings here, so no roofs to cool');
        if (why === 'stop') return t('stem.citylab.stop_no_road', 'A bus stop needs a road into this parcel');
        if (why === 'existing') return fmt(t('stem.citylab.refuse_existing', 'The street from {a} to {b} is already there, and existing streets stay.'), { a: a, b: b });
        if (why === 'apart') return fmt(t('stem.citylab.refuse_apart', 'A road or path joins two parcels that share an edge, and {a} and {b} do not.'), { a: a, b: b || '?' });
        return '';
      }
      function parcelAction(action, id, extra) {
        extra = extra || {};
        if (action === 'edge' && !extra.edgeKind) extra = Object.assign({}, extra, { edgeKind: roadKind });
        var res = parcelOp(plan, action, id, extra);
        if (!res.op) {
          var why = refusalText(res.refused, id, extra.b);
          if (why) announceToSR(why);
          return { op: null, message: why, refused: res.refused };
        }
        var op = res.op, message;
        if (op.kind === 'use') message = setUseMessage(id, op.useId);
        else if (op.kind === 'gi') {
          message = fmt(plan.greenInfra[id] ? t('stem.citylab.msg_gi_removed', '{parcel} green infrastructure removed.')
            : t('stem.citylab.msg_gi_added', '{parcel} green infrastructure added.'), { parcel: id });
        } else if (op.kind === 'cool') {
          message = fmt(plan.coolRoofs && plan.coolRoofs[id] ? t('stem.citylab.msg_cool_removed', '{parcel} cool roofs removed.')
            : t('stem.citylab.msg_cool_added', '{parcel} cool roofs added.'), { parcel: id });
        } else if (op.kind === 'transit') {
          message = fmt(plan.transit && plan.transit[id] ? t('stem.citylab.msg_stop_removed', 'Bus stop removed at {parcel}.')
            : t('stem.citylab.msg_stop_added', 'Bus stop added at {parcel}.'), { parcel: id });
        } else {
          message = fmt(op.edgeKind ? t('stem.citylab.msg_conn_built', 'Built a connection from {a} to {b}.')
            : t('stem.citylab.msg_conn_removed', 'Removed a connection from {a} to {b}.'), { a: op.a, b: op.b });
        }
        edit(op, message);
        return { op: op, message: message };
      }

      // The grid is ONE tab stop (roving tabindex): Tab lands on the selected
      // parcel, arrow keys walk the grid, digits assign land use, g toggles
      // green infrastructure. These keys are the grid widget's own keyboard
      // model, listed under Keyboard shortcuts, and fire only on a parcel.
      function focusParcel(id) {
        setSelected(id);
        if (typeof document === 'undefined') return;
        var node = document.getElementById('citylab-parcel-' + id);
        if (node && node.focus) node.focus();
      }

      function boardKeyDown(e, id) {
        var col = parcelCol(id), row = parcelRow(id), target = null;
        // W1: Shift + arrow builds (or removes) a connection to the next
        // parcel, the keyboard twin of a road drawn on the 3D board, then
        // moves on, so repeated presses draw a street. The kind is the one
        // chosen in the inspector.
        if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
          if (e.key === 'ArrowUp' && row > 1) target = pid(col, row - 1);
          else if (e.key === 'ArrowDown' && row < N_ROWS) target = pid(col, row + 1);
          else if (e.key === 'ArrowLeft' && col > 0) target = pid(col - 1, row);
          else if (e.key === 'ArrowRight' && col < N_COLS - 1) target = pid(col + 1, row);
          e.preventDefault();
          if (!target) return;
          parcelAction('edge', id, { b: target });
          focusParcel(target);
          return;
        }
        if (e.key === 'ArrowUp' && row > 1) target = pid(col, row - 1);
        else if (e.key === 'ArrowDown' && row < N_ROWS) target = pid(col, row + 1);
        else if (e.key === 'ArrowLeft' && col > 0) target = pid(col - 1, row);
        else if (e.key === 'ArrowRight' && col < N_COLS - 1) target = pid(col + 1, row);
        else if (e.key === 'Home') target = pid(0, row);
        else if (e.key === 'End') target = pid(N_COLS - 1, row);
        if (target) { e.preventDefault(); focusParcel(target); return; }
        // W4: Enter runs the palette's tool on this parcel (handled here, so
        // the button's own click never runs it a second time); Escape clears
        // a road's start parcel.
        if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey && tool !== 'inspect') {
          e.preventDefault();
          stageApply(id);
          return;
        }
        if (e.key === 'Escape' && roadFrom) {
          e.preventDefault();
          setRoadFrom(null);
          stageSay(t('stem.citylab.stage_road_cleared', 'Start parcel cleared. Click a parcel to start again.'));
          return;
        }

        if (e.key === '?') { e.preventDefault(); setShowShortcuts(true); return; }
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          parcelAction('gi', id);
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          var slot = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
          var useId = PALETTE_IDS[slot];
          if (!useId) return;
          e.preventDefault();
          parcelAction('use', id, { useId: useId });
        }
      }

      // ===============================================================
      // BOARD. Real buttons in a CSS grid, not canvas and not SVG, so
      // every parcel is genuinely focusable and labelable. Roads sit in an
      // aria-hidden overlay because they are edited from the inspector.
      // ===============================================================
      function board() {
        var served = servedParcels(plan);
        var ids = allParcelIds();
        var parkDist = sc.parkDistance;
        var assumptions = SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central;
        var elevs = ids.map(function (id) { return terrainAt(id, plan).elevationM; });
        var minElev = Math.min.apply(null, elevs), maxElev = Math.max.apply(null, elevs);
        var mapName = fmt(t('stem.citylab.map_group', 'Map of {town}, 12 by 12 parcels. Arrow keys move between parcels.'), { town: scen.town });
        var gapById = {};
        if (lens === 'access') accessGaps(plan).rows.forEach(function (g) { gapById[g.id] = g; });
        // W4: every lens but Land use is a flat fill, from lensCells: the same
        // per-parcel function the 3D board draws.
        var flatView = lens !== 'use';
        var LC = lensCells(plan, plan.assumptionSetId, lens).cells;
        var coachTint = {};
        if (coachStep === 1) coachFieldIds.forEach(function (fid) { coachTint[fid] = true; });

        var cells = ids.map(function (id) {
          var terr = terrainAt(id, plan);
          var use = USE_BY_ID[plan.uses[id]];
          var isSel = id === selected;
          var units = unitsOnParcel(plan, id);
          var reach = parkDist[id];
          var hasPark = reach !== undefined && reach <= sc.parkHopLimit;
          var noPark = units > 0 && served[id] && !hasPark;
          var heatHere = sc.surfaceHeat[id];
          var gap = gapById[id];
          var lc = LC[id];
          // W6: a lens fill in the scene's theme (Land use keeps the use colours).
          var parcelFill = flatView ? themed(lc.fill) : lc.fill;
          var rainPct = lens === 'rain' ? Math.round(lc.split * 100) : 0;
          var parcelInk = readableInk(parcelFill);
          // Dry today, inside the reach the board asked you to plan for.
          var atRisk = scen.modelsSeaRise && !terr.floodplain &&
            inFutureSurge(id, plan, assumptions);
          var label = [id, useLabel(use.id, plan)];
          if (units) label.push(fmt(t('stem.citylab.cell_homes', '{n} homes'), { n: units }));
          if (terr.floodplain) label.push(fmt(t('stem.citylab.cell_in_zone', 'in {zone}'), { zone: scen.floodLabel }));
          if (atRisk) label.push(t('stem.citylab.cell_at_risk', 'dry today but inside the 2100 reach'));
          if (plan.greenInfra[id]) label.push(t('stem.citylab.cell_gi', 'green infrastructure'));
          if (units && !served[id]) label.push(t('stem.citylab.cell_unreached', 'NOT reached by a road'));
          if (units && served[id]) label.push(hasPark ? t('stem.citylab.cell_park_yes', 'park within a 5 minute walk')
            : t('stem.citylab.cell_park_no', 'no park within a 5 minute walk'));
          if (plan.transit && plan.transit[id]) {
            label.push(served[id] ? t('stem.citylab.cell_stop', 'bus stop')
              : t('stem.citylab.cell_stop_stranded', 'bus stop that no road from the centre reaches, so no bus can serve it'));
          }
          if (plan.coolRoofs && plan.coolRoofs[id]) label.push(t('stem.citylab.cell_cool_roof', 'cool roofs'));
          if (lens === 'heat' && heatHere !== undefined) {
            label.push(fmt(t('stem.citylab.cell_heat', 'surface heat {c} degrees above shaded ground, {band}'), { c: heatHere.toFixed(1), band: heatBandLabel(heatBand(heatHere)) }));
          }
          if (lens === 'access' && gap) label.push(gapsPhrase(gap.missing));
          // W4: the new lenses read out their own class on every parcel.
          if (lens === 'park' && use.id !== 'water') {
            label.push(lc.cls === 'in' ? t('stem.citylab.cell_lens_park_in', 'inside the 5-minute walk to a park, along streets and paths')
              : t('stem.citylab.cell_lens_park_out', 'outside the 5-minute walk to a park'));
          }
          if (lens === 'transit' && use.id !== 'water') {
            label.push(lc.cls === 'in' ? t('stem.citylab.cell_lens_bus_in', 'inside the 5-minute walk to a bus stop')
              : t('stem.citylab.cell_lens_bus_out', 'outside the 5-minute walk to a bus stop'));
          }
          if (lens === 'rain') {
            label.push(fmt(t('stem.citylab.cell_lens_rain', 'runoff coefficient C {c}: {pct} percent of the rain runs off, the rest soaks in'),
              { c: lc.split.toFixed(2), pct: rainPct }));
          }
          label.push(fmt(t('stem.citylab.cell_elevation', 'elevation {m} metres'), { m: terr.elevationM }));
          return h('button', {
            key: id, id: 'citylab-parcel-' + id, type: 'button', 'aria-label': label.join(', '),
            'aria-pressed': isSel ? 'true' : 'false',
            tabIndex: isSel ? 0 : -1,
            'data-citylab-lens-cls': lc.cls,
            'data-citylab-lens-value': lc.value == null ? '' : String(lc.value),
            onKeyDown: function (e) { boardKeyDown(e, id); },
            // W4: the palette drives the map too. With a tool picked, a click
            // (or Enter, below) runs it through the same parcelAction.
            onClick: function () { if (tool === 'inspect') setSelected(id); else stageApply(id); },
            // The land-use code sits in the CORNER, not the centre. Roads are
            // drawn centre to centre, and a centred label put the two on top of
            // each other: the main street made row 6 unreadable in both themes.
            className: 'relative text-[0.5625rem] font-black hover:brightness-110',
            style: {
              aspectRatio: '1 / 1',
              // backgroundColor, NOT the `background` shorthand. The shorthand
              // resets background-image, so on a re-render React could reapply
              // it after the pattern and silently wipe the fill pattern. React
              // warns about exactly this mix, and the warning is right.
              backgroundColor: parcelFill,
              // W4: rain splits the parcel left to right, run-off then soak-in.
              // W6: the run-off part is hatched (stripes), so it never reads as water.
              backgroundImage: lens === 'rain'
                ? hatchCss() + ', linear-gradient(90deg, ' + parcelFill + ' 0%, ' + parcelFill + ' ' + rainPct + '%, ' + themed(lc.fill2) + ' ' + rainPct + '%, ' + themed(lc.fill2) + ' 100%)'
                : (flatView ? 'none' : patternCss(use.pattern, 'rgba(255,255,255,0.55)')),
              backgroundSize: lens === 'rain' ? rainPct + '% 100%, auto' : (use.pattern === 'dots' ? '6px 6px' : 'auto'),
              backgroundRepeat: lens === 'rain' ? 'no-repeat' : undefined,
              color: parcelInk,
              textShadow: parcelInk === INK_DARK
                ? '0 1px 2px rgba(255,255,255,0.55)' : '0 1px 2px rgba(0,0,0,0.6)',
              border: '1px solid rgba(15,23,42,0.35)',
              // NOTE: `outline` is deliberately never set here. Setting
              // outline:none on the unselected parcels suppressed the browser
              // focus ring, so tabbing across the grid showed nothing at all.
              // Arrow keys hid the bug because they move selection with focus.
              // Selection is drawn with box-shadow instead, which stacks with
              // the focus ring rather than replacing it.
              boxShadow: [
                terr.floodplain ? 'inset 0 0 0 2px rgba(56,189,248,0.85)' : '',
                atRisk ? 'inset 0 0 0 2px rgba(251,146,60,0.95)' : '',
                // W4: the start of a road or path picked from the palette.
                id === roadFrom ? 'inset 0 0 0 3px #0f172a, inset 0 0 0 6px #22d3ee' : '',
                isSel ? '0 0 0 3px #ffffff, 0 0 0 5px #1f5eb0' : ''
              ].filter(Boolean).join(', ') || 'none',
              zIndex: isSel ? 2 : 'auto',
              cursor: 'pointer'
            }
          },
            // High contrast: the host strips a button's gradient (app_styles_module.js:1008), which is the whole rain
            // split above, so the legend's stripes never showed. A span keeps it. Other themes draw it on the button.
            lens === 'rain' && sceneTheme === 'contrast'
              ? h('span', { 'aria-hidden': 'true', 'data-citylab-hc-rain': String(rainPct), className: 'absolute inset-0',
                  style: { pointerEvents: 'none', backgroundImage: hatchCss() + ', linear-gradient(90deg, ' + parcelFill + ' 0%, ' + parcelFill + ' ' + rainPct + '%, ' + themed(lc.fill2) + ' ' + rainPct + '%, ' + themed(lc.fill2) + ' 100%)',
                    backgroundSize: rainPct + '% 100%, auto', backgroundRepeat: 'no-repeat' } })
              : null,
            // W3: the coach's yellow frame, dark-cased so it reads on any fill. It comes BEFORE the code: both spans are
            // absolute with no z-index, so tree order decides, and the other way round the frame hid the code.
            coachTint[id]
              ? h('span', { 'aria-hidden': 'true', 'data-citylab-coach-tint': id, className: 'absolute inset-0',
                  style: { pointerEvents: 'none', boxShadow: 'inset 0 0 0 2px #0f172a, inset 0 0 0 5px #facc15' } })
              : null,
            h('span', { 'aria-hidden': 'true', className: 'absolute top-0 left-0 leading-none',
              // Solid fill behind the code so the pattern stripes never run under it.
              style: { padding: '1px 2px', backgroundColor: parcelFill } }, use.code),
            plan.greenInfra[id]
              ? h('span', { 'aria-hidden': 'true', className: 'absolute top-0 right-0 text-[0.5rem] leading-none',
                  style: { color: flatView ? parcelInk : '#bbf7d0', padding: '1px 2px' } }, '●')
              : null,
            units > 0 && !served[id]
              ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 left-0 text-[0.5625rem]',
                  style: { color: flatView ? parcelInk : '#fecaca' } }, '!')
              : null,
            // Bus stop: a small badge, dark on light, top centre.
            plan.transit && plan.transit[id]
              ? h('span', { 'aria-hidden': 'true', className: 'absolute top-0 text-[0.5rem] font-black leading-none',
                  style: { left: '50%', transform: 'translateX(-50%)', padding: '1px 2px', borderRadius: '2px',
                    backgroundColor: '#0f172a', color: '#ffffff' } }, 'T')
              : null,
            // In the flat views the lower right carries the view's own number,
            // so nothing in them rests on colour alone.
            lens === 'heat' && heatHere !== undefined && heatHere > 0
              ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 right-0 text-[0.5rem] font-bold leading-none',
                  style: { color: parcelInk, padding: '1px' } }, String(Math.round(heatHere)))
              : (lens === 'access' && gap
                ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 right-0 text-[0.5625rem] font-black leading-none',
                    style: { color: parcelInk, padding: '1px' } }, String(gap.missing.length))
                // W4: the new lenses print their glyph (or, for rain, C) on a
                // dark chip, the same mark the 3D board floats over the parcel.
                : (lc.glyph && (lens === 'park' || lens === 'transit' || lens === 'flood')
                  ? h('span', { 'aria-hidden': 'true', 'data-citylab-lens-glyph': lc.glyph,
                      className: 'absolute bottom-0 right-0 text-[0.5rem] font-black leading-none rounded-sm',
                      style: { color: '#ffffff', backgroundColor: '#0f172a', padding: '1px 2px' } },
                      LENS_GLYPH_TEXT[lc.glyph])
                  : (noPark && (lens === 'use' || lens === 'elevation')
                    ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 right-0 text-[0.5625rem]',
                        style: { color: '#fef08a' } }, '*')
                    : null)))
          );
        });

        // Road overlay. Purely decorative: the network is read out per parcel
        // in the labels above and edited from the inspector below.
        var lines = Object.keys(plan.edges).map(function (key) {
          var e = edgeEnds(key), kind = plan.edges[key];
          var c1 = parcelCol(e[0]), r1 = parcelRow(e[0]);
          var c2 = parcelCol(e[1]), r2 = parcelRow(e[1]);
          var horizontal = r1 === r2;
          var cw = 100 / N_COLS, ch = 100 / N_ROWS;
          // Cartographic casing: a light core inside a dark outline reads on
          // every land-use fill and in both themes, which a flat colour did
          // not. Existing streets are muted, streets the student built are
          // bright white, walking paths are lime.
          var colour = kind === 'path' ? PATH_INK : (kind === 'existing' ? '#cbd5e1' : '#ffffff');
          var thickness = kind === 'path' ? 2 : 3;
          // backgroundColor, never the `background` shorthand, because the
          // dashed path below sets backgroundImage and the shorthand resets it.
          var style = {
            position: 'absolute', backgroundColor: colour, borderRadius: '2px',
            pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(15,23,42,0.75)'
          };
          if (kind === 'path') {
            // Dashed, the way a footpath is drawn on every paper map. Colour
            // alone was carrying the whole distinction before.
            //
            // The gaps are DARK rather than transparent, and the casing stays.
            // A lime dash with see-through gaps measured 1.01 to 1 against the
            // palest ground in the Height view, which is invisible. With a
            // dark gap the bar always has one tone that contrasts: the lime
            // reads on dark ground, the gap reads on pale ground.
            style.backgroundColor = PATH_GAP;
            style.backgroundImage = 'repeating-linear-gradient(' +
              (horizontal ? '90deg' : '0deg') + ', ' + colour + ' 0 4px, ' +
              PATH_GAP + ' 4px 7px)';
          }
          if (horizontal) {
            style.left = (Math.min(c1, c2) + 0.5) * cw + '%';
            style.width = cw + '%';
            style.top = 'calc(' + (r1 - 0.5) * ch + '% - ' + (thickness / 2) + 'px)';
            style.height = thickness + 'px';
          } else {
            style.top = (Math.min(r1, r2) - 0.5) * ch + '%';
            style.height = ch + '%';
            style.left = 'calc(' + (c1 + 0.5) * cw + '% - ' + (thickness / 2) + 'px)';
            style.width = thickness + 'px';
          }
          return h('span', { key: key, style: style });
        });

        // The parcel cells are buttons, and the app's phone stylesheet gives every button a 44 px minimum, so
        // twelve columns need 528 px: on a phone the whole STEAM Lab page scrolled sideways by 179 px (real-shell
        // sweep, 2026-09-15). The map now scrolls inside its own box; the boundary lines stay inside the sized
        // wrapper so their percentages still line up with the cells.
        return h('div', { className: 'w-full overflow-x-auto', style: { WebkitOverflowScrolling: 'touch' } },
          h('div', { className: 'relative', style: { width: 'max-content', minWidth: '100%', maxWidth: '528px' } }, // 12 columns x the 44 px touch minimum
            h('div', { className: 'grid gap-0', style: { gridTemplateColumns: 'repeat(12, 1fr)' }, role: 'group', 'aria-label': mapName }, cells),
            h('div', { 'aria-hidden': 'true', className: 'absolute inset-0', style: { pointerEvents: 'none' } }, lines)
          )
        );
      }

      // ---- W4: lenses. One lens bar for BOTH boards (it is the old view
      // tabs, grown): the map shows the lens as fills and marks, the 3D board
      // as tints, glyphs and (rain) a split lid per parcel, both from
      // lensCells. The 3D / Map pair picks the board; the lens is kept.
      function lensName(id) {
        switch (id) {
          case 'elevation': return t('stem.citylab.view_height', 'Height');
          case 'heat': return t('stem.citylab.view_heat', 'Heat');
          case 'park': return t('stem.citylab.lens_park', 'Walk to park');
          case 'transit': return t('stem.citylab.lens_bus', 'Bus');
          case 'rain': return t('stem.citylab.lens_rain', 'Rain and runoff');
          case 'flood': return t('stem.citylab.lens_flood', 'Flood / sea level');
          case 'access': return t('stem.citylab.view_access', 'Access gaps');
          default: return t('stem.citylab.view_use', 'Land use');
        }
      }
      function lensAria(id) {
        switch (id) {
          case 'elevation': return t('stem.citylab.view_height_aria', 'Show the map by height');
          case 'heat': return t('stem.citylab.view_heat_aria', 'Show the map by modelled surface heat');
          case 'park': return t('stem.citylab.lens_park_aria', 'Walk to park: shade what is within a 5-minute walk of a park, along streets and paths');
          case 'transit': return t('stem.citylab.lens_bus_aria', 'Bus: shade what is within a 5-minute walk of a bus stop a bus can reach');
          case 'rain': return t('stem.citylab.lens_rain_aria', 'Rain and runoff: how much of the rain on each parcel runs off, and the outlet gauge');
          case 'flood': return t('stem.citylab.lens_flood_aria', 'Flood / sea level: which ground the water reaches');
          case 'access': return t('stem.citylab.view_access_aria_v2', 'Access gaps: which homes lack a park, a bus stop or a school or clinic within a walk');
          default: return t('stem.citylab.view_use_aria', 'Show the map by land use');
        }
      }
      // What the lens says, in the scorecard's own numbers: shown under the
      // board and spoken when the lens changes.
      function lensSummary(id) {
        var t1 = sc.tier1, t2 = sc.tier2, a = SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central;
        var n = function (v) { return Math.round(v).toLocaleString(); };
        if (id === 'elevation') {
          var el = allParcelIds().map(function (pid0) { return terrainAt(pid0, plan).elevationM; });
          return fmt(t('stem.citylab.lens_sum_height', 'Height: the ground runs from {lo} m to {hi} m above sea level, and paler is higher.'),
            { lo: Math.min.apply(null, el), hi: Math.max.apply(null, el) });
        }
        if (id === 'heat') {
          return fmt(t('stem.citylab.lens_sum_heat', 'Heat: a model of the ground and roof surface, not of the air. Roofs and paving average {avg} C above shaded ground across the town, and {home} C where the homes are.'),
            { avg: t2.surfaceHeatC.toFixed(1), home: t2.homeSurfaceHeatC.toFixed(1) });
        }
        if (id === 'park') {
          return fmt(t('stem.citylab.lens_sum_park', 'Walk to park: {pct} of the homes a road reaches are within a {min}-minute walk of a park along streets and paths (the shaded parcels). Measured as the crow flies it would read {crow}, which ignores missing streets and the river.'),
            { pct: fmtPct(t1.parkAccessPct), min: scen.parkWalkMinutes, crow: fmtPct(t1.parkAccessPctAsCrowFlies) });
        }
        if (id === 'transit') {
          var nStops = sc.transitStops.length;
          if (!nStops) {
            return fmt(t('stem.citylab.lens_sum_bus_none', 'Bus: there is no bus stop a bus can reach yet, so none of the homes a road reaches is within a {min}-minute walk of one. Bus routes are not modelled, so none are drawn.'),
              { min: TRANSIT_WALK_MINUTES });
          }
          if (nStops === 1) {
            return fmt(t('stem.citylab.lens_sum_bus_one', 'Bus: {pct} of the homes a road reaches are within a {min}-minute walk of the one bus stop a bus can reach (the shaded parcels). Bus routes are not modelled, so none are drawn.'),
              { pct: fmtPct(t1.transitAccessPct), min: TRANSIT_WALK_MINUTES });
          }
          return fmt(t('stem.citylab.lens_sum_bus', 'Bus: {pct} of the homes a road reaches are within a {min}-minute walk of one of the {n} bus stops a bus can reach (the shaded parcels). Bus routes are not modelled, so none are drawn.'),
            { pct: fmtPct(t1.transitAccessPct), min: TRANSIT_WALK_MINUTES, n: sc.transitStops.length });
        }
        if (id === 'rain') {
          return fmt(t('stem.citylab.lens_sum_rain', 'Rain and runoff: a design storm of {mm} mm an hour falls evenly on every parcel. Each parcel shows its runoff coefficient C, the share that runs off, and across the town C is {c}. Peak runoff at the outlet is {q} cubic metres a second, {pct} of the {base} the town makes today, and the brief asks for no more than {limit}. Where the water goes after it runs off is not modelled.'),
            { mm: scen.designStormMmPerHour, c: t2.runoffCoefficient.toFixed(3), q: t2.peakRunoffQ.toFixed(2),
              pct: fmtPct(t2.runoffRatio), base: t2.baselineRunoffQ.toFixed(2), limit: fmtPct(scen.runoffCeilingRatio) });
        }
        if (id === 'flood') {
          var fl = fmt(t('stem.citylab.lens_sum_flood', 'Flood: in {zone}, new homes {added} and existing homes {old}.'),
            { zone: scen.floodLabel, added: n(t1.newUnitsInFloodplain), old: n(t1.existingUnitsInFloodplain) });
          if (!scen.modelsSeaRise) return fl;
          return fl + ' ' + fmt(t('stem.citylab.lens_sum_flood_2100', 'Inside the reach planned for 2100 under {set} (a {rise} m allowance): new homes {added}, existing homes {old}, and {ha} ha of land that is dry today.'),
            { set: a.label, rise: a.planningSeaRiseM.toFixed(1), added: n(t2.newUnitsInFutureSurge), old: n(t2.existingUnitsInFutureSurge), ha: t2.landAtRiskHa });
        }
        if (id === 'access') {
          var g = accessGaps(plan);
          return fmt(t('stem.citylab.lens_sum_access', 'Access gaps: of the {homes} homes a road reaches, {any} are missing at least one of a park, a bus stop and a school or clinic within a walk, and {all} are missing all three.'),
            { homes: n(g.homes), any: n(g.lackAny), all: n(g.lackAll) });
        }
        return fmt(t('stem.citylab.lens_sum_use', 'Land use: {homes} homes a road reaches, {added} of them new. Built land {built} ha, park {park} ha, farmland in production {farm} ha.'),
          { homes: n(t1.totalUnitsServed), added: n(t1.newUnitsServed), built: t1.builtAreaHa, park: t1.parkHa, farm: t1.farmHa });
      }
      function chooseLens(id) {
        if (LENS_IDS.indexOf(id) === -1) return;
        var on3d = boardView === 'model';
        setLensSt(id);
        if (!on3d) setBoardView(id);
        // Remembered per student in toolData (not localStorage, which a shared
        // machine would hand to the next student).
        upd({ lens: id, boardView: on3d ? 'model' : id });
        announceToSR(fmt(t('stem.citylab.sr_lens', '{lens} lens. {summary}'), { lens: lensName(id), summary: lensSummary(id) }));
      }
      function chooseBoard(mode) {
        if (mode === '3d') {
          setBoardView('model');
          upd({ boardView: 'model', lens: lens });
          setGlLost(false); setRoadFrom(null);
          announceToSR(t('stem.citylab.sr_view_3d_v2', 'Showing the 3D model. Pick a tool above it, then click a parcel to change the plan. The map beside the model is the same plan, with every action on the keyboard, and the camera buttons move the view.'));
        } else {
          setBoardView(lens);
          upd({ boardView: lens, lens: lens });
          announceToSR(fmt(t('stem.citylab.sr_view_map', 'Showing the flat map with the {lens} lens. Every parcel is a button: Tab into the map and use the arrow keys.'), { lens: lensName(lens) }));
        }
      }
      function lensKeyDown(e) {
        var k = e.key;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(k) === -1) return;
        var items = Array.prototype.slice.call(e.currentTarget.querySelectorAll('[data-citylab-lens]'));
        var i = items.indexOf(document.activeElement);
        if (i === -1) return;
        var nx = k === 'Home' ? 0 : k === 'End' ? items.length - 1
          : (k === 'ArrowLeft' || k === 'ArrowUp') ? (i - 1 + items.length) % items.length : (i + 1) % items.length;
        e.preventDefault();
        items[nx].focus();
      }
      function viewControls() {
        var on3d = boardView === 'model';
        // W6: under 768 px, 3D | Map and the lens strip share ONE row.
        var strip = narrowUi;
        function boardBtn(mode, label, aria, on) {
          return h('button', {
            key: mode, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria,
            'data-citylab-board-mode': mode,
            onClick: function () { if (!on) chooseBoard(mode); },
            className: 'text-[0.6875rem] font-bold px-2 py-1',
            style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink, minHeight: '44px', minWidth: '44px' }
          }, label);
        }
        return h('div', { className: 'flex flex-wrap items-center gap-1.5 mb-1.5' },
          h('div', { className: 'flex items-center gap-1.5', role: 'group', 'aria-label': t('stem.citylab.map_view', 'Map view'),
            'data-citylab-view-controls': 'true', style: strip ? { minWidth: 0, flex: '1 1 100%', flexWrap: 'nowrap' } : { minWidth: 0, maxWidth: '100%', flexWrap: 'wrap' } },
            h('span', { className: 'inline-flex rounded border overflow-hidden', role: 'group',
              'aria-label': t('stem.citylab.board_group', 'Board'), style: { borderColor: panelBorder, flex: '0 0 auto' } },
              boardBtn('3d', t('stem.citylab.view_3d', '3D'), t('stem.citylab.view_3d_aria', 'Show the map by 3D'), on3d),
              boardBtn('map', t('stem.citylab.view_map', 'Map'), t('stem.citylab.view_map_aria', 'Show the flat map, with the same lens'), !on3d)),
            // A toolbar: ONE tab stop (the lens in use), arrows move along it.
            // On a phone it is one strip that scrolls sideways inside itself,
            // like the palette, so the board is not pushed three rows down.
            h('div', { role: 'toolbar', 'aria-label': t('stem.citylab.lens_bar', 'Lens: what the board shows'),
              'data-citylab-lens-bar': lens, onKeyDown: lensKeyDown,
              className: 'inline-flex items-center gap-1',
              style: strip ? { flexWrap: 'nowrap', overflowX: 'auto', flex: '1 1 0', minWidth: 0, paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }
                : { flexWrap: 'wrap' } },
              h('span', { 'aria-hidden': 'true', className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: dim } },
                t('stem.citylab.lens_word', 'Lens')),
              LENS_IDS.map(function (id) {
                var on = lens === id;
                return h('button', {
                  key: id, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': lensAria(id),
                  'data-citylab-lens': id, tabIndex: on ? 0 : -1,
                  onClick: function () { if (!on) chooseLens(id); },
                  className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                  style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink,
                    borderColor: on ? '#1f5eb0' : panelBorder, minHeight: '44px', minWidth: '44px',
                    flex: '0 0 auto', whiteSpace: strip ? 'nowrap' : undefined }
                }, lensName(id));
              }))),
          // The Animation switch sits beside the lenses (it only moves the 3D board).
          on3d && CITY_VIEWER ? motionRow() : null);
      }

      function boardControls() {
        function ctlBtn(label, onClick, disabled, aria, pressed) {
          return h('button', {
            type: 'button', onClick: onClick, disabled: !!disabled, 'aria-label': aria || label,
            'aria-pressed': pressed === undefined ? undefined : (pressed ? 'true' : 'false'),
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: pressed ? '#1f5eb0' : panelBg, color: pressed ? '#ffffff' : ink,
              borderColor: pressed ? '#1f5eb0' : panelBorder, opacity: disabled ? 0.45 : 1,
              minHeight: '44px', minWidth: '44px' }
          }, label);
        }
        var budgetLocked = !!teacher.moveBudget;
        // W3: Undo, Redo and the views stay in view; the settings a student
        // needs less often sit behind Options. Nothing is removed, the panel
        // stays mounted (hidden) so every control keeps its place, and a
        // teacher's locks hold inside it exactly as before.
        var optionItems = [
          ctlBtn(t('stem.citylab.keyboard_shortcuts', 'Keyboard shortcuts'), function () { setShowShortcuts(!showShortcuts); }, false,
            showShortcuts ? t('stem.citylab.hide_shortcuts', 'Hide the keyboard shortcuts') : t('stem.citylab.show_shortcuts', 'Show the keyboard shortcuts')),
          ctlBtn(t('stem.citylab.predict_every', 'Predict before every change'), function () {
            if (teacher.predictEvery) return;
            upd({ predictEvery: !d.predictEvery });
            announceToSR(!d.predictEvery
              ? t('stem.citylab.sr_predict_every_on', 'Every change will now wait for your prediction before it is applied.')
              : fmt(t('stem.citylab.sr_predict_every_off', 'Changes apply at once again. You will be asked to predict every {n} changes.'), { n: PREDICT_EVERY_N }));
          }, teacher.predictEvery,
            teacher.predictEvery ? t('stem.citylab.predict_every_locked', 'Predict before every change, set by your teacher')
              : t('stem.citylab.predict_every_aria', 'Predict before every change: each change waits for your prediction before it is applied'),
            predictEvery),
          budgetLocked ? null : (typeof plan.moveBudget === 'number'
            ? ctlBtn(t('stem.citylab.end_challenge', 'End challenge'), function () {
                applyPlan(Object.assign(clonePlan(plan), { moveBudget: null }),
                  t('stem.citylab.msg_challenge_ended', 'Limited-move challenge ended. The plan you built is kept.'));
              }, false, t('stem.citylab.end_challenge_aria', 'End the limited-move challenge and keep planning'))
            : ctlBtn(t('stem.citylab.limited_moves', 'Limited moves'), function () {
                var dropLead = stagedDropLead();
                setStaged(null); checkpointRef.current = null;
                applyPlan(startChallenge(plan.scenarioId, CHALLENGE_MOVES),
                  fmt(t('stem.citylab.msg_challenge_started', 'Limited-move challenge started in {town} with {n} moves, from the town as it stands today.'),
                    { town: scen.town, n: CHALLENGE_MOVES }), false, dropLead || undefined);
                setDropNote(dropLead);
              }, false,
              fmt(t('stem.citylab.limited_moves_aria', 'Start a limited-move challenge: {n} edits from the town as it stands today'), { n: CHALLENGE_MOVES }))),
          // W5: mission sounds, off unless the student turns them on.
          ctlBtn(t('stem.citylab.sound_switch', 'Sounds'), toggleSound, false,
            t('stem.citylab.sound_switch_aria', 'Sounds for mission results, off unless you turn them on. Every sound is also written on screen.'),
            !!d.soundOn),
          coachStep ? null : ctlBtn(t('stem.citylab.coach_reopen', 'Show the coach again'), reopenCoach, false,
            t('stem.citylab.coach_reopen_aria', 'Show the three-step coach for a first change again'))
        ].filter(Boolean);
        return h('div', null, h('div', { className: 'flex flex-wrap items-center gap-1.5 mb-1.5' },
          ctlBtn(t('stem.citylab.undo', 'Undo'), undo, !hist.past.length && !staged,
            staged ? t('stem.citylab.undo_aria_staged', 'Cancel the change that is waiting for your prediction')
              : (hist.past.length
                ? fmt(t('stem.citylab.undo_aria', 'Undo the last change, {n} available'), { n: hist.past.length })
                : t('stem.citylab.undo_aria_none', 'Nothing to undo'))),
          ctlBtn(t('stem.citylab.redo', 'Redo'), redo, !hist.future.length || !!staged,
            hist.future.length ? fmt(t('stem.citylab.redo_aria', 'Redo, {n} available'), { n: hist.future.length })
              : t('stem.citylab.redo_aria_none', 'Nothing to redo')),
          typeof plan.moveBudget === 'number'
            ? h('span', { className: 'text-[0.6875rem] font-bold px-2 py-1 rounded', role: 'status',
                style: { background: movesLeft(plan) ? 'rgba(42,120,214,0.18)' : 'rgba(235,104,52,0.18)',
                  color: movesLeft(plan) ? ink : missColour } },
                fmt(t('stem.citylab.moves_left', '{left} of {budget} moves left'), { left: movesLeft(plan), budget: plan.moveBudget }))
            : null,
          h('button', {
            type: 'button', id: 'citylab-options-toggle', 'data-citylab-options-toggle': 'true',
            'aria-expanded': optionsOpen ? 'true' : 'false', 'aria-controls': 'citylab-options',
            onClick: function () { setOptionsOpen(!optionsOpen); },
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: optionsOpen ? softBlue : panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' }
          }, (optionsOpen ? '\u25B4 ' : '\u25BE ') + t('stem.citylab.options', 'Options')),
          h('span', { className: 'text-[0.625rem] ml-auto', style: { color: dim } },
            fmt(t('stem.citylab.selected', 'Selected: {parcel}'), { parcel: selected }))),
          // W4: the board (3D or map), the lens both boards show, and Animation.
          viewControls(),
          // Mounted while closed (hidden), so aria-controls always points at it.
          // display:none as well: a utility class must never override [hidden].
          h('div', {
            id: 'citylab-options', role: 'group', 'aria-label': t('stem.citylab.options_aria', 'Options'),
            'data-citylab-options': optionsOpen ? 'open' : 'closed',
            hidden: !optionsOpen, style: optionsOpen ? undefined : { display: 'none' },
            onKeyDown: function (e) {
              if (e.key !== 'Escape') return;
              e.preventDefault(); e.stopPropagation();
              setOptionsOpen(false);
              var tg = document.getElementById('citylab-options-toggle');
              if (tg && tg.focus) tg.focus();
            }
          },
            h.apply(null, ['div', { className: 'flex flex-wrap items-center gap-1.5 mb-2 rounded border p-1.5', style: { borderColor: panelBorder } }].concat(optionItems))));
      }

      function shortcutsPanel() {
        if (!showShortcuts) return null;
        var SHORTCUTS = [
          [t('stem.citylab.key_arrows', 'Arrow keys'), t('stem.citylab.key_arrows_do', 'Move around the grid')],
          [t('stem.citylab.key_home_end', 'Home / End'), t('stem.citylab.key_home_end_do', 'Jump to the west or east edge of the row')],
          [t('stem.citylab.key_enter', 'Enter or Space'), t('stem.citylab.key_enter_do_v2', 'Select the parcel under the cursor, or, with a tool picked in the palette, use that tool on it. Escape clears the start of a road.')],
          [t('stem.citylab.key_digits', '1 to 9, then 0'), t('stem.citylab.key_digits_do', 'Set land use, in the order shown in the palette below the map')],
          [t('stem.citylab.key_g', 'G'), t('stem.citylab.key_g_do', 'Add or remove green infrastructure on this parcel')],
          [t('stem.citylab.key_shift_arrows', 'Shift + arrow keys'), t('stem.citylab.key_shift_arrows_do', 'Build or remove a road or path to the next parcel and move there. The kind is the one chosen under Build a connection.')],
          [t('stem.citylab.key_stage', 'On the 3D model'), t('stem.citylab.key_stage_do_v2', 'Arrow keys turn and tilt the camera, Shift + arrow keys slide it, + and - zoom, Home shows the whole map.')],
          [t('stem.citylab.key_question', '?'), t('stem.citylab.key_question_do', 'Open this list')],
          [t('stem.citylab.key_tab', 'Tab'), t('stem.citylab.key_tab_do', 'Leave the map. The map is a single Tab stop; the arrow keys move inside it.')]
        ];
        return h('div', { className: 'mt-2 rounded-lg border p-2',
          style: { background: panelBg, borderColor: panelBorder } },
          h('div', { className: 'flex items-baseline justify-between gap-2 mb-1' },
            h('h4', { className: 'text-[0.6875rem] font-black', style: { color: ink } }, t('stem.citylab.keyboard', 'Keyboard')),
            h('button', {
              type: 'button', onClick: function () { setShowShortcuts(false); },
              className: 'text-[0.625rem] font-bold underline', style: { color: linkColour, minHeight: '44px', minWidth: '44px' }
            }, t('stem.citylab.close', 'Close'))),
          h('dl', { className: 'text-[0.625rem] grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5' },
            SHORTCUTS.map(function (row, i) {
              return h(React.Fragment, { key: i },
                h('dt', { className: 'font-bold', style: { color: ink } }, row[0]),
                h('dd', { style: { color: dim } }, row[1]));
            })),
          h('p', { className: 'text-[0.625rem] mt-1.5', style: { color: dim } },
            fmt(t('stem.citylab.land_use_order', 'Land use order: {list}.'), { list: PALETTE_IDS.map(function (uid, i) {
              return (i === 9 ? '0' : String(i + 1)) + ' ' + useLabel(uid, plan);
            }).join(', ') })));
      }

      // A hectare is abstract until you can see how far 100 m is.
      function scaleBar() {
        return h('div', { className: 'flex items-center gap-1.5 mt-1.5', 'aria-hidden': 'true' },
          h('span', { className: 'inline-block',
            style: { width: (100 / N_COLS) + '%', height: '4px', background: ink,
              borderLeft: '2px solid ' + ink, borderRight: '2px solid ' + ink } }),
          h('span', { className: 'text-[0.625rem]', style: { color: dim } },
            t('stem.citylab.100_m_one_parcel_one_hectare', '100 m, one parcel, one hectare')));
      }

      function elevationKey() {
        var ids = allParcelIds();
        var elevs = ids.map(function (id) { return terrainAt(id, plan).elevationM; });
        var lo = Math.min.apply(null, elevs), hi = Math.max.apply(null, elevs);
        return h('div', { className: 'mt-2' },
          h('div', { className: 'flex items-center gap-1.5' },
            h('span', { className: 'text-[0.625rem]', style: { color: dim } }, fmt(t('stem.citylab.metres_short', '{m} m'), { m: lo })),
            h('span', { 'aria-hidden': 'true', className: 'flex-1 flex h-2 rounded overflow-hidden' },
              TERRAIN_RAMP.map(function (c, i) {
                return h('span', { key: i, className: 'flex-1', style: { background: lensThemeFill(c, sceneTheme) } });
              })),
            h('span', { className: 'text-[0.625rem]', style: { color: dim } }, fmt(t('stem.citylab.metres_short', '{m} m'), { m: hi }))),
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
            t('stem.citylab.elevation_key', 'Ground height, low and dark to high and pale. Land use codes stay on every parcel, and the bay keeps its own colour. Switch back to Land use to zone.')));
      }

      function rampKey(ramp, labels, caption) {
        return h('div', { className: 'mt-2' },
          h('ul', { className: 'flex flex-wrap gap-1.5', 'aria-label': caption },
            ramp.map(function (c, i) {
              return h('li', { key: i, className: 'inline-flex items-center gap-1 text-[0.625rem] px-1.5 py-0.5 rounded',
                style: { background: panelBg, border: '1px solid ' + panelBorder, color: ink } },
                h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
                  style: { width: '11px', height: '11px', backgroundColor: lensThemeFill(c, sceneTheme), outline: '1px solid rgba(15,23,42,0.4)' } }),
                labels[i]);
            })));
      }

      function heatKey() {
        var a = SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central;
        return h('div', null,
          rampKey(HEAT_RAMP, [
            fmt(t('stem.citylab.heat_key_0', 'Under {b} C: {name}'), { b: HEAT_BANDS[0], name: heatBandLabel(0) }),
            fmt(t('stem.citylab.heat_key_mid', '{a} to {b} C: {name}'), { a: HEAT_BANDS[0], b: HEAT_BANDS[1], name: heatBandLabel(1) }),
            fmt(t('stem.citylab.heat_key_mid', '{a} to {b} C: {name}'), { a: HEAT_BANDS[1], b: HEAT_BANDS[2], name: heatBandLabel(2) }),
            fmt(t('stem.citylab.heat_key_mid', '{a} to {b} C: {name}'), { a: HEAT_BANDS[2], b: HEAT_BANDS[3], name: heatBandLabel(3) }),
            fmt(t('stem.citylab.heat_key_top', '{a} C and over: {name}'), { a: HEAT_BANDS[3], name: heatBandLabel(4) })
          ], t('stem.citylab.heat_key_caption', 'Surface heat key, in degrees C above shaded vegetated ground')),
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
            fmt(t('stem.citylab.heat_view_note', 'MODELLED, under {set}. The number on a parcel is how many degrees C hotter its roofs and pavement get than shaded, planted ground on a clear summer afternoon. It is the surface, not the air: the air over a whole town differs by only a few degrees. Open the surface heat model under the scorecard for the formula and the sources.'),
              { set: a.label })));
      }

      function accessKey() {
        return rampKey(ACCESS_RAMP.concat([ACCESS_NONE]), [
          t('stem.citylab.access_key_0', '0: a park, a bus stop and a school or clinic all within a walk'),
          t('stem.citylab.access_key_1', '1: one of the three missing'),
          t('stem.citylab.access_key_2', '2: two missing'),
          t('stem.citylab.access_key_3', '3: all three missing'),
          t('stem.citylab.access_key_none', 'No homes a road reaches')
        ], t('stem.citylab.access_key_caption', 'Access gaps key: the number on each home parcel is how many of the three are out of walking range'));
      }

      // The equity view's panel. Counts, not a score, and a structured
      // discussion that ends in a decision the student records.
      function accessPanel() {
        var g = accessGaps(plan);
        var eq = plan.equity || { priority: '', note: '' };
        var setEquity = function (patch) {
          setPlan(function (prev) {
            var nx = clonePlan(prev);
            nx.equity = Object.assign({ priority: '', note: '' }, nx.equity, patch);
            return nx;
          });
        };
        var parcelsLacking = function (k) { return g.rows.filter(function (r) { return r.missing.indexOf(k) !== -1; }).map(function (r) { return r.id; }); };
        return panel('access-gaps', t('stem.citylab.access_title', 'Who can walk to what'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
              fmt(t('stem.citylab.access_intro', 'MEASURED, along streets and paths, for the {n} homes a road reaches. A park counts within {p} minutes, a bus stop within {b} minutes, and a school or clinic within {c} minutes. These are counts of homes, not a grade for the plan or for the people in it.'),
                { n: g.homes.toLocaleString(), p: g.minutes.park, b: g.minutes.transit, c: g.minutes.clinic })),
            h('table', { className: 'w-full text-[0.6875rem] mb-2', style: { color: ink } },
              h('caption', { className: 'sr-only' }, t('stem.citylab.access_table_caption', 'Homes without each kind of access within walking range')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', className: 'text-left' }, t('stem.citylab.access_col_what', 'Within a walk of')),
                h('th', { scope: 'col', className: 'text-right' }, t('stem.citylab.access_col_lacking', 'Homes without it')),
                h('th', { scope: 'col', className: 'text-left pl-2' }, t('stem.citylab.access_col_where', 'Where')))),
              h('tbody', null, EQUITY_KINDS.map(function (k) {
                var where = parcelsLacking(k);
                return h('tr', { key: k },
                  h('th', { scope: 'row', className: 'text-left font-normal' }, gapKindName(k)),
                  h('td', { className: 'text-right tabular-nums font-bold' }, g.lack[k].toLocaleString()),
                  h('td', { className: 'pl-2', style: { color: dim } }, where.length ? where.join(', ') : t('stem.citylab.access_nowhere', 'none')));
              }))),
            h('p', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
              fmt(t('stem.citylab.access_any_all', 'Homes missing at least one: {any}. Homes missing all three: {all}.'),
                { any: g.lackAny.toLocaleString(), all: g.lackAll.toLocaleString() })),
            h('div', { className: 'mt-2 rounded p-2', style: { background: softBlue } },
              h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } }, t('stem.citylab.access_disc_title', 'Talk it through')),
              h('ol', { className: 'text-[0.6875rem] list-decimal pl-4 space-y-1', style: { color: ink } },
                h('li', null, t('stem.citylab.access_q1', 'Notice: are the homes without access spread across the town, or bunched in one part of it? Use the map or Describe the map row by row.')),
                h('li', null, t('stem.citylab.access_q2', 'Wonder: who depends most on walking to get somewhere? Think of people too young to drive, people who no longer drive, and households without a car. This tool does not know who lives anywhere, so this is a question for you, not a number.')),
                h('li', null, t('stem.citylab.access_q3', 'Decide: if you could close only one gap first, which would it be, and what would it cost from the bond? Try it on the map, then record your choice below.'))),
              h('label', { className: 'block text-[0.6875rem] font-bold mt-2', style: { color: ink } },
                t('stem.citylab.access_priority', 'The gap I would close first'),
                h('select', {
                  value: eq.priority || '',
                  onChange: function (e) { setEquity({ priority: e.target.value }); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                },
                  h('option', { value: '' }, t('stem.citylab.choose_one', 'Choose one')),
                  EQUITY_KINDS.map(function (k) { return h('option', { key: k, value: k }, gapKindName(k)); }))),
              h('label', { className: 'block text-[0.6875rem] font-bold mt-2', style: { color: ink } },
                t('stem.citylab.access_note', 'Why that one, and for which homes?'),
                h('textarea', {
                  value: eq.note || '', rows: 3,
                  onChange: function (e) { setEquity({ note: e.target.value }); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                })),
              h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
                t('stem.citylab.access_note_memo', 'Your choice goes into the memo export. Nothing here is scored.')))));
      }

      // Describe the map row by row, and the two sound controls.
      function mapTools() {
        var row = parcelRow(selected);
        var useHeat = lens === 'heat';
        return h('div', { className: 'mt-2' },
          h('div', { className: 'flex flex-wrap gap-1.5' },
            smallBtn(describeOpen ? t('stem.citylab.describe_hide', 'Hide the row-by-row description') : t('stem.citylab.describe_show', 'Describe the map row by row'),
              function () { setDescribeOpen(!describeOpen); }, { pressed: describeOpen }),
            smallBtn(fmt(useHeat ? t('stem.citylab.listen_row_heat', 'Listen to row {row}: surface heat') : t('stem.citylab.listen_row_height', 'Listen to row {row}: ground height'), { row: row }),
              function () {
                var vals = [];
                for (var c = 0; c < N_COLS; c++) {
                  var id = pid(c, row);
                  vals.push(useHeat ? (sc.surfaceHeat[id] === undefined ? null : sc.surfaceHeat[id]) : terrainAt(id, plan).elevationM);
                }
                playTones(sonifyRow(vals), fmt(useHeat
                  ? t('stem.citylab.sr_listen_row_heat', 'Row {row}, column A to column L. Higher pitch is hotter surface; a gap is water.')
                  : t('stem.citylab.sr_listen_row_height', 'Row {row}, column A to column L. Higher pitch is higher ground.'), { row: row }));
              }),
            audioRef.current ? smallBtn(t('stem.citylab.sound_stop', 'Stop the sound'), function () {
              stopTones(); var m = t('stem.citylab.sound_stopped', 'Sound stopped.'); setSoundNote(m); announceToSR(m);
            }) : null),
          soundNote ? h('p', { className: 'text-[0.625rem] mt-1', role: 'status', style: { color: dim } }, soundNote) : null,
          describeOpen
            ? h('ol', { className: 'text-[0.6875rem] mt-2 space-y-0.5 rounded p-2', style: { color: ink, background: softRow },
                'aria-label': fmt(t('stem.citylab.describe_label', '{town}, row by row, north to south'), { town: scen.town }) },
                describeMapRows(plan, lens).map(function (line, i) {
                  return h('li', { key: i }, line);
                }))
            : null);
      }

      function orbit(dRotY, dRotX, dZoom) {
        setCam(function (c) {
          return Object.assign({}, c, {
            rotY: (c.rotY + (dRotY || 0) + 360) % 360,
            rotX: Math.max(-5, Math.min(80, c.rotX + (dRotX || 0))),
            zoom: Math.max(0.5, Math.min(3, c.zoom * (dZoom || 1)))
          });
        });
      }

      // W3: a preset changes the angle and keeps what the camera frames;
      // Reset (and Home) returns to the starting angle over the WHOLE map.
      function setCamPreset(id) {
        var p = CAM_PRESETS[id] || CAM_HOME;
        setCam(function (c) {
          return Object.assign({}, c, { rotY: p.rotY, rotX: p.rotX, zoom: p.zoom },
            id === 'home' ? { frame: wholeFrame() } : null);
        });
      }
      // W3: slide the view, in parcels, relative to the screen: right, and
      // away from the camera. The frame's centre stays on the map.
      function panCam(right, away) {
        setCam(function (c) {
          var mv = screenPan(c.rotY, right, away);
          return Object.assign({}, c, { frame: panFrame(c.frame, mv.dx, mv.dz) });
        });
      }
      function frameOn(kind) {
        setCam(function (c) {
          return Object.assign({}, c, { zoom: 1, frame: kind === 'town' ? townFrame(plan) : parcelFrame(selected) });
        });
      }
      // W8: in full screen, the frame that keeps parcel id clear of the HUD.
      function hudFollow(id, c) {
        return fullscreen && cityFsRef.current ? cityFollowFrame(id, c, cityHudRects(cityFsRef.current)) : null;
      }
      // The HUD's Zoom to: the parcel's frame, slid at once (no ease, as with
      // the Zoom to under the model) until the HUD leaves it clear.
      function zoomToParcelHud() {
        var c1 = Object.assign({}, cam, { zoom: 1, frame: parcelFrame(selected) });
        var f = hudFollow(selected, c1);
        var fr = f ? Object.assign({}, f, { kind: 'parcel' }) : c1.frame;
        setCam(function (c) { return Object.assign({}, c, { zoom: 1, frame: fr }); });
      }
      // A change waiting for its prediction belongs to the plan it was made
      // on: a fresh plan cancels it, and these words say so.
      function stagedDropLead() {
        return staged ? t('stem.citylab.staged_dropped_new_plan', 'The change that was waiting for your prediction was cancelled. It was not applied to the new plan.') : '';
      }

      // ---- W1: the 3D board. A tool palette, a stage you can click, and the
      // roving map beside it as the accessible twin of every action.
      function toolLabel(id) {
        if (id === 'inspect') return t('stem.citylab.tool_inspect', 'Inspect');
        if (id === 'road') return t('stem.citylab.tool_road', 'Road');
        if (id === 'path') return t('stem.citylab.tool_path', 'Walking path');
        if (id === 'stop') return t('stem.citylab.tool_stop', 'Bus stop');
        if (id === 'cool') return t('stem.citylab.tool_cool', 'Cool roofs');
        if (id === 'gi') return t('stem.citylab.tool_gi', 'Green infrastructure');
        return useLabel(id, plan);
      }
      function toolHint(id, from) {
        if (id === 'inspect') return t('stem.citylab.tool_hint_inspect', 'Click a parcel to select it and read it in the inspector. Nothing changes.');
        if (id === 'road' || id === 'path') {
          if (from) return fmt(t('stem.citylab.tool_hint_road_next', 'Now click a parcel next to {parcel} to build or remove the connection. Press Escape to start again.'), { parcel: from });
          return id === 'road'
            ? t('stem.citylab.tool_hint_road', 'Click a parcel, then a parcel next to it, to build a road between them, or to remove one you built.')
            : t('stem.citylab.tool_hint_path', 'Click a parcel, then a parcel next to it, to build a walking path between them, or to remove one you built.');
        }
        if (id === 'stop') return t('stem.citylab.tool_hint_stop', 'Click a parcel a road runs into to add a bus stop, or a parcel with a stop to remove it.');
        if (id === 'cool') return t('stem.citylab.tool_hint_cool', 'Click a parcel with buildings to add or remove cool roofs. The owner pays, not the bond.');
        if (id === 'gi') return t('stem.citylab.tool_hint_gi', 'Click a built parcel to add or remove green infrastructure.');
        return fmt(t('stem.citylab.tool_hint_use', 'Click a parcel to make it {use}.'), { use: useLabel(id, plan) });
      }
      function chooseTool(id) {
        if (STAGE_TOOL_IDS.indexOf(id) === -1) return;
        setTool(id); setRoadFrom(null); setStageNote('');
        announceToSR(fmt(t('stem.citylab.sr_tool', 'Tool: {tool}. {hint}'), { tool: toolLabel(id), hint: toolHint(id, null) }));
      }
      function stageSay(msg) { setStageNote(msg); if (msg) announceToSR(msg); }

      // A click on the model: the active tool, through the same parcelAction
      // as every other surface. Selection follows the parcel acted on.
      function stageApply(id) {
        if (!id) return;
        var res = null;
        if (tool === 'inspect') {
          setSelected(id);
          stageSay(fmt(t('stem.citylab.stage_selected', 'Selected {parcel}.'), { parcel: id }));
          return;
        }
        if (tool === 'road' || tool === 'path') {
          if (!roadFrom) {
            setRoadFrom(id); setSelected(id);
            stageSay(toolHint(tool, id));
            return;
          }
          if (roadFrom === id) {
            setRoadFrom(null);
            stageSay(t('stem.citylab.stage_road_cleared', 'Start parcel cleared. Click a parcel to start again.'));
            return;
          }
          if (!areNeighbours(roadFrom, id)) {
            setRoadFrom(id); setSelected(id);
            stageSay(fmt(t('stem.citylab.stage_road_moved', '{b} is not next to {a}, so the connection now starts at {b}. Click a parcel next to it.'), { a: roadFrom, b: id }));
            return;
          }
          res = parcelAction('edge', roadFrom, { b: id, edgeKind: tool === 'path' ? 'path' : 'local' });
          setRoadFrom(null);
        } else if (tool === 'stop') res = parcelAction('transit', id);
        else if (tool === 'cool') res = parcelAction('cool', id);
        else if (tool === 'gi') res = parcelAction('gi', id);
        else res = parcelAction('use', id, { useId: tool });
        setSelected(id);
        // parcelAction has already spoken; the note is the visible copy.
        setStageNote(res && res.message ? res.message : '');
      }

      // Pointer: a press that moves under 6 px is a click; more is an orbit;
      // two fingers pinch to zoom. touch-action: pan-y keeps a vertical
      // swipe scrolling the page, so the stage is never a scroll trap.
      function ptrKey(e) { return e.pointerId == null ? 'p1' : 'p' + e.pointerId; }
      function ptrGap(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }
      function stagePointerDown(e) {
        var R = pointersRef.current;
        if (!R.pts) R.pts = {};
        R.pts[ptrKey(e)] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, far: 0, primary: !e.button, shift: !!e.shiftKey };
        var ks = Object.keys(R.pts);
        if (ks.length >= 2) {
          R.pinch = ptrGap(R.pts[ks[0]], R.pts[ks[1]]);
          R.mid = { x: (R.pts[ks[0]].x + R.pts[ks[1]].x) / 2, y: (R.pts[ks[0]].y + R.pts[ks[1]].y) / 2 };
          ks.forEach(function (k) { R.pts[k].far = 99; });   // a pinch is never a click
        }
        if (hover) setHover(null);
        var el = e.currentTarget;
        if (el && el.setPointerCapture && e.pointerId != null) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      }
      function stagePointerMove(e) {
        var R = pointersRef.current, pts = R.pts || {}, p = pts[ptrKey(e)];
        if (!p) {
          if (!e.pointerType || e.pointerType === 'mouse') {
            var hid = cityPick(e.clientX, e.clientY);
            if (hid !== hover) setHover(hid);
          }
          return;
        }
        p.far = Math.max(p.far, Math.abs(e.clientX - p.sx) + Math.abs(e.clientY - p.sy));
        var ks = Object.keys(pts);
        if (ks.length >= 2) {
          p.x = e.clientX; p.y = e.clientY;
          var g = ptrGap(pts[ks[0]], pts[ks[1]]);
          if (R.pinch > 0 && g > 0) orbit(0, 0, g / R.pinch);
          R.pinch = g;
          // W3: two fingers moving together slide the view.
          var mid = { x: (pts[ks[0]].x + pts[ks[1]].x) / 2, y: (pts[ks[0]].y + pts[ks[1]].y) / 2 };
          if (R.mid) { var k2 = panPerPixel(); panCam(-(mid.x - R.mid.x) * k2, (mid.y - R.mid.y) * k2); }
          R.mid = mid;
          return;
        }
        if (p.far < 6) return;              // not a drag yet: the camera stays put
        var dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        // W3: Shift + drag slides the view instead of turning it; the ground
        // follows the pointer.
        if (p.shift || e.shiftKey) { var k1 = panPerPixel(); panCam(-dx * k1, dy * k1); return; }
        orbit(dx * 0.4, -dy * 0.3, 1);
      }
      function stagePointerUp(e) {
        var R = pointersRef.current, pts = R.pts || {}, k = ptrKey(e), p = pts[k];
        delete pts[k];
        if (Object.keys(pts).length < 2) { R.pinch = 0; R.mid = null; }
        if (!p || p.far >= 6 || !p.primary || Object.keys(pts).length) return;
        stageApply(cityPick(e.clientX, e.clientY));
      }
      function stagePointerCancel(e) {
        var R = pointersRef.current;
        if (R.pts) delete R.pts[ptrKey(e)];
        R.pinch = 0; R.mid = null;
      }
      // About how far the ground moves under one pixel of drag at this
      // zoom: the framed width over the stage width.
      function panPerPixel() {
        var f = cam.frame || wholeFrame();
        var w = (stageRef.current && stageRef.current.clientWidth) || 600;
        return (2.4 * Math.max(f.hx, f.hz)) / (Math.max(0.5, cam.zoom) * w);
      }
      function stageKeyDown(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var k = e.key;
        // W3: Shift + arrows slide the view one parcel; plain arrows turn it.
        if (e.shiftKey && /^Arrow(Left|Right|Up|Down)$/.test(k)) {
          e.preventDefault();
          if (k === 'ArrowLeft') panCam(-1, 0);
          else if (k === 'ArrowRight') panCam(1, 0);
          else if (k === 'ArrowUp') panCam(0, 1);
          else panCam(0, -1);
          return;
        }
        if (k === 'ArrowLeft') orbit(-15, 0, 1);
        else if (k === 'ArrowRight') orbit(15, 0, 1);
        else if (k === 'ArrowUp') orbit(0, 8, 1);
        else if (k === 'ArrowDown') orbit(0, -8, 1);
        else if (k === '+' || k === '=') orbit(0, 0, 1.18);
        else if (k === '-' || k === '_') orbit(0, 0, 1 / 1.18);
        else if (k === 'Home') setCamPreset('home');
        // W7: the keyboard twin of a click, through the same stageApply (so the
        // prediction gate, the move budget, Undo and the words all hold). Roads
        // take the same two presses. Inspect leaves Enter alone, as on the map.
        else if ((k === 'Enter' || k === ' ' || k === 'Spacebar') && !e.shiftKey && tool !== 'inspect') {
          if (!e.repeat) stageApply(selected);
        } else if (k === 'Escape' && roadFrom) {
          setRoadFrom(null);
          stageSay(t('stem.citylab.stage_road_cleared', 'Start parcel cleared. Click a parcel to start again.'));
        } else return;
        e.preventDefault();
      }

      // The hovered parcel, in the inspector's own numbers: the same
      // functions, the plan as it stands (so a staged change shows nothing new).
      function hoverChip() {
        var id = hover;
        if (!id || !USE_BY_ID[plan.uses[id]]) return null;
        var use = USE_BY_ID[plan.uses[id]], units = unitsOnParcel(plan, id), served = servedParcels(plan);
        var parts = [fmt(t('stem.citylab.chip_title', '{parcel}: {use}'), { parcel: id, use: useLabel(use.id, plan) })];
        if (units > 0) {
          parts.push(fmt(t('stem.citylab.cell_homes', '{n} homes'), { n: units }));
          parts.push(served[id] ? t('stem.citylab.chip_road_yes', 'a road reaches it') : t('stem.citylab.chip_road_no', 'no road reaches it'));
        }
        parts.push(fmt(t('stem.citylab.chip_c', 'C = {c}'), { c: effectiveC(plan, id, SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central).toFixed(2) }));
        if (use.id !== 'water' && sc.surfaceHeat[id] !== undefined) {
          parts.push(fmt(t('stem.citylab.chip_heat', 'surface heat {c} C above shade'), { c: (sc.surfaceHeat[id] || 0).toFixed(1) }));
        }
        return h('div', { 'aria-hidden': 'true', 'data-citylab-hover-chip': id,
          className: 'absolute text-[0.6875rem] font-bold rounded px-2 py-1',
          style: { left: '8px', top: '8px', maxWidth: 'calc(100% - 16px)', background: 'rgba(15,23,42,0.9)', color: '#ffffff', pointerEvents: 'none' } },
          parts.join(' · '));
      }

      // W2: the last applied edit as chips on the board, built from the same
      // deltaValues as the spoken delta. None while an edit waits for a
      // prediction: the numbers are held back until the student answers.
      function deltaChipStrip() {
        if (!lastChips || staged) return null;
        var chipStyle = { background: '#0f172a', color: '#ffffff', borderRadius: '6px', padding: '2px 8px' };
        var items = lastChips.length
          ? lastChips.map(function (ch) {
              return h('span', { key: ch.id, 'data-citylab-chip': ch.id, className: 'text-[0.6875rem] font-bold', style: chipStyle }, chipText(ch));
            })
          : [h('span', { key: 'none', 'data-citylab-chip': 'none', className: 'text-[0.6875rem] font-bold', style: chipStyle },
              t('stem.citylab.chip_none', 'No change to homes, runoff or cost'))];
        return h('div', { 'data-citylab-delta-chips': 'true', className: 'absolute flex flex-wrap items-center gap-1',
          style: { left: '8px', bottom: '8px', maxWidth: 'calc(100% - 16px)', pointerEvents: 'none' } },
          h('span', { className: 'text-[0.6875rem] font-bold', style: chipStyle }, t('stem.citylab.chip_last_change', 'Last change:')),
          items);
      }

      // W2: the Animation switch. Under reduced motion, on a low-power device
      // or after the frame watchdog tripped, the town stands still and says why.
      function toggleMotion() {
        var turningOff = !d.motionOff;
        upd({ motionOff: turningOff });
        announceToSR(turningOff
          ? t('stem.citylab.sr_motion_off', 'Animation off: the town stands still. Nothing it shows is lost.')
          : t('stem.citylab.sr_motion_on', 'Animation on: people walk and cars drive for a while after each change, then the town rests.'));
      }
      function motionRow() {
        var blocked = motionTier !== 'T2' || slow;
        var why = null;
        if (rmNow) why = t('stem.citylab.motion_rm', 'Your device asks for less motion, so the town stands still. Everything it shows is still there.');
        else if (slow) why = t('stem.citylab.motion_slow_note', 'Animation was turned off because the model was drawing slowly on this device. Everything it shows is still there.');
        else if (motionTier !== 'T2') why = t('stem.citylab.motion_low', 'This device shows the town standing still, to keep it responsive. Everything it shows is still there.');
        return h('div', { className: 'flex flex-wrap items-center gap-2', 'data-citylab-motion': motionOn ? 'on' : 'off',
          style: { flex: '1 1 160px' } },
          h('button', {
            type: 'button', 'aria-pressed': motionOn ? 'true' : 'false', disabled: blocked,
            'data-citylab-motion-switch': 'true',
            onClick: toggleMotion,
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: motionOn ? '#1f5eb0' : panelBg, color: motionOn ? '#ffffff' : ink,
              borderColor: motionOn ? '#1f5eb0' : panelBorder, minHeight: '44px', minWidth: '44px', opacity: blocked ? 0.6 : 1 }
          }, t('stem.citylab.motion_switch', 'Animation')),
          why ? h('p', { className: 'text-[0.6875rem]', style: { color: ink, flex: '1 1 160px' } }, why) : null);
      }

      // W2: what the moving parts mean, in the model's own numbers.
      function livingLegend() {
        var L = livingCity(plan, plan.assumptionSetId);
        return h('div', { className: 'text-[0.6875rem] mt-2 space-y-0.5', style: { color: ink }, 'data-citylab-living': 'true' },
          h('p', { 'data-citylab-living-people': String(L.people.length) },
            fmt(t('stem.citylab.living_people', 'People: one figure for every {n} homes a road reaches, so {f} figures for {homes} homes. A figure is not a count of residents.'),
              { n: L.ratio, f: L.people.length, homes: L.unitsServed })),
          L.noRoad.length
            ? h('p', { 'data-citylab-living-noroad': L.noRoad.join(',') },
                fmt(t('stem.citylab.living_no_road', 'Homes no road reaches have dark windows and a "no road" sign, and no figures: {parcels} ({homes} homes, not counted).'),
                  { parcels: L.noRoad.join(', '), homes: L.unitsUnserved }))
            : null,
          L.cars.length
            ? h('p', null, t('stem.citylab.living_cars', 'Cars are there for life only: a few, all alike and evenly spread over roads that reach the town centre. Traffic is not modelled.'))
            : null,
          L.buses.length
            ? h('p', null, L.buses.length === 1
                ? t('stem.citylab.living_buses_one', 'A bus waits at the one stop a road reaches. Bus routes are not modelled, so none are drawn.')
                : fmt(t('stem.citylab.living_buses', 'Buses wait at the {n} stops a road reaches. Bus routes are not modelled, so none are drawn.'), { n: L.buses.length }))
            : null);
      }

      // W3: the palette is grouped (Build, Connect, Improve, with the rarer
      // uses one tap away under More uses) and is ONE tab stop: Tab lands on
      // the tool in use, the arrow keys move along it (a toolbar). K-2 and
      // 3-5 see a picture above each word. Every tool is still here.
      function paletteKeyDown(e) {
        var k = e.key;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(k) === -1) return;
        var items = Array.prototype.slice.call(e.currentTarget.querySelectorAll('[data-citylab-palette-item]'));
        var i = items.indexOf(document.activeElement);
        if (i === -1) return;
        var n = k === 'Home' ? 0 : k === 'End' ? items.length - 1
          : (k === 'ArrowLeft' || k === 'ArrowUp') ? (i - 1 + items.length) % items.length : (i + 1) % items.length;
        e.preventDefault();
        items[n].focus();
      }
      function toolPalette(hud) {
        var swatch = { road: '#ffffff', path: PATH_INK, stop: '#facc15', cool: '#f8fafc', gi: '#15803d' };
        // On a phone the tools are one strip that scrolls sideways inside
        // itself, so the stage is not pushed six rows down the page.
        // W6: below 768 px (the lead's note), on the map board as well, and
        // always in the fullscreen HUD.
        var strip = narrowUi || !!hud;
        var pics = simpleView;
        var shown = ['inspect'].concat(PALETTE_GROUPS.build, moreUses ? PALETTE_GROUPS.more : [],
          PALETTE_GROUPS.connect, PALETTE_GROUPS.improve);
        var tabTool = shown.indexOf(tool) !== -1 ? tool : 'inspect';
        function toolBtn(id) {
          var on = tool === id, u = USE_BY_ID[id];
          var fill = u ? u.fill : swatch[id];
          return h('button', {
            key: id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
            'data-citylab-tool': id, 'data-citylab-palette-item': 'true',
            tabIndex: id === tabTool ? 0 : -1,
            onClick: function () { chooseTool(id); },
            className: (pics ? 'inline-flex flex-col items-center justify-center gap-0.5 text-[0.6875rem] ' : 'inline-flex items-center gap-1 text-[0.625rem] ')
              + 'font-bold px-2 rounded border',
            style: { minHeight: pics ? '60px' : '44px', minWidth: pics ? '64px' : '44px', background: on ? '#1f5eb0' : panelBg,
              color: on ? '#ffffff' : ink, borderColor: on ? '#1f5eb0' : panelBorder,
              flex: '0 0 auto', whiteSpace: strip ? 'nowrap' : undefined, maxWidth: pics ? '7.5rem' : undefined, textAlign: 'center' }
          },
            pics
              ? h('span', { 'aria-hidden': 'true', 'data-citylab-tool-pic': id, style: { fontSize: '1.25rem', lineHeight: 1 } }, TOOL_ICONS[id] || '')
              : (fill ? h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
                  style: { width: '11px', height: '11px', backgroundColor: fill,
                    backgroundImage: u ? patternCss(u.pattern, 'rgba(255,255,255,0.6)') : 'none',
                    backgroundSize: u && u.pattern === 'dots' ? '5px 5px' : 'auto',
                    outline: '1px solid rgba(15,23,42,0.45)' } }) : null),
            toolLabel(id));
        }
        function group(key, label, ids, extra) {
          // W6: wide, a group may wrap inside its row (it overflowed at 768 px).
          return h('div', { key: key, role: 'group', 'aria-label': label, 'data-citylab-palette-group': key,
            className: 'flex items-center gap-1', style: strip ? { flexWrap: 'nowrap', flex: '0 0 auto' } : { flexWrap: 'wrap', flex: '0 1 auto', minWidth: 0 } },
            h('span', { 'aria-hidden': 'true', className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: hud ? '#e2e8f0' : dim } }, label),
            ids.map(toolBtn), extra || null);
        }
        var moreBtn = h('button', {
          key: 'more', type: 'button', 'data-citylab-palette-item': 'true', 'data-citylab-more-uses': 'true',
          tabIndex: -1, 'aria-expanded': moreUses ? 'true' : 'false',
          'aria-controls': moreUses ? 'citylab-more-uses' : undefined,
          onClick: function () { setMoreUses(!moreUses); },
          className: 'inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 rounded border',
          style: { minHeight: pics ? '60px' : '44px', minWidth: '44px', background: panelBg, color: ink, borderColor: panelBorder,
            borderStyle: 'dashed', flex: '0 0 auto', whiteSpace: strip ? 'nowrap' : undefined }
        }, moreUses ? t('stem.citylab.fewer_uses', 'Fewer uses') : t('stem.citylab.more_uses', 'More uses'));
        return h('div', { className: 'flex gap-x-3 gap-y-1 mb-1', role: 'toolbar', 'data-citylab-palette': pics ? 'pictures' : 'words',
          'aria-label': stageLive ? t('stem.citylab.tool_palette', 'Tools for the 3D model: pick one, then click a parcel')
            : t('stem.citylab.tool_palette_map', 'Tools for the map: pick one, then click a parcel or press Enter on it'),
          onKeyDown: paletteKeyDown,
          style: strip ? { flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' } : { flexWrap: 'wrap', alignItems: 'center' } },
          // W5: Inspect starts the Build row instead of sitting alone on its
          // own (the pair wraps inside, so the row never leaves it behind).
          h('div', { key: 'build-row', 'data-citylab-palette-row': 'build', className: 'flex items-center gap-1',
            style: { flexWrap: 'nowrap', flex: strip ? '0 0 auto' : '0 1 auto', minWidth: 0 } },
            toolBtn('inspect'),
            h('div', { style: { flex: strip ? '0 0 auto' : '1 1 auto', minWidth: 0, display: 'flex' } },
              group('build', t('stem.citylab.palette_build', 'Build'), PALETTE_GROUPS.build, moreBtn))),
          moreUses ? h('div', { key: 'more-uses', id: 'citylab-more-uses', role: 'group', 'aria-label': t('stem.citylab.more_uses', 'More uses'),
            className: 'flex items-center gap-1', style: { flexWrap: strip ? 'nowrap' : 'wrap', flex: '0 0 auto' } },
            PALETTE_GROUPS.more.map(toolBtn)) : null,
          group('connect', t('stem.citylab.palette_connect', 'Connect'), PALETTE_GROUPS.connect),
          group('improve', t('stem.citylab.palette_improve', 'Improve'), PALETTE_GROUPS.improve));
      }

      function modelView() {
        var m = buildMassing(plan, plan.assumptionSetId, null);
        var failed = !CITY_VIEWER || glStatus === 'failed';
        var show3d = !failed && !glLost;

        // No WebGL, or a context that died: the map becomes the board, with a
        // short note. Nothing is missing, and no dead canvas is left showing.
        var fallback = show3d ? null : h('div', { className: 'rounded-lg border p-3 mb-2', 'data-citylab-3d-fallback': glLost ? 'lost' : 'none',
          style: { background: panelBg, borderColor: panelBorder } },
          glLost
            ? h('p', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                t('stem.citylab.gl_lost_note', 'The 3D model stopped working on this device. Nothing is lost: the map below shows the same plan and keeps working.'))
            : h('p', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                t('stem.citylab.the_3d_model_is_not_available_on_this_', 'The 3D model is not available on this device.')),
          glLost
            ? (glStatus === 'ready'
              ? h('div', { className: 'mt-1' }, smallBtn(t('stem.citylab.gl_back', 'Back to 3D'), function () {
                  setGlLost(false);
                  pendingFocusRef.current = 'citylab-stage';
                  announceToSR(t('stem.citylab.sr_view_3d_v2', 'Showing the 3D model. Pick a tool above it, then click a parcel to change the plan. The map beside the model is the same plan, with every action on the keyboard, and the camera buttons move the view.'));
                }, { primary: true }))
              : null)
            : h('p', { className: 'text-[0.6875rem] mt-1', style: { color: dim } },
                t('stem.citylab.no_3d_fallback_v2', 'Nothing is missing from your plan. The map below shows the same plan and is fully editable, and so is the Parcel table. Every number on the scorecard is computed from the plan, not from the picture.')));

        // W4: the twin shows the same lens; its key is under the stage (or,
        // with no model, under the map). The land-use codes stay listed here.
        var twin = [
          fallback,
          show3d ? h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
            t('stem.citylab.twin_title', 'The same plan as a map. Tab into it and use the arrow keys: every action on the model has a key here.')) : null,
          show3d ? null : mapPaletteBlock(),
          board(), show3d ? (lens === 'use' ? legend() : null) : lensLegend(), scaleBar()
        ];
        // Children as arguments, not one array, so React asks for no keys.
        if (!CITY_VIEWER) return h.apply(null, ['div', { 'data-citylab-board3d': 'none' }].concat(twin));

        // Stage C: the overlays are drawn now, and both the label and the
        // visible key say how, with this plan's counts.
        var ov = m.overlays || { coolRoofs: 0, busStops: 0, greenInfra: 0 };
        var overlayNote = t('stem.citylab.model_overlays_key', 'Cool roofs are drawn as white caps on the blocks, bus stops as a post with a yellow sign (red where no road reaches the stop), and green infrastructure as a low green block.')
          + ' ' + fmt(t('stem.citylab.model_overlays_counts', 'In this plan: cool-roof parcels {roofs}, bus stops {stops}, green-infrastructure parcels {gi}.'),
            { roofs: ov.coolRoofs, stops: ov.busStops, gi: ov.greenInfra });

        // `pressed` is optional: the camera nudges are plain actions with no state,
        // but the full-screen toggle is on or off and has to say which, or a screen
        // reader announces the same thing in both states.
        function camBtn(label, aria, fn, pressed) {
          return h('button', {
            type: 'button', onClick: fn, 'aria-label': aria,
            'aria-pressed': pressed === undefined ? undefined : (pressed ? 'true' : 'false'),
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' }
          }, label);
        }
        var narrowCam = typeof window !== 'undefined' && window.innerWidth < 640;
        var camResetBtn = camBtn(t('stem.citylab.cam_reset', 'Reset view'), t('stem.citylab.cam_reset_aria_v2', 'Show the whole map from the starting angle'),
          function () { setCamPreset('home'); });
        // W3: frame the town, or zoom in on the selected parcel, and slide.
        var camFrameBtns = [
          camBtn(t('stem.citylab.cam_town', 'The town'), t('stem.citylab.cam_town_aria', 'Zoom to the part of the map where the buildings are'), function () { frameOn('town'); }),
          camBtn(fmt(t('stem.citylab.cam_focus', 'Zoom to {parcel}'), { parcel: selected }),
            fmt(t('stem.citylab.cam_focus_aria', 'Zoom in on the selected parcel, {parcel}, and the parcels round it'), { parcel: selected }), function () { frameOn('parcel'); })
        ];
        var camPanBtns = [
          camBtn('\u2190', t('stem.citylab.cam_pan_left', 'Slide the view left'), function () { panCam(-1, 0); }),
          camBtn('\u2191', t('stem.citylab.cam_pan_up', 'Slide the view away from you'), function () { panCam(0, 1); }),
          camBtn('\u2193', t('stem.citylab.cam_pan_down', 'Slide the view towards you'), function () { panCam(0, -1); }),
          camBtn('\u2192', t('stem.citylab.cam_pan_right', 'Slide the view right'), function () { panCam(1, 0); })
        ];
        // W2: on a phone the stage is about as tall as it is wide, so the
        // town fills it instead of floating in a tall empty canvas.
        var stageH = (typeof window !== 'undefined' && window.innerWidth >= 1024) ? 520
          : (narrowCam ? Math.max(260, Math.min(420, Math.round(window.innerWidth * 0.78))) : 420);
        var cursor = tool === 'inspect' ? 'pointer' : 'crosshair';

        // W6: Full screen goes through the host helper (real full screen, or
        // its fill-the-frame fallback inside an embed); without it, a state flag.
        function fsToggle() {
          if (typeof window.__alloStemFS === 'function') window.__alloStemFS(cityFsRef.current);
          else setFullscreen(!fullscreen);
        }
        // W6: in full screen, Tab stays among the controls on screen (the page
        // behind is covered) and Escape leaves; a key a control already used
        // (Escape clearing a road start) is left to that control.
        function fsKeyDown(e) {
          if (!fullscreen) return;
          if (e.key === 'Escape') {
            e.stopPropagation();
            if (e.defaultPrevented) return;
            e.preventDefault();
            fsToggle();
            return;
          }
          if (e.key !== 'Tab' || !cityFsRef.current) return;
          var list = Array.prototype.slice.call(cityFsRef.current.querySelectorAll('button, [tabindex], select, input, textarea, a[href]'))
            .filter(function (n) {
              if (n.disabled || n.tabIndex < 0) return false;
              for (var p = n; p && p !== cityFsRef.current; p = p.parentElement) if (p.hidden || (p.style && p.style.display === 'none')) return false;
              return true;
            });
          if (!list.length) return;
          var first = list[0], lastEl = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
          else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
        }
        var fsBtn = h('button', {
          type: 'button', id: 'citylab-fs-toggle', onClick: fsToggle, 'aria-pressed': fullscreen ? 'true' : 'false',
          'aria-label': fullscreen ? t('stem.citylab.fs_exit_aria', 'Leave full screen (Escape)') : t('stem.citylab.fs_enter_aria', 'Show the model full screen'),
          className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
          style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' }
        }, fullscreen ? t('stem.citylab.fs_exit', 'Exit full screen') : t('stem.citylab.fs_enter', 'Full screen'));

        // ---- W6: the fullscreen HUD. The stage fills the screen and what a
        // student needs floats over it, compact: the palette and the lens bar
        // (each one row that scrolls), the strip's summary with Check my
        // plan, the outlet gauge and the other stage notes, the camera
        // presets and Exit. The prediction card floats too when an edit waits.
        function hudOverlay() {
          var boxBg = onDark ? 'rgba(0,0,0,0.9)' : 'rgba(15,23,42,0.86)';
          var boxEdge = onDark ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.4)';
          function box(part, pos, kids) {
            return h.apply(null, ['div', { key: part, 'data-citylab-hud-part': part, className: 'absolute rounded-lg p-1.5 flex flex-col gap-1.5',
              style: Object.assign({ background: boxBg, border: boxEdge, maxWidth: 'calc(100% - 16px)', zIndex: 3, boxSizing: 'border-box' }, pos) }].concat(kids));
          }
          var lensRow = h.apply(null, ['div', { key: 'lens', role: 'toolbar', 'aria-label': t('stem.citylab.lens_bar', 'Lens: what the board shows'),
            'data-citylab-hud-lens': lens, onKeyDown: lensKeyDown, className: 'flex items-center gap-1',
            style: { flexWrap: 'nowrap', overflowX: 'auto', minWidth: 0, paddingBottom: '2px' } }].concat(LENS_IDS.map(function (id) {
              var on = lens === id;
              return h('button', {
                key: id, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': lensAria(id),
                'data-citylab-lens': id, tabIndex: on ? 0 : -1, onClick: function () { if (!on) chooseLens(id); },
                className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink, borderColor: on ? '#1f5eb0' : panelBorder,
                  minHeight: '44px', minWidth: '44px', flex: '0 0 auto', whiteSpace: 'nowrap' }
              }, lensName(id));
            })));
          // The strip, summed up: its title, its progress, and Check my plan.
          var sumText = null, sumCheck = null, celText = null;
          if (stripKind === 'mission' && stripStatus) {
            var recH = missionRecord(stripMid), curH = stripMid === stripCur && !recH.done;
            sumText = stripTitleOf('mission') + ' ' + fmt(t('stem.citylab.strip_progress', '({status}: {met} of {total} met)'), {
              status: recH.done ? t('stem.citylab.mission_done', 'Done') : (curH ? t('stem.citylab.mission_current', 'Now') : t('stem.citylab.mission_later', 'Later')),
              met: stripStatus.conds.filter(function (c) { return c.met; }).length, total: stripStatus.conds.length });
            if (curH) sumCheck = smallBtn(t('stem.citylab.check_plan', 'Check my plan'), function () { cueGesture(); checkMission(stripMid, 'hud'); },
              { key: 'check', primary: true, aria: fmt(t('stem.citylab.strip_check_aria', 'Check my plan for {title}'), { title: stripTitleOf('mission') }) });
            if (celebration && celebration.mid === stripMid) {
              celText = fmt(t('stem.citylab.mission_met_note', 'Mission complete: {title}.'), { title: missionCopy(stripMid, plan).title });
            }
          } else if (stripKind === 'brief') {
            var hardH = briefRows(plan, report).filter(function (r) { return r.hard; });
            sumText = stripTitleOf('brief') + ' ' + fmt(t('stem.citylab.strip_brief_progress', '(Now: {met} of {total} required parts met)'),
              { met: hardH.filter(function (r) { return r.met; }).length, total: hardH.length });
            sumCheck = smallBtn(t('stem.citylab.check_plan', 'Check my plan'), function () { cueGesture(); checkBrief(); },
              { key: 'check', primary: true, aria: t('stem.citylab.strip_brief_check_aria', 'Check my plan against the full brief') });
            if (celebration && celebration.mid === 'brief') {
              celText = fmt(t('stem.citylab.strip_brief_met_quiet', 'Every required part of the {town} brief is met.'), { town: scen.town });
            }
          }
          var sumRow = sumText ? h('div', { key: 'sum', className: 'flex flex-wrap items-center gap-1.5', 'data-citylab-hud-strip': stripKind },
            h('p', { className: 'text-[0.75rem] font-bold', style: { color: '#ffffff', flex: '1 1 10rem', minWidth: 0 } }, sumText),
            celText ? h('p', { className: 'text-[0.75rem] font-black', 'data-citylab-hud-pass': 'true', style: { color: '#86efac', flex: '1 1 10rem' } },
              '★ ' + celText) : null,
            sumCheck) : null;
          // The stage's notes: the outlet gauge, the heat caution, a waiting
          // edit, the last change and the last result, as plain text, at the
          // foot of the top panel (a corner box collided with the camera on a phone).
          var info = [];
          if (lens === 'rain') {
            var qv = sc.tier2.peakRunoffQ, bq = sc.tier2.baselineRunoffQ;
            info.push(h('p', { key: 'gauge', 'data-citylab-hud-gauge': qv.toFixed(2), className: 'text-[0.6875rem] font-bold', style: { color: '#ffffff' } },
              fmt(t('stem.citylab.gauge_chip', 'Outlet: {q} cubic metres a second (today {base}, limit {limit})'),
                { q: qv.toFixed(2), base: bq.toFixed(2), limit: (bq * scen.runoffCeilingRatio).toFixed(2) })));
          }
          if (lens === 'heat') info.push(h('p', { key: 'heat', className: 'text-[0.6875rem] font-bold', style: { color: '#ffffff' } },
            t('stem.citylab.lens_badge_heat', 'Heat: a tint for the surface, not the air')));
          if (staged) info.push(h('p', { key: 'staged', className: 'text-[0.6875rem] font-bold', style: { color: '#ffffff' } },
            t('stem.citylab.stage_staged', '? Waiting for your prediction. The model still shows the plan as it was.')));
          if (lastChips && !staged) {
            info.push(h('p', { key: 'chips', className: 'text-[0.6875rem] font-bold', style: { color: '#ffffff' } },
              t('stem.citylab.chip_last_change', 'Last change:') + ' ' + (lastChips.length ? lastChips.map(chipText).join(' · ') : t('stem.citylab.chip_none', 'No change to homes, runoff or cost'))));
          }
          if (stageNote) info.push(h('p', { key: 'note', className: 'text-[0.6875rem]', style: { color: '#ffffff' } }, stageNote));
          // W7: the keyboard's way to choose a parcel while the map is covered:
          // a row or a column at a time (the camera keep their keys), then
          // Enter on the model, or Apply here, uses the tool through stageApply.
          var selC = parcelCol(selected), selR = parcelRow(selected);
          var pickTo = {
            left: inGrid(selC - 1, selR) ? pid(selC - 1, selR) : null, up: inGrid(selC, selR - 1) ? pid(selC, selR - 1) : null,
            down: inGrid(selC, selR + 1) ? pid(selC, selR + 1) : null, right: inGrid(selC + 1, selR) ? pid(selC + 1, selR) : null
          };
          var pickAria = {
            left: t('stem.citylab.hud_pick_left', 'Select {parcel}, one column left'), up: t('stem.citylab.hud_pick_up', 'Select {parcel}, one row up'),
            down: t('stem.citylab.hud_pick_down', 'Select {parcel}, one row down'), right: t('stem.citylab.hud_pick_right', 'Select {parcel}, one column right')
          };
          var pickEdge = fmt(t('stem.citylab.hud_pick_edge', 'No parcel that way: {parcel} is at the edge of the map.'), { parcel: selected });
          var pickGlyph = { left: '\u2190', up: '\u2191', down: '\u2193', right: '\u2192' };
          function pickSay(id) { return fmt(t('stem.citylab.hud_pick_sr', 'Selected {parcel}: {use}.'), { parcel: id, use: useLabel(plan.uses[id], plan) }); }
          function hudBtn(key, label, aria, fn, attrs, primary) {
            return h('button', Object.assign({ key: key, type: 'button', onClick: fn, 'aria-label': aria,
              className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
              style: { background: primary ? '#1f5eb0' : panelBg, color: primary ? '#ffffff' : ink, borderColor: primary ? '#1f5eb0' : panelBorder,
                minHeight: '44px', minWidth: '44px', flex: '0 0 auto' } }, attrs || {}), label);
          }
          var pickRow = h('div', { key: 'pick', 'data-citylab-hud-part': 'pick', className: 'flex flex-wrap items-center gap-1' },
            h('p', { className: 'text-[0.6875rem] font-bold', style: { color: '#ffffff', flex: '1 1 8rem', minWidth: 0 } }, pickSay(selected)),
            h.apply(null, ['div', { role: 'group', className: 'flex items-center gap-1',
              'aria-label': t('stem.citylab.hud_pick_group', 'Choose the parcel the tool acts on') }].concat(['left', 'up', 'down', 'right'].map(function (dir) {
                var to = pickTo[dir];
                // Never disabled at the edge: a press there says why, and focus stays put.
                return hudBtn(dir, h('span', { 'aria-hidden': 'true' }, pickGlyph[dir]), to ? fmt(pickAria[dir], { parcel: to }) : pickEdge,
                  function () {
                    if (!to) { announceToSR(pickEdge); return; }
                    setSelected(to);
                    followRef.current = to;
                    announceToSR(pickSay(to));
                  }, { 'data-citylab-hud-pick': dir });
              }))),
            hudBtn('zoom', fmt(t('stem.citylab.cam_focus', 'Zoom to {parcel}'), { parcel: selected }),
              fmt(t('stem.citylab.cam_focus_aria', 'Zoom in on the selected parcel, {parcel}, and the parcels round it'), { parcel: selected }),
              zoomToParcelHud, { 'data-citylab-hud-zoom': selected }),
            tool !== 'inspect'
              ? hudBtn('apply', fmt(t('stem.citylab.hud_apply', 'Use {tool} on {parcel}'), { tool: toolLabel(tool), parcel: selected }), undefined,
                  function () { stageApply(selected); }, { 'data-citylab-hud-apply': tool }, true)
              : null,
            hudBtn('undo', t('stem.citylab.undo', 'Undo'),
              staged ? t('stem.citylab.undo_aria_staged', 'Cancel the change that is waiting for your prediction')
                : (hist.past.length ? fmt(t('stem.citylab.undo_aria', 'Undo the last change, {n} available'), { n: hist.past.length })
                  : t('stem.citylab.undo_aria_none', 'Nothing to undo')), undo, { 'data-citylab-hud-undo': 'true' }));
          var top = box('top', { left: '8px', right: '8px', top: '8px', maxHeight: 'calc(100% - 80px)', overflowY: 'auto' }, [
            h('div', { key: 'pal', style: { minWidth: 0 } }, toolPalette(true)),
            h('div', { key: 'hint', className: 'text-[0.6875rem]', style: { color: '#ffffff' } }, toolHint(tool, roadFrom)),
            pickRow, lensRow, sumRow,
            info.length ? h.apply(null, ['div', { key: 'info', 'data-citylab-hud-part': 'info', className: 'flex flex-col gap-0.5' }].concat(info)) : null].filter(Boolean));
          var infoBox = null;
          var cam = box('camera', { right: '8px', bottom: '8px' }, [h('div', { key: 'cams', role: 'group', className: 'flex flex-wrap justify-end gap-1.5',
              'aria-label': t('stem.citylab.move_the_camera', 'Move the camera') },
            camBtn(t('stem.citylab.cam_bird', 'Bird\'s eye'), t('stem.citylab.cam_bird_aria', 'Look straight down on the town'), function () { setCamPreset('bird'); }),
            camBtn(t('stem.citylab.cam_corner', 'Corner'), t('stem.citylab.cam_corner_aria', 'Look from a corner of the town, high up'), function () { setCamPreset('corner'); }),
            camBtn(t('stem.citylab.cam_street', 'Street'), t('stem.citylab.cam_street_aria', 'Look from low down, near street level'), function () { setCamPreset('street'); }),
            camFrameBtns[0], camResetBtn,
            // The same full-screen toggle, pressed: in full screen it stands in for Full screen.
            h('button', { type: 'button', id: 'citylab-hud-exit', onClick: fsToggle, 'aria-pressed': 'true', 'aria-label': t('stem.citylab.fs_exit_aria', 'Leave full screen (Escape)'),
              className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
              style: { background: '#ffffff', color: '#0f172a', borderColor: '#ffffff', minHeight: '44px', minWidth: '44px' } },
              t('stem.citylab.fs_exit', 'Exit full screen')))]);
          var predict = staged ? box('predict', { left: '50%', transform: 'translateX(-50%)', bottom: '64px', width: 'min(32rem, calc(100% - 16px))',
            maxHeight: '60%', overflowY: 'auto' }, [h('div', { key: 'card' }, predictCard())]) : null;
          return [top, infoBox, predict, cam];
        }

        return h('div', { 'data-citylab-board3d': show3d ? 'live' : 'fallback',
            style: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' } },
          // The stage column. Kept MOUNTED (only hidden) while the context is
          // lost, so the viewer can still hear the restore.
          h('div', { ref: cityFsRef, 'data-allo-fs-stage': 'true', 'data-citylab-hud': fullscreen ? 'on' : 'off', onKeyDown: fsKeyDown,
              style: Object.assign({ flex: '1 1 520px', minWidth: 0 },
                show3d ? null : { display: 'none' },
                fullscreen ? { display: 'flex', flexDirection: 'column', padding: 12, boxSizing: 'border-box' } : null) },
            show3d && !fullscreen ? toolPalette() : null,
            show3d && !fullscreen ? h('p', { className: 'text-[0.6875rem] mb-1', style: { color: ink }, 'data-citylab-tool-hint': tool }, toolHint(tool, roadFrom)) : null,
            // W6: the stage sits in a wrapper that also holds the HUD, so the
            // HUD's buttons never pass a click or a key through to the model.
            h('div', { 'data-citylab-stage-wrap': 'true', style: fullscreen ? { position: 'relative', flex: '1 1 auto', minHeight: 0 } : { position: 'relative' } },
            h('div', {
              id: 'citylab-stage', ref: stageRef, tabIndex: show3d ? 0 : -1, role: 'group',
              // W7: in full screen the map is covered: the HUD's parcel buttons choose the parcel.
              'aria-label': fullscreen
                ? t('stem.citylab.stage_aria_fs', '3D model of the plan, full screen. Arrow keys turn and tilt the camera, Shift and the arrow keys slide it, plus and minus zoom, and Home shows the whole map. Enter or Space uses the chosen tool on the selected parcel. To choose another parcel, use the parcel buttons above the model.')
                : t('stem.citylab.stage_aria_v3', '3D model of the plan. Arrow keys turn and tilt the camera, Shift and the arrow keys slide it, plus and minus zoom, and Home shows the whole map. Enter or Space uses the chosen tool on the selected parcel; choose the parcel on the map beside the model.'),
              className: 'relative w-full rounded-lg overflow-hidden',
              style: { height: fullscreen ? '100%' : stageH + 'px',
                background: isDark ? '#0b1220' : '#dfe6ef', touchAction: 'pan-y', cursor: cursor,
                outline: stageFocus ? '3px solid #1f5eb0' : undefined, outlineOffset: stageFocus ? '2px' : undefined },
              onKeyDown: stageKeyDown,
              onFocus: function () { setStageFocus(true); },
              onBlur: function () { setStageFocus(false); },
              onPointerDown: stagePointerDown,
              onPointerMove: stagePointerMove,
              onPointerUp: stagePointerUp,
              onPointerCancel: stagePointerCancel,
              onPointerLeave: function (e) { if ((!e.pointerType || e.pointerType === 'mouse') && hover) setHover(null); }
            },
              h('div', {
                ref: cityViewerAttach,
                className: 'absolute inset-0',
                role: 'img',
                'aria-label': t('stem.citylab.model_description_v2',
                  'Three-dimensional model of the town plan. Each parcel shows its zoning '
                  + 'by shape and colour (pitched-roof houses, blocks with window rows, shops '
                  + 'with awnings, a civic hall with a flag, sheds, trees, crops, the river), '
                  + 'with flood exposure marked on the parcel itself. The map and the '
                  + 'parcel table below show the same plan, and every camera move has a '
                  + 'button under Move the camera.') + ' ' + overlayNote
              }),
              glStatus === 'loading'
                ? h('p', { className: 'absolute inset-0 flex items-center justify-center text-[0.6875rem]',
                    style: { color: dim } }, t('stem.citylab.building_the_model', 'Building the model...'))
                : null,
              fullscreen ? null : hoverChip(),
              fullscreen ? null : deltaChipStrip(),
              // W4: the Rain lens's one outlet gauge, on the stage as well.
              lens === 'rain' && !fullscreen ? outletGauge(true) : null,
              // ...and the Heat lens says what it tints, on the stage itself.
              lens === 'heat' && !fullscreen
                ? h('div', { 'aria-hidden': 'true', 'data-citylab-lens-badge': 'heat',
                    className: 'absolute text-[0.6875rem] font-bold rounded px-2 py-1',
                    style: { right: '8px', top: '8px', maxWidth: '55%', background: 'rgba(15,23,42,0.92)', color: '#ffffff', pointerEvents: 'none' } },
                    t('stem.citylab.lens_badge_heat', 'Heat: a tint for the surface, not the air'))
                : null,
              staged && !fullscreen
                ? h('div', { 'aria-hidden': 'true', 'data-citylab-staged-badge': 'true',
                    className: 'absolute text-[0.6875rem] font-bold rounded px-2 py-1',
                    style: { left: '8px', bottom: '8px', maxWidth: 'calc(100% - 16px)', background: '#0f172a', color: '#ffffff', pointerEvents: 'none' } },
                    t('stem.citylab.stage_staged', '? Waiting for your prediction. The model still shows the plan as it was.'))
                : null),
            fullscreen && show3d ? hudOverlay() : null),
            stageNote && !fullscreen ? h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink }, 'data-citylab-stage-note': 'true' }, stageNote) : null,

            // Drag is not a path everyone has. Every camera move is also a button.
            // W2: on a phone the presets stay out and the rest fold behind
            // "More camera", so the controls do not take a third of the screen.
            // W4: folded at EVERY width (lead, after W3): the presets and Reset
            // stay out, the rest sits behind "More camera".
            // W6: in full screen the HUD carries the presets and Exit instead.
            fullscreen ? null : h.apply(null, ['div', { className: 'flex flex-wrap gap-1.5 mt-2', role: 'group',
              'aria-label': t('stem.citylab.move_the_camera', 'Move the camera') }].concat(
              [camBtn(t('stem.citylab.cam_bird', 'Bird\'s eye'), t('stem.citylab.cam_bird_aria', 'Look straight down on the town'), function () { setCamPreset('bird'); }),
                camBtn(t('stem.citylab.cam_corner', 'Corner'), t('stem.citylab.cam_corner_aria', 'Look from a corner of the town, high up'), function () { setCamPreset('corner'); }),
                camBtn(t('stem.citylab.cam_street', 'Street'), t('stem.citylab.cam_street_aria', 'Look from low down, near street level'), function () { setCamPreset('street'); }),
                camFrameBtns[0], camResetBtn, h('button', {
                type: 'button', 'aria-expanded': camMore ? 'true' : 'false', 'aria-controls': 'citylab-cam-more',
                'data-citylab-cam-more': 'true',
                onClick: function () { setCamMore(!camMore); },
                className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' }
              }, camMore ? t('stem.citylab.cam_less', 'Fewer camera buttons') : t('stem.citylab.cam_more', 'More camera'))],
              camMore ? [h.apply(null, ['div', { id: 'citylab-cam-more', className: 'flex flex-wrap gap-1.5',
                style: { flexBasis: '100%' } }].concat([camFrameBtns[1]], camPanBtns, [
                camBtn(t('stem.citylab.cam_left', 'Turn left'), t('stem.citylab.cam_left_aria', 'Turn the model left'), function () { orbit(-20, 0, 1); }),
                camBtn(t('stem.citylab.cam_right', 'Turn right'), t('stem.citylab.cam_right_aria', 'Turn the model right'), function () { orbit(20, 0, 1); }),
                camBtn(t('stem.citylab.cam_down', 'Tilt down'), t('stem.citylab.cam_down_aria', 'Look at the model from lower down'), function () { orbit(0, -10, 1); }),
                camBtn(t('stem.citylab.cam_up', 'Tilt up'), t('stem.citylab.cam_up_aria', 'Look at the model from higher up'), function () { orbit(0, 10, 1); }),
                // W1: these two were swapped. The viewer divides its distance by
                // zoom, so a SMALLER zoom backs the camera away: "Closer" went further.
                camBtn(t('stem.citylab.cam_closer', 'Closer'), t('stem.citylab.cam_closer_aria', 'Move the camera closer'), function () { orbit(0, 0, 1.18); }),
                camBtn(t('stem.citylab.cam_further', 'Further'), t('stem.citylab.cam_further_aria', 'Move the camera further away'), function () { orbit(0, 0, 1 / 1.18); }),
                fsBtn]))] : [])),

            // The staged edit docks here, beside the stage it was made on
            // (in full screen it floats over the stage, in the HUD).
            stageLive && !fullscreen ? predictCard() : null,

            // W4: the lens key (the Animation switch sits beside the lens bar).
            fullscreen ? null : lensLegend(),
            // Hunt: in high contrast the model leaves open fields without a code.
            fullscreen || sceneTheme !== 'contrast' ? null : h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink }, 'data-citylab-hc-codes': 'true' },
              t('stem.citylab.hc_codes_note', 'High contrast: each parcel on the model carries its land-use code, except open fields, which are left blank so the town stands out. The selected parcel and the one under the pointer always show their code, and the map beside the model keeps every code.')),
            // W2: what the moving parts mean.
            fullscreen ? null : livingLegend(),

            fullscreen ? null : h('p', { className: 'text-[0.6875rem] mt-2', style: { color: dim } },
              t('stem.citylab.stage_help_v3', 'Pick a tool, then click a parcel, or press Enter on the model to use the tool on the selected parcel. Drag to turn the model, hold Shift and drag (or use two fingers) to slide it, and hold Ctrl and scroll, or pinch, to zoom. Every change made here can also be made on the map, in the inspector or in the parcel table.')),
            fullscreen ? null : h('p', { className: 'text-[0.6875rem] mt-1', style: { color: dim } },
              fmt(t('stem.citylab.massing_note', 'Blocks are indicative massing at {storey} m a storey, not a modelled building height, and nothing on the scorecard reads them. Heights are exaggerated {exag} times so the ground shows at all: this town runs from {lo} m to {hi} m.'),
                { storey: m.metresPerStorey, exag: m.verticalExaggeration, lo: m.minElevationM, hi: m.maxElevationM })
              + ' ' + fmt(t('stem.citylab.massing_datum', 'The ground is drawn up from the town\'s lowest point, {lo} m, not from sea level, so every difference in height keeps the same {exag} times scale as the buildings.'),
                { lo: m.minElevationM, exag: m.verticalExaggeration })),
            fullscreen ? null : h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink }, 'data-citylab-3d-overlays': 'true' }, overlayNote),
            m.sheets.length && !fullscreen
              ? h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink } },
                  t('stem.citylab.sheets_note_v2', 'The two sheets are the surge reach today and the reach planned for 2100. Watch which GROUND goes under when you change the sea-level allowance (in the Flood / sea level lens, or the Assumption Lab), rather than how far the sheet lifts: a few tenths of a metre is nothing beside a building, and it is a great deal of land.'))
              : null),
          // The accessible twin: the roving map, mounted and in sync. When the
          // model is down it is simply the board.
          h.apply(null, ['div', { style: { flex: show3d ? '0 1 360px' : '1 1 100%', minWidth: 0 } }].concat(twin)));
      }

      function legend() {
        return h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
          PALETTE_IDS.concat(['water']).map(function (uid) {
            var u = USE_BY_ID[uid];
            return h('span', { key: uid, className: 'inline-flex items-center gap-1 text-[0.625rem] px-1.5 py-0.5 rounded',
              style: { background: panelBg, border: '1px solid ' + panelBorder, color: ink } },
              h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
                style: { width: '11px', height: '11px', backgroundColor: u.fill,
                  backgroundImage: patternCss(u.pattern, 'rgba(255,255,255,0.6)'),
                  backgroundSize: u.pattern === 'dots' ? '5px 5px' : 'auto' } }),
              u.code + ' ' + useLabel(u.id, plan));
          }));
      }

      // ---- W4: the palette on the map board, with its hint and its note.
      function mapPaletteBlock() {
        return h('div', { 'data-citylab-map-palette': 'true', className: 'mb-1' },
          toolPalette(),
          h('p', { className: 'text-[0.6875rem] mb-1', style: { color: ink }, 'data-citylab-tool-hint': tool }, toolHint(tool, roadFrom)));
      }
      // Docked under the board and stuck to the bottom of the view while the board runs past it: a map taller than a phone
      // used to carry the note off the top. An opaque fill, since the map scrolls behind it; taps go through to the parcels.
      function mapEditNote() {
        if (!stageNote) return null;
        return h('p', { className: 'text-[0.6875rem] mt-1 mb-1 rounded px-2 py-1', 'data-citylab-stage-note': 'true',
          style: { color: ink, background: sceneTheme === 'contrast' ? '#000000' : (onDark ? '#0f172a' : '#ffffff'), border: '1px solid ' + panelBorder,
            position: 'sticky', bottom: 0, zIndex: 3, pointerEvents: 'none' } }, stageNote);
      }

      // ---- W4: each lens's key. Every class has a swatch AND a word, and the
      // classes that matter carry the same glyph the boards print, so no key
      // rests on colour. The summary under it is the scorecard's own numbers.
      function glyphChip(g) {
        return h('span', { 'aria-hidden': 'true', 'data-citylab-key-glyph': g,
          className: 'inline-block text-[0.5625rem] font-black leading-none rounded-sm',
          style: { color: '#ffffff', backgroundColor: '#0f172a', padding: '2px 3px', border: '1px solid #ffffff' } },
          LENS_GLYPH_TEXT[g] || g);
      }
      function lensKey(items, caption) {
        return h('ul', { className: 'flex flex-wrap gap-1.5 mt-2', 'aria-label': caption },
          items.map(function (it, i) {
            return h('li', { key: i, 'data-citylab-key-item': it.cls || String(i),
              className: 'inline-flex items-center gap-1 text-[0.625rem] px-1.5 py-0.5 rounded',
              style: { background: panelBg, border: '1px solid ' + panelBorder, color: ink } },
              // W6: the swatch is the theme's own fill, and shed rain carries its hatch.
              it.fill ? h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm', 'data-citylab-key-fill': lensThemeFill(it.fill, sceneTheme),
                style: { width: '11px', height: '11px', backgroundColor: lensThemeFill(it.fill, sceneTheme), outline: '1px solid rgba(15,23,42,0.5)',
                  backgroundImage: it.hatch ? hatchCss() : 'none' } }) : null,
              it.glyph ? glyphChip(it.glyph) : null,
              it.label);
          }));
      }
      // The outlet gauge: ONE number for the whole town (the rational method
      // has one outlet), against today's town and the brief's limit.
      function outletGauge(overlay) {
        var q = sc.tier2.peakRunoffQ, b = sc.tier2.baselineRunoffQ, lim = b * scen.runoffCeilingRatio;
        var top = Math.max(q, lim, b) * 1.15 || 1;
        var at = function (v) { return Math.max(0, Math.min(100, v / top * 100)).toFixed(1) + '%'; };
        var vals = { q: q.toFixed(2), base: b.toFixed(2), limit: lim.toFixed(2) };
        if (overlay) {
          return h('div', { 'aria-hidden': 'true', 'data-citylab-outlet-gauge': 'overlay',
            className: 'absolute text-[0.6875rem] font-bold rounded px-2 py-1',
            style: { right: '8px', top: '8px', maxWidth: '55%', background: 'rgba(15,23,42,0.92)', color: '#ffffff', pointerEvents: 'none' } },
            fmt(t('stem.citylab.gauge_chip', 'Outlet: {q} cubic metres a second (today {base}, limit {limit})'), vals));
        }
        var fillCol = onDark ? '#60a5fa' : '#1d4ed8';
        return h('div', { id: 'citylab-outlet-gauge', tabIndex: -1, 'data-citylab-outlet-gauge': 'legend',
          'data-citylab-gauge-q': vals.q, className: 'mt-2 rounded border p-2',
          style: { borderColor: panelBorder, background: panelBg } },
          h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink } }, t('stem.citylab.gauge_title', 'Outlet gauge: peak runoff leaving the town')),
          h('div', { 'aria-hidden': 'true', className: 'relative mt-1 rounded',
            style: { height: '14px', background: softRow, border: '1px solid ' + (onDark ? '#94a3b8' : '#475569') } },
            h('span', { className: 'absolute left-0 top-0 bottom-0 rounded-l', style: { width: at(q), background: fillCol } }),
            h('span', { className: 'absolute', style: { left: at(b), top: '-3px', bottom: '-3px', width: '2px', background: ink } }),
            h('span', { className: 'absolute', style: { left: at(lim), top: '-3px', bottom: '-3px', width: '3px', background: missColour } })),
          h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink } },
            fmt(t('stem.citylab.gauge_text', 'Now {q} cubic metres a second (the blue bar). The town today: {base} (the thin dark line). The brief\'s limit: {limit} (the thick line).'), vals)));
      }
      function lensLegend() {
        var id = lens, body = [];
        var summary = h('p', { key: 'sum', className: 'text-[0.6875rem] mt-1.5 font-bold', style: { color: ink }, 'data-citylab-lens-summary': id }, lensSummary(id));
        if (id === 'use') return h('div', { 'data-citylab-lens-legend': id }, legend(), summary);
        if (id === 'elevation') body.push(elevationKey());
        else if (id === 'heat') body.push(heatKey());
        else if (id === 'access') body.push(accessKey());
        else if (id === 'park' || id === 'transit') {
          var bus = id === 'transit';
          body.push(lensKey([
            { cls: 'in', fill: bus ? LENS_FILL.busIn : LENS_FILL.walkIn, label: bus ? t('stem.citylab.lens_key_bus_in', 'Within a 5-minute walk of a bus stop a bus can reach')
              : t('stem.citylab.lens_key_park_in', 'Within a 5-minute walk of a park, along streets and paths') },
            { cls: 'out', fill: LENS_FILL.out, label: t('stem.citylab.lens_key_out', 'Further than that, or cut off') },
            { cls: 'yes', glyph: 'yes', label: t('stem.citylab.lens_key_yes', 'Homes inside the walk') },
            { cls: 'no', glyph: 'no', label: t('stem.citylab.lens_key_no', 'Homes outside it') }
          ], bus ? t('stem.citylab.lens_key_bus_caption', 'Bus lens key') : t('stem.citylab.lens_key_park_caption', 'Walk to park lens key')));
          body.push(h('p', { key: 'n', className: 'text-[0.625rem] mt-1', style: { color: dim } }, bus
            ? t('stem.citylab.lens_note_bus', 'This is the walk to a stop along streets and paths, the walk shed. No bus routes are drawn, because routes and timetables are not modelled.')
            : fmt(t('stem.citylab.lens_note_park', 'This is distance along streets and paths. A circle drawn round each park would be the crow-flies figure, {crow}, which counts homes across the river or with no path to the park.'),
              { crow: fmtPct(sc.tier1.parkAccessPctAsCrowFlies) })));
        } else if (id === 'rain') {
          body.push(lensKey([
            { cls: 'shed', fill: LENS_FILL.shed, hatch: true, label: t('stem.citylab.lens_key_shed_v2', 'Runs off (slate with stripes): the share C of the rain on each parcel') },
            { cls: 'soak', fill: LENS_FILL.soak, label: t('stem.citylab.lens_key_soak', 'Soaks in: the rest of it') }
          ], t('stem.citylab.lens_key_rain_caption', 'Rain and runoff lens key')));
          body.push(h('p', { key: 'r', className: 'text-[0.625rem] mt-1', style: { color: dim } },
            fmt(t('stem.citylab.lens_note_rain', 'The design storm is {mm} mm an hour, the same on every parcel. Where the water goes after it runs off (gutters, pipes, streets, the river) is not modelled, so nothing here shows it flowing or pooling.'),
              { mm: scen.designStormMmPerHour })));
          body.push(h(React.Fragment, { key: 'g' }, outletGauge(false)));
        } else if (id === 'flood') {
          var items = [{ cls: 'zone', fill: LENS_FILL.zone, glyph: 'zone', label: fmt(t('stem.citylab.lens_key_zone', 'In {zone}'), { zone: scen.floodLabel }) }];
          if (scen.modelsSeaRise) items.push({ cls: 'future', fill: LENS_FILL.future, glyph: 'future', label: t('stem.citylab.lens_key_future', 'Dry today, inside the reach planned for 2100') });
          items.push({ cls: 'dry', fill: LENS_FILL.dry, label: t('stem.citylab.lens_key_dry', 'Outside both') });
          body.push(lensKey(items, t('stem.citylab.lens_key_flood_caption', 'Flood / sea level lens key')));
          if (scen.modelsSeaRise) {
            var sets = ASSUMPTION_SETS.slice().sort(function (x, y) { return x.planningSeaRiseM - y.planningSeaRiseM; });
            body.push(h('div', { key: 'sets', className: 'flex flex-wrap items-center gap-1.5 mt-2', role: 'group', 'data-citylab-sea-sets': 'true',
              'aria-label': t('stem.citylab.lens_flood_sets', 'Sea-level rise the board plans for by 2100') },
              h('span', { 'aria-hidden': 'true', className: 'text-[0.625rem] font-bold', style: { color: dim } }, t('stem.citylab.lens_flood_sets_short', 'Plan for')),
              sets.map(function (s) {
                var on = plan.assumptionSetId === s.id;
                return h('button', {
                  key: s.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', disabled: !!teacher.scoreSet,
                  'data-citylab-sea-set': s.id,
                  'aria-label': fmt(t('stem.citylab.lens_flood_set_aria', '{rise} m by 2100: {set}. The scorecard uses this set too.'), { rise: s.planningSeaRiseM.toFixed(1), set: s.label }),
                  onClick: function () { if (!on) useAssumptionSet(s.id); },
                  className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                  style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink, borderColor: on ? '#1f5eb0' : panelBorder,
                    minHeight: '44px', minWidth: '44px', opacity: teacher.scoreSet ? 0.6 : 1 }
                }, fmt(t('stem.citylab.lens_flood_set', '{rise} m by 2100'), { rise: s.planningSeaRiseM.toFixed(1) }));
              })));
          }
          body.push(h('p', { key: 'f', className: 'text-[0.625rem] mt-1', style: { color: dim } },
            t('stem.citylab.lens_note_flood', 'The parcels carry the answer: each one is marked by the test the scorecard uses. On the 3D board the translucent sheets only show the height of the water.')));
        }
        return h.apply(null, ['div', { 'data-citylab-lens-legend': id }].concat(body, [summary]));
      }

      // ---- parcel inspector
      function inspector() {
        var terr = terrainAt(selected, plan);
        var use = USE_BY_ID[plan.uses[selected]];
        var served = servedParcels(plan);
        var water = isWater(selected, plan);
        var base = basePlan(plan.scenarioId);
        var units = unitsOnParcel(plan, selected);
        var summary = [
          fmt(t('stem.citylab.insp_use_elev', '{use}. {m} m elevation.'), { use: useLabel(use.id, plan), m: terr.elevationM }),
          fmt(terr.floodplain ? t('stem.citylab.insp_inside', 'Inside {zone}.') : t('stem.citylab.insp_outside', 'Outside {zone}.'), { zone: scen.floodLabel })
        ];
        if (units > 0) {
          summary.push(served[selected] ? t('stem.citylab.insp_reached', 'A road reaches it.')
            : t('stem.citylab.insp_not_reached', 'No road runs into it, so its homes are not counted. A road on the next parcel does not count.'));
        }
        summary.push(fmt(t('stem.citylab.insp_c', 'Runoff coefficient C = {c}.'), { c: effectiveC(plan, selected, SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central).toFixed(2) }));
        if (!water) {
          summary.push(fmt(t('stem.citylab.insp_heat', 'Modelled surface heat {c} C above shaded ground: {imperv}% hard surface, {canopy}% tree canopy.'), {
            c: (sc.surfaceHeat[selected] || 0).toFixed(1),
            imperv: Math.round((use.imperv || 0) * 100),
            canopy: Math.round(Math.min(1, (use.canopy || 0) + (plan.greenInfra[selected] ? GI_CANOPY_GAIN : 0)) * 100) }));
        }
        var hasStop = !!(plan.transit && plan.transit[selected]);
        var roadIn = roadInto(plan, selected);
        var coolOn = !!(plan.coolRoofs && plan.coolRoofs[selected]);
        // Prices on these buttons are what the cost model will actually add:
        // the unit cost scaled by the set in use, rounded the same way.
        var costScale = (SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central).costScale;
        var priced = function (unit) { return fmtMoney(Math.round(unit * costScale)); };

        return panel('inspect',
          h('span', { className: 'inline-flex items-center gap-1.5' },
            h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
              style: { width: '13px', height: '13px', backgroundColor: use.fill,
                backgroundImage: patternCss(use.pattern, 'rgba(255,255,255,0.6)'),
                backgroundSize: use.pattern === 'dots' ? '5px 5px' : 'auto',
                outline: '1px solid rgba(15,23,42,0.4)' } }),
            fmt(t('stem.citylab.parcel_title', 'Parcel {parcel}'), { parcel: selected })),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } }, summary.join(' ')),

            water
              ? h('p', { className: 'text-[0.6875rem] font-bold', style: { color: dim } },
                  t('stem.citylab.the_river_is_terrain_not_zoning_it_can', 'The river is terrain, not zoning. It cannot be built on.'))
              : h('div', null,
                  h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } }, t('stem.citylab.land_use', 'Land use')),
                  h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                    PALETTE_IDS.map(function (uid) {
                      var u = USE_BY_ID[uid];
                      var active = plan.uses[selected] === uid;
                      return h('button', {
                        key: uid, type: 'button',
                        'aria-pressed': active ? 'true' : 'false',
                        'aria-label': u.units
                          ? fmt(t('stem.citylab.set_use_aria_homes', 'Set parcel {parcel} to {use}, {units} homes per hectare, runoff coefficient {c}'),
                              { parcel: selected, use: useLabel(u.id, plan), units: u.units, c: u.C })
                          : fmt(t('stem.citylab.set_use_aria', 'Set parcel {parcel} to {use}, runoff coefficient {c}'),
                              { parcel: selected, use: useLabel(u.id, plan), c: u.C }),
                        onClick: function () { parcelAction('use', selected, { useId: uid }); },
                        className: 'text-[0.625rem] font-bold px-1.5 py-1 rounded border',
                        style: {
                          background: active ? u.fill : panelBg,
                          color: active ? readableInk(u.fill) : ink,
                          borderColor: active ? u.fill : panelBorder,
                          minHeight: '44px'
                        }
                      },
                        h('span', { 'aria-hidden': 'true',
                          className: 'inline-block rounded-sm mr-1 align-[-1px]',
                          style: { width: '9px', height: '9px', backgroundColor: u.fill,
                            backgroundImage: patternCss(u.pattern, 'rgba(255,255,255,0.65)'),
                            backgroundSize: u.pattern === 'dots' ? '4px 4px' : 'auto',
                            outline: '1px solid rgba(15,23,42,0.35)' } }),
                        u.units ? fmt(t('stem.citylab.use_with_density', '{use} ({units}/ha)'), { use: useLabel(u.id, plan), units: u.units })
                          : useLabel(u.id, plan));
                    })),

                  h('button', {
                    type: 'button',
                    disabled: !canGreenInfra(plan.uses[selected]),
                    'aria-pressed': plan.greenInfra[selected] ? 'true' : 'false',
                    onClick: function () { parcelAction('gi', selected); },
                    className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border w-full mb-2',
                    style: {
                      background: plan.greenInfra[selected] ? okColour : panelBg,
                      color: plan.greenInfra[selected] ? '#ffffff'
                        : (canGreenInfra(plan.uses[selected]) ? ink : dim),
                      borderColor: panelBorder,
                      opacity: canGreenInfra(plan.uses[selected]) ? 1 : 0.5,
                      minHeight: '44px'
                    }
                  }, canGreenInfra(plan.uses[selected])
                    ? fmt(plan.greenInfra[selected]
                        ? t('stem.citylab.gi_remove', 'Remove green infrastructure ({cost}/ha)')
                        : t('stem.citylab.gi_add', 'Add green infrastructure ({cost}/ha)'), { cost: priced(COSTS.green_infra_per_ha) })
                    : t('stem.citylab.gi_useless', 'Green infrastructure would change nothing here (this land already drains)')),

                  h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-1 mb-2' },
                    h('button', {
                      type: 'button',
                      disabled: !canCoolRoof(plan.uses[selected]),
                      'aria-pressed': coolOn ? 'true' : 'false',
                      onClick: function () { parcelAction('cool', selected); },
                      className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                      style: { background: coolOn ? '#1f5eb0' : panelBg, color: coolOn ? '#ffffff' : (canCoolRoof(plan.uses[selected]) ? ink : dim),
                        borderColor: panelBorder, opacity: canCoolRoof(plan.uses[selected]) ? 1 : 0.5, minHeight: '44px' }
                    }, canCoolRoof(plan.uses[selected])
                      ? (coolOn ? t('stem.citylab.cool_remove', 'Remove cool roofs (owner pays, not the bond)')
                        : t('stem.citylab.cool_add', 'Add cool roofs (owner pays, not the bond)'))
                      : t('stem.citylab.cool_useless', 'No buildings here, so no roofs to cool')),
                    h('button', {
                      type: 'button',
                      disabled: !hasStop && !roadIn,
                      'aria-pressed': hasStop ? 'true' : 'false',
                      onClick: function () { parcelAction('transit', selected); },
                      className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                      style: { background: hasStop ? '#1f5eb0' : panelBg, color: hasStop ? '#ffffff' : ((hasStop || roadIn) ? ink : dim),
                        borderColor: panelBorder, opacity: (hasStop || roadIn) ? 1 : 0.5, minHeight: '44px' }
                    }, hasStop ? fmt(t('stem.citylab.stop_remove', 'Remove the bus stop ({cost})'), { cost: priced(COSTS.transit_stop) })
                      : (roadIn ? fmt(t('stem.citylab.stop_add', 'Add a bus stop ({cost})'), { cost: priced(COSTS.transit_stop) })
                        : t('stem.citylab.stop_no_road', 'A bus stop needs a road into this parcel'))))),

            h('div', { className: 'text-[0.6875rem] font-bold mb-1 mt-1', style: { color: ink } }, t('stem.citylab.build_a_connection', 'Build a connection')),
            h('div', { className: 'flex gap-1 mb-1', role: 'group', 'aria-label': t('stem.citylab.connection_kind', 'Kind of connection') },
              [['local', t('stem.citylab.kind_local', 'Local road')], ['path', t('stem.citylab.kind_path', 'Walking path')]].map(function (kv) {
                return h('button', {
                  key: kv[0], type: 'button',
                  'aria-pressed': roadKind === kv[0] ? 'true' : 'false',
                  onClick: function () { setRoadKind(kv[0]); },
                  className: 'text-[0.625rem] font-bold px-2 py-1 rounded border flex-1',
                  style: { background: roadKind === kv[0] ? '#1f5eb0' : panelBg,
                    color: roadKind === kv[0] ? '#ffffff' : ink, borderColor: panelBorder, minHeight: '44px' }
                }, kv[1]);
              })),
            h('div', { className: 'grid grid-cols-2 gap-1' },
              neighbours(selected).map(function (n) {
                var key = edgeKey(selected, n.id);
                var existing = plan.edges[key];
                var isBase = !!base.edges[key];
                var bridge = edgeIsBridge(key, plan);
                var cost = bridge
                  ? (roadKind === 'path' ? COSTS.bridge_path : COSTS.bridge_road)
                  : (roadKind === 'path' ? COSTS.path : COSTS.road_local);
                var dirName = { N: t('stem.citylab.dir_n', 'N'), E: t('stem.citylab.dir_e', 'E'), S: t('stem.citylab.dir_s', 'S'), W: t('stem.citylab.dir_w', 'W') }[n.dir];
                var aria, text;
                if (isBase) {
                  aria = fmt(t('stem.citylab.conn_existing_aria', 'Connection {dir} to {to} is already there'), { dir: dirName, to: n.id });
                  text = fmt(t('stem.citylab.conn_existing', '{dir} {to} · Already there'), { dir: dirName, to: n.id });
                } else if (existing) {
                  aria = fmt(t('stem.citylab.conn_remove_aria', 'Remove connection {dir} to {to}'), { dir: dirName, to: n.id });
                  text = fmt(t('stem.citylab.conn_remove', '{dir} {to} · Remove'), { dir: dirName, to: n.id });
                } else {
                  aria = fmt(bridge ? t('stem.citylab.conn_build_bridge_aria', 'Build connection {dir} to {to}, {cost}, crosses the river')
                    : t('stem.citylab.conn_build_aria', 'Build connection {dir} to {to}, {cost}'), { dir: dirName, to: n.id, cost: priced(cost) });
                  text = fmt(bridge ? t('stem.citylab.conn_build_bridge', '{dir} {to} · Build {cost} · bridge')
                    : t('stem.citylab.conn_build', '{dir} {to} · Build {cost}'), { dir: dirName, to: n.id, cost: priced(cost) });
                }
                return h('button', {
                  key: n.dir, type: 'button',
                  disabled: isBase,
                  'aria-label': aria,
                  onClick: function () { parcelAction('edge', selected, { b: n.id }); },
                  className: 'text-[0.625rem] font-bold px-1.5 py-1 rounded border text-left',
                  style: { background: existing ? 'rgba(42,120,214,0.18)' : panelBg, color: ink,
                    borderColor: panelBorder, opacity: isBase ? 0.55 : 1, minHeight: '44px' }
                }, text);
              }))
          ));
      }

      // ---- constraint report
      function fmtRequirementValue(row, n) {
        if (row.unit === 'ratio') return fmtPct(n);
        if (row.unit === 'money') return fmtMoney(n);
        if (row.unit === 'percent') return fmtPct(n);
        if (row.unit === 'hectares') return fmt(t('stem.citylab.fmt_ha', '{n} ha'), { n: n });
        if (row.unit === 'water') return fmt(t('stem.citylab.fmt_m3_day', '{n} m3/day'), { n: Math.round(n).toLocaleString() });
        return Math.round(n).toLocaleString();
      }

      function constraints() {
        return panel('brief', t('stem.citylab.brief_title', 'The planning board asked for'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } }, scen.intro),
            h('ul', { className: 'space-y-1.5' },
              report.rows.map(function (row) {
                // Rendering is driven by the check's own `unit` and `floor`
                // rather than by a chain of id comparisons, so a new town's
                // requirements display correctly without touching this.
                // Extra decimals only where rounding would print a miss as the target.
                var fmtAt = function (v, e) {
                  if (row.unit === 'ratio') return fmt(t('stem.citylab.fmt_of_today', '{pct}% of today'), { pct: (v * 100).toFixed(e) });
                  if (!e) return fmtRequirementValue(row, v);
                  if (row.unit === 'money') return fmtMoneyAt(v, e);
                  if (row.unit === 'percent') return (v * 100).toFixed(e) + '%';
                  if (row.unit === 'hectares') return fmt(t('stem.citylab.fmt_ha', '{n} ha'), { n: v.toFixed(e) });
                  if (row.unit === 'water') return fmt(t('stem.citylab.fmt_m3_day', '{n} m3/day'), { n: numAt(v, e) });
                  return numAt(v, e);
                };
                var value = sharpen(fmtAt, row.actual, row.target, row.met);
                var stdOnly = briefJ.standardOnly.indexOf(row.id) !== -1;
                var target = fmt(row.floor ? t('stem.citylab.target_at_least', 'at least {v}') : t('stem.citylab.target_at_most', 'at or under {v}'),
                  { v: fmtRequirementValue(row, row.target) });
                return h('li', { key: row.id, className: 'text-[0.6875rem] rounded p-1.5',
                  style: { background: softRow } },
                  h('div', { className: 'flex items-start gap-1.5' },
                    h('span', { 'aria-hidden': 'true', style: { color: row.met ? okColour : missColour } },
                      row.met ? '✔' : '○'),
                    h('span', { style: { color: ink } },
                      h('strong', null, row.hard ? t('stem.citylab.required_prefix', 'Required. ') : t('stem.citylab.target_prefix', 'Target. ')),
                      row.label,
                      h('br'),
                      h('span', { style: { color: row.met ? okColour : missColour, fontWeight: 700 } },
                        fmt(row.met ? t('stem.citylab.row_met', 'Met: {value}') : t('stem.citylab.row_not_yet', 'Not yet: {value}'), { value: value })),
                      h('span', { style: { color: dim } }, ' (' + target + ')'),
                      stdOnly ? h('span', { className: 'block mt-0.5', 'data-citylab-brief-standard-only': row.id, style: { color: missColour, fontWeight: 700 } },
                        fmt(t('stem.citylab.brief_standard_only', 'That is met under your assumption set, but the full brief is also checked under the central estimates, and there it is not met: {value}. This part does not count yet.'),
                          { value: sharpen(fmtAt, briefJ.standardRows[row.id].actual, row.target, false) })) : null,
                      (function () {
                        var f = headroomFraction(row);
                        if (f === null) return null;
                        var width = Math.max(0, Math.min(1, f)) * 100;
                        return h('span', { 'aria-hidden': 'true',
                          className: 'block mt-1 rounded h-1.5 relative overflow-hidden',
                          style: { background: onDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.18)' } },
                          h('span', { className: 'block h-1.5 rounded',
                            style: { width: width + '%',
                              background: row.met ? okColour : missColour } }),
                          f <= 0 ? h('span', { className: 'absolute inset-y-0 left-0',
                            style: { width: '3px', background: missColour } }) : null);
                      })(),
                      row.detail ? h('span', { className: 'block mt-0.5', style: { color: dim } }, row.detail) : null)));
              })),
            h('p', { className: 'text-[0.625rem] mt-2', style: { color: dim } },
              t('stem.citylab.slack_note', 'The bar under each line is how much room is left before that requirement fails. A short bar means you are close to the edge of it, whether you are meeting it or not. Which one is tightest is for you to notice and to argue in the memo.')),
            h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink } },
              fmt(t('stem.citylab.requirements_met', 'Requirements met: {hm} of {ht} required, {sm} of {st} targets.'),
                { hm: report.hardMet, ht: report.hardTotal, sm: report.softMet, st: report.softTotal })),
            h('div', { className: 'mt-1.5' },
              smallBtn(t('stem.citylab.listen_reqs', 'Listen to the requirements'), function () {
                var unmet = report.rows.filter(function (r) { return !r.met; }).map(function (r) { return r.label; });
                playTones(sonifyRequirements(report), fmt(unmet.length
                  ? t('stem.citylab.sr_listen_reqs', 'Playing {n} tones, one for each requirement in the order listed. A high, smooth tone has plenty of room left; a tone near the middle is close to its limit; a low, buzzy tone is not met. Not met right now: {list}.')
                  : t('stem.citylab.sr_listen_reqs_all', 'Playing {n} tones, one for each requirement in the order listed. A high, smooth tone has plenty of room left; a tone near the middle is close to its limit. Every requirement is met right now.'),
                  { n: report.rows.length, list: unmet.join('; ') }));
              }, { aria: t('stem.citylab.listen_reqs_aria', 'Listen to the requirements as tones: pitch is how much room is left, and a buzzy tone means not met') })),
            h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
              t('stem.citylab.no_single_plan', 'There is no single correct plan and this tool does not have one stored. It reports whether a plan meets the stated constraints. It does not judge whether a plan is good.'))),
          'citylab-brief-title');
      }

      // ---- scorecard with the tier split made visible
      function indicatorRow(id, value) {
        return h('div', { key: id, className: 'flex items-baseline justify-between gap-2 text-[0.6875rem] py-0.5' },
          h('span', { style: { color: dim } }, indicatorLabel(id)),
          h('span', { className: 'font-bold tabular-nums', style: { color: ink } }, fmtIndicator(id, value)));
      }

      function indicatorGroups(groups, tierIds, values) {
        var visible = visibleIndicatorIds(tierIds, plan);
        return groups.map(function (g) {
          var ids = g.ids.filter(function (id) { return visible.indexOf(id) !== -1; });
          if (!ids.length) return null;
          return h('div', { key: g.id, className: 'mt-1.5' },
            h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wide mb-0.5 pb-0.5',
              style: { color: dim, borderBottom: '1px solid ' + panelBorder } }, g.label),
            ids.map(function (id) { return indicatorRow(id, values[id]); }));
        });
      }

      function modelDisclosure(id, title, body) {
        var open = openModel === id;
        return h('div', { key: id, className: 'mt-1' },
          h('button', {
            type: 'button', 'aria-expanded': open ? 'true' : 'false',
            onClick: function () { setOpenModel(open ? '' : id); },
            className: 'text-[0.625rem] font-bold underline',
            style: { color: linkColour, minHeight: '24px' }
          }, title),
          open ? h('div', { className: 'text-[0.625rem] mt-1 p-2 rounded',
            style: { background: onDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.9)', color: dim } }, body) : null);
      }

      // Where every parameter range comes from, shown beside the model it
      // feeds. Anything not taken from a published source says so.
      function sourceNote(key) {
        var text = {
          runoff: t('stem.citylab.src_runoff', 'Source: each land use\'s runoff coefficient sits inside the range printed for it in FHWA HEC-22, Urban Drainage Design Manual (3rd edition), Table 3-1. The assumption sets scale every coefficient by 0.90 to 1.10 to span those ranges.'),
          area: t('stem.citylab.src_area', 'HEC-22 recommends the rational method for areas up to about 80 hectares (200 acres). Each town here is 144 hectares, nearly twice that, so read Q as a way to compare one plan with another, not as a design flow.'),
          gi: t('stem.citylab.src_gi', 'The green-infrastructure credit of 0.10 to 0.20 off C is a simplification chosen for this tool, not a published figure. Real manuals credit green infrastructure by the volume of water it holds, so treat this range as an assumption.'),
          storm: t('stem.citylab.src_storm', 'The design storm intensities (50, 65 and 55 mm per hour) were chosen for these fictional towns; a real study takes them from local rainfall records.'),
          cost: t('stem.citylab.src_cost', 'Unit costs are illustrative round numbers chosen for this tool, not taken from one price list, and real costs vary two or three times between regions and years. Two to know: a short road bridge commonly costs several hundred dollars per square foot of deck, so $2.8 million for a 100 m crossing is the low end; and the $9 million civic building is clinic or branch-library scale, while a whole new school usually costs several times that.'),
          population: t('stem.citylab.src_population', 'Source: household size 2.2 to 2.6 brackets the US average of about 2.5 people per household (US Census Bureau).'),
          water: t('stem.citylab.src_water', 'Source: 240 to 380 litres a person a day brackets typical US home use of about 310 litres (82 gallons) in USGS Circular 1441, Estimated Use of Water in the United States in 2015. Farm irrigation of 30 to 50 cubic metres per hectare per day is 1.1 to 1.8 m of water a year, in line with irrigation in arid western states in the same report. Park irrigation of 18 to 32 is less than a lawn needs in a desert, so read it as a park that is partly desert planting. The farm and park ranges were chosen for this tool and are the least certain numbers in it.'),
          sea: t('stem.citylab.src_sea', 'Source: Sweet and others (2022), Global and Regional Sea Level Rise Scenarios for the United States, NOAA Technical Report NOS 01. Its 2100 scenarios (global mean, relative to 2000) are Low 0.3 m, Intermediate-Low 0.5 m, Intermediate 1.0 m, Intermediate-High 1.5 m and High 2.0 m. The optimistic set uses Low, the conservative set uses Intermediate, and the central 0.6 m sits between Intermediate-Low and Intermediate. The higher two scenarios would put most of Harborlight under. The same report expects about 0.25 to 0.30 m of rise along US coasts from 2020 to 2050, which is why this town plans for 2100: homes built now will still be standing then. The surge height of today is invented for this fictional town.'),
          heat: t('stem.citylab.src_heat', 'Source: US EPA, Reducing Urban Heat Islands: Compendium of Strategies. Its Urban Heat Island Basics chapter puts sunlit roofs and pavement at 27 to 50 C (50 to 90 F) hotter than the air on a hot sunny day; its Trees and Vegetation chapter puts shaded surfaces 11 to 25 C (20 to 45 F) below the peak of unshaded ones; its Cool Roofs chapter says cool roofs can stay up to 28 to 33 C (50 to 60 F) cooler than conventional roofs at peak. The assumption sets run from one end of each range to the other. The conservative set\'s 20 C for a cool roof is this tool\'s own low end, because "up to" describes the best case.'),
          // Stage C (2026-11-03): both re-checked against the primary
          // documents. TR-55 Table 2-2a (210-VI-TR-55, 2nd ed., June 1986,
          // p. 2-5) lists average impervious area 85 / 72 / 65 / 38 percent
          // for commercial, industrial, 1/8-acre and 1/4-acre lots. The FTA
          // notice (76 FR 52046, 19 Aug 2011) sets half a mile for ALL stops
          // and stations and calls 400 m "the anecdotal rule of thumb".
          imperv: t('stem.citylab.src_imperv_v2', 'Source for hard-surface shares: USDA Natural Resources Conservation Service, Urban Hydrology for Small Watersheds, Technical Release 55 (TR-55, second edition, June 1986), Table 2-2a, page 2-5, column "average percent impervious area": commercial and business 85%, industrial 72%, residential lots of 1/8 acre or less (town houses) 65%, and 1/4-acre lots 38%. Checked against the document. This tool\'s low-density housing is 12 homes a hectare, about 5 an acre, a little denser than quarter-acre lots, and its mid density is denser than town houses, so read both as the nearest rows rather than exact matches. Civic land (50%), parks (5%), every tree canopy share, the 40% of hard surface counted as roof, and the 15 points of canopy green infrastructure adds were chosen for this tool and are the least certain numbers in this model.'),
          transit: t('stem.citylab.src_transit_v2', 'The 5-minute walk to a bus stop (417 m at 5 km an hour, about a quarter mile) is a planners\' rule of thumb, not a federal standard. The Federal Transit Administration\'s Final Policy Statement on the Eligibility of Pedestrian and Bicycle Improvements Under Federal Transit Law (Federal Register, 76 FR 52046, 19 August 2011) quotes research calling 400 metres "the anecdotal rule of thumb" and finding that people will walk at least half a mile to reliable transit; for funding it sets half a mile for walking and 3 miles for cycling around all stops and stations. So the 5-minute line here is the cautious end: a longer walk-shed would count more homes as served. Every town here is 1.2 km across, well inside a 3-mile ride, so a cycling measure would read 100% for every home a street reaches and is not shown. The bus stop price is illustrative, like the other unit costs.')
        }[key];
        return h('p', { className: 'mt-1 italic' }, text);
      }

      function scoreboard() {
        var a = SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central;
        return panel('score', t('stem.citylab.scorecard', 'Scorecard'),
          h('div', null,
            h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide mb-1', style: { color: okColour } },
              t('stem.citylab.measured', 'Measured')),
            h('p', { className: 'text-[0.625rem] mb-1', style: { color: dim } },
              t('stem.citylab.measured_note', 'Geometry and accounting over the plan as drawn. No coefficient, nothing to disagree with. You can check every one of these with a pencil.')),
            indicatorGroups(TIER1_GROUPS, TIER1_IDS, sc.tier1),

            h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide mb-1 mt-3',
              style: { color: missColour } }, t('stem.citylab.modelled', 'Modelled')),
            h('p', { className: 'text-[0.625rem] mb-1', style: { color: dim } },
              fmt(t('stem.citylab.modelled_note', 'A published formula with parameters. Currently using {set}. Change the set the scorecard uses in the Assumption Lab and watch which of these move.'), { set: a.label })),
            indicatorGroups(TIER2_GROUPS, TIER2_IDS, sc.tier2),

            modelDisclosure('runoff', openModel === 'runoff' ? t('stem.citylab.hide_runoff', 'Hide the runoff model') : t('stem.citylab.open_runoff', 'Open the runoff model'),
              h('div', null,
                h('p', null, t('stem.citylab.rational_method_q_c_x_i_x_a', 'Rational method: Q = C x i x A.')),
                h('p', null, fmt(t('stem.citylab.runoff_terms', 'C is the area-weighted runoff coefficient across all 144 parcels. i is the design storm, {i} mm per hour. A is 144 hectares.'),
                  { i: scen.designStormMmPerHour })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.runoff_now', 'Current C = {c}, so Q = {q} cubic metres per second, against a baseline of {base}.'),
                  { c: sc.tier2.runoffCoefficient.toFixed(3), q: sc.tier2.peakRunoffQ.toFixed(2), base: sc.tier2.baselineRunoffQ.toFixed(2) })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.runoff_scale', 'Coefficients per land use are listed in the parcel inspector. This set scales them by {s} under {set}.'),
                  { s: a.runoffScale.toFixed(2), set: a.label })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.runoff_gi', 'Green infrastructure is credited as a {g} reduction in effective C, floored at the open-field value. The assumption sets span 0.10 to 0.20.'),
                  { g: a.giCredit.toFixed(2) })),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.runoff_caveat', 'Honest caveat: the rational method is a screening estimate for a small watershed. It is not a drainage design and it says nothing about where the water actually goes.')),
                sourceNote('runoff'), sourceNote('area'), sourceNote('gi'), sourceNote('storm'))),

            modelDisclosure('cost', openModel === 'cost' ? t('stem.citylab.hide_cost', 'Hide the cost model') : t('stem.citylab.open_cost', 'Open the cost model'),
              h('div', null,
                h('p', null, fmt(t('stem.citylab.cost_sum', 'A sum of unit costs times quantities, scaled by {s} under {set}.'), { s: a.costScale.toFixed(2), set: a.label })),
                sc.costLines.length
                  ? h('ul', { className: 'mt-1' }, sc.costLines.map(function (l) {
                      return h('li', { key: l.id }, fmt(l.note
                        ? t('stem.citylab.cost_line_note', '{label}: {qty} x {unit} = {total} ({note})')
                        : t('stem.citylab.cost_line', '{label}: {qty} x {unit} = {total}'),
                        { label: l.label, qty: l.qty, unit: fmtMoney(l.unitCost), total: fmtMoney(l.total), note: l.note }));
                    }))
                  : h('p', { className: 'mt-1' }, t('stem.citylab.nothing_built_yet', 'Nothing built yet.')),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.cost_caveat', 'Honest caveat: unit costs vary enormously by region and by year, and the bond covers public infrastructure only. Private buildings are not the town budget, which is itself a modelling choice worth arguing about.')),
                sourceNote('cost'))),

            scen.modelsSeaRise ? modelDisclosure('sea', openModel === 'sea' ? t('stem.citylab.hide_sea', 'Hide the sea level allowance') : t('stem.citylab.open_sea', 'Open the sea level allowance'),
              h('div', null,
                h('p', null, fmt(t('stem.citylab.sea_rule', 'Ground is inside the 2100 reach when its elevation is at or below the surge reach today of {base} m plus the allowance the board asked you to plan for.'),
                  { base: scen.surgeBaseElevationM.toFixed(2) })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.sea_now', 'Under {set} the allowance is {rise} m, so the reach is {reach} m. Right now {ha} hectares are dry today and inside it.'),
                  { set: a.label, rise: a.planningSeaRiseM.toFixed(1), reach: sc.futureSurgeElevationM.toFixed(2), ha: sc.tier2.landAtRiskHa })),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.sea_not_forecast', 'This is not a forecast. The allowance is a planning figure the board handed you, and this tool does not predict sea level, does not tell you which allowance is correct, and does not have an opinion about it. What it can show you is which parts of your plan depend on the answer. Change the set the scorecard uses in the Assumption Lab and watch the map change.')),
                h('p', { className: 'mt-1' }, t('stem.citylab.sea_screening', 'Everything else here is a screening estimate too: real coastal work models the surge itself, the shape of the shore, and what the salt marsh absorbs. Flat ground at an elevation is a starting point, not a coastal engineering study.')),
                sourceNote('sea'))) : null,

            scen.modelsWater ? modelDisclosure('water', openModel === 'water' ? t('stem.citylab.hide_water', 'Hide the water model') : t('stem.citylab.open_water', 'Open the water model'),
              h('div', null,
                h('p', null, fmt(t('stem.citylab.water_rule', 'Demand = residents x litres per person per day, plus irrigated farmland x its daily draw, plus park land x its daily draw. Straight addition, against a fixed safe yield of {yield} cubic metres per day.'),
                  { yield: scen.aquiferYieldM3PerDay.toLocaleString() })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.water_rates', 'Under {set}: {lpd} litres per person per day, {farm} cubic metres per hectare of farmland, {park} per hectare of park.'),
                  { set: a.label, lpd: a.litresPerPersonPerDay, farm: a.farmIrrigationM3PerHaPerDay, park: a.parkIrrigationM3PerHaPerDay })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.water_now', 'Right now that is {demand} against a yield of {yield}, leaving {left}.'),
                  { demand: Math.round(sc.tier2.waterDemandM3PerDay).toLocaleString(), yield: scen.aquiferYieldM3PerDay.toLocaleString(),
                    left: Math.round(sc.tier2.waterHeadroomM3PerDay).toLocaleString() })),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.water_caveat', 'Honest caveat: safe yield is itself an estimate, it varies between wet and dry decades, and this model says nothing about who holds the water rights. Who is entitled to the water is a legal and political question, not an arithmetic one, and this tool does not answer it.')),
                sourceNote('water'))) : null,

            modelDisclosure('population', openModel === 'population' ? t('stem.citylab.hide_population', 'Hide the population model') : t('stem.citylab.open_population', 'Open the population model'),
              h('div', null,
                h('p', null, fmt(t('stem.citylab.population_rule', 'Residents = homes x household size. Household size is {size} under {set}. That single multiplier is why residents and park hectares per 1,000 residents are modelled rather than measured, even though the home count itself is not.'),
                  { size: a.householdSize.toFixed(1), set: a.label })),
                sourceNote('population'))),

            modelDisclosure('heat', openModel === 'heat' ? t('stem.citylab.hide_heat', 'Hide the surface heat model') : t('stem.citylab.open_heat', 'Open the surface heat model'),
              h('div', null,
                h('p', null, t('stem.citylab.heat_rule', 'For each parcel: shaded = hard - canopy x shade. Roofs with a cool roof run a further cool-roof amount lower. Surface heat = hard-surface share x (roof share x roof + the rest x shaded). Open ground and water count as the cool reference.')),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.heat_params', 'Under {set}: a sunlit hard surface runs {hard} C above the air, shade takes off up to {shade} C, a cool roof up to {cool} C. Roofs are {roof}% of the hard surface. Green infrastructure adds {gi} points of tree canopy.'),
                  { set: a.label, hard: a.heatHardC, shade: a.heatShadeC, cool: a.heatCoolRoofC, roof: Math.round(HEAT_ROOF_SHARE * 100), gi: Math.round(GI_CANOPY_GAIN * 100) })),
                h('p', { className: 'mt-1' }, fmt(t('stem.citylab.heat_now', 'Right now the town averages {town} C, and the parcels where people live average {homes} C.'),
                  { town: sc.tier2.surfaceHeatC.toFixed(2), homes: sc.tier2.homeSurfaceHeatC.toFixed(1) })),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.heat_caveat', 'Honest caveat: this is a screening model of SURFACE temperature on one kind of afternoon. The air people breathe and feel differs between a town and its countryside by a few degrees, not tens, and EPA puts that daytime air difference at about 1 to 4 C. Wind, humidity, building shadows and night-time cooling are not modelled, and in a desert, bare scrub and dry soil get hot too, which this model leaves out. What heat does to anyone\'s health is not modelled either.')),
                sourceNote('heat'), sourceNote('imperv'))),

            modelDisclosure('transit', openModel === 'transit' ? t('stem.citylab.hide_transit', 'Hide how bus access is measured') : t('stem.citylab.open_transit', 'Open how bus access is measured'),
              h('div', null,
                h('p', null, fmt(t('stem.citylab.transit_rule', 'MEASURED. A home counts when a bus stop is within {hops} steps of 100 m along streets and paths, a {min}-minute walk. A stop counts only on a parcel a road from the town centre runs into, because a bus has to get there. Bus stops on the map now: {n}.'),
                  { hops: sc.transitHopLimit, min: TRANSIT_WALK_MINUTES, n: sc.transitStops.length })),
                h('p', { className: 'mt-1 font-bold' }, t('stem.citylab.transit_caveat', 'Honest caveat: a stop within a walk says nothing about how often a bus comes, where it goes, or whether anyone rides it. How many people would ride is mode share, and it is in the Discussion tab, not on this scorecard.')),
                sourceNote('transit'))),

            h('div', { className: 'text-[0.625rem] font-black uppercase tracking-wide mb-1 mt-3',
              style: { color: dim } }, t('stem.citylab.deliberately_not_modelled', 'Deliberately not modelled')),
            h('p', { className: 'text-[0.625rem]', style: { color: dim } },
              t('stem.citylab.not_modelled_note', 'Rents, displacement, job creation, property values, crime and school quality are not produced as numbers here, and that is on purpose. The evidence on what a plan does to any of them is genuinely contested, and printing a number would hand you a disputed claim in the most convincing form there is. They are not ignored: the Discussion tab sets each one out as the argument it actually is.')),
            h('button', {
              type: 'button', onClick: function () { setTab('discuss'); },
              className: 'text-[0.625rem] font-bold underline mt-1', style: { color: linkColour, minHeight: '24px' }
            }, t('stem.citylab.open_the_questions_this_tool_will_not_', 'Open the questions this tool will not answer'))));
      }

      // ---- assumption lab
      function assumptionLab() {
        var cmp = compareAssumptions(plan, cmpA, cmpB);
        // compareAssumptions stays complete over every indicator; the FILTER
        // belongs here. Without it a town with no water model listed its two
        // water indicators, both zero, under "did not move at all", which is
        // true and completely meaningless.
        var visible = visibleIndicatorIds(TIER1_IDS, plan)
          .concat(visibleIndicatorIds(TIER2_IDS, plan));
        var rows = cmp.rows.filter(function (r) { return visible.indexOf(r.id) !== -1; });
        var changed = rows.filter(function (r) { return r.changed; });
        var unchanged = rows.filter(function (r) { return !r.changed; });
        var setDefs = ASSUMPTION_SETS;

        return h('div', null,
          panel('lab-intro', t('stem.citylab.assumption_lab', 'Assumption Lab'),
            h('div', null,
              h('p', { className: 'text-[0.6875rem]', style: { color: dim } },
                t('stem.citylab.lab_intro', 'Your plan does not change here. Only the parameters do. Run the same plan under two documented sets and look at what moves. A conclusion that holds under both is one you can defend to the planning board. A conclusion that flips is one that depends on a number nobody has pinned down.')),
              teacher.lockSets
                ? h('p', { className: 'text-[0.625rem] mt-1 font-bold', style: { color: ink } },
                    t('stem.citylab.lab_sets_locked', 'Your teacher has chosen the two sets to compare.'))
                : null,
              h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                [['A', cmpA, setCmpA, t('stem.citylab.set_a', 'Set A')], ['B', cmpB, setCmpB, t('stem.citylab.set_b', 'Set B')]].map(function (col) {
                  return h('label', { key: col[0], className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                    col[3],
                    h('select', {
                      value: col[1],
                      disabled: teacher.lockSets,
                      onChange: function (e) { col[2](e.target.value); setCompared(false); },
                      className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                      style: { background: panelBg, color: ink, borderColor: panelBorder }
                    }, setDefs.map(function (s) {
                      return h('option', { key: s.id, value: s.id }, s.label);
                    })));
                })),
              h('div', { className: 'mt-2 space-y-1' },
                [cmpA, cmpB].map(function (sid, idx) {
                  var s = SET_BY_ID[sid];
                  return h('p', { key: idx, className: 'text-[0.625rem]', style: { color: dim } },
                    h('strong', { style: { color: ink } }, fmt(idx === 0 ? t('stem.citylab.set_a_named', 'A. {set} ') : t('stem.citylab.set_b_named', 'B. {set} '), { set: s.label })), s.blurb);
                })),
              // Stage C: commit before the reveal, as everywhere else. The
              // prediction is optional and never scored, like the one on the
              // Design tab, and it locks once the comparison is showing.
              h('label', { className: 'block text-[0.6875rem] font-bold mt-2', style: { color: ink } },
                t('stem.citylab.lab_predict_label', 'Before you run it: which requirement do you expect to change verdict between the two sets?'),
                h('select', {
                  value: labPred,
                  disabled: compared,
                  onChange: function (e) { setLabPred(e.target.value); setLabPredNote(''); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                },
                  h('option', { value: '' }, t('stem.citylab.lab_predict_skip', 'No prediction this time')),
                  h('option', { value: 'none' }, t('stem.citylab.lab_predict_none', 'None of them: every verdict holds')),
                  scen.requirements.map(function (r) { return h('option', { key: r.id, value: r.id }, r.label); }))),
              compared ? h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: dim } },
                t('stem.citylab.lab_predict_locked', 'Locked while the comparison is showing. Change a set to predict again.')) : null,
              h('button', {
                type: 'button',
                onClick: function () {
                  var predNote = '';
                  if (labPred && !compared) {
                    var flippedNames = cmp.flipped.map(function (f) { return f.label; }).join('; ');
                    var predicted = labPred === 'none' ? null : cmp.flipped.some(function (f) { return f.id === labPred; });
                    var predLabel = labPred === 'none' ? '' : requirementLabel(labPred, plan);
                    predNote = labPred === 'none'
                      ? (cmp.flipped.length
                          ? fmt(t('stem.citylab.lab_pred_none_wrong', 'You expected every verdict to hold. These changed: {list}. Nothing is scored here.'), { list: flippedNames })
                          : t('stem.citylab.lab_pred_none_right', 'You expected every verdict to hold, and they all did. Nothing is scored here.'))
                      : (predicted
                          ? fmt(t('stem.citylab.lab_pred_right', 'You expected "{req}" to change verdict, and it did. Nothing is scored here.'), { req: predLabel })
                          : cmp.flipped.length
                            ? fmt(t('stem.citylab.lab_pred_wrong', 'You expected "{req}" to change verdict. It held under both sets. These changed instead: {list}. Nothing is scored here.'),
                                { req: predLabel, list: flippedNames })
                            : fmt(t('stem.citylab.lab_pred_wrong_none', 'You expected "{req}" to change verdict. It held under both sets, and so did every other requirement. Nothing is scored here.'),
                                { req: predLabel }));
                  }
                  if (!compared) setLabPredNote(predNote);
                  setCompared(true);
                  if (!plan.ranAssumptionLab) {
                    setPlan(function (prev) {
                      var nx = clonePlan(prev); nx.ranAssumptionLab = true; return nx;
                    });
                  }
                  upd({ comparedSets: true, foundRobust: cmp.robust ? true : d.foundRobust });
                  // XP once per town, and only for a plan with something in it:
                  // comparing the untouched town compares nothing of yours.
                  if (planChanges(plan).length && cmpA !== cmpB) {
                    awardOnce(xpId('lab', plan.scenarioId), XP_POINTS.lab, t('stem.citylab.xp_lab', 'Tested a plan under two assumption sets'));
                  }
                  announceToSR((predNote ? predNote + ' ' : '') + fmt(t('stem.citylab.sr_compared','Compared. Indicators that moved: {moved}. Indicators that did not: {still}.'),
                    { moved: changed.length, still: unchanged.length }) + ' ' +
                    (cmp.flipped.length
                      ? fmt(t('stem.citylab.sr_compared_flips', 'Requirements that changed verdict between the two sets: {n}.'), { n: cmp.flipped.length })
                      : t('stem.citylab.every_requirement_kept_the_same_verdic', 'Every requirement kept the same verdict under both sets.')));
                },
                className: 'mt-2 w-full text-[0.6875rem] font-bold px-2 py-1.5 rounded',
                style: { background: '#1f5eb0', color: '#ffffff' }
              }, t('stem.citylab.run_the_plan_under_both_sets', 'Run the plan under both sets')),
              // The fix for a promise the scorecard made and nothing kept:
              // "change the set and watch the map" had no control to do it.
              h('label', { className: 'block text-[0.6875rem] font-bold mt-3', style: { color: ink } },
                t('stem.citylab.score_set_label', 'The scorecard and the map use'),
                h('select', {
                  value: plan.assumptionSetId,
                  disabled: !!teacher.scoreSet,
                  onChange: function (e) { useAssumptionSet(e.target.value); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, setDefs.map(function (s) {
                  return h('option', { key: s.id, value: s.id }, s.label);
                }))),
              h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
                teacher.scoreSet ? t('stem.citylab.score_set_locked', 'Your teacher has fixed this set.')
                  : t('stem.citylab.score_set_note', 'This changes no part of your plan and costs no move. It changes which documented guess the numbers on the Design tab rest on.')))),

          compared ? panel('lab-verdict', t('stem.citylab.lab_verdict_title', 'What survived both sets'),
            h('div', null,
              labPredNote ? h('p', { className: 'text-[0.6875rem] mb-2 rounded p-1.5', role: 'status', style: { color: ink, background: softBlue } }, labPredNote) : null,
              cmp.flipped.length === 0
                ? h('div', { className: 'rounded p-2',
                    style: { background: onDark ? 'rgba(27,175,122,0.14)' : 'rgba(27,175,122,0.10)',
                      borderLeft: '4px solid ' + okColour } },
                    h('p', { className: 'text-[0.6875rem] font-bold', style: { color: okColour } },
                      t('stem.citylab.every_requirement_kept_the_same_verdic', 'Every requirement kept the same verdict under both sets.')),
                    h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink } },
                      t('stem.citylab.lab_robust_note', 'Whatever this plan does or does not achieve, it does not hinge on which end of the published range you believe. That is a plan you can defend without first having to win an argument about the parameters.')))
                : h('div', null,
                    h('p', { className: 'text-[0.6875rem] font-bold mb-1.5', style: { color: missColour } },
                      fmt(t('stem.citylab.lab_flips', 'Requirements that changed verdict between the two sets: {n}. That is the part of your plan you cannot yet defend, because it rests on a number nobody has pinned down.'),
                        { n: cmp.flipped.length })),
                    // Shown as a flip rather than described as one: the same
                    // requirement, the two sets side by side, and the verdict
                    // visibly different. This is the moment the whole mode exists for.
                    cmp.flipped.map(function (f) {
                      return h('div', { key: f.id, className: 'rounded p-2 mb-1.5',
                        style: { background: onDark ? 'rgba(235,104,52,0.12)' : 'rgba(235,104,52,0.09)',
                          borderLeft: '4px solid ' + missColour } },
                        h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } }, f.label),
                        h('div', { className: 'grid grid-cols-2 gap-2' },
                          [[SET_BY_ID[cmpA], f.metUnderA, 'A'], [SET_BY_ID[cmpB], !f.metUnderA, 'B']]
                            .map(function (col) {
                              return h('div', { key: col[2], className: 'rounded p-1.5',
                                style: { background: onDark ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.75)' } },
                                h('div', { className: 'text-[0.625rem]', style: { color: dim } },
                                  fmt(col[2] === 'A' ? t('stem.citylab.set_a_comma', 'Set A, {set}') : t('stem.citylab.set_b_comma', 'Set B, {set}'), { set: col[0].label })),
                                h('div', { className: 'text-[0.6875rem] font-black',
                                  style: { color: col[1] ? okColour : missColour } },
                                  col[1] ? t('stem.citylab.verdict_met', '✔ Met') : t('stem.citylab.verdict_not_met', '○ Not met')));
                            })));
                    })),
              h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink } },
                t('stem.citylab.which_of_your_conclusions_hold_under_b', 'Which of your conclusions hold under both sets? Those are the ones you can defend.')))) : null,

          compared ? panel('lab-rows', t('stem.citylab.lab_rows_title', 'Indicator by indicator'),
            h('div', null,
              h('div', { className: 'text-[0.625rem] font-black uppercase mb-1', style: { color: missColour } },
                fmt(t('stem.citylab.lab_moved', 'Moved when the assumptions moved ({n})'), { n: changed.length })),
              h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[0.625rem]', style: { color: ink } },
                  h('caption', { className: 'sr-only' }, t('stem.citylab.indicators_that_changed_between_assump', 'Indicators that changed between assumption set A and B')),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col', className: 'text-left' }, t('stem.citylab.indicator', 'Indicator')),
                    h('th', { scope: 'col', className: 'text-right' }, t('stem.citylab.set_a', 'Set A')),
                    h('th', { scope: 'col', className: 'text-right' }, t('stem.citylab.set_b', 'Set B')),
                    h('th', { scope: 'col', className: 'text-right' }, t('stem.citylab.change', 'Change')))),
                  h('tbody', null, changed.map(function (r) {
                    return h('tr', { key: r.id },
                      h('th', { scope: 'row', className: 'text-left font-normal' }, indicatorLabel(r.id)),
                      h('td', { className: 'text-right tabular-nums' }, fmtIndicator(r.id, r.a)),
                      h('td', { className: 'text-right tabular-nums' }, fmtIndicator(r.id, r.b)),
                      // Deliberately NEUTRAL. Colouring a delta green or
                      // orange would rank the two assumption sets as better
                      // and worse, and the direction of "better" is not the
                      // same for cost as it is for park land. This tool does
                      // not judge whether a plan is good, so it does not
                      // colour-code which way a number moved either.
                      h('td', { className: 'text-right tabular-nums font-bold', style: { color: ink } },
                        fmtDelta(r.id, r.b - r.a)));
                  })))),
              h('div', { className: 'text-[0.625rem] font-black uppercase mb-1 mt-3', style: { color: okColour } },
                fmt(t('stem.citylab.lab_still', 'Did not move at all ({n})'), { n: unchanged.length })),
              h('p', { className: 'text-[0.625rem] mb-1', style: { color: dim } },
                t('stem.citylab.lab_still_note', 'These are the measured quantities. They are counts and areas over the plan you drew, so no assumption can touch them.')),
              h('ul', { className: 'text-[0.625rem] grid grid-cols-1 sm:grid-cols-2 gap-x-3', style: { color: ink } },
                unchanged.map(function (r) {
                  return h('li', { key: r.id }, fmt(t('stem.citylab.label_value', '{label}: {value}'), { label: indicatorLabel(r.id), value: fmtIndicator(r.id, r.a) }));
                })))) : null
        );
      }

      // ---- table twin: the plan is fully editable from here
      function parcelTable() {
        var served = servedParcels(plan);
        var ids = allParcelIds();
        var yes = t('stem.citylab.yes', 'Yes'), no = t('stem.citylab.no', 'No');
        return panel('table', t('stem.citylab.parcel_table', 'Parcel table'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
              t('stem.citylab.table_intro', 'The same plan as the map, and just as editable. Change land use here and the map and the scorecard update with it.')),
            h('div', { className: 'overflow-auto', style: { maxHeight: '460px' } },
              h('table', { className: 'w-full text-[0.625rem]', style: { color: ink } },
                h('caption', { className: 'sr-only' },
                  t('stem.citylab.all_144_parcels_with_terrain_land_use_', 'All 144 parcels with terrain, land use and access. Land use is editable.')),
                h('thead', null, h('tr', null,
                  // "Park <= 5 min" mirrors the star marker on the map. Anything
                  // the map shows has to be here too, or the table is a summary
                  // rather than the peer path it is meant to be.
                  [t('stem.citylab.col_parcel', 'Parcel'), t('stem.citylab.col_elev', 'Elev (m)'), t('stem.citylab.col_flood', 'Floodplain'),
                    t('stem.citylab.col_use', 'Land use'), t('stem.citylab.col_homes', 'Homes'), t('stem.citylab.col_road', 'Road'),
                    t('stem.citylab.col_park', 'Park ≤ 5 min'), t('stem.citylab.col_transit', 'Bus ≤ 5 min'),
                    t('stem.citylab.col_heat', 'Surface heat (C)'), t('stem.citylab.col_gi', 'Green infra'),
                    t('stem.citylab.col_cool', 'Cool roof'), t('stem.citylab.col_stop', 'Bus stop')].map(function (col, i) {
                    return h('th', { key: i, scope: 'col', className: 'text-left px-1 py-0.5',
                      style: { position: 'sticky', top: 0, background: onDark ? '#1e293b' : '#f1f5f9' } }, col);
                  }))),
                h('tbody', null, ids.map(function (id) {
                  var terr = terrainAt(id, plan);
                  var units = unitsOnParcel(plan, id);
                  var water = isWater(id, plan);
                  return h('tr', { key: id },
                    h('th', { scope: 'row', className: 'text-left px-1 font-bold' }, id),
                    h('td', { className: 'px-1' }, terr.elevationM),
                    h('td', { className: 'px-1' }, terr.floodplain ? yes : no),
                    h('td', { className: 'px-1' },
                      water ? t('stem.citylab.river_terrain', 'River (terrain)') : h('select', {
                        value: plan.uses[id],
                        'aria-label': fmt(t('stem.citylab.use_select_aria', 'Land use for parcel {parcel}'), { parcel: id }),
                        onChange: function (e) { parcelAction('use', id, { useId: e.target.value }); },
                        className: 'text-[0.625rem] rounded border px-1',
                        style: { background: panelBg, color: ink, borderColor: panelBorder }
                      }, PALETTE_IDS.map(function (uid) {
                        return h('option', { key: uid, value: uid }, useLabel(uid, plan));
                      }))),
                    h('td', { className: 'px-1 tabular-nums' }, units || ''),
                    h('td', { className: 'px-1' }, units ? (served[id] ? t('stem.citylab.reached', 'Reached') : t('stem.citylab.not_reached', 'Not reached')) : ''),
                    h('td', { className: 'px-1' }, units && served[id]
                      ? (sc.parkDistance[id] !== undefined && sc.parkDistance[id] <= sc.parkHopLimit ? yes : no)
                      : ''),
                    h('td', { className: 'px-1' }, units && served[id]
                      ? (sc.transitDistance[id] !== undefined && sc.transitDistance[id] <= sc.transitHopLimit ? yes : no)
                      : ''),
                    h('td', { className: 'px-1 tabular-nums' }, sc.surfaceHeat[id] === undefined ? '' : sc.surfaceHeat[id].toFixed(1)),
                    h('td', { className: 'px-1' },
                      !canGreenInfra(plan.uses[id]) ? '' : h('button', {
                        type: 'button',
                        'aria-pressed': plan.greenInfra[id] ? 'true' : 'false',
                        'aria-label': fmt(plan.greenInfra[id] ? t('stem.citylab.gi_remove_aria', 'Remove green infrastructure on parcel {parcel}')
                          : t('stem.citylab.gi_add_aria', 'Add green infrastructure on parcel {parcel}'), { parcel: id }),
                        onClick: function () { parcelAction('gi', id); },
                        className: 'text-[0.625rem] px-1 rounded border',
                        style: { background: plan.greenInfra[id] ? okColour : panelBg,
                          color: plan.greenInfra[id] ? '#ffffff' : ink, borderColor: panelBorder, minHeight: '24px', minWidth: '32px' }
                      }, plan.greenInfra[id] ? t('stem.citylab.on', 'On') : t('stem.citylab.off', 'Off'))),
                    h('td', { className: 'px-1' },
                      !canCoolRoof(plan.uses[id]) ? '' : (function () {
                        var on = !!(plan.coolRoofs && plan.coolRoofs[id]);
                        return h('button', {
                          type: 'button', 'aria-pressed': on ? 'true' : 'false',
                          'aria-label': fmt(on ? t('stem.citylab.cool_remove_aria', 'Remove cool roofs on parcel {parcel}')
                            : t('stem.citylab.cool_add_aria', 'Add cool roofs on parcel {parcel}'), { parcel: id }),
                          onClick: function () { parcelAction('cool', id); },
                          className: 'text-[0.625rem] px-1 rounded border',
                          style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink, borderColor: panelBorder, minHeight: '24px', minWidth: '32px' }
                        }, on ? t('stem.citylab.on', 'On') : t('stem.citylab.off', 'Off'));
                      })()),
                    h('td', { className: 'px-1' },
                      water ? '' : (function () {
                        var on = !!(plan.transit && plan.transit[id]);
                        if (!on && !roadInto(plan, id)) return '';
                        return h('button', {
                          type: 'button', 'aria-pressed': on ? 'true' : 'false',
                          'aria-label': fmt(on ? t('stem.citylab.stop_remove_aria', 'Remove the bus stop at parcel {parcel}')
                            : t('stem.citylab.stop_add_aria', 'Add a bus stop at parcel {parcel}'), { parcel: id }),
                          onClick: function () { parcelAction('transit', id); },
                          className: 'text-[0.625rem] px-1 rounded border',
                          style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink, borderColor: panelBorder, minHeight: '24px', minWidth: '32px' }
                        }, on ? t('stem.citylab.on', 'On') : t('stem.citylab.off', 'Off'));
                      })()));
                }))))));
      }

      // ---- memo, and the export it produces
      function bindingLabel(value) {
        var id = normaliseBinding(value, plan.scenarioId);
        return id ? requirementLabel(id, plan) : '';
      }

      // The hearing and the access-gap choice, only when the student did them.
      function hearingHtml() {
        var memo = plan.memo || {};
        var sh = stakeholderById(memo.stakeholder, plan);
        if (!sh && !memo.counter && !memo.rebuttal) return '';
        var cites = (memo.counterEvidence || []).map(function (id) {
          return '<li>' + esc(indicatorLabel(id)) + ': ' + esc(fmtIndicator(id, indicatorValue(sc, id))) + '</li>';
        }).join('');
        var notStated = t('stem.citylab.memo_not_stated', 'not stated');
        return '<h2>' + esc(t('stem.citylab.memo_hearing_h', 'At the hearing')) + '</h2>' +
          '<p><strong>' + esc(t('stem.citylab.memo_hearing_who', 'The strongest objection came from:')) + '</strong> ' + esc(sh ? sh.name : notStated) + '</p>' +
          (sh ? '<p class="note">' + esc(fmt(t('stem.citylab.hearing_wants', 'Wants: {text}'), { text: sh.wants })) + '</p>' : '') +
          '<p><strong>' + esc(t('stem.citylab.memo_hearing_counter', 'Their objection, as I understand it:')) + '</strong> ' + esc(memo.counter || notStated) + '</p>' +
          '<p><strong>' + esc(t('stem.citylab.memo_hearing_rebuttal', 'My answer:')) + '</strong> ' + esc(memo.rebuttal || notStated) + '</p>' +
          (cites ? '<p><strong>' + esc(t('stem.citylab.memo_hearing_cites', 'Numbers behind my answer:')) + '</strong></p><ul>' + cites + '</ul>' : '');
      }
      function equityHtml() {
        var eq = plan.equity || {};
        if (!eq.priority && !eq.note) return '';
        var g = accessGaps(plan);
        return '<h2>' + esc(t('stem.citylab.memo_access_h', 'Who can walk to what')) + '</h2>' +
          '<p>' + esc(fmt(t('stem.citylab.access_any_all', 'Homes missing at least one: {any}. Homes missing all three: {all}.'),
            { any: g.lackAny.toLocaleString(), all: g.lackAll.toLocaleString() })) + '</p>' +
          '<p>' + esc(fmt(t('stem.citylab.memo_access_priority', 'The gap I would close first: {gap}.'),
            { gap: eq.priority ? gapKindName(eq.priority) : t('stem.citylab.memo_not_stated', 'not stated') })) + '</p>' +
          (eq.note ? '<p>' + esc(eq.note) + '</p>' : '');
      }

      function memoHtml() {
        var notStated = t('stem.citylab.memo_not_stated', 'not stated');
        var rows = report.rows.map(function (r) {
          var val = (r.id === 'req_cost') ? fmtMoney(r.actual)
            : (r.id === 'req_park') ? fmtPct(r.actual)
            : (r.id === 'req_runoff') ? fmt(t('stem.citylab.fmt_of_today', '{pct}% of today'), { pct: (r.actual * 100).toFixed(0) })
            : Math.round(r.actual).toLocaleString();
          return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.hard ? t('stem.citylab.kind_required', 'Required') : t('stem.citylab.kind_target', 'Target')) +
            '</td><td>' + esc(r.met ? t('stem.citylab.verdict_met_plain', 'Met') : t('stem.citylab.verdict_not_met_plain', 'Not met')) + '</td><td>' + esc(val) + '</td></tr>';
        }).join('');
        var t1 = visibleIndicatorIds(TIER1_IDS, plan).map(function (id) {
          return '<tr><td>' + esc(indicatorLabel(id)) + '</td><td>' + esc(fmtIndicator(id, sc.tier1[id])) + '</td></tr>';
        }).join('');
        var t2 = visibleIndicatorIds(TIER2_IDS, plan).map(function (id) {
          return '<tr><td>' + esc(indicatorLabel(id)) + '</td><td>' + esc(fmtIndicator(id, sc.tier2[id])) + '</td></tr>';
        }).join('');
        var evidence = (plan.memo.evidence || []).map(function (id) {
          var v = sc.tier1[id] !== undefined ? sc.tier1[id] : sc.tier2[id];
          return '<li>' + esc(indicatorLabel(id)) + ': ' + esc(fmtIndicator(id, v)) + '</li>';
        }).join('');
        var changes = planChanges(plan);
        var changeRows = changes.map(function (c) {
          return '<tr><td>' + esc(c.id) + '</td><td>' + esc(useLabel(c.from, plan)) +
            '</td><td>' + esc(useLabel(c.to, plan)) + '</td><td>' + (c.units || '') +
            '</td><td>' + (c.greenInfra ? esc(t('stem.citylab.yes_lower', 'yes')) : '') + '</td><td>' +
            (c.floodplain ? esc(t('stem.citylab.yes_lower', 'yes')) : '') + '</td></tr>';
        }).join('');

        // The Assumption Lab section only appears if it was actually run.
        // Printing it regardless would imply a check the student never made.
        var cmpBlock = '';
        if (plan.ranAssumptionLab) {
          var cmp = compareAssumptions(plan, cmpA, cmpB);
          cmpBlock = '<h2>' + esc(t('stem.citylab.memo_tested', 'Tested against the assumptions')) + '</h2>' +
            '<p>' + esc(fmt(t('stem.citylab.memo_run_under', 'Run under {a} and {b}.'), { a: SET_BY_ID[cmpA].label, b: SET_BY_ID[cmpB].label })) + '</p>' +
            (cmp.flipped.length
              ? '<p class="note"><strong>' + esc(fmt(t('stem.citylab.memo_flips', 'Requirements that changed verdict between the two sets: {n}.'), { n: cmp.flipped.length })) +
                '</strong> ' + esc(t('stem.citylab.memo_flips_note', 'That part of this plan rests on a number nobody has pinned down.')) + '</p>' +
                '<ul>' + cmp.flipped.map(function (f) {
                  return '<li>' + esc(fmt(f.metUnderA ? t('stem.citylab.memo_flip_a', '{req}: met under the first set but not the second.')
                    : t('stem.citylab.memo_flip_b', '{req}: met under the second set but not the first.'), { req: f.label })) + '</li>';
                }).join('') + '</ul>'
              : '<p class="note"><strong>' + esc(t('stem.citylab.every_requirement_kept_the_same_verdic', 'Every requirement kept the same verdict under both sets.')) +
                '</strong> ' + esc(t('stem.citylab.memo_robust', 'Whatever this plan does or does not achieve, it does not hinge on which end of the published range you believe.')) + '</p>');
        }

        return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<title>' + esc(fmt(t('stem.citylab.memo_doc_title', 'Plan memo - {town}'), { town: scen.town })) + '</title><style>' +
          'body{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;line-height:1.5}' +
          'table{border-collapse:collapse;width:100%;margin:1rem 0}' +
          'th,td{border:1px solid #94a3b8;padding:.35rem .5rem;text-align:left;font-size:.9rem}' +
          'th{background:#f1f5f9}h1,h2{line-height:1.2}' +
          '.note{background:#f8fafc;border-left:4px solid #1f5eb0;padding:.5rem .75rem;font-size:.9rem}' +
          'figure{margin:1rem 0}figcaption{font-size:.8rem;color:#475569;margin-top:.35rem}' +
          'svg{max-width:100%;height:auto}' +
          '@media print{body{max-width:none}table{page-break-inside:avoid}}' +
          '</style></head><body>' +
          '<h1>' + esc(fmt(t('stem.citylab.memo_h1', 'Plan memo: {town}'), { town: scen.town })) + '</h1>' +
          '<p>' + esc(scen.intro) + '</p>' +
          '<h2>' + esc(t('stem.citylab.memo_the_plan', 'The plan')) + '</h2>' +
          '<figure>' + planSvg(plan, plan.assumptionSetId) +
          '<figcaption>' + esc(fmt(t('stem.citylab.memo_caption', 'One parcel is 100 m across, one hectare. A blue outline marks {zone}. A dashed line is a walking path, a solid one a road. An exclamation mark means no road reaches those homes. The map is a picture of the table below, not a substitute for it.'),
            { zone: scen.floodLabel })) + '</figcaption></figure>' +
          '<h2>' + esc(t('stem.citylab.memo_changed', 'What was changed')) + '</h2>' +
          (changes.length
            ? '<table><caption>' + esc(fmt(t('stem.citylab.memo_changed_caption', 'Every parcel that differs from {town} as it stands today'), { town: scen.town })) +
              '</caption><thead><tr><th scope="col">' + esc(t('stem.citylab.col_parcel', 'Parcel')) + '</th>' +
              '<th scope="col">' + esc(t('stem.citylab.col_was', 'Was')) + '</th><th scope="col">' + esc(t('stem.citylab.col_now', 'Now')) + '</th><th scope="col">' + esc(t('stem.citylab.col_homes', 'Homes')) + '</th>' +
              '<th scope="col">' + esc(t('stem.citylab.col_gi_full', 'Green infrastructure')) + '</th><th scope="col">' + esc(t('stem.citylab.col_in_flood', 'In the flood zone')) + '</th>' +
              '</tr></thead><tbody>' + changeRows + '</tbody></table>'
            : '<p>' + esc(t('stem.citylab.memo_nothing_changed', 'Nothing was changed. This is the town as it stands today.')) + '</p>') +
          '<h2>' + esc(t('stem.citylab.memo_constraints', 'Constraints')) + '</h2><table><caption>' + esc(t('stem.citylab.memo_constraints_caption', 'Requirements and targets against this plan')) + '</caption>' +
          '<thead><tr><th scope="col">' + esc(t('stem.citylab.col_requirement', 'Requirement')) + '</th><th scope="col">' + esc(t('stem.citylab.col_kind', 'Kind')) + '</th>' +
          '<th scope="col">' + esc(t('stem.citylab.col_verdict', 'Verdict')) + '</th><th scope="col">' + esc(t('stem.citylab.col_this_plan', 'This plan')) + '</th></tr></thead><tbody>' + rows +
          '</tbody></table>' +
          '<h2>' + esc(t('stem.citylab.memo_tradeoff_h', 'The trade-off I accepted')) + '</h2>' +
          '<p><strong>' + esc(t('stem.citylab.memo_binding', 'Binding constraint:')) + '</strong> ' + esc(bindingLabel(plan.memo.bindingConstraint) || notStated) + '</p>' +
          '<p><strong>' + esc(t('stem.citylab.memo_gave_up', 'What I gave up, and why:')) + '</strong> ' + esc(plan.memo.tradeoff || notStated) + '</p>' +
          (plan.memo.text ? '<p>' + esc(plan.memo.text) + '</p>' : '') +
          (evidence ? '<p><strong>' + esc(t('stem.citylab.memo_evidence', 'Evidence I cited:')) + '</strong></p><ul>' + evidence + '</ul>' : '') +
          hearingHtml() + equityHtml() +
          '<h2>' + esc(t('stem.citylab.measured', 'Measured')) + '</h2><table><caption>' + esc(t('stem.citylab.memo_measured_caption', 'Geometry and accounting over the plan as drawn')) + '</caption>' +
          '<thead><tr><th scope="col">' + esc(t('stem.citylab.indicator', 'Indicator')) + '</th><th scope="col">' + esc(t('stem.citylab.col_value', 'Value')) + '</th></tr></thead><tbody>' + t1 +
          '</tbody></table>' +
          cmpBlock +
          '<h2>' + esc(t('stem.citylab.modelled', 'Modelled')) + '</h2><table><caption>' + esc(fmt(t('stem.citylab.memo_modelled_caption', 'Published formulas, under {set}'), { set: (SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central).label })) + '</caption>' +
          '<thead><tr><th scope="col">' + esc(t('stem.citylab.indicator', 'Indicator')) + '</th><th scope="col">' + esc(t('stem.citylab.col_value', 'Value')) + '</th></tr></thead><tbody>' + t2 +
          '</tbody></table>' +
          '<p class="note">' + esc(t('stem.citylab.memo_contested_note', 'Rents, displacement, job creation, property values, crime and school quality are deliberately not modelled in this tool. The evidence on what a plan does to any of them is genuinely contested, so no number for them appears here. This memo reports whether a plan meets stated constraints. It does not claim the plan is good.')) + '</p>' +
          '</body></html>';
      }

      // Returns whether the download was started. Inside Gemini Canvas a
      // download can be blocked silently, so every caller offers Copy or
      // Open as well and says honestly which happened.
      function download(filename, text, mime) {
        try {
          var blob = new Blob([text], { type: mime });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          return true;
        } catch (_) {
          announceToSR(__alloT('stem.citylab.sr_download_failed_in_this_browser', 'Download failed in this browser.'));
          return false;
        }
      }

      function copyText(text, okMsg) {
        var done = function (ok) {
          var m = ok ? okMsg : t('stem.citylab.copy_unavailable', 'Copy is not available here. Use Download or Open instead.');
          setExportNote(m); announceToSR(m);
        };
        try {
          var api = window.StemLab && typeof window.StemLab.writeClipboard === 'function' ? window.StemLab.writeClipboard : null;
          var p = api ? api(text) : (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard')));
          Promise.resolve(p).then(function () { done(true); }, function () { done(false); });
        } catch (_) { done(false); }
      }

      // Print through a new window: window.print() is ignored inside Canvas.
      function openMemo() {
        var w = null;
        try { w = window.open('', '_blank'); } catch (_) { w = null; }
        if (!w || !w.document) {
          var m = t('stem.citylab.open_blocked', 'A new window could not be opened here. Use Download instead.');
          setExportNote(m); announceToSR(m); return;
        }
        w.document.open(); w.document.write(memoHtml()); w.document.close();
        var ok = t('stem.citylab.memo_opened', 'The memo opened in a new window. Print it from there.');
        setExportNote(ok); announceToSR(ok);
      }

      function memoStanding() {
        var unmet = report.rows.filter(function (r) { return !r.met; });
        return panel('memo-standing', t('stem.citylab.memo_standing_title', 'Where your plan stands'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-1.5', style: { color: dim } },
              t('stem.citylab.repeated_here_so_you_can_see_what_you_', 'Repeated here so you can see what you are writing about without leaving this tab.')),
            h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
              fmt(t('stem.citylab.requirements_met', 'Requirements met: {hm} of {ht} required, {sm} of {st} targets.'),
                { hm: report.hardMet, ht: report.hardTotal, sm: report.softMet, st: report.softTotal })),
            unmet.length
              ? h('ul', { className: 'text-[0.6875rem] list-disc pl-4', style: { color: ink } },
                  unmet.map(function (r) {
                    return h('li', { key: r.id },
                      h('span', { style: { color: missColour, fontWeight: 700 } },
                        r.hard ? t('stem.citylab.required_prefix', 'Required. ') : t('stem.citylab.target_prefix', 'Target. ')), r.label);
                  }))
              : h('p', { className: 'text-[0.6875rem]', style: { color: okColour } },
                  t('stem.citylab.memo_all_met', 'Everything the board asked for is met. The interesting question is now what it cost you to get there, and that is what the memo is for.'))));
      }

      function setMemo(patch) {
        setPlan(function (prev) {
          var next = clonePlan(prev);
          next.memo = Object.assign({ evidence: [] }, next.memo, patch);
          return next;
        });
      }

      function submitMemo() {
        var ready = memoReadiness(plan, { hearing: hearingActive });
        if (!ready.ok) {
          var hr = ready.hearing || {};
          var shName = (stakeholderById(plan.memo.stakeholder, plan) || {}).name || '';
          var parts = ready.missing.map(function (m) {
            if (m === 'binding') return t('stem.citylab.memo_missing_binding', 'Choose the constraint that was binding.');
            if (m === 'tradeoff') return fmt(t('stem.citylab.memo_missing_tradeoff', 'Say what you gave up and why in at least 12 words (you have {n}).'), { n: ready.words });
            if (m === 'stakeholder') return t('stem.citylab.memo_missing_stakeholder', 'At the hearing: choose the stakeholder whose objection to your plan is strongest.');
            if (m === 'counter') return fmt(t('stem.citylab.memo_missing_counter', 'State their strongest objection in your own words, at least {min} words (you have {n}).'), { min: COUNTER_MIN_WORDS, n: hr.counterWords || 0 });
            if (m === 'rebuttal') return fmt(t('stem.citylab.memo_missing_rebuttal', 'Answer the objection in at least {min} words (you have {n}).'), { min: REBUTTAL_MIN_WORDS, n: hr.rebuttalWords || 0 });
            if (m === 'counterEvidence') return t('stem.citylab.memo_missing_counter_evidence', 'Back your answer with at least one number from the scorecard.');
            if (m === 'relevance') return fmt(t('stem.citylab.memo_missing_relevance', 'Cite at least one number {who} would actually look at. Their numbers are marked in the list.'), { who: shName });
            return t('stem.citylab.memo_missing_evidence', 'Cite at least one number from the scorecard as evidence.');
          });
          // Stage C: the hearing behaves like a mission. Each submission
          // that leaves the hearing incomplete is a try; misconceptions are
          // named the same way; after two tries "Show one way" appears.
          var hearingMissing = !!(hearingActive && hr.missing && hr.missing.length);
          var misc = [];
          if (hearingActive && ready.missing.indexOf('relevance') !== -1) misc.push('hearing_talking_past');
          if (hearingActive && ready.missing.indexOf('counterEvidence') !== -1) misc.push('hearing_no_evidence');
          if (hearingMissing) {
            var town = plan.scenarioId;
            updWith(function (cur) {
              var c = Object.assign({}, cur.hearingChecks || {});
              c[town] = (c[town] || 0) + 1;
              var out = { hearingChecks: c };
              if (misc.length) {
                var tally = Object.assign({}, cur.misTally || {});
                misc.forEach(function (m) { tally[m] = (tally[m] || 0) + 1; });
                out.misTally = tally;
              }
              return out;
            });
          }
          var head = t('stem.citylab.memo_not_ready_list', 'Not ready to submit yet. Here is what is still missing:');
          var msg = t('stem.citylab.memo_not_ready', 'Not ready to submit yet.') + ' ' + parts.join(' ') +
            (misc.length ? ' ' + misc.map(function (m) { var mc = misconceptionCopy(m); return mc.name + '. ' + mc.text; }).join(' ') : '');
          setMemoNote({ ok: false, head: head, parts: parts, misconceptions: misc });
          announceToSR(msg);
          return;
        }
        updWith(function (cur) {
          var done = Object.assign({}, cur.memoSubmitted || {});
          done[plan.scenarioId] = true;
          return { memoSubmitted: done };
        });
        awardOnce(xpId('memo', plan.scenarioId), XP_POINTS.memo, t('stem.citylab.xp_memo', 'Submitted a planning memo with evidence'));
        var okMsg = fmt(t('stem.citylab.memo_submitted', 'Memo submitted for {town}: a binding constraint, the trade-off, and {n} pieces of evidence.'),
          { town: scen.town, n: (plan.memo.evidence || []).length });
        if (hearingActive) {
          updWith(function (cur) {
            var done = Object.assign({}, cur.hearingSubmitted || {});
            done[plan.scenarioId] = true;
            return { hearingSubmitted: done };
          });
          var hearingRevealed = !!(d.hearingRevealed && d.hearingRevealed[plan.scenarioId]);
          // No XP once the method was revealed, exactly as for a mission.
          if (!hearingRevealed) {
            awardOnce(xpId('hearing', plan.scenarioId), XP_POINTS.hearing, t('stem.citylab.xp_hearing', 'Answered a stakeholder objection with evidence'));
          }
          okMsg += ' ' + fmt(t('stem.citylab.memo_hearing_submitted', 'The hearing is in it too: the objection from {who}, your answer, and {n} numbers behind it.'),
            { who: (stakeholderById(plan.memo.stakeholder, plan) || {}).name || '', n: (plan.memo.counterEvidence || []).length });
          if (hearingRevealed) okMsg += ' ' + t('stem.citylab.hearing_reveal_no_xp', 'The hearing still counts, but it earns no XP after "Show one way".');
        }
        setMemoNote(okMsg); announceToSR(okMsg);
      }

      // The hearing: two stakeholder briefs, a counter-argument the student
      // states and answers, and evidence that has to speak to that
      // stakeholder's own concern. Grades 9-12 by default; anyone can opt in.
      function hearingSection(citeable) {
        var teacherFixed = teacher.hearing === 'on' || teacher.hearing === 'off';
        var toggle = teacherFixed ? null : smallBtn(hearingActive
          ? t('stem.citylab.hearing_off', 'Leave out the hearing')
          : t('stem.citylab.hearing_on', 'Add the hearing: answer a stakeholder'), function () {
            upd({ hearing: !hearingActive });
            announceToSR(!hearingActive
              ? t('stem.citylab.sr_hearing_on', 'The hearing is added to the memo. Submitting now also needs a stakeholder objection, your answer and a number that speaks to it.')
              : t('stem.citylab.sr_hearing_off', 'The hearing is left out of the memo.'));
          }, { pressed: hearingActive });
        if (!hearingActive) return h('div', { className: 'mb-2' }, toggle);
        var shs = scen.stakeholders || [];
        var memo = plan.memo;
        var chosen = stakeholderById(memo.stakeholder, plan);
        var cited = memo.counterEvidence || [];
        var watched = chosen ? citeable.filter(function (id) { return chosen.watches.indexOf(id) !== -1; }) : [];
        var others = citeable.filter(function (id) { return watched.indexOf(id) === -1; });
        var hr = hearingReadiness(plan);
        function chip(id, theirs) {
          var on = cited.indexOf(id) !== -1;
          var v = indicatorValue(sc, id);
          return h('button', {
            key: id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
            onClick: function () {
              setMemo({ counterEvidence: on ? cited.filter(function (x) { return x !== id; }) : cited.concat([id]) });
            },
            className: 'text-[0.625rem] px-1.5 py-1 rounded border text-left',
            style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink,
              borderColor: on ? '#1f5eb0' : (theirs ? okColour : panelBorder), borderWidth: theirs ? '2px' : '1px', minHeight: '26px' }
          }, fmt(theirs ? t('stem.citylab.hearing_chip_theirs', '{label}: {value} (they watch this)') : t('stem.citylab.label_value', '{label}: {value}'),
            { label: indicatorLabel(id), value: fmtIndicator(id, v) }));
        }
        return h('div', { className: 'rounded p-2 mb-2', style: { background: softBlue } },
          h('div', { className: 'flex flex-wrap items-baseline justify-between gap-2 mb-1' },
            h('h4', { className: 'text-[0.6875rem] font-black', style: { color: ink } }, t('stem.citylab.hearing_title', 'The hearing')),
            toggle),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: ink } },
            t('stem.citylab.hearing_intro', 'Two people will speak against parts of any plan. Read both briefs, pick the one whose objection hits your plan hardest, put that objection in your own words as strongly as they would, then answer it with numbers from the scorecard.')),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2' },
            shs.map(function (s) {
              return h('div', { key: s.id, className: 'rounded p-2', style: { background: panelBg, border: '1px solid ' + panelBorder } },
                h('div', { className: 'text-[0.6875rem] font-bold', style: { color: ink } }, s.name),
                h('p', { className: 'text-[0.6875rem] mt-0.5', style: { color: ink } }, fmt(t('stem.citylab.hearing_wants', 'Wants: {text}'), { text: s.wants })),
                h('p', { className: 'text-[0.6875rem] mt-0.5 italic', style: { color: dim } }, fmt(t('stem.citylab.hearing_asks', 'Will ask: {text}'), { text: s.asks })),
                h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: dim } },
                  fmt(t('stem.citylab.hearing_watches', 'Watches: {list}.'), { list: s.watches.filter(function (id) { return citeable.indexOf(id) !== -1; }).map(indicatorLabel).join('; ') })));
            })),
          h('label', { className: 'block text-[0.6875rem] font-bold mb-2', style: { color: ink } },
            t('stem.citylab.hearing_pick', 'Whose objection is strongest against your plan?'),
            h('select', {
              value: chosen ? chosen.id : '',
              onChange: function (e) { setMemo({ stakeholder: e.target.value }); },
              className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
              style: { background: panelBg, color: ink, borderColor: panelBorder }
            },
              h('option', { value: '' }, t('stem.citylab.choose_one', 'Choose one')),
              shs.map(function (s) { return h('option', { key: s.id, value: s.id }, s.name); }))),
          h('label', { className: 'block text-[0.6875rem] font-bold mb-2', style: { color: ink } },
            fmt(t('stem.citylab.hearing_counter', 'Their strongest objection, in your words (at least {min} words, you have {n})'), { min: COUNTER_MIN_WORDS, n: hr.counterWords }),
            h('textarea', {
              value: memo.counter || '', rows: 3,
              onChange: function (e) { setMemo({ counter: e.target.value }); },
              className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
              style: { background: panelBg, color: ink, borderColor: panelBorder }
            })),
          h('label', { className: 'block text-[0.6875rem] font-bold mb-2', style: { color: ink } },
            fmt(t('stem.citylab.hearing_rebuttal', 'Your answer (at least {min} words, you have {n})'), { min: REBUTTAL_MIN_WORDS, n: hr.rebuttalWords }),
            h('textarea', {
              value: memo.rebuttal || '', rows: 4,
              onChange: function (e) { setMemo({ rebuttal: e.target.value }); },
              className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
              style: { background: panelBg, color: ink, borderColor: panelBorder }
            })),
          h('fieldset', null,
            h('legend', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
              chosen ? fmt(t('stem.citylab.hearing_evidence_legend', 'Numbers behind your answer. At least one must be something {who} watches.'), { who: chosen.name })
                : t('stem.citylab.hearing_evidence_legend_none', 'Numbers behind your answer. Choose a stakeholder first to see which numbers they watch.')),
            h('div', { className: 'flex flex-wrap gap-1' },
              watched.map(function (id) { return chip(id, true); }).concat(others.map(function (id) { return chip(id, false); })))),
          hearingReveal());
      }

      // Stage C: the same commit, second try, reveal-on-demand, no-credit
      // rule as the missions. The reveal is a METHOD shown on another town's
      // stakeholder, so it never hands over this plan's answer.
      function hearingReveal() {
        var town = plan.scenarioId;
        var tries = (d.hearingChecks && d.hearingChecks[town]) || 0;
        var revealed = !!(d.hearingRevealed && d.hearingRevealed[town]);
        var submittedH = !!(d.hearingSubmitted && d.hearingSubmitted[town]);
        if (revealed) {
          var idx = SCENARIO_IDS.indexOf(town);
          var other = SCENARIOS[SCENARIO_IDS[(idx + 1) % SCENARIO_IDS.length]];
          var sh = (other.stakeholders || [])[0];
          if (!sh) return null;
          var steps = [
            fmt(t('stem.citylab.hearing_reveal_1', 'Pick the objection that hits your plan hardest, not the easiest one to answer. In {town}, {who} asks: {asks}'), { town: other.town, who: sh.name, asks: sh.asks }),
            fmt(t('stem.citylab.hearing_reveal_2', 'Restate it as strongly as they would, in your own words, naming what they stand to lose. For {who}, that is what they want: {wants}'), { who: sh.name, wants: sh.wants }),
            t('stem.citylab.hearing_reveal_3', 'Answer it: say what your plan does about that worry, and say plainly what it does not do.'),
            fmt(t('stem.citylab.hearing_reveal_4', 'Back the answer with a number they watch, such as {list}, and give its value from your own scorecard.'), { list: sh.watches.map(indicatorLabel).join('; ') })
          ];
          return h('div', { className: 'rounded p-2 mt-2', style: { background: panelBg, border: '1px solid ' + panelBorder } },
            h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
              fmt(t('stem.citylab.hearing_reveal_title', 'One way to answer, shown on {town}'), { town: other.town })),
            h('ol', { className: 'text-[0.6875rem] list-decimal pl-4 space-y-0.5', style: { color: ink } },
              steps.map(function (s, i) { return h('li', { key: i }, s); })),
            h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
              t('stem.citylab.hearing_reveal_no_xp', 'The hearing still counts, but it earns no XP after "Show one way".')));
        }
        if (submittedH || tries < 2 || !teacher.allowReveal) return null;
        return h('div', { className: 'mt-2' },
          smallBtn(t('stem.citylab.hearing_show_one_way', 'Show one way to answer'), function () {
            setFlag('hearingRevealed', town);
            announceToSR(t('stem.citylab.sr_hearing_revealed', 'One way to answer is shown under the hearing, worked on another town. The hearing still counts, but it earns no XP now.'));
          }));
      }

      function memoPanel() {
        var evidence = plan.memo.evidence || [];
        var citeable = visibleIndicatorIds(TIER1_IDS, plan).concat(visibleIndicatorIds(TIER2_IDS, plan));
        var bindingValue = normaliseBinding(plan.memo.bindingConstraint, plan.scenarioId);
        var submitted = !!(d.memoSubmitted && d.memoSubmitted[plan.scenarioId]);
        return h('div', null,
          memoStanding(),
          panel('memo', t('stem.citylab.memo_title', 'The memo is the deliverable'),
            h('div', null,
              h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
                t('stem.citylab.memo_intro', 'A plan that meets every requirement with nothing written underneath it is a plan nobody can argue with, which is not the same as a good one. Name the constraint that pushed back hardest, and say what you decided to give up.')),
              h('label', { className: 'block text-[0.6875rem] font-bold mb-2', style: { color: ink } },
                t('stem.citylab.which_constraint_was_binding', 'Which constraint was binding?'),
                h('select', {
                  value: bindingValue,
                  onChange: function (e) { setMemo({ bindingConstraint: e.target.value }); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                },
                  h('option', { value: '' }, t('stem.citylab.choose_one', 'Choose one')),
                  scen.requirements.map(function (r) {
                    return h('option', { key: r.id, value: r.id }, r.label);
                  }))),
              h('label', { className: 'block text-[0.6875rem] font-bold mb-2', style: { color: ink } },
                t('stem.citylab.what_did_you_give_up_and_why', 'What did you give up, and why?'),
                h('textarea', {
                  value: plan.memo.tradeoff, rows: 4,
                  onChange: function (e) { setMemo({ tradeoff: e.target.value }); },
                  className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                })),
              h('fieldset', { className: 'mb-2' },
                h('legend', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
                  t('stem.citylab.memo_evidence_legend', 'Evidence: which numbers back up your argument? Pick at least one.')),
                h('div', { className: 'flex flex-wrap gap-1' },
                  citeable.map(function (id) {
                    var on = evidence.indexOf(id) !== -1;
                    var v = sc.tier1[id] !== undefined ? sc.tier1[id] : sc.tier2[id];
                    return h('button', {
                      key: id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                      onClick: function () {
                        var next = on ? evidence.filter(function (x) { return x !== id; }) : evidence.concat([id]);
                        setMemo({ evidence: next });
                      },
                      className: 'text-[0.625rem] px-1.5 py-1 rounded border text-left',
                      style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink,
                        borderColor: on ? '#1f5eb0' : panelBorder, minHeight: '26px' }
                    }, fmt(t('stem.citylab.label_value', '{label}: {value}'), { label: indicatorLabel(id), value: fmtIndicator(id, v) }));
                  }))),
              hearingSection(citeable),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', {
                  type: 'button', onClick: submitMemo,
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded',
                  style: { background: '#1f5eb0', color: '#ffffff' }
                }, submitted ? t('stem.citylab.memo_resubmit', 'Submit the memo again') : t('stem.citylab.memo_submit', 'Submit the memo')),
                h('button', {
                  type: 'button',
                  onClick: function () {
                    var ok = download(scen.id + '-plan-memo.html', memoHtml(), 'text/html;charset=utf-8');
                    if (ok) { setExportNote(t('stem.citylab.memo_download_started', 'The memo download started. If nothing arrives, use Open the memo to print instead.')); }
                    announceToSR(__alloT('stem.citylab.sr_plan_memo_downloaded', 'Plan memo downloaded.'));
                  },
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.download_the_plan_memo', 'Download the plan memo')),
                h('button', {
                  type: 'button', onClick: openMemo,
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.open_memo_print', 'Open the memo to print')),
                h('button', {
                  type: 'button',
                  onClick: function () {
                    download(scen.id + '-plan.json', JSON.stringify(plan, null, 2), 'application/json');
                    announceToSR(__alloT('stem.citylab.sr_plan_json_downloaded', 'Plan JSON downloaded.'));
                  },
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.export_plan_json', 'Export plan JSON')),
                h('button', {
                  type: 'button',
                  onClick: function () { copyText(JSON.stringify(plan, null, 2), t('stem.citylab.json_copied', 'Plan JSON copied. Paste it into a .json file to keep or hand in.')); },
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.copy_plan_json', 'Copy plan JSON')),
                h('label', {
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border cursor-pointer',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.import_plan_json', 'Import plan JSON'),
                  h('input', {
                    type: 'file', accept: '.json,application/json', className: 'sr-only',
                    onChange: function (e) {
                      var file = e.target.files && e.target.files[0];
                      e.target.value = '';
                      if (!file || !window.FileReader) return;
                      var reader = new window.FileReader();
                      reader.onload = function () {
                        var res = importPlan(String(reader.result));
                        if (!res.ok) {
                          setImportNote(res.error);
                          announceToSR(fmt(t('stem.citylab.sr_import_failed', 'Import did not work. {reason}'), { reason: res.error }));
                          return;
                        }
                        if (teacher.lockTown && res.plan.scenarioId !== teacher.lockTown) {
                          var lockMsg = fmt(t('stem.citylab.import_wrong_town_locked', 'That plan is for {town}, and your teacher has set this lab to {locked}.'),
                            { town: SCENARIOS[res.plan.scenarioId].town, locked: SCENARIOS[teacher.lockTown].town });
                          setImportNote(lockMsg); announceToSR(lockMsg);
                          return;
                        }
                        // A loaded file is marked, so it can never earn the
                        // brief's XP: that is for plans built here.
                        res.plan.imported = true;
                        if (teacher.moveBudget) res.plan.moveBudget = teacher.moveBudget;
                        // W7: a change waiting for its prediction belongs to the old plan.
                        var hadStaged = !!staged;
                        setStaged(null); checkpointRef.current = null;
                        applyPlan(res.plan, fmt(t('stem.citylab.msg_imported', 'Plan imported into {town}.'), { town: SCENARIOS[res.plan.scenarioId].town }));
                        setSelected(SCENARIOS[res.plan.scenarioId].coreParcel);
                        setCompared(false);
                        var note = fmt(t('stem.citylab.import_note', 'Imported into {town}. {warnings} Undo puts your previous plan back.'),
                          { town: SCENARIOS[res.plan.scenarioId].town,
                            warnings: res.warnings.length ? res.warnings.join(' ') : t('stem.citylab.import_all_recognised', 'Everything in the file was recognised.') });
                        if (hadStaged) note = t('stem.citylab.import_cancelled_staged', 'The change that was waiting for your prediction was cancelled. It was not applied to the imported plan.') + ' ' + note;
                        setImportNote(note);
                        announceToSR(note);
                      };
                      reader.onerror = function () { setImportNote(t('stem.citylab.import_unreadable', 'That file could not be read.')); };
                      reader.readAsText(file);
                    }
                  })),
                // Two-step, and visually separated from the exports beside it.
                // Undo does reach back past a reset, but a destructive control
                // should not sit in a row of harmless ones looking identical.
                confirmReset
                  ? h('span', { className: 'inline-flex gap-1.5' },
                      h('button', {
                        type: 'button',
                        onClick: function () {
                          var fresh = basePlan(plan.scenarioId);
                          if (teacher.moveBudget) fresh.moveBudget = teacher.moveBudget;
                          var dropLead = stagedDropLead();
                          setStaged(null); checkpointRef.current = null;
                          applyPlan(fresh, fmt(t('stem.citylab.msg_reset', 'Plan reset to {town} as it stands today.'), { town: scen.town }), false, dropLead || undefined);
                          if (dropLead) setImportNote(dropLead);
                          setCompared(false);
                          setConfirmReset(false);
                        },
                        className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded',
                        style: { background: missColour, color: '#ffffff' }
                      }, t('stem.citylab.yes_clear_the_plan', 'Yes, clear the plan')),
                      h('button', {
                        type: 'button',
                        onClick: function () { setConfirmReset(false); },
                        className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                        style: { background: panelBg, color: ink, borderColor: panelBorder }
                      }, t('stem.citylab.cancel', 'Cancel')))
                  : h('button', {
                      type: 'button',
                      onClick: function () { setConfirmReset(true); },
                      className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                      style: { background: 'transparent', color: missColour, borderColor: missColour }
                    }, t('stem.citylab.start_over', 'Start over'))),
              // A string after a successful submission; otherwise the same
              // shape as a mission check: what is missing, then any named
              // misconception, in the same panel style.
              memoNote && typeof memoNote === 'object'
                ? h('div', { className: 'mt-2', role: 'status' },
                    h('p', { className: 'text-[0.6875rem] font-bold', style: { color: missColour } }, memoNote.head),
                    h('ul', { className: 'text-[0.6875rem] list-disc pl-4', style: { color: ink } },
                      memoNote.parts.map(function (p, k) { return h('li', { key: k }, '○ ' + p); })),
                    memoNote.misconceptions.map(function (m) {
                      var mc = misconceptionCopy(m);
                      return h('p', { key: m, className: 'text-[0.6875rem] mt-1 rounded p-1.5', style: { color: ink, background: softBlue } },
                        h('strong', null, mc.name + '. '), mc.text);
                    }))
                : memoNote ? h('p', { className: 'text-[0.6875rem] mt-2 font-bold', role: 'status', style: { color: ink } }, memoNote) : null,
              exportNote ? h('p', { className: 'text-[0.6875rem] mt-1', style: { color: dim } }, exportNote) : null,
              importNote
                ? h('p', { className: 'text-[0.6875rem] mt-2', style: { color: dim } }, importNote)
                : h('p', { className: 'text-[0.625rem] mt-2', style: { color: dim } },
                    t('stem.citylab.import_merge_note', 'Import is merge-only: it starts from this town as it stands today and lays the imported choices on top, so a plan file can never bring in terrain or a land use this tool does not know.')))));
      }

      // ---- predict-before-commit card
      // W1: the docked card's buttons vanish once answered; send focus back to
      // the stage the edit was made on rather than letting it fall to the page.
      // Hunt: on the map the card's buttons leave with it; focus goes back to
      // the map's own tab stop, the selected parcel, never to the page.
      function cardDone() { pendingFocusRef.current = stageLive ? 'citylab-stage' : 'citylab-parcel-' + selected; }

      function predictCard() {
        if (!staged) {
          // W5: a neutral chip, the same whether the guess was right or wrong:
          // a prediction is never scored and never celebrated.
          return predictResult
            ? h('p', { 'data-citylab-predict-chip': 'neutral', className: 'text-[0.6875rem] mb-2 rounded px-2 py-1',
                style: { color: ink, background: softRow, border: '1px solid ' + panelBorder } }, predictResult)
            : null;
        }
        var avail = predictIndicatorsFor(plan);
        var ind = PREDICT_BY_ID[predInd] && avail.some(function (p) { return p.id === predInd; }) ? predInd : 'runoffCoefficient';
        var spec = PREDICT_BY_ID[ind];
        var nowVal = indicatorValue(sc, ind);
        var sizes = [
          ['small', fmt(t('stem.citylab.size_small_range', 'Small: under {a}'), { a: fmtBand(ind, spec.bands[0]) })],
          ['medium', fmt(t('stem.citylab.size_medium_range', 'Medium: {a} to {b}'), { a: fmtBand(ind, spec.bands[0]), b: fmtBand(ind, spec.bands[1]) })],
          ['large', fmt(t('stem.citylab.size_large_range', 'Large: {b} or more'), { b: fmtBand(ind, spec.bands[1]) })]
        ];
        return panel('predict', t('stem.citylab.predict_title', 'Before you look'),
          h('div', { 'data-citylab-predict-card': 'true' },
            h('p', { className: 'text-[0.6875rem] mb-1', style: { color: ink } },
              fmt(t('stem.citylab.predict_waiting', 'Waiting, not applied yet: {change}'), { change: staged.message })),
            h('label', { className: 'block text-[0.6875rem] font-bold mb-1', style: { color: ink } },
              t('stem.citylab.predict_which', 'Which number will you predict?'),
              h('select', {
                value: ind,
                onChange: function (e) { setPredInd(e.target.value); setPredSize(''); },
                className: 'block w-full mt-0.5 text-[0.6875rem] rounded border px-1 py-1',
                style: { background: panelBg, color: ink, borderColor: panelBorder }
              }, avail.map(function (p) {
                return h('option', { key: p.id, value: p.id }, indicatorLabel(p.id));
              }))),
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: ink } },
              fmt(t('stem.citylab.predict_before_value', 'Before this change, the {name} was {value}. Without looking at the scorecard: will it go up, go down, or stay about the same?'),
                { name: predictName(ind), value: fmtIndicator(ind, nowVal) })),
            h('div', { className: 'mb-2', role: 'group', 'aria-label': t('stem.citylab.predict_size_group', 'Rough size of the change (optional)') },
              h('div', { className: 'text-[0.625rem] font-bold mb-0.5', style: { color: dim } },
                t('stem.citylab.predict_size_label', 'Rough size, if you want to commit to one:')),
              h('div', { className: 'flex flex-wrap gap-1' },
                sizes.map(function (s) {
                  return smallBtn(s[1], function () { setPredSize(predSize === s[0] ? '' : s[0]); }, { pressed: predSize === s[0], key: s[0] });
                }))),
            h('div', { className: 'flex gap-2', role: 'group', 'aria-label': t('stem.citylab.predict_direction_group', 'Your prediction. Choosing one applies the change and shows what happened.') },
              ['up', 'down', 'about the same'].map(function (g) {
                return h('button', {
                  key: g, type: 'button',
                  onClick: function () { commitPrediction(g); cardDone(); },
                  className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border flex-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px' }
                }, dirLabel(g));
              })),
            h('div', { className: 'flex flex-wrap gap-2 mt-2' },
              predictEvery && teacher.predictEvery ? null
                : smallBtn(t('stem.citylab.predict_skip', 'Skip, just apply it'), function () { skipPrediction(); cardDone(); }),
              smallBtn(t('stem.citylab.predict_cancel', 'Cancel this change'), function () { cancelStaged(); cardDone(); })),
            h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
              t('stem.citylab.never_scored_it_is_a_note_to_yourself_', 'Never scored. It is a note to yourself about whether you had a model.'))));
      }

      // ---- missions (grades 6-8 start here; anyone can open them)
      // The full record lives in `missions`; the flat missionsDone and
      // missionsRevealed flags are what the host's progress autosave can
      // carry, so a reload that kept only those still knows both facts.
      function missionRecord(mid) {
        var town = (d.missions && d.missions[plan.scenarioId]) || {};
        var rec = Object.assign({}, town[mid] || {});
        var key = plan.scenarioId + ':' + mid;
        if (d.missionsDone && d.missionsDone[key]) rec.done = true;
        if (d.missionsRevealed && d.missionsRevealed[key]) rec.revealed = true;
        return rec;
      }
      function setFlag(field, key) {
        updWith(function (cur) {
          var m = Object.assign({}, cur[field] || {});
          m[key] = true;
          var out = {}; out[field] = m;
          return out;
        });
      }
      function setMissionRecord(mid, patch) {
        var town = plan.scenarioId;
        updWith(function (cur) {
          var all = Object.assign({}, cur.missions || {});
          var mine = Object.assign({}, all[town] || {});
          mine[mid] = Object.assign({}, mine[mid] || {}, patch);
          all[town] = mine;
          return { missions: all };
        });
      }

      function checkMission(mid, from) {
        var st = missionStatus(mid, plan);
        var rec = missionRecord(mid);
        setMissionNote({ mid: mid, met: st.met, conds: st.conds, misconceptions: st.misconceptions, standardOnly: st.standardOnly });
        if (from === 'strip') revealRef.current = '[data-citylab-celebrate],[data-citylab-strip-result]';
        else if (from !== 'hud') revealRef.current = '[data-citylab-box-result]';
        var copy = missionCopy(mid, plan);
        if (st.met) {
          setMissionRecord(mid, { done: true, checks: (rec.checks || 0) + 1 });
          setFlag('missionsDone', plan.scenarioId + ':' + mid);
          // No XP once the strategy was revealed: credit is for working it out.
          if (!rec.revealed) {
            awardOnce(xpId('mission', plan.scenarioId, mid), XP_POINTS.mission,
              fmt(t('stem.citylab.xp_mission', 'Completed the mission: {title}'), { title: copy.title }));
          }
          announceToSR(fmt(t('stem.citylab.sr_mission_done', 'Mission complete: {title}. The model checked your plan, not a guess.'), { title: copy.title }));
          // W5: fireworks (or the still banner) only for a pass that counts.
          // An imported plan or a revealed strategy still completes, quietly.
          var fx = missionCelebrates(st, rec, plan);
          celebTokenRef.current++;
          setCelebration({ mid: mid, token: celebTokenRef.current, at: Date.now(), fx: fx,
            why: fx ? '' : (plan.imported ? 'imported' : 'revealed') });
          if (fx) { logCelebration('pass', mid); playCue('pass'); }
          setStripMid(mid);
          // The strip's Check button goes with the mission it passed: focus
          // moves to Next mission rather than falling to the page.
          if (from === 'strip') pendingFocusRef.current = 'citylab-strip-next';
          // Hunt: the HUD's and the Missions box's Check leave with the mission
          // too: back to the model, or to the next mission's Check (the title
          // when none is left).
          else if (from === 'hud') pendingFocusRef.current = 'citylab-stage';
          else {
            var more = MISSION_IDS.some(function (m2) { return m2 !== mid && !missionRecord(m2).done; });
            pendingFocusRef.current = more ? 'citylab-missions-check' : 'citylab-missions-title';
          }
        } else {
          setCelebration(null);
          setMissionRecord(mid, { checks: (rec.checks || 0) + 1 });
          // The class-level tally the teacher panel shows: which
          // misconceptions came up, never who had them.
          if (st.misconceptions.length) {
            updWith(function (cur) {
              var tally = Object.assign({}, cur.misTally || {});
              st.misconceptions.forEach(function (m) { tally[m] = (tally[m] || 0) + 1; });
              return { misTally: tally };
            });
          }
          var unmet = st.conds.filter(function (c) { return !c.met; }).map(condLine);
          announceToSR(t('stem.citylab.sr_mission_not_yet', 'Not met yet.') + ' ' +
            (st.standardOnly ? t('stem.citylab.mission_standard_only', 'Under your own assumption set this plan meets the mission, but it does not count yet: every mission is also checked under the central estimates, and under those it falls short.') + ' ' : '') +
            unmet.join(' ') + ' ' +
            st.misconceptions.map(function (m) { return misconceptionCopy(m).name + '. ' + misconceptionCopy(m).text; }).join(' '));
        }
      }

      // The fully worked example is from ANOTHER town, so it shows the method
      // without handing over this town's answer.
      function workedExample() {
        var idx = SCENARIO_IDS.indexOf(plan.scenarioId);
        var otherId = SCENARIO_IDS[(idx + 1) % SCENARIO_IDS.length];
        var other = SCENARIOS[otherId];
        var ex = parkExample(otherId);
        var steps = [
          fmt(t('stem.citylab.ex_step_rule', 'The rule: 5 minutes at walking pace is about 417 m, and each parcel is 100 m, so a park counts for a home when it is at most {hops} steps away along streets or paths.'), { hops: ex.hopLimit }),
          fmt(t('stem.citylab.ex_step_start', 'In {town}, before any parks, {pct} of homes have a park that close.'), { town: other.town, pct: fmtPct(ex.startPct) })
        ];
        ex.steps.forEach(function (s) {
          steps.push(s.via
            ? fmt(t('stem.citylab.ex_step_park_path', 'Zone {parcel} ({was}) as a park and join it to {via} with a footpath, because no street runs into it. Park access is now {pct}.'),
                { parcel: s.id, was: useLabel(s.wasUse, otherId), via: s.via, pct: fmtPct(s.pct) })
            : fmt(t('stem.citylab.ex_step_park', 'Zone {parcel} ({was}) as a park. A street already runs into it, so it is on the walking network. Park access is now {pct}.'),
                { parcel: s.id, was: useLabel(s.wasUse, otherId), pct: fmtPct(s.pct) }));
        });
        steps.push(ex.reaches
          ? fmt(t('stem.citylab.ex_step_done', 'That meets the {target} target in {town}. Each park went where it reached the most homes not yet covered.'), { target: fmtPct(other.parkAccessTarget), town: other.town })
          : t('stem.citylab.ex_step_short', 'Three parks still fall short there, which is why paths matter as much as parks.'));
        // The heading takes focus when the Start here path opens the example
        // (a heading, not the box: a focusable div is this file's banned class).
        return h('div', { className: 'rounded p-2 mt-2', style: { background: softBlue } },
          h('h4', { id: 'citylab-worked-example', tabIndex: -1, className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
            fmt(t('stem.citylab.ex_title', 'Worked example, from {town}'), { town: other.town })),
          h('ol', { className: 'text-[0.6875rem] list-decimal pl-4 space-y-0.5', style: { color: ink } },
            steps.map(function (s, i) { return h('li', { key: i }, s); })),
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
            fmt(t('stem.citylab.ex_your_turn', 'Your turn: the same method in {town}. The parcels will be different.'), { town: scen.town })));
      }

      // The second mission's example is partly worked: the first step is done
      // for you in this town, and the rest is yours.
      function partlyWorked() {
        var open = servedOpenParcels(plan).slice(0, 4);
        return h('div', { className: 'rounded p-2 mt-2', style: { background: softBlue } },
          h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
            t('stem.citylab.ex2_title', 'First step, done for you')),
          h('p', { className: 'text-[0.6875rem]', style: { color: ink } },
            open.length
              ? fmt(t('stem.citylab.ex2_open', 'The cheapest homes are on open parcels a road already runs into, outside the flood zone and above the 2100 line, such as {list}. Zoning one as mixed use adds 60 homes and needs no new road.'), { list: open.join(', ') })
              : t('stem.citylab.ex2_none', 'Here no open parcel on today\'s roads is safe to build on, so the first thing the bond has to buy is a road out to open land. Build it one connection at a time and watch the cost.')),
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: dim } },
            t('stem.citylab.ex2_rest', 'The rest is yours: how many parcels, where, and which roads.')));
      }

      function missionsPanel() {
        var firstOpen = null;
        MISSION_IDS.forEach(function (mid) { if (!firstOpen && !missionRecord(mid).done) firstOpen = mid; });
        var allDone = !firstOpen;
        return panel('missions', t('stem.citylab.missions_title', 'Missions'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
              t('stem.citylab.missions_intro_five', 'Five pieces of the brief, one at a time. The model checks each one when you press Check my plan. After the five, the full brief is the same job with every requirement at once.')),
            // Reopened from the Start here path once mission 1 is behind you
            // (while mission 1 is current, the example already sits in it).
            exampleOpen && firstOpen !== 'm_park'
              ? h('div', { className: 'mb-2' },
                  workedExample(),
                  smallBtn(t('stem.citylab.ex_close', 'Close the worked example'), function () { setExampleOpen(false); }))
              : null,
            h('ol', { className: 'space-y-1.5' },
              MISSION_IDS.map(function (mid, i) {
                var rec = missionRecord(mid);
                var copy = missionCopy(mid, plan);
                var current = mid === firstOpen;
                var locked = !rec.done && !current;
                var status = rec.done ? t('stem.citylab.mission_done', 'Done') : (current ? t('stem.citylab.mission_current', 'Now') : t('stem.citylab.mission_later', 'Later'));
                return h('li', { key: mid, className: 'rounded p-1.5', style: { background: softRow, opacity: locked ? 0.75 : 1 } },
                  h('div', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                    fmt(t('stem.citylab.mission_heading', '{n}. {title} ({status})'), { n: i + 1, title: copy.title, status: status })),
                  current ? h('div', null,
                    h('p', { className: 'text-[0.6875rem] mt-0.5', style: { color: ink } }, copy.goal),
                    i === 0 ? workedExample() : null,
                    i === 1 ? partlyWorked() : null,
                    // Hints: a ladder, one rung at a time. Support fades:
                    // missions 1-3 offer hints at once (beside a full and a
                    // partly worked example), missions 4 and 5 only after
                    // the plan has been checked once.
                    (i < 3 || (rec.checks || 0) > 0)
                      ? h('div', { className: 'mt-2' },
                          copy.hints.slice(0, rec.hints || 0).map(function (hint, k) {
                            return h('p', { key: k, className: 'text-[0.6875rem]', style: { color: ink } },
                              fmt(t('stem.citylab.hint_n', 'Hint {n}: {text}'), { n: k + 1, text: hint }));
                          }),
                          (rec.hints || 0) < copy.hints.length
                            ? smallBtn(fmt(t('stem.citylab.hint_button', 'Show a hint ({n} of {total})'), { n: (rec.hints || 0) + 1, total: copy.hints.length }),
                                function () {
                                  var n = (rec.hints || 0) + 1;
                                  setMissionRecord(mid, { hints: n });
                                  if (n >= copy.hints.length) pendingFocusRef.current = 'citylab-missions-check';
                                  announceToSR(fmt(t('stem.citylab.hint_n', 'Hint {n}: {text}'), { n: n, text: copy.hints[n - 1] }));
                                })
                            : null)
                      : null,
                    h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
                      smallBtn(t('stem.citylab.check_plan', 'Check my plan'), function () { checkMission(mid); }, { primary: true, id: 'citylab-missions-check' }),
                      // A strategy, not a plan, and only after two honest tries.
                      teacher.allowReveal && (rec.checks || 0) >= 2 && !rec.revealed
                        ? smallBtn(t('stem.citylab.show_one_way', 'Show one way to do it'), function () {
                            pendingFocusRef.current = 'citylab-missions-check';
                            setMissionRecord(mid, { revealed: true });
                            setFlag('missionsRevealed', plan.scenarioId + ':' + mid);
                            announceToSR(copy.reveal + ' ' + t('stem.citylab.reveal_no_xp', 'The mission still counts when the model checks it, but it earns no XP now.'));
                          })
                        : null),
                    rec.revealed ? h('p', { className: 'text-[0.6875rem] mt-1 rounded p-1.5', style: { color: ink, background: softBlue } },
                      copy.reveal + ' ' + t('stem.citylab.reveal_no_xp', 'The mission still counts when the model checks it, but it earns no XP now.')) : null,
                    missionNote && missionNote.mid === mid && !missionNote.met ? h('div', { className: 'mt-2', role: 'status', 'data-citylab-box-result': 'not_yet' },
                      h('div', null,
                            h('p', { className: 'text-[0.6875rem] font-bold', style: { color: missColour } }, t('stem.citylab.mission_not_yet', 'Not met yet. Here is what the model sees:')),
                            missionNote.standardOnly ? h('p', { className: 'text-[0.6875rem]', style: { color: ink } },
                              t('stem.citylab.mission_standard_only', 'Under your own assumption set this plan meets the mission, but it does not count yet: every mission is also checked under the central estimates, and under those it falls short.')) : null,
                            h('ul', { className: 'text-[0.6875rem] list-disc pl-4', style: { color: ink } },
                              missionNote.conds.map(function (c, k) {
                                return h('li', { key: k }, (c.met ? '✔ ' : '○ ') + condLine(c));
                              })),
                            missionNote.misconceptions.map(function (m) {
                              var mc = misconceptionCopy(m);
                              return h('p', { key: m, className: 'text-[0.6875rem] mt-1 rounded p-1.5', style: { color: ink, background: softBlue } },
                                h('strong', null, mc.name + '. '), mc.text);
                            }))) : null) : null,
                  // A completed mission is no longer the current one, so its
                  // confirmation lives on its own line rather than in the card.
                  rec.done && !current ? h('p', { className: 'text-[0.625rem]', style: { color: okColour } }, '✔ ' + copy.goal) : null,
                  missionNote && missionNote.mid === mid && missionNote.met
                    ? h('p', { className: 'text-[0.6875rem] font-bold mt-1', role: 'status', style: { color: okColour } },
                        fmt(t('stem.citylab.mission_met_note', 'Mission complete: {title}.'), { title: copy.title }))
                    : null);
              })),
            allDone ? h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: okColour } },
              t('stem.citylab.missions_all_done_five', 'All five missions done. The full brief asks for all of it at once, at the full size. Switch to Full brief when you are ready.')) : null),
          'citylab-missions-title');
      }

      function levelSwitch() {
        if (teacher.level) return null;
        return h('div', { className: 'flex flex-wrap items-center gap-1.5 mb-2', role: 'group',
          'aria-label': t('stem.citylab.level_group', 'How to work on this town') },
          smallBtn(t('stem.citylab.level_missions', 'Missions'), function () { upd({ level: 'missions' }); }, { pressed: level === 'missions' }),
          smallBtn(t('stem.citylab.level_brief', 'Full brief'), function () { upd({ level: 'brief' }); }, { pressed: level === 'brief' }));
      }

      // ---- teacher panel (ctx.isTeacherMode only)
      function teacherPanel() {
        if (!isTeacher) return null;
        function setTeacher(patch) {
          updWith(function (cur) { return { teacher: Object.assign({}, teacherSettings(cur.teacher), patch) }; });
          announceToSR(t('stem.citylab.sr_teacher_saved', 'Teacher setting saved. It travels with this project to every student who opens it.'));
        }
        var summary = classSet.length ? classSummary(classSet, plan.scenarioId, plan.assumptionSetId) : null;
        var tally = d.misTally || {};
        var tallyKeys = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
        var selectStyle = { background: panelBg, color: ink, borderColor: panelBorder };
        return panel('teacher', t('stem.citylab.teacher_title', 'Teacher settings'),
          h('div', null,
            smallBtn(teacherOpen ? t('stem.citylab.teacher_hide', 'Hide teacher settings') : t('stem.citylab.teacher_show', 'Show teacher settings'),
              function () { setTeacherOpen(!teacherOpen); }, { aria: undefined }),
            teacherOpen ? h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[0.6875rem]', style: { color: ink } },
              h('label', { className: 'font-bold' }, t('stem.citylab.teacher_lock_town', 'Lock the town'),
                h('select', { value: teacher.lockTown, className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                  onChange: function (e) { setTeacher({ lockTown: e.target.value }); } },
                  h('option', { value: '' }, t('stem.citylab.teacher_no_lock', 'Students choose')),
                  SCENARIO_IDS.map(function (sid) { return h('option', { key: sid, value: sid }, SCENARIOS[sid].town); }))),
              h('div', null,
                h('label', { className: 'font-bold block' }, t('stem.citylab.teacher_budget', 'Move budget (edits allowed)'),
                  h('input', { type: 'number', min: 1, max: 999, inputMode: 'numeric',
                    value: budgetDraft !== '' ? budgetDraft : (teacher.moveBudget || ''),
                    onChange: function (e) { setBudgetDraft(e.target.value); },
                    className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle })),
                h('div', { className: 'flex gap-1 mt-1' },
                  smallBtn(t('stem.citylab.teacher_budget_set', 'Set budget'), function () {
                    var n = parseInt(budgetDraft, 10);
                    if (n > 0) { setTeacher({ moveBudget: Math.min(999, n) }); setBudgetDraft(''); }
                  }),
                  smallBtn(t('stem.citylab.teacher_budget_clear', 'No budget'), function () { setTeacher({ moveBudget: null }); setBudgetDraft(''); }))),
              h('div', null,
                smallBtn(t('stem.citylab.teacher_lock_sets', 'Fix the two sets students compare'), function () { setTeacher({ lockSets: !teacher.lockSets }); }, { pressed: teacher.lockSets }),
                teacher.lockSets ? h('div', { className: 'grid grid-cols-2 gap-1 mt-1' },
                  [['setA', t('stem.citylab.set_a', 'Set A')], ['setB', t('stem.citylab.set_b', 'Set B')]].map(function (kv) {
                    return h('label', { key: kv[0], className: 'font-bold' }, kv[1],
                      h('select', { value: teacher[kv[0]], className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                        onChange: function (e) { var p = {}; p[kv[0]] = e.target.value; setTeacher(p); } },
                        ASSUMPTION_SETS.map(function (s) { return h('option', { key: s.id, value: s.id }, s.label); })));
                  })) : null),
              h('label', { className: 'font-bold' }, t('stem.citylab.teacher_score_set', 'Assumption set for the scorecard and map'),
                h('select', { value: teacher.scoreSet, className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                  onChange: function (e) { setTeacher({ scoreSet: e.target.value }); } },
                  h('option', { value: '' }, t('stem.citylab.teacher_no_lock', 'Students choose')),
                  ASSUMPTION_SETS.map(function (s) { return h('option', { key: s.id, value: s.id }, s.label); }))),
              h('label', { className: 'font-bold' }, t('stem.citylab.teacher_level', 'Start students on'),
                h('select', { value: teacher.level, className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                  onChange: function (e) { setTeacher({ level: e.target.value }); } },
                  h('option', { value: '' }, t('stem.citylab.teacher_level_band', 'Their grade band (6-8 missions, 9-12 full brief)')),
                  h('option', { value: 'missions' }, t('stem.citylab.level_missions', 'Missions')),
                  h('option', { value: 'brief' }, t('stem.citylab.level_brief', 'Full brief')))),
              h('label', { className: 'font-bold' }, t('stem.citylab.teacher_hearing', 'The hearing in the memo (two stakeholders, a counter-argument)'),
                h('select', { value: teacher.hearing, className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                  onChange: function (e) { setTeacher({ hearing: e.target.value }); } },
                  h('option', { value: '' }, t('stem.citylab.teacher_hearing_band', 'By grade band (on for 9-12), students may change it')),
                  h('option', { value: 'on' }, t('stem.citylab.teacher_hearing_on', 'Required for everyone')),
                  h('option', { value: 'off' }, t('stem.citylab.teacher_hearing_off', 'Off for everyone')))),
              h('label', { className: 'font-bold' }, t('stem.citylab.teacher_simple', 'Picture tools and a short scorecard (the K-5 view)'),
                h('select', { value: teacher.simple, className: 'block w-full mt-0.5 rounded border px-1 py-1', style: selectStyle,
                  onChange: function (e) { setTeacher({ simple: e.target.value }); } },
                  h('option', { value: '' }, t('stem.citylab.teacher_simple_band', 'By grade band (on for K-2 and 3-5)')),
                  h('option', { value: 'on' }, t('stem.citylab.teacher_simple_on', 'On for everyone')),
                  h('option', { value: 'off' }, t('stem.citylab.teacher_simple_off', 'Off for everyone')))),
              h('div', { className: 'flex flex-wrap gap-1' },
                smallBtn(t('stem.citylab.teacher_predict_every', 'Require a prediction before every change'), function () { setTeacher({ predictEvery: !teacher.predictEvery }); }, { pressed: teacher.predictEvery }),
                smallBtn(t('stem.citylab.teacher_allow_reveal', 'Allow "Show one way" after two checks'), function () { setTeacher({ allowReveal: !teacher.allowReveal }); }, { pressed: teacher.allowReveal }),
                smallBtn(t('stem.citylab.teacher_show_path', 'Show the Start here path'), function () { setTeacher({ pathOff: !teacher.pathOff }); }, { pressed: !teacher.pathOff }))) : null,
            teacherOpen ? h('div', { className: 'mt-3 text-[0.6875rem]', style: { color: ink } },
              h('div', { className: 'font-bold' }, t('stem.citylab.teacher_missed_title', 'Missed items on this device')),
              tallyKeys.length
                ? h('ul', { className: 'list-disc pl-4' }, tallyKeys.map(function (k) {
                    return h('li', { key: k }, fmt(t('stem.citylab.teacher_tally_row', '{name}: came up {n} times'), { name: misconceptionCopy(k).name, n: tally[k] }));
                  }))
                : h('p', { style: { color: dim } }, t('stem.citylab.teacher_tally_none', 'No mission checks have named a misconception here yet.')),
              h('p', { className: 'mt-1', style: { color: dim } },
                fmt(t('stem.citylab.teacher_predictions', 'Predictions made in this plan: {n}. They are never scored.'), { n: (plan.predictions || []).length })),
              summary
                ? h('div', { className: 'mt-1' },
                    h('div', { className: 'font-bold' }, fmt(t('stem.citylab.teacher_class_missed', 'Loaded class set ({n} plans): requirements most often missed'), { n: summary.n })),
                    h('ul', { className: 'list-disc pl-4' }, summary.perRequirement.slice().sort(function (a, b) { return b.missed - a.missed; })
                      .map(function (r) { return h('li', { key: r.id }, fmt(t('stem.citylab.teacher_class_row', '{req}: missed by {n}'), { req: r.label, n: r.missed })); })))
                : null,
              smallBtn(t('stem.citylab.teacher_open_class', 'Open the class view'), function () { setTab('class'); })) : null));
      }

      // ---- "Start here": the band's short path (stage C) -----------------
      // Ticks come from learningPath(), which reads only existing progress.
      // Each step is a button that opens the place where that step happens.
      function goToStep(id) {
        var levelFree = !teacher.level;
        if (id === 'example' || MISSION_IDS.indexOf(id) !== -1) {
          setTab('design');
          if (levelFree && level !== 'missions') upd({ level: 'missions' });
          if (id === 'example') {
            setExampleOpen(true);
            setFlag('exampleRead', plan.scenarioId);
            pendingFocusRef.current = 'citylab-worked-example';
          } else {
            pendingFocusRef.current = 'citylab-tab-design';
          }
        } else if (id === 'brief') {
          setTab('design');
          if (levelFree && level !== 'brief') upd({ level: 'brief' });
          pendingFocusRef.current = 'citylab-tab-design';
        } else if (id === 'lab') {
          setTab('assume'); pendingFocusRef.current = 'citylab-tab-assume';
        } else if (id === 'memo' || id === 'hearing') {
          setTab('memo');
          if (id === 'hearing' && !hearingActive && !teacher.hearing) upd({ hearing: true });
          pendingFocusRef.current = 'citylab-tab-memo';
        } else if (id === 'access') {
          setTab('design'); setBoardView('access');
          pendingFocusRef.current = 'citylab-tab-design';
        }
        // Focus lands on the step's tab (or the worked example's heading):
        // the screen reader names where it went, and Tab moves into it.
      }
      function pathStepTitle(id) {
        if (id === 'example') {
          var idx = SCENARIO_IDS.indexOf(plan.scenarioId);
          return fmt(t('stem.citylab.path_example', 'Study the worked example from {town}'),
            { town: SCENARIOS[SCENARIO_IDS[(idx + 1) % SCENARIO_IDS.length]].town });
        }
        if (MISSION_IDS.indexOf(id) !== -1) return fmt(t('stem.citylab.path_mission', 'Mission: {title}'), { title: missionCopy(id, plan).title });
        if (id === 'brief') return t('stem.citylab.path_brief_v2', 'Meet every required part of the brief, then press Check my plan');
        if (id === 'lab') return t('stem.citylab.path_lab', 'Test the plan under two assumption sets in the Assumption Lab');
        if (id === 'memo') return t('stem.citylab.path_memo', 'Write and submit the memo');
        if (id === 'hearing') return t('stem.citylab.path_hearing', 'Answer a stakeholder at the hearing');
        return t('stem.citylab.path_access', 'Open Access gaps and choose the gap you would close first');
      }
      function startHerePanel(where) {
        if (teacher.pathOff) return null;
        var lp = learningPath(ctx.gradeBand, d.teacher, d, plan);
        // W3: while the coach runs, the path folds to its progress line.
        // W6: and while a strip shows (missions or the full brief), which is
        // every level: folded, it is a chip in the title row; opened, a panel
        // under it. Opening it is for this visit.
        var folded = !!(coachStep || stripKind);
        var showPath = folded ? pathPeek : pathOpen;
        if ((where === 'header') === showPath) return null;
        var intro = lp.kind === 'missions'
          ? t('stem.citylab.path_intro_missions', 'One piece at a time: a worked example, then five missions in order. Each tick comes from the model checking your plan.')
          : t('stem.citylab.path_intro_brief', 'The whole job: meet the brief, test it, argue for it in the memo and at the hearing, then look at who is still left out.');
        var toggle = smallBtn(showPath ? t('stem.citylab.path_hide', 'Hide the steps') : t('stem.citylab.path_show', 'Show the steps'),
          function () {
            if (folded) setPathPeek(!pathPeek); else setPathOpen(!pathOpen);
            // The chip and the panel are in different places: focus follows the button.
            pendingFocusRef.current = 'citylab-path-toggle';
          }, { pressed: showPath, id: 'citylab-path-toggle' });
        return h('nav', { className: 'rounded-xl border ' + (showPath ? 'mb-3 p-2.5' : 'px-2 py-0.5'), 'aria-labelledby': 'citylab-path-title',
            'data-citylab-path': showPath ? 'open' : 'chip',
            style: Object.assign({ background: panelBg, borderColor: panelBorder }, showPath ? null : { minWidth: 0, maxWidth: '100%' }) },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-x-2' },
            h('h3', { id: 'citylab-path-title', className: 'text-[0.75rem] font-black', style: { color: ink } },
              fmt(t('stem.citylab.path_title', 'Start here: {done} of {total} done in {town}'), { done: lp.doneCount, total: lp.steps.length, town: scen.town })),
            toggle),
          showPath ? h('div', null,
            h('p', { className: 'text-[0.6875rem] mt-1 mb-1.5', style: { color: dim } }, intro),
            h('ol', { className: 'space-y-1' },
              lp.steps.map(function (s, i) {
                var isNext = s.id === lp.next;
                var title = pathStepTitle(s.id);
                var label = fmt(s.done ? t('stem.citylab.path_step_done', '{n}. {title}: done') : isNext
                  ? t('stem.citylab.path_step_next', '{n}. {title}: next') : t('stem.citylab.path_step_todo', '{n}. {title}: not yet'), { n: i + 1, title: title });
                return h('li', { key: s.id },
                  h('button', {
                    type: 'button', onClick: function () { goToStep(s.id); },
                    'aria-current': isNext ? 'step' : undefined,
                    className: 'w-full text-left text-[0.6875rem] px-2 py-1 rounded border flex items-center gap-2',
                    style: { background: isNext ? softBlue : 'transparent', color: ink,
                      borderColor: isNext ? '#1f5eb0' : panelBorder, minHeight: '44px', fontWeight: isNext ? 700 : 400 }
                  },
                    h('span', { 'aria-hidden': 'true', className: 'inline-block text-center font-black',
                      style: { width: '1.1em', color: s.done ? okColour : dim } }, s.done ? '✔' : '○'),
                    h('span', null, label)));
              }))) : null);
      }

      // ---- tabs. Grouped so the core work comes first: build the plan,
      // then test and argue for it, then the background reading, then the
      // teacher's class view. Ids are unchanged, so saved links still work.
      var TABS = [
        { id: 'design', group: 'build', label: t('stem.citylab.design', 'Design') },
        { id: 'table', group: 'build', label: t('stem.citylab.parcel_table', 'Parcel table') },
        { id: 'assume', group: 'argue', label: t('stem.citylab.assumption_lab', 'Assumption Lab') },
        { id: 'memo', group: 'argue', label: t('stem.citylab.memo', 'Memo') },
        { id: 'discuss', group: 'context', label: t('stem.citylab.discussion', 'Discussion') },
        { id: 'history', group: 'context', label: t('stem.citylab.history', 'History') },
        { id: 'about', group: 'context', label: t('stem.citylab.how_this_works', 'How this works') },
        { id: 'class', group: 'teacher', label: t('stem.citylab.class_view', 'Class view') }
      ];
      var TAB_GROUP_LABEL = {
        build: t('stem.citylab.tabgroup_build', 'Build'),
        argue: t('stem.citylab.tabgroup_argue', 'Test and argue'),
        context: t('stem.citylab.tabgroup_context', 'Background'),
        teacher: t('stem.citylab.tabgroup_teacher', 'For teachers')
      };

      function tabKeyDown(e, idx) {
        var next = null;
        if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = TABS.length - 1;
        if (next === null) return;
        e.preventDefault();
        setTab(TABS[next].id);
        if (typeof document !== 'undefined') {
          var node = document.getElementById('citylab-tab-' + TABS[next].id);
          if (node && node.focus) node.focus();
        }
      }

      function discussionPanel() {
        var prompts = discussionFor(plan);
        return h('div', null,
          panel('disc-intro', t('stem.citylab.disc_intro_title', 'The questions this tool will not answer'),
            h('div', null,
              h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
                t('stem.citylab.disc_intro', 'The scorecard leaves out rents, displacement, jobs, property values, crime and school quality, because the evidence about what a plan does to any of them is genuinely argued over. Leaving them out and saying nothing else would be ducking them. So here they are, as the arguments they actually are.')),
              h('p', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                t('stem.citylab.disc_no_key', 'None of these has an answer key either. Each one names positions that thoughtful people hold, and none of them is marked correct.')))),

          prompts.map(function (dq, i) {
            return panel('disc-' + dq.id, fmt(t('stem.citylab.numbered', '{n}. {text}'), { n: i + 1, text: dq.question }),
              h('div', null,
                dq.why ? h('p', { className: 'text-[0.6875rem] mb-2 italic', style: { color: dim } }, dq.why) : null,
                h('ul', { className: 'space-y-1.5' },
                  dq.sides.map(function (side, j) {
                    return h('li', { key: j, className: 'text-[0.6875rem] rounded p-1.5',
                      style: { background: softRow } },
                      h('strong', { style: { color: ink } }, side.label + '. '),
                      h('span', { style: { color: dim } }, side.view));
                  })),
                h('p', { className: 'text-[0.6875rem] mt-2 rounded p-1.5',
                  style: { color: ink, background: softBlue } },
                  h('strong', null, t('stem.citylab.what_this_tool_did', 'What this tool did: ')), dq.toolSays)));
          }),

          panel('disc-close', t('stem.citylab.disc_close_title', 'Before you argue about it'),
            h('p', { className: 'text-[0.6875rem]', style: { color: dim } },
              t('stem.citylab.disc_close', 'A useful move in any of these: work out which parts of the disagreement are about facts nobody has pinned down, and which are about what people think matters. Those are different arguments, and mixing them up is why planning meetings run long. The Assumption Lab handles the first kind. Nothing handles the second kind except people talking to each other.')),
            h('button', {
              type: 'button', onClick: function () { setTab('history'); },
              className: 'text-[0.625rem] font-bold underline mt-1.5 block', style: { color: linkColour, minHeight: '24px' }
            }, t('stem.citylab.disc_to_history', 'These are present-tense questions. The History tab is the other thing: places where the argument already happened.'))));
      }

      function historyPanel() {
        function field(label, text, tone) {
          return h('div', { className: 'mt-1.5' },
            h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wide',
              style: { color: tone || dim } }, label),
            h('p', { className: 'text-[0.6875rem]', style: { color: ink } }, text));
        }
        return h('div', null,
          panel('hist-intro', t('stem.citylab.hist_intro_title', 'Places that actually exist'),
            h('div', null,
              h('p', { className: 'text-[0.6875rem] mb-2', style: { color: ink } },
                t('stem.citylab.hist_intro', 'Riverbend, Mesa Hollow and Harborlight are invented. Everything on this tab is not. These are things that were done, written down at the time, and kept.')),
              // The adjacency guard, stated once and hard, at the top.
              h('div', { className: 'rounded p-2',
                style: { background: onDark ? 'rgba(235,104,52,0.12)' : 'rgba(235,104,52,0.09)',
                  borderLeft: '4px solid ' + missColour } },
                h('p', { className: 'text-[0.6875rem] font-bold', style: { color: ink } },
                  t('stem.citylab.read_this_before_the_rest', 'Read this before the rest.')),
                h('p', { className: 'text-[0.6875rem] mt-1', style: { color: ink } },
                  t('stem.citylab.hist_guard', 'This is history sitting next to a simulation, and that is a trap. Nothing you did in the Design tab models any of what follows. The tool cannot tell you why these things happened, what they caused, or what should have been done instead. It counts hectares. Each entry below separates what is on the record from what people argue about, and the line between those two is the most important thing on this tab.'))))),

          CASE_STUDIES.map(function (c) {
            return panel('hist-' + c.id, c.title,
              h('div', null,
                h('p', { className: 'text-[0.625rem] uppercase tracking-wide font-bold',
                  style: { color: dim } }, fmt(t('stem.citylab.place_period', '{place}, {period}'), { place: c.place, period: c.period })),
                field(t('stem.citylab.hist_what', 'What is on the record'), c.what, okColour),
                field(t('stem.citylab.hist_record', 'Where the record is'), c.record),
                field(t('stem.citylab.hist_contested', 'What is argued about'), c.contested, missColour),
                h('p', { className: 'text-[0.6875rem] mt-2 rounded p-1.5',
                  style: { color: ink, background: softBlue } },
                  h('strong', null, t('stem.citylab.and_the_tool_you_just_used', 'And the tool you just used: ')), c.toolSays)));
          }),

          panel('hist-close', t('stem.citylab.hist_close_title', 'What to do with this'),
            h('div', { className: 'text-[0.6875rem] space-y-2', style: { color: dim } },
              h('p', null, t('stem.citylab.hist_close_1', 'The archives are open. The maps and the descriptions are scanned and searchable, the statutes are published, and many cities have their own sheet. Looking up a real place is a better exercise than reading a summary of it, including this one.')),
              h('p', null, t('stem.citylab.hist_close_2', 'A question worth carrying back to the Design tab: every one of these began as somebody drawing a line on a map and being sure they were improving things. You have spent this session doing exactly that, with a scorecard telling you how well it was going.')))));
      }

      function classPanel() {
        var summary = classSummary(classSet, plan.scenarioId, plan.assumptionSetId);

        function bar(label, count, note) {
          var share = summary.n ? (count / summary.n) * 100 : 0;
          return h('div', { key: label, className: 'mb-1.5' },
            h('div', { className: 'flex items-baseline justify-between gap-2 text-[0.6875rem]' },
              h('span', { style: { color: ink } }, label),
              h('span', { className: 'font-bold tabular-nums', style: { color: ink } },
                fmt(t('stem.citylab.count_of_n', '{count} of {n}'), { count: count, n: summary.n }))),
            h('div', { 'aria-hidden': 'true', className: 'h-1.5 rounded mt-0.5',
              style: { background: onDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' } },
              h('div', { className: 'h-1.5 rounded',
                style: { width: share + '%', background: '#1f5eb0' } })),
            note ? h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: dim } }, note) : null);
        }

        return h('div', null,
          panel('class-load', t('stem.citylab.class_load_title', 'Read a set of plans together'),
            h('div', null,
              h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
                t('stem.citylab.class_load_intro', 'Load the plan JSON files your students exported. Everything happens on this machine: nothing is uploaded, and the set is held in memory only, so closing the tool clears it rather than leaving a class set on a shared computer.')),
              h('div', { className: 'flex flex-wrap gap-2 items-center' },
                h('label', {
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded cursor-pointer',
                  style: { background: '#1f5eb0', color: '#ffffff' }
                }, t('stem.citylab.add_plan_files', 'Add plan files'),
                  h('input', {
                    type: 'file', accept: '.json,application/json', multiple: true, className: 'sr-only',
                    onChange: function (e) {
                      var files = Array.prototype.slice.call(e.target.files || []);
                      e.target.value = '';
                      if (!files.length || !window.FileReader) return;
                      var loaded = [], failedCount = 0, done = 0;
                      files.forEach(function (file) {
                        var reader = new window.FileReader();
                        reader.onload = function () {
                          var res = importPlan(String(reader.result));
                          if (res.ok) {
                            loaded.push({ code: file.name.replace(/\.json$/i, '').slice(0, 40), plan: res.plan });
                          } else failedCount++;
                          if (++done === files.length) finish();
                        };
                        reader.onerror = function () { failedCount++; if (++done === files.length) finish(); };
                        reader.readAsText(file);
                      });
                      function finish() {
                        setClassSet(function (prev) { return prev.concat(loaded); });
                        var note = fmt(failedCount
                          ? t('stem.citylab.class_loaded_some', 'Plans loaded: {n}. Files that could not be read: {bad}.')
                          : t('stem.citylab.class_loaded', 'Plans loaded: {n}.'), { n: loaded.length, bad: failedCount });
                        setClassNote(note);
                        announceToSR(note);
                      }
                    }
                  })),
                classSet.length ? h('button', {
                  type: 'button',
                  onClick: function () {
                    setClassSet([]); setClassNote(__alloT('stem.citylab.sr_class_set_cleared', 'Class set cleared.'));
                    announceToSR(__alloT('stem.citylab.sr_class_set_cleared', 'Class set cleared.'));
                  },
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: 'transparent', color: missColour, borderColor: missColour }
                }, t('stem.citylab.clear_the_set', 'Clear the set')) : null,
                classSet.length ? h('button', {
                  type: 'button',
                  onClick: function () {
                    download(scen.id + '-class.csv',
                      classCsv(classSet, plan.scenarioId, plan.assumptionSetId),
                      'text/csv;charset=utf-8');
                    announceToSR(__alloT('stem.citylab.sr_class_csv_downloaded', 'Class CSV downloaded.'));
                  },
                  className: 'text-[0.6875rem] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, t('stem.citylab.download_class_csv', 'Download class CSV')) : null),
              classNote ? h('p', { className: 'text-[0.6875rem] mt-2', style: { color: dim } }, classNote) : null,
              summary.otherTown
                ? h('p', { className: 'text-[0.6875rem] mt-1', style: { color: missColour } },
                    fmt(t('stem.citylab.class_other_town', 'Loaded plans for a different town, not counted here: {n}. Switch town at the top to read them.'), { n: summary.otherTown }))
                : null)),

          summary.n === 0 ? null : panel('class-req', fmt(t('stem.citylab.class_req_title', 'What the class found hard, in {town}'), { town: summary.town }),
            h('div', null,
              h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
                fmt(t('stem.citylab.class_req_note', 'n = {n}. Each bar is how many plans met that requirement.'), { n: summary.n })),
              summary.perRequirement.map(function (r) {
                return bar((r.hard ? t('stem.citylab.required_prefix', 'Required. ') : t('stem.citylab.target_prefix', 'Target. ')) + r.label, r.met);
              }))),

          summary.n === 0 ? null : panel('class-trade', t('stem.citylab.class_trade_title', 'What they gave up'),
            summary.enoughToShowSignals
              ? h('div', null,
                  h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
                    t('stem.citylab.class_trade_note', 'The discussion starter. Two plans that both meet the brief can give up completely different things, and that is the conversation worth having.')),
                  bar(t('stem.citylab.class_farmland', 'Converted farmland'), summary.tradeOffs.farmland),
                  bar(t('stem.citylab.class_preserve', 'Built on protected land'), summary.tradeOffs.preserve),
                  bar(fmt(t('stem.citylab.class_flood', 'Put new homes in {zone}'), { zone: scen.floodLabel }), summary.tradeOffs.floodplain),
                  bar(t('stem.citylab.class_over_bond', 'Went over the bond'), summary.tradeOffs.overBudget),
                  bar(t('stem.citylab.class_no_park', 'Left homes without a park nearby'), summary.tradeOffs.parkAccess))
              : h('p', { className: 'text-[0.6875rem]', style: { color: dim } },
                  fmt(t('stem.citylab.class_withheld', 'Held back until at least {min} plans are loaded. n = {n}. With fewer than that, a distribution is a description of individuals.'),
                    { min: summary.minN, n: summary.n }))),

          summary.n === 0 ? null : panel('class-process', t('stem.citylab.class_process_title', 'How they worked'),
            h('div', null,
              bar(t('stem.citylab.class_ran_lab', 'Ran the Assumption Lab'), summary.ranLab,
                t('stem.citylab.class_ran_lab_note', 'The mode the whole design rests on. Worth knowing who never opened it.')),
              bar(t('stem.citylab.class_memo', 'Wrote the memo'), summary.memoDone),
              bar(t('stem.citylab.class_challenge', 'Took the limited-move challenge'), summary.usedChallenge),
              summary.enoughToShowSignals && Object.keys(summary.bindingChoice).length
                ? h('div', { className: 'mt-2' },
                    h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
                      t('stem.citylab.which_constraint_they_named_as_binding', 'Which constraint they named as binding')),
                    h('ul', { className: 'text-[0.6875rem] list-disc pl-4', style: { color: dim } },
                      Object.keys(summary.bindingChoice).map(function (k) {
                        return h('li', { key: k }, fmt(t('stem.citylab.label_value', '{label}: {value}'), { label: requirementLabel(k, plan), value: summary.bindingChoice[k] }));
                      })))
                : null,
              h('p', { className: 'text-[0.625rem] mt-2', style: { color: dim } },
                t('stem.citylab.class_privacy', 'The memo text itself is never read here and never leaves in the CSV. Student writing can contain names, so only whether a memo exists and which constraint was picked from the list are counted.')))),

          summary.n === 0 ? null : classHeatTransitPanel(summary, bar),

          panel('class-stance', t('stem.citylab.class_stance_title', 'What this screen is not'),
            h('p', { className: 'text-[0.6875rem]', style: { color: dim } },
              t('stem.citylab.class_stance', 'This reports whether a plan meets stated constraints. It does not evaluate whether a plan is good, it does not rank students, and there is no answer key to compare against. Two plans can both meet every requirement and be completely different, which is the point rather than a problem.'))));
      }

      // Stage C: heat, transit and the hearing in the class view. MEASURED
      // facts only (counts of what each plan did, walk-shed shares); the
      // modelled surface heat is deliberately not aggregated, and the
      // hearing's prose is never read.
      function classHeatTransitPanel(summary, bar) {
        var ht = summary.heatTransit;
        var stakeKeys = Object.keys(summary.stakeholderChoice || {});
        var th = function (key, label) { return h('th', { key: key, scope: 'col', className: 'text-right px-1' }, label); };
        return panel('class-heat-transit', t('stem.citylab.class_ht_title', 'Heat, bus stops and the hearing'),
          h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: dim } },
              fmt(t('stem.citylab.class_ht_note', 'n = {n}. Measured only: counts of what each plan did and who can walk to a stop. Surface heat itself is modelled, so it is not added up here.'), { n: summary.n })),
            bar(t('stem.citylab.class_ht_heat_action', 'Added cool roofs or green infrastructure anywhere'), ht.heatAction),
            bar(t('stem.citylab.class_ht_new_homes_cooled', 'Gave every parcel of new homes a cool roof or green infrastructure'), ht.newHomesCovered),
            bar(t('stem.citylab.class_ht_any_stop', 'Put at least one bus stop where a road reaches it'), ht.anyStop),
            bar(fmt(t('stem.citylab.class_ht_all_stop', 'Every home a road reaches is within a {min}-minute walk of a stop'), { min: TRANSIT_WALK_MINUTES }), ht.allStop),
            bar(t('stem.citylab.class_ht_hearing_started', 'Chose a stakeholder to answer at the hearing'), ht.hearingStarted),
            bar(t('stem.citylab.class_ht_hearing_done', 'Completed the hearing: the objection, an answer, and a number that stakeholder watches'), ht.hearing),
            summary.enoughToShowSignals && stakeKeys.length
              ? h('div', { className: 'mt-2' },
                  h('div', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: ink } },
                    t('stem.citylab.class_ht_stakeholders', 'Whose objection they chose to answer')),
                  h('ul', { className: 'text-[0.6875rem] list-disc pl-4', style: { color: dim } },
                    stakeKeys.map(function (k) {
                      var sh = stakeholderById(k, summary.scenarioId);
                      return h('li', { key: k }, fmt(t('stem.citylab.label_value', '{label}: {value}'), { label: sh ? sh.name : k, value: summary.stakeholderChoice[k] }));
                    })))
              : null,
            h('div', { className: 'overflow-x-auto mt-2' },
              h('table', { className: 'w-full text-[0.625rem]', style: { color: ink } },
                h('caption', { className: 'text-left text-[0.6875rem] font-bold mb-1', style: { color: ink } },
                  t('stem.citylab.class_ht_table_caption', 'Plan by plan, in the order loaded (measured facts, not a ranking)')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'text-left px-1' }, t('stem.citylab.class_ht_col_plan', 'Plan')),
                  th('roofs', t('stem.citylab.class_ht_col_roofs', 'Cool roofs')),
                  th('gi', t('stem.citylab.class_ht_col_gi', 'Green infrastructure')),
                  th('cooled', t('stem.citylab.class_ht_col_cooled', 'New-home parcels cooled')),
                  th('stops', t('stem.citylab.class_ht_col_stops', 'Bus stops reached')),
                  th('walk', t('stem.citylab.class_ht_col_walk', 'Homes near a stop')),
                  th('hearing', t('stem.citylab.class_ht_col_hearing', 'Hearing answered')))),
                h('tbody', null, summary.rows.map(function (r, i) {
                  return h('tr', { key: i },
                    h('th', { scope: 'row', className: 'text-left font-normal px-1' }, r.code),
                    h('td', { className: 'text-right tabular-nums px-1' }, r.coolRoofParcels),
                    h('td', { className: 'text-right tabular-nums px-1' }, r.greenInfraParcels),
                    h('td', { className: 'text-right tabular-nums px-1' }, fmt(t('stem.citylab.count_of_n', '{count} of {n}'), { count: r.newHomesCovered, n: r.newHomeParcels })),
                    h('td', { className: 'text-right tabular-nums px-1' }, r.busStops),
                    h('td', { className: 'text-right tabular-nums px-1' }, fmtPct(r.transitAccessPct)),
                    h('td', { className: 'text-right px-1' }, r.hearingPresent ? t('stem.citylab.yes', 'Yes') : t('stem.citylab.no', 'No')));
                }))))));
      }

      function aboutPanel() {
        return h('div', null,
          panel('about-1', t('stem.citylab.about_title', 'What this tool does and does not do'),
            h('div', { className: 'text-[0.6875rem] space-y-2', style: { color: dim } },
              h('p', null, fmt(t('stem.citylab.about_frozen', '{town} does not grow, tick, or keep score. It is frozen. Every number you see is computed from the plan exactly as it stands, which means you can undo any change and get exactly the number you had before.'), { town: scen.town })),
              h('p', null, h('strong', { style: { color: ink } }, t('stem.citylab.measured_numbers', 'Measured numbers ')),
                t('stem.citylab.about_measured', 'are counts, areas and distances over the plan you drew. There is nothing to disagree with in them and no assumption can move them.')),
              h('p', null, h('strong', { style: { color: ink } }, t('stem.citylab.modelled_numbers', 'Modelled numbers ')),
                t('stem.citylab.about_modelled', 'come from a published formula with parameters that reasonable people put at different values. Every one of them opens to show the formula, the parameters, where the range comes from, and the honest caveat about what the formula cannot tell you.')),
              h('p', null, h('strong', { style: { color: ink } }, t('stem.citylab.some_things_are_missing_on_purpose', 'Some things are missing on purpose. ')),
                t('stem.citylab.about_missing', 'What a plan does to rents, to who ends up living where, to jobs, to property values, to crime, or to schools is genuinely contested among people who study it for a living. A simulation that printed a rent number would be handing you a disputed claim in the most convincing form there is: a number you produced yourself. So this tool does not print one. Those questions are real and they belong in the discussion, in the documented history of how places were actually planned, and in the arguments people have at real planning board meetings.')),
              h('p', null, t('stem.citylab.about_walk', 'The walk distances are measured along streets and paths, not in a straight line. A parcel on the far bank of the river with no bridge is not two hundred metres away. It is unreachable, and the tool says so.')),
              h('p', null, t('stem.citylab.about_access', 'A road serves the parcels it runs into. A road on the next parcel does not count, for homes or for walking, because both are measured along the same links.')),
              h('p', null, t('stem.citylab.about_heat', 'The Heat view and the surface heat numbers are modelled: how much hotter roofs and pavement get than shaded, planted ground on a summer afternoon, from published ranges. Cool roofs and green infrastructure lower them. They are not air temperature and say nothing about anyone\'s health.')),
              h('p', null, t('stem.citylab.about_access_view', 'The Access gaps view is measured: for every home a road reaches, which of a park, a bus stop and a school or clinic is out of walking range. It counts homes. It is not a score for the plan, and it does not know who lives in them.')),
              h('p', null, t('stem.citylab.about_predict', 'Every few changes, and before every change if you choose, a change waits for your prediction before it is applied: pick a number, say which way it will move and roughly how far, then see what happened. Predictions are never scored.')),
              h('p', null, t('stem.citylab.about_xp_v2', 'XP is awarded once each for things the model can check: pressing Check my plan when a plan built here meets every required part of a town\'s brief, testing a plan in the Assumption Lab, submitting a memo with evidence, and completing a mission without the "one way" reveal. Nothing in the contested tier earns XP, because it has no numbers to check.')),
              h('p', null, t('stem.citylab.about_xp_hearing', 'The hearing earns XP once per town, when the objection you answer comes from one of the two stakeholders and your answer cites a number that stakeholder watches.')))),
          panel('about-sources', t('stem.citylab.about_sources_title', 'Where the numbers come from'),
            h('div', { className: 'text-[0.6875rem] space-y-1', style: { color: dim } },
              sourceNote('runoff'), sourceNote('area'), sourceNote('gi'), sourceNote('storm'), sourceNote('cost'),
              sourceNote('population'), sourceNote('water'), sourceNote('sea'),
              sourceNote('heat'), sourceNote('imperv'), sourceNote('transit'))),
          panel('about-2', t('stem.citylab.about_keyboard_title', 'Keyboard and screen reader'),
            h('ul', { className: 'text-[0.6875rem] list-disc pl-4 space-y-1', style: { color: dim } },
              h('li', null, t('stem.citylab.about_kb_grid', 'Every parcel is a real button. The map is one stop on the Tab key: Tab into it, use the arrow keys to move, and press Enter or Space to select a parcel, then use the inspector below the map.')),
              h('li', null, t('stem.citylab.about_kb_table', 'The parcel table is not a summary. It is the same plan, fully editable, and any plan you can build on the map you can build in the table.')),
              h('li', null, t('stem.citylab.every_change_is_announced_with_what_mo', 'Every change is announced with what moved, not just what you did.')),
              h('li', null, t('stem.citylab.about_kb_predict', 'When a change is waiting for your prediction, its new numbers are not announced until you answer.')),
              h('li', null, t('stem.citylab.land_use_is_shown_by_a_two_letter_code', 'Land use is shown by a two-letter code and a fill pattern as well as colour.')),
              h('li', null, t('stem.citylab.about_kb_describe_v2', 'Describe the map row by row, under the map, reads out every row of whichever lens is showing, on the map and on the 3D board.')),
              h('li', null, t('stem.citylab.about_kb_sound', 'Listen to the requirements plays one tone per requirement: higher means more room left, and a buzzy tone means not met. Listen to a row plays the selected row from west to east as pitch. Sound only starts when you press a button, and everything it says is also written on screen.')),
              h('li', null, t('stem.citylab.there_are_no_timers_anywhere_in_this_t', 'There are no timers anywhere in this tool.')))),
          panel('about-3', t('stem.citylab.about_links_title', 'Take this somewhere'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              [{ id: 'gisStudio', icon: '🌐', tool: t('stem.citylab.link_gis', 'GIS Studio'),
                 why: t('stem.citylab.link_gis_why', 'Analyse a place that actually exists, with real imported data, and compare it to what you designed.') },
               { id: 'bridgeLab', icon: '🌉', tool: t('stem.citylab.link_bridge', 'Bridge Engineering Lab'),
                 why: t('stem.citylab.link_bridge_why', 'That river crossing costs 2.8 million dollars for a reason. Find out what is holding it up.') },
               { id: 'stewardshipHub', icon: '♻️', tool: t('stem.citylab.link_stewardship', 'Environmental Stewardship'),
                 why: t('stem.citylab.link_stewardship_why', 'The watershed campaigns pick up exactly where the runoff model here stops.') },
               { id: 'archStudio', icon: '🏗️', tool: t('stem.citylab.link_arch', 'Architecture Studio'),
                 why: t('stem.citylab.link_arch_why', 'You zoned the parcel. Now design what actually stands on it.') }
              ].map(function (b) {
                return h('button', {
                  key: b.id, type: 'button',
                  'aria-label': fmt(t('stem.citylab.link_aria', 'Open {tool}. {why}'), { tool: b.tool, why: b.why }),
                  onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(b.id); },
                  className: 'text-left rounded-lg p-2.5 border',
                  style: { background: panelBg, borderColor: panelBorder }
                },
                  h('span', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                    h('span', { className: 'text-[0.6875rem] font-black', style: { color: ink } }, b.tool)),
                  h('span', { className: 'block text-[0.6875rem] mt-1', style: { color: dim } }, b.why));
              }))));
      }

      // ---- W3: the first-two-minutes coach ---------------------------------
      // In the flow of the board, three steps, every one done by the STUDENT:
      // the coach never edits the plan, never awards XP, and only reads what
      // the model already says. Closing it (or finishing) is remembered in
      // toolData, so it shows once; Options can bring it back.
      function reopenCoach() {
        setCoachStep(1); setCoachInfo(null); setOptionsOpen(false);
        pendingFocusRef.current = 'citylab-coach-title';
      }
      function closeCoach() {
        setCoachStep(0); setCoachInfo(null);
        if (!d.coachOff) upd({ coachOff: true });
        pendingFocusRef.current = 'citylab-options-toggle';
        announceToSR(t('stem.citylab.sr_coach_closed', 'Coach closed. You can open it again from Options.'));
      }
      function finishCoach() {
        setCoachStep(0); setCoachInfo(null);
        var patch = { coachOff: true };
        var toBrief = teacher.level === 'brief';
        if (!teacher.level && level !== 'missions') patch.level = 'missions';
        upd(patch);
        pendingFocusRef.current = toBrief ? 'citylab-brief-title' : 'citylab-missions-title';
      }
      function coachUndo() {
        undo();
        setCoachInfo(null);
        setCoachStep(2);
        // The Undo button leaves with step 3: focus goes to the card, not the page.
        pendingFocusRef.current = 'citylab-coach-title';
      }
      function coachStepTitle(n) {
        if (n === 1) return t('stem.citylab.coach1_title', 'Pick a field that touches a road');
        if (n === 2) return t('stem.citylab.coach2_title', 'Build homes and watch people arrive');
        return t('stem.citylab.coach3_title_v2', 'Roofs shed rain: watch the outlet gauge');
      }
      function coachCard() {
        if (!coachStep) return null;
        var n = coachStep, body = [], actions = [];
        // The 3D board has a palette; the map has its parcel box below it.
        var on3d = stageLive;
        if (n === 1) {
          body.push(coachFieldIds.length
            ? fmt(on3d
              ? t('stem.citylab.coach1_body', 'Homes only count where a road runs in. Each field with a yellow frame has one: click one with Inspect, or move to one on the map with the arrow keys. They are {list}.')
              : t('stem.citylab.coach1_body_map', 'Homes only count where a road runs in. Each field with a yellow frame has one: tap or click one, or move to one with the arrow keys. They are {list}.'),
              { list: coachFieldIds.join(', ') })
            : (on3d
              ? t('stem.citylab.coach1_none', 'No field has a road running into it yet. Pick Road, click a parcel on a street, then click the field next to it.')
              : t('stem.citylab.coach1_none_map', 'No field has a road running into it yet. Select a field next to a street, and build a road into it in the parcel box below the map.')));
        } else if (n === 2) {
          body.push(fmt(on3d
            ? t('stem.citylab.coach2_body', 'Pick Housing, low density or Housing, mid density, then click {parcel}. On the map, press 5 or 6. Each figure that walks in stands for 12 homes a road reaches.')
            : t('stem.citylab.coach2_body_map', 'In the box for {parcel} below the map, choose Housing, low density or Housing, mid density. On the map, the keys 5 and 6 do the same. In the 3D view, each figure that walks in stands for 12 homes a road reaches.'),
            { parcel: selected }));
        } else {
          var ci = coachInfo || { homes: 0, figures: 0, cFrom: sc.tier2.runoffCoefficient, cTo: sc.tier2.runoffCoefficient };
          var figN = Math.max(0, ci.figures);
          body.push(fmt(figN === 1
            ? t('stem.citylab.coach3_homes_one', '{homes} more homes are reached by a road, so one more people figure walks there.')
            : t('stem.citylab.coach3_homes', '{homes} more homes are reached by a road, so {figures} more people figures walk there.'),
            { homes: ci.homes, figures: figN }));
          body.push(fmt(t('stem.citylab.coach3_runoff', 'Roofs and paving shed rain that a field would soak up. How much rain runs off the land (the runoff coefficient C) went from {from} to {to}.'),
            { from: ci.cFrom.toFixed(3), to: ci.cTo.toFixed(3) }));
          // W4: the gauge the step is named for, in the Rain and runoff lens.
          body.push(fmt(t('stem.citylab.coach3_gauge', 'The outlet gauge in the Rain and runoff lens shows what that does to the whole town: peak runoff is {q} cubic metres a second, against {base} for the town as it was.'),
            { q: sc.tier2.peakRunoffQ.toFixed(2), base: sc.tier2.baselineRunoffQ.toFixed(2) }));
          var toBrief = teacher.level === 'brief';
          body.push(toBrief ? t('stem.citylab.coach3_next_brief', 'Next: the planning board\'s brief.')
            : fmt(t('stem.citylab.coach3_next', 'Next: Mission 1, {title}.'), { title: missionCopy('m_park', plan).title }));
          actions.push(smallBtn(toBrief ? t('stem.citylab.coach_to_brief', 'See the brief') : t('stem.citylab.coach_to_mission', 'Start Mission 1'),
            finishCoach, { primary: true, key: 'go' }));
          if (hist.past.length) actions.push(smallBtn(t('stem.citylab.coach_undo', 'Undo the homes'), coachUndo, { key: 'undo' }));
          // A button, never an automatic switch (DECISIONS #8): it changes the
          // lens only, and focus goes to the gauge it names.
          if (lens !== 'rain') {
            actions.push(smallBtn(t('stem.citylab.coach_gauge', 'Show the outlet gauge'), function () {
              chooseLens('rain');
              pendingFocusRef.current = 'citylab-outlet-gauge';
            }, { key: 'gauge' }));
          }
        }
        var stepWord = fmt(t('stem.citylab.coach_step', 'step {n} of 3'), { n: n });
        return h('section', {
          'aria-labelledby': 'citylab-coach-title', 'data-citylab-coach': String(n),
          className: 'rounded-lg border mb-2 ' + (narrowUi ? 'p-2' : 'p-2.5'),
          style: { background: softBlue, borderColor: '#1f5eb0' },
          onKeyDown: function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCoach(); } }
        },
          // W6: the coach and the strip share this one slot. While the coach
          // runs, the folded strip is a button beside Close, not a box of its own.
          h('div', { className: 'flex items-start justify-between gap-2' },
            h('h3', { id: 'citylab-coach-title', tabIndex: -1, className: 'text-[0.75rem] font-black', style: { color: ink, flex: '1 1 8rem', minWidth: 0 } },
              fmt(t('stem.citylab.coach_heading', 'Coach, {step}: {title}'), { step: stepWord, title: coachStepTitle(n) })),
            h('div', { className: 'flex flex-wrap justify-end gap-1.5', style: { flex: '0 1 auto' } },
              stripSlotChip(),
              h('button', {
                type: 'button', onClick: closeCoach, 'data-citylab-coach-close': 'true',
                'aria-label': t('stem.citylab.coach_close_aria', 'Close the coach. You can open it again from Options.'),
                className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
                style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' }
              }, t('stem.citylab.coach_close', 'Close')))),
          body.map(function (line, i) {
            return h('p', { key: i, className: (narrowUi ? 'text-[0.6875rem]' : 'text-[0.75rem]') + ' mt-1', style: { color: ink } }, line);
          }),
          // Polite, and only the step: it speaks when the student's own action
          // moves the coach on, without taking focus from the board.
          h('p', { className: 'sr-only', role: 'status', 'data-citylab-coach-status': 'true' },
            fmt(t('stem.citylab.coach_status', 'Coach, {step}: {title}.'), { step: stepWord, title: coachStepTitle(n) })),
          actions.length ? h('div', { className: 'flex flex-wrap gap-1.5 mt-2' }, actions) : null);
      }

      // ---- W5 (2026-11-04): the mission strip, above the board on both
      // boards and in every band (it absorbs W3's K-5 mission numbers). Its
      // rows are the Missions box's own sentences and judging (judgeCond: the
      // student's set AND the central one), live. A result, a celebration
      // and XP only ever come from Check my plan.
      function logCelebration(kind, mid) {
        CITY_CELEBRATIONS.push({ kind: kind, mid: mid, town: plan.scenarioId });
        if (CITY_CELEBRATIONS.length > 50) CITY_CELEBRATIONS.shift();
      }
      function cueAudio() {
        var a = cueAudioRef.current;
        return a && a.state !== 'closed' ? a : null;
      }
      function makeCueAudio() {
        var AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        var a = null;
        try { a = AC ? new AC() : null; } catch (_) { a = null; }
        cueAudioRef.current = a;
        return a;
      }
      function closeCueAudio() {
        var a = cueAudioRef.current;
        cueAudioRef.current = null;
        if (a && typeof a.close === 'function') { try { a.close(); } catch (_) {} }
      }
      // The first press or key anywhere in the tool after Sounds is on makes
      // the context (browsers only start audio from a gesture).
      function cueGesture() { if (d.soundOn && !cueAudio()) makeCueAudio(); }
      var CUE_TONES = { row: [660], pass: [523, 659, 784], on: [587] };
      function playCue(kind, acIn) {
        if (!acIn && !d.soundOn) return false;
        var ac = acIn || cueAudio();
        if (!ac || typeof ac.createOscillator !== 'function') return false;
        try {
          var t0 = (ac.currentTime || 0) + 0.02;
          (CUE_TONES[kind] || []).forEach(function (f, i) {
            var osc = ac.createOscillator(), g = ac.createGain(), at = t0 + i * 0.12;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, at);
            g.gain.setValueAtTime(0.0001, at);
            g.gain.exponentialRampToValueAtTime(CUE_GAIN, at + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
            osc.connect(g); g.connect(ac.destination);
            osc.start(at); osc.stop(at + 0.18);
          });
        } catch (_) { return false; }
        return true;
      }
      function toggleSound() {
        var on = !d.soundOn;
        upd({ soundOn: on });
        if (on) {
          // This press IS the first gesture with Sounds on.
          var ac = cueAudio() || makeCueAudio();
          playCue('on', ac);
          announceToSR(t('stem.citylab.sr_sound_on', 'Sounds on: a soft tone when a requirement turns met and when a mission passes. Every sound is also written on screen.'));
        } else {
          closeCueAudio();
          announceToSR(t('stem.citylab.sr_sound_off', 'Sounds off.'));
        }
      }
      function showHint(mid, rec, copy) {
        var n = (rec.hints || 0) + 1;
        setMissionRecord(mid, { hints: n });
        // Hunt: the last hint takes its button away: focus goes to Check.
        if (n >= copy.hints.length) pendingFocusRef.current = 'citylab-strip-check';
        announceToSR(fmt(t('stem.citylab.hint_n', 'Hint {n}: {text}'), { n: n, text: copy.hints[n - 1] }));
      }
      function revealOneWay(mid, copy) {
        pendingFocusRef.current = 'citylab-strip-check';
        setMissionRecord(mid, { revealed: true });
        setFlag('missionsRevealed', plan.scenarioId + ':' + mid);
        announceToSR(copy.reveal + ' ' + t('stem.citylab.reveal_no_xp', 'The mission still counts when the model checks it, but it earns no XP now.'));
      }
      function stripReadout(kind) {
        var aSet = SET_BY_ID[plan.assumptionSetId] || SET_BY_ID.central;
        if (kind === 'water') {
          return [
            h('p', { key: 'rule' }, fmt(t('stem.citylab.water_rule', 'Demand = residents x litres per person per day, plus irrigated farmland x its daily draw, plus park land x its daily draw. Straight addition, against a fixed safe yield of {yield} cubic metres per day.'),
              { yield: scen.aquiferYieldM3PerDay.toLocaleString() })),
            h('p', { key: 'rates', className: 'mt-1' }, fmt(t('stem.citylab.water_rates', 'Under {set}: {lpd} litres per person per day, {farm} cubic metres per hectare of farmland, {park} per hectare of park.'),
              { set: aSet.label, lpd: aSet.litresPerPersonPerDay, farm: aSet.farmIrrigationM3PerHaPerDay, park: aSet.parkIrrigationM3PerHaPerDay }))];
        }
        return [
          h('p', { key: 'sum' }, fmt(t('stem.citylab.cost_sum', 'A sum of unit costs times quantities, scaled by {s} under {set}.'), { s: aSet.costScale.toFixed(2), set: aSet.label })),
          sc.costLines.length
            ? h('ul', { key: 'lines', className: 'mt-1 list-disc pl-4' }, sc.costLines.map(function (l) {
                return h('li', { key: l.id }, fmt(l.note
                  ? t('stem.citylab.cost_line_note', '{label}: {qty} x {unit} = {total} ({note})')
                  : t('stem.citylab.cost_line', '{label}: {qty} x {unit} = {total}'),
                  { label: l.label, qty: l.qty, unit: fmtMoney(l.unitCost), total: fmtMoney(l.total), note: l.note }));
              }))
            : h('p', { key: 'none', className: 'mt-1' }, t('stem.citylab.nothing_built_yet', 'Nothing built yet.'))];
      }
      // ---- W6: the strip's shared parts, for a mission and for the full
      // brief. Each row of buttons is a toolbar: ONE tab stop (its first
      // button, or the one last used), and the arrow keys move along it.
      function stripRoveKeyDown(e) {
        var k = e.key;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(k) === -1) return;
        var items = Array.prototype.slice.call(e.currentTarget.querySelectorAll('[data-citylab-rove]'));
        var i = items.indexOf(document.activeElement);
        if (i === -1) return;
        var nx = k === 'Home' ? 0 : k === 'End' ? items.length - 1
          : (k === 'ArrowLeft' || k === 'ArrowUp') ? (i - 1 + items.length) % items.length : (i + 1) % items.length;
        e.preventDefault();
        items[nx].focus();
      }
      // The button last used keeps the toolbar's one tab stop.
      function stripRoveFocus(e) {
        var items = e.currentTarget.querySelectorAll('[data-citylab-rove]');
        if (Array.prototype.indexOf.call(items, e.target) === -1) return;
        Array.prototype.forEach.call(items, function (b) { b.tabIndex = b === e.target ? 0 : -1; });
      }
      function stripButtons() {
        var barFirst = {};
        return function (label, onClick, o) {
          o = o || {};
          var on = !!(o.primary || o.pressed), bar = o.bar || 'acts';
          var first = !barFirst[bar];
          barFirst[bar] = true;
          return h('button', Object.assign({
            key: o.key, type: 'button', onClick: onClick, 'data-citylab-rove': 'true', tabIndex: first ? 0 : -1,
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: on ? '#1f5eb0' : panelBg, color: on ? '#ffffff' : ink,
              borderColor: on ? '#1f5eb0' : panelBorder, minHeight: '44px', minWidth: '44px' }
          }, o.attrs || {}), label);
        };
      }
      function stripBar(kind, label, buttons) {
        var list = buttons.filter(Boolean);
        if (!list.length) return null;
        return h.apply(null, ['div', { key: 'bar-' + kind, role: 'toolbar', 'aria-label': label, 'data-citylab-strip-bar': kind,
          className: 'flex flex-wrap items-center gap-1.5', onKeyDown: stripRoveKeyDown, onFocus: stripRoveFocus }].concat(list));
      }
      function stripToggleClick() {
        if (coachStep) setStripPeek(!stripPeek); else upd({ stripClosed: !stripClosedNow });
        // The folded strip can live in the coach's slot: focus follows the button.
        pendingFocusRef.current = 'citylab-strip-toggle';
      }
      function stripTitleOf(kind) {
        return kind === 'mission'
          ? fmt(t('stem.citylab.k5_mission', 'Mission {n}: {title}'), { n: MISSION_IDS.indexOf(stripMid) + 1, title: missionCopy(stripMid, plan).title })
          : fmt(t('stem.citylab.strip_brief_title', 'The full brief for {town}'), { town: scen.town });
      }
      // While the coach runs, a folded strip is this one button in the
      // coach's slot (its heading is there for a screen reader).
      function stripSlotChip() {
        if (!coachStep || !stripClosedNow || !stripKind || (stripKind === 'mission' && !stripStatus)) return null;
        var mid = stripKind === 'mission' ? stripMid : null;
        return h('section', { 'aria-labelledby': 'citylab-strip-title', 'data-citylab-strip': 'closed', 'data-citylab-strip-kind': stripKind,
            'data-citylab-strip-slot': 'coach', 'data-citylab-mission-numbers': mid || undefined, className: 'inline-flex' },
          h('h3', { id: 'citylab-strip-title', className: 'sr-only' }, stripTitleOf(stripKind)),
          h('button', { type: 'button', id: 'citylab-strip-toggle', 'data-citylab-strip-toggle': 'true', 'aria-expanded': 'false',
            onClick: stripToggleClick, className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border',
            style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px', minWidth: '44px' } },
            '▾ ' + (stripKind === 'mission'
              ? fmt(t('stem.citylab.strip_slot_mission', 'Mission {n}'), { n: MISSION_IDS.indexOf(mid) + 1 })
              : t('stem.citylab.strip_slot_brief', 'The brief'))));
      }
      // One header line (title and progress, the actions, then show/hide and
      // the mission arrows), the celebration, then the rows when open.
      function stripSection(o) {
        var header = h('div', { key: 'head', className: 'flex flex-wrap items-center gap-1.5', 'data-citylab-strip-head': 'true' },
          h('h3', { id: 'citylab-strip-title', className: 'text-[0.8125rem] font-black', style: { color: ink, flex: '1 1 12rem', minWidth: 0 } },
            o.title, ' ',
            h('span', { className: 'text-[0.6875rem] font-bold', style: { color: dim } }, o.status)),
          o.actions, o.nav);
        return h('section', { 'aria-labelledby': 'citylab-strip-title', 'data-citylab-strip': o.closed ? 'closed' : 'open',
            'data-citylab-strip-kind': o.kind, 'data-citylab-mission-numbers': o.mid || undefined,
            className: 'rounded-lg border mb-2 ' + (o.closed ? 'px-2 py-1' : 'p-2'), style: { background: panelBg, borderColor: panelBorder } },
          header, o.celBlock,
          o.closed ? null : h.apply(null, ['div', { id: 'citylab-strip-body' }].concat(o.body || [])));
      }
      function stripToggleBtn(sBtn, closed, showLabel, hideLabel) {
        return sBtn((closed ? '▾ ' : '▴ ') + (closed ? showLabel : hideLabel), stripToggleClick,
          { key: 'toggle', bar: 'nav', attrs: { id: 'citylab-strip-toggle', 'data-citylab-strip-toggle': 'true',
            'aria-expanded': closed ? 'false' : 'true', 'aria-controls': closed ? undefined : 'citylab-strip-body' } });
      }
      function celebrateBlock(cel, title, passText, quietText) {
        if (!cel) return null;
        var celebBg = onDark ? 'rgba(27,175,122,0.16)' : 'rgba(18,128,90,0.10)';
        var fxLive = !!(cel.fx && !cel.again && stageLive && motionOn && !staged);
        if (cel.fx) {
          return h('div', { key: 'cel', 'data-citylab-celebrate': fxLive ? 'fireworks' : 'banner',
              className: 'rounded-lg border-2 p-2 mt-2 flex items-start gap-2',
              style: { background: celebBg, borderColor: okColour, color: ink } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '1.25rem', lineHeight: 1, color: okColour } }, '★'),
            h('p', { className: 'text-[0.75rem] font-bold' },
              passText + (fxLive ? ' ' + t('stem.citylab.strip_pass_fx', 'Fireworks over the town mark it.') : '')));
        }
        return h('p', { key: 'cel', 'data-citylab-mission-pass': 'quiet', className: 'text-[0.6875rem] mt-2 font-bold', style: { color: okColour } },
          quietText + ' ' + (cel.why === 'revealed'
            ? t('stem.citylab.reveal_no_xp', 'The mission still counts when the model checks it, but it earns no XP now.')
            : t('stem.citylab.strip_no_xp_imported', 'It counts, but this plan came from a file or from this device, so it earns no XP.')));
      }

      function missionStrip() {
        if (briefStripOn) return briefStrip();
        if (!stripOn || !stripStatus) return null;
        // W6: folded while the coach runs, it is the button in the coach's slot.
        if (coachStep && stripClosedNow) return null;
        var mid = stripMid, idx = MISSION_IDS.indexOf(mid), total = MISSION_IDS.length;
        var copy = missionCopy(mid, plan), rec = missionRecord(mid), st = stripStatus;
        var isCur = mid === stripCur && !rec.done;
        var closed = stripClosedNow;
        var title = stripTitleOf('mission');
        var metN = st.conds.filter(function (c) { return c.met; }).length;
        var statusWord = rec.done ? t('stem.citylab.mission_done', 'Done')
          : (isCur ? t('stem.citylab.mission_current', 'Now') : t('stem.citylab.mission_later', 'Later'));
        var prevMid = MISSION_IDS[(idx - 1 + total) % total], nextMid = MISSION_IDS[(idx + 1) % total];
        var celebBg = onDark ? 'rgba(27,175,122,0.16)' : 'rgba(18,128,90,0.10)';
        var sBtn = stripButtons();
        function goTo(m2) { setStripMid(m2); setRowCue(null); setReadoutOpen(false); }
        var nav = stripBar('nav', t('stem.citylab.strip_nav_bar', 'Missions: show or hide this one, or move to another'), [
          stripToggleBtn(sBtn, closed, t('stem.citylab.strip_show', 'Show the mission'), t('stem.citylab.strip_hide', 'Hide the mission')),
          sBtn([h('span', { key: 'a', 'aria-hidden': 'true' }, '← '), t('stem.citylab.strip_prev', 'Previous')], function () { goTo(prevMid); },
            { key: 'prev', bar: 'nav', attrs: { 'data-citylab-strip-nav': 'prev',
              'aria-label': fmt(t('stem.citylab.strip_prev_aria', 'Previous mission: {title}'), { title: missionCopy(prevMid, plan).title }) } }),
          sBtn([t('stem.citylab.strip_next', 'Next'), h('span', { key: 'a', 'aria-hidden': 'true' }, ' →')], function () { goTo(nextMid); },
            { key: 'next', bar: 'nav', attrs: { id: 'citylab-strip-next', 'data-citylab-strip-nav': 'next',
              'aria-label': fmt(t('stem.citylab.strip_next_aria', 'Next mission: {title}'), { title: missionCopy(nextMid, plan).title }) } })]);

        // The pass, said in words; fireworks over the town only while the
        // 3D board can move, a still banner otherwise (reduced motion, a still
        // board, the map). A pass that earns nothing completes quietly.
        var cel = celebration && celebration.mid === mid ? celebration : null;
        var celBlock = celebrateBlock(cel, copy.title,
          fmt(t('stem.citylab.strip_pass', 'Mission complete: {title}. The model checked your plan under your assumption set and under the central estimates.'), { title: copy.title }),
          fmt(t('stem.citylab.mission_met_note', 'Mission complete: {title}.'), { title: copy.title }));
        // Hints: the Missions box's ladder and its fading rule.
        var hintOK = isCur && (idx < 3 || (rec.checks || 0) > 0);
        var mLens = missionLens(mid, plan);
        // W6: the actions sit on the header line, so a folded strip can still Check.
        var actions = stripBar('actions', t('stem.citylab.strip_act_bar', 'What to do for this mission'), [
          isCur ? sBtn(t('stem.citylab.check_plan', 'Check my plan'), function () { cueGesture(); checkMission(mid, 'strip'); },
            { key: 'check', primary: true, attrs: { id: 'citylab-strip-check', 'data-citylab-strip-check': mid,
              'aria-label': fmt(t('stem.citylab.strip_check_aria', 'Check my plan for {title}'), { title: title }) } }) : null,
          hintOK && (rec.hints || 0) < copy.hints.length
            ? sBtn(fmt(t('stem.citylab.hint_button', 'Show a hint ({n} of {total})'), { n: (rec.hints || 0) + 1, total: copy.hints.length }),
                function () { showHint(mid, rec, copy); }, { key: 'hint', attrs: { 'data-citylab-strip-hint': 'true' } })
            : null,
          isCur && teacher.allowReveal && (rec.checks || 0) >= 2 && !rec.revealed
            ? sBtn(t('stem.citylab.show_one_way', 'Show one way to do it'), function () { revealOneWay(mid, copy); }, { key: 'reveal' })
            : null,
          // A button, never an automatic switch (DECISIONS #8).
          mLens.lens
            ? sBtn(fmt(t('stem.citylab.strip_lens', 'Suggested lens: {lens}'), { lens: lensName(mLens.lens) }),
                function () { if (lens !== mLens.lens) chooseLens(mLens.lens); },
                { key: 'lens', pressed: lens === mLens.lens, attrs: { 'data-citylab-strip-lens': mLens.lens, 'aria-pressed': lens === mLens.lens ? 'true' : 'false' } })
            : null,
          mLens.readout
            ? sBtn(mLens.readout === 'cost'
                ? (readoutOpen ? t('stem.citylab.strip_cost_hide', 'Hide the cost readout') : t('stem.citylab.strip_cost_show', 'Show the cost readout'))
                : (readoutOpen ? t('stem.citylab.strip_water_hide', 'Hide the water readout') : t('stem.citylab.strip_water_show', 'Show the water readout')),
                function () { if (closed) { if (coachStep) setStripPeek(true); else upd({ stripClosed: false }); } setReadoutOpen(!readoutOpen); },
                { key: 'readout', attrs: { 'data-citylab-strip-readout': mLens.readout, 'aria-expanded': readoutOpen && !closed ? 'true' : 'false',
                  'aria-controls': readoutOpen && !closed ? 'citylab-strip-readout' : undefined } })
            : null]);
        var status = fmt(t('stem.citylab.strip_progress', '({status}: {met} of {total} met)'), { status: statusWord, met: metN, total: st.conds.length });
        if (closed) return stripSection({ kind: 'mission', mid: mid, closed: true, title: title, status: status, actions: actions, nav: nav, celBlock: celBlock });

        var cueKey = plan.scenarioId + ':' + mid;
        var rows = h('ul', { key: 'rows', className: 'mt-1.5 space-y-1', 'data-citylab-strip-rows': mid },
          st.conds.map(function (c) {
            var cue = !!(c.met && rowCue && rowCue.key === cueKey && rowCue.ks.indexOf(c.k) !== -1);
            return h('li', { key: c.k, 'data-citylab-strip-row': c.k, 'data-met': c.met ? 'true' : 'false',
              className: 'text-[0.75rem] rounded px-1.5 py-1',
              style: { color: ink, background: softRow, borderLeft: '4px solid ' + (c.met ? okColour : missColour) } },
              h('span', { 'aria-hidden': 'true' }, c.met ? '✔ ' : '○ '),
              fmt(c.met ? t('stem.citylab.strip_row_met', 'Met: {line}') : t('stem.citylab.strip_row_not', 'Not met yet: {line}'), { line: condLine(c) }),
              cue ? h('span', { 'data-citylab-row-cue': c.k, className: 'ml-1 text-[0.625rem] font-black rounded px-1 border',
                style: { color: ink, background: celebBg, borderColor: okColour } }, t('stem.citylab.strip_row_cue', 'Just met')) : null);
          }));
        // What the frames on the model mean, in the scorecard's own count.
        var marksNote = stageLive && stripMarks.kind
          ? h('p', { key: 'marks', className: 'text-[0.6875rem] mt-1', style: { color: dim }, 'data-citylab-strip-marks': String(stripMarks.ids.length) },
              !stripMarks.ids.length
                ? t('stem.citylab.strip_marks_none', 'Nothing this mission counts is built yet, so the model frames no parcels.')
                : (stripMarks.ids.length === 1
                  ? (stripMarks.kind === 'park'
                    ? t('stem.citylab.strip_marks_park_one', 'On the model, a thin green frame marks the one parcel of homes that already has a park within a 5-minute walk.')
                    : t('stem.citylab.strip_marks_homes_one', 'On the model, a thin green frame marks the one parcel whose new homes a road reaches.'))
                  : fmt(stripMarks.kind === 'park'
                  ? t('stem.citylab.strip_marks_park', 'On the model, a thin green frame marks each of the {n} parcels of homes that already have a park within a 5-minute walk.')
                  : t('stem.citylab.strip_marks_homes', 'On the model, a thin green frame marks each of the {n} parcels whose new homes a road reaches.'), { n: stripMarks.ids.length })))
          : null;
        var hintsShown = hintOK && (rec.hints || 0) > 0
          ? h('div', { key: 'hints', className: 'mt-1.5' }, copy.hints.slice(0, rec.hints || 0).map(function (hint, k) {
              return h('p', { key: k, className: 'text-[0.6875rem]', style: { color: ink } },
                fmt(t('stem.citylab.hint_n', 'Hint {n}: {text}'), { n: k + 1, text: hint }));
            }))
          : null;
        var readout = mLens.readout && readoutOpen
          ? h('div', { key: 'readout', id: 'citylab-strip-readout', 'data-citylab-strip-readout-body': mLens.readout,
              className: 'mt-2 rounded border p-2 text-[0.6875rem]', style: { color: ink, borderColor: panelBorder, background: softRow } },
              stripReadout(mLens.readout))
          : null;
        var later = !isCur && !rec.done && stripCur
          ? h('p', { key: 'later', className: 'text-[0.6875rem] mt-2', style: { color: dim } },
              fmt(t('stem.citylab.strip_later', 'Missions open one at a time: finish Mission {n} first.'), { n: MISSION_IDS.indexOf(stripCur) + 1 }))
          : (rec.done && !cel ? h('p', { key: 'done', className: 'text-[0.6875rem] mt-2', style: { color: dim } },
              t('stem.citylab.strip_done', 'Done. The rows show how your plan stands now.')) : null);
        var revealed = isCur && rec.revealed
          ? h('p', { key: 'revealed', className: 'text-[0.6875rem] mt-2 rounded p-1.5', style: { color: ink, background: softBlue } },
              copy.reveal + ' ' + t('stem.citylab.reveal_no_xp', 'The mission still counts when the model checks it, but it earns no XP now.'))
          : null;
        // The last Check, when it fell short: no role here, Check already
        // spoke it once (the Missions box keeps its own status line).
        var note = missionNote && missionNote.mid === mid && !missionNote.met
          ? h('div', { key: 'note', className: 'mt-2', 'data-citylab-strip-result': missionNote.standardOnly ? 'standard_only' : 'not_yet' },
              h('p', { className: 'text-[0.6875rem] font-bold', style: { color: missColour } },
                t('stem.citylab.mission_not_yet', 'Not met yet. Here is what the model sees:')),
              missionNote.standardOnly ? h('p', { className: 'text-[0.6875rem]', style: { color: ink } },
                t('stem.citylab.mission_standard_only', 'Under your own assumption set this plan meets the mission, but it does not count yet: every mission is also checked under the central estimates, and under those it falls short.')) : null,
              missionNote.misconceptions.map(function (m2) {
                var mc = misconceptionCopy(m2);
                return h('p', { key: m2, className: 'text-[0.6875rem] mt-1 rounded p-1.5', style: { color: ink, background: softBlue } },
                  h('strong', null, mc.name + '. '), mc.text);
              }))
          : null;
        // The rows ARE the goal, in the model's numbers (the sentence is in the Missions box).
        return stripSection({ kind: 'mission', mid: mid, closed: false, title: title, status: status, actions: actions, nav: nav, celBlock: celBlock,
          body: [rows, marksNote, hintsShown, revealed, readout, later, note] });
      }

      // ---- W6: the full brief's strip (the 9-12 default). Same pattern and
      // the same gates as a mission: rows judged under the student's set AND
      // the central one (briefJudged), Check my plan is the only door to a
      // celebration and (W7) to the brief's once-per-town XP, and each
      // requirement OFFERS its lens.
      function reqValueText(row, v, met) {
        var fmtAt = function (x, e) {
          if (row.unit === 'ratio') return fmt(t('stem.citylab.fmt_of_today', '{pct}% of today'), { pct: (x * 100).toFixed(e) });
          if (!e) return fmtRequirementValue(row, x);
          if (row.unit === 'money') return fmtMoneyAt(x, e);
          if (row.unit === 'percent') return (x * 100).toFixed(e) + '%';
          if (row.unit === 'hectares') return fmt(t('stem.citylab.fmt_ha', '{n} ha'), { n: x.toFixed(e) });
          if (row.unit === 'water') return fmt(t('stem.citylab.fmt_m3_day', '{n} m3/day'), { n: numAt(x, e) });
          return numAt(x, e);
        };
        return sharpen(fmtAt, v, row.target, met);
      }
      function briefRowLine(r) {
        return fmt(t('stem.citylab.strip_brief_row', '{label}: now {value} ({target}).'), {
          label: r.label, value: reqValueText(r, r.actual, r.ownMet),
          target: fmt(r.floor ? t('stem.citylab.target_at_least', 'at least {v}') : t('stem.citylab.target_at_most', 'at or under {v}'),
            { v: fmtRequirementValue(r, r.target) }) });
      }
      function checkBrief() {
        var bj = briefJudged(plan, report), rows = briefRows(plan, report);
        var unmet = rows.filter(function (r) { return r.hard && !r.met; });
        var standardOnly = !bj.allHardMet && bj.ownAllHardMet;
        setBriefNote({ met: bj.allHardMet, standardOnly: standardOnly, unmet: unmet.map(function (r) { return r.id; }) });
        revealRef.current = '[data-citylab-celebrate],[data-citylab-strip-result]';
        if (bj.allHardMet) {
          // The celebration is Check's alone and only for the student's own plan.
          var fx = briefCelebrates(bj, plan), town = plan.scenarioId;
          // W7: fireworks for the first pass in a town; later passes show the
          // banner (and the tone, which plays only when Sounds are on).
          var again = fx && !!((d.briefFx && d.briefFx[town]) || briefFxRef.current[town]);
          celebTokenRef.current++;
          setCelebration({ mid: 'brief', token: celebTokenRef.current, at: Date.now(), fx: fx, again: again, why: fx ? '' : 'imported' });
          if (fx) { logCelebration(again ? 'pass_again' : 'pass', 'brief'); playCue('pass'); briefFxRef.current[town] = true; }
          // W7: what the plan meeting the brief used to do by itself waits for
          // this Check: the path tick, the quest flag (own plan only) and the
          // brief's XP (once per town; briefXpEligible refuses imported plans).
          updWith(function (cur) {
            var out = { briefPassed: Object.assign({}, cur.briefPassed || {}) };
            out.briefPassed[town] = true;
            if (fx) { out.briefFx = Object.assign({}, cur.briefFx || {}); out.briefFx[town] = true; out.metAllHard = true; }
            return out;
          });
          if (briefXpEligible(plan)) awardOnce(xpId('brief', town), XP_POINTS.brief, t('stem.citylab.xp_brief', 'Met every required part of a town brief'));
          announceToSR(fmt(t('stem.citylab.sr_brief_checked', 'Every required part of the {town} brief is met. The model checked your plan under your assumption set and under the central estimates.'), { town: scen.town }));
        } else {
          setCelebration(null);
          announceToSR(t('stem.citylab.sr_mission_not_yet', 'Not met yet.') + ' '
            + (standardOnly ? t('stem.citylab.brief_check_standard_only', 'Under your own assumption set this plan meets every required part, but it does not count yet: the full brief is also checked under the central estimates, and under those it falls short.') + ' ' : '')
            + unmet.map(briefRowLine).join(' '));
        }
      }
      function briefStrip() {
        if (coachStep && stripClosedNow) return null;
        var rows = briefRows(plan, report), closed = stripClosedNow;
        var hard = rows.filter(function (r) { return r.hard; });
        var hardMet = hard.filter(function (r) { return r.met; }).length;
        var title = stripTitleOf('brief');
        var status = fmt(t('stem.citylab.strip_brief_progress', '(Now: {met} of {total} required parts met)'), { met: hardMet, total: hard.length });
        var celebBg = onDark ? 'rgba(27,175,122,0.16)' : 'rgba(18,128,90,0.10)';
        var sBtn = stripButtons();
        var nav = stripBar('nav', t('stem.citylab.strip_brief_nav_bar', 'The brief: show or hide its requirements'), [
          stripToggleBtn(sBtn, closed, t('stem.citylab.strip_brief_show', 'Show the requirements'), t('stem.citylab.strip_brief_hide', 'Hide the requirements'))]);
        var cel = celebration && celebration.mid === 'brief' ? celebration : null;
        var passTitle = fmt(t('stem.citylab.strip_brief_title', 'The full brief for {town}'), { town: scen.town });
        var celBlock = celebrateBlock(cel, passTitle,
          fmt(t('stem.citylab.strip_brief_pass', 'The full brief for {town} is met: every required part, checked under your assumption set and under the central estimates.'), { town: scen.town }),
          fmt(t('stem.citylab.strip_brief_met_quiet', 'Every required part of the {town} brief is met.'), { town: scen.town }));
        var actions = stripBar('actions', t('stem.citylab.strip_brief_act_bar', 'What to do for the brief'), [
          sBtn(t('stem.citylab.check_plan', 'Check my plan'), function () { cueGesture(); checkBrief(); },
            { key: 'check', primary: true, attrs: { 'data-citylab-strip-check': 'brief',
              'aria-label': t('stem.citylab.strip_brief_check_aria', 'Check my plan against the full brief') } })]);
        if (closed) return stripSection({ kind: 'brief', closed: true, title: title, status: status, actions: actions, nav: nav, celBlock: celBlock });

        var cueKey = plan.scenarioId + ':brief';
        var lensBtn = stripButtons();
        // Two columns on a wide screen, so seven requirements stay a short block.
        var rowList = h('ul', { key: 'rows', className: 'mt-1.5 grid grid-cols-1 lg:grid-cols-2 gap-1', 'data-citylab-strip-rows': 'brief' },
          rows.map(function (r) {
            var cue = !!(r.met && rowCue && rowCue.key === cueKey && rowCue.ks.indexOf(r.id) !== -1);
            var bl = briefLens(r.id);
            var rowBtn = bl.lens
              ? lensBtn(fmt(t('stem.citylab.strip_brief_lens', 'Lens: {lens}'), { lens: lensName(bl.lens) }),
                  function () { if (lens !== bl.lens) chooseLens(bl.lens); },
                  { key: 'l', bar: 'rows', pressed: lens === bl.lens, attrs: { 'data-citylab-strip-lens': bl.lens, 'aria-pressed': lens === bl.lens ? 'true' : 'false',
                    'aria-label': fmt(t('stem.citylab.strip_brief_lens_aria', 'Lens: {lens}, suggested for this requirement'), { lens: lensName(bl.lens) }) } })
              : (bl.readout
                ? lensBtn(bl.readout === 'cost'
                    ? (briefReadout === 'cost' ? t('stem.citylab.strip_cost_hide', 'Hide the cost readout') : t('stem.citylab.strip_cost_show', 'Show the cost readout'))
                    : (briefReadout === 'water' ? t('stem.citylab.strip_water_hide', 'Hide the water readout') : t('stem.citylab.strip_water_show', 'Show the water readout')),
                    function () { setBriefReadout(briefReadout === bl.readout ? null : bl.readout); },
                    { key: 'r', bar: 'rows', attrs: { 'data-citylab-strip-readout': bl.readout, 'aria-expanded': briefReadout === bl.readout ? 'true' : 'false',
                      'aria-controls': briefReadout === bl.readout ? 'citylab-strip-readout' : undefined } })
                : null);
            return h('li', { key: r.id, 'data-citylab-strip-row': r.id, 'data-met': r.met ? 'true' : 'false',
              className: 'text-[0.75rem] rounded px-1.5 py-1 flex flex-wrap items-center gap-x-2 gap-y-1',
              style: { color: ink, background: softRow, borderLeft: '4px solid ' + (r.met ? okColour : missColour) } },
              h('span', { style: { flex: '1 1 14rem', minWidth: 0 } },
                h('span', { 'aria-hidden': 'true' }, r.met ? '✔ ' : '○ '),
                h('strong', null, r.hard ? t('stem.citylab.required_prefix', 'Required. ') : t('stem.citylab.target_prefix', 'Target. ')),
                fmt(r.met ? t('stem.citylab.strip_row_met', 'Met: {line}') : t('stem.citylab.strip_row_not', 'Not met yet: {line}'), { line: briefRowLine(r) }),
                r.standardOnly ? h('span', { className: 'block mt-0.5', 'data-citylab-brief-standard-only': r.id, style: { color: missColour, fontWeight: 700 } },
                  fmt(t('stem.citylab.brief_standard_only', 'That is met under your assumption set, but the full brief is also checked under the central estimates, and there it is not met: {value}. This part does not count yet.'),
                    { value: reqValueText(r, r.standardActual, false) })) : null,
                cue ? h('span', { 'data-citylab-row-cue': r.id, className: 'ml-1 text-[0.625rem] font-black rounded px-1 border',
                  style: { color: ink, background: celebBg, borderColor: okColour } }, t('stem.citylab.strip_row_cue', 'Just met')) : null),
              rowBtn);
          }));
        // One toolbar for every row's lens (or readout) button: one tab stop.
        var rowsBar = h('div', { key: 'rowsbar', role: 'toolbar', 'data-citylab-strip-bar': 'rows', onKeyDown: stripRoveKeyDown, onFocus: stripRoveFocus,
          'aria-label': t('stem.citylab.strip_brief_rows_bar', 'The requirements, each with the lens that shows it') }, rowList);
        var readout = briefReadout
          ? h('div', { key: 'readout', id: 'citylab-strip-readout', 'data-citylab-strip-readout-body': briefReadout,
              className: 'mt-2 rounded border p-2 text-[0.6875rem]', style: { color: ink, borderColor: panelBorder, background: softRow } },
              stripReadout(briefReadout))
          : null;
        var note = briefNote && !briefNote.met
          ? h('div', { key: 'note', className: 'mt-2', 'data-citylab-strip-result': briefNote.standardOnly ? 'standard_only' : 'not_yet' },
              h('p', { className: 'text-[0.6875rem] font-bold', style: { color: missColour } },
                t('stem.citylab.mission_not_yet', 'Not met yet. Here is what the model sees:')),
              briefNote.standardOnly ? h('p', { className: 'text-[0.6875rem]', style: { color: ink } },
                t('stem.citylab.brief_check_standard_only', 'Under your own assumption set this plan meets every required part, but it does not count yet: the full brief is also checked under the central estimates, and under those it falls short.')) : null)
          : null;
        return stripSection({ kind: 'brief', closed: false, title: title, status: status, actions: actions, nav: nav, celBlock: celBlock,
          body: [rowsBar, readout, note] });
      }
      // K-5: the full brief and scorecard, one button away.
      function fullScoreDisclosure() {
        return h('div', { className: 'mb-3' },
          h('button', {
            type: 'button', 'aria-expanded': fullScore ? 'true' : 'false',
            'aria-controls': fullScore ? 'citylab-full-score' : undefined, 'data-citylab-full-score': 'true',
            onClick: function () { setFullScore(!fullScore); },
            className: 'text-[0.6875rem] font-bold px-2 py-1 rounded border w-full text-left',
            style: { background: panelBg, color: ink, borderColor: panelBorder, minHeight: '44px' }
          }, (fullScore ? '\u25B4 ' : '\u25BE ') + (fullScore ? t('stem.citylab.k5_score_hide', 'Hide the full scorecard') : t('stem.citylab.k5_score_show', 'Show the full scorecard'))),
          fullScore ? h('div', { id: 'citylab-full-score', className: 'mt-2' }, constraints(), scoreboard()) : null);
      }

      function designTab() {
        // W1: in 3D the board spans the full width (the stage with the map
        // beside it); the inspector and the scorecard sit underneath.
        var wide = boardView === 'model';
        var mapPanel = panel('map', fmt(t('stem.citylab.map_title', '{town} today, and what you have changed'), { town: scen.town }),
            h('div', null,
                boardControls(),
                // W3: one plain sentence, and none while the coach is speaking.
                (plan.editCount || 0) === 0 && !coachStep
                  ? h('p', { className: 'text-[0.6875rem] mb-2 rounded p-1.5', 'data-citylab-intro': 'true',
                      style: { color: ink, background: softBlue } },
                      fmt(boardView === 'model'
                        ? t('stem.citylab.intro_3d', 'This is {town} today: pick a tool, then click a piece of land to change it.')
                        : t('stem.citylab.intro_map', 'This is {town} today: click a piece of land on the map, then choose what goes there below the map.'), { town: scen.town }))
                  : null,
                coachCard(),
                missionStrip(),
                // W4: the palette drives the map board too, and one lens key
                // (from the same lensCells as the 3D board) sits under it.
                boardView === 'model' ? null : mapPaletteBlock(),
                boardView === 'model' ? modelView() : board(),
                boardView === 'model' ? null : mapEditNote(),
                // The staged edit docks under the board it was made on, as it does beside the 3D stage.
                stageLive ? null : predictCard(),
                boardView === 'model' ? null : lensLegend(),
                boardView === 'model' ? null : scaleBar(),
                h('p', { className: 'text-[0.625rem] mt-2', style: { color: dim } },
                  [fmt(t('stem.citylab.map_key_zone', 'Each parcel is one hectare, 100 m across. A blue inner edge marks {zone}.'), { zone: scen.floodLabel }),
                    scen.modelsSeaRise ? t('stem.citylab.map_key_future', 'An orange inner edge marks ground that is dry today and inside the reach planned for 2100, which moves when you change the assumption set the scorecard uses.') : '',
                    t('stem.citylab.map_key_marks', 'A green dot marks green infrastructure. An exclamation mark at the lower left means homes there are not reached by any road. A star at the lower right means homes there have no park within a 5-minute walk.'),
                    t('stem.citylab.map_key_transit_v2', 'A T at the top marks a bus stop. In the Heat, Access gaps, Walk to park, Bus and Flood lenses the lower right shows that lens\'s number or mark instead of the star.')
                  ].filter(Boolean).join(' ')),
                mapTools(),
                shortcutsPanel()), undefined, true);
        var side = h('div', null,
          levelSwitch(),
          level === 'missions' ? missionsPanel() : null,
          // W3: K-5 keeps the full brief and scorecard one button away.
          simpleView ? fullScoreDisclosure() : constraints(), simpleView ? null : scoreboard());
        if (wide) {
          return h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3' },
            h('div', { style: { gridColumn: '1 / -1', minWidth: 0 } }, mapPanel),
            h('div', null, lens === 'access' ? accessPanel() : null, inspector()),
            side);
        }
        return h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3' },
          h('div', null,
            mapPanel,
            lens === 'access' ? accessPanel() : null,
            inspector()),
          side);
      }

      var activeTab = TABS.some(function (tb) { return tb.id === tab; }) ? tab : 'design';
      var body = activeTab === 'design' ? designTab()
        : activeTab === 'table' ? parcelTable()
        : activeTab === 'assume' ? assumptionLab()
        : activeTab === 'memo' ? memoPanel()
        : activeTab === 'discuss' ? discussionPanel()
        : activeTab === 'history' ? historyPanel()
        : activeTab === 'class' ? classPanel()
        : aboutPanel();

      // W6: one compact title row (the folded Start here chip sits in it, and
      // the decorative icon steps aside on a phone so the row stays one line).
      var narrowHead = typeof window !== 'undefined' && window.innerWidth < 480;
      return h('div', { className: 'w-full', onPointerDownCapture: cueGesture, onKeyDownCapture: cueGesture },
        h('div', { className: 'flex flex-wrap items-center gap-x-2 gap-y-1 mb-1', 'data-citylab-title-row': 'true' },
          narrowHead ? null : h('span', { className: 'text-lg', 'aria-hidden': 'true' }, '🏙️'),
          h('h2', { className: 'text-sm font-black', style: { color: ink } },
            fmt(t('stem.citylab.tool_title', 'City Planning Lab · {town}'), { town: scen.town })),
          h('label', { className: 'ml-auto text-[0.6875rem] font-bold flex items-center gap-1.5',
            style: { color: dim } }, t('stem.citylab.town', 'Town'),
            h('select', {
              value: plan.scenarioId,
              disabled: !!teacher.lockTown,
              'aria-label': teacher.lockTown ? t('stem.citylab.town_locked', 'Town, set by your teacher')
                : t('stem.citylab.choose_which_town_to_plan', 'Choose which town to plan'),
              onChange: function (e) { switchScenario(e.target.value); },
              className: 'text-[0.6875rem] rounded border px-1 py-0.5',
              style: { background: panelBg, color: ink, borderColor: panelBorder }
            }, SCENARIO_IDS.map(function (sid) {
              return h('option', { key: sid, value: sid }, SCENARIOS[sid].town);
            }))),
          startHerePanel('header')),
        h('p', { className: 'text-[0.625rem] mb-1.5', style: { color: dim } }, scen.blurb),

        devicePlanNote
          ? h('div', { className: 'rounded p-2 mb-2', role: 'status', style: { background: softBlue } },
              h('p', { className: 'text-[0.6875rem]', style: { color: ink } },
                t('stem.citylab.device_plan_note', 'This plan was found saved on this device, not in your project, so it may be someone else\'s work. It is treated like an imported file: you can look at it and change it, but it earns no XP. Start your own plan for work that counts.')),
              smallBtn(t('stem.citylab.device_plan_fresh', 'Start my own plan'), function () {
                var fresh = basePlan(plan.scenarioId);
                if (teacher.moveBudget) fresh.moveBudget = teacher.moveBudget;
                var dropLead = stagedDropLead();
                setStaged(null); checkpointRef.current = null;
                setMissionNote(null);
                pendingFocusRef.current = 'citylab-tab-' + activeTab;
                applyPlan(fresh, fmt(t('stem.citylab.msg_reset', 'Plan reset to {town} as it stands today.'), { town: scen.town }), false, dropLead || undefined);
                setDropNote(dropLead);
                setCompared(false);
              }))
          : null,
        // W8: the waiting change a fresh plan (a new town, Limited moves, Start
        // my own plan) cancelled, said where the student is looking.
        dropNote
          ? h('p', { className: 'text-[0.6875rem] font-bold rounded p-2 mb-2', 'data-citylab-staged-dropped': 'true',
              style: { color: ink, background: softBlue } }, dropNote)
          : null,

        teacherPanel(),

        startHerePanel('block'),

        // W6: on a phone the tabs are one row that scrolls sideways (arrow
        // keys move along it and the browser keeps the focused tab in view).
        h('div', { className: 'flex items-center gap-1 mb-2', role: 'tablist', 'data-citylab-tabs': narrowUi ? 'strip' : 'wrap',
          style: narrowUi ? { flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' } : { flexWrap: 'wrap' },
          'aria-label': t('stem.citylab.city_planning_lab_sections', 'City Planning Lab sections') },
          TABS.map(function (tb, idx) {
            var active = activeTab === tb.id;
            // A visual group caption before the first tab of each group.
            // aria-hidden: the tablist holds only tabs for a screen reader,
            // and every tab's own name already says what it opens.
            var caption = (idx === 0 || TABS[idx - 1].group !== tb.group)
              ? h('span', { key: 'g-' + tb.group, 'aria-hidden': 'true',
                  className: 'text-[0.625rem] font-bold uppercase tracking-wide ' + (idx === 0 ? '' : 'ml-2'),
                  style: { color: dim, flex: '0 0 auto', whiteSpace: 'nowrap' } }, TAB_GROUP_LABEL[tb.group])
              : null;
            return [caption, h('button', {
              key: tb.id, id: 'citylab-tab-' + tb.id, type: 'button', role: 'tab',
              'aria-selected': active ? 'true' : 'false',
              'aria-controls': 'citylab-panel-' + tb.id,
              tabIndex: active ? 0 : -1,
              onClick: function () { setTab(tb.id); },
              onKeyDown: function (e) { tabKeyDown(e, idx); },
              className: 'text-[0.6875rem] font-bold px-2.5 py-1 rounded-full border',
              style: { background: active ? '#1f5eb0' : panelBg, color: active ? '#ffffff' : ink,
                borderColor: active ? '#1f5eb0' : panelBorder, minHeight: '44px', flex: '0 0 auto', whiteSpace: narrowUi ? 'nowrap' : undefined }
            }, tb.label)];
          }).reduce(function (all, pair) { return all.concat(pair.filter(Boolean)); }, [])),

        // The tab panel wraps the real content, so a screen reader's
        // "tab panel" really contains what the tab opened.
        h('div', { role: 'tabpanel', id: 'citylab-panel-' + activeTab, 'aria-labelledby': 'citylab-tab-' + activeTab },
          body),

        h('p', { className: 'text-[0.625rem] mt-3 text-center', style: { color: dim } },
          fmt(t('stem.citylab.footer', 'Runoff uses the rational method with published coefficients; costs are unit costs times quantities. Both are screening estimates for teaching, not engineering design. {town} is a fictional town, so nothing here misrepresents a real place.'), { town: scen.town }))
      );
    }
  });
})();
