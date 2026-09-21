#!/usr/bin/env node
// check_roadready_sourced_statistics.cjs — RoadReady's real-world statistics
// must stay inside the range their published source supports, and must stay
// internally consistent with each other.
//
// Why this exists (2026-09-20):
//   The Moose Safety screen told Maine students there are "roughly 500–700
//   reported moose–vehicle collisions per year" and that the state "averages
//   3–5 fatal moose crashes annually".
//
//   Both were badly out of date:
//     • MaineDOT counted 261 (2020), 293 (2021), 218 (2022), 220 (2023) and
//       217 (2024). The 500–700 figure describes the mid-2000s, before a
//       decline of more than half. It overstated current risk by ~2x.
//     • Three people died in moose crashes across ALL of 2020–2024 — about
//       0.6 per year, not 3–5. That overstated fatalities by roughly 5x.
//
//   Nothing caught it because a number pinned to a moment in time goes stale
//   silently: the prose still reads fluently and no test computes against it.
//   This tool teaches Maine teenagers who will drive these roads, so the
//   numbers should describe the roads they will actually drive.
//
// The rule:
//   Each entry below pins a claim to the range its cited source supports.
//   A claim drifting outside that range fails, and so does a claim that
//   disappears entirely (an anchor that stops matching is a dead check, not
//   a pass — see the NaN incident in check_roadready_night_vision_model).
//
// When new official data lands, update BOTH the bound and the `source` note
// in the same edit. The bound is deliberately a range, not an exact value:
// it should survive a normal year-over-year wobble and fail on a real drift.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'stem_lab/stem_tool_roadready.js';
const src = fs.readFileSync(path.join(ROOT, REL), 'utf8');

const errors = [];

// Each claim: a regex with ONE capture group holding the number, the
// inclusive range the source supports, and the source itself.
const CLAIMS = [
  {
    label: 'moose collisions per year (low end of the stated range)',
    re: /roughly (\d{3})[–-]\d{3} moose[–-]vehicle collisions per year/,
    min: 180, max: 320,
    source: 'MaineDOT Large Animal Crashes: 261/293/218/220/217 for 2020-2024',
  },
  {
    label: 'moose collisions per year (high end of the stated range)',
    re: /roughly \d{3}[–-](\d{3}) moose[–-]vehicle collisions per year/,
    min: 200, max: 360,
    source: 'MaineDOT Large Animal Crashes: peak year in 2020-2024 was 293',
  },
  {
    label: 'MaineDOT single-year moose collision count cited',
    re: /MaineDOT counted (\d{3}) in 2024/,
    min: 210, max: 225,
    source: 'MaineDOT: 217 reported moose collisions in 2024',
  },
  {
    label: 'night share of moose crashes',
    re: /(\d{2})% of moose crashes happen after dark/,
    min: 65, max: 80,
    source: 'MaineDOT via Bangor Daily News 2026-05-16: 74% happen at night',
  },
  {
    label: 'share of moose crashes injuring someone',
    re: /about (\d{1,2}\.\d)% of moose crashes injure someone/,
    min: 12, max: 19,
    source: 'MaineDOT: 15.7% of moose crashes result in human injuries',
  },
  {
    label: 'NHTSA alcohol-impaired driving deaths (2024)',
    re: /In 2024, ([\d,]+) people died in alcohol-impaired-d/,
    min: 11500, max: 12300,
    source: 'NHTSA Traffic Safety Facts 2024: 11,904 alcohol-impaired deaths',
  },
  {
    label: 'NHTSA distracted-driving deaths (2024)',
    re: /reports ([\d,]+) distracted-driving deaths/,
    min: 3000, max: 3400,
    source: 'NHTSA Research Note 813790: 3,208 distraction-affected deaths in 2024',
  },
  {
    label: 'NHTSA distracted-driving injuries (2024)',
    re: /distracted-driving deaths and ([\d,]+) injuries/,
    min: 300000, max: 330000,
    source: 'NHTSA Research Note 813790: 315,167 injured in 2024',
  },
  {
    label: 'texting crash-risk multiplier',
    re: /put it near (\d{2})×/,
    min: 20, max: 25,
    source: 'Virginia Tech Transportation Institute naturalistic driving: ~23x for texting',
  },
  {
    label: 'Maine cyclist passing distance (§2070(1-A))',
    re: /give bicycles and roller skiers at least (\d) feet when passing/,
    min: 3, max: 3,
    source: 'Maine 29-A §2070(1-A): "not less than 3 feet while the motor vehicle is passing"',
  },
  {
    label: 'Maine move-over minimum fine (§2070(8))',
    re: /minimum \$(\d{3}) fine/,
    min: 275, max: 275,
    source: 'Maine 29-A §2070(8): violations carry a minimum $275 fine',
  },
  {
    label: 'Maine parallel-parking curb distance',
    re: /no more than (\d{2}) inches from the curb/,
    min: 18, max: 18,
    source: 'Maine BMV road test: wheels no more than 18 inches from the curb',
  },
  {
    label: 'Maine first-offense OUI minimum fine (§2411)',
    re: /Maine first-offense OUI: at least a \$(\d{3}) fine/,
    min: 500, max: 500,
    source: 'Maine 29-A §2411: minimum $500 fine ($600 if the person refused a test)',
  },
  {
    label: 'Maine first-offense OUI suspension (§2411)',
    re: /at least a \$\d{3} fine and (\d{3})-day license suspension/,
    min: 150, max: 150,
    source: 'Maine 29-A §2411: court-ordered 150-day suspension for a first offense',
  },
  {
    label: 'Maine implied-consent refusal suspension (§2521)',
    re: /Refusing triggers an\s*\n?\s*automatic (\d{3})-day suspension/,
    min: 275, max: 275,
    source: 'Maine 29-A §2521: 275 days for a first refusal (18 mo / 4 yr / 6 yr after)',
  },
  {
    label: 'Maine under-21 first-refusal suspension (§2472)',
    re: /refusal is (\d{2}) months for a first refusal/,
    min: 18, max: 18,
    source: 'Maine 29-A §2472: under-21 first refusal is 18 months, distinct from the ' +
      'adult 275-day refusal suspension under §2521',
  },
  {
    label: 'Maine failure-to-yield-to-emergency-vehicle fine (§2054)',
    re: /emergency vehicle is a Class E crime with at least a \$(\d{3}) fine/,
    min: 250, max: 250,
    source: 'Maine 29-A §2054(4): Class E crime, $250 minimum for a first offense; ' +
      'a second within 3 years carries a mandatory 30-day suspension',
  },
  {
    label: 'Maine texting-while-driving first-offense fine (§2119)',
    re: /First offense is at least \$(\d{3})\./,
    min: 250, max: 250,
    source: 'Maine 29-A §2119: fine of not less than $250 for a first offense ' +
      '($500 and a suspension for a repeat within 3 years)',
  },
  {
    label: "Maine driver's-ed classroom hours",
    re: /(\d{2}) hours of classroom \+ \d{2} hours behind-the-wheel/,
    min: 30, max: 30,
    source: 'Maine BMV: 30 classroom hours + 10 behind-the-wheel for teen driver education',
  },
  {
    label: "Maine driver's-ed behind-the-wheel hours",
    re: /\d{2} hours of classroom \+ (\d{2}) hours behind-the-wheel/,
    min: 10, max: 10,
    source: 'Maine BMV: 30 classroom hours + 10 behind-the-wheel for teen driver education',
  },
];

