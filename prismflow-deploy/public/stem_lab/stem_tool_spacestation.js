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
      { id: 'iss_quiz', label: 'Score 7+ on the station quiz', icon: '🧠', check: function (d) { var s = (d && d.spaceStation) || {}; return (s.quizBest || 0) >= 7; } }
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
          title ? h('div', { style: { fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 8 } }, title) : null,
          children);
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
              upd({ selModule: id });
              markSeen('seenModules', id);
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

      // ── Tabs ──
      var TABS = [
        { id: 'map', icon: '🛰️', label: __alloT('stem.spacestation.tab_map', '3-D Station') },
        { id: 'day', icon: '👩‍🚀', label: __alloT('stem.spacestation.tab_day', 'A Day Aboard') },
        { id: 'systems', icon: '⚙️', label: __alloT('stem.spacestation.tab_systems', 'Systems & Challenges') },
        { id: 'orbit', icon: '🧮', label: __alloT('stem.spacestation.tab_orbit', 'Orbit Lab') },
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
                onClick: function () { upd({ selModule: m.id }); markSeen('seenModules', m.id); },
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

      return h('div', { style: { maxWidth: 980 } },
        h('h2', { style: { fontSize: 18, fontWeight: 900, color: TEXT, margin: '0 0 2px' } }, '🛰️ ' + __alloT('stem.spacestation.title', 'Space Station — a permanent home off Earth')),
        h('p', { style: { fontSize: 12, color: SOFT, margin: '0 0 12px' } }, __alloT('stem.spacestation.subtitle', 'The International Space Station: 420 tonnes of engineering falling around the planet at 7.66 km/s, continuously inhabited for over 25 years.')),
        h('div', { role: 'tablist', 'aria-label': 'Space Station sections', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
          TABS.map(function (t2) {
            var on = tab === t2.id;
            return h('button', {
              key: t2.id, type: 'button', role: 'tab', 'aria-selected': on,
              onClick: function () { upd({ tab: t2.id }); },
              style: { padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: on ? '#0ea5e9' : PANEL, color: on ? '#04121f' : TEXT, border: on ? '2px solid #7dd3fc' : '1px solid #334155' }
            }, t2.icon + ' ' + t2.label);
          })),
        tab === 'map' ? renderMap() :
        tab === 'day' ? renderDay() :
        tab === 'systems' ? renderSystems() :
        tab === 'orbit' ? renderOrbit() :
        tab === 'history' ? renderHistory() :
        renderQuiz()
      );
    }
  });
  console.log('[StemLab] stem_tool_spacestation.js loaded — Space Station (3-D ISS + engineering)');
})();
