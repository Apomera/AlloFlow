import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROADREADY_FILES = [
  'stem_lab/stem_tool_roadready.js',
  'prismflow-deploy/public/stem_lab/stem_tool_roadready.js',
  'prismflow-deploy/public/stem_tool_roadready.js',
];

const ROADREADY_UI_STRING_FILES = [
  'ui_strings.js',
  'prismflow-deploy/public/ui_strings.js',
];

function readRoadReady(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function decodeJsStringLiteral(raw, quote) {
  return Function(`"use strict"; return ${quote}${raw}${quote};`)();
}

function extractRoadReadyFallbacks(src) {
  const fallbacks = new Map();
  const patterns = [
    { quote: "'", regex: /__alloT\('stem\.roadready\.([^']+)',\s*'((?:\\.|[^'\\])*)'/g },
    { quote: '"', regex: /__alloT\('stem\.roadready\.([^']+)',\s*"((?:\\.|[^"\\])*)"/g },
  ];

  for (const { quote, regex } of patterns) {
    let match;
    while ((match = regex.exec(src))) {
      fallbacks.set(match[1], decodeJsStringLiteral(match[2], quote));
    }
  }

  return fallbacks;
}

function arrayBlock(src, declaration) {
  const start = src.indexOf(declaration);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = src.indexOf('\n  ];', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

function viewBlock(src, view) {
  const start = src.indexOf(`if (view === '${view}')`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = src.indexOf("\n      if (view === '", start + 1);
  return src.slice(start, next === -1 ? src.length : next);
}

function windowAfter(text, needle, chars = 1600) {
  const start = text.indexOf(needle);
  expect(start).toBeGreaterThanOrEqual(0);
  return text.slice(start, start + chars);
}

function expectPhrases(src, phrases) {
  for (const phrase of phrases) {
    expect(src).toContain(phrase);
  }
}

const PERMIT_CATEGORIES = [
  'signs',
  'gdl',
  'dui',
  'winter',
  'pedestrian',
  'emergency',
  'maintenance',
  'general',
];

const UNIVERSAL_RULE_PILLARS = {
  rightOfWay: [
    'Emergency vehicles with lights/siren',
    'Pedestrians in marked crosswalks',
    'School buses with red flashers',
    'Traffic already in the intersection / roundabout',
  ],
  laneDiscipline: ['Keep-right', 'Solid white line', 'blind spot'],
  signaling: ['100 ft', '200 ft', 'Hand signals'],
  passing: ['Solid yellow on YOUR side', 'Never pass a school bus with red flashers'],
  merging: ['Zipper merge', 'Highway on-ramps', 'Merging driver yields'],
  pedestrian: ['Marked crosswalk: Maine §2056', 'WHITE or METALLIC CANE or GUIDE DOG', 'Never pass a vehicle stopped at a crosswalk'],
  emergency: ['pull to the RIGHT curb and stop', 'Move Over', 'Disabled vehicle on the shoulder'],
  railroad: ['Never drive around lowered gates', 'Stuck on tracks', '45'],
  speedAndFollowing: ['reasonable and prudent', '3-second following rule', 'Posted special speed zones'],
};

const DRIVING_SCENARIOS = [
  { id: 'residential', speedLimit: 25, phrases: ['Watch for kids', 'driveways'] },
  { id: 'suburban', speedLimit: 40, phrases: ['traffic lights', 'turn lanes'] },
  { id: 'highway', speedLimit: 65, phrases: ['Practice merging', '3-second following distance'] },
  { id: 'roundabout', speedLimit: 25, phrases: ['Yield to traffic already in the circle', 'No stopping inside'] },
  { id: 'rural', speedLimit: 50, phrases: ['moose', 'deer', 'cyclists'] },
  { id: 'parking', speedLimit: 10, phrases: ['Parallel Parking', 'road-test maneuver'] },
  { id: 'night', speedLimit: 40, phrases: ['Night Driving', 'Do not overdrive'] },
  { id: 'fog', speedLimit: 30, phrases: ['Low beams only', 'Slow WAY down'] },
  { id: 'rain', speedLimit: 45, phrases: ['Hydroplaning risk', 'Headlights on when wipers are in constant use'] },
  { id: 'snow', speedLimit: 35, phrases: ['Snow-covered road', 'Gentle inputs only'] },
  { id: 'construction', speedLimit: 35, phrases: ['flagger and cones', 'Posted construction-speed fines can double'] },
  { id: 'school_zone', speedLimit: 15, phrases: ['Maine §2074: 15 mph during recess', 'crossing guard'] },
  { id: 'downtown', speedLimit: 30, phrases: ['One-way streets', 'heavy pedestrians'] },
  { id: 'dawn', speedLimit: 45, phrases: ['moose + deer', 'Visibility is tricky'] },
];

const LANDMARK_TYPES = [
  { id: 'school', phrases: ["contextRule: 'school_zone_15mph'", 'eventChance: 0.15'] },
  { id: 'library', phrases: ["sign: 'LIBRARY'"] },
  { id: 'hospital', phrases: ["contextRule: 'slow_ambulance'"] },
  { id: 'police', phrases: ["contextRule: 'check_speed'"] },
  { id: 'fire', phrases: ["contextRule: 'emergency_vehicle'"] },
  { id: 'gas', phrases: ["sign: 'GAS'"] },
  { id: 'diner', phrases: ["sign: 'DINER'"] },
  { id: 'park', phrases: ["contextRule: 'pedestrians'"] },
  { id: 'church', phrases: ["sign: 'CHURCH'"] },
  { id: 'market', phrases: ["contextRule: 'pedestrians'"] },
  { id: 'pharmacy', phrases: ["sign: 'RX'"] },
  { id: 'post', phrases: ["sign: 'POST OFFICE'"] },
  { id: 'farm', phrases: ["contextRule: 'slow_vehicle'"] },
  { id: 'lighthouse', phrases: ["sign: 'LIGHTHOUSE'"] },
  { id: 'home', phrases: ["name: 'Maine Cottage'"] },
];

const LANDMARK_EVENT_PHRASES = [
  "kind: 'ball'",
  'CHILD chasing ball into road!',
  'Ball rolling from park',
  "kind: 'schoolbus_arm'",
  'SCHOOL BUS stopped with RED FLASHING lights!',
  "kind: 'pedestrian'",
  'PEDESTRIAN stepping off sidewalk!',
  "kind: 'ambulance'",
  'AMBULANCE exiting hospital',
  "kind: 'firetruck'",
  'FIRE TRUCK responding',
  "kind: 'tractor'",
  'SLOW TRACTOR entering road!',
  "kind: 'cruiser'",
  'POLICE CRUISER pulling out',
];

const HELP_HUB_RULE_VIEWS = [
  'rightOfWay',
  'defensiveList',
  'mooseSafety',
  'emergencyVehicle',
  'schoolBus',
  'railroadCrossing',
  'winterDriving',
  'constructionZone',
  'roundaboutDrill',
  'duiDrill',
  'peerPressure',
  'emergencyHandbook',
  'crashLab',
  'teenGDL',
  'gdlTracker',
  'rulesFoundations',
  'hazardTest',
];

const SCRIPTED_DRILL_IDS = {
  roundaboutDrill: ['entry_yield', 'emergency_in_circle', 'truck_both_lanes', 'lane_choice', 'pedestrian_exit', 'signal_correctly'],
  duiDrill: ['just_one_mile', 'implied_consent', 'rx_drug', 'zero_tolerance', 'weed_legal', 'first_offense'],
  defensiveList: ['red_runner', 'bike_swerve', 'tailgater', 'deer_twilight', 'lane_merge', 'child_ball', 'hydroplane', 'ambulance'],
  mooseSafety: ['dusk_straight', 'calf_and_cow', 'shoulder_ambiguous', 'oncoming_commitment', 'post_near_miss', 'fog_zone'],
  emergencyVehicle: ['siren_behind', 'intersection_clear', 'oncoming_divided', 'oncoming_undivided', 'stopped_shoulder', 'multi_vehicle'],
  schoolBus: ['same_direction_2lane', 'opposite_undivided', 'opposite_divided', 'yellow_flashers', 'private_road'],
  railroadCrossing: ['flashing_reds', 'could_make_it', 'stalled', 'multi_track', 'passive_crossing', 'humped_crossing'],
  winterDriving: ['black_ice', 'follow_distance', 'oversteer', 'understeer', 'plow_passing', 'fourwd_myth'],
  constructionZone: ['flagger_stop', 'flagger_slow', 'merge_choice', 'worker_shoulder', 'barrel_gap', 'pilot_car'],
  teenGDL: ['friends_party', 'curfew', 'hands_free', 'supervised_hours', 'clock_reset', 'sibling'],
  crashLab: ['rear_end', 'tbone', 'rollover', 'hydroplane'],
  emergencyHandbook: ['tire_blowout', 'brake_failure', 'stuck_tracks', 'car_fire', 'stuck_gas', 'flood_water', 'skid_loss', 'hood_up', 'exhaust'],
  rightOfWay: [
    'same_time_4way',
    'left_turn_oncoming',
    'tjunction_thru',
    'pedestrian_cross',
    'ambulance_behind',
    'roundabout',
    'school_bus_red',
    'uncontrolled_same',
    'funeral',
    'hill_narrow',
    'zipper_merge',
    'flashing_yellow_arrow',
    'flashing_red_intersection',
    'stuck_on_tracks',
    'disabled_on_shoulder',
    'construction_flagger',
    'school_bus_divided',
    'white_cane_ped',
    'roundabout_emergency',
    'cyclist_in_bike_lane',
  ],
  peerPressure: ['text', 'stop_sign', 'race', 'speed', 'drink', 'weed', 'curfew', 'passengers'],
};

const QUIZ_DRILL_VIEWS = [
  'roundaboutDrill',
  'duiDrill',
  'defensiveList',
  'mooseSafety',
  'emergencyVehicle',
  'schoolBus',
  'railroadCrossing',
  'winterDriving',
  'constructionZone',
  'teenGDL',
  'rightOfWay',
];

const HAZARD_EVENTS = [
  { type: 'child', reactionLimit: 2.5 },
  { type: 'hardBrake', reactionLimit: 1.5 },
  { type: 'deer', reactionLimit: 2.0 },
  { type: 'headOn', reactionLimit: 1.5 },
  { type: 'door', reactionLimit: 2.0 },
  { type: 'cyclist', reactionLimit: 2.0 },
  { type: 'yellow', reactionLimit: 2.0 },
  { type: 'distracted', reactionLimit: 2.5 },
  { type: 'ice', reactionLimit: 3.0 },
  { type: 'schoolBus', reactionLimit: 3.0 },
];

const SIGN_LIBRARY_ITEMS = [
  'Stop',
  'Yield',
  'Speed Limit',
  'No U-Turn',
  'Do Not Enter',
  'One Way',
  'Curve Ahead',
  'Pedestrian Crossing',
  'Deer Crossing',
  'Slippery When Wet',
  'Two-Way Traffic',
  'Merge',
  'Railroad Crossing',
  'Road Work Ahead',
  'Flagger Ahead',
  'School Zone',
  'School Crossing',
  'Interstate Shield',
  'US Route',
];

const PARKING_SCENARIOS = [
  { id: 'tightParallel', view: 'tightParallel' },
  { id: 'angleBack', view: 'angleBack' },
  { id: 'obstacleBack', view: 'obstacleBack' },
  { id: 'uTurnNarrow', view: 'uTurnNarrow' },
  { id: 'hydrantParallel', view: 'hydrantParallel' },
  { id: 'hillUphill', view: 'hillUphill' },
];

const LESSON_PATH_STAGES = [
  { scenarioId: 'residential', minSafety: 60 },
  { scenarioId: 'suburban', minSafety: 65 },
  { scenarioId: 'school_zone', minSafety: 70 },
  { scenarioId: 'highway', minSafety: 70 },
  { scenarioId: 'roundabout', minSafety: 70 },
  { scenarioId: 'rain', minSafety: 65 },
  { scenarioId: 'night', minSafety: 65 },
  { scenarioId: 'fog', minSafety: 60 },
  { scenarioId: 'downtown', minSafety: 65 },
  { scenarioId: 'snow', minSafety: 60 },
];

const ACHIEVEMENT_IDS = [
  'first_drive',
  'no_crash',
  'eco_warrior',
  'safety_star',
  'a_plus',
  'permit_pass',
  'night_owl',
  'winter_warrior',
  'hypermiler',
  'full_stop',
  'signal_perfect',
  'park_master',
  'three_point',
  'speed_demon',
  'moose_dodge',
  'five_scenarios',
  'emergency_yield',
  'ten_drives',
  'hazard_ace',
  'night_drive',
  'all_weather',
  'first_landmark',
  'five_landmarks',
  'ten_landmarks',
  'school_hero',
  'emergency_response',
  'maine_explorer',
  'civic_scholar',
  'safe_return',
  'bus_respect',
  'first_challenge',
  'five_challenges',
  'biome_tourist',
  'pretrip_pro',
  'daily_streak_3',
  'daily_streak_7',
  'daily_streak_30',
  'peer_pro',
  'road_test_pass',
  'defensive_drill',
  'logbook_starter',
  'logbook_ten_hr',
  'maintenance_master',
  'moose_safe',
  'moose_avoided',
  'emg_ready',
  'bus_safe',
  'rail_ready',
  'winter_ready',
  'zone_wise',
  'gdl_scholar',
];

const FREE_EXPLORE_CHALLENGE_IDS = [
  'deer_watch',
  'wet_brake',
  'smooth_operator',
  'hypermile_short',
  'three_landmarks',
  'night_cruise',
  'moose_miss',
];

const ROAD_TRIP_GOALS = {
  lighthouse_loop: ['gas', 'diner', 'lighthouse'],
  school_run: ['post', 'pharmacy', 'school'],
  civic_tour: ['library', 'post', 'police'],
  errand_run: ['market', 'pharmacy', 'home'],
  emergency_route: ['fire', 'hospital', 'police'],
};

const DAILY_CHALLENGE_ACTIONS = [
  { action: 'quiz', route: "updMulti({ view: 'permitStart' })" },
  { action: 'drive', scenario: 'residential' },
  { action: 'drive', scenario: 'rain' },
  { action: 'drive', scenario: 'night' },
  { action: 'flashcards', route: "updMulti({ view: 'permitFlashcards'" },
  { action: 'defensive', route: "upd('view', 'defensiveList')" },
  { action: 'maintenance', route: "upd('view', 'maintenanceGame')" },
  { action: 'row', route: "updMulti({ view: 'rightOfWay'" },
  { action: 'parking', route: "upd('view', 'parking')" },
  { action: 'signs', route: "updMulti({ view: 'signsView'" },
  { action: 'distracted', route: "upd('view', 'distractedLab')" },
  { action: 'reaction', route: "updMulti({ view: 'reactionTest'" },
  { action: 'emergency', route: "upd('view', 'emergencyHandbook')" },
];

const GDL_STAGE_KEYS = [
  'unstarted',
  'tooyoung',
  'eligible_permit',
  'permit_hold',
  'permit_waiting',
  'eligible_intermediate',
  'intermediate_restricted',
  'full_license',
];

const WARNING_LIGHT_IDS = [
  'oil',
  'temp',
  'check_engine',
  'battery',
  'brake',
  'abs',
  'tpms',
  'airbag',
  'fuel',
  'def',
];

const PRE_TRIP_CHECK_IDS = [
  'tire_psi',
  'tire_tread',
  'tire_damage',
  'tire_spare',
  'lights_head',
  'lights_brake',
  'lights_signal',
  'lights_reverse',
  'lights_plate',
  'fluid_oil',
  'fluid_coolant',
  'fluid_brake',
  'fluid_washer',
  'fluid_trans',
  'wiper_blades',
  'glass_crack',
  'mirror_adjust',
  'defog',
  'safe_belts',
  'safe_airbag',
  'safe_horn',
  'safe_kit',
  'safe_papers',
  'seat_pos',
  'mirror_drive',
  'belt_on',
  'pbrake',
  'walk_around',
];

const LEARNING_PATH_STAGE_MODES = [
  ['lessonSelect', 'signsView', 'stoppingLab'],
  ['permitStart'],
  ['scenarioSelect'],
  ['parking', 'threePoint', 'backingDrill'],
  ['scenarioSelect'],
  ['scenarioSelect'],
  ['hazardTest'],
  ['emergencyDrill', 'emergencyHandbook'],
  ['forceDiagram', 'hypermilingLab', 'speedCompare'],
  ['roadTestRubric', 'freeExploreSetup'],
];

const ROAD_TEST_RUBRIC_CATEGORIES = [
  'Pre-Drive',
  'Basic Control',
  'Intersections',
  'Lane Skills',
  'Turns',
  'Parking',
  'Automatic Failures',
];

describe('RoadReady rules-of-road content', () => {
  it('keeps RoadReady text free of replacement-character corruption', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).not.toContain('\uFFFD');
      expect(src).not.toContain('���');
    }
  });

  it('keeps RoadReady shared UI string catalog entries in sync with current content counts', () => {
    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('"18_who_goes_first_scenarios": "20 \\"who goes first?\\" scenarios"');
      expect(src).toContain('"10_who_goes_first_intersection_puzzles": "20 right-of-way and intersection puzzles."');
      expect(src).toContain('"parking_practice_7_scenarios": "Parking Practice (9 Scenarios)"');
      expect(src).toContain('"parallel_tight_parallel_3_point_backin": "Parallel, tight parallel, 3-point, backing, angle-back, obstacle, U-turn, hydrant, and hill parking. Personal-best scores save."');
      expect(src).toContain('"tire_blowout_brake_failure_hydroplane_": "Tire blowout, brake failure, hydroplane — 9 critical responses."');
      expect(src).toContain('"signal_mirror_blind_spot_check_smooth_": "Signal -> mirror -> blind spot check -> smooth move. Each step must be visible."');
      expect(src).toContain('"flaggers_zipper_merges_barrels_pilot_c": "Flaggers, zipper merges, barrels, pilot cars, and posted construction-speed penalties."');
      expect(src).toContain('"the_protocol_all_50_states": "Emergency Vehicle Protocol"');
      expect(src).toContain('"construction_desc": "Lane closure with flagger and cones. Posted construction-speed fines can double. Workers present — slow down early."');
      expect(src).toContain('"pedestrian_summary": "Pedestrians are vulnerable; crosswalks and special-right-of-way cases demand full attention."');
      expect(src).not.toContain('"Parking Practice (7 Scenarios)"');
      expect(src).not.toContain('Tire blowout, brake failure, hydroplane — 8 critical responses.');
      expect(src).not.toContain('Signal ��� mirror');
      expect(src).not.toContain('Flaggers, zipper merges, barrels, pilot cars — fines doubled.');
      expect(src).not.toContain('The Protocol (all 50 states)');
      expect(src).not.toContain('Fines double. Workers present');
      expect(src).not.toContain('Pedestrians always have the legal and practical right-of-way.');
    }
  });

  it('keeps RoadReady shared UI string catalog values aligned with source fallbacks', () => {
    const fallbacks = extractRoadReadyFallbacks(readRoadReady('stem_lab/stem_tool_roadready.js'));
    expect(fallbacks.size).toBeGreaterThan(1700);

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;
      const mismatches = [];

      for (const [key, fallback] of fallbacks) {
        if (Object.prototype.hasOwnProperty.call(catalog, key) && catalog[key] !== fallback) {
          mismatches.push({ key, catalog: catalog[key], fallback });
        }
      }

      expect(mismatches).toEqual([]);
    }
  });

  it('marks Maine §2074 school-zone speed as 15 mph during active periods', () => {
    const src = readRoadReady('stem_lab/stem_tool_roadready.js');
    const block = src.match(/\{ q: 'The speed limit in a Maine school zone during active school-zone times is typically:'[\s\S]*?category: 'pedestrian' \}/)?.[0];

    expect(block).toBeTruthy();
    expect(block).toContain("a: ['15 mph',");
    expect(block).toContain('correct: 0');
    expect(block).toContain('Maine §2074 sets 15 mph');
    expect(block).toContain('during recess, school opening/closing windows, flashing school-zone signs during opening/closing hours, or locally designated active times');
    expect(block).not.toContain('when children are present is typically');

    const flashingBlock = src.match(/\{ q: 'A flashing yellow light at a school zone means:'[\s\S]*?category: 'pedestrian' \}/)?.[0];
    expect(flashingBlock).toBeTruthy();
    expect(flashingBlock).toContain('active school-zone speed limit (15 mph in Maine) is in effect');
    expect(flashingBlock).toContain('Maine §2074 sets the school-zone speed at 15 mph during active periods');
    expect(flashingBlock).not.toContain('children may be present and the school-zone speed limit (typically 15 mph in Maine) is in effect');
  });

  it('keeps school landmark guidance at 15 mph in every RoadReady copy', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('school_zone_15mph');
      expect(src).toContain('SLOW DOWN to 15 mph (active school zone)');
      expect(src).toContain('Maine §2074: 15 mph during recess, opening/closing windows, flashing signs, or local active times.');
      expect(src).not.toContain('school_zone_20mph');
      expect(src).not.toContain('SLOW DOWN to 20 mph (school zone)');
    }
  });

  it('uses far-hand Dutch Reach wording in every RoadReady copy', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('use your FAR hand');
      expect(src).toContain('right hand from the driver seat');
      expect(src).not.toContain('USE YOUR LEFT HAND');
    }
  });

  it('does not teach entering a red-light intersection for emergency vehicles', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = src.match(/\{ q: 'You are stopped at a red light when an ambulance with sirens approaches from behind\. You should:'[\s\S]*?category: 'emergency' \}/)?.[0];
      const scenario = src.match(/id: 'intersection_clear'[\s\S]*?id: 'oncoming_divided'/)?.[0];

      expect(block).toBeTruthy();
      expect(block).toContain('correct: 1');
      expect(block).toContain('staying clear of the intersection');
      expect(block).toContain('stopping clear of intersections');
      expect(block).not.toContain('Pull forward into the intersection');
      expect(block).not.toContain('You may carefully proceed into the intersection');

      expect(scenario).toBeTruthy();
      expect(scenario).toContain('correct: 1');
      expect(scenario).toContain('stopped before the line');
      expect(scenario).not.toContain('Proceed through the red ONLY');
      expect(scenario).not.toContain('You may proceed through a red light');
    }
  });

  it('does not teach a Maine divided-highway exception for approaching emergency vehicles', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const permitBlock = src.match(/\{ q: 'An emergency vehicle is approaching on a divided highway from the OPPOSITE direction\. You must:'[\s\S]*?category: 'emergency' \}/)?.[0];
      const scenario = src.match(/id: 'oncoming_divided'[\s\S]*?id: 'oncoming_undivided'/)?.[0];

      expect(permitBlock).toBeTruthy();
      expect(permitBlock).toContain('correct: 2');
      expect(permitBlock).toContain('Move right and stop until it passes, staying clear of intersections');
      expect(permitBlock).toContain('Maine §2054 does not list a divided-highway exception');
      expect(permitBlock).not.toContain('only traffic on the SAME side as the emergency vehicle must pull over');

      expect(scenario).toBeTruthy();
      expect(scenario).toContain('correct: 0');
      expect(scenario).toContain('Move right as near as practicable, stay clear of intersections, and stop until it passes');
      expect(scenario).toContain('Maine §2054 does not list a divided-highway exception');
      expect(scenario).not.toContain('you don\\\'t need to stop for oncoming emergency vehicles');

      expect(src).toContain('Maine §2054 does not list a median exception; move right when safe');
      expect(src).not.toContain('opposing traffic does NOT need to stop');
      expect(src).not.toContain('If the emergency vehicle is on the OTHER side of the median, you do not need to stop');
    }
  });

  it('does not overstate mandatory jail for a first-offense Maine OUI', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = src.match(/\{ q: 'In Maine, what is the penalty for a first-offense OUI \(Operating Under Influence\)\?'[\s\S]*?category: 'dui' \}/)?.[0];

      expect(block).toBeTruthy();
      expect(block).toContain('correct: 2');
      expect(block).toContain('at least a $500 fine and 150-day license suspension');
      expect(block).toContain('Jail becomes mandatory in aggravating cases');
      expect(block).not.toContain('minimum 96 hours jail');
      expect(block).not.toContain('48 hrs community service');
    }
  });

  it('uses current Maine under-21 zero-tolerance alcohol wording', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const adultLimitBlock = src.match(/\{ q: 'In Maine, the legal BAC limit for drivers 21 and older is:'[\s\S]*?category: 'dui' \}/)?.[0];
      const under21Block = src.match(/\{ q: 'In Maine, the BAC limit for drivers UNDER 21 is:'[\s\S]*?category: 'dui' \}/)?.[0];
      const lookbackBlock = src.match(/\{ q: 'For Maine OUI penalty escalation, prior OUI offenses are counted within what lookback period\?'[\s\S]*?category: 'dui' \}/)?.[0];
      const zeroToleranceScenario = src.match(/id: 'zero_tolerance'[\s\S]*?id: 'weed_legal'/)?.[0];
      const firstOffenseScenario = src.match(/id: 'first_offense'[\s\S]*?\}\s*\]\s*\}\);/m)?.[0];

      expect(src).toContain('0.08 adult / 0.00 under 21/provisional / 0.04 CDL');

      expect(adultLimitBlock).toBeTruthy();
      expect(adultLimitBlock).toContain('Under 21/provisional: no alcohol level over 0.00');

      expect(under21Block).toBeTruthy();
      expect(under21Block).toContain("a: ['0.08%', '0.05%', 'No alcohol level over 0.00', 'No limit']");
      expect(under21Block).toContain('Maine §2472 sets zero tolerance');
      expect(under21Block).toContain('the first suspension is one year');
      expect(under21Block).toContain('refusal is 18 months for a first refusal');

      expect(lookbackBlock).toBeTruthy();
      expect(lookbackBlock).toContain("a: ['1 year', '5 years', '10 years', 'Forever']");
      expect(lookbackBlock).toContain('correct: 2');
      expect(lookbackBlock).toContain('Maine §2411 escalates penalties for previous OUI offenses within a 10-year period');
      expect(lookbackBlock).toContain('Record retention, insurance, and employment effects can last longer');

      expect(zeroToleranceScenario).toBeTruthy();
      expect(zeroToleranceScenario).toContain('no alcohol level over 0.00');
      expect(zeroToleranceScenario).toContain('A 0.03 test is not legal');
      expect(zeroToleranceScenario).toContain('Refusal is 18 months for a first refusal');

      expect(firstOffenseScenario).toBeTruthy();
      expect(firstOffenseScenario).toContain('DEEP/restoration steps');
      expect(firstOffenseScenario).toContain('insurance consequences');
      expect(firstOffenseScenario).not.toContain('mandatory Driver Education Evaluation Program');
      expect(firstOffenseScenario).not.toContain('SR-22 high-risk insurance filing');
      expect(firstOffenseScenario).not.toContain('possible 48 hours to 1-year jail');

      expect(src).not.toContain('0.02% (zero tolerance)');
      expect(src).not.toContain('Zero tolerance — 0.02 BAC');
      expect(src).not.toContain('No — Maine zero-tolerance is 0.02 BAC');
      expect(src).not.toContain('Under 21 in Maine: 0.02 BAC is the limit');
      expect(src).not.toContain("Maine's 0.02 limit");
      expect(src).not.toContain('Maine 0.02 BAC zero-tolerance');
      expect(src).not.toContain('How long does an OUI (Operating Under Influence) conviction stay on your Maine driving record?');
      expect(src).not.toContain('OUI convictions stay on your driving record for 10 years');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.maine_0_08_bac_for_21_zero_tolerance_0).toContain('no alcohol level over 0.00');
      expect(catalog.driving_on_a_maine_road_is_legal_conse).toContain('First refusal triggers a 275-day license suspension');
      expect(catalog.a_130_lb_teenager_drops_below_maine_s_).toContain("under-21 0.00 standard");
      expect(catalog.maine_0_02_bac_zero_tolerance_implied_).toBe('Maine under-21 0.00 zero-tolerance, implied consent, Rx + marijuana rules.');
      expect(catalog.zero_tolerance_under_21_0_08_adult).toBe(' 0.00 under 21/provisional; 0.08 adult');

      expect(catalog.maine_0_08_bac_for_21_zero_tolerance_0).not.toContain('0.02 BAC');
      expect(catalog.a_130_lb_teenager_drops_below_maine_s_).not.toContain("0.02 limit");
      expect(catalog.maine_0_02_bac_zero_tolerance_implied_).not.toContain('0.02 BAC');
    }
  });

  it('uses current NHTSA data for impaired, drowsy, and distracted-driving teaching copy', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const alcoholBlock = src.match(/\{ q: 'What percentage of all traffic deaths in the US involve alcohol\?'[\s\S]*?category: 'dui' \}/)?.[0];
      const drowsyBlock = src.match(/\{ q: 'Drowsy driving is comparable in danger to:'[\s\S]*?category: 'dui' \}/)?.[0];

      expect(alcoholBlock).toBeTruthy();
      expect(alcoholBlock).toContain('about 30% of U.S. traffic crash fatalities involve drunk drivers');
      expect(alcoholBlock).toContain('11,904 people died in alcohol-impaired-driving crashes');
      expect(alcoholBlock).toContain('2015-2024 average was over 11,500 per year');

      expect(drowsyBlock).toBeTruthy();
      expect(drowsyBlock).toContain('Drowsy driving can impair reaction time, judgment, and lane control');
      expect(drowsyBlock).toContain('coffee alone is not enough');
      expect(drowsyBlock).toContain('short 20-minute nap');

      expect(src).toContain('Texting while driving: ');
      expect(src).toContain('5 seconds eyes-off');
      expect(src).toContain('football-field length blind');
      expect(src).toContain('3,208 distracted-driving deaths');
      expect(src).toContain('315,167 injuries in 2024');
      expect(src).toContain('fatigue impairs reaction, judgment, and lane control');

      expect(src).not.toContain('roughly 10,000 deaths per year');
      expect(src).not.toContain('100,000 crashes/year');
      expect(src).not.toContain('17+ hours impairs');
      expect(src).not.toContain('24 hours awake');
      expect(src).not.toContain('The only cure is sleep, not coffee');
      expect(src).not.toContain('Texting while driving = ');
      expect(src).not.toContain('6× crash risk');
      expect(src).not.toContain('3,142 distracted-driving deaths');
      expect(src).not.toContain('2020 (most recent final data)');
      expect(src).not.toContain('fatigue is as dangerous as alcohol at 17+ hours awake');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.texting_while_driving).toBe('Texting while driving: ');
      expect(catalog['6_crash_risk']).toBe('5 seconds eyes-off');
      expect(catalog['3_142_distracted_driving_deaths_in_the']).toContain('3,208 distracted-driving deaths');
      expect(catalog['3_142_distracted_driving_deaths_in_the']).toContain('315,167 injuries in 2024');
      expect(catalog.stop_every_2_hours_fatigue_is_as_dange).toContain('fatigue impairs reaction, judgment, and lane control');

      expect(catalog['6_crash_risk']).not.toContain('6× crash risk');
      expect(catalog['3_142_distracted_driving_deaths_in_the']).not.toContain('3,142 distracted-driving deaths');
      expect(catalog.stop_every_2_hours_fatigue_is_as_dange).not.toContain('17+ hours awake');
    }
  });

  it('uses current Maine child-passenger restraint wording from section 2081', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const childPassengerQuestion = src.match(/\{ q: 'In Maine, which child passenger must use a belt-positioning seat or child restraint unless a stricter child-restraint rule applies\?'[\s\S]*?category: 'general' \}/)?.[0];

      expect(src).toContain('Maine §2081: under 2 rear-facing unless seat limits are exceeded');
      expect(src).toContain('age 2+ under 55 lb in an internal-harness child restraint');
      expect(src).toContain('under 8, under 80 lb, and under 57 in in a belt-positioning seat or child restraint');
      expect(src).toContain('under 12 in the rear seat if possible');
      expect(src).toContain('§2081 age/weight/height rules');

      expect(childPassengerQuestion).toBeTruthy();
      expect(childPassengerQuestion).toContain("a: ['Any child under 12', 'A child under 8 who is under 80 lb and under 57 inches tall', 'Any child under 100 lb', 'Only children under 2']");
      expect(childPassengerQuestion).toContain('correct: 1');
      expect(childPassengerQuestion).toContain('Maine §2081 uses age, weight, and height');
      expect(childPassengerQuestion).toContain('Under 2: rear-facing unless seat limits are exceeded');
      expect(childPassengerQuestion).toContain('Age 2+ and under 55 lb: internal-harness child restraint');
      expect(childPassengerQuestion).toContain('Under 8, under 80 lb, and under 57 in: belt-positioning seat or child restraint');
      expect(childPassengerQuestion).toContain('Under 12: rear seat if possible');

      expect(src).not.toContain('Child seat required under 8 OR under 80 lbs.');
      expect(src).not.toContain('under age 8 and under 80 pounds can ride in a car or booster seat');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.child_passengers).toBe('• Child passengers: ');
      expect(catalog.maine_2081_age_weight_height).toBe('§2081 age/weight/height rules');
    }
  });

  it('uses current Maine headlight and high-beam dimming wording from section 2067', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const headlightQuestion = src.match(/\{ q: 'Maine law requires headlights to be on:'[\s\S]*?category: 'general' \}/)?.[0];

      expect(src).toContain('Required sunset to sunrise; when rain, fog, snow, or other conditions make people/vehicles not discernible 1,000 ft ahead; and when windshield wipers are in constant use.');
      expect(src).toContain('Headlights on when wipers are in constant use or visibility is reduced.');
      expect(src).toContain('ON when wipers are in constant use');
      expect(src).toContain('required when wipers are in constant use or visibility is under 1,000 ft');
      expect(src).toContain('Dim within 500 ft of oncoming traffic or 300 ft when following another vehicle');
      expect(src).toContain('Maine §2067: dim high beams within 500 ft of oncoming traffic or 300 ft when following another vehicle.');
      expect(src).toContain('Use high beams only when clear; Maine §2067 requires dimming within 500 ft of oncoming traffic and within 300 ft when following another vehicle.');

      expect(headlightQuestion).toBeTruthy();
      expect(headlightQuestion).toContain('When windshield wipers are in constant use');
      expect(headlightQuestion).toContain('Maine §2067 requires headlights from sunset to sunrise');
      expect(headlightQuestion).toContain('visibility is under 1,000 ft');
      expect(headlightQuestion).toContain('windshield wipers are in constant use');

      expect(src).not.toContain('Required when wipers are on (2005 law)');
      expect(src).not.toContain('When windshield wipers are in use');
      expect(src).not.toContain('Maine requires headlights whenever wipers are in use');
      expect(src).not.toContain('wipers on = headlights on');
      expect(src).not.toContain('Wipers on = headlights on (Maine law)');
      expect(src).not.toContain('required when wipers on');
      expect(src).not.toContain('ON when wipers on');
      expect(src).not.toContain('Always dim within 500 ft of other vehicles');
      expect(src).not.toContain('Dim high beams within 500 ft of oncoming traffic (glare blinds them for 2+ seconds).');
      expect(src).not.toContain('Use high beams whenever there is no oncoming traffic within ~500 ft');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.on_when_wipers_on).toBe('ON when wipers are in constant use');
      expect(catalog.required_when_wipers_on).toBe(' required when wipers are in constant use or visibility is under 1,000 ft');
      expect(catalog.high_beams_are_on_remember_to_dim_for_).toBe('High beams are on. Maine requires dimming for oncoming traffic and when following another vehicle.');
      expect(catalog.dim_high_beams_within_500_ft_of_oncomi).toBe('• Maine §2067: dim high beams within 500 ft of oncoming traffic or 300 ft when following another vehicle.');
      expect(catalog.rain_desc).toBe('Wet pavement. Friction drops ~40%. Hydroplaning risk above 45 mph. Headlights on when wipers are in constant use or visibility is reduced.');
      expect(catalog.night_content).toContain('Use high beams only when clear');
      expect(catalog.night_content).toContain('within 500 ft of oncoming traffic and within 300 ft when following another vehicle');

      expect(catalog.on_when_wipers_on).not.toContain('wipers on');
      expect(catalog.required_when_wipers_on).not.toContain('wipers on');
      expect(catalog.rain_desc).not.toContain('Wipers on = headlights on');
      expect(catalog.night_content).not.toContain('Use high beams whenever there is no oncoming traffic within ~500 ft');
    }
  });

  it('frames the reaction-time simulator as a teaching model, not an exact BAC calculator', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('Your baseline vs modeled impairment');
      expect(src).toContain('Your baseline vs modeled impairment lag.');
      expect(src).toContain('teaching-model impairment lag');
      expect(src).toContain('This simulator adds ~280 ms as a teaching model for impaired reaction');
      expect(src).toContain('NHTSA lists reaction-time impairment at .08 BAC');
      expect(src).toContain('Teaching model: +280ms lag');
      expect(src).toContain('Now: Modeled Impairment');
      expect(src).toContain('Modeled impairment');
      expect(src).toContain('real impairment varies by person, fatigue, food, and other drugs');
      expect(src).toContain('0.08 BAC is the adult legal limit in most states, including Maine for drivers 21+');
      expect(src).toContain('Under-21/provisional drivers in Maine have a 0.00 alcohol standard');
      expect(src).toContain('In this model, that ');
      expect(src).toContain('feet illustrates how much farther a car can travel before delayed braking starts');

      expect(src).not.toContain('adds ~250-300ms');
      expect(src).not.toContain('With 0.08 BAC (~280ms added lag)');
      expect(src).not.toContain('simulated 0.08 BAC lag');
      expect(src).not.toContain('Your baseline vs simulated 0.08 BAC.');
      expect(src).not.toContain('Now: Simulated 0.08 BAC');
      expect(src).not.toContain('Impaired (0.08 BAC)');
      expect(src).not.toContain("what your reaction would be if you'd had 4 standard drinks");
      expect(src).not.toContain('four standard drinks for an average-size');
      expect(src).not.toContain("It's how far YOU would go before reacting");
      expect(src).not.toContain('A 0.08% BAC typically increases reaction time to 400-600 ms');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.your_baseline_vs_0_08_bac).toBe('Your baseline vs modeled impairment');
      expect(catalog.your_baseline_vs_simulated_0_08_bac).toBe('Your baseline vs modeled impairment lag.');
      expect(catalog.tap_the_colored_circle_as_fast_as_you_).toContain('teaching-model impairment lag');
      expect(catalog.a_0_08_bac_legal_limit_for_adults_adds).toContain('teaching model for impaired reaction');
      expect(catalog.now_simulated_0_08_bac).toBe('Now: Modeled Impairment');
      expect(catalog.impaired_0_08_bac).toBe('Modeled impairment');
      expect(catalog.same_test_the_simulator_will_add_280ms).toContain('real impairment varies');
      expect(catalog['0_08_bac_four_standard_drinks_for_an_a']).toContain('0.00 alcohol standard');
      expect(catalog.fatigue_alcohol_or_phone_use_can_doubl).toContain('NHTSA lists reaction-time impairment at .08 BAC');

      expect(catalog.a_0_08_bac_legal_limit_for_adults_adds).not.toContain('adds ~250-300ms');
      expect(catalog.same_test_the_simulator_will_add_280ms).not.toContain('4 standard drinks');
      expect(catalog['0_08_bac_four_standard_drinks_for_an_a']).not.toContain('four standard drinks for an average-size');
      expect(catalog.fatigue_alcohol_or_phone_use_can_doubl).not.toContain('400-600 ms');
    }
  });

  it('uses Maine stationary-vehicle passing wording for Move Over content', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('2070(8)');
      expect(src).toContain('non-adjacent lane if possible');
      expect(src).toContain('careful and prudent speed');
      expect(src).toContain('Maine Move Over law, pull-to-right rule, stationary vehicles.');
      expect(src).toContain('for disabled/flashing-light vehicles; move over or slow carefully');
      expect(src).toContain('Applies to stationary disabled vehicles and vehicles using flashing lights');
      expect(src).not.toContain('2054-A');
      expect(src).not.toContain('20 mph below the posted');
      expect(src).not.toContain('civil violation with a fine');
      expect(src).not.toContain('Maine adds $300 fine');
      expect(src).not.toContain('Maine adds a $300 fine');
      expect(src).not.toContain('Maine Move Over law, pull-to-right rule, stopped responders.');
      expect(src).not.toContain('for stopped emergency/utility vehicles');
      expect(src).not.toContain('Also applies to stopped tow trucks, utility vehicles, and roadside assistance');
    }
  });

  it('uses current Maine handheld-phone and snow/ice wording', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const snowQuestion = src.match(/\{ q: 'Before driving in winter, Maine law requires you to:'[\s\S]*?category: 'winter' \}/)?.[0];
      const textingQuestion = src.match(/\{ q: 'Texting while driving is:'[\s\S]*?category: 'dui' \}/)?.[0];
      const phoneQuestion = src.match(/\{ q: 'Cell phone use while driving in Maine is:'[\s\S]*?category: 'dui' \}/)?.[0];

      expect(src).toContain("First offense: $50; hands-free only for drivers 18+ who are not on a learner\\'s permit or intermediate license.");
      expect(src).toContain('no mobile-device use while driving, including hands-free or GPS input');
      expect(src).toContain('Take reasonable measures to prevent snow/ice from falling off your vehicle');
      expect(src).not.toContain('First offense: $85.');
      expect(src).not.toContain('$137 fine');
      expect(src).not.toContain('30-day license suspension in Maine');
      expect(src).not.toContain('Clear ALL snow from your car before driving (including the roof');
      expect(src).toContain('$250-$500 fine');
      expect(src).toContain('60-day first-offense license suspension');
      expect(src).toContain('another 270 days of intermediate-license restrictions');

      expect(textingQuestion).toBeTruthy();
      expect(textingQuestion).toContain('Maine §2119 bans text messaging while operating on a public way');
      expect(textingQuestion).toContain('temporarily stopped for traffic, a traffic light, or a stop sign');
      expect(textingQuestion).toContain('First offense is at least $250');

      expect(phoneQuestion).toBeTruthy();
      expect(phoneQuestion).toContain('hands-free only if 18+ and not permit/intermediate');
      expect(phoneQuestion).toContain('Maine §2121 bans handheld phone/device interaction while operating');
      expect(phoneQuestion).toContain("Hands-free is allowed only for drivers 18+ who are not using a learner\\'s permit or intermediate license");
      expect(phoneQuestion).not.toContain('hands-free is OK for adults');
      expect(phoneQuestion).not.toContain('Hands-free is legal for adults but banned for drivers under 18 with intermediate licenses');

      expect(snowQuestion).toBeTruthy();
      expect(snowQuestion).toContain('Take reasonable measures to prevent snow and ice from falling off your vehicle');
      expect(snowQuestion).toContain('Safest practice: clear the roof, windows, lights, and hood');
      expect(snowQuestion).not.toContain('Clear ALL snow and ice from the vehicle');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.all_handheld_use_banned_texting_250).toContain('hands-free only 18+ and not permit/intermediate');
      expect(catalog.all_handheld_phone_use_banned_while_dr).toContain('Maine §2121: handheld phone/device interaction is banned while operating');
      expect(catalog.first_offense_primary_enforcement_unde).toContain("Hands-free is allowed only for drivers 18+ who are not on a learner's permit or intermediate license");
      expect(catalog.all_handheld_phone_use_banned_while_dr).not.toContain('2019');
      expect(catalog.first_offense_primary_enforcement_unde).not.toContain('Under 18: zero tolerance');

      expect(catalog.winter_content).toContain('Take reasonable measures so snow and ice cannot fall from your car');
      expect(catalog.winter_content).toContain('safest practice is clearing the roof, windows, lights, and hood');
      expect(catalog.winter_content).not.toContain('Clear ALL snow from your car before driving');
      expect(catalog.winter_content).not.toContain('state law');
    }
  });

  it('uses current Maine intermediate-license restriction wording', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('270-day intermediate restriction period');
      expect(src).toContain('Midnight - 5 AM during the 270-day intermediate restriction period');
      expect(src).toContain('passengers other than immediate family');
      expect(src).toContain('qualifying licensed operator');
      expect(src).toContain('$250-$500 fine');
      expect(src).toContain('60-day first-offense suspension');
      expect(src).toContain('another 270 days of restrictions');
      expect(src).toContain('70 hours of supervised driving, including 10 at night');
      expect(src).toContain('intermediateHeldDays < 270');
      expect(src).toContain('intermediateRestrictionActive');

      expect(src).not.toContain('with exceptions for work, school, medical, or accompanied driving');
      expect(src).not.toContain('except to/from work, school, religious activity');
      expect(src).not.toContain('licensed emergency-responder activity');
      expect(src).not.toContain('blanket exemption');
      expect(src).not.toContain('No passengers under 20');
      expect(src).not.toContain('Full License at 17 with a clean 180-day record');
      expect(src).not.toContain("75 hours if you're not");
      expect(src).not.toContain('A moving-violation conviction during intermediate phase restarts');
      expect(src).not.toContain('Restarts the 9-month intermediate clock');
      expect(src).not.toContain('restarts your 270-day clock');
      expect(src).not.toContain('RESETS your 270-day intermediate clock');
    }
  });

  it('does not teach a Maine left-on-red one-way exception', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('At a steady red light, do not make a left turn unless a traffic signal specifically allows that movement.');
      expect(src).not.toContain('left turn on red from a one-way to a one-way is legal');
    }
  });

  it('aligns Maine pedestrian crosswalk wording with section 2056', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const markedCrosswalkQuestion = src.match(/\{ q: 'At a marked crosswalk in Maine, when must a driver yield to a pedestrian\?'[\s\S]*?category: 'pedestrian' \}/)?.[0];
      const outsideCrosswalkQuestion = src.match(/\{ q: 'If a pedestrian is crossing outside a marked crosswalk in Maine, a driver should:'[\s\S]*?category: 'pedestrian' \}/)?.[0];
      const visualImpairmentQuestion = src.match(/\{ q: 'A pedestrian carrying a white cane \(sometimes with a red tip\) is signaling:'[\s\S]*?category: 'pedestrian' \}/)?.[0];
      const crossingGuardQuestion = src.match(/\{ q: 'Approaching a school crossing where a crossing guard holds up a stop paddle, you must:'[\s\S]*?category: 'pedestrian' \}/)?.[0];

      expect(markedCrosswalkQuestion).toBeTruthy();
      expect(markedCrosswalkQuestion).toContain('shows visible intent to enter the marked crosswalk');
      expect(markedCrosswalkQuestion).toContain('Maine §2056 requires drivers to yield');
      expect(outsideCrosswalkQuestion).toBeTruthy();
      expect(outsideCrosswalkQuestion).toContain('pedestrian generally yields outside marked crosswalks');
      expect(outsideCrosswalkQuestion).toContain('drivers must exercise due care');
      expect(visualImpairmentQuestion).toBeTruthy();
      expect(visualImpairmentQuestion).toContain('Visual impairment — yield, stop as needed, and give room');
      expect(visualImpairmentQuestion).toContain('A white or metallic cane, with or without a red tip, or a guide/personal care dog');
      expect(visualImpairmentQuestion).toContain('Maine §2056 requires drivers to yield');
      expect(visualImpairmentQuestion).toContain('$50-$1,000 fine');
      expect(visualImpairmentQuestion).toContain('avoid honking unless necessary to prevent an immediate collision');
      expect(crossingGuardQuestion).toBeTruthy();
      expect(crossingGuardQuestion).toContain('Maine §2091-A requires drivers to obey a qualified school crossing guard');
      expect(crossingGuardQuestion).toContain('hand signal or handheld traffic-control device at a marked crosswalk');
      expect(crossingGuardQuestion).toContain('may not contradict or override a lighted traffic or pedestrian signal');

      expect(src).toContain('Pedestrian with a WHITE or METALLIC CANE or GUIDE DOG: Maine §2056 requires drivers to yield. Stop as needed, give room, and avoid honking unless necessary to prevent an immediate collision.');
      expect(src).toContain('Stop as needed, give room, and avoid honking unless necessary to prevent an immediate collision.');

      expect(src).not.toContain('A pedestrian is at an UNMARKED crosswalk');
      expect(src).not.toContain('Pedestrian right-of-way in Maine extends to:');
      expect(src).not.toContain('jaywalking does not strip right-of-way');
      expect(src).not.toContain('absolute right-of-way');
      expect(src).not.toContain('must come to a complete stop');
      expect(src).not.toContain('drivers MUST stop fully');
      expect(src).not.toContain('wait until the person is across');
      expect(src).not.toContain('never honk');
      expect(src).not.toContain('Do not honk — the sound disorients them');
      expect(src).not.toContain("A school crossing guard's stop paddle has the legal authority of a stop sign.");
      expect(src).not.toContain('Always stop for crossing guard.');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.pedestrians_always_have_row_in_crosswa).toBe('Yield at marked crosswalks');
      expect(catalog.maine_is_strict_on_this_164_fine_for_f).toBe('Maine §2056 is specific: marked crosswalks and visible intent matter; due care still applies everywhere.');
      expect(catalog.maine_is_strict_on_this_164_fine_for_f).not.toContain('$164');
    }
  });

  it('keeps broad road-rule language precise and Maine-specific where needed', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expectPhrases(src, [
        'CORE RULES OF THE ROAD (U.S. baseline patterns)',
        'broad baseline patterns every US driver is expected to know',
        'Lawfully directed processions and traffic control',
        'Obey officers, escorts, and traffic-control devices',
        'Commercial operation requires the proper bus/CDL credential.',
        'Treat the left lane as a passing lane unless signs or lane markings say otherwise.',
        'Solid white line = lane change discouraged; stay in lane unless a safe, necessary move is allowed.',
        'Maine §2070: pass on the left as the default.',
        'never drive off pavement to pass.',
        'Maine §2070: do not drive left of center to pass near a crest or curve when your view is obstructed enough to create a hazard.',
        'Do not pass left of center within 100 ft of or through an intersection or railroad grade crossing',
        'where your view is obstructed within 100 ft of a bridge, viaduct, or tunnel.',
        'School zones: Maine §2074 sets 15 mph during active periods:',
        'flashing signs during opening/closing hours, or locally designated times.',
        'School area or crossing. Obey posted/active school-zone speed and watch for children.',
        'Maine §2056: yield to pedestrians crossing in marked crosswalks or showing visible intent to enter one',
        'Pedestrians in marked crosswalks or showing visible intent to enter one',
        'Marked crosswalk: Maine §2056 requires drivers to yield to pedestrians crossing or showing visible intent to enter.',
        'Outside marked crosswalks, pedestrians generally yield, but drivers must still exercise due care and avoid collisions.',
        'Pedestrians using a white or metallic cane or guide dog',
        'In Maine, yield to visually impaired pedestrians; stop as needed and give them room.',
        'WHITE or METALLIC CANE or GUIDE DOG',
        'Yield at marked crosswalks',
        'Maine §2056 is specific: marked crosswalks and visible intent matter; due care still applies everywhere.',
        'Move Over / stationary-vehicle rules',
        'Basic speed law: drive at a speed that is reasonable and prudent',
        'Posted construction-speed violations can carry doubled fines.',
        'Construction speed fines',
        'Maine law doubles fines for violations of restricted construction or maintenance speed limits',
        'Maine §2093 requires reasonable measures to prevent snow or ice from falling off vehicles under 10,000 lb.',
        'Maine law: draw as near as practicable to the right-hand curb, clear of any intersection',
        'Maine §2054 does not list a divided-highway exception for approaching emergency vehicles',
        'Pull right, stay clear of intersections, and stop for emergency vehicles.',
        'move as far right as practicable, stay clear of intersections',
        'In Maine, failure to yield to an emergency vehicle is a Class E crime with at least a $250 fine for a first offense',
        'Hazard flashers can confuse other drivers while moving; save them for an actual hazard or when stopped/disabled.',
        'may qualify you for an insurer/state discount; verify with your insurer.',
        'Do not cut into a funeral procession already moving through your path.',
      ]);

      const mooseFogScenario = src.match(/id: 'fog_zone'[\s\S]*?exp: '([^']*)'/)?.[0];
      expect(mooseFogScenario).toBeTruthy();
      expect(mooseFogScenario).toContain('Hazard flashers can confuse other drivers while moving; save them for an actual hazard or when stopped/disabled.');

      expect(src).not.toContain('UNIVERSAL RULES OF THE ROAD (apply in all 50 states)');
      expect(src).not.toContain('These are the universal patterns every US driver is expected to know');
      expect(src).not.toContain('all 50 states');
      expect(src).not.toContain('Mandatory full stop in all 50 states');
      expect(src).not.toContain('MANDATORY right-of-way ANYWHERE');
      expect(src).not.toContain('right-of-way even through red lights');
      expect(src).not.toContain('Fines are typically DOUBLED in work zones.');
      expect(src).not.toContain('Fines double. Workers present');
      expect(src).not.toContain('Maine §2396-B requires a clear view');
      expect(src).not.toContain('School zones: reduced speed when children are present or signs are flashing.');
      expect(src).not.toContain('Children present. Reduced speed, school crossings.');
      expect(src).not.toContain('children may be present and the school-zone speed limit (typically 15 mph in Maine) is in effect');
      expect(src).not.toContain('No passing in school zones when children are present');
      expect(src).not.toContain('within 100 ft of a school crossing');
      expect(src).not.toContain('Never pass on hills, curves, within 100 ft of an intersection, railroad crossing, bridge, or tunnel.');
      expect(src).not.toContain('$119 ticket');
      expect(src).not.toContain('Pedestrians always have right-of-way');
      expect(src).not.toContain('marked AND unmarked crosswalks');
      expect(src).not.toContain('Marked crosswalk OR unmarked crosswalk');
      expect(src).not.toContain('A pedestrian is at an UNMARKED crosswalk');
      expect(src).not.toContain('every intersection is a legal crosswalk in Maine');
      expect(src).not.toContain('Unmarked crosswalk = the imaginary extension');
      expect(src).not.toContain('Pedestrians ALWAYS have ROW in crosswalks');
      expect(src).not.toContain('$164 fine');
      expect(src).not.toContain('stop where you are. The emergency vehicle will go around you.');
      expect(src).not.toContain('Failure to yield is a criminal offense in most states');
      expect(src).not.toContain('fines from $250 to $2,500');
      expect(src).not.toContain('Hazards while driving are illegal in most states');
      expect(src).not.toContain('Never drive with hazards ON the move in Maine');
      expect(src).not.toContain('Requires CDL in most states');
      expect(src).not.toContain('"Left lane for passing" is law in most states');
      expect(src).not.toContain('not illegal in most states');
      expect(src).not.toContain('5-10% discount in most states');
      expect(src).not.toContain('only traffic on the SAME side as the emergency vehicle must pull over');
      expect(src).not.toContain("you don't need to stop for oncoming emergency vehicles");
      expect(src).not.toContain('Passing on the right is illegal except on multi-lane roads');
    }
  });

  it('keeps every permit-test category represented', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const category of PERMIT_CATEGORIES) {
        const matches = src.match(new RegExp(`category: '${category}'`, 'g')) || [];
        expect(matches.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every universal rules-of-road pillar and key rule cue available', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const [pillar, phrases] of Object.entries(UNIVERSAL_RULE_PILLARS)) {
        expect(src).toContain(`${pillar}: {`);
        expectPhrases(src, phrases);
      }
    }
  });

  it('keeps every driving scenario with its posted limit and rule cues', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const scenarios = arrayBlock(src, 'var SCENARIOS = [');

      for (const scenario of DRIVING_SCENARIOS) {
        expect(scenarios).toContain(`id: '${scenario.id}'`);
        expect(scenarios).toContain(`speedLimit: ${scenario.speedLimit}`);
        expectPhrases(scenarios, scenario.phrases);
      }
    }
  });
  it('uses current Maine §2074 defaults for open-world speed-limit signs and enforcement', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('Maine §2074 defaults for unposted/open-world zones');
      expect(src).toContain('var BIOME_SPEED_LIMIT_MPH = { residential: 25, suburban: 25, commercial: 25, industrial: 25, rural: 45 };');
      expect(src).toContain('function getBiomeSpeedLimitMph(biome, fallbackMph)');
      expect(src).toContain('var newLimit = getBiomeSpeedLimitMph(currentBiome, 25);');
      expect(src).toContain('return worldPostedLimitMph(worldForLimit, ch, 25);');
      expect(src).toContain('var biomeLimit = worldPostedLimitMph(iw, chunk, 25);');
      expect(src).toContain('var slBiomeMph = worldPostedLimitMph(iw, chunk, 25);');
      expect(src).toContain('var paintLimit = worldPostedLimitMph(iw, chunk, 25);');
      expect(src).toContain("speedLimit: feMap === 'highway' ? 65 : feMap === 'roundabout' ? 25 : getBiomeSpeedLimitMph(feMap, 25)");

      expect(src).not.toContain('var biomeSpeedMap = { residential: 25, suburban: 35, commercial: 30, industrial: 35, rural: 50 };');
      expect(src).not.toContain("chunk.biome === 'rural' ? 50");
      expect(src).not.toContain("feMap === 'rural' ? 50");
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;
      expect(catalog.school_zone_desc).toContain('Maine §2074: 15 mph during recess, opening/closing windows, flashing signs, or local active times.');
      expect(catalog.school_zone_desc).not.toContain('when children present');
    }
  });

  it('keeps every open-world landmark rule hook and scripted landmark event', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const landmarks = arrayBlock(src, 'var LANDMARK_TYPES = [');

      for (const landmark of LANDMARK_TYPES) {
        expect(landmarks).toContain(`id: '${landmark.id}'`);
        expectPhrases(landmarks, landmark.phrases);
      }

      expectPhrases(src, [
        'SLOW DOWN to 15 mph (active school zone)',
        'check your speed',
        'watch for pedestrians',
        'farm equipment may be slow',
        'emergency vehicles may exit',
        'watch for ambulances',
        'Pass a school landmark at 15 mph or less.',
        'schoolSpeedMph <= 15',
      ]);
      expectPhrases(src, LANDMARK_EVENT_PHRASES);
      expect(src).not.toContain('Pass a school landmark at 20 mph or less.');
      expect(src).not.toContain('schoolSpeedMph <= 20');
    }
  });

  it('keeps every Help Hub road-rule view discoverable', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const view of HELP_HUB_RULE_VIEWS) {
        expect(src).toContain(`view: '${view}'`);
      }
    }
  });

  it('keeps every scripted drill and right-of-way scenario id available', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const [view, ids] of Object.entries(SCRIPTED_DRILL_IDS)) {
        expect(src).toContain(`if (view === '${view}')`);
        for (const id of ids) {
          expect(src).toContain(`id: '${id}'`);
        }
      }
    }
  });

  it('keeps every quiz-style scripted drill scenario answerable and explanatory', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const view of QUIZ_DRILL_VIEWS) {
        const block = viewBlock(src, view);
        for (const id of SCRIPTED_DRILL_IDS[view]) {
          const scenario = windowAfter(block, `id: '${id}'`);
          const correct = scenario.match(/correct:\s*(\d+)/);

          expect(scenario).toContain('q:');
          expect(scenario).toContain('choices:');
          expect(correct).toBeTruthy();
          expect(Number(correct[1])).toBeGreaterThanOrEqual(0);
          expect(Number(correct[1])).toBeLessThan(4);
          expect(scenario).toContain('exp:');
          expect(scenario).not.toMatch(/TODO|TBD|undefined/);
        }
      }
    }
  });

  it('keeps every peer-pressure script grounded in a context with safe and unsafe responses', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'peerPressure');

      for (const id of SCRIPTED_DRILL_IDS.peerPressure) {
        const scenario = windowAfter(block, `id: '${id}'`);

        expect(scenario).toContain('friend:');
        expect(scenario).toContain('text:');
        expect(scenario).toContain('context:');
        expect(scenario).toContain('choices:');
        expect(scenario).toContain('safe: true');
        expect(scenario).toContain('safe: false');
        expect(scenario).toContain('reply:');
      }
    }
  });

  it('keeps every emergency-handbook entry actionable', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'emergencyHandbook');

      for (const id of SCRIPTED_DRILL_IDS.emergencyHandbook) {
        const scenario = windowAfter(block, `id: '${id}'`);

        expect(scenario).toContain('urgency:');
        expect(scenario).toContain('scenario:');
        expect(scenario).toContain('steps:');
        expect(scenario).toContain('never:');
      }
    }
  });

  it('keeps every crash-lab scenario tied to physics and prevention guidance', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'crashLab');

      for (const id of SCRIPTED_DRILL_IDS.crashLab) {
        const scenario = windowAfter(block, `id: '${id}'`);

        expect(scenario).toContain('desc:');
        expect(scenario).toContain('physics:');
        expect(scenario).toContain('prevention:');
      }
    }
  });

  it('keeps every permit-bank question structurally valid', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const permitBank = arrayBlock(src, 'var PERMIT_BANK = [');
      const questions = permitBank.match(/\{ q: [\s\S]*?category: '[^']+' \}/g) || [];

      expect(questions.length).toBeGreaterThan(150);

      for (const question of questions) {
        const category = question.match(/category: '([^']+)'/)?.[1];
        const correct = question.match(/correct:\s*(\d+)/);

        expect(question).toContain('a: [');
        expect(correct).toBeTruthy();
        expect(Number(correct[1])).toBeGreaterThanOrEqual(0);
        expect(Number(correct[1])).toBeLessThan(4);
        expect(question).toContain('exp:');
        expect(PERMIT_CATEGORIES).toContain(category);
      }
    }
  });

  it('keeps every Help Hub rule card navigable and described', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'helpHub');

      for (const view of HELP_HUB_RULE_VIEWS) {
        const card = windowAfter(block, `view: '${view}'`, 700);

        expect(card).toContain('goal:');
        expect(card).toContain('icon:');
        expect(card).toContain('name:');
        expect(card).toContain('desc:');
      }

      expect(block).toContain("minHeight: '104px'");
      expect(block).toContain("boxSizing: 'border-box'");
      expect(block).toContain("width: '32px', height: '32px'");
      expect(block).toContain("overflowWrap: 'anywhere'");
      expect(block).not.toContain("borderRadius: '10px', padding: '14px'");
    }
  });

  it('keeps Help Hub feature counts aligned with actual RoadReady content', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'helpHub');

      expect(src).toContain(`${SCRIPTED_DRILL_IDS.rightOfWay.length} "who goes first?" scenarios`);
      expect(block).toContain(`${SCRIPTED_DRILL_IDS.rightOfWay.length} right-of-way and intersection puzzles.`);
      expect(block).toContain(`Parking Practice (${PARKING_SCENARIOS.length + 3} Scenarios)`);
      expect(block).toContain(`Tire blowout, brake failure, hydroplane — ${SCRIPTED_DRILL_IDS.emergencyHandbook.length} critical responses.`);
      expect(src).not.toContain('18 "who goes first?" scenarios');
      expect(block).not.toContain('10 "who goes first?" intersection puzzles.');
      expect(block).not.toContain('Parking Practice (7 Scenarios)');
      expect(block).not.toContain('8 critical responses.');
    }
  });

  it('keeps the road-sign reference library complete and quiz-ready', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'signsView');
      const libraryStart = block.indexOf('var signLibrary = [');
      const libraryEnd = block.indexOf('var selCat', libraryStart);
      const library = block.slice(libraryStart, libraryEnd);
      const entries = library.match(/\{ cat: /g) || [];

      expect(libraryStart).toBeGreaterThanOrEqual(0);
      expect(libraryEnd).toBeGreaterThan(libraryStart);
      expect(entries.length).toBe(SIGN_LIBRARY_ITEMS.length);
      expect(block).toContain('buildSignsQuiz');
      expect(block).toContain('questionCount = Math.min(10, n)');
      expect(block).toContain('correctPos: choiceIndices.indexOf(correctIdx)');

      for (const name of SIGN_LIBRARY_ITEMS) {
        const namePos = library.indexOf(name);
        const sign = library.slice(Math.max(0, namePos - 180), namePos + 1200);

        expect(namePos).toBeGreaterThanOrEqual(0);
        expect(sign).toContain('cat:');
        expect(sign).toContain('svg:');
        expect(sign).toContain('meaning:');
        expect(sign).toContain('when:');
      }

      expect(library).toContain('Maine §2074 sets 15 mph during recess, school opening/closing windows, flashing signs, or locally designated active times.');
      expect(library).toContain('Posted school-zone approaches, school driveways, and school-area crossings.');
      expect(library).toContain("Obey a qualified crossing guard\\'s hand signal or handheld traffic-control device; the guard may not override a lighted traffic or pedestrian signal.");
      expect(library).toContain('Marked school crosswalks where a qualified guard is directing traffic.');
      expect(src).toContain('Maine §2076: slow and look both ways; stop when signals, gates, a flagger, a train, or law requires.');
      expect(library).toContain('Round yellow W10-1 advance warning: train tracks ahead. Maine §2076 says slow by 100 ft from the nearest rail, look both ways, and be ready to stop.');
      expect(library).toContain('MUTCD W10-1 advance warning before a grade crossing; the crossbuck marks the actual crossing.');
      expect(src).toContain("colorName: 'Fluorescent yellow-green pentagon'");
      expect(src).toContain("color: '#ccff00'");
      expect(src).toContain('var szMat = new T.MeshBasicMaterial({ color: 0xccff00 });');
      expect(src).toContain('var schoolSignMat = new T.MeshBasicMaterial({ color: 0xccff00 });');
      expect(block).toMatch(/\{ id: 'school', label: (?:__alloT\('stem\.roadready\.school', 'School'\)|'School'), color: '#ccff00' \}/);
      expect(library).toContain("fill:'#ccff00'");
      expect(block).not.toContain("fill:'#ca8a04'");
      expect(block).not.toContain("color: '#ca8a04'");
      expect(src).not.toContain('var schoolSignMat = new T.MeshBasicMaterial({ color: 0xfacc15 });');
      expect(library).not.toContain('Train tracks ahead. Look, listen, stop if the crossarm is down.');
      expect(library).not.toContain('15-50 ft before any railroad crossing.');
      expect(library).not.toContain('Within 1000 ft of any elementary school.');
    }
  });

  it('keeps scenario parking configs wired to playable RoadReady views', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const parkingStart = src.indexOf('var PARKING_SCENARIOS = {');
      const parkingEnd = src.indexOf('function ScenarioParkingMode', parkingStart);
      const parkingBlock = src.slice(parkingStart, parkingEnd);

      expect(parkingStart).toBeGreaterThanOrEqual(0);
      expect(parkingEnd).toBeGreaterThan(parkingStart);

      for (const scenario of PARKING_SCENARIOS) {
        const config = windowAfter(parkingBlock, `${scenario.id}: {`, 1700);

        expect(config).toContain(`id: '${scenario.id}'`);
        expect(config).toContain('label:');
        expect(config).toContain('difficulty:');
        expect(config).toContain('hint:');
        expect(config).toContain('startCar:');
        expect(config).toContain('slot:');
        expect(config).toContain(`bestKey: '${scenario.id}'`);
        expect(config).toContain('stepCheck: function');

        expect(src).toContain(`if (view === '${scenario.view}')`);
        expect(src).toContain(`PARKING_SCENARIOS.${scenario.id}`);
        expect(src).toContain(`scenarioParkingHandler('${scenario.id}')`);
      }
    }
  });

  it('keeps the guided lesson path mapped to real driving scenarios', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'lessonPath');

      for (const stage of LESSON_PATH_STAGES) {
        const lesson = windowAfter(block, `scenarioId: '${stage.scenarioId}'`, 500);

        expect(lesson).toContain(`minSafety: ${stage.minSafety}`);
        expect(lesson).toContain('desc:');
      }
    }
  });

  it('keeps every hazard-perception event and reaction window available', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const hazard of HAZARD_EVENTS) {
        expect(src).toContain(`type: '${hazard.type}', reactionLimit: ${hazard.reactionLimit}`);
      }
    }
  });

  it('keeps hazard-perception events descriptive and bounded', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'hazardTest');

      for (const hazard of HAZARD_EVENTS) {
        const needle = `type: '${hazard.type}', reactionLimit: ${hazard.reactionLimit}`;
        const pos = block.indexOf(needle);
        const event = block.slice(Math.max(0, pos - 260), pos + needle.length + 80);

        expect(pos).toBeGreaterThanOrEqual(0);
        expect(event).toContain('desc:');
        expect(event).toContain('reactionLimit:');
        expect(hazard.reactionLimit).toBeGreaterThan(0);
        expect(hazard.reactionLimit).toBeLessThanOrEqual(3);
      }

      expect(block).toContain('hazard_ace');
      expect(block).toContain('htState.score >= 8');
    }
  });

  it('keeps every achievement structurally complete', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = arrayBlock(src, 'var ACHIEVEMENTS = [');
      const entries = block.match(/\{ id: /g) || [];

      expect(entries.length).toBe(ACHIEVEMENT_IDS.length);

      for (const id of ACHIEVEMENT_IDS) {
        const achievement = windowAfter(block, `id: '${id}'`, 500);

        expect(achievement).toContain('icon:');
        expect(achievement).toContain('name:');
        expect(achievement).toContain('desc:');
      }
    }
  });

  it('keeps free-explore challenge cards bounded and completable', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = arrayBlock(src, 'var CHALLENGES = [');
      const entries = block.match(/\n    \{\n      id: /g) || [];

      expect(entries.length).toBe(FREE_EXPLORE_CHALLENGE_IDS.length);

      for (const id of FREE_EXPLORE_CHALLENGE_IDS) {
        const challenge = windowAfter(block, `id: '${id}'`, 2600);

        expect(challenge).toContain('title:');
        expect(challenge).toContain('desc:');
        expect(challenge).toContain('duration:');
        expect(challenge).toContain('check: function');
        expect(challenge).toContain('progress:');
        expect(challenge).toMatch(/passed: true|failed: true/);
      }
    }
  });

  it('keeps curated free-explore road trips tied to real landmarks', () => {
    const landmarkIds = LANDMARK_TYPES.map((landmark) => landmark.id);

    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = arrayBlock(src, 'var TRIPS = [');
      const entries = block.match(/\n    \{\n      id: /g) || [];

      expect(entries.length).toBe(Object.keys(ROAD_TRIP_GOALS).length);

      for (const [tripId, goals] of Object.entries(ROAD_TRIP_GOALS)) {
        const trip = windowAfter(block, `id: '${tripId}'`, 1100);

        expect(trip).toContain('name:');
        expect(trip).toContain('desc:');
        expect(trip).toContain('goals:');

        for (const landmarkId of goals) {
          expect(landmarkIds).toContain(landmarkId);
          expect(trip).toContain(`landmarkId: '${landmarkId}'`);
        }
      }
    }
  });

  it('keeps daily challenge tasks routed to real RoadReady views', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'dailyChallenge');
      const poolStart = block.indexOf('var dailyPool = [');
      const poolEnd = block.indexOf('var todayChallenge', poolStart);
      const pool = block.slice(poolStart, poolEnd);
      const entries = pool.match(/\{ icon: /g) || [];

      expect(poolStart).toBeGreaterThanOrEqual(0);
      expect(poolEnd).toBeGreaterThan(poolStart);
      expect(entries.length).toBe(13);

      for (const daily of DAILY_CHALLENGE_ACTIONS) {
        if (daily.scenario) {
          expect(pool).toContain(`action: '${daily.action}', scenario: '${daily.scenario}'`);
        } else {
          expect(pool).toContain(`action: '${daily.action}'`);
          expect(block).toContain(daily.route);
        }
      }

      expect(block).toContain("startDriving(todayChallenge.scenario, selectedVehicle)");
      expect(block).toContain('daily_streak_3');
      expect(block).toContain('newStreak >= 7');
      expect(block).toContain('newStreak >= 30');
    }
  });

  it('keeps Maine GDL tracker stages, restrictions, and progress thresholds current', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'gdlTracker');

      for (const stage of GDL_STAGE_KEYS) {
        expect(block).toContain(`${stage}: {`);
      }

      expectPhrases(block, [
        'age < 15',
        'permitHeld < 0.5',
        'age >= 16',
        'intermediateHeldDays < 270',
        'Curfew: Midnight - 5 AM during the 270-day restriction period',
        'No passengers other than immediate family unless a qualifying licensed operator is beside you',
        'Zero handheld phone use',
        'Zero tolerance',
        'totalHrs / 70',
      ]);
    }
  });

  it('keeps maintenance warning lights and dashboard references actionable', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const gameBlock = viewBlock(src, 'maintenanceGame');
      const dashBlock = viewBlock(src, 'dashLights');
      const gameEntries = gameBlock.match(/\{ id: '[^']+'/g) || [];
      const dashEntries = dashBlock.match(/\{ icon: /g) || [];

      expect(gameEntries.length).toBe(WARNING_LIGHT_IDS.length);
      expect(dashEntries.length).toBe(10);

      for (const id of WARNING_LIGHT_IDS) {
        const light = windowAfter(gameBlock, `id: '${id}'`, 850);

        expect(light).toContain('name:');
        expect(light).toContain('correct:');
        expect(light).toContain('choices:');
        expect(light).toContain('correctIdx:');
      }

      expectPhrases(gameBlock, [
        'maintenance_master',
        'newCorrect >= 8',
        'Pull over immediately and shut off engine',
        'Normal brakes still work; get it serviced within a week',
      ]);
      expectPhrases(dashBlock, [
        'severity: \'CRITICAL\'',
        'severity: \'MODERATE\'',
        'severity: \'INFO\'',
        'Pull over IMMEDIATELY',
        'Dim within 500 ft of oncoming traffic or 300 ft when following another vehicle',
      ]);
    }
  });

  it('keeps the pre-trip checklist complete and road-test aware', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'preTrip');
      const ids = [...block.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
      const areas = block.match(/area: /g) || [];

      expect(ids).toEqual(PRE_TRIP_CHECK_IDS);
      expect(areas.length).toBe(6);
      expect(block).toContain('totalItems = checks.reduce');
      expect(block).toContain('pctDone < 80');
      expect(block).toContain('pretrip_pro');
      expect(block).toContain("updMulti({ view: 'roadTestIntro', roadTestStage: 'drive' })");
    }
  });

  it('keeps post-crash protocol phases urgent, practical, and exportable', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const block = viewBlock(src, 'postCrash');
      const phases = block.match(/time: /g) || [];

      expect(phases.length).toBe(7);
      expectPhrases(block, [
        'check YOURSELF for injury',
        'apparent property damage of $2,000 or more',
        'Turn on HAZARD LIGHTS',
        'Photo of the other driver\\\'s license and insurance card',
        'If police respond or take the report, write down the report number',
        'Do NOT post about it on social media',
        'post_crash_protocol.md',
      ]);
    }
  });

  it('uses current Maine crash-reporting and unattended-vehicle wording', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const minorCrash = src.match(/\{ q: 'You are involved in a minor fender bender with no injuries\.[\s\S]*?category: 'emergency' \}/)?.[0];
      const parkedCar = src.match(/\{ q: 'You hit a parked car and the owner is nowhere around\.[\s\S]*?category: 'emergency' \}/)?.[0];
      const postCrashBlock = viewBlock(src, 'postCrash');

      expect(minorCrash).toBeTruthy();
      expect(minorCrash).toContain('Maine §2251 defines a reportable accident');
      expect(minorCrash).toContain('injury, death, or apparent property damage of $2,000 or more');

      expect(parkedCar).toBeTruthy();
      expect(parkedCar).toContain('Stop and leave a conspicuous note with your name, address, vehicle registration number');
      expect(parkedCar).toContain('Maine §2254: stop and notify the owner if possible');
      expect(parkedCar).toContain('Provide insurance evidence if the owner requests it');

      expect(postCrashBlock).toContain('Call 911 or the nearest law-enforcement agency for injury, death, a traffic hazard, or apparent property damage of $2,000 or more');
      expect(postCrashBlock).toContain('reportable crashes must be reported immediately by the quickest means');
      expect(postCrashBlock).toContain('Give them the police report number if one was issued');
      expect(postCrashBlock).not.toContain('Dial 911 even for "minor" crashes');
      expect(postCrashBlock).not.toContain('over $1000 damage');
      expect(src).not.toContain('damage > $1,000');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;
      expect(catalog.call_911_2).toBe('Report / Call 911');
    }
  });
  it('keeps vulnerable-road-user and keyboard-control guidance visible', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const bikeBlock = viewBlock(src, 'bikeAware');
      const defensiveBlock = viewBlock(src, 'defensiveList');
      const keyboardBlock = viewBlock(src, 'keyboardCheatSheet');
      const bikeSwerve = defensiveBlock.match(/id: 'bike_swerve'[\s\S]*?id: 'tailgater'/)?.[0];

      expectPhrases(bikeBlock, [
        '3-Foot Passing Law',
        'AT LEAST 3 FEET',
        'No-passing-zone pass only when safe',
        'clear view, no oncoming conflict, and enough room to complete the pass. Wait if not.',
        'prima facie evidence of a §2070 violation',
        'use your FAR hand',
        'RIGHT HOOK',
        'Signal 100 ft early',
        'SHOULDER CHECK',
      ]);

      expectPhrases(src, [
        'Maine §2070: give bicycles and roller skiers at least 3 feet when passing',
        'Maine §2070 requires at least 3 feet when passing a bicycle or roller skier',
        'You may pass in a no-passing zone only when it is safe',
        'Use a no-passing-zone pass only with clear visibility, no oncoming conflict, and enough room to complete it safely.',
      ]);

      expect(bikeSwerve).toBeTruthy();
      expect(bikeSwerve).toContain('Swerve further left into the oncoming lane');
      expect(bikeSwerve).toContain('Maine §2070 allows passing a bicycle in a no-passing zone only when safe');
      expect(bikeSwerve).toContain('cross the centerline only if you have clear visibility and no oncoming conflict');

      expect(src).not.toContain('Must give cyclists at least 3 feet when passing (2015 law)');
      expect(src).not.toContain('Maine law (2015) requires a minimum 3 feet');
      expect(src).not.toContain('Crossing a double yellow to do so is legal if safe');
      expect(src).not.toContain('Crossing a double-yellow centerline');
      expect(src).not.toContain('Cross the centerline to pass if the oncoming lane is clear');
      expect(src).not.toContain('Swerve further left across the double-yellow');
      expect(src).not.toContain('Never cross the yellow line to avoid a cyclist');
      expect(src).not.toContain('Violation = $75 fine plus any crash liability');
      expect(src).not.toContain('You may cross the double yellow line');

      expectPhrases(keyboardBlock, [
        'w: {',
        's: {',
        'e: {',
        'v: {',
        'l: {',
        'z: {',
        'x: {',
        'Horn',
      ]);
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.when_passing_a_bicyclist_maine_law_req).toBe('When passing a bicyclist or roller skier, Maine law requires AT LEAST 3 FEET of clearance. ');
      expect(catalog.you_may_cross_the_double_yellow_line).toBe('No-passing-zone pass only when safe');
      expect(catalog.to_do_it_safely_as_long_as_the_oncomin).toBe(': clear view, no oncoming conflict, and enough room to complete the pass. Wait if not. ');
      expect(catalog.violation_75_fine_plus_any_crash_liabi).toBe('A collision with a bicycle or roller skier is prima facie evidence of a §2070 violation.');

      expect(catalog.you_may_cross_the_double_yellow_line).not.toContain('double yellow');
      expect(catalog.violation_75_fine_plus_any_crash_liabi).not.toContain('$75 fine');
    }
  });

  it('keeps the learning path and road-test rubric broad enough for road readiness', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const learningBlock = viewBlock(src, 'learningPath');
      const rubricBlock = viewBlock(src, 'roadTestRubric');
      const checks = learningBlock.match(/check: function/g) || [];

      expect(checks.length).toBe(LEARNING_PATH_STAGE_MODES.length);

      for (let i = 0; i < LEARNING_PATH_STAGE_MODES.length; i += 1) {
        expect(learningBlock).toContain(`stage: ${i + 1}`);
        for (const mode of LEARNING_PATH_STAGE_MODES[i]) {
          expect(learningBlock).toContain(`'${mode}'`);
        }
      }

      for (const category of ROAD_TEST_RUBRIC_CATEGORIES) {
        expect(rubricBlock).toContain(`category: '${category}'`);
      }

      expectPhrases(rubricBlock, [
        'COMPLETE stop behind the line',
        'Rolling stop = critical error; expect major points off or automatic failure.',
        'Signal -> mirror -> blind spot check -> smooth move',
        'blind spot check',
        '100 feet before turning or changing lanes',
        'Checking for pedestrians',
        'Any collision = immediate fail',
      ]);
      expect(rubricBlock).not.toContain('Rolling stop = instant fail in many states.');
    }
  });

  it('keeps stable traffic ids for visual behavior checks', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expectPhrases(src, [
        "id: scenario.id + '_main_' + i",
        "id: scenario.id + '_cross_' + ci",
        "t.id = 'respawn_'",
        "id: 'chunk_' + sci + '_cross_'",
      ]);
    }
  });

  it('keeps school-bus and railroad emergency scripts aligned with current safety guidance', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const schoolBusSeparatedQuestion = src.match(/\{ q: 'You approach a school bus on the opposite side of a roadway separated by curbing[\s\S]*?category: 'pedestrian' \}/)?.[0];
      const schoolBusDrill = viewBlock(src, 'schoolBus');

      expectPhrases(src, [
        'Maine law requires stopping until the bus moves again or the bus operator signals you to proceed',
        'curbing or another physical barrier',
        'limited-access/loading-zone exception',
        'Passing a stopped school bus with red flashers violates Maine §2308',
        'First offense: Class E crime with a $250 minimum fine',
        'A 2nd offense within 3 years carries a mandatory 30-day license suspension',
        'Continue with normal caution — the barrier separates the roadways',
        'Paint-only lanes are undivided — both directions stop',
        'violates Maine law',
        'Never drive around lowered gates. If a gate appears stuck or a vehicle is trapped, call the posted crossing number or 911.',
        'Never drive around lowered gates; if a gate appears stuck, call the posted crossing number or 911.',
        'Maine §2076: by 100 ft from the nearest rail, slow to a reasonable/proper speed',
        'Stop 15-50 ft from the nearest rail when signals, gates, a flagger, a train, or law requires',
        'Railroad crossing rules — and the 45° escape if you stall.',
        'Maine §§2076/2306: school buses, buses carrying passengers, and specified chlorine/placarded/cargo-tank hazardous-material vehicles must stop 15-50 ft from the nearest rail',
        'exempt/abandoned crossings and official/flagger directions can change that stop requirement',
        'Maine §§2076/2306 require school buses, buses carrying passengers, and specified chlorine/placarded/cargo-tank hazardous-material vehicles to stop 15-50 ft from the nearest rail',
        'Move away from the tracks at a 45-degree angle TOWARD the oncoming train, not with it.',
      ]);

      expect(schoolBusSeparatedQuestion).toBeTruthy();
      expect(schoolBusSeparatedQuestion).toContain('curbing, a guardrail, a concrete barrier, or another physical barrier');
      expect(schoolBusSeparatedQuestion).toContain('Continue with normal caution (you do not need to stop)');
      expect(schoolBusSeparatedQuestion).toContain('Maine §2308 says opposite-direction traffic need not stop only when separated from the bus lane by curbing or another physical barrier');
      expect(schoolBusSeparatedQuestion).toContain('limited-access/loading-zone exception');
      expect(schoolBusSeparatedQuestion).toContain('Paint-only lanes are undivided');

      expect(schoolBusDrill).toContain('traffic meeting or overtaking from either direction must stop');
      expect(schoolBusDrill).toContain('Opposite-direction traffic is excepted only when separated by curbing or another physical barrier');
      expect(schoolBusDrill).toContain('Passing a stopped school bus in Maine is a Class E crime');
      expect(schoolBusDrill).toContain('Do not proceed until the bus moves again or the bus operator signals you to proceed');
      expect(schoolBusDrill).toContain('unless a separated-roadway exception in Maine §2308 applies');

      expect(src).not.toContain('PHYSICAL MEDIAN');
      expect(src).not.toContain('physical median');
      expect(src).not.toContain('grass, guardrail');
      expect(src).not.toContain('$250+ fine in Maine');
      expect(src).not.toContain('fine of $250+, plus license points');
      expect(src).not.toContain('Multiple violations can lead to suspension');
      expect(src).not.toContain("the reason a kid doesn't come home");
      expect(src).not.toContain('Continue at normal speed — the median separates you');
      expect(src).not.toContain('The divided-highway exception applies: a physical median');
      expect(src).not.toContain('The only exemptions are (1) a divided highway in the opposite direction');
      expect(src).not.toContain('federal violation (49 CFR §234.11)');
      expect(src).not.toContain('federally illegal');
      expect(src).not.toContain('Federal + Maine crossing rules');
      expect(src).not.toContain('Stop at the white line if a train is approaching');
      expect(src).not.toContain('federal stop-arm law');
      expect(src).not.toContain('FEDERAL violation');
      expect(src).not.toContain('federal violation.');
      expect(src).not.toContain('All school buses, large trucks with hazmat must stop at all railroad crossings.');
      expect(src).not.toContain('School buses and hazmat trucks MUST stop at all railroad crossings, even without active controls.');
      expect(src).not.toContain('School buses and hazmat trucks always stop at every crossing.');
      expect(src).not.toContain('Federal + Maine law');
      expect(src).not.toContain('non-negotiable federal law');
      expect(src).not.toContain('Run AWAY from the tracks at a 45');
    }

    for (const relPath of ROADREADY_UI_STRING_FILES) {
      const catalog = JSON.parse(readRoadReady(relPath)).stem.roadready;

      expect(catalog.title_29_a_2308_when_a_school_bus_is_s).toBe('Title 29-A §2308: when a school bus is stopped with red lights flashing, traffic meeting or overtaking from either direction must stop. Opposite-direction traffic is excepted only when separated by curbing or another physical barrier, or under the limited-access/loading-zone exception.');
      expect(catalog.passing_a_stopped_school_bus_in_maine_).toBe('Passing a stopped school bus in Maine is a Class E crime. First offense: $250 minimum fine. A 2nd offense within 3 years carries a mandatory 30-day license suspension.');

      expect(catalog.title_29_a_2308_when_a_school_bus_is_s).not.toContain('physical median');
      expect(catalog.passing_a_stopped_school_bus_in_maine_).not.toContain('license points');
      expect(catalog.passing_a_stopped_school_bus_in_maine_).not.toContain('Multiple violations');
    }
  });

  it.each(ROADREADY_FILES)('%s clears visual props from rotated and cross-chunk intersections', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function crossStreetCorridorAt(world, worldX, worldY, clearance)');
    expect(src).toContain('if (crossStreetCorridorAt(this, worldX, worldY, 0)) return 0');
    expect(src).toContain('var visualCrossStreetClearanceAt = function(renderX, renderZ, padding)');
    expect(src).toContain('var cellVal = iw.getCell(cx, ci * CHUNK_SIZE + cy)');
    expect(src).toContain('if (visualCrossStreetClearanceAt(ambX, ambZ, 0.8)) continue');
    expect(src).toContain('if (visualCrossStreetClearanceAt(slX, slZ, 0.8)) return');
    expect(src).toContain('Short rail segments preserve deliberate openings at cross');
    expect(src).not.toContain('if (hasIntersection && Math.abs(by - intersectionY) < 5) continue');
    expect(src).not.toContain('if (hasIntersection && Math.abs(ty - intersectionY) <= CLEARANCE_BUFFER + 1) continue');
  });

  it.each(ROADREADY_FILES)('%s preserves readable, weathered safety paint on winter roads', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function roadMarkingAppearance(weather, dryColor, snowOpacity)');
    expect(src).toContain('roadMarkingAppearance(scn.weather, 0xf5f5f5, 0.58)');
    expect(src).toContain('roadMarkingAppearance(scn.weather, 0xffffff, 0.78)');
    expect(src).toContain('var crossStopBarMat = new T.MeshBasicMaterial');
    expect(src).toContain('var stopLine = new T.Mesh(new T.PlaneGeometry(stopLineWidth, 0.3), stopBarMat)');
    expect(src).toContain('var crossStopBar = new T.Mesh(new T.PlaneGeometry(0.3, crossStopWidth), crossStopBarMat)');
    expect(src).not.toContain("if (chunk.hasIntersection && scn.weather !== 'snow')");
    expect(src).not.toContain("if (scn.weather !== 'snow') {");
  });
});