// Winter friction ratios quoted in prose must match the tool's own mu table.
// An earlier card said snow AND ice were both "4x longer than dry", which
// understated ice by nearly half while the winter physics box on another
// screen correctly said 7x. Recompute from the mu values rather than trusting
// either number.
const MU = {};
for (const [name, re] of [
  ['dry', /return ([\d.]+); \/\/ dry/],
  ['snow', /if \(weather === 'snow'\) return ([\d.]+);/],
  ['ice', /if \(weather === 'ice'\) return ([\d.]+);/],
]) {
  const m = src.match(re);
  if (!m) { errors.push('could not read the ' + name + ' friction coefficient'); continue; }
  MU[name] = Number(m[1]);
}
if (MU.dry && MU.snow && MU.ice) {
  // Braking distance is inversely proportional to mu, so the ratio is mu_dry/mu_x.
  const check = (surface, re, label) => {
    const m = src.match(re);
    if (!m) { errors.push('winter prose no longer states ' + label); return; }
    const claimed = Number(m[1]);
    const actual = MU.dry / MU[surface];
    if (Math.abs(claimed - actual) > 0.75) {
      errors.push(label + ': prose says ' + claimed + 'x, but mu ' + MU.dry + '/' + MU[surface] +
        ' gives ' + actual.toFixed(1) + 'x');
    }
  };
  check('snow', /packed snow runs about (\d)× dry pavement/, 'snow braking ratio');
  check('ice', /and on ice about (\d)×/, 'ice braking ratio');
}

for (const c of CLAIMS) {
  const m = src.match(c.re);
  if (!m) {
    errors.push(c.label + ': claim not found — the statistic was removed or reworded, so this ' +
      'check now protects nothing. Re-anchor it or drop the entry deliberately.\n      source: ' + c.source);
    continue;
  }
  const n = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    errors.push(c.label + ': captured "' + m[1] + '", which is not a number');
    continue;
  }
  if (n < c.min || n > c.max) {
    errors.push(c.label + ': tool says ' + n + ', outside the supported range ' +
      c.min + '-' + c.max + '\n      source: ' + c.source);
  }
}

// ── Internal consistency: the fatality claim must not contradict the
// collision count. An older version paired ~600 collisions with "3-5 fatal
// annually", which implied a fatality rate near 1 in 150. The published
// rate is about 1 in 270 over 2003-2017, and far lower in recent years.
const fatalWindow = src.match(/three people died in moose crashes across all of (\d{4})[–-](\d{4})/i);
if (!fatalWindow) {
  errors.push('moose fatality claim not found — it previously said "3-5 fatal moose crashes ' +
    'annually", which overstated deaths by roughly 5x. Do not let it return unqualified.');
} else {
  const years = Number(fatalWindow[2]) - Number(fatalWindow[1]) + 1;
  if (years < 3 || years > 10) {
    errors.push('moose fatality window spans ' + years + ' years; expected a multi-year window ' +
      '(a single-year figure invites the old "3-5 per year" error)');
  }
}

// The tool must not reassert the retired figures anywhere.
const RETIRED = [
  { re: /500[–-]700 reported moose/, note: 'the retired 500-700 collisions-per-year figure' },
  { re: /averages 3[–-]5 fatal moose crashes annually/, note: 'the retired "3-5 fatal annually" figure' },
];
for (const r of RETIRED) {
  if (r.re.test(src)) errors.push(r.note + ' is back in the source');
}

if (errors.length) {
  console.error('\n✗ check_roadready_sourced_statistics FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  A statistic pinned to a moment in time goes stale silently — the prose still');
  console.error('  reads fine. When official data updates, change the bound AND the source note.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_sourced_statistics: ' + CLAIMS.length +
    ' sourced statistics within their published ranges; retired figures absent.');
}
