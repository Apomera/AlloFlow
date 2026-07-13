// RoadReady all-views render smoke.
//
// WHY: the tool is one giant render(ctx) with ~90 `view === 'X'` branches and
// its own try/catch error boundary. A crash inside any branch doesn't throw —
// it silently renders the "🚗 RoadReady Error" card (and a missing state
// prerequisite silently falls through to "Loading RoadReady..."). Neither is
// visible to a default-state digest. This suite renders EVERY view under a
// fixture that satisfies its prerequisites and asserts real content came out.
//
// COMPLETENESS GATE: the list of views is re-derived from the source at test
// time. Adding a new `view === 'newThing'` branch without adding a fixture
// here fails the suite — coverage can't silently rot.
//
// (The blank-certificate bug this suite exists for: `gradeLetter` was a
// debrief-branch local read by the certificate view — unassigned there, so
// the printable FINAL GRADE rendered empty. A per-view signature catches
// exactly that class.)

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_roadready.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T15:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'roadReady');
});

// ── Shared fixtures ────────────────────────────────────────────────────

const STATS = {
  startTime: 0,
  distance: 3218, // ~2 miles in meters
  maxSpeed: 14,
  mpgSum: 350, mpgSamples: 10,
  hardBrakes: 1, jackrabbits: 0,
  speedViolations: 1, secondsOverLimit: 4, _wasOverLimit: false,
  closeFollows: 0, crashes: 0, stops: 3,
  safetyScore: 88, efficiencyScore: 82,
  fuelUsed: 0.11, skidSeconds: 0.2, cyclistClose: 0,
  wildlifeEncountered: 1, wildlifeHit: 0,
  unsignaledLaneChanges: 0, wrongSideViolations: 0,
  durationSec: 190, minutes: 3, seconds: 10,
  scenario: 'Residential Street', vehicle: 'Compact Sedan',
  avgMPG: 35,
  driveEvents: [
    { type: 'hardBrake', t: 42, speedMph: 33, mu: 0.72, postedLimitMph: 25, severity: 2 },
    { type: 'speedViolation', t: 80, speedMph: 34, mu: 0.72, postedLimitMph: 25, severity: 2 },
  ],
  events: [
    { type: 'hardBrake', t: 42 },
    { type: 'speedViolation', t: 80 },
  ],
  lastCrashReplay: Array.from({ length: 120 }, (_, i) => ({
    t: i / 60, x: 48, y: 50 - i * 0.05, heading: -Math.PI / 2, speed: 12 - i * 0.05, gear: 'D', steering: 0,
  })),
};

const PERMIT_QUESTION = {
  q: 'A solid yellow line on your side of the centerline means:',
  a: ['You may pass if safe', 'No passing', 'Lane ends', 'Bike lane'],
  correct: 1, exp: 'Solid yellow = NO passing from your side.', category: 'general',
};

