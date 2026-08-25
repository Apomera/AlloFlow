// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Space Station (ISS engineering + astronaut life)
//
// An interactive 3-D map of the International Space Station built from
// Three.js primitives (every pressurized module clickable), plus:
//   • Inside: Crew Shift — explore rooms, inspect hotspots, and learn by doing
//   • A Day Aboard — hour-by-hour astronaut schedule (GMT) with the why
//   • Systems & Engineering — ECLSS water/air loops, power, thermal,
//     attitude control, debris shielding, and the microgravity challenges
//   • Orbit Lab — real orbital mechanics: v = √(GM/r), period, drag/reboost
//   • History & Future, quiz, and quest hooks
//
// Science accuracy notes (kept current as of mid-2026, hedged where science
// or plans are uncertain): water recovery ~98% (2023 NASA milestone);
// deorbit planned ~2030-31 via the SpaceX U.S. Deorbit Vehicle; continuously
// crewed since Nov 2 2000. NGSS MS-ETS1 (engineering design), MS-PS2/ESS1.
// House rules: no AI traffic unless ctx.aiHintsEnabled + explicit button.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ── ISS module database (positions are schematic scene coordinates) ──
  // Axis convention for the 3-D scene: X = truss (port/starboard),
  // Z = pressurized stack (forward/aft), Y = zenith/nadir.
  // One implementation of the orbit, used by the fast-facts card AND by the
  // Orbit Lab's live readouts. They used to be independent: the card stated a
  // flat '~92 min' while the status strip computed and rounded the same orbit
  // to 93, so the tool contradicted itself on a single screen. Anything quoted
  // as a fact about the real station is derived here at its real altitude, so
  // the two can no longer drift apart.
  var ISS_GM = 398600.4418;   // km^3/s^2
  var ISS_R_EARTH = 6371;     // km
  var ISS_REF_ALT = 420;      // km — the altitude the "fast facts" describe
  function issOrbit(altKm) {
    var r = ISS_R_EARTH + altKm;
    var v = Math.sqrt(ISS_GM / r);
    return { r: r, v: v, minutes: (2 * Math.PI * r / v) / 60 };
  }
  var _issRefOrbit = issOrbit(ISS_REF_ALT);

  // Derived, not quoted — from the same orbital physics the Orbit Lab teaches.
  // Geostationary is the ONE radius whose period is a sidereal day, so it falls
  // straight out of Kepler's third law; the round-trip delay is then just the
  // path length over c. Rounded to the nearest 100 km because the model uses a
  // mean Earth radius, and the equatorial figure differs by a few km.
  var ISS_SIDEREAL_DAY_S = 86164;
  var ISS_C_KM_S = 299792.458;
  var _issGeoR = Math.cbrt(ISS_GM * ISS_SIDEREAL_DAY_S * ISS_SIDEREAL_DAY_S / (4 * Math.PI * Math.PI));
  var ISS_GEO_ALT_KM = Math.round((_issGeoR - ISS_R_EARTH) / 100) * 100;
  var ISS_GEO_RATIO = Math.round((_issGeoR - ISS_R_EARTH) / ISS_REF_ALT);
  // Station up to a relay directly overhead, then relay down to the terminal —
  // the SHORT geometry, so the quoted delay is a floor rather than a boast.
  var _issCommPathKm = (_issGeoR - (ISS_R_EARTH + ISS_REF_ALT)) + (_issGeoR - ISS_R_EARTH);
  var ISS_COMM_DELAY_MS = Math.round(2 * _issCommPathKm / ISS_C_KM_S * 1000 / 10) * 10;

  var MODULES = [
    { id: 'zarya', name: 'Zarya (FGB)', agency: '🇷🇺 built / 🇺🇸 owned', launched: 'Nov 20, 1998 — Proton rocket', pos: [0, 0, 2.2], size: [0.55, 3.4], axis: 'z', color: 0xc9b18a,
      role: 'The very first ISS module. Provided early propulsion, power, and storage; today it is mostly a corridor and storage space.',
      fact: 'Zarya means "sunrise" in Russian. It was built in Moscow but paid for by NASA — a fitting start for a 15-nation partnership.',
      eng: 'Early station attitude control came from Zarya until Zvezda arrived — a spacecraft acting as scaffolding for a bigger one.' },
    { id: 'unity', name: 'Unity (Node 1)', agency: '🇺🇸 NASA', launched: 'Dec 4, 1998 — Shuttle Endeavour STS-88', pos: [0, 0, 0.2], size: [0.6, 1.4], axis: 'z', color: 0xdfe5ec,
      role: 'The first U.S. module and the station’s first connecting node: six docking ports link the Russian and U.S. segments.',
      fact: 'The first ISS assembly job was joining Unity to Zarya by hand-flying the shuttle’s robotic arm — with no camera view of the final inches.',
      eng: 'Nodes are the station’s hallway intersections; without them, modules could only form one long chain.' },
    { id: 'zvezda', name: 'Zvezda (Service Module)', agency: '🇷🇺 Roscosmos', launched: 'Jul 12, 2000 — Proton rocket', pos: [0, 0, 4.6], size: [0.55, 3.2], axis: 'z', color: 0xb9c4a7,
      role: 'The early living quarters: two crew cabins, a galley, a toilet, exercise gear, and the station’s main rocket engines for reboosts.',
      fact: 'Zvezda ("star") made the station habitable — Expedition 1 moved in four months after it arrived and people have lived aboard ever since (Nov 2, 2000).',
      eng: 'Its engines and visiting cargo ships periodically REBOOST the station, which loses roughly 50-100 m of altitude per day to thin-air drag.' },
    { id: 'destiny', name: 'Destiny (U.S. Lab)', agency: '🇺🇸 NASA', launched: 'Feb 7, 2001 — Shuttle Atlantis STS-98', pos: [0, 0, -1.6], size: [0.58, 2.6], axis: 'z', color: 0xe8e2d4,
      role: 'The primary U.S. research lab: racks of experiments in biology, physics, materials, and human health line every wall (in space, every wall is a floor).',
      fact: 'Destiny has a 51-cm optical-quality window pointed at Earth, used for crew photography that scientists use to track storms, glaciers, and city growth.',
      eng: 'Standardized "rack" slots let whole experiments be swapped like drawers — modular design is what keeps a 25-year-old lab current.' },
    { id: 'quest', name: 'Quest (Airlock)', agency: '🇺🇸 NASA', launched: 'Jul 12, 2001 — Shuttle Atlantis STS-104', pos: [1.1, 0, 0.2], size: [0.45, 1.2], axis: 'x', color: 0xcfd6dd,
      role: 'The doorway for U.S. spacewalks (EVAs). Astronauts pre-breathe oxygen here to purge nitrogen so they don’t get the bends in the low-pressure suit.',
      fact: 'A spacesuit is really a one-person spacecraft: it runs at about 1/3 atmospheric pressure, which is why suited astronauts must prepare for hours before stepping out.',
      eng: 'Spacewalks are the station’s hardest routine engineering: hundreds have been performed for assembly and repairs, each choreographed minute-by-minute for years in a giant pool on Earth.' },
    { id: 'harmony', name: 'Harmony (Node 2)', agency: '🇺🇸 NASA / built in 🇮🇹 Italy', launched: 'Oct 23, 2007 — Shuttle Discovery STS-120', pos: [0, 0, -3.4], size: [0.6, 1.6], axis: 'z', color: 0xdfe5ec,
      role: 'The forward node: four crew sleep cabins, and the docking ports where SpaceX Crew Dragon and cargo ships arrive today.',
      fact: 'Each sleep cabin is phone-booth sized, with a sleeping bag strapped to the wall — you clip in so you don’t drift into a wall (or a crewmate).',
      eng: 'Its ports carry power, data, and air to visiting vehicles — a standardized interface, like USB for spacecraft.' },
    { id: 'columbus', name: 'Columbus', agency: '🇪🇺 ESA', launched: 'Feb 7, 2008 — Shuttle Atlantis STS-122', pos: [-1.4, 0, -3.4], size: [0.55, 1.6], axis: 'x', color: 0xe4ddca,
      role: 'Europe’s laboratory: fluid physics, materials science, and human biology, plus external platforms exposed to raw space.',
      fact: 'An external Columbus experiment showed some hardy organisms (like tardigrades and certain lichens) can survive direct exposure to space.',
      eng: 'Columbus is run day-to-day from a control center in Germany — the station is really flown by a network of control rooms across the planet.' },
    { id: 'kibo', name: 'Kibo (JEM)', agency: '🇯🇵 JAXA', launched: '2008-2009 — three Shuttle flights', pos: [1.5, 0, -3.4], size: [0.6, 2.0], axis: 'x', color: 0xe9e9f2,
      role: 'The largest station module — "Hope" in Japanese. A pressurized lab plus a back porch (Exposed Facility) and its own small robotic arm.',
      fact: 'Kibo’s airlock and arm launch shoebox-sized CubeSats built by students around the world — the station doubles as a tiny satellite launch pad.',
      eng: 'The Exposed Facility lets experiments face vacuum, radiation, and 16 daily 250°C temperature swings without a spacewalk to install them.' },
    { id: 'tranquility', name: 'Tranquility (Node 3)', agency: '🇺🇸 NASA / built in 🇮🇹 Italy', launched: 'Feb 8, 2010 — Shuttle Endeavour STS-130', pos: [-1.2, 0, 0.2], size: [0.6, 1.5], axis: 'x', color: 0xdfe5ec,
      role: 'The life-support hub: water recycling, oxygen generation, the main toilet, and the treadmill live here.',
      fact: 'The treadmill has a harness and bungees to hold runners down — and the whole machine floats on a vibration-isolation cradle so jogging doesn’t shake sensitive experiments.',
      eng: 'ECLSS (Environmental Control and Life Support System) recovers about 98% of the station’s water — including from sweat and urine. "Yesterday’s coffee becomes tomorrow’s coffee."' },
    { id: 'cupola', name: 'Cupola', agency: '🇪🇺 ESA-built / 🇺🇸 NASA', launched: 'Feb 8, 2010 — with Tranquility', pos: [-1.2, -0.75, 0.2], size: [0.42, 0.5], axis: 'y', color: 0x9fb6c8,
      role: 'The seven-windowed dome facing Earth: part robotics workstation (flying Canadarm2 during captures), part the best window seat in existence.',
      fact: 'The central window is 80 cm across — the largest ever flown in space. Astronauts consistently call time here the psychological highlight of a mission.',
      eng: 'Each window has a shutter closed when not in use — armor against micrometeoroid strikes on the glass.' },
    { id: 'leonardo', name: 'Leonardo (PMM)', agency: '🇮🇹 ASI / 🇺🇸 NASA', launched: 'Feb 24, 2011 — Shuttle Discovery STS-133', pos: [0, -0.85, 0.2], size: [0.5, 1.3], axis: 'y', color: 0xd8d3c2,
      role: 'The station’s walk-in closet: a former cargo carrier bolted on permanently to add storage space.',
      fact: 'Leonardo flew to orbit and back seven times in the shuttle era as a moving van before being left aboard for good.',
      eng: 'Stowage is a real engineering problem: every item must be logged and strapped down, because a lost tool can drift into an air vent — or stay lost for years.' },
    { id: 'nauka', name: 'Nauka (MLM) + Prichal', agency: '🇷🇺 Roscosmos', launched: 'Jul 21, 2021 — Proton rocket', pos: [0, 0.85, 4.6], size: [0.55, 1.9], axis: 'y', color: 0xb9c4a7,
      role: 'Russia’s multipurpose lab (with the European Robotic Arm) plus the small Prichal docking hub — the newest large additions.',
      fact: 'Nauka waited over a decade on the ground for repairs and upgrades before finally flying — spacecraft schedules are hard.',
      eng: 'Minutes after docking, Nauka’s thrusters fired unexpectedly and slowly spun the whole station about 1.5 turns before controllers recovered — a famous reminder that docking two spacecraft makes one new, harder-to-predict spacecraft.' },
    { id: 'truss', name: 'Integrated Truss + Solar Arrays', agency: '🇺🇸 NASA / 🇨🇦 CSA arm', launched: 'Assembled 2000-2009 (+ iROSA 2021-2023)', pos: [0, 0.35, -1.6], size: [0.2, 11.0], axis: 'x', color: 0x8a93a6,
      role: 'The 109-meter backbone: eight paired solar-array wings, the ammonia cooling radiators, and rails that Canadarm2 rides along like a train.',
      fact: 'The arrays cover about 2,500 m² — near half a football field of solar panels — and the newer roll-out iROSA arrays unrolled over the originals like yoga mats.',
      eng: 'Sun-tracking joints slowly rotate the wings all orbit long; giant radiators dump waste heat, because in vacuum you can’t cool anything with a breeze.' }
  ];

  // ── Inside the station: a playable, room-to-room crew shift ──
  var INTERIOR_ROOMS = [
    { id: 'harmony', module: 'Harmony', time: '06:30 GMT', icon: '😴', color: '#e879f9', name: 'Crew quarters', zone: 'Wake-up', skill: 'Habitat safety', telemetry: ['CABIN AIRFLOW', '0.4 m/s'],
      objective: 'Wake, orient yourself, and leave the tiny cabin safe for the next part of the shift.', hint: 'Ask what could drift, block airflow, or be hard to find later.',
      scene: 'A phone-booth-sized cabin opens onto a bright white tunnel. Laptops, handrails, labels, and soft bags cover every surface — there is no floor or ceiling.',
      sound: 'Fans hum constantly. That noise means breathable air is moving.',
      task: 'Stow your sleep station', prompt: 'Your sleeping bag is drifting across the cabin. What should you do before the morning planning call?',
      choices: [
        { id: 'loose', label: 'Let it float', feedback: 'It would block the tiny cabin and could drift over an air return. Loose objects become hazards in microgravity.' },
        { id: 'strap', label: 'Clip it flat to the wall', correct: true, feedback: 'Good stowage. On station, walls and ceilings are equally useful storage surfaces, and every object gets a restraint.' },
        { id: 'vent', label: 'Stuff it into the vent', feedback: 'The vent must stay clear. Without forced airflow, exhaled CO₂ can collect around a crew member’s face.' }
      ],
      lesson: 'In continuous freefall, “down” disappears. Restraints replace shelves, and ventilation replaces natural convection.',
      discoveries: [['🌬️ Air return', 'Air does not rise or fall here. Fans pull warm, humid, CO₂-rich air through the life-support system.'], ['🟦 Blue handrail', 'Crew use colored rails and labels to agree on an artificial “deck” direction and avoid getting disoriented.']] },
    { id: 'destiny', module: 'Destiny', time: '08:10 GMT', icon: '🧪', color: '#38bdf8', name: 'Destiny laboratory', zone: 'Research', skill: 'Experimental design', telemetry: ['RACK TEMP', '22.1 °C'],
      objective: 'Prepare a contained plant experiment that can deliver water without gravity.', hint: 'Look for a force that works inside very small spaces even when nothing falls.',
      scene: 'Experiment racks line four sides of the lab. A glovebox seals samples away from the cabin, while cables and laptops turn the module into a working laboratory.',
      sound: 'Rack fans and pumps make the lab sound more like a server room than a spaceship.',
      task: 'Start a plant-water experiment', prompt: 'A seedling needs a steady supply of water, but droplets will not fall into its roots. Which delivery method should you test?',
      choices: [
        { id: 'pour', label: 'Pour from an open cup', feedback: 'The water would cling to the cup, your hand, or form floating blobs. Gravity cannot pull it neatly into the soil.' },
        { id: 'mist', label: 'Release a cloud of droplets', feedback: 'Free droplets could enter electronics and vents. Experiments must keep water contained.' },
        { id: 'wick', label: 'Use a porous capillary wick', correct: true, feedback: 'Experiment running. Adhesion and surface tension pull water through tiny pores even without gravity.' }
      ],
      lesson: 'Microgravity removes buoyancy and settling, revealing forces that gravity usually hides — especially capillary action and surface tension.',
      discoveries: [['🧤 Glovebox', 'Sealed gloves let crew handle flames, fluids, or biological samples without releasing them into cabin air.'], ['📦 EXPRESS rack', 'Standard rack connections give hundreds of experiments shared power, cooling, data, and command links.']] },
    { id: 'tranquility', module: 'Tranquility', time: '13:35 GMT', icon: '🔧', color: '#fbbf24', name: 'Life-support bay', zone: 'Maintenance', skill: 'Systems diagnosis', telemetry: ['CO₂ TREND', 'RISING'],
      objective: 'Use the symptoms to restore safe circulation without changing unrelated systems.', hint: 'Weak flow plus a healthy fan motor points toward something obstructing the air path.',
      scene: 'Panels hide pumps, valves, filters, the exercise area, and the station toilet. A caution light reports weak airflow in the cabin loop.',
      sound: 'A fan’s pitch has dropped — a small change the crew are trained to notice.',
      task: 'Restore cabin airflow', prompt: 'CO₂ is rising near a sleeping compartment and the fan is pulling less air. What is the best first maintenance action?',
      choices: [
        { id: 'off', label: 'Turn the fan off', feedback: 'That would make the invisible CO₂ pocket worse. Forced circulation is essential when warm air cannot rise.' },
        { id: 'filter', label: 'Inspect and replace the clogged inlet filter', correct: true, feedback: 'Airflow restored. Dust, lint, hair, and crumbs collect on filters because they never settle to a floor.' },
        { id: 'oxygen', label: 'Add extra oxygen', feedback: 'Oxygen does not remove CO₂ or fix weak airflow. Diagnose the circulation path before changing cabin chemistry.' }
      ],
      lesson: 'Maintenance is science in action: observe a symptom, isolate the likely cause, change one thing, and verify the system response.',
      discoveries: [['♻️ Water panel', 'Condensed breath, sweat, and processed urine rejoin one carefully monitored water loop.'], ['🚽 Waste system', 'Airflow pulls waste away from the body; a normal gravity toilet would not work in freefall.']] },
    { id: 'unity', module: 'Unity', time: '15:10 GMT', icon: '🫸', color: '#34d399', name: 'Unity node', zone: 'Low-g practice', skill: 'Newton’s laws', telemetry: ['RELATIVE SPEED', '0.00 m/s'],
      objective: 'Choose an impulse that reaches the cargo slowly enough to stop at the next rail.', hint: 'With almost no drag, the speed you create will remain until another force stops you.',
      scene: 'Six passageways meet at this busy intersection. A cargo pouch has floated loose just beyond your fingertips.',
      sound: 'Velcro tears, fans whir, and a crewmate calls “coming through” from the next hatch.',
      task: 'Retrieve a floating cargo pouch', prompt: 'You are at rest beside a handrail. How should you launch toward the pouch without colliding with the far hatch?',
      choices: [
        { id: 'hard', label: 'Kick off hard', feedback: 'You reach it fast but cannot stop — there is almost no drag. You bump the far hatch and send the pouch spinning.' },
        { id: 'swim', label: 'Swim through the air', feedback: 'Air is far too thin to push against effectively. Astronauts translate by pushing on the station’s structure.' },
        { id: 'gentle', label: 'Use a gentle fingertip push', correct: true, feedback: 'Clean translation. A tiny push is enough, and you keep one hand ready to brake on the next rail.' }
      ],
      lesson: 'Newton’s first law becomes everyday experience: once moving, you keep moving. Good low-g technique is slow, planned, and handrail-to-handrail.',
      discoveries: [['🟨 Hatch stripe', 'Colored labels mark routes and orientation. In an emergency, everyone must find the same vehicle without a shared sense of down.'], ['📦 Cargo restraint', 'Velcro, clips, bungees, and mesh prevent inventory from turning into a cloud of lost objects.']] },
    { id: 'cupola', module: 'Cupola', time: '21:25 GMT', icon: '🌍', color: '#818cf8', name: 'Cupola observatory', zone: 'Shift closeout', skill: 'Risk procedure', telemetry: ['NEXT SUNRISE', '41 min'],
      objective: 'Finish Earth observation and leave the seven windows protected for the night.', hint: 'The correct closeout step protects hardware, not just crew sleep or night vision.',
      scene: 'Earth fills the seven windows: blue ocean, a razor-thin atmosphere, then a sunset racing toward the station at orbital speed.',
      sound: 'The fans remain audible, but this small dome feels calmer than the laboratories.',
      task: 'Secure the Cupola for sleep', prompt: 'Your observation period is over and the Cupola will be unattended. What is the final step?',
      choices: [
        { id: 'open', label: 'Leave every window exposed', feedback: 'The view is tempting, but exposed panes face needless micrometeoroid and debris risk when nobody is watching.' },
        { id: 'shade', label: 'Only dim the cabin lights', feedback: 'That reduces glare but does not protect the fused-silica pressure panes from an impact.' },
        { id: 'shutters', label: 'Close the external shutters', correct: true, feedback: 'Cupola secure. The metal shutters protect the windows whenever they are not needed for viewing or robotics.' }
      ],
      lesson: 'Life aboard mixes wonder with procedure. Even the best view in human history ends with a checklist.',
      discoveries: [['🪟 Center window', 'At about 80 cm across, it is the largest window ever flown in space and a prime robotics workstation.'], ['🌎 Thin blue line', 'Most of the atmosphere lies within about 16 km of Earth’s surface — visually tiny from a 400 km orbit.']] }
  ];
  // Connected interior training route. Coordinates are schematic metres:
  // Harmony -> Destiny -> Unity, then port into Tranquility and nadir into
  // Cupola. The branch matters: navigating a station is a 3-D wayfinding task,
  // not a walk down a hallway.
  var INTERIOR_3D_LAYOUT = [
    { id: 'harmony', center: [0, 0, -11.0], axis: 'z', length: 5.2, radius: 1.72, color: 0xe879f9, facing: [0, Math.PI, 0] },
    { id: 'destiny', center: [0, 0, -5.45], axis: 'z', length: 6.2, radius: 1.78, color: 0x38bdf8, facing: [0, Math.PI, 0] },
    { id: 'unity', center: [0, 0, -0.25], axis: 'z', length: 4.1, radius: 1.68, color: 0x34d399, facing: [0, Math.PI / 2, 0] },
    { id: 'tranquility', center: [-3.25, 0, -0.25], axis: 'x', length: 6.5, radius: 1.68, color: 0xfbbf24, facing: [0, Math.PI / 2, 0] },
    { id: 'cupola', center: [-6.25, -2.35, -0.25], axis: 'y', length: 4.2, radius: 1.48, color: 0x818cf8, facing: [-Math.PI / 2, Math.PI / 2, 0] }
  ];
  var INTERIOR_ROUTE_IDS = ['harmony', 'destiny', 'unity', 'tranquility', 'cupola'];
  // ── A Day Aboard (typical crew day, station runs on GMT) ──
  var DAY_SCHEDULE = [
    { h: '06:00', icon: '⏰', label: 'Wake-up', what: 'Crew wakes in phone-booth-sized cabins; sleeping bags strapped to the wall.', why: 'With 16 sunrises a day, the body gets no light cues — a strict clock (and adjustable LED lighting) stands in for the Sun.' },
    { h: '06:30', icon: '🪥', label: 'Post-sleep & hygiene', what: 'Rinseless soap, no-rinse shampoo, and swallowing toothpaste. Water sticks to skin in blobs.', why: 'A shower is impossible: water won’t fall. Every drop is captured by airflow and recycled.' },
    { h: '07:30', icon: '📋', label: 'Daily Planning Conference', what: 'Crew talks through the day with control centers in Houston, Moscow, Munich, and Tsukuba.', why: 'The station is really flown from the ground; the crew are the hands of thousands of engineers.' },
    { h: '08:00', icon: '🧪', label: 'Science block', what: 'Running experiments: protein crystals, flames that burn as spheres, plants in Veggie, their own bodies as biology labs.', why: 'Microgravity is the station’s whole reason to exist — it lets you study phenomena gravity normally hides.' },
    { h: '10:30', icon: '🏋️', label: 'Exercise 1 of 2', what: 'ARED "weightlifting" machine (vacuum cylinders make resistance), treadmill with bungee harness, or cycling.', why: 'About 2.5 hours daily, or bones lose ~1-1.5% density per month and muscles waste — gravity was your lifelong gym.' },
    { h: '12:30', icon: '🌮', label: 'Lunch', what: 'Rehydrated pouches, tortillas instead of crumbly bread, salt and pepper as LIQUIDS.', why: 'Crumbs and grains float — into eyes, vents, and equipment. Tortillas were an astronaut food breakthrough.' },
    { h: '13:30', icon: '🔧', label: 'Maintenance', what: 'Swapping filters, fixing the toilet, tracking down inventory, upgrading hardware.', why: 'There is no repair shop for 400 km. The crew IS the repair shop — maintenance takes a large share of crew time.' },
    { h: '16:00', icon: '🏃', label: 'Exercise 2 of 2', what: 'Second session — the exercise prescription is split across the day.', why: 'Spreading the load protects bone and heart better than one marathon session.' },
    { h: '18:00', icon: '📞', label: 'Family & ham radio', what: 'IP phone calls home, emails, and sometimes surprise chats with students via amateur radio (ARISS).', why: 'Psychological health is a life-support system too — isolation is one of spaceflight’s hardest challenges.' },
    { h: '19:30', icon: '🍽️', label: 'Dinner together', what: 'Crews from several countries strap food pouches to one table and share meals.', why: 'Shared meals are deliberately protected time — cohesion keeps a 6-month expedition healthy.' },
    { h: '21:00', icon: '🌍', label: 'Cupola time', what: 'Off-duty favorite: photographing auroras, lightning storms, and home towns from the seven-window dome.', why: 'Many astronauts describe an "overview effect" — seeing Earth as one thin-skinned planet changes them.' },
    { h: '21:30', icon: '😴', label: 'Sleep (8.5 h scheduled)', what: 'Earplugs and eye masks; some crew report drifting arms floating in front of them.', why: 'Fans and pumps hum constantly (~60-70 dB) — silence would actually mean the life support stopped.' }
  ];

  // ── Systems & engineering challenges ──
  var SYSTEMS = [
    { id: 'water', icon: '💧', name: 'Water loop (ECLSS)', color: '#38bdf8',
      how: 'Humidity from breath and sweat is condensed; urine is distilled in a spinning drum (in microgravity, even boiling needs a centrifuge). The combined water is filtered, checked, and returned as drinking water.',
      num: 'About 98% of water is now recovered (a 2023 milestone) — each kilogram recycled is a kilogram that never has to launch at thousands of dollars per kg.',
      challenge: 'Design question: why is closing the water loop the single most important step before a Mars voyage, where no resupply is possible?' },
    { id: 'air', icon: '🌬️', name: 'Air loop', color: '#34d399',
      how: 'Oxygen is made by electrolysis — splitting recycled water with solar electricity. CO₂ is scrubbed from the air, then a Sabatier reactor combines CO₂ with hydrogen to make MORE water (plus methane, vented overboard).',
      num: 'A person needs ~0.84 kg of O₂ per day. Fans must keep air moving constantly — in microgravity, exhaled CO₂ can form an invisible cloud around a sleeping astronaut’s face.',
      challenge: 'Trace the loop: sunlight → electricity → water split → oxygen breathed → CO₂ exhaled → water again. Where does the loop leak mass?' },
    { id: 'power', icon: '☀️', name: 'Power', color: '#fbbf24',
      how: 'Eight solar-array wings track the Sun and charge lithium-ion batteries, which carry the station through the ~35-minute night of every 92-minute orbit.',
      num: 'The arrays span ~2,500 m² and generate on the order of 100+ kW — but the station spends a third of every orbit in Earth’s shadow, so storage is as important as generation.',
      challenge: 'Sixteen sunsets a day means sixteen battery cycles a day. What does that do to battery lifetime, and why were all the batteries replaced in 2017-2021?' },
    { id: 'thermal', icon: '🌡️', name: 'Thermal control', color: '#f97316',
      how: 'Sunlit surfaces can reach ~+120°C while shaded ones drop to ~-160°C. Water loops collect heat inside; ammonia loops carry it to big white radiators that glow it away as infrared.',
      num: 'In vacuum there is no air to carry heat off — radiation is the ONLY exit. That’s why the radiators are almost as prominent as the solar arrays.',
      challenge: 'A laptop on Earth is cooled by a fan pulling in room air. List two reasons that fails on the station, and what replaces it.' },
    { id: 'attitude', icon: '🧭', name: 'Attitude control', color: '#a78bfa',
      how: 'Four spinning 100-kg flywheels (Control Moment Gyroscopes) twist the station without burning any fuel; thrusters take over only when the gyros run out of authority ("saturate").',
      num: 'The station must hold its orientation so arrays face the Sun, radiators face cold space, and antennas face Earth — all at once, forever.',
      challenge: 'Why is torque from a spinning wheel "free" compared to a thruster, and what is the catch that eventually forces a fuel-burning desaturation?' },
    { id: 'debris', icon: '🛡️', name: 'Debris & shielding', color: '#f87171',
      how: 'Whipple shields — a thin outer bumper spaced ahead of the hull — make an incoming particle vaporize itself before it reaches the crew wall. Big tracked debris is dodged with reboost burns.',
      num: 'Orbital debris moves at up to ~15 km/s relative speed; even a paint fleck hits like a rifle round. The station has performed dozens of debris-avoidance maneuvers.',
      challenge: 'Armor thick enough to stop everything would be too heavy to launch. How does the two-wall trick beat one thick wall of the same mass?' },
    { id: 'comms', icon: '📻', name: 'Talking to the ground', color: '#22d3ee',
      how: 'The station is almost never within sight of Houston — at 420 km it can only see a few hundred kilometres of ground at a time. So it talks UPWARD instead. A fleet of relay satellites parked in geostationary orbit, far above the station, catch its signal and pass it down to a ground terminal in New Mexico and on to mission control. Because those satellites hang over the same spot on Earth, one of them can nearly always see the station wherever it is in its orbit.',
      num: 'Geostationary orbit is not a choice of altitude so much as a consequence of v = √(GM/r): there is exactly ONE radius whose orbit takes a full day, about ' + ISS_GEO_ALT_KM.toLocaleString() + ' km up, and a satellite there appears to hover. That is roughly ' + ISS_GEO_RATIO + '× higher than the station itself. The signal has to climb all that way and come back down, so a question from the ground takes about ' + ISS_COMM_DELAY_MS + ' ms to make the round trip before anyone hears the answer — brief, but not nothing.',
      challenge: 'Design question: a crew on the way to Mars is minutes to tens of minutes from Earth ONE WAY, so no relay satellite can give them a conversation. What has to change about how a crew is trained, and about who makes decisions, when every question takes the better part of an hour to answer?' },
    { id: 'body', icon: '🦴', name: 'The human system', color: '#e879f9',
      how: 'Bodies are engineering systems too: without gravity, bones shed ~1-1.5% density per month, muscles shrink, fluid shifts puff faces and press on eyes, and radiation dose runs far above ground level.',
      num: 'Daily dose aboard is roughly 0.5-1 mSv — months aboard approach what a nuclear worker may receive in a year. Exercise, diet, and shielding are the current countermeasures.',
      challenge: 'The station is the only lab where we can study years of weightlessness — every crew member is also an experiment. What would YOU measure before a 3-year Mars mission?' }
  ];

  // ── History & future ──
  // The Operations tab pulls three of these schematics by ARRAY INDEX
  // (SYSTEMS[0], [3], [6]). Reorder or insert a system and the ECLSS mode
  // silently starts drawing the thermal loop — nothing throws, the picture is
  // just wrong. Look them up by the id they mean instead.
  function systemById(id) {
    for (var i = 0; i < SYSTEMS.length; i++) if (SYSTEMS[i].id === id) return SYSTEMS[i];
    return SYSTEMS[0];
  }

  var TIMELINE = [
    { y: '1998', e: 'Zarya then Unity launch; the first two modules are joined in orbit.' },
    { y: '2000', e: 'Zvezda arrives; Expedition 1 moves in Nov 2 — humans have lived off Earth continuously ever since.' },
    { y: '2001', e: 'Destiny, Quest, and Canadarm2 arrive, turning the outpost into a working laboratory and EVA base.' },
    { y: '2002-2006', e: 'The integrated truss, early solar-array wings, and thermal-control hardware build the station’s backbone.' },
    { y: '2007', e: 'Harmony joins as the forward connecting node for laboratories and visiting crew vehicles.' },
    { y: '2008', e: 'Columbus and the first Kibo elements expand the station into a genuinely international laboratory.' },
    { y: '2009', e: 'Kibo and the main truss assembly reach their completed forms after years of staged shuttle construction.' },
    { y: '2010', e: 'Tranquility and the seven-window Cupola add life-support capacity and the iconic Earth-facing observatory.' },
    { y: '2011', e: 'Leonardo becomes a permanent storage module; the Space Shuttle retires with assembly essentially complete.' },
    { y: '2020', e: 'SpaceX Crew Dragon restores U.S. crew launches — the first commercial crew vehicle.' },
    { y: '2021-2023', e: 'Nauka + Prichal join; roll-out iROSA arrays boost the aging power system.' },
    // Derived, not hardcoded: this entry is the "you are here" marker on the
    // assembly slider, so a frozen literal would quietly tell students the
    // wrong year every January. The surrounding claims are deliberately
    // open-ended ("more than", "final operational decade") so they stay true.
    { y: String(new Date().getFullYear()) + ' (now)', e: 'More than 280 people from over 20 countries have visited. The station is in its final operational decade.' },
    { y: '~2030-31', e: 'Planned retirement: a SpaceX-built U.S. Deorbit Vehicle is slated to steer the station to a controlled breakup over the remote South Pacific. Commercial stations and China’s Tiangong continue low-Earth-orbit research.' }
  ];

  var QUIZ = [
    { q: 'How fast does the ISS travel?', o: ['~800 km/h', '~7,000 km/h', '~28,000 km/h', '~300,000 km/h'], a: 2, x: 'About 28,000 km/h (7.66 km/s) — one orbit of Earth every ~92 minutes, 16 sunrises a day.' },
    { q: 'Roughly how much of the station’s water is recycled?', o: ['10%', '50%', '75%', '~98%'], a: 3, x: 'As of 2023 the ECLSS recovers about 98% — including water distilled from urine and condensed from breath.' },
    { q: 'Why must astronauts exercise ~2.5 hours a day?', o: ['To stay warm', 'Bones and muscles waste without gravity’s load', 'To generate electricity', 'NASA tradition'], a: 1, x: 'Without loading, bones lose ~1-1.5% density per month; exercise is medicine.' },
    { q: 'How does the station get its oxygen mainly?', o: ['Tanks from Earth', 'Splitting water with electricity', 'Plants aboard', 'Compressing outside air'], a: 1, x: 'Electrolysis splits recycled water into O₂ and H₂; the H₂ feeds a Sabatier reactor to reclaim even more water.' },
    { q: 'What keeps the station pointed correctly WITHOUT burning fuel?', o: ['Solar wind sails', 'Spinning control moment gyroscopes', 'Magnets in the hull', 'The robotic arm'], a: 1, x: 'Four large spinning flywheels twist the station by exchanging angular momentum — no propellant needed until they saturate.' },
    { q: 'Why does the station need regular reboosts?', o: ['Thin atmosphere drags it ~50-100 m lower per day', 'The Moon pulls it away', 'The crew requests them', 'Solar pressure pushes it down'], a: 0, x: 'Even at ~400 km, wisps of atmosphere slowly sap orbital energy; engines on Zvezda and cargo ships push it back up.' },
    { q: 'The station orbits at an inclination of 51.6°. What does that number tell you?', o: ['How high above Earth it flies', 'The highest latitude it ever passes over', 'How fast it is travelling', 'How often it is resupplied'], a: 1, x: 'Inclination is the tilt of the orbit against the equator, so the station passes over everywhere between 51.6°N and 51.6°S — and never directly over the poles. 51.6° was chosen so that launches from Baikonur, at about 46°N, could reach it: a rocket can always aim for an inclination higher than its launch latitude, never lower.' },
    { q: 'Which is the LARGEST module?', o: ['Zarya', 'Destiny', 'Kibo (Japan)', 'Columbus'], a: 2, x: 'JAXA’s Kibo — a big pressurized lab plus an exposed "back porch" and its own robotic arm.' },
    { q: 'Salt and pepper aboard are used as…', o: ['Powders in shakers', 'Liquids in dropper bottles', 'Pills', 'They’re banned'], a: 1, x: 'Floating grains would drift into eyes, vents, and experiments — so seasonings are dissolved liquids.' },
    { q: 'What is a Whipple shield?', o: ['A sun shade', 'A spaced two-wall bumper that vaporizes debris', 'A radiation blanket', 'The airlock hatch'], a: 1, x: 'A thin standoff bumper shocks a hypervelocity particle into vapor and spray before it reaches the pressure hull.' },
    { q: 'What is planned for the station around 2030-31?', o: ['Boost to the Moon', 'Sale to a museum', 'Controlled deorbit over the remote ocean', 'Left empty in orbit'], a: 2, x: 'Current plans call for a SpaceX-built deorbit vehicle to steer it into a controlled reentry over the South Pacific; commercial stations take over research in low Earth orbit.' }
  ];

  var QUIZ_TOPIC_LABELS = ['Velocity', 'Water', 'Human body', 'Oxygen', 'Attitude', 'Orbital drag', 'Inclination', 'Modules', 'Crew life', 'Shielding', 'Future'];
  // Derived, not written out four times. The pass mark used to be a literal 7
  // in the quest hook, the quest label, the debrief message and the toast, so
  // adding a question silently lowered the bar in three of the four and left
  // the label lying about it.
  var QUIZ_PASS = Math.ceil(QUIZ.length * 0.7);

  var FAST_FACTS = [
    ['Altitude', '~400-420 km'], ['Speed', _issRefOrbit.v.toFixed(2) + ' km/s'], ['Orbit period', '~' + _issRefOrbit.minutes.toFixed(0) + ' min'],
    ['Sunrises/day', String(Math.round(1440 / _issRefOrbit.minutes))], ['Truss length', '109 m'], ['Mass', '~420,000 kg'],
    ['Pressurized volume', '~916 m³'], ['Usual crew', '7'], ['Crewed since', 'Nov 2, 2000'],
    ['Partner nations', '15'], ['Visitors so far', '280+ from 20+ countries'], ['Solar array area', '~2,500 m²']
  ];

  // ── The planet under the station ──────────────────────────────────────
  // The COASTLINES are real: a 0.5° land/water mask downsampled from the
  // public-domain Natural Earth 50m land layer this Lab already ships inside
  // stem_tool_flightsim.js, kept in the same base36 per-row RLE (runs alternate
  // starting with water, one row per line of latitude from 90°N down).
  // Everything painted ON those coastlines — biome tint, sea ice, cloud bands —
  // is SCHEMATIC, and the tab copy says so out loud rather than letting a
  // student read invented deserts as data. The night lights are the exception:
  // they are drawn at the real coordinates of major metropolitan areas, so the
  // terminator sweeping across them shows something true.
  var ISS_LAND_W = 720, ISS_LAND_H = 360;
  var ISS_LAND_RLE = 'k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;7j,6,1,w,be;5h,10,x,1f,b7;58,6,1,16,7,9,1,2,2,1m,b8;4x,1k,5,28,3,1,5,9,ao;4s,4,4,1e,4,2,1,2r,3h,1,a,5,c,1,1o,3,4n;4o,b,3,17,3,2v,3c,4,1,1,1,5,5,a,1,5,2,4,s,2,p,a,4l;4n,i,2,6,1,q,6,2u,1w,i,14,4,1,1,5,2,5,5,1,1,1s,d,4k;4h,1,5,j,1,v,c,2j,1,3,1k,6,1,2,2,4,1,h,3l,h,4g;45,5,f,2,1,i,1,k,h,2m,1o,i,5,6,3t,c,2,4,4a;3t,4,9,1,1,8,4,3,5,13,7,2u,1p,1,1,k,48,4,2,a,45;3q,7,9,c,2,6,5,8,2,o,5,2w,3,1,1p,1,1,4,1,8,3,5,49,b,46;3m,2,1,7,8,1,6,3,1,3,4,7,5,1,5,4,1,f,d,2w,1v,9,5,7,4e,3,46;3d,8,6,1,d,2,r,3,3,j,c,1,2,2x,1t,7,a,1,42,1,a,9,44;3a,a,3,2,8,2,8,1,6,1,3,1,3,8,2,2,1,p,f,2r,3,2,1w,3,2q,6,1s,d,1,7,3t;37,8,1,2,1,8,5,4,7,4,1,9,4,c,7,3,7,4,j,2r,2,1,4f,f,1h,3,3,v,1e,1,2a;3b,1,2,2,2,c,3,8,5,b,5,1,4,7,8,8,3,1,13,28,4b,f,1g,19,17,1,2,g,1y;3h,o,1,3,6,6,2,6,2,q,16,26,1,3,43,c,1e,1h,1b,g,2,9,1n;3o,8,s,5,3,p,19,23,46,a,1f,1h,1f,3,6,1,a,5,1n;33,f,1b,1,20,23,45,7,1k,1b,3,4,1h,2,26;34,h,i,3,8,8,3,a,5,6,3,4,1,3,1,2,18,1z,45,8,1b,1i,2,8,3,4,d,3,v,5,22;32,m,c,7,6,8,4,9,4,6,1,i,16,1v,47,7,q,3,i,25,9,b,p,4,21;32,r,2,3,2,6,5,c,2,7,5,6,2,a,1,8,14,1w,45,7,q,8,4,1,6,2,2,2p,o,7,1z;31,c,2,k,1,6,6,b,2,4,7,8,1,l,13,1v,44,7,q,9,4,1,3,7,2,2o,j,k,1q;32,9,3,t,9,7,2,4,7,w,2,1,y,1v,43,8,p,9,2,4,1,2z,5,2,d,l,1o;0,5,15,3,1s,3,8,r,b,1,4,7,7,11,y,1,1,1j,1,7,q,1,3d,8,l,b,2,35,4,14,1i,2;14,g,1w,t,e,8,6,16,s,5,1,1g,3,5,2f,2,2,3,1,1,1,6,1b,8,i,d,2,i,1,48,15;10,x,z,2,k,v,a,a,7,15,p,1t,2g,j,1j,3,e,b,3,4s,14;y,18,d,1,3,c,2,3,2,4,8,w,5,3,2,8,d,7,1,1,1,2,4,l,o,6,1,1l,2a,u,1h,8,6,c,2,4v,3,4,6,4,2,d,6;x,1f,4,z,4,j,1,9,6,6,3,8,2,1,7,8,5,1,2,1,2,i,q,2,4,1h,28,1,2,12,o,4,l,a,5,9,3,5a,4,h,1;0,3,o,2w,2,g,1,1,1,3,7,7,2,8,1,4,5,8,a,h,u,2,1,1f,29,1b,l,2,6,3,7,4,1,f,3,9,2,5,1,5p;0,6,l,2x,b,8,c,5,3,d,2,1,1,8,a,4,2,g,p,1d,2d,1,1,1e,9,5,7,1b,2,5v;0,9,l,34,2,o,1,f,2,b,8,5,1,2,1,i,l,16,2n,1g,6,5,3,1e,3,5v;0,a,m,34,1,1g,9,3,6,j,i,15,2o,1i,5,3,4,1e,3,5w;0,b,1,6,h,2b,2,24,h,5,1,i,g,13,2n,1j,7,1i,2,5z;0,k,7,6,3,25,1,3,3,3,1,1s,2,2,j,f,1,a,g,11,n,4,5,1,3,4,1k,17,3,9,2,7p;0,1,1,h,5,2j,5,1v,1,3,l,d,4,6,i,y,p,5,2,d,1h,19,a,7s;0,1,7,8,a,2g,3,1x,1,6,c,l,4,3,m,q,y,i,1f,j,7,j,5,1,5,7s;9,6,c,4e,2,9,7,q,r,n,x,k,1e,l,6,l,3,7y,1;d,1,o,42,3,a,8,3,5,h,q,n,11,e,1e,n,4,p,4,7t,3;i,2,i,3y,6,7,2,4,g,g,q,m,10,1,2,9,1e,1,1,m,4,8p,2;j,3,9,2,1,3f,1,l,a,2,c,2,c,7,1,6,r,k,2p,o,4,8s,1;u,44,f,3,m,8,3,1,t,i,2o,o,5,8t,1;t,2t,1,5,1,12,h,3,5,2,2,a,8,6,w,g,1y,1,n,p,7,7x,1,p,7;s,2u,4,13,q,2,3,c,d,2,u,f,2m,p,8,r,2,6u,1,7,2,l,b;s,2s,5,13,w,d,19,d,2n,p,8,i,3,7,1,6p,7,4,3,j,e;u,y,3,2w,x,h,17,b,2n,p,8,i,4,6v,8,2,3,j,g;q,3,1,p,2,7,1,1,4,2t,y,g,2,1,6,1,12,5,2b,1,c,r,2,1,4,8,5,5,1,6v,d,b,5,2,j;r,1,4,2,2,i,2,5,h,2l,y,g,8,3,3u,s,i,71,d,5,x;10,g,4,2,n,1n,2,t,x,h,8,4,3t,r,a,6o,4,2,1,2,1,1,5,7,a,7,1,1,v;10,2,2,d,v,2i,t,k,4,7,3b,1,h,8,3,3,2,8,9,2,1,7,1,6d,z,6,2,2,v;19,7,2,2,u,1v,1,k,u,v,33,2,1,5,i,5,6,b,a,2,2,6i,z,7,10;18,6,2,3,w,1w,1,j,v,u,35,7,o,1,2,a,3,2,6,1,3,6h,x,c,y;17,4,4,3,y,4,1,1q,1,j,2,2,s,u,32,9,m,3,3,9,3,2,5,4,1,6f,y,d,y;15,5,17,2m,o,u,33,7,l,5,4,9,8,6j,z,e,y;13,4,1b,2n,f,2,5,v,32,6,m,6,3,7,a,6i,z,g,x;z,6,1g,2n,i,x,30,a,j,4,2,3,1,3,d,6g,11,d,10;y,2,1l,2u,9,12,2u,4,2,7,k,8,4,1,c,6e,3,1,z,d,8,1,r;u,3,1p,2,2,2q,5,18,2q,6,1,8,j,3,2,2,a,3,3,4y,1,1g,4,1,z,d,10;2r,2p,5,18,2n,9,4,7,h,5,2,4,2,57,2,1k,2,3,5,1,p,a,13;q,1,1v,3,2,2p,6,19,2l,8,6,6,e,2,1,5j,1,1s,4,1,q,8,14;m,2,1z,2,3,1n,1,2,3,x,4,1a,2k,8,3,a,a,5o,2,1y,p,8,14;2o,1,4,1q,2,y,3,1a,2l,7,3,c,6,5o,2,20,p,5,s,1,e;b,1,2d,1,5,1p,2,v,6,1a,2i,8,4,c,6,7q,q,4,17;6,1,2p,2n,3,1a,2j,5,6,c,6,7r,q,3,18;2w,3w,2,3,2v,b,2,7p,2,3,q,2,19;2v,3,1,1n,1,23,3,3,2u,b,2,7q,3,4,o,1,1b;2w,3s,5,2,2u,4,a,52,1,2n,3,4,m,2,1c;2y,4,1,37,5,4,9,5,2z,1,3,7t,3,4,20;30,4,1,34,2,4,2,3,7,a,2v,7x,3,5,1z;32,3,1,30,2,8,a,b,2q,4,1,7x,3,2,22;32,21,5,17,b,c,2p,81,4,2,22;33,1x,a,15,a,d,2p,80,5,1,23;33,1v,4,2,6,14,j,1,2,3,2s,7v,6,2,22;34,21,2,3,1,15,6,1,e,1,2u,26,2,p,5,4r,7,3,21;34,3g,1,3,39,1t,2,7,5,n,7,16,1,e,1,34,8,1,23;34,23,3,2,3,2,2,15,3a,1q,6,4,5,m,9,15,1,3j,o,1,1o;34,22,3,4,7,t,1,8,3b,s,2,x,6,t,7,4s,9,2,a,1,1s;34,22,1,7,3,2,1,q,2,7,3e,s,3,1,1,t,8,3,5,j,8,4r,a,3,8,1,1t;34,21,2,6,4,p,5,4,3i,k,1,7,5,s,j,i,6,4r,b,5,4,1,1v;33,22,2,8,1,6,5,d,8,2,36,2,b,j,4,7,4,q,m,g,7,4p,c,8,1x;33,21,3,8,1,n,3f,p,3,4,7,7,5,n,o,f,8,4n,b,a,1x;33,22,2,w,3f,o,c,1,3,6,7,l,q,e,8,4f,2,3,c,8,20;33,22,2,9,4,j,3f,p,a,2,4,6,8,j,r,e,8,4c,j,1,4,2,21;33,2b,3,n,3e,o,b,2,5,8,7,h,8,8,b,f,7,1,2,48,k,2,26;34,2x,3h,m,e,1,7,8,5,m,1,d,6,h,b,47,l,2,25;33,2w,3j,k,e,4,8,8,3,b,1,4,3,16,5,3t,1,g,l,3,25;33,2t,3m,j,g,3,a,4,1,2,2,6,1,2,4,1c,5,3s,3,e,m,4,24;34,2s,3m,i,5,2,a,3,b,2,6,7,6,1b,8,3o,4,5,1,7,o,4,24;34,2r,3m,j,h,2,d,2,7,5,6,1b,7,3o,5,2,5,5,p,4,24;35,2p,3n,j,w,2,8,6,5,19,a,3j,7,1,7,7,m,4,25;36,2o,3o,h,r,1,2,4,8,8,3,1a,9,3m,d,7,m,3,26;37,2m,3p,h,q,6,b,5,7,18,9,3n,3,1,8,1,1,6,j,5,26;37,2l,3q,f,l,2,7,4,c,3,8,1b,7,3t,8,6,e,1,2,6,26;38,2k,3v,9,9,h,7,1,e,2,a,1b,1,3v,9,7,e,9,26;38,2k,3w,2,b,k,y,1,2,3,3,4,3,4r,b,6,d,9,27;39,2k,3v,2,8,o,1d,4p,d,6,a,1,2,a,26;3a,2h,3w,8,1,q,p,5,d,3,4,4n,e,6,6,g,27;3b,2g,3w,z,17,2,5,4n,d,4,7,f,2a;3d,2c,3x,z,1e,4q,l,c,2e;3f,28,3y,11,1d,4q,k,1,3,4,1,2,2g;3h,25,3x,14,1b,4s,a,2,5,5,1,2,2l;3h,24,3x,1b,d,4,o,4s,h,5,1,1,2m;3i,21,3y,1e,9,8,l,4u,h,3,2p;3i,20,3y,1f,9,a,j,4v,g,3,2p;3j,3,3,1s,3z,1i,6,g,4,5,2,4x,h,1,2q;3k,3,3,1r,3z,1l,3,5n,39;3k,3,3,1c,2,1,3,a,3y,7b,39;3k,4,3,1a,8,2,2,5,3y,39,3,40,38;3m,3,2,z,8,4,c,4,3x,39,5,3z,38;3n,3,2,x,p,5,3v,3b,5,3x,39;3o,3,2,u,r,5,3j,2,8,3d,5,3x,39;3m,5,3,s,s,5,3r,2l,1,1,2,r,5,3v,3a;3n,5,3,q,u,5,3p,2n,3,s,6,3s,3b;3p,4,3,p,u,5,3o,2o,4,s,7,5,2,3i,3c;3r,3,3,p,u,4,3n,2q,4,s,b,1,1,3i,3c;3r,3,3,p,v,3,3n,2q,4,s,1,1,8,2,2,3g,3d;3r,3,5,m,x,1,3n,2s,4,t,7,3,7,b,2,2y,4,1,38;3s,3,5,l,12,2,3h,2s,4,t,6,4,l,2w,3,3,38;3t,3,5,k,13,1,3g,2u,4,t,1,1,2,6,k,2u,5,3,38;3u,3,5,j,13,1,3f,2v,6,14,i,2s,5,3,39;3v,2,6,i,u,2,3n,2v,6,15,j,2p,6,3,39;44,h,r,9,3i,2x,6,15,j,2m,8,2,3a;44,h,q,3,2,8,3e,30,4,16,i,18,1,18,e,1,3a;45,g,q,1,2,1,5,6,3c,30,4,15,k,14,5,16,3q;45,g,f,7,g,5,5,1,34,31,3,14,m,4,1,t,a,v,4,3,3u;1b,1,2t,h,d,7,h,7,38,31,4,13,n,2,3,s,a,u,5,2,3v;1c,1,2s,i,c,6,k,7,37,30,5,10,t,t,b,s,7,1,3v;1c,2,2r,i,b,7,s,7,2z,30,6,z,t,r,f,p,6,4,3u;1c,2,2s,i,a,7,t,7,2y,30,7,y,t,p,h,p,5,4,3v;48,i,5,1,1,8,t,9,2w,31,6,w,w,n,j,o,5,4,3v;49,v,j,4,4,9,2,1,2,4,2r,31,6,u,x,m,l,o,5,2,l,4,37;4c,s,l,1,b,1,32,32,6,r,z,l,m,o,s,4,37;4e,q,3z,33,6,r,z,k,n,p,r,4,37;4g,o,3z,34,6,n,12,j,o,q,p,5,37;4j,k,1h,1,2i,34,6,k,16,h,o,4,3,l,o,4,38;4m,2,5,j,3r,34,6,k,16,f,s,1,4,m,n,3,39;4u,j,3p,36,5,i,19,c,z,n,m,3,39;4v,j,3n,39,4,e,1c,c,z,n,m,4,38;4w,i,3o,39,3,c,1f,c,z,n,m,5,36;4z,e,3p,3a,2,9,1i,c,z,n,n,1,1,5,33;52,b,3p,3b,1,6,1l,c,10,3,2,h,m,2,3,2,34;55,8,3p,3c,1,3,h,2,15,b,o,1,b,3,2,h,m,2,4,1,34;56,7,n,2,31,3c,k,1,16,a,p,1,b,3,4,f,n,1,3,2,1,2,31;57,1,1,4,l,3,2,2,2z,3a,f,2,1c,9,p,1,b,3,6,d,p,1,4,2,31;58,5,j,5,1,5,2y,3a,9,6,1d,9,11,2,7,c,q,2,3,2,31;58,5,g,f,8,3,2,1,2k,3a,3,b,1e,8,11,2,8,9,m,2,4,4,1,1,32;58,6,f,k,1,5,2,1,2l,3n,1e,7,12,2,a,5,o,1,6,3,1,2,31;59,6,e,7,2,k,2m,3m,1e,6,2,1,10,2,b,3,o,1,7,4,33;5c,4,3,5,4,u,2n,3l,1f,5,2,2,z,3,9,3,o,1,8,2,4,1,30;5c,9,1,3,1,w,2n,3k,1g,4,3,2,y,4,9,2,o,1,d,4,2z;5e,6,3,12,2l,3j,1h,2,3,4,x,5,19,7,2z;5h,3,3,14,2j,3i,1n,5,y,3,17,9,2z;5i,1,5,13,2k,3g,1o,5,z,2,17,1,3,5,2z;5p,13,2l,3e,1p,4,z,4,u,2,d,3,1,1,2z;5p,15,2k,r,4,2h,1q,3,11,5,r,4,c,4,30;5p,1c,2f,m,8,2g,2v,5,q,5,d,1,31;5p,1e,2e,i,c,2e,2l,5,6,6,o,8,3d;5p,1f,2e,5,8,1,f,2d,2n,5,5,6,m,8,3f;5p,1g,37,2,4,26,2o,5,4,6,l,9,3f;5p,1h,3b,1,1,24,2q,5,4,5,9,1,a,8,3h;5p,1h,3b,1,1,23,2s,6,2,5,j,9,3h;5o,1j,3c,22,2u,5,3,4,g,d,3g;5n,1k,3c,21,2w,7,1,4,e,e,k,1,2v;5m,1m,3b,1z,2z,7,1,4,9,3,1,e,j,1,2w;5m,1m,3b,1y,2x,2,1,8,2,2,9,k,4,1,6,1,5,3,2u;5k,1o,3b,1w,30,1,2,8,c,i,1,1,2,a,5,2,2v;5k,1p,3a,1v,34,a,a,h,4,2,5,2,7,1,2w;4x,1,l,1s,37,1a,4,h,36,8,2,1,8,h,4,1,e,2,5,2,2p;4x,1,1,1,j,1s,1,3,33,1a,4,h,37,7,b,h,4,2,3,3,8,1,5,1,1,5,3,1,2g;5i,1z,31,1a,4,g,35,1,3,8,a,f,4,9,e,8,2j;5i,21,2z,1a,3,g,37,1,2,8,1,2,8,d,5,6,5,1,5,1,4,1,3,4,4,1,1,3,2b;5i,21,30,19,3,f,3c,b,7,d,5,6,k,5,4,7,d,1,1u;5j,26,1,2,2s,1p,3b,1,1,c,1,2,3,d,5,6,d,2,5,6,2,b,25;5j,2b,2r,1n,3f,9,b,a,4,4,1,3,7,2,2,6,3,5,1,f,h,1,1k;5i,2d,2r,1m,3g,8,h,4,6,2,1,3,8,1,7,1,3,2,1,l,1z;5h,2f,2r,1k,3i,7,r,2,2,3,n,l,d,3,1i;5h,2h,2p,z,1,k,3j,6,r,2,2,3,q,k,b,3,1i;5i,2j,2n,1i,1,1,3k,4,r,2,3,2,t,h,a,2,1k;5i,2k,2m,z,1,i,3n,1,1,1,r,1,s,2,6,i,2,7,6,2,1d;5i,2k,2n,1i,3o,6,1f,2,7,j,3,2,9,2,1c;5k,2i,2n,y,2,i,3o,8,2,3,18,1,8,j,f,1,1,1,1a;5k,2j,2n,y,1,i,3q,e,10,1,d,h,k,1,19;5l,2i,2n,1h,3s,e,n,1,9,1,d,k,l,1,16;5m,2g,2o,z,1,h,3y,a,1,1,2,3,2,2,3,2,1,2,p,4,1,7,5,5,h,2,2,2,14;5m,2g,2o,1h,47,1,1,6,1,6,5,4,r,6,6,4,o,1,12;5n,2f,2o,1h,4p,4,u,4,8,5,1,1,i,2,1,1,11;5n,2e,2p,1i,4e,3,6,3,19,5,1,1,h,3,12;5o,2c,2r,1i,4f,1,6,2,1b,5,m,1,10;5o,2b,2s,1i,4l,1,24,2,z;5p,29,2t,1i,50,2,1,1,j,2,22;5p,28,2u,16,1,b,5,1,4t,3,2,3,g,2,22;5q,27,2u,15,1,c,h,1,4j,c,9,4,21;5r,25,2u,1j,h,2,4h,d,9,4,21;5r,24,2u,1k,g,3,4g,d,a,4,21;f,2,5a,23,2v,18,1,b,f,4,4f,d,1,1,9,4,21;5r,23,2u,1m,d,6,47,4,3,d,1,1,9,6,1z;5s,22,2u,1m,d,6,45,8,1,c,c,7,17,1,q;5t,21,2u,1m,b,8,44,n,b,8,16,2,p;5v,9,2,1o,2u,1l,a,a,44,p,9,8,1x;5w,1y,2t,1l,9,b,43,t,6,9,17,2,n,1;5z,1v,2t,1k,9,c,41,1,1,v,4,a,1t,3;60,1u,2t,1i,b,b,41,z,3,a,1w;61,1t,2t,1g,d,b,41,1c,1r,2,3;63,1q,2v,1e,e,b,41,1d,1q,2,3;63,1q,2v,1d,f,b,40,1e,19,1,l;63,1q,2w,1a,h,a,41,1f,1u;63,1p,2y,18,j,9,3z,1j,1s;63,1p,2y,18,i,a,h,1,3c,1q,u,1,v;63,1o,30,17,i,9,3s,1t,v,2,3,1,p;64,1m,31,17,h,a,d,2,3b,1w,v,2,s;63,1n,32,17,g,a,3o,1y,w,2,r;63,1m,33,17,f,a,3n,22,w,1,q;63,1l,35,16,f,a,3n,23,1m;63,1g,3a,16,g,9,3n,23,1m;63,1f,3b,16,g,8,3o,24,1l;63,1c,3e,16,g,8,3o,25,1k;63,1a,3g,15,i,7,3o,26,1j;63,19,3h,12,l,5,3q,28,1h;62,19,3j,10,4i,26,1i;62,19,3j,10,4g,28,1i;62,19,3j,10,4h,27,1i;62,19,3j,10,4i,27,1h;62,19,3k,y,4j,27,1h;61,1a,3l,x,4j,1a,1,w,1h;61,19,3n,w,4k,19,1,w,1h;61,18,3p,t,4n,25,1h;61,17,3q,s,4o,25,1h;61,17,3q,s,4o,25,1h;60,15,1,1,3s,q,4p,1d,1,q,1i;60,16,3t,p,4r,23,1i;61,13,3w,n,4s,s,4,17,1i;61,13,3w,m,4t,p,a,13,1j;61,12,3x,l,4u,k,h,11,1j;60,13,3x,j,4w,h,l,6,1,r,1l;60,12,3z,h,4w,i,m,4,1,s,1l;60,11,40,7,5,1,50,9,v,3,2,r,1m;60,s,2,6,43,2,5b,5,y,1,3,1,1,p,18,1,d;5z,v,as,1,2,o,19,3,b;5y,w,ar,3,2,n,1a,2,b;5y,w,ax,l,1c,2,a;5y,x,aw,l,1d,1,1,1,8;5x,x,ax,l,1d,3,8;5x,w,az,j,1e,5,1,2,3;5x,w,b1,7,1,5,1i,8,3;5x,t,b8,2,3,3,1j,7,4;5x,n,d3,8,5;5x,n,d5,5,6;5w,n,bp,1,1h,4,6;5w,o,bh,2,4,1,1c,2,4,3,7;5w,i,2,2,bj,8,1b,5,1,2,8;5w,i,bo,7,1a,6,b;5v,2,1,j,bl,6,1a,6,c;5v,2,1,j,bm,5,1a,5,d;5v,2,1,h,bo,4,19,6,e;5y,g,d0,8,e;5v,j,cy,7,h;5v,i,cy,8,h;5v,g,cz,8,i;5u,f,d0,9,i;5t,g,d1,6,k;5u,g,d1,1,o;5v,i,cy,1,o;5v,i,dn;5t,j,do;5t,h,dq;5t,g,7k,4,63;5t,g,dr;5t,1,1,c,dt;5u,c,du;5u,c,k,1,d9;5u,1,1,a,h,5,d8;5u,1,1,b,f,1,2,1,da;5w,b,dt;5w,6,1,5,ds;5x,6,1,5,dr;60,b,1m,3,c0;61,d,1l,1,c0;64,6,dq;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;k0;6m,1,dd;6s,2,1,2,d3;6o,5,d7;6j,1,2,8,d6;6g,7,dd;6g,5,df;6c,1,2,5,91,1,n,2,3p;6c,a,67,c,28,1,8,a,9,8,v,8,1,4,1,1,2d;67,2,2,5,6d,d,1l,1,3,17,1,c,d,a,5,p,24;66,8,67,1,3,l,1d,3e,1z;66,1,2,4,64,1b,2,1,n,3n,1v;6a,4,5z,1j,h,3t,1u;62,1,6,8,5c,3,c,1o,g,4a,1e;60,5,4,9,1,1,59,5,9,1o,e,4l,16;5t,2,4,7,1,d,4b,2,x,a,2,1o,9,2,2,4p,14;5t,2,6,5,1,d,39,1,8,1,5,1,9,2,5,9,3,1,5,1,8,2,5,25,9,4x,2,2,y;5s,5,5,5,1,d,1,1,2x,5,5,1,a,y,3,8,5,2b,5,50,1,b,p;5x,b,1,d,2q,1,2,3,2,8,1,3,1,1,2,3t,6,5f,m;4f,1,2,2,2,1,16,f,1,d,2q,4g,5,5l,i;4c,d,16,1,2,9,3,d,2q,4e,4,5l,k;49,2,m,2,2,2,q,1,5,1,8,f,2g,1,4,4i,2,5o,k;2x,3,1a,w,1,2,8,5,6,3,1,1,4,n,2g,a7,3,1,l;2y,6,2,5,2,1,w,2c,28,1,8,a5,s;2o,1,7,1,4,3,2,4,7,2,3,3,3,3,i,29,28,1,6,3,1,a1,u;2g,4,1,6,2,w,2,4,k,25,2g,a2,1,1,w;28,26,2,22,2h,a2,z;1w,4j,27,ag,y;1q,4j,25,ao,y;1n,1,1,2,2,3x,5,9,26,as,y;17,a,9,5,1,3w,2c,az,6,2,p;17,4r,1e,5,l,b2,5,2,1,2,m;19,4f,5,2,e,1,z,b,g,b9,r;x,3,b,44,2,8,e,6,y,e,e,b6,4,1,q;v,9,f,3z,1,8,9,6,1,3,x,f,e,2,1,6,2,an,12;z,7,k,42,9,3,6,3,9,2,h,h,l,6,2,ai,13;1n,45,j,1,8,5,b,l,p,an,13;1p,45,1,2,2,5,a,2,2,6,b,b,q,ay,12;x,3,b,50,1e,b9,12;1f,52,15,bf,z;1g,4y,1,5,1,1,c,i,3,bk,x;1e,56,9,ch,q;g,f,2,2,a,5d,4,cn,n;n,j3,a;0,4,r,j5;0,t,5,3,1,iy;0,k0;0,k0;0,k0;0,k0;0,k0;0,k0;0,k0;0,k0;0,k0;0,k0';
  var _issLandMask = null;
  function issLandMask() {
    if (_issLandMask) return _issLandMask;
    var bits = new Uint8Array(ISS_LAND_W * ISS_LAND_H);
    var rows = ISS_LAND_RLE.split(';');
    for (var r = 0; r < ISS_LAND_H; r++) {
      var c = 0, v = 0, runs = rows[r].split(',');
      for (var k = 0; k < runs.length; k++) {
        var n = parseInt(runs[k], 36);
        if (v) bits.fill(1, r * ISS_LAND_W + c, r * ISS_LAND_W + c + n);
        c += n; v = 1 - v;
      }
    }
    _issLandMask = bits;
    return bits;
  }
  function issIsLand(lat, lon) {
    var mask = issLandMask();
    var row = Math.floor((90 - lat) / 180 * ISS_LAND_H);
    if (row < 0) row = 0; else if (row > ISS_LAND_H - 1) row = ISS_LAND_H - 1;
    var col = Math.floor(((lon + 180) % 360 + 360) % 360 / 360 * ISS_LAND_W);
    if (col > ISS_LAND_W - 1) col = ISS_LAND_W - 1;
    return mask[row * ISS_LAND_W + col] === 1;
  }

  // The same land mask, downsampled into horizontal runs so a flat map can be
  // drawn as a few hundred SVG rects. No canvas involved, so this works in
  // jsdom and in the Orbit Lab's static SVG, and the coastlines under the
  // ground track are the same real ones the 3-D globe uses.
  var _issLandRuns = {};
  function issLandRuns(cols, rows) {
    var key = cols + 'x' + rows;
    if (_issLandRuns[key]) return _issLandRuns[key];
    var mask = issLandMask();
    var fx = ISS_LAND_W / cols, fy = ISS_LAND_H / rows;
    var runs = [];
    for (var y = 0; y < rows; y++) {
      var open = -1;
      for (var x = 0; x < cols; x++) {
        // A cell counts as land if any of the finer cells under it are land, so
        // islands survive the downsample instead of being averaged away.
        var land = 0;
        for (var sy = Math.floor(y * fy); sy < Math.floor((y + 1) * fy) && !land; sy++) {
          for (var sx = Math.floor(x * fx); sx < Math.floor((x + 1) * fx); sx++) {
            if (mask[sy * ISS_LAND_W + sx]) { land = 1; break; }
          }
        }
        if (land && open < 0) open = x;
        else if (!land && open >= 0) { runs.push([open, y, x - open]); open = -1; }
      }
      if (open >= 0) runs.push([open, y, cols - open]);
    }
    _issLandRuns[key] = runs;
    return runs;
  }

  // The runs collapsed into a single SVG path, cached by geometry. Built once
  // per layout and reused across renders, so dragging a slider re-uses the
  // string instead of rebuilding a few hundred subpaths.
  var _issLandPath = {};
  function issLandPath(cols, rows, x0, y0, cellW, cellH) {
    var key = [cols, rows, x0, y0, cellW.toFixed(3), cellH.toFixed(3)].join('|');
    if (_issLandPath[key]) return _issLandPath[key];
    var runs = issLandRuns(cols, rows);
    var w2 = (cellH + 0.4).toFixed(2);
    var parts = [];
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      var x = (x0 + run[0] * cellW).toFixed(2);
      var y = (y0 + run[1] * cellH).toFixed(2);
      var w = (run[2] * cellW + 0.4).toFixed(2);
      parts.push('M' + x + ' ' + y + 'h' + w + 'v' + w2 + 'h-' + w + 'z');
    }
    var d = parts.join('');
    _issLandPath[key] = d;
    return d;
  }

  // What share of Earth's LAND lies inside a given band of latitude. Computed
  // from the mask rather than quoted, with each row weighted by cos(lat)
  // because equal-angle rows are not equal-area on a sphere.
  //
  // The per-row areas are built ONCE. The obvious version rescanned all 259,200
  // mask cells on every call, and the inclination slider steps every 0.1° — a
  // drag from 0 to 90 would have rescanned the planet 900 times, which is a
  // quarter of a billion iterations in front of a student on a Chromebook.
  // Row areas do not depend on the query, so the band sum is a prefix lookup.
  var _issRowArea = null, _issRowPrefix = null, _issLandTotal = 0;
  function issLandRowAreas() {
    if (_issRowArea) return;
    var mask = issLandMask();
    _issRowArea = new Float64Array(ISS_LAND_H);
    _issRowPrefix = new Float64Array(ISS_LAND_H + 1);
    for (var row = 0; row < ISS_LAND_H; row++) {
      var lat = 90 - 180 * (row + 0.5) / ISS_LAND_H;
      var count = 0;
      for (var col = 0; col < ISS_LAND_W; col++) if (mask[row * ISS_LAND_W + col]) count++;
      _issRowArea[row] = count * Math.cos(lat * Math.PI / 180);
      _issRowPrefix[row + 1] = _issRowPrefix[row] + _issRowArea[row];
    }
    _issLandTotal = _issRowPrefix[ISS_LAND_H];
  }
  function issLandShareWithin(absLat) {
    issLandRowAreas();
    if (_issLandTotal <= 0) return 0;
    // Rows run north to south, so the band |lat| <= absLat is one contiguous
    // slice and its area is the difference of two prefix sums. The -0.5 is the
    // row CENTRE, matching the per-row latitude used to build the areas — drop
    // it and the band gains or loses a row at each edge.
    var first = Math.ceil((90 - absLat) / 180 * ISS_LAND_H - 0.5);
    var lastExclusive = Math.floor((90 + absLat) / 180 * ISS_LAND_H - 0.5) + 1;
    if (first < 0) first = 0;
    if (lastExclusive > ISS_LAND_H) lastExclusive = ISS_LAND_H;
    if (lastExclusive <= first) return 0;
    return (_issRowPrefix[lastExclusive] - _issRowPrefix[first]) / _issLandTotal;
  }

  // Deterministic value noise. NOT Math.random: the 3-D view is covered by a
  // WebGL smoke test that compares two mounts pixel-for-pixel, and a texture
  // that differs per mount would either fail that test or (worse) hide a real
  // regression behind noise. `period` wraps the integer lattice in x so the
  // pattern joins seamlessly at the ±180° seam instead of showing a Pacific
  // scar down the middle of the globe.
  function issNoise2(x, y, period) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    function hash(a, b) {
      if (period) a = ((a % period) + period) % period;
      var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return n - Math.floor(n);
    }
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a0 = hash(xi, yi), a1 = hash(xi + 1, yi), b0 = hash(xi, yi + 1), b1 = hash(xi + 1, yi + 1);
    return (a0 * (1 - u) + a1 * u) * (1 - v) + (b0 * (1 - u) + b1 * u) * v;
  }
  function issFbm(x, y, period, octaves) {
    var sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      sum += amp * issNoise2(x * freq, y * freq, period ? period * freq : 0);
      norm += amp; freq *= 2; amp *= 0.5;
    }
    return sum / norm;
  }

  // Real metro coordinates. The 46 with populations come from this Lab's own
  // curated world database in stem_tool_flightsim.js; the rest are large metros
  // added for coverage so whole continents are not dark. [lat, lon, millions]
  var ISS_CITY_LIGHTS = [
    [38.9, -77.0, 0.7], [45.4, -75.7, 1.0], [19.4, -99.1, 21.8], [40.7, -74.0, 8.3],
    [34.1, -118.2, 3.9], [41.9, -87.6, 2.7], [43.7, -79.4, 2.9], [23.1, -82.4, 2.1],
    [-15.8, -47.9, 3.0], [-34.6, -58.4, 15.2], [-12.0, -77.0, 10.7], [4.7, -74.1, 7.4],
    [51.5, -0.1, 8.9], [48.9, 2.4, 2.2], [52.5, 13.4, 3.6], [41.9, 12.5, 2.9],
    [40.4, -3.7, 3.2], [55.8, 37.6, 12.5], [38.0, 23.7, 0.7], [64.1, -21.9, 0.1],
    [30.0, 31.2, 20.9], [-1.3, 36.8, 4.4], [6.5, 3.4, 15.4], [-33.9, 18.4, 4.6],
    [9.0, 38.7, 3.4], [35.7, 139.7, 13.9], [39.9, 116.4, 21.5], [28.6, 77.2, 16.8],
    [37.6, 127.0, 9.7], [13.8, 100.5, 10.5], [25.2, 55.3, 3.4], [31.8, 35.2, 0.9],
    [-35.3, 149.1, 0.5], [-41.3, 174.8, 0.2], [-33.9, 151.2, 5.3], [37.8, -122.4, 0.9],
    [43.7, -70.3, 0.1], [39.7, -105.0, 0.7], [21.3, -157.9, 0.4], [61.2, -149.9, 0.3],
    [38.7, -9.1, 0.5], [59.3, 18.1, 1.0], [1.4, 103.8, 5.5], [19.1, 72.9, 20.7],
    [31.2, 121.5, 24.9], [-22.9, -43.2, 6.7],
    [-6.2, 106.8, 10.6], [14.6, 121.0, 13.5], [24.9, 67.0, 16.1], [23.8, 90.4, 10.2],
    [41.0, 28.9, 15.5], [35.7, 51.4, 9.0], [-4.4, 15.3, 15.0], [-26.2, 28.0, 5.6],
    [-33.4, -70.7, 6.8], [12.97, 77.6, 13.2], [23.1, 113.3, 18.7], [34.7, 135.5, 2.7],
    [22.3, 114.2, 7.5], [3.1, 101.7, 8.0], [24.7, 46.7, 7.6], [33.3, 44.4, 7.5],
    [33.6, -7.6, 3.7], [29.8, -95.4, 2.3], [25.8, -80.2, 0.4], [47.6, -122.3, 0.8],
    [45.5, -73.6, 1.8], [49.3, -123.1, 0.7], [50.4, 30.5, 3.0], [52.2, 21.0, 1.8],
    [48.2, 16.4, 2.0], [52.4, 4.9, 0.9], [41.4, 2.2, 1.6], [53.5, -2.2, 0.6],
    [53.3, -6.3, 0.6], [59.9, 10.8, 0.7], [60.2, 24.9, 0.7], [-31.95, 115.9, 2.1],
    [-36.85, 174.8, 1.7], [-23.55, -46.6, 22.4], [10.5, -66.9, 2.9], [6.8, -58.2, 0.2],
    [-16.5, -68.1, 0.9], [15.6, 32.5, 5.8], [36.8, 3.1, 3.4], [14.7, -17.5, 3.1],
    [-8.8, 13.2, 8.3], [-25.9, 32.6, 1.1], [5.6, -0.2, 2.5], [-6.8, 39.3, 7.0],
    [43.1, 131.9, 0.6], [55.0, 82.9, 1.6], [56.8, 60.6, 1.5], [69.7, 18.9, 0.08],
    [64.8, -147.7, 0.03], [-54.8, -68.3, 0.08]
  ];

  // Painted once per quality tier and reused across mounts: the pixel loops are
  // the most expensive thing in the whole tool's startup, and remounting a tab
  // must not pay for them twice.
  var _issEarthCanvases = {};
  function issEarthCanvases(size) {
    var key = String(size);
    if (_issEarthCanvases[key]) return _issEarthCanvases[key];
    var W = size, H = size / 2;
    function make(w, h) {
      var cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      return cvs;
    }
    var dayC = make(W, H), specC = make(W, H), cloudC = make(W, H), nightC = make(W, H);
    var dayCtx = dayC.getContext && dayC.getContext('2d');
    var specCtx = specC.getContext && specC.getContext('2d');
    var cloudCtx = cloudC.getContext && cloudC.getContext('2d');
    var nightCtx = nightC.getContext && nightC.getContext('2d');
    if (!dayCtx || !specCtx || !cloudCtx || !nightCtx) return null;

    var mask = issLandMask();
    function landAt(mx, my) {
      if (my < 0 || my > ISS_LAND_H - 1) return 0;
      var col = ((mx % ISS_LAND_W) + ISS_LAND_W) % ISS_LAND_W;
      return mask[my * ISS_LAND_W + col];
    }
    var dayImg = dayCtx.createImageData(W, H), dayPix = dayImg.data;
    var specImg = specCtx.createImageData(W, H), specPix = specImg.data;
    var cloudImg = cloudCtx.createImageData(W, H), cloudPix = cloudImg.data;
    for (var y = 0; y < H; y++) {
      var lat = 90 - 180 * (y + 0.5) / H;
      var absLat = Math.abs(lat);
      var my = Math.floor((90 - lat) / 180 * ISS_LAND_H);
      // Cloud climatology, as bands rather than blobs: a wet band on the
      // equator (the ITCZ), the dry subtropical highs either side of it, and
      // the mid-latitude storm tracks. Real, first-order, and the reason the
      // Sahara and the Amazon sit at the latitudes they do.
      var itcz = Math.exp(-Math.pow((lat - 4) / 8, 2)) * 0.42;
      var storm = Math.exp(-Math.pow((absLat - 54) / 16, 2)) * 0.38;
      var dry = -Math.exp(-Math.pow((absLat - 25) / 10, 2)) * 0.3;
      for (var x = 0; x < W; x++) {
        var lon = -180 + 360 * (x + 0.5) / W;
        var mx = Math.floor((lon + 180) / 360 * ISS_LAND_W);
        var isLand = landAt(mx, my) === 1;
        var i4 = (y * W + x) * 4;
        var r, g, b, spec;
        // Grain fields sampled in degrees so they stay the same size whichever
        // texture tier is being painted.
        var grain = issFbm(lon / 6, lat / 6, 60, 4);
        var broad = issFbm(lon / 26, lat / 26, 14, 3);
        if (isLand) {
          // Coast test: a cell touching water gets a lighter, sandier edge.
          var coast = (landAt(mx - 1, my) && landAt(mx + 1, my) && landAt(mx, my - 1) && landAt(mx, my + 1)) ? 0 : 1;
          var green = [62, 88, 54], arid = [176, 152, 100], boreal = [86, 100, 78], ice = [232, 240, 246];
          // Aridity: the subtropical belt, blotched by the broad noise field so
          // it reads as terrain rather than as a painted stripe.
          var aridW = Math.max(0, Math.min(1, (Math.exp(-Math.pow((absLat - 24) / 11, 2)) * 1.5 + broad - 0.72) * 2.6));
          var borealW = Math.max(0, Math.min(1, (absLat - 48) / 14));
          var iceW = 0;
          if (lat < -63) iceW = 1;                                             // Antarctic ice sheet
          else if (lat > 60 && lon > -58 && lon < -20) iceW = 1;               // Greenland ice sheet
          else if (absLat > 74) iceW = 0.8;
          r = green[0]; g = green[1]; b = green[2];
          r += (arid[0] - r) * aridW; g += (arid[1] - g) * aridW; b += (arid[2] - b) * aridW;
          r += (boreal[0] - r) * borealW; g += (boreal[1] - g) * borealW; b += (boreal[2] - b) * borealW;
          r += (ice[0] - r) * iceW; g += (ice[1] - g) * iceW; b += (ice[2] - b) * iceW;
          var relief = 0.82 + 0.36 * grain;
          r *= relief; g *= relief; b *= relief;
          if (coast) { r = r * 0.72 + 196 * 0.28; g = g * 0.72 + 180 * 0.28; b = b * 0.72 + 140 * 0.28; }
          spec = 14 + 26 * iceW;                                               // land is matte; ice is not
        } else {
          // Shelf water is lighter than deep ocean — the two-ring test is a
          // cheap stand-in for depth and it is what makes coastlines read.
          var near = 0;
          if (landAt(mx - 1, my) || landAt(mx + 1, my) || landAt(mx, my - 1) || landAt(mx, my + 1)) near = 1;
          else if (landAt(mx - 3, my) || landAt(mx + 3, my) || landAt(mx, my - 3) || landAt(mx, my + 3)) near = 0.5;
          var deep = [4, 30, 96], shelf = [16, 92, 176];
          r = deep[0] + (shelf[0] - deep[0]) * near;
          g = deep[1] + (shelf[1] - deep[1]) * near;
          b = deep[2] + (shelf[2] - deep[2]) * near;
          var swirl = 0.9 + 0.2 * broad;
          r *= swirl; g *= swirl; b *= swirl;
          // Sea ice: the Arctic Ocean cap and the Antarctic pack.
          var seaIce = Math.max(0, Math.min(1, (absLat - (lat > 0 ? 72 : 62)) / 6));
          r += (226 - r) * seaIce; g += (238 - g) * seaIce; b += (246 - b) * seaIce;
          spec = 80 - 48 * seaIce;                                           // open water carries the sun-glint
        }
        // ALBEDO, not screen colour. The scene stacks a 1.65 sun on a hemisphere
        // light, an ambient and a rim light, so anything painted at full value
        // here comes back off the GPU as pure white and every coastline is lost.
        // The planet is painted dark and lit bright, which is also the physically
        // sensible way round: Earth's real albedo is about 0.3.
        dayPix[i4] = Math.max(0, Math.min(255, r * 0.30));
        dayPix[i4 + 1] = Math.max(0, Math.min(255, g * 0.30));
        dayPix[i4 + 2] = Math.max(0, Math.min(255, b * 0.30));
        dayPix[i4 + 3] = 255;
        specPix[i4] = specPix[i4 + 1] = specPix[i4 + 2] = spec; specPix[i4 + 3] = 255;
        // Clouds are stretched east-west because the winds that shape them are
        // zonal: the x sample runs at a third of the y frequency.
        var cloudN = issFbm(lon / 15, lat / 5, 24, 5);
        var cover = Math.max(0, Math.min(1, (cloudN + itcz + storm + dry - 0.66) * 2.3));
        var cloudV = Math.round(255 * cover * cover * (3 - 2 * cover));
        cloudPix[i4] = cloudPix[i4 + 1] = cloudPix[i4 + 2] = cloudV; cloudPix[i4 + 3] = 255;
      }
    }
    dayCtx.putImageData(dayImg, 0, 0);
    specCtx.putImageData(specImg, 0, 0);
    cloudCtx.putImageData(cloudImg, 0, 0);

    // Night lights: real coordinates, radius and brightness from metro size.
    // Stamped straight into an ImageData rather than drawn with radial
    // gradients under 'lighter' compositing. The gradient version painted a
    // canvas that looked right to getImageData and toDataURL and still uploaded
    // as an all-black texture — one putImageData, like the other three maps,
    // removes the whole question.
    var nightImg = nightCtx.createImageData(W, H), nightPix = nightImg.data;
    for (var np = 0; np < nightPix.length; np += 4) { nightPix[np + 3] = 255; }
    for (var ci = 0; ci < ISS_CITY_LIGHTS.length; ci++) {
      var city = ISS_CITY_LIGHTS[ci];
      var cx = (city[1] + 180) / 360 * W;
      var cy = (90 - city[0]) / 180 * H;
      var pop = city[2];
      var rad = Math.max(3, Math.min(34, (3.6 + Math.log(1 + pop) * 4.8) * (W / 1024)));
      var peak = Math.max(0.45, Math.min(1, 0.4 + Math.log(1 + pop) * 0.24));
      var x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad);
      var y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
      for (var ly = y0; ly <= y1; ly++) {
        for (var lx = x0; lx <= x1; lx++) {
          var dx = lx - cx, dy = ly - cy;
          var dist = Math.sqrt(dx * dx + dy * dy) / rad;
          if (dist >= 1) continue;
          // Bright core, fast falloff: a metro is a small blaze in a wide glow.
          var fall = (1 - dist) * (1 - dist);
          var v = peak * (fall * 0.55 + Math.pow(1 - dist, 7) * 0.85);
          // Wrap x so a city near ±180° is not clipped at the seam.
          var wx = ((lx % W) + W) % W;
          var ni = (ly * W + wx) * 4;
          nightPix[ni] = Math.min(255, nightPix[ni] + v * 255);
          nightPix[ni + 1] = Math.min(255, nightPix[ni + 1] + v * 226);
          nightPix[ni + 2] = Math.min(255, nightPix[ni + 2] + v * 152);
        }
      }
    }
    nightCtx.putImageData(nightImg, 0, 0);

    var built = { day: dayC, spec: specC, cloud: cloudC, night: nightC };
    _issEarthCanvases[key] = built;
    return built;
  }

  // A soft additive disc for the Sun and for the docking-port capture flash.
  var _issGlowCanvas = null;
  function issGlowCanvas() {
    if (_issGlowCanvas) return _issGlowCanvas;
    var cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 128;
    var g2d = cvs.getContext && cvs.getContext('2d');
    if (!g2d) return null;
    var grad = g2d.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.12, 'rgba(255,247,220,0.95)');
    grad.addColorStop(0.32, 'rgba(255,214,140,0.42)');
    grad.addColorStop(0.62, 'rgba(255,178,96,0.12)');
    grad.addColorStop(1, 'rgba(255,160,80,0)');
    g2d.fillStyle = grad;
    g2d.fillRect(0, 0, 128, 128);
    _issGlowCanvas = cvs;
    return cvs;
  }

  window.StemLab.registerTool('spaceStation', {
    icon: '🛰️',
    label: 'Space Station',
    desc: 'Float through the International Space Station and work a crew shift: run research, troubleshoot life support, practice low-g movement, explore a clickable 3-D map, and learn the engineering behind life in orbit. NGSS MS-ETS1 in Earth’s strangest laboratory.',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'iss_module', label: 'Inspect 3 station modules in the 3-D map', icon: '🛰️', check: function (d) { var s = (d && d.spaceStation) || {}; return Object.keys(s.seenModules || {}).length >= 3; } },
      { id: 'iss_day', label: 'Walk through an astronaut’s whole day', icon: '👩‍🚀', check: function (d) { var s = (d && d.spaceStation) || {}; return Object.keys(s.seenHours || {}).length >= 6; } },
      { id: 'iss_inside', label: 'Complete 3 jobs inside the station', icon: '🧑‍🔬', check: function (d) { var s = (d && d.spaceStation) || {}; return Object.keys(s.interiorDone || {}).filter(function (k) { return !!s.interiorDone[k]; }).length >= 3; } },
      { id: 'iss_freeflight', label: 'Complete 3 free-flight navigation challenges', icon: '\uD83E\uDDED', check: function (d) { var n = (((d && d.spaceStation) || {}).interiorNav) || {}; return [n.preciseHatch, n.handrailStop, n.cargoClear, n.orientationRecovered, n.routeComplete].filter(Boolean).length >= 3; } },
      { id: 'iss_ops', label: 'Simulate a full station orbit', icon: '📡', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.opsRuns || 0) >= 1; } },
      { id: 'iss_orbit', label: 'Change the orbit in the Orbit Lab', icon: '🧮', check: function (d) { var s = (d && d.spaceStation) || {}; return !!s.orbitTouched; } },
      { id: 'iss_quiz', label: 'Score ' + QUIZ_PASS + '+ on the station quiz', icon: '🧠', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.quizBest || 0) >= QUIZ_PASS; } },
      { id: 'iss_dock', label: 'Achieve a soft-capture docking', icon: '🚀', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.dockWins || 0) >= 1; } },
      { id: 'iss_eva', label: 'Complete the spacewalk pump repair', icon: '🧑‍🚀', check: function (d) { var s = (d && d.spaceStation) || {}; return !!(s.eva && s.eva.done && !s.eva.failMsg); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var callGemini = ctx.callGemini;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');

      var _prefersReducedMotion = false;
      try { _prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

      if (!labToolData || !labToolData.spaceStation) {
        setLabToolData(function (prev) {
          return Object.assign({}, prev, { spaceStation: {
            tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, sysStep: 0,
            interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
            interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
            interiorGuided: true, lowGImpulse: 10, lowGResult: null,
            interiorView: '3d', interiorNav: { hatches: {}, collisions: 0, railGrabs: 0, looseHits: 0, routeStep: 0 },
            researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {}, cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '',
            opsMode: 'integrated', opsScenario: 'nominal', opsOrbitMinute: 0, opsFocus: 'all', opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 76, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 28, opsMissionDays: 180, opsExercise: 2.5, opsDebrisSize: 1, opsShieldGap: 10, opsDebrisSpeed: 12, opsEmergency: 'leak', opsEmergencyResult: '', opsRuns: 0, opsLog: [], assemblyIdx: 11,
            orbitAlt: 420, orbitInc: 51.6, quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizResults: {},
            seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0, mapView: 'overview', mapCutaway: false,
            askInput: '', askAnswer: '', askLoading: false
          } });
        });
        return h('div', { style: { padding: 24, color: '#475569', backgroundColor: '#ffffff', textAlign: 'center' } }, __alloT('stem.spacestation.initializing', '🛰️ Docking with the station…'));
      }
      var d = labToolData.spaceStation;
      function upd(patch) {
        setLabToolData(function (prev) {
          var s = Object.assign({}, (prev && prev.spaceStation) || {}, patch);
          return Object.assign({}, prev, { spaceStation: s });
        });
      }
      function markSeen(field, key) {
        var cur = Object.assign({}, d[field] || {});
        if (cur[key]) return;
        cur[key] = true;
        var patch = {}; patch[field] = cur;
        upd(patch);
      }

      var selModule = MODULES.find(function (m) { return m.id === d.selModule; }) || MODULES[0];
      var PANEL = 'var(--allo-stem-panel, #1e293b)';
      var TEXT = 'var(--allo-stem-text, #e2e8f0)';
      var SOFT = 'var(--allo-stem-text-soft, #94a3b8)';

      function card(title, children, accent) {
        return h('div', { className: 'iss-card', role: 'region', 'aria-label': typeof title === 'string' ? title : undefined, style: { '--iss-card-accent': accent || '#38bdf8', padding: 14, borderRadius: 12, background: PANEL, border: '1px solid #334155', borderLeft: '3px solid ' + (accent || '#38bdf8'), marginBottom: 12 } },
          title ? h('h3', { className: 'iss-card-title', style: { fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 8px' } }, title) : null,
          children);
      }

      // WCAG style block: one rule set covers every interactive element in the
      // tool (2.4.7 focus visible), plus a prefers-reduced-motion guard (2.3.3)
      // and an sr-only utility. Scoped under .iss-root so nothing leaks.
      function wcagStyles() {
        return h('style', { dangerouslySetInnerHTML: { __html:
          '.iss-root{--iss-line:rgba(148,163,184,.22);--allo-stem-panel:#172235;--allo-stem-text:#e7eef8;--allo-stem-text-soft:#a9b8cb;position:relative;isolation:isolate;box-sizing:border-box;width:100%;padding:clamp(14px,2.4vw,26px);overflow:visible;border:1px solid rgba(125,211,252,.24);border-radius:24px;background:radial-gradient(circle at 9% 2%,rgba(14,165,233,.2),transparent 27%),radial-gradient(circle at 92% 8%,rgba(99,102,241,.2),transparent 28%),linear-gradient(155deg,#060b18 0%,#081221 52%,#07101d 100%);box-shadow:0 28px 70px rgba(2,6,23,.38),inset 0 1px 0 rgba(255,255,255,.05);color-scheme:dark}' +
          '.iss-root:before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:.52;background-image:radial-gradient(circle at 14% 19%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 78% 13%,#bae6fd 0 1px,transparent 1.5px),radial-gradient(circle at 43% 8%,#fff 0 1px,transparent 1.4px),radial-gradient(circle at 93% 31%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 61% 28%,#c4b5fd 0 1px,transparent 1.5px);background-size:177px 151px,223px 197px,139px 181px,251px 169px,193px 227px}.iss-root *{box-sizing:border-box}.iss-root button,.iss-root input,.iss-root textarea{font:inherit}.iss-root button{min-width:24px;min-height:24px;transition:transform .18s ease,border-color .18s ease,background-color .18s ease,box-shadow .18s ease,filter .18s ease}.iss-root input[type="range"]{min-height:24px}.iss-root button:not(:disabled):hover{transform:translateY(-1px);filter:brightness(1.12);box-shadow:0 8px 22px rgba(2,6,23,.24)}.iss-root button:not(:disabled):active{transform:translateY(0) scale(.985)}' +
          '.iss-root summary{min-height:24px}.iss-root button:focus-visible,.iss-root input:focus-visible,.iss-root textarea:focus-visible,.iss-root summary:focus-visible,.iss-root canvas:focus-visible,.iss-root [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:3px;border-radius:8px}.iss-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          '.iss-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:18px}.iss-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:7px;color:#7dd3fc;font-size:10px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase}.iss-live-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.12),0 0 16px #4ade80}.iss-title{font-size:clamp(21px,3vw,31px)!important;line-height:1.08;letter-spacing:-.035em;text-shadow:0 2px 22px rgba(56,189,248,.16)}.iss-subtitle{max-width:710px;font-size:clamp(11.5px,1.5vw,13px)!important;line-height:1.6!important}' +
          '.iss-orbit-mark{position:relative;width:92px;height:92px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,.22),rgba(14,165,233,.04) 56%,transparent 58%);border:1px solid rgba(125,211,252,.18);box-shadow:inset 0 0 25px rgba(14,165,233,.14),0 0 32px rgba(14,165,233,.08)}.iss-orbit-mark:before{content:"";position:absolute;width:78px;height:31px;border:1px solid #38bdf8;border-radius:50%;transform:rotate(-18deg);box-shadow:0 0 13px rgba(56,189,248,.3)}.iss-orbit-mark:after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:#fbbf24;box-shadow:0 0 15px #fbbf24;transform:translate(34px,-13px)}.iss-orbit-core{font-size:34px;filter:drop-shadow(0 4px 12px rgba(2,6,23,.55))}' +
          '.iss-status-strip{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.iss-status-item{padding:8px 10px;border:1px solid var(--iss-line);border-radius:10px;background:rgba(2,6,23,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.iss-status-label{display:block;color:#7f91a8;font-size:9.5px;font-weight:850;letter-spacing:1.05px;text-transform:uppercase}.iss-status-value{display:block;margin-top:2px;color:#e0f2fe;font:800 11.5px ui-monospace,SFMono-Regular,Consolas,monospace}' +
          '.iss-tablist{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important;padding:7px;margin:0 0 14px!important;border:1px solid var(--iss-line);border-radius:15px;background:rgba(2,6,23,.48);backdrop-filter:blur(12px)}.iss-tab{position:relative;min-height:43px;padding:8px 9px!important;border-radius:10px!important;line-height:1.2}.iss-tab[aria-selected="true"]{background:linear-gradient(135deg,#38bdf8,#0ea5e9)!important;box-shadow:0 7px 20px rgba(14,165,233,.23),inset 0 1px 0 rgba(255,255,255,.38)}.iss-tab-icon{display:inline-block;margin-right:3px;font-size:14px;filter:drop-shadow(0 2px 4px rgba(2,6,23,.4))}' +
          '.iss-panel{min-height:280px;padding:clamp(12px,2vw,18px);border:1px solid var(--iss-line);border-radius:18px;background:linear-gradient(160deg,rgba(15,23,42,.8),rgba(8,17,31,.74));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 18px 40px rgba(2,6,23,.18);backdrop-filter:blur(12px)}.iss-card{position:relative;overflow:hidden;border:1px solid var(--iss-line)!important;border-left:3px solid var(--iss-card-accent)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(30,41,59,.86),rgba(15,23,42,.82))!important;box-shadow:0 12px 28px rgba(2,6,23,.16),inset 0 1px 0 rgba(255,255,255,.04)}.iss-card:after{content:"";position:absolute;right:-55px;top:-75px;width:145px;height:145px;border-radius:50%;pointer-events:none;background:var(--iss-card-accent);opacity:.045}.iss-card-title{display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1px solid rgba(148,163,184,.12);letter-spacing:.01em}' +
          '.iss-interior-hero{position:relative;overflow:hidden!important;border-radius:16px!important;background:radial-gradient(circle at 83% 18%,rgba(125,211,252,.16),transparent 31%),linear-gradient(125deg,rgba(14,165,233,.22),rgba(79,70,229,.14) 58%,rgba(15,23,42,.52))!important;box-shadow:0 14px 32px rgba(2,6,23,.2),inset 0 1px 0 rgba(255,255,255,.07)}.iss-interior-hero:after{content:"";position:absolute;right:-30px;bottom:-56px;width:180px;height:100px;border:1px solid rgba(125,211,252,.18);border-radius:50%;transform:rotate(-12deg)}.iss-route{padding:8px;border:1px solid var(--iss-line);border-radius:14px;background:rgba(2,6,23,.34)}.iss-route-button{position:relative;overflow:hidden}.iss-route-button[aria-pressed="true"]:after{content:"";position:absolute;inset:auto 9px 0;height:2px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor}' +
          '.iss-interior-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:14px}.iss-scene-frame{box-shadow:0 18px 38px rgba(2,6,23,.3),inset 0 0 0 1px rgba(255,255,255,.04)}.iss-scene-frame:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(125,211,252,.1),transparent 10%,transparent 90%,rgba(125,211,252,.08)),repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.012) 3px 4px)}.iss-scene-frame>button{z-index:2}' +
          '.iss-interior-viewbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}.iss-interior-viewbar p{margin:0;color:#94a3b8;font-size:10.5px}.iss-interior-view-switch{display:flex;gap:4px;padding:3px;border:1px solid var(--iss-line);border-radius:10px;background:rgba(2,6,23,.46)}.iss-interior-view-switch button{padding:6px 9px;border:0;border-radius:7px;background:transparent;color:#94a3b8;font-size:10.5px;font-weight:850;cursor:pointer}.iss-interior-view-switch button[aria-pressed="true"]{background:#0ea5e9;color:#04121f;box-shadow:0 5px 14px rgba(14,165,233,.22)}' +
          '.iss-interior-sim{margin-bottom:10px}.iss-interior-3d{position:relative;overflow:hidden;border:1px solid rgba(125,211,252,.42);border-radius:16px;background:#030712;box-shadow:0 20px 45px rgba(2,6,23,.42),inset 0 0 40px rgba(14,165,233,.08)}.iss-interior-canvas{display:block;width:100%;height:clamp(320px,48vw,450px);background:#030712;cursor:crosshair;touch-action:none}.iss-interior-hud{position:absolute;inset:10px 10px auto;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;pointer-events:none}.iss-interior-hud span,.iss-interior-help,.iss-interior-route-hud{padding:5px 8px;border:1px solid rgba(125,211,252,.26);border-radius:7px;background:rgba(2,6,23,.72);backdrop-filter:blur(7px);color:#bae6fd;font:850 8.5px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.55px}.iss-interior-hud .iss-interior-room-hud{overflow:hidden;color:#f8fafc;text-overflow:ellipsis;white-space:nowrap}.iss-interior-help{position:absolute;left:50%;bottom:10px;z-index:2;width:max-content;max-width:calc(100% - 20px);transform:translateX(-50%);color:#cbd5e1;text-align:center;pointer-events:none}.iss-interior-route-hud{position:absolute;left:10px;bottom:45px;z-index:2;color:#94a3b8;pointer-events:none}.iss-interior-route-hud strong{color:#7dd3fc}.iss-interior-fallback{margin:8px 0 0;padding:8px;border-left:3px solid #fbbf24;background:rgba(251,191,36,.09);color:#fde68a;font-size:11px}' +
          '.iss-interior-sim[data-iss-webgl-state="unavailable"] .iss-interior-controls{display:none}' +
          '.iss-interior-safety button[aria-disabled="true"]{opacity:.72;border-style:dashed;cursor:help}' +
          '.iss-interior-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:8px}.iss-interior-thrusters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.iss-interior-thrusters button,.iss-interior-safety button{min-height:39px;padding:6px 7px;border:1px solid #475569;border-radius:9px;background:rgba(2,6,23,.44);color:#cbd5e1;font-size:9.5px;font-weight:850;cursor:pointer;touch-action:none}.iss-interior-thrusters button:active{border-color:#7dd3fc;background:rgba(14,165,233,.2)}.iss-interior-safety{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.iss-interior-safety button:first-child{border-color:#fbbf24;color:#fde68a}.iss-interior-instructions{margin:7px 0 0;color:#94a3b8;font-size:10.5px;line-height:1.5}.iss-nav-challenges{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:6px;margin:9px 0 2px}.iss-nav-challenge{min-height:62px;padding:8px;border:1px solid #334155;border-radius:10px;background:rgba(2,6,23,.38);color:#94a3b8}.iss-nav-challenge.is-complete{border-color:rgba(74,222,128,.52);background:rgba(34,197,94,.09);color:#bbf7d0}.iss-nav-challenge strong{display:block;margin-bottom:2px;color:#e2e8f0;font-size:10px}.iss-nav-challenge span{display:block;font-size:9px;line-height:1.35}.iss-nav-challenge i{float:right;font-style:normal}.iss-discovery-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.iss-discovery-row button{padding:7px 8px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.52);color:#e2e8f0;font-size:10px;font-weight:800;cursor:pointer}' +
          '.iss-interior-3d:focus-within{border-color:#7dd3fc;box-shadow:0 20px 45px rgba(2,6,23,.42),inset 0 0 52px rgba(14,165,233,.13),0 0 0 2px rgba(125,211,252,.16)}.iss-interior-hud{grid-template-columns:minmax(0,1fr) repeat(3,auto)}.iss-interior-speed[data-rate="controlled"]{color:#bbf7d0;border-color:rgba(74,222,128,.42)}.iss-interior-speed[data-rate="fast"]{color:#fde68a;border-color:rgba(251,191,36,.52)}.iss-interior-reticle{position:absolute;left:50%;top:50%;z-index:2;width:72px;height:72px;transform:translate(-50%,-50%);pointer-events:none}.iss-interior-reticle:before,.iss-interior-reticle:after{content:"";position:absolute;left:50%;top:50%;background:rgba(224,242,254,.7);box-shadow:0 0 8px rgba(125,211,252,.5)}.iss-interior-reticle:before{width:24px;height:1px;transform:translate(-50%,-50%)}.iss-interior-reticle:after{width:1px;height:24px;transform:translate(-50%,-50%)}.iss-interior-horizon{position:absolute;left:12px;right:12px;top:35px;height:1px;background:linear-gradient(90deg,transparent,#7dd3fc 28%,#7dd3fc 72%,transparent);opacity:.5;transform-origin:50% 50%}.iss-interior-velocity-dot{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px;border:1px solid #f8fafc;border-radius:50%;background:#38bdf8;box-shadow:0 0 12px #38bdf8}.iss-interior-next-hatch{position:absolute;right:10px;top:54px;z-index:2;display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:center;max-width:190px;padding:7px 9px;border:1px solid rgba(125,211,252,.32);border-radius:9px;background:rgba(2,6,23,.76);color:#e0f2fe;font:800 8.5px ui-monospace,monospace;pointer-events:none}.iss-interior-next-hatch-arrow{grid-row:1/3;display:grid;place-items:center;width:24px;height:24px;border:1px solid rgba(125,211,252,.46);border-radius:50%;color:#7dd3fc;font-size:17px}.iss-interior-next-hatch strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.6px}.iss-interior-next-hatch span:last-child{color:#94a3b8}.iss-interior-objective{position:absolute;left:10px;top:54px;z-index:2;max-width:210px;padding:7px 9px;border-left:3px solid #fbbf24;border-radius:7px;background:rgba(2,6,23,.76);color:#fef3c7;font:800 8px ui-monospace,monospace;letter-spacing:.45px;pointer-events:none}.iss-interior-event{position:absolute;left:50%;top:26%;z-index:3;max-width:75%;padding:7px 11px;border:1px solid rgba(125,211,252,.4);border-radius:8px;background:rgba(2,6,23,.86);color:#bae6fd;font:900 9px ui-monospace,monospace;letter-spacing:.7px;text-align:center;transform:translate(-50%,-8px);opacity:0;transition:opacity .16s ease,transform .16s ease;pointer-events:none}.iss-interior-event.is-visible{opacity:1;transform:translate(-50%,0)}.iss-interior-event[data-tone="safe"]{color:#bbf7d0;border-color:#4ade80}.iss-interior-event[data-tone="warn"],.iss-interior-event[data-tone="impact"]{color:#fde68a;border-color:#fbbf24}.iss-interior-mission-cue{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;margin:8px 0 0;padding:8px 10px;border:1px solid rgba(125,211,252,.25);border-radius:10px;background:linear-gradient(90deg,rgba(14,165,233,.12),rgba(2,6,23,.38))}.iss-interior-mission-cue>span{grid-row:1/3;color:#7dd3fc;font:900 8px ui-monospace,monospace;letter-spacing:1px}.iss-interior-mission-cue strong{color:#e0f2fe;font-size:10.5px}.iss-interior-mission-cue small{color:#94a3b8;font-size:9px}.iss-interior-thrusters button{display:flex;align-items:center;justify-content:space-between;gap:5px}.iss-interior-thrusters kbd{min-width:20px;padding:2px 4px;border:1px solid #64748b;border-bottom-width:2px;border-radius:4px;background:#101827;color:#e0f2fe;font:850 8px ui-monospace,monospace}.iss-interior-safety button:disabled{opacity:.48;cursor:not-allowed}.iss-location-strip.iss-interior-route-map{display:block;padding:8px 10px;overflow:hidden}.iss-route-map-heading{display:flex;justify-content:space-between;gap:10px;color:#94a3b8;font:850 8px ui-monospace,monospace;letter-spacing:.7px}.iss-route-map-heading strong{color:#7dd3fc}.iss-route-schematic{display:block;width:100%;height:auto;margin-top:2px}.iss-route-schematic .iss-route-line{fill:none;stroke:#334155;stroke-width:3}.iss-route-schematic .iss-route-progress-line{fill:none;stroke:#38bdf8;stroke-width:2;stroke-dasharray:5 5;opacity:.65}.iss-route-schematic .iss-route-node circle{fill:#07101d;stroke:#64748b;stroke-width:2}.iss-route-schematic .iss-route-node text{fill:#94a3b8;font:800 8px ui-monospace,monospace;text-anchor:middle}.iss-route-schematic .iss-route-node.is-visited circle{stroke:#38bdf8}.iss-route-schematic .iss-route-node.is-done circle{fill:#14532d;stroke:#4ade80}.iss-route-schematic .iss-route-node.is-current circle{fill:#0ea5e9;stroke:#e0f2fe;stroke-width:3;filter:drop-shadow(0 0 5px #38bdf8)}.iss-route-schematic .iss-route-node.is-current text{fill:#e0f2fe}.iss-route-schematic .iss-route-branch-label{fill:#fbbf24;font:850 7px ui-monospace,monospace;letter-spacing:.6px}' +
          '.iss-route-schematic .iss-route-node.is-next circle{stroke:#fbbf24;stroke-dasharray:3 2}.iss-route-schematic .iss-route-node.is-next text{fill:#fde68a}@media (max-width:620px){.iss-interior-objective{display:none}.iss-interior-next-hatch{top:54px;right:8px;max-width:148px}.iss-interior-next-hatch strong{max-width:96px}.iss-interior-hud span:nth-child(4){display:none}.iss-route-map-heading span{display:none}}@media (prefers-reduced-motion:reduce){.iss-interior-event{transition:none}.iss-route-schematic .iss-route-progress-line{stroke-dasharray:none}}' +
          '@media (max-width:620px){.iss-interior-hud{grid-template-columns:1fr auto}.iss-interior-hud span:nth-child(3){display:none}.iss-interior-controls{grid-template-columns:1fr}.iss-interior-thrusters{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-interior-safety{justify-content:stretch}.iss-interior-safety button{flex:1 1 110px}.iss-interior-route-hud{display:none}.iss-discovery-row{grid-template-columns:1fr}}@media (forced-colors:active){.iss-interior-3d,.iss-nav-challenge,.iss-interior-view-switch{background:Canvas!important;color:CanvasText!important;border-color:CanvasText!important}.iss-interior-hud,.iss-interior-help{display:none}}' +
          '.iss-station-stage{position:relative;border-radius:18px!important;border-color:rgba(125,211,252,.35)!important;box-shadow:0 18px 45px rgba(2,6,23,.42),inset 0 0 45px rgba(14,165,233,.08)}.iss-stage-hud{position:absolute;inset:12px 12px auto;display:flex;justify-content:space-between;gap:8px;pointer-events:none}.iss-hud-chip{padding:6px 9px;border:1px solid rgba(125,211,252,.25);border-radius:8px;background:rgba(2,6,23,.62);backdrop-filter:blur(8px);color:#bae6fd;font:800 9px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.7px}.iss-stage-help{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 10px;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:rgba(2,6,23,.64);backdrop-filter:blur(8px);color:#cbd5e1;font-size:9.5px;font-weight:700;pointer-events:none;white-space:nowrap}.iss-module-picker{padding:8px;border:1px solid var(--iss-line);border-radius:12px;background:rgba(2,6,23,.34)}.iss-module-marker{position:absolute;z-index:3;display:flex;align-items:center;gap:5px;transform:translate(-50%,-135%);pointer-events:none;transition:left .08s linear,top .08s linear,opacity .16s ease}.iss-module-marker i{display:block;width:18px;height:18px;border-left:1px solid #fbbf24;border-top:1px solid #fbbf24;transform:translate(9px,9px) rotate(-45deg)}.iss-module-marker span{padding:4px 7px;border:1px solid rgba(251,191,36,.5);border-radius:6px;background:rgba(2,6,23,.76);color:#fef3c7;font:850 8px ui-monospace,monospace;letter-spacing:.7px;box-shadow:0 0 16px rgba(251,191,36,.16)}.iss-hud-chip[data-phase="sunlight"]{color:#fde68a;border-color:rgba(251,191,36,.38)}.iss-hud-chip[data-phase="eclipse"]{color:#c7d2fe;border-color:rgba(129,140,248,.42)}.iss-orientation-widget{position:absolute;right:10px;bottom:8px;width:88px;height:88px;pointer-events:none;filter:drop-shadow(0 4px 10px rgba(2,6,23,.45))}.iss-orientation-widget line{transition:x2 .08s linear,y2 .08s linear}' +
          '.iss-learning-visual{position:relative;overflow:hidden;margin:0 0 12px;border:1px solid rgba(125,211,252,.25);border-radius:14px;background:radial-gradient(circle at 50% 100%,rgba(14,165,233,.12),transparent 56%),rgba(2,6,23,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 25px rgba(2,6,23,.2)}.iss-learning-visual svg{display:block;width:100%;height:auto}.iss-visual-caption{display:flex;justify-content:space-between;gap:10px;padding:7px 10px;border-top:1px solid rgba(148,163,184,.14);color:#94a3b8;font-size:10.5px;letter-spacing:.35px}.iss-flow-path{stroke-dasharray:7 7;animation:iss-flow 7s linear infinite}.iss-orbit-station{animation:iss-orbit-breathe 2.6s ease-in-out infinite}.iss-system-tabs{padding:7px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.34)}.iss-system-tab[aria-pressed="true"]{box-shadow:inset 0 -2px 0 currentColor,0 7px 18px rgba(2,6,23,.2)}.iss-system-steps{display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;border-top:1px solid rgba(148,163,184,.14)}.iss-system-steps button{min-height:31px;padding:5px 9px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.36);color:#cbd5e1;font-size:9.5px;font-weight:800;cursor:pointer}.iss-system-steps button[aria-pressed="true"]{border-color:#7dd3fc;background:rgba(14,165,233,.18);color:#e0f2fe;box-shadow:inset 0 -2px 0 #38bdf8}.iss-system-coupling{margin-top:-4px}.iss-coupling-pipe{stroke-dasharray:6 6;animation:iss-flow 5s linear infinite}.iss-dock-canvas{box-shadow:0 16px 36px rgba(2,6,23,.34),inset 0 0 35px rgba(14,165,233,.08)}.iss-timeline{position:relative;padding-left:19px}.iss-timeline:before{content:"";position:absolute;left:5px;top:5px;bottom:5px;width:2px;background:linear-gradient(#38bdf8,#818cf8,#22c55e);box-shadow:0 0 12px rgba(56,189,248,.35)}.iss-timeline-item{position:relative}.iss-timeline-item-button{width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.iss-timeline-item-button:hover{background:linear-gradient(90deg,rgba(56,189,248,.08),transparent)}.iss-timeline-item:before{content:"";position:absolute;left:-18px;top:12px;width:9px;height:9px;border:2px solid #7dd3fc;border-radius:50%;background:#07101d;box-shadow:0 0 10px rgba(56,189,248,.55)}.iss-day-strip{padding:7px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.32)}.iss-day-chip[aria-pressed="true"]{box-shadow:inset 0 -2px 0 #e879f9,0 7px 18px rgba(232,121,249,.12)}' +
          '@keyframes iss-flow{to{stroke-dashoffset:-70}}@keyframes iss-orbit-breathe{50%{filter:drop-shadow(0 0 8px #7dd3fc)}}' +          '.iss-orbit-environment{margin:-4px 0 12px;background:rgba(2,6,23,.28)}.iss-orbit-environment svg{display:block;width:100%;height:auto}.iss-orbit-environment .iss-visual-caption{border-top:1px solid rgba(148,163,184,.14)}.iss-blueprint{margin:0 0 11px}.iss-blueprint-grid{opacity:.2}.iss-eva-visual{margin:0 0 10px}.iss-eva-astronaut{animation:iss-eva-hover 2.8s ease-in-out infinite}.iss-eva-tether-a{stroke:#38bdf8}.iss-eva-tether-b{stroke:#fbbf24}.iss-day-orbit{margin:0 0 10px}.iss-crew-day-timeline{border-top:1px solid rgba(148,163,184,.14);background:rgba(2,6,23,.28)}.iss-crew-day-timeline svg{display:block;width:100%;height:auto}.iss-day-timeline-marker{filter:drop-shadow(0 0 5px rgba(251,191,36,.42))}.iss-day-marker{animation:iss-orbit-breathe 2.6s ease-in-out infinite}.iss-quiz-console{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin-bottom:12px;padding:10px 12px;border:1px solid var(--iss-line);border-radius:13px;background:linear-gradient(135deg,rgba(14,165,233,.11),rgba(99,102,241,.08))}.iss-quiz-number{display:grid;place-items:center;width:45px;height:45px;border:1px solid #38bdf8;border-radius:50%;background:rgba(14,165,233,.12);color:#bae6fd;font:900 13px ui-monospace,monospace;box-shadow:inset 0 0 18px rgba(56,189,248,.12)}.iss-quiz-track{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}.iss-quiz-segment{height:7px;border-radius:5px;background:#263449;border:1px solid rgba(148,163,184,.18)}.iss-quiz-segment.is-complete{background:#38bdf8;border-color:#7dd3fc;box-shadow:0 0 9px rgba(56,189,248,.35)}.iss-quiz-score{text-align:right;color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.8px}.iss-quiz-score strong{display:block;color:#e0f2fe;font-size:15px;letter-spacing:0}.iss-quiz-answer-state{display:block;margin-bottom:3px;color:#e2e8f0;font-size:10.5px;font-weight:900;letter-spacing:.2px}.iss-quiz-debrief{margin-bottom:11px}.iss-fact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px}.iss-fact-item{position:relative;overflow:hidden;min-height:64px;padding:10px!important;background:linear-gradient(145deg,rgba(2,6,23,.52),rgba(30,41,59,.48))!important;transition:transform .18s ease,border-color .18s ease}.iss-fact-item:after{content:"";position:absolute;right:-18px;bottom:-24px;width:54px;height:54px;border-radius:50%;background:#818cf8;opacity:.06}.iss-fact-item:hover{transform:translateY(-2px);border-color:#64748b!important}@keyframes iss-eva-hover{50%{transform:translateY(-3px)}}.iss-cabin-airflow{stroke-dasharray:4 3;animation:iss-flow 3.4s linear infinite}.iss-aurora-curtain{animation:iss-aurora-sway 7s ease-in-out infinite}.iss-aurora-curtain:nth-of-type(2){animation-delay:-2.3s}.iss-aurora-curtain:nth-of-type(3){animation-delay:-4.6s}@keyframes iss-aurora-sway{50%{transform:translateX(4px)}}' +
          '@media (max-width:520px){.iss-quiz-console{grid-template-columns:auto 1fr}.iss-quiz-score{grid-column:1/-1;text-align:left;display:flex;gap:6px;align-items:baseline}.iss-quiz-score strong{display:inline}.iss-visual-caption{flex-direction:column;gap:2px}.iss-location-strip{flex-wrap:wrap;overflow-x:visible}.iss-location-link{display:none}.iss-assembly-stepper{grid-template-columns:1fr 1fr}.iss-assembly-stepper span{grid-column:1/-1;grid-row:1;text-align:center}.iss-assembly-stepper button{grid-row:2}}' +          '.iss-ops-hero{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px;margin-bottom:12px;border:1px solid rgba(74,222,128,.25);border-radius:15px;background:radial-gradient(circle at 88% 18%,rgba(74,222,128,.12),transparent 30%),linear-gradient(135deg,rgba(14,165,233,.12),rgba(15,23,42,.66));box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.iss-ops-health{display:grid;place-items:center;width:76px;height:76px;border-radius:50%;border:5px solid currentColor;background:rgba(2,6,23,.52);font:900 17px ui-monospace,monospace;box-shadow:inset 0 0 22px rgba(2,6,23,.5),0 0 22px currentColor}.iss-ops-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:12px}.iss-ops-metric{min-width:0;overflow:visible;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.42)}.iss-ops-metric button{display:block;width:100%;padding:9px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.iss-ops-metric button:hover{background:rgba(56,189,248,.07)}.iss-ops-metric button:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.iss-ops-metric-label{display:block;overflow:hidden;color:#94a3b8;font-size:8px;font-weight:850;letter-spacing:.7px;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.iss-ops-metric-value{display:block;margin-top:3px;color:#e0f2fe;font:850 13px ui-monospace,monospace}.iss-ops-metric small{display:block;margin-top:4px;color:#64748b;font:750 7.5px ui-monospace,monospace;letter-spacing:.3px}.iss-rule-heading{display:flex;align-items:center;justify-content:space-between;gap:6px}.iss-rule-light{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#fbbf24;box-shadow:0 0 9px #fbbf24}.iss-rule-light.is-go{background:#4ade80;box-shadow:0 0 9px #4ade80}.iss-rule-light.is-hold{background:#f87171;box-shadow:0 0 9px #f87171}.iss-ops-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:10px}.iss-ops-presets button{min-width:0;display:flex;align-items:center;gap:7px;padding:8px;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.38);color:#cbd5e1;text-align:left;cursor:pointer}.iss-ops-presets button[aria-pressed="true"]{border-color:#7dd3fc;background:linear-gradient(135deg,rgba(14,165,233,.2),rgba(99,102,241,.15));box-shadow:inset 0 -2px 0 #38bdf8}.iss-ops-presets strong,.iss-ops-presets small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iss-ops-presets strong{font-size:9.5px}.iss-ops-presets small{margin-top:2px;color:#7f91a8;font-size:7.5px}.iss-preset-icon{display:grid;place-items:center;width:24px;height:24px;flex:0 0 auto;border:1px solid #475569;border-radius:50%;color:#7dd3fc;font:900 9px ui-monospace,monospace}.iss-custom-badge{grid-column:1/-1;padding:3px 7px;color:#fbbf24;font:800 8px ui-monospace,monospace;letter-spacing:.6px}.iss-ops-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:6px;padding:7px;margin-bottom:12px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.36)}.iss-ops-mode{min-height:39px;padding:7px!important}.iss-ops-mode[aria-pressed="true"]{background:linear-gradient(135deg,rgba(14,165,233,.3),rgba(99,102,241,.22))!important;border-color:#38bdf8!important;color:#e0f2fe!important;box-shadow:inset 0 -2px 0 #38bdf8}.iss-ops-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.iss-ops-control{padding:10px;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.38)}.iss-ops-control label{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:10.5px;font-weight:800}.iss-ops-control input[type="range"]{width:100%;margin:9px 0 4px}.iss-meter{height:8px;overflow:hidden;margin-top:7px;border:1px solid #475569;border-radius:6px;background:#101827}.iss-meter>span{display:block;height:100%;border-radius:5px;transition:width .25s ease}.iss-spark{margin-top:7px;border-top:1px solid rgba(148,163,184,.12)}.iss-spark svg{display:block;width:100%;height:42px}.iss-forecast-legend{display:flex;flex-wrap:wrap;gap:7px 14px;padding:7px 10px;border-top:1px solid rgba(148,163,184,.14);color:#94a3b8;font-size:9px}.iss-forecast-legend span{display:flex;align-items:center;gap:5px}.iss-forecast-legend i{width:13px;height:3px;border-radius:3px}.iss-orbit-scrubber{padding:9px 10px 10px;border-top:1px solid rgba(148,163,184,.14);background:rgba(2,6,23,.24)}.iss-orbit-scrubber label{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:9.5px;font-weight:800}.iss-orbit-scrubber input{width:100%;margin:8px 0 7px}.iss-orbit-readout{display:flex;flex-wrap:wrap;gap:5px 13px;color:#94a3b8;font:750 8.5px ui-monospace,monospace}.iss-forecast-cursor{filter:drop-shadow(0 0 4px currentColor)}.iss-rule-status{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;margin:-2px 0 12px;padding:9px 10px;border:1px solid rgba(74,222,128,.28);border-radius:11px;background:rgba(34,197,94,.07)}.iss-rule-status.is-check{border-color:rgba(248,113,113,.38);background:rgba(239,68,68,.08)}.iss-rule-status-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#14532d;color:#bbf7d0;font-weight:900}.iss-rule-status.is-check .iss-rule-status-icon{background:#7f1d1d;color:#fecaca}.iss-rule-status strong{display:block;color:#bbf7d0;font:850 9px ui-monospace,monospace;letter-spacing:.7px}.iss-rule-status.is-check strong{color:#fecaca}.iss-rule-status p{margin:2px 0 0;color:#94a3b8;font-size:9.5px;line-height:1.35}.iss-rule-status button{padding:6px 9px;border:1px solid #64748b;border-radius:8px;background:rgba(2,6,23,.36);color:#e2e8f0;font-size:9px;font-weight:800;cursor:pointer}.iss-ops-schematic{margin-bottom:10px}.iss-ops-debrief{margin-top:12px;padding:12px;border:1px solid rgba(125,211,252,.22);border-radius:13px;background:rgba(2,6,23,.4)}.iss-ops-log{display:grid;gap:4px;margin-top:8px;color:#94a3b8;font:700 9.5px ui-monospace,monospace}.iss-emergency-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.iss-emergency-choice{text-align:left;padding:10px!important}.iss-assembly-stage{position:relative;overflow:hidden;margin-bottom:10px;border:1px solid rgba(125,211,252,.25);border-radius:14px;background:#050b18}.iss-assembly-stage svg{display:block;width:100%;height:auto}.iss-assembly-growth{border-top:1px solid rgba(125,211,252,.18);background:#07101d}.iss-assembly-growth svg{display:block;width:100%;height:auto}.iss-location-strip{display:flex;align-items:center;gap:4px;margin:0 0 10px;padding:7px 9px;overflow-x:auto;border:1px solid var(--iss-line);border-radius:12px;background:rgba(2,6,23,.35)}.iss-location-node{flex:0 0 auto;display:flex;align-items:center;gap:4px;color:#64748b;font-size:9px;font-weight:800}.iss-location-node.is-current{color:#7dd3fc}.iss-location-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 9px currentColor}.iss-location-link{width:18px;height:1px;background:#334155}.iss-network-focus{display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;border-top:1px solid rgba(148,163,184,.14)}.iss-network-focus button{min-height:32px;padding:5px 9px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.34);color:#cbd5e1;font-size:10px;font-weight:800;cursor:pointer}.iss-network-focus button[aria-pressed="true"]{border-color:#38bdf8;background:rgba(14,165,233,.18);color:#bae6fd;box-shadow:inset 0 -2px 0 #38bdf8}.iss-network-detail{padding:0 10px 9px;color:#a9b8cb;font-size:10.5px;line-height:1.45}.iss-reference-key i{height:0!important;background:transparent!important;border-top:2px dashed #94a3b8}.iss-mission-replay{margin-top:10px;padding:10px;border:1px solid rgba(129,140,248,.24);border-radius:12px;background:rgba(30,27,75,.18)}.iss-replay-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;margin-bottom:9px}.iss-replay-heading strong{color:#c7d2fe;font:850 10px ui-monospace,monospace;letter-spacing:.7px}.iss-replay-heading span{color:#94a3b8;font-size:10px}.iss-replay-lane{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.iss-replay-lane:before{content:"";position:absolute;left:8%;right:8%;top:13px;height:2px;background:linear-gradient(90deg,#fbbf24,#fde68a,#818cf8,#38bdf8)}.iss-replay-lane button{position:relative;z-index:1;display:grid;justify-items:center;gap:2px;padding:3px 4px 6px;border:0;background:transparent;color:#cbd5e1;cursor:pointer}.iss-replay-lane button i{width:10px;height:10px;border:2px solid #818cf8;border-radius:50%;background:#0b1026;box-shadow:0 0 8px rgba(129,140,248,.5)}.iss-replay-lane button[aria-pressed="true"] i{background:#7dd3fc;border-color:#e0f2fe;box-shadow:0 0 11px #38bdf8}.iss-replay-lane strong{font:850 9.5px ui-monospace,monospace}.iss-replay-lane span{font-size:9.5px;font-weight:800;text-align:center}.iss-replay-lane small{color:#7f91a8;font-size:9px;text-align:center}.iss-map-controls{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.iss-map-controls button{min-height:36px;padding:6px 9px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.42);color:#cbd5e1;font-size:10.5px;font-weight:800;cursor:pointer}.iss-map-controls button[aria-pressed="true"]{border-color:#38bdf8;background:rgba(14,165,233,.16);color:#bae6fd;box-shadow:inset 0 -2px 0 #38bdf8}.iss-hud-selection{color:#fef3c7;border-color:rgba(251,191,36,.35)}.iss-orientation-cue{flex:0 0 auto;padding:2px 4px;color:#fbbf24;font:850 8px ui-monospace,monospace;letter-spacing:.6px}.iss-hatch-enter{animation:iss-hatch-enter .34s ease-out}.iss-assembly-new{animation:iss-install-pulse 1.8s ease-in-out infinite}.iss-assembly-controls{padding:0 12px 12px}.iss-assembly-controls label{display:flex;justify-content:space-between;color:#cbd5e1;font-size:11px;font-weight:800}.iss-assembly-controls label strong{color:#7dd3fc}.iss-assembly-controls input{width:100%;margin:8px 0;accent-color:#38bdf8}.iss-assembly-stepper{display:grid;grid-template-columns:1fr auto 1fr;gap:7px;align-items:center}.iss-assembly-stepper button{min-height:34px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.36);color:#cbd5e1;font-size:10.5px;font-weight:800;cursor:pointer}.iss-assembly-stepper button:disabled{opacity:.42;cursor:not-allowed}.iss-assembly-stepper span{color:#94a3b8;font:800 10px ui-monospace,monospace}.iss-timeline-item.is-active{margin-left:-8px;padding-left:8px!important;border-left:3px solid #38bdf8;background:linear-gradient(90deg,rgba(14,165,233,.12),transparent)}.iss-ops-presets small,.iss-ops-metric small,.iss-ops-metric-label,.iss-orbit-readout{font-size:10px}@keyframes iss-hatch-enter{from{opacity:.25;transform:scale(.94);filter:brightness(.55)}to{opacity:1;transform:scale(1);filter:brightness(1)}}@keyframes iss-install-pulse{50%{filter:drop-shadow(0 0 7px #7dd3fc)}}' +
          '@media (max-width:760px){.iss-ops-presets{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-modes{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-grid{grid-template-columns:1fr}.iss-ops-hero{grid-template-columns:1fr}.iss-ops-health{display:none}}@media (max-width:520px){.iss-rule-status{grid-template-columns:auto 1fr}.iss-rule-status button{grid-column:1/-1;width:100%}.iss-replay-lane{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-replay-lane:before{display:none}.iss-hud-selection,.iss-stage-hud .iss-hud-chip:nth-child(4){display:none}.iss-orientation-widget{width:70px;height:70px}}@media (max-width:420px){.iss-emergency-grid{grid-template-columns:1fr}.iss-orbit-readout{gap:4px 8px}}' +          '.iss-float{animation:iss-drift 4s ease-in-out infinite alternate}@keyframes iss-drift{from{transform:translate(0,-3px) rotate(-1deg)}to{transform:translate(7px,4px) rotate(2deg)}}@keyframes iss-pulse{50%{opacity:.48;box-shadow:0 0 0 7px rgba(74,222,128,0),0 0 22px #4ade80}}.iss-live-dot{animation:iss-pulse 2.4s ease-in-out infinite}' +
          '@media (max-width:760px){.iss-root{padding:12px;border-radius:18px}.iss-hero{grid-template-columns:1fr}.iss-orbit-mark{display:none}.iss-status-strip{grid-template-columns:1fr 1fr}.iss-tablist{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-interior-layout{grid-template-columns:1fr}.iss-panel{padding:11px}.iss-hud-chip:nth-child(2){display:none}}@media (max-width:420px){.iss-status-strip{grid-template-columns:1fr}.iss-status-value{font-size:10.5px}.iss-tab{font-size:10.5px!important;min-height:40px}.iss-stage-help{white-space:normal;width:calc(100% - 24px);text-align:center}.iss-route{grid-template-columns:1fr 1fr!important}}' +
          '@media (forced-colors: active){.iss-root,.iss-panel,.iss-card,.iss-tablist,.iss-route,.iss-learning-visual{background:Canvas!important;color:CanvasText!important;border-color:CanvasText!important;box-shadow:none!important}.iss-root:before,.iss-card:after{display:none}.iss-root button{forced-color-adjust:auto}.iss-root button:focus-visible,.iss-root input:focus-visible,.iss-root textarea:focus-visible,.iss-root summary:focus-visible,.iss-root canvas:focus-visible,.iss-root [tabindex]:focus-visible{outline:3px solid Highlight!important}.iss-root [aria-selected="true"],.iss-root [aria-pressed="true"],.iss-root [aria-current]{outline:2px solid Highlight;outline-offset:-2px}}@media (prefers-contrast: more){.iss-root{--iss-line:rgba(226,232,240,.72)}.iss-panel,.iss-card,.iss-tablist{backdrop-filter:none}.iss-status-label,.iss-visual-caption,.iss-network-detail{color:#e2e8f0}}@media (prefers-reduced-motion: reduce){.iss-root *,.iss-root *:before,.iss-root *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}'
        } });
      }

      // ── 3-D station map (Three.js, self-cleaning, reduced-motion aware) ──
      function stationCanvasRef(cv) {
        if (!cv || cv._issInit) return;
        cv._issInit = true;
        function doInit(THREE) {
          var Wc = cv.clientWidth || cv.parentElement.clientWidth || 800;
          var Hc = cv.clientHeight || 420;
          var renderer;
          try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); }
          catch (err) { cv._issInit = false; return; }
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(Wc, Hc, false);
          if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
          if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.08;
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          var scene = new THREE.Scene();
          // Authored PRE tone-mapping. A plain render writes the clear colour
          // straight out, but the post-FX chain puts the background through ACES
          // like everything else, and 0x030712 came out of that as a milky navy
          // (8,31,66) — the scene read as haze rather than as space. Measured on
          // the real framebuffer: this value lands at (0,2,6) through the
          // composer, which is the black the sky was always meant to be.
          scene.background = new THREE.Color(0x000102);
          scene.fog = new THREE.FogExp2(0x000102, 0.0055);
          var camera = new THREE.PerspectiveCamera(46, Wc / Hc, 0.1, 220);
          camera.position.set(8.2, 4.8, 10.4);
          camera.lookAt(0, 0, 1);
          scene.add(new THREE.HemisphereLight(0x9bdcff, 0x081225, 0.65));
          scene.add(new THREE.AmbientLight(0x7288aa, 0.32));
          var sun = new THREE.DirectionalLight(0xfff3da, 1.65);
          // Deliberately NOT a point on the sweep above. Under reduced motion
          // the sweep never runs, so this value's only job is to be the best
          // still image of the station; it was chosen for that and photographed
          // against the alternatives.
          sun.position.set(10, 7, 5); sun.castShadow = true;
          sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
          sun.shadow.camera.left = -13; sun.shadow.camera.right = 13; sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13;
          scene.add(sun);
          var rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
          rim.position.set(-8, -2, -9); scene.add(rim);
          // Earth below. Real Natural Earth coastlines, a specular map so only
          // open water carries the sun-glint that shows up in almost every real
          // Cupola photograph, and an emissive map of city lights at real
          // coordinates so the night side is a map instead of a black gap.
          // Every step is optional: if the 2-D canvas context is unavailable the
          // planet falls back to the plain blue sphere it has always been.
          var earthQuality = (_prefersReducedMotion || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) ? 512 : 1024;
          var earthSkin = null;
          try { earthSkin = issEarthCanvases(earthQuality); } catch (e) { earthSkin = null; }
          var earthTextures = [];
          function issTexture(canvasEl, srgb) {
            var tex = new THREE.CanvasTexture(canvasEl);
            if (srgb && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
            if (THREE.RepeatWrapping) tex.wrapS = THREE.RepeatWrapping;
            try { tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); } catch (e2) {}
            earthTextures.push(tex);
            return tex;
          }
          var earthMatOpts = { color: 0x185a92, emissive: 0x061a38, specular: 0xa8e4ff, shininess: 46 };
          if (earthSkin) {
            earthMatOpts.color = 0xffffff;
            // Shininess 46 was tuned for an untextured sphere, where a broad
            // sheen read as "shiny planet". Over a real surface map that same
            // sheen is a white veil across half the disc and the coastlines
            // vanish under it. A tight, small glint is both the truer look and
            // the one that leaves the map readable.
            earthMatOpts.shininess = 130;
            earthMatOpts.specular = 0x9ec7e8;
            earthMatOpts.map = issTexture(earthSkin.day, true);
            earthMatOpts.specularMap = issTexture(earthSkin.spec, false);
            // Phong adds emissive regardless of the light direction, so the
            // cities glow faintly through daylight too. Kept low enough that
            // the day side still reads as day and the night side still reads
            // as a lit map — a custom shader would be the only exact fix and
            // is not worth the fragility here.
            earthMatOpts.emissive = 0xffffff;
            earthMatOpts.emissiveMap = issTexture(earthSkin.night, true);
            earthMatOpts.emissiveIntensity = 1.8;
          }
          var earth = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 40), new THREE.MeshPhongMaterial(earthMatOpts));
          // Only non-null when the city-light map exists, so the per-frame
          // night-lights ramp below can be a single truthiness check.
          var earthLightsMat = earthMatOpts.emissiveMap ? earth.material : null;
          earth.position.set(0, -34.5, 0); earth.receiveShadow = true;
          // Chosen by photographing the scene at six rotations and counting how
          // much land and how many city lights land in the DEFAULT view: this
          // one puts a populated, land-heavy face under the station at rest
          // instead of the middle of the Pacific.
          earth.rotation.y = 0;
          scene.add(earth);
          var cloudMatOpts = { color: 0xdff4ff, transparent: true, opacity: 0.055, depthWrite: false, shininess: 4 };
          if (earthSkin) {
            // A real cloud deck instead of a flat white haze: alpha comes from
            // the painted band map, so the deck thickens over the ITCZ and the
            // storm tracks and thins over the subtropical highs.
            cloudMatOpts.alphaMap = issTexture(earthSkin.cloud, false);
            cloudMatOpts.opacity = 0.34;
          }
          // 30.06 rather than 30.18: at this scale 30 units is Earth's radius,
          // so the old shell floated 38 km up and cast a visible offset halo at
          // the limb. Weather lives around 10 km.
          var cloudShell = new THREE.Mesh(new THREE.SphereGeometry(earthSkin ? 30.06 : 30.18, 64, 40), new THREE.MeshPhongMaterial(cloudMatOpts));
          cloudShell.position.copy(earth.position);
          cloudShell.rotation.y = earth.rotation.y;
          scene.add(cloudShell);
          // Two additive back-side shells give the limb the "thin blue line":
          // a wide outer scatter halo plus a tight, brighter airglow band right
          // at the top of the atmosphere. Additive so the bloom pass finds them.
          //
          // Both used to be one flat colour all the way round, which lit the
          // NIGHT side's limb as brightly as the day side's and skipped the most
          // recognisable thing an astronaut sees. Per-vertex colour fixes that
          // and teaches the reason: sunlight reaching the terminator takes a
          // long slant path through the atmosphere, Rayleigh scattering strips
          // the blue out of it, and what is left is the orange line every
          // orbital sunrise photograph is famous for.
          var limbShells = [];
          function makeLimbShell(radius, dayColor, warmColor, opacity) {
            var geo = new THREE.SphereGeometry(radius, 64, 40);
            var pos = geo.attributes.position;
            var colors = new Float32Array(pos.count * 3);
            var attr = new THREE.BufferAttribute(colors, 3);
            if (THREE.DynamicDrawUsage) attr.setUsage(THREE.DynamicDrawUsage);
            geo.setAttribute('color', attr);
            var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
              color: 0xffffff, vertexColors: true, transparent: true, opacity: opacity,
              side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            mesh.position.copy(earth.position);
            // The shells carry no rotation, so a local vertex direction is
            // already a world direction and the sun test needs no transform.
            var day = new THREE.Color(dayColor), warm = new THREE.Color(warmColor);
            var inv = 1 / radius;
            limbShells.push({
              mesh: mesh,
              update: function (sunDir) {
                for (var i = 0; i < pos.count; i++) {
                  var d = (pos.getX(i) * sunDir.x + pos.getY(i) * sunDir.y + pos.getZ(i) * sunDir.z) * inv;
                  // Lit limb, terminator flare, and a floor so the night limb is
                  // a faint airglow rather than a hard cut to nothing.
                  var lit = Math.max(0, Math.min(1, (d + 0.02) / 0.32));
                  var term = Math.exp(-(d / 0.13) * (d / 0.13));
                  var i3 = i * 3;
                  colors[i3] = day.r * lit + warm.r * term * 0.75 + 0.02;
                  colors[i3 + 1] = day.g * lit + warm.g * term * 0.75 + 0.03;
                  colors[i3 + 2] = day.b * lit + warm.b * term * 0.75 + 0.05;
                }
                attr.needsUpdate = true;
              }
            });
            return mesh;
          }
          var atmo = makeLimbShell(30.65, 0x67c8ff, 0xff8b3d, 0.17);
          scene.add(atmo);
          var airglow = makeLimbShell(30.3, 0xbfeeff, 0xffb056, 0.32);
          scene.add(airglow);
          // Stars, in two magnitude tiers with per-star colour. A single
          // uniform white field reads as digital dust; real starlight varies in
          // both brightness and colour temperature, and the few bright ones are
          // what give the sky depth behind the station.
          function addStarTier(count, pointSize, opacity, warmth) {
            var starGeo = new THREE.BufferGeometry();
            var starPos = new Float32Array(count * 3);
            var starCol = new Float32Array(count * 3);
            for (var si = 0; si < count; si++) {
              var sv = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.2), (Math.random() - 0.5)).normalize().multiplyScalar(90);
              starPos[si * 3] = sv.x; starPos[si * 3 + 1] = sv.y; starPos[si * 3 + 2] = sv.z;
              // temp < 0 leans blue-white (hot stars), > 0 leans amber (cool).
              var temp = (Math.random() - 0.5) * 2 * warmth;
              var dim = 0.62 + Math.random() * 0.38;
              starCol[si * 3] = Math.min(1, (1 + Math.max(0, temp) * 0.25) * dim);
              starCol[si * 3 + 1] = Math.min(1, (1 - Math.abs(temp) * 0.09) * dim);
              starCol[si * 3 + 2] = Math.min(1, (1 + Math.max(0, -temp) * 0.35) * dim);
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
            starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
            scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: pointSize, vertexColors: true, transparent: true, opacity: opacity, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending })));
          }
          addStarTier(620, 0.28, 0.78, 0.5);
          addStarTier(58, 0.62, 0.95, 0.8);

          // The Sun itself, as an additive billboard past the star sphere. It
          // anchors the light: when the day/night sweep carries it behind the
          // Earth the limb occludes it, which is exactly what an orbital
          // sunset looks like from the Cupola.
          var sunGlow = null, sunGlowTex = null;
          try {
            var glowSrc = issGlowCanvas();
            if (glowSrc) {
              sunGlowTex = new THREE.CanvasTexture(glowSrc);
              if (THREE.sRGBEncoding) sunGlowTex.encoding = THREE.sRGBEncoding;
              sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: sunGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
              scene.add(sunGlow);
            }
          } catch (e) { sunGlow = null; }

          var station = new THREE.Group();
          station.rotation.z = -0.055;
          scene.add(station);
          var clickable = [];
          var moduleDetails = [];
          var viewportMats = [];    // lit windows — brightened during orbital night
          // Solar-cell materials grouped BY WING (parallel to `wings`). Both panels
          // on a wing share its orientation, so the glint pass decomposes one world
          // quaternion per wing instead of one per panel.
          var wingPanelMats = [];
          MODULES.forEach(function (m) {
            var len = m.size[1], rad = m.size[0];
            var geo, mesh;
            var mat = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.38, metalness: 0.54, transparent: true, emissive: 0x000000 });
            if (m.id === 'truss') {
              geo = new THREE.BoxGeometry(len, m.size[0], m.size[0]);
              mesh = new THREE.Mesh(geo, mat);
            } else if (m.id === 'cupola') {
              geo = new THREE.SphereGeometry(rad, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
              mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.3, metalness: 0.56, transparent: true, emissive: 0x000000 }));
              mesh.rotation.x = Math.PI; // dome faces Earth (nadir)
            } else {
              geo = new THREE.CylinderGeometry(rad, rad, len, 20);
              mesh = new THREE.Mesh(geo, mat);
              if (m.axis === 'z') mesh.rotation.x = Math.PI / 2;
              else if (m.axis === 'x') mesh.rotation.z = Math.PI / 2;
            }
            mesh.position.set(m.pos[0], m.pos[1], m.pos[2]);
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh._issId = m.id;
            station.add(mesh);
            clickable.push(mesh);
            // Docking collars and a small illuminated viewport give each
            // pressurized module readable scale and silhouette.
            if (m.id !== 'truss' && m.id !== 'cupola') {
              var collarMat = new THREE.MeshStandardMaterial({ color: 0xaab7c6, roughness: 0.32, metalness: 0.68 });
              [-1, 1].forEach(function (capSide) {
                var ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 1.01, 0.035, 8, 28), collarMat);
                ring.position.copy(mesh.position);
                if (m.axis === 'z') { ring.position.z += capSide * len * 0.49; }
                else if (m.axis === 'x') { ring.position.x += capSide * len * 0.49; ring.rotation.y = Math.PI / 2; }
                else { ring.position.y += capSide * len * 0.49; ring.rotation.x = Math.PI / 2; }
                ring.castShadow = true; ring._issParentId = m.id; station.add(ring); moduleDetails.push(ring);
              });
              [-0.26, 0, 0.26].forEach(function (seamOffset) {
                var seam = new THREE.Mesh(new THREE.TorusGeometry(rad * 1.008, 0.012, 6, 24), collarMat);
                seam.position.copy(mesh.position);
                if (m.axis === 'z') { seam.position.z += seamOffset * len; }
                else if (m.axis === 'x') { seam.position.x += seamOffset * len; seam.rotation.y = Math.PI / 2; }
                else { seam.position.y += seamOffset * len; seam.rotation.x = Math.PI / 2; }
                seam._issParentId = m.id; station.add(seam); moduleDetails.push(seam);
              });
              var viewport = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8ee7ff }));
              viewport.position.set(m.pos[0], m.pos[1] + rad * 0.78, m.pos[2]);
              viewport._issParentId = m.id; station.add(viewport); moduleDetails.push(viewport);
              viewportMats.push(viewport.material);
            }
          });
          // Solar array wings: 4 pairs along truss (gold panels) — these rotate to track the Sun
          var wings = [];
          [-5.0, -3.6, 3.6, 5.0].forEach(function (tx, wi) {
            var wingGroup = new THREE.Group();
            wingGroup.position.set(tx, 0.35, -1.6);
            var thisWingMats = [];
            [1, -1].forEach(function (side) {
              var panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.026, 3.4), new THREE.MeshStandardMaterial({ color: 0xb77918, roughness: 0.32, metalness: 0.68, emissive: 0x2f2005 }));
              panel.position.set(0, 0, side * 2.0); panel.castShadow = true;
              wingGroup.add(panel);
              thisWingMats.push(panel.material);
              var cellMat = new THREE.MeshBasicMaterial({ color: 0xf8c85d, transparent: true, opacity: 0.68 });
              for (var gridRow = -2; gridRow <= 2; gridRow++) {
                var rowLine = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.032, 0.018), cellMat);
                rowLine.position.set(0, 0.018, side * 2.0 + gridRow * 0.56); wingGroup.add(rowLine);
              }
              [-0.3, 0.3].forEach(function (gridX) {
                var columnLine = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.032, 3.42), cellMat);
                columnLine.position.set(gridX, 0.018, side * 2.0); wingGroup.add(columnLine);
              });
              var boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0xb6c2cf, metalness: 0.7, roughness: 0.35 }));
              boom.rotation.x = Math.PI / 2;
              boom.position.set(0, 0, side * 1.9);
              wingGroup.add(boom);
            });
            wingGroup.rotation.z = 0.25 + wi * 0.08;
            station.add(wingGroup);
            wings.push(wingGroup);
            wingPanelMats.push(thisWingMats);
          });
          // Radiators (white panels, perpendicular-ish to arrays)
          [-2.4, 2.4].forEach(function (tx) {
            var radp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 2.2), new THREE.MeshStandardMaterial({ color: 0xe7edf4, roughness: 0.85 }));
            radp.position.set(tx, -0.55, -1.6);
            station.add(radp);
            for (var louver = -3; louver <= 3; louver++) {
              var louverLine = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.018, 2.12), new THREE.MeshBasicMaterial({ color: 0x9aa9b8 }));
              louverLine.position.set(tx, -0.55 + louver * .18, -1.6); station.add(louverLine);
            }
          });
          // A lightweight truss lattice makes the station's 109-meter
          // backbone read as structure instead of a single solid bar.
          var trussBraceMat = new THREE.MeshStandardMaterial({ color: 0x8391a3, metalness: .72, roughness: .38 });
          for (var braceX = -5; braceX < 5; braceX += .5) {
            var brace = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .72, 5), trussBraceMat);
            brace.position.set(braceX + .25, .35, -1.6);
            brace.rotation.z = Math.PI / 4 * (Math.round((braceX + 5) * 2) % 2 ? 1 : -1);
            station.add(brace);
          }
          // Canadarm2 — two-segment arm on the truss. The segments are placed
          // from a shared elbow so the arm reads as one jointed limb: the boom
          // ends were previously set independently and did not meet, which drew
          // two disconnected sticks. A cylinder's axis for rotation.z = a is
          // (-sin a, cos a), so each segment's centre sits half a length along
          // that axis from the joint it grows out of.
          var armMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.5 });
          var armJointMat = new THREE.MeshStandardMaterial({ color: 0xb9b3a2, roughness: 0.35, metalness: 0.6 });
          var armBase = new THREE.Vector3(1.251, 0.315, -1.6);   // latched to the truss
          var armAngle1 = 0.7, armLen1 = 1.4, armAngle2 = -1.2, armLen2 = 1.2;
          var armAxis1 = new THREE.Vector3(-Math.sin(armAngle1), Math.cos(armAngle1), 0);
          var armAxis2 = new THREE.Vector3(-Math.sin(armAngle2), Math.cos(armAngle2), 0);
          var armElbow = armBase.clone().add(armAxis1.clone().multiplyScalar(armLen1));
          var armTip = armElbow.clone().add(armAxis2.clone().multiplyScalar(armLen2));
          var arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, armLen1, 8), armMat);
          arm1.position.copy(armBase.clone().add(armAxis1.clone().multiplyScalar(armLen1 / 2))); arm1.rotation.z = armAngle1;
          var arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, armLen2, 8), armMat);
          arm2.position.copy(armElbow.clone().add(armAxis2.clone().multiplyScalar(armLen2 / 2))); arm2.rotation.z = armAngle2;
          arm1.castShadow = true; arm2.castShadow = true;
          station.add(arm1); station.add(arm2);
          [[armBase, 0.075], [armElbow, 0.07]].forEach(function (joint) {
            var knuckle = new THREE.Mesh(new THREE.SphereGeometry(joint[1], 12, 10), armJointMat);
            knuckle.position.copy(joint[0]); knuckle.castShadow = true; station.add(knuckle);
          });
          // Latching end effector — the business end that grapples visiting cargo.
          var armHand = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.16, 10), armJointMat);
          armHand.position.copy(armTip); armHand.rotation.z = armAngle2; armHand.castShadow = true;
          station.add(armHand);

          // ── Visiting vehicles ────────────────────────────────────────────
          // The real station is almost never alone: a crew or cargo Dragon sits
          // on Harmony's forward port and a Progress freighter on Zvezda's aft
          // port for most of any given month, and the aft freighter is what
          // performs the reboosts the Systems tab talks about. They are
          // attached as details of the module they are docked to, so the
          // cutaway control dims them with their host.
          function addVisitor(mesh, hostId) {
            mesh.castShadow = true;
            mesh._issParentId = hostId;
            station.add(mesh); moduleDetails.push(mesh);
            return mesh;
          }
          var hullMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.35, transparent: true });
          var trunkMat = new THREE.MeshStandardMaterial({ color: 0xd7dde5, roughness: 0.5, metalness: 0.3, transparent: true });
          var arrayMat = new THREE.MeshStandardMaterial({ color: 0x1e2f57, roughness: 0.3, metalness: 0.7, emissive: 0x0a1836, transparent: true, side: THREE.DoubleSide });
          // Dragon: cone-shaped capsule nose-in to Harmony (z = -4.2), trunk
          // behind it with the body-mounted solar cells that replaced the old
          // deployable wings.
          var dragonNose = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), trunkMat);
          dragonNose.rotation.x = Math.PI / 2; dragonNose.position.set(0, 0, -4.26);
          addVisitor(dragonNose, 'harmony');
          var dragonCap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 16), hullMat);
          dragonCap.rotation.x = -Math.PI / 2; dragonCap.position.set(0, 0, -4.68);
          addVisitor(dragonCap, 'harmony');
          var dragonTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.82, 16), trunkMat);
          dragonTrunk.rotation.x = Math.PI / 2; dragonTrunk.position.set(0, 0, -5.45);
          addVisitor(dragonTrunk, 'harmony');
          var dragonCells = new THREE.Mesh(new THREE.CylinderGeometry(0.308, 0.308, 0.7, 16, 1, true, -Math.PI * 0.62, Math.PI * 1.24), arrayMat);
          dragonCells.rotation.x = Math.PI / 2; dragonCells.position.set(0, 0, -5.45);
          addVisitor(dragonCells, 'harmony');
          // Progress: freighter on Zvezda's aft port (z = +6.2), the end of the
          // station its engines push against during a reboost.
          var progressCargo = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.7, 14), hullMat);
          progressCargo.rotation.x = Math.PI / 2; progressCargo.position.set(0, 0, 6.58);
          addVisitor(progressCargo, 'zvezda');
          var progressBus = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.52, 14), trunkMat);
          progressBus.rotation.x = Math.PI / 2; progressBus.position.set(0, 0, 7.16);
          addVisitor(progressBus, 'zvezda');
          [-1, 1].forEach(function (side) {
            var wingPanel = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.02, 0.52), arrayMat);
            wingPanel.position.set(side * 0.74, 0, 7.16);
            addVisitor(wingPanel, 'zvezda');
          });
          var progressBell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x3f4a5a, roughness: 0.55, metalness: 0.5, transparent: true }));
          progressBell.rotation.x = Math.PI / 2; progressBell.position.set(0, 0, 7.49);
          addVisitor(progressBell, 'zvezda');

          // Selection highlight
          // Brightened past the bloom threshold so the ring reads as a glowing
          // halo. Kept on normal blending, not additive: additive would wash the
          // ring out against the white radiators and lose the selection cue.
          var selRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0x9beeff }));
          selRing.visible = false;
          scene.add(selRing);

          var raycaster = new THREE.Raycaster();
          var mouseV = new THREE.Vector2();
          function pick(ev) {
            var rect = cv.getBoundingClientRect();
            mouseV.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
            mouseV.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouseV, camera);
            var hits = raycaster.intersectObjects(clickable, false);
            if (hits.length) {
              var id = hits[0].object._issId;
              var mm = null;
              for (var mi2 = 0; mi2 < MODULES.length; mi2++) { if (MODULES[mi2].id === id) { mm = MODULES[mi2]; break; } }
              upd({ selModule: id });
              markSeen('seenModules', id);
              if (mm) announceToSR(mm.name + ' ' + 'selected. Details shown below the map.');
              if (typeof awardXP === 'function') { try { awardXP(1); } catch (e) {} }
            }
          }
          cv.addEventListener('click', pick);
          cv.style.cursor = 'pointer';
          // Without this, a touch drag on the canvas is claimed by the browser
          // for page scrolling: the pointer stream is cancelled and the station
          // never rotates, so drag-to-rotate was dead on touchscreen
          // Chromebooks and tablets. The thruster buttons in this same tool
          // already set it. Trade-off accepted: the page no longer scrolls from
          // ON the canvas (there is ample surface around it), and rotating the
          // 3-D map is this surface's whole point.
          cv.style.touchAction = 'none';

          // Simple orbit-drag controls (pointer drag rotates the whole station group)
          var dragging = false, px0 = 0, py0 = 0, cameraTween = null, cameraFocusId = null;
          function onDown(e) { dragging = true; cameraTween = null; cameraFocusId = null; px0 = e.clientX; py0 = e.clientY; }
          function onMove(e) {
            if (!dragging) return;
            station.rotation.y += (e.clientX - px0) * 0.005;
            station.rotation.x = Math.max(-0.7, Math.min(0.7, station.rotation.x + (e.clientY - py0) * 0.003));
            px0 = e.clientX; py0 = e.clientY;
          }
          function onUp() { dragging = false; }
          function onKey(e) {
            var handled = true;
            if (e.key === 'ArrowLeft') station.rotation.y -= .12;
            else if (e.key === 'ArrowRight') station.rotation.y += .12;
            else if (e.key === 'ArrowUp') station.rotation.x = Math.max(-.7, station.rotation.x - .09);
            else if (e.key === 'ArrowDown') station.rotation.x = Math.min(.7, station.rotation.x + .09);
            else if ((e.key === '+' || e.key === '=') && camera.position.length() > 6) camera.position.multiplyScalar(.9);
            else if ((e.key === '-' || e.key === '_') && camera.position.length() < 28) camera.position.multiplyScalar(1.1);
            else if (e.key === 'Home') { cv._issSetView('overview'); upd({ mapView: 'overview' }); announceToSR('Station camera returned to overview.'); }
            else handled = false;
            if (handled) { e.preventDefault(); if (e.key !== 'Home') { cameraTween = null; cameraFocusId = null; } }
          }
          cv.addEventListener('pointerdown', onDown);
          cv.addEventListener('keydown', onKey);
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          // pointercancel fires instead of pointerup when a gesture is taken over
          // (or a touch is interrupted). Without it `dragging` sticks true, which
          // also permanently freezes the idle auto-rotation, since that is gated
          // on !dragging.
          window.addEventListener('pointercancel', onUp);
          cv._issSetView = function (name) {
            cameraFocusId = null;
            var views = {
              overview: { camera: [8.2, 4.8, 10.4], target: [0, 0, 1], rotation: [-0.08, 0.15, -0.055] },
              truss: { camera: [0, 6.8, 10.8], target: [0, 0, -1.6], rotation: [0, 0, 0] },
              labs: { camera: [6.8, 2.4, -7.8], target: [0, 0, -2.8], rotation: [0, 0.25, -0.04] },
              russian: { camera: [5.8, 2.2, 11.8], target: [0, 0, 4.1], rotation: [0, -0.2, -0.04] },
              // Earth's surface sits at y = -4.5 in this scene (centre -34.5,
              // radius 30), so the old nadir camera at y = -11.5 was INSIDE the
              // planet: the "Earth-facing" button showed a flat pale wash — the
              // inside of the atmosphere shells — and no Earth at all. Sitting
              // just above the surface and looking up at the station's belly is
              // the view the button has always promised.
              nadir: { camera: [0, -3.9, 5.6], target: [0, 0, .5], rotation: [0, 0, 0] }
            };
            var view = views[name] || views.overview;
            if (_prefersReducedMotion) {
              camera.position.set(view.camera[0], view.camera[1], view.camera[2]); camera.lookAt(view.target[0], view.target[1], view.target[2]);
              station.rotation.set(view.rotation[0], view.rotation[1], view.rotation[2]);
            } else {
              cameraTween = { progress: 0, fromCamera: camera.position.clone(), toCamera: new THREE.Vector3(view.camera[0], view.camera[1], view.camera[2]), fromRotation: [station.rotation.x, station.rotation.y, station.rotation.z], toRotation: view.rotation.slice(), target: new THREE.Vector3(view.target[0], view.target[1], view.target[2]) };
            }
            announceToSR(name + ' camera view selected.');
          };
          cv._issFocusModule = function (id) {
            var focused = null;
            for (var focusIndex = 0; focusIndex < clickable.length; focusIndex++) { if (clickable[focusIndex]._issId === id) { focused = clickable[focusIndex]; break; } }
            if (!focused) return;
            station.updateMatrixWorld(true);
            var focusTarget = new THREE.Vector3(); focused.getWorldPosition(focusTarget);
            var focusDirection = camera.position.clone().sub(focusTarget);
            if (focusDirection.lengthSq() < .01) focusDirection.set(1, .5, 1);
            var focusDistance = Math.max(4.8, Math.min(7.2, (focused.geometry.boundingSphere ? focused.geometry.boundingSphere.radius * 3.2 : 5.4)));
            var focusCamera = focusTarget.clone().add(focusDirection.normalize().multiplyScalar(focusDistance));
            cameraFocusId = id;
            if (_prefersReducedMotion) { camera.position.copy(focusCamera); camera.lookAt(focusTarget); }
            else { cameraTween = { progress: 0, fromCamera: camera.position.clone(), toCamera: focusCamera, fromRotation: [station.rotation.x, station.rotation.y, station.rotation.z], toRotation: [station.rotation.x, station.rotation.y, station.rotation.z], target: focusTarget }; }
            announceToSR('Camera centered on ' + id + '.');
          };
          var resizeObserver = null;
          function resizeScene() {
            if (!cv.isConnected) return;
            var nextW = cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || Wc;
            var nextH = cv.clientHeight || Hc;
            if (nextW === Wc && nextH === Hc) return;
            Wc = nextW; Hc = nextH;
            camera.aspect = Wc / Math.max(1, Hc); camera.updateProjectionMatrix();
            renderer.setSize(Wc, Hc, false);
            if (composer) { try { composer.setSize(Math.max(1, Math.round(Wc * bloomRes)), Math.max(1, Math.round(Hc * bloomRes))); } catch (e) {} }
          }
          if (window.ResizeObserver) { resizeObserver = new window.ResizeObserver(resizeScene); resizeObserver.observe(cv); }
          else { window.addEventListener('resize', resizeScene); }

          // ── Post-FX bloom (guarded; same graceful pattern as solarsystem/moonmission) ──
          // Orbit is the darkest scene in the Lab, so the sunlit arrays, the lit
          // viewports, the atmospheric limb and the selection ring all want a real
          // glow. Plain render until the r128 addons load; every step try/caught so
          // a CDN miss can never blank the station. Kill-switch + low-power tier.
          var composer = null, bloomRes = 1;
          (function setupBloom() {
            if (window.AlloPostFXEnabled === false) return;
            var ensure = function (cb) {
              if (window.THREE && window.THREE.EffectComposer && window.THREE.UnrealBloomPass) { cb(); return; }
              var urls = [
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'
              ];
              var i = 0;
              (function nextScript() {
                if (i >= urls.length) { cb(); return; }
                var s = document.createElement('script');
                s.src = urls[i]; s.onload = function () { i++; nextScript(); }; s.onerror = function () { i++; nextScript(); };
                document.head.appendChild(s);
              })();
            };
            ensure(function () {
              try {
                var T = window.THREE;
                if (!T || !T.EffectComposer || !T.RenderPass || !T.UnrealBloomPass || !cv.isConnected) return;
                var lowPower = _prefersReducedMotion || (!!navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
                bloomRes = lowPower ? 0.5 : 1;
                var c = new T.EffectComposer(renderer);
                c.addPass(new T.RenderPass(scene, camera));
                // Threshold 0.82: high enough that the white radiators and hull
                // labels stay crisp, low enough that the lit viewports and the
                // array glint (both pushed above it deliberately) actually bloom.
                c.addPass(new T.UnrealBloomPass(new T.Vector2(Math.max(1, Math.round(Wc * bloomRes)), Math.max(1, Math.round(Hc * bloomRes))), lowPower ? 0.62 : 0.85, 0.4, 0.82));
                composer = c;
                renderer._alloComposer = c;
              } catch (e) { composer = null; }
            });
          })();

          // Reusable temporaries for the per-frame lighting pass (no per-frame allocation).
          var _sunDir = new THREE.Vector3(), _wingQ = new THREE.Quaternion(), _wingNormal = new THREE.Vector3();
          var _axisOrigin = new THREE.Vector3(), _axisEnd = new THREE.Vector3();
          var _lastFrameSig = '';
          var _lastLimbSun = new THREE.Vector3(), _limbPainted = false;

          var tick = 0, rafId = 0;
          function animate() {
            if (!cv.isConnected) { cleanup(); return; }
            tick++;
            if (cameraTween) {
              cameraTween.progress = Math.min(1, cameraTween.progress + .035);
              var tweenEase = 1 - Math.pow(1 - cameraTween.progress, 3);
              camera.position.lerpVectors(cameraTween.fromCamera, cameraTween.toCamera, tweenEase);
              station.rotation.set(cameraTween.fromRotation[0] + (cameraTween.toRotation[0] - cameraTween.fromRotation[0]) * tweenEase, cameraTween.fromRotation[1] + (cameraTween.toRotation[1] - cameraTween.fromRotation[1]) * tweenEase, cameraTween.fromRotation[2] + (cameraTween.toRotation[2] - cameraTween.fromRotation[2]) * tweenEase);
              camera.lookAt(cameraTween.target);
              if (cameraTween.progress >= 1) cameraTween = null;
            }
            if (!_prefersReducedMotion) {
              if (!dragging && !cameraTween) station.rotation.y += 0.0016;
              wings.forEach(function (w, i) { w.rotation.z += 0.0012 + i * 0.0001; }); // sun-tracking alpha joints
              // The ground track: the planet turns under the station, and the
              // cloud deck turns very slightly faster than the surface it sits
              // on, which is the wind.
              earth.rotation.y += 0.00042;
              cloudShell.rotation.y += 0.00057;
              // Orbital day and night. The sweep used to circle the station in a
              // HORIZONTAL plane, which kept the Sun permanently above the
              // planet: the station dimmed on cue but the Earth's near face was
              // lit at every point in the orbit, so it never had a night side at
              // all. Circling in a plane that contains the Earth-station line
              // makes "the station is eclipsed" and "the ground below is in
              // darkness" the same event — which is what they are.
              // The horizontal leg swings through z as well as x. With z pinned
              // at +4.5 the Sun stayed behind the camera for the entire sweep —
              // projecting it for all 360° of the orbit and all five camera
              // presets, it never came within 1.9 frame-widths of the overview,
              // so the Sun the whole day/night model turns on was permanently
              // off screen. Tilting the sweep plane costs nothing (any plane
              // containing the Earth-station line still gives a terminator) and
              // brings the Sun into the landing view right at orbital sunset.
              var sa = tick * 0.002;
              sun.position.set(Math.cos(sa) * 10, Math.sin(sa) * 9.5, Math.cos(sa) * 4.5);
              sun.intensity = 0.55 + 0.7 * Math.max(0, Math.sin(sa));    // orbital "night" dims the station
            }
            if (sunGlow) {
              // Parked far out along the light's own direction so the Earth's
              // limb can eclipse it, and turned to face the camera every frame.
              sunGlow.position.copy(sun.position).normalize().multiplyScalar(78);
              sunGlow.lookAt(camera.position);
            }
            // Sunlit-vs-eclipsed drives two real, teachable details: an array only
            // flashes when its tracking joint has brought it face-on to the Sun
            // (that is WHY the alpha joints rotate), and the station's lit windows
            // only stand out once the Sun has set. Both go quiet during eclipse,
            // because in eclipse there is no sunlight to reflect.
            var daylight01 = Math.max(0, Math.min(1, (sun.intensity - 0.55) / 0.7));
            _sunDir.copy(sun.position).normalize();
            // Repaint the limb only when the Sun has actually moved enough to
            // change it — every 4th frame at most, and never at all while the
            // scene is frozen for reduced motion. 2,665 vertices per shell is
            // cheap once and wasteful sixty times a second.
            if (tick % 4 === 0 && limbShells.length) {
              var limbMoved = _sunDir.distanceToSquared(_lastLimbSun) > 1e-5;
              if (limbMoved || !_limbPainted) {
                for (var ls = 0; ls < limbShells.length; ls++) limbShells[ls].update(_sunDir);
                _lastLimbSun.copy(_sunDir);
                _limbPainted = true;
              }
            }
            for (var wi2 = 0; wi2 < wings.length; wi2++) {
              wings[wi2].getWorldQuaternion(_wingQ);
              _wingNormal.set(0, 1, 0).applyQuaternion(_wingQ);
              var incidence = Math.abs(_wingNormal.dot(_sunDir));
              var glint = daylight01 * Math.pow(incidence, 3);
              var wingMats = wingPanelMats[wi2] || [];
              for (var pi = 0; pi < wingMats.length; pi++) {
                wingMats[pi].emissive.setRGB(0.18 + 0.77 * glint, 0.12 + 0.6 * glint, 0.02 + 0.26 * glint);
              }
            }
            var lampOn = 1 - daylight01;
            // City lights come up as the station crosses into orbital night and
            // fade out in daylight. Phong adds emissive regardless of where the
            // Sun is, so a fixed intensity either blows the lights to white over
            // the day side or leaves them invisible over the night side; driving
            // them from the same daylight term the windows and the array glint
            // use puts them where they belong. This is also true to life: you
            // cannot see a city's lights from orbit at local noon.
            if (earthLightsMat) earthLightsMat.emissiveIntensity = 0.1 + 1.45 * lampOn;
            for (var vi = 0; vi < viewportMats.length; vi++) {
              viewportMats[vi].color.setRGB(0.42 + 0.32 * lampOn, 0.62 + 0.33 * lampOn, 0.72 + 0.28 * lampOn);
            }
            // keep the highlight on the selected module
            var curSel = null;
            var wantId = (setLabToolData && cv._issWantSel) || null;
            var cutaway = !!cv._issCutaway;
            for (var ci = 0; ci < clickable.length; ci++) {
              var candidate = clickable[ci], isSelected = candidate._issId === wantId;
              if (isSelected) curSel = candidate;
              if (candidate.material) {
                candidate.material.opacity = cutaway && !isSelected ? .18 : 1;
                if (candidate.material.emissive && candidate.material.emissive.setHex) candidate.material.emissive.setHex(isSelected ? 0x073b55 : 0x000000);
              }
            }
            for (var di = 0; di < moduleDetails.length; di++) {
              var detail = moduleDetails[di], detailSelected = detail._issParentId === wantId;
              if (detail.material) {
                detail.material.transparent = true;
                detail.material.opacity = cutaway && !detailSelected ? .1 : 1;
              }
            }
            if (curSel) {
              selRing.visible = true;
              curSel.getWorldPosition(selRing.position);
              selRing.lookAt(camera.position);
              var sc = 0.55 + (curSel.geometry.boundingSphere ? curSel.geometry.boundingSphere.radius * 0.45 : 0.5);
              selRing.scale.setScalar(_prefersReducedMotion ? sc : sc * (1 + 0.05 * Math.sin(tick * 0.08)));
              if (cameraFocusId === wantId && !cameraTween) camera.lookAt(selRing.position);
              var marker = cv.parentElement && cv.parentElement.querySelector('[data-iss-module-marker]');
              if (marker) {
                var projected = selRing.position.clone().project(camera);
                marker.style.left = ((projected.x * .5 + .5) * 100).toFixed(2) + '%';
                marker.style.top = ((-.5 * projected.y + .5) * 100).toFixed(2) + '%';
                marker.style.opacity = projected.z > -1 && projected.z < 1 ? '1' : '0';
              }
            } else { selRing.visible = false; }
            var phaseChip = cv.parentElement && cv.parentElement.querySelector('[data-iss-light-phase]');
            if (phaseChip && tick % 12 === 0) {
              var daylight = sun.intensity >= .78;
              phaseChip.textContent = daylight ? '☀ SUNLIGHT' : '◐ ECLIPSE';
              phaseChip.setAttribute('data-phase', daylight ? 'sunlight' : 'eclipse');
            }
            // A projected axis triad stays truthful as the camera and station
            // move. It gives the engineering directions a spatial referent
            // without covering the model with permanent labels.
            if (tick % 3 === 0) {
              var orientationWidget = cv.parentElement && cv.parentElement.querySelector('[data-iss-orientation-widget]');
              if (orientationWidget) {
                _axisOrigin.set(0, 0, 0); station.localToWorld(_axisOrigin); _axisOrigin.project(camera);
                [['x',1,0,0],['y',0,1,0],['z',0,0,1]].forEach(function (axisInfo) {
                  _axisEnd.set(axisInfo[1], axisInfo[2], axisInfo[3]); station.localToWorld(_axisEnd); _axisEnd.project(camera);
                  var axisDx = _axisEnd.x - _axisOrigin.x, axisDy = -(_axisEnd.y - _axisOrigin.y);
                  var axisLength = Math.sqrt(axisDx * axisDx + axisDy * axisDy) || 1;
                  var axisLine = orientationWidget.querySelector('[data-iss-axis="' + axisInfo[0] + '"]');
                  if (axisLine) { axisLine.setAttribute('x2', String(42 + axisDx / axisLength * 25)); axisLine.setAttribute('y2', String(42 + axisDy / axisLength * 25)); }
                });
              }
            }
            // Under reduced motion nothing in this scene moves on its own, so a
            // full WebGL pass plus three bloom passes every frame would burn a
            // classroom Chromebook's battery redrawing an identical image. Keep
            // the rAF loop ALIVE (the safe pattern — no re-arm wiring to get
            // wrong) and skip only redundant draws, with a forced repaint about
            // twice a second so a discarded drawing buffer can never strand a
            // blank canvas. The composer flag is in the signature because bloom
            // loads asynchronously and must trigger one repaint when it lands.
            if (_prefersReducedMotion) {
              var q = camera.quaternion;
              var frameSig = wantId + '|' + (cutaway ? 1 : 0) +
                '|' + camera.position.x.toFixed(3) + ',' + camera.position.y.toFixed(3) + ',' + camera.position.z.toFixed(3) +
                '|' + q.x.toFixed(4) + ',' + q.y.toFixed(4) + ',' + q.z.toFixed(4) + ',' + q.w.toFixed(4) +
                '|' + station.rotation.x.toFixed(4) + ',' + station.rotation.y.toFixed(4) +
                '|' + Wc + 'x' + Hc + '|' + (composer ? 1 : 0) + '|' + (_limbPainted ? 1 : 0);
              if (frameSig === _lastFrameSig && tick % 120 !== 0) { rafId = requestAnimationFrame(animate); return; }
              _lastFrameSig = frameSig;
            }
            if (composer) { try { composer.render(); } catch (e) { composer = null; renderer.render(scene, camera); } }
            else renderer.render(scene, camera);
            rafId = requestAnimationFrame(animate);
          }
          function cleanup() {
            cancelAnimationFrame(rafId);
            cv.removeEventListener('click', pick);
            cv.removeEventListener('pointerdown', onDown);
            cv.removeEventListener('keydown', onKey);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            if (resizeObserver) resizeObserver.disconnect(); else window.removeEventListener('resize', resizeScene);
            try { if (composer && typeof composer.dispose === 'function') composer.dispose(); } catch (e) {}
            // The source canvases are cached and reused; the GPU-side textures
            // are per-renderer and must go with it.
            try { earthTextures.forEach(function (tex) { if (tex && typeof tex.dispose === 'function') tex.dispose(); }); } catch (e) {}
            try { if (sunGlowTex && typeof sunGlowTex.dispose === 'function') sunGlowTex.dispose(); } catch (e) {}
            try { renderer._alloComposer = null; } catch (e) {}
            composer = null;
            try { renderer.dispose(); } catch (e) {}
            cv._issInit = false;
          }
          cv._issCleanup = cleanup;
          clickable.forEach(function (c) { if (c.geometry && !c.geometry.boundingSphere) c.geometry.computeBoundingSphere(); });
          animate();
        }
        if (window.THREE) { doInit(window.THREE); }
        else {
          // Shared resilient loader: multi-CDN fallback + timeout (host provides it).
          window.StemLab.ensureThree({ orbit: false }).then(function () { if (window.THREE && cv.isConnected) doInit(window.THREE); else cv._issInit = false; }).catch(function () { cv._issInit = false; });
        }
      }

      // -- Connected 3-D interior (momentum, hatches, hazards, cleanup) --
      function interiorCanvasRef(cv) {
        if (!cv || cv._issInteriorInit) return;
        cv._issInteriorInit = true;

        function showInteriorFallback(message) {
          cv._issInteriorInit = false;
          cv.setAttribute('data-iss-webgl', 'unavailable');
          var shell = cv.closest ? cv.closest('[data-iss-interior-sim]') : null;
          if (shell) {
            shell.setAttribute('data-iss-webgl-state', 'unavailable');
            var unavailableControls = shell.querySelectorAll('.iss-interior-controls button');
            for (var controlIndex = 0; controlIndex < unavailableControls.length; controlIndex++) unavailableControls[controlIndex].disabled = true;
          }
          var warning = shell && shell.querySelector('[data-iss-interior-fallback]');
          if (warning) {
            warning.hidden = false;
            warning.textContent = message || 'The 3-D view is unavailable on this device. Choose Accessible diagram to keep exploring every room and activity.';
          }
          cv.style.display = 'none';
        }

        function doInit(THREE) {
          var Wc = cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 720;
          var Hc = cv.clientHeight || 410;
          var renderer;
          try {
            renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'default' });
          } catch (err) {
            showInteriorFallback('This browser could not start the 3-D cabin. Choose Accessible diagram to keep exploring every room and activity.');
            return;
          }
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
          renderer.setSize(Wc, Hc, false);
          renderer.setClearColor(0x02050c, 1);
          if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
          if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 0.92;

          var scene = new THREE.Scene();
          scene.background = new THREE.Color(0x02050c);
          scene.fog = new THREE.Fog(0x02050c, 17, 40);
          var camera = new THREE.PerspectiveCamera(70, Wc / Hc, 0.05, 70);
          camera.rotation.order = 'YXZ';
          scene.add(new THREE.HemisphereLight(0xdff5ff, 0x050912, 0.48));
          scene.add(new THREE.AmbientLight(0x7890a8, 0.16));
          var workLight = new THREE.DirectionalLight(0xe8f6ff, 0.5);
          workLight.position.set(4, 7, -8);
          scene.add(workLight);

          var roomDefs = INTERIOR_3D_LAYOUT.map(function (def) {
            return {
              id: def.id, center: new THREE.Vector3(def.center[0], def.center[1], def.center[2]),
              axis: def.axis, length: def.length, radius: def.radius, color: def.color,
              facing: def.facing.slice()
            };
          });
          function roomDef(id) {
            return roomDefs.find(function (item) { return item.id === id; }) || roomDefs[0];
          }
          function roomInfo(id) {
            return INTERIOR_ROOMS.find(function (item) { return item.id === id; }) || INTERIOR_ROOMS[0];
          }
          function orientCylinder(object, axis) {
            if (axis === 'z') object.rotation.x = Math.PI / 2;
            else if (axis === 'x') object.rotation.z = Math.PI / 2;
          }
          function orientRing(object, axis) {
            if (axis === 'x') object.rotation.y = Math.PI / 2;
            else if (axis === 'y') object.rotation.x = Math.PI / 2;
          }
          function setAxisPosition(vector, axis, value) {
            if (axis === 'x') vector.x = value;
            else if (axis === 'y') vector.y = value;
            else vector.z = value;
          }
          function makeBox(size, position, material) {
            var mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
            mesh.position.set(position[0], position[1], position[2]);
            scene.add(mesh);
            return mesh;
          }
          function standardMat(color, emissive) {
            return new THREE.MeshStandardMaterial({
              color: color, emissive: emissive || 0x000000, roughness: 0.58, metalness: 0.24
            });
          }

          var labelTextures = [];
          var shellMat = new THREE.MeshStandardMaterial({
            color: 0x8d9aaa, emissive: 0x060b11, roughness: 0.76, metalness: 0.16,
            side: THREE.BackSide, transparent: true, opacity: 0.42, depthWrite: false
          });
          var panelMat = standardMat(0x9da9b7, 0x070d14);
          var rackMat = standardMat(0x26354a, 0x030812);
          var bulkheadMat = standardMat(0x536171, 0x03070c);
          var railBlue = standardMat(0x1976d2, 0x06214b);
          var railGold = standardMat(0xd79a24, 0x382206);
          var screenMat = new THREE.MeshStandardMaterial({ color: 0x8ed8f8, emissive: 0x1c89b7, roughness: 0.34, metalness: 0.12 });
          var hatchMat = new THREE.MeshStandardMaterial({ color: 0xdde6ef, emissive: 0x21384d, roughness: 0.32, metalness: 0.68 });
          var guideMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.62 });
          var lightStripMat = new THREE.MeshBasicMaterial({ color: 0xe7f6ff });

          function addModulePlacard(def, index) {
            var labelCanvas = document.createElement('canvas');
            labelCanvas.width = 512; labelCanvas.height = 128;
            var labelContext = labelCanvas.getContext('2d');
            if (!labelContext) return;
            var accent = '#' + ('000000' + def.color.toString(16)).slice(-6);
            labelContext.fillStyle = 'rgba(3,9,18,.94)';
            labelContext.fillRect(0, 0, 512, 128);
            labelContext.fillStyle = accent;
            labelContext.fillRect(0, 0, 18, 128);
            labelContext.strokeStyle = accent;
            labelContext.lineWidth = 5;
            labelContext.strokeRect(3, 3, 506, 122);
            labelContext.fillStyle = '#f8fafc';
            labelContext.font = '900 48px Arial, sans-serif';
            labelContext.fillText(roomInfo(def.id).module.toUpperCase(), 42, 61);
            labelContext.fillStyle = '#9fb2c8';
            labelContext.font = '700 20px Arial, sans-serif';
            labelContext.fillText('CREW MODULE // ' + String(index + 1).padStart(2, '0'), 43, 98);
            var labelTexture = THREE.CanvasTexture ? new THREE.CanvasTexture(labelCanvas) : new THREE.Texture(labelCanvas);
            labelTexture.needsUpdate = true;
            if (THREE.sRGBEncoding) labelTexture.encoding = THREE.sRGBEncoding;
            labelTextures.push(labelTexture);
            var placard = new THREE.Mesh(
              new THREE.PlaneGeometry(1.45, 0.36),
              new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, side: THREE.DoubleSide })
            );
            placard.position.copy(def.center);
            if (def.axis === 'z') placard.position.x += def.radius * 0.82;
            else if (def.axis === 'x') placard.position.z += def.radius * 0.82;
            else placard.position.x += def.radius * 0.78;
            placard.lookAt(def.center);
            scene.add(placard);
          }

          function addRail(def, offset, material) {
            var size, position = def.center.toArray();
            if (def.axis === 'z') {
              size = [0.055, 0.055, def.length * 0.86];
              position[0] += offset; position[1] -= def.radius * 0.58;
            } else if (def.axis === 'x') {
              size = [def.length * 0.86, 0.055, 0.055];
              position[1] -= def.radius * 0.58; position[2] += offset;
            } else {
              size = [0.055, def.length * 0.86, 0.055];
              position[0] += offset; position[2] += def.radius * 0.55;
            }
            makeBox(size, position, material);
          }
          function addRoom(def, index) {
            var shell = new THREE.Mesh(
              new THREE.CylinderGeometry(def.radius, def.radius, def.length, 20, 1, true),
              shellMat
            );
            orientCylinder(shell, def.axis);
            shell.position.copy(def.center); shell.userData.moduleId = def.id;
            scene.add(shell);

            for (var ringIndex = -2; ringIndex <= 2; ringIndex++) {
              var ring = new THREE.Mesh(new THREE.TorusGeometry(def.radius * 0.965, 0.045, 8, 32), bulkheadMat);
              orientRing(ring, def.axis);
              ring.position.copy(def.center);
              var axisBase = def.axis === 'x' ? def.center.x : def.axis === 'y' ? def.center.y : def.center.z;
              setAxisPosition(ring.position, def.axis, axisBase + ringIndex * def.length * 0.22);
              scene.add(ring);
            }

            var panelSize, panelA = def.center.toArray(), panelB = def.center.toArray();
            if (def.axis === 'z') {
              panelSize = [def.radius * 1.18, 0.08, def.length * 0.82];
              panelA[1] -= def.radius * 0.72; panelB[1] += def.radius * 0.72;
            } else if (def.axis === 'x') {
              panelSize = [def.length * 0.82, 0.08, def.radius * 1.18];
              panelA[1] -= def.radius * 0.72; panelB[1] += def.radius * 0.72;
            } else {
              panelSize = [def.radius * 1.18, def.length * 0.82, 0.08];
              panelA[2] -= def.radius * 0.72; panelB[2] += def.radius * 0.72;
            }
            makeBox(panelSize, panelA, panelMat);
            makeBox(panelSize, panelB, panelMat);
            [-0.28, 0.28].forEach(function (fraction) {
              var lampPosition = def.center.toArray(), lampSize;
              if (def.axis === 'z') {
                lampPosition[1] += def.radius * 0.76; lampPosition[2] += fraction * def.length;
                lampSize = [0.48, 0.035, 0.72];
              } else if (def.axis === 'x') {
                lampPosition[0] += fraction * def.length; lampPosition[1] += def.radius * 0.76;
                lampSize = [0.72, 0.035, 0.48];
              } else {
                lampPosition[1] += fraction * def.length; lampPosition[2] -= def.radius * 0.76;
                lampSize = [0.48, 0.72, 0.035];
              }
              makeBox(lampSize, lampPosition, lightStripMat);
            });
            addRail(def, def.radius * 0.63, index % 2 ? railGold : railBlue);
            addRail(def, -def.radius * 0.63, index % 2 ? railBlue : railGold);

            if (def.axis === 'z') {
              [-0.31, 0.31].forEach(function (fraction, rackIndex) {
                var z = def.center.z + fraction * def.length;
                makeBox([0.19, 0.82, 0.9], [def.center.x - def.radius * 0.78, rackIndex ? 0.42 : -0.42, z], rackMat);
                makeBox([0.025, 0.32, 0.42], [def.center.x - def.radius * 0.675, rackIndex ? 0.42 : -0.42, z], screenMat);
              });
            } else if (def.axis === 'x') {
              [-0.3, 0.3].forEach(function (fraction, rackIndex) {
                var x = def.center.x + fraction * def.length;
                makeBox([0.9, 0.82, 0.19], [x, rackIndex ? 0.42 : -0.42, def.center.z - def.radius * 0.78], rackMat);
                makeBox([0.42, 0.32, 0.025], [x, rackIndex ? 0.42 : -0.42, def.center.z - def.radius * 0.675], screenMat);
              });
            }

            addModulePlacard(def, index);
            var lamp = new THREE.PointLight(def.color, 0.28, 6.4, 2);
            lamp.position.copy(def.center);
            scene.add(lamp);
          }
          roomDefs.forEach(addRoom);

          var hatchVisuals = [];
          function addHatch(position, axis, color, from, to) {
            var outer = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.11, 10, 36), hatchMat);
            orientRing(outer, axis);
            outer.position.set(position[0], position[1], position[2]);
            scene.add(outer);
            var inner = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: color }));
            orientRing(inner, axis);
            inner.position.copy(outer.position);
            scene.add(inner);
            var light = new THREE.PointLight(color, 0.34, 4.2, 2);
            light.position.copy(outer.position);
            scene.add(light);
            hatchVisuals.push({ from: from, to: to, position: outer.position.clone(), inner: inner, light: light, color: color, flashUntil: 0 });
          }
          addHatch([0, 0, -8.45], 'z', 0x7dd3fc, 'harmony', 'destiny');
          addHatch([0, 0, -2.25], 'z', 0x4ade80, 'destiny', 'unity');
          addHatch([-1.45, 0, -0.25], 'x', 0xfbbf24, 'unity', 'tranquility');
          addHatch([-6.25, -1.28, -0.25], 'y', 0x818cf8, 'tranquility', 'cupola');

          var routePoints = [
            [0, -0.94, -12.3], [0, -0.94, -10.5], [0, -0.94, -8.45],
            [0, -0.94, -6.4], [0, -0.94, -4.4], [0, -0.94, -2.25],
            [0, -0.94, -0.25], [-1.55, -0.94, -0.25], [-3.2, -0.94, -0.25],
            [-5.1, -0.94, -0.25], [-6.25, -1.35, -0.25], [-6.25, -2.8, -0.25]
          ];
          routePoints.forEach(function (point) {
            var dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), guideMat);
            dot.position.set(point[0], point[1], point[2]);
            scene.add(dot);
          });
          var routeVectors = routePoints.map(function (point) { return new THREE.Vector3(point[0], point[1], point[2]); });
          var routeLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(routeVectors),
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 })
          );
          scene.add(routeLine);

          // Room-specific objects make the jobs visible before the learner opens
          // their activity card.
          makeBox([0.18, 1.18, 0.68], [1.28, 0, -11.1], standardMat(0x557ca8, 0x13263d));
          makeBox([0.92, 0.72, 0.62], [-1.18, 0.15, -5.45], standardMat(0x1f3158, 0x0b1b3d));
          var plant = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), standardMat(0x4ade80, 0x0d3c25));
          plant.scale.set(1.25, 0.62, 0.8); plant.position.set(-0.82, 0.58, -5.45); scene.add(plant);

          var fan = new THREE.Group();
          var fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.075, 8, 30), standardMat(0x94a3b8, 0x101827));
          fan.add(fanRing);
          for (var bladeIndex = 0; bladeIndex < 5; bladeIndex++) {
            var blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.035), standardMat(0x64748b, 0x09111d));
            blade.rotation.z = bladeIndex * Math.PI * 2 / 5;
            blade.position.set(Math.cos(blade.rotation.z) * 0.2, Math.sin(blade.rotation.z) * 0.2, 0);
            fan.add(blade);
          }
          fan.position.set(-3.4, 0.05, -1.23);
          scene.add(fan);

          var cargo = new THREE.Group();
          cargo.add(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.46, 0.38), standardMat(0x8b5e3c, 0x301707)));
          var cargoHandle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 6, 18, Math.PI), standardMat(0xfde68a, 0x3a2505));
          cargoHandle.position.y = 0.27; cargoHandle.rotation.x = Math.PI;
          cargo.add(cargoHandle);
          var cargoBase = new THREE.Vector3(-0.66, 0.18, -0.25);
          cargo.position.copy(cargoBase);
          scene.add(cargo);

          var activityBeacons = {};
          function addActivityBeacon(id, position, color) {
            var beacon = new THREE.Group();
            var spinner = new THREE.Group();
            var ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.24, 0.025, 8, 28),
              new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.88 })
            );
            spinner.add(ring);
            var tick = new THREE.Mesh(
              new THREE.BoxGeometry(0.1, 0.035, 0.02),
              new THREE.MeshBasicMaterial({ color: 0xf8fafc })
            );
            tick.position.x = 0.29;
            spinner.add(tick);
            beacon.add(spinner);
            var core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
            beacon.add(core);
            var beaconLight = new THREE.PointLight(color, 0.38, 2.2, 2);
            beacon.add(beaconLight);
            beacon.position.set(position[0], position[1], position[2]);
            beacon.userData.baseY = position[1];
            beacon.userData.spinner = spinner;
            scene.add(beacon);
            activityBeacons[id] = beacon;
          }
          addActivityBeacon('harmony', [1.05, 0.02, -11.1], 0xe879f9);
          addActivityBeacon('destiny', [-0.82, 0.58, -5.45], 0x38bdf8);
          addActivityBeacon('unity', [-0.66, 0.18, -0.25], 0x34d399);
          addActivityBeacon('tranquility', [-3.4, 0.05, -1.23], 0xfbbf24);
          addActivityBeacon('cupola', [-6.25, -3.72, -0.25], 0x818cf8);

          var earth = new THREE.Mesh(
            new THREE.SphereGeometry(6.2, 40, 26),
            new THREE.MeshPhongMaterial({ color: 0x2879b9, emissive: 0x061b38, shininess: 46, specular: 0x9edfff })
          );
          earth.position.set(-6.25, -11.0, -0.25);
          scene.add(earth);
          var atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(6.3, 40, 26),
            new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.09, side: THREE.BackSide })
          );
          atmosphere.position.copy(earth.position);
          scene.add(atmosphere);

          // Cupola's seven-window geometry creates a recognizable destination
          // and lets the activity's shutter state appear in the 3-D scene.
          var cupolaShutters = new THREE.Group();
          var cupolaWindows = new THREE.Group();
          var cupolaWindowCenters = [[0, 0]];
          for (var windowIndex = 0; windowIndex < 6; windowIndex++) {
            var windowAngle = windowIndex * Math.PI / 3;
            cupolaWindowCenters.push([Math.cos(windowAngle) * 0.76, Math.sin(windowAngle) * 0.76]);
          }
          cupolaWindowCenters.forEach(function (offset, index) {
            var windowRadius = index ? 0.29 : 0.4;
            var frame = new THREE.Mesh(new THREE.TorusGeometry(windowRadius, 0.055, 8, 28), hatchMat);
            orientRing(frame, 'y');
            frame.position.set(-6.25 + offset[0], -4.35, -0.25 + offset[1]);
            cupolaWindows.add(frame);
            var shutter = new THREE.Mesh(
              new THREE.CircleGeometry(windowRadius * 0.91, 24),
              standardMat(0x263241, 0x02050a)
            );
            shutter.rotation.x = -Math.PI / 2;
            shutter.position.set(-6.25 + offset[0], -4.31, -0.25 + offset[1]);
            cupolaShutters.add(shutter);
          });
          cupolaShutters.visible = false;
          scene.add(cupolaWindows);
          scene.add(cupolaShutters);
          var cupolaGlow = new THREE.PointLight(0x7dd3fc, 0.46, 5.5, 2);
          cupolaGlow.position.set(-6.25, -4.05, -0.25);
          scene.add(cupolaGlow);

          function insideRoom(position, def) {
            var dx = position.x - def.center.x;
            var dy = position.y - def.center.y;
            var dz = position.z - def.center.z;
            var axial, radial;
            if (def.axis === 'x') { axial = Math.abs(dx); radial = Math.sqrt(dy * dy + dz * dz); }
            else if (def.axis === 'y') { axial = Math.abs(dy); radial = Math.sqrt(dx * dx + dz * dz); }
            else { axial = Math.abs(dz); radial = Math.sqrt(dx * dx + dy * dy); }
            return axial <= def.length / 2 + 0.22 && radial <= def.radius - 0.16;
          }
          function withinPortal(position, axis, center, radius) {
            var first, second;
            if (axis === 'z') {
              first = position.x - center[0]; second = position.y - center[1];
            } else if (axis === 'x') {
              first = position.y - center[1]; second = position.z - center[2];
            } else {
              first = position.x - center[0]; second = position.z - center[2];
            }
            return Math.sqrt(first * first + second * second) <= radius;
          }
          function transitionRoom(currentId, position) {
            var margin = 0.025;
            if (currentId === 'harmony' && position.z > -8.45 + margin && withinPortal(position, 'z', [0, 0, -8.45], 1.24)) return roomDef('destiny');
            if (currentId === 'destiny') {
              if (position.z < -8.45 - margin && withinPortal(position, 'z', [0, 0, -8.45], 1.24)) return roomDef('harmony');
              if (position.z > -2.25 + margin && withinPortal(position, 'z', [0, 0, -2.25], 1.24)) return roomDef('unity');
            }
            if (currentId === 'unity') {
              if (position.z < -2.25 - margin && withinPortal(position, 'z', [0, 0, -2.25], 1.24)) return roomDef('destiny');
              if (position.x < -1.45 - margin && withinPortal(position, 'x', [-1.45, 0, -0.25], 1.24)) return roomDef('tranquility');
            }
            if (currentId === 'tranquility') {
              if (position.x > -1.45 + margin && withinPortal(position, 'x', [-1.45, 0, -0.25], 1.24)) return roomDef('unity');
              if (position.y < -1.28 - margin && withinPortal(position, 'y', [-6.25, -1.28, -0.25], 1.16)) return roomDef('cupola');
            }
            if (currentId === 'cupola' && position.y > -1.28 + margin && withinPortal(position, 'y', [-6.25, -1.28, -0.25], 1.16)) return roomDef('tranquility');
            return roomDef(currentId);
          }
          function crossedConnectorPlane(currentId, position) {
            var margin = 0.025;
            if (currentId === 'harmony') return position.z > -8.45 + margin;
            if (currentId === 'destiny') return position.z < -8.45 - margin || position.z > -2.25 + margin;
            if (currentId === 'unity') return position.z < -2.25 - margin || position.x < -1.45 - margin;
            if (currentId === 'tranquility') return position.x > -1.45 + margin || position.y < -1.28 - margin;
            return currentId === 'cupola' && position.y > -1.28 + margin;
          }
          function canOccupyFromRoom(currentId, position) {
            var current = roomDef(currentId);
            var adjacent = transitionRoom(currentId, position);
            if (adjacent.id !== currentId) return insideRoom(position, adjacent);
            return !crossedConnectorPlane(currentId, position) && insideRoom(position, current);
          }

          var startDef = roomDef(cv._issInteriorWantRoom || 'harmony');
          var state = {
            position: startDef.center.clone(), velocity: new THREE.Vector3(),
            pitch: startDef.facing[0], yaw: startDef.facing[1], roll: startDef.facing[2],
            room: startDef.id, mode: 'STATIONARY', collisions: 0, railGrabs: 0,
            looseHits: 0, manualVisited: {}, routeComplete: false,
            routeIndex: startDef.id === 'harmony' ? 0 : -1,
            cargoHitSinceUnity: false, rolledFar: false, orientationDone: false,
            lastWallEvent: 0, lastCargoEvent: 0,
            feedbackText: '', feedbackTone: 'info', feedbackUntil: 0
          };
          state.manualVisited[startDef.id] = true;
          cv._issInteriorState = state;
          cv.setAttribute('data-iss-webgl', 'ready');

          var keys = {};
          var lastWant = startDef.id;
          var dirty = true;
          var disposed = false;
          var rafId = 0;
          var lastFrame = (window.performance && performance.now) ? performance.now() : Date.now();
          var lastHud = -Infinity;
          var tick = 0;
          var drag = null;
          var resizeObserver = null;
          var tempForward = new THREE.Vector3();
          var tempRight = new THREE.Vector3();
          var tempUp = new THREE.Vector3();
          var tempThrust = new THREE.Vector3();
          var tempCandidate = new THREE.Vector3();
          var tempSeparation = new THREE.Vector3();
          var tempHudTarget = new THREE.Vector3();
          var tempLocalVelocity = new THREE.Vector3();

          function announce(message) {
            var shell = cv.closest ? cv.closest('[data-iss-interior-sim]') : null;
            var status = shell && shell.querySelector('[data-iss-interior-status]');
            if (status) status.textContent = message;
          }
          function emit(type, payload) {
            var event = Object.assign({ type: type }, payload || {});
            try { if (typeof cv._issInteriorEvent === 'function') cv._issInteriorEvent(event); } catch (e) {}
          }
          function setCameraFromState() {
            camera.position.copy(state.position);
            camera.rotation.set(state.pitch, state.yaw, state.roll, 'YXZ');
          }
          function setFeedback(message, tone, duration) {
            state.feedbackText = message;
            state.feedbackTone = tone || 'info';
            state.feedbackUntil = ((window.performance && performance.now) ? performance.now() : Date.now()) + (duration || 1500);
            dirty = true;
          }
          function railDistance(position, def) {
            var offset = def.radius * 0.63;
            var axialHalf = def.length * 0.43;
            var axialExcess, first, second;
            if (def.axis === 'z') {
              axialExcess = Math.max(0, Math.abs(position.z - def.center.z) - axialHalf);
              first = Math.sqrt(Math.pow(position.x - (def.center.x + offset), 2) + Math.pow(position.y - (def.center.y - def.radius * 0.58), 2) + axialExcess * axialExcess);
              second = Math.sqrt(Math.pow(position.x - (def.center.x - offset), 2) + Math.pow(position.y - (def.center.y - def.radius * 0.58), 2) + axialExcess * axialExcess);
            } else if (def.axis === 'x') {
              axialExcess = Math.max(0, Math.abs(position.x - def.center.x) - axialHalf);
              first = Math.sqrt(Math.pow(position.z - (def.center.z + offset), 2) + Math.pow(position.y - (def.center.y - def.radius * 0.58), 2) + axialExcess * axialExcess);
              second = Math.sqrt(Math.pow(position.z - (def.center.z - offset), 2) + Math.pow(position.y - (def.center.y - def.radius * 0.58), 2) + axialExcess * axialExcess);
            } else {
              axialExcess = Math.max(0, Math.abs(position.y - def.center.y) - axialHalf);
              first = Math.sqrt(Math.pow(position.x - (def.center.x + offset), 2) + Math.pow(position.z - (def.center.z + def.radius * 0.55), 2) + axialExcess * axialExcess);
              second = Math.sqrt(Math.pow(position.x - (def.center.x - offset), 2) + Math.pow(position.z - (def.center.z + def.radius * 0.55), 2) + axialExcess * axialExcess);
            }
            return Math.min(first, second);
          }
          function nextRouteTarget() {
            if (state.routeComplete) return null;
            var recovering = state.routeIndex < 0;
            var nextId;
            if (recovering) {
              var currentIndex = INTERIOR_ROUTE_IDS.indexOf(state.room);
              nextId = INTERIOR_ROUTE_IDS[Math.max(0, currentIndex - 1)] || 'harmony';
            } else {
              nextId = INTERIOR_ROUTE_IDS[state.routeIndex + 1];
            }
            if (!nextId) return null;
            var hatch = hatchVisuals.find(function (item) { return item.from === state.room && item.to === nextId; });
            if (!hatch) {
              hatch = hatchVisuals.find(function (item) { return item.to === state.room && item.from === nextId; });
            }
            return {
              id: nextId,
              position: hatch ? hatch.position : roomDef(nextId).center,
              label: recovering ? 'RESET VIA // ' + roomInfo(nextId).module.toUpperCase() : 'NEXT // ' + roomInfo(nextId).module.toUpperCase()
            };
          }
          function moveToRoom(id, speak, preserveProgress) {
            var def = roomDef(id);
            state.position.copy(def.center);
            state.velocity.set(0, 0, 0);
            state.pitch = def.facing[0]; state.yaw = def.facing[1]; state.roll = def.facing[2];
            state.room = def.id; state.mode = 'STATIONARY';
            if (!preserveProgress) {
              state.routeIndex = def.id === 'harmony' ? 0 : -1;
              state.routeComplete = false;
              state.cargoHitSinceUnity = false;
            }
            setCameraFromState();
            dirty = true;
            if (speak) announce('Moved to ' + roomInfo(def.id).name + '. Camera centered and momentum stopped.');
          }
          function grabRail() {
            var speed = state.velocity.length();
            var distance = railDistance(state.position, roomDef(state.room));
            if (distance > 0.68) {
              setFeedback('RAIL OUT OF REACH // ' + distance.toFixed(2) + ' M', 'warn', 1700);
              announce('No handrail within reach. Nearest rail is ' + distance.toFixed(2) + ' meters away. Move within 0.68 meters and try again.');
              return false;
            }
            state.velocity.set(0, 0, 0);
            state.mode = 'RAIL HOLD';
            state.railGrabs += 1;
            dirty = true;
            var controlled = speed >= 0.12 && speed <= 0.35;
            setFeedback(controlled ? 'CONTROLLED RAIL CATCH' : speed > 0.35 ? 'RAIL CAUGHT // ENTRY TOO FAST' : 'RAIL HOLD // STATIONARY', controlled ? 'safe' : speed > 0.35 ? 'warn' : 'info');
            emit('rail-grab', { room: state.room, speed: speed, distance: distance, controlled: controlled });
            announce(speed > 0.02 ? 'Handrail caught. Momentum stopped from ' + speed.toFixed(2) + ' meters per second.' : 'Handrail held. You are already stationary.');
            return true;
          }
          function centerAndStop() {
            moveToRoom(state.room, false, true);
            state.rolledFar = false;
            setFeedback('TRAINING ASSIST // CENTERED + STOPPED', 'info');
            announce('Training assist used. Centered and stopped in ' + roomInfo(state.room).name + '.');
          }
          function resetRoute() {
            state.manualVisited = { harmony: true };
            state.routeComplete = false;
            state.orientationDone = false;
            state.rolledFar = false;
            state.routeIndex = 0;
            state.collisions = 0; state.railGrabs = 0; state.looseHits = 0;
            lastWant = 'harmony';
            moveToRoom('harmony', true);
          }
          cv._issInteriorSetControl = function (action, on) {
            if (action === 'grab' && on) { grabRail(); return; }
            keys[action] = !!on;
            if (on) state.mode = 'PUSHING';
            dirty = true;
          };
          cv._issInteriorGrabRail = grabRail;
          cv._issInteriorCenter = centerAndStop;
          cv._issInteriorReset = resetRoute;
          cv._issInteriorGoTo = function (id) {
            lastWant = id;
            moveToRoom(id, true);
          };

          function updateHud(now) {
            if (now - lastHud < 120) return;
            lastHud = now;
            setCameraFromState();
            camera.updateMatrixWorld(true);
            var shell = cv.closest ? cv.closest('[data-iss-interior-sim]') : null;
            if (!shell) return;
            var info = roomInfo(state.room);
            var speed = state.velocity.length();
            var distanceToRail = railDistance(state.position, roomDef(state.room));
            var roomEl = shell.querySelector('[data-iss-interior-room-hud]');
            var speedEl = shell.querySelector('[data-iss-interior-speed]');
            var modeEl = shell.querySelector('[data-iss-interior-mode]');
            var railEl = shell.querySelector('[data-iss-interior-rail-distance]');
            var routeEl = shell.querySelector('[data-iss-interior-route-progress]');
            var grabEl = shell.querySelector('[data-iss-interior-grab]');
            var objectiveEl = shell.querySelector('[data-iss-interior-objective]');
            var hatchLabelEl = shell.querySelector('[data-iss-interior-next-label]');
            var hatchDistanceEl = shell.querySelector('[data-iss-interior-next-distance]');
            var hatchArrowEl = shell.querySelector('[data-iss-interior-next-arrow]');
            var horizonEl = shell.querySelector('[data-iss-interior-horizon]');
            var velocityDotEl = shell.querySelector('[data-iss-interior-velocity-dot]');
            var eventEl = shell.querySelector('[data-iss-interior-event]');
            if (roomEl) roomEl.textContent = info.module.toUpperCase() + ' // ' + info.zone.toUpperCase();
            if (speedEl) {
              speedEl.textContent = 'SPEED ' + speed.toFixed(2) + ' M/S // STOP ~' + (speed * speed / (2 * 0.46)).toFixed(2) + ' M';
              speedEl.setAttribute('data-rate', speed < 0.02 ? 'stopped' : speed <= 0.35 ? 'controlled' : 'fast');
            }
            if (modeEl) modeEl.textContent = state.mode;
            if (railEl) railEl.textContent = 'RAIL ' + distanceToRail.toFixed(2) + ' M';
            if (grabEl) {
              grabEl.disabled = false;
              grabEl.setAttribute('aria-disabled', distanceToRail > 0.68 ? 'true' : 'false');
              grabEl.title = distanceToRail > 0.68 ? 'Move within 0.68 m of a handrail' : 'Handrail is within reach';
            }
            if (routeEl) routeEl.textContent = state.routeComplete ? '5 / 5 // COMPLETE' : state.routeIndex < 0 ? 'ROUTE RESET // RETURN TO HARMONY' : (state.routeIndex + 1) + ' / 5 // ORDERED';
            if (objectiveEl) objectiveEl.textContent = (cv._issInteriorTaskDone ? 'ACTIVITY COMPLETE // ' : 'CURRENT ACTIVITY // ') + info.task.toUpperCase();
            var target = nextRouteTarget();
            if (target) {
              tempHudTarget.copy(target.position);
              var targetDistance = tempHudTarget.distanceTo(state.position);
              camera.worldToLocal(tempHudTarget);
              var targetAngle = Math.atan2(tempHudTarget.x, -tempHudTarget.z) * 180 / Math.PI;
              if (hatchLabelEl) hatchLabelEl.textContent = target.label;
              if (hatchDistanceEl) hatchDistanceEl.textContent = targetDistance.toFixed(1) + ' M // ' + (tempHudTarget.y < -0.35 ? 'NADIR' : tempHudTarget.y > 0.35 ? 'ZENITH' : tempHudTarget.x < -0.35 ? 'PORT' : tempHudTarget.x > 0.35 ? 'STARBOARD' : 'AHEAD');
              if (hatchArrowEl) hatchArrowEl.style.transform = 'rotate(' + targetAngle.toFixed(1) + 'deg)';
            } else {
              if (hatchLabelEl) hatchLabelEl.textContent = 'ROUTE COMPLETE';
              if (hatchDistanceEl) hatchDistanceEl.textContent = 'CUPOLA REACHED';
            }
            if (horizonEl) horizonEl.style.transform = 'rotate(' + (-state.roll * 180 / Math.PI).toFixed(1) + 'deg) translateY(' + Math.max(-14, Math.min(14, state.pitch * 9)).toFixed(1) + 'px)';
            if (velocityDotEl) {
              tempLocalVelocity.copy(state.position).add(state.velocity);
              camera.worldToLocal(tempLocalVelocity);
              velocityDotEl.style.transform = 'translate(' + Math.max(-28, Math.min(28, tempLocalVelocity.x / 0.78 * 28)).toFixed(1) + 'px,' + Math.max(-28, Math.min(28, -tempLocalVelocity.y / 0.78 * 28)).toFixed(1) + 'px)';
            }
            if (eventEl) {
              eventEl.textContent = state.feedbackText;
              eventEl.setAttribute('data-tone', state.feedbackTone);
              eventEl.className = 'iss-interior-event' + (state.feedbackText && now < state.feedbackUntil ? ' is-visible' : '');
            }
          }

          function updatePhysics(dt, now) {
            var want = cv._issInteriorWantRoom;
            if (want && want !== lastWant) {
              lastWant = want;
              moveToRoom(want, true);
            }

            var rollInput = (keys.rollLeft ? 1 : 0) - (keys.rollRight ? 1 : 0);
            if (rollInput) {
              state.roll += rollInput * dt * 1.18;
              if (state.roll > Math.PI) state.roll -= Math.PI * 2;
              if (state.roll < -Math.PI) state.roll += Math.PI * 2;
              dirty = true;
            }
            if (Math.abs(state.roll) > 0.72) state.rolledFar = true;
            if (state.rolledFar && !state.orientationDone && Math.abs(state.roll) < 0.14 && rollInput) {
              state.orientationDone = true;
              emit('orientation-recovered', { room: state.room });
              setFeedback('ORIENTATION RECOVERED // DECK ALIGNED', 'safe');
              announce('Orientation recovered. Your agreed deck direction is level again.');
            }

            setCameraFromState();
            tempThrust.set(0, 0, 0);
            tempForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
            tempRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
            tempUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
            tempThrust.addScaledVector(tempForward, (keys.forward ? 1 : 0) - (keys.back ? 1 : 0));
            tempThrust.addScaledVector(tempRight, (keys.right ? 1 : 0) - (keys.left ? 1 : 0));
            tempThrust.addScaledVector(tempUp, (keys.up ? 1 : 0) - (keys.down ? 1 : 0));
            if (tempThrust.lengthSq() > 0) {
              tempThrust.normalize();
              state.velocity.addScaledVector(tempThrust, 0.46 * dt);
              if (state.velocity.length() > 0.78) state.velocity.setLength(0.78);
              state.mode = 'PUSHING';
              dirty = true;
            } else if (state.velocity.length() > 0.006) {
              state.mode = 'COASTING // NO DRAG';
            } else {
              state.velocity.set(0, 0, 0);
              if (state.mode !== 'RAIL HOLD') state.mode = 'STATIONARY';
            }

            if (state.velocity.lengthSq() > 0) {
              tempCandidate.copy(state.position).addScaledVector(state.velocity, dt);
              if (canOccupyFromRoom(state.room, tempCandidate)) {
                state.position.copy(tempCandidate);
              } else {
                var impactSpeed = state.velocity.length();
                state.velocity.multiplyScalar(-0.18);
                state.collisions += 1;
                dirty = true;
                if (now - state.lastWallEvent > 700) {
                  state.lastWallEvent = now;
                  emit('collision', { room: state.room, speed: impactSpeed });
                  setFeedback('HULL CONTACT // IMPACT ' + impactSpeed.toFixed(2) + ' M/S', 'impact');
                  announce('Hull contact at ' + impactSpeed.toFixed(2) + ' meters per second. In microgravity, unplanned speed still carries you into the wall.');
                }
              }
            }

            if (!_prefersReducedMotion) {
              cargo.position.copy(cargoBase);
              cargo.position.y += Math.sin(now * 0.00072) * 0.16;
              cargo.position.z += Math.cos(now * 0.00058) * 0.09;
              cargo.rotation.x = now * 0.00018;
              cargo.rotation.y = now * 0.00024;
              fan.rotation.z = now * 0.0011;
              Object.keys(activityBeacons).forEach(function (id, beaconIndex) {
                activityBeacons[id].position.y = activityBeacons[id].userData.baseY + Math.sin(now * 0.0024 + beaconIndex) * 0.045;
                activityBeacons[id].userData.spinner.rotation.z = now * 0.0007;
              });
              dirty = true;
            }
            Object.keys(activityBeacons).forEach(function (id) {
              var beacon = activityBeacons[id];
              var shouldShowBeacon = id === state.room && !cv._issInteriorTaskDone;
              if (beacon.visible !== shouldShowBeacon) {
                beacon.visible = shouldShowBeacon;
                dirty = true;
              }
              if (beacon.visible) beacon.lookAt(camera.position);
            });
            var shouldShowShutters = !!cv._issInteriorCupolaShutters;
            if (cupolaShutters.visible !== shouldShowShutters) {
              cupolaShutters.visible = shouldShowShutters;
              dirty = true;
            }
            hatchVisuals.forEach(function (hatch) {
              if (hatch.flashUntil && now > hatch.flashUntil) {
                hatch.inner.material.color.setHex(hatch.color);
                hatch.light.color.setHex(hatch.color);
                hatch.light.intensity = 0.34;
                hatch.flashUntil = 0;
                dirty = true;
              }
            });
            tempSeparation.copy(state.position).sub(cargo.position);
            if (tempSeparation.length() < 0.53 && now - state.lastCargoEvent > 1200) {
              state.lastCargoEvent = now;
              state.cargoHitSinceUnity = true;
              state.looseHits += 1;
              if (tempSeparation.lengthSq() < 0.001) tempSeparation.set(1, 0, 0);
              tempSeparation.normalize();
              state.position.addScaledVector(tempSeparation, 0.12);
              state.velocity.addScaledVector(tempSeparation, 0.2);
              emit('cargo-hit', { speed: state.velocity.length() });
              setFeedback('LOOSE CARGO CONTACT // MOTION CHANGED', 'warn');
              announce('Loose cargo contact. The pouch changed your motion and now tumbles through the node.');
            }

            var nextRoom = transitionRoom(state.room, state.position);
            if (nextRoom && nextRoom.id !== state.room) {
              var previous = state.room;
              state.room = nextRoom.id;
              lastWant = nextRoom.id;
              state.manualVisited[nextRoom.id] = true;
              if (nextRoom.id === 'unity' && previous !== 'unity') state.cargoHitSinceUnity = false;
              var expectedRoom = state.routeIndex >= 0 ? INTERIOR_ROUTE_IDS[state.routeIndex + 1] : null;
              if (nextRoom.id === 'harmony') {
                state.routeIndex = 0;
              } else if (expectedRoom && nextRoom.id === expectedRoom) {
                state.routeIndex += 1;
              } else {
                state.routeIndex = -1;
              }
              var hatchSpeed = state.velocity.length();
              emit('hatch', { from: previous, to: nextRoom.id, speed: hatchSpeed, routeStep: state.routeIndex });
              var crossedHatch = hatchVisuals.find(function (hatch) {
                return (hatch.from === previous && hatch.to === nextRoom.id) || (hatch.to === previous && hatch.from === nextRoom.id);
              });
              if (crossedHatch) {
                var hatchTone = hatchSpeed <= 0.35 ? 0x4ade80 : 0xfbbf24;
                crossedHatch.inner.material.color.setHex(hatchTone);
                crossedHatch.light.color.setHex(hatchTone);
                crossedHatch.light.intensity = 0.8;
                crossedHatch.flashUntil = now + 1000;
              }
              if (previous === 'unity' && nextRoom.id === 'tranquility' && !state.cargoHitSinceUnity) {
                emit('cargo-clear', { speed: state.velocity.length() });
              }
              var completedThisCrossing = false;
              if (!state.routeComplete && state.routeIndex === INTERIOR_ROUTE_IDS.length - 1) {
                state.routeComplete = true;
                completedThisCrossing = true;
                emit('route-complete', { room: nextRoom.id });
              } else if (state.routeComplete && nextRoom.id !== 'cupola') {
                state.routeComplete = false;
              }
              if (completedThisCrossing) setFeedback('ORDERED ROUTE COMPLETE // CUPOLA', 'safe', 2400);
              else if (state.routeIndex < 0) setFeedback('ROUTE ORDER LOST // RETURN TO HARMONY', 'warn', 2100);
              else setFeedback((hatchSpeed <= 0.35 ? 'CONTROLLED HATCH // ' : 'FAST HATCH // ') + roomInfo(nextRoom.id).module.toUpperCase(), hatchSpeed <= 0.35 ? 'safe' : 'warn');
              announce('Hatch crossed into ' + roomInfo(nextRoom.id).name + ' at ' + state.velocity.length().toFixed(2) + ' meters per second.');
            }
            setCameraFromState();
          }

          function animate(now) {
            if (disposed) return;
            if (!cv.isConnected) { cleanup(); return; }
            var time = typeof now === 'number' ? now : ((window.performance && performance.now) ? performance.now() : Date.now());
            var elapsed = Math.max(0.001, Math.min(0.16, (time - lastFrame) / 1000));
            lastFrame = time;
            tick += 1;
            // Keep thrust and coasting consistent on slow GPUs without allowing
            // one delayed frame to tunnel through a wall or loose object.
            var physicsSteps = Math.max(1, Math.ceil(elapsed / 0.04));
            var physicsDt = elapsed / physicsSteps;
            for (var physicsStep = 0; physicsStep < physicsSteps; physicsStep++) updatePhysics(physicsDt, time);
            updateHud(time);
            if (dirty || tick % 120 === 0) {
              renderer.render(scene, camera);
              dirty = false;
            }
            rafId = requestAnimationFrame(animate);
          }

          var keyMap = {
            KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
            KeyR: 'up', KeyF: 'down', KeyQ: 'rollLeft', KeyE: 'rollRight'
          };
          function onKeyDown(event) {
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
              event.preventDefault();
              var lookStep = event.shiftKey ? 0.11 : 0.055;
              if (event.code === 'ArrowLeft') state.yaw += lookStep;
              else if (event.code === 'ArrowRight') state.yaw -= lookStep;
              else if (event.code === 'ArrowUp') state.pitch += lookStep;
              else state.pitch -= lookStep;
              state.pitch = Math.max(-1.48, Math.min(1.48, state.pitch));
              dirty = true;
              return;
            }
            if (event.code === 'Space') {
              event.preventDefault();
              if (!event.repeat) grabRail();
              return;
            }
            if (event.code === 'Home') {
              event.preventDefault();
              centerAndStop();
              return;
            }
            var action = keyMap[event.code];
            if (!action) return;
            event.preventDefault();
            keys[action] = true;
            dirty = true;
          }
          function onKeyUp(event) {
            var action = keyMap[event.code];
            if (!action) return;
            event.preventDefault();
            keys[action] = false;
          }
          function clearKeys() { keys = {}; if (state.velocity.length() < 0.006 && state.mode !== 'RAIL HOLD') state.mode = 'STATIONARY'; }
          function onVisibilityChange() { if (document.hidden) clearKeys(); }
          function onPointerDown(event) {
            if (event.button != null && event.button !== 0) return;
            cv.focus();
            drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
            try { cv.setPointerCapture(event.pointerId); } catch (e) {}
            event.preventDefault();
          }
          function onPointerMove(event) {
            if (!drag || (drag.id != null && event.pointerId !== drag.id)) return;
            var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
            drag.x = event.clientX; drag.y = event.clientY;
            state.yaw -= dx * 0.0043;
            state.pitch -= dy * 0.0038;
            state.pitch = Math.max(-1.48, Math.min(1.48, state.pitch));
            dirty = true;
            event.preventDefault();
          }
          function onPointerUp(event) {
            if (!drag || (drag.id != null && event.pointerId !== drag.id)) return;
            drag = null;
            try { cv.releasePointerCapture(event.pointerId); } catch (e) {}
          }
          function resizeScene() {
            var nextW = cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || Wc;
            var nextH = cv.clientHeight || Hc;
            if (nextW === Wc && nextH === Hc) return;
            Wc = nextW; Hc = nextH;
            camera.aspect = Wc / Hc;
            camera.updateProjectionMatrix();
            renderer.setSize(Wc, Hc, false);
            dirty = true;
          }

          cv.addEventListener('keydown', onKeyDown);
          cv.addEventListener('keyup', onKeyUp);
          cv.addEventListener('blur', clearKeys);
          window.addEventListener('blur', clearKeys);
          document.addEventListener('visibilitychange', onVisibilityChange);
          cv.addEventListener('pointerdown', onPointerDown);
          window.addEventListener('pointermove', onPointerMove, { passive: false });
          window.addEventListener('pointerup', onPointerUp);
          window.addEventListener('pointercancel', onPointerUp);
          if (window.ResizeObserver) {
            resizeObserver = new window.ResizeObserver(resizeScene);
            resizeObserver.observe(cv);
          } else {
            window.addEventListener('resize', resizeScene);
          }

          function cleanup() {
            if (disposed) return;
            disposed = true;
            cancelAnimationFrame(rafId);
            cv.removeEventListener('keydown', onKeyDown);
            cv.removeEventListener('keyup', onKeyUp);
            cv.removeEventListener('blur', clearKeys);
            window.removeEventListener('blur', clearKeys);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            cv.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener('resize', resizeScene);
            var geometries = [], materials = [];
            scene.traverse(function (object) {
              if (object.geometry && geometries.indexOf(object.geometry) < 0) geometries.push(object.geometry);
              var mats = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
              mats.forEach(function (material) { if (materials.indexOf(material) < 0) materials.push(material); });
            });
            geometries.forEach(function (geometry) { try { geometry.dispose(); } catch (e) {} });
            materials.forEach(function (material) { try { material.dispose(); } catch (e) {} });
            labelTextures.forEach(function (texture) { try { texture.dispose(); } catch (e) {} });
            try { renderer.dispose(); } catch (e) {}
            cv._issInteriorState = null;
            cv._issInteriorSetControl = null;
            cv._issInteriorGrabRail = null;
            cv._issInteriorCenter = null;
            cv._issInteriorReset = null;
            cv._issInteriorGoTo = null;
            cv._issInteriorCleanup = null;
            cv._issInteriorTaskDone = null;
            cv._issInteriorCupolaShutters = null;
            cv._issInteriorInit = false;
          }
          cv._issInteriorCleanup = cleanup;
          moveToRoom(startDef.id, false);
          updateHud(lastFrame);
          animate(lastFrame);
        }

        if (window.THREE) {
          doInit(window.THREE);
        } else if (window.StemLab && typeof window.StemLab.ensureThree === 'function') {
          window.StemLab.ensureThree({ orbit: false }).then(function () {
            if (window.THREE && cv.isConnected) doInit(window.THREE);
            else if (cv.isConnected) showInteriorFallback();
            else cv._issInteriorInit = false;
          }).catch(function () { if (cv.isConnected) showInteriorFallback(); else cv._issInteriorInit = false; });
        } else {
          showInteriorFallback();
        }
      }
      // ── Orbit Lab math (real physics) ──
      // Shares issOrbit() with the fast-facts card so a student can never read
      // one number in the card and a different one in the readout beside it.
      var orbitAlt = Math.max(200, Math.min(2000, Number(d.orbitAlt) || 420));
      // Validated RAW before coercion, and derived ONCE. Number('') is 0, which
      // would silently show an equatorial orbit as if the student had chosen it,
      // and Number('abc') is NaN, which clamps to NaN and puts NaN into every
      // coordinate in the ground-track SVG. The expression also used to be
      // written out in both places that need it, so a changed default would
      // have disagreed with itself.
      // isFinite(Number(x)) alone is NOT enough: Number('') is 0, which is
      // finite, so an empty value would sail through as a deliberate equatorial
      // orbit. The raw value has to be rejected BEFORE coercion. A real numeric
      // 0 must still survive — it is the Equatorial preset.
      var _rawInc = d.orbitInc;
      if (typeof _rawInc === 'string') _rawInc = _rawInc.trim();
      var _incNum = (_rawInc == null || _rawInc === '') ? 51.6 : Number(_rawInc);
      var orbitInc = Math.max(0, Math.min(90, isFinite(_incNum) ? _incNum : 51.6));
      var _orbit = issOrbit(orbitAlt);
      var orbitR = _orbit.r;
      var orbitV = _orbit.v;                                     // km/s
      var orbitT = _orbit.minutes;                               // minutes
      var orbitsPerDay = (24 * 60) / orbitT;
      var dragNote = orbitAlt < 300 ? 'Severe drag — reboosts would be needed constantly; deorbit in weeks-to-months without them.'
        : orbitAlt <= 500 ? 'ISS territory: thin-air drag steals ~50-100 m of altitude per day; regular reboost burns required.'
        : orbitAlt <= 1000 ? 'Drag is tiny here, but you are entering the inner Van Allen radiation zone territory — crew dose climbs.'
        : 'Very little drag — but radiation is far worse, and cargo rockets can carry less mass this high.';

      // ── AI: Ask Mission Control ──
      function askMissionControl(q) {
        var clean = typeof q === 'string' ? q.trim().slice(0, 400) : '';
        if (!aiOn || !clean || d.askLoading) return;
        upd({ askLoading: true, askAnswer: '' });
        var prompt = 'You are a friendly ISS flight controller ("Mission Control") answering a middle-school student. Answer in 3-5 sentences, accurate and concrete, about the International Space Station, astronaut life, or its engineering. If unsure, say so honestly. No em dashes. QUESTION: ' + clean;
        Promise.resolve().then(function () { return callGemini(prompt, false); }).then(function (resp) {
          var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output)) || '');
          upd({ askLoading: false, askAnswer: String(text || '(no response — try again)').slice(0, 2000) });
        }).catch(function () {
          upd({ askLoading: false, askAnswer: 'Mission Control is off the loop right now (AI unavailable). Try again shortly.' });
        });
      }

      // ── Docking mini-sim (canvas game; physics state lives on the canvas,
      //    React state is only touched when a run ends — no per-frame setState) ──
      function dockingCanvasRef(cv) {
        if (!cv || cv._dockInit) return;
        cv._dockInit = true;
        var ctx2 = cv.getContext('2d');
        var Wc = cv.width = 640, Hc = cv.height = 360;
        var realMode = cv._dockRealMode !== false;
        // Game state (meters; station docking port at origin, approach along +Y = right)
        var st = { x: 26, y: -190, vx: 0, vy: 1.0, fuel: 100, t: 0, over: false, msg: '', trail: [], lastTrail: 0, thrust: { up: false, down: false, fwd: false, back: false } };
        cv._dockState = st;
        var N_ORBIT = 0.02;   // orbital rate, exaggerated ~18x so coupling is feelable in a minute
        var ACCEL = 0.35, DT = 0.35;
        function endRun(result, msg) {
          if (st.over) return;
          st.over = true; st.msg = msg;
          st.overAt = frame; st.overResult = result;   // drives the one-shot capture bloom
          var wins = (d.dockWins || 0) + (result === 'docked' ? 1 : 0);
          var finalRange = Math.sqrt(st.x * st.x + st.y * st.y);
          var finalSpeed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          upd({
            dockResult: result, dockMsg: msg, dockWins: wins, dockRuns: (d.dockRuns || 0) + 1,
            dockDebrief: {
              range: finalRange, speed: finalSpeed, offset: Math.abs(st.x),
              fuel: st.fuel, elapsed: st.t, mode: realMode ? 'orbital' : 'game'
            }
          });
          if (result === 'docked') {
            if (addToast) addToast('🛰️ ' + __alloT('stem.spacestation.dock_win_toast', 'Soft capture confirmed — docking complete!'), 'success');
            if (typeof awardXP === 'function') { try { awardXP(5); } catch (e) {} }
          }
        }
        function step() {
          if (st.over) return;
          st.t += DT;
          var ax = 0, ay = 0;
          if (st.fuel > 0) {
            if (st.thrust.up) ax += ACCEL; if (st.thrust.down) ax -= ACCEL;
            if (st.thrust.fwd) ay += ACCEL; if (st.thrust.back) ay -= ACCEL;
            var burning = (st.thrust.up || st.thrust.down || st.thrust.fwd || st.thrust.back);
            if (burning) st.fuel = Math.max(0, st.fuel - 0.35);
          }
          if (realMode) {
            // Clohessy-Wiltshire relative motion: x = radial (screen up), y = along-track
            ax += 3 * N_ORBIT * N_ORBIT * st.x + 2 * N_ORBIT * st.vy;
            ay += -2 * N_ORBIT * st.vx;
          }
          st.vx += ax * DT; st.vy += ay * DT;
          st.x += st.vx * DT; st.y += st.vy * DT;
          if (st.t - st.lastTrail >= 1.4) { st.trail.push({ x: st.x, y: st.y }); st.trail = st.trail.slice(-70); st.lastTrail = st.t; }
          var range = Math.sqrt(st.x * st.x + st.y * st.y);
          var speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          if (range < 5) {
            // {speed} is substituted AFTER translation. Interpolating it into the
            // fallback instead would work today but silently drop the measured
            // contact speed the moment a lang pack supplies these keys, because
            // __alloT then returns the pack string and never sees the number.
            if (speed <= 0.6 && Math.abs(st.x) < 2.5) endRun('docked', __alloT('stem.spacestation.dock_win', 'Soft capture! Contact at {speed} m/s — gentle enough for the docking latches.').replace('{speed}', speed.toFixed(2)));
            else endRun('bonk', __alloT('stem.spacestation.dock_bonk', 'Contact too fast or off-axis ({speed} m/s). Real vehicles would abort long before this — try arriving under 0.6 m/s, centered.').replace('{speed}', speed.toFixed(2)));
          } else if (range > 420 || (st.fuel <= 0 && speed < 0.05 && range > 60)) {
            endRun('drift', __alloT('stem.spacestation.dock_drift', 'Drifted out of the approach zone. Notice HOW you drifted — in orbit, thrusting forward raises you and slows you.'));
          }
        }
        function draw() {
          var spaceGradient = ctx2.createLinearGradient(0, 0, 0, Hc);
          spaceGradient.addColorStop(0, '#020611'); spaceGradient.addColorStop(0.62, '#061225'); spaceGradient.addColorStop(1, '#0a2037');
          ctx2.fillStyle = spaceGradient; ctx2.fillRect(0, 0, Wc, Hc);
          // A deterministic layered star field keeps the display alive without flicker.
          for (var starI = 0; starI < 52; starI++) {
            var starX = (starI * 97 + 31) % Wc, starY = (starI * 47 + 19) % Math.floor(Hc * 0.76);
            var starR = starI % 11 === 0 ? 1.25 : starI % 4 === 0 ? 0.8 : 0.45;
            ctx2.globalAlpha = starI % 5 === 0 ? 0.85 : 0.48; ctx2.fillStyle = starI % 7 === 0 ? '#bae6fd' : '#f8fafc';
            ctx2.beginPath(); ctx2.arc(starX, starY, starR, 0, Math.PI * 2); ctx2.fill();
          }
          ctx2.globalAlpha = 1;
          // Earth limb with a brighter atmospheric rim.
          var earthGlow = ctx2.createRadialGradient(Wc / 2, Hc + 450, 420, Wc / 2, Hc + 500, 590);
          earthGlow.addColorStop(0, '#2578b8'); earthGlow.addColorStop(.62, '#124b82'); earthGlow.addColorStop(1, '#061a3b');
          ctx2.fillStyle = earthGlow; ctx2.beginPath(); ctx2.arc(Wc / 2, Hc + 520, 560, 0, Math.PI * 2); ctx2.fill();
          ctx2.strokeStyle = 'rgba(125,211,252,.55)'; ctx2.lineWidth = 3; ctx2.beginPath(); ctx2.arc(Wc / 2, Hc + 520, 562, Math.PI * 1.12, Math.PI * 1.88); ctx2.stroke();
          var sc = 1.35;
          var ox = Wc - 90, oy = Hc / 2;
          // Approach corridor, centerline, and 50 m range gates.
          ctx2.fillStyle = 'rgba(14,165,233,.055)'; ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(ox - 520, oy - 109); ctx2.lineTo(ox - 520, oy + 109); ctx2.closePath(); ctx2.fill();
          ctx2.lineWidth = 1.2; ctx2.strokeStyle = 'rgba(56,189,248,.48)'; ctx2.setLineDash([7, 7]);
          ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(ox - 520, oy - 109); ctx2.stroke();
          ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(ox - 520, oy + 109); ctx2.stroke();
          ctx2.strokeStyle = 'rgba(125,211,252,.25)'; ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(22, oy); ctx2.stroke(); ctx2.setLineDash([]);
          ctx2.font = '700 8px ui-monospace, monospace'; ctx2.textAlign = 'center';
          [50, 100, 150].forEach(function (meters) {
            var gateX = ox - meters * sc; var halfGate = 4 + meters * .11;
            ctx2.strokeStyle = 'rgba(125,211,252,.2)'; ctx2.beginPath(); ctx2.moveTo(gateX, oy - halfGate); ctx2.lineTo(gateX, oy + halfGate); ctx2.stroke();
            ctx2.fillStyle = 'rgba(186,230,253,.62)'; ctx2.fillText(meters + ' m', gateX, oy + halfGate + 12);
          });
          ctx2.textAlign = 'left';
          // Station silhouette with shaded node, truss, arrays, and active port.
          ctx2.shadowColor = 'rgba(226,232,240,.28)'; ctx2.shadowBlur = 12;
          var nodeGradient = ctx2.createLinearGradient(ox - 7, oy - 12, ox + 26, oy + 12); nodeGradient.addColorStop(0, '#f8fafc'); nodeGradient.addColorStop(.5, '#94a3b8'); nodeGradient.addColorStop(1, '#475569');
          ctx2.fillStyle = nodeGradient; ctx2.fillRect(ox - 4, oy - 13, 32, 26); ctx2.shadowBlur = 0;
          ctx2.fillStyle = '#64748b'; ctx2.fillRect(ox + 9, oy - 92, 9, 184);
          [[oy - 137, '#c28a21'], [oy + 96, '#b77918']].forEach(function (panelInfo) {
            ctx2.fillStyle = panelInfo[1]; ctx2.fillRect(ox + 1, panelInfo[0], 24, 41);
            ctx2.strokeStyle = 'rgba(254,215,112,.7)'; ctx2.lineWidth = .7;
            for (var cell = 1; cell < 4; cell++) { ctx2.beginPath(); ctx2.moveTo(ox + 1, panelInfo[0] + cell * 10); ctx2.lineTo(ox + 25, panelInfo[0] + cell * 10); ctx2.stroke(); }
            ctx2.beginPath(); ctx2.moveTo(ox + 13, panelInfo[0]); ctx2.lineTo(ox + 13, panelInfo[0] + 41); ctx2.stroke();
          });
          ctx2.shadowColor = '#38bdf8'; ctx2.shadowBlur = 14; ctx2.fillStyle = '#67e8f9'; ctx2.fillRect(ox - 8, oy - 5, 5, 10); ctx2.shadowBlur = 0;
          ctx2.fillStyle = '#7dd3fc'; ctx2.font = '800 8px ui-monospace, monospace'; ctx2.fillText('IDSS PORT', ox - 50, oy - 13);
          // Capsule with glass nose, service body, and RCS plumes.
          var px = ox + st.y * sc, py = oy - st.x * sc;
          // Breadcrumb trail, unpowered relative-motion prediction, braking point, and abort vector.
          if (st.trail && st.trail.length > 1) {
            ctx2.strokeStyle = 'rgba(125,211,252,.34)'; ctx2.lineWidth = 1.4; ctx2.setLineDash([2, 5]); ctx2.beginPath();
            st.trail.forEach(function (point, trailIndex) { var trailX = ox + point.y * sc, trailY = oy - point.x * sc; if (trailIndex) ctx2.lineTo(trailX, trailY); else ctx2.moveTo(trailX, trailY); }); ctx2.stroke(); ctx2.setLineDash([]);
          }
          var predictX = st.x, predictY = st.y, predictVx = st.vx, predictVy = st.vy;
          ctx2.strokeStyle = 'rgba(232,121,249,.72)'; ctx2.lineWidth = 1.6; ctx2.setLineDash([6, 5]); ctx2.beginPath(); ctx2.moveTo(px, py);
          for (var predictStep = 0; predictStep < 30; predictStep++) {
            var predictAx = realMode ? 3 * N_ORBIT * N_ORBIT * predictX + 2 * N_ORBIT * predictVy : 0;
            var predictAy = realMode ? -2 * N_ORBIT * predictVx : 0;
            predictVx += predictAx * 1.2; predictVy += predictAy * 1.2; predictX += predictVx * 1.2; predictY += predictVy * 1.2;
            ctx2.lineTo(ox + predictY * sc, oy - predictX * sc);
          }
          ctx2.stroke(); ctx2.setLineDash([]);
          var navSpeed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          var navRange = Math.sqrt(st.x * st.x + st.y * st.y);
          var closingRate = navRange > .01 ? -(st.x * st.vx + st.y * st.vy) / navRange : 0;
          var stopDistance = navSpeed * navSpeed / (2 * ACCEL);
          var stopMargin = navRange - stopDistance - 5;
          if (navSpeed > .02) {
            var stopX = px + st.vy / navSpeed * stopDistance * sc, stopY = py - st.vx / navSpeed * stopDistance * sc;
            ctx2.strokeStyle = stopMargin >= 8 ? 'rgba(74,222,128,.32)' : 'rgba(248,113,113,.48)'; ctx2.lineWidth = 4; ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(stopX, stopY); ctx2.stroke();
            ctx2.strokeStyle = stopMargin >= 8 ? '#4ade80' : '#f87171'; ctx2.lineWidth = 1.3; ctx2.beginPath(); ctx2.moveTo(stopX - 5, stopY); ctx2.lineTo(stopX + 5, stopY); ctx2.moveTo(stopX, stopY - 5); ctx2.lineTo(stopX, stopY + 5); ctx2.stroke();
          }
          ctx2.strokeStyle = 'rgba(248,113,113,.6)'; ctx2.lineWidth = 1.2; ctx2.setLineDash([4, 4]); ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px - 68, py); ctx2.stroke(); ctx2.setLineDash([]); ctx2.fillStyle = '#fca5a5'; ctx2.font = '800 7px ui-monospace, monospace'; ctx2.fillText('ABORT', px - 67, py - 5);
          ctx2.save(); ctx2.translate(px, py); ctx2.shadowColor = 'rgba(125,211,252,.46)'; ctx2.shadowBlur = 11;
          var capsuleGradient = ctx2.createLinearGradient(-10, -8, 11, 8); capsuleGradient.addColorStop(0, '#64748b'); capsuleGradient.addColorStop(.45, '#f8fafc'); capsuleGradient.addColorStop(1, '#94a3b8');
          ctx2.fillStyle = capsuleGradient; ctx2.beginPath(); ctx2.moveTo(11, 0); ctx2.lineTo(-7, -7); ctx2.lineTo(-10, -5); ctx2.lineTo(-10, 5); ctx2.lineTo(-7, 7); ctx2.closePath(); ctx2.fill(); ctx2.shadowBlur = 0;
          ctx2.fillStyle = '#0ea5e9'; ctx2.beginPath(); ctx2.arc(4, 0, 2.4, 0, Math.PI * 2); ctx2.fill();
          // RCS plumes: a wide hot glow under a bright core. These are the only
          // feedback that a control input did anything, so they should read
          // instantly. Steady brightness — no flicker (photosensitivity).
          ctx2.shadowColor = 'rgba(253,224,71,.9)'; ctx2.shadowBlur = 9;
          ctx2.lineCap = 'round';
          [['fwd', [-11, -2, -18, 0, -11, 2]], ['back', [12, -2, 18, 0, 12, 2]], ['up', [-2, 8, 0, 15, 2, 8]], ['down', [-2, -8, 0, -15, 2, -8]]].forEach(function (jet) {
            if (!st.thrust[jet[0]] || st.fuel <= 0) return;
            var p = jet[1];
            ctx2.strokeStyle = 'rgba(251,146,60,.55)'; ctx2.lineWidth = 5;
            ctx2.beginPath(); ctx2.moveTo(p[0], p[1]); ctx2.lineTo(p[2], p[3]); ctx2.lineTo(p[4], p[5]); ctx2.stroke();
            ctx2.strokeStyle = 'rgba(255,251,235,.98)'; ctx2.lineWidth = 2;
            ctx2.beginPath(); ctx2.moveTo(p[0], p[1]); ctx2.lineTo(p[2], p[3]); ctx2.lineTo(p[4], p[5]); ctx2.stroke();
          });
          ctx2.shadowBlur = 0; ctx2.lineCap = 'butt';
          ctx2.restore();
          // Velocity vector and arrival reticle.
          var vectorX = px + st.vy * sc * 13, vectorY = py - st.vx * sc * 13;
          ctx2.strokeStyle = '#4ade80'; ctx2.lineWidth = 2; ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(vectorX, vectorY); ctx2.stroke();
          ctx2.fillStyle = '#4ade80'; ctx2.beginPath(); ctx2.arc(vectorX, vectorY, 2.5, 0, Math.PI * 2); ctx2.fill();
          ctx2.strokeStyle = 'rgba(74,222,128,.35)'; ctx2.lineWidth = 1; ctx2.beginPath(); ctx2.arc(ox - 6, oy, 14, 0, Math.PI * 2); ctx2.stroke(); ctx2.beginPath(); ctx2.arc(ox - 6, oy, 21, 0, Math.PI * 2); ctx2.stroke();
          // Compact flight-display telemetry.
          var range = Math.sqrt(st.x * st.x + st.y * st.y), speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          ctx2.fillStyle = 'rgba(2,6,23,.72)'; ctx2.fillRect(10, 10, 152, 61); ctx2.strokeStyle = 'rgba(125,211,252,.24)'; ctx2.strokeRect(10.5, 10.5, 151, 60);
          ctx2.font = '700 8px ui-monospace, monospace'; ctx2.fillStyle = '#94a3b8'; ctx2.fillText('RELATIVE NAVIGATION', 20, 24);
          ctx2.font = '850 12px ui-monospace, monospace'; ctx2.fillStyle = '#dbeafe'; ctx2.fillText(range.toFixed(0) + ' m', 20, 43); ctx2.fillText(speed.toFixed(2) + ' m/s', 83, 43);
          ctx2.fillStyle = st.fuel > 25 ? '#4ade80' : '#fbbf24'; ctx2.fillRect(20, 53, Math.max(0, st.fuel) * 1.22, 5); ctx2.strokeStyle = '#475569'; ctx2.strokeRect(20, 53, 122, 5);
          var approachPhase = range > 100 ? 'FAR FIELD' : range > 40 ? 'MIDCOURSE' : range > 5 ? 'FINAL APPROACH' : 'CAPTURE ZONE';
          ctx2.fillStyle = speed > 0.6 && range < 40 ? '#fbbf24' : '#86efac'; ctx2.font = '800 9px ui-monospace, monospace'; ctx2.textAlign = 'right'; ctx2.fillText(approachPhase + (speed > 0.6 && range < 40 ? ' // HIGH RATE' : ' // RATE GO'), Wc - 12, 20);
          ctx2.fillStyle = stopMargin >= 8 ? '#86efac' : '#fca5a5'; ctx2.fillText('BRAKING DISTANCE ' + stopDistance.toFixed(1) + ' M // ' + (stopMargin >= 0 ? 'STOP MARGIN +' : 'NO STOP MARGIN ') + stopMargin.toFixed(1) + ' M', Wc - 12, 34); ctx2.textAlign = 'left';
          // Closing-rate tape: green is the soft-capture envelope, while the
          // needle reports total relative speed (lateral motion counts too).
          ctx2.fillStyle = '#94a3b8'; ctx2.font = '700 7px ui-monospace, monospace'; ctx2.fillText('TOTAL RATE  0', 500, 48); ctx2.textAlign = 'right'; ctx2.fillText('2 M/S', 628, 48); ctx2.textAlign = 'left';
          ctx2.fillStyle = '#16372b'; ctx2.fillRect(500, 53, 38, 5); ctx2.fillStyle = '#543619'; ctx2.fillRect(538, 53, 90, 5); ctx2.strokeStyle = '#64748b'; ctx2.strokeRect(500.5, 53.5, 127, 4);
          var speedNeedleX = 500 + Math.min(2, speed) / 2 * 128; ctx2.strokeStyle = '#f8fafc'; ctx2.lineWidth = 1.5; ctx2.beginPath(); ctx2.moveTo(speedNeedleX, 50); ctx2.lineTo(speedNeedleX, 61); ctx2.stroke();
          // Adaptive final-approach inset preserves precision near contact while
          // the main field continues to show the complete rendezvous geometry.
          if (range < 60 && !st.over) {
            var insetX = 462, insetY = 232, insetW = 164, insetH = 102, portX = insetX + 137, portY = insetY + 53;
            var insetScale = Math.min(5, 108 / Math.max(18, range));
            ctx2.save(); ctx2.beginPath(); ctx2.rect(insetX, insetY, insetW, insetH); ctx2.clip();
            ctx2.fillStyle = 'rgba(2,6,23,.82)'; ctx2.fillRect(insetX, insetY, insetW, insetH); ctx2.strokeStyle = 'rgba(125,211,252,.32)'; ctx2.strokeRect(insetX + .5, insetY + .5, insetW - 1, insetH - 1);
            ctx2.fillStyle = 'rgba(14,165,233,.08)'; ctx2.beginPath(); ctx2.moveTo(portX, portY); ctx2.lineTo(insetX + 8, portY - 34); ctx2.lineTo(insetX + 8, portY + 34); ctx2.closePath(); ctx2.fill();
            ctx2.strokeStyle = 'rgba(125,211,252,.45)'; ctx2.setLineDash([4,4]); ctx2.beginPath(); ctx2.moveTo(insetX + 8, portY); ctx2.lineTo(portX, portY); ctx2.stroke(); ctx2.setLineDash([]);
            var insetCapsuleX = portX + st.y * insetScale, insetCapsuleY = portY - st.x * insetScale;
            ctx2.strokeStyle = '#67e8f9'; ctx2.lineWidth = 2; ctx2.beginPath(); ctx2.arc(portX, portY, 9, 0, Math.PI * 2); ctx2.stroke();
            ctx2.fillStyle = '#f8fafc'; ctx2.beginPath(); ctx2.arc(insetCapsuleX, insetCapsuleY, 4, 0, Math.PI * 2); ctx2.fill();
            ctx2.strokeStyle = '#4ade80'; ctx2.lineWidth = 1.3; ctx2.beginPath(); ctx2.moveTo(insetCapsuleX, insetCapsuleY); ctx2.lineTo(insetCapsuleX + st.vy * insetScale * 8, insetCapsuleY - st.vx * insetScale * 8); ctx2.stroke();
            ctx2.fillStyle = '#bae6fd'; ctx2.font = '800 7px ui-monospace, monospace'; ctx2.fillText('PROXIMITY ×' + (insetScale / sc).toFixed(1), insetX + 8, insetY + 13);
            ctx2.restore();
          }
          ctx2.fillStyle = 'rgba(2,6,23,.66)'; ctx2.fillRect(10, Hc - 31, realMode ? 147 : 220, 21); ctx2.fillStyle = realMode ? '#7dd3fc' : '#fde68a'; ctx2.font = '800 9px ui-monospace, monospace'; ctx2.fillText(realMode ? 'ORBITAL PHYSICS // ON' : 'VIDEO-GAME PHYSICS // ON', 18, Hc - 17);
          if (st.over) {
            ctx2.fillStyle = 'rgba(2,6,23,0.84)'; ctx2.fillRect(0, 0, Wc, Hc);
            // Soft-capture bloom at the port. One shot: it expands, fades, and
            // stops — it never loops, so nothing here strobes. Under reduced
            // motion it is a single static ring instead of an expanding one.
            if (st.overResult === 'docked') {
              var since = Math.max(0, frame - (st.overAt || 0));
              if (_prefersReducedMotion || since < 48) {
                var ringFade = _prefersReducedMotion ? 0.75 : 1 - since / 48;
                var ringR = _prefersReducedMotion ? 34 : 10 + since * 1.7;
                ctx2.save();
                ctx2.globalAlpha = Math.max(0, ringFade) * 0.92;
                ctx2.strokeStyle = '#4ade80'; ctx2.lineWidth = 3;
                ctx2.shadowColor = '#4ade80'; ctx2.shadowBlur = 18;
                ctx2.beginPath(); ctx2.arc(ox - 6, oy, ringR, 0, Math.PI * 2); ctx2.stroke();
                ctx2.restore();
              }
            }
            ctx2.fillStyle = st.msg.indexOf('capture') >= 0 || st.msg.indexOf('Soft') >= 0 ? '#4ade80' : '#fbbf24';
            ctx2.font = 'bold 15px system-ui'; ctx2.textAlign = 'center';
            var words = st.msg.split(' '); var line = ''; var ly = Hc / 2 - 12;
            for (var wi = 0; wi < words.length; wi++) {
              if ((line + words[wi]).length > 60) { ctx2.fillText(line, Wc / 2, ly); ly += 20; line = ''; }
              line += words[wi] + ' ';
            }
            ctx2.fillText(line, Wc / 2, ly); ctx2.textAlign = 'left';
          }
        }        var rafId = 0, frame = 0;
        var milestones = { m100: false, m40: false, m15: false };
        function updateHudMirror() {
          // Text mirror of the canvas HUD (WCAG 1.1.1) — imperative textContent
          // update, so no per-frame React state churn. aria-live stays "off":
          // continuous telemetry would swamp a screen reader; milestone
          // announcements below carry the key moments instead.
          if (!cv._issHud) cv._issHud = (cv.parentElement && cv.parentElement.parentElement) ? cv.parentElement.parentElement.querySelector('[data-dock-hud]') : null;
          var el = cv._issHud;
          if (!el) return;
          var range = Math.sqrt(st.x * st.x + st.y * st.y), speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          var phase = range > 100 ? 'far field' : range > 40 ? 'midcourse' : range > 5 ? 'final approach' : 'capture zone';
          var margin = range - speed * speed / (2 * ACCEL) - 5;
          el.textContent = 'Phase ' + phase + ' · range ' + range.toFixed(0) + ' m · relative speed ' + speed.toFixed(2) + ' m/s · stopping margin ' + margin.toFixed(1) + ' m · fuel ' + st.fuel.toFixed(0) + '%' + (st.over ? ' · run over' : '');
          if (!st.over) {
            if (!milestones.m100 && range < 100) { milestones.m100 = true; announceToSR('100 meters to the port. Speed ' + speed.toFixed(2) + ' meters per second.'); }
            if (!milestones.m40 && range < 40) { milestones.m40 = true; announceToSR('Final approach, 40 meters. Dock slower than 0.6 meters per second.'); }
            if (!milestones.m15 && range < 15) { milestones.m15 = true; announceToSR('Capture corridor, 15 meters. Verify alignment and positive stopping margin.'); }
          }
        }
        cv._dockResetMilestones = function () { milestones.m100 = false; milestones.m40 = false; milestones.m15 = false; };
        function loop() {
          if (!cv.isConnected) { cleanup(); return; }
          frame++;
          if (!st.over) step();
          if (!_prefersReducedMotion || frame % 4 === 0) draw();
          if (frame % 30 === 0) updateHudMirror();
          rafId = requestAnimationFrame(loop);
        }
        function setThrust(dir, on) { st.thrust[dir] = on; }
        cv._dockSetThrust = setThrust;
        cv._dockReset = function (mode) {
          realMode = mode !== false; cv._dockRealMode = realMode;
          st.x = 26; st.y = -190; st.vx = 0; st.vy = 1.0; st.fuel = 100; st.t = 0; st.over = false; st.msg = ''; st.trail = []; st.lastTrail = 0; st.overResult = null;
          st.thrust = { up: false, down: false, fwd: false, back: false };
          if (cv._dockResetMilestones) cv._dockResetMilestones();
          announceToSR(__alloT('stem.spacestation.dock_start_sr', 'New approach started: 190 meters from the docking port, closing at 1 meter per second.'));
        };
        function onKey(e, on) {
          var k = typeof e.key === 'string' && e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if (k === 'ArrowUp' || k === 'w') { setThrust('up', on); e.preventDefault(); }
          else if (k === 'ArrowDown' || k === 's') { setThrust('down', on); e.preventDefault(); }
          else if (k === 'ArrowRight' || k === 'd') { setThrust('fwd', on); e.preventDefault(); }
          else if (k === 'ArrowLeft' || k === 'a') { setThrust('back', on); e.preventDefault(); }
        }
        function clearThrust() { st.thrust = { up: false, down: false, fwd: false, back: false }; }
        var kd = function (e) { onKey(e, true); }, ku = function (e) { onKey(e, false); };
        cv.addEventListener('keydown', kd); cv.addEventListener('keyup', ku); cv.addEventListener('blur', clearThrust); window.addEventListener('blur', clearThrust);
        function cleanup() {
          cancelAnimationFrame(rafId);
          cv.removeEventListener('keydown', kd); cv.removeEventListener('keyup', ku); cv.removeEventListener('blur', clearThrust); window.removeEventListener('blur', clearThrust);
          cv._dockInit = false;
        }
        cv._dockCleanup = cleanup;
        loop();
      }

      // ── EVA repair minigame (turn-based DOM game — fully keyboard/AT friendly) ──
      var EVA_RAILS = ['Quest airlock', 'Node handrail', 'Lab handrail', 'Truss base', 'Truss rail 1', 'Truss rail 2', 'Pump worksite'];
      var evaS = d.eva || { pos: 0, tetherA: 0, tetherB: 0, freeTether: 'B', o2: 100, bolts: 0, done: false, failMsg: '', started: false, log: [] };
      function evaUpd(patch) { upd({ eva: Object.assign({}, evaS, patch) }); }
      function evaLog(entry, cost, extra) {
        var log2 = (evaS.log || []).concat([entry]).slice(-4);
        evaUpd(Object.assign({ log: log2, o2: Math.max(0, evaS.o2 - cost) }, extra || {}));
      }
      function evaClip() {
        if (evaS.done) return;
        var next = Math.min(EVA_RAILS.length - 1, evaS.pos + 1);
        var patch = {};
        patch[evaS.freeTether === 'A' ? 'tetherA' : 'tetherB'] = next;
        evaLog('🔗 Clipped tether ' + evaS.freeTether + ' to ' + EVA_RAILS[next] + '.', 2, patch);
      }
      function evaMove() {
        if (evaS.done) return;
        var next = Math.min(EVA_RAILS.length - 1, evaS.pos + 1);
        var clippedAhead = evaS.tetherA === next || evaS.tetherB === next;
        if (!clippedAhead) {
          // ONE update. evaUpd rebuilds `eva` from the closure snapshot `evaS`,
          // so a second call in the same handler silently reverted the first:
          // the fatal case used to show "consumables exhausted" while the O2
          // readout snapped back to its pre-penalty value and the safety-
          // violation log line vanished.
          var penalised = Math.max(0, evaS.o2 - 12);
          var violationLog = (evaS.log || []).concat(['⚠ Moved WITHOUT clipping ahead — one slip and you are a satellite. Safety violation: −12% O₂ (sim penalty).']).slice(-4);
          var violationPatch = { log: violationLog, o2: penalised };
          if (penalised <= 0) {
            violationPatch.done = true;
            violationPatch.failMsg = __alloT('stem.spacestation.eva_o2_out', 'Suit consumables exhausted — EVA aborted. Real spacewalks budget every breath; try a cleaner run.');
          }
          evaUpd(violationPatch);
          return;
        }
        var trailing = evaS.tetherA === next ? 'B' : 'A';
        var patch = { pos: next, freeTether: trailing };
        patch[trailing === 'A' ? 'tetherA' : 'tetherB'] = next;
        evaLog('🧗 Translated to ' + EVA_RAILS[next] + ' (trailing tether ' + trailing + ' re-stowed).', 4, patch);
      }
      function evaTorque() {
        if (evaS.done || evaS.pos !== EVA_RAILS.length - 1) return;
        var b = Math.min(4, (evaS.bolts || 0) + 1);
        if (b >= 4) {
          // Charge and log the last bolt like the other three. The route
          // display's "PROJECTED AT WORKSITE" figure already bills 5% per
          // remaining bolt, so leaving the fourth free made the simulation
          // disagree with the projection the student plans against — and the
          // log simply stopped instead of reporting the final torque.
          var finalLog = (evaS.log || []).concat(['🔩 Bolt 4/4 torqued. Pump module secured.']).slice(-4);
          evaUpd({ bolts: 4, o2: Math.max(0, evaS.o2 - 5), log: finalLog, done: true, failMsg: '' });
          if (addToast) addToast('🧑‍🚀 ' + __alloT('stem.spacestation.eva_win_toast', 'Pump module secured — EVA objective complete!'), 'success');
          if (typeof awardXP === 'function') { try { awardXP(5); } catch (e) {} }
        } else {
          evaLog('🔩 Bolt ' + b + '/4 torqued. Gloved hands tire fast — pace yourself.', 5, { bolts: b });
        }
      }
      function evaReset() { upd({ eva: { pos: 0, tetherA: 0, tetherB: 0, freeTether: 'B', o2: 100, bolts: 0, done: false, failMsg: '', started: true, log: ['📻 Airlock egress complete. Two tethers, both clipped at Quest. Daylight window open.'] } }); }

      function renderEvaRouteVisual() {
        var routeX = [54, 142, 230, 318, 406, 494, 582];
        var routeY = [105, 92, 105, 88, 105, 92, 105];
        var labels = ['QUEST', 'NODE', 'LAB', 'TRUSS', 'S1', 'S2', 'PUMP'];
        var position = Math.max(0, Math.min(routeX.length - 1, Number(evaS.pos || 0)));
        var astroX = routeX[position], astroY = routeY[position] - 27;
        var tetherAX = routeX[Math.max(0, Math.min(routeX.length - 1, Number(evaS.tetherA || 0)))];
        var tetherAY = routeY[Math.max(0, Math.min(routeY.length - 1, Number(evaS.tetherA || 0)))];
        var tetherBX = routeX[Math.max(0, Math.min(routeX.length - 1, Number(evaS.tetherB || 0)))];
        var tetherBY = routeY[Math.max(0, Math.min(routeY.length - 1, Number(evaS.tetherB || 0)))];
        var oxygen = Math.max(0, Math.min(100, Number(evaS.o2 == null ? 100 : evaS.o2)));
        var nextPosition = Math.min(routeX.length - 1, position + 1);
        var moveSecured = position >= routeX.length - 1 || Number(evaS.tetherA || 0) === nextPosition || Number(evaS.tetherB || 0) === nextPosition;
        var remainingMoves = Math.max(0, routeX.length - 1 - position);
        var remainingBolts = Math.max(0, 4 - Number(evaS.bolts || 0));
        var projectedOxygen = Math.max(0, oxygen - remainingMoves * 6 - remainingBolts * 5);
        var tetherSpan = Math.max(Math.abs(position - Number(evaS.tetherA || 0)), Math.abs(position - Number(evaS.tetherB || 0)));
        var tetherStatus = tetherSpan > 1 ? 'LOAD HIGH' : moveSecured ? 'NEXT MOVE SECURED' : 'CLIP AHEAD FIRST';
        var reserveFloor = 15, projectedMargin = projectedOxygen - reserveFloor;
        var reserveStatus = projectedMargin >= 0 ? 'RESERVE +' + projectedMargin.toFixed(0) + '%' : 'RESERVE BREACH ' + projectedMargin.toFixed(0) + '%';
        var phaseSteps = ['AIRLOCK', 'TRANSLATE', 'WORKSITE', 'SECURED'];
        var phaseIndex = !evaS.started ? 0 : position < routeX.length - 1 ? 1 : !evaS.done ? 2 : 3;
        var phaseLabel = evaS.done && evaS.failMsg ? 'ABORTED' : phaseSteps[phaseIndex];
        var phaseColor = evaS.done && evaS.failMsg ? '#f87171' : evaS.done ? '#4ade80' : '#38bdf8';
        return h('div', { className: 'iss-learning-visual iss-eva-visual' },
          h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': 'Spacewalk route. Astronaut at ' + EVA_RAILS[position] + '. Tether A at ' + EVA_RAILS[evaS.tetherA || 0] + '. Tether B at ' + EVA_RAILS[evaS.tetherB || 0] + '. Suit consumables ' + oxygen + ' percent. Projected at worksite ' + projectedOxygen + ' percent. ' + reserveStatus + '. ' + tetherStatus + '.' },
            h('defs', null, h('linearGradient', { id: 'iss-eva-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#020611' }), h('stop', { offset: '100%', stopColor: '#09213a' })),
              // Matches the gradient Earths already used by the orbit/ops/day
              // surfaces — this one was the odd flat disc out.
              h('radialGradient', { id: 'iss-eva-earth', cx: '48%', cy: '6%', r: '74%' },
                h('stop', { offset: '0%', stopColor: '#8ed2f7' }), h('stop', { offset: '30%', stopColor: '#2c7fc0' }), h('stop', { offset: '100%', stopColor: '#0a3160' })),
              h('filter', { id: 'iss-eva-limb', x: '-25%', y: '-25%', width: '150%', height: '150%' }, h('feGaussianBlur', { stdDeviation: 6 }))),
            h('rect', { width: 640, height: 190, fill: 'url(#iss-eva-bg)' }),
            [[27,27],[91,46],[165,21],[274,39],[368,19],[458,44],[537,25],[609,55]].map(function (s, i) { return h('circle', { key: 'e' + i, cx: s[0], cy: s[1], r: i % 3 ? .8 : 1.3, fill: i % 2 ? '#94a3b8' : '#e0f2fe' }); }),
            h('circle', { cx: 320, cy: 360, r: 217, fill: 'none', stroke: '#7dd3fc', strokeWidth: 7, opacity: .45, filter: 'url(#iss-eva-limb)' }),
            h('circle', { cx: 320, cy: 360, r: 212, fill: 'url(#iss-eva-earth)', stroke: '#a5e2ff', strokeWidth: 2.5, opacity: .95 }),
            h('g', { opacity: .3 }, h('ellipse', { cx: 168, cy: 168, rx: 44, ry: 7, fill: '#f8fafc' }), h('ellipse', { cx: 402, cy: 176, rx: 58, ry: 8, fill: '#f8fafc' }), h('ellipse', { cx: 556, cy: 166, rx: 30, ry: 6, fill: '#f8fafc' })),
            h('path', { d: 'M30 110 L610 110', stroke: '#94a3b8', strokeWidth: 8, opacity: .75 }),
            h('path', { d: 'M30 110 L610 110', stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '11 9', opacity: .65 }),
            [170, 470].map(function (x, i) { return h('g', { key: 'panel' + i }, h('rect', { x: x - 28, y: 118, width: 56, height: 28, rx: 3, fill: '#a86e16', stroke: '#fbbf24' }), [1,2,3].map(function (line) { return h('line', { key: line, x1: x - 28, y1: 118 + line * 7, x2: x + 28, y2: 118 + line * 7, stroke: '#fde68a', strokeWidth: .6 }); })); }),
            h('rect', { x: 28, y: 86, width: 55, height: 48, rx: 20, fill: '#cbd5e1', stroke: '#f8fafc', strokeWidth: 2 }),
            h('rect', { x: 563, y: 82, width: 49, height: 55, rx: 7, fill: (evaS.bolts || 0) >= 4 ? '#14532d' : '#4a2d18', stroke: (evaS.bolts || 0) >= 4 ? '#4ade80' : '#f97316', strokeWidth: 2 }),
            h('text', { x: 587, y: 104, textAnchor: 'middle', fill: '#f8fafc', fontSize: 8, fontWeight: 850 }, 'PUMP'),
            h('text', { x: 587, y: 119, textAnchor: 'middle', fill: '#fbbf24', fontSize: 9, fontWeight: 900 }, (evaS.bolts || 0) + '/4'),
            h('path', { className: 'iss-eva-tether-a', d: 'M' + astroX + ' ' + astroY + ' Q' + ((astroX + tetherAX) / 2) + ' ' + (Math.min(astroY, tetherAY) - 17) + ' ' + tetherAX + ' ' + tetherAY, fill: 'none', strokeWidth: 2 }),
            h('path', { className: 'iss-eva-tether-b', d: 'M' + astroX + ' ' + astroY + ' Q' + ((astroX + tetherBX) / 2) + ' ' + (Math.min(astroY, tetherBY) - 10) + ' ' + tetherBX + ' ' + tetherBY, fill: 'none', strokeWidth: 2 }),
            position < routeX.length - 1 ? h('line', { x1: routeX[position], y1: routeY[position], x2: routeX[nextPosition], y2: routeY[nextPosition], stroke: moveSecured ? '#4ade80' : '#fbbf24', strokeWidth: 5, strokeDasharray: moveSecured ? 'none' : '6 5', opacity: .65 }) : null,
            routeX.map(function (x, i) { var reached = i <= position; return h('g', { key: labels[i] }, h('circle', { cx: x, cy: routeY[i], r: 7, fill: reached ? '#0ea5e9' : '#172033', stroke: reached ? '#7dd3fc' : '#64748b', strokeWidth: 2 }), h('text', { x: x, y: 163, textAnchor: 'middle', fill: i === position ? '#7dd3fc' : '#94a3b8', fontSize: 8, fontWeight: i === position ? 900 : 700 }, labels[i])); }),
            h('g', { className: 'iss-eva-astronaut', transform: 'translate(' + astroX + ',' + astroY + ')' }, h('circle', { cx: 0, cy: -6, r: 9, fill: '#f8fafc', stroke: '#7dd3fc', strokeWidth: 2 }), h('ellipse', { cx: 0, cy: -6.4, rx: 6.2, ry: 5.2, fill: '#c98f1c', stroke: '#f6d67a', strokeWidth: .8, opacity: .93 }), h('ellipse', { cx: -2.1, cy: -8.2, rx: 2.2, ry: 1.3, fill: '#fff7e0', opacity: .55 }), h('rect', { x: -10, y: 4, width: 20, height: 24, rx: 8, fill: '#e2e8f0', stroke: '#94a3b8' }), h('rect', { x: -15, y: 7, width: 6, height: 17, rx: 3, fill: '#cbd5e1' }), h('line', { x1: -9, y1: 12, x2: -20, y2: 23, stroke: '#e2e8f0', strokeWidth: 4, strokeLinecap: 'round' }), h('line', { x1: 9, y1: 12, x2: 20, y2: 21, stroke: '#e2e8f0', strokeWidth: 4, strokeLinecap: 'round' })),
            h('rect', { x: 274, y: 16, width: 170, height: 25, rx: 8, fill: 'rgba(2,6,23,.72)', stroke: moveSecured ? 'rgba(74,222,128,.45)' : 'rgba(251,191,36,.45)' }),
            h('text', { x: 286, y: 27, fill: moveSecured ? '#86efac' : '#fde68a', fontSize: 7.5, fontWeight: 850 }, tetherStatus),
            h('text', { x: 286, y: 37, fill: '#cbd5e1', fontSize: 7.5 }, 'PROJECTED AT WORKSITE ' + projectedOxygen.toFixed(0) + '%'),
            h('rect', { x: 455, y: 7, width: 151, height: 43, rx: 8, fill: 'rgba(2,6,23,.76)', stroke: projectedMargin >= 0 ? 'rgba(74,222,128,.34)' : 'rgba(248,113,113,.5)' }),
            h('text', { x: 465, y: 18, fill: projectedMargin >= 0 ? '#bbf7d0' : '#fecaca', fontSize: 7.5, fontWeight: 850 }, 'SUIT BUDGET // ' + reserveStatus),
            h('rect', { x: 465, y: 24, width: 122, height: 5, rx: 3, fill: '#263449' }),
            h('rect', { x: 465, y: 24, width: 1.22 * oxygen, height: 5, rx: 3, fill: oxygen > 40 ? '#4ade80' : oxygen > 15 ? '#fbbf24' : '#f87171' }),
            h('rect', { x: 465, y: 35, width: 122, height: 5, rx: 3, fill: '#263449' }),
            h('rect', { x: 465, y: 35, width: 1.22 * projectedOxygen, height: 5, rx: 3, fill: projectedMargin >= 0 ? '#38bdf8' : '#f87171', opacity: .82 }),
            h('line', { x1: 465 + 1.22 * reserveFloor, y1: 21, x2: 465 + 1.22 * reserveFloor, y2: 43, stroke: '#f8fafc', strokeWidth: 1, strokeDasharray: '2 2', opacity: .9 }),
            h('text', { x: 600, y: 29, textAnchor: 'end', fill: '#cbd5e1', fontSize: 6.5, fontWeight: 800 }, 'NOW ' + oxygen.toFixed(0) + '%'),
            h('text', { x: 600, y: 40, textAnchor: 'end', fill: '#cbd5e1', fontSize: 6.5, fontWeight: 800 }, 'PLAN ' + projectedOxygen.toFixed(0) + '%'),
            h('text', { x: 22, y: 25, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'EVA ROUTE // TWO-TETHER PROTOCOL')),
          h('div', { 'data-iss-eva-phase': phaseLabel, role: 'img', 'aria-label': 'EVA mission phase ' + phaseLabel + '. Step ' + (phaseIndex + 1) + ' of 4.', style: { position: 'relative', display: 'flex', justifyContent: 'space-between', margin: '10px 16px 7px', paddingTop: 1 } },
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '9%', right: '9%', top: 10, height: 2, background: '#334155' } },
              h('div', { style: { height: '100%', width: (phaseIndex / 3 * 100) + '%', background: phaseColor, boxShadow: '0 0 8px ' + phaseColor } })),
            phaseSteps.map(function (step, i) {
              var reached = i <= phaseIndex;
              var current = i === phaseIndex;
              var label = evaS.done && evaS.failMsg && current ? 'ABORT' : step;
              return h('div', { key: step, style: { position: 'relative', zIndex: 1, width: '25%', textAlign: 'center' } },
                h('span', { 'aria-hidden': 'true', style: { display: 'inline-flex', width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: reached ? (current ? phaseColor : '#0e7490') : '#172033', border: '2px solid ' + (reached ? phaseColor : '#475569'), color: '#f8fafc', fontSize: 9, fontWeight: 900, boxShadow: current ? '0 0 12px ' + phaseColor : 'none' } }, i < phaseIndex ? '✓' : String(i + 1)),
                h('div', { style: { marginTop: 4, color: current ? phaseColor : reached ? '#cbd5e1' : '#64748b', fontSize: 8, fontWeight: current ? 900 : 750, letterSpacing: .6 } }, label));
            })),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'Blue = tether A  /  Gold = tether B'), h('span', null, 'PHASE ' + phaseLabel + ' · ' + (evaS.started ? tetherStatus + ' · ' + reserveStatus + ' · PROJECTED ' + projectedOxygen.toFixed(0) + '%' : 'AIRLOCK READY'))));
      }
      // ── Interior views (SVG "peek inside" for Cupola + sleep cabin) ──
      function renderCupolaInterior() {
        var scene = d.cupolaScene || 'day';
        var shut = !!d.cupolaShut;
        var SCENES = {
          day: { fill: '#2f6fab', grad: 'iss-cup-day', label: __alloT('stem.spacestation.scene_day', '☀️ Daylit Pacific'), note: 'Cloud spirals and ocean glint — crews say the blue is beyond any photograph.' },
          night: { fill: '#0b1026', grad: 'iss-cup-night', label: __alloT('stem.spacestation.scene_night', '🌃 Night — city lights'), note: 'Cities web the darkness in gold; lightning storms flicker hundreds of km wide.' },
          aurora: { fill: '#123a2e', grad: 'iss-cup-aurora', label: __alloT('stem.spacestation.scene_aurora', '🟢 Aurora pass'), note: 'The station flies THROUGH the upper fringes of aurora — green curtains below and beside you.' }
        };
        var sc = SCENES[scene] || SCENES.day;
        function windowPane(x, y, w, hgt, key) {
          return h('g', { key: key },
            h('rect', { x: x, y: y, width: w, height: hgt, rx: 6, fill: shut ? '#39424f' : 'url(#' + sc.grad + ')', stroke: '#94a3b8', strokeWidth: 2 }),
            // Thick fused-silica panes catch the dome's interior lighting.
            !shut ? h('path', { d: 'M ' + (x + 5) + ' ' + (y + hgt - 7) + ' L ' + (x + w * 0.46) + ' ' + (y + 4), stroke: 'rgba(255,255,255,.18)', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }) : null,
            shut ? h('line', { x1: x + 4, y1: y + hgt / 2, x2: x + w - 4, y2: y + hgt / 2, stroke: '#556072', strokeWidth: 3 }) :
              scene === 'aurora' ? h('path', { d: 'M ' + (x + 4) + ' ' + (y + hgt - 8) + ' Q ' + (x + w / 2) + ' ' + (y + 4) + ' ' + (x + w - 4) + ' ' + (y + hgt - 10), fill: 'none', stroke: '#4ade80', strokeWidth: 3, opacity: 0.8 }) :
              scene === 'night' ? h('g', null, [0, 1, 2, 3].map(function (i) { return h('circle', { key: i, cx: x + 6 + ((i * 37) % (w - 10)), cy: y + 8 + ((i * 23) % (hgt - 14)), r: 1.5, fill: '#fde68a' }); })) :
              h('ellipse', { cx: x + w / 2, cy: y + hgt - 2, rx: w * 0.55, ry: 6, fill: '#e8f4ff', opacity: 0.5 })
          );
        }
        return card('🔭 ' + __alloT('stem.spacestation.inside_cupola', 'Inside the Cupola'),
          h('div', null,
            h('svg', { viewBox: '0 0 360 180', role: 'img', 'aria-label': __alloT('stem.spacestation.cupola_aria', 'View from inside the Cupola dome: six angled windows around a large round center window, looking down at Earth. Scene: ') + sc.label, style: { width: '100%', maxWidth: 480, display: 'block', margin: '0 auto', background: '#101725', borderRadius: 12, border: '1px solid #334155' } },
              h('defs', null,
                h('radialGradient', { id: 'iss-cup-day', cx: '38%', cy: '28%', r: '96%' },
                  h('stop', { offset: '0%', stopColor: '#a6dcf8' }), h('stop', { offset: '36%', stopColor: '#3f86c4' }), h('stop', { offset: '100%', stopColor: '#123f6b' })),
                h('radialGradient', { id: 'iss-cup-night', cx: '46%', cy: '64%', r: '96%' },
                  h('stop', { offset: '0%', stopColor: '#1c2552' }), h('stop', { offset: '55%', stopColor: '#0b1026' }), h('stop', { offset: '100%', stopColor: '#04060f' })),
                h('radialGradient', { id: 'iss-cup-aurora', cx: '50%', cy: '80%', r: '112%' },
                  h('stop', { offset: '0%', stopColor: '#2f9670' }), h('stop', { offset: '46%', stopColor: '#123a2e' }), h('stop', { offset: '100%', stopColor: '#061a18' })),
                h('clipPath', { id: 'iss-cup-center' }, h('circle', { cx: 180, cy: 96, r: 34 })),
                h('filter', { id: 'iss-cup-glow', x: '-45%', y: '-45%', width: '190%', height: '190%' },
                  h('feGaussianBlur', { stdDeviation: 2.2, result: 'cupGlow' }),
                  h('feMerge', null, h('feMergeNode', { in: 'cupGlow' }), h('feMergeNode', { in: 'SourceGraphic' })))),
              // Earth-light floods the whole dome interior — the reason crews say
              // the Cupola "glows blue" even with the cabin lights off.
              !shut ? h('rect', { x: 0, y: 0, width: 360, height: 180, fill: sc.fill, opacity: 0.22 }) : null,
              windowPane(12, 62, 70, 56, 'w1'), windowPane(88, 30, 70, 44, 'w2'), windowPane(202, 30, 70, 44, 'w3'), windowPane(278, 62, 70, 56, 'w4'),
              windowPane(88, 118, 70, 44, 'w5'), windowPane(202, 118, 70, 44, 'w6'),
              h('circle', { cx: 180, cy: 96, r: 34, fill: shut ? '#39424f' : 'url(#' + sc.grad + ')', stroke: '#94a3b8', strokeWidth: 3 }),
              // What the notes already promise, finally drawn: cloud spirals and
              // ocean glint by day, a gold city web and a lightning cell at night,
              // green curtains on an auroral pass. Clipped to the center pane.
              !shut && scene === 'day' ? h('g', { clipPath: 'url(#iss-cup-center)' },
                h('path', { d: 'M 152 104 Q 168 87 186 96 Q 201 103 196 113', fill: 'none', stroke: '#f2fbff', strokeWidth: 5, opacity: 0.5, strokeLinecap: 'round' }),
                h('path', { d: 'M 156 78 Q 176 71 198 79', fill: 'none', stroke: '#ffffff', strokeWidth: 4, opacity: 0.34, strokeLinecap: 'round' }),
                h('ellipse', { cx: 197, cy: 84, rx: 8, ry: 4.5, fill: '#ffffff', opacity: 0.42 })) : null,
              !shut && scene === 'night' ? h('g', { clipPath: 'url(#iss-cup-center)' },
                h('path', { d: 'M 158 104 L 176 96 L 188 92 M 176 96 L 172 111 L 185 117 M 188 92 L 197 105', stroke: '#fbbf24', strokeWidth: 0.8, fill: 'none', opacity: 0.42 }),
                [[164, 90], [176, 96], [188, 92], [197, 105], [172, 111], [185, 117], [158, 104], [203, 94]].map(function (p, i) {
                  return h('circle', { key: i, cx: p[0], cy: p[1], r: i % 3 === 0 ? 2 : 1.3, fill: '#fde68a', opacity: 0.95, filter: 'url(#iss-cup-glow)' });
                }),
                h('circle', { cx: 206, cy: 118, r: 6.5, fill: '#e0f2fe', opacity: 0.48, filter: 'url(#iss-cup-glow)' })) : null,
              !shut && scene === 'aurora' ? h('g', { clipPath: 'url(#iss-cup-center)' },
                h('path', { className: 'iss-aurora-curtain', d: 'M 150 125 Q 164 97 172 74', fill: 'none', stroke: '#4ade80', strokeWidth: 7, opacity: 0.52, strokeLinecap: 'round', filter: 'url(#iss-cup-glow)' }),
                h('path', { className: 'iss-aurora-curtain', d: 'M 168 128 Q 182 101 188 78', fill: 'none', stroke: '#86efac', strokeWidth: 5, opacity: 0.46, strokeLinecap: 'round' }),
                h('path', { className: 'iss-aurora-curtain', d: 'M 189 126 Q 200 105 206 86', fill: 'none', stroke: '#22d3ee', strokeWidth: 4, opacity: 0.34, strokeLinecap: 'round' })) : null,
              !shut ? h('ellipse', { cx: 180, cy: 112, rx: 26, ry: 8, fill: scene === 'day' ? '#e8f4ff' : scene === 'aurora' ? '#4ade80' : '#fde68a', opacity: 0.45 }) : null,
              h('text', { x: 180, y: 14, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, '80 cm center window — the largest ever flown in space')
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
              Object.keys(SCENES).map(function (k) {
                var on = scene === k;
                return h('button', { key: k, type: 'button', 'aria-pressed': on, onClick: function () { upd({ cupolaScene: k, cupolaSeen: true }); }, style: { padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(56,189,248,0.2)' : PANEL, color: on ? '#7dd3fc' : TEXT, border: '1px solid ' + (on ? '#38bdf8' : '#334155') } }, SCENES[k].label);
              }),
              h('button', { type: 'button', 'aria-pressed': shut, onClick: function () { upd({ cupolaShut: !shut }); }, style: { padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: shut ? 'rgba(251,191,36,0.15)' : PANEL, color: shut ? '#fbbf24' : TEXT, border: '1px solid ' + (shut ? '#fbbf24' : '#334155') } }, shut ? '🛡️ ' + __alloT('stem.spacestation.shutters_closed', 'Shutters closed') : '🛡️ ' + __alloT('stem.spacestation.close_shutters', 'Close debris shutters'))),
            h('p', { style: { fontSize: 12, color: TEXT, lineHeight: 1.55, margin: '8px 0 0' } }, shut ? __alloT('stem.spacestation.shutter_note', 'Every window has an external shutter, closed whenever the Cupola is unattended — a micrometeoroid pit in this glass would be very bad news.') : sc.note)
          ), '#38bdf8');
      }
      function renderSleepInterior() {
        var spot = d.sleepSpot || 'bag';
        var SPOTS = {
          bag: { x: 95, y: 95, label: __alloT('stem.spacestation.spot_bag', 'Sleeping bag'), note: 'Strapped upright to the wall — "lying down" is meaningless in freefall. You clip in so you don’t drift into the vent.' },
          laptop: { x: 42, y: 52, label: __alloT('stem.spacestation.spot_laptop', 'Laptop'), note: 'Personal station for email, timeline, calls home, and movies. Velcro everywhere — the real space program runs on Velcro.' },
          vent: { x: 148, y: 26, label: __alloT('stem.spacestation.spot_vent', 'Air vent'), note: 'Constant airflow is a LIFE-SUPPORT feature: without it, your own exhaled CO₂ pools invisibly around your face while you sleep.' },
          gear: { x: 150, y: 120, label: __alloT('stem.spacestation.spot_gear', 'Personal kit'), note: 'Earplugs and an eye mask — the station hums at ~60-70 dB and the Sun rises every 92 minutes.' },
          photos: { x: 42, y: 125, label: __alloT('stem.spacestation.spot_photos', 'Family photos'), note: 'Each phone-booth-sized cabin is the only truly private space on the station. Crews decorate them like dorm rooms.' }
        };
        var sp = SPOTS[spot] || SPOTS.bag;
        return card('😴 ' + __alloT('stem.spacestation.inside_cabin', 'Inside a crew sleep cabin (Harmony)'),
          h('div', null,
            h('svg', { viewBox: '0 0 200 160', role: 'img', 'aria-label': __alloT('stem.spacestation.cabin_aria', 'Cutaway of a crew sleep cabin, about the size of a phone booth. Tap the hotspot buttons to inspect items.') + ' ' + sp.label + '.', style: { width: '100%', maxWidth: 380, display: 'block', margin: '0 auto', background: '#101725', borderRadius: 12, border: '1px solid #334155' } },
              h('defs', null,
                h('linearGradient', { id: 'iss-cabin-wall', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#28344a' }), h('stop', { offset: '58%', stopColor: '#1c2434' }), h('stop', { offset: '100%', stopColor: '#111925' })),
                h('linearGradient', { id: 'iss-cabin-bag', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#24374f' }), h('stop', { offset: '46%', stopColor: '#3f5c80' }), h('stop', { offset: '100%', stopColor: '#1d2c40' })),
                h('radialGradient', { id: 'iss-cabin-lamp', cx: '50%', cy: '0%', r: '100%' },
                  h('stop', { offset: '0%', stopColor: '#fff8e6', stopOpacity: 0.3 }), h('stop', { offset: '100%', stopColor: '#fff8e6', stopOpacity: 0 })),
                h('filter', { id: 'iss-cabin-glow', x: '-60%', y: '-60%', width: '220%', height: '220%' },
                  h('feGaussianBlur', { stdDeviation: 2.4, result: 'cabGlow' }),
                  h('feMerge', null, h('feMergeNode', { in: 'cabGlow' }), h('feMergeNode', { in: 'SourceGraphic' })))),
              h('rect', { x: 14, y: 10, width: 172, height: 140, rx: 10, fill: 'url(#iss-cabin-wall)', stroke: '#475569', strokeWidth: 2 }),
              // Quilted acoustic padding — the cabin walls really are soft-lined,
              // which is part of why crews describe it as a phone-booth-sized den.
              h('g', { opacity: 0.16 },
                [0, 1, 2, 3, 4, 5].map(function (i) { return h('line', { key: 'qv' + i, x1: 22 + i * 28, y1: 14, x2: 22 + i * 28, y2: 146, stroke: '#cbd5e1', strokeWidth: 0.6 }); }),
                [0, 1, 2, 3, 4].map(function (i) { return h('line', { key: 'qh' + i, x1: 18, y1: 30 + i * 27, x2: 182, y2: 30 + i * 27, stroke: '#cbd5e1', strokeWidth: 0.6 }); })),
              // Overhead cabin light — the only light source in here.
              h('ellipse', { cx: 100, cy: 12, rx: 76, ry: 34, fill: 'url(#iss-cabin-lamp)' }),
              h('rect', { x: 84, y: 11, width: 32, height: 3, rx: 1.5, fill: '#fff8e6', opacity: 0.8, filter: 'url(#iss-cabin-glow)' }),
              // Air vent + the airflow itself. Drawing the flow matters: the note
              // teaches that without it exhaled CO2 pools around a sleeper's face.
              h('rect', { x: 138, y: 18, width: 24, height: 12, rx: 3, fill: '#0f172a', stroke: '#64748b' }),
              [0, 1, 2].map(function (i) { return h('line', { key: i, x1: 141 + i * 7, y1: 20, x2: 141 + i * 7, y2: 28, stroke: '#475569' }); }),
              h('g', { opacity: 0.62 }, [0, 1, 2].map(function (i) {
                return h('path', { key: 'flow' + i, className: 'iss-cabin-airflow', d: 'M ' + (146 + i * 6) + ' 32 Q ' + (132 - i * 10) + ' ' + (52 + i * 12) + ' ' + (116 + i * 2) + ' ' + (66 + i * 16), fill: 'none', stroke: '#7dd3fc', strokeWidth: 1.3, strokeDasharray: '4 3', strokeLinecap: 'round' });
              })),
              // Sleeping bag: strapped upright, zipper down the middle.
              h('rect', { x: 80, y: 26, width: 34, height: 118, rx: 12, fill: 'url(#iss-cabin-bag)', stroke: '#64748b' }),
              h('line', { x1: 97, y1: 52, x2: 97, y2: 138, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.75 }),
              [66, 92, 118].map(function (y) { return h('rect', { key: 'strap' + y, x: 76, y: y, width: 42, height: 5, rx: 2, fill: '#64748b', opacity: 0.85 }); }),
              h('circle', { cx: 97, cy: 40, r: 9, fill: '#e8d8c3' }),
              h('path', { d: 'M 89 37 Q 97 31 105 37', fill: 'none', stroke: '#a8927a', strokeWidth: 1.2, opacity: 0.7 }),
              // Laptop — a real light source in a dark cabin, so the screen glows.
              h('rect', { x: 30, y: 40, width: 26, height: 18, rx: 3, fill: '#0f172a', stroke: '#64748b' }),
              h('rect', { x: 32.5, y: 42.5, width: 21, height: 13, rx: 1.5, fill: '#38bdf8', opacity: 0.72, filter: 'url(#iss-cabin-glow)' }),
              h('rect', { x: 28, y: 58, width: 30, height: 3, rx: 1.5, fill: '#475569' }),
              // Personal kit: eye mask + earplugs (the 60-70 dB hum, 92-minute sunrise).
              h('rect', { x: 138, y: 108, width: 26, height: 24, rx: 4, fill: '#243146', stroke: '#64748b' }),
              h('path', { d: 'M 142 116 Q 151 111 160 116 Q 151 122 142 116 Z', fill: '#1e293b', stroke: '#94a3b8', strokeWidth: 0.8 }),
              h('circle', { cx: 145, cy: 126, r: 2, fill: '#fbbf24', opacity: 0.85 }),
              h('circle', { cx: 152, cy: 127, r: 2, fill: '#fbbf24', opacity: 0.85 }),
              // Family photos, taped up at angles — crews decorate these like dorm rooms.
              h('g', null,
                h('rect', { x: 29, y: 112, width: 15, height: 12, rx: 1, fill: '#e2e8f0', stroke: '#a78bfa', strokeWidth: 0.9, transform: 'rotate(-7 36 118)' }),
                h('rect', { x: 38, y: 116, width: 14, height: 11, rx: 1, fill: '#cbd5e1', stroke: '#a78bfa', strokeWidth: 0.9, transform: 'rotate(6 45 121)' }),
                h('rect', { x: 33, y: 126, width: 13, height: 10, rx: 1, fill: '#dbe3ee', stroke: '#a78bfa', strokeWidth: 0.9, transform: 'rotate(-3 39 131)' })),
              // Velcro patches — "the real space program runs on Velcro."
              h('g', { opacity: 0.5 }, [[124, 46], [128, 132], [66, 30]].map(function (p, i) {
                return h('rect', { key: 'vel' + i, x: p[0], y: p[1], width: 7, height: 7, rx: 1, fill: 'none', stroke: '#94a3b8', strokeWidth: 0.8, strokeDasharray: '1.5 1.5' });
              })),
              h('circle', { cx: sp.x, cy: sp.y, r: 8, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5, filter: 'url(#iss-cabin-glow)' })
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
              Object.keys(SPOTS).map(function (k) {
                var on = spot === k;
                return h('button', { key: k, type: 'button', 'aria-pressed': on, onClick: function () { upd({ sleepSpot: k, cabinSeen: true }); }, style: { padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(232,121,249,0.16)' : PANEL, color: on ? '#f0abfc' : TEXT, border: '1px solid ' + (on ? '#e879f9' : '#334155') } }, SPOTS[k].label);
              })),
            h('p', { style: { fontSize: 12, color: TEXT, lineHeight: 1.55, margin: '8px 0 0' } }, h('strong', { style: { color: '#f0abfc' } }, sp.label + ': '), sp.note)
          ), '#e879f9');
      }

      function renderDockDebrief() {
        var report = d.dockDebrief;
        if (!report) return null;
        var speed = Math.max(0, Number(report.speed || 0));
        var offset = Math.max(0, Number(report.offset || 0));
        var fuel = Math.max(0, Math.min(100, Number(report.fuel == null ? 0 : report.fuel)));
        var elapsed = Math.max(0, Number(report.elapsed || 0));
        var outcome = d.dockResult === 'docked' ? 'SOFT CAPTURE' : d.dockResult === 'bonk' ? 'HARD CONTACT' : 'APPROACH LOST';
        var outcomeColor = d.dockResult === 'docked' ? '#4ade80' : d.dockResult === 'bonk' ? '#fbbf24' : '#f87171';
        var modeLabel = report.mode === 'game' ? 'GAME PHYSICS' : 'ORBITAL PHYSICS';
        function metric(y, label, value, max, targetMax, unit, decimals, color) {
          var markerX = 178 + 374 * Math.min(1, value / max);
          var targetWidth = targetMax == null ? 0 : 374 * Math.min(1, targetMax / max);
          return h('g', { key: label },
            h('text', { x: 22, y: y + 4, fill: '#cbd5e1', fontSize: 9, fontWeight: 850, letterSpacing: .8 }, label),
            h('rect', { x: 178, y: y - 5, width: 374, height: 10, rx: 5, fill: '#17243a', stroke: '#334155' }),
            targetMax == null ? h('rect', { x: 178, y: y - 5, width: Math.max(2, markerX - 178), height: 10, rx: 5, fill: color, opacity: .58 }) :
              h('rect', { x: 178, y: y - 5, width: targetWidth, height: 10, rx: 5, fill: '#14532d', opacity: .86 }),
            targetMax == null ? null : h('line', { x1: 178 + targetWidth, y1: y - 9, x2: 178 + targetWidth, y2: y + 9, stroke: '#86efac', strokeWidth: 1.5, strokeDasharray: '2 2' }),
            h('line', { x1: markerX, y1: y - 11, x2: markerX, y2: y + 11, stroke: color, strokeWidth: 2 }),
            h('circle', { cx: markerX, cy: y, r: 4, fill: color, stroke: '#f8fafc', strokeWidth: 1.2 }),
            h('text', { x: 610, y: y + 4, textAnchor: 'end', fill: color, fontSize: 10, fontWeight: 900 }, value.toFixed(decimals) + unit),
            targetMax == null ? null : h('text', { x: 178, y: y + 18, fill: '#86efac', fontSize: 7.5, fontWeight: 800 }, 'CAPTURE ENVELOPE ≤ ' + targetMax.toFixed(decimals) + unit));
        }
        var aria = outcome + '. ' + (d.dockResult === 'drift' ? 'Final' : 'Contact') + ' rate ' + speed.toFixed(2) + ' meters per second. Port offset ' + offset.toFixed(2) + ' meters. Propellant ' + fuel.toFixed(0) + ' percent. Elapsed time ' + elapsed.toFixed(0) + ' seconds. ' + modeLabel + '.';
        return h('div', { className: 'iss-learning-visual iss-dock-debrief', 'data-iss-dock-debrief': d.dockResult || 'complete' },
          h('svg', { viewBox: '0 0 640 184', role: 'img', 'aria-label': aria },
            h('defs', null, h('linearGradient', { id: 'iss-dock-debrief-bg', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#03101f' }), h('stop', { offset: '100%', stopColor: '#0b2038' }))),
            h('rect', { width: 640, height: 184, rx: 12, fill: 'url(#iss-dock-debrief-bg)' }),
            h('path', { d: 'M0 43 H640', stroke: '#334155', strokeWidth: 1 }),
            h('text', { x: 22, y: 20, fill: '#7dd3fc', fontSize: 9, fontWeight: 850, letterSpacing: 1.4 }, 'POST-APPROACH FLIGHT DATA'),
            h('text', { x: 22, y: 36, fill: outcomeColor, fontSize: 14, fontWeight: 900, letterSpacing: 1 }, outcome),
            h('text', { x: 610, y: 22, textAnchor: 'end', fill: '#cbd5e1', fontSize: 8.5, fontWeight: 800 }, modeLabel),
            h('text', { x: 610, y: 36, textAnchor: 'end', fill: '#94a3b8', fontSize: 8.5 }, 'MET ' + elapsed.toFixed(1) + ' s · RANGE ' + Math.max(0, Number(report.range || 0)).toFixed(1) + ' m'),
            metric(66, d.dockResult === 'drift' ? 'FINAL RATE' : 'CONTACT RATE', speed, 2, .6, ' m/s', 2, speed <= .6 ? '#4ade80' : '#f87171'),
            metric(111, 'PORT OFFSET', offset, 10, 2.5, ' m', 2, offset <= 2.5 ? '#4ade80' : '#fbbf24'),
            metric(156, 'PROPELLANT', fuel, 100, null, '%', 0, fuel > 20 ? '#38bdf8' : '#fbbf24')),
          h('div', { className: 'iss-visual-caption' },
            h('span', null, 'Green bands = soft-capture limits'),
            h('span', null, 'Rate + alignment decide capture')));
      }
      function renderMissions() {
        var dockRealMode = d.dockRealMode !== false;
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.missions_intro', 'Two hands-on missions. Both are simplified but honest: the docking sim runs the real relative-motion equations (with orbit effects sped up so you can feel them), and the spacewalk enforces the real two-tether safety rule.')),

          card('🚀 ' + __alloT('stem.spacestation.mission_dock', 'Mission 1 — Dock the cargo capsule'),
            h('div', null,
              h('p', { id: 'iss-dock-instructions', style: { fontSize: 12, color: SOFT, lineHeight: 1.55, margin: '0 0 8px' } },
                __alloT('stem.spacestation.dock_help', 'Fly the capsule (left side) onto the glowing port. Arrow keys / WASD or hold a thruster button with Space or Enter: → thrusts forward, ← brakes, ↑/↓ steer radially. Dock slower than 0.6 m/s, inside the corridor. With ORBITAL PHYSICS ON, watch the counter-intuitive part: thrusting forward also pushes you upward off the approach line — orbits are not roads.')),
              h('canvas', {
                className: 'iss-dock-canvas',
                ref: function (cv) { if (cv) { cv._dockRealMode = dockRealMode; dockingCanvasRef(cv); } },
                'data-dock-canvas': 'true',
                tabIndex: 0, role: 'application',
                'aria-label': __alloT('stem.spacestation.dock_aria', 'Docking simulator. Use arrow keys or W A S D to thrust. Goal: reach the docking port slower than 0.6 meters per second.'),
                'aria-describedby': 'iss-dock-instructions iss-dock-status',
                'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight W A S D',
                style: { width: '100%', maxWidth: 640, display: 'block', margin: '0 auto', borderRadius: 12, border: '1px solid #334155', background: '#050a18', cursor: 'crosshair' }
              }),
              h('div', { id: 'iss-dock-status', className: 'iss-sr-only', 'data-dock-hud': 'true', 'aria-live': 'off', 'aria-atomic': 'true' }, 'Phase far field · range 192 m · relative speed 1.00 m/s · stopping margin 185.3 m · fuel 100%'),
              h('div', { role: 'group', 'aria-label': 'Thruster controls', style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 } },
                [['back', '←', 'Brake'], ['up', '↑', 'Radial out'], ['down', '↓', 'Radial in'], ['fwd', '→', 'Forward']].map(function (b) {
                  function press(on) { return function (e) { e.preventDefault(); var cv = document.querySelector('[data-dock-canvas]') || e.currentTarget.parentElement.parentElement.querySelector('canvas'); if (cv && cv._dockSetThrust) cv._dockSetThrust(b[0], on); }; }
                  function holdKey(on) { return function (e) { if (e.key === ' ' || e.key === 'Enter') press(on)(e); }; }
                  return h('button', { key: b[0], type: 'button', 'aria-label': 'Thrust ' + b[2] + '. Press and hold with Space or Enter.', onPointerDown: press(true), onPointerUp: press(false), onPointerCancel: press(false), onPointerLeave: press(false), onKeyDown: holdKey(true), onKeyUp: holdKey(false), onBlur: press(false), style: { padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: 'pointer', background: PANEL, color: TEXT, border: '1px solid #475569', touchAction: 'none' } }, b[1] + ' ', h('span', { style: { fontSize: 10, fontWeight: 600, color: SOFT } }, b[2]));
                })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 } },
                h('button', { type: 'button', onClick: function (e) { var cv = e.currentTarget.parentElement.parentElement.querySelector('canvas'); if (cv && cv._dockReset) cv._dockReset(dockRealMode); upd({ dockResult: null, dockMsg: '', dockDebrief: null }); }, style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, '🔁 ' + __alloT('stem.spacestation.dock_retry', 'New approach')),
                h('button', { type: 'button', 'aria-pressed': dockRealMode, onClick: function (e) { var next = !dockRealMode; var cv = e.currentTarget.parentElement.parentElement.querySelector('canvas'); upd({ dockRealMode: next, dockResult: null, dockMsg: '', dockDebrief: null }); if (cv && cv._dockReset) cv._dockReset(next); }, style: { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: dockRealMode ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.12)', color: dockRealMode ? '#4ade80' : '#fbbf24', border: '1px solid ' + (dockRealMode ? '#22c55e' : '#fbbf24') } }, dockRealMode ? '🧲 ' + __alloT('stem.spacestation.dock_real_on', 'Orbital physics ON') : '🎮 ' + __alloT('stem.spacestation.dock_real_off', 'Video-game mode (physics OFF)'))),
              d.dockMsg ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + (d.dockResult === 'docked' ? '#22c55e' : '#fbbf24'), fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: d.dockResult === 'docked' ? '#4ade80' : '#fbbf24' } }, __alloT('stem.spacestation.mission_report', 'Mission report: ')), d.dockMsg,
                (d.dockRuns || 0) > 0 ? h('span', { style: { color: SOFT } }, '  (' + (d.dockWins || 0) + '/' + d.dockRuns + ' docked)') : null) : null,
              renderDockDebrief(),
              h('p', { style: { fontSize: 11, color: SOFT, marginTop: 8, lineHeight: 1.5 } },
                __alloT('stem.spacestation.dock_science', '🔬 The science: relative motion near an orbiting target follows the Clohessy-Wiltshire equations — thrust toward the target and you drift off-axis, because raising your speed raises your orbit. Real approaches are therefore slow, computed, and rehearsed. Try predicting your drift BEFORE toggling physics on: that is the whole discipline of rendezvous in one toggle.'))
            ), '#38bdf8'),

          card('🧑‍🚀 ' + __alloT('stem.spacestation.mission_eva', 'Mission 2 — Spacewalk: replace the failed pump'),
            h('div', null,
              h('p', { style: { fontSize: 12, color: SOFT, lineHeight: 1.55, margin: '0 0 8px' } },
                __alloT('stem.spacestation.eva_help', 'An ammonia pump on the truss has failed. Translate hand-over-hand from the Quest airlock to the worksite and torque 4 bolts — while respecting the real rule that keeps astronauts alive: at least one tether clipped AT ALL TIMES. Clip the free tether ahead, then move. Every action costs suit consumables.')),
              renderEvaRouteVisual(),
              !evaS.started ? h('button', { type: 'button', onClick: evaReset, style: { padding: '8px 16px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 900, fontSize: 13, cursor: 'pointer' } }, '🚪 ' + __alloT('stem.spacestation.eva_start', 'Open the hatch')) :
              h('div', null,
                h('div', { role: 'list', 'aria-label': 'Handrail route', style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 } },
                  EVA_RAILS.map(function (r, i) {
                    var here = evaS.pos === i;
                    var tA = evaS.tetherA === i, tB = evaS.tetherB === i;
                    return h('div', { key: i, role: 'listitem', style: { padding: '6px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, background: here ? 'rgba(56,189,248,0.2)' : 'rgba(2,6,23,0.4)', color: here ? '#7dd3fc' : SOFT, border: '1px solid ' + (here ? '#38bdf8' : '#334155') } },
                      (here ? '🧑‍🚀 ' : '') + r + (tA ? ' 🔗A' : '') + (tB ? ' 🔗B' : ''));
                  })),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: evaS.o2 > 40 ? '#4ade80' : evaS.o2 > 15 ? '#fbbf24' : '#f87171' } }, '🫁 ' + __alloT('stem.spacestation.eva_o2', 'Suit consumables: ') + evaS.o2.toFixed(0) + '%'),
                  h('div', { style: { fontSize: 11, color: SOFT } }, '🔩 ' + (evaS.bolts || 0) + '/4 ' + __alloT('stem.spacestation.eva_bolts', 'bolts'))),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  h('button', { type: 'button', disabled: evaS.done || evaS.pos >= EVA_RAILS.length - 1, onClick: evaClip, style: { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: PANEL, color: TEXT, border: '1px solid #475569', opacity: (evaS.done || evaS.pos >= EVA_RAILS.length - 1) ? 0.5 : 1 } }, '🔗 ' + __alloT('stem.spacestation.eva_clip', 'Clip tether ') + evaS.freeTether + __alloT('stem.spacestation.eva_ahead', ' ahead')),
                  h('button', { type: 'button', disabled: evaS.done || evaS.pos >= EVA_RAILS.length - 1, onClick: evaMove, style: { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: PANEL, color: TEXT, border: '1px solid #475569', opacity: (evaS.done || evaS.pos >= EVA_RAILS.length - 1) ? 0.5 : 1 } }, '🧗 ' + __alloT('stem.spacestation.eva_translate', 'Translate forward')),
                  h('button', { type: 'button', disabled: evaS.done || evaS.pos !== EVA_RAILS.length - 1, onClick: evaTorque, style: { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: evaS.pos === EVA_RAILS.length - 1 && !evaS.done ? 'rgba(251,191,36,0.15)' : PANEL, color: evaS.pos === EVA_RAILS.length - 1 && !evaS.done ? '#fbbf24' : TEXT, border: '1px solid ' + (evaS.pos === EVA_RAILS.length - 1 && !evaS.done ? '#fbbf24' : '#475569'), opacity: (evaS.done || evaS.pos !== EVA_RAILS.length - 1) ? 0.5 : 1 } }, '🔩 ' + __alloT('stem.spacestation.eva_torque', 'Torque bolt')),
                  h('button', { type: 'button', onClick: evaReset, style: { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: SOFT, border: '1px solid #334155' } }, '🔁 ' + __alloT('stem.spacestation.eva_restart', 'Restart EVA'))),
                h('div', { role: 'log', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155', fontSize: 11.5, color: TEXT, lineHeight: 1.6, minHeight: 40 } },
                  (evaS.log || []).map(function (l, i) { return h('div', { key: i }, l); })),
                evaS.done ? h('div', { role: 'status', style: { marginTop: 8, padding: 8, borderRadius: 8, background: evaS.failMsg ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', borderLeft: '3px solid ' + (evaS.failMsg ? '#ef4444' : '#22c55e'), fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                  evaS.failMsg || __alloT('stem.spacestation.eva_win', '✅ Pump secured with {pct}% consumables to spare. Real EVAs run 6-8 hours with the same discipline you just practiced: clip, verify, move, repeat — hundreds of times.').replace('{pct}', evaS.o2.toFixed(0))) : null
              ),
              h('p', { style: { fontSize: 11, color: SOFT, marginTop: 8, lineHeight: 1.5 } },
                __alloT('stem.spacestation.eva_science', '🔬 The science: nothing about a spacewalk is casual. Astronauts pre-breathe pure O₂ for hours (decompression safety), gloves stiffen every grip like squeezing a tennis ball for 7 hours, and the two-tether rule exists because in orbit a slip does not mean falling — it means becoming a slowly departing satellite.'))
            ), '#fbbf24')
        );
      }

      // ── Interior shift: room exploration + learn-by-doing activities ──
      function renderInterior() {
        var roomIdx = INTERIOR_ROOMS.findIndex(function (r) { return r.id === d.interiorRoom; });
        if (roomIdx < 0) roomIdx = 0;
        var room = INTERIOR_ROOMS[roomIdx];
        var interiorRouteRooms = INTERIOR_ROUTE_IDS.map(function (id) { return INTERIOR_ROOMS.find(function (candidate) { return candidate.id === id; }); }).filter(Boolean);
        var routeRoomIdx = interiorRouteRooms.findIndex(function (candidate) { return candidate.id === room.id; });
        var routePlot = { harmony: [54, 52], destiny: [174, 52], unity: [294, 52], tranquility: [430, 24], cupola: [558, 68] };
        var done = d.interiorDone || {};
        var completed = Object.keys(done).filter(function (key) { return !!done[key]; }).length;
        var visited = Object.assign({}, d.interiorSeen || {}); visited[room.id] = true;
        var visitedCount = Object.keys(visited).filter(function (key) { return !!visited[key]; }).length;
        var inspected = d.interiorInspected || {};
        var inspectedCount = Object.keys(inspected).filter(function (key) { return !!inspected[key]; }).length;
        var roomDone = !!done[room.id];
        var guided = d.interiorGuided !== false;
        var telemetryLabel = room.telemetry[0];
        var telemetryValue = room.id === 'unity' && d.lowGResult ? Number(d.lowGResult.speed).toFixed(2) + ' m/s' : room.id === 'tranquility' && roomDone ? 'STABLE' : room.telemetry[1];
        var attemptStats = d.interiorAttempts || {};
        var totalAttempts = Object.keys(attemptStats).reduce(function (sum, key) { return sum + Number(attemptStats[key] || 0); }, 0);
        var firstTryCount = Object.keys(done).filter(function (key) { return !!done[key] && attemptStats[key] === 1; }).length;
        var notesCount = Object.keys(d.interiorNotes || {}).filter(function (key) { return String((d.interiorNotes || {})[key] || '').trim().length > 0; }).length;
        var nextIncompleteRoom = interiorRouteRooms.find(function (candidate) { return !done[candidate.id]; });
        var nextIncomplete = nextIncompleteRoom ? INTERIOR_ROOMS.findIndex(function (candidate) { return candidate.id === nextIncompleteRoom.id; }) : -1;
        var choiceId = (d.interiorChoices || {})[room.id];
        var pickedChoice = room.choices.find(function (c) { return c.id === choiceId; });
        var discoveryPrefix = room.id + ':';
        var selectedDiscovery = String(d.interiorDiscovery || '').indexOf(discoveryPrefix) === 0 ? parseInt(String(d.interiorDiscovery).split(':')[1], 10) : -1;
        var interiorView = d.interiorView === 'diagram' ? 'diagram' : '3d';
        var navigation = Object.assign({ hatches: {}, collisions: 0, railGrabs: 0, looseHits: 0, routeStep: 0 }, d.interiorNav || {});
        var navigationChallengeCount = [navigation.preciseHatch, navigation.handrailStop, navigation.cargoClear, navigation.orientationRecovered, navigation.routeComplete].filter(Boolean).length;

        function recordInteriorNavigation(event) {
          if (!event || !event.type) return;
          setLabToolData(function (prev) {
            var station = Object.assign({}, (prev && prev.spaceStation) || {});
            var nav = Object.assign({ hatches: {}, collisions: 0, railGrabs: 0, looseHits: 0, routeStep: 0 }, station.interiorNav || {});
            nav.hatches = Object.assign({}, nav.hatches || {});
            if (event.type === 'hatch') {
              nav.hatches[event.from + '>' + event.to] = true;
              if (Number(event.speed) <= 0.35) nav.preciseHatch = true;
              if (isFinite(Number(event.routeStep))) nav.routeStep = Number(event.routeStep);
              var nextSeen = Object.assign({}, station.interiorSeen || {});
              nextSeen[event.to] = true;
              station.interiorSeen = nextSeen;
              station.interiorRoom = event.to;
              station.interiorDiscovery = null;
            } else if (event.type === 'rail-grab') {
              nav.railGrabs = Number(nav.railGrabs || 0) + 1;
              if (Number(event.speed) >= 0.12 && Number(event.speed) <= 0.35) nav.handrailStop = true;
            } else if (event.type === 'collision') {
              nav.collisions = Number(nav.collisions || 0) + 1;
              nav.lastImpactSpeed = Number(event.speed || 0);
            } else if (event.type === 'cargo-hit') {
              nav.looseHits = Number(nav.looseHits || 0) + 1;
            } else if (event.type === 'cargo-clear') {
              nav.cargoClear = true;
            } else if (event.type === 'orientation-recovered') {
              nav.orientationRecovered = true;
            } else if (event.type === 'route-complete') {
              nav.routeComplete = true;
            }
            station.interiorNav = nav;
            return Object.assign({}, prev, { spaceStation: station });
          });
          if (event.type === 'rail-grab' && Number(event.speed) >= 0.12 && Number(event.speed) <= 0.35) announceToSR('Controlled handrail stop challenge complete.');
          else if (event.type === 'cargo-clear') announceToSR('Loose cargo avoided. Navigation challenge complete.');
          else if (event.type === 'orientation-recovered') announceToSR('Orientation recovery challenge complete.');
          else if (event.type === 'route-complete') announceToSR('Five-module free-flight route complete.');
        }
        function roomInfoForInterior(id) {
          return INTERIOR_ROOMS.find(function (candidate) { return candidate.id === id; }) || INTERIOR_ROOMS[0];
        }
        function interiorCanvasFrom(element) {
          var shell = element && element.closest ? element.closest('[data-iss-interior-sim]') : null;
          return shell && shell.querySelector('[data-iss-interior-canvas]');
        }
        function chooseInteriorView(mode, event) {
          if (mode === 'diagram') {
            var interiorRoot = event && event.currentTarget && event.currentTarget.closest ? event.currentTarget.closest('.iss-interior') : null;
            var canvas = interiorRoot && interiorRoot.querySelector('[data-iss-interior-canvas]');
            if (canvas && canvas._issInteriorCleanup) canvas._issInteriorCleanup();
          }
          upd({ interiorView: mode });
          announceToSR(mode === '3d' ? 'Interactive 3-D free-flight view opened.' : 'Accessible interior diagram opened.');
        }
        function renderInteriorSimulation() {
          var challenges = [
            { id: 'hatch', done: !!navigation.preciseHatch, title: 'Controlled hatch', note: 'Cross any hatch at 0.35 m/s or slower.' },
            { id: 'rail', done: !!navigation.handrailStop, title: 'Handrail braking', note: 'Reach a rail and catch it while coasting at 0.12-0.35 m/s.' },
            { id: 'cargo', done: !!navigation.cargoClear, title: 'Loose-object awareness', note: navigation.looseHits ? 'Try Unity again without contacting the pouch.' : 'Turn through Unity without touching the pouch.' },
            { id: 'roll', done: !!navigation.orientationRecovered, title: 'Orientation recovery', note: 'Roll past 40 degrees, then manually return within 8 degrees.' },
            { id: 'route', done: !!navigation.routeComplete, title: 'Connected-station route', note: 'Travel Harmony -> Destiny -> Unity -> Tranquility -> Cupola in order.' }
          ];
          var nextChallenge = challenges.find(function (challenge) { return !challenge.done; });
          function controlButton(action, label, shortcut) {
            function setControl(on) {
              return function (event) {
                if (event) event.preventDefault();
                var canvas = interiorCanvasFrom(event && event.currentTarget);
                if (canvas && canvas._issInteriorSetControl) canvas._issInteriorSetControl(action, on);
              };
            }
            function keyControl(on) {
              return function (event) {
                if (event.key !== ' ' && event.key !== 'Enter') return;
                setControl(on)(event);
              };
            }
            return h('button', {
              key: action, type: 'button', 'data-iss-interior-control': action,
              'aria-label': label + '. Press and hold. Keyboard shortcut ' + shortcut + '.',
              onPointerDown: setControl(true), onPointerUp: setControl(false),
              onPointerCancel: setControl(false), onPointerLeave: setControl(false),
              onKeyDown: keyControl(true), onKeyUp: keyControl(false), onBlur: setControl(false)
            }, h('span', null, label), h('kbd', { 'aria-hidden': 'true' }, shortcut));
          }
          function safetyAction(method, announcement) {
            return function (event) {
              var canvas = interiorCanvasFrom(event.currentTarget);
              if (canvas && typeof canvas[method] === 'function') canvas[method]();
              if (announcement) announceToSR(announcement);
            };
          }
          function resetNavigation(event) {
            setLabToolData(function (prev) {
              var station = Object.assign({}, (prev && prev.spaceStation) || {});
              station.interiorRoom = 'harmony';
              station.interiorNav = { hatches: {}, collisions: 0, railGrabs: 0, looseHits: 0, routeStep: 0 };
              return Object.assign({}, prev, { spaceStation: station });
            });
            var canvas = interiorCanvasFrom(event.currentTarget);
            if (canvas && canvas._issInteriorReset) canvas._issInteriorReset();
            announceToSR('Free-flight route restarted in Harmony. Crew jobs were kept.');
          }
          return h('div', { className: 'iss-interior-sim', 'data-iss-interior-sim': 'true' },
            h('div', { className: 'iss-interior-3d', 'data-iss-interior-3d': room.id, 'data-iss-room-transition': room.id },
              h('canvas', {
                className: 'iss-interior-canvas',
                ref: function (canvas) {
                  if (!canvas) return;
                  canvas._issInteriorWantRoom = room.id;
                  canvas._issInteriorEvent = recordInteriorNavigation;
                  canvas._issInteriorTaskDone = roomDone;
                  canvas._issInteriorCupolaShutters = !!d.cupolaShutters;
                  interiorCanvasRef(canvas);
                },
                'data-iss-interior-canvas': 'true',
                role: 'application', tabIndex: 0,
                'aria-label': 'Interactive 3-D interior of the International Space Station. Training push controls add velocity for exploration; actual crew translate by pushing and pulling handrails. Follow Harmony through Destiny and Unity, turn port into Tranquility, then move nadir into Cupola. Momentum continues until you push the other way or catch a nearby rail.',
                'aria-describedby': 'iss-interior-flight-instructions iss-interior-flight-status',
                'aria-keyshortcuts': 'W A S D R F Q E ArrowUp ArrowDown ArrowLeft ArrowRight Space Home'
              }),
              h('div', { className: 'iss-interior-hud', 'aria-hidden': 'true' },
                h('span', { className: 'iss-interior-room-hud', 'data-iss-interior-room-hud': 'true' }, room.module.toUpperCase() + ' // ' + room.zone.toUpperCase()),
                h('span', { className: 'iss-interior-speed', 'data-iss-interior-speed': 'true', 'data-rate': 'stopped' }, 'SPEED 0.00 M/S // STOP ~0.00 M'),
                h('span', { 'data-iss-interior-mode': 'true' }, 'STATIONARY'),
                h('span', { 'data-iss-interior-rail-distance': 'true' }, 'RAIL -- M')),
              h('div', { className: 'iss-interior-objective', 'data-iss-interior-objective': 'true', 'aria-hidden': 'true' }, 'CURRENT ACTIVITY // ' + room.task.toUpperCase()),
              h('div', { className: 'iss-interior-next-hatch', 'aria-hidden': 'true' },
                h('span', { className: 'iss-interior-next-hatch-arrow', 'data-iss-interior-next-arrow': 'true' }, '^'),
                h('strong', { 'data-iss-interior-next-label': 'true' }, 'NEXT HATCH'),
                h('span', { 'data-iss-interior-next-distance': 'true' }, '-- M')),
              h('div', { className: 'iss-interior-reticle', 'aria-hidden': 'true' },
                h('span', { className: 'iss-interior-horizon', 'data-iss-interior-horizon': 'true' }),
                h('span', { className: 'iss-interior-velocity-dot', 'data-iss-interior-velocity-dot': 'true' })),
              h('div', { className: 'iss-interior-event', 'data-iss-interior-event': 'true', 'aria-hidden': 'true' }),
              h('div', { className: 'iss-interior-route-hud', 'aria-hidden': 'true' }, 'ORDERED ROUTE // ', h('strong', { 'data-iss-interior-route-progress': 'true' }, (Math.max(0, Number(navigation.routeStep || 0)) + 1) + ' / 5')),
              h('div', { className: 'iss-interior-help', 'aria-hidden': 'true' }, 'Drag or arrows: look / tap push: add speed / release: coast / Space near rail: catch')),
            h('p', { className: 'iss-interior-fallback', 'data-iss-interior-fallback': 'true', role: 'status', hidden: true }),
            h('span', { id: 'iss-interior-flight-status', className: 'iss-sr-only', 'data-iss-interior-status': 'true', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, 'Free-flight simulator ready in ' + room.name + '. Speed zero meters per second.'),
            h('div', { className: 'iss-interior-mission-cue', 'data-iss-next-maneuver': nextChallenge ? nextChallenge.id : 'complete' },
              h('span', null, nextChallenge ? 'NEXT MANEUVER' : 'MISSION'),
              h('strong', null, nextChallenge ? nextChallenge.title : 'All navigation challenges complete'),
              h('small', null, nextChallenge ? nextChallenge.note : 'Review the route or continue the crew activities.')),
            h('div', { className: 'iss-interior-controls' },
              h('div', { className: 'iss-interior-thrusters', role: 'group', 'aria-label': 'Virtual navigation push controls' },
                controlButton('forward', 'Push forward', 'W'),
                controlButton('back', 'Push reverse', 'S'),
                controlButton('left', 'Push left', 'A'),
                controlButton('right', 'Push right', 'D'),
                controlButton('up', 'Rise', 'R'),
                controlButton('down', 'Lower', 'F'),
                controlButton('rollLeft', 'Roll left', 'Q'),
                controlButton('rollRight', 'Roll right', 'E')),
              h('div', { className: 'iss-interior-safety', role: 'group', 'aria-label': 'Free-flight safety assists' },
                h('button', { type: 'button', 'data-iss-interior-grab': 'true', onClick: safetyAction('_issInteriorGrabRail') }, 'Grab handrail'),
                h('button', { type: 'button', onClick: safetyAction('_issInteriorCenter', 'Training assist centered and stopped the camera.') }, 'Center + stop'),
                h('button', { type: 'button', onClick: resetNavigation }, 'Restart route'))),
            h('p', { id: 'iss-interior-flight-instructions', className: 'iss-interior-instructions' },
              'Training push controls are an exploration aid. Astronauts actually translate by pushing and pulling handrails or station structure; there are no personal thrusters inside. Tap a push briefly to add velocity, release to coast with no passive braking, and move within 0.68 m of a rail before catching it. Arrow keys look; W/A/S/D translate; R/F move vertically; Q/E roll. Follow Harmony -> Destiny -> Unity, turn port into Tranquility, then move nadir into Cupola. The stopping-distance readout uses a simplified constant-counter-push model.'),
            h('div', { className: 'iss-nav-challenges', role: 'list', 'aria-label': 'Microgravity navigation challenges. ' + navigationChallengeCount + ' of ' + challenges.length + ' complete.' },
              challenges.map(function (challenge) {
                return h('div', { key: challenge.id, role: 'listitem', className: 'iss-nav-challenge' + (challenge.done ? ' is-complete' : ''), 'data-iss-nav-challenge': challenge.id },
                  h('i', { 'aria-hidden': 'true' }, challenge.done ? '\u2713' : '\u25CB'),
                  h('strong', null, challenge.title),
                  h('span', null, challenge.note));
              })),
            h('p', { className: 'iss-interior-instructions', 'aria-live': 'off' },
              'Flight log: ' + Object.keys(navigation.hatches || {}).length + ' hatch transitions / ' + Number(navigation.railGrabs || 0) + ' rail catches / ' + Number(navigation.collisions || 0) + ' hull contacts / ' + Number(navigation.looseHits || 0) + ' cargo contacts.'),
            h('div', { className: 'iss-discovery-row', role: 'group', 'aria-label': 'Inspect details in ' + room.name },
              room.discoveries.map(function (spot, index) {
                var active = selectedDiscovery === index;
                return h('button', { key: index, type: 'button', 'aria-pressed': active, onClick: function () { inspectInteriorSpot(index); }, style: { borderColor: active ? room.color : '#475569', background: active ? room.color + '20' : 'rgba(2,6,23,.52)' } }, (inspected[room.id + ':' + index] ? '\u2713 ' : 'Inspect ') + spot[0]);
              }))
          );
        }

        function visitRoom(index) {
          var safe = Math.max(0, Math.min(INTERIOR_ROOMS.length - 1, index));
          var next = INTERIOR_ROOMS[safe];
          var seen = Object.assign({}, d.interiorSeen || {}); seen[next.id] = true;
          upd({ interiorRoom: next.id, interiorSeen: seen, interiorDiscovery: null });
          announceToSR(next.name + '. ' + next.zone + '.');
        }
        function visitRoomById(id) {
          var index = INTERIOR_ROOMS.findIndex(function (candidate) { return candidate.id === id; });
          if (index >= 0) visitRoom(index);
        }
        function inspectInteriorSpot(index) {
          var nextInspected = Object.assign({}, inspected); nextInspected[room.id + ':' + index] = true;
          upd({ interiorDiscovery: discoveryPrefix + index, interiorInspected: nextInspected });
          announceToSR(room.discoveries[index][0] + '. ' + room.discoveries[index][1]);
        }
        function chooseInterior(choice, extra) {
          var choices = Object.assign({}, d.interiorChoices || {}); choices[room.id] = choice.id;
          var attemptMap = Object.assign({}, d.interiorAttempts || {});
          var roomAttempts = roomDone ? (attemptMap[room.id] || 0) : (attemptMap[room.id] || 0) + 1; attemptMap[room.id] = roomAttempts;
          var patch = Object.assign({ interiorChoices: choices, interiorAttempts: attemptMap }, extra || {});
          if (choice.correct && !roomDone) {
            var nextDone = Object.assign({}, done); nextDone[room.id] = true;
            var quality = roomAttempts === 1 ? 'first try' : roomAttempts + ' attempts';
            var log = (d.interiorLog || []).slice(); log.push(room.time + ' — ' + room.task + ' complete (' + quality + ')');
            patch.interiorDone = nextDone; patch.interiorLog = log;
            if (completed + 1 >= INTERIOR_ROOMS.length) patch.interiorShiftComplete = true;
            if (typeof awardXP === 'function') { try { awardXP(roomAttempts === 1 ? 4 : 3); } catch (e) {} }
            if (addToast) addToast(room.icon + ' ' + room.task + ' — complete', 'success');
          }
          upd(patch);
          announceToSR((choice.correct ? 'Task complete. ' : 'Try another approach. ') + choice.feedback);
        }
        function sceneArt() {
          var object = room.id === 'harmony' ?
            h('g', { className: 'iss-float' }, h('rect', { x: 310, y: 78, width: 105, height: 112, rx: 28, fill: '#5b7ca5', stroke: '#cbd5e1', strokeWidth: 3 }), h('circle', { cx: 362, cy: 101, r: 15, fill: '#e8d8c3' }), h('text', { x: 362, y: 150, textAnchor: 'middle', fill: '#e2e8f0', fontSize: 14 }, 'SLEEP BAG')) :
            room.id === 'destiny' ? h('g', { className: 'iss-float' }, h('rect', { x: 312, y: 98, width: 100, height: 65, rx: 8, fill: '#172554', stroke: '#7dd3fc', strokeWidth: 3 }), h('path', { d: 'M362 98 C340 76 344 55 362 67 C379 49 387 76 362 98', fill: '#4ade80' }), h('circle', { cx: 382, cy: 120, r: 10, fill: '#38bdf8', opacity: 0.85 })) :
            room.id === 'tranquility' ? h('g', null, h('rect', { x: 304, y: 72, width: 116, height: 120, rx: 8, fill: '#292524', stroke: '#fbbf24', strokeWidth: 3 }), h('circle', { cx: 362, cy: 124, r: 34, fill: '#111827', stroke: '#94a3b8', strokeWidth: 6 }), [0, 1, 2, 3, 4, 5].map(function (i) { var a = i * Math.PI / 3; return h('line', { key: i, x1: 362, y1: 124, x2: 362 + Math.cos(a) * 27, y2: 124 + Math.sin(a) * 27, stroke: '#64748b', strokeWidth: 5 }); }), h('text', { x: 362, y: 178, textAnchor: 'middle', fill: '#fbbf24', fontSize: 12 }, 'AIRFLOW LOW')) :
            room.id === 'unity' ? h('g', { className: 'iss-float' }, h('rect', { x: 330, y: 93, width: 70, height: 58, rx: 8, fill: '#8b5e3c', stroke: '#fde68a', strokeWidth: 3 }), h('path', { d: 'M340 93 Q365 70 390 93', fill: 'none', stroke: '#fde68a', strokeWidth: 4 }), h('text', { x: 365, y: 128, textAnchor: 'middle', fill: '#fff7ed', fontSize: 13 }, 'CARGO')) :
            h('g', null, h('circle', { cx: 362, cy: 124, r: 75, fill: 'url(#iss-window-earth)', stroke: '#cbd5e1', strokeWidth: 8 }), h('circle', { cx: 362, cy: 124, r: 70, fill: 'none', stroke: '#bfeeff', strokeWidth: 3, opacity: 0.5 }), h('path', { d: 'M300 132 Q350 82 424 112 Q398 180 320 181 Z', fill: '#e7f5ff', opacity: 0.72 }), h('path', { d: 'M314 145 Q358 105 414 122', fill: 'none', stroke: '#4ade80', strokeWidth: 9, opacity: 0.65 }), h('ellipse', { cx: 336, cy: 100, rx: 13, ry: 7, fill: '#ffffff', opacity: 0.42 }));
          return h('svg', { viewBox: '0 0 724 260', role: 'img', 'aria-label': 'Interior view of ' + room.name + '. ' + room.scene, style: { width: '100%', display: 'block', background: '#060b18' } },
            h('defs', null,
              h('linearGradient', { id: 'iss-tunnel-ceiling', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#f8fafc' }), h('stop', { offset: '65%', stopColor: '#9aa8ba' }), h('stop', { offset: '100%', stopColor: '#536173' })),
              h('linearGradient', { id: 'iss-tunnel-floor', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#536173' }), h('stop', { offset: '100%', stopColor: '#172033' })),
              h('linearGradient', { id: 'iss-tunnel-side', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#425066' }), h('stop', { offset: '50%', stopColor: '#9aa7b8' }), h('stop', { offset: '100%', stopColor: '#3e4a5d' })),
              h('radialGradient', { id: 'iss-cabin-depth', cx: '50%', cy: '48%' }, h('stop', { offset: '0%', stopColor: '#1a3658' }), h('stop', { offset: '55%', stopColor: '#0b1729' }), h('stop', { offset: '100%', stopColor: '#030712' })),
              // Last of the flat Earth discs: the porthole view at the end of the
              // tunnel. Same sun-from-upper-left shading as iss-orbit-earth.
              h('radialGradient', { id: 'iss-window-earth', cx: '35%', cy: '28%' }, h('stop', { offset: '0%', stopColor: '#8ed2f7' }), h('stop', { offset: '52%', stopColor: '#2470ad' }), h('stop', { offset: '100%', stopColor: '#0a2c52' })),
              h('filter', { id: 'iss-light-glow', x: '-30%', y: '-100%', width: '160%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 5, result: 'glow' }), h('feMerge', null, h('feMergeNode', { in: 'glow' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { x: 0, y: 0, width: 724, height: 260, fill: 'url(#iss-cabin-depth)' }),
            h('polygon', { points: '0,18 724,18 610,88 114,88', fill: 'url(#iss-tunnel-ceiling)', stroke: room.color, strokeWidth: 2 }),
            h('polygon', { points: '0,242 724,242 610,172 114,172', fill: 'url(#iss-tunnel-floor)', stroke: room.color, strokeWidth: 2 }),
            h('polygon', { points: '0,18 114,88 114,172 0,242', fill: 'url(#iss-tunnel-side)' }),
            h('polygon', { points: '724,18 610,88 610,172 724,242', fill: 'url(#iss-tunnel-side)' }),
            h('rect', { x: 114, y: 88, width: 496, height: 84, rx: 34, fill: 'none', stroke: '#cbd5e1', strokeWidth: 4, opacity: .55 }),
            h('rect', { x: 128, y: 98, width: 468, height: 64, rx: 27, fill: 'none', stroke: room.color, strokeWidth: 1.3, opacity: .52, strokeDasharray: '5 5' }),
            [226, 330, 434].map(function (x, i) { return h('g', { key: 'light' + i, filter: 'url(#iss-light-glow)' }, h('rect', { x: x, y: 48, width: 64, height: 6, rx: 3, fill: '#e0f2fe', opacity: .88 })); }),
            [154, 570].map(function (x, i) { return h('path', { key: 'rail' + i, d: 'M' + x + ' 72 L' + (i ? 625 : 99) + ' 195', fill: 'none', stroke: i ? '#fbbf24' : '#2563eb', strokeWidth: 5, strokeLinecap: 'round', opacity: .9 }); }),
            [42, 118, 194, 530, 606, 682].map(function (x, i) { return h('rect', { key: i, x: x, y: i < 3 ? 42 : 190, width: 48, height: 18, rx: 4, fill: '#172033', stroke: '#cbd5e1' }); }),
            h('rect', { x: 140, y: 34, width: 444, height: 10, rx: 5, fill: '#2563eb' }), h('rect', { x: 140, y: 216, width: 444, height: 10, rx: 5, fill: '#fbbf24' }),
            object,
            h('text', { x: 18, y: 252, fill: '#cbd5e1', fontSize: 12 }, room.module + ' • ' + room.time),
            h('text', { x: 706, y: 252, textAnchor: 'end', fill: room.color, fontSize: 12, fontWeight: 700 }, room.zone.toUpperCase()));
        }
        function renderLowGSimulator() {
          var impulse = Math.max(2, Math.min(22, Number(d.lowGImpulse == null ? 10 : d.lowGImpulse)));
          var speed = impulse / 70;
          var travelTime = 2.5 / speed;
          var result = d.lowGResult;
          var controlledNow = impulse >= 7 && impulse <= 16;
          var arrivalStatus = controlledNow ? 'CONTROLLED' : impulse < 7 ? 'TOO SLOW' : 'OVERSPEED';
          var arrivalColor = controlledNow ? '#4ade80' : impulse < 7 ? '#fbbf24' : '#f87171';
          var velocityArrowEnd = 150 + (impulse - 2) / 20 * 325;
          function runTranslation() {
            var controlled = impulse >= 7 && impulse <= 16;
            var feedback = controlled ?
              'Controlled translation. You arrive slowly enough to catch the pouch and brake on the handrail.' :
              impulse < 7 ? 'Safe but inefficient: the pouch drifts away while you take too long to cross the node. Add a little impulse.' :
              'Approach too fast. With no drag to slow you, the far handrail arrives before you can control the stop.';
            chooseInterior({ id: controlled ? 'gentle' : impulse > 16 ? 'hard' : 'slow', correct: controlled, feedback: feedback }, {
              lowGResult: { impulse: impulse, speed: speed, time: travelTime, success: controlled, feedback: feedback }
            });
          }
          return h('div', { 'data-iss-lowg-sim': 'true', style: { padding: 10, borderRadius: 10, background: 'rgba(2,6,23,0.42)', border: '1px solid #334155' } },
            h('label', { htmlFor: 'iss-lowg-impulse', style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: TEXT, fontSize: 11.5, fontWeight: 800 } }, h('span', null, 'Push impulse'), h('span', { style: { color: room.color }, 'aria-hidden': 'true' }, impulse.toFixed(0) + ' N·s')),
            h('input', { id: 'iss-lowg-impulse', type: 'range', min: 2, max: 22, step: 1, value: impulse, onChange: function (e) { upd({ lowGImpulse: Number(e.target.value), lowGResult: null }); }, 'aria-valuetext': impulse.toFixed(0) + ' newton seconds', 'aria-describedby': 'iss-lowg-explain', style: { width: '100%', accentColor: room.color, margin: '8px 0 5px' } }),
            h('div', { className: 'iss-learning-visual', 'data-iss-lowg-trajectory': arrivalStatus.toLowerCase().replace(' ', '-'), style: { marginBottom: 8 } },
              h('svg', { viewBox: '0 0 640 150', role: 'img', 'aria-label': 'Microgravity translation preview. Push impulse ' + impulse.toFixed(0) + ' newton seconds gives a constant coast speed of ' + speed.toFixed(2) + ' meters per second, travel time ' + travelTime.toFixed(1) + ' seconds, predicted arrival ' + arrivalStatus.toLowerCase() + '.' },
                h('defs', null, h('marker', { id: 'iss-lowg-vector-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 L10 5 L0 10z', fill: arrivalColor })), h('linearGradient', { id: 'iss-lowg-tunnel', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#101b2d' }), h('stop', { offset: '50%', stopColor: '#07101f' }), h('stop', { offset: '100%', stopColor: '#111827' }))),
                h('rect', { width: 640, height: 150, fill: 'url(#iss-lowg-tunnel)' }),
                h('path', { d: 'M35 28H605M35 122H605', stroke: '#64748b', strokeWidth: 5, strokeLinecap: 'round' }),
                [80,190,300,410,520].map(function (x, i) { return h('g', { key: i }, h('line', { x1: x, y1: 28, x2: x, y2: 40, stroke: '#cbd5e1', strokeWidth: 3 }), h('line', { x1: x, y1: 110, x2: x, y2: 122, stroke: '#cbd5e1', strokeWidth: 3 })); }),
                h('rect', { x: 494, y: 43, width: 82, height: 64, rx: 12, fill: controlledNow ? 'rgba(34,197,94,.10)' : 'rgba(148,163,184,.07)', stroke: '#4ade80', strokeWidth: 1.4, strokeDasharray: '5 4' }),
                h('text', { x: 535, y: 53, textAnchor: 'middle', fill: '#86efac', fontSize: 7.5, fontWeight: 850 }, 'HANDRAIL CATCH WINDOW'),
                h('g', { transform: 'translate(102,75)' }, h('circle', { cy: -13, r: 8, fill: '#e8d8c3' }), h('rect', { x: -8, y: -5, width: 16, height: 24, rx: 7, fill: '#e2e8f0', stroke: '#7dd3fc' }), h('line', { x1: -5, y1: 17, x2: -13, y2: 27, stroke: '#e2e8f0', strokeWidth: 4 }), h('line', { x1: 5, y1: 17, x2: 13, y2: 27, stroke: '#e2e8f0', strokeWidth: 4 })),
                [205,310,415].map(function (x, i) { return h('g', { key: i, transform: 'translate(' + x + ',75)', opacity: .16 + i * .12 }, h('circle', { cy: -8, r: 5, fill: '#bae6fd' }), h('rect', { x: -5, y: -2, width: 10, height: 15, rx: 4, fill: '#bae6fd' })); }),
                h('line', { x1: 125, y1: 75, x2: velocityArrowEnd, y2: 75, stroke: arrivalColor, strokeWidth: 3, markerEnd: 'url(#iss-lowg-vector-arrow)' }),
                h('text', { x: Math.min(470, (125 + velocityArrowEnd) / 2), y: 67, textAnchor: 'middle', fill: arrivalColor, fontSize: 9, fontWeight: 850 }, 'NO DRAG // CONSTANT ' + speed.toFixed(2) + ' M/S'),
                h('g', { transform: 'translate(546,78)' }, h('rect', { x: -17, y: -13, width: 34, height: 27, rx: 5, fill: '#8b5e3c', stroke: '#fde68a', strokeWidth: 2 }), h('path', { d: 'M-12 -13Q0 -27 12 -13', fill: 'none', stroke: '#fde68a', strokeWidth: 3 }), h('text', { y: 4, textAnchor: 'middle', fill: '#fff7ed', fontSize: 7, fontWeight: 850 }, 'CARGO')),
                h('text', { x: 20, y: 19, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'UNITY TRANSLATION // NEWTON 1'),
                h('text', { x: 620, y: 19, textAnchor: 'end', fill: arrivalColor, fontSize: 9.5, fontWeight: 900 }, 'ARRIVAL ' + arrivalStatus),
                h('line', { x1: 102, y1: 134, x2: 546, y2: 134, stroke: '#475569' }),
                [0,1.25,2.5].map(function (distance, i) { var x = 102 + i * 222; return h('g', { key: distance }, h('line', { x1: x, y1: 130, x2: x, y2: 139, stroke: '#94a3b8' }), h('text', { x: x, y: 147, textAnchor: i === 0 ? 'start' : i === 2 ? 'end' : 'middle', fill: '#94a3b8', fontSize: 7.5 }, distance.toFixed(i ? 2 : 0) + ' M')); }))),
            h('div', { id: 'iss-lowg-explain', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 } },
              [['Predicted speed', speed.toFixed(2) + ' m/s'], ['2.5 m travel time', travelTime.toFixed(1) + ' s']].map(function (metric, i) { return h('div', { key: i, style: { padding: 6, borderRadius: 7, background: '#0f172a', border: '1px solid #334155' } }, h('div', { style: { color: SOFT, fontSize: 9, textTransform: 'uppercase' } }, metric[0]), h('strong', { style: { color: '#d1fae5', fontSize: 12 } }, metric[1])); })),
            h('p', { style: { color: SOFT, fontSize: 10.5, lineHeight: 1.45, margin: '7px 0' } }, 'Model: Δv = impulse ÷ 70 kg. The catch window balances useful travel time with a controllable arrival.'),
            h('button', { type: 'button', onClick: runTranslation, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: '#10b981', color: '#022c22', fontWeight: 900, fontSize: 11.5, cursor: 'pointer' } }, '🫸 Push off and test'),
            result ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, color: TEXT, fontSize: 11.5, lineHeight: 1.5, background: result.success ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.12)', borderLeft: '3px solid ' + (result.success ? '#22c55e' : '#fbbf24') } }, h('strong', { style: { color: result.success ? '#4ade80' : '#fbbf24' } }, result.success ? 'Controlled arrival: ' : 'Flight result: '), result.feedback) : null
          );
        }        function renderResearchProcedure() {
          var step = Math.max(0, Math.min(3, Number(d.researchStep || 0)));
          var procedure = [
            ['1', 'Secure the sample', 'Latch the plant chamber inside the glovebox so water and biological material stay contained.'],
            ['2', 'Prime the wick', 'Inject water into the porous wick until capillary action reaches the root pillow.'],
            ['3', 'Start camera + baseline', 'Begin time-lapse imaging and record temperature before changing the experiment.']
          ];
          var visualStep = roomDone ? 3 : step;
          var stageLabel = visualStep === 0 ? 'CHAMBER UNLATCHED' : visualStep === 1 ? 'CHAMBER SECURE // PRIME WICK' : visualStep === 2 ? 'CAPILLARY FRONT AT ROOTS' : 'BASELINE RECORDING';
          var waterFrontX = visualStep < 2 ? 188 : 430;
          function runStep(index) {
            if (roomDone) return;
            if (index !== step) {
              var attemptMap = Object.assign({}, d.interiorAttempts || {}); attemptMap.destiny = (attemptMap.destiny || 0) + 1;
              upd({ researchFeedback: 'Sequence hold: complete step ' + (step + 1) + ' before moving ahead.', researchErrors: (d.researchErrors || 0) + 1, interiorAttempts: attemptMap });
              announceToSR('Procedure out of sequence. Complete step ' + (step + 1) + ' first.');
              return;
            }
            var next = step + 1;
            if (next >= procedure.length) {
              chooseInterior({ id: 'wick', correct: true, feedback: 'Experiment active. The camera can now reveal how capillary flow reaches roots without gravity-driven drainage.' }, { researchStep: 3, researchFeedback: 'Baseline logged — water front stable, chamber contained, camera recording.' });
            } else {
              upd({ researchStep: next, researchFeedback: procedure[index][1] + ' confirmed. Continue to step ' + (next + 1) + '.' });
              announceToSR(procedure[index][1] + ' complete.');
            }
          }
          return h('div', { 'data-iss-research-procedure': 'true', style: { display: 'grid', gap: 6 } },
            h('div', { className: 'iss-learning-visual', 'data-iss-capillary-visual': visualStep, style: { marginBottom: 2 } },
              h('svg', { viewBox: '0 0 640 158', role: 'img', 'aria-label': 'Plant chamber procedure visualization. ' + stageLabel.toLowerCase() + '. ' + (visualStep >= 2 ? 'Water has moved through the porous wick to the root pillow by capillary action.' : 'Water has not yet reached the root pillow.') },
                h('defs', null, h('linearGradient', { id: 'iss-glovebox-window', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#17304a' }), h('stop', { offset: '100%', stopColor: '#07101f' })), h('filter', { id: 'iss-water-front-glow', x: '-30%', y: '-100%', width: '160%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 3, result: 'w' }), h('feMerge', null, h('feMergeNode', { in: 'w' }), h('feMergeNode', { in: 'SourceGraphic' })))),
                h('rect', { width: 640, height: 158, fill: '#050b18' }),
                h('text', { x: 18, y: 18, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'DESTINY PLANT CHAMBER // CAPILLARY FLOW'),
                h('text', { x: 622, y: 18, textAnchor: 'end', fill: visualStep === 3 ? '#4ade80' : '#cbd5e1', fontSize: 9, fontWeight: 850 }, stageLabel),
                [0,1,2].map(function (i) { var x = 205 + i * 80; var complete = visualStep > i; var current = visualStep === i; return h('g', { key: i }, h('line', { x1: x - 55, y1: 34, x2: x + 25, y2: 34, stroke: complete ? '#4ade80' : current ? '#38bdf8' : '#334155', strokeWidth: 3 }), h('circle', { cx: x, cy: 34, r: 8, fill: complete ? '#14532d' : current ? '#0c4a6e' : '#111827', stroke: complete ? '#4ade80' : current ? '#7dd3fc' : '#475569', strokeWidth: 2 }), h('text', { x: x, y: 37, textAnchor: 'middle', fill: '#f8fafc', fontSize: 8, fontWeight: 900 }, complete ? '✓' : String(i + 1))); }),
                h('rect', { x: 108, y: 51, width: 424, height: 82, rx: 12, fill: 'url(#iss-glovebox-window)', stroke: visualStep >= 1 ? '#4ade80' : '#fbbf24', strokeWidth: 2, strokeDasharray: visualStep >= 1 ? undefined : '7 5' }),
                h('path', { d: 'M142 93H455', stroke: '#475569', strokeWidth: 16, strokeLinecap: 'round' }),
                h('path', { className: visualStep >= 2 ? 'iss-flow-path' : '', d: 'M142 93H' + waterFrontX, stroke: '#38bdf8', strokeWidth: 9, strokeLinecap: 'round', filter: visualStep >= 2 ? 'url(#iss-water-front-glow)' : undefined }),
                visualStep >= 2 ? [230,290,350,410].map(function (x, i) { return h('circle', { key: i, cx: x, cy: 93, r: 3, fill: '#bae6fd' }); }) : null,
                h('g', { transform: 'translate(452,92)' }, h('ellipse', { rx: 28, ry: 18, fill: '#6b4f2d', stroke: '#d6a96d', strokeWidth: 2 }), h('path', { d: 'M0 -8Q-13 -31 -25 -37M0 -8Q13 -34 28 -38M0 -9V-45', fill: 'none', stroke: '#4ade80', strokeWidth: 4, strokeLinecap: 'round' }), h('ellipse', { cx: -29, cy: -40, rx: 10, ry: 5, transform: 'rotate(25 -29 -40)', fill: '#4ade80' }), h('ellipse', { cx: 31, cy: -41, rx: 11, ry: 5, transform: 'rotate(-25 31 -41)', fill: '#4ade80' })),
                h('g', { transform: 'translate(566,75)' }, h('rect', { x: -18, y: -14, width: 36, height: 29, rx: 5, fill: visualStep >= 3 ? '#14532d' : '#172033', stroke: visualStep >= 3 ? '#4ade80' : '#64748b', strokeWidth: 2 }), h('circle', { r: 8, fill: '#020617', stroke: visualStep >= 3 ? '#86efac' : '#64748b', strokeWidth: 2 }), h('circle', { cx: 13, cy: -10, r: 2.5, fill: visualStep >= 3 ? '#f87171' : '#475569' }), h('text', { y: 29, textAnchor: 'middle', fill: visualStep >= 3 ? '#86efac' : '#94a3b8', fontSize: 7.5, fontWeight: 850 }, visualStep >= 3 ? 'REC' : 'CAMERA')),
                h('text', { x: 142, y: 119, fill: '#94a3b8', fontSize: 7.5 }, 'INJECT'),
                h('text', { x: 452, y: 124, textAnchor: 'middle', fill: visualStep >= 2 ? '#bae6fd' : '#94a3b8', fontSize: 7.5, fontWeight: 850 }, 'ROOT PILLOW'),
                h('text', { x: 320, y: 149, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, visualStep >= 2 ? 'SURFACE TENSION + ADHESION MOVE WATER WITHOUT GRAVITY' : 'POROUS WICK AWAITS A CONTAINED WATER PRIME'))),
            procedure.map(function (item, i) { var complete = i < step || roomDone; var current = i === step && !roomDone; return h('button', { key: i, type: 'button', disabled: complete, onClick: function () { runStep(i); }, style: { textAlign: 'left', padding: 8, borderRadius: 8, border: '1px solid ' + (complete ? '#22c55e' : current ? room.color : '#475569'), background: complete ? 'rgba(34,197,94,.12)' : current ? room.color + '16' : 'rgba(2,6,23,.35)', color: TEXT, cursor: complete ? 'default' : 'pointer', opacity: !complete && !current ? .72 : 1 } }, h('strong', { style: { color: complete ? '#4ade80' : current ? room.color : SOFT, fontSize: 11.5 } }, (complete ? '✓ ' : item[0] + '. ') + item[1]), h('span', { style: { display: 'block', color: SOFT, fontSize: 10, lineHeight: 1.45, marginTop: 3 } }, item[2])); }),
            d.researchFeedback ? h('div', { role: 'status', 'aria-live': 'polite', style: { padding: 8, borderRadius: 8, background: roomDone ? 'rgba(34,197,94,.1)' : 'rgba(14,165,233,.08)', borderLeft: '3px solid ' + (roomDone ? '#22c55e' : room.color), color: TEXT, fontSize: 11, lineHeight: 1.5 } }, d.researchFeedback) : null
          );
        }        function renderMaintenanceConsole() {
          var sensors = [
            ['Fan motor current', 'NORMAL', 'The fan motor is powered and drawing its expected current. The motor itself is probably healthy.'],
            ['Inlet pressure drop', 'HIGH', 'Pressure is much higher before the inlet than after it — evidence that airflow is meeting a blockage.'],
            ['Cabin CO₂ trend', 'RISING', 'Scrubbing hardware may be healthy, but cabin air is not reaching it quickly enough.']
          ];
          var checks = d.maintenanceChecks || {};
          var checkedCount = sensors.filter(function (_, i) { return !!checks[i]; }).length;
          var reading = d.maintenanceReading == null ? -1 : Number(d.maintenanceReading);
          var telemetryState = roomDone ? 'restored' : reading >= 0 ? 'focus-' + reading : 'overview';
          var telemetryLabel = roomDone ? 'AIRFLOW RESTORED // TRENDS STABILIZING' : checkedCount >= 2 ? 'EVIDENCE CORRELATED // INLET BLOCKAGE' : 'DIAGNOSE // SELECT TWO CHANNELS';
          var traces = [
            { label: 'FAN CURRENT // NORMAL', color: '#4ade80', path: 'M74 58 L145 57 L216 59 L287 57 L358 58 L429 57 L500 58', endY: 58 },
            { label: roomDone ? 'PRESSURE DROP // RECOVERING' : 'PRESSURE DROP // HIGH', color: '#fbbf24', path: roomDone ? 'M74 91 L145 88 L216 82 L287 76 L358 70 L429 66 L500 63' : 'M74 91 L145 87 L216 80 L287 72 L358 62 L429 50 L500 39', endY: roomDone ? 63 : 39 },
            { label: roomDone ? 'CABIN CO₂ // STABILIZING' : 'CABIN CO₂ // RISING', color: '#f87171', path: roomDone ? 'M74 124 L145 118 L216 110 L287 101 L358 95 L429 91 L500 89' : 'M74 124 L145 120 L216 112 L287 100 L358 86 L429 70 L500 51', endY: roomDone ? 89 : 51 }
          ];
          function inspectSensor(index) {
            var next = Object.assign({}, checks); next[index] = true;
            upd({ maintenanceChecks: next, maintenanceReading: index });
            announceToSR(sensors[index][0] + ': ' + sensors[index][1] + '. ' + sensors[index][2]);
          }
          return h('div', { 'data-iss-maintenance-console': 'true' },
            h('div', { className: 'iss-learning-visual', 'data-iss-maintenance-telemetry': telemetryState, style: { marginBottom: 8 } },
              h('svg', { viewBox: '0 0 640 158', role: 'img', 'aria-label': 'Life-support telemetry trend display. Fan motor current is normal. Inlet pressure drop is ' + (roomDone ? 'recovering' : 'high') + '. Cabin carbon dioxide is ' + (roomDone ? 'stabilizing after airflow restoration' : 'rising') + '. ' + (reading >= 0 && sensors[reading] ? 'Focused channel: ' + sensors[reading][0] + '.' : 'No channel focused.') },
                h('rect', { width: 640, height: 158, fill: '#050b18' }),
                h('text', { x: 18, y: 18, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'TRANQUILITY ECLSS // TELEMETRY CORRELATION'),
                h('text', { x: 622, y: 18, textAnchor: 'end', fill: roomDone ? '#86efac' : checkedCount >= 2 ? '#fde68a' : '#94a3b8', fontSize: 8.5, fontWeight: 850 }, telemetryLabel),
                [40,68,96,124].map(function (y, i) { return h('line', { key: i, x1: 62, y1: y, x2: 508, y2: y, stroke: '#263449', strokeWidth: 1 }); }),
                [74,180,286,392,500].map(function (x, i) { return h('line', { key: i, x1: x, y1: 34, x2: x, y2: 132, stroke: '#172033', strokeWidth: 1 }); }),
                traces.map(function (trace, i) { var focused = reading < 0 || reading === i || roomDone; return h('g', { key: trace.label, opacity: focused ? 1 : .23 }, h('path', { d: trace.path, fill: 'none', stroke: trace.color, strokeWidth: focused ? 2.7 : 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('circle', { cx: 500, cy: trace.endY, r: focused ? 4 : 2.5, fill: trace.color, stroke: '#050b18', strokeWidth: 1.5 }), h('line', { x1: 507, y1: trace.endY, x2: 523, y2: trace.endY, stroke: trace.color, strokeWidth: 1.4 }), h('text', { x: 530, y: trace.endY + 3, fill: focused ? '#e2e8f0' : '#64748b', fontSize: 7.5, fontWeight: 850 }, trace.label)); }),
                h('text', { x: 74, y: 147, fill: '#94a3b8', fontSize: 8 }, 'EARLIER'),
                h('text', { x: 500, y: 147, textAnchor: 'end', fill: '#94a3b8', fontSize: 8 }, 'NOW →'),
                reading >= 0 ? h('path', { d: 'M60 31H510V134H60Z', fill: 'none', stroke: traces[reading].color, strokeWidth: 1, strokeDasharray: '5 5', opacity: .5 }) : null)),
            h('div', { role: 'group', 'aria-label': 'Life-support telemetry channels', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(82px,1fr))', gap: 5 } }, sensors.map(function (sensor, i) { var checked = !!checks[i]; return h('button', { key: i, type: 'button', 'aria-pressed': checked, onClick: function () { inspectSensor(i); }, style: { minWidth: 0, padding: 7, borderRadius: 8, textAlign: 'left', border: '1px solid ' + (checked ? room.color : '#475569'), background: checked ? room.color + '16' : 'rgba(2,6,23,.38)', color: TEXT, cursor: 'pointer' } }, h('span', { style: { display: 'block', color: SOFT, fontSize: 8.5, lineHeight: 1.25 } }, (checked ? '✓ ' : '') + sensor[0]), h('strong', { style: { display: 'block', color: sensor[1] === 'NORMAL' ? '#4ade80' : '#fbbf24', fontSize: 11, marginTop: 3 } }, sensor[1])); })),
            reading >= 0 && sensors[reading] ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 6, padding: 7, borderRadius: 7, background: 'rgba(251,191,36,.08)', color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, h('strong', { style: { color: '#fbbf24' } }, sensors[reading][0] + ': '), sensors[reading][2]) : h('p', { style: { color: SOFT, fontSize: 10, margin: '6px 0 0' } }, 'Inspect at least two channels before commanding maintenance.'),
            h('div', { role: 'group', 'aria-label': 'Maintenance actions', style: { display: 'grid', gap: 5, marginTop: 8 } }, room.choices.map(function (choice) { var picked = choiceId === choice.id; return h('button', { key: choice.id, type: 'button', disabled: checkedCount < 2 || roomDone, onClick: function () { chooseInterior(choice); }, style: { textAlign: 'left', padding: '7px 8px', borderRadius: 8, border: '1px solid ' + (roomDone && choice.correct ? '#22c55e' : picked ? room.color : '#475569'), background: roomDone && choice.correct ? 'rgba(34,197,94,.14)' : picked ? room.color + '16' : 'rgba(2,6,23,.35)', color: TEXT, fontSize: 10.5, fontWeight: 750, cursor: checkedCount < 2 || roomDone ? 'not-allowed' : 'pointer', opacity: checkedCount < 2 ? .45 : roomDone && !choice.correct ? .5 : 1 } }, (roomDone && choice.correct ? '✓ ' : '') + choice.label); })),
            pickedChoice ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 7, padding: 7, borderRadius: 7, background: pickedChoice.correct ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.1)', borderLeft: '3px solid ' + (pickedChoice.correct ? '#22c55e' : '#fbbf24'), color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, pickedChoice.feedback) : null
          );
        }        function renderCrewNotebook() {
          var prompts = {
            harmony: 'What design choice makes an ordinary morning routine different in freefall?',
            destiny: 'What evidence would show that capillary watering helped the plant?',
            tranquility: 'Which telemetry reading most strongly supported your diagnosis, and why?',
            unity: 'How did changing impulse affect arrival speed and travel time?',
            cupola: 'What procedure protects the view, and what risk does it manage?'
          };
          var notes = d.interiorNotes || {};
          var value = String(notes[room.id] || '');
          var promptId = 'iss-notebook-prompt-' + room.id, countId = 'iss-notebook-count-' + room.id;
          return h('details', { 'data-iss-crew-notebook': room.id, style: { margin: '12px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(15,23,42,.6)', border: '1px solid #334155' } },
            h('summary', { style: { color: TEXT, fontSize: 11.5, fontWeight: 850, cursor: 'pointer' } }, '📓 Crew notebook', value.trim() ? h('span', { style: { marginLeft: 7, color: '#4ade80', fontSize: 9.5 } }, '• observation saved') : h('span', { style: { marginLeft: 7, color: SOFT, fontSize: 9.5 } }, '• optional reflection')),
            h('p', { id: promptId, style: { color: SOFT, fontSize: 10.5, lineHeight: 1.45, margin: '8px 0 5px' } }, prompts[room.id]),
            h('textarea', { value: value, rows: 2, maxLength: 240, onChange: function (e) { var next = Object.assign({}, notes); next[room.id] = String(e.target.value || '').slice(0, 240); upd({ interiorNotes: next }); }, 'aria-label': 'Crew notebook observation for ' + room.name, 'aria-describedby': promptId + ' ' + countId, placeholder: 'Record an observation, claim, or question…', style: { width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 8, borderRadius: 8, border: '1px solid #475569', background: '#020617', color: TEXT, fontFamily: 'inherit', fontSize: 11.5, lineHeight: 1.45 } }),
            h('div', { id: countId, style: { textAlign: 'right', color: SOFT, fontSize: 10.5, marginTop: 3 }, 'aria-live': 'off' }, value.length + ' / 240 characters')
          );
        }
        function renderCabinStow() {
          var items = [
            ['bag', '🛏️', 'Sleeping bag', 'Clip flat to the cabin wall', 'A floating bag can block the cabin or drift across the air return.'],
            ['tablet', '💻', 'Crew tablet', 'Velcro to its charging dock', 'Velcro creates a temporary “shelf” on any surface when gravity cannot hold objects down.'],
            ['cloth', '🧼', 'Damp washcloth', 'Seal inside the hygiene pouch', 'Free moisture can migrate into electronics, vents, and experiment hardware.']
          ];
          var stowed = d.cabinStow || {};
          var stowedCount = items.filter(function (item) { return !!stowed[item[0]]; }).length;
          var airflowClear = stowedCount === items.length;
          var safetyState = airflowClear ? 'clear' : 'risk-' + (items.length - stowedCount);
          var safetyLabel = airflowClear ? 'CABIN CLEAR // AIR RETURN OPEN' : (items.length - stowedCount) + ' LOOSE OBJECT' + (items.length - stowedCount === 1 ? '' : 'S') + ' // AIRFLOW RISK';
          function secureItem(item) {
            if (roomDone || stowed[item[0]]) return;
            var next = Object.assign({}, stowed); next[item[0]] = true;
            var nextCount = items.filter(function (candidate) { return !!next[candidate[0]]; }).length;
            if (nextCount >= items.length) {
              chooseInterior({ id: 'strap', correct: true, feedback: 'Cabin stow complete. Every loose item is restrained and the air return remains clear.' }, { cabinStow: next });
            } else {
              upd({ cabinStow: next });
              announceToSR(item[2] + ' secured. ' + nextCount + ' of ' + items.length + ' items stowed.');
            }
          }
          function objectMark(id, looseX, looseY, secureX, secureY, label, shape) {
            var secure = !!stowed[id];
            var x = secure ? secureX : looseX, y = secure ? secureY : looseY;
            return h('g', { key: id, transform: 'translate(' + x + ',' + y + ')', opacity: secure ? .88 : 1 },
              !secure ? h('path', { d: 'M-32 0Q-48 -18 -30 -32', fill: 'none', stroke: '#fbbf24', strokeWidth: 1.2, strokeDasharray: '4 4', opacity: .7 }) : null,
              shape === 'bag' ? h('rect', { x: -28, y: -18, width: 56, height: 36, rx: 12, fill: secure ? '#14532d' : '#36597e', stroke: secure ? '#4ade80' : '#bae6fd', strokeWidth: 2 }) : shape === 'tablet' ? h('rect', { x: -23, y: -15, width: 46, height: 30, rx: 4, fill: '#172554', stroke: secure ? '#4ade80' : '#7dd3fc', strokeWidth: 2 }) : h('path', { d: 'M-19 -13Q0 -21 19 -13L14 15Q0 22 -14 15Z', fill: secure ? '#14532d' : '#bde8e0', stroke: secure ? '#4ade80' : '#e0f2fe', strokeWidth: 2 }),
              secure ? h('circle', { cx: 22, cy: -17, r: 8, fill: '#14532d', stroke: '#4ade80', strokeWidth: 1.5 }) : null,
              secure ? h('text', { x: 22, y: -14, textAnchor: 'middle', fill: '#dcfce7', fontSize: 8, fontWeight: 900 }, '✓') : null,
              h('text', { y: 29, textAnchor: 'middle', fill: secure ? '#86efac' : '#f8fafc', fontSize: 8, fontWeight: 850 }, label + ' // ' + (secure ? 'SECURED' : 'FLOATING')));
          }
          return h('div', { 'data-iss-cabin-stow': 'true' },
            h('div', { className: 'iss-learning-visual', 'data-iss-cabin-safety': safetyState, style: { marginBottom: 8 } },
              h('svg', { viewBox: '0 0 640 168', role: 'img', 'aria-label': 'Crew cabin loose-item safety scan. ' + stowedCount + ' of 3 items secured. ' + (airflowClear ? 'The cabin is clear and the air return is unobstructed.' : (items.length - stowedCount) + ' items remain floating and could obstruct airflow or equipment.') },
                h('defs', null, h('marker', { id: 'iss-cabin-air-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, h('path', { d: 'M0 0L10 5L0 10Z', fill: airflowClear ? '#4ade80' : '#38bdf8' })), h('linearGradient', { id: 'iss-cabin-scan-bg', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#111c2e' }), h('stop', { offset: '100%', stopColor: '#050b18' }))),
                h('rect', { width: 640, height: 168, fill: 'url(#iss-cabin-scan-bg)' }),
                h('text', { x: 18, y: 18, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'HARMONY CABIN // LOOSE-ITEM SAFETY SCAN'),
                h('text', { x: 622, y: 18, textAnchor: 'end', fill: airflowClear ? '#86efac' : '#fde68a', fontSize: 8.5, fontWeight: 850 }, safetyLabel),
                h('rect', { x: 42, y: 34, width: 548, height: 106, rx: 28, fill: 'none', stroke: '#64748b', strokeWidth: 3 }),
                h('rect', { x: 62, y: 47, width: 508, height: 80, rx: 20, fill: 'none', stroke: '#334155', strokeWidth: 1.4, strokeDasharray: '6 5' }),
                h('g', { transform: 'translate(553,84)' }, h('rect', { x: -19, y: -25, width: 38, height: 50, rx: 5, fill: airflowClear ? '#0f3c30' : '#292524', stroke: airflowClear ? '#4ade80' : '#fbbf24', strokeWidth: 2 }), [-12,-4,4,12].map(function (x) { return h('line', { key: x, x1: x, y1: -18, x2: x, y2: 18, stroke: airflowClear ? '#86efac' : '#fbbf24', strokeWidth: 2 }); }), h('text', { y: 38, textAnchor: 'middle', fill: airflowClear ? '#86efac' : '#fde68a', fontSize: 7.5, fontWeight: 850 }, 'AIR RETURN')),
                [64,154,244,334,424].map(function (x, i) { return h('path', { key: i, className: 'iss-cabin-airflow', d: 'M' + x + ' 84H' + (x + 61), fill: 'none', stroke: airflowClear ? '#4ade80' : '#38bdf8', strokeWidth: airflowClear ? 2.2 : 1.5, markerEnd: 'url(#iss-cabin-air-arrow)', opacity: airflowClear ? .9 : .5 }); }),
                objectMark('bag', 280, 65, 118, 60, 'BAG', 'bag'),
                objectMark('tablet', 390, 105, 265, 122, 'TABLET', 'tablet'),
                objectMark('cloth', 225, 110, 442, 123, 'CLOTH', 'cloth'),
                [0,1,2].map(function (i) { var complete = i < stowedCount; return h('g', { key: i, transform: 'translate(' + (285 + i * 34) + ',153)' }, h('circle', { r: 7, fill: complete ? '#14532d' : '#111827', stroke: complete ? '#4ade80' : '#475569', strokeWidth: 1.5 }), h('text', { y: 3, textAnchor: 'middle', fill: complete ? '#dcfce7' : '#94a3b8', fontSize: 7, fontWeight: 900 }, complete ? '✓' : String(i + 1))); }))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 } }, h('strong', { style: { color: TEXT, fontSize: 11 } }, 'Loose-item scan'), h('span', { role: 'status', 'aria-live': 'polite', style: { color: stowedCount === items.length ? '#4ade80' : room.color, fontSize: 10, fontWeight: 800 } }, stowedCount + ' / ' + items.length + ' secured')),
            h('div', { role: 'group', 'aria-label': 'Cabin items to secure', style: { display: 'grid', gap: 6 } }, items.map(function (item) { var secure = !!stowed[item[0]]; return h('button', { key: item[0], type: 'button', disabled: secure || roomDone, onClick: function () { secureItem(item); }, style: { display: 'grid', gridTemplateColumns: '28px 1fr', gap: 7, textAlign: 'left', padding: 8, borderRadius: 8, border: '1px solid ' + (secure ? '#22c55e' : '#475569'), background: secure ? 'rgba(34,197,94,.12)' : 'rgba(2,6,23,.38)', color: TEXT, cursor: secure || roomDone ? 'default' : 'pointer' } }, h('span', { style: { fontSize: 19 }, 'aria-hidden': 'true' }, secure ? '✓' : item[1]), h('span', null, h('strong', { style: { display: 'block', color: secure ? '#4ade80' : TEXT, fontSize: 11 } }, item[2] + ' — ' + item[3]), h('span', { style: { display: 'block', color: SOFT, fontSize: 9.5, lineHeight: 1.4, marginTop: 2 } }, item[4]))); })),
            roomDone ? h('div', { role: 'status', style: { marginTop: 7, padding: 7, borderRadius: 7, background: 'rgba(34,197,94,.1)', color: '#bbf7d0', fontSize: 10.5 } }, 'Cabin clear ✓ Air return unobstructed ✓ Morning stow logged') : null
          );
        }        function renderCupolaObservation() {
          var targets = {
            day: { icon: '🌀', label: 'Cloud vortex', mode: 'Daylight • fast shutter', color: '#38bdf8', note: 'Cloud-band rotation reveals the storm’s structure; repeated images let scientists compare its growth and direction.' },
            aurora: { icon: '🟢', label: 'Aurora curtain', mode: 'Low light • steady camera', color: '#4ade80', note: 'Aurora traces charged particles guided by Earth’s magnetic field into the upper atmosphere.' },
            night: { icon: '🌃', label: 'City lights', mode: 'Night • long exposure', color: '#fbbf24', note: 'Night imagery maps settlement patterns, power outages, fires, and changes in human activity.' }
          };
          var targetId = targets[d.cupolaTarget] ? d.cupolaTarget : 'day';
          var target = targets[targetId];
          var captured = !!d.cupolaCaptured;
          var shutters = !!d.cupolaShutters;
          var observationState = shutters ? 'secured' : captured ? 'captured' : 'targeting';
          var stateLabel = shutters ? 'WINDOWS SECURED' : captured ? 'FRAME CAPTURED // CLOSE SHUTTERS' : 'TARGET ACQUIRED // READY TO CAPTURE';
          function selectTarget(id) {
            if (roomDone) return;
            upd({ cupolaTarget: id, cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '' });
            announceToSR(targets[id].label + ' selected. Imaging mode: ' + targets[id].mode + '.');
          }
          function captureTarget() {
            if (roomDone) return;
            upd({ cupolaCaptured: true, cupolaObservation: target.note });
            announceToSR('Image captured. ' + target.note);
          }
          function closeObservation() {
            if (!captured || roomDone) return;
            chooseInterior({ id: 'shutters', correct: true, feedback: 'Observation logged and Cupola secure. External shutters now protect all seven pressure windows.' }, { cupolaShutters: true, cupolaObservation: 'Observation logged and Cupola secure. External shutters now protect all seven pressure windows.' });
          }
          return h('div', { 'data-iss-cupola-observation': 'true' },
            h('div', { className: 'iss-learning-visual', 'data-iss-cupola-view': targetId, 'data-observation-state': observationState, style: { marginBottom: 8 } },
              h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': 'Cupola Earth observation view. Target ' + target.label + '. Camera plan ' + target.mode + '. ' + (shutters ? 'The pressure-window shutters are closed.' : captured ? 'The image is captured and ready for shutter closeout.' : 'The target is centered and ready to capture.') },
                h('defs', null,
                  h('radialGradient', { id: 'iss-cupola-earth-view', cx: '42%', cy: '28%' }, h('stop', { offset: '0%', stopColor: targetId === 'night' ? '#24425f' : '#8ed2f7' }), h('stop', { offset: '58%', stopColor: targetId === 'night' ? '#0a1b31' : '#2470ad' }), h('stop', { offset: '100%', stopColor: '#061326' })),
                  h('radialGradient', { id: 'iss-cupola-frame-glow' }, h('stop', { offset: '0%', stopColor: target.color, stopOpacity: .18 }), h('stop', { offset: '100%', stopColor: target.color, stopOpacity: 0 })),
                  h('filter', { id: 'iss-cupola-target-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'cg' }), h('feMerge', null, h('feMergeNode', { in: 'cg' }), h('feMergeNode', { in: 'SourceGraphic' })))),
                h('rect', { width: 640, height: 190, fill: '#050b18' }),
                h('text', { x: 18, y: 18, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'CUPOLA EARTH OBSERVATION // ' + target.label.toUpperCase()),
                h('text', { x: 622, y: 18, textAnchor: 'end', fill: shutters ? '#cbd5e1' : captured ? '#86efac' : target.color, fontSize: 8.5, fontWeight: 850 }, stateLabel),
                h('circle', { cx: 320, cy: 100, r: 113, fill: 'url(#iss-cupola-frame-glow)' }),
                h('circle', { cx: 320, cy: 100, r: 82, fill: 'url(#iss-cupola-earth-view)', stroke: '#cbd5e1', strokeWidth: 5 }),
                targetId === 'day' ? h('g', null, h('path', { d: 'M258 102Q285 67 329 82T383 91Q368 111 340 109T291 128', fill: 'none', stroke: '#f8fafc', strokeWidth: 9, opacity: .72 }), h('path', { d: 'M286 92Q320 64 355 90Q324 118 296 105Q313 88 337 90', fill: 'none', stroke: '#bae6fd', strokeWidth: 3 })) : targetId === 'aurora' ? h('g', null, [0,1,2,3].map(function (i) { return h('path', { key: i, className: 'iss-aurora-curtain', d: 'M' + (267 + i * 18) + ' 62Q' + (294 + i * 10) + ' 88 ' + (281 + i * 22) + ' 136', fill: 'none', stroke: i % 2 ? '#86efac' : '#4ade80', strokeWidth: 7 - i, opacity: .52 + i * .08 }); })) : h('g', null, [[278,81],[296,95],[309,75],[329,107],[347,88],[365,119],[286,124],[337,67],[373,98],[316,129]].map(function (p, i) { return h('circle', { key: i, cx: p[0], cy: p[1], r: i % 3 ? 2.4 : 3.8, fill: '#fbbf24', filter: 'url(#iss-cupola-target-glow)' }); }), h('path', { d: 'M266 119Q309 92 379 125', fill: 'none', stroke: '#64748b', strokeWidth: 2, opacity: .65 })),
                !shutters ? h('g', { opacity: captured ? 1 : .72 }, h('circle', { cx: 320, cy: 100, r: 26, fill: 'none', stroke: captured ? '#4ade80' : target.color, strokeWidth: 1.5, strokeDasharray: captured ? undefined : '5 4' }), h('line', { x1: 320, y1: 64, x2: 320, y2: 84, stroke: captured ? '#4ade80' : target.color }), h('line', { x1: 320, y1: 116, x2: 320, y2: 136, stroke: captured ? '#4ade80' : target.color }), h('line', { x1: 284, y1: 100, x2: 304, y2: 100, stroke: captured ? '#4ade80' : target.color }), h('line', { x1: 336, y1: 100, x2: 356, y2: 100, stroke: captured ? '#4ade80' : target.color })) : null,
                captured && !shutters ? h('g', { stroke: '#4ade80', strokeWidth: 2.5, fill: 'none' }, h('path', { d: 'M230 59V43H246M394 43H410V59M230 141V157H246M394 157H410V141' }), h('text', { x: 320, y: 151, textAnchor: 'middle', fill: '#86efac', stroke: 'none', fontSize: 8, fontWeight: 850 }, 'FRAME LOCKED')) : null,
                h('circle', { cx: 320, cy: 100, r: 94, fill: 'none', stroke: '#7f8a98', strokeWidth: 12 }),
                [0,60,120,180,240,300].map(function (angle) { var a = angle * Math.PI / 180; return h('line', { key: angle, x1: 320 + Math.cos(a) * 82, y1: 100 + Math.sin(a) * 82, x2: 320 + Math.cos(a) * 100, y2: 100 + Math.sin(a) * 100, stroke: '#cbd5e1', strokeWidth: 5 }); }),
                shutters ? h('g', null, h('circle', { cx: 320, cy: 100, r: 82, fill: '#334155', stroke: '#64748b', strokeWidth: 4 }), [-54,-36,-18,0,18,36,54].map(function (offset) { return h('line', { key: offset, x1: 242, y1: 100 + offset, x2: 398, y2: 100 + offset, stroke: '#475569', strokeWidth: 8 }); }), h('path', { d: 'M290 100L310 120L350 78', fill: 'none', stroke: '#86efac', strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }), h('text', { x: 320, y: 144, textAnchor: 'middle', fill: '#dcfce7', fontSize: 8.5, fontWeight: 850 }, 'SHUTTERS CLOSED')) : null,
                h('g', { transform: 'translate(18,154)' }, h('rect', { width: 188, height: 23, rx: 6, fill: 'rgba(2,6,23,.76)', stroke: target.color, strokeWidth: 1 }), h('text', { x: 9, y: 15, fill: '#94a3b8', fontSize: 7.5, fontWeight: 850 }, 'CAMERA PLAN'), h('text', { x: 179, y: 15, textAnchor: 'end', fill: '#f8fafc', fontSize: 8, fontWeight: 850 }, target.mode.toUpperCase())),
                h('text', { x: 622, y: 171, textAnchor: 'end', fill: '#94a3b8', fontSize: 8 }, '7 PRESSURE WINDOWS // EXTERNAL IMPACT SHUTTERS'))),
            h('div', { role: 'group', 'aria-label': 'Earth observation targets', style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginTop: 7 } }, Object.keys(targets).map(function (id) { var t = targets[id], active = id === targetId; return h('button', { key: id, type: 'button', disabled: roomDone, 'aria-pressed': active, onClick: function () { selectTarget(id); }, style: { minWidth: 0, padding: 6, borderRadius: 7, border: '1px solid ' + (active ? t.color : '#475569'), background: active ? t.color + '18' : 'rgba(2,6,23,.35)', color: active ? '#f8fafc' : SOFT, fontSize: 9.5, fontWeight: 800, cursor: roomDone ? 'default' : 'pointer' } }, t.icon + ' ' + t.label); })),
            h('div', { style: { marginTop: 6, padding: 7, borderRadius: 7, background: 'rgba(2,6,23,.4)', border: '1px solid #334155', color: TEXT, fontSize: 10 } }, h('strong', { style: { color: target.color } }, 'Camera plan: '), target.mode),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 7 } },
              h('button', { type: 'button', disabled: roomDone || shutters, onClick: captureTarget, style: { padding: 8, borderRadius: 8, border: '1px solid ' + target.color, background: captured ? target.color + '20' : 'rgba(2,6,23,.35)', color: TEXT, fontSize: 10.5, fontWeight: 850, cursor: roomDone || shutters ? 'default' : 'pointer' } }, captured ? '✓ Image captured' : '📷 Capture image'),
              h('button', { type: 'button', disabled: !captured || roomDone, onClick: closeObservation, style: { padding: 8, borderRadius: 8, border: '1px solid ' + (captured ? '#818cf8' : '#475569'), background: captured ? 'rgba(129,140,248,.16)' : 'rgba(2,6,23,.25)', color: captured ? '#e0e7ff' : SOFT, fontSize: 10.5, fontWeight: 850, cursor: captured && !roomDone ? 'pointer' : 'not-allowed', opacity: captured ? 1 : .48 } }, shutters ? '✓ Shutters closed' : '🛡️ Close shutters')),
            d.cupolaObservation ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 7, padding: 7, borderRadius: 7, background: target.color + '10', borderLeft: '3px solid ' + target.color, color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, h('strong', { style: { color: target.color } }, 'Observation: '), d.cupolaObservation) : null
          );
        }        return h('div', { className: 'iss-interior', 'data-iss-interior': room.id },
          h('div', { className: 'iss-interior-hero', style: { padding: 14, borderRadius: 14, marginBottom: 12, background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(99,102,241,0.12))', border: '1px solid #0ea5e9' } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' } },
              h('div', null, h('div', { style: { color: '#7dd3fc', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' } }, __alloT('stem.spacestation.interior_kicker', 'Your crew shift')), h('h3', { style: { margin: '3px 0 2px', color: TEXT, fontSize: 18 } }, __alloT('stem.spacestation.interior_title', 'Float inside. Work like an astronaut.')), h('p', { style: { margin: 0, color: SOFT, fontSize: 12.5 } }, __alloT('stem.spacestation.interior_intro', 'Move through five real station spaces. Inspect what is around you, make a crew decision, and learn the science from the result.'))),
              h('div', { style: { minWidth: 150, textAlign: 'right' } }, h('strong', { style: { color: completed === INTERIOR_ROOMS.length ? '#4ade80' : '#7dd3fc', fontSize: 15 } }, completed + ' / ' + INTERIOR_ROOMS.length + ' jobs'), h('div', { style: { height: 7, marginTop: 5, borderRadius: 9, overflow: 'hidden', background: '#0f172a', border: '1px solid #334155' } }, h('div', { style: { width: (completed / INTERIOR_ROOMS.length * 100) + '%', height: '100%', background: completed === INTERIOR_ROOMS.length ? '#22c55e' : '#0ea5e9', transition: 'width .25s ease' } }))))),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '-4px 0 12px' } },
            h('div', { role: 'status', 'aria-label': 'Crew shift progress', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              [['🚪', visitedCount + '/5', 'rooms visited'], ['🔎', inspectedCount + '/10', 'details inspected'], ['✓', completed + '/5', 'jobs complete']].map(function (item, i) { return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 20, background: 'rgba(2,6,23,.42)', border: '1px solid #334155', color: TEXT, fontSize: 10.5 } }, h('span', { 'aria-hidden': 'true' }, item[0]), h('strong', { style: { color: '#7dd3fc' } }, item[1]), h('span', { style: { color: SOFT } }, item[2])); })),
            h('div', { role: 'group', 'aria-label': 'Learning guidance level', style: { display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: '#0f172a', border: '1px solid #334155' } },
              [['guided', '🧭 Guided'], ['independent', '🎯 Independent']].map(function (mode) { var active = guided ? mode[0] === 'guided' : mode[0] === 'independent'; return h('button', { key: mode[0], type: 'button', 'aria-pressed': active, onClick: function () { upd({ interiorGuided: mode[0] === 'guided' }); }, style: { padding: '5px 8px', borderRadius: 6, border: 'none', background: active ? '#0ea5e9' : 'transparent', color: active ? '#04121f' : SOFT, fontSize: 10.5, fontWeight: 800, cursor: 'pointer' } }, mode[1]); }))
          ),
          h('div', { className: 'iss-interior-viewbar' },
            h('p', null, 'Choose free-flight for spatial practice or the diagram for a still, low-power view.'),
            h('div', { className: 'iss-interior-view-switch', role: 'group', 'aria-label': 'Interior view mode' },
              h('button', { type: 'button', 'data-iss-interior-view': '3d', 'aria-pressed': interiorView === '3d', onClick: function (event) { chooseInteriorView('3d', event); } }, '3-D free-flight'),
              h('button', { type: 'button', 'data-iss-interior-view': 'diagram', 'aria-pressed': interiorView === 'diagram', onClick: function (event) { chooseInteriorView('diagram', event); } }, 'Accessible diagram'))),
          h('div', { className: 'iss-location-strip iss-interior-route-map', role: 'group', 'aria-live': 'off', 'aria-label': 'Current station location: ' + room.name + '. Connected route: Harmony to Destiny to Unity, port turn into Tranquility, then nadir descent into Cupola.' },
            h('div', { className: 'iss-route-map-heading', 'aria-hidden': 'true' },
              h('strong', null, 'CONNECTED INTERIOR ROUTE'), h('span', null, 'PORT TURN // NADIR DESCENT')),
            h('svg', { className: 'iss-route-schematic', viewBox: '0 0 620 100', 'aria-hidden': 'true', focusable: 'false' },
              h('path', { className: 'iss-route-line', d: 'M54 52 H294 L430 24 L558 68' }),
              h('path', { className: 'iss-route-progress-line', d: 'M54 52 H294 L430 24 L558 68' }),
              h('text', { className: 'iss-route-branch-label', x: 350, y: 28 }, 'PORT TURN'),
              h('text', { className: 'iss-route-branch-label', x: 488, y: 70 }, 'NADIR'),
              interiorRouteRooms.map(function (loc) {
                var point = routePlot[loc.id] || [0, 0];
                var nextIndex = Number(navigation.routeStep) < 0 ? Math.max(0, routeRoomIdx - 1) : routeRoomIdx + 1;
                var next = routeRoomIdx >= 0 && interiorRouteRooms[nextIndex] && interiorRouteRooms[nextIndex].id === loc.id;
                var nodeClass = 'iss-route-node' + (visited[loc.id] ? ' is-visited' : '') + (done[loc.id] ? ' is-done' : '') + (next ? ' is-next' : '') + (loc.id === room.id ? ' is-current' : '');
                return h('g', { key: loc.id, className: nodeClass, transform: 'translate(' + point[0] + ',' + point[1] + ')' },
                  h('circle', { r: loc.id === room.id ? 8 : 6 }),
                  h('text', { y: 24 }, loc.id === room.id ? 'YOU // ' + loc.module.toUpperCase() : loc.module.toUpperCase()));
              }))),
          h('div', { className: 'iss-route', role: 'group', 'aria-label': __alloT('stem.spacestation.interior_route', 'Interior station route'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 7, marginBottom: 12 } },
            interiorRouteRooms.map(function (r) {
              var originalIndex = INTERIOR_ROOMS.findIndex(function (candidate) { return candidate.id === r.id; });
              var on = r.id === room.id; var finished = !!done[r.id]; var wasVisited = !!visited[r.id]; var roomInspected = [0, 1].filter(function (n) { return !!inspected[r.id + ':' + n]; }).length;
              return h('button', { className: 'iss-route-button', key: r.id, type: 'button', 'aria-pressed': on, onClick: function () { visitRoom(originalIndex); }, style: { minHeight: 64, textAlign: 'left', padding: '8px 9px', borderRadius: 10, cursor: 'pointer', background: on ? r.color + '22' : PANEL, color: TEXT, border: '1px solid ' + (on ? r.color : finished ? '#22c55e' : '#334155') } }, h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, finished ? '\u2705' : r.icon), h('span', { style: { display: 'block', fontSize: 11.5, fontWeight: 800, marginTop: 3 } }, r.name), h('span', { style: { display: 'block', fontSize: 9.5, color: finished ? '#4ade80' : SOFT, marginTop: 2 } }, finished ? 'Job complete' : roomInspected ? roomInspected + '/2 details inspected' : wasVisited ? 'Visited \u2022 ' + r.zone : r.zone));
            })),
          h('div', { className: 'iss-interior-layout' },
            h('div', null,
              interiorView === '3d' ? renderInteriorSimulation() :
              h('div', { key: room.id, className: 'iss-scene-frame iss-hatch-enter', 'data-iss-room-transition': room.id, style: { position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid ' + room.color, background: 'radial-gradient(circle at 50% 12%,' + room.color + '20,#050a18 72%)' } }, sceneArt(),
                room.discoveries.map(function (spot, i) { var on = selectedDiscovery === i; return h('button', { key: i, type: 'button', 'aria-pressed': on, onClick: function () { inspectInteriorSpot(i); }, style: { position: 'absolute', left: i ? '65%' : '6%', top: i ? '16%' : '57%', maxWidth: '29%', padding: '5px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', background: on ? room.color : 'rgba(2,6,23,0.88)', color: on ? '#04121f' : '#f8fafc', border: '1px solid ' + room.color } }, (inspected[room.id + ':' + i] ? '✓ ' : '') + spot[0]); })),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 } },
                h('button', { type: 'button', disabled: routeRoomIdx <= 0, onClick: function () { if (routeRoomIdx > 0) visitRoomById(interiorRouteRooms[routeRoomIdx - 1].id); }, style: { padding: '7px 11px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontSize: 11.5, fontWeight: 700, cursor: routeRoomIdx > 0 ? 'pointer' : 'not-allowed', opacity: routeRoomIdx > 0 ? 1 : 0.45 } }, 'Previous module'),
                h('button', { type: 'button', disabled: routeRoomIdx >= interiorRouteRooms.length - 1, onClick: function () { if (routeRoomIdx < interiorRouteRooms.length - 1) visitRoomById(interiorRouteRooms[routeRoomIdx + 1].id); }, style: { padding: '7px 11px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontSize: 11.5, fontWeight: 700, cursor: routeRoomIdx < interiorRouteRooms.length - 1 ? 'pointer' : 'not-allowed', opacity: routeRoomIdx < interiorRouteRooms.length - 1 ? 1 : 0.45 } }, 'Next module')),
              h('p', { style: { color: TEXT, fontSize: 12.5, lineHeight: 1.6, margin: '10px 0 4px' } }, room.scene),
              h('p', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.55, margin: 0 } }, h('strong', { style: { color: room.color } }, '🎧 You notice: '), room.sound),
              selectedDiscovery >= 0 && room.discoveries[selectedDiscovery] ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 9, padding: 9, borderRadius: 9, background: room.color + '12', borderLeft: '3px solid ' + room.color, color: TEXT, fontSize: 12, lineHeight: 1.55 } }, h('strong', { style: { color: room.color } }, room.discoveries[selectedDiscovery][0] + ': '), room.discoveries[selectedDiscovery][1]) : h('p', { style: { color: SOFT, fontSize: 10.5, margin: '8px 0 0' } }, 'Select the two labeled hotspots to look closer.')),
            card(room.icon + ' ' + room.task,
              h('div', null,
                h('div', { style: { fontSize: 10, color: room.color, fontWeight: 900, letterSpacing: .7, textTransform: 'uppercase', marginBottom: 5 } }, room.time + ' • ' + room.zone),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 } }, h('div', { style: { padding: 6, borderRadius: 7, background: 'rgba(2,6,23,.42)', border: '1px solid #334155' } }, h('div', { style: { color: SOFT, fontSize: 8.5, letterSpacing: .5 } }, telemetryLabel), h('strong', { style: { color: room.color, fontSize: 11.5 } }, telemetryValue)), h('div', { style: { padding: 6, borderRadius: 7, background: 'rgba(2,6,23,.42)', border: '1px solid #334155' } }, h('div', { style: { color: SOFT, fontSize: 8.5, letterSpacing: .5 } }, 'CREW SKILL'), h('strong', { style: { color: TEXT, fontSize: 11.5 } }, room.skill))),
                h('p', { style: { padding: '7px 8px', borderRadius: 8, background: room.color + '10', borderLeft: '3px solid ' + room.color, fontSize: 11.5, color: TEXT, lineHeight: 1.5, margin: '0 0 8px' } }, h('strong', { style: { color: room.color } }, 'Objective: '), room.objective),
                h('p', { style: { fontSize: 12.5, color: TEXT, lineHeight: 1.6, margin: '0 0 8px' } }, room.prompt),
                guided && !roomDone ? h('div', { style: { margin: '0 0 8px', padding: '7px 8px', borderRadius: 8, background: 'rgba(14,165,233,.08)', color: '#bae6fd', fontSize: 10.5, lineHeight: 1.5 } }, h('strong', null, '🧭 Flight hint: '), room.hint) : null,
                room.id === 'harmony' ? renderCabinStow() : room.id === 'destiny' ? renderResearchProcedure() : room.id === 'tranquility' ? renderMaintenanceConsole() : room.id === 'unity' ? renderLowGSimulator() : room.id === 'cupola' ? renderCupolaObservation() : h('div', { role: 'group', 'aria-label': room.task + ' choices', style: { display: 'grid', gap: 6 } }, room.choices.map(function (choice) { var picked = choiceId === choice.id; var bg = roomDone && choice.correct ? 'rgba(34,197,94,0.16)' : picked ? room.color + '20' : 'rgba(2,6,23,0.35)'; var border = roomDone && choice.correct ? '#22c55e' : picked ? room.color : '#475569'; return h('button', { key: choice.id, type: 'button', disabled: roomDone, onClick: function () { chooseInterior(choice); }, style: { textAlign: 'left', padding: '8px 9px', borderRadius: 8, background: bg, border: '1px solid ' + border, color: TEXT, fontSize: 11.5, fontWeight: 700, cursor: roomDone ? 'default' : 'pointer', opacity: roomDone && !choice.correct ? .55 : 1 } }, (roomDone && choice.correct ? '✅ ' : '') + choice.label); })),
                ['harmony', 'destiny', 'tranquility', 'unity', 'cupola'].indexOf(room.id) < 0 && pickedChoice ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, color: TEXT, fontSize: 11.5, lineHeight: 1.55, background: pickedChoice.correct ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)', borderLeft: '3px solid ' + (pickedChoice.correct ? '#22c55e' : '#fbbf24') } }, h('strong', { style: { color: pickedChoice.correct ? '#4ade80' : '#fbbf24' } }, pickedChoice.correct ? 'Crew check: ' : 'What happened: '), pickedChoice.feedback) : null,
                (d.interiorAttempts || {})[room.id] ? h('p', { style: { margin: '7px 0 0', color: SOFT, fontSize: 9.5 } }, 'Crew attempts: ' + (d.interiorAttempts || {})[room.id] + (roomDone && (d.interiorAttempts || {})[room.id] === 1 ? ' • first-try bonus earned' : '')) : null,
                roomDone ? h('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid #334155', color: TEXT, fontSize: 11.5, lineHeight: 1.55 } }, h('strong', { style: { color: '#7dd3fc' } }, '🔬 Science you used: '), room.lesson) : null,
                roomDone && completed < INTERIOR_ROOMS.length && nextIncomplete >= 0 ? h('button', { type: 'button', onClick: function () { visitRoom(nextIncomplete); }, style: { width: '100%', marginTop: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + INTERIOR_ROOMS[nextIncomplete].color, background: INTERIOR_ROOMS[nextIncomplete].color + '18', color: TEXT, fontSize: 11.5, fontWeight: 900, cursor: 'pointer' } }, 'Continue shift → ' + INTERIOR_ROOMS[nextIncomplete].name) : null
              ), room.color)),
          renderCrewNotebook(),
          completed ? card(completed === INTERIOR_ROOMS.length ? '🏁 Shift complete — station secure' : '📋 Crew shift log',
            h('div', null,
              h('div', { style: { display: 'grid', gap: 4 } }, (d.interiorLog || []).map(function (entry, i) { return h('div', { key: i, style: { color: TEXT, fontSize: 11.5 } }, '✓ ' + entry); })),
              completed === INTERIOR_ROOMS.length ? h('div', null, h('p', { style: { color: '#4ade80', fontSize: 12.5, lineHeight: 1.6, margin: '9px 0' } }, 'You completed a full slice of station life: personal routines, research, maintenance, low-g movement, and closeout. The station stays livable because science and careful habits happen all day.'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(82px,1fr))', gap: 6, margin: '8px 0 10px' } }, [['First try', firstTryCount + '/5'], ['Details', inspectedCount + '/10'], ['Notes', notesCount + '/5'], ['Attempts', totalAttempts + '']].map(function (metric, i) { return h('div', { key: i, style: { padding: 7, borderRadius: 8, textAlign: 'center', background: 'rgba(2,6,23,.42)', border: '1px solid #334155' } }, h('strong', { style: { display: 'block', color: '#4ade80', fontSize: 13 } }, metric[1]), h('span', { style: { color: SOFT, fontSize: 9 } }, metric[0])); })), h('button', { type: 'button', onClick: function () { upd({ interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {}, interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [], interiorShiftComplete: false, lowGImpulse: 10, lowGResult: null, researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {}, cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '' }); }, style: { padding: '7px 12px', borderRadius: 8, border: '1px solid #22c55e', background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontWeight: 800, fontSize: 11.5, cursor: 'pointer' } }, '↻ Start another shift')) : null
            ), completed === INTERIOR_ROOMS.length ? '#22c55e' : '#38bdf8') : null);
      }
      // ── Mission Operations: connected station-systems sandbox ──
      function opsClamp(value, min, max) { return Math.max(min, Math.min(max, Number(value))); }
      function opsControl(id, label, value, min, max, step, unit, color, field) {
        var formattedValue = Number(value).toFixed(step < 1 ? 1 : 0) + unit;
        return h('div', { className: 'iss-ops-control' },
          h('label', { htmlFor: id }, h('span', null, label), h('strong', { 'aria-hidden': 'true', style: { color: color } }, formattedValue)),
          h('input', { id: id, type: 'range', min: min, max: max, step: step, value: value, 'aria-valuetext': formattedValue, onChange: function (e) { var patch = { opsScenario: 'custom' }; patch[field] = Number(e.target.value); upd(patch); }, style: { accentColor: color } }));
      }
      function opsMeter(label, value, color, note) {
        var safe = opsClamp(value, 0, 100);
        return h('div', { style: { marginTop: 8 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: SOFT, fontSize: 9.5 } }, h('span', null, label), h('strong', { style: { color: color } }, safe.toFixed(0) + '%')),
          h('div', { className: 'iss-meter', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': safe }, h('span', { style: { width: safe + '%', background: color, boxShadow: '0 0 10px ' + color } })),
          note ? h('div', { style: { marginTop: 4, color: '#64748b', fontSize: 8.5 } }, note) : null);
      }
      function opsSpark(label, value, color, variance) {
        var pts = [];
        for (var i = 0; i < 12; i++) { var v = opsClamp(value + Math.sin(i * 1.37) * variance + Math.cos(i * .63) * variance * .35, 0, 100); pts.push((i * 20) + ',' + (38 - v * .3)); }
        return h('div', { className: 'iss-spark' }, h('svg', { viewBox: '0 0 220 42', role: 'img', 'aria-label': label + ' trend, current normalized value ' + value.toFixed(0) + ' percent' }, h('path', { d: 'M0 38H220', stroke: '#263449', strokeWidth: 1 }), h('polyline', { points: pts.join(' '), fill: 'none', stroke: color, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' }), h('circle', { cx: 220, cy: 38 - opsClamp(value, 0, 100) * .3, r: 3, fill: color })), h('span', { className: 'iss-sr-only' }, label));
      }
      function renderOpsForecast(samples, eclipseStart, cursorMinute, cursorSample, referenceSamples) {
        var left = 46, right = 618, top = 28, bottom = 158;
        function x(minute) { return left + minute / 92 * (right - left); }
        function y(value) { return bottom - opsClamp(value, 0, 100) / 100 * (bottom - top); }
        function pathFor(field) { return samples.map(function (sample, i) { return (i ? 'L' : 'M') + x(sample.minute).toFixed(1) + ' ' + y(sample[field]).toFixed(1); }).join(' '); }
        var last = samples[samples.length - 1];
        var eclipseX = x(eclipseStart);
        var cursorX = x(cursorMinute);
        var phase = cursorMinute < eclipseStart ? 'SUNLIGHT' : 'ECLIPSE';
        var phaseColor = phase === 'SUNLIGHT' ? '#fbbf24' : '#818cf8';
        var summary = 'Predicted orbit margins. At T plus ' + cursorMinute.toFixed(0) + ' minutes in ' + phase.toLowerCase() + ', battery is ' + cursorSample.battery.toFixed(0) + ' percent, thermal margin ' + cursorSample.thermal.toFixed(0) + ' percent, attitude margin ' + cursorSample.attitude.toFixed(0) + ' percent.';
        return h('div', { className: 'iss-learning-visual iss-orbit-forecast', 'data-iss-orbit-forecast': 'true' },
          h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': summary },
            h('defs', null,
              h('linearGradient', { id: 'iss-forecast-day', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#38240c' }), h('stop', { offset: '100%', stopColor: '#171b2a' })),
              h('linearGradient', { id: 'iss-forecast-eclipse', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#111936' }), h('stop', { offset: '100%', stopColor: '#040713' }))),
            h('rect', { width: 640, height: 190, fill: '#050b18' }),
            h('rect', { x: left, y: top, width: eclipseX - left, height: bottom - top, fill: 'url(#iss-forecast-day)', opacity: .78 }),
            h('rect', { x: eclipseX, y: top, width: right - eclipseX, height: bottom - top, fill: 'url(#iss-forecast-eclipse)', opacity: .92 }),
            [25, 50, 75].map(function (tick) { return h('g', { key: tick }, h('line', { x1: left, y1: y(tick), x2: right, y2: y(tick), stroke: '#334155', strokeWidth: 1 }), h('text', { x: left - 8, y: y(tick) + 3, textAnchor: 'end', fill: '#94a3b8', fontSize: 8 }, tick + '%')); }),
            h('line', { x1: eclipseX, y1: top, x2: eclipseX, y2: bottom, stroke: '#818cf8', strokeWidth: 1.5, strokeDasharray: '4 4' }),
            h('text', { x: left + 8, y: top + 13, fill: '#fde68a', fontSize: 8.5, fontWeight: 850 }, 'SUNLIGHT'),
            h('text', { x: eclipseX + 8, y: top + 13, fill: '#c7d2fe', fontSize: 8.5, fontWeight: 850 }, 'ECLIPSE'),
            referenceSamples ? [['battery','#4ade80'],['thermal','#fb923c'],['attitude','#a78bfa']].map(function (series) { return h('path', { key: 'reference-' + series[0], d: referenceSamples.map(function (sample, i) { return (i ? 'L' : 'M') + x(sample.minute).toFixed(1) + ' ' + y(sample[series[0]]).toFixed(1); }).join(' '), fill: 'none', stroke: series[1], strokeWidth: 1.5, strokeDasharray: '5 5', opacity: .38, vectorEffect: 'non-scaling-stroke' }); }) : null,
            h('path', { d: pathFor('battery'), fill: 'none', stroke: '#4ade80', strokeWidth: 2.5, vectorEffect: 'non-scaling-stroke' }),
            h('path', { d: pathFor('thermal'), fill: 'none', stroke: '#fb923c', strokeWidth: 2.2, vectorEffect: 'non-scaling-stroke' }),
            h('path', { d: pathFor('attitude'), fill: 'none', stroke: '#a78bfa', strokeWidth: 2.2, vectorEffect: 'non-scaling-stroke' }),
            h('line', { className: 'iss-forecast-cursor', x1: cursorX, y1: top, x2: cursorX, y2: bottom, stroke: phaseColor, strokeWidth: 1.5 }),
            h('path', { d: 'M' + (cursorX - 5) + ' ' + top + 'L' + (cursorX + 5) + ' ' + top + 'L' + cursorX + ' ' + (top + 7) + 'Z', fill: phaseColor }),
            [['battery','#4ade80'],['thermal','#fb923c'],['attitude','#a78bfa']].map(function (series) { return h('circle', { key: series[0], cx: cursorX, cy: y(cursorSample[series[0]]), r: 4, fill: series[1], stroke: '#050b18', strokeWidth: 2 }); }),
            [0, 46, 92].map(function (minute) { return h('text', { key: minute, x: x(minute), y: 176, textAnchor: minute === 0 ? 'start' : minute === 92 ? 'end' : 'middle', fill: '#94a3b8', fontSize: 8.5 }, minute + ' min'); }),
            h('text', { x: 20, y: 18, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.2 }, 'NEXT-ORBIT MARGIN FORECAST')),
          h('div', { className: 'iss-forecast-legend', 'aria-hidden': 'true' },
            [['Battery reserve',cursorSample.battery,'#4ade80'],['Thermal margin',cursorSample.thermal,'#fb923c'],['Attitude margin',cursorSample.attitude,'#a78bfa']].map(function (item) { return h('span', { key: item[0] }, h('i', { style: { background: item[2] } }), item[0] + ' ' + item[1].toFixed(0) + '%'); }),
            referenceSamples ? h('span', { className: 'iss-reference-key' }, h('i', null), 'Dashed = nominal orbit') : null),
          h('div', { className: 'iss-orbit-scrubber' },
            h('label', { htmlFor: 'iss-orbit-cursor' }, h('span', null, 'Scrub predicted orbit'), h('strong', { 'aria-hidden': 'true' }, 'T+' + cursorMinute.toFixed(0) + ' MIN')),
            h('input', { id: 'iss-orbit-cursor', type: 'range', min: 0, max: 92, step: 1, value: cursorMinute, 'aria-valuetext': 'T plus ' + cursorMinute.toFixed(0) + ' minutes, ' + phase.toLowerCase(), 'aria-describedby': 'iss-orbit-readout', onChange: function (event) { upd({ opsOrbitMinute: Number(event.target.value) }); }, style: { accentColor: phaseColor } }),
            h('div', { id: 'iss-orbit-readout', className: 'iss-orbit-readout', 'aria-live': 'off' }, h('strong', { style: { color: phaseColor } }, phase), h('span', null, 'Battery ' + cursorSample.battery.toFixed(0) + '%'), h('span', null, 'Thermal ' + cursorSample.thermal.toFixed(0) + '%'), h('span', null, 'Attitude ' + cursorSample.attitude.toFixed(0) + '%'))));
      }
      function opsLogEntry(message, patch) {
        var nextLog = (d.opsLog || []).concat(['ORBIT ' + ((d.opsRuns || 0) + 1) + ' // ' + message]).slice(-5);
        upd(Object.assign({ opsLog: nextLog, opsScenario: 'custom' }, patch || {}));
      }
      function renderOpsNetwork(metrics, focus) {
        var nodes = [
          { id: 'power', x: 92, y: 56, label: 'POWER', value: metrics.power.toFixed(0) + '%', color: metrics.power > 25 ? '#fbbf24' : '#f87171' },
          { id: 'air', x: 548, y: 56, label: 'AIR', value: metrics.co2.toFixed(0) + ' ppm', color: metrics.co2 < metrics.co2Action ? '#34d399' : '#f87171' },
          { id: 'water', x: 86, y: 154, label: 'WATER', value: metrics.recovery.toFixed(0) + '%', color: metrics.recovery > 90 ? '#38bdf8' : '#fbbf24' },
          { id: 'thermal', x: 554, y: 154, label: 'THERMAL', value: metrics.temp.toFixed(1) + '°C', color: metrics.temp > 18 && metrics.temp < 27 ? '#fb923c' : '#f87171' },
          { id: 'attitude', x: 320, y: 180, label: 'ATTITUDE', value: metrics.cmg.toFixed(0) + '%', color: metrics.cmg < 80 ? '#a78bfa' : '#f87171' }
        ];
        var selectedFocus = focus || 'all';
        var details = { all: 'Crew safety is the combined result of power, air, water, heat rejection, and attitude control.', power: 'Power feeds every rack, pump, fan, heater, computer, and control actuator aboard.', air: 'Cabin airflow carries carbon dioxide and humidity to life-support equipment for removal.', water: 'Recovered humidity and wastewater reduce resupply mass while supporting oxygen generation.', thermal: 'Electrical work becomes heat, which coolant loops carry to radiators for rejection to space.', attitude: 'CMGs hold orientation without routine propellant, keeping arrays, radiators, and visiting vehicles aligned.' };
        function active(node) { return selectedFocus === 'all' || selectedFocus === node.id; }
        return h('div', { className: 'iss-learning-visual iss-ops-schematic', 'data-iss-network-focus': selectedFocus },
          h('svg', { viewBox: '0 0 640 220', role: 'img', 'aria-label': 'Connected station systems overview focused on ' + selectedFocus + '. ' + nodes.map(function (n) { return n.label + ' ' + n.value; }).join(', ') },
            h('defs', null, h('radialGradient', { id: 'iss-ops-earth', cx: '40%', cy: '30%' }, h('stop', { offset: '0%', stopColor: '#67c8ff' }), h('stop', { offset: '100%', stopColor: '#0b3567' }))),
            h('rect', { width: 640, height: 220, fill: '#040a16' }), h('circle', { cx: 320, cy: 310, r: 156, fill: 'url(#iss-ops-earth)', opacity: .72 }),
            nodes.map(function (n, i) { var on = active(n); return h('path', { key: 'p' + i, className: on ? 'iss-flow-path' : '', d: 'M320 111 Q' + ((320 + n.x) / 2) + ' ' + ((100 + n.y) / 2 - 13) + ' ' + n.x + ' ' + n.y, fill: 'none', stroke: on ? n.color : '#334155', strokeWidth: on ? 2.2 : 1, opacity: on ? .76 : .3 }); }),
            h('g', { transform: 'translate(320,108)' }, h('rect', { x: -98, y: -5, width: 196, height: 10, rx: 4, fill: '#94a3b8' }), h('rect', { x: -45, y: -22, width: 90, height: 44, rx: 18, fill: '#dbe3ec', stroke: '#f8fafc' }), h('rect', { x: -151, y: -21, width: 45, height: 42, fill: '#aa751a', stroke: '#fbbf24' }), h('rect', { x: 106, y: -21, width: 45, height: 42, fill: '#aa751a', stroke: '#fbbf24' }), h('circle', { r: 7, fill: '#38bdf8' })),
            nodes.map(function (n) { var on = active(n); return h('g', { key: n.label, transform: 'translate(' + n.x + ',' + n.y + ')', opacity: on ? 1 : .36 }, h('circle', { r: 28, fill: '#111d30', stroke: on ? n.color : '#475569', strokeWidth: on ? 2.8 : 1.2 }), h('circle', { r: 22, fill: n.color, opacity: on ? .12 : .03 }), h('text', { y: -3, textAnchor: 'middle', fill: on ? n.color : '#64748b', fontSize: 8, fontWeight: 900, letterSpacing: .8 }, n.label), h('text', { y: 12, textAnchor: 'middle', fill: on ? '#f8fafc' : '#94a3b8', fontSize: 10, fontWeight: 850 }, n.value)); }),
            h('text', { x: 20, y: 24, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'MISSION OPERATIONS // COUPLED SYSTEMS')),
          h('div', { className: 'iss-network-focus', role: 'group', 'aria-label': 'Highlight a station system flow' }, [{ id: 'all', label: 'All systems' }].concat(nodes.map(function (node) { return { id: node.id, label: node.label }; })).map(function (item) { var on = selectedFocus === item.id; return h('button', { key: item.id, type: 'button', 'data-iss-system-focus': item.id, 'aria-pressed': on, onClick: function () { upd({ opsFocus: item.id }); } }, item.label); })),
          h('div', { className: 'iss-network-detail', role: 'status', 'aria-live': 'polite' }, details[selectedFocus] || details.all));
      }      function renderOperations() {
        var crew = opsClamp(d.opsCrew == null ? 7 : d.opsCrew, 3, 11);
        var research = opsClamp(d.opsResearch == null ? 60 : d.opsResearch, 0, 100);
        var arrayAngle = opsClamp(d.opsArrayAngle == null ? 86 : d.opsArrayAngle, 0, 90);
        var eclipse = opsClamp(d.opsEclipse == null ? 35 : d.opsEclipse, 20, 45);
        var battery = opsClamp(d.opsBattery == null ? 76 : d.opsBattery, 0, 100);
        var recovery = opsClamp(d.opsRecovery == null ? 98 : d.opsRecovery, 70, 99);
        var scrub = opsClamp(d.opsScrub == null ? 88 : d.opsScrub, 40, 100);
        var radiator = opsClamp(d.opsRadiator == null ? 82 : d.opsRadiator, 30, 100);
        var cooling = opsClamp(d.opsCooling == null ? 86 : d.opsCooling, 40, 100);
        var cmg = opsClamp(d.opsCmg == null ? 28 : d.opsCmg, 0, 100);
        var missionDays = opsClamp(d.opsMissionDays == null ? 180 : d.opsMissionDays, 30, 900);
        var exercise = opsClamp(d.opsExercise == null ? 2.5 : d.opsExercise, 0, 3);
        var debrisSize = opsClamp(d.opsDebrisSize == null ? 1 : d.opsDebrisSize, .2, 12);
        var shieldGap = opsClamp(d.opsShieldGap == null ? 10 : d.opsShieldGap, 2, 20);
        var debrisSpeed = opsClamp(d.opsDebrisSpeed == null ? 12 : d.opsDebrisSpeed, 7, 15);
        // ── Model constants ────────────────────────────────────────────────
        // Named rather than inlined because the battery projection is computed in
        // FOUR places (headline, per-minute forecast, nominal reference forecast,
        // scrubber cursor) and they must not drift apart.
        //
        // ARRAY_PEAK_KW is the arrays' output at perfect pointing while sunlit,
        // not the orbit average. Over a 92-minute orbit with a 35-minute eclipse
        // it averages ~99 kW, inside the 84-120 kW NASA cites for the station
        // since the iROSA upgrades. This was 132, which made the average ~82 kW
        // and left the NOMINAL configuration net-negative: a full crew running
        // routine research drained the battery every orbit, implying the real ISS
        // cannot do science at full crew. It sustains both, so the model must too.
        var ARRAY_PEAK_KW = 160;
        // Assumed usable battery capacity, so a kWh surplus becomes a percentage
        // of reserve. Previously a bare "/ 2.1" divisor, which is this same
        // assumption (210 kWh) left unstated.
        var BATTERY_KWH = 210;
        // Cabin CO2 action level, ~3 mmHg. Crews work to stay under this; NASA's
        // 180-day limit is higher still. The old rule was 1000 ppm, an office-air
        // number: real ISS cabin CO2 runs roughly 2-4 mmHg (~2600-5300 ppm),
        // never near ground level, because scrubbing keeps pace with the crew
        // rather than eliminating CO2.
        var CO2_ACTION_PPM = 4000;

        var load = 68 + crew * 1.6 + research * .22;
        var generation = ARRAY_PEAK_KW * Math.sin(arrayAngle * Math.PI / 180);
        var energyIn = generation * (92 - eclipse) / 60;
        var energyOut = load * 92 / 60;
        var orbitDelta = (energyIn - energyOut) / (BATTERY_KWH / 100);
        var projectedBattery = opsClamp(battery + orbitDelta, 0, 100);
        var waterNeed = crew * 3.8;
        var waterReturn = waterNeed * recovery / 100;
        var resupplyWater = waterNeed - waterReturn;
        var oxygenNeed = crew * .84;
        // Tuned so a nominal 7-crew day with healthy scrubbing lands ~2600 ppm
        // (~2 mmHg, a good day aboard), perfect scrubbing ~2000 ppm, and a
        // degraded scrubber with 11 aboard climbs past 5000 ppm. The floor stays
        // near Earth ambient; the ceiling sits around NASA's long-duration limit.
        var co2 = opsClamp(425 + crew * 225 + (100 - scrub) * 50, 400, 8000);
        var wasteHeat = load * .72;
        var rejectedHeat = radiator * .75 * cooling / 100;
        var cabinTemp = opsClamp(22 + (wasteHeat - rejectedHeat) / 12, 10, 40);
        var attitudeDemand = 10 + (90 - arrayAngle) * .25 + research * .08;
        var nextCmg = opsClamp(cmg + attitudeDemand * .55, 0, 100);
        var boneLoss = 1.25 * (missionDays / 30) * (1 - Math.min(exercise, 2.5) / 2.5 * .68);
        var debrisRadius = debrisSize / 2000;
        var debrisMass = 2700 * (4 / 3) * Math.PI * Math.pow(debrisRadius, 3);
        var impactKj = .5 * debrisMass * Math.pow(debrisSpeed * 1000, 2) / 1000;
        var shieldCapacity = 5 * Math.pow(shieldGap / 10, 1.4);
        var powerScore = projectedBattery;
        // 100 at a well-scrubbed ~2000 ppm, reaching 0 near the long-duration
        // limit, so the meter tracks the same scale the flight rule uses.
        var airScore = opsClamp(100 - Math.max(0, co2 - 2000) / 50, 0, 100);
        var thermalScore = opsClamp(100 - Math.abs(cabinTemp - 22) * 13, 0, 100);
        var attitudeScore = opsClamp(100 - nextCmg * .65, 0, 100);
        var health = Math.round((powerScore + airScore + recovery + thermalScore + attitudeScore) / 5);
        var healthColor = health >= 75 ? '#4ade80' : health >= 50 ? '#fbbf24' : '#f87171';
        var metrics = { power: projectedBattery, co2: co2, co2Action: CO2_ACTION_PPM, recovery: recovery, temp: cabinTemp, cmg: nextCmg };
        var sunlightMinutes = 92 - eclipse;
        var orbitForecast = [];
        for (var forecastStep = 0; forecastStep <= 24; forecastStep++) {
          var minute = forecastStep / 24 * 92;
          var sunMinutes = Math.min(minute, sunlightMinutes);
          var darkMinutes = Math.max(0, minute - sunlightMinutes);
          var batteryAtMinute = opsClamp(battery + ((generation - load) * sunMinutes - load * darkMinutes) / 60 / (BATTERY_KWH / 100), 0, 100);
          var thermalAtMinute = opsClamp(thermalScore + Math.sin(minute / 92 * Math.PI * 2) * 2 - (minute > sunlightMinutes ? 2 : 0), 0, 100);
          var cmgAtMinute = cmg + attitudeDemand * .55 * minute / 92;
          orbitForecast.push({ minute: minute, battery: batteryAtMinute, thermal: thermalAtMinute, attitude: opsClamp(100 - cmgAtMinute * .65, 0, 100) });
        }
        var nominalForecast = [];
        var nominalLoad = 68 + 7 * 1.6 + 60 * .22;
        var nominalGeneration = ARRAY_PEAK_KW * Math.sin(86 * Math.PI / 180);
        var nominalSunlight = 57;
        var nominalWasteHeat = nominalLoad * .72;
        var nominalRejectedHeat = 82 * .75 * 86 / 100;
        var nominalCabinTemp = opsClamp(22 + (nominalWasteHeat - nominalRejectedHeat) / 12, 10, 40);
        var nominalThermalScore = opsClamp(100 - Math.abs(nominalCabinTemp - 22) * 13, 0, 100);
        var nominalAttitudeDemand = 10 + (90 - 86) * .25 + 60 * .08;
        for (var nominalStep = 0; nominalStep <= 24; nominalStep++) {
          var nominalMinute = nominalStep / 24 * 92;
          var nominalSunMinutes = Math.min(nominalMinute, nominalSunlight);
          var nominalDarkMinutes = Math.max(0, nominalMinute - nominalSunlight);
          var nominalCmg = 28 + nominalAttitudeDemand * .55 * nominalMinute / 92;
          nominalForecast.push({ minute: nominalMinute, battery: opsClamp(76 + ((nominalGeneration - nominalLoad) * nominalSunMinutes - nominalLoad * nominalDarkMinutes) / 60 / (BATTERY_KWH / 100), 0, 100), thermal: opsClamp(nominalThermalScore + Math.sin(nominalMinute / 92 * Math.PI * 2) * 2 - (nominalMinute > nominalSunlight ? 2 : 0), 0, 100), attitude: opsClamp(100 - nominalCmg * .65, 0, 100) });
        }        var orbitMinute = opsClamp(d.opsOrbitMinute == null ? 0 : d.opsOrbitMinute, 0, 92);
        var cursorSunMinutes = Math.min(orbitMinute, sunlightMinutes);
        var cursorDarkMinutes = Math.max(0, orbitMinute - sunlightMinutes);
        var cursorCmg = cmg + attitudeDemand * .55 * orbitMinute / 92;
        var orbitCursor = {
          battery: opsClamp(battery + ((generation - load) * cursorSunMinutes - load * cursorDarkMinutes) / 60 / (BATTERY_KWH / 100), 0, 100),
          thermal: opsClamp(thermalScore + Math.sin(orbitMinute / 92 * Math.PI * 2) * 2 - (orbitMinute > sunlightMinutes ? 2 : 0), 0, 100),
          attitude: opsClamp(100 - cursorCmg * .65, 0, 100)
        };        var modes = [['integrated','🛰️','Integrated'],['power','☀️','Power'],['eclss','♻️','Air + water'],['thermal','🌡️','Thermal'],['attitude','🧭','Attitude'],['debris','🛡️','Debris'],['human','🦴','Human'],['emergency','🚨','Emergency'],['rendezvous','🚀','Rendezvous']];
        var scenarioPresets = [
          { id: 'nominal', icon: '✓', label: 'Nominal orbit', note: 'Balanced science day', patch: { opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 76, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 28 } },
          { id: 'science', icon: '⚗', label: 'Science surge', note: 'Maximum lab demand', patch: { opsCrew: 7, opsResearch: 95, opsArrayAngle: 88, opsEclipse: 35, opsBattery: 78, opsRecovery: 98, opsScrub: 92, opsRadiator: 95, opsCooling: 94, opsCmg: 35 } },
          { id: 'eclipse', icon: '◐', label: 'Long eclipse', note: 'Protect battery reserve', patch: { opsCrew: 7, opsResearch: 25, opsArrayAngle: 84, opsEclipse: 45, opsBattery: 55, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 45 } },
          { id: 'crew', icon: '●●', label: 'Crew surge', note: 'Eleven people aboard', patch: { opsCrew: 11, opsResearch: 70, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 82, opsRecovery: 98.5, opsScrub: 98, opsRadiator: 94, opsCooling: 94, opsCmg: 35 } },
          { id: 'fault', icon: '!', label: 'Cascading fault', note: 'Recover the station', patch: { opsCrew: 7, opsResearch: 90, opsArrayAngle: 55, opsEclipse: 42, opsBattery: 38, opsRecovery: 84, opsScrub: 55, opsRadiator: 42, opsCooling: 48, opsCmg: 78 } }
        ];
        var mode = d.opsMode || 'integrated';
        var opsScenario = d.opsScenario || 'custom';
        var flightRules = [
          { mode: 'power', label: 'Battery reserve', value: projectedBattery.toFixed(0) + '%', rule: '≥ 25%', pass: projectedBattery >= 25, color: projectedBattery >= 25 ? '#4ade80' : '#f87171' },
          { mode: 'eclss', label: 'Cabin CO₂', value: co2.toFixed(0) + ' ppm', rule: '< ' + CO2_ACTION_PPM + ' ppm', pass: co2 < CO2_ACTION_PPM, color: co2 < CO2_ACTION_PPM ? '#34d399' : '#f87171' },
          { mode: 'eclss', label: 'Water loop', value: recovery.toFixed(1) + '%', rule: '≥ 90%', pass: recovery >= 90, color: recovery >= 90 ? '#38bdf8' : '#fbbf24' },
          { mode: 'thermal', label: 'Cabin temp', value: cabinTemp.toFixed(1) + ' °C', rule: '18–27 °C', pass: cabinTemp > 18 && cabinTemp < 27, color: cabinTemp > 18 && cabinTemp < 27 ? '#fb923c' : '#f87171' },
          { mode: 'attitude', label: 'CMG load', value: nextCmg.toFixed(0) + '%', rule: '< 80%', pass: nextCmg < 80, color: nextCmg < 80 ? '#a78bfa' : '#f87171' }
        ];
        var violatedRules = flightRules.filter(function (rule) { return !rule.pass; });
        var primaryRule = violatedRules.length ? violatedRules[0] : null;
        var concernCopy = !primaryRule ? 'All five flight rules are green. Scrub the orbit or load a stress scenario to explore the operating boundary.' :
          primaryRule.mode === 'power' ? 'Generation and load leave too little battery reserve after eclipse.' :
          primaryRule.label === 'Cabin CO₂' ? 'Scrubber throughput cannot match the crew carbon-dioxide load.' :
          primaryRule.label === 'Water loop' ? 'Open-loop water loss is compounding faster than the recovery system can replace it.' :
          primaryRule.mode === 'thermal' ? 'Waste heat is outrunning radiator and cooling-loop rejection.' :
          'Control-moment gyroscopes are approaching saturation under the current disturbance load.';
        function setMode(id) { upd({ opsMode: id, opsEmergencyResult: '' }); }
        function renderRuleStatus() {
          return h('div', { className: 'iss-rule-status' + (primaryRule ? ' is-check' : ' is-go'), role: 'status', 'aria-live': 'polite' },
            h('span', { className: 'iss-rule-status-icon', 'aria-hidden': 'true' }, primaryRule ? '!' : '✓'),
            h('div', null, h('strong', null, primaryRule ? violatedRules.length + ' FLIGHT RULE' + (violatedRules.length === 1 ? '' : 'S') + ' TO CHECK' : '5 / 5 FLIGHT RULES GO'), h('p', null, concernCopy)),
            primaryRule ? h('button', { type: 'button', onClick: function () { setMode(primaryRule.mode); } }, 'Inspect ' + primaryRule.label + ' →') : null);
        }
        function applyScenario(scenario) {
          upd(Object.assign({ opsScenario: scenario.id, opsMode: 'integrated', opsOrbitMinute: 0, opsEmergencyResult: '' }, scenario.patch));
          if (announceToSR) announceToSR(scenario.label + ' mission scenario loaded.');
        }
        function renderScenarioPresets() {
          return h('div', { className: 'iss-ops-presets', role: 'group', 'aria-label': 'Mission scenario presets' },
            scenarioPresets.map(function (scenario) { var on = opsScenario === scenario.id; return h('button', { key: scenario.id, type: 'button', 'data-iss-scenario': scenario.id, 'aria-pressed': on, onClick: function () { applyScenario(scenario); } }, h('span', { className: 'iss-preset-icon', 'aria-hidden': 'true' }, scenario.icon), h('span', null, h('strong', null, scenario.label), h('small', null, scenario.note))); }),
            opsScenario === 'custom' ? h('span', { className: 'iss-custom-badge', role: 'status' }, 'CUSTOM CONFIGURATION') : null);
        }
        function renderMissionReplay() {
          if (!(d.opsRuns || 0)) return null;
          var replayEvents = [
            { minute: 0, label: 'Orbit start', note: 'Sunlit power-up' },
            { minute: Math.round(sunlightMinutes / 2), label: 'Peak daylight', note: 'Maximum collection' },
            { minute: sunlightMinutes, label: 'Eclipse entry', note: 'Battery takes load' },
            { minute: 92, label: 'Orbit complete', note: 'Review margins' }
          ];
          return h('div', { className: 'iss-mission-replay', 'data-iss-mission-replay': 'true' },
            h('div', { className: 'iss-replay-heading' }, h('strong', null, 'MISSION REPLAY // ORBIT ' + (d.opsRuns || 0)), h('span', null, 'Select an event to inspect synchronized telemetry.')),
            h('div', { className: 'iss-replay-lane', role: 'group', 'aria-label': 'Mission replay events' }, replayEvents.map(function (event) { var on = Math.round(orbitMinute) === Math.round(event.minute); return h('button', { key: event.label, type: 'button', 'data-iss-replay-event': event.minute, 'aria-pressed': on, onClick: function () { upd({ opsOrbitMinute: event.minute }); } }, h('i', { 'aria-hidden': 'true' }), h('strong', null, 'T+' + event.minute), h('span', null, event.label), h('small', null, event.note)); })));
        }        function statusBox(title, value, note, color) { return h('div', { className: 'iss-ops-control' }, h('div', { style: { color: SOFT, fontSize: 8.5, fontWeight: 850, letterSpacing: .8, textTransform: 'uppercase' } }, title), h('strong', { style: { display: 'block', marginTop: 4, color: color, fontSize: 18 } }, value), h('div', { style: { marginTop: 4, color: SOFT, fontSize: 9.5, lineHeight: 1.45 } }, note)); }
        function renderIntegrated() {
          return h('div', null, renderOpsNetwork(metrics, d.opsFocus || 'all'), renderOpsForecast(orbitForecast, sunlightMinutes, orbitMinute, orbitCursor, opsScenario === 'nominal' ? null : nominalForecast), h('div', { className: 'iss-ops-grid' },
            opsControl('iss-ops-crew','Crew aboard',crew,3,11,1,' people','#7dd3fc','opsCrew'), opsControl('iss-ops-research','Research load',research,0,100,5,'%','#a78bfa','opsResearch'),
            opsControl('iss-ops-angle','Solar-array alignment',arrayAngle,0,90,1,'°','#fbbf24','opsArrayAngle'), opsControl('iss-ops-battery','Battery state',battery,0,100,1,'%','#4ade80','opsBattery')),
            h('button', { type: 'button', onClick: function () { var run = (d.opsRuns || 0) + 1; var log = (d.opsLog || []).concat(['ORBIT ' + run + ' // battery ' + projectedBattery.toFixed(0) + '%, cabin ' + cabinTemp.toFixed(1) + '°C, CMG ' + nextCmg.toFixed(0) + '%']).slice(-5); upd({ opsBattery: projectedBattery, opsCmg: nextCmg, opsRuns: run, opsLog: log, opsLastDebrief: health, opsScenario: 'custom', opsOrbitMinute: 92 }); if (announceToSR) announceToSR('Orbit simulation complete. Station health ' + health + ' percent.'); }, style: { width: '100%', marginTop: 10, padding: '10px 14px', border: '1px solid #4ade80', borderRadius: 10, background: 'rgba(34,197,94,.14)', color: '#86efac', fontWeight: 900, cursor: 'pointer' } }, '▶ Simulate the next 92-minute orbit'), renderMissionReplay());
        }
        function renderPower() {
          return h('div', null,
            h('div', { className: 'iss-learning-visual', style: { padding: 12 } }, h('div', { style: { display: 'grid', gridTemplateColumns: (92 - eclipse) + 'fr ' + eclipse + 'fr', height: 44, overflow: 'hidden', borderRadius: 10 } }, h('div', { style: { display: 'grid', placeItems: 'center', background: 'linear-gradient(90deg,#78350f,#92400e)', color: '#fff7ed', fontSize: 10, fontWeight: 900 } }, 'SUNLIGHT ' + (92 - eclipse).toFixed(0) + ' MIN'), h('div', { style: { display: 'grid', placeItems: 'center', background: 'linear-gradient(90deg,#172554,#020617)', color: '#bfdbfe', fontSize: 10, fontWeight: 900 } }, 'ECLIPSE ' + eclipse.toFixed(0) + ' MIN'))),
            h('div', { className: 'iss-ops-grid' }, opsControl('iss-power-angle','Array face-on angle',arrayAngle,0,90,1,'°','#fbbf24','opsArrayAngle'), opsControl('iss-power-eclipse','Eclipse duration',eclipse,20,45,1,' min','#818cf8','opsEclipse'), opsControl('iss-power-load','Research utilization',research,0,100,5,'%','#a78bfa','opsResearch'), opsControl('iss-power-battery','Starting battery',battery,0,100,1,'%','#4ade80','opsBattery'), statusBox('Solar generation',generation.toFixed(1) + ' kW','Face-on arrays maximize incident sunlight.','#fbbf24'), statusBox('Station demand',load.toFixed(1) + ' kW','Life support is the non-negotiable base load.','#7dd3fc')),
            opsMeter('Battery after one orbit',projectedBattery,projectedBattery > 25 ? '#4ade80' : '#f87171',orbitDelta >= 0 ? 'Net charge +' + orbitDelta.toFixed(1) + '%' : 'Net discharge ' + orbitDelta.toFixed(1) + '%'), opsSpark('Battery state',projectedBattery,projectedBattery > 25 ? '#4ade80' : '#f87171',Math.abs(orbitDelta) + 3));
        }
        function renderEclss() {
          return h('div', null, renderSystemSchematic(systemById('water')), h('div', { className: 'iss-ops-grid' }, opsControl('iss-eclss-crew','Crew demand',crew,3,11,1,' people','#7dd3fc','opsCrew'), opsControl('iss-eclss-recovery','Water recovery',recovery,70,99,.5,'%','#38bdf8','opsRecovery'), opsControl('iss-eclss-scrub','CO₂ scrubber output',scrub,40,100,1,'%','#34d399','opsScrub'), statusBox('Water recovered',waterReturn.toFixed(1) + ' L/day','Daily potable-water model for the selected crew.','#38bdf8'), statusBox('Water resupply gap',resupplyWater.toFixed(2) + ' L/day','Even a small open-loop loss compounds on Mars.','#fbbf24'), statusBox('Oxygen demand',oxygenNeed.toFixed(2) + ' kg/day','Electrolysis must replace crew consumption.','#34d399')),
            opsMeter('Loop closure',recovery,'#38bdf8','Target ≥ 98% for exploration-class missions'), opsMeter('Cabin-air quality',airScore,co2 < CO2_ACTION_PPM ? '#34d399' : '#f87171','Modeled CO₂ ' + co2.toFixed(0) + ' ppm — Earth air is ~420 ppm; crews work to stay under ' + CO2_ACTION_PPM), opsSpark('CO2 trend',airScore,co2 < CO2_ACTION_PPM ? '#34d399' : '#f87171',8));
        }
        function renderThermal() {
          return h('div', null, renderSystemSchematic(systemById('thermal')), h('div', { className: 'iss-ops-grid' }, opsControl('iss-thermal-rad','Radiator deployment',radiator,30,100,1,'%','#fb923c','opsRadiator'), opsControl('iss-thermal-flow','Cooling-loop flow',cooling,40,100,1,'%','#38bdf8','opsCooling'), opsControl('iss-thermal-research','Heat-producing research',research,0,100,5,'%','#a78bfa','opsResearch'), statusBox('Waste heat',wasteHeat.toFixed(1) + ' kW','Electronics and crew work become heat.','#f97316'), statusBox('Rejected heat',rejectedHeat.toFixed(1) + ' kW','Radiators emit infrared energy to space.','#38bdf8'), statusBox('Modeled cabin',cabinTemp.toFixed(1) + ' °C','Comfort band: 18–27 °C. ',cabinTemp > 18 && cabinTemp < 27 ? '#4ade80' : '#f87171')), opsMeter('Thermal margin',thermalScore,cabinTemp > 18 && cabinTemp < 27 ? '#4ade80' : '#f87171','Balance heat collected with heat rejected'), opsSpark('Cabin temperature stability',thermalScore,'#fb923c',6));
        }
        function renderAttitude() {
          var wheelColor = nextCmg < 80 ? '#a78bfa' : '#f87171';
          return h('div', null,
            h('div', { className: 'iss-learning-visual' }, h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': 'Control Moment Gyroscope cluster, projected saturation ' + nextCmg.toFixed(0) + ' percent.' }, h('rect', { width: 640, height: 190, fill: '#050b18' }), [220,290,360,430].map(function (x,i) { return h('g', { key:i, transform:'translate('+x+',96) rotate('+(i%2?18:-18)+')' }, h('circle',{r:42,fill:'#111827',stroke:wheelColor,strokeWidth:3}),h('circle',{r:34,fill:'none',stroke:'#1e1b4b',strokeWidth:5}),h('circle',{r:34,fill:'none',stroke:wheelColor,strokeWidth:5,strokeLinecap:'round',strokeDasharray:(nextCmg/100*213.6).toFixed(1)+' 213.6',transform:'rotate(-90)'}),h('circle',{r:26,fill:'none',stroke:'#64748b',strokeWidth:8}),h('path',{d:'M-18 0A18 18 0 0 1 18 0',fill:'none',stroke:wheelColor,strokeWidth:4}),h('text',{y:4,textAnchor:'middle',fill:'#e9d5ff',fontSize:10,fontWeight:900},'CMG '+(i+1))); }), h('text',{x:20,y:24,fill:'#c4b5fd',fontSize:10,fontWeight:850,letterSpacing:1.4},'ATTITUDE CONTROL // MOMENTUM STORAGE'))),
            h('div', { className: 'iss-ops-grid' }, opsControl('iss-cmg-load','Current CMG saturation',cmg,0,100,1,'%','#a78bfa','opsCmg'), opsControl('iss-cmg-research','Disturbance / operations load',research,0,100,5,'%','#38bdf8','opsResearch'), opsControl('iss-cmg-angle','Array tracking demand',arrayAngle,0,90,1,'°','#fbbf24','opsArrayAngle'), statusBox('Next-orbit saturation',nextCmg.toFixed(0) + '%','Above 80%: plan a propulsive desaturation.',wheelColor)),
            opsMeter('Momentum storage',nextCmg,wheelColor,'CMGs save fuel until their stored momentum must be dumped'),
            h('button',{type:'button',onClick:function(){opsLogEntry('CMG desaturation burn completed; momentum reset to 8%.',{opsCmg:8,opsRuns:(d.opsRuns||0)+1});},style:{marginTop:9,padding:'8px 12px',borderRadius:9,border:'1px solid #a78bfa',background:'rgba(167,139,250,.14)',color:'#ddd6fe',fontWeight:850,cursor:'pointer'}},'🔥 Perform thruster desaturation'));
        }
        function renderDebris() {
          var survives = impactKj <= shieldCapacity;
          return h('div', null,
            h('div', { className: 'iss-learning-visual' }, h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': 'Debris impact test. Particle ' + debrisSize.toFixed(1) + ' millimeters at ' + debrisSpeed.toFixed(1) + ' kilometers per second. ' + (survives ? 'Shield disperses impact.' : 'Pressure wall at risk.') }, h('defs',null,h('filter',{id:'iss-debris-flash',x:'-140%',y:'-140%',width:'380%',height:'380%'},h('feGaussianBlur',{stdDeviation:7,result:'db'}),h('feMerge',null,h('feMergeNode',{in:'db'}),h('feMergeNode',{in:'SourceGraphic'}))),h('radialGradient',{id:'iss-debris-burst'},h('stop',{offset:'0%',stopColor:survives?'#fef3c7':'#fecaca',stopOpacity:.95}),h('stop',{offset:'100%',stopColor:survives?'#f59e0b':'#ef4444',stopOpacity:0}))),h('rect',{width:640,height:190,fill:'#050b18'}),h('line',{x1:110,y1:95,x2:268,y2:95,stroke:'#f87171',strokeWidth:3,strokeDasharray:'8 6'}),h('circle',{cx:96,cy:95,r:Math.max(3,debrisSize),fill:'#f87171',filter:'url(#iss-debris-flash)'}),h('rect',{x:286,y:34,width:8,height:122,fill:'#cbd5e1'}),h('text',{x:290,y:172,textAnchor:'middle',fill:'#94a3b8',fontSize:8},'BUMPER'),
              // The bumper impact is where the whole Whipple idea happens: the
              // particle vaporizes into a spreading cloud instead of a slug.
              h('circle',{cx:294,cy:95,r:26,fill:'url(#iss-debris-burst)'}),
              h('path',{d:'M294 95 L390 50 M294 95 L390 72 M294 95 L390 95 M294 95 L390 118 M294 95 L390 140',stroke:survives?'#fbbf24':'#f87171',strokeWidth:2,opacity:.7,filter:'url(#iss-debris-flash)'}),h('rect',{x:410,y:26,width:20,height:138,rx:5,fill:survives?'#475569':'#7f1d1d',stroke:survives?'#94a3b8':'#f87171',strokeWidth:3}),h('line',{x1:294,y1:25,x2:410,y2:25,stroke:'#38bdf8',strokeWidth:1.5}),h('text',{x:352,y:18,textAnchor:'middle',fill:'#7dd3fc',fontSize:9,fontWeight:850},shieldGap.toFixed(0)+' cm STANDOFF'),h('text',{x:20,y:24,fill:'#fca5a5',fontSize:10,fontWeight:850,letterSpacing:1.4},'HYPERVELOCITY TEST // WHIPPLE SHIELD'),h('text',{x:520,y:95,textAnchor:'middle',fill:survives?'#4ade80':'#f87171',fontSize:13,fontWeight:900},survives?'DISPERSED':'WALL AT RISK'))),
            h('div', { className: 'iss-ops-grid' }, opsControl('iss-debris-size','Particle diameter',debrisSize,.2,12,.2,' mm','#f87171','opsDebrisSize'), opsControl('iss-debris-speed','Relative speed',debrisSpeed,7,15,.5,' km/s','#fbbf24','opsDebrisSpeed'), opsControl('iss-shield-gap','Shield standoff',shieldGap,2,20,1,' cm','#38bdf8','opsShieldGap'), statusBox('Impact energy',impactKj < 1 ? impactKj.toFixed(3)+' kJ' : impactKj.toFixed(1)+' kJ','Energy rises with the square of velocity.','#f87171'), statusBox('Shield capacity model',shieldCapacity.toFixed(1)+' kJ','Spacing lets the debris cloud spread.','#38bdf8'), statusBox('Engineering decision',survives?'BUMPER WORKS':debrisSize>=10?'TRACK + MANEUVER':'REDESIGN SHIELD','Large objects are avoided; small ones are armored against.',survives?'#4ade80':'#fbbf24')));
        }
        function renderHuman() {
          var exerciseProtection = opsClamp(exercise / 2.5 * 100,0,100);
          return h('div', null, renderSystemSchematic(systemById('body')), h('div',{className:'iss-ops-grid'},opsControl('iss-human-days','Mission duration',missionDays,30,900,30,' days','#e879f9','opsMissionDays'),opsControl('iss-human-exercise','Daily exercise',exercise,0,3,.25,' h','#4ade80','opsExercise'),statusBox('Modeled bone loss',boneLoss.toFixed(1)+'%','Simplified from ~1–1.5% per month without countermeasures.',boneLoss<5?'#4ade80':'#fbbf24'),statusBox('Radiation exposure',(missionDays*.7).toFixed(0)+' mSv','Uses a midrange 0.7 mSv/day estimate.','#f97316')),opsMeter('Exercise protection',exerciseProtection,'#4ade80','ARED, treadmill, and cycle loading'),opsSpark('Musculoskeletal resilience',opsClamp(100-boneLoss*5,0,100),'#e879f9',7));
        }
        function renderEmergency() {
          var scenarios = {
            leak: { name: 'Cabin pressure leak', telemetry: 'Pressure falling 0.7 kPa/min · acoustic sensor bearing 064°', title: 'PRESSURE ISOLATION', cueA: 'PRESSURE −0.7 kPa/min', cueB: 'SOURCE BEARING 064°', choices: [['Add oxygen','Oxygen masks the symptom and wastes supply.'],['Close the suspected module hatch','Correct: isolate volume, count crew, then locate the leak.'],['Open a window shutter','Shutters do not seal cabin leaks.']], correct: 1 },
            fire: { name: 'Rack smoke alarm', telemetry: 'Particulate alarm · rack current spike · cabin fan running', title: 'RACK FIRE RESPONSE', cueA: 'PARTICULATE ALARM', cueB: 'RACK CURRENT SPIKE', choices: [['Cut rack power and use the port fire extinguisher','Correct: remove ignition energy, suppress, then sample air.'],['Increase ventilation','That can spread smoke through the station.'],['Move into the rack','Electrical fire risk makes this unsafe.']], correct: 0 },
            cooling: { name: 'Ammonia cooling fault', telemetry: 'Loop pressure low · radiator outlet warming · lab loads high', title: 'EXTERNAL COOLING LOOP', cueA: 'LOOP PRESSURE LOW', cueB: 'OUTLET WARMING', choices: [['Raise all experiment power','That adds heat when rejection is failing.'],['Isolate the loop and shed noncritical loads','Correct: reduce heat while controllers isolate the leak.'],['Turn off cabin fans','Internal airflow is still required.']], correct: 1 },
            co2: { name: 'CO₂ pocket warning', telemetry: 'Crew headache · local airflow low · scrubber current normal', title: 'CABIN AIRFLOW PATH', cueA: 'LOCAL FLOW LOW', cueB: 'SCRUBBER CURRENT NORMAL', choices: [['Add oxygen','Oxygen does not remove CO₂.'],['Restore airflow and clear the inlet','Correct: the scrubber works only if cabin air reaches it.'],['Reduce water recovery','The water loop is not the cause.']], correct: 1 }
          };
          var sid = d.opsEmergency || 'leak', scenario = scenarios[sid] || scenarios.leak;
          var incidentState = !d.opsEmergencyResult ? 'active' : d.opsEmergencyCorrect ? 'contained' : 'hold';
          var stateLabel = incidentState === 'contained' ? 'CONTAINED' : incidentState === 'hold' ? 'HOLD // HAZARD ACTIVE' : 'ACTIVE INCIDENT';
          var stateColor = incidentState === 'contained' ? '#4ade80' : incidentState === 'hold' ? '#fbbf24' : '#f87171';
          function moduleBody(x, width, label) {
            return h('g', null,
              h('rect', { x: x, y: 67, width: width, height: 62, rx: 30, fill: '#273548', stroke: '#94a3b8', strokeWidth: 2 }),
              h('line', { x1: x + 27, y1: 69, x2: x + 27, y2: 127, stroke: '#64748b', strokeWidth: 4 }),
              h('line', { x1: x + width - 27, y1: 69, x2: x + width - 27, y2: 127, stroke: '#64748b', strokeWidth: 4 }),
              h('text', { x: x + width / 2, y: 102, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 8, fontWeight: 850 }, label));
          }
          function incidentArt() {
            if (sid === 'fire') return h('g', null,
              moduleBody(58, 524, 'PRESSURIZED LAB MODULE'),
              h('rect', { x: 252, y: 57, width: 136, height: 84, rx: 6, fill: incidentState === 'contained' ? '#183c31' : '#4a1f1f', stroke: incidentState === 'contained' ? '#4ade80' : '#f87171', strokeWidth: 2 }),
              h('text', { x: 320, y: 102, textAnchor: 'middle', fill: '#f8fafc', fontSize: 9, fontWeight: 900 }, incidentState === 'contained' ? 'RACK SAFE' : 'RACK ALARM'),
              [0,1,2].map(function (i) { return h('path', { key: i, d: 'M' + (286 + i * 28) + ' 60 Q' + (273 + i * 28) + ' 43 ' + (292 + i * 28) + ' 34', fill: 'none', stroke: incidentState === 'contained' ? '#64748b' : '#cbd5e1', strokeWidth: 3, opacity: incidentState === 'contained' ? .18 : .72 }); }),
              h('path', { d: incidentState === 'contained' ? 'M92 151 H238 M264 151 H548' : 'M92 151 H548', stroke: incidentState === 'contained' ? '#64748b' : '#fbbf24', strokeWidth: 4 }),
              incidentState === 'contained' ? h('text', { x: 251, y: 161, textAnchor: 'middle', fill: '#4ade80', fontSize: 7.5, fontWeight: 850 }, 'POWER OPEN') : h('text', { x: 320, y: 161, textAnchor: 'middle', fill: '#fde68a', fontSize: 7.5, fontWeight: 850 }, 'ENERGIZED BUS'));
            if (sid === 'cooling') return h('g', null,
              h('rect', { x: 54, y: 64, width: 140, height: 70, rx: 12, fill: incidentState === 'contained' ? '#263449' : '#54251c', stroke: '#fb923c', strokeWidth: 2 }),
              h('text', { x: 124, y: 95, textAnchor: 'middle', fill: '#fed7aa', fontSize: 9, fontWeight: 900 }, 'LAB HEAT LOAD'),
              h('text', { x: 124, y: 111, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 7.5 }, incidentState === 'contained' ? 'NONCRITICAL OFF' : 'LOADS HIGH'),
              h('circle', { cx: 306, cy: 99, r: 27, fill: '#172033', stroke: incidentState === 'contained' ? '#4ade80' : '#f87171', strokeWidth: 3 }),
              h('text', { x: 306, y: 102, textAnchor: 'middle', fill: '#f8fafc', fontSize: 7.5, fontWeight: 900 }, incidentState === 'contained' ? 'ISOLATED' : 'LOW P'),
              h('rect', { x: 472, y: 48, width: 92, height: 102, rx: 5, fill: '#273548', stroke: '#94a3b8', strokeWidth: 2 }),
              [0,1,2,3].map(function (i) { return h('line', { key: i, x1: 482 + i * 22, y1: 55, x2: 482 + i * 22, y2: 143, stroke: '#38bdf8', strokeWidth: 3, opacity: incidentState === 'contained' ? .82 : .36 }); }),
              h('path', { d: 'M194 79 H279 M333 79 H472', fill: 'none', stroke: incidentState === 'contained' ? '#64748b' : '#f97316', strokeWidth: 5, strokeDasharray: incidentState === 'contained' ? '8 5' : 'none' }),
              h('path', { d: 'M472 120 H333 M279 120 H194', fill: 'none', stroke: '#38bdf8', strokeWidth: 4, opacity: incidentState === 'contained' ? .8 : .42 }),
              h('text', { x: 518, y: 164, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 7.5, fontWeight: 850 }, 'RADIATOR'));
            if (sid === 'co2') return h('g', null,
              moduleBody(50, 540, 'CABIN AIR VOLUME'),
              h('g', { transform: 'translate(140,94)' }, h('circle', { cy: -11, r: 9, fill: '#e2e8f0' }), h('rect', { x: -9, y: 0, width: 18, height: 28, rx: 7, fill: '#94a3b8' })),
              [0,1,2,3].map(function (i) { return h('circle', { key: i, cx: 176 + (i % 2) * 16, cy: 76 + Math.floor(i / 2) * 18, r: incidentState === 'contained' ? 3 : 6, fill: '#a78bfa', opacity: incidentState === 'contained' ? .24 : .58 }); }),
              h('rect', { x: 315, y: 76, width: 62, height: 46, rx: 7, fill: incidentState === 'contained' ? '#164e63' : '#3f2733', stroke: incidentState === 'contained' ? '#67e8f9' : '#f87171', strokeWidth: 2 }),
              h('text', { x: 346, y: 103, textAnchor: 'middle', fill: '#f8fafc', fontSize: 8, fontWeight: 900 }, 'INLET'),
              h('rect', { x: 457, y: 65, width: 82, height: 68, rx: 8, fill: '#183c31', stroke: '#4ade80', strokeWidth: 2 }),
              h('text', { x: 498, y: 96, textAnchor: 'middle', fill: '#bbf7d0', fontSize: 8, fontWeight: 900 }, 'SCRUBBER'),
              h('text', { x: 498, y: 111, textAnchor: 'middle', fill: '#86efac', fontSize: 7 }, 'RUNNING'),
              h('path', { d: 'M205 99 H305 M387 99 H447', fill: 'none', stroke: incidentState === 'contained' ? '#4ade80' : '#fbbf24', strokeWidth: 4, strokeDasharray: incidentState === 'contained' ? 'none' : '5 6', markerEnd: 'url(#iss-emergency-flow-arrow)' }),
              incidentState === 'contained' ? null : h('path', { d: 'M326 82 L366 116 M366 82 L326 116', stroke: '#f87171', strokeWidth: 3 }));
            return h('g', null,
              moduleBody(45, 230, 'NODE A'), moduleBody(365, 210, 'SUSPECT VOLUME'),
              h('rect', { x: 294, y: 80, width: 52, height: 38, rx: 8, fill: incidentState === 'contained' ? '#14532d' : '#543619', stroke: incidentState === 'contained' ? '#4ade80' : '#fbbf24', strokeWidth: 2 }),
              h('text', { x: 320, y: 102, textAnchor: 'middle', fill: '#f8fafc', fontSize: 7.5, fontWeight: 900 }, incidentState === 'contained' ? 'CLOSED' : 'OPEN'),
              h('path', { d: 'M575 98 H620', stroke: incidentState === 'contained' ? '#64748b' : '#f87171', strokeWidth: 4, strokeDasharray: '6 5', markerEnd: 'url(#iss-emergency-flow-arrow)', opacity: incidentState === 'contained' ? .2 : .9 }),
              [0,1,2,3,4].map(function (i) { return h('circle', { key: i, cx: 400 + i * 32, cy: 84 + (i % 2) * 24, r: 3, fill: incidentState === 'contained' ? '#64748b' : '#7dd3fc', opacity: incidentState === 'contained' ? .22 : .72 }); }),
              h('text', { x: 594, y: 82, textAnchor: 'middle', fill: incidentState === 'contained' ? '#94a3b8' : '#fca5a5', fontSize: 7.5, fontWeight: 850 }, incidentState === 'contained' ? 'LEAK ISOLATED' : 'OUTFLOW'));
          }
          function renderIncidentVisual() {
            var aria = scenario.name + '. ' + scenario.telemetry + '. Response state: ' + stateLabel + '.';
            return h('div', { className: 'iss-learning-visual iss-emergency-visual', 'data-iss-emergency-visual': sid, 'data-iss-emergency-state': incidentState },
              h('svg', { viewBox: '0 0 640 220', role: 'img', 'aria-label': aria },
                h('defs', null,
                  h('linearGradient', { id: 'iss-emergency-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#020611' }), h('stop', { offset: '100%', stopColor: '#101827' })),
                  h('filter', { id: 'iss-emergency-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 5, result: 'eg' }), h('feMerge', null, h('feMergeNode', { in: 'eg' }), h('feMergeNode', { in: 'SourceGraphic' }))),
                  h('marker', { id: 'iss-emergency-flow-arrow', markerWidth: 7, markerHeight: 7, refX: 6, refY: 3.5, orient: 'auto' }, h('path', { d: 'M0 0 L7 3.5 L0 7 Z', fill: stateColor }))),
                h('rect', { width: 640, height: 220, fill: 'url(#iss-emergency-bg)' }),
                [[24,42],[93,29],[176,45],[259,24],[378,37],[469,20],[558,43],[618,27]].map(function (star, i) { return h('circle', { key: 'estar' + i, cx: star[0], cy: star[1], r: i % 3 ? .6 : 1, fill: '#cbd5e1', opacity: .45 }); }),
                incidentArt(),
                h('text', { x: 20, y: 23, fill: '#fca5a5', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'INCIDENT DISPLAY // ' + scenario.title),
                h('circle', { cx: 617, cy: 19, r: 5, fill: stateColor, filter: 'url(#iss-emergency-glow)' }),
                h('text', { x: 606, y: 23, textAnchor: 'end', fill: stateColor, fontSize: 8.5, fontWeight: 900 }, stateLabel),
                h('rect', { x: 14, y: 174, width: 612, height: 34, rx: 8, fill: 'rgba(2,6,23,.78)', stroke: 'rgba(248,113,113,.3)' }),
                h('text', { x: 26, y: 195, fill: '#fecaca', fontSize: 9, fontWeight: 850 }, scenario.cueA),
                h('text', { x: 330, y: 195, fill: '#cbd5e1', fontSize: 9, fontWeight: 850 }, scenario.cueB)),
              h('div', { className: 'iss-visual-caption' }, h('span', null, 'Schematic response geometry'), h('span', null, stateLabel)));
          }
          return h('div', null,
            h('div', { className: 'iss-emergency-grid', role: 'group', 'aria-label': 'Emergency scenario' }, Object.keys(scenarios).map(function (id) { var on = id === sid; return h('button', { key: id, type: 'button', 'aria-pressed': on, onClick: function () { upd({ opsEmergency: id, opsEmergencyResult: '', opsEmergencyCorrect: false }); }, style: { padding: 9, borderRadius: 9, border: '1px solid ' + (on ? '#f87171' : '#475569'), background: on ? 'rgba(239,68,68,.14)' : 'rgba(2,6,23,.35)', color: on ? '#fecaca' : TEXT, fontWeight: 800, cursor: 'pointer' } }, scenarios[id].name); })),
            renderIncidentVisual(),
            card('🚨 ' + scenario.name, h('div', null,
              h('div', { style: { padding: 9, marginBottom: 9, borderRadius: 9, background: 'rgba(239,68,68,.08)', borderLeft: '3px solid #ef4444', color: '#fecaca', font: '750 11px ui-monospace,monospace' } }, scenario.telemetry),
              h('div', { role: 'group', 'aria-label': 'Emergency actions', style: { display: 'grid', gap: 6 } }, scenario.choices.map(function (choice, i) { return h('button', { className: 'iss-emergency-choice', key: i, type: 'button', onClick: function () { var correct = i === scenario.correct; upd({ opsEmergencyResult: (correct ? 'PROCEDURE CORRECT // ' : 'PROCEDURE HOLD // ') + choice[1], opsEmergencyCorrect: correct }); announceToSR(choice[1]); }, style: { borderRadius: 9, border: '1px solid #475569', background: 'rgba(2,6,23,.38)', color: TEXT, fontWeight: 750, cursor: 'pointer' } }, choice[0]); })),
              d.opsEmergencyResult ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, borderLeft: '3px solid ' + (d.opsEmergencyCorrect ? '#22c55e' : '#fbbf24'), background: d.opsEmergencyCorrect ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.1)', color: TEXT, fontSize: 11.5 } }, d.opsEmergencyResult) : null), '#ef4444'));
        }
        function renderRendezvous() {
          var holds = [
            { range: '250 m', phase: 'NAV ACQUISITION', cue: 'Establish relative navigation', detail: 'Compare independent range and bearing sources, confirm communications, and verify the retreat attitude before entering the corridor.', checks: ['NAV AGREES', 'COMMS GO', 'RETREAT READY'] },
            { range: '100 m', phase: 'CORRIDOR ENTRY', cue: 'Stabilize the approach line', detail: 'Hold position while controllers confirm alignment, closing-rate trend, lighting, and an unobstructed path to the docking axis.', checks: ['AXIS ALIGNED', 'RATE STABLE', 'PATH CLEAR'] },
            { range: '30 m', phase: 'FINAL APPROACH', cue: 'Use small correction pulses', detail: 'Near the station, total relative motion matters more than forward speed alone. Correct lateral drift before continuing inward.', checks: ['LATERAL LOW', 'RATE TREND', 'ABORT OPEN'] },
            { range: '10 m', phase: 'CAPTURE SETUP', cue: 'Center, damp, then coast', detail: 'Align the docking mechanisms, damp rotation and sideways motion, and preserve a clean retreat path until soft capture.', checks: ['PORT CENTERED', 'MOTION DAMPED', 'CREW READY'] }
          ];
          var holdPositions = [[104, 124], [245, 101], [408, 104], [518, 103]];
          var holdIndex = Math.max(0, Math.min(holds.length - 1, Number(d.opsRendezvousHold || 0)));
          var hold = holds[holdIndex], capsule = holdPositions[holdIndex];
          return h('div', null,
            h('div', { className: 'iss-learning-visual iss-rendezvous-planner', 'data-iss-rendezvous-planner': holdIndex },
              h('svg', { viewBox: '0 0 640 236', role: 'img', 'aria-label': 'Rendezvous hold point ' + (holdIndex + 1) + ' of 4 at ' + hold.range + '. ' + hold.phase + '. Primary decision: ' + hold.cue + '. Checks: ' + hold.checks.join(', ') + '.' },
                h('defs', null,
                  h('linearGradient', { id: 'iss-rendezvous-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#020611' }), h('stop', { offset: '100%', stopColor: '#0a2037' })),
                  h('radialGradient', { id: 'iss-rendezvous-earth', cx: '48%', cy: '4%', r: '76%' }, h('stop', { offset: '0%', stopColor: '#6cc5ee' }), h('stop', { offset: '42%', stopColor: '#256da7' }), h('stop', { offset: '100%', stopColor: '#092d59' })),
                  h('filter', { id: 'iss-rendezvous-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' }))),
                  h('marker', { id: 'iss-rendezvous-abort-arrow', markerWidth: 7, markerHeight: 7, refX: 6, refY: 3.5, orient: 'auto' }, h('path', { d: 'M0 0 L7 3.5 L0 7 Z', fill: '#f87171' }))),
                h('rect', { width: 640, height: 236, fill: 'url(#iss-rendezvous-bg)' }),
                [[28,38],[76,66],[164,35],[218,58],[316,31],[370,62],[456,37],[550,53],[615,29]].map(function (star, i) { return h('circle', { key: 'rstar' + i, cx: star[0], cy: star[1], r: i % 3 ? .7 : 1.1, fill: i % 2 ? '#cbd5e1' : '#7dd3fc', opacity: .7 }); }),
                h('circle', { cx: 320, cy: 515, r: 352, fill: 'url(#iss-rendezvous-earth)', stroke: '#7dd3fc', strokeWidth: 3, opacity: .72 }),
                h('path', { d: 'M42 137 L590 80 L590 126 Z', fill: 'rgba(14,165,233,.075)', stroke: 'rgba(56,189,248,.26)', strokeWidth: 1 }),
                h('path', { d: 'M42 126 C176 126 224 92 340 101 S500 104 582 103', fill: 'none', stroke: '#38bdf8', strokeWidth: 2.4, strokeDasharray: '7 6' }),
                h('path', { d: 'M' + capsule[0] + ' ' + capsule[1] + ' L582 103', fill: 'none', stroke: '#e879f9', strokeWidth: 1.5, opacity: .65 }),
                h('path', { d: 'M' + capsule[0] + ' ' + capsule[1] + ' Q' + (capsule[0] - 35) + ' ' + (capsule[1] - 18) + ' ' + (capsule[0] - 68) + ' ' + (capsule[1] - 39), fill: 'none', stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '4 4', markerEnd: 'url(#iss-rendezvous-abort-arrow)' }),
                h('text', { x: Math.max(18, capsule[0] - 74), y: capsule[1] - 45, fill: '#fca5a5', fontSize: 7.5, fontWeight: 850 }, 'RETREAT VECTOR'),
                holdPositions.map(function (point, i) {
                  var selected = i === holdIndex, passed = i < holdIndex;
                  return h('g', { key: holds[i].range },
                    selected ? h('circle', { cx: point[0], cy: point[1], r: 15, fill: 'none', stroke: '#7dd3fc', strokeWidth: 1, opacity: .55, filter: 'url(#iss-rendezvous-glow)' }) : null,
                    h('circle', { cx: point[0], cy: point[1], r: selected ? 9 : 7, fill: selected ? '#0ea5e9' : passed ? '#164e63' : '#111d30', stroke: selected ? '#e0f2fe' : passed ? '#67e8f9' : '#64748b', strokeWidth: selected ? 2.5 : 1.7 }),
                    h('text', { x: point[0], y: 153, textAnchor: 'middle', fill: selected ? '#bae6fd' : '#94a3b8', fontSize: 8.5, fontWeight: selected ? 900 : 750 }, holds[i].range.toUpperCase()),
                    h('text', { x: point[0], y: 163, textAnchor: 'middle', fill: selected ? '#7dd3fc' : '#64748b', fontSize: 6.5, fontWeight: 800 }, i === 0 ? 'HOLD 1' : i === 1 ? 'HOLD 2' : i === 2 ? 'HOLD 3' : 'HOLD 4'));
                }),
                h('g', { transform: 'translate(' + capsule[0] + ',' + capsule[1] + ')', filter: 'url(#iss-rendezvous-glow)' }, h('path', { d: 'M9 0 L-6 -6 L-11 -4 L-11 4 L-6 6 Z', fill: '#f8fafc', stroke: '#7dd3fc', strokeWidth: 1 }), h('circle', { cx: 2, cy: 0, r: 2, fill: '#0ea5e9' })),
                h('g', { transform: 'translate(592,103)' }, h('rect', { x: -14, y: -11, width: 28, height: 22, rx: 7, fill: '#e2e8f0', stroke: '#f8fafc' }), h('rect', { x: -3, y: -48, width: 6, height: 96, fill: '#94a3b8' }), h('rect', { x: -14, y: -4, width: 4, height: 8, fill: '#67e8f9' })),
                h('text', { x: 20, y: 24, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'RENDEZVOUS FLIGHT-DIRECTOR BOARD'),
                h('text', { x: 620, y: 24, textAnchor: 'end', fill: '#cbd5e1', fontSize: 8.5, fontWeight: 850 }, 'HOLD ' + (holdIndex + 1) + ' / 4 // ' + hold.range.toUpperCase()),
                h('rect', { x: 14, y: 172, width: 612, height: 54, rx: 9, fill: 'rgba(2,6,23,.78)', stroke: 'rgba(125,211,252,.25)' }),
                h('text', { x: 26, y: 188, fill: '#7dd3fc', fontSize: 8, fontWeight: 850, letterSpacing: 1 }, hold.phase),
                h('text', { x: 26, y: 205, fill: '#f8fafc', fontSize: 11, fontWeight: 900 }, hold.cue.toUpperCase()),
                hold.checks.map(function (check, i) { return h('g', { key: check, transform: 'translate(' + (316 + i * 101) + ',194)' }, h('circle', { r: 5, fill: '#14532d', stroke: '#4ade80', strokeWidth: 1.4 }), h('text', { x: 10, y: 3, fill: '#bbf7d0', fontSize: 7, fontWeight: 850 }, check)); })),
              h('div', { className: 'iss-network-focus', role: 'group', 'aria-label': 'Inspect a rendezvous hold point' }, holds.map(function (item, i) { var on = i === holdIndex; return h('button', { key: item.range, type: 'button', 'data-iss-rendezvous-hold': i, 'aria-pressed': on, onClick: function () { upd({ opsRendezvousHold: i }); } }, item.range + ' · ' + item.phase.toLowerCase()); })),
              h('div', { className: 'iss-network-detail', role: 'status', 'aria-live': 'polite' }, h('strong', { style: { color: '#7dd3fc' } }, hold.phase + ': '), hold.detail),
              h('div', { className: 'iss-visual-caption' }, h('span', null, 'Selected hold drives the flight-rule checks'), h('span', null, 'Representative sequence · vehicle routes vary'))),
            card('Approach discipline', h('div', null,
              h('p', { style: { color: TEXT, fontSize: 12.5, lineHeight: 1.6 } }, 'Real vehicles pause at planned hold points so controllers can verify navigation, alignment, closing-rate trend, and vehicle health before proceeding. Exact ranges and rules depend on the vehicle and mission.'),
              h('div', { className: 'iss-ops-grid' }, statusBox('Soft-capture limit', '≤ 0.60 m/s', 'This simulator’s training envelope; actual vehicle limits vary.', '#4ade80'), statusBox('Abort corridor', 'Always open', 'A safe retreat path is part of every approach.', '#fbbf24')),
              h('button', { type: 'button', onClick: function () { upd({ tab: 'missions' }); }, style: { marginTop: 9, padding: '8px 13px', borderRadius: 9, border: '1px solid #38bdf8', background: 'rgba(56,189,248,.14)', color: '#bae6fd', fontWeight: 900, cursor: 'pointer' } }, '🚀 Open the docking simulator')), '#38bdf8'));
        }
        var content=mode==='power'?renderPower():mode==='eclss'?renderEclss():mode==='thermal'?renderThermal():mode==='attitude'?renderAttitude():mode==='debris'?renderDebris():mode==='human'?renderHuman():mode==='emergency'?renderEmergency():mode==='rendezvous'?renderRendezvous():renderIntegrated();
        return h('div',{'data-iss-operations':mode},
          h('div',{className:'iss-ops-hero'},h('div',null,h('div',{className:'iss-eyebrow'},h('span',{className:'iss-live-dot','aria-hidden':'true'}),'Mission operations sandbox'),h('h3',{style:{margin:'0 0 5px',color:TEXT,fontSize:20}},'Keep a city-sized spacecraft alive.'),h('p',{style:{margin:0,maxWidth:690,color:SOFT,fontSize:12,lineHeight:1.55}},'Change crew demand, orbital lighting, recovery efficiency, cooling, and risk controls. Every subsystem shares power, heat, mass, and operating margin.')),h('div',{className:'iss-ops-health',style:{color:healthColor},'aria-label':'Station health '+health+' percent'},health+'%')),
          renderScenarioPresets(),
          h('div',{className:'iss-ops-metrics',role:'list','aria-label':'Station flight rules'},flightRules.map(function(rule){return h('div',{key:rule.label,className:'iss-ops-metric',role:'listitem'},h('button',{type:'button','data-flight-rule':rule.mode,onClick:function(){setMode(rule.mode);},'aria-label':rule.label+' '+rule.value+'. Flight rule '+rule.rule+'. '+(rule.pass?'Go':'Attention')},h('span',{className:'iss-rule-heading'},h('span',{className:'iss-ops-metric-label'},rule.label),h('i',{className:'iss-rule-light'+(rule.pass?' is-go':' is-hold'),'aria-hidden':'true'})),h('strong',{className:'iss-ops-metric-value',style:{color:rule.color}},rule.value),h('small',null,'RULE '+rule.rule+' · '+(rule.pass?'GO':'CHECK'))));})),
          renderRuleStatus(),
          h('div',{className:'iss-ops-modes',role:'group','aria-label':'Operations simulation'},modes.map(function(m){var on=mode===m[0];return h('button',{className:'iss-ops-mode',key:m[0],type:'button','aria-pressed':on,onClick:function(){setMode(m[0]);},style:{borderRadius:9,border:'1px solid '+(on?'#38bdf8':'#334155'),background:on?'rgba(14,165,233,.18)':PANEL,color:on?'#bae6fd':TEXT,fontSize:10.5,fontWeight:850,cursor:'pointer'}},m[1]+' '+m[2]);})),content,
          h('div',{className:'iss-ops-debrief'},h('strong',{style:{color:'#7dd3fc',fontSize:11}},'FLIGHT DIRECTOR DEBRIEF'),h('p',{style:{margin:'5px 0 0',color:TEXT,fontSize:11.5,lineHeight:1.55}},health>=75?'All modeled systems retain useful margin. Now increase research load or crew size and find the boundary.':health>=50?'The station is operating with thin margin. Inspect the red or amber subsystem before the next orbit.':'Mission rule violation: one or more life-critical systems require immediate correction.'),(d.opsLog||[]).length?h('div',{className:'iss-ops-log',role:'log'},(d.opsLog||[]).map(function(entry,i){return h('div',{key:i},entry);})):null));
      }
      // ── Tabs ──
      // The 3-D station leads: it is the thing the tool is named after, it is
      // the surface that tells a student in one second what they are looking
      // at, and everything else in the tool is a way of going deeper into it.
      var TABS = [
        { id: 'map', icon: '🛰️', label: __alloT('stem.spacestation.tab_map', '3-D Station') },
        { id: 'interior', icon: '🧑‍🚀', label: __alloT('stem.spacestation.tab_interior', 'Inside: Crew Shift') },
        { id: 'operations', icon: '📡', label: __alloT('stem.spacestation.tab_operations', 'Mission Operations') },
        { id: 'day', icon: '👩‍🚀', label: __alloT('stem.spacestation.tab_day', 'A Day Aboard') },
        { id: 'systems', icon: '⚙️', label: __alloT('stem.spacestation.tab_systems', 'Systems & Challenges') },
        { id: 'orbit', icon: '🧮', label: __alloT('stem.spacestation.tab_orbit', 'Orbit Lab') },
        { id: 'missions', icon: '🎮', label: __alloT('stem.spacestation.tab_missions', 'Missions') },
        { id: 'history', icon: '📜', label: __alloT('stem.spacestation.tab_history', 'History & Future') },
        { id: 'quiz', icon: '🧠', label: __alloT('stem.spacestation.tab_quiz', 'Quiz') }
      ];
      var tab = d.tab || 'map';

      function renderModuleBlueprint(module) {
        var moduleColor = '#' + Number(module.color || 0x38bdf8).toString(16).padStart(6, '0');
        var isTruss = module.id === 'truss';
        var isCupola = module.id === 'cupola';
        return h('div', { className: 'iss-learning-visual iss-blueprint' },
          h('svg', { viewBox: '0 0 640 164', role: 'img', 'aria-label': 'Engineering silhouette of ' + module.name + '. Scene axis ' + module.axis + '. Relative envelope ' + module.size[1] + ' by ' + module.size[0] + ' scene units. Not to scale.' },
            h('defs', null, h('pattern', { id: 'iss-blueprint-grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, h('path', { d: 'M20 0H0V20', fill: 'none', stroke: '#38bdf8', strokeWidth: .5, opacity: .22 })), h('linearGradient', { id: 'iss-module-metal', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#f8fafc' }), h('stop', { offset: '52%', stopColor: moduleColor }), h('stop', { offset: '100%', stopColor: '#475569' }))),
            h('rect', { width: 640, height: 164, fill: '#06101e' }), h('rect', { width: 640, height: 164, fill: 'url(#iss-blueprint-grid)' }),
            h('text', { x: 20, y: 23, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.5 }, 'MODULE BLUEPRINT // ' + module.id.toUpperCase()),
            isTruss ? h('g', null,
              h('rect', { x: 105, y: 72, width: 430, height: 9, rx: 4, fill: '#94a3b8' }),
              [135,205,275,345,415,485].map(function (x, i) { return h('g', { key: i }, h('line', { x1: x, y1: 55, x2: x + 40, y2: 98, stroke: '#cbd5e1', strokeWidth: 2 }), h('line', { x1: x + 40, y1: 55, x2: x, y2: 98, stroke: '#64748b', strokeWidth: 2 })); }),
              [135,225,415,505].map(function (x, i) { return h('rect', { key: 'a' + i, x: x - 24, y: i % 2 ? 103 : 35, width: 48, height: 22, rx: 2, fill: '#a86e16', stroke: '#fbbf24' }); })) :
            isCupola ? h('g', null,
              h('path', { d: 'M255 106 Q265 42 320 38 Q375 42 385 106 Z', fill: 'url(#iss-module-metal)', stroke: '#bae6fd', strokeWidth: 2 }),
              [-42,-21,0,21,42].map(function (dx, i) { return h('circle', { key: i, cx: 320 + dx, cy: 78 - Math.abs(dx) * .25, r: i === 2 ? 11 : 7, fill: '#12324c', stroke: '#7dd3fc' }); }),
              h('rect', { x: 252, y: 106, width: 136, height: 13, rx: 5, fill: '#94a3b8' })) :
            h('g', null,
              h('rect', { x: 176, y: 57, width: 288, height: 58, rx: 28, fill: 'url(#iss-module-metal)', stroke: '#e2e8f0', strokeWidth: 2 }),
              h('line', { x1: 205, y1: 58, x2: 205, y2: 114, stroke: '#64748b', strokeWidth: 5 }), h('line', { x1: 435, y1: 58, x2: 435, y2: 114, stroke: '#64748b', strokeWidth: 5 }),
              [250,285,320,355,390].map(function (x, i) { return h('circle', { key: i, cx: x, cy: 78, r: 4, fill: '#7dd3fc', stroke: '#e0f2fe', strokeWidth: 1 }); }),
              h('circle', { cx: 176, cy: 86, r: 16, fill: '#263449', stroke: '#cbd5e1', strokeWidth: 3 }), h('circle', { cx: 464, cy: 86, r: 16, fill: '#263449', stroke: '#cbd5e1', strokeWidth: 3 })),
            h('line', { x1: 100, y1: 132, x2: 540, y2: 132, stroke: moduleColor, strokeWidth: 1.3 }), h('line', { x1: 100, y1: 127, x2: 100, y2: 137, stroke: moduleColor }), h('line', { x1: 540, y1: 127, x2: 540, y2: 137, stroke: moduleColor }),
            h('text', { x: 320, y: 148, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8.5, fontWeight: 750, letterSpacing: .8 }, 'RELATIVE ENVELOPE ' + module.size[1] + ' × ' + module.size[0] + '  /  AXIS ' + module.axis.toUpperCase()),
            h('text', { x: 620, y: 23, textAnchor: 'end', fill: '#94a3b8', fontSize: 8.5 }, 'SCHEMATIC · NOT TO SCALE')),
          h('div', { className: 'iss-visual-caption' }, h('span', null, module.agency), h('span', null, module.launched)));
      }
      function renderMap() {
        return h('div', null,
          // The station comes FIRST on this tab — before instructions, before
          // any button. It is the landing view of the whole tool, so the first
          // thing on screen should be the thing itself.
          h('div', { className: 'iss-station-stage', style: { position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', background: '#050a18' } },
            h('canvas', {
              ref: function (cv) { if (cv) { cv._issWantSel = d.selModule; cv._issCutaway = !!d.mapCutaway; stationCanvasRef(cv); } },
              role: 'application', tabIndex: 0,
              'aria-label': __alloT('stem.spacestation.canvas_aria', 'Interactive 3-D model of the International Space Station, orbiting above a lit Earth with a Dragon spacecraft docked at Harmony and a Progress freighter at Zvezda’s aft port.'),
              'aria-describedby': 'iss-map-instructions iss-map-status iss-map-orientation',
              'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight + - Home',
              style: { width: '100%', height: 'clamp(320px, 52vw, 500px)', display: 'block' }
            }),
            h('div', { className: 'iss-stage-hud', 'aria-hidden': 'true' }, h('span', { className: 'iss-hud-chip' }, 'ISS // ORBITAL VIEW'), h('span', { className: 'iss-hud-chip iss-hud-selection' }, 'SELECTED // ' + selModule.name.split(' (')[0].toUpperCase()), h('span', { className: 'iss-hud-chip', 'data-iss-light-phase': 'true', 'data-phase': 'sunlight' }, '☀ SUNLIGHT'), h('span', { className: 'iss-hud-chip' }, 'ALT ' + orbitAlt + ' KM  /  V ' + orbitV.toFixed(2) + ' KM/S')),
            h('div', { className: 'iss-module-marker', 'data-iss-module-marker': 'true', 'aria-hidden': 'true' }, h('i', null), h('span', null, selModule.name.split(' (')[0].toUpperCase())),
            h('svg', { className: 'iss-orientation-widget', 'data-iss-orientation-widget': 'true', viewBox: '0 0 96 96', 'aria-hidden': 'true' },
              h('circle', { cx: 42, cy: 42, r: 27, fill: 'rgba(2,6,23,.55)', stroke: 'rgba(148,163,184,.28)' }),
              h('line', { 'data-iss-axis': 'x', x1: 42, y1: 42, x2: 67, y2: 42, stroke: '#f87171', strokeWidth: 2.2 }),
              h('line', { 'data-iss-axis': 'y', x1: 42, y1: 42, x2: 42, y2: 17, stroke: '#4ade80', strokeWidth: 2.2 }),
              h('line', { 'data-iss-axis': 'z', x1: 42, y1: 42, x2: 57, y2: 62, stroke: '#38bdf8', strokeWidth: 2.2 }),
              h('circle', { cx: 42, cy: 42, r: 3, fill: '#e2e8f0' }),
              h('text', { x: 4, y: 80, fill: '#fca5a5', fontSize: 7, fontWeight: 850 }, 'X P/S'), h('text', { x: 35, y: 80, fill: '#86efac', fontSize: 7, fontWeight: 850 }, 'Y Z/N'), h('text', { x: 66, y: 80, fill: '#7dd3fc', fontSize: 7, fontWeight: 850 }, 'Z A/F')),
            h('div', { className: 'iss-stage-help', 'aria-hidden': 'true' }, 'Drag or arrow keys to orbit  /  + − to zoom'),
            h('span', { id: 'iss-map-status', className: 'iss-sr-only', role: 'status', 'aria-live': 'polite' }, 'Selected module ' + selModule.name + '. Camera view ' + (d.mapView || 'overview') + '.'),
            h('span', { id: 'iss-map-orientation', className: 'iss-sr-only' }, 'Orientation triad: X is port to starboard, Y is zenith to nadir, and Z is aft to forward.')
          ),
          h('div', { className: 'iss-map-controls', role: 'group', 'aria-label': '3D station view controls' },
            [['overview','◉ Overview'],['truss','↔ Truss'],['labs','⚗ Labs'],['russian','★ Russian segment'],['nadir','🌍 Earth-facing']].map(function (view) { var on = (d.mapView || 'overview') === view[0]; return h('button', { key: view[0], type: 'button', 'data-iss-camera-view': view[0], 'aria-pressed': on, onClick: function () { upd({ mapView: view[0] }); var cv = document.querySelector('.iss-station-stage canvas'); if (cv && cv._issSetView) cv._issSetView(view[0]); } }, view[1]); }),
            h('button', { type: 'button', 'data-iss-focus-module': d.selModule, onClick: function () { var cv = document.querySelector('.iss-station-stage canvas'); if (cv && cv._issFocusModule) cv._issFocusModule(d.selModule); announceToSR('Camera centered on ' + selModule.name + '.'); } }, '◎ Center ' + selModule.name.split(' (')[0]),
            h('button', { type: 'button', 'data-iss-cutaway': 'true', 'aria-pressed': !!d.mapCutaway, onClick: function () { upd({ mapCutaway: !d.mapCutaway }); } }, d.mapCutaway ? '◫ Cutaway ON' : '▣ Isolate selected module')),
          h('p', { id: 'iss-map-instructions', style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '10px 0' } },
            __alloT('stem.spacestation.map_intro', 'A schematic (not to scale) 3-D map of the real station, with a Dragon docked at Harmony and a Progress freighter on Zvezda’s aft port. Drag or use the arrow keys to rotate, plus and minus to zoom, and Home to return to the overview. The module buttons provide an equivalent non-canvas inspection path.')),
          h('p', { style: { fontSize: 11.5, color: SOFT, lineHeight: 1.55, margin: '0 0 10px', paddingLeft: 9, borderLeft: '2px solid rgba(148,163,184,.35)' } },
            __alloT('stem.spacestation.earth_note', 'About the planet below: the coastlines are real, drawn from the public-domain Natural Earth dataset, and the city lights sit at the real coordinates of major metropolitan areas. The surface colouring, sea ice and cloud bands are schematic — a picture of where deserts, storm tracks and ice tend to be, not measured data. The station is drawn hanging above the globe rather than at a real point on its path; for where it actually flies, open Orbit Lab and look at the ground track.')),
          h('button', { type: 'button', onClick: function () { upd({ tab: 'interior', interiorRoom: d.interiorRoom || 'harmony' }); }, style: { margin: '0 0 10px', padding: '7px 12px', borderRadius: 9, border: '1px solid #38bdf8', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, '🚪 Open the hatch — explore inside'),
          h('div', { className: 'iss-module-picker', role: 'group', 'aria-label': 'Station modules', style: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' } },
            MODULES.map(function (m) {
              var on = m.id === d.selModule;
              return h('button', {
                key: m.id, type: 'button', 'aria-pressed': on,
                onClick: function () { upd({ selModule: m.id }); markSeen('seenModules', m.id); announceToSR(m.name + ' selected. Details shown below the map.'); },
                style: { padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(56,189,248,0.2)' : PANEL, color: on ? '#7dd3fc' : TEXT, border: '1px solid ' + (on ? '#38bdf8' : '#334155') }
              }, m.name.split(' (')[0]);
            })),
          card(selModule.name,
            h('div', null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: SOFT, marginBottom: 8 } },
                h('span', null, selModule.agency), h('span', null, '🚀 ' + selModule.launched)),
              renderModuleBlueprint(selModule),
              h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 8px' } }, selModule.role),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', fontSize: 12, color: TEXT, lineHeight: 1.55, marginBottom: 6 } },
                h('strong', { style: { color: '#7dd3fc' } }, __alloT('stem.spacestation.fact', 'Worth knowing: ')), selModule.fact),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fbbf24' } }, __alloT('stem.spacestation.eng', 'Engineering spotlight: ')), selModule.eng)
            ), '#38bdf8'),
          selModule.id === 'cupola' ? renderCupolaInterior() : null,
          selModule.id === 'harmony' ? renderSleepInterior() : null,
          card(__alloT('stem.spacestation.fast_facts', '📊 Fast facts'),
            h('div', { className: 'iss-fact-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 } },
              FAST_FACTS.map(function (f, i) {
                return h('div', { className: 'iss-fact-item', key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 10, color: SOFT, textTransform: 'uppercase', letterSpacing: 0.4 } }, f[0]),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: TEXT, marginTop: 2 } }, f[1]));
              })), '#818cf8')
        );
      }

      function renderCrewDayTimeline(slot, index) {
        function minuteOf(time) { var parts = String(time).split(':'); return Number(parts[0]) * 60 + Number(parts[1] || 0); }
        var selectedMinute = minuteOf(slot.h);
        var selectedX = 40 + selectedMinute / 1440 * 560;
        var labelX = Math.max(112, Math.min(528, selectedX));
        var phases = [
          { start: 0, end: 360, label: 'SLEEP', color: '#4338ca' },
          { start: 360, end: 450, label: 'PREP', color: '#0ea5e9' },
          { start: 450, end: 1080, label: 'WORK + EXERCISE', color: '#059669' },
          { start: 1080, end: 1290, label: 'MEALS + CREW TIME', color: '#c026d3' },
          { start: 1290, end: 1440, label: 'SLEEP', color: '#4338ca' }
        ];
        var allocations = [
          { id: 'sleep', minutes: 510, label: 'Sleep', short: 'SLEEP 8.5h', color: '#4338ca' },
          { id: 'prep', minutes: 90, label: 'Preparation', short: '1.5h', color: '#0ea5e9' },
          { id: 'work', minutes: 630, label: 'Work and exercise', short: 'WORK + EX 10.5h', color: '#059669' },
          { id: 'crew', minutes: 210, label: 'Meals and crew time', short: 'CREW 3.5h', color: '#c026d3' }
        ];
        var selectedAllocation = selectedMinute < 360 || selectedMinute >= 1290 ? allocations[0] : selectedMinute < 450 ? allocations[1] : selectedMinute < 1080 ? allocations[2] : allocations[3];
        return h('div', { className: 'iss-crew-day-timeline', 'data-iss-crew-day-timeline': slot.h, 'data-iss-day-allocation': selectedAllocation.id },
          h('svg', { viewBox: '0 0 640 138', role: 'img', 'aria-label': 'Twenty-four hour GMT crew timeline. Selected event ' + slot.label + ' at ' + slot.h + '. Daily allocation: 8.5 hours sleep, 1.5 hours preparation, 10.5 hours work and exercise, and 3.5 hours meals and crew time. The selected event is in the ' + selectedAllocation.label.toLowerCase() + ' block.' },
            h('text', { x: 20, y: 16, fill: '#94a3b8', fontSize: 8.5, fontWeight: 850, letterSpacing: 1.2 }, '24-HOUR CREW TIMELINE // GMT'),
            phases.map(function (phase, phaseIndex) {
              var x = 40 + phase.start / 1440 * 560, width = (phase.end - phase.start) / 1440 * 560;
              var isSleep = phase.label === 'SLEEP';
              return h('g', { key: phaseIndex },
                h('rect', { x: x, y: 31, width: width, height: 24, rx: 3, fill: phase.color, opacity: .68 }),
                // Glass sheen on the upper half + a shaded base: enough relief to
                // read the band as a solid block rather than a flat swatch.
                h('rect', { x: x, y: 31, width: width, height: 10, rx: 3, fill: '#ffffff', opacity: .12 }),
                h('rect', { x: x, y: 50, width: width, height: 5, fill: '#020617', opacity: .18 }),
                // The two sleep blocks get a few stars — scheduled sleep is the
                // only part of the GMT day the crew is meant to be in the dark.
                isSleep ? h('g', { opacity: .6 }, [0, 1, 2].map(function (s) {
                  var starX = x + (width * (0.24 + s * 0.26));
                  return starX < x + width - 4 ? h('circle', { key: 's' + s, cx: starX, cy: 37 + (s % 2) * 9, r: .9, fill: '#e0e7ff' }) : null;
                })) : null,
                width > 58 ? h('text', { x: x + width / 2, y: 46, textAnchor: 'middle', fill: '#f8fafc', fontSize: 7.5, fontWeight: 850 }, phase.label) : null);
            }),
            DAY_SCHEDULE.map(function (event, eventIndex) { var eventX = 40 + minuteOf(event.h) / 1440 * 560; var selected = eventIndex === index; return h('g', { key: eventIndex, opacity: selected ? 1 : .68 }, h('line', { x1: eventX, y1: 55, x2: eventX, y2: selected ? 72 : 64, stroke: selected ? '#fbbf24' : '#cbd5e1', strokeWidth: selected ? 2 : 1 }), h('circle', { cx: eventX, cy: 55, r: selected ? 4.5 : 2.5, fill: selected ? '#fbbf24' : '#e2e8f0', stroke: '#07101d', strokeWidth: 1 })); }),
            [0,360,720,1080,1440].map(function (minute, tickIndex) { var x = 40 + minute / 1440 * 560; return h('g', { key: tickIndex }, h('line', { x1: x, y1: 73, x2: x, y2: 78, stroke: '#64748b' }), h('text', { x: x, y: 91, textAnchor: tickIndex === 0 ? 'start' : tickIndex === 4 ? 'end' : 'middle', fill: '#94a3b8', fontSize: 8 }, tickIndex === 4 ? '24:00' : String(Math.floor(minute / 60)).padStart(2, '0') + ':00')); }),
            h('text', { x: 20, y: 106, fill: '#94a3b8', fontSize: 7.5, fontWeight: 850, letterSpacing: 1 }, '24H ALLOCATION'),
            allocations.map(function (allocation, allocationIndex) {
              var priorMinutes = allocations.slice(0, allocationIndex).reduce(function (sum, item) { return sum + item.minutes; }, 0);
              var x = 40 + priorMinutes / 1440 * 560, width = allocation.minutes / 1440 * 560;
              var selected = allocation.id === selectedAllocation.id;
              return h('g', { key: allocation.id },
                h('rect', { x: x, y: 111, width: width, height: 14, rx: allocationIndex === 0 || allocationIndex === allocations.length - 1 ? 4 : 0, fill: allocation.color, opacity: selected ? .95 : .58, stroke: selected ? '#f8fafc' : 'none', strokeWidth: selected ? 1.5 : 0 }),
                h('text', { x: x + width / 2, y: 121, textAnchor: 'middle', fill: '#f8fafc', fontSize: 7.2, fontWeight: selected ? 900 : 750 }, allocation.short));
            }),
            h('g', { className: 'iss-day-timeline-marker' }, h('line', { x1: selectedX, y1: 21, x2: selectedX, y2: 73, stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '3 3' }), h('rect', { x: labelX - 72, y: 2, width: 144, height: 18, rx: 8, fill: '#2b1d0d', stroke: '#fbbf24' }), h('text', { x: labelX, y: 14, textAnchor: 'middle', fill: '#fef3c7', fontSize: 8.5, fontWeight: 850 }, slot.h + '  ' + slot.label.toUpperCase()))));
      }
      function renderDayOrbitVisual(slot, index) {
        function minuteOfDay(time) { var parts = String(time).split(':'); return Number(parts[0]) * 60 + Number(parts[1] || 0); }
        var selectedMinute = minuteOfDay(slot.h);
        var referencePeriod = 92.65;
        var sunlightMinutes = 57;
        var phaseMinute = selectedMinute % referencePeriod;
        var sunlightFraction = sunlightMinutes / referencePeriod;
        var orbitFraction = phaseMinute / referencePeriod;
        var inSunlight = phaseMinute < sunlightMinutes;
        var orbitNumber = Math.min(16, Math.floor(selectedMinute / referencePeriod) + 1);
        var minutesToTransition = inSunlight ? sunlightMinutes - phaseMinute : referencePeriod - phaseMinute;
        var eclipseHalfAngle = Math.PI * (1 - sunlightFraction);
        var eclipseEntryAngle = Math.PI - eclipseHalfAngle;
        var phase = eclipseEntryAngle - Math.PI * 2 * sunlightFraction + orbitFraction * Math.PI * 2;
        var sx = 320 + Math.cos(phase) * 226, sy = 94 + Math.sin(phase) * 56;
        var phaseLabel = inSunlight ? 'SUNLIGHT' : 'ECLIPSE';
        var transitionLabel = (inSunlight ? 'ECLIPSE IN ' : 'SUNRISE IN ') + Math.max(1, Math.round(minutesToTransition)) + ' MIN';
        function orbitArcPath(fromFraction, toFraction) {
          var points = [];
          for (var p = 0; p <= 28; p++) {
            var f = fromFraction + (toFraction - fromFraction) * p / 28;
            var a = eclipseEntryAngle - Math.PI * 2 * sunlightFraction + f * Math.PI * 2;
            points.push((p ? 'L' : 'M') + (320 + Math.cos(a) * 226).toFixed(1) + ' ' + (94 + Math.sin(a) * 56).toFixed(1));
          }
          return points.join(' ');
        }
        return h('div', { className: 'iss-learning-visual iss-day-orbit', 'data-iss-day-light-phase': inSunlight ? 'sunlight' : 'eclipse' },
          h('svg', { viewBox: '0 0 640 150', role: 'img', 'aria-label': 'Orbital day-cycle display for ' + slot.h + ', ' + slot.label + '. Reference orbit ' + orbitNumber + ' of 16 is in ' + phaseLabel.toLowerCase() + ', with the next transition in about ' + Math.max(1, Math.round(minutesToTransition)) + ' minutes.' },
            h('defs', null, h('linearGradient', { id: 'iss-day-bg', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#030712' }), h('stop', { offset: '49%', stopColor: '#091a31' }), h('stop', { offset: '100%', stopColor: '#2b1d0d' })), h('radialGradient', { id: 'iss-day-earth', cx: '38%', cy: '28%' }, h('stop', { offset: '0%', stopColor: '#67c8ff' }), h('stop', { offset: '100%', stopColor: '#0b3567' }))),
            h('rect', { width: 640, height: 150, fill: 'url(#iss-day-bg)' }),
            h('text', { x: 20, y: 12, fill: '#94a3b8', fontSize: 8, fontWeight: 850, letterSpacing: 1.1 }, 'ORBIT-CYCLE RIBBON // 24 H GMT'),
            Array.from({ length: 16 }).map(function (_, i) { var x = 32 + i * 36; var selected = i + 1 === orbitNumber; return h('g', { key: i }, h('rect', { x: x, y: 18, width: 34 * sunlightFraction, height: 5, rx: 2, fill: '#fbbf24', opacity: selected ? .95 : .42 }), h('rect', { x: x + 34 * sunlightFraction, y: 18, width: 34 * (1 - sunlightFraction), height: 5, rx: 2, fill: '#6366f1', opacity: selected ? .95 : .42 }), selected ? h('rect', { x: x - 2, y: 15, width: 38, height: 11, rx: 4, fill: 'none', stroke: '#f8fafc', strokeWidth: 1.3 }) : null); }),
            h('circle', { cx: 602, cy: 57, r: 17, fill: '#fbbf24', opacity: .95 }), h('circle', { cx: 602, cy: 57, r: 27, fill: '#fbbf24', opacity: .1 }),
            h('ellipse', { cx: 320, cy: 94, rx: 226, ry: 56, fill: 'none', stroke: '#334155', strokeWidth: 1.2, opacity: .8 }),
            h('path', { d: orbitArcPath(0, sunlightFraction), fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5 }),
            h('path', { d: orbitArcPath(sunlightFraction, 1), fill: 'none', stroke: '#818cf8', strokeWidth: 2.5 }),
            h('circle', { cx: 320, cy: 131, r: 63, fill: 'url(#iss-day-earth)', stroke: '#7dd3fc', strokeWidth: 1.4 }),
            h('path', { d: 'M320 68 A63 63 0 0 0 320 194 Z', fill: '#020617', opacity: .66 }),
            h('g', { className: 'iss-day-marker', transform: 'translate(' + sx.toFixed(1) + ',' + sy.toFixed(1) + ')' }, h('rect', { x: -18, y: -4, width: 36, height: 8, rx: 4, fill: '#e2e8f0' }), h('rect', { x: -31, y: -7, width: 11, height: 14, fill: '#c58a20', stroke: '#fbbf24' }), h('rect', { x: 20, y: -7, width: 11, height: 14, fill: '#c58a20', stroke: '#fbbf24' }), h('circle', { r: 3, fill: '#38bdf8' })),
            h('text', { x: 20, y: 50, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'CREW DAY // GMT ' + slot.h),
            h('text', { x: 20, y: 67, fill: '#f8fafc', fontSize: 12, fontWeight: 900 }, slot.label.toUpperCase()),
            h('text', { x: 620, y: 137, textAnchor: 'end', fill: inSunlight ? '#fde68a' : '#c7d2fe', fontSize: 8.5, fontWeight: 850 }, 'ORBIT ' + orbitNumber + ' / 16 // ' + phaseLabel + ' // ' + transitionLabel)),
          renderCrewDayTimeline(slot, index),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'The clock, not sunlight, organizes crew life.'), h('span', null, 'ORBIT ' + orbitNumber + ' / 16 · ' + phaseLabel + ' · ' + transitionLabel)));
      }      function renderDay() {
        var idx = Math.max(0, Math.min(DAY_SCHEDULE.length - 1, d.dayIdx || 0));
        var slot = DAY_SCHEDULE[idx];
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.day_intro', 'The station runs on GMT — a compromise between Houston and Moscow. Step through a typical workday. Every line has a WHY: nothing aboard is done a certain way by accident.')),
          renderDayOrbitVisual(slot, idx),
          h('div', { className: 'iss-day-strip', role: 'group', 'aria-label': 'Daily schedule', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
            DAY_SCHEDULE.map(function (s2, i) {
              var on = i === idx;
              return h('button', {
                className: 'iss-day-chip', key: i, type: 'button', 'data-iss-day-slot': i, 'aria-pressed': on,
                onClick: function () { upd({ dayIdx: i }); markSeen('seenHours', String(i)); },
                style: { padding: '6px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(232,121,249,0.18)' : PANEL, color: on ? '#f0abfc' : TEXT, border: '1px solid ' + (on ? '#e879f9' : '#334155') }
              }, s2.icon + ' ' + s2.h);
            })),
          card(slot.icon + ' ' + slot.h + ' — ' + slot.label,
            h('div', null,
              h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 8px' } }, slot.what),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(232,121,249,0.08)', borderLeft: '3px solid #e879f9', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#f0abfc' } }, __alloT('stem.spacestation.why', 'Why: ')), slot.why),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
                h('button', { type: 'button', disabled: idx === 0, onClick: function () { upd({ dayIdx: idx - 1 }); }, style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontWeight: 700, fontSize: 12, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.5 : 1 } }, '← ' + __alloT('stem.spacestation.earlier', 'Earlier')),
                h('button', { type: 'button', disabled: idx === DAY_SCHEDULE.length - 1, onClick: function () { upd({ dayIdx: idx + 1 }); markSeen('seenHours', String(idx + 1)); }, style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontWeight: 700, fontSize: 12, cursor: idx === DAY_SCHEDULE.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === DAY_SCHEDULE.length - 1 ? 0.5 : 1 } }, __alloT('stem.spacestation.later', 'Later') + ' →'))
            ), '#e879f9'),
          card(__alloT('stem.spacestation.day_notes', '🌍 The strangest parts of normal life'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 12.5, color: TEXT, lineHeight: 1.8 } },
              h('li', null, __alloT('stem.spacestation.note_sunrise', '16 sunrises and sunsets every day — crews use clocks and window shades, not the sky, to know when to sleep.')),
              h('li', null, __alloT('stem.spacestation.note_taste', 'Food tastes bland aboard: fluid shifts stuff up sinuses like a permanent head cold, so hot sauce and shrimp cocktail are prized.')),
              h('li', null, __alloT('stem.spacestation.note_height', 'Spines stretch without gravity — astronauts return up to ~3 cm taller (temporarily, and often with backaches).')),
              h('li', null, __alloT('stem.spacestation.note_laundry', 'There is no laundry. Clothes are worn for days, then packed into cargo ships that burn up on reentry as shooting stars.'))
            ), '#22d3ee')
        );
      }

      function renderSystemCoupling(sys) {
        var coupling = {
          water: { upstream: ['CREW MOISTURE', 'ELECTRIC POWER'], downstream: ['AIR LOOP', 'CREW SUPPLY'], note: 'Recovered water feeds both people and oxygen generation.' },
          air: { upstream: ['WATER LOOP', 'ELECTRIC POWER'], downstream: ['CREW CABIN', 'THERMAL LOAD'], note: 'Cabin air depends on water processing, power, fans, and heat removal.' },
          power: { upstream: ['SUNLIGHT', 'SOLAR ARRAYS'], downstream: ['LIFE SUPPORT', 'SCIENCE LOADS'], note: 'Every major station function becomes a managed electrical load.' },
          thermal: { upstream: ['CABIN HEAT', 'PUMP POWER'], downstream: ['RADIATORS', 'STABLE LABS'], note: 'Heat moves through linked fluid loops before radiating to space.' },
          attitude: { upstream: ['STAR SENSORS', 'ELECTRIC POWER'], downstream: ['SUN TRACKING', 'EARTH COMMS'], note: 'Orientation couples arrays, radiators, antennas, and visiting vehicles.' },
          debris: { upstream: ['GROUND RADAR', 'ORBIT DATA'], downstream: ['MANEUVER PLAN', 'HULL SHIELDS'], note: 'Tracking handles large threats; layered structure handles small ones.' },
          comms: { upstream: ['ELECTRIC POWER', 'ANTENNA POINTING'], downstream: ['GROUND CONTROL', 'SCIENCE DATA'], note: 'Pointing an antenna at a relay satellite depends on knowing the station’s orientation, so attitude control and talking to the ground are the same problem.' },
          body: { upstream: ['AIR + WATER', 'EXERCISE LOAD'], downstream: ['CREW HEALTH', 'MISSION DATA'], note: 'Life support sustains the crew; crew measurements refine future missions.' }
        }[sys.id];
        var aria = sys.name + ' coupling map. Inputs: ' + coupling.upstream.join(' and ') + '. Outputs: ' + coupling.downstream.join(' and ') + '. ' + coupling.note;
        function endpoint(x, y, label, side, index) {
          return h('g', { key: side + index },
            h('rect', { x: x, y: y, width: 126, height: 30, rx: 8, fill: '#101c2e', stroke: side === 'in' ? '#64748b' : sys.color, strokeWidth: 1.1 }),
            h('circle', { cx: side === 'in' ? x + 13 : x + 113, cy: y + 15, r: 3.5, fill: side === 'in' ? '#94a3b8' : sys.color }),
            h('text', { x: side === 'in' ? x + 23 : x + 103, y: y + 19, textAnchor: side === 'in' ? 'start' : 'end', fill: '#dbeafe', fontSize: 8.2, fontWeight: 850, letterSpacing: .45 }, label));
        }
        return h('div', { className: 'iss-learning-visual iss-system-coupling', 'data-iss-system-coupling': sys.id },
          h('svg', { viewBox: '0 0 640 156', role: 'img', 'aria-label': aria },
            h('defs', null,
              h('linearGradient', { id: 'iss-coupling-bg-' + sys.id, x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#050b18' }), h('stop', { offset: '100%', stopColor: '#0b1d31' })),
              h('filter', { id: 'iss-coupling-glow-' + sys.id, x: '-40%', y: '-40%', width: '180%', height: '180%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { width: 640, height: 156, fill: 'url(#iss-coupling-bg-' + sys.id + ')' }),
            h('path', { d: 'M0 31 H640 M0 132 H640', stroke: '#334155', strokeWidth: 1, opacity: .55 }),
            h('text', { x: 22, y: 20, fill: '#94a3b8', fontSize: 8.5, fontWeight: 850, letterSpacing: 1.35 }, 'STATION COUPLING // INPUTS → FUNCTION → OUTPUTS'),
            h('text', { x: 618, y: 20, textAnchor: 'end', fill: sys.color, fontSize: 8.5, fontWeight: 900 }, sys.id.toUpperCase() + ' LINKED'),
            h('path', { className: 'iss-coupling-pipe', d: 'M158 62 C205 62 202 78 251 78 M158 108 C205 108 202 88 251 88 M389 78 C438 78 435 62 482 62 M389 88 C438 88 435 108 482 108', fill: 'none', stroke: sys.color, strokeWidth: 2, opacity: .68 }),
            endpoint(32, 47, coupling.upstream[0], 'in', 0),
            endpoint(32, 93, coupling.upstream[1], 'in', 1),
            h('g', { transform: 'translate(251,50)' },
              h('rect', { width: 138, height: 66, rx: 16, fill: sys.color + '20', stroke: sys.color, strokeWidth: 2.4, filter: 'url(#iss-coupling-glow-' + sys.id + ')' }),
              h('circle', { cx: 69, cy: 20, r: 7, fill: sys.color }),
              h('text', { x: 69, y: 23.5, textAnchor: 'middle', fill: '#04121f', fontSize: 10, fontWeight: 950 }, '∞'),
              h('text', { x: 69, y: 42, textAnchor: 'middle', fill: '#f8fafc', fontSize: 10.5, fontWeight: 900, letterSpacing: .5 }, sys.name.toUpperCase()),
              h('text', { x: 69, y: 56, textAnchor: 'middle', fill: sys.color, fontSize: 7.5, fontWeight: 850, letterSpacing: 1 }, 'SYSTEM OF SYSTEMS')),
            endpoint(482, 47, coupling.downstream[0], 'out', 0),
            endpoint(482, 93, coupling.downstream[1], 'out', 1),
            h('text', { x: 22, y: 146, fill: '#94a3b8', fontSize: 8 }, coupling.note)),
          h('div', { className: 'iss-visual-caption' }, h('span', null, coupling.note), h('span', null, 'DEPENDENCIES STAY COUPLED')));
      }
      function renderSystemSchematic(sys) {
        var flows = {
          water: { nodes: [['CREW', 'humidity + waste'], ['COLLECT', 'condense + distill'], ['PROCESS', 'filter + test'], ['RETURN', 'clean water']], loop: true, caption: 'Mass circles back through the cabin instead of launching again.' },
          air: { nodes: [['WATER', 'recycled supply'], ['SPLIT', 'electrolysis'], ['CREW', 'O₂ in / CO₂ out'], ['RECOVER', 'scrub + Sabatier']], loop: true, caption: 'Electricity closes part of the oxygen-water loop.' },
          power: { nodes: [['SUN', 'radiant energy'], ['ARRAYS', 'direct current'], ['BATTERIES', 'store for eclipse'], ['LOADS', 'labs + life support']], loop: false, caption: 'Generation and storage must survive sixteen daily eclipses.' },
          thermal: { nodes: [['CABIN', 'collect heat'], ['WATER', 'internal loop'], ['AMMONIA', 'external loop'], ['RADIATORS', 'infrared to space']], loop: false, caption: 'In vacuum, the final heat-transfer step must be radiation.' },
          attitude: { nodes: [['SENSORS', 'measure pose'], ['COMPUTER', 'calculate torque'], ['CMGs', 'exchange momentum'], ['STATION', 'hold orientation']], loop: true, caption: 'A feedback loop continually senses, corrects, and verifies.' },
          debris: { nodes: [['TRACK', 'ground radar'], ['ASSESS', 'predict miss distance'], ['MANEUVER', 'burn if needed'], ['SHIELD', 'stop small debris']], loop: false, caption: 'Risk is managed differently depending on particle size.' },
          comms: { nodes: [['STATION', 'transmit upward'], ['RELAY', 'geostationary satellite'], ['TERMINAL', 'New Mexico dish'], ['CONTROL', 'Houston']], loop: false, caption: 'Up 35,800 km and back down — the long way round to a room in Texas' },
          body: { nodes: [['MICRO-G', 'remove loading'], ['CHANGE', 'bone + muscle loss'], ['COUNTER', 'exercise + diet'], ['MEASURE', 'adapt the plan']], loop: true, caption: 'Each astronaut is both crew member and longitudinal study.' }
        };
        var flow = flows[sys.id] || flows.water;
        var selectedStep = Math.max(0, Math.min(flow.nodes.length, Number(d.sysStep || 0)));
        var markerId = 'iss-flow-arrow-' + sys.id;
        var glowId = 'iss-flow-glow-' + sys.id;
        return h('div', { className: 'iss-learning-visual iss-system-visual' },
          h('svg', { viewBox: '0 0 640 178', role: 'img', 'aria-label': sys.name + ' process diagram. ' + flow.nodes.map(function (node) { return node[0] + ': ' + node[1]; }).join('. ') + (selectedStep ? ' Focused stage ' + selectedStep + ': ' + flow.nodes[selectedStep - 1][0] + ', ' + flow.nodes[selectedStep - 1][1] + '.' : '') },
            h('defs', null,
              h('marker', { id: markerId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: sys.color })),
              h('filter', { id: glowId, x: '-30%', y: '-30%', width: '160%', height: '160%' }, h('feGaussianBlur', { stdDeviation: 3, result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { width: 640, height: 178, fill: '#050b18' }),
            [44, 118, 201, 292, 387, 492, 573].map(function (x, i) { return h('circle', { key: 'star' + i, cx: x, cy: 22 + (i % 3) * 9, r: i % 2 ? 1 : 1.4, fill: i % 3 ? '#64748b' : '#bae6fd', opacity: .7 }); }),
            h('text', { x: 24, y: 25, fill: sys.color, fontSize: 10, fontWeight: 800, letterSpacing: 1.4 }, 'SYSTEM FLOW // ' + sys.id.toUpperCase()),
            h('path', { className: 'iss-flow-path', d: 'M 88 84 H 552', fill: 'none', stroke: sys.color, strokeWidth: 2.5, opacity: selectedStep ? .3 : .8, markerEnd: 'url(#' + markerId + ')' }),
            flow.loop ? h('path', { className: 'iss-flow-path', d: 'M 552 111 C 552 156, 88 156, 88 111', fill: 'none', stroke: sys.color, strokeWidth: 1.5, opacity: .42, markerEnd: 'url(#' + markerId + ')' }) : null,
            flow.nodes.map(function (node, i) {
              var x = 28 + i * 155;
              var stageFocused = selectedStep === i + 1;
              return h('g', { key: node[0], opacity: !selectedStep || stageFocused ? 1 : .28, transform: 'translate(' + x + ',52)' },
                h('rect', { x: 0, y: 0, width: 118, height: 63, rx: 11, fill: stageFocused ? sys.color + '28' : '#111d30', stroke: sys.color, strokeWidth: stageFocused ? 2.8 : i === 0 || i === 3 ? 1.8 : 1, opacity: .98 }),
                h('circle', { cx: 14, cy: 14, r: 7, fill: sys.color, filter: 'url(#' + glowId + ')' }),
                h('text', { x: 14, y: 17, textAnchor: 'middle', fill: '#04121f', fontSize: 8, fontWeight: 900 }, String(i + 1)),
                h('text', { x: 12, y: 38, fill: '#f8fafc', fontSize: 10.5, fontWeight: 850, letterSpacing: .5 }, node[0]),
                h('text', { x: 12, y: 53, fill: '#94a3b8', fontSize: 8.5 }, node[1]));
            }),
            flow.loop ? h('text', { x: 320, y: 166, textAnchor: 'middle', fill: sys.color, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.2 }, 'FEEDBACK / RECOVERY LOOP') : h('text', { x: 320, y: 154, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1 }, 'ENERGY AND MASS MOVE ONE WAY THROUGH THIS VIEW')),
          h('div', { className: 'iss-system-steps', role: 'group', 'aria-label': 'Inspect ' + sys.name + ' process stages' }, [{ label: 'All stages', step: 0 }].concat(flow.nodes.map(function (node, nodeIndex) { return { label: (nodeIndex + 1) + ' ' + node[0], step: nodeIndex + 1 }; })).map(function (item) { var on = selectedStep === item.step; return h('button', { key: item.step, type: 'button', 'data-iss-system-step': item.step, 'aria-pressed': on, onClick: function () { upd({ sysStep: item.step }); } }, item.label); })),
          h('div', { className: 'iss-visual-caption' }, h('span', null, selectedStep ? flow.nodes[selectedStep - 1][0] + ': ' + flow.nodes[selectedStep - 1][1] : flow.caption), h('span', null, selectedStep ? 'STAGE ' + selectedStep + ' / ' + flow.nodes.length : 'SELECTED: ' + sys.name.toUpperCase())));
      }

      function renderOrbitVisual() {
        var altitudeScale = (orbitAlt - 200) / 1800;
        var orbitRx = 194 + altitudeScale * 46;
        var orbitRy = 73 + altitudeScale * 24;
        var referenceAlt = 420;
        var referenceScale = (referenceAlt - 200) / 1800;
        var referenceRx = 194 + referenceScale * 46;
        var referenceRy = 73 + referenceScale * 24;
        // Same single orbit implementation as everything else — this block used
        // to re-derive v and T from its own copies of GM and Earth's radius.
        var _refOrbit = issOrbit(referenceAlt);
        var referenceR = _refOrbit.r;
        var referenceV = _refOrbit.v;
        var referenceT = _refOrbit.minutes;
        var speedDelta = orbitV - referenceV;
        var periodDelta = orbitT - referenceT;
        var atReference = orbitAlt === referenceAlt;
        var comparisonText = atReference ? 'ISS REFERENCE // 420 KM' : 'VS 420 KM // DELTA V ' + (speedDelta >= 0 ? '+' : '') + speedDelta.toFixed(2) + ' KM/S // DELTA T ' + (periodDelta >= 0 ? '+' : '') + periodDelta.toFixed(1) + ' MIN';
        var theta = -0.58;
        var stationX = 320 + Math.cos(theta) * orbitRx;
        var stationY = 140 + Math.sin(theta) * orbitRy;
        return h('div', { className: 'iss-learning-visual iss-orbit-visual' },
          h('svg', { viewBox: '0 0 640 245', role: 'img', 'aria-label': 'Orbit diagram at ' + orbitAlt + ' kilometers altitude, moving ' + orbitV.toFixed(2) + ' kilometers per second with a period of ' + orbitT.toFixed(1) + ' minutes. ' + comparisonText.toLowerCase() + '.' },
            h('defs', null,
              h('radialGradient', { id: 'iss-orbit-earth', cx: '35%', cy: '28%' }, h('stop', { offset: '0%', stopColor: '#67c8ff' }), h('stop', { offset: '52%', stopColor: '#1863a0' }), h('stop', { offset: '100%', stopColor: '#071c3b' })),
              h('linearGradient', { id: 'iss-orbit-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#050914' }), h('stop', { offset: '100%', stopColor: '#08182c' })),
              h('marker', { id: 'iss-velocity-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 L10 5 L0 10z', fill: '#4ade80' }))),
            h('rect', { width: 640, height: 245, fill: 'url(#iss-orbit-bg)' }),
            [[42,33,1],[113,61,1.4],[184,26,.8],[264,48,1.2],[381,28,1],[463,57,.7],[544,25,1.4],[601,71,.9]].map(function (s, i) { return h('circle', { key: i, cx: s[0], cy: s[1], r: s[2], fill: i % 3 ? '#94a3b8' : '#e0f2fe' }); }),
            !atReference ? h('ellipse', { cx: 320, cy: 140, rx: referenceRx, ry: referenceRy, fill: 'none', stroke: '#94a3b8', strokeWidth: 1.2, opacity: .5, strokeDasharray: '5 5' }) : null,
            h('ellipse', { cx: 320, cy: 140, rx: orbitRx, ry: orbitRy, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.4, opacity: .9 }),
            h('ellipse', { cx: 320, cy: 140, rx: orbitRx + 7, ry: orbitRy + 3, fill: 'none', stroke: '#38bdf8', strokeWidth: .7, opacity: .2 }),
            h('circle', { cx: 320, cy: 158, r: 74, fill: '#38bdf8', opacity: .13 }),
            h('circle', { cx: 320, cy: 158, r: 68, fill: 'url(#iss-orbit-earth)', stroke: '#7dd3fc', strokeWidth: 1.4 }),
            h('path', { d: 'M279 138 Q296 113 322 123 T365 130 Q351 145 332 143 T294 161 Z', fill: '#56a071', opacity: .74 }),
            h('path', { d: 'M342 170 Q365 154 382 169 Q369 191 346 198 Q336 185 342 170 Z', fill: '#4d8f68', opacity: .65 }),
            h('path', { d: 'M274 168 Q303 183 330 179', fill: 'none', stroke: '#dff6ff', strokeWidth: 6, opacity: .34 }),
            h('g', { className: 'iss-orbit-station', transform: 'translate(' + stationX.toFixed(1) + ',' + stationY.toFixed(1) + ') rotate(-18)' },
              h('rect', { x: -29, y: -2, width: 58, height: 4, rx: 2, fill: '#cbd5e1' }),
              h('rect', { x: -18, y: -8, width: 36, height: 16, rx: 7, fill: '#e2e8f0', stroke: '#fff' }),
              h('rect', { x: -45, y: -10, width: 14, height: 20, rx: 2, fill: '#c58a20', stroke: '#fbbf24' }),
              h('rect', { x: 31, y: -10, width: 14, height: 20, rx: 2, fill: '#c58a20', stroke: '#fbbf24' }),
              h('circle', { cx: 0, cy: 0, r: 3, fill: '#38bdf8' })),
            h('line', { x1: stationX + 6, y1: stationY - 10, x2: stationX + 77, y2: stationY - 29, stroke: '#4ade80', strokeWidth: 2.5, markerEnd: 'url(#iss-velocity-arrow)' }),
            h('text', { x: stationX + 44, y: stationY - 35, textAnchor: 'middle', fill: '#86efac', fontSize: 9, fontWeight: 850 }, orbitV.toFixed(2) + ' km/s'),
            h('line', { x1: 320, y1: 84, x2: 320, y2: 37, stroke: '#fbbf24', strokeWidth: 1.4, strokeDasharray: '3 3' }),
            h('text', { x: 330, y: 48, fill: '#fde68a', fontSize: 10, fontWeight: 800 }, orbitAlt + ' km'),
            h('text', { x: 22, y: 28, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.5 }, 'ORBITAL PROFILE // LIVE MODEL'),
            h('g', { transform: 'translate(472,18)' }, h('line', { x1: 0, y1: 4, x2: 23, y2: 4, stroke: '#38bdf8', strokeWidth: 2.4 }), h('text', { x: 29, y: 7, fill: '#cbd5e1', fontSize: 8 }, 'CURRENT'), h('line', { x1: 0, y1: 17, x2: 23, y2: 17, stroke: '#94a3b8', strokeWidth: 1.2, strokeDasharray: '5 4' }), h('text', { x: 29, y: 20, fill: '#94a3b8', fontSize: 8 }, 'ISS REF 420 KM')),
            h('text', { x: 22, y: 224, fill: atReference ? '#bae6fd' : '#cbd5e1', fontSize: 8.5, fontWeight: 800 }, comparisonText),
            h('text', { x: 618, y: 224, textAnchor: 'end', fill: '#94a3b8', fontSize: 8.5 }, 'Diagram exaggerates altitude for learning')),
          h('div', { className: 'iss-visual-caption' }, h('span', null, atReference ? 'Current design matches the ISS reference orbit.' : 'Solid current orbit compared with dashed 420 km ISS reference.'), h('span', null, orbitT.toFixed(1) + ' MIN / ORBIT')));
      }
      function renderOrbitEnvironmentBand() {
        var markerX = 44 + ((orbitAlt - 200) / 1800) * 552;
        var regime = orbitAlt < 300 ? 'SEVERE DRAG'
          : orbitAlt <= 500 ? 'CREWED LEO / ISS BAND'
          : orbitAlt <= 1000 ? 'LOWER DRAG'
          : 'RADIATION EXPOSURE RISES';
        return h('div', { className: 'iss-orbit-environment', 'data-iss-orbit-environment': regime },
          h('svg', { viewBox: '0 0 640 142', role: 'img', 'aria-label': 'Altitude environment scale from 200 to 2000 kilometers. Current altitude ' + orbitAlt + ' kilometers is in the ' + regime.toLowerCase() + ' region.' },
            h('defs', null,
              h('linearGradient', { id: 'iss-altitude-band', x1: '0', y1: '0', x2: '1', y2: '0' },
                h('stop', { offset: '0%', stopColor: '#ef4444' }), h('stop', { offset: '7%', stopColor: '#f59e0b' }), h('stop', { offset: '18%', stopColor: '#22c55e' }), h('stop', { offset: '48%', stopColor: '#38bdf8' }), h('stop', { offset: '100%', stopColor: '#818cf8' })),
              h('filter', { id: 'iss-altitude-glow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'b' }), h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('text', { x: 44, y: 20, fill: '#7dd3fc', fontSize: 9.5, fontWeight: 850, letterSpacing: 1.3 }, 'ALTITUDE ENVIRONMENT // ENGINEERING TRADE SPACE'),
            h('rect', { x: 44, y: 55, width: 552, height: 24, rx: 12, fill: 'url(#iss-altitude-band)', opacity: .72 }),
            [[44,'200'],[75,'300'],[136,'500'],[289,'1000'],[596,'2000 km']].map(function (tickInfo, i) { return h('g', { key: i }, h('line', { x1: tickInfo[0], y1: 80, x2: tickInfo[0], y2: 89, stroke: '#cbd5e1', strokeWidth: 1 }), h('text', { x: tickInfo[0], y: 102, textAnchor: i === 0 ? 'start' : i === 4 ? 'end' : 'middle', fill: '#94a3b8', fontSize: 8.5 }, tickInfo[1])); }),
            h('text', { x: 58, y: 49, fill: '#fecaca', fontSize: 8, fontWeight: 850 }, 'DRAG'),
            h('text', { x: 105, y: 49, textAnchor: 'middle', fill: '#fde68a', fontSize: 8, fontWeight: 850 }, 'ISS'),
            h('text', { x: 211, y: 49, textAnchor: 'middle', fill: '#bae6fd', fontSize: 8, fontWeight: 850 }, 'LOW DRAG'),
            h('text', { x: 444, y: 49, textAnchor: 'middle', fill: '#ddd6fe', fontSize: 8, fontWeight: 850 }, 'RADIATION RISES'),
            h('line', { x1: markerX, y1: 34, x2: markerX, y2: 83, stroke: '#f8fafc', strokeWidth: 2.2, filter: 'url(#iss-altitude-glow)' }),
            h('path', { d: 'M ' + (markerX - 6).toFixed(1) + ' 34 L ' + (markerX + 6).toFixed(1) + ' 34 L ' + markerX.toFixed(1) + ' 44 Z', fill: '#f8fafc' }),
            h('text', { x: markerX, y: 121, textAnchor: markerX > 525 ? 'end' : markerX < 115 ? 'start' : 'middle', fill: '#e0f2fe', fontSize: 10, fontWeight: 900 }, orbitAlt + ' KM // ' + regime)),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'Altitude trades launch capacity and drag against radiation exposure.'), h('span', null, 'CURRENT BAND: ' + regime)));
      }
      function renderDragReboostVisual() {
        var solarModes = {
          low: { label: 'QUIET THERMOSPHERE', factor: .6 },
          nominal: { label: 'NOMINAL SOLAR ACTIVITY', factor: 1 },
          high: { label: 'SOLAR-ACTIVE ATMOSPHERE', factor: 1.8 }
        };
        var solarId = solarModes[d.orbitSolar] ? d.orbitSolar : 'nominal';
        var solar = solarModes[solarId];
        var reboostDay = [0, 10, 20].indexOf(Number(d.orbitReboostDay)) >= 0 ? Number(d.orbitReboostDay) : 20;
        var reboostGain = reboostDay > 0 ? 5 : 0;
        var samples = [{ day: 0, altitude: orbitAlt }];
        var currentAltitude = orbitAlt;
        function dailyDrag(altitude) {
          // Training approximation anchored to 75 m/day at 420 km. Density,
          // attitude, area, and solar activity make real decay highly variable.
          return Math.min(6, .075 * Math.exp((420 - altitude) / 60) * solar.factor);
        }
        var initialDrag = dailyDrag(currentAltitude);
        for (var dragDay = 1; dragDay <= 30; dragDay++) {
          if (dragDay === reboostDay) currentAltitude += reboostGain;
          currentAltitude = Math.max(120, currentAltitude - dailyDrag(currentAltitude));
          samples.push({ day: dragDay, altitude: currentAltitude });
        }
        var endAltitude = samples[samples.length - 1].altitude;
        var netChange = endAltitude - orbitAlt;
        var floorReached = endAltitude <= 120.01;
        var trajectoryState = floorReached ? 'MODEL FLOOR REACHED' : endAltitude < 200 ? 'RAPID DECAY REGION' : reboostDay > 0 && netChange >= 0 ? 'REBOOST OFFSETS DRAG' : Math.abs(netChange) < 5 ? 'MANAGEABLE TREND' : 'ALTITUDE TREND DOWN';
        var stateColor = floorReached || endAltitude < 200 ? '#f87171' : netChange < -5 ? '#fbbf24' : '#4ade80';
        var maxAltitude = Math.max.apply(null, samples.map(function (sample) { return sample.altitude; }).concat([orbitAlt + 2]));
        var minAltitude = Math.min.apply(null, samples.map(function (sample) { return sample.altitude; }).concat([orbitAlt - 2]));
        var yMax = Math.ceil(maxAltitude + 3), yMin = Math.floor(minAltitude - 3);
        if (yMax - yMin < 10) { yMax += 5; yMin -= 5; }
        var plotLeft = 48, plotRight = 606, plotTop = 42, plotBottom = 172;
        function plotX(day) { return plotLeft + day / 30 * (plotRight - plotLeft); }
        function plotY(altitude) { return plotTop + (yMax - altitude) / (yMax - yMin) * (plotBottom - plotTop); }
        var path = samples.map(function (sample, i) { return (i ? 'L' : 'M') + plotX(sample.day).toFixed(1) + ' ' + plotY(sample.altitude).toFixed(1); }).join(' ');
        var areaPath = path + ' L' + plotRight + ' ' + plotBottom + ' L' + plotLeft + ' ' + plotBottom + ' Z';
        var thresholdVisible = yMin <= 200 && yMax >= 200;
        var thresholdY = plotY(200);
        var plannedLabel = reboostDay > 0 ? 'DAY ' + reboostDay + ' // +' + reboostGain + ' KM' : 'NO REBOOST';
        var rateMeters = initialDrag * 1000;
        var rateLabel = rateMeters < 1 ? '<1' : rateMeters.toFixed(rateMeters < 10 ? 1 : 0);
        var aria = 'Thirty day simplified altitude model. Start ' + orbitAlt + ' kilometers. ' + solar.label.toLowerCase() + '. ' + plannedLabel.toLowerCase() + '. End altitude ' + endAltitude.toFixed(1) + ' kilometers, net change ' + (netChange >= 0 ? 'plus ' : 'minus ') + Math.abs(netChange).toFixed(1) + ' kilometers. ' + trajectoryState.toLowerCase() + '.';
        return h('div', { className: 'iss-learning-visual iss-drag-reboost-visual', 'data-iss-drag-model': solarId, 'data-iss-reboost-day': reboostDay },
          h('svg', { viewBox: '0 0 640 218', role: 'img', 'aria-label': aria },
            h('defs', null,
              h('linearGradient', { id: 'iss-drag-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#03101f' }), h('stop', { offset: '100%', stopColor: '#0a1b31' })),
              h('linearGradient', { id: 'iss-drag-area', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#38bdf8', stopOpacity: .34 }), h('stop', { offset: '100%', stopColor: '#38bdf8', stopOpacity: .02 })),
              h('filter', { id: 'iss-drag-glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'dg' }), h('feMerge', null, h('feMergeNode', { in: 'dg' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { width: 640, height: 218, fill: 'url(#iss-drag-bg)' }),
            [0,.5,1].map(function (fraction, i) { var y = plotTop + fraction * (plotBottom - plotTop); var altitude = yMax - fraction * (yMax - yMin); return h('g', { key: i }, h('line', { x1: plotLeft, y1: y, x2: plotRight, y2: y, stroke: '#334155', strokeWidth: 1 }), h('text', { x: 41, y: y + 3, textAnchor: 'end', fill: '#94a3b8', fontSize: 7.5 }, altitude.toFixed(0))); }),
            thresholdVisible ? h('g', null, h('line', { x1: plotLeft, y1: thresholdY, x2: plotRight, y2: thresholdY, stroke: '#f87171', strokeWidth: 1.2, strokeDasharray: '5 4' }), h('text', { x: plotRight, y: thresholdY - 5, textAnchor: 'end', fill: '#fca5a5', fontSize: 7.5, fontWeight: 850 }, '200 KM // RAPID DECAY')) : null,
            h('path', { d: areaPath, fill: 'url(#iss-drag-area)' }),
            h('path', { d: path, fill: 'none', stroke: stateColor, strokeWidth: 2.8, strokeLinejoin: 'round', filter: 'url(#iss-drag-glow)' }),
            reboostDay > 0 ? h('g', null,
              h('line', { x1: plotX(reboostDay), y1: plotTop, x2: plotX(reboostDay), y2: plotBottom, stroke: '#e879f9', strokeWidth: 1.4, strokeDasharray: '4 4' }),
              h('path', { d: 'M' + (plotX(reboostDay) - 5) + ' ' + (plotTop + 8) + ' L' + (plotX(reboostDay) + 5) + ' ' + (plotTop + 8) + ' L' + plotX(reboostDay) + ' ' + plotTop + ' Z', fill: '#e879f9' }),
              h('text', { x: plotX(reboostDay), y: plotTop + 19, textAnchor: 'middle', fill: '#f0abfc', fontSize: 7.5, fontWeight: 850 }, 'REBOOST +' + reboostGain + ' KM')) : null,
            h('circle', { cx: plotLeft, cy: plotY(orbitAlt), r: 4, fill: '#7dd3fc', stroke: '#e0f2fe', strokeWidth: 1 }),
            h('circle', { cx: plotRight, cy: plotY(endAltitude), r: 5, fill: stateColor, stroke: '#f8fafc', strokeWidth: 1.2 }),
            h('text', { x: plotLeft + 6, y: plotY(orbitAlt) - 7, fill: '#bae6fd', fontSize: 8, fontWeight: 850 }, 'START ' + orbitAlt.toFixed(0) + ' KM'),
            h('text', { x: plotRight - 5, y: plotY(endAltitude) - 8, textAnchor: 'end', fill: stateColor, fontSize: 8.5, fontWeight: 900 }, 'DAY 30 // ' + endAltitude.toFixed(1) + ' KM'),
            [0,10,20,30].map(function (day) { return h('g', { key: day }, h('line', { x1: plotX(day), y1: plotBottom, x2: plotX(day), y2: plotBottom + 5, stroke: '#64748b' }), h('text', { x: plotX(day), y: 189, textAnchor: day === 0 ? 'start' : day === 30 ? 'end' : 'middle', fill: '#94a3b8', fontSize: 7.5 }, 'DAY ' + day)); }),
            h('text', { x: 20, y: 23, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'DRAG + REBOOST // 30-DAY TRAINING MODEL'),
            h('text', { x: 620, y: 23, textAnchor: 'end', fill: stateColor, fontSize: 8.5, fontWeight: 900 }, trajectoryState),
            h('text', { x: 48, y: 207, fill: '#cbd5e1', fontSize: 8.5, fontWeight: 800 }, solar.label + ' // INITIAL DECAY ' + rateLabel + ' M/DAY'),
            h('text', { x: 606, y: 207, textAnchor: 'end', fill: '#cbd5e1', fontSize: 8.5, fontWeight: 800 }, plannedLabel + ' // NET ' + (netChange >= 0 ? '+' : '−') + Math.abs(netChange).toFixed(1) + ' KM')),
          h('div', { className: 'iss-network-focus', role: 'group', 'aria-label': 'Select solar activity for the drag model' }, Object.keys(solarModes).map(function (id) { var on = id === solarId; return h('button', { key: id, type: 'button', 'data-iss-solar-mode': id, 'aria-pressed': on, onClick: function () { upd({ orbitSolar: id }); } }, solarModes[id].label.toLowerCase()); })),
          h('div', { className: 'iss-network-focus', role: 'group', 'aria-label': 'Select a reboost plan' }, [{ day: 0, label: 'No reboost' }, { day: 10, label: 'Reboost day 10' }, { day: 20, label: 'Reboost day 20' }].map(function (plan) { var on = plan.day === reboostDay; return h('button', { key: plan.day, type: 'button', 'data-iss-reboost-plan': plan.day, 'aria-pressed': on, onClick: function () { upd({ orbitReboostDay: plan.day }); } }, plan.label); })),
          h('div', { className: 'iss-network-detail', role: 'status', 'aria-live': 'polite' }, 'Initial modeled decay ' + rateLabel + ' m/day · Day-30 altitude ' + endAltitude.toFixed(1) + ' km · Net ' + (netChange >= 0 ? '+' : '−') + Math.abs(netChange).toFixed(1) + ' km.'),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'Anchored to 75 m/day at 420 km in nominal conditions'), h('span', null, 'Simplified density response · not a reentry forecast')));
      }
      function renderSystems() {
        var idx = Math.max(0, Math.min(SYSTEMS.length - 1, d.sysIdx || 0));
        var sys = SYSTEMS[idx];
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.sys_intro', 'The station is a closed-loop machine that must make its own air, recycle its own water, shed its own heat, and hold its own orientation — forever, with no hardware store. Each system below is an engineering-design case study (NGSS MS-ETS1).')),
          h('div', { className: 'iss-system-tabs', role: 'group', 'aria-label': 'Station systems', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
            SYSTEMS.map(function (s2, i) {
              var on = i === idx;
              return h('button', {
                className: 'iss-system-tab', key: s2.id, type: 'button', 'aria-pressed': on,
                onClick: function () { upd({ sysIdx: i, sysStep: 0 }); },
                style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: on ? s2.color + '22' : PANEL, color: on ? s2.color : TEXT, border: '1px solid ' + (on ? s2.color : '#334155') }
              }, s2.icon + ' ' + s2.name);
            })),
          renderSystemSchematic(sys),
          renderSystemCoupling(sys),
          card(sys.icon + ' ' + sys.name,
            h('div', null,
              h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 8px' } }, sys.how),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + sys.color, fontSize: 12, color: TEXT, lineHeight: 1.55, marginBottom: 6 } },
                h('strong', { style: { color: sys.color } }, __alloT('stem.spacestation.numbers', 'By the numbers: ')), sys.num),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fbbf24' } }, '🛠️ ' + __alloT('stem.spacestation.design_challenge', 'Design challenge: ')), sys.challenge)
            ), sys.color),
          aiOn ? card(__alloT('stem.spacestation.ask_mc', '🎧 Ask Mission Control'),
            h('div', { 'aria-busy': !!d.askLoading },
              h('textarea', {
                value: d.askInput || '', rows: 2, maxLength: 400,
                onChange: function (e) { upd({ askInput: String(e.target.value || '').slice(0, 400) }); },
                placeholder: __alloT('stem.spacestation.ask_ph', 'How do they fix a leak? What happens in a fire? Can you see the station from my town?'),
                'aria-label': 'Question for Mission Control', 'aria-describedby': 'iss-ask-count',
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: 'rgba(2,6,23,0.5)', color: TEXT, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }
              }),
              h('div', { id: 'iss-ask-count', 'aria-live': 'off', style: { marginTop: 3, color: SOFT, fontSize: 10.5, textAlign: 'right' } }, String((d.askInput || '').length) + ' / 400 characters'),
              h('button', {
                type: 'button', 'data-iss-ask-submit': 'true', disabled: !(d.askInput || '').trim(), 'aria-disabled': d.askLoading ? 'true' : undefined,
                onClick: function () { askMissionControl(d.askInput); },
                style: { marginTop: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: d.askLoading ? '#475569' : '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 12, cursor: d.askLoading ? 'wait' : 'pointer' }
              }, d.askLoading ? __alloT('stem.spacestation.ask_wait', 'Standing by…') : __alloT('stem.spacestation.ask_go', '📡 Call Mission Control')),
              d.askAnswer ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(2,6,23,0.5)', border: '1px solid #334155', fontSize: 12.5, color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.askAnswer) : null
            ), '#0ea5e9') : null
        );
      }

      // ── Ground track ────────────────────────────────────────────────────
      // The Orbit Lab let students change altitude and nothing else, so the
      // second orbital parameter — the one that decides which of the world the
      // station ever flies over, and which launch sites can reach it — was a
      // single sentence in the History tab. The maths here is the real thing
      // for a circular orbit: latitude = asin(sin i · sin θ), longitude from
      // the ascending node = atan2(cos i · sin θ, cos θ), minus Earth's own
      // rotation during the orbit, which is what walks each pass westward.
      var LAUNCH_SITES = [
        { name: 'Kourou', country: 'French Guiana', lat: 5.2, lon: -52.8 },
        { name: 'Wenchang', country: 'China', lat: 19.6, lon: 110.9 },
        { name: 'Cape Canaveral', country: 'USA', lat: 28.5, lon: -80.6 },
        { name: 'Tanegashima', country: 'Japan', lat: 30.4, lon: 131.0 },
        { name: 'Baikonur', country: 'Kazakhstan', lat: 46.0, lon: 63.3 }
      ];
      var SIDEREAL_DAY_S = 86164;
      function groundTrackPoints(incDeg, periodMin, orbits) {
        var inc = incDeg * Math.PI / 180;
        var shiftPerOrbit = 360 * (periodMin * 60) / SIDEREAL_DAY_S;
        var pts = [];
        var steps = 180;
        for (var o = 0; o < orbits; o++) {
          for (var s = 0; s <= steps; s++) {
            var theta = (s / steps) * Math.PI * 2;
            var lat = Math.asin(Math.sin(inc) * Math.sin(theta)) * 180 / Math.PI;
            var lonNode = Math.atan2(Math.cos(inc) * Math.sin(theta), Math.cos(theta)) * 180 / Math.PI;
            var lon = lonNode - shiftPerOrbit * (o + s / steps) - 60;
            lon = ((lon + 180) % 360 + 360) % 360 - 180;
            pts.push([lon, lat, o]);
          }
        }
        return pts;
      }
      function renderGroundTrack() {
        var inc = orbitInc;
        var mapX = 20, mapY = 40, mapW = 600, mapH = 300;
        var cols = 180, rows = 90;
        var cellW = mapW / cols, cellH = mapH / rows;
        function px(lon) { return mapX + (lon + 180) / 360 * mapW; }
        function py(lat) { return mapY + (90 - lat) / 180 * mapH; }
        var bandTop = py(inc), bandBottom = py(-inc);
        // One polyline per orbit, split wherever the track crosses the date
        // line — a single path would draw a horizontal streak back across the
        // whole map at every wrap.
        var pts = groundTrackPoints(inc, orbitT, 3);
        var segments = [], current = [], lastLon = null, lastOrbit = 0;
        pts.forEach(function (p) {
          // Split at 90°, not 180°: a near-polar track swaps hemisphere the
          // instant it crosses the pole, and that jump is exactly 180°, so a
          // 180° test misses it and draws a straight line along the top of the
          // map as if the station flew west along the Arctic.
          if (lastLon != null && (Math.abs(p[0] - lastLon) > 90 || p[2] !== lastOrbit)) {
            if (current.length > 1) segments.push({ pts: current, orbit: lastOrbit });
            current = [];
          }
          current.push(px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1));
          lastLon = p[0]; lastOrbit = p[2];
        });
        if (current.length > 1) segments.push({ pts: current, orbit: lastOrbit });
        var landShare = issLandShareWithin(inc);
        var westShift = 360 * (orbitT * 60) / SIDEREAL_DAY_S;
        var blockedPads = LAUNCH_SITES.filter(function (s) { return inc < s.lat - 0.05; });
        return h('div', { className: 'iss-learning-visual', 'data-iss-ground-track': inc.toFixed(1) },
          h('svg', { viewBox: '0 0 640 372', role: 'img', 'aria-label': 'World map with the station ground track at ' + inc.toFixed(1) + ' degrees inclination. The track reaches ' + inc.toFixed(1) + ' degrees north and south, crossing ' + Math.round(landShare * 100) + ' percent of Earth’s land area. Each orbit shifts ' + westShift.toFixed(1) + ' degrees west. ' + (blockedPads.length ? blockedPads.map(function (s) { return s.name; }).join(' and ') + ' cannot reach this orbit directly; the other launch sites can.' : 'All five marked launch sites can reach this orbit directly.') },
            h('text', { x: 20, y: 20, fill: '#94a3b8', fontSize: 8.5, fontWeight: 850, letterSpacing: 1.2 }, 'GROUND TRACK // 3 CONSECUTIVE ORBITS'),
            h('text', { x: 620, y: 20, textAnchor: 'end', fill: '#7dd3fc', fontSize: 8.5, fontWeight: 850, letterSpacing: 1 }, 'INCLINATION ' + inc.toFixed(1) + '°'),
            h('rect', { x: mapX, y: mapY, width: mapW, height: mapH, rx: 4, fill: '#071b33' }),
            // Reachable band first, so the coastlines sit on top of it.
            h('rect', { x: mapX, y: bandTop, width: mapW, height: Math.max(0, bandBottom - bandTop), fill: '#38bdf8', opacity: .13 }),
            // ONE path, not 391 rects. Same pixels, but the rect version made
            // this the most expensive surface in the whole tool: axe took 59s
            // on this tab (3x the next worst), and React reconciled all 391
            // elements on every 0.1° step of the inclination slider.
            h('path', { d: issLandPath(cols, rows, mapX, mapY, cellW, cellH), fill: '#3f5e39', opacity: .95 }),
            h('line', { x1: mapX, y1: py(0), x2: mapX + mapW, y2: py(0), stroke: '#94a3b8', strokeWidth: .7, strokeDasharray: '4 4', opacity: .6 }),
            [inc, -inc].map(function (edge, i) {
              return h('line', { key: i, x1: mapX, y1: py(edge), x2: mapX + mapW, y2: py(edge), stroke: '#7dd3fc', strokeWidth: 1, strokeDasharray: '5 3', opacity: .85 });
            }),
            segments.map(function (seg, i) {
              return h('polyline', { key: i, points: seg.pts.join(' '), fill: 'none', stroke: seg.orbit === 0 ? '#fbbf24' : '#38bdf8', strokeWidth: seg.orbit === 0 ? 2 : 1.4, opacity: seg.orbit === 0 ? 1 : .55 - seg.orbit * 0.12, strokeLinecap: 'round' });
            }),
            // Reachability is carried by SHAPE as well as colour — a filled dot
            // versus a hollow ring struck through. Red/green alone is unreadable
            // for the commonest colour vision deficiency, and axe cannot catch
            // that because both colours pass contrast against the map.
            LAUNCH_SITES.map(function (site, i) {
              var reachable = inc >= site.lat - 0.05;
              var cx = px(site.lon), cy = py(site.lat);
              return h('g', { key: i, 'data-iss-launch-site': site.name, 'data-iss-site-reachable': reachable ? 'yes' : 'no' },
                h('circle', {
                  cx: cx, cy: cy, r: 3.6,
                  fill: reachable ? '#4ade80' : 'none',
                  stroke: reachable ? '#04121f' : '#f87171', strokeWidth: reachable ? 1 : 1.6
                }),
                reachable ? null : h('line', { x1: cx - 2.6, y1: cy + 2.6, x2: cx + 2.6, y2: cy - 2.6, stroke: '#f87171', strokeWidth: 1.6, strokeLinecap: 'round' }));
            }),
            h('text', { x: mapX, y: mapY + mapH + 14, fill: '#7dd3fc', fontSize: 8, fontWeight: 800, letterSpacing: .6 }, 'ORBIT 1'),
            h('text', { x: mapX + 58, y: mapY + mapH + 14, fill: '#94a3b8', fontSize: 8, fontWeight: 700 }, 'each later pass runs ' + westShift.toFixed(1) + '° further west'),
            h('text', { x: 620, y: mapY + mapH + 14, textAnchor: 'end', fill: '#94a3b8', fontSize: 8, fontWeight: 700 }, 'filled dot = pad can reach this orbit · struck-through ring = it cannot'),
            h('text', { x: mapX, y: mapY + mapH + 28, fill: '#e2e8f0', fontSize: 9.5, fontWeight: 800 }, 'Reaches ' + inc.toFixed(1) + '°N to ' + inc.toFixed(1) + '°S · flies over ' + Math.round(landShare * 100) + '% of Earth’s land')),
          h('div', { className: 'iss-visual-caption' },
            h('span', null, 'Coastlines: Natural Earth (public domain)'),
            h('span', null, 'lat = asin(sin i × sin θ)')));
      }
      function renderInclinationLab() {
        var inc = orbitInc;
        var landShare = issLandShareWithin(inc);
        var blocked = LAUNCH_SITES.filter(function (s) { return inc < s.lat - 0.05; });
        return card(__alloT('stem.spacestation.inclination_lab', '🌍 Inclination: which world you fly over'),
          h('div', null,
            renderGroundTrack(),
            h('label', { htmlFor: 'iss-orbit-inc', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SOFT, marginBottom: 4 } },
              h('span', null, __alloT('stem.spacestation.inclination', 'Orbital inclination')),
              h('span', { style: { color: '#7dd3fc', fontWeight: 800 }, 'aria-hidden': 'true' }, inc.toFixed(1) + '°')),
            h('input', {
              id: 'iss-orbit-inc', type: 'range', min: 0, max: 90, step: 0.1, value: inc,
              onChange: function (e) { upd({ orbitInc: Number(e.target.value), orbitTouched: true }); },
              'aria-valuetext': inc.toFixed(1) + ' degrees, reaching ' + inc.toFixed(1) + ' degrees north and south',
              'aria-describedby': 'iss-inc-note',
              style: { width: '100%', accentColor: '#38bdf8' }
            }),
            h('div', { role: 'group', 'aria-label': 'Inclination presets', style: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' } },
              [['ISS — 51.6°', 51.6], ['Equatorial — 0°', 0], ['Cape Canaveral due east — 28.5°', 28.5], ['Polar — 90°', 90]].map(function (preset) {
                var on = Math.abs(inc - preset[1]) < 0.05;
                return h('button', {
                  key: preset[1], type: 'button', 'aria-pressed': on,
                  onClick: function () { upd({ orbitInc: preset[1], orbitTouched: true }); },
                  style: { padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(56,189,248,0.2)' : PANEL, color: on ? '#7dd3fc' : TEXT, border: '1px solid ' + (on ? '#38bdf8' : '#334155') }
                }, preset[0]);
              })),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 6 } },
              [['Highest latitude', inc.toFixed(1) + '° N and S'],
               ['Earth’s land under the track', Math.round(landShare * 100) + '%'],
               ['Westward shift per orbit', (360 * (orbitT * 60) / SIDEREAL_DAY_S).toFixed(1) + '°'],
               ['Pads that can reach it', (LAUNCH_SITES.length - blocked.length) + ' of ' + LAUNCH_SITES.length]].map(function (p, i) {
                return h('div', { className: 'iss-fact-item', key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 10, color: SOFT, textTransform: 'uppercase' } }, p[0]),
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#7dd3fc', marginTop: 2 } }, p[1]));
              })),
            h('div', { id: 'iss-inc-note', style: { marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
              blocked.length
                ? h('span', null, h('strong', { style: { color: '#f87171' } }, 'Out of reach: '), 'a rocket launched straight from ' + blocked.map(function (s) { return s.name + ' (' + s.lat + '°N)'; }).join(', ') + ' cannot reach ' + inc.toFixed(1) + '°. You can always aim for an inclination HIGHER than your launch latitude, never lower — the pad is already moving with the spin of the Earth at its own latitude, and changing orbital plane later costs more fuel than the trip up.')
                : h('span', null, h('strong', { style: { color: '#4ade80' } }, 'Every pad here can reach it: '), inc.toFixed(1) + '° is at least as high as all five launch latitudes, so each one can fly to this orbit directly.')),
            h('p', { style: { fontSize: 11.5, color: SOFT, marginTop: 8, lineHeight: 1.55 } },
              // The {pct} placeholder is filled AFTER translation, and from
              // issLandShareWithin(51.6) rather than the slider's current value:
              // this paragraph explains the station's real orbit, so it must not
              // change its numbers when a student drags to 10°. Interpolating
              // into the FALLBACK instead would drop the number entirely the day
              // a language pack supplies this key.
              __alloT('stem.spacestation.inclination_why', 'Why 51.6° and not something lower? Baikonur sits at about 46°N, and a rocket cannot reach an inclination below its own launch latitude without an expensive change of plane afterwards — so from there, nothing under 46° is on the table. The usual explanation given for the extra few degrees is what lies under the flight path: a launch due east from Baikonur would drop its spent stages over populated land and toward the Chinese border. What the partnership settled on passes over every continent except Antarctica and about {pct}% of Earth’s land. Its northern limit runs almost exactly through London at 51.5°N — Berlin, at 52.5°N, never passes directly underneath.')
                .replace('{pct}', String(Math.round(issLandShareWithin(51.6) * 100))))
          ), '#38bdf8');
      }

      function renderOrbit() {
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.orbit_intro', 'Being in orbit is not about being high — it is about being FAST. The station falls around Earth continuously; the crew floats because station and astronaut fall together. Slide the altitude and watch real physics (v = √(GM/r)) respond.')),
          card(__alloT('stem.spacestation.orbit_lab', '🧮 Orbit designer'),
            h('div', null,
              renderOrbitVisual(),
              renderOrbitEnvironmentBand(),
              h('label', { htmlFor: 'iss-orbit-alt', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SOFT, marginBottom: 4 } },
                h('span', null, __alloT('stem.spacestation.altitude', 'Orbital altitude')),
                h('span', { style: { color: '#7dd3fc', fontWeight: 800 }, 'aria-hidden': 'true' }, orbitAlt + ' km')),
              h('input', {
                id: 'iss-orbit-alt', type: 'range', min: 200, max: 2000, step: 10, value: orbitAlt,
                onChange: function (e) { upd({ orbitAlt: parseInt(e.target.value, 10), orbitTouched: true }); },
                'aria-valuetext': orbitAlt + ' kilometers', 'aria-describedby': 'iss-orbit-tradeoff',
                style: { width: '100%', accentColor: '#38bdf8' }
              }),
              renderDragReboostVisual(),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 10 } },
                [['Orbital speed', orbitV.toFixed(2) + ' km/s (' + Math.round(orbitV * 3600).toLocaleString() + ' km/h)'],
                 ['Orbit period', orbitT.toFixed(1) + ' min'],
                 ['Orbits per day', orbitsPerDay.toFixed(1)],
                 ['Sunrises per day', Math.round(orbitsPerDay) + '']].map(function (p, i) {
                  return h('div', { className: 'iss-fact-item', key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: SOFT, textTransform: 'uppercase' } }, p[0]),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: '#7dd3fc', marginTop: 2 } }, p[1]));
                })),
              h('div', { id: 'iss-orbit-tradeoff', style: { marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(251,146,60,0.1)', borderLeft: '3px solid #fb923c', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fdba74' } }, __alloT('stem.spacestation.tradeoff', 'Trade-off report: ')), dragNote),
              h('p', { style: { fontSize: 11, color: SOFT, marginTop: 8, lineHeight: 1.5 } },
                __alloT('stem.spacestation.orbit_note', 'Notice the counter-intuitive part: LOWER orbits are FASTER. To catch up with something ahead of you in orbit, you briefly slow down and drop lower. Orbital mechanics breaks driving intuition — which is why dockings are computed, not eyeballed.'))
            ), '#38bdf8'),
          renderInclinationLab(),
          card(__alloT('stem.spacestation.why_400', '🎯 Why ~400 km?'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 12.5, color: TEXT, lineHeight: 1.8 } },
              h('li', null, __alloT('stem.spacestation.why1', 'Low enough for cargo and crew rockets to carry useful mass, and below the worst radiation zones.')),
              h('li', null, __alloT('stem.spacestation.why2', 'High enough that drag only costs ~50-100 m/day — manageable with periodic reboosts.')),
              h('li', null, __alloT('stem.spacestation.why3', 'The 51.6° orbit tilt was chosen so Russian launches from Baikonur can reach it — the orbit itself encodes the partnership.'))
            ), '#818cf8')
        );
      }

      function renderAssemblyGrowthProfile(step, thresholds, powerByMilestone) {
        var majorSeries = TIMELINE.map(function (_, i) { return MODULES.filter(function (m) { return (thresholds[m.id] == null ? 6 : thresholds[m.id]) <= i; }).length; });
        var volumeSeries = TIMELINE.map(function (_, i) { return Math.round(MODULES.filter(function (m) { return m.id !== 'truss' && (thresholds[m.id] == null ? 6 : thresholds[m.id]) <= i; }).length / 12 * 916); });
        var rows = [
          { label: 'MAJOR ELEMENTS', values: majorSeries, max: 13, color: '#38bdf8', suffix: '', y: 55 },
          { label: 'PRESSURIZED VOLUME', values: volumeSeries, max: 916, color: '#34d399', suffix: ' m³', y: 88 },
          { label: 'AVAILABLE POWER', values: powerByMilestone, max: 120, color: '#fbbf24', suffix: ' kW', y: 121 }
        ];
        var x0 = 148, x1 = 612, span = x1 - x0;
        function xAt(i) { return x0 + i / (TIMELINE.length - 1) * span; }
        function pathFor(row) {
          return row.values.map(function (value, i) {
            var y = row.y - Math.max(0, Math.min(1, value / row.max)) * 19;
            return (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + y.toFixed(1);
          }).join(' ');
        }
        var selectedX = xAt(step);
        var currentValues = rows.map(function (row) { return row.values[step] + row.suffix; });
        return h('div', { className: 'iss-assembly-growth', 'data-iss-assembly-growth': step },
          h('svg', { viewBox: '0 0 640 148', role: 'img', 'aria-label': 'Station growth profile at ' + TIMELINE[step].y + '. ' + rows[0].label.toLowerCase() + ' ' + currentValues[0] + ', pressurized volume ' + currentValues[1] + ', available power ' + currentValues[2] + '.' },
            h('rect', { width: 640, height: 148, fill: '#07101d' }),
            h('text', { x: 20, y: 19, fill: '#94a3b8', fontSize: 8.5, fontWeight: 850, letterSpacing: 1.25 }, 'ASSEMBLY GROWTH PROFILE // SHARED MILESTONE AXIS'),
            [0, 3, 6, 9, 12].map(function (i) { return h('line', { key: 'grid' + i, x1: xAt(i), y1: 30, x2: xAt(i), y2: 128, stroke: '#334155', strokeWidth: 1, opacity: i === 0 || i === 12 ? .7 : .35 }); }),
            h('line', { x1: selectedX, y1: 28, x2: selectedX, y2: 130, stroke: '#e2e8f0', strokeWidth: 1.2, strokeDasharray: '3 3', opacity: .8 }),
            h('text', { x: 618, y: 19, textAnchor: 'end', fill: '#f8fafc', fontSize: 8, fontWeight: 900, letterSpacing: .5 }, 'SELECTED // ' + TIMELINE[step].y),
            rows.map(function (row, rowIndex) {
              var selectedY = row.y - Math.max(0, Math.min(1, row.values[step] / row.max)) * 19;
              return h('g', { key: row.label },
                h('text', { x: 20, y: row.y - 9, fill: '#94a3b8', fontSize: 7.5, fontWeight: 850, letterSpacing: .55 }, row.label),
                h('text', { x: 20, y: row.y + 5, fill: '#e2e8f0', fontSize: 10.5, fontWeight: 900 }, currentValues[rowIndex]),
                h('line', { x1: x0, y1: row.y, x2: x1, y2: row.y, stroke: '#334155', strokeWidth: 1 }),
                h('path', { d: pathFor(row), fill: 'none', stroke: row.color, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
                row.values.map(function (value, i) { var py = row.y - Math.max(0, Math.min(1, value / row.max)) * 19; return h('circle', { key: i, cx: xAt(i), cy: py, r: i === step ? 4 : 1.7, fill: i === step ? '#07101d' : row.color, stroke: row.color, strokeWidth: i === step ? 2.4 : .7 }); }),
                h('circle', { cx: selectedX, cy: selectedY, r: 1.6, fill: '#f8fafc' }));
            }),
            h('text', { x: x0, y: 141, fill: '#64748b', fontSize: 7.5, fontWeight: 800 }, TIMELINE[0].y),
            h('text', { x: xAt(6), y: 141, textAnchor: 'middle', fill: '#64748b', fontSize: 7.5, fontWeight: 800 }, TIMELINE[6].y),
            h('text', { x: x1, y: 141, textAnchor: 'end', fill: '#64748b', fontSize: 7.5, fontWeight: 800 }, TIMELINE[12].y)));
      }
      function renderAssemblyVisual() {
        var step = Math.max(0, Math.min(TIMELINE.length - 1, Number(d.assemblyIdx == null ? 11 : d.assemblyIdx)));
        var thresholds = { zarya: 0, unity: 0, zvezda: 1, destiny: 2, quest: 2, truss: 3, harmony: 4, columbus: 5, kibo: 6, tranquility: 7, cupola: 7, leonardo: 8, nauka: 10 };
        var visible = MODULES.filter(function (m) { return (thresholds[m.id] == null ? 6 : thresholds[m.id]) <= step; });
        var installedNow = visible.filter(function (m) { return (thresholds[m.id] == null ? 6 : thresholds[m.id]) === step; });
        var installLabel = installedNow.length ? 'INSTALLED THIS STEP // ' + installedNow.map(function (m) { return m.name.split(' (')[0]; }).join(' + ') : step === TIMELINE.length - 1 ? 'CONTROLLED DEORBIT PHASE // NO NEW HARDWARE' : 'OPERATIONS MILESTONE // NO NEW MAJOR ELEMENT';
        var powerByMilestone = [18, 30, 46, 75, 82, 92, 105, 110, 110, 110, 120, 120, 120];
        var powerStage = powerByMilestone[step] || 120;
        // One entry per solar-array wing PAIR, keyed to the milestone it was
        // actually installed on: P6 Nov 2000 (step 1), P4 Sep 2006 (step 3),
        // S4 Jun 2007 (step 4), S6 Mar 2009 (step 6). P6 spent its first seven
        // years on the Z1 truss above Unity before being moved to the port end.
        var arrayWings = [
          // y 52 for the Z1 years: clears the milestone caption's baseline at 43
          // and stops just above Unity's hull, which is the truss it sat on.
          { id: 'p6', from: 1, label: 'P6', x: step >= 4 ? 150 : 320, y: step >= 4 ? 58 : 52 },
          { id: 'p4', from: 3, label: 'P4', x: 220, y: 116 },
          { id: 's4', from: 4, label: 'S4', x: 420, y: 58 },
          { id: 's6', from: 6, label: 'S6', x: 490, y: 116 }
        ].filter(function (wing) { return step >= wing.from; });
        var volumeStage = Math.round(visible.filter(function (m) { return m.id !== 'truss'; }).length / 12 * 916);
        return h('div', { className: 'iss-assembly-stage' },
          h('svg', { viewBox: '0 0 640 245', role: 'img', 'aria-label': 'Station assembly visualization at ' + TIMELINE[step].y + '. ' + visible.length + ' major elements shown, ' + (arrayWings.length * 2) + ' of 8 solar array wings installed, ' + powerStage + ' kilowatts available. ' + installLabel + '.' },
            h('defs', null, h('pattern', { id: 'iss-assembly-grid', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, h('path', { d: 'M24 0H0V24', fill: 'none', stroke: '#38bdf8', strokeWidth: .45, opacity: .15 })), h('marker', { id: 'iss-deorbit-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 L10 5 L0 10z', fill: '#fb7185' })),
              h('radialGradient', { id: 'iss-assembly-earth', cx: '46%', cy: '7%', r: '74%' },
                h('stop', { offset: '0%', stopColor: '#8ed2f7' }), h('stop', { offset: '32%', stopColor: '#2470ad' }), h('stop', { offset: '100%', stopColor: '#08284f' })),
              h('filter', { id: 'iss-assembly-limb', x: '-25%', y: '-25%', width: '150%', height: '150%' }, h('feGaussianBlur', { stdDeviation: 6 }))),
            h('rect', { width: 640, height: 245, fill: '#040a16' }), h('rect', { width: 640, height: 245, fill: 'url(#iss-assembly-grid)' }),
            h('circle', { cx: 320, cy: 360, r: 175, fill: 'none', stroke: '#7dd3fc', strokeWidth: 7, opacity: .35, filter: 'url(#iss-assembly-limb)' }),
            h('circle', { cx: 320, cy: 360, r: 170, fill: 'url(#iss-assembly-earth)', opacity: .92, stroke: '#a5e2ff', strokeWidth: 2 }),
            step === TIMELINE.length - 1 ? h('g', null, h('path', { className: 'iss-deorbit-path', d: 'M550 54 Q490 116 386 177', fill: 'none', stroke: '#fb7185', strokeWidth: 2.4, strokeDasharray: '7 6', markerEnd: 'url(#iss-deorbit-arrow)' }), h('text', { x: 548, y: 42, textAnchor: 'end', fill: '#fecdd3', fontSize: 9, fontWeight: 850, letterSpacing: 1 }, 'CONTROLLED REENTRY')) : null,
            step >= 3 ? h('rect', { x: 110, y: 100, width: 420, height: 8, rx: 4, fill: '#94a3b8', opacity: step === TIMELINE.length - 1 ? .42 : 1 }) : null,
            // Solar arrays arrive on the dates they actually arrived. All four
            // wing pairs used to appear at once from 2002 and then sit there,
            // which flatly contradicted the AVAILABLE POWER figure climbing
            // 18 -> 120 kW in the same picture. P6 is the interesting one: it
            // flew in Nov 2000 mounted on the Z1 truss ABOVE Unity and was
            // physically RELOCATED to the end of the port truss in 2007, so it
            // moves here too.
            h('g', { opacity: step === TIMELINE.length - 1 ? .42 : 1 }, arrayWings.map(function (wing) {
              return h('g', { key: wing.id, 'data-iss-array-wing': wing.id },
                h('rect', { x: wing.x - 24, y: wing.y, width: 48, height: 34, rx: 2, fill: '#a86e16', stroke: '#fbbf24' }),
                [1, 2, 3].map(function (line) {
                  return h('line', { key: line, x1: wing.x - 24, y1: wing.y + line * 8.5, x2: wing.x + 24, y2: wing.y + line * 8.5, stroke: '#fde68a', strokeWidth: .5 });
                }),
                h('text', { x: wing.x, y: wing.y - 4, textAnchor: 'middle', fill: '#fde68a', fontSize: 7, fontWeight: 850, letterSpacing: .6 }, wing.label));
            })),
            visible.filter(function (m) { return m.id !== 'truss'; }).map(function (m) {
              var x = 320 + m.pos[0] * 34, y = 106 + m.pos[2] * 12;
              var color = '#' + Number(m.color).toString(16).padStart(6, '0');
              var isNew = (thresholds[m.id] == null ? 6 : thresholds[m.id]) === step;
              var bx = m.axis === 'x' ? -26 : -10, by = m.axis === 'z' ? -21 : -10;
              var bw = m.axis === 'x' ? 52 : 20, bh = m.axis === 'z' ? 42 : 20;
              return h('g', { key: m.id, className: isNew ? 'iss-assembly-new' : '', opacity: step === TIMELINE.length - 1 ? .42 : 1, transform: 'translate(' + x + ',' + y + ')' },
                isNew ? h('rect', { x: bx - 5, y: by - 5, width: bw + 10, height: bh + 10, rx: 13, fill: 'none', stroke: '#7dd3fc', strokeWidth: 1.7, strokeDasharray: '4 3' }) : null,
                h('rect', { x: bx, y: by, width: bw, height: bh, rx: 9, fill: color, stroke: '#e2e8f0', strokeWidth: 1.3 }),
                // Same sheen-over-solid treatment as the crew-day bands, so the
                // hulls read as cylinders rather than flat colour chips. The
                // module colours themselves are untouched (they carry meaning).
                h('rect', { x: bx, y: by, width: bw, height: bh * 0.42, rx: 9, fill: '#ffffff', opacity: 0.15 }),
                h('circle', { r: 3, fill: '#38bdf8' }));
            }),
            h('text', { x: 20, y: 25, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'ORBITAL ASSEMBLY // ' + TIMELINE[step].y),
            h('text', { x: 20, y: 43, fill: '#cbd5e1', fontSize: 9 }, TIMELINE[step].e.length > 86 ? TIMELINE[step].e.slice(0, 86) + '…' : TIMELINE[step].e),
            h('g', { transform: 'translate(20,185)' }, [['MAJOR ELEMENTS', visible.length, '#7dd3fc'], ['PRESSURIZED VOLUME', volumeStage + ' m³', '#34d399'], ['AVAILABLE POWER', powerStage + ' kW', '#fbbf24'], ['SOLAR WINGS', (arrayWings.length * 2) + ' / 8', '#fde68a']].map(function (metric, i) { return h('g', { key: i, transform: 'translate(' + (i * 152) + ',0)' }, h('text', { fill: '#94a3b8', fontSize: 8, fontWeight: 800, letterSpacing: .8 }, metric[0]), h('text', { y: 22, fill: metric[2], fontSize: 15, fontWeight: 900 }, String(metric[1]))); }))),
          renderAssemblyGrowthProfile(step, thresholds, powerByMilestone),
          h('div', { className: 'iss-visual-caption', 'data-iss-assembly-install': step }, h('span', null, installLabel), h('span', null, visible.length + ' MAJOR ELEMENTS ON ORBIT')),
          h('div', { className: 'iss-assembly-controls' },
            h('label', { htmlFor: 'iss-assembly-step' }, h('span', null, 'Assembly milestone'), h('strong', { 'aria-hidden': 'true' }, TIMELINE[step].y)),
            h('input', { id: 'iss-assembly-step', type: 'range', min: 0, max: TIMELINE.length - 1, step: 1, value: step, 'aria-valuetext': 'Milestone ' + (step + 1) + ' of ' + TIMELINE.length + ', ' + TIMELINE[step].y + '. ' + TIMELINE[step].e, onChange: function (e) { upd({ assemblyIdx: Number(e.target.value) }); } }),
            h('div', { className: 'iss-assembly-stepper' }, h('button', { type: 'button', disabled: step === 0, onClick: function () { upd({ assemblyIdx: Math.max(0, step - 1) }); } }, '← Previous'), h('span', { role: 'status' }, (step + 1) + ' / ' + TIMELINE.length), h('button', { type: 'button', disabled: step === TIMELINE.length - 1, onClick: function () { upd({ assemblyIdx: Math.min(TIMELINE.length - 1, step + 1) }); } }, 'Next →'))));
      }
      function renderHistory() {
        return h('div', null,
          renderAssemblyVisual(),
          card(__alloT('stem.spacestation.timeline', '📜 Assembly to retirement'),
            h('div', { className: 'iss-timeline' }, TIMELINE.map(function (t2, i) {
              return h('button', { type: 'button', className: 'iss-timeline-item iss-timeline-item-button' + (i === Math.max(0, Math.min(TIMELINE.length - 1, Number(d.assemblyIdx == null ? 11 : d.assemblyIdx))) ? ' is-active' : ''), key: i, 'data-iss-assembly-milestone': i, 'aria-label': 'Show station assembly at ' + t2.y, 'aria-current': i === Math.max(0, Math.min(TIMELINE.length - 1, Number(d.assemblyIdx == null ? 11 : d.assemblyIdx))) ? 'step' : undefined, onClick: function () { upd({ assemblyIdx: i }); }, style: { display: 'grid', gridTemplateColumns: '86px 1fr', gap: 10, padding: '7px 0', borderBottom: i < TIMELINE.length - 1 ? '1px solid rgba(51,65,85,0.5)' : 'none' } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#7dd3fc', fontFamily: 'ui-monospace, monospace' } }, t2.y),
                h('div', { style: { fontSize: 12.5, color: TEXT, lineHeight: 1.55 } }, t2.e));
            })), '#38bdf8'),
          card(__alloT('stem.spacestation.legacy', '🌍 Why it matters'),
            h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.7, margin: 0 } },
              __alloT('stem.spacestation.legacy_body', 'The station is the most expensive object ever built (well over $100 billion) and arguably the most ambitious peacetime engineering partnership in history: 15 nations keeping hardware and crews alive together for a quarter century, through every political storm on the ground below. Its deepest lesson is not any single experiment — it is proof that humans can build and operate a permanent home off Earth. Everything learned aboard, from water recycling to bone loss, is a down payment on the Moon and Mars.')), '#22c55e'),
          h('p', { style: { fontSize: 11, color: SOFT, lineHeight: 1.6 } },
            __alloT('stem.spacestation.spot_note', '💡 You can SEE the station: it is the third-brightest object in the sky after the Sun and Moon. NASA’s "Spot the Station" service lists pass times for your town — it looks like a brilliant star crossing the sky in a few minutes, moving too smoothly to be a plane.'))
        );
      }

      function renderQuizConsole(questionIndex) {
        var answered = d.quizDone ? QUIZ.length : Math.min(QUIZ.length, questionIndex + (d.quizPicked != null ? 1 : 0));
        return h('div', { className: 'iss-quiz-console', role: 'group', 'aria-label': 'Quiz progress: ' + answered + ' of ' + QUIZ.length + ' answered, current score ' + (d.quizScore || 0) },
          h('div', { className: 'iss-quiz-number', 'aria-hidden': 'true' }, d.quizDone ? '✓' : (questionIndex + 1) + '/' + QUIZ.length),
          h('div', { className: 'iss-quiz-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': QUIZ.length, 'aria-valuenow': answered, 'aria-label': 'Questions answered' }, QUIZ.map(function (_, i) { return h('span', { key: i, className: 'iss-quiz-segment' + (i < answered ? ' is-complete' : '') }); })),
          h('div', { className: 'iss-quiz-score' }, 'Current score', h('strong', null, (d.quizScore || 0) + ' / ' + QUIZ.length)));
      }
      function renderQuizDebriefVisual() {
        var score = Math.max(0, Math.min(QUIZ.length, Number(d.quizScore || 0)));
        var results = d.quizResults || {};
        var known = QUIZ.map(function (_, i) { return typeof results[i] === 'boolean'; }).filter(Boolean).length;
        var missed = QUIZ.map(function (_, i) { return results[i] === false; }).filter(Boolean).length;
        var circumference = 2 * Math.PI * 46;
        var arc = circumference * score / QUIZ.length;
        var outcome = score >= QUIZ_PASS ? 'FLIGHT QUALIFIED' : 'TRAINING LOOP';
        var detail = known ? score + ' correct, ' + missed + ' to review.' : 'Question-by-question history begins on the next run.';
        return h('div', { className: 'iss-learning-visual iss-quiz-debrief', 'data-iss-quiz-debrief': known },
          h('svg', { viewBox: '0 0 640 198', role: 'img', 'aria-label': 'Quiz debrief. Score ' + score + ' out of ' + QUIZ.length + '. ' + outcome.toLowerCase() + '. ' + detail },
            h('defs', null,
              h('linearGradient', { id: 'iss-quiz-debrief-bg', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0%', stopColor: '#04101f' }), h('stop', { offset: '100%', stopColor: '#10153a' })),
              h('filter', { id: 'iss-quiz-ring-glow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, h('feGaussianBlur', { stdDeviation: 4, result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { width: 640, height: 198, fill: 'url(#iss-quiz-debrief-bg)' }),
            [[32,28],[112,18],[194,37],[286,20],[373,34],[459,18],[535,39],[612,23]].map(function (star, i) { return h('circle', { key: i, cx: star[0], cy: star[1], r: i % 3 ? .8 : 1.3, fill: i % 2 ? '#64748b' : '#bae6fd', opacity: .75 }); }),
            h('text', { x: 22, y: 24, fill: '#7dd3fc', fontSize: 9, fontWeight: 850, letterSpacing: 1.4 }, 'MISSION KNOWLEDGE DEBRIEF'),
            h('g', { transform: 'translate(104,104)' },
              h('circle', { r: 52, fill: '#071525', stroke: '#334155', strokeWidth: 1 }),
              h('circle', { r: 46, fill: 'none', stroke: '#263449', strokeWidth: 8 }),
              h('circle', { r: 46, fill: 'none', stroke: score >= QUIZ_PASS ? '#4ade80' : '#fbbf24', strokeWidth: 8, strokeLinecap: 'round', strokeDasharray: arc.toFixed(1) + ' ' + (circumference - arc).toFixed(1), transform: 'rotate(-90)', filter: 'url(#iss-quiz-ring-glow)' }),
              h('text', { y: -2, textAnchor: 'middle', fill: '#f8fafc', fontSize: 22, fontWeight: 950 }, score + '/' + QUIZ.length),
              h('text', { y: 17, textAnchor: 'middle', fill: score >= QUIZ_PASS ? '#86efac' : '#fde68a', fontSize: 7.5, fontWeight: 900, letterSpacing: 1 }, outcome)),
            h('text', { x: 190, y: 53, fill: '#94a3b8', fontSize: 8, fontWeight: 850, letterSpacing: 1 }, known ? 'QUESTION FLIGHT RECORD' : 'SCORE RECORD'),
            QUIZ_TOPIC_LABELS.map(function (label, i) {
              var col = i % 5, row = Math.floor(i / 5), x = 216 + col * 82, y = 82 + row * 58;
              var state = typeof results[i] === 'boolean' ? results[i] : null;
              var color = state === true ? '#4ade80' : state === false ? '#f87171' : '#64748b';
              var symbol = state === true ? '✓' : state === false ? '×' : '•';
              return h('g', { key: label },
                h('circle', { cx: x, cy: y, r: 16, fill: color + '20', stroke: color, strokeWidth: 2 }),
                h('text', { x: x, y: y + 4, textAnchor: 'middle', fill: color, fontSize: 13, fontWeight: 950 }, symbol),
                h('text', { x: x, y: y + 28, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 7.1, fontWeight: 800 }, label.toUpperCase()));
            }),
            h('text', { x: 22, y: 188, fill: '#94a3b8', fontSize: 8 }, detail)),
          h('div', { className: 'iss-visual-caption' }, h('span', null, detail), h('span', null, outcome)));
      }
      function renderQuiz() {
        var qi = Math.max(0, Math.min(QUIZ.length - 1, d.quizIdx || 0));
        var q = QUIZ[qi];
        var picked = d.quizPicked;
        return h('div', null,
          renderQuizConsole(qi),
          d.quizDone ?
            card(__alloT('stem.spacestation.quiz_done', '🏁 Debrief'),
              h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
                renderQuizDebriefVisual(),
                h('p', { style: { fontSize: 16, fontWeight: 800, color: TEXT, margin: '0 0 6px' } }, d.quizScore + ' / ' + QUIZ.length),
                h('p', { style: { fontSize: 12.5, color: SOFT, margin: '0 0 10px' } }, d.quizScore >= QUIZ_PASS ? __alloT('stem.spacestation.quiz_great', 'Flight-controller material. Quest objective complete!') : __alloT('stem.spacestation.quiz_retry', 'Every controller trains on repetitions — revisit the tabs and fly it again.')),
                h('button', { type: 'button', autoFocus: true, onClick: function () { upd({ quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizResults: {}, quizFocusTarget: 0 }); }, style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, __alloT('stem.spacestation.quiz_again', '🔁 Run it again'))
              ), '#22c55e')
          : card((qi + 1) + ' / ' + QUIZ.length + ' — ' + q.q,
              h('div', null,
                h('div', { role: 'group', 'aria-label': 'Answer options for question ' + (qi + 1) + ' of ' + QUIZ.length, style: { display: 'grid', gap: 6 } },
                  q.o.map(function (opt, oi) {
                    var isPicked = picked === oi, isRight = oi === q.a;
                    var answerState = picked == null ? '' : isRight && isPicked ? '✓ Your answer — correct.' : isRight ? '✓ Correct answer.' : isPicked ? '✕ Your answer — incorrect.' : '';
                    var bg = picked == null ? PANEL : isRight ? 'rgba(34,197,94,0.15)' : isPicked ? 'rgba(239,68,68,0.15)' : PANEL;
                    var bd = picked == null ? '#334155' : isRight ? '#22c55e' : isPicked ? '#ef4444' : '#334155';
                    return h('button', {
                      key: oi, id: 'iss-quiz-option-' + qi + '-' + oi, type: 'button', 'data-iss-quiz-option': oi, disabled: picked != null, 'aria-pressed': isPicked, 'aria-describedby': picked != null ? 'iss-quiz-feedback' : undefined,
                      ref: function (el) { if (el && oi === 0 && d.quizFocusTarget === qi && !el._issQuizFocusHandled) { el._issQuizFocusHandled = true; el.focus(); setTimeout(function () { upd({ quizFocusTarget: null }); }, 0); } },
                      onClick: function () {
                        var right = oi === q.a;
                        var nextResults = Object.assign({}, d.quizResults || {}); nextResults[qi] = right;
                        upd({ quizPicked: oi, quizScore: (d.quizScore || 0) + (right ? 1 : 0), quizResults: nextResults });
                        if (right && typeof awardXP === 'function') { try { awardXP(2); } catch (e) {} }
                      },
                      style: { textAlign: 'left', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: picked == null ? 'pointer' : 'default', background: bg, color: TEXT, border: '1px solid ' + bd }
                    }, answerState ? h('span', { className: 'iss-quiz-answer-state' }, answerState) : null, opt);
                  })),
                picked != null ? h('div', { id: 'iss-quiz-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + (picked === q.a ? '#22c55e' : '#ef4444'), fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                  h('strong', { style: { color: picked === q.a ? '#4ade80' : '#f87171' } }, picked === q.a ? '✅ ' : '❌ '), q.x) : null,
                picked != null ? h('button', {
                  type: 'button', autoFocus: true, 'data-iss-quiz-next': 'true', 'aria-describedby': 'iss-quiz-feedback',
                  onClick: function () {
                    if (qi + 1 >= QUIZ.length) {
                      var finalScore = d.quizScore || 0;
                      upd({ quizDone: true, quizBest: Math.max(d.quizBest || 0, finalScore) });
                      if (finalScore >= QUIZ_PASS && addToast) addToast('🛰️ ' + __alloT('stem.spacestation.quiz_toast', 'Station quiz aced: ') + finalScore + '/' + QUIZ.length, 'success');
                    } else { upd({ quizIdx: qi + 1, quizPicked: null, quizFocusTarget: qi + 1 }); }
                  },
                  style: { marginTop: 10, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 800, fontSize: 12, cursor: 'pointer' }
                }, qi + 1 >= QUIZ.length ? __alloT('stem.spacestation.quiz_finish', 'Finish →') : __alloT('stem.spacestation.quiz_next', 'Next →')) : null
              ), '#38bdf8')
        );
      }

      function selectTab(index, moveFocus) {
        var next = TABS[((index % TABS.length) + TABS.length) % TABS.length];
        upd({ tab: next.id });
        announceToSR(next.label + ' ' + __alloT('stem.spacestation.tab_selected', 'section opened.'));
        if (moveFocus && typeof document !== 'undefined') {
          setTimeout(function () {
            var el = document.getElementById('iss-tab-' + next.id);
            if (el) el.focus();
          }, 0);
        }
      }
      function onTabKeyDown(e, index) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = TABS.length - 1;
        if (next == null) return;
        e.preventDefault();
        selectTab(next, true);
      }

      return h('div', { className: 'iss-root', style: { maxWidth: 1440, margin: '0 auto' } },
        wcagStyles(),
        h('header', { className: 'iss-hero' },
          h('div', { className: 'iss-hero-copy' },
            h('div', { className: 'iss-eyebrow' }, h('span', { className: 'iss-live-dot', 'aria-hidden': 'true' }), __alloT('stem.spacestation.hero_kicker', 'Expedition learning console / live simulation')),
            h('h2', { className: 'iss-title', style: { fontSize: 18, fontWeight: 900, color: TEXT, margin: '0 0 5px' } }, '🛰️ ' + __alloT('stem.spacestation.title', 'Space Station — a permanent home off Earth')),
            h('p', { className: 'iss-subtitle', style: { fontSize: 12, color: SOFT, margin: 0 } }, __alloT('stem.spacestation.subtitle', 'The International Space Station: 420 tonnes of engineering falling around the planet at 7.66 km/s, continuously inhabited for over 25 years.'))),
          h('div', { className: 'iss-orbit-mark', 'aria-hidden': 'true' }, h('span', { className: 'iss-orbit-core' }, '\uD83C\uDF0D')),
          h('div', { className: 'iss-status-strip', role: 'list', 'aria-label': __alloT('stem.spacestation.orbit_status', 'Current station reference data') },
            [['Orbit altitude', '~' + orbitAlt + ' km'], ['Velocity', orbitV.toFixed(2) + ' km/s'], ['Orbit period', orbitT.toFixed(0) + ' minutes'], ['Crew shift', Object.keys(d.interiorDone || {}).filter(function (key) { return !!d.interiorDone[key]; }).length + ' / 5 jobs']].map(function (metric, i) { return h('div', { key: i, className: 'iss-status-item', role: 'listitem' }, h('span', { className: 'iss-status-label' }, metric[0]), h('strong', { className: 'iss-status-value' }, metric[1])); }))),
        h('div', { className: 'iss-tablist', role: 'tablist', 'aria-label': __alloT('stem.spacestation.sections', 'Space Station sections'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
          TABS.map(function (t2, ti) {
            var on = tab === t2.id;
            return h('button', {
              className: 'iss-tab', key: t2.id, id: 'iss-tab-' + t2.id, type: 'button', role: 'tab',
              'aria-selected': on ? 'true' : 'false', 'aria-controls': 'iss-panel',
              tabIndex: on ? 0 : -1,
              onClick: function () { selectTab(ti, false); },
              onKeyDown: function (e) { onTabKeyDown(e, ti); },
              style: { padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: on ? '#0ea5e9' : PANEL, color: on ? '#04121f' : TEXT, border: on ? '2px solid #7dd3fc' : '1px solid #334155' }
            }, h('span', { className: 'iss-tab-icon', 'aria-hidden': 'true' }, t2.icon), t2.label);
          })),
        h('div', { className: 'iss-panel', id: 'iss-panel', role: 'tabpanel', 'aria-labelledby': 'iss-tab-' + tab, tabIndex: 0 },
          tab === 'interior' ? renderInterior() :
          tab === 'operations' ? renderOperations() :
          tab === 'map' ? renderMap() :
          tab === 'day' ? renderDay() :
          tab === 'systems' ? renderSystems() :
          tab === 'orbit' ? renderOrbit() :
          tab === 'missions' ? renderMissions() :
          tab === 'history' ? renderHistory() :
          renderQuiz())
      );
    }
  });
  console.log('[StemLab] stem_tool_spacestation.js loaded — Space Station (3-D ISS + engineering)');
})();
