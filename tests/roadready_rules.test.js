import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROADREADY_FILES = [
  'stem_lab/stem_tool_roadready.js',
  'prismflow-deploy/public/stem_lab/stem_tool_roadready.js',
  'prismflow-deploy/public/stem_tool_roadready.js',
];

function readRoadReady(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function arrayBlock(src, declaration) {
  const start = src.indexOf(declaration);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = src.indexOf('\n  ];', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
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
    'Pedestrians in crosswalks',
    'School buses with red flashers',
    'Traffic already in the intersection / roundabout',
  ],
  laneDiscipline: ['Keep-right', 'Solid white line', 'blind spot'],
  signaling: ['100 ft', '200 ft', 'Hand signals'],
  passing: ['Solid yellow on YOUR side', 'Never pass a school bus with red flashers'],
  merging: ['Zipper merge', 'Highway on-ramps', 'Merging driver yields'],
  pedestrian: ['WHITE CANE or GUIDE DOG', 'Never pass a vehicle stopped at a crosswalk'],
  emergency: ['pull to the RIGHT curb and stop', 'Move Over', 'Disabled vehicle on the shoulder'],
  railroad: ['Never drive around lowered gates', 'Stuck on tracks', '45'],
  speedAndFollowing: ['reasonable and prudent', '3-second following rule', 'work zones, school zones'],
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
  { id: 'rain', speedLimit: 45, phrases: ['Hydroplaning risk', 'Wipers on = headlights on'] },
  { id: 'snow', speedLimit: 35, phrases: ['Snow-covered road', 'Gentle inputs only'] },
  { id: 'construction', speedLimit: 35, phrases: ['flagger and cones', 'Fines double'] },
  { id: 'school_zone', speedLimit: 15, phrases: ['15 mph limit when children present', 'crossing guard'] },
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

describe('RoadReady rules-of-road content', () => {
  it('marks Maine school-zone speed as 15 mph in the permit bank', () => {
    const src = readRoadReady('stem_lab/stem_tool_roadready.js');
    const block = src.match(/\{ q: 'The speed limit in a Maine school zone when children are present is typically:'[\s\S]*?category: 'pedestrian' \}/)?.[0];

    expect(block).toBeTruthy();
    expect(block).toContain("a: ['15 mph',");
    expect(block).toContain('correct: 0');
    expect(block).toContain('Maine school-zone speed is 15 mph');
  });

  it('keeps school landmark guidance at 15 mph in every RoadReady copy', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('school_zone_15mph');
      expect(src).toContain('SLOW DOWN to 15 mph (active school zone)');
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

  it('uses Maine stationary-vehicle passing wording for Move Over content', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      expect(src).toContain('2070(8)');
      expect(src).toContain('non-adjacent lane if possible');
      expect(src).toContain('careful and prudent speed');
      expect(src).not.toContain('2054-A');
      expect(src).not.toContain('20 mph below the posted');
      expect(src).not.toContain('civil violation with a fine');
      expect(src).not.toContain('Maine adds $300 fine');
      expect(src).not.toContain('Maine adds a $300 fine');
    }
  });

  it('uses current Maine handheld-phone and snow/ice wording', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);
      const snowQuestion = src.match(/\{ q: 'Before driving in winter, Maine law requires you to:'[\s\S]*?category: 'winter' \}/)?.[0];

      expect(src).toContain('First offense: $50.');
      expect(src).toContain('Take reasonable measures to prevent snow/ice from falling off your vehicle');
      expect(src).not.toContain('First offense: $85.');
      expect(src).not.toContain('$137 fine');
      expect(src).not.toContain('30-day license suspension in Maine');
      expect(src).not.toContain('Clear ALL snow from your car before driving (including the roof');
      expect(src).toContain('$250-$500 fine');
      expect(src).toContain('60-day first-offense license suspension');
      expect(src).toContain('another 270 days of intermediate-license restrictions');

      expect(snowQuestion).toBeTruthy();
      expect(snowQuestion).toContain('Take reasonable measures to prevent snow and ice from falling off your vehicle');
      expect(snowQuestion).toContain('Safest practice: clear the roof, windows, lights, and hood');
      expect(snowQuestion).not.toContain('Clear ALL snow and ice from the vehicle');
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

  it('keeps every hazard-perception event and reaction window available', () => {
    for (const relPath of ROADREADY_FILES) {
      const src = readRoadReady(relPath);

      for (const hazard of HAZARD_EVENTS) {
        expect(src).toContain(`type: '${hazard.type}', reactionLimit: ${hazard.reactionLimit}`);
      }
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

      expectPhrases(src, [
        'Maine law requires stopping until the bus moves again or the bus operator signals you to proceed',
        'curb or other physical barrier',
        'violates Maine law',
        'Move away from the tracks at a 45-degree angle TOWARD the oncoming train, not with it.',
      ]);
      expect(src).not.toContain('federal stop-arm law');
      expect(src).not.toContain('FEDERAL violation');
      expect(src).not.toContain('federal violation.');
      expect(src).not.toContain('Federal + Maine law');
      expect(src).not.toContain('non-negotiable federal law');
      expect(src).not.toContain('Run AWAY from the tracks at a 45');
    }
  });
});