// Per-view fixture (merged into d = toolData.roadReady) + expected signature
// substring. `sig` should be text unique-ish to that view's real content so a
// fallthrough to the fallback (or the error card) can't pass.
const VIEWS = {
  menu: { d: { tourCompleted: true }, sig: 'RoadReady' },
  tour: { d: {}, sig: null },
  freeExploreSetup: { d: { tourCompleted: true }, sig: null },
  scenarioSelect: { d: {}, sig: null },
  driving: { d: { scenario: 'residential', vehicle: 'sedan' }, sig: 'Fasten Your Seatbelt' },
  lessonSelect: { d: {}, sig: null },
  lesson: { d: { lesson: 'drag' }, sig: 'Aerodynamic Drag' },
  signsView: { d: {}, sig: null },
  permitStart: { d: {}, sig: null },
  permitCategory: { d: {}, sig: null },
  permit: {
    d: {
      permit: {
        questions: [PERMIT_QUESTION, PERMIT_QUESTION], index: 0,
        answers: [null, null], score: 0, done: false, startedAt: 0,
      },
    },
    sig: 'solid yellow line',
  },
  debrief: { d: { drivingStats: STATS }, sig: null },
  driveDebrief: { d: { drivingStats: STATS }, sig: null },
  maineWinter: { d: {}, sig: null },
  neurodivergentGuide: { d: {}, sig: null },
  nightVisionIntro: { d: {}, sig: null },
  nightVision: { d: {}, sig: null },
  parentRideCheck: { d: {}, sig: null },
  parentReport: {
    d: {
      lastParentReport: {
        scenario: 'Residential Street', durationSec: 120, startedAt: 1000, endedAt: 121000,
        errors: [{ cat: 'speed', t: 30, speedMph: 31 }, { cat: 'stop', t: 60, speedMph: 8 }],
      },
    },
    sig: 'Speed',
  },
  roadTestIntro: { d: {}, sig: null },
  roadTestResult: {
    d: {
      lastRoadTest: {
        score: 92, passed: true, scenario: 'Suburban Arterial', durationSec: 240, endedAt: 1737000000000,
        deductions: [{ type: 'speed', pts: 1, t: 30, detail: '31 mph in 25 zone' }],
      },
    },
    sig: 'PASSED',
  },
  logbook: { d: { logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', vehicle: 'Compact Sedan', safetyScore: 88, entries: [] }] }, sig: null },
  roundaboutDrill: { d: {}, sig: null },
  duiDrill: { d: {}, sig: null },
  defensiveList: { d: {}, sig: null },
  mooseSafety: { d: {}, sig: null },
  emergencyVehicle: { d: {}, sig: null },
  schoolBus: { d: {}, sig: null },
  railroadCrossing: { d: {}, sig: null },
  winterDriving: { d: {}, sig: null },
  constructionZone: { d: {}, sig: null },
  teenGDL: { d: {}, sig: null },
  crashLab: { d: {}, sig: null },
  lessonPath: { d: {}, sig: null },
  maintenanceGame: { d: {}, sig: null },
  emergencyHandbook: { d: {}, sig: null },
  driverPledge: { d: {}, sig: null },
  permitFlashcards: { d: {}, sig: null },
  rulesFoundations: { d: {}, sig: null },
  rightOfWay: { d: {}, sig: null },
  gdlTracker: { d: {}, sig: null },
  dailyChallenge: { d: {}, sig: 'Daily Challenge' },
  seatSetup: { d: {}, sig: null },
  postCrash: { d: {}, sig: null },
  bikeAware: { d: {}, sig: null },
  keyboardCheatSheet: { d: {}, sig: null },
  helpHub: { d: {}, sig: null },
  peerPressure: { d: {}, sig: null },
  reactionTest: { d: {}, sig: 'Reaction Time Test' },
  cheatSheet: { d: {}, sig: null },
  analytics: { d: { logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', safetyScore: 88 }] }, sig: null },
  distractedLab: { d: {}, sig: null },
  customize: { d: {}, sig: null },
  achievementGallery: { d: {}, sig: null },
  roundaboutGuide: { d: {}, sig: null },
  intersectionGuide: { d: {}, sig: null },
  dashLights: { d: {}, sig: null },
  preTrip: { d: {}, sig: null },
  vehicleCompare: { d: {}, sig: null },
  emergencyDrill: { d: {}, sig: null },
  stoppingLab: { d: {}, sig: 'Visual Scale' },
  brakingHunt: { d: {}, sig: null },
  parking: { d: {}, sig: null },
  threePoint: { d: {}, sig: null },
  backingDrill: { d: {}, sig: 'Reverse in a perfectly straight line' },
  parkingMenu: { d: {}, sig: null },
  tightParallel: { d: {}, sig: null },
  angleBack: { d: {}, sig: null },
  obstacleBack: { d: {}, sig: null },
  hydrantParallel: { d: {}, sig: null },
  hillUphill: { d: {}, sig: null },
  uTurnNarrow: { d: {}, sig: null },
  fuelCalc: { d: {}, sig: null },
  hypermilingLab: { d: {}, sig: null },
  crashReplay: { d: { drivingStats: STATS }, sig: 'Black Box' },
  certificate: {
    d: { drivingStats: STATS, badges: { permit_pass: true }, logbook: [{ durationSec: 3600 }] },
    // The regression this suite exists for: FINAL GRADE must actually show a
    // letter. (safety 88 + eco 82) / 2 = 85 → B.
    sig: 'FINAL GRADE',
  },
  hazardTest: { d: {}, sig: 'Hazard Perception Test' },
  insuranceCalc: { d: {}, sig: null },
  maintenanceGuide: { d: {}, sig: null },
  aiCoach: { d: { drivingStats: STATS }, sig: null },
  roadTrip: { d: {}, sig: null },
  forceDiagram: { d: {}, sig: 'F_roll' },
  speedCompare: { d: {}, sig: null },
  blindSpotGuide: { d: {}, sig: null },
  weatherCompare: { d: {}, sig: null },
  learningPath: { d: {}, sig: null },
  roadTestRubric: { d: {}, sig: null },
  reactionTrainer: { d: {}, sig: null },
  carBuying: { d: {}, sig: 'First Car Buying Guide' },
  knowYourCar: { d: {}, sig: 'Know Your Car' },
};

// ── Completeness gate ─────────────────────────────────────────────────

describe('view coverage completeness', () => {
  it('every view branch in the source has a fixture here (and none are stale)', () => {
    const src = readFileSync(FILE, 'utf8');
    const found = new Set();
    const re = /view === '([A-Za-z0-9_]+)'/g;
    let m;
    while ((m = re.exec(src))) found.add(m[1]);
    const fixtures = new Set(Object.keys(VIEWS));
    const missing = [...found].filter((v) => !fixtures.has(v));
    const stale = [...fixtures].filter((v) => !found.has(v));
    expect(missing, 'views in source without a smoke fixture — add them to VIEWS').toEqual([]);
    expect(stale, 'fixtures for views that no longer exist — remove them').toEqual([]);
  });
});

// ── Render every view ─────────────────────────────────────────────────

describe('every view renders real content (no error card, no fallback)', () => {
  for (const [view, spec] of Object.entries(VIEWS)) {
    it(view, () => {
      const d = Object.assign({ view }, spec.d);
      const html = renderTool('roadReady', { roadReady: d });
      expect(html, view + ': render threw into the error boundary').not.toContain('RoadReady Error');
      expect(html, view + ': fell through to the loading fallback — fixture missing a prerequisite?').not.toContain('Loading RoadReady');
      expect(html.length, view + ': suspiciously little markup').toBeGreaterThan(300);
      if (spec.sig) {
        expect(html, view + ': expected signature content missing').toContain(spec.sig);
      }
    });
  }

  it('certificate FINAL GRADE shows an actual letter (blank-grade regression)', () => {
    const d = Object.assign({ view: 'certificate' }, VIEWS.certificate.d);
    const html = renderTool('roadReady', { roadReady: d });
    // (88+82)/2 = 85 → B. The letter sits in the 48px grade element.
    const gradeIdx = html.indexOf('FINAL GRADE');
    expect(gradeIdx).toBeGreaterThan(-1);
    const after = html.slice(gradeIdx, gradeIdx + 400);
    expect(after).toMatch(/>[ABCDF][+]?</);
  });

  it('debrief shows the grade + XP for the same stats', () => {
    const d = { view: 'debrief', drivingStats: STATS };
    const html = renderTool('roadReady', { roadReady: d });
    expect(html).toContain('Great Drive'); // 85 → B tier label
  });

  it('a bogus view id falls through to the loading fallback (dispatch sanity)', () => {
    const html = renderTool('roadReady', { roadReady: { view: 'definitelyNotAView' } });
    expect(html).toContain('Loading RoadReady');
  });
});
