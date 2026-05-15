// ═══════════════════════════════════════════════════════════════
// stem_tool_raptorhunt.js — Raptor Hunt: Predator Physics + Biology
// Three.js-based hunt simulator + deep-science modules covering
// the diurnal raptors and owls. Headline: a third-person stoop
// minigame where you fly an actual species (peregrine, harpy,
// red-tail, owl, etc) with species-specific physics — high-drag
// pull-out, terminal velocity capped by mass + wing loading,
// silent-flight noise envelope (owls), and prey/talon-grip catch
// detection. Plus interactive science: talon PSI comparison,
// fovea + visual field labs, stoop calculator, owl silent-flight
// mechanics, vision spectrum (UV in kestrels!), conservation arc.
//
// Sources: Tucker (1990, 1998) raptor flight physics; Sustaita
// et al. (2013) raptor grip force biomechanics; Lind et al.
// (2013, 2014) avian visual ecology; Graham (1934, classic peregrine
// stoop timing); Bachmann + Wagner Bonn owl silent-flight studies;
// Hawk Mountain HMANA migration counts; Cornell Lab All About Birds
// species accounts; Peregrine Fund recovery records; HawkWatch
// International monitoring; The Peregrine Falcon by Tom Cade;
// Owls of the World by Mikkola; Raptors of North America by
// Wheeler; Sherub + Newton on Himalayan raptors; Nature article
// 2018 on grizzled-skipper-style "courage" (kidding — actual ref
// is Therrien et al. 2014 on snowy owl winter ecology).
//
// Phase 1 v0.1: Hub + Species Roster + Hunt Sim (Three.js) +
// 6 science modules (Talons / Vision / Flight / Stoop / Silent /
// Senses) + Conservation + Field ID + Resources.
//
// Registered tool ID: "raptorHunt"
// Category: Ecology & Migration (sister to BirdLab)
// ═══════════════════════════════════════════════════════════════

// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('raptorHunt'))) {

