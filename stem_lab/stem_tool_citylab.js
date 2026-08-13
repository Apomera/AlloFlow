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
//                     by tests/city_lab_tiers.test.js, not by good intentions.
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
  var USES = [
    { id: 'preserve',    code: 'Pr', label: 'Preserve / wetland',   units: 0,  C: 0.10, storeys: 0, natural: true,  fill: '#0f766e', pattern: 'dots' },
    { id: 'farm',        code: 'Fm', label: 'Farmland',             units: 0,  C: 0.20, storeys: 0, natural: true,  fill: '#966e28', pattern: 'vert' },
    { id: 'field',       code: 'Fd', label: 'Open field (vacant)',  units: 0,  C: 0.20, storeys: 0, natural: true,  fill: '#7f9d84', pattern: 'none' },
    { id: 'park',        code: 'Pk', label: 'Park / open space',    units: 0,  C: 0.20, storeys: 0, natural: false, fill: '#31a656', pattern: 'dots' },
    { id: 'housing_low', code: 'Hl', label: 'Housing, low density', units: 12, C: 0.45, storeys: 2, natural: false, fill: '#d8a521', pattern: 'hatch' },
    { id: 'housing_mid', code: 'Hm', label: 'Housing, mid density', units: 45, C: 0.65, storeys: 4, natural: false, fill: '#e07b18', pattern: 'hatch' },
    { id: 'mixed',       code: 'Mx', label: 'Mixed use',            units: 60, C: 0.75, storeys: 5, natural: false, fill: '#cb4b16', pattern: 'cross' },
    { id: 'commercial',  code: 'Cm', label: 'Commercial',           units: 0,  C: 0.85, storeys: 2, natural: false, fill: '#9333ea', pattern: 'cross' },
    { id: 'civic',       code: 'Cv', label: 'Civic (school, clinic)', units: 0, C: 0.75, storeys: 2, natural: false, fill: '#2563eb', pattern: 'vert' },
    { id: 'industry',    code: 'In', label: 'Light industry',       units: 0,  C: 0.85, storeys: 1, natural: false, fill: '#5b6675', pattern: 'hatch' },
    { id: 'water',       code: '~~', label: 'River',                units: 0,  C: 1.00, storeys: 0, natural: true,  fill: '#0d7cb2', pattern: 'none', fixed: true }
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
  var VERT_EXAG = 8;

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
      blurb: 'A river town. Stormwater is the constraint that bites.',
      intro: 'Riverbend has to find room for 1,200 more homes over the next twenty years. ' +
        'The floodplain is off limits to new housing, the bond is fixed, and the planning ' +
        'board wants families within a short walk of a park. Show them a plan.',
      floodLabel: 'the mapped 100-year floodplain',
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
      roads: [
        { kind: 'row', row: 6, from: 0, to: 11 },     // main street, over the one bridge
        { kind: 'col', col: 3, from: 2, to: 9 },      // column D spine
        { kind: 'col', col: 2, from: 4, to: 8 }
      ],
      targetNewUnits: 1200,
      runoffCeilingRatio: 1.25,
      bondDollars: 22000000,
      parkWalkMinutes: 5,
      parkAccessTarget: 0.90,
      civicWalkMinutes: 10,
      farmlandCeilingHa: 15,
      requirements: [
        { id: 'req_units',  hard: true,  label: 'Add at least 1,200 new homes that a road actually reaches' },
        { id: 'req_flood',  hard: true,  label: 'No new homes inside the mapped 100-year floodplain' },
        { id: 'req_runoff', hard: true,  label: 'Peak stormwater runoff no more than 25 percent above today' },
        { id: 'req_cost',   hard: true,  label: 'Public infrastructure cost at or under the 22 million dollar bond' },
        { id: 'req_park',   hard: false, label: 'At least 90 percent of homes within a 5-minute walk of a park' },
        { id: 'req_farm_max', hard: false, label: 'Convert no more than 15 hectares of active farmland' },
        { id: 'req_preserve', hard: false, label: 'Build on none of the protected wetland' }
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
      blurb: 'A desert town. Water supply is the constraint that bites, and farmland is drinking it.',
      intro: 'Mesa Hollow needs room for 600 more homes, and the aquifer under it recharges ' +
        'at a fixed rate that nobody can vote to increase. The irrigated fields along the wash ' +
        'take most of that water today. The board wants the homes, wants the farms kept, and ' +
        'cannot have both. Show them a plan.',
      floodLabel: 'the flash-flood wash',
      coreParcel: 'D6',
      elevBaseM: 8, elevStepM: 3,
      modelsWater: true,
      designStormMmPerHour: 65,          // desert storms are short and violent
      landLabels: {
        field: 'Desert scrub (vacant)',
        preserve: 'Protected desert',
        farm: 'Irrigated farmland'
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
      roads: [
        { kind: 'row', row: 6, from: 0, to: 5 },      // the short main street
        { kind: 'col', col: 1, from: 5, to: 7 },
        { kind: 'col', col: 2, from: 4, to: 8 },
        { kind: 'col', col: 3, from: 5, to: 8 }
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
        { id: 'req_units',  hard: true,  label: 'Add at least 600 new homes that a road actually reaches' },
        { id: 'req_flood',  hard: true,  label: 'No new homes inside the flash-flood wash' },
        { id: 'req_water',  hard: true,  label: 'Total water demand within the safe yield of the aquifer' },
        { id: 'req_cost',   hard: true,  label: 'Public infrastructure cost at or under the 12 million dollar bond' },
        { id: 'req_park',   hard: false, label: 'At least 85 percent of homes within a 5-minute walk of a park' },
        { id: 'req_farm_min', hard: false, label: 'Keep at least 12 hectares of irrigated farmland' },
        { id: 'req_runoff', hard: false, label: 'Flash-flood runoff no more than 40 percent above today' },
        { id: 'req_preserve', hard: false, label: 'Build on none of the protected desert' }
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
  SCENARIOS.harborlight = {
    id: 'harborlight',
    town: 'Harborlight',
    blurb: 'A coastal town. The constraint is time: the plan has to still work in 2050.',
    intro: 'Harborlight needs room for 700 more homes. The hard part is not this year, it is ' +
      'the one after next. The board has asked for a plan that keeps new housing out of the ' +
      'storm surge today AND out of the reach it is planned to have by 2050, and the higher ' +
      'ground is a narrow band. Show them a plan that still stands up later.',
    floodLabel: 'the storm surge reach',
    coreParcel: 'F8',
    modelsWater: false,
    modelsSeaRise: true,
    designStormMmPerHour: 55,
    // Coastal ground is measured in tenths of a metre. A 3 m elevation band
    // would make every parcel identical to a sea-level question.
    elevBaseM: 0.2, elevStepM: 0.3,
    // Elevation the storm surge reaches today, before any allowance.
    surgeBaseElevationM: 1.45,
    landLabels: { preserve: 'Salt marsh', water: 'The bay' },
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
    roads: [
      { kind: 'row', row: 8, from: 0, to: 6 },
      { kind: 'col', col: 4, from: 7, to: 10 },
      { kind: 'col', col: 5, from: 7, to: 10 },
      { kind: 'col', col: 3, from: 8, to: 9 }
    ],
    targetNewUnits: 700,
    runoffCeilingRatio: 1.30,
    bondDollars: 16000000,
    parkWalkMinutes: 5,
    parkAccessTarget: 0.85,
    civicWalkMinutes: 10,
    requirements: [
      { id: 'req_units',  hard: true,  label: 'Add at least 700 new homes that a road actually reaches' },
      { id: 'req_flood',  hard: true,  label: 'No new homes inside the storm surge reach today' },
      { id: 'req_future_flood', hard: true, label: 'No new homes inside the surge reach planned for 2050' },
      { id: 'req_cost',   hard: true,  label: 'Public infrastructure cost at or under the 16 million dollar bond' },
      { id: 'req_park',   hard: false, label: 'At least 85 percent of homes within a 5-minute walk of a park' },
      { id: 'req_preserve', hard: false, label: 'Build on none of the salt marsh' },
      { id: 'req_runoff', hard: false, label: 'Peak runoff no more than 30 percent above today' }
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
      question: 'You added homes. What happens to what it costs to live here?',
      why: 'This is the number the tool refuses to print, and this is why.',
      sides: [
        { label: 'More homes eases pressure',
          view: 'More homes for the same number of households means fewer people competing for ' +
            'each one, so prices rise more slowly than they otherwise would have.' },
        { label: 'Where you build changes the answer',
          view: 'Building in one neighbourhood can speed up change in that neighbourhood even ' +
            'while helping the region overall, so a regional effect and a local one can point ' +
            'in opposite directions at the same time.' },
        { label: 'What gets built matters more than how much',
          view: 'The mix, the price point, and whether anything is held below market may matter ' +
            'more than the raw count of homes.' }
      ],
      toolSays: 'This tool counts homes. It does not model prices at all. People who study ' +
        'this for a living genuinely disagree, so a number here would be one position dressed ' +
        'up as arithmetic.'
    },
    {
      id: 'disc_displacement',
      question: 'If a neighbourhood changes, who ends up living there afterwards?',
      why: 'Displacement is one of the things the scorecard refuses to put a number on.',
      sides: [
        { label: 'Investment can help the people already there',
          view: 'Money spent on a neighbourhood that has had none for decades can mean better ' +
            'services, repaired streets and more choice for households who have been asking ' +
            'for exactly that.' },
        { label: 'The people already there may not be the ones who benefit',
          view: 'Renters have the least protection when costs rise, and a neighbourhood can ' +
            'improve on every measure you could name while many of the households who lived ' +
            'through the difficult years are no longer in it.' },
        { label: 'It turns on what comes with the building',
          view: 'Whether anyone has to leave can depend on tenant protections, on whether homes ' +
            'are added or replaced, and on what a household can actually afford to move to. ' +
            'None of those is a property of the buildings themselves.' }
      ],
      toolSays: 'The tool does not know who lives anywhere. It counts dwellings, not ' +
        'households, and it cannot tell you who is in them before or after.'
    },
    {
      id: 'disc_room',
      question: 'Who actually decides this, and who is in the room?',
      why: 'You made every decision in this tool alone, in about forty minutes.',
      sides: [
        { label: 'The people who show up',
          view: 'Planning boards hear from whoever comes to an evening meeting, which is not a ' +
            'random sample of a town.' },
        { label: 'The people who cannot',
          view: 'People who rent, work nights, care for someone, or do not speak the language ' +
            'the meeting is held in are affected by the plan and are often not there.' },
        { label: 'The people who do not exist yet',
          view: 'Most of the people who will live with a twenty-year plan have no way to be ' +
            'consulted about it.' }
      ],
      toolSays: 'Nothing here models politics, objections, lawsuits, or a landowner who says ' +
        'no. A real plan takes years and a great many arguments.'
    },
    {
      id: 'disc_pays',
      question: 'The bond paid for roads and parks. Builders paid for the buildings. Is that split right?',
      why: 'The tool assumed one answer and told you it was assuming.',
      sides: [
        { label: 'Builders should pay',
          view: 'A development creates the need for the road, so the project should carry that ' +
            'cost rather than everyone else.' },
        { label: 'The town should pay',
          view: 'Infrastructure outlasts any one project and serves everyone, and loading fees ' +
            'onto building raises the cost of the homes.' },
        { label: 'Somewhere in between',
          view: 'Most places land on a mix, and where exactly is argued over constantly.' }
      ],
      toolSays: 'The bond covers public infrastructure only. That was a modelling choice, and ' +
        'changing it would change which plans fit the budget.'
    }
  ];

  SCENARIOS.riverbend.discussion = [
    {
      id: 'disc_rb_flood',
      question: 'Homes and a school already sit in the floodplain. What should the town do about them?',
      why: 'The tool grandfathered them, counted them, and moved on.',
      sides: [
        { label: 'Buy out over time',
          view: 'Purchase properties as they come up for sale and let the land go back to ' +
            'floodplain, which is slow and expensive but permanent.' },
        { label: 'Protect what is there',
          view: 'Engineering can reduce the risk, though it has to keep working and has to be ' +
            'maintained by someone.' },
        { label: 'Leave them and require flood-proofing',
          view: 'People live there now, moving is not free, and requiring changes at sale ' +
            'spreads the cost over decades.' }
      ],
      toolSays: 'The tool told you how many homes are exposed. It does not price any of these ' +
        'options and has no view on which is right.'
    },
    {
      id: 'disc_rb_farm',
      question: 'Is farmland worth keeping in a town that needs houses?',
      why: 'The brief set a ceiling of 15 hectares. It did not justify it.',
      sides: [
        { label: 'Keep it',
          view: 'Food grown close to where it is eaten, open land, and a working landscape are ' +
            'hard to get back once built on.' },
        { label: 'Build on it',
          view: 'Flat farmland is often the cheapest land to build on, so protecting it pushes ' +
            'housing further out, which has its own costs.' },
        { label: 'It may not be the town that decides',
          view: 'Somebody owns that field. They may want to sell it, they may be the fourth ' +
            'generation farming it, and a zoning line drawn on a map does not by itself settle ' +
            'what happens next on land somebody else holds.' }
      ],
      toolSays: 'The ceiling was a number in the brief. The tool measured your compliance with ' +
        'it and has no opinion about whether it was the right ceiling.'
    }
  ];

  SCENARIOS.mesahollow.discussion = [
    {
      id: 'disc_mh_rights',
      question: 'The aquifer is fixed. Who is entitled to the water in it?',
      why: 'You retired hectares of irrigated farmland with a click. In a real basin that is ' +
        'a water right somebody holds.',
      sides: [
        { label: 'Whoever has used it longest',
          view: 'Across much of the arid west, water law runs on seniority: earlier users are ' +
            'served in full before later ones get anything. That is the law, whatever anyone ' +
            'thinks of it.' },
        { label: 'Whoever owns the land above it',
          view: 'Other legal traditions tie the right to use water to ownership of the land ' +
            'it sits under, which makes the question who holds the deeds rather than who got ' +
            'there first.' },
        { label: 'Tribal nations with reserved rights',
          view: 'Reserved water rights can predate a state entirely, and in some basins they ' +
            'are still being quantified in court.' },
        { label: 'Everyone, held in trust',
          view: 'On this view water is a public resource that a government holds for everybody ' +
            'rather than a thing that can be owned outright.' }
      ],
      toolSays: 'This is law and values, not arithmetic, and the tool does not model any of it. ' +
        'It compared demand with yield and stopped there.'
    },
    {
      id: 'disc_mh_growth',
      question: 'If the aquifer cannot supply more, should the town grow at all?',
      why: 'The brief told you to add 600 homes. It never asked whether you should.',
      sides: [
        { label: 'Growth is how a town survives',
          view: 'Places that stop adding housing get older and more expensive, and young ' +
            'families leave.' },
        { label: 'A town can choose its size',
          view: 'Some communities decide a physical limit is a real limit and plan to stay ' +
            'the size their water supports.' },
        { label: 'Reduce demand instead',
          view: 'Efficiency, different crops, and different landscaping change the arithmetic ' +
            'without changing the number of people.' }
      ],
      toolSays: 'The tool obeys the brief. Whether the brief was reasonable is outside it.'
    }
  ];

  SCENARIOS.harborlight.discussion = [
    {
      id: 'disc_hl_retreat',
      question: 'Homes are already inside the reach planned for 2050. Defend, raise, or move them?',
      why: 'The tool counted them and stopped.',
      sides: [
        { label: 'Defend',
          view: 'Build protection. It works until it does not, it has to be maintained forever, ' +
            'and what it protects tends to become more valuable and more built up.' },
        { label: 'Raise and accommodate',
          view: 'Lift buildings and design for water. Cheaper per building, and it does not ' +
            'help the streets, pipes, or anyone who cannot afford the work.' },
        { label: 'Move over time',
          view: 'Buy out and relocate across decades. It is real practice, it is permanent, ' +
            'and where it has been tried it has often been deeply unpopular with the people ' +
            'asked to go.' }
      ],
      toolSays: 'The tool does not price a sea wall, model whether one holds, or know anything ' +
        'about what it is like to be told to leave a house.'
    },
    {
      id: 'disc_hl_permit',
      question: 'Should the town keep issuing permits on ground that is dry today and inside the 2050 reach?',
      why: 'You watched the safe area of the map change when you changed the allowance.',
      sides: [
        { label: 'Yes, with conditions',
          view: 'Require raised construction and let people make their own decisions about ' +
            'risk they are told about.' },
        { label: 'No, stop now',
          view: 'Every home permitted there is one somebody has to deal with later, and the ' +
            'cost of that lands on the public.' },
        { label: 'It depends whose allowance you plan to',
          view: 'The answer changes with the number, and nobody can hand you the right number.' }
      ],
      toolSays: 'This is the whole reason the coastal town exists. The tool showed you that ' +
        'the answer depends on an assumption. It cannot tell you which assumption to make.'
    }
  ];

  function discussionFor(planOrId) {
    return (scenarioOf(planOrId).discussion || []).concat(SHARED_DISCUSSION);
  }

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
      title: 'Grading neighbourhoods on a map',
      place: 'United States',
      period: '1930s onward',
      what: 'A federal agency, the Home Owners Loan Corporation, produced colour-graded maps ' +
        'of American cities. Neighbourhoods were graded A to D. D was printed in red, which is ' +
        'where the word redlining comes from. The written area descriptions filed alongside the ' +
        'maps recorded the racial and ethnic makeup of each neighbourhood and named it as a ' +
        'reason for the grade.',
      record: 'The maps and their area descriptions survive in the national archives and have ' +
        'been digitised and published by university researchers. You can read the sheets and ' +
        'the descriptions themselves rather than take anybody at their word for what they say.',
      contested: 'That the maps exist and say what they say is not in dispute. What historians ' +
        'and economists argue about is how far the maps CAUSED the disinvestment that followed ' +
        'and how far they recorded decisions lenders were already making, and how much of the ' +
        'difference between neighbourhoods today traces to them rather than to everything that ' +
        'happened afterwards.',
      toolSays: 'You have just spent an hour assigning grades to squares on a map of a town. ' +
        'This tool scored your grades against a brief. It has no way to tell you what a line ' +
        'drawn on a map does to the people inside it, and no simulation does.'
    },
    {
      id: 'case_renewal',
      title: 'Clearance, and roads through neighbourhoods',
      place: 'United States',
      period: 'roughly 1949 to the 1970s',
      what: 'Federal programmes paid for clearing areas officially designated as blighted and ' +
        'redeveloping the cleared land. Highway building in the same decades routed new roads ' +
        'through neighbourhoods that already existed. Homes and businesses were demolished and ' +
        'the people in them moved.',
      record: 'The programmes were created by named federal statutes, the blight designations ' +
        'were made in public documents, and city archives, minutes and newspapers recorded what ' +
        'was cleared, when, and by whose decision.',
      contested: 'What is argued about is why particular neighbourhoods were chosen, what ' +
        'alternatives were genuinely available at the time, what the people displaced were ' +
        'owed, and how much of what followed would have happened regardless.',
      toolSays: 'In this tool you changed land use with a click and it reported hectares. ' +
        'Nobody had to move, because nobody in Riverbend exists. That gap between a hectare ' +
        'and a household is the whole of what the record above is about.'
    },
    {
      id: 'case_japan',
      title: 'Zoning set nationally, and zones that nest',
      place: 'Japan',
      period: 'current system',
      what: 'Japan sets land-use zoning through national law rather than leaving each ' +
        'municipality to write its own, using a small number of zone categories. The categories ' +
        'broadly nest: uses allowed in a quieter zone are generally also allowed in a busier ' +
        'one, so a shop is not automatically excluded from a residential street.',
      record: 'The system is set out in national legislation and the zone categories and what ' +
        'each permits are published.',
      contested: 'What is argued about is how much this structure explains differences in what ' +
        'actually gets built, and how much is down to other things entirely: how buildings are ' +
        'taxed and valued as they age, demographics, and the aftermath of particular economic ' +
        'periods.',
      toolSays: 'The briefs here let you put any use on any parcel with no process and no ' +
        'objection. That is a simplification made to keep the exercise doable, not a proposal.'
    },
    {
      id: 'case_nl',
      title: 'A street where cars are the guests',
      place: 'Netherlands',
      period: '1970s onward',
      what: 'Dutch street design widely separates cycling from motor traffic with its own ' +
        'infrastructure, and the woonerf, a street built so that motor vehicles move at walking ' +
        'pace among people, originated there and has a legal definition. This was a deliberate ' +
        'change of direction argued over and made across decades. It is not an old tradition ' +
        'that was always there.',
      record: 'The design standards are published, the woonerf is defined in traffic law, and ' +
        'the period in which the change was pushed for and adopted is well documented.',
      contested: 'What is argued about is how far the approach transfers to places built at ' +
        'different densities and around longer distances, and what it would actually take to ' +
        'get there from wherever somewhere else is starting.',
      toolSays: 'This tool draws a road or a path and counts what it costs. It knows nothing ' +
        'about what either is like to use, or about how long it takes a place to change its mind.'
    }
  ];

  var SCENARIO_IDS = Object.keys(SCENARIOS);
  var DEFAULT_SCENARIO = 'riverbend';

  function scenarioOf(planOrId) {
    if (!planOrId) return SCENARIOS[DEFAULT_SCENARIO];
    var id = typeof planOrId === 'string' ? planOrId : planOrId.scenarioId;
    return SCENARIOS[id] || SCENARIOS[DEFAULT_SCENARIO];
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
  var ASSUMPTION_SETS = [
    {
      id: 'central', label: 'Central estimates',
      blurb: 'Midpoint of the published range for every parameter.',
      runoffScale: 1.00, giCredit: 0.15, costScale: 1.00, householdSize: 2.4,
      litresPerPersonPerDay: 300, farmIrrigationM3PerHaPerDay: 40, parkIrrigationM3PerHaPerDay: 25,
      planningSeaRiseM: 0.6
    },
    {
      id: 'conservative', label: 'Conservative estimates (high end)',
      blurb: 'Runoff coefficients and unit costs at the top of the published range, ' +
        'and the green-infrastructure credit at the bottom of its range. What a cautious engineer assumes.',
      runoffScale: 1.10, giCredit: 0.10, costScale: 1.20, householdSize: 2.6,
      litresPerPersonPerDay: 380, farmIrrigationM3PerHaPerDay: 50, parkIrrigationM3PerHaPerDay: 32,
      planningSeaRiseM: 0.9
    },
    {
      id: 'optimistic', label: 'Optimistic estimates (low end)',
      blurb: 'Runoff coefficients and unit costs at the bottom of the published range, ' +
        'and the green-infrastructure credit at the top of its range. What an enthusiastic proposal assumes.',
      runoffScale: 0.90, giCredit: 0.20, costScale: 0.85, householdSize: 2.2,
      litresPerPersonPerDay: 240, farmIrrigationM3PerHaPerDay: 30, parkIrrigationM3PerHaPerDay: 18,
      planningSeaRiseM: 0.3
    }
  ];
  var SET_BY_ID = {};
  for (var _s = 0; _s < ASSUMPTION_SETS.length; _s++) SET_BY_ID[ASSUMPTION_SETS[_s].id] = ASSUMPTION_SETS[_s];

  // Unit costs in dollars, base year stated in the UI. Scaled by costScale.
  var COSTS = {
    road_local: 180000,        // per 100 m segment, carriageway plus utilities
    road_arterial: 420000,
    path: 45000,               // walking and cycling only
    bridge_road: 2800000,      // any road segment touching a river parcel
    bridge_path: 900000,
    park_per_ha: 600000,
    green_infra_per_ha: 250000,
    civic_each: 9000000
  };

  // -------------------------------------------------------------------
  // TIER 3. Never computed, never rendered, never exported. The test in
  // tests/city_lab_tiers.test.js asserts this set never intersects the
  // rendered indicator ids.
  // -------------------------------------------------------------------
  var CONTESTED_IDS = ['rent', 'affordability', 'displacement', 'gentrification',
    'jobs', 'economicGrowth', 'propertyValue', 'crime', 'approval', 'happiness',
    'healthOutcome', 'schoolQuality', 'tax_revenue'];

  var TIER1_IDS = ['newUnitsServed', 'totalUnitsServed', 'unitsUnserved', 'builtAreaHa',
    'farmlandConvertedHa', 'preserveConvertedHa', 'newUnitsInFloodplain',
    'existingUnitsInFloodplain', 'parkHa', 'farmHa', 'parkAccessPct',
    'parkAccessPctAsCrowFlies', 'civicAccessPct', 'newRoadMetres'];
  var TIER2_IDS = ['runoffCoefficient', 'peakRunoffQ', 'baselineRunoffQ', 'runoffRatio',
    'capitalCost', 'population', 'parkHaPer1000',
    'waterDemandM3PerDay', 'waterHeadroomM3PerDay',
    'newUnitsInFutureSurge', 'existingUnitsInFutureSurge', 'landAtRiskHa'];

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
    { label: 'Homes', ids: ['newUnitsServed', 'totalUnitsServed', 'unitsUnserved'] },
    { label: 'Land', ids: ['builtAreaHa', 'parkHa', 'farmHa', 'farmlandConvertedHa',
      'preserveConvertedHa'] },
    { label: 'Exposure', ids: ['newUnitsInFloodplain', 'existingUnitsInFloodplain'] },
    { label: 'Getting around', ids: ['parkAccessPct', 'parkAccessPctAsCrowFlies',
      'civicAccessPct', 'newRoadMetres'] }
  ];
  var TIER2_GROUPS = [
    { label: 'Stormwater', ids: ['runoffCoefficient', 'peakRunoffQ', 'baselineRunoffQ',
      'runoffRatio'] },
    { label: 'Money', ids: ['capitalCost'] },
    { label: 'People', ids: ['population', 'parkHaPer1000'] },
    { label: 'Water supply', ids: ['waterDemandM3PerDay', 'waterHeadroomM3PerDay'] },
    { label: 'Sea level', ids: ['newUnitsInFutureSurge', 'existingUnitsInFutureSurge',
      'landAtRiskHa'] }
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
      memo: { bindingConstraint: '', tradeoff: '', text: '' },
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
    catch (e) { return { ok: false, error: 'That file is not valid JSON.' }; }
    if (!data || typeof data !== 'object') return { ok: false, error: 'That file is not a plan.' };
    if (data.v !== 1) return { ok: false, error: 'That plan was saved by a different version of this tool.' };
    if (!SCENARIOS[data.scenarioId]) {
      return { ok: false, error: 'That plan is for a town this build does not have (' +
        String(data.scenarioId).slice(0, 40) + ').' };
    }

    var out = basePlan(data.scenarioId);
    var warnings = [];
    var skippedUses = 0, skippedEdges = 0;

    if (data.uses && typeof data.uses === 'object') {
      Object.keys(data.uses).forEach(function (id) {
        if (out.uses[id] === undefined) { skippedUses++; return; }
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
        if (e.length !== 2 || out.uses[e[0]] === undefined || out.uses[e[1]] === undefined) {
          skippedEdges++; return;
        }
        out.edges[key] = kind;
      });
    }
    if (data.greenInfra && typeof data.greenInfra === 'object') {
      Object.keys(data.greenInfra).forEach(function (id) {
        if (out.uses[id] !== undefined && data.greenInfra[id] && canGreenInfra(out.uses[id])) {
          out.greenInfra[id] = true;
        }
      });
    }
    if (SET_BY_ID[data.assumptionSetId]) out.assumptionSetId = data.assumptionSetId;
    if (data.memo && typeof data.memo === 'object') {
      out.memo = {
        bindingConstraint: String(data.memo.bindingConstraint || '').slice(0, 400),
        tradeoff: String(data.memo.tradeoff || '').slice(0, 4000),
        text: String(data.memo.text || '').slice(0, 4000)
      };
    }
    out.editCount = typeof data.editCount === 'number' ? data.editCount : 0;
    out.moveBudget = typeof data.moveBudget === 'number' && data.moveBudget > 0
      ? Math.min(999, Math.round(data.moveBudget)) : null;
    out.ranAssumptionLab = !!data.ranAssumptionLab;

    if (skippedUses) warnings.push(skippedUses + ' parcel entries were not recognised and were skipped.');
    if (skippedEdges) warnings.push(skippedEdges + ' connections were not recognised and were skipped.');
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

    function line(label, qty, unitCost, note) {
      if (!qty) return;
      lines.push({ label: label, qty: qty, unitCost: Math.round(unitCost * scale),
        total: Math.round(qty * unitCost * scale), note: note || '' });
    }
    line('Local road segments (100 m)', newLocal, COSTS.road_local);
    line('Arterial road segments (100 m)', newArterial, COSTS.road_arterial);
    line('Road segments crossing the river', bridgeRoad, COSTS.bridge_road, 'bridge structure');
    line('Walking and cycling paths (100 m)', newPath, COSTS.path);
    line('Foot crossings of the river', bridgePath, COSTS.bridge_path, 'footbridge');
    line('New park land (ha)', parkHa, COSTS.park_per_ha);
    line('Green infrastructure (ha)', giHa, COSTS.green_infra_per_ha, 'rain gardens, permeable paving, canopy');
    line('New civic buildings', civicCount, COSTS.civic_each);

    var total = 0;
    for (var k = 0; k < lines.length; k++) total += lines[k].total;
    return { total: total, lines: lines, newRoadMetres: roadM, bridgeCount: bridgeCount };
  }

  // The whole scorecard, as a pure function of (plan, assumption set).
  function scorecard(plan, assumptionSetId) {
    var assumptions = SET_BY_ID[assumptionSetId || plan.assumptionSetId] || SET_BY_ID.central;
    var sc = scenarioOf(plan);
    var base = basePlan(sc.id);
    var ids = allParcelIds();
    var served = servedParcels(plan);

    var totalUnitsServed = 0, baseUnitsServed = 0, unitsUnserved = 0;
    var newUnitsInFloodplain = 0, existingUnitsInFloodplain = 0;
    var builtAreaHa = 0, parkHa = 0, farmHa = 0, farmlandConvertedHa = 0, preserveConvertedHa = 0;
    var newUnitsInFutureSurge = 0, existingUnitsInFutureSurge = 0, landAtRiskHa = 0;
    var housingParcels = [], parkParcels = [], civicParcels = [];

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], t = terrainAt(id, sc.id);
      var use = USE_BY_ID[plan.uses[id]];
      var baseUse = USE_BY_ID[base.uses[id]];
      var u = unitsOnParcel(plan, id);
      var baseU = baseUse ? baseUse.units * HA_PER_PARCEL : 0;

      if (u > 0) {
        if (served[id]) { totalUnitsServed += u; housingParcels.push(id); }
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
        newRoadMetres: cost.newRoadMetres
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
        landAtRiskHa: landAtRiskHa
      },
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
          ? s.tier1.unitsUnserved + ' dwellings are zoned but no road reaches them, so they are not counted.'
          : ''
      };
    },
    req_flood: function (s, sc) {
      return {
        met: s.tier1.newUnitsInFloodplain === 0,
        actual: s.tier1.newUnitsInFloodplain, target: 0, unit: 'count',
        detail: s.tier1.existingUnitsInFloodplain > 0
          ? s.tier1.existingUnitsInFloodplain + ' existing dwellings already sit in ' + sc.floodLabel +
            '. They are grandfathered and are not counted against you, but they are still exposed.'
          : ''
      };
    },
    req_runoff: function (s, sc) {
      return {
        met: s.tier2.runoffRatio <= sc.runoffCeilingRatio + 1e-9,
        actual: s.tier2.runoffRatio, target: sc.runoffCeilingRatio, unit: 'ratio',
        detail: 'Modelled, not measured. Open the runoff model to see the formula and the coefficients.'
      };
    },
    req_cost: function (s, sc) {
      return {
        met: s.tier2.capitalCost <= sc.bondDollars,
        actual: s.tier2.capitalCost, target: sc.bondDollars, unit: 'money',
        detail: 'The bond covers public infrastructure only. Private buildings are not the town budget.'
      };
    },
    req_park: function (s, sc) {
      return {
        met: s.tier1.parkAccessPct >= sc.parkAccessTarget - 1e-9,
        actual: s.tier1.parkAccessPct, target: sc.parkAccessTarget, unit: 'percent', floor: true,
        detail: 'Network distance along streets and paths, not straight-line distance.'
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
        detail: 'Every hectare kept in production draws irrigation water that the homes cannot then use.'
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
        detail: 'Protected land is not off limits, but taking it is a choice the board will ask about.'
      };
    },
    req_future_flood: function (s, sc) {
      return {
        met: s.tier2.newUnitsInFutureSurge === 0,
        actual: s.tier2.newUnitsInFutureSurge, target: 0, unit: 'count',
        detail: 'MODELLED, and the only requirement here whose MAP moves. The safe area is ' +
          'ground above the surge reach plus the allowance the board asked you to plan for, ' +
          'and that allowance differs between the assumption sets. A plan that only works ' +
          'under one of them is a plan that only works if that guess was right. ' +
          (s.tier2.existingUnitsInFutureSurge > 0
            ? s.tier2.existingUnitsInFutureSurge + ' homes already standing are inside it. They ' +
              'are not counted against you, and they are also not going anywhere.'
            : '')
      };
    },
    req_water: function (s, sc) {
      return {
        met: s.tier2.waterDemandM3PerDay <= sc.aquiferYieldM3PerDay + 1e-9,
        actual: s.tier2.waterDemandM3PerDay, target: sc.aquiferYieldM3PerDay, unit: 'water',
        detail: 'Safe yield is a property of the basin, not a policy anyone can vote to raise. ' +
          'The three demand rates are published ranges, so open the water model to see them.'
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

  function buildMassing(plan, assumptionSetId, selectedId) {
    var sc = scenarioOf(plan);
    var assumptions = SET_BY_ID[assumptionSetId || plan.assumptionSetId] || SET_BY_ID.central;
    var ids = allParcelIds();
    var served = servedParcels(plan);
    var half = N_COLS / 2;

    var ground = [], buildings = [], marks = [];
    var minElev = Infinity, maxElev = -Infinity;

    ids.forEach(function (id) {
      var t = terrainAt(id, plan);
      var use = USE_BY_ID[plan.uses[id]];
      var x = parcelCol(id) - half + 0.5;
      var z = parcelRow(id) - 1 - half + 0.5;
      var topY = metresToWorld(t.elevationM);
      if (t.elevationM < minElev) minElev = t.elevationM;
      if (t.elevationM > maxElev) maxElev = t.elevationM;

      ground.push({
        id: id, x: x, z: z,
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
          id: id, x: x, z: z,
          base: topY,
          height: metresToWorld(storeys * METRES_PER_STOREY),
          colour: use.fill,
          storeys: storeys,
          unserved: unitsOnParcel(plan, id) > 0 && !served[id]
        });
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
      var y = Math.max(metresToWorld(terrainAt(a, plan).elevationM),
        metresToWorld(terrainAt(b, plan).elevationM));
      return {
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
      sheets.push({ id: 'surge_today', y: metresToWorld(sc.surgeBaseElevationM),
        colour: '#0e7490', opacity: 0.16, label: 'storm surge today' });
      sheets.push({ id: 'surge_2050',
        y: metresToWorld(futureSurgeElevationM(plan, assumptions)),
        colour: '#38bdf8', opacity: 0.14,
        label: 'surge reach planned for 2050' });
    }

    return {
      scenarioId: sc.id,
      ground: ground, buildings: buildings, links: links, sheets: sheets, marks: marks,
      extent: N_COLS / 2,
      minElevationM: minElev, maxElevationM: maxElev,
      verticalExaggeration: VERT_EXAG,
      metresPerStorey: METRES_PER_STOREY
    };
  }

  // What the viewer rebuilds on. Cheap to compute and changes exactly when the
  // geometry would, so an orbit or a resize never triggers a scene rebuild.
  function massingSignature(plan, assumptionSetId, selectedId) {
    var ids = allParcelIds();
    var uses = ids.map(function (id) { return plan.uses[id]; }).join('');
    var edges = Object.keys(plan.edges).sort().join(',');
    return [plan.scenarioId, assumptionSetId || plan.assumptionSetId, selectedId || '', uses, edges].join('|');
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
    out.push('<title id="planTitle">' + esc(sc.town) + ' as planned</title>');
    out.push('<desc id="planDesc">A ' + N_COLS + ' by ' + N_ROWS + ' grid of one-hectare ' +
      'parcels. Each parcel carries a two-letter land use code. The table below lists every ' +
      'parcel that was changed, so nothing here depends on seeing the picture.</desc>');
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
        var k = e.plan.memo.bindingConstraint;
        bindingChoice[k] = (bindingChoice[k] || 0) + 1;
      }
      // What each plan actually gave up. These are the discussion starter.
      if (s.tier1.farmlandConvertedHa > 0) tradeOffs.farmland++;
      if (s.tier1.preserveConvertedHa > 0) tradeOffs.preserve++;
      if (s.tier1.newUnitsInFloodplain > 0) tradeOffs.floodplain++;
      if (s.tier2.capitalCost > sc.bondDollars) tradeOffs.overBudget++;
      if (s.tier1.parkAccessPct < sc.parkAccessTarget - 1e-9) tradeOffs.parkAccess++;

      rows.push({
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
      rows: rows
    };
  }

  // One row per plan. Structured fields only; no free text ever leaves here.
  function classCsv(entries, scenarioId, assumptionSetId) {
    var summary = classSummary(entries, scenarioId, assumptionSetId);
    var sc = scenarioOf(scenarioId);
    var reqIds = sc.requirements.map(function (r) { return r.id; });
    var header = ['code', 'town', 'hard_met', 'hard_total', 'soft_met', 'soft_total',
      'new_homes', 'farmland_converted_ha', 'preserve_converted_ha', 'homes_in_floodplain',
      'park_access_pct', 'capital_cost', 'assumption_lab_run', 'memo_present', 'move_budget']
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
        r.moveBudget == null ? '' : r.moveBudget
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
    classSummary: classSummary, classCsv: classCsv, startChallenge: startChallenge
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

  function buildCityScene(THREE, S, data) {
    cityMatCache = null;
    var m = data && data.massing;
    if (!m) return;
    var box = new THREE.BoxGeometry(1, 1, 1);
    var dark = data.dark !== false;

    // makeOrbitViewer does NOT light the scene. makeBayViewer does, which is
    // an easy thing to assume applies to both: the first real render of this
    // model came back as a correct silhouette in near-total black. Lights go
    // in S.model so they are disposed and rebuilt with the rest of the group.
    S.model.add(new THREE.AmbientLight(0xffffff, dark ? 0.52 : 0.68));
    var key = new THREE.DirectionalLight(0xfff4e0, dark ? 0.85 : 0.75);
    key.position.set(-6, 10, 7);
    S.model.add(key);
    var fill = new THREE.DirectionalLight(0xbcd4ff, dark ? 0.34 : 0.28);
    fill.position.set(7, 5, -6);
    S.model.add(fill);
    if (S.renderer && S.renderer.setClearColor) {
      S.renderer.setClearColor(dark ? 0x0b1220 : 0xdfe6ef, 1);
    }

    function addBox(x, y, z, sx, sy, sz, colour, opts) {
      var mesh = new THREE.Mesh(box, cityMaterial(THREE, colour, opts));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, Math.max(0.0005, sy), sz);
      S.model.add(mesh);
      return mesh;
    }

    // Ground. One column per parcel, top face at its own elevation, so the
    // relief is the terrain rather than a decoration.
    m.ground.forEach(function (g) {
      addBox(g.x, g.height / 2, g.z, 0.97, g.height, 0.97, g.colour);
      // Exposure is marked ON the parcel, not inferred from a sheet overhead.
      // Ground under the 2050 line but dry today is the interesting case, so
      // it gets the brighter cap; ground already under water today is darker.
      if (g.underToday) {
        addBox(g.x, g.top + 0.006, g.z, 0.97, 0.012, 0.97, '#0e7490', { opacity: 0.82 });
      } else if (g.underFuture) {
        addBox(g.x, g.top + 0.006, g.z, 0.97, 0.012, 0.97, '#38bdf8', { opacity: 0.78 });
      } else if (g.floodplain && !g.water) {
        // Towns whose flood zone is mapped per parcel rather than derived from
        // an elevation get their exposure marked the same way.
        addBox(g.x, g.top + 0.006, g.z, 0.97, 0.012, 0.97, '#38bdf8', { opacity: 0.6 });
      }
    });

    m.buildings.forEach(function (b) {
      addBox(b.x, b.base + b.height / 2, b.z, 0.62, b.height, 0.62, b.colour);
      if (b.unserved) addBox(b.x, b.base + b.height + 0.06, b.z, 0.18, 0.12, 0.18, '#ef4444');
    });

    m.links.forEach(function (l) {
      var w = l.kind === 'path' ? 0.10 : 0.16;
      addBox(l.x, l.y + 0.014, l.z, l.horizontal ? 1 : w, 0.022, l.horizontal ? w : 1, l.colour);
    });

    // The water sheets. Full extent and translucent, so what reads is which
    // ground has gone under rather than how high the sheet sits.
    m.sheets.forEach(function (sh) {
      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(m.extent * 2 + 0.6, m.extent * 2 + 0.6),
        cityMaterial(THREE, sh.colour, { opacity: sh.opacity, doubleSided: true })
      );
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, sh.y, 0);
      S.model.add(plane);
    });

    m.marks.forEach(function (mk) {
      addBox(mk.x, mk.base + 0.6, mk.z, 0.08, 1.2, 0.08, '#ffffff');
    });

    var top = 0;
    m.buildings.forEach(function (b) { top = Math.max(top, b.base + b.height); });
    m.ground.forEach(function (g) { top = Math.max(top, g.top); });
    S.target = new THREE.Vector3(0, top * 0.35, 0);
    S.fitPts = [
      new THREE.Vector3(-m.extent, 0, -m.extent),
      new THREE.Vector3(m.extent, top + 0.4, m.extent),
      new THREE.Vector3(-m.extent, top + 0.4, m.extent),
      new THREE.Vector3(m.extent, 0, -m.extent)
    ];
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
        failMessage: 'The 3D model is unavailable on this device. The map and the parcel ' +
          'table show the same plan.',
        home: { yaw: 0, pitch: 0, dist: 1 },
        build: buildCityScene
      })
    : null;

  // Stable identity. A fresh callback each render makes React tear the viewer
  // down and rebuild it on every state change.
  function cityViewerAttach(node) { if (CITY_VIEWER) CITY_VIEWER.attach(node || null); }

  // ===================================================================
  // SECTION 4 - PRESENTATION HELPERS
  // ===================================================================

  var STORE_KEY = 'allo_citylab_plan_v1';

  // How many edits the limited-move challenge grants. Sized so a student
  // cannot shuffle land uses until the dashboard turns green, but can still
  // build a district and the streets to reach it if they plan it first.
  var CHALLENGE_MOVES = 45;

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
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var INDICATOR_LABELS = {
    newUnitsServed: 'New homes a road reaches',
    totalUnitsServed: 'Total homes a road reaches',
    unitsUnserved: 'Homes zoned but not reached by a road',
    builtAreaHa: 'Built land (ha)',
    farmlandConvertedHa: 'Farmland converted (ha)',
    preserveConvertedHa: 'Preserve converted (ha)',
    newUnitsInFloodplain: 'New homes in the floodplain',
    existingUnitsInFloodplain: 'Existing homes in the floodplain',
    parkHa: 'Park land (ha)',
    farmHa: 'Farmland in production (ha)',
    parkAccessPct: 'Homes within a 5-minute walk of a park',
    parkAccessPctAsCrowFlies: 'The same, measured as the crow flies',
    civicAccessPct: 'Homes within a 10-minute walk of a school or clinic',
    newRoadMetres: 'New road built (m)',
    runoffCoefficient: 'Area-weighted runoff coefficient C',
    peakRunoffQ: 'Peak runoff Q (cubic metres per second)',
    baselineRunoffQ: 'Baseline peak runoff today',
    runoffRatio: 'Runoff versus today',
    capitalCost: 'Public infrastructure cost',
    population: 'Residents (capacity)',
    parkHaPer1000: 'Park hectares per 1,000 residents',
    waterDemandM3PerDay: 'Water demand (cubic metres per day)',
    waterHeadroomM3PerDay: 'Water left under the safe yield',
    newUnitsInFutureSurge: 'New homes inside the 2050 surge reach',
    existingUnitsInFutureSurge: 'Existing homes inside the 2050 surge reach',
    landAtRiskHa: 'Land dry today, inside the 2050 reach (ha)'
  };

  function fmtIndicator(id, v) {
    if (v === undefined || v === null) return '-';
    if (id === 'parkAccessPct' || id === 'parkAccessPctAsCrowFlies' ||
        id === 'civicAccessPct') return fmtPct(v);
    if (id === 'capitalCost') return fmtMoney(v);
    if (id === 'runoffCoefficient') return v.toFixed(3);
    if (id === 'peakRunoffQ' || id === 'baselineRunoffQ') return v.toFixed(2);
    if (id === 'runoffRatio') return (v * 100).toFixed(0) + '% of today';
    if (id === 'parkHaPer1000') return v.toFixed(2);
    if (id === 'population') return Math.round(v).toLocaleString();
    return Math.round(v).toLocaleString();
  }

  // A difference is not the same shape as a level. A ratio that moves from
  // 124% to 116% of today has fallen 8 percentage POINTS; rendering that as
  // "-8% of today" would be a different and wrong claim.
  function fmtDelta(id, delta) {
    var sign = delta > 0 ? '+' : '';
    if (id === 'runoffRatio' || id === 'parkAccessPct' ||
        id === 'parkAccessPctAsCrowFlies' || id === 'civicAccessPct') {
      return sign + (delta * 100).toFixed(0) + ' points';
    }
    if (id === 'capitalCost') return fmtMoney(delta);
    if (id === 'runoffCoefficient') return sign + delta.toFixed(3);
    if (id === 'peakRunoffQ' || id === 'baselineRunoffQ') return sign + delta.toFixed(2);
    if (id === 'parkHaPer1000') return sign + delta.toFixed(2);
    return sign + Math.round(delta).toLocaleString();
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

  // ===================================================================
  // SECTION 5 - REGISTRATION
  // ===================================================================

  window.StemLab.registerTool('cityLab', {
    icon: '🏙️',
    label: 'City Planning Lab',
    // This string is not decoration: dev-tools/build_tool_index.cjs harvests it
    // into the capability index, which is how STEM Lab search finds features
    // that live INSIDE a tool. It has to name what the tool actually teaches.
    desc: 'Design a town under conflicting constraints. Three towns: Riverbend has stormwater and a bond, Mesa Hollow a fixed aquifer and irrigation water, Harborlight sea level rise and storm surge by 2050. Rational-method runoff, walk distance, costed roads, a 3D model. Redlining and urban renewal as documented history.',
    color: 'teal',
    category: 'engineering',
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
      'riverbend', 'mesa hollow', 'harborlight', '3d city', 'massing'],

    models: window.__alloCityLabPure,

    questHooks: [
      { id: 'city_units', label: 'House 1,200 families on streets that reach them', icon: '🏠',
        check: function (d) { return !!(d && d.metUnits); } },
      { id: 'city_all_hard', label: 'Meet all four hard requirements at once', icon: '✅',
        check: function (d) { return !!(d && d.metAllHard); } },
      { id: 'city_assumptions', label: 'Run your plan under two assumption sets', icon: '⚖️',
        check: function (d) { return !!(d && d.comparedSets); } },
      { id: 'city_robust', label: 'Find a conclusion that holds under both sets', icon: '🔍',
        check: function (d) { return !!(d && d.foundRobust); } },
      { id: 'city_predict', label: 'Predict three times before the scorecard updates', icon: '🎯',
        check: function (d) { return !!(d && (d.predictions || 0) >= 3); } },
      { id: 'city_memo', label: 'Write the memo naming the trade-off you accepted', icon: '📝',
        check: function (d) { return !!(d && d.memoDone); } }
    ],

    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR || function () {};
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var isDark = ctx.theme !== 'light';

      // Every hook is declared unconditionally, before any branching. A hook
      // after a render-time conditional is the TDZ crash class that has bitten
      // other tools in this lab on navigation.
      var stPlan = React.useState(function () {
        try {
          var raw = window.localStorage.getItem(STORE_KEY);
          if (raw) {
            var saved = JSON.parse(raw);
            if (saved && saved.v === 1 && SCENARIOS[saved.scenarioId] && saved.uses) {
              var merged = basePlan(saved.scenarioId);
              merged.uses = Object.assign(merged.uses, saved.uses);
              merged.edges = Object.assign(merged.edges, saved.edges || {});
              merged.greenInfra = saved.greenInfra || {};
              merged.assumptionSetId = saved.assumptionSetId || 'central';
              merged.memo = saved.memo || merged.memo;
              merged.predictions = saved.predictions || [];
              merged.editCount = saved.editCount || 0;
              return merged;
            }
          }
        } catch (_) { /* corrupt or unavailable storage falls back to a fresh plan */ }
        return basePlan();
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
      var cmpA = stCmpA[0], setCmpA = stCmpA[1];
      var stCmpB = React.useState('optimistic');
      var cmpB = stCmpB[0], setCmpB = stCmpB[1];
      var stCompared = React.useState(false);
      var compared = stCompared[0], setCompared = stCompared[1];
      var stPredict = React.useState(null);
      var predictPrompt = stPredict[0], setPredictPrompt = stPredict[1];
      var stPredictResult = React.useState('');
      var predictResult = stPredictResult[0], setPredictResult = stPredictResult[1];
      // Where the runoff coefficient stood when the last prediction was
      // resolved. Null until the first edit establishes it.
      var checkpointRef = React.useRef(null);
      // Undo history holds whole plans. They are pure data and small, so this
      // is a plain array rather than a diff log, and it cannot drift from the
      // plan it describes.
      var stHist = React.useState({ past: [], future: [] });
      var hist = stHist[0], setHist = stHist[1];
      // The caller owns the camera, so it lives here. Omit any of these from a
      // push and the scene freezes at its opening angle.
      var stCam = React.useState({ rotY: 34, rotX: 26, zoom: 1 });
      var cam = stCam[0], setCam = stCam[1];
      var stFull = React.useState(false);
      var fullscreen = stFull[0], setFullscreen = stFull[1];
      var stGl = React.useState(CITY_VIEWER ? CITY_VIEWER.status() : 'failed');
      var glStatus = stGl[0], setGlStatus = stGl[1];
      var dragRef = React.useRef(null);
      var stBoardView = React.useState('use');   // 'use' | 'elevation' | 'model'
      var boardView = stBoardView[0], setBoardView = stBoardView[1];
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

      var d = (ctx.toolData && ctx.toolData._cityLab) || {};

      function upd(patch) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._cityLab) || {}, patch);
          var next = Object.assign({}, prev);
          next._cityLab = cur;
          return next;
        });
      }

      // Persist on every plan change. The plan is pure data, so this is a
      // straight serialize with nothing to strip.
      React.useEffect(function () {
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify(plan)); } catch (_) {}
      }, [plan]);

      React.useEffect(function () {
        if (!CITY_VIEWER) return;
        CITY_VIEWER.onStatusChange(setGlStatus);
        return function () { CITY_VIEWER.onStatusChange(null); };
      }, []);

      // Push after paint, never during render. `static: true` means the viewer
      // draws this frame and then stops until something changes again.
      React.useEffect(function () {
        if (!CITY_VIEWER || boardView !== 'model') return;
        CITY_VIEWER.push({
          sig: massingSignature(plan, plan.assumptionSetId, selected),
          massing: buildMassing(plan, plan.assumptionSetId, selected),
          rotY: cam.rotY, rotX: cam.rotX, zoom: cam.zoom,
          dark: isDark,
          static: true
        });
      });

      var report = constraintReport(plan, plan.assumptionSetId);
      var sc = report.scorecard;

      React.useEffect(function () {
        var patch = {};
        if (report.rows[0].met) patch.metUnits = true;
        if (report.allHardMet) patch.metAllHard = true;
        if (plan.memo && plan.memo.bindingConstraint && plan.memo.tradeoff) patch.memoDone = true;
        patch.predictions = (plan.predictions || []).length;
        if (Object.keys(patch).length) upd(patch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [report.rows[0].met, report.allHardMet, plan.memo.bindingConstraint, plan.memo.tradeoff,
        (plan.predictions || []).length]);

      // ---- theme tokens, defined for BOTH themes so neither borrows the other
      var ink = isDark ? '#e2e8f0' : '#1e293b';
      var dim = isDark ? '#94a3b8' : '#475569';
      var panelBg = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)';
      var panelBorder = isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)';
      var okColour = '#1baf7a';
      var missColour = '#eb6834';

      function panel(key, title, children) {
        return h('section', { key: key, className: 'rounded-xl border p-3 mb-3',
          style: { background: panelBg, borderColor: panelBorder } },
          title ? h('h3', { className: 'text-[12px] font-black mb-2', style: { color: ink } }, title) : null,
          children);
      }

      // ---- edits, all announced with the DELTA rather than just the action
      function applyPlan(next, message, skipHistory) {
        if (next === plan) {
          // The commonest reason an edit produces no change is a spent move
          // budget, and silence there reads as a broken control.
          if (outOfMoves(plan)) {
            announceToSR('No moves left in this challenge. Undo to take one back, ' +
              'or end the challenge to keep planning.');
          }
          return;
        }
        var before = sc;
        var after = scorecard(next, next.assumptionSetId);
        if (!skipHistory) setHist({ past: hist.past.concat([plan]).slice(-50), future: [] });
        setPlan(next);
        var dUnits = after.tier1.newUnitsServed - before.tier1.newUnitsServed;
        var dC = after.tier2.runoffCoefficient - before.tier2.runoffCoefficient;
        var dCost = after.tier2.capitalCost - before.tier2.capitalCost;
        var parts = [message];
        parts.push('New homes ' + after.tier1.newUnitsServed +
          (dUnits ? ', ' + (dUnits > 0 ? 'up ' : 'down ') + Math.abs(dUnits) : ', unchanged') + '.');
        parts.push('Runoff coefficient ' + after.tier2.runoffCoefficient.toFixed(3) +
          (Math.abs(dC) > 0.0005 ? ', ' + (dC > 0 ? 'up ' : 'down ') + Math.abs(dC).toFixed(3) : ', unchanged') + '.');
        parts.push('Cost ' + fmtMoney(after.tier2.capitalCost) +
          (dCost ? ', ' + (dCost > 0 ? 'up ' : 'down ') + fmtMoney(Math.abs(dCost)) : ', unchanged') + '.');
        announceToSR(parts.join(' '));

        // Predict-then-place. Never punitive, never scored, and only offered
        // once every six edits so it stays an invitation rather than a nag.
        //
        // The prompt carries the coefficient as it stood at the LAST
        // checkpoint, not as it stands now. Storing the current value was a
        // real bug: it made the question unanswerable, because the thing the
        // student is asked to predict had already been folded into the number
        // being kept as the baseline.
        var edits = next.editCount || 0;
        if (checkpointRef.current === null) {
          checkpointRef.current = { edits: edits, C: before.tier2.runoffCoefficient };
        }
        if (edits - checkpointRef.current.edits >= 6 && !predictPrompt) {
          setPredictPrompt({
            indicator: 'runoffCoefficient',
            fromC: checkpointRef.current.C,
            fromEdits: checkpointRef.current.edits
          });
        }
      }

      // Switching town is opening a different problem, not editing this one.
      // The outgoing plan goes onto the undo stack, so a mis-click costs one
      // press of Undo rather than an afternoon of work.
      function switchScenario(id) {
        if (!SCENARIOS[id] || id === plan.scenarioId) return;
        var next = basePlan(id);
        setHist({ past: hist.past.concat([plan]).slice(-50), future: [] });
        setPlan(next);
        setSelected(SCENARIOS[id].coreParcel);
        setCompared(false);
        setConfirmReset(false);
        announceToSR('Opened ' + SCENARIOS[id].town + '. ' + SCENARIOS[id].blurb +
          ' Your previous plan is one Undo away.');
      }

      function undo() {
        if (!hist.past.length) { announceToSR('Nothing to undo.'); return; }
        var prev = hist.past[hist.past.length - 1];
        setHist({ past: hist.past.slice(0, -1), future: [plan].concat(hist.future).slice(0, 50) });
        setPlan(prev);
        var after = scorecard(prev, prev.assumptionSetId);
        announceToSR('Undone. New homes ' + after.tier1.newUnitsServed +
          ', cost ' + fmtMoney(after.tier2.capitalCost) + '.');
      }

      function redo() {
        if (!hist.future.length) { announceToSR('Nothing to redo.'); return; }
        var next = hist.future[0];
        setHist({ past: hist.past.concat([plan]).slice(-50), future: hist.future.slice(1) });
        setPlan(next);
        var after = scorecard(next, next.assumptionSetId);
        announceToSR('Redone. New homes ' + after.tier1.newUnitsServed +
          ', cost ' + fmtMoney(after.tier2.capitalCost) + '.');
      }

      // Arrow keys walk the grid, digits assign land use, g toggles green
      // infrastructure. Tab still works parcel by parcel; this exists because
      // tabbing across 144 cells to reach the far corner is not a real path.
      function focusParcel(id) {
        setSelected(id);
        if (typeof document === 'undefined') return;
        var node = document.getElementById('citylab-parcel-' + id);
        if (node && node.focus) node.focus();
      }

      function boardKeyDown(e, id) {
        var col = parcelCol(id), row = parcelRow(id), target = null;
        if (e.key === 'ArrowUp' && row > 1) target = pid(col, row - 1);
        else if (e.key === 'ArrowDown' && row < N_ROWS) target = pid(col, row + 1);
        else if (e.key === 'ArrowLeft' && col > 0) target = pid(col - 1, row);
        else if (e.key === 'ArrowRight' && col < N_COLS - 1) target = pid(col + 1, row);
        else if (e.key === 'Home') target = pid(0, row);
        else if (e.key === 'End') target = pid(N_COLS - 1, row);
        if (target) { e.preventDefault(); focusParcel(target); return; }

        if (e.key === '?') { e.preventDefault(); setShowShortcuts(true); return; }
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          applyPlan(toggleGreenInfra(plan, id), id + ' green infrastructure toggled.');
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          var slot = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
          var useId = PALETTE_IDS[slot];
          if (!useId) return;
          e.preventDefault();
          applyPlan(setUse(plan, id, useId), id + ' set to ' + useLabel(useId, plan) + '.');
        }
      }

      function answerPrediction(guess) {
        var fromC = predictPrompt.fromC;
        var nowC = sc.tier2.runoffCoefficient;
        var delta = nowC - fromC;
        var actual = Math.abs(delta) < 0.002 ? 'about the same' : (delta > 0 ? 'up' : 'down');
        var right = guess === actual;
        setPredictPrompt(null);
        checkpointRef.current = { edits: plan.editCount, C: nowC };
        setPlan(function (prev) {
          var next = clonePlan(prev);
          next.predictions = (next.predictions || []).concat([{
            at: prev.editCount, indicator: 'runoffCoefficient',
            guess: guess, actual: actual, fromC: fromC, toC: nowC
          }]);
          return next;
        });
        // Revealed, because a prediction you never get to check is not a
        // prediction. Said plainly and without praise or penalty either way.
        setPredictResult(right
          ? 'You said ' + guess + ', and it went ' + actual + ': ' + fromC.toFixed(3) +
            ' to ' + nowC.toFixed(3) + '. Nothing is scored here.'
          : 'You said ' + guess + '. It actually went ' + actual + ': ' + fromC.toFixed(3) +
            ' to ' + nowC.toFixed(3) + '. Worth a look at which parcels moved it. ' +
            'Nothing is scored here.');
        announceToSR('You said ' + guess + '. It went ' + actual + ', from ' +
          fromC.toFixed(3) + ' to ' + nowC.toFixed(3) + '.');
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

        var cells = ids.map(function (id) {
          var terr = terrainAt(id, plan);
          var use = USE_BY_ID[plan.uses[id]];
          var isSel = id === selected;
          var units = unitsOnParcel(plan, id);
          var reach = parkDist[id];
          var hasPark = reach !== undefined && reach <= sc.parkHopLimit;
          var noPark = units > 0 && served[id] && !hasPark;
          var parcelFill = boardView === 'elevation' && use.id !== 'water'
            ? terrainColour(terr.elevationM, minElev, maxElev)
            : use.fill;
          var parcelInk = readableInk(parcelFill);
          // Dry today, inside the reach the board asked you to plan for.
          var atRisk = scen.modelsSeaRise && !terr.floodplain &&
            inFutureSurge(id, plan, assumptions);
          var label = id + ', ' + useLabel(use.id, plan) +
            (units ? ', ' + units + ' homes' : '') +
            (terr.floodplain ? ', in ' + scen.floodLabel : '') +
            (atRisk ? ', dry today but inside the 2050 reach' : '') +
            (plan.greenInfra[id] ? ', green infrastructure' : '') +
            (units && !served[id] ? ', NOT reached by a road' : '') +
            (units && served[id] ? (hasPark
              ? ', park within a 5 minute walk' : ', no park within a 5 minute walk') : '') +
            ', elevation ' + terr.elevationM + ' metres';
          return h('button', {
            key: id, id: 'citylab-parcel-' + id, type: 'button', 'aria-label': label,
            'aria-pressed': isSel ? 'true' : 'false',
            onKeyDown: function (e) { boardKeyDown(e, id); },
            onClick: function () { setSelected(id); },
            // The land-use code sits in the CORNER, not the centre. Roads are
            // drawn centre to centre, and a centred label put the two on top of
            // each other: the main street made row 6 unreadable in both themes.
            className: 'relative text-[9px] font-black hover:brightness-110',
            style: {
              aspectRatio: '1 / 1',
              // backgroundColor, NOT the `background` shorthand. The shorthand
              // resets background-image, so on a re-render React could reapply
              // it after the pattern and silently wipe the fill pattern. React
              // warns about exactly this mix, and the warning is right.
              backgroundColor: parcelFill,
              backgroundImage: boardView === 'elevation'
                ? 'none'
                : patternCss(use.pattern, 'rgba(255,255,255,0.55)'),
              backgroundSize: use.pattern === 'dots' ? '6px 6px' : 'auto',
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
                isSel ? '0 0 0 3px #ffffff, 0 0 0 5px #2a78d6' : ''
              ].filter(Boolean).join(', ') || 'none',
              zIndex: isSel ? 2 : 'auto',
              cursor: 'pointer'
            }
          },
            h('span', { 'aria-hidden': 'true', className: 'absolute top-0 left-0 leading-none',
              style: { padding: '1px 2px' } }, use.code),
            plan.greenInfra[id]
              ? h('span', { 'aria-hidden': 'true', className: 'absolute top-0 right-0 text-[8px] leading-none',
                  style: { color: '#bbf7d0', padding: '1px 2px' } }, '●')
              : null,
            units > 0 && !served[id]
              ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 left-0 text-[9px]',
                  style: { color: '#fecaca' } }, '!')
              : null,
            noPark
              ? h('span', { 'aria-hidden': 'true', className: 'absolute bottom-0 right-0 text-[9px]',
                  style: { color: '#fef08a' } }, '*')
              : null
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

        return h('div', { className: 'relative w-full', style: { maxWidth: '520px' } },
          h('div', { className: 'grid gap-0', style: { gridTemplateColumns: 'repeat(12, 1fr)' } }, cells),
          h('div', { 'aria-hidden': 'true', className: 'absolute inset-0' }, lines)
        );
      }

      function boardControls() {
        function ctlBtn(label, onClick, disabled, aria) {
          return h('button', {
            type: 'button', onClick: onClick, disabled: !!disabled, 'aria-label': aria || label,
            className: 'text-[11px] font-bold px-2 py-1 rounded border',
            style: { background: panelBg, color: ink, borderColor: panelBorder,
              opacity: disabled ? 0.45 : 1 }
          }, label);
        }
        return h('div', { className: 'flex flex-wrap items-center gap-1.5 mb-2' },
          ctlBtn('Undo', undo, !hist.past.length,
            hist.past.length ? 'Undo the last change, ' + hist.past.length + ' available' : 'Nothing to undo'),
          ctlBtn('Redo', redo, !hist.future.length,
            hist.future.length ? 'Redo, ' + hist.future.length + ' available' : 'Nothing to redo'),
          ctlBtn('Keyboard shortcuts', function () { setShowShortcuts(!showShortcuts); }, false,
            (showShortcuts ? 'Hide' : 'Show') + ' the keyboard shortcuts'),
          typeof plan.moveBudget === 'number'
            ? h('span', { className: 'text-[11px] font-bold px-2 py-1 rounded', role: 'status',
                style: { background: movesLeft(plan) ? 'rgba(42,120,214,0.18)' : 'rgba(235,104,52,0.18)',
                  color: movesLeft(plan) ? ink : missColour } },
                movesLeft(plan) + ' of ' + plan.moveBudget + ' moves left')
            : null,
          typeof plan.moveBudget === 'number'
            ? ctlBtn('End challenge', function () {
                applyPlan(Object.assign(clonePlan(plan), { moveBudget: null }),
                  'Limited-move challenge ended. The plan you built is kept.');
              }, false, 'End the limited-move challenge and keep planning')
            : ctlBtn('Limited moves', function () {
                applyPlan(startChallenge(plan.scenarioId, CHALLENGE_MOVES),
                  'Limited-move challenge started in ' + scen.town + ' with ' + CHALLENGE_MOVES +
                  ' moves, from the town as it stands today.');
              }, false,
              'Start a limited-move challenge: ' + CHALLENGE_MOVES +
              ' edits from the town as it stands today'),
          h('span', { className: 'inline-flex rounded border overflow-hidden',
            role: 'group', 'aria-label': 'Map view',
            style: { borderColor: panelBorder } },
            [['use', 'Land use'], ['elevation', 'Height'], ['model', '3D']].map(function (kv) {
              var on = boardView === kv[0];
              return h('button', {
                key: kv[0], type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': 'Show the map by ' + kv[1].toLowerCase(),
                onClick: function () {
                  setBoardView(kv[0]);
                  announceToSR(kv[0] === 'elevation'
                    ? 'Map now shaded by ground height, pale is higher. Land use codes stay on ' +
                      'every parcel and every parcel still reads out its own use and elevation.'
                    : kv[0] === 'model'
                      ? 'Showing the 3D model. It is a view only: use the Land use map or the ' +
                        'parcel table to change the plan. Buttons below the model move the camera.'
                      : 'Map now coloured by land use.');
                },
                className: 'text-[11px] font-bold px-2 py-1',
                style: { background: on ? '#2a78d6' : panelBg, color: on ? '#ffffff' : ink }
              }, kv[1]);
            })),
          h('span', { className: 'text-[10px] ml-auto', style: { color: dim } },
            'Selected: ' + selected));
      }

      var SHORTCUTS = [
        ['Arrow keys', 'Move around the grid'],
        ['Home / End', 'Jump to the west or east edge of the row'],
        ['Enter or Space', 'Select the parcel under the cursor'],
        ['1 to 9, then 0', 'Set land use, in the order shown in the palette below the map'],
        ['G', 'Add or remove green infrastructure on this parcel'],
        ['?', 'Open this list']
      ];

      function shortcutsPanel() {
        if (!showShortcuts) return null;
        return h('div', { className: 'mt-2 rounded-lg border p-2',
          style: { background: panelBg, borderColor: panelBorder } },
          h('div', { className: 'flex items-baseline justify-between gap-2 mb-1' },
            h('h4', { className: 'text-[11px] font-black', style: { color: ink } }, 'Keyboard'),
            h('button', {
              type: 'button', onClick: function () { setShowShortcuts(false); },
              className: 'text-[10px] font-bold underline', style: { color: '#2a78d6' }
            }, 'Close')),
          h('dl', { className: 'text-[10px] grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5' },
            SHORTCUTS.map(function (row, i) {
              return h(React.Fragment, { key: i },
                h('dt', { className: 'font-bold', style: { color: ink } }, row[0]),
                h('dd', { style: { color: dim } }, row[1]));
            })),
          h('p', { className: 'text-[10px] mt-1.5', style: { color: dim } },
            'Land use order: ' + PALETTE_IDS.map(function (uid, i) {
              return (i === 9 ? '0' : String(i + 1)) + ' ' + useLabel(uid, plan);
            }).join(', ') + '.'));
      }

      // A hectare is abstract until you can see how far 100 m is.
      function scaleBar() {
        return h('div', { className: 'flex items-center gap-1.5 mt-1.5', 'aria-hidden': 'true' },
          h('span', { className: 'inline-block',
            style: { width: (100 / N_COLS) + '%', height: '4px', background: ink,
              borderLeft: '2px solid ' + ink, borderRight: '2px solid ' + ink } }),
          h('span', { className: 'text-[10px]', style: { color: dim } },
            '100 m, one parcel, one hectare'));
      }

      function elevationKey() {
        var ids = allParcelIds();
        var elevs = ids.map(function (id) { return terrainAt(id, plan).elevationM; });
        var lo = Math.min.apply(null, elevs), hi = Math.max.apply(null, elevs);
        return h('div', { className: 'mt-2' },
          h('div', { className: 'flex items-center gap-1.5' },
            h('span', { className: 'text-[10px]', style: { color: dim } }, lo + ' m'),
            h('span', { 'aria-hidden': 'true', className: 'flex-1 flex h-2 rounded overflow-hidden' },
              TERRAIN_RAMP.map(function (c, i) {
                return h('span', { key: i, className: 'flex-1', style: { background: c } });
              })),
            h('span', { className: 'text-[10px]', style: { color: dim } }, hi + ' m')),
          h('p', { className: 'text-[10px] mt-1', style: { color: dim } },
            'Ground height, low and dark to high and pale. Land use codes stay on every ' +
            'parcel, and the bay keeps its own colour. Switch back to Land use to zone.'));
      }

      function orbit(dRotY, dRotX, dZoom) {
        setCam(function (c) {
          return {
            rotY: (c.rotY + (dRotY || 0) + 360) % 360,
            rotX: Math.max(-5, Math.min(80, c.rotX + (dRotX || 0))),
            zoom: Math.max(0.5, Math.min(3, c.zoom * (dZoom || 1)))
          };
        });
      }

      function modelView() {
        var m = buildMassing(plan, plan.assumptionSetId, selected);
        var failed = !CITY_VIEWER || glStatus === 'failed';

        // No WebGL is not an error to shout about. The map and the table carry
        // the same plan, and this view was never the only way to see it.
        if (failed) {
          return h('div', { className: 'rounded-lg border p-3',
            style: { background: panelBg, borderColor: panelBorder } },
            h('p', { className: 'text-[11px] font-bold', style: { color: ink } },
              'The 3D model is not available on this device.'),
            h('p', { className: 'text-[11px] mt-1', style: { color: dim } },
              'Nothing is missing from your plan. Switch back to Land use or Height, or open ' +
              'the Parcel table: all three show the same thing, and every number on the ' +
              'scorecard is computed from the plan, not from the picture.'));
        }

        function camBtn(label, aria, fn) {
          return h('button', {
            type: 'button', onClick: fn, 'aria-label': aria,
            className: 'text-[11px] font-bold px-2 py-1 rounded border',
            style: { background: panelBg, color: ink, borderColor: panelBorder }
          }, label);
        }

        return h('div', null,
          h('div', {
            className: 'relative w-full rounded-lg overflow-hidden',
            style: { height: fullscreen ? '68vh' : '340px',
              background: isDark ? '#0b1220' : '#dfe6ef', touchAction: 'none' },
            onPointerDown: function (e) {
              dragRef.current = { x: e.clientX, y: e.clientY };
              if (e.currentTarget.setPointerCapture) {
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
              }
            },
            onPointerMove: function (e) {
              if (!dragRef.current) return;
              var dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
              dragRef.current = { x: e.clientX, y: e.clientY };
              orbit(dx * 0.4, -dy * 0.3, 1);
            },
            onPointerUp: function () { dragRef.current = null; },
            onPointerCancel: function () { dragRef.current = null; }
          },
            h('div', { ref: cityViewerAttach, className: 'absolute inset-0' }),
            glStatus === 'loading'
              ? h('p', { className: 'absolute inset-0 flex items-center justify-center text-[11px]',
                  style: { color: dim } }, 'Building the model...')
              : null),

          // Drag is not a path everyone has. Every camera move is also a button.
          h('div', { className: 'flex flex-wrap gap-1.5 mt-2', role: 'group',
            'aria-label': 'Move the camera' },
            camBtn('Turn left', 'Turn the model left', function () { orbit(-20, 0, 1); }),
            camBtn('Turn right', 'Turn the model right', function () { orbit(20, 0, 1); }),
            camBtn('Tilt down', 'Look at the model from lower down', function () { orbit(0, -10, 1); }),
            camBtn('Tilt up', 'Look at the model from higher up', function () { orbit(0, 10, 1); }),
            camBtn('Closer', 'Move the camera closer', function () { orbit(0, 0, 0.85); }),
            camBtn('Further', 'Move the camera further away', function () { orbit(0, 0, 1.18); }),
            camBtn('Reset view', 'Return the camera to its starting angle',
              function () { setCam({ rotY: 34, rotX: 26, zoom: 1 }); }),
            camBtn(fullscreen ? 'Exit full screen' : 'Full screen',
              fullscreen ? 'Leave full screen' : 'Show the model full screen',
              function () { setFullscreen(!fullscreen); })),

          h('p', { className: 'text-[11px] mt-2', style: { color: dim } },
            'Blocks are indicative massing at ' + m.metresPerStorey + ' m a storey, not a ' +
            'modelled building height, and nothing on the scorecard reads them. Heights are ' +
            'exaggerated ' + m.verticalExaggeration + ' times so the ground shows at all: ' +
            'this town runs from ' + m.minElevationM + ' m to ' + m.maxElevationM + ' m.'),
          m.sheets.length
            ? h('p', { className: 'text-[11px] mt-1', style: { color: ink } },
                'The two sheets are the surge reach today and the reach planned for 2050. ' +
                'Watch which GROUND goes under when you change assumption set in the ' +
                'Assumption Lab, rather than how far the sheet lifts: a 0.6 m difference is ' +
                'nothing beside a building, and it is a great deal of land.')
            : null,
          h('p', { className: 'text-[11px] mt-1', style: { color: dim } },
            'This is a view, not a workspace. Zoning, roads and everything else happen on the ' +
            'map or in the parcel table, and the model follows what you do there.'));
      }

      function legend() {
        return h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
          PALETTE_IDS.concat(['water']).map(function (uid) {
            var u = USE_BY_ID[uid];
            return h('span', { key: uid, className: 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
              style: { background: panelBg, border: '1px solid ' + panelBorder, color: ink } },
              h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
                style: { width: '11px', height: '11px', backgroundColor: u.fill,
                  backgroundImage: patternCss(u.pattern, 'rgba(255,255,255,0.6)'),
                  backgroundSize: u.pattern === 'dots' ? '5px 5px' : 'auto' } }),
              u.code + ' ' + useLabel(u.id, plan));
          }));
      }

      // ---- parcel inspector
      function inspector() {
        var terr = terrainAt(selected, plan);
        var use = USE_BY_ID[plan.uses[selected]];
        var served = servedParcels(plan);
        var water = isWater(selected, plan);

        return panel('inspect',
          h('span', { className: 'inline-flex items-center gap-1.5' },
            h('span', { 'aria-hidden': 'true', className: 'inline-block rounded-sm',
              style: { width: '13px', height: '13px', backgroundColor: use.fill,
                backgroundImage: patternCss(use.pattern, 'rgba(255,255,255,0.6)'),
                backgroundSize: use.pattern === 'dots' ? '5px 5px' : 'auto',
                outline: '1px solid rgba(15,23,42,0.4)' } }),
            'Parcel ' + selected),
          h('div', null,
            h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
              useLabel(use.id, plan) + '. ' + terr.elevationM + ' m elevation. ' +
              (terr.floodplain ? 'Inside ' + scen.floodLabel + '. ' : 'Outside ' + scen.floodLabel + '. ') +
              (unitsOnParcel(plan, selected) > 0
                ? (served[selected] ? 'A road reaches it.' : 'No road reaches it, so its homes are not counted.')
                : '') +
              ' Runoff coefficient C = ' + effectiveC(plan, selected, SET_BY_ID[plan.assumptionSetId]).toFixed(2) + '.'),

            water
              ? h('p', { className: 'text-[11px] font-bold', style: { color: dim } },
                  'The river is terrain, not zoning. It cannot be built on.')
              : h('div', null,
                  h('div', { className: 'text-[11px] font-bold mb-1', style: { color: ink } }, 'Land use'),
                  h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                    PALETTE_IDS.map(function (uid) {
                      var u = USE_BY_ID[uid];
                      var active = plan.uses[selected] === uid;
                      return h('button', {
                        key: uid, type: 'button',
                        'aria-pressed': active ? 'true' : 'false',
                        'aria-label': 'Set parcel ' + selected + ' to ' + useLabel(u.id, plan) +
                          (u.units ? ', ' + u.units + ' homes per hectare' : '') + ', runoff coefficient ' + u.C,
                        onClick: function () {
                          applyPlan(setUse(plan, selected, uid), selected + ' set to ' + useLabel(u.id, plan) + '.');
                        },
                        className: 'text-[10px] font-bold px-1.5 py-1 rounded border',
                        style: {
                          background: active ? u.fill : panelBg,
                          color: active ? '#ffffff' : ink,
                          borderColor: active ? u.fill : panelBorder
                        }
                      },
                        h('span', { 'aria-hidden': 'true',
                          className: 'inline-block rounded-sm mr-1 align-[-1px]',
                          style: { width: '9px', height: '9px', backgroundColor: u.fill,
                            backgroundImage: patternCss(u.pattern, 'rgba(255,255,255,0.65)'),
                            backgroundSize: u.pattern === 'dots' ? '4px 4px' : 'auto',
                            outline: '1px solid rgba(15,23,42,0.35)' } }),
                        useLabel(u.id, plan) + (u.units ? ' (' + u.units + '/ha)' : ''));
                    })),

                  h('button', {
                    type: 'button',
                    disabled: !canGreenInfra(plan.uses[selected]),
                    'aria-pressed': plan.greenInfra[selected] ? 'true' : 'false',
                    onClick: function () {
                      applyPlan(toggleGreenInfra(plan, selected),
                        selected + ' green infrastructure ' + (plan.greenInfra[selected] ? 'removed' : 'added') + '.');
                    },
                    className: 'text-[11px] font-bold px-2 py-1 rounded border w-full mb-2',
                    style: {
                      background: plan.greenInfra[selected] ? okColour : panelBg,
                      color: plan.greenInfra[selected] ? '#ffffff'
                        : (canGreenInfra(plan.uses[selected]) ? ink : dim),
                      borderColor: panelBorder,
                      opacity: canGreenInfra(plan.uses[selected]) ? 1 : 0.5
                    }
                  }, canGreenInfra(plan.uses[selected])
                    ? (plan.greenInfra[selected] ? 'Remove' : 'Add') + ' green infrastructure (' +
                      fmtMoney(COSTS.green_infra_per_ha) + '/ha)'
                    : 'Green infrastructure would change nothing here (this land already drains)')),

            h('div', { className: 'text-[11px] font-bold mb-1 mt-1', style: { color: ink } }, 'Build a connection'),
            h('div', { className: 'flex gap-1 mb-1' },
              [['local', 'Local road'], ['path', 'Walking path']].map(function (kv) {
                return h('button', {
                  key: kv[0], type: 'button',
                  'aria-pressed': roadKind === kv[0] ? 'true' : 'false',
                  onClick: function () { setRoadKind(kv[0]); },
                  className: 'text-[10px] font-bold px-2 py-1 rounded border flex-1',
                  style: { background: roadKind === kv[0] ? '#2a78d6' : panelBg,
                    color: roadKind === kv[0] ? '#ffffff' : ink, borderColor: panelBorder }
                }, kv[1]);
              })),
            h('div', { className: 'grid grid-cols-2 gap-1' },
              neighbours(selected).map(function (n) {
                var key = edgeKey(selected, n.id);
                var existing = plan.edges[key];
                var isBase = !!basePlan(plan.scenarioId).edges[key];
                var bridge = edgeIsBridge(key, plan);
                var cost = bridge
                  ? (roadKind === 'path' ? COSTS.bridge_path : COSTS.bridge_road)
                  : (roadKind === 'path' ? COSTS.path : COSTS.road_local);
                var verb = existing ? (isBase ? 'Already there' : 'Remove') : 'Build';
                return h('button', {
                  key: n.dir, type: 'button',
                  disabled: isBase,
                  'aria-label': verb + ' connection ' + n.dir + ' to ' + n.id +
                    (existing ? '' : ', ' + fmtMoney(cost)) + (bridge ? ', crosses the river' : ''),
                  onClick: function () {
                    applyPlan(setEdge(plan, selected, n.id, existing ? null : roadKind),
                      (existing ? 'Removed' : 'Built') + ' a connection from ' + selected + ' to ' + n.id + '.');
                  },
                  className: 'text-[10px] font-bold px-1.5 py-1 rounded border text-left',
                  style: { background: existing ? 'rgba(42,120,214,0.18)' : panelBg, color: ink,
                    borderColor: panelBorder, opacity: isBase ? 0.55 : 1 }
                }, n.dir + ' ' + n.id + ' · ' + verb + (existing || isBase ? '' : ' ' + fmtMoney(cost)) +
                   (bridge ? ' · bridge' : ''));
              }))
          ));
      }

      // ---- constraint report
      function constraints() {
        return panel('brief', 'The planning board asked for',
          h('div', null,
            h('p', { className: 'text-[11px] mb-2', style: { color: dim } }, scen.intro),
            h('ul', { className: 'space-y-1.5' },
              report.rows.map(function (row) {
                // Rendering is driven by the check's own `unit` and `floor`
                // rather than by a chain of id comparisons, so a new town's
                // requirements display correctly without touching this.
                var fmtOne = function (n) {
                  if (row.unit === 'ratio') return (n * 100).toFixed(0) + '%';
                  if (row.unit === 'money') return fmtMoney(n);
                  if (row.unit === 'percent') return fmtPct(n);
                  if (row.unit === 'hectares') return n + ' ha';
                  if (row.unit === 'water') return Math.round(n).toLocaleString() + ' m3/day';
                  return Math.round(n).toLocaleString();
                };
                var value = fmtOne(row.actual) + (row.unit === 'ratio' ? ' of today' : '');
                var target = (row.floor ? 'at least ' : 'at or under ') + fmtOne(row.target);
                return h('li', { key: row.id, className: 'text-[11px] rounded p-1.5',
                  style: { background: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(241,245,249,0.85)' } },
                  h('div', { className: 'flex items-start gap-1.5' },
                    h('span', { 'aria-hidden': 'true', style: { color: row.met ? okColour : missColour } },
                      row.met ? '✔' : '○'),
                    h('span', { style: { color: ink } },
                      h('strong', null, row.hard ? 'Required. ' : 'Target. '),
                      row.label,
                      h('br'),
                      h('span', { style: { color: row.met ? okColour : missColour, fontWeight: 700 } },
                        (row.met ? 'Met: ' : 'Not yet: ') + value),
                      h('span', { style: { color: dim } }, ' (' + target + ')'),
                      (function () {
                        var f = headroomFraction(row);
                        if (f === null) return null;
                        var width = Math.max(0, Math.min(1, f)) * 100;
                        return h('span', { 'aria-hidden': 'true',
                          className: 'block mt-1 rounded h-1.5 relative overflow-hidden',
                          style: { background: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.18)' } },
                          h('span', { className: 'block h-1.5 rounded',
                            style: { width: width + '%',
                              background: row.met ? okColour : missColour } }),
                          f <= 0 ? h('span', { className: 'absolute inset-y-0 left-0',
                            style: { width: '3px', background: missColour } }) : null);
                      })(),
                      row.detail ? h('span', { className: 'block mt-0.5', style: { color: dim } }, row.detail) : null)));
              })),
            h('p', { className: 'text-[10px] mt-2', style: { color: dim } },
              'The bar under each line is how much room is left before that requirement fails. ' +
              'A short bar means you are close to the edge of it, whether you are meeting it ' +
              'or not. Which one is tightest is for you to notice and to argue in the memo.'),
            h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink } },
              'Requirements met: ' + report.hardMet + ' of ' + report.hardTotal + ' required, ' +
              report.softMet + ' of ' + report.softTotal + ' targets.'),
            h('p', { className: 'text-[10px] mt-1', style: { color: dim } },
              'There is no single correct plan and this tool does not have one stored. It reports whether ' +
              'a plan meets the stated constraints. It does not judge whether a plan is good.')));
      }

      // ---- scorecard with the tier split made visible
      function indicatorRow(id, value, tier) {
        return h('div', { key: id, className: 'flex items-baseline justify-between gap-2 text-[11px] py-0.5' },
          h('span', { style: { color: dim } }, INDICATOR_LABELS[id] || id),
          h('span', { className: 'font-bold tabular-nums', style: { color: ink } }, fmtIndicator(id, value)));
      }

      function indicatorGroups(groups, tierIds, values, tier) {
        var visible = visibleIndicatorIds(tierIds, plan);
        return groups.map(function (g) {
          var ids = g.ids.filter(function (id) { return visible.indexOf(id) !== -1; });
          if (!ids.length) return null;
          return h('div', { key: g.label, className: 'mt-1.5' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wide mb-0.5 pb-0.5',
              style: { color: dim, borderBottom: '1px solid ' + panelBorder } }, g.label),
            ids.map(function (id) { return indicatorRow(id, values[id], tier); }));
        });
      }

      function modelDisclosure(id, title, body) {
        var open = openModel === id;
        return h('div', { key: id, className: 'mt-1' },
          h('button', {
            type: 'button', 'aria-expanded': open ? 'true' : 'false',
            onClick: function () { setOpenModel(open ? '' : id); },
            className: 'text-[10px] font-bold underline',
            style: { color: '#2a78d6' }
          }, (open ? 'Hide' : 'Open') + ' the ' + title),
          open ? h('div', { className: 'text-[10px] mt-1 p-2 rounded',
            style: { background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.9)', color: dim } }, body) : null);
      }

      function scoreboard() {
        var a = SET_BY_ID[plan.assumptionSetId];
        return panel('score', 'Scorecard',
          h('div', null,
            h('div', { className: 'text-[10px] font-black uppercase tracking-wide mb-1', style: { color: okColour } },
              'Measured'),
            h('p', { className: 'text-[10px] mb-1', style: { color: dim } },
              'Geometry and accounting over the plan as drawn. No coefficient, nothing to disagree with. ' +
              'You can check every one of these with a pencil.'),
            indicatorGroups(TIER1_GROUPS, TIER1_IDS, sc.tier1, 1),

            h('div', { className: 'text-[10px] font-black uppercase tracking-wide mb-1 mt-3',
              style: { color: '#eb6834' } }, 'Modelled'),
            h('p', { className: 'text-[10px] mb-1', style: { color: dim } },
              'A published formula with parameters. Currently using ' + a.label + '. ' +
              'Change the set in the Assumption Lab and watch which of these move.'),
            indicatorGroups(TIER2_GROUPS, TIER2_IDS, sc.tier2, 2),

            modelDisclosure('runoff', 'runoff model',
              h('div', null,
                h('p', null, 'Rational method: Q = C x i x A.'),
                h('p', null, 'C is the area-weighted runoff coefficient across all 144 parcels. ' +
                  'i is the design storm, ' + scen.designStormMmPerHour + ' mm per hour. ' +
                  'A is 144 hectares.'),
                h('p', { className: 'mt-1' }, 'Current C = ' + sc.tier2.runoffCoefficient.toFixed(3) +
                  ', so Q = ' + sc.tier2.peakRunoffQ.toFixed(2) + ' cubic metres per second, against a ' +
                  'baseline of ' + sc.tier2.baselineRunoffQ.toFixed(2) + '.'),
                h('p', { className: 'mt-1' }, 'Coefficients per land use are standard published ' +
                  'rational-method values and are listed in the parcel inspector. This set is scaled by ' +
                  a.runoffScale.toFixed(2) + ' under ' + a.label + '.'),
                h('p', { className: 'mt-1' }, 'Green infrastructure is credited as a ' +
                  a.giCredit.toFixed(2) + ' reduction in effective C, floored at the open-field value. ' +
                  'Stormwater manuals typically credit somewhere between 0.10 and 0.20 for well-maintained ' +
                  'practices, which is the range the assumption sets span.'),
                h('p', { className: 'mt-1 font-bold' }, 'Honest caveat: the rational method is a screening ' +
                  'estimate for a small watershed. It is not a drainage design and it says nothing about ' +
                  'where the water actually goes.'))),

            modelDisclosure('cost', 'cost model',
              h('div', null,
                h('p', null, 'A sum of unit costs times quantities, scaled by ' + a.costScale.toFixed(2) +
                  ' under ' + a.label + '.'),
                sc.costLines.length
                  ? h('ul', { className: 'mt-1' }, sc.costLines.map(function (l) {
                      return h('li', { key: l.label }, l.label + ': ' + l.qty + ' x ' +
                        fmtMoney(l.unitCost) + ' = ' + fmtMoney(l.total) + (l.note ? ' (' + l.note + ')' : ''));
                    }))
                  : h('p', { className: 'mt-1' }, 'Nothing built yet.'),
                h('p', { className: 'mt-1 font-bold' }, 'Honest caveat: unit costs vary enormously by region ' +
                  'and by year, and the bond covers public infrastructure only. Private buildings are not the ' +
                  'town budget, which is itself a modelling choice worth arguing about.'))),

            scen.modelsSeaRise ? modelDisclosure('sea', 'sea level allowance',
              h('div', null,
                h('p', null, 'Ground is inside the 2050 reach when its elevation is at or below ' +
                  'the surge reach today of ' + scen.surgeBaseElevationM.toFixed(2) +
                  ' m plus the allowance the board asked you to plan for.'),
                h('p', { className: 'mt-1' }, 'Under ' + a.label + ' the allowance is ' +
                  a.planningSeaRiseM.toFixed(1) + ' m, so the reach is ' +
                  sc.futureSurgeElevationM.toFixed(2) + ' m. Right now ' +
                  sc.tier2.landAtRiskHa + ' hectares are dry today and inside it.'),
                h('p', { className: 'mt-1 font-bold' }, 'This is not a forecast. The allowance is ' +
                  'a planning figure the board handed you, and this tool does not predict sea ' +
                  'level, does not tell you which allowance is correct, and does not have an ' +
                  'opinion about it. What it can show you is which parts of your plan depend on ' +
                  'the answer. Change the set in the Assumption Lab and watch the map change.'),
                h('p', { className: 'mt-1' }, 'Everything else here is a screening estimate too: ' +
                  'real coastal work models the surge itself, the shape of the shore, and what ' +
                  'the salt marsh absorbs. Flat ground at an elevation is a starting point, ' +
                  'not a coastal engineering study.'))) : null,

            scen.modelsWater ? modelDisclosure('water', 'water model',
              h('div', null,
                h('p', null, 'Demand = residents x litres per person per day, plus irrigated ' +
                  'farmland x its daily draw, plus park land x its daily draw. Straight addition, ' +
                  'against a fixed safe yield of ' +
                  scen.aquiferYieldM3PerDay.toLocaleString() + ' cubic metres per day.'),
                h('p', { className: 'mt-1' }, 'Under ' + a.label + ': ' +
                  a.litresPerPersonPerDay + ' litres per person per day, ' +
                  a.farmIrrigationM3PerHaPerDay + ' cubic metres per hectare of farmland, ' +
                  a.parkIrrigationM3PerHaPerDay + ' per hectare of park.'),
                h('p', { className: 'mt-1' }, 'Right now that is ' +
                  Math.round(sc.tier2.waterDemandM3PerDay).toLocaleString() + ' against a yield of ' +
                  scen.aquiferYieldM3PerDay.toLocaleString() + ', leaving ' +
                  Math.round(sc.tier2.waterHeadroomM3PerDay).toLocaleString() + '.'),
                h('p', { className: 'mt-1 font-bold' }, 'Honest caveat: safe yield is itself an ' +
                  'estimate, it varies between wet and dry decades, and this model says nothing ' +
                  'about who holds the water rights. Who is entitled to the water is a legal and ' +
                  'political question, not an arithmetic one, and this tool does not answer it.'))) : null,

            modelDisclosure('population', 'population model',
              h('p', null, 'Residents = homes x household size. Household size is ' +
                a.householdSize.toFixed(1) + ' under ' + a.label + '. That single multiplier is why ' +
                'residents and park hectares per 1,000 residents are modelled rather than measured, ' +
                'even though the home count itself is not.')),

            h('div', { className: 'text-[10px] font-black uppercase tracking-wide mb-1 mt-3',
              style: { color: dim } }, 'Deliberately not modelled'),
            h('p', { className: 'text-[10px]', style: { color: dim } },
              'Rents, displacement, job creation, property values, crime and school quality are not ' +
              'produced as numbers here, and that is on purpose. The evidence on what a plan does to any ' +
              'of them is genuinely contested, and printing a number would hand you a disputed claim in the ' +
              'most convincing form there is. They are not ignored: the Discussion tab sets ' +
              'each one out as the argument it actually is.'),
            h('button', {
              type: 'button', onClick: function () { setTab('discuss'); },
              className: 'text-[10px] font-bold underline mt-1', style: { color: '#2a78d6' }
            }, 'Open the questions this tool will not answer')));
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
          panel('lab-intro', 'Assumption Lab',
            h('div', null,
              h('p', { className: 'text-[11px]', style: { color: dim } },
                'Your plan does not change here. Only the parameters do. Run the same plan under two ' +
                'documented sets and look at what moves. A conclusion that holds under both is one you ' +
                'can defend to the planning board. A conclusion that flips is one that depends on a ' +
                'number nobody has pinned down.'),
              h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                [['A', cmpA, setCmpA], ['B', cmpB, setCmpB]].map(function (col) {
                  return h('label', { key: col[0], className: 'text-[11px] font-bold', style: { color: ink } },
                    'Set ' + col[0],
                    h('select', {
                      value: col[1],
                      onChange: function (e) { col[2](e.target.value); setCompared(false); },
                      className: 'block w-full mt-0.5 text-[11px] rounded border px-1 py-1',
                      style: { background: panelBg, color: ink, borderColor: panelBorder }
                    }, setDefs.map(function (s) {
                      return h('option', { key: s.id, value: s.id }, s.label);
                    })));
                })),
              h('div', { className: 'mt-2 space-y-1' },
                [cmpA, cmpB].map(function (sid, idx) {
                  var s = SET_BY_ID[sid];
                  return h('p', { key: idx, className: 'text-[10px]', style: { color: dim } },
                    h('strong', { style: { color: ink } }, (idx === 0 ? 'A. ' : 'B. ') + s.label + ' '), s.blurb);
                })),
              h('button', {
                type: 'button',
                onClick: function () {
                  setCompared(true);
                  if (!plan.ranAssumptionLab) {
                    setPlan(function (prev) {
                      var nx = clonePlan(prev); nx.ranAssumptionLab = true; return nx;
                    });
                  }
                  upd({ comparedSets: true, foundRobust: cmp.robust ? true : d.foundRobust });
                  announceToSR('Compared. ' + changed.length + ' indicators moved, ' + unchanged.length +
                    ' did not. ' + (cmp.flipped.length
                      ? cmp.flipped.length + ' requirements changed verdict between the two sets.'
                      : 'Every requirement kept the same verdict under both sets.'));
                },
                className: 'mt-2 w-full text-[11px] font-bold px-2 py-1.5 rounded',
                style: { background: '#2a78d6', color: '#ffffff' }
              }, 'Run the plan under both sets'))),

          compared ? panel('lab-verdict', 'What survived both sets',
            h('div', null,
              cmp.flipped.length === 0
                ? h('div', { className: 'rounded p-2',
                    style: { background: isDark ? 'rgba(27,175,122,0.14)' : 'rgba(27,175,122,0.10)',
                      borderLeft: '4px solid ' + okColour } },
                    h('p', { className: 'text-[11px] font-bold', style: { color: okColour } },
                      'Every requirement kept the same verdict under both sets.'),
                    h('p', { className: 'text-[11px] mt-1', style: { color: ink } },
                      'Whatever this plan does or does not achieve, it does not hinge on which end ' +
                      'of the published range you believe. That is a plan you can defend without ' +
                      'first having to win an argument about the parameters.'))
                : h('div', null,
                    h('p', { className: 'text-[11px] font-bold mb-1.5', style: { color: missColour } },
                      cmp.flipped.length + ' requirement' + (cmp.flipped.length > 1 ? 's' : '') +
                      ' changed verdict between the two sets. That is the part of your plan you ' +
                      'cannot yet defend, because it rests on a number nobody has pinned down.'),
                    // Shown as a flip rather than described as one: the same
                    // requirement, the two sets side by side, and the verdict
                    // visibly different. This is the moment the whole mode exists for.
                    cmp.flipped.map(function (f) {
                      return h('div', { key: f.id, className: 'rounded p-2 mb-1.5',
                        style: { background: isDark ? 'rgba(235,104,52,0.12)' : 'rgba(235,104,52,0.09)',
                          borderLeft: '4px solid ' + missColour } },
                        h('div', { className: 'text-[11px] font-bold mb-1', style: { color: ink } }, f.label),
                        h('div', { className: 'grid grid-cols-2 gap-2' },
                          [[SET_BY_ID[cmpA], f.metUnderA, 'A'], [SET_BY_ID[cmpB], !f.metUnderA, 'B']]
                            .map(function (col) {
                              return h('div', { key: col[2], className: 'rounded p-1.5',
                                style: { background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.75)' } },
                                h('div', { className: 'text-[10px]', style: { color: dim } },
                                  'Set ' + col[2] + ', ' + col[0].label),
                                h('div', { className: 'text-[11px] font-black',
                                  style: { color: col[1] ? okColour : missColour } },
                                  (col[1] ? '✔ Met' : '○ Not met')));
                            })));
                    })),
              h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink } },
                'Which of your conclusions hold under both sets? Those are the ones you can defend.'))) : null,

          compared ? panel('lab-rows', 'Indicator by indicator',
            h('div', null,
              h('div', { className: 'text-[10px] font-black uppercase mb-1', style: { color: '#eb6834' } },
                'Moved when the assumptions moved (' + changed.length + ')'),
              h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[10px]', style: { color: ink } },
                  h('caption', { className: 'sr-only' }, 'Indicators that changed between assumption set A and B'),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col', className: 'text-left' }, 'Indicator'),
                    h('th', { scope: 'col', className: 'text-right' }, 'Set A'),
                    h('th', { scope: 'col', className: 'text-right' }, 'Set B'),
                    h('th', { scope: 'col', className: 'text-right' }, 'Change'))),
                  h('tbody', null, changed.map(function (r) {
                    return h('tr', { key: r.id },
                      h('th', { scope: 'row', className: 'text-left font-normal' },
                        INDICATOR_LABELS[r.id] || r.id),
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
              h('div', { className: 'text-[10px] font-black uppercase mb-1 mt-3', style: { color: okColour } },
                'Did not move at all (' + unchanged.length + ')'),
              h('p', { className: 'text-[10px] mb-1', style: { color: dim } },
                'These are the measured quantities. They are counts and areas over the plan you drew, so no ' +
                'assumption can touch them.'),
              h('ul', { className: 'text-[10px] grid grid-cols-1 sm:grid-cols-2 gap-x-3', style: { color: ink } },
                unchanged.map(function (r) {
                  return h('li', { key: r.id }, (INDICATOR_LABELS[r.id] || r.id) + ': ' + fmtIndicator(r.id, r.a));
                })))) : null
        );
      }

      // ---- table twin: the plan is fully editable from here
      function parcelTable() {
        var served = servedParcels(plan);
        var ids = allParcelIds();
        return panel('table', 'Parcel table',
          h('div', null,
            h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
              'The same plan as the map, and just as editable. Change land use here and the map and the ' +
              'scorecard update with it.'),
            h('div', { className: 'overflow-auto', style: { maxHeight: '460px' } },
              h('table', { className: 'w-full text-[10px]', style: { color: ink } },
                h('caption', { className: 'sr-only' },
                  'All 144 parcels with terrain, land use and access. Land use is editable.'),
                h('thead', null, h('tr', null,
                  // "Park <= 5 min" mirrors the star marker on the map. Anything
                  // the map shows has to be here too, or the table is a summary
                  // rather than the peer path it is meant to be.
                  ['Parcel', 'Elev (m)', 'Floodplain', 'Land use', 'Homes', 'Road',
                    'Park ≤ 5 min', 'Green infra'].map(function (col) {
                    return h('th', { key: col, scope: 'col', className: 'text-left px-1 py-0.5',
                      style: { position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#f1f5f9' } }, col);
                  }))),
                h('tbody', null, ids.map(function (id) {
                  var terr = terrainAt(id, plan);
                  var units = unitsOnParcel(plan, id);
                  var water = isWater(id, plan);
                  return h('tr', { key: id },
                    h('th', { scope: 'row', className: 'text-left px-1 font-bold' }, id),
                    h('td', { className: 'px-1' }, terr.elevationM),
                    h('td', { className: 'px-1' }, terr.floodplain ? 'Yes' : 'No'),
                    h('td', { className: 'px-1' },
                      water ? 'River (terrain)' : h('select', {
                        value: plan.uses[id],
                        'aria-label': 'Land use for parcel ' + id,
                        onChange: function (e) {
                          applyPlan(setUse(plan, id, e.target.value), id + ' set to ' +
                            useLabel(e.target.value, plan) + '.');
                        },
                        className: 'text-[10px] rounded border px-1',
                        style: { background: panelBg, color: ink, borderColor: panelBorder }
                      }, PALETTE_IDS.map(function (uid) {
                        return h('option', { key: uid, value: uid }, useLabel(uid, plan));
                      }))),
                    h('td', { className: 'px-1 tabular-nums' }, units || ''),
                    h('td', { className: 'px-1' }, units ? (served[id] ? 'Reached' : 'Not reached') : ''),
                    h('td', { className: 'px-1' }, units && served[id]
                      ? (sc.parkDistance[id] !== undefined && sc.parkDistance[id] <= sc.parkHopLimit
                        ? 'Yes' : 'No')
                      : ''),
                    h('td', { className: 'px-1' },
                      !canGreenInfra(plan.uses[id]) ? '' : h('button', {
                        type: 'button',
                        'aria-pressed': plan.greenInfra[id] ? 'true' : 'false',
                        'aria-label': (plan.greenInfra[id] ? 'Remove' : 'Add') +
                          ' green infrastructure on parcel ' + id,
                        onClick: function () {
                          applyPlan(toggleGreenInfra(plan, id), id + ' green infrastructure toggled.');
                        },
                        className: 'text-[10px] px-1 rounded border',
                        style: { background: plan.greenInfra[id] ? okColour : panelBg,
                          color: plan.greenInfra[id] ? '#ffffff' : ink, borderColor: panelBorder }
                      }, plan.greenInfra[id] ? 'On' : 'Off')));
                }))))));
      }

      // ---- memo, and the export it produces
      function memoHtml() {
        var rows = report.rows.map(function (r) {
          var val = (r.id === 'req_cost') ? fmtMoney(r.actual)
            : (r.id === 'req_park') ? fmtPct(r.actual)
            : (r.id === 'req_runoff') ? (r.actual * 100).toFixed(0) + '% of today'
            : Math.round(r.actual).toLocaleString();
          return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.hard ? 'Required' : 'Target') +
            '</td><td>' + esc(r.met ? 'Met' : 'Not met') + '</td><td>' + esc(val) + '</td></tr>';
        }).join('');
        var t1 = visibleIndicatorIds(TIER1_IDS, plan).map(function (id) {
          return '<tr><td>' + esc(INDICATOR_LABELS[id]) + '</td><td>' + esc(fmtIndicator(id, sc.tier1[id])) + '</td></tr>';
        }).join('');
        var t2 = visibleIndicatorIds(TIER2_IDS, plan).map(function (id) {
          return '<tr><td>' + esc(INDICATOR_LABELS[id]) + '</td><td>' + esc(fmtIndicator(id, sc.tier2[id])) + '</td></tr>';
        }).join('');
        var changes = planChanges(plan);
        var changeRows = changes.map(function (c) {
          return '<tr><td>' + esc(c.id) + '</td><td>' + esc(useLabel(c.from, plan)) +
            '</td><td>' + esc(useLabel(c.to, plan)) + '</td><td>' + (c.units || '') +
            '</td><td>' + (c.greenInfra ? 'yes' : '') + '</td><td>' +
            (c.floodplain ? 'yes' : '') + '</td></tr>';
        }).join('');

        // The Assumption Lab section only appears if it was actually run.
        // Printing it regardless would imply a check the student never made.
        var cmpBlock = '';
        if (plan.ranAssumptionLab) {
          var cmp = compareAssumptions(plan, cmpA, cmpB);
          cmpBlock = '<h2>Tested against the assumptions</h2>' +
            '<p>Run under <strong>' + esc(SET_BY_ID[cmpA].label) + '</strong> and <strong>' +
            esc(SET_BY_ID[cmpB].label) + '</strong>.</p>' +
            (cmp.flipped.length
              ? '<p class="note"><strong>' + cmp.flipped.length + ' requirement' +
                (cmp.flipped.length > 1 ? 's' : '') + ' changed verdict between the two sets.' +
                '</strong> That part of this plan rests on a number nobody has pinned down.</p>' +
                '<ul>' + cmp.flipped.map(function (f) {
                  return '<li>' + esc(f.label) + ': met under ' +
                    (f.metUnderA ? 'the first set but not the second' :
                      'the second set but not the first') + '.</li>';
                }).join('') + '</ul>'
              : '<p class="note"><strong>Every requirement kept the same verdict under both ' +
                'sets.</strong> Whatever this plan does or does not achieve, it does not hinge ' +
                'on which end of the published range you believe.</p>');
        }

        return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<title>Plan memo - ' + esc(scen.town) + '</title><style>' +
          'body{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;line-height:1.5}' +
          'table{border-collapse:collapse;width:100%;margin:1rem 0}' +
          'th,td{border:1px solid #94a3b8;padding:.35rem .5rem;text-align:left;font-size:.9rem}' +
          'th{background:#f1f5f9}h1,h2{line-height:1.2}' +
          '.note{background:#f8fafc;border-left:4px solid #2a78d6;padding:.5rem .75rem;font-size:.9rem}' +
          'figure{margin:1rem 0}figcaption{font-size:.8rem;color:#475569;margin-top:.35rem}' +
          'svg{max-width:100%;height:auto}' +
          '@media print{body{max-width:none}table{page-break-inside:avoid}}' +
          '</style></head><body>' +
          '<h1>Plan memo: ' + esc(scen.town) + '</h1>' +
          '<p>' + esc(scen.intro) + '</p>' +
          '<h2>The plan</h2>' +
          '<figure>' + planSvg(plan, plan.assumptionSetId) +
          '<figcaption>One parcel is 100 m across, one hectare. A blue outline marks ' +
          esc(scen.floodLabel) + '. A dashed line is a walking path, a solid one a road. ' +
          'An exclamation mark means no road reaches those homes. The map is a picture of ' +
          'the table below, not a substitute for it.</figcaption></figure>' +
          '<h2>What was changed</h2>' +
          (changes.length
            ? '<table><caption>Every parcel that differs from ' + esc(scen.town) +
              ' as it stands today</caption><thead><tr><th scope="col">Parcel</th>' +
              '<th scope="col">Was</th><th scope="col">Now</th><th scope="col">Homes</th>' +
              '<th scope="col">Green infrastructure</th><th scope="col">In the flood zone</th>' +
              '</tr></thead><tbody>' + changeRows + '</tbody></table>'
            : '<p>Nothing was changed. This is the town as it stands today.</p>') +
          '<h2>Constraints</h2><table><caption>Requirements and targets against this plan</caption>' +
          '<thead><tr><th scope="col">Requirement</th><th scope="col">Kind</th>' +
          '<th scope="col">Verdict</th><th scope="col">This plan</th></tr></thead><tbody>' + rows +
          '</tbody></table>' +
          '<h2>The trade-off I accepted</h2>' +
          '<p><strong>Binding constraint:</strong> ' + esc(plan.memo.bindingConstraint || 'not stated') + '</p>' +
          '<p><strong>What I gave up, and why:</strong> ' + esc(plan.memo.tradeoff || 'not stated') + '</p>' +
          (plan.memo.text ? '<p>' + esc(plan.memo.text) + '</p>' : '') +
          '<h2>Measured</h2><table><caption>Geometry and accounting over the plan as drawn</caption>' +
          '<thead><tr><th scope="col">Indicator</th><th scope="col">Value</th></tr></thead><tbody>' + t1 +
          '</tbody></table>' +
          cmpBlock +
          '<h2>Modelled</h2><table><caption>Published formulas, under ' +
          esc(SET_BY_ID[plan.assumptionSetId].label) + '</caption>' +
          '<thead><tr><th scope="col">Indicator</th><th scope="col">Value</th></tr></thead><tbody>' + t2 +
          '</tbody></table>' +
          '<p class="note">Rents, displacement, job creation, property values, crime and school quality ' +
          'are deliberately not modelled in this tool. The evidence on what a plan does to any of them is ' +
          'genuinely contested, so no number for them appears here. This memo reports whether a plan meets ' +
          'stated constraints. It does not claim the plan is good.</p>' +
          '</body></html>';
      }

      function download(filename, text, mime) {
        try {
          var blob = new Blob([text], { type: mime });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        } catch (_) { announceToSR('Download failed in this browser.'); }
      }

      function memoStanding() {
        var unmet = report.rows.filter(function (r) { return !r.met; });
        return panel('memo-standing', 'Where your plan stands',
          h('div', null,
            h('p', { className: 'text-[11px] mb-1.5', style: { color: dim } },
              'Repeated here so you can see what you are writing about without leaving this tab.'),
            h('p', { className: 'text-[11px] font-bold mb-1', style: { color: ink } },
              report.hardMet + ' of ' + report.hardTotal + ' required, ' +
              report.softMet + ' of ' + report.softTotal + ' targets.'),
            unmet.length
              ? h('ul', { className: 'text-[11px] list-disc pl-4', style: { color: ink } },
                  unmet.map(function (r) {
                    return h('li', { key: r.id },
                      h('span', { style: { color: missColour, fontWeight: 700 } },
                        r.hard ? 'Required. ' : 'Target. '), r.label);
                  }))
              : h('p', { className: 'text-[11px]', style: { color: okColour } },
                  'Everything the board asked for is met. The interesting question is now what it cost ' +
                  'you to get there, and that is what the memo is for.')));
      }

      function memoPanel() {
        return h('div', null,
          memoStanding(),
          panel('memo', 'The memo is the deliverable',
            h('div', null,
              h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
                'A plan that meets every requirement with nothing written underneath it is a plan nobody ' +
                'can argue with, which is not the same as a good one. Name the constraint that pushed back ' +
                'hardest, and say what you decided to give up.'),
              h('label', { className: 'block text-[11px] font-bold mb-2', style: { color: ink } },
                'Which constraint was binding?',
                h('select', {
                  value: plan.memo.bindingConstraint,
                  onChange: function (e) {
                    var v = e.target.value;
                    setPlan(function (prev) {
                      var next = clonePlan(prev); next.memo.bindingConstraint = v; return next;
                    });
                  },
                  className: 'block w-full mt-0.5 text-[11px] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                },
                  h('option', { value: '' }, 'Choose one'),
                  scen.requirements.map(function (r) {
                    return h('option', { key: r.id, value: r.label }, r.label);
                  }))),
              h('label', { className: 'block text-[11px] font-bold mb-2', style: { color: ink } },
                'What did you give up, and why?',
                h('textarea', {
                  value: plan.memo.tradeoff, rows: 4,
                  onChange: function (e) {
                    var v = e.target.value;
                    setPlan(function (prev) {
                      var next = clonePlan(prev); next.memo.tradeoff = v; return next;
                    });
                  },
                  className: 'block w-full mt-0.5 text-[11px] rounded border px-1 py-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                })),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', {
                  type: 'button',
                  onClick: function () {
                    download(scen.id + '-plan-memo.html', memoHtml(), 'text/html;charset=utf-8');
                    announceToSR('Plan memo downloaded.');
                  },
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded',
                  style: { background: '#2a78d6', color: '#ffffff' }
                }, 'Download the plan memo'),
                h('button', {
                  type: 'button',
                  onClick: function () {
                    download(scen.id + '-plan.json', JSON.stringify(plan, null, 2), 'application/json');
                    announceToSR('Plan JSON downloaded.');
                  },
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, 'Export plan JSON'),
                h('label', {
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded border cursor-pointer',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, 'Import plan JSON',
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
                          announceToSR('Import failed. ' + res.error);
                          return;
                        }
                        applyPlan(res.plan, 'Plan imported into ' + SCENARIOS[res.plan.scenarioId].town + '.');
                        setSelected(SCENARIOS[res.plan.scenarioId].coreParcel);
                        setCompared(false);
                        var note = 'Imported into ' + SCENARIOS[res.plan.scenarioId].town + '. ' +
                          (res.warnings.length ? res.warnings.join(' ') : 'Everything in the file was recognised.') +
                          ' Undo puts your previous plan back.';
                        setImportNote(note);
                        announceToSR(note);
                      };
                      reader.onerror = function () { setImportNote('That file could not be read.'); };
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
                          applyPlan(basePlan(plan.scenarioId), 'Plan reset to ' + scen.town + ' as it stands today.');
                          setCompared(false);
                          setConfirmReset(false);
                        },
                        className: 'text-[11px] font-bold px-2 py-1.5 rounded',
                        style: { background: missColour, color: '#ffffff' }
                      }, 'Yes, clear the plan'),
                      h('button', {
                        type: 'button',
                        onClick: function () { setConfirmReset(false); },
                        className: 'text-[11px] font-bold px-2 py-1.5 rounded border',
                        style: { background: panelBg, color: ink, borderColor: panelBorder }
                      }, 'Cancel'))
                  : h('button', {
                      type: 'button',
                      onClick: function () { setConfirmReset(true); },
                      className: 'text-[11px] font-bold px-2 py-1.5 rounded border',
                      style: { background: 'transparent', color: missColour, borderColor: missColour }
                    }, 'Start over')),
              importNote
                ? h('p', { className: 'text-[11px] mt-2', style: { color: dim } }, importNote)
                : h('p', { className: 'text-[10px] mt-2', style: { color: dim } },
                    'Import is merge-only: it starts from this town as it stands today and lays the ' +
                    'imported choices on top, so a plan file can never bring in terrain or a land use ' +
                    'this tool does not know.'))));
      }

      // ---- predict-then-place card
      function predictCard() {
        if (!predictPrompt) {
          return predictResult
            ? h('p', { className: 'text-[10px] mb-2', style: { color: dim } }, predictResult)
            : null;
        }
        return panel('predict', 'Before you look',
          h('div', null,
            h('p', { className: 'text-[11px] mb-2', style: { color: ink } },
              'You have made a few changes since the last check, when the runoff coefficient was ' +
              predictPrompt.fromC.toFixed(3) + '. Without scrolling to the scorecard: has it gone ' +
              'up, gone down, or stayed about the same?'),
            h('div', { className: 'flex gap-2' },
              ['up', 'down', 'about the same'].map(function (g) {
                return h('button', {
                  key: g, type: 'button',
                  onClick: function () { answerPrediction(g); },
                  className: 'text-[11px] font-bold px-2 py-1 rounded border flex-1',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, g);
              })),
            h('p', { className: 'text-[10px] mt-1', style: { color: dim } },
              'Never scored. It is a note to yourself about whether you had a model.')));
      }

      // ---- tabs
      var TABS = [
        { id: 'design', label: 'Design' },
        { id: 'table', label: 'Parcel table' },
        { id: 'assume', label: 'Assumption Lab' },
        { id: 'memo', label: 'Memo' },
        { id: 'discuss', label: 'Discussion' },
        { id: 'history', label: 'History' },
        { id: 'class', label: 'Class view' },
        { id: 'about', label: 'How this works' }
      ];

      function discussionPanel() {
        var prompts = discussionFor(plan);
        return h('div', null,
          panel('disc-intro', 'The questions this tool will not answer',
            h('div', null,
              h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
                'The scorecard leaves out rents, displacement, jobs, property values, crime ' +
                'and school quality, because the evidence about what a plan does to any of ' +
                'them is genuinely argued over. Leaving them out and saying nothing else ' +
                'would be ducking them. So here they are, as the arguments they actually are.'),
              h('p', { className: 'text-[11px] font-bold', style: { color: ink } },
                'None of these has an answer key either. Each one names positions that ' +
                'thoughtful people hold, and none of them is marked correct.'))),

          prompts.map(function (d, i) {
            return panel('disc-' + d.id, (i + 1) + '. ' + d.question,
              h('div', null,
                d.why ? h('p', { className: 'text-[11px] mb-2 italic', style: { color: dim } }, d.why) : null,
                h('ul', { className: 'space-y-1.5' },
                  d.sides.map(function (side, j) {
                    return h('li', { key: j, className: 'text-[11px] rounded p-1.5',
                      style: { background: isDark ? 'rgba(15,23,42,0.35)' : 'rgba(241,245,249,0.85)' } },
                      h('strong', { style: { color: ink } }, side.label + '. '),
                      h('span', { style: { color: dim } }, side.view));
                  })),
                h('p', { className: 'text-[11px] mt-2 rounded p-1.5',
                  style: { color: ink, background: isDark ? 'rgba(42,120,214,0.14)' : 'rgba(42,120,214,0.10)' } },
                  h('strong', null, 'What this tool did: '), d.toolSays)));
          }),

          panel('disc-close', 'Before you argue about it',
            h('p', { className: 'text-[11px]', style: { color: dim } },
              'A useful move in any of these: work out which parts of the disagreement are ' +
              'about facts nobody has pinned down, and which are about what people think ' +
              'matters. Those are different arguments, and mixing them up is why planning ' +
              'meetings run long. The Assumption Lab handles the first kind. Nothing handles ' +
              'the second kind except people talking to each other.'),
            h('button', {
              type: 'button', onClick: function () { setTab('history'); },
              className: 'text-[10px] font-bold underline mt-1.5 block', style: { color: '#2a78d6' }
            }, 'These are present-tense questions. The History tab is the other thing: ' +
               'places where the argument already happened.')));
      }

      function historyPanel() {
        function field(label, text, tone) {
          return h('div', { className: 'mt-1.5' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wide',
              style: { color: tone || dim } }, label),
            h('p', { className: 'text-[11px]', style: { color: ink } }, text));
        }
        return h('div', null,
          panel('hist-intro', 'Places that actually exist',
            h('div', null,
              h('p', { className: 'text-[11px] mb-2', style: { color: ink } },
                'Riverbend, Mesa Hollow and Harborlight are invented. Everything on this tab ' +
                'is not. These are things that were done, written down at the time, and kept.'),
              // The adjacency guard, stated once and hard, at the top.
              h('div', { className: 'rounded p-2',
                style: { background: isDark ? 'rgba(235,104,52,0.12)' : 'rgba(235,104,52,0.09)',
                  borderLeft: '4px solid ' + missColour } },
                h('p', { className: 'text-[11px] font-bold', style: { color: ink } },
                  'Read this before the rest.'),
                h('p', { className: 'text-[11px] mt-1', style: { color: ink } },
                  'This is history sitting next to a simulation, and that is a trap. Nothing ' +
                  'you did in the Design tab models any of what follows. The tool cannot tell ' +
                  'you why these things happened, what they caused, or what should have been ' +
                  'done instead. It counts hectares. Each entry below separates what is on the ' +
                  'record from what people argue about, and the line between those two is the ' +
                  'most important thing on this tab.')))),

          CASE_STUDIES.map(function (c) {
            return panel('hist-' + c.id, c.title,
              h('div', null,
                h('p', { className: 'text-[10px] uppercase tracking-wide font-bold',
                  style: { color: dim } }, c.place + ', ' + c.period),
                field('What is on the record', c.what, okColour),
                field('Where the record is', c.record),
                field('What is argued about', c.contested, missColour),
                h('p', { className: 'text-[11px] mt-2 rounded p-1.5',
                  style: { color: ink,
                    background: isDark ? 'rgba(42,120,214,0.14)' : 'rgba(42,120,214,0.10)' } },
                  h('strong', null, 'And the tool you just used: '), c.toolSays)));
          }),

          panel('hist-close', 'What to do with this',
            h('div', { className: 'text-[11px] space-y-2', style: { color: dim } },
              h('p', null, 'The archives are open. The maps and the descriptions are scanned ' +
                'and searchable, the statutes are published, and many cities have their own ' +
                'sheet. Looking up a real place is a better exercise than reading a summary ' +
                'of it, including this one.'),
              h('p', null, 'A question worth carrying back to the Design tab: every one of ' +
                'these began as somebody drawing a line on a map and being sure they were ' +
                'improving things. You have spent this session doing exactly that, with a ' +
                'scorecard telling you how well it was going.'))));
      }

      function classPanel() {
        var summary = classSummary(classSet, plan.scenarioId, plan.assumptionSetId);
        var pct = function (num) { return summary.n ? Math.round((num / summary.n) * 100) + '%' : '-'; };

        function bar(label, count, note) {
          var share = summary.n ? (count / summary.n) * 100 : 0;
          return h('div', { key: label, className: 'mb-1.5' },
            h('div', { className: 'flex items-baseline justify-between gap-2 text-[11px]' },
              h('span', { style: { color: ink } }, label),
              h('span', { className: 'font-bold tabular-nums', style: { color: ink } },
                count + ' of ' + summary.n)),
            h('div', { 'aria-hidden': 'true', className: 'h-1.5 rounded mt-0.5',
              style: { background: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' } },
              h('div', { className: 'h-1.5 rounded',
                style: { width: share + '%', background: '#2a78d6' } })),
            note ? h('p', { className: 'text-[10px] mt-0.5', style: { color: dim } }, note) : null);
        }

        return h('div', null,
          panel('class-load', 'Read a set of plans together',
            h('div', null,
              h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
                'Load the plan JSON files your students exported. Everything happens on this ' +
                'machine: nothing is uploaded, and the set is held in memory only, so closing ' +
                'the tool clears it rather than leaving a class set on a shared computer.'),
              h('div', { className: 'flex flex-wrap gap-2 items-center' },
                h('label', {
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded cursor-pointer',
                  style: { background: '#2a78d6', color: '#ffffff' }
                }, 'Add plan files',
                  h('input', {
                    type: 'file', accept: '.json,application/json', multiple: true, className: 'sr-only',
                    onChange: function (e) {
                      var files = Array.prototype.slice.call(e.target.files || []);
                      e.target.value = '';
                      if (!files.length || !window.FileReader) return;
                      var loaded = [], failed = 0, done = 0;
                      files.forEach(function (file) {
                        var reader = new window.FileReader();
                        reader.onload = function () {
                          var res = importPlan(String(reader.result));
                          if (res.ok) {
                            loaded.push({ code: file.name.replace(/\.json$/i, '').slice(0, 40), plan: res.plan });
                          } else failed++;
                          if (++done === files.length) finish();
                        };
                        reader.onerror = function () { failed++; if (++done === files.length) finish(); };
                        reader.readAsText(file);
                      });
                      function finish() {
                        setClassSet(function (prev) { return prev.concat(loaded); });
                        var note = 'Loaded ' + loaded.length + ' plan' + (loaded.length === 1 ? '' : 's') +
                          (failed ? ', ' + failed + ' could not be read' : '') + '.';
                        setClassNote(note);
                        announceToSR(note);
                      }
                    }
                  })),
                classSet.length ? h('button', {
                  type: 'button',
                  onClick: function () {
                    setClassSet([]); setClassNote('Class set cleared.');
                    announceToSR('Class set cleared.');
                  },
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded border',
                  style: { background: 'transparent', color: missColour, borderColor: missColour }
                }, 'Clear the set') : null,
                classSet.length ? h('button', {
                  type: 'button',
                  onClick: function () {
                    download(scen.id + '-class.csv',
                      classCsv(classSet, plan.scenarioId, plan.assumptionSetId),
                      'text/csv;charset=utf-8');
                    announceToSR('Class CSV downloaded.');
                  },
                  className: 'text-[11px] font-bold px-2 py-1.5 rounded border',
                  style: { background: panelBg, color: ink, borderColor: panelBorder }
                }, 'Download class CSV') : null),
              classNote ? h('p', { className: 'text-[11px] mt-2', style: { color: dim } }, classNote) : null,
              summary.otherTown
                ? h('p', { className: 'text-[11px] mt-1', style: { color: missColour } },
                    summary.otherTown + ' loaded plan' + (summary.otherTown === 1 ? ' is' : 's are') +
                    ' for a different town and are not counted here. Switch town at the top to read them.')
                : null)),

          summary.n === 0 ? null : panel('class-req', 'What the class found hard, in ' + summary.town,
            h('div', null,
              h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
                'n = ' + summary.n + '. Each bar is how many plans met that requirement.'),
              summary.perRequirement.map(function (r) {
                return bar((r.hard ? 'Required. ' : 'Target. ') + r.label, r.met);
              }))),

          summary.n === 0 ? null : panel('class-trade', 'What they gave up',
            summary.enoughToShowSignals
              ? h('div', null,
                  h('p', { className: 'text-[11px] mb-2', style: { color: dim } },
                    'The discussion starter. Two plans that both meet the brief can give up ' +
                    'completely different things, and that is the conversation worth having.'),
                  bar('Converted farmland', summary.tradeOffs.farmland),
                  bar('Built on protected land', summary.tradeOffs.preserve),
                  bar('Put new homes in ' + scen.floodLabel, summary.tradeOffs.floodplain),
                  bar('Went over the bond', summary.tradeOffs.overBudget),
                  bar('Left homes without a park nearby', summary.tradeOffs.parkAccess))
              : h('p', { className: 'text-[11px]', style: { color: dim } },
                  'Held back until at least ' + summary.minN + ' plans are loaded. n = ' + summary.n +
                  '. With fewer than that, a distribution is a description of individuals.')),

          summary.n === 0 ? null : panel('class-process', 'How they worked',
            h('div', null,
              bar('Ran the Assumption Lab', summary.ranLab,
                'The mode the whole design rests on. Worth knowing who never opened it.'),
              bar('Wrote the memo', summary.memoDone),
              bar('Took the limited-move challenge', summary.usedChallenge),
              summary.enoughToShowSignals && Object.keys(summary.bindingChoice).length
                ? h('div', { className: 'mt-2' },
                    h('div', { className: 'text-[11px] font-bold mb-1', style: { color: ink } },
                      'Which constraint they named as binding'),
                    h('ul', { className: 'text-[11px] list-disc pl-4', style: { color: dim } },
                      Object.keys(summary.bindingChoice).map(function (k) {
                        return h('li', { key: k }, k + ': ' + summary.bindingChoice[k]);
                      })))
                : null,
              h('p', { className: 'text-[10px] mt-2', style: { color: dim } },
                'The memo text itself is never read here and never leaves in the CSV. Student ' +
                'writing can contain names, so only whether a memo exists and which constraint ' +
                'was picked from the list are counted.'))),

          panel('class-stance', 'What this screen is not',
            h('p', { className: 'text-[11px]', style: { color: dim } },
              'This reports whether a plan meets stated constraints. It does not evaluate ' +
              'whether a plan is good, it does not rank students, and there is no answer key ' +
              'to compare against. Two plans can both meet every requirement and be completely ' +
              'different, which is the point rather than a problem.')));
      }

      function aboutPanel() {
        return h('div', null,
          panel('about-1', 'What this tool does and does not do',
            h('div', { className: 'text-[11px] space-y-2', style: { color: dim } },
              h('p', null, scen.town + ' does not grow, tick, or keep score. It is frozen. Every number ' +
                'you see is computed from the plan exactly as it stands, which means you can undo any ' +
                'change and get exactly the number you had before.'),
              h('p', null, h('strong', { style: { color: ink } }, 'Measured numbers '),
                'are counts, areas and distances over the plan you drew. There is nothing to disagree ' +
                'with in them and no assumption can move them.'),
              h('p', null, h('strong', { style: { color: ink } }, 'Modelled numbers '),
                'come from a published formula with parameters that reasonable people put at different ' +
                'values. Every one of them opens to show the formula, the parameters, and the honest ' +
                'caveat about what the formula cannot tell you.'),
              h('p', null, h('strong', { style: { color: ink } }, 'Some things are missing on purpose. '),
                'What a plan does to rents, to who ends up living where, to jobs, to property values, ' +
                'to crime, or to schools is genuinely contested among people who study it for a living. ' +
                'A simulation that printed a rent number would be handing you a disputed claim in the ' +
                'most convincing form there is: a number you produced yourself. So this tool does not ' +
                'print one. Those questions are real and they belong in the discussion, in the documented ' +
                'history of how places were actually planned, and in the arguments people have at real ' +
                'planning board meetings.'),
              h('p', null, 'The walk distances are measured along streets and paths, not in a straight ' +
                'line. A parcel on the far bank of the river with no bridge is not two hundred metres ' +
                'away. It is unreachable, and the tool says so.'))),
          panel('about-2', 'Keyboard and screen reader',
            h('ul', { className: 'text-[11px] list-disc pl-4 space-y-1', style: { color: dim } },
              h('li', null, 'Every parcel is a real button. Tab or arrow to it, press Enter or Space to ' +
                'select it, then use the inspector below the map.'),
              h('li', null, 'The parcel table is not a summary. It is the same plan, fully editable, and ' +
                'any plan you can build on the map you can build in the table.'),
              h('li', null, 'Every change is announced with what moved, not just what you did.'),
              h('li', null, 'Land use is shown by a two-letter code and a fill pattern as well as colour.'),
              h('li', null, 'There are no timers anywhere in this tool.'))),
          panel('about-3', 'Take this somewhere',
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
              [{ id: 'gisStudio', icon: '🌐', tool: 'GIS Studio',
                 why: 'Analyse a place that actually exists, with real imported data, and compare it to what you designed.' },
               { id: 'bridgeLab', icon: '🌉', tool: 'Bridge Engineering Lab',
                 why: 'That river crossing costs 2.8 million dollars for a reason. Find out what is holding it up.' },
               { id: 'stewardshipHub', icon: '♻️', tool: 'Environmental Stewardship',
                 why: 'The watershed campaigns pick up exactly where the runoff model here stops.' },
               { id: 'archStudio', icon: '🏗️', tool: 'Architecture Studio',
                 why: 'You zoned the parcel. Now design what actually stands on it.' }
              ].map(function (b) {
                return h('button', {
                  key: b.id, type: 'button',
                  'aria-label': 'Open ' + b.tool + '. ' + b.why,
                  onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(b.id); },
                  className: 'text-left rounded-lg p-2.5 border',
                  style: { background: panelBg, borderColor: panelBorder }
                },
                  h('span', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                    h('span', { className: 'text-[11px] font-black', style: { color: ink } }, b.tool)),
                  h('span', { className: 'block text-[11px] mt-1', style: { color: dim } }, b.why));
              }))));
      }

      return h('div', { className: 'w-full' },
        h('div', { className: 'flex items-center gap-2 mb-2' },
          h('span', { className: 'text-lg', 'aria-hidden': 'true' }, '🏙️'),
          h('h2', { className: 'text-sm font-black', style: { color: ink } },
            'City Planning Lab · ' + scen.town),
          h('label', { className: 'ml-auto text-[11px] font-bold flex items-center gap-1.5',
            style: { color: dim } }, 'Town',
            h('select', {
              value: plan.scenarioId,
              'aria-label': 'Choose which town to plan',
              onChange: function (e) { switchScenario(e.target.value); },
              className: 'text-[11px] rounded border px-1 py-0.5',
              style: { background: panelBg, color: ink, borderColor: panelBorder }
            }, SCENARIO_IDS.map(function (sid) {
              return h('option', { key: sid, value: sid }, SCENARIOS[sid].town);
            })))),
        h('p', { className: 'text-[10px] mb-2', style: { color: dim } }, scen.blurb),

        h('div', { className: 'flex flex-wrap gap-1 mb-3', role: 'tablist',
          'aria-label': 'City Planning Lab sections' },
          TABS.map(function (tb) {
            var active = tab === tb.id;
            return h('button', {
              key: tb.id, type: 'button', role: 'tab',
              'aria-selected': active ? 'true' : 'false',
              onClick: function () { setTab(tb.id); },
              className: 'text-[11px] font-bold px-2.5 py-1 rounded-full border',
              style: { background: active ? '#2a78d6' : panelBg, color: active ? '#ffffff' : ink,
                borderColor: active ? '#2a78d6' : panelBorder }
            }, tb.label);
          })),

        tab === 'design' ? h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3' },
          h('div', null,
            panel('map', scen.town + ' today, and what you have changed',
              h('div', null,
                boardControls(),
                (plan.editCount || 0) === 0
                  ? h('p', { className: 'text-[11px] mb-2 rounded p-1.5',
                      style: { color: ink,
                        background: isDark ? 'rgba(42,120,214,0.14)' : 'rgba(42,120,214,0.10)' } },
                      'Nothing changed yet. This is ' + scen.town + ' as it stands today. ' +
                      'Click a parcel, or press Tab into the grid and use the arrow keys, then ' +
                      'choose what goes there. Every number on the right updates as you go.')
                  : null,
                boardView === 'model' ? modelView() : board(),
                boardView === 'model' ? null
                  : (boardView === 'elevation' ? elevationKey() : legend()),
                boardView === 'model' ? null : scaleBar(),
                h('p', { className: 'text-[10px] mt-2', style: { color: dim } },
                  'Each parcel is one hectare, 100 m across. A blue inner edge marks ' +
                  scen.floodLabel + '. ' +
                  (scen.modelsSeaRise
                    ? 'An orange inner edge marks ground that is dry today and inside the reach ' +
                      'planned for 2050, which moves when you change assumption set. '
                    : '') +
                  'A green dot marks green infrastructure. An exclamation mark ' +
                  'at the lower left means homes there are not reached by any road. A star at the ' +
                  'lower right means homes there have no park within a 5-minute walk.'),
                shortcutsPanel())),
            inspector()),
          h('div', null, predictCard(), constraints(), scoreboard())) : null,

        tab === 'table' ? parcelTable() : null,
        tab === 'assume' ? assumptionLab() : null,
        tab === 'memo' ? memoPanel() : null,
        tab === 'discuss' ? discussionPanel() : null,
        tab === 'history' ? historyPanel() : null,
        tab === 'class' ? classPanel() : null,
        tab === 'about' ? aboutPanel() : null,

        h('p', { className: 'text-[10px] mt-3 text-center', style: { color: dim } },
          'Runoff uses the rational method with published coefficients; costs are unit costs times ' +
          'quantities. Both are screening estimates for teaching, not engineering design. ' + scen.town +
          ' is a fictional town, so nothing here misrepresents a real place.')
      );
    }
  });
})();
