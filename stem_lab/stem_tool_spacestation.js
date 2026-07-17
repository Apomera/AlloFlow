// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Space Station (ISS engineering + astronaut life)
//
// An interactive 3-D map of the International Space Station built from
// Three.js primitives (every pressurized module clickable), plus:
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
    { h: '21:30', icon: '🌍', label: 'Cupola time', what: 'Off-duty favorite: photographing auroras, lightning storms, and home towns from the seven-window dome.', why: 'Many astronauts describe an "overview effect" — seeing Earth as one thin-skinned planet changes them.' },
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
    { y: '2001-2011', e: 'Assembly era: labs, truss segments, solar wings, Canadarm2 (2001), nodes, Kibo, Columbus, Cupola — 30+ shuttle and Proton/Soyuz flights.' },
    { y: '2011', e: 'Space Shuttle retires with assembly essentially complete; Soyuz becomes the only crew ride for 9 years.' },
    { y: '2020', e: 'SpaceX Crew Dragon restores U.S. crew launches — the first commercial crew vehicle.' },
    { y: '2021-2023', e: 'Nauka + Prichal join; roll-out iROSA arrays boost the aging power system.' },
    { y: '2026 (now)', e: 'More than 280 people from over 20 countries have visited. The station is in its final operational decade.' },
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
    desc: 'Fly around a clickable 3-D map of the International Space Station, live an astronaut’s day hour by hour, trace the water and air recycling loops, dodge debris, and run real orbital mechanics in the Orbit Lab. NGSS MS-ETS1 engineering design in Earth’s strangest laboratory.',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'iss_module', label: 'Inspect 3 station modules in the 3-D map', icon: '🛰️', check: function (d) { var s = (d && d.spaceStation) || {}; return Object.keys(s.seenModules || {}).length >= 3; } },
      { id: 'iss_day', label: 'Walk through an astronaut’s whole day', icon: '👩‍🚀', check: function (d) { var s = (d && d.spaceStation) || {}; return Object.keys(s.seenHours || {}).length >= 6; } },
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
            tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0,
            orbitAlt: 420, quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
            seenModules: {}, seenHours: {}, orbitTouched: false, quizBest: 0,
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
        return h('div', { role: 'region', 'aria-label': typeof title === 'string' ? title : undefined, style: { padding: 14, borderRadius: 12, background: PANEL, border: '1px solid #334155', borderLeft: '3px solid ' + (accent || '#38bdf8'), marginBottom: 12 } },
          title ? h('h3', { style: { fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 8px' } }, title) : null,
          children);
      }

      // WCAG style block: one rule set covers every interactive element in the
      // tool (2.4.7 focus visible), plus a prefers-reduced-motion guard (2.3.3)
      // and an sr-only utility. Scoped under .iss-root so nothing leaks.
      function wcagStyles() {
        return h('style', { dangerouslySetInnerHTML: { __html:
          '.iss-root button:focus-visible,.iss-root input:focus-visible,.iss-root textarea:focus-visible,.iss-root canvas:focus-visible,.iss-root [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:2px;border-radius:8px}' +
          '.iss-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          '@media (prefers-reduced-motion: reduce){.iss-root *{animation:none!important;transition:none!important}}'
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
          var scene = new THREE.Scene();
          scene.background = new THREE.Color(0x050a18);
          var camera = new THREE.PerspectiveCamera(50, Wc / Hc, 0.1, 200);
          camera.position.set(7.5, 4.5, 9);
          camera.lookAt(0, 0, 1);
          scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
          var sun = new THREE.DirectionalLight(0xfff4e0, 1.25);
          sun.position.set(10, 6, 4);
          scene.add(sun);
          // Earth below (big soft sphere, out of frame mostly)
          var earth = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 32), new THREE.MeshStandardMaterial({ color: 0x2f6fab, roughness: 1 }));
          earth.position.set(0, -34.5, 0);
          scene.add(earth);
          var atmo = new THREE.Mesh(new THREE.SphereGeometry(30.6, 48, 32), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0.12, side: THREE.BackSide }));
          atmo.position.copy(earth.position);
          scene.add(atmo);
          // Stars
          var starGeo = new THREE.BufferGeometry();
          var starPos = new Float32Array(360 * 3);
          for (var si = 0; si < 360; si++) {
            var sv = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.2), (Math.random() - 0.5)).normalize().multiplyScalar(90);
            starPos[si * 3] = sv.x; starPos[si * 3 + 1] = sv.y; starPos[si * 3 + 2] = sv.z;
          }
          starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
          scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false })));

          var station = new THREE.Group();
          scene.add(station);
          var clickable = [];
          MODULES.forEach(function (m) {
            var len = m.size[1], rad = m.size[0];
            var geo, mesh;
            var mat = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.55, metalness: 0.35 });
            if (m.id === 'truss') {
              geo = new THREE.BoxGeometry(len, m.size[0], m.size[0]);
              mesh = new THREE.Mesh(geo, mat);
            } else if (m.id === 'cupola') {
              geo = new THREE.SphereGeometry(rad, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
              mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.35, metalness: 0.5 }));
              mesh.rotation.x = Math.PI; // dome faces Earth (nadir)
            } else {
              geo = new THREE.CylinderGeometry(rad, rad, len, 20);
              mesh = new THREE.Mesh(geo, mat);
              if (m.axis === 'z') mesh.rotation.x = Math.PI / 2;
              else if (m.axis === 'x') mesh.rotation.z = Math.PI / 2;
            }
            mesh.position.set(m.pos[0], m.pos[1], m.pos[2]);
            mesh._issId = m.id;
            station.add(mesh);
            clickable.push(mesh);
            // subtle end-caps ring for pressurized modules
            if (m.id !== 'truss' && m.id !== 'cupola') {
              var ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.98, 0.03, 8, 24), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 }));
              ring.position.copy(mesh.position);
              ring.rotation.copy(mesh.rotation);
              ring.rotation.x += m.axis === 'z' ? 0 : Math.PI / 2;
              station.add(ring);
            }
          });
          // Solar array wings: 4 pairs along truss (gold panels) — these rotate to track the Sun
          var wings = [];
          [-5.0, -3.6, 3.6, 5.0].forEach(function (tx, wi) {
            var wingGroup = new THREE.Group();
            wingGroup.position.set(tx, 0.35, -1.6);
            [1, -1].forEach(function (side) {
              var panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 3.4), new THREE.MeshStandardMaterial({ color: 0xc9962e, roughness: 0.4, metalness: 0.6, emissive: 0x3a2a08 }));
              panel.position.set(0, 0, side * 2.0);
              wingGroup.add(panel);
              var boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
              boom.rotation.x = Math.PI / 2;
              boom.position.set(0, 0, side * 1.9);
              wingGroup.add(boom);
            });
            wingGroup.rotation.z = 0.25 + wi * 0.08;
            station.add(wingGroup);
            wings.push(wingGroup);
          });
          // Radiators (white panels, perpendicular-ish to arrays)
          [-2.4, 2.4].forEach(function (tx) {
            var radp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 2.2), new THREE.MeshStandardMaterial({ color: 0xe7edf4, roughness: 0.85 }));
            radp.position.set(tx, -0.55, -1.6);
            station.add(radp);
          });
          // Canadarm2 — simple two-segment arm on the truss
          var armMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.5 });
          var arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), armMat);
          arm1.position.set(0.8, 0.85, -1.6); arm1.rotation.z = 0.7;
          var arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.2, 8), armMat);
          arm2.position.set(1.7, 1.25, -1.6); arm2.rotation.z = -0.6;
          station.add(arm1); station.add(arm2);

          // Selection highlight
          var selRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
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

          // Simple orbit-drag controls (pointer drag rotates the whole station group)
          var dragging = false, px0 = 0, py0 = 0;
          function onDown(e) { dragging = true; px0 = e.clientX; py0 = e.clientY; }
          function onMove(e) {
            if (!dragging) return;
            station.rotation.y += (e.clientX - px0) * 0.005;
            station.rotation.x = Math.max(-0.7, Math.min(0.7, station.rotation.x + (e.clientY - py0) * 0.003));
            px0 = e.clientX; py0 = e.clientY;
          }
          function onUp() { dragging = false; }
          cv.addEventListener('pointerdown', onDown);
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);

          var tick = 0, rafId = 0;
          function animate() {
            if (!cv.isConnected) { cleanup(); return; }
            tick++;
            if (!_prefersReducedMotion) {
              if (!dragging) station.rotation.y += 0.0016;
              wings.forEach(function (w, i) { w.rotation.z += 0.0012 + i * 0.0001; }); // sun-tracking alpha joints
              var sa = tick * 0.002;
              sun.position.set(Math.cos(sa) * 10, 6, Math.sin(sa) * 10); // day/night lighting sweep
              sun.intensity = 0.55 + 0.7 * Math.max(0, Math.cos(sa));    // orbital "night" dims the station
            }
            // keep the highlight on the selected module
            var curSel = null;
            var wantId = (setLabToolData && cv._issWantSel) || null;
            for (var ci = 0; ci < clickable.length; ci++) { if (clickable[ci]._issId === wantId) { curSel = clickable[ci]; break; } }
            if (curSel) {
              selRing.visible = true;
              curSel.getWorldPosition(selRing.position);
              selRing.lookAt(camera.position);
              var sc = 0.55 + (curSel.geometry.boundingSphere ? curSel.geometry.boundingSphere.radius * 0.45 : 0.5);
              selRing.scale.setScalar(_prefersReducedMotion ? sc : sc * (1 + 0.05 * Math.sin(tick * 0.08)));
            } else { selRing.visible = false; }
            renderer.render(scene, camera);
            rafId = requestAnimationFrame(animate);
          }
          function cleanup() {
            cancelAnimationFrame(rafId);
            cv.removeEventListener('click', pick);
            cv.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            try { renderer.dispose(); } catch (e) {}
            cv._issInit = false;
          }
          cv._issCleanup = cleanup;
          clickable.forEach(function (c) { if (c.geometry && !c.geometry.boundingSphere) c.geometry.computeBoundingSphere(); });
          animate();
        }
        if (window.THREE) { doInit(window.THREE); }
        else {
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
          s.onload = function () { if (window.THREE && cv.isConnected) doInit(window.THREE); else cv._issInit = false; };
          s.onerror = function () { cv._issInit = false; };
          document.head.appendChild(s);
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
        var st = { x: 26, y: -190, vx: 0, vy: 1.0, fuel: 100, t: 0, over: false, msg: '', thrust: { up: false, down: false, fwd: false, back: false } };
        cv._dockState = st;
        var N_ORBIT = 0.02;   // orbital rate, exaggerated ~18x so coupling is feelable in a minute
        var ACCEL = 0.35, DT = 0.35;
        function endRun(result, msg) {
          if (st.over) return;
          st.over = true; st.msg = msg;
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
          ctx2.fillStyle = '#050a18'; ctx2.fillRect(0, 0, Wc, Hc);
          // Earth limb at bottom
          ctx2.fillStyle = '#2f6fab';
          ctx2.beginPath(); ctx2.arc(Wc / 2, Hc + 520, 560, 0, Math.PI * 2); ctx2.fill();
          var sc = 1.35; // px per meter
          var ox = Wc - 90, oy = Hc / 2; // station port on the right
          // approach corridor
          ctx2.strokeStyle = 'rgba(56,189,248,0.35)'; ctx2.setLineDash([6, 6]);
          ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(ox - 480, oy - (0.15 * 480 / 1.0) * sc - 4); ctx2.stroke();
          ctx2.beginPath(); ctx2.moveTo(ox, oy); ctx2.lineTo(ox - 480, oy + (0.15 * 480 / 1.0) * sc + 4); ctx2.stroke();
          ctx2.setLineDash([]);
          // station (simplified: node + truss)
          ctx2.fillStyle = '#cbd5e1'; ctx2.fillRect(ox - 4, oy - 12, 30, 24);
          ctx2.fillStyle = '#8a93a6'; ctx2.fillRect(ox + 8, oy - 90, 10, 180);
          ctx2.fillStyle = '#c9962e'; ctx2.fillRect(ox + 2, oy - 132, 22, 40); ctx2.fillRect(ox + 2, oy + 92, 22, 40);
          ctx2.fillStyle = '#38bdf8'; ctx2.fillRect(ox - 7, oy - 4, 4, 8); // port
          // capsule
          var px = ox + st.y * sc, py = oy - st.x * sc; // y along-track → screen x (approach from the left), x radial → screen up
          ctx2.save(); ctx2.translate(px, py);
          ctx2.fillStyle = '#e2e8f0';
          ctx2.beginPath(); ctx2.moveTo(9, 0); ctx2.lineTo(-7, -6); ctx2.lineTo(-7, 6); ctx2.closePath(); ctx2.fill();
          // thruster puffs
          ctx2.fillStyle = 'rgba(253,224,71,0.9)';
          if (st.thrust.fwd && st.fuel > 0) { ctx2.beginPath(); ctx2.arc(-10, 0, 3, 0, Math.PI * 2); ctx2.fill(); }
          if (st.thrust.back && st.fuel > 0) { ctx2.beginPath(); ctx2.arc(12, 0, 3, 0, Math.PI * 2); ctx2.fill(); }
          if (st.thrust.up && st.fuel > 0) { ctx2.beginPath(); ctx2.arc(0, 9, 3, 0, Math.PI * 2); ctx2.fill(); }
          if (st.thrust.down && st.fuel > 0) { ctx2.beginPath(); ctx2.arc(0, -9, 3, 0, Math.PI * 2); ctx2.fill(); }
          ctx2.restore();
          // velocity vector
          ctx2.strokeStyle = '#4ade80'; ctx2.beginPath(); ctx2.moveTo(px, py); ctx2.lineTo(px + st.vy * sc * 9, py - st.vx * sc * 9); ctx2.stroke();
          // HUD
          var range = Math.sqrt(st.x * st.x + st.y * st.y), speed = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
          ctx2.fillStyle = '#94a3b8'; ctx2.font = 'bold 11px ui-monospace, monospace';
          ctx2.fillText('RANGE ' + range.toFixed(0) + ' m', 12, 20);
          ctx2.fillText('SPEED ' + speed.toFixed(2) + ' m/s ' + (speed > 0.6 && range < 40 ? '⚠' : ''), 12, 36);
          ctx2.fillText('FUEL  ' + st.fuel.toFixed(0) + '%', 12, 52);
          ctx2.fillText(realMode ? 'ORBITAL PHYSICS: ON' : 'ORBITAL PHYSICS: OFF (video-game mode)', 12, Hc - 14);
          if (st.over) {
            ctx2.fillStyle = 'rgba(2,6,23,0.78)'; ctx2.fillRect(0, 0, Wc, Hc);
            ctx2.fillStyle = st.msg.indexOf('capture') >= 0 || st.msg.indexOf('Soft') >= 0 ? '#4ade80' : '#fbbf24';
            ctx2.font = 'bold 15px system-ui'; ctx2.textAlign = 'center';
            var words = st.msg.split(' '); var line = ''; var ly = Hc / 2 - 12;
            for (var wi = 0; wi < words.length; wi++) {
              if ((line + words[wi]).length > 60) { ctx2.fillText(line, Wc / 2, ly); ly += 20; line = ''; }
              line += words[wi] + ' ';
            }
            ctx2.fillText(line, Wc / 2, ly);
            ctx2.textAlign = 'left';
          }
        }
        var rafId = 0, frame = 0;
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
          st.x = 26; st.y = -190; st.vx = 0; st.vy = 1.0; st.fuel = 100; st.t = 0; st.over = false; st.msg = '';
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

      // ── Interior views (SVG "peek inside" for Cupola + sleep cabin) ──
      function renderCupolaInterior() {
        var scene = d.cupolaScene || 'day';
        var shut = !!d.cupolaShut;
        var SCENES = {
          day: { fill: '#2f6fab', label: __alloT('stem.spacestation.scene_day', '☀️ Daylit Pacific'), note: 'Cloud spirals and ocean glint — crews say the blue is beyond any photograph.' },
          night: { fill: '#0b1026', label: __alloT('stem.spacestation.scene_night', '🌃 Night — city lights'), note: 'Cities web the darkness in gold; lightning storms flicker hundreds of km wide.' },
          aurora: { fill: '#123a2e', label: __alloT('stem.spacestation.scene_aurora', '🟢 Aurora pass'), note: 'The station flies THROUGH the upper fringes of aurora — green curtains below and beside you.' }
        };
        var sc = SCENES[scene] || SCENES.day;
        function windowPane(x, y, w, hgt, key) {
          return h('g', { key: key },
            h('rect', { x: x, y: y, width: w, height: hgt, rx: 6, fill: shut ? '#39424f' : sc.fill, stroke: '#94a3b8', strokeWidth: 2 }),
            shut ? h('line', { x1: x + 4, y1: y + hgt / 2, x2: x + w - 4, y2: y + hgt / 2, stroke: '#556072', strokeWidth: 3 }) :
              scene === 'aurora' ? h('path', { d: 'M ' + (x + 4) + ' ' + (y + hgt - 8) + ' Q ' + (x + w / 2) + ' ' + (y + 4) + ' ' + (x + w - 4) + ' ' + (y + hgt - 10), fill: 'none', stroke: '#4ade80', strokeWidth: 3, opacity: 0.8 }) :
              scene === 'night' ? h('g', null, [0, 1, 2, 3].map(function (i) { return h('circle', { key: i, cx: x + 6 + ((i * 37) % (w - 10)), cy: y + 8 + ((i * 23) % (hgt - 14)), r: 1.5, fill: '#fde68a' }); })) :
              h('ellipse', { cx: x + w / 2, cy: y + hgt - 2, rx: w * 0.55, ry: 6, fill: '#e8f4ff', opacity: 0.5 })
          );
        }
        return card('🔭 ' + __alloT('stem.spacestation.inside_cupola', 'Inside the Cupola'),
          h('div', null,
            h('svg', { viewBox: '0 0 360 180', role: 'img', 'aria-label': __alloT('stem.spacestation.cupola_aria', 'View from inside the Cupola dome: six angled windows around a large round center window, looking down at Earth. Scene: ') + sc.label, style: { width: '100%', maxWidth: 480, display: 'block', margin: '0 auto', background: '#101725', borderRadius: 12, border: '1px solid #334155' } },
              windowPane(12, 62, 70, 56, 'w1'), windowPane(88, 30, 70, 44, 'w2'), windowPane(202, 30, 70, 44, 'w3'), windowPane(278, 62, 70, 56, 'w4'),
              windowPane(88, 118, 70, 44, 'w5'), windowPane(202, 118, 70, 44, 'w6'),
              h('circle', { cx: 180, cy: 96, r: 34, fill: shut ? '#39424f' : sc.fill, stroke: '#94a3b8', strokeWidth: 3 }),
              !shut ? h('ellipse', { cx: 180, cy: 112, rx: 26, ry: 8, fill: scene === 'day' ? '#e8f4ff' : scene === 'aurora' ? '#4ade80' : '#fde68a', opacity: 0.45 }) : null,
              h('text', { x: 180, y: 14, textAnchor: 'middle', fill: '#64748b', fontSize: 9 }, '80 cm center window — the largest ever flown in space')
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
            h('svg', { viewBox: '0 0 200 160', role: 'img', 'aria-label': __alloT('stem.spacestation.cabin_aria', 'Cutaway of a crew sleep cabin, about the size of a phone booth. Tap the hotspot buttons to inspect items.'), style: { width: '100%', maxWidth: 380, display: 'block', margin: '0 auto', background: '#101725', borderRadius: 12, border: '1px solid #334155' } },
              h('rect', { x: 14, y: 10, width: 172, height: 140, rx: 10, fill: '#1c2434', stroke: '#475569', strokeWidth: 2 }),
              h('rect', { x: 80, y: 26, width: 34, height: 118, rx: 12, fill: '#334a66', stroke: '#64748b' }),
              h('circle', { cx: 97, cy: 40, r: 9, fill: '#e8d8c3' }),
              h('rect', { x: 30, y: 40, width: 26, height: 18, rx: 3, fill: '#0f172a', stroke: '#64748b' }),
              h('rect', { x: 138, y: 18, width: 24, height: 12, rx: 3, fill: '#0f172a', stroke: '#64748b' }),
              [0, 1, 2].map(function (i) { return h('line', { key: i, x1: 141 + i * 7, y1: 20, x2: 141 + i * 7, y2: 28, stroke: '#475569' }); }),
              h('rect', { x: 138, y: 108, width: 26, height: 24, rx: 4, fill: '#243146', stroke: '#64748b' }),
              h('rect', { x: 30, y: 112, width: 22, height: 16, rx: 2, fill: '#3b2f3f', stroke: '#a78bfa' }),
              h('circle', { cx: sp.x, cy: sp.y, r: 8, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5 })
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
                h('button', { type: 'button', onClick: function (e) { var cv = e.currentTarget.parentElement.parentElement.querySelector('canvas'); if (cv && cv._dockReset) cv._dockReset(dockRealMode); upd({ dockResult: null, dockMsg: '' }); }, style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, '🔁 ' + __alloT('stem.spacestation.dock_retry', 'New approach')),
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
              !evaS.started ? h('button', { type: 'button', onClick: evaReset, style: { padding: '8px 16px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer' } }, '🚪 ' + __alloT('stem.spacestation.eva_start', 'Open the hatch')) :
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

      // ── Tabs ──
      var TABS = [
        { id: 'map', icon: '🛰️', label: __alloT('stem.spacestation.tab_map', '3-D Station') },
        { id: 'day', icon: '👩‍🚀', label: __alloT('stem.spacestation.tab_day', 'A Day Aboard') },
        { id: 'systems', icon: '⚙️', label: __alloT('stem.spacestation.tab_systems', 'Systems & Challenges') },
        { id: 'orbit', icon: '🧮', label: __alloT('stem.spacestation.tab_orbit', 'Orbit Lab') },
        { id: 'missions', icon: '🎮', label: __alloT('stem.spacestation.tab_missions', 'Missions') },
        { id: 'history', icon: '📜', label: __alloT('stem.spacestation.tab_history', 'History & Future') },
        { id: 'quiz', icon: '🧠', label: __alloT('stem.spacestation.tab_quiz', 'Quiz') }
      ];
      var tab = d.tab || 'map';

      function renderMap() {
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.map_intro', 'A schematic (not to scale) 3-D map of the real station. Drag to spin it, click any module to inspect it. The lighting sweeps through a full orbit: the station crosses from daylight into Earth’s shadow 16 times a day.')),
          h('div', { style: { position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', background: '#050a18' } },
            h('canvas', {
              ref: function (cv) { if (cv) { cv._issWantSel = d.selModule; stationCanvasRef(cv); } },
              role: 'application', tabIndex: 0,
              'aria-label': __alloT('stem.spacestation.canvas_aria', 'Interactive 3-D model of the International Space Station. Drag to rotate. Use the module buttons below the canvas to inspect each module.'),
              style: { width: '100%', height: '420px', display: 'block' }
            })
          ),
          h('div', { role: 'group', 'aria-label': 'Station modules', style: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' } },
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
              h('p', { style: { fontSize: 13, color: TEXT, lineHeight: 1.65, margin: '0 0 8px' } }, selModule.role),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', fontSize: 12, color: TEXT, lineHeight: 1.55, marginBottom: 6 } },
                h('strong', { style: { color: '#7dd3fc' } }, __alloT('stem.spacestation.fact', 'Worth knowing: ')), selModule.fact),
              h('div', { style: { padding: 8, borderRadius: 8, background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24', fontSize: 12, color: TEXT, lineHeight: 1.55 } },
                h('strong', { style: { color: '#fbbf24' } }, __alloT('stem.spacestation.eng', 'Engineering spotlight: ')), selModule.eng)
            ), '#38bdf8'),
          selModule.id === 'cupola' ? renderCupolaInterior() : null,
          selModule.id === 'harmony' ? renderSleepInterior() : null,
          card(__alloT('stem.spacestation.fast_facts', '📊 Fast facts'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 } },
              FAST_FACTS.map(function (f, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 10, color: SOFT, textTransform: 'uppercase', letterSpacing: 0.4 } }, f[0]),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: TEXT, marginTop: 2 } }, f[1]));
              })), '#818cf8')
        );
      }

      function renderDay() {
        var idx = Math.max(0, Math.min(DAY_SCHEDULE.length - 1, d.dayIdx || 0));
        var slot = DAY_SCHEDULE[idx];
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.day_intro', 'The station runs on GMT — a compromise between Houston and Moscow. Step through a typical workday. Every line has a WHY: nothing aboard is done a certain way by accident.')),
          h('div', { role: 'group', 'aria-label': 'Daily schedule', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
            DAY_SCHEDULE.map(function (s2, i) {
              var on = i === idx;
              return h('button', {
                key: i, type: 'button', 'aria-pressed': on,
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

      function renderSystems() {
        var idx = Math.max(0, Math.min(SYSTEMS.length - 1, d.sysIdx || 0));
        var sys = SYSTEMS[idx];
        return h('div', null,
          h('p', { style: { fontSize: 12.5, color: SOFT, lineHeight: 1.6, margin: '0 0 10px' } },
            __alloT('stem.spacestation.sys_intro', 'The station is a closed-loop machine that must make its own air, recycle its own water, shed its own heat, and hold its own orientation — forever, with no hardware store. Each system below is an engineering-design case study (NGSS MS-ETS1).')),
          h('div', { role: 'group', 'aria-label': 'Station systems', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
            SYSTEMS.map(function (s2, i) {
              var on = i === idx;
              return h('button', {
                key: s2.id, type: 'button', 'aria-pressed': on,
                onClick: function () { upd({ sysIdx: i }); },
                style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', background: on ? s2.color + '22' : PANEL, color: on ? s2.color : TEXT, border: '1px solid ' + (on ? s2.color : '#334155') }
              }, s2.icon + ' ' + s2.name);
            })),
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
                  return h('div', { key: i, style: { padding: 8, borderRadius: 8, background: 'rgba(2,6,23,0.4)', border: '1px solid #334155' } },
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

      function renderHistory() {
        return h('div', null,
          card(__alloT('stem.spacestation.timeline', '📜 Assembly to retirement'),
            h('div', null, TIMELINE.map(function (t2, i) {
              return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '86px 1fr', gap: 10, padding: '7px 0', borderBottom: i < TIMELINE.length - 1 ? '1px solid rgba(51,65,85,0.5)' : 'none' } },
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

      function renderQuiz() {
        var qi = Math.max(0, Math.min(QUIZ.length - 1, d.quizIdx || 0));
        var q = QUIZ[qi];
        var picked = d.quizPicked;
        return h('div', null,
          d.quizDone ?
            card(__alloT('stem.spacestation.quiz_done', '🏁 Debrief'),
              h('div', null,
                h('p', { style: { fontSize: 16, fontWeight: 800, color: TEXT, margin: '0 0 6px' } }, d.quizScore + ' / ' + QUIZ.length),
                h('p', { style: { fontSize: 12.5, color: SOFT, margin: '0 0 10px' } }, d.quizScore >= 7 ? __alloT('stem.spacestation.quiz_great', 'Flight-controller material. Quest objective complete!') : __alloT('stem.spacestation.quiz_retry', 'Every controller trains on repetitions — revisit the tabs and fly it again.')),
                h('button', { type: 'button', onClick: function () { upd({ quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false }); }, style: { padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' } }, __alloT('stem.spacestation.quiz_again', '🔁 Run it again'))
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
                  style: { marginTop: 10, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }
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
        h('h2', { style: { fontSize: 18, fontWeight: 900, color: TEXT, margin: '0 0 2px' } }, '🛰️ ' + __alloT('stem.spacestation.title', 'Space Station — a permanent home off Earth')),
        h('p', { style: { fontSize: 12, color: SOFT, margin: '0 0 12px' } }, __alloT('stem.spacestation.subtitle', 'The International Space Station: 420 tonnes of engineering falling around the planet at 7.66 km/s, continuously inhabited for over 25 years.')),
        h('div', { role: 'tablist', 'aria-label': __alloT('stem.spacestation.sections', 'Space Station sections'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
          TABS.map(function (t2, ti) {
            var on = tab === t2.id;
            return h('button', {
              key: t2.id, id: 'iss-tab-' + t2.id, type: 'button', role: 'tab',
              'aria-selected': on ? 'true' : 'false', 'aria-controls': 'iss-panel',
              tabIndex: on ? 0 : -1,
              onClick: function () { selectTab(ti, false); },
              onKeyDown: function (e) { onTabKeyDown(e, ti); },
              style: { padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: on ? '#0ea5e9' : PANEL, color: on ? '#04121f' : TEXT, border: on ? '2px solid #7dd3fc' : '1px solid #334155' }
            }, h('span', { 'aria-hidden': 'true' }, t2.icon + ' '), t2.label);
          })),
        h('div', { id: 'iss-panel', role: 'tabpanel', 'aria-labelledby': 'iss-tab-' + tab, tabIndex: 0 },
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