describe('RoadReady intersection-rule invariants', () => {
  it.each(ROADREADY_FILES)('%s enforces controls and priority on both road axes', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function playerControlApproach(world, signal, car, vehicleLength)');
    expect(src).toContain("approachGroup: 'cross'");
    expect(src).toContain("trafficSignalIndication(s, approach.approachGroup) === 'red'");
    expect(src).toContain('var activeOneWayViolation = playerCrossCorridor ? !!crossRequiredDirection : activeOneWay.enabled');
    expect(src).toContain('function leftTurnGapState(traffic, self, signal, playerCar)');
    expect(src).toContain("t._turnIntent === 'left'");
    expect(src).toContain('function createIntersectionTurnPath(startX, startY, startHeading, crossPose, crossDirection, turnIntent)');
    expect(src).toContain('function intersectionTurnPoint(path, progress)');
    expect(src).toContain('pathSpeed * dt / Math.max(1, t._turnPath ? t._turnPath.length : 1)');
    expect(src).not.toContain('t.heading += dhT * (1 - Math.exp(-dt / 0.4))');
    expect(src).toContain('arrivalQ.push({ vehicleId: t.id, arrivedAt: timeRef.current })');
    expect(src).toContain('t._rollDecisions[crossStopKey] === undefined');
    expect(src).not.toContain('arrivalQ.push({ carIdx: idx');
    expect(src).not.toContain('Math.random() < pers.rollsStops * 0.05');
  });
});

