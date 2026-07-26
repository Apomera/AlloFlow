// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Space Station (ISS engineering + astronaut life)
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
    { id: 'body', icon: '🦴', name: 'The human system', color: '#e879f9',
      how: 'Bodies are engineering systems too: without gravity, bones shed ~1-1.5% density per month, muscles shrink, fluid shifts puff faces and press on eyes, and radiation dose runs far above ground level.',
      num: 'Daily dose aboard is roughly 0.5-1 mSv — months aboard approach what a nuclear worker may receive in a year. Exercise, diet, and shielding are the current countermeasures.',
      challenge: 'The station is the only lab where we can study years of weightlessness — every crew member is also an experiment. What would YOU measure before a 3-year Mars mission?' }
  ];

  // ── History & future ──
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
    { q: 'Which is the LARGEST module?', o: ['Zarya', 'Destiny', 'Kibo (Japan)', 'Columbus'], a: 2, x: 'JAXA’s Kibo — a big pressurized lab plus an exposed "back porch" and its own robotic arm.' },
    { q: 'Salt and pepper aboard are used as…', o: ['Powders in shakers', 'Liquids in dropper bottles', 'Pills', 'They’re banned'], a: 1, x: 'Floating grains would drift into eyes, vents, and experiments — so seasonings are dissolved liquids.' },
    { q: 'What is a Whipple shield?', o: ['A sun shade', 'A spaced two-wall bumper that vaporizes debris', 'A radiation blanket', 'The airlock hatch'], a: 1, x: 'A thin standoff bumper shocks a hypervelocity particle into vapor and spray before it reaches the pressure hull.' },
    { q: 'What is planned for the station around 2030-31?', o: ['Boost to the Moon', 'Sale to a museum', 'Controlled deorbit over the remote ocean', 'Left empty in orbit'], a: 2, x: 'Current plans call for a SpaceX-built deorbit vehicle to steer it into a controlled reentry over the South Pacific; commercial stations take over research in low Earth orbit.' }
  ];

  var FAST_FACTS = [
    ['Altitude', '~400-420 km'], ['Speed', '7.66 km/s'], ['Orbit period', '~92 min'],
    ['Sunrises/day', '16'], ['Truss length', '109 m'], ['Mass', '~420,000 kg'],
    ['Pressurized volume', '~916 m³'], ['Usual crew', '7'], ['Crewed since', 'Nov 2, 2000'],
    ['Partner nations', '15'], ['Visitors so far', '280+ from 20+ countries'], ['Solar array area', '~2,500 m²']
  ];

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
      { id: 'iss_ops', label: 'Simulate a full station orbit', icon: '📡', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.opsRuns || 0) >= 1; } },
      { id: 'iss_orbit', label: 'Change the orbit in the Orbit Lab', icon: '🧮', check: function (d) { var s = (d && d.spaceStation) || {}; return !!s.orbitTouched; } },
      { id: 'iss_quiz', label: 'Score 7+ on the station quiz', icon: '🧠', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.quizBest || 0) >= 7; } },
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
            tab: 'interior', selModule: 'zarya', dayIdx: 0, sysIdx: 0,
            interiorRoom: 'harmony', interiorDone: {}, interiorSeen: { harmony: true }, interiorChoices: {},
            interiorInspected: {}, interiorAttempts: {}, interiorDiscovery: null, interiorLog: [],
            interiorGuided: true, lowGImpulse: 10, lowGResult: null,
            researchStep: 0, researchFeedback: '', researchErrors: 0, maintenanceChecks: {}, maintenanceReading: null, interiorNotes: {}, cabinStow: {}, cupolaTarget: 'day', cupolaCaptured: false, cupolaShutters: false, cupolaObservation: '',
            opsMode: 'integrated', opsScenario: 'nominal', opsOrbitMinute: 0, opsFocus: 'all', opsCrew: 7, opsResearch: 60, opsArrayAngle: 86, opsEclipse: 35, opsBattery: 76, opsRecovery: 98, opsScrub: 88, opsRadiator: 82, opsCooling: 86, opsCmg: 28, opsMissionDays: 180, opsExercise: 2.5, opsDebrisSize: 1, opsShieldGap: 10, opsDebrisSpeed: 12, opsEmergency: 'leak', opsEmergencyResult: '', opsRuns: 0, opsLog: [], assemblyIdx: 11,
            orbitAlt: 420, quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
            seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0, mapView: 'overview', mapCutaway: false,
            askInput: '', askAnswer: '', askLoading: false
          } });
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } }, __alloT('stem.spacestation.initializing', '🛰️ Docking with the station…'));
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
          '.iss-root{--iss-line:rgba(148,163,184,.22);--allo-stem-panel:#172235;--allo-stem-text:#e7eef8;--allo-stem-text-soft:#a9b8cb;position:relative;isolation:isolate;box-sizing:border-box;width:100%;padding:clamp(14px,2.4vw,26px);overflow:hidden;border:1px solid rgba(125,211,252,.24);border-radius:24px;background:radial-gradient(circle at 9% 2%,rgba(14,165,233,.2),transparent 27%),radial-gradient(circle at 92% 8%,rgba(99,102,241,.2),transparent 28%),linear-gradient(155deg,#060b18 0%,#081221 52%,#07101d 100%);box-shadow:0 28px 70px rgba(2,6,23,.38),inset 0 1px 0 rgba(255,255,255,.05);color-scheme:dark}' +
          '.iss-root:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.52;background-image:radial-gradient(circle at 14% 19%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 78% 13%,#bae6fd 0 1px,transparent 1.5px),radial-gradient(circle at 43% 8%,#fff 0 1px,transparent 1.4px),radial-gradient(circle at 93% 31%,#fff 0 1px,transparent 1.5px),radial-gradient(circle at 61% 28%,#c4b5fd 0 1px,transparent 1.5px);background-size:177px 151px,223px 197px,139px 181px,251px 169px,193px 227px}.iss-root *{box-sizing:border-box}.iss-root button,.iss-root input,.iss-root textarea{font:inherit}.iss-root button{transition:transform .18s ease,border-color .18s ease,background-color .18s ease,box-shadow .18s ease,filter .18s ease}.iss-root button:not(:disabled):hover{transform:translateY(-1px);filter:brightness(1.12);box-shadow:0 8px 22px rgba(2,6,23,.24)}.iss-root button:not(:disabled):active{transform:translateY(0) scale(.985)}' +
          '.iss-root button:focus-visible,.iss-root input:focus-visible,.iss-root textarea:focus-visible,.iss-root canvas:focus-visible,.iss-root [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:3px;border-radius:8px}.iss-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          '.iss-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;margin-bottom:18px}.iss-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:7px;color:#7dd3fc;font-size:10px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase}.iss-live-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px rgba(74,222,128,.12),0 0 16px #4ade80}.iss-title{font-size:clamp(21px,3vw,31px)!important;line-height:1.08;letter-spacing:-.035em;text-shadow:0 2px 22px rgba(56,189,248,.16)}.iss-subtitle{max-width:710px;font-size:clamp(11.5px,1.5vw,13px)!important;line-height:1.6!important}' +
          '.iss-orbit-mark{position:relative;width:92px;height:92px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,.22),rgba(14,165,233,.04) 56%,transparent 58%);border:1px solid rgba(125,211,252,.18);box-shadow:inset 0 0 25px rgba(14,165,233,.14),0 0 32px rgba(14,165,233,.08)}.iss-orbit-mark:before{content:"";position:absolute;width:78px;height:31px;border:1px solid #38bdf8;border-radius:50%;transform:rotate(-18deg);box-shadow:0 0 13px rgba(56,189,248,.3)}.iss-orbit-mark:after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:#fbbf24;box-shadow:0 0 15px #fbbf24;transform:translate(34px,-13px)}.iss-orbit-core{font-size:34px;filter:drop-shadow(0 4px 12px rgba(2,6,23,.55))}' +
          '.iss-status-strip{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.iss-status-item{padding:8px 10px;border:1px solid var(--iss-line);border-radius:10px;background:rgba(2,6,23,.38);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.iss-status-label{display:block;color:#7f91a8;font-size:8px;font-weight:850;letter-spacing:1.05px;text-transform:uppercase}.iss-status-value{display:block;margin-top:2px;color:#e0f2fe;font:800 11.5px ui-monospace,SFMono-Regular,Consolas,monospace}' +
          '.iss-tablist{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important;padding:7px;margin:0 0 14px!important;border:1px solid var(--iss-line);border-radius:15px;background:rgba(2,6,23,.48);backdrop-filter:blur(12px)}.iss-tab{position:relative;min-height:43px;padding:8px 9px!important;border-radius:10px!important;line-height:1.2}.iss-tab[aria-selected="true"]{background:linear-gradient(135deg,#38bdf8,#0ea5e9)!important;box-shadow:0 7px 20px rgba(14,165,233,.23),inset 0 1px 0 rgba(255,255,255,.38)}.iss-tab-icon{display:inline-block;margin-right:3px;font-size:14px;filter:drop-shadow(0 2px 4px rgba(2,6,23,.4))}' +
          '.iss-panel{min-height:280px;padding:clamp(12px,2vw,18px);border:1px solid var(--iss-line);border-radius:18px;background:linear-gradient(160deg,rgba(15,23,42,.8),rgba(8,17,31,.74));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 18px 40px rgba(2,6,23,.18);backdrop-filter:blur(12px)}.iss-card{position:relative;overflow:hidden;border:1px solid var(--iss-line)!important;border-left:3px solid var(--iss-card-accent)!important;border-radius:14px!important;background:linear-gradient(145deg,rgba(30,41,59,.86),rgba(15,23,42,.82))!important;box-shadow:0 12px 28px rgba(2,6,23,.16),inset 0 1px 0 rgba(255,255,255,.04)}.iss-card:after{content:"";position:absolute;right:-55px;top:-75px;width:145px;height:145px;border-radius:50%;pointer-events:none;background:var(--iss-card-accent);opacity:.045}.iss-card-title{display:flex;align-items:center;gap:7px;padding-bottom:8px;border-bottom:1px solid rgba(148,163,184,.12);letter-spacing:.01em}' +
          '.iss-interior-hero{position:relative;overflow:hidden!important;border-radius:16px!important;background:radial-gradient(circle at 83% 18%,rgba(125,211,252,.16),transparent 31%),linear-gradient(125deg,rgba(14,165,233,.22),rgba(79,70,229,.14) 58%,rgba(15,23,42,.52))!important;box-shadow:0 14px 32px rgba(2,6,23,.2),inset 0 1px 0 rgba(255,255,255,.07)}.iss-interior-hero:after{content:"";position:absolute;right:-30px;bottom:-56px;width:180px;height:100px;border:1px solid rgba(125,211,252,.18);border-radius:50%;transform:rotate(-12deg)}.iss-route{padding:8px;border:1px solid var(--iss-line);border-radius:14px;background:rgba(2,6,23,.34)}.iss-route-button{position:relative;overflow:hidden}.iss-route-button[aria-pressed="true"]:after{content:"";position:absolute;inset:auto 9px 0;height:2px;border-radius:2px;background:currentColor;box-shadow:0 0 10px currentColor}' +
          '.iss-interior-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:14px}.iss-scene-frame{box-shadow:0 18px 38px rgba(2,6,23,.3),inset 0 0 0 1px rgba(255,255,255,.04)}.iss-scene-frame:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(125,211,252,.1),transparent 10%,transparent 90%,rgba(125,211,252,.08)),repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.012) 3px 4px)}.iss-scene-frame>button{z-index:2}' +
          '.iss-station-stage{position:relative;border-radius:18px!important;border-color:rgba(125,211,252,.35)!important;box-shadow:0 18px 45px rgba(2,6,23,.42),inset 0 0 45px rgba(14,165,233,.08)}.iss-stage-hud{position:absolute;inset:12px 12px auto;display:flex;justify-content:space-between;gap:8px;pointer-events:none}.iss-hud-chip{padding:6px 9px;border:1px solid rgba(125,211,252,.25);border-radius:8px;background:rgba(2,6,23,.62);backdrop-filter:blur(8px);color:#bae6fd;font:800 9px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.7px}.iss-stage-help{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 10px;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:rgba(2,6,23,.64);backdrop-filter:blur(8px);color:#cbd5e1;font-size:9.5px;font-weight:700;pointer-events:none;white-space:nowrap}.iss-module-picker{padding:8px;border:1px solid var(--iss-line);border-radius:12px;background:rgba(2,6,23,.34)}.iss-module-marker{position:absolute;z-index:3;display:flex;align-items:center;gap:5px;transform:translate(-50%,-135%);pointer-events:none;transition:left .08s linear,top .08s linear,opacity .16s ease}.iss-module-marker i{display:block;width:18px;height:18px;border-left:1px solid #fbbf24;border-top:1px solid #fbbf24;transform:translate(9px,9px) rotate(-45deg)}.iss-module-marker span{padding:4px 7px;border:1px solid rgba(251,191,36,.5);border-radius:6px;background:rgba(2,6,23,.76);color:#fef3c7;font:850 8px ui-monospace,monospace;letter-spacing:.7px;box-shadow:0 0 16px rgba(251,191,36,.16)}.iss-hud-chip[data-phase="sunlight"]{color:#fde68a;border-color:rgba(251,191,36,.38)}.iss-hud-chip[data-phase="eclipse"]{color:#c7d2fe;border-color:rgba(129,140,248,.42)}' +
          '.iss-learning-visual{position:relative;overflow:hidden;margin:0 0 12px;border:1px solid rgba(125,211,252,.25);border-radius:14px;background:radial-gradient(circle at 50% 100%,rgba(14,165,233,.12),transparent 56%),rgba(2,6,23,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 25px rgba(2,6,23,.2)}.iss-learning-visual svg{display:block;width:100%;height:auto}.iss-visual-caption{display:flex;justify-content:space-between;gap:10px;padding:7px 10px;border-top:1px solid rgba(148,163,184,.14);color:#94a3b8;font-size:9.5px;letter-spacing:.35px}.iss-flow-path{stroke-dasharray:7 7;animation:iss-flow 7s linear infinite}.iss-orbit-station{animation:iss-orbit-breathe 2.6s ease-in-out infinite}.iss-system-tabs{padding:7px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.34)}.iss-system-tab[aria-pressed="true"]{box-shadow:inset 0 -2px 0 currentColor,0 7px 18px rgba(2,6,23,.2)}.iss-dock-canvas{box-shadow:0 16px 36px rgba(2,6,23,.34),inset 0 0 35px rgba(14,165,233,.08)}.iss-timeline{position:relative;padding-left:19px}.iss-timeline:before{content:"";position:absolute;left:5px;top:5px;bottom:5px;width:2px;background:linear-gradient(#38bdf8,#818cf8,#22c55e);box-shadow:0 0 12px rgba(56,189,248,.35)}.iss-timeline-item{position:relative}.iss-timeline-item-button{width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.iss-timeline-item-button:hover{background:linear-gradient(90deg,rgba(56,189,248,.08),transparent)}.iss-timeline-item:before{content:"";position:absolute;left:-18px;top:12px;width:9px;height:9px;border:2px solid #7dd3fc;border-radius:50%;background:#07101d;box-shadow:0 0 10px rgba(56,189,248,.55)}.iss-day-strip{padding:7px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.32)}.iss-day-chip[aria-pressed="true"]{box-shadow:inset 0 -2px 0 #e879f9,0 7px 18px rgba(232,121,249,.12)}' +
          '@keyframes iss-flow{to{stroke-dashoffset:-70}}@keyframes iss-orbit-breathe{50%{filter:drop-shadow(0 0 8px #7dd3fc)}}' +          '.iss-orbit-environment{margin:-4px 0 12px;background:rgba(2,6,23,.28)}.iss-orbit-environment svg{display:block;width:100%;height:auto}.iss-orbit-environment .iss-visual-caption{border-top:1px solid rgba(148,163,184,.14)}.iss-blueprint{margin:0 0 11px}.iss-blueprint-grid{opacity:.2}.iss-eva-visual{margin:0 0 10px}.iss-eva-astronaut{animation:iss-eva-hover 2.8s ease-in-out infinite}.iss-eva-tether-a{stroke:#38bdf8}.iss-eva-tether-b{stroke:#fbbf24}.iss-day-orbit{margin:0 0 10px}.iss-crew-day-timeline{border-top:1px solid rgba(148,163,184,.14);background:rgba(2,6,23,.28)}.iss-crew-day-timeline svg{display:block;width:100%;height:auto}.iss-day-timeline-marker{filter:drop-shadow(0 0 5px rgba(251,191,36,.42))}.iss-day-marker{animation:iss-orbit-breathe 2.6s ease-in-out infinite}.iss-quiz-console{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin-bottom:12px;padding:10px 12px;border:1px solid var(--iss-line);border-radius:13px;background:linear-gradient(135deg,rgba(14,165,233,.11),rgba(99,102,241,.08))}.iss-quiz-number{display:grid;place-items:center;width:45px;height:45px;border:1px solid #38bdf8;border-radius:50%;background:rgba(14,165,233,.12);color:#bae6fd;font:900 13px ui-monospace,monospace;box-shadow:inset 0 0 18px rgba(56,189,248,.12)}.iss-quiz-track{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}.iss-quiz-segment{height:7px;border-radius:5px;background:#263449;border:1px solid rgba(148,163,184,.18)}.iss-quiz-segment.is-complete{background:#38bdf8;border-color:#7dd3fc;box-shadow:0 0 9px rgba(56,189,248,.35)}.iss-quiz-score{text-align:right;color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.8px}.iss-quiz-score strong{display:block;color:#e0f2fe;font-size:15px;letter-spacing:0}.iss-fact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px}.iss-fact-item{position:relative;overflow:hidden;min-height:64px;padding:10px!important;background:linear-gradient(145deg,rgba(2,6,23,.52),rgba(30,41,59,.48))!important;transition:transform .18s ease,border-color .18s ease}.iss-fact-item:after{content:"";position:absolute;right:-18px;bottom:-24px;width:54px;height:54px;border-radius:50%;background:#818cf8;opacity:.06}.iss-fact-item:hover{transform:translateY(-2px);border-color:#64748b!important}@keyframes iss-eva-hover{50%{transform:translateY(-3px)}}.iss-cabin-airflow{stroke-dasharray:4 3;animation:iss-flow 3.4s linear infinite}.iss-aurora-curtain{animation:iss-aurora-sway 7s ease-in-out infinite}.iss-aurora-curtain:nth-of-type(2){animation-delay:-2.3s}.iss-aurora-curtain:nth-of-type(3){animation-delay:-4.6s}@keyframes iss-aurora-sway{50%{transform:translateX(4px)}}' +
          '@media (max-width:520px){.iss-quiz-console{grid-template-columns:auto 1fr}.iss-quiz-score{grid-column:1/-1;text-align:left;display:flex;gap:6px;align-items:baseline}.iss-quiz-score strong{display:inline}.iss-visual-caption{flex-direction:column;gap:2px}}' +          '.iss-ops-hero{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px;margin-bottom:12px;border:1px solid rgba(74,222,128,.25);border-radius:15px;background:radial-gradient(circle at 88% 18%,rgba(74,222,128,.12),transparent 30%),linear-gradient(135deg,rgba(14,165,233,.12),rgba(15,23,42,.66));box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.iss-ops-health{display:grid;place-items:center;width:76px;height:76px;border-radius:50%;border:5px solid currentColor;background:rgba(2,6,23,.52);font:900 17px ui-monospace,monospace;box-shadow:inset 0 0 22px rgba(2,6,23,.5),0 0 22px currentColor}.iss-ops-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:12px}.iss-ops-metric{min-width:0;overflow:hidden;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.42)}.iss-ops-metric button{display:block;width:100%;padding:9px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.iss-ops-metric button:hover{background:rgba(56,189,248,.07)}.iss-ops-metric button:focus-visible{outline:2px solid #7dd3fc;outline-offset:-3px}.iss-ops-metric-label{display:block;overflow:hidden;color:#94a3b8;font-size:8px;font-weight:850;letter-spacing:.7px;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.iss-ops-metric-value{display:block;margin-top:3px;color:#e0f2fe;font:850 13px ui-monospace,monospace}.iss-ops-metric small{display:block;margin-top:4px;color:#64748b;font:750 7.5px ui-monospace,monospace;letter-spacing:.3px}.iss-rule-heading{display:flex;align-items:center;justify-content:space-between;gap:6px}.iss-rule-light{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#fbbf24;box-shadow:0 0 9px #fbbf24}.iss-rule-light.is-go{background:#4ade80;box-shadow:0 0 9px #4ade80}.iss-rule-light.is-hold{background:#f87171;box-shadow:0 0 9px #f87171}.iss-ops-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:10px}.iss-ops-presets button{min-width:0;display:flex;align-items:center;gap:7px;padding:8px;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.38);color:#cbd5e1;text-align:left;cursor:pointer}.iss-ops-presets button[aria-pressed="true"]{border-color:#7dd3fc;background:linear-gradient(135deg,rgba(14,165,233,.2),rgba(99,102,241,.15));box-shadow:inset 0 -2px 0 #38bdf8}.iss-ops-presets strong,.iss-ops-presets small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iss-ops-presets strong{font-size:9.5px}.iss-ops-presets small{margin-top:2px;color:#7f91a8;font-size:7.5px}.iss-preset-icon{display:grid;place-items:center;width:24px;height:24px;flex:0 0 auto;border:1px solid #475569;border-radius:50%;color:#7dd3fc;font:900 9px ui-monospace,monospace}.iss-custom-badge{grid-column:1/-1;padding:3px 7px;color:#fbbf24;font:800 8px ui-monospace,monospace;letter-spacing:.6px}.iss-ops-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(108px,1fr));gap:6px;padding:7px;margin-bottom:12px;border:1px solid var(--iss-line);border-radius:13px;background:rgba(2,6,23,.36)}.iss-ops-mode{min-height:39px;padding:7px!important}.iss-ops-mode[aria-pressed="true"]{background:linear-gradient(135deg,rgba(14,165,233,.3),rgba(99,102,241,.22))!important;border-color:#38bdf8!important;color:#e0f2fe!important;box-shadow:inset 0 -2px 0 #38bdf8}.iss-ops-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.iss-ops-control{padding:10px;border:1px solid var(--iss-line);border-radius:11px;background:rgba(2,6,23,.38)}.iss-ops-control label{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:10.5px;font-weight:800}.iss-ops-control input[type="range"]{width:100%;margin:9px 0 4px}.iss-meter{height:8px;overflow:hidden;margin-top:7px;border:1px solid #475569;border-radius:6px;background:#101827}.iss-meter>span{display:block;height:100%;border-radius:5px;transition:width .25s ease}.iss-spark{margin-top:7px;border-top:1px solid rgba(148,163,184,.12)}.iss-spark svg{display:block;width:100%;height:42px}.iss-forecast-legend{display:flex;flex-wrap:wrap;gap:7px 14px;padding:7px 10px;border-top:1px solid rgba(148,163,184,.14);color:#94a3b8;font-size:9px}.iss-forecast-legend span{display:flex;align-items:center;gap:5px}.iss-forecast-legend i{width:13px;height:3px;border-radius:3px}.iss-orbit-scrubber{padding:9px 10px 10px;border-top:1px solid rgba(148,163,184,.14);background:rgba(2,6,23,.24)}.iss-orbit-scrubber label{display:flex;justify-content:space-between;gap:8px;color:#cbd5e1;font-size:9.5px;font-weight:800}.iss-orbit-scrubber input{width:100%;margin:8px 0 7px}.iss-orbit-readout{display:flex;flex-wrap:wrap;gap:5px 13px;color:#94a3b8;font:750 8.5px ui-monospace,monospace}.iss-forecast-cursor{filter:drop-shadow(0 0 4px currentColor)}.iss-rule-status{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;margin:-2px 0 12px;padding:9px 10px;border:1px solid rgba(74,222,128,.28);border-radius:11px;background:rgba(34,197,94,.07)}.iss-rule-status.is-check{border-color:rgba(248,113,113,.38);background:rgba(239,68,68,.08)}.iss-rule-status-icon{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#14532d;color:#bbf7d0;font-weight:900}.iss-rule-status.is-check .iss-rule-status-icon{background:#7f1d1d;color:#fecaca}.iss-rule-status strong{display:block;color:#bbf7d0;font:850 9px ui-monospace,monospace;letter-spacing:.7px}.iss-rule-status.is-check strong{color:#fecaca}.iss-rule-status p{margin:2px 0 0;color:#94a3b8;font-size:9.5px;line-height:1.35}.iss-rule-status button{padding:6px 9px;border:1px solid #64748b;border-radius:8px;background:rgba(2,6,23,.36);color:#e2e8f0;font-size:9px;font-weight:800;cursor:pointer}.iss-ops-schematic{margin-bottom:10px}.iss-ops-debrief{margin-top:12px;padding:12px;border:1px solid rgba(125,211,252,.22);border-radius:13px;background:rgba(2,6,23,.4)}.iss-ops-log{display:grid;gap:4px;margin-top:8px;color:#94a3b8;font:700 9.5px ui-monospace,monospace}.iss-emergency-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.iss-emergency-choice{text-align:left;padding:10px!important}.iss-assembly-stage{position:relative;overflow:hidden;margin-bottom:10px;border:1px solid rgba(125,211,252,.25);border-radius:14px;background:#050b18}.iss-assembly-stage svg{display:block;width:100%;height:auto}.iss-location-strip{display:flex;align-items:center;gap:4px;margin:0 0 10px;padding:7px 9px;overflow-x:auto;border:1px solid var(--iss-line);border-radius:12px;background:rgba(2,6,23,.35)}.iss-location-node{flex:0 0 auto;display:flex;align-items:center;gap:4px;color:#64748b;font-size:9px;font-weight:800}.iss-location-node.is-current{color:#7dd3fc}.iss-location-dot{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 9px currentColor}.iss-location-link{width:18px;height:1px;background:#334155}.iss-network-focus{display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;border-top:1px solid rgba(148,163,184,.14)}.iss-network-focus button{min-height:32px;padding:5px 9px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.34);color:#cbd5e1;font-size:10px;font-weight:800;cursor:pointer}.iss-network-focus button[aria-pressed="true"]{border-color:#38bdf8;background:rgba(14,165,233,.18);color:#bae6fd;box-shadow:inset 0 -2px 0 #38bdf8}.iss-network-detail{padding:0 10px 9px;color:#a9b8cb;font-size:10.5px;line-height:1.45}.iss-reference-key i{height:0!important;background:transparent!important;border-top:2px dashed #94a3b8}.iss-mission-replay{margin-top:10px;padding:10px;border:1px solid rgba(129,140,248,.24);border-radius:12px;background:rgba(30,27,75,.18)}.iss-replay-heading{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;margin-bottom:9px}.iss-replay-heading strong{color:#c7d2fe;font:850 10px ui-monospace,monospace;letter-spacing:.7px}.iss-replay-heading span{color:#94a3b8;font-size:10px}.iss-replay-lane{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.iss-replay-lane:before{content:"";position:absolute;left:8%;right:8%;top:13px;height:2px;background:linear-gradient(90deg,#fbbf24,#fde68a,#818cf8,#38bdf8)}.iss-replay-lane button{position:relative;z-index:1;display:grid;justify-items:center;gap:2px;padding:3px 4px 6px;border:0;background:transparent;color:#cbd5e1;cursor:pointer}.iss-replay-lane button i{width:10px;height:10px;border:2px solid #818cf8;border-radius:50%;background:#0b1026;box-shadow:0 0 8px rgba(129,140,248,.5)}.iss-replay-lane button[aria-pressed="true"] i{background:#7dd3fc;border-color:#e0f2fe;box-shadow:0 0 11px #38bdf8}.iss-replay-lane strong{font:850 9.5px ui-monospace,monospace}.iss-replay-lane span{font-size:9.5px;font-weight:800;text-align:center}.iss-replay-lane small{color:#7f91a8;font-size:9px;text-align:center}.iss-map-controls{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.iss-map-controls button{min-height:36px;padding:6px 9px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.42);color:#cbd5e1;font-size:10.5px;font-weight:800;cursor:pointer}.iss-map-controls button[aria-pressed="true"]{border-color:#38bdf8;background:rgba(14,165,233,.16);color:#bae6fd;box-shadow:inset 0 -2px 0 #38bdf8}.iss-hud-selection{color:#fef3c7;border-color:rgba(251,191,36,.35)}.iss-orientation-cue{flex:0 0 auto;padding:2px 4px;color:#fbbf24;font:850 8px ui-monospace,monospace;letter-spacing:.6px}.iss-hatch-enter{animation:iss-hatch-enter .34s ease-out}.iss-assembly-new{animation:iss-install-pulse 1.8s ease-in-out infinite}.iss-assembly-controls{padding:0 12px 12px}.iss-assembly-controls label{display:flex;justify-content:space-between;color:#cbd5e1;font-size:11px;font-weight:800}.iss-assembly-controls label strong{color:#7dd3fc}.iss-assembly-controls input{width:100%;margin:8px 0;accent-color:#38bdf8}.iss-assembly-stepper{display:grid;grid-template-columns:1fr auto 1fr;gap:7px;align-items:center}.iss-assembly-stepper button{min-height:34px;border:1px solid #475569;border-radius:8px;background:rgba(2,6,23,.36);color:#cbd5e1;font-size:10.5px;font-weight:800;cursor:pointer}.iss-assembly-stepper button:disabled{opacity:.42;cursor:not-allowed}.iss-assembly-stepper span{color:#94a3b8;font:800 10px ui-monospace,monospace}.iss-timeline-item.is-active{margin-left:-8px;padding-left:8px!important;border-left:3px solid #38bdf8;background:linear-gradient(90deg,rgba(14,165,233,.12),transparent)}.iss-ops-presets small,.iss-ops-metric small,.iss-ops-metric-label,.iss-orbit-readout{font-size:9.5px}@keyframes iss-hatch-enter{from{opacity:.25;transform:scale(.94);filter:brightness(.55)}to{opacity:1;transform:scale(1);filter:brightness(1)}}@keyframes iss-install-pulse{50%{filter:drop-shadow(0 0 7px #7dd3fc)}}' +
          '@media (max-width:760px){.iss-ops-presets{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-modes{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-ops-grid{grid-template-columns:1fr}.iss-ops-hero{grid-template-columns:1fr}.iss-ops-health{display:none}}@media (max-width:520px){.iss-rule-status{grid-template-columns:auto 1fr}.iss-rule-status button{grid-column:1/-1;width:100%}.iss-replay-lane{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-replay-lane:before{display:none}.iss-hud-selection{display:none}}@media (max-width:420px){.iss-emergency-grid{grid-template-columns:1fr}.iss-orbit-readout{gap:4px 8px}}' +          '.iss-float{animation:iss-drift 4s ease-in-out infinite alternate}@keyframes iss-drift{from{transform:translate(0,-3px) rotate(-1deg)}to{transform:translate(7px,4px) rotate(2deg)}}@keyframes iss-pulse{50%{opacity:.48;box-shadow:0 0 0 7px rgba(74,222,128,0),0 0 22px #4ade80}}.iss-live-dot{animation:iss-pulse 2.4s ease-in-out infinite}' +
          '@media (max-width:760px){.iss-root{padding:12px;border-radius:18px}.iss-hero{grid-template-columns:1fr}.iss-orbit-mark{display:none}.iss-status-strip{grid-template-columns:1fr 1fr}.iss-tablist{grid-template-columns:repeat(2,minmax(0,1fr))}.iss-interior-layout{grid-template-columns:1fr}.iss-panel{padding:11px}.iss-hud-chip:nth-child(2){display:none}}@media (max-width:420px){.iss-status-value{font-size:10.5px}.iss-tab{font-size:10.5px!important;min-height:40px}.iss-stage-help{white-space:normal;width:calc(100% - 24px);text-align:center}.iss-route{grid-template-columns:1fr 1fr!important}}' +
          '@media (forced-colors: active){.iss-root,.iss-panel,.iss-card,.iss-tablist,.iss-route{background:Canvas!important;color:CanvasText!important;border-color:CanvasText!important;box-shadow:none!important}.iss-root:before,.iss-card:after{display:none}.iss-root button{forced-color-adjust:auto}}@media (prefers-contrast: more){.iss-root{--iss-line:rgba(226,232,240,.58)}.iss-panel,.iss-card,.iss-tablist{backdrop-filter:none}.iss-status-label{color:#cbd5e1}}@media (prefers-reduced-motion: reduce){.iss-root *{animation:none!important;transition:none!important}}'
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
          scene.background = new THREE.Color(0x030712);
          scene.fog = new THREE.FogExp2(0x030712, 0.0055);
          var camera = new THREE.PerspectiveCamera(46, Wc / Hc, 0.1, 220);
          camera.position.set(8.2, 4.8, 10.4);
          camera.lookAt(0, 0, 1);
          scene.add(new THREE.HemisphereLight(0x9bdcff, 0x081225, 0.65));
          scene.add(new THREE.AmbientLight(0x7288aa, 0.32));
          var sun = new THREE.DirectionalLight(0xfff3da, 1.65);
          sun.position.set(10, 7, 5); sun.castShadow = true;
          sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
          sun.shadow.camera.left = -13; sun.shadow.camera.right = 13; sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13;
          scene.add(sun);
          var rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
          rim.position.set(-8, -2, -9); scene.add(rim);
          // Earth below (big soft sphere, out of frame mostly)
          // Tighter specular highlight = the ocean sun-glint that shows up in
          // almost every real Cupola photograph (shininess 16 smeared it flat).
          var earth = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 40), new THREE.MeshPhongMaterial({ color: 0x185a92, emissive: 0x061a38, specular: 0xa8e4ff, shininess: 46 }));
          earth.position.set(0, -34.5, 0); earth.receiveShadow = true;
          scene.add(earth);
          var cloudShell = new THREE.Mesh(new THREE.SphereGeometry(30.18, 64, 40), new THREE.MeshPhongMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.055, depthWrite: false, shininess: 4 }));
          cloudShell.position.copy(earth.position); scene.add(cloudShell);
          // Two additive back-side shells give the limb the "thin blue line":
          // a wide outer scatter halo plus a tight, brighter airglow band right
          // at the top of the atmosphere. Additive so the bloom pass finds them.
          var atmo = new THREE.Mesh(new THREE.SphereGeometry(30.65, 64, 40), new THREE.MeshBasicMaterial({ color: 0x67c8ff, transparent: true, opacity: 0.15, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          atmo.position.copy(earth.position);
          scene.add(atmo);
          var airglow = new THREE.Mesh(new THREE.SphereGeometry(30.3, 64, 40), new THREE.MeshBasicMaterial({ color: 0xbfeeff, transparent: true, opacity: 0.3, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          airglow.position.copy(earth.position);
          scene.add(airglow);
          // Stars
          var starGeo = new THREE.BufferGeometry();
          var starPos = new Float32Array(620 * 3);
          for (var si = 0; si < 620; si++) {
            var sv = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.2), (Math.random() - 0.5)).normalize().multiplyScalar(90);
            starPos[si * 3] = sv.x; starPos[si * 3 + 1] = sv.y; starPos[si * 3 + 2] = sv.z;
          }
          starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
          scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdbeafe, size: 0.3, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending })));

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
            else if (e.key === 'Home') cv._issSetView('overview');
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
              nadir: { camera: [0, -11.5, 2.5], target: [0, 0, .5], rotation: [0, 0, 0] }
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
          var _lastFrameSig = '';

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
              cloudShell.rotation.y += 0.00015;
              var sa = tick * 0.002;
              sun.position.set(Math.cos(sa) * 10, 6, Math.sin(sa) * 10); // day/night lighting sweep
              sun.intensity = 0.55 + 0.7 * Math.max(0, Math.cos(sa));    // orbital "night" dims the station
            }
            // Sunlit-vs-eclipsed drives two real, teachable details: an array only
            // flashes when its tracking joint has brought it face-on to the Sun
            // (that is WHY the alpha joints rotate), and the station's lit windows
            // only stand out once the Sun has set. Both go quiet during eclipse,
            // because in eclipse there is no sunlight to reflect.
            var daylight01 = Math.max(0, Math.min(1, (sun.intensity - 0.55) / 0.7));
            _sunDir.copy(sun.position).normalize();
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
                '|' + Wc + 'x' + Hc + '|' + (composer ? 1 : 0);
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

      // ── Orbit Lab math (real physics) ──
      var GM = 398600.4418; // km^3/s^2
      var R_EARTH = 6371;   // km
      var orbitAlt = Math.max(200, Math.min(2000, Number(d.orbitAlt) || 420));
      var orbitR = R_EARTH + orbitAlt;
      var orbitV = Math.sqrt(GM / orbitR);                       // km/s
      var orbitT = (2 * Math.PI * orbitR / orbitV) / 60;         // minutes
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
          upd({ dockResult: result, dockMsg: msg, dockWins: wins, dockRuns: (d.dockRuns || 0) + 1 });
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
            if (speed <= 0.6 && Math.abs(st.x) < 2.5) endRun('docked', __alloT('stem.spacestation.dock_win', 'Soft capture! Contact at ' + speed.toFixed(2) + ' m/s — gentle enough for the docking latches.'));
            else endRun('bonk', __alloT('stem.spacestation.dock_bonk', 'Contact too fast or off-axis (' + speed.toFixed(2) + ' m/s). Real vehicles would abort long before this — try arriving under 0.6 m/s, centered.'));
          } else if (range > 420 || st.fuel <= 0 && speed < 0.05 && range > 60) {
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
          var stopDistance = navSpeed * navSpeed / (2 * ACCEL);
          if (navSpeed > .02) {
            var stopX = px + st.vy / navSpeed * stopDistance * sc, stopY = py - st.vx / navSpeed * stopDistance * sc;
            ctx2.strokeStyle = '#fbbf24'; ctx2.lineWidth = 1.3; ctx2.beginPath(); ctx2.moveTo(stopX - 5, stopY); ctx2.lineTo(stopX + 5, stopY); ctx2.moveTo(stopX, stopY - 5); ctx2.lineTo(stopX, stopY + 5); ctx2.stroke();
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
          ctx2.fillStyle = speed > 0.6 && range < 40 ? '#fbbf24' : '#86efac'; ctx2.font = '800 9px ui-monospace, monospace'; ctx2.textAlign = 'right'; ctx2.fillText(speed > 0.6 && range < 40 ? 'HIGH CLOSING RATE' : 'SOFT CAPTURE ≤ 0.60 M/S', Wc - 12, 20); ctx2.fillStyle = '#fde68a'; ctx2.fillText('BRAKING DISTANCE ' + stopDistance.toFixed(1) + ' M', Wc - 12, 34); ctx2.textAlign = 'left';
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
        var milestones = { m100: false, m40: false };
        function updateHudMirror() {
          // Text mirror of the canvas HUD (WCAG 1.1.1) — imperative textContent
          // update, so no per-frame React state churn. aria-live stays "off":
          // continuous telemetry would swamp a screen reader; milestone
          // announcements below carry the key moments instead.
          if (!cv._issHud) cv._issHud = (cv.parentElement && cv.parentElement.parentElement) ? cv.parentElement.parentElement.querySelector('[data-dock-hud]') : null;
          var el = cv._issHud;
          if (!el) return;
          var range = Math.sqrt(st.x * st.x + st.y * st.y), speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          el.textContent = 'Range ' + range.toFixed(0) + ' m · closing speed ' + speed.toFixed(2) + ' m/s · fuel ' + st.fuel.toFixed(0) + '%' + (st.over ? ' · run over' : '');
          if (!st.over) {
            if (!milestones.m100 && range < 100) { milestones.m100 = true; announceToSR('100 meters to the port. Speed ' + speed.toFixed(2) + ' meters per second.'); }
            if (!milestones.m40 && range < 40) { milestones.m40 = true; announceToSR('Final approach, 40 meters. Dock slower than 0.6 meters per second.'); }
          }
        }
        cv._dockResetMilestones = function () { milestones.m100 = false; milestones.m40 = false; };
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
          var k = e.key;
          if (k === 'ArrowUp' || k === 'w') { setThrust('up', on); e.preventDefault(); }
          else if (k === 'ArrowDown' || k === 's') { setThrust('down', on); e.preventDefault(); }
          else if (k === 'ArrowRight' || k === 'd') { setThrust('fwd', on); e.preventDefault(); }
          else if (k === 'ArrowLeft' || k === 'a') { setThrust('back', on); e.preventDefault(); }
        }
        var kd = function (e) { onKey(e, true); }, ku = function (e) { onKey(e, false); };
        cv.addEventListener('keydown', kd); cv.addEventListener('keyup', ku);
        function cleanup() {
          cancelAnimationFrame(rafId);
          cv.removeEventListener('keydown', kd); cv.removeEventListener('keyup', ku);
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
          evaLog('⚠ Moved WITHOUT clipping ahead — one slip and you are a satellite. Safety violation: −12% O₂ (sim penalty).', 12, {});
          if ((evaS.o2 - 12) <= 0) evaUpd({ done: true, failMsg: __alloT('stem.spacestation.eva_o2_out', 'Suit consumables exhausted — EVA aborted. Real spacewalks budget every breath; try a cleaner run.') });
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
          evaUpd({ bolts: 4, done: true, failMsg: '' });
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
        return h('div', { className: 'iss-learning-visual iss-eva-visual' },
          h('svg', { viewBox: '0 0 640 190', role: 'img', 'aria-label': 'Spacewalk route. Astronaut at ' + EVA_RAILS[position] + '. Tether A at ' + EVA_RAILS[evaS.tetherA || 0] + '. Tether B at ' + EVA_RAILS[evaS.tetherB || 0] + '. Suit consumables ' + oxygen + ' percent. Projected at worksite ' + projectedOxygen + ' percent. ' + tetherStatus + '.' },
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
            h('rect', { x: 455, y: 16, width: 151, height: 25, rx: 8, fill: 'rgba(2,6,23,.72)', stroke: 'rgba(148,163,184,.3)' }),
            h('rect', { x: 465, y: 27, width: 122, height: 5, rx: 3, fill: '#263449' }),
            h('rect', { x: 465, y: 27, width: 1.22 * oxygen, height: 5, rx: 3, fill: oxygen > 40 ? '#4ade80' : oxygen > 15 ? '#fbbf24' : '#f87171' }),
            h('text', { x: 465, y: 24, fill: '#cbd5e1', fontSize: 8, fontWeight: 800 }, 'SUIT CONSUMABLES ' + oxygen.toFixed(0) + '%'),
            h('text', { x: 22, y: 25, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'EVA ROUTE // TWO-TETHER PROTOCOL')),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'Blue = tether A  /  Gold = tether B'), h('span', null, evaS.started ? tetherStatus + ' · PROJECTED ' + projectedOxygen.toFixed(0) + '%' : 'AIRLOCK READY')));
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

      function renderMissions() {
        var dockRealMode = d.dockRealMode !== false;
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.missions_intro', 'Two hands-on missions. Both are simplified but honest: the docking sim runs the real relative-motion equations (with orbit effects sped up so you can feel them), and the spacewalk enforces the real two-tether safety rule.')),

          card('🚀 ' + __alloT('stem.spacestation.mission_dock', 'Mission 1 — Dock the cargo capsule'),
            h('div', null,
              h('p', { style: { fontSize: 12, color: SOFT, lineHeight: 1.55, margin: '0 0 8px' } },
                __alloT('stem.spacestation.dock_help', 'Fly the capsule (left side) onto the glowing port. Arrow keys / WASD or the buttons: → thrusts forward, ← brakes, ↑/↓ steer radially. Dock slower than 0.6 m/s, inside the corridor. With ORBITAL PHYSICS ON, watch the counter-intuitive part: thrusting forward also pushes you upward off the approach line — orbits are not roads.')),
              h('canvas', {
                className: 'iss-dock-canvas',
                ref: function (cv) { if (cv) { cv._dockRealMode = dockRealMode; dockingCanvasRef(cv); } },
                'data-dock-canvas': 'true',
                tabIndex: 0, role: 'application',
                'aria-label': __alloT('stem.spacestation.dock_aria', 'Docking simulator. Use arrow keys or W A S D to thrust. Goal: reach the docking port slower than 0.6 meters per second. Status is shown in the mission report below.'),
                style: { width: '100%', maxWidth: 640, display: 'block', margin: '0 auto', borderRadius: 12, border: '1px solid #334155', background: '#050a18', cursor: 'crosshair' }
              }),
              h('div', { role: 'group', 'aria-label': 'Thruster controls', style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 } },
                [['back', '←', 'Brake'], ['up', '↑', 'Radial out'], ['down', '↓', 'Radial in'], ['fwd', '→', 'Forward']].map(function (b) {
                  function press(on) { return function (e) { e.preventDefault(); var cv = document.querySelector('[data-dock-canvas]') || e.currentTarget.parentElement.parentElement.querySelector('canvas'); if (cv && cv._dockSetThrust) cv._dockSetThrust(b[0], on); }; }
                  return h('button', { key: b[0], type: 'button', 'aria-label': 'Thrust ' + b[2], onPointerDown: press(true), onPointerUp: press(false), onPointerLeave: press(false), style: { padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: 'pointer', background: PANEL, color: TEXT, border: '1px solid #475569', touchAction: 'none' } }, b[1] + ' ', h('span', { style: { fontSize: 10, fontWeight: 600, color: SOFT } }, b[2]));
                })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 } },
                h('button', { type: 'button', onClick: function (e) { var cv = e.currentTarget.parentElement.parentElement.querySelector('canvas'); if (cv && cv._dockReset) cv._dockReset(dockRealMode); upd({ dockResult: null, dockMsg: '' }); }, style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, '🔁 ' + __alloT('stem.spacestation.dock_retry', 'New approach')),
                h('button', { type: 'button', 'aria-pressed': dockRealMode, onClick: function (e) { var next = !dockRealMode; var cv = e.currentTarget.parentElement.parentElement.querySelector('canvas'); upd({ dockRealMode: next, dockResult: null, dockMsg: '' }); if (cv && cv._dockReset) cv._dockReset(next); }, style: { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: dockRealMode ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.12)', color: dockRealMode ? '#4ade80' : '#fbbf24', border: '1px solid ' + (dockRealMode ? '#22c55e' : '#fbbf24') } }, dockRealMode ? '🧲 ' + __alloT('stem.spacestation.dock_real_on', 'Orbital physics ON') : '🎮 ' + __alloT('stem.spacestation.dock_real_off', 'Video-game mode (physics OFF)'))),
              d.dockMsg ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + (d.dockResult === 'docked' ? '#22c55e' : '#fbbf24'), fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: d.dockResult === 'docked' ? '#4ade80' : '#fbbf24' } }, __alloT('stem.spacestation.mission_report', 'Mission report: ')), d.dockMsg,
                (d.dockRuns || 0) > 0 ? h('span', { style: { color: SOFT } }, '  (' + (d.dockWins || 0) + '/' + d.dockRuns + ' docked)') : null) : null,
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
                  evaS.failMsg || __alloT('stem.spacestation.eva_win', '✅ Pump secured with ' + evaS.o2.toFixed(0) + '% consumables to spare. Real EVAs run 6-8 hours with the same discipline you just practiced: clip, verify, move, repeat — hundreds of times.')) : null
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
        var nextIncomplete = INTERIOR_ROOMS.findIndex(function (candidate) { return !done[candidate.id]; });
        var choiceId = (d.interiorChoices || {})[room.id];
        var pickedChoice = room.choices.find(function (c) { return c.id === choiceId; });
        var discoveryPrefix = room.id + ':';
        var selectedDiscovery = String(d.interiorDiscovery || '').indexOf(discoveryPrefix) === 0 ? parseInt(String(d.interiorDiscovery).split(':')[1], 10) : -1;

        function visitRoom(index) {
          var safe = Math.max(0, Math.min(INTERIOR_ROOMS.length - 1, index));
          var next = INTERIOR_ROOMS[safe];
          var seen = Object.assign({}, d.interiorSeen || {}); seen[next.id] = true;
          upd({ interiorRoom: next.id, interiorSeen: seen, interiorDiscovery: null });
          announceToSR(next.name + '. ' + next.zone + '.');
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
            h('label', { htmlFor: 'iss-lowg-impulse', style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: TEXT, fontSize: 11.5, fontWeight: 800 } }, h('span', null, 'Push impulse'), h('span', { style: { color: room.color }, 'aria-live': 'polite' }, impulse.toFixed(0) + ' N·s')),
            h('input', { id: 'iss-lowg-impulse', type: 'range', min: 2, max: 22, step: 1, value: impulse, onChange: function (e) { upd({ lowGImpulse: Number(e.target.value), lowGResult: null }); }, 'aria-describedby': 'iss-lowg-explain', style: { width: '100%', accentColor: room.color, margin: '8px 0 5px' } }),
            h('div', { style: { position: 'relative', height: 18, borderRadius: 9, background: 'linear-gradient(90deg,#475569 0 25%,#22c55e 25% 70%,#ef4444 70% 100%)', border: '1px solid #64748b' }, 'aria-hidden': 'true' },
              h('div', { style: { position: 'absolute', left: '25%', top: -4, bottom: -4, width: '45%', border: '1px dashed #bbf7d0', borderRadius: 8 } }),
              h('div', { className: 'iss-float', style: { position: 'absolute', left: 'calc(' + ((impulse - 2) / 20 * 100).toFixed(1) + '% - 9px)', top: -3, width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#f8fafc', color: '#0f172a', fontSize: 13, boxShadow: '0 0 0 2px #0f172a' } }, '🧑‍🚀')),
            h('div', { id: 'iss-lowg-explain', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 } },
              [['Predicted speed', speed.toFixed(2) + ' m/s'], ['2.5 m travel time', travelTime.toFixed(1) + ' s']].map(function (metric, i) { return h('div', { key: i, style: { padding: 6, borderRadius: 7, background: '#0f172a', border: '1px solid #334155' } }, h('div', { style: { color: SOFT, fontSize: 9, textTransform: 'uppercase' } }, metric[0]), h('strong', { style: { color: '#d1fae5', fontSize: 12 } }, metric[1])); })),
            h('p', { style: { color: SOFT, fontSize: 10.5, lineHeight: 1.45, margin: '7px 0' } }, 'Model: Δv = impulse ÷ 70 kg. The green band balances useful travel time with a controllable arrival.'),
            h('button', { type: 'button', onClick: runTranslation, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: '#10b981', color: '#022c22', fontWeight: 900, fontSize: 11.5, cursor: 'pointer' } }, '🫸 Push off and test'),
            result ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, color: TEXT, fontSize: 11.5, lineHeight: 1.5, background: result.success ? 'rgba(34,197,94,.12)' : 'rgba(251,191,36,.12)', borderLeft: '3px solid ' + (result.success ? '#22c55e' : '#fbbf24') } }, h('strong', { style: { color: result.success ? '#4ade80' : '#fbbf24' } }, result.success ? 'Controlled arrival: ' : 'Flight result: '), result.feedback) : null
          );
        }
        function renderResearchProcedure() {
          var step = Math.max(0, Math.min(3, Number(d.researchStep || 0)));
          var procedure = [
            ['1', 'Secure the sample', 'Latch the plant chamber inside the glovebox so water and biological material stay contained.'],
            ['2', 'Prime the wick', 'Inject water into the porous wick until capillary action reaches the root pillow.'],
            ['3', 'Start camera + baseline', 'Begin time-lapse imaging and record temperature before changing the experiment.']
          ];
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
            procedure.map(function (item, i) { var complete = i < step || roomDone; var current = i === step && !roomDone; return h('button', { key: i, type: 'button', disabled: complete, onClick: function () { runStep(i); }, style: { textAlign: 'left', padding: 8, borderRadius: 8, border: '1px solid ' + (complete ? '#22c55e' : current ? room.color : '#475569'), background: complete ? 'rgba(34,197,94,.12)' : current ? room.color + '16' : 'rgba(2,6,23,.35)', color: TEXT, cursor: complete ? 'default' : 'pointer', opacity: !complete && !current ? .72 : 1 } }, h('strong', { style: { color: complete ? '#4ade80' : current ? room.color : SOFT, fontSize: 11.5 } }, (complete ? '✓ ' : item[0] + '. ') + item[1]), h('span', { style: { display: 'block', color: SOFT, fontSize: 10, lineHeight: 1.45, marginTop: 3 } }, item[2])); }),
            d.researchFeedback ? h('div', { role: 'status', 'aria-live': 'polite', style: { padding: 8, borderRadius: 8, background: roomDone ? 'rgba(34,197,94,.1)' : 'rgba(14,165,233,.08)', borderLeft: '3px solid ' + (roomDone ? '#22c55e' : room.color), color: TEXT, fontSize: 11, lineHeight: 1.5 } }, d.researchFeedback) : null
          );
        }
        function renderMaintenanceConsole() {
          var sensors = [
            ['Fan motor current', 'NORMAL', 'The fan motor is powered and drawing its expected current. The motor itself is probably healthy.'],
            ['Inlet pressure drop', 'HIGH', 'Pressure is much higher before the inlet than after it — evidence that airflow is meeting a blockage.'],
            ['Cabin CO₂ trend', 'RISING', 'Scrubbing hardware may be healthy, but cabin air is not reaching it quickly enough.']
          ];
          var checks = d.maintenanceChecks || {};
          var checkedCount = sensors.filter(function (_, i) { return !!checks[i]; }).length;
          var reading = d.maintenanceReading == null ? -1 : Number(d.maintenanceReading);
          function inspectSensor(index) {
            var next = Object.assign({}, checks); next[index] = true;
            upd({ maintenanceChecks: next, maintenanceReading: index });
            announceToSR(sensors[index][0] + ': ' + sensors[index][1] + '. ' + sensors[index][2]);
          }
          return h('div', { 'data-iss-maintenance-console': 'true' },
            h('div', { role: 'group', 'aria-label': 'Life-support telemetry channels', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(82px,1fr))', gap: 5 } }, sensors.map(function (sensor, i) { var checked = !!checks[i]; return h('button', { key: i, type: 'button', 'aria-pressed': checked, onClick: function () { inspectSensor(i); }, style: { minWidth: 0, padding: 7, borderRadius: 8, textAlign: 'left', border: '1px solid ' + (checked ? room.color : '#475569'), background: checked ? room.color + '16' : 'rgba(2,6,23,.38)', color: TEXT, cursor: 'pointer' } }, h('span', { style: { display: 'block', color: SOFT, fontSize: 8.5, lineHeight: 1.25 } }, (checked ? '✓ ' : '') + sensor[0]), h('strong', { style: { display: 'block', color: sensor[1] === 'NORMAL' ? '#4ade80' : '#fbbf24', fontSize: 11, marginTop: 3 } }, sensor[1])); })),
            reading >= 0 && sensors[reading] ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 6, padding: 7, borderRadius: 7, background: 'rgba(251,191,36,.08)', color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, h('strong', { style: { color: '#fbbf24' } }, sensors[reading][0] + ': '), sensors[reading][2]) : h('p', { style: { color: SOFT, fontSize: 10, margin: '6px 0 0' } }, 'Inspect at least two channels before commanding maintenance.'),
            h('div', { role: 'group', 'aria-label': 'Maintenance actions', style: { display: 'grid', gap: 5, marginTop: 8 } }, room.choices.map(function (choice) { var picked = choiceId === choice.id; return h('button', { key: choice.id, type: 'button', disabled: checkedCount < 2 || roomDone, onClick: function () { chooseInterior(choice); }, style: { textAlign: 'left', padding: '7px 8px', borderRadius: 8, border: '1px solid ' + (roomDone && choice.correct ? '#22c55e' : picked ? room.color : '#475569'), background: roomDone && choice.correct ? 'rgba(34,197,94,.14)' : picked ? room.color + '16' : 'rgba(2,6,23,.35)', color: TEXT, fontSize: 10.5, fontWeight: 750, cursor: checkedCount < 2 || roomDone ? 'not-allowed' : 'pointer', opacity: checkedCount < 2 ? .45 : roomDone && !choice.correct ? .5 : 1 } }, (roomDone && choice.correct ? '✓ ' : '') + choice.label); })),
            pickedChoice ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 7, padding: 7, borderRadius: 7, background: pickedChoice.correct ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.1)', borderLeft: '3px solid ' + (pickedChoice.correct ? '#22c55e' : '#fbbf24'), color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, pickedChoice.feedback) : null
          );
        }
        function renderCrewNotebook() {
          var prompts = {
            harmony: 'What design choice makes an ordinary morning routine different in freefall?',
            destiny: 'What evidence would show that capillary watering helped the plant?',
            tranquility: 'Which telemetry reading most strongly supported your diagnosis, and why?',
            unity: 'How did changing impulse affect arrival speed and travel time?',
            cupola: 'What procedure protects the view, and what risk does it manage?'
          };
          var notes = d.interiorNotes || {};
          var value = String(notes[room.id] || '');
          return h('details', { 'data-iss-crew-notebook': room.id, style: { margin: '12px 0', padding: '8px 10px', borderRadius: 10, background: 'rgba(15,23,42,.6)', border: '1px solid #334155' } },
            h('summary', { style: { color: TEXT, fontSize: 11.5, fontWeight: 850, cursor: 'pointer' } }, '📓 Crew notebook', value.trim() ? h('span', { style: { marginLeft: 7, color: '#4ade80', fontSize: 9.5 } }, '• observation saved') : h('span', { style: { marginLeft: 7, color: SOFT, fontSize: 9.5 } }, '• optional reflection')),
            h('p', { style: { color: SOFT, fontSize: 10.5, lineHeight: 1.45, margin: '8px 0 5px' } }, prompts[room.id]),
            h('textarea', { value: value, rows: 2, maxLength: 240, onChange: function (e) { var next = Object.assign({}, notes); next[room.id] = String(e.target.value || '').slice(0, 240); upd({ interiorNotes: next }); }, 'aria-label': 'Crew notebook observation for ' + room.name, placeholder: 'Record an observation, claim, or question…', style: { width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 8, borderRadius: 8, border: '1px solid #475569', background: '#020617', color: TEXT, fontFamily: 'inherit', fontSize: 11.5, lineHeight: 1.45 } }),
            h('div', { style: { textAlign: 'right', color: SOFT, fontSize: 9, marginTop: 3 }, 'aria-live': 'polite' }, value.length + ' / 240')
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
          return h('div', { 'data-iss-cabin-stow': 'true' },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 } }, h('strong', { style: { color: TEXT, fontSize: 11 } }, 'Loose-item scan'), h('span', { role: 'status', 'aria-live': 'polite', style: { color: stowedCount === items.length ? '#4ade80' : room.color, fontSize: 10, fontWeight: 800 } }, stowedCount + ' / ' + items.length + ' secured')),
            h('div', { role: 'group', 'aria-label': 'Cabin items to secure', style: { display: 'grid', gap: 6 } }, items.map(function (item) { var secure = !!stowed[item[0]]; return h('button', { key: item[0], type: 'button', disabled: secure || roomDone, onClick: function () { secureItem(item); }, style: { display: 'grid', gridTemplateColumns: '28px 1fr', gap: 7, textAlign: 'left', padding: 8, borderRadius: 8, border: '1px solid ' + (secure ? '#22c55e' : '#475569'), background: secure ? 'rgba(34,197,94,.12)' : 'rgba(2,6,23,.38)', color: TEXT, cursor: secure || roomDone ? 'default' : 'pointer' } }, h('span', { style: { fontSize: 19 }, 'aria-hidden': 'true' }, secure ? '✓' : item[1]), h('span', null, h('strong', { style: { display: 'block', color: secure ? '#4ade80' : TEXT, fontSize: 11 } }, item[2] + ' — ' + item[3]), h('span', { style: { display: 'block', color: SOFT, fontSize: 9.5, lineHeight: 1.4, marginTop: 2 } }, item[4]))); })),
            roomDone ? h('div', { role: 'status', style: { marginTop: 7, padding: 7, borderRadius: 7, background: 'rgba(34,197,94,.1)', color: '#bbf7d0', fontSize: 10.5 } }, 'Cabin clear ✓ Air return unobstructed ✓ Morning stow logged') : null
          );
        }
        function renderCupolaObservation() {
          var targets = {
            day: { icon: '🌀', label: 'Cloud vortex', mode: 'Daylight • fast shutter', color: '#38bdf8', note: 'Cloud-band rotation reveals the storm’s structure; repeated images let scientists compare its growth and direction.' },
            aurora: { icon: '🟢', label: 'Aurora curtain', mode: 'Low light • steady camera', color: '#4ade80', note: 'Aurora traces charged particles guided by Earth’s magnetic field into the upper atmosphere.' },
            night: { icon: '🌃', label: 'City lights', mode: 'Night • long exposure', color: '#fbbf24', note: 'Night imagery maps settlement patterns, power outages, fires, and changes in human activity.' }
          };
          var targetId = targets[d.cupolaTarget] ? d.cupolaTarget : 'day';
          var target = targets[targetId];
          var captured = !!d.cupolaCaptured;
          var shutters = !!d.cupolaShutters;
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
            h('div', { style: { position: 'relative', height: 92, overflow: 'hidden', display: 'grid', placeItems: 'center', borderRadius: 10, background: shutters ? '#334155' : 'radial-gradient(circle at 50% 115%,' + target.color + ',#07101f 68%)', border: '2px solid ' + (shutters ? '#64748b' : target.color) } },
              shutters ? h('div', { style: { position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,#334155 0 12px,#475569 12px 15px)' } }) : null,
              h('div', { className: shutters ? '' : 'iss-float', style: { position: 'relative', zIndex: 1, textAlign: 'center' } }, h('div', { style: { fontSize: 30 }, 'aria-hidden': 'true' }, shutters ? '🛡️' : target.icon), h('strong', { style: { display: 'block', color: shutters ? '#cbd5e1' : '#f8fafc', fontSize: 11 } }, shutters ? 'WINDOW SHUTTERS CLOSED' : target.label))),
            h('div', { role: 'group', 'aria-label': 'Earth observation targets', style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginTop: 7 } }, Object.keys(targets).map(function (id) { var t = targets[id], active = id === targetId; return h('button', { key: id, type: 'button', disabled: roomDone, 'aria-pressed': active, onClick: function () { selectTarget(id); }, style: { minWidth: 0, padding: 6, borderRadius: 7, border: '1px solid ' + (active ? t.color : '#475569'), background: active ? t.color + '18' : 'rgba(2,6,23,.35)', color: active ? '#f8fafc' : SOFT, fontSize: 9.5, fontWeight: 800, cursor: roomDone ? 'default' : 'pointer' } }, t.icon + ' ' + t.label); })),
            h('div', { style: { marginTop: 6, padding: 7, borderRadius: 7, background: 'rgba(2,6,23,.4)', border: '1px solid #334155', color: TEXT, fontSize: 10 } }, h('strong', { style: { color: target.color } }, 'Camera plan: '), target.mode),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 7 } },
              h('button', { type: 'button', disabled: roomDone || shutters, onClick: captureTarget, style: { padding: 8, borderRadius: 8, border: '1px solid ' + target.color, background: captured ? target.color + '20' : 'rgba(2,6,23,.35)', color: TEXT, fontSize: 10.5, fontWeight: 850, cursor: roomDone || shutters ? 'default' : 'pointer' } }, captured ? '✓ Image captured' : '📷 Capture image'),
              h('button', { type: 'button', disabled: !captured || roomDone, onClick: closeObservation, style: { padding: 8, borderRadius: 8, border: '1px solid ' + (captured ? '#818cf8' : '#475569'), background: captured ? 'rgba(129,140,248,.16)' : 'rgba(2,6,23,.25)', color: captured ? '#e0e7ff' : SOFT, fontSize: 10.5, fontWeight: 850, cursor: captured && !roomDone ? 'pointer' : 'not-allowed', opacity: captured ? 1 : .48 } }, shutters ? '✓ Shutters closed' : '🛡️ Close shutters')),
            d.cupolaObservation ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 7, padding: 7, borderRadius: 7, background: target.color + '10', borderLeft: '3px solid ' + target.color, color: TEXT, fontSize: 10.5, lineHeight: 1.45 } }, h('strong', { style: { color: target.color } }, 'Observation: '), d.cupolaObservation) : null
          );
        }
        return h('div', { className: 'iss-interior', 'data-iss-interior': room.id },
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
          h('div', { className: 'iss-location-strip', role: 'status', 'aria-label': 'Current station location: ' + room.name + '. Aft to forward route.' },
            h('span', { className: 'iss-orientation-cue', 'aria-hidden': 'true' }, 'AFT'),
            INTERIOR_ROOMS.map(function (loc, i) { var current = loc.id === room.id; return h(React.Fragment, { key: loc.id }, i ? h('span', { className: 'iss-location-link', 'aria-hidden': 'true' }) : null, h('span', { className: 'iss-location-node' + (current ? ' is-current' : '') }, h('span', { className: 'iss-location-dot', 'aria-hidden': 'true' }), current ? 'YOU: ' + loc.module : loc.module)); }),
            h('span', { className: 'iss-orientation-cue', 'aria-hidden': 'true' }, 'FORWARD')),
          h('div', { className: 'iss-route', role: 'group', 'aria-label': __alloT('stem.spacestation.interior_route', 'Interior station route'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 7, marginBottom: 12 } },
            INTERIOR_ROOMS.map(function (r, i) { var on = r.id === room.id; var finished = !!done[r.id]; var wasVisited = !!visited[r.id]; var roomInspected = [0, 1].filter(function (n) { return !!inspected[r.id + ':' + n]; }).length; return h('button', { className: 'iss-route-button', key: r.id, type: 'button', 'aria-pressed': on, onClick: function () { visitRoom(i); }, style: { minHeight: 64, textAlign: 'left', padding: '8px 9px', borderRadius: 10, cursor: 'pointer', background: on ? r.color + '22' : PANEL, color: TEXT, border: '1px solid ' + (on ? r.color : finished ? '#22c55e' : '#334155') } }, h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, finished ? '✅' : r.icon), h('span', { style: { display: 'block', fontSize: 11.5, fontWeight: 800, marginTop: 3 } }, r.name), h('span', { style: { display: 'block', fontSize: 9.5, color: finished ? '#4ade80' : SOFT, marginTop: 2 } }, finished ? 'Job complete' : roomInspected ? roomInspected + '/2 details inspected' : wasVisited ? 'Visited • ' + r.zone : r.zone)); })),
          h('div', { className: 'iss-interior-layout' },
            h('div', null,
              h('div', { key: room.id, className: 'iss-scene-frame iss-hatch-enter', 'data-iss-room-transition': room.id, style: { position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid ' + room.color, background: 'radial-gradient(circle at 50% 12%,' + room.color + '20,#050a18 72%)' } }, sceneArt(),
                room.discoveries.map(function (spot, i) { var on = selectedDiscovery === i; return h('button', { key: i, type: 'button', 'aria-pressed': on, onClick: function () { inspectInteriorSpot(i); }, style: { position: 'absolute', left: i ? '65%' : '6%', top: i ? '16%' : '57%', maxWidth: '29%', padding: '5px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', background: on ? room.color : 'rgba(2,6,23,0.88)', color: on ? '#04121f' : '#f8fafc', border: '1px solid ' + room.color } }, (inspected[room.id + ':' + i] ? '✓ ' : '') + spot[0]); })),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 } }, h('button', { type: 'button', disabled: roomIdx === 0, onClick: function () { visitRoom(roomIdx - 1); }, style: { padding: '7px 11px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontSize: 11.5, fontWeight: 700, cursor: roomIdx ? 'pointer' : 'not-allowed', opacity: roomIdx ? 1 : 0.45 } }, '← Float aft'), h('button', { type: 'button', disabled: roomIdx === INTERIOR_ROOMS.length - 1, onClick: function () { visitRoom(roomIdx + 1); }, style: { padding: '7px 11px', borderRadius: 8, border: '1px solid #475569', background: PANEL, color: TEXT, fontSize: 11.5, fontWeight: 700, cursor: roomIdx < INTERIOR_ROOMS.length - 1 ? 'pointer' : 'not-allowed', opacity: roomIdx < INTERIOR_ROOMS.length - 1 ? 1 : 0.45 } }, 'Float forward →')),
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
        return h('div', { className: 'iss-ops-control' },
          h('label', { htmlFor: id }, h('span', null, label), h('strong', { style: { color: color } }, Number(value).toFixed(step < 1 ? 1 : 0) + unit)),
          h('input', { id: id, type: 'range', min: min, max: max, step: step, value: value, onChange: function (e) { var patch = { opsScenario: 'custom' }; patch[field] = Number(e.target.value); upd(patch); }, style: { accentColor: color } }));
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
            h('label', { htmlFor: 'iss-orbit-cursor' }, h('span', null, 'Scrub predicted orbit'), h('strong', null, 'T+' + cursorMinute.toFixed(0) + ' MIN')),
            h('input', { id: 'iss-orbit-cursor', type: 'range', min: 0, max: 92, step: 1, value: cursorMinute, 'aria-valuetext': 'T plus ' + cursorMinute.toFixed(0) + ' minutes, ' + phase.toLowerCase(), onChange: function (event) { upd({ opsOrbitMinute: Number(event.target.value) }); }, style: { accentColor: phaseColor } }),
            h('div', { className: 'iss-orbit-readout', role: 'status', 'aria-live': 'polite' }, h('strong', { style: { color: phaseColor } }, phase), h('span', null, 'Battery ' + cursorSample.battery.toFixed(0) + '%'), h('span', null, 'Thermal ' + cursorSample.thermal.toFixed(0) + '%'), h('span', null, 'Attitude ' + cursorSample.attitude.toFixed(0) + '%'))));
      }
      function opsLogEntry(message, patch) {
        var nextLog = (d.opsLog || []).concat(['ORBIT ' + ((d.opsRuns || 0) + 1) + ' // ' + message]).slice(-5);
        upd(Object.assign({ opsLog: nextLog, opsScenario: 'custom' }, patch || {}));
      }
      function renderOpsNetwork(metrics, focus) {
        var nodes = [
          { id: 'power', x: 92, y: 56, label: 'POWER', value: metrics.power.toFixed(0) + '%', color: metrics.power > 25 ? '#fbbf24' : '#f87171' },
          { id: 'air', x: 548, y: 56, label: 'AIR', value: metrics.co2.toFixed(0) + ' ppm', color: metrics.co2 < 1000 ? '#34d399' : '#f87171' },
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
        var load = 68 + crew * 1.6 + research * .22;
        var generation = 132 * Math.sin(arrayAngle * Math.PI / 180);
        var energyIn = generation * (92 - eclipse) / 60;
        var energyOut = load * 92 / 60;
        var orbitDelta = (energyIn - energyOut) / 2.1;
        var projectedBattery = opsClamp(battery + orbitDelta, 0, 100);
        var waterNeed = crew * 3.8;
        var waterReturn = waterNeed * recovery / 100;
        var resupplyWater = waterNeed - waterReturn;
        var oxygenNeed = crew * .84;
        var co2 = opsClamp(350 + crew * 55 + (100 - scrub) * 18, 350, 2500);
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
        var airScore = opsClamp(100 - Math.max(0, co2 - 650) / 12, 0, 100);
        var thermalScore = opsClamp(100 - Math.abs(cabinTemp - 22) * 13, 0, 100);
        var attitudeScore = opsClamp(100 - nextCmg * .65, 0, 100);
        var health = Math.round((powerScore + airScore + recovery + thermalScore + attitudeScore) / 5);
        var healthColor = health >= 75 ? '#4ade80' : health >= 50 ? '#fbbf24' : '#f87171';
        var metrics = { power: projectedBattery, co2: co2, recovery: recovery, temp: cabinTemp, cmg: nextCmg };
        var sunlightMinutes = 92 - eclipse;
        var orbitForecast = [];
        for (var forecastStep = 0; forecastStep <= 24; forecastStep++) {
          var minute = forecastStep / 24 * 92;
          var sunMinutes = Math.min(minute, sunlightMinutes);
          var darkMinutes = Math.max(0, minute - sunlightMinutes);
          var batteryAtMinute = opsClamp(battery + ((generation - load) * sunMinutes - load * darkMinutes) / 60 / 2.1, 0, 100);
          var thermalAtMinute = opsClamp(thermalScore + Math.sin(minute / 92 * Math.PI * 2) * 2 - (minute > sunlightMinutes ? 2 : 0), 0, 100);
          var cmgAtMinute = cmg + attitudeDemand * .55 * minute / 92;
          orbitForecast.push({ minute: minute, battery: batteryAtMinute, thermal: thermalAtMinute, attitude: opsClamp(100 - cmgAtMinute * .65, 0, 100) });
        }
        var nominalForecast = [];
        var nominalLoad = 68 + 7 * 1.6 + 60 * .22;
        var nominalGeneration = 132 * Math.sin(86 * Math.PI / 180);
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
          nominalForecast.push({ minute: nominalMinute, battery: opsClamp(76 + ((nominalGeneration - nominalLoad) * nominalSunMinutes - nominalLoad * nominalDarkMinutes) / 60 / 2.1, 0, 100), thermal: opsClamp(nominalThermalScore + Math.sin(nominalMinute / 92 * Math.PI * 2) * 2 - (nominalMinute > nominalSunlight ? 2 : 0), 0, 100), attitude: opsClamp(100 - nominalCmg * .65, 0, 100) });
        }        var orbitMinute = opsClamp(d.opsOrbitMinute == null ? 0 : d.opsOrbitMinute, 0, 92);
        var cursorSunMinutes = Math.min(orbitMinute, sunlightMinutes);
        var cursorDarkMinutes = Math.max(0, orbitMinute - sunlightMinutes);
        var cursorCmg = cmg + attitudeDemand * .55 * orbitMinute / 92;
        var orbitCursor = {
          battery: opsClamp(battery + ((generation - load) * cursorSunMinutes - load * cursorDarkMinutes) / 60 / 2.1, 0, 100),
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
          { mode: 'eclss', label: 'Cabin CO₂', value: co2.toFixed(0) + ' ppm', rule: '< 1000 ppm', pass: co2 < 1000, color: co2 < 1000 ? '#34d399' : '#f87171' },
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
            opsControl('iss-ops-crew','Crew aboard',crew,3,11,1,'','#7dd3fc','opsCrew'), opsControl('iss-ops-research','Research load',research,0,100,5,'%','#a78bfa','opsResearch'),
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
          return h('div', null, renderSystemSchematic(SYSTEMS[0]), h('div', { className: 'iss-ops-grid' }, opsControl('iss-eclss-crew','Crew demand',crew,3,11,1,' people','#7dd3fc','opsCrew'), opsControl('iss-eclss-recovery','Water recovery',recovery,70,99,.5,'%','#38bdf8','opsRecovery'), opsControl('iss-eclss-scrub','CO₂ scrubber output',scrub,40,100,1,'%','#34d399','opsScrub'), statusBox('Water recovered',waterReturn.toFixed(1) + ' L/day','Daily potable-water model for the selected crew.','#38bdf8'), statusBox('Water resupply gap',resupplyWater.toFixed(2) + ' L/day','Even a small open-loop loss compounds on Mars.','#fbbf24'), statusBox('Oxygen demand',oxygenNeed.toFixed(2) + ' kg/day','Electrolysis must replace crew consumption.','#34d399')),
            opsMeter('Loop closure',recovery,'#38bdf8','Target ≥ 98% for exploration-class missions'), opsMeter('Cabin-air quality',airScore,co2 < 1000 ? '#34d399' : '#f87171','Modeled CO₂ ' + co2.toFixed(0) + ' ppm'), opsSpark('CO2 trend',airScore,co2 < 1000 ? '#34d399' : '#f87171',8));
        }
        function renderThermal() {
          return h('div', null, renderSystemSchematic(SYSTEMS[3]), h('div', { className: 'iss-ops-grid' }, opsControl('iss-thermal-rad','Radiator deployment',radiator,30,100,1,'%','#fb923c','opsRadiator'), opsControl('iss-thermal-flow','Cooling-loop flow',cooling,40,100,1,'%','#38bdf8','opsCooling'), opsControl('iss-thermal-research','Heat-producing research',research,0,100,5,'%','#a78bfa','opsResearch'), statusBox('Waste heat',wasteHeat.toFixed(1) + ' kW','Electronics and crew work become heat.','#f97316'), statusBox('Rejected heat',rejectedHeat.toFixed(1) + ' kW','Radiators emit infrared energy to space.','#38bdf8'), statusBox('Modeled cabin',cabinTemp.toFixed(1) + ' °C','Comfort band: 18–27 °C. ',cabinTemp > 18 && cabinTemp < 27 ? '#4ade80' : '#f87171')), opsMeter('Thermal margin',thermalScore,cabinTemp > 18 && cabinTemp < 27 ? '#4ade80' : '#f87171','Balance heat collected with heat rejected'), opsSpark('Cabin temperature stability',thermalScore,'#fb923c',6));
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
          return h('div', null, renderSystemSchematic(SYSTEMS[6]), h('div',{className:'iss-ops-grid'},opsControl('iss-human-days','Mission duration',missionDays,30,900,30,' days','#e879f9','opsMissionDays'),opsControl('iss-human-exercise','Daily exercise',exercise,0,3,.25,' h','#4ade80','opsExercise'),statusBox('Modeled bone loss',boneLoss.toFixed(1)+'%','Simplified from ~1–1.5% per month without countermeasures.',boneLoss<5?'#4ade80':'#fbbf24'),statusBox('Radiation exposure',(missionDays*.7).toFixed(0)+' mSv','Uses a midrange 0.7 mSv/day estimate.','#f97316')),opsMeter('Exercise protection',exerciseProtection,'#4ade80','ARED, treadmill, and cycle loading'),opsSpark('Musculoskeletal resilience',opsClamp(100-boneLoss*5,0,100),'#e879f9',7));
        }
        function renderEmergency() {
          var scenarios={leak:{name:'Cabin pressure leak',telemetry:'Pressure falling 0.7 kPa/min · acoustic sensor bearing 064°',choices:[['Add oxygen','Oxygen masks the symptom and wastes supply.'],['Close the suspected module hatch','Correct: isolate volume, count crew, then locate the leak.'],['Open a window shutter','Shutters do not seal cabin leaks.']],correct:1},fire:{name:'Rack smoke alarm',telemetry:'Particulate alarm · rack current spike · cabin fan running',choices:[['Cut rack power and use the port fire extinguisher','Correct: remove ignition energy, suppress, then sample air.'],['Increase ventilation','That can spread smoke through the station.'],['Move into the rack','Electrical fire risk makes this unsafe.']],correct:0},cooling:{name:'Ammonia cooling fault',telemetry:'Loop pressure low · radiator outlet warming · lab loads high',choices:[['Raise all experiment power','That adds heat when rejection is failing.'],['Isolate the loop and shed noncritical loads','Correct: reduce heat while controllers isolate the leak.'],['Turn off cabin fans','Internal airflow is still required.']],correct:1},co2:{name:'CO₂ pocket warning',telemetry:'Crew headache · local airflow low · scrubber current normal',choices:[['Add oxygen','Oxygen does not remove CO₂.'],['Restore airflow and clear the inlet','Correct: the scrubber works only if cabin air reaches it.'],['Reduce water recovery','The water loop is not the cause.']],correct:1}};
          var sid=d.opsEmergency||'leak',scenario=scenarios[sid]||scenarios.leak;
          return h('div',null,h('div',{className:'iss-emergency-grid',role:'group','aria-label':'Emergency scenario'},Object.keys(scenarios).map(function(id){var on=id===sid;return h('button',{key:id,type:'button','aria-pressed':on,onClick:function(){upd({opsEmergency:id,opsEmergencyResult:''});},style:{padding:9,borderRadius:9,border:'1px solid '+(on?'#f87171':'#475569'),background:on?'rgba(239,68,68,.14)':'rgba(2,6,23,.35)',color:on?'#fecaca':TEXT,fontWeight:800,cursor:'pointer'}},scenarios[id].name);})),card('🚨 '+scenario.name,h('div',null,h('div',{style:{padding:9,marginBottom:9,borderRadius:9,background:'rgba(239,68,68,.08)',borderLeft:'3px solid #ef4444',color:'#fecaca',font:'750 11px ui-monospace,monospace'}},scenario.telemetry),h('div',{role:'group','aria-label':'Emergency actions',style:{display:'grid',gap:6}},scenario.choices.map(function(choice,i){return h('button',{className:'iss-emergency-choice',key:i,type:'button',onClick:function(){var correct=i===scenario.correct;upd({opsEmergencyResult:(correct?'PROCEDURE CORRECT // ':'PROCEDURE HOLD // ')+choice[1],opsEmergencyCorrect:correct});announceToSR(choice[1]);},style:{borderRadius:9,border:'1px solid #475569',background:'rgba(2,6,23,.38)',color:TEXT,fontWeight:750,cursor:'pointer'}},choice[0]);})),d.opsEmergencyResult?h('div',{role:'status','aria-live':'polite',style:{marginTop:8,padding:8,borderRadius:8,borderLeft:'3px solid '+(d.opsEmergencyCorrect?'#22c55e':'#fbbf24'),background:d.opsEmergencyCorrect?'rgba(34,197,94,.1)':'rgba(251,191,36,.1)',color:TEXT,fontSize:11.5}},d.opsEmergencyResult):null),'#ef4444'));
        }
        function renderRendezvous() {
          return h('div',null,h('div',{className:'iss-learning-visual'},h('svg',{viewBox:'0 0 640 180',role:'img','aria-label':'Rendezvous approach profile with hold points at 250, 100, 30, and 10 meters.'},h('rect',{width:640,height:180,fill:'#050b18'}),h('path',{d:'M40 122 C180 122 230 78 340 88 S500 92 586 90',fill:'none',stroke:'#38bdf8',strokeWidth:2.5,strokeDasharray:'7 6'}),[[100,'250 m'],[245,'100 m'],[410,'30 m'],[520,'10 m']].map(function(p,i){return h('g',{key:i},h('circle',{cx:p[0],cy:i===0?119:i===1?91:90,r:8,fill:'#111d30',stroke:i<2?'#fbbf24':'#4ade80',strokeWidth:2}),h('text',{x:p[0],y:148,textAnchor:'middle',fill:'#cbd5e1',fontSize:9,fontWeight:800},p[1]+' HOLD'));}),h('g',{transform:'translate(592,90)'},h('rect',{x:-16,y:-10,width:32,height:20,rx:8,fill:'#e2e8f0'}),h('rect',{x:-3,y:-52,width:6,height:104,fill:'#94a3b8'})),h('text',{x:20,y:25,fill:'#7dd3fc',fontSize:10,fontWeight:850,letterSpacing:1.4},'RENDEZVOUS PROFILE // GO / NO-GO HOLDS'))),card('Approach discipline',h('div',null,h('p',{style:{color:TEXT,fontSize:12.5,lineHeight:1.6}},'Real vehicles pause at planned hold points so controllers can verify navigation, alignment, closing rate, and vehicle health before proceeding.'),h('div',{className:'iss-ops-grid'},statusBox('Soft-capture limit','≤ 0.60 m/s','Arrive centered and slow.','#4ade80'),statusBox('Abort corridor','Always open','A safe retreat path is part of every approach.','#fbbf24')),h('button',{type:'button',onClick:function(){upd({tab:'missions'});},style:{marginTop:9,padding:'8px 13px',borderRadius:9,border:'1px solid #38bdf8',background:'rgba(56,189,248,.14)',color:'#bae6fd',fontWeight:900,cursor:'pointer'}},'🚀 Open the docking simulator')),'#38bdf8'));
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
      var TABS = [
        { id: 'interior', icon: '🧑‍🚀', label: __alloT('stem.spacestation.tab_interior', 'Inside: Crew Shift') },
        { id: 'operations', icon: '📡', label: __alloT('stem.spacestation.tab_operations', 'Mission Operations') },
        { id: 'map', icon: '🛰️', label: __alloT('stem.spacestation.tab_map', '3-D Station') },
        { id: 'day', icon: '👩‍🚀', label: __alloT('stem.spacestation.tab_day', 'A Day Aboard') },
        { id: 'systems', icon: '⚙️', label: __alloT('stem.spacestation.tab_systems', 'Systems & Challenges') },
        { id: 'orbit', icon: '🧮', label: __alloT('stem.spacestation.tab_orbit', 'Orbit Lab') },
        { id: 'missions', icon: '🎮', label: __alloT('stem.spacestation.tab_missions', 'Missions') },
        { id: 'history', icon: '📜', label: __alloT('stem.spacestation.tab_history', 'History & Future') },
        { id: 'quiz', icon: '🧠', label: __alloT('stem.spacestation.tab_quiz', 'Quiz') }
      ];
      var tab = d.tab || 'interior';

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
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.map_intro', 'A schematic (not to scale) 3-D map of the real station. Drag to spin it, click any module to inspect it. The lighting sweeps through a full orbit: the station crosses from daylight into Earth’s shadow 16 times a day.')),
          h('button', { type: 'button', onClick: function () { upd({ tab: 'interior', interiorRoom: d.interiorRoom || 'harmony' }); }, style: { margin: '0 0 10px', padding: '7px 12px', borderRadius: 9, border: '1px solid #38bdf8', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, '🚪 Open the hatch — explore inside'),
          h('div', { className: 'iss-station-stage', style: { position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', background: '#050a18' } },
            h('canvas', {
              ref: function (cv) { if (cv) { cv._issWantSel = d.selModule; cv._issCutaway = !!d.mapCutaway; stationCanvasRef(cv); } },
              role: 'application', tabIndex: 0,
              'aria-label': __alloT('stem.spacestation.canvas_aria', 'Interactive 3-D model of the International Space Station. Drag or use arrow keys to rotate. Use plus and minus to zoom, Home for overview, and the module buttons below to inspect each module.'),
              style: { width: '100%', height: 'clamp(320px, 52vw, 500px)', display: 'block' }
            }),
            h('div', { className: 'iss-stage-hud', 'aria-hidden': 'true' }, h('span', { className: 'iss-hud-chip' }, 'ISS // ORBITAL VIEW'), h('span', { className: 'iss-hud-chip iss-hud-selection' }, 'SELECTED // ' + selModule.name.split(' (')[0].toUpperCase()), h('span', { className: 'iss-hud-chip', 'data-iss-light-phase': 'true', 'data-phase': 'sunlight' }, '☀ SUNLIGHT'), h('span', { className: 'iss-hud-chip' }, 'ALT ' + orbitAlt + ' KM  /  V ' + orbitV.toFixed(2) + ' KM/S')),
            h('div', { className: 'iss-module-marker', 'data-iss-module-marker': 'true', 'aria-hidden': 'true' }, h('i', null), h('span', null, selModule.name.split(' (')[0].toUpperCase())),
            h('div', { className: 'iss-stage-help', 'aria-hidden': 'true' }, 'Drag or arrow keys to orbit  /  + − to zoom')
          ),
          h('div', { className: 'iss-map-controls', role: 'group', 'aria-label': '3D station view controls' },
            [['overview','◉ Overview'],['truss','↔ Truss'],['labs','⚗ Labs'],['russian','★ Russian segment'],['nadir','🌍 Earth-facing']].map(function (view) { var on = (d.mapView || 'overview') === view[0]; return h('button', { key: view[0], type: 'button', 'data-iss-camera-view': view[0], 'aria-pressed': on, onClick: function () { upd({ mapView: view[0] }); var cv = document.querySelector('.iss-station-stage canvas'); if (cv && cv._issSetView) cv._issSetView(view[0]); } }, view[1]); }),
            h('button', { type: 'button', 'data-iss-focus-module': d.selModule, onClick: function () { var cv = document.querySelector('.iss-station-stage canvas'); if (cv && cv._issFocusModule) cv._issFocusModule(d.selModule); } }, '◎ Center ' + selModule.name.split(' (')[0]),
            h('button', { type: 'button', 'data-iss-cutaway': 'true', 'aria-pressed': !!d.mapCutaway, onClick: function () { upd({ mapCutaway: !d.mapCutaway }); } }, d.mapCutaway ? '◫ Cutaway ON' : '▣ Isolate selected module')),
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
        return h('div', { className: 'iss-crew-day-timeline', 'data-iss-crew-day-timeline': slot.h },
          h('svg', { viewBox: '0 0 640 108', role: 'img', 'aria-label': 'Twenty-four hour GMT crew timeline. Selected event ' + slot.label + ' at ' + slot.h + '. Work, exercise, meals, personal time, and scheduled sleep are shown on one time axis.' },
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
            h('g', { className: 'iss-day-timeline-marker' }, h('line', { x1: selectedX, y1: 21, x2: selectedX, y2: 73, stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '3 3' }), h('rect', { x: labelX - 72, y: 2, width: 144, height: 18, rx: 8, fill: '#2b1d0d', stroke: '#fbbf24' }), h('text', { x: labelX, y: 14, textAnchor: 'middle', fill: '#fef3c7', fontSize: 8.5, fontWeight: 850 }, slot.h + '  ' + slot.label.toUpperCase()))));
      }
      function renderDayOrbitVisual(slot, index) {
        var phase = -Math.PI * 0.78 + (index / Math.max(1, DAY_SCHEDULE.length - 1)) * Math.PI * 1.56;
        var sx = 320 + Math.cos(phase) * 226, sy = 94 + Math.sin(phase) * 56;
        return h('div', { className: 'iss-learning-visual iss-day-orbit' },
          h('svg', { viewBox: '0 0 640 150', role: 'img', 'aria-label': 'Orbital day-cycle display for ' + slot.h + ', ' + slot.label + '. The station experiences about sixteen sunrises each Earth day.' },
            h('defs', null, h('linearGradient', { id: 'iss-day-bg', x1: '0', y1: '0', x2: '1', y2: '0' }, h('stop', { offset: '0%', stopColor: '#030712' }), h('stop', { offset: '49%', stopColor: '#091a31' }), h('stop', { offset: '100%', stopColor: '#2b1d0d' })), h('radialGradient', { id: 'iss-day-earth', cx: '38%', cy: '28%' }, h('stop', { offset: '0%', stopColor: '#67c8ff' }), h('stop', { offset: '100%', stopColor: '#0b3567' }))),
            h('rect', { width: 640, height: 150, fill: 'url(#iss-day-bg)' }),
            h('circle', { cx: 602, cy: 34, r: 18, fill: '#fbbf24', opacity: .95 }), h('circle', { cx: 602, cy: 34, r: 28, fill: '#fbbf24', opacity: .1 }),
            h('ellipse', { cx: 320, cy: 94, rx: 226, ry: 56, fill: 'none', stroke: '#7dd3fc', strokeWidth: 1.7, strokeDasharray: '6 6', opacity: .65 }),
            h('circle', { cx: 320, cy: 131, r: 63, fill: 'url(#iss-day-earth)', stroke: '#7dd3fc', strokeWidth: 1.4 }),
            h('path', { d: 'M320 68 A63 63 0 0 0 320 194 Z', fill: '#020617', opacity: .66 }),
            Array.from({ length: 16 }).map(function (_, i) { var x = 32 + i * 37; return h('line', { key: i, x1: x, y1: 18, x2: x, y2: i === Math.round(index / Math.max(1, DAY_SCHEDULE.length - 1) * 15) ? 32 : 25, stroke: i === Math.round(index / Math.max(1, DAY_SCHEDULE.length - 1) * 15) ? '#fbbf24' : '#334155', strokeWidth: i === Math.round(index / Math.max(1, DAY_SCHEDULE.length - 1) * 15) ? 2 : 1 }); }),
            h('g', { className: 'iss-day-marker', transform: 'translate(' + sx.toFixed(1) + ',' + sy.toFixed(1) + ')' }, h('rect', { x: -18, y: -4, width: 36, height: 8, rx: 4, fill: '#e2e8f0' }), h('rect', { x: -31, y: -7, width: 11, height: 14, fill: '#c58a20', stroke: '#fbbf24' }), h('rect', { x: 20, y: -7, width: 11, height: 14, fill: '#c58a20', stroke: '#fbbf24' }), h('circle', { r: 3, fill: '#38bdf8' })),
            h('text', { x: 20, y: 47, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'CREW DAY // GMT ' + slot.h),
            h('text', { x: 20, y: 64, fill: '#f8fafc', fontSize: 12, fontWeight: 900 }, slot.label.toUpperCase()),
            h('text', { x: 620, y: 137, textAnchor: 'end', fill: '#94a3b8', fontSize: 8.5 }, '16 LIGHT / SHADOW CYCLES PER DAY')),
          renderCrewDayTimeline(slot, index),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'The clock, not sunlight, organizes crew life.'), h('span', null, slot.h + ' GMT')));
      }
      function renderDay() {
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
                className: 'iss-day-chip', key: i, type: 'button', 'aria-pressed': on,
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

      function renderSystemSchematic(sys) {
        var flows = {
          water: { nodes: [['CREW', 'humidity + waste'], ['COLLECT', 'condense + distill'], ['PROCESS', 'filter + test'], ['RETURN', 'clean water']], loop: true, caption: 'Mass circles back through the cabin instead of launching again.' },
          air: { nodes: [['WATER', 'recycled supply'], ['SPLIT', 'electrolysis'], ['CREW', 'O₂ in / CO₂ out'], ['RECOVER', 'scrub + Sabatier']], loop: true, caption: 'Electricity closes part of the oxygen-water loop.' },
          power: { nodes: [['SUN', 'radiant energy'], ['ARRAYS', 'direct current'], ['BATTERIES', 'store for eclipse'], ['LOADS', 'labs + life support']], loop: false, caption: 'Generation and storage must survive sixteen daily eclipses.' },
          thermal: { nodes: [['CABIN', 'collect heat'], ['WATER', 'internal loop'], ['AMMONIA', 'external loop'], ['RADIATORS', 'infrared to space']], loop: false, caption: 'In vacuum, the final heat-transfer step must be radiation.' },
          attitude: { nodes: [['SENSORS', 'measure pose'], ['COMPUTER', 'calculate torque'], ['CMGs', 'exchange momentum'], ['STATION', 'hold orientation']], loop: true, caption: 'A feedback loop continually senses, corrects, and verifies.' },
          debris: { nodes: [['TRACK', 'ground radar'], ['ASSESS', 'predict miss distance'], ['MANEUVER', 'burn if needed'], ['SHIELD', 'stop small debris']], loop: false, caption: 'Risk is managed differently depending on particle size.' },
          body: { nodes: [['MICRO-G', 'remove loading'], ['CHANGE', 'bone + muscle loss'], ['COUNTER', 'exercise + diet'], ['MEASURE', 'adapt the plan']], loop: true, caption: 'Each astronaut is both crew member and longitudinal study.' }
        };
        var flow = flows[sys.id] || flows.water;
        var markerId = 'iss-flow-arrow-' + sys.id;
        var glowId = 'iss-flow-glow-' + sys.id;
        return h('div', { className: 'iss-learning-visual iss-system-visual' },
          h('svg', { viewBox: '0 0 640 178', role: 'img', 'aria-label': sys.name + ' process diagram. ' + flow.nodes.map(function (node) { return node[0] + ': ' + node[1]; }).join('. ') },
            h('defs', null,
              h('marker', { id: markerId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: sys.color })),
              h('filter', { id: glowId, x: '-30%', y: '-30%', width: '160%', height: '160%' }, h('feGaussianBlur', { stdDeviation: 3, result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
            h('rect', { width: 640, height: 178, fill: '#050b18' }),
            [44, 118, 201, 292, 387, 492, 573].map(function (x, i) { return h('circle', { key: 'star' + i, cx: x, cy: 22 + (i % 3) * 9, r: i % 2 ? 1 : 1.4, fill: i % 3 ? '#64748b' : '#bae6fd', opacity: .7 }); }),
            h('text', { x: 24, y: 25, fill: sys.color, fontSize: 10, fontWeight: 800, letterSpacing: 1.4 }, 'SYSTEM FLOW // ' + sys.id.toUpperCase()),
            h('path', { className: 'iss-flow-path', d: 'M 88 84 H 552', fill: 'none', stroke: sys.color, strokeWidth: 2.5, opacity: .8, markerEnd: 'url(#' + markerId + ')' }),
            flow.loop ? h('path', { className: 'iss-flow-path', d: 'M 552 111 C 552 156, 88 156, 88 111', fill: 'none', stroke: sys.color, strokeWidth: 1.5, opacity: .42, markerEnd: 'url(#' + markerId + ')' }) : null,
            flow.nodes.map(function (node, i) {
              var x = 28 + i * 155;
              return h('g', { key: node[0], transform: 'translate(' + x + ',52)' },
                h('rect', { x: 0, y: 0, width: 118, height: 63, rx: 11, fill: '#111d30', stroke: sys.color, strokeWidth: i === 0 || i === 3 ? 1.8 : 1, opacity: .98 }),
                h('circle', { cx: 14, cy: 14, r: 7, fill: sys.color, filter: 'url(#' + glowId + ')' }),
                h('text', { x: 14, y: 17, textAnchor: 'middle', fill: '#04121f', fontSize: 8, fontWeight: 900 }, String(i + 1)),
                h('text', { x: 12, y: 38, fill: '#f8fafc', fontSize: 10.5, fontWeight: 850, letterSpacing: .5 }, node[0]),
                h('text', { x: 12, y: 53, fill: '#94a3b8', fontSize: 8.5 }, node[1]));
            }),
            flow.loop ? h('text', { x: 320, y: 166, textAnchor: 'middle', fill: sys.color, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.2 }, 'FEEDBACK / RECOVERY LOOP') : h('text', { x: 320, y: 154, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1 }, 'ENERGY AND MASS MOVE ONE WAY THROUGH THIS VIEW')),
          h('div', { className: 'iss-visual-caption' }, h('span', null, flow.caption), h('span', null, 'SELECTED: ' + sys.name.toUpperCase())));
      }

      function renderOrbitVisual() {
        var altitudeScale = (orbitAlt - 200) / 1800;
        var orbitRx = 194 + altitudeScale * 46;
        var orbitRy = 73 + altitudeScale * 24;
        var theta = -0.58;
        var stationX = 320 + Math.cos(theta) * orbitRx;
        var stationY = 140 + Math.sin(theta) * orbitRy;
        return h('div', { className: 'iss-learning-visual iss-orbit-visual' },
          h('svg', { viewBox: '0 0 640 245', role: 'img', 'aria-label': 'Orbit diagram at ' + orbitAlt + ' kilometers altitude, moving ' + orbitV.toFixed(2) + ' kilometers per second with a period of ' + orbitT.toFixed(1) + ' minutes.' },
            h('defs', null,
              h('radialGradient', { id: 'iss-orbit-earth', cx: '35%', cy: '28%' }, h('stop', { offset: '0%', stopColor: '#67c8ff' }), h('stop', { offset: '52%', stopColor: '#1863a0' }), h('stop', { offset: '100%', stopColor: '#071c3b' })),
              h('linearGradient', { id: 'iss-orbit-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#050914' }), h('stop', { offset: '100%', stopColor: '#08182c' })),
              h('marker', { id: 'iss-velocity-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 L10 5 L0 10z', fill: '#4ade80' }))),
            h('rect', { width: 640, height: 245, fill: 'url(#iss-orbit-bg)' }),
            [[42,33,1],[113,61,1.4],[184,26,.8],[264,48,1.2],[381,28,1],[463,57,.7],[544,25,1.4],[601,71,.9]].map(function (s, i) { return h('circle', { key: i, cx: s[0], cy: s[1], r: s[2], fill: i % 3 ? '#94a3b8' : '#e0f2fe' }); }),
            h('ellipse', { cx: 320, cy: 140, rx: orbitRx, ry: orbitRy, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.2, opacity: .78, strokeDasharray: '7 6' }),
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
            h('text', { x: 618, y: 224, textAnchor: 'end', fill: '#94a3b8', fontSize: 8.5 }, 'Diagram exaggerates altitude for learning')),
          h('div', { className: 'iss-visual-caption' }, h('span', null, 'Continuous freefall: Earth curves away as the station falls.'), h('span', null, orbitT.toFixed(1) + ' MIN / ORBIT')));
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
                onClick: function () { upd({ sysIdx: i }); },
                style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: on ? s2.color + '22' : PANEL, color: on ? s2.color : TEXT, border: '1px solid ' + (on ? s2.color : '#334155') }
              }, s2.icon + ' ' + s2.name);
            })),
          renderSystemSchematic(sys),
          card(sys.icon + ' ' + sys.name,
            h('div', null,
              h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 8px' } }, sys.how),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + sys.color, fontSize: 12, color: TEXT, lineHeight: 1.55, marginBottom: 6 } },
                h('strong', { style: { color: sys.color } }, __alloT('stem.spacestation.numbers', 'By the numbers: ')), sys.num),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fbbf24' } }, '🛠️ ' + __alloT('stem.spacestation.design_challenge', 'Design challenge: ')), sys.challenge)
            ), sys.color),
          aiOn ? card(__alloT('stem.spacestation.ask_mc', '🎧 Ask Mission Control'),
            h('div', null,
              h('textarea', {
                value: d.askInput || '', rows: 2, maxLength: 400,
                onChange: function (e) { upd({ askInput: String(e.target.value || '').slice(0, 400) }); },
                placeholder: __alloT('stem.spacestation.ask_ph', 'How do they fix a leak? What happens in a fire? Can you see the station from my town?'),
                'aria-label': 'Question for Mission Control',
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: 'rgba(2,6,23,0.5)', color: TEXT, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }
              }),
              h('button', {
                type: 'button', disabled: d.askLoading || !(d.askInput || '').trim(),
                onClick: function () { askMissionControl(d.askInput); },
                style: { marginTop: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: d.askLoading ? '#475569' : '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 12, cursor: d.askLoading ? 'wait' : 'pointer' }
              }, d.askLoading ? __alloT('stem.spacestation.ask_wait', 'Standing by…') : __alloT('stem.spacestation.ask_go', '📡 Call Mission Control')),
              d.askAnswer ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(2,6,23,0.5)', border: '1px solid #334155', fontSize: 12.5, color: TEXT, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, d.askAnswer) : null
            ), '#0ea5e9') : null
        );
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
                h('span', { style: { color: '#7dd3fc', fontWeight: 800 }, 'aria-live': 'polite' }, orbitAlt + ' km')),
              h('input', {
                id: 'iss-orbit-alt', type: 'range', min: 200, max: 2000, step: 10, value: orbitAlt,
                onChange: function (e) { upd({ orbitAlt: parseInt(e.target.value, 10), orbitTouched: true }); },
                'aria-valuetext': orbitAlt + ' kilometers',
                style: { width: '100%', accentColor: '#38bdf8' }
              }),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 10 } },
                [['Orbital speed', orbitV.toFixed(2) + ' km/s (' + Math.round(orbitV * 3600).toLocaleString() + ' km/h)'],
                 ['Orbit period', orbitT.toFixed(1) + ' min'],
                 ['Orbits per day', orbitsPerDay.toFixed(1)],
                 ['Sunrises per day', Math.round(orbitsPerDay) + '']].map(function (p, i) {
                  return h('div', { className: 'iss-fact-item', key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: SOFT, textTransform: 'uppercase' } }, p[0]),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: '#7dd3fc', marginTop: 2 } }, p[1]));
                })),
              h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(251,146,60,0.1)', borderLeft: '3px solid #fb923c', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fdba74' } }, __alloT('stem.spacestation.tradeoff', 'Trade-off report: ')), dragNote),
              h('p', { style: { fontSize: 11, color: SOFT, marginTop: 8, lineHeight: 1.5 } },
                __alloT('stem.spacestation.orbit_note', 'Notice the counter-intuitive part: LOWER orbits are FASTER. To catch up with something ahead of you in orbit, you briefly slow down and drop lower. Orbital mechanics breaks driving intuition — which is why dockings are computed, not eyeballed.'))
            ), '#38bdf8'),
          card(__alloT('stem.spacestation.why_400', '🎯 Why ~400 km?'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 12.5, color: TEXT, lineHeight: 1.8 } },
              h('li', null, __alloT('stem.spacestation.why1', 'Low enough for cargo and crew rockets to carry useful mass, and below the worst radiation zones.')),
              h('li', null, __alloT('stem.spacestation.why2', 'High enough that drag only costs ~50-100 m/day — manageable with periodic reboosts.')),
              h('li', null, __alloT('stem.spacestation.why3', 'The 51.6° orbit tilt was chosen so Russian launches from Baikonur can reach it — the orbit itself encodes the partnership.'))
            ), '#818cf8')
        );
      }

      function renderAssemblyVisual() {
        var step = Math.max(0, Math.min(TIMELINE.length - 1, Number(d.assemblyIdx == null ? 11 : d.assemblyIdx)));
        var thresholds = { zarya: 0, unity: 0, zvezda: 1, destiny: 2, quest: 2, truss: 3, harmony: 4, columbus: 5, kibo: 6, tranquility: 7, cupola: 7, leonardo: 8, nauka: 10 };
        var visible = MODULES.filter(function (m) { return (thresholds[m.id] == null ? 6 : thresholds[m.id]) <= step; });
        var powerByMilestone = [18, 30, 46, 75, 82, 92, 105, 110, 110, 110, 120, 120, 120];
        var powerStage = powerByMilestone[step] || 120;
        var volumeStage = Math.round(visible.filter(function (m) { return m.id !== 'truss'; }).length / 12 * 916);
        return h('div', { className: 'iss-assembly-stage' },
          h('svg', { viewBox: '0 0 640 245', role: 'img', 'aria-label': 'Station assembly visualization at ' + TIMELINE[step].y + '. ' + visible.length + ' major elements shown.' },
            h('defs', null, h('pattern', { id: 'iss-assembly-grid', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, h('path', { d: 'M24 0H0V24', fill: 'none', stroke: '#38bdf8', strokeWidth: .45, opacity: .15 })), h('marker', { id: 'iss-deorbit-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, h('path', { d: 'M0 0 L10 5 L0 10z', fill: '#fb7185' })),
              h('radialGradient', { id: 'iss-assembly-earth', cx: '46%', cy: '7%', r: '74%' },
                h('stop', { offset: '0%', stopColor: '#8ed2f7' }), h('stop', { offset: '32%', stopColor: '#2470ad' }), h('stop', { offset: '100%', stopColor: '#08284f' })),
              h('filter', { id: 'iss-assembly-limb', x: '-25%', y: '-25%', width: '150%', height: '150%' }, h('feGaussianBlur', { stdDeviation: 6 }))),
            h('rect', { width: 640, height: 245, fill: '#040a16' }), h('rect', { width: 640, height: 245, fill: 'url(#iss-assembly-grid)' }),
            h('circle', { cx: 320, cy: 360, r: 175, fill: 'none', stroke: '#7dd3fc', strokeWidth: 7, opacity: .35, filter: 'url(#iss-assembly-limb)' }),
            h('circle', { cx: 320, cy: 360, r: 170, fill: 'url(#iss-assembly-earth)', opacity: .92, stroke: '#a5e2ff', strokeWidth: 2 }),
            step === TIMELINE.length - 1 ? h('g', null, h('path', { className: 'iss-deorbit-path', d: 'M550 54 Q490 116 386 177', fill: 'none', stroke: '#fb7185', strokeWidth: 2.4, strokeDasharray: '7 6', markerEnd: 'url(#iss-deorbit-arrow)' }), h('text', { x: 548, y: 42, textAnchor: 'end', fill: '#fecdd3', fontSize: 9, fontWeight: 850, letterSpacing: 1 }, 'CONTROLLED REENTRY')) : null,
            step >= 3 ? h('g', { opacity: step === TIMELINE.length - 1 ? .42 : 1 }, h('rect', { x: 110, y: 100, width: 420, height: 8, rx: 4, fill: '#94a3b8' }), [150,220,420,490].map(function (x, i) { return h('g', { key: i }, h('rect', { x: x - 24, y: i % 2 ? 116 : 58, width: 48, height: 34, rx: 2, fill: '#a86e16', stroke: '#fbbf24' }), [1,2,3].map(function (line) { return h('line', { key: line, x1: x - 24, y1: (i % 2 ? 116 : 58) + line * 8.5, x2: x + 24, y2: (i % 2 ? 116 : 58) + line * 8.5, stroke: '#fde68a', strokeWidth: .5 }); })); })) : null,
            visible.filter(function (m) { return m.id !== 'truss'; }).map(function (m) {
              var x = 320 + m.pos[0] * 34, y = 106 + m.pos[2] * 12;
              var color = '#' + Number(m.color).toString(16).padStart(6, '0');
              var isNew = (thresholds[m.id] == null ? 6 : thresholds[m.id]) === step;
              var bx = m.axis === 'x' ? -26 : -10, by = m.axis === 'z' ? -21 : -10;
              var bw = m.axis === 'x' ? 52 : 20, bh = m.axis === 'z' ? 42 : 20;
              return h('g', { key: m.id, className: isNew ? 'iss-assembly-new' : '', opacity: step === TIMELINE.length - 1 ? .42 : 1, transform: 'translate(' + x + ',' + y + ')' },
                h('rect', { x: bx, y: by, width: bw, height: bh, rx: 9, fill: color, stroke: '#e2e8f0', strokeWidth: 1.3 }),
                // Same sheen-over-solid treatment as the crew-day bands, so the
                // hulls read as cylinders rather than flat colour chips. The
                // module colours themselves are untouched (they carry meaning).
                h('rect', { x: bx, y: by, width: bw, height: bh * 0.42, rx: 9, fill: '#ffffff', opacity: 0.15 }),
                h('circle', { r: 3, fill: '#38bdf8' }));
            }),
            h('text', { x: 20, y: 25, fill: '#7dd3fc', fontSize: 10, fontWeight: 850, letterSpacing: 1.4 }, 'ORBITAL ASSEMBLY // ' + TIMELINE[step].y),
            h('text', { x: 20, y: 43, fill: '#cbd5e1', fontSize: 9 }, TIMELINE[step].e.length > 86 ? TIMELINE[step].e.slice(0, 86) + '…' : TIMELINE[step].e),
            h('g', { transform: 'translate(20,185)' }, [['MAJOR ELEMENTS', visible.length], ['PRESSURIZED VOLUME', volumeStage + ' m³'], ['AVAILABLE POWER', powerStage + ' kW']].map(function (metric, i) { return h('g', { key: i, transform: 'translate(' + (i * 200) + ',0)' }, h('text', { fill: '#94a3b8', fontSize: 8, fontWeight: 800, letterSpacing: .8 }, metric[0]), h('text', { y: 22, fill: i === 0 ? '#7dd3fc' : i === 1 ? '#34d399' : '#fbbf24', fontSize: 15, fontWeight: 900 }, String(metric[1]))); }))),
          h('div', { className: 'iss-assembly-controls' },
            h('label', { htmlFor: 'iss-assembly-step' }, h('span', null, 'Assembly milestone'), h('strong', null, TIMELINE[step].y)),
            h('input', { id: 'iss-assembly-step', type: 'range', min: 0, max: TIMELINE.length - 1, step: 1, value: step, onChange: function (e) { upd({ assemblyIdx: Number(e.target.value) }); } }),
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
      function renderQuiz() {
        var qi = Math.max(0, Math.min(QUIZ.length - 1, d.quizIdx || 0));
        var q = QUIZ[qi];
        var picked = d.quizPicked;
        return h('div', null,
          renderQuizConsole(qi),
          d.quizDone ?
            card(__alloT('stem.spacestation.quiz_done', '🏁 Debrief'),
              h('div', null,
                h('p', { style: { fontSize: 16, fontWeight: 800, color: TEXT, margin: '0 0 6px' } }, d.quizScore + ' / ' + QUIZ.length),
                h('p', { style: { fontSize: 12.5, color: SOFT, margin: '0 0 10px' } }, d.quizScore >= 7 ? __alloT('stem.spacestation.quiz_great', 'Flight-controller material. Quest objective complete!') : __alloT('stem.spacestation.quiz_retry', 'Every controller trains on repetitions — revisit the tabs and fly it again.')),
                h('button', { type: 'button', onClick: function () { upd({ quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false }); }, style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#082f49', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, __alloT('stem.spacestation.quiz_again', '🔁 Run it again'))
              ), '#22c55e')
          : card((qi + 1) + ' / ' + QUIZ.length + ' — ' + q.q,
              h('div', null,
                h('div', { role: 'group', 'aria-label': 'Answer options', style: { display: 'grid', gap: 6 } },
                  q.o.map(function (opt, oi) {
                    var isPicked = picked === oi, isRight = oi === q.a;
                    var bg = picked == null ? PANEL : isRight ? 'rgba(34,197,94,0.15)' : isPicked ? 'rgba(239,68,68,0.15)' : PANEL;
                    var bd = picked == null ? '#334155' : isRight ? '#22c55e' : isPicked ? '#ef4444' : '#334155';
                    return h('button', {
                      key: oi, type: 'button', disabled: picked != null,
                      onClick: function () {
                        var right = oi === q.a;
                        upd({ quizPicked: oi, quizScore: (d.quizScore || 0) + (right ? 1 : 0) });
                        if (right && typeof awardXP === 'function') { try { awardXP(2); } catch (e) {} }
                      },
                      style: { textAlign: 'left', padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: picked == null ? 'pointer' : 'default', background: bg, color: TEXT, border: '1px solid ' + bd }
                    }, opt);
                  })),
                picked != null ? h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', borderLeft: '3px solid ' + (picked === q.a ? '#22c55e' : '#ef4444'), fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                  h('strong', { style: { color: picked === q.a ? '#4ade80' : '#f87171' } }, picked === q.a ? '✅ ' : '❌ '), q.x) : null,
                picked != null ? h('button', {
                  type: 'button',
                  onClick: function () {
                    if (qi + 1 >= QUIZ.length) {
                      var finalScore = d.quizScore || 0;
                      upd({ quizDone: true, quizBest: Math.max(d.quizBest || 0, finalScore) });
                      if (finalScore >= 7 && addToast) addToast('🛰️ ' + __alloT('stem.spacestation.quiz_toast', 'Station quiz aced: ') + finalScore + '/' + QUIZ.length, 'success');
                    } else { upd({ quizIdx: qi + 1, quizPicked: null }); }
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

      return h('div', { className: 'iss-root', style: { maxWidth: 980 } },
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