(function() {
  'use strict';

  // ─── Live region for state announcements ───
  (function() {
    if (document.getElementById('allo-live-rh')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-rh';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function rhAnnounce(msg) {
    var lr = document.getElementById('allo-live-rh');
    if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
  }

  // ─── Three.js loader (shared bootstrap) ───
  function ensureThreeJS(onReady, onError) {
    if (window.THREE) { onReady(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.async = true;
    s.onload = function() { onReady(); };
    s.onerror = function() { console.error('[RaptorHunt] Three.js failed to load'); if (onError) onError(); };
    document.head.appendChild(s);
  }

  // ───────────────────────────────────────────────────────────
  // SPECIES DATA — 8 raptors with hunt + biology + flight stats
  // ───────────────────────────────────────────────────────────
  // Fields:
  //   id, name, scientific, emoji, family, isOwl
  //   massKg (avg adult), wingspanM, wingAreaSqM, wingLoading (kg/m²)
  //   aspectRatio (b²/S — high = soaring, low = agile)
  //   maxLevelMph, stoopMph (terminal dive speed in stoop posture)
  //   talonForcePsi (estimated grip pressure), talonLengthMm
  //   visualAcuityX (vs human 1x), foveaCount (1 or 2), visualFieldDeg
  //   eyeWeightPctBody (eyes as % body mass)
  //   habitat, prey, huntStyle, ecology
  //   conservation, range, weird (one banger fact)
  //   biome (terrain to use in Three.js sim)
  //   stoopDiveBonus (multiplier for sim — high = peregrine-like)
  //   pullupG (G-force species can sustain at stoop bottom)
  var SPECIES = [
    { id: 'peregrine', name: 'Peregrine Falcon', scientific: 'Falco peregrinus', emoji: '🦅', family: 'Falconidae', isOwl: false,
      massKg: 0.95, wingspanM: 1.05, wingAreaSqM: 0.108, wingLoading: 8.8, aspectRatio: 10.2,
      maxLevelMph: 65, stoopMph: 242,
      talonForcePsi: 230, talonLengthMm: 28,
      visualAcuityX: 2.6, foveaCount: 2, visualFieldDeg: 200,
      eyeWeightPctBody: 4.0,
      habitat: ['cliff', 'urban', 'coast'], prey: ['pigeon', 'duck', 'songbird', 'shorebird'],
      huntStyle: 'stoop (high-speed dive from altitude, strike with clenched feet)',
      ecology: 'Most cosmopolitan vertebrate on Earth (every continent except Antarctica). Urban populations rebounded after DDT ban + skyscraper nest boxes.',
      conservation: 'Least Concern globally (recovered); DDT-era recovery success story',
      range: 'Cosmopolitan (every continent except Antarctica)',
      weird: 'Fastest animal alive. Confirmed dive speed ~242 mph by Cornell radar 2005. Nictitating membrane (third eyelid) protects the eye at terminal velocity; tubercles in the nostrils redirect airflow so high-pressure wind doesn\'t collapse the lungs.',
      biome: 'cliff',
      stoopDiveBonus: 3.5, pullupG: 27 },

    { id: 'baldEagle', name: 'Bald Eagle', scientific: 'Haliaeetus leucocephalus', emoji: '🦅', family: 'Accipitridae', isOwl: false,
      massKg: 4.5, wingspanM: 2.0, wingAreaSqM: 0.62, wingLoading: 7.3, aspectRatio: 6.5,
      maxLevelMph: 44, stoopMph: 100,
      talonForcePsi: 400, talonLengthMm: 50,
      visualAcuityX: 5.0, foveaCount: 2, visualFieldDeg: 220,
      eyeWeightPctBody: 3.0,
      habitat: ['coast', 'lake', 'river', 'forest'], prey: ['fish', 'waterfowl', 'carrion', 'small mammal'],
      huntStyle: 'soar + low-angle dive; klepto-parasitism (steals from ospreys + other eagles)',
      ecology: 'Sea eagle — closely tied to large fish-bearing water bodies. Sister species to Steller\'s + white-tailed eagles. DDT-era population crash; full recovery by 2007 delisting.',
      conservation: 'Least Concern (recovered from DDT-era endangered listing)',
      range: 'North America (Alaska + lower 48 + Canada + N. Mexico)',
      weird: 'Build a stick nest the size of a small car (record: 9.5 ft wide × 20 ft deep, 3 tons). Eat opportunistically — half their winter diet on the lower Mississippi is fish carrion, not active kills.',
      biome: 'lake',
      stoopDiveBonus: 2.0, pullupG: 8 },

    { id: 'redTail', name: 'Red-tailed Hawk', scientific: 'Buteo jamaicensis', emoji: '🦅', family: 'Accipitridae', isOwl: false,
      massKg: 1.15, wingspanM: 1.3, wingAreaSqM: 0.31, wingLoading: 3.7, aspectRatio: 5.4,
      maxLevelMph: 40, stoopMph: 120,
      talonForcePsi: 200, talonLengthMm: 32,
      visualAcuityX: 4.0, foveaCount: 2, visualFieldDeg: 220,
      eyeWeightPctBody: 2.8,
      habitat: ['open-country', 'edge', 'highway-edge'], prey: ['rodent', 'rabbit', 'snake', 'small bird'],
      huntStyle: 'perch-and-pounce (most common) + soaring + kiting in headwind',
      ecology: 'Most common large raptor in North America. The "movie hawk" — its scream is dubbed into films when the actual bird shown is a bald eagle (whose real call is a wimpy chitter).',
      conservation: 'Least Concern; thriving on roadside-edge habitat',
      range: 'North America (Alaska to Panama)',
      weird: 'Has 14 named plumage subspecies on the same continent (Harlan\'s, Krider\'s, Western, Eastern, Florida, Fuertes\', etc). Telephone poles are perfect hunting perches over mowed highway shoulders — explains why you see them every 5 minutes on a road trip.',
      biome: 'grassland',
      stoopDiveBonus: 2.2, pullupG: 10 },

    { id: 'harpyEagle', name: 'Harpy Eagle', scientific: 'Harpia harpyja', emoji: '🦅', family: 'Accipitridae', isOwl: false,
      massKg: 7.5, wingspanM: 2.05, wingAreaSqM: 0.50, wingLoading: 15.0, aspectRatio: 5.6,
      maxLevelMph: 50, stoopMph: 80,
      talonForcePsi: 530, talonLengthMm: 125,
      visualAcuityX: 4.5, foveaCount: 2, visualFieldDeg: 220,
      eyeWeightPctBody: 2.5,
      habitat: ['rainforest-canopy'], prey: ['sloth', 'howler-monkey', 'capuchin-monkey', 'coati', 'iguana'],
      huntStyle: 'still-hunt from high perch + crashing dive through canopy (broad wings cup branches like brake flaps)',
      ecology: 'Largest + most powerful eagle in the Americas (the Philippine eagle slightly exceeds it in wingspan but not in talon strength). Apex predator of the Amazon canopy.',
      conservation: 'Vulnerable (IUCN); habitat loss is primary threat; very slow reproduction (one chick per 2-3 years)',
      range: 'Neotropical lowland rainforest — S. Mexico to N. Argentina; strongholds in Amazon + Darién Gap',
      weird: 'Talons up to 5 inches (12.5 cm) — longer than a grizzly bear\'s claws. Grip force ~530 psi crushes monkey skulls instantly. Despite massive size, broad short wings let it maneuver between rainforest trees at speed.',
      biome: 'rainforest',
      stoopDiveBonus: 1.7, pullupG: 6 },

    { id: 'greatHorned', name: 'Great Horned Owl', scientific: 'Bubo virginianus', emoji: '🦉', family: 'Strigidae', isOwl: true,
      massKg: 1.45, wingspanM: 1.4, wingAreaSqM: 0.40, wingLoading: 3.6, aspectRatio: 4.9,
      maxLevelMph: 40, stoopMph: 55,
      talonForcePsi: 500, talonLengthMm: 30,
      visualAcuityX: 2.0, foveaCount: 1, visualFieldDeg: 110,
      eyeWeightPctBody: 5.0,
      habitat: ['forest', 'edge', 'urban-park', 'desert'], prey: ['rabbit', 'rodent', 'skunk', 'cat', 'small owl'],
      huntStyle: 'still-hunt from perch + silent glide attack; favors twilight + night',
      ecology: 'Most widespread owl in the Americas. Apex nocturnal predator in most temperate-forest ecosystems. One of the few predators that routinely kills skunks (poor sense of smell makes them unbothered).',
      conservation: 'Least Concern; one of the most adaptable owls',
      range: 'Americas (subarctic Canada to Tierra del Fuego)',
      weird: 'Talon grip force ~500 psi is the highest documented for a North American raptor — exceeds bald eagle despite being a third the size. Crushes vertebrae before prey can react.',
      biome: 'forest-night',
      stoopDiveBonus: 1.3, pullupG: 5 },

    { id: 'goldenEagle', name: 'Golden Eagle', scientific: 'Aquila chrysaetos', emoji: '🦅', family: 'Accipitridae', isOwl: false,
      massKg: 4.2, wingspanM: 2.1, wingAreaSqM: 0.65, wingLoading: 6.5, aspectRatio: 6.8,
      maxLevelMph: 50, stoopMph: 200,
      talonForcePsi: 750, talonLengthMm: 65,
      visualAcuityX: 5.5, foveaCount: 2, visualFieldDeg: 220,
      eyeWeightPctBody: 3.2,
      habitat: ['mountain', 'open-country', 'tundra', 'cliff'], prey: ['rabbit', 'ground-squirrel', 'fawn-deer', 'pronghorn-calf', 'fox'],
      huntStyle: 'high-altitude stoop + low-contour hunting at ridgeline; the only American eagle that routinely takes mammals as primary prey',
      ecology: 'Apex predator of western mountains. Documented kills include adult mountain goats (pushed off cliffs), gray wolves (in Mongolia), and red deer calves. Mongolian eagle hunters (Berkutchi) train this species.',
      conservation: 'Least Concern; locally threatened by lead-shot poisoning + wind turbine collisions',
      range: 'Holarctic — North America + Eurasia + N. Africa',
      weird: 'Talon force ~750 psi (highest documented for any raptor). Mongolian Berkutchi eagle hunters train them to take wolves from horseback — a tradition dating to Genghis Khan.',
      biome: 'mountain',
      stoopDiveBonus: 3.0, pullupG: 22 },

    { id: 'northernGoshawk', name: 'Northern Goshawk', scientific: 'Accipiter gentilis', emoji: '🦅', family: 'Accipitridae', isOwl: false,
      massKg: 1.0, wingspanM: 1.1, wingAreaSqM: 0.20, wingLoading: 5.0, aspectRatio: 6.1,
      maxLevelMph: 38, stoopMph: 95,
      talonForcePsi: 300, talonLengthMm: 35,
      visualAcuityX: 3.5, foveaCount: 2, visualFieldDeg: 220,
      eyeWeightPctBody: 3.5,
      habitat: ['mature-forest', 'boreal'], prey: ['grouse', 'songbird', 'squirrel', 'hare'],
      huntStyle: 'forest-interior chase — bursts from cover at speed, threads through dense canopy after prey',
      ecology: 'Forest-interior agility specialist. Short wings + long tail = high turning rate at the cost of stoop speed. Drives many smaller forest birds + raptors out of their territories.',
      conservation: 'Least Concern but declining in much of Europe + N. America with mature-forest loss',
      range: 'Holarctic boreal + temperate forest — North America + Eurasia',
      weird: 'Falconers consider it the most temperamental + difficult species to train. Females are 35-50% larger than males — most extreme sexual size dimorphism among raptors, possibly because males hunt smaller agile birds + females take large grouse/hares.',
      biome: 'boreal-forest',
      stoopDiveBonus: 1.8, pullupG: 12 },

    { id: 'osprey', name: 'Osprey', scientific: 'Pandion haliaetus', emoji: '🦅', family: 'Pandionidae', isOwl: false,
      massKg: 1.6, wingspanM: 1.65, wingAreaSqM: 0.41, wingLoading: 3.9, aspectRatio: 6.7,
      maxLevelMph: 45, stoopMph: 80,
      talonForcePsi: 250, talonLengthMm: 35,
      visualAcuityX: 4.0, foveaCount: 1, visualFieldDeg: 200,
      eyeWeightPctBody: 3.2,
      habitat: ['coast', 'lake', 'river'], prey: ['fish (99% of diet)'],
      huntStyle: 'plunge-dive feet-first from 30-100 ft, fully submerges for 1-2 seconds; closes nostrils with flap',
      ecology: 'Only living member of family Pandionidae — split from other raptors ~30 mya. Fish-specialist anatomy is unique: reversible outer toe (zygodactyl grip) + barbed footpad scales (spicules) that lock onto wet scales.',
      conservation: 'Least Concern (recovered from DDT-era crash); platform-nesting on poles + buoys very successful',
      range: 'Cosmopolitan — every continent except Antarctica',
      weird: 'Reversible outer toe + spicules on the foot pads = a "two-pronged tongs" grip designed specifically for grasping slippery wet fish. Closes nostrils with a flap of skin before submerging — no other raptor has this.',
      biome: 'lake',
      stoopDiveBonus: 1.6, pullupG: 5 }
  ];

  // ───────────────────────────────────────────────────────────
  // PREY DATA — per species defaults + sim spawn parameters
  // ───────────────────────────────────────────────────────────
  // Fields:
  //   id, label, color, sizeM, speedMps, behavior (still | wander | flee-on-sight)
  //   pointValue (XP awarded on catch), terrainPreference
  var PREY = {
    pigeon:        { id: 'pigeon',        label: 'Pigeon',           color: 0x9ca3af, sizeM: 0.18, speedMps: 8.0, behavior: 'flee-on-sight', points: 8,  terrain: 'urban-cliff' },
    duck:          { id: 'duck',          label: 'Mallard',          color: 0x14532d, sizeM: 0.25, speedMps: 6.5, behavior: 'flee-on-sight', points: 12, terrain: 'lake' },
    songbird:      { id: 'songbird',      label: 'Songbird',         color: 0xf59e0b, sizeM: 0.10, speedMps: 5.0, behavior: 'flee-on-sight', points: 5,  terrain: 'grassland' },
    shorebird:     { id: 'shorebird',     label: 'Shorebird',        color: 0xe5e7eb, sizeM: 0.15, speedMps: 5.5, behavior: 'flee-on-sight', points: 7,  terrain: 'coast' },
    fish:          { id: 'fish',          label: 'Fish (surface)',   color: 0x60a5fa, sizeM: 0.30, speedMps: 1.5, behavior: 'wander',        points: 10, terrain: 'lake' },
    waterfowl:     { id: 'waterfowl',     label: 'Waterfowl',        color: 0x166534, sizeM: 0.30, speedMps: 4.0, behavior: 'wander',        points: 12, terrain: 'lake' },
    rodent:        { id: 'rodent',        label: 'Field Mouse',      color: 0x78350f, sizeM: 0.08, speedMps: 3.0, behavior: 'wander',        points: 6,  terrain: 'grassland' },
    rabbit:        { id: 'rabbit',        label: 'Cottontail',       color: 0xa78b6f, sizeM: 0.22, speedMps: 7.0, behavior: 'flee-on-sight', points: 10, terrain: 'grassland' },
    snake:         { id: 'snake',         label: 'Snake',            color: 0x365314, sizeM: 0.50, speedMps: 1.8, behavior: 'wander',        points: 9,  terrain: 'grassland' },
    sloth:         { id: 'sloth',         label: 'Three-toed Sloth', color: 0x44403c, sizeM: 0.45, speedMps: 0.25, behavior: 'still',         points: 18, terrain: 'rainforest' },
    howlerMonkey:  { id: 'howlerMonkey',  label: 'Howler Monkey',    color: 0x1c1917, sizeM: 0.40, speedMps: 5.0, behavior: 'flee-on-sight', points: 16, terrain: 'rainforest' },
    capuchin:      { id: 'capuchin',      label: 'Capuchin Monkey',  color: 0x57534e, sizeM: 0.35, speedMps: 6.5, behavior: 'flee-on-sight', points: 14, terrain: 'rainforest' },
    coati:         { id: 'coati',         label: 'Coati',            color: 0x92400e, sizeM: 0.50, speedMps: 5.0, behavior: 'wander',        points: 12, terrain: 'rainforest' },
    skunk:         { id: 'skunk',         label: 'Skunk',            color: 0x18181b, sizeM: 0.35, speedMps: 2.0, behavior: 'wander',        points: 11, terrain: 'forest-night' },
    smallOwl:      { id: 'smallOwl',      label: 'Screech Owl',      color: 0x57534e, sizeM: 0.20, speedMps: 7.0, behavior: 'wander',        points: 15, terrain: 'forest-night' },
    groundSquirrel:{ id: 'groundSquirrel', label: 'Ground Squirrel', color: 0xa16207, sizeM: 0.18, speedMps: 6.0, behavior: 'flee-on-sight', points: 9,  terrain: 'mountain' },
    fawnDeer:      { id: 'fawnDeer',      label: 'Fawn',             color: 0xa16207, sizeM: 0.70, speedMps: 8.0, behavior: 'flee-on-sight', points: 22, terrain: 'mountain' },
    pronghornCalf: { id: 'pronghornCalf', label: 'Pronghorn Calf',   color: 0xb45309, sizeM: 0.80, speedMps: 12.0, behavior: 'flee-on-sight', points: 24, terrain: 'mountain' },
    fox:           { id: 'fox',           label: 'Red Fox',          color: 0xc2410c, sizeM: 0.50, speedMps: 11.0, behavior: 'flee-on-sight', points: 16, terrain: 'mountain' },
    grouse:        { id: 'grouse',        label: 'Ruffed Grouse',    color: 0x713f12, sizeM: 0.30, speedMps: 9.0, behavior: 'flee-on-sight', points: 13, terrain: 'boreal-forest' },
    hare:          { id: 'hare',          label: 'Snowshoe Hare',    color: 0xd6d3d1, sizeM: 0.35, speedMps: 13.0, behavior: 'flee-on-sight', points: 14, terrain: 'boreal-forest' },
    squirrel:      { id: 'squirrel',      label: 'Squirrel',         color: 0x57534e, sizeM: 0.20, speedMps: 7.0, behavior: 'flee-on-sight', points: 8,  terrain: 'boreal-forest' }
  };

  // Per-species prey list (drives sim spawning)
  var SPECIES_PREY = {
    peregrine:       ['pigeon', 'songbird', 'shorebird', 'duck'],
    baldEagle:       ['fish', 'waterfowl', 'duck'],
    redTail:         ['rodent', 'rabbit', 'snake', 'songbird'],
    harpyEagle:      ['sloth', 'howlerMonkey', 'capuchin', 'coati'],
    greatHorned:     ['rabbit', 'rodent', 'skunk', 'smallOwl'],
    goldenEagle:     ['groundSquirrel', 'fawnDeer', 'pronghornCalf', 'fox'],
    northernGoshawk: ['grouse', 'songbird', 'squirrel', 'hare'],
    osprey:          ['fish']
  };

  // ───────────────────────────────────────────────────────────
  // SCIENCE TOPICS — 6 deep-dive modules
  // ───────────────────────────────────────────────────────────

  // ── Talon Mechanics ──
  var TALON_FACTS = {
    header: 'Talons: The Business End',
    overview: 'A raptor\'s talon is the killing surface — a hyper-keratinized claw on each toe, curved to penetrate, and driven by some of the strongest grip muscles in the vertebrate world. Grip force varies enormously across species and tracks prey size: harpy eagles crush monkey skulls (~530 psi), golden eagles compress wolf vertebrae (~750 psi), great horned owls dispatch rabbits in a single squeeze (~500 psi). For comparison: human grip ~80 psi, German shepherd bite ~238 psi, jaguar bite ~1,500 psi (whole-skull crush), peregrine falcon talon strike ~230 psi (but applied as a fist-blow at 200+ mph — kinetic energy, not grip).',
    keyPoints: [
      { title: 'Hallux vs digits', text: 'Most birds have 4 toes (3 forward, 1 back = anisodactyl). Raptors use a heavily-developed hallux (rear toe) as the primary kill weapon — it punctures vital organs. Owls + osprey can rotate the outer toe so 2 forward + 2 back (zygodactyl/semi-zygodactyl) — better grip on round prey or wriggling fish.' },
      { title: 'Grip lock mechanism', text: 'A passive flexor-tendon ratchet means the talons stay clenched without active muscle work. Once they close on prey, they stay closed — energy-efficient for long flights with a load.' },
      { title: 'Talon length scales with prey size', text: 'Insectivores: short, blunt talons. Bird-hunters: medium, sharp, curved. Mammal-hunters: longest + most curved (harpy + golden). Fish-hunters (osprey): short but with barbed scales on the foot pad to lock onto slippery scales.' },
      { title: 'Why kestrels and falcons don\'t need monster grip', text: 'Falconid raptors kill mostly with a high-speed strike to the head or back, then sever the cervical vertebrae with a special "tomial tooth" on the upper beak. Accipitrids (hawks/eagles) kill more often by sustained grip — so they evolved heavier talons.' },
      { title: 'Talon force isn\'t pressure — it\'s pressure × area × time', text: 'A peregrine\'s 230 psi strike lasts ~10 ms but delivers ~5 J of kinetic energy. A harpy\'s 530 psi grip lasts 30+ seconds and compresses the entire skull. Different killing strategies, both lethal.' }
    ],
    psiComparison: [
      { name: 'Human grip', psi: 80, color: 'slate' },
      { name: 'Peregrine falcon (strike)', psi: 230, color: 'amber' },
      { name: 'German shepherd bite', psi: 238, color: 'slate' },
      { name: 'Red-tailed hawk', psi: 200, color: 'amber' },
      { name: 'Cooper\'s hawk', psi: 220, color: 'amber' },
      { name: 'Bald eagle', psi: 400, color: 'orange' },
      { name: 'Great horned owl', psi: 500, color: 'orange' },
      { name: 'Harpy eagle', psi: 530, color: 'orange' },
      { name: 'Golden eagle', psi: 750, color: 'red' },
      { name: 'Jaguar bite (whole skull)', psi: 1500, color: 'slate' }
    ]
  };

  // ── Vision Lab ──
  var VISION_FACTS = {
    header: 'Vision: Why Raptors See Better Than You',
    overview: 'A red-tailed hawk reads a newspaper headline from 100 feet. A golden eagle spots a rabbit at 2 miles. Their visual acuity is 4-8× human — but acuity is only one axis. Raptors also have wider visual fields, better color resolution, two foveas per eye (humans have one), UV sensitivity in some species (kestrels see vole urine trails), and a third eyelid that protects the eye during a 200 mph stoop. They pay for this with eyes so large they nearly fill the skull — a golden eagle eye is the size of a human eye, in a head the size of a tennis ball.',
    keyPoints: [
      { title: 'Acuity comes from packing density', text: 'Human fovea: ~200,000 cones/mm². Raptor central fovea: ~1,000,000+ cones/mm². The fovea itself is also relatively larger. Together this gives raptors the ability to resolve detail 4-8× finer than humans.' },
      { title: 'Two foveas per eye', text: 'Most raptors have a deep central fovea (for binocular forward gaze on prey) AND a shallow temporal fovea (for monocular sideways gaze). The two foveas let them maintain detail in two directions at once — useful when stooping while also scanning for kleptoparasites.' },
      { title: 'UV vision in falconids', text: 'American kestrels can see ultraviolet light. Vole urine + dung trails reflect UV strongly, so the kestrel literally sees a glowing "highway" of vole travel routes across a meadow. Discovered by Viitala et al. (1995) Nature.' },
      { title: 'The eye is massive relative to body', text: 'Great horned owl eye = ~5% of body mass (a human equivalent would be a 7-lb eye each). Eagles\' eyes are also so large they cannot rotate them — they must move the whole head. Hence the constant head-tilting of perched raptors.' },
      { title: 'Owls are different', text: 'Owls have tubular eyes (not spherical) and pack rods, not cones — they trade color resolution for low-light sensitivity. A great horned owl can spot prey at light levels ~100× dimmer than a human can. Most owls have one fovea, not two.' },
      { title: 'Pecten oculi', text: 'A unique vascular comb-shaped structure in the back of the bird eye. It supplies nutrients to the retina without blood vessels crossing the retina itself — keeping the visual field clean of shadows. No mammal has this.' }
    ],
    speciesComparison: [
      { name: 'Human', acuity: 1.0, fovea: 1, fieldDeg: 180, binocularDeg: 120, color: 'slate' },
      { name: 'Domestic cat', acuity: 0.4, fovea: 1, fieldDeg: 200, binocularDeg: 140, color: 'slate' },
      { name: 'Owl (great horned)', acuity: 2.0, fovea: 1, fieldDeg: 110, binocularDeg: 70, color: 'indigo' },
      { name: 'Peregrine falcon', acuity: 2.6, fovea: 2, fieldDeg: 200, binocularDeg: 30, color: 'amber' },
      { name: 'Red-tailed hawk', acuity: 4.0, fovea: 2, fieldDeg: 220, binocularDeg: 35, color: 'amber' },
      { name: 'Bald eagle', acuity: 5.0, fovea: 2, fieldDeg: 220, binocularDeg: 35, color: 'orange' },
      { name: 'Golden eagle', acuity: 5.5, fovea: 2, fieldDeg: 220, binocularDeg: 35, color: 'red' }
    ]
  };

  // ── Flight Physics ──
  var FLIGHT_FACTS = {
    header: 'Flight: Wing Geometry Tells Hunt Strategy',
    overview: 'You can predict almost everything about a raptor\'s hunt style from two numbers: wing loading (mass / wing area, in kg/m²) and aspect ratio (wingspan² / wing area). High wing loading = fast, fast-stalling, dive-specialized — falcons. Low wing loading = slow, agile, can soar — vultures + buteos. High aspect ratio = efficient long-distance soaring (eagles, albatrosses). Low aspect ratio = short turning radius (accipiters in forest). Designers don\'t need to draw the wing — these two numbers determine 90% of flight behavior.',
    keyPoints: [
      { title: 'Wing loading drives stall speed', text: 'Higher loading = higher stall speed. A peregrine (8.8 kg/m²) stalls at ~25 mph; a vulture (3 kg/m²) stalls at ~15 mph. This is why falcons need long takeoff runs and vultures can lift off from a flap or two.' },
      { title: 'Aspect ratio drives glide efficiency', text: 'Soaring birds have long thin wings (AR 8-12). Forest birds have short broad wings (AR 4-6). High AR = lower induced drag = longer glides per altitude lost. The albatross (AR ~15) holds the avian record.' },
      { title: 'Slot wing primary feathers', text: 'Eagles and buteos spread their wingtip primaries during slow soaring. Each gap acts as a mini high-AR wing — reducing induced drag at the wingtip vortex. It\'s why their wingtips look "fingered." Falcons + accipiters lack this slotting.' },
      { title: 'Buteos kite into headwinds', text: 'A red-tail facing a 30 mph wind can hold absolutely stationary in the air while scanning a field — wings angled to balance lift + weight + thrust. This is "kiting." Kestrels are even better at it (hovering with active wing-beat).' },
      { title: 'Stoop posture vs glide posture', text: 'In a peregrine\'s stoop, wings tuck close, body becomes a tear-drop, drag coefficient drops to ~0.18 (worse than a sphere). In glide, wings extend, drag coefficient is ~0.04. The wing shape is the speed brake.' },
      { title: 'Why owls fly silently', text: 'Owl primaries have a serrated leading edge (breaks up the turbulence that normally generates noise at the wing\'s front), a soft trailing edge fringe (absorbs trailing edge vortex sound), and velvety dorsal feathers (absorb friction noise). See the Silent Flight module.' }
    ],
    flightTypes: [
      { type: 'Falcon stoop', loading: 'High', ar: 'Med-High', desc: 'Pointed wings, fast level + lethal dive, terrible at slow soaring. Peregrine, prairie falcon.' },
      { type: 'Eagle soar', loading: 'Med', ar: 'High', desc: 'Long broad wings with slotted tips. Thermal-soaring, low-energy flight, opportunistic dive. Bald, golden, harpy.' },
      { type: 'Buteo kite + soar', loading: 'Low', ar: 'Med', desc: 'Broad fanned tail + slotted wingtips. Can hover-kite, soar in thermals, dive on prey. Red-tailed, rough-legged.' },
      { type: 'Accipiter forest chase', loading: 'Med', ar: 'Low', desc: 'Short broad wings + long rudder tail = high agility, terrible glide. Coopers, sharp-shinned, goshawk.' },
      { type: 'Osprey plunge', loading: 'Low-Med', ar: 'High', desc: 'Long thin wings for cruising over water; deep wingbeat lets them hover briefly before plunging.' },
      { type: 'Owl silent glide', loading: 'Low', ar: 'Low-Med', desc: 'Wide broad wings with comb-edged primaries. Silent stalk + drop attack from perch.' }
    ]
  };

  // ── Stoop Calculator ──
  var STOOP_FACTS = {
    header: 'The Stoop: How a Falcon Becomes a Bullet',
    overview: 'The peregrine\'s stoop is one of the most studied feats of biological engineering. Starting at 500-3000 ft altitude, the bird folds wings + body into a teardrop, accelerates at near-g until reaching terminal velocity (~242 mph confirmed by Cornell radar 2005). At that speed, kinetic energy per kilogram is ~5,500 J — equivalent to a pistol bullet. The kill is a punch with clenched feet, not a grab; the prey is decapitated by impact or stunned + retrieved seconds later as it tumbles. The pullout requires 25+ G acceleration; the bird\'s circulatory system has special features to keep blood pressure controlled. Drag coefficient in stoop posture is ~0.18 — better than a soccer ball, worse than a smooth sphere, comparable to a teardrop pendant.',
    formula: 'v_terminal = √(2·m·g / (ρ·A·Cd))',
    formulaVars: 'm=mass, g=9.81 m/s², ρ=air density (1.225 kg/m³ sea level), A=cross-section area, Cd=drag coefficient',
    keyPoints: [
      { title: 'Terminal velocity is reached in ~5-7 seconds', text: 'Falling from rest, a peregrine reaches 95% terminal in 5.5 seconds. Higher altitude starts = more time at terminal speed = more kinetic energy delivered.' },
      { title: 'Stoop posture: drag coefficient ~0.18', text: 'Wings tucked, head pulled in, body rigid. This is verified by wind-tunnel taxidermy + later by drone-mounted cameras. For comparison: human freefaller in dive position Cd ≈ 0.7; sphere Cd ≈ 0.47; ideal teardrop Cd ≈ 0.04.' },
      { title: 'Mass scaling problem', text: 'A goshawk has 90% of a peregrine\'s mass but only ~60% of its stoop speed. Why? Higher aspect ratio + larger cross-section + steeper "lean" angle in the goshawk. Stoop speed isn\'t just about mass — drag area dominates.' },
      { title: 'The pullout', text: 'Yanking out of a 200 mph dive requires arresting ~25 G in 1-2 seconds. Bird heart + arterial structure handles this; humans black out at 5-6 G. Tom Cade (1969 paper) measured pullout G-loads in trained peregrines.' },
      { title: 'Why falcons aim, then strike', text: 'The bird lines up trajectory in advance — it can\'t maneuver finely at terminal velocity. Computer models (Tucker 1998) show falcons fly a spiral logarithmic approach that keeps prey at a constant viewing angle, identical to how some military missiles approach.' },
      { title: 'Pre-strike vs post-strike', text: 'At impact: clenched feet (talons closed into a club). Within 200 ms after: re-grip with talons + secure carcass. The strike + re-grip cycle is so fast it\'s nearly invisible — high-speed cameras only resolved it in the 1990s.' }
    ]
  };

  // ── Silent Flight (Owls) ──
  var SILENT_FACTS = {
    header: 'Silent Flight: How Owls Move Without Sound',
    overview: 'A barn owl flies past your face and you don\'t hear it. This is biological engineering at the limits of physics — three independent silencing mechanisms working together. Modern wind turbine, drone, and HVAC design teams openly copy owl feather structure to reduce noise (the 2020 Caltech/Bonn studies on owl feathers are cited in dozens of engineering patents). Most other raptors aren\'t silent — peregrines whistle in stoop, eagles thump in slow flight. Owls evolved silence because their prey (mice, voles) have ear sensitivity that makes them notice even faint wing-rustle from above.',
    keyPoints: [
      { title: 'Mechanism 1: Comb-edged leading primaries', text: 'The leading edge of each primary feather has a tiny comb-like serration (~0.5-1 mm tooth width). This breaks up the laminar-to-turbulent flow transition that creates rushing noise on a normal wing. The comb scatters the noise into much higher frequencies that prey ears can\'t hear well.' },
      { title: 'Mechanism 2: Fringed trailing edge', text: 'The trailing edge of owl primaries has a soft fringe (~2-3 mm) that absorbs the trailing-edge turbulent vortex sound. Most aerodynamic noise is generated at the trailing edge — this fringe is the primary noise reducer.' },
      { title: 'Mechanism 3: Velvety dorsal surface', text: 'The upper feather surface has a soft velvet-like microstructure (tiny pile, ~0.5 mm tall). It dampens feather-on-feather friction noise during wing folding/unfolding.' },
      { title: 'Frequency shift', text: 'Owl wing noise: peaks at ~16 kHz (above mouse hearing range). Hawk wing noise: peaks at ~2-4 kHz (right in mouse hearing range). The silencing is achieved by shifting the noise frequency out of prey\'s ear sensitivity, not just lowering amplitude.' },
      { title: 'Cost: slower max speed', text: 'Silent-flight feathers add drag. Owls top out around 40-55 mph; hawks of similar size hit 80+. The silence is a hunt-strategy trade-off — owls don\'t need speed, they need surprise.' },
      { title: 'Modern engineering applications', text: 'NASA + Caltech + Bonn University ran detailed studies (Bachmann + Wagner 2017, 2020) on owl feather microstructure. The findings now appear in: drone propeller designs, wind turbine blade edges, HVAC vent geometry, jet aircraft trailing edge serrations. The owl is the most-imitated bird in modern engineering.' }
    ]
  };

  // ── Senses Tradeoffs ──
  var SENSES_FACTS = {
    header: 'Senses: Day Eye vs Night Eye',
    overview: 'Hawks + eagles + falcons hunt by day. Their retinas are cone-heavy (high acuity, full color). Owls hunt by night. Their retinas are rod-heavy (extreme low-light sensitivity, near-monochromatic vision). The same evolutionary toolkit (the avian eye) has been reshaped in opposite directions for opposite niches. Owls also pair vision with ear asymmetry — the left ear opening sits higher on the skull than the right, so the same sound arrives at the two ears at different vertical angles. The brain reads the timing difference as elevation cue. Combined with horizontal ear timing, the owl gets full 3D acoustic localization — accurate to ~1° in pitch black.',
    keyPoints: [
      { title: 'Cones vs rods', text: 'Cones detect color + need bright light. Rods are monochrome + work in starlight. Diurnal raptors: ~80% cones, 20% rods (reverse of human eye!). Nocturnal raptors (owls): ~5% cones, 95% rods. The retina geometry encodes the hunt time.' },
      { title: 'Tubular eyes (owls)', text: 'Owls evolved tubular (not spherical) eye shape — packs more rod surface area in the same skull volume. Cost: eyes cannot rotate. Owls compensate with 270° head rotation (special neck vertebrae + cervical artery routing prevents stroke during the turn).' },
      { title: 'Ear asymmetry (owls)', text: 'The bony skull openings for the ears are placed asymmetrically — left ear higher than right by ~1 cm in barn owls. Sound timing + amplitude differences let the owl pinpoint elevation as well as azimuth. Verified in famous Roger Payne (1962) sound-only mouse kills in total darkness.' },
      { title: 'Facial disc as parabolic dish', text: 'Owls\' flat facial disc isn\'t cosmetic — stiff feathers funnel sound to the ear openings. Acts as a parabolic reflector + boosts effective ear sensitivity by ~10 dB. This is why barn owls + great-grey owls have such pronounced flat faces.' },
      { title: 'Olfaction (raptors barely use it)', text: 'Raptors have small olfactory bulbs — they hunt by sight, not smell. The one exception: turkey vultures + king vultures have huge olfactory bulbs and can locate carrion by smell from 1+ miles. Their "raptor" classification has been debated for decades.' },
      { title: 'Tactile bill (raptors don\'t really)', text: 'Unlike sandpipers + parrots + woodpeckers, raptors don\'t use their bill for sensing. Their bill is purely a kill + butchering tool (falcon tomial tooth severs cervical vertebrae, eagles tear large prey, owls swallow small prey whole + cast indigestible pellets).' }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // CONSERVATION DATA
  // ───────────────────────────────────────────────────────────
  var CONSERVATION = {
    overview: 'Raptors have one of conservation\'s great comeback stories — and several active crises. DDT-era recovery (peregrine, bald eagle, osprey, brown pelican) took ~40 years and required a near-total US ban on a single pesticide. Yet today: golden + bald eagles are dying from lead-shot poisoning (eating gutpiles + carcasses left by hunters using lead ammunition); wind farms kill ~30,000 raptors/year in the US alone; tropical species (harpy, Philippine, crested eagles) face rainforest loss at a rate that exceeds recovery capacity. The peregrine is back — but the harpy may not have time.',
    crises: [
      {
        title: 'DDT (1947-1972): the chemical that nearly ended raptors',
        text: 'The pesticide DDT bioaccumulated up food chains, concentrating in fish + birds eaten by raptors. Sublethal doses interfered with calcium metabolism, causing eggshell thinning. Eggs cracked under brooding parents. By 1965, peregrine populations had collapsed entirely east of the Rockies. The 1972 US ban + Endangered Species Act listing began recovery. Peregrine delisted 1999; bald eagle delisted 2007. The Peregrine Fund + Cornell\'s captive-breed-and-release program restored the species.',
        status: 'RESOLVED — recovery success'
      },
      {
        title: 'Lead shot poisoning (1980s-present)',
        text: 'Hunters using lead ammunition leave gut piles + lost game. Eagles + condors + vultures scavenge these and ingest lead fragments. Lead is acutely neurotoxic to birds — sublethal exposure causes weakness, blindness, seizures; high exposure kills. California banned lead ammunition in 2019 (for condor recovery). Most other US states still allow it. ~120,000 eagles killed by lead since 1990 (Cornell estimate).',
        status: 'ONGOING — major problem'
      },
      {
        title: 'Wind farm collisions',
        text: 'Eagles + raptors using thermals + slope-soaring intersect wind turbine blades. Tip speeds of 180+ mph + invisible motion blur create lethal hazard. Altamont Pass (CA) killed ~67 golden eagles/year in early 2000s. Modern siting + curtailment + bird-deterrent radar (Identiflight) cuts deaths ~80%. But total US wind kill of raptors estimated 30,000-150,000/year (USGS 2014).',
        status: 'ONGOING — mitigation improving'
      },
      {
        title: 'Tropical deforestation (harpy + crested + Philippine eagle)',
        text: 'Apex tropical raptors need 25-100+ km² of intact primary rainforest to support a single breeding pair. Amazon + Atlantic Forest + Sundaland + Philippine forest loss rates exceed raptor reproduction rates. Harpy eagles produce 1 chick every 2-3 years; the Philippine eagle (similar life history) is critically endangered with <400 wild adults.',
        status: 'ONGOING — critical for several species'
      },
      {
        title: 'Rodenticide secondary poisoning',
        text: 'Anticoagulant rodenticides (warfarin, brodifacoum) used in urban + agricultural pest control bioaccumulate up the food chain to owls + hawks that eat rodents. Necropsies show 75-85% of urban-area great horned owls + red-tailed hawks have detectable rodenticide residue. California banned brodifacoum for residential use 2020.',
        status: 'ONGOING — significant in urban + suburban areas'
      },
      {
        title: 'Power line electrocution',
        text: 'Open-perched poles with closely-spaced energized lines cause ~12,000-25,000 raptor deaths/year in the US alone. Mitigation: pole-top insulators, perch deflectors, designed-safe pole geometry. Avian Power Line Interaction Committee (APLIC) standards adopted by most US utilities. Death rate dropping in retrofitted territories.',
        status: 'IMPROVING — utility-cooperation success'
      },
      {
        title: 'Migration corridor habitat loss',
        text: 'Hawk Mountain (PA) + Cape May (NJ) + Veracruz (Mexico) + Eilat (Israel) + Batumi (Georgia) are migration bottlenecks where tens to hundreds of thousands of raptors funnel through each spring + fall. Conserving these corridors protects entire populations at once. Hawk Migration Association of North America (HMANA) coordinates monitoring.',
        status: 'CRITICAL — but high-leverage conservation'
      }
    ],
    successStories: [
      { name: 'Peregrine Falcon', from: '~50 wild pairs (US, 1970)', to: '~3,200 pairs (US, 2020)', mechanism: 'DDT ban + Cornell captive-breed-release (Peregrine Fund) + urban skyscraper colonization' },
      { name: 'Bald Eagle', from: '417 pairs (lower 48, 1963)', to: '316,000 individuals (2020 USFWS)', mechanism: 'DDT ban + ESA listing + nest protection + waterway cleanup' },
      { name: 'Osprey', from: '~90% Atlantic Coast decline (1950-1972)', to: 'Fully recovered, expanding range', mechanism: 'DDT ban + nest platform program (utility poles, buoys)' },
      { name: 'California Condor', from: '22 individuals (1987, captive only)', to: '500+ wild + captive (2024)', mechanism: 'All-captive program 1987-1992 + reintroduction; ongoing lead-shot crisis limits expansion' }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // FIELD ID DATA — silhouette + flight-pattern identification
  // ───────────────────────────────────────────────────────────
  var FIELD_ID = {
    silhouettes: [
      {
        id: 'falcon', label: 'Falcon (pointed wings)',
        wingShape: 'Long, pointed, swept-back — like a paper airplane',
        tailShape: 'Medium length, narrow, square-tipped',
        flightPattern: 'Rapid steady wingbeats interspersed with short glides; rare to see in thermal',
        species: 'Peregrine, prairie falcon, gyrfalcon, merlin, kestrel',
        gestalt: 'Looks like a swept-wing fighter jet. Pointed wing tips diagnostic.'
      },
      {
        id: 'eagle', label: 'Eagle (long broad wings, slotted tips)',
        wingShape: 'Very long, broad, finger-slotted primaries spread wide',
        tailShape: 'Short, broad, fanned in soaring',
        flightPattern: 'Slow deep wingbeats; long thermal soars; minimal flapping',
        species: 'Bald, golden, harpy, white-tailed',
        gestalt: 'Like a flying plank. Slotted wingtips with daylight visible between primaries.'
      },
      {
        id: 'buteo', label: 'Buteo Hawk (broad wings, fan tail)',
        wingShape: 'Broad, rounded, slightly slotted tips',
        tailShape: 'Wide fan, often pale or reddish',
        flightPattern: 'Soar in tight thermal circles; kite into headwind; occasional flap-glide',
        species: 'Red-tailed, red-shouldered, broad-winged, Swainson\'s, rough-legged, ferruginous',
        gestalt: 'Round + chunky. Looks like a brick with wings.'
      },
      {
        id: 'accipiter', label: 'Accipiter Hawk (short wings, long tail)',
        wingShape: 'Short, broad, rounded',
        tailShape: 'Very long, narrow, banded',
        flightPattern: 'Flap-flap-glide rhythm; never thermals; threads through trees',
        species: 'Sharp-shinned, Cooper\'s, northern goshawk',
        gestalt: 'Like a flying drumstick. Long tail = the giveaway.'
      },
      {
        id: 'harrier', label: 'Harrier (low + tilting flight)',
        wingShape: 'Long, narrow, slightly raised in glide (dihedral)',
        tailShape: 'Long, narrow, banded; conspicuous white rump patch',
        flightPattern: 'Slow + low over fields; tilts side-to-side; quartering pattern',
        species: 'Northern harrier (the only North American harrier)',
        gestalt: 'Like a giant moth quartering a field at hip height. V-shape in glide.'
      },
      {
        id: 'kite', label: 'Kite (graceful gliding)',
        wingShape: 'Long, narrow, pointed (some kinked)',
        tailShape: 'Long, often forked or notched',
        flightPattern: 'Buoyant glide, almost no flapping; aerial insect-catching; agile',
        species: 'Mississippi, white-tailed, swallow-tailed, snail',
        gestalt: 'Like a falcon\'s prettier cousin. Light + fluid in flight.'
      },
      {
        id: 'osprey', label: 'Osprey (distinct M shape)',
        wingShape: 'Long, narrow, kinked at the carpal joint into a flat "M"',
        tailShape: 'Medium, banded',
        flightPattern: 'Patrols water in long flap-glide; hovers briefly; plunges feet-first',
        species: 'Osprey (only living member of family Pandionidae)',
        gestalt: 'M-shaped silhouette when seen from below = unmistakable.'
      },
      {
        id: 'owl', label: 'Owl (round head, mothlike flight)',
        wingShape: 'Broad, rounded, comb-edged primaries',
        tailShape: 'Short, broad, often hidden by feathers',
        flightPattern: 'Slow deep wingbeats; silent; usually at dusk + night; head looks oversized',
        species: 'Great horned, barred, barn, screech, snowy, great gray, long-eared',
        gestalt: 'Like a flying pillow. Head + body merge into a round profile.'
      }
    ],
    behaviorClues: [
      { clue: 'Hovering with active flapping over a field', meaning: 'Almost certainly an American kestrel (or rough-legged hawk in winter)' },
      { clue: 'Tilting side-to-side, very low over wetland', meaning: 'Northern harrier — pattern unmistakable' },
      { clue: 'Slow circular thermal soar', meaning: 'Eagle or buteo (red-tail most common); never an accipiter or falcon' },
      { clue: 'Threading through forest at speed', meaning: 'Accipiter (sharp-shin, Cooper\'s, or goshawk)' },
      { clue: 'Vertical stoop from high altitude', meaning: 'Peregrine — almost no other species stoops vertically' },
      { clue: 'Hovers briefly over water, plunges feet-first', meaning: 'Osprey' },
      { clue: 'Stationary kiting into a wind', meaning: 'Red-tailed hawk or rough-legged hawk' },
      { clue: 'Perched at telephone pole on highway shoulder', meaning: 'Red-tailed hawk (default) or kestrel (smaller); rough-leg in winter at higher latitudes' },
      { clue: 'Eats road-killed deer carcass', meaning: 'Bald eagle (in winter, especially in eagle-rich states like AK, MN, MT)' },
      { clue: 'Heard calling at 3 AM in suburban yard', meaning: 'Great horned owl (most common urban owl)' }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // RESOURCES — primary scientific + citizen-science orgs
  // ───────────────────────────────────────────────────────────
  var RESOURCES = [
    { name: 'Cornell Lab of Ornithology — All About Birds', url: 'https://www.allaboutbirds.org/', desc: 'Free species accounts for every North American bird, with life history, sounds, range maps, and identification. The default starting point for any raptor question.' },
    { name: 'HawkWatch International', url: 'https://hawkwatch.org/', desc: 'Long-term monitoring of raptor populations + migration; volunteer counts at sites across the West.' },
    { name: 'Hawk Mountain Sanctuary', url: 'https://www.hawkmountain.org/', desc: 'The original (1934) raptor sanctuary in Pennsylvania. Operates the largest dataset of migrating raptor counts in the world. Free public visit + raptor ID training.' },
    { name: 'The Peregrine Fund', url: 'https://www.peregrinefund.org/', desc: 'Conservation org credited with the peregrine recovery via captive-breed-release. Now works on California condor, harpy eagle, and other endangered raptors.' },
    { name: 'Hawk Migration Association of North America (HMANA)', url: 'https://www.hmana.org/', desc: 'Coordinates standardized migration counts across hundreds of watch sites + maintains the HawkCount database.' },
    { name: 'Raptor Resource Project', url: 'https://www.raptorresource.org/', desc: 'Live nest cams for bald eagles, peregrines, and great horned owls. Decorah, Iowa eagles are the most-watched nest cam in the world.' },
    { name: 'Owl Research Institute', url: 'https://www.owlresearchinstitute.org/', desc: 'Montana-based; long-term monitoring of snowy, great-grey, boreal, and short-eared owls. Source of the snowy owl winter ecology data.' },
    { name: 'International Owl Center', url: 'https://www.internationalowlcenter.org/', desc: 'Houston, Minnesota — education + ambassador birds for 14+ species including endangered Eurasian eagle owls.' },
    { name: 'iNaturalist', url: 'https://www.inaturalist.org/', desc: 'Citizen-science observation network — log a raptor sighting, get expert ID confirmation, contribute data to research.' },
    { name: 'eBird', url: 'https://ebird.org/', desc: 'Cornell\'s global bird checklist + sighting database. Filter for raptor species to see hotspots near you.' },
    { name: 'Project FeederWatch', url: 'https://feederwatch.org/', desc: 'Counts birds at backyard feeders. Cooper\'s hawks + sharp-shinned hawks visit feeders for songbird prey — a chance to see active hunting in a yard.' },
    { name: 'Audubon Raptor Watch', url: 'https://www.audubon.org/bird-guide', desc: 'Bird guide + alerts + advocacy via Audubon chapters. Many chapters run local raptor monitoring.' }
  ];

  // ───────────────────────────────────────────────────────────
  // MIGRATION — flyways, watch sites, banding, irruptions
  // ───────────────────────────────────────────────────────────
  var MIGRATION = {
    overview: 'Every fall, ~5 million raptors funnel through the Western Hemisphere\'s migration corridors. Sites like Hawk Mountain (PA), Cape May (NJ), Veracruz (Mexico), Eilat (Israel), and Batumi (Georgia) sit at geographic bottlenecks where soaring raptors converge — and where standardized counts have built the longest continuous wildlife datasets in conservation history. A broad-winged hawk hatched in Maine in July may winter in Bolivia, fly through the Veracruz River of Raptors in late September with 4 million companions, and never flap its wings for hundreds of miles — riding thermals + ridge lift from cold front to cold front.',

    flyways: [
      {
        id: 'atlantic', name: 'Atlantic Flyway', emoji: '🌊',
        species: 'Sharp-shinned + Cooper\'s + American kestrel + merlin + broadwing + osprey + bald eagle',
        path: 'Northern New England → Appalachian ridges → coastal Atlantic → Caribbean basin → S. America for some',
        peakDates: 'Mid-Sept (broadwings) · Oct (Coops + sharps) · Nov (bald eagles + golden)',
        bottleneck: 'Cape May, NJ (Atlantic coastal funnel) · Hawk Mountain, PA (Kittatinny Ridge)',
        notes: 'Atlantic ridges create updrafts; coastal funneling adds NW-wind concentration. Cape May counts ~40K raptors per fall.'
      },
      {
        id: 'mississippi', name: 'Mississippi Flyway', emoji: '🏞️',
        species: 'Bald eagle (wintering on Mississippi) + broadwing + red-tailed + sharp-shin',
        path: 'Boreal Canada → Mississippi River corridor → Texas Gulf coast → Mexico',
        peakDates: 'Late Sept (broadwings kettling) · Oct-Nov (buteos + eagles)',
        bottleneck: 'Whitefish Point, MI · Duluth, MN (Hawk Ridge) · Smith Point, TX (Gulf Coast funnel)',
        notes: 'Hawk Ridge in Duluth counts 60K-90K raptors annually. The cold-front + NW-wind days produce the spectacular kettles.'
      },
      {
        id: 'central', name: 'Central Flyway', emoji: '🌾',
        species: 'Swainson\'s hawk + ferruginous hawk + Mississippi kite + golden eagle',
        path: 'Canadian prairie → Great Plains → Mexico → Argentina (Swainson\'s)',
        peakDates: 'Sept-early Oct (Swainson\'s) · Oct-Nov (ferruginous + golden)',
        bottleneck: 'Veracruz, Mexico (where Atlantic + Central + Mississippi flyways converge)',
        notes: 'Swainson\'s hawks fly the longest raptor migration in the Americas — 14,000+ miles round-trip. Most stop briefly in S. Texas + the Yucatan to feed on grasshoppers.'
      },
      {
        id: 'pacific', name: 'Pacific Flyway', emoji: '🌲',
        species: 'Sharp-shin + Cooper\'s + osprey + bald + golden eagle + rough-legged (winter)',
        path: 'Alaska + boreal Canada → Pacific Northwest ridges → California → Baja Mexico',
        peakDates: 'Sept-Oct',
        bottleneck: 'Goshute Mountains (NV) · Bonney Butte (OR) · Cape Mendocino (CA) · Marin Headlands (Golden Gate Raptor Observatory)',
        notes: 'GGRO at Marin Headlands counts ~30K raptors/year. Golden Gate funneling concentrates birds that don\'t cross open Pacific.'
      },
      {
        id: 'eurasian', name: 'European-African Flyway', emoji: '🌍',
        species: 'Honey buzzard + Eurasian sparrowhawk + booted eagle + lesser spotted eagle + Eleonora\'s falcon',
        path: 'European breeding grounds → Gibraltar/Bosphorus/Sinai bottlenecks → African wintering',
        peakDates: 'Sept (honey buzzards) · Oct-Nov (eagles + buteos)',
        bottleneck: 'Strait of Gibraltar · Bosphorus, Turkey · Eilat, Israel · Batumi, Georgia · Bab-el-Mandeb (Yemen)',
        notes: 'Israeli-Palestinian Raptor Watch Eilat counts 1+ million raptors per spring. Batumi (Georgia) is currently the world\'s largest single-site count (~1 million/fall) — and a hotspot for illegal shooting that conservation groups actively combat.'
      }
    ],

    watchSites: [
      {
        name: 'Hawk Mountain Sanctuary, Pennsylvania',
        founded: 1934,
        founder: 'Rosalie Edge — conservationist who bought the land to stop the shooters who were killing thousands of migrating raptors per year for sport',
        annualCount: '~17,000 raptors (12 species commonly seen)',
        highlight: 'The world\'s longest-running raptor migration count (90+ years). The data anchored the post-DDT recovery story. North Lookout is open to the public Sept-Nov.',
        latLon: '40.6°N, 75.9°W'
      },
      {
        name: 'Cape May Hawkwatch, New Jersey',
        founded: 1976,
        founder: 'Pat Sutton + others (Cape May Bird Observatory)',
        annualCount: '~40,000 raptors',
        highlight: 'NW wind days in October concentrate sharp-shinned hawks + American kestrels. Coastal funnel effect — birds reluctant to cross Delaware Bay accumulate along the Cape May peninsula.',
        latLon: '38.9°N, 74.9°W'
      },
      {
        name: 'Veracruz River of Raptors, Mexico',
        founded: 1991,
        founder: 'Pronatura Veracruz (Mexican conservation org)',
        annualCount: '~5 million raptors per fall — the world\'s largest single migration count',
        highlight: 'Where the Atlantic, Mississippi, and Central flyways converge before crossing into Central America. On peak days in mid-Sept, observers count 1+ million broad-winged hawks in a single 12-hour shift.',
        latLon: '19.2°N, 96.1°W'
      },
      {
        name: 'Eilat Spring Migration, Israel',
        founded: '1980s',
        founder: 'International Birding Centre Eilat',
        annualCount: '~1 million raptors per spring (Mar-May)',
        highlight: 'Sinai-Negev land bridge between Africa + Eurasia. Critical refueling stop. Reverse-direction kettles compared to fall sites.',
        latLon: '29.6°N, 34.9°E'
      },
      {
        name: 'Batumi Raptor Count, Georgia',
        founded: 2008,
        founder: 'Wouter Vansteelant + Dutch + Georgian volunteers',
        annualCount: '~1 million raptors per fall',
        highlight: 'Caucasus Mountains funnel birds between Russia/Siberian breeding + African wintering. Currently the world\'s largest fall count site outside Veracruz. Active anti-shooting conservation work — illegal raptor shooting is a serious local problem this watch helps document + reduce.',
        latLon: '41.7°N, 41.6°E'
      },
      {
        name: 'Golden Gate Raptor Observatory, California',
        founded: 1985,
        founder: 'National Park Service + Marin Audubon',
        annualCount: '~30,000 raptors',
        highlight: 'Pacific coast bottleneck. SF Bay\'s mouth concentrates birds reluctant to cross open ocean. Trains 100+ citizen scientists every fall.',
        latLon: '37.8°N, 122.5°W'
      }
    ],

    kettlePhysics: {
      title: 'How a thermal kettle works',
      explanation: 'A "kettle" is a tornado of migrating hawks. Here\'s the physics: sun heats dark ground (plowed field, bare rock) faster than light surrounding terrain. Hot air rises in a column — a thermal. Soaring raptors find the thermal, circle inside it, gain altitude effortlessly (their wings cup the rising air like a parachute upside-down). When they reach the top of the lift (often the cloud base, ~3,000-7,000 ft), they peel off and glide downward in the direction of travel until they find the next thermal. Result: hundreds or thousands of meters gained for free, miles covered for the cost of one circle. A broad-winged hawk may travel 250 miles in a day this way — barely flapping. That\'s why migration counts spike on sunny days after a cold front — the cold air provides a sharp thermal contrast, the high pressure brings clear skies for solar heating, and the NW wind blows birds toward the geographic bottleneck.',
      diagram: [
        '☀ → ground heats → thermal column rises',
        '↻ raptor circles inside thermal → gains altitude',
        '↗ at the top, raptor peels off + glides downward',
        '… repeat with next thermal'
      ]
    },

    irruptions: {
      title: 'Irruption years — when northern raptors come south',
      explanation: 'In some winters, northern owls + buteos arrive far south of their typical range — sometimes by thousands of miles. This is called an "irruption." It is NOT a permanent range shift; it\'s a one-winter food crisis. Driver: a boom-bust cycle in northern prey populations (snowshoe hares, voles, lemmings). After a peak year, prey populations crash. Birds that depended on them must move south to find food.',
      species: [
        { name: 'Snowy Owl', cycle: 'Roughly every 3-5 years; tied to lemming peak years in the Arctic', range: 'In big years, snowy owls reach Texas, Florida, even Bermuda. Famous 2013-14 irruption saw birds on every East Coast beach.' },
        { name: 'Rough-legged Hawk', cycle: 'Annual winter southward migration, but irruption years bring more birds further south', range: 'In peak years, common across the central + southern US plains; otherwise mostly Canada + N. plains.' },
        { name: 'Great Gray Owl', cycle: '~3-4 year cycle; tied to vole populations in boreal forest', range: '2004-05 had a famous irruption — hundreds in Minnesota + Wisconsin.' },
        { name: 'Northern Hawk Owl', cycle: 'Irruptive based on rodent peaks', range: 'Almost never seen below S. Canada in normal years; in peak years reaches Iowa + Pennsylvania.' },
        { name: 'Boreal Owl', cycle: 'Irrutive', range: 'Hard to see even in big years — silent + nocturnal.' }
      ]
    },

    banding: {
      title: 'Banding + tracking science',
      explanation: 'Raptor migration research relies on three generations of tracking technology:',
      methods: [
        { tech: 'Leg bands', since: '1920s', what: 'Aluminum + colored plastic numbered bands. Bird is captured, weighed, measured, banded, released. Re-encounter (recovery) gives location + age + lifespan data. ~3% recovery rate but huge sample size over decades.' },
        { tech: 'Geolocators (light-level)', since: '2000s', what: 'Tiny logger records ambient light every 5 minutes. After 1 year of attached time, bird is recaptured + data downloaded. Lat/lon derived from sunrise/sunset times. Inexpensive but requires recapture to read.' },
        { tech: 'GPS tags', since: '2010s', what: 'Solar-charged GPS units that text location data via cell or satellite networks. Bird never needs to be recaptured. Have revealed previously-unknown stopover sites + exact wintering grounds. Used on golden eagles, condors, snowy owls.' },
        { tech: 'Satellite (PTT) tags', since: '1990s', what: 'Argos system relay tags — track even from polar/oceanic locations. Used for bald eagles, ospreys, snowy owls in the Arctic.' },
        { tech: 'Stable isotope analysis', since: '2000s', what: 'Feather chemistry encodes diet + location signature from where the feather grew. Used to reconstruct year-round migration routes without electronic tracking.' }
      ]
    },

    climateImpact: {
      title: 'Climate change is shifting migration',
      points: [
        'Many migrant raptors are arriving earlier each spring + leaving later each fall — shifts of 1-3 days per decade documented in long-running datasets',
        'Northward range expansion in species like turkey vultures + black vultures — now wintering in places they never did before (TVs now common in New England in winter)',
        'Mismatch risk: songbird prey arrival times are also shifting; if raptors and prey shift at different rates, hunting success declines',
        'Hawk Mountain + Cape May data is now central to climate-shift research because the 60-90 year time series is long enough to detect signal',
        'Some shifts are positive: bald eagles wintering further north reduces the lead-shot exposure from southern hunting season carcasses'
      ]
    }
  };

  // ───────────────────────────────────────────────────────────
  // FIELD ID QUIZ — gamified retrieval practice
  // ───────────────────────────────────────────────────────────
  // 18 questions across 3 difficulty bands.
  // Fields: id, q, options (array of 4), correctIdx, explanation, difficulty
  var QUIZ_QUESTIONS = [
    // EASY (silhouette + obvious)
    { id: 'q1', difficulty: 'easy', q: 'You see a bird with very long pointed wings, swept back like a paper airplane, gliding fast on rapid wingbeats. What family is it?',
      options: ['Falcon', 'Eagle', 'Buteo Hawk', 'Owl'], correctIdx: 0,
      explanation: 'Pointed swept wings + rapid wingbeats = falcon. Eagles + buteos have broad rounded wings, not pointed.' },
    { id: 'q2', difficulty: 'easy', q: 'A massive bird is soaring in slow circles, wingtips spread with daylight visible between the primaries (the "fingers"). Most likely:',
      options: ['Peregrine falcon', 'Cooper\'s hawk', 'Eagle (bald or golden)', 'Barn owl'], correctIdx: 2,
      explanation: 'Slotted "fingered" wingtips during slow soaring = eagle. The slots reduce induced drag for efficient thermal soaring.' },
    { id: 'q3', difficulty: 'easy', q: 'Which raptor sees ULTRAVIOLET light?',
      options: ['Red-tailed hawk', 'American kestrel', 'Bald eagle', 'Great horned owl'], correctIdx: 1,
      explanation: 'Kestrels (Falconidae) can see UV light. Vole urine + dung trails reflect UV strongly, so the kestrel sees "highways" of rodent travel routes glowing across the meadow. Viitala et al 1995 Nature.' },
    { id: 'q4', difficulty: 'easy', q: 'You see a hawk hovering with active wingbeats over a roadside field. The most likely species is:',
      options: ['Red-tailed hawk', 'American kestrel', 'Bald eagle', 'Cooper\'s hawk'], correctIdx: 1,
      explanation: 'Active hovering over open ground = American kestrel (or, in winter, rough-legged hawk). Red-tails kite but don\'t actively hover; eagles don\'t hover; Cooper\'s hawks don\'t hover.' },
    { id: 'q5', difficulty: 'easy', q: 'Which sense is MOST important to a great horned owl hunting at midnight?',
      options: ['Vision', 'Hearing', 'Smell', 'Touch'], correctIdx: 1,
      explanation: 'Owl ear asymmetry + facial-disc sound funneling enable 3D acoustic localization accurate to ~1° in total darkness (Payne 1962). Vision is supplementary at full dark; smell is barely used; touch via beak is for prey processing, not detection.' },

    // MEDIUM (combinations + science)
    { id: 'q6', difficulty: 'medium', q: 'A peregrine falcon\'s stoop reaches ~242 mph. What single anatomical adaptation lets the bird keep its eyes open during the dive?',
      options: ['Tinted iris', 'Telescoping eye lens', 'Nictitating membrane (third eyelid)', 'Cornea hardening'], correctIdx: 2,
      explanation: 'A clear nictitating membrane (third eyelid) slides over the eye during high-speed dive, protecting against debris + drying airflow while still letting light through. All birds have one; peregrines depend on it.' },
    { id: 'q7', difficulty: 'medium', q: 'Owls fly silently because their feathers have THREE silencing mechanisms. Which is NOT one of them?',
      options: ['Comb-edged leading primaries', 'Fringed trailing edge', 'Velvety dorsal surface', 'Hollow feather shafts'], correctIdx: 3,
      explanation: 'Hollow feather shafts are universal in birds and have nothing to do with silence. The three actual silencing mechanisms are (1) comb leading edge, (2) fringe trailing edge, (3) velvet dorsal surface.' },
    { id: 'q8', difficulty: 'medium', q: 'Which raptor has the HIGHEST documented talon grip force in psi?',
      options: ['Bald eagle (400 psi)', 'Harpy eagle (530 psi)', 'Golden eagle (750 psi)', 'Great horned owl (500 psi)'], correctIdx: 2,
      explanation: 'Golden eagle ~750 psi — the highest documented grip strength for any raptor. They\'re trained by Mongolian Berkutchi hunters to take wolves from horseback, a tradition dating to Genghis Khan.' },
    { id: 'q9', difficulty: 'medium', q: 'A bird perched at a forest edge, with short broad wings and a very long banded tail, "flap-flap-glides" through the trees after a songbird. What family?',
      options: ['Falcon', 'Buteo Hawk', 'Accipiter Hawk', 'Eagle'], correctIdx: 2,
      explanation: 'Short wings + very long tail + forest-interior chase = accipiter (Cooper\'s, sharp-shinned, or northern goshawk). Falcons hunt in open air; buteos perch-and-pounce; eagles soar.' },
    { id: 'q10', difficulty: 'medium', q: 'Why does an osprey have a REVERSIBLE outer toe + barbed scales on its footpads?',
      options: ['To climb tree bark', 'To grip slippery wet fish', 'To dig burrows', 'To protect against snakebite'], correctIdx: 1,
      explanation: 'Ospreys are fish specialists (99% of diet). The reversible outer toe gives them a 2-and-2 zygodactyl grip, and barbed scales (spicules) on the footpad lock onto wet scales. No other raptor has these adaptations.' },
    { id: 'q11', difficulty: 'medium', q: 'A thermal kettle of soaring raptors is most likely formed when the weather conditions are:',
      options: ['Heavy rain + low pressure', 'Sunny + dry, just after a cold front', 'Foggy + still', 'Snowy + cold'], correctIdx: 1,
      explanation: 'Cold front + sunny + NW wind = ideal kettle weather. Cold air below + sun heating dark ground creates strong thermal lift; clear skies allow heating; high pressure brings stable lift columns. Hawk Mountain + Veracruz peak counts happen on these days.' },
    { id: 'q12', difficulty: 'medium', q: 'Compared to a hawk, an OWL retina has:',
      options: ['More cones, fewer rods', 'More rods, fewer cones', 'Equal proportions', 'No rods or cones (uses different sensor)'], correctIdx: 1,
      explanation: 'Owls have ~95% rods, 5% cones (reverse of diurnal raptors). Rods detect low light but not color; cones detect color but need bright light. This is the day-eye / night-eye tradeoff.' },

    // HARD (deep science + nuance)
    { id: 'q13', difficulty: 'hard', q: 'The DDT-era population crash of peregrine + bald eagle + osprey was caused by what specific mechanism?',
      options: ['DDT poisoned the birds directly', 'DDT killed all their prey', 'DDT caused eggshell thinning via calcium metabolism interference', 'DDT made the birds infertile'], correctIdx: 2,
      explanation: 'DDT (and its breakdown product DDE) interfered with calcium metabolism, making eggshells thin enough to crack under brooding parents. Adults survived but failed to reproduce. The 1972 US DDT ban started the recovery.' },
    { id: 'q14', difficulty: 'hard', q: 'A peregrine\'s stoop has a drag coefficient (Cd) of about:',
      options: ['0.04 (teardrop)', '0.18 (tucked falcon)', '0.47 (sphere)', '0.7 (human freefaller)'], correctIdx: 1,
      explanation: 'Peregrine stoop Cd ≈ 0.18, measured by wind-tunnel taxidermy + later confirmed by drone-cameras. Better than a sphere (0.47) or human freefaller (0.7), but not as good as an ideal teardrop (0.04). This is what enables ~242 mph terminal.' },
    { id: 'q15', difficulty: 'hard', q: 'A raptor with HIGH wing loading (kg/m²) and HIGH aspect ratio (wingspan² / wing area) will be best at:',
      options: ['Slow soaring + thermal kettling', 'Fast level flight + high-speed diving', 'Forest-interior chase agility', 'Silent hovering'], correctIdx: 1,
      explanation: 'High wing loading = fast/heavy = high stall speed = bad at slow flight. High aspect ratio = thin long wings = efficient glide. Together: a fast cruiser + diver. This is the falcon profile (peregrine: 8.8 kg/m², AR 10.2).' },
    { id: 'q16', difficulty: 'hard', q: 'Veracruz, Mexico is the world\'s largest single raptor migration count site because:',
      options: ['It\'s the southernmost wintering ground', 'Atlantic + Mississippi + Central flyways all converge there', 'Mexican government pays the watchers', 'It has the most thermal kettles'], correctIdx: 1,
      explanation: 'Three of the four North American flyways converge at Veracruz before crossing into Central America. Peak days in mid-September count 1+ million broad-winged hawks in a single 12-hour shift — the largest single-day count anywhere on Earth.' },
    { id: 'q17', difficulty: 'hard', q: 'A snowy owl is reported in southern Texas in winter. The most likely cause is:',
      options: ['Climate change permanent range shift', 'Escaped pet bird', 'Irruption year — lemming/vole crash in Arctic', 'Released by a conservation group'], correctIdx: 2,
      explanation: 'Snowy owl irruptions are tied to Arctic lemming + vole population crashes after peak years. Birds that depended on those prey populations move far south to find food. NOT a permanent range shift — irruption birds don\'t breed in the south + return north next spring.' },
    { id: 'q18', difficulty: 'hard', q: 'Why do peregrines fly a LOGARITHMIC SPIRAL approach to their prey during a stoop rather than a straight line?',
      options: ['The spiral is faster', 'It keeps the prey at a constant viewing angle (head doesn\'t need to turn at terminal velocity)', 'It conserves energy', 'To confuse the prey'], correctIdx: 1,
      explanation: 'Tucker 1998 computer model showed peregrines fly a logarithmic spiral that keeps the prey image at a fixed retinal angle. This way the falcon doesn\'t need to turn its head at terminal velocity (which would create drag + impair aerodynamic streamlining). Identical to the proportional-navigation algorithm used by air-to-air missiles.' }
  ];

  // ───────────────────────────────────────────────────────────
  // PELLET LAB DATA — what's inside an owl pellet + ID key
  // ───────────────────────────────────────────────────────────
  // Owl pellets are the regurgitated indigestible fur+bones+teeth of prey.
  // They're a free ecology dataset — a single barn-owl roost can yield
  // hundreds per year, each = one complete meal's worth of skeletal remains.
  var PELLET_DATA = {
    overview: 'An owl pellet is a compressed cylinder of indigestible prey parts (fur, bone, teeth, claws, feathers, insect exoskeletons) regurgitated 6-10 hours after a meal. Owls swallow prey whole. Stomach acid digests soft tissue; the rest packs into the gizzard and is coughed back up at the next roost. Each pellet = one meal = one (or more) prey animals. They are a free, non-destructive, repeatable dataset. A single roost site with 50 pellets gives you a complete inventory of the local small-mammal population — without ever trapping a mouse.',
    composition: [
      { component: 'Fur (mammal)', pct: '40-60%', detail: 'Forms the matrix that binds the pellet. Color + texture indicates rodent species.' },
      { component: 'Bone fragments', pct: '20-30%', detail: 'Long bones (femur, tibia), scapula, ribs, vertebrae. Cranium often intact + the gold-standard ID feature.' },
      { component: 'Skull (cranium)', pct: '~5%', detail: 'Usually one per prey animal. Teeth pattern (incisor + molar shape) = species ID.' },
      { component: 'Teeth (loose)', pct: '~5%', detail: 'Often fall out of the skull during pellet formation. Rodent incisors are distinctively orange.' },
      { component: 'Feathers + bird bones', pct: '5-15%', detail: 'When the owl ate a bird. Bones are hollow + lighter than mammal bones.' },
      { component: 'Insect exoskeletons', pct: '0-10%', detail: 'Beetles especially. Some screech owls eat 50%+ insects.' }
    ],
    commonPrey: [
      { name: 'Meadow Vole', cranium: 'Small (~18 mm), narrow snout, distinctive cusped molars', signature: 'M-shaped molar cusps; orange incisors; #1 most common prey of barn + great-horned owls', conservation: 'Abundant, key prey species' },
      { name: 'Deer Mouse / White-footed Mouse', cranium: 'Tiny (~15 mm), pointed snout', signature: 'Long incisors; larger eyes than voles; thinner skull', conservation: 'Abundant' },
      { name: 'Shrew (Short-tailed)', cranium: 'Very small (~14 mm), long pointed snout, RED-TIPPED teeth', signature: 'Red-tipped teeth are diagnostic — pigmented by iron-rich enamel. The only mammal in NE with red teeth.', conservation: 'Common but rarely seen; venomous saliva!' },
      { name: 'Bog Lemming', cranium: 'Vole-like but molars are flat-topped', signature: 'Distinct flat-grinding-surface molars; chunky body', conservation: 'Restricted to wet meadows' },
      { name: 'House Sparrow', cranium: 'Bird skull with conical seed-eating beak', signature: 'Hollow bones; beak shape; smaller than passerine kestrel prey', conservation: 'Invasive in North America' },
      { name: 'European Starling', cranium: 'Long pointed bird skull', signature: 'Common urban barn-owl prey; black feather barbs visible in pellet', conservation: 'Invasive in North America' },
      { name: 'Bat', cranium: 'Tiny bird-like wing bones + large eye orbits', signature: 'Wing finger bones distinctive; usually one per pellet', conservation: 'Some species declining (white-nose syndrome)' },
      { name: 'Beetle (large)', cranium: 'Just exoskeleton fragments', signature: 'Elytra (wing covers) sometimes intact; carabid + scarab fragments most common', conservation: 'Common; signal that owl is supplementing with insects' }
    ],
    method: {
      title: 'How to dissect a pellet (classroom-safe)',
      safetyNote: 'Buy STERILIZED pellets from a biological supply company (Pellet.com, Carolina Biological). Field-collected pellets can carry Salmonella; sterilized are heat-treated to safety.',
      steps: [
        '1. Set up: tweezers, dissecting probe (or toothpick), magnifier, white paper, identification key, paper towels.',
        '2. Weigh + measure the pellet (length × width) — record before disassembly.',
        '3. Soak in warm water 10-15 min if pellet is dry + compacted (optional but easier).',
        '4. Gently tease apart with tweezers, working from one end. Separate fur from bone.',
        '5. Lay bones on white paper. Sort by type: skull, jaw, vertebrae, limb bones, ribs.',
        '6. Identify the skull(s) first — count tells you how many prey animals were in this meal.',
        '7. Use a dichotomous key (online: KidWings.com has free interactive keys) to ID species.',
        '8. Record: species + count + estimated total prey biomass.',
        '9. Compare across pellets in your class to see prey-selection patterns.'
      ]
    },
    pedagogy: 'Owl pellet dissection is one of the most-used "real science" classroom activities in K-12. It hits every NGSS-aligned ecology standard: predator-prey relationships, food webs, biodiversity inventories, evolutionary morphology (why are owl skulls flat? why do rodent incisors stay orange?). Cost: ~$3 per pellet from a supplier. One pellet per student or pair. Lasts the period.'
  };

  // ───────────────────────────────────────────────────────────
  // FALCONRY + HUMAN STORIES DATA — 4000 years of cross-cultural relationship
  // ───────────────────────────────────────────────────────────
  var FALCONRY_DATA = {
    overview: 'For at least 4,000 years humans have hunted alongside trained raptors. The practice — falconry — was independently invented at least 3 times (Mongolian steppe ~2000 BCE, Persia / Arabia ~700 BCE, medieval Europe via Frederick II ~1240 CE) and is now recognized by UNESCO as Intangible Cultural Heritage (2010, expanded to 24 nations). It is also the most heavily regulated wildlife use in the United States: falconers train for 7+ years, pass an 80-question exam, build USDA-inspected facilities, and submit annual reports. The arc of falconry tracks the broader human relationship with wild predators — once routine, then near-extinct, now slowly recovering as conservation + ethics + science have transformed how we think about training a wild bird.',

    eras: [
      {
        era: 'Bronze Age Origins (~2000 BCE)',
        region: 'Mongolian + Central Asian steppe',
        practice: 'Berkutchi — golden-eagle hunters on horseback. Eagles trained to take wolves, foxes, hares. Boys begin training at age 13 with a chick imprinted to the family; the eagle hunts with that family for ~7 years then is released back to wild to breed.',
        sources: 'Surviving in Kazakhstan + western Mongolia; ~250 active practitioners remain in 2024'
      },
      {
        era: 'Persian + Arabian Empires (700 BCE - 600 CE)',
        region: 'Persia, Arabian peninsula, Mesopotamia',
        practice: 'Royal sport. Sheikhs trained peregrines + sakers + houbara bustards. Falconry became a marker of nobility — wearing a hood in royal portraiture indicated rank. Specialized vocabulary (jess, hood, lure, bate) entered Arabic + later spread to European falconry through Crusader contact.',
        sources: 'Documented in surviving manuscripts from Sassanid Persia + early Islamic caliphates'
      },
      {
        era: 'Medieval Europe (1200-1500 CE)',
        region: 'Holy Roman Empire, England, France, Italy',
        practice: 'Treated as the noble sport. Frederick II of Sicily wrote De Arte Venandi cum Avibus (~1240) — 6-book treatise that combined falconry technique with the first rigorous scientific descriptions of bird anatomy + behavior. Strict feudal hierarchy assigned species: eagles → emperors; gyrfalcons → kings; peregrines → earls; lanners → ladies; sparrowhawks → priests; kestrels → knaves.',
        sources: 'De Arte Venandi cum Avibus (Frederick II); Boke of Saint Albans (1486)'
      },
      {
        era: 'Decline + Industrial Era (1700-1900)',
        region: 'Europe, North America',
        practice: 'Firearms made falconry obsolete for food procurement. Practice dwindled to enthusiast clubs. Simultaneously, raptors were heavily persecuted as "vermin" — Hawk Mountain, PA was a shooting site until Rosalie Edge bought it in 1934.',
        sources: 'Robert Burns 1880s ornithology surveys; Hawk Mountain Sanctuary history'
      },
      {
        era: 'Conservation Era (1970-present)',
        region: 'Worldwide',
        practice: 'Falconry techniques became central to peregrine + California condor recovery. Captive-bred chicks were "hacked" (soft-released using falconer methods) into wild sites. Without 4,000 years of accumulated knowledge of raising + releasing raptors, the peregrine + condor + Mauritius kestrel recoveries would not have succeeded. Modern falconry is heavily regulated + serves as a feeder community for wildlife biology + rehab.',
        sources: 'The Peregrine Fund founded by falconers; California Condor Recovery Program; UNESCO 2010 listing'
      }
    ],

    ambassadorBirds: {
      title: 'Ambassador birds — non-releasable raptors as educators',
      explanation: 'Raptors that are permanently injured (wing damage, vision loss, imprinted as chicks before release) cannot survive in the wild but live healthy lives in human care. Licensed wildlife educators use these "ambassador birds" for school programs, public lectures, and field-station outreach. A great horned owl named Alice at the Owl Research Institute has visited 50,000+ students in 30 years. Most rehab facilities maintain 5-15 ambassador birds across 8-12 species; their care is funded by public programs.',
      examples: [
        { name: 'Alice', species: 'Great Horned Owl', org: 'Owl Research Institute (Montana)', backstory: '30+ years old; came as a chick imprinted to humans; cannot be released; taught 50,000+ students about owl biology' },
        { name: 'Tara', species: 'Bald Eagle', org: 'World Bird Sanctuary (Missouri)', backstory: 'Wing injury from power line; flies tethered for shows; one of dozens of ambassador eagles in US licensed centers' },
        { name: 'Lucia', species: 'Andean Condor', org: 'Buin Zoo (Chile)', backstory: 'Hand-raised; ambassador for South American raptor conservation' },
        { name: 'Magic', species: 'Peregrine Falcon', org: 'Cornell Lab (NY)', backstory: 'Captive-bred for falconry, retired to education; demonstrates stoop dives for student groups' }
      ]
    },

    ethics: {
      title: 'Modern falconry ethics + regulation',
      points: [
        { topic: 'Welfare standards', detail: 'Licensed US falconers must build a federally-inspected mews (housing) with specific dimensions, perch types, lighting, weighing setup, weather-tight construction. Annual welfare inspection required.' },
        { topic: 'Wild-take limits', detail: 'In US, an apprentice can take ONE wild raptor (kestrel or red-tail) per year, typically a juvenile. After 2-year apprenticeship, the bird is released back to wild OR retained. Many falconers release every bird every 2-3 years to avoid permanent captivity.' },
        { topic: 'Hunt impact', detail: 'A trained falcon takes ~1-2% of the prey base of a wild peregrine. No documented falconry-caused species decline. Falconers were instrumental in DDT recovery — they noticed declining wild numbers years before scientists.' },
        { topic: 'Imprinting concerns', detail: 'Chicks taken before "hard penning" (fledging) imprint on humans and become non-releasable. Modern best practice: take post-fledged "passage" birds that already have hunting skills + survival prep; release them after a hunting season or two.' },
        { topic: 'Equity + access', detail: 'Falconry historically required land + wealth. Modern community programs (e.g., Wingmasters in Massachusetts) bring ambassador birds + falconry demos to underserved schools, addressing the "wealthy white men\'s sport" stereotype.' }
      ]
    },

    equipment: [
      { item: 'Jesses', desc: 'Soft leather straps anchored at the bird\'s ankles; let the falconer hold the bird without restricting natural movement.' },
      { item: 'Hood', desc: 'Soft leather cap covering eyes; calms the bird during transport. Removed at the moment of release.' },
      { item: 'Lure', desc: 'Decoy on a long string (duck-feather or rabbit-fur). Bird is trained to dive at it for reward. Used for daily exercise + recall practice.' },
      { item: 'Glove (gauntlet)', desc: 'Heavy leather extending to elbow; protects the falconer\'s arm from talons during perching.' },
      { item: 'Bell', desc: 'Small bell attached to leg; helps locate bird when out of sight in vegetation.' },
      { item: 'GPS / VHF telemetry', desc: 'Modern: GPS transmitter clipped to bird\'s back. Older: VHF beacon on leg. Essential for free-flight hunting in forest or fog.' },
      { item: 'Perch (block / bow)', desc: 'Padded perch where the bird rests in the mews; design varies by species (raptors with delicate feet get wider, softer perches).' },
      { item: 'Scales', desc: 'Falconer weighs bird daily; controlled hunger drives hunting motivation. Healthy weight ± 5%.' }
    ],

    rehab: {
      title: 'Wildlife rehabilitation — the modern raptor-human relationship',
      stats: '~150,000 raptors enter US wildlife rehab facilities per year; ~50% release rate after treatment; primary causes: vehicle strikes (35%), window strikes (15%), rodenticide poisoning (10%), gunshot (8%), power-line electrocution (7%), other.',
      whatToDo: [
        'Found an injured raptor? Do NOT pick it up directly. Call your state wildlife agency or licensed rehab facility.',
        'Cover with a towel/box if it must be confined briefly; do not feed; minimize stress.',
        'Hawk Mountain Sanctuary maintains a US-wide rehab facility directory.',
        'Many rehab facilities accept volunteers for cleaning, feeding, and ambassador-bird care.'
      ],
      famousFacilities: [
        'Cornell Wildlife Health Center (NY)',
        'Lindsay Wildlife Experience (CA)',
        'Wild Bird Fund (NYC)',
        'World Bird Sanctuary (MO)',
        'Avian Reconditioning Center (FL)',
        'The Wildlife Center of Virginia',
        'Owl Research Institute (MT)'
      ]
    }
  };

  // ═══════════════════════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════════════════════
  window.StemLab.registerTool('raptorHunt', {
    title: 'Raptor Hunt: Predator Physics + Biology',
    description: 'Three.js stoop simulator + deep science of raptor hunt mechanics: talon grip force, vision, flight physics, silent flight, and the DDT-era recovery story. 8 species roster from peregrine to harpy.',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React, h = React.createElement;
      var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;
      var setToolData = ctx.setToolData, toolData = ctx.toolData;

      // ── State ──
      var rh = (toolData && toolData.raptorHunt) || {};
      function setRH(patch) {
        ctx.setToolData(function(prev) {
          var cur = (prev && prev.raptorHunt) || {};
          var next = typeof patch === 'function' ? patch(cur) : Object.assign({}, cur, patch);
          return Object.assign({}, prev, { raptorHunt: next });
        });
      }
      var activeSection = rh.activeSection || 'hub';
      var selectedSpecies = rh.selectedSpecies || 'peregrine';
      var huntSimRunning = !!rh.huntSimRunning;
      var huntStats = rh.huntStats || {};
      var visionView = rh.visionView || 'overview';
      var stoopSimVars = rh.stoopSimVars || { mass: 0.95, cd: 0.18, area: 0.018, altitudeM: 600 };

      // ── Helpers ──
      function findSpecies(id) {
        for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i];
        return SPECIES[0];
      }
      var sp = findSpecies(selectedSpecies);

      // ── Section nav config ──
      var SECTIONS = [
        { id: 'hub', label: 'Hub', icon: '🦅' },
        { id: 'roster', label: 'Species Roster', icon: '📋' },
        { id: 'hunt', label: 'Hunt Sim (3D)', icon: '🎯' },
        { id: 'talons', label: 'Talon Mechanics', icon: '🪝' },
        { id: 'vision', label: 'Vision Lab', icon: '👁️' },
        { id: 'flight', label: 'Flight Physics', icon: '🪶' },
        { id: 'stoop', label: 'Stoop Calculator', icon: '📐' },
        { id: 'silent', label: 'Silent Flight', icon: '🤫' },
        { id: 'senses', label: 'Day Eye vs Night Eye', icon: '🌗' },
        { id: 'conservation', label: 'Conservation', icon: '🌍' },
        { id: 'fieldid', label: 'Field ID', icon: '🔍' },
        { id: 'migration', label: 'Migration', icon: '🧭' },
        { id: 'hearing', label: 'Owl Hearing Lab', icon: '🦻' },
        { id: 'pellet', label: 'Pellet Lab', icon: '🥚' },
        { id: 'falconry', label: 'Falconry & Humans', icon: '🤝' },
        { id: 'quiz', label: 'Field ID Quiz', icon: '🎓' },
        { id: 'resources', label: 'Resources', icon: '📚' }
      ];

      // ────────────────────────────────────────────────────────
      // RENDER: HUB
      // ────────────────────────────────────────────────────────
      function renderHub() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-700/40 rounded-xl p-5' },
            h('div', { className: 'flex items-start gap-3' },
              h('div', { className: 'text-5xl' }, '🦅'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'text-xl font-bold text-amber-200' }, 'Raptor Hunt: Predator Physics + Biology'),
                h('div', { className: 'text-sm text-amber-100/80 mt-1' }, 'Hunt as a peregrine at 240 mph. Crush bones at 530 psi as a harpy. See vole urine trails in UV like a kestrel. Glide silently on owl feathers. Then study the biology that makes it all possible.'),
                h('div', { className: 'text-xs text-amber-300/70 mt-2 italic' }, '17 sections · 8 species · 3D Three.js simulator · interactive owl-hearing lab · pellet dissection · 18-question quiz')
              )
            )
          ),
          // Quick CTA cards
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
            h('button', {
              onClick: function() { setRH({ activeSection: 'hunt' }); },
              className: 'text-left p-4 rounded-xl bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-700/40 hover:border-red-500/70 transition-all',
              'aria-label': 'Launch 3D Hunt Simulator'
            },
              h('div', { className: 'text-3xl mb-2' }, '🎯'),
              h('div', { className: 'font-bold text-red-200' }, 'Launch Hunt Sim'),
              h('div', { className: 'text-xs text-red-100/80 mt-1' }, 'Third-person 3D stoop sim. WASD to fly, Shift to dive, Space to pull up, F to strike. Species-specific physics.')
            ),
            h('button', {
              onClick: function() { setRH({ activeSection: 'roster' }); },
              className: 'text-left p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-700/40 hover:border-amber-500/70 transition-all',
              'aria-label': 'Browse Species Roster'
            },
              h('div', { className: 'text-3xl mb-2' }, '📋'),
              h('div', { className: 'font-bold text-amber-200' }, 'Species Roster'),
              h('div', { className: 'text-xs text-amber-100/80 mt-1' }, '8 species: peregrine, harpy, golden, bald, red-tail, goshawk, owl, osprey. Mass, talon force, vision, hunt style.')
            ),
            h('button', {
              onClick: function() { setRH({ activeSection: 'talons' }); },
              className: 'text-left p-4 rounded-xl bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 hover:border-orange-500/70 transition-all',
              'aria-label': 'Talon Mechanics'
            },
              h('div', { className: 'text-3xl mb-2' }, '🪝'),
              h('div', { className: 'font-bold text-orange-200' }, 'Talon Mechanics'),
              h('div', { className: 'text-xs text-orange-100/80 mt-1' }, 'Grip force PSI compared across species. Why harpy eagles crush monkey skulls while peregrines punch with clenched feet at 200+ mph.')
            )
          ),
          // Science topic tiles
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '🧠 Deep-Science Modules'),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
              [
                { id: 'vision', icon: '👁️', label: 'Vision (4-8× human acuity)' },
                { id: 'flight', icon: '🪶', label: 'Flight Physics' },
                { id: 'stoop', icon: '📐', label: 'Stoop Calculator' },
                { id: 'silent', icon: '🤫', label: 'Owl Silent Flight' },
                { id: 'senses', icon: '🌗', label: 'Day vs Night Eyes' },
                { id: 'conservation', icon: '🌍', label: 'DDT + Recovery' },
                { id: 'fieldid', icon: '🔍', label: 'Field ID' },
                { id: 'resources', icon: '📚', label: 'Resources' }
              ].map(function(t) {
                return h('button', {
                  key: t.id,
                  onClick: function() { setRH({ activeSection: t.id }); },
                  className: 'text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-amber-600/40 transition-all',
                  'aria-label': t.label
                },
                  h('div', { className: 'text-xl mb-1' }, t.icon),
                  h('div', { className: 'text-xs font-bold text-amber-200' }, t.label)
                );
              })
            )
          ),
          // Pedagogy framing
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4' },
            h('div', { className: 'text-xs font-bold text-emerald-300 mb-2' }, '📖 What students learn'),
            h('ul', { className: 'text-xs text-emerald-100/90 space-y-1 list-disc list-inside' },
              h('li', null, 'Force = mass × acceleration: kinetic energy of a 200 mph dive ≈ pistol bullet'),
              h('li', null, 'Pressure = force / area: why talon length × grip muscle = lethal precision'),
              h('li', null, 'Fluid dynamics: drag coefficient + wing loading + terminal velocity'),
              h('li', null, 'Frequency-domain acoustics: how owl feathers shift noise above prey hearing'),
              h('li', null, 'Predator ecology + the DDT story: how science + policy reversed a near-extinction'),
              h('li', null, 'Field ID using gestalt — wing shape + flight pattern over species checklist')
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: ROSTER
      // ────────────────────────────────────────────────────────
      function renderRoster() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'text-sm text-amber-200/80' }, 'Tap a species card to make it the active raptor for the Hunt Sim + science modules.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            SPECIES.map(function(s) {
              var isActive = s.id === selectedSpecies;
              return h('button', {
                key: s.id,
                onClick: function() { setRH({ selectedSpecies: s.id }); rhAnnounce(s.name + ' selected'); },
                className: 'text-left p-4 rounded-xl border transition-all ' + (isActive
                  ? 'bg-gradient-to-br from-amber-800/50 to-orange-800/50 border-amber-400/70 ring-2 ring-amber-400/50'
                  : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-amber-600/40'),
                'aria-label': 'Select ' + s.name
              },
                h('div', { className: 'flex items-start gap-3' },
                  h('div', { className: 'text-3xl' }, s.emoji),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'font-bold text-amber-200' }, s.name),
                    h('div', { className: 'text-xs italic text-slate-400' }, s.scientific),
                    h('div', { className: 'text-xs text-slate-300 mt-1' }, s.huntStyle),
                    h('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-[10px]' },
                      h('div', { className: 'bg-slate-900/50 rounded p-1.5' },
                        h('div', { className: 'text-slate-400' }, 'Mass'),
                        h('div', { className: 'font-bold text-amber-300' }, s.massKg + ' kg')
                      ),
                      h('div', { className: 'bg-slate-900/50 rounded p-1.5' },
                        h('div', { className: 'text-slate-400' }, 'Talon'),
                        h('div', { className: 'font-bold text-amber-300' }, s.talonForcePsi + ' psi')
                      ),
                      h('div', { className: 'bg-slate-900/50 rounded p-1.5' },
                        h('div', { className: 'text-slate-400' }, 'Stoop'),
                        h('div', { className: 'font-bold text-amber-300' }, s.stoopMph + ' mph')
                      )
                    )
                  )
                )
              );
            })
          ),
          // Active species detail
          h('div', { className: 'bg-gradient-to-br from-amber-950/40 to-orange-950/40 border border-amber-700/40 rounded-xl p-5 space-y-3' },
            h('div', { className: 'flex items-baseline gap-3' },
              h('div', { className: 'text-2xl' }, sp.emoji),
              h('div', { className: 'text-xl font-bold text-amber-200' }, sp.name),
              h('div', { className: 'text-sm italic text-slate-400' }, sp.scientific)
            ),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
              [
                ['Family', sp.family],
                ['Mass', sp.massKg + ' kg'],
                ['Wingspan', sp.wingspanM + ' m'],
                ['Wing Loading', sp.wingLoading + ' kg/m²'],
                ['Aspect Ratio', sp.aspectRatio],
                ['Max Level', sp.maxLevelMph + ' mph'],
                ['Stoop Speed', sp.stoopMph + ' mph'],
                ['Talon Force', sp.talonForcePsi + ' psi'],
                ['Talon Length', sp.talonLengthMm + ' mm'],
                ['Visual Acuity', sp.visualAcuityX + '× human'],
                ['Foveas/Eye', sp.foveaCount],
                ['Visual Field', sp.visualFieldDeg + '°']
              ].map(function(kv, i) {
                return h('div', { key: i, className: 'bg-slate-900/50 rounded p-2 text-xs' },
                  h('div', { className: 'text-slate-400' }, kv[0]),
                  h('div', { className: 'font-bold text-amber-300' }, kv[1])
                );
              })
            ),
            h('div', { className: 'space-y-2 text-sm' },
              h('div', null, h('span', { className: 'text-amber-300 font-bold' }, 'Habitat: '), h('span', { className: 'text-slate-300' }, sp.habitat.join(', '))),
              h('div', null, h('span', { className: 'text-amber-300 font-bold' }, 'Prey: '), h('span', { className: 'text-slate-300' }, sp.prey.join(', '))),
              h('div', null, h('span', { className: 'text-amber-300 font-bold' }, 'Range: '), h('span', { className: 'text-slate-300' }, sp.range)),
              h('div', null, h('span', { className: 'text-amber-300 font-bold' }, 'Conservation: '), h('span', { className: 'text-slate-300' }, sp.conservation)),
              h('div', { className: 'mt-2 p-3 bg-amber-900/30 rounded border border-amber-700/40' },
                h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '🦅 Hunt Style'),
                h('div', { className: 'text-sm text-amber-100/90' }, sp.huntStyle)
              ),
              h('div', { className: 'p-3 bg-slate-900/40 rounded border border-slate-700/40' },
                h('div', { className: 'text-xs font-bold text-emerald-300 mb-1' }, '🌍 Ecology'),
                h('div', { className: 'text-sm text-slate-200' }, sp.ecology)
              ),
              h('div', { className: 'p-3 bg-orange-900/30 rounded border border-orange-700/40' },
                h('div', { className: 'text-xs font-bold text-orange-300 mb-1' }, '⚡ Weird fact'),
                h('div', { className: 'text-sm text-orange-100/90' }, sp.weird)
              )
            ),
            h('div', { className: 'flex gap-2 pt-2' },
              h('button', {
                onClick: function() { setRH({ activeSection: 'hunt' }); },
                className: 'px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 transition-all',
                'aria-label': 'Hunt as ' + sp.name
              }, '🎯 Hunt as ' + sp.name + ' →')
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: HUNT SIM (Three.js)
      // ────────────────────────────────────────────────────────
      function renderHunt() {
        var threeLoaded = !!window.THREE || (rh._threeLoaded === true);
        // Stats
        var allStats = huntStats[selectedSpecies] || { catches: 0, attempts: 0, bestRun: 0 };
        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-slate-900/50 border border-slate-700/50 rounded-xl p-4' },
            h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
              h('div', null,
                h('div', { className: 'text-sm font-bold text-amber-200' }, 'Hunt Sim · ' + sp.emoji + ' ' + sp.name),
                h('div', { className: 'text-xs text-slate-400' }, 'WASD to fly · Q/E for altitude · Shift to DIVE · Space to PULL UP · F to STRIKE')
              ),
              h('div', { className: 'flex items-center gap-2 text-xs' },
                h('div', { className: 'px-2 py-1 rounded bg-emerald-900/30 border border-emerald-700/40' },
                  h('span', { className: 'text-slate-400' }, 'Catches: '), h('span', { className: 'font-bold text-emerald-300' }, allStats.catches)
                ),
                h('div', { className: 'px-2 py-1 rounded bg-blue-900/30 border border-blue-700/40' },
                  h('span', { className: 'text-slate-400' }, 'Attempts: '), h('span', { className: 'font-bold text-blue-300' }, allStats.attempts)
                ),
                h('div', { className: 'px-2 py-1 rounded bg-amber-900/30 border border-amber-700/40' },
                  h('span', { className: 'text-slate-400' }, 'Best run: '), h('span', { className: 'font-bold text-amber-300' }, allStats.bestRun + ' caught')
                )
              )
            )
          ),
          !threeLoaded && h('div', { className: 'bg-blue-900/30 border border-blue-700/40 rounded-xl p-6 text-center' },
            h('div', { className: 'text-3xl mb-2' }, '⏳'),
            h('div', { className: 'text-sm text-blue-200 mb-3' }, 'Loading 3D engine (Three.js r128)...'),
            h('button', {
              onClick: function() {
                ensureThreeJS(
                  function() { setRH({ _threeLoaded: true }); rhAnnounce('3D engine loaded'); },
                  function() { setRH({ _threeLoadError: true }); rhAnnounce('3D engine failed to load'); }
                );
              },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700',
              'aria-label': 'Load Three.js engine'
            }, '🚀 Load 3D Engine'),
            rh._threeLoadError && h('div', { className: 'text-xs text-red-300 mt-2' }, '⚠ Failed to load Three.js from CDN. Check your internet connection or try again.')
          ),
          threeLoaded && h('div', { className: 'bg-gradient-to-b from-sky-900/40 to-slate-900/40 border border-amber-700/40 rounded-xl overflow-hidden' },
            h('div', { className: 'relative', style: { height: '60vh', minHeight: '420px', maxHeight: '720px' } },
              h('canvas', {
                'data-raptor-canvas': 'true',
                role: 'application',
                'aria-label': '3D raptor hunt simulator. Press WASD to steer, Q E to change altitude, Shift to dive, Space to pull up, F to strike.',
                tabIndex: 0,
                style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair', outline: 'none' },
                ref: function(canvasEl) {
                  if (!canvasEl) return;
                  // If species changed, reinit
                  if (canvasEl._rhInit && canvasEl._rhSpecies === selectedSpecies) return;
                  // Cleanup previous run
                  if (canvasEl._rhCleanup) { try { canvasEl._rhCleanup(); } catch(e) {} canvasEl._rhCleanup = null; }
                  canvasEl._rhInit = true;
                  canvasEl._rhSpecies = selectedSpecies;
                  initHuntSim(canvasEl, sp);
                }
              })
            ),
            h('div', { className: 'bg-slate-900/60 border-t border-slate-700/50 p-3 text-xs text-slate-300' },
              h('div', { className: 'flex gap-4 flex-wrap' },
                h('div', null, '⬆⬇⬅➡: ', h('span', { className: 'text-amber-300' }, 'WASD')),
                h('div', null, 'Altitude: ', h('span', { className: 'text-amber-300' }, 'Q (down) / E (up)')),
                h('div', null, 'Dive: ', h('span', { className: 'text-amber-300' }, 'Shift')),
                h('div', null, 'Pull up: ', h('span', { className: 'text-amber-300' }, 'Space')),
                h('div', null, 'Strike: ', h('span', { className: 'text-amber-300' }, 'F'))
              )
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // THREE.JS HUNT SIM — terrain + prey + raptor + physics
      // ────────────────────────────────────────────────────────
      function initHuntSim(canvasEl, species) {
        var THREE = window.THREE;
        if (!THREE) return;
        var W = canvasEl.clientWidth || 800;
        var H = canvasEl.clientHeight || 500;

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(70, W / H, 0.5, 2000);
        var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);

        // ─── Sky + fog (biome-tinted) ───
        var biomeColors = {
          'cliff':         { sky: 0x87ceeb, fog: 0xbfdfff, ground: 0x9ca3af },
          'lake':          { sky: 0x9bc7f2, fog: 0xdbeafe, ground: 0x365314 },
          'grassland':     { sky: 0xa5d8ff, fog: 0xe0e7ff, ground: 0x65a30d },
          'rainforest':    { sky: 0x86efac, fog: 0xa7f3d0, ground: 0x166534 },
          'forest-night':  { sky: 0x1e1b4b, fog: 0x312e81, ground: 0x1c1917 },
          'mountain':      { sky: 0x93c5fd, fog: 0xdbeafe, ground: 0x78716c },
          'boreal-forest': { sky: 0x6ee7b7, fog: 0xa7f3d0, ground: 0x1f3a1d },
          'urban-cliff':   { sky: 0xbfdbfe, fog: 0xe0e7ff, ground: 0x6b7280 }
        };
        var bc = biomeColors[species.biome] || biomeColors.grassland;
        scene.background = new THREE.Color(bc.sky);
        scene.fog = new THREE.Fog(bc.fog, 80, 600);

        // ─── Lighting ───
        var isNight = (species.biome === 'forest-night');
        var ambient = new THREE.AmbientLight(0xffffff, isNight ? 0.25 : 0.55);
        scene.add(ambient);
        var sun = new THREE.DirectionalLight(0xfff8e1, isNight ? 0.4 : 0.95);
        sun.position.set(80, 120, 50);
        scene.add(sun);
        if (isNight) {
          var moonGlow = new THREE.DirectionalLight(0xb0c4ff, 0.35);
          moonGlow.position.set(-60, 90, -30);
          scene.add(moonGlow);
        }

        // ─── Terrain: large displaced plane ───
        var terrainSize = 800;
        var terrainSegs = 96;
        var terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
        var tPos = terrainGeo.attributes.position.array;
        for (var i = 0; i < tPos.length; i += 3) {
          var x = tPos[i], y = tPos[i + 1];
          var hh = 0;
          // Multi-octave displacement
          hh += Math.sin(x * 0.02) * Math.cos(y * 0.018) * 8;
          hh += Math.sin(x * 0.05 + 1.7) * Math.cos(y * 0.06 + 0.8) * 3;
          hh += Math.sin(x * 0.13) * Math.cos(y * 0.11) * 0.8;
          // Biome bias
          if (species.biome === 'mountain') hh *= 2.5;
          if (species.biome === 'cliff' || species.biome === 'urban-cliff') {
            // Big cliff in one direction
            if (x < -50) hh += 35 - Math.min(35, Math.abs(x + 50) * 0.3);
          }
          if (species.biome === 'lake') {
            // Bowl out the middle
            var rd = Math.sqrt(x * x + y * y);
            if (rd < 120) hh -= (120 - rd) * 0.15;
          }
          tPos[i + 2] = hh;
        }
        terrainGeo.computeVertexNormals();
        // Procedural ground texture (color-noise canvas)
        var tCv = document.createElement('canvas'); tCv.width = 512; tCv.height = 512;
        var tCx = tCv.getContext('2d');
        var groundHex = '#' + new THREE.Color(bc.ground).getHexString();
        tCx.fillStyle = groundHex; tCx.fillRect(0, 0, 512, 512);
        for (var ti = 0; ti < 3000; ti++) {
          var jit = (Math.random() - 0.5) * 60;
          var col = new THREE.Color(bc.ground).offsetHSL(0, 0, jit / 600);
          tCx.fillStyle = '#' + col.getHexString();
          tCx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
        }
        var terrainTex = new THREE.CanvasTexture(tCv);
        terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping;
        terrainTex.repeat.set(12, 12);
        var terrain = new THREE.Mesh(terrainGeo,
          new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.95, metalness: 0.02, flatShading: false })
        );
        terrain.rotation.x = -Math.PI / 2;
        scene.add(terrain);
        var _trayRay = new THREE.Raycaster();
        function terrainHeightAt(wx, wz) {
          _trayRay.set(new THREE.Vector3(wx, 200, wz), new THREE.Vector3(0, -1, 0));
          var hits = _trayRay.intersectObject(terrain);
          return hits.length > 0 ? hits[0].point.y : 0;
        }

        // ─── Lake (osprey + eagle biomes) ───
        if (species.biome === 'lake') {
          var lakeGeo = new THREE.CircleGeometry(110, 36);
          var lakeMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 });
          var lake = new THREE.Mesh(lakeGeo, lakeMat);
          lake.rotation.x = -Math.PI / 2;
          lake.position.y = -1.5;
          scene.add(lake);
        }

        // ─── Trees + obstacles ───
        var trees = [];
        var treeCount = species.biome === 'rainforest' ? 180 :
                        species.biome === 'forest-night' ? 120 :
                        species.biome === 'boreal-forest' ? 140 :
                        species.biome === 'mountain' ? 30 :
                        species.biome === 'grassland' ? 25 : 50;
        for (var ti2 = 0; ti2 < treeCount; ti2++) {
          var tx = (Math.random() - 0.5) * terrainSize * 0.85;
          var tz = (Math.random() - 0.5) * terrainSize * 0.85;
          // Don't place trees in the lake
          if (species.biome === 'lake' && Math.sqrt(tx * tx + tz * tz) < 115) continue;
          var ty = terrainHeightAt(tx, tz);
          var treeHeight = 8 + Math.random() * 14;
          if (species.biome === 'rainforest') treeHeight = 20 + Math.random() * 20;
          if (species.biome === 'mountain') treeHeight = 5 + Math.random() * 5;
          var trunkR = treeHeight * 0.04;
          var trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, treeHeight * 0.55, 6);
          var trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.95 });
          var trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.set(tx, ty + treeHeight * 0.275, tz);
          scene.add(trunk);
          // Foliage cone
          var folHeight = treeHeight * 0.6;
          var folR = treeHeight * 0.25;
          var folGeo = species.biome === 'rainforest'
            ? new THREE.SphereGeometry(folR, 8, 6)
            : new THREE.ConeGeometry(folR, folHeight, 6);
          var folColor = species.biome === 'rainforest' ? 0x14532d :
                         species.biome === 'forest-night' ? 0x14532d :
                         species.biome === 'boreal-forest' ? 0x064e3b :
                         species.biome === 'mountain' ? 0x166534 : 0x166534;
          var folMat = new THREE.MeshStandardMaterial({ color: folColor, roughness: 0.95 });
          var foliage = new THREE.Mesh(folGeo, folMat);
          foliage.position.set(tx, ty + treeHeight * 0.55 + folHeight * 0.45, tz);
          scene.add(foliage);
          trees.push({ mesh: trunk, foliage: foliage, x: tx, z: tz, y: ty, height: treeHeight });
        }

        // ─── Cliff for cliff biomes ───
        if (species.biome === 'cliff' || species.biome === 'urban-cliff') {
          var cliffGeo = new THREE.BoxGeometry(20, 100, 200);
          var cliffMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
          var cliff = new THREE.Mesh(cliffGeo, cliffMat);
          cliff.position.set(-80, 30, 0);
          scene.add(cliff);
          if (species.biome === 'urban-cliff') {
            // Buildings opposite the cliff
            for (var bi = 0; bi < 8; bi++) {
              var bgeo = new THREE.BoxGeometry(8 + Math.random() * 6, 40 + Math.random() * 40, 8 + Math.random() * 6);
              var bmat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.7 });
              var bld = new THREE.Mesh(bgeo, bmat);
              bld.position.set(50 + bi * 12 - 30, bgeo.parameters.height / 2, -30 + Math.random() * 60);
              scene.add(bld);
            }
          }
        }

        // ─── Player raptor mesh (procedural bird) ───
        var raptorGroup = new THREE.Group();
        var bodyColor = species.id === 'baldEagle' ? 0x2a2418 :
                        species.id === 'osprey' ? 0xfafaf5 :
                        species.id === 'greatHorned' ? 0x6b4f2a :
                        species.id === 'harpyEagle' ? 0xd1d5db :
                        species.id === 'peregrine' ? 0x44403c :
                        species.id === 'goldenEagle' ? 0x4a3a20 :
                        species.id === 'northernGoshawk' ? 0x57534e :
                        0x6b4423;
        var wingColor = species.id === 'baldEagle' ? 0x4a2c0e :
                        species.id === 'osprey' ? 0x44403c :
                        species.id === 'greatHorned' ? 0x57341a :
                        bodyColor;
        // Body (elongated capsule)
        var body = new THREE.Mesh(
          new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.3, 0.9, 4, 8) : new THREE.SphereGeometry(0.4, 8, 8),
          new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 })
        );
        body.rotation.x = Math.PI / 2;
        raptorGroup.add(body);
        // Head
        var head = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 8),
          new THREE.MeshStandardMaterial({ color: species.id === 'baldEagle' ? 0xfff9e0 : bodyColor, roughness: 0.7 })
        );
        head.position.set(0, 0.08, 0.55);
        raptorGroup.add(head);
        // Beak
        var beak = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.22, 6),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 })
        );
        beak.position.set(0, 0.04, 0.78);
        beak.rotation.x = -Math.PI / 2 + 0.15;
        raptorGroup.add(beak);
        // Wings (two flat box meshes)
        var wingSpan = Math.max(1.5, Math.min(3.5, species.wingspanM));
        var wingArea = species.wingAreaSqM * 6; // visual scale
        var wingGeo = new THREE.BoxGeometry(wingSpan, 0.04, 0.45);
        var leftWing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.8 }));
        leftWing.position.set(-wingSpan * 0.4, 0.03, 0.1);
        raptorGroup.add(leftWing);
        var rightWing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.8 }));
        rightWing.position.set(wingSpan * 0.4, 0.03, 0.1);
        raptorGroup.add(rightWing);
        // Tail
        var tail = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.03, 0.35),
          new THREE.MeshStandardMaterial({ color: species.id === 'redTail' ? 0xb45309 : wingColor, roughness: 0.8 })
        );
        tail.position.set(0, 0.02, -0.55);
        raptorGroup.add(tail);
        scene.add(raptorGroup);

        // ─── Prey spawn ───
        var preyList = SPECIES_PREY[species.id] || ['rodent'];
        var preyMeshes = [];
        function spawnPrey() {
          var preyId = preyList[Math.floor(Math.random() * preyList.length)];
          var pd = PREY[preyId];
          if (!pd) return null;
          var radius = 250 + Math.random() * 200;
          var theta = Math.random() * Math.PI * 2;
          var px = Math.cos(theta) * radius;
          var pz = Math.sin(theta) * radius;
          var py = terrainHeightAt(px, pz);
          // Fish + lake species near surface
          if (pd.id === 'fish' || pd.id === 'waterfowl' || pd.id === 'duck') {
            var rd2 = Math.sqrt(px * px + pz * pz);
            if (species.biome === 'lake' && rd2 > 100) {
              // pull to lake
              var sc = 80 / rd2;
              px = px * sc; pz = pz * sc;
            }
            py = species.biome === 'lake' ? -1.4 : py;
          }
          var size = pd.sizeM * 4; // visual scale
          var geo = pd.id === 'snake'
            ? new THREE.CylinderGeometry(size * 0.15, size * 0.15, size * 1.8, 6)
            : pd.id === 'fish'
              ? new THREE.ConeGeometry(size * 0.4, size * 1.4, 6)
              : new THREE.BoxGeometry(size, size * 0.55, size * 1.1);
          var mat = new THREE.MeshStandardMaterial({ color: pd.color, roughness: 0.8 });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(px, py + size * 0.3, pz);
          if (pd.id === 'snake') { mesh.rotation.x = Math.PI / 2; mesh.rotation.z = Math.random() * Math.PI; }
          if (pd.id === 'fish') { mesh.rotation.x = Math.PI / 2; }
          scene.add(mesh);
          return {
            mesh: mesh,
            data: pd,
            vx: (Math.random() - 0.5) * pd.speedMps * 0.3,
            vz: (Math.random() - 0.5) * pd.speedMps * 0.3,
            spawnedAt: performance.now(),
            alerted: false,
            fleeBoost: 1.0
          };
        }
        for (var pi = 0; pi < 12; pi++) {
          var spawned = spawnPrey();
          if (spawned) preyMeshes.push(spawned);
        }

        // ─── State + Physics ───
        var startY = 30 + (species.biome === 'cliff' || species.biome === 'mountain' ? 30 : 0);
        var raptor = {
          x: 0, y: startY, z: 80,
          yaw: Math.PI, // facing -z initially
          pitch: 0,
          speed: 10, // m/s level cruise (will be ~22 mph)
          maxLevel: species.maxLevelMph * 0.447, // mph to m/s
          stoopMax: species.stoopMph * 0.447,
          maxG: species.pullupG,
          diving: false,
          pullingUp: false,
          mass: species.massKg,
          wingArea: species.wingAreaSqM,
          stoopBonus: species.stoopDiveBonus,
          isOwl: species.isOwl,
          stunned: false
        };
        var gravity = 9.81;
        var runStart = performance.now();
        var runCatches = 0;
        var runMaxSpeed = 0;
        var lastStrike = 0;
        var lastSpawn = performance.now();

        // ─── Input ───
        var keys = {};
        function onKeyDown(e) {
          var k = e.key.toLowerCase();
          keys[k] = true;
          if (k === 'f') { strike(); e.preventDefault(); }
          if (k === ' ' || k === 'shift') e.preventDefault();
          if (['w','a','s','d','q','e'].indexOf(k) !== -1) e.preventDefault();
        }
        function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
        canvasEl.addEventListener('keydown', onKeyDown);
        canvasEl.addEventListener('keyup', onKeyUp);
        canvasEl.addEventListener('mousedown', function() { canvasEl.focus(); });
        canvasEl.focus();

        // ─── Strike ───
        function strike() {
          var now = performance.now();
          if (now - lastStrike < 400) return; // cooldown
          lastStrike = now;
          // Find prey within reach (in front of bird, within ~4m)
          var reachDist = 5 + (raptor.diving ? 2 : 0);
          var forward = new THREE.Vector3(
            Math.sin(raptor.yaw) * Math.cos(raptor.pitch),
            -Math.sin(raptor.pitch),
            -Math.cos(raptor.yaw) * Math.cos(raptor.pitch)
          ).normalize();
          var hitIdx = -1, bestDot = 0.7;
          for (var pi2 = 0; pi2 < preyMeshes.length; pi2++) {
            var pm = preyMeshes[pi2];
            var dx = pm.mesh.position.x - raptor.x;
            var dy = pm.mesh.position.y - raptor.y;
            var dz = pm.mesh.position.z - raptor.z;
            var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > reachDist) continue;
            // dot product with forward
            var dot = (dx * forward.x + dy * forward.y + dz * forward.z) / d;
            if (dot > bestDot) { bestDot = dot; hitIdx = pi2; }
          }
          if (hitIdx >= 0) {
            // Catch!
            var caught = preyMeshes[hitIdx];
            scene.remove(caught.mesh); caught.mesh.geometry.dispose(); caught.mesh.material.dispose();
            preyMeshes.splice(hitIdx, 1);
            runCatches++;
            rhAnnounce('Strike! Caught ' + caught.data.label + ' (+' + caught.data.points + ' XP)');
            if (ctx.awardXP) ctx.awardXP(caught.data.points, 'Raptor Hunt: caught ' + caught.data.label);
            // Update stats
            setRH(function(prev) {
              var stats = (prev.huntStats && prev.huntStats[species.id]) || { catches: 0, attempts: 0, bestRun: 0 };
              var ns = { catches: stats.catches + 1, attempts: stats.attempts + 1, bestRun: Math.max(stats.bestRun, runCatches) };
              var allStats = Object.assign({}, prev.huntStats || {});
              allStats[species.id] = ns;
              return Object.assign({}, prev, { huntStats: allStats });
            });
            // Spawn replacement
            setTimeout(function() {
              var newPrey = spawnPrey();
              if (newPrey) preyMeshes.push(newPrey);
            }, 1500);
            // Bird "lift" reaction
            raptor.y += 1.5;
          } else {
            // Miss — update attempts
            rhAnnounce('Missed');
            setRH(function(prev) {
              var stats = (prev.huntStats && prev.huntStats[species.id]) || { catches: 0, attempts: 0, bestRun: 0 };
              var ns = { catches: stats.catches, attempts: stats.attempts + 1, bestRun: Math.max(stats.bestRun, runCatches) };
              var allStats = Object.assign({}, prev.huntStats || {});
              allStats[species.id] = ns;
              return Object.assign({}, prev, { huntStats: allStats });
            });
          }
        }

        // ─── HUD overlay (DOM div) ───
        var hudParent = canvasEl.parentElement;
        var hud = document.createElement('div');
        hud.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(15,23,42,0.78);border:1px solid rgba(180,140,40,0.6);border-radius:10px;padding:10px 14px;color:#fbbf24;font-family:ui-monospace,Menlo,monospace;font-size:11px;pointer-events:none;line-height:1.5;text-shadow:0 0 4px rgba(0,0,0,0.6);min-width:180px';
        hudParent.appendChild(hud);
        var crossHair = document.createElement('div');
        crossHair.style.cssText = 'position:absolute;top:50%;left:50%;width:24px;height:24px;margin:-12px 0 0 -12px;border:2px solid rgba(251,191,36,0.85);border-radius:50%;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,0.6)';
        hudParent.appendChild(crossHair);
        // Status line for caught counter
        var status = document.createElement('div');
        status.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(15,23,42,0.78);border:1px solid rgba(16,185,129,0.6);border-radius:10px;padding:10px 14px;color:#6ee7b7;font-family:ui-monospace,Menlo,monospace;font-size:11px;pointer-events:none;line-height:1.5;text-shadow:0 0 4px rgba(0,0,0,0.6);min-width:160px';
        hudParent.appendChild(status);

        // ─── Animate ───
        var lastT = performance.now();
        var animId;
        function loop() {
          animId = requestAnimationFrame(loop);
          var now = performance.now();
          var dt = Math.min(0.05, (now - lastT) / 1000);
          lastT = now;

          // ── Controls ──
          if (keys['a']) raptor.yaw += 1.5 * dt;
          if (keys['d']) raptor.yaw -= 1.5 * dt;
          if (keys['w']) raptor.pitch = Math.min(raptor.pitch + 0.8 * dt, 0.8);
          if (keys['s']) raptor.pitch = Math.max(raptor.pitch - 0.8 * dt, -0.8);
          if (keys['q']) raptor.y -= 8 * dt;
          if (keys['e']) raptor.y += 8 * dt;

          // ── Dive / pull-up ──
          var diveKey = !!keys['shift'];
          var pullUpKey = !!keys[' '];
          raptor.diving = diveKey;
          raptor.pullingUp = pullUpKey;

          // Speed
          var targetSpeed;
          if (diveKey) {
            // Dive: pitch tucks forward, speed approaches stoopMax
            targetSpeed = raptor.stoopMax;
            raptor.pitch = Math.max(raptor.pitch - 1.2 * dt, -1.0);
          } else if (pullUpKey) {
            // Pull up: lose speed
            targetSpeed = Math.max(8, raptor.maxLevel * 0.5);
            raptor.pitch = Math.min(raptor.pitch + 1.5 * dt, 0.6);
          } else {
            // Coast at level cruise
            targetSpeed = raptor.maxLevel * 0.7;
            // gentle pitch back to 0
            raptor.pitch = raptor.pitch * 0.96;
          }
          // Smooth approach (different rates for dive vs pull-up)
          var accel = diveKey ? 12 : pullUpKey ? 8 : 4;
          raptor.speed += (targetSpeed - raptor.speed) * Math.min(1, accel * dt);
          runMaxSpeed = Math.max(runMaxSpeed, raptor.speed);

          // ── Position update (forward in yaw direction, vertical from pitch + gravity at dive) ──
          var horizSpeed = raptor.speed * Math.cos(raptor.pitch);
          raptor.x += Math.sin(raptor.yaw) * horizSpeed * dt;
          raptor.z -= Math.cos(raptor.yaw) * horizSpeed * dt;
          if (diveKey) {
            // Pitched dive: lose altitude proportional to pitch
            raptor.y -= (raptor.speed * Math.sin(Math.abs(raptor.pitch))) * dt;
          } else if (pullUpKey) {
            raptor.y += Math.abs(Math.sin(raptor.pitch)) * raptor.speed * dt;
            // Bleed speed for the climb
            raptor.speed = Math.max(8, raptor.speed - gravity * 0.5 * dt);
          } else {
            // Level glide — bleed a little altitude
            raptor.y -= 1.5 * dt;
          }

          // Hard floor + ceiling
          var groundY = terrainHeightAt(raptor.x, raptor.z);
          var minY = groundY + 1.5;
          if (raptor.y < minY) {
            if (raptor.speed > 25) {
              // Crash — reset with penalty
              rhAnnounce('Crash! Run reset.');
              raptor.y = minY + 30;
              raptor.speed = raptor.maxLevel * 0.5;
              runCatches = 0;
              runStart = performance.now();
            } else {
              raptor.y = minY;
            }
          }
          if (raptor.y > 300) raptor.y = 300;

          // Wrap around if drifting off-map
          if (Math.abs(raptor.x) > terrainSize * 0.45) raptor.x = -raptor.x * 0.9;
          if (Math.abs(raptor.z) > terrainSize * 0.45) raptor.z = -raptor.z * 0.9;

          // ── Update raptor mesh ──
          raptorGroup.position.set(raptor.x, raptor.y, raptor.z);
          raptorGroup.rotation.set(0, raptor.yaw, 0);
          raptorGroup.rotation.x = -raptor.pitch * 0.6;
          // Wing flap animation (level flight only)
          if (!diveKey) {
            var flap = Math.sin(now * 0.012) * 0.35;
            leftWing.rotation.z = flap;
            rightWing.rotation.z = -flap;
          } else {
            // Tucked dive
            leftWing.rotation.z = 0.4;
            rightWing.rotation.z = -0.4;
            leftWing.position.x = -wingSpan * 0.18;
            rightWing.position.x = wingSpan * 0.18;
          }
          if (!diveKey) {
            leftWing.position.x = -wingSpan * 0.4;
            rightWing.position.x = wingSpan * 0.4;
          }

          // ── Camera follow (third-person, behind + above) ──
          var camDist = diveKey ? 3.5 : 6;
          var camHeight = diveKey ? 1.0 : 2.2;
          var camTargetX = raptor.x - Math.sin(raptor.yaw) * camDist;
          var camTargetY = raptor.y + camHeight + Math.sin(raptor.pitch) * camDist;
          var camTargetZ = raptor.z + Math.cos(raptor.yaw) * camDist;
          camera.position.x += (camTargetX - camera.position.x) * 0.18;
          camera.position.y += (camTargetY - camera.position.y) * 0.18;
          camera.position.z += (camTargetZ - camera.position.z) * 0.18;
          camera.lookAt(raptor.x, raptor.y + 0.3, raptor.z);

          // ── Prey AI ──
          var detectionR = 25 + (raptor.isOwl ? -10 : 0); // owls are silent, harder to detect
          for (var pi3 = 0; pi3 < preyMeshes.length; pi3++) {
            var pm2 = preyMeshes[pi3];
            var pdx = pm2.mesh.position.x - raptor.x;
            var pdz = pm2.mesh.position.z - raptor.z;
            var pd2 = Math.sqrt(pdx * pdx + pdz * pdz);
            if (pd2 < detectionR && pm2.data.behavior === 'flee-on-sight') {
              pm2.alerted = true;
              pm2.fleeBoost = 2.0;
            }
            if (pm2.alerted) {
              // Flee away from raptor
              var fleeAngle = Math.atan2(pdz, pdx);
              pm2.vx = Math.cos(fleeAngle) * pm2.data.speedMps * pm2.fleeBoost * 0.6;
              pm2.vz = Math.sin(fleeAngle) * pm2.data.speedMps * pm2.fleeBoost * 0.6;
              pm2.fleeBoost = Math.max(1, pm2.fleeBoost - 0.5 * dt);
              if (pd2 > 80) { pm2.alerted = false; pm2.fleeBoost = 1; }
            } else if (pm2.data.behavior === 'wander') {
              if (Math.random() < 0.02) {
                pm2.vx = (Math.random() - 0.5) * pm2.data.speedMps;
                pm2.vz = (Math.random() - 0.5) * pm2.data.speedMps;
              }
            }
            pm2.mesh.position.x += pm2.vx * dt;
            pm2.mesh.position.z += pm2.vz * dt;
            // Keep on terrain
            if (pm2.data.id !== 'fish') {
              pm2.mesh.position.y = terrainHeightAt(pm2.mesh.position.x, pm2.mesh.position.z) + pm2.data.sizeM * 0.6;
            }
            // Despawn ancient prey
            if (now - pm2.spawnedAt > 60000) {
              scene.remove(pm2.mesh); pm2.mesh.geometry.dispose(); pm2.mesh.material.dispose();
              preyMeshes.splice(pi3, 1); pi3--;
            }
          }
          // Maintain spawn count
          if (preyMeshes.length < 10 && now - lastSpawn > 2500) {
            lastSpawn = now;
            var fresh = spawnPrey();
            if (fresh) preyMeshes.push(fresh);
          }

          // ── HUD ──
          var mph = (raptor.speed * 2.237).toFixed(0);
          var alt = (raptor.y - groundY).toFixed(0);
          var stateLabel = diveKey ? 'STOOP' : pullUpKey ? 'PULL UP' : 'GLIDE';
          var stateColor = diveKey ? '#fca5a5' : pullUpKey ? '#67e8f9' : '#fbbf24';
          hud.innerHTML =
            '<div style="font-weight:bold;border-bottom:1px solid rgba(180,140,40,0.4);padding-bottom:4px;margin-bottom:4px">' + species.emoji + ' ' + species.name + '</div>' +
            'AIRSPEED &nbsp;<span style="color:#fff">' + mph + ' mph</span><br/>' +
            'ALTITUDE &nbsp;<span style="color:#fff">' + alt + ' m</span><br/>' +
            'STATE &nbsp;&nbsp;&nbsp;<span style="color:' + stateColor + ';font-weight:bold">' + stateLabel + '</span><br/>' +
            'PEAK &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#fff">' + (runMaxSpeed * 2.237).toFixed(0) + ' mph</span>';
          status.innerHTML =
            '<div style="font-weight:bold;border-bottom:1px solid rgba(16,185,129,0.4);padding-bottom:4px;margin-bottom:4px">RUN</div>' +
            'CATCHES &nbsp;<span style="color:#fff;font-weight:bold">' + runCatches + '</span><br/>' +
            'TIME &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#fff">' + ((now - runStart) / 1000).toFixed(0) + 's</span><br/>' +
            'PREY &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#fff">' + preyMeshes.length + '</span>';

          renderer.render(scene, camera);
        }
        loop();

        // ─── Cleanup hook ───
        canvasEl._rhCleanup = function() {
          cancelAnimationFrame(animId);
          canvasEl.removeEventListener('keydown', onKeyDown);
          canvasEl.removeEventListener('keyup', onKeyUp);
          if (hud.parentElement) hud.parentElement.removeChild(hud);
          if (crossHair.parentElement) crossHair.parentElement.removeChild(crossHair);
          if (status.parentElement) status.parentElement.removeChild(status);
          // Dispose meshes
          scene.traverse(function(obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
              else obj.material.dispose();
            }
          });
          renderer.dispose();
        };

        // Handle resize
        var onResize = function() {
          var nw = canvasEl.clientWidth, nh = canvasEl.clientHeight;
          if (nw && nh) { renderer.setSize(nw, nh, false); camera.aspect = nw / nh; camera.updateProjectionMatrix(); }
        };
        window.addEventListener('resize', onResize);
      }

      // ────────────────────────────────────────────────────────
      // RENDER: TALONS
      // ────────────────────────────────────────────────────────
      function renderTalons() {
        var maxPsi = 1500;
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-red-200 mb-2' }, TALON_FACTS.header),
            h('div', { className: 'text-sm text-red-100/90 leading-relaxed' }, TALON_FACTS.overview)
          ),
          // PSI comparison chart
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-2' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '🔬 Grip Force Comparison (PSI)'),
            TALON_FACTS.psiComparison.map(function(item, i) {
              var pct = (item.psi / maxPsi) * 100;
              var colorMap = { slate: 'bg-slate-500', amber: 'bg-amber-500', orange: 'bg-orange-500', red: 'bg-red-600' };
              var barColor = colorMap[item.color] || 'bg-amber-500';
              return h('div', { key: i, className: 'flex items-center gap-3' },
                h('div', { className: 'text-xs text-slate-300 w-48 flex-shrink-0' }, item.name),
                h('div', { className: 'flex-1 bg-slate-800/60 rounded h-5 relative overflow-hidden' },
                  h('div', {
                    className: barColor + ' h-full rounded transition-all',
                    style: { width: pct + '%' },
                    role: 'img',
                    'aria-label': item.name + ' ' + item.psi + ' PSI'
                  })
                ),
                h('div', { className: 'text-xs font-mono text-amber-300 w-20 text-right' }, item.psi + ' psi')
              );
            })
          ),
          // Key concepts
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            TALON_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-amber-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: VISION
      // ────────────────────────────────────────────────────────
      function renderVision() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-indigo-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-indigo-200 mb-2' }, VISION_FACTS.header),
            h('div', { className: 'text-sm text-indigo-100/90 leading-relaxed' }, VISION_FACTS.overview)
          ),
          // Acuity comparison
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '👁️ Visual Acuity vs Human Baseline'),
            VISION_FACTS.speciesComparison.map(function(item, i) {
              var pct = (item.acuity / 6.0) * 100;
              var colorMap = { slate: 'bg-slate-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500', orange: 'bg-orange-500', red: 'bg-red-600' };
              var barColor = colorMap[item.color] || 'bg-amber-500';
              return h('div', { key: i, className: 'flex items-center gap-3 mb-2' },
                h('div', { className: 'text-xs text-slate-300 w-44 flex-shrink-0' }, item.name),
                h('div', { className: 'flex-1 bg-slate-800/60 rounded h-5 relative overflow-hidden' },
                  h('div', { className: barColor + ' h-full rounded', style: { width: pct + '%' } })
                ),
                h('div', { className: 'text-xs font-mono text-amber-300 w-32 text-right' }, item.acuity + '× · ' + item.fovea + ' fovea · ' + item.fieldDeg + '°')
              );
            })
          ),
          // Key points
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            VISION_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-indigo-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          ),
          // UV vision callout
          h('div', { className: 'bg-violet-900/30 border border-violet-700/40 rounded-xl p-4' },
            h('div', { className: 'flex items-start gap-3' },
              h('div', { className: 'text-3xl' }, '🦅'),
              h('div', null,
                h('div', { className: 'text-sm font-bold text-violet-300 mb-1' }, 'Kestrels see vole urine trails — in UV light'),
                h('div', { className: 'text-xs text-violet-100/90 leading-relaxed' },
                  'American kestrels (Falco sparverius) can see ultraviolet light. Vole urine + dung trails reflect UV strongly. To a kestrel scanning a meadow, the rodents\' travel routes look like glowing highways painted across the grass. The bird perches near the brightest "trail" and ambushes — no wonder kestrels hunt successfully from telephone wires year-round. Discovered by Viitala, Korpimäki, Palokangas, Koivula (1995) Nature 373:425-427.'
                )
              )
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: FLIGHT
      // ────────────────────────────────────────────────────────
      function renderFlight() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-sky-900/40 border border-cyan-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-cyan-200 mb-2' }, FLIGHT_FACTS.header),
            h('div', { className: 'text-sm text-cyan-100/90 leading-relaxed' }, FLIGHT_FACTS.overview)
          ),
          // Wing loading vs AR scatter
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '✈ Wing Loading × Aspect Ratio (species map)'),
            h('div', { className: 'text-xs text-slate-400 mb-3' }, 'X: wing loading (kg/m², high = fast/heavy). Y: aspect ratio (high = soaring efficient, low = forest agile).'),
            h('div', { className: 'relative bg-slate-950/60 rounded-lg border border-slate-700/40', style: { height: '320px' } },
              // Axes
              h('div', { className: 'absolute bottom-0 left-0 right-0 border-t border-slate-700/40' }),
              h('div', { className: 'absolute top-0 bottom-0 left-0 border-r border-slate-700/40' }),
              h('div', { className: 'absolute bottom-1 left-2 text-[10px] text-slate-500' }, 'wing loading (kg/m²) →'),
              h('div', { className: 'absolute top-2 left-2 text-[10px] text-slate-500', style: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }, 'aspect ratio →'),
              // Plot SPECIES
              SPECIES.map(function(sp2, i) {
                var x = (sp2.wingLoading / 18) * 95 + 2;
                var y = 95 - (sp2.aspectRatio / 12) * 90;
                var col = sp2.isOwl ? '#a5b4fc' :
                          sp2.family === 'Falconidae' ? '#fb923c' :
                          sp2.family === 'Pandionidae' ? '#67e8f9' : '#fde047';
                return h('div', {
                  key: i,
                  className: 'absolute transition-all',
                  style: { left: x + '%', top: y + '%', transform: 'translate(-50%, -50%)' }
                },
                  h('div', { className: 'flex flex-col items-center cursor-help', title: sp2.name + ' (loading ' + sp2.wingLoading + ' / AR ' + sp2.aspectRatio + ')' },
                    h('div', { className: 'text-xl', style: { textShadow: '0 0 6px #000' } }, sp2.emoji),
                    h('div', { className: 'text-[9px] font-mono', style: { color: col, textShadow: '0 0 4px #000' } }, sp2.name.split(' ')[0])
                  )
                );
              })
            )
          ),
          // Flight type cards
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            FLIGHT_FACTS.flightTypes.map(function(ft, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-cyan-300 mb-1' }, ft.type),
                h('div', { className: 'text-[10px] text-slate-400 mb-1' }, 'Loading: ' + ft.loading + ' · AR: ' + ft.ar),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, ft.desc)
              );
            })
          ),
          // Key points
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            FLIGHT_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-amber-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: STOOP CALCULATOR
      // ────────────────────────────────────────────────────────
      function renderStoop() {
        var v = stoopSimVars;
        var rho = 1.225; // sea level air density
        var vTerminal = Math.sqrt((2 * v.mass * 9.81) / (rho * v.area * v.cd));
        var vTerminalMph = vTerminal * 2.237;
        // Fall time to terminal: approximate t = v_t / g
        var tToTerminal = vTerminal / 9.81;
        // KE at terminal
        var ke = 0.5 * v.mass * vTerminal * vTerminal;
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-orange-200 mb-2' }, STOOP_FACTS.header),
            h('div', { className: 'text-sm text-orange-100/90 leading-relaxed' }, STOOP_FACTS.overview)
          ),
          // Formula card
          h('div', { className: 'bg-slate-900/60 border border-slate-700/50 rounded-xl p-4' },
            h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Terminal velocity formula'),
            h('div', { className: 'text-base font-mono text-amber-300 my-1' }, STOOP_FACTS.formula),
            h('div', { className: 'text-[10px] text-slate-400' }, STOOP_FACTS.formulaVars)
          ),
          // Interactive sliders
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3' },
            h('div', { className: 'text-sm font-bold text-orange-300' }, '🧮 Interactive Stoop Calculator'),
            // Mass slider
            h('div', null,
              h('label', { className: 'text-xs text-slate-300 flex items-center justify-between' },
                h('span', null, 'Mass (kg)'),
                h('span', { className: 'font-mono text-amber-300' }, v.mass.toFixed(2))
              ),
              h('input', {
                type: 'range', min: 0.1, max: 8, step: 0.05, value: v.mass,
                onInput: function(e) { setRH({ stoopSimVars: Object.assign({}, v, { mass: parseFloat(e.target.value) }) }); },
                className: 'w-full',
                'aria-label': 'Mass in kilograms'
              }),
              h('div', { className: 'text-[10px] text-slate-500' }, 'Peregrine ≈ 0.95 kg · golden ≈ 4.2 kg · harpy ≈ 7.5 kg')
            ),
            // Cd slider
            h('div', null,
              h('label', { className: 'text-xs text-slate-300 flex items-center justify-between' },
                h('span', null, 'Drag coefficient (Cd)'),
                h('span', { className: 'font-mono text-amber-300' }, v.cd.toFixed(2))
              ),
              h('input', {
                type: 'range', min: 0.05, max: 0.8, step: 0.01, value: v.cd,
                onInput: function(e) { setRH({ stoopSimVars: Object.assign({}, v, { cd: parseFloat(e.target.value) }) }); },
                className: 'w-full',
                'aria-label': 'Drag coefficient'
              }),
              h('div', { className: 'text-[10px] text-slate-500' }, 'Teardrop ≈ 0.04 · sphere ≈ 0.47 · falcon stoop tuck ≈ 0.18 · human freefall ≈ 0.7')
            ),
            // Area slider
            h('div', null,
              h('label', { className: 'text-xs text-slate-300 flex items-center justify-between' },
                h('span', null, 'Frontal area (m²)'),
                h('span', { className: 'font-mono text-amber-300' }, v.area.toFixed(3))
              ),
              h('input', {
                type: 'range', min: 0.005, max: 0.15, step: 0.001, value: v.area,
                onInput: function(e) { setRH({ stoopSimVars: Object.assign({}, v, { area: parseFloat(e.target.value) }) }); },
                className: 'w-full',
                'aria-label': 'Frontal cross-section area in square meters'
              }),
              h('div', { className: 'text-[10px] text-slate-500' }, 'Peregrine tucked ≈ 0.018 m² · golden eagle tucked ≈ 0.05 m²')
            ),
            h('button', {
              onClick: function() {
                // Reset to selected species' true values
                setRH({ stoopSimVars: { mass: sp.massKg, cd: 0.18, area: sp.wingAreaSqM * 0.06, altitudeM: 600 } });
              },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-amber-300 hover:bg-slate-600',
              'aria-label': 'Load active species presets'
            }, '↺ Load ' + sp.name + ' presets')
          ),
          // Results
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
            h('div', { className: 'bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-700/40 rounded-xl p-4 text-center' },
              h('div', { className: 'text-xs text-red-200' }, 'Terminal Velocity'),
              h('div', { className: 'text-3xl font-bold text-amber-300 my-1' }, vTerminalMph.toFixed(0)),
              h('div', { className: 'text-xs text-slate-400' }, 'mph (' + vTerminal.toFixed(0) + ' m/s)')
            ),
            h('div', { className: 'bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border border-orange-700/40 rounded-xl p-4 text-center' },
              h('div', { className: 'text-xs text-orange-200' }, 'Time to ~Terminal'),
              h('div', { className: 'text-3xl font-bold text-amber-300 my-1' }, tToTerminal.toFixed(1)),
              h('div', { className: 'text-xs text-slate-400' }, 'seconds (v_t / g)')
            ),
            h('div', { className: 'bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border border-amber-700/40 rounded-xl p-4 text-center' },
              h('div', { className: 'text-xs text-yellow-200' }, 'Kinetic Energy'),
              h('div', { className: 'text-3xl font-bold text-amber-300 my-1' }, ke.toFixed(0)),
              h('div', { className: 'text-xs text-slate-400' }, 'joules at impact')
            )
          ),
          h('div', { className: 'bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-300' },
            h('div', { className: 'font-bold text-amber-300 mb-2' }, '💡 For reference'),
            h('ul', { className: 'space-y-1 list-disc list-inside' },
              h('li', null, 'A .22 caliber bullet at the muzzle: ~150 J of KE'),
              h('li', null, 'A baseball pitched at 95 mph: ~120 J'),
              h('li', null, 'A peregrine at terminal velocity: ~5,000 J — ', h('span', { className: 'text-red-300' }, 'pistol-bullet class')),
              h('li', null, 'A harpy eagle in dive: ~10,000+ J')
            )
          ),
          // Key points
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            STOOP_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-orange-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: SILENT FLIGHT
      // ────────────────────────────────────────────────────────
      function renderSilent() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-violet-200 mb-2' }, SILENT_FACTS.header),
            h('div', { className: 'text-sm text-violet-100/90 leading-relaxed' }, SILENT_FACTS.overview)
          ),
          // Diagram (text-based "anatomy of an owl feather")
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-5' },
            h('div', { className: 'text-sm font-bold text-violet-300 mb-3' }, '🪶 Anatomy of an Owl Primary Feather (3-mechanism silencer)'),
            h('div', { className: 'space-y-3 text-xs' },
              h('div', { className: 'flex items-start gap-3 p-3 bg-violet-900/20 rounded border border-violet-700/30' },
                h('div', { className: 'text-2xl flex-shrink-0' }, '〰️'),
                h('div', null,
                  h('div', { className: 'font-bold text-violet-300' }, '1. Comb-edged leading primaries'),
                  h('div', { className: 'text-slate-300 mt-0.5' }, 'Tiny serrated teeth (0.5-1 mm) on the front edge of each primary feather break the laminar-to-turbulent flow transition. Result: high-frequency noise scattering above prey hearing range.')
                )
              ),
              h('div', { className: 'flex items-start gap-3 p-3 bg-indigo-900/20 rounded border border-indigo-700/30' },
                h('div', { className: 'text-2xl flex-shrink-0' }, '⌒'),
                h('div', null,
                  h('div', { className: 'font-bold text-indigo-300' }, '2. Fringed trailing edge'),
                  h('div', { className: 'text-slate-300 mt-0.5' }, 'Soft 2-3 mm fringe on the back edge absorbs the trailing-edge turbulent vortex sound. This is the largest contributor — most aerodynamic noise comes from the trailing edge.')
                )
              ),
              h('div', { className: 'flex items-start gap-3 p-3 bg-purple-900/20 rounded border border-purple-700/30' },
                h('div', { className: 'text-2xl flex-shrink-0' }, '🧶'),
                h('div', null,
                  h('div', { className: 'font-bold text-purple-300' }, '3. Velvety dorsal surface'),
                  h('div', { className: 'text-slate-300 mt-0.5' }, 'Tiny velvet-like pile (~0.5 mm) on the upper feather surface dampens feather-on-feather friction noise during wing folding/unfolding.')
                )
              )
            )
          ),
          // Frequency callout
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-emerald-300 mb-2' }, '🔊 Frequency shift — the actual mechanism'),
            h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed' },
              'Owl wing noise peaks at ~16 kHz. Hawk wing noise peaks at ~2-4 kHz. The owl achieves silence not by reducing total noise — that\'s a small effect — but by shifting the dominant frequency range out of where prey ears are most sensitive. A mouse hears 2-4 kHz acutely (rustling, footsteps) but is much less sensitive at 16 kHz.'
            )
          ),
          // Key points
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            SILENT_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-violet-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: SENSES (Day vs Night Eyes)
      // ────────────────────────────────────────────────────────
      function renderSenses() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-slate-900/50 to-indigo-900/40 border border-indigo-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-indigo-200 mb-2' }, SENSES_FACTS.header),
            h('div', { className: 'text-sm text-indigo-100/90 leading-relaxed' }, SENSES_FACTS.overview)
          ),
          // Side-by-side comparison
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-xl p-4' },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('div', { className: 'text-3xl' }, '☀️'),
                h('div', { className: 'text-base font-bold text-amber-200' }, 'Diurnal Eye (eagles, hawks, falcons)')
              ),
              h('ul', { className: 'space-y-2 text-xs text-amber-100/90' },
                h('li', null, h('span', { className: 'font-bold' }, '~80% cones, 20% rods')),
                h('li', null, h('span', { className: 'font-bold' }, 'Two foveas per eye '), '— central + temporal'),
                h('li', null, h('span', { className: 'font-bold' }, 'Acuity:'), ' 4-8× human'),
                h('li', null, h('span', { className: 'font-bold' }, 'Spherical eye shape')),
                h('li', null, h('span', { className: 'font-bold' }, 'UV in falconids '), '— vole urine trails'),
                h('li', null, h('span', { className: 'font-bold' }, 'Visual field:'), ' 180-220°'),
                h('li', null, h('span', { className: 'font-bold' }, 'Color:'), ' full tetrachromatic'),
                h('li', null, h('span', { className: 'font-bold' }, 'Low-light:'), ' poor (worse than humans at twilight)')
              )
            ),
            h('div', { className: 'bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-700/40 rounded-xl p-4' },
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('div', { className: 'text-3xl' }, '🌙'),
                h('div', { className: 'text-base font-bold text-indigo-200' }, 'Nocturnal Eye (owls)')
              ),
              h('ul', { className: 'space-y-2 text-xs text-indigo-100/90' },
                h('li', null, h('span', { className: 'font-bold' }, '~5% cones, 95% rods')),
                h('li', null, h('span', { className: 'font-bold' }, 'One fovea per eye '), '— central'),
                h('li', null, h('span', { className: 'font-bold' }, 'Acuity:'), ' ~2× human (moderate)'),
                h('li', null, h('span', { className: 'font-bold' }, 'Tubular eye shape '), '(cannot rotate)'),
                h('li', null, h('span', { className: 'font-bold' }, 'No UV; '), 'near-monochromatic'),
                h('li', null, h('span', { className: 'font-bold' }, 'Visual field:'), ' 110° (much narrower)'),
                h('li', null, h('span', { className: 'font-bold' }, 'Low-light:'), ' ~100× more sensitive than humans'),
                h('li', null, h('span', { className: 'font-bold' }, 'Eye = ~5% body mass'))
              )
            )
          ),
          // Owl ear asymmetry callout
          h('div', { className: 'bg-slate-900/60 border border-slate-700/50 rounded-xl p-5' },
            h('div', { className: 'flex items-start gap-3' },
              h('div', { className: 'text-4xl' }, '👂'),
              h('div', null,
                h('div', { className: 'text-base font-bold text-cyan-300 mb-2' }, 'Owl ear asymmetry: 3D sound localization'),
                h('div', { className: 'text-sm text-slate-200 leading-relaxed' },
                  'Owls have ',
                  h('span', { className: 'font-bold text-cyan-300' }, 'asymmetrically placed ear openings'),
                  ' — the left opening sits higher on the skull than the right by ~1 cm in barn owls. Sound arriving from above hits the left ear first by ~30 microseconds; sound from below hits the right ear first. The brain reads the time difference as ',
                  h('span', { className: 'font-bold text-cyan-300' }, 'elevation'),
                  '. Combined with the standard horizontal timing difference (which encodes azimuth), the owl gets full 3D acoustic localization. Roger Payne (1962) showed barn owls strike mice in total darkness using only sound, with median accuracy of ~1°.'
                )
              )
            )
          ),
          // Key points
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            SENSES_FACTS.keyPoints.map(function(kp, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'text-sm font-bold text-indigo-300 mb-1' }, kp.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, kp.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: CONSERVATION
      // ────────────────────────────────────────────────────────
      function renderConservation() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-emerald-200 mb-2' }, '🌍 Conservation: From DDT to today'),
            h('div', { className: 'text-sm text-emerald-100/90 leading-relaxed' }, CONSERVATION.overview)
          ),
          // Success stories
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-emerald-300 mb-3' }, '✅ Recovery Success Stories'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              CONSERVATION.successStories.map(function(s, i) {
                return h('div', { key: i, className: 'bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/30' },
                  h('div', { className: 'font-bold text-emerald-300 text-sm mb-1' }, s.name),
                  h('div', { className: 'text-xs text-slate-300' },
                    h('div', null, h('span', { className: 'text-slate-500' }, 'From: '), s.from),
                    h('div', null, h('span', { className: 'text-slate-500' }, 'To: '), s.to),
                    h('div', { className: 'mt-1 italic text-emerald-100/80' }, s.mechanism)
                  )
                );
              })
            )
          ),
          // Crises
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '⚠ Active Threats + Crises'),
            CONSERVATION.crises.map(function(c, i) {
              var resolved = c.status.indexOf('RESOLVED') === 0;
              var critical = c.status.indexOf('CRITICAL') === 0;
              var improving = c.status.indexOf('IMPROVING') === 0;
              var statusColor = resolved ? 'bg-emerald-700/40 text-emerald-300' :
                                critical ? 'bg-red-700/40 text-red-300' :
                                improving ? 'bg-cyan-700/40 text-cyan-300' : 'bg-amber-700/40 text-amber-300';
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-start justify-between gap-3 mb-2' },
                  h('div', { className: 'text-sm font-bold text-amber-200 flex-1' }, c.title),
                  h('div', { className: 'text-[10px] px-2 py-0.5 rounded font-mono ' + statusColor }, c.status)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.text)
              );
            })
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: FIELD ID
      // ────────────────────────────────────────────────────────
      function renderFieldId() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border border-yellow-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-yellow-200 mb-2' }, '🔍 Field Identification: Wing Shape + Flight Pattern'),
            h('div', { className: 'text-sm text-yellow-100/90 leading-relaxed' }, 'You almost never get a clear close-up of a raptor in the wild. Field ID works on ', h('span', { className: 'font-bold' }, 'gestalt — silhouette + flight pattern + behavior'), '. Color comes last. Learn the 8 silhouette groups below and you can ID 90% of North American raptors at a quarter mile.')
          ),
          // Silhouette cards
          h('div', { className: 'space-y-3' },
            FIELD_ID.silhouettes.map(function(s, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'text-sm font-bold text-yellow-300 mb-2' }, s.label),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-xs' },
                  h('div', null, h('span', { className: 'text-slate-500' }, 'Wing shape: '), h('span', { className: 'text-slate-200' }, s.wingShape)),
                  h('div', null, h('span', { className: 'text-slate-500' }, 'Tail: '), h('span', { className: 'text-slate-200' }, s.tailShape)),
                  h('div', { className: 'md:col-span-2' }, h('span', { className: 'text-slate-500' }, 'Flight pattern: '), h('span', { className: 'text-slate-200' }, s.flightPattern)),
                  h('div', { className: 'md:col-span-2' }, h('span', { className: 'text-slate-500' }, 'Species: '), h('span', { className: 'text-amber-300' }, s.species))
                ),
                h('div', { className: 'mt-2 p-2 bg-amber-900/20 rounded text-xs italic text-amber-200' }, '👁 Gestalt: ' + s.gestalt)
              );
            })
          ),
          // Behavior clues
          h('div', { className: 'bg-slate-900/50 border border-slate-700/50 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-yellow-300 mb-3' }, '🦅 Behavior Clues That Narrow ID Instantly'),
            h('div', { className: 'space-y-2' },
              FIELD_ID.behaviorClues.map(function(c, i) {
                return h('div', { key: i, className: 'flex items-start gap-3 p-2 bg-slate-800/40 rounded' },
                  h('div', { className: 'text-xs text-slate-400 flex-1 italic' }, '"' + c.clue + '"'),
                  h('div', { className: 'text-xs font-bold text-amber-300 flex-1' }, '→ ' + c.meaning)
                );
              })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: MIGRATION
      // ────────────────────────────────────────────────────────
      function renderMigration() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-teal-900/40 border border-cyan-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-cyan-200 mb-2' }, '🧭 Migration: 5 Million Birds, 5 Major Flyways'),
            h('div', { className: 'text-sm text-cyan-100/90 leading-relaxed' }, MIGRATION.overview)
          ),

          // Flyways
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🌎 The 5 Major Flyways'),
            MIGRATION.flyways.map(function(f, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('div', { className: 'text-2xl' }, f.emoji),
                  h('div', { className: 'text-base font-bold text-cyan-300' }, f.name)
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-xs' },
                  h('div', null, h('span', { className: 'text-slate-500' }, 'Species: '), h('span', { className: 'text-slate-200' }, f.species)),
                  h('div', null, h('span', { className: 'text-slate-500' }, 'Peak: '), h('span', { className: 'text-amber-300' }, f.peakDates)),
                  h('div', { className: 'md:col-span-2' }, h('span', { className: 'text-slate-500' }, 'Path: '), h('span', { className: 'text-slate-200' }, f.path)),
                  h('div', { className: 'md:col-span-2' }, h('span', { className: 'text-slate-500' }, 'Bottleneck: '), h('span', { className: 'text-amber-300' }, f.bottleneck))
                ),
                h('div', { className: 'mt-2 text-xs italic text-cyan-100/80' }, f.notes)
              );
            })
          ),

          // Famous watch sites
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🗺 Famous Hawk-Watch Sites'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              MIGRATION.watchSites.map(function(w, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                  h('div', { className: 'text-sm font-bold text-cyan-300 mb-1' }, w.name),
                  h('div', { className: 'text-[10px] text-slate-500 mb-2 font-mono' }, 'Est. ' + w.founded + ' · ' + w.latLon + ' · ' + w.annualCount),
                  h('div', { className: 'text-xs text-slate-300 mb-2' }, h('span', { className: 'text-slate-500' }, 'Founder: '), w.founder),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, w.highlight)
                );
              })
            )
          ),

          // Kettle physics
          h('div', { className: 'bg-amber-900/20 border border-amber-700/40 rounded-xl p-5' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '🌀 ' + MIGRATION.kettlePhysics.title),
            h('div', { className: 'text-sm text-amber-100/90 leading-relaxed mb-3' }, MIGRATION.kettlePhysics.explanation),
            h('div', { className: 'bg-slate-900/50 rounded-lg p-3 font-mono text-xs text-amber-200' },
              MIGRATION.kettlePhysics.diagram.map(function(line, i) {
                return h('div', { key: i, className: 'py-0.5' }, line);
              })
            )
          ),

          // Irruptions
          h('div', { className: 'bg-indigo-900/20 border border-indigo-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-indigo-300 mb-2' }, '❄ ' + MIGRATION.irruptions.title),
            h('div', { className: 'text-sm text-indigo-100/90 leading-relaxed mb-3' }, MIGRATION.irruptions.explanation),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-xs' },
              MIGRATION.irruptions.species.map(function(s, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 rounded p-2.5 border border-slate-700/40' },
                  h('div', { className: 'font-bold text-indigo-300 mb-0.5' }, s.name),
                  h('div', { className: 'text-slate-400 mb-1 text-[10px]' }, s.cycle),
                  h('div', { className: 'text-slate-200' }, s.range)
                );
              })
            )
          ),

          // Banding + tracking
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '📡 ' + MIGRATION.banding.title),
            h('div', { className: 'text-sm text-slate-300 mb-3' }, MIGRATION.banding.explanation),
            h('div', { className: 'space-y-2' },
              MIGRATION.banding.methods.map(function(m, i) {
                return h('div', { key: i, className: 'flex items-start gap-3 bg-slate-800/40 rounded p-2.5' },
                  h('div', { className: 'flex-shrink-0 text-xs font-mono text-amber-300 w-24' }, m.tech),
                  h('div', { className: 'flex-shrink-0 text-[10px] text-slate-500 w-16' }, m.since),
                  h('div', { className: 'text-xs text-slate-200 flex-1' }, m.what)
                );
              })
            )
          ),

          // Climate impact
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-emerald-300 mb-2' }, '🌡 ' + MIGRATION.climateImpact.title),
            h('ul', { className: 'space-y-1 text-xs text-emerald-100/90 list-disc list-inside' },
              MIGRATION.climateImpact.points.map(function(p, i) { return h('li', { key: i }, p); })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: FIELD ID QUIZ
      // ────────────────────────────────────────────────────────
      function renderQuiz() {
        var quizState = rh.quiz || { ix: 0, score: 0, selected: -1, answered: false, started: false, difficulty: 'all', bestScore: 0, completedRuns: 0 };
        function setQuiz(patch) {
          setRH(function(prev) {
            var cur = prev.quiz || { ix: 0, score: 0, selected: -1, answered: false, started: false, difficulty: 'all', bestScore: 0, completedRuns: 0 };
            return Object.assign({}, prev, { quiz: Object.assign({}, cur, patch) });
          });
        }
        // Build active question list per difficulty
        var pool = QUIZ_QUESTIONS.filter(function(q) {
          return quizState.difficulty === 'all' || q.difficulty === quizState.difficulty;
        });
        var total = pool.length;
        var question = pool[quizState.ix] || pool[0];

        // Start screen
        if (!quizState.started) {
          return h('div', { className: 'space-y-4' },
            h('div', { className: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-700/40 rounded-xl p-5' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-5xl' }, '🎓'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-xl font-bold text-amber-200' }, 'Field ID Quiz'),
                  h('div', { className: 'text-sm text-amber-100/80 mt-1' }, 'Active retrieval practice across silhouettes, behavior, talon mechanics, vision, flight physics, and conservation. Each question has a detailed explanation — wrong answers are the best teachers.'),
                  h('div', { className: 'text-xs text-amber-300/70 mt-2 italic' }, '18 questions · 3 difficulty bands · explanations included')
                )
              )
            ),
            // Difficulty selector
            h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, 'Choose difficulty'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                [
                  { id: 'easy', label: 'Easy', desc: '5 silhouette + obvious questions', count: QUIZ_QUESTIONS.filter(function(q) { return q.difficulty === 'easy'; }).length },
                  { id: 'medium', label: 'Medium', desc: '7 deeper combos', count: QUIZ_QUESTIONS.filter(function(q) { return q.difficulty === 'medium'; }).length },
                  { id: 'hard', label: 'Hard', desc: '6 deep science + nuance', count: QUIZ_QUESTIONS.filter(function(q) { return q.difficulty === 'hard'; }).length },
                  { id: 'all', label: 'All 18', desc: 'Full quiz', count: QUIZ_QUESTIONS.length }
                ].map(function(d) {
                  var active = quizState.difficulty === d.id;
                  return h('button', {
                    key: d.id,
                    onClick: function() { setQuiz({ difficulty: d.id }); },
                    className: 'p-3 rounded-lg border transition-all text-left ' + (active
                      ? 'bg-amber-700/50 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-amber-600/40'),
                    'aria-label': d.label + ' · ' + d.count + ' questions'
                  },
                    h('div', { className: 'text-sm font-bold text-amber-200' }, d.label + ' (' + d.count + ')'),
                    h('div', { className: 'text-[10px] text-slate-300 mt-1' }, d.desc)
                  );
                })
              )
            ),
            // Best score
            (quizState.completedRuns > 0) && h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 text-sm text-emerald-200' },
              '🏆 Best score: ', h('span', { className: 'font-bold text-emerald-300' }, quizState.bestScore + '/' + total),
              ' · ', quizState.completedRuns + ' completed runs'
            ),
            // Start button
            h('button', {
              onClick: function() { setQuiz({ started: true, ix: 0, score: 0, selected: -1, answered: false }); rhAnnounce('Quiz started · ' + total + ' questions'); },
              className: 'w-full px-5 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition-all',
              'aria-label': 'Start quiz with ' + total + ' questions'
            }, '▶ Start ' + total + '-question quiz')
          );
        }

        // End screen
        if (quizState.ix >= total) {
          var pct = Math.round((quizState.score / total) * 100);
          var verdict = pct >= 90 ? { txt: 'Master raptor scientist', color: 'emerald', emoji: '🦅' } :
                        pct >= 75 ? { txt: 'Strong field ornithologist', color: 'amber', emoji: '🏆' } :
                        pct >= 50 ? { txt: 'Growing knowledge', color: 'cyan', emoji: '📈' } :
                                    { txt: 'Worth a second pass', color: 'indigo', emoji: '🔁' };
          return h('div', { className: 'space-y-4' },
            h('div', { className: 'bg-gradient-to-br from-' + verdict.color + '-900/50 to-' + verdict.color + '-800/30 border border-' + verdict.color + '-700/50 rounded-xl p-6 text-center' },
              h('div', { className: 'text-6xl mb-3' }, verdict.emoji),
              h('div', { className: 'text-2xl font-bold text-' + verdict.color + '-200 mb-1' }, quizState.score + ' / ' + total + ' correct'),
              h('div', { className: 'text-3xl font-bold text-' + verdict.color + '-300 mb-2' }, pct + '%'),
              h('div', { className: 'text-base text-' + verdict.color + '-100/90 italic' }, verdict.txt)
            ),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h('button', {
                onClick: function() {
                  var newBest = Math.max(quizState.bestScore, quizState.score);
                  var newRuns = quizState.completedRuns + 1;
                  setQuiz({ started: false, ix: 0, score: 0, selected: -1, answered: false, bestScore: newBest, completedRuns: newRuns });
                },
                className: 'px-4 py-3 rounded-lg text-sm font-bold bg-slate-700 text-amber-300 hover:bg-slate-600 transition-all',
                'aria-label': 'Back to quiz menu'
              }, '↶ Back to Quiz Menu'),
              h('button', {
                onClick: function() {
                  var newBest = Math.max(quizState.bestScore, quizState.score);
                  var newRuns = quizState.completedRuns + 1;
                  setQuiz({ started: true, ix: 0, score: 0, selected: -1, answered: false, bestScore: newBest, completedRuns: newRuns });
                },
                className: 'px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 transition-all',
                'aria-label': 'Try again'
              }, '🔁 Try Again')
            )
          );
        }

        // Question screen
        var isCorrect = quizState.selected === question.correctIdx;
        var diffColor = question.difficulty === 'easy' ? 'emerald' : question.difficulty === 'medium' ? 'amber' : 'red';
        return h('div', { className: 'space-y-4' },
          // Progress
          h('div', { className: 'flex items-center justify-between text-xs' },
            h('div', { className: 'text-slate-300' }, 'Question ' + (quizState.ix + 1) + ' of ' + total),
            h('div', { className: 'flex gap-3' },
              h('div', { className: 'px-2 py-0.5 rounded font-mono text-[10px] bg-' + diffColor + '-900/40 text-' + diffColor + '-300 border border-' + diffColor + '-700/40' }, question.difficulty.toUpperCase()),
              h('div', { className: 'text-amber-300' }, '🏆 Score: ', h('span', { className: 'font-bold' }, quizState.score))
            )
          ),
          // Progress bar
          h('div', { className: 'bg-slate-800 rounded-full h-2 overflow-hidden' },
            h('div', {
              className: 'bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all',
              style: { width: ((quizState.ix / total) * 100) + '%' },
              role: 'progressbar',
              'aria-valuenow': quizState.ix, 'aria-valuemin': 0, 'aria-valuemax': total
            })
          ),
          // Question card
          h('div', { className: 'bg-slate-900/50 border border-amber-700/40 rounded-xl p-5' },
            h('div', { className: 'text-base font-bold text-amber-200 leading-relaxed' }, question.q)
          ),
          // Options
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            question.options.map(function(opt, i) {
              var selected = quizState.selected === i;
              var correctOpt = i === question.correctIdx;
              var showResult = quizState.answered;
              var btnClass = 'p-3 rounded-lg text-left text-sm transition-all border-2 ';
              if (showResult) {
                if (correctOpt) btnClass += 'bg-emerald-900/40 border-emerald-500 text-emerald-100';
                else if (selected) btnClass += 'bg-red-900/40 border-red-500 text-red-100';
                else btnClass += 'bg-slate-800/50 border-slate-700 text-slate-400';
              } else {
                btnClass += selected ? 'bg-amber-900/40 border-amber-400 text-amber-100' : 'bg-slate-800/50 border-slate-700 text-slate-200 hover:border-amber-600/60';
              }
              return h('button', {
                key: i,
                onClick: function() { if (!quizState.answered) setQuiz({ selected: i }); },
                disabled: quizState.answered,
                className: btnClass,
                'aria-label': opt
              },
                h('span', { className: 'font-bold mr-2' }, String.fromCharCode(65 + i) + '.'),
                opt,
                showResult && correctOpt && h('span', { className: 'ml-2' }, '✓'),
                showResult && selected && !correctOpt && h('span', { className: 'ml-2' }, '✗')
              );
            })
          ),
          // Action / feedback
          !quizState.answered && h('button', {
            onClick: function() {
              if (quizState.selected < 0) return;
              var nowCorrect = quizState.selected === question.correctIdx;
              setQuiz({ answered: true, score: quizState.score + (nowCorrect ? 1 : 0) });
              rhAnnounce(nowCorrect ? 'Correct' : 'Incorrect. See explanation.');
              if (nowCorrect && ctx.awardXP) ctx.awardXP(question.difficulty === 'hard' ? 5 : question.difficulty === 'medium' ? 3 : 2, 'Raptor Hunt quiz: ' + question.difficulty);
            },
            disabled: quizState.selected < 0,
            className: 'w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ' + (quizState.selected < 0
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700'),
            'aria-label': 'Submit answer'
          }, '✔ Submit Answer'),
          quizState.answered && h('div', { className: 'space-y-3' },
            h('div', { className: 'p-4 rounded-lg ' + (isCorrect ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-red-900/30 border border-red-700/40') },
              h('div', { className: 'flex items-start gap-2 mb-2' },
                h('div', { className: 'text-2xl' }, isCorrect ? '✓' : '✗'),
                h('div', { className: 'font-bold ' + (isCorrect ? 'text-emerald-300' : 'text-red-300') }, isCorrect ? 'Correct! +' + (question.difficulty === 'hard' ? 5 : question.difficulty === 'medium' ? 3 : 2) + ' XP' : 'Not quite — see explanation')
              ),
              h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, question.explanation)
            ),
            h('button', {
              onClick: function() {
                setQuiz({ ix: quizState.ix + 1, selected: -1, answered: false });
              },
              className: 'w-full px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 transition-all',
              'aria-label': quizState.ix + 1 >= total ? 'See final results' : 'Next question'
            }, quizState.ix + 1 >= total ? '🏁 See Results →' : '➡ Next Question')
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: OWL HEARING LAB (interactive Canvas-2D)
      // ────────────────────────────────────────────────────────
      // Replicates Payne 1962 — student "owl" must locate a hidden mouse
      // by sound only. Slider controls ear-asymmetry magnitude; lower
      // asymmetry = larger error radius. Click where you think the mouse is.
      function renderHearing() {
        var hl = rh.hearing || { asymmetry: 1.0, attempts: 0, hits: 0, totalErr: 0, bestErr: null, mouseX: 0.5, mouseY: 0.5, lastErr: null, started: false };
        function setHL(patch) {
          setRH(function(prev) {
            var cur = prev.hearing || { asymmetry: 1.0, attempts: 0, hits: 0, totalErr: 0, bestErr: null, mouseX: 0.5, mouseY: 0.5, lastErr: null, started: false };
            return Object.assign({}, prev, { hearing: Object.assign({}, cur, typeof patch === 'function' ? patch(cur) : patch) });
          });
        }
        function newMouse() {
          var nx = 0.1 + Math.random() * 0.8;
          var ny = 0.15 + Math.random() * 0.7;
          setHL({ mouseX: nx, mouseY: ny, lastErr: null, started: true });
        }
        // Compute "error radius" as fraction of canvas — inverse of asymmetry (1.0 = 5%, 0 = 40%)
        var errRadius = 0.05 + (1 - hl.asymmetry) * 0.35; // fraction of canvas
        var avgErr = hl.attempts > 0 ? (hl.totalErr / hl.attempts) : null;

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-indigo-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-indigo-200 mb-2' }, '🦻 Owl Hearing Lab: Find the Mouse'),
            h('div', { className: 'text-sm text-indigo-100/90 leading-relaxed' },
              'In 1962, Roger Payne placed a barn owl in a totally dark room with a mouse on a leaf-litter floor. The owl could hear the leaves rustle but see nothing. He recorded ~17 silent strikes — every one a kill, accurate to ~1° elevation + azimuth. This works because barn owls have ',
              h('span', { className: 'font-bold text-violet-300' }, 'asymmetric ear openings'),
              ' (left higher, right lower) plus a flat facial disc that acts like a parabolic dish. Below, you are the owl. The mouse is hidden — your ears can detect it within a noisy radius that scales with your ear-asymmetry magnitude.'
            )
          ),

          // Controls
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3' },
            h('div', null,
              h('label', { className: 'text-xs text-indigo-300 flex items-center justify-between mb-1' },
                h('span', { className: 'font-bold' }, 'Ear asymmetry magnitude'),
                h('span', { className: 'font-mono text-amber-300' }, (hl.asymmetry * 100).toFixed(0) + '%')
              ),
              h('input', {
                type: 'range', min: 0, max: 1, step: 0.05, value: hl.asymmetry,
                onInput: function(e) { setHL({ asymmetry: parseFloat(e.target.value) }); },
                className: 'w-full',
                'aria-label': 'Ear asymmetry magnitude'
              }),
              h('div', { className: 'flex justify-between text-[10px] text-slate-500' },
                h('span', null, '0% (symmetric — like a hawk)'),
                h('span', null, '100% (barn-owl-grade)')
              ),
              h('div', { className: 'text-[10px] text-indigo-200/70 mt-1 italic' },
                'Detection radius: ',
                h('span', { className: 'font-mono text-amber-300' }, (errRadius * 100).toFixed(0) + '%'),
                ' of canvas. Real barn owls operate at ~1° error in pitch black — equivalent to the leftmost slider position here.'
              )
            )
          ),

          // Canvas
          h('div', { className: 'bg-slate-900 border border-indigo-700/40 rounded-xl overflow-hidden', style: { aspectRatio: '4 / 3', maxWidth: '720px', margin: '0 auto', position: 'relative' } },
            h('canvas', {
              'data-hearing-canvas': 'true',
              role: 'application',
              'aria-label': 'Owl hearing lab. Click anywhere on the dark canvas where you think the mouse is. Detection radius shows as a ring; click to strike.',
              tabIndex: 0,
              width: 600, height: 450,
              style: { width: '100%', height: '100%', cursor: 'crosshair', display: 'block' },
              ref: function(canvasEl) {
                if (!canvasEl) return;
                var ctx2 = canvasEl.getContext('2d');
                var W = canvasEl.width, H = canvasEl.height;
                // Draw scene
                function draw() {
                  // Dark forest floor background
                  var grad = ctx2.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
                  grad.addColorStop(0, '#1e1b4b');
                  grad.addColorStop(1, '#020617');
                  ctx2.fillStyle = grad;
                  ctx2.fillRect(0, 0, W, H);
                  // Leaf litter speckle
                  for (var i = 0; i < 80; i++) {
                    ctx2.fillStyle = 'rgba(120, 100, 60, 0.18)';
                    ctx2.beginPath();
                    var lx = Math.sin(i * 11.13) * W * 0.45 + W/2;
                    var ly = Math.cos(i * 7.91) * H * 0.45 + H/2;
                    ctx2.arc(lx, ly, 2 + Math.abs(Math.sin(i)) * 3, 0, Math.PI * 2);
                    ctx2.fill();
                  }
                  // If started, draw mouse "sound" zone (faint amber ring proportional to errRadius)
                  if (hl.started) {
                    var mx = hl.mouseX * W, my = hl.mouseY * H;
                    var r = errRadius * Math.min(W, H);
                    // Sound zone (faint)
                    var soundGrad = ctx2.createRadialGradient(mx, my, 0, mx, my, r);
                    soundGrad.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
                    soundGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.08)');
                    soundGrad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
                    ctx2.fillStyle = soundGrad;
                    ctx2.beginPath();
                    ctx2.arc(mx, my, r, 0, Math.PI * 2);
                    ctx2.fill();
                  }
                  // Last error visualization
                  if (hl.lastErr) {
                    var le = hl.lastErr;
                    var actualX = le.actualX * W;
                    var actualY = le.actualY * H;
                    var clickX = le.clickX * W;
                    var clickY = le.clickY * H;
                    // Line from click to actual
                    ctx2.strokeStyle = le.hit ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)';
                    ctx2.lineWidth = 2;
                    ctx2.setLineDash([6, 4]);
                    ctx2.beginPath();
                    ctx2.moveTo(clickX, clickY);
                    ctx2.lineTo(actualX, actualY);
                    ctx2.stroke();
                    ctx2.setLineDash([]);
                    // Actual mouse position (revealed)
                    ctx2.fillStyle = '#fbbf24';
                    ctx2.beginPath();
                    ctx2.arc(actualX, actualY, 8, 0, Math.PI * 2);
                    ctx2.fill();
                    // Tiny mouse glyph (ears)
                    ctx2.beginPath();
                    ctx2.arc(actualX - 4, actualY - 5, 2.5, 0, Math.PI * 2);
                    ctx2.arc(actualX + 4, actualY - 5, 2.5, 0, Math.PI * 2);
                    ctx2.fill();
                    // Click marker
                    ctx2.strokeStyle = le.hit ? '#10b981' : '#ef4444';
                    ctx2.lineWidth = 3;
                    ctx2.beginPath();
                    ctx2.arc(clickX, clickY, 14, 0, Math.PI * 2);
                    ctx2.stroke();
                    // Result text
                    ctx2.fillStyle = le.hit ? '#10b981' : '#ef4444';
                    ctx2.font = 'bold 16px ui-monospace';
                    ctx2.textAlign = 'center';
                    ctx2.fillText(le.hit ? '✓ STRIKE' : '✗ MISS', clickX, clickY - 22);
                  }
                  // Title overlay
                  if (!hl.started) {
                    ctx2.fillStyle = 'rgba(200, 200, 220, 0.85)';
                    ctx2.font = 'bold 18px ui-sans-serif, system-ui';
                    ctx2.textAlign = 'center';
                    ctx2.fillText('Press "🦉 Release Mouse" to begin', W/2, H/2 - 10);
                    ctx2.font = '12px ui-sans-serif';
                    ctx2.fillText('Then click anywhere you think the mouse is', W/2, H/2 + 18);
                  }
                }
                draw();
                // Bind click only once
                if (!canvasEl._hlBound) {
                  canvasEl._hlBound = true;
                  canvasEl.addEventListener('click', function(e) {
                    if (!hl.started) return;
                    var rect = canvasEl.getBoundingClientRect();
                    var cx = (e.clientX - rect.left) / rect.width;
                    var cy = (e.clientY - rect.top) / rect.height;
                    var dx = cx - hl.mouseX, dy = cy - hl.mouseY;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var hit = dist <= errRadius;
                    var newBest = hl.bestErr === null ? dist : Math.min(hl.bestErr, dist);
                    setHL(function(cur) {
                      return {
                        attempts: cur.attempts + 1,
                        hits: cur.hits + (hit ? 1 : 0),
                        totalErr: cur.totalErr + dist,
                        bestErr: newBest,
                        lastErr: { clickX: cx, clickY: cy, actualX: cur.mouseX, actualY: cur.mouseY, hit: hit, dist: dist }
                      };
                    });
                    if (hit) {
                      rhAnnounce('Strike! Within detection radius.');
                      if (ctx.awardXP) ctx.awardXP(3, 'Owl Hearing Lab: strike');
                    } else {
                      rhAnnounce('Miss. Distance from mouse: ' + (dist * 100).toFixed(0) + ' percent of canvas.');
                    }
                  });
                }
              }
            })
          ),

          // Action row
          h('div', { className: 'flex gap-2 flex-wrap justify-center' },
            h('button', {
              onClick: newMouse,
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all',
              'aria-label': 'Release new mouse'
            }, '🦉 Release Mouse'),
            h('button', {
              onClick: function() {
                setHL({ attempts: 0, hits: 0, totalErr: 0, bestErr: null, lastErr: null, started: false });
                rhAnnounce('Stats reset');
              },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-700 text-amber-300 hover:bg-slate-600 transition-all',
              'aria-label': 'Reset stats'
            }, '↺ Reset Stats')
          ),

          // Stats panel
          h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
            h('div', { className: 'bg-emerald-900/30 border border-emerald-700/40 rounded p-3' },
              h('div', { className: 'text-2xl font-bold text-emerald-300' }, hl.attempts > 0 ? Math.round(hl.hits / hl.attempts * 100) + '%' : '—'),
              h('div', { className: 'text-[10px] text-emerald-200 uppercase tracking-wider' }, 'Strike Rate')
            ),
            h('div', { className: 'bg-indigo-900/30 border border-indigo-700/40 rounded p-3' },
              h('div', { className: 'text-2xl font-bold text-indigo-300' }, hl.attempts),
              h('div', { className: 'text-[10px] text-indigo-200 uppercase tracking-wider' }, 'Attempts')
            ),
            h('div', { className: 'bg-amber-900/30 border border-amber-700/40 rounded p-3' },
              h('div', { className: 'text-2xl font-bold text-amber-300' }, hl.bestErr !== null ? (hl.bestErr * 100).toFixed(0) + '%' : '—'),
              h('div', { className: 'text-[10px] text-amber-200 uppercase tracking-wider' }, 'Best Error')
            )
          ),

          // Pedagogy
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 text-sm space-y-3' },
            h('div', { className: 'font-bold text-indigo-300' }, '💡 What you just modeled'),
            h('div', { className: 'text-slate-300 leading-relaxed text-xs' }, 'Slide the asymmetry slider to 100% — your detection radius is tiny + barely larger than a single pixel. Real barn owls can localize sound to ~1° error in pitch dark. Slide to 0% (a hawk\'s ear placement) — the radius balloons to 40% of the canvas. This is why hawks hunt by sight + owls hunt by sound.'),
            h('div', { className: 'text-slate-300 leading-relaxed text-xs' }, 'The mechanism is exactly the diagram in the Day Eye vs Night Eye section: ',
              h('span', { className: 'text-indigo-300 font-bold' }, 'time-of-arrival difference'),
              ' between the two ear openings encodes ',
              h('span', { className: 'text-indigo-300 font-bold' }, 'azimuth + elevation in 3D'),
              '. The asymmetric placement encodes elevation; without asymmetry, an owl could not tell if a sound came from above or below the head — only left or right.'
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: PELLET LAB
      // ────────────────────────────────────────────────────────
      function renderPellet() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-amber-200 mb-2' }, '🥚 Pellet Lab: The Owl\'s Trash, the Scientist\'s Treasure'),
            h('div', { className: 'text-sm text-amber-100/90 leading-relaxed' }, PELLET_DATA.overview)
          ),

          // Anatomy of a pellet
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '🔬 What\'s Inside a Typical Pellet'),
            h('div', { className: 'space-y-2' },
              PELLET_DATA.composition.map(function(c, i) {
                return h('div', { key: i, className: 'flex items-center gap-3 bg-slate-800/40 rounded p-2.5' },
                  h('div', { className: 'flex-shrink-0 w-32 text-xs font-bold text-amber-300' }, c.component),
                  h('div', { className: 'flex-shrink-0 w-20 text-xs font-mono text-yellow-200' }, c.pct),
                  h('div', { className: 'text-xs text-slate-200 flex-1' }, c.detail)
                );
              })
            )
          ),

          // Common prey identification key
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '🦷 Common Prey ID Key — From Skull + Teeth'),
            h('div', { className: 'space-y-2' },
              PELLET_DATA.commonPrey.map(function(p, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/40 rounded-lg p-3' },
                  h('div', { className: 'flex items-baseline justify-between gap-2 mb-1' },
                    h('div', { className: 'text-sm font-bold text-amber-200' }, p.name),
                    h('div', { className: 'text-[10px] text-slate-500 font-mono' }, p.conservation)
                  ),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('span', { className: 'text-slate-500' }, 'Cranium: '), p.cranium),
                  h('div', { className: 'text-xs text-yellow-200/90' }, h('span', { className: 'text-slate-500' }, 'Signature: '), p.signature)
                );
              })
            )
          ),

          // Dissection method
          h('div', { className: 'bg-amber-900/20 border border-amber-700/40 rounded-xl p-5' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '🔧 ' + PELLET_DATA.method.title),
            h('div', { className: 'bg-red-900/30 border border-red-700/40 rounded p-2 mb-3 text-xs text-red-200' },
              h('span', { className: 'font-bold' }, '⚠ Safety: '), PELLET_DATA.method.safetyNote
            ),
            h('ol', { className: 'space-y-1 text-xs text-amber-100/90 list-decimal list-inside' },
              PELLET_DATA.method.steps.map(function(s, i) { return h('li', { key: i }, s.replace(/^\d+\.\s*/, '')); })
            )
          ),

          // Pedagogy note
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-emerald-300 mb-2' }, '📚 Why pellet labs work in classrooms'),
            h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed' }, PELLET_DATA.pedagogy)
          ),

          // External resource
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 text-xs' },
            h('div', { className: 'font-bold text-amber-300 mb-1' }, '🔗 Free interactive dichotomous keys'),
            h('a', { href: 'https://www.kidwings.com/owl-pellets/virtual-pellet/', target: '_blank', rel: 'noopener noreferrer', className: 'text-cyan-300 hover:text-cyan-200 underline' }, 'KidWings Virtual Pellet (free online dissection)'),
            ' · ',
            h('a', { href: 'https://www.pellet.com/', target: '_blank', rel: 'noopener noreferrer', className: 'text-cyan-300 hover:text-cyan-200 underline' }, 'Pellet.com (sterilized supplies)'),
            ' · ',
            h('a', { href: 'https://www.carolina.com/owl-pellets/10288.pr', target: '_blank', rel: 'noopener noreferrer', className: 'text-cyan-300 hover:text-cyan-200 underline' }, 'Carolina Biological')
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: FALCONRY & HUMAN STORIES
      // ────────────────────────────────────────────────────────
      function renderFalconry() {
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-orange-200 mb-2' }, '🤝 Falconry & Humans: 4,000 Years of Hunting Together'),
            h('div', { className: 'text-sm text-orange-100/90 leading-relaxed' }, FALCONRY_DATA.overview)
          ),

          // Timeline of eras
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🕰 The 5 eras of falconry'),
            FALCONRY_DATA.eras.map(function(e, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-baseline justify-between gap-2 mb-2' },
                  h('div', { className: 'text-sm font-bold text-orange-300' }, e.era),
                  h('div', { className: 'text-[10px] text-slate-500 font-mono' }, e.region)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, e.practice),
                h('div', { className: 'text-[10px] italic text-slate-400' }, 'Sources: ' + e.sources)
              );
            })
          ),

          // Ambassador birds
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-emerald-300 mb-2' }, '🦉 ' + FALCONRY_DATA.ambassadorBirds.title),
            h('div', { className: 'text-sm text-emerald-100/90 leading-relaxed mb-3' }, FALCONRY_DATA.ambassadorBirds.explanation),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              FALCONRY_DATA.ambassadorBirds.examples.map(function(a, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 rounded p-3 border border-slate-700/40' },
                  h('div', { className: 'flex items-baseline justify-between gap-2 mb-1' },
                    h('div', { className: 'font-bold text-emerald-300 text-sm' }, a.name),
                    h('div', { className: 'text-[10px] text-amber-300 italic' }, a.species)
                  ),
                  h('div', { className: 'text-[10px] text-slate-400 mb-1' }, a.org),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, a.backstory)
                );
              })
            )
          ),

          // Ethics
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '⚖ ' + FALCONRY_DATA.ethics.title),
            h('div', { className: 'space-y-2' },
              FALCONRY_DATA.ethics.points.map(function(p, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 rounded p-2.5 border border-slate-700/40' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, p.topic),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.detail)
                );
              })
            )
          ),

          // Equipment glossary
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '🛠 Equipment glossary'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              FALCONRY_DATA.equipment.map(function(e, i) {
                return h('div', { key: i, className: 'bg-slate-800/40 rounded p-2.5' },
                  h('div', { className: 'text-xs font-bold text-orange-300 mb-0.5' }, e.item),
                  h('div', { className: 'text-xs text-slate-300' }, e.desc)
                );
              })
            )
          ),

          // Rehab
          h('div', { className: 'bg-cyan-900/20 border border-cyan-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-cyan-300 mb-2' }, '🩺 ' + FALCONRY_DATA.rehab.title),
            h('div', { className: 'text-xs text-cyan-100/90 mb-3 leading-relaxed' }, FALCONRY_DATA.rehab.stats),
            h('div', { className: 'mb-3' },
              h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'If you find an injured raptor:'),
              h('ul', { className: 'space-y-1 text-xs text-slate-200 list-disc list-inside' },
                FALCONRY_DATA.rehab.whatToDo.map(function(s, i) { return h('li', { key: i }, s); })
              )
            ),
            h('div', null,
              h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Notable US rehab facilities:'),
              h('div', { className: 'text-xs text-slate-300' }, FALCONRY_DATA.rehab.famousFacilities.join(' · '))
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: RESOURCES
      // ────────────────────────────────────────────────────────
      function renderResources() {
        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-amber-200 mb-1' }, '📚 Resources + Citizen Science'),
            h('div', { className: 'text-sm text-slate-300' }, 'Where to keep learning + how to contribute real data to raptor research.')
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            RESOURCES.map(function(r, i) {
              return h('a', { key: i, href: r.url, target: '_blank', rel: 'noopener noreferrer',
                className: 'block bg-slate-800/40 border border-slate-700/50 hover:border-amber-600/60 hover:bg-slate-700/40 rounded-lg p-3 transition-all',
                'aria-label': r.name + ' — opens in new tab'
              },
                h('div', { className: 'text-sm font-bold text-amber-300 mb-1' }, r.name + ' ↗'),
                h('div', { className: 'text-xs text-slate-300 leading-relaxed' }, r.desc)
              );
            })
          ),
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4 text-xs text-emerald-100/90' },
            h('div', { className: 'font-bold text-emerald-300 mb-1' }, '💡 Start with one observation'),
            'Open eBird or iNaturalist. Pick any raptor you saw today. Log it. You\'ve just contributed to one of the largest biodiversity datasets in human history — and you\'ve learned the species better than any textbook will teach you.'
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // MAIN RENDER — Tab nav + active section
      // ────────────────────────────────────────────────────────
      return h('div', { className: 'space-y-4', role: 'region', 'aria-label': 'Raptor Hunt tool' },
        // Section count chip
        h('div', { className: 'text-[11px] text-slate-500 uppercase tracking-wider' }, '17 sections · 8 species · 3D simulator · interactive labs · 18-question quiz'),
        // Tab nav (scrollable horizontal)
        h('div', { className: 'flex gap-1.5 overflow-x-auto pb-1', role: 'tablist', 'aria-label': 'Raptor Hunt sections' },
          SECTIONS.map(function(s) {
            var active = activeSection === s.id;
            return h('button', {
              key: s.id,
              role: 'tab',
              'aria-selected': active,
              'aria-controls': 'rh-panel-' + s.id,
              onClick: function() { setRH({ activeSection: s.id }); rhAnnounce(s.label + ' tab'); },
              className: 'px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ' +
                (active
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'bg-slate-800/50 text-amber-200/70 hover:bg-slate-700/50 hover:text-amber-200')
            }, s.icon + ' ' + s.label);
          })
        ),
        // Panel
        h('div', { id: 'rh-panel-' + activeSection, role: 'tabpanel', 'aria-labelledby': activeSection },
          activeSection === 'hub' && renderHub(),
          activeSection === 'roster' && renderRoster(),
          activeSection === 'hunt' && renderHunt(),
          activeSection === 'talons' && renderTalons(),
          activeSection === 'vision' && renderVision(),
          activeSection === 'flight' && renderFlight(),
          activeSection === 'stoop' && renderStoop(),
          activeSection === 'silent' && renderSilent(),
          activeSection === 'senses' && renderSenses(),
          activeSection === 'conservation' && renderConservation(),
          activeSection === 'fieldid' && renderFieldId(),
          activeSection === 'migration' && renderMigration(),
          activeSection === 'hearing' && renderHearing(),
          activeSection === 'pellet' && renderPellet(),
          activeSection === 'falconry' && renderFalconry(),
          activeSection === 'quiz' && renderQuiz(),
          activeSection === 'resources' && renderResources()
        )
      );
    }
  });
})();

}