describe('RoadReady cross-street elevation invariants', () => {
  it.each(ROADREADY_FILES)('%s grounds cross-street pavement and vehicles to one surface model', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('var corridor = crossStreetCorridorAt(world, x, y, 0)');
    expect(src).toContain('crossStreet: true');
    expect(src).toContain('var crossRoadGeo = new T.PlaneGeometry(MAP_SIZE, crossWidth, 24, 2)');
    expect(src).toContain('crossRoadPositions.setY(crvi, crossLocalSurfaceHeight(crvx, crvz) + 0.013)');
    expect(src).toContain('crossLocalSurfaceHeight(edgeLocalX, edgeLocalZ) + 0.018');
    expect(src).toContain('crossLocalSurfaceHeight(cdx, 0) + 0.019');
    expect(src).not.toContain('var crossRoadGeo = new T.PlaneGeometry(MAP_SIZE, crossWidth);');
  });
});

describe('RoadReady visual geometry invariants', () => {
  it.each(ROADREADY_FILES)('%s gives every legal signalized approach visible heads and safe phase clearance', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function trafficSignalIndication(signal, approachGroup)');
    expect(src).toContain("s._phase = 'all_red_to_cross'");
    expect(src).toContain("s._phase = 'cross_yellow'");
    expect(src).toContain("s._phase = 'all_red_to_main'");
    expect(src).toContain('var poleLocalX = roadHalfW + 0.7');
    expect(src).toContain('var poleLocalZ = -(crossWidth * 0.5 + 0.55)');
    expect(src).toContain('var mainHeadLaneCenters = chunk.oneWay');
    expect(src).toContain('var addPostMountedSignalHead = function(headSpec)');
    expect(src).toContain('var signalCrossDirections = chunk.crossStreetOneWayDirection');
    expect(src).toContain("approachGroup: 'cross'");
    expect(src).toContain("trafficSignalIndication(signalAtCrosswalk, 'cross') === 'green'");
    expect(src).not.toContain('var poleLocalX = 4.5');
    expect(src).not.toContain("var psWalk = (psSigEntry.state === 'red')");
  });

  it.each(ROADREADY_FILES)('%s renders and enforces bidirectional alternating work-zone flaggers', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function workZoneStopLineForDirection(boundsOrSignal, forwardSign)');
    expect(src).toContain('{ local: 29, forwardSign: -1, lateral: 1 }');
    expect(src).toContain('{ local: 3, forwardSign: 1, lateral: -1 }');
    expect(src).toContain('s3.flaggerPaddlesByChunk[ci].push({');
    expect(src).toContain('forwardSign: wzFlagSpec.forwardSign');
    expect(src).toContain('flaggerStopsDirection(sigEntry.state, paddle.forwardSign || -1)');
    expect(src).toContain('workZoneStopLineForDirection(signal, travelSign)');
    expect(src).toContain('flaggerStopsDirection(s.state, approach.travelSign)');
    expect(src).not.toContain("var stopShown = sigEntry.state !== 'green'");
  });

  it.each(ROADREADY_FILES)('%s keeps streamed stop controls aligned with visible crosswalk geometry', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function intersectionStopLineCoordinate(intersectionCenter, travelSign)');
    expect(src).toContain('function vehicleStopCenterCoordinate(intersectionCenter, travelSign, vehicleLength)');
    expect(src).toContain('[-RR_INTERSECTION_CROSSWALK_OFFSET, RR_INTERSECTION_CROSSWALK_OFFSET]');
    expect(src).toContain('var stopLineWidth = chunk.oneWay ? roadHalfW * 2 - 0.6 : roadHalfW - 0.3');
    expect(src).toContain('var crossApproachDirections = chunk.crossStreetOneWayDirection');
    expect(src).toContain('var activeControl = null');
    expect(src).toContain('var aiFrontOverhang = vehicleFootprint(t.type).length * 0.5 + 0.25');
    expect(src).toContain('var approach = playerControlApproach(world, s, car, playerLength)');
    expect(src).toContain('var pedCrosswalkY = worldY + crosswalkSide * RR_INTERSECTION_CROSSWALK_OFFSET');
    expect(src).not.toContain('var stopLineOff = cwOffset < 0 ? 1.3 : -1.3');
    expect(src).not.toContain('var sbZ = cwCtrZ - 1.5');
    expect(src).not.toContain('var slZ = crossZ - 4');
  });

  it.each(ROADREADY_FILES)('%s keeps downtown one-way markings, traffic, and routing aligned', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('oneWay: true, oneWayDirection: -1, oneWayLanes: 2');
    expect(src).toContain('function oneWayRoadLayoutFor(profileOrChunk)');
    expect(src).toContain('if (chunk.oneWay && approachDirection !== chunk.oneWayDirection) return');
    expect(src).toContain('chunk.crossStreetOneWayDirection ? 0xffffff : 0xfacc15, 0.58');
    expect(src).toContain("owCtx.fillText('ONE WAY', 192, 52)");
    expect(src).toContain('var crossDirections = sigChunk.crossStreetOneWayDirection');
    expect(src).toContain('var requiredCrossDir = turnChunkForIntent.crossStreetOneWayDirection');
    expect(src).toContain("addToast('🚨 WRONG WAY — one-way street! -15')");
    expect(src).not.toContain("downtown: { biome: 'commercial', intersectionEvery: 2, intersectionPhase: 1, signalType: 'light', roadHalfWidth: 4.5, pedestrianCount: 4 },");
  });

  it.each(ROADREADY_FILES)('%s keeps roadside visuals outside the authored paved edge', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('shoulderWidth: 2.4');
    expect(src).toContain('function roadsideOffsetFor(profileOrChunk, clearance)');
    expect(src).toContain('var ambElevationGroup = new T.Group()');
    expect(src).toContain('ambElevationGroup.position.y = ambGroundY');
    expect(src).toContain('roadsideOffsetFor(chunk, 0.25)');
    expect(src).toContain('var splineHeightAtZ = function(worldZ)');
    expect(src).toContain('var cwBank = roadBankAngleAt(iw.spline, crosswalkGridY, iw.profile || chunk)');
    expect(src).toContain('var dsHalf = roadHalfW * 0.92');
    expect(src).toContain('var rumbleOffset = roadLayout.edgeLineOffset + 0.18');
    expect(src).toContain('var rBankLift = Math.sin(rBank) * rumbleOffset');
    expect(src).toContain('snPile.position.set(snX, snGroundY + snHeight / 2, snZ)');
    expect(src).toContain('splineHeightAtZ(mistZ) + 0.3');
    expect(src).toContain("pc.fillText('STOP', 128, 130)");
    expect(src).toContain("pc.fillText('SLOW', 128, 130)");
    expect(src).not.toContain('var spSignX = spSplineCX + speedSide * (MAX_ROAD_WIDTH + 1.2)');
    expect(src).not.toContain('var parkedCarX = ambSplineCenter + ambSide * (MAX_ROAD_WIDTH + 0.9)');
    expect(src).not.toContain('grCx + grSide * 4.0');
    expect(src).not.toContain('var rumbleOffset = roadHalfW + 0.08');
    expect(src).not.toContain('slCx + slSide * 4.5');
    expect(src).not.toContain('var upX = upCx + upSide * 5.2');
    expect(src).not.toContain('snPile.position.set(snX, snHeight / 2, snZ)');
    expect(src).not.toContain('var pudSide = weatherRng() < 0.5 ? -1 : 1');
  });

  it.each(ROADREADY_FILES)('%s renders and samples a shared crowned road cross-section', (relPath) => {
    const src = readRoadReady(relPath);
    expect(src).toContain('function roadCrownHeight(lateralOffset, profileOrChunk, halfWidthOverride)');
    expect(src).toContain('var ribbonVerts = new Float32Array(ribbonRows * 3 * 3)');
    expect(src).toContain('var ribbonIdx = new Uint16Array((ribbonRows - 1) * 12)');
    expect(src).toContain('roadCrownHeight(x_offset, iw.profile || chunk, roadHalfW)');
    expect(src).toContain('function roadShoulderDrainageDrop(lateralBeyondEdge, profileOrChunk)');
    expect(src).toContain('function roadLaneArrowSpecs(profileOrChunk)');
    expect(src).toContain('var isNoPass = chunk.oneWay || chunk.isHighway');
    expect(src).toContain('var detailLaneDividerOffsets = chunk.oneWay');
    expect(src).toContain('roadLaneArrowSpecs(chunk).forEach(function(arrowSpec)');
    expect(src).toContain('shSide * (roadLayout.pavedHalfWidth + 0.8)');
    expect(src).toContain('markRoadSurfaceHeightAt(cbZ, cbSide) + 0.04');
    expect(src).toContain('var dustVerts = new Float32Array(dustRows * 3 * 3)');
    expect(src).toContain('+ roadCrownHeight(dsOff, iw.profile || chunk, roadHalfW)');
    expect(src).toContain('+ roadCrownHeight(cwLateral, iw.profile || chunk, roadHalfW)');
    expect(src).toContain('var spSignZ = speedZ - spOffset * Math.sin(spHeading)');
    expect(src).toContain('spFace.rotation.y = spHeading + (speedSide === 1 ? -Math.PI / 2 : Math.PI / 2)');
    expect(src).not.toContain('[-2.0, 2.0].forEach(function(arrowLaneOff)');
    expect(src).not.toContain('curb.position.set(cbCtr + cbSide * cbPerpX, cbHt + 0.04');
    expect(src).toContain('+ roadCrownHeight(ribbonOff, iw.profile || chunk, roadHalfW)');
    expect(src).toContain('- roadShoulderDrainageDrop(shldWidth, iw.profile || chunk)');
    expect(src).toContain('junctionBlend = junctionBlend * junctionBlend * (3 - 2 * junctionBlend)');
    expect(src).toContain('roadCrownHeight(corridor.local.lateral,');
    expect(src).toContain('var markRoadSurfaceHeightAt = function(worldZ, lateralOffset)');
    expect(src).toContain('var sheen = new T.Mesh(roadGeo, sheenMat)');
    expect(src).toContain('roadSurfacePoseAt(iw, puddleSpec.x, puddleSpec.y).height + 0.013');
    expect(src).toContain('streamedPuddlesForChunk(iw, ci).forEach(function(puddleSpec)');
    expect(src).toContain('var puddles = streamedPuddlesForChunk(world, nearbyChunks[ci])');
    expect(src).toContain('crossLocalSurfaceHeight(crossStopX, crossStopLateral) + 0.022');
    expect(src).toContain('var addRailroadStrip = function(material, forwardOffset, stripDepth, lateralSpan, lift)');
    expect(src).toContain('[-0.72, 0.72].forEach(function(railForwardOff)');
    expect(src).toContain('new T.PlaneGeometry(tieStep * 0.62, 2.7)');
    expect(src).toContain('var slabSegmentCount = Math.max(5, Math.ceil(slabSpan / 1.0))');
    expect(src).toContain('markRoadSurfaceHeightAt(bumpZ, slabLat) + 0.04');
    expect(src).toContain('function crossedFiniteRoadFeature(previousX, previousY, nextX, nextY, feature)');
    expect(src).toContain('var bumpHit = crossedFiniteRoadFeature(car.x, car.y, newX, newY, sb)');
    expect(src).toContain('halfWidth: Math.max(0.5, roadHalfW - 0.3)');
    expect(src).toContain('heading: bumpHeading');
    expect(src).not.toContain('var latDx = Math.abs(((newX + car.x) * 0.5) - sb.gridX)');
    expect(src).not.toContain('lastBumpIdx');
    expect(src).toContain('function railroadCrossingState(simTime, cycleOffset)');
    expect(src).toContain('var rrState = railroadCrossingControlState(timeRef.current, crossing)');
    expect(src).toContain('function railroadRequiresFullStop(vehicleType, crossing)');
    expect(src).toContain('function railroadTrainCollisionAt(vehicle, crossing, state)');
    expect(src).toContain("addToast('SCHOOL BUS MUST STOP AT RAILROAD CROSSING -20 safety')");
    expect(src).toContain('var rrControls = infiniteWorldRef.current && infiniteWorldRef.current._railroadCrossings');
    expect(src).toContain("? 'TRAIN CROSSING VIOLATION' : 'RAILROAD GATE VIOLATION'");
    expect(src).toContain('activeControl: Math.abs(ci) % 3 !== 0');
    expect(src).toContain('rrGatePivot.visible = rrCrossingRecord.activeControl');
    expect(src).toContain('var outerTrackExtent = 42');
    expect(src).toContain('var activeBumpDist = Infinity');
    expect(src).toContain('rrStopRecord.timer += dt');
    expect(src).toContain('var rrGatePivot = new T.Group()');
    expect(src).toContain('var rrTrain = new T.Group()');
    expect(src).toContain('gate.rotation.z = (1 - rrState.gateProgress) * Math.PI / 2');
    expect(src).toContain('var trainLat = -35 + rrState.trainProgress * 70');
    expect(src).toContain('crossingActive && (beaconTick === b.phase)');
    expect(src).not.toContain('new T.PlaneGeometry(0.10, 3.2)');
    expect(src).not.toContain('slab.position.set(bumpCtrX, bumpHt + 0.04, bumpZ)');
    expect(src).not.toContain('new T.PlaneGeometry(roadHalfW * 2 * 0.95, CHUNK_SIZE)');
    expect(src).not.toContain('var ribbonVerts = new Float32Array(ribbonRows * 2 * 3)');
  });
});