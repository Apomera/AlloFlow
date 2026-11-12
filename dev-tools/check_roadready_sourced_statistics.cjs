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
    source: 'Virginia Tech Transportation Institute naturalistic driving: 23.2x for texting. ' +
      'NOTE (round-30 content review): that figure comes from a study of HEAVY-TRUCK drivers, not ' +
      'car drivers. The number is pinned as published; the wording around it is on the list for ' +
      'the owner to qualify.',
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
    label: 'Maine school-bus passing minimum fine (§2308)',
    re: /Class E crime, \$(\d{3}) minimum fine/,
    min: 250, max: 250,
    source: 'Maine 29-A §2308(6): a violation of subsection 2 is a Class E crime punishable ' +
      'by a $250 MINIMUM fine for the first offence.',
  },
  {
    label: 'Maine school-bus 2nd-offence suspension (§2308)',
    // The toast said "First offense: ..." and then never said what a second
    // offence costs -- a dangling qualifier that invites the reader to assume
    // it is just a bigger fine. It is a mandatory licence suspension.
    re: /Second within 3 years: a mandatory (\d{2})-day licence suspension/,
    min: 30, max: 30,
    source: 'Maine 29-A §2308(6): mandatory 30-day suspension for a 2nd offence occurring ' +
      'within 3 years of the first.',
  },
  {
    label: 'Maine school-bus stop exception requires a PHYSICAL barrier (§2308)',
    // §2308(3) exempts opposite-direction traffic only where the roadway is
    // separated by curbing or other physical barrier, or on a limited-access
    // highway with the bus in a loading zone. Paint-only lanes are NOT
    // separated. Softening this to "a divided road" would exempt every
    // centre-line road in the state. Presence check on the paint clause.
    re: /Paint-only lanes are undivided/,
    min: null, max: null,
    source: 'Maine 29-A §2308(3): the exception needs curbing or other PHYSICAL barrier, or ' +
      'a limited-access highway where pedestrians may not cross and the bus is in a loading ' +
      'zone. A painted centre line does not separate a roadway.',
  },
  {
    label: 'Maine pedestrian yield keeps the statutory phrasing (§2056)',
    // "visible intent to enter" is §2056(4)'s own language, not a paraphrase.
    // It is the whole point of the rule: the duty attaches BEFORE the
    // pedestrian is in the road, so a rewording to "is in the crosswalk"
    // would teach a materially weaker duty. Presence check.
    re: /showing visible intent to enter/,
    min: null, max: null,
    source: 'Maine 29-A §2056(4): yield to a pedestrian crossing within a marked crosswalk ' +
      'OR who has shown visible intent to enter it. §2056(7) also forbids overtaking a ' +
      'vehicle stopped to let a pedestrian cross.',
  },
  {
    label: 'Maine crossing-guard signal is binding but not overriding (§2091-A)',
    // Both halves matter and both are the statute's: the driver must obey the
    // guard, AND the guard cannot override a lighted signal. Teaching only
    // the first half tells a student to run a red light on a guard's wave.
    re: /may not contradict or override a lighted traffic or pedestrian signal/,
    min: null, max: null,
    source: 'Maine 29-A §2091-A: an operator shall obey a hand signal or handheld traffic ' +
      'control device of a qualified school crossing guard; §2091-A(4) a guard may not ' +
      'contradict or override a lighted traffic control or pedestrian control device.',
  },
  {
    label: 'Regenerative braking recovery fraction',
    // Was "~70% of braking energy" -- the optimistic top of the quoted
    // 60-70% band, while real-world measurements land at 48-60% and a hard
    // stop goes mostly to the friction brakes. There is NO regen constant in
    // the tool's physics, so nothing contradicted the prose; it was a bare
    // claim. Pinned on the low end of the stated range.
    re: /recaptures roughly half the braking energy in normal driving - about (\d{2})-60%/,
    min: 50, max: 50,
    source: 'Published real-world regen recovery runs about 48-60% in normal driving, ' +
      'higher (85%+) on a gentle long downgrade. 70% is a best-case figure, not typical.',
  },
  {
    label: 'Cannabis crash-risk claim states its own uncertainty',
    // The teaching point (THC impairs reaction time, judgment, spatial
    // awareness) is solid and stays. The MULTIPLIER is contested:
    // meta-analyses land near OR 2.0-2.66, but NHTSA's large case-control
    // study found ~1.0 once age and sex were controlled. "Studies show
    // cannabis doubles crash risk" presented one side as settled. Presence
    // check: the qualifier must survive, since the confident version is
    // shorter and reads better, which is exactly how it would come back.
    re: /The impairment is the reliable finding; the exact\s+multiplier is not\./,
    min: null, max: null,
    source: 'Meta-analysis summary OR 2.66 (95% CI 2.07-3.41); other pooled estimates ~2.0; ' +
      'French national data adjusted OR 1.65 for THC alone; NHTSA DOT HS 812 440 case-control ' +
      'adjusted OR ~1.0. Impairment in simulators is consistently reproduced; the crash-risk ' +
      'multiplier is not. Do not restate the multiplier as settled.',
  },
  {
    label: 'Maine headlight visibility threshold (§2067)',
    re: /visibility is under ([\d,]+) ft due to unfavorable conditions/,
    min: 1000, max: 1000,
    source: 'Maine 29-A §2067: headlights required when persons or vehicles are not ' +
      'discernible for 1,000 feet ahead, and whenever wipers are in constant use.',
  },
  {
    label: 'Maine high-beam dim distance, oncoming (§2067)',
    re: /dim high beams within (\d{3}) ft of oncoming traffic/,
    min: 500, max: 500,
    source: 'Maine 29-A §2067: dim or switch to low beam within 500 feet of an oncoming ' +
      'vehicle; also turn off a fog light.',
  },
  {
    label: 'Maine high-beam dim distance, following (§2067)',
    re: /(\d{3}) ft when following another vehicle/,
    min: 300, max: 300,
    source: 'Maine 29-A §2067: dim within 300 feet when following another vehicle.',
  },
  {
    label: 'Maine school-zone active speed (§2074)',
    re: /§2074 sets (\d{2}) mph in a school zone/,
    min: 15, max: 15,
    source: 'Maine 29-A §2074: 15 mph in a school zone during recess and during school ' +
      'opening/closing hours.',
  },
  {
    label: 'Maine school-zone window is defined as a half hour (§2074)',
    // The tool used to say only "opening/closing windows", which a student
    // cannot act on. The statute defines it: 1/2 hour either side of the start
    // and of the end of the school day. Presence check -- it is the qualifier
    // that carries the meaning, not a number in a range.
    re: /a HALF HOUR before and a half hour after the start of the school day/,
    min: null, max: null,
    source: 'Maine 29-A §2074 defines school opening and closing hours as 1/2 hour before ' +
      'and 1/2 hour after the beginning of the school day, and the same around its end.',
  },
  {
    label: 'Maine snowmobile crossing cites the LIVE section (§13106-A)',
    // Title 12 §13106 was REPEALED by PL 2003, c. 655, B393. The tool cited it
    // until 2026-09-21. The live section is §13106-A, amended as recently as
    // PL 2025, c. 267. Second repealed-statute catch in this tool: §2951 for
    // wildlife collisions was repealed in 1979, live section is §12403.
    re: /Title 12, §13106-A\(6\) and \(7\)/,
    min: null, max: null,
    source: 'Maine Title 12 §13106-A(6): complete stop before entering a public way. ' +
      '§13106-A(7): yield right-of-way to ALL vehicular traffic. The repealed §13106 must ' +
      'not come back, and note §13106-A does NOT say "at right angles" -- it says cross as ' +
      'directly as possible, so do not reintroduce that phrasing as statute.',
  },
  {
    label: 'Maine fire-apparatus following distance (§2066)',
    re: /(\d{3}) ft behind fire apparatus responding to an alarm/,
    min: 500, max: 500,
    source: 'Maine 29-A §2066(5): may not follow within 500 feet of fire apparatus traveling ' +
      'in response to a fire alarm. NOTE: the tool cited §2055 for this until 2026-09-21; ' +
      '§2055 is "Animals on a public way" and has nothing to do with emergency vehicles.',
  },
  {
    label: 'Maine other-emergency-vehicle following distance (§2066)',
    // The 500 ft figure applies ONLY to fire apparatus on a call. Stating 500
    // as though it covered every emergency vehicle is the error this pins
    // against; the general figure is 150 ft, so both must be present.
    re: /(\d{3}) ft behind any other emergency vehicle running its lights/,
    min: 150, max: 150,
    source: 'Maine 29-A §2066(5): 150 feet behind any other authorized emergency vehicle ' +
      '(§2054(1)(B)) that is using an emergency light (§2054(1)(D)).',
  },
  {
    label: 'Maine railroad-crossing slow-and-look distance (§2076)',
    re: /by (\d{3}) ft from the nearest rail, slow to a reasonable\/proper speed/,
    min: 100, max: 100,
    source: 'Maine 29-A §2076(1): at 100 feet from the nearest rail, reduce speed to a ' +
      'reasonable and proper rate, observe in each direction, proceed cautiously. This one ' +
      'applies to EVERY driver, unlike the 15-50 ft mandatory stop in §2076(3).',
  },
  {
    label: 'Maine mandatory railroad stop band, far edge (§2076)',
    re: /stop 15-(\d{2}) ft from the nearest rail/,
    min: 50, max: 50,
    source: 'Maine 29-A §2076(3): stop between 50 and 15 feet from the nearest rail. Applies ' +
      'to buses carrying passengers, chlorine loads, placarded hazmat and cargo-tank vehicles. ' +
      'School buses are covered by §2306 by name, which is why the tool cites §§2076/2306.',
  },
  {
    label: 'Maine snow/ice duty weight threshold (§2093)',
    re: /a vehicle registered under ([\d,]+) lb \(bigger trucks are exempt/,
    min: 10000, max: 10000,
    source: 'Maine 29-A §2093: applies to vehicles with a REGISTERED WEIGHT under 10,000 lb; the ' +
      'threshold deliberately excludes commercial trucks.',
  },
  {
    label: 'Maine snow/ice first-offence fine ceiling (§2093)',
    // Anchored on the fine alone, not on the conditional clause before it --
    // otherwise rewording the conditional also breaks this check and the fine
    // value itself never gets tested. Same coupling mistake as the §2081 fine.
    re: /up to \$(\d{2}) first offence/,
    min: 50, max: 50,
    source: 'Maine 29-A §2093: not more than $50 first offence, $150-$250 for each subsequent.',
  },
  {
    label: 'Maine snow/ice duty is conditional on damage or injury (§2093)',
    re: /becomes a traffic infraction when what falls off actually causes damage or injury/,
    min: null, max: null,
    source: 'Maine 29-A §2093 is only violated when falling snow or ice CAUSES damage or injury. ' +
      'Stating it as an unconditional duty overstates the law — clearing the car is still the ' +
      'right advice, but for the safety reason, not because a bare roof is itself an offence.',
  },
  {
    label: 'Maine leaving-the-scene charge named as a Class E crime (§2254)',
    re: /Driving off instead is a CLASS E CRIME/,
    min: null, max: null,
    source: 'Maine 29-A §2254: failing to stop and leave the required information on an ' +
      'unattended vehicle is a Class E CRIME, not a traffic infraction. The three required ' +
      'items (name+address, registration number, circumstances) and the insurance-proof duty ' +
      'were already stated correctly; only the charge level was missing.',
  },
  {
    label: 'Maine child-restraint internal-harness weight (§2081)',
    re: /age 2\+ under (\d{2}) lb in an internal-harness child restraint/,
    min: 55, max: 55,
    source: 'Maine 29-A §2081(3): a child 2 or older weighing less than 55 lb must be in a child ' +
      'restraint system.',
  },
  {
    label: 'Maine belt-positioning-seat weight ceiling (§2081)',
    re: /under 8, under (\d{2}) lb, and under \d{2} in in a belt-positioning seat/,
    min: 80, max: 80,
    source: 'Maine 29-A §2081(3): under 80 lb AND under 57 in AND under 8 years — all three ' +
      'conditions — requires a belt-positioning seat or other child restraint.',
  },
  {
    label: 'Maine belt-positioning-seat height ceiling (§2081)',
    re: /under 8, under \d{2} lb, and under (\d{2}) in in a belt-positioning seat/,
    min: 57, max: 57,
    source: 'Maine 29-A §2081(3): under 57 inches, alongside the 80 lb and age-8 conditions.',
  },
  {
    label: 'Maine child-restraint first-offense fine (§2081)',
    // Anchored on "First offense: $NN" alone. An earlier version included the
    // whole under-12 clause, so ANY rewording of that sentence also broke the
    // fine check -- two failures for one edit, and the fine's own value was
    // never actually tested. The qualifier has its own presence check below.
    re: /under 12 in the rear seat[^.]*\. First offense: \$(\d{2})/,
    min: 50, max: 50,
    source: 'Maine 29-A §2081: $50 first offence, $125 second, $250 third and subsequent; the ' +
      'fine may not be suspended by the court.',
  },
  {
    label: 'Maine under-12 rear-seat rule keeps its "if possible" qualifier (§2081)',
    re: /under 12 in the rear seat if possible/,
    min: null, max: null,
    source: 'Maine 29-A §2081(3)(C) reads "properly secured in the rear seat of a vehicle, if ' +
      'possible". The qualifier is in the statute — dropping it would overstate the duty.',
  },
  {
    label: 'Maine wildlife-collision failure-to-report fine, low end (12 §12403)',
    re: /civil violation carrying a \$(\d{3})[–-]\$\d{3} fine/,
    min: 100, max: 100,
    source: 'Maine Title 12 §12403: failing to report a collision with a deer, moose, bear or ' +
      'wild turkey, or removing part of a carcass without the certificate, is a civil violation ' +
      'with a fine of not less than $100 nor more than $500.',
  },
  {
    label: 'Maine wildlife-collision carcass rule says CERTIFICATE, not permit',
    re: /the officer issues a certificate at the scene/,
    min: null, max: null,
    source: 'Title 12 §12403 issues a CERTIFICATE at the scene when the vehicle has apparent ' +
      'damage. The tool previously said "roadkill salvage requires a permit", which implies an ' +
      'application afterward and would leave a driver waiting instead of asking the officer.',
  },
  {
    label: 'Maine reportable-crash property damage threshold (§2251)',
    re: /apparent property damage of \$([\d,]+) or more/,
    min: 2000, max: 2000,
    source: 'Maine 29-A §2251: a reportable accident is one with bodily injury, death, or apparent ' +
      'property damage of $2,000 or more, judged on the market value of necessary repairs. Must ' +
      'be reported immediately by the quickest means to state police, a sheriff, or local police.',
  },
  {
    label: 'Maine new-resident registration window, correctly attributed',
    re: /for NEW RESIDENTS converting an out-of-state registration/,
    min: null, max: null,
    source: 'The 30-day window applies to NEW RESIDENTS converting an out-of-state registration, ' +
      'not to a vehicle purchase. Maine BMV states no post-purchase grace period. The checklist ' +
      'previously said "Register within 30 days" under an "After purchase" heading.',
  },
  {
    label: 'Maine standard inspection fee (§1751)',
    // Reworded in round 30: it used to read "by statute at about $12.50",
    // which hid that the figure is a CAP and that Cumberland County differs.
    re: /caps the standard inspection fee at \$(\d{2}\.\d{2}) \(29-A §1751\)/,
    min: 12.5, max: 12.5,
    source: 'Maine 29-A §1751(3-A)(A), read 2026-11-09: "For inspections performed under ' +
      'subsection 2, the fee may not be more than $12.50". "The inspection fee is payable ' +
      'whether the vehicle passes inspection or not."',
  },
  {
    label: 'Maine enhanced (Cumberland County) inspection fee, 1996+ vehicles (§1751)',
    re: /up to \$(\d{2}\.\d{2}) for 1996 and newer models/,
    min: 18.5, max: 18.5,
    source: 'Maine 29-A §1751(2-A): "a motor vehicle that is required to be registered in ' +
      'Cumberland County ... must have an annual enhanced inspection." §1751(3-A)(C): "For ' +
      'inspections of 1996 and subsequent model vehicles performed under subsection 2-A, the ' +
      'fee may not be more than $18.50" ($15.50 for pre-1996 models under (B)).',
  },
  // ── Round 30 (2026-11-09): statutes the corrected tool now cites. Each was
  // fetched from legislature.maine.gov on 2026-11-09 and is in force (none is
  // marked REPEALED). Text saved with the round at lane_facts/work/statutes/.
  {
    label: 'Maine post-crash duty: name AND address (§2252, §2255)',
    // The tool told teens to withhold their home address. That is the reverse
    // of the law, and failing to give it is a crime. Presence check on the
    // whole duty sentence, citation included.
    re: /your name and address, your plate number, and your license and insurance if they ask\. Maine law requires this \(29-A §2252 and §2255\)/,
    min: null, max: null,
    source: 'Maine 29-A §2252(2) (injury or death): "The operator shall remain at the scene and ' +
      'provide ... A. The operator\'s name and address; B. The registration number of the ' +
      'operator\'s vehicle; C. An opportunity to examine the driver\'s license if ... so requests ' +
      'and the license is available; and D. Evidence of liability insurance or financial ' +
      'responsibility ... if ... so requests." §2255(2) (property damage) lists the same four ' +
      'items for the property owner.',
  },
  {
    label: 'Maine post-crash: leaving the scene is a crime (§2252(4), §2255(3))',
    re: /Stay at the scene\. Leaving a crash is a crime in Maine\./,
    min: null, max: null,
    source: 'Maine 29-A §2252(1): the operator "shall immediately stop the vehicle at the scene"; ' +
      '§2252(4): "A person commits a Class D crime if that person fails to comply with this ' +
      'section, except that a person commits a traffic infraction if that person fails to comply ' +
      'with subsection 2, paragraph D." §2255(3): "A person commits a Class E crime if that ' +
      'person fails to comply with this section" (same paragraph D exception). The tool states ' +
      'no class or fine, so there is no number to pin: verified, presence check only.',
  },
  {
    label: 'Maine intermediate-licence passenger rule (§1311)',
    re: /may not carry passengers who are not immediate family unless a qualified licensed adult supervises \(29-A §1311\)/,
    min: null, max: null,
    source: 'Maine 29-A §1311(1): "A person under 18 years of age who has been issued a driver\'s ' +
      'license may not: A. Carry passengers other than immediate family members unless accompanied ' +
      'by a licensed operator who meets the requirements of section 1304, subsection 1, paragraph ' +
      'E". The restriction runs 270 days from licence issuance (§1311(2)). The tool states no ' +
      'number in this sentence: presence check.',
  },
  {
    label: 'Maine roundabout: no more than 2 exits in the outside lane (§2053(6)(D))',
    re: /may not travel past (two) exits in the outside lane \(29-A §2053\)/,
    min: null, max: null,
    source: 'Maine 29-A §2053(6)(D): the operator "May not travel in a traffic circle, roundabout ' +
      'or rotary beyond 2 exit points in the outside lane". (6)(A): yield to a vehicle already ' +
      'within it. (6)(E): obey signs and pavement markings. The Maine manual adds: choose the ' +
      'right-most lane if leaving within two exits, "follow the lane lines", "Signal your exit". ' +
      'The capture is the word "two"; the regex itself pins it.',
  },
  {
    label: 'Maine uncontrolled intersection: yield to the vehicle on your right (§2053(3))',
    re: /yield to the car on your right \(29-A §2053\)/,
    min: null, max: null,
    source: 'Maine 29-A §2053(3): "The operator of a vehicle at intersecting public ways has the ' +
      'right-of-way over a vehicle on the operator\'s left, and must yield right-of-way to one on ' +
      'its right". There is NO T-intersection rule in the statute or the manual; the tool used to ' +
      'teach "the car on the through road always goes first".',
  },
  {
    label: 'Maine narrow road: stop and let the other pass, no uphill priority (§2053(1))',
    re: /must stop at a reasonable time and a convenient place to let the other pass \(29-A §2053\)/,
    min: null, max: null,
    source: 'Maine 29-A §2053(1): "When it is unsafe or difficult to pass without interference, an ' +
      'operator must stop at a reasonable time and convenient place, to allow the other to pass." ' +
      'Uphill-has-priority is a California rule the tool used to present as Maine law.',
  },
  {
    label: 'Maine under-21 first refusal, OUI drill explanation (§2472(4))',
    re: /a first refusal = automatic (\d{2})-month suspension \(29-A §2472/,
    min: 18, max: 18,
    source: 'Maine 29-A §2472(4): for a person under 21 "the suspension is: A. Eighteen months for ' +
      'the first refusal; and B. Thirty months for a 2nd or subsequent refusal." The drill driver ' +
      'is 19; the tool used to give the adult 275 days here.',
  },
  {
    label: 'Maine under-21 first refusal, OUI drill keyed option (§2472(4))',
    re: /Automatic (\d{2})-month license suspension/,
    min: 18, max: 18,
    source: 'Maine 29-A §2472(4)(A): eighteen months. BMV OUI page: "1st Provisional (refusal) 18 Months".',
  },
  {
    label: 'Maine adult first refusal quoted beside the under-21 figure (§2521)',
    re: /it is (\d{3}) days for drivers 21 and over/,
    min: 275, max: 275,
    source: 'Maine 29-A §2521 / BMV OUI page: "1st (refusal) 275 Days" for drivers 21 and over.',
  },
  {
    label: 'Maine implied-consent fact card carries the under-21 figure (§2472(4))',
    re: /275-day license suspension \((\d{2}) months if you are under 21\)/,
    min: 18, max: 18,
    source: 'Maine 29-A §2472(4)(A). The card serves teen drivers; the adult figure alone misled them.',
  },
  {
    label: 'Maine provisional licence: first moving-violation suspension (§2472(2))',
    re: /a moving-violation conviction suspends it for (\d{2}) days \(\d{3} days for a second, \d year for a third\)/,
    min: 30, max: 30,
    source: 'Maine 29-A §2472(2): "the Secretary of State shall suspend the license: A. For 30 days ' +
      'on the 1st offense; B. For 180 days on the 2nd offense; and C. For one year on the 3rd or ' +
      'subsequent offense." BMV: the licence is provisional for two years following issuance.',
  },
  {
    label: 'Maine provisional licence: second moving-violation suspension (§2472(2))',
    re: /suspends it for \d{2} days \((\d{3}) days for a second, \d year for a third\)/,
    min: 180, max: 180,
    source: 'Maine 29-A §2472(2)(B): 180 days on the 2nd offense.',
  },
  {
    label: 'Maine provisional licence: third moving-violation suspension (§2472(2))',
    re: /suspends it for \d{2} days \(\d{3} days for a second, (\d) year for a third\)/,
    min: 1, max: 1,
    source: 'Maine 29-A §2472(2)(C): one year on the 3rd or subsequent offense.',
  },
  {
    label: 'Maine permit: driver education COMPLETED before applying (§1304(1)(A))',
    re: /you must COMPLETE a driver education course before you apply/,
    min: null, max: null,
    source: 'Maine 29-A §1304(1)(A): "a person who is 15 years of age or older and has not attained ' +
      '18 years of age must complete a course in driver education before applying for a ' +
      'learner\'s permit." The tool used to say "with driver\'s ed enrollment".',
  },
  {
    label: 'Maine permit: supervised hours before a licence (§1304(1)(H))',
    re: /log (\d{2}) hours of supervised driving, \d{2} of them at night/,
    min: 70, max: 70,
    source: 'Maine 29-A §1304(1)(H): "(1) A period of 6 months has passed from the date the person ' +
      'was issued a learner\'s permit; and (2) The person has completed a minimum of 70 hours of ' +
      'driving, including 10 hours of night driving". There is NO "no violations" condition.',
  },
  {
    label: 'Maine permit: night hours within the supervised hours (§1304(1)(H))',
    re: /log \d{2} hours of supervised driving, (\d{2}) of them at night/,
    min: 10, max: 10,
    source: 'Maine 29-A §1304(1)(H)(2): including 10 hours of night driving.',
  },
  {
    label: 'Maine work zones: only SPEEDING fines double (§2075(2))',
    re: /Maine doubles the fine for SPEEDING in a posted work zone/,
    min: null, max: null,
    source: 'Maine 29-A §2075(2): "The penalty for a violation of this subsection is a fine equal ' +
      'to twice the amount of the fine ... for a similar speeding violation under section 2073", ' +
      'and only where the limit is posted on standard black and white signs. Ignoring a flagger ' +
      'or cutting through barrels is a violation but not a doubled-fine one.',
  },
  {
    label: 'Maine school bus: duty to stop starts when it HAS STOPPED with red lights (§2308(2))',
    re: /has stopped with its red lights flashing \(29-A §2308\)/,
    min: null, max: null,
    source: 'Maine 29-A §2308(2): "on meeting or overtaking a school bus from either direction when ' +
      'the bus has stopped with its red lights flashing to receive or discharge passengers, shall ' +
      'stop the vehicle before reaching the school bus." Passing a moving bus showing yellow is ' +
      'not "passing a school bus" under this section; preparing to stop is still the advice.',
  },
  {
    label: 'Maine move-over: a careful and prudent speed, no stated mph (§2070(8)(B))',
    re: /(?:otherwise|if not,) slow to a careful, prudent speed/,
    min: null, max: null,
    source: 'Maine 29-A §2070(8)(B): "pass the stationary vehicle at a careful and prudent speed ' +
      'reasonable for passing the vehicle safely." The statute sets no number; the tool used to ' +
      'key "slow to about 45 mph".',
  },
  {
    label: 'Maine interstate ceiling (§2073(1))',
    re: /never more than (\d{2}) mph in Maine/,
    min: 75, max: 75,
    source: 'Maine 29-A §2073(1): the commissioner "may not set maximums that exceed 60 miles per ' +
      'hour or, on the interstate system or other divided controlled-access highways, 75 miles ' +
      'per hour." The tool used to say interstates are "65-70 mph in Maine".',
  },
  // ── Round 30: Maine Driver's License Manual (Rev 4/24) figures the tool now teaches.
  {
    label: 'Maine manual minimum following distance, seconds (permit answer)',
    re: /'Seconds \((\d)-second rule minimum\)'/,
    min: 4, max: 4,
    source: 'Maine Driver\'s License Manual Rev 4/24, "Space in Front": "Keep at least 4 seconds ' +
      'between your car and the vehicle in front." "You are following too close if you pass that ' +
      'point before counting 4 seconds." The tool taught 3 seconds (and 2 in two questions).',
  },
  {
    label: 'Maine manual minimum following distance is attributed to the manual',
    re: /Four seconds is the minimum on dry roads \(Maine manual\)/,
    min: null, max: null,
    source: 'Maine Driver\'s License Manual Rev 4/24: "Keep at least 4 seconds". Rain 5 s and snow ' +
      '6 s are Road Ready\'s own ladder (the manual says only "A four plus second following ' +
      'distance may be needed during adverse conditions") and the tool says so.',
  },
  {
    label: 'Maine manual low-beam sight distance',
    re: /only about (\d{3}) feet ahead \(Maine driver's manual\)/,
    min: 250, max: 250,
    source: 'Maine Driver\'s License Manual Rev 4/24: "Headlights will let you see clearly only ' +
      'about 250 feet ahead. Therefore, if you drive faster than about 50 mph on a dark road, you ' +
      'are really \'driving blind.\'" The tool said 350 ft. check_roadready_night_vision_model ' +
      'pins the screen constant and the 48 mph ceiling the model derives from it.',
  },
  {
    label: 'Maine manual visual lead, low end',
    re: /look (\d{2}) to \d{2} seconds ahead/,
    min: 20, max: 20,
    source: 'Maine Driver\'s License Manual Rev 4/24: "to keep looking 20 to 30 seconds ahead." ' +
      'The tool taught 12-15 seconds (a Smith System figure).',
  },
  {
    label: 'Maine manual visual lead, high end',
    re: /look \d{2} to (\d{2}) seconds ahead/,
    min: 30, max: 30,
    source: 'Maine Driver\'s License Manual Rev 4/24: "Looking 20 to 30 seconds ahead also helps you".',
  },
  {
    label: 'Maine manual hydroplaning onset, low end',
    re: /as low as (\d{2}) to \d{2} mph \(Maine driver/,
    min: 30, max: 30,
    source: 'Maine Driver\'s License Manual Rev 4/24: "In most cars, hydroplaning may begin at ' +
      'speeds as low as 30 to 40 MPH ... In a bad rainstorm, the tires may lose all contact with ' +
      'the road at 50 to 60 MPH." The tool said 45 mph in three places and 35 in a fourth.',
  },
  {
    label: 'Maine manual hydroplaning onset, high end',
    re: /as low as \d{2} to (\d{2}) mph \(Maine driver/,
    min: 40, max: 40,
    source: 'Maine Driver\'s License Manual Rev 4/24: "as low as 30 to 40 MPH".',
  },
  {
    label: 'Maine manual slippery-road speeds',
    re: /packed snow, slow down to half speed; ice, slow to a crawl/,
    min: null, max: null,
    source: 'Maine Driver\'s License Manual Rev 4/24: "Wet road: Slow down 5 to 10 mph. Packed ' +
      'snow: Slow down to half speed. Ice: Slow to a crawl."',
  },
  {
    label: 'Maine manual sinking-car escape route',
    re: /The window is the best way out/,
    min: null, max: null,
    source: 'Maine Driver\'s License Manual Rev 4/24: "The best escape route is through a window, ' +
      'because water pressure makes it hard to open a door. If your car has power windows, open ' +
      'them as soon as possible". The keyed answer used to say "window or door".',
  },
  {
    label: 'Maine manual moose collision peak months',
    re: /Moose collisions peak in May and June/,
    min: null, max: null,
    source: 'Maine Driver\'s License Manual Rev 4/24: "May and June are Peak Moose Collision ' +
      'Months!"; "moose and deer are most active between dusk and dawn".',
  },
  {
    label: 'Maine BMV knowledge test length',
    re: /real Maine knowledge test has (\d{2}) questions and you need \d{2} right to pass/,
    min: 30, max: 30,
    source: 'Maine BMV driver\'s license exam page (saved 2026-11-09): "The knowledge test consists ' +
      'of 30 questions, and you must answer a minimum of 24 correctly to pass the test." The ' +
      'tool\'s own practice test is 20 questions and must not be called the BMV format.',
  },
  {
    label: 'Maine BMV knowledge test pass mark',
    re: /real Maine knowledge test has \d{2} questions and you need (\d{2}) right to pass/,
    min: 24, max: 24,
    source: 'Maine BMV driver\'s license exam page: "a minimum of 24 correctly".',
  },
  {
    label: 'Maine BMV Examination Section extension',
    re: /207-624-9000, ext\. (\d{5})/,
    min: 52119, max: 52119,
    source: 'Maine BMV driver\'s license exam page: "call the Examination Section at ' +
      '207-624-9000, ext. 52119". The page lists no accommodations; the tool says to ASK.',
  },
  // ── Round 30: other sourced figures the corrections introduced.
  {
    label: 'Operation Lifesaver freight-train stopping distance, football fields',
    re: /needs more than a mile to stop: the length of (\d{2}) football fields \(Operation Lifesaver\)/,
    min: 18, max: 18,
    source: 'Operation Lifesaver, oli.org/safety-near-trains/track-safety-basics (read 2026-11-09): ' +
      '"It takes the average freight train traveling 55 mph more than a mile - the length of 18 ' +
      'football fields - to stop." The tool used to add an 18,000-ton figure whose arithmetic was wrong.',
  },
  {
    label: 'US DOE idling break-even, seconds',
    re: /idling for more than about (\d{2}) seconds wastes more \(U\.S\. Department of Energy\)/,
    min: 10, max: 10,
    source: 'energy.gov FOTW #1239 (2022-05-23): "Idling an Engine for as Little as 10 Seconds Will ' +
      'Use More Fuel than Stopping and Restarting the Vehicle." The tool keyed 30 seconds.',
  },
  {
    label: 'tyre under-inflation fuel penalty per PSI',
    re: /every 1 PSI low ≈ (0\.\d)% MPG loss, up to about \d% \(fueleconomy\.gov\)/,
    min: 0.2, max: 0.2,
    source: 'fueleconomy.gov "Keeping Your Vehicle in Shape" (read 2026-11-09): "Under-inflated ' +
      'tires can lower gas mileage by about 0.2% for every 1 psi drop in the average pressure of ' +
      'all tires"; "up to 3% in some cases". The tool said 0.3% and, elsewhere, 3-10%.',
  },
  {
    label: 'tyre under-inflation fuel penalty, ceiling',
    re: /every 1 PSI low ≈ 0\.\d% MPG loss, up to about (\d)% \(fueleconomy\.gov\)/,
    min: 3, max: 3,
    source: 'fueleconomy.gov: "You can improve your gas mileage by 0.6% on average - up to 3% in some cases".',
  },
  {
    label: 'cetirizine is not presented as non-drowsy',
    re: /Cetirizine \(Zyrtec\) is not one of them: its label warns that drowsiness may occur/,
    min: null, max: null,
    source: 'Zyrtec Drug Facts label (DailyMed, NIH, read 2026-11-09): "When using this product ' +
      'drowsiness may occur ... be careful when driving a motor vehicle or operating machinery". ' +
      'The tool used to list Zyrtec as a non-drowsy option.',
  },
  {
    label: 'Maine dealer used-car inspection-sticker age',
    re: /inspection sticker issued within the last (\d{2}) days/,
    min: 60, max: 60,
    source: 'Maine dealer "warranty of inspectability": a used car sold by a dealer must ALREADY ' +
      'carry a sticker issued within the past 60 days. The tool previously said "inspection ' +
      'required within 10 days of purchase", which inverts who owes the obligation and is not ' +
      'in §1751.',
  },
  {
    label: 'Maine studded-tire ban starts May 1 (§1919)',
    re: /Maine law bans studded tires from May (\d) to October 1 \(29-A §1919\)/,
    min: 1, max: 1,
    source: 'Maine 29-A §1919(1), read 2026-11-10: "from the first day of May to the first day of October, a ' +
      'person may not operate a vehicle with tires having metal studs". Both named days are inside the ban, so the tool ' +
      'says October 2 to April 30 (it used to say Oct 1 - May 1). Retractable studs may be fitted year-round but not extended in that window.',
  },
  {
    label: 'car purchase as a share of four-year ownership cost',
    re: /the car itself is only about (\d{2})-\d{2}% of what you actually spend/,
    min: 13, max: 16,
    source: 'Derived from the tool\'s OWN listed running costs: insurance 1200-3600, gas ' +
      '1000-2500, maintenance 500-1200, reg+inspection 150 = 2850-7450/yr. Over 4 years on a ' +
      '$5,000 car that is 14-30%. The card previously said the car is "40-50% of the total ' +
      'cost", which understates running costs and so undercuts its own point.',
  },
  {
    label: 'Maine handheld-device first-offense fine (§2121)',
    re: /handheld first offense \$(\d{2});/,
    min: 50, max: 50,
    source: 'Maine 29-A §2121: $50 first offence, $250 for a 2nd or subsequent. This is a ' +
      'DIFFERENT offence from §2119 texting, which starts at $250 — the tool states both and ' +
      'must keep them distinct.',
  },
  {
    label: 'sedan stopping distance at 55 mph (must match the tool\'s own model)',
    re: /a sedan needs about (\d{3}) ft to stop/,
    min: 255, max: 268,
    source: 'Derived from the tool\'s own stoppingDistance(): mu 0.72, 1.5 s reaction = 261 ft. ' +
      'The card previously said ~200 ft, which the model does not produce at any reaction time.',
  },
  {
    label: 'heavy-vehicle stopping distance at 55 mph',
    re: /a loaded bus or truck needs closer to (\d{3}) ft/,
    min: 370, max: 410,
    source: 'FMCSA ~390 ft at 55 mph for a loaded heavy vehicle. The card previously said 480 ft, ' +
      'which implies mu 0.28 — a WET-road value for a claim explicitly about dry pavement.',
  },
  {
    label: 'all-season rubber stiffening threshold',
    re: /A common rule of thumb is to switch when days stay below about (\d{2})°F/,
    min: 45, max: 45,
    source: 'Round 32: no primary source was read for this figure, so the tool now calls it a rule of thumb. Was: Industry standard 7°C / 45°F — the point where a winter tire begins to out-grip an ' +
      'all-season. The tool previously said "below 20°F", which understated the window by 25°F ' +
      'AND contradicted the 45°F figure it states in three other places.',
  },
  {
    label: 'NWS depth that carries away most cars',
    re: /(\d{2}) inches to carry away most cars/,
    min: 12, max: 12,
    source: 'NWS Turn Around Don\'t Drown: 6 in knocks over an adult, 12 in carries most cars, ' +
      '2 ft moves an SUV or truck. The tool previously credited the 6 in figure to CARS.',
  },
  {
    label: 'vehicle share of US flood deaths (CSU 1996-2023)',
    re: /put the vehicle-related share at (\d{2})%/,
    min: 60, max: 66,
    source: 'CSU/CIRA study of 2,461 US flood fatality records 1996-2023: 63% vehicle-related. ' +
      'NWS states "over half". The tool previously claimed 80%.',
  },
  {
    label: 'SUV single-vehicle rollover risk, upper bound',
    re: /an SUV at \d{2}-(\d{2})%/,
    min: 20, max: 25,
    source: 'NHTSA: ~10% rollover chance for a car in a single-vehicle crash, 14-23% for an SUV. ' +
      'The tool previously said a bare "3x higher", which reflects 2000-era fatal-crash data ' +
      '(36% vs 15%) rather than current single-vehicle risk',
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
  // Round 32 (2026-11-10), lane_words: sources read this session.
  {
    label: 'CDC NIOSH: hours awake compared with 0.05% BAC',
    re: /being awake for (\d{2}) hours is similar to having a BAC of 0\.05%/,
    min: 17, max: 17,
    source: 'CDC NIOSH work-hour training, module 3 (read 2026-11-10): "Being awake for 17 hours is similar to having a BAC of 0.05%."',
  },
  {
    label: 'CDC NIOSH: hours awake compared with 0.10% BAC',
    re: /being awake for (\d{2}) hours is similar to a BAC of 0\.10%/,
    min: 24, max: 24,
    source: 'CDC NIOSH work-hour training, module 3: "Being awake for 24 hours is similar to having a BAC of 0.10%."',
  },
  {
    label: 'IIHS roundabout conversions: injury-crash reduction, low end',
    re: /found (\d{2})% to 80% fewer injury crashes/,
    min: 72, max: 72,
    source: 'IIHS roundabouts topic page (read 2026-11-10): "Studies of intersections in the United States converted from traffic signals or stop signs to roundabouts have found reductions in injury crashes of 72%-80% and reductions in all crashes of 35%-47%". The tool used to say "fatal crashes by 90%".',
  },
  {
    label: 'IIHS roundabout conversions: injury-crash reduction, high end',
    re: /found 72% to (\d{2})% fewer injury crashes/,
    min: 80, max: 80,
    source: 'IIHS roundabouts topic page: 72%-80% fewer injury crashes.',
  },
  {
    label: 'fueleconomy.gov aggressive-driving penalty, highway low end',
    re: /by roughly (\d{2})% to 30% at highway speeds and 10% to 40% in stop-and-go traffic/,
    min: 15, max: 15,
    source: 'fueleconomy.gov/feg/driveHabits.jsp (read 2026-11-10): "It can lower your gas mileage by roughly 15% to 30% at highway speeds and 10% to 40% in stop-and-go traffic."',
  },
  {
    label: 'Maine provisional licence: the statute\'s "whichever occurs last" is stated (§2472(1))',
    re: /Maine law says 2 years or until you turn 21, whichever comes later/,
    min: null, max: null,
    source: 'Maine 29-A §2472(1), read 2026-11-10: "is a provisional license for a period of 2 years following the date of issue or until the holder attains 21 years of age, whichever occurs last." The manual and the BMV page say two years; the guide states both.',
  },
  {
    label: 'Maine manual: stop at least 10 feet from a white cane or guide dog',
    re: /stop at least (\d{2}) feet away and wait until the person is out of danger/,
    min: 10, max: 10,
    source: 'Maine Driver\'s License Manual Rev 4/24: "If you see anyone in the roadway with a white cane or guide dog, stop at least 10 feet away and wait until the person is out of danger."',
  },
  {
    label: 'texting multiplier is attributed to a truck-driver study',
    re: /a Virginia Tech study of truck drivers put it near 23×/,
    min: null, max: null,
    source: 'VTTI release 2009-07 (vtx.vt.edu/articles/2009/07/2009-571.html, read 2026-11-10), commercial vehicle study: "Text messaging made the risk of crash or near-crash event 23.2 times as high as non-distracted driving".',
  },
  // yl36 (round 36): traffic-light yellow and red clearance from the approach speed (rrYellowSeconds,
  // rrRedClearanceSeconds). The ITE kinematic terms as the FHWA Signal Timing Manual prints them.
  {
    label: 'yellow timing: perception-reaction time t (ITE)',
    re: /var RR_YELLOW_REACTION_SEC = ([\d.]+);/,
    min: 1.0, max: 1.0,
    source: 'FHWA Signal Timing Manual (FHWA-HOP-08-024) ch. 5, Equation 5-2: "the values of t = 1.0 s, a = 10 ft/s2, and Lv = 20 ft are often cited". CDOT 2024 Equation 1: "t = Perception-reaction time (seconds); set at 1.0 seconds."',
  },
  {
    label: 'yellow timing: deceleration a in ft/s2 (ITE)',
    re: /var RR_YELLOW_DECEL_FTPS2 = ([\d.]+);/,
    min: 10, max: 10,
    source: 'FHWA Signal Timing Manual Equation 5-2 (a = 10 ft/s2); CDOT 2024 Equation 1: "a = Deceleration rate (ft/sec2); set at 10 ft/sec2".',
  },
  {
    label: 'red clearance: vehicle length Lv in ft (ITE)',
    re: /var RR_RED_CLEAR_VEHICLE_FT = ([\d.]+);/,
    min: 20, max: 20,
    source: 'FHWA Signal Timing Manual Equation 5-2 (Lv = 20 ft); CDOT 2024 Equation 2: "L = Length of vehicle; set at 20 feet".',
  },
  {
    label: 'yellow timing: 1.47 ft/s per mph and the grade term 2(a + 32.2g)',
    re: /var v = 1\.47 \* Math\.max\(0, Number\(speedLimitMph\) \|\| 0\);[\s\S]{0,200}RR_YELLOW_REACTION_SEC \+ v \/ \(2 \* \(RR_YELLOW_DECEL_FTPS2 \+ 32\.2 \* g\)\)/,
    min: null, max: null,
    source: 'FHWA Signal Timing Manual Equation 5-2: CP = [t + 1.47v / 2(a + 32.2g)] + [(W + Lv) / 1.47v], g = percent grade / 100, uphill positive.',
  },
  {
    label: 'yellow timing: MUTCD minimum yellow in seconds',
    re: /return Math\.max\((\d), Math\.min\(\d, rrHalfSecondUp\(y\)\)\);/,
    min: 3, max: 3,
    source: 'MUTCD 11th Edition (Dec 2023) Section 4F.17 par. 13: "A yellow change interval should have a minimum duration of 3 seconds, and a maximum duration of 6 seconds."',
  },
  {
    label: 'yellow timing: MUTCD maximum yellow in seconds',
    re: /return Math\.max\(\d, Math\.min\((\d), rrHalfSecondUp\(y\)\)\);/,
    min: 6, max: 6,
    source: 'MUTCD 11th Edition Section 4F.17 par. 13 (see the entry above).',
  },
  {
    label: 'red clearance: MUTCD maximum in seconds',
    re: /return Math\.max\(1, Math\.min\((\d), rrHalfSecondUp\(r\)\)\);/,
    min: 6, max: 6,
    source: 'MUTCD 11th Edition Section 4F.17 par. 13: "a red clearance interval should have a duration not exceeding 6 seconds".',
  },
  {
    label: 'yellow and red clearance rounded UP to the nearest half second (MaineDOT)',
    re: /return Math\.ceil\(seconds \* (2) - 1e-9\) \/ 2;/,
    min: 2, max: 2,
    source: 'MaineDOT Traffic Analysis Guidelines, Traffic Signal Design and Operation (rev. 2 Aug 2020; file dated Aug 2025), item 8: "Yellow and Red clearance intervals shall be rounded up to the nearest half second."',
  },
  {
    label: 'every streamed light takes its yellow from rrSignalTiming',
    re: /yellowDur: isFlagger \? 2 : sigTiming \? sigTiming\.yellowDur : 3,/,
    min: null, max: null,
    source: 'yl36: the light builder in updateThreeScene; a hand-typed yellow here is what this lane removed (3 s on 40 mph roads).',
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
  // Some claims are PRESENCE checks, not ranges: the thing being protected is
  // an attribution or a qualifier that a later edit could quietly drop. Those
  // declare min === null and only need the anchor to still match.
  if (c.min === null && c.max === null) continue;
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
  // Round 32 (2026-11-10): corrected or unsourced figures removed by lane_words.
  { re: /Oct 1 ?[–-] ?May 1|October 1 to May 1/, note: 'the retired studded-tire window (29-A §1919 bans May 1 through October 1)' },
  { re: /70,000\+ moose/, note: 'the retired moose population figure (no current source; MDIFW: about 76,000 in 2012)' },
  { re: /stops in roughly 59 ft/, note: 'the retired winter-tire stopping figure (no primary source)' },
  { re: /% of CROSSING-PATH crashes/, note: 'the retired left-turn crash share (source not readable in round 32)' },
  { re: /fatal crashes by 90%/, note: 'the retired roundabout figure (IIHS: 72%-80% fewer injury crashes)' },
  { re: /about 525 ft to stop from 65 mph/, note: 'the retired FMCSA truck figure (source not readable in round 32)' },
  { re: /Slow down by at least 10 mph/, note: 'the retired rain answer (Maine manual: slow down 5 to 10 mph)' },
  { re: /Wait for water to equalize \(/, note: 'the retired flood-card advice to wait (Maine manual: get out through a window as soon as possible)' },
  { re: /can void your injury claim|Insurance adjusters screenshot/, note: 'retired insurance folklore on the post-crash card' },
  { re: /500[–-]700 reported moose/, note: 'the retired 500-700 collisions-per-year figure' },
  { re: /averages 3[–-]5 fatal moose crashes annually/, note: 'the retired "3-5 fatal annually" figure' },
  // Round 30 (2026-11-09): facts the content review found wrong against primary sources.
  { re: /NOT your home address/, note: 'the retired advice to withhold your address after a crash (29-A §2252 requires it)' },
  { re: /\(3-second rule minimum\)|3-second following rule|Use the 3-second rule/, note: 'the retired 3-second following rule (Maine manual: at least 4 seconds)' },
  { re: /"2-second rule" for following distance|The two-second rule should be increased/, note: 'the retired 2-second following rule (Maine manual: at least 4 seconds)' },
  { re: /Low beams illuminate ~350 ft|about 350 feet with low beams|Low beams reach about 350 feet/, note: 'the retired 350 ft low-beam range (Maine manual: about 250 feet)' },
  { re: /12-15 seconds ahead down the road/, note: 'the retired 12-15 second visual lead (Maine manual: 20 to 30 seconds)' },
  { re: /Automatic 275-day license suspension — often worse/, note: 'the retired adult refusal figure in the under-21 drill (§2472(4): 18 months)' },
  { re: /doubled-fine traffic violation|usually with doubled fines in work zones/, note: 'the retired claim that all work-zone fines double (§2075(2): speeding only)' },
  { re: /In Maine this counts as passing a school bus/, note: 'the retired claim that passing a moving bus on yellow is "passing a school bus" (§2308(2))' },
  { re: /with driver\\'s ed enrollment|6 months with NO violations|6 months \(no violations\)/, note: 'a retired permit condition (§1304: driver ed COMPLETED; 6 months + 70 hours, no "no violations" rule)' },
  { re: /full unrestricted at about 16 years and 9 months|You have a full Maine driver/, note: 'the retired "full licence" wording (§2472: provisional for 2 years)' },
  { re: /Hydroplaning risk above 45 mph|Hydroplane risk peaks at 45\+ mph|slow to 45 or below/, note: 'a retired 45 mph hydroplaning threshold (Maine manual: as low as 30 to 40 mph)' },
  { re: /18,000 tons/, note: 'the retired 18,000-ton freight-train figure' },
  { re: /through road always goes first|Car going UPHILL has right-of-way/, note: 'a retired right-of-way rule that is not Maine law (§2053)' },
  { re: /slow to about 45 mph/, note: 'the retired invented move-over speed (§2070(8)(B): careful and prudent)' },
  { re: /65-70 mph in Maine/, note: 'the retired "65-70 mph" interstate claim (§2073: up to 75, lower where posted)' },
  { re: /Non-drowsy options \(Claritin, Zyrtec\)/, note: 'the retired claim that Zyrtec is non-drowsy' },
];
for (const r of RETIRED) {
  if (r.re.test(src)) errors.push(r.note + ' is back in the source');
}

// -- Coverage: every statute the TOOL cites must be pinned somewhere in this
// file. On 2026-09-21 I committed a message claiming the statute audit was
// complete while §2308 was still cited and unpinned; the claim was only
// caught by diffing the two lists by hand afterwards. A claim about coverage
// belongs in the gate, not in a commit message.
//
// A citation counts as covered if the section number appears anywhere here --
// in a regex, a label or a source note -- since a deliberate "verified, no
// pin needed" decision is recorded as a source note. That makes this a
// prompt to decide, not a demand for a range check on every section.
const SECTION_RE = /§\d+(?:-[A-Z])?/g;
const citedSections = new Set(src.match(SECTION_RE) || []);
const selfText = fs.readFileSync(__filename, 'utf8');
// Strip this block before scanning it. Belt-and-braces: nothing in here
// names a real section today, and removing the strip still catches an
// unpinned citation (verified). It matters only if someone later writes a
// literal section number into this block -- an example in a comment, say --
// which would then mark that section covered without pinning anything.
const gateText = selfText.replace(/const SECTION_RE[\s\S]*?const uncovered[^;]*;/, '');
const coveredSections = new Set(gateText.match(SECTION_RE) || []);
const uncovered = [...citedSections].filter((x) => !coveredSections.has(x)).sort();
if (uncovered.length) {
  errors.push('statutes cited by the tool but not mentioned anywhere in this gate: ' +
    uncovered.join(', ') + '\n      Verify each against the statute itself (check it is not ' +
    'REPEALED -- two of this tool\'s citations were), then either pin a value or record a ' +
    '"verified, no pin needed" source note. Do not claim audit coverage in a commit message ' +
    'that this check cannot back up.');
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
