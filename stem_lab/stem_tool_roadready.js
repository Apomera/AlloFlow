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
    { q: 'When making a lane change, you should signal:', a: ['While changing lanes', 'At least 100 feet before the change', 'Only if other cars are close', 'Never on empty roads'], correct: 1, exp: 'Signal at least 100 feet before any lane change. This gives following drivers time to react. Check mirrors AND blind spots before moving.' },
    { q: 'What is the correct procedure for a 3-point turn?', a: ['Turn left, reverse right, drive forward', 'Make a U-turn across all lanes', 'Back up in a straight line', 'Turn right, reverse left, drive forward'], correct: 0, exp: 'A 3-point turn (K-turn): (1) Turn wheel left, drive forward to far curb. (2) Turn wheel right, reverse to near curb. (3) Straighten, drive forward in new direction.' },
    { q: 'The friction circle concept teaches you to:', a: ['Always brake and turn at the same time', 'Use grip for braking OR steering, but not both at full', 'Drive only in circles', 'Ignore ABS warnings'], correct: 1, exp: 'Your tires have a total grip budget (the friction circle). If you use 100% for braking, 0% is left for steering — and vice versa. This is why you brake BEFORE a turn, not during.' },
    { q: 'When backing up, you should primarily look:', a: ['In the rearview mirror only', 'Over your right shoulder through the rear window', 'Straight ahead', 'At the side mirrors only'], correct: 1, exp: 'Turn your body and look over your right shoulder through the rear window. Mirrors have blind spots. Your head gives you the widest view.' },
    { q: 'An emergency vehicle with lights and siren is approaching from behind. On a 2-lane road you should:', a: ['Speed up to get out of the way', 'Move left to give them room', 'Pull to the RIGHT shoulder and stop until it passes', 'Keep driving but slow down'], correct: 2, exp: 'Pull RIGHT and STOP completely until the emergency vehicle passes. This is law in all 50 states. Do not slam your brakes in traffic — signal, move right smoothly, then stop.' },
    { q: 'After an emergency vehicle passes you with lights on, you should:', a: ['Follow it closely to get through traffic', 'Wait a moment, then resume driving carefully', 'Immediately speed up to normal', 'Flash your lights to acknowledge'], correct: 1, exp: 'Wait until the emergency vehicle is well past, then check for additional emergency vehicles before resuming. Following an emergency vehicle too closely (tailgating) is illegal.' },
    { q: 'Going from 15 MPG to 20 MPG saves MORE fuel than going from 35 to 50 MPG for the same distance. True or false?', a: ['True — MPG is non-linear', 'False — higher MPG always saves more', 'They save the same', 'It depends on the vehicle weight'], correct: 0, exp: 'TRUE. Over 10,000 miles: 15→20 MPG saves 167 gallons. 35→50 MPG saves only 86 gallons. This is the "MPG illusion" — switching from a gas-guzzler to mediocre saves more than mediocre to excellent.' },
    { q: 'Idling your car for more than about how long wastes more fuel than restarting?', a: ['5 minutes', '2 minutes', '30 seconds', '10 minutes'], correct: 2, exp: 'Modern fuel-injected engines use so little fuel to restart that idling for more than ~30 seconds wastes more. The "warm up for 5 minutes" advice is from the carburetor era and no longer applies.' },
    { q: 'At an uncontrolled intersection (no signs, no lights), who has the right-of-way?', a: ['The faster vehicle', 'The vehicle on the right', 'The larger vehicle', 'The first to honk'], correct: 1, exp: 'At any uncontrolled intersection, yield to the vehicle on your RIGHT. Slow down and look left-right-left before proceeding.' },
    { q: 'You are turning left at a green light (no arrow). You must yield to:', a: ['Nobody — green means go', 'Oncoming traffic going straight or turning right', 'Traffic behind you', 'Pedestrians only'], correct: 1, exp: 'A green light without an arrow means you may turn left, but you must YIELD to oncoming traffic and pedestrians. Only a green ARROW gives you protected right-of-way.' },
    { q: 'Your oil pressure warning light comes on while driving. You should:', a: ['Drive to the nearest gas station', 'Keep driving if the engine sounds normal', 'Pull over immediately and shut off the engine', 'Add water to the engine'], correct: 2, exp: 'An oil pressure warning is CRITICAL. Driving even 1 minute with no oil pressure can destroy the engine. Pull over, turn off the engine, check oil level. Do NOT restart if oil is empty — tow it.' },
    { q: 'The TPMS (tire pressure) light means:', a: ['Your tires need replacing', 'One or more tires is significantly under-inflated', 'Your brakes are worn', 'Oil is low'], correct: 1, exp: 'TPMS = Tire Pressure Monitoring System. When it lights up, one or more tires is 25%+ below the recommended PSI. Check and inflate all 4 tires to the pressure on the driver door sticker.' },
    { q: 'Before driving, the FIRST thing you should adjust is:', a: ['The radio', 'Your seat and mirrors', 'The AC temperature', 'The GPS destination'], correct: 1, exp: 'Seat position (so you can reach all pedals fully) and mirrors (rearview + both sides) should be adjusted BEFORE you start driving. Never adjust mirrors while the car is moving.' },
    { q: 'The penny test for tire tread measures:', a: ['Tire pressure', 'Tire age', 'Whether tread depth is safe (2/32" minimum)', 'Tire brand quality'], correct: 2, exp: 'Insert a penny head-first into the tread groove. If you can see ALL of Lincoln\'s head, tread is below 2/32" and the tire is unsafe — replace it. Maine requires 2/32" minimum tread depth.' },
    { q: 'Your check engine light is FLASHING (not steady). This means:', a: ['Normal operation', 'Minor issue, schedule service when convenient', 'Active engine misfire — pull over immediately', 'The gas cap is loose'], correct: 2, exp: 'A FLASHING check engine light means active misfire. Unburned fuel is being sent to the catalytic converter, which can overheat and catch fire. Pull over and turn off the engine.' },
    { q: 'You are at a red light when an ambulance with sirens approaches from behind. You should:', a: ['Wait for the light to turn green', 'Pull forward into the intersection, then move right', 'Stay put — never enter an intersection on red', 'Reverse to make room'], correct: 1, exp: 'You may carefully proceed into the intersection to clear a path if safe. Emergency vehicles need a clear lane. Check cross traffic first, then move forward and right.' },
    { q: 'After pulling over for an emergency vehicle, how long should you wait before re-entering traffic?', a: ['Immediately after it passes', 'Wait for any additional emergency vehicles, then merge carefully', '60 seconds exactly', 'Until all traffic resumes normal speed'], correct: 1, exp: 'Emergency vehicles often travel in groups (ambulance + fire truck, multiple police). Wait until you are sure no more are coming, then signal left and merge carefully.' },
    { q: 'An emergency vehicle is approaching on a divided highway from the OPPOSITE direction. You must:', a: ['Stop completely', 'Slow down and proceed with caution', 'Move to the right shoulder', 'Speed up to clear the area'], correct: 1, exp: 'On a divided highway (with a median), only traffic on the SAME side as the emergency vehicle must pull over. Opposite side should slow down and proceed with caution.' },
    { q: 'When driving, you should look:', a: ['Only at the car directly in front', '12-15 seconds ahead down the road', 'Only at the speedometer', 'Only in the mirrors'], correct: 1, exp: 'Scan 12-15 seconds ahead (about 1/4 mile at highway speed). This is called "high visual horizon" — it gives you maximum time to react to hazards, stops, and lane changes.' },
    { q: 'A white car is in your blind spot. The safest way to check before changing lanes is:', a: ['Just use mirrors', 'Briefly turn your head to look over your shoulder', 'Sound the horn', 'Speed up past them'], correct: 1, exp: 'Mirrors have blind spots where entire vehicles hide. A brief head turn (shoulder check) covers the blind spot. Signal → mirror → shoulder check → move. In that order, every time.' },
    { q: 'You are driving 55 mph and it starts raining. You should:', a: ['Maintain speed — your car has good tires', 'Slow down by at least 10 mph and increase following distance', 'Pull over immediately', 'Turn on hazard flashers and continue'], correct: 1, exp: 'Rain reduces friction by 30-50%. Slow down, increase following to 4+ seconds, and turn on headlights (Maine law: wipers on = headlights on). The first 10 minutes of rain are worst — oil lifts off the road.' },
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
    { q: 'When approaching a stopped emergency vehicle, tow truck, or roadside worker with lights flashing, Maine law says you must:', a: ['Continue at posted speed', 'Honk and pass quickly', 'Move over one lane if safe, or slow down significantly', 'Stop completely'], correct: 2, exp: 'Maine\'s "Move Over" law requires drivers to change lanes if safe, or slow down. Roadside workers die every year from drivers passing too close.' },
    // ── Accident aftermath + advanced ──
    { q: 'You are involved in a minor fender bender with no injuries. Your first step should be:', a: ['Leave the scene', 'Move vehicles to a safe location out of traffic', 'Call 911 immediately', 'Exchange insurance only'], correct: 1, exp: 'Move vehicles to safety first (if drivable). Then exchange info, take photos, call police if required by state law. In Maine, file a report if damage > $1,000.' },
    { q: 'After a crash, what information should you exchange with the other driver?', a: ['Just phone numbers', 'Name, insurance company, policy number, driver\'s license, license plate, phone', 'Nothing — let insurance handle it', 'Only if police are present'], correct: 1, exp: 'Always exchange: name, phone, insurance company + policy number, driver\'s license number, license plate, vehicle make/model. Take photos of everything.' },
    { q: 'You hit a parked car and the owner is nowhere around. You should:', a: ['Leave — no one saw it', 'Leave a note with your name and contact info on the car', 'Only report it if the damage is severe', 'Move your car and pretend it didn\'t happen'], correct: 1, exp: 'Leaving without a note is a hit-and-run in all 50 states — a criminal offense. Leave your name, phone, and insurance info. Take a photo of both cars.' },
    { q: 'What is the purpose of the vehicle\'s VIN (Vehicle Identification Number)?', a: ['It shows the fuel type', 'It uniquely identifies your specific vehicle for registration, insurance, and recall tracking', 'It measures engine power', 'It is the same as the license plate'], correct: 1, exp: 'The VIN is a 17-character code unique to every vehicle manufactured. It encodes the make, model, year, factory, and serial number. Found on the dashboard and door frame.' },
    { q: 'Tailgating (following too closely) is dangerous because:', a: ['It saves fuel from drafting', 'It leaves no room for reaction if the car ahead stops suddenly', 'It makes the other driver go faster', 'It only matters on highways'], correct: 1, exp: 'Tailgating eliminates your reaction buffer. At 60 mph with a 1-second following distance, you need 132 ft to react + 180 ft to brake = 312 ft. A 1-second gap at 60 mph is only 88 ft.' },
    { q: 'When driving through a deep puddle, what should you do after crossing it?', a: ['Speed up to dry the brakes', 'Gently tap the brakes a few times to dry them', 'Nothing — modern brakes are waterproof', 'Pull over and wait 10 minutes'], correct: 1, exp: 'Water on brake rotors reduces braking power. Lightly tapping brakes creates friction heat that evaporates the water. This restores full braking within seconds.' },
    { q: 'Carbon monoxide from your car\'s exhaust is dangerous because:', a: ['It smells bad', 'It is odorless and can cause unconsciousness or death in enclosed spaces', 'It only affects diesel engines', 'It causes engine damage'], correct: 1, exp: 'CO is odorless, colorless, and deadly. Never idle in a closed garage. If stuck in snow, keep the exhaust pipe clear and crack a window. CO poisoning symptoms: headache, dizziness, nausea.' },
    { q: 'The two-second rule should be increased to four or more seconds when:', a: ['Driving a small car', 'Road conditions are wet, icy, or visibility is poor', 'Driving during the day', 'Driving below the speed limit'], correct: 1, exp: 'Wet roads: 4+ seconds. Snow: 6+ seconds. Fog: 6+ seconds. Following a motorcycle or large truck: 4+ seconds. At night: 4+ seconds. When in doubt, add more distance.' },
    { q: 'You are driving and smell gasoline inside the car. You should:', a: ['Ignore it — cars always smell like gas', 'Open windows, do NOT smoke, pull over when safe, and check for leaks', 'Speed up to blow the fumes out', 'Turn on the AC to recirculate air'], correct: 1, exp: 'A gasoline smell indicates a potential fuel leak — fire hazard. Ventilate immediately (open windows, NOT recirculate), pull over safely, and check under the hood and underneath.' },
    { q: 'What does it mean when your steering wheel vibrates at highway speed?', a: ['Normal road vibration', 'Likely wheel balance issue, alignment problem, or tire damage — have it inspected', 'The engine is overheating', 'You need new brakes'], correct: 1, exp: 'Steering vibration typically means: unbalanced wheels (most common, cheap fix), worn tie rod ends, or tire damage. If vibration is only when braking, it\'s warped rotors.' },
    { q: 'In Maine, what is the penalty for a first-offense DUI?', a: ['$100 fine', 'Warning only', 'Minimum 150-day license suspension, $500+ fine, possible jail time', 'Loss of car registration only'], correct: 2, exp: 'Maine first-offense OUI (Operating Under Influence): minimum 96 hours jail (or 48 hrs community service), $500+ fine, 150-day license suspension. Second offense: mandatory 7 days jail.' },
    { q: 'You are approaching a green light that has been green for a long time (stale green). You should:', a: ['Speed up to make it through', 'Cover the brake and be ready for it to change', 'Honk to warn cross traffic', 'Stop and wait for the next green'], correct: 1, exp: 'A "stale green" is likely to turn yellow soon. Cover your brake pedal (hover your foot over it) so you can react instantly. This reduces reaction time by ~0.5 seconds.' },
    { q: 'The "Dutch reach" is a technique for:', a: ['Parallel parking', 'Opening your car door safely by reaching with the far hand to check for cyclists', 'Merging onto a highway', 'Adjusting mirrors'], correct: 1, exp: 'Open your door with the hand farthest from the door (right hand for driver side). This naturally turns your body to look over your shoulder, checking for cyclists. Prevents "dooring" — a leading cause of cyclist injury.' },
    { q: 'Your car starts to hydroplane. The correct response is:', a: ['Brake hard', 'Turn the steering wheel sharply', 'Ease off the gas, do not brake or steer sharply, and let the tires regain contact', 'Accelerate to push through'], correct: 2, exp: 'Hydroplaning = tires riding on a film of water, not the road. Braking or sharp steering = loss of control. Ease off gas smoothly and wait for tires to contact pavement again.' },
    { q: 'What is the "Smith System" of driving?', a: ['A car manufacturing technique', 'Five principles: aim high, keep eyes moving, get the big picture, leave yourself an out, make sure they see you', 'A parallel parking method', 'An insurance discount program'], correct: 1, exp: 'The Smith System is a professional defensive driving method: (1) Aim High — look 15 sec ahead, (2) Keep Eyes Moving — scan constantly, (3) Get the Big Picture — awareness of all surroundings, (4) Leave Yourself an Out — always have an escape route, (5) Make Sure They See You — use signals, lights, horn.' },
    { q: 'What percentage of all traffic deaths in the US involve alcohol?', a: ['About 5%', 'About 15%', 'About 30%', 'About 50%'], correct: 2, exp: 'Approximately 30% of all US traffic fatalities involve a drunk driver. That is roughly 10,000 deaths per year. Every single one is preventable.' },
    { q: 'Regenerative braking in electric and hybrid vehicles:', a: ['Uses the brakes harder', 'Converts the car\'s kinetic energy back into battery charge when decelerating', 'Only works at high speed', 'Wears out brake pads faster'], correct: 1, exp: 'Regen braking runs the electric motor backwards as a generator, converting motion → electricity → battery charge. This is why hybrids get BETTER city MPG — every stop recaptures energy.' },
    { q: 'The safest position for your hands on the steering wheel is:', a: ['10 and 2 o\'clock', '9 and 3 o\'clock', '12 o\'clock with one hand', 'Bottom of the wheel'], correct: 1, exp: '9 and 3 is now recommended over 10 and 2. It gives better control, reduces fatigue, and keeps your arms below the airbag deployment zone. 10-and-2 can cause arm injuries from airbag.' },
    { q: 'What is the first thing to check when you get into an unfamiliar vehicle?', a: ['The radio presets', 'Seat position, mirrors, and the location of all controls (lights, wipers, signals, hazards)', 'The GPS', 'The gas level'], correct: 1, exp: 'Before driving ANY unfamiliar vehicle: adjust seat, adjust all 3 mirrors, locate headlights, wipers, signals, hazards, and horn. Find the parking brake. Then check gas level and tire pressure.' },
    // ── Emergency situations + road test prep ──
    { q: 'Your brakes fail completely while driving. Your first action should be:', a: ['Turn off the engine immediately', 'Pump the brake pedal rapidly, downshift, and use the parking brake gradually', 'Steer into the nearest object to stop', 'Open the door and drag your foot'], correct: 1, exp: 'Pump brakes (may restore pressure). Downshift to use engine braking. Apply parking/emergency brake GRADUALLY (yanking it can lock rear wheels). Steer toward an uphill or open area. Horn + hazards.' },
    { q: 'Your accelerator (gas pedal) gets stuck. What should you do?', a: ['Turn off the engine immediately', 'Shift to neutral, steer to safety, then turn off the engine', 'Slam the brakes as hard as possible', 'Open the door and jump out'], correct: 1, exp: 'Shift to NEUTRAL (engine revs but wheels disconnect). Steer to the shoulder. Apply brakes firmly. Once stopped, turn off the engine. In many modern cars, pressing and holding the start button for 3 seconds forces shutdown.' },
    { q: 'Your hood suddenly flies up while driving, blocking your view. You should:', a: ['Slam on the brakes', 'Look through the gap at the bottom of the windshield or out the side window, slow down, and pull over', 'Swerve off the road immediately', 'Close your eyes and hope for the best'], correct: 1, exp: 'Do NOT panic brake. You can see through the gap between the dashboard and the hood, or look out the side window. Slow down gradually with flashers on and pull to the shoulder. This is why you always check that the hood is fully latched.' },
    { q: 'Your car starts to sink in water (flood, off a bridge). The most important thing to do is:', a: ['Call 911 first', 'Unbuckle your seatbelt and open the window or door IMMEDIATELY before the car sinks', 'Wait for the car to fill with water to equalize pressure', 'Try to start the engine'], correct: 1, exp: 'You have 30-60 seconds. Unbuckle. Open the window (or break it with a window breaker tool). Get out BEFORE the car submerges. Electric windows may still work for ~1 minute. Do not try to open doors until water equalizes.' },
    { q: 'During the Maine road test, the examiner will mark you down for:', a: ['Driving exactly the speed limit', 'Not checking mirrors before lane changes, rolling through stops, poor hand position', 'Asking for directions', 'Driving too slowly in a school zone'], correct: 1, exp: 'Common failures: rolling stops, not checking mirrors/blind spots, wide turns, poor lane position, not yielding to pedestrians, and not using turn signals. The test is about demonstrating HABITS, not just skills.' },
    { q: 'On the road test, when the examiner says "Turn left at the next intersection," you should:', a: ['Turn left immediately', 'Check mirrors, signal, move to the left lane if needed, slow for the turn, check for oncoming traffic, then turn', 'Ask them to repeat the instruction', 'Speed up to make the turn quickly'], correct: 1, exp: 'The examiner is testing your PROCESS: signal → mirror → blind spot → lane position → speed adjustment → gap assessment → smooth turn. Each step matters more than the turn itself.' },
    { q: 'You see a sign that says "WRONG WAY." You should:', a: ['Continue slowly — it might be outdated', 'STOP immediately, then carefully reverse or turn around without entering the road further', 'Ignore it if you don\'t see oncoming traffic', 'Speed up to get through quickly'], correct: 1, exp: 'WRONG WAY means you are driving against traffic on a one-way road or highway ramp. This is immediately life-threatening. Stop. Do NOT continue. Carefully reverse or turn around. Check for oncoming traffic.' },
    { q: 'When parallel parking during the road test, your car must end up:', a: ['Roughly near the curb', 'Within 12 inches of the curb, parallel to it, and fully within the space', 'Touching the curb', 'Anywhere between the two cars'], correct: 1, exp: 'Maine road test standard: within 12 inches of curb, reasonably parallel, without hitting either boundary car. You get 3 attempts. Examiners also watch for proper signaling and mirror checks.' },
    { q: 'What is the "2-second rule" for following distance based on?', a: ['Distance in feet', 'Time gap — pick a fixed point, count seconds after the car ahead passes it', 'Speed in mph', 'The length of two cars'], correct: 1, exp: 'The time-based rule auto-adjusts for speed. At 30 mph, 2 seconds = 88 ft. At 60 mph, 2 seconds = 176 ft. The distance doubles but the gap in seconds stays the same. That is why seconds are better than feet or car lengths.' },
    { q: 'Drowsy driving is comparable in danger to:', a: ['Mild speeding', 'Drunk driving — reaction times and judgment are similarly impaired', 'Driving without glasses', 'Driving with one hand'], correct: 1, exp: 'Being awake 17+ hours impairs you as much as a 0.05% BAC. 24 hours awake ≈ 0.10% BAC (legally drunk). Drowsy driving causes ~100,000 crashes/year in the US. The only cure is sleep, not coffee.' },
    { q: 'If your car has a manual transmission and you are stopped on a steep uphill, you should:', a: ['Use the parking brake while starting to prevent rolling backward', 'Rev the engine and release the clutch quickly', 'Roll backward and try again', 'Shift to neutral'], correct: 0, exp: 'Hill start technique: hold the parking brake while you find the clutch engagement point and apply gas. Release the parking brake as you feel the car pull forward. This prevents the dangerous roll-back.' },
    { q: 'Right-of-way at a T-intersection (no signs or signals):', a: ['The car on the through road always goes first', 'The car on the stem road goes first', 'The larger vehicle goes first', 'Whoever arrives first'], correct: 0, exp: 'At a T-intersection without signs, the through road (top of the T) has the right-of-way. The car on the terminating road (stem) must yield. This is because they are essentially entering a new road.' },
    { q: 'The purpose of rumble strips on the highway shoulder is to:', a: ['Mark the edge for snow plows', 'Alert drowsy or distracted drivers that they are leaving the travel lane', 'Slow down traffic', 'Guide cyclists'], correct: 1, exp: 'Rumble strips create noise and vibration when you drive over them. They are specifically designed to wake up drowsy drivers or alert distracted ones before they leave the road. They reduce run-off-road crashes by 15-70%.' },
    { q: 'When driving near a large truck, where is the SAFEST position?', a: ['Directly behind the truck (drafting)', 'Far enough behind or ahead that you can see the truck driver\'s mirrors', 'Beside the truck in the left lane', 'As close as possible to save fuel'], correct: 1, exp: 'Rule: if you cannot see the truck driver\'s mirrors, they cannot see you. Stay out of all 4 no-zones. Pass quickly — do not cruise alongside. Never cut in front of a truck (they need 40% more stopping distance than a car).' },
    { q: 'In Maine, the minimum age to obtain a full unrestricted license is:', a: ['16', '16 and 9 months', '17', '18'], correct: 1, exp: 'Maine graduated licensing: permit at 15, intermediate at 16 (after 70 hrs supervised driving), full unrestricted at 16 years and 9 months (after 9 months with no violations). The 9-month intermediate period has passenger and curfew restrictions.' }
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
    { id: 'school_zone', name: 'School Zone', icon: '🏫', speedLimit: 15, weather: 'clear', time: 'day', traffic: 'light', difficulty: 2, desc: 'Active school zone. Crosswalks, crossing guard, buses. 15 mph limit when children present.' },
    { id: 'downtown', name: 'Downtown', icon: '🏙️', speedLimit: 30, weather: 'clear', time: 'day', traffic: 'heavy', difficulty: 4, desc: 'Dense urban grid. One-way streets, heavy pedestrians, tight turns, taxis. Portland Old Port feel.' },
    { id: 'dawn', name: 'Dawn / Dusk', icon: '🌅', speedLimit: 45, weather: 'clear', time: 'night', traffic: 'medium', difficulty: 3, desc: 'Low-angle sun glare. The most dangerous time for moose + deer. Visibility is tricky.' }
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

  var MAP_SIZE = 96;

  // ─────────────────────────────────────────────────────────
  // SECTION 8b: PROCEDURAL INFINITE WORLD (Free Explore)
  // ────────────────────────────────────���────────────────────
  // Seeded PRNG for deterministic procedural generation.
  // Same seed → same world every time. Different seed → different world.
  function seededRandom(seed) {
    var s = seed;
    return function() {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return (s >>> 16) / 32768;
    };
  }

  // Chunk-based world: each chunk is CHUNK_SIZE cells tall, road runs through center.
  // Chunks generate on-the-fly as the player drives north or south.
  var CHUNK_SIZE = 32;
  // Road geometry constants — referenced from both chunk generation and updateThreeScene render paths.
  var MAX_ROAD_WIDTH = 4; // widest possible road width across all biomes
  var CLEARANCE_BUFFER = 2; // cells of guaranteed empty space to each side of road

  // ─────────────────────────────────────────────────────────
  // ROAD SPLINE — shared centerline for the infinite world.
  // The spline is sampled per Y-row so the carved cells, the 3D road ribbon,
  // landmark placement, lane markings and signal positions all agree on where
  // the road actually is. Built incrementally with seeded heading-walk so that
  // chunk N's exit heading equals chunk N+1's entry heading by construction.
  // ─────────────────────────────────────────────────────────
  var SPLINE_MAX_HEADING = 0.55; // radians; clamps how far the road may lean from due-north
  function createRoadSpline(seed, baseCenterX) {
    // samples[y] = { x: roadCenter, heading: tangent angle in radians (0 = +Y/north) }
    // Headings small ⇒ road is mostly N-S. Positive heading ⇒ road bends toward +X.
    var samples = {};
    function biomeForY(y) {
      // Mirror BIOME_PROGRESSION lookup so curvature matches the visible biome.
      var ci = Math.floor(y / CHUNK_SIZE);
      var pi = ((ci % BIOME_PROGRESSION.length) + BIOME_PROGRESSION.length) % BIOME_PROGRESSION.length;
      return BIOME_PROGRESSION[pi];
    }
    function curvatureForBiome(b) {
      // Max heading delta per cell (radians). Rural roads twist; commercial grids stay straight.
      // Tuned so a ~30-cell rural stretch visibly sweeps several cells of lateral travel.
      if (b === 'rural') return 0.075;
      if (b === 'industrial') return 0.040;
      if (b === 'residential') return 0.020;
      if (b === 'suburban') return 0.015;
      return 0.008; // commercial
    }
    // Pure deterministic step computation: given the heading at one sample plus
    // the seeded draw indexed by edge Y, returns the heading at the neighbor.
    // Edge between samples y-1 and y is keyed by y. Same edge ⇒ same delta.
    function edgeDelta(edgeY, fromHeading) {
      var rng = seededRandom(seed + edgeY * 2654435761);
      var maxDelta = curvatureForBiome(biomeForY(edgeY));
      // Random component only depends on edgeY; mean-reversion uses the heading
      // at the LOWER-Y endpoint so forward/backward walks see the same value.
      // (When walking backward, we recover that endpoint heading first.)
      return (rng() - 0.5) * 2 * maxDelta - fromHeading * 0.006;
    }
    function clampMargin(x, h) {
      var margin = MAX_ROAD_WIDTH + CLEARANCE_BUFFER + 4;
      if (x < margin) return { x: margin, h: h * 0.5 };
      if (x > MAP_SIZE - margin) return { x: MAP_SIZE - margin, h: h * 0.5 };
      return { x: x, h: h };
    }
    function ensureUpTo(yTarget) {
      var maxY = -1;
      for (var k in samples) { var ki = +k; if (ki > maxY) maxY = ki; }
      if (maxY < 0) {
        samples[0] = { x: baseCenterX, heading: 0 };
        maxY = 0;
      }
      for (var y = maxY + 1; y <= yTarget; y++) {
        var prev = samples[y - 1];
        var h = prev.heading + edgeDelta(y, prev.heading);
        if (h > SPLINE_MAX_HEADING) h = SPLINE_MAX_HEADING;
        if (h < -SPLINE_MAX_HEADING) h = -SPLINE_MAX_HEADING;
        var nx = prev.x + Math.tan(h);
        var c = clampMargin(nx, h);
        samples[y] = { x: c.x, heading: c.h };
      }
    }
    function ensureDownTo(yTarget) {
      var minY = 1e9;
      for (var k in samples) { var ki = +k; if (ki < minY) minY = ki; }
      if (minY === 1e9) {
        samples[0] = { x: baseCenterX, heading: 0 };
        minY = 0;
      }
      for (var y = minY - 1; y >= yTarget; y--) {
        // Edge (y, y+1) was forward-defined as: h(y+1) = h(y) + edgeDelta(y+1, h(y))
        // Going backward we don't know h(y) directly. Solve via fixed-point iteration:
        // start from h(y) ≈ h(y+1), apply edgeDelta, repeat. The mean-reversion term
        // is tiny (0.02·h) so this converges in 2-3 iterations.
        var next = samples[y + 1];
        var hGuess = next.heading;
        for (var it = 0; it < 4; it++) {
          var predictedNext = hGuess + edgeDelta(y + 1, hGuess);
          // Adjust hGuess to drive predictedNext toward next.heading.
          hGuess += (next.heading - predictedNext);
        }
        var h = hGuess;
        if (h > SPLINE_MAX_HEADING) h = SPLINE_MAX_HEADING;
        if (h < -SPLINE_MAX_HEADING) h = -SPLINE_MAX_HEADING;
        // Position recovered the same way: next.x = h(y).x + tan(h(y+1))? No — the
        // forward rule uses tan(h_NEW). Mirror exactly: next.x = prev.x + tan(next.heading).
        var nx = next.x - Math.tan(next.heading);
        var c = clampMargin(nx, h);
        samples[y] = { x: c.x, heading: c.h };
      }
    }
    // Elevation: low-frequency seeded noise per Y. Independent of curvature so
    // hills and turns can occur in any combination. Amplitude varies by biome
    // (rural ≈ rolling, commercial ≈ flat). Deterministic from seed alone.
    function heightAt(y) {
      var biome = biomeForY(y);
      var amp = biome === 'rural' ? 1.6 : biome === 'industrial' ? 0.8 : biome === 'residential' ? 0.5 : biome === 'suburban' ? 0.4 : 0.15;
      // Sum two sine waves with phases derived from the seed — cheap pseudo-noise
      // that's smooth, periodic, and identical across renderer + physics.
      var phaseA = (seed * 0.0001) % (Math.PI * 2);
      var phaseB = (seed * 0.0007) % (Math.PI * 2);
      var hA = Math.sin(y * 0.045 + phaseA) * 0.7;
      var hB = Math.sin(y * 0.013 + phaseB) * 0.3;
      return (hA + hB) * amp;
    }
    return {
      seed: seed,
      samples: samples,
      // Road center (X) at any (possibly non-integer) Y. Linearly interpolates
      // between adjacent integer samples — float Ys (e.g. world Z lookups from
      // the renderer) would otherwise hit undefined slots in the samples map.
      centerAt: function(y) {
        var y0 = Math.floor(y);
        var y1 = y0 + 1;
        var t = y - y0;
        if (y0 >= 0) ensureUpTo(y1); else ensureDownTo(y0);
        var s0 = samples[y0], s1 = samples[y1];
        if (!s0) return s1 ? s1.x : baseCenterX;
        if (!s1) return s0.x;
        return s0.x + (s1.x - s0.x) * t;
      },
      headingAt: function(y) {
        var y0 = Math.floor(y);
        var y1 = y0 + 1;
        var t = y - y0;
        if (y0 >= 0) ensureUpTo(y1); else ensureDownTo(y0);
        var s0 = samples[y0], s1 = samples[y1];
        if (!s0) return s1 ? s1.heading : 0;
        if (!s1) return s0.heading;
        return s0.heading + (s1.heading - s0.heading) * t;
      },
      heightAt: heightAt,
      // Drop samples far from the live window to bound memory. Always retain a small
      // anchor band on each side so revisiting a chunk regenerates identical headings.
      cleanup: function(currentChunkIndex) {
        var keepFrom = (currentChunkIndex - 6) * CHUNK_SIZE;
        var keepTo = (currentChunkIndex + 6) * CHUNK_SIZE;
        for (var k in samples) {
          var ki = +k;
          if (ki < keepFrom || ki > keepTo) delete samples[k];
        }
      }
    };
  }
  var BIOMES = ['residential', 'commercial', 'rural', 'suburban', 'industrial'];
  // Logical biome progression: creates neighborhoods that make geographic sense
  // Pattern repeats every ~12 chunks: highway → suburban → residential → commercial → residential → rural → ...
  var BIOME_PROGRESSION = ['suburban', 'suburban', 'residential', 'residential', 'commercial', 'residential', 'residential', 'suburban', 'rural', 'rural', 'rural', 'industrial'];

  // ─────────────────────────────────────────────────────────
  // LANDMARKS: pre-designed destination structures that make the world feel alive.
  // Each landmark occupies a 5x5 cell footprint next to the road. Students see them
  // from a distance, can recognize them, and real-world driving contexts emerge
  // (school zone speed limit, pedestrians from library, etc.)
  // ─────────────────────────────────────────────────────────
  var LANDMARK_TYPES = [
    { id: 'school',    name: 'Elementary School',   icon: '🏫', color: 0xc13a3a, roofColor: 0x8b1a1a, size: 6, height: 4,  sign: 'SCHOOL',       signColor: 0xfcd34d, contextRule: 'school_zone_20mph', eventChance: 0.15, biomes: ['residential','suburban'] },
    { id: 'library',   name: 'Public Library',      icon: '📚', color: 0x6b4a2a, roofColor: 0x3d2817, size: 5, height: 3.5,sign: 'LIBRARY',      signColor: 0xfef3c7, contextRule: null,                eventChance: 0.05, biomes: ['residential','suburban','commercial'] },
    { id: 'hospital',  name: 'Hospital',            icon: '🏥', color: 0xe5e7eb, roofColor: 0x1e40af, size: 7, height: 5,  sign: 'HOSPITAL',     signColor: 0xef4444, contextRule: 'slow_ambulance',    eventChance: 0.10, biomes: ['commercial','suburban'] },
    { id: 'police',    name: 'Police Station',      icon: '🚔', color: 0x1e3a8a, roofColor: 0x0f172a, size: 5, height: 3,  sign: 'POLICE',       signColor: 0x60a5fa, contextRule: 'check_speed',       eventChance: 0.20, biomes: ['commercial','suburban','residential'] },
    { id: 'fire',      name: 'Fire Station',        icon: '🚒', color: 0xb91c1c, roofColor: 0x7f1d1d, size: 6, height: 3.5,sign: 'FIRE DEPT',    signColor: 0xfacc15, contextRule: 'emergency_vehicle', eventChance: 0.12, biomes: ['commercial','suburban'] },
    { id: 'gas',       name: 'Gas Station',         icon: '⛽', color: 0x065f46, roofColor: 0xfacc15, size: 5, height: 2.5,sign: 'GAS',          signColor: 0xfcd34d, contextRule: null,                eventChance: 0.08, biomes: ['commercial','suburban','rural'] },
    { id: 'diner',     name: 'Diner',               icon: '🍽️', color: 0xdc2626, roofColor: 0xfef3c7, size: 5, height: 2.5,sign: 'DINER',        signColor: 0xf97316, contextRule: null,                eventChance: 0.08, biomes: ['commercial','rural'] },
    { id: 'park',      name: 'Public Park',         icon: '🌳', color: 0x16a34a, roofColor: 0x15803d, size: 7, height: 0.3,sign: 'PARK',         signColor: 0x166534, contextRule: 'pedestrians',       eventChance: 0.15, biomes: ['residential','suburban'] },
    { id: 'church',    name: 'Church',              icon: '⛪', color: 0xf5f5f4, roofColor: 0x78716c, size: 5, height: 5,  sign: 'CHURCH',       signColor: 0x44403c, contextRule: null,                eventChance: 0.05, biomes: ['residential','rural','suburban'] },
    { id: 'market',    name: 'Grocery Market',      icon: '🛒', color: 0xf59e0b, roofColor: 0x78350f, size: 6, height: 3,  sign: 'MARKET',       signColor: 0xffffff, contextRule: 'pedestrians',       eventChance: 0.12, biomes: ['commercial','suburban'] },
    { id: 'pharmacy',  name: 'Pharmacy',            icon: '💊', color: 0x059669, roofColor: 0x064e3b, size: 5, height: 3,  sign: 'RX',           signColor: 0xffffff, contextRule: null,                eventChance: 0.08, biomes: ['commercial','suburban'] },
    { id: 'post',      name: 'Post Office',         icon: '📮', color: 0x1e40af, roofColor: 0xffffff, size: 5, height: 3,  sign: 'POST OFFICE',  signColor: 0xef4444, contextRule: null,                eventChance: 0.05, biomes: ['commercial','residential','suburban'] },
    { id: 'farm',      name: 'Farm',                icon: '🚜', color: 0xdc2626, roofColor: 0x7f1d1d, size: 6, height: 4,  sign: 'FARM',         signColor: 0xfef3c7, contextRule: 'slow_vehicle',      eventChance: 0.12, biomes: ['rural'] },
    { id: 'lighthouse',name: 'Lighthouse',          icon: '🗼', color: 0xffffff, roofColor: 0xdc2626, size: 4, height: 8,  sign: 'LIGHTHOUSE',   signColor: 0x1e40af, contextRule: null,                eventChance: 0.05, biomes: ['rural'] },
    { id: 'home',      name: 'Maine Cottage',       icon: '🏠', color: 0xfef3c7, roofColor: 0x78350f, size: 4, height: 3,  sign: null,           signColor: 0xffffff, contextRule: null,                eventChance: 0.03, biomes: ['residential','rural','suburban'] }
  ];

  // Choose a landmark appropriate for a biome (deterministic by chunk index)
  function pickLandmarkForBiome(biome, rng) {
    var eligible = LANDMARK_TYPES.filter(function(lt) { return lt.biomes.indexOf(biome) >= 0; });
    if (eligible.length === 0) return null;
    return eligible[Math.floor(rng() * eligible.length)];
  }

  function generateChunk(chunkIndex, seed, centerX, spline) {
    var rng = seededRandom(seed + chunkIndex * 7919);
    // Use progression for coherent neighborhoods, with seed-based variation
    var progIndex = ((chunkIndex % BIOME_PROGRESSION.length) + BIOME_PROGRESSION.length) % BIOME_PROGRESSION.length;
    var biome = BIOME_PROGRESSION[progIndex];
    // 20% chance to override with a random biome for variety
    if (rng() < 0.2) biome = BIOMES[Math.floor(rng() * BIOMES.length)];
    var chunk = { index: chunkIndex, biome: biome, cells: [], objects3d: null, landmark: null };
    // Per-row road centerline derived from the spline (world Y → local x within chunk).
    // Using these everywhere instead of a constant centerX is what lets the road curve.
    var chunkBaseY = chunkIndex * CHUNK_SIZE;
    var roadCenters = new Array(CHUNK_SIZE); // index = local cy
    for (var rcy = 0; rcy < CHUNK_SIZE; rcy++) {
      roadCenters[rcy] = spline ? Math.round(spline.centerAt(chunkBaseY + rcy)) : centerX;
    }
    // Generate cell grid for this chunk
    for (var y = 0; y < CHUNK_SIZE; y++) {
      var row = [];
      for (var x = 0; x < MAP_SIZE; x++) row.push(2); // grass
      chunk.cells.push(row);
    }
    // Road carved along the spline — roadCenters[cy] is the X for this row.
    // Visual road ribbon and collision grid both read from the same spline so they stay in sync.
    var curveAmp = 0; // legacy field kept for compatibility; spline supersedes it
    var curveFreq = 0;
    // Intersections: ~40% chance but never two in a row (guaranteed gap)
    var hasIntersection = rng() < 0.4 && (chunkIndex % 2 === 0 || rng() < 0.3);
    var intersectionY = Math.floor(CHUNK_SIZE * 0.4 + rng() * CHUNK_SIZE * 0.3);
    // Reserve wider main-road corridor: MAX_ROAD_WIDTH + CLEARANCE_BUFFER are module-scope (see top of file).
    for (var cy = 0; cy < CHUNK_SIZE; cy++) {
      var roadCenter = roadCenters[cy];
      var roadWidth = biome === 'commercial' || biome === 'suburban' ? 4 : 3;
      for (var dx = -roadWidth; dx <= roadWidth; dx++) {
        var rx = roadCenter + dx;
        if (rx >= 0 && rx < MAP_SIZE) chunk.cells[cy][rx] = 0;
      }
      if (roadCenter >= 0 && roadCenter < MAP_SIZE) chunk.cells[cy][roadCenter] = 3;
      // Cross street at intersection — proper road with centerline
      if (hasIntersection && Math.abs(cy - intersectionY) < 3) {
        for (var cx = 0; cx < MAP_SIZE; cx++) {
          // Road surface across the full width
          if (chunk.cells[cy][cx] === 2) chunk.cells[cy][cx] = 0;
        }
        // Center line for cross street (at the intersection Y middle)
        if (cy === intersectionY) {
          for (var clx = 0; clx < MAP_SIZE; clx++) {
            if (Math.abs(clx - roadCenter) > roadWidth + 2) {
              chunk.cells[cy][clx] = 3; // center line on cross street
            }
          }
        }
      }
    }
    // Buildings based on biome — avoid placing on/near cross streets, keep clearance buffer from road
    var buildingDensity = biome === 'commercial' ? 0.2 : biome === 'residential' ? 0.08 : biome === 'suburban' ? 0.06 : biome === 'industrial' ? 0.12 : 0.02;
    for (var by = 2; by < CHUNK_SIZE - 2; by++) {
      // Skip rows near the cross street intersection
      if (hasIntersection && Math.abs(by - intersectionY) < 5) continue;
      for (var bx = 0; bx < MAP_SIZE; bx++) {
        // Enforce CLEARANCE_BUFFER cells away from the spline-local road center
        var distFromRoad = Math.abs(bx - roadCenters[by]);
        if (distFromRoad <= MAX_ROAD_WIDTH + CLEARANCE_BUFFER) continue; // never in clearance zone
        if (chunk.cells[by][bx] === 2 && rng() < buildingDensity) {
          var nearRoad = false;
          for (var checkDx = -2; checkDx <= 2; checkDx++) {
            if (bx + checkDx >= 0 && bx + checkDx < MAP_SIZE && (chunk.cells[by][bx + checkDx] === 0 || chunk.cells[by][bx + checkDx] === 3)) nearRoad = true;
          }
          if (nearRoad) chunk.cells[by][bx] = 1;
        }
      }
    }
    // ─── LANDMARK PLACEMENT (every 3rd chunk, alternating sides) ──────────
    // Landmarks are pre-designed destinations that make the world feel alive.
    // Marked with cell value 7 so the 3D renderer knows to draw them specially.
    var shouldPlaceLandmark = (chunkIndex % 3 === 0 && chunkIndex !== 0) && !hasIntersection;
    if (shouldPlaceLandmark) {
      var landmark = pickLandmarkForBiome(biome, rng);
      if (landmark) {
        // Alternate sides of the road by chunk index for visual variety
        var side = (chunkIndex % 6 < 3) ? 1 : -1;
        var landmarkStartY = Math.floor((CHUNK_SIZE - landmark.size) / 2);
        // Anchor on the spline center at the landmark's middle row so curving roads
        // don't push landmarks into the woods or onto the asphalt.
        var landmarkAnchorRow = landmarkStartY + Math.floor(landmark.size / 2);
        var landmarkAnchorCenter = roadCenters[Math.max(0, Math.min(CHUNK_SIZE - 1, landmarkAnchorRow))];
        var landmarkStartX = landmarkAnchorCenter + side * (MAX_ROAD_WIDTH + CLEARANCE_BUFFER + 3);
        if (side === -1) landmarkStartX -= landmark.size;
        // Check the footprint is within bounds and not overlapping cross street
        var canPlace = landmarkStartX >= 0 && landmarkStartX + landmark.size < MAP_SIZE;
        if (canPlace && hasIntersection) {
          for (var ly = landmarkStartY; ly < landmarkStartY + landmark.size; ly++) {
            if (Math.abs(ly - intersectionY) < 5) { canPlace = false; break; }
          }
        }
        if (canPlace) {
          // Clear the footprint (remove any buildings the prior pass placed here)
          for (var lmy = landmarkStartY; lmy < landmarkStartY + landmark.size; lmy++) {
            for (var lmx = landmarkStartX; lmx < landmarkStartX + landmark.size; lmx++) {
              if (lmy >= 0 && lmy < CHUNK_SIZE && lmx >= 0 && lmx < MAP_SIZE) {
                chunk.cells[lmy][lmx] = 2; // reset to grass so 3D renderer only draws landmark, not buildings
              }
            }
          }
          // Mark anchor cell with value 7 so the 3D renderer can spawn the landmark
          if (landmarkStartY >= 0 && landmarkStartY < CHUNK_SIZE && landmarkStartX >= 0 && landmarkStartX < MAP_SIZE) {
            chunk.cells[landmarkStartY][landmarkStartX] = 7; // landmark anchor
          }
          chunk.landmark = {
            type: landmark,
            anchorX: landmarkStartX,
            anchorY: landmarkStartY,
            side: side,
            centerX: landmarkStartX + Math.floor(landmark.size / 2),
            centerY: landmarkStartY + Math.floor(landmark.size / 2)
          };
        }
      }
    }
    // ─── FINAL ROAD CLEARANCE: triple-guarantee nothing blocks the road ────
    // Expanded from 1-cell to CLEARANCE_BUFFER-cell buffer and handles all obstacle types
    for (var cry = 0; cry < CHUNK_SIZE; cry++) {
      for (var crx = 0; crx < MAP_SIZE; crx++) {
        if (chunk.cells[cry][crx] === 0 || chunk.cells[cry][crx] === 3) {
          for (var cdy = -CLEARANCE_BUFFER; cdy <= CLEARANCE_BUFFER; cdy++) {
            for (var cdx = -CLEARANCE_BUFFER; cdx <= CLEARANCE_BUFFER; cdx++) {
              var ny = cry + cdy, nx = crx + cdx;
              if (ny >= 0 && ny < CHUNK_SIZE && nx >= 0 && nx < MAP_SIZE) {
                var cv = chunk.cells[ny][nx];
                // Remove ANY obstacle within the clearance buffer (trees, buildings, landmarks)
                if (cv === 5 || cv === 1 || cv === 6 || cv === 7) chunk.cells[ny][nx] = 2;
              }
            }
          }
        }
      }
    }
    // Trees (placed AFTER road clearance with extra strict checks)
    var treeDensity = biome === 'rural' ? 0.15 : biome === 'residential' ? 0.04 : biome === 'suburban' ? 0.03 : 0.01;
    for (var ty = 0; ty < CHUNK_SIZE; ty++) {
      for (var tx = 0; tx < MAP_SIZE; tx++) {
        if (chunk.cells[ty][tx] !== 2) continue; // must be grass
        // Strictly outside the clearance zone (spline-relative)
        var treeDistFromRoad = Math.abs(tx - roadCenters[ty]);
        if (treeDistFromRoad <= MAX_ROAD_WIDTH + CLEARANCE_BUFFER) continue;
        // Also guard against cross-street clearance
        if (hasIntersection && Math.abs(ty - intersectionY) <= CLEARANCE_BUFFER + 1) continue;
        if (rng() < treeDensity) {
          // Triple-check: scan 2-cell radius for any road cell
          var adjRoad = false;
          for (var ady = -CLEARANCE_BUFFER; ady <= CLEARANCE_BUFFER; ady++) {
            for (var adx = -CLEARANCE_BUFFER; adx <= CLEARANCE_BUFFER; adx++) {
              var any2 = ty + ady, anx = tx + adx;
              if (any2 >= 0 && any2 < CHUNK_SIZE && anx >= 0 && anx < MAP_SIZE) {
                if (chunk.cells[any2][anx] === 0 || chunk.cells[any2][anx] === 3) adjRoad = true;
              }
            }
          }
          if (!adjRoad) chunk.cells[ty][tx] = 5;
        }
      }
    }
    // Store metadata for 3D rendering and signal placement
    chunk.hasIntersection = hasIntersection;
    chunk.intersectionY = intersectionY;
    // Per-row spline centers (length = CHUNK_SIZE). Renderer/signal code reads this
    // to position the road ribbon, lane markings, and traffic signals on the curve.
    chunk.roadCenters = roadCenters;
    // roadCenter kept as a representative value for legacy callers (signal placement
    // at the intersection row uses chunk.roadCenter — point it at the intersection's
    // actual spline-local center so the signal stands at the curve, not the world center).
    chunk.roadCenter = roadCenters[Math.max(0, Math.min(CHUNK_SIZE - 1, intersectionY))];
    chunk.curveAmp = curveAmp;
    chunk.curveFreq = curveFreq;
    return chunk;
  }

  // Infinite world state
  function createInfiniteWorld(seed) {
    var centerX = Math.floor(MAP_SIZE / 2);
    var spline = createRoadSpline(seed, centerX);
    return {
      seed: seed,
      chunks: {}, // chunkIndex → chunk data
      centerX: centerX,
      spline: spline,
      // World-space road centerline for any Y. Used by the 3D ribbon mesh and any
      // consumer that needs the smooth (non-rounded) curve position.
      roadCenterAtY: function(worldY) { return spline.centerAt(worldY); },
      roadHeadingAtY: function(worldY) { return spline.headingAt(worldY); },
      roadHeightAtY: function(worldY) { return spline.heightAt(worldY); },
      getChunk: function(chunkIndex) {
        if (!this.chunks[chunkIndex]) {
          this.chunks[chunkIndex] = generateChunk(chunkIndex, this.seed, this.centerX, this.spline);
        }
        return this.chunks[chunkIndex];
      },
      // Get cell at world position (y can be any value, positive or negative)
      getCell: function(worldX, worldY) {
        var ci = Math.floor(worldY / CHUNK_SIZE);
        var localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        var chunk = this.getChunk(ci);
        if (worldX < 0 || worldX >= MAP_SIZE || localY < 0 || localY >= CHUNK_SIZE) return 2;
        return chunk.cells[localY][worldX];
      },
      // Cleanup distant chunks to free memory
      cleanup: function(currentChunkIndex) {
        var self = this;
        Object.keys(this.chunks).forEach(function(key) {
          if (Math.abs(parseInt(key) - currentChunkIndex) > 4) {
            delete self.chunks[key];
          }
        });
        // Spline keeps a slightly wider band so revisited chunks regenerate identically.
        spline.cleanup(currentChunkIndex);
      }
    };
  }

  function buildMap(scenarioId) {
    var map = [];
    for (var y = 0; y < MAP_SIZE; y++) {
      var row = [];
      for (var x = 0; x < MAP_SIZE; x++) row.push(2); // grass
      map.push(row);
    }
    var centerX = Math.floor(MAP_SIZE / 2);

    // Helper: carve a road strip (N-S or E-W)
    function carveRoadNS(cx, yStart, yEnd) {
      for (var y = yStart; y < yEnd; y++) {
        for (var dx = -3; dx <= 3; dx++) {
          if (cx + dx >= 0 && cx + dx < MAP_SIZE) map[y][cx + dx] = 0;
        }
        if (cx >= 0 && cx < MAP_SIZE) map[y][cx] = 3;
      }
    }
    function carveRoadEW(cy, xStart, xEnd) {
      for (var x = xStart; x < xEnd; x++) {
        for (var dy = -3; dy <= 3; dy++) {
          if (cy + dy >= 0 && cy + dy < MAP_SIZE && x >= 0 && x < MAP_SIZE) map[cy + dy][x] = 0;
        }
      }
    }
    function addSidewalks(cx) {
      for (var y = 0; y < MAP_SIZE; y++) {
        [-4, -5, 4, 5].forEach(function(off) {
          var sx = cx + off;
          if (sx >= 0 && sx < MAP_SIZE && map[y][sx] === 2) map[y][sx] = 4;
        });
      }
    }

    // Main N-S road
    carveRoadNS(centerX, 0, MAP_SIZE);

    if (scenarioId === 'residential' || scenarioId === 'suburban' || scenarioId === 'night' || scenarioId === 'school_zone' || scenarioId === 'construction') {
      // Cross streets every 16 cells — creates a real grid
      var crossStreets = [20, 40, 56, 72];
      crossStreets.forEach(function(cy) { carveRoadEW(cy, 0, MAP_SIZE); });
      addSidewalks(centerX);
      // Buildings in blocks between streets
      for (var by = 4; by < MAP_SIZE - 4; by++) {
        if (crossStreets.some(function(cs) { return Math.abs(by - cs) < 4; })) continue; // skip near intersections
        if (by % 3 !== 0) continue; // space buildings
        for (var side = -1; side <= 1; side += 2) {
          for (var bd = 0; bd < 3; bd++) {
            var bx = centerX + side * (6 + bd);
            if (bx >= 0 && bx < MAP_SIZE) map[by][bx] = 1;
            if (bx >= 0 && bx < MAP_SIZE && by + 1 < MAP_SIZE) map[by + 1][bx] = 1;
          }
        }
      }
      // Parking lot (suburban only) — flat asphalt area near one intersection
      if (scenarioId === 'suburban') {
        for (var py = 44; py < 54; py++) {
          for (var px = centerX + 8; px < centerX + 16 && px < MAP_SIZE; px++) {
            map[py][px] = 0;
          }
        }
      }
      // Trees in yards
      for (var ti = 0; ti < 50; ti++) {
        var tx = Math.floor(Math.random() * MAP_SIZE);
        var ty = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty][tx] === 2) map[ty][tx] = 5;
      }
    } else if (scenarioId === 'rural' || scenarioId === 'snow' || scenarioId === 'fog') {
      // Winding road with actual curves (sine wave offset from center)
      for (var y2 = 0; y2 < MAP_SIZE; y2++) {
        var curveOffset = Math.round(Math.sin(y2 * 0.12) * 5); // road curves left-right
        var roadCenterHere = centerX + curveOffset;
        for (var dx3 = -3; dx3 <= 3; dx3++) {
          var rx3 = roadCenterHere + dx3;
          if (rx3 >= 0 && rx3 < MAP_SIZE) map[y2][rx3] = 0;
        }
        if (roadCenterHere >= 0 && roadCenterHere < MAP_SIZE) map[y2][roadCenterHere] = 3;
      }
      // Dense forest along sides
      for (var ti2 = 0; ti2 < 200; ti2++) {
        var tx2 = Math.floor(Math.random() * MAP_SIZE);
        var ty2 = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty2][tx2] === 2) map[ty2][tx2] = 5;
      }
    } else if (scenarioId === 'highway') {
      // 4-lane highway with gentle curves
      for (var y3 = 0; y3 < MAP_SIZE; y3++) {
        var hwCurve = Math.round(Math.sin(y3 * 0.06) * 3); // gentler curves than rural
        var hwCenter = centerX + hwCurve;
        for (var dx2 = -6; dx2 <= 6; dx2++) {
          var hx = hwCenter + dx2;
          if (hx >= 0 && hx < MAP_SIZE) map[y3][hx] = 0;
        }
        if (hwCenter - 1 >= 0 && hwCenter - 1 < MAP_SIZE) map[y3][hwCenter - 1] = 3;
        if (hwCenter + 1 >= 0 && hwCenter + 1 < MAP_SIZE) map[y3][hwCenter + 1] = 3;
        // Median barrier (cell type 6 = solid but not building)
        if (hwCenter >= 0 && hwCenter < MAP_SIZE) map[y3][hwCenter] = 6;
      }
      // On-ramp at y=50
      for (var ry = 45; ry < 55; ry++) {
        for (var rx = centerX + 7; rx < centerX + 7 + (55 - ry); rx++) {
          if (rx < MAP_SIZE) map[ry][rx] = 0;
        }
      }
      // Sparse trees far from road
      for (var ti3 = 0; ti3 < 50; ti3++) {
        var tx3 = Math.floor(Math.random() * MAP_SIZE);
        var ty3 = Math.floor(Math.random() * MAP_SIZE);
        if (map[ty3][tx3] === 2 && Math.abs(tx3 - centerX) > 12) map[ty3][tx3] = 5;
      }
    } else if (scenarioId === 'roundabout') {
      // Circular road with 4 approach roads
      var cy2 = Math.floor(MAP_SIZE / 2);
      // Circle
      for (var rr = 6; rr <= 10; rr++) {
        for (var aa = 0; aa < 360; aa += 1.5) {
          var ax = Math.round(centerX + Math.cos(aa * Math.PI / 180) * rr);
          var ay = Math.round(cy2 + Math.sin(aa * Math.PI / 180) * rr);
          if (ax >= 0 && ax < MAP_SIZE && ay >= 0 && ay < MAP_SIZE) map[ay][ax] = 0;
        }
      }
      // Center island
      for (var iy = cy2 - 4; iy <= cy2 + 4; iy++) {
        for (var ix = centerX - 4; ix <= centerX + 4; ix++) {
          if (Math.hypot(ix - centerX, iy - cy2) < 5 && ix >= 0 && ix < MAP_SIZE && iy >= 0 && iy < MAP_SIZE) map[iy][ix] = 5;
        }
      }
      // 4 approach roads (N, S, E, W)
      carveRoadNS(centerX, 0, cy2 - 10);
      carveRoadNS(centerX, cy2 + 10, MAP_SIZE);
      carveRoadEW(cy2, 0, centerX - 10);
      carveRoadEW(cy2, centerX + 10, MAP_SIZE);
    } else if (scenarioId === 'downtown') {
      // Dense urban grid — lots of cross streets
      var crossYs = [14, 24, 36, 48, 60, 72, 84];
      crossYs.forEach(function(cy3) { carveRoadEW(cy3, 0, MAP_SIZE); });
      // Second N-S road for one-way pair
      carveRoadNS(centerX - 10, 0, MAP_SIZE);
      carveRoadNS(centerX + 10, 0, MAP_SIZE);
      addSidewalks(centerX);
      addSidewalks(centerX - 10);
      addSidewalks(centerX + 10);
      // Dense buildings in every gap
      for (var dby = 0; dby < MAP_SIZE; dby++) {
        for (var dbx = 0; dbx < MAP_SIZE; dbx++) {
          if (map[dby][dbx] === 2 && Math.random() < 0.15) map[dby][dbx] = 1;
        }
      }
      // Sparse trees
      for (var dti = 0; dti < 20; dti++) {
        var dtx = Math.floor(Math.random() * MAP_SIZE);
        var dty = Math.floor(Math.random() * MAP_SIZE);
        if (map[dty][dtx] === 4) map[dty][dtx] = 5; // tree on sidewalk
      }
    }
    // Dawn/dusk uses same map as rural but with fewer trees
    if (scenarioId === 'dawn') {
      for (var dawnT = 0; dawnT < 80; dawnT++) {
        var dtx2 = Math.floor(Math.random() * MAP_SIZE);
        var dty2 = Math.floor(Math.random() * MAP_SIZE);
        if (map[dty2][dtx2] === 2 && Math.abs(dtx2 - centerX) > 5) map[dty2][dtx2] = 5;
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9: TRAFFIC AI — Other vehicles on the road
  // ─────────────────────────────────────────────────────────

  function spawnTraffic(scenario) {
    var traffic = [];
    var count = scenario.traffic === 'light' ? 3 : scenario.traffic === 'medium' ? 7 : 12;
    var centerX = Math.floor(MAP_SIZE / 2);
    var vehicleTypes = [
      { type: 'car', weight: 50, colors: ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ffffff', '#64748b', '#0ea5e9', '#d946ef', '#14b8a6'] },
      { type: 'truck', weight: 12, colors: ['#1e293b', '#78350f', '#991b1b', '#1e3a5f'] },
      { type: 'suv', weight: 18, colors: ['#334155', '#1e40af', '#166534', '#7c2d12', '#ffffff'] },
      { type: 'van', weight: 8, colors: ['#ffffff', '#fbbf24', '#dc2626'] },
      { type: 'schoolbus', weight: scenario.id === 'school_zone' ? 15 : 4, colors: ['#f59e0b'] },
      { type: 'pickup', weight: 10, colors: ['#78350f', '#1e293b', '#991b1b', '#ffffff', '#334155'] }
    ];
    var totalWeight = vehicleTypes.reduce(function(s, v) { return s + v.weight; }, 0);
    for (var i = 0; i < count; i++) {
      // Weighted random vehicle type
      var roll = Math.random() * totalWeight;
      var vType = vehicleTypes[0];
      var acc = 0;
      for (var vi = 0; vi < vehicleTypes.length; vi++) {
        acc += vehicleTypes[vi].weight;
        if (roll < acc) { vType = vehicleTypes[vi]; break; }
      }
      // Ensure mix of same-direction and oncoming (at least 30% each way)
      var direction = i < count * 0.35 ? 1 : i < count * 0.7 ? -1 : (Math.random() < 0.5 ? 1 : -1);
      var color = vType.colors[Math.floor(Math.random() * vType.colors.length)];
      // Per-driver personality: speed bias (±10mph), following distance,
      // lane-change aggressiveness, stop-sign rolling tendency. Deterministic
      // per-vehicle (assigned at spawn) so the same car behaves consistently.
      var prRoll = Math.random();
      var personality;
      if (prRoll < 0.15) personality = { speedBias: 1.12, followMult: 0.8, aggro: 0.7, rollsStops: 0.25 }; // aggressive
      else if (prRoll < 0.35) personality = { speedBias: 0.92, followMult: 1.3, aggro: 0.15, rollsStops: 0.0 }; // cautious
      else if (prRoll < 0.48) personality = { speedBias: 0.88, followMult: 1.5, aggro: 0.05, rollsStops: 0.0 }; // elderly/learner
      else personality = { speedBias: 1.0, followMult: 1.0, aggro: 0.35, rollsStops: 0.05 }; // normal
      traffic.push({
        x: centerX + (direction === 1 ? -1.5 : 1.5),
        y: Math.random() * MAP_SIZE,
        heading: direction === 1 ? Math.PI / 2 : -Math.PI / 2,
        speed: (scenario.speedLimit - 5 + Math.random() * 10) * MPH_TO_MS * personality.speedBias,
        color: color,
        type: vType.type,
        personality: personality
      });
    }
    // Cross-street traffic (on intersections — only for grid scenarios)
    if (['residential', 'suburban', 'school_zone', 'night'].indexOf(scenario.id) !== -1) {
      var crossYs = [20, 40, 56, 72];
      crossYs.forEach(function(crossY, ci) {
        if (ci >= (scenario.traffic === 'light' ? 1 : 2)) return;
        var dir = ci % 2 === 0 ? 1 : -1;
        var crossVType = vehicleTypes[0]; // cars on cross streets
        traffic.push({
          x: dir === 1 ? 5 : MAP_SIZE - 5,
          y: crossY + (dir === 1 ? -1.5 : 1.5),
          heading: dir === 1 ? 0 : Math.PI,
          speed: 20 * MPH_TO_MS,
          color: crossVType.colors[ci % crossVType.colors.length],
          type: 'car',
          crossStreet: true
        });
      });
    }
    return traffic;
  }

  function spawnPedestrians(scenario) {
    if (scenario.id === 'highway' || scenario.id === 'rural') return [];
    var peds = [];
    var count = scenario.id === 'school_zone' ? 8 : scenario.id === 'downtown' ? 10 : scenario.id === 'residential' ? 4 : 3;
    var centerX = Math.floor(MAP_SIZE / 2);
    // Sidewalk X positions (left and right sidewalks)
    var sidewalkLeft = centerX - 4.5;
    var sidewalkRight = centerX + 4.5;
    var crossYs = [20, 40, 56, 72];
    for (var i = 0; i < count; i++) {
      var nearIntersection = i < count * 0.6;
      var pedY = nearIntersection ? crossYs[i % crossYs.length] : 10 + Math.random() * (MAP_SIZE - 20);
      var side = i % 2 === 0 ? -1 : 1; // alternate sides
      // Spawn exactly ON the sidewalk
      var pedX = side === -1 ? sidewalkLeft : sidewalkRight;
      // Pedestrian "kind" — changes appearance and speed. Kids are small and
      // unpredictable (can dart), joggers move fast along sidewalk, dog walkers
      // have a small dog that wanders on a short tether.
      var kindRoll = Math.random();
      var kind;
      if (scenario.id === 'school_zone' && kindRoll < 0.55) kind = 'kid';
      else if (kindRoll < 0.15) kind = 'kid';
      else if (kindRoll < 0.30) kind = 'jogger';
      else if (kindRoll < 0.45) kind = 'dogWalker';
      else kind = 'adult';
      var speedMult = kind === 'jogger' ? 3.5 : kind === 'kid' ? 1.6 : 1.0;
      peds.push({
        x: pedX,
        y: pedY,
        homeX: pedX,
        vx: 0,
        vy: nearIntersection ? 0 : (Math.random() - 0.5) * 0.08 * speedMult,
        color: kind === 'jogger' ? '#22c55e' : kind === 'kid' ? ['#fbbf24', '#ec4899', '#06b6d4'][i % 3] :
               kind === 'dogWalker' ? '#6b7280' : ['#fbbf24', '#ec4899', '#06b6d4', '#84cc16', '#a78bfa', '#f97316'][i % 6],
        crossing: false,
        waitingAtCrosswalk: nearIntersection,
        crosswalkY: nearIntersection ? crossYs[i % crossYs.length] : null,
        crossDirection: side,
        sidewalkLeft: sidewalkLeft,
        sidewalkRight: sidewalkRight,
        kind: kind,
        dartCooldown: 0 // kids may dart into street
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

  // ─────────────────────────────────────────────────────────
  // SECTION 9e: ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────

  var ACHIEVEMENTS = [
    { id: 'first_drive', icon: '🔑', name: 'First Drive', desc: 'Complete your first drive session.' },
    { id: 'no_crash', icon: '🛡️', name: 'No Scratch', desc: 'Complete a drive with zero crashes.' },
    { id: 'eco_warrior', icon: '🌿', name: 'Eco Warrior', desc: 'Achieve efficiency score 90+.' },
    { id: 'safety_star', icon: '⭐', name: 'Safety Star', desc: 'Achieve safety score 95+.' },
    { id: 'a_plus', icon: '🏆', name: 'A+ Driver', desc: 'Earn an A+ grade on any drive.' },
    { id: 'permit_pass', icon: '📝', name: 'Test Ready', desc: 'Pass the permit test (80%+).' },
    { id: 'night_owl', icon: '🦉', name: 'Night Owl', desc: 'Complete a night drive with safety 80+.' },
    { id: 'winter_warrior', icon: '❄️', name: 'Winter Warrior', desc: 'Complete the Snow scenario with safety 70+.' },
    { id: 'hypermiler', icon: '⛽', name: 'Hypermiler', desc: 'Beat the EPA city MPG rating in a drive.' },
    { id: 'full_stop', icon: '🛑', name: 'Full Stop', desc: 'Make 3+ full stops at stop signs in one drive.' },
    { id: 'signal_perfect', icon: '◄►', name: 'Signal Perfect', desc: 'Complete a drive with zero unsignaled lane changes.' },
    { id: 'park_master', icon: '🅿️', name: 'Park Master', desc: 'Parallel park with score 80+.' },
    { id: 'three_point', icon: '↩️', name: 'K-Turn Pro', desc: 'Complete 3-point turn with score 80+.' },
    { id: 'speed_demon', icon: '🏎️', name: 'Speed Demon', desc: 'Hit 80+ mph (not recommended in real life!).' },
    { id: 'moose_dodge', icon: '🫎', name: 'Moose Dodge', desc: 'Encounter a moose and NOT hit it.' },
    { id: 'five_scenarios', icon: '🗺️', name: 'Explorer', desc: 'Drive in 5 different scenarios.' },
    { id: 'emergency_yield', icon: '🚑', name: 'First Responder', desc: 'Correctly yield to an emergency vehicle (pull right + stop).' },
    { id: 'ten_drives', icon: '🔟', name: 'Road Veteran', desc: 'Complete 10 drive sessions.' },
    { id: 'hazard_ace', icon: '⚡', name: 'Hazard Ace', desc: 'Score 8/10 or better on the Hazard Perception Test.' },
    { id: 'night_drive', icon: '🌙', name: 'After Dark', desc: 'Complete a night or dawn/dusk scenario.' },
    { id: 'all_weather', icon: '🌦️', name: 'All-Weather Driver', desc: 'Drive in clear, rain, snow, and fog conditions.' },
    // ── Open-world landmark achievements ──
    { id: 'first_landmark', icon: '📍', name: 'First Destination', desc: 'Arrive at your first landmark in Free Explore.' },
    { id: 'five_landmarks', icon: '🗺️', name: 'Local Navigator', desc: 'Visit 5 different landmark destinations.' },
    { id: 'ten_landmarks', icon: '🏁', name: 'Town Tourist', desc: 'Visit 10 landmark destinations in Free Explore.' },
    { id: 'school_hero', icon: '🏫', name: 'School Zone Hero', desc: 'Pass a school landmark at 20 mph or less.' },
    { id: 'emergency_response', icon: '🚒', name: 'Emergency Responder', desc: 'Yield correctly to a fire truck or ambulance spawned from a landmark.' },
    { id: 'maine_explorer', icon: '🗽', name: 'Maine Explorer', desc: 'Visit a lighthouse in Free Explore.' },
    { id: 'civic_scholar', icon: '🎓', name: 'Civic Scholar', desc: 'Visit a school, library, and post office.' },
    { id: 'safe_return', icon: '🏠', name: 'Safe Return', desc: 'Visit 3+ landmarks in one drive without crashing.' },
    { id: 'bus_respect', icon: '🚌', name: 'Bus Respect', desc: 'Stop for a school bus with its stop-arm extended.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 9f: EMERGENCY VEHICLES
  // ─────────────────────────────────────────────────────────

  var _lastEmergencyCheck = 0;
  function maybeSpawnEmergency(scenario, time) {
    if (time < 30) return null; // give player 30 seconds to settle
    // Only check once per second (not every frame)
    if (time - _lastEmergencyCheck < 1) return null;
    _lastEmergencyCheck = time;
    // 0.5% chance per second = roughly once every 3-4 minutes
    // In a typical 5 min drive, you'll see 0-1 emergency vehicles
    if (Math.random() > 0.005) return null;
    var types = [
      { kind: 'ambulance', icon: '🚑', color: '#ef4444', sirenFreq: 800, lightColor1: 0xff0000, lightColor2: 0xffffff, bodyColor: 0xffffff },
      { kind: 'firetruck', icon: '🚒', color: '#f97316', sirenFreq: 600, lightColor1: 0xff0000, lightColor2: 0xff4400, bodyColor: 0xcc2200 },
      { kind: 'police', icon: '🚓', color: '#3b82f6', sirenFreq: 1000, lightColor1: 0xff0000, lightColor2: 0x0044ff, bodyColor: 0x111111 }
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  // Traffic signals — placed at intersections along the main road.
  // Cycle: green → yellow → red → green. Yellow gives the driver decision time.
  function spawnSignals(scenario) {
    var signals = [];
    var centerX = Math.floor(MAP_SIZE / 2);
    if (scenario.id === 'suburban' || scenario.id === 'school_zone' || scenario.id === 'night') {
      [20, 40, 56, 72].forEach(function(yPos, idx) {
        signals.push({
          x: centerX, y: yPos, type: 'light',
          state: idx === 0 ? 'green' : idx === 1 ? 'red' : 'green',
          timer: Math.random() * 5,
          greenDur: 8, yellowDur: 3, redDur: 6
        });
      });
    } else if (scenario.id === 'downtown') {
      // Traffic lights at every cross street (dense)
      [14, 24, 36, 48, 60, 72, 84].forEach(function(yPos, idx) {
        signals.push({
          x: centerX, y: yPos, type: 'light',
          state: idx % 3 === 0 ? 'green' : idx % 3 === 1 ? 'red' : 'green',
          timer: Math.random() * 4, greenDur: 6, yellowDur: 2.5, redDur: 5
        });
      });
    } else if (scenario.id === 'residential') {
      // Stop signs at intersections
      [20, 40, 56, 72].forEach(function(yPos) {
        signals.push({ x: centerX, y: yPos, type: 'stop', state: 'stop' });
      });
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

  var _lastWildlifeCheck = 0;
  function maybeSpawnWildlife(scenario, time) {
    // Only on rural/snow/fog/night/dawn
    if (['rural', 'snow', 'fog', 'night', 'dawn'].indexOf(scenario.id) === -1) return null;
    // Check once per second
    if (time - _lastWildlifeCheck < 1) return null;
    _lastWildlifeCheck = time;
    // 1% per second = ~once per 100 seconds (~1.5 min)
    // Dawn/dusk has higher chance (peak animal activity)
    var chance = scenario.id === 'dawn' ? 0.025 : 0.01;
    if (Math.random() > chance) return null;
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
  // ─────────────────────────────────────────────────────────
  // SECTION 9d: 3-POINT TURN MODE (2D top-down)
  // ─────────────────────────────────────────────────────────
  // Reverse direction on a narrow road without hitting curbs.

  function ThreePointMode(props) {
    var React = props.React;
    var h = props.h;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useState = React.useState;
    var canvasRef = useRef(null);
    var carRef = useRef({ x: 460, y: 240, heading: 0, speed: 0, steering: 0 });
    var keysRef = useRef({});
    var animRef = useRef(null);
    var stageRef = useRef(0);
    var doneRef = useRef(false);
    var fb = useState('Step 1: Turn the wheel FULL LEFT. Drive forward slowly until your front bumper nears the far curb.');
    var fbText = fb[0]; var setFb = fb[1];
    var st = useState({ score: 100, hits: 0, done: false });
    var stVal = st[0]; var setSt = st[1];

    var ROAD_TOP = 140;
    var ROAD_BOT = 340;
    var CURB_W = 8;

    var STEPS = [
      'Step 1: Turn the wheel FULL LEFT. Drive forward slowly until your front nears the far curb. STOP.',
      'Step 2: Now shift to REVERSE (S/Shift). Turn wheel FULL RIGHT. Back slowly toward the near curb. STOP.',
      'Step 3: Shift to DRIVE (W). Steer straight or slightly left. Drive forward — you should now be facing the opposite direction.',
      '✅ 3-POINT TURN COMPLETE! Score: '
    ];

    useEffect(function() {
      var onD = function(e) {
        keysRef.current[e.key.toLowerCase()] = true;
        if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
        if (e.key.toLowerCase() === 'r') resetCar();
      };
      var onU = function(e) { keysRef.current[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', onD);
      window.addEventListener('keyup', onU);
      return function() { window.removeEventListener('keydown', onD); window.removeEventListener('keyup', onU); };
    }, []);

    function resetCar() {
      carRef.current = { x: 460, y: 240, heading: 0, speed: 0, steering: 0 };
      stageRef.current = 0;
      doneRef.current = false;
      setSt({ score: 100, hits: 0, done: false });
      setFb(STEPS[0]);
    }

    useEffect(function() {
      var canvas = canvasRef.current;
      if (!canvas) return;
      var gfx = canvas.getContext('2d');

      var step = function() {
        if (!doneRef.current) update();
        render();
        animRef.current = requestAnimationFrame(step);
      };

      var update = function() {
        var car = carRef.current;
        var k = keysRef.current;
        var fwd = (k['w'] || k['arrowup']) ? 1 : 0;
        var rev = (k['s'] || k['arrowdown'] || k['shift']) ? 1 : 0;
        var left = (k['a'] || k['arrowleft']) ? 1 : 0;
        var right = (k['d'] || k['arrowright']) ? 1 : 0;
        var steerTarget = (right - left) * 0.7;
        car.steering += (steerTarget - car.steering) * 0.15;
        var accel = (fwd - rev) * 30;
        car.speed += accel * 0.016;
        car.speed *= 0.92;
        if (car.speed > 50) car.speed = 50;
        if (car.speed < -35) car.speed = -35;
        var turnRate = car.steering * (car.speed / 30) * 1.4;
        car.heading += turnRate * 0.016;
        car.x += Math.cos(car.heading) * car.speed * 0.016;
        car.y += Math.sin(car.heading) * car.speed * 0.016;
        // Curb collisions
        if (car.y < ROAD_TOP + 14 || car.y > ROAD_BOT - 14) {
          if (Math.abs(car.speed) > 3) {
            var ns = Object.assign({}, stVal);
            ns.score -= 15; ns.hits++;
            setSt(ns);
            setFb('💥 Curb hit! -15. Slow down near the edge. Press R to reset.');
          }
          car.speed *= -0.2;
          car.y = Math.max(ROAD_TOP + 15, Math.min(ROAD_BOT - 15, car.y));
        }
        // Left/right bounds
        if (car.x < 30) { car.x = 30; car.speed *= 0.2; }
        if (car.x > 620) { car.x = 620; car.speed *= 0.2; }
        // Stage progression
        var headDeg = ((car.heading * 180 / Math.PI) % 360 + 360) % 360;
        if (stageRef.current === 0 && car.y < ROAD_TOP + 40 && Math.abs(car.speed) < 2) {
          stageRef.current = 1; setFb(STEPS[1]);
        } else if (stageRef.current === 1 && car.y > ROAD_BOT - 40 && Math.abs(car.speed) < 2) {
          stageRef.current = 2; setFb(STEPS[2]);
        } else if (stageRef.current === 2 && headDeg > 150 && headDeg < 210 && Math.abs(car.speed) < 3) {
          stageRef.current = 3;
          doneRef.current = true;
          var ns2 = Object.assign({}, stVal);
          ns2.done = true;
          setSt(ns2);
          setFb(STEPS[3] + ns2.score + '/100 (' + ns2.hits + ' hits)');
        }
      };

      var render = function() {
        var W = canvas.width = canvas.offsetWidth;
        var H = canvas.height = 480;
        // Background
        gfx.fillStyle = '#166534'; gfx.fillRect(0, 0, W, H);
        // Road
        gfx.fillStyle = '#334155'; gfx.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
        // Curbs
        gfx.fillStyle = '#fbbf24';
        gfx.fillRect(0, ROAD_TOP, W, CURB_W);
        gfx.fillRect(0, ROAD_BOT - CURB_W, W, CURB_W);
        // Center dashes
        gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2; gfx.setLineDash([20, 20]);
        gfx.beginPath(); gfx.moveTo(0, (ROAD_TOP + ROAD_BOT) / 2); gfx.lineTo(W, (ROAD_TOP + ROAD_BOT) / 2); gfx.stroke();
        gfx.setLineDash([]);
        // Direction arrow showing target
        gfx.fillStyle = 'rgba(74,222,128,0.3)';
        gfx.beginPath(); gfx.moveTo(100, (ROAD_TOP + ROAD_BOT) / 2 - 20); gfx.lineTo(50, (ROAD_TOP + ROAD_BOT) / 2); gfx.lineTo(100, (ROAD_TOP + ROAD_BOT) / 2 + 20); gfx.fill();
        gfx.fillStyle = '#4ade80'; gfx.font = '10px system-ui'; gfx.textAlign = 'center';
        gfx.fillText('Target: face this way ←', 120, (ROAD_TOP + ROAD_BOT) / 2 + 4);
        // Car
        var car = carRef.current;
        gfx.save();
        gfx.translate(car.x, car.y);
        gfx.rotate(car.heading);
        gfx.fillStyle = '#ec4899';
        gfx.fillRect(-30, -14, 60, 28);
        gfx.fillStyle = '#831843';
        gfx.fillRect(-24, -11, 16, 22);
        // Reverse lights
        if (car.speed < -0.5) { gfx.fillStyle = '#fff'; gfx.fillRect(25, -10, 6, 6); gfx.fillRect(25, 4, 6, 6); }
        // Steering indicator
        gfx.save(); gfx.translate(-18, 0); gfx.rotate(car.steering);
        gfx.fillStyle = '#0f172a'; gfx.fillRect(-3, -9, 6, 18);
        gfx.restore();
        gfx.restore();
        // HUD
        gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(10, 10, 300, 50);
        gfx.fillStyle = '#fff'; gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left';
        gfx.fillText('↩️ 3-Point Turn Trainer', 20, 28);
        gfx.fillStyle = '#ec4899'; gfx.font = '10px system-ui';
        gfx.fillText('Score: ' + stVal.score + ' · Hits: ' + stVal.hits + (stVal.done ? ' · ✓ DONE' : ' · Step ' + (stageRef.current + 1)), 20, 44);
        gfx.fillStyle = '#94a3b8';
        gfx.fillText('W=fwd  S/Shift=reverse  A/D=steer  R=reset', 20, 56);
      };

      animRef.current = requestAnimationFrame(step);
      return function() { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [stVal]);

    return h('div', { style: { padding: '14px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
      h('button', { onClick: props.onExit, style: { marginBottom: '10px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
      h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '10px', border: '1px solid #ec4899' } },
        h('canvas', { ref: canvasRef, style: { width: '100%', height: '480px', display: 'block', borderRadius: '8px', background: '#1e293b' } })
      ),
      h('div', { style: { marginTop: '10px', padding: '12px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' } },
        h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', marginBottom: '6px' } }, '👨‍🏫 Instructor'),
        h('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' } }, fbText),
        h('div', { style: { marginTop: '8px', fontSize: '10px', color: '#64748b' } }, 'Tip: On the Maine road test, examiner checks that you complete the turn in exactly 3 moves without hitting a curb or crossing traffic. Slow is good.')
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 9g: STRAIGHT BACKING DRILL (2D top-down)
  // ─────────────────────────────────────────────────────────

  function BackingDrillMode(props) {
    var React = props.React;
    var h = props.h;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useState = React.useState;
    var canvasRef = useRef(null);
    var carRef = useRef({ x: 300, y: 80, heading: Math.PI / 2, speed: 0, steering: 0 });
    var keysRef = useRef({});
    var animRef = useRef(null);
    var doneRef = useRef(false);
    var fb = useState('Reverse in a perfectly straight line for 100 ft. Stay between the cones. Use S/Shift to reverse, A/D to steer.');
    var fbText = fb[0]; var setFb = fb[1];
    var st = useState({ score: 100, conesHit: 0, done: false });
    var stVal = st[0]; var setSt = st[1];

    var LANE_LEFT = 275;
    var LANE_RIGHT = 325;
    var TARGET_Y = 430;
    var CONES = [];
    for (var ci = 0; ci < 10; ci++) {
      CONES.push({ x: LANE_LEFT, y: 100 + ci * 36 });
      CONES.push({ x: LANE_RIGHT, y: 100 + ci * 36 });
    }

    useEffect(function() {
      var onD = function(e) { keysRef.current[e.key.toLowerCase()] = true; if (['w','a','s','d','shift'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault(); if (e.key.toLowerCase() === 'r') resetCar(); };
      var onU = function(e) { keysRef.current[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', onD); window.addEventListener('keyup', onU);
      return function() { window.removeEventListener('keydown', onD); window.removeEventListener('keyup', onU); };
    }, []);

    function resetCar() {
      carRef.current = { x: 300, y: 80, heading: Math.PI / 2, speed: 0, steering: 0 };
      doneRef.current = false;
      setSt({ score: 100, conesHit: 0, done: false });
      setFb('Reverse in a perfectly straight line for 100 ft. Stay between the cones.');
    }

    useEffect(function() {
      var canvas = canvasRef.current;
      if (!canvas) return;
      var gfx = canvas.getContext('2d');
      var step = function() {
        if (!doneRef.current) update();
        render();
        animRef.current = requestAnimationFrame(step);
      };
      var update = function() {
        var car = carRef.current;
        var k = keysRef.current;
        var rev = (k['s'] || k['shift']) ? 1 : 0;
        var fwd = (k['w']) ? 1 : 0;
        var left = (k['a']) ? 1 : 0;
        var right = (k['d']) ? 1 : 0;
        car.steering += ((right - left) * 0.5 - car.steering) * 0.12;
        car.speed += (fwd - rev) * 25 * 0.016;
        car.speed *= 0.92;
        var turnRate = car.steering * (car.speed / 30) * 1.2;
        car.heading += turnRate * 0.016;
        car.x += Math.cos(car.heading) * car.speed * 0.016;
        car.y += Math.sin(car.heading) * car.speed * 0.016;
        // Cone collision
        CONES.forEach(function(cone) {
          if (Math.hypot(car.x - cone.x, car.y - cone.y) < 16 && !cone.hit) {
            cone.hit = true;
            var ns = Object.assign({}, stVal);
            ns.score -= 10; ns.conesHit++;
            setSt(ns);
            setFb('🔶 Cone hit! -10. Steer more gently.');
          }
        });
        // Success check
        if (car.y >= TARGET_Y && Math.abs(car.x - 300) < 30) {
          doneRef.current = true;
          var ns2 = Object.assign({}, stVal);
          ns2.done = true;
          setSt(ns2);
          setFb('✅ Backed straight! Score: ' + ns2.score + '/100. ' + (ns2.conesHit === 0 ? 'Perfect — zero cones!' : ns2.conesHit + ' cone(s) hit.'));
        }
      };
      var render = function() {
        var W = canvas.width = canvas.offsetWidth;
        var H = canvas.height = 480;
        gfx.fillStyle = '#334155'; gfx.fillRect(0, 0, W, H);
        // Lane lines
        gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2; gfx.setLineDash([14, 14]);
        gfx.beginPath(); gfx.moveTo(LANE_LEFT, 60); gfx.lineTo(LANE_LEFT, H); gfx.stroke();
        gfx.beginPath(); gfx.moveTo(LANE_RIGHT, 60); gfx.lineTo(LANE_RIGHT, H); gfx.stroke();
        gfx.setLineDash([]);
        // Target zone
        gfx.fillStyle = 'rgba(74,222,128,0.15)';
        gfx.fillRect(LANE_LEFT, TARGET_Y - 10, LANE_RIGHT - LANE_LEFT, 30);
        gfx.fillStyle = '#4ade80'; gfx.font = 'bold 11px system-ui'; gfx.textAlign = 'center';
        gfx.fillText('TARGET', 300, TARGET_Y + 8);
        // Cones
        CONES.forEach(function(cone) {
          gfx.fillStyle = cone.hit ? '#475569' : '#f97316';
          gfx.beginPath(); gfx.moveTo(cone.x, cone.y - 8); gfx.lineTo(cone.x - 6, cone.y + 6); gfx.lineTo(cone.x + 6, cone.y + 6); gfx.closePath(); gfx.fill();
        });
        // Car
        var car = carRef.current;
        gfx.save(); gfx.translate(car.x, car.y); gfx.rotate(car.heading - Math.PI / 2);
        gfx.fillStyle = '#a3a3a3'; gfx.fillRect(-22, -12, 44, 24);
        gfx.fillStyle = '#404040'; gfx.fillRect(-16, -10, 14, 20);
        if (car.speed < -0.5) { gfx.fillStyle = '#fff'; gfx.fillRect(17, -8, 5, 5); gfx.fillRect(17, 3, 5, 5); }
        gfx.restore();
        // HUD
        gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(10, 10, 280, 50);
        gfx.fillStyle = '#fff'; gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left';
        gfx.fillText('🔙 Straight Backing Drill', 20, 28);
        gfx.fillStyle = '#a3a3a3'; gfx.font = '10px system-ui';
        gfx.fillText('Score: ' + stVal.score + ' · Cones: ' + stVal.conesHit + (stVal.done ? ' · ✓ DONE' : ''), 20, 44);
      };
      animRef.current = requestAnimationFrame(step);
      return function() { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [stVal]);

    return h('div', { style: { padding: '14px', maxWidth: '900px', margin: '0 auto', color: '#e2e8f0' } },
      h('button', { onClick: props.onExit, style: { marginBottom: '10px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
      h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '10px', border: '1px solid #a3a3a3' } },
        h('canvas', { ref: canvasRef, style: { width: '100%', height: '480px', display: 'block', borderRadius: '8px', background: '#1e293b' } })
      ),
      h('div', { style: { marginTop: '10px', padding: '12px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' } },
        h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#a3a3a3', textTransform: 'uppercase', marginBottom: '6px' } }, '👨‍🏫 Instructor'),
        h('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' } }, fbText),
        h('div', { style: { marginTop: '6px', fontSize: '10px', color: '#64748b' } }, 'Tip: Look over your RIGHT shoulder, not in the mirrors. Use small steering corrections. Press R to reset.')
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
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;

      var d = (ctx.toolData && ctx.toolData['roadReady']) || {};
      var upd = function(key, val) { ctx.update('roadReady', key, val); };
      var updMulti = function(obj) { ctx.updateMulti ? ctx.updateMulti('roadReady', obj) : Object.keys(obj).forEach(function(k) { upd(k, obj[k]); }); };
      var addToast = ctx.addToast || function(msg) { console.log('[RoadReady]', msg); };
      var callTTS = ctx.callTTS || null;
      var callGemini = ctx.callGemini || null;
      // Voice instructor: speaks coaching tips and scenario intros aloud
      var _lastSpokenRef = useRef(0);
      var speak = function(text) {
        if (!callTTS || !text) return;
        var now = Date.now();
        if (now - _lastSpokenRef.current < 5000) return; // throttle: max once per 5 seconds
        _lastSpokenRef.current = now;
        callTTS(text, null, 1.0, { force: true }).catch(function() {});
      };

      var view = d.view || 'menu';
      var selectedVehicle = d.vehicle || 'sedan';
      var selectedScenario = d.scenario || 'residential';
      var selectedLesson = d.lesson || null;
      var permitState = d.permit || null;
      var drivingStats = d.drivingStats || null;

      var currentVehicle = VEHICLES.find(function(v) { return v.id === selectedVehicle; }) || VEHICLES[0];
      var currentScenario = SCENARIOS.find(function(s) { return s.id === selectedScenario; }) || SCENARIOS[0];

      // ── Refs for the active driving sim ──
      var canvasRef = useRef(null);  // 2D HUD overlay canvas
      var canvas3dRef = useRef(null); // Three.js WebGL canvas
      var threeRef = useRef(null); // { scene, camera, renderer, objects... }
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
      // Two-tone horn: major-third stack (≈400 + ≈500 Hz) with a square wave for
      // bite and a tiny attack ramp. Closer to a real car than a single beep.
      var playHorn = function(dur) {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var hn = dur || 0.35;
          [440, 554].forEach(function(freq, idx) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            var t0 = ac.currentTime;
            gn.gain.setValueAtTime(0, t0);
            gn.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.05, t0 + 0.015);
            gn.gain.setTargetAtTime(0, t0 + Math.max(0.05, hn - 0.08), 0.05);
            // Slight pitch droop at the tail — authentic mechanical decay.
            osc.frequency.setTargetAtTime(freq * 0.97, t0 + hn - 0.08, 0.1);
            osc.connect(gn).connect(ac.destination);
            osc.start();
            osc.stop(t0 + hn);
          });
        } catch (hornErr) {}
      };
      // Tire splash — quick high-band noise burst, used when crossing a puddle.
      var playSplash = function(intensity) {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var amp = Math.max(0.04, Math.min(0.18, intensity * 0.025));
          var blen = Math.floor(ac.sampleRate * 0.22);
          var b = ac.createBuffer(1, blen, ac.sampleRate);
          var bd = b.getChannelData(0);
          for (var i = 0; i < blen; i++) bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / blen, 1.6);
          var src = ac.createBufferSource();
          src.buffer = b;
          var bp = ac.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 2400;
          bp.Q.value = 1.4;
          var gn = ac.createGain();
          gn.gain.value = amp;
          src.connect(bp).connect(gn).connect(ac.destination);
          src.start();
          src.stop(ac.currentTime + 0.22);
        } catch (spErr) {}
      };
      // Pothole thump — short low filtered impulse with body resonance.
      var playThump = function(intensity) {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var amp = Math.max(0.05, Math.min(0.22, intensity * 0.03));
          // Filtered noise burst (impact).
          var blen = Math.floor(ac.sampleRate * 0.18);
          var b = ac.createBuffer(1, blen, ac.sampleRate);
          var bd = b.getChannelData(0);
          for (var i = 0; i < blen; i++) bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / blen, 2);
          var src = ac.createBufferSource();
          src.buffer = b;
          var lp = ac.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 180;
          var gn = ac.createGain();
          gn.gain.value = amp;
          src.connect(lp).connect(gn).connect(ac.destination);
          src.start();
          src.stop(ac.currentTime + 0.18);
          // Body resonance — quick decaying sine to suggest the chassis ringing.
          var ros = ac.createOscillator();
          var rg = ac.createGain();
          ros.type = 'sine';
          ros.frequency.value = 65;
          var t0 = ac.currentTime;
          rg.gain.setValueAtTime(amp * 0.6, t0);
          rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
          ros.connect(rg).connect(ac.destination);
          ros.start();
          ros.stop(t0 + 0.27);
        } catch (thErr) {}
      };
      // Gear-shift clunk: brief filtered noise pop with a faint pitched click.
      // Mechanical-feeling without overstaying its welcome.
      var playGearShift = function() {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var blen = Math.floor(ac.sampleRate * 0.12);
          var b = ac.createBuffer(1, blen, ac.sampleRate);
          var bd = b.getChannelData(0);
          for (var i = 0; i < blen; i++) bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / blen, 1.5);
          var src = ac.createBufferSource();
          src.buffer = b;
          var bp = ac.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 320;
          bp.Q.value = 4;
          var gn = ac.createGain();
          gn.gain.value = 0.18;
          src.connect(bp).connect(gn).connect(ac.destination);
          src.start();
          src.stop(ac.currentTime + 0.12);
          // Mechanical click — short metallic blip on top of the noise pop.
          var clk = ac.createOscillator();
          var clkG = ac.createGain();
          clk.type = 'square';
          clk.frequency.value = 720;
          var t0 = ac.currentTime;
          clkG.gain.setValueAtTime(0.05, t0);
          clkG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
          clk.connect(clkG).connect(ac.destination);
          clk.start(t0);
          clk.stop(t0 + 0.06);
        } catch (gsErr) {}
      };
      // Engine crank → catch sequence. 3 short low oscillator chugs at ~6 Hz
      // then a rising pitch glide as the engine catches. Plays once at session
      // start before the persistent engine layer ramps up.
      var playEngineStart = function() {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var t0 = ac.currentTime;
          // Three crank chugs — low square pulses with noise overlay.
          for (var k = 0; k < 3; k++) {
            var osc = ac.createOscillator();
            var gn = ac.createGain();
            osc.type = 'square';
            osc.frequency.value = 28 + k * 2;
            gn.gain.value = 0;
            osc.connect(gn).connect(ac.destination);
            var tk = t0 + k * 0.16;
            gn.gain.setValueAtTime(0, tk);
            gn.gain.linearRampToValueAtTime(0.07, tk + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.001, tk + 0.13);
            osc.start(tk);
            osc.stop(tk + 0.15);
          }
          // Catch — pitch glides up over 0.4s into idle.
          var catchOsc = ac.createOscillator();
          var catchGn = ac.createGain();
          catchOsc.type = 'sawtooth';
          catchOsc.frequency.setValueAtTime(35, t0 + 0.5);
          catchOsc.frequency.exponentialRampToValueAtTime(70, t0 + 0.95);
          catchOsc.frequency.exponentialRampToValueAtTime(45, t0 + 1.4);
          catchGn.gain.setValueAtTime(0, t0 + 0.5);
          catchGn.gain.linearRampToValueAtTime(0.06, t0 + 0.62);
          catchGn.gain.exponentialRampToValueAtTime(0.001, t0 + 1.5);
          catchOsc.connect(catchGn).connect(ac.destination);
          catchOsc.start(t0 + 0.5);
          catchOsc.stop(t0 + 1.55);
        } catch (esErr) {}
      };
      // Door-close thud: short filtered noise burst. Fires when drivingRef flips on.
      var playDoorClose = function() {
        try {
          var ac = audioRef.current && audioRef.current.ctx;
          if (!ac) return;
          var blen = Math.floor(ac.sampleRate * 0.25);
          var b = ac.createBuffer(1, blen, ac.sampleRate);
          var bd = b.getChannelData(0);
          for (var i = 0; i < blen; i++) bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / blen, 2);
          var src = ac.createBufferSource();
          src.buffer = b;
          var lpf = ac.createBiquadFilter();
          lpf.type = 'lowpass';
          lpf.frequency.value = 220;
          var gn = ac.createGain();
          gn.gain.value = 0.35;
          src.connect(lpf).connect(gn).connect(ac.destination);
          src.start();
          src.stop(ac.currentTime + 0.25);
        } catch (dcErr) {}
      };
      var skidRef = useRef({ active: false, intensity: 0 });
      var eventToastRef = useRef({ msg: null, until: 0 });
      var drivingRef = useRef(false);
      var pausedRef = useRef(false);
      var timeRef = useRef(0);
      var statsRef = useRef({ startTime: 0, distance: 0, maxSpeed: 0, mpgSum: 0, mpgSamples: 0, hardBrakes: 0, jackrabbits: 0, speedViolations: 0, closeFollows: 0, crashes: 0, stops: 0, safetyScore: 100, efficiencyScore: 100, fuelUsed: 0, skidSeconds: 0, cyclistClose: 0 });
      var lastStateRef = useRef({ speed: 0, accel: 0 });
      var showHUDRef = useRef(true);
      var cameraModeRef = useRef('cockpit'); // cockpit | chase | overhead
      // ─── HEAD-CHECK STATE ───
      // Tracks whether the player is currently holding a shoulder-check key.
      // dir: 0 = forward (no check), -1 = left shoulder, 1 = right shoulder
      // swivel: current smoothed head rotation (radians) — lerps toward target
      // lastCheckLeft / lastCheckRight: timestamps of most recent checks (for teaching)
      var headCheckRef = useRef({ dir: 0, swivel: 0, lastCheckLeft: 0, lastCheckRight: 0 });
      var gearRef = useRef('P'); // P = park, R = reverse, D = drive
      var distractRef = useRef({ active: false, timer: 0, msg: '', penalty: false }); // distracted driving events
      var blinkerRef = useRef(0); // -1 left, 0 off, 1 right
      var blinkerTimerRef = useRef(0); // for visual blink
      var laneChangeRef = useRef({ active: false, dir: 0, signaled: false });
      var mpgHistoryRef = useRef([]); // last 60 MPG readings for sparkline
      var blackBoxRef = useRef([]); // last 5 seconds of car state for crash replay
      var drivePathRef = useRef([]); // full drive path for debrief map (sampled every 0.5s)
      var infiniteWorldRef = useRef(null); // procedural infinite world (Free Explore only)
      var questRef = useRef(null); // { destination: {name, x, y, icon}, distanceMi, completed, reward }
      var rearviewRef = useRef(null); // canvas ref for mirror
      var emergencyRef = useRef(null); // { kind, icon, color, sirenFreq, x, y, heading, speed, life, responded }
      var earnedBadges = d.badges || {};
      var scenariosDriven = d.scenariosDriven || {};
      var weathersDriven = d.weathersDriven || {};

      // ── Input handling ──
      useEffect(function() {
        if (view !== 'driving') return;
        var onKeyDown = function(e) {
          keysRef.current[e.key.toLowerCase()] = true;
          if (e.key === ' ') { pausedRef.current = !pausedRef.current; e.preventDefault(); }
          if (e.key.toLowerCase() === 'c') {
            var modes = ['cockpit', 'chase', 'overhead', 'rearview'];
            cameraModeRef.current = modes[(modes.indexOf(cameraModeRef.current) + 1) % modes.length];
          }
          if (e.key.toLowerCase() === 'h') showHUDRef.current = !showHUDRef.current;
          if (e.key.toLowerCase() === 'l') upd('highBeams', !d.highBeams);
          // Gear shifting: F = drive, G = reverse, P = park (only when stopped or slow)
          if (e.key.toLowerCase() === 'f') {
            if (Math.abs(carRef.current.speed) < 1) gearRef.current = 'D';
          }
          if (e.key.toLowerCase() === 'g') {
            if (Math.abs(carRef.current.speed) < 1) gearRef.current = 'R';
          }
          if (e.key.toLowerCase() === 'p') {
            if (carRef.current.speed < 1) gearRef.current = 'P';
          }
          // Turn signals: E = left, V = right, T = cancel
          if (e.key.toLowerCase() === 'e') blinkerRef.current = blinkerRef.current === -1 ? 0 : -1;
          if (e.key.toLowerCase() === 'v') blinkerRef.current = blinkerRef.current === 1 ? 0 : 1;
          if (e.key.toLowerCase() === 't') blinkerRef.current = 0;
          // Horn — quick two-tone beep on 'q'
          if (e.key.toLowerCase() === 'q') playHorn(0.35);
          if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q','z','x'].indexOf(e.key.toLowerCase()) !== -1) e.preventDefault();
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
        else if (scn.id === 'downtown') introMsg = '🏙️ DOWNTOWN: Dense traffic, many signals, pedestrians everywhere. Patience is the skill here.';
        else if (scn.id === 'dawn') introMsg = '🌅 DAWN/DUSK: Low sun glare, reduced visibility. Peak moose/deer danger. Scan tree lines.';
        // Free explore gets its own welcome
        if (d.freeExplore && d.freeExploreScenario) {
          var fes = d.freeExploreScenario;
          scn.weather = fes.weather || scn.weather;
          scn.time = fes.time || scn.time;
          scn.traffic = fes.traffic || scn.traffic;
          scn.speedLimit = fes.speedLimit || scn.speedLimit;
          scn.name = 'Free Explore';
          scn.icon = '🌎';
          // Create infinite procedural world with seed
          var worldSeed = d.worldSeed || Math.floor(Math.random() * 100000);
          if (!d.worldSeed) upd('worldSeed', worldSeed);
          infiniteWorldRef.current = createInfiniteWorld(worldSeed);
          introMsg = '🌎 FREE EXPLORE — Infinite world. Z=look left, X=look right (shoulder check before lane changes!)';
        }
        eventToastRef.current = introMsg ? { msg: introMsg, until: 10 } : { msg: null, until: 0 };
        // Speak the intro aloud after a short delay
        if (introMsg) setTimeout(function() { speak(introMsg.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]/gu, '').trim()); }, 1500);
        timeRef.current = 0;
        // Init audio lazily on start
        try {
          var Ac = window.AudioContext || window.webkitAudioContext;
          if (Ac && !audioRef.current.ctx) {
            audioRef.current.ctx = new Ac();
          }
        } catch (e) { /* audio unavailable */ }
        // Start position: on the road, right lane, heading north, away from intersections
        // Start position: right lane, heading north, away from intersections
        var startY = Math.floor(MAP_SIZE * 0.85);
        var startCenterX = Math.floor(MAP_SIZE / 2);
        var startOffset = 1.5; // default right-lane offset from center
        var isHighway = scn.id === 'highway';
        if (mapRef.current && mapRef.current[startY]) {
          if (isHighway) {
            // Highway: find the MEDIAN (cell type 6), then place car in right lanes (+3 from median)
            var medianX = -1;
            for (var findM = startCenterX - 10; findM <= startCenterX + 10; findM++) {
              if (findM >= 0 && findM < MAP_SIZE && mapRef.current[startY][findM] === 6) {
                medianX = findM; break;
              }
            }
            if (medianX !== -1) {
              startCenterX = medianX;
              startOffset = 3.5; // well into the right lanes (away from median)
            } else {
              // No median found — use road midpoint
              var hwLeft = -1, hwRight = -1;
              for (var hsx = 0; hsx < MAP_SIZE; hsx++) {
                if (mapRef.current[startY][hsx] === 0) { if (hwLeft === -1) hwLeft = hsx; hwRight = hsx; }
              }
              if (hwLeft !== -1) { startCenterX = Math.floor((hwLeft + hwRight) / 2); startOffset = 3; }
            }
          } else {
            // Non-highway: find centerline marker (cell type 3)
            var foundCenter = false;
            for (var findX = startCenterX - 10; findX <= startCenterX + 10; findX++) {
              if (findX >= 0 && findX < MAP_SIZE && mapRef.current[startY][findX] === 3) {
                startCenterX = findX; foundCenter = true; break;
              }
            }
            if (!foundCenter) {
              var roadLeft = -1, roadRight = -1;
              for (var sx = 0; sx < MAP_SIZE; sx++) {
                if (mapRef.current[startY][sx] === 0 || mapRef.current[startY][sx] === 3) {
                  if (roadLeft === -1) roadLeft = sx;
                  roadRight = sx;
                }
              }
              if (roadLeft !== -1) startCenterX = Math.floor((roadLeft + roadRight) / 2);
            }
          }
        }
        // Verify the start position is on drivable road (not a wall/median/tree)
        var startX = startCenterX + startOffset;
        if (mapRef.current && mapRef.current[startY]) {
          var startCell = mapRef.current[startY][Math.floor(startX)];
          if (startCell === 1 || startCell === 5 || startCell === 6) {
            // Stuck in a wall! Scan nearby for open road
            for (var scanX = startCenterX - 6; scanX <= startCenterX + 6; scanX++) {
              if (scanX >= 0 && scanX < MAP_SIZE && mapRef.current[startY][scanX] === 0) {
                startX = scanX + 0.5; break;
              }
            }
          }
        }
        carRef.current = { x: startX, y: startY, heading: -Math.PI / 2, speed: 0, throttle: 0, brake: 0, steering: 0 };
        statsRef.current = { startTime: Date.now(), distance: 0, maxSpeed: 0, mpgSum: 0, mpgSamples: 0, hardBrakes: 0, jackrabbits: 0, speedViolations: 0, closeFollows: 0, crashes: 0, stops: 0, safetyScore: 100, efficiencyScore: 100, fuelUsed: 0, skidSeconds: 0, cyclistClose: 0, unsignaledLaneChanges: 0, emergencyYields: 0 };
        gearRef.current = 'P'; // start in Park
        blinkerRef.current = 0;
        laneChangeRef.current = { lastLane: null };
        mpgHistoryRef.current = [];
        emergencyRef.current = null;
        lastStateRef.current = { speed: 0, accel: 0 };
        timeRef.current = 0;
        drivingRef.current = true;
        pausedRef.current = false;
        updMulti({ view: 'driving', scenario: scn.id, vehicle: veh.id });
        // Door-thud when the session starts, then engine crank a beat later.
        // Delay so the audio ctx (only resumes on user gesture) has settled.
        setTimeout(function() { playDoorClose(); }, 80);
        setTimeout(function() { playEngineStart(); }, 450);
      }, []);

      var exitDriving = useCallback(function() {
        drivingRef.current = false;
        if (animRef.current) cancelAnimationFrame(animRef.current);
        // Stop ALL audio nodes (prevent memory leak from accumulated oscillators/buffers)
        try {
          var a = audioRef.current;
          // Stop and disconnect all oscillators and buffer sources
          ['engineOsc', '_engineHarm', '_engineOct', '_engineNoise', '_engineLFO',
           '_skidOsc', '_sirenOsc', '_windNode', '_rainNode', '_ambientNode',
           '_rumbleOsc', '_brakeOsc', '_signalOsc', '_tireNode',
           '_reverseOsc', '_wiperNode', '_ambDayNode', '_ambNightNode'].forEach(function(key) {
            if (a[key]) { try { a[key].stop(); } catch(e2){} a[key] = null; }
          });
          // Zero all gains
          ['engineGain', '_engineFundGain', '_engineHarmGain', '_engineOctGain',
           '_engineNoiseGain', '_engineLFOGain',
           '_skidGain', '_sirenGain', '_windGain', '_rainGain', '_ambientGain',
           '_rumbleGain', '_brakeGain', '_signalGain', '_tireGain',
           '_reverseGain', '_wiperGain', '_ambDayGain', '_ambNightGain'].forEach(function(key) {
            if (a[key]) { try { a[key].gain.value = 0; a[key].disconnect(); } catch(e3){} a[key] = null; }
          });
          // Reset audio state so next drive creates fresh nodes
          a.started = false;
        } catch (e) {}
        emergencyRef.current = null;
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
            cyclistClose: s.cyclistClose,
            unsignaledLaneChanges: s.unsignaledLaneChanges || 0,
            scenarioId: currentScenario.id,
            lastCrashReplay: s.crashes > 0 ? blackBoxRef.current.slice(-120) : null, // last 2 sec before end
            drivePath: drivePathRef.current.slice() // full drive path for map
          }
        });
        // Check achievements
        var newBadges = Object.assign({}, earnedBadges);
        var safety = Math.max(0, Math.round(s.safetyScore));
        var eco = Math.max(0, Math.round(s.efficiencyScore));
        var comb = (safety + eco) / 2;
        newBadges.first_drive = true;
        if (s.crashes === 0) newBadges.no_crash = true;
        if (eco >= 90) newBadges.eco_warrior = true;
        if (safety >= 95) newBadges.safety_star = true;
        if (comb >= 95) newBadges.a_plus = true;
        if (currentScenario.time === 'night' && safety >= 80) newBadges.night_owl = true;
        if (currentScenario.id === 'snow' && safety >= 70) newBadges.winter_warrior = true;
        if (avgMPG > currentVehicle.cityMPG) newBadges.hypermiler = true;
        if (s.stops >= 3) newBadges.full_stop = true;
        if ((s.unsignaledLaneChanges || 0) === 0) newBadges.signal_perfect = true;
        if (Math.round(s.maxSpeed * MS_TO_MPH) >= 80) newBadges.speed_demon = true;
        if (wildlifeRef.current === null && s.distance > 500 && ['rural','snow','fog','night'].indexOf(currentScenario.id) !== -1) newBadges.moose_dodge = true;
        if (s.emergencyYields > 0) newBadges.emergency_yield = true;
        if (currentScenario.time === 'night' || currentScenario.id === 'dawn') newBadges.night_drive = true;
        // Track total drives for Road Veteran badge
        var totalDrives = (d.totalDrives || 0) + 1;
        upd('totalDrives', totalDrives);
        if (totalDrives >= 10) newBadges.ten_drives = true;
        var newScenarios = Object.assign({}, scenariosDriven);
        newScenarios[currentScenario.id] = true;
        if (Object.keys(newScenarios).length >= 5) newBadges.five_scenarios = true;
        // Track weather types for all-weather achievement
        var newWeathers = Object.assign({}, weathersDriven);
        newWeathers[currentScenario.weather || 'clear'] = true;
        if (newWeathers.clear && newWeathers.rain && newWeathers.snow && newWeathers.fog) newBadges.all_weather = true;
        upd('weathersDriven', newWeathers);
        upd('badges', newBadges);
        upd('scenariosDriven', newScenarios);
      }, [currentScenario, currentVehicle]);

      // ── Main simulation loop ──
      useEffect(function() {
        if (view !== 'driving') return;
        var canvas = canvasRef.current;
        if (!canvas) return;
        var lastT = performance.now();

        // ── Gamepad API support ──
        var pollGamepad = function() {
          var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
          for (var gi = 0; gi < gamepads.length; gi++) {
            var gp = gamepads[gi];
            if (!gp) continue;
            // Standard gamepad mapping:
            // Left stick X = steering (-1 left, +1 right)
            // Right trigger (axis 5 or button 7) = throttle
            // Left trigger (axis 4 or button 6) = brake
            // A button (0) = horn, B button (1) = camera, X (2) = blinker left, Y (3) = blinker right
            // D-pad up (12) = gear up (D), D-pad down (13) = gear down (R), D-pad left (14) = blinker L, D-pad right (15) = blinker R
            // Start (9) = pause, LB (4) = low beams, RB (5) = high beams
            var axes = gp.axes;
            var buttons = gp.buttons;
            var k = keysRef.current;
            // Steering from left stick X (axis 0) — analog!
            if (Math.abs(axes[0]) > 0.1) {
              k._gpSteer = axes[0]; // -1 to 1 analog value
            } else {
              k._gpSteer = 0;
            }
            // Throttle from right trigger
            var rtVal = buttons[7] ? buttons[7].value : 0;
            if (axes.length > 5 && axes[5] > 0) rtVal = Math.max(rtVal, (axes[5] + 1) / 2);
            k._gpThrottle = rtVal;
            // Brake from left trigger
            var ltVal = buttons[6] ? buttons[6].value : 0;
            if (axes.length > 4 && axes[4] > 0) ltVal = Math.max(ltVal, (axes[4] + 1) / 2);
            k._gpBrake = ltVal;
            // Buttons (edge-triggered)
            if (buttons[0] && buttons[0].pressed && !k._gpA) { k._gpA = true; playHorn(0.35); }
            else if (!buttons[0] || !buttons[0].pressed) k._gpA = false;
            if (buttons[1] && buttons[1].pressed && !k._gpB) { k._gpB = true; var modes = ['cockpit','chase','overhead','rearview']; cameraModeRef.current = modes[(modes.indexOf(cameraModeRef.current)+1)%modes.length]; }
            else if (!buttons[1] || !buttons[1].pressed) k._gpB = false;
            if (buttons[2] && buttons[2].pressed && !k._gpX) { k._gpX = true; blinkerRef.current = blinkerRef.current === -1 ? 0 : -1; }
            else if (!buttons[2] || !buttons[2].pressed) k._gpX = false;
            if (buttons[3] && buttons[3].pressed && !k._gpY) { k._gpY = true; blinkerRef.current = blinkerRef.current === 1 ? 0 : 1; }
            else if (!buttons[3] || !buttons[3].pressed) k._gpY = false;
            if (buttons[9] && buttons[9].pressed && !k._gpStart) { k._gpStart = true; pausedRef.current = !pausedRef.current; }
            else if (!buttons[9] || !buttons[9].pressed) k._gpStart = false;
            // D-pad gear shifting
            if (buttons[12] && buttons[12].pressed && !k._gpUp) { k._gpUp = true; if (Math.abs(carRef.current.speed) < 1) gearRef.current = 'D'; }
            else if (!buttons[12] || !buttons[12].pressed) k._gpUp = false;
            if (buttons[13] && buttons[13].pressed && !k._gpDown) { k._gpDown = true; if (Math.abs(carRef.current.speed) < 1) gearRef.current = gearRef.current === 'R' ? 'P' : 'R'; }
            else if (!buttons[13] || !buttons[13].pressed) k._gpDown = false;
            // Headlight toggle with shoulder buttons
            if (buttons[4] && buttons[4].pressed && !k._gpLB) { k._gpLB = true; upd('highBeams', false); }
            else if (!buttons[4] || !buttons[4].pressed) k._gpLB = false;
            if (buttons[5] && buttons[5].pressed && !k._gpRB) { k._gpRB = true; upd('highBeams', true); }
            else if (!buttons[5] || !buttons[5].pressed) k._gpRB = false;
            break; // use first connected gamepad
          }
        };

        var step = function(now) {
          if (!drivingRef.current) return;
          var dt = Math.min(0.1, (now - lastT) / 1000);
          lastT = now;
          pollGamepad();
          if (!pausedRef.current) {
            timeRef.current += dt;
            updateSignals(signalsRef.current, dt);
            updatePhysics(dt);
            updateTraffic(dt);
            updatePeds(dt);
            updateCyclists(dt);
            updateWildlife(dt);
            updateEmergency(dt);
            updateAudio();
            checkSignalCompliance();
            checkCyclistPassing();
            checkCollisions();
            // ── Quest / destination system (Free Explore) ──
            // Now anchored to REAL landmarks in the procedural world. The quest engine
            // scans chunks ahead of the player and picks a nearby generated landmark as
            // the destination. Students literally drive TO a building they can see.
            if (d.freeExplore) {
              var q = questRef.current;
              // Generate a new quest if none active
              if ((!q || q.completed) && infiniteWorldRef.current) {
                var carCi = Math.floor(carRef.current.y / CHUNK_SIZE);
                // Search for the nearest landmark ahead of the player (negative Z = ahead)
                var candidates = [];
                for (var qci = carCi - 12; qci <= carCi - 1; qci++) {
                  var qchunk = infiniteWorldRef.current.getChunk(qci);
                  if (qchunk && qchunk.landmark) {
                    var lmY = qci * CHUNK_SIZE + qchunk.landmark.centerY;
                    var lmDist = Math.abs(lmY - carRef.current.y);
                    candidates.push({ chunk: qchunk, lmY: lmY, dist: lmDist });
                  }
                }
                if (candidates.length > 0) {
                  // Pick one of the closer landmarks (first 3) — slight randomness keeps it interesting
                  candidates.sort(function(a, b) { return a.dist - b.dist; });
                  var pick = candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(3, candidates.length)))];
                  var lmDest = pick.chunk.landmark;
                  questRef.current = {
                    name: lmDest.type.name,
                    icon: lmDest.type.icon,
                    y: pick.lmY,
                    x: lmDest.centerX, // cell-space X (matches car.x coordinate system)
                    startDist: pick.dist,
                    completed: false,
                    announced: false,
                    questsCompleted: (q ? q.questsCompleted || 0 : 0),
                    isLandmark: true
                  };
                  if (q && q.completed) {
                    addToast('🗺️ New destination: ' + lmDest.type.icon + ' ' + lmDest.type.name + ' — ' + Math.round(pick.dist * 10) + ' ft ahead');
                    speak('New destination: ' + lmDest.type.name + '. Drive north to reach it.');
                  }
                } else if (!q) {
                  // No landmarks in range yet — drive further north first (seed the first quest gently)
                  questRef.current = {
                    name: 'Explore the road',
                    icon: '🛣️',
                    y: carRef.current.y - 50,
                    x: Math.floor(MAP_SIZE / 2),
                    startDist: 50,
                    completed: false,
                    announced: false,
                    questsCompleted: 0,
                    isLandmark: false
                  };
                }
              }
              // Check if player reached the destination
              q = questRef.current;
              if (q && !q.completed) {
                var qdist = Math.hypot(carRef.current.x - q.x, carRef.current.y - q.y);
                // Larger arrival radius for landmarks since they're real buildings with footprint
                var arrivalRadius = q.isLandmark ? 8 : 5;
                if (qdist < arrivalRadius) {
                  q.completed = true;
                  q.questsCompleted = (q.questsCompleted || 0) + 1;
                  addToast('✅ Arrived at ' + q.icon + ' ' + q.name + '! Quest #' + q.questsCompleted + ' complete.');
                  speak('You arrived at ' + q.name + '. Nice driving!');
                  statsRef.current.safetyScore = Math.min(100, statsRef.current.safetyScore + 3);
                  // ── Track landmark visits for achievements ──
                  if (q.isLandmark) {
                    if (!statsRef.current.landmarkVisits) statsRef.current.landmarkVisits = {};
                    if (!statsRef.current.landmarkVisits[q.name]) {
                      statsRef.current.landmarkVisits[q.name] = 0;
                    }
                    statsRef.current.landmarkVisits[q.name]++;
                    var totalVisits = Object.values(statsRef.current.landmarkVisits).reduce(function(a, b) { return a + b; }, 0);
                    var uniqueVisits = Object.keys(statsRef.current.landmarkVisits).length;
                    // Check achievement triggers live (in addition to end-of-drive check)
                    var liveBadges = Object.assign({}, (d.badges || {}));
                    var awarded = false;
                    if (!liveBadges.first_landmark) { liveBadges.first_landmark = true; addToast('🏅 Achievement: First Destination'); awarded = true; }
                    if (uniqueVisits >= 5 && !liveBadges.five_landmarks) { liveBadges.five_landmarks = true; addToast('🏅 Achievement: Local Navigator (5 landmarks)'); awarded = true; }
                    if (totalVisits >= 10 && !liveBadges.ten_landmarks) { liveBadges.ten_landmarks = true; addToast('🏅 Achievement: Town Tourist (10 visits)'); awarded = true; }
                    if (q.name === 'Lighthouse' && !liveBadges.maine_explorer) { liveBadges.maine_explorer = true; addToast('🏅 Achievement: Maine Explorer 🗽'); awarded = true; }
                    var hasCivic = statsRef.current.landmarkVisits['Elementary School'] && statsRef.current.landmarkVisits['Public Library'] && statsRef.current.landmarkVisits['Post Office'];
                    if (hasCivic && !liveBadges.civic_scholar) { liveBadges.civic_scholar = true; addToast('🏅 Achievement: Civic Scholar 🎓'); awarded = true; }
                    if (totalVisits >= 3 && statsRef.current.crashes === 0 && !liveBadges.safe_return) { liveBadges.safe_return = true; addToast('🏅 Achievement: Safe Return 🏠'); awarded = true; }
                    if (awarded) upd('badges', liveBadges);
                  }
                }
                // Announce when getting close
                if (!q.announced && qdist < 18) {
                  q.announced = true;
                  addToast(q.icon + ' ' + q.name + ' is just ahead!');
                }
              }
            }

            // Contextual driving tips (gentle coaching, not penalties)
            if (!statsRef.current._lastTip) statsRef.current._lastTip = 0;
            if (timeRef.current - statsRef.current._lastTip > 20) {
              var tip = null;
              var absSpd = Math.abs(carRef.current.speed) * MS_TO_MPH;
              // Track driving patterns for smarter coaching
              if (!statsRef.current._tipHistory) statsRef.current._tipHistory = {};
              var th = statsRef.current._tipHistory;
              if (absSpd > currentScenario.speedLimit + 10 && absSpd > 15) {
                tip = '💡 You\'re ' + Math.round(absSpd - currentScenario.speedLimit) + ' mph over the limit. Braking distance grows with v².';
              } else if (absSpd < currentScenario.speedLimit - 15 && absSpd > 5 && timeRef.current > 10 && !th.tooSlow) {
                tip = '💡 Going too slow can be dangerous too — traffic needs to flow. Match the posted ' + currentScenario.speedLimit + ' mph when safe.';
                th.tooSlow = true;
              } else if (gearRef.current === 'P' && timeRef.current > 5 && absSpd < 1) {
                tip = '💡 Press W to start driving (auto-shifts to Drive), or F for Drive, G for Reverse.';
              } else if (Math.abs(carRef.current.steering) > 0.55 && blinkerRef.current === 0 && absSpd > 15) {
                tip = '💡 Signal before turning or changing lanes. Press E (left) or V (right).';
              } else if (statsRef.current.hardBrakes >= 2 && !th.hardBrake) {
                tip = '💡 Multiple hard brakes detected. Scan further ahead so you can slow gently — look 12-15 seconds down the road.';
                th.hardBrake = true;
              } else if (statsRef.current.jackrabbits >= 2 && !th.jackrabbit) {
                tip = '💡 Jackrabbit starts waste fuel and wear the engine. Smooth, gentle acceleration is safer and more efficient.';
                th.jackrabbit = true;
              } else if (statsRef.current.closeFollows >= 2 && !th.closeFollow) {
                tip = '💡 You\'re following too closely. Keep 3+ seconds of distance (4+ in rain, 6+ in snow).';
                th.closeFollow = true;
              } else if (statsRef.current.skidSeconds > 2 && !th.skid) {
                tip = '💡 Skid detected. Ease off the gas, steer gently. Quick inputs on low-grip surfaces cause spins.';
                th.skid = true;
              } else if (statsRef.current.distance > 300 && statsRef.current.safetyScore >= 95 && !th.praise) {
                tip = '🌟 Excellent driving. Your smooth inputs and awareness are exactly what the road test rewards.';
                th.praise = true;
              } else if (currentScenario.time === 'night' && absSpd > currentScenario.speedLimit - 3 && !th.nightSpeed) {
                tip = '💡 At night your headlights show ~350 ft. At 50+ mph you\'re outdriving them. Slow down when visibility is limited.';
                th.nightSpeed = true;
              } else if ((currentScenario.weather === 'rain' || currentScenario.weather === 'snow') && absSpd > currentScenario.speedLimit - 5 && !th.badWeather) {
                var slowNeeded = currentScenario.weather === 'snow' ? 15 : 8;
                tip = '💡 In ' + currentScenario.weather + ', reduce speed by at least ' + slowNeeded + ' mph from the posted limit. Less grip = longer stops.';
                th.badWeather = true;
              }
              if (tip) {
                statsRef.current._lastTip = timeRef.current;
                eventToastRef.current = { msg: tip, until: timeRef.current + 4 };
                speak(tip.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]/gu, '').trim());
              }
            }
            // ── Distracted driving events (phone buzzes) ──
            var dd = distractRef.current;
            if (!dd.active && Math.abs(carRef.current.speed) > 5 && timeRef.current > 20) {
              if (!dd._nextEvent) dd._nextEvent = 30 + Math.random() * 60;
              if (timeRef.current > dd._nextEvent) {
                var msgs = [
                  '📱 New text message: "Hey are you free tonight?"',
                  '📱 Instagram notification: @friend liked your photo',
                  '📱 Mom is calling...',
                  '📱 Snapchat: 3 new snaps!',
                  '📱 Spotify: Your playlist is ready',
                  '📱 TikTok: @viral has a new video',
                  '📱 Low battery warning: 5% remaining'
                ];
                dd.active = true;
                dd.msg = msgs[Math.floor(Math.random() * msgs.length)];
                dd.timer = timeRef.current + 6; // shows for 6 seconds
                dd.penalty = false;
                dd._nextEvent = timeRef.current + 45 + Math.random() * 60;
              }
            }
            if (dd.active && timeRef.current > dd.timer) {
              // Good — they ignored it
              if (!dd.penalty) {
                addToast('✅ Good — you ignored the phone distraction!');
              }
              dd.active = false;
            }
          }
          render();
          animRef.current = requestAnimationFrame(step);
        };

        var updatePhysics = function(dt) {
          var car = carRef.current;
          var k = keysRef.current;
          var veh = currentVehicle;
          var scn = currentScenario;
          var gear = gearRef.current;
          // Gamepad analog values (0-1 for triggers, -1 to 1 for steer)
          var gpThrottle = k._gpThrottle || 0;
          var gpBrake = k._gpBrake || 0;
          var gpSteer = k._gpSteer || 0;
          // Auto-shift to D on first throttle if in P
          if (gear === 'P' && ((k['w'] || k['arrowup']) || gpThrottle > 0.1)) gearRef.current = gear = 'D';
          // Blend keyboard (binary 0/1) with gamepad (analog 0-1)
          var throttleInput = Math.max((k['w'] || k['arrowup']) ? 1 : 0, gpThrottle);
          var brakeInput = Math.max((k['s'] || k['arrowdown']) ? 1 : 0, gpBrake);
          var steerLeft = (k['a'] || k['arrowleft']) ? 1 : 0;
          var steerRight = (k['d'] || k['arrowright']) ? 1 : 0;
          // In Park: no movement at all
          if (gear === 'P') { throttleInput = 0; car.speed *= 0.9; if (car.speed < 0.1) car.speed = 0; }
          // In Reverse: W = reverse thrust, S = brake
          var reverseMode = gear === 'R';
          car.throttle = throttleInput;
          car.brake = brakeInput;
          car.gear = gear;
          // Steering with smoothing — blend keyboard + gamepad analog
          var kbSteer = (steerRight - steerLeft) * 0.6;
          var steerTarget = Math.abs(gpSteer) > 0.1 ? gpSteer * 0.7 : kbSteer;
          // Speed-dependent steering sensitivity (heavy at speed, light at slow)
          // Steering response: responsive at low speed, more stable at high speed (inverted for safety)
          var steerRate = 8 - Math.min(4, Math.abs(car.speed) * 0.1);
          car.steering += (steerTarget - car.steering) * dt * steerRate;
          // Forces
          var mu = frictionCoef(scn.weather);
          var crr = rollingCoef(scn.weather, true);
          var absSpeed = Math.abs(car.speed);
          var maxThrust = veh.powerKW * 1000 / Math.max(1, absSpeed);
          if (absSpeed < 2) maxThrust = veh.powerKW * 500;
          // In reverse, cap thrust to 30% (reverse is slow)
          if (reverseMode) maxThrust *= 0.3;
          var thrust = throttleInput * Math.min(maxThrust, veh.mass * mu * 9.81 * 0.4);
          // Apply thrust in the correct direction
          if (reverseMode) thrust = -thrust;
          var Fd = dragForce(absSpeed, veh.cd, veh.area);
          var Fr = rollingForce(veh.mass, crr);
          // Drag and rolling resist always oppose motion
          var resistSign = car.speed >= 0 ? 1 : -1;
          var brakeForce = brakeInput * veh.mass * mu * 9.81 * 0.95;
          var netForce = thrust - (Fd + Fr + brakeForce) * resistSign;
          var accel = netForce / veh.mass;
          car.speed += accel * dt;
          // Extra brake clamping: if braking and speed is very low, snap to zero (prevents creeping)
          // Low-speed brake clamping (works for analog gamepad triggers too)
          if (brakeInput > 0.2 && Math.abs(car.speed) < 1.5) car.speed *= 0.82;
          if (brakeInput > 0.2 && Math.abs(car.speed) < 0.3) car.speed = 0;
          // Engine braking / coast deceleration
          // Real cars: drag + rolling resistance already slow the car naturally.
          // This adds a small engine compression drag when off-throttle (much less than before).
          // A real car at 60 mph with foot off gas coasts for ~30+ seconds before stopping.
          if (gear === 'D' && throttleInput === 0 && brakeInput === 0 && car.speed > 0.5) {
            car.speed *= (1 - dt * 0.05); // very gentle — mostly physics drag handles deceleration
          }
          if (gear === 'R' && throttleInput === 0 && brakeInput === 0 && car.speed < -0.5) {
            car.speed *= (1 - dt * 0.1); // reverse coasts a bit faster
          }
          // Clamp: in D, no going below 0; in R, no going above 0
          if (gear === 'D' && car.speed < 0) car.speed = 0;
          if (gear === 'R' && car.speed > 0) car.speed = 0;
          // Max reverse speed ~15 mph
          if (gear === 'R' && car.speed < -15 * MPH_TO_MS) car.speed = -15 * MPH_TO_MS;
          // Reverse auto-stop when throttle released and nearly stopped
          if (gear === 'R' && Math.abs(car.speed) < 0.5 && throttleInput === 0 && brakeInput === 0) car.speed = 0;
          // Weight transfer (affects car pitch — visible in 3D)
          car._pitchTarget = accel * 0.003; // nose dips on brake, lifts on accel
          car._pitch = (car._pitch || 0) + (car._pitchTarget - (car._pitch || 0)) * dt * 5;
          car._rollTarget = -car.steering * Math.abs(car.speed) * 0.003; // body rolls in turns
          car._roll = (car._roll || 0) + (car._rollTarget - (car._roll || 0)) * dt * 4;
          // Suspension bounce — speed-dependent road vibration
          var suspFreq = 3 + absSpeed * 0.3;
          var suspAmp = Math.min(0.04, absSpeed * 0.001);
          // Bumps from road surface irregularities (hash of position)
          var roadBump = ((Math.floor(car.x * 5) * 37 + Math.floor(car.y * 5) * 73) % 10 - 5) * 0.002;
          car._suspY = Math.sin(timeRef.current * suspFreq) * suspAmp + roadBump;

          // ─── RUMBLE STRIPS: detect off-road edge drift and provide audio + visual feedback ───
          // Check if car is on the shoulder area (just off the painted edge line)
          if (absSpeed > 5) { // only meaningful when moving
            var currentCell = 2; // default grass
            var shoulderX = Math.abs(car.x - Math.floor(MAP_SIZE / 2));
            if (infiniteWorldRef.current) {
              currentCell = infiniteWorldRef.current.getCell(Math.floor(car.x), Math.floor(car.y));
            } else if (mapRef.current && Math.floor(car.y) >= 0 && Math.floor(car.y) < MAP_SIZE && Math.floor(car.x) >= 0 && Math.floor(car.x) < MAP_SIZE) {
              currentCell = mapRef.current[Math.floor(car.y)][Math.floor(car.x)];
            }
            // Detect edge drift: car is NEAR shoulder (within 1 cell of road edge on grass) or on grass moving fast
            var onGrass = currentCell === 2 || currentCell === 4;
            var nearShoulder = currentCell === 0 && shoulderX >= 3.0 && shoulderX <= 3.5;
            if ((onGrass && absSpeed > 8) || nearShoulder) {
              // Rumble strip audio: low-frequency buzz that only plays while off-line
              try {
                var ar = audioRef.current;
                if (ar && ar.ctx) {
                  if (!ar._rumbleOsc) {
                    ar._rumbleOsc = ar.ctx.createOscillator();
                    ar._rumbleGain = ar.ctx.createGain();
                    ar._rumbleOsc.type = 'sawtooth';
                    ar._rumbleOsc.frequency.value = 45; // deep rumble
                    ar._rumbleGain.gain.value = 0;
                    ar._rumbleOsc.connect(ar._rumbleGain);
                    ar._rumbleGain.connect(ar.ctx.destination);
                    ar._rumbleOsc.start();
                  }
                  // Modulate rumble intensity with speed
                  var rumbleVol = Math.min(0.08, absSpeed * 0.003);
                  ar._rumbleGain.gain.setTargetAtTime(rumbleVol, ar.ctx.currentTime, 0.05);
                  // Frequency wobble to sell the "strip passing under wheel" feel
                  ar._rumbleOsc.frequency.setValueAtTime(45 + Math.sin(timeRef.current * 30) * 8, ar.ctx.currentTime);
                }
              } catch (rErr) { /* non-blocking */ }
              // Visual: shake the car slightly
              car._suspY += Math.sin(timeRef.current * 40) * 0.02;
              // Gentle nudge toast (once every 10s max)
              if (!statsRef.current._lastRumble || timeRef.current - statsRef.current._lastRumble > 10) {
                statsRef.current._lastRumble = timeRef.current;
                if (onGrass) {
                  eventToastRef.current = { msg: '⚠️ Off the road! Steer back gently — don\'t jerk the wheel.', until: timeRef.current + 3 };
                } else {
                  eventToastRef.current = { msg: '💡 Rumble strip — drifting toward the shoulder. Adjust gently.', until: timeRef.current + 3 };
                }
              }
            } else {
              // Off rumble strip — fade out audio
              try {
                var ar2 = audioRef.current;
                if (ar2 && ar2._rumbleGain) {
                  ar2._rumbleGain.gain.setTargetAtTime(0, ar2.ctx.currentTime, 0.1);
                }
              } catch (rErr2) {}
            }
          }

          // Friction circle: lateral grip needed vs available.
          // If you brake HARD while turning, you exceed the grip budget and skid.
          var lateralAccelNeeded = Math.abs(car.steering) * car.speed * car.speed * 0.08;
          var longitudinalUsed = (Math.abs(thrust) + brakeForce) / veh.mass;
          var gripAvail = mu * 9.81;
          var lateralAvail = Math.max(0, Math.sqrt(Math.max(0, gripAvail * gripAvail - longitudinalUsed * longitudinalUsed)));
          var skid = lateralAccelNeeded > lateralAvail * 1.1;
          // Grace period: no skid penalties in first 3 seconds
          if (skid && Math.abs(car.speed) > 4 && timeRef.current > 3) {
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
          // Wall collision (bounce + penalty) — supports both finite map and infinite world
          var cellX = Math.floor(newX);
          var cellY = Math.floor(newY);
          var cell = 2; // default: grass (drivable)
          if (infiniteWorldRef.current) {
            cell = infiniteWorldRef.current.getCell(cellX, cellY);
          } else if (mapRef.current && cellY >= 0 && cellY < MAP_SIZE && cellX >= 0 && cellX < MAP_SIZE) {
            cell = mapRef.current[cellY][cellX];
          }
          if (cell !== undefined) {
              if (cell === 1 || cell === 5 || cell === 6) {
                var impactMph = Math.abs(car.speed) * MS_TO_MPH;
                if (impactMph > 5) {
                  statsRef.current.crashes++;
                  var dmg = impactMph > 30 ? 40 : impactMph > 15 ? 25 : 15;
                  statsRef.current.safetyScore -= dmg;
                  addToast('💥 Crash at ' + Math.round(impactMph) + ' mph! -' + dmg + ' safety');
                  if (impactMph > 30) {
                    eventToastRef.current = { msg: '💥 HIGH SPEED IMPACT — airbags deployed. In real life: serious injury risk.', until: timeRef.current + 5 };
                    speak('High speed impact. Airbags deployed.');
                  }
                }
                // Bounce-back: reverse direction slightly and push away from wall
                car.speed *= -0.2;
                // Push car back to previous valid position
                car.x = car.x - moveX * 1.5;
                car.y = car.y - moveY * 1.5;
              } else {
                car.x = newX;
                car.y = newY;
              }
          }
          // Wrap Y to loop the road (only for non-infinite worlds)
          // d.freeExplore is checked as backup in case infiniteWorldRef hasn't been set yet
          if (!infiniteWorldRef.current && !d.freeExplore) {
            if (car.y < 2) { car.y += MAP_SIZE - 5; }
            if (car.y > MAP_SIZE - 2) { car.y -= MAP_SIZE - 5; }
          }
          // Auto-create infinite world if free explore but ref is missing (safety net)
          if (d.freeExplore && !infiniteWorldRef.current) {
            infiniteWorldRef.current = createInfiniteWorld(d.worldSeed || 12345);
          }
          // Infinite world: cleanup distant chunks periodically
          if (infiniteWorldRef.current && Math.floor(timeRef.current) % 5 === 0) {
            infiniteWorldRef.current.cleanup(Math.floor(car.y / CHUNK_SIZE));
          }
          // ─── LANDMARK PROXIMITY HUD ───
          // When approaching a named landmark, announce it and (for schools) apply context rules.
          if (infiniteWorldRef.current) {
            if (!statsRef.current._announcedLandmarks) statsRef.current._announcedLandmarks = {};
            var curCi = Math.floor(car.y / CHUNK_SIZE);
            // Check current + next 2 chunks ahead (based on heading direction)
            for (var lci = -1; lci <= 2; lci++) {
              var scanChunk = infiniteWorldRef.current.getChunk(curCi + lci);
              if (scanChunk && scanChunk.landmark) {
                var lmWorldY = (curCi + lci) * CHUNK_SIZE + scanChunk.landmark.centerY;
                var distToLm = Math.abs(lmWorldY - car.y);
                var lmKey = (curCi + lci) + '_' + scanChunk.landmark.type.id;
                // Announce when within 14 cells, only once per landmark
                // School Zone Hero badge: track speed when passing a school
                if (distToLm < 4 && scanChunk.landmark.type.id === 'school') {
                  var schoolSpeedMph = Math.abs(car.speed) * MS_TO_MPH;
                  if (schoolSpeedMph <= 20) {
                    var schoolBadges = Object.assign({}, (d.badges || {}));
                    if (!schoolBadges.school_hero) {
                      schoolBadges.school_hero = true;
                      addToast('🏅 Achievement: School Zone Hero 🏫');
                      upd('badges', schoolBadges);
                    }
                  }
                }
                if (distToLm < 14 && !statsRef.current._announcedLandmarks[lmKey]) {
                  statsRef.current._announcedLandmarks[lmKey] = timeRef.current;
                  var lmType = scanChunk.landmark.type;
                  var lmMsg = lmType.icon + ' ' + lmType.name + ' ahead';
                  // Add context-specific guidance
                  if (lmType.contextRule === 'school_zone_20mph') lmMsg += ' — SLOW DOWN to 20 mph (school zone)';
                  else if (lmType.contextRule === 'check_speed') lmMsg += ' — check your speed';
                  else if (lmType.contextRule === 'pedestrians') lmMsg += ' — watch for pedestrians';
                  else if (lmType.contextRule === 'slow_vehicle') lmMsg += ' — farm equipment may be slow';
                  else if (lmType.contextRule === 'emergency_vehicle') lmMsg += ' — emergency vehicles may exit';
                  else if (lmType.contextRule === 'slow_ambulance') lmMsg += ' — watch for ambulances';
                  eventToastRef.current = { msg: lmMsg, until: timeRef.current + 4 };
                  if (typeof announceToSR === 'function') announceToSR(lmType.name + ' ahead');
                }
              }
            }
            // Garbage-collect old announcements to prevent memory growth
            if (Math.floor(timeRef.current) % 30 === 0) {
              Object.keys(statsRef.current._announcedLandmarks).forEach(function(k) {
                if (timeRef.current - statsRef.current._announcedLandmarks[k] > 60) {
                  delete statsRef.current._announcedLandmarks[k];
                }
              });
            }
          }
          // ─── LANDMARK-TRIGGERED EVENTS ───
          // Context-aware events that only happen near specific landmarks, teaching
          // real-world driving awareness. Each landmark has a small chance to trigger
          // an appropriate event when the player is driving past.
          if (infiniteWorldRef.current && !statsRef.current._landmarkEventActive) {
            if (!statsRef.current._lastLandmarkEvent) statsRef.current._lastLandmarkEvent = 0;
            var canTriggerEvent = (timeRef.current - statsRef.current._lastLandmarkEvent) > 8; // min 8s between events
            if (canTriggerEvent && Math.abs(car.speed) > 5) {
              var curCi2 = Math.floor(car.y / CHUNK_SIZE);
              for (var leci = -1; leci <= 1; leci++) {
                var eChunk = infiniteWorldRef.current.getChunk(curCi2 + leci);
                if (!eChunk || !eChunk.landmark) continue;
                var elmWorldY = (curCi2 + leci) * CHUNK_SIZE + eChunk.landmark.centerY;
                var elmDist = Math.abs(elmWorldY - car.y);
                // Trigger window: within 5-10 cells of the landmark (approaching it)
                if (elmDist < 10 && elmDist > 2) {
                  var lt2 = eChunk.landmark.type;
                  if (Math.random() < (lt2.eventChance || 0) * 0.3) {
                    statsRef.current._landmarkEventActive = true;
                    statsRef.current._lastLandmarkEvent = timeRef.current;
                    // Generate event appropriate for the landmark
                    var evt = null;
                    if (lt2.id === 'school') {
                      // 50/50: ball event OR school bus stop-arm reminder
                      if (Math.random() < 0.5) {
                        evt = { kind: 'ball', icon: '⚽', warn: 'CHILD chasing ball into road!', color: '#ef4444' };
                      } else {
                        // School bus with extended stop arm — Maine + all 50 states require FULL STOP
                        // even from the opposite direction on undivided roads
                        evt = { kind: 'schoolbus_arm', icon: '🚌', warn: 'SCHOOL BUS stopped with RED FLASHING lights! STOP — illegal to pass!', color: '#fbbf24' };
                      }
                    } else if (lt2.id === 'park') {
                      evt = { kind: 'ball', icon: '⚽', warn: 'Ball rolling from park — child may follow!', color: '#fbbf24' };
                    } else if (lt2.id === 'market' || lt2.id === 'pharmacy' || lt2.id === 'library') {
                      evt = { kind: 'pedestrian', icon: '🚶', warn: 'PEDESTRIAN stepping off sidewalk!', color: '#60a5fa' };
                    } else if (lt2.id === 'hospital') {
                      evt = { kind: 'ambulance', icon: '🚑', warn: 'AMBULANCE exiting hospital — yield!', color: '#ef4444' };
                    } else if (lt2.id === 'fire') {
                      evt = { kind: 'firetruck', icon: '🚒', warn: 'FIRE TRUCK responding — pull right!', color: '#dc2626' };
                    } else if (lt2.id === 'farm') {
                      evt = { kind: 'tractor', icon: '🚜', warn: 'SLOW TRACTOR entering road!', color: '#f97316' };
                    } else if (lt2.id === 'police') {
                      evt = { kind: 'cruiser', icon: '🚔', warn: 'POLICE CRUISER pulling out — stay alert!', color: '#1e40af' };
                    }
                    if (evt) {
                      // Spawn the event as a wildlife-like entity that crosses the road
                      var spawnAhead = 6;
                      var spawnX = car.x + Math.cos(car.heading) * spawnAhead + (eChunk.landmark.side * 4);
                      var spawnY = car.y + Math.sin(car.heading) * spawnAhead;
                      if (!wildlifeRef.current) {
                        wildlifeRef.current = {
                          kind: evt.kind,
                          icon: evt.icon,
                          mass: evt.kind === 'ambulance' || evt.kind === 'firetruck' || evt.kind === 'tractor' || evt.kind === 'cruiser' ? 'medium' : 'small',
                          x: spawnX,
                          y: spawnY,
                          vx: -eChunk.landmark.side * 1.5, // moves across the road
                          vy: 0,
                          hit: false,
                          life: 8,
                          fromLandmark: true,
                          color: evt.color
                        };
                      }
                      eventToastRef.current = { msg: evt.icon + ' ' + evt.warn, until: timeRef.current + 5 };
                      if (addToast) addToast(evt.icon + ' ' + evt.warn);
                      speak(evt.warn.replace(/[^a-zA-Z0-9 ,.!?']/g, ' '));
                      // Reward for slowing down
                      setTimeout(function() { statsRef.current._landmarkEventActive = false; }, 8000);
                    }
                    break;
                  }
                }
              }
            }
          }
          // Update stats
          var deltaDist = car.speed * dt;
          statsRef.current.distance += deltaDist;
          if (car.speed > statsRef.current.maxSpeed) statsRef.current.maxSpeed = car.speed;
          // MPG sample
          var accelG = Math.max(0, accel / 9.81);
          var mpg = instantMPG(Math.abs(car.speed) * MS_TO_MPH, accelG, veh, scn.weather, true);
          if (car.speed > 1) {
            statsRef.current.mpgSum += mpg;
            statsRef.current.mpgSamples++;
            statsRef.current.fuelUsed += (deltaDist / 1609) / Math.max(1, mpg);
          }
          // Jackrabbit detection (with startup grace)
          if (accel > 3.5 && lastStateRef.current.accel <= 3.5 && timeRef.current > 5) {
            statsRef.current.jackrabbits++;
            statsRef.current.efficiencyScore -= 3;
          }
          // Hard brake detection (with startup grace)
          if (brakeInput > 0 && accel < -5 && lastStateRef.current.accel >= -5 && timeRef.current > 5) {
            statsRef.current.hardBrakes++;
            statsRef.current.efficiencyScore -= 2;
            statsRef.current.safetyScore -= 1;
          }
          // Speed violation — only in Drive, with 5-second grace period, +8 mph threshold
          var speedMph = Math.abs(car.speed) * MS_TO_MPH;
          if (gear === 'D' && timeRef.current > 5 && speedMph > scn.speedLimit + 8) {
            statsRef.current.speedViolations += dt;
            statsRef.current.safetyScore -= dt * 2;
          }
          lastStateRef.current = { speed: car.speed, accel: accel };
          // Black box recording (last ~5 seconds for crash replay)
          blackBoxRef.current.push({ t: timeRef.current, x: car.x, y: car.y, heading: car.heading, speed: car.speed, gear: gear, steering: car.steering });
          if (blackBoxRef.current.length > 300) blackBoxRef.current.shift(); // ~5 sec at 60fps
          // Drive path recording (sampled every 0.5s for debrief map)
          if (!drivePathRef.current._lastSample || timeRef.current - drivePathRef.current._lastSample > 0.5) {
            drivePathRef.current.push({ x: car.x, y: car.y, speed: Math.abs(car.speed) * MS_TO_MPH });
            drivePathRef.current._lastSample = timeRef.current;
            if (drivePathRef.current.length > 600) drivePathRef.current.shift(); // cap at 5 min
          }

          // Blinker timer (for visual blink)
          blinkerTimerRef.current += dt;

          // Lane change detection — hysteresis-based to prevent false positives on curves
          // Only trigger if car moves 2+ world units from its last stable lane position
          if (!laneChangeRef.current.stableX) laneChangeRef.current.stableX = car.x;
          var laneShift = car.x - laneChangeRef.current.stableX;
          if (Math.abs(laneShift) > 2.0 && Math.abs(car.speed) > 5 && timeRef.current > 5) {
            // Genuine lane change detected
            if (!laneChangeRef.current._cooldown || timeRef.current - laneChangeRef.current._cooldown > 5) {
              var dir = laneShift > 0 ? 1 : -1;
              if (blinkerRef.current !== dir) {
                statsRef.current.safetyScore -= 5;
                if (!statsRef.current.unsignaledLaneChanges) statsRef.current.unsignaledLaneChanges = 0;
                statsRef.current.unsignaledLaneChanges++;
                addToast('⚠️ Lane change without signal! -5');
              } else {
                addToast('✓ Signaled lane change');
              }
              laneChangeRef.current._cooldown = timeRef.current;
            }
            laneChangeRef.current.stableX = car.x;
          }
          // Slowly drift the stable position toward current (tolerates gradual curves)
          laneChangeRef.current.stableX += (car.x - laneChangeRef.current.stableX) * dt * 0.3;

          // MPG history for sparkline (sample every 0.5s)
          if (car.speed > 1 && mpg < 999) {
            if (!mpgHistoryRef.current._lastSample || timeRef.current - mpgHistoryRef.current._lastSample > 0.5) {
              mpgHistoryRef.current.push(mpg);
              if (mpgHistoryRef.current.length > 120) mpgHistoryRef.current.shift();
              mpgHistoryRef.current._lastSample = timeRef.current;
            }
          }
        };

        var updateTraffic = function(dt) {
          var traffic = trafficRef.current;
          var signals = signalsRef.current;
          var scn = currentScenario;
          traffic.forEach(function(t, idx) {
            // Default personality for legacy/cross-street cars that didn't get one.
            var pers = t.personality || { speedBias: 1.0, followMult: 1.0, aggro: 0.35, rollsStops: 0 };
            // Look for nearest signal ahead in our direction of travel
            var slowFor = 0; // 0=clear, 1=slow, 2=stop
            signals.forEach(function(s) {
              var ahead = (t.heading > 0 ? s.y - t.y : t.y - s.y);
              if (ahead > 0 && ahead < 8 && Math.abs(s.x - t.x) < 3) {
                if (s.type === 'stop' || s.state === 'red') {
                  // Some drivers roll stops — flag once per signal so they only
                  // commit one rolling stop per encounter. Otherwise stop as normal.
                  if (s.type === 'stop' && pers.rollsStops > 0 && Math.random() < pers.rollsStops * 0.05) {
                    slowFor = Math.max(slowFor, 1); // slow but don't stop
                  } else {
                    slowFor = Math.max(slowFor, 2);
                  }
                } else if (s.state === 'yellow') {
                  // Aggressive drivers gun it through yellow; cautious brake.
                  slowFor = Math.max(slowFor, pers.aggro > 0.5 ? 0 : 1);
                }
              }
            });
            // Follow car ahead — distance scaled by personality.followMult
            // (aggressive tailgate, cautious leave space). Speed-aware: longer
            // gap when moving fast, shorter at crawl speeds.
            var followNear = 4 * pers.followMult + t.speed * 0.25 * pers.followMult;
            var followFar  = 7 * pers.followMult + t.speed * 0.35 * pers.followMult;
            traffic.forEach(function(other, j) {
              if (j === idx) return;
              if (Math.abs(other.x - t.x) > 2) return;
              var ahead = (t.heading > 0 ? other.y - t.y : t.y - other.y);
              if (ahead > 0 && ahead < followNear) slowFor = Math.max(slowFor, 2);
              else if (ahead > 0 && ahead < followFar) slowFor = Math.max(slowFor, 1);
            });
            // React to PLAYER car — slow down, honk, or rear-end
            var playerCar = carRef.current;
            if (Math.abs(playerCar.x - t.x) < 2) {
              var playerAhead = (t.heading > 0 ? playerCar.y - t.y : t.y - playerCar.y);
              if (playerAhead > 0 && playerAhead < 3) {
                // Very close behind player — emergency stop or crash
                slowFor = Math.max(slowFor, 2);
                // If traffic was going fast and player stopped suddenly → rear-end collision
                if (t.speed > 5 && Math.abs(playerCar.speed) < 2 && playerAhead < 1.5) {
                  if (!t._rearEndCooldown || timeRef.current - t._rearEndCooldown > 8) {
                    t._rearEndCooldown = timeRef.current;
                    statsRef.current.crashes++;
                    statsRef.current.safetyScore -= 15;
                    addToast('💥 Rear-ended! The car behind couldn\'t stop in time. -15');
                    eventToastRef.current = { msg: '💥 You were rear-ended. Sudden stops on fast roads cause chain reactions.', until: timeRef.current + 4 };
                    speak('You were rear-ended. Avoid sudden stops when traffic is close behind.');
                    t.speed *= 0.3;
                    playerCar.speed += t.speed * 0.2; // push player forward
                  }
                }
              } else if (playerAhead > 0 && playerAhead < 6) {
                // Approaching player — slow down
                slowFor = Math.max(slowFor, 1);
                // Honk if player is going much slower than the speed limit
                if (Math.abs(playerCar.speed) < scn.speedLimit * MPH_TO_MS * 0.3 && Math.abs(playerCar.speed) > 0.5) {
                  if (!t._honkCooldown || timeRef.current - t._honkCooldown > 10) {
                    t._honkCooldown = timeRef.current;
                    addToast('📢 Car behind you is honking — you\'re going too slow!');
                    // Play honk sound
                    try {
                      var ac = audioRef.current.ctx;
                      if (ac) {
                        var honk = ac.createOscillator();
                        var hg = ac.createGain();
                        honk.type = 'square'; honk.frequency.value = 350;
                        hg.gain.value = 0.04;
                        honk.connect(hg); hg.connect(ac.destination);
                        honk.start();
                        hg.gain.setTargetAtTime(0, ac.currentTime + 0.4, 0.08);
                        honk.stop(ac.currentTime + 0.5);
                      }
                    } catch(e) {}
                  }
                }
              } else if (playerAhead > 0 && playerAhead < 10) {
                // Far behind player — just match speed if player is slower
                if (Math.abs(playerCar.speed) < t.speed * 0.7) slowFor = Math.max(slowFor, 1);
              }
            }
            // Adjust speed
            var targetSpeed;
            if (slowFor === 2) targetSpeed = 0;
            else if (slowFor === 1) targetSpeed = scn.speedLimit * 0.4 * MPH_TO_MS;
            else targetSpeed = (scn.speedLimit - 3 + (idx % 5) * 1.2) * MPH_TO_MS;
            t.speed += (targetSpeed - t.speed) * Math.min(1, dt * 2);
            // Turn signal on AI vehicles — blink when slowing for a signal
            t.blinker = slowFor >= 1 ? ((idx % 3 === 0) ? -1 : (idx % 3 === 1) ? 1 : 0) : 0;
            // Lane-change: triggered when slow car ahead + aggressive personality.
            // Aggressive drivers switch more readily and on less gap.
            if (!t.crossStreet && !t._laneChangeCooldown) t._laneChangeCooldown = 0;
            if (!t.crossStreet && t._laneChangeCooldown <= 0) {
              var centerXt = Math.floor(MAP_SIZE / 2);
              // Check for slower car 3-8 units directly ahead — reason to overtake.
              var wantOvertake = false;
              traffic.forEach(function(other2, j2) {
                if (j2 === idx || wantOvertake) return;
                if (Math.abs(other2.x - t.x) > 1.5) return;
                var ah = (t.heading > 0 ? other2.y - t.y : t.y - other2.y);
                if (ah > 3 && ah < 8 && other2.speed < t.speed * 0.8) wantOvertake = true;
              });
              // Aggressive drivers (aggro > 0.4) overtake; cautious drivers wait.
              if (wantOvertake && pers.aggro > 0.4 && Math.random() < pers.aggro * 0.02) {
                var laneDir = t.x < centerXt ? 0.3 : -0.3;
                t.x += laneDir;
                t.blinker = laneDir > 0 ? 1 : -1;
                t._laneChangeCooldown = 8;
              } else if (!wantOvertake && Math.random() < 0.0008) {
                // Idle lane drift (rare) — still happens occasionally.
                var laneDir2 = t.x < centerXt ? 0.2 : -0.2;
                t.x += laneDir2;
                t._laneChangeCooldown = 10;
              }
            }
            if (t._laneChangeCooldown > 0) t._laneChangeCooldown -= dt;
            // Move
            t.y += Math.sin(t.heading) * t.speed * dt / 5;
            t.x += Math.cos(t.heading) * t.speed * dt / 5;
            // Wrap / respawn traffic relative to player position
            var playerY = carRef.current.y;
            if (t.crossStreet) {
              if (t.x < -2) t.x = MAP_SIZE + 2;
              if (t.x > MAP_SIZE + 2) t.x = -2;
            } else if (infiniteWorldRef.current) {
              // Infinite world: respawn traffic that gets too far from player
              if (Math.abs(t.y - playerY) > MAP_SIZE * 0.6) {
                // Respawn ahead or behind the player
                var newDir = Math.random() < 0.5 ? 1 : -1;
                t.y = playerY + newDir * (10 + Math.random() * MAP_SIZE * 0.4);
                t.x = Math.floor(MAP_SIZE / 2) + (t.heading > 0 ? -1.5 : 1.5);
                t.speed = (scn.speedLimit - 3 + (idx % 5) * 1.2) * MPH_TO_MS;
              }
            } else {
              if (t.y < -2) t.y = MAP_SIZE + 2;
              if (t.y > MAP_SIZE + 2) t.y = -2;
            }
          });
        };

        var updateWildlife = function(dt) {
          var w = wildlifeRef.current;
          var car = carRef.current;
          // Maybe spawn
          if (!w) {
            var spawn = maybeSpawnWildlife(currentScenario, timeRef.current);
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
            // School bus with stop-arm sits still and tests compliance
            if (w.kind === 'schoolbus_arm') {
              w.vx = 0; w.vy = 0; // stationary
              w.life -= dt * 0.3; // slower countdown (7-second stop event)
              if (w.life <= 0) { wildlifeRef.current = null; return; }
              // Detect whether player passes it too fast (illegal pass violation)
              var busDx = w.x - car.x;
              var busDy = w.y - car.y;
              var busDist = Math.hypot(busDx, busDy);
              if (!w.passed && busDist < 3 && Math.abs(car.speed) > 3) {
                w.passed = true;
                statsRef.current.safetyScore -= 30;
                statsRef.current.crashes++;
                addToast('🚨 ILLEGAL PASS! You passed a stopped school bus. -30 safety');
                eventToastRef.current = { msg: '🚨 PASSING A STOPPED SCHOOL BUS is a serious violation — this endangers children.', until: timeRef.current + 6 };
                speak('Illegal pass of a stopped school bus. This is a serious violation in all 50 states.');
              }
              if (!w.credited && busDist < 5 && Math.abs(car.speed) < 1) {
                w.credited = true;
                statsRef.current.safetyScore = Math.min(100, statsRef.current.safetyScore + 5);
                statsRef.current.stops = (statsRef.current.stops || 0) + 1;
                addToast('✓ Stopped for the school bus. +5 safety');
                eventToastRef.current = { msg: '✓ Correct. Stopped school bus = FULL STOP in both directions (undivided road).', until: timeRef.current + 4 };
                var busBadges = Object.assign({}, (d.badges || {}));
                if (!busBadges.bus_respect) {
                  busBadges.bus_respect = true;
                  addToast('🏅 Achievement: Bus Respect 🚌');
                  upd('badges', busBadges);
                }
              }
              return;
            }
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

        var _nextDrillSpawn = 20;
        var updateEmergency = function(dt) {
          var em = emergencyRef.current;
          var car = carRef.current;
          if (!em) {
            var spawn = null;
            // Drill mode: timer-based, every 20-35 seconds
            if (d.emergencyDrillMode && timeRef.current > _nextDrillSpawn) {
              _nextDrillSpawn = timeRef.current + 20 + Math.random() * 15;
              var drillTypes = [
                { kind: 'ambulance', icon: '🚑', color: '#ef4444', sirenFreq: 800, lightColor1: 0xff0000, lightColor2: 0xffffff, bodyColor: 0xffffff },
                { kind: 'police', icon: '🚓', color: '#3b82f6', sirenFreq: 1000, lightColor1: 0xff0000, lightColor2: 0x0044ff, bodyColor: 0x111111 },
                { kind: 'firetruck', icon: '🚒', color: '#f97316', sirenFreq: 600, lightColor1: 0xff0000, lightColor2: 0xff4400, bodyColor: 0xcc2200 }
              ];
              spawn = drillTypes[Math.floor(Math.random() * drillTypes.length)];
            }
            // Normal mode: rare, checked once per second
            if (!spawn) spawn = maybeSpawnEmergency(currentScenario, timeRef.current);
            if (spawn) {
              emergencyRef.current = {
                kind: spawn.kind, icon: spawn.icon, color: spawn.color, sirenFreq: spawn.sirenFreq,
                // Spawn in the same lane as the player (slightly offset), BEHIND them
                x: car.x + (Math.random() - 0.5) * 0.5,
                y: car.y + 15 + Math.random() * 8,
                heading: car.heading,
                speed: Math.abs(car.speed) + 12,
                life: 20,
                responded: false,
                checked: false
              };
              eventToastRef.current = { msg: '🚨 EMERGENCY VEHICLE BEHIND YOU — Pull RIGHT and STOP!', until: timeRef.current + 6 };
              speak('Emergency vehicle approaching from behind. Pull to the right and stop completely.');
              addToast('🚨 ' + spawn.icon + ' ' + spawn.kind + ' approaching!');
              // Start siren audio
              try {
                var ac = audioRef.current.ctx;
                if (ac && !audioRef.current._sirenOsc) {
                  audioRef.current._sirenOsc = ac.createOscillator();
                  audioRef.current._sirenGain = ac.createGain();
                  audioRef.current._sirenOsc.type = 'sine';
                  audioRef.current._sirenOsc.frequency.value = spawn.sirenFreq;
                  audioRef.current._sirenGain.gain.value = 0.06;
                  // Stereo panner + low-pass — lets the siren feel directional.
                  // LPF cutoff drops when the vehicle is further away (distance muffle).
                  audioRef.current._sirenPan = ac.createStereoPanner ? ac.createStereoPanner() : null;
                  audioRef.current._sirenLPF = ac.createBiquadFilter();
                  audioRef.current._sirenLPF.type = 'lowpass';
                  audioRef.current._sirenLPF.frequency.value = 4000;
                  audioRef.current._sirenOsc.connect(audioRef.current._sirenGain);
                  var tail = audioRef.current._sirenGain.connect(audioRef.current._sirenLPF);
                  if (audioRef.current._sirenPan) tail = tail.connect(audioRef.current._sirenPan);
                  tail.connect(ac.destination);
                  audioRef.current._sirenOsc.start();
                }
              } catch (e) {}
            }
            return;
          }
          // Move emergency vehicle toward player (from behind, fast)
          em.y -= em.speed * dt / 5;
          em.life -= dt;
          // Siren warble
          try {
            if (audioRef.current._sirenOsc) {
              var wob = em.sirenFreq + Math.sin(timeRef.current * 8) * 200;
              audioRef.current._sirenOsc.frequency.setTargetAtTime(wob, audioRef.current.ctx.currentTime, 0.05);
              // Stereo pan tracks lateral offset of em relative to car heading.
              // Transform em→car vector into the car's frame so "right" means
              // right-of-player regardless of which way the car is facing.
              var relX = em.x - car.x;
              var relY = em.y - car.y;
              var cosH = Math.cos(car.heading);
              var sinH = Math.sin(car.heading);
              // Forward axis = (cosH, sinH); lateral = (-sinH, cosH).
              var lateral = -sinH * relX + cosH * relY;
              var forward = cosH * relX + sinH * relY;
              var dist = Math.hypot(relX, relY);
              var panTarget = Math.max(-1, Math.min(1, lateral / 6));
              if (audioRef.current._sirenPan) audioRef.current._sirenPan.pan.setTargetAtTime(panTarget, audioRef.current.ctx.currentTime, 0.08);
              // Distance muffle — cutoff 1kHz far away, 5kHz when right next to you.
              var cutoff = Math.max(800, 5000 - dist * 180);
              if (audioRef.current._sirenLPF) audioRef.current._sirenLPF.frequency.setTargetAtTime(cutoff, audioRef.current.ctx.currentTime, 0.15);
              // Doppler-ish pitch shift — higher when approaching (forward > 0 and
              // closing), lower after it passes. Real Doppler needs velocity vectors;
              // a quick approximation from forward distance still feels right.
              var dopScale = forward > 0 ? 1.05 : 0.92;
              audioRef.current._sirenOsc.frequency.setTargetAtTime(wob * dopScale, audioRef.current.ctx.currentTime, 0.06);
              // Fade out as it passes
              if (em.y < car.y - 5) audioRef.current._sirenGain.gain.setTargetAtTime(0.01, audioRef.current.ctx.currentTime, 0.3);
            }
          } catch (e) {}
          // Check if player pulled right and stopped
          // Wider detection window (6 units = ~60 feet) and timeout if it passes completely
          if (!em.checked && em.y < car.y + 6) {
            em.checked = true;
            var centerX = Math.floor(MAP_SIZE / 2);
            var pulledRight = car.x > centerX + 1.5;
            var stopped = car.speed < 2;
            if (pulledRight && stopped) {
              em.responded = true;
              statsRef.current.safetyScore = Math.min(100, statsRef.current.safetyScore + 5);
              if (!statsRef.current.emergencyYields) statsRef.current.emergencyYields = 0;
              statsRef.current.emergencyYields++;
              addToast('✓ Good — pulled right and stopped for emergency vehicle. +5');
              eventToastRef.current = { msg: '✓ Correct response: pull RIGHT, STOP until it passes.', until: timeRef.current + 4 };
              // Emergency Responder landmark achievement
              if (em.fromLandmark) {
                var erBadges = Object.assign({}, (d.badges || {}));
                if (!erBadges.emergency_response) {
                  erBadges.emergency_response = true;
                  addToast('🏅 Achievement: Emergency Responder 🚒');
                  upd('badges', erBadges);
                }
              }
            } else if (stopped && !pulledRight) {
              statsRef.current.safetyScore -= 10;
              addToast('⚠️ You stopped but didn\'t pull right. -10');
              eventToastRef.current = { msg: '⚠️ You must pull to the RIGHT side of the road, then stop.', until: timeRef.current + 4 };
            } else {
              statsRef.current.safetyScore -= 20;
              addToast('🚨 Failed to yield to emergency vehicle! -20');
              eventToastRef.current = { msg: '🚨 FAILURE TO YIELD. All 50 states require you to pull right and stop for emergency vehicles.', until: timeRef.current + 5 };
            }
          }
          // Remove when done
          if (em.life <= 0 || em.y < car.y - 20) {
            try {
              if (audioRef.current._sirenGain) audioRef.current._sirenGain.gain.setTargetAtTime(0, audioRef.current.ctx.currentTime, 0.05);
              setTimeout(function() { try { if (audioRef.current._sirenOsc) { audioRef.current._sirenOsc.stop(); audioRef.current._sirenOsc = null; } } catch(e){} }, 200);
            } catch (e) {}
            emergencyRef.current = null;
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
            // Lateral distance: perpendicular distance from car to cyclist
            // Use cross product for true perpendicular distance (works on curved roads)
            var carDirX = Math.cos(car.heading);
            var carDirY = Math.sin(car.heading);
            var latUnits = Math.abs(dx * carDirY - dy * carDirX); // perpendicular component
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
          // Engine audio — 4-cylinder-ish layered synth.
          // Graph (built once, retuned per frame):
          //   fundamentalOsc (triangle, firing rate) → fundGain ─┐
          //   harmonicOsc    (sawtooth at 2×)      → harmGain ─┤
          //   octaveOsc      (square at 4×)        → octGain  ─┤→ engineLPF → engineGain → ctx
          //   combustionNoise(filtered pink noise)  → noiseGain ┘
          //   pitchLFO      (slow sine, ±2%)       → fundamental frequency (idle wobble)
          try {
            if (!a.engineOsc) {
              // Fundamental ≈ engine firing rate; 4-cyl 4-stroke idles ~10 Hz but
              // we can't go that low, so treat fundamental as 2nd harmonic (≈20-50 Hz)
              // and stack up from there. Makes the result feel like a real motor
              // rather than a buzz-saw.
              a.engineOsc = a.ctx.createOscillator(); // fundamental
              a.engineOsc.type = 'triangle';
              a.engineOsc.frequency.value = 40;
              a._engineHarm = a.ctx.createOscillator(); // 2× saw
              a._engineHarm.type = 'sawtooth';
              a._engineHarm.frequency.value = 80;
              a._engineOct = a.ctx.createOscillator(); // 4× square (top-end rasp)
              a._engineOct.type = 'square';
              a._engineOct.frequency.value = 160;
              // Individual gains so we can mix harmonics per throttle.
              a._engineFundGain = a.ctx.createGain(); a._engineFundGain.gain.value = 0.7;
              a._engineHarmGain = a.ctx.createGain(); a._engineHarmGain.gain.value = 0.25;
              a._engineOctGain  = a.ctx.createGain(); a._engineOctGain.gain.value  = 0.05;
              // Low-pass filter opens as throttle rises — airy top end under load.
              a._engineLPF = a.ctx.createBiquadFilter();
              a._engineLPF.type = 'lowpass';
              a._engineLPF.frequency.value = 300;
              a._engineLPF.Q.value = 0.7;
              // Master engine gain (legacy name kept so existing shutdown code works).
              a.engineGain = a.ctx.createGain();
              a.engineGain.gain.value = 0;
              // Combustion noise: white noise → band-pass → gain, adds irregularity.
              var nLen = a.ctx.sampleRate * 1;
              var nBuf = a.ctx.createBuffer(1, nLen, a.ctx.sampleRate);
              var nData = nBuf.getChannelData(0);
              for (var ni = 0; ni < nLen; ni++) nData[ni] = Math.random() * 2 - 1;
              a._engineNoise = a.ctx.createBufferSource();
              a._engineNoise.buffer = nBuf;
              a._engineNoise.loop = true;
              a._engineNoiseBP = a.ctx.createBiquadFilter();
              a._engineNoiseBP.type = 'bandpass';
              a._engineNoiseBP.frequency.value = 160;
              a._engineNoiseBP.Q.value = 1.2;
              a._engineNoiseGain = a.ctx.createGain();
              a._engineNoiseGain.gain.value = 0.04;
              // Pitch LFO — tiny wobble so idle doesn't sound laser-flat.
              a._engineLFO = a.ctx.createOscillator();
              a._engineLFO.type = 'sine';
              a._engineLFO.frequency.value = 3.5;
              a._engineLFOGain = a.ctx.createGain();
              a._engineLFOGain.gain.value = 1.2; // ±1.2 Hz wobble at idle
              // Wire it up
              a.engineOsc.connect(a._engineFundGain).connect(a._engineLPF);
              a._engineHarm.connect(a._engineHarmGain).connect(a._engineLPF);
              a._engineOct.connect(a._engineOctGain).connect(a._engineLPF);
              a._engineNoise.connect(a._engineNoiseBP).connect(a._engineNoiseGain).connect(a._engineLPF);
              a._engineLPF.connect(a.engineGain);
              a.engineGain.connect(a.ctx.destination);
              a._engineLFO.connect(a._engineLFOGain).connect(a.engineOsc.frequency);
              // Start sources
              a.engineOsc.start();
              a._engineHarm.start();
              a._engineOct.start();
              a._engineNoise.start();
              a._engineLFO.start();
            }
            if (a.ctx.state === 'suspended') a.ctx.resume();
            // Fundamental = idle (≈32 Hz) + speed + throttle contributions.
            // Throttle affects pitch MORE than speed when stopped (revving in park)
            // and less when already at speed (engine already spinning). Nonlinear
            // mix matches how drivers actually feel the motor.
            var idleHz = 32;
            var speedHz = Math.abs(car.speed) * 2.4;
            var throtHz = car.throttle * (car.speed < 2 ? 45 : 22);
            var fund = idleHz + speedHz + throtHz;
            var now = a.ctx.currentTime;
            a.engineOsc.frequency.setTargetAtTime(fund, now, 0.07);
            a._engineHarm.frequency.setTargetAtTime(fund * 2, now, 0.07);
            a._engineOct.frequency.setTargetAtTime(fund * 4, now, 0.07);
            // Open the filter under throttle — more rasp when accelerating.
            var lpfTarget = 280 + car.throttle * 1800 + Math.abs(car.speed) * 12;
            a._engineLPF.frequency.setTargetAtTime(lpfTarget, now, 0.12);
            // Coast-down detection — off-throttle but still rolling fast. Engine
            // braking has a tighter, less-rasp timbre than power-on (pumping vs
            // combustion-led). Reduce harmonic gains; let the noise layer dominate
            // softly. 0..1 weight makes the transition smooth.
            var coast = (car.throttle < 0.06 && Math.abs(car.speed) > 4) ? 1 : 0;
            var coastBlend = coast > 0 ? Math.min(1, (Math.abs(car.speed) - 4) / 12) : 0;
            // Mix: more harmonic saw + octave square under load; less when coasting.
            a._engineHarmGain.gain.setTargetAtTime(0.18 + car.throttle * 0.35 - coastBlend * 0.10, now, 0.1);
            a._engineOctGain.gain.setTargetAtTime(0.02 + car.throttle * 0.18 - coastBlend * 0.015, now, 0.1);
            a._engineNoiseGain.gain.setTargetAtTime(0.03 + car.throttle * 0.08 + coastBlend * 0.05, now, 0.1);
            // Tighten the LPF on coast — engine braking is more "whoosh", less "growl".
            if (coastBlend > 0) {
              var coastCutoff = 220 + Math.abs(car.speed) * 18;
              a._engineLPF.frequency.setTargetAtTime(coastCutoff, now, 0.18);
            }
            // LFO intensity — wobble more at idle, less when revving (smoother combustion).
            var lfoAmt = car.throttle < 0.1 ? 1.8 : Math.max(0.3, 1.5 - car.throttle * 2);
            a._engineLFOGain.gain.setTargetAtTime(lfoAmt, now, 0.15);
            // Master volume — audible but never dominant.
            var targetGain = Math.min(0.09, 0.018 + car.throttle * 0.055 + Math.abs(car.speed) * 0.0012);
            a.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
            // Gear-shift detection — clunk on any P/R/D transition.
            var curGear = gearRef.current;
            if (a._lastGear === undefined) a._lastGear = curGear;
            if (curGear !== a._lastGear) {
              playGearShift();
              a._lastGear = curGear;
            }
            // Reverse rumble — extra low-frequency layer when in R, since real
            // automatics sound throatier in reverse (transmission whine + low gear).
            if (curGear === 'R') {
              if (!a._reverseOsc) {
                a._reverseOsc = a.ctx.createOscillator();
                a._reverseOsc.type = 'sine';
                a._reverseOsc.frequency.value = 90;
                a._reverseGain = a.ctx.createGain();
                a._reverseGain.gain.value = 0;
                a._reverseOsc.connect(a._reverseGain).connect(a.ctx.destination);
                a._reverseOsc.start();
              }
              a._reverseOsc.frequency.setTargetAtTime(75 + Math.abs(car.speed) * 6, now, 0.1);
              a._reverseGain.gain.setTargetAtTime(0.025 + car.throttle * 0.04, now, 0.1);
            } else if (a._reverseGain) {
              a._reverseGain.gain.setTargetAtTime(0, now, 0.15);
            }
            // Wildlife ambience — rural day = bird-band hiss with slow gating;
            // night = narrow cricket-band with a faster pulse. One node each so
            // we can fade them based on biome/time without churning.
            var isRural = false;
            try {
              if (infiniteWorldRef.current) {
                var ciHere = Math.floor(car.y / CHUNK_SIZE);
                var biomeHere = infiniteWorldRef.current.getChunk(ciHere).biome;
                isRural = biomeHere === 'rural';
              } else if (currentScenario.id === 'rural' || currentScenario.id === 'dawn') {
                isRural = true;
              }
            } catch (eAmb) {}
            var isNightAmb = currentScenario.time === 'night' || currentScenario.id === 'night';
            // Day birds — high band-pass filtered noise, slow LFO gate.
            if (isRural && !isNightAmb) {
              if (!a._ambDayNode) {
                var dbBufLen = a.ctx.sampleRate * 2;
                var dbBuf = a.ctx.createBuffer(1, dbBufLen, a.ctx.sampleRate);
                var dbData = dbBuf.getChannelData(0);
                for (var dbi = 0; dbi < dbBufLen; dbi++) dbData[dbi] = (Math.random() * 2 - 1) * 0.6;
                a._ambDayNode = a.ctx.createBufferSource();
                a._ambDayNode.buffer = dbBuf;
                a._ambDayNode.loop = true;
                a._ambDayBP = a.ctx.createBiquadFilter();
                a._ambDayBP.type = 'bandpass';
                a._ambDayBP.frequency.value = 3200;
                a._ambDayBP.Q.value = 8;
                a._ambDayGain = a.ctx.createGain();
                a._ambDayGain.gain.value = 0;
                a._ambDayNode.connect(a._ambDayBP).connect(a._ambDayGain).connect(a.ctx.destination);
                a._ambDayNode.start();
              }
              // Slow LFO-style gain so the chirp comes in waves.
              var dbWave = 0.5 + 0.5 * Math.sin(timeRef.current * 0.7);
              a._ambDayGain.gain.setTargetAtTime(0.025 * dbWave, now, 0.4);
              // Filter freq drifts so it sounds like multiple birds.
              a._ambDayBP.frequency.setTargetAtTime(2800 + Math.sin(timeRef.current * 1.3) * 700, now, 0.3);
            } else if (a._ambDayGain) {
              a._ambDayGain.gain.setTargetAtTime(0, now, 0.4);
            }
            // Night crickets — narrow band-pass + faster pulse.
            if (isNightAmb && (isRural || currentScenario.id === 'night')) {
              if (!a._ambNightNode) {
                var cnBufLen = a.ctx.sampleRate * 2;
                var cnBuf = a.ctx.createBuffer(1, cnBufLen, a.ctx.sampleRate);
                var cnData = cnBuf.getChannelData(0);
                for (var cni = 0; cni < cnBufLen; cni++) cnData[cni] = (Math.random() * 2 - 1) * 0.6;
                a._ambNightNode = a.ctx.createBufferSource();
                a._ambNightNode.buffer = cnBuf;
                a._ambNightNode.loop = true;
                a._ambNightBP = a.ctx.createBiquadFilter();
                a._ambNightBP.type = 'bandpass';
                a._ambNightBP.frequency.value = 4500;
                a._ambNightBP.Q.value = 18;
                a._ambNightGain = a.ctx.createGain();
                a._ambNightGain.gain.value = 0;
                a._ambNightNode.connect(a._ambNightBP).connect(a._ambNightGain).connect(a.ctx.destination);
                a._ambNightNode.start();
              }
              // Cricket chirp pulses — a square-ish gate at ~3 Hz.
              var crGate = Math.max(0, Math.sin(timeRef.current * 8));
              a._ambNightGain.gain.setTargetAtTime(0.03 * crGate * crGate, now, 0.05);
            } else if (a._ambNightGain) {
              a._ambNightGain.gain.setTargetAtTime(0, now, 0.4);
            }
            // Wiper swoosh — filtered noise gated by a sweep, only in rain/snow.
            // Two passes per cycle (out + back), so gain peaks twice every period.
            var wiperOn = currentScenario.weather === 'rain' || currentScenario.weather === 'snow';
            if (wiperOn) {
              if (!a._wiperNode) {
                var wpLen = a.ctx.sampleRate * 1;
                var wpBuf = a.ctx.createBuffer(1, wpLen, a.ctx.sampleRate);
                var wpData = wpBuf.getChannelData(0);
                for (var wpi = 0; wpi < wpLen; wpi++) wpData[wpi] = (Math.random() * 2 - 1) * 0.4;
                a._wiperNode = a.ctx.createBufferSource();
                a._wiperNode.buffer = wpBuf;
                a._wiperNode.loop = true;
                a._wiperBP = a.ctx.createBiquadFilter();
                a._wiperBP.type = 'bandpass';
                a._wiperBP.frequency.value = 1200;
                a._wiperBP.Q.value = 2.5;
                a._wiperGain = a.ctx.createGain();
                a._wiperGain.gain.value = 0;
                a._wiperNode.connect(a._wiperBP).connect(a._wiperGain).connect(a.ctx.destination);
                a._wiperNode.start();
              }
              // 0.7 Hz wipe cycle → two peaks per cycle (sin² of 2× phase).
              var wpPhase = Math.abs(Math.sin(timeRef.current * Math.PI * 0.7));
              var wpGate = wpPhase * wpPhase;
              a._wiperGain.gain.setTargetAtTime(0.022 * wpGate, now, 0.04);
              // Filter sweeps high → low on each pass to suggest direction.
              a._wiperBP.frequency.setTargetAtTime(800 + wpGate * 1400, now, 0.05);
            } else if (a._wiperGain) {
              a._wiperGain.gain.setTargetAtTime(0, now, 0.3);
            }
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
            // Brake squeal — thin high-Q tone that builds as brakes engage at speed.
            // Persistent node; fades in/out rather than spawning on each press.
            if (!a._brakeOsc) {
              a._brakeOsc = a.ctx.createOscillator();
              a._brakeOsc.type = 'sawtooth';
              a._brakeOsc.frequency.value = 2400;
              a._brakeFilter = a.ctx.createBiquadFilter();
              a._brakeFilter.type = 'bandpass';
              a._brakeFilter.frequency.value = 2400;
              a._brakeFilter.Q.value = 14;
              a._brakeGain = a.ctx.createGain();
              a._brakeGain.gain.value = 0;
              a._brakeOsc.connect(a._brakeFilter).connect(a._brakeGain).connect(a.ctx.destination);
              a._brakeOsc.start();
            }
            // Squeal only when braking hard AND at speed — no squeal at parking-lot speeds.
            var speedMph = Math.abs(car.speed) * 2.237;
            var squealAmt = (car.brake > 0.4 && speedMph > 12) ? (car.brake - 0.4) * 0.06 * Math.min(1, (speedMph - 12) / 25) : 0;
            a._brakeGain.gain.setTargetAtTime(squealAmt, a.ctx.currentTime, 0.05);
            // Pitch drops slightly as speed drops (rotor gets slower) — subtle but real.
            a._brakeFilter.frequency.setTargetAtTime(1800 + speedMph * 18, a.ctx.currentTime, 0.1);
            // Turn signal click — discrete tick on the leading edge of each
            // blinker flash. State machine mirrors the visual flash (1.5 Hz).
            if (blinkerRef.current !== 0) {
              var blinkPhase = (timeRef.current * 1.5) % 1;
              if (a._signalPhasePrev === undefined) a._signalPhasePrev = blinkPhase;
              // Fire one click when the phase wraps from ~1 back to ~0 (flash on),
              // and one lower-pitch click on the off edge (flash off at ~0.5).
              var fireClick = null;
              if (blinkPhase < a._signalPhasePrev) fireClick = { f: 2400, d: 0.06 };
              else if (a._signalPhasePrev < 0.5 && blinkPhase >= 0.5) fireClick = { f: 1600, d: 0.05 };
              if (fireClick) {
                try {
                  var sc = a.ctx.createOscillator();
                  var sg = a.ctx.createGain();
                  sc.type = 'square';
                  sc.frequency.value = fireClick.f;
                  sg.gain.value = 0;
                  sc.connect(sg).connect(a.ctx.destination);
                  sc.start();
                  var tNow = a.ctx.currentTime;
                  sg.gain.setValueAtTime(0, tNow);
                  sg.gain.linearRampToValueAtTime(0.05, tNow + 0.003);
                  sg.gain.exponentialRampToValueAtTime(0.0001, tNow + fireClick.d);
                  sc.stop(tNow + fireClick.d + 0.02);
                } catch (bse) {}
              }
              a._signalPhasePrev = blinkPhase;
            } else {
              a._signalPhasePrev = undefined;
            }
            // Wind / road noise: white noise filtered, volume scales with speed
            if (!a._windNode) {
              // Create white noise buffer
              var bufSize = a.ctx.sampleRate * 2;
              var buf = a.ctx.createBuffer(1, bufSize, a.ctx.sampleRate);
              var data = buf.getChannelData(0);
              for (var ni = 0; ni < bufSize; ni++) data[ni] = (Math.random() * 2 - 1) * 0.3;
              a._windBuf = buf;
              a._windNode = a.ctx.createBufferSource();
              a._windNode.buffer = buf;
              a._windNode.loop = true;
              a._windFilter = a.ctx.createBiquadFilter();
              a._windFilter.type = 'lowpass';
              a._windFilter.frequency.value = 400;
              a._windGain = a.ctx.createGain();
              a._windGain.gain.value = 0;
              a._windNode.connect(a._windFilter);
              a._windFilter.connect(a._windGain);
              a._windGain.connect(a.ctx.destination);
              a._windNode.start();
            }
            // Scale wind volume and filter cutoff with speed
            var windVol = Math.min(0.06, car.speed * 0.003);
            var windCutoff = 200 + car.speed * 20;
            a._windGain.gain.setTargetAtTime(windVol, a.ctx.currentTime, 0.1);
            a._windFilter.frequency.setTargetAtTime(windCutoff, a.ctx.currentTime, 0.1);
            // Tire-on-surface noise — separate noise layer, filter tuning depends
            // on the cell the car is currently over: asphalt = narrow mid-band,
            // grass = wider+lower (muffled), gravel/shoulder = crunchy higher-Q.
            // Weather modulates: rain adds sizzling top end; snow damps everything.
            if (!a._tireNode) {
              var tBufSize = a.ctx.sampleRate * 1.5;
              var tBuf = a.ctx.createBuffer(1, tBufSize, a.ctx.sampleRate);
              var tData = tBuf.getChannelData(0);
              for (var tni = 0; tni < tBufSize; tni++) tData[tni] = (Math.random() * 2 - 1) * 0.6;
              a._tireNode = a.ctx.createBufferSource();
              a._tireNode.buffer = tBuf;
              a._tireNode.loop = true;
              a._tireFilter = a.ctx.createBiquadFilter();
              a._tireFilter.type = 'bandpass';
              a._tireFilter.frequency.value = 600;
              a._tireFilter.Q.value = 0.8;
              a._tireGain = a.ctx.createGain();
              a._tireGain.gain.value = 0;
              a._tireNode.connect(a._tireFilter).connect(a._tireGain).connect(a.ctx.destination);
              a._tireNode.start();
            }
            // Sample the surface cell under the car. Cell values: 0=road, 2=grass,
            // 3=centerline (still road), 4=sidewalk, 5=tree (blocked — treat as grass).
            var tireCell = 0;
            if (infiniteWorldRef.current) {
              tireCell = infiniteWorldRef.current.getCell(Math.floor(car.x), Math.floor(car.y));
            } else if (mapRef.current) {
              var tcy = Math.floor(car.y), tcx = Math.floor(car.x);
              if (tcy >= 0 && tcy < MAP_SIZE && tcx >= 0 && tcx < MAP_SIZE) tireCell = mapRef.current[tcy][tcx];
            }
            var onRoad = (tireCell === 0 || tireCell === 3);
            var onSidewalk = (tireCell === 4);
            var weather = currentScenario.weather;
            // Center freq + Q vary by surface
            var tireFreq, tireQ, tireVolMult;
            if (onRoad) { tireFreq = 550 + Math.abs(car.speed) * 12; tireQ = 0.7; tireVolMult = 1.0; }
            else if (onSidewalk) { tireFreq = 900 + Math.abs(car.speed) * 18; tireQ = 1.4; tireVolMult = 1.3; }
            else { tireFreq = 280 + Math.abs(car.speed) * 6; tireQ = 0.5; tireVolMult = 1.15; } // grass/off-road
            if (weather === 'rain') { tireFreq *= 1.4; tireVolMult *= 1.25; }
            else if (weather === 'snow') { tireFreq *= 0.7; tireVolMult *= 0.55; }
            var tireVol = Math.min(0.08, Math.abs(car.speed) * 0.0022 * tireVolMult);
            a._tireGain.gain.setTargetAtTime(tireVol, a.ctx.currentTime, 0.08);
            a._tireFilter.frequency.setTargetAtTime(tireFreq, a.ctx.currentTime, 0.08);
            a._tireFilter.Q.setTargetAtTime(tireQ, a.ctx.currentTime, 0.15);
            // Cross-cell impacts: fire splash/thump as we cross into a new cell.
            // Cells aren't physically marked as puddles/potholes — synthesize via
            // hash so the same world position always sounds the same. Speed-gated
            // (no thumps when crawling).
            var cellKey = Math.floor(car.x) * 65537 + Math.floor(car.y);
            if (a._lastCellKey === undefined) a._lastCellKey = cellKey;
            if (cellKey !== a._lastCellKey && Math.abs(car.speed) > 4 && onRoad) {
              var hash = (cellKey * 2654435761) >>> 0;
              // Splash: only in rain, ~1 in 14 road cells.
              if (weather === 'rain' && (hash % 14) === 0) {
                playSplash(Math.min(8, Math.abs(car.speed) * 0.5));
              }
              // Pothole thump: ~1 in 60 road cells, intensity scales with speed.
              else if (weather !== 'snow' && (hash % 60) === 0) {
                playThump(Math.min(8, Math.abs(car.speed) * 0.6));
              }
              a._lastCellKey = cellKey;
            } else if (cellKey === a._lastCellKey) {
              // No change — leave key as-is.
            } else {
              a._lastCellKey = cellKey;
            }
            // Rain ambient (if raining — constant patter)
            if (currentScenario.weather === 'rain' && !a._rainNode) {
              var rainBuf = a.ctx.createBuffer(1, a.ctx.sampleRate * 2, a.ctx.sampleRate);
              var rd = rainBuf.getChannelData(0);
              for (var rni = 0; rni < rd.length; rni++) rd[rni] = (Math.random() * 2 - 1) * 0.15;
              a._rainNode = a.ctx.createBufferSource();
              a._rainNode.buffer = rainBuf;
              a._rainNode.loop = true;
              a._rainFilter = a.ctx.createBiquadFilter();
              a._rainFilter.type = 'bandpass';
              a._rainFilter.frequency.value = 3000;
              a._rainFilter.Q.value = 0.5;
              a._rainGain = a.ctx.createGain();
              a._rainGain.gain.value = 0.025;
              a._rainNode.connect(a._rainFilter);
              a._rainFilter.connect(a._rainGain);
              a._rainGain.connect(a.ctx.destination);
              a._rainNode.start();
            }
            // Ambient environment sounds
            if (!a._ambientNode && a.ctx) {
              try {
                var ambBuf = a.ctx.createBuffer(1, a.ctx.sampleRate * 3, a.ctx.sampleRate);
                var ambData = ambBuf.getChannelData(0);
                // Generate ambient texture: gentle noise with bird-like chirps mixed in
                for (var ai = 0; ai < ambData.length; ai++) {
                  ambData[ai] = (Math.random() * 2 - 1) * 0.05;
                  // Occasional bird chirp-like spike (for rural/residential)
                  if (Math.random() < 0.0001) {
                    for (var bi = 0; bi < 400 && ai + bi < ambData.length; bi++) {
                      ambData[ai + bi] += Math.sin(bi * 0.15) * Math.exp(-bi * 0.01) * 0.1;
                    }
                  }
                }
                a._ambientNode = a.ctx.createBufferSource();
                a._ambientNode.buffer = ambBuf;
                a._ambientNode.loop = true;
                a._ambientFilter = a.ctx.createBiquadFilter();
                a._ambientFilter.type = 'bandpass';
                a._ambientFilter.frequency.value = 2000;
                a._ambientFilter.Q.value = 0.3;
                a._ambientGain = a.ctx.createGain();
                a._ambientGain.gain.value = 0;
                a._ambientNode.connect(a._ambientFilter);
                a._ambientFilter.connect(a._ambientGain);
                a._ambientGain.connect(a.ctx.destination);
                a._ambientNode.start();
              } catch(e) {}
            }
            // Adjust ambient volume based on scenario type and speed
            if (a._ambientGain) {
              var ambVol = car.speed < 5 ? 0.02 : 0.005; // louder when slow (can hear birds), fades at speed
              if (currentScenario.id === 'highway') ambVol *= 0.3; // less nature on highway
              if (currentScenario.id === 'downtown') ambVol *= 0.5;
              a._ambientGain.gain.setTargetAtTime(ambVol, a.ctx.currentTime, 0.5);
            }
            // Blinker tick sound
            if (blinkerRef.current !== 0) {
              var shouldTick = Math.floor(blinkerTimerRef.current * 2.5) % 2 === 0;
              if (shouldTick && !a._lastBlinkerTick) {
                a._lastBlinkerTick = true;
                var tick = a.ctx.createOscillator();
                var tickG = a.ctx.createGain();
                tick.type = 'sine'; tick.frequency.value = 1200;
                tickG.gain.value = 0.03;
                tick.connect(tickG); tickG.connect(a.ctx.destination);
                tick.start();
                tickG.gain.setTargetAtTime(0, a.ctx.currentTime + 0.05, 0.01);
                tick.stop(a.ctx.currentTime + 0.08);
              } else if (!shouldTick) {
                a._lastBlinkerTick = false;
              }
            }
          } catch (e) { /* ignore */ }
        };

        var checkSignalCompliance = function() {
          var car = carRef.current;
          signalsRef.current.forEach(function(s) {
            if (s.type === 'light') {
              // ALWAYS track position relative to each signal (regardless of state)
              if (!s._lastY) s._lastY = car.y;
              var crossed = (s._lastY < s.y && car.y >= s.y) || (s._lastY > s.y && car.y <= s.y);
              // Only penalize if crossed while signal is RED
              if (crossed && s.state === 'red' && Math.abs(car.x - s.x) < 4 && Math.abs(car.speed) > 2) {
                statsRef.current.safetyScore -= 25;
                statsRef.current.crashes++;
                addToast('🚨 RED LIGHT VIOLATION! -25 safety');
                eventToastRef.current = { msg: '🚨 You ran a red light. In real life, that is reckless driving + an accident.', until: timeRef.current + 4 };
              }
              // Green/yellow crossing is fine — no penalty
              s._lastY = car.y; // always update, preventing stale position bugs
            } else if (s.type === 'stop') {
              if (!s._stopped && Math.hypot(car.x - s.x, car.y - s.y) < 3 && car.speed < 1) {
                s._stopped = true;
                statsRef.current.stops++;
                addToast('✓ Full stop. +1');
                eventToastRef.current = { msg: '✓ Good stop at the stop sign.', until: timeRef.current + 2 };
              }
              if (Math.hypot(car.x - s.x, car.y - s.y) > 6) s._stopped = false;
              // Rolling stop detection: only if approaching the sign from ahead (within 2.5 units X) and moving
              if (!s._lastY) s._lastY = car.y;
              if (!s._violated) {
                var crossedStop = (s._lastY < s.y && car.y >= s.y) || (s._lastY > s.y && car.y <= s.y);
                // Narrower X check (2.5 units = ~25 feet) + speed check + approach direction
                if (crossedStop && Math.abs(car.x - s.x) < 2.5 && Math.abs(car.speed) > 3 && !s._stopped) {
                  s._violated = true;
                  statsRef.current.safetyScore -= 20;
                  addToast('🚨 ROLLING STOP! -20 safety');
                }
              }
              // Reset violated flag when far enough away (for looping maps)
              if (Math.hypot(car.x - s.x, car.y - s.y) > 10) s._violated = false;
              s._lastY = car.y;
            }
          });
        };

        var updatePeds = function(dt) {
          var signals = signalsRef.current;
          pedsRef.current.forEach(function(p) {
            if (p.waitingAtCrosswalk && p.crosswalkY != null) {
              // Crosswalk behavior: wait on sidewalk, cross when traffic signal is red
              var signalAtCrosswalk = null;
              signals.forEach(function(s) {
                if (Math.abs(s.y - p.crosswalkY) < 2) signalAtCrosswalk = s;
              });
              var canCross = !signalAtCrosswalk || signalAtCrosswalk.state === 'red';
              if (canCross && !p.crossing) {
                // Start crossing: move straight across from one sidewalk to the other
                p.crossing = true;
                var targetX = p.crossDirection === -1 ? p.sidewalkRight : p.sidewalkLeft;
                p.vx = (targetX - p.x) > 0 ? 0.6 : -0.6;
                p.vy = 0; // straight across, stay on crosswalk Y
                p.y = p.crosswalkY; // snap to crosswalk line
              } else if (!canCross && p.crossing) {
                p.vx *= 1.3; // hurry if light changed
              } else if (!canCross && !p.crossing) {
                // Wait on sidewalk: only fidget along Y (along the sidewalk), not X (into the road)
                p.vx = 0;
                p.vy = Math.sin(timeRef.current * 1.5 + p.y) * 0.015;
                p.x = p.homeX; // stay on their home sidewalk
              }
              // Check if finished crossing (reached the other sidewalk)
              if (p.crossing) {
                var targetSidewalk = p.crossDirection === -1 ? p.sidewalkRight : p.sidewalkLeft;
                if (Math.abs(p.x - targetSidewalk) < 0.5) {
                  p.crossing = false;
                  p.x = targetSidewalk;
                  p.homeX = targetSidewalk;
                  p.crossDirection *= -1;
                  p.vx = 0;
                }
              }
            } else {
              // Non-crosswalk peds: walk ALONG the sidewalk only (Y movement, no X)
              p.x = p.homeX; // always stay on their sidewalk
              p.vx = 0;
              // Walk along sidewalk slowly, occasionally reverse
              if (Math.random() < 0.003) p.vy = (Math.random() - 0.5) * 0.1;
            }
            p.x += p.vx * dt * 2;
            p.y += p.vy * dt * 2;
          });
        };

        var checkCollisions = function() {
          var car = carRef.current;
          var absSpeed = Math.abs(car.speed);
          // ── Physical collision with traffic vehicles ──
          var nearest = null;
          var nearestDist = Infinity;
          trafficRef.current.forEach(function(t) {
            var dx = t.x - car.x;
            var dy = t.y - car.y;
            var dist = Math.hypot(dx, dy);
            // Track nearest ahead for following distance
            var dot = Math.cos(car.heading) * dx + Math.sin(car.heading) * dy;
            if (dot > 0 && dist < nearestDist) { nearestDist = dist; nearest = t; }
            // Physical collision: hit radius ~1.2 world units
            // Collision: require meaningful relative speed difference (not just being near a car going the same speed)
            var relativeSpeed = Math.abs(car.speed - t.speed);
            if (dist < 1.2 && relativeSpeed > 2 && absSpeed > 2) {
              if (!t._hitCooldown || timeRef.current - t._hitCooldown > 5) {
                t._hitCooldown = timeRef.current;
                var impactSpeed = relativeSpeed * MS_TO_MPH;
                statsRef.current.crashes++;
                if (impactSpeed > 30) {
                  statsRef.current.safetyScore -= 40;
                  addToast('💥 HIGH-SPEED COLLISION! -40 safety');
                  eventToastRef.current = { msg: '💥 Major collision at ' + Math.round(impactSpeed) + ' mph relative speed. In real life, serious injuries.', until: timeRef.current + 5 };
                } else if (impactSpeed > 10) {
                  statsRef.current.safetyScore -= 25;
                  addToast('💥 Collision with vehicle! -25 safety');
                  eventToastRef.current = { msg: '💥 Vehicle collision. Even low-speed crashes cause whiplash and $3,000+ damage.', until: timeRef.current + 4 };
                } else {
                  statsRef.current.safetyScore -= 10;
                  addToast('💥 Fender bender. -10 safety');
                }
                // Physics: elastic-ish collision — both bounce
                var avgSpeed = (car.speed + t.speed) / 2;
                car.speed = avgSpeed * -0.3; // bounce back
                t.speed = avgSpeed * 0.5;
                // Push apart to prevent stuck-inside-each-other
                var pushAngle = Math.atan2(car.y - t.y, car.x - t.x);
                car.x += Math.cos(pushAngle) * 0.5;
                car.y += Math.sin(pushAngle) * 0.5;
              }
            }
          });
          // Following distance check (for scoring, not collision)
          if (nearest && absSpeed > 5) {
            var safeFeet = safeFollowingFeet(absSpeed * MS_TO_MPH, currentScenario.weather);
            var actualFeet = nearestDist * 10;
            // Only count cars in the same lane (within 1.5 units of car.x) and debounce
            if (actualFeet < safeFeet * 0.5 && Math.abs(nearest.x - car.x) < 1.5) {
              if (!nearest._closeFollowFlagged) {
                nearest._closeFollowFlagged = true;
                statsRef.current.closeFollows++;
              }
              statsRef.current.safetyScore -= 0.1;
            } else if (nearest._closeFollowFlagged && actualFeet > safeFeet * 0.7) {
              nearest._closeFollowFlagged = false; // reset when distance is restored
            }
          }
          // ── Physical collision with pedestrians ──
          pedsRef.current.forEach(function(p) {
            var dist = Math.hypot(p.x - car.x, p.y - car.y);
            if (dist < 0.8 && absSpeed > 1) {
              if (!p._hitCooldown || timeRef.current - p._hitCooldown > 5) {
                p._hitCooldown = timeRef.current;
                statsRef.current.crashes++;
                statsRef.current.safetyScore -= 60;
                addToast('💥 PEDESTRIAN STRUCK! -60 safety');
                eventToastRef.current = { msg: '💥 You struck a pedestrian. In real life, this is a potential fatality and criminal charges.', until: timeRef.current + 6 };
                car.speed *= 0.2;
                // Move ped away
                p.x += (p.x > car.x ? 2 : -2);
              }
            }
          });
          // ── Emergency vehicle collision ──
          if (emergencyRef.current) {
            var em = emergencyRef.current;
            var emDist = Math.hypot(em.x - car.x, em.y - car.y);
            if (emDist < 1.5 && absSpeed > 1 && !em._hitPlayer) {
              em._hitPlayer = true;
              statsRef.current.crashes++;
              statsRef.current.safetyScore -= 50;
              addToast('💥 STRUCK EMERGENCY VEHICLE! -50 safety');
              eventToastRef.current = { msg: '💥 You collided with an emergency vehicle. Criminal offense + massive liability.', until: timeRef.current + 5 };
              car.speed *= 0.1;
            }
          }
        };

        // ══════════════════════════════════════════════
        // THREE.JS 3D SCENE INITIALIZATION + RENDER
        // ══════════════════════════════════════════════

        var threeReady = false;
        var scn3d = null; // { scene, camera, renderer, objects }

        function initThreeScene() {
          var T = window.THREE;
          if (!T) return null;
          var cnv = canvas3dRef.current;
          if (!cnv) return null;
          var W = cnv.clientWidth || 800;
          var H = cnv.clientHeight || 500;

          var scene = new T.Scene();
          var isNight = currentScenario.time === 'night';
          var isFog = currentScenario.weather === 'fog';
          var isSnow = currentScenario.weather === 'snow';
          var isRain = currentScenario.weather === 'rain';
          var isDawn = currentScenario.id === 'dawn';
          var skyColor = isNight && !isDawn ? '#0a0f1e' : isDawn ? '#e8875c' : isFog ? '#94a3b8' : isSnow ? '#cbd5e1' : isRain ? '#475569' : '#87ceeb';
          scene.background = new T.Color(skyColor);
          if (isFog) { scene.fog = new T.Fog(0x94a3b8, 5, 40); }
          else if (isSnow) { scene.fog = new T.Fog(0xcbd5e1, 10, 60); }
          else if (isRain) { scene.fog = new T.Fog(0x475569, 8, 50); }
          else if (isDawn) { scene.fog = new T.Fog(0xe8875c, 15, 80); }
          else { scene.fog = new T.Fog(scene.background.getHex(), 30, 120); }

          // ─── SKYDOME: inward-facing sphere with a vertex-colored zenith→horizon
          // gradient. Replaces the flat scene.background so the sky actually has
          // depth. fog: false keeps the gradient visible through the fog volume.
          (function() {
            var zenith, horizon;
            if (isNight && !isDawn) { zenith = new T.Color(0x050a1a); horizon = new T.Color(0x1a2548); }
            else if (isDawn) { zenith = new T.Color(0x3a2a5a); horizon = new T.Color(0xff9a55); }
            else if (isFog) { zenith = new T.Color(0xa8b4c2); horizon = new T.Color(0x94a3b8); }
            else if (isSnow) { zenith = new T.Color(0xdde3ed); horizon = new T.Color(0xcbd5e1); }
            else if (isRain) { zenith = new T.Color(0x334155); horizon = new T.Color(0x64748b); }
            else { zenith = new T.Color(0x4a86d4); horizon = new T.Color(0xcfe4f5); }
            var skyGeo = new T.SphereGeometry(180, 24, 16);
            // Per-vertex color: interpolate by Y (altitude). Sphere vertices with
            // positive Y are sky-top; negative Y are ground-band (we hide that
            // half behind the ground plane anyway).
            var posAttr = skyGeo.getAttribute('position');
            var colors = new Float32Array(posAttr.count * 3);
            for (var vi = 0; vi < posAttr.count; vi++) {
              var vy = posAttr.getY(vi);
              var t = Math.max(0, Math.min(1, vy / 180)); // 0 = horizon, 1 = zenith
              // Ease so the horizon band is tight and most of the dome is zenith color.
              var tt = t * t * (3 - 2 * t);
              var r = horizon.r + (zenith.r - horizon.r) * tt;
              var g = horizon.g + (zenith.g - horizon.g) * tt;
              var b = horizon.b + (zenith.b - horizon.b) * tt;
              colors[vi * 3 + 0] = r;
              colors[vi * 3 + 1] = g;
              colors[vi * 3 + 2] = b;
            }
            skyGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
            var skyMat = new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false });
            var skyMesh = new T.Mesh(skyGeo, skyMat);
            skyMesh.name = 'skydome';
            scene.add(skyMesh);

            // Distant silhouette ring — low-poly "mountains" ~140 units out. Only
            // render for outdoor clear / dawn / night scenarios where you can see
            // them; fog/snow/rain hide the horizon anyway.
            if (!isFog && !isSnow && !isRain) {
              var mtnSeg = 48;
              var mtnGeo = new T.BufferGeometry();
              var mtnVerts = [];
              var mtnIdx = [];
              var mtnSeed = 20240415;
              function mtnRng() { mtnSeed = (mtnSeed * 1103515245 + 12345) & 0x7fffffff; return (mtnSeed >>> 16) / 32768; }
              // Two vertices per segment: top (random height) and bottom (y=0).
              // Triangulated as a strip.
              for (var mi = 0; mi <= mtnSeg; mi++) {
                var ang = (mi / mtnSeg) * Math.PI * 2;
                var mx = Math.cos(ang) * 140;
                var mz = Math.sin(ang) * 140;
                var peakHeight = 6 + mtnRng() * 14;
                mtnVerts.push(mx, 0, mz);
                mtnVerts.push(mx, peakHeight, mz);
              }
              for (var mj = 0; mj < mtnSeg; mj++) {
                var a = mj * 2, b = mj * 2 + 1, c = mj * 2 + 2, d = mj * 2 + 3;
                mtnIdx.push(a, c, b, b, c, d);
              }
              mtnGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(mtnVerts), 3));
              mtnGeo.setIndex(mtnIdx);
              mtnGeo.computeVertexNormals();
              var mtnColor = isNight && !isDawn ? 0x1a2240 : isDawn ? 0x5a3a5a : 0x4a6a8a;
              var mtnMat = new T.MeshBasicMaterial({ color: mtnColor, fog: false, depthWrite: false });
              var mtnMesh = new T.Mesh(mtnGeo, mtnMat);
              mtnMesh.name = 'mountain_ring';
              scene.add(mtnMesh);

              // Forest ring — lower, closer band of darker jagged silhouette
              // between the player and the mountains. Adds a depth layer that
              // sells the horizon even when no trees are near the road.
              var fSeg = 80;
              var fVerts = [];
              var fIdx = [];
              var fSeed = 99173;
              function fRng() { fSeed = (fSeed * 1103515245 + 12345) & 0x7fffffff; return (fSeed >>> 16) / 32768; }
              for (var fi = 0; fi <= fSeg; fi++) {
                var fAng = (fi / fSeg) * Math.PI * 2;
                var fx = Math.cos(fAng) * 95;
                var fz = Math.sin(fAng) * 95;
                // Jagged top — alternating tall/short for a dense tree silhouette.
                var fTop = 2.5 + fRng() * 4.5 + ((fi % 3 === 0) ? 2 : 0);
                fVerts.push(fx, 0, fz);
                fVerts.push(fx, fTop, fz);
              }
              for (var fj = 0; fj < fSeg; fj++) {
                var fa = fj * 2, fb = fj * 2 + 1, fc = fj * 2 + 2, fd = fj * 2 + 3;
                fIdx.push(fa, fc, fb, fb, fc, fd);
              }
              var fGeo = new T.BufferGeometry();
              fGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(fVerts), 3));
              fGeo.setIndex(fIdx);
              fGeo.computeVertexNormals();
              var fColor = isNight && !isDawn ? 0x0a1a18 : isDawn ? 0x3a2a3a : 0x1e4a2a;
              var fMat = new T.MeshBasicMaterial({ color: fColor, fog: false, depthWrite: false });
              var fMesh = new T.Mesh(fGeo, fMat);
              fMesh.name = 'forest_ring';
              scene.add(fMesh);
            }

            // High-altitude parallax cloud band — large flat puffs at y≈60, ~120u
            // out, drifting slowly. Distinct from the low cloudGroup so we get two
            // depths of cloud motion. Hidden in fog/snow/rain (overcast already).
            if (!isFog && !isSnow && !isRain) {
              var hiCloudGroup = new T.Group();
              hiCloudGroup.name = 'hi_clouds';
              var hcColor = isNight && !isDawn ? 0x2a3050 : isDawn ? 0xffb088 : 0xf0f4fa;
              var hcMat = new T.MeshBasicMaterial({ color: hcColor, transparent: true, opacity: isNight && !isDawn ? 0.4 : 0.7, fog: false, depthWrite: false });
              var hcSeed = 19287;
              function hcRng() { hcSeed = (hcSeed * 1103515245 + 12345) & 0x7fffffff; return (hcSeed >>> 16) / 32768; }
              for (var hci = 0; hci < 18; hci++) {
                var hcAng = (hci / 18) * Math.PI * 2 + hcRng() * 0.2;
                var hcDist = 110 + hcRng() * 25;
                var hcW = 18 + hcRng() * 14;
                var hcH = 4 + hcRng() * 3;
                var hcPlane = new T.Mesh(new T.PlaneGeometry(hcW, hcH), hcMat);
                hcPlane.position.set(Math.cos(hcAng) * hcDist, 55 + hcRng() * 10, Math.sin(hcAng) * hcDist);
                hcPlane.lookAt(0, hcPlane.position.y, 0); // face center
                hcPlane._driftAng = hcAng;
                hcPlane._driftDist = hcDist;
                hcPlane._driftSpeed = 0.003 + hcRng() * 0.003;
                hiCloudGroup.add(hcPlane);
              }
              scene.add(hiCloudGroup);
            }

            // Halo around the sun/moon so the celestial body reads as a light source
            // rather than a flat disc. Three concentric soft circles, additive.
            // The existing sun/moon meshes live elsewhere; halos register by name and
            // are positioned to follow them in the per-frame update.
            var haloColor;
            if (isNight && !isDawn) haloColor = 0xc4d0e8;
            else if (isDawn) haloColor = 0xffd2a0;
            else haloColor = 0xfff0c4;
            var haloGroup = new T.Group();
            haloGroup.name = 'celestial_halo';
            for (var hi = 0; hi < 3; hi++) {
              var hSize = 4 + hi * 3.5;
              var hMat = new T.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.18 - hi * 0.05, fog: false, depthWrite: false, blending: T.AdditiveBlending });
              var hRing = new T.Mesh(new T.CircleGeometry(hSize, 24), hMat);
              haloGroup.add(hRing);
            }
            scene.add(haloGroup);

            // Starfield — several hundred tiny bright points on a sphere just
            // inside the skydome. Night + dawn twilight only.
            if ((isNight && !isDawn) || isDawn) {
              var starCount = isDawn ? 120 : 420;
              var starGeo = new T.BufferGeometry();
              var starPos = new Float32Array(starCount * 3);
              var starCol = new Float32Array(starCount * 3);
              var stSeed = 77213;
              function stRng() { stSeed = (stSeed * 1103515245 + 12345) & 0x7fffffff; return (stSeed >>> 16) / 32768; }
              for (var sti = 0; sti < starCount; sti++) {
                // Uniform on upper hemisphere so no stars under the ground.
                var stPhi = stRng() * Math.PI * 2;
                var stTheta = Math.acos(stRng() * 0.85 + 0.15);
                var stR = 175;
                starPos[sti * 3 + 0] = stR * Math.sin(stTheta) * Math.cos(stPhi);
                starPos[sti * 3 + 1] = stR * Math.cos(stTheta);
                starPos[sti * 3 + 2] = stR * Math.sin(stTheta) * Math.sin(stPhi);
                // Slight color variance: blue-white, warm white, pale yellow.
                var palette = stRng();
                var scR = palette < 0.6 ? 1 : palette < 0.85 ? 1 : 0.95;
                var scG = palette < 0.6 ? 1 : palette < 0.85 ? 0.95 : 0.88;
                var scB = palette < 0.6 ? 1 : palette < 0.85 ? 0.85 : 0.7;
                var scDim = 0.6 + stRng() * 0.4;
                starCol[sti * 3 + 0] = scR * scDim;
                starCol[sti * 3 + 1] = scG * scDim;
                starCol[sti * 3 + 2] = scB * scDim;
              }
              starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
              starGeo.setAttribute('color', new T.BufferAttribute(starCol, 3));
              var starMat = new T.PointsMaterial({ size: isDawn ? 0.6 : 0.9, vertexColors: true, fog: false, transparent: true, opacity: isDawn ? 0.4 : 1 });
              var stars = new T.Points(starGeo, starMat);
              stars.name = 'starfield';
              scene.add(stars);

              // Shooting star — single long bright line that streaks across the
              // sky periodically. Start inert; the update loop repositions it.
              if (isNight && !isDawn) {
                var ssGeo = new T.BufferGeometry();
                var ssPts = new Float32Array([0, 0, 0, 0, 0, 0]);
                ssGeo.setAttribute('position', new T.BufferAttribute(ssPts, 3));
                var ssMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false });
                var shooting = new T.Line(ssGeo, ssMat);
                shooting.name = 'shooting_star';
                shooting._nextAt = 3; // seconds until next streak
                shooting._active = false;
                scene.add(shooting);
              }
            }

            // Dawn light shafts — wide, soft, angled planes emanating from the
            // low sun direction. Additive blending over the sky gradient gives
            // the god-ray effect without needing a real volumetric light pass.
            if (isDawn) {
              var shaftGroup = new T.Group();
              shaftGroup.name = 'dawn_shafts';
              var shaftMat = new T.MeshBasicMaterial({
                color: 0xffb880,
                transparent: true,
                opacity: 0.12,
                blending: T.AdditiveBlending,
                side: T.DoubleSide,
                fog: false,
                depthWrite: false
              });
              // Fan of long rectangles tilted at shallow angles — each one is a
              // light shaft spreading from the sun position.
              for (var si = 0; si < 6; si++) {
                var shaft = new T.Mesh(new T.PlaneGeometry(30, 140), shaftMat);
                // Rotate around Z so each shaft points outward at a slightly
                // different angle, and tilt around X so they lean toward horizon.
                shaft.rotation.z = (si - 2.5) * 0.08;
                shaft.rotation.x = Math.PI / 2.2;
                // Offset so shafts originate near the low sun position (dawn
                // sun is positioned at sun.position ≈ (60, 5, -10) in scene setup).
                shaft.position.set(50, 30, -8);
                shaftGroup.add(shaft);
              }
              scene.add(shaftGroup);
            }

            // Birds — tiny V-shaped silhouettes flying in a loose formation.
            // Day/dawn only (night has different ambient; fog/rain too murky).
            if (!isNight && !isFog && !isRain && !isSnow) {
              var birdGroup = new T.Group();
              birdGroup.name = 'birds';
              var birdMat = new T.MeshBasicMaterial({ color: isDawn ? 0x4a3050 : 0x1a1a2a, fog: false });
              for (var bdi = 0; bdi < 7; bdi++) {
                // Each bird = two tiny triangles shaped like a V.
                var bdGeo = new T.BufferGeometry();
                var bv = new Float32Array([
                  -0.18, 0, 0,
                   0,    0.04, 0,
                   0.18, 0, 0
                ]);
                bdGeo.setAttribute('position', new T.BufferAttribute(bv, 3));
                bdGeo.setIndex([0, 1, 2]);
                var bd = new T.Mesh(bdGeo, birdMat);
                // Start each bird at a random position in a slow-drift flock.
                bd._flockAng = (bdi / 7) * Math.PI * 2;
                bd._flockRad = 40 + (bdi % 3) * 8;
                bd._flockY = 22 + (bdi % 2) * 4;
                bd._flapPhase = bdi * 0.7;
                bd._flockSpeed = 0.04 + (bdi % 3) * 0.01;
                birdGroup.add(bd);
              }
              scene.add(birdGroup);
            }
          })();

          var camera = new T.PerspectiveCamera(65, W / H, 0.1, 200);
          var renderer = new T.WebGLRenderer({ canvas: cnv, antialias: true });
          renderer.setSize(W, H);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = T.PCFSoftShadowMap;

          // ── Lighting ──
          var ambientColor = isNight && !isDawn ? 0x1a1a3a : isDawn ? 0xffa060 : 0xffffff;
          var ambientInt = isNight && !isDawn ? 0.15 : isDawn ? 0.35 : 0.5;
          var ambient = new T.AmbientLight(ambientColor, ambientInt);
          scene.add(ambient);
          var sunColor = isNight && !isDawn ? 0x4466aa : isDawn ? 0xff8844 : 0xfff5e0;
          var sunInt = isNight && !isDawn ? 0.3 : isDawn ? 0.7 : 0.9;
          var sun = new T.DirectionalLight(sunColor, sunInt);
          sun.position.set(isDawn ? 60 : 20, isDawn ? 5 : 30, isDawn ? -10 : 10);
          sun.castShadow = true;
          sun.shadow.mapSize.set(1024, 1024);
          sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
          sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
          sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
          scene.add(sun);

          // ── Ground plane (road + grass) ──
          // Subdivided + vertex-colored so the grass reads as a real meadow with
          // patchy variation instead of a flat green rectangle. Light-frequency
          // sine displacement adds gentle rolling even in scenario mode.
          var map = mapRef.current;
          var groundGeo = new T.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2, 48, 48);
          var grassBase = isSnow ? [0xd0d8e0, 0xe8ecf0, 0xb8c4d0]
                                 : [0x2d6a1e, 0x3a7a26, 0x1f5a16, 0x4a8a2e];
          var gPos = groundGeo.getAttribute('position');
          var gCol = new Float32Array(gPos.count * 3);
          for (var gvi = 0; gvi < gPos.count; gvi++) {
            var gx = gPos.getX(gvi);
            var gy = gPos.getY(gvi);
            // Plane is in XY before rotation; Z is "up" post-displacement.
            var bump = Math.sin(gx * 0.08) * 0.3 + Math.cos(gy * 0.11) * 0.25 + Math.sin((gx + gy) * 0.05) * 0.2;
            gPos.setZ(gvi, bump);
            // Pick one of the palette colors via spatial hash so patches feel natural.
            var pIdx = ((Math.floor(gx * 0.3) * 73 + Math.floor(gy * 0.3) * 37) % grassBase.length + grassBase.length) % grassBase.length;
            var cH = grassBase[pIdx];
            gCol[gvi * 3 + 0] = ((cH >> 16) & 0xff) / 255;
            gCol[gvi * 3 + 1] = ((cH >>  8) & 0xff) / 255;
            gCol[gvi * 3 + 2] = ( cH        & 0xff) / 255;
          }
          groundGeo.setAttribute('color', new T.BufferAttribute(gCol, 3));
          groundGeo.computeVertexNormals();
          var groundMat = new T.MeshLambertMaterial({ vertexColors: true });
          var ground = new T.Mesh(groundGeo, groundMat);
          ground.rotation.x = -Math.PI / 2;
          ground.receiveShadow = true;
          scene.add(ground);

          // ── Road surface ──
          var centerX = Math.floor(MAP_SIZE / 2);
          var roadGeo = new T.PlaneGeometry(7, MAP_SIZE * 2);
          var roadColor = isSnow ? 0x8899a6 : 0x333842;
          var roadMat = new T.MeshLambertMaterial({ color: roadColor });
          var road = new T.Mesh(roadGeo, roadMat);
          road.rotation.x = -Math.PI / 2;
          road.position.set(centerX - MAP_SIZE / 2, 0.01, 0);
          road.receiveShadow = true;
          scene.add(road);

          // ── Center line dashes (follow road curve) ──
          var dashMat = new T.MeshBasicMaterial({ color: 0xfacc15 });
          var isRuralCurve = ['rural', 'snow', 'fog', 'dawn'].indexOf(currentScenario.id) !== -1;
          var isHwyCurve = currentScenario.id === 'highway';
          for (var di = -MAP_SIZE; di < MAP_SIZE; di += 3) {
            var dashGeo = new T.PlaneGeometry(0.15, 1.5);
            var dash = new T.Mesh(dashGeo, dashMat);
            dash.rotation.x = -Math.PI / 2;
            // Calculate road center at this Y position (accounting for curves)
            var dashCenterX = centerX;
            var mapY = di + MAP_SIZE / 2; // convert world Z back to map Y
            if (isRuralCurve) dashCenterX = centerX + Math.round(Math.sin(mapY * 0.12) * 5);
            else if (isHwyCurve) dashCenterX = centerX + Math.round(Math.sin(mapY * 0.06) * 3);
            dash.position.set(dashCenterX - MAP_SIZE / 2, 0.02, di);
            // Rotate dash to align with curve direction
            if (isRuralCurve || isHwyCurve) {
              var nextY = mapY + 1;
              var nextCX = isRuralCurve ? centerX + Math.sin(nextY * 0.12) * 5 : centerX + Math.sin(nextY * 0.06) * 3;
              var curCX = isRuralCurve ? centerX + Math.sin(mapY * 0.12) * 5 : centerX + Math.sin(mapY * 0.06) * 3;
              dash.rotation.z = Math.atan2(nextCX - curCX, 1); // angle to follow curve
            }
            scene.add(dash);
          }

          // ── Edge lines (white solid, follow curves) ──
          var edgeMat = new T.MeshBasicMaterial({ color: 0xffffff });
          if (isRuralCurve || isHwyCurve) {
            // Segmented edge lines that follow the curve
            [-3.3, 3.3].forEach(function(offset) {
              for (var ei = -MAP_SIZE; ei < MAP_SIZE; ei += 2) {
                var edgeGeo = new T.PlaneGeometry(0.1, 2.1);
                var edge = new T.Mesh(edgeGeo, edgeMat);
                edge.rotation.x = -Math.PI / 2;
                var emapY = ei + MAP_SIZE / 2;
                var eCX = isRuralCurve ? centerX + Math.sin(emapY * 0.12) * 5 : centerX + Math.sin(emapY * 0.06) * 3;
                edge.position.set(eCX - MAP_SIZE / 2 + offset, 0.02, ei);
                scene.add(edge);
              }
            });
          } else {
            // Straight roads: single long edge line
            [-3.3, 3.3].forEach(function(offset) {
              var edgeGeo = new T.PlaneGeometry(0.12, MAP_SIZE * 2);
              var edge = new T.Mesh(edgeGeo, edgeMat);
              edge.rotation.x = -Math.PI / 2;
              edge.position.set(centerX - MAP_SIZE / 2 + offset, 0.02, 0);
              scene.add(edge);
            });
          }

          // ── Sidewalks (concrete strips between road and grass) ──
          var sidewalkMat = new T.MeshLambertMaterial({ color: isSnow ? 0xc0c8d0 : 0xb0a890 });
          [-4.5, 4.5].forEach(function(offset) {
            var swGeo = new T.PlaneGeometry(1.5, MAP_SIZE * 2);
            var sw = new T.Mesh(swGeo, sidewalkMat);
            sw.rotation.x = -Math.PI / 2;
            sw.position.set(centerX - MAP_SIZE / 2 + offset, 0.015, 0);
            sw.receiveShadow = true;
            scene.add(sw);
          });

          // ── Curbs (raised edges between road and sidewalk) ──
          var curbMat = new T.MeshLambertMaterial({ color: 0x888888 });
          [-3.5, 3.5].forEach(function(offset) {
            var cGeo = new T.BoxGeometry(0.15, 0.12, MAP_SIZE * 2);
            var curb = new T.Mesh(cGeo, curbMat);
            curb.position.set(centerX - MAP_SIZE / 2 + offset, 0.06, 0);
            scene.add(curb);
          });

          // ── Street lamps (poles with point lights — key for night immersion) ──
          var lampMeshes = [];
          var lampPostMat = new T.MeshLambertMaterial({ color: 0x444444 });
          var lampBulbMat = new T.MeshBasicMaterial({ color: isNight ? 0xfff0cc : 0x999999 });
          for (var li = -MAP_SIZE; li < MAP_SIZE; li += 8) {
            [-5.5, 5.5].forEach(function(xOff) {
              // Pole
              var lpGeo = new T.CylinderGeometry(0.04, 0.06, 3.5, 6);
              var lp = new T.Mesh(lpGeo, lampPostMat);
              lp.position.set(centerX - MAP_SIZE / 2 + xOff, 1.75, li);
              lp.castShadow = true;
              scene.add(lp);
              // Arm
              var armGeo = new T.BoxGeometry(0.8, 0.04, 0.04);
              var arm = new T.Mesh(armGeo, lampPostMat);
              arm.position.set(centerX - MAP_SIZE / 2 + xOff + (xOff < 0 ? 0.4 : -0.4), 3.4, li);
              scene.add(arm);
              // Bulb / fixture
              var bGeo = new T.SphereGeometry(0.1, 8, 8);
              var bulb = new T.Mesh(bGeo, lampBulbMat);
              var bulbX = centerX - MAP_SIZE / 2 + xOff + (xOff < 0 ? 0.75 : -0.75);
              bulb.position.set(bulbX, 3.35, li);
              scene.add(bulb);
              // Point light at night
              if (isNight) {
                var pl = new T.PointLight(0xfff0cc, 0.8, 12, 2);
                pl.position.set(bulbX, 3.3, li);
                scene.add(pl);
              }
              lampMeshes.push({ pole: lp, bulb: bulb });
            });
          }

          // ── Crosswalk zebra stripes at signal locations ──
          var crosswalkMat = new T.MeshBasicMaterial({ color: 0xffffff });
          signalsRef.current.forEach(function(sig) {
            for (var cs = -3; cs <= 3; cs++) {
              var csGeo = new T.PlaneGeometry(0.3, 0.8);
              var csMesh = new T.Mesh(csGeo, crosswalkMat);
              csMesh.rotation.x = -Math.PI / 2;
              csMesh.position.set(centerX - MAP_SIZE / 2 + cs * 0.8, 0.025, sig.y - MAP_SIZE / 2 - 1.5);
              scene.add(csMesh);
            }
          });

          // ── 3D Speed Limit Signs (canvas-textured for readable text) ──
          var signPostMat = new T.MeshLambertMaterial({ color: 0x888888 });

          // Helper: create a sign texture from canvas with text
          function makeSignTexture(lines, bgColor, textColor, w, h) {
            var c = document.createElement('canvas');
            c.width = w || 128; c.height = h || 192;
            var g = c.getContext('2d');
            // Background
            g.fillStyle = bgColor || '#ffffff';
            g.fillRect(0, 0, c.width, c.height);
            // Border
            g.strokeStyle = textColor || '#000000'; g.lineWidth = 6;
            g.strokeRect(3, 3, c.width - 6, c.height - 6);
            // Text lines
            g.fillStyle = textColor || '#000000'; g.textAlign = 'center';
            lines.forEach(function(line, li) {
              g.font = line.font || 'bold 24px Arial';
              g.fillText(line.text, c.width / 2, line.y || (40 + li * 50));
            });
            var tex = new T.CanvasTexture(c);
            tex.minFilter = T.LinearFilter;
            return tex;
          }

          var speedLimitNum = currentScenario.speedLimit;
          [8, 32, 56].forEach(function(signY) {
            // Post
            var spGeo = new T.CylinderGeometry(0.04, 0.04, 2.2, 6);
            var sp = new T.Mesh(spGeo, signPostMat);
            sp.position.set(centerX - MAP_SIZE / 2 + 4.0, 1.1, signY - MAP_SIZE / 2);
            scene.add(sp);
            // Sign face with canvas texture
            var signTex = makeSignTexture([
              { text: 'SPEED', font: 'bold 20px Arial', y: 40 },
              { text: 'LIMIT', font: 'bold 20px Arial', y: 65 },
              { text: String(speedLimitNum), font: 'bold 60px Arial', y: 140 }
            ], '#ffffff', '#000000', 128, 192);
            var signMat = new T.MeshBasicMaterial({ map: signTex });
            var sfGeo = new T.PlaneGeometry(0.45, 0.65);
            var sf = new T.Mesh(sfGeo, signMat);
            sf.position.set(centerX - MAP_SIZE / 2 + 3.97, 2.1, signY - MAP_SIZE / 2);
            sf.rotation.y = -Math.PI / 2; // face toward road
            scene.add(sf);
            // Back of sign (gray)
            var backMat = new T.MeshLambertMaterial({ color: 0x666666 });
            var backGeo = new T.PlaneGeometry(0.45, 0.65);
            var back = new T.Mesh(backGeo, backMat);
            back.position.set(centerX - MAP_SIZE / 2 + 4.02, 2.1, signY - MAP_SIZE / 2);
            back.rotation.y = Math.PI / 2;
            scene.add(back);
          });

          // ── Street name signs at cross streets ──
          var streetNames = ['OAK ST', 'MAPLE AVE', 'PINE RD'];
          if (['residential', 'suburban', 'school_zone', 'night'].indexOf(currentScenario.id) !== -1) {
            [20, 40, 56, 72].forEach(function(crossY, ci) {
              var nameTex = makeSignTexture([
                { text: streetNames[ci] || 'CROSS ST', font: 'bold 22px Arial', y: 50 }
              ], '#166534', '#ffffff', 192, 64);
              var nameMat = new T.MeshBasicMaterial({ map: nameTex });
              var nameGeo = new T.PlaneGeometry(0.8, 0.3);
              var nameMesh = new T.Mesh(nameGeo, nameMat);
              nameMesh.position.set(centerX - MAP_SIZE / 2 + 4.0, 2.8, crossY - MAP_SIZE / 2);
              nameMesh.rotation.y = -Math.PI / 2;
              scene.add(nameMesh);
            });
          }

          // ── School Zone sign (if school_zone scenario) ──
          if (currentScenario.id === 'school_zone') {
            var szPostGeo = new T.CylinderGeometry(0.04, 0.04, 2.5, 6);
            var szPost = new T.Mesh(szPostGeo, signPostMat);
            szPost.position.set(centerX - MAP_SIZE / 2 + 4.2, 1.25, -8);
            scene.add(szPost);
            // Pentagon-ish shape (use cone with 5 sides as approximation)
            var szGeo = new T.ConeGeometry(0.35, 0.5, 5);
            var szMat = new T.MeshBasicMaterial({ color: 0xccff00 }); // fluorescent yellow-green
            var szSign = new T.Mesh(szGeo, szMat);
            szSign.position.set(centerX - MAP_SIZE / 2 + 4.2, 2.5, -8);
            szSign.rotation.z = Math.PI;
            scene.add(szSign);
          }

          // ── Construction cones (if construction scenario) ──
          if (currentScenario.id === 'construction') {
            var coneMat = new T.MeshLambertMaterial({ color: 0xf97316 });
            var coneStripeMat = new T.MeshBasicMaterial({ color: 0xffffff });
            for (var ci = 0; ci < 12; ci++) {
              var coneZ = -MAP_SIZE / 2 + 20 + ci * 3;
              // Orange cone body
              var coneGeo = new T.ConeGeometry(0.12, 0.6, 8);
              var coneMesh = new T.Mesh(coneGeo, coneMat);
              coneMesh.position.set(centerX - MAP_SIZE / 2 + (ci % 2 === 0 ? 2.5 : -2.5), 0.3, coneZ);
              coneMesh.castShadow = true;
              scene.add(coneMesh);
              // White stripe
              var stripeGeo = new T.CylinderGeometry(0.11, 0.09, 0.08, 8);
              var stripe = new T.Mesh(stripeGeo, coneStripeMat);
              stripe.position.set(centerX - MAP_SIZE / 2 + (ci % 2 === 0 ? 2.5 : -2.5), 0.35, coneZ);
              scene.add(stripe);
            }
          }

          // ── Turn arrows painted on road at intersections ──
          if (['residential', 'suburban', 'school_zone', 'night'].indexOf(currentScenario.id) !== -1) {
            var arrowMat2 = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            [20, 40, 56, 72].forEach(function(crossY) {
              // Left turn arrow (left lane, before intersection)
              var ltArrowGeo = new T.PlaneGeometry(0.3, 0.8);
              var ltArrow = new T.Mesh(ltArrowGeo, arrowMat2);
              ltArrow.rotation.x = -Math.PI / 2;
              ltArrow.position.set(centerX - MAP_SIZE / 2 - 1.5, 0.022, crossY - MAP_SIZE / 2 - 4);
              scene.add(ltArrow);
              // Arrow head triangle
              var triShape = new T.Shape();
              triShape.moveTo(0, 0.15); triShape.lineTo(-0.15, -0.1); triShape.lineTo(0.15, -0.1); triShape.closePath();
              var triGeo = new T.ShapeGeometry(triShape);
              var tri = new T.Mesh(triGeo, arrowMat2);
              tri.rotation.x = -Math.PI / 2;
              tri.position.set(centerX - MAP_SIZE / 2 - 1.5, 0.023, crossY - MAP_SIZE / 2 - 3.3);
              scene.add(tri);
              // Straight arrow (right lane)
              var stArrowGeo = new T.PlaneGeometry(0.15, 1.0);
              var stArrow = new T.Mesh(stArrowGeo, arrowMat2);
              stArrow.rotation.x = -Math.PI / 2;
              stArrow.position.set(centerX - MAP_SIZE / 2 + 1.5, 0.022, crossY - MAP_SIZE / 2 - 4);
              scene.add(stArrow);
              var tri2 = new T.Mesh(triGeo, arrowMat2);
              tri2.rotation.x = -Math.PI / 2;
              tri2.position.set(centerX - MAP_SIZE / 2 + 1.5, 0.023, crossY - MAP_SIZE / 2 - 3.2);
              scene.add(tri2);
            });
          }

          // ── Sidewalk furniture: benches, trash cans, newspaper boxes ──
          if (['residential', 'suburban', 'school_zone', 'night'].indexOf(currentScenario.id) !== -1) {
            var benchMat = new T.MeshLambertMaterial({ color: 0x5c3a1e });
            var trashMat = new T.MeshLambertMaterial({ color: 0x333333 });
            for (var fi = 8; fi < MAP_SIZE; fi += 16) {
              // Bench (right sidewalk)
              var benchSeatGeo = new T.BoxGeometry(0.8, 0.05, 0.3);
              var benchSeat = new T.Mesh(benchSeatGeo, benchMat);
              benchSeat.position.set(centerX - MAP_SIZE / 2 + 4.8, 0.4, fi - MAP_SIZE / 2);
              benchSeat.castShadow = true;
              scene.add(benchSeat);
              // Bench legs
              [-0.3, 0.3].forEach(function(legOff) {
                var legGeo = new T.BoxGeometry(0.04, 0.35, 0.25);
                var leg = new T.Mesh(legGeo, benchMat);
                leg.position.set(centerX - MAP_SIZE / 2 + 4.8 + legOff, 0.2, fi - MAP_SIZE / 2);
                scene.add(leg);
              });
              // Bench back
              var backGeo = new T.BoxGeometry(0.8, 0.3, 0.04);
              var benchBack = new T.Mesh(backGeo, benchMat);
              benchBack.position.set(centerX - MAP_SIZE / 2 + 4.8, 0.55, fi - MAP_SIZE / 2 + 0.13);
              scene.add(benchBack);
              // Trash can (left sidewalk, offset)
              var trashGeo = new T.CylinderGeometry(0.12, 0.14, 0.5, 8);
              var trash = new T.Mesh(trashGeo, trashMat);
              trash.position.set(centerX - MAP_SIZE / 2 - 4.6, 0.25, fi + 5 - MAP_SIZE / 2);
              trash.castShadow = true;
              scene.add(trash);
              // Trash lid
              var lidGeo = new T.CylinderGeometry(0.14, 0.14, 0.03, 8);
              var lid = new T.Mesh(lidGeo, trashMat);
              lid.position.set(centerX - MAP_SIZE / 2 - 4.6, 0.51, fi + 5 - MAP_SIZE / 2);
              scene.add(lid);
            }
            // School zone: flag pole
            if (currentScenario.id === 'school_zone') {
              var flagPoleMat = new T.MeshLambertMaterial({ color: 0xaaaaaa });
              var fpGeo = new T.CylinderGeometry(0.04, 0.06, 6, 8);
              var fp = new T.Mesh(fpGeo, flagPoleMat);
              fp.position.set(centerX - MAP_SIZE / 2 - 5.5, 3, -10);
              fp.castShadow = true;
              scene.add(fp);
              // Flag
              var flagGeo = new T.PlaneGeometry(1.0, 0.6);
              var flagMat = new T.MeshBasicMaterial({ color: 0x1e3a5f, side: T.DoubleSide });
              var flag = new T.Mesh(flagGeo, flagMat);
              flag.position.set(centerX - MAP_SIZE / 2 - 5.0, 5.5, -10);
              scene.add(flag);
            }
          }

          // ── Highway guardrails ──
          if (currentScenario.id === 'highway') {
            var railMat = new T.MeshLambertMaterial({ color: 0x999999 });
            [-7.5, 7.5].forEach(function(railOff) {
              for (var ri = -MAP_SIZE; ri < MAP_SIZE; ri += 2) {
                // Post
                var rpGeo = new T.CylinderGeometry(0.03, 0.03, 0.6, 4);
                var rp = new T.Mesh(rpGeo, railMat);
                rp.position.set(centerX - MAP_SIZE / 2 + railOff, 0.3, ri);
                scene.add(rp);
              }
              // Rail beam
              var beamGeo = new T.BoxGeometry(0.04, 0.15, MAP_SIZE * 2);
              var beam = new T.Mesh(beamGeo, railMat);
              beam.position.set(centerX - MAP_SIZE / 2 + railOff, 0.5, 0);
              scene.add(beam);
            });
            // Highway median barrier
            var medianMat = new T.MeshLambertMaterial({ color: 0x666666 });
            var medGeo = new T.BoxGeometry(0.3, 0.8, MAP_SIZE * 2);
            var med = new T.Mesh(medGeo, medianMat);
            med.position.set(centerX - MAP_SIZE / 2, 0.4, 0);
            scene.add(med);
          }

          // ── Roadside props: mailboxes, hydrants (residential/suburban) ──
          if (currentScenario.id === 'residential' || currentScenario.id === 'suburban' || currentScenario.id === 'school_zone') {
            var hydrantMat = new T.MeshLambertMaterial({ color: 0xef4444 });
            var mailboxMat = new T.MeshLambertMaterial({ color: 0x3b82f6 });
            var mailboxPostMat2 = new T.MeshLambertMaterial({ color: 0x666666 });
            for (var pi = 6; pi < MAP_SIZE; pi += 12) {
              // Fire hydrant (right side)
              var hyGeo = new T.CylinderGeometry(0.12, 0.14, 0.5, 8);
              var hy = new T.Mesh(hyGeo, hydrantMat);
              hy.position.set(centerX - MAP_SIZE / 2 + 4.2, 0.25, pi - MAP_SIZE / 2);
              hy.castShadow = true;
              scene.add(hy);
              // Cap
              var hcGeo = new T.SphereGeometry(0.13, 8, 8);
              var hc = new T.Mesh(hcGeo, hydrantMat);
              hc.position.set(centerX - MAP_SIZE / 2 + 4.2, 0.55, pi - MAP_SIZE / 2);
              scene.add(hc);
              // Mailbox (left side, offset)
              var mbPostGeo = new T.CylinderGeometry(0.04, 0.04, 1.0, 6);
              var mbPost = new T.Mesh(mbPostGeo, mailboxPostMat2);
              mbPost.position.set(centerX - MAP_SIZE / 2 - 4.5, 0.5, pi + 3 - MAP_SIZE / 2);
              scene.add(mbPost);
              var mbBoxGeo = new T.BoxGeometry(0.35, 0.25, 0.2);
              var mbBox = new T.Mesh(mbBoxGeo, mailboxMat);
              mbBox.position.set(centerX - MAP_SIZE / 2 - 4.5, 1.05, pi + 3 - MAP_SIZE / 2);
              mbBox.castShadow = true;
              scene.add(mbBox);
            }
          }

          // ── Telephone poles + power lines (residential/suburban) ──
          if (currentScenario.id === 'residential' || currentScenario.id === 'suburban' || currentScenario.id === 'school_zone' || currentScenario.id === 'night') {
            var telPoleMat = new T.MeshLambertMaterial({ color: 0x6b5b4b });
            var wireMat = new T.MeshBasicMaterial({ color: 0x333333 });
            for (var tpi = -MAP_SIZE + 4; tpi < MAP_SIZE; tpi += 10) {
              // Pole on right side
              var tpGeo = new T.CylinderGeometry(0.06, 0.08, 5, 6);
              var tp = new T.Mesh(tpGeo, telPoleMat);
              tp.position.set(centerX - MAP_SIZE / 2 + 6.5, 2.5, tpi);
              tp.castShadow = true;
              scene.add(tp);
              // Cross arm
              var caGeo = new T.BoxGeometry(0.04, 0.04, 1.2);
              var ca = new T.Mesh(caGeo, telPoleMat);
              ca.position.set(centerX - MAP_SIZE / 2 + 6.5, 4.8, tpi);
              scene.add(ca);
              // Wires (thin cylinders between poles)
              if (tpi > -MAP_SIZE + 4) {
                [-0.5, 0, 0.5].forEach(function(wOff) {
                  var wireGeo = new T.CylinderGeometry(0.01, 0.01, 10.1, 4);
                  var wire = new T.Mesh(wireGeo, wireMat);
                  wire.position.set(centerX - MAP_SIZE / 2 + 6.5, 4.75, tpi - 5);
                  wire.rotation.x = Math.PI / 2;
                  wire.position.z += wOff * 0.1; // slight offset per wire
                  scene.add(wire);
                });
              }
            }
          }

          // ── Road shoulder gravel strips ──
          var shoulderMat = new T.MeshLambertMaterial({ color: isSnow ? 0xb0b8c0 : 0x706050 });
          [-3.7, 3.7].forEach(function(offset) {
            var shGeo = new T.PlaneGeometry(0.6, MAP_SIZE * 2);
            var sh = new T.Mesh(shGeo, shoulderMat);
            sh.rotation.x = -Math.PI / 2;
            sh.position.set(centerX - MAP_SIZE / 2 + offset, 0.012, 0);
            sh.receiveShadow = true;
            scene.add(sh);
          });

          // ── Exhaust particles (subtle smoke from player car) ──
          var exhaustParticles = null;
          if (currentVehicle.type !== 'electric') {
            var exCount = 40;
            var exGeo = new T.BufferGeometry();
            var exPositions = new Float32Array(exCount * 3);
            var exSizes = new Float32Array(exCount);
            for (var exi = 0; exi < exCount; exi++) {
              exPositions[exi * 3] = 0;
              exPositions[exi * 3 + 1] = -999; // hidden initially
              exPositions[exi * 3 + 2] = 0;
              exSizes[exi] = 0.08 + Math.random() * 0.08;
            }
            exGeo.setAttribute('position', new T.BufferAttribute(exPositions, 3));
            var exMat = new T.PointsMaterial({ color: 0x888888, size: 0.12, transparent: true, opacity: 0.3 });
            exhaustParticles = new T.Points(exGeo, exMat);
            scene.add(exhaustParticles);
          }

          // ── Sky: hemisphere light for more natural ambient ──
          var hemiLight = new T.HemisphereLight(
            isNight ? 0x0a0f2e : isFog ? 0x94a3b8 : 0x87ceeb,
            isSnow ? 0xd0d8e0 : 0x2d5a1e,
            isNight ? 0.1 : 0.35
          );
          scene.add(hemiLight);

          // ── Stars at night (small sprite points in sky dome) ──
          if (isNight) {
            var starCount = 200;
            var starGeo = new T.BufferGeometry();
            var starPos = new Float32Array(starCount * 3);
            for (var sti = 0; sti < starCount; sti++) {
              var theta = Math.random() * Math.PI * 2;
              var phi = Math.random() * Math.PI * 0.4 + 0.1;
              var radius = 80;
              starPos[sti * 3] = Math.cos(theta) * Math.sin(phi) * radius;
              starPos[sti * 3 + 1] = Math.cos(phi) * radius;
              starPos[sti * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
            }
            starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
            var starMat = new T.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8 });
            var stars = new T.Points(starGeo, starMat);
            scene.add(stars);
            // Moon
            var moonGeo = new T.SphereGeometry(2, 16, 16);
            var moonMat = new T.MeshBasicMaterial({ color: 0xe2e8f0 });
            var moon = new T.Mesh(moonGeo, moonMat);
            moon.position.set(40, 50, -30);
            scene.add(moon);
          }

          // ── Animated clouds (3D puffs drifting across sky) ──
          var cloudGroup = new T.Group();
          if (!isFog && !isRain) {
            var cloudMat = new T.MeshBasicMaterial({ color: isSnow ? 0xb0b8c0 : 0xffffff, transparent: true, opacity: 0.6 });
            for (var cli = 0; cli < 8; cli++) {
              var cg2 = new T.Group();
              var puffCount = 3 + (cli % 3);
              for (var pi = 0; pi < puffCount; pi++) {
                var puffR = 2 + Math.random() * 3;
                var puffGeo = new T.SphereGeometry(puffR, 8, 6);
                var puff = new T.Mesh(puffGeo, cloudMat);
                puff.position.set(pi * 3 - puffCount, Math.random() * 1.5, Math.random() * 2 - 1);
                puff.scale.y = 0.4;
                cg2.add(puff);
              }
              cg2.position.set(
                (cli * 37 - 100) % 200 - 100,
                25 + Math.random() * 10,
                (cli * 53 - 80) % 160 - 80
              );
              cg2._drift = 0.3 + Math.random() * 0.5;
              cloudGroup.add(cg2);
            }
          }
          scene.add(cloudGroup);

          // ── Sun sphere ──
          if (isDawn) {
            // Dawn: huge low orange sun
            var dawnSunGeo = new T.SphereGeometry(8, 16, 16);
            var dawnSunMat = new T.MeshBasicMaterial({ color: 0xff6633 });
            var dawnSun = new T.Mesh(dawnSunGeo, dawnSunMat);
            dawnSun.position.set(80, 6, -15);
            scene.add(dawnSun);
            var dawnGlowGeo = new T.SphereGeometry(14, 16, 16);
            var dawnGlowMat = new T.MeshBasicMaterial({ color: 0xff9955, transparent: true, opacity: 0.12 });
            var dawnGlow = new T.Mesh(dawnGlowGeo, dawnGlowMat);
            dawnGlow.position.copy(dawnSun.position);
            scene.add(dawnGlow);
            // Horizon glow band
            var horizGeo = new T.PlaneGeometry(300, 8);
            var horizMat = new T.MeshBasicMaterial({ color: 0xff7744, transparent: true, opacity: 0.15, side: T.DoubleSide });
            var horiz = new T.Mesh(horizGeo, horizMat);
            horiz.position.set(0, 3, -60);
            scene.add(horiz);
          } else if (!isNight && !isFog && !isRain) {
            // Normal daytime sun
            var sunGeo = new T.SphereGeometry(3, 16, 16);
            var sunMat = new T.MeshBasicMaterial({ color: 0xfde047 });
            var sunSphere = new T.Mesh(sunGeo, sunMat);
            sunSphere.position.set(30, 40, 15);
            scene.add(sunSphere);
            var glowGeo = new T.SphereGeometry(5, 16, 16);
            var glowMat = new T.MeshBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.15 });
            var sunGlow = new T.Mesh(glowGeo, glowMat);
            sunGlow.position.copy(sunSphere.position);
            scene.add(sunGlow);
          }

          // ── Road surface detail: darker patches for wear + manhole covers ──
          var patchMat = new T.MeshLambertMaterial({ color: isSnow ? 0x7a8490 : 0x282c32 });
          for (var rpi = 0; rpi < 15; rpi++) {
            var rpx = centerX - MAP_SIZE / 2 + (Math.random() - 0.5) * 5;
            var rpz = (Math.random() - 0.5) * MAP_SIZE * 1.5;
            var rpGeo = new T.PlaneGeometry(0.6 + Math.random() * 0.8, 0.4 + Math.random() * 0.6);
            var rpMesh = new T.Mesh(rpGeo, patchMat);
            rpMesh.rotation.x = -Math.PI / 2;
            rpMesh.rotation.z = Math.random() * Math.PI;
            rpMesh.position.set(rpx, 0.013, rpz);
            scene.add(rpMesh);
          }
          // Manhole covers
          var manholeMat = new T.MeshLambertMaterial({ color: 0x3a3a3a });
          for (var mhi = 0; mhi < 4; mhi++) {
            var mhGeo = new T.CylinderGeometry(0.25, 0.25, 0.02, 12);
            var mh = new T.Mesh(mhGeo, manholeMat);
            mh.position.set(centerX - MAP_SIZE / 2 + (mhi % 2 === 0 ? -1.5 : 1.5), 0.02, -MAP_SIZE / 2 + 12 + mhi * 16);
            scene.add(mh);
          }

          // ── Road cracks (thin dark lines for realism) ──
          var crackMat = new T.MeshBasicMaterial({ color: 0x1a1a1e });
          for (var cki = 0; cki < 20; cki++) {
            var ckx = centerX - MAP_SIZE / 2 + (Math.random() - 0.5) * 6;
            var ckz = (Math.random() - 0.5) * MAP_SIZE * 1.5;
            var ckLen = 0.3 + Math.random() * 1.5;
            var ckAng = Math.random() * Math.PI;
            var ckGeo = new T.PlaneGeometry(0.02, ckLen);
            var ck = new T.Mesh(ckGeo, crackMat);
            ck.rotation.x = -Math.PI / 2;
            ck.rotation.z = ckAng;
            ck.position.set(ckx, 0.014, ckz);
            scene.add(ck);
          }

          // ── Parking lot striping (suburban only) ──
          if (currentScenario.id === 'suburban') {
            var stripeMat3 = new T.MeshBasicMaterial({ color: 0xffffff });
            for (var psi = 0; psi < 8; psi++) {
              var psGeo = new T.PlaneGeometry(0.06, 1.8);
              var ps = new T.Mesh(psGeo, stripeMat3);
              ps.rotation.x = -Math.PI / 2;
              ps.position.set(centerX - MAP_SIZE / 2 + 9 + psi * 0.9, 0.015, 38 - MAP_SIZE / 2);
              scene.add(ps);
            }
            // "P" parking sign
            var parkSignTex = makeSignTexture([
              { text: 'P', font: 'bold 80px Arial', y: 110 }
            ], '#2563eb', '#ffffff', 128, 128);
            var parkSignMat = new T.MeshBasicMaterial({ map: parkSignTex });
            var parkSignGeo = new T.PlaneGeometry(0.5, 0.5);
            var parkSign = new T.Mesh(parkSignGeo, parkSignMat);
            parkSign.position.set(centerX - MAP_SIZE / 2 + 8, 2.2, 34 - MAP_SIZE / 2);
            parkSign.rotation.y = -Math.PI / 2;
            scene.add(parkSign);
            // Parking sign post
            var ppGeo = new T.CylinderGeometry(0.04, 0.04, 2, 6);
            var pp = new T.Mesh(ppGeo, signPostMat);
            pp.position.set(centerX - MAP_SIZE / 2 + 8, 1, 34 - MAP_SIZE / 2);
            scene.add(pp);
          }

          // ── Stop lines (thick white bar before each stop sign / red light) ──
          var stopLineMat = new T.MeshBasicMaterial({ color: 0xffffff });
          signalsRef.current.forEach(function(sig) {
            var slGeo = new T.PlaneGeometry(6, 0.25);
            var sl = new T.Mesh(slGeo, stopLineMat);
            sl.rotation.x = -Math.PI / 2;
            sl.position.set(centerX - MAP_SIZE / 2, 0.021, sig.y - MAP_SIZE / 2 - 3.5);
            scene.add(sl);
          });

          // ── Buildings from map (with rooftops + driveways) ──
          var buildingMeshes = [];
          var buildColors = [0xb08c64, 0xa09078, 0x8c7a62, 0x9e8878, 0xc0a888];
          var roofColors = [0x7c3a1a, 0x5a3a2a, 0x444444, 0x6a4a3a, 0x8b5a3a];
          var drivewayMat = new T.MeshLambertMaterial({ color: isSnow ? 0x909aa4 : 0x4a4a4a });
          if (map) {
            for (var by = 0; by < MAP_SIZE; by++) {
              for (var bx = 0; bx < MAP_SIZE; bx++) {
                if (map[by][bx] === 1) {
                  var bH = 3 + ((bx * 37 + by * 73) % 5);
                  var bGeo = new T.BoxGeometry(1, bH, 1);
                  var bCol = buildColors[(bx * 31 + by * 17) % buildColors.length];
                  var bMat = new T.MeshLambertMaterial({ color: bCol });
                  var bMesh = new T.Mesh(bGeo, bMat);
                  bMesh.position.set(bx - MAP_SIZE / 2, bH / 2, by - MAP_SIZE / 2);
                  bMesh.castShadow = true; bMesh.receiveShadow = true;
                  scene.add(bMesh);
                  buildingMeshes.push(bMesh);
                  // Windows
                  if (bH > 3) {
                    var winGeo = new T.PlaneGeometry(0.7, 0.5);
                    var winMat = new T.MeshBasicMaterial({ color: isNight ? 0xffeebb : 0x1a2030, transparent: true, opacity: isNight ? 0.7 : 0.6 });
                    for (var wf = 0; wf < 4; wf++) {
                      for (var wy = 1.5; wy < bH - 1; wy += 2) {
                        var win = new T.Mesh(winGeo, winMat);
                        var wAngle = wf * Math.PI / 2;
                        win.position.set(
                          bx - MAP_SIZE / 2 + Math.cos(wAngle) * 0.51,
                          wy,
                          by - MAP_SIZE / 2 + Math.sin(wAngle) * 0.51
                        );
                        win.rotation.y = wAngle;
                        scene.add(win);
                      }
                    }
                  }
                  // Rooftop (slightly wider overhang)
                  var roofCol = roofColors[(bx * 13 + by * 29) % roofColors.length];
                  var roofBGeo = new T.BoxGeometry(1.12, 0.12, 1.12);
                  var roofBMat = new T.MeshLambertMaterial({ color: roofCol });
                  var roofB = new T.Mesh(roofBGeo, roofBMat);
                  roofB.position.set(bx - MAP_SIZE / 2, bH + 0.06, by - MAP_SIZE / 2);
                  scene.add(roofB);
                  // Pitched roof on shorter buildings (houses)
                  if ((bx + by) % 3 === 0 && bH < 6) {
                    var pitchGeo = new T.ConeGeometry(0.78, 1.2, 4);
                    var pitchMesh = new T.Mesh(pitchGeo, roofBMat);
                    pitchMesh.position.set(bx - MAP_SIZE / 2, bH + 0.72, by - MAP_SIZE / 2);
                    pitchMesh.rotation.y = Math.PI / 4;
                    pitchMesh.castShadow = true;
                    scene.add(pitchMesh);
                  }
                  // Driveway connecting building to road
                  var distToRoad = Math.abs(bx - centerX);
                  if (distToRoad < 8 && distToRoad > 4 && (bx + by) % 4 === 0) {
                    var dwLen = distToRoad - 3.8;
                    var dwDir = bx < centerX ? 1 : -1;
                    var dwGeo = new T.PlaneGeometry(dwLen, 0.8);
                    var dw = new T.Mesh(dwGeo, drivewayMat);
                    dw.rotation.x = -Math.PI / 2;
                    dw.position.set(bx - MAP_SIZE / 2 + dwDir * dwLen / 2, 0.013, by - MAP_SIZE / 2);
                    dw.receiveShadow = true;
                    scene.add(dw);
                  }
                }
              }
            }
          }

          // ── Trees from map (pine + deciduous mix + bushes) ──
          if (map) {
            var treeTrunkMat = new T.MeshLambertMaterial({ color: 0x5c3a1e });
            var pineLeafMat = new T.MeshLambertMaterial({ color: isSnow ? 0xc8d0d8 : 0x1a5c1a });
            var decidLeafMat = new T.MeshLambertMaterial({ color: isSnow ? 0xd4dce4 : 0x3a8a2a });
            var autumnLeafMat = new T.MeshLambertMaterial({ color: isSnow ? 0xd0d4d8 : 0xc87020 });
            var bushMat = new T.MeshLambertMaterial({ color: isSnow ? 0xb8c0c8 : 0x2a6a22 });
            for (var ty = 0; ty < MAP_SIZE; ty++) {
              for (var tx = 0; tx < MAP_SIZE; tx++) {
                if (map[ty][tx] === 5) {
                  var treeHash = (tx * 47 + ty * 83) % 7;
                  var tH = 2 + (treeHash % 3);
                  var tPosX = tx - MAP_SIZE / 2;
                  var tPosZ = ty - MAP_SIZE / 2;
                  // Trunk
                  var trunkGeo = new T.CylinderGeometry(0.1, 0.16, tH * 0.5, 6);
                  var trunk = new T.Mesh(trunkGeo, treeTrunkMat);
                  trunk.position.set(tPosX, tH * 0.25, tPosZ);
                  trunk.castShadow = true;
                  scene.add(trunk);
                  if (treeHash < 3) {
                    // Pine tree: tiered cones (Maine classic)
                    var tiers = 2 + (treeHash % 2);
                    for (var tier = 0; tier < tiers; tier++) {
                      var tierR = (0.9 - tier * 0.15) + ((tx + ty) % 3) * 0.1;
                      var tierH = tH * 0.35;
                      var tierGeo = new T.ConeGeometry(tierR, tierH, 7);
                      var tierMesh = new T.Mesh(tierGeo, pineLeafMat);
                      tierMesh.position.set(tPosX, tH * 0.4 + tier * tierH * 0.6, tPosZ);
                      tierMesh.castShadow = true;
                      scene.add(tierMesh);
                    }
                  } else if (treeHash < 5) {
                    // Deciduous tree: sphere canopy
                    var canopyR = 0.7 + ((tx * 13 + ty * 7) % 4) * 0.15;
                    var canopyGeo = new T.SphereGeometry(canopyR, 8, 6);
                    var canopyMesh = new T.Mesh(canopyGeo, (tx + ty) % 5 === 0 ? autumnLeafMat : decidLeafMat);
                    canopyMesh.position.set(tPosX, tH * 0.55 + canopyR * 0.6, tPosZ);
                    canopyMesh.castShadow = true;
                    scene.add(canopyMesh);
                  } else {
                    // Bush (low, round, no trunk visible)
                    var bushR = 0.4 + ((tx * 29 + ty * 11) % 3) * 0.1;
                    var bushGeo = new T.SphereGeometry(bushR, 8, 6);
                    var bushMesh = new T.Mesh(bushGeo, bushMat);
                    bushMesh.position.set(tPosX, bushR * 0.7, tPosZ);
                    bushMesh.castShadow = true;
                    scene.add(bushMesh);
                  }
                }
              }
            }
            // Hedges along sidewalks (residential/suburban)
            if (currentScenario.id === 'residential' || currentScenario.id === 'suburban' || currentScenario.id === 'school_zone') {
              for (var hi = -MAP_SIZE + 2; hi < MAP_SIZE; hi += 3) {
                if ((hi + MAP_SIZE) % 6 < 3) continue; // gaps for driveways
                [-5.8, 5.8].forEach(function(hOff) {
                  var hedgeGeo = new T.BoxGeometry(0.4, 0.5, 2.5);
                  var hedge = new T.Mesh(hedgeGeo, bushMat);
                  hedge.position.set(centerX - MAP_SIZE / 2 + hOff, 0.25, hi);
                  hedge.castShadow = true;
                  scene.add(hedge);
                });
              }
            }
          }

          // ── Traffic light + stop sign meshes ──
          // Traffic lights are overhead-mounted on arms extending from roadside poles (US style)
          var signalObjs = [];
          var sigPoleMat = new T.MeshLambertMaterial({ color: 0x555555 });
          signalsRef.current.forEach(function(s) {
            var sx = s.x - MAP_SIZE / 2;
            var sz = s.y - MAP_SIZE / 2;
            if (s.type === 'stop') {
              // Stop sign: on a post at the right roadside
              var poleGeo = new T.CylinderGeometry(0.04, 0.04, 2.5, 6);
              var pole = new T.Mesh(poleGeo, sigPoleMat);
              pole.position.set(sx + 4.0, 1.25, sz);
              scene.add(pole);
              var signMat = new T.MeshBasicMaterial({ color: 0xdc2626 });
              var signGeo = new T.CylinderGeometry(0.35, 0.35, 0.05, 8);
              var signMesh = new T.Mesh(signGeo, signMat);
              signMesh.position.set(sx + 4.0, 2.4, sz);
              scene.add(signMesh);
              signalObjs.push({ ref: s, mesh: signMesh, type: 'stop' });
            } else {
              // Overhead traffic light: pole on right side + horizontal arm + hanging light box
              // Vertical pole (on right sidewalk)
              var vPoleGeo = new T.CylinderGeometry(0.08, 0.1, 4.5, 8);
              var vPole = new T.Mesh(vPoleGeo, sigPoleMat);
              vPole.position.set(sx + 4.5, 2.25, sz);
              scene.add(vPole);
              // Horizontal arm extending over the road (lowered for cockpit visibility)
              var armGeo = new T.CylinderGeometry(0.05, 0.05, 5.0, 6);
              var arm = new T.Mesh(armGeo, sigPoleMat);
              arm.position.set(sx + 2.0, 4.2, sz);
              arm.rotation.z = Math.PI / 2; // horizontal
              scene.add(arm);
              // Light housing — hanging from the arm over the road
              var housingMat = new T.MeshLambertMaterial({ color: 0x1a1a2e });
              var housingGeo = new T.BoxGeometry(0.35, 0.9, 0.25);
              var housing = new T.Mesh(housingGeo, housingMat);
              housing.position.set(sx, 3.7, sz);
              scene.add(housing);
              // Three lamp spheres (red top, yellow middle, green bottom)
              var lampColors = [0xef4444, 0xfbbf24, 0x22c55e];
              var lamps = [];
              lampColors.forEach(function(lc, li) {
                var lMat = new T.MeshBasicMaterial({ color: 0x111111 });
                var lGeo = new T.SphereGeometry(0.09, 8, 8);
                var lMesh = new T.Mesh(lGeo, lMat);
                lMesh.position.set(sx, 3.95 - li * 0.28, sz + 0.14);
                scene.add(lMesh);
                lamps.push({ mesh: lMesh, onColor: lc });
              });
              // Also add a second light housing on the other side for cross-street visibility
              var housing2 = new T.Mesh(housingGeo.clone(), housingMat);
              housing2.position.set(sx, 3.7, sz - 0.5);
              housing2.rotation.y = Math.PI; // face opposite direction
              scene.add(housing2);
              signalObjs.push({ ref: s, lamps: lamps, type: 'light' });
            }
          });

          // ── Dynamic object groups (updated each frame) ──
          var trafficGroup = new T.Group(); scene.add(trafficGroup);
          var pedGroup = new T.Group(); scene.add(pedGroup);
          var cyclistGroup = new T.Group(); scene.add(cyclistGroup);
          var wildlifeGroup = new T.Group(); scene.add(wildlifeGroup);
          var emergencyGroup = new T.Group(); scene.add(emergencyGroup);

          // ── Player car (visible in chase mode) — detailed low-poly ──
          var playerCarGroup = new T.Group();
          // Main body
          var bodyMat = new T.MeshLambertMaterial({ color: 0x22d3ee });
          var bodyGeo = new T.BoxGeometry(1.9, 0.6, 0.95);
          var body = new T.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.55;
          body.castShadow = true;
          playerCarGroup.add(body);
          // Hood (sloped front)
          var hoodGeo = new T.BoxGeometry(0.5, 0.15, 0.9);
          var hoodMat = new T.MeshLambertMaterial({ color: 0x1ebbd4 });
          var hood = new T.Mesh(hoodGeo, hoodMat);
          hood.position.set(0.8, 0.78, 0);
          hood.rotation.z = -0.15;
          playerCarGroup.add(hood);
          // Trunk (rear)
          var trunkGeo = new T.BoxGeometry(0.4, 0.12, 0.88);
          var trunk = new T.Mesh(trunkGeo, hoodMat);
          trunk.position.set(-0.75, 0.78, 0);
          playerCarGroup.add(trunk);
          // Roof / cabin
          var roofGeo = new T.BoxGeometry(0.95, 0.42, 0.82);
          var roofMat = new T.MeshLambertMaterial({ color: 0x1ca8c4 });
          var roofMesh = new T.Mesh(roofGeo, roofMat);
          roofMesh.position.set(-0.1, 0.97, 0);
          playerCarGroup.add(roofMesh);
          // Glass material — tinted, semi-transparent, both sides visible
          var glassMat = new T.MeshPhysicalMaterial ? new T.MeshPhysicalMaterial({
            color: 0x88bbdd, transparent: true, opacity: 0.35,
            roughness: 0.1, metalness: 0.1, side: T.DoubleSide
          }) : new T.MeshBasicMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.35, side: T.DoubleSide });
          // Windshield (angled, box-like for thickness)
          var wsGeo = new T.BoxGeometry(0.03, 0.34, 0.78);
          var ws = new T.Mesh(wsGeo, glassMat);
          ws.position.set(0.4, 0.92, 0);
          ws.rotation.z = -0.25; // slight rake angle
          playerCarGroup.add(ws);
          // Rear windshield
          var rwsGeo = new T.BoxGeometry(0.03, 0.3, 0.72);
          var rws = new T.Mesh(rwsGeo, glassMat);
          rws.position.set(-0.55, 0.9, 0);
          rws.rotation.z = 0.2;
          playerCarGroup.add(rws);
          // Side windows (left + right) — properly inset into the body
          var sideWinGeo = new T.BoxGeometry(0.55, 0.24, 0.02);
          var sideWinL = new T.Mesh(sideWinGeo, glassMat);
          sideWinL.position.set(-0.08, 0.93, 0.44);
          playerCarGroup.add(sideWinL);
          var sideWinR = new T.Mesh(sideWinGeo, glassMat);
          sideWinR.position.set(-0.08, 0.93, -0.44);
          playerCarGroup.add(sideWinR);
          // Front bumper
          var bumperGeo = new T.BoxGeometry(0.1, 0.2, 0.98);
          var bumperMat = new T.MeshLambertMaterial({ color: 0x1a1a2e });
          var fBumper = new T.Mesh(bumperGeo, bumperMat);
          fBumper.position.set(0.98, 0.38, 0);
          playerCarGroup.add(fBumper);
          // Rear bumper
          var rBumper = new T.Mesh(bumperGeo, bumperMat);
          rBumper.position.set(-0.98, 0.38, 0);
          playerCarGroup.add(rBumper);
          // Grille
          var grilleGeo = new T.PlaneGeometry(0.2, 0.5);
          var grilleMat = new T.MeshBasicMaterial({ color: 0x0f172a });
          var grille = new T.Mesh(grilleGeo, grilleMat);
          grille.position.set(1.0, 0.52, 0); grille.rotation.y = Math.PI / 2;
          playerCarGroup.add(grille);
          // Side mirrors
          var mirGeo = new T.BoxGeometry(0.12, 0.08, 0.06);
          var mirMat = new T.MeshLambertMaterial({ color: 0x22d3ee });
          var mirL = new T.Mesh(mirGeo, mirMat);
          mirL.position.set(0.25, 0.85, 0.52);
          playerCarGroup.add(mirL);
          var mirR = new T.Mesh(mirGeo, mirMat);
          mirR.position.set(0.25, 0.85, -0.52);
          playerCarGroup.add(mirR);
          // Wheels
          var wheelMat = new T.MeshLambertMaterial({ color: 0x111111 });
          [[-0.55, 0.2, 0.5], [-0.55, 0.2, -0.5], [0.55, 0.2, 0.5], [0.55, 0.2, -0.5]].forEach(function(pos) {
            var wGeo = new T.CylinderGeometry(0.2, 0.2, 0.15, 12);
            var wMesh = new T.Mesh(wGeo, wheelMat);
            wMesh.rotation.x = Math.PI / 2;
            wMesh.position.set(pos[0], pos[1], pos[2]);
            playerCarGroup.add(wMesh);
          });
          // Headlights
          var hlMat = new T.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: isNight ? 0.9 : 0.3 });
          [-0.3, 0.3].forEach(function(z) {
            var hlGeo = new T.SphereGeometry(0.06, 6, 6);
            var hl = new T.Mesh(hlGeo, hlMat);
            hl.position.set(0.92, 0.55, z);
            playerCarGroup.add(hl);
          });
          // Headlight spotlights (at night)
          var headlightL = null, headlightR = null;
          if (isNight) {
            headlightL = new T.SpotLight(0xfff5cc, 1.5, 30, Math.PI / 6, 0.5, 1);
            headlightL.position.set(0.95, 0.55, -0.3);
            headlightL.target.position.set(10, 0, -0.3);
            playerCarGroup.add(headlightL);
            playerCarGroup.add(headlightL.target);
            headlightR = new T.SpotLight(0xfff5cc, 1.5, 30, Math.PI / 6, 0.5, 1);
            headlightR.position.set(0.95, 0.55, 0.3);
            headlightR.target.position.set(10, 0, 0.3);
            playerCarGroup.add(headlightR);
            playerCarGroup.add(headlightR.target);
          }
          // Visible headlight beam cones — a stretched cone per headlight with
          // additive blending. Shows up best at night + fog; hidden by day.
          if (isNight || isFog || isRain) {
            var beamColor = isFog ? 0xf0e0a0 : 0xfff5cc;
            var beamOpacity = isFog ? 0.18 : isRain ? 0.10 : 0.14;
            var beamMat = new T.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: beamOpacity, blending: T.AdditiveBlending, depthWrite: false, fog: false });
            // Cone geometry opens along +Y by default; we'll aim it along +X.
            var beamGeo = new T.ConeGeometry(1.8, 9, 12, 1, true);
            [-0.3, 0.3].forEach(function(zOff) {
              var beam = new T.Mesh(beamGeo, beamMat);
              beam.rotation.z = -Math.PI / 2; // point along +X
              beam.position.set(0.95 + 4.5, 0.5, zOff);
              playerCarGroup.add(beam);
            });
          }
          // Brake lights
          var brakeMat = new T.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
          var brakeL = new T.Mesh(new T.SphereGeometry(0.06, 6, 6), brakeMat);
          brakeL.position.set(-0.92, 0.55, -0.3);
          playerCarGroup.add(brakeL);
          var brakeR = new T.Mesh(new T.SphereGeometry(0.06, 6, 6), brakeMat);
          brakeR.position.set(-0.92, 0.55, 0.3);
          playerCarGroup.add(brakeR);

          scene.add(playerCarGroup);

          // ── 3D Dashboard (attached to camera, visible in cockpit) ──
          var dashGroup = new T.Group();
          // Dashboard panel (dark surface)
          var dashPanelGeo = new T.BoxGeometry(1.6, 0.35, 0.04);
          var dashPanelMat = new T.MeshLambertMaterial({ color: 0x1a1a2e });
          var dashPanel = new T.Mesh(dashPanelGeo, dashPanelMat);
          dashPanel.position.set(0, -0.38, -0.7);
          dashGroup.add(dashPanel);
          // Speedometer gauge face with mph numbers (canvas-textured)
          var gaugeMaxMph = Math.max(80, currentScenario.speedLimit + 30);
          var gaugeFaceCanvas = document.createElement('canvas');
          gaugeFaceCanvas.width = 256; gaugeFaceCanvas.height = 256;
          var gCtx = gaugeFaceCanvas.getContext('2d');
          // Dark background
          gCtx.fillStyle = '#0a0a14';
          gCtx.beginPath(); gCtx.arc(128, 128, 120, 0, Math.PI * 2); gCtx.fill();
          // Outer ring
          gCtx.strokeStyle = '#334155'; gCtx.lineWidth = 4;
          gCtx.beginPath(); gCtx.arc(128, 128, 118, 0, Math.PI * 2); gCtx.stroke();
          // Speed zone arcs (green, yellow, red)
          var limitAngle3d = Math.PI + (currentScenario.speedLimit / gaugeMaxMph) * Math.PI;
          var overAngle3d = Math.PI + (Math.min(gaugeMaxMph, currentScenario.speedLimit + 10) / gaugeMaxMph) * Math.PI;
          gCtx.strokeStyle = '#22c55e'; gCtx.lineWidth = 8;
          gCtx.beginPath(); gCtx.arc(128, 128, 105, Math.PI, limitAngle3d); gCtx.stroke();
          gCtx.strokeStyle = '#f59e0b';
          gCtx.beginPath(); gCtx.arc(128, 128, 105, limitAngle3d, overAngle3d); gCtx.stroke();
          gCtx.strokeStyle = '#ef4444';
          gCtx.beginPath(); gCtx.arc(128, 128, 105, overAngle3d, 2 * Math.PI); gCtx.stroke();
          // Tick marks + numbers
          gCtx.fillStyle = '#94a3b8'; gCtx.font = 'bold 16px monospace'; gCtx.textAlign = 'center'; gCtx.textBaseline = 'middle';
          for (var gti = 0; gti <= gaugeMaxMph; gti += 10) {
            var gAngle = Math.PI + (gti / gaugeMaxMph) * Math.PI;
            var innerR = 90, outerR = 98, numR = 80;
            gCtx.strokeStyle = '#64748b'; gCtx.lineWidth = gti % 20 === 0 ? 3 : 1;
            gCtx.beginPath();
            gCtx.moveTo(128 + Math.cos(gAngle) * innerR, 128 + Math.sin(gAngle) * innerR);
            gCtx.lineTo(128 + Math.cos(gAngle) * outerR, 128 + Math.sin(gAngle) * outerR);
            gCtx.stroke();
            // Numbers every 20 mph
            if (gti % 20 === 0) {
              gCtx.fillStyle = gti > currentScenario.speedLimit + 10 ? '#ef4444' : '#e2e8f0';
              gCtx.fillText(String(gti), 128 + Math.cos(gAngle) * numR, 128 + Math.sin(gAngle) * numR);
            }
          }
          // "MPH" label
          gCtx.fillStyle = '#64748b'; gCtx.font = 'bold 14px system-ui';
          gCtx.fillText('MPH', 128, 155);
          // Center dot
          gCtx.fillStyle = '#ffffff';
          gCtx.beginPath(); gCtx.arc(128, 128, 5, 0, Math.PI * 2); gCtx.fill();
          var gaugeFaceTex = new T.CanvasTexture(gaugeFaceCanvas);
          gaugeFaceTex.minFilter = T.LinearFilter;
          var gaugeFaceMat = new T.MeshBasicMaterial({ map: gaugeFaceTex, transparent: true });
          var gaugeFaceGeo = new T.CircleGeometry(0.12, 32);
          var gaugeFace = new T.Mesh(gaugeFaceGeo, gaugeFaceMat);
          gaugeFace.position.set(-0.25, -0.28, -0.679);
          dashGroup.add(gaugeFace);
          // Speedometer needle (thin red line that rotates)
          var needleGeo = new T.BoxGeometry(0.005, 0.09, 0.002);
          var needleMat = new T.MeshBasicMaterial({ color: 0xff3333 });
          var needleMesh = new T.Mesh(needleGeo, needleMat);
          needleMesh.position.set(-0.25, -0.28, -0.678);
          needleMesh.geometry.translate(0, 0.045, 0); // pivot at bottom
          dashGroup.add(needleMesh);
          // RPM gauge (smaller, right side)
          // RPM gauge materials (separate from speedometer canvas)
          var rpmBgMat = new T.MeshBasicMaterial({ color: 0x0a0a14 });
          var rpmRingMat2 = new T.MeshBasicMaterial({ color: 0x334155, side: T.DoubleSide });
          var rpmBgGeo = new T.CircleGeometry(0.08, 20);
          var rpmBg = new T.Mesh(rpmBgGeo, rpmBgMat);
          rpmBg.position.set(0.25, -0.28, -0.68);
          dashGroup.add(rpmBg);
          var rpmRingGeo = new T.RingGeometry(0.065, 0.08, 20);
          var rpmRing = new T.Mesh(rpmRingGeo, rpmRingMat2);
          rpmRing.position.set(0.25, -0.28, -0.679);
          dashGroup.add(rpmRing);
          var rpmNeedleGeo = new T.BoxGeometry(0.004, 0.06, 0.002);
          var rpmNeedle = new T.Mesh(rpmNeedleGeo, needleMat);
          rpmNeedle.position.set(0.25, -0.28, -0.678);
          rpmNeedle.geometry.translate(0, 0.03, 0);
          dashGroup.add(rpmNeedle);
          // Steering wheel (3D ring)
          var swGeo3d = new T.TorusGeometry(0.18, 0.015, 8, 24);
          var swMat3d = new T.MeshLambertMaterial({ color: 0x333333 });
          var sw3d = new T.Mesh(swGeo3d, swMat3d);
          sw3d.position.set(0, -0.45, -0.55);
          sw3d.rotation.x = -0.35;
          dashGroup.add(sw3d);
          // Steering wheel spokes
          var spokeMat = new T.MeshLambertMaterial({ color: 0x444444 });
          [0, Math.PI * 2 / 3, Math.PI * 4 / 3].forEach(function(ang) {
            var spokeGeo = new T.CylinderGeometry(0.008, 0.008, 0.15, 6);
            var spoke = new T.Mesh(spokeGeo, spokeMat);
            spoke.position.set(
              Math.sin(ang) * 0.08,
              -0.45 + Math.cos(ang) * 0.08,
              -0.55
            );
            spoke.rotation.z = ang;
            spoke.rotation.x = -0.35;
            dashGroup.add(spoke);
          });
          camera.add(dashGroup);
          scene.add(camera); // camera must be in scene for children to render

          // ── Skid tire marks group ──
          var skidMarksGroup = new T.Group();
          scene.add(skidMarksGroup);
          var skidMarkMat = new T.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.6 });

          // ── Turn signal indicator meshes (orange spheres on player car) ──
          var blinkerMeshL = new T.Mesh(new T.SphereGeometry(0.05, 6, 6), new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
          blinkerMeshL.position.set(0.92, 0.42, 0.45);
          playerCarGroup.add(blinkerMeshL);
          var blinkerMeshR = new T.Mesh(new T.SphereGeometry(0.05, 6, 6), new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
          blinkerMeshR.position.set(0.92, 0.42, -0.45);
          playerCarGroup.add(blinkerMeshR);
          // Rear blinkers
          var blinkerMeshRL = new T.Mesh(new T.SphereGeometry(0.05, 6, 6), new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
          blinkerMeshRL.position.set(-0.92, 0.42, 0.45);
          playerCarGroup.add(blinkerMeshRL);
          var blinkerMeshRR = new T.Mesh(new T.SphereGeometry(0.05, 6, 6), new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 }));
          blinkerMeshRR.position.set(-0.92, 0.42, -0.45);
          playerCarGroup.add(blinkerMeshRR);

          // ── Wet road surface overlay (rain makes road shinier) ──
          if (isRain) {
            var wetOverlayGeo = new T.PlaneGeometry(7, MAP_SIZE * 2);
            var wetOverlayMat = new T.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.15 });
            var wetOverlay = new T.Mesh(wetOverlayGeo, wetOverlayMat);
            wetOverlay.rotation.x = -Math.PI / 2;
            wetOverlay.position.set(centerX - MAP_SIZE / 2, 0.018, 0);
            scene.add(wetOverlay);
          }

          // ── Tire spray particle system (rain only, follows player car) ──
          var tireSprayParticles = null;
          if (isRain) {
            var sprayCount = 100;
            var sprayGeo = new T.BufferGeometry();
            var sprayPos = new Float32Array(sprayCount * 3);
            for (var spi = 0; spi < sprayCount; spi++) {
              sprayPos[spi * 3] = 0;
              sprayPos[spi * 3 + 1] = -999;
              sprayPos[spi * 3 + 2] = 0;
            }
            sprayGeo.setAttribute('position', new T.BufferAttribute(sprayPos, 3));
            var sprayMat = new T.PointsMaterial({ color: 0xaaccee, size: 0.06, transparent: true, opacity: 0.4 });
            tireSprayParticles = new T.Points(sprayGeo, sprayMat);
            scene.add(tireSprayParticles);
          }

          // ── Off-road dust particle system (active any time the car is on grass) ──
          // Points float up and fade behind the car; pool is cycled via _dustIdx.
          var dustCount = 80;
          var dustGeo = new T.BufferGeometry();
          var dustPos = new Float32Array(dustCount * 3);
          for (var dsi = 0; dsi < dustCount; dsi++) {
            dustPos[dsi * 3] = 0;
            dustPos[dsi * 3 + 1] = -999;
            dustPos[dsi * 3 + 2] = 0;
          }
          dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
          var dustMat = new T.PointsMaterial({ color: 0xb8a078, size: 0.14, transparent: true, opacity: 0.55, depthWrite: false });
          var dustParticles = new T.Points(dustGeo, dustMat);
          dustParticles.name = 'dust_particles';
          scene.add(dustParticles);

          // ── Rain puddles (reflective patches on road surface) ──
          if (isRain) {
            var puddleMat = new T.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 });
            for (var pdi = 0; pdi < 12; pdi++) {
              var pdx = centerX - MAP_SIZE / 2 + (Math.random() - 0.5) * 5;
              var pdz = (Math.random() - 0.5) * MAP_SIZE * 1.5;
              var pdR = 0.4 + Math.random() * 0.8;
              var pdGeo = new T.CircleGeometry(pdR, 12);
              var pd = new T.Mesh(pdGeo, puddleMat);
              pd.rotation.x = -Math.PI / 2;
              pd.position.set(pdx, 0.016, pdz);
              scene.add(pd);
            }
          }

          // ── Snow drifts on road edges ─��
          if (isSnow) {
            var driftMat = new T.MeshLambertMaterial({ color: 0xe8eef4 });
            for (var sdi = -MAP_SIZE; sdi < MAP_SIZE; sdi += 5) {
              [-3.8, 3.8].forEach(function(off) {
                var driftW = 0.4 + Math.random() * 0.3;
                var driftH = 0.15 + Math.random() * 0.15;
                var driftGeo = new T.BoxGeometry(driftW, driftH, 2 + Math.random() * 2);
                var drift = new T.Mesh(driftGeo, driftMat);
                drift.position.set(centerX - MAP_SIZE / 2 + off, driftH / 2, sdi + Math.random() * 2);
                scene.add(drift);
              });
            }
          }

          // ── Weather particles ──
          var weatherParticles = null;
          if (isRain || isSnow) {
            var pCount = isRain ? 2000 : 800;
            var pGeo = new T.BufferGeometry();
            var positions = new Float32Array(pCount * 3);
            for (var pi = 0; pi < pCount; pi++) {
              positions[pi * 3] = (Math.random() - 0.5) * 60;
              positions[pi * 3 + 1] = Math.random() * 20;
              positions[pi * 3 + 2] = (Math.random() - 0.5) * 60;
            }
            pGeo.setAttribute('position', new T.BufferAttribute(positions, 3));
            var pMat = new T.PointsMaterial({
              color: isRain ? 0xaaccff : 0xffffff,
              size: isRain ? 0.08 : 0.15,
              transparent: true,
              opacity: isRain ? 0.6 : 0.8
            });
            weatherParticles = new T.Points(pGeo, pMat);
            scene.add(weatherParticles);
          }

          return {
            scene: scene, camera: camera, renderer: renderer,
            playerCarGroup: playerCarGroup, signalObjs: signalObjs,
            trafficGroup: trafficGroup, pedGroup: pedGroup,
            cyclistGroup: cyclistGroup, wildlifeGroup: wildlifeGroup,
            emergencyGroup: emergencyGroup,
            brakeMat: brakeMat, headlightL: headlightL, headlightR: headlightR,
            weatherParticles: weatherParticles,
            skidMarksGroup: skidMarksGroup, skidMarkMat: skidMarkMat,
            blinkerMeshL: blinkerMeshL, blinkerMeshR: blinkerMeshR,
            blinkerMeshRL: blinkerMeshRL, blinkerMeshRR: blinkerMeshRR,
            exhaustParticles: exhaustParticles,
            dashboardGroup: dashGroup,
            speedNeedle: needleMesh,
            rpmNeedle: rpmNeedle,
            steeringWheel3d: sw3d,
            gaugeMaxMph: gaugeMaxMph,
            digitalSpeedCanvas: null, // will be created on first update
            digitalSpeedMesh: null,
            cloudGroup: cloudGroup,
            tireSprayParticles: tireSprayParticles,
            dustParticles: dustParticles
          };
        }

        // ── Update Three.js scene each frame ──
        function updateThreeScene(s3) {
          if (!s3) return;
          var T = window.THREE;
          var car = carRef.current;
          var scn = currentScenario;
          var carWorldX = car.x - MAP_SIZE / 2;
          var carWorldZ = car.y - MAP_SIZE / 2;

          // Position player car. Add road elevation so the car rides over hills
          // instead of phasing through them. infiniteWorldRef is null in scenario
          // mode (flat terrain), so the lookup is gated.
          var roadH = (infiniteWorldRef.current && infiniteWorldRef.current.roadHeightAtY)
            ? infiniteWorldRef.current.roadHeightAtY(car.y) : 0;
          s3.playerCarGroup.position.set(carWorldX, roadH + (car._suspY || 0), carWorldZ);
          s3.playerCarGroup.rotation.y = -car.heading;

          // Tire tracks in snow — drop a pair of small dark planes behind the
          // car each "tick". Ring buffer of ~200 tracks to bound memory; oldest
          // recycled as new tracks are dropped. Only in snow weather and while moving.
          if (scn.weather === 'snow' && Math.abs(car.speed) > 2) {
            if (!s3._trackGroup) {
              s3._trackGroup = new T.Group();
              s3._trackGroup.name = 'tire_tracks';
              s3._trackPool = [];
              s3._trackNext = 0;
              s3.scene.add(s3._trackGroup);
            }
            if (!s3._trackTickCooldown) s3._trackTickCooldown = 0;
            s3._trackTickCooldown -= 0.016;
            if (s3._trackTickCooldown <= 0) {
              s3._trackTickCooldown = 0.05; // drop a pair every 50ms
              var trackMat = s3._trackMat || (s3._trackMat = new T.MeshBasicMaterial({ color: 0x7a848e, transparent: true, opacity: 0.55, depthWrite: false }));
              [-0.45, 0.45].forEach(function(off) {
                var tr;
                if (s3._trackPool.length >= 200) {
                  // Recycle oldest
                  tr = s3._trackPool[s3._trackNext];
                  s3._trackNext = (s3._trackNext + 1) % 200;
                } else {
                  tr = new T.Mesh(new T.PlaneGeometry(0.18, 0.4), trackMat);
                  tr.rotation.x = -Math.PI / 2;
                  s3._trackGroup.add(tr);
                  s3._trackPool.push(tr);
                }
                // Place behind the car along its heading axis, offset laterally.
                var tx = carWorldX - Math.cos(car.heading) * 0.8 - Math.sin(-car.heading) * off;
                var tz = carWorldZ - Math.sin(car.heading) * 0.8 - Math.cos(-car.heading) * off;
                tr.position.set(tx, 0.019, tz);
                tr.rotation.z = -car.heading;
              });
            }
          }
          // Skydome + mountain ring follow the car so the infinite world never
          // reaches their edge. Y stays at 0 — only translate horizontally.
          if (!s3._skyRef) s3._skyRef = s3.scene.getObjectByName('skydome');
          if (s3._skyRef) s3._skyRef.position.set(carWorldX, 0, carWorldZ);
          if (!s3._mtnRef) s3._mtnRef = s3.scene.getObjectByName('mountain_ring');
          if (s3._mtnRef) s3._mtnRef.position.set(carWorldX, 0, carWorldZ);
          if (!s3._forestRef) s3._forestRef = s3.scene.getObjectByName('forest_ring');
          if (s3._forestRef) s3._forestRef.position.set(carWorldX, 0, carWorldZ);
          // Weight transfer: body pitch (brake/accel) and roll (turns)
          s3.playerCarGroup.rotation.x = car._pitch || 0;
          s3.playerCarGroup.rotation.z = car._roll || 0;
          // Wheel rotation animation (spin proportional to speed)
          var wheelSpinAngle = timeRef.current * Math.abs(car.speed) * 2;
          s3.playerCarGroup.children.forEach(function(child) {
            // Wheels are CylinderGeometry with rotation.x = PI/2
            if (child.geometry && child.geometry.type === 'CylinderGeometry' && Math.abs(child.rotation.x - Math.PI / 2) < 0.1) {
              child.rotation.y = wheelSpinAngle;
            }
          });

          // Camera follows car
          var camMode = cameraModeRef.current;
          // Dynamic weather update (for Free Explore weather toggle)
          var isNightNow = scn.time === 'night';
          var isFogNow = scn.weather === 'fog';
          var isSnowNow = scn.weather === 'snow';
          var isRainNow = scn.weather === 'rain';
          // Recolor the skydome's vertex gradient to match the current weather.
          // Called only when fog params actually change below so we don't churn
          // vertex buffers every frame.
          var recolorSky = function() {
            var sky = s3._skyRef || s3.scene.getObjectByName('skydome');
            if (!sky || !sky.geometry || !sky.geometry.getAttribute('color')) return;
            var zenith, horizon;
            if (isNightNow) { zenith = new T.Color(0x050a1a); horizon = new T.Color(0x1a2548); }
            else if (isFogNow) { zenith = new T.Color(0xa8b4c2); horizon = new T.Color(0x94a3b8); }
            else if (isSnowNow) { zenith = new T.Color(0xdde3ed); horizon = new T.Color(0xcbd5e1); }
            else if (isRainNow) { zenith = new T.Color(0x334155); horizon = new T.Color(0x64748b); }
            else { zenith = new T.Color(0x4a86d4); horizon = new T.Color(0xcfe4f5); }
            var pos = sky.geometry.getAttribute('position');
            var col = sky.geometry.getAttribute('color');
            for (var vi = 0; vi < pos.count; vi++) {
              var vy = pos.getY(vi);
              var t = Math.max(0, Math.min(1, vy / 180));
              var tt = t * t * (3 - 2 * t);
              col.setXYZ(vi,
                horizon.r + (zenith.r - horizon.r) * tt,
                horizon.g + (zenith.g - horizon.g) * tt,
                horizon.b + (zenith.b - horizon.b) * tt);
            }
            col.needsUpdate = true;
          };
          // Update fog + skydome dynamically.
          if (isFogNow && (!s3.scene.fog || s3.scene.fog.far !== 40)) {
            s3.scene.fog = new T.Fog(0x94a3b8, 5, 40);
            s3.scene.background = new T.Color(0x94a3b8);
            recolorSky();
          } else if (isSnowNow && (!s3.scene.fog || s3.scene.fog.far !== 60)) {
            s3.scene.fog = new T.Fog(0xcbd5e1, 10, 60);
            s3.scene.background = new T.Color(0xcbd5e1);
            recolorSky();
          } else if (isRainNow && (!s3.scene.fog || s3.scene.fog.far !== 50)) {
            s3.scene.fog = new T.Fog(0x475569, 8, 50);
            s3.scene.background = new T.Color(0x475569);
            recolorSky();
          } else if (isNightNow && (!s3.scene.fog || s3.scene.fog.far !== 120)) {
            s3.scene.fog = new T.Fog(0x0a0f1e, 30, 120);
            s3.scene.background = new T.Color(0x0a0f1e);
            recolorSky();
          } else if (!isFogNow && !isSnowNow && !isRainNow && !isNightNow && s3.scene.fog && s3.scene.fog.far !== 120) {
            s3.scene.fog = new T.Fog(0x87ceeb, 30, 120);
            s3.scene.background = new T.Color(0x87ceeb);
            recolorSky();
          }
          // Update ambient light intensity for time-of-day, plus cloud-shadow
          // modulation during clear day (subtle 2-3% dimming as imaginary clouds
          // pass overhead — makes the outdoors feel less static).
          var cloudShadow = (!isNightNow && !isFogNow && !isSnowNow && !isRainNow)
            ? (1 - 0.06 * (0.5 + 0.5 * Math.sin(timeRef.current * 0.12)))
            : 1;
          s3.scene.children.forEach(function(child) {
            if (child.isAmbientLight) {
              var baseInt = isNightNow ? 0.15 : 0.5;
              child.intensity = baseInt * cloudShadow;
              child.color.setHex(isNightNow ? 0x1a1a3a : 0xffffff);
            }
          });

          // Speed-dependent FOV (faster = wider, like real peripheral vision)
          var baseFOV = 65;
          var speedFOV = baseFOV + Math.min(15, Math.abs(car.speed) * 0.8);
          s3.camera.fov = speedFOV;
          s3.camera.updateProjectionMatrix();

          if (camMode === 'cockpit') {
            // Camera bob from road vibration (subtle, speed-dependent)
            var bobAmp = Math.min(0.03, car.speed * 0.002);
            var bobY = Math.sin(timeRef.current * 8) * bobAmp;
            var bobX = Math.sin(timeRef.current * 5.3) * bobAmp * 0.3;
            // Skid shake
            var shakeX = 0, shakeZ = 0;
            if (skidRef.current.active) {
              var si = skidRef.current.intensity * 0.15;
              shakeX = (Math.random() - 0.5) * si;
              shakeZ = (Math.random() - 0.5) * si;
            }
            // Speed-based FOV: tighter at low speed, wider at high speed for immersive "speed feel"
            var speedMphFov = Math.abs(car.speed) * MS_TO_MPH;
            var targetFov = 75 + Math.min(15, speedMphFov * 0.2); // 75° → 90° at 75 mph
            if (s3.camera.fov !== targetFov) {
              s3.camera.fov += (targetFov - s3.camera.fov) * 0.08;
              s3.camera.updateProjectionMatrix();
            }
            // ─── HEAD-CHECK SWIVEL: Z (look left) / X (look right) ───
            // Hold to look, release to return forward. Mimics real driver shoulder-checks.
            var kHold = keysRef.current || {};
            var hc = headCheckRef.current;
            var targetSwivel = 0;
            if (kHold['z']) { targetSwivel = -1.2; hc.dir = -1; hc.lastCheckLeft = timeRef.current; }
            else if (kHold['x']) { targetSwivel = 1.2; hc.dir = 1; hc.lastCheckRight = timeRef.current; }
            else { hc.dir = 0; }
            // Smooth lerp toward target — fast enough to feel responsive, slow enough to feel natural (~0.3s)
            hc.swivel += (targetSwivel - hc.swivel) * 0.25;
            // Smooth look-ahead that anticipates turns (Forza-style)
            var lookAheadBias = Math.sign(car.steering) * Math.min(0.3, Math.abs(car.steering) * 0.5);
            // Combine head swivel with turn look-ahead
            var totalLookOffset = lookAheadBias + hc.swivel;
            var fpTargetX = carWorldX + Math.cos(car.heading) * 0.3 + bobX + shakeX;
            var fpTargetY = 1.1 + bobY;
            var fpTargetZ = carWorldZ + Math.sin(car.heading) * 0.3 + shakeZ;
            // Lerp position for smoother micro-motion
            if (!s3.camera._lastFpX) { s3.camera._lastFpX = fpTargetX; s3.camera._lastFpY = fpTargetY; s3.camera._lastFpZ = fpTargetZ; }
            s3.camera._lastFpX += (fpTargetX - s3.camera._lastFpX) * 0.4;
            s3.camera._lastFpY += (fpTargetY - s3.camera._lastFpY) * 0.3;
            s3.camera._lastFpZ += (fpTargetZ - s3.camera._lastFpZ) * 0.4;
            s3.camera.position.set(s3.camera._lastFpX, s3.camera._lastFpY, s3.camera._lastFpZ);
            s3.camera.lookAt(
              carWorldX + Math.cos(car.heading + totalLookOffset) * 10,
              0.95,
              carWorldZ + Math.sin(car.heading + totalLookOffset) * 10
            );
            s3.playerCarGroup.visible = false;
          } else if (camMode === 'chase') {
            // Smooth chase camera with lerp + speed-based FOV + turn anticipation
            var chaseSpeedMph = Math.abs(car.speed) * MS_TO_MPH;
            var chaseTargetFov = 70 + Math.min(20, chaseSpeedMph * 0.25); // 70° → 90°
            s3.camera.fov += (chaseTargetFov - s3.camera.fov) * 0.05;
            s3.camera.updateProjectionMatrix();
            // Camera lags slightly behind on turns for cinematic feel
            var chaseLagBias = Math.sign(car.steering) * Math.min(0.25, Math.abs(car.steering) * 0.4);
            var chaseBackHeading = car.heading - chaseLagBias;
            var chaseTargetX = carWorldX - Math.cos(chaseBackHeading) * 5.5;
            var chaseTargetZ = carWorldZ - Math.sin(chaseBackHeading) * 5.5;
            var chaseTargetY = 2.8;
            // Lerp current position toward target — more responsive at high speed
            var chaseLerpRate = 0.08 + Math.min(0.05, chaseSpeedMph * 0.0008);
            s3.camera.position.x += (chaseTargetX - s3.camera.position.x) * chaseLerpRate;
            s3.camera.position.y += (chaseTargetY - s3.camera.position.y) * 0.06;
            s3.camera.position.z += (chaseTargetZ - s3.camera.position.z) * chaseLerpRate;
            // Look slightly ahead of the car (farther when going faster)
            var chaseLookAhead = 2 + Math.min(4, chaseSpeedMph * 0.05);
            var lookAheadX = carWorldX + Math.cos(car.heading) * chaseLookAhead;
            var lookAheadZ = carWorldZ + Math.sin(car.heading) * chaseLookAhead;
            s3.camera.lookAt(lookAheadX, 0.6, lookAheadZ);
            s3.playerCarGroup.visible = true;
          } else if (camMode === 'rearview') {
            // Looking backward from driver position
            s3.camera.position.set(
              carWorldX - Math.cos(car.heading) * 0.2,
              1.1,
              carWorldZ - Math.sin(car.heading) * 0.2
            );
            s3.camera.lookAt(
              carWorldX - Math.cos(car.heading) * 10,
              1.0,
              carWorldZ - Math.sin(car.heading) * 10
            );
            s3.playerCarGroup.visible = false;
          } else { // overhead
            s3.camera.position.set(carWorldX, 25, carWorldZ + 0.1);
            s3.camera.lookAt(carWorldX, 0, carWorldZ);
            s3.playerCarGroup.visible = true;
          }

          // Brake lights
          s3.brakeMat.opacity = car.brake > 0 ? 0.9 : 0.15;

          // Reverse lights (white glow when in reverse)
          if (s3.playerCarGroup && s3.playerCarGroup.children) {
            s3.playerCarGroup.children.forEach(function(child) {
              if (child.material && child.material.color && child.material.color.getHex() === 0xffffee) {
                child.material.opacity = scn.time === 'night' ? 0.9 : 0.3;
              }
            });
          }

          // High beam toggle + headlight direction tracking
          if (s3.headlightL && s3.headlightR) {
            var highBeams = d.highBeams;
            var hlDist = highBeams ? 50 : 25;
            var hlAngle = highBeams ? Math.PI / 5 : Math.PI / 6;
            var hlInt = highBeams ? 2.5 : 1.5;
            s3.headlightL.distance = hlDist;
            s3.headlightL.angle = hlAngle;
            s3.headlightL.intensity = hlInt;
            s3.headlightR.distance = hlDist;
            s3.headlightR.angle = hlAngle;
            s3.headlightR.intensity = hlInt;
            // Rotate headlight targets to match car heading (so light follows the road)
            var hlTargetDist = 15;
            s3.headlightL.target.position.set(
              carWorldX + Math.cos(car.heading) * hlTargetDist + Math.sin(car.heading) * 0.3,
              0,
              carWorldZ + Math.sin(car.heading) * hlTargetDist - Math.cos(car.heading) * 0.3
            );
            s3.headlightR.target.position.set(
              carWorldX + Math.cos(car.heading) * hlTargetDist - Math.sin(car.heading) * 0.3,
              0,
              carWorldZ + Math.sin(car.heading) * hlTargetDist + Math.cos(car.heading) * 0.3
            );
          }

          // 3D Dashboard updates
          if (s3.dashboardGroup) {
            s3.dashboardGroup.visible = (camMode === 'cockpit');
            if (camMode === 'cockpit') {
              // Speed needle: rotate from -135° (0 mph) to +135° (max mph)
              var maxGauge = s3.gaugeMaxMph || 80;
              var curSpeedMph = Math.round(Math.abs(car.speed) * MS_TO_MPH);
              var speedFrac = Math.min(1, curSpeedMph / maxGauge);
              s3.speedNeedle.rotation.z = (0.75 - speedFrac * 1.5) * Math.PI;
              // Digital speed readout on dashboard (updated canvas texture)
              if (!s3.digitalSpeedCanvas) {
                s3.digitalSpeedCanvas = document.createElement('canvas');
                s3.digitalSpeedCanvas.width = 128; s3.digitalSpeedCanvas.height = 48;
                var dsTex = new window.THREE.CanvasTexture(s3.digitalSpeedCanvas);
                dsTex.minFilter = window.THREE.LinearFilter;
                var dsMat = new window.THREE.MeshBasicMaterial({ map: dsTex, transparent: true });
                var dsGeo = new window.THREE.PlaneGeometry(0.08, 0.03);
                s3.digitalSpeedMesh = new window.THREE.Mesh(dsGeo, dsMat);
                s3.digitalSpeedMesh.position.set(-0.25, -0.33, -0.677);
                s3.dashboardGroup.add(s3.digitalSpeedMesh);
              }
              // Update the digital readout every few frames
              if (Math.floor(timeRef.current * 10) % 3 === 0) {
                var dsCtx = s3.digitalSpeedCanvas.getContext('2d');
                dsCtx.fillStyle = '#000'; dsCtx.fillRect(0, 0, 128, 48);
                dsCtx.fillStyle = curSpeedMph > currentScenario.speedLimit + 5 ? '#ef4444' : '#4ade80';
                dsCtx.font = 'bold 32px monospace'; dsCtx.textAlign = 'center';
                dsCtx.fillText(curSpeedMph, 64, 36);
                s3.digitalSpeedMesh.material.map.needsUpdate = true;
              }
              // RPM needle: approximate from speed + throttle
              var rpmFrac = Math.min(1, (car.speed * 0.05 + car.throttle * 0.3));
              s3.rpmNeedle.rotation.z = (0.75 - rpmFrac * 1.5) * Math.PI;
              // Steering wheel rotation
              s3.steeringWheel3d.rotation.z = -car.steering * 1.5;
            }
          }

          // Turn signal blinkers (3D orange spheres on car)
          var blinkOn = Math.floor(blinkerTimerRef.current * 2.5) % 2 === 0;
          var bDir = blinkerRef.current;
          s3.blinkerMeshL.material.opacity = (bDir === -1 && blinkOn) ? 0.9 : 0;
          s3.blinkerMeshR.material.opacity = (bDir === 1 && blinkOn) ? 0.9 : 0;
          s3.blinkerMeshRL.material.opacity = (bDir === -1 && blinkOn) ? 0.9 : 0;
          s3.blinkerMeshRR.material.opacity = (bDir === 1 && blinkOn) ? 0.9 : 0;

          // Skid tire marks — drop dark plane strips when skidding
          if (skidRef.current.active && car.speed > 4) {
            var T2 = window.THREE;
            var markGeo = new T2.PlaneGeometry(0.08, 0.5);
            var mark = new T2.Mesh(markGeo, s3.skidMarkMat);
            mark.rotation.x = -Math.PI / 2;
            mark.rotation.z = -car.heading + Math.PI / 2;
            mark.position.set(carWorldX, 0.015, carWorldZ);
            s3.skidMarksGroup.add(mark);
            // Cap at 200 marks, remove oldest
            while (s3.skidMarksGroup.children.length > 200) {
              var oldMark = s3.skidMarksGroup.children[0];
              if (oldMark.geometry) oldMark.geometry.dispose();
              s3.skidMarksGroup.remove(oldMark);
            }
          }

          // Update traffic signals
          s3.signalObjs.forEach(function(so) {
            if (so.type === 'light' && so.lamps) {
              so.lamps.forEach(function(lamp, li) {
                var on = (li === 0 && so.ref.state === 'red') || (li === 1 && so.ref.state === 'yellow') || (li === 2 && so.ref.state === 'green');
                lamp.mesh.material.color.setHex(on ? lamp.onColor : 0x111111);
              });
            }
          });

          // Update traffic vehicles (low-poly car groups)
          var tGroup = s3.trafficGroup;
          while (tGroup.children.length > trafficRef.current.length) tGroup.remove(tGroup.children[tGroup.children.length - 1]);
          trafficRef.current.forEach(function(t, ti) {
            var m;
            if (ti < tGroup.children.length) {
              m = tGroup.children[ti];
            } else {
              // Build a proper low-poly vehicle group
              var cg = new T.Group();
              var isTruck = t.type === 'truck' || t.type === 'pickup';
              var isVan = t.type === 'van';
              var isBus = t.type === 'schoolbus';
              var isSUV = t.type === 'suv';
              var bLen = isBus ? 3.5 : isTruck ? 2.4 : isVan ? 2.2 : isSUV ? 2.0 : 1.7;
              var bH = isBus ? 1.4 : isTruck ? 0.8 : isVan ? 1.1 : isSUV ? 0.7 : 0.55;
              var tCol = new T.Color(t.color).getHex();
              // Body
              var bGeo = new T.BoxGeometry(bLen, bH, 0.85);
              var bMat = new T.MeshLambertMaterial({ color: tCol });
              var bdy = new T.Mesh(bGeo, bMat);
              bdy.position.y = bH / 2 + 0.2;
              bdy.castShadow = true;
              cg.add(bdy);
              // Roof / cabin
              if (isBus) {
                // School bus: tall yellow box with black stripe
                var busRoofGeo = new T.BoxGeometry(bLen * 0.9, 0.15, 0.95);
                var busRoofMat = new T.MeshLambertMaterial({ color: tCol });
                var busRoof = new T.Mesh(busRoofGeo, busRoofMat);
                busRoof.position.set(0, bH + 0.28, 0);
                cg.add(busRoof);
                // Black stripe
                var stripeMat2 = new T.MeshBasicMaterial({ color: 0x111111 });
                var stripeGeo2 = new T.BoxGeometry(bLen * 0.85, 0.04, 0.97);
                var stripe2 = new T.Mesh(stripeGeo2, stripeMat2);
                stripe2.position.set(0, bH * 0.55 + 0.2, 0);
                cg.add(stripe2);
                // Stop arm hint (red rectangle on side)
                var stopArmMat = new T.MeshBasicMaterial({ color: 0xff0000 });
                var stopArmGeo = new T.BoxGeometry(0.3, 0.08, 0.01);
                var stopArm = new T.Mesh(stopArmGeo, stopArmMat);
                stopArm.position.set(-bLen * 0.15, bH * 0.6 + 0.2, 0.51);
                cg.add(stopArm);
              } else if (isVan) {
                // Van: tall boxy roof
                var vanRoofGeo = new T.BoxGeometry(bLen * 0.75, 0.5, 0.88);
                var vanRoofMat = new T.MeshLambertMaterial({ color: tCol });
                var vanRoof = new T.Mesh(vanRoofGeo, vanRoofMat);
                vanRoof.position.set(-bLen * 0.08, bH + 0.45, 0);
                cg.add(vanRoof);
              } else if (!isTruck) {
                // Car / SUV: normal cabin
                var cabH = isSUV ? 0.45 : 0.35;
                var rGeo = new T.BoxGeometry(bLen * 0.5, cabH, 0.78);
                var rMat = new T.MeshLambertMaterial({ color: tCol });
                var roof = new T.Mesh(rGeo, rMat);
                roof.position.set(-bLen * 0.05, bH + cabH / 2 + 0.18, 0);
                cg.add(roof);
              }
              // Windshield + rear window (all types except bus) — improved glass
              if (!isBus) {
                var tGlassMat = new T.MeshBasicMaterial({ color: 0x4488aa, transparent: true, opacity: 0.4, side: T.DoubleSide });
                // Front windshield (thin box for thickness)
                var fwGeo = new T.BoxGeometry(0.02, isVan ? 0.45 : 0.3, 0.72);
                var fw = new T.Mesh(fwGeo, tGlassMat);
                fw.position.set(bLen * 0.22, bH + 0.18, 0);
                fw.rotation.z = isVan ? -0.05 : -0.2;
                cg.add(fw);
                if (!isVan) {
                  // Rear windshield
                  var rwGeo = new T.BoxGeometry(0.02, 0.25, 0.68);
                  var rw = new T.Mesh(rwGeo, tGlassMat);
                  rw.position.set(-bLen * 0.28, bH + 0.18, 0);
                  rw.rotation.z = 0.15;
                  cg.add(rw);
                  // Side windows
                  var tsideGeo = new T.BoxGeometry(bLen * 0.3, 0.2, 0.02);
                  var tsideL = new T.Mesh(tsideGeo, tGlassMat);
                  tsideL.position.set(-bLen * 0.05, bH + 0.15, 0.44);
                  cg.add(tsideL);
                  var tsideR = new T.Mesh(tsideGeo, tGlassMat);
                  tsideR.position.set(-bLen * 0.05, bH + 0.15, -0.44);
                  cg.add(tsideR);
                }
              }
              // Wheels (4)
              var wMat = new T.MeshLambertMaterial({ color: 0x111111 });
              var wR = 0.18;
              [[-bLen * 0.3, wR, 0.45], [-bLen * 0.3, wR, -0.45], [bLen * 0.3, wR, 0.45], [bLen * 0.3, wR, -0.45]].forEach(function(wp) {
                var wGeo = new T.CylinderGeometry(wR, wR, 0.12, 10);
                var wheel = new T.Mesh(wGeo, wMat);
                wheel.rotation.x = Math.PI / 2;
                wheel.position.set(wp[0], wp[1], wp[2]);
                cg.add(wheel);
              });
              // Headlights (front, visible at night)
              var hlMat2 = new T.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: currentScenario.time === 'night' ? 0.9 : 0.2 });
              [0.3, -0.3].forEach(function(z) {
                var hlGeo = new T.SphereGeometry(0.05, 6, 6);
                var hl = new T.Mesh(hlGeo, hlMat2);
                hl.position.set(bLen / 2 + 0.01, bH / 2 + 0.2, z);
                cg.add(hl);
              });
              // Tail lights
              var tlMat = new T.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.5 });
              [0.3, -0.3].forEach(function(z) {
                var tlGeo = new T.SphereGeometry(0.04, 6, 6);
                var tl = new T.Mesh(tlGeo, tlMat);
                tl.position.set(-bLen / 2, bH / 2 + 0.2, z);
                cg.add(tl);
              });
              tGroup.add(cg);
              m = cg;
            }
            m.position.set(t.x - MAP_SIZE / 2, 0, t.y - MAP_SIZE / 2);
            m.rotation.y = -t.heading;
            // Wheel spin + blinker on traffic vehicles
            if (m.children) {
              var tWheelAngle = timeRef.current * Math.abs(t.speed) * 2;
              var tBlinkOn = t.blinker && Math.floor(timeRef.current * 2.5) % 2 === 0;
              m.children.forEach(function(child) {
                if (child.geometry && child.geometry.type === 'CylinderGeometry' && Math.abs(child.rotation.x - Math.PI / 2) < 0.1) {
                  child.rotation.y = tWheelAngle;
                }
                // Headlight meshes double as blinker indicators (orange glow)
                if (child.material && child.material.color) {
                  var cHex = child.material.color.getHex();
                  if (cHex === 0xffffee) {
                    // Left headlight = left blinker, right = right blinker
                    if (tBlinkOn && ((t.blinker === -1 && child.position.z > 0) || (t.blinker === 1 && child.position.z < 0))) {
                      child.material.color.setHex(0xf59e0b); // orange blinker
                      child.material.opacity = 0.9;
                    } else {
                      child.material.color.setHex(0xffffee);
                      child.material.opacity = scn.time === 'night' ? 0.9 : 0.2;
                    }
                  }
                }
              });
            }
            // Brake light brightness based on whether vehicle is slowing
            if (m.children) {
              m.children.forEach(function(child) {
                if (child.material && child.material.color) {
                  var hex = child.material.color.getHex();
                  if (hex === 0xff2222 || hex === 0xff0000) {
                    child.material.opacity = t.speed < t._prevSpeed ? 0.9 : 0.3;
                    child.material.transparent = true;
                  }
                }
              });
            }
            t._prevSpeed = t.speed;
          });

          // Update pedestrians
          var pGroup = s3.pedGroup;
          while (pGroup.children.length > pedsRef.current.length) pGroup.remove(pGroup.children[pGroup.children.length - 1]);
          pedsRef.current.forEach(function(p, pi) {
            var m;
            if (pi < pGroup.children.length) {
              m = pGroup.children[pi];
            } else {
              var pg = new T.Group();
              // Head
              var headGeo = new T.SphereGeometry(0.15, 8, 8);
              var headMat = new T.MeshLambertMaterial({ color: new T.Color(p.color).getHex() });
              var head = new T.Mesh(headGeo, headMat);
              head.position.y = 1.55; head.name = 'head';
              pg.add(head);
              // Torso
              var torsoGeo = new T.CylinderGeometry(0.12, 0.14, 0.5, 8);
              var torsoMat = new T.MeshLambertMaterial({ color: 0x445566 });
              var torso = new T.Mesh(torsoGeo, torsoMat);
              torso.position.y = 1.15;
              pg.add(torso);
              // Arms
              var armMat = new T.MeshLambertMaterial({ color: new T.Color(p.color).getHex() });
              var armGeo = new T.CylinderGeometry(0.04, 0.04, 0.4, 6);
              var armL = new T.Mesh(armGeo, armMat);
              armL.position.set(0, 1.1, 0.18); armL.name = 'armL';
              pg.add(armL);
              var armR = new T.Mesh(armGeo, armMat);
              armR.position.set(0, 1.1, -0.18); armR.name = 'armR';
              pg.add(armR);
              // Legs
              var legMat = new T.MeshLambertMaterial({ color: 0x2a2a3a });
              var legGeo = new T.CylinderGeometry(0.05, 0.05, 0.55, 6);
              var legL = new T.Mesh(legGeo, legMat);
              legL.position.set(0, 0.45, 0.08); legL.name = 'legL';
              pg.add(legL);
              var legR = new T.Mesh(legGeo, legMat);
              legR.position.set(0, 0.45, -0.08); legR.name = 'legR';
              pg.add(legR);
              // Kind-specific details: scale kids down, add jogger headband,
              // attach a dog sibling mesh for dog walkers.
              if (p.kind === 'kid') {
                pg.scale.setScalar(0.65);
              } else if (p.kind === 'jogger') {
                var band = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.32), new T.MeshLambertMaterial({ color: 0xef4444 }));
                band.position.y = 1.62;
                pg.add(band);
              } else if (p.kind === 'dogWalker') {
                // Small dog — box body + head + 4 tiny legs on a cross-mounted group.
                var dog = new T.Group();
                var dogMat = new T.MeshLambertMaterial({ color: 0x78451a });
                var dogBody = new T.Mesh(new T.BoxGeometry(0.28, 0.14, 0.12), dogMat);
                dogBody.position.y = 0.22; dog.add(dogBody);
                var dogHead = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.12), dogMat);
                dogHead.position.set(0.18, 0.3, 0); dog.add(dogHead);
                var tailDog = new T.Mesh(new T.BoxGeometry(0.1, 0.04, 0.04), dogMat);
                tailDog.position.set(-0.18, 0.26, 0); dog.add(tailDog);
                var dLegMat = new T.MeshLambertMaterial({ color: 0x5a3214 });
                [[-0.1, 0.05], [-0.1, -0.05], [0.1, 0.05], [0.1, -0.05]].forEach(function(lp2) {
                  var dlg = new T.Mesh(new T.BoxGeometry(0.04, 0.18, 0.04), dLegMat);
                  dlg.position.set(lp2[0], 0.08, lp2[1]);
                  dog.add(dlg);
                });
                dog.position.set(0.7, 0, 0); // on a leash length ahead
                dog.name = 'dog';
                pg.add(dog);
              }
              pg.castShadow = true;
              pGroup.add(pg);
              m = pg;
            }
            m.position.set(p.x - MAP_SIZE / 2, 0, p.y - MAP_SIZE / 2);
            // Walking animation — swing legs and arms
            var walkPhase = Math.sin(timeRef.current * 4 + pi * 2.5) * 0.3;
            m.children.forEach(function(child) {
              if (child.name === 'legL' || child.name === 'armR') child.rotation.x = walkPhase;
              if (child.name === 'legR' || child.name === 'armL') child.rotation.x = -walkPhase;
            });
          });

          // Update cyclists
          var cGroup = s3.cyclistGroup;
          while (cGroup.children.length > cyclistsRef.current.length) cGroup.remove(cGroup.children[cGroup.children.length - 1]);
          cyclistsRef.current.forEach(function(cy, ci) {
            var m;
            if (ci < cGroup.children.length) {
              m = cGroup.children[ci];
            } else {
              var cg = new T.Group();
              var wheelGeo = new T.TorusGeometry(0.25, 0.02, 8, 16);
              var wheelMat2 = new T.MeshLambertMaterial({ color: 0x888888 });
              var w1 = new T.Mesh(wheelGeo, wheelMat2); w1.position.set(0.3, 0.25, 0); w1.rotation.y = Math.PI / 2; cg.add(w1);
              var w2 = new T.Mesh(wheelGeo, wheelMat2); w2.position.set(-0.3, 0.25, 0); w2.rotation.y = Math.PI / 2; cg.add(w2);
              var riderGeo = new T.CylinderGeometry(0.1, 0.1, 0.6, 6);
              var riderMat = new T.MeshLambertMaterial({ color: cy.type === 'motorcycle' ? 0x1e293b : 0x06b6d4 });
              var rider = new T.Mesh(riderGeo, riderMat);
              rider.position.y = 0.9;
              cg.add(rider);
              var helmetGeo = new T.SphereGeometry(0.12, 8, 8);
              var helmetMat = new T.MeshLambertMaterial({ color: cy.type === 'motorcycle' ? 0xef4444 : 0xfbbf24 });
              var helmet = new T.Mesh(helmetGeo, helmetMat);
              helmet.position.y = 1.3;
              cg.add(helmet);
              cg.castShadow = true;
              cGroup.add(cg);
              m = cg;
            }
            m.position.set(cy.x - MAP_SIZE / 2, 0, cy.y - MAP_SIZE / 2);
            m.rotation.y = -cy.heading;
          });

          // Wildlife
          var wGroup = s3.wildlifeGroup;
          while (wGroup.children.length > 0) wGroup.remove(wGroup.children[0]);
          if (wildlifeRef.current) {
            var wl = wildlifeRef.current;
            var wSize = wl.mass === 'massive' ? 1.5 : wl.mass === 'medium' ? 0.8 : 0.4;
            var wGeo = new T.BoxGeometry(wSize * 1.5, wSize, wSize * 0.6);
            var wMat = new T.MeshLambertMaterial({ color: wl.mass === 'massive' ? 0x4a3520 : 0x8b6914 });
            var wMesh = new T.Mesh(wGeo, wMat);
            wMesh.position.set(wl.x - MAP_SIZE / 2, wSize / 2, wl.y - MAP_SIZE / 2);
            wMesh.castShadow = true;
            wGroup.add(wMesh);
          }

          // Emergency vehicles — detailed 3D with light bar + SpotLights
          var eGroup = s3.emergencyGroup;
          while (eGroup.children.length > 0) eGroup.remove(eGroup.children[0]);
          if (emergencyRef.current) {
            var em = emergencyRef.current;
            var eGrp = new T.Group();
            var isTruck = em.kind === 'firetruck';
            var bodyLen = isTruck ? 3.0 : 2.2;
            var bodyH = isTruck ? 1.4 : 1.0;
            var bodyCol = em.bodyColor || new T.Color(em.color).getHex();
            // Main body
            var eBGeo = new T.BoxGeometry(bodyLen, bodyH, 1.0);
            var eBMat = new T.MeshLambertMaterial({ color: bodyCol });
            var eBody = new T.Mesh(eBGeo, eBMat);
            eBody.position.y = bodyH / 2 + 0.2;
            eBody.castShadow = true;
            eGrp.add(eBody);
            // Cabin / roof (lighter)
            if (!isTruck) {
              var cabGeo = new T.BoxGeometry(bodyLen * 0.45, 0.4, 0.9);
              var cabMat = new T.MeshLambertMaterial({ color: bodyCol });
              var cab = new T.Mesh(cabGeo, cabMat);
              cab.position.set(-bodyLen * 0.1, bodyH + 0.35, 0);
              eGrp.add(cab);
            }
            // Wheels (4)
            var ewMat = new T.MeshLambertMaterial({ color: 0x111111 });
            [[-bodyLen * 0.3, 0.2, 0.52], [-bodyLen * 0.3, 0.2, -0.52], [bodyLen * 0.3, 0.2, 0.52], [bodyLen * 0.3, 0.2, -0.52]].forEach(function(wp) {
              var ewGeo = new T.CylinderGeometry(0.2, 0.2, 0.12, 10);
              var ew = new T.Mesh(ewGeo, ewMat);
              ew.rotation.x = Math.PI / 2;
              ew.position.set(wp[0], wp[1], wp[2]);
              eGrp.add(ew);
            });
            // ── Light bar on roof ──
            var barGeo = new T.BoxGeometry(bodyLen * 0.5, 0.12, 0.7);
            var barMat = new T.MeshLambertMaterial({ color: 0x222222 });
            var bar = new T.Mesh(barGeo, barMat);
            var barY = bodyH + (isTruck ? 0.15 : 0.68);
            bar.position.set(0, barY, 0);
            eGrp.add(bar);
            // Alternating flash lights on the light bar
            var flashPhase = Math.floor(timeRef.current * 8) % 4;
            var lc1 = em.lightColor1 || 0xff0000;
            var lc2 = em.lightColor2 || 0x0000ff;
            // 4 light pods across the bar
            [-0.25, -0.08, 0.08, 0.25].forEach(function(zOff, idx) {
              var isOn = (idx % 2 === 0) ? (flashPhase < 2) : (flashPhase >= 2);
              var podColor = (idx < 2) ? lc1 : lc2;
              var podMat = new T.MeshBasicMaterial({ color: isOn ? podColor : 0x222222 });
              var podGeo = new T.BoxGeometry(0.08, 0.1, 0.12);
              var pod = new T.Mesh(podGeo, podMat);
              pod.position.set(0, barY + 0.1, zOff);
              eGrp.add(pod);
              // Glow sphere when on
              if (isOn) {
                var glowMat = new T.MeshBasicMaterial({ color: podColor, transparent: true, opacity: 0.4 });
                var glowGeo = new T.SphereGeometry(0.2, 6, 6);
                var glow = new T.Mesh(glowGeo, glowMat);
                glow.position.set(0, barY + 0.1, zOff);
                eGrp.add(glow);
              }
            });
            // SpotLights casting colored cones (visible at night, always present for effect)
            var flashOn = flashPhase < 2;
            var spotL = new T.SpotLight(flashOn ? lc1 : 0x000000, 2.0, 15, Math.PI / 4, 0.6, 1);
            spotL.position.set(0, barY + 0.2, -0.3);
            spotL.target.position.set(flashOn ? -3 : 3, 0, -4);
            eGrp.add(spotL); eGrp.add(spotL.target);
            var spotR = new T.SpotLight(!flashOn ? lc2 : 0x000000, 2.0, 15, Math.PI / 4, 0.6, 1);
            spotR.position.set(0, barY + 0.2, 0.3);
            spotR.target.position.set(!flashOn ? 3 : -3, 0, 4);
            eGrp.add(spotR); eGrp.add(spotR.target);
            // Headlights (always on for emergency)
            var ehlMat = new T.MeshBasicMaterial({ color: 0xffffff });
            [-0.35, 0.35].forEach(function(z) {
              var ehl = new T.Mesh(new T.SphereGeometry(0.06, 6, 6), ehlMat);
              ehl.position.set(bodyLen / 2 + 0.01, bodyH / 2 + 0.2, z);
              eGrp.add(ehl);
            });
            // Marking stripe (ambulance = red cross, police = stripe, fire = gold)
            if (em.kind === 'ambulance') {
              var crossMat = new T.MeshBasicMaterial({ color: 0xff0000 });
              var crossH = new T.Mesh(new T.BoxGeometry(0.6, 0.05, 0.15), crossMat);
              crossH.position.set(0, bodyH + 0.05, 0.51);
              eGrp.add(crossH);
              var crossV = new T.Mesh(new T.BoxGeometry(0.15, 0.05, 0.6), crossMat);
              crossV.position.set(0, bodyH + 0.05, 0.51);
              eGrp.add(crossV);
            } else if (em.kind === 'police') {
              var stripeMat = new T.MeshBasicMaterial({ color: 0x3b82f6 });
              var stripe = new T.Mesh(new T.BoxGeometry(bodyLen * 0.8, 0.04, 0.2), stripeMat);
              stripe.position.set(0, bodyH * 0.6, 0.51);
              eGrp.add(stripe);
            }
            eGrp.position.set(em.x - MAP_SIZE / 2, 0, em.y - MAP_SIZE / 2);
            eGrp.rotation.y = -em.heading;
            eGroup.add(eGrp);
          }

          // Tire spray in rain (mist kicked up by rear tires)
          if (s3.tireSprayParticles && Math.abs(car.speed) > 3) {
            var spPos = s3.tireSprayParticles.geometry.attributes.position;
            var spIdx = Math.floor(timeRef.current * 30) % spPos.count;
            // Spawn at rear wheel positions
            var rearX = carWorldX - Math.cos(car.heading) * 0.8;
            var rearZ = carWorldZ - Math.sin(car.heading) * 0.8;
            spPos.setXYZ(spIdx, rearX + (Math.random() - 0.5) * 0.5, 0.1 + Math.random() * 0.3, rearZ + (Math.random() - 0.5) * 0.5);
            // Drift existing particles up and back
            for (var spi = 0; spi < spPos.count; spi++) {
              var spy = spPos.getY(spi);
              if (spy > 0 && spy < 1.5) {
                spPos.setY(spi, spy + 0.015);
                spPos.setX(spi, spPos.getX(spi) - Math.cos(car.heading) * 0.01);
                spPos.setZ(spi, spPos.getZ(spi) - Math.sin(car.heading) * 0.01);
              } else if (spy >= 1.5) {
                spPos.setY(spi, -999);
              }
            }
            spPos.needsUpdate = true;
            s3.tireSprayParticles.material.opacity = Math.min(0.5, Math.abs(car.speed) * 0.025);
          }

          // Off-road dust — only when car is on grass (not road) and moving.
          if (s3.dustParticles) {
            var dpPos = s3.dustParticles.geometry.attributes.position;
            var onGrassDust = false;
            if (infiniteWorldRef.current) {
              var dustCell = infiniteWorldRef.current.getCell(Math.floor(car.x), Math.floor(car.y));
              onGrassDust = (dustCell === 2 || dustCell === 4);
            } else if (mapRef.current) {
              var dcy = Math.floor(car.y), dcx = Math.floor(car.x);
              if (dcy >= 0 && dcy < MAP_SIZE && dcx >= 0 && dcx < MAP_SIZE) {
                var dcV = mapRef.current[dcy][dcx];
                onGrassDust = (dcV === 2 || dcV === 4);
              }
            }
            if (onGrassDust && Math.abs(car.speed) > 2 && scn.weather !== 'snow') {
              var dpIdx = Math.floor(timeRef.current * 40) % dpPos.count;
              var rearXd = carWorldX - Math.cos(car.heading) * 1.0;
              var rearZd = carWorldZ - Math.sin(car.heading) * 1.0;
              dpPos.setXYZ(dpIdx, rearXd + (Math.random() - 0.5) * 0.7, 0.05 + Math.random() * 0.2, rearZd + (Math.random() - 0.5) * 0.7);
              for (var dpi = 0; dpi < dpPos.count; dpi++) {
                var dpy = dpPos.getY(dpi);
                if (dpy > -1 && dpy < 2.5) {
                  dpPos.setY(dpi, dpy + 0.02);
                  dpPos.setX(dpi, dpPos.getX(dpi) - Math.cos(car.heading) * 0.02);
                  dpPos.setZ(dpi, dpPos.getZ(dpi) - Math.sin(car.heading) * 0.02);
                } else if (dpy >= 2.5) {
                  dpPos.setY(dpi, -999);
                }
              }
              dpPos.needsUpdate = true;
              s3.dustParticles.material.opacity = Math.min(0.6, Math.abs(car.speed) * 0.035);
            } else {
              // Let existing dust finish rising/fading but don't spawn new.
              for (var dpi2 = 0; dpi2 < dpPos.count; dpi2++) {
                var dpy2 = dpPos.getY(dpi2);
                if (dpy2 > -1 && dpy2 < 2.5) {
                  dpPos.setY(dpi2, dpy2 + 0.025);
                  if (dpy2 >= 2.45) dpPos.setY(dpi2, -999);
                }
              }
              dpPos.needsUpdate = true;
              s3.dustParticles.material.opacity *= 0.95;
            }
          }

          // Exhaust particles
          if (s3.exhaustParticles && car.speed > 1) {
            var exPos = s3.exhaustParticles.geometry.attributes.position;
            var exIdx = Math.floor(timeRef.current * 15) % exPos.count;
            // Spawn new particle at exhaust pipe position (rear-left of car)
            var exWorldX = carWorldX - Math.cos(car.heading) * 1.0 + Math.sin(car.heading) * 0.2;
            var exWorldZ = carWorldZ - Math.sin(car.heading) * 1.0 - Math.cos(car.heading) * 0.2;
            exPos.setXYZ(exIdx, exWorldX, 0.35, exWorldZ);
            // Drift existing particles upward and away
            for (var epi = 0; epi < exPos.count; epi++) {
              var epy = exPos.getY(epi);
              if (epy > 0 && epy < 3) {
                exPos.setY(epi, epy + 0.02);
                exPos.setX(epi, exPos.getX(epi) + (Math.random() - 0.5) * 0.02);
              } else if (epy >= 3) {
                exPos.setY(epi, -999);
              }
            }
            exPos.needsUpdate = true;
            s3.exhaustParticles.material.opacity = Math.min(0.35, car.throttle * 0.3 + 0.05);
          }

          // Weather particles
          if (s3.weatherParticles) {
            var pos = s3.weatherParticles.geometry.attributes.position;
            for (var wpi = 0; wpi < pos.count; wpi++) {
              var py = pos.getY(wpi);
              py -= (scn.weather === 'rain' ? 0.5 : 0.1);
              if (py < 0) py = 20;
              pos.setY(wpi, py);
              if (scn.weather === 'snow') {
                pos.setX(wpi, pos.getX(wpi) + Math.sin(wpi + timeRef.current) * 0.01);
              }
            }
            pos.needsUpdate = true;
            s3.weatherParticles.position.set(carWorldX, 0, carWorldZ);
          }

          // ── Dynamic chunk 3D generation for infinite world ──
          if (infiniteWorldRef.current) {
            var iw = infiniteWorldRef.current;
            var currentChunk = Math.floor(car.y / CHUNK_SIZE);
            if (!s3._loadedChunks) s3._loadedChunks = {};
            // Load chunks within range (-2 to +2 from current)
            // Load chunks 4 ahead and 2 behind (seamless — you never see them pop in)
            for (var ci = currentChunk - 2; ci <= currentChunk + 4; ci++) {
              if (s3._loadedChunks[ci]) continue;
              var chunk = iw.getChunk(ci);
              var chunkGroup = new T.Group();
              chunkGroup.name = 'chunk_' + ci;
              var chunkWorldZ = ci * CHUNK_SIZE - MAP_SIZE / 2;
              // Build 3D objects for this chunk
              var buildMats = [new T.MeshLambertMaterial({ color: 0xb08c64 }), new T.MeshLambertMaterial({ color: 0xa09078 }), new T.MeshLambertMaterial({ color: 0x8c7a62 })];
              // Tree palette varies by species. Materials reused across all trees
              // in a chunk for batching. Snow biomes desaturate everything.
              var snowy = scn.weather === 'snow';
              var pineLeaf = new T.MeshLambertMaterial({ color: snowy ? 0xb8c4d0 : 0x1f5d2c });
              var maple    = new T.MeshLambertMaterial({ color: snowy ? 0xc8d0d8 : 0x3a8a3a });
              var maple2   = new T.MeshLambertMaterial({ color: snowy ? 0xc8d0d8 : 0x6ba84f });
              var birch    = new T.MeshLambertMaterial({ color: snowy ? 0xd6dde6 : 0xa8c66c });
              var darkBark = new T.MeshLambertMaterial({ color: 0x4a2e18 });
              var lightBark= new T.MeshLambertMaterial({ color: 0xe8e0d4 });
              for (var cy = 0; cy < CHUNK_SIZE; cy++) {
                for (var cx = 0; cx < MAP_SIZE; cx++) {
                  var cellVal = chunk.cells[cy][cx];
                  var wx = cx - MAP_SIZE / 2;
                  var wz = chunkWorldZ + cy;
                  if (cellVal === 1) {
                    // Building — main box + roof cap + window belt. Style varies
                    // by biome: commercial gets flat roofs + storefront awning,
                    // residential gets peaked roofs, industrial gets corrugated flat tops.
                    var bHash = (cx * 37 + cy * 73);
                    var bH = 3 + (bHash % 5);
                    var bW = 1 + (chunk.biome === 'commercial' ? 0.3 : 0);
                    var bMat = buildMats[(cx + cy) % 3];
                    var bMesh = new T.Mesh(new T.BoxGeometry(bW, bH, bW), bMat);
                    var terrainYb = iw.spline ? iw.spline.heightAt(ci * CHUNK_SIZE + cy) * 0.5 : 0;
                    bMesh.position.set(wx, terrainYb + bH / 2, wz);
                    bMesh.castShadow = true;
                    chunkGroup.add(bMesh);
                    // Roof
                    if (chunk.biome === 'residential' || chunk.biome === 'suburban') {
                      // Peaked roof
                      var rfMat = new T.MeshLambertMaterial({ color: (bHash & 1) ? 0x7a2a1a : 0x3a2a1a });
                      var rfGeo = new T.ConeGeometry(bW * 0.85, bH * 0.35, 4);
                      var rf = new T.Mesh(rfGeo, rfMat);
                      rf.rotation.y = Math.PI / 4;
                      rf.position.set(wx, terrainYb + bH + bH * 0.175, wz);
                      chunkGroup.add(rf);
                    } else if (chunk.biome === 'industrial') {
                      // Flat roof with a mechanical box on top
                      var mBox = new T.Mesh(new T.BoxGeometry(bW * 0.4, 0.35, bW * 0.4), new T.MeshLambertMaterial({ color: 0x55606a }));
                      mBox.position.set(wx, terrainYb + bH + 0.175, wz);
                      chunkGroup.add(mBox);
                    } else if (chunk.biome === 'commercial') {
                      // Flat roof + small parapet cap
                      var cap = new T.Mesh(new T.BoxGeometry(bW + 0.08, 0.12, bW + 0.08), new T.MeshLambertMaterial({ color: 0x2a2a2a }));
                      cap.position.set(wx, terrainYb + bH + 0.06, wz);
                      chunkGroup.add(cap);
                    }
                    // Chimney + rising smoke — residential/suburban only, and only
                    // when it would feel motivated (cold morning or snow). Keeps
                    // density of plumes deterministic per cell so animation per-
                    // frame doesn't have to invent state.
                    if ((chunk.biome === 'residential' || chunk.biome === 'suburban')
                        && (currentScenario.id === 'dawn' || scn.weather === 'snow')
                        && (bHash & 3) === 0) {
                      var chimMat = new T.MeshLambertMaterial({ color: 0x8a5a48 });
                      var chimney = new T.Mesh(new T.BoxGeometry(0.18, 0.65, 0.18), chimMat);
                      chimney.position.set(wx + 0.25, terrainYb + bH + 0.32, wz + 0.18);
                      chunkGroup.add(chimney);
                      // Three offset puff spheres rising — animated softly via
                      // chunk-walk by their `smoke_puff` name.
                      var puffMat = new T.MeshBasicMaterial({ color: 0xd0d4d8, transparent: true, opacity: 0.55, depthWrite: false });
                      for (var spi = 0; spi < 3; spi++) {
                        var puff = new T.Mesh(new T.SphereGeometry(0.18 + spi * 0.06, 6, 5), puffMat);
                        puff.position.set(wx + 0.25, terrainYb + bH + 0.95 + spi * 0.55, wz + 0.18);
                        puff.name = 'smoke_puff';
                        puff._sBaseY = puff.position.y;
                        puff._sPhase = (bHash + spi * 17) * 0.13;
                        chunkGroup.add(puff);
                      }
                    }
                    // Snow caps on roofs during snow weather — thin white layer
                    // sitting just above the roof peak/flat.
                    if (scn.weather === 'snow') {
                      var snowCapMat = new T.MeshLambertMaterial({ color: 0xf8fafc });
                      var snowCap = new T.Mesh(new T.BoxGeometry(bW + 0.14, 0.10, bW + 0.14), snowCapMat);
                      var capY = (chunk.biome === 'residential' || chunk.biome === 'suburban') ? bH + bH * 0.35 + 0.05
                                 : chunk.biome === 'industrial' ? bH + 0.4 : bH + 0.18;
                      snowCap.position.set(wx, terrainYb + capY, wz);
                      chunkGroup.add(snowCap);
                    }
                    // Windows: bright dots at night, dark squares by day.
                    var isNightWin = currentScenario.time === 'night' || currentScenario.id === 'night';
                    var winColor = isNightWin ? ((bHash & 3) === 0 ? 0x1a1a2e : 0xfff0a8) : 0x3a4a5e;
                    var winMat = new T.MeshBasicMaterial({ color: winColor });
                    var windowRows = Math.max(1, Math.floor(bH / 1.1));
                    for (var wri = 0; wri < windowRows; wri++) {
                      var wrY = terrainYb + 0.9 + wri * 1.1;
                      if (wrY > terrainYb + bH - 0.3) break;
                      [-1, 1].forEach(function(wFace) {
                        var w1 = new T.Mesh(new T.PlaneGeometry(bW * 0.22, 0.4), winMat);
                        w1.position.set(wx + wFace * (bW / 2 + 0.002), wrY, wz);
                        w1.rotation.y = wFace > 0 ? -Math.PI / 2 : Math.PI / 2;
                        chunkGroup.add(w1);
                      });
                    }
                  } else if (cellVal === 5) {
                    // Tree — species picked deterministically from cell position so
                    // the same chunk always renders the same forest. Lift by terrain
                    // height (rolling but softer than the road) so trees follow hills.
                    var hashTree = (cx * 73856093) ^ (cy * 19349663);
                    var speciesRoll = (hashTree & 0xff) / 255;
                    var tH = 2 + ((cx * 47 + cy * 83) % 3);
                    var terrainY = iw.spline ? iw.spline.heightAt(ci * CHUNK_SIZE + cy) * 0.5 : 0;
                    // Bias species by biome.
                    var pickPine, pickBirch;
                    if (chunk.biome === 'rural') { pickPine = speciesRoll < 0.55; pickBirch = !pickPine && speciesRoll < 0.80; }
                    else if (chunk.biome === 'suburban' || chunk.biome === 'residential') { pickPine = false; pickBirch = speciesRoll < 0.20; }
                    else { pickPine = false; pickBirch = false; } // commercial/industrial: maples
                    if (pickPine) {
                      // Conifer: tall trunk + stacked cones for that fir-tree silhouette.
                      var pTrunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, tH * 0.55, 6), darkBark);
                      pTrunk.position.set(wx, terrainY + tH * 0.275, wz);
                      chunkGroup.add(pTrunk);
                      var coneCount = 3;
                      for (var pcc = 0; pcc < coneCount; pcc++) {
                        var pcRad = 0.85 - pcc * 0.20;
                        var pcH = tH * 0.4 - pcc * 0.05;
                        var pc = new T.Mesh(new T.ConeGeometry(pcRad, pcH, 7), pineLeaf);
                        pc.position.set(wx, terrainY + tH * 0.55 + pcc * (tH * 0.22), wz);
                        pc.castShadow = true;
                        chunkGroup.add(pc);
                      }
                    } else if (pickBirch) {
                      // Birch: pale trunk, sparse rounded canopy.
                      var bTrunk = new T.Mesh(new T.CylinderGeometry(0.08, 0.10, tH * 0.85, 6), lightBark);
                      bTrunk.position.set(wx, terrainY + tH * 0.425, wz);
                      chunkGroup.add(bTrunk);
                      var bCan = new T.Mesh(new T.SphereGeometry(0.55 + (hashTree & 7) * 0.04, 7, 5), birch);
                      bCan.position.set(wx, terrainY + tH * 0.95, wz);
                      bCan.scale.y = 1.2;
                      bCan.castShadow = true;
                      chunkGroup.add(bCan);
                    } else {
                      // Maple/deciduous: short trunk + irregular spherical canopy.
                      var mTrunk = new T.Mesh(new T.CylinderGeometry(0.13, 0.18, tH * 0.5, 6), darkBark);
                      mTrunk.position.set(wx, terrainY + tH * 0.25, wz);
                      chunkGroup.add(mTrunk);
                      var mLeaf = (hashTree & 1) ? maple : maple2;
                      var mCan = new T.Mesh(new T.SphereGeometry(0.7 + ((hashTree >> 3) & 7) * 0.04, 8, 6), mLeaf);
                      mCan.position.set(wx, terrainY + tH * 0.7, wz);
                      mCan.scale.set(1.0 + ((hashTree >> 6) & 3) * 0.08, 0.85, 1.0 + ((hashTree >> 9) & 3) * 0.08);
                      mCan.castShadow = true;
                      chunkGroup.add(mCan);
                    }
                  }
                  // Landmark cell value 7 is handled separately below after the grid loop
                }
              }
              // ─── LANDMARK RENDERING: pre-designed destination structures ───
              if (chunk.landmark) {
                var lm = chunk.landmark;
                var lt = lm.type;
                var lmCenterWX = lm.centerX - MAP_SIZE / 2;
                var lmCenterWZ = chunkWorldZ + lm.centerY;
                var lmMainMat = new T.MeshLambertMaterial({ color: lt.color });
                var lmRoofMat = new T.MeshLambertMaterial({ color: lt.roofColor });

                if (lt.id === 'park') {
                  // Park: grass, trees, bench, sign
                  var parkBase = new T.Mesh(new T.BoxGeometry(lt.size * 0.9, 0.1, lt.size * 0.9), new T.MeshLambertMaterial({ color: 0x4ade80 }));
                  parkBase.position.set(lmCenterWX, 0.05, lmCenterWZ);
                  chunkGroup.add(parkBase);
                  // Three trees inside park
                  for (var pti = 0; pti < 3; pti++) {
                    var ptAngle = (pti / 3) * Math.PI * 2;
                    var ptTrunk = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 1.2, 6), new T.MeshLambertMaterial({ color: 0x5c3a1e }));
                    ptTrunk.position.set(lmCenterWX + Math.cos(ptAngle) * 1.5, 0.6, lmCenterWZ + Math.sin(ptAngle) * 1.5);
                    chunkGroup.add(ptTrunk);
                    var ptLeaf = new T.Mesh(new T.SphereGeometry(0.9, 8, 6), new T.MeshLambertMaterial({ color: 0x16a34a }));
                    ptLeaf.position.set(lmCenterWX + Math.cos(ptAngle) * 1.5, 1.7, lmCenterWZ + Math.sin(ptAngle) * 1.5);
                    chunkGroup.add(ptLeaf);
                  }
                  // Bench
                  var benchMat = new T.MeshLambertMaterial({ color: 0x78350f });
                  var bench = new T.Mesh(new T.BoxGeometry(1.5, 0.15, 0.4), benchMat);
                  bench.position.set(lmCenterWX, 0.4, lmCenterWZ);
                  chunkGroup.add(bench);
                } else if (lt.id === 'lighthouse') {
                  // Lighthouse: tall cylindrical tower with red top
                  var lhBase = new T.Mesh(new T.CylinderGeometry(0.9, 1.1, lt.height, 10), lmMainMat);
                  lhBase.position.set(lmCenterWX, lt.height / 2, lmCenterWZ);
                  lhBase.castShadow = true;
                  chunkGroup.add(lhBase);
                  // Red stripes (characteristic of Maine lighthouses)
                  var stripeMat = new T.MeshLambertMaterial({ color: 0xdc2626 });
                  for (var lsi = 1; lsi < 4; lsi++) {
                    var stripe = new T.Mesh(new T.CylinderGeometry(0.92, 1.02, 0.5, 10), stripeMat);
                    stripe.position.set(lmCenterWX, lsi * (lt.height / 4), lmCenterWZ);
                    chunkGroup.add(stripe);
                  }
                  // Top housing
                  var lhTop = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.8, 10), new T.MeshLambertMaterial({ color: 0x1a1a2e }));
                  lhTop.position.set(lmCenterWX, lt.height + 0.4, lmCenterWZ);
                  chunkGroup.add(lhTop);
                  // Light (glowing)
                  var lhLight = new T.Mesh(new T.SphereGeometry(0.4, 8, 6), new T.MeshBasicMaterial({ color: 0xfef3c7 }));
                  lhLight.position.set(lmCenterWX, lt.height + 0.4, lmCenterWZ);
                  chunkGroup.add(lhLight);
                  // Roof cone
                  var lhRoof = new T.Mesh(new T.ConeGeometry(0.8, 1.0, 10), lmRoofMat);
                  lhRoof.position.set(lmCenterWX, lt.height + 1.3, lmCenterWZ);
                  chunkGroup.add(lhRoof);
                } else if (lt.id === 'church') {
                  // Church: main hall + steeple
                  var chBase = new T.Mesh(new T.BoxGeometry(lt.size * 0.6, lt.height * 0.5, lt.size * 0.8), lmMainMat);
                  chBase.position.set(lmCenterWX, lt.height * 0.25, lmCenterWZ);
                  chBase.castShadow = true;
                  chunkGroup.add(chBase);
                  // Pitched roof
                  var chRoof = new T.Mesh(new T.ConeGeometry(lt.size * 0.55, lt.height * 0.3, 4), lmRoofMat);
                  chRoof.rotation.y = Math.PI / 4;
                  chRoof.position.set(lmCenterWX, lt.height * 0.5 + lt.height * 0.15, lmCenterWZ);
                  chunkGroup.add(chRoof);
                  // Steeple base
                  var chSteeple = new T.Mesh(new T.BoxGeometry(1, lt.height * 0.5, 1), lmMainMat);
                  chSteeple.position.set(lmCenterWX, lt.height * 0.75, lmCenterWZ - lt.size * 0.3);
                  chunkGroup.add(chSteeple);
                  // Steeple spire
                  var chSpire = new T.Mesh(new T.ConeGeometry(0.7, 2.0, 4), lmRoofMat);
                  chSpire.position.set(lmCenterWX, lt.height * 1.15, lmCenterWZ - lt.size * 0.3);
                  chunkGroup.add(chSpire);
                  // Cross
                  var chCrossV = new T.Mesh(new T.BoxGeometry(0.08, 0.6, 0.08), new T.MeshLambertMaterial({ color: 0xfacc15 }));
                  chCrossV.position.set(lmCenterWX, lt.height * 1.15 + 1.3, lmCenterWZ - lt.size * 0.3);
                  chunkGroup.add(chCrossV);
                  var chCrossH = new T.Mesh(new T.BoxGeometry(0.4, 0.08, 0.08), new T.MeshLambertMaterial({ color: 0xfacc15 }));
                  chCrossH.position.set(lmCenterWX, lt.height * 1.15 + 1.4, lmCenterWZ - lt.size * 0.3);
                  chunkGroup.add(chCrossH);
                } else if (lt.id === 'gas') {
                  // Gas station: small building + canopy with pumps
                  var gsBldg = new T.Mesh(new T.BoxGeometry(lt.size * 0.5, lt.height, lt.size * 0.5), lmMainMat);
                  gsBldg.position.set(lmCenterWX - 1, lt.height / 2, lmCenterWZ);
                  chunkGroup.add(gsBldg);
                  // Canopy (big yellow roof on pillars)
                  var gsCanopy = new T.Mesh(new T.BoxGeometry(lt.size * 0.7, 0.3, lt.size * 0.5), lmRoofMat);
                  gsCanopy.position.set(lmCenterWX + 1, lt.height * 0.9, lmCenterWZ);
                  chunkGroup.add(gsCanopy);
                  // Canopy pillars
                  var pillarMat = new T.MeshLambertMaterial({ color: 0x4b5563 });
                  for (var gpi = -1; gpi <= 1; gpi += 2) {
                    for (var gpj = -1; gpj <= 1; gpj += 2) {
                      var pillar = new T.Mesh(new T.BoxGeometry(0.2, lt.height * 0.9, 0.2), pillarMat);
                      pillar.position.set(lmCenterWX + 1 + gpi * lt.size * 0.3, lt.height * 0.45, lmCenterWZ + gpj * lt.size * 0.2);
                      chunkGroup.add(pillar);
                    }
                  }
                  // Pumps
                  var pumpMat = new T.MeshLambertMaterial({ color: 0xdc2626 });
                  for (var pmi = -1; pmi <= 1; pmi += 2) {
                    var pump = new T.Mesh(new T.BoxGeometry(0.4, 1.2, 0.3), pumpMat);
                    pump.position.set(lmCenterWX + 1, 0.6, lmCenterWZ + pmi * 0.6);
                    chunkGroup.add(pump);
                  }
                } else {
                  // GENERIC LANDMARK (school, library, hospital, police, fire, etc.)
                  // Main building — taller than regular buildings, distinct color
                  var genBldg = new T.Mesh(new T.BoxGeometry(lt.size * 0.8, lt.height, lt.size * 0.8), lmMainMat);
                  genBldg.position.set(lmCenterWX, lt.height / 2, lmCenterWZ);
                  genBldg.castShadow = true;
                  chunkGroup.add(genBldg);
                  // Roof (flat-topped for civic buildings, pitched for residential/rural)
                  if (lt.id === 'home' || lt.id === 'farm' || lt.id === 'diner') {
                    // Pitched roof
                    var pRoof = new T.Mesh(new T.ConeGeometry(lt.size * 0.6, lt.height * 0.4, 4), lmRoofMat);
                    pRoof.rotation.y = Math.PI / 4;
                    pRoof.position.set(lmCenterWX, lt.height + lt.height * 0.2, lmCenterWZ);
                    chunkGroup.add(pRoof);
                  } else {
                    // Flat civic roof with parapet
                    var fRoof = new T.Mesh(new T.BoxGeometry(lt.size * 0.85, 0.3, lt.size * 0.85), lmRoofMat);
                    fRoof.position.set(lmCenterWX, lt.height + 0.15, lmCenterWZ);
                    chunkGroup.add(fRoof);
                  }
                  // Entry door (facing road)
                  var doorMat = new T.MeshLambertMaterial({ color: 0x78350f });
                  var door = new T.Mesh(new T.BoxGeometry(0.6, 1.2, 0.1), doorMat);
                  door.position.set(lmCenterWX + lm.side * (lt.size * 0.4), 0.6, lmCenterWZ);
                  chunkGroup.add(door);
                  // Windows (3 across the front)
                  var windowMat = new T.MeshLambertMaterial({ color: 0x60a5fa, emissive: 0x1e3a8a, emissiveIntensity: 0.3 });
                  for (var gwi = -1; gwi <= 1; gwi++) {
                    var gwin = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.05), windowMat);
                    gwin.position.set(lmCenterWX + lm.side * (lt.size * 0.4), lt.height * 0.55, lmCenterWZ + gwi * 1.0);
                    chunkGroup.add(gwin);
                    // Second story for taller buildings
                    if (lt.height > 3.5) {
                      var gwin2 = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.05), windowMat);
                      gwin2.position.set(lmCenterWX + lm.side * (lt.size * 0.4), lt.height * 0.85, lmCenterWZ + gwi * 1.0);
                      chunkGroup.add(gwin2);
                    }
                  }
                  // Special touches per landmark type
                  if (lt.id === 'hospital') {
                    // Big red cross on roof
                    var hcV = new T.Mesh(new T.BoxGeometry(0.3, 1.2, 0.1), new T.MeshLambertMaterial({ color: 0xdc2626 }));
                    hcV.position.set(lmCenterWX, lt.height + 0.9, lmCenterWZ);
                    chunkGroup.add(hcV);
                    var hcH = new T.Mesh(new T.BoxGeometry(1.2, 0.3, 0.1), new T.MeshLambertMaterial({ color: 0xdc2626 }));
                    hcH.position.set(lmCenterWX, lt.height + 0.9, lmCenterWZ);
                    chunkGroup.add(hcH);
                  } else if (lt.id === 'school') {
                    // Flagpole with American flag
                    var flagPole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 4, 6), new T.MeshLambertMaterial({ color: 0xd1d5db }));
                    flagPole.position.set(lmCenterWX + lm.side * 2, 2, lmCenterWZ + 1.5);
                    chunkGroup.add(flagPole);
                    var flag = new T.Mesh(new T.BoxGeometry(0.8, 0.5, 0.02), new T.MeshLambertMaterial({ color: 0xef4444 }));
                    flag.position.set(lmCenterWX + lm.side * 2 + lm.side * 0.4, 3.5, lmCenterWZ + 1.5);
                    chunkGroup.add(flag);
                  } else if (lt.id === 'fire') {
                    // Garage door (larger)
                    var fdMat = new T.MeshLambertMaterial({ color: 0xfef3c7 });
                    var fd = new T.Mesh(new T.BoxGeometry(1.5, 1.8, 0.1), fdMat);
                    fd.position.set(lmCenterWX + lm.side * (lt.size * 0.4) - 0.5, 0.9, lmCenterWZ);
                    chunkGroup.add(fd);
                  }
                }
                // ─── LANDMARK SIGN (always visible from road) ───
                if (lt.sign) {
                  // Sign post
                  var spMat = new T.MeshLambertMaterial({ color: 0x4b5563 });
                  var signPole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.5, 6), spMat);
                  signPole.position.set(lmCenterWX - lm.side * (lt.size * 0.55), 1.25, lmCenterWZ);
                  chunkGroup.add(signPole);
                  // Sign panel
                  var signMat = new T.MeshBasicMaterial({ color: lt.signColor });
                  var sign = new T.Mesh(new T.BoxGeometry(1.4, 0.6, 0.08), signMat);
                  sign.position.set(lmCenterWX - lm.side * (lt.size * 0.55), 2.2, lmCenterWZ);
                  chunkGroup.add(sign);
                  // Sign text via canvas texture
                  try {
                    var signCan = document.createElement('canvas');
                    signCan.width = 256; signCan.height = 128;
                    var signCtx = signCan.getContext('2d');
                    signCtx.fillStyle = '#' + lt.signColor.toString(16).padStart(6, '0');
                    signCtx.fillRect(0, 0, 256, 128);
                    signCtx.fillStyle = '#000000';
                    signCtx.font = 'bold 42px system-ui, sans-serif';
                    signCtx.textAlign = 'center';
                    signCtx.textBaseline = 'middle';
                    signCtx.fillText(lt.sign, 128, 64);
                    signCtx.strokeStyle = '#000000';
                    signCtx.lineWidth = 4;
                    signCtx.strokeRect(4, 4, 248, 120);
                    var signTex = new T.CanvasTexture(signCan);
                    var signTextMat = new T.MeshBasicMaterial({ map: signTex, transparent: true });
                    var signText = new T.Mesh(new T.PlaneGeometry(1.3, 0.55), signTextMat);
                    signText.position.set(lmCenterWX - lm.side * (lt.size * 0.55), 2.2, lmCenterWZ + (lm.side * 0.06));
                    signText.rotation.y = lm.side === 1 ? 0 : Math.PI;
                    chunkGroup.add(signText);
                  } catch (signErr) { /* canvas texture fallback — plain sign still shows */ }
                }

                // ─── CONTEXT-AWARE ROAD SIGNS near each landmark ───
                // Draw an appropriate warning/regulatory sign on the shoulder as the driver approaches.
                var landmarkSignZ = chunkWorldZ + lm.centerY - 6; // 6 cells before the landmark center
                var roadShoulderX = lm.side * (MAX_ROAD_WIDTH + 1); // just off the road on the landmark side
                var signBackMat = new T.MeshLambertMaterial({ color: 0xffffff });
                var signPost2Mat = new T.MeshLambertMaterial({ color: 0xd1d5db });
                function addRoadSign(shape, faceColor, label, labelColor, zOff) {
                  var postZ = landmarkSignZ + (zOff || 0);
                  var post = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.2, 6), signPost2Mat);
                  post.position.set(roadShoulderX, 1.1, postZ);
                  chunkGroup.add(post);
                  var faceGeo;
                  if (shape === 'diamond') {
                    faceGeo = new T.PlaneGeometry(0.9, 0.9);
                  } else if (shape === 'octagon') {
                    faceGeo = new T.CircleGeometry(0.5, 8);
                  } else if (shape === 'rect') {
                    faceGeo = new T.PlaneGeometry(0.8, 1.0);
                  } else {
                    faceGeo = new T.PlaneGeometry(0.8, 0.8);
                  }
                  // Draw sign face with text via canvas texture
                  try {
                    var sgCan = document.createElement('canvas');
                    sgCan.width = 256; sgCan.height = shape === 'rect' ? 320 : 256;
                    var sgCtx = sgCan.getContext('2d');
                    var faceHex = '#' + faceColor.toString(16).padStart(6, '0');
                    sgCtx.fillStyle = faceHex;
                    if (shape === 'octagon') {
                      sgCtx.beginPath();
                      for (var oi = 0; oi < 8; oi++) {
                        var oa = (oi / 8) * Math.PI * 2 + Math.PI / 8;
                        var ox = 128 + Math.cos(oa) * 120, oy = 128 + Math.sin(oa) * 120;
                        if (oi === 0) sgCtx.moveTo(ox, oy); else sgCtx.lineTo(ox, oy);
                      }
                      sgCtx.closePath(); sgCtx.fill();
                      sgCtx.strokeStyle = '#ffffff'; sgCtx.lineWidth = 8; sgCtx.stroke();
                    } else if (shape === 'diamond') {
                      sgCtx.save(); sgCtx.translate(128, 128); sgCtx.rotate(Math.PI / 4);
                      sgCtx.fillRect(-90, -90, 180, 180);
                      sgCtx.strokeStyle = '#000000'; sgCtx.lineWidth = 6;
                      sgCtx.strokeRect(-90, -90, 180, 180);
                      sgCtx.restore();
                    } else {
                      sgCtx.fillRect(0, 0, sgCan.width, sgCan.height);
                      sgCtx.strokeStyle = labelColor === 0xffffff ? '#ffffff' : '#000000';
                      sgCtx.lineWidth = 8;
                      sgCtx.strokeRect(8, 8, sgCan.width - 16, sgCan.height - 16);
                    }
                    sgCtx.fillStyle = '#' + labelColor.toString(16).padStart(6, '0');
                    var lines = String(label).split('\n');
                    var baseSize = lines.length > 1 ? 48 : 56;
                    sgCtx.font = 'bold ' + baseSize + 'px system-ui, sans-serif';
                    sgCtx.textAlign = 'center';
                    sgCtx.textBaseline = 'middle';
                    var cy = sgCan.height / 2 - (lines.length - 1) * (baseSize / 2);
                    lines.forEach(function(ln, li) { sgCtx.fillText(ln, sgCan.width / 2, cy + li * baseSize); });
                    var sgTex = new T.CanvasTexture(sgCan);
                    var sgMat = new T.MeshBasicMaterial({ map: sgTex, transparent: true, side: T.DoubleSide });
                    var sgMesh = new T.Mesh(faceGeo, sgMat);
                    sgMesh.position.set(roadShoulderX, 2.0, postZ);
                    sgMesh.rotation.y = lm.side === 1 ? -Math.PI / 2 : Math.PI / 2;
                    chunkGroup.add(sgMesh);
                  } catch (sgErr) {
                    // Fallback: plain colored square
                    var faceMat = new T.MeshBasicMaterial({ color: faceColor, side: T.DoubleSide });
                    var faceMesh = new T.Mesh(faceGeo, faceMat);
                    faceMesh.position.set(roadShoulderX, 2.0, postZ);
                    faceMesh.rotation.y = lm.side === 1 ? -Math.PI / 2 : Math.PI / 2;
                    chunkGroup.add(faceMesh);
                  }
                }

                // Pick signs appropriate for each landmark
                if (lt.id === 'school') {
                  addRoadSign('diamond', 0xfacc15, 'SCHOOL\nZONE', 0x000000, 0);
                  addRoadSign('rect', 0xffffff, '20\nMPH', 0x000000, 3);
                } else if (lt.id === 'hospital') {
                  addRoadSign('rect', 0x1e40af, 'H', 0xffffff, 0);
                } else if (lt.id === 'park') {
                  addRoadSign('diamond', 0xfacc15, 'PED\nXING', 0x000000, 0);
                } else if (lt.id === 'fire') {
                  addRoadSign('diamond', 0xfacc15, 'FIRE\nSTA', 0x000000, 0);
                } else if (lt.id === 'police') {
                  addRoadSign('rect', 0xffffff, 'SPEED\nCHECK', 0x000000, 0);
                } else if (lt.id === 'farm') {
                  addRoadSign('diamond', 0xf97316, 'SLOW\nVEHICLE', 0x000000, 0);
                } else if (lt.id === 'market' || lt.id === 'pharmacy') {
                  addRoadSign('rect', 0xffffff, 'PED\nXING', 0x000000, 0);
                }

                // ─── CROSSWALK near pedestrian-heavy landmarks ───
                if (lt.id === 'school' || lt.id === 'park' || lt.id === 'market' || lt.id === 'library' || lt.id === 'pharmacy') {
                  var crosswalkZ = chunkWorldZ + lm.centerY;
                  var cwMat = new T.MeshBasicMaterial({ color: 0xffffff });
                  for (var cwi = -3; cwi <= 3; cwi++) {
                    var cwStripe = new T.Mesh(new T.PlaneGeometry(0.7, 0.3), cwMat);
                    cwStripe.rotation.x = -Math.PI / 2;
                    cwStripe.position.set(cwi * 0.9, 0.016, crosswalkZ);
                    chunkGroup.add(cwStripe);
                  }
                }
              }

              // Determine LOD: chunks > 1 away get simplified rendering for performance.
              // Near chunks (distance 0-1) get full detail; far chunks (2-4) skip ambient + markings
              var chunkDistFromPlayer = Math.abs(ci - currentChunk);
              var isHighLOD = chunkDistFromPlayer <= 1; // full detail only near player
              var isMediumLOD = chunkDistFromPlayer <= 2;
              // ─── BIOME SPEED LIMIT SIGN at start of each chunk ───
              // Teaches students to match their speed to the zone they're in.
              if (ci % 2 === 0 || (chunk.biome === 'rural' && ci % 3 === 0)) {
                var biomeLimit = chunk.biome === 'residential' ? 25 : chunk.biome === 'suburban' ? 35 : chunk.biome === 'commercial' ? 30 : chunk.biome === 'industrial' ? 35 : chunk.biome === 'rural' ? 50 : 30;
                var speedZ = chunkWorldZ + 3;
                var speedSide = ci % 4 < 2 ? 1 : -1;
                var spPost = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), new T.MeshLambertMaterial({ color: 0xd1d5db }));
                spPost.position.set(speedSide * (MAX_ROAD_WIDTH + 1.2), 1.2, speedZ);
                chunkGroup.add(spPost);
                try {
                  var spCan = document.createElement('canvas');
                  spCan.width = 256; spCan.height = 320;
                  var spCtx = spCan.getContext('2d');
                  spCtx.fillStyle = '#ffffff'; spCtx.fillRect(0, 0, 256, 320);
                  spCtx.strokeStyle = '#000000'; spCtx.lineWidth = 10;
                  spCtx.strokeRect(8, 8, 240, 304);
                  spCtx.fillStyle = '#000000';
                  spCtx.font = 'bold 36px system-ui, sans-serif';
                  spCtx.textAlign = 'center';
                  spCtx.fillText('SPEED', 128, 70);
                  spCtx.fillText('LIMIT', 128, 110);
                  spCtx.font = 'bold 140px system-ui, sans-serif';
                  spCtx.fillText(String(biomeLimit), 128, 230);
                  var spTex = new T.CanvasTexture(spCan);
                  var spMat = new T.MeshBasicMaterial({ map: spTex, transparent: true, side: T.DoubleSide });
                  var spFace = new T.Mesh(new T.PlaneGeometry(0.9, 1.15), spMat);
                  spFace.position.set(speedSide * (MAX_ROAD_WIDTH + 1.2), 2.3, speedZ);
                  spFace.rotation.y = speedSide === 1 ? -Math.PI / 2 : Math.PI / 2;
                  chunkGroup.add(spFace);
                } catch (spErr) { /* fallback: post-only */ }
              }

              // ─── AMBIENT DETAILS: mailboxes, fire hydrants, streetlights along the road ───
              // LOD gate: skip ambient entirely on distant chunks (cut ~40 meshes per chunk)
              if (isMediumLOD) {
              // These add life without adding obstacles — all placed in the shoulder grass area.
              var ambientRng = seededRandom(chunk.index * 31337 + 7);
              for (var ambI = 2; ambI < CHUNK_SIZE - 2; ambI += 4) {
                var ambSide = ambientRng() < 0.5 ? 1 : -1;
                var ambRoll = ambientRng();
                var ambX = ambSide * (MAX_ROAD_WIDTH + CLEARANCE_BUFFER + 0.3);
                var ambZ = chunkWorldZ + ambI + Math.floor(ambientRng() * 2);
                // Don't place ambient details at intersections
                if (chunk.hasIntersection && Math.abs(ambI - chunk.intersectionY) < 4) continue;
                // Don't place ambient details too close to landmark footprint
                var skipAmb = false;
                if (chunk.landmark) {
                  var lmSide = chunk.landmark.side;
                  if (ambSide === lmSide && Math.abs(ambI - chunk.landmark.centerY) < chunk.landmark.type.size / 2 + 1) skipAmb = true;
                }
                if (skipAmb) continue;
                if (ambRoll < 0.25) {
                  // Mailbox (residential biome weighting)
                  if (chunk.biome === 'residential' || chunk.biome === 'suburban' || chunk.biome === 'rural') {
                    var mbPost = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.0, 5), new T.MeshLambertMaterial({ color: 0x78350f }));
                    mbPost.position.set(ambX, 0.5, ambZ);
                    chunkGroup.add(mbPost);
                    var mbBox = new T.Mesh(new T.BoxGeometry(0.4, 0.25, 0.25), new T.MeshLambertMaterial({ color: 0x4b5563 }));
                    mbBox.position.set(ambX, 1.1, ambZ);
                    chunkGroup.add(mbBox);
                    var mbFlag = new T.Mesh(new T.BoxGeometry(0.02, 0.12, 0.18), new T.MeshLambertMaterial({ color: 0xdc2626 }));
                    mbFlag.position.set(ambX + ambSide * 0.22, 1.22, ambZ);
                    chunkGroup.add(mbFlag);
                  }
                } else if (ambRoll < 0.4) {
                  // Fire hydrant (all biomes except rural)
                  if (chunk.biome !== 'rural') {
                    var fhBase = new T.Mesh(new T.CylinderGeometry(0.15, 0.18, 0.5, 8), new T.MeshLambertMaterial({ color: 0xdc2626 }));
                    fhBase.position.set(ambX, 0.25, ambZ);
                    chunkGroup.add(fhBase);
                    var fhTop = new T.Mesh(new T.SphereGeometry(0.17, 8, 6), new T.MeshLambertMaterial({ color: 0xdc2626 }));
                    fhTop.position.set(ambX, 0.55, ambZ);
                    chunkGroup.add(fhTop);
                    var fhNozzle = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.2, 5), new T.MeshLambertMaterial({ color: 0x4b5563 }));
                    fhNozzle.rotation.z = Math.PI / 2;
                    fhNozzle.position.set(ambX - ambSide * 0.2, 0.35, ambZ);
                    chunkGroup.add(fhNozzle);
                  }
                } else if (ambRoll < 0.58) {
                  // Streetlight (urban/suburban)
                  if (chunk.biome === 'commercial' || chunk.biome === 'suburban' || chunk.biome === 'residential') {
                    var slPole = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 4.2, 6), new T.MeshLambertMaterial({ color: 0x4b5563 }));
                    slPole.position.set(ambX, 2.1, ambZ);
                    chunkGroup.add(slPole);
                    var slArm = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.2, 4), new T.MeshLambertMaterial({ color: 0x4b5563 }));
                    slArm.rotation.z = Math.PI / 2;
                    slArm.position.set(ambX - ambSide * 0.6, 4.0, ambZ);
                    chunkGroup.add(slArm);
                    var slHead = new T.Mesh(new T.BoxGeometry(0.3, 0.15, 0.5), new T.MeshBasicMaterial({ color: scn.time === 'night' || scn.time === 'dawn' ? 0xfef3c7 : 0x4b5563 }));
                    slHead.position.set(ambX - ambSide * 1.1, 3.9, ambZ);
                    chunkGroup.add(slHead);
                  }
                } else if (ambRoll < 0.72) {
                  // Bench (near parks/schools/libraries in commercial/suburban areas)
                  if (chunk.biome === 'commercial' || chunk.biome === 'suburban') {
                    var bchBase = new T.Mesh(new T.BoxGeometry(1.3, 0.12, 0.35), new T.MeshLambertMaterial({ color: 0x78350f }));
                    bchBase.position.set(ambX, 0.35, ambZ);
                    chunkGroup.add(bchBase);
                    var bchBack = new T.Mesh(new T.BoxGeometry(1.3, 0.5, 0.08), new T.MeshLambertMaterial({ color: 0x78350f }));
                    bchBack.position.set(ambX + ambSide * 0.15, 0.65, ambZ);
                    chunkGroup.add(bchBack);
                  }
                } else if (ambRoll < 0.88) {
                  // ─── Parked cars along the shoulder (commercial/residential/suburban) ───
                  // Teaches students to watch for doors opening, people exiting, cars pulling out
                  if (chunk.biome === 'commercial' || chunk.biome === 'residential' || chunk.biome === 'suburban') {
                    var carColors = [0xdc2626, 0x1e40af, 0x059669, 0x78350f, 0xf59e0b, 0x4b5563, 0xfef3c7, 0x1a1a2e];
                    var parkedCarX = ambSide * (MAX_ROAD_WIDTH + 0.9); // just off the road, closer than other ambient
                    var parkedColor = carColors[Math.floor(ambientRng() * carColors.length)];
                    // Car body
                    var pcBody = new T.Mesh(new T.BoxGeometry(1.6, 0.8, 0.7), new T.MeshLambertMaterial({ color: parkedColor }));
                    pcBody.position.set(parkedCarX, 0.5, ambZ);
                    pcBody.castShadow = true;
                    chunkGroup.add(pcBody);
                    // Car roof/cabin (darker)
                    var pcCabin = new T.Mesh(new T.BoxGeometry(0.9, 0.45, 0.65), new T.MeshLambertMaterial({ color: Math.max(0, parkedColor - 0x202020) }));
                    pcCabin.position.set(parkedCarX + 0.05, 1.05, ambZ);
                    chunkGroup.add(pcCabin);
                    // Windows (glass)
                    var pcWinMat = new T.MeshLambertMaterial({ color: 0x1e293b, emissive: 0x0f172a });
                    var pcWinFront = new T.Mesh(new T.BoxGeometry(0.1, 0.35, 0.5), pcWinMat);
                    pcWinFront.position.set(parkedCarX + 0.45, 1.05, ambZ);
                    chunkGroup.add(pcWinFront);
                    var pcWinBack = new T.Mesh(new T.BoxGeometry(0.1, 0.35, 0.5), pcWinMat);
                    pcWinBack.position.set(parkedCarX - 0.35, 1.05, ambZ);
                    chunkGroup.add(pcWinBack);
                    // Wheels (4 small black cylinders)
                    var wheelMat = new T.MeshLambertMaterial({ color: 0x1a1a1a });
                    [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]].forEach(function(wp) {
                      var wheel = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 0.12, 8), wheelMat);
                      wheel.rotation.x = Math.PI / 2;
                      wheel.position.set(parkedCarX + wp[0], 0.18, ambZ + wp[1]);
                      chunkGroup.add(wheel);
                    });
                    // Headlights (facing outward so visible at night/dawn)
                    if (scn.time === 'night' || scn.time === 'dawn') {
                      var hlMat = new T.MeshBasicMaterial({ color: 0xfef3c7 });
                      var hl1 = new T.Mesh(new T.SphereGeometry(0.08, 6, 4), hlMat);
                      hl1.position.set(parkedCarX + 0.75, 0.5, ambZ - 0.2);
                      chunkGroup.add(hl1);
                      var hl2 = new T.Mesh(new T.SphereGeometry(0.08, 6, 4), hlMat);
                      hl2.position.set(parkedCarX + 0.75, 0.5, ambZ + 0.2);
                      chunkGroup.add(hl2);
                    }
                  }
                }
              }
              } // end isMediumLOD gate

              // ─── ROADSIDE FURNITURE ────────────────────────────────────
              // Mile markers, mailboxes, and guardrails on tight curves.
              // All anchored to the spline so they line the road on bends.
              if (isHighLOD && iw.spline) {
                var furnRng = seededRandom(chunk.index * 33391 + 7);
                var chunkBY = ci * CHUNK_SIZE;
                var lookupCenterAtZ = function(worldZ) {
                  return iw.spline.centerAt(worldZ - chunkWorldZ + chunkBY) - MAP_SIZE / 2;
                };
                var lookupHeightAtZ = function(worldZ) {
                  return iw.spline.heightAt(worldZ - chunkWorldZ + chunkBY);
                };
                // Guardrails on tight curves: place on the OUTSIDE of any bend
                // where |heading| exceeds a threshold. Two visual elements per
                // segment — post + horizontal beam — so it reads as W-beam rail.
                var grMat = new T.MeshLambertMaterial({ color: 0xa8b0bc });
                var grPostMat = new T.MeshLambertMaterial({ color: 0x4a4a52 });
                var crackMat = new T.MeshBasicMaterial({ color: 0x16181c, transparent: true, opacity: 0.55 });
                for (var grZ = chunkWorldZ + 2; grZ < chunkWorldZ + CHUNK_SIZE - 2; grZ += 2) {
                  var grHd = iw.spline.headingAt(grZ - chunkWorldZ + chunkBY);
                  if (Math.abs(grHd) < 0.18) continue;
                  var grSide = grHd > 0 ? 1 : -1;
                  var grCx = lookupCenterAtZ(grZ);
                  var grHy = lookupHeightAtZ(grZ);
                  var grPost = new T.Mesh(new T.BoxGeometry(0.08, 0.7, 0.08), grPostMat);
                  grPost.position.set(grCx + grSide * 4.0, grHy + 0.35, grZ);
                  chunkGroup.add(grPost);
                  var grRail = new T.Mesh(new T.BoxGeometry(0.06, 0.18, 2.0), grMat);
                  grRail.position.set(grCx + grSide * 4.0, grHy + 0.55, grZ);
                  chunkGroup.add(grRail);
                  // Crack on the outside wheel track — stress fractures form where
                  // tires track the tightest radius. Skip snow (covered anyway).
                  if (scn.weather !== 'snow' && furnRng() < 0.6) {
                    var crLen = 0.8 + furnRng() * 1.0;
                    var crWid = 0.04 + furnRng() * 0.04;
                    var cr = new T.Mesh(new T.PlaneGeometry(crWid, crLen), crackMat);
                    cr.rotation.x = -Math.PI / 2;
                    cr.rotation.z = (furnRng() - 0.5) * 0.6;
                    cr.position.set(grCx + grSide * (1.5 + furnRng() * 0.9), grHy + 0.016, grZ + (furnRng() - 0.5) * 1.5);
                    chunkGroup.add(cr);
                  }
                  // Skid streak — long thin black smear on the inside line where
                  // braking-while-turning leaves rubber. Less common than cracks.
                  if (scn.weather !== 'snow' && furnRng() < 0.3) {
                    var skidMat = new T.MeshBasicMaterial({ color: 0x0a0a10, transparent: true, opacity: 0.5 });
                    var skid = new T.Mesh(new T.PlaneGeometry(0.18, 2.4 + furnRng() * 1.5), skidMat);
                    skid.rotation.x = -Math.PI / 2;
                    skid.rotation.z = grHd; // align with the road tangent
                    skid.position.set(grCx + (grHd > 0 ? -1 : 1) * (1.6 + furnRng() * 0.5), grHy + 0.017, grZ);
                    chunkGroup.add(skid);
                  }
                }
                // Mile markers — small reflective post every ~16 cells, alternating sides
                for (var mmZ = chunkWorldZ + 4; mmZ < chunkWorldZ + CHUNK_SIZE - 4; mmZ += 16) {
                  var mmCx = lookupCenterAtZ(mmZ);
                  var mmHy = lookupHeightAtZ(mmZ);
                  var mmSide = ((Math.floor(mmZ) >> 4) & 1) ? 1 : -1;
                  var mmPost = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.9, 5), grPostMat);
                  mmPost.position.set(mmCx + mmSide * 4.2, mmHy + 0.45, mmZ);
                  chunkGroup.add(mmPost);
                  var mmTop = new T.Mesh(new T.BoxGeometry(0.12, 0.18, 0.04), new T.MeshBasicMaterial({ color: 0xffffff }));
                  mmTop.position.set(mmCx + mmSide * 4.2, mmHy + 0.85, mmZ);
                  chunkGroup.add(mmTop);
                }
                // Deer at the forest edge (rural only). Box-body + cylinder neck
                // + small head + four leg cylinders. Stand quiet — visual only,
                // no AI. Players who already learned about Maine moose risk see
                // the same scan-the-treeline cue here.
                if (chunk.biome === 'rural' && furnRng() < 0.32) {
                  var deerCount = 1 + Math.floor(furnRng() * 2);
                  var deerMat = new T.MeshLambertMaterial({ color: 0x8a5a32 });
                  var deerWhite = new T.MeshLambertMaterial({ color: 0xefe0c8 });
                  for (var di = 0; di < deerCount; di++) {
                    var dZ = chunkWorldZ + 4 + furnRng() * (CHUNK_SIZE - 8);
                    var dSide = furnRng() < 0.5 ? -1 : 1;
                    var dCx = lookupCenterAtZ(dZ);
                    var dHy = lookupHeightAtZ(dZ);
                    var dDist = 7 + furnRng() * 4;
                    var dxw = dCx + dSide * dDist;
                    var dGroup = new T.Group();
                    var dBody = new T.Mesh(new T.BoxGeometry(1.1, 0.45, 0.4), deerMat);
                    dBody.position.set(0, 0.85, 0);
                    dGroup.add(dBody);
                    var dRump = new T.Mesh(new T.BoxGeometry(0.18, 0.18, 0.42), deerWhite);
                    dRump.position.set(-0.55, 0.95, 0);
                    dGroup.add(dRump);
                    var dNeck = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.5, 6), deerMat);
                    dNeck.position.set(0.5, 1.15, 0);
                    dNeck.rotation.z = -Math.PI / 4;
                    dGroup.add(dNeck);
                    var dHead = new T.Mesh(new T.BoxGeometry(0.32, 0.18, 0.18), deerMat);
                    dHead.position.set(0.78, 1.4, 0);
                    dGroup.add(dHead);
                    // Four legs
                    [[-0.45, 0.18], [-0.45, -0.18], [0.45, 0.18], [0.45, -0.18]].forEach(function(lp) {
                      var leg = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.7, 5), deerMat);
                      leg.position.set(lp[0], 0.35, lp[1]);
                      dGroup.add(leg);
                    });
                    // Face the road so the silhouette reads from the player's POV.
                    dGroup.position.set(dxw, dHy, dZ);
                    dGroup.rotation.y = dSide < 0 ? 0 : Math.PI;
                    chunkGroup.add(dGroup);
                  }
                }
                // Wildflowers & grass tufts in rural/residential shoulders.
                // Tiny billboards so they read as color specks without adding geometry cost.
                if (chunk.biome === 'rural' || chunk.biome === 'residential') {
                  var flowerColors = [0xf5e050, 0xe85a7a, 0xb050e0, 0xffffff, 0xff9040];
                  var tuftMat = new T.MeshLambertMaterial({ color: scn.weather === 'snow' ? 0xeef2f7 : 0x5a8a3a });
                  var flowerCount = chunk.biome === 'rural' ? 14 : 6;
                  for (var fli = 0; fli < flowerCount; fli++) {
                    var flZ = chunkWorldZ + 1 + furnRng() * (CHUNK_SIZE - 2);
                    var flSide = furnRng() < 0.5 ? -1 : 1;
                    var flDist = 3.7 + furnRng() * 3.5;
                    var flCx = lookupCenterAtZ(flZ);
                    var flHy = lookupHeightAtZ(flZ);
                    if (furnRng() < 0.4 && scn.weather !== 'snow') {
                      // Flower: colored sphere on tiny stem
                      var petalMat = new T.MeshBasicMaterial({ color: flowerColors[Math.floor(furnRng() * flowerColors.length)] });
                      var petal = new T.Mesh(new T.SphereGeometry(0.06, 4, 3), petalMat);
                      petal.position.set(flCx + flSide * flDist, flHy + 0.18, flZ);
                      chunkGroup.add(petal);
                    } else {
                      // Grass tuft: tiny flat triangle
                      var tuft = new T.Mesh(new T.ConeGeometry(0.08, 0.22, 4), tuftMat);
                      tuft.position.set(flCx + flSide * flDist, flHy + 0.11, flZ);
                      chunkGroup.add(tuft);
                    }
                  }
                }
                // Streetlights (commercial/suburban/industrial) — tall curved arm
                // with a lamp head. At night the head emits a soft glow sphere.
                if (chunk.biome === 'commercial' || chunk.biome === 'suburban' || chunk.biome === 'industrial') {
                  var isNightSL = scn.time === 'night' || scn.id === 'night';
                  var slPoleMat = new T.MeshLambertMaterial({ color: 0x2a2e34 });
                  for (var slZ = chunkWorldZ + 6; slZ < chunkWorldZ + CHUNK_SIZE - 6; slZ += 10) {
                    var slSide = ((Math.floor(slZ) / 10) & 1) ? 1 : -1;
                    var slCx = lookupCenterAtZ(slZ);
                    var slHy = lookupHeightAtZ(slZ);
                    // Vertical pole
                    var slPole = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 5.5, 6), slPoleMat);
                    slPole.position.set(slCx + slSide * 4.5, slHy + 2.75, slZ);
                    chunkGroup.add(slPole);
                    // Curved arm over the road
                    var slArm = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.5, 4), slPoleMat);
                    slArm.position.set(slCx + slSide * 3.3, slHy + 5.4, slZ);
                    slArm.rotation.z = Math.PI / 2;
                    chunkGroup.add(slArm);
                    // Lamp head
                    var slHead = new T.Mesh(new T.BoxGeometry(0.4, 0.14, 0.22), new T.MeshLambertMaterial({ color: 0x1a1a1a }));
                    slHead.position.set(slCx + slSide * 2.1, slHy + 5.3, slZ);
                    chunkGroup.add(slHead);
                    // Glowing bulb + sodium-halo sphere at night
                    if (isNightSL) {
                      var slBulb = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), new T.MeshBasicMaterial({ color: 0xffdc8a }));
                      slBulb.position.set(slCx + slSide * 2.1, slHy + 5.22, slZ);
                      chunkGroup.add(slBulb);
                      var slHalo = new T.Mesh(new T.SphereGeometry(0.6, 8, 6), new T.MeshBasicMaterial({ color: 0xffdc8a, transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false }));
                      slHalo.position.set(slCx + slSide * 2.1, slHy + 5.22, slZ);
                      chunkGroup.add(slHalo);
                    }
                  }
                }
                // Utility poles & drooping wires (residential/rural) — wooden pole
                // + crossbar + two droop-shaped line segments per span.
                if (chunk.biome === 'residential' || chunk.biome === 'rural') {
                  var upMat = new T.MeshLambertMaterial({ color: 0x6a4a2e });
                  var wireMat = new T.MeshBasicMaterial({ color: 0x1a1a1a });
                  var upSpacing = 12;
                  var upStarts = [];
                  for (var upZ = chunkWorldZ + 3; upZ < chunkWorldZ + CHUNK_SIZE - 3; upZ += upSpacing) {
                    var upSide = 1; // always on same side for a clean wire line
                    var upCx = lookupCenterAtZ(upZ);
                    var upHy = lookupHeightAtZ(upZ);
                    var upX = upCx + upSide * 5.2;
                    upStarts.push({ x: upX, y: upHy, z: upZ });
                    var upPole = new T.Mesh(new T.CylinderGeometry(0.09, 0.13, 6.5, 6), upMat);
                    upPole.position.set(upX, upHy + 3.25, upZ);
                    chunkGroup.add(upPole);
                    var upBar = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 1.4), upMat);
                    upBar.position.set(upX, upHy + 5.8, upZ);
                    chunkGroup.add(upBar);
                  }
                  // Draw wires between consecutive poles — a thin slightly-drooping
                  // cylinder approximates a catenary without per-chunk shader cost.
                  var crowMat = new T.MeshLambertMaterial({ color: 0x0a0a10 });
                  for (var wi = 0; wi < upStarts.length - 1; wi++) {
                    var pA = upStarts[wi], pB = upStarts[wi + 1];
                    [-0.45, 0.45].forEach(function(attach) {
                      var wLen = Math.hypot(pB.z - pA.z, pB.y - pA.y);
                      var wMid = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, wLen, 3), wireMat);
                      wMid.position.set(pA.x, (pA.y + pB.y) / 2 + 5.7, (pA.z + pB.z) / 2);
                      wMid.rotation.x = Math.PI / 2;
                      wMid.position.z = (pA.z + pB.z) / 2;
                      wMid.position.x = pA.x + attach * 0.001;
                      chunkGroup.add(wMid);
                    });
                    // Crows: 30% chance per span, 1-3 birds spaced along the wire.
                    if (furnRng() < 0.3) {
                      var crowCount = 1 + Math.floor(furnRng() * 3);
                      for (var ci2 = 0; ci2 < crowCount; ci2++) {
                        var crT = (ci2 + 1) / (crowCount + 1) + (furnRng() - 0.5) * 0.1;
                        var crZ = pA.z + (pB.z - pA.z) * crT;
                        var crY = pA.y + 5.7;
                        // Body
                        var crBody = new T.Mesh(new T.BoxGeometry(0.18, 0.16, 0.12), crowMat);
                        crBody.position.set(pA.x, crY + 0.13, crZ);
                        crBody.rotation.y = furnRng() * Math.PI * 0.4 - 0.2;
                        chunkGroup.add(crBody);
                        // Tiny beak
                        var crBeak = new T.Mesh(new T.ConeGeometry(0.025, 0.08, 4), new T.MeshLambertMaterial({ color: 0x4a3a20 }));
                        crBeak.rotation.z = -Math.PI / 2;
                        crBeak.position.set(pA.x + 0.12, crY + 0.16, crZ);
                        chunkGroup.add(crBeak);
                      }
                    }
                  }
                }
                // Rural lake — occasional distant water body. Blue ellipse disc
                // with a darker shore ring so it reads as a lake surrounded by mud/rocks.
                if (chunk.biome === 'rural' && furnRng() < 0.18) {
                  var lkSide = furnRng() < 0.5 ? -1 : 1;
                  var lkZ = chunkWorldZ + CHUNK_SIZE / 2;
                  var lkCx = lookupCenterAtZ(lkZ);
                  var lkHy = lookupHeightAtZ(lkZ);
                  var lkX = lkCx + lkSide * 28;
                  var lkR = 6 + furnRng() * 4;
                  // Shore ring
                  var shoreMat = new T.MeshLambertMaterial({ color: 0x7a6644 });
                  var shore = new T.Mesh(new T.CircleGeometry(lkR + 1.1, 24), shoreMat);
                  shore.rotation.x = -Math.PI / 2;
                  shore.position.set(lkX, lkHy - 0.02, lkZ);
                  chunkGroup.add(shore);
                  // Water surface (MeshBasicMaterial so it glows faintly on its own)
                  var waterMat = new T.MeshBasicMaterial({ color: scn.weather === 'snow' ? 0x6a8abc : 0x3f6b9e, transparent: true, opacity: 0.9 });
                  var water = new T.Mesh(new T.CircleGeometry(lkR, 28), waterMat);
                  water.rotation.x = -Math.PI / 2;
                  water.position.set(lkX, lkHy + 0.01, lkZ);
                  water.scale.z = 0.7; // make lakes oval
                  water.name = 'lake_surface';
                  water._basePhase = furnRng() * Math.PI * 2;
                  chunkGroup.add(water);
                  // A couple of dockside reeds as vertical accents
                  var reedMat = new T.MeshLambertMaterial({ color: scn.weather === 'snow' ? 0xc4caca : 0x5a7a3a });
                  for (var rdi = 0; rdi < 4; rdi++) {
                    var rdAng = rdi / 4 * Math.PI * 2 + furnRng() * 0.5;
                    var reed = new T.Mesh(new T.BoxGeometry(0.05, 0.9, 0.05), reedMat);
                    reed.position.set(lkX + Math.cos(rdAng) * (lkR + 0.4), lkHy + 0.45, lkZ + Math.sin(rdAng) * (lkR + 0.4));
                    chunkGroup.add(reed);
                  }
                }
                // Overhead bridge — concrete span crossing the road. Once per
                // ~15 chunks; positioned mid-chunk and not on intersections.
                if (!chunk.hasIntersection && (Math.floor(chunk.index) % 17) === 5) {
                  var bgZ = chunkWorldZ + CHUNK_SIZE / 2;
                  var bgCx = lookupCenterAtZ(bgZ);
                  var bgHy = lookupHeightAtZ(bgZ);
                  var bridgeMat = new T.MeshLambertMaterial({ color: 0x9aa3ad });
                  var bridgeShade = new T.MeshLambertMaterial({ color: 0x6f7882 });
                  // Span deck — wide enough to clear a crossing road; thick slab
                  var deck = new T.Mesh(new T.BoxGeometry(20, 0.6, 4), bridgeMat);
                  deck.position.set(bgCx, bgHy + 5.0, bgZ);
                  deck.castShadow = true;
                  chunkGroup.add(deck);
                  // Underside shadow strip
                  var deckU = new T.Mesh(new T.BoxGeometry(20, 0.05, 3.8), bridgeShade);
                  deckU.position.set(bgCx, bgHy + 4.65, bgZ);
                  chunkGroup.add(deckU);
                  // Two abutments either side of the road
                  [-1, 1].forEach(function(abS) {
                    var abut = new T.Mesh(new T.BoxGeometry(2.5, 5, 4), bridgeMat);
                    abut.position.set(bgCx + abS * 7.5, bgHy + 2.5, bgZ);
                    abut.castShadow = true;
                    chunkGroup.add(abut);
                  });
                  // Guard parapet on top edges
                  [-1, 1].forEach(function(pS) {
                    var par = new T.Mesh(new T.BoxGeometry(20, 0.5, 0.2), bridgeMat);
                    par.position.set(bgCx, bgHy + 5.55, bgZ + pS * 1.9);
                    chunkGroup.add(par);
                  });
                }
                // Rural farm structures — occasional red barn + silo set back from
                // the road. Placed at most once per chunk to avoid barn-row effect.
                if (chunk.biome === 'rural' && furnRng() < 0.35) {
                  var barnSide = furnRng() < 0.5 ? -1 : 1;
                  var barnZ = chunkWorldZ + 6 + furnRng() * (CHUNK_SIZE - 12);
                  var barnCx = lookupCenterAtZ(barnZ);
                  var barnHy = lookupHeightAtZ(barnZ);
                  var barnX = barnCx + barnSide * 12;
                  var barnMat = new T.MeshLambertMaterial({ color: 0xa82828 });
                  var barnRoofMat = new T.MeshLambertMaterial({ color: 0x3a2418 });
                  var barnBody = new T.Mesh(new T.BoxGeometry(3.5, 2.6, 4.5), barnMat);
                  barnBody.position.set(barnX, barnHy + 1.3, barnZ);
                  barnBody.castShadow = true;
                  chunkGroup.add(barnBody);
                  var barnRoof = new T.Mesh(new T.ConeGeometry(2.3, 1.8, 4), barnRoofMat);
                  barnRoof.rotation.y = Math.PI / 4;
                  barnRoof.position.set(barnX, barnHy + 3.5, barnZ);
                  barnRoof.scale.set(1.4, 1, 1);
                  chunkGroup.add(barnRoof);
                  var barnDoor = new T.Mesh(new T.PlaneGeometry(1.0, 1.6), new T.MeshLambertMaterial({ color: 0xf5f0e0 }));
                  barnDoor.position.set(barnX + (barnSide < 0 ? 1.76 : -1.76), barnHy + 0.8, barnZ);
                  barnDoor.rotation.y = barnSide < 0 ? -Math.PI / 2 : Math.PI / 2;
                  chunkGroup.add(barnDoor);
                  var siloMat = new T.MeshLambertMaterial({ color: 0xbcc4cc });
                  var silo = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 4.5, 14), siloMat);
                  silo.position.set(barnX + barnSide * 2.8, barnHy + 2.25, barnZ - 1.2);
                  silo.castShadow = true;
                  chunkGroup.add(silo);
                  var siloCap = new T.Mesh(new T.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
                  siloCap.position.set(barnX + barnSide * 2.8, barnHy + 4.5, barnZ - 1.2);
                  chunkGroup.add(siloCap);
                  var hayMat = new T.MeshLambertMaterial({ color: 0xd4b564 });
                  for (var hbi = 0; hbi < 2; hbi++) {
                    var hay = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 0.8, 10), hayMat);
                    hay.rotation.z = Math.PI / 2;
                    hay.position.set(barnX - barnSide * 2.8, barnHy + 0.45, barnZ + 2 + hbi * 1.0);
                    chunkGroup.add(hay);
                  }
                  // Farmhouse window glow + halo at night — sells "someone's home"
                  // and gives players landmarks to navigate by in pitch dark.
                  if (scn.time === 'night' || scn.id === 'night') {
                    var farmWinMat = new T.MeshBasicMaterial({ color: 0xffd070 });
                    var farmWin = new T.Mesh(new T.PlaneGeometry(0.5, 0.5), farmWinMat);
                    farmWin.position.set(barnX + (barnSide < 0 ? 1.77 : -1.77), barnHy + 1.6, barnZ + 0.8);
                    farmWin.rotation.y = barnSide < 0 ? -Math.PI / 2 : Math.PI / 2;
                    chunkGroup.add(farmWin);
                    var farmHalo = new T.Mesh(new T.SphereGeometry(0.9, 8, 6), new T.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false }));
                    farmHalo.position.copy(farmWin.position);
                    farmHalo.name = 'farm_glow';
                    farmHalo._twPhase = furnRng() * Math.PI * 2;
                    chunkGroup.add(farmHalo);
                  }
                }
                // Fence lines along pasture-adjacent rural stretches.
                // White picket-style posts every 2m on one side for ~half the chunk.
                if (chunk.biome === 'rural' && furnRng() < 0.6) {
                  var fnMat = new T.MeshLambertMaterial({ color: 0xe8e4d6 });
                  var fnSide = furnRng() < 0.5 ? -1 : 1;
                  var fnStart = chunkWorldZ + 2;
                  var fnEnd = chunkWorldZ + CHUNK_SIZE / 2 + furnRng() * (CHUNK_SIZE / 2 - 4);
                  for (var fnZ = fnStart; fnZ < fnEnd; fnZ += 1.4) {
                    var fnCx = lookupCenterAtZ(fnZ);
                    var fnHy = lookupHeightAtZ(fnZ);
                    var fnPost = new T.Mesh(new T.BoxGeometry(0.06, 0.6, 0.06), fnMat);
                    fnPost.position.set(fnCx + fnSide * 5.5, fnHy + 0.3, fnZ);
                    chunkGroup.add(fnPost);
                  }
                  // Two horizontal rails spanning the fence.
                  var fnRailLen = fnEnd - fnStart;
                  [0.22, 0.48].forEach(function(fnY) {
                    var fnRail = new T.Mesh(new T.BoxGeometry(0.05, 0.05, fnRailLen), fnMat);
                    fnRail.position.set(lookupCenterAtZ((fnStart + fnEnd) / 2) + fnSide * 5.5,
                      lookupHeightAtZ((fnStart + fnEnd) / 2) + fnY, (fnStart + fnEnd) / 2);
                    chunkGroup.add(fnRail);
                  });
                }
                // Mailboxes in residential/rural biomes — small box on a stick.
                if (chunk.biome === 'residential' || chunk.biome === 'rural') {
                  var mbCount = chunk.biome === 'residential' ? 3 : 1;
                  var mbBoxMat = new T.MeshLambertMaterial({ color: 0x9a8a72 });
                  var mbPostMat = new T.MeshLambertMaterial({ color: 0x6a4a2a });
                  for (var mbI = 0; mbI < mbCount; mbI++) {
                    var mbZ = chunkWorldZ + 4 + furnRng() * (CHUNK_SIZE - 8);
                    var mbSide = furnRng() < 0.5 ? -1 : 1;
                    var mbCx = lookupCenterAtZ(mbZ);
                    var mbHy = lookupHeightAtZ(mbZ);
                    var mbPost = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.0, 5), mbPostMat);
                    mbPost.position.set(mbCx + mbSide * 4.0, mbHy + 0.5, mbZ);
                    chunkGroup.add(mbPost);
                    var mbBox = new T.Mesh(new T.BoxGeometry(0.35, 0.2, 0.18), mbBoxMat);
                    mbBox.position.set(mbCx + mbSide * 4.0, mbHy + 1.05, mbZ);
                    chunkGroup.add(mbBox);
                  }
                }
              }

              // Road surface for this chunk — built as a curved ribbon following
              // chunk.roadCenters[cy]. Two verts per row (left edge, right edge);
              // the strip is triangulated via two triangles between consecutive rows.
              var roadHalfW = 3.5; // matches legacy 7-unit width
              // Vertex-colored asphalt: each row gets a slightly different shade
              // seeded by world Y, so the road reads as patched/weathered instead
              // of a single flat gray. Snow biomes desaturate the palette.
              var roadMat = new T.MeshLambertMaterial({ vertexColors: true });
              var asphaltBase = scn.weather === 'snow' ? [0x8c9ba8, 0x7d8c9a, 0x9aa7b4] : [0x333842, 0x2a2f38, 0x3c424c, 0x2e333d];
              var ribbonRows = CHUNK_SIZE + 1;
              var ribbonVerts = new Float32Array(ribbonRows * 2 * 3);
              var ribbonUvs = new Float32Array(ribbonRows * 2 * 2);
              var ribbonCols = new Float32Array(ribbonRows * 2 * 3);
              var ribbonIdx = new Uint16Array((ribbonRows - 1) * 6);
              var ribbonChunkBaseY = ci * CHUNK_SIZE;
              for (var rr = 0; rr < ribbonRows; rr++) {
                var sampleY = ribbonChunkBaseY + rr;
                var cellCenter = iw.spline ? iw.spline.centerAt(sampleY) : (chunk.roadCenters[Math.min(rr, CHUNK_SIZE - 1)]);
                var worldCx = cellCenter - MAP_SIZE / 2;
                var worldZ = chunkWorldZ + rr;
                // Elevation: same heightAt() that the player car samples, so the car
                // stays planted on the road instead of floating or sinking into hills.
                var rowH = iw.spline ? iw.spline.heightAt(sampleY) : 0;
                // Banking: tilt the strip around its tangent on tight curves.
                // bank ≈ -heading × factor → outside edge raised, inside lowered (proper superelevation).
                var rowHd = iw.spline ? iw.spline.headingAt(sampleY) : 0;
                var bank = -rowHd * 0.6; // radians of roll; gentle so it reads as banking, not a wall
                var bankLift = Math.sin(bank) * roadHalfW;
                ribbonVerts[(rr * 2 + 0) * 3 + 0] = worldCx - roadHalfW;
                ribbonVerts[(rr * 2 + 0) * 3 + 1] = rowH + 0.011 - bankLift;
                ribbonVerts[(rr * 2 + 0) * 3 + 2] = worldZ;
                ribbonVerts[(rr * 2 + 1) * 3 + 0] = worldCx + roadHalfW;
                ribbonVerts[(rr * 2 + 1) * 3 + 1] = rowH + 0.011 + bankLift;
                ribbonVerts[(rr * 2 + 1) * 3 + 2] = worldZ;
                ribbonUvs[(rr * 2 + 0) * 2 + 0] = 0;
                ribbonUvs[(rr * 2 + 0) * 2 + 1] = rr / ribbonRows;
                ribbonUvs[(rr * 2 + 1) * 2 + 0] = 1;
                ribbonUvs[(rr * 2 + 1) * 2 + 1] = rr / ribbonRows;
                // Per-vertex asphalt shade. Pick from the palette via a hash of
                // world Y so the same stretch always renders the same wear.
                var asphIdx = ((sampleY * 9301 + 49297) % asphaltBase.length + asphaltBase.length) % asphaltBase.length;
                var asphC = asphaltBase[asphIdx];
                var ar = ((asphC >> 16) & 0xff) / 255;
                var ag = ((asphC >>  8) & 0xff) / 255;
                var ab = ( asphC        & 0xff) / 255;
                ribbonCols[(rr * 2 + 0) * 3 + 0] = ar;
                ribbonCols[(rr * 2 + 0) * 3 + 1] = ag;
                ribbonCols[(rr * 2 + 0) * 3 + 2] = ab;
                ribbonCols[(rr * 2 + 1) * 3 + 0] = ar;
                ribbonCols[(rr * 2 + 1) * 3 + 1] = ag;
                ribbonCols[(rr * 2 + 1) * 3 + 2] = ab;
              }
              for (var ri = 0; ri < ribbonRows - 1; ri++) {
                var a = ri * 2, b = ri * 2 + 1, c = (ri + 1) * 2, d = (ri + 1) * 2 + 1;
                ribbonIdx[ri * 6 + 0] = a;
                ribbonIdx[ri * 6 + 1] = c;
                ribbonIdx[ri * 6 + 2] = b;
                ribbonIdx[ri * 6 + 3] = b;
                ribbonIdx[ri * 6 + 4] = c;
                ribbonIdx[ri * 6 + 5] = d;
              }
              var roadGeo = new T.BufferGeometry();
              roadGeo.setAttribute('position', new T.BufferAttribute(ribbonVerts, 3));
              roadGeo.setAttribute('uv', new T.BufferAttribute(ribbonUvs, 2));
              roadGeo.setAttribute('color', new T.BufferAttribute(ribbonCols, 3));
              roadGeo.setIndex(new T.BufferAttribute(ribbonIdx, 1));
              roadGeo.computeVertexNormals();
              var road = new T.Mesh(roadGeo, roadMat);
              road.receiveShadow = true;
              chunkGroup.add(road);

              // ─── ROAD MARKINGS (painted on the road surface) ───
              // LOD: markings only on near chunks (this is the biggest perf win — saves ~40 meshes per distant chunk)
              // Each mark is positioned at the spline center for its Z, plus a lateral
              // offset, so markings curve with the road instead of running off the edge.
              if (scn.weather !== 'snow' && isHighLOD) { // markings hidden by snow; only render near
                var centerLineMat = new T.MeshBasicMaterial({ color: 0xfacc15 });
                var isNoPass = chunk.biome === 'rural' || chunk.hasIntersection;
                var skipZ1 = chunk.hasIntersection ? chunkWorldZ + chunk.intersectionY - 3 : -99999;
                var skipZ2 = chunk.hasIntersection ? chunkWorldZ + chunk.intersectionY + 3 : -99999;
                var markCenterAtZ = function(worldZ) {
                  // worldZ → world Y (cells), spline → world X.
                  return iw.spline ? (iw.spline.centerAt(worldZ - chunkWorldZ + ribbonChunkBaseY) - MAP_SIZE / 2) : 0;
                };
                for (var mlZ = chunkWorldZ + 1; mlZ < chunkWorldZ + CHUNK_SIZE - 1; mlZ += 2) {
                  if (mlZ > skipZ1 && mlZ < skipZ2) continue;
                  var ctrX = markCenterAtZ(mlZ);
                  if (isNoPass) {
                    var dyL = new T.Mesh(new T.PlaneGeometry(0.12, 1.8), centerLineMat);
                    dyL.rotation.x = -Math.PI / 2;
                    dyL.position.set(ctrX - 0.25, 0.014, mlZ);
                    chunkGroup.add(dyL);
                    var dyR = new T.Mesh(new T.PlaneGeometry(0.12, 1.8), centerLineMat);
                    dyR.rotation.x = -Math.PI / 2;
                    dyR.position.set(ctrX + 0.25, 0.014, mlZ);
                    chunkGroup.add(dyR);
                  } else {
                    var dyD = new T.Mesh(new T.PlaneGeometry(0.15, 1.2), centerLineMat);
                    dyD.rotation.x = -Math.PI / 2;
                    dyD.position.set(ctrX, 0.014, mlZ);
                    chunkGroup.add(dyD);
                  }
                }
                // Solid white edge lines: short segments tracking the spline rather
                // than one long straight plane (so they bend with the road).
                var edgeLineMat = new T.MeshBasicMaterial({ color: 0xffffff });
                for (var elZ = chunkWorldZ + 1; elZ < chunkWorldZ + CHUNK_SIZE - 1; elZ += 1.5) {
                  var elCtr = markCenterAtZ(elZ);
                  [-3.2, 3.2].forEach(function(edgeOff) {
                    var edge = new T.Mesh(new T.PlaneGeometry(0.12, 1.5), edgeLineMat);
                    edge.rotation.x = -Math.PI / 2;
                    edge.position.set(elCtr + edgeOff, 0.013, elZ);
                    chunkGroup.add(edge);
                  });
                }
                if (chunk.biome === 'commercial' || chunk.biome === 'suburban') {
                  for (var ldZ = chunkWorldZ + 2; ldZ < chunkWorldZ + CHUNK_SIZE - 2; ldZ += 3) {
                    if (ldZ > skipZ1 && ldZ < skipZ2) continue;
                    var ldCtr = markCenterAtZ(ldZ);
                    [-1.5, 1.5].forEach(function(laneOff) {
                      var ld = new T.Mesh(new T.PlaneGeometry(0.1, 1.5), edgeLineMat);
                      ld.rotation.x = -Math.PI / 2;
                      ld.position.set(ldCtr + laneOff, 0.013, ldZ);
                      chunkGroup.add(ld);
                    });
                  }
                }
                // Road-edge reflectors (cat's eyes) — small beads every 4m.
                // Amber on the right edge, white on the left (US convention).
                // Use MeshBasicMaterial so they glow independent of scene lighting.
                var isNightRef = scn.time === 'night' || scn.id === 'night';
                var amberMat = new T.MeshBasicMaterial({ color: isNightRef ? 0xffc040 : 0xbc7a1a });
                var whiteRefMat = new T.MeshBasicMaterial({ color: isNightRef ? 0xffffff : 0xcccccc });
                for (var refZ = chunkWorldZ + 2; refZ < chunkWorldZ + CHUNK_SIZE - 2; refZ += 4) {
                  var refCtr = markCenterAtZ(refZ);
                  var amber = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.12), amberMat);
                  amber.position.set(refCtr + 3.3, 0.02, refZ);
                  chunkGroup.add(amber);
                  var whiteR = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.12), whiteRefMat);
                  whiteR.position.set(refCtr - 3.3, 0.02, refZ);
                  chunkGroup.add(whiteR);
                }
              }

              // ─── WEATHER-REACTIVE DETAILS ───
              // splineCenterAtZ: shared helper so puddles, snow piles, and other
              // shoulder details ride the curve instead of floating in the grass.
              var splineCenterAtZ = function(worldZ) {
                return iw.spline ? (iw.spline.centerAt(worldZ - chunkWorldZ + ribbonChunkBaseY) - MAP_SIZE / 2) : 0;
              };
              var weatherRng = seededRandom(chunk.index * 91349 + 11);
              if (scn.weather === 'rain') {
                var puddleMat = new T.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.6 });
                var rippleMat = new T.MeshBasicMaterial({ color: 0xa0c0d8, transparent: true, opacity: 0.4, side: T.DoubleSide });
                for (var pI = 0; pI < 3; pI++) {
                  if (weatherRng() < 0.6) {
                    var pudSide = weatherRng() < 0.5 ? -1 : 1;
                    var pudZ = chunkWorldZ + 4 + pI * 8 + weatherRng() * 3;
                    var pudX = splineCenterAtZ(pudZ) + pudSide * (2.8 + weatherRng() * 1.0);
                    var pudRadius = 0.4 + weatherRng() * 0.5;
                    var puddle = new T.Mesh(new T.CircleGeometry(pudRadius, 10), puddleMat);
                    puddle.rotation.x = -Math.PI / 2;
                    puddle.position.set(pudX, 0.015, pudZ);
                    chunkGroup.add(puddle);
                    // Ripple ring — animated in the update loop. Stored name so
                    // we can cheaply find+expand all ripples per frame.
                    var ripple = new T.Mesh(new T.RingGeometry(0.05, 0.08, 16), rippleMat);
                    ripple.rotation.x = -Math.PI / 2;
                    ripple.position.set(pudX, 0.017, pudZ);
                    ripple.name = 'ripple';
                    ripple._maxR = pudRadius;
                    ripple._phase = weatherRng() * Math.PI * 2;
                    chunkGroup.add(ripple);
                  }
                }
              } else if (scn.weather === 'snow') {
                // Road dusting — a semi-transparent white overlay following the
                // ribbon, broken up by Y-striped opacity so it reads as partial
                // coverage instead of a second pristine road.
                var dustMat = new T.MeshBasicMaterial({ color: 0xf0f4f8, transparent: true, opacity: 0.45, depthWrite: false });
                var dustRows = CHUNK_SIZE + 1;
                var dustVerts = new Float32Array(dustRows * 2 * 3);
                var dustIdx = new Uint16Array((dustRows - 1) * 6);
                for (var dr = 0; dr < dustRows; dr++) {
                  var dsY = ribbonChunkBaseY + dr;
                  var dsC = iw.spline ? (iw.spline.centerAt(dsY) - MAP_SIZE / 2) : 0;
                  var dsH = iw.spline ? iw.spline.heightAt(dsY) : 0;
                  dustVerts[(dr * 2 + 0) * 3 + 0] = dsC - 3.2;
                  dustVerts[(dr * 2 + 0) * 3 + 1] = dsH + 0.018;
                  dustVerts[(dr * 2 + 0) * 3 + 2] = chunkWorldZ + dr;
                  dustVerts[(dr * 2 + 1) * 3 + 0] = dsC + 3.2;
                  dustVerts[(dr * 2 + 1) * 3 + 1] = dsH + 0.018;
                  dustVerts[(dr * 2 + 1) * 3 + 2] = chunkWorldZ + dr;
                }
                for (var dj = 0; dj < dustRows - 1; dj++) {
                  var da = dj * 2, db = dj * 2 + 1, dc = (dj + 1) * 2, dd = (dj + 1) * 2 + 1;
                  dustIdx[dj * 6 + 0] = da; dustIdx[dj * 6 + 1] = dc; dustIdx[dj * 6 + 2] = db;
                  dustIdx[dj * 6 + 3] = db; dustIdx[dj * 6 + 4] = dc; dustIdx[dj * 6 + 5] = dd;
                }
                var dustGeo = new T.BufferGeometry();
                dustGeo.setAttribute('position', new T.BufferAttribute(dustVerts, 3));
                dustGeo.setIndex(new T.BufferAttribute(dustIdx, 1));
                dustGeo.computeVertexNormals();
                chunkGroup.add(new T.Mesh(dustGeo, dustMat));
                var snowPileMat = new T.MeshLambertMaterial({ color: 0xf0f4f8 });
                for (var sI = 0; sI < 5; sI++) {
                  var snSide = sI % 2 === 0 ? -1 : 1;
                  var snZ = chunkWorldZ + 3 + sI * 6 + weatherRng() * 2;
                  var snX = splineCenterAtZ(snZ) + snSide * (MAX_ROAD_WIDTH + 0.5);
                  var snHeight = 0.4 + weatherRng() * 0.3;
                  var snLength = 1.5 + weatherRng() * 1.5;
                  var snPile = new T.Mesh(new T.BoxGeometry(0.6, snHeight, snLength), snowPileMat);
                  snPile.position.set(snX, snHeight / 2, snZ);
                  chunkGroup.add(snPile);
                  // Rounded top (cap)
                  var snCap = new T.Mesh(new T.SphereGeometry(0.3, 6, 4), snowPileMat);
                  snCap.scale.set(1, 0.3, 1.5);
                  snCap.position.set(snX, snHeight, snZ);
                  chunkGroup.add(snCap);
                }
                // Patches of snow on grass between objects
                var snowPatchMat = new T.MeshLambertMaterial({ color: 0xffffff });
                for (var spI = 0; spI < 6; spI++) {
                  var spSide = weatherRng() < 0.5 ? -1 : 1;
                  var spX = spSide * (6 + weatherRng() * 15);
                  var spZ = chunkWorldZ + weatherRng() * CHUNK_SIZE;
                  var sp = new T.Mesh(new T.CircleGeometry(1.0 + weatherRng() * 0.8, 8), snowPatchMat);
                  sp.rotation.x = -Math.PI / 2;
                  sp.position.set(spX, 0.02, spZ);
                  chunkGroup.add(sp);
                }
              } else if (scn.weather === 'fog') {
                // Subtle low mist patches along the ground
                var mistMat = new T.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.25 });
                for (var mI = 0; mI < 4; mI++) {
                  var mistZ = chunkWorldZ + mI * 8 + weatherRng() * 3;
                  var mist = new T.Mesh(new T.PlaneGeometry(12, 4), mistMat);
                  mist.rotation.x = -Math.PI / 2;
                  mist.position.set((weatherRng() - 0.5) * 4, 0.3, mistZ);
                  chunkGroup.add(mist);
                }
              }
              // Cross street road surface (if intersection)
              if (chunk.hasIntersection) {
                var crossZ = chunkWorldZ + chunk.intersectionY;
                // Where the curved main road actually meets the cross street.
                var crossCenterX = splineCenterAtZ(crossZ);
                var crossRoadGeo = new T.PlaneGeometry(MAP_SIZE, 6);
                var crossRoad = new T.Mesh(crossRoadGeo, roadMat);
                crossRoad.rotation.x = -Math.PI / 2;
                crossRoad.position.set(0, 0.012, crossZ);
                crossRoad.receiveShadow = true;
                chunkGroup.add(crossRoad);
                // Cross street center dashes — skip the section overlapping the main road
                // (gap stays centered on the spline, not on world X = 0).
                var crossDashMat = new T.MeshBasicMaterial({ color: 0xfacc15 });
                for (var cdx = -MAP_SIZE / 2; cdx < MAP_SIZE / 2; cdx += 3) {
                  if (Math.abs(cdx - crossCenterX) < 5) continue;
                  var cdGeo = new T.PlaneGeometry(1.5, 0.12);
                  var cd = new T.Mesh(cdGeo, crossDashMat);
                  cd.rotation.x = -Math.PI / 2;
                  cd.position.set(cdx, 0.02, crossZ);
                  chunkGroup.add(cd);
                }
                var sigPoleMat2 = new T.MeshLambertMaterial({ color: 0x555555 });
                var isTrafficLight = ci % 2 === 0;
                if (isTrafficLight) {
                  // Overhead traffic light — pole sits at the corner past the curved road.
                  var sigPole = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 4.2, 6), sigPoleMat2);
                  sigPole.position.set(crossCenterX + 4.0, 2.1, crossZ);
                  chunkGroup.add(sigPole);
                  var sigArm = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 4.5, 4), sigPoleMat2);
                  sigArm.position.set(crossCenterX + 1.8, 4.0, crossZ);
                  sigArm.rotation.z = Math.PI / 2;
                  chunkGroup.add(sigArm);
                  var sigHousing = new T.Mesh(new T.BoxGeometry(0.3, 0.8, 0.2), new T.MeshLambertMaterial({ color: 0x1a1a2e }));
                  sigHousing.position.set(crossCenterX, 3.5, crossZ);
                  chunkGroup.add(sigHousing);
                  var lightColors = [0xef4444, 0xfbbf24, 0x22c55e];
                  for (var lci = 0; lci < 3; lci++) {
                    var lightMesh = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), new T.MeshBasicMaterial({ color: lightColors[lci] }));
                    lightMesh.position.set(crossCenterX + 0.16, 3.75 - lci * 0.25, crossZ);
                    chunkGroup.add(lightMesh);
                  }
                } else {
                  // STOP SIGN (4-way stop intersection) — octagonal red sign with white STOP text
                  // Place on both sides of the approach for the main road, offset by spline center.
                  [-1, 1].forEach(function(sgSide) {
                    var ssPole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.3, 6), sigPoleMat2);
                    ssPole.position.set(crossCenterX + sgSide * 4.5, 1.15, crossZ + sgSide * 3.5);
                    chunkGroup.add(ssPole);
                    // Octagonal face via canvas texture
                    try {
                      var ssCan = document.createElement('canvas');
                      ssCan.width = 256; ssCan.height = 256;
                      var ssCtx = ssCan.getContext('2d');
                      ssCtx.clearRect(0, 0, 256, 256);
                      ssCtx.fillStyle = '#dc2626';
                      ssCtx.beginPath();
                      for (var oi2 = 0; oi2 < 8; oi2++) {
                        var oa2 = (oi2 / 8) * Math.PI * 2 + Math.PI / 8;
                        var ox2 = 128 + Math.cos(oa2) * 120, oy2 = 128 + Math.sin(oa2) * 120;
                        if (oi2 === 0) ssCtx.moveTo(ox2, oy2); else ssCtx.lineTo(ox2, oy2);
                      }
                      ssCtx.closePath(); ssCtx.fill();
                      ssCtx.strokeStyle = '#ffffff'; ssCtx.lineWidth = 10; ssCtx.stroke();
                      ssCtx.fillStyle = '#ffffff';
                      ssCtx.font = 'bold 74px system-ui, sans-serif';
                      ssCtx.textAlign = 'center';
                      ssCtx.textBaseline = 'middle';
                      ssCtx.fillText('STOP', 128, 128);
                      var ssTex = new T.CanvasTexture(ssCan);
                      var ssMat = new T.MeshBasicMaterial({ map: ssTex, transparent: true, side: T.DoubleSide });
                      var ssFace = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), ssMat);
                      ssFace.position.set(crossCenterX + sgSide * 4.5, 2.2, crossZ + sgSide * 3.5);
                      ssFace.rotation.y = sgSide === 1 ? Math.PI : 0;
                      chunkGroup.add(ssFace);
                    } catch (ssErr) {
                      // Fallback: plain red octagon plane
                      var fbMat = new T.MeshBasicMaterial({ color: 0xdc2626, side: T.DoubleSide });
                      var fbFace = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), fbMat);
                      fbFace.position.set(crossCenterX + sgSide * 4.5, 2.2, crossZ + sgSide * 3.5);
                      fbFace.rotation.y = sgSide === 1 ? Math.PI : 0;
                      chunkGroup.add(fbFace);
                    }
                  });
                  // Also place stop signs on the CROSS street (offset by spline center).
                  [-1, 1].forEach(function(ccSide) {
                    var csPole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.3, 6), sigPoleMat2);
                    csPole.position.set(crossCenterX + ccSide * 3.5, 1.15, crossZ + ccSide * 4.5);
                    chunkGroup.add(csPole);
                    try {
                      var cs_can = document.createElement('canvas');
                      cs_can.width = 256; cs_can.height = 256;
                      var cs_ctx = cs_can.getContext('2d');
                      cs_ctx.fillStyle = '#dc2626';
                      cs_ctx.beginPath();
                      for (var oi3 = 0; oi3 < 8; oi3++) {
                        var oa3 = (oi3 / 8) * Math.PI * 2 + Math.PI / 8;
                        var ox3 = 128 + Math.cos(oa3) * 120, oy3 = 128 + Math.sin(oa3) * 120;
                        if (oi3 === 0) cs_ctx.moveTo(ox3, oy3); else cs_ctx.lineTo(ox3, oy3);
                      }
                      cs_ctx.closePath(); cs_ctx.fill();
                      cs_ctx.strokeStyle = '#ffffff'; cs_ctx.lineWidth = 10; cs_ctx.stroke();
                      cs_ctx.fillStyle = '#ffffff';
                      cs_ctx.font = 'bold 74px system-ui, sans-serif';
                      cs_ctx.textAlign = 'center';
                      cs_ctx.textBaseline = 'middle';
                      cs_ctx.fillText('STOP', 128, 128);
                      var cs_tex = new T.CanvasTexture(cs_can);
                      var cs_mat = new T.MeshBasicMaterial({ map: cs_tex, transparent: true, side: T.DoubleSide });
                      var cs_face = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), cs_mat);
                      cs_face.position.set(crossCenterX + ccSide * 3.5, 2.2, crossZ + ccSide * 4.5);
                      cs_face.rotation.y = Math.PI / 2;
                      chunkGroup.add(cs_face);
                    } catch (ccErr) { /* fallback omitted */ }
                  });
                }
                // Crosswalk stripes — span the curved main road, not world center.
                var cwMat = new T.MeshBasicMaterial({ color: 0xffffff });
                var cwCtrZ = crossZ - 3.5;
                var cwCtrX = splineCenterAtZ(cwCtrZ);
                for (var cwi = -3; cwi <= 3; cwi++) {
                  var cwGeo = new T.PlaneGeometry(0.25, 0.7);
                  var cw = new T.Mesh(cwGeo, cwMat);
                  cw.rotation.x = -Math.PI / 2;
                  cw.position.set(cwCtrX + cwi * 0.7, 0.022, cwCtrZ);
                  chunkGroup.add(cw);
                }
                // Stop line — same; ride the curve.
                var slZ = crossZ - 4;
                var slGeo = new T.PlaneGeometry(6, 0.2);
                var sl = new T.Mesh(slGeo, cwMat);
                sl.rotation.x = -Math.PI / 2;
                sl.position.set(splineCenterAtZ(slZ), 0.021, slZ);
                chunkGroup.add(sl);
              }
              s3.scene.add(chunkGroup);
              s3._loadedChunks[ci] = chunkGroup;
            }
            // Add traffic signals at chunk intersections (for physics compliance)
            for (var sci = currentChunk - 2; sci <= currentChunk + 4; sci++) {
              var sigChunk = iw.getChunk(sci);
              if (sigChunk && sigChunk.hasIntersection && !sigChunk._signalAdded) {
                sigChunk._signalAdded = true;
                var sigWorldY = sci * CHUNK_SIZE + sigChunk.intersectionY;
                var sigX = sigChunk.roadCenter;
                var isLight = sci % 2 === 0;
                signalsRef.current.push({
                  x: sigX, y: sigWorldY, type: isLight ? 'light' : 'stop',
                  state: isLight ? 'green' : 'stop',
                  timer: Math.random() * 4, greenDur: 8, yellowDur: 3, redDur: 6,
                  _lastY: null, _stopped: false, _violated: false,
                  _chunk: sci
                });
              }
            }

            // Unload distant chunks
            Object.keys(s3._loadedChunks).forEach(function(key) {
              var ki = parseInt(key);
              if (ki < currentChunk - 3 || ki > currentChunk + 5) {
                var cg = s3._loadedChunks[ki];
                if (cg) {
                  cg.traverse(function(obj) { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
                  s3.scene.remove(cg);
                }
                delete s3._loadedChunks[ki];
                // Remove signals from this chunk
                signalsRef.current = signalsRef.current.filter(function(sig) { return sig._chunk !== ki; });
              }
            });
          }

          // Cloud drift animation
          if (s3.cloudGroup) {
            s3.cloudGroup.children.forEach(function(cg) {
              cg.position.x += (cg._drift || 0.3) * 0.016;
              if (cg.position.x > 120) cg.position.x = -120;
            });
          }
          // High-altitude parallax clouds — orbit slowly around the player so
          // they persist regardless of how far the car drives. Slower than the
          // low cloudGroup ⇒ visual depth.
          if (!s3._hiCloudRef) s3._hiCloudRef = s3.scene.getObjectByName('hi_clouds');
          if (s3._hiCloudRef) {
            s3._hiCloudRef.position.set(carWorldX, 0, carWorldZ);
            s3._hiCloudRef.children.forEach(function(hc) {
              hc._driftAng = (hc._driftAng || 0) + (hc._driftSpeed || 0.004) * 0.016;
              hc.position.x = Math.cos(hc._driftAng) * hc._driftDist;
              hc.position.z = Math.sin(hc._driftAng) * hc._driftDist;
              hc.lookAt(carWorldX, hc.position.y, carWorldZ);
            });
          }
          // Birds — slow circular drift around the player + wing-flap Y wobble.
          // Rain puddle ripples — scale pulse + opacity fade. One cycle ≈ 1.5s.
          if (scn.weather === 'rain') {
            s3.scene.traverse(function(obj) {
              if (obj.name === 'ripple' && obj.scale) {
                var tt = ((timeRef.current + (obj._phase || 0)) * 0.7) % 1;
                obj.scale.set(0.2 + tt * 8, 0.2 + tt * 8, 1);
                if (obj.material) obj.material.opacity = 0.5 * (1 - tt);
              }
            });
          }
          // Starfield: follow player, gentle twinkle by modulating material opacity.
          if (!s3._starsRef) s3._starsRef = s3.scene.getObjectByName('starfield');
          if (s3._starsRef) {
            s3._starsRef.position.set(carWorldX, 0, carWorldZ);
            if (s3._starsRef.material) {
              s3._starsRef.material.opacity = 0.75 + Math.sin(timeRef.current * 0.7) * 0.15 + Math.sin(timeRef.current * 1.9) * 0.08;
            }
          }
          // Shooting star: idle timer, then fire a quick streak across a random
          // sky direction and fade out over ~1.2s.
          if (!s3._shootRef) s3._shootRef = s3.scene.getObjectByName('shooting_star');
          if (s3._shootRef) {
            var sh = s3._shootRef;
            sh.position.set(carWorldX, 0, carWorldZ);
            if (!sh._active) {
              sh._nextAt -= 0.016;
              if (sh._nextAt <= 0) {
                // Kick off a new streak.
                var shA = Math.random() * Math.PI * 2;
                var shE = 0.3 + Math.random() * 0.4; // elevation (rad)
                var shR = 160;
                var sx = Math.cos(shA) * Math.cos(shE) * shR;
                var sy = Math.sin(shE) * shR;
                var sz = Math.sin(shA) * Math.cos(shE) * shR;
                // End point offset a short distance along a random tangent.
                var tanA = shA + Math.PI / 2;
                var ex = sx + Math.cos(tanA) * 22;
                var ey = sy - 4;
                var ez = sz + Math.sin(tanA) * 22;
                var pos = sh.geometry.getAttribute('position');
                pos.setXYZ(0, sx, sy, sz);
                pos.setXYZ(1, ex, ey, ez);
                pos.needsUpdate = true;
                sh.material.opacity = 1;
                sh._active = true;
                sh._fadeT = 1.2;
              }
            } else {
              sh._fadeT -= 0.016;
              sh.material.opacity = Math.max(0, sh._fadeT / 1.2);
              if (sh._fadeT <= 0) {
                sh._active = false;
                sh._nextAt = 6 + Math.random() * 12;
              }
            }
          }
          // Dawn shafts follow the player, with a slow sway so the light feels alive.
          if (!s3._shaftRef) s3._shaftRef = s3.scene.getObjectByName('dawn_shafts');
          if (s3._shaftRef) {
            s3._shaftRef.position.set(carWorldX, 0, carWorldZ);
            s3._shaftRef.rotation.y = Math.sin(timeRef.current * 0.08) * 0.05;
          }
          if (!s3._birdRef) s3._birdRef = s3.scene.getObjectByName('birds');
          if (s3._birdRef) {
            s3._birdRef.position.set(carWorldX, 0, carWorldZ);
            s3._birdRef.children.forEach(function(bd) {
              bd._flockAng += (bd._flockSpeed || 0.05) * 0.016;
              bd.position.x = Math.cos(bd._flockAng) * bd._flockRad;
              bd.position.z = Math.sin(bd._flockAng) * bd._flockRad;
              bd.position.y = bd._flockY + Math.sin(timeRef.current * 6 + (bd._flapPhase || 0)) * 0.4;
              // Face tangent to orbit (direction of motion)
              bd.rotation.y = -bd._flockAng + Math.PI / 2;
            });
          }
          // Celestial halo: snap to whichever sun/moon mesh exists, billboard to camera.
          if (!s3._haloRef) s3._haloRef = s3.scene.getObjectByName('celestial_halo');
          if (s3._haloRef) {
            // Find the brightest celestial body — the original sun/moon meshes were
            // added in the scene with characteristic emissive materials. Cheap
            // heuristic: pick the highest-Y MeshBasicMaterial sphere in the scene.
            if (!s3._haloTarget) {
              var best = null, bestY = -Infinity;
              s3.scene.traverse(function(obj) {
                if (obj.isMesh && obj.geometry && obj.geometry.type === 'SphereGeometry'
                  && obj.material && obj.material.color && obj.position.y > 8 && obj.position.y > bestY
                  && obj !== s3._haloRef) {
                  // skip dome/halo/players
                  if (obj.name === 'skydome' || obj.name === 'celestial_halo') return;
                  best = obj; bestY = obj.position.y;
                }
              });
              s3._haloTarget = best;
            }
            if (s3._haloTarget) {
              s3._haloRef.position.copy(s3._haloTarget.position);
              s3._haloRef.lookAt(s3.camera.position);
            }
          }

          // Tree wind sway + grass tuft shimmer + lake surface ripple.
          // Walk chunk groups since trees and tufts live inside them, not directly
          // on the scene. Cheaper than scene.traverse: skip far chunks entirely.
          var windStrength = scn.weather === 'rain' ? 0.04 : scn.weather === 'snow' ? 0.02 : scn.weather === 'fog' ? 0.01 : 0.015;
          var t_now = timeRef.current;
          if (s3._loadedChunks) {
            Object.keys(s3._loadedChunks).forEach(function(ck) {
              var cgrp = s3._loadedChunks[ck];
              if (!cgrp) return;
              cgrp.children.forEach(function(child) {
                if (!child.isMesh || !child.geometry) return;
                var gt = child.geometry.type;
                if (gt === 'ConeGeometry' && child.position.y > 1.5) {
                  // Tree canopy / pine cone — main rocking motion.
                  child.rotation.z = Math.sin(t_now * 1.5 + child.position.x * 2 + child.position.z) * windStrength;
                  child.rotation.x = Math.cos(t_now * 1.2 + child.position.z * 1.5) * windStrength * 0.5;
                } else if (gt === 'SphereGeometry' && child.position.y > 1.0 && child.position.y < 6.0) {
                  // Maple/birch round canopies — subtler tilt.
                  child.rotation.z = Math.sin(t_now * 1.1 + child.position.x * 1.7 + child.position.z) * windStrength * 0.6;
                } else if (gt === 'ConeGeometry' && child.position.y < 0.3) {
                  // Grass tufts — shimmer via Y-scale wobble.
                  child.scale.y = 1 + Math.sin(t_now * 4 + child.position.x * 6) * 0.15;
                } else if (child.name === 'lake_surface') {
                  // Lake — gentle vertical bob + scale pulse for surface life.
                  var lp = child._basePhase || 0;
                  child.position.y = (child.position.y || 0) + Math.sin(t_now * 1.4 + lp) * 0.0008;
                  child.scale.x = 1 + Math.sin(t_now * 0.8 + lp) * 0.01;
                } else if (child.name === 'smoke_puff') {
                  // Smoke rises slowly + fades + drifts on wind. When it tops out
                  // (~3m above start), recycle to the base position.
                  var sp = child._sPhase || 0;
                  var rise = ((t_now * 0.45 + sp) % 3.0);
                  child.position.y = (child._sBaseY || 0) + rise;
                  child.position.x += Math.sin(t_now * 0.6 + sp) * 0.002;
                  if (child.material) child.material.opacity = 0.55 * (1 - rise / 3.0);
                  child.scale.setScalar(1 + rise * 0.4);
                } else if (child.name === 'farm_glow' && child.material) {
                  // Farmhouse halo twinkle — slow flicker so the light feels
                  // hand-lit rather than uniform.
                  var fp = child._twPhase || 0;
                  child.material.opacity = 0.14 + 0.08 * (0.5 + 0.5 * Math.sin(t_now * 1.6 + fp)) + 0.04 * Math.sin(t_now * 7 + fp);
                }
              });
            });
          }

          // Lightning flash during rain (random bright flash)
          if (scn.weather === 'rain') {
            if (!s3._lightningCooldown) s3._lightningCooldown = 0;
            s3._lightningCooldown -= 0.016;
            if (s3._lightningCooldown <= 0 && Math.random() < 0.002) {
              // Flash! Briefly boost ambient light
              s3.scene.children.forEach(function(child) {
                if (child.isAmbientLight) child.intensity = 3.0;
              });
              s3._lightningCooldown = 0.15; // flash duration
              // Thunder sound
              try {
                var ac = audioRef.current.ctx;
                if (ac) {
                  var thunder = ac.createOscillator();
                  var thGain = ac.createGain();
                  var thFilter = ac.createBiquadFilter();
                  thunder.type = 'sawtooth'; thunder.frequency.value = 40;
                  thFilter.type = 'lowpass'; thFilter.frequency.value = 100;
                  thGain.gain.value = 0.08;
                  thunder.connect(thFilter); thFilter.connect(thGain); thGain.connect(ac.destination);
                  thunder.start();
                  thGain.gain.setTargetAtTime(0, ac.currentTime + 0.8, 0.3);
                  thunder.stop(ac.currentTime + 1.5);
                }
              } catch (e) {}
            }
            if (s3._lightningCooldown > 0 && s3._lightningCooldown < 0.1) {
              // Restore normal ambient
              s3.scene.children.forEach(function(child) {
                if (child.isAmbientLight) child.intensity = 0.5;
              });
            }
          }

          // Render
          s3.renderer.render(s3.scene, s3.camera);
        }

        // ── 2D HUD overlay (drawn on the separate 2D canvas) ──
        var drawHUD = function(W, H) {
          var gfx = canvas.getContext('2d');
          gfx.clearRect(0, 0, W, H);
          var car = carRef.current;
          var scn = currentScenario;
          var veh = currentVehicle;
          var speedMph = Math.round(Math.abs(car.speed) * MS_TO_MPH);
          var stats = statsRef.current;
          var avgMpg = stats.mpgSamples > 0 ? (stats.mpgSum / stats.mpgSamples) : 0;
          var isNight = scn.time === 'night';
          var isFog = scn.weather === 'fog';

          // Bottom HUD bar
          gfx.fillStyle = 'rgba(0,0,0,0.75)';
          gfx.fillRect(0, H - 90, W, 90);
          gfx.strokeStyle = '#22d3ee'; gfx.lineWidth = 2;
          gfx.strokeRect(0, H - 90, W, 90);

          // Analog speedometer gauge
          var gaugeX = 60, gaugeY = H - 50, gaugeR = 38;
          var maxGauge = Math.max(80, scn.speedLimit + 30);
          gfx.beginPath(); gfx.arc(gaugeX, gaugeY, gaugeR, Math.PI, 0, false);
          gfx.strokeStyle = '#1e293b'; gfx.lineWidth = 6; gfx.stroke();
          var limitAngle = Math.PI + (scn.speedLimit / maxGauge) * Math.PI;
          var overAngle = Math.PI + (Math.min(maxGauge, scn.speedLimit + 10) / maxGauge) * Math.PI;
          gfx.beginPath(); gfx.arc(gaugeX, gaugeY, gaugeR, Math.PI, limitAngle, false); gfx.strokeStyle = '#22c55e'; gfx.lineWidth = 6; gfx.stroke();
          gfx.beginPath(); gfx.arc(gaugeX, gaugeY, gaugeR, limitAngle, overAngle, false); gfx.strokeStyle = '#f59e0b'; gfx.lineWidth = 6; gfx.stroke();
          gfx.beginPath(); gfx.arc(gaugeX, gaugeY, gaugeR, overAngle, 2 * Math.PI, false); gfx.strokeStyle = '#ef4444'; gfx.lineWidth = 6; gfx.stroke();
          var needleAngle = Math.PI + (Math.min(speedMph, maxGauge) / maxGauge) * Math.PI;
          gfx.strokeStyle = '#fff'; gfx.lineWidth = 2;
          gfx.beginPath(); gfx.moveTo(gaugeX, gaugeY); gfx.lineTo(gaugeX + Math.cos(needleAngle) * (gaugeR - 8), gaugeY + Math.sin(needleAngle) * (gaugeR - 8)); gfx.stroke();
          gfx.fillStyle = '#fff'; gfx.beginPath(); gfx.arc(gaugeX, gaugeY, 3, 0, Math.PI * 2); gfx.fill();
          gfx.fillStyle = speedMph > scn.speedLimit + 5 ? '#ef4444' : speedMph > scn.speedLimit ? '#f59e0b' : '#4ade80';
          gfx.font = 'bold 18px monospace'; gfx.textAlign = 'center';
          gfx.fillText(speedMph, gaugeX, gaugeY - 8);
          gfx.fillStyle = '#94a3b8'; gfx.font = '9px system-ui';
          gfx.fillText('MPH', gaugeX, gaugeY + 4);
          for (var ti = 0; ti <= maxGauge; ti += 10) {
            var ta = Math.PI + (ti / maxGauge) * Math.PI;
            gfx.strokeStyle = '#64748b'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.moveTo(gaugeX + Math.cos(ta) * (gaugeR + 2), gaugeY + Math.sin(ta) * (gaugeR + 2)); gfx.lineTo(gaugeX + Math.cos(ta) * (gaugeR + 8), gaugeY + Math.sin(ta) * (gaugeR + 8)); gfx.stroke();
            gfx.fillStyle = '#64748b'; gfx.font = '7px monospace'; gfx.textAlign = 'center';
            gfx.fillText(ti, gaugeX + Math.cos(ta) * (gaugeR + 14), gaugeY + Math.sin(ta) * (gaugeR + 14) + 2);
          }

          // Fuel gauge
          gfx.fillStyle = '#22d3ee'; gfx.font = 'bold 20px monospace'; gfx.textAlign = 'center';
          gfx.fillText(avgMpg > 0 && avgMpg < 999 ? avgMpg.toFixed(1) : '—', W / 2, H - 40);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText(veh.type === 'electric' ? 'MPGe AVG' : 'MPG AVG', W / 2, H - 22);

          // Safety + efficiency — smoothly interpolate displayed values so drops feel gradual
          if (stats._displaySafety == null) stats._displaySafety = stats.safetyScore;
          if (stats._displayEco == null) stats._displayEco = stats.efficiencyScore;
          stats._displaySafety += (stats.safetyScore - stats._displaySafety) * 0.12;
          stats._displayEco += (stats.efficiencyScore - stats._displayEco) * 0.12;
          var showSafety = Math.max(0, Math.round(stats._displaySafety));
          var showEco = Math.max(0, Math.round(stats._displayEco));
          gfx.fillStyle = showSafety > 70 ? '#4ade80' : showSafety > 40 ? '#f59e0b' : '#ef4444';
          gfx.font = 'bold 18px monospace'; gfx.textAlign = 'right';
          gfx.fillText(showSafety, W - 20, H - 50);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText('SAFETY', W - 20, H - 35);
          gfx.fillStyle = showEco > 70 ? '#4ade80' : showEco > 40 ? '#f59e0b' : '#ef4444';
          gfx.font = 'bold 18px monospace';
          gfx.fillText(showEco, W - 100, H - 50);
          gfx.fillStyle = '#94a3b8'; gfx.font = '10px system-ui';
          gfx.fillText('ECO', W - 100, H - 35);

          // Odometer / trip meter / landmark counter
          var distMi = (stats.distance / 1609).toFixed(2);
          var elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
          var elMin = Math.floor(elapsed / 60);
          var elSec = elapsed % 60;
          gfx.fillStyle = '#64748b'; gfx.font = '9px monospace'; gfx.textAlign = 'left';
          var tripLine = 'TRIP: ' + distMi + ' mi  |  ' + elMin + ':' + String(elSec).padStart(2, '0');
          if (stats.landmarkVisits) {
            var totalVisitsHud = Object.values(stats.landmarkVisits).reduce(function(a, b) { return a + b; }, 0);
            var uniqueVisitsHud = Object.keys(stats.landmarkVisits).length;
            if (totalVisitsHud > 0) tripLine += '  |  🗺 ' + totalVisitsHud + ' visits (' + uniqueVisitsHud + ' unique)';
          }
          gfx.fillText(tripLine, 130, H - 14);

          // Gear indicator (actual gear state from gearRef)
          var gear = gearRef.current;
          gfx.fillStyle = gear === 'R' ? '#ef4444' : gear === 'P' ? '#94a3b8' : '#4ade80';
          gfx.font = 'bold 16px monospace'; gfx.textAlign = 'center';
          gfx.fillText(gear, 130, H - 42);
          gfx.fillStyle = '#64748b'; gfx.font = '8px system-ui';
          gfx.fillText('F=D G=R P=Park', 130, H - 28);

          // Top-left info
          gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(10, 10, 220, 54);
          gfx.fillStyle = '#fff'; gfx.font = 'bold 13px system-ui'; gfx.textAlign = 'left';
          gfx.fillText(scn.icon + ' ' + scn.name, 20, 28);
          gfx.fillStyle = '#94a3b8'; gfx.font = '11px system-ui';
          gfx.fillText(veh.icon + ' ' + veh.name, 20, 44);
          gfx.fillText(cameraModeRef.current.toUpperCase() + ' — C to switch', 20, 58);

          // Signal ahead — prominent mini traffic light HUD indicator
          var nearestSig = null, nearestSigDist = Infinity;
          signalsRef.current.forEach(function(s) {
            var ahead = Math.abs(s.y - car.y);
            if (ahead < 12 && ahead < nearestSigDist && Math.abs(s.x - car.x) < 5) { nearestSigDist = ahead; nearestSig = s; }
          });
          if (nearestSig && nearestSigDist < 12) {
            var sigIsStop = nearestSig.type === 'stop';
            // Draw a mini traffic light icon (top-center, always visible even when light is overhead)
            var tlX = W / 2 + 50, tlY = 30;
            if (sigIsStop) {
              // Mini stop sign (red octagon)
              gfx.fillStyle = '#dc2626';
              gfx.beginPath();
              for (var oi = 0; oi < 8; oi++) {
                var oa = oi * Math.PI / 4 + Math.PI / 8;
                var ox2 = tlX + Math.cos(oa) * 14;
                var oy2 = tlY + Math.sin(oa) * 14;
                if (oi === 0) gfx.moveTo(ox2, oy2); else gfx.lineTo(ox2, oy2);
              }
              gfx.closePath(); gfx.fill();
              gfx.fillStyle = '#fff'; gfx.font = 'bold 8px system-ui'; gfx.textAlign = 'center';
              gfx.fillText('STOP', tlX, tlY + 3);
            } else {
              // Mini traffic light (3 circles)
              gfx.fillStyle = 'rgba(0,0,0,0.8)';
              gfx.fillRect(tlX - 8, tlY - 16, 16, 36);
              gfx.strokeStyle = '#475569'; gfx.lineWidth = 1;
              gfx.strokeRect(tlX - 8, tlY - 16, 16, 36);
              // Red lamp
              gfx.fillStyle = nearestSig.state === 'red' ? '#ef4444' : '#1e293b';
              gfx.beginPath(); gfx.arc(tlX, tlY - 9, 5, 0, Math.PI * 2); gfx.fill();
              if (nearestSig.state === 'red') { gfx.fillStyle = 'rgba(239,68,68,0.3)'; gfx.beginPath(); gfx.arc(tlX, tlY - 9, 8, 0, Math.PI * 2); gfx.fill(); }
              // Yellow lamp
              gfx.fillStyle = nearestSig.state === 'yellow' ? '#fbbf24' : '#1e293b';
              gfx.beginPath(); gfx.arc(tlX, tlY + 1, 5, 0, Math.PI * 2); gfx.fill();
              if (nearestSig.state === 'yellow') { gfx.fillStyle = 'rgba(251,191,36,0.3)'; gfx.beginPath(); gfx.arc(tlX, tlY + 1, 8, 0, Math.PI * 2); gfx.fill(); }
              // Green lamp
              gfx.fillStyle = nearestSig.state === 'green' ? '#22c55e' : '#1e293b';
              gfx.beginPath(); gfx.arc(tlX, tlY + 11, 5, 0, Math.PI * 2); gfx.fill();
              if (nearestSig.state === 'green') { gfx.fillStyle = 'rgba(34,197,94,0.3)'; gfx.beginPath(); gfx.arc(tlX, tlY + 11, 8, 0, Math.PI * 2); gfx.fill(); }
            }
            // Distance label
            var distFtSig = Math.round(nearestSigDist * 10);
            gfx.fillStyle = '#94a3b8'; gfx.font = '9px monospace'; gfx.textAlign = 'center';
            gfx.fillText(distFtSig + ' ft', tlX, tlY + 26);
          }

          // Event toast with smooth fade in/out
          var et = eventToastRef.current;
          if (et && et.msg && timeRef.current < et.until) {
            var totalDur = et.until - (et._fadeStart || (et._fadeStart = timeRef.current));
            if (totalDur <= 0) totalDur = 4;
            var elapsed = timeRef.current - et._fadeStart;
            var remaining = et.until - timeRef.current;
            // Fade in over first 0.3s, fade out over last 0.5s
            var fadeAlpha = 1;
            if (elapsed < 0.3) fadeAlpha = elapsed / 0.3;
            else if (remaining < 0.5) fadeAlpha = remaining / 0.5;
            fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));
            // Slide in from top: y position animates during fade-in
            var slideY = 80 + (1 - Math.min(1, elapsed / 0.3)) * -20;
            gfx.save();
            gfx.globalAlpha = fadeAlpha;
            gfx.fillStyle = 'rgba(127,29,29,0.85)';
            gfx.fillRect(W * 0.1, slideY, W * 0.8, 36);
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 2;
            gfx.strokeRect(W * 0.1, slideY, W * 0.8, 36);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 14px system-ui'; gfx.textAlign = 'center';
            gfx.fillText(et.msg, W / 2, slideY + 22);
            gfx.restore();
          }

          // Speed limit sign
          var signX = W - 70, signY2 = 20;
          gfx.fillStyle = '#fff'; gfx.fillRect(signX, signY2, 50, 60);
          gfx.strokeStyle = '#000'; gfx.lineWidth = 2; gfx.strokeRect(signX, signY2, 50, 60);
          gfx.fillStyle = '#000'; gfx.font = 'bold 9px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('SPEED', signX + 25, signY2 + 14); gfx.fillText('LIMIT', signX + 25, signY2 + 24);
          gfx.font = 'bold 20px monospace'; gfx.fillText(scn.speedLimit, signX + 25, signY2 + 48);

          // Blinkers
          var blink = blinkerRef.current;
          var blinkOn = Math.floor(blinkerTimerRef.current * 2.5) % 2 === 0;
          if (blink !== 0 && blinkOn) {
            gfx.fillStyle = '#22c55e'; gfx.font = 'bold 20px system-ui'; gfx.textAlign = 'center';
            gfx.fillText(blink === -1 ? '◄' : '►', W / 2 + blink * 70, H - 55);
          }
          gfx.fillStyle = '#475569'; gfx.font = '9px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('E=◄  V=►  T=off', W / 2, H - 8);

          // ─── HEAD-CHECK INDICATOR ───
          // Shows a prominent visual cue when player is shoulder-checking, plus a subtle hint when not.
          var hcState = headCheckRef.current;
          if (hcState && hcState.dir !== 0) {
            // Active head check: big directional arrow with "SHOULDER CHECK" label
            var hcColor = '#fbbf24';
            var arrow = hcState.dir === -1 ? '◄' : '►';
            var side = hcState.dir === -1 ? 'LEFT' : 'RIGHT';
            gfx.save();
            gfx.fillStyle = 'rgba(30,41,59,0.8)';
            gfx.strokeStyle = hcColor;
            gfx.lineWidth = 2;
            gfx.fillRect(W / 2 - 90, 60, 180, 32);
            gfx.strokeRect(W / 2 - 90, 60, 180, 32);
            gfx.fillStyle = hcColor;
            gfx.font = 'bold 22px system-ui';
            gfx.textAlign = 'center';
            gfx.fillText(arrow + ' SHOULDER CHECK ' + arrow, W / 2, 82);
            gfx.restore();
          } else {
            // Subtle hint in the controls row
            gfx.fillStyle = '#475569'; gfx.font = '9px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('Z=look left  X=look right (shoulder check)', W / 2, H - 22);
          }

          // MPG sparkline
          var mHist = mpgHistoryRef.current;
          if (mHist.length > 4) {
            var sparkW = 120, sparkH = 30;
            var sparkX = W / 2 - sparkW / 2, sparkY = H - 132;
            gfx.fillStyle = 'rgba(0,0,0,0.5)'; gfx.fillRect(sparkX - 2, sparkY - 2, sparkW + 4, sparkH + 12);
            var sparkMax = Math.max.apply(null, mHist.filter(function(m) { return m < 999; }));
            if (sparkMax < 1) sparkMax = 1;
            gfx.strokeStyle = '#4ade80'; gfx.lineWidth = 1.5; gfx.beginPath();
            for (var si = 0; si < mHist.length; si++) {
              var sx = sparkX + (si / (mHist.length - 1)) * sparkW;
              var sy = sparkY + sparkH - (Math.min(mHist[si], sparkMax) / sparkMax) * sparkH;
              if (si === 0) gfx.moveTo(sx, sy); else gfx.lineTo(sx, sy);
            }
            gfx.stroke();
            gfx.fillStyle = '#4ade80'; gfx.font = '8px system-ui'; gfx.textAlign = 'left'; gfx.fillText('MPG', sparkX, sparkY + sparkH + 9);
            gfx.textAlign = 'right'; gfx.fillText(mHist[mHist.length - 1].toFixed(0), sparkX + sparkW, sparkY + sparkH + 9);
          }

          // Rearview mirror
          var mirrorW = Math.min(200, W * 0.25), mirrorH = 50;
          var mirrorX = W / 2 - mirrorW / 2, mirrorY = 74;
          gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(mirrorX - 2, mirrorY - 2, mirrorW + 4, mirrorH + 4);
          gfx.strokeStyle = '#475569'; gfx.lineWidth = 1; gfx.strokeRect(mirrorX - 2, mirrorY - 2, mirrorW + 4, mirrorH + 4);
          gfx.fillStyle = isNight ? '#0a0f1e' : isFog ? '#94a3b8' : '#60a5fa';
          gfx.fillRect(mirrorX, mirrorY, mirrorW, mirrorH / 2);
          gfx.fillStyle = isNight ? '#0a0a14' : '#334155';
          gfx.fillRect(mirrorX, mirrorY + mirrorH / 2, mirrorW, mirrorH / 2);
          var rearAngle = car.heading + Math.PI;
          trafficRef.current.forEach(function(t) {
            var dx = t.x - car.x, dy = t.y - car.y;
            var dist = Math.hypot(dx, dy);
            if (dist > 15 || dist < 0.5) return;
            var angle = Math.atan2(dy, dx) - rearAngle;
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            if (Math.abs(angle) > Math.PI / 4) return;
            var mx = mirrorX + mirrorW / 2 + (angle / (Math.PI / 4)) * (mirrorW / 2);
            var mSize = Math.max(4, 20 / dist);
            gfx.fillStyle = t.color;
            gfx.fillRect(mx - mSize / 2, mirrorY + mirrorH / 2 - mSize / 2, mSize, mSize * 0.6);
            if (isNight) {
              gfx.fillStyle = 'rgba(255,255,200,0.6)';
              gfx.beginPath(); gfx.arc(mx - mSize * 0.3, mirrorY + mirrorH / 2, 1.5, 0, Math.PI * 2); gfx.fill();
              gfx.beginPath(); gfx.arc(mx + mSize * 0.3, mirrorY + mirrorH / 2, 1.5, 0, Math.PI * 2); gfx.fill();
            }
          });
          gfx.fillStyle = '#475569'; gfx.font = '8px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('REARVIEW', W / 2, mirrorY - 4);

          // ── Mini-map radar (bottom-left corner) ──
          var mmSize = 90;
          var mmX = 10, mmY = H - 200;
          var mmScale = 1.4; // world units per pixel
          gfx.fillStyle = 'rgba(0,0,0,0.7)';
          gfx.fillRect(mmX, mmY, mmSize, mmSize);
          gfx.strokeStyle = '#334155'; gfx.lineWidth = 1;
          gfx.strokeRect(mmX, mmY, mmSize, mmSize);
          // Draw road on minimap
          var map = mapRef.current;
          if (map) {
            var mmCx = mmX + mmSize / 2;
            var mmCy = mmY + mmSize / 2;
            for (var mmy = 0; mmy < MAP_SIZE; mmy += 2) {
              for (var mmxx = 0; mmxx < MAP_SIZE; mmxx += 2) {
                var cell = map[mmy][mmxx];
                if (cell !== 0 && cell !== 3 && cell !== 4) continue;
                var relX = (mmxx - car.x) / mmScale;
                var relY = (mmy - car.y) / mmScale;
                // Rotate relative to car heading
                var cosH = Math.cos(-car.heading + Math.PI / 2);
                var sinH = Math.sin(-car.heading + Math.PI / 2);
                var screenMX = mmCx + relX * cosH - relY * sinH;
                var screenMY = mmCy + relX * sinH + relY * cosH;
                if (screenMX < mmX || screenMX > mmX + mmSize || screenMY < mmY || screenMY > mmY + mmSize) continue;
                gfx.fillStyle = cell === 3 ? '#facc15' : cell === 4 ? '#6b7280' : '#475569';
                gfx.fillRect(screenMX - 0.5, screenMY - 0.5, 1.5, 1.5);
              }
            }
          }
          // Draw traffic dots on minimap
          trafficRef.current.forEach(function(t) {
            var relX = (t.x - car.x) / mmScale;
            var relY = (t.y - car.y) / mmScale;
            var cosH = Math.cos(-car.heading + Math.PI / 2);
            var sinH = Math.sin(-car.heading + Math.PI / 2);
            var mx = mmX + mmSize / 2 + relX * cosH - relY * sinH;
            var my = mmY + mmSize / 2 + relX * sinH + relY * cosH;
            if (mx < mmX || mx > mmX + mmSize || my < mmY || my > mmY + mmSize) return;
            gfx.fillStyle = t.color;
            gfx.fillRect(mx - 1.5, my - 1.5, 3, 3);
          });
          // Draw signals on minimap
          signalsRef.current.forEach(function(s) {
            var relX = (s.x - car.x) / mmScale;
            var relY = (s.y - car.y) / mmScale;
            var cosH = Math.cos(-car.heading + Math.PI / 2);
            var sinH = Math.sin(-car.heading + Math.PI / 2);
            var mx = mmX + mmSize / 2 + relX * cosH - relY * sinH;
            var my = mmY + mmSize / 2 + relX * sinH + relY * cosH;
            if (mx < mmX || mx > mmX + mmSize || my < mmY || my > mmY + mmSize) return;
            gfx.fillStyle = s.type === 'stop' ? '#ef4444' : s.state === 'green' ? '#22c55e' : s.state === 'yellow' ? '#fbbf24' : '#ef4444';
            gfx.beginPath(); gfx.arc(mx, my, 2.5, 0, Math.PI * 2); gfx.fill();
          });
          // Quest destination marker on minimap
          if (questRef.current && !questRef.current.completed && d.freeExplore) {
            var qm = questRef.current;
            var qRelX = (qm.x - car.x) / mmScale;
            var qRelY = (qm.y - car.y) / mmScale;
            var qCosH = Math.cos(-car.heading + Math.PI / 2);
            var qSinH = Math.sin(-car.heading + Math.PI / 2);
            var qmx = mmX + mmSize / 2 + qRelX * qCosH - qRelY * qSinH;
            var qmy = mmY + mmSize / 2 + qRelX * qSinH + qRelY * qCosH;
            // Clamp to minimap edge if destination is far
            qmx = Math.max(mmX + 4, Math.min(mmX + mmSize - 4, qmx));
            qmy = Math.max(mmY + 4, Math.min(mmY + mmSize - 4, qmy));
            gfx.fillStyle = '#fbbf24';
            gfx.beginPath(); gfx.arc(qmx, qmy, 3, 0, Math.PI * 2); gfx.fill();
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.arc(qmx, qmy, 5, 0, Math.PI * 2); gfx.stroke();
          }
          // Player car icon (always center, pointing up)
          gfx.fillStyle = '#22d3ee';
          gfx.beginPath();
          gfx.moveTo(mmX + mmSize / 2, mmY + mmSize / 2 - 4);
          gfx.lineTo(mmX + mmSize / 2 - 3, mmY + mmSize / 2 + 3);
          gfx.lineTo(mmX + mmSize / 2 + 3, mmY + mmSize / 2 + 3);
          gfx.closePath(); gfx.fill();
          gfx.fillStyle = '#475569'; gfx.font = '7px system-ui'; gfx.textAlign = 'center';
          gfx.fillText('MAP', mmX + mmSize / 2, mmY + mmSize + 8);

          // Compass heading indicator (top center)
          var headingDeg = ((car.heading * 180 / Math.PI) % 360 + 360) % 360;
          var compassDirs = [
            [0, 'E'], [45, 'NE'], [90, 'N'], [135, 'NW'],
            [180, 'W'], [225, 'SW'], [270, 'S'], [315, 'SE']
          ];
          // Find nearest cardinal
          var nearestDir = 'N';
          var nearestDiff = 999;
          compassDirs.forEach(function(cd) {
            var diff = Math.abs(((headingDeg - cd[0]) + 180) % 360 - 180);
            if (diff < nearestDiff) { nearestDiff = diff; nearestDir = cd[1]; }
          });
          gfx.fillStyle = 'rgba(0,0,0,0.5)';
          gfx.fillRect(W / 2 - 40, 2, 80, 18);
          gfx.fillStyle = '#22d3ee'; gfx.font = 'bold 11px monospace'; gfx.textAlign = 'center';
          gfx.fillText(nearestDir + '  ' + Math.round(headingDeg) + '°', W / 2, 15);

          // ─── TURN-BY-TURN NAVIGATION ARROW (when quest active) ───
          if (questRef.current && !questRef.current.completed && d.freeExplore) {
            var navQ = questRef.current;
            // Calculate relative direction to destination from player's perspective
            var navDx = navQ.x - car.x;
            var navDy = navQ.y - car.y;
            var navDistToQuest = Math.hypot(navDx, navDy);
            // Convert to angle relative to car's heading
            var absoluteAngle = Math.atan2(navDy, navDx);
            var relativeAngle = absoluteAngle - car.heading;
            // Normalize to -PI to PI
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
            // Display navigation banner
            var navX = W / 2;
            var navY = 28;
            var navW = 220;
            var navH = 46;
            gfx.fillStyle = 'rgba(30,41,59,0.85)';
            gfx.strokeStyle = '#fbbf24';
            gfx.lineWidth = 2;
            gfx.fillRect(navX - navW / 2, navY, navW, navH);
            gfx.strokeRect(navX - navW / 2, navY, navW, navH);
            // Big direction arrow (rotates based on relative angle)
            // -PI/2 = forward, 0 = right, PI/2 = backward, etc.
            gfx.save();
            gfx.translate(navX - 75, navY + navH / 2);
            gfx.rotate(relativeAngle + Math.PI / 2); // +PI/2 so forward = up
            gfx.fillStyle = '#fbbf24';
            gfx.beginPath();
            gfx.moveTo(0, -14);
            gfx.lineTo(-10, 10);
            gfx.lineTo(-4, 6);
            gfx.lineTo(-4, 14);
            gfx.lineTo(4, 14);
            gfx.lineTo(4, 6);
            gfx.lineTo(10, 10);
            gfx.closePath();
            gfx.fill();
            gfx.restore();
            // Destination label + distance
            gfx.fillStyle = '#fef3c7'; gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left';
            gfx.fillText(navQ.icon + ' ' + navQ.name, navX - 55, navY + 16);
            gfx.fillStyle = '#fbbf24'; gfx.font = 'bold 14px monospace';
            var distFeet = Math.round(navDistToQuest * 10);
            var distLabel = distFeet > 5280 ? (distFeet / 5280).toFixed(1) + ' mi' : distFeet + ' ft';
            gfx.fillText(distLabel, navX - 55, navY + 34);
            // Turn hint
            var turnHint = '';
            if (Math.abs(relativeAngle + Math.PI / 2) < 0.3) turnHint = 'Straight ahead';
            else if (relativeAngle > 0) turnHint = 'Turn right';
            else if (relativeAngle < 0) turnHint = 'Turn left';
            if (navDistToQuest < 10) turnHint = 'Arriving...';
            gfx.fillStyle = '#cbd5e1'; gfx.font = '10px system-ui';
            gfx.textAlign = 'right';
            gfx.fillText(turnHint, navX + navW / 2 - 8, navY + 28);
          }

          // Quest / destination HUD (top-left, below scenario info)
          var q = questRef.current;
          if (q && !q.completed && d.freeExplore) {
            var qDist = Math.hypot(car.x - q.x, car.y - q.y);
            var qDistFt = Math.round(qDist * 10);
            var qDistMi = (qDist / 160.9).toFixed(2); // world units to miles approx
            var qAngle = Math.atan2(q.y - car.y, q.x - car.x) - car.heading;
            // Quest panel
            gfx.fillStyle = 'rgba(0,0,0,0.7)';
            gfx.fillRect(10, 68, 220, 40);
            gfx.strokeStyle = '#fbbf24'; gfx.lineWidth = 1;
            gfx.strokeRect(10, 68, 220, 40);
            // Icon + name
            gfx.fillStyle = '#fbbf24'; gfx.font = 'bold 12px system-ui'; gfx.textAlign = 'left';
            gfx.fillText('🗺️ ' + q.icon + ' ' + q.name, 18, 84);
            // Distance
            gfx.fillStyle = '#94a3b8'; gfx.font = '10px monospace';
            gfx.fillText(qDistFt > 5280 ? qDistMi + ' mi' : qDistFt + ' ft', 18, 100);
            // Direction arrow (rotated triangle pointing toward destination)
            gfx.save();
            gfx.translate(210, 88);
            gfx.rotate(-qAngle);
            gfx.fillStyle = '#fbbf24';
            gfx.beginPath(); gfx.moveTo(0, -8); gfx.lineTo(-5, 5); gfx.lineTo(5, 5); gfx.closePath(); gfx.fill();
            gfx.restore();
          }
          // Completed quests count
          if (q && q.questsCompleted > 0 && d.freeExplore) {
            gfx.fillStyle = '#64748b'; gfx.font = '9px system-ui'; gfx.textAlign = 'left';
            gfx.fillText('🏁 ' + q.questsCompleted + ' destinations reached', 18, q.completed ? 84 : 114);
          }

          // Gamepad indicator
          var gpConnected = navigator.getGamepads && navigator.getGamepads().length > 0 && navigator.getGamepads()[0];
          if (gpConnected) {
            gfx.fillStyle = '#4ade80'; gfx.font = '9px system-ui'; gfx.textAlign = 'right';
            gfx.fillText('🎮 Gamepad', W - 10, 70);
          }

          // (Signal distance now shown in the mini traffic light above)

          // Phone distraction notification (if active)
          var dd = distractRef.current;
          if (dd && dd.active) {
            var ddX = W - 220, ddY = H / 2 - 40;
            gfx.fillStyle = 'rgba(0,0,0,0.85)';
            if (gfx.roundRect) { gfx.beginPath(); gfx.roundRect(ddX, ddY, 210, 75, 12); gfx.fill(); }
            else { gfx.fillRect(ddX, ddY, 210, 75); }
            gfx.strokeStyle = '#334155'; gfx.lineWidth = 1;
            if (gfx.roundRect) { gfx.beginPath(); gfx.roundRect(ddX, ddY, 210, 75, 12); gfx.stroke(); }
            gfx.fillStyle = '#fff'; gfx.font = 'bold 11px system-ui'; gfx.textAlign = 'left';
            gfx.fillText(dd.msg, ddX + 10, ddY + 22);
            gfx.fillStyle = '#64748b'; gfx.font = '9px system-ui';
            gfx.fillText('now', ddX + 10, ddY + 38);
            gfx.fillStyle = '#ef4444'; gfx.font = '9px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('🚫 IGNORE IT — keep your eyes on the road!', ddX + 105, ddY + 60);
            // Fade bar
            var remaining = Math.max(0, dd.timer - timeRef.current);
            var pct = remaining / 6;
            gfx.fillStyle = '#334155';
            gfx.fillRect(ddX + 10, ddY + 68, 190, 3);
            gfx.fillStyle = '#ef4444';
            gfx.fillRect(ddX + 10, ddY + 68, 190 * pct, 3);
          }

          // Skid warning
          if (skidRef.current.active) {
            gfx.fillStyle = 'rgba(239,68,68,0.15)'; gfx.fillRect(0, 0, W, H);
            gfx.fillStyle = 'rgba(239,68,68,0.9)'; gfx.font = 'bold 18px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⚠️ SKID — ease off & steer gently', W / 2, 160);
          }

          // Pause
          if (pausedRef.current) {
            gfx.fillStyle = 'rgba(0,0,0,0.7)'; gfx.fillRect(0, 0, W, H);
            gfx.fillStyle = '#fff'; gfx.font = 'bold 32px system-ui'; gfx.textAlign = 'center';
            gfx.fillText('⏸ PAUSED', W / 2, H / 2);
            gfx.font = '14px system-ui'; gfx.fillText('Press SPACE to resume', W / 2, H / 2 + 30);
          }
        };

        // ── Main render loop: init Three.js then loop ──
        // Handle window resize for Three.js canvas
        var onResize = function() {
          if (scn3d && scn3d.renderer && canvas3dRef.current) {
            var w = canvas3dRef.current.clientWidth;
            var h = canvas3dRef.current.clientHeight;
            if (w && h) {
              scn3d.renderer.setSize(w, h);
              scn3d.camera.aspect = w / h;
              scn3d.camera.updateProjectionMatrix();
            }
          }
        };
        window.addEventListener('resize', onResize);

        function ensureThreeAndStart() {
          if (window.THREE) {
            scn3d = initThreeScene();
            threeRef.current = scn3d;
            threeReady = !!scn3d;
            if (threeReady) animRef.current = requestAnimationFrame(step);
          } else {
            // Load Three.js on demand
            var s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            s.async = true;
            s.onload = function() {
              scn3d = initThreeScene();
              threeRef.current = scn3d;
              threeReady = !!scn3d;
              if (threeReady) animRef.current = requestAnimationFrame(step);
            };
            s.onerror = function() { console.error('[RoadReady] Three.js failed to load'); };
            document.head.appendChild(s);
          }
        }
        ensureThreeAndStart();

        var render = function() {
          if (threeReady && scn3d) {
            updateThreeScene(scn3d);
          }
          var hudCanvas = canvasRef.current;
          if (hudCanvas && showHUDRef.current) {
            hudCanvas.width = hudCanvas.offsetWidth;
            hudCanvas.height = hudCanvas.offsetHeight;
            drawHUD(hudCanvas.width, hudCanvas.height);
          }
        };

        return function() {
          drivingRef.current = false;
          if (animRef.current) cancelAnimationFrame(animRef.current);
          window.removeEventListener('resize', onResize);
          if (threeRef.current && threeRef.current.renderer) {
            // Dispose all geometries and materials in the scene to free GPU memory
            if (threeRef.current.scene) {
              threeRef.current.scene.traverse(function(obj) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                  if (obj.material.map) obj.material.map.dispose();
                  obj.material.dispose();
                }
              });
            }
            threeRef.current.renderer.dispose();
          }
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
          // Free Explore hero button
          h('button', { onClick: function() { upd('view', 'freeExploreSetup'); },
            style: { width: '100%', padding: '18px 24px', borderRadius: '14px', border: '2px solid #a78bfa', background: 'linear-gradient(135deg, #2e1065, #1e1b4b, #0c4a6e)', color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' } },
            h('div', { style: { fontSize: '42px' } }, '🌎'),
            h('div', null,
              h('div', { style: { fontSize: '16px', fontWeight: 900 } }, 'Free Explore'),
              h('div', { style: { fontSize: '12px', color: '#c4b5fd', marginTop: '2px' } }, 'Open sandbox. No objectives. Toggle weather, time, traffic live. Practice anything. Earn achievements.'),
              h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '4px' } }, Object.keys(earnedBadges).length + '/' + ACHIEVEMENTS.length + ' achievements earned')
            )
          ),
          // Structured modes
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
            ),
            h('button', { onClick: function() { upd('view', 'threePoint'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #ec4899', background: 'linear-gradient(135deg, #831843, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '↩️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, '3-Point Turn'),
              h('div', { style: { fontSize: '10px', color: '#fbcfe8', marginTop: '2px' } }, 'Road-test maneuver, 2D trainer')
            ),
            h('button', { onClick: function() { upd('view', 'fuelCalc'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f97316', background: 'linear-gradient(135deg, #7c2d12, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '💰'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Fuel Cost Calculator'),
              h('div', { style: { fontSize: '10px', color: '#fed7aa', marginTop: '2px' } }, '$/mi, annual cost, EV vs gas')
            ),
            h('button', { onClick: function() { upd('view', 'backingDrill'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #a3a3a3', background: 'linear-gradient(135deg, #404040, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔙'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Straight Backing'),
              h('div', { style: { fontSize: '10px', color: '#d4d4d4', marginTop: '2px' } }, 'Reverse in a straight line')
            ),
            h('button', { onClick: function() { upd('view', 'emergencyDrill'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #ef4444', background: 'linear-gradient(135deg, #7f1d1d, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🚨'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Emergency Response'),
              h('div', { style: { fontSize: '10px', color: '#fca5a5', marginTop: '2px' } }, 'Practice yielding to sirens')
            ),
            h('button', { onClick: function() { upd('view', 'intersectionGuide'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #14b8a6', background: 'linear-gradient(135deg, #134e4a, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🚦'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Intersection Guide'),
              h('div', { style: { fontSize: '10px', color: '#99f6e4', marginTop: '2px' } }, 'Right-of-way rules at every type')
            ),
            h('button', { onClick: function() { upd('view', 'dashLights'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f43f5e', background: 'linear-gradient(135deg, #881337, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔧'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Dashboard Lights'),
              h('div', { style: { fontSize: '10px', color: '#fda4af', marginTop: '2px' } }, 'Warning lights decoded')
            ),
            h('button', { onClick: function() { upd('view', 'preTrip'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #84cc16', background: 'linear-gradient(135deg, #3f6212, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '✅'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Pre-Trip Check'),
              h('div', { style: { fontSize: '10px', color: '#d9f99d', marginTop: '2px' } }, 'TIRES, lights, fluids walk-around')
            ),
            h('button', { onClick: function() { upd('view', 'hazardTest'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f43f5e', background: 'linear-gradient(135deg, #9f1239, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '⚡'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Hazard Perception'),
              h('div', { style: { fontSize: '10px', color: '#fda4af', marginTop: '2px' } }, 'Timed reaction test — spot the danger')
            ),
            h('button', { onClick: function() { upd('view', 'insuranceCalc'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #06b6d4', background: 'linear-gradient(135deg, #164e63, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🛡️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Insurance Estimator'),
              h('div', { style: { fontSize: '10px', color: '#a5f3fc', marginTop: '2px' } }, 'How driving record affects rates')
            ),
            h('button', { onClick: function() { upd('view', 'maintenanceGuide'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #a3a3a3', background: 'linear-gradient(135deg, #404040, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔧'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Maintenance Schedule'),
              h('div', { style: { fontSize: '10px', color: '#d4d4d4', marginTop: '2px' } }, 'Oil, tires, brakes by mileage')
            ),
            callGemini ? h('button', { onClick: function() { upd('view', 'aiCoach'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #a78bfa', background: 'linear-gradient(135deg, #4c1d95, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🤖'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'AI Driving Coach'),
              h('div', { style: { fontSize: '10px', color: '#ddd6fe', marginTop: '2px' } }, 'Gemini analyzes your last drive')
            ) : null,
            h('button', { onClick: function() { upd('view', 'accidentProtocol'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #fb923c', background: 'linear-gradient(135deg, #7c2d12, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '📋'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'After a Crash'),
              h('div', { style: { fontSize: '10px', color: '#fed7aa', marginTop: '2px' } }, 'What to do — step by step')
            ),
            h('button', { onClick: function() { upd('view', 'knowYourCar'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #e879f9', background: 'linear-gradient(135deg, #701a75, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔍'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Know Your Car'),
              h('div', { style: { fontSize: '10px', color: '#f0abfc', marginTop: '2px' } }, 'Every part explained — engine to tires')
            ),
            h('button', { onClick: function() { upd('view', 'speedCompare'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f472b6', background: 'linear-gradient(135deg, #831843, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🏎️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Speed Comparison'),
              h('div', { style: { fontSize: '10px', color: '#fbcfe8', marginTop: '2px' } }, 'Side-by-side stopping distance at 2 speeds')
            ),
            h('button', { onClick: function() { upd('view', 'blindSpotGuide'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #fbbf24', background: 'linear-gradient(135deg, #78350f, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '👁️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Blind Spots & Mirrors'),
              h('div', { style: { fontSize: '10px', color: '#fde68a', marginTop: '2px' } }, 'Where you can\'t see — and how to fix it')
            ),
            h('button', { onClick: function() { upd('view', 'weatherCompare'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #38bdf8', background: 'linear-gradient(135deg, #0c4a6e, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🌦️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Weather Impact Chart'),
              h('div', { style: { fontSize: '10px', color: '#bae6fd', marginTop: '2px' } }, 'How conditions change everything')
            ),
            h('button', { onClick: function() { upd('view', 'roadTrip'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #34d399', background: 'linear-gradient(135deg, #064e3b, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🗺️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Road Trip Planner'),
              h('div', { style: { fontSize: '10px', color: '#a7f3d0', marginTop: '2px' } }, 'Distance, fuel cost, stop planning')
            ),
            h('button', { onClick: function() { upd('view', 'reactionTrainer'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #fb923c', background: 'linear-gradient(135deg, #7c2d12, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '⏱️'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Reaction Time Test'),
              h('div', { style: { fontSize: '10px', color: '#fed7aa', marginTop: '2px' } }, 'Measure YOUR actual reaction speed')
            ),
            h('button', { onClick: function() { upd('view', 'nightVision'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #a78bfa', background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🔦'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Night Vision Math'),
              h('div', { style: { fontSize: '10px', color: '#ddd6fe', marginTop: '2px' } }, 'Can you stop within your headlights?')
            ),
            h('button', { onClick: function() { upd('view', 'carBuying'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #10b981', background: 'linear-gradient(135deg, #064e3b, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '💵'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'First Car Guide'),
              h('div', { style: { fontSize: '10px', color: '#a7f3d0', marginTop: '2px' } }, 'What to look for, what to avoid')
            ),
            h('button', { onClick: function() { upd('view', 'learningPath'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #f59e0b', background: 'linear-gradient(135deg, #78350f, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🎯'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Learning Path'),
              h('div', { style: { fontSize: '10px', color: '#fde68a', marginTop: '2px' } }, 'Step-by-step guided progression')
            ),
            h('button', { onClick: function() { upd('view', 'roadTestRubric'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #14b8a6', background: 'linear-gradient(135deg, #134e4a, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '📋'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Road Test Rubric'),
              h('div', { style: { fontSize: '10px', color: '#99f6e4', marginTop: '2px' } }, 'What the examiner actually grades')
            ),
            h('button', { onClick: function() { upd('view', 'emergencySituations'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #ef4444', background: 'linear-gradient(135deg, #7f1d1d, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '🆘'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Emergency Situations'),
              h('div', { style: { fontSize: '10px', color: '#fca5a5', marginTop: '2px' } }, 'Blowout, brake failure, hood flies up')
            ),
            h('button', { onClick: function() { upd('view', 'forceDiagram'); },
              style: { padding: '16px', borderRadius: '12px', border: '2px solid #818cf8', background: 'linear-gradient(135deg, #312e81, #1e293b)', color: '#fff', cursor: 'pointer', textAlign: 'left' } },
              h('div', { style: { fontSize: '28px' } }, '📐'),
              h('div', { style: { fontSize: '13px', fontWeight: 800, marginTop: '4px' } }, 'Force Diagram'),
              h('div', { style: { fontSize: '10px', color: '#c7d2fe', marginTop: '2px' } }, 'Live drag, friction, thrust vectors')
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
          // ── Progress Dashboard (compact summary) ──
          h('div', { style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '12px', padding: '14px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#fff' } }, '📊 Your Progress'),
              h('div', { style: { fontSize: '10px', color: '#94a3b8' } }, (d.totalDrives || 0) + ' drives · ' + Object.keys(scenariosDriven).length + '/14 scenarios')
            ),
            // Progress bars
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' } },
              // Scenarios explored
              (function() {
                var pct = Math.round(Object.keys(scenariosDriven).length / 14 * 100);
                return h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '4px' } },
                    h('div', { style: { height: '100%', background: '#22d3ee', borderRadius: '2px', width: pct + '%' } })
                  ),
                  h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#22d3ee' } }, pct + '%'),
                  h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Scenarios')
                );
              })(),
              // Achievements
              (function() {
                var pct = Math.round(Object.keys(earnedBadges).length / ACHIEVEMENTS.length * 100);
                return h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '4px' } },
                    h('div', { style: { height: '100%', background: '#fbbf24', borderRadius: '2px', width: pct + '%' } })
                  ),
                  h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fbbf24' } }, pct + '%'),
                  h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Badges')
                );
              })(),
              // Permit readiness (based on last permit score)
              (function() {
                var lastPermit = d.permit;
                var pct = lastPermit && lastPermit.done ? Math.round(lastPermit.score / 20 * 100) : 0;
                return h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '4px' } },
                    h('div', { style: { height: '100%', background: pct >= 80 ? '#4ade80' : '#f59e0b', borderRadius: '2px', width: pct + '%' } })
                  ),
                  h('div', { style: { fontSize: '14px', fontWeight: 800, color: pct >= 80 ? '#4ade80' : '#f59e0b' } }, pct ? pct + '%' : '—'),
                  h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Permit')
                );
              })(),
              // Best safety score
              (function() {
                var best = drivingStats ? drivingStats.safetyScore : 0;
                return h('div', { style: { textAlign: 'center' } },
                  h('div', { style: { height: '4px', background: '#1e293b', borderRadius: '2px', marginBottom: '4px' } },
                    h('div', { style: { height: '100%', background: best >= 80 ? '#4ade80' : '#f59e0b', borderRadius: '2px', width: best + '%' } })
                  ),
                  h('div', { style: { fontSize: '14px', fontWeight: 800, color: best >= 80 ? '#4ade80' : '#f59e0b' } }, best || '—'),
                  h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Safety')
                );
              })()
            )
          ),
          // Achievements strip
          h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' } }, '🏆 Achievements (' + Object.keys(earnedBadges).length + '/' + ACHIEVEMENTS.length + ')'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } },
              ACHIEVEMENTS.map(function(ach) {
                var earned = !!earnedBadges[ach.id];
                return h('div', { key: ach.id, title: ach.name + ': ' + ach.desc,
                  style: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: earned ? '#1e3a5f' : '#0f172a', color: earned ? '#fbbf24' : '#334155', border: '1px solid ' + (earned ? '#3b82f6' : '#1e293b'), cursor: 'default' }
                }, ach.icon + ' ' + (earned ? ach.name : '???'));
              })
            )
          ),
          // Stats
          drivingStats ? h('div', { style: { background: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8' } },
            h('div', { style: { color: '#22d3ee', fontWeight: 700, marginBottom: '4px' } }, 'Last drive: ' + drivingStats.scenario),
            h('div', null, 'Safety ' + drivingStats.safetyScore + ' · Eco ' + drivingStats.efficiencyScore + ' · ' + drivingStats.avgMPG + ' MPG avg · ' + drivingStats.distance_mi + ' mi')
          ) : null
        );
      }

      // ── FREE EXPLORE SETUP ──
      if (view === 'freeExploreSetup') {
        var feWeather = d.feWeather || 'clear';
        var feTime = d.feTime || 'day';
        var feTraffic = d.feTraffic || 'medium';
        var feMap = d.feMap || 'suburban';
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #2e1065, #0c4a6e)', borderRadius: '14px', padding: '24px', border: '1px solid #a78bfa', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '48px' } }, '🌎'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '4px' } }, 'Free Explore'),
            h('div', { style: { fontSize: '12px', color: '#c4b5fd' } }, 'No timer. No score pressure. Just drive, explore, and learn at your own pace.'),
            h('div', { style: { fontSize: '11px', color: '#64748b', marginTop: '4px' } }, 'All conditions are changeable mid-drive via the toolbar.')
          ),
          // Vehicle
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' } }, 'Vehicle'),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              VEHICLES.map(function(v) {
                var sel = v.id === selectedVehicle;
                return h('button', { key: v.id, onClick: function() { upd('vehicle', v.id); },
                  style: { padding: '8px 12px', borderRadius: '8px', border: '1px solid ' + (sel ? '#a78bfa' : '#334155'), background: sel ? '#2e1065' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } },
                  v.icon + ' ' + v.name);
              })
            )
          ),
          // Starting conditions grid
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
            // Map type
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' } }, 'Road Type'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                [['residential','🏘️ Residential'],['suburban','🏙️ Suburban'],['highway','🛣️ Highway'],['rural','🌲 Rural'],['roundabout','🔄 Roundabout']].map(function(m) {
                  var sel = m[0] === feMap;
                  return h('button', { key: m[0], onClick: function() { upd('feMap', m[0]); },
                    style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#a78bfa' : '#334155'), background: sel ? '#2e1065' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700, textAlign: 'left' } }, m[1]);
                })
              )
            ),
            // Right column: weather + time + traffic
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' } }, 'Weather'),
                h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                  [['clear','☀️'],['rain','🌧️'],['snow','❄️'],['fog','🌫️']].map(function(w) {
                    var sel = w[0] === feWeather;
                    return h('button', { key: w[0], onClick: function() { upd('feWeather', w[0]); },
                      style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#a78bfa' : '#334155'), background: sel ? '#2e1065' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, w[1]);
                  })
                )
              ),
              h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' } }, 'Time'),
                h('div', { style: { display: 'flex', gap: '4px' } },
                  [['day','☀️ Day'],['night','🌙 Night']].map(function(t) {
                    var sel = t[0] === feTime;
                    return h('button', { key: t[0], onClick: function() { upd('feTime', t[0]); },
                      style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#a78bfa' : '#334155'), background: sel ? '#2e1065' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, t[1]);
                  })
                )
              ),
              h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px' } }, 'Traffic'),
                h('div', { style: { display: 'flex', gap: '4px' } },
                  [['light','🚗 Light'],['medium','🚗🚗 Medium'],['heavy','🚗🚗🚗 Heavy']].map(function(t) {
                    var sel = t[0] === feTraffic;
                    return h('button', { key: t[0], onClick: function() { upd('feTraffic', t[0]); },
                      style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid ' + (sel ? '#a78bfa' : '#334155'), background: sel ? '#2e1065' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, t[1]);
                  })
                )
              )
            )
          ),
          h('button', { onClick: function() {
            // Build a virtual scenario from the user's choices
            var feScenario = {
              id: feMap, name: 'Free Explore', icon: '🌎',
              speedLimit: feMap === 'highway' ? 65 : feMap === 'rural' ? 50 : feMap === 'residential' ? 25 : feMap === 'roundabout' ? 25 : 40,
              weather: feWeather, time: feTime, traffic: feTraffic, difficulty: 0,
              desc: 'Free Explore — no objectives, full sandbox.'
            };
            // Store the virtual scenario and start
            updMulti({ freeExplore: true, freeExploreScenario: feScenario });
            startDriving(feMap, selectedVehicle);
          },
            style: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', fontSize: '15px', fontWeight: 900, cursor: 'pointer' }
          }, '🌎 Start Exploring'),
          // Seed input
          h('div', { style: { marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' } },
            h('label', { style: { fontSize: '11px', color: '#94a3b8' } }, 'World Seed:'),
            h('input', { type: 'number', value: d.worldSeed || '', placeholder: 'Random',
              onChange: function(e) { upd('worldSeed', e.target.value ? parseInt(e.target.value) : null); },
              style: { width: '100px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center' }
            }),
            h('button', { onClick: function() { upd('worldSeed', Math.floor(Math.random() * 100000)); },
              style: { padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }
            }, '🎲 Random')
          ),
          h('div', { style: { marginTop: '10px', fontSize: '10px', color: '#64748b', textAlign: 'center' } },
            'Achievements still count in Free Explore. Practice stop signs, lane changes, moose dodging, and more — without the score stress.'
          )
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
          // Three.js WebGL canvas (behind)
          h('canvas', {
            ref: canvas3dRef,
            style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }
          }),
          // 2D HUD overlay canvas (on top, transparent)
          h('canvas', {
            ref: canvasRef,
            role: 'application',
            'aria-label': 'RoadReady driving simulator. W/S throttle and brake, A/D steering, C camera toggle, Space pause.',
            tabIndex: 0,
            style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', outline: 'none', pointerEvents: 'none', zIndex: 2 }
          }),
          // Controls legend
          h('div', { style: { position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 } },
            h('button', { onClick: exitDriving,
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.8)', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '✕ End Drive'),
            h('button', { onClick: function() { pausedRef.current = !pausedRef.current; },
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '⏸ Pause'),
            h('button', { onClick: function() {
              var modes = ['cockpit', 'chase', 'overhead', 'rearview'];
              cameraModeRef.current = modes[(modes.indexOf(cameraModeRef.current) + 1) % modes.length];
            },
              style: { padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, '📷 Camera'),
            h('button', { onClick: function() { upd('highBeams', !d.highBeams); },
              style: { padding: '6px 10px', borderRadius: '6px', background: d.highBeams ? 'rgba(251,191,36,0.4)' : 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid ' + (d.highBeams ? '#fbbf24' : 'rgba(255,255,255,0.2)'), fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, d.highBeams ? '💡 HIGH' : '💡 LOW')
          ),
          h('div', { style: { position: 'absolute', bottom: '100px', left: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', color: '#cbd5e1', fontSize: '10px', zIndex: 10 } },
            'W Accel · S Brake · A/D Steer · F Drive · G Reverse · P Park · E/V Signal · C Cam · L Beams · Q Horn · SPACE Pause'
          ),
          // ── Touch controls for mobile/tablet ──
          h('div', { style: { position: 'absolute', bottom: '110px', right: d.freeExplore ? '180px' : '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 20 },
            className: 'touch-controls' },
            // Throttle (big green button)
            h('button', {
              onTouchStart: function(e) { e.preventDefault(); keysRef.current['w'] = true; },
              onTouchEnd: function(e) { e.preventDefault(); keysRef.current['w'] = false; },
              onMouseDown: function() { keysRef.current['w'] = true; },
              onMouseUp: function() { keysRef.current['w'] = false; },
              style: { width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #4ade80', background: 'rgba(34,197,94,0.3)', color: '#fff', fontSize: '20px', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }
            }, '▲'),
            h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center' } },
              // Steer left
              h('button', {
                onTouchStart: function(e) { e.preventDefault(); keysRef.current['a'] = true; },
                onTouchEnd: function(e) { e.preventDefault(); keysRef.current['a'] = false; },
                onMouseDown: function() { keysRef.current['a'] = true; },
                onMouseUp: function() { keysRef.current['a'] = false; },
                style: { width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #60a5fa', background: 'rgba(96,165,250,0.3)', color: '#fff', fontSize: '18px', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }
              }, '◄'),
              // Steer right
              h('button', {
                onTouchStart: function(e) { e.preventDefault(); keysRef.current['d'] = true; },
                onTouchEnd: function(e) { e.preventDefault(); keysRef.current['d'] = false; },
                onMouseDown: function() { keysRef.current['d'] = true; },
                onMouseUp: function() { keysRef.current['d'] = false; },
                style: { width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #60a5fa', background: 'rgba(96,165,250,0.3)', color: '#fff', fontSize: '18px', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }
              }, '►')
            ),
            // Brake (big red button)
            h('button', {
              onTouchStart: function(e) { e.preventDefault(); keysRef.current['s'] = true; },
              onTouchEnd: function(e) { e.preventDefault(); keysRef.current['s'] = false; },
              onMouseDown: function() { keysRef.current['s'] = true; },
              onMouseUp: function() { keysRef.current['s'] = false; },
              style: { width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #ef4444', background: 'rgba(239,68,68,0.3)', color: '#fff', fontSize: '20px', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }
            }, '▼')
          ),
          // Left side touch: gear + signals
          h('div', { style: { position: 'absolute', bottom: '110px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 20 },
            className: 'touch-controls' },
            h('button', { onClick: function() { if (Math.abs(carRef.current.speed) < 2) gearRef.current = gearRef.current === 'D' ? 'R' : 'D'; },
              style: { padding: '8px 14px', borderRadius: '8px', border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.2)', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, '⚙ Shift Gear'),
            h('button', { onClick: function() { blinkerRef.current = blinkerRef.current === -1 ? 0 : -1; },
              style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #22c55e', background: blinkerRef.current === -1 ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, '◄ Signal'),
            h('button', { onClick: function() { blinkerRef.current = blinkerRef.current === 1 ? 0 : 1; },
              style: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #22c55e', background: blinkerRef.current === 1 ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, 'Signal ►')
          ),
          // Free Explore live condition toolbar
          d.freeExplore ? h('div', { style: { position: 'absolute', bottom: '110px', right: '10px', padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.85)', border: '1px solid #a78bfa', zIndex: 15, minWidth: '160px' } },
            h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '6px', textAlign: 'center' } }, '🌎 FREE EXPLORE'),
            // Weather row
            h('div', { style: { display: 'flex', gap: '3px', marginBottom: '4px', justifyContent: 'center' } },
              [['clear','☀️'],['rain','🌧'],['snow','❄'],['fog','🌫']].map(function(w) {
                var active = currentScenario.weather === w[0];
                return h('button', { key: w[0], onClick: function() {
                  var newScn = Object.assign({}, currentScenario, { weather: w[0] });
                  if (w[0] === 'snow') newScn.speedLimit = Math.min(newScn.speedLimit, 35);
                  if (w[0] === 'fog') newScn.speedLimit = Math.min(newScn.speedLimit, 30);
                  upd('scenario', newScn.id); // keep scenario ID but the physics reads currentScenario
                  // Mutate the scenario ref for immediate effect (CDN tool pattern)
                  Object.assign(currentScenario, newScn);
                },
                  style: { padding: '3px 6px', borderRadius: '4px', border: '1px solid ' + (active ? '#a78bfa' : '#334155'), background: active ? '#2e1065' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '12px' } }, w[1]);
              })
            ),
            // Time row
            h('div', { style: { display: 'flex', gap: '3px', marginBottom: '4px', justifyContent: 'center' } },
              [['day','☀️ Day'],['night','🌙 Night']].map(function(t) {
                var active = currentScenario.time === t[0];
                return h('button', { key: t[0], onClick: function() {
                  Object.assign(currentScenario, { time: t[0] });
                },
                  style: { padding: '3px 8px', borderRadius: '4px', border: '1px solid ' + (active ? '#a78bfa' : '#334155'), background: active ? '#2e1065' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, t[1]);
              })
            ),
            // Traffic row
            h('div', { style: { display: 'flex', gap: '3px', marginBottom: '4px', justifyContent: 'center' } },
              [['light','Few'],['medium','Med'],['heavy','Many']].map(function(t) {
                var active = currentScenario.traffic === t[0];
                return h('button', { key: t[0], onClick: function() {
                  Object.assign(currentScenario, { traffic: t[0] });
                  // Respawn traffic to match
                  trafficRef.current = spawnTraffic(currentScenario);
                  cyclistsRef.current = spawnCyclists(currentScenario).concat(spawnMotorcycles(currentScenario));
                },
                  style: { padding: '3px 8px', borderRadius: '4px', border: '1px solid ' + (active ? '#a78bfa' : '#334155'), background: active ? '#2e1065' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, t[1]);
              })
            ),
            // Speed limit display
            h('div', { style: { fontSize: '9px', color: '#94a3b8', textAlign: 'center' } }, 'Limit: ' + currentScenario.speedLimit + ' mph'),
            // Distance driven
            h('div', { style: { fontSize: '9px', color: '#64748b', textAlign: 'center', marginTop: '2px' } }, 'Dist: ' + (statsRef.current.distance / 1609).toFixed(2) + ' mi'),
            // Infinite world info
            infiniteWorldRef.current ? h('div', { style: { fontSize: '8px', color: '#a78bfa', textAlign: 'center', marginTop: '3px' } },
              '🌍 Seed: ' + (d.worldSeed || '?') + (infiniteWorldRef.current.chunks[Math.floor(carRef.current.y / CHUNK_SIZE)] ? ' · ' + infiniteWorldRef.current.chunks[Math.floor(carRef.current.y / CHUNK_SIZE)].biome : '')
            ) : null
          ) : null
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
              // Award permit_pass badge if 80%+ (16/20)
              if (permitState.score >= 16) {
                var b = Object.assign({}, earnedBadges);
                b.permit_pass = true;
                upd('badges', b);
                addToast('🏅 Permit Pass badge earned!');
              }
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
        var gradeLabel, gradeColor, gradeLetter, gradeXP;
        var combined = (drivingStats.safetyScore + drivingStats.efficiencyScore) / 2;
        var isFreeExplore = d.freeExplore;
        if (isFreeExplore) {
          gradeLabel = '🌎 Free Explore — No Grade'; gradeColor = '#a78bfa'; gradeLetter = '—'; gradeXP = 15;
        } else if (combined >= 95) { gradeLabel = '🏆 Outstanding — Instructor Ready'; gradeColor = '#fbbf24'; gradeLetter = 'A+'; gradeXP = 50; }
        else if (combined >= 90) { gradeLabel = '🏆 Excellent'; gradeColor = '#fbbf24'; gradeLetter = 'A'; gradeXP = 40; }
        else if (combined >= 80) { gradeLabel = '🌟 Great Drive'; gradeColor = '#4ade80'; gradeLetter = 'B'; gradeXP = 30; }
        else if (combined >= 70) { gradeLabel = '👍 Good — Room to Improve'; gradeColor = '#60a5fa'; gradeLetter = 'C'; gradeXP = 20; }
        else if (combined >= 55) { gradeLabel = '📝 Fair — Study the Lessons'; gradeColor = '#f59e0b'; gradeLetter = 'D'; gradeXP = 10; }
        else { gradeLabel = '⚠️ Fail — More Training Needed'; gradeColor = '#ef4444'; gradeLetter = 'F'; gradeXP = 5; }

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('div', { style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '14px', padding: '24px', border: '1px solid #334155' } },
            h('div', { style: { textAlign: 'center', marginBottom: '14px' } },
              h('div', { style: { fontSize: '48px' } }, '🚗'),
              h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Drive Debrief'),
              h('div', { style: { fontSize: '14px', color: gradeColor, fontWeight: 800, marginTop: '4px' } }, gradeLabel),
              h('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' } }, drivingStats.scenario + ' · ' + drivingStats.vehicle),
              h('div', { style: { display: 'inline-flex', gap: '12px', marginTop: '8px' } },
                h('span', { style: { padding: '4px 14px', borderRadius: '8px', background: gradeColor + '22', border: '2px solid ' + gradeColor, fontSize: '18px', fontWeight: 900, color: gradeColor } }, gradeLetter),
                h('span', { style: { padding: '4px 12px', borderRadius: '8px', background: '#1e3a5f', border: '1px solid #3b82f6', fontSize: '12px', fontWeight: 700, color: '#60a5fa' } }, '+' + gradeXP + ' XP')
              )
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
              // Drive path map
              drivingStats.drivePath && drivingStats.drivePath.length > 5 ? h('div', { style: { marginBottom: '14px' } },
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', marginBottom: '6px' } }, '🗺️ Your Drive Path'),
                h('canvas', {
                  ref: function(c) {
                    if (!c) return;
                    var g = c.getContext('2d');
                    var W = c.width = c.offsetWidth || 600;
                    var H = c.height = 140;
                    var path = drivingStats.drivePath;
                    g.fillStyle = '#0a1628'; g.fillRect(0, 0, W, H);
                    // Find bounds
                    var minX = 999, maxX = -999, minY = 999, maxY = -999;
                    path.forEach(function(p) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
                    var rangeX = Math.max(1, maxX - minX);
                    var rangeY = Math.max(1, maxY - minY);
                    var pad = 10;
                    // Draw road grid (faint)
                    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
                    for (var gx = 0; gx < 5; gx++) { var lx = pad + gx * (W - pad * 2) / 4; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, H); g.stroke(); }
                    for (var gy = 0; gy < 4; gy++) { var ly = pad + gy * (H - pad * 2) / 3; g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke(); }
                    // Draw path colored by speed
                    var maxSpd = Math.max.apply(null, path.map(function(p) { return p.speed; })) || 1;
                    path.forEach(function(p, i) {
                      if (i === 0) return;
                      var px = pad + (p.x - minX) / rangeX * (W - pad * 2);
                      var py = pad + (p.y - minY) / rangeY * (H - pad * 2);
                      var prevP = path[i - 1];
                      var ppx = pad + (prevP.x - minX) / rangeX * (W - pad * 2);
                      var ppy = pad + (prevP.y - minY) / rangeY * (H - pad * 2);
                      // Color: green = slow, yellow = medium, red = fast
                      var spdPct = p.speed / maxSpd;
                      var r = Math.round(spdPct > 0.5 ? 255 : spdPct * 2 * 255);
                      var gr2 = Math.round(spdPct < 0.5 ? 255 : (1 - spdPct) * 2 * 255);
                      g.strokeStyle = 'rgb(' + r + ',' + gr2 + ',60)';
                      g.lineWidth = 2.5;
                      g.beginPath(); g.moveTo(ppx, ppy); g.lineTo(px, py); g.stroke();
                    });
                    // Start + end markers
                    if (path.length > 1) {
                      var sx = pad + (path[0].x - minX) / rangeX * (W - pad * 2);
                      var sy = pad + (path[0].y - minY) / rangeY * (H - pad * 2);
                      g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(sx, sy, 4, 0, Math.PI * 2); g.fill();
                      var ex = pad + (path[path.length - 1].x - minX) / rangeX * (W - pad * 2);
                      var ey = pad + (path[path.length - 1].y - minY) / rangeY * (H - pad * 2);
                      g.fillStyle = '#ef4444'; g.beginPath(); g.arc(ex, ey, 4, 0, Math.PI * 2); g.fill();
                    }
                    // Legend
                    g.fillStyle = '#64748b'; g.font = '8px system-ui'; g.textAlign = 'left';
                    g.fillText('🟢 slow  🟡 medium  🔴 fast  ● start  ● end', 4, H - 4);
                  },
                  style: { width: '100%', height: '140px', display: 'block', borderRadius: '8px', background: '#0a1628' }
                })
              ) : null,
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' } }, '💡 Coach\'s Feedback'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } },
                drivingStats.jackrabbits > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #f59e0b' } }, '🚀 ' + drivingStats.jackrabbits + ' jackrabbit starts — every hard acceleration wastes fuel. Imagine an egg between your foot and the pedal.') : null,
                drivingStats.hardBrakes > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '🛑 ' + drivingStats.hardBrakes + ' hard brakes — hard braking means you were not reading the road ahead. Look 15 seconds down the road, not at the car in front of you.') : null,
                drivingStats.speedViolations > 2 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '⚠️ Speed limit exceeded for ' + Math.round(drivingStats.speedViolations) + 's total. Remember: braking distance grows with v². A little faster = a lot more stopping distance.') : null,
                drivingStats.closeFollows > 5 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #f59e0b' } }, '👀 Following too close. Use the 3-second rule. Pick a fixed point ahead. Count after the car in front passes it.') : null,
                drivingStats.crashes === 0 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #4ade80' } }, '✅ Zero crashes! That is the baseline real drivers are measured against.') : null,
                drivingStats.skidSeconds > 1 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #ef4444' } }, '🛞 You skidded for ' + drivingStats.skidSeconds + 's. Remember: brake BEFORE turns, not during. The friction circle has a fixed budget — use it for braking OR steering, not both.') : null,
                drivingStats.cyclistClose > 0 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #fbbf24' } }, '🚴 ' + drivingStats.cyclistClose + ' close pass(es) to cyclists. Maine requires 3 feet minimum. Cross the centerline to pass if the oncoming lane is clear.') : null,
                drivingStats.unsignaledLaneChanges > 0 ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #f59e0b' } }, '⚠️ ' + drivingStats.unsignaledLaneChanges + ' unsignaled lane change(s). Use E=left, R=right to signal before changing lanes. Signal at least 100 ft before the change.') : null,
                parseFloat(drivingStats.avgMPG) > currentVehicle.cityMPG ? h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid #4ade80' } }, '🌿 Beat the EPA sticker average. Hypermiling working!') : null
              )
            ),
            h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
              isFreeExplore ? h('button', { onClick: function() { upd('view', 'freeExploreSetup'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' } }, '🌎 Explore Again') : null,
              h('button', { onClick: function() { updMulti({ view: 'scenarioSelect', freeExplore: false, freeExploreScenario: null }); },
                style: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#22d3ee', color: '#0f172a', fontSize: '13px', fontWeight: 800, cursor: 'pointer' } }, '🔁 Drive Again'),
              h('button', { onClick: function() { upd('view', 'menu'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #64748b', background: 'transparent', color: '#cbd5e1', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '🏠 Menu'),
              // Crash replay button (only if there was a crash)
              drivingStats.lastCrashReplay ? h('button', { onClick: function() { upd('view', 'crashReplay'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '🔄 Crash Replay') : null,
              // Certificate button (only if passed with A or B)
              !isFreeExplore && combined >= 80 ? h('button', { onClick: function() { upd('view', 'certificate'); },
                style: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.15)', color: '#fcd34d', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } }, '📜 Certificate') : null
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

      // ── INTERSECTION RIGHT-OF-WAY GUIDE ──
      if (view === 'intersectionGuide') {
        var intTypes = [
          { type: '4-Way Stop', icon: '🛑', rules: ['First to arrive goes first.', 'Tie: vehicle on the RIGHT goes first.', 'Tie AND both going straight: left-turner yields.', 'When in doubt, yield.'], tip: 'Count arrivals at the intersection like a queue. Most crashes happen because someone assumes they have the right-of-way.' },
          { type: 'Traffic Light', icon: '🚦', rules: ['Green: go (but yield to peds in crosswalk).', 'Yellow: stop if you safely can; proceed if already in the intersection.', 'Red: full stop before the stop line.', 'Left turn on green: yield to oncoming straight traffic.', 'Green arrow: protected turn — you have right-of-way.'], tip: 'A stale green (been green a while) will turn yellow soon. Start covering the brake.' },
          { type: 'Uncontrolled (no sign or light)', icon: '⚠️', rules: ['Yield to the vehicle already in the intersection.', 'If arriving at the same time, yield to the RIGHT.', 'Slow down and look left-right-left before entering.'], tip: 'Common on rural roads. Treat them like a hidden yield sign — slow, look, proceed only when safe.' },
          { type: 'Roundabout', icon: '🔄', rules: ['Yield to traffic already circulating.', 'Enter when there is a safe gap.', 'Travel counterclockwise.', 'Signal right before your exit.', 'Do NOT stop inside the circle.'], tip: 'Roundabouts reduce fatal crashes by 90% vs. signals. Once you get used to them, they are faster and safer.' },
          { type: 'T-Intersection', icon: '⊤', rules: ['Traffic on the through road has the right-of-way.', 'The vehicle on the terminating road must yield/stop.', 'If both have stop signs, right-of-way goes to the right.'], tip: 'The "top of the T" is the through road. The "stem" yields.' },
          { type: 'Left Turn', icon: '↰', rules: ['Left turners yield to oncoming straight traffic unless you have a green arrow.', 'Wait behind the stop line until a safe gap.', 'Do NOT enter the intersection to wait unless you are certain you can clear it.', 'Maine: left turn on red from a one-way to a one-way is legal (after full stop).'], tip: 'Left turns are the #1 most dangerous common maneuver. 53% of intersection crashes involve left turns.' },
          { type: 'Pedestrian Crosswalk', icon: '🚶', rules: ['Yield to pedestrians in ALL crosswalks — marked AND unmarked.', 'Unmarked crosswalk = the imaginary extension of the sidewalk at any intersection.', 'Do NOT pass a vehicle stopped for a pedestrian.', 'If a ped is in your half of the road, you must stop.'], tip: 'Maine is strict on this. $164 fine for failing to yield to a pedestrian in a crosswalk.' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #134e4a, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #14b8a6', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🚦'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Intersection Right-of-Way Guide'),
            h('div', { style: { fontSize: '11px', color: '#99f6e4' } }, 'Who goes first? The answer for every type.')
          ),
          intTypes.map(function(it) {
            return h('div', { key: it.type, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                h('span', { style: { fontSize: '24px' } }, it.icon),
                h('span', { style: { fontSize: '14px', fontWeight: 800 } }, it.type)
              ),
              it.rules.map(function(r, ri) {
                return h('div', { key: ri, style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '10px', borderLeft: '2px solid #14b8a6', marginBottom: '4px' } }, '• ' + r);
              }),
              h('div', { style: { fontSize: '10px', color: '#fde68a', marginTop: '6px' } }, '💡 ' + it.tip)
            );
          })
        );
      }

      // ── DASHBOARD WARNING LIGHTS ──
      if (view === 'dashLights') {
        var lights = [
          { icon: '🔴', name: 'Check Engine (MIL)', color: '#ef4444', severity: 'VARIES', desc: 'Steady = emissions issue, safe to drive to a shop. FLASHING = misfire, pull over immediately — catalytic converter damage.', action: 'Steady: schedule service within a week. Flashing: pull over NOW, do not drive further.' },
          { icon: '🔴', name: 'Oil Pressure', color: '#ef4444', severity: 'CRITICAL', desc: 'Engine oil pressure is dangerously low. Continuing will destroy the engine in minutes.', action: 'Pull over IMMEDIATELY. Turn off the engine. Check oil level. Do NOT drive if oil is low — tow it.' },
          { icon: '🔴', name: 'Temperature / Overheating', color: '#ef4444', severity: 'CRITICAL', desc: 'Coolant is too hot. Driving further can crack the head gasket ($2,000+ repair).', action: 'Pull over. Turn off AC, turn heat on MAX (pulls heat from engine). Let it cool 30 min. Check coolant level. Tow if recurring.' },
          { icon: '🔴', name: 'Brake System', color: '#ef4444', severity: 'CRITICAL', desc: 'Brake failure or very low brake fluid. Parking brake engaged also shows this light.', action: 'If parking brake is off and this light is on: pump brakes gently, pull over at the first safe spot, tow to a shop. Do NOT drive at speed.' },
          { icon: '🟡', name: 'ABS', color: '#f59e0b', severity: 'MODERATE', desc: 'Anti-lock braking system fault. Normal brakes still work, but ABS will not activate in hard stops.', action: 'Safe to drive carefully to a shop. Avoid hard braking situations. Be extra cautious on wet/icy roads.' },
          { icon: '🟡', name: 'TPMS (Tire Pressure)', color: '#f59e0b', severity: 'MODERATE', desc: 'One or more tires is significantly under-inflated (usually 25%+ below spec).', action: 'Check all 4 tires with a gauge. Inflate to the PSI on the driver door sticker (NOT the tire sidewall — that is the maximum). A $5 gauge saves tires and fuel.' },
          { icon: '🟡', name: 'Battery / Charging', color: '#f59e0b', severity: 'MODERATE', desc: 'Alternator not charging the battery. The car will run on battery power for 30-60 minutes, then die.', action: 'Drive directly to a shop. Turn off AC, radio, heated seats — anything electrical. If the car stalls, you will lose power steering and power brakes.' },
          { icon: '🟡', name: 'Traction Control (TC/ESC)', color: '#f59e0b', severity: 'LOW', desc: 'Blinking = system is actively working (wheels are slipping). Steady = system is OFF.', action: 'Blinking: slow down, the road is slippery. Steady: check if you accidentally turned it off. On snow/ice, you generally want it ON.' },
          { icon: '🔵', name: 'High Beam Indicator', color: '#3b82f6', severity: 'INFO', desc: 'High beams are on. Remember to dim for oncoming traffic and following cars.', action: 'Press L key in the sim or the headlight stalk in a real car. Always dim within 500 ft of other vehicles.' },
          { icon: '⬜', name: 'Airbag (SRS)', color: '#94a3b8', severity: 'SAFETY', desc: 'Airbag system fault. Airbags may not deploy in a crash.', action: 'Get this diagnosed ASAP. Airbags are a critical safety system. The car is safe to drive, but you are unprotected in a crash.' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #881337, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #f43f5e', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔧'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Dashboard Warning Lights'),
            h('div', { style: { fontSize: '11px', color: '#fda4af' } }, 'What each light means, how serious it is, and exactly what to do.')
          ),
          lights.map(function(lt, i) {
            return h('div', { key: i, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', borderLeft: '4px solid ' + lt.color, marginBottom: '8px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('span', { style: { fontSize: '18px' } }, lt.icon),
                  h('span', { style: { fontSize: '13px', fontWeight: 800 } }, lt.name)
                ),
                h('span', { style: { fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: lt.severity === 'CRITICAL' ? '#7f1d1d' : lt.severity === 'MODERATE' ? '#78350f' : '#1e293b', color: lt.severity === 'CRITICAL' ? '#fca5a5' : lt.severity === 'MODERATE' ? '#fde68a' : '#94a3b8' } }, lt.severity)
              ),
              h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '6px' } }, lt.desc),
              h('div', { style: { fontSize: '10px', color: '#a5f3fc', lineHeight: '1.4', paddingLeft: '8px', borderLeft: '2px solid #22d3ee' } }, '🔧 ' + lt.action)
            );
          })
        );
      }

      // ── PRE-TRIP INSPECTION CHECKLIST ──
      if (view === 'preTrip') {
        var checks = [
          { area: 'Tires', icon: '🛞', items: ['Check pressure with gauge (door sticker PSI, not sidewall)', 'Tread depth: penny test — if you see all of Lincoln\'s head, replace', 'No bulges, cracks, or nails visible', 'Spare tire inflated and jack present'] },
          { area: 'Lights', icon: '💡', items: ['Headlights: low beams + high beams working', 'Tail lights and brake lights (have someone press brake while you look)', 'Turn signals all four corners', 'Reverse lights', 'License plate light'] },
          { area: 'Fluids', icon: '🧪', items: ['Engine oil: check dipstick, between min/max marks', 'Coolant: visible in overflow tank, NOT when hot', 'Brake fluid: reservoir at or above minimum line', 'Windshield washer fluid: top off', 'Transmission fluid: check with engine running (some cars)'] },
          { area: 'Wipers & Glass', icon: '🪟', items: ['Wiper blades not torn or streaking', 'Windshield: no cracks in driver\'s line of sight', 'All mirrors adjusted: rearview + both side mirrors', 'Defrost/defog working (critical in Maine winters)'] },
          { area: 'Safety Equipment', icon: '🛡️', items: ['Seatbelts: all buckles click and retract', 'Airbag light: goes off after engine start (if it stays on = problem)', 'Horn: working', 'Emergency kit: first aid, flashlight, blanket, jumper cables', 'Registration and insurance card in glove box'] },
          { area: 'Before Moving', icon: '🔑', items: ['Seat position: can reach all pedals fully', 'Mirrors adjusted BEFORE driving', 'Seatbelt on', 'Parking brake released', 'Check surroundings: walk around the car, check for children/animals/obstacles behind'] }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #3f6212, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #84cc16', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '✅'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Pre-Trip Vehicle Inspection'),
            h('div', { style: { fontSize: '11px', color: '#d9f99d' } }, 'Walk-around checklist. Pro drivers do this every time. You should too.')
          ),
          checks.map(function(ch) {
            return h('div', { key: ch.area, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
                h('span', { style: { fontSize: '22px' } }, ch.icon),
                h('span', { style: { fontSize: '13px', fontWeight: 800 } }, ch.area)
              ),
              ch.items.map(function(item, ii) {
                return h('div', { key: ii, style: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '3px' } },
                  h('span', { style: { color: '#84cc16', fontWeight: 700, flexShrink: 0 } }, '☐'),
                  h('span', null, item)
                );
              })
            );
          }),
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', fontSize: '11px', color: '#94a3b8' } },
            h('div', { style: { fontWeight: 700, color: '#84cc16', marginBottom: '4px' } }, '💡 When to do this:'),
            'Every time you drive a car you haven\'t driven in a while. Before long trips. After someone else used the car. After any maintenance. And honestly, a quick tire + lights + mirror check should be habit every single time.'
          )
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

      // ── EMERGENCY RESPONSE DRILL ──
      if (view === 'emergencyDrill') {
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #7f1d1d, #0f172a)', borderRadius: '14px', padding: '24px', border: '2px solid #ef4444', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '48px' } }, '🚨'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '6px' } }, 'Emergency Vehicle Response Drill'),
            h('div', { style: { fontSize: '12px', color: '#fca5a5' } }, 'Sirens will sound frequently. Practice the correct response every time.')
          ),
          // The protocol
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' } }, 'The Protocol (all 50 states)'),
            [
              { step: '1. CHECK', desc: 'Check mirrors to identify the emergency vehicle\'s position and direction.', icon: '👀' },
              { step: '2. SIGNAL', desc: 'Signal RIGHT to indicate your intent to move over.', icon: '➡️' },
              { step: '3. MOVE RIGHT', desc: 'Safely move to the RIGHT shoulder or right lane.', icon: '🚗➡️' },
              { step: '4. STOP', desc: 'Come to a COMPLETE STOP and wait until the vehicle passes.', icon: '🛑' },
              { step: '5. WAIT', desc: 'Check for additional emergency vehicles before re-entering traffic.', icon: '⏳' },
              { step: '6. RESUME', desc: 'Signal left, check blind spot, and merge back carefully.', icon: '🔄' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px', paddingLeft: '8px', borderLeft: '2px solid #ef4444' } },
                h('span', { style: { fontSize: '18px', flexShrink: 0 } }, s.icon),
                h('div', null,
                  h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#fca5a5' } }, s.step),
                  h('div', { style: { fontSize: '11px', color: '#cbd5e1' } }, s.desc)
                )
              );
            })
          ),
          // Special rules
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' } }, '⚠️ Special situations'),
            h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
              h('div', { style: { marginBottom: '4px' } }, '• ', h('b', null, 'At an intersection:'), ' Do NOT stop in the intersection. Pull through first, then move right.'),
              h('div', { style: { marginBottom: '4px' } }, '• ', h('b', null, 'Divided highway:'), ' If the emergency vehicle is on the OTHER side of the median, you do not need to stop (but slow down).'),
              h('div', { style: { marginBottom: '4px' } }, '• ', h('b', null, 'Cannot move right:'), ' If right shoulder is blocked, stop where you are. The emergency vehicle will go around you.'),
              h('div', { style: { marginBottom: '4px' } }, '• ', h('b', null, 'Multiple vehicles:'), ' Stay stopped until ALL emergency vehicles have passed. They often travel in convoys.'),
              h('div', null, '• ', h('b', null, 'Maine Move Over law:'), ' Also applies to stopped tow trucks, utility vehicles, and roadside assistance with lights flashing.')
            )
          ),
          // Consequences
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' } }, 'Why this matters'),
            h('div', { style: { fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' } },
              'Every second counts for emergency responders. A 1-minute delay reaching a cardiac arrest patient reduces survival by 10%. Failure to yield is a criminal offense in most states — fines from $250 to $2,500, possible license suspension, and if someone is hurt, potential manslaughter charges.'
            )
          ),
          h('button', { onClick: function() {
            // Launch suburban scenario with boosted emergency frequency
            updMulti({ emergencyDrillMode: true });
            startDriving('suburban', selectedVehicle);
          },
            style: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '15px', fontWeight: 900, cursor: 'pointer' }
          }, '🚨 Start Emergency Drill — Sirens Will Be Frequent'),
          h('div', { style: { marginTop: '8px', fontSize: '10px', color: '#64748b', textAlign: 'center' } },
            'Emergency vehicles will spawn every 20-30 seconds. Practice until the response is automatic. Earns the "First Responder" achievement.'
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
        return h(ParkingMode, { key: 'parking-mode', ctx: ctx, h: h, React: React, onExit: function() { upd('view', 'menu'); } });
      }

      // ── 3-POINT TURN (2D) ──
      if (view === 'threePoint') {
        return h(ThreePointMode, { key: 'threepoint-mode', h: h, React: React, onExit: function() { upd('view', 'menu'); } });
      }

      // ── BACKING DRILL (2D) ──
      if (view === 'backingDrill') {
        return h(BackingDrillMode, { key: 'backing-mode', h: h, React: React, onExit: function() { upd('view', 'menu'); } });
      }

      // ── FUEL COST CALCULATOR ──
      if (view === 'fuelCalc') {
        var fcMiles = d.fcMiles || 12000;
        var fcGasPrice = d.fcGasPrice || 3.50;
        var fcElecPrice = d.fcElecPrice || 0.14;

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #7c2d12, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #f97316', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '36px' } }, '💰'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Fuel Cost Calculator'),
            h('div', { style: { fontSize: '11px', color: '#fed7aa' } }, 'See what driving really costs — by vehicle, habits, and fuel type.')
          ),
          // Inputs
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#f97316', marginBottom: '4px' } }, 'ANNUAL MILES'),
              h('input', { type: 'range', min: 3000, max: 30000, step: 1000, value: fcMiles, onChange: function(e) { upd('fcMiles', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#f97316' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center', fontFamily: 'monospace' } }, fcMiles.toLocaleString())
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#f97316', marginBottom: '4px' } }, 'GAS $/GAL'),
              h('input', { type: 'range', min: 2, max: 6, step: 0.10, value: fcGasPrice, onChange: function(e) { upd('fcGasPrice', parseFloat(e.target.value)); }, style: { width: '100%', accentColor: '#f97316' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center', fontFamily: 'monospace' } }, '$' + fcGasPrice.toFixed(2))
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#f97316', marginBottom: '4px' } }, 'ELECTRICITY $/kWh'),
              h('input', { type: 'range', min: 0.08, max: 0.35, step: 0.01, value: fcElecPrice, onChange: function(e) { upd('fcElecPrice', parseFloat(e.target.value)); }, style: { width: '100%', accentColor: '#f97316' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center', fontFamily: 'monospace' } }, '$' + fcElecPrice.toFixed(2))
            )
          ),
          // Results table
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } },
              h('thead', null,
                h('tr', { style: { background: '#1e293b', color: '#94a3b8', fontWeight: 700, fontSize: '10px' } },
                  ['', 'Vehicle', 'AVG MPG', 'GAL/yr', '$/year', '$/mile', 'vs Sedan'].map(function(col, ci) {
                    return h('th', { key: ci, style: { padding: '8px', textAlign: 'left', borderBottom: '1px solid #334155' } }, col);
                  })
                )
              ),
              h('tbody', null,
                VEHICLES.map(function(v) {
                  var avgMpg = (v.cityMPG + v.hwyMPG) / 2;
                  var isEV = v.type === 'electric';
                  var galYr = isEV ? 0 : fcMiles / avgMpg;
                  var kwhYr = isEV ? fcMiles / (avgMpg / 33.7) : 0; // MPGe to kWh
                  var costYr = isEV ? kwhYr * fcElecPrice : galYr * fcGasPrice;
                  var costMi = costYr / fcMiles;
                  var sedanAvg = (VEHICLES[0].cityMPG + VEHICLES[0].hwyMPG) / 2;
                  var sedanCost = (fcMiles / sedanAvg) * fcGasPrice;
                  var diff = costYr - sedanCost;
                  return h('tr', { key: v.id, style: { borderBottom: '1px solid #1e293b' } },
                    h('td', { style: { padding: '8px', fontSize: '16px' } }, v.icon),
                    h('td', { style: { padding: '8px', fontWeight: 700, color: '#fff' } }, v.name),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, avgMpg.toFixed(0) + (isEV ? 'e' : '')),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, isEV ? kwhYr.toFixed(0) + ' kWh' : galYr.toFixed(0)),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: costYr < sedanCost ? '#4ade80' : costYr > sedanCost * 1.2 ? '#ef4444' : '#fbbf24' } }, '$' + costYr.toFixed(0)),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', color: '#94a3b8' } }, '$' + costMi.toFixed(3)),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', color: diff < 0 ? '#4ade80' : diff > 0 ? '#ef4444' : '#94a3b8' } }, (diff >= 0 ? '+' : '') + '$' + diff.toFixed(0))
                  );
                })
              )
            )
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginTop: '12px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', marginBottom: '6px' } }, '💡 Insights'),
            h('div', null, '• The average American drives ~12,000 mi/yr. At $3.50/gal in a 37-MPG sedan, that is ~$1,135/yr in fuel.'),
            h('div', null, '• Switching from a pickup (21 MPG avg) to a hybrid (53 MPG avg) saves ~$', Math.round((fcMiles / 21 - fcMiles / 53) * fcGasPrice), '/yr.'),
            h('div', null, '• The EV at $', fcElecPrice.toFixed(2), '/kWh costs ~$', Math.round(fcMiles / ((130 + 115) / 2 / 33.7) * fcElecPrice), '/yr — ', Math.round((1 - (fcMiles / ((130 + 115) / 2 / 33.7) * fcElecPrice) / ((fcMiles / 37) * fcGasPrice)) * 100), '% less than a sedan.'),
            h('div', null, '• Smooth driving (no jackrabbits, coast to stops) improves real-world MPG by 20-40% over the EPA sticker.')
          )
        );
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

      // ── CRASH REPLAY ──
      if (view === 'crashReplay' && drivingStats && drivingStats.lastCrashReplay) {
        var replay = drivingStats.lastCrashReplay;
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'debrief'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Debrief'),
          h('div', { style: { background: 'linear-gradient(135deg, #7f1d1d, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #ef4444', textAlign: 'center', marginBottom: '14px' } },
            h('div', { style: { fontSize: '42px' } }, '🔄'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Crash Replay — Black Box Data'),
            h('div', { style: { fontSize: '11px', color: '#fca5a5' } }, 'Last ' + (replay.length / 60).toFixed(1) + ' seconds before impact. Speed + steering trace.')
          ),
          // Speed graph
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' } }, 'Speed (mph) over time'),
            h('canvas', {
              ref: function(c) {
                if (!c) return;
                var g = c.getContext('2d');
                var W = c.width = c.offsetWidth || 600;
                var H = c.height = 120;
                g.fillStyle = '#020617'; g.fillRect(0, 0, W, H);
                var maxSpd = Math.max.apply(null, replay.map(function(r) { return Math.abs(r.speed) * MS_TO_MPH; })) || 1;
                // Speed line
                g.strokeStyle = '#ef4444'; g.lineWidth = 2; g.beginPath();
                replay.forEach(function(r, i) {
                  var px = (i / (replay.length - 1)) * W;
                  var py = H - (Math.abs(r.speed) * MS_TO_MPH / maxSpd) * H * 0.85;
                  if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
                });
                g.stroke();
                // Steering line
                g.strokeStyle = '#60a5fa'; g.lineWidth = 1.5; g.beginPath();
                replay.forEach(function(r, i) {
                  var px = (i / (replay.length - 1)) * W;
                  var py = H / 2 - r.steering * H * 0.4;
                  if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
                });
                g.stroke();
                // Labels
                g.fillStyle = '#ef4444'; g.font = '9px system-ui'; g.textAlign = 'left';
                g.fillText('Speed: ' + Math.round(maxSpd) + ' mph max', 4, 12);
                g.fillStyle = '#60a5fa';
                g.fillText('Steering', 4, 24);
                g.fillStyle = '#64748b'; g.textAlign = 'right';
                g.fillText('← ' + (replay.length / 60).toFixed(1) + 's before impact', W - 4, H - 4);
                // Impact marker
                g.fillStyle = '#fbbf24';
                g.fillRect(W - 3, 0, 3, H);
                g.font = 'bold 9px system-ui'; g.textAlign = 'right';
                g.fillText('IMPACT', W - 6, 12);
              },
              style: { width: '100%', height: '120px', display: 'block', borderRadius: '6px' }
            })
          ),
          // Analysis
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#ef4444', marginBottom: '4px' } }, '🔍 What the black box shows:'),
            replay.length > 20 ? h('div', null, '• Speed at impact: ', h('b', null, Math.round(Math.abs(replay[replay.length - 1].speed) * MS_TO_MPH) + ' mph')) : null,
            replay.length > 20 ? h('div', null, '• Speed 2 seconds before: ', h('b', null, Math.round(Math.abs(replay[Math.max(0, replay.length - 120)].speed) * MS_TO_MPH) + ' mph')) : null,
            replay.length > 20 ? h('div', null, '• Steering at impact: ', h('b', null, (replay[replay.length - 1].steering > 0.1 ? 'turning right' : replay[replay.length - 1].steering < -0.1 ? 'turning left' : 'straight'))) : null,
            replay.length > 20 ? h('div', null, '• Gear: ', h('b', null, replay[replay.length - 1].gear || 'D')) : null
          )
        );
      }

      // ── CERTIFICATE OF COMPLETION ──
      if (view === 'certificate' && drivingStats) {
        var certDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        return h('div', { style: { padding: '20px', maxWidth: '700px', margin: '0 auto' } },
          h('button', { onClick: function() { upd('view', 'debrief'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Back'),
          h('div', { id: 'roadready-certificate', style: { background: 'linear-gradient(135deg, #fefce8, #fff7ed)', borderRadius: '16px', padding: '40px', border: '3px solid #fbbf24', textAlign: 'center', color: '#1e293b', position: 'relative' } },
            // Decorative border
            h('div', { style: { position: 'absolute', top: '8px', left: '8px', right: '8px', bottom: '8px', border: '2px solid #d4a843', borderRadius: '12px', pointerEvents: 'none' } }),
            h('div', { style: { fontSize: '14px', letterSpacing: '4px', color: '#a07830', fontWeight: 700, marginBottom: '8px' } }, 'CERTIFICATE OF COMPLETION'),
            h('div', { style: { fontSize: '36px', marginBottom: '4px' } }, '🚗'),
            h('div', { style: { fontSize: '24px', fontWeight: 900, color: '#1e293b', marginBottom: '4px' } }, 'RoadReady'),
            h('div', { style: { fontSize: '13px', color: '#64748b', marginBottom: '16px' } }, "Driver's Education & Automotive Science"),
            h('div', { style: { width: '60%', height: '1px', background: '#d4a843', margin: '0 auto 16px' } }),
            h('div', { style: { fontSize: '12px', color: '#64748b', marginBottom: '4px' } }, 'This certifies that'),
            h('div', { style: { fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', fontStyle: 'italic' } }, 'Student Driver'),
            h('div', { style: { fontSize: '12px', color: '#64748b', marginBottom: '4px' } }, 'has successfully completed the RoadReady driving course with a grade of'),
            h('div', { style: { fontSize: '36px', fontWeight: 900, color: '#a07830', marginBottom: '8px' } }, gradeLetter),
            h('div', { style: { fontSize: '11px', color: '#64748b', marginBottom: '16px' } },
              'Scenario: ' + drivingStats.scenario + ' · Vehicle: ' + drivingStats.vehicle),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '16px' } },
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b' } }, drivingStats.safetyScore),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Safety Score')
              ),
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b' } }, drivingStats.efficiencyScore),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Eco Score')
              ),
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b' } }, drivingStats.avgMPG),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Avg MPG')
              )
            ),
            h('div', { style: { width: '60%', height: '1px', background: '#d4a843', margin: '0 auto 12px' } }),
            h('div', { style: { fontSize: '11px', color: '#64748b' } }, certDate),
            h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '4px' } }, 'AlloFlow · RoadReady Driver\'s Ed · Portland, Maine'),
            h('div', { style: { fontSize: '9px', color: '#94a3b8', marginTop: '8px' } }, 'This certificate is for educational simulation purposes and does not replace state-required driver\'s education.')
          ),
          h('button', { onClick: function() {
            // Print the certificate
            var el = document.getElementById('roadready-certificate');
            if (el) {
              var w = window.open('', '_blank');
              w.document.write('<html><head><title>RoadReady Certificate</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8fafc;}</style></head><body>');
              w.document.write(el.outerHTML);
              w.document.write('</body></html>');
              w.document.close();
              setTimeout(function() { w.print(); }, 500);
            }
          },
            style: { display: 'block', width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', background: '#fbbf24', color: '#78350f', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }
          }, '🖨 Print Certificate')
        );
      }

      // ── HAZARD PERCEPTION TEST ──
      if (view === 'hazardTest') {
        var htState = d.htState || { round: 0, score: 0, total: 0, active: false, hazard: null, startTime: 0 };
        var hazards = [
          { desc: 'A child runs out from between parked cars chasing a ball.', type: 'child', reactionLimit: 2.5 },
          { desc: 'The car ahead suddenly brakes hard — their brake lights flash red.', type: 'hardBrake', reactionLimit: 1.5 },
          { desc: 'A deer appears at the edge of the road in your headlights.', type: 'deer', reactionLimit: 2.0 },
          { desc: 'An oncoming car drifts across the center line toward you.', type: 'headOn', reactionLimit: 1.5 },
          { desc: 'A door opens on a parked car just as you approach.', type: 'door', reactionLimit: 2.0 },
          { desc: 'A cyclist swerves into your lane to avoid a pothole.', type: 'cyclist', reactionLimit: 2.0 },
          { desc: 'The traffic light ahead turns yellow as you approach at speed.', type: 'yellow', reactionLimit: 2.0 },
          { desc: 'A pedestrian steps off the curb while looking at their phone.', type: 'distracted', reactionLimit: 2.5 },
          { desc: 'Black ice — your steering suddenly feels light and unresponsive.', type: 'ice', reactionLimit: 3.0 },
          { desc: 'A school bus ahead activates its red flashing lights and stop arm extends.', type: 'schoolBus', reactionLimit: 3.0 }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); upd('htState', null); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          !htState.active ? h('div', { style: { textAlign: 'center' } },
            h('div', { style: { background: 'linear-gradient(135deg, #9f1239, #0f172a)', borderRadius: '14px', padding: '24px', border: '1px solid #f43f5e', marginBottom: '14px' } },
              h('div', { style: { fontSize: '48px' } }, '⚡'),
              h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '4px' } }, 'Hazard Perception Test'),
              h('div', { style: { fontSize: '12px', color: '#fda4af', marginBottom: '14px' } }, 'You will see driving scenarios. Click/tap as FAST as possible when you spot the hazard. Your reaction time is measured.'),
              htState.total > 0 ? h('div', { style: { fontSize: '14px', color: '#fbbf24', marginBottom: '10px' } }, 'Score: ' + htState.score + '/' + htState.total + ' (' + Math.round(htState.score / htState.total * 100) + '%)') : null,
              h('button', { onClick: function() {
                var hz = hazards[htState.round % hazards.length];
                upd('htState', Object.assign({}, htState, { active: true, hazard: hz, startTime: Date.now(), responded: false }));
              },
                style: { padding: '14px 28px', borderRadius: '10px', border: 'none', background: '#f43f5e', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }
              }, htState.total > 0 ? '⚡ Next Hazard (' + (htState.round + 1) + '/' + hazards.length + ')' : '⚡ Start Test')
            )
          ) : h('div', null,
            h('div', { style: { background: '#0f172a', borderRadius: '14px', padding: '30px', border: '2px solid #f43f5e', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' },
              onClick: function() {
                if (htState.responded) return;
                var elapsed = (Date.now() - htState.startTime) / 1000;
                var passed = elapsed <= htState.hazard.reactionLimit;
                var newState = Object.assign({}, htState, {
                  responded: true,
                  reactionTime: elapsed,
                  passed: passed,
                  score: htState.score + (passed ? 1 : 0),
                  total: htState.total + 1,
                  round: htState.round + 1
                });
                upd('htState', newState);
                if (passed) {
                  speak('Good reaction. ' + elapsed.toFixed(1) + ' seconds.');
                } else {
                  speak('Too slow. You needed ' + htState.hazard.reactionLimit + ' seconds but took ' + elapsed.toFixed(1) + '.');
                }
              }
            },
              !htState.responded ? h('div', null,
                h('div', { style: { fontSize: '64px', marginBottom: '10px' } }, '🚨'),
                h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '8px' } }, 'HAZARD!'),
                h('div', { style: { fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto' } }, htState.hazard.desc),
                h('div', { style: { fontSize: '14px', color: '#f43f5e', fontWeight: 700, marginTop: '14px', animation: 'pulse 1s infinite' } }, '👆 CLICK / TAP NOW to brake/react!')
              ) : h('div', null,
                h('div', { style: { fontSize: '48px', marginBottom: '8px' } }, htState.passed ? '✅' : '⏱️'),
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: htState.passed ? '#4ade80' : '#ef4444' } }, htState.passed ? 'GOOD — ' + htState.reactionTime.toFixed(2) + 's' : 'TOO SLOW — ' + htState.reactionTime.toFixed(2) + 's'),
                h('div', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '4px' } }, 'Required: under ' + htState.hazard.reactionLimit + ' seconds'),
                h('div', { style: { fontSize: '11px', color: '#cbd5e1', marginTop: '8px', lineHeight: '1.5' } },
                  htState.hazard.type === 'child' ? 'Children are unpredictable. In residential areas, always scan between parked cars.' :
                  htState.hazard.type === 'headOn' ? 'Head-on collisions are the deadliest. Move RIGHT immediately — never swerve left.' :
                  htState.hazard.type === 'ice' ? 'On ice: ease off gas, steer gently, do NOT brake hard. Let the car slow naturally.' :
                  'At 60 mph you travel 88 feet per second. Every fraction of a second matters.'
                ),
                h('button', { onClick: function() {
                  if (htState.round >= hazards.length) {
                    upd('htState', Object.assign({}, htState, { active: false }));
                    // Award hazard_ace badge if 8/10+
                    if (htState.score >= 8) {
                      var hb = Object.assign({}, earnedBadges);
                      hb.hazard_ace = true;
                      upd('badges', hb);
                      addToast('🏅 Hazard Ace badge earned!');
                    }
                  } else {
                    var hz = hazards[htState.round % hazards.length];
                    upd('htState', Object.assign({}, htState, { active: true, hazard: hz, startTime: Date.now(), responded: false }));
                  }
                },
                  style: { marginTop: '14px', padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#f43f5e', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }
                }, htState.round >= hazards.length ? '📊 See Results' : '⚡ Next Hazard')
              )
            )
          )
        );
      }

      // ── INSURANCE COST ESTIMATOR ──
      if (view === 'insuranceCalc') {
        var insAge = d.insAge || 18;
        var insRecord = d.insRecord || 'clean';
        var insVehicle = d.insVehicle || 'sedan';
        // Simplified insurance rate model
        var baseRate = 1200;
        var ageFactor = insAge < 18 ? 2.5 : insAge < 21 ? 2.0 : insAge < 25 ? 1.5 : insAge < 65 ? 1.0 : 1.2;
        var recordFactor = insRecord === 'clean' ? 1.0 : insRecord === 'speeding' ? 1.35 : insRecord === 'accident' ? 1.7 : insRecord === 'dui' ? 2.8 : 1.0;
        var vehFactor = insVehicle === 'sedan' ? 1.0 : insVehicle === 'suv' ? 1.15 : insVehicle === 'truck' ? 1.1 : insVehicle === 'ev' ? 1.2 : insVehicle === 'sports' ? 1.6 : 1.0;
        var annualPremium = Math.round(baseRate * ageFactor * recordFactor * vehFactor);
        var monthlyPremium = Math.round(annualPremium / 12);

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #164e63, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #06b6d4', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🛡️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Insurance Cost Estimator'),
            h('div', { style: { fontSize: '11px', color: '#a5f3fc' } }, 'See how age, driving record, and vehicle type affect your premium.')
          ),
          // Inputs
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#06b6d4', marginBottom: '4px' } }, 'AGE'),
              h('input', { type: 'range', min: 16, max: 75, value: insAge, onChange: function(e) { upd('insAge', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#06b6d4' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, insAge + ' years old'),
              h('div', { style: { fontSize: '9px', color: '#64748b', textAlign: 'center' } }, insAge < 25 ? 'Under 25 = higher rates' : insAge > 64 ? 'Senior rate applies' : 'Standard adult rate')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#06b6d4', marginBottom: '6px' } }, 'DRIVING RECORD'),
              [['clean', '✅ Clean'], ['speeding', '⚠️ Speeding ticket'], ['accident', '💥 At-fault accident'], ['dui', '🚨 DUI/DWI']].map(function(r) {
                var sel = insRecord === r[0];
                return h('button', { key: r[0], onClick: function() { upd('insRecord', r[0]); },
                  style: { display: 'block', width: '100%', padding: '6px', marginBottom: '3px', borderRadius: '6px', border: '1px solid ' + (sel ? '#06b6d4' : '#334155'), background: sel ? '#164e63' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700, textAlign: 'left' } }, r[1]);
              })
            )
          ),
          // Vehicle selector
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#06b6d4', marginBottom: '6px' } }, 'VEHICLE TYPE'),
            h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
              [['sedan','🚗 Sedan'],['suv','🚙 SUV'],['truck','🛻 Truck'],['ev','⚡ EV'],['sports','🏎️ Sports']].map(function(v) {
                var sel = insVehicle === v[0];
                return h('button', { key: v[0], onClick: function() { upd('insVehicle', v[0]); },
                  style: { padding: '6px 12px', borderRadius: '6px', border: '1px solid ' + (sel ? '#06b6d4' : '#334155'), background: sel ? '#164e63' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 700 } }, v[1]);
              })
            )
          ),
          // Result
          h('div', { style: { background: 'linear-gradient(135deg, #0c4a6e, #0f172a)', borderRadius: '12px', padding: '20px', border: '2px solid #06b6d4', textAlign: 'center', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', color: '#94a3b8', marginBottom: '4px' } }, 'ESTIMATED ANNUAL PREMIUM'),
            h('div', { style: { fontSize: '36px', fontWeight: 900, color: annualPremium > 3000 ? '#ef4444' : annualPremium > 2000 ? '#f59e0b' : '#4ade80', fontFamily: 'monospace' } }, '$' + annualPremium.toLocaleString()),
            h('div', { style: { fontSize: '14px', color: '#94a3b8' } }, '$' + monthlyPremium + '/month'),
            h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '6px' } },
              'Age factor: ' + ageFactor + '× · Record: ' + recordFactor + '× · Vehicle: ' + vehFactor + '×')
          ),
          // Impact comparison
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#06b6d4', marginBottom: '4px' } }, '💡 How your choices affect cost:'),
            h('div', null, '• Clean record vs DUI: saves $' + Math.round(baseRate * ageFactor * vehFactor * 1.8) + '/year'),
            h('div', null, '• Turning 25: drops premium by ~$' + Math.round(baseRate * vehFactor * recordFactor * 0.5)),
            h('div', null, '• One at-fault accident stays on your record for 3-5 years'),
            h('div', null, '• A DUI can raise rates for 7-10 years and may cause policy cancellation'),
            h('div', null, '• Good student discount (B average): typically 10-15% off'),
            h('div', null, '• Completing a driver\'s ed course (like this one!): 5-10% discount in most states')
          )
        );
      }

      // ── MAINTENANCE SCHEDULE ──
      if (view === 'maintenanceGuide') {
        var mileage = d.mileage || 30000;
        var maintenanceItems = [
          { item: 'Engine Oil + Filter', interval: 5000, cost: '$35-75', icon: '🛢️', critical: true, desc: 'Oil lubricates all moving engine parts. Old oil = friction = engine damage. Synthetic lasts longer.' },
          { item: 'Tire Rotation', interval: 7500, cost: '$20-50', icon: '🔄', critical: false, desc: 'Front tires wear faster (they steer). Rotating extends life by 20%. Check tread depth at the same time.' },
          { item: 'Air Filter', interval: 15000, cost: '$15-30', icon: '💨', critical: false, desc: 'A clogged air filter reduces MPG by 2-10% and can reduce engine power.' },
          { item: 'Brake Pads', interval: 30000, cost: '$150-300', icon: '🛑', critical: true, desc: 'Pads wear down to metal. Squealing = warning. Grinding = too late. Replace ASAP if < 3mm.' },
          { item: 'Brake Fluid', interval: 30000, cost: '$70-120', icon: '💧', critical: true, desc: 'Brake fluid absorbs moisture over time, lowering its boiling point. Old fluid = soft pedal, longer stops.' },
          { item: 'Coolant Flush', interval: 30000, cost: '$100-150', icon: '❄️', critical: true, desc: 'Coolant prevents overheating AND freezing. Old coolant loses protection and can corrode the engine.' },
          { item: 'Transmission Fluid', interval: 60000, cost: '$150-250', icon: '⚙️', critical: true, desc: 'Transmission fluid lubricates gears. Neglect = rough shifting → transmission failure ($3,000+ repair).' },
          { item: 'Spark Plugs', interval: 60000, cost: '$100-200', icon: '⚡', critical: false, desc: 'Spark plugs ignite the fuel-air mixture. Worn plugs = misfires, rough idle, poor MPG.' },
          { item: 'Serpentine Belt', interval: 60000, cost: '$75-150', icon: '🔗', critical: true, desc: 'Powers alternator, AC, power steering. If it snaps while driving, you lose all three instantly.' },
          { item: 'Battery', interval: 50000, cost: '$100-200', icon: '🔋', critical: true, desc: 'Average life: 3-5 years. Maine winters are brutal on batteries. Test annually after year 3.' },
          { item: 'Tires (Replace)', interval: 50000, cost: '$400-800', icon: '🛞', critical: true, desc: 'Tread wears down. Below 2/32" = unsafe + illegal in Maine. All-season lasts ~50K, winter tires ~40K.' }
        ];

        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #404040, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #a3a3a3', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔧'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Vehicle Maintenance Schedule'),
            h('div', { style: { fontSize: '11px', color: '#d4d4d4' } }, 'What to service and when. Neglect = expensive breakdowns.')
          ),
          // Mileage slider
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155', marginBottom: '12px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a3a3a3', marginBottom: '4px' } }, 'YOUR CURRENT MILEAGE'),
            h('input', { type: 'range', min: 0, max: 150000, step: 5000, value: mileage, onChange: function(e) { upd('mileage', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#a3a3a3' } }),
            h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', textAlign: 'center', fontFamily: 'monospace' } }, mileage.toLocaleString() + ' miles')
          ),
          // Items with due/overdue status
          maintenanceItems.map(function(mi) {
            var lastDone = Math.floor(mileage / mi.interval) * mi.interval;
            var nextDue = lastDone + mi.interval;
            var milesLeft = nextDue - mileage;
            var overdue = milesLeft <= 0;
            var soon = milesLeft > 0 && milesLeft < mi.interval * 0.2;
            return h('div', { key: mi.item, style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid ' + (overdue ? '#ef4444' : soon ? '#f59e0b' : '#334155'), borderLeft: '4px solid ' + (overdue ? '#ef4444' : soon ? '#f59e0b' : '#4ade80'), marginBottom: '6px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('span', { style: { fontSize: '18px' } }, mi.icon),
                  h('div', null,
                    h('div', { style: { fontSize: '12px', fontWeight: 700 } }, mi.item),
                    h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Every ' + mi.interval.toLocaleString() + ' mi · ' + mi.cost)
                  )
                ),
                h('div', { style: { textAlign: 'right' } },
                  h('div', { style: { fontSize: '11px', fontWeight: 700, color: overdue ? '#ef4444' : soon ? '#f59e0b' : '#4ade80' } }, overdue ? 'OVERDUE' : soon ? 'DUE SOON' : 'OK'),
                  h('div', { style: { fontSize: '9px', color: '#64748b' } }, overdue ? 'Was due at ' + nextDue.toLocaleString() + ' mi' : milesLeft.toLocaleString() + ' mi until next')
                )
              ),
              h('div', { style: { fontSize: '10px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' } }, mi.desc)
            );
          })
        );
      }

      // ── AI DRIVING COACH ──
      if (view === 'aiCoach') {
        var coachResponse = d.coachResponse || null;
        var coachLoading = d.coachLoading || false;
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #4c1d95, #0f172a)', borderRadius: '14px', padding: '24px', border: '1px solid #a78bfa', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '48px' } }, '🤖'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '4px' } }, 'AI Driving Coach'),
            h('div', { style: { fontSize: '12px', color: '#ddd6fe' } }, 'Gemini AI analyzes your driving data and gives personalized advice.')
          ),
          !drivingStats ? h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '20px', border: '1px solid #334155', textAlign: 'center' } },
            h('div', { style: { fontSize: '13px', color: '#94a3b8' } }, 'Complete a drive first, then come back for AI analysis.')
          ) : h('div', null,
            // Stats summary for AI
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px', fontSize: '11px', color: '#94a3b8' } },
              h('div', { style: { fontWeight: 700, color: '#a78bfa', marginBottom: '4px' } }, 'Your last drive data (sent to AI):'),
              'Scenario: ' + drivingStats.scenario + ' · Vehicle: ' + drivingStats.vehicle +
              ' · Safety: ' + drivingStats.safetyScore + ' · Eco: ' + drivingStats.efficiencyScore +
              ' · MPG: ' + drivingStats.avgMPG + ' · Max speed: ' + drivingStats.maxSpeed + ' mph' +
              ' · Hard brakes: ' + drivingStats.hardBrakes + ' · Crashes: ' + drivingStats.crashes +
              ' · Skid: ' + drivingStats.skidSeconds + 's · Unsignaled: ' + drivingStats.unsignaledLaneChanges
            ),
            !coachResponse && !coachLoading ? h('button', { onClick: function() {
              upd('coachLoading', true);
              var prompt = 'You are RoadReady, an AI driving instructor for a teen learning to drive in Maine. ' +
                'Analyze this driving session data and give 3-4 specific, encouraging tips for improvement. ' +
                'Be warm but honest. Reference specific physics where relevant (stopping distance, friction, drag). ' +
                'Data: Scenario=' + drivingStats.scenario + ', Vehicle=' + drivingStats.vehicle +
                ', SafetyScore=' + drivingStats.safetyScore + '/100, EcoScore=' + drivingStats.efficiencyScore + '/100' +
                ', AvgMPG=' + drivingStats.avgMPG + ', MaxSpeed=' + drivingStats.maxSpeed + 'mph' +
                ', HardBrakes=' + drivingStats.hardBrakes + ', Jackrabbits=' + (drivingStats.jackrabbits || 0) +
                ', Crashes=' + drivingStats.crashes + ', SkidSeconds=' + drivingStats.skidSeconds +
                ', UnsignaledLaneChanges=' + drivingStats.unsignaledLaneChanges +
                ', CyclistClosePass=' + (drivingStats.cyclistClose || 0) +
                '. Format as short paragraphs, each starting with an emoji.';
              callGemini(prompt).then(function(response) {
                upd('coachResponse', response);
                upd('coachLoading', false);
                if (response) speak('Your AI driving coach analysis is ready.');
              }).catch(function() {
                upd('coachResponse', 'Unable to connect to AI coach. Please try again.');
                upd('coachLoading', false);
              });
            },
              style: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }
            }, '🤖 Analyze My Drive') : null,
            coachLoading ? h('div', { style: { textAlign: 'center', padding: '20px', color: '#a78bfa' } },
              h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '🤖'),
              'AI coach is analyzing your driving...'
            ) : null,
            coachResponse ? h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #a78bfa', marginTop: '10px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', marginBottom: '8px' } }, '🤖 Coach\'s Analysis'),
              h('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: '1.7', whiteSpace: 'pre-wrap' } }, coachResponse),
              h('button', { onClick: function() { upd('coachResponse', null); },
                style: { marginTop: '10px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }
              }, '🔄 Re-analyze')
            ) : null
          )
        );
      }

      // ── ACCIDENT AFTERMATH PROTOCOL ──
      if (view === 'accidentProtocol') {
        var steps = [
          { step: 1, title: 'STOP — Do Not Leave', icon: '🛑', desc: 'Maine law: you MUST stop at the scene of any crash you are involved in. Leaving = hit-and-run (criminal offense, even for minor damage).', action: 'Stop your vehicle. Turn on hazard lights.' },
          { step: 2, title: 'Check for Injuries', icon: '🏥', desc: 'Check yourself, your passengers, and occupants of the other vehicle. Do NOT move an injured person unless there is immediate danger (fire, sinking vehicle).', action: 'If anyone is injured, call 911 immediately.' },
          { step: 3, title: 'Move to Safety', icon: '⚠️', desc: 'If vehicles are drivable and blocking traffic, move them to the shoulder. If not drivable, stay in your vehicle with your seatbelt on until help arrives (especially on highways).', action: 'Turn on hazards. Set up flares/triangles if you have them.' },
          { step: 4, title: 'Call 911 / Police', icon: '📞', desc: 'In Maine, call police if: anyone is injured, damage exceeds $1,000 (which is almost any crash), or a vehicle must be towed. A police report protects you legally.', action: 'Give location, number of vehicles, injuries, and whether vehicles are blocking traffic.' },
          { step: 5, title: 'Exchange Information', icon: '📝', desc: 'Get from the other driver: full name, phone, address, driver\'s license number, license plate, insurance company, policy number. Give them the same.', action: 'Take photos of their license, insurance card, and license plate.' },
          { step: 6, title: 'Document Everything', icon: '📸', desc: 'Take photos of: all vehicle damage (every angle), the crash scene, road conditions, traffic signals, skid marks, weather, and any injuries.', action: 'Take at least 20 photos. You cannot over-document.' },
          { step: 7, title: 'Get Witnesses', icon: '👥', desc: 'If anyone saw the crash, get their name and phone number. Witness testimony can be critical if the other driver lies to insurance.', action: 'Ask: "Did you see what happened? May I get your contact info?"' },
          { step: 8, title: 'Do NOT Admit Fault', icon: '🤐', desc: 'Say "Are you OK?" — not "I\'m sorry" or "It was my fault." Fault is determined by investigators, not at the scene. Anything you say can be used against you.', action: 'Be polite and cooperative but factual only.' },
          { step: 9, title: 'Notify Your Insurance', icon: '📱', desc: 'Call your insurance company within 24 hours. Give them the facts, the police report number, and the other driver\'s info. They handle the rest.', action: 'Most insurers have 24/7 claims hotlines.' },
          { step: 10, title: 'See a Doctor', icon: '🩺', desc: 'Some injuries (whiplash, concussion) do not show symptoms for 24-72 hours. Get checked even if you feel fine. Medical records link injuries to the crash for insurance.', action: 'Go within 24-48 hours. Tell them it is crash-related.' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #7c2d12, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #fb923c', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '📋'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'What To Do After a Crash'),
            h('div', { style: { fontSize: '11px', color: '#fed7aa' } }, '10 steps. Memorize them BEFORE you need them.')
          ),
          steps.map(function(s) {
            return h('div', { key: s.step, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '6px', display: 'flex', gap: '12px', alignItems: 'flex-start' } },
              h('div', { style: { flexShrink: 0, width: '40px', textAlign: 'center' } },
                h('div', { style: { fontSize: '24px' } }, s.icon),
                h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, 'Step ' + s.step)
              ),
              h('div', null,
                h('div', { style: { fontSize: '12px', fontWeight: 800, marginBottom: '3px' } }, s.title),
                h('div', { style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '4px' } }, s.desc),
                h('div', { style: { fontSize: '10px', color: '#fb923c', paddingLeft: '8px', borderLeft: '2px solid #fb923c' } }, '→ ' + s.action)
              )
            );
          })
        );
      }

      // ── ROAD TRIP PLANNER ──
      if (view === 'roadTrip') {
        var tripDist = d.tripDist || 300;
        var tripMPG = d.tripMPG || 32;
        var tripGasPrice = d.tripGasPrice || 3.50;
        var tripSpeed = d.tripSpeed || 65;
        var gallonsNeeded = tripDist / tripMPG;
        var fuelCost = gallonsNeeded * tripGasPrice;
        var driveHours = tripDist / tripSpeed;
        var driveMins = Math.round(driveHours * 60);
        var stopsNeeded = Math.floor(driveHours / 2); // stop every 2 hours
        var totalTime = driveHours + stopsNeeded * 0.25; // 15 min per stop

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #064e3b, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #34d399', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🗺️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Road Trip Planner'),
            h('div', { style: { fontSize: '11px', color: '#a7f3d0' } }, 'Calculate fuel cost, driving time, and rest stops.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '4px' } }, 'DISTANCE (miles)'),
              h('input', { type: 'range', min: 50, max: 3000, step: 50, value: tripDist, onChange: function(e) { upd('tripDist', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#34d399' } }),
              h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, tripDist.toLocaleString() + ' mi')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '4px' } }, 'YOUR MPG'),
              h('input', { type: 'range', min: 15, max: 55, step: 1, value: tripMPG, onChange: function(e) { upd('tripMPG', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#34d399' } }),
              h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, tripMPG + ' MPG')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '4px' } }, 'GAS PRICE'),
              h('input', { type: 'range', min: 2, max: 6, step: 0.10, value: tripGasPrice, onChange: function(e) { upd('tripGasPrice', parseFloat(e.target.value)); }, style: { width: '100%', accentColor: '#34d399' } }),
              h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, '$' + tripGasPrice.toFixed(2) + '/gal')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '4px' } }, 'AVG SPEED'),
              h('input', { type: 'range', min: 45, max: 80, step: 5, value: tripSpeed, onChange: function(e) { upd('tripSpeed', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#34d399' } }),
              h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, tripSpeed + ' mph')
            )
          ),
          // Results
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '14px' } },
            [['⛽', gallonsNeeded.toFixed(1) + ' gal', 'Fuel Needed'],
             ['💰', '$' + fuelCost.toFixed(0), 'Fuel Cost'],
             ['⏱️', Math.floor(driveHours) + 'h ' + (driveMins % 60) + 'm', 'Drive Time'],
             ['🛑', stopsNeeded, 'Rest Stops']
            ].map(function(r) {
              return h('div', { key: r[2], style: { background: '#020617', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid #1e293b' } },
                h('div', { style: { fontSize: '18px' } }, r[0]),
                h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#34d399', marginTop: '4px' } }, r[1]),
                h('div', { style: { fontSize: '9px', color: '#64748b', marginTop: '2px' } }, r[2])
              );
            })
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#34d399', marginBottom: '4px' } }, '💡 Trip Tips'),
            h('div', null, '• Total trip time with stops: ~' + Math.floor(totalTime) + 'h ' + Math.round((totalTime % 1) * 60) + 'm'),
            h('div', null, '• Stop every 2 hours — fatigue is as dangerous as alcohol at 17+ hours awake'),
            h('div', null, '• At ' + tripSpeed + ' mph, drag uses ' + Math.round(tripSpeed > 55 ? (tripSpeed - 55) / 55 * 100 : 0) + '% more fuel than at 55 mph'),
            h('div', null, '• Cost per mile: $' + (fuelCost / tripDist).toFixed(3)),
            h('div', null, '• Pro tip: fill up when tank hits 1/4 — never let it run near empty (fuel pump overheats)')
          )
        );
      }

      // ── FORCE DIAGRAM (live physics visualizer) ──
      if (view === 'forceDiagram') {
        var fdSpeed = d.fdSpeed || 45;
        var fdThrottle = d.fdThrottle || 0.3;
        var fdWeather = d.fdWeather || 'dry';
        var fdVehicle = d.fdVehicle || 'sedan';
        var fdVeh = VEHICLES.find(function(v) { return v.id === fdVehicle; }) || VEHICLES[0];
        var fwfd = fdWeather === 'dry' ? 'clear' : fdWeather;
        var v_ms = fdSpeed * MPH_TO_MS;
        var Fd = dragForce(v_ms, fdVeh.cd, fdVeh.area);
        var Fr = rollingForce(fdVeh.mass, rollingCoef(fwfd, true));
        var maxThrust = fdVeh.powerKW * 1000 / Math.max(1, v_ms);
        var thrust = fdThrottle * Math.min(maxThrust, fdVeh.mass * frictionCoef(fwfd) * 9.81 * 0.4);
        var netF = thrust - Fd - Fr;
        var accel = netF / fdVeh.mass;
        var maxF = Math.max(thrust, Fd + Fr, 1);

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #312e81, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #818cf8', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '📐'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Live Force Diagram'),
            h('div', { style: { fontSize: '11px', color: '#c7d2fe' } }, 'See the actual forces on your car RIGHT NOW. Adjust speed and throttle.')
          ),
          // Controls
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#818cf8' } }, 'SPEED'),
              h('input', { type: 'range', min: 0, max: 85, step: 5, value: fdSpeed, onChange: function(e) { upd('fdSpeed', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#818cf8' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, fdSpeed + ' mph')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#818cf8' } }, 'THROTTLE'),
              h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: fdThrottle, onChange: function(e) { upd('fdThrottle', parseFloat(e.target.value)); }, style: { width: '100%', accentColor: '#818cf8' } }),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#fff', textAlign: 'center' } }, Math.round(fdThrottle * 100) + '%')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#818cf8' } }, 'SURFACE'),
              h('div', { style: { display: 'flex', gap: '3px', marginTop: '4px' } },
                [['dry','☀️'],['rain','🌧'],['snow','❄'],['ice','🧊']].map(function(w) {
                  return h('button', { key: w[0], onClick: function() { upd('fdWeather', w[0]); },
                    style: { flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid ' + (fdWeather === w[0] ? '#818cf8' : '#334155'), background: fdWeather === w[0] ? '#312e81' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '14px' } }, w[1]);
                })
              )
            )
          ),
          // Force diagram canvas
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '14px' } },
            h('canvas', {
              ref: function(c) {
                if (!c) return;
                var g = c.getContext('2d');
                var W = c.width = c.offsetWidth || 600;
                var H = c.height = 200;
                g.fillStyle = '#020617'; g.fillRect(0, 0, W, H);
                var carX = W * 0.45, carY = H * 0.5;
                var scale = W * 0.35 / maxF;
                // Car body
                g.fillStyle = '#334155';
                g.fillRect(carX - 40, carY - 15, 80, 30);
                g.fillStyle = '#475569';
                g.fillRect(carX - 15, carY - 25, 35, 12);
                // Wheels
                g.fillStyle = '#111'; g.beginPath(); g.arc(carX - 25, carY + 15, 8, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(carX + 25, carY + 15, 8, 0, Math.PI * 2); g.fill();
                // Force arrows
                function drawArrow(x, y, len, color, label, dir) {
                  if (Math.abs(len) < 2) return;
                  var endX = dir === 'right' ? x + len : x - len;
                  g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
                  g.moveTo(x, y); g.lineTo(endX, y); g.stroke();
                  // Arrowhead
                  g.fillStyle = color; g.beginPath();
                  if (dir === 'right') { g.moveTo(endX, y - 6); g.lineTo(endX + 8, y); g.lineTo(endX, y + 6); }
                  else { g.moveTo(endX, y - 6); g.lineTo(endX - 8, y); g.lineTo(endX, y + 6); }
                  g.fill();
                  g.fillStyle = color; g.font = 'bold 10px system-ui'; g.textAlign = 'center';
                  g.fillText(label, (x + endX) / 2, y - 10);
                }
                // Thrust arrow (green, right)
                drawArrow(carX + 42, carY, thrust * scale, '#4ade80', 'Thrust ' + Math.round(thrust) + 'N', 'right');
                // Drag arrow (red, left)
                drawArrow(carX - 42, carY - 5, Fd * scale, '#ef4444', 'Drag ' + Math.round(Fd) + 'N', 'left');
                // Rolling resistance arrow (orange, left)
                drawArrow(carX - 42, carY + 8, Fr * scale, '#f59e0b', 'Roll ' + Math.round(Fr) + 'N', 'left');
                // Weight arrow (down)
                var weightLen = 30;
                g.strokeStyle = '#94a3b8'; g.lineWidth = 2; g.beginPath();
                g.moveTo(carX, carY + 15); g.lineTo(carX, carY + 15 + weightLen); g.stroke();
                g.fillStyle = '#94a3b8'; g.beginPath();
                g.moveTo(carX - 5, carY + 15 + weightLen); g.lineTo(carX, carY + 23 + weightLen); g.lineTo(carX + 5, carY + 15 + weightLen); g.fill();
                g.font = '9px system-ui'; g.textAlign = 'center';
                g.fillText('Weight ' + Math.round(fdVeh.mass * 9.81) + 'N', carX, carY + weightLen + 30);
                // Net force indicator
                g.fillStyle = netF > 0 ? '#4ade80' : '#ef4444';
                g.font = 'bold 12px monospace'; g.textAlign = 'center';
                g.fillText('Net: ' + (netF > 0 ? '+' : '') + Math.round(netF) + 'N → ' + (accel > 0 ? 'accelerating' : accel < -0.5 ? 'decelerating' : 'steady'), W / 2, H - 10);
                // Friction coefficient
                g.fillStyle = '#64748b'; g.font = '9px system-ui'; g.textAlign = 'right';
                g.fillText('μ = ' + frictionCoef(fwfd).toFixed(2) + ' (' + fdWeather + ')', W - 10, 14);
                g.fillText('Cd×A = ' + (fdVeh.cd * fdVeh.area).toFixed(2) + ' m²', W - 10, 26);
              },
              style: { width: '100%', height: '200px', display: 'block', borderRadius: '6px' }
            }),
            // Vehicle selector
            h('div', { style: { display: 'flex', gap: '4px', marginTop: '8px', justifyContent: 'center' } },
              VEHICLES.map(function(v) {
                return h('button', { key: v.id, onClick: function() { upd('fdVehicle', v.id); },
                  style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid ' + (fdVehicle === v.id ? '#818cf8' : '#334155'), background: fdVehicle === v.id ? '#312e81' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '10px' } }, v.icon);
              })
            )
          ),
          // Formulas
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#818cf8', marginBottom: '4px' } }, '📏 The Physics'),
            h('div', null, 'F_drag = ½ρv²CdA = ½ × 1.225 × ' + v_ms.toFixed(1) + '² × ' + fdVeh.cd + ' × ' + fdVeh.area + ' = ', h('b', null, Math.round(Fd) + ' N')),
            h('div', null, 'F_roll = Crr × m × g = 0.012 × ' + fdVeh.mass + ' × 9.81 = ', h('b', null, Math.round(Fr) + ' N')),
            h('div', null, 'Net = Thrust - Drag - Roll = ' + Math.round(thrust) + ' - ' + Math.round(Fd) + ' - ' + Math.round(Fr) + ' = ', h('b', { style: { color: netF > 0 ? '#4ade80' : '#ef4444' } }, Math.round(netF) + ' N')),
            h('div', null, 'a = F/m = ' + Math.round(netF) + '/' + fdVeh.mass + ' = ', h('b', null, accel.toFixed(2) + ' m/s²'))
          )
        );
      }

      // ── SPEED COMPARISON VISUALIZER ──
      if (view === 'speedCompare') {
        var sc1 = d.scSpeed1 || 30;
        var sc2 = d.scSpeed2 || 60;
        var scWeather = d.scWeather || 'dry';
        var scFw = scWeather === 'dry' ? 'clear' : scWeather;
        var sd1 = stoppingDistance(sc1, scFw, 1.5);
        var sd2 = stoppingDistance(sc2, scFw, 1.5);
        var maxDist = Math.max(sd1.total_ft, sd2.total_ft, 100);

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #831843, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #f472b6', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🏎️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Speed Comparison'),
            h('div', { style: { fontSize: '11px', color: '#fbcfe8' } }, 'See WHY "just a little faster" is so dangerous. Side-by-side stopping distances.')
          ),
          // Speed sliders
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #4ade80' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#4ade80' } }, 'SPEED A'),
              h('input', { type: 'range', min: 15, max: 80, step: 5, value: sc1, onChange: function(e) { upd('scSpeed1', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#4ade80' } }),
              h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#4ade80', textAlign: 'center' } }, sc1 + ' mph')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #ef4444' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#ef4444' } }, 'SPEED B'),
              h('input', { type: 'range', min: 15, max: 80, step: 5, value: sc2, onChange: function(e) { upd('scSpeed2', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#ef4444' } }),
              h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#ef4444', textAlign: 'center' } }, sc2 + ' mph')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '9px', fontWeight: 700, color: '#94a3b8' } }, 'SURFACE'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' } },
                [['dry','☀️ Dry'],['rain','🌧 Rain'],['snow','❄ Snow'],['ice','🧊 Ice']].map(function(w) {
                  return h('button', { key: w[0], onClick: function() { upd('scWeather', w[0]); },
                    style: { padding: '3px 8px', borderRadius: '4px', border: '1px solid ' + (scWeather === w[0] ? '#60a5fa' : '#334155'), background: scWeather === w[0] ? '#1e3a5f' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: '10px' } }, w[1]);
                })
              )
            )
          ),
          // Side-by-side comparison bars
          h('div', { style: { background: '#020617', borderRadius: '12px', padding: '16px', border: '1px solid #1e293b', marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px' } }, 'STOPPING DISTANCE (reaction + braking)'),
            // Speed A bar
            h('div', { style: { marginBottom: '12px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' } },
                h('span', { style: { color: '#4ade80', fontWeight: 700 } }, sc1 + ' mph'),
                h('span', { style: { color: '#4ade80' } }, Math.round(sd1.total_ft) + ' ft')
              ),
              h('div', { style: { height: '20px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' } },
                h('div', { style: { display: 'flex', height: '100%' } },
                  h('div', { style: { width: (sd1.reaction_ft / maxDist * 100) + '%', background: '#fbbf24', transition: 'width 0.3s' } }),
                  h('div', { style: { width: (sd1.braking_ft / maxDist * 100) + '%', background: '#4ade80', transition: 'width 0.3s' } })
                )
              )
            ),
            // Speed B bar
            h('div', { style: { marginBottom: '12px' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' } },
                h('span', { style: { color: '#ef4444', fontWeight: 700 } }, sc2 + ' mph'),
                h('span', { style: { color: '#ef4444' } }, Math.round(sd2.total_ft) + ' ft')
              ),
              h('div', { style: { height: '20px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' } },
                h('div', { style: { display: 'flex', height: '100%' } },
                  h('div', { style: { width: (sd2.reaction_ft / maxDist * 100) + '%', background: '#fbbf24', transition: 'width 0.3s' } }),
                  h('div', { style: { width: (sd2.braking_ft / maxDist * 100) + '%', background: '#ef4444', transition: 'width 0.3s' } })
                )
              )
            ),
            h('div', { style: { display: 'flex', gap: '12px', fontSize: '9px', color: '#64748b' } },
              h('span', null, '█ Reaction distance'), h('span', null, '█ Braking distance')
            )
          ),
          // Insight
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#f472b6', marginBottom: '4px' } }, '🔬 The Math'),
            h('div', null, '• Speed B is ', h('b', null, (sc2 / sc1).toFixed(1) + '×'), ' faster than Speed A'),
            h('div', null, '• But stopping distance is ', h('b', { style: { color: '#ef4444' } }, (sd2.total_ft / sd1.total_ft).toFixed(1) + '×'), ' longer (because v²)'),
            h('div', null, '• At ' + sc2 + ' mph on ' + scWeather + ': car is STILL GOING ', h('b', null, sc2 + ' mph'), ' for the first ', h('b', null, Math.round(sd2.reaction_ft) + ' ft'), ' (reaction time)'),
            h('div', null, '• That reaction distance alone is ', h('b', null, Math.round(sd2.reaction_ft / 10) + ' car lengths')),
            sd2.total_ft > 300 ? h('div', { style: { color: '#ef4444', fontWeight: 700, marginTop: '4px' } }, '⚠️ That is longer than a football field (300 ft)!') : null
          )
        );
      }

      // ── BLIND SPOTS & MIRRORS GUIDE ──
      if (view === 'blindSpotGuide') {
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #78350f, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #fbbf24', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '👁️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Blind Spots & Mirror Setup'),
            h('div', { style: { fontSize: '11px', color: '#fde68a' } }, 'Where vehicles hide — and the mirror technique that eliminates 80% of blind spots.')
          ),
          // Top-down diagram of blind spots
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginBottom: '10px' } },
            h('canvas', {
              ref: function(c) {
                if (!c) return;
                var g = c.getContext('2d');
                var W = c.width = c.offsetWidth || 600;
                var H = c.height = 300;
                g.fillStyle = '#020617'; g.fillRect(0, 0, W, H);
                var cx = W / 2, cy = H / 2;
                // Road
                g.fillStyle = '#1e293b'; g.fillRect(cx - 60, 0, 120, H);
                // Lane lines
                g.strokeStyle = '#fbbf24'; g.lineWidth = 1; g.setLineDash([8, 8]);
                g.beginPath(); g.moveTo(cx - 20, 0); g.lineTo(cx - 20, H); g.stroke();
                g.beginPath(); g.moveTo(cx + 20, 0); g.lineTo(cx + 20, H); g.stroke();
                g.setLineDash([]);
                // Your car
                g.fillStyle = '#22d3ee'; g.fillRect(cx - 12, cy - 20, 24, 40);
                g.fillStyle = '#0c4a6e'; g.fillRect(cx - 8, cy - 16, 16, 10); // windshield
                g.fillStyle = '#fff'; g.font = 'bold 8px system-ui'; g.textAlign = 'center';
                g.fillText('YOU', cx, cy + 4);
                // Visible zones (green arcs)
                g.fillStyle = 'rgba(74,222,128,0.12)';
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 120, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.fill(); // forward
                // Mirror zones (blue)
                g.fillStyle = 'rgba(96,165,250,0.1)';
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 100, Math.PI / 2 - 0.6, Math.PI / 2 + 0.6); g.fill(); // rearview
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 80, Math.PI * 0.6, Math.PI * 0.85); g.fill(); // left mirror
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 80, Math.PI * 0.15, Math.PI * 0.4); g.fill(); // right mirror
                // BLIND SPOTS (red zones!)
                g.fillStyle = 'rgba(239,68,68,0.2)';
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 90, Math.PI * 0.4, Math.PI * 0.6); g.fill(); // rear-left
                g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 90, Math.PI * 0.85, Math.PI * 1.05); g.fill(); // rear-right... wait this is left
                // Labels
                g.fillStyle = '#4ade80'; g.font = 'bold 10px system-ui';
                g.fillText('FORWARD VISION', cx, cy - 130);
                g.fillStyle = '#60a5fa';
                g.fillText('Rearview Mirror', cx, cy + 90);
                g.fillText('L Mirror', cx - 70, cy + 40);
                g.fillText('R Mirror', cx + 70, cy + 40);
                g.fillStyle = '#ef4444'; g.font = 'bold 11px system-ui';
                g.fillText('BLIND SPOT', cx - 80, cy - 10);
                g.fillText('BLIND SPOT', cx + 80, cy - 10);
                // Danger cars hiding in blind spots
                g.fillStyle = '#ef4444';
                g.fillRect(cx - 50, cy - 15, 16, 28);
                g.fillRect(cx + 35, cy - 15, 16, 28);
                g.fillStyle = '#fff'; g.font = '7px system-ui';
                g.fillText('!', cx - 42, cy + 4);
                g.fillText('!', cx + 43, cy + 4);
              },
              style: { width: '100%', height: '300px', display: 'block', borderRadius: '6px' }
            })
          ),
          // Mirror setup technique
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '10px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '8px' } }, '🪞 BGE Mirror Setting (eliminates most blind spots)'),
            [
              { step: '1. Rearview mirror', desc: 'Adjust to frame the entire rear window. You should see the road behind you centered in the mirror.' },
              { step: '2. Left side mirror', desc: 'Lean your head to the left window. Adjust the left mirror until you can JUST see the edge of your car. Sit back — now the mirror shows your blind spot, not the side of your car.' },
              { step: '3. Right side mirror', desc: 'Lean to the center. Adjust the right mirror the same way. When you sit normally, BOTH side mirrors show your blind spots.' },
              { step: '4. The result', desc: 'A car behind you appears in the rearview mirror first. As it moves to pass, it enters the side mirror BEFORE it leaves the rearview. As it leaves the side mirror, it enters your peripheral vision. No gap = no blind spot.' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { paddingLeft: '10px', borderLeft: '2px solid #fbbf24', marginBottom: '6px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' } },
                h('b', { style: { color: '#fbbf24' } }, s.step + ': '), s.desc
              );
            })
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#ef4444', marginBottom: '4px' } }, '⚠️ Even with perfect mirrors:'),
            '• ALWAYS do a shoulder check (head turn) before changing lanes or merging.',
            h('br'), '• The "Dutch reach" when opening your door checks for cyclists in your blind spot.',
            h('br'), '• Motorcycles and bicycles can hide in blind spots that even cars cannot.',
            h('br'), '• At highway speed, a car in your blind spot for 2 seconds has traveled 176 feet.'
          )
        );
      }

      // ── WEATHER IMPACT COMPARISON ──
      if (view === 'weatherCompare') {
        var wcSpeed = d.wcSpeed || 55;
        var weatherTypes = [
          { id: 'dry', label: '☀️ Dry', mu: 0.72, vis: '500+ ft', following: 3, color: '#4ade80' },
          { id: 'rain', label: '🌧️ Rain', mu: 0.42, vis: '300 ft', following: 4, color: '#60a5fa' },
          { id: 'snow', label: '❄️ Snow', mu: 0.22, vis: '150 ft', following: 6, color: '#94a3b8' },
          { id: 'ice', label: '🧊 Ice', mu: 0.10, vis: '200 ft', following: 8, color: '#e2e8f0' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #0c4a6e, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #38bdf8', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🌦️'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Weather Impact Chart'),
            h('div', { style: { fontSize: '11px', color: '#bae6fd' } }, 'Same car, same speed, VERY different outcomes.')
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155', marginBottom: '12px', textAlign: 'center' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' } }, 'SPEED'),
            h('input', { type: 'range', min: 25, max: 75, step: 5, value: wcSpeed, onChange: function(e) { upd('wcSpeed', parseInt(e.target.value)); }, style: { width: '60%', accentColor: '#38bdf8' } }),
            h('div', { style: { fontSize: '18px', fontWeight: 900 } }, wcSpeed + ' mph')
          ),
          // Comparison table
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } },
              h('thead', null,
                h('tr', { style: { background: '#1e293b', fontSize: '10px', fontWeight: 700, color: '#94a3b8' } },
                  ['Condition', 'μ (friction)', 'Stop Dist', 'vs Dry', 'Following', 'Visibility'].map(function(col, i) {
                    return h('th', { key: i, style: { padding: '8px', textAlign: 'left', borderBottom: '1px solid #334155' } }, col);
                  })
                )
              ),
              h('tbody', null,
                weatherTypes.map(function(w) {
                  var fwc = w.id === 'dry' ? 'clear' : w.id;
                  var sd = stoppingDistance(wcSpeed, fwc, 1.5);
                  var drySD = stoppingDistance(wcSpeed, 'clear', 1.5);
                  var ratio = sd.total_ft / drySD.total_ft;
                  return h('tr', { key: w.id, style: { borderBottom: '1px solid #1e293b' } },
                    h('td', { style: { padding: '8px', fontWeight: 700, color: w.color } }, w.label),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace' } }, w.mu),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: w.color } }, Math.round(sd.total_ft) + ' ft'),
                    h('td', { style: { padding: '8px', fontFamily: 'monospace', color: ratio > 2 ? '#ef4444' : ratio > 1.3 ? '#f59e0b' : '#4ade80' } }, ratio.toFixed(1) + '×'),
                    h('td', { style: { padding: '8px' } }, w.following + ' sec'),
                    h('td', { style: { padding: '8px', color: '#64748b' } }, w.vis)
                  );
                })
              )
            )
          ),
          // Visual bar comparison
          h('div', { style: { background: '#020617', borderRadius: '10px', padding: '14px', border: '1px solid #1e293b', marginTop: '10px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' } }, 'Stopping Distance at ' + wcSpeed + ' mph'),
            weatherTypes.map(function(w) {
              var fwc = w.id === 'dry' ? 'clear' : w.id;
              var sd = stoppingDistance(wcSpeed, fwc, 1.5);
              var maxAll = stoppingDistance(wcSpeed, 'ice', 1.5).total_ft;
              return h('div', { key: w.id, style: { marginBottom: '8px' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' } },
                  h('span', { style: { color: w.color } }, w.label),
                  h('span', { style: { color: w.color, fontWeight: 700 } }, Math.round(sd.total_ft) + ' ft')
                ),
                h('div', { style: { height: '12px', background: '#0f172a', borderRadius: '3px' } },
                  h('div', { style: { height: '100%', background: w.color, borderRadius: '3px', width: (sd.total_ft / maxAll * 100) + '%', transition: 'width 0.3s' } })
                )
              );
            })
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginTop: '10px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#38bdf8', marginBottom: '4px' } }, '💡 Key Takeaway'),
            'On ice at ' + wcSpeed + ' mph, your stopping distance is ', h('b', { style: { color: '#ef4444' } }, (stoppingDistance(wcSpeed, 'ice', 1.5).total_ft / stoppingDistance(wcSpeed, 'clear', 1.5).total_ft).toFixed(1) + '× longer'),
            ' than on dry pavement. That is the difference between stopping safely and a collision. ',
            h('b', null, 'The physics is non-negotiable — the only variable you control is speed.')
          )
        );
      }

      // ── LEARNING PATH (guided progression) ──
      if (view === 'learningPath') {
        var stages = [
          { stage: 1, title: 'Classroom Basics', icon: '📚', modes: ['lessonSelect', 'signsView', 'stoppingLab'], desc: 'Learn the theory first: physics, signs, and stopping distance.', check: function() { return Object.keys(earnedBadges).length >= 1; } },
          { stage: 2, title: 'Permit Prep', icon: '📝', modes: ['permitStart'], desc: 'Take the practice permit test until you score 80%+.', check: function() { return !!earnedBadges.permit_pass; } },
          { stage: 3, title: 'First Drive', icon: '🚗', modes: ['scenarioSelect'], desc: 'Residential at 25 mph. Get comfortable with steering, braking, and signals.', check: function() { return !!scenariosDriven.residential; } },
          { stage: 4, title: 'Maneuvers', icon: '🅿️', modes: ['parking', 'threePoint', 'backingDrill'], desc: 'Parallel parking, 3-point turn, and straight backing. Road test maneuvers.', check: function() { return !!earnedBadges.park_master || !!earnedBadges.three_point; } },
          { stage: 5, title: 'All Conditions', icon: '🌧️', modes: ['scenarioSelect'], desc: 'Drive in rain, snow, fog, and night. Build confidence in every condition.', check: function() { return !!earnedBadges.all_weather; } },
          { stage: 6, title: 'Highway Skills', icon: '🛣️', modes: ['scenarioSelect'], desc: 'Highway merge, lane changes, and maintaining following distance at speed.', check: function() { return !!scenariosDriven.highway; } },
          { stage: 7, title: 'Hazard Awareness', icon: '⚡', modes: ['hazardTest'], desc: 'Test your hazard perception reaction time. Target: 8/10.', check: function() { return !!earnedBadges.hazard_ace; } },
          { stage: 8, title: 'Emergency Response', icon: '🚨', modes: ['emergencyDrill', 'emergencySituations'], desc: 'Yield to emergency vehicles. Learn brake failure, blowout, and stuck accelerator responses.', check: function() { return !!earnedBadges.emergency_yield; } },
          { stage: 9, title: 'Advanced Physics', icon: '📐', modes: ['forceDiagram', 'hypermilingLab', 'speedCompare'], desc: 'Understand the forces. See why speed kills. Optimize your MPG.', check: function() { return !!earnedBadges.hypermiler; } },
          { stage: 10, title: 'Road Test Ready', icon: '🏆', modes: ['roadTestRubric', 'freeExploreSetup'], desc: 'Know the rubric. Free explore until every maneuver is automatic. Get your certificate.', check: function() { return !!earnedBadges.a_plus; } }
        ];
        var currentStage = 0;
        for (var si = 0; si < stages.length; si++) { if (stages[si].check()) currentStage = si + 1; else break; }

        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #78350f, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #f59e0b', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🎯'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Your Learning Path'),
            h('div', { style: { fontSize: '12px', color: '#fde68a' } }, 'Stage ' + currentStage + ' of ' + stages.length + ' complete. Follow the path from classroom to road test.'),
            h('div', { style: { height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '10px' } },
              h('div', { style: { height: '100%', background: '#f59e0b', borderRadius: '3px', width: (currentStage / stages.length * 100) + '%', transition: 'width 0.3s' } })
            )
          ),
          stages.map(function(st, idx) {
            var done = st.check();
            var isCurrent = idx === currentStage;
            var locked = idx > currentStage;
            return h('div', { key: idx, style: { background: done ? '#0f2a1a' : isCurrent ? '#1e293b' : '#0f172a', borderRadius: '10px', padding: '14px', border: '2px solid ' + (done ? '#4ade80' : isCurrent ? '#f59e0b' : '#1e293b'), marginBottom: '6px', opacity: locked ? 0.5 : 1 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                h('div', { style: { width: '36px', height: '36px', borderRadius: '50%', background: done ? '#4ade80' : isCurrent ? '#f59e0b' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? '16px' : '14px', fontWeight: 900, color: done || isCurrent ? '#000' : '#64748b', flexShrink: 0 } }, done ? '✓' : st.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: done ? '#4ade80' : isCurrent ? '#f59e0b' : '#94a3b8' } }, 'Stage ' + (idx + 1) + ': ' + st.title),
                  h('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '2px' } }, st.desc)
                ),
                isCurrent && !locked ? h('button', { onClick: function() { upd('view', st.modes[0]); },
                  style: { padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: '#78350f', fontSize: '11px', fontWeight: 800, cursor: 'pointer', flexShrink: 0 } }, 'Start →') : null
              )
            );
          })
        );
      }

      // ── ROAD TEST RUBRIC ──
      if (view === 'roadTestRubric') {
        var rubricItems = [
          { category: 'Pre-Drive', items: [
            { skill: 'Mirror adjustment', weight: '⭐', note: 'Rearview + both side mirrors before moving.' },
            { skill: 'Seatbelt', weight: '⭐', note: 'Must be on before engine starts.' },
            { skill: 'Parking brake release', weight: '⭐', note: 'Release before driving. Forgetting it = automatic fail in some states.' }
          ]},
          { category: 'Basic Control', items: [
            { skill: 'Smooth acceleration', weight: '⭐⭐', note: 'No jackrabbit starts. Gradual, controlled.' },
            { skill: 'Smooth braking', weight: '⭐⭐', note: 'Stop without lurching. Begin braking well before the stop line.' },
            { skill: 'Steering control', weight: '⭐⭐', note: 'Hand-over-hand or push-pull. No palming, no single-hand steering at speed.' },
            { skill: 'Speed control', weight: '⭐⭐⭐', note: 'Within 5 mph of the limit. Too fast = fail. Too slow (>10 under) = points off.' }
          ]},
          { category: 'Intersections', items: [
            { skill: 'Full stop at stop signs', weight: '⭐⭐⭐', note: 'COMPLETE stop behind the line. Rolling stop = instant fail in many states.' },
            { skill: 'Left-right-left scan', weight: '⭐⭐⭐', note: 'Visible head movement to check all directions. Examiner must SEE you look.' },
            { skill: 'Right-of-way', weight: '⭐⭐', note: 'Yield correctly. Taking right-of-way when it isn\'t yours = critical error.' },
            { skill: 'Traffic light compliance', weight: '⭐⭐⭐', note: 'Do not enter on yellow if you can stop safely. NEVER enter on red.' }
          ]},
          { category: 'Lane Skills', items: [
            { skill: 'Lane position', weight: '⭐⭐', note: 'Center of your lane. Not riding the line or drifting.' },
            { skill: 'Lane changes', weight: '⭐⭐⭐', note: 'Signal ��� mirror → blind spot check → smooth move. Each step must be visible.' },
            { skill: 'Turn signals', weight: '⭐⭐', note: '100 feet before turning or changing lanes. Signal BEFORE braking.' }
          ]},
          { category: 'Turns', items: [
            { skill: 'Proper lane for turning', weight: '⭐⭐', note: 'Right turns from right lane into right lane. Left turns from left lane.' },
            { skill: 'Speed through turns', weight: '⭐⭐', note: 'Brake BEFORE the turn, not during. Smooth speed through the arc.' },
            { skill: 'Checking for pedestrians', weight: '⭐⭐⭐', note: 'Always look for pedestrians in crosswalks when turning. Yield.' }
          ]},
          { category: 'Parking', items: [
            { skill: 'Parallel parking', weight: '⭐⭐', note: 'Within 12 inches of curb. 3 attempts allowed. Mirrors + signals + head checks.' },
            { skill: 'Hill parking', weight: '⭐', note: 'Wheels turned correctly: uphill=away from curb, downhill=toward curb.' }
          ]},
          { category: 'Automatic Failures', items: [
            { skill: 'Causing a crash', weight: '❌', note: 'Any collision = immediate fail.' },
            { skill: 'Disobeying a traffic signal', weight: '❌', note: 'Running a red light or stop sign.' },
            { skill: 'Dangerous action', weight: '❌', note: 'Anything the examiner considers unsafe enough to grab the wheel or brake.' },
            { skill: 'Examiner intervention', weight: '❌', note: 'If the examiner has to verbally correct you to prevent danger = fail.' }
          ]}
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #134e4a, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #14b8a6', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '📋'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Maine Road Test Rubric'),
            h('div', { style: { fontSize: '11px', color: '#99f6e4' } }, 'What the examiner ACTUALLY grades. ⭐ = checked, ⭐⭐ = weighted, ⭐⭐⭐ = critical, ❌ = auto-fail.')
          ),
          rubricItems.map(function(cat) {
            return h('div', { key: cat.category, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { fontSize: '13px', fontWeight: 800, color: '#14b8a6', marginBottom: '8px' } }, cat.category),
              cat.items.map(function(item, ii) {
                return h('div', { key: ii, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '8px', borderLeft: '2px solid ' + (item.weight === '❌' ? '#ef4444' : '#334155'), marginBottom: '6px' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '11px', fontWeight: 700, color: item.weight === '❌' ? '#ef4444' : '#fff' } }, item.skill),
                    h('div', { style: { fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' } }, item.note)
                  ),
                  h('div', { style: { fontSize: '12px', flexShrink: 0, marginLeft: '8px' } }, item.weight)
                );
              })
            );
          })
        );
      }

      // ── EMERGENCY SITUATIONS GUIDE ──
      if (view === 'emergencySituations') {
        var emergencies = [
          { title: 'Tire Blowout', icon: '💥', response: ['Grip the steering wheel firmly with both hands.', 'Do NOT slam the brakes (this causes loss of control).', 'Ease off the gas pedal gradually.', 'Steer straight — the car will pull toward the blown tire.', 'Let the car slow naturally, then gently brake.', 'Pull to the shoulder with hazards on.'], physics: 'A blowout instantly deflates one tire, creating asymmetric drag that pulls the car to that side. Hard braking shifts weight forward, unloading the rear = spin.' },
          { title: 'Brake Failure', icon: '🛑', response: ['Pump the brake pedal rapidly (may restore hydraulic pressure).', 'Downshift through the gears (engine braking).', 'Apply the parking/emergency brake GRADUALLY.', 'If on a hill, steer toward an uphill slope or runaway truck ramp.', 'As a last resort, sideswipe a guardrail to slow down.', 'NEVER turn off the engine while moving (lose power steering).'], physics: 'Brake failure is usually hydraulic (fluid leak). Pumping may rebuild enough pressure for one stop. Engine braking uses compression resistance — lower gears = more braking force.' },
          { title: 'Stuck Accelerator', icon: '⚡', response: ['Shift to NEUTRAL immediately (engine revs but wheels disengage).', 'Steer to the shoulder or a safe area.', 'Apply brakes firmly — they ARE stronger than the engine.', 'Once stopped, turn off the engine.', 'Modern cars: press and HOLD the start button for 3+ seconds to force shutdown.', 'If you have a floor mat, check if it is jamming the pedal.'], physics: 'In neutral, the engine is disconnected from the wheels via the transmission. Brakes can overpower even a stuck-open throttle — do not be afraid to brake hard.' },
          { title: 'Hood Flies Up', icon: '🚗', response: ['Do NOT panic-brake.', 'Look through the gap between the dashboard and hood bottom.', 'Or look out the driver-side window for lane position.', 'Slow down gradually with hazards on.', 'Pull to the shoulder when safe.', 'Hood latch failure is preventable: always push down to confirm latch after closing.'], physics: 'The hood catches wind at speed and pivots upward. Your windshield may crack from the impact. Panic braking at highway speed without vision = far more dangerous than the hood itself.' },
          { title: 'Submerging Vehicle', icon: '🌊', response: ['You have 30-60 seconds. Act IMMEDIATELY.', 'Unbuckle your seatbelt FIRST.', 'Open the window (electric windows work for ~1 minute).', 'If the window won\'t open, use a window breaker tool on the CORNER of the glass.', 'Climb out through the window. Push children out first.', 'Do NOT try to open the door until water fills the car and equalizes pressure.', 'Swim to the surface and away from the sinking car.'], physics: 'Water pressure makes doors impossible to open (up to 600 lbs/sqft of force differential). Once the car fills and pressure equalizes, the door opens easily — but you may be disoriented and running out of air.' },
          { title: 'Engine Fire', icon: '🔥', response: ['Pull over immediately and turn off the engine.', 'Get all occupants out and move 100+ feet away.', 'Call 911.', 'Do NOT open the hood (oxygen feeds the fire).', 'If you have a fire extinguisher, aim at the base of visible flames through the grille.', 'If the fire is large or spreading to the cabin, retreat and wait for fire department.'], physics: 'Engine fires are usually fuel or electrical. Opening the hood supplies oxygen and can cause a flashover. The gas tank is at the rear but fuel lines run the length of the car.' }
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #7f1d1d, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #ef4444', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🆘'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Emergency Situations'),
            h('div', { style: { fontSize: '11px', color: '#fca5a5' } }, 'When things go wrong. Memorize these BEFORE you need them — there is no time to think in a real emergency.')
          ),
          emergencies.map(function(em) {
            return h('div', { key: em.title, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                h('span', { style: { fontSize: '28px' } }, em.icon),
                h('span', { style: { fontSize: '14px', fontWeight: 800 } }, em.title)
              ),
              em.response.map(function(step, si) {
                return h('div', { key: si, style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', paddingLeft: '10px', borderLeft: '2px solid #ef4444', marginBottom: '4px' } }, (si + 1) + '. ' + step);
              }),
              h('div', { style: { marginTop: '8px', padding: '8px', background: '#020617', borderRadius: '6px', fontSize: '10px', color: '#94a3b8', lineHeight: '1.5' } },
                h('b', { style: { color: '#818cf8' } }, '🔬 Physics: '), em.physics
              )
            );
          })
        );
      }

      // ── REACTION TIME TRAINER ──
      if (view === 'reactionTrainer') {
        var rtState = d.rtState || { phase: 'waiting', times: [], bestTime: null };
        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); upd('rtState', null); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #7c2d12, #0f172a)', borderRadius: '14px', padding: '24px', border: '1px solid #fb923c', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '⏱️'),
            h('h2', { style: { fontSize: '22px', fontWeight: 900, marginBottom: '4px' } }, 'Reaction Time Trainer'),
            h('div', { style: { fontSize: '12px', color: '#fed7aa' } }, 'Measure your ACTUAL reaction speed. The average driver is 1.5 seconds. How fast are you?')
          ),
          // The test area
          h('div', {
            style: {
              background: rtState.phase === 'go' ? '#22c55e' : rtState.phase === 'ready' ? '#ef4444' : rtState.phase === 'result' ? '#0f172a' : '#1e293b',
              borderRadius: '14px', padding: '50px 20px', textAlign: 'center', cursor: 'pointer',
              minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              border: '2px solid #334155', transition: 'background 0.1s'
            },
            onClick: function() {
              if (rtState.phase === 'waiting') {
                // Start: show red, then after random delay, show green
                var newState = Object.assign({}, rtState, { phase: 'ready', startWait: Date.now(), greenAt: Date.now() + 2000 + Math.random() * 4000 });
                upd('rtState', newState);
              } else if (rtState.phase === 'ready') {
                // Too early!
                upd('rtState', Object.assign({}, rtState, { phase: 'early' }));
              } else if (rtState.phase === 'go') {
                // Measure reaction time
                var rt = Date.now() - rtState.greenTime;
                var newTimes = (rtState.times || []).concat([rt]);
                var best = Math.min.apply(null, newTimes);
                upd('rtState', { phase: 'result', times: newTimes, bestTime: best, lastTime: rt });
              } else if (rtState.phase === 'early') {
                upd('rtState', { phase: 'waiting', times: rtState.times || [], bestTime: rtState.bestTime });
              } else if (rtState.phase === 'result') {
                upd('rtState', { phase: 'waiting', times: rtState.times, bestTime: rtState.bestTime });
              }
            }
          },
            rtState.phase === 'waiting' ? h('div', null,
              h('div', { style: { fontSize: '24px', fontWeight: 800, marginBottom: '8px' } }, 'Click / Tap to Start'),
              h('div', { style: { fontSize: '12px', color: '#94a3b8' } }, 'Wait for GREEN, then click as fast as you can.'),
              rtState.times && rtState.times.length > 0 ? h('div', { style: { fontSize: '11px', color: '#64748b', marginTop: '8px' } }, rtState.times.length + ' attempts · Best: ' + rtState.bestTime + ' ms') : null
            ) :
            rtState.phase === 'ready' ? h('div', null,
              h('div', { style: { fontSize: '48px', fontWeight: 900, color: '#fff' } }, '🔴 WAIT...'),
              h('div', { style: { fontSize: '13px', color: '#fca5a5', marginTop: '8px' } }, 'Do NOT click yet — wait for GREEN')
            ) :
            rtState.phase === 'go' ? h('div', null,
              h('div', { style: { fontSize: '48px', fontWeight: 900, color: '#fff' } }, '🟢 GO! CLICK NOW!'),
              h('div', { style: { fontSize: '14px', color: '#bbf7d0', marginTop: '4px' } }, 'Click / tap as FAST as you can!')
            ) :
            rtState.phase === 'early' ? h('div', null,
              h('div', { style: { fontSize: '36px' } }, '⚠️'),
              h('div', { style: { fontSize: '18px', fontWeight: 800, color: '#f59e0b' } }, 'TOO EARLY!'),
              h('div', { style: { fontSize: '12px', color: '#fde68a', marginTop: '4px' } }, 'You clicked before the light turned green. Click to try again.')
            ) :
            rtState.phase === 'result' ? h('div', null,
              h('div', { style: { fontSize: '48px', fontWeight: 900, color: rtState.lastTime < 250 ? '#4ade80' : rtState.lastTime < 400 ? '#fbbf24' : '#ef4444', fontFamily: 'monospace' } }, rtState.lastTime + ' ms'),
              h('div', { style: { fontSize: '14px', color: '#94a3b8', marginTop: '4px' } },
                rtState.lastTime < 200 ? 'Incredible! Fighter pilot level.' :
                rtState.lastTime < 250 ? 'Excellent — faster than most people.' :
                rtState.lastTime < 350 ? 'Good — average healthy adult.' :
                rtState.lastTime < 500 ? 'Average — room to improve.' :
                'Slow — this adds significant stopping distance.'
              ),
              h('div', { style: { fontSize: '11px', color: '#64748b', marginTop: '8px' } }, 'At 60 mph, ' + rtState.lastTime + ' ms = ' + Math.round(rtState.lastTime / 1000 * 88) + ' feet traveled before you even touch the brake.'),
              h('div', { style: { fontSize: '12px', color: '#22d3ee', marginTop: '10px', fontWeight: 700 } }, 'Click to try again')
            ) : null
          ),
          // Timer logic: transition from ready → go after random delay
          rtState.phase === 'ready' ? h('div', { ref: function(el) {
            if (!el) return;
            if (!el._timerSet) {
              el._timerSet = true;
              var delay = 2000 + Math.random() * 4000;
              setTimeout(function() {
                var cur = d.rtState;
                if (cur && cur.phase === 'ready') {
                  upd('rtState', Object.assign({}, cur, { phase: 'go', greenTime: Date.now() }));
                }
              }, delay);
            }
          } }) : null,
          // Stats
          rtState.times && rtState.times.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginTop: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', marginBottom: '6px' } }, 'Your Results'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' } },
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#4ade80' } }, rtState.bestTime + ' ms'),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Best')
              ),
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#22d3ee' } }, Math.round(rtState.times.reduce(function(a, b) { return a + b; }, 0) / rtState.times.length) + ' ms'),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Average')
              ),
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#94a3b8' } }, rtState.times.length),
                h('div', { style: { fontSize: '9px', color: '#64748b' } }, 'Attempts')
              )
            ),
            h('div', { style: { fontSize: '10px', color: '#94a3b8', lineHeight: '1.5' } },
              'Your best reaction time of ' + rtState.bestTime + ' ms adds ' + Math.round(rtState.bestTime / 1000 * 88) + ' feet to your stopping distance at 60 mph. ',
              'Fatigue, alcohol, or phone use can DOUBLE this. A 0.08% BAC typically increases reaction time to 400-600 ms.'
            )
          ) : null
        );
      }

      // ── NIGHT VISION MATH ──
      if (view === 'nightVision') {
        var nvSpeed = d.nvSpeed || 55;
        var nvBeams = d.nvBeams || 'low';
        var headlightRange = nvBeams === 'high' ? 500 : 350;
        var fwNv = 'clear';
        var nvSD = stoppingDistance(nvSpeed, fwNv, 1.5);
        var overdriving = nvSD.total_ft > headlightRange;
        // Find max safe speed (where stopping distance = headlight range)
        var maxSafeSpeed = nvSpeed;
        for (var testSpd = 80; testSpd > 10; testSpd--) {
          if (stoppingDistance(testSpd, fwNv, 1.5).total_ft <= headlightRange) { maxSafeSpeed = testSpd; break; }
        }

        return h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #1e1b4b, #0a0f1e)', borderRadius: '14px', padding: '20px', border: '1px solid #a78bfa', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔦'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Night Vision Math'),
            h('div', { style: { fontSize: '11px', color: '#ddd6fe' } }, 'Can you stop within what your headlights reveal? This is how night crashes happen.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', marginBottom: '4px' } }, 'SPEED'),
              h('input', { type: 'range', min: 25, max: 80, step: 5, value: nvSpeed, onChange: function(e) { upd('nvSpeed', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#a78bfa' } }),
              h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#fff', textAlign: 'center' } }, nvSpeed + ' mph')
            ),
            h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' } },
              h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#a78bfa', marginBottom: '6px' } }, 'HEADLIGHTS'),
              h('div', { style: { display: 'flex', gap: '6px' } },
                h('button', { onClick: function() { upd('nvBeams', 'low'); },
                  style: { flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid ' + (nvBeams === 'low' ? '#a78bfa' : '#334155'), background: nvBeams === 'low' ? '#1e1b4b' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, '💡 Low (350 ft)'),
                h('button', { onClick: function() { upd('nvBeams', 'high'); },
                  style: { flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid ' + (nvBeams === 'high' ? '#fbbf24' : '#334155'), background: nvBeams === 'high' ? '#78350f' : '#1e293b', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 } }, '🔆 High (500 ft)')
              )
            )
          ),
          // Visual: headlight range vs stopping distance
          h('div', { style: { background: '#020617', borderRadius: '12px', padding: '16px', border: '2px solid ' + (overdriving ? '#ef4444' : '#4ade80'), marginBottom: '14px' } },
            h('div', { style: { fontSize: '10px', fontWeight: 700, color: overdriving ? '#ef4444' : '#4ade80', marginBottom: '8px' } },
              overdriving ? '⚠️ OVERDRIVING YOUR HEADLIGHTS — you CANNOT stop in time!' : '✅ You can stop within your headlight range'),
            // Headlight range bar
            h('div', { style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', color: '#fbbf24', marginBottom: '2px' } }, '🔦 Headlight range: ' + headlightRange + ' ft'),
              h('div', { style: { height: '14px', background: '#0f172a', borderRadius: '3px' } },
                h('div', { style: { height: '100%', background: 'linear-gradient(90deg, #fbbf24, #fbbf2433)', borderRadius: '3px', width: '100%' } })
              )
            ),
            // Stopping distance bar (overlaid on same scale)
            h('div', null,
              h('div', { style: { fontSize: '10px', color: overdriving ? '#ef4444' : '#4ade80', marginBottom: '2px' } }, '🛑 Stopping distance: ' + Math.round(nvSD.total_ft) + ' ft'),
              h('div', { style: { height: '14px', background: '#0f172a', borderRadius: '3px' } },
                h('div', { style: { height: '100%', background: overdriving ? '#ef4444' : '#4ade80', borderRadius: '3px', width: Math.min(100, nvSD.total_ft / headlightRange * 100) + '%', transition: 'width 0.3s' } })
              )
            ),
            overdriving ? h('div', { style: { fontSize: '11px', color: '#fca5a5', marginTop: '8px', fontWeight: 700 } },
              '🔴 You are ' + Math.round(nvSD.total_ft - headlightRange) + ' ft PAST what you can see. An obstacle at the edge of your headlights = guaranteed crash.'
            ) : null
          ),
          h('div', { style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' } },
            h('div', { style: { fontWeight: 700, color: '#a78bfa', marginBottom: '4px' } }, '🔬 The Rule'),
            h('div', null, '• Max safe speed with ' + nvBeams + ' beams: ', h('b', { style: { color: '#4ade80' } }, maxSafeSpeed + ' mph')),
            h('div', null, '• Low beams illuminate ~350 ft. High beams ~500 ft.'),
            h('div', null, '• Rule: NEVER drive faster than you can stop within your headlight range.'),
            h('div', null, '• Dim high beams within 500 ft of oncoming traffic (glare blinds them for 2+ seconds).'),
            h('div', null, '• Alcohol shrinks your visual field by up to 25% at night — tunnel vision + slow reaction = deadly.')
          )
        );
      }

      // ── FIRST CAR BUYING GUIDE ──
      if (view === 'carBuying') {
        var sections = [
          { title: 'Budget Reality Check', icon: '💰', items: [
            'The car itself is only 40-50% of the total cost. Add: insurance ($1,200-3,600/yr for teens), gas ($1,000-2,500/yr), maintenance ($500-1,200/yr), registration + inspection (~$150/yr).',
            'Total first-year cost for a $5,000 used car: often $8,000-11,000. Budget accordingly.',
            'Financing: never agree to more than 48 months. A 72-month loan means you owe more than the car is worth for years.',
            'Put at least 20% down to avoid being "underwater" (owing more than value).'
          ]},
          { title: 'What to Look For', icon: '✅', items: [
            'Mileage: under 100K is good. 100-150K is OK if well-maintained. Over 150K = expect repairs soon.',
            'Service records: ask for them. Regular oil changes every 5K miles = good owner.',
            'Rust: check wheel wells, door frames, undercarriage. Surface rust is cosmetic. Structural rust = walk away.',
            'Tires: even wear = good alignment. Uneven = alignment/suspension problem. Tread depth: penny test.',
            'Test drive: listen for knocks, clunks, grinding. Does it pull left or right? Do the brakes feel firm? AC work?'
          ]},
          { title: 'Best First Cars', icon: '🏆', items: [
            'Honda Civic / Toyota Corolla: bulletproof reliability, cheap to insure, 30+ MPG. Gold standard for first cars.',
            'Toyota Camry: bigger, still reliable, slightly more expensive to insure.',
            'Mazda3: fun to drive, reliable, good value. Good for someone who wants a bit of personality.',
            'Avoid: BMWs, Audis, Mercedes (maintenance costs 2-3× higher). Avoid V8 trucks (insurance nightmare for teens).',
            'Avoid: cars with no service history, salvage titles, or "just needs one thing" deals.'
          ]},
          { title: 'The Inspection', icon: '🔍', items: [
            'ALWAYS get a pre-purchase inspection from YOUR mechanic (not the seller\'s). Cost: $100-150. Can save you thousands.',
            'Check the VIN for accident history: free at NICB (nicb.org) or paid at Carfax.',
            'Look for mismatched paint (hidden body work), replaced airbags (previous crash), and dash warning lights.',
            'Cold start: ask to see the car started cold. Hidden engine problems show up on cold starts.'
          ]},
          { title: 'Negotiation', icon: '🤝', items: [
            'Check Kelley Blue Book (kbb.com) for fair market value BEFORE you go.',
            'Private sale: typically 15-20% cheaper than dealers, but no warranty.',
            'Never say "I love this car!" to the seller. Start your offer 10-15% below asking.',
            'Be willing to walk away. There is always another car. Urgency is the seller\'s friend, not yours.'
          ]},
          { title: 'After Purchase', icon: '📋', items: [
            'Get insurance BEFORE driving it home (call your agent, get a policy number).',
            'Register within 30 days (Maine). Bring: bill of sale, title, proof of insurance, ID.',
            'Maine inspection required within 10 days of purchase for used vehicles.',
            'Change ALL fluids (oil, coolant, brake fluid, transmission) — you don\'t know when the previous owner did.'
          ]}
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #064e3b, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #10b981', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '💵'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'First Car Buying Guide'),
            h('div', { style: { fontSize: '11px', color: '#a7f3d0' } }, 'Everything they don\'t teach you in driver\'s ed — the money, the negotiation, the traps.')
          ),
          sections.map(function(sec) {
            return h('div', { key: sec.title, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
                h('span', { style: { fontSize: '22px' } }, sec.icon),
                h('span', { style: { fontSize: '13px', fontWeight: 800 } }, sec.title)
              ),
              sec.items.map(function(item, ii) {
                return h('div', { key: ii, style: { fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '10px', borderLeft: '2px solid #10b981', marginBottom: '5px' } }, item);
              })
            );
          })
        );
      }

      // ── KNOW YOUR CAR ──
      if (view === 'knowYourCar') {
        var carParts = [
          { area: 'Engine', icon: '🔧', parts: [
            { name: 'Engine Block', desc: 'Converts fuel into mechanical motion via controlled explosions (internal combustion). Runs at 700-6000+ RPM.' },
            { name: 'Alternator', desc: 'Generates electricity from the engine to charge the battery and power all electrical systems while driving.' },
            { name: 'Radiator', desc: 'Cools the engine by circulating coolant. Sits at the front to catch airflow. Overheating = head gasket failure.' },
            { name: 'Starter Motor', desc: 'Small electric motor that cranks the engine when you turn the key. Uses battery power for ~2 seconds.' }
          ]},
          { area: 'Drivetrain', icon: '⚙️', parts: [
            { name: 'Transmission', desc: 'Changes gear ratios to match engine RPM to wheel speed. Automatic: fluid-coupled. Manual: clutch + gears.' },
            { name: 'Differential', desc: 'Allows wheels to spin at different speeds in turns (outer wheel goes further). Essential for cornering.' },
            { name: 'Driveshaft', desc: 'Transfers power from transmission to the wheels. FWD: half-shafts. RWD: single driveshaft + axle. AWD: both.' }
          ]},
          { area: 'Braking System', icon: '🛑', parts: [
            { name: 'Disc Brakes', desc: 'Caliper squeezes pads against a spinning rotor. Friction converts kinetic energy → heat. Front brakes do ~70% of the work.' },
            { name: 'Brake Fluid', desc: 'Hydraulic fluid transmits pedal force to calipers. Incompressible = instant response. Absorbs moisture over time.' },
            { name: 'ABS Module', desc: 'Pulses brakes 15x/second to prevent wheel lockup. Lets you steer while braking hard. Pedal will vibrate — that is normal.' },
            { name: 'Parking Brake', desc: 'Mechanical (cable) brake on rear wheels. Use when parked on hills. Some vehicles: electronic button instead of lever.' }
          ]},
          { area: 'Steering & Suspension', icon: '🎯', parts: [
            { name: 'Power Steering', desc: 'Hydraulic or electric assist that reduces steering effort. Without it, turning at low speed requires enormous force.' },
            { name: 'Struts/Shocks', desc: 'Absorb bumps and keep tires in contact with the road. Worn shocks = bouncy ride + longer braking distance.' },
            { name: 'Tie Rods', desc: 'Connect steering wheel to the wheels. Worn tie rods = loose/wandering steering. Critical safety component.' },
            { name: 'Wheel Alignment', desc: 'Angles of the wheels relative to the car. Misalignment = uneven tire wear + pulling to one side.' }
          ]},
          { area: 'Electrical', icon: '⚡', parts: [
            { name: 'Battery', desc: '12V lead-acid (gas cars) or high-voltage lithium (EVs). Provides power for starting + electronics. Average life: 3-5 years.' },
            { name: 'Fuse Box', desc: 'Protects circuits from overload. Blown fuse = dead circuit (lights, radio, etc.). Replace with SAME amperage fuse only.' },
            { name: 'ECU (Computer)', desc: 'Engine Control Unit — the car\'s brain. Controls fuel injection, timing, emissions, transmission. Reads 100+ sensors.' }
          ]},
          { area: 'Safety Systems', icon: '🛡️', parts: [
            { name: 'Airbags', desc: 'Inflate in ~30 milliseconds during a crash. Front, side, curtain, knee. SRS light on = system malfunction — get checked.' },
            { name: 'Crumple Zones', desc: 'Engineered to crush in a controlled way, absorbing impact energy before it reaches the passenger cell.' },
            { name: 'Seatbelts', desc: 'Pre-tensioners tighten on impact. Load limiters prevent chest injury. 3-point belt reduces fatality risk by ~45%.' },
            { name: 'Traction Control', desc: 'Reduces engine power or brakes individual wheels when slip is detected. Keeps you in control on wet/icy roads.' },
            { name: 'Blind Spot Monitor', desc: 'Radar sensors detect vehicles in your blind spots. Warning light in the side mirror. Does NOT replace shoulder checks.' }
          ]},
          { area: 'Tires & Wheels', icon: '🛞', parts: [
            { name: 'Tire Tread', desc: 'Channels water away from the contact patch. Below 2/32" = unsafe. Penny test: see all of Lincoln\'s head = replace.' },
            { name: 'Tire Sidewall', desc: 'Shows size (P205/55R16), max pressure, speed rating, and manufacture date (DOT code). Never exceed max PSI.' },
            { name: 'TPMS Sensor', desc: 'Inside each wheel, measures air pressure. Light comes on if 25%+ below recommended. Check ALL 4 tires when it lights.' },
            { name: 'Lug Nuts', desc: 'Hold the wheel on. Torque spec matters — too loose = wheel falls off. Too tight = warped rotor. Use a torque wrench.' }
          ]}
        ];
        return h('div', { style: { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#e2e8f0' } },
          h('button', { onClick: function() { upd('view', 'menu'); }, style: { marginBottom: '12px', fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 } }, '← Menu'),
          h('div', { style: { background: 'linear-gradient(135deg, #701a75, #0f172a)', borderRadius: '14px', padding: '20px', border: '1px solid #e879f9', marginBottom: '14px', textAlign: 'center' } },
            h('div', { style: { fontSize: '42px' } }, '🔍'),
            h('h2', { style: { fontSize: '20px', fontWeight: 900 } }, 'Know Your Car'),
            h('div', { style: { fontSize: '11px', color: '#f0abfc' } }, 'Every major system and part — what it does, why it matters, and what breaks.')
          ),
          carParts.map(function(area) {
            return h('div', { key: area.area, style: { background: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', marginBottom: '8px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
                h('span', { style: { fontSize: '22px' } }, area.icon),
                h('span', { style: { fontSize: '14px', fontWeight: 800 } }, area.area)
              ),
              area.parts.map(function(part, pi) {
                return h('div', { key: pi, style: { paddingLeft: '10px', borderLeft: '2px solid #334155', marginBottom: '6px' } },
                  h('div', { style: { fontSize: '11px', fontWeight: 700, color: '#e879f9' } }, part.name),
                  h('div', { style: { fontSize: '10px', color: '#94a3b8', lineHeight: '1.5' } }, part.desc)
                );
              })
            );
          })
        );
      }

      // Fallback
      return h('div', { style: { padding: '24px', textAlign: 'center', color: '#64748b' } }, 'Loading RoadReady...');
    } catch(renderErr) {
      console.error('[RoadReady] Render error:', renderErr);
      return ctx.React.createElement('div', { style: { padding: '24px', color: '#ef4444', textAlign: 'center' } },
        ctx.React.createElement('h3', null, '🚗 RoadReady Error'),
        ctx.React.createElement('p', { style: { fontSize: '12px', color: '#94a3b8', marginTop: '8px' } }, String(renderErr.message || renderErr)),
        ctx.React.createElement('pre', { style: { fontSize: '10px', color: '#64748b', marginTop: '8px', textAlign: 'left', maxHeight: '200px', overflow: 'auto', background: '#0f172a', padding: '8px', borderRadius: '8px' } }, renderErr.stack || '')
      );
    }
    }
  });

})();
} // end duplicate guard
