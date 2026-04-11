// ═══════════════════════════════════════════
// stem_tool_roadready.js — RoadReady: Driver's Ed & Automotive Science Lab
// Teaches US driver's ed curriculum (Maine state focus), fuel efficiency physics,
// stopping distance, and real-time driving via pseudo-3D raycaster simulator.
// Canvas-based rendering, no external dependencies.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('roadReady'))) {

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // SECTION 1: VEHICLES — Real specs for accurate physics
  // ─────────────────────────────────────────────────────────
  // Each vehicle has: mass (kg), drag coefficient Cd, frontal area A (m²),
  // engine power (kW), max torque, fuel capacity, base MPG, type.
  // These feed directly into the drag/friction/MPG physics.

  var VEHICLES = [
    {
      id: 'sedan', name: 'Compact Sedan', icon: '🚗', type: 'gas',
      mass: 1450, cd: 0.28, area: 2.2, powerKW: 110, fuelCap: 48,
      cityMPG: 32, hwyMPG: 42, tank: 'gasoline',
      desc: 'A fuel-efficient 4-door compact — the most common US driving test vehicle. Manual or automatic.',
      tip: 'Best all-around learning vehicle. Low center of gravity = stable. Good visibility.'
    },
    {
      id: 'suv', name: 'Midsize SUV', icon: '🚙', type: 'gas',
      mass: 1950, cd: 0.35, area: 2.9, powerKW: 180, fuelCap: 68,
      cityMPG: 22, hwyMPG: 28, tank: 'gasoline',
      desc: 'Taller ride height, more cargo, but worse aerodynamics and higher rollover risk in sharp turns.',
      tip: 'Higher blind spots. Longer stopping distance due to mass. Cd × A ≈ 1.02 m² — almost 50% more drag than sedan.'
    },
    {
      id: 'truck', name: 'Pickup Truck', icon: '🛻', type: 'gas',
      mass: 2350, cd: 0.42, area: 3.2, powerKW: 220, fuelCap: 100,
      cityMPG: 18, hwyMPG: 24, tank: 'gasoline',
      desc: 'Full-size pickup. Tall cab, boxy shape = poor aero. Long wheelbase = wide turning radius.',
      tip: 'Watch for bed load affecting handling. Large blind spots. Tailgate-up improves MPG slightly (turbulence dome).'
    },
    {
      id: 'ev', name: 'Electric Sedan', icon: '⚡', type: 'electric',
      mass: 1850, cd: 0.23, area: 2.3, powerKW: 220, fuelCap: 75,
      cityMPG: 130, hwyMPG: 115, tank: 'battery_kwh',
      desc: 'Battery electric. Instant torque, regenerative braking, near-zero idle waste. Very low Cd.',
      tip: 'Regen braking recaptures ~70% of braking energy. Efficiency drops less at low speed than gas cars.'
    },
    {
      id: 'hybrid', name: 'Hybrid Compact', icon: '🔋', type: 'hybrid',
      mass: 1550, cd: 0.26, area: 2.2, powerKW: 90, fuelCap: 45,
      cityMPG: 55, hwyMPG: 52, tank: 'gasoline',
      desc: 'Gas engine + electric motor. Regen braking captures energy usually lost as heat. Shines in city driving.',
      tip: 'City MPG often beats highway — opposite of gas cars! Stop-and-go is where hybrids win.'
    },
    {
      id: 'school_bus', name: 'School Bus', icon: '🚌', type: 'diesel',
      mass: 11000, cd: 0.7, area: 7.5, powerKW: 200, fuelCap: 380,
      cityMPG: 7, hwyMPG: 9, tank: 'diesel',
      desc: 'Class C bus. Requires CDL in most states. Teaches bus protocol — when YOU must stop for a stopped bus.',
      tip: 'Red flashing lights + extended stop arm = ALL traffic must stop (both directions on undivided roads).'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2: MAINE STATE DRIVER'S ED RULES
  // ─────────────────────────────────────────────────────────
  // Maine-specific rules the user specifically asked for, plus federal baseline.
  // Source: Maine BMV Driver's Manual (2024 edition), 29-A M.R.S.

  var MAINE_RULES = {
    permitAge: 15,
    intermediateAge: 16,
    fullLicenseAge: 16.75,
    permitHoldPeriod: '6 months (no violations)',
    supervisedHours: 70,
    nightHours: 10,
    passengers: 'No passengers under 20 for first 9 months of intermediate license (except family)',
    curfew: 'Midnight to 5 AM for intermediate drivers (first 9 months)',
    phoneBan: 'ALL handheld use banned statewide (2019). First offense: $85.',
    textingBan: 'Total ban, primary enforcement. $250 first offense.',
    moveOver: 'Must move over or slow down for stopped emergency, utility, and roadside assistance vehicles with lights flashing.',
    headlights: 'Required when wipers are on (2005 law). Sunset to sunrise. During low visibility.',
    studSnowTires: 'Legal Oct 1 – May 1. Studded tires help on ice but wear pavement in summer.',
    winterRules: [
      'Clear ALL snow/ice from your vehicle before driving — including roof. $137 fine if snow falls and causes a crash.',
      'Black ice forms on bridges and shaded spots first (no ground heat underneath).',
      'Brake BEFORE turns on snow — never during. Steer with the skid if you slide.',
      'Keep gas tank at least half full in winter (prevents fuel line freeze + emergency reserve).',
      'Carry a winter kit: blanket, shovel, sand/kitty litter, flashlight, water, jumper cables.'
    ],
    mooseWarning: 'Maine has 70,000+ moose. Strike risk highest at dawn/dusk May–Oct. Moose ≈ 1,000 lbs at windshield height — deadly. Scan road edges. Do NOT swerve — brake straight.',
    deerWarning: 'Deer crossings peak Oct–Dec (rut). If one crosses, expect another behind it.',
    coastalFog: 'Coastal fog common spring/summer. Use LOW beams (high beams reflect back). Fog lights if equipped. Reduce speed.',
    seatbelt: 'Primary enforcement. All occupants. $50 first offense. Child seat required under 8 OR under 80 lbs.',
    bac: '0.08 adult / 0.02 under 21 / 0.04 CDL. Maine has an implied consent law — refusing BAC test = automatic suspension.',
    rightTurnRed: 'Permitted after full stop unless posted otherwise.',
    schoolBus: 'Stop for stopped bus with flashing red lights on undivided roads (both directions). On divided highway, only traffic behind must stop.',
    railroad: 'All school buses, large trucks with hazmat must stop at all railroad crossings.',
    pedestrian: 'Must yield to pedestrians in marked AND unmarked crosswalks at intersections.',
    bicycleDistance: 'Must give cyclists at least 3 feet when passing (2015 law).',
  };

  // (US federal baseline rules are covered inline in the permit bank + Maine rules.)

  // ─────────────────────────────────────────────────────────
  // SECTION 3: ROAD SIGNS — Shape/color semantics
  // ─────────────────────────────────────────────────────────
  // The visual system is how drivers recognize meaning at a glance.
  // Color + shape = category, even before you read the text.

  var SIGN_CATEGORIES = [
    {
      category: 'Regulatory',
      color: '#ffffff',
      colorName: 'White background, black text',
      meaning: 'MUST do. Speed limits, stops, yields, lane use.',
      examples: ['Stop (red octagon)', 'Yield (red triangle)', 'Speed Limit 55', 'No U-Turn', 'Do Not Enter (red circle)']
    },
    {
      category: 'Warning',
      color: '#fcd34d',
      colorName: 'Yellow diamond',
      meaning: 'MIGHT happen. Curves, intersections, pedestrians, animals ahead.',
      examples: ['Curve ahead', 'Pedestrian crossing', 'Deer crossing', 'Slippery when wet', 'Two-way traffic ahead']
    },
    {
      category: 'Construction',
      color: '#f97316',
      colorName: 'Orange diamond',
      meaning: 'Temporary — work zone. Fines double in work zones in most states.',
      examples: ['Road work ahead', 'Flagger ahead', 'Lane closed', 'Detour', 'Workers present']
    },
    {
      category: 'School Zone',
      color: '#facc15',
      colorName: 'Fluorescent yellow-green pentagon',
      meaning: 'Children present. Reduced speed, school crossings.',
      examples: ['School crossing', 'School zone ahead', 'School bus stop ahead']
    },
    {
      category: 'Guide',
      color: '#10b981',
      colorName: 'Green rectangle',
      meaning: 'Directions, destinations, distances.',
      examples: ['Exit 23 — Portland', 'Next services 12 mi', 'Rest area 3 mi']
    },
    {
      category: 'Services',
      color: '#2563eb',
      colorName: 'Blue rectangle',
      meaning: 'Motorist services — gas, food, lodging, hospitals.',
      examples: ['H (Hospital)', 'Gas', 'Food', 'Lodging', 'Rest stop']
    },
    {
      category: 'Recreation',
      color: '#92400e',
      colorName: 'Brown rectangle',
      meaning: 'Parks, campgrounds, scenic areas, historic sites.',
      examples: ['State park', 'Scenic overlook', 'Acadia N.P. 8 mi']
    },
    {
      category: 'Railroad',
      color: '#fef3c7',
      colorName: 'Yellow circle (advance) + white X (at crossing)',
      meaning: 'Tracks ahead or at crossing. STOP when lights flash.',
      examples: ['RR Crossing advance', 'Crossbuck X at tracks', 'Multi-track warning']
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4: PERMIT TEST BANK
  // ─────────────────────────────────────────────────────────
  // Mirrors Maine BMV written test format: 40 questions, must score 80% (32 correct).
  // Mix of rules, signs, signals, safety, Maine specifics, and physics-informed safety.

  var PERMIT_BANK = [
    // ── Rules of the road ──
    { q: 'At a 4-way stop intersection, who has the right-of-way when two vehicles arrive at the same time?', a: ['The larger vehicle', 'The vehicle on the right', 'The vehicle going straight', 'Whoever honks first'], correct: 1, exp: 'When two vehicles arrive simultaneously at a 4-way stop, the vehicle on the RIGHT has the right-of-way.' },
    { q: 'A solid yellow line on your side of the centerline means:', a: ['You may pass if safe', 'No passing', 'Lane ends', 'Bike lane'], correct: 1, exp: 'Solid yellow = NO passing from your side. Broken yellow = passing allowed when safe.' },
    { q: 'What does a flashing red traffic light mean?', a: ['Slow down', 'Stop, then proceed when safe (same as a stop sign)', 'Caution — proceed without stopping', 'Signal is broken, keep going'], correct: 1, exp: 'A flashing red light has the same meaning as a stop sign: come to a complete stop, then proceed when safe.' },
    { q: 'What does a flashing yellow traffic light mean?', a: ['Stop and wait', 'Slow down and proceed with caution', 'Same as a stop sign', 'Prepare to stop for a red light'], correct: 1, exp: 'Flashing yellow means slow down and proceed with caution — you have the right-of-way but watch for cross traffic.' },
    { q: 'The speed limit in a Maine school zone when children are present is typically:', a: ['15 mph', '25 mph unless otherwise posted', '35 mph', '45 mph'], correct: 1, exp: 'Default school zone limit in Maine is 15 mph when children are present and signs are flashing; otherwise posted speeds apply (usually 25 mph).' },
    { q: 'When approaching a school bus with flashing red lights and extended stop arm on a two-lane road, you must:', a: ['Slow down and pass carefully', 'Stop only if on the same side as the bus', 'Stop — traffic from both directions must stop', 'Honk to warn the driver'], correct: 2, exp: 'On undivided roads, ALL traffic must stop for a school bus with flashing red lights, regardless of direction.' },
    { q: 'In Maine, the legal BAC limit for drivers 21 and older is:', a: ['0.05%', '0.08%', '0.10%', '0.02%'], correct: 1, exp: 'Maine follows the federal standard: 0.08% BAC for adults 21+. Under 21 is 0.02% (zero tolerance). CDL is 0.04%.' },
    { q: 'Maine law requires headlights to be on:', a: ['Only at night', 'When windshield wipers are in use', 'Only in fog', 'Only on highways'], correct: 1, exp: 'Maine requires headlights whenever wipers are in use (2005 law) — plus sunset to sunrise and in low visibility.' },
    { q: 'You are approaching a yield sign. You should:', a: ['Come to a full stop', 'Slow down and give right-of-way to cross traffic', 'Maintain speed', 'Honk to warn others'], correct: 1, exp: 'Yield = slow down, give right-of-way, stop ONLY if needed. Different from a stop sign (always stop).' },
    { q: 'You are in a roundabout. A car enters from an incoming road. You should:', a: ['Stop to let them in', 'Speed up to avoid them', 'Continue — you have the right-of-way', 'Honk and brake'], correct: 2, exp: 'Vehicles already in the roundabout have the right-of-way. Entering vehicles must yield.' },

    // ── Stopping distance / physics-informed safety ──
    { q: 'Your total stopping distance is the sum of:', a: ['Only the distance while braking', 'Reaction distance + braking distance', 'Speed × time', 'Tire grip × weight'], correct: 1, exp: 'Total stopping = REACTION distance (while you perceive + react, typically 1.5 s) + BRAKING distance (tires slowing the car).' },
    { q: 'If you double your speed, your braking distance approximately:', a: ['Doubles', 'Stays the same', 'Quadruples (4× longer)', 'Triples'], correct: 2, exp: 'Braking distance grows with speed SQUARED (v²). Double the speed = 4× the braking distance. This is why highway speeds need so much more room.' },
    { q: 'At 60 mph, how far do you travel in one second?', a: ['30 feet', '60 feet', '88 feet', '120 feet'], correct: 2, exp: '60 mph = 88 feet per second. Memorize this! A 1.5-second reaction alone covers ~132 feet — almost half a football field.' },
    { q: 'Safe following distance at highway speeds is measured in:', a: ['Car lengths (two cars)', 'Seconds (3-second rule minimum)', 'Feet (always 50)', 'Meters (always 10)'], correct: 1, exp: 'Use the 3-second rule (4+ in bad weather). Pick a fixed point, count after the car ahead passes it — you should reach it no sooner than 3 seconds.' },
    { q: 'On wet pavement, your stopping distance:', a: ['Is the same as dry', 'Is about 30-50% longer', 'Is about half', 'Depends only on brake age'], correct: 1, exp: 'Wet roads cut friction by ~30-50%. Ice can cut it by 90%. Friction coefficient (μ) directly determines minimum braking distance.' },
    { q: 'You hit a patch of ice and start to skid. You should:', a: ['Slam the brakes and hold', 'Steer sharply the other way', 'Ease off the gas and steer gently in the direction you want to go', 'Pull the emergency brake'], correct: 2, exp: 'On a skid: EASE off gas (do not brake hard), steer smoothly in the direction you want the front of the car to go. Braking locks wheels and removes steering.' },

    // ── Maine winter and wildlife ──
    { q: 'In Maine, what should you do if a moose runs onto the road in front of you?', a: ['Swerve sharply', 'Brake hard while steering straight', 'Speed up to pass before it', 'Flash your high beams and accelerate'], correct: 1, exp: 'Brake HARD while keeping the wheel straight. Swerving risks rollover or hitting something worse. A moose is ~1,000 lbs at windshield height — deadly impact.' },
    { q: 'When is the risk of moose and deer strikes highest in Maine?', a: ['Midday', 'Dawn and dusk, especially May-December', 'Only at night', 'Only in winter'], correct: 1, exp: 'Dawn and dusk are peak risk because animals are most active and visibility is worst. Deer peak Oct-Dec (rut); moose active May-Oct.' },
    { q: 'Black ice is most likely to form on:', a: ['Sunny, open roads', 'Bridges and shaded areas', 'Inside tunnels', 'Gravel roads'], correct: 1, exp: 'Bridges freeze first — no ground heat underneath. Shaded spots lose warmth fast. Black ice is nearly invisible.' },
    { q: 'In Maine, studded snow tires are legal:', a: ['All year', 'October 1 to May 1', 'Only in January and February', 'Never'], correct: 1, exp: 'Maine allows studded tires Oct 1 – May 1. They help on ice but damage pavement in warm months.' },
    { q: 'Before driving in winter, Maine law requires you to:', a: ['Warm the engine for 10 minutes', 'Clear ALL snow and ice from the vehicle, including the roof', 'Install chains', 'Use only winter windshield fluid'], correct: 1, exp: 'Falling snow/ice from your roof can cause crashes. Maine fines drivers whose snow flies off and damages other vehicles.' },

    // ── Signs ──
    { q: 'An eight-sided (octagonal) red sign always means:', a: ['Yield', 'Stop', 'Do not enter', 'One way'], correct: 1, exp: 'Octagon = STOP. The shape is recognizable even in fog or when lettering is obscured. It is the only octagonal sign.' },
    { q: 'A diamond-shaped yellow sign means:', a: ['Regulatory — must obey', 'Warning of possible hazard ahead', 'Construction zone', 'Guide / direction'], correct: 1, exp: 'Yellow diamond = WARNING. Tells you what MIGHT happen ahead (curve, pedestrian, animal crossing, etc.).' },
    { q: 'An orange diamond sign means:', a: ['Construction or work zone', 'Scenic route', 'Hospital ahead', 'Railroad'], correct: 0, exp: 'Orange = temporary construction/work zone warning. Fines are typically DOUBLED in work zones.' },
    { q: 'A fluorescent yellow-green pentagon sign indicates:', a: ['Hospital', 'School zone or school crossing', 'Rest area', 'Weather warning'], correct: 1, exp: 'Yellow-green pentagon = school zone / school crossing. High-visibility color chosen specifically for child safety.' },
    { q: 'A green rectangular sign typically shows:', a: ['Warnings', 'Regulations', 'Directions, exits, and destinations', 'Services'], correct: 2, exp: 'Green = guide signs — exits, destinations, mileage. Blue = services (gas, food, lodging, hospital).' },

    // ── Distracted / impaired ──
    { q: 'Texting while driving is:', a: ['Legal in Maine on rural roads', 'Illegal everywhere in Maine (primary enforcement)', 'Only illegal for under-21 drivers', 'Legal when stopped at a red light'], correct: 1, exp: 'Maine bans ALL handheld phone use and texting. Primary enforcement means police can pull you over just for this. Even at a red light.' },
    { q: 'Reaction time is typically increased by how much at legally drunk levels?', a: ['Not at all', 'By 0-10%', 'By 30-50% or more', 'It improves'], correct: 2, exp: 'Alcohol slows reaction time dramatically — 0.08% BAC can double your reaction distance. Drugs, fatigue, and phones all do the same.' },
    { q: 'You are fatigued on a long drive. The safest option is:', a: ['Drink more coffee and continue', 'Roll the window down and turn up music', 'Pull over at a rest area and nap 15-20 minutes', 'Drive faster to get home sooner'], correct: 2, exp: 'Caffeine and music only mask fatigue. A short nap at a rest area is proven to restore alertness. Drowsy driving is as dangerous as drunk driving.' },

    // ── Fuel efficiency ──
    { q: 'Which driving habit WASTES the most fuel?', a: ['Cruise control on flat highway', 'Coasting to stoplights', 'Jackrabbit starts and hard braking', 'Drafting behind trucks'], correct: 2, exp: 'Rapid acceleration and hard braking can lower MPG by 15-40%. Every time you brake hard, you turn kinetic energy into heat — wasted fuel.' },
    { q: 'Aerodynamic drag increases with speed:', a: ['Linearly (double speed = double drag)', 'Squared (double speed = 4× drag)', 'Not at all', 'Only above 100 mph'], correct: 1, exp: 'Drag force ∝ v². Double your speed and aerodynamic drag quadruples. That is why highway MPG drops sharply above 60 mph.' },
    { q: 'At what approximate speed does aerodynamic drag begin to dominate over rolling resistance for most cars?', a: ['15 mph', '35-50 mph', '80 mph', 'Never'], correct: 1, exp: 'Below ~40 mph rolling resistance dominates. Above it, aerodynamic drag takes over. Peak MPG is usually 45-55 mph for gasoline cars.' },
    { q: 'Why do hybrid cars often get BETTER city MPG than highway MPG?', a: ['They use more gas on highways', 'Regenerative braking recaptures energy in stop-and-go', 'City roads are smoother', 'The battery only works at low speed'], correct: 1, exp: 'Regen braking recovers energy that gas cars waste as brake heat. The more you stop, the more a hybrid wins. Opposite of gas cars.' },
    { q: 'Which of these is the LEAST effective way to save fuel?', a: ['Keeping tires properly inflated', 'Removing a roof rack you are not using', 'Idling with the AC off to "warm up" for 5 minutes', 'Combining errands into one trip'], correct: 2, exp: 'Idling to warm up wastes fuel and does almost nothing for modern engines. 30 seconds is enough. Cold engines warm up faster while DRIVING gently.' },

    // ── Maine teen licensing ──
    { q: 'A Maine learner\'s permit requires you to be at least:', a: ['14', '15', '16', '18'], correct: 1, exp: 'Maine allows learner permits starting at age 15 with driver\'s ed enrollment.' },
    { q: 'Maine teen drivers (under 18) must log how many supervised hours before getting an intermediate license?', a: ['10', '35', '70', '100'], correct: 2, exp: 'Maine requires 70 hours of supervised driving, including 10 at night, before you can take the road test.' },
    { q: 'A Maine intermediate driver (first 9 months) may NOT:', a: ['Drive at any time of day', 'Carry passengers under 20 (except immediate family)', 'Drive on interstates', 'Drive alone'], correct: 1, exp: 'For the first 9 months of intermediate license: no passengers under 20 except family, and no driving midnight-5 AM except for work/school/emergency.' },

    // ── General safety and mechanical ──
    { q: 'The 3-second rule is used to determine:', a: ['Maximum legal speed', 'Minimum safe following distance', 'Reaction time after braking', 'Turn signal duration'], correct: 1, exp: '3-second rule: pick a fixed landmark. When the car ahead passes it, count "1-Mississippi, 2-Mississippi, 3-Mississippi." You should reach it no sooner. Increase to 4+ in rain/snow.' },
    { q: 'Your right front tire drops off the pavement edge. You should:', a: ['Jerk the wheel left immediately', 'Hold the wheel firmly, ease off the gas, and gradually return when safe', 'Slam the brakes', 'Speed up to climb back up'], correct: 1, exp: 'Jerking left can cause you to cross oncoming traffic. Grip firmly, ease off gas, wait until the road edge is safe to re-enter, then steer gently back.' },
    { q: 'In Maine, you must give cyclists at least how much space when passing?', a: ['1 foot', '2 feet', '3 feet', '6 feet'], correct: 2, exp: 'Maine law (2015) requires a minimum 3 feet of space when passing a cyclist. Crossing a double yellow to do so is legal if safe.' },
    { q: 'You approach a railroad crossing and the gates begin to lower as you arrive. You should:', a: ['Go around the gates quickly', 'Stop and wait — never drive around lowered gates', 'Speed up to beat the train', 'Honk and proceed'], correct: 1, exp: 'NEVER go around lowered gates. Trains can take a mile to stop. A stuck gate means call the number on the crossbuck or 911.' },
    { q: 'The primary purpose of antilock brakes (ABS) is to:', a: ['Stop the car faster on all surfaces', 'Allow you to steer while braking hard', 'Replace the handbrake', 'Prevent tire wear'], correct: 1, exp: 'ABS pulses the brakes so wheels do not lock. Locked wheels cannot steer. ABS may not always stop you faster, but it keeps the steering alive.' },
    { q: 'When driving in heavy fog, you should use:', a: ['High beams', 'Low beams and/or fog lights', 'Hazard lights while moving', 'Parking lights only'], correct: 1, exp: 'High beams reflect off fog and reduce visibility. Use LOW beams and fog lights. Hazards while driving are illegal in most states — reserved for actual hazards.' },
    { q: 'You are parking uphill next to a curb. You should turn the front wheels:', a: ['Toward the curb', 'Away from the curb', 'Straight', 'It does not matter'], correct: 1, exp: 'UPHILL with curb: wheels AWAY (if brakes fail, car rolls INTO curb). DOWNHILL: wheels TOWARD curb. No curb: wheels toward the road edge.' },
    { q: 'The safest way to enter a highway from an on-ramp is to:', a: ['Stop at the end of the ramp and merge slowly', 'Match the speed of traffic and merge on a gap', 'Force your way in at any speed', 'Use the shoulder to accelerate'], correct: 1, exp: 'Accelerate on the ramp to match highway speed, find a gap, and merge smoothly. Stopping on a ramp is dangerous and often illegal.' },
    // ── Additional questions ──
    { q: 'You see a triangle-shaped sign with a red border. It means:', a: ['Stop', 'Yield', 'Construction', 'School zone'], correct: 1, exp: 'A downward-pointing triangle with a red border is the only YIELD sign. Slow, look, give right-of-way, stop only if necessary.' },
    { q: 'When merging onto a highway, you should signal:', a: ['Only if other cars are nearby', 'Always — at least 100 feet before the merge', 'Never — it confuses other drivers', 'Only at night'], correct: 1, exp: 'Always signal merges and lane changes at least 100 feet before. It is the law and it tells other drivers your intent.' },
    { q: 'Hydroplaning is most likely to happen at speeds above:', a: ['10 mph', '25 mph', '35 mph in heavy rain or standing water', '70 mph'], correct: 2, exp: 'Hydroplaning starts as low as 35 mph in heavy rain or standing water. Tires lose contact and ride on a film of water. If it happens: ease off gas, do not brake or steer hard, wait for tires to regain grip.' },
    { q: 'You are driving and you suddenly have a tire blowout. You should:', a: ['Slam the brakes', 'Grip the wheel firmly, ease off the gas, steer straight, slow gradually', 'Pull the parking brake', 'Speed up to maintain control'], correct: 1, exp: 'Sudden braking after a blowout can cause loss of control. Grip wheel, hold straight, ease off gas, let the car slow naturally, then pull off when safe.' },
    { q: 'When parking on a downhill grade with a curb, your front wheels should point:', a: ['Toward the curb', 'Away from the curb', 'Straight ahead', 'It does not matter'], correct: 0, exp: 'DOWNHILL with curb: turn wheels TOWARD curb. If brakes fail, the curb stops the car. UPHILL with curb: turn wheels AWAY from curb.' },
    { q: 'Two-second rule, three-second rule, four-second rule. The number is the minimum:', a: ['Distance in car lengths', 'Time gap to the car ahead', 'Brake-pad reaction time', 'Time to wait at a stop sign'], correct: 1, exp: 'These rules count SECONDS of following distance to the car ahead. Three seconds is the minimum on dry roads, four+ in rain, six+ in snow or fog.' },
    { q: 'A driver in front of you stops suddenly for a deer. The best way to avoid hitting them is:', a: ['Swerve into the next lane immediately', 'Have already been following at 3+ seconds and brake firmly', 'Slam on the horn', 'Speed up and pass'], correct: 1, exp: 'Crashes are avoided BEFORE they happen — by following far enough behind that you have time and room to brake. Reaction distance is half the equation; following distance is the other half.' },
    { q: 'When you see flashing blue or red lights of an emergency vehicle behind you, you must:', a: ['Speed up to clear the road', 'Brake immediately', 'Pull to the right and stop until it passes', 'Continue at the same speed'], correct: 2, exp: 'Pull RIGHT and STOP. Even if the emergency vehicle is going the other way on a divided highway, on undivided roads you stop. This is law in all 50 states.' },
    { q: 'You approach a school bus on a 4-lane DIVIDED highway. The bus is on the OTHER side with red flashing lights. You must:', a: ['Stop completely', 'Slow down but proceed', 'Continue at normal speed (you do not need to stop)', 'Speed up'], correct: 2, exp: 'On a DIVIDED highway, only traffic on the SAME side as the bus must stop. On undivided roads, both directions stop.' },
    { q: 'In an emergency stop with ABS brakes, you should:', a: ['Pump the brake pedal rapidly', 'Press and HOLD the brake pedal firmly while steering', 'Apply gentle pressure', 'Use the parking brake'], correct: 1, exp: 'ABS does the pumping for you. Press and HOLD firmly. You will feel pulsing in the pedal — that is normal. The pulsing means it is working. Steer through the stop.' },
    { q: 'A "no zone" refers to:', a: ['A speed-limit-free area', 'The blind spots around large trucks', 'A no-passing zone', 'A school zone at night'], correct: 1, exp: 'Large trucks have huge blind spots called "no zones" — directly behind, directly in front, and along both sides. If you can\'t see the driver\'s mirrors, they can\'t see you.' },
    { q: 'You can be charged with DUI in Maine for driving while impaired by:', a: ['Alcohol only', 'Alcohol and illegal drugs only', 'Alcohol, illegal drugs, AND prescription/over-the-counter medications that impair', 'Only if BAC is over 0.08'], correct: 2, exp: 'DUI laws cover ANY substance that impairs you — including legal prescription medications and OTC drugs (like some allergy meds). Read your medication labels.' },
    { q: 'Cell phone use while driving in Maine is:', a: ['Always legal', 'Banned for handheld; hands-free is OK for adults', 'Banned only for teens', 'Banned only at school zones'], correct: 1, exp: 'Maine bans ALL handheld phone use. Hands-free is legal for adults but banned for drivers under 18 with intermediate licenses. Texting is fully banned for everyone.' },
    { q: 'When approaching a stopped emergency vehicle, tow truck, or roadside worker with lights flashing, Maine law says you must:', a: ['Continue at posted speed', 'Honk and pass quickly', 'Move over one lane if safe, or slow down significantly', 'Stop completely'], correct: 2, exp: 'Maine\'s "Move Over" law requires drivers to change lanes if safe, or slow down. Roadside workers die every year from drivers passing too close.' }
  ];

  console.log('[RoadReady] Loaded ' + PERMIT_BANK.length + ' permit questions');

  // ─────────────────────────────────────────────────────────
  // SECTION 5: LESSONS — Physics and safety deep-dives
  // ─────────────────────────────────────────────────────────

  var LESSONS = {
    drag: {
      title: 'Aerodynamic Drag: Why Highway MPG Drops',
      icon: '💨',
      content: "Every car pushes air out of the way as it moves. The force it takes to do that is DRAG. The key insight: drag grows with the square of speed. Double your speed and drag becomes 4× stronger. At 30 mph, drag is small. At 70 mph, it is the dominant force working against you. This is why most cars get their best MPG around 45-55 mph and lose efficiency sharply above that. Engineers spend huge effort shrinking 'Cd × A' — the drag coefficient times frontal area. A sleek EV might have Cd × A ≈ 0.53 m². A boxy pickup is ≈ 1.35 m² — almost three times more drag at the same speed.",
      formula: 'F_drag = ½ · ρ · v² · Cd · A',
      variables: 'ρ = air density (1.225 kg/m³ at sea level), v = speed in m/s, Cd = drag coefficient, A = frontal area in m²',
      practice: 'Try the simulator: drive a sedan at 55 mph then 75 mph. Watch the MPG readout drop sharply. That drop is almost entirely drag.'
    },
    rolling: {
      title: 'Rolling Resistance: Tire Friction with the Road',
      icon: '🛞',
      content: "Tires are flexible. They squish at the contact patch, unsquish at the back — and some energy is lost to heat every rotation. That loss is called ROLLING RESISTANCE. Unlike drag, it barely changes with speed. It depends on: tire inflation (underinflated = huge penalty, lose ~0.3% MPG per 1 PSI low), tire compound (low-rolling-resistance LRR tires save ~4-8% fuel), road surface (asphalt < concrete < gravel), and vehicle weight. Below about 40 mph, rolling resistance is the DOMINANT force slowing you down. Above 40 mph, aerodynamic drag takes over.",
      formula: 'F_roll = Crr · m · g',
      variables: 'Crr ≈ 0.010-0.015 for modern tires, m = mass in kg, g = 9.81 m/s²',
      practice: 'Keep tires inflated to the PSI on the door sticker (not the sidewall — sidewall is the MAX). A $5 tire gauge saves real fuel money.'
    },
    stopping: {
      title: 'Stopping Distance: Reaction + Braking',
      icon: '🛑',
      content: "When you need to stop, two things happen. First, REACTION TIME (typically 1.5 seconds for an alert driver). During that time the car keeps moving at full speed — at 60 mph, that is 132 feet before the brakes even touch. Second, BRAKING DISTANCE — the tires slowing you down. Braking distance grows with v² (speed squared). The physics: KE = ½mv². Kinetic energy scales with the square of speed. At double the speed, you have 4× the energy to dissipate into heat through the brakes. This is why 'just a little faster' is so dangerous. At 30 mph total stopping distance is ≈75 ft. At 60 mph it is ≈240 ft. At 80 mph it is ≈380 ft — longer than a football field.",
      formula: 'd_total = v·t_reaction + v² / (2·μ·g)',
      variables: 't_reaction ≈ 1.5 s, μ (friction coefficient) ≈ 0.7 dry / 0.4 wet / 0.1 ice, g = 9.81 m/s²',
      practice: 'Use the simulator Stopping Distance Lab — watch how friction changes when you switch weather from dry to rain to snow.'
    },
    kinetic: {
      title: 'Kinetic Energy and Why Crashes Hurt More at Speed',
      icon: '💥',
      content: "A moving car stores energy — kinetic energy. KE = ½mv². Notice the v-squared again. At 30 mph a car has some kinetic energy. At 60 mph it has FOUR TIMES that. At 90 mph it has NINE TIMES. Every bit of that has to go somewhere in a crash — into crumple zones, airbags, and unfortunately, into people. This is the single biggest reason speed limits exist. Modern crumple zones are designed for ~35 mph impacts. Above that, the occupants start to see forces that human bodies cannot survive. Seatbelts, airbags, and crumple zones together cut fatality risk by ~75% at legal speeds — but they cannot fight physics forever.",
      formula: 'KE = ½ · m · v²',
      variables: 'm = mass (kg), v = velocity (m/s). 1 mph = 0.447 m/s',
      practice: 'Calculate it: a 1500 kg car at 60 mph (27 m/s) has KE ≈ 547,000 joules. That is equivalent to a ton of TNT-scale energy release on impact.'
    },
    mpg: {
      title: 'MPG Math: What Your Fuel Gauge Is Really Telling You',
      icon: '⛽',
      content: "Miles per gallon (MPG) is a ratio — distance divided by fuel used. Higher = better. But MPG hides something important: the relationship is NON-LINEAR. Going from 15 to 20 MPG saves more fuel than going from 35 to 40 MPG, even though both are a 5 MPG improvement. That is why gallons-per-100-miles (GPM) is sometimes a better metric. Europe uses L/100km for exactly this reason. The things that move your MPG up or down are: speed (sweet spot 45-55 mph), aggression (jackrabbit starts = -15 to -40%), tire pressure (low = -3 to -10%), AC use (-5 to -10% at low speed, negligible at highway), roof racks (-10 to -25%), cargo weight (-1% per 100 lbs), and engine condition.",
      formula: 'MPG = distance / fuel_used  |  GPM = 100 / MPG',
      variables: 'GPM = gallons per 100 miles. Lower GPM = better. The metric engineers actually prefer.',
      practice: 'In Hypermiling Challenge mode, the sim tracks your actual MPG vs the EPA rating. Try to beat the sticker through smooth driving.'
    },
    friction: {
      title: 'Tire Friction: The Limit of Everything You Can Do',
      icon: '🏁',
      content: "Your tires are the only thing connecting you to the road. The FRICTION COEFFICIENT (μ, 'mu') between tire and road determines: how hard you can brake, how sharply you can turn, and how fast you can accelerate without slipping. Dry pavement: μ ≈ 0.7. Wet: ≈ 0.4. Snow: ≈ 0.2. Ice: ≈ 0.1. That is a SEVEN-fold difference between dry and ice. The friction circle: your tires have a total grip budget. If you use 100% for braking, you have 0% left for steering — that is why locked wheels go straight. ABS exists to keep some grip reserved for steering during hard braking. This is also why you should brake BEFORE a turn, not during — you want all your grip available for cornering.",
      formula: 'F_friction_max = μ · N',
      variables: 'μ = friction coefficient, N = normal force (weight pushing down) = m · g on flat ground',
      practice: 'The Skid Recovery scenario lets you feel what happens when you exceed the friction limit. Gentle inputs > hard ones, always.'
    },
    hypermiling: {
      title: 'Hypermiling: Real Techniques That Work',
      icon: '🌿',
      content: "Hypermiling is the art of squeezing every mile from a gallon. Proven techniques: (1) Gentle accel — imagine an egg between your foot and the pedal. (2) Anticipate — read the road 15 seconds ahead so you brake less. (3) Coast to stops — fuel cut-off activates when you lift off the gas, meaning coasting in gear uses ZERO fuel on modern cars. (4) Pulse and glide — gently accelerate, then coast. Works best under 45 mph. (5) Highway cruise at 55-60 mph, not 75 (drag is brutal). (6) Tires at door-sticker PSI. (7) Remove the roof box when not using it. (8) Don't idle — modern engines restart on <0.5 s of fuel, so 30+ sec of idling wastes more than restarting. Combined, these techniques can boost real-world MPG by 20-40% over aggressive driving. Free money.",
      formula: 'Real MPG ≈ EPA_rated × (0.8 + 0.2 × smooth_score)',
      variables: 'smooth_score from 0 (terrible) to 1 (hypermiler). Most drivers are ≈0.5.',
      practice: 'Hypermiling Challenge mode gives you a target MPG and scores your driving style. Beat the EPA sticker!'
    },
    inertia: {
      title: "Newton's Laws in Your Car Every Second",
      icon: '⚖️',
      content: "Every driving decision is physics. 1st Law (inertia): a body in motion stays in motion. That is why you need brakes — to fight your car's inertia. It is also why loose objects become missiles in a crash. 2nd Law (F = ma): force = mass × acceleration. A heavier car takes more force to stop. 3rd Law (action/reaction): when your engine pushes on the tires, the road pushes back — that reaction force is what actually moves the car forward. Without friction (ice), the wheels spin but the car goes nowhere, because there is no reaction force. Understanding these three laws means you can predict how your car will behave in any situation before it surprises you.",
      formula: 'F = m · a',
      variables: 'The 2nd law. Every control input is a force. The car responds by accelerating in some direction.',
      practice: 'Drive the school bus in the sim and compare to the EV. Same brake pedal, very different feel — because mass is very different.'
    },
    night: {
      title: 'Night Driving: Why Speed Must Drop',
      icon: '🌙',
      content: "At night your headlights illuminate about 350 feet with low beams, ~500 feet with high beams. Your braking distance at 60 mph is ~240 ft. Add reaction distance — you are already using your ENTIRE headlight range just to stop in time. At 75 mph, you physically cannot stop within your headlight range with low beams. This is called 'overdriving your headlights' and it is how single-vehicle-at-night crashes happen. Rule: drive slow enough that you could stop within the distance you can see. Use high beams whenever there is no oncoming traffic within ~500 ft. Dim for oncoming cars (glare can blind the other driver for 2+ seconds — covering 176 ft at 60 mph).",
      formula: 'safe_night_speed: where d_stop(v) ≤ headlight_range',
      variables: 'headlight_range ≈ 350 ft (low) / 500 ft (high), d_stop(60 mph) ≈ 240 ft on dry',
      practice: 'Switch the sim to Night scenario. Feel how much shorter your "world" becomes. Try high vs low beams.'
    },
    winter: {
      title: 'Maine Winter Driving: Ice, Snow, and Moose',
      icon: '❄️',
      content: "Maine winters test every skill you have. Four rules: (1) Look far ahead. Bad things happen slowly if you see them coming. Tight focus = surprise = crashes. (2) Gentle inputs. Smooth acceleration, smooth braking, smooth steering. Jerky = slip. (3) Increase following distance to 6-10 seconds on snow. Regular 3 seconds is nowhere near enough when friction drops to 0.2. (4) When in doubt, slow down more. Maine-specific: moose warnings are real — May through October at dawn/dusk, scan treelines. Black ice on bridges FIRST. Clear ALL snow from your car before driving (including the roof — state law). Keep your gas tank above half (prevents fuel line freeze, and a half tank means real emergency reserves if you get stuck).",
      formula: 'winter_safe_speed ≈ posted_speed × (μ_winter / μ_dry)',
      variables: 'μ_snow ≈ 0.2-0.3, μ_ice ≈ 0.1, μ_dry ≈ 0.7. So on snow, ~30% of posted is sometimes the right answer.',
      practice: 'Snow Scenario simulates Maine winter physics accurately. Feel how much longer everything takes.'
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 6: SCENARIOS — Real driving environments
  // ─────────────────────────────────────────────────────────

  var SCENARIOS = [
    { id: 'residential', name: 'Residential Street', icon: '🏘️', speedLimit: 25, weather: 'clear', time: 'day', traffic: 'light', difficulty: 1, desc: 'Quiet Maine neighborhood. Watch for kids, dogs, parked cars, driveways. Classic first lesson.' },
    { id: 'suburban', name: 'Suburban Arterial', icon: '🏙️', speedLimit: 40, weather: 'clear', time: 'day', traffic: 'medium', difficulty: 2, desc: 'Two-lane each way with traffic lights, turn lanes, and shopping plazas. Typical US driving.' },
    { id: 'highway', name: 'Highway Merge', icon: '🛣️', speedLimit: 65, weather: 'clear', time: 'day', traffic: 'medium', difficulty: 3, desc: 'I-295 Portland. Practice merging, lane changes, and keeping 3-second following distance at speed.' },
    { id: 'roundabout', name: 'Roundabout', icon: '🔄', speedLimit: 25, weather: 'clear', time: 'day', traffic: 'medium', difficulty: 3, desc: 'Yield to traffic already in the circle. Enter on a gap. No stopping inside. Common in Maine new roads.' },
    { id: 'rural', name: 'Rural Two-Lane', icon: '🌲', speedLimit: 50, weather: 'clear', time: 'day', traffic: 'light', difficulty: 2, desc: 'Curvy Maine back road. Watch for moose, deer, cyclists, and blind curves.' },
    { id: 'parking', name: 'Parallel Parking', icon: '🅿️', speedLimit: 10, weather: 'clear', time: 'day', traffic: 'light', difficulty: 3, desc: '2D top-down view. The dreaded road-test maneuver. Step-by-step guidance.' },
    { id: 'night', name: 'Night Driving', icon: '🌙', speedLimit: 40, weather: 'clear', time: 'night', traffic: 'light', difficulty: 3, desc: 'Suburban roads after dark. Headlights reach ~350 ft with lows, 500 ft with highs. Do not overdrive them.' },
    { id: 'fog', name: 'Coastal Fog', icon: '🌫️', speedLimit: 30, weather: 'fog', time: 'day', traffic: 'light', difficulty: 4, desc: 'Maine coastal fog — thick, wet, visibility 100 ft. Low beams only. Slow WAY down.' },
    { id: 'rain', name: 'Rain', icon: '🌧️', speedLimit: 45, weather: 'rain', time: 'day', traffic: 'medium', difficulty: 3, desc: 'Wet pavement. Friction drops ~40%. Hydroplaning risk above 45 mph. Wipers on = headlights on (Maine law).' },
    { id: 'snow', name: 'Maine Snow', icon: '❄️', speedLimit: 35, weather: 'snow', time: 'day', traffic: 'light', difficulty: 5, desc: 'Snow-covered road. Friction drops to ~0.2. Gentle inputs only. Moose warning active. The test.' },
    { id: 'construction', name: 'Work Zone', icon: '🚧', speedLimit: 35, weather: 'clear', time: 'day', traffic: 'medium', difficulty: 3, desc: 'Lane closure with flagger and cones. Fines double. Workers present — treat like school zone.' },
    { id: 'school_zone', name: 'School Zone', icon: '🏫', speedLimit: 15, weather: 'clear', time: 'day', traffic: 'light', difficulty: 2, desc: 'Active school zone. Crosswalks, crossing guard, buses. 15 mph limit when children present.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7: PHYSICS HELPERS
  // ─────────────────────────────────────────────────────────
  // Real formulas — not arcade.
  // All speeds internal in m/s, displayed in mph. 1 mph = 0.44704 m/s.

  var MPH_TO_MS = 0.44704;
  var MS_TO_MPH = 2.23694;
  var FT_PER_M = 3.28084;
  var AIR_DENSITY = 1.225; // kg/m³ at sea level

  // Friction coefficient by weather and tire state.
  function frictionCoef(weather) {
    if (weather === 'snow') return 0.22;
    if (weather === 'ice') return 0.10;
    if (weather === 'rain') return 0.42;
    if (weather === 'fog') return 0.60; // fog is about visibility, not grip
    return 0.72; // dry
  }

  // Rolling resistance coefficient.
  function rollingCoef(weather, tirePressureOk) {
    var base = 0.012;
    if (!tirePressureOk) base += 0.004;
    if (weather === 'snow') base += 0.008;
    if (weather === 'rain') base += 0.002;
    return base;
  }

  // Aerodynamic drag force in Newtons.
  function dragForce(v_ms, cd, area) {
    return 0.5 * AIR_DENSITY * v_ms * v_ms * cd * area;
  }

  // Rolling resistance force in Newtons.
  function rollingForce(m, crr) {
    return crr * m * 9.81;
  }

  // Total resistive force (drag + rolling) on flat ground.
  function resistiveForce(v_ms, vehicle, weather, tireOk) {
    return dragForce(v_ms, vehicle.cd, vehicle.area) + rollingForce(vehicle.mass, rollingCoef(weather, tireOk));
  }

  // Stopping distance formula. Returns { reaction_ft, braking_ft, total_ft }.
  function stoppingDistance(v_mph, weather, reactionSec) {
    var v_ms = v_mph * MPH_TO_MS;
    var rt = reactionSec || 1.5;
    var reactionM = v_ms * rt;
    var mu = frictionCoef(weather);
    var brakingM = (v_ms * v_ms) / (2 * mu * 9.81);
    return {
      reaction_ft: reactionM * FT_PER_M,
      braking_ft: brakingM * FT_PER_M,
      total_ft: (reactionM + brakingM) * FT_PER_M,
      mu: mu
    };
  }

  // Instantaneous MPG estimate given current speed, acceleration, and vehicle.
  // Simplified: engine does work against drag + rolling + acceleration.
  // Output in mpg (gasoline equivalent). Handles EV by reporting MPGe.
  function instantMPG(v_mph, accel_g, vehicle, weather, tireOk) {
    if (v_mph < 1) return 0;
    var v_ms = v_mph * MPH_TO_MS;
    var Fd = dragForce(v_ms, vehicle.cd, vehicle.area);
    var Fr = rollingForce(vehicle.mass, rollingCoef(weather, tireOk));
    var Fa = Math.max(0, vehicle.mass * accel_g * 9.81); // only accel costs; decel is free / regen
    var powerW = (Fd + Fr + Fa) * v_ms;
    // Gas engine efficiency ≈ 0.25 under good conditions; idle losses increase at low speed.
    var engineEff = vehicle.type === 'electric' ? 0.88 : (vehicle.type === 'hybrid' ? 0.34 : 0.25);
    // Low-speed penalty for gas engines (not EVs)
    if (vehicle.type !== 'electric' && v_mph < 25) engineEff *= 0.7 + (v_mph / 25) * 0.3;
    var fuelPowerW = powerW / engineEff;
    // Energy density: gasoline ≈ 33.7 kWh / gallon gas-equivalent. (EPA uses this for MPGe.)
    var gallonsPerHour = fuelPowerW / (33700 * 1000) * 3600;
    if (gallonsPerHour <= 0.0001) return 999;
    return v_mph / gallonsPerHour;
  }

  // Ideal cruise MPG at steady speed (no accel cost).
  function cruiseMPG(v_mph, vehicle, weather, tireOk) {
    return instantMPG(v_mph, 0, vehicle, weather, tireOk);
  }

  // Safe following distance in feet, 3-second rule plus weather bonus.
  function safeFollowingFeet(v_mph, weather) {
    var sec = 3;
    if (weather === 'rain') sec = 4;
    if (weather === 'snow' || weather === 'fog') sec = 6;
    return v_mph * 1.467 * sec; // 1 mph = 1.467 ft/s
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 8: RAYCASTER WORLD DEFINITION
  // ─────────────────────────────────────────────────────────
  // Pseudo-3D raycaster. The world is a grid-based map with roads, buildings,
  // lanes, and waypoints. The "car" is a moving point with heading.
  // Map cell values: 0 = road, 1 = building wall, 2 = grass/shoulder,
  // 3 = centerline (visual only), 4 = sidewalk, 5 = tree, 6 = building special.
  // Only 1, 5, 6 block raycasts.

  var MAP_SIZE = 64;

  function buildMap(scenarioId) {
    // Create a base grid of grass (2) then carve roads.
    var map = [];
    for (var y = 0; y < MAP_SIZE; y++) {
      var row = [];
      for (var x = 0; x < MAP_SIZE; x++) row.push(2);
      map.push(row);
    }
    // Carve a long main road running north-south down the middle.
    var centerX = Math.floor(MAP_SIZE / 2);
    for (var y2 = 0; y2 < MAP_SIZE; y2++) {
      for (var dx = -3; dx <= 3; dx++) map[y2][centerX + dx] = 0;
      map[y2][centerX] = 3; // centerline marker
    }
    // For most scenarios, add buildings/trees on the sides.
    if (scenarioId === 'residential' || scenarioId === 'suburban' || scenarioId === 'night' || scenarioId === 'school_zone' || scenarioId === 'construction') {
      for (var by = 4; by < MAP_SIZE - 4; by += 6) {
        // Left side houses
        for (var bx = 0; bx < 3; bx++) {
          var lx = centerX - 6 - bx;
          if (lx >= 0) map[by][lx] = 1;
          if (lx >= 0 && by + 1 < MAP_SIZE) map[by + 1][lx] = 1;
          if (lx >= 0 && by + 2 < MAP_SIZE) map[by + 2][lx] = 1;
        }
        // Right side houses
        for (var bx2 = 0; bx2 < 3; bx2++) {
          var rx = centerX + 6 + bx2;
          if (rx < MAP_SIZE) map[by][rx] = 1;
          if (rx < MAP_SIZE && by + 1 < MAP_SIZE) map[by + 1][rx] = 1;
          if (rx < MAP_SIZE && by + 2 < MAP_SIZE) map[by + 2][rx] = 1;
        }
      }
      // Sprinkle trees
      for (var ti = 0; ti < 30; ti++) {
        var tx = Math.floor(Math.random() * MAP_SIZE);
        var ty = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty][tx] === 2) map[ty][tx] = 5;
      }
    } else if (scenarioId === 'rural' || scenarioId === 'snow' || scenarioId === 'fog') {
      // Trees along sides, sparser
      for (var ti2 = 0; ti2 < 120; ti2++) {
        var tx2 = Math.floor(Math.random() * MAP_SIZE);
        var ty2 = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty2][tx2] === 2) map[ty2][tx2] = 5;
      }
    } else if (scenarioId === 'highway') {
      // Wider road, medians
      for (var y3 = 0; y3 < MAP_SIZE; y3++) {
        for (var dx2 = -6; dx2 <= 6; dx2++) map[y3][centerX + dx2] = 0;
        map[y3][centerX - 1] = 3;
        map[y3][centerX + 1] = 3;
      }
      // Occasional trees far from road
      for (var ti3 = 0; ti3 < 40; ti3++) {
        var tx3 = Math.floor(Math.random() * MAP_SIZE);
        var ty3 = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty3][tx3] === 2 && Math.abs(tx3 - centerX) > 10) map[ty3][tx3] = 5;
      }
    } else if (scenarioId === 'roundabout') {
      // Circular road around center (radius 8)
      var cy = Math.floor(MAP_SIZE / 2);
      for (var rr = 6; rr <= 10; rr++) {
        for (var aa = 0; aa < 360; aa += 2) {
          var ax = Math.round(centerX + Math.cos(aa * Math.PI / 180) * rr);
          var ay = Math.round(cy + Math.sin(aa * Math.PI / 180) * rr);
          if (ax >= 0 && ax < MAP_SIZE && ay >= 0 && ay < MAP_SIZE) map[ay][ax] = 0;
        }
      }
      // Center island
      for (var iy = cy - 4; iy <= cy + 4; iy++) {
        for (var ix = centerX - 4; ix <= centerX + 4; ix++) {
          var dd = Math.hypot(ix - centerX, iy - cy);
          if (dd < 5 && ix >= 0 && ix < MAP_SIZE && iy >= 0 && iy < MAP_SIZE) map[iy][ix] = 5;
        }
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9: TRAFFIC AI — Other vehicles on the road
  // ─────────────────────────────────────────────────────────

  function spawnTraffic(scenario) {
    var traffic = [];
    var count = scenario.traffic === 'light' ? 3 : scenario.traffic === 'medium' ? 6 : 10;
    var centerX = Math.floor(MAP_SIZE / 2);
    for (var i = 0; i < count; i++) {
      var direction = Math.random() < 0.5 ? 1 : -1;
      traffic.push({
        x: centerX + (direction === 1 ? -1.5 : 1.5),
        y: Math.random() * MAP_SIZE,
        heading: direction === 1 ? Math.PI / 2 : -Math.PI / 2,
        speed: (scenario.speedLimit - 5 + Math.random() * 10) * MPH_TO_MS,
        color: ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#fff'][i % 6],
        type: Math.random() < 0.1 ? 'truck' : 'car'
      });
    }
    return traffic;
  }

  function spawnPedestrians(scenario) {
    if (scenario.id === 'highway' || scenario.id === 'rural') return [];
    var peds = [];
    var count = scenario.id === 'school_zone' ? 5 : scenario.id === 'residential' ? 3 : 2;
    var centerX = Math.floor(MAP_SIZE / 2);
    for (var i = 0; i < count; i++) {
      peds.push({
        x: centerX + (Math.random() < 0.5 ? -7 : 7) + (Math.random() - 0.5) * 2,
        y: 10 + Math.random() * (MAP_SIZE - 20),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.1,
        color: ['#fbbf24', '#ec4899', '#06b6d4', '#84cc16'][i % 4],
        crossing: Math.random() < 0.2
      });
    }
    return peds;
  }

  // Cyclists + motorcycles — vulnerable road users. Maine 3-foot passing law.
  function spawnCyclists(scenario) {
    if (['highway', 'fog', 'snow', 'night', 'parking'].indexOf(scenario.id) !== -1) return [];
    var cyclists = [];
    var centerX = Math.floor(MAP_SIZE / 2);
    var count = scenario.id === 'rural' ? 2 : scenario.id === 'residential' ? 2 : 1;
    for (var i = 0; i < count; i++) {
      cyclists.push({
        x: centerX + (Math.random() < 0.5 ? -2 : 2.2), // near shoulder
        y: Math.random() * MAP_SIZE,
        heading: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
        speed: (12 + Math.random() * 4) * MPH_TO_MS, // 12-16 mph
        type: 'cyclist'
      });
    }
    return cyclists;
  }

  function spawnMotorcycles(scenario) {
    if (['fog', 'snow', 'parking'].indexOf(scenario.id) !== -1) return [];
    if (Math.random() > 0.4) return [];
    var centerX = Math.floor(MAP_SIZE / 2);
    return [{
      x: centerX + (Math.random() < 0.5 ? -1.5 : 1.5),
      y: Math.random() * MAP_SIZE,
      heading: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2,
      speed: scenario.speedLimit * MPH_TO_MS,
      type: 'motorcycle'
    }];
  }

  // Traffic signals — placed at intersections along the main road.
  // Cycle: green → yellow → red → green. Yellow gives the driver decision time.
  function spawnSignals(scenario) {
    var signals = [];
    var centerX = Math.floor(MAP_SIZE / 2);
    if (scenario.id === 'suburban' || scenario.id === 'school_zone' || scenario.id === 'night') {
      [16, 32, 48].forEach(function(yPos, idx) {
        signals.push({
          x: centerX, y: yPos, type: 'light',
          state: idx === 0 ? 'green' : idx === 1 ? 'red' : 'green',
          timer: Math.random() * 5,
          greenDur: 8, yellowDur: 3, redDur: 6
        });
      });
    } else if (scenario.id === 'residential') {
      // Stop signs at one intersection
      signals.push({ x: centerX, y: 32, type: 'stop', state: 'stop' });
    } else if (scenario.id === 'construction') {
      signals.push({ x: centerX, y: 24, type: 'stop', state: 'stop' });
      signals.push({ x: centerX, y: 40, type: 'flagger', state: 'red', timer: 0, greenDur: 10, yellowDur: 0, redDur: 8 });
    }
    return signals;
  }

  function updateSignals(signals, dt) {
    signals.forEach(function(s) {
      if (s.type !== 'light' && s.type !== 'flagger') return;
      s.timer = (s.timer || 0) + dt;
      if (s.state === 'green' && s.timer > s.greenDur) { s.state = 'yellow'; s.timer = 0; }
      else if (s.state === 'yellow' && s.timer > s.yellowDur) { s.state = 'red'; s.timer = 0; }
      else if (s.state === 'red' && s.timer > s.redDur) { s.state = 'green'; s.timer = 0; }
    });
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9b: WILDLIFE EVENTS — Moose, deer, dog
  // ─────────────────────────────────────────────────────────
  // Maine driver's ed without moose physics is incomplete.

  function maybeSpawnWildlife(scenario) {
    // Random chance per second; only on rural/snow/fog/night
    if (['rural', 'snow', 'fog', 'night'].indexOf(scenario.id) === -1) return null;
    if (Math.random() > 0.003) return null; // ~once per ~5 minutes
    var types = scenario.id === 'snow' || scenario.id === 'rural'
      ? [{ kind: 'moose', icon: '🫎', mass: 'massive', warn: 'MOOSE!' },
         { kind: 'deer', icon: '🦌', mass: 'medium', warn: 'DEER!' }]
      : [{ kind: 'deer', icon: '🦌', mass: 'medium', warn: 'DEER!' },
         { kind: 'dog', icon: '🐕', mass: 'small', warn: 'DOG IN ROAD!' }];
    return types[Math.floor(Math.random() * types.length)];
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9c: PARALLEL PARKING MODE (2D top-down)
  // ─────────────────────────────────────────────────────────
  // Pure 2D, top-down parking trainer with real bicycle-model steering and
  // step-by-step Maine road test guidance: line up, reverse-right, straighten,
  // reverse-left, center.

  function ParkingMode(props) {
    var React = props.React;
    var h = props.h;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var canvasRef = useRef(null);
    var carRef = useRef({ x: 80, y: 60, heading: 0, speed: 0, steering: 0 });
    var keysRef = useRef({});
    var animRef = useRef(null);
    var timeRef = useRef(0);
    var stepRef = useRef(0);
    var hitConeRef = useRef(false);
    var doneRef = useRef(false);
    var feedback = useState('Step 1: Pull alongside the front car, ~2 feet away. Press SHIFT for reverse.');
    var feedbackText = feedback[0]; var setFeedback = feedback[1];
    var status = useState({ score: 100, time: 0, hits: 0, parked: false });
    var st = status[0]; var setSt = status[1];

    // Two parked cars + curb. The slot is between them.
    var FRONT_CAR = { x: 320, y: 320, w: 60, h: 110 };
    var REAR_CAR = { x: 320, y: 470, w: 60, h: 110 };
    var SLOT = { x: 320, y: 380, w: 70, h: 130 }; // target box
    var CURB_X = 295;

    var STEPS = [
      'Step 1: Pull alongside the front car, leave ~2 ft gap. Stop with rear bumpers aligned.',
      'Step 2: Begin reversing. Steer FULL RIGHT. Back slowly until your car is at ~45°.',
      'Step 3: Straighten the wheel. Keep reversing slowly toward the curb.',
      'Step 4: Steer FULL LEFT. Continue reversing to swing the front in.',
      'Step 5: Straighten the car parallel to the curb. Pull forward to center in the slot.',
      '✅ PARKED! You completed the maneuver. Score: '
    ];

    useEffect(function() {
      var onDown = function(e) {
        keysRef.current[e.key.toLowerCase()] = true;
        if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
        if (e.key.toLowerCase() === 'r') resetCar();
      };
      var onUp = function(e) { keysRef.current[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      return function() {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
      };
    }, []);

    function resetCar() {
      carRef.current = { x: 80, y: 60, heading: 0, speed: 0, steering: 0 };
      stepRef.current = 0;
      doneRef.current = false;
      hitConeRef.current = false;
      setSt({ score: 100, time: 0, hits: 0, parked: false });
      setFeedback(STEPS[0]);
    }

    useEffect(function() {
      var canvas = canvasRef.current;
      if (!canvas) return;
      var gfx = canvas.getContext('2d');
      var lastT = performance.now();

      var step = function(now) {
        var dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        timeRef.current += dt;
        if (!doneRef.current) update(dt);
        render();
        animRef.current = requestAnimationFrame(step);
      };

      var update = function(dt) {
        var car = carRef.current;
        var k = keysRef.current;
        var fwd = (k['w'] || k['arrowup']) ? 1 : 0;
        var rev = (k['s'] || k['arrowdown'] || k['shift']) ? 1 : 0;
        var left = (k['a'] || k['arrowleft']) ? 1 : 0;
        var right = (k['d'] || k['arrowright']) ? 1 : 0;
        // Smooth steering
        var steerTarget = (right - left) * 0.7;
        car.steering += (steerTarget - car.steering) * dt * 4;
        // Speed
        var accel = (fwd - rev) * 30;
        car.speed += accel * dt;
        car.speed *= 0.92; // friction
        if (car.speed > 60) car.speed = 60;
        if (car.speed < -40) car.speed = -40;
        // Bicycle model — turn rate depends on speed
        var turnRate = car.steering * (car.speed / 30) * 1.4;
        car.heading += turnRate * dt;
        // Position
        car.x += Math.cos(car.heading) * car.speed * dt;
        car.y += Math.sin(car.heading) * car.speed * dt;
        // Hit detection vs parked cars
        var carBox = { x: car.x - 25, y: car.y - 12, w: 50, h: 24 };
        if (rectsOverlap(carBox, FRONT_CAR) || rectsOverlap(carBox, REAR_CAR)) {
          if (!hitConeRef.current) {
            hitConeRef.current = true;
            var newSt = Object.assign({}, st);
            newSt.score -= 25;
            newSt.hits += 1;
            setSt(newSt);
            setFeedback('💥 You bumped a parked car. -25. Press R to reset.');
          }
          car.speed *= -0.3;
        } else {
          hitConeRef.current = false;
        }
        // Curb
        if (car.x < CURB_X + 12) {
          car.x = CURB_X + 12;
          car.speed *= 0.3;
        }
        // Step progression heuristics
        var headingDeg = (car.heading * 180 / Math.PI + 360) % 360;
        var inSlot = car.x > SLOT.x - 30 && car.x < SLOT.x + 30 && car.y > SLOT.y - 30 && car.y < SLOT.y + 70;
        if (stepRef.current === 0 && car.y > 250 && car.y < 320 && car.x > 360 && car.x < 420) {
          stepRef.current = 1; setFeedback(STEPS[1]);
        } else if (stepRef.current === 1 && (headingDeg > 20 && headingDeg < 80) && car.speed < 0) {
          stepRef.current = 2; setFeedback(STEPS[2]);
        } else if (stepRef.current === 2 && car.x < 380) {
          stepRef.current = 3; setFeedback(STEPS[3]);
        } else if (stepRef.current === 3 && headingDeg < 15) {
          stepRef.current = 4; setFeedback(STEPS[4]);
        } else if (stepRef.current >= 3 && inSlot && Math.abs(headingDeg) < 10 && Math.abs(car.speed) < 1) {
          stepRef.current = 5;
          doneRef.current = true;
          var newSt2 = Object.assign({}, st);
          newSt2.parked = true;
          setSt(newSt2);
          setFeedback(STEPS[5] + (newSt2.score) + '/100 (' + newSt2.hits + ' hits)');
        }
      };

      var render = function() {
        var W = canvas.width = canvas.offsetWidth;
        var H = canvas.height = 480;
        // Asphalt
        gfx.fillStyle = '#334155'; gfx.fillRect(0, 0, W, H);
        // Sidewalk + curb
        gfx.fillStyle = '#94a3b8'; gfx.fillRect(0, 0, CURB_X, H);
        gfx.fillStyle = '#fbbf24'; gfx.fillRect(CURB_X, 0, 4, H);
        // Lane lines
        gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2; gfx.setLineDash([16, 16]);
        gfx.beginPath(); gfx.moveTo(W - 60, 0); gfx.lineTo(W - 60, H); gfx.stroke();
        gfx.setLineDash([]);
        // Slot guide
        gfx.strokeStyle = 'rgba(34,197,94,0.5)'; gfx.lineWidth = 2; gfx.setLineDash([6, 6]);
        gfx.strokeRect(SLOT.x, SLOT.y, SLOT.w, SLOT.h);
        gfx.setLineDash([]);
        // Parked cars
        function drawParked(c, color) {
          gfx.fillStyle = color;
          gfx.fillRect(c.x, c.y, c.w, c.h);
          gfx.fillStyle = 'rgba(0,0,0,0.4)';
          gfx.fillRect(c.x + 6, c.y + 8, c.w - 12, 14);
          gfx.fillRect(c.x + 6, c.y + c.h - 22, c.w - 12, 14);
        }
        drawParked(FRONT_CAR, '#7c3aed');
        drawParked(REAR_CAR, '#dc2626');
        // Curb labels
        gfx.fillStyle = '#0f172a'; gfx.font = 'bold 11px system-ui'; gfx.textAlign = 'center';
        gfx.fillText('FRONT', FRONT_CAR.x + FRONT_CAR.w / 2, FRONT_CAR.y + 60);
        gfx.fillText('REAR', REAR_CAR.x + REAR_CAR.w / 2, REAR_CAR.y + 60);

        // Player car
        var car = carRef.current;
        gfx.save();
        gfx.translate(car.x, car.y);
        gfx.rotate(car.heading + Math.PI / 2);
        gfx.fillStyle = '#22d3ee';
        gfx.fillRect(-25, -12, 50, 24);
        // Windshield
        gfx.fillStyle = '#0c4a6e';
        gfx.fillRect(-20, -10, 14, 20);
        // Brake lights when reversing
        if (car.speed < -0.5) {
          gfx.fillStyle = '#ef4444';
          gfx.fillRect(20, -10, 6, 6); gfx.fillRect(20, 4, 6, 6);
        }
        // Steering indicator (front wheels)
        gfx.save();
        gfx.translate(-15, 0);
        gfx.rotate(car.steering);
        gfx.fillStyle = '#0f172a'; gfx.fillRect(-3, -8, 6, 16);
        gfx.restore();
        gfx.restore();

        // HUD
        gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(10, 10, 280, 60);
        gfx.fillStyle = '#fff'; gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left';
        gfx.fillText('🅿️ Parallel Parking Trainer', 20, 28);
        gfx.fillStyle = '#22d3ee'; gfx.font = '10px system-ui';
        gfx.fillText('Score: ' + st.score + ' · Hits: ' + st.hits + (st.parked ? ' · ✓ PARKED' : ''), 20, 44);
        gfx.fillStyle = '#94a3b8';
        gfx.fillText('W=fwd  S/Shift=reverse  A/D=steer  R=reset', 20, 60);
      };

      animRef.current = requestAnimationFrame(step);
      return function() {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }, [st]);

    function rectsOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    return h('div', { style: { padding: '14px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
      h('button', { onClick: props.onExit, style: { marginBottom: '10px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
      h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '10px', border: '1px solid #06b6d4' } },
        h('canvas', { ref: canvasRef, style: { width: '100%', height: '480px', display: 'block', borderRadius: '8px', background: '#1e293b' } })
      ),
      h('div', { style: { marginTop: '10px', padding: '12px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' } },
        h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '6px' } }, '👨‍🏫 Instructor'),
        h('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' } }, feedbackText),
        h('div', { style: { marginTop: '8px', fontSize: '10px', color: '#64748b' } }, 'Tip: Real Maine road test allows 3 attempts. The judges measure curb distance (under 12 inches) and wheel-to-curb angle.')
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 10: REGISTER TOOL & RENDER
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('roadReady', {
    name: "RoadReady: Driver's Ed & Auto Science",
    icon: '🚗',
    category: 'life-skills',
    description: "Pseudo-3D driving simulator + US permit test + fuel efficiency physics. Maine state focus.",
    tags: ['driving', 'physics', 'safety', 'life-skills', 'maine'],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;

      var d = (ctx.toolData && ctx.toolData['roadReady']) || {};
      var upd = function(key, val) { ctx.update('roadReady', key, val); };
      var updMulti = function(obj) { ctx.updateMulti ? ctx.updateMulti('roadReady', obj) : Object.keys(obj).forEach(function(k) { upd(k, obj[k]); }); };
      var addToast = ctx.addToast || function(msg) { console.log('[RoadReady]', msg); };

      var view = d.view || 'menu';
      var selectedVehicle = d.vehicle || 'sedan';
      var selectedScenario = d.scenario || 'residential';
      var selectedLesson = d.lesson || null;
      var permitState = d.permit || null;
      var drivingStats = d.drivingStats || null;

      var currentVehicle = VEHICLES.find(function(v) { return v.id === selectedVehicle; }) || VEHICLES[0];
      var currentScenario = SCENARIOS.find(function(s) { return s.id === selectedScenario; }) || SCENARIOS[0];

      // ── Refs for the active driving sim ──
      var canvasRef = useRef(null);
      var animRef = useRef(null);
      var keysRef = useRef({});
      var carRef = useRef({ x: 32, y: 50, heading: -Math.PI / 2, speed: 0, throttle: 0, brake: 0, steering: 0 });
      var mapRef = useRef(null);
      var trafficRef = useRef([]);
      var pedsRef = useRef([]);
      var signalsRef = useRef([]);
      var wildlifeRef = useRef(null); // { kind, x, y, vx, vy, icon, mass, warn }
      var cyclistsRef = useRef([]);
      var audioRef = useRef({ ctx: null, engineOsc: null, engineGain: null, started: false });
      var skidRef = useRef({ active: false, intensity: 0 });
      var eventToastRef = useRef({ msg: null, until: 0 });
      var drivingRef = useRef(false);
      var pausedRef = useRef(false);
      var timeRef = useRef(0);
      var statsRef = useRef({ startTime: 0, distance: 0, maxSpeed: 0, mpgSum: 0, mpgSamples: 0, hardBrakes: 0, jackrabbits: 0, speedViolations: 0, closeFollows: 0, crashes: 0, stops: 0, safetyScore: 100, efficiencyScore: 100, fuelUsed: 0, skidSeconds: 0, cyclistClose: 0 });
      var lastStateRef = useRef({ speed: 0, accel: 0 });
      var showHUDRef = useRef(true);
      var cameraModeRef = useRef('cockpit'); // cockpit | chase | overhead

      // ── Input handling ──
      useEffect(function() {
        if (view !== 'driving') return;
        var onKeyDown = function(e) {
          keysRef.current[e.key.toLowerCase()] = true;
          if (e.key === ' ') { pausedRef.current = !pausedRef.current; e.preventDefault(); }
          if (e.key.toLowerCase() === 'c') {
            var modes = ['cockpit', 'chase', 'overhead'];
            cameraModeRef.current = modes[(modes.indexOf(cameraModeRef.current) + 1) % modes.length];
          }
          if (e.key.toLowerCase() === 'h') showHUDRef.current = !showHUDRef.current;
          if (e.key.toLowerCase() === 'l') upd('highBeams', !d.highBeams);
          // Horn — quick beep on 'q'
          if (e.key.toLowerCase() === 'q') {
            try {
              var ac = audioRef.current.ctx;
              if (ac) {
                var horn = ac.createOscillator();
                var hGain = ac.createGain();
                horn.type = 'square'; horn.frequency.value = 440;
                hGain.gain.value = 0.08;
                horn.connect(hGain); hGain.connect(ac.destination);
                horn.start();
                hGain.gain.setTargetAtTime(0, ac.currentTime + 0.25, 0.05);
                horn.stop(ac.currentTime + 0.3);
              }
            } catch (e2) {}
          }
          if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
        };
        var onKeyUp = function(e) { keysRef.current[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return function() {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        };
      }, [view]);

      // ── Start / stop driving ──
      var startDriving = useCallback(function(scenarioId, vehicleId) {
        var scn = SCENARIOS.find(function(s) { return s.id === scenarioId; }) || SCENARIOS[0];
        var veh = VEHICLES.find(function(v) { return v.id === vehicleId; }) || VEHICLES[0];
        mapRef.current = buildMap(scn.id);
        trafficRef.current = spawnTraffic(scn);
        pedsRef.current = spawnPedestrians(scn);
        signalsRef.current = spawnSignals(scn);
        cyclistsRef.current = spawnCyclists(scn).concat(spawnMotorcycles(scn));
        wildlifeRef.current = null;
        skidRef.current = { active: false, intensity: 0 };
        // Scenario-specific tutorial banner
        var introMsg = null;
        if (scn.id === 'roundabout') introMsg = '🔄 ROUNDABOUT: Yield on entry. Go counterclockwise. Signal your exit.';
        else if (scn.id === 'highway') introMsg = '🛣️ HIGHWAY: Match traffic speed, 3-second following distance, signal all lane changes.';
        else if (scn.id === 'snow') introMsg = '❄️ SNOW: μ ≈ 0.2. Gentle inputs only. Watch for moose. Brake BEFORE turns.';
        else if (scn.id === 'fog') introMsg = '🌫️ FOG: Low beams only — highs reflect back. Slow to ~half posted speed.';
        else if (scn.id === 'school_zone') introMsg = '🏫 SCHOOL ZONE: 15 mph. Stop for buses with red flashers on both directions.';
        else if (scn.id === 'construction') introMsg = '🚧 WORK ZONE: Fines double. Watch for flaggers. Slow, smooth, patient.';
        eventToastRef.current = introMsg ? { msg: introMsg, until: 10 } : { msg: null, until: 0 };
        timeRef.current = 0;
        // Init audio lazily on start
        try {
          var Ac = window.AudioContext || window.webkitAudioContext;
          if (Ac && !audioRef.current.ctx) {
            audioRef.current.ctx = new Ac();
          }
        } catch (e) { /* audio unavailable */ }
        carRef.current = { x: 32, y: 55, heading: -Math.PI / 2, speed: 0, throttle: 0, brake: 0, steering: 0 };
        statsRef.current = { startTime: Date.now(), distance: 0, maxSpeed: 0, mpgSum: 0, mpgSamples: 0, hardBrakes: 0, jackrabbits: 0, speedViolations: 0, closeFollows: 0, crashes: 0, stops: 0, safetyScore: 100, efficiencyScore: 100, fuelUsed: 0, skidSeconds: 0, cyclistClose: 0 };
        lastStateRef.current = { speed: 0, accel: 0 };
        timeRef.current = 0;
        drivingRef.current = true;
        pausedRef.current = false;
        updMulti({ view: 'driving', scenario: scn.id, vehicle: veh.id });
      }, []);

      var exitDriving = useCallback(function() {
        drivingRef.current = false;
        if (animRef.current) cancelAnimationFrame(animRef.current);
        // Stop audio
        try {
          var a = audioRef.current;
          if (a.engineGain) a.engineGain.gain.value = 0;
          if (a._skidGain) a._skidGain.gain.value = 0;
        } catch (e) {}
        var s = statsRef.current;
        var minutes = Math.floor((Date.now() - s.startTime) / 60000);
        var seconds = Math.floor(((Date.now() - s.startTime) % 60000) / 1000);
        var avgMPG = s.mpgSamples > 0 ? (s.mpgSum / s.mpgSamples) : 0;
        updMulti({
          view: 'debrief',
          drivingStats: {
            scenario: currentScenario.name,
            vehicle: currentVehicle.name,
            time: minutes + ':' + String(seconds).padStart(2, '0'),
            distance_mi: (s.distance / 1609).toFixed(2),
            maxSpeed: Math.round(s.maxSpeed * MS_TO_MPH),
            avgMPG: avgMPG.toFixed(1),
            safetyScore: Math.max(0, Math.round(s.safetyScore)),
            efficiencyScore: Math.max(0, Math.round(s.efficiencyScore)),
            hardBrakes: s.hardBrakes,
            jackrabbits: s.jackrabbits,
            speedViolations: s.speedViolations,
            closeFollows: s.closeFollows,
            crashes: s.crashes,
            stops: s.stops,
            fuelUsed_gal: s.fuelUsed.toFixed(3),
            skidSeconds: Math.round(s.skidSeconds),
            cyclistClose: s.cyclistClose
          }
        });
      }, [currentScenario, currentVehicle]);

      // ── Main simulation loop ──
      useEffect(function() {
        if (view !== 'driving') return;
        var canvas = canvasRef.current;
        if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var lastT = performance.now();

        var step = function(now) {
          if (!drivingRef.current) return;
          var dt = Math.min(0.1, (now - lastT) / 1000);
          lastT = now;
          if (!pausedRef.current) {
            timeRef.current += dt;
            updateSignals(signalsRef.current, dt);
            updatePhysics(dt);
            updateTraffic(dt);
            updatePeds(dt);
            updateCyclists(dt);
            updateWildlife(dt);
            updateAudio();
            checkSignalCompliance();
            checkCyclistPassing();
            checkCollisions();
          }
          render();
          animRef.current = requestAnimationFrame(step);
        };

        var updatePhysics = function(dt) {
          var car = carRef.current;
          var k = keysRef.current;
          var veh = currentVehicle;
          var scn = currentScenario;
          // Throttle / brake input
          var throttleInput = (k['w'] || k['arrowup']) ? 1 : 0;
          var brakeInput = (k['s'] || k['arrowdown']) ? 1 : 0;
          var steerLeft = (k['a'] || k['arrowleft']) ? 1 : 0;
          var steerRight = (k['d'] || k['arrowright']) ? 1 : 0;
          car.throttle = throttleInput;
          car.brake = brakeInput;
          // Steering with smoothing
          var steerTarget = (steerRight - steerLeft) * 0.6;
          car.steering += (steerTarget - car.steering) * dt * 5;
          // Forces
          var mu = frictionCoef(scn.weather);
          var crr = rollingCoef(scn.weather, true);
          var maxThrust = veh.powerKW * 1000 / Math.max(1, car.speed); // P = F·v, cap at low speed
          if (car.speed < 2) maxThrust = veh.powerKW * 500; // launch
          var thrust = throttleInput * Math.min(maxThrust, veh.mass * mu * 9.81 * 0.4);
          var Fd = dragForce(car.speed, veh.cd, veh.area);
          var Fr = rollingForce(veh.mass, crr);
          var brakeForce = brakeInput * veh.mass * mu * 9.81 * 0.9;
          var netForce = thrust - Fd - Fr - brakeForce;
          var accel = netForce / veh.mass;
          car.speed += accel * dt;
          if (car.speed < 0) car.speed = 0;
          // Friction circle: lateral grip needed vs available.
          // If you brake HARD while turning, you exceed the grip budget and skid.
          var lateralAccelNeeded = Math.abs(car.steering) * car.speed * car.speed * 0.08;
          var longitudinalUsed = (Math.abs(thrust) + brakeForce) / veh.mass;
          var gripAvail = mu * 9.81;
          var lateralAvail = Math.max(0, Math.sqrt(Math.max(0, gripAvail * gripAvail - longitudinalUsed * longitudinalUsed)));
          var skid = lateralAccelNeeded > lateralAvail * 1.1;
          if (skid && car.speed > 4) {
            skidRef.current.active = true;
            skidRef.current.intensity = Math.min(1, (lateralAccelNeeded - lateralAvail) / lateralAvail);
            statsRef.current.safetyScore -= dt * 8;
            statsRef.current.skidSeconds += dt;
          } else {
            skidRef.current.active = false;
            skidRef.current.intensity *= 0.9;
          }
          // Steering — turn rate depends on speed (bicycle model approximation).
          // During skid, steering input is largely lost.
          var steerEffect = skidRef.current.active ? 0.25 : 1;
          var turnRate = car.steering * Math.min(1, car.speed / 10) * 1.2 * steerEffect;
          car.heading += turnRate * dt;
          // Position update
          var moveX = Math.cos(car.heading) * car.speed * dt / 5; // world units
          var moveY = Math.sin(car.heading) * car.speed * dt / 5;
          var newX = car.x + moveX;
          var newY = car.y + moveY;
          // Wall collision (bounce + penalty)
          if (mapRef.current) {
            var cellX = Math.floor(newX);
            var cellY = Math.floor(newY);
            if (cellY >= 0 && cellY < MAP_SIZE && cellX >= 0 && cellX < MAP_SIZE) {
              var cell = mapRef.current[cellY][cellX];
              if (cell === 1 || cell === 5 || cell === 6) {
                if (car.speed > 5) {
                  statsRef.current.crashes++;
                  statsRef.current.safetyScore -= 30;
                  addToast('💥 Crash! Safety score -30');
                }
                car.speed *= 0.3;
              } else {
                car.x = newX;
                car.y = newY;
              }
            }
            // Wrap Y to loop the road (simple circular track)
            if (car.y < 2) car.y = MAP_SIZE - 3;
            if (car.y > MAP_SIZE - 2) car.y = 2;
          }
          // Update stats
          var deltaDist = car.speed * dt;
          statsRef.current.distance += deltaDist;
          if (car.speed > statsRef.current.maxSpeed) statsRef.current.maxSpeed = car.speed;
          // MPG sample
          var accelG = Math.max(0, accel / 9.81);
          var mpg = instantMPG(car.speed * MS_TO_MPH, accelG, veh, scn.weather, true);
          if (car.speed > 1) {
            statsRef.current.mpgSum += mpg;
            statsRef.current.mpgSamples++;
            statsRef.current.fuelUsed += (deltaDist / 1609) / Math.max(1, mpg);
          }
          // Jackrabbit detection
          if (accel > 3.5 && lastStateRef.current.accel <= 3.5) {
            statsRef.current.jackrabbits++;
            statsRef.current.efficiencyScore -= 3;
          }
          // Hard brake detection
          if (brakeInput > 0 && accel < -5 && lastStateRef.current.accel >= -5) {
            statsRef.current.hardBrakes++;
            statsRef.current.efficiencyScore -= 2;
            statsRef.current.safetyScore -= 1;
          }
          // Speed violation
          var speedMph = car.speed * MS_TO_MPH;
          if (speedMph > scn.speedLimit + 5) {
            statsRef.current.speedViolations += dt;
            statsRef.current.safetyScore -= dt * 2;
          }
          lastStateRef.current = { speed: car.speed, accel: accel };
        };

        var updateTraffic = function(dt) {
          var traffic = trafficRef.current;
          var signals = signalsRef.current;
          var scn = currentScenario;
          traffic.forEach(function(t, idx) {
            // Look for nearest signal ahead in our direction of travel
            var slowFor = 0; // 0=clear, 1=slow, 2=stop
            signals.forEach(function(s) {
              var ahead = (t.heading > 0 ? s.y - t.y : t.y - s.y);
              if (ahead > 0 && ahead < 8 && Math.abs(s.x - t.x) < 3) {
                if (s.type === 'stop' || s.state === 'red') slowFor = Math.max(slowFor, 2);
                else if (s.state === 'yellow') slowFor = Math.max(slowFor, 1);
              }
            });
            // Follow car ahead
            traffic.forEach(function(other, j) {
              if (j === idx) return;
              if (Math.abs(other.x - t.x) > 2) return;
              var ahead = (t.heading > 0 ? other.y - t.y : t.y - other.y);
              if (ahead > 0 && ahead < 4) slowFor = Math.max(slowFor, 2);
              else if (ahead > 0 && ahead < 7) slowFor = Math.max(slowFor, 1);
            });
            // Adjust speed
            var targetSpeed;
            if (slowFor === 2) targetSpeed = 0;
            else if (slowFor === 1) targetSpeed = scn.speedLimit * 0.4 * MPH_TO_MS;
            else targetSpeed = (scn.speedLimit - 3 + (idx % 5) * 1.2) * MPH_TO_MS;
            t.speed += (targetSpeed - t.speed) * Math.min(1, dt * 2);
            // Move
            t.y += Math.sin(t.heading) * t.speed * dt / 5;
            t.x += Math.cos(t.heading) * t.speed * dt / 5;
            // Wrap
            if (t.y < -2) t.y = MAP_SIZE + 2;
            if (t.y > MAP_SIZE + 2) t.y = -2;
          });
        };

        var updateWildlife = function(dt) {
          var w = wildlifeRef.current;
          var car = carRef.current;
          // Maybe spawn
          if (!w) {
            var spawn = maybeSpawnWildlife(currentScenario);
            if (spawn) {
              // Spawn ahead of the player on the road, crossing across
              var ahead = 12;
              var sx = car.x + Math.cos(car.heading) * ahead + 6;
              var sy = car.y + Math.sin(car.heading) * ahead;
              wildlifeRef.current = {
                kind: spawn.kind, icon: spawn.icon, mass: spawn.mass,
                x: sx, y: sy,
                vx: -1.2, vy: 0,
                hit: false, life: 8
              };
              eventToastRef.current = { msg: '⚠️ ' + spawn.warn + ' Brake straight — DO NOT swerve!', until: timeRef.current + 5 };
              addToast('⚠️ ' + spawn.warn);
              return;
            }
          } else {
            w.x += w.vx * dt;
            w.y += w.vy * dt;
            w.life -= dt;
            if (w.life <= 0) { wildlifeRef.current = null; return; }
            // Hit detection
            var dx = w.x - car.x;
            var dy = w.y - car.y;
            var dist = Math.hypot(dx, dy);
            if (!w.hit && dist < 1.2) {
              w.hit = true;
              if (w.mass === 'massive') {
                statsRef.current.crashes++;
                statsRef.current.safetyScore -= 60;
                addToast('💥 MOOSE STRIKE — catastrophic. -60 safety');
                car.speed *= 0.1;
              } else if (w.mass === 'medium') {
                statsRef.current.crashes++;
                statsRef.current.safetyScore -= 30;
                addToast('💥 Deer strike. -30 safety');
                car.speed *= 0.4;
              } else {
                statsRef.current.safetyScore -= 15;
                addToast('💥 Animal struck. -15 safety');
              }
            }
          }
        };

        var updateCyclists = function(dt) {
          cyclistsRef.current.forEach(function(cy) {
            cy.y += Math.sin(cy.heading) * cy.speed * dt / 5;
            cy.x += Math.cos(cy.heading) * cy.speed * dt / 5;
            if (cy.y < -2) cy.y = MAP_SIZE + 2;
            if (cy.y > MAP_SIZE + 2) cy.y = -2;
            // Small wobble for cyclists
            if (cy.type === 'cyclist') cy.x += Math.sin(timeRef.current * 3 + cy.y) * 0.002;
          });
        };

        var checkCyclistPassing = function() {
          var car = carRef.current;
          cyclistsRef.current.forEach(function(cy) {
            // Only check when we're near + passing from behind
            var dx = cy.x - car.x;
            var dy = cy.y - car.y;
            var dist = Math.hypot(dx, dy);
            if (dist > 3) return;
            // Are we abeam? (alongside)
            var forwardDot = Math.cos(car.heading) * dx + Math.sin(car.heading) * dy;
            if (Math.abs(forwardDot) > 1.5) return;
            // Lateral distance in world units; 1 world unit ≈ 10 ft
            var latUnits = Math.abs(dx); // since road is vertical
            var latFt = latUnits * 10;
            if (latFt < 3 && !cy._flaggedClose) {
              cy._flaggedClose = true;
              statsRef.current.safetyScore -= 10;
              statsRef.current.cyclistClose++;
              addToast('🚴 Too close! Maine law: 3-foot minimum. -10');
              eventToastRef.current = { msg: '🚴 3-FOOT LAW VIOLATED. Give cyclists at least 3 feet when passing.', until: timeRef.current + 4 };
            }
            if (dist < 0.6) {
              statsRef.current.crashes++;
              statsRef.current.safetyScore -= 50;
              addToast('💥 Struck a ' + cy.type + '! -50');
              eventToastRef.current = { msg: '💥 You struck a ' + cy.type + '. In real life this is a serious injury or fatality.', until: timeRef.current + 5 };
              cy.x = -99;
            }
          });
        };

        var updateAudio = function() {
          var a = audioRef.current;
          if (!a.ctx) return;
          var car = carRef.current;
          // Engine hum: low oscillator whose frequency tracks RPM-ish (speed + throttle)
          try {
            if (!a.engineOsc) {
              a.engineOsc = a.ctx.createOscillator();
              a.engineGain = a.ctx.createGain();
              a.engineOsc.type = 'sawtooth';
              a.engineOsc.frequency.value = 60;
              a.engineGain.gain.value = 0;
              a.engineOsc.connect(a.engineGain);
              a.engineGain.connect(a.ctx.destination);
              a.engineOsc.start();
            }
            if (a.ctx.state === 'suspended') a.ctx.resume();
            var targetFreq = 50 + car.speed * 3 + car.throttle * 30;
            var targetGain = Math.min(0.06, 0.01 + car.throttle * 0.05 + car.speed * 0.0015);
            a.engineOsc.frequency.setTargetAtTime(targetFreq, a.ctx.currentTime, 0.08);
            a.engineGain.gain.setTargetAtTime(targetGain, a.ctx.currentTime, 0.1);
            // Skid screech: short high burst while skidding
            if (skidRef.current.active && !a._skidOsc) {
              a._skidOsc = a.ctx.createOscillator();
              a._skidGain = a.ctx.createGain();
              a._skidOsc.type = 'square';
              a._skidOsc.frequency.value = 1400;
              a._skidGain.gain.value = 0.04;
              a._skidOsc.connect(a._skidGain);
              a._skidGain.connect(a.ctx.destination);
              a._skidOsc.start();
            } else if (!skidRef.current.active && a._skidOsc) {
              a._skidGain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
              var oldOsc = a._skidOsc;
              setTimeout(function() { try { oldOsc.stop(); } catch(e){} }, 200);
              a._skidOsc = null;
            }
          } catch (e) { /* ignore */ }
        };

        var checkSignalCompliance = function() {
          var car = carRef.current;
          signalsRef.current.forEach(function(s) {
            if (s.type === 'light' && s.state === 'red') {
              // Did we cross while red? Track per-signal so we don't double-count.
              if (!s._lastY) s._lastY = car.y;
              var crossed = (s._lastY < s.y && car.y >= s.y) || (s._lastY > s.y && car.y <= s.y);
              if (crossed && Math.abs(car.x - s.x) < 4 && car.speed > 2) {
                statsRef.current.safetyScore -= 25;
                statsRef.current.crashes++;
                addToast('🚨 RED LIGHT VIOLATION! -25 safety');
                eventToastRef.current = { msg: '🚨 You ran a red light. In real life, that is reckless driving + an accident.', until: timeRef.current + 4 };
              }
              s._lastY = car.y;
            } else if (s.type === 'stop') {
              if (!s._stopped && Math.hypot(car.x - s.x, car.y - s.y) < 3 && car.speed < 1) {
                s._stopped = true;
                statsRef.current.stops++;
                addToast('✓ Full stop. +1');
                eventToastRef.current = { msg: '✓ Good stop at the stop sign.', until: timeRef.current + 2 };
              }
              if (Math.hypot(car.x - s.x, car.y - s.y) > 6) s._stopped = false;
              if (!s._violated && s._lastY != null) {
                var crossedStop = (s._lastY < s.y && car.y >= s.y) || (s._lastY > s.y && car.y <= s.y);
                if (crossedStop && Math.abs(car.x - s.x) < 4 && car.speed > 4 && !s._stopped) {
                  s._violated = true;
                  statsRef.current.safetyScore -= 20;
                  addToast('🚨 ROLLING STOP! -20 safety');
                }
              }
              s._lastY = car.y;
            }
          });
        };

        var updatePeds = function(dt) {
          pedsRef.current.forEach(function(p) {
            p.x += p.vx * dt * 2;
            p.y += p.vy * dt * 2;
            if (Math.random() < 0.005) { p.vx = (Math.random() - 0.5) * 0.5; p.vy = (Math.random() - 0.5) * 0.2; }
          });
        };

        var checkCollisions = function() {
          var car = carRef.current;
          // Following distance check
          var nearest = null;
          var nearestDist = Infinity;
          trafficRef.current.forEach(function(t) {
            var dx = t.x - car.x;
            var dy = t.y - car.y;
            var dot = Math.cos(car.heading) * dx + Math.sin(car.heading) * dy;
            if (dot > 0) {
              var dist = Math.hypot(dx, dy);
              if (dist < nearestDist) { nearestDist = dist; nearest = t; }
            }
          });
          if (nearest && car.speed > 5) {
            var safeFeet = safeFollowingFeet(car.speed * MS_TO_MPH, currentScenario.weather);
            var actualFeet = nearestDist * 10; // world units -> ft approx
            if (actualFeet < safeFeet * 0.5) {
              statsRef.current.closeFollows++;
              statsRef.current.safetyScore -= 0.1;
            }
          }
        };

        // ── RAYCASTER RENDER ──
        var castRay = function(px, py, angle, maxDist) {
          var map = mapRef.current;
          if (!map) return { dist: maxDist, hit: 2 };
          var sin = Math.sin(angle), cos = Math.cos(angle);
          for (var t = 0; t < maxDist; t += 0.05) {
            var x = px + cos * t;
            var y = py + sin * t;
            var mx = Math.floor(x);
            var my = Math.floor(y);
            if (mx < 0 || mx >= MAP_SIZE || my < 0 || my >= MAP_SIZE) return { dist: t, hit: 1 };
            var c = map[my][mx];
            if (c === 1 || c === 5 || c === 6) return { dist: t, hit: c };
          }
          return { dist: maxDist, hit: 0 };
        };

        var render = function() {
          var W = canvas.width = canvas.offsetWidth;
          var H = canvas.height = canvas.offsetHeight;
          var scn = currentScenario;

          // ── Sky + ground gradient by time/weather ──
          var isNight = scn.time === 'night';
          var isFog = scn.weather === 'fog';
          var isSnow = scn.weather === 'snow';
          var isRain = scn.weather === 'rain';
          var skyTop, skyBot, groundTop, groundBot;
          if (isNight) { skyTop = '#0a0f1e'; skyBot = '#1e293b'; groundTop = '#0a0a14'; groundBot = '#000'; }
          else if (isFog) { skyTop = '#94a3b8'; skyBot = '#cbd5e1'; groundTop = '#94a3b8'; groundBot = '#64748b'; }
          else if (isSnow) { skyTop = '#cbd5e1'; skyBot = '#e2e8f0'; groundTop = '#f1f5f9'; groundBot = '#e2e8f0'; }
          else if (isRain) { skyTop = '#475569'; skyBot = '#64748b'; groundTop = '#334155'; groundBot = '#1e293b'; }
          else { skyTop = '#60a5fa'; skyBot = '#bae6fd'; groundTop = '#334155'; groundBot = '#1e293b'; }

          var skyGrad = gfx.createLinearGradient(0, 0, 0, H / 2);
          skyGrad.addColorStop(0, skyTop); skyGrad.addColorStop(1, skyBot);
          gfx.fillStyle = skyGrad; gfx.fillRect(0, 0, W, H / 2);
          var groundGrad = gfx.createLinearGradient(0, H / 2, 0, H);
          groundGrad.addColorStop(0, groundTop); groundGrad.addColorStop(1, groundBot);
          gfx.fillStyle = groundGrad; gfx.fillRect(0, H / 2, W, H / 2);

          if (cameraModeRef.current === 'overhead') {
            renderOverhead(W, H);
          } else {
            renderRaycaster(W, H);
          }

          // Weather overlay
          if (isRain) drawRain(W, H);
          if (isSnow) drawSnow(W, H);
          if (isFog) { gfx.fillStyle = 'rgba(203,213,225,0.5)'; gfx.fillRect(0, 0, W, H); }
          if (isNight) {
            // Darken everything, then carve out headlight cones with a radial gradient.
            gfx.fillStyle = 'rgba(0,0,0,0.82)'; gfx.fillRect(0, 0, W, H);
            var cx = W / 2, cy = H / 2 + 30;
            var headRange = d.highBeams ? Math.min(W, H) * 0.8 : Math.min(W, H) * 0.5;
            var grad = gfx.createRadialGradient(cx, cy, 0, cx, cy, headRange);
            grad.addColorStop(0, 'rgba(255,247,200,0.55)');
            grad.addColorStop(0.4, 'rgba(255,247,200,0.3)');
            grad.addColorStop(0.8, 'rgba(255,247,200,0.05)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            gfx.globalCompositeOperation = 'lighter';
            gfx.fillStyle = grad;
            gfx.beginPath();
            gfx.moveTo(cx, cy);
            gfx.arc(cx, cy, headRange, Math.PI + 0.3, 2 * Math.PI - 0.3, false);
            gfx.closePath(); gfx.fill();
            gfx.globalCompositeOperation = 'source-over';
          }
          // Skid screen shake + overlay
          if (skidRef.current.active) {
            gfx.save();
            var shake = skidRef.current.intensity * 4;
            gfx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
            gfx.fillStyle = 'rgba(239,68,68,0.12)';
            gfx.fillRect(0, 0, W, H);
            gfx.restore();
            gfx.fillStyle = 'rgba(239,68,68,0.9)';
            gfx.font = 'bold 18px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⚠️ SKID — ease off & steer gently', W / 2, 160);
          }

          // HUD
          if (showHUDRef.current) drawHUD(W, H);

          // Pause overlay
          if (pausedRef.current) {
            gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(0, 0, W, H);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 32px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⏸ PAUSED', W / 2, H / 2);
            gfx.font = '14px system-ui';
            gfx.fillText('Press SPACE to resume', W / 2, H / 2 + 30);
          }
        };

        var renderRaycaster = function(W, H) {
          var car = carRef.current;
          var fov = Math.PI / 3;
          var numRays = Math.min(180, Math.floor(W / 4));
          var rayStep = fov / numRays;
          var colW = W / numRays;
          var maxDist = isFog ? 4 : isSnow ? 8 : 20;
          var hFactor = H * 0.6;
          for (var i = 0; i < numRays; i++) {
            var rayAngle = car.heading - fov / 2 + i * rayStep;
            var r = castRay(car.x, car.y, rayAngle, maxDist);
            if (r.dist >= maxDist) continue;
            var corrected = r.dist * Math.cos(rayAngle - car.heading);
            var wallH = hFactor / corrected;
            var y0 = H / 2 - wallH / 2;
            var shade = Math.max(0.2, 1 - corrected / maxDist);
            var color;
            if (r.hit === 1) color = 'rgba(' + Math.round(180*shade) + ',' + Math.round(140*shade) + ',' + Math.round(100*shade) + ',1)';
            else if (r.hit === 5) color = 'rgba(' + Math.round(40*shade) + ',' + Math.round(120*shade) + ',' + Math.round(40*shade) + ',1)';
            else color = 'rgba(' + Math.round(120*shade) + ',' + Math.round(120*shade) + ',' + Math.round(140*shade) + ',1)';
            gfx.fillStyle = color;
            gfx.fillRect(i * colW, y0, colW + 1, wallH);
          }

          // Draw centerline dashes on ground using projection
          drawRoadMarkings(W, H);
          // Draw traffic and peds as billboards
          drawBillboards(W, H, maxDist);
        };

        var drawRoadMarkings = function(W, H) {
          gfx.save();
          // Draw simple perspective road lines receding to horizon
          var horizonY = H / 2;
          for (var step = 1; step < 12; step++) {
            var z = step * 1.2;
            var screenY = horizonY + (H / 2) * (1 / z);
            var lineW = W * (1 / z) * 0.1;
            gfx.fillStyle = 'rgba(250,204,21,' + Math.max(0.1, 1 - z / 12) + ')';
            gfx.fillRect(W / 2 - lineW / 2, screenY - 2, lineW, 4);
          }
          gfx.restore();
        };

        var drawBillboards = function(W, H, maxDist) {
          var car = carRef.current;
          var all = [];
          trafficRef.current.forEach(function(t) { all.push({ x: t.x, y: t.y, color: t.color, type: 'car', size: t.type === 'truck' ? 1.5 : 1 }); });
          pedsRef.current.forEach(function(p) { all.push({ x: p.x, y: p.y, color: p.color, type: 'ped', size: 0.4 }); });
          signalsRef.current.forEach(function(s) {
            var col = s.type === 'stop' ? '#ef4444' : (s.state === 'green' ? '#22c55e' : s.state === 'yellow' ? '#fbbf24' : '#ef4444');
            all.push({ x: s.x, y: s.y, color: col, type: s.type === 'stop' ? 'stopSign' : 'signal', size: 0.9 });
          });
          cyclistsRef.current.forEach(function(cy) {
            all.push({ x: cy.x, y: cy.y, color: cy.type === 'motorcycle' ? '#0f172a' : '#fbbf24', type: cy.type, size: cy.type === 'motorcycle' ? 0.7 : 0.55 });
          });
          if (wildlifeRef.current) {
            var w = wildlifeRef.current;
            all.push({ x: w.x, y: w.y, color: '#fff', type: 'wildlife', icon: w.icon, size: w.mass === 'massive' ? 1.8 : w.mass === 'medium' ? 1.2 : 0.6 });
          }
          // Sort back to front
          all.sort(function(a, b) {
            var da = Math.hypot(a.x - car.x, a.y - car.y);
            var db = Math.hypot(b.x - car.x, b.y - car.y);
            return db - da;
          });
          all.forEach(function(obj) {
            var dx = obj.x - car.x;
            var dy = obj.y - car.y;
            var dist = Math.hypot(dx, dy);
            if (dist > maxDist || dist < 0.3) return;
            var angle = Math.atan2(dy, dx) - car.heading;
            // Wrap angle
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            if (Math.abs(angle) > Math.PI / 3) return;
            var fov = Math.PI / 3;
            var screenX = W / 2 + (angle / (fov / 2)) * (W / 2);
            var size = (H * 0.3 * obj.size) / dist;
            var y0 = H / 2 - size / 2;
            gfx.fillStyle = obj.color;
            if (obj.type === 'ped') {
              // stick figure
              gfx.beginPath(); gfx.arc(screenX, y0 + size * 0.2, size * 0.15, 0, Math.PI * 2); gfx.fill();
              gfx.fillRect(screenX - size * 0.08, y0 + size * 0.35, size * 0.16, size * 0.6);
            } else if (obj.type === 'stopSign') {
              // Octagon stop sign on a pole
              gfx.fillStyle = '#475569';
              gfx.fillRect(screenX - size * 0.04, y0 + size * 0.4, size * 0.08, size * 0.6);
              gfx.fillStyle = '#dc2626';
              gfx.beginPath();
              for (var oi = 0; oi < 8; oi++) {
                var oa = oi * Math.PI / 4 + Math.PI / 8;
                var ox = screenX + Math.cos(oa) * size * 0.35;
                var oy = (y0 + size * 0.3) + Math.sin(oa) * size * 0.35;
                if (oi === 0) gfx.moveTo(ox, oy); else gfx.lineTo(ox, oy);
              }
              gfx.closePath(); gfx.fill();
              gfx.fillStyle = '#fff'; gfx.font = 'bold ' + Math.max(8, size * 0.18) + 'px system-ui'; gfx.textAlign = 'center';
              gfx.fillText('STOP', screenX, y0 + size * 0.34);
            } else if (obj.type === 'signal') {
              // Traffic light box with three lamps
              gfx.fillStyle = '#1e293b';
              gfx.fillRect(screenX - size * 0.18, y0, size * 0.36, size * 0.9);
              ['#ef4444', '#fbbf24', '#22c55e'].forEach(function(c, li) {
                var cy = y0 + size * 0.18 + li * size * 0.27;
                gfx.fillStyle = (c === obj.color) ? c : '#0f172a';
                gfx.beginPath(); gfx.arc(screenX, cy, size * 0.1, 0, Math.PI * 2); gfx.fill();
                if (c === obj.color) {
                  gfx.fillStyle = c + '88';
                  gfx.beginPath(); gfx.arc(screenX, cy, size * 0.18, 0, Math.PI * 2); gfx.fill();
                }
              });
            } else if (obj.type === 'wildlife') {
              gfx.font = Math.max(20, size * 30) + 'px system-ui';
              gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
              gfx.fillText(obj.icon, screenX, y0 + size * 0.4);
              gfx.textBaseline = 'alphabetic';
            } else if (obj.type === 'cyclist') {
              // helmet + torso
              gfx.fillStyle = '#fbbf24';
              gfx.beginPath(); gfx.arc(screenX, y0 + size * 0.15, size * 0.13, 0, Math.PI * 2); gfx.fill();
              gfx.fillStyle = '#06b6d4';
              gfx.fillRect(screenX - size * 0.12, y0 + size * 0.28, size * 0.24, size * 0.35);
              // bike frame
              gfx.strokeStyle = '#fff'; gfx.lineWidth = 1.5;
              gfx.beginPath(); gfx.moveTo(screenX - size * 0.15, y0 + size * 0.8); gfx.lineTo(screenX + size * 0.15, y0 + size * 0.8); gfx.stroke();
              // wheels
              gfx.beginPath(); gfx.arc(screenX - size * 0.18, y0 + size * 0.85, size * 0.1, 0, Math.PI * 2); gfx.stroke();
              gfx.beginPath(); gfx.arc(screenX + size * 0.18, y0 + size * 0.85, size * 0.1, 0, Math.PI * 2); gfx.stroke();
            } else if (obj.type === 'motorcycle') {
              gfx.fillStyle = '#1e293b';
              gfx.fillRect(screenX - size * 0.18, y0 + size * 0.3, size * 0.36, size * 0.4);
              gfx.fillStyle = '#ef4444';
              gfx.beginPath(); gfx.arc(screenX, y0 + size * 0.15, size * 0.12, 0, Math.PI * 2); gfx.fill();
              gfx.fillStyle = '#000';
              gfx.beginPath(); gfx.arc(screenX - size * 0.2, y0 + size * 0.85, size * 0.14, 0, Math.PI * 2); gfx.fill();
              gfx.beginPath(); gfx.arc(screenX + size * 0.2, y0 + size * 0.85, size * 0.14, 0, Math.PI * 2); gfx.fill();
            } else {
              gfx.fillRect(screenX - size * 0.5, y0, size, size * 0.7);
              gfx.fillStyle = 'rgba(0,0,0,0.4)';
              gfx.fillRect(screenX - size * 0.4, y0 + size * 0.1, size * 0.3, size * 0.15);
              gfx.fillRect(screenX + size * 0.1, y0 + size * 0.1, size * 0.3, size * 0.15);
              // brake lights
              gfx.fillStyle = '#ef4444';
              gfx.fillRect(screenX - size * 0.45, y0 + size * 0.45, size * 0.1, size * 0.08);
              gfx.fillRect(screenX + size * 0.35, y0 + size * 0.45, size * 0.1, size * 0.08);
            }
          });
        };

        var renderOverhead = function(W, H) {
          var map = mapRef.current;
          if (!map) return;
          gfx.fillStyle = '#0f172a'; gfx.fillRect(0, 0, W, H);
          var cellSize = Math.min(W, H) / MAP_SIZE;
          for (var y = 0; y < MAP_SIZE; y++) {
            for (var x = 0; x < MAP_SIZE; x++) {
              var c = map[y][x];
              var col;
              if (c === 0) col = '#334155';
              else if (c === 1) col = '#92400e';
              else if (c === 2) col = '#166534';
              else if (c === 3) col = '#facc15';
              else if (c === 5) col = '#14532d';
              else col = '#1e293b';
              gfx.fillStyle = col;
              gfx.fillRect(x * cellSize, y * cellSize, cellSize + 1, cellSize + 1);
            }
          }
          // Draw traffic
          trafficRef.current.forEach(function(t) {
            gfx.fillStyle = t.color;
            gfx.fillRect(t.x * cellSize - 3, t.y * cellSize - 3, 6, 6);
          });
          // Draw pedestrians
          pedsRef.current.forEach(function(p) {
            gfx.fillStyle = p.color;
            gfx.beginPath(); gfx.arc(p.x * cellSize, p.y * cellSize, 2, 0, Math.PI * 2); gfx.fill();
          });
          // Signals
          signalsRef.current.forEach(function(s) {
            var col = s.type === 'stop' ? '#ef4444' : (s.state === 'green' ? '#22c55e' : s.state === 'yellow' ? '#fbbf24' : '#ef4444');
            gfx.fillStyle = col;
            gfx.fillRect(s.x * cellSize - 4, s.y * cellSize - 4, 8, 8);
          });
          // Cyclists + motorcycles
          cyclistsRef.current.forEach(function(cy) {
            gfx.fillStyle = cy.type === 'motorcycle' ? '#ef4444' : '#fbbf24';
            gfx.beginPath(); gfx.arc(cy.x * cellSize, cy.y * cellSize, 3, 0, Math.PI * 2); gfx.fill();
          });
          // Wildlife
          if (wildlifeRef.current) {
            var w = wildlifeRef.current;
            gfx.font = '16px system-ui'; gfx.textAlign = 'center'; gfx.textBaseline = 'middle';
            gfx.fillText(w.icon, w.x * cellSize, w.y * cellSize);
            gfx.textBaseline = 'alphabetic';
          }
          // Draw car
          var car = carRef.current;
          gfx.save();
          gfx.translate(car.x * cellSize, car.y * cellSize);
          gfx.rotate(car.heading);
          gfx.fillStyle = '#22d3ee';
          gfx.fillRect(-5, -3, 10, 6);
          gfx.fillStyle = '#0ea5e9';
          gfx.fillRect(3, -3, 2, 6);
          gfx.restore();
        };

        var drawRain = function(W, H) {
          gfx.strokeStyle = 'rgba(186,230,253,0.6)';
          gfx.lineWidth = 1;
          for (var i = 0; i < 100; i++) {
            var rx = (Math.random() * W);
            var ry = (Math.random() * H);
            gfx.beginPath(); gfx.moveTo(rx, ry); gfx.lineTo(rx - 3, ry + 10); gfx.stroke();
          }
        };

        var drawSnow = function(W, H) {
          gfx.fillStyle = 'rgba(255,255,255,0.8)';
          for (var i = 0; i < 60; i++) {
            var sx = (Math.random() * W);
            var sy = (Math.random() * H);
            gfx.beginPath(); gfx.arc(sx, sy, 1.5, 0, Math.PI * 2); gfx.fill();
          }
        };

        var drawHUD = function(W, H) {
          var car = carRef.current;
          var scn = currentScenario;
          var veh = currentVehicle;
          var speedMph = Math.round(car.speed * MS_TO_MPH);
          var stats = statsRef.current;
          var avgMpg = stats.mpgSamples > 0 ? (stats.mpgSum / stats.mpgSamples) : 0;

          // Bottom HUD bar
          gfx.fillStyle = 'rgba(0,0,0,0.75)';
          gfx.fillRect(0, H - 90, W, 90);
          gfx.strokeStyle = '#22d3ee';
          gfx.lineWidth = 2;
          gfx.strokeRect(0, H - 90, W, 90);

          // Speedometer
          gfx.fillStyle = speedMph > scn.speedLimit + 5 ? '#ef4444' : speedMph > scn.speedLimit ? '#f59e0b' : '#4ade80';
          gfx.font = 'bold 42px monospace';
          gfx.textAlign = 'left';
          gfx.fillText(speedMph, 20, H - 40);
          gfx.fillStyle = '#94a3b8';
          gfx.font = '11px system-ui';
          gfx.fillText('MPH', 20, H - 18);
          gfx.fillText('LIMIT ' + scn.speedLimit, 90, H - 40);

          // Fuel gauge
          gfx.fillStyle = '#22d3ee'; gfx.font = 'bold 20px monospace'; gfx.textAlign = 'center';
          gfx.fillText(avgMpg > 0 && avgMpg < 999 ? avgMpg.toFixed(1) : '—', W / 2, H - 40);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText(veh.type === 'electric' ? 'MPGe AVG' : 'MPG AVG', W / 2, H - 22);

          // Safety + efficiency scores
          gfx.fillStyle = stats.safetyScore > 70 ? '#4ade80' : stats.safetyScore > 40 ? '#f59e0b' : '#ef4444';
          gfx.font = 'bold 18px monospace'; gfx.textAlign = 'right';
          gfx.fillText(Math.max(0, Math.round(stats.safetyScore)), W - 20, H - 50);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText('SAFETY', W - 20, H - 35);
          gfx.fillStyle = stats.efficiencyScore > 70 ? '#4ade80' : stats.efficiencyScore > 40 ? '#f59e0b' : '#ef4444';
          gfx.font = 'bold 18px monospace';
          gfx.fillText(Math.max(0, Math.round(stats.efficiencyScore)), W - 100, H - 50);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText('ECO', W - 100, H - 35);

          // Top-left: scenario info
          gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(10, 10, 220, 54);
          gfx.fillStyle = '#fff'; gfx.font = 'bold 13px system-ui'; gfx.textAlign = 'left';
          gfx.fillText(scn.icon + ' ' + scn.name, 20, 28);
          gfx.fillStyle = '#94a3b8'; gfx.font = '11px system-ui';
          gfx.fillText(veh.icon + ' ' + veh.name, 20, 44);
          gfx.fillText((cameraModeRef.current).toUpperCase() + ' VIEW — press C', 20, 58);

          // Signal-ahead HUD indicator
          var nearestSig = null;
          var nearestSigDist = Infinity;
          signalsRef.current.forEach(function(s) {
            var dy = s.y - car.y;
            var ahead = Math.abs(dy);
            if (ahead < 10 && ahead < nearestSigDist && Math.abs(s.x - car.x) < 4) {
              nearestSigDist = ahead;
              nearestSig = s;
            }
          });
          if (nearestSig && nearestSigDist < 10) {
            var sigLabel = nearestSig.type === 'stop' ? 'STOP SIGN' : nearestSig.state.toUpperCase();
            var sigCol = nearestSig.type === 'stop' ? '#ef4444' : nearestSig.state === 'green' ? '#22c55e' : nearestSig.state === 'yellow' ? '#fbbf24' : '#ef4444';
            gfx.fillStyle = sigCol;
            gfx.font = 'bold 14px monospace'; gfx.textAlign = 'center';
            gfx.fillText('● ' + sigLabel + ' AHEAD', W / 2, H - 100);
          }

          // Event toast banner (mid-screen)
          var et = eventToastRef.current;
          if (et && et.msg && timeRef.current < et.until) {
            var bannerH = 36;
            gfx.fillStyle = 'rgba(127,29,29,0.85)';
            gfx.fillRect(W * 0.1, 80, W * 0.8, bannerH);
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2;
            gfx.strokeRect(W * 0.1, 80, W * 0.8, bannerH);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 14px system-ui'; gfx.textAlign = 'center';
            gfx.fillText(et.msg, W / 2, 102);
          }

          // Speed limit sign (top-right)
          var signX = W - 70, signY = 20;
          gfx.fillStyle = '#fff';
          gfx.fillRect(signX, signY, 50, 60);
          gfx.strokeStyle = '#000'; gfx.lineWidth = 2;
          gfx.strokeRect(signX, signY, 50, 60);
          gfx.fillStyle = '#000'; gfx.font = 'bold 9px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('SPEED', signX + 25, signY + 14);
          gfx.fillText('LIMIT', signX + 25, signY + 24);
          gfx.font = 'bold 20px monospace';
          gfx.fillText(scn.speedLimit, signX + 25, signY + 48);
        };

        animRef.current = requestAnimationFrame(step);
        return function() {
          drivingRef.current = false;
          if (animRef.current) cancelAnimationFrame(animRef.current);
        };
      }, [view, currentScenario, currentVehicle]);

      // ═══════════════════════════════════════════
      // UI RENDERING (menus, lessons, permit test, debrief, driving)
      // ═══════════════════════════════════════════

      // ── MENU VIEW ──
      if (view === 'menu') {
        return h('div', { style: { padding: '20px', maxWidth: '960px', margin: '0 auto', color: '#e2e8f0' } },
          // Header
          h('div', { style: { textAlign: 'center', marginBottom: '20px' } },
            h('div', { style: { fontSize: '48px' } }, '🚗'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '4px' } }, 'RoadReady'),
            h('div', { style: { fontSize: '13px', color: '#94a3b8' } }, "Driver's Ed & Automotive Science — Maine edition"),
            h('div', { style: { fontSize: '11px', color: '#64748b', marginTop: '4px' } }, "Learn the physics. Pass the test. Drive safer.")
          ),
          // Four main sections
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' } },
            h('button', { onClick: function() { upd('view', 'scenarioSelect'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #22d3ee', background: 'linear-gradient(135deg, #0c4a6e, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '🛣️'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Drive Simulator'),
              h('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' } }, '12 scenarios. Real physics. Maine roads.')
            ),
            h('button', { onClick: function() { upd('view', 'permitStart'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #fbbf24', background: 'linear-gradient(135deg, #78350f, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '📝'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Permit Test'),
              h('div', { style: { fontSize: '11px', color: '#fcd34d', marginTop: '4px' } }, PERMIT_BANK.length + ' questions. Maine BMV format.')
            ),
            h('button', { onClick: function() { upd('view', 'lessonSelect'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #a78bfa', background: 'linear-gradient(135deg, #4c1d95, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '📚'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Auto Science'),
              h('div', { style: { fontSize: '11px', color: '#ddd6fe', marginTop: '4px' } }, Object.keys(LESSONS).length + ' physics lessons')
            ),
            h('button', { onClick: function() { upd('view', 'signsView'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #4ade80', background: 'linear-gradient(135deg, #14532d, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '🪧'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Signs & Signals'),
              h('div', { style: { fontSize: '11px', color: '#bbf7d0', marginTop: '4px' } }, 'Color & shape meanings')
            ),
            h('button', { onClick: function() { upd('view', 'stoppingLab'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #f87171', background: 'linear-gradient(135deg, #7f1d1d, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '🛑'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Stopping Distance Lab'),
              h('div', { style: { fontSize: '11px', color: '#fecaca', marginTop: '4px' } }, 'Live physics: v, μ, reaction time')
            ),
            h('button', { onClick: function() { upd('view', 'parking'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #06b6d4', background: 'linear-gradient(135deg, #164e63, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '🅿️'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Parallel Parking'),
              h('div', { style: { fontSize: '11px', color: '#a5f3fc', marginTop: '4px' } }, '2D top-down with step guidance')
            ),
            h('button', { onClick: function() { upd('view', 'hypermilingLab'); },
              style: { padding: '20px', borderRadius: '12px', border: '2px solid #10b981', background: 'linear-gradient(135deg, #064e3b, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '32px' } }, '🌿'),
              h('div', { style: { fontSize: '14px', fontWeight: 800, marginTop: '6px' } }, 'Hypermiling Lab'),
              h('div', { style: { fontSize: '11px', color: '#bbf7d0', marginTop: '4px' } }, 'MPG vs speed graph — beat the EPA')
            )
          ),
          // Second row of tools
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' } },
            h('button', { onClick: function() { upd('view', 'maineWinter'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #38bdf8', background: 'linear-gradient(135deg, #0c4a6e, #1e3a5f)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '❄️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Maine Winter Guide'),
              h('div', { style: { fontSize: '10px', color: '#bae6fd', marginTop: '2px' } }, 'Moose, ice, snow kit, tires')
            ),
            h('button', { onClick: function() { upd('view', 'roundaboutGuide'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f59e0b', background: 'linear-gradient(135deg, #78350f, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔄'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Roundabout Tutorial'),
              h('div', { style: { fontSize: '10px', color: '#fde68a', marginTop: '2px' } }, 'Yield, enter, exit — step by step')
            ),
            h('button', { onClick: function() { upd('view', 'vehicleCompare'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #8b5cf6', background: 'linear-gradient(135deg, #4c1d95, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔬'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Vehicle Science'),
              h('div', { style: { fontSize: '10px', color: '#ddd6fe', marginTop: '2px' } }, 'Compare specs, Cd, mass, MPG')
            )
          ),
          // Maine facts strip
          h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #334155', marginBottom: '16px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '8px' } }, '🌲 Maine state rules at a glance'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '11px', color: '#cbd5e1' } },
              h('div', null, '• Permit age: ', h('b', null, MAINE_RULES.permitAge)),
              h('div', null, '• Supervised hours: ', h('b', null, MAINE_RULES.supervisedHours)),
              h('div', null, '• BAC limit (21+): ', h('b', null, '0.08%')),
              h('div', null, '• Phone use: ', h('b', null, 'BANNED (all handheld)')),
              h('div', null, '• Studded tires: ', h('b', null, 'Oct 1–May 1')),
              h('div', null, '• Headlights: ', h('b', null, 'ON when wipers on'))
            )
          ),
          // Stats
          drivingStats ? h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8' } },
            h('div', { style: { color: '#22d3ee', fontWeight: 700, marginBottom: '4px' } }, 'Last drive: ' + drivingStats.scenario),
            h('div', null, 'Safety ' + drivingStats.safetyScore + ' · Eco ' + drivingStats.efficiencyScore + ' · ' + drivingStats.avgMPG + ' MPG avg · ' + drivingStats.distance_mi + ' mi')
          ) : null
        );
      }

      // ── SCENARIO SELECT ──
      if (view === 'scenarioSelect') {
        return h('div', { style: { padding: '20px', maxWidth: '1000px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('h3', { style: { fontSize: '18px', fontWeight: 900, marginBottom: '4px' } }, 'Choose Your Scenario'),
          h('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '14px' } }, 'Start easy. Residential 25 mph is where real learners begin.'),
          // Vehicle selector
          h('div', { style: { marginBottom: '16px', padding: '12px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '8px' } }, 'Vehicle'),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              VEHICLES.map(function(v) {
                var sel = v.id === selectedVehicle;
                return h('button', { key: v.id, onClick: function() { upd('vehicle', v.id); },
                  style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid ' + (sel ? '#22d3ee' : '#334155'), background: sel ? '#0c4a6e' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } },
                  v.icon + ' ' + v.name);
              })
            ),
            h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '8px' } }, currentVehicle.desc),
            h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '4px' } },
              '🔬 Mass ' + currentVehicle.mass + ' kg · Cd ' + currentVehicle.cd + ' · A ' + currentVehicle.area + ' m² · EPA ' + currentVehicle.cityMPG + '/' + currentVehicle.hwyMPG + ' mpg')
          ),
          // Scenario grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' } },
            SCENARIOS.map(function(s) {
              var diffDots = '★'.repeat(s.difficulty) + '☆'.repeat(5 - s.difficulty);
              return h('button', { key: s.id, onClick: function() { startDriving(s.id, selectedVehicle); },
                style: { padding: '14px', borderRadius: '10px', border: '1px solid #334155', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { style: { fontSize: '20px' } }, s.icon),
                  h('span', { style: { fontSize: '9px', color: '#fbbf24' } }, diffDots)
                ),
                h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, s.name),
                h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '2px' } }, s.speedLimit + ' mph · ' + s.weather + ' · ' + s.time),
                h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' } }, s.desc)
              );
            })
          )
        );
      }

      // ── DRIVING VIEW ──
      if (view === 'driving') {
        return h('div', { style: { position: 'relative', width: '100%', height: '100%', minHeight: '520px', maxHeight: 'calc(100vh - 80px)', background: '#000', borderRadius: '12px', overflow: 'hidden' } },
          h('canvas', {
            ref: canvasRef,
            role: 'application',
            'aria-label': 'RoadReady driving simulator. W/S throttle and brake, A/D steering, C camera toggle, Space pause.',
            tabIndex: 0,
            style: { width: '100%', height: '100%', display: 'block', outline: 'none' }
          }),
          // Controls legend
          h('div', { style: { position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 } },
            h('button', { onClick: exitDriving,
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.8)', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '✕ End Drive'),
            h('button', { onClick: function() { pausedRef.current = !pausedRef.current; },
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '⏸ Pause'),
            h('button', { onClick: function() {
              var modes = ['cockpit', 'chase', 'overhead'];
              cameraModeRef.current = modes[(modes.indexOf(cameraModeRef.current) + 1) % modes.length];
            },
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '📷 Camera'),
            h('button', { onClick: function() { upd('highBeams', !d.highBeams); },
              style: { padding: '6px 10px', borderRadius: '6px', background: d.highBeams ? 'rgba(251,191,36,0.4)' : 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid ' + (d.highBeams ? '#fbbf24' : 'rgba(255,255,255,0.2)'), fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, d.highBeams ? '💡 HIGH' : '💡 LOW')
          ),
          h('div', { style: { position: 'absolute', bottom: '100px', left: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', color: '#cbd5e1', fontSize: '10px', zIndex: 10 } },
            'W/↑ Accel · S/↓ Brake · A/← Left · D/→ Right · C Camera · L Beams · Q Horn · H HUD · SPACE Pause'
          )
        );
      }

      // ── LESSON SELECT ──
      if (view === 'lessonSelect') {
        return h('div', { style: { padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('h3', { style: { fontSize: '18px', fontWeight: 900, marginBottom: '4px' } }, 'Automotive Science Lessons'),
          h('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '14px' } }, 'Real physics behind every driving decision.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' } },
            Object.keys(LESSONS).map(function(key) {
              var les = LESSONS[key];
              return h('button', { key: key, onClick: function() { updMulti({ view: 'lesson', lesson: key }); },
                style: { padding: '14px', borderRadius: '10px', border: '1px solid #334155', background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
                h('div', { style: { fontSize: '28px' } }, les.icon),
                h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, les.title),
                h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '4px' } }, les.formula)
              );
            })
          )
        );
      }

      // ── LESSON VIEW ──
      if (view === 'lesson' && selectedLesson && LESSONS[selectedLesson]) {
        var les = LESSONS[selectedLesson];
        return h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'lessonSelect'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Lessons'),
          h('div', { style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '14px', padding: '24px', border: '1px solid #334155' } },
            h('div', { style: { fontSize: '42px', textAlign: 'center' } }, les.icon),
            h('h2', { style: { fontSize: '20px', fontWeight: 900, textAlign: 'center', marginBottom: '14px' } }, les.title),
            h('p', { style: { fontSize: '13px', lineHeight: '1.7', color: '#cbd5e1', marginBottom: '14px' } }, les.content),
            h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '4px' } }, 'Formula'),
              h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#22d3ee', fontFamily: 'monospace', marginBottom: '6px' } }, les.formula),
              h('div', { style: { fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' } }, les.variables)
            ),
            h('div', { style: { background: 'rgba(251,191,36,0.08)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(251,191,36,0.3)' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '4px' } }, 'Practice'),
              h('div', { style: { fontSize: '11px', color: '#fcd34d' } }, les.practice)
            )
          )
        );
      }

      // ── SIGNS VIEW ──
      if (view === 'signsView') {
        return h('div', { style: { padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('h3', { style: { fontSize: '18px', fontWeight: 900, marginBottom: '4px' } }, 'Road Signs: Color & Shape Semantics'),
          h('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '14px' } }, 'Recognize meaning at a glance, even before reading the words.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' } },
            SIGN_CATEGORIES.map(function(s, i) {
              return h('div', { key: i, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', borderLeft: '4px solid ' + s.color } },
                h('div', { style: { fontSize: '13px', fontWeight: 800, color: s.color, marginBottom: '4px' } }, s.category),
                h('div', { style: { fontSize: '10px', color: '#94a3b8', marginBottom: '6px' } }, s.colorName),
                h('div', { style: { fontSize: '11px', color: '#cbd5e1', marginBottom: '6px', lineHeight: '1.5' } }, s.meaning),
                h('div', { style: { fontSize: '10px', color: '#64748b' } }, 'e.g., ' + s.examples.slice(0, 3).join(', '))
              );
            })
          )
        );
      }

      // ── PERMIT START ──
      if (view === 'permitStart') {
        return h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #78350f, #0f172a)', borderRadius: '14px', padding: '28px', textAlign: 'center', border: '1px solid #fbbf24' } },
            h('div', { style: { fontSize: '48px' } }, '📝'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '6px' } }, 'Maine BMV Permit Test'),
            h('div', { style: { fontSize: '12px', color: '#fcd34d', marginBottom: '14px' } }, "Mirrors the real test: randomized questions from a bank of " + PERMIT_BANK.length + ". You must score 80% to pass."),
            h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', fontSize: '11px', color: '#cbd5e1', textAlign: 'left', marginBottom: '16px' } },
              h('div', { style: { marginBottom: '6px' } }, '• 20 questions per session (real test: 40)'),
              h('div', { style: { marginBottom: '6px' } }, '• Pass at 16 correct (80%)'),
              h('div', { style: { marginBottom: '6px' } }, '• Each wrong answer shows the explanation'),
              h('div', null, '• Maine-specific rules mixed with federal basics')
            ),
            h('button', { onClick: function() {
              var shuffled = PERMIT_BANK.slice().sort(function() { return Math.random() - 0.5; });
              var qs = shuffled.slice(0, 20);
              updMulti({ view: 'permit', permit: { questions: qs, index: 0, answers: [], score: 0, done: false } });
            },
              style: { padding: '12px 28px', borderRadius: '10px', border: 'none', background: '#fbbf24', color: '#78350f', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }
            }, '🚦 Start Test')
          )
        );
      }

      // ── PERMIT TEST VIEW ──
      if (view === 'permit' && permitState) {
        if (permitState.done) {
          var passed = permitState.score >= 16;
          return h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto', color: '#e2e8f0' } },
            h('div', { style: { background: 'linear-gradient(135deg, ' + (passed ? '#14532d' : '#7f1d1d') + ', #0f172a)', borderRadius: '14px', padding: '28px', textAlign: 'center', border: '2px solid ' + (passed ? '#4ade80' : '#ef4444') } },
              h('div', { style: { fontSize: '64px' } }, passed ? '🎉' : '📋'),
              h('h2', { style: { fontSize: '24px', fontWeight: 900, marginBottom: '6px' } }, passed ? 'PASSED!' : 'Keep Studying'),
              h('div', { style: { fontSize: '16px', color: passed ? '#4ade80' : '#fca5a5', marginBottom: '14px' } }, 'Score: ' + permitState.score + ' / 20 (' + Math.round(permitState.score / 20 * 100) + '%)'),
              h('div', { style: { fontSize: '12px', color: '#cbd5e1', marginBottom: '16px' } }, passed ? 'You would pass the real test. Keep practicing in the simulator to build real driving skills!' : 'Need 16/20 (80%) to pass. Review the explanations, re-read the lessons, and try again.'),
              h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
                h('button', { onClick: function() { upd('view', 'permitStart'); },
                  style: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#fbbf24', color: '#78350f', fontSize: '12px', fontWeight: 800, cursor: 'pointer' } }, '🔁 Retake'),
                h('button', { onClick: function() { upd('view', 'menu'); },
                  style: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #64748b', background: 'transparent', color: '#cbd5e1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '🏠 Menu')
              )
            )
          );
        }
        var q = permitState.questions[permitState.index];
        var lastAns = permitState.answers[permitState.index];
        return h('div', { style: { padding: '20px', maxWidth: '680px', margin: '0 auto', color: '#e2e8f0' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', color: '#94a3b8' } }, 'Question ' + (permitState.index + 1) + ' of ' + permitState.questions.length),
            h('div', { style: { fontSize: '11px', color: '#fbbf24', fontWeight: 700 } }, '✓ ' + permitState.score + '  ✗ ' + (permitState.answers.filter(function(a) { return a !== null && a.correct === false; }).length))
          ),
          // Progress bar
          h('div', { style: { height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '16px' } },
            h('div', { style: { height: '100%', background: '#fbbf24', borderRadius: '2px', width: ((permitState.index) / permitState.questions.length * 100) + '%' } })
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '18px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { fontSize: '14px', fontWeight: 700, lineHeight: '1.5', marginBottom: '14px' } }, q.q),
            q.a.map(function(opt, i) {
              var chosen = lastAns && lastAns.chosen === i;
              var correct = i === q.correct;
              var showResult = !!lastAns;
              var bg, border;
              if (showResult) {
                if (correct) { bg = 'rgba(74,222,128,0.15)'; border = '#4ade80'; }
                else if (chosen) { bg = 'rgba(239,68,68,0.15)'; border = '#ef4444'; }
                else { bg = '#1e293b'; border = '#334155'; }
              } else {
                bg = '#1e293b'; border = '#334155';
              }
              return h('button', { key: i, disabled: showResult,
                onClick: function() {
                  var isCorrect = i === q.correct;
                  var newAnswers = permitState.answers.slice();
                  newAnswers[permitState.index] = { chosen: i, correct: isCorrect };
                  upd('permit', Object.assign({}, permitState, { answers: newAnswers, score: permitState.score + (isCorrect ? 1 : 0) }));
                },
                style: { display: 'block', width: '100%', padding: '10px 14px', marginBottom: '6px', borderRadius: '8px', border: '1px solid ' + border, background: bg, color: '#fff', cursor: showResult ? 'default' : 'pointer', textAlign: 'left', fontSize: '12px' }
              }, String.fromCharCode(65 + i) + '. ' + opt);
            }),
            lastAns ? h('div', { style: { marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', fontSize: '11px', color: '#a5f3fc', lineHeight: '1.5' } },
              h('b', null, lastAns.correct ? '✓ Correct. ' : '✗ Incorrect. '), q.exp
            ) : null
          ),
          lastAns ? h('button', { onClick: function() {
            if (permitState.index + 1 >= permitState.questions.length) {
              upd('permit', Object.assign({}, permitState, { done: true }));
            } else {
              upd('permit', Object.assign({}, permitState, { index: permitState.index + 1 }));
            }
          },
            style: { padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#22d3ee', color: '#0f172a', fontSize: '13px', fontWeight: 800, cursor: 'pointer', width: '100%' }
          }, permitState.index + 1 >= permitState.questions.length ? 'Finish Test →' : 'Next Question →') : null
        );
      }

      // ── DEBRIEF VIEW ──
      if (view === 'debrief' && drivingStats) {
        var grade, gradeColor;
        var combined = (drivingStats.safetyScore + drivingStats.efficiencyScore) / 2;
        if (combined >= 90) { grade = '🏆 Outstanding'; gradeColor = '#fbbf24'; }
        else if (combined >= 75) { grade = '🌟 Great Drive'; gradeColor = '#4ade80'; }
        else if (combined >= 60) { grade = '👍 Good'; gradeColor = '#60a5fa'; }
        else if (combined >= 40) { grade = '📝 Keep Practicing'; gradeColor = '#f59e0b'; }
        else { grade = '⚠️ More Training Needed'; gradeColor = '#ef4444'; }

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('div', { style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '14px', padding: '24px', border: '1px solid #334155' } },
            h('div', { style: { textAlign: 'center', marginBottom: '14px' } },
              h('div', { style: { fontSize: '48px' } }, '🚗'),
              h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Drive Debrief'),
              h('div', { style: { fontSize: '14px', color: gradeColor, fontWeight: 800, marginTop: '4px' } }, grade),
              h('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' } }, drivingStats.scenario + ' · ' + drivingStats.vehicle)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' } },
              [['⏱️', drivingStats.time, 'Drive Time'],
               ['📏', drivingStats.distance_mi + ' mi', 'Distance'],
               ['💨', drivingStats.maxSpeed + ' mph', 'Max Speed'],
               ['⛽', drivingStats.avgMPG, 'Avg MPG'],
               ['🛡️', drivingStats.safetyScore, 'Safety Score'],
               ['🌿', drivingStats.efficiencyScore, 'Eco Score'],
               ['⚠️', drivingStats.hardBrakes, 'Hard Brakes'],
               ['💥', drivingStats.crashes, 'Crashes']
              ].map(function(stat) {
                return h('div', { key: stat[2], style: { background: '#020617', borderRadius: '8px', padding: '10px', textAlign: 'center', border: '1px solid #1e293b' } },
                  h('div', { style: { fontSize: '16px' } }, stat[0]),
                  h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#22d3ee', marginTop: '2px' } }, stat[1]),
                  h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, stat[2])
                );
              })
            ),
            // Coaching tips
            h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '14px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' } }, '💡 Coach\'s Feedback'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } },
                drivingStats.jackrabbits > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #f59e0b' } }, '🚀 ' + drivingStats.jackrabbits + ' jackrabbit starts — every hard acceleration wastes fuel. Imagine an egg between your foot and the pedal.') : null,
                drivingStats.hardBrakes > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '🛑 ' + drivingStats.hardBrakes + ' hard brakes — hard braking means you were not reading the road ahead. Look 15 seconds down the road, not at the car in front of you.') : null,
                drivingStats.speedViolations > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '⚠️ Speed limit exceeded for ' + Math.round(drivingStats.speedViolations) + 's total. Remember: braking distance grows with v². A little faster = a lot more stopping distance.') : null,
                drivingStats.closeFollows > 5 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #f59e0b' } }, '👀 Following too close. Use the 3-second rule. Pick a fixed point ahead. Count after the car in front passes it.') : null,
                drivingStats.crashes === 0 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #4ade80' } }, '✅ Zero crashes! That is the baseline real drivers are measured against.') : null,
                drivingStats.skidSeconds > 1 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '🛞 You skidded for ' + drivingStats.skidSeconds + 's. Remember: brake BEFORE turns, not during. The friction circle has a fixed budget — use it for braking OR steering, not both.') : null,
                drivingStats.cyclistClose > 0 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #fbbf24' } }, '🚴 ' + drivingStats.cyclistClose + ' close pass(es) to cyclists. Maine requires 3 feet minimum. Cross the centerline to pass if the oncoming lane is clear.') : null,
                parseFloat(drivingStats.avgMPG) > currentVehicle.cityMPG ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #4ade80' } }, '🌿 Beat the EPA sticker average. Hypermiling working!') : null
              )
            ),
            h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
              h('button', { onClick: function() { upd('view', 'scenarioSelect'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#22d3ee', color: '#0f172a', fontSize: '13px', fontWeight: 800, cursor: 'pointer' } }, '🔁 Drive Again'),
              h('button', { onClick: function() { upd('view', 'menu'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #64748b', background: 'transparent', color: '#cbd5e1', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '🏠 Menu')
            )
          )
        );
      }

      // ── MAINE WINTER GUIDE ──
      if (view === 'maineWinter') {
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #0c4a6e, #1e3a5f)', borderRadius: '14px', padding: '20px', border: '1px solid #38bdf8', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '❄️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Maine Winter Driving Survival Guide'),
            h('div', { style: { fontSize: '11px', color: '#bae6fd' } }, 'The skills that keep Mainers alive from November to April.')
          ),
          // Winter prep
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' } }, '🧊 Before You Drive'),
            MAINE_RULES.winterRules.map(function(rule, i) {
              return h('div', { key: i, style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '10px', borderLeft: '2px solid #22d3ee', marginBottom: '6px' } }, rule);
            })
          ),
          // Moose + deer
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '28px', textAlign: 'center', marginBottom: '4px' } }, '🫎'),
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#fbbf24', textAlign: 'center', marginBottom: '6px' } }, 'Moose'),
              h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } }, MAINE_RULES.mooseWarning)
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '28px', textAlign: 'center', marginBottom: '4px' } }, '🦌'),
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#fbbf24', textAlign: 'center', marginBottom: '6px' } }, 'Deer'),
              h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } }, MAINE_RULES.deerWarning)
            )
          ),
          // Fog + tires
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '28px', textAlign: 'center', marginBottom: '4px' } }, '🌫️'),
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#94a3b8', textAlign: 'center', marginBottom: '6px' } }, 'Coastal Fog'),
              h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } }, MAINE_RULES.coastalFog)
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '28px', textAlign: 'center', marginBottom: '4px' } }, '🛞'),
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#94a3b8', textAlign: 'center', marginBottom: '6px' } }, 'Studded/Snow Tires'),
              h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } }, MAINE_RULES.studSnowTires)
            )
          ),
          // Physics box
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '8px' } }, '🔬 The Physics of Winter'),
            h('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' } },
              'Dry road friction μ ≈ 0.72. Snow ≈ 0.22. Ice ≈ 0.10. ',
              'That means your braking distance on ice is ', h('b', null, '7× longer'), ' than on dry pavement. ',
              'At 40 mph on ice: stopping distance ≈ 600+ feet (two football fields). ',
              'At 40 mph on dry: ≈ 100 feet. ',
              'This is not opinion — it is v²/(2μg).'
            )
          )
        );
      }

      // ── ROUNDABOUT TUTORIAL ──
      if (view === 'roundaboutGuide') {
        var roundSteps = [
          { step: 1, title: 'Approach & Yield', icon: '🚗', desc: 'Slow down as you approach. Look LEFT for traffic already in the roundabout. They have the right-of-way.', tip: 'The yield sign at the entry means: give way. Stop only if needed.' },
          { step: 2, title: 'Find Your Gap', icon: '👀', desc: 'Wait for a gap in circulating traffic. Do not force your way in. Do not stop inside the roundabout.', tip: 'Count 3 seconds — if no car is arriving in 3 seconds, you can enter.' },
          { step: 3, title: 'Enter & Travel', icon: '🔄', desc: 'Enter the roundabout going COUNTERCLOCKWISE (to the right). Stay in your lane. Travel at 15-25 mph.', tip: 'In a multi-lane roundabout: right lane = first exit. Left lane = second or third exit.' },
          { step: 4, title: 'Signal & Exit', icon: '➡️', desc: 'Signal RIGHT as you approach your desired exit. Exit smoothly without stopping.', tip: 'If you miss your exit, go around again. That is the beauty of a roundabout — no penalty for looping.' },
          { step: 5, title: 'Yield to Peds', icon: '🚶', desc: 'Watch for pedestrians in the crosswalk at each exit splitter island. They have the right-of-way.', tip: 'The splitter island gives pedestrians a safe refuge between the two traffic flows.' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #78350f, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #f59e0b', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔄'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Roundabout Tutorial'),
            h('div', { style: { fontSize: '11px', color: '#fde68a' } }, 'Roundabouts reduce fatal crashes by 90% vs. signaled intersections. Here is how to use them.')
          ),
          roundSteps.map(function(rs) {
            return h('div', { key: rs.step, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px', display: 'flex', gap: '14px', alignItems: 'flex-start' } },
              h('div', { style: { fontSize: '32px', flexShrink: 0 } }, rs.icon),
              h('div', null,
                h('div', { style: { fontSize: '12px', fontWeight: 800, marginBottom: '4px' } }, 'Step ' + rs.step + ': ' + rs.title),
                h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '4px' } }, rs.desc),
                h('div', { style: { fontSize: '10px', color: '#fde68a', lineHeight: '1.4' } }, '💡 ' + rs.tip)
              )
            );
          }),
          h('button', { onClick: function() { startDriving('roundabout', selectedVehicle); },
            style: { display: 'block', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#78350f', fontSize: '14px', fontWeight: 800, cursor: 'pointer', marginTop: '10px' } }, '🔄 Practice in Simulator')
        );
      }

      // ── VEHICLE COMPARISON ──
      if (view === 'vehicleCompare') {
        return h('div', { style: { padding: '20px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #4c1d95, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #8b5cf6', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔬'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Vehicle Science Comparison'),
            h('div', { style: { fontSize: '11px', color: '#ddd6fe' } }, 'Mass, drag, area, MPG — why these numbers matter')
          ),
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } },
              h('thead', null,
                h('tr', { style: { background: '#1e293b', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' } },
                  ['', 'Vehicle', 'Mass (kg)', 'Cd', 'A (m²)', 'Cd×A', 'City MPG', 'Hwy MPG', 'Type'].map(function(col, ci) {
                    return h('th', { key: ci, style: { padding: '8px', textAlign: 'left', borderBottom: '1px solid #334155' } }, col);
                  })
                )
              ),
              h('tbody', null,
                VEHICLES.map(function(v) {
                  return h('tr', { key: v.id, style: { borderBottom: '1px solid #1e293b' } },
                    h('td', { style: { padding: '8px', fontSize: '18px' } }, v.icon),
                    h('td', { style: { padding: '8px', fontWeight: 700, color: '#fff' } }, v.name),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, v.mass),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', color: v.cd <= 0.26 ? '#4ade80' : v.cd <= 0.35 ? '#fbbf24' : '#ef4444' } }, v.cd),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, v.area),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#22d3ee' } }, (v.cd * v.area).toFixed(2)),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, v.cityMPG),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, v.hwyMPG),
                    h('td', { style: { padding: '8px', color: '#94a3b8' } }, v.type)
                  );
                })
              )
            )
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginTop: '10px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '6px' } }, '🔑 Key Insights'),
            h('div', null, '• ', h('b', null, 'Cd × A'), ' is the single number that determines drag. Lower = less fuel wasted. The EV (0.53) beats the truck (1.34) by 2.5×.'),
            h('div', null, '• ', h('b', null, 'Mass'), ' determines braking distance (heavier = slower to stop) and rolling resistance. The school bus is 7.6× heavier than the sedan.'),
            h('div', null, '• ', h('b', null, 'Stopping distance'), ' example at 55 mph: sedan ~200 ft, school bus ~480 ft (on dry). Physics is non-negotiable.'),
            h('div', null, '• Hybrid city > highway MPG because regenerative braking recovers energy in stop-and-go. Gas cars do the opposite.')
          )
        );
      }

      // ── STOPPING DISTANCE LAB ──
      if (view === 'stoppingLab') {
        var labSpeed = d.labSpeed != null ? d.labSpeed : 55;
        var labWeather = d.labWeather || 'dry';
        var labReaction = d.labReaction != null ? d.labReaction : 1.5;
        // Map 'dry' to 'clear' for friction lookup
        var fw = labWeather === 'dry' ? 'clear' : labWeather;
        var sd = stoppingDistance(labSpeed, fw, labReaction);
        var followFt = safeFollowingFeet(labSpeed, fw);
        var cruise = cruiseMPG(labSpeed, currentVehicle, fw, true);
        var resist = resistiveForce(labSpeed * MPH_TO_MS, currentVehicle, fw, true);

        var weatherOpts = [
          { id: 'dry', label: '☀️ Dry', mu: 0.72 },
          { id: 'rain', label: '🌧️ Rain', mu: 0.42 },
          { id: 'snow', label: '❄️ Snow', mu: 0.22 },
          { id: 'ice', label: '🧊 Ice', mu: 0.10 }
        ];

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #0f172a, #7f1d1d)', borderRadius: '14px', padding: '20px', border: '1px solid #ef4444', marginBottom: '14px' } },
            h('div', { style: { fontSize: '36px', textAlign: 'center' } }, '🛑'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900, textAlign: 'center' } }, 'Stopping Distance Lab'),
            h('div', { style: { fontSize: '11px', color: '#fecaca', textAlign: 'center', marginBottom: '14px' } }, 'Play with speed, weather, and reaction time. Watch the physics.')
          ),
          // Vehicle chip
          h('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '10px', textAlign: 'center' } },
            'Vehicle: ' + currentVehicle.icon + ' ' + currentVehicle.name + ' (' + currentVehicle.mass + ' kg, Cd ' + currentVehicle.cd + ')'
          ),
          // Speed slider
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } },
              h('span', { style: { fontSize: '11px', fontWeight: 700, color: '#22d3ee' } }, 'SPEED'),
              h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', fontFamily: 'monospace' } }, labSpeed + ' mph')
            ),
            h('input', { type: 'range', min: 15, max: 90, step: 5, value: labSpeed,
              onChange: function(e) { upd('labSpeed', parseInt(e.target.value, 10)); },
              style: { width: '100%', accentColor: '#22d3ee' }
            })
          ),
          // Reaction time slider
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } },
              h('span', { style: { fontSize: '11px', fontWeight: 700, color: '#22d3ee' } }, 'REACTION TIME'),
              h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', fontFamily: 'monospace' } }, labReaction.toFixed(1) + ' s')
            ),
            h('input', { type: 'range', min: 0.5, max: 3, step: 0.1, value: labReaction,
              onChange: function(e) { upd('labReaction', parseFloat(e.target.value)); },
              style: { width: '100%', accentColor: '#22d3ee' }
            }),
            h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '4px' } },
              labReaction < 1.0 ? 'Race car driver / formula 1 fit.'
                : labReaction < 1.3 ? 'Sharp teen driver, alert.'
                : labReaction < 1.7 ? 'Normal alert adult (~1.5 s is DMV standard).'
                : labReaction < 2.2 ? 'Tired, distracted, or older driver.'
                : 'Impaired / drunk / phone. Typical for 0.08% BAC drivers.'
            )
          ),
          // Weather selector
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '14px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#22d3ee', marginBottom: '8px' } }, 'ROAD CONDITION'),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              weatherOpts.map(function(w) {
                var sel = w.id === labWeather;
                return h('button', { key: w.id, onClick: function() { upd('labWeather', w.id); },
                  style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid ' + (sel ? '#22d3ee' : '#334155'), background: sel ? '#0c4a6e' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } },
                  w.label + ' (μ=' + w.mu + ')');
              })
            )
          ),
          // Results
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' } },
            h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 } }, 'Reaction Distance'),
              h('div', { style: { fontSize: '24px', fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace', marginTop: '4px' } }, Math.round(sd.reaction_ft) + ' ft'),
              h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, 'v × t = distance covered before brakes touch')
            ),
            h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 } }, 'Braking Distance'),
              h('div', { style: { fontSize: '24px', fontWeight: 900, color: '#f87171', fontFamily: 'monospace', marginTop: '4px' } }, Math.round(sd.braking_ft) + ' ft'),
              h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, 'v² / (2·μ·g) — grows with v squared')
            )
          ),
          // Total bar
          h('div', { style: { background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderRadius: '10px', padding: '16px', border: '2px solid #ef4444', textAlign: 'center', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#fecaca', textTransform: 'uppercase' } }, 'Total Stopping Distance'),
            h('div', { style: { fontSize: '42px', fontWeight: 900, color: '#fff', fontFamily: 'monospace', marginTop: '4px' } }, Math.round(sd.total_ft) + ' ft'),
            h('div', { style: { fontSize: '11px', color: '#fca5a5', marginTop: '4px' } },
              sd.total_ft > 360 ? '⚠️ That is longer than a football field (360 ft / 100 yd).' :
              sd.total_ft > 240 ? '⚠️ That is longer than a Boeing 747 (231 ft).' :
              sd.total_ft > 120 ? 'That is longer than a blue whale (100 ft).' :
              'Roughly a basketball court length.'
            )
          ),
          // Physics details panel
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' } }, '🔬 Live Physics'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' } },
              h('div', null, h('span', { style: { color: '#64748b' } }, 'Friction μ: '), h('b', { style: { color: '#22d3ee' } }, sd.mu.toFixed(2))),
              h('div', null, h('span', { style: { color: '#64748b' } }, 'Total resist: '), h('b', { style: { color: '#22d3ee' } }, Math.round(resist) + ' N')),
              h('div', null, h('span', { style: { color: '#64748b' } }, 'Safe follow: '), h('b', { style: { color: '#4ade80' } }, Math.round(followFt) + ' ft')),
              h('div', null, h('span', { style: { color: '#64748b' } }, 'Cruise MPG: '), h('b', { style: { color: '#4ade80' } }, cruise < 999 ? cruise.toFixed(1) : '—'))
            )
          ),
          // Visual: distance bar
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' } }, 'Visual Scale'),
            h('div', { style: { position: 'relative', height: '32px', background: '#020617', borderRadius: '6px', overflow: 'hidden' } },
              h('div', { style: { position: 'absolute', left: 0, top: 0, height: '100%', width: Math.min(100, sd.reaction_ft / 400 * 100) + '%', background: '#fbbf24' } }),
              h('div', { style: { position: 'absolute', left: Math.min(100, sd.reaction_ft / 400 * 100) + '%', top: 0, height: '100%', width: Math.min(100 - Math.min(100, sd.reaction_ft / 400 * 100), sd.braking_ft / 400 * 100) + '%', background: '#ef4444' } }),
              h('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.3)' } }),
              h('div', { style: { position: 'absolute', left: '50%', bottom: '-14px', transform: 'translateX(-50%)', fontSize: '9px', color: '#64748b' } }, '200 ft')
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '4px' } },
              h('span', null, '0'),
              h('span', null, '400 ft')
            ),
            h('div', { style: { display: 'flex', gap: '14px', fontSize: '10px', marginTop: '6px' } },
              h('span', null, h('span', { style: { color: '#fbbf24' } }, '█ '), 'reaction'),
              h('span', null, h('span', { style: { color: '#ef4444' } }, '█ '), 'braking')
            )
          )
        );
      }

      // ── PARALLEL PARKING (2D) ──
      if (view === 'parking') {
        return h(ParkingMode, { ctx: ctx, h: h, React: React, onExit: function() { upd('view', 'menu'); } });
      }

      // ── HYPERMILING LAB ──
      if (view === 'hypermilingLab') {
        // MPG-vs-speed curve for the selected vehicle, plus annotated sweet spot
        var weatherChoice = d.hyperWeather || 'dry';
        var fwh = weatherChoice === 'dry' ? 'clear' : weatherChoice;
        var speeds = [];
        for (var sp = 15; sp <= 85; sp += 5) speeds.push(sp);
        var mpgs = speeds.map(function(s) { return cruiseMPG(s, currentVehicle, fwh, true); });
        var maxMpg = Math.max.apply(null, mpgs.filter(function(m) { return m < 999; }));
        var bestSpeedIdx = mpgs.indexOf(maxMpg);
        var bestSpeed = speeds[bestSpeedIdx];
        // Drag share at 65 mph
        var v65 = 65 * MPH_TO_MS;
        var fd65 = dragForce(v65, currentVehicle.cd, currentVehicle.area);
        var fr65 = rollingForce(currentVehicle.mass, rollingCoef(fwh, true));
        var dragShare = fd65 / (fd65 + fr65);

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #064e3b, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #10b981', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '36px' } }, '🌿'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Hypermiling Lab'),
            h('div', { style: { fontSize: '11px', color: '#86efac', marginTop: '4px' } }, 'See how speed kills your MPG. Find your sweet spot.')
          ),
          // Vehicle picker
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' } }, 'Vehicle'),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
              VEHICLES.map(function(v) {
                var sel = v.id === selectedVehicle;
                return h('button', { key: v.id, onClick: function() { upd('vehicle', v.id); },
                  style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#10b981' : '#334155'), background: sel ? '#064e3b' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, v.icon + ' ' + v.name);
              })
            )
          ),
          // Weather picker
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' } }, 'Conditions'),
            h('div', { style: { display: 'flex', gap: '4px' } },
              [['dry','☀️ Dry'],['rain','🌧️ Rain'],['snow','❄️ Snow']].map(function(w) {
                var sel = w[0] === weatherChoice;
                return h('button', { key: w[0], onClick: function() { upd('hyperWeather', w[0]); },
                  style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#10b981' : '#334155'), background: sel ? '#064e3b' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, w[1]);
              })
            )
          ),
          // The chart
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' } }, 'MPG vs Speed (steady cruise)'),
            h('canvas', {
              width: 700, height: 240,
              ref: function(canvas) {
                if (!canvas) return;
                var g = canvas.getContext('2d');
                var W = canvas.width = canvas.offsetWidth || 700;
                var H = canvas.height = 240;
                var pad = 36;
                g.fillStyle = '#020617'; g.fillRect(0, 0, W, H);
                // Grid
                g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
                for (var gi = 0; gi < 6; gi++) {
                  var gy = pad + (H - pad * 2) * gi / 5;
                  g.beginPath(); g.moveTo(pad, gy); g.lineTo(W - pad / 2, gy); g.stroke();
                }
                for (var gx = 0; gx < 8; gx++) {
                  var gxp = pad + (W - pad * 1.5) * gx / 7;
                  g.beginPath(); g.moveTo(gxp, pad); g.lineTo(gxp, H - pad); g.stroke();
                }
                // Axis labels
                g.fillStyle = '#94a3b8'; g.font = '10px system-ui'; g.textAlign = 'center';
                for (var li = 0; li < speeds.length; li++) {
                  if (li % 2 === 0) {
                    var lx = pad + (W - pad * 1.5) * (speeds[li] - 15) / 70;
                    g.fillText(speeds[li], lx, H - 18);
                  }
                }
                g.fillText('mph', W / 2, H - 4);
                g.save(); g.translate(12, H / 2); g.rotate(-Math.PI / 2); g.fillText('MPG', 0, 0); g.restore();
                // Y-axis values
                var yMax = Math.max(20, Math.ceil(maxMpg / 10) * 10);
                g.textAlign = 'right';
                for (var yi = 0; yi <= 5; yi++) {
                  var yv = yMax * (1 - yi / 5);
                  var yp = pad + (H - pad * 2) * yi / 5;
                  g.fillText(Math.round(yv), pad - 4, yp + 3);
                }
                // Curve
                g.strokeStyle = '#10b981'; g.lineWidth = 3;
                g.beginPath();
                speeds.forEach(function(s, i) {
                  var px = pad + (W - pad * 1.5) * (s - 15) / 70;
                  var py = pad + (H - pad * 2) * (1 - Math.min(1, mpgs[i] / yMax));
                  if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
                });
                g.stroke();
                // Best-MPG marker
                var bx = pad + (W - pad * 1.5) * (bestSpeed - 15) / 70;
                var by = pad + (H - pad * 2) * (1 - Math.min(1, maxMpg / yMax));
                g.fillStyle = '#fbbf24';
                g.beginPath(); g.arc(bx, by, 6, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#fbbf24'; g.font = 'bold 11px system-ui'; g.textAlign = 'center';
                g.fillText('★ ' + bestSpeed + ' mph: ' + maxMpg.toFixed(1) + ' MPG', bx, by - 12);
                // Drag-dominated zone shading (above 50 mph)
                var dragX = pad + (W - pad * 1.5) * (50 - 15) / 70;
                g.fillStyle = 'rgba(239,68,68,0.08)';
                g.fillRect(dragX, pad, (W - pad / 2) - dragX, H - pad * 2);
                g.fillStyle = '#f87171'; g.font = 'italic 10px system-ui'; g.textAlign = 'left';
                g.fillText('drag-dominated', dragX + 6, pad + 14);
              },
              style: { width: '100%', height: '240px', display: 'block', borderRadius: '6px' }
            })
          ),
          // Insights
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px' } }, '🔬 Key Insights'),
            h('div', null, '• ', h('b', null, 'Sweet spot: ' + bestSpeed + ' mph'), ' for the ' + currentVehicle.name + ' on ' + weatherChoice + '. Drive at this speed when you can.'),
            h('div', null, '• At 65 mph, ', h('b', null, Math.round(dragShare * 100) + '%'), ' of your fuel goes to fighting AIR, not rolling friction. That share grows with v².'),
            h('div', null, '• Going 75 mph instead of 65 mph: drag is ', h('b', null, ((75 / 65) * (75 / 65)).toFixed(2) + '×'), ' higher. Most cars lose 15-20% MPG.'),
            h('div', null, '• EV note: electric cars are LESS sensitive to speed than gas — no idle waste, no wasted heat. They still lose to drag but win at all speeds.'),
            h('div', null, '• Tire pressure: every 1 PSI low ≈ 0.3% MPG loss. Free fuel from a $5 gauge.')
          )
        );
      }

      // Fallback
      return h('div', { style: { padding: '24px', textAlign: 'center', color: '#64748b' } }, 'Loading RoadReady...');
    }
  });

})();
} // end duplicate guard
