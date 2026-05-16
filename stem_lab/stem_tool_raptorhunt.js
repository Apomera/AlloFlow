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

  // ───────────────────────────────────────────────────────────
  // ANATOMY DATA — labeled raptor body-part reference
  // ───────────────────────────────────────────────────────────
  // Each label has: id, x, y (SVG coords in 800x500 canvas),
  // line endpoint (lx, ly) where the label sits, label text + description.
  var ANATOMY = {
    intro: 'Raptor anatomy is a study in optimization: every body part has been reshaped by tens of millions of years of selection for predatory life. The eye, larger than a human eye in a head the size of a tennis ball. The hooked beak with a tomial tooth that snips vertebrae cleanly. Talons curved to a specific arc, lengthened to penetrate, hardened with extra keratin. Wing primaries slotted to reduce induced drag. Every feature trackable to its functional pressure.',
    parts: [
      { id: 'eye', x: 615, y: 175, lx: 700, ly: 60, label: 'Eye', desc: 'Massive relative to body — golden eagle eye = human eye in a tennis-ball skull. 4-8× human visual acuity. Spherical (diurnal) or tubular (owls).' },
      { id: 'beak', x: 685, y: 215, lx: 770, ly: 200, label: 'Beak (cere + maxilla)', desc: 'Sharp downward hook for tearing flesh. Cere = the soft skin patch at the base (often yellow). Beak grows continuously; raptors "feak" (wipe + sharpen) on perches.' },
      { id: 'tomial', x: 670, y: 230, lx: 770, ly: 295, label: 'Tomial Tooth (falcons only)', desc: 'A pointed projection on the upper beak edge — fits into a notch on the lower beak. Falcons use this to sever the cervical vertebrae of prey in a single bite. Hawks + eagles + owls lack it.' },
      { id: 'nare', x: 660, y: 195, lx: 770, ly: 110, label: 'Nare (nostril)', desc: 'Hole in the cere. In peregrines, contains a bony tubercle that disrupts airflow during a 240 mph stoop so high-pressure air doesn\'t collapse the lungs.' },
      { id: 'crown', x: 540, y: 105, lx: 280, ly: 60, label: 'Crown / Crest', desc: 'Top of head feathers. Many raptors have erectile feather crests used in display. Harpy eagles have a distinctive divided black crest.' },
      { id: 'nape', x: 480, y: 165, lx: 240, ly: 120, label: 'Nape', desc: 'Back of the neck. Many species have a distinctive nape patch (e.g. golden eagle\'s "golden" nape, white-headed peregrine subspecies).' },
      { id: 'scapulars', x: 380, y: 200, lx: 200, ly: 200, label: 'Scapulars', desc: 'Shoulder feathers covering the shoulder joint. Many species have distinct scapular markings used in field ID.' },
      { id: 'breast', x: 510, y: 280, lx: 270, ly: 320, label: 'Breast', desc: 'Often patterned with bars/streaks for species ID — barred (broadwing), spotted (peregrine juvenile), unmarked white (bald eagle adult).' },
      { id: 'primaries', x: 195, y: 175, lx: 80, ly: 140, label: 'Primary Feathers (P1-P10)', desc: 'The outermost 10 wing feathers — the propulsion + steering surface. Slotted gaps in eagles + buteos reduce induced drag. Comb-edged in owls for silent flight.' },
      { id: 'secondaries', x: 295, y: 210, lx: 120, ly: 320, label: 'Secondary Feathers', desc: 'Inner wing feathers attached to the ulna — provide lift, not propulsion. The "soft" inner wing.' },
      { id: 'alula', x: 250, y: 175, lx: 110, ly: 80, label: 'Alula (bastard wing)', desc: 'Small set of feathers on the "thumb" — deployed at slow speed/high angle of attack to disrupt turbulence at the leading edge. Functions like a leading-edge slat on an airliner.' },
      { id: 'rectrices', x: 145, y: 305, lx: 60, ly: 380, label: 'Tail Rectrices (R1-R6 pairs)', desc: 'Tail feathers — provide steering + braking. Red-tailed hawk\'s namesake rusty tail; long banded in accipiters; fan-shaped in buteos.' },
      { id: 'thigh', x: 480, y: 385, lx: 280, ly: 430, label: 'Thigh + Tarsus', desc: 'Feathered thigh leads into a bare or feathered "leg" (tarsus). Eagles + rough-legged hawks have feathered tarsi for cold; most raptors have bare scaly tarsi.' },
      { id: 'foot', x: 545, y: 450, lx: 660, ly: 470, label: 'Foot — anisodactyl', desc: 'Three forward toes + one back toe (hallux). Hallux is the killing weapon — drives the longest talon through vital organs.' },
      { id: 'osprey-toe', x: 555, y: 460, lx: 720, ly: 410, label: 'Reversible Outer Toe (osprey only)', desc: 'Ospreys can rotate the 4th toe backward to grip wet fish in a 2-and-2 zygodactyl grip. Footpads have spicules (barbed scales) for additional traction on slippery scales.' },
      { id: 'hallux', x: 530, y: 462, lx: 380, ly: 480, label: 'Hallux Talon', desc: 'Longest talon, on the rear toe. The kill weapon — penetrates vital organs. Harpy eagle hallux talon: 12.5 cm (longer than a grizzly bear\'s claw).' },
      { id: 'gular', x: 575, y: 255, lx: 690, ly: 350, label: 'Crop (gular pouch)', desc: 'Bulging food storage under the throat skin. After a big kill, the bird may carry 200-400 g of food in the crop, slowly digesting it over hours. Owls lack a crop (food goes straight to gizzard).' }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // LIFECYCLE & DEMOGRAPHICS DATA
  // ───────────────────────────────────────────────────────────
  var LIFECYCLE = {
    overview: 'Raptors live long + reproduce slowly. A bald eagle female lays 1-3 eggs once per year, starting at age 4-5, and may live 25+ years. Most songbirds lay 4-6 eggs 2-3 times per year starting at age 1. This life-history difference — "K-selected" vs "r-selected" in ecology textbooks — means raptors are exquisitely vulnerable to adult mortality. Lose 10% of breeding songbirds + the population bounces back in 2 years; lose 10% of breeding eagles + recovery takes 30+ years. This is why the DDT era was catastrophic, and why every lead-shot poisoning + wind-turbine strike + power-line electrocution matters.',
    stages: [
      { stage: '1. Pair bond', timing: 'Late winter (Jan-Mar in temperate)', duration: '2-4 weeks', detail: 'Adults court via aerial display (cartwheeling, talon-grappling, food transfer mid-air). Most raptors are seasonally or lifelong monogamous. Pair re-uses the same nest territory year after year.', mortality: 'Very low — adults are skilled survivors at this stage.' },
      { stage: '2. Eggs', timing: 'Mar-May', duration: '28-45 days incubation depending on species', detail: 'Clutch size: 1 (harpy), 1-3 (eagles), 2-4 (hawks), 2-5 (owls), 3-7 (kestrels). Eggs are off-white to pale blue. Female does most incubation; male brings food.', mortality: 'High — ~30% egg failure (infertility, weather, predation by corvids/raccoons)' },
      { stage: '3. Nestling', timing: 'Apr-Jul', duration: '5-12 weeks depending on species (longer in larger species)', detail: 'Hatching is asynchronous — first egg hatches a few days before later eggs, so the firstborn is bigger + outcompetes siblings. In food shortage years, the youngest is "fratricide insurance" — older sibling kills younger to ensure survival of at least one chick. This is normal raptor behavior, not anomaly.', mortality: '~40-50% (starvation, sibling aggression, predator visits to unattended nest)' },
      { stage: '4. Fledgling', timing: 'Jul-Sep', duration: '3-8 weeks dependence after first flight', detail: 'First flight = "fledging." Parents continue to feed + train the young to hunt. Young are clumsy + obvious — exactly the period predators target them. Many human-window strikes happen in this period.', mortality: '~30% (predator kills, vehicle strikes, starvation as hunting skill is still poor)' },
      { stage: '5. First winter', timing: 'Sep-Mar', duration: '~6 months', detail: 'Young birds disperse from natal territory + face their first hunting season alone. The hardest mortality window.', mortality: '~50-70% — most juvenile raptor deaths happen here' },
      { stage: '6. Subadult', timing: 'Year 2-3 (most species) or 4-5 (eagles)', duration: '1-4 years', detail: 'Survives to year 2 = much better odds. Bird is hunting effectively + has territory experience but is not yet sexually mature. Often shows different plumage from adults (juvenile bald eagle is brown; doesn\'t get the white head until year 5).', mortality: '~15-25% per year' },
      { stage: '7. Breeding adult', timing: 'Year 2-5+ depending on species', duration: 'Up to 30+ years for large species', detail: 'Mature, territorial, breeding. Annual survival ~85-95% for adult eagles. Causes of death: lead poisoning, electrocution, vehicle strike, wind turbine, gunshot, old age.', mortality: '~5-15% per year (the lowest mortality bracket)' }
    ],
    longevity: [
      { species: 'American Kestrel', firstYearMort: '65%', adultAnnualSurv: '60%', meanLifespan: '~1.5 yr', recordWild: '~14 yr' },
      { species: 'Red-tailed Hawk', firstYearMort: '70%', adultAnnualSurv: '78%', meanLifespan: '~6 yr', recordWild: '~30 yr' },
      { species: 'Cooper\'s Hawk', firstYearMort: '~75%', adultAnnualSurv: '~80%', meanLifespan: '~3 yr', recordWild: '~20 yr' },
      { species: 'Bald Eagle', firstYearMort: '~60%', adultAnnualSurv: '~90%', meanLifespan: '~12 yr', recordWild: '~38 yr' },
      { species: 'Golden Eagle', firstYearMort: '~60%', adultAnnualSurv: '~94%', meanLifespan: '~14 yr', recordWild: '~38 yr' },
      { species: 'Peregrine Falcon', firstYearMort: '~70%', adultAnnualSurv: '~85%', meanLifespan: '~5 yr', recordWild: '~25 yr' },
      { species: 'Great Horned Owl', firstYearMort: '~50%', adultAnnualSurv: '~85%', meanLifespan: '~13 yr', recordWild: '~28 yr' },
      { species: 'Harpy Eagle', firstYearMort: '~70%', adultAnnualSurv: '~95%', meanLifespan: '~25 yr', recordWild: '~35+ yr' }
    ],
    population: {
      title: 'Why recovery is slow — the demographic math',
      explanation: 'A simple population model: λ (lambda) = annual population growth rate. λ < 1 = declining. λ > 1 = growing. λ ≈ adult survival + (juvenile survival × fecundity). For a bald eagle: adult survival 0.90, juvenile survival 0.40, fecundity 0.8 chicks/female/year. λ ≈ 0.90 + (0.40 × 0.8) / 2 ≈ 1.06. That 6%/year growth — a healthy raptor population. Lose 5% of adults from lead poisoning and λ drops to 0.99 — population starts declining. THIS is the demographic logic of raptor conservation: protecting adult breeders is the highest-leverage action; even small adult-mortality increases can flip a population from growing to declining.',
      keyInsight: 'Population biology insight: in K-selected long-lived species, adult survival is the single biggest driver of population trajectory. Every saved breeding adult is worth 5-10 juveniles in demographic terms.'
    }
  };

  // ───────────────────────────────────────────────────────────
  // RECOVERY CASE STUDIES — deep stories of raptor recoveries
  // ───────────────────────────────────────────────────────────
  // Each is a full narrative — what was the crisis, how was it solved,
  // who solved it, what the data look like now, what\'s next.
  var RECOVERIES = {
    intro: 'The peregrine\'s recovery from near-extinction is one of the great triumphs of conservation biology. So is the bald eagle\'s. So is the California condor\'s. So are the Mauritius kestrel + the Philippine eagle (still ongoing). Each story is different — different threats, different mechanisms, different heroes — but they share one feature: ',
    introBold: 'every recovery required decades of patient, coordinated, expensive work by a small number of obsessed people, plus enough political will to enact protective regulations. Conservation does not happen by accident.',
    cases: [
      {
        id: 'peregrine',
        title: 'Peregrine Falcon — The DDT Comeback',
        emoji: '🦅',
        crisis: 'CRASH (1947-1975)',
        crisisDetail: 'After WWII, DDT was sprayed across the US to kill mosquitoes + agricultural pests. Within 15 years, peregrine populations east of the Rockies had collapsed entirely. The chemical bioaccumulated up the food chain — peregrines hunting pigeons that had eaten DDT-laced grain ended up with massive DDE concentrations in their fat. DDE interfered with calcium metabolism, producing eggshells so thin they cracked under brooding parents. By 1965, NO peregrines were nesting east of the Mississippi. By 1972, breeding pairs in the lower 48 had dropped from ~3,875 (1940) to fewer than 50. The species was functionally extinct in most of its range.',
        action: 'RECOVERY (1972-1999)',
        actionDetail: 'The 1972 US DDT ban (driven by Rachel Carson\'s Silent Spring + EPA\'s Ruckelshaus) stopped the chemical input. Then came captive breeding. Cornell\'s Tom Cade founded The Peregrine Fund (1970) and began artificial breeding using surrogate parents, double-clutching (taking the first clutch + letting the female lay a second), and hand-rearing chicks. The first captive-bred peregrines were "hacked" (soft-released using falconry methods) into wild sites starting 1974. Over 25 years, ~7,000 captive-bred peregrines were released across North America. Falconers donated time + technique; Cornell ran the captive-breeding logistics; the US Fish + Wildlife Service ran the wild monitoring. Cities turned out to be excellent habitat — skyscrapers mimic cliff nest sites; urban pigeon populations provide unlimited prey. By 1999 the species was delisted from the US Endangered list.',
        keyPerson: 'Tom Cade (1928-2019), Cornell ornithologist who founded The Peregrine Fund; Rachel Carson (1907-1964), author of Silent Spring; William Ruckelshaus, first EPA administrator who signed the DDT ban',
        currentStatus: '~3,200 breeding pairs in the lower 48 US (2020); ~30,000+ worldwide. Globally Least Concern. Urban populations are now the densest peregrine populations on Earth.',
        whatNext: 'Lead-shot poisoning + window strikes are the current minor mortality sources. Population is self-sustaining + no longer needs active intervention beyond habitat protection.',
        lesson: 'Identify the chemical driver (DDT). Ban it at the source. Use accumulated falconry knowledge for breeding + release. 27 years from collapse to delisting. The recovery cost ~$5 million in 1980s dollars — among the cheapest endangered-species recoveries in US history.'
      },
      {
        id: 'baldEagle',
        title: 'Bald Eagle — The National Symbol Saved',
        emoji: '🇺🇸',
        crisis: 'CRASH (1947-1963)',
        crisisDetail: 'Bald eagles faced TWO simultaneous threats. (1) DDT — same egg-thinning mechanism as the peregrine. (2) Active persecution — Alaska paid a bounty on bald eagles 1917-1953 ($1-2 per pair of talons, total ~150,000 birds killed). In the lower 48, the breeding population fell from ~100,000 pairs in 1800 to 417 known pairs in 1963.',
        action: 'RECOVERY (1972-2007)',
        actionDetail: 'DDT ban (1972). Bald + Golden Eagle Protection Act (1940; teeth added 1972). Endangered Species Act listing (1978). Captive-breeding programs at Patuxent Wildlife Research Center + Sutton Avian Research Center. Nest platform construction. Bald eagles benefited from a key advantage over peregrines: they tolerate human presence well + readily occupy artificial nest platforms on utility poles, buoys, and tree snags. Recovery was steady + remarkable. The species was downlisted to Threatened (1995) + delisted (2007).',
        keyPerson: 'Patuxent Wildlife Research Center biologists; the legal coalition that drove the 1972 DDT ban; volunteer nest-platform builders across the Mississippi flyway',
        currentStatus: '~316,000 individuals in lower 48 (2020 USFWS). Bald eagles are now common enough to be sighted regularly in suburban + even urban areas. Pittsburgh, Philadelphia, DC, Boston all have city-pair nests.',
        whatNext: 'Lead-shot poisoning is the current crisis. Lead-shot ammunition leaves fragments in deer carcasses + gut piles, which eagles scavenge. California banned lead ammunition for hunting in 2019 to protect condors + eagles; other states have not. Estimated 120,000+ eagles killed by lead since 1990.',
        lesson: 'Different recovery profile from peregrine: bald eagles needed habitat + nest sites + protection, not breeding centers. Tolerant species recover faster + cheaper than intolerant species — peregrine recovery hinged on hacking; bald-eagle recovery on simply giving the birds space + safety.'
      },
      {
        id: 'condor',
        title: 'California Condor — From 22 Birds to 500+',
        emoji: '🦅',
        crisis: 'EXTINCTION VORTEX (1980-1987)',
        crisisDetail: 'California condors are New World vultures, the largest North American flying birds (9.5-ft wingspan). They eat carrion. Lead-shot fragments from hunter-killed deer + livestock gut piles enter the bloodstream, paralyze the digestive tract, and slowly starve the bird. By 1980, only 22 California condors remained in the wild. By 1987 the population was 22 birds total, ALL captured + placed in captive breeding programs at San Diego Zoo + Los Angeles Zoo. There were ZERO wild California condors for 5 years (1987-1992).',
        action: 'CAPTIVE BREEDING + REINTRODUCTION (1987-present)',
        actionDetail: 'Captive breeding used double-clutching + careful hand-rearing (with hand-puppet condor "parents" to prevent imprinting on humans). Reintroduction began at the Hopper Mountain National Wildlife Refuge (1992), Big Sur (1997), Arizona Vermilion Cliffs (1996), Baja California (2002). Each release bird is tagged with VHF telemetry + a numbered wing tag. Pre-release training includes aversive conditioning to human structures (mild electric shock on power poles) so they avoid electrocution.',
        keyPerson: 'Mike Wallace (San Diego Zoo), Bill Toone, Lloyd Kiff, Noel Snyder. The decision to capture every wild condor in 1987 was deeply controversial — many biologists thought captive breeding would fail. It didn\'t.',
        currentStatus: '~530 condors total (2024). ~340 wild + ~190 captive. Wild populations established in California, Arizona/Utah, Baja California, with a growing population. The first wild-hatched chick from captive-bred parents fledged in 2003. Annual wild releases continue.',
        whatNext: 'LEAD POISONING IS STILL THE PRIMARY THREAT. Every condor in the wild is regularly recaptured + tested for blood lead; chelation therapy is given when needed. California\'s 2019 lead-ammo ban is helping. Until lead ammunition is banned across the condor range (Arizona, Utah, Mexico), the species cannot become self-sustaining.',
        lesson: 'The hardest recovery in US history. ~$50 million spent. Required a permanent intensive-management program — every wild condor is essentially a "tagged research subject." Without active human intervention, the wild population would lead-poison itself back to extinction within 5-10 years. The species is alive only because we keep working at it.'
      },
      {
        id: 'mauritius',
        title: 'Mauritius Kestrel — From 4 Birds to 800',
        emoji: '🦅',
        crisis: 'COLLAPSE (1950-1974)',
        crisisDetail: 'The Mauritius kestrel (Falco punctatus) is endemic to a small Indian Ocean island. By 1974, after centuries of habitat destruction (Mauritius was 98% deforested), DDT spraying for malaria control, + introduced macaques + mongooses eating eggs, the species was reduced to ',
        crisisDetailBold: 'four known wild individuals — two breeding pairs',
        crisisDetailRest: '. It was the rarest bird in the world for several years running.',
        action: 'RECOVERY (1973-present)',
        actionDetail: 'Carl Jones, a young Welsh biologist, arrived on Mauritius in 1979 to study the kestrel. He stayed for 40 years. Strategy: (1) Find ALL remaining wild nests + harvest eggs for captive breeding. (2) Double-clutch the wild birds (taking the first clutch + the female lays a second). (3) Hand-rear chicks + release them at predator-proof nest boxes. (4) Provide supplementary food to released birds. (5) Predator control on mongoose + macaque populations. The first captive-bred chicks were released in 1985. By 1994 there were 200+ wild birds. By 2005, ~800. The species was downlisted from Critically Endangered to Endangered to Vulnerable.',
        keyPerson: 'Carl Jones, who also led recoveries for the Mauritius pink pigeon, echo parakeet, Rodrigues warbler, and round-island boa. Awarded the Indianapolis Prize (conservation\'s Nobel) in 2016.',
        currentStatus: '~400-500 birds in 2020 (estimates vary). Population has declined from 2005 peak due to renewed habitat pressure + invasive plant competition. Still requires active management.',
        whatNext: 'Habitat protection + invasive species control + nest box maintenance. The bird will likely never be fully self-sustaining without ongoing management, but a stable 500-bird population is achievable.',
        lesson: 'The most extreme recovery in conservation history — 4 birds to 800 in 30 years. Required one biologist + small team dedicating their lives. Demonstrates that even the most apparently doomed species can be saved with patient + creative intervention. Jones\' methods (double-clutching, hand-rearing, nest boxes) became the playbook for hundreds of subsequent island-endemic recoveries worldwide.'
      },
      {
        id: 'philippine',
        title: 'Philippine Eagle — Still Critical',
        emoji: '🇵🇭',
        crisis: 'ONGOING (1960-present)',
        crisisDetail: 'The Philippine eagle (Pithecophagus jefferyi, formerly "monkey-eating eagle") is the national bird of the Philippines and one of the largest eagles on Earth (~3.5 ft tall, 7.5-ft wingspan). It is critically endangered. ~400 wild adults estimated in 2023. Threats: (1) Rainforest loss — the species needs 50-100 km² of contiguous old-growth forest per breeding pair; the Philippines has lost ~70% of its primary forest. (2) Direct persecution + shooting + capture for the pet trade. (3) Very slow reproduction — one chick every 2-3 years, sexual maturity at 5-7 years.',
        action: 'PARTIAL EFFORTS',
        actionDetail: 'Philippine Eagle Foundation (1987 founded) runs captive breeding + reintroduction + community education + protected-forest management. First captive-bred chick fledged 1992. ~30 captive birds + ongoing wild monitoring. Penalty for killing a Philippine eagle was increased to 12 years prison + ₱1 million fine in 2001. Some protected areas (Mt. Apo, Mt. Kitanglad) have established Eagle Sanctuaries.',
        keyPerson: 'Dennis Salvador (Executive Director, Philippine Eagle Foundation); Hector Miranda; local indigenous community members serving as forest patrols',
        currentStatus: 'Critically Endangered (IUCN). ~400 wild adults declining. Habitat continues to be lost at ~2% per year. Climate change adds drought stress to remaining rainforest patches.',
        whatNext: 'Without dramatic increases in protected-forest acreage + community livelihood programs to reduce pressure on remaining habitat, the species may continue declining. Some biologists rate the long-term outlook as 50/50.',
        lesson: 'A recovery still being written. The Philippine eagle highlights that island-endemic + rainforest-canopy specialists are the hardest to save — they need huge intact habitat blocks that don\'t exist anymore. Without strong rule of law + sustained funding, "endangered species protection" remains words on paper.'
      }
    ],
    metaLesson: {
      title: 'What every recovery has in common',
      points: [
        '1. Identify the SPECIFIC threat (DDT, lead, habitat loss, shooting). Vague "threats" cannot be addressed.',
        '2. Stop the threat at the source. Ban DDT. Ban lead shot. Stop deforestation.',
        '3. Build captive-breeding capacity ONLY if wild populations are too small to recover unaided.',
        '4. Use accumulated falconry + zoo + ornithology knowledge (hacking, double-clutching, hand-rearing).',
        '5. Coordinate across many institutions: government, university, NGO, zoo, falconers, citizens.',
        '6. Dedicate 20-40 years. Recovery is generational work, not a 5-year grant cycle.',
        '7. Expect costs of $1M-$50M per species. Conservation is not free.',
        '8. Plan for permanent management of some species. Not all populations become self-sustaining.'
      ]
    }
  };

  // ───────────────────────────────────────────────────────────
  // FAMOUS BIRDS + CULTURAL SYMBOLS DATA
  // ───────────────────────────────────────────────────────────
  // Individual famous raptors + cross-cultural symbolic meanings.
  var FAMOUS = {
    intro: 'Raptors are the world\'s most-used national + military symbols — and a handful of individual wild birds have become global celebrities. Pale Male, the Manhattan red-tail who nested on a Fifth Avenue cooperative for 32 years, was on the front page of the New York Times when the building tried to remove his nest. Old Abe, an injured Wisconsin eagle, traveled with a Civil War regiment + survived 36 battles. The bald eagle\'s 1782 selection as US national emblem narrowly defeated Benjamin Franklin\'s proposal for the wild turkey. The golden eagle is the founding myth of Mexico City (Tenochtitlan). The harpy eagle is the Brazilian Air Force\'s symbol. The Haast\'s eagle of New Zealand — extinct ~1400 CE — survives in Maori oral history as the giant Pouakai.',

    individuals: [
      {
        name: 'Pale Male',
        species: 'Red-tailed Hawk',
        years: '1991-2023',
        location: '927 Fifth Avenue, Manhattan',
        story: 'A pale-plumaged male red-tail moved into Central Park in 1991 + nested on the cornice of a Fifth Avenue cooperative in 1993. He raised 26+ offspring over 32 years on that nest. In December 2004, the building\'s coop board removed his nest as a "safety hazard." A 12-day public outcry — including front-page New York Times coverage, protests outside the building, and Mary Tyler Moore\'s public statement — forced the board to install a stainless-steel cradle that Pale Male promptly rebuilt on. He died in 2023, age 32+ (extraordinary longevity for a wild red-tail; record is ~30 years).',
        legacy: 'Demonstrated that urban raptor populations can thrive long-term given even minimal accommodation. Spawned the 2002 documentary "Pale Male." Cornell Lab\'s Manhattan red-tail nest cam has tracked his descendants ever since.'
      },
      {
        name: 'Old Abe',
        species: 'Bald Eagle',
        years: '1861-1881',
        location: 'Wisconsin → Civil War theater',
        story: 'Captured as an eaglet in 1861 by an Ojibwe man, Old Abe was sold to a Wisconsin family + then adopted as regimental mascot by Company C, 8th Wisconsin Infantry. He traveled with the regiment through 36 battles, perched on a wooden cross-pole + a custom shield, and would screech during charges (boosting morale, terrifying Confederate troops). He survived the war intact, became a celebrity at the Wisconsin State Capitol, raised money for veteran charities at $100/hr (huge sum in 1870s), and died from smoke inhalation during a Capitol fire in 1881.',
        legacy: 'First celebrity raptor in American history. The 101st Airborne Division\'s "Screaming Eagles" insignia depicts Old Abe. The Wisconsin State Capitol still displays a stuffed mount + uniformed perch.'
      },
      {
        name: 'Challenger',
        species: 'Bald Eagle',
        years: '1989-present',
        location: 'American Eagle Foundation, Tennessee',
        story: 'Found as an eaglet in 1989 having fallen from his nest. Hand-raised (which left him imprinted on humans + permanently non-releasable). He became a "flying ambassador" — trained to fly into stadiums during the US national anthem. Has flown at 400+ MLB, NFL, college games, including 2 World Series + 2 Super Bowls. The only bald eagle named for the Space Shuttle Challenger crew (a tribute to the 1986 disaster).',
        legacy: 'Probably the most-watched individual bald eagle in human history — viewed in person by 10+ million people, broadcast to hundreds of millions. The American Eagle Foundation\'s flagship education bird.'
      },
      {
        name: 'Frodo',
        species: 'Mauritius Kestrel',
        years: '1973-1974',
        location: 'Mauritius',
        story: 'In 1974, when the Mauritius kestrel population was reduced to 4 known wild birds, Frodo was one of two adult males left alive. Carl Jones identified him + nicknamed him for his small size + outsized importance. Frodo\'s mate hatched their last wild chick in 1974. Jones extracted that chick + subsequent eggs for captive breeding. Frodo himself was never captured + continued breeding in the wild until ~1976.',
        legacy: 'Founder bird of the entire restored Mauritius kestrel population. Every wild kestrel on the island today descends from Frodo + his mate. The species would be extinct without these 2 birds.'
      },
      {
        name: 'AC9 (and the captive Class of 1987)',
        species: 'California Condor',
        years: '1980-present (AC9 still alive 2024)',
        location: 'California',
        story: 'AC9 was the last wild California condor — captured April 19, 1987 + brought into the captive-breeding program. After 5 years of captive breeding (1987-1992), AC9 was the FIRST condor reintroduced to the wild in 2002 + has produced 9 wild-hatched chicks. AC9 was named after his radio-transmitter band: "Adult Condor 9."',
        legacy: 'Represents the moral + scientific gamble of 1987: capture every wild condor on Earth to save the species. AC9 + the 21 other condors of 1987 are the literal ancestors of every California condor alive today.'
      }
    ],

    symbols: [
      {
        symbol: 'Bald Eagle — United States',
        adopted: 'June 20, 1782',
        myth: 'The Second Continental Congress chose the bald eagle (Haliaeetus leucocephalus) for the Great Seal after 6 years of debate. Charles Thomson designed the final seal showing an eagle with arrows of war + olive branch of peace.',
        controversy: 'Benjamin Franklin famously wrote (1784, in a private letter to his daughter): "For my own part, I wish the Bald Eagle had not been chosen as the Representative of our Country. He is a Bird of bad moral Character; he does not get his Living honestly... like those among Men who live by Sharping & Robbing, he is generally poor, and often very lousy. Besides, he is a rank Coward..." Franklin preferred the wild turkey: "a much more respectable Bird, and withal a true original Native of America." Most historians read this as Franklin\'s humorous critique of the seal, not a literal proposal to switch.'
      },
      {
        symbol: 'Golden Eagle — Mexico',
        adopted: 'Aztec founding myth ~1325 CE; modern flag 1821',
        myth: 'The Aztec founding myth of Tenochtitlan: the wandering Mexica people would settle where they saw a golden eagle perched on a nopal cactus + devouring a serpent. They saw this vision on a small island in Lake Texcoco. Tenochtitlan (modern Mexico City) was founded there in 1325. The image — eagle, snake, cactus — has appeared on every Mexican flag since 1821.',
        controversy: 'The species in Mexican iconography is sometimes called "Águila Real" (Royal Eagle = Aquila chrysaetos = golden eagle), but some Aztec codices depict a crested caracara instead. The official 1968 flag standard specifies golden eagle.'
      },
      {
        symbol: 'Harpy Eagle — Panama + Brazilian Air Force',
        adopted: 'Panama national bird 2002; Brazilian Air Force insignia 1947',
        myth: 'The harpy eagle is the national bird of Panama (the Panamanian harpy is Panama\'s top predator + a critically endangered conservation symbol). The Brazilian Air Force adopted the harpy in 1947 — chosen for the species\' fearsome talons + raw power. Brazilian Air Force fighter squadrons fly under harpy insignia variants.',
        controversy: 'Panama actively works on harpy conservation — its national zoo runs captive-breeding + reintroduction programs in the Darién Gap region. The bird\'s symbolic visibility helps fund actual habitat protection.'
      },
      {
        symbol: 'Haast\'s Eagle — Maori oral history (extinct)',
        adopted: 'Maori folklore ~1300-1400 CE',
        myth: 'Haast\'s eagle (Hieraaetus moorei) was the largest eagle that ever lived — wingspan ~3 m, mass 10-15 kg. It preyed on moa (giant flightless birds), New Zealand\'s only native large herbivore. Maori arrived in New Zealand ~1280-1300 CE. Moa were extinct by ~1445. Haast\'s eagle followed shortly after — its prey base gone. But the bird survives in Maori oral history as Te Hokioi or Pouakai, a giant flying creature said to have attacked people. Cave paintings + bone remains suggest these stories are NOT pure mythology — Maori may have witnessed (or been victims of) actual Haast\'s eagle attacks.',
        controversy: 'Among the most credible animal-extinction folklore in the world. The "Pouakai" stories were dismissed as myth for 200 years until subfossil bones + carbon dating confirmed Haast\'s eagle was real, recent, and overlapped with humans.'
      },
      {
        symbol: 'Peregrine Falcon — Egyptian pharaohs (Horus)',
        adopted: '~3000 BCE (Old Kingdom Egypt)',
        myth: 'The god Horus — son of Osiris + Isis, divine sky-king of pharaonic Egypt — was depicted as a falcon-headed man for ~3,000 years. Most Egyptologists identify Horus\'s falcon as a peregrine (some say lanner falcon). The Eye of Horus symbol (Wedjat) was based on the falcon\'s facial markings (cheek mark + eye-ring). Pharaohs were called "Horus-on-Earth"; each pharaoh\'s name was preceded by a falcon hieroglyph + a serekh frame.',
        controversy: 'The falcon-headed god is one of the oldest continuously-worshipped symbols in human history — older than Christianity, older than Buddhism, older than written Chinese. The peregrine had been a sacred bird in the Nile Valley for at least 3,000 years before the Roman conquest.'
      },
      {
        symbol: 'Eagle — Roman Empire (Aquila)',
        adopted: 'Marius reforms of Roman legions, ~104 BCE',
        myth: 'After Gaius Marius reformed the Roman legions, each legion carried an "Aquila" — a silver (later gold) eagle standard atop a pole. The Aquila was the legion\'s sacred totem. Losing it in battle was the worst possible disgrace; emperors mounted full military campaigns to recover lost Aquilae (e.g., the Augustan recovery of the Varian Disaster eagles after 16 years). The Roman eagle inspired the imperial eagles of the Byzantine Empire, Holy Roman Empire, Russian Empire, German Empire, Habsburg Empire, Napoleonic France, US national emblem, and dozens of modern military insignia.',
        controversy: 'The Roman eagle is the ancestor of nearly every Western "imperial eagle" symbol. It is the longest-running political symbol in continuous use in human history.'
      }
    ],

    closingNote: 'Across at least 5,000 years + every inhabited continent, humans have selected raptors as symbols of authority, ferocity, courage, and divine power. No other animal group comes close in symbolic usage. Why? Because raptors do what we wish we could — they fly, they hunt, they kill at distance, they are visibly dominant. They are, in the deepest sense, the visual ideal of power.'
  };

  // ───────────────────────────────────────────────────────────
  // GLOSSARY DATA — A-Z reference of raptor terminology
  // ───────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'Accipiter', def: 'Genus of forest-interior hawks with short broad wings + long banded tail. North American examples: sharp-shinned, Cooper\'s, northern goshawk.' },
    { term: 'Alula', def: 'The "thumb" of a bird\'s wing — small bundle of feathers anchored at the leading edge. Functions as a leading-edge slat at slow speed/high angle of attack.' },
    { term: 'Anisodactyl', def: 'Foot arrangement with 3 toes forward + 1 toe back (the hallux). The default raptor foot pattern.' },
    { term: 'Aspect Ratio', def: 'Wingspan² / wing area. High = soaring efficient (eagle 6-7, albatross 15). Low = forest-agile (accipiter 4-5).' },
    { term: 'Aquila', def: 'Genus name for eagles (Latin for "eagle"). Also the Roman legion\'s eagle-standard.' },
    { term: 'Berkutchi', def: 'Kazakh + Mongolian golden-eagle hunters on horseback. Practice dates to ~2000 BCE. ~250 active practitioners remain in 2024.' },
    { term: 'Bolus / Cast / Pellet', def: 'Indigestible material (fur, bones, teeth, exoskeletons) regurgitated by raptors — most famous in owls. See Pellet Lab.' },
    { term: 'Brood Patch', def: 'Bare skin area on the female\'s belly during incubation. Provides direct heat transfer to eggs.' },
    { term: 'Buteo', def: 'Genus of broad-winged, broad-tailed hawks. Soaring + perch-hunting specialists. North American examples: red-tailed, red-shouldered, broad-winged, Swainson\'s.' },
    { term: 'Casting', def: 'The act of regurgitating a pellet.' },
    { term: 'Cere', def: 'Patch of soft skin at the base of the upper beak, often brightly colored (yellow in most hawks/eagles, blue in some kestrels). Contains the nostrils.' },
    { term: 'Crepuscular', def: 'Active at dawn + dusk. Some owls (eastern screech, short-eared) are crepuscular rather than fully nocturnal.' },
    { term: 'Crop', def: 'Bulging food-storage pouch in the esophagus, just below the throat. Visible as a lump after a big meal. Owls lack a crop — they store food in the gizzard.' },
    { term: 'DDT / DDE', def: 'Pesticide (DDT) + its breakdown product (DDE) that caused massive raptor population crashes 1947-1972 via eggshell thinning. Banned in US 1972.' },
    { term: 'Diurnal', def: 'Active during daylight hours. Hawks, eagles, falcons.' },
    { term: 'Double-clutching', def: 'Conservation technique: remove the first clutch of eggs for artificial incubation; the female lays a second clutch. Doubles reproductive output per breeding season. Key to peregrine + condor + Mauritius kestrel recoveries.' },
    { term: 'Eyrie / Aerie', def: 'A raptor\'s nest, especially on a cliff. The word "eyrie" is the British spelling; "aerie" is American.' },
    { term: 'Fledge / Fledgling', def: 'First flight from the nest. Fledgling = post-fledging young, still dependent on parents.' },
    { term: 'Falconidae', def: 'Family of falcons + caracaras. Distinguished from hawks (Accipitridae) by anatomy + a single tomial tooth on the upper beak.' },
    { term: 'Fovea', def: 'High-density cone region in the retina that provides sharpest vision. Most diurnal raptors have TWO foveas per eye; owls + humans have one.' },
    { term: 'Hacking', def: 'Soft-release method developed by falconers. Captive-bred birds are placed in a hack box at a release site, fed remotely, and gradually transition to wild hunting. Used in peregrine + condor + bald eagle recoveries.' },
    { term: 'Hallux', def: 'The rear toe. In raptors, the hallux talon is the primary killing weapon — longest + curved + driven straight through prey vital organs.' },
    { term: 'IRRUPTION', def: 'When northern raptors move far south in winter due to prey crashes (lemmings, voles). NOT a range shift — irruption birds return north next spring. Famous: 2013-14 snowy owl irruption.' },
    { term: 'Jess', def: 'Falconry term for the soft leather straps anchored at the bird\'s ankles for handler control.' },
    { term: 'Kettle', def: 'A column of soaring raptors riding a thermal upward. Famous at migration sites — Veracruz, Hawk Mountain — where 100s to 1000s of birds can be in a single kettle.' },
    { term: 'Kiting', def: 'Holding stationary in mid-air by facing into a strong headwind, wings extended. Common in red-tailed + rough-legged hawks.' },
    { term: 'K-selected', def: 'Life history pattern of long-lived, slow-reproducing species (raptors, whales, humans). Opposite of r-selected (mice, insects). K-selected populations are vulnerable to even small adult mortality increases.' },
    { term: 'Mantle', def: 'When a raptor spreads wings + tail over its prey to hide it from kleptoparasites. "Mantling" is a defensive food-protection behavior.' },
    { term: 'Mews', def: 'A falconer\'s housing facility for raptors. In US, USDA-inspected with specific dimensional + welfare requirements.' },
    { term: 'Nare', def: 'A bird\'s nostril. In peregrines, contains a bony tubercle that redirects airflow during a 240 mph stoop.' },
    { term: 'Nictitating Membrane', def: 'Clear "third eyelid" that slides horizontally across the eye. Protects from debris + dryness without blocking vision. Critical during a peregrine stoop.' },
    { term: 'Pellet', def: 'See Bolus. The indigestible remains regurgitated by raptors.' },
    { term: 'Pin Feathers', def: 'New feathers still encased in a keratin sheath. Looks like a porcupine quill until the sheath splits.' },
    { term: 'Polyandry', def: 'One female mating with multiple males in a season. Rare in raptors but documented in some harriers + Galápagos hawks.' },
    { term: 'Primaries', def: 'The 10 outermost wing feathers, attached to the "hand" bones. The propulsion + steering surface in flight.' },
    { term: 'Raptor', def: 'A diurnal or nocturnal predatory bird with hooked beak + curved talons. Includes hawks, eagles, falcons, owls, osprey, kites, vultures (sometimes). Term comes from Latin "raptor" = "snatcher."' },
    { term: 'Rectrices', def: 'Tail feathers. Numbered as 3 pairs (R1 inner to R6 outer).' },
    { term: 'Sexual Size Dimorphism (Reverse)', def: 'In raptors, females are typically 20-50% LARGER than males — opposite of most birds. Most extreme in accipiters + falcons. Likely tied to prey size: males hunt smaller faster prey, females hunt larger.' },
    { term: 'Stoop', def: 'A high-speed steeply-angled dive used by falcons to attack airborne prey. Peregrines reach ~242 mph; the fastest known animal speed.' },
    { term: 'Tarsus', def: 'The "leg" between the foot + the ankle joint. Some raptors have feathered tarsi (rough-legged hawk, snowy owl); most have bare scaly tarsi.' },
    { term: 'Tomial Tooth', def: 'A pointed projection on the upper beak edge in falcons. Fits into a notch on the lower beak — used to sever the cervical vertebrae of prey in a single bite.' },
    { term: 'Wing Loading', def: 'Body mass divided by wing area (kg/m²). High loading = fast/heavy/diving (falcons 9 kg/m²); low loading = slow/soaring (vultures 3 kg/m²).' },
    { term: 'Zygodactyl', def: 'Foot with 2 toes forward + 2 back. Ospreys can rotate their outer toe to switch from anisodactyl (3-and-1) to zygodactyl (2-and-2) for gripping wet fish.' }
  ];

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
        { id: 'anatomy', label: 'Anatomy', icon: '🦴' },
        { id: 'lifecycle', label: 'Lifecycle', icon: '🐣' },
        { id: 'spiral', label: 'Stoop Trajectory', icon: '🌀' },
        { id: 'acuity', label: 'Vision Acuity Demo', icon: '👁️‍🗨️' },
        { id: 'recoveries', label: 'Recovery Case Studies', icon: '🏆' },
        { id: 'predictor', label: 'Wing-Loading Predictor', icon: '🪂' },
        { id: 'famous', label: 'Famous Birds & Symbols', icon: '⭐' },
        { id: 'glossary', label: 'Glossary', icon: '📖' },
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
                h('div', { className: 'text-xs text-amber-300/70 mt-2 italic' }, '25 sections · 8 species · 6 interactive labs · anatomy + acuity demo · case studies · 42-term glossary · 18-question quiz')
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
          // ── NEW v0.13: Challenge of the Day ──
          (function() {
            // Seed from current date so the challenge is stable for a day
            var now = new Date();
            var daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
            var challenges = [
              { icon: '🪝', title: 'Rank by talon force', prompt: 'From memory: order these 5 species by grip force, weakest to strongest — bald eagle, harpy eagle, golden eagle, great horned owl, peregrine.', jumpTo: 'talons', answer: 'Peregrine (230 psi) → Bald eagle (400) → Great horned owl (500) → Harpy eagle (530) → Golden eagle (750)' },
              { icon: '🎯', title: 'Match silhouette to family', prompt: 'Which family has POINTED swept-back wings + a medium tail with a tomial-tooth notch on the upper beak?', jumpTo: 'fieldid', answer: 'Falconidae — falcons. Pointed wings + the tomial tooth (used to sever the cervical vertebrae) are diagnostic.' },
              { icon: '📐', title: 'Stoop physics', prompt: 'Estimate: a peregrine at 242 mph terminal velocity carries roughly how much kinetic energy at impact?', jumpTo: 'stoop', answer: '~5,000 J — pistol-bullet class. KE = ½ × 0.95 kg × (108 m/s)² ≈ 5,540 J.' },
              { icon: '👁', title: 'UV vision', prompt: 'Which family of raptor can see ultraviolet light + uses it to track vole urine trails?', jumpTo: 'vision', answer: 'Falconidae (kestrels especially). Vole urine reflects UV strongly; the kestrel sees "glowing highways" of rodent travel routes. Viitala et al 1995 Nature.' },
              { icon: '🤫', title: 'Silent flight mechanism', prompt: 'Name the 3 owl-feather features that produce silent flight.', jumpTo: 'silent', answer: 'Comb leading edge (serrated primaries) + fringed trailing edge + velvety dorsal surface. Shifts noise to ~16 kHz, above prey hearing range.' },
              { icon: '🦉', title: 'Owl 3D hearing', prompt: 'How does an owl tell whether a sound came from ABOVE or BELOW its head?', jumpTo: 'senses', answer: 'Ear asymmetry: left ear opening sits higher on the skull than the right. Sound from above hits left ear first by ~30 microseconds; from below, right first. Payne 1962.' },
              { icon: '🧭', title: 'Where the rivers meet', prompt: 'What is the world\'s largest single-site raptor migration count? About how many birds pass through each fall?', jumpTo: 'migration', answer: 'Veracruz River of Raptors (Mexico) — ~5 million birds per fall. Atlantic + Mississippi + Central flyways all converge before crossing into Central America.' },
              { icon: '🐣', title: 'Why eagles are slow to recover', prompt: 'In K-selected raptor demographics, which is the highest-leverage parameter for population growth?', jumpTo: 'lifecycle', answer: 'Adult annual survival. Even small drops (e.g., from lead poisoning) flip λ from growing to declining. Adult breeders are worth 5-10× juveniles demographically.' },
              { icon: '🏆', title: 'DDT recovery', prompt: 'Roughly how many peregrine pairs were left in the lower 48 US at the species\' nadir in 1972?', jumpTo: 'recoveries', answer: 'Fewer than 50. The species was functionally extinct east of the Rockies before the 1972 US DDT ban + The Peregrine Fund\'s captive-breeding program restored it to ~3,200 pairs by 2020.' },
              { icon: '🦅', title: 'Tucker 1998', prompt: 'Why do peregrines fly a logarithmic spiral approach instead of a straight line?', jumpTo: 'spiral', answer: 'Constant retinal angle on the prey — no head turn needed at terminal velocity, no drag penalty. Identical algorithm to AIM-9 Sidewinder missiles.' },
              { icon: '🥚', title: 'What\'s in a pellet?', prompt: 'A barn owl pellet is composed of roughly what proportions of fur vs. bone vs. teeth?', jumpTo: 'pellet', answer: 'About 40-60% fur (matrix), 20-30% bone fragments, ~5% cranium, ~5% loose teeth, 5-15% feathers + bird bones, 0-10% insect chitin.' },
              { icon: '🤝', title: 'Berkutchi', prompt: 'Which species do Mongolian Berkutchi traditionally train, + what prey can it take?', jumpTo: 'falconry', answer: 'Golden eagle (Aquila chrysaetos). Trained to take wolves, foxes, hares from horseback. Tradition dating to ~2000 BCE.' },
              { icon: '⭐', title: 'Pale Male', prompt: 'How long did Pale Male, Manhattan\'s most famous red-tailed hawk, nest at 927 Fifth Avenue?', jumpTo: 'famous', answer: '32 years (1991-2023). Raised 26+ offspring. The 2004 coop-board nest-removal sparked a 12-day public outcry covered by the NYT.' },
              { icon: '🪂', title: 'Wing-loading prediction', prompt: 'A bird with HIGH wing loading + HIGH aspect ratio will hunt how?', jumpTo: 'predictor', answer: 'Falcon-style stoop specialist. Fast level + lethal dive, large turning radius, bad at slow flight. (Peregrine: 8.8 kg/m² / AR 10.2)' }
            ];
            var todayChallenge = challenges[daySeed % challenges.length];
            var revealed = (rh.challengeRevealed === daySeed);
            return h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-700/40 rounded-xl p-4' },
              h('div', { className: 'flex items-baseline justify-between gap-2 mb-2' },
                h('div', { className: 'text-sm font-bold text-purple-300' }, '🎲 Challenge of the Day'),
                h('div', { className: 'text-[10px] text-slate-400 font-mono' }, now.toLocaleDateString())
              ),
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-4xl flex-shrink-0' }, todayChallenge.icon),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-base font-bold text-amber-200 mb-1' }, todayChallenge.title),
                  h('div', { className: 'text-sm text-amber-100/90 leading-relaxed mb-3' }, todayChallenge.prompt),
                  // Action buttons
                  !revealed && h('div', { className: 'flex gap-2 flex-wrap' },
                    h('button', {
                      onClick: function() { setRH({ challengeRevealed: daySeed }); rhAnnounce('Answer revealed'); },
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-700 text-amber-100 hover:bg-purple-600',
                      'aria-label': 'Show answer'
                    }, '👁 Show Answer'),
                    h('button', {
                      onClick: function() {
                        setRH(function(cur) {
                          var visited = Object.assign({}, cur.visited || {});
                          visited[todayChallenge.jumpTo] = (visited[todayChallenge.jumpTo] || 0) + 1;
                          return Object.assign({}, cur, { activeSection: todayChallenge.jumpTo, visited: visited });
                        });
                      },
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-700 hover:to-fuchsia-700',
                      'aria-label': 'Jump to relevant section'
                    }, '↗ Study the topic')
                  ),
                  // Revealed answer
                  revealed && h('div', { className: 'bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-3' },
                    h('div', { className: 'text-xs font-bold text-emerald-300 mb-1' }, '✓ Answer'),
                    h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed mb-2' }, todayChallenge.answer),
                    h('button', {
                      onClick: function() {
                        setRH(function(cur) {
                          var visited = Object.assign({}, cur.visited || {});
                          visited[todayChallenge.jumpTo] = (visited[todayChallenge.jumpTo] || 0) + 1;
                          return Object.assign({}, cur, { activeSection: todayChallenge.jumpTo, visited: visited });
                        });
                      },
                      className: 'text-[10px] text-cyan-300 hover:text-cyan-200 underline',
                      'aria-label': 'Jump to relevant section'
                    }, '↗ Read more in the relevant section')
                  )
                )
              ),
              h('div', { className: 'text-[10px] text-slate-500 italic mt-2 text-right' }, 'New challenge tomorrow.')
            );
          })(),

          // ── NEW v0.11: Progress Tracker ──
          (function() {
            var visited = rh.visited || {};
            var visitedCount = Object.keys(visited).filter(function(k) { return visited[k] > 0; }).length;
            var totalSections = SECTIONS.length;
            var pct = Math.round((visitedCount / totalSections) * 100);
            // Section state by category for compactness
            var groups = [
              { label: '🎮 Interactive Labs', sectionIds: ['hunt', 'hearing', 'pellet', 'spiral', 'acuity', 'predictor'] },
              { label: '🔬 Deep Science', sectionIds: ['talons', 'vision', 'flight', 'stoop', 'silent', 'senses', 'anatomy', 'lifecycle'] },
              { label: '🌍 Ecology + Conservation', sectionIds: ['conservation', 'migration', 'recoveries', 'fieldid'] },
              { label: '📚 Reference + History', sectionIds: ['roster', 'falconry', 'famous', 'glossary', 'quiz', 'resources'] }
            ];
            return h('div', { className: 'bg-gradient-to-br from-indigo-900/30 to-violet-900/30 border border-indigo-700/40 rounded-xl p-4' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'text-sm font-bold text-indigo-300' }, '🗺 Your Tour Progress'),
                h('div', { className: 'text-xs font-mono text-amber-300' }, visitedCount + ' / ' + totalSections + ' sections (' + pct + '%)')
              ),
              // Progress bar
              h('div', { className: 'bg-slate-800 rounded-full h-2.5 overflow-hidden mb-3' },
                h('div', {
                  className: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500 h-full',
                  style: { width: pct + '%' },
                  role: 'progressbar',
                  'aria-valuenow': visitedCount, 'aria-valuemin': 0, 'aria-valuemax': totalSections,
                  'aria-label': pct + ' percent complete'
                })
              ),
              // Section grid by category
              h('div', { className: 'space-y-2' },
                groups.map(function(g, gi) {
                  var groupVisited = g.sectionIds.filter(function(id) { return (visited[id] || 0) > 0; }).length;
                  return h('div', { key: gi },
                    h('div', { className: 'flex items-center justify-between text-[10px] mb-1' },
                      h('span', { className: 'text-indigo-300 font-bold' }, g.label),
                      h('span', { className: 'text-slate-400 font-mono' }, groupVisited + '/' + g.sectionIds.length)
                    ),
                    h('div', { className: 'flex gap-1 flex-wrap' },
                      g.sectionIds.map(function(sid) {
                        var sec = SECTIONS.filter(function(x) { return x.id === sid; })[0];
                        if (!sec) return null;
                        var seen = (visited[sid] || 0) > 0;
                        return h('button', {
                          key: sid,
                          onClick: function() {
                            setRH(function(cur) {
                              var v = Object.assign({}, cur.visited || {});
                              v[sid] = (v[sid] || 0) + 1;
                              return Object.assign({}, cur, { activeSection: sid, visited: v });
                            });
                          },
                          'aria-label': 'Go to ' + sec.label + (seen ? ' (visited)' : ' (not yet visited)'),
                          className: 'flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ' + (seen
                            ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/50 hover:bg-emerald-800/50'
                            : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:bg-slate-700/60 hover:text-slate-200')
                        },
                          h('span', null, seen ? '✓' : '○'),
                          h('span', null, sec.icon),
                          h('span', null, sec.label)
                        );
                      })
                    )
                  );
                })
              ),
              // Reset link
              visitedCount > 0 && h('div', { className: 'text-right mt-2' },
                h('button', {
                  onClick: function() { if (typeof window !== 'undefined' && window.confirm && window.confirm('Reset visit history?')) setRH({ visited: {} }); },
                  className: 'text-[10px] text-slate-500 hover:text-amber-300 italic underline',
                  'aria-label': 'Reset visit history'
                }, 'Reset progress')
              )
            );
          })(),

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
        var rosterView = rh.rosterView || 'cards';
        var rosterSort = rh.rosterSort || 'name';
        var rosterDir = rh.rosterDir || 'asc';
        function setRosterView(v) { setRH({ rosterView: v }); }
        function setRosterSort(s) {
          // Toggle direction if same column
          if (rosterSort === s) {
            setRH({ rosterDir: rosterDir === 'asc' ? 'desc' : 'asc' });
          } else {
            setRH({ rosterSort: s, rosterDir: 'asc' });
          }
        }
        // Sort SPECIES for the table view
        var sortedSpecies = SPECIES.slice().sort(function(a, b) {
          var va = a[rosterSort], vb = b[rosterSort];
          if (typeof va === 'string') {
            return rosterDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          }
          return rosterDir === 'asc' ? va - vb : vb - va;
        });
        function sortHeader(key, label) {
          var active = rosterSort === key;
          var arrow = active ? (rosterDir === 'asc' ? ' ↑' : ' ↓') : '';
          return h('th', {
            onClick: function() { setRosterSort(key); },
            className: 'pb-2 px-2 text-left cursor-pointer ' + (active ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'),
            scope: 'col',
            'aria-sort': active ? (rosterDir === 'asc' ? 'ascending' : 'descending') : 'none',
            'aria-label': label + (active ? ' (sorted ' + (rosterDir === 'asc' ? 'ascending' : 'descending') + ')' : '')
          }, label + arrow);
        }
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
            h('div', { className: 'text-sm text-amber-200/80' }, 'Tap a species card or row to make it the active raptor for the Hunt Sim + science modules.'),
            // View toggle (3 modes now)
            h('div', { className: 'flex gap-1 bg-slate-800/60 rounded-lg p-1' },
              ['cards', 'table', 'duel'].map(function(v) {
                var active = rosterView === v;
                var labels = { cards: '🎴 Cards', table: '📊 Compare', duel: '🆚 Duel' };
                return h('button', {
                  key: v,
                  onClick: function() { setRosterView(v); },
                  className: 'px-3 py-1 rounded text-xs font-bold transition-all ' + (active
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                    : 'text-slate-300 hover:text-amber-200'),
                  'aria-label': v === 'cards' ? 'Show as cards' : v === 'table' ? 'Show as comparison table' : '2-species side-by-side duel',
                  'aria-pressed': active
                }, labels[v]);
              })
            )
          ),

          // ── NEW v0.15: Duel Mode ──
          rosterView === 'duel' && (function() {
            var duelA = rh.duelA || 'peregrine';
            var duelB = rh.duelB || 'harpyEagle';
            var spA = findSpecies(duelA);
            var spB = findSpecies(duelB);
            function setDuel(side, id) { setRH(side === 'A' ? { duelA: id } : { duelB: id }); }
            // Stats to compare (with directional meaning)
            var stats = [
              { key: 'massKg', label: 'Mass (kg)', higher: 'heavier' },
              { key: 'wingspanM', label: 'Wingspan (m)', higher: 'larger' },
              { key: 'wingLoading', label: 'Wing loading (kg/m²)', higher: 'faster' },
              { key: 'aspectRatio', label: 'Aspect ratio', higher: 'better soarer' },
              { key: 'maxLevelMph', label: 'Max level speed (mph)', higher: 'faster' },
              { key: 'stoopMph', label: 'Stoop speed (mph)', higher: 'faster dive' },
              { key: 'talonForcePsi', label: 'Talon grip (psi)', higher: 'stronger' },
              { key: 'talonLengthMm', label: 'Talon length (mm)', higher: 'longer reach' },
              { key: 'visualAcuityX', label: 'Visual acuity (× human)', higher: 'sharper' },
              { key: 'visualFieldDeg', label: 'Visual field (°)', higher: 'wider' },
              { key: 'pullupG', label: 'Pull-up G tolerance', higher: 'tougher' }
            ];
            function rowColor(a, b) {
              if (a > b) return 'aWins';
              if (b > a) return 'bWins';
              return 'tied';
            }
            return h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-xl p-4' },
                h('div', { className: 'text-sm font-bold text-amber-300 mb-2' }, '🆚 Pick Two Species'),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  // Side A selector
                  h('div', { className: 'bg-slate-900/40 rounded-lg p-3 border border-amber-700/40' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-amber-300 mb-2 text-center' }, 'A'),
                    h('select', {
                      value: duelA, onChange: function(e) { setDuel('A', e.target.value); },
                      className: 'w-full px-2 py-1.5 rounded bg-slate-800 text-amber-100 border border-slate-700 text-sm',
                      'aria-label': 'Species A'
                    },
                      SPECIES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + s.name); })
                    ),
                    h('div', { className: 'text-center mt-2' },
                      h('div', { className: 'text-3xl' }, spA.emoji),
                      h('div', { className: 'text-xs text-amber-200 italic' }, spA.scientific)
                    )
                  ),
                  // Side B selector
                  h('div', { className: 'bg-slate-900/40 rounded-lg p-3 border border-orange-700/40' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-orange-300 mb-2 text-center' }, 'B'),
                    h('select', {
                      value: duelB, onChange: function(e) { setDuel('B', e.target.value); },
                      className: 'w-full px-2 py-1.5 rounded bg-slate-800 text-orange-100 border border-slate-700 text-sm',
                      'aria-label': 'Species B'
                    },
                      SPECIES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + s.name); })
                    ),
                    h('div', { className: 'text-center mt-2' },
                      h('div', { className: 'text-3xl' }, spB.emoji),
                      h('div', { className: 'text-xs text-orange-200 italic' }, spB.scientific)
                    )
                  )
                )
              ),
              // Stat-by-stat duel
              h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-3' },
                h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '📊 Head-to-head Stats'),
                h('div', { className: 'space-y-1' },
                  stats.map(function(stat, i) {
                    var a = spA[stat.key], b = spB[stat.key];
                    var winner = rowColor(a, b);
                    var aWins = winner === 'aWins';
                    var bWins = winner === 'bWins';
                    return h('div', { key: i, className: 'grid grid-cols-7 gap-1 items-center bg-slate-800/40 rounded p-1.5' },
                      h('div', { className: 'col-span-2 text-right text-xs font-mono ' + (aWins ? 'text-emerald-300 font-bold' : 'text-slate-400') }, a),
                      h('div', { className: 'col-span-3 text-center text-[10px] text-slate-300' },
                        h('div', { className: 'font-bold' }, stat.label),
                        h('div', { className: 'text-slate-500' }, '(↑ = ' + stat.higher + ')')
                      ),
                      h('div', { className: 'col-span-2 text-left text-xs font-mono ' + (bWins ? 'text-emerald-300 font-bold' : 'text-slate-400') }, b)
                    );
                  })
                )
              ),
              // Win summary
              (function() {
                var aWins = 0, bWins = 0;
                stats.forEach(function(stat) {
                  var c = rowColor(spA[stat.key], spB[stat.key]);
                  if (c === 'aWins') aWins++;
                  else if (c === 'bWins') bWins++;
                });
                var winner = aWins > bWins ? 'A' : (bWins > aWins ? 'B' : null);
                return h('div', { className: 'bg-gradient-to-br from-' + (winner === 'A' ? 'emerald' : winner === 'B' ? 'amber' : 'slate') + '-900/30 to-slate-900/30 border border-amber-700/40 rounded-xl p-4 text-center' },
                  h('div', { className: 'text-lg font-bold text-amber-300 mb-1' }, '🏆 Stat-Sheet Winner'),
                  h('div', { className: 'text-2xl my-1' }, winner === 'A' ? spA.emoji + ' ' + spA.name : winner === 'B' ? spB.emoji + ' ' + spB.name : '⚖ Tied'),
                  h('div', { className: 'text-xs text-slate-300' }, aWins + ' stats vs ' + bWins + ' stats out of ' + stats.length),
                  h('div', { className: 'text-[10px] text-slate-500 italic mt-2' }, 'Note: "winning" on stats ≠ winning in nature. Each species evolved for its specific niche. A peregrine in a forest loses to a goshawk; a harpy in open desert loses to a golden eagle.')
                );
              })(),
              // Activate buttons
              h('div', { className: 'flex gap-2 justify-center' },
                h('button', {
                  onClick: function() { setRH({ selectedSpecies: duelA }); rhAnnounce(spA.name + ' selected for Hunt Sim'); },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-amber-300 hover:bg-slate-600',
                  'aria-label': 'Select A for Hunt Sim'
                }, '→ Use ' + spA.name + ' in Hunt Sim'),
                h('button', {
                  onClick: function() { setRH({ selectedSpecies: duelB }); rhAnnounce(spB.name + ' selected for Hunt Sim'); },
                  className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-orange-300 hover:bg-slate-600',
                  'aria-label': 'Select B for Hunt Sim'
                }, '→ Use ' + spB.name + ' in Hunt Sim')
              )
            );
          })(),

          // ── NEW v0.10: Comparison Table View ──
          rosterView === 'table' && h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-xs text-slate-400 italic mb-2' }, 'Click any column header to sort by that field. Click any row to make that species active.'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-xs', 'aria-label': 'Raptor species comparison table' },
                h('thead', null,
                  h('tr', { className: 'border-b border-slate-700' },
                    sortHeader('name', 'Species'),
                    sortHeader('massKg', 'Mass (kg)'),
                    sortHeader('wingspanM', 'Wingspan (m)'),
                    sortHeader('wingLoading', 'Wing loading'),
                    sortHeader('aspectRatio', 'AR'),
                    sortHeader('maxLevelMph', 'Level (mph)'),
                    sortHeader('stoopMph', 'Stoop (mph)'),
                    sortHeader('talonForcePsi', 'Talon (psi)'),
                    sortHeader('talonLengthMm', 'Talon (mm)'),
                    sortHeader('visualAcuityX', 'Acuity ×'),
                    sortHeader('visualFieldDeg', 'FOV°')
                  )
                ),
                h('tbody', null,
                  sortedSpecies.map(function(s, i) {
                    var isActive = s.id === selectedSpecies;
                    return h('tr', {
                      key: s.id,
                      onClick: function() { setRH({ selectedSpecies: s.id }); rhAnnounce(s.name + ' selected'); },
                      className: 'border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 ' + (isActive ? 'bg-amber-900/20 ring-1 ring-amber-500/50' : ''),
                      'aria-label': 'Select ' + s.name + (isActive ? ' (currently active)' : '')
                    },
                      h('td', { className: 'py-1.5 px-2' },
                        h('span', { className: 'mr-1' }, s.emoji),
                        h('span', { className: 'text-amber-200 font-bold' }, s.name)
                      ),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.massKg),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.wingspanM),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.wingLoading),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.aspectRatio),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.maxLevelMph),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.stoopMph),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.talonForcePsi),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.talonLengthMm),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.visualAcuityX),
                      h('td', { className: 'py-1.5 px-2 font-mono text-amber-300' }, s.visualFieldDeg)
                    );
                  })
                )
              )
            ),
            h('div', { className: 'text-[10px] text-slate-500 italic mt-2' }, 'Try sorting by Talon (psi) to see who has the strongest grip (golden eagle), or by Wing loading to see who\'s built for speed (peregrine vs harpy).')
          ),

          rosterView === 'cards' && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
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
          ),

          // ── NEW v0.14: Achievement Panel ──
          (function() {
            // Aggregate stats across all species
            var allCatches = 0, allAttempts = 0, bestRunAllSpecies = 0;
            var speciesHunted = 0;
            Object.keys(huntStats).forEach(function(sid) {
              var s = huntStats[sid];
              if (s) {
                allCatches += s.catches || 0;
                allAttempts += s.attempts || 0;
                bestRunAllSpecies = Math.max(bestRunAllSpecies, s.bestRun || 0);
                if ((s.catches || 0) > 0) speciesHunted++;
              }
            });
            var accuracy = allAttempts > 0 ? Math.round((allCatches / allAttempts) * 100) : 0;
            // Achievement definitions
            var achievements = [
              { id: 'firstCatch', icon: '🎯', label: 'First Catch', desc: 'Catch your first prey', cond: allCatches >= 1 },
              { id: 'tenCatches', icon: '🏹', label: 'Ten Catches', desc: 'Catch 10 prey total', cond: allCatches >= 10 },
              { id: 'fiftyCatches', icon: '🦅', label: 'Apex Predator', desc: 'Catch 50 prey total', cond: allCatches >= 50 },
              { id: 'hundredCatches', icon: '⭐', label: 'Hunter\'s Century', desc: 'Catch 100 prey total', cond: allCatches >= 100 },
              { id: 'cleanRun5', icon: '🔥', label: 'Hot Streak', desc: 'Best run of 5+ catches', cond: bestRunAllSpecies >= 5 },
              { id: 'cleanRun10', icon: '💎', label: 'Untouchable', desc: 'Best run of 10+ catches', cond: bestRunAllSpecies >= 10 },
              { id: 'sharpEye', icon: '👁', label: 'Sharp Eye', desc: '50%+ hit rate (min 10 attempts)', cond: allAttempts >= 10 && accuracy >= 50 },
              { id: 'masterEye', icon: '🪶', label: 'Master Hunter', desc: '70%+ hit rate (min 20 attempts)', cond: allAttempts >= 20 && accuracy >= 70 },
              { id: 'threeSpecies', icon: '🦅', label: 'Generalist', desc: 'Catch with 3 different species', cond: speciesHunted >= 3 },
              { id: 'fiveSpecies', icon: '👑', label: 'Versatile Falconer', desc: 'Catch with 5 different species', cond: speciesHunted >= 5 },
              { id: 'allSpecies', icon: '🏆', label: 'Master of All', desc: 'Catch with all 8 species', cond: speciesHunted >= 8 }
            ];
            var earnedCount = achievements.filter(function(a) { return a.cond; }).length;
            return h('div', { className: 'bg-slate-900/40 border border-amber-700/40 rounded-xl p-4' },
              h('div', { className: 'flex items-center justify-between gap-2 mb-3' },
                h('div', { className: 'text-sm font-bold text-amber-300' }, '🏅 Achievements'),
                h('div', { className: 'text-xs font-mono text-amber-300' }, earnedCount + ' / ' + achievements.length + ' earned')
              ),
              // Progress bar
              h('div', { className: 'bg-slate-800 rounded-full h-2 overflow-hidden mb-3' },
                h('div', {
                  className: 'bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all',
                  style: { width: ((earnedCount / achievements.length) * 100) + '%' },
                  role: 'progressbar',
                  'aria-valuenow': earnedCount, 'aria-valuemin': 0, 'aria-valuemax': achievements.length
                })
              ),
              // Aggregate stats
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-center text-xs' },
                h('div', { className: 'bg-emerald-900/30 border border-emerald-700/40 rounded p-2' },
                  h('div', { className: 'text-xl font-bold text-emerald-300' }, allCatches),
                  h('div', { className: 'text-[10px] text-emerald-200 uppercase' }, 'Total catches')
                ),
                h('div', { className: 'bg-blue-900/30 border border-blue-700/40 rounded p-2' },
                  h('div', { className: 'text-xl font-bold text-blue-300' }, accuracy + '%'),
                  h('div', { className: 'text-[10px] text-blue-200 uppercase' }, 'Hit rate')
                ),
                h('div', { className: 'bg-amber-900/30 border border-amber-700/40 rounded p-2' },
                  h('div', { className: 'text-xl font-bold text-amber-300' }, bestRunAllSpecies),
                  h('div', { className: 'text-[10px] text-amber-200 uppercase' }, 'Best run')
                ),
                h('div', { className: 'bg-purple-900/30 border border-purple-700/40 rounded p-2' },
                  h('div', { className: 'text-xl font-bold text-purple-300' }, speciesHunted + '/8'),
                  h('div', { className: 'text-[10px] text-purple-200 uppercase' }, 'Species used')
                )
              ),
              // Badge grid
              h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
                achievements.map(function(a) {
                  return h('div', {
                    key: a.id,
                    className: 'flex items-start gap-2 p-2 rounded ' + (a.cond
                      ? 'bg-amber-900/30 border border-amber-700/50'
                      : 'bg-slate-800/30 border border-slate-700/40 opacity-40'),
                    'aria-label': a.label + (a.cond ? ' (earned)' : ' (locked)')
                  },
                    h('div', { className: 'text-2xl flex-shrink-0' }, a.cond ? a.icon : '🔒'),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold ' + (a.cond ? 'text-amber-300' : 'text-slate-500') }, a.label),
                      h('div', { className: 'text-[10px] text-slate-300' }, a.desc)
                    )
                  );
                })
              ),
              // Per-species breakdown
              speciesHunted > 0 && h('details', { className: 'mt-3' },
                h('summary', { className: 'text-xs font-bold text-amber-300 cursor-pointer' }, '📊 Per-species breakdown'),
                h('div', { className: 'mt-2 grid grid-cols-1 md:grid-cols-2 gap-1' },
                  SPECIES.map(function(s) {
                    var st = huntStats[s.id] || { catches: 0, attempts: 0, bestRun: 0 };
                    if (st.attempts === 0) return null;
                    var rate = st.attempts > 0 ? Math.round((st.catches / st.attempts) * 100) : 0;
                    return h('div', { key: s.id, className: 'flex items-center gap-2 bg-slate-800/40 rounded p-1.5 text-xs' },
                      h('span', null, s.emoji),
                      h('span', { className: 'text-amber-200 flex-1' }, s.name),
                      h('span', { className: 'font-mono text-slate-300' }, st.catches + '/' + st.attempts + ' = ' + rate + '%')
                    );
                  }).filter(Boolean)
                )
              )
            );
          })()
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
          ),

          // ── NEW v0.8: Talon vs Prey Calculator ──
          (function() {
            var tvp = rh.talonVsPrey || { predatorId: 'peregrine', preyId: 'pigeon' };
            function setTVP(patch) { setRH({ talonVsPrey: Object.assign({}, tvp, patch) }); }
            // Prey toughness data — approximate crush resistance + skull/spine breaking psi + size factor
            var PREY_TOUGHNESS = {
              pigeon:       { name: 'Pigeon', massKg: 0.35, skullPsi: 50, vitalDepthMm: 8, type: 'bird' },
              songbird:     { name: 'Songbird (sparrow)', massKg: 0.03, skullPsi: 35, vitalDepthMm: 5, type: 'bird' },
              duck:         { name: 'Duck (mallard)', massKg: 1.1, skullPsi: 65, vitalDepthMm: 10, type: 'bird' },
              fish:         { name: 'Fish (trout)', massKg: 0.8, skullPsi: 40, vitalDepthMm: 15, type: 'fish' },
              rodent:       { name: 'Field Mouse / Rodent', massKg: 0.025, skullPsi: 25, vitalDepthMm: 4, type: 'mammal-small' },
              rabbit:       { name: 'Cottontail Rabbit', massKg: 1.0, skullPsi: 80, vitalDepthMm: 12, type: 'mammal-med' },
              snake:        { name: 'Snake', massKg: 0.3, skullPsi: 30, vitalDepthMm: 6, type: 'reptile' },
              skunk:        { name: 'Skunk', massKg: 2.5, skullPsi: 120, vitalDepthMm: 18, type: 'mammal-med' },
              sloth:        { name: 'Three-toed Sloth', massKg: 4.0, skullPsi: 200, vitalDepthMm: 22, type: 'mammal-med' },
              monkey:       { name: 'Howler Monkey', massKg: 7.0, skullPsi: 280, vitalDepthMm: 28, type: 'mammal-large' },
              fawn:         { name: 'White-tailed Fawn', massKg: 4.5, skullPsi: 250, vitalDepthMm: 25, type: 'mammal-med' },
              fox:          { name: 'Red Fox', massKg: 5.0, skullPsi: 300, vitalDepthMm: 24, type: 'mammal-med' },
              grouse:       { name: 'Ruffed Grouse', massKg: 0.6, skullPsi: 55, vitalDepthMm: 9, type: 'bird' }
            };
            var prey = PREY_TOUGHNESS[tvp.preyId] || PREY_TOUGHNESS.pigeon;
            var predator = findSpecies(tvp.predatorId);
            // Verdict logic
            var gripRatio = predator.talonForcePsi / prey.skullPsi;
            var reachRatio = predator.talonLengthMm / prey.vitalDepthMm;
            var verdict, verdictColor, verdictEmoji, verdictDetail;
            if (gripRatio >= 2 && reachRatio >= 1) {
              verdict = 'CLEAN KILL'; verdictEmoji = '⚡'; verdictColor = 'emerald';
              verdictDetail = 'Grip force ' + gripRatio.toFixed(1) + '× crush threshold + talon reach exceeds vital depth. Prey is dispatched instantly via crushed cranium or severed spine.';
            } else if (gripRatio >= 1 && reachRatio >= 0.8) {
              verdict = 'LETHAL (slower)'; verdictEmoji = '✓'; verdictColor = 'amber';
              verdictDetail = 'Talons can puncture + immobilize prey but lack the force or reach for instant kill. Death from blood loss + organ damage within 1-3 minutes.';
            } else if (gripRatio >= 0.5 || reachRatio >= 0.6) {
              verdict = 'STRUGGLE / RISK INJURY'; verdictEmoji = '⚠'; verdictColor = 'orange';
              verdictDetail = 'Predator can engage but talons may not penetrate to vital organs. Prey can escape or counterattack — high risk of raptor injury (broken talon, cracked beak, sprained leg).';
            } else {
              verdict = 'PREY TOO LARGE / TOUGH'; verdictEmoji = '✗'; verdictColor = 'red';
              verdictDetail = 'Mismatch: grip force ' + gripRatio.toFixed(1) + '× crush threshold (need ≥1.0) + talon reach ' + reachRatio.toFixed(1) + '× vital depth (need ≥0.8). This predator would not pursue this prey — energy cost + injury risk exceed reward.';
            }

            return h('div', { className: 'bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-700/40 rounded-xl p-5 space-y-3 mt-3' },
              h('div', { className: 'text-base font-bold text-red-300' }, '🎯 Talon vs Prey: Can the Grip Actually Kill?'),
              h('div', { className: 'text-xs text-red-100/90 leading-relaxed' },
                'Grip force PSI alone doesn\'t determine lethality — it has to be matched against the specific prey\'s skull/spine crush threshold AND the talon has to be long enough to reach vital organs. Try different predator-prey pairings to see which combinations actually work.'
              ),
              // Selector row
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                h('div', null,
                  h('label', { className: 'text-xs text-amber-300 font-bold block mb-1' }, '🦅 Predator'),
                  h('select', {
                    value: tvp.predatorId,
                    onChange: function(e) { setTVP({ predatorId: e.target.value }); },
                    className: 'w-full px-3 py-2 rounded-lg bg-slate-800 text-amber-100 border border-slate-700 text-sm',
                    'aria-label': 'Choose predator'
                  },
                    SPECIES.map(function(s) {
                      return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + s.name + ' (' + s.talonForcePsi + ' psi, ' + s.talonLengthMm + ' mm talon)');
                    })
                  )
                ),
                h('div', null,
                  h('label', { className: 'text-xs text-amber-300 font-bold block mb-1' }, '🐭 Prey'),
                  h('select', {
                    value: tvp.preyId,
                    onChange: function(e) { setTVP({ preyId: e.target.value }); },
                    className: 'w-full px-3 py-2 rounded-lg bg-slate-800 text-amber-100 border border-slate-700 text-sm',
                    'aria-label': 'Choose prey'
                  },
                    Object.keys(PREY_TOUGHNESS).map(function(k) {
                      var p = PREY_TOUGHNESS[k];
                      return h('option', { key: k, value: k }, p.name + ' (' + p.massKg + ' kg)');
                    })
                  )
                )
              ),
              // Computation table
              h('div', { className: 'bg-slate-900/60 rounded-lg p-3' },
                h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 text-xs' },
                  h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                    h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Grip Force'),
                    h('div', { className: 'font-mono font-bold text-amber-300' }, predator.talonForcePsi + ' psi')
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                    h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Prey Crush Threshold'),
                    h('div', { className: 'font-mono font-bold text-amber-300' }, prey.skullPsi + ' psi')
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                    h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Talon Length'),
                    h('div', { className: 'font-mono font-bold text-amber-300' }, predator.talonLengthMm + ' mm')
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                    h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Prey Vital Depth'),
                    h('div', { className: 'font-mono font-bold text-amber-300' }, prey.vitalDepthMm + ' mm')
                  )
                ),
                h('div', { className: 'mt-2 text-[10px] text-slate-400 text-center font-mono' },
                  'Grip ratio: ' + gripRatio.toFixed(2) + '× · Reach ratio: ' + reachRatio.toFixed(2) + '× (need both ≥ ~1.0 for clean kill)'
                )
              ),
              // Verdict
              h('div', { className: 'bg-' + verdictColor + '-900/40 border-2 border-' + verdictColor + '-500 rounded-xl p-4 text-center' },
                h('div', { className: 'text-4xl mb-1' }, verdictEmoji),
                h('div', { className: 'text-lg font-bold text-' + verdictColor + '-300 mb-2' }, verdict),
                h('div', { className: 'text-xs text-' + verdictColor + '-100/90 leading-relaxed' }, verdictDetail)
              ),
              // Pedagogical note
              h('div', { className: 'text-[10px] text-slate-500 italic' },
                'Note: real predator-prey relationships are also shaped by encounter rate, prey availability, learned hunting skill, energetic balance, + group dynamics. This calculator captures one factor (mechanical kill feasibility) — not the full ecology.'
              )
            );
          })()
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
          ),

          // ── NEW v0.8: Visual-field SVG diagram ──
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-indigo-300 mb-2' }, '🎯 Visual Field — Top-Down View'),
            h('div', { className: 'text-xs text-slate-400 mb-3 italic' }, 'Each diagram shows the bird/human looking up at the page (head viewed from above). Yellow = binocular zone (depth perception). Orange = monocular zones (peripheral, no depth). Gray = blind spot behind head.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              // Helper to draw a head-from-above with field cones
              [
                { label: 'Human', acuity: '1×', totalField: 180, binocular: 120, eyePosition: 'forward', color: 'slate' },
                { label: 'Hawk / Eagle', acuity: '4-5×', totalField: 220, binocular: 35, eyePosition: 'lateral-forward', color: 'amber' },
                { label: 'Owl', acuity: '2×', totalField: 110, binocular: 70, eyePosition: 'forward-flat', color: 'indigo' }
              ].map(function(v, i) {
                // Compute SVG: head at (100,100) viewBox 200x180; bird is "looking up the screen" (north)
                var headR = 30;
                var fov = v.totalField; // degrees
                var bin = v.binocular;
                // Convert to SVG angles (forward = -90° in SVG which is -y axis)
                // Monocular zones extend symmetrically
                var halfFov = fov / 2; // each side
                var halfBin = bin / 2;
                // Render arcs as paths
                // Forward direction in SVG: angle = -90 (pointing up the screen)
                function polarToSvg(angleDeg, r) {
                  var a = (angleDeg - 90) * Math.PI / 180;
                  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
                }
                var rField = 80;
                // Left side total field: from (-halfFov) to (-halfBin) is monocular left
                // Center (-halfBin to +halfBin) is binocular
                // Right (+halfBin to +halfFov) is monocular right
                function arcPath(startDeg, endDeg) {
                  var s = polarToSvg(startDeg, rField);
                  var e = polarToSvg(endDeg, rField);
                  var largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
                  return 'M 100 100 L ' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) +
                         ' A ' + rField + ' ' + rField + ' 0 ' + largeArc + ' 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + ' Z';
                }
                return h('div', { key: i, className: 'bg-slate-800/40 rounded-lg p-3 text-center' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, v.label),
                  h('div', { className: 'text-[10px] text-slate-400 mb-2 font-mono' }, 'Total: ' + v.totalField + '° · Binocular: ' + v.binocular + '° · Acuity: ' + v.acuity),
                  h('svg', { viewBox: '0 0 200 180', style: { width: '100%', height: '140px' }, role: 'img', 'aria-label': v.label + ' visual field' },
                    // Backdrop circle (blind spot zone)
                    h('circle', { cx: 100, cy: 100, r: rField + 4, fill: '#1e293b', opacity: 0.4 }),
                    // Monocular left
                    h('path', { d: arcPath(-halfFov, -halfBin), fill: '#fb923c', opacity: 0.55 }),
                    // Monocular right
                    h('path', { d: arcPath(halfBin, halfFov), fill: '#fb923c', opacity: 0.55 }),
                    // Binocular center
                    h('path', { d: arcPath(-halfBin, halfBin), fill: '#fde047', opacity: 0.7 }),
                    // Head circle
                    h('circle', { cx: 100, cy: 100, r: headR, fill: '#78350f', stroke: '#fbbf24', strokeWidth: 2 }),
                    // Eyes - placement depends on type
                    (function() {
                      if (v.eyePosition === 'forward') {
                        return [h('circle', { key: 'le', cx: 90, cy: 78, r: 5, fill: '#fefce8' }),
                                h('circle', { key: 're', cx: 110, cy: 78, r: 5, fill: '#fefce8' }),
                                h('circle', { key: 'lp', cx: 90, cy: 78, r: 2.5, fill: '#1c1917' }),
                                h('circle', { key: 'rp', cx: 110, cy: 78, r: 2.5, fill: '#1c1917' })];
                      }
                      if (v.eyePosition === 'forward-flat') {
                        return [h('circle', { key: 'le', cx: 85, cy: 80, r: 8, fill: '#fefce8' }),
                                h('circle', { key: 're', cx: 115, cy: 80, r: 8, fill: '#fefce8' }),
                                h('circle', { key: 'lp', cx: 85, cy: 80, r: 5, fill: '#1c1917' }),
                                h('circle', { key: 'rp', cx: 115, cy: 80, r: 5, fill: '#1c1917' })];
                      }
                      // lateral-forward (hawk/eagle) — eyes set wider
                      return [h('circle', { key: 'le', cx: 78, cy: 85, r: 5, fill: '#fefce8' }),
                              h('circle', { key: 're', cx: 122, cy: 85, r: 5, fill: '#fefce8' }),
                              h('circle', { key: 'lp', cx: 78, cy: 85, r: 2.5, fill: '#1c1917' }),
                              h('circle', { key: 'rp', cx: 122, cy: 85, r: 2.5, fill: '#1c1917' })];
                    })(),
                    // Beak
                    h('path', { d: 'M 100 70 L 95 60 L 105 60 Z', fill: '#fbbf24' }),
                    // Forward direction indicator
                    h('path', { d: 'M 100 30 L 96 40 L 104 40 Z', fill: '#fde047', opacity: 0.6 }),
                    h('text', { x: 100, y: 22, fontSize: 8, fill: '#94a3b8', textAnchor: 'middle' }, '↑ forward')
                  )
                );
              })
            ),
            h('div', { className: 'text-[10px] text-slate-500 italic mt-2' },
              'Hawk eyes are set on the sides — total field 220°, but binocular zone is just 35° (narrow forward overlap). Owls have eyes on the front of the face — total field only 110° but binocular zone 70° (twice that of hawks). Humans are intermediate. Tradeoff: wide field of view (hawk) vs deep binocular depth perception (owl).'
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
          ),

          // ── NEW v0.12: Glide Ratio Calculator ──
          (function() {
            var gr = rh.gliderCalc || { speciesId: 'baldEagle', startAltM: 500, thermalLift: 1.5 };
            function setGR(patch) { setRH({ gliderCalc: Object.assign({}, gr, patch) }); }
            var sp2 = findSpecies(gr.speciesId);
            // Approximate glide ratio L/D from aspect ratio (Tucker 1973 approx)
            // L/D_max ≈ 0.5 + 1.5 * AR for soaring birds (rough)
            var glideRatio = 0.5 + 1.5 * sp2.aspectRatio;
            // Cap at realistic max ~16 (albatross-level)
            glideRatio = Math.min(16, glideRatio);
            // Distance covered per altitude lost
            var distanceM = gr.startAltM * glideRatio;
            var distanceKm = distanceM / 1000;
            var distanceMi = distanceM * 0.000621371;
            // With thermal lift = effectively extends glide range
            // Net sink rate = (sink without lift) - (thermal lift). If lift > sink, bird never lands.
            var sinkRateMps = 1.0; // baseline avian sink rate at best L/D
            var netSink = sinkRateMps - gr.thermalLift;
            var enhancedDistanceKm;
            var infiniteGlide = false;
            if (netSink <= 0) {
              infiniteGlide = true;
              enhancedDistanceKm = 999;
            } else {
              enhancedDistanceKm = (gr.startAltM * glideRatio * sinkRateMps / netSink) / 1000;
            }
            return h('div', { className: 'bg-slate-900/40 border border-cyan-700/40 rounded-xl p-4 space-y-3 mt-3' },
              h('div', { className: 'text-sm font-bold text-cyan-300' }, '🪁 Glide Ratio Calculator'),
              h('div', { className: 'text-xs text-slate-400 italic' }, 'Glide ratio (L/D) is the distance a bird can cover per unit altitude lost in still air. High aspect ratio = high L/D = efficient soaring. Thermal lift extends range further (or makes flight "free" if lift > sink rate).'),
              // Species + sliders
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                h('div', null,
                  h('label', { className: 'text-xs text-cyan-300 font-bold block mb-1' }, '🦅 Species'),
                  h('select', {
                    value: gr.speciesId,
                    onChange: function(e) { setGR({ speciesId: e.target.value }); },
                    className: 'w-full px-3 py-2 rounded-lg bg-slate-800 text-amber-100 border border-slate-700 text-sm',
                    'aria-label': 'Species'
                  },
                    SPECIES.map(function(s) { return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + s.name + ' (AR ' + s.aspectRatio + ')'); })
                  )
                ),
                h('div', null,
                  h('label', { className: 'text-xs text-cyan-300 flex justify-between' },
                    h('span', null, 'Start altitude'),
                    h('span', { className: 'font-mono text-amber-300' }, gr.startAltM + ' m')
                  ),
                  h('input', { type: 'range', min: 100, max: 3000, step: 100, value: gr.startAltM,
                    onInput: function(e) { setGR({ startAltM: parseInt(e.target.value) }); }, className: 'w-full',
                    'aria-label': 'Start altitude' }),
                  h('div', { className: 'text-[10px] text-slate-500' }, '500 m typical · 3000 m alpine soar')
                ),
                h('div', null,
                  h('label', { className: 'text-xs text-cyan-300 flex justify-between' },
                    h('span', null, 'Thermal lift (m/s)'),
                    h('span', { className: 'font-mono text-amber-300' }, gr.thermalLift.toFixed(1))
                  ),
                  h('input', { type: 'range', min: 0, max: 3.0, step: 0.1, value: gr.thermalLift,
                    onInput: function(e) { setGR({ thermalLift: parseFloat(e.target.value) }); }, className: 'w-full',
                    'aria-label': 'Thermal lift' }),
                  h('div', { className: 'text-[10px] text-slate-500' }, '0 = still air · 1.0 weak · 2.5 strong')
                )
              ),
              // Results
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-cyan-400' }, 'L/D Ratio'),
                  h('div', { className: 'text-xl font-bold text-amber-300' }, glideRatio.toFixed(1)),
                  h('div', { className: 'text-[10px] text-slate-500' }, 'from AR ' + sp2.aspectRatio)
                ),
                h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-cyan-400' }, 'Still-air distance'),
                  h('div', { className: 'text-xl font-bold text-amber-300' }, distanceKm.toFixed(1) + ' km'),
                  h('div', { className: 'text-[10px] text-slate-500' }, '(' + distanceMi.toFixed(1) + ' miles)')
                ),
                h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-cyan-400' }, 'With thermal'),
                  h('div', { className: 'text-xl font-bold text-amber-300' }, infiniteGlide ? '∞' : enhancedDistanceKm.toFixed(1) + ' km'),
                  h('div', { className: 'text-[10px] text-slate-500' }, infiniteGlide ? 'lift exceeds sink' : 'extended')
                ),
                h('div', { className: 'bg-slate-800/40 rounded p-2 text-center' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-cyan-400' }, 'Net sink'),
                  h('div', { className: 'text-xl font-bold text-amber-300' }, infiniteGlide ? '↑ lift wins' : netSink.toFixed(1) + ' m/s'),
                  h('div', { className: 'text-[10px] text-slate-500' }, 'after thermal')
                )
              ),
              // Visualization SVG
              (function() {
                var pw = 600, ph = 90;
                var pixPerKm = (pw - 40) / Math.max(50, distanceKm * 1.3);
                var birdX = 20;
                var glideEndX = 20 + distanceKm * pixPerKm;
                return h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Glide ratio visualization' },
                  h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
                  // Ground line
                  h('line', { x1: 0, y1: ph - 15, x2: pw, y2: ph - 15, stroke: '#365314', strokeWidth: 3 }),
                  // Bird start position (high)
                  h('text', { x: birdX, y: 25, fontSize: 20, textAnchor: 'middle' }, sp2.emoji),
                  h('text', { x: birdX, y: 45, fontSize: 9, fill: '#fde047', textAnchor: 'middle' }, gr.startAltM + 'm'),
                  // Glide line
                  h('line', { x1: birdX, y1: 30, x2: Math.min(glideEndX, pw - 30), y2: ph - 15, stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4,4' }),
                  // Landing point
                  glideEndX < pw - 30 && h('g', null,
                    h('circle', { cx: glideEndX, cy: ph - 15, r: 4, fill: '#fbbf24' }),
                    h('text', { x: glideEndX, y: ph - 22, fontSize: 9, fill: '#fbbf24', textAnchor: 'middle' }, distanceKm.toFixed(1) + ' km')
                  ),
                  // Distance ruler
                  h('text', { x: pw / 2, y: ph - 2, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, '→ horizontal distance →')
                );
              })(),
              h('div', { className: 'text-[10px] text-slate-500 italic' },
                'Bald eagles (AR 6.5) glide ~10:1 — 1 km horizontal per 100 m altitude lost. Albatross-class (AR 15) hit ~22:1. Falcons (lower AR ~10) sit around 16:1 but rarely use it — they\'re built for stoop, not soaring.'
              )
            );
          })()
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
          ),

          // ── NEW v0.9: Fall-curve time-domain plot ──
          (function() {
            // Numerical integration of fall with drag — produces altitude(t) + velocity(t)
            var rho = 1.225;
            var g = 9.81;
            // Solve: dv/dt = g - (rho * Cd * A * v²) / (2 * m)
            var m = v.mass, cd = v.cd, A = v.area;
            var dt = 0.05;
            var pts = [];
            var alt = v.altitudeM || 600;
            var vel = 0;
            var t = 0;
            var maxT = 12;
            while (t < maxT && alt > 0) {
              pts.push({ t: t, alt: alt, vel: vel, velMph: vel * 2.237 });
              var drag = (rho * cd * A * vel * vel) / (2 * m);
              var accel = g - drag;
              vel = vel + accel * dt;
              alt = alt - vel * dt;
              if (alt < 0) alt = 0;
              t += dt;
            }
            // SVG plot
            var pw = 600, ph = 200, pad = 35;
            var tMax = pts.length > 0 ? pts[pts.length - 1].t : 1;
            var altMax = v.altitudeM || 600;
            var velMax = Math.max.apply(null, pts.map(function(p) { return p.velMph; }));
            function xAt(t) { return pad + (t / tMax) * (pw - 2 * pad); }
            function yAltAt(a) { return ph - pad - (a / altMax) * (ph - 2 * pad); }
            function yVelAt(vp) { return ph - pad - (vp / velMax) * (ph - 2 * pad); }
            var altPath = pts.map(function(p, i) { return (i === 0 ? 'M ' : 'L ') + xAt(p.t).toFixed(1) + ' ' + yAltAt(p.alt).toFixed(1); }).join(' ');
            var velPath = pts.map(function(p, i) { return (i === 0 ? 'M ' : 'L ') + xAt(p.t).toFixed(1) + ' ' + yVelAt(p.velMph).toFixed(1); }).join(' ');
            // Find time to terminal (90% of max v)
            var v90 = 0.9 * velMax;
            var t90 = pts.find(function(p) { return p.velMph >= v90; });
            return h('div', { className: 'bg-slate-900/40 border border-amber-700/40 rounded-xl p-4 space-y-2' },
              h('div', { className: 'text-sm font-bold text-amber-300' }, '📉 Fall Curve (time-domain physics)'),
              h('div', { className: 'text-xs text-slate-400 italic' }, 'Numerical integration of the drag equation with your current slider values. Altitude (orange) plummets while velocity (red) builds toward terminal — and then plateaus when drag = weight.'),
              h('div', { className: 'bg-slate-950/60 rounded-lg p-2' },
                h('div', { className: 'mb-2' },
                  h('label', { className: 'text-xs text-amber-300 flex items-center justify-between' },
                    h('span', null, 'Stoop start altitude (m)'),
                    h('span', { className: 'font-mono text-amber-300' }, (v.altitudeM || 600).toFixed(0))
                  ),
                  h('input', { type: 'range', min: 100, max: 2000, step: 50, value: (v.altitudeM || 600),
                    onInput: function(e) { setRH({ stoopSimVars: Object.assign({}, v, { altitudeM: parseInt(e.target.value) }) }); },
                    className: 'w-full', 'aria-label': 'Altitude m' })
                ),
                h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Fall curve plot' },
                  h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
                  // Axes
                  h('line', { x1: pad, y1: ph - pad, x2: pw - pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
                  h('line', { x1: pad, y1: pad, x2: pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
                  // Time grid
                  [0, 2, 4, 6, 8, 10].filter(function(tk) { return tk <= tMax + 0.5; }).map(function(tk, i) {
                    var x = xAt(tk);
                    return h('g', { key: 'tg' + i },
                      h('line', { x1: x, y1: pad, x2: x, y2: ph - pad, stroke: '#1e293b', strokeWidth: 1 }),
                      h('text', { x: x, y: ph - pad + 12, fontSize: 9, fill: '#64748b', textAnchor: 'middle' }, tk + 's')
                    );
                  }),
                  // Curves
                  h('path', { d: altPath, fill: 'none', stroke: '#f97316', strokeWidth: 2.5 }),
                  h('path', { d: velPath, fill: 'none', stroke: '#dc2626', strokeWidth: 2.5 }),
                  // Terminal-velocity asymptote line
                  h('line', { x1: pad, y1: yVelAt(velMax), x2: pw - pad, y2: yVelAt(velMax), stroke: '#dc2626', strokeWidth: 1, strokeDasharray: '4,4', opacity: 0.55 }),
                  // Marker at 95% terminal
                  t90 && h('g', null,
                    h('circle', { cx: xAt(t90.t), cy: yVelAt(t90.velMph), r: 5, fill: '#fde047', stroke: '#92400e', strokeWidth: 1.5 }),
                    h('text', { x: xAt(t90.t), y: yVelAt(t90.velMph) - 10, fontSize: 10, fill: '#fde047', textAnchor: 'middle', fontWeight: 'bold' }, '90% terminal @ ' + t90.t.toFixed(1) + 's')
                  ),
                  // Legend
                  h('rect', { x: pw - 165, y: 8, width: 155, height: 50, fill: 'rgba(15,23,42,0.85)', stroke: '#475569', strokeWidth: 1, rx: 4 }),
                  h('line', { x1: pw - 155, y1: 22, x2: pw - 140, y2: 22, stroke: '#f97316', strokeWidth: 3 }),
                  h('text', { x: pw - 135, y: 25, fontSize: 10, fill: '#fdba74' }, 'Altitude (m)'),
                  h('line', { x1: pw - 155, y1: 40, x2: pw - 140, y2: 40, stroke: '#dc2626', strokeWidth: 3 }),
                  h('text', { x: pw - 135, y: 43, fontSize: 10, fill: '#fca5a5' }, 'Velocity (mph)')
                ),
                // Time/alt/vel summary
                h('div', { className: 'grid grid-cols-3 gap-2 mt-2 text-center' },
                  h('div', { className: 'bg-slate-800/40 rounded p-2' },
                    h('div', { className: 'text-xs text-slate-400' }, 'Time to 90% terminal'),
                    h('div', { className: 'text-lg font-bold text-amber-300' }, t90 ? t90.t.toFixed(1) + 's' : '—')
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2' },
                    h('div', { className: 'text-xs text-slate-400' }, 'Altitude lost @ 90%'),
                    h('div', { className: 'text-lg font-bold text-amber-300' }, t90 ? Math.round(altMax - t90.alt) + ' m' : '—')
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2' },
                    h('div', { className: 'text-xs text-slate-400' }, 'Peak velocity'),
                    h('div', { className: 'text-lg font-bold text-amber-300' }, velMax.toFixed(0) + ' mph')
                  )
                )
              ),
              h('div', { className: 'text-[10px] text-slate-500 italic' },
                'The exponential approach to terminal velocity is the signature of drag-limited fall. Without drag, the bird would just accelerate at g forever. With drag, terminal is reached + held.'
              )
            );
          })()
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

          // ── NEW v0.8: Frequency Spectrum Visualization ──
          h('div', { className: 'bg-slate-900/60 border border-violet-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-violet-300 mb-2' }, '📈 Wing Noise Spectrum — Hawk vs Owl vs Mouse Hearing'),
            h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'X-axis: frequency (kHz). Y-axis: relative intensity / sensitivity. Hawk wing noise (red) peaks right in the mouse\'s most-sensitive range. Owl wing noise (violet) is shifted up out of that range. The frequency shift IS the silence mechanism.'),
            (function() {
              // SVG plot of three curves
              var pw = 600, ph = 220, pad = 40;
              // Frequency range: 0.5 to 30 kHz, log scale
              var fmin = 0.5, fmax = 30;
              function fToX(f) { return pad + (Math.log(f) - Math.log(fmin)) / (Math.log(fmax) - Math.log(fmin)) * (pw - 2 * pad); }
              function intensityToY(v) { return ph - pad - v * (ph - 2 * pad); } // v 0..1
              // Define curves as samples
              // Hawk: Gaussian centered at 3 kHz, sigma factor ~0.5 (log space)
              function gaussian(f, center, width, peak) {
                var lf = Math.log(f), lc = Math.log(center);
                return peak * Math.exp(-Math.pow(lf - lc, 2) / (2 * width * width));
              }
              var samples = [];
              for (var i = 0; i <= 100; i++) {
                var f = fmin * Math.pow(fmax / fmin, i / 100);
                samples.push(f);
              }
              function curvePath(centerF, width, peak, samples) {
                return samples.map(function(f, i) {
                  var x = fToX(f);
                  var y = intensityToY(gaussian(f, centerF, width, peak));
                  return (i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1);
                }).join(' ');
              }
              var hawkPath = curvePath(3, 0.6, 0.9, samples);   // peak 3 kHz
              var owlPath = curvePath(16, 0.5, 0.7, samples);   // peak 16 kHz
              var mousePath = curvePath(4, 0.7, 0.95, samples); // peak 4 kHz hearing
              return h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Frequency spectrum chart' },
                // Background
                h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
                // Grid lines (log scale frequencies)
                [1, 2, 4, 8, 16, 30].map(function(f, i) {
                  var x = fToX(f);
                  return h('g', { key: 'grid' + i },
                    h('line', { x1: x, y1: pad, x2: x, y2: ph - pad, stroke: '#1e293b', strokeWidth: 1 }),
                    h('text', { x: x, y: ph - 8, fontSize: 10, fill: '#64748b', textAnchor: 'middle' }, f + ' kHz')
                  );
                }),
                // Mouse hearing sensitivity (gray, dashed)
                h('path', { d: mousePath, fill: 'none', stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '4,3', opacity: 0.7 }),
                // Hawk wing noise (red)
                h('path', { d: hawkPath, fill: '#dc2626', stroke: '#dc2626', strokeWidth: 2.5, opacity: 0.45 }),
                // Owl wing noise (violet)
                h('path', { d: owlPath, fill: '#8b5cf6', stroke: '#8b5cf6', strokeWidth: 2.5, opacity: 0.45 }),
                // Peak markers
                h('line', { x1: fToX(3), y1: pad, x2: fToX(3), y2: ph - pad, stroke: '#dc2626', strokeWidth: 1, opacity: 0.6 }),
                h('line', { x1: fToX(16), y1: pad, x2: fToX(16), y2: ph - pad, stroke: '#8b5cf6', strokeWidth: 1, opacity: 0.6 }),
                // Labels
                h('text', { x: fToX(3), y: pad - 5, fontSize: 11, fill: '#fca5a5', textAnchor: 'middle', fontWeight: 'bold' }, 'Hawk wing peak'),
                h('text', { x: fToX(16), y: pad - 5, fontSize: 11, fill: '#c4b5fd', textAnchor: 'middle', fontWeight: 'bold' }, 'Owl wing peak'),
                // Axis labels
                h('text', { x: pad - 25, y: ph / 2, fontSize: 10, fill: '#94a3b8', transform: 'rotate(-90 ' + (pad - 25) + ' ' + (ph / 2) + ')' }, 'Intensity / Sensitivity'),
                // Legend
                h('rect', { x: pw - 175, y: 10, width: 170, height: 55, fill: 'rgba(15,23,42,0.85)', stroke: '#475569', strokeWidth: 1, rx: 4 }),
                h('line', { x1: pw - 165, y1: 22, x2: pw - 150, y2: 22, stroke: '#dc2626', strokeWidth: 3 }),
                h('text', { x: pw - 145, y: 25, fontSize: 10, fill: '#fca5a5' }, 'Hawk wing noise'),
                h('line', { x1: pw - 165, y1: 38, x2: pw - 150, y2: 38, stroke: '#8b5cf6', strokeWidth: 3 }),
                h('text', { x: pw - 145, y: 41, fontSize: 10, fill: '#c4b5fd' }, 'Owl wing noise'),
                h('line', { x1: pw - 165, y1: 54, x2: pw - 150, y2: 54, stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '3,2' }),
                h('text', { x: pw - 145, y: 57, fontSize: 10, fill: '#94a3b8' }, 'Mouse hearing')
              );
            })(),
            h('div', { className: 'text-[10px] text-slate-400 italic mt-3' }, 'The owl\'s noise peak at 16 kHz sits past the mouse\'s sharp drop-off in hearing sensitivity. The hawk\'s noise peak at 3 kHz sits exactly where the mouse hears best. This is what "silent flight" really means in physics: not zero amplitude — frequency shifted out of the prey\'s perceptual band.')
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
          // ── NEW v0.9: Eye cross-section SVG comparison ──
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-2' }, '🔬 Eye Anatomy Cross-Section — Spherical vs Tubular'),
            h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'Both eyes shown in horizontal cross-section, looking down through the top of the skull. Note the dramatic shape difference + the cone-vs-rod density distribution on the retina.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              // Diurnal (spherical) eye
              h('div', { className: 'bg-amber-900/15 border border-amber-700/40 rounded-lg p-3' },
                h('div', { className: 'text-xs font-bold text-amber-300 mb-1 text-center' }, '☀️ Diurnal — Spherical Eye'),
                h('svg', { viewBox: '0 0 300 220', style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Spherical raptor eye cross-section' },
                  h('rect', { x: 0, y: 0, width: 300, height: 220, fill: '#1c1917' }),
                  // Eye sphere outline
                  h('circle', { cx: 150, cy: 110, r: 85, fill: 'none', stroke: '#fcd34d', strokeWidth: 2 }),
                  // Sclera (white outer)
                  h('circle', { cx: 150, cy: 110, r: 85, fill: '#fefce8', opacity: 0.92 }),
                  // Cornea bulge (front)
                  h('path', { d: 'M 95 95 Q 60 110 95 125', fill: '#fef3c7', stroke: '#fbbf24', strokeWidth: 1.5 }),
                  // Iris + pupil
                  h('ellipse', { cx: 92, cy: 110, rx: 6, ry: 22, fill: '#92400e' }),
                  h('ellipse', { cx: 90, cy: 110, rx: 3, ry: 17, fill: '#1c1917' }),
                  // Lens (oval just behind cornea)
                  h('ellipse', { cx: 110, cy: 110, rx: 10, ry: 26, fill: '#fef9c3', opacity: 0.7, stroke: '#fbbf24', strokeWidth: 1 }),
                  // Retina (heavy cone density at fovea = back center; dual foveas: central + temporal)
                  h('path', { d: 'M 230 75 Q 250 110 230 145', fill: 'none', stroke: '#dc2626', strokeWidth: 4 }),
                  // Central fovea (deep pit)
                  h('circle', { cx: 235, cy: 110, r: 6, fill: '#dc2626' }),
                  h('text', { x: 248, y: 113, fontSize: 9, fill: '#fca5a5', fontWeight: 'bold' }, 'Fovea 1'),
                  // Temporal fovea (shallower, lateral)
                  h('circle', { cx: 215, cy: 85, r: 4, fill: '#dc2626', opacity: 0.7 }),
                  h('text', { x: 224, y: 78, fontSize: 9, fill: '#fca5a5', fontWeight: 'bold' }, 'Fovea 2'),
                  // Optic nerve
                  h('rect', { x: 235, y: 105, width: 30, height: 10, fill: '#a3a3a3' }),
                  h('text', { x: 270, y: 113, fontSize: 9, fill: '#94a3b8' }, 'Optic n.'),
                  // Pecten oculi (unique to birds)
                  h('path', { d: 'M 220 115 L 232 130 L 215 140 L 230 145', fill: 'none', stroke: '#16a34a', strokeWidth: 2 }),
                  h('text', { x: 200, y: 165, fontSize: 9, fill: '#86efac' }, 'Pecten oculi'),
                  // Labels
                  h('text', { x: 50, y: 110, fontSize: 9, fill: '#fbbf24', textAnchor: 'middle' }, 'Cornea'),
                  h('text', { x: 92, y: 90, fontSize: 9, fill: '#fbbf24', textAnchor: 'middle' }, 'Pupil'),
                  h('text', { x: 110, y: 145, fontSize: 9, fill: '#fbbf24', textAnchor: 'middle' }, 'Lens'),
                  h('text', { x: 150, y: 30, fontSize: 11, fill: '#fde047', textAnchor: 'middle', fontWeight: 'bold' }, '~80% cones / 20% rods')
                ),
                h('div', { className: 'text-[10px] text-amber-100/70 italic text-center mt-1' }, 'Spherical shape, 2 foveas, cone-dominated retina')
              ),
              // Nocturnal (tubular) eye
              h('div', { className: 'bg-indigo-900/20 border border-indigo-700/40 rounded-lg p-3' },
                h('div', { className: 'text-xs font-bold text-indigo-300 mb-1 text-center' }, '🌙 Nocturnal — Tubular Eye (owl)'),
                h('svg', { viewBox: '0 0 300 220', style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Tubular owl eye cross-section' },
                  h('rect', { x: 0, y: 0, width: 300, height: 220, fill: '#1c1917' }),
                  // Tubular eye — long + narrow, NOT spherical
                  h('path', { d: 'M 90 65 L 240 65 L 240 95 Q 250 110 240 125 L 240 155 L 90 155 Q 70 145 60 110 Q 70 75 90 65 Z',
                    fill: '#fefce8', opacity: 0.92, stroke: '#a78bfa', strokeWidth: 2 }),
                  // Cornea bulge (much LARGER relative to eye than diurnal)
                  h('path', { d: 'M 60 75 Q 30 110 60 145', fill: '#e0e7ff', stroke: '#a78bfa', strokeWidth: 1.5 }),
                  // Huge dilated pupil
                  h('ellipse', { cx: 85, cy: 110, rx: 14, ry: 30, fill: '#1c1917' }),
                  // Iris ring (thin, since pupil is huge)
                  h('ellipse', { cx: 85, cy: 110, rx: 18, ry: 34, fill: 'none', stroke: '#6b21a8', strokeWidth: 2 }),
                  // LARGE lens (collects more light)
                  h('ellipse', { cx: 115, cy: 110, rx: 18, ry: 38, fill: '#ede9fe', opacity: 0.7, stroke: '#a78bfa', strokeWidth: 1 }),
                  // Single deep central fovea
                  h('circle', { cx: 235, cy: 110, r: 5, fill: '#dc2626' }),
                  h('text', { x: 248, y: 113, fontSize: 9, fill: '#fca5a5', fontWeight: 'bold' }, 'Fovea'),
                  // Retina (rod-dominated, drawn as denser stippling on back wall)
                  h('path', { d: 'M 225 70 L 230 95 L 232 110 L 230 125 L 225 150', fill: 'none', stroke: '#a78bfa', strokeWidth: 5, opacity: 0.6 }),
                  // Optic nerve
                  h('rect', { x: 235, y: 105, width: 30, height: 10, fill: '#a3a3a3' }),
                  h('text', { x: 270, y: 113, fontSize: 9, fill: '#94a3b8' }, 'Optic n.'),
                  // Labels
                  h('text', { x: 30, y: 110, fontSize: 9, fill: '#a78bfa', textAnchor: 'middle' }, 'Cornea'),
                  h('text', { x: 85, y: 75, fontSize: 9, fill: '#a78bfa', textAnchor: 'middle' }, 'Pupil'),
                  h('text', { x: 115, y: 165, fontSize: 9, fill: '#a78bfa', textAnchor: 'middle' }, 'Large lens'),
                  h('text', { x: 150, y: 30, fontSize: 11, fill: '#c4b5fd', textAnchor: 'middle', fontWeight: 'bold' }, '~5% cones / 95% rods'),
                  // Eye-fixed note
                  h('text', { x: 150, y: 200, fontSize: 9, fill: '#c4b5fd', textAnchor: 'middle', fontStyle: 'italic' }, 'Cannot rotate — head turns instead')
                ),
                h('div', { className: 'text-[10px] text-indigo-100/70 italic text-center mt-1' }, 'Tubular shape, 1 fovea, rod-dominated retina, larger cornea + lens')
              )
            ),
            h('div', { className: 'mt-3 p-3 bg-slate-800/40 rounded text-xs text-slate-300 leading-relaxed' },
              h('span', { className: 'font-bold text-amber-300' }, 'Engineering implication: '),
              'Diurnal raptors have spherical eyes that capture maximum cone density across the entire retina (= peripheral acuity + 2 foveas). Owls trade peripheral acuity for raw light-gathering — the tubular shape lets them pack a huge cornea + lens + rod-rich retina in a fixed skull volume. The cost: they can\'t rotate the eye (head must turn). The benefit: ~100× more sensitive at low light than humans.'
            )
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
          // ── NEW v0.9: Threat Impact Compound Population Calculator ──
          (function() {
            var ti = rh.threatImpact || { species: 'baldEagle', lead: 0, wind: 0, rodenticide: 0, habitat: 0 };
            function setTI(patch) { setRH({ threatImpact: Object.assign({}, ti, patch) }); }
            // Baseline λ per species (rough demographic defaults)
            var SPECIES_DEMO = {
              peregrine:   { adultSurv: 0.85, juvSurv: 0.30, fecundity: 1.5, baseLambda: 1.07 },
              baldEagle:   { adultSurv: 0.90, juvSurv: 0.50, fecundity: 0.8, baseLambda: 1.06 },
              redTail:     { adultSurv: 0.78, juvSurv: 0.30, fecundity: 1.5, baseLambda: 1.01 },
              goldenEagle: { adultSurv: 0.94, juvSurv: 0.30, fecundity: 0.5, baseLambda: 1.02 },
              osprey:      { adultSurv: 0.85, juvSurv: 0.40, fecundity: 2.0, baseLambda: 1.06 },
              greatHorned: { adultSurv: 0.85, juvSurv: 0.40, fecundity: 2.0, baseLambda: 1.07 }
            };
            var sd = SPECIES_DEMO[ti.species] || SPECIES_DEMO.baldEagle;
            // Each threat reduces adult survival by up to ~10% at 100% intensity
            var leadHit = ti.lead * 0.0010;          // 0-10% loss
            var windHit = ti.wind * 0.0005;          // 0-5% loss
            var rodHit = ti.rodenticide * 0.0008;    // 0-8% loss
            var habHit = ti.habitat * 0.0008;        // 0-8% loss + reduces fecundity
            var effAdultSurv = sd.adultSurv - leadHit - windHit - rodHit;
            var effFecundity = sd.fecundity * (1 - habHit * 2); // habitat hits fecundity harder
            var effLambda = effAdultSurv + (sd.juvSurv * Math.max(0, effFecundity)) / 2;
            var deltaPct = ((effLambda - sd.baseLambda) / sd.baseLambda) * 100;
            var verdict, vc;
            if (effLambda >= 1.03) { verdict = 'GROWING'; vc = 'emerald'; }
            else if (effLambda >= 0.995) { verdict = 'STABLE'; vc = 'amber'; }
            else if (effLambda >= 0.95) { verdict = 'SLOW DECLINE'; vc = 'orange'; }
            else { verdict = 'CRITICAL DECLINE'; vc = 'red'; }
            // Project 30 years
            var pop = 100, projY = 30;
            var trajectory = [];
            for (var yi = 0; yi <= projY; yi++) { trajectory.push({ y: yi, p: pop }); pop *= effLambda; }
            var finalPop = trajectory[trajectory.length - 1].p;
            // Mini sparkline
            var maxP = Math.max.apply(null, trajectory.map(function(p) { return p.p; }));
            var minP = Math.min.apply(null, trajectory.map(function(p) { return p.p; }));
            var spPath = trajectory.map(function(p, i) {
              var x = (i / projY) * 280;
              var ny = 60 - ((p.p - minP) / Math.max(1, maxP - minP)) * 50 - 5;
              return (i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + ny.toFixed(1);
            }).join(' ');
            return h('div', { className: 'bg-slate-900/40 border border-emerald-700/40 rounded-xl p-5 space-y-3' },
              h('div', { className: 'text-base font-bold text-emerald-300' }, '🎛 Threat Impact Calculator — Compound Population Effect'),
              h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed' },
                'Real raptor populations face multiple threats simultaneously. Each one is small but they compound. Try adjusting the threat sliders for a species — watch the 30-year population trajectory tip from growing to declining.'
              ),
              // Species selector
              h('div', null,
                h('label', { className: 'text-xs text-amber-300 font-bold block mb-1' }, '🦅 Species'),
                h('select', {
                  value: ti.species,
                  onChange: function(e) { setTI({ species: e.target.value }); },
                  className: 'w-full px-3 py-2 rounded-lg bg-slate-800 text-amber-100 border border-slate-700 text-sm',
                  'aria-label': 'Species'
                },
                  Object.keys(SPECIES_DEMO).map(function(k) {
                    var s = findSpecies(k);
                    return h('option', { key: k, value: k }, s.emoji + ' ' + s.name + ' (baseline λ = ' + SPECIES_DEMO[k].baseLambda + ')');
                  })
                )
              ),
              // Threat sliders
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                [
                  { id: 'lead', label: '🎯 Lead-shot poisoning intensity', maxImpact: '-10% adult survival', color: 'red' },
                  { id: 'wind', label: '💨 Wind turbine collision rate', maxImpact: '-5% adult survival', color: 'orange' },
                  { id: 'rodenticide', label: '🐀 Rodenticide secondary poisoning', maxImpact: '-8% adult survival', color: 'yellow' },
                  { id: 'habitat', label: '🌳 Habitat loss', maxImpact: '-8% survival + fecundity', color: 'amber' }
                ].map(function(thr) {
                  return h('div', { key: thr.id },
                    h('label', { className: 'text-xs text-' + thr.color + '-300 flex justify-between items-center' },
                      h('span', null, thr.label),
                      h('span', { className: 'font-mono text-amber-300' }, ti[thr.id] + '%')
                    ),
                    h('input', { type: 'range', min: 0, max: 100, step: 1, value: ti[thr.id],
                      onInput: function(e) { var p = {}; p[thr.id] = parseInt(e.target.value); setTI(p); },
                      className: 'w-full', 'aria-label': thr.label }),
                    h('div', { className: 'text-[10px] text-slate-500' }, 'Max: ' + thr.maxImpact)
                  );
                })
              ),
              // Results card
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
                h('div', { className: 'bg-' + vc + '-900/40 border border-' + vc + '-700/50 rounded p-3 text-center' },
                  h('div', { className: 'text-2xl font-bold text-' + vc + '-300' }, effLambda.toFixed(3)),
                  h('div', { className: 'text-[10px] text-' + vc + '-200 uppercase tracking-wider' }, 'Effective λ')
                ),
                h('div', { className: 'bg-' + vc + '-900/40 border border-' + vc + '-700/50 rounded p-3 text-center' },
                  h('div', { className: 'text-base font-bold text-' + vc + '-300' }, verdict),
                  h('div', { className: 'text-[10px] text-' + vc + '-200 uppercase tracking-wider' }, 'Trajectory')
                ),
                h('div', { className: 'bg-slate-800/60 border border-slate-700/50 rounded p-3 text-center' },
                  h('div', { className: 'text-base font-bold text-amber-300' }, Math.round(finalPop) + '% of base'),
                  h('div', { className: 'text-[10px] text-slate-300 uppercase tracking-wider' }, 'Pop @ year 30')
                )
              ),
              // Sparkline
              h('div', { className: 'bg-slate-950/60 rounded-lg p-2' },
                h('svg', { viewBox: '0 0 280 70', style: { width: '100%', height: '60px' }, role: 'img', 'aria-label': '30-year population sparkline' },
                  h('rect', { x: 0, y: 0, width: 280, height: 70, fill: '#0f172a' }),
                  h('line', { x1: 0, y1: 60 - ((100 - minP) / Math.max(1, maxP - minP)) * 50 - 5, x2: 280, y2: 60 - ((100 - minP) / Math.max(1, maxP - minP)) * 50 - 5, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3,3' }),
                  h('path', { d: spPath, fill: 'none', stroke: '#10b981', strokeWidth: 2 }),
                  h('text', { x: 4, y: 12, fontSize: 9, fill: '#94a3b8' }, 'Year 0 → 30'),
                  h('text', { x: 248, y: 65, fontSize: 9, fill: '#94a3b8' }, 'final')
                )
              ),
              h('div', { className: 'text-[10px] text-slate-500 italic' },
                'Pedagogy: even small per-threat effects compound multiplicatively across 30 years. A 5% adult-survival drop from lead PLUS 3% from wind PLUS 2% from rodenticide turns a +6%/year growth into a near-zero trajectory. This is the demographic reality of multi-stressor environments.'
              )
            );
          })(),

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
        // Inline SVG silhouettes for each of the 8 groups
        // viewBox 240x110; bird body roughly centered + facing right
        function silhouetteSvg(id) {
          var common = { viewBox: '0 0 240 110', style: { width: '100%', height: 'auto', maxHeight: '110px' }, 'aria-hidden': 'true' };
          var fill = '#fde047';
          if (id === 'falcon') {
            // Long pointed swept wings
            return h('svg', common,
              h('path', { d: 'M 30 55 Q 60 30 90 50 L 120 53 L 150 50 Q 180 30 210 55 L 200 58 Q 175 55 150 60 L 120 60 L 90 60 Q 65 55 40 58 Z', fill: fill }),
              // Body
              h('ellipse', { cx: 120, cy: 56, rx: 14, ry: 5, fill: '#facc15' }),
              // Tail
              h('path', { d: 'M 108 58 L 90 70 L 100 65 L 110 70 Z', fill: '#fde047' }),
              // Head
              h('circle', { cx: 138, cy: 55, r: 4, fill: '#facc15' })
            );
          }
          if (id === 'eagle') {
            // Long broad wings with finger slots
            return h('svg', common,
              // Wing left
              h('path', { d: 'M 30 55 Q 60 35 90 50 L 90 60 Q 60 55 30 60 Z', fill: fill }),
              h('path', { d: 'M 20 50 L 32 56 L 18 58 Z', fill: fill }),
              h('path', { d: 'M 18 55 L 30 58 L 16 62 Z', fill: fill }),
              h('path', { d: 'M 22 60 L 32 60 L 22 65 Z', fill: fill }),
              // Wing right
              h('path', { d: 'M 150 50 Q 180 35 210 55 L 210 60 Q 180 55 150 60 Z', fill: fill }),
              h('path', { d: 'M 220 50 L 208 56 L 222 58 Z', fill: fill }),
              h('path', { d: 'M 222 55 L 210 58 L 224 62 Z', fill: fill }),
              h('path', { d: 'M 218 60 L 208 60 L 218 65 Z', fill: fill }),
              // Body
              h('ellipse', { cx: 120, cy: 56, rx: 18, ry: 6, fill: '#facc15' }),
              // Tail (fan)
              h('path', { d: 'M 105 60 L 90 78 L 100 70 L 105 76 L 110 72 L 120 78 Z', fill: '#fde047' }),
              // Head
              h('circle', { cx: 142, cy: 55, r: 5, fill: '#facc15' })
            );
          }
          if (id === 'buteo') {
            // Broad rounded wings, fan tail
            return h('svg', common,
              h('path', { d: 'M 40 55 Q 60 40 90 52 L 90 60 Q 60 58 40 60 Z', fill: fill }),
              h('path', { d: 'M 150 52 Q 180 40 200 55 L 200 60 Q 180 58 150 60 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 58, rx: 17, ry: 6, fill: '#facc15' }),
              // Wide fan tail
              h('path', { d: 'M 105 62 L 90 80 L 100 73 L 105 78 L 115 72 L 120 78 Z', fill: '#fde047' }),
              h('circle', { cx: 140, cy: 56, r: 5, fill: '#facc15' })
            );
          }
          if (id === 'accipiter') {
            // Short broad wings + LONG tail
            return h('svg', common,
              h('path', { d: 'M 60 55 Q 75 45 95 52 L 95 62 Q 75 60 60 62 Z', fill: fill }),
              h('path', { d: 'M 145 52 Q 165 45 180 55 L 180 62 Q 165 60 145 62 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 58, rx: 15, ry: 5, fill: '#facc15' }),
              // Very long banded tail
              h('rect', { x: 80, y: 60, width: 30, height: 6, fill: '#facc15' }),
              h('line', { x1: 88, y1: 60, x2: 88, y2: 66, stroke: '#a16207', strokeWidth: 1 }),
              h('line', { x1: 96, y1: 60, x2: 96, y2: 66, stroke: '#a16207', strokeWidth: 1 }),
              h('line', { x1: 104, y1: 60, x2: 104, y2: 66, stroke: '#a16207', strokeWidth: 1 }),
              h('circle', { cx: 138, cy: 56, r: 4, fill: '#facc15' })
            );
          }
          if (id === 'harrier') {
            // Long narrow wings raised in dihedral V
            return h('svg', common,
              h('path', { d: 'M 25 60 L 95 48 L 95 56 L 35 64 Z', fill: fill }),
              h('path', { d: 'M 145 48 L 215 60 L 205 64 L 145 56 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 56, rx: 13, ry: 4, fill: '#facc15' }),
              h('rect', { x: 105, y: 58, width: 12, height: 4, fill: '#facc15' }),
              h('rect', { x: 105, y: 56, width: 4, height: 8, fill: '#fff', opacity: 0.85 }), // white rump patch
              h('circle', { cx: 134, cy: 54, r: 4, fill: '#facc15' })
            );
          }
          if (id === 'kite') {
            // Long narrow wings + forked tail
            return h('svg', common,
              h('path', { d: 'M 30 55 Q 60 40 95 50 L 95 58 Q 60 56 30 58 Z', fill: fill }),
              h('path', { d: 'M 145 50 Q 180 40 210 55 L 210 58 Q 180 56 145 58 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 55, rx: 13, ry: 4, fill: '#facc15' }),
              // Forked tail
              h('polygon', { points: '108,57 88,68 96,62 95,75 100,65 105,72 108,63', fill: '#facc15' }),
              h('circle', { cx: 136, cy: 53, r: 4, fill: '#facc15' })
            );
          }
          if (id === 'osprey') {
            // Distinctive M-shape — kinked wings
            return h('svg', common,
              h('path', { d: 'M 25 55 L 55 38 L 85 55 L 95 53 L 95 60 L 85 62 L 55 47 L 32 62 Z', fill: fill }),
              h('path', { d: 'M 155 53 L 185 38 L 215 55 L 208 62 L 185 47 L 155 60 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 56, rx: 13, ry: 4, fill: '#facc15' }),
              h('rect', { x: 108, y: 58, width: 10, height: 4, fill: '#facc15' }),
              h('circle', { cx: 138, cy: 54, r: 4, fill: '#facc15' })
            );
          }
          if (id === 'owl') {
            // Broad rounded wings, big round head
            return h('svg', common,
              h('path', { d: 'M 35 60 Q 65 40 95 53 L 95 65 Q 65 65 35 65 Z', fill: fill }),
              h('path', { d: 'M 145 53 Q 175 40 205 60 L 205 65 Q 175 65 145 65 Z', fill: fill }),
              h('ellipse', { cx: 120, cy: 58, rx: 16, ry: 6, fill: '#facc15' }),
              // Big round head
              h('circle', { cx: 138, cy: 52, r: 8, fill: '#facc15' }),
              // Ear tufts
              h('path', { d: 'M 132 45 L 130 38 L 134 45 Z', fill: '#facc15' }),
              h('path', { d: 'M 144 45 L 146 38 L 142 45 Z', fill: '#facc15' }),
              // Short tail
              h('path', { d: 'M 108 62 L 100 70 L 116 70 L 115 64 Z', fill: '#fde047' })
            );
          }
          return null;
        }

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border border-yellow-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-yellow-200 mb-2' }, '🔍 Field Identification: Wing Shape + Flight Pattern'),
            h('div', { className: 'text-sm text-yellow-100/90 leading-relaxed' }, 'You almost never get a clear close-up of a raptor in the wild. Field ID works on ', h('span', { className: 'font-bold' }, 'gestalt — silhouette + flight pattern + behavior'), '. Color comes last. Learn the 8 silhouette groups below and you can ID 90% of North American raptors at a quarter mile.')
          ),
          // Silhouette cards (now with inline SVGs!)
          h('div', { className: 'space-y-3' },
            FIELD_ID.silhouettes.map(function(s, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-start gap-4 mb-2' },
                  // Silhouette SVG (left)
                  h('div', {
                    className: 'flex-shrink-0 bg-slate-900/60 rounded-lg border border-slate-700/60 p-2',
                    style: { width: '140px' }
                  },
                    silhouetteSvg(s.id) || h('div', { className: 'text-xs text-slate-500 text-center py-4' }, '(silhouette)')
                  ),
                  // Title (right)
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'text-sm font-bold text-yellow-300 mb-1' }, s.label),
                    h('div', { className: 'text-[10px] text-slate-400 italic' }, '↑ silhouette as seen from below in flight')
                  )
                ),
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

          // Interactive World Map (NEW v0.7)
          h('div', { className: 'bg-slate-950/60 border border-cyan-700/40 rounded-xl p-3' },
            h('div', { className: 'text-sm font-bold text-cyan-300 mb-2' }, '🗺 World Map — 5 Flyways + Famous Watch Sites'),
            h('div', { className: 'text-[10px] text-slate-400 mb-2 italic' }, 'Hover a flyway color or a star to learn more. Arrows show fall migration direction (NE → SW for most North American species).'),
            h('svg', { viewBox: '0 0 700 360', style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'World map showing the 5 major raptor migration flyways and famous hawk-watch site locations' },
              // Ocean background
              h('rect', { x: 0, y: 0, width: 700, height: 360, fill: '#082f49' }),
              // ── Continental masses (simplified equirectangular) ──
              // North America
              h('path', { d: 'M 60 80 L 180 60 L 210 90 L 230 130 L 240 165 L 195 220 L 145 230 L 100 195 L 70 150 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Greenland
              h('path', { d: 'M 245 60 L 280 65 L 285 100 L 260 110 L 250 90 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // South America
              h('path', { d: 'M 175 235 L 215 240 L 230 290 L 215 340 L 190 350 L 175 320 L 165 280 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Europe
              h('path', { d: 'M 330 75 L 410 70 L 420 110 L 395 140 L 360 150 L 335 125 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Africa
              h('path', { d: 'M 340 155 L 420 160 L 430 220 L 415 285 L 380 305 L 355 280 L 345 220 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Asia
              h('path', { d: 'M 420 75 L 600 80 L 640 130 L 625 175 L 580 200 L 510 195 L 450 175 L 425 140 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // India
              h('path', { d: 'M 500 180 L 540 175 L 555 215 L 530 240 L 510 220 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Australia
              h('path', { d: 'M 590 270 L 660 270 L 655 320 L 610 330 L 590 305 Z', fill: '#1e3a2a', stroke: '#475569', strokeWidth: 1 }),
              // Equator + meridian guides
              h('line', { x1: 0, y1: 200, x2: 700, y2: 200, stroke: '#1e293b', strokeWidth: 1, strokeDasharray: '2,4' }),
              h('text', { x: 5, y: 197, fontSize: 9, fill: '#475569' }, 'Equator'),

              // ── Flyway paths + arrows (defs for marker arrowheads) ──
              h('defs', null,
                ['#fbbf24', '#10b981', '#f97316', '#3b82f6', '#a855f7'].map(function(c, i) {
                  return h('marker', { key: i, id: 'arr' + i, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
                    h('path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: c })
                  );
                })
              ),
              // 1. Atlantic Flyway (yellow)
              h('path', { d: 'M 180 100 Q 200 140 200 175 Q 195 210 210 240', stroke: '#fbbf24', strokeWidth: 3, fill: 'none', strokeDasharray: '6,3', markerEnd: 'url(#arr0)', opacity: 0.85 }),
              // 2. Mississippi Flyway (green)
              h('path', { d: 'M 160 110 Q 168 150 170 190 Q 175 215 220 245', stroke: '#10b981', strokeWidth: 3, fill: 'none', strokeDasharray: '6,3', markerEnd: 'url(#arr1)', opacity: 0.85 }),
              // 3. Central Flyway (orange) — extends to Argentina!
              h('path', { d: 'M 140 110 Q 145 165 160 200 Q 175 240 200 290 Q 205 320 200 345', stroke: '#f97316', strokeWidth: 3, fill: 'none', strokeDasharray: '6,3', markerEnd: 'url(#arr2)', opacity: 0.85 }),
              // 4. Pacific Flyway (blue)
              h('path', { d: 'M 95 100 Q 110 145 130 175 Q 145 200 165 235', stroke: '#3b82f6', strokeWidth: 3, fill: 'none', strokeDasharray: '6,3', markerEnd: 'url(#arr3)', opacity: 0.85 }),
              // 5. European-African Flyway (purple)
              h('path', { d: 'M 370 90 Q 380 130 380 165 Q 380 210 395 260', stroke: '#a855f7', strokeWidth: 3, fill: 'none', strokeDasharray: '6,3', markerEnd: 'url(#arr4)', opacity: 0.85 }),

              // ── Famous watch sites (yellow stars) ──
              [
                { name: 'Hawk Mtn', x: 195, y: 132 },
                { name: 'Cape May', x: 200, y: 142 },
                { name: 'Veracruz', x: 188, y: 195 },
                { name: 'GGRO', x: 105, y: 152 },
                { name: 'Eilat', x: 415, y: 165 },
                { name: 'Batumi', x: 425, y: 122 }
              ].map(function(site, i) {
                return h('g', { key: i },
                  h('circle', { cx: site.x, cy: site.y, r: 6, fill: '#fde047', stroke: '#92400e', strokeWidth: 1.5 }),
                  h('text', { x: site.x, y: site.y + 2, fontSize: 8, fill: '#1c1917', textAnchor: 'middle', fontWeight: 'bold' }, '★'),
                  h('text', { x: site.x + 9, y: site.y + 3, fontSize: 9, fill: '#fde047', fontWeight: 'bold' }, site.name)
                );
              }),

              // ── Legend ──
              h('rect', { x: 10, y: 305, width: 200, height: 50, fill: 'rgba(15,23,42,0.85)', stroke: '#475569', strokeWidth: 1, rx: 4 }),
              h('text', { x: 15, y: 318, fontSize: 9, fill: '#fde047', fontWeight: 'bold' }, 'FLYWAYS'),
              [
                { c: '#fbbf24', l: 'Atlantic' },
                { c: '#10b981', l: 'Mississippi' },
                { c: '#f97316', l: 'Central' },
                { c: '#3b82f6', l: 'Pacific' },
                { c: '#a855f7', l: 'EU-Africa' }
              ].map(function(le, i) {
                var col = i % 3, row = Math.floor(i / 3);
                return h('g', { key: i },
                  h('line', { x1: 18 + col * 65, y1: 332 + row * 12, x2: 30 + col * 65, y2: 332 + row * 12, stroke: le.c, strokeWidth: 2.5 }),
                  h('text', { x: 33 + col * 65, y: 335 + row * 12, fontSize: 9, fill: '#e5e7eb' }, le.l)
                );
              })
            ),
            // Map footer
            h('div', { className: 'text-[10px] text-slate-500 mt-2 italic' }, 'Map: equirectangular projection, continents simplified for clarity. Flyway paths shown as fall-migration direction. Stars mark major hawk-watch sites with documented annual counts.')
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
        var defaultStats = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
        var quizState = rh.quiz || { ix: 0, score: 0, selected: -1, answered: false, started: false, difficulty: 'all', bestScore: 0, completedRuns: 0, missedIds: [], missedReviewMode: false, statsByDifficulty: defaultStats };
        if (!quizState.statsByDifficulty) quizState.statsByDifficulty = defaultStats;
        if (!quizState.missedIds) quizState.missedIds = [];
        function setQuiz(patch) {
          setRH(function(prev) {
            var cur = prev.quiz || quizState;
            return Object.assign({}, prev, { quiz: Object.assign({}, cur, typeof patch === 'function' ? patch(cur) : patch) });
          });
        }
        // Build active question list — review mode pulls only missed; otherwise difficulty filter
        var pool;
        if (quizState.missedReviewMode && quizState.missedIds && quizState.missedIds.length > 0) {
          pool = QUIZ_QUESTIONS.filter(function(q) { return quizState.missedIds.indexOf(q.id) !== -1; });
        } else {
          pool = QUIZ_QUESTIONS.filter(function(q) {
            return quizState.difficulty === 'all' || q.difficulty === quizState.difficulty;
          });
        }
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
            // ── NEW v0.11: Per-difficulty stats panel ──
            (function() {
              var stats = quizState.statsByDifficulty || defaultStats;
              var anyData = ['easy', 'medium', 'hard'].some(function(d) { return stats[d] && stats[d].total > 0; });
              if (!anyData) return null;
              return h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold text-amber-300 mb-2' }, '📊 Your accuracy by difficulty (cumulative across all runs)'),
                h('div', { className: 'grid grid-cols-3 gap-2' },
                  ['easy', 'medium', 'hard'].map(function(d) {
                    var s = stats[d] || { correct: 0, total: 0 };
                    var pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                    var color = d === 'easy' ? 'emerald' : d === 'medium' ? 'amber' : 'red';
                    return h('div', { key: d, className: 'bg-slate-800/40 rounded p-2.5 text-center border border-' + color + '-700/40' },
                      h('div', { className: 'text-[10px] uppercase tracking-wider text-' + color + '-300 font-bold' }, d),
                      h('div', { className: 'text-xl font-bold text-amber-300 my-1' }, pct + '%'),
                      h('div', { className: 'text-[10px] text-slate-400' }, s.correct + ' / ' + s.total + ' correct')
                    );
                  })
                )
              );
            })(),
            // Review-missed jump-in (if any missed from prior runs)
            (quizState.missedIds && quizState.missedIds.length > 0) && h('div', { className: 'bg-indigo-900/20 border border-indigo-700/40 rounded-xl p-3' },
              h('div', { className: 'flex items-center justify-between gap-2' },
                h('div', { className: 'text-sm text-indigo-200' },
                  '📌 ', h('span', { className: 'font-bold text-indigo-300' }, quizState.missedIds.length), ' question(s) flagged as missed from your last run.'
                ),
                h('button', {
                  onClick: function() {
                    setQuiz({ started: true, missedReviewMode: true, ix: 0, score: 0, selected: -1, answered: false });
                    rhAnnounce('Reviewing ' + quizState.missedIds.length + ' missed questions');
                  },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700',
                  'aria-label': 'Review missed questions only'
                }, '🔁 Review only missed')
              )
            ),
            // Start button
            h('button', {
              onClick: function() { setQuiz({ started: true, missedReviewMode: false, ix: 0, score: 0, selected: -1, answered: false }); rhAnnounce('Quiz started · ' + total + ' questions'); },
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
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h('button', {
                onClick: function() {
                  var newBest = Math.max(quizState.bestScore, quizState.score);
                  var newRuns = quizState.completedRuns + 1;
                  setQuiz({ started: false, missedReviewMode: false, ix: 0, score: 0, selected: -1, answered: false, bestScore: newBest, completedRuns: newRuns });
                },
                className: 'px-4 py-3 rounded-lg text-sm font-bold bg-slate-700 text-amber-300 hover:bg-slate-600 transition-all',
                'aria-label': 'Back to quiz menu'
              }, '↶ Quiz Menu'),
              // ── NEW v0.11: Review missed questions button ──
              (quizState.missedIds && quizState.missedIds.length > 0) ? h('button', {
                onClick: function() {
                  var newBest = Math.max(quizState.bestScore, quizState.score);
                  var newRuns = quizState.completedRuns + 1;
                  setQuiz({ started: true, missedReviewMode: true, ix: 0, score: 0, selected: -1, answered: false, bestScore: newBest, completedRuns: newRuns });
                },
                className: 'px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all',
                'aria-label': 'Review ' + quizState.missedIds.length + ' missed questions only'
              }, '🎯 Review ' + quizState.missedIds.length + ' Missed') : null,
              h('button', {
                onClick: function() {
                  var newBest = Math.max(quizState.bestScore, quizState.score);
                  var newRuns = quizState.completedRuns + 1;
                  setQuiz({ started: true, missedReviewMode: false, ix: 0, score: 0, selected: -1, answered: false, bestScore: newBest, completedRuns: newRuns });
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
              // Track missed + per-difficulty stats
              setQuiz(function(cur) {
                var newMissed = (cur.missedIds || []).slice();
                if (!nowCorrect && newMissed.indexOf(question.id) === -1) newMissed.push(question.id);
                // If reviewing missed and got it right, drop from missed list
                if (cur.missedReviewMode && nowCorrect) {
                  newMissed = newMissed.filter(function(id) { return id !== question.id; });
                }
                var stats = Object.assign({}, cur.statsByDifficulty || defaultStats);
                var dKey = question.difficulty;
                stats[dKey] = { correct: (stats[dKey].correct || 0) + (nowCorrect ? 1 : 0), total: (stats[dKey].total || 0) + 1 };
                return {
                  answered: true,
                  score: cur.score + (nowCorrect ? 1 : 0),
                  missedIds: newMissed,
                  statsByDifficulty: stats
                };
              });
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
        // Compute "error radius" — inverse of asymmetry, then degraded by background noise.
        var noise = (hl.noise || 0) / 100; // 0..1
        var baseRadius = 0.05 + (1 - hl.asymmetry) * 0.35;
        // Noise widens the detection radius proportional to noise level (max +0.25 of canvas)
        var errRadius = Math.min(0.6, baseRadius + noise * 0.25);
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
              )
            ),
            // ── NEW v0.9: Background noise slider ──
            h('div', null,
              h('label', { className: 'text-xs text-cyan-300 flex items-center justify-between mb-1' },
                h('span', { className: 'font-bold' }, '🌬 Background noise (wind, traffic, rustling)'),
                h('span', { className: 'font-mono text-amber-300' }, (hl.noise || 0) + '%')
              ),
              h('input', {
                type: 'range', min: 0, max: 100, step: 5, value: (hl.noise || 0),
                onInput: function(e) { setHL({ noise: parseInt(e.target.value) }); },
                className: 'w-full',
                'aria-label': 'Background noise level'
              }),
              h('div', { className: 'flex justify-between text-[10px] text-slate-500' },
                h('span', null, '0% (silent forest)'),
                h('span', null, '50% (windy night)'),
                h('span', null, '100% (highway noise)')
              )
            ),
            h('div', { className: 'text-[10px] text-indigo-200/70 italic' },
              'Effective detection radius: ',
              h('span', { className: 'font-mono text-amber-300' }, (errRadius * 100).toFixed(0) + '%'),
              ' of canvas (base ',
              h('span', { className: 'font-mono text-slate-300' }, (baseRadius * 100).toFixed(0) + '%'),
              ' from asymmetry + ',
              h('span', { className: 'font-mono text-cyan-300' }, (noise * 25).toFixed(0) + '%'),
              ' noise widening). Real barn owls operate at ~1° error in pitch black silence; even moderate wind degrades that. Hawkesford 2019 measured ~3× detection-radius widening at 60 dB ambient.'
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

          // ── Virtual dissection (NEW v0.7) ──
          (function() {
            var pd = rh.pelletDx || { started: false, bones: null, identified: {}, complete: false };
            function setPD(patch) {
              setRH(function(prev) {
                var cur = prev.pelletDx || { started: false, bones: null, identified: {}, complete: false };
                return Object.assign({}, prev, { pelletDx: Object.assign({}, cur, typeof patch === 'function' ? patch(cur) : patch) });
              });
            }
            // 7 prey types, each with a "bone" the student identifies
            var preyTypes = [
              { id: 'vole', name: 'Meadow Vole', biomass: 30, signature: 'M-shaped molar cusps; orange incisors; ~18 mm cranium', wrong: ['Deer Mouse', 'Shrew', 'Sparrow'] },
              { id: 'mouse', name: 'Deer Mouse', biomass: 20, signature: 'Small ~15 mm cranium; long incisors; pointed snout shape', wrong: ['Meadow Vole', 'Shrew', 'Lemming'] },
              { id: 'shrew', name: 'Short-tailed Shrew', biomass: 18, signature: 'RED-TIPPED teeth (iron-pigmented enamel); ~14 mm pointed snout cranium', wrong: ['Deer Mouse', 'Vole', 'Bat'] },
              { id: 'sparrow', name: 'House Sparrow', biomass: 28, signature: 'Conical seed-eating beak; hollow bones; bird-skull shape', wrong: ['Starling', 'Songbird', 'Bat'] },
              { id: 'starling', name: 'European Starling', biomass: 75, signature: 'Long pointed bird beak; black feather barbs in pellet; medium bird cranium', wrong: ['Sparrow', 'Robin', 'Pigeon'] },
              { id: 'lemming', name: 'Bog Lemming', biomass: 35, signature: 'Vole-like but with FLAT-TOPPED grinding molars; chunky body', wrong: ['Meadow Vole', 'Deer Mouse', 'Shrew'] },
              { id: 'bat', name: 'Little Brown Bat', biomass: 8, signature: 'Tiny wing-finger bones; large eye orbits; bird-like skull but with mammal teeth', wrong: ['Sparrow', 'Shrew', 'Songbird'] }
            ];
            function generatePellet() {
              // 1-4 prey per pellet, weighted toward smaller pellets being more common
              var nPrey = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : Math.random() < 0.9 ? 3 : 4;
              var bones = [];
              for (var i = 0; i < nPrey; i++) {
                var prey = preyTypes[Math.floor(Math.random() * preyTypes.length)];
                bones.push({
                  uid: 'b' + i + '_' + Math.random().toString(36).slice(2, 8),
                  preyId: prey.id,
                  preyName: prey.name,
                  signature: prey.signature,
                  wrong: prey.wrong,
                  biomass: prey.biomass,
                  // Random position in pellet view
                  x: 12 + Math.random() * 76, // 12-88%
                  y: 12 + Math.random() * 76
                });
              }
              return bones;
            }
            function startDx() {
              setPD({ started: true, bones: generatePellet(), identified: {}, complete: false });
              rhAnnounce('New pellet generated. Click each bone to identify it.');
            }
            function identifyBone(bone, guess) {
              var correct = guess === bone.preyId;
              setPD(function(cur) {
                var newId = Object.assign({}, cur.identified);
                newId[bone.uid] = { guess: guess, correct: correct, preyName: bone.preyName };
                var allDone = cur.bones.every(function(b) { return newId[b.uid]; });
                return { identified: newId, complete: allDone };
              });
              if (correct) { if (ctx.awardXP) ctx.awardXP(2, 'Pellet Lab dissection: correct ID'); }
              rhAnnounce(correct ? 'Correct — ' + bone.preyName : 'Incorrect — actual species was ' + bone.preyName);
            }
            // Stats
            var idCount = Object.keys(pd.identified || {}).length;
            var correctCount = Object.values(pd.identified || {}).filter(function(v) { return v.correct; }).length;
            var totalBones = (pd.bones || []).length;
            var biomass = pd.bones && pd.complete ? pd.bones.reduce(function(sum, b) { return sum + b.biomass; }, 0) : 0;
            var uniqueSpecies = pd.bones && pd.complete ? Array.from(new Set(pd.bones.map(function(b) { return b.preyId; }))).length : 0;
            return h('div', { className: 'bg-orange-900/20 border border-orange-700/40 rounded-xl p-5' },
              h('div', { className: 'text-base font-bold text-orange-300 mb-2' }, '🔬 Virtual Dissection — Try It'),
              h('div', { className: 'text-xs text-orange-100/90 mb-3 leading-relaxed' }, 'Generate a virtual pellet, then click each bone to identify the prey species. Each pellet contains 1-4 prey animals from your local rodent + bird population. Use the signature clues to pick the right species.'),

              !pd.started ? h('div', { className: 'text-center py-4' },
                h('button', {
                  onClick: startDx,
                  className: 'px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 transition-all',
                  'aria-label': 'Generate virtual pellet'
                }, '🦉 Generate Virtual Pellet')
              ) : h('div', { className: 'space-y-3' },
                // Pellet visual (gradient blob with bones scattered)
                h('div', { className: 'relative bg-gradient-to-br from-stone-700 to-stone-900 rounded-3xl mx-auto', style: { width: '100%', maxWidth: '400px', aspectRatio: '4/3', backgroundImage: 'radial-gradient(circle, rgba(120,53,15,0.3), transparent 70%)' } },
                  h('div', { className: 'absolute inset-0 flex items-center justify-center pointer-events-none' },
                    h('div', { className: 'text-xs text-stone-400 italic' }, '— pellet — click bones below to identify —')
                  ),
                  (pd.bones || []).map(function(b, i) {
                    var idr = pd.identified[b.uid];
                    var bg = idr ? (idr.correct ? 'bg-emerald-500' : 'bg-red-500') : 'bg-amber-400';
                    return h('button', {
                      key: b.uid,
                      onClick: function() {
                        if (idr) return; // already done
                        // Pick a random ordering of options including the correct
                        var opts = b.wrong.slice(0, 2).concat([b.preyName]).sort(function() { return Math.random() - 0.5; });
                        // Use a simple confirm-style prompt (cycle through options)
                        // Actually we'll show options inline below.
                        // For now, store which bone is "active" for picking
                        setPD({ activeBone: b.uid });
                      },
                      disabled: !!idr,
                      'aria-label': 'Bone fragment ' + (i + 1) + (idr ? ' — identified as ' + idr.preyName : ' — click to identify'),
                      className: 'absolute w-8 h-8 rounded-full ' + bg + ' shadow-lg transform hover:scale-110 transition-all flex items-center justify-center text-xs font-bold text-stone-900 border-2 border-stone-900',
                      style: { left: b.x + '%', top: b.y + '%', transform: 'translate(-50%, -50%)' }
                    }, idr ? (idr.correct ? '✓' : '✗') : '🦴');
                  })
                ),

                // Active bone identification panel
                (function() {
                  var activeBone = (pd.bones || []).filter(function(b) { return b.uid === pd.activeBone && !pd.identified[b.uid]; })[0];
                  if (!activeBone) return null;
                  var opts = activeBone.wrong.slice(0, 2).concat([activeBone.preyName]);
                  // Deterministic shuffle by uid
                  opts = opts.sort(function(a, b) { return (a + activeBone.uid).localeCompare(b + activeBone.uid); });
                  return h('div', { className: 'bg-slate-900/60 border border-amber-700/40 rounded-lg p-3' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-2' }, '🦴 Identify this bone'),
                    h('div', { className: 'text-xs text-slate-200 mb-3 italic' }, 'Signature: ' + activeBone.signature),
                    h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
                      opts.map(function(opt, oi) {
                        // Map back to id
                        var matchingPrey = preyTypes.filter(function(p) { return p.name === opt; })[0];
                        var guessId = matchingPrey ? matchingPrey.id : opt;
                        return h('button', {
                          key: oi,
                          onClick: function() { identifyBone(activeBone, guessId); setPD({ activeBone: null }); },
                          className: 'px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-amber-200 hover:bg-amber-900/40 hover:text-amber-100 transition-all border border-slate-700',
                          'aria-label': 'Identify as ' + opt
                        }, opt);
                      })
                    )
                  );
                })(),

                // Progress
                h('div', { className: 'flex items-center justify-between text-xs' },
                  h('div', { className: 'text-slate-300' }, 'Bones identified: ' + idCount + ' / ' + totalBones + ' · Correct: ', h('span', { className: 'text-emerald-300 font-bold' }, correctCount)),
                  pd.complete && h('div', { className: 'text-emerald-300 font-bold' }, '✓ Dissection complete')
                ),

                // Results panel
                pd.complete && h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 space-y-2' },
                  h('div', { className: 'text-sm font-bold text-emerald-300' }, '📊 Pellet Analysis Results'),
                  h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                    h('div', { className: 'bg-slate-800/40 rounded p-2' },
                      h('div', { className: 'text-xl font-bold text-amber-300' }, totalBones),
                      h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Prey items')
                    ),
                    h('div', { className: 'bg-slate-800/40 rounded p-2' },
                      h('div', { className: 'text-xl font-bold text-amber-300' }, uniqueSpecies),
                      h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Species')
                    ),
                    h('div', { className: 'bg-slate-800/40 rounded p-2' },
                      h('div', { className: 'text-xl font-bold text-amber-300' }, biomass + 'g'),
                      h('div', { className: 'text-[10px] text-slate-400 uppercase' }, 'Biomass')
                    )
                  ),
                  h('div', { className: 'text-xs text-emerald-100/90 italic leading-relaxed' },
                    'Real-world equivalent: a single owl roost with 50 pellets like this would document ',
                    h('span', { className: 'font-bold text-amber-300' }, totalBones * 50 + ' prey animals'),
                    ' across the local landscape — ',
                    h('span', { className: 'font-bold text-amber-300' }, (biomass * 50 / 1000).toFixed(1) + ' kg of small-mammal biomass'),
                    ' — without trapping a single mouse. This is why pellet science is a backbone of small-mammal ecology research.'
                  )
                ),

                // Reset button
                h('div', { className: 'flex gap-2 justify-center pt-2' },
                  h('button', {
                    onClick: startDx,
                    className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-amber-300 hover:bg-slate-600',
                    'aria-label': 'Generate another pellet'
                  }, '🔁 New Pellet'),
                  h('button', {
                    onClick: function() { setPD({ started: false, bones: null, identified: {}, complete: false, activeBone: null }); },
                    className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600',
                    'aria-label': 'Close dissection'
                  }, '✕ Close')
                )
              )
            );
          })(),

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

          // ── NEW v0.10: Horizontal era timeline SVG ──
          (function() {
            // Map each era to a date midpoint + color
            var eraDates = [
              { y: -2000, label: 'Bronze Age', color: '#fbbf24', shortLabel: 'Mongolian Berkutchi' },
              { y: -300, label: 'Persian/Arabian', color: '#f59e0b', shortLabel: 'Royal sport' },
              { y: 1350, label: 'Medieval Europe', color: '#dc2626', shortLabel: 'Frederick II 1240' },
              { y: 1800, label: 'Decline / Persecution', color: '#737373', shortLabel: 'Industrial era' },
              { y: 1995, label: 'Conservation', color: '#10b981', shortLabel: '1970-present' }
            ];
            // Timeline spans 2200 BCE to 2030 CE
            var yMin = -2200, yMax = 2030;
            var pw = 700, ph = 130;
            var pad = 25;
            function xAt(y) { return pad + (y - yMin) / (yMax - yMin) * (pw - 2 * pad); }
            // Reference event markers
            var events = [
              { y: -2000, lbl: 'Berkutchi tradition begins' },
              { y: -3000, lbl: 'Horus falcon cult', tiny: true },
              { y: -104, lbl: 'Roman Aquila legions' },
              { y: 1240, lbl: "De Arte Venandi (Frederick II)" },
              { y: 1486, lbl: "Boke of Saint Albans" },
              { y: 1782, lbl: 'US adopts bald eagle' },
              { y: 1934, lbl: 'Hawk Mtn founded' },
              { y: 1970, lbl: 'Peregrine Fund' },
              { y: 1972, lbl: 'US DDT ban' },
              { y: 2010, lbl: 'UNESCO falconry listing' }
            ];
            return h('div', { className: 'bg-slate-900/40 border border-orange-700/40 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-orange-300 mb-1' }, '🕰 4,000-Year Timeline of Falconry'),
              h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'Visual sweep from Bronze Age Mongolian steppe through medieval Europe to today\'s UNESCO-protected practice.'),
              h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': '4,000-year falconry timeline' },
                h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
                // Main timeline bar
                h('line', { x1: pad, y1: 70, x2: pw - pad, y2: 70, stroke: '#475569', strokeWidth: 2 }),
                // Era zone bands
                eraDates.map(function(era, i) {
                  var next = eraDates[i + 1];
                  var startY = era.y - (i === 0 ? 400 : (era.y - eraDates[i-1].y) / 2);
                  var endY = next ? era.y + (next.y - era.y) / 2 : yMax;
                  if (i === 0) startY = yMin;
                  var x0 = xAt(startY);
                  var x1 = xAt(endY);
                  return h('g', { key: i },
                    h('rect', { x: x0, y: 60, width: x1 - x0, height: 20, fill: era.color, opacity: 0.35 }),
                    h('rect', { x: x0, y: 60, width: x1 - x0, height: 20, fill: 'none', stroke: era.color, strokeWidth: 1 })
                  );
                }),
                // Era labels (above the band)
                eraDates.map(function(era, i) {
                  return h('g', { key: 'el' + i },
                    h('text', { x: xAt(era.y), y: 50, fontSize: 11, fill: era.color, fontWeight: 'bold', textAnchor: 'middle' }, era.label),
                    h('text', { x: xAt(era.y), y: 95, fontSize: 9, fill: '#cbd5e1', textAnchor: 'middle' }, era.shortLabel)
                  );
                }),
                // Time tick marks
                [-2000, -1000, 0, 1000, 1500, 1800, 1900, 2000].map(function(yk, i) {
                  return h('g', { key: 'tk' + i },
                    h('line', { x1: xAt(yk), y1: 68, x2: xAt(yk), y2: 72, stroke: '#94a3b8', strokeWidth: 1 }),
                    h('text', { x: xAt(yk), y: 115, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, yk < 0 ? Math.abs(yk) + ' BCE' : yk + ' CE')
                  );
                }),
                // Event markers
                events.map(function(ev, i) {
                  var dotR = ev.tiny ? 3 : 5;
                  // Alternate above/below
                  var above = i % 2 === 0;
                  var ly = above ? 18 : 22;
                  var lx = xAt(ev.y);
                  return h('g', { key: 'ev' + i },
                    h('line', { x1: lx, y1: above ? 32 : 80, x2: lx, y2: 70, stroke: '#fde047', strokeWidth: 0.8, opacity: 0.6 }),
                    h('circle', { cx: lx, cy: 70, r: dotR, fill: '#fde047', stroke: '#1c1917', strokeWidth: 1 })
                  );
                })
              ),
              h('div', { className: 'text-[10px] text-slate-500 italic mt-1' }, 'Falconry is one of the oldest continuously-practiced human cultural traditions — UNESCO Intangible Cultural Heritage 2010 (now 24 nations).')
            );
          })(),

          // Timeline of eras (textual cards)
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '📜 The 5 eras in detail'),
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
      // RENDER: ANATOMY (interactive SVG with hover labels)
      // ────────────────────────────────────────────────────────
      function renderAnatomy() {
        var hoveredId = rh.anatomyHover || null;
        var anatomyMode = rh.anatomyMode || 'explore'; // 'explore' | 'quiz'
        var quizPart = rh.anatomyQuizPart || null;
        var quizOptions = rh.anatomyQuizOptions || null;
        var quizResult = rh.anatomyQuizResult || null;
        var quizStats = rh.anatomyQuizStats || { attempts: 0, correct: 0 };
        function setHover(id) {
          setRH({ anatomyHover: id });
        }
        function setAnatomyMode(m) {
          if (m === 'quiz') {
            // Pick a random part + 3 wrong options
            var pickIdx = Math.floor(Math.random() * ANATOMY.parts.length);
            var pick = ANATOMY.parts[pickIdx];
            var wrong = ANATOMY.parts.filter(function(p) { return p.id !== pick.id; }).slice().sort(function() { return Math.random() - 0.5; }).slice(0, 3);
            var opts = [pick].concat(wrong).sort(function() { return Math.random() - 0.5; });
            setRH({ anatomyMode: 'quiz', anatomyQuizPart: pick.id, anatomyQuizOptions: opts.map(function(p) { return p.id; }), anatomyQuizResult: null, anatomyHover: null });
          } else {
            setRH({ anatomyMode: 'explore', anatomyHover: null });
          }
        }
        function nextQuiz() {
          var pickIdx = Math.floor(Math.random() * ANATOMY.parts.length);
          var pick = ANATOMY.parts[pickIdx];
          var wrong = ANATOMY.parts.filter(function(p) { return p.id !== pick.id; }).slice().sort(function() { return Math.random() - 0.5; }).slice(0, 3);
          var opts = [pick].concat(wrong).sort(function() { return Math.random() - 0.5; });
          setRH({ anatomyQuizPart: pick.id, anatomyQuizOptions: opts.map(function(p) { return p.id; }), anatomyQuizResult: null });
        }
        function submitGuess(guessId) {
          var correct = guessId === quizPart;
          var part = ANATOMY.parts.filter(function(p) { return p.id === quizPart; })[0];
          setRH(function(cur) {
            var stats = cur.anatomyQuizStats || { attempts: 0, correct: 0 };
            return Object.assign({}, cur, {
              anatomyQuizResult: { guessId: guessId, correct: correct, part: part.label, desc: part.desc },
              anatomyQuizStats: { attempts: stats.attempts + 1, correct: stats.correct + (correct ? 1 : 0) }
            });
          });
          rhAnnounce(correct ? 'Correct — ' + part.label : 'Incorrect. Answer was ' + part.label);
          if (correct && ctx.awardXP) ctx.awardXP(2, 'Anatomy quiz: ' + part.label);
        }
        var hovered = hoveredId ? ANATOMY.parts.filter(function(p) { return p.id === hoveredId; })[0] : null;
        // For quiz mode: the target part anchor we highlight
        var quizTargetPart = quizPart ? ANATOMY.parts.filter(function(p) { return p.id === quizPart; })[0] : null;

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-700/40 rounded-xl p-4' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', { className: 'flex-1' },
                h('div', { className: 'text-lg font-bold text-amber-200 mb-2' }, '🦴 Raptor Anatomy'),
                h('div', { className: 'text-sm text-amber-100/90 leading-relaxed' }, ANATOMY.intro)
              ),
              // ── NEW v0.12: Mode toggle ──
              h('div', { className: 'flex gap-1 bg-slate-900/60 rounded-lg p-1' },
                ['explore', 'quiz'].map(function(m) {
                  var active = anatomyMode === m;
                  return h('button', {
                    key: m,
                    onClick: function() { setAnatomyMode(m); },
                    className: 'px-3 py-1 rounded text-xs font-bold transition-all ' + (active
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                      : 'text-amber-200 hover:text-amber-100'),
                    'aria-label': m === 'explore' ? 'Explore mode' : 'Quiz mode',
                    'aria-pressed': active
                  }, m === 'explore' ? '👁 Explore' : '🎯 Quiz');
                })
              )
            )
          ),

          // ── Quiz Mode Panel ──
          anatomyMode === 'quiz' && quizTargetPart && h('div', { className: 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 rounded-xl p-4' },
            h('div', { className: 'flex items-center justify-between gap-3 mb-2' },
              h('div', { className: 'text-sm font-bold text-orange-300' }, '🎯 Identify the highlighted anchor →'),
              h('div', { className: 'text-xs font-mono text-amber-300' }, 'Score: ' + quizStats.correct + '/' + quizStats.attempts)
            ),
            !quizResult ? h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
              quizOptions && quizOptions.map(function(optId) {
                var optPart = ANATOMY.parts.filter(function(p) { return p.id === optId; })[0];
                if (!optPart) return null;
                return h('button', {
                  key: optId,
                  onClick: function() { submitGuess(optId); },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold bg-slate-800/50 text-amber-200 hover:bg-amber-900/40 hover:text-amber-100 border border-slate-700 transition-all',
                  'aria-label': 'Guess ' + optPart.label
                }, optPart.label);
              })
            ) : h('div', { className: 'space-y-2' },
              h('div', { className: 'p-3 rounded-lg ' + (quizResult.correct ? 'bg-emerald-900/40 border border-emerald-700/50' : 'bg-red-900/40 border border-red-700/50') },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('div', { className: 'text-2xl' }, quizResult.correct ? '✓' : '✗'),
                  h('div', { className: 'font-bold ' + (quizResult.correct ? 'text-emerald-300' : 'text-red-300') }, quizResult.correct ? 'Correct! +2 XP — ' + quizResult.part : 'The answer was ' + quizResult.part)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, quizResult.desc)
              ),
              h('button', {
                onClick: nextQuiz,
                className: 'w-full px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700',
                'aria-label': 'Next anatomy question'
              }, '➡ Next Anchor')
            )
          ),

          // Interactive SVG
          h('div', { className: 'bg-slate-900/60 border border-amber-700/40 rounded-xl p-3' },
            h('div', { className: 'text-xs text-slate-400 mb-2 italic' }, anatomyMode === 'explore'
              ? '👆 Hover or tap a label to read about each body part'
              : '🎯 The pulsing red anchor is the target. Pick the right name from the options above.'),
            h('svg', {
              viewBox: '0 0 800 500',
              role: 'img',
              'aria-label': 'Labeled raptor anatomy diagram with interactive hover labels',
              style: { width: '100%', height: 'auto', maxHeight: '500px', display: 'block' }
            },
              // Background sky
              h('rect', { x: 0, y: 0, width: 800, height: 500, fill: '#1e293b' }),
              // Stylized bird silhouette (procedural raptor profile facing right)
              // Body (ellipse)
              h('ellipse', { cx: 450, cy: 280, rx: 180, ry: 100, fill: '#78350f', stroke: '#a16207', strokeWidth: 2 }),
              // Head
              h('circle', { cx: 615, cy: 195, r: 75, fill: '#a16207', stroke: '#c2410c', strokeWidth: 2 }),
              // Beak
              h('path', { d: 'M 680 200 L 720 215 L 685 232 Z', fill: '#fbbf24', stroke: '#92400e', strokeWidth: 2 }),
              // Eye
              h('circle', { cx: 625, cy: 175, r: 18, fill: '#fefce8', stroke: '#92400e', strokeWidth: 1.5 }),
              h('circle', { cx: 628, cy: 178, r: 9, fill: '#1c1917' }),
              // Wing (left, large, fanned)
              h('path', { d: 'M 380 220 Q 250 140 110 180 Q 80 200 130 240 Q 220 260 360 290 Z', fill: '#92400e', stroke: '#78350f', strokeWidth: 2 }),
              // Primary feather "fingers"
              h('path', { d: 'M 180 175 L 80 165 L 120 195 Z', fill: '#78350f', stroke: '#451a03', strokeWidth: 1.5 }),
              h('path', { d: 'M 195 170 L 100 145 L 130 188 Z', fill: '#78350f', stroke: '#451a03', strokeWidth: 1.5 }),
              h('path', { d: 'M 215 168 L 130 130 L 145 178 Z', fill: '#78350f', stroke: '#451a03', strokeWidth: 1.5 }),
              h('path', { d: 'M 240 170 L 165 122 L 165 175 Z', fill: '#78350f', stroke: '#451a03', strokeWidth: 1.5 }),
              // Alula
              h('path', { d: 'M 245 180 L 220 165 L 240 195 Z', fill: '#fcd34d', stroke: '#92400e', strokeWidth: 1 }),
              // Tail
              h('path', { d: 'M 290 320 Q 160 310 110 380 Q 180 360 295 360 Z', fill: '#9a3412', stroke: '#7c2d12', strokeWidth: 2 }),
              // Tail bands
              h('path', { d: 'M 130 365 L 285 350', stroke: '#451a03', strokeWidth: 2 }),
              h('path', { d: 'M 160 372 L 280 360', stroke: '#451a03', strokeWidth: 2 }),
              // Leg + foot
              h('path', { d: 'M 480 370 Q 490 410 510 445', stroke: '#fbbf24', strokeWidth: 8, fill: 'none' }),
              // Talons
              h('path', { d: 'M 510 445 L 545 460 L 560 480', stroke: '#1c1917', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 510 445 L 525 470 L 530 490', stroke: '#1c1917', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 510 445 L 500 475 L 495 495', stroke: '#1c1917', strokeWidth: 3, fill: 'none' }),
              h('path', { d: 'M 510 445 L 480 460 L 470 490', stroke: '#1c1917', strokeWidth: 3, fill: 'none' }), // hallux (back)
              // Breast streaks
              h('path', { d: 'M 470 260 Q 480 280 475 305', stroke: '#451a03', strokeWidth: 2, fill: 'none' }),
              h('path', { d: 'M 500 265 Q 510 285 505 310', stroke: '#451a03', strokeWidth: 2, fill: 'none' }),
              h('path', { d: 'M 530 265 Q 540 285 535 310', stroke: '#451a03', strokeWidth: 2, fill: 'none' }),

              // Labels — in explore mode show all; in quiz mode only show target as red pulsing dot
              anatomyMode === 'explore' ? ANATOMY.parts.map(function(p, i) {
                var isHovered = hoveredId === p.id;
                return h('g', { key: p.id },
                  // Connector line
                  h('line', {
                    x1: p.x, y1: p.y, x2: p.lx, y2: p.ly,
                    stroke: isHovered ? '#fbbf24' : '#475569',
                    strokeWidth: isHovered ? 2 : 1,
                    strokeDasharray: '4,3'
                  }),
                  // Anchor dot
                  h('circle', {
                    cx: p.x, cy: p.y, r: isHovered ? 6 : 4,
                    fill: isHovered ? '#fbbf24' : '#fde047',
                    stroke: '#451a03', strokeWidth: 1.5
                  }),
                  // Label background
                  h('rect', {
                    x: p.lx < 400 ? p.lx - 130 : p.lx,
                    y: p.ly - 10, width: 130, height: 22, rx: 4,
                    fill: isHovered ? 'rgba(251,191,36,0.85)' : 'rgba(15,23,42,0.75)',
                    stroke: '#92400e', strokeWidth: 1,
                    style: { cursor: 'pointer' },
                    onMouseEnter: function() { setHover(p.id); },
                    onMouseLeave: function() { setHover(null); },
                    onClick: function() { setHover(p.id); }
                  }),
                  // Label text
                  h('text', {
                    x: p.lx < 400 ? p.lx - 65 : p.lx + 65,
                    y: p.ly + 5,
                    fontSize: 11, fontWeight: 'bold',
                    fill: isHovered ? '#1c1917' : '#fcd34d',
                    textAnchor: 'middle',
                    style: { pointerEvents: 'none', userSelect: 'none' }
                  }, p.label)
                );
              }) :
              // Quiz mode: show target anchor only, pulsing
              (quizTargetPart && h('g', null,
                // Outer pulsing ring (3 concentric)
                h('circle', { cx: quizTargetPart.x, cy: quizTargetPart.y, r: 18, fill: 'none', stroke: '#dc2626', strokeWidth: 2, opacity: 0.4 }),
                h('circle', { cx: quizTargetPart.x, cy: quizTargetPart.y, r: 12, fill: 'none', stroke: '#dc2626', strokeWidth: 2, opacity: 0.7 }),
                h('circle', { cx: quizTargetPart.x, cy: quizTargetPart.y, r: 7, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }),
                // Question-mark label in quiz mode (revealed only on answered)
                quizResult && h('text', {
                  x: quizTargetPart.x, y: quizTargetPart.y - 25,
                  fontSize: 14, fontWeight: 'bold',
                  fill: quizResult.correct ? '#10b981' : '#dc2626',
                  textAnchor: 'middle'
                }, '★ ' + quizTargetPart.label)
              ))
            )
          ),

          // Hovered description panel
          hovered ? h('div', { className: 'bg-amber-900/30 border border-amber-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-1' }, '🔍 ' + hovered.label),
            h('div', { className: 'text-sm text-amber-100/90 leading-relaxed' }, hovered.desc)
          ) : h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 text-center text-xs text-slate-400 italic' },
            'Hover or tap any label above to see the description here.'
          ),

          // ── NEW v0.15: Cross-Species Comparison ──
          (function() {
            var compareKey = rh.anatomyCompare || 'talons';
            function setCompareKey(k) { setRH({ anatomyCompare: k }); }
            var compareTypes = [
              { id: 'talons', label: '🪝 Talons', desc: 'Length + grip force across species' },
              { id: 'wings', label: '🪶 Wings', desc: 'Wingspan + loading + aspect ratio' },
              { id: 'eyes', label: '👁 Eyes', desc: 'Visual acuity + field of view' },
              { id: 'mass', label: '⚖ Body Mass', desc: 'Body size + weight distribution' }
            ];
            // Per-comparison: SVG visualization showing all 8 species' values
            function drawComparison(type) {
              if (type === 'talons') {
                // Sort by talon length, then by force
                var sorted = SPECIES.slice().sort(function(a, b) { return b.talonLengthMm - a.talonLengthMm; });
                var maxLen = Math.max.apply(null, sorted.map(function(s) { return s.talonLengthMm; }));
                var maxForce = Math.max.apply(null, sorted.map(function(s) { return s.talonForcePsi; }));
                return h('div', { className: 'space-y-2' },
                  h('div', { className: 'text-xs text-slate-400 italic' }, 'Each row shows a species\' hallux (rear killing talon) drawn to scale. The amber bar is grip force (psi).'),
                  sorted.map(function(s, i) {
                    var lenPct = (s.talonLengthMm / maxLen) * 80;
                    var forcePct = (s.talonForcePsi / maxForce) * 100;
                    var color = s.talonForcePsi >= 600 ? '#dc2626' : s.talonForcePsi >= 400 ? '#f97316' : '#fbbf24';
                    return h('div', { key: s.id, className: 'bg-slate-800/40 rounded p-2 flex items-center gap-3' },
                      h('div', { className: 'flex-shrink-0 w-32 text-xs' },
                        h('span', { className: 'mr-1' }, s.emoji),
                        h('span', { className: 'text-amber-200 font-bold' }, s.name)
                      ),
                      // Talon SVG (curved hook)
                      h('svg', { viewBox: '0 0 200 60', style: { width: '200px', height: '60px', flexShrink: 0 }, role: 'img', 'aria-label': s.name + ' talon' },
                        // Curved talon path scaled
                        h('path', {
                          d: 'M 10 50 Q ' + (10 + lenPct * 0.7) + ' 5 ' + (10 + lenPct) + ' 30',
                          fill: 'none', stroke: '#1c1917', strokeWidth: 4, strokeLinecap: 'round'
                        }),
                        h('text', { x: 10 + lenPct + 6, y: 33, fontSize: 10, fill: '#fbbf24', fontWeight: 'bold' }, s.talonLengthMm + ' mm')
                      ),
                      // Grip force bar
                      h('div', { className: 'flex-1 flex items-center gap-2' },
                        h('div', { className: 'flex-1 bg-slate-700/50 rounded h-4 overflow-hidden' },
                          h('div', { style: { width: forcePct + '%', backgroundColor: color }, className: 'h-full' })
                        ),
                        h('div', { className: 'text-xs font-mono font-bold w-16 text-right', style: { color: color } }, s.talonForcePsi + ' psi')
                      )
                    );
                  })
                );
              }
              if (type === 'wings') {
                var sorted = SPECIES.slice().sort(function(a, b) { return b.wingspanM - a.wingspanM; });
                var maxSpan = Math.max.apply(null, sorted.map(function(s) { return s.wingspanM; }));
                return h('div', { className: 'space-y-2' },
                  h('div', { className: 'text-xs text-slate-400 italic' }, 'Each row shows wingspan to scale (gold bar) + wing loading (red dot — further right = faster) + aspect ratio (cyan dot — further right = more soaring-efficient).'),
                  sorted.map(function(s, i) {
                    var spanPct = (s.wingspanM / maxSpan) * 70;
                    var loadingX = (s.wingLoading / 18) * 100;
                    var arX = (s.aspectRatio / 12) * 100;
                    return h('div', { key: s.id, className: 'bg-slate-800/40 rounded p-2 flex items-center gap-3' },
                      h('div', { className: 'flex-shrink-0 w-32 text-xs' },
                        h('span', { className: 'mr-1' }, s.emoji),
                        h('span', { className: 'text-amber-200 font-bold' }, s.name)
                      ),
                      h('svg', { viewBox: '0 0 300 50', style: { width: '300px', height: '50px', flexShrink: 0 }, role: 'img', 'aria-label': s.name + ' wing stats' },
                        // Wingspan bar
                        h('rect', { x: 5, y: 20, width: spanPct * 2.8, height: 10, fill: '#fbbf24', rx: 2 }),
                        h('text', { x: 5 + spanPct * 2.8 + 4, y: 28, fontSize: 9, fill: '#fcd34d', fontWeight: 'bold' }, s.wingspanM + ' m'),
                        // Loading dot
                        h('circle', { cx: 5 + loadingX * 2.7, cy: 42, r: 5, fill: '#dc2626' }),
                        h('text', { x: 5 + loadingX * 2.7, y: 49, fontSize: 7, fill: '#fca5a5', textAnchor: 'middle' }, s.wingLoading),
                        // AR dot
                        h('circle', { cx: 5 + arX * 2.7, cy: 12, r: 5, fill: '#06b6d4' }),
                        h('text', { x: 5 + arX * 2.7, y: 9, fontSize: 7, fill: '#67e8f9', textAnchor: 'middle' }, s.aspectRatio)
                      )
                    );
                  })
                );
              }
              if (type === 'eyes') {
                var sorted = SPECIES.slice().sort(function(a, b) { return b.visualAcuityX - a.visualAcuityX; });
                return h('div', { className: 'space-y-2' },
                  h('div', { className: 'text-xs text-slate-400 italic' }, 'Each row shows eye size proportional to acuity (gold circle) + visual field arc.'),
                  sorted.map(function(s, i) {
                    var eyeR = 4 + s.visualAcuityX * 3;
                    var fovDeg = s.visualFieldDeg;
                    return h('div', { key: s.id, className: 'bg-slate-800/40 rounded p-2 flex items-center gap-3' },
                      h('div', { className: 'flex-shrink-0 w-32 text-xs' },
                        h('span', { className: 'mr-1' }, s.emoji),
                        h('span', { className: 'text-amber-200 font-bold' }, s.name)
                      ),
                      h('svg', { viewBox: '0 0 200 60', style: { width: '200px', height: '60px', flexShrink: 0 }, role: 'img', 'aria-label': s.name + ' eye + field' },
                        // FOV arc
                        (function() {
                          var halfFov = fovDeg / 2;
                          var startA = (-halfFov - 90) * Math.PI / 180;
                          var endA = (halfFov - 90) * Math.PI / 180;
                          var arcR = 22;
                          var cx = 30, cy = 35;
                          var x0 = cx + arcR * Math.cos(startA);
                          var y0 = cy + arcR * Math.sin(startA);
                          var x1 = cx + arcR * Math.cos(endA);
                          var y1 = cy + arcR * Math.sin(endA);
                          var largeArc = fovDeg > 180 ? 1 : 0;
                          return h('path', { d: 'M ' + cx + ' ' + cy + ' L ' + x0 + ' ' + y0 + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 1 ' + x1 + ' ' + y1 + ' Z', fill: '#fde047', opacity: 0.3, stroke: '#fbbf24', strokeWidth: 1 });
                        })(),
                        // Eye circle (size = acuity)
                        h('circle', { cx: 30, cy: 35, r: eyeR, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 1.5 }),
                        h('circle', { cx: 30, cy: 35, r: eyeR * 0.5, fill: '#1c1917' }),
                        // Labels
                        h('text', { x: 80, y: 25, fontSize: 10, fill: '#fbbf24', fontWeight: 'bold' }, s.visualAcuityX + '× acuity'),
                        h('text', { x: 80, y: 40, fontSize: 10, fill: '#fde047' }, fovDeg + '° field'),
                        h('text', { x: 80, y: 53, fontSize: 9, fill: '#cbd5e1' }, s.foveaCount + ' fovea/eye')
                      )
                    );
                  })
                );
              }
              if (type === 'mass') {
                var sorted = SPECIES.slice().sort(function(a, b) { return b.massKg - a.massKg; });
                var maxMass = Math.max.apply(null, sorted.map(function(s) { return s.massKg; }));
                return h('div', { className: 'space-y-2' },
                  h('div', { className: 'text-xs text-slate-400 italic' }, 'Each row shows body size to scale. The harpy eagle is 8× heavier than a peregrine.'),
                  sorted.map(function(s, i) {
                    var sizePct = (s.massKg / maxMass) * 60;
                    return h('div', { key: s.id, className: 'bg-slate-800/40 rounded p-2 flex items-center gap-3' },
                      h('div', { className: 'flex-shrink-0 w-32 text-xs' },
                        h('span', { className: 'mr-1' }, s.emoji),
                        h('span', { className: 'text-amber-200 font-bold' }, s.name)
                      ),
                      h('div', { className: 'flex-1 flex items-center gap-2' },
                        // Body silhouette ellipse scaled
                        h('svg', { viewBox: '0 0 280 40', style: { width: '280px', height: '40px' }, role: 'img', 'aria-label': s.name + ' body size' },
                          h('ellipse', { cx: 10 + sizePct * 0.5, cy: 20, rx: Math.max(5, sizePct * 0.5), ry: Math.max(3, sizePct * 0.25), fill: '#92400e', stroke: '#fbbf24', strokeWidth: 1.5 }),
                          // Head
                          h('circle', { cx: 10 + sizePct, cy: 18, r: Math.max(3, sizePct * 0.15), fill: '#a16207' }),
                          // Beak
                          h('path', { d: 'M ' + (12 + sizePct) + ' 18 L ' + (16 + sizePct) + ' 18 L ' + (14 + sizePct) + ' 22 Z', fill: '#fbbf24' }),
                          h('text', { x: 280 - 5, y: 24, fontSize: 11, fill: '#fde047', textAnchor: 'end', fontWeight: 'bold' }, s.massKg + ' kg')
                        )
                      )
                    );
                  })
                );
              }
              return null;
            }
            return h('div', { className: 'bg-slate-900/40 border border-amber-700/40 rounded-xl p-4 space-y-3' },
              h('div', { className: 'text-sm font-bold text-amber-300' }, '🔬 Cross-Species Comparison'),
              h('div', { className: 'text-xs text-slate-400 italic' }, 'Compare the same body part across all 8 species. Reveals the dramatic scale differences hidden in single-species views.'),
              // Body part selector
              h('div', { className: 'flex flex-wrap gap-2' },
                compareTypes.map(function(c) {
                  var active = compareKey === c.id;
                  return h('button', {
                    key: c.id,
                    onClick: function() { setCompareKey(c.id); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                      : 'bg-slate-800 text-amber-200 hover:bg-slate-700 border border-slate-700'),
                    'aria-label': c.label + ': ' + c.desc,
                    'aria-pressed': active
                  }, c.label);
                })
              ),
              // Visualization
              drawComparison(compareKey)
            );
          })(),

          // Full list (for reading + accessibility)
          h('details', { className: 'bg-slate-900/30 border border-slate-700/40 rounded-xl p-3' },
            h('summary', { className: 'text-sm font-bold text-amber-300 cursor-pointer' }, '📖 All anatomy entries (read-through view)'),
            h('div', { className: 'mt-3 space-y-2' },
              ANATOMY.parts.map(function(p, i) {
                return h('div', { key: p.id, className: 'bg-slate-800/40 rounded p-2.5 text-xs' },
                  h('div', { className: 'font-bold text-amber-300 mb-1' }, p.label),
                  h('div', { className: 'text-slate-200' }, p.desc)
                );
              })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: LIFECYCLE & DEMOGRAPHICS
      // ────────────────────────────────────────────────────────
      function renderLifecycle() {
        var pop = rh.population || { adultSurv: 0.90, juvSurv: 0.40, fecundity: 0.8, years: 30, startSize: 100, adultMortBump: 0 };
        function setPop(patch) {
          setRH({ population: Object.assign({}, pop, patch) });
        }
        // Simulate population
        var pts = [];
        var current = pop.startSize;
        var effAdultSurv = Math.max(0.01, Math.min(0.99, pop.adultSurv - pop.adultMortBump));
        var lambda = effAdultSurv + (pop.juvSurv * pop.fecundity) / 2;
        for (var y = 0; y <= pop.years; y++) {
          pts.push({ year: y, pop: current });
          current = current * lambda;
        }
        var finalPop = pts[pts.length - 1].pop;
        var trend = lambda > 1.01 ? 'GROWING' : lambda < 0.99 ? 'DECLINING' : 'STABLE';
        var trendColor = trend === 'GROWING' ? 'emerald' : trend === 'DECLINING' ? 'red' : 'amber';
        // Plot dimensions
        var pw = 600, ph = 200;
        var maxPop = Math.max.apply(null, pts.map(function(p) { return p.pop; }));
        var minPop = Math.min.apply(null, pts.map(function(p) { return p.pop; }));
        var range = Math.max(1, maxPop - minPop);
        var plotPath = pts.map(function(p, i) {
          var x = (i / pop.years) * pw;
          var py = ph - ((p.pop - minPop) / range) * (ph - 20) - 10;
          return (i === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + py.toFixed(1);
        }).join(' ');

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-emerald-200 mb-2' }, '🐣 Lifecycle & Demographics'),
            h('div', { className: 'text-sm text-emerald-100/90 leading-relaxed' }, LIFECYCLE.overview)
          ),

          // Stages
          h('div', { className: 'space-y-2' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🌱 The 7 lifecycle stages'),
            LIFECYCLE.stages.map(function(s, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-3' },
                h('div', { className: 'flex items-baseline justify-between gap-2 mb-1' },
                  h('div', { className: 'text-sm font-bold text-emerald-300' }, s.stage),
                  h('div', { className: 'text-[10px] text-slate-500 font-mono' }, s.timing + ' · ' + s.duration)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, s.detail),
                h('div', { className: 'text-[11px] text-red-300 font-mono' }, '⚠ Mortality: ' + s.mortality)
              );
            })
          ),

          // Longevity comparison
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '📊 Lifespan + survival across species'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-xs' },
                h('thead', null,
                  h('tr', { className: 'text-left text-slate-400 border-b border-slate-700' },
                    h('th', { className: 'pb-2 pr-2' }, 'Species'),
                    h('th', { className: 'pb-2 px-2' }, '1st-yr mort'),
                    h('th', { className: 'pb-2 px-2' }, 'Adult ann. surv'),
                    h('th', { className: 'pb-2 px-2' }, 'Mean wild lifespan'),
                    h('th', { className: 'pb-2 px-2' }, 'Record (wild)')
                  )
                ),
                h('tbody', null,
                  LIFECYCLE.longevity.map(function(l, i) {
                    return h('tr', { key: i, className: 'border-b border-slate-800/50' },
                      h('td', { className: 'py-1.5 pr-2 text-amber-300 font-bold' }, l.species),
                      h('td', { className: 'py-1.5 px-2 text-red-300 font-mono' }, l.firstYearMort),
                      h('td', { className: 'py-1.5 px-2 text-emerald-300 font-mono' }, l.adultAnnualSurv),
                      h('td', { className: 'py-1.5 px-2 text-slate-200' }, l.meanLifespan),
                      h('td', { className: 'py-1.5 px-2 text-slate-200' }, l.recordWild)
                    );
                  })
                )
              )
            )
          ),

          // ── NEW v0.11: Survivorship Curve plot ──
          (function() {
            // Survivorship curves: % of cohort still alive at each age
            // Three reference types (textbook ecology):
            //  Type I — high adult survival, low juvenile mortality (humans, large mammals)
            //  Type II — constant mortality across life (many birds, reptiles)
            //  Type III — heavy juvenile mortality, few survive to adulthood (most fish, insects, plants)
            // Raptor curves typically Type I — once past the juvenile bottleneck, adult survival is very high
            // Compute survivorship from juv mortality + annual adult survival
            // Plot for 4 reference species at log-Y scale
            var speciesPlot = [
              { id: 'baldEagle', name: 'Bald Eagle', juvMort: 0.60, adultSurv: 0.90, color: '#fbbf24', maxAge: 35 },
              { id: 'peregrine', name: 'Peregrine', juvMort: 0.70, adultSurv: 0.85, color: '#dc2626', maxAge: 25 },
              { id: 'redTail', name: 'Red-tailed Hawk', juvMort: 0.70, adultSurv: 0.78, color: '#10b981', maxAge: 25 },
              { id: 'kestrel', name: 'American Kestrel', juvMort: 0.65, adultSurv: 0.60, color: '#a78bfa', maxAge: 14 }
            ];
            function survivorshipPath(s, xFn, yFn, ages) {
              return ages.map(function(a, i) {
                var pct;
                if (a === 0) pct = 1.0;
                else if (a === 1) pct = 1 - s.juvMort; // after year 1
                else pct = (1 - s.juvMort) * Math.pow(s.adultSurv, a - 1);
                pct = Math.max(0.001, pct); // floor for log scale
                return (i === 0 ? 'M ' : 'L ') + xFn(a).toFixed(1) + ' ' + yFn(pct).toFixed(1);
              }).join(' ');
            }
            // Reference TypeI/II/III idealized curves
            // Type I: stays high then drops late
            // Type II: linear (constant mortality)
            // Type III: drops fast early, plateaus
            var pw = 600, ph = 240, pad = 40;
            var maxAge = 30;
            function xAt(a) { return pad + (a / maxAge) * (pw - 2 * pad); }
            function yAt(pct) {
              var lp = Math.log10(Math.max(0.001, pct));
              return ph - pad - (lp + 3) / 3 * (ph - 2 * pad); // log scale 0.001 → 1
            }
            var ages = [];
            for (var ai = 0; ai <= maxAge; ai++) ages.push(ai);
            // Type I: stays near 1.0 till 0.7*maxAge then drops
            var typeIPath = ages.map(function(a, i) {
              var pct = a < maxAge * 0.7 ? 0.95 - (a / maxAge) * 0.15 : 0.8 * Math.pow(0.4, (a - maxAge * 0.7) / 2);
              pct = Math.max(0.001, pct);
              return (i === 0 ? 'M ' : 'L ') + xAt(a).toFixed(1) + ' ' + yAt(pct).toFixed(1);
            }).join(' ');
            // Type II: constant log slope
            var typeIIPath = ages.map(function(a, i) {
              var pct = Math.pow(10, -a / 10); // 10× per decade
              return (i === 0 ? 'M ' : 'L ') + xAt(a).toFixed(1) + ' ' + yAt(pct).toFixed(1);
            }).join(' ');
            // Type III: drops fast then levels off
            var typeIIIPath = ages.map(function(a, i) {
              var pct = a === 0 ? 1 : 0.05 * Math.pow(0.92, a);
              return (i === 0 ? 'M ' : 'L ') + xAt(a).toFixed(1) + ' ' + yAt(pct).toFixed(1);
            }).join(' ');
            return h('div', { className: 'bg-slate-900/40 border border-emerald-700/40 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-emerald-300 mb-2' }, '📉 Survivorship Curves — Raptors are Type I'),
              h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'Standard ecology visualization: % of birth cohort still alive at each age (log Y-scale). Type I (mammals, raptors) = high survival until late life. Type II (many songbirds) = constant mortality. Type III (fish, insects, plants) = heavy juvenile loss, few survive to adulthood.'),
              h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Survivorship curves comparison' },
                h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
                // Axes
                h('line', { x1: pad, y1: ph - pad, x2: pw - pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
                h('line', { x1: pad, y1: pad, x2: pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
                // Y-axis log ticks
                [1.0, 0.5, 0.1, 0.01, 0.001].map(function(yk, i) {
                  return h('g', { key: 'yt' + i },
                    h('line', { x1: pad - 3, y1: yAt(yk), x2: pad + 3, y2: yAt(yk), stroke: '#94a3b8', strokeWidth: 1 }),
                    h('line', { x1: pad, y1: yAt(yk), x2: pw - pad, y2: yAt(yk), stroke: '#1e293b', strokeWidth: 1 }),
                    h('text', { x: pad - 6, y: yAt(yk) + 3, fontSize: 9, fill: '#94a3b8', textAnchor: 'end' }, yk === 1 ? '100%' : (yk * 100) + '%')
                  );
                }),
                // X-axis age ticks
                [0, 5, 10, 15, 20, 25, 30].map(function(xk, i) {
                  return h('g', { key: 'xt' + i },
                    h('line', { x1: xAt(xk), y1: ph - pad, x2: xAt(xk), y2: ph - pad + 4, stroke: '#94a3b8', strokeWidth: 1 }),
                    h('text', { x: xAt(xk), y: ph - pad + 16, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, xk + ' yr')
                  );
                }),
                // Reference type curves (background, gray-ish)
                h('path', { d: typeIPath, fill: 'none', stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '3,3' }),
                h('path', { d: typeIIPath, fill: 'none', stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '3,3' }),
                h('path', { d: typeIIIPath, fill: 'none', stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '3,3' }),
                // Type labels
                h('text', { x: xAt(28), y: yAt(0.4), fontSize: 10, fill: '#94a3b8', textAnchor: 'end' }, 'Type I (mammals, eagles)'),
                h('text', { x: xAt(28), y: yAt(0.04), fontSize: 10, fill: '#94a3b8', textAnchor: 'end' }, 'Type II (songbirds)'),
                h('text', { x: xAt(20), y: yAt(0.005), fontSize: 10, fill: '#94a3b8' }, 'Type III (fish, insects)'),
                // Species curves
                speciesPlot.map(function(s, si) {
                  var ag = [];
                  for (var ai = 0; ai <= s.maxAge; ai++) ag.push(ai);
                  return h('path', { key: s.id, d: survivorshipPath(s, xAt, yAt, ag), fill: 'none', stroke: s.color, strokeWidth: 2.5 });
                }),
                // Legend
                h('rect', { x: pad + 10, y: pad + 10, width: 165, height: 80, fill: 'rgba(15,23,42,0.85)', stroke: '#475569', strokeWidth: 1, rx: 4 }),
                h('text', { x: pad + 18, y: pad + 24, fontSize: 9, fill: '#fde047', fontWeight: 'bold' }, 'Species:'),
                speciesPlot.map(function(s, si) {
                  return h('g', { key: 'lg' + si },
                    h('line', { x1: pad + 18, y1: pad + 36 + si * 14, x2: pad + 35, y2: pad + 36 + si * 14, stroke: s.color, strokeWidth: 3 }),
                    h('text', { x: pad + 40, y: pad + 39 + si * 14, fontSize: 9, fill: s.color }, s.name)
                  );
                }),
                // Title
                h('text', { x: pw / 2, y: 20, fontSize: 11, fill: '#fde047', textAnchor: 'middle', fontWeight: 'bold' }, '% surviving vs age (log scale)')
              ),
              h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed mt-2' },
                h('span', { className: 'font-bold text-emerald-300' }, '💡 Pedagogy: '),
                'Raptors fit the Type I pattern — a steep cliff in year 1 (70% of juveniles die during their first winter), then a long plateau where most adults survive 5-10+ years. This is why protecting adult breeders is the highest-leverage conservation action. A red-tailed hawk that survives year 1 typically lives to age 6-10; a kestrel that survives year 1 lives to age 5-7. Eagle adults can live 25+ years.'
              )
            );
          })(),

          // Interactive population simulator
          h('div', { className: 'bg-slate-900/40 border border-amber-700/40 rounded-xl p-4 space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🧮 Interactive Population Simulator'),
            h('div', { className: 'text-xs text-slate-400 italic' }, 'See why adult survival is the dominant lever in raptor population trajectories.'),

            // Sliders
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'text-xs text-emerald-300 flex justify-between items-center' },
                  h('span', null, 'Adult annual survival'),
                  h('span', { className: 'font-mono text-amber-300' }, (pop.adultSurv * 100).toFixed(0) + '%')
                ),
                h('input', {
                  type: 'range', min: 0.5, max: 0.99, step: 0.01, value: pop.adultSurv,
                  onInput: function(e) { setPop({ adultSurv: parseFloat(e.target.value) }); },
                  className: 'w-full',
                  'aria-label': 'Adult annual survival rate'
                }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Bald/golden eagle ≈ 90-94% · kestrel ≈ 60%')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-emerald-300 flex justify-between items-center' },
                  h('span', null, 'Juvenile 1st-yr survival'),
                  h('span', { className: 'font-mono text-amber-300' }, (pop.juvSurv * 100).toFixed(0) + '%')
                ),
                h('input', {
                  type: 'range', min: 0.1, max: 0.7, step: 0.01, value: pop.juvSurv,
                  onInput: function(e) { setPop({ juvSurv: parseFloat(e.target.value) }); },
                  className: 'w-full',
                  'aria-label': 'Juvenile first-year survival'
                }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Typical raptor 1st-yr ≈ 30-40%')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-emerald-300 flex justify-between items-center' },
                  h('span', null, 'Fecundity (fledged chicks per female per year)'),
                  h('span', { className: 'font-mono text-amber-300' }, pop.fecundity.toFixed(2))
                ),
                h('input', {
                  type: 'range', min: 0.1, max: 3.0, step: 0.05, value: pop.fecundity,
                  onInput: function(e) { setPop({ fecundity: parseFloat(e.target.value) }); },
                  className: 'w-full',
                  'aria-label': 'Annual fecundity'
                }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Eagle ≈ 0.8 · kestrel ≈ 2.5')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-red-300 flex justify-between items-center' },
                  h('span', null, 'Additional adult mortality bump (lead, turbines, etc)'),
                  h('span', { className: 'font-mono text-amber-300' }, '+' + (pop.adultMortBump * 100).toFixed(0) + '%')
                ),
                h('input', {
                  type: 'range', min: 0, max: 0.3, step: 0.01, value: pop.adultMortBump,
                  onInput: function(e) { setPop({ adultMortBump: parseFloat(e.target.value) }); },
                  className: 'w-full',
                  'aria-label': 'Additional adult mortality'
                }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Add anthropogenic adult mortality (lead, turbines, etc)')
              )
            ),

            // Plot SVG
            h('div', { className: 'bg-slate-950/60 rounded-lg p-3 mt-3' },
              h('svg', { viewBox: '0 0 ' + pw + ' ' + (ph + 30), style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Population trajectory plot' },
                // Grid
                h('line', { x1: 0, y1: ph, x2: pw, y2: ph, stroke: '#475569', strokeWidth: 1 }),
                h('line', { x1: 0, y1: 0, x2: 0, y2: ph, stroke: '#475569', strokeWidth: 1 }),
                // Start size reference
                h('line', { x1: 0, y1: ph - ((pop.startSize - minPop) / range) * (ph - 20) - 10, x2: pw, y2: ph - ((pop.startSize - minPop) / range) * (ph - 20) - 10, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3,5' }),
                // Population line
                h('path', { d: plotPath, fill: 'none', stroke: trend === 'GROWING' ? '#10b981' : trend === 'DECLINING' ? '#ef4444' : '#fbbf24', strokeWidth: 2.5 }),
                // Axis labels
                h('text', { x: 4, y: 14, fontSize: 11, fill: '#94a3b8' }, 'Pop'),
                h('text', { x: pw - 40, y: ph + 18, fontSize: 11, fill: '#94a3b8' }, 'Year ' + pop.years),
                h('text', { x: 4, y: ph + 18, fontSize: 11, fill: '#94a3b8' }, 'Year 0')
              )
            ),

            // Results
            h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
              h('div', { className: 'bg-' + trendColor + '-900/30 border border-' + trendColor + '-700/40 rounded p-3' },
                h('div', { className: 'text-2xl font-bold text-' + trendColor + '-300' }, lambda.toFixed(3)),
                h('div', { className: 'text-[10px] text-' + trendColor + '-200 uppercase tracking-wider' }, 'λ (lambda)')
              ),
              h('div', { className: 'bg-' + trendColor + '-900/30 border border-' + trendColor + '-700/40 rounded p-3' },
                h('div', { className: 'text-2xl font-bold text-' + trendColor + '-300' }, trend),
                h('div', { className: 'text-[10px] text-' + trendColor + '-200 uppercase tracking-wider' }, 'Trajectory')
              ),
              h('div', { className: 'bg-slate-800/60 border border-slate-700/40 rounded p-3' },
                h('div', { className: 'text-2xl font-bold text-amber-300' }, Math.round(finalPop)),
                h('div', { className: 'text-[10px] text-slate-300 uppercase tracking-wider' }, 'Pop @ year ' + pop.years)
              )
            )
          ),

          // Key insight
          h('div', { className: 'bg-amber-900/30 border border-amber-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-2' }, '💡 ' + LIFECYCLE.population.title),
            h('div', { className: 'text-sm text-amber-100/90 leading-relaxed mb-3' }, LIFECYCLE.population.explanation),
            h('div', { className: 'bg-slate-900/50 rounded p-3 text-sm text-emerald-300 italic' }, '✦ ' + LIFECYCLE.population.keyInsight)
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: STOOP TRAJECTORY VISUALIZER
      // ────────────────────────────────────────────────────────
      // Animates Tucker 1998 logarithmic-spiral stoop. The peregrine
      // maintains a constant retinal-angle approach to moving prey.
      function renderSpiral() {
        var sv = rh.spiral || { startAlt: 600, preySpeed: 5, headTilt: 40, paused: false, playhead: 0 };
        function setSV(patch) {
          setRH({ spiral: Object.assign({}, sv, patch) });
        }
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-orange-200 mb-2' }, '🌀 Stoop Trajectory Visualizer'),
            h('div', { className: 'text-sm text-orange-100/90 leading-relaxed' },
              'Tucker (1998) modeled the falcon\'s stoop trajectory and showed that peregrines fly a ',
              h('span', { className: 'font-bold text-amber-300' }, 'logarithmic spiral'),
              ' — a curved approach that keeps the prey image at a ',
              h('span', { className: 'font-bold text-amber-300' }, 'constant retinal angle'),
              ' (the bird\'s head doesn\'t need to turn at terminal velocity, which would create drag). This is ',
              h('em', null, 'exactly'),
              ' the proportional-navigation algorithm used by air-to-air missiles. Adjust the parameters below + watch the falcon close on its prey.'
            )
          ),

          // Controls
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3' },
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h('div', null,
                h('label', { className: 'text-xs text-orange-300 flex justify-between' },
                  h('span', null, 'Stoop start altitude'),
                  h('span', { className: 'font-mono text-amber-300' }, sv.startAlt + ' m')
                ),
                h('input', { type: 'range', min: 200, max: 1500, step: 50, value: sv.startAlt,
                  onInput: function(e) { setSV({ startAlt: parseInt(e.target.value), playhead: 0 }); }, className: 'w-full',
                  'aria-label': 'Stoop start altitude' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Real peregrine stoops: 200-3,000 m')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-orange-300 flex justify-between' },
                  h('span', null, 'Prey speed (m/s)'),
                  h('span', { className: 'font-mono text-amber-300' }, sv.preySpeed.toFixed(1))
                ),
                h('input', { type: 'range', min: 1, max: 15, step: 0.5, value: sv.preySpeed,
                  onInput: function(e) { setSV({ preySpeed: parseFloat(e.target.value), playhead: 0 }); }, className: 'w-full',
                  'aria-label': 'Prey forward speed' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Pigeon flapping ≈ 16 m/s · duck ≈ 22 m/s')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-orange-300 flex justify-between' },
                  h('span', null, 'Head tilt angle (°)'),
                  h('span', { className: 'font-mono text-amber-300' }, sv.headTilt + '°')
                ),
                h('input', { type: 'range', min: 20, max: 65, step: 1, value: sv.headTilt,
                  onInput: function(e) { setSV({ headTilt: parseInt(e.target.value), playhead: 0 }); }, className: 'w-full',
                  'aria-label': 'Head tilt angle' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Tucker 1998 measured ~40°')
              )
            ),
            h('div', { className: 'flex gap-2 justify-center' },
              h('button', {
                onClick: function() { setSV({ playhead: 0, paused: false }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700',
                'aria-label': 'Replay stoop'
              }, '▶ Replay'),
              h('button', {
                onClick: function() { setSV({ paused: !sv.paused }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-amber-300 hover:bg-slate-600',
                'aria-label': sv.paused ? 'Resume' : 'Pause'
              }, sv.paused ? '⏵ Resume' : '⏸ Pause')
            )
          ),

          // Canvas
          h('div', { className: 'bg-slate-950 border border-orange-700/40 rounded-xl overflow-hidden', style: { aspectRatio: '4 / 3', maxWidth: '720px', margin: '0 auto', position: 'relative' } },
            h('canvas', {
              'data-spiral-canvas': 'true',
              role: 'img',
              'aria-label': 'Animated stoop trajectory showing a peregrine falcon descending in a logarithmic spiral to intercept moving prey',
              width: 720, height: 540,
              style: { width: '100%', height: '100%', display: 'block' },
              ref: function(canvasEl) {
                if (!canvasEl) return;
                if (canvasEl._spiralAnim) cancelAnimationFrame(canvasEl._spiralAnim);
                var ctx2 = canvasEl.getContext('2d');
                var W = canvasEl.width, H = canvasEl.height;
                var startT = performance.now();
                var headTiltRad = sv.headTilt * Math.PI / 180;
                // Map start altitude (200-1500 m) to canvas y position
                var altScale = (sv.startAlt - 200) / 1300; // 0..1
                var falconStartY = 30 + altScale * 50;
                var falconStartX = 80 + altScale * 30;
                var preyStartX = 280, preyStartY = 380;
                var preyV = sv.preySpeed * 8; // visual px/s

                function animate(now) {
                  var t = (now - startT) / 1000; // seconds
                  if (sv.paused) t = sv.playhead;
                  else sv.playhead = t;
                  // Total animation 4 seconds
                  var T = 4.0;
                  if (t > T) t = T;
                  var u = t / T; // 0..1

                  // Background sky gradient
                  var grad = ctx2.createLinearGradient(0, 0, 0, H);
                  grad.addColorStop(0, '#bae6fd');
                  grad.addColorStop(0.7, '#fbbf24');
                  grad.addColorStop(1, '#92400e');
                  ctx2.fillStyle = grad;
                  ctx2.fillRect(0, 0, W, H);
                  // Ground
                  ctx2.fillStyle = '#365314';
                  ctx2.fillRect(0, H - 60, W, 60);
                  ctx2.fillStyle = '#1e293b';
                  ctx2.fillRect(0, H - 60, W, 3);

                  // Prey moves forward
                  var preyX = preyStartX + preyV * t;
                  var preyY = preyStartY;
                  // Stop prey if reached edge
                  if (preyX > W - 60) preyX = W - 60;

                  // Falcon logarithmic spiral: parametrically, position smoothly curves
                  // toward prey via Tucker's constant-retinal-angle approach.
                  // We use a Bezier-like curve from (falconStartX, falconStartY)
                  // toward final intercept point (preyX_at_T, preyY).
                  var preyXend = preyStartX + preyV * T;
                  if (preyXend > W - 60) preyXend = W - 60;
                  // Bezier control point for log-spiral feel: offset based on head tilt
                  var cp1x = falconStartX + 30;
                  var cp1y = falconStartY + 80;
                  var cp2x = preyXend - 200;
                  var cp2y = preyY - Math.tan(headTiltRad) * 200;
                  // Position at u
                  function bez(t, p0, p1, p2, p3) {
                    var ti = 1 - t;
                    return ti*ti*ti*p0 + 3*ti*ti*t*p1 + 3*ti*t*t*p2 + t*t*t*p3;
                  }
                  var falconX = bez(u, falconStartX, cp1x, cp2x, preyXend);
                  var falconY = bez(u, falconStartY, cp1y, cp2y, preyY - 8);

                  // Draw trail (log spiral) up to current u
                  ctx2.strokeStyle = 'rgba(220, 38, 38, 0.6)';
                  ctx2.lineWidth = 2;
                  ctx2.setLineDash([3, 3]);
                  ctx2.beginPath();
                  ctx2.moveTo(falconStartX, falconStartY);
                  for (var i = 1; i <= 50; i++) {
                    var ui = (i / 50) * u;
                    var px = bez(ui, falconStartX, cp1x, cp2x, preyXend);
                    var py = bez(ui, falconStartY, cp1y, cp2y, preyY - 8);
                    ctx2.lineTo(px, py);
                  }
                  ctx2.stroke();
                  ctx2.setLineDash([]);

                  // Draw constant-angle sightline from falcon to prey (this is the key visual)
                  ctx2.strokeStyle = 'rgba(251, 191, 36, 0.55)';
                  ctx2.lineWidth = 1;
                  ctx2.setLineDash([5, 4]);
                  ctx2.beginPath();
                  ctx2.moveTo(falconX, falconY);
                  ctx2.lineTo(preyX, preyY);
                  ctx2.stroke();
                  ctx2.setLineDash([]);

                  // Falcon glyph
                  ctx2.save();
                  ctx2.translate(falconX, falconY);
                  // Rotate to direction of travel
                  var dx = preyX - falconX, dy = preyY - falconY;
                  var ang = Math.atan2(dy, dx);
                  ctx2.rotate(ang);
                  // Body
                  ctx2.fillStyle = '#451a03';
                  ctx2.beginPath();
                  ctx2.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
                  ctx2.fill();
                  // Wings (tucked)
                  ctx2.fillStyle = '#78350f';
                  ctx2.beginPath();
                  ctx2.moveTo(-2, -2);
                  ctx2.lineTo(-10, -10);
                  ctx2.lineTo(-6, 0);
                  ctx2.closePath();
                  ctx2.fill();
                  ctx2.beginPath();
                  ctx2.moveTo(-2, 2);
                  ctx2.lineTo(-10, 10);
                  ctx2.lineTo(-6, 0);
                  ctx2.closePath();
                  ctx2.fill();
                  // Beak
                  ctx2.fillStyle = '#fbbf24';
                  ctx2.beginPath();
                  ctx2.moveTo(12, 0);
                  ctx2.lineTo(16, -2);
                  ctx2.lineTo(16, 2);
                  ctx2.closePath();
                  ctx2.fill();
                  ctx2.restore();

                  // Prey
                  ctx2.fillStyle = '#9ca3af';
                  ctx2.beginPath();
                  ctx2.ellipse(preyX, preyY, 8, 4, 0, 0, Math.PI * 2);
                  ctx2.fill();
                  // Prey wings
                  ctx2.fillStyle = '#6b7280';
                  ctx2.beginPath();
                  ctx2.ellipse(preyX - 4, preyY - 1, 5, 2, -0.3, 0, Math.PI * 2);
                  ctx2.ellipse(preyX - 4, preyY + 1, 5, 2, 0.3, 0, Math.PI * 2);
                  ctx2.fill();

                  // Speed readout (falcon speed via parametric derivative)
                  var falconV = Math.sqrt(
                    Math.pow(preyXend - falconStartX, 2) + Math.pow((preyY - 8) - falconStartY, 2)
                  ) / T;
                  // Project visual to physical: 100 px ≈ 30 m (approx)
                  var falconMps = falconV * 0.3;
                  var falconMph = falconMps * 2.237;
                  // Overlay text
                  ctx2.fillStyle = 'rgba(15, 23, 42, 0.85)';
                  ctx2.fillRect(10, 10, 200, 65);
                  ctx2.strokeStyle = '#fbbf24';
                  ctx2.lineWidth = 1;
                  ctx2.strokeRect(10, 10, 200, 65);
                  ctx2.fillStyle = '#fbbf24';
                  ctx2.font = 'bold 11px ui-monospace, Menlo, monospace';
                  ctx2.fillText('STOOP TIME ' + t.toFixed(1) + 's / ' + T + 's', 18, 28);
                  ctx2.fillStyle = '#fff';
                  ctx2.fillText('Falcon ~ ' + falconMph.toFixed(0) + ' mph (avg)', 18, 46);
                  ctx2.fillStyle = '#fde047';
                  ctx2.fillText('Retinal angle: ' + sv.headTilt + '° (locked)', 18, 64);

                  // Strike at end
                  if (u >= 0.98) {
                    ctx2.fillStyle = 'rgba(220, 38, 38, 0.4)';
                    ctx2.beginPath();
                    ctx2.arc(preyX, preyY, 25 + Math.sin(now * 0.02) * 8, 0, Math.PI * 2);
                    ctx2.fill();
                    ctx2.fillStyle = '#fbbf24';
                    ctx2.font = 'bold 24px ui-sans-serif, system-ui';
                    ctx2.textAlign = 'center';
                    ctx2.fillText('STRIKE!', preyX, preyY - 35);
                  }

                  if (!sv.paused && t < T) {
                    canvasEl._spiralAnim = requestAnimationFrame(animate);
                  }
                }
                canvasEl._spiralAnim = requestAnimationFrame(animate);
              }
            })
          ),

          // ── NEW v0.13: Multi-species trajectory overlay ──
          (function() {
            // For each of 3 reference species, draw a trajectory curve from start altitude
            // to a fixed prey position. Stoop steepness + travel distance differ by species.
            var pw = 600, ph = 280, pad = 35;
            var specs = [
              { id: 'peregrine', name: 'Peregrine Falcon', color: '#dc2626', stoopMph: 242, stoopBonus: 3.5, startAltScale: 1.0, cdCurve: 0.18 },
              { id: 'goldenEagle', name: 'Golden Eagle', color: '#fbbf24', stoopMph: 200, stoopBonus: 3.0, startAltScale: 1.0, cdCurve: 0.22 },
              { id: 'goshawk', name: 'Northern Goshawk', color: '#10b981', stoopMph: 95, stoopBonus: 1.8, startAltScale: 0.6, cdCurve: 0.35 }
            ];
            // Plot grid: starting at (40, 20), ending at (560, 240) where prey is
            var startX = pad + 10;
            var startY = pad;
            var endX = pw - pad - 10;
            var endY = ph - pad;
            // Each species: trajectory is a quadratic Bezier where control point shifts based on stoopMph
            // Higher stoop speed = more direct (control point closer to straight line)
            function trajectoryPath(spec) {
              var s = { x: startX, y: startY + (1 - spec.startAltScale) * (ph - 2 * pad) }; // higher altitude = lower y
              var e = { x: endX, y: endY };
              // Control point: shifts toward direct line for high stoop speed (peregrine = direct dive),
              // and arcs more for low stoop speed (goshawk = forest chase curve)
              var directness = spec.stoopMph / 250;
              var cx = s.x + (e.x - s.x) * 0.4;
              var cy = s.y + (e.y - s.y) * (1 - directness * 0.5);
              return 'M ' + s.x + ' ' + s.y + ' Q ' + cx + ' ' + cy + ' ' + e.x + ' ' + e.y;
            }
            return h('div', { className: 'bg-slate-900/40 border border-amber-700/40 rounded-xl p-4 mt-3' },
              h('div', { className: 'text-sm font-bold text-amber-300 mb-2' }, '⚡ Multi-Species Trajectory Comparison'),
              h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'Compare how 3 species approach the same prey target. Falcons + golden eagles use steep direct stoops; goshawks use a curved forest-chase trajectory.'),
              h('div', { className: 'bg-slate-950/60 rounded-lg p-2' },
                h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Multi-species stoop trajectory comparison' },
                  // Sky gradient
                  (function() {
                    return [
                      h('defs', { key: 'defs' },
                        h('linearGradient', { id: 'multiSky', x1: 0, y1: 0, x2: 0, y2: 1 },
                          h('stop', { offset: '0%', stopColor: '#bae6fd' }),
                          h('stop', { offset: '100%', stopColor: '#fef3c7' })
                        )
                      ),
                      h('rect', { key: 'sky', x: 0, y: 0, width: pw, height: ph, fill: 'url(#multiSky)' }),
                      // Ground
                      h('rect', { key: 'ground', x: 0, y: ph - 20, width: pw, height: 20, fill: '#365314' })
                    ];
                  })(),
                  // Trajectories
                  specs.map(function(spec, i) {
                    var pStart = { x: startX, y: startY + (1 - spec.startAltScale) * (ph - 2 * pad) };
                    return h('g', { key: spec.id },
                      h('path', { d: trajectoryPath(spec), fill: 'none', stroke: spec.color, strokeWidth: 2.5, strokeDasharray: '4,3' }),
                      // Start bird emoji
                      h('text', { x: pStart.x - 15, y: pStart.y + 5, fontSize: 18 }, '🦅'),
                      h('text', { x: pStart.x - 15, y: pStart.y + 22, fontSize: 9, fill: spec.color, fontWeight: 'bold' }, spec.name.split(' ')[0]),
                      // Speed annotation midway
                      h('text', { x: startX + (endX - startX) * 0.55, y: pStart.y + (ph - 2 * pad) * 0.25 + i * 20, fontSize: 10, fill: spec.color, fontWeight: 'bold' }, spec.stoopMph + ' mph')
                    );
                  }),
                  // Prey (shared target)
                  h('circle', { cx: endX, cy: endY, r: 6, fill: '#9ca3af', stroke: '#1c1917', strokeWidth: 1 }),
                  h('text', { x: endX, y: endY - 12, fontSize: 9, fill: '#1c1917', fontWeight: 'bold', textAnchor: 'middle' }, '🐦 prey'),
                  // Legend
                  h('rect', { x: pad, y: ph - 18, width: pw - 2 * pad, height: 14, fill: 'none' }),
                  h('text', { x: pad, y: ph - 7, fontSize: 9, fill: '#1c1917' }, '↑ altitude — →  horizontal distance — →  ground impact')
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-2 mt-2 text-xs' },
                specs.map(function(spec, i) {
                  return h('div', { key: spec.id, className: 'bg-slate-800/40 rounded p-2 border-l-4', style: { borderColor: spec.color } },
                    h('div', { className: 'font-bold text-amber-200' }, spec.name),
                    h('div', { className: 'text-[10px] text-slate-400 mt-1' }, 'Stoop speed: ', h('span', { className: 'font-mono text-amber-300' }, spec.stoopMph + ' mph')),
                    h('div', { className: 'text-[10px] text-slate-400' }, 'Tuck Cd: ', h('span', { className: 'font-mono text-amber-300' }, spec.cdCurve))
                  );
                })
              ),
              h('div', { className: 'text-[10px] text-slate-500 italic mt-2' },
                'Trajectory steepness reflects how committed each species is to the vertical stoop. Peregrines + golden eagles dive nearly vertical from high altitude. Goshawks use a lower-altitude curve through forest canopy. The same logarithmic-spiral principle applies — each species adjusts the curve to keep the prey at a constant retinal angle.'
              )
            );
          })(),

          // Insight panel
          h('div', { className: 'bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 text-sm space-y-2' },
            h('div', { className: 'font-bold text-amber-300' }, '🎯 Why a spiral, not a straight line?'),
            h('div', { className: 'text-amber-100/90 text-xs leading-relaxed' },
              h('strong', null, 'Straight-line problem: '), 'If the falcon flies directly at the prey, the prey appears to move SIDEWAYS in its visual field as it travels — the bird would have to constantly rotate its head + body to track. At 200+ mph that head rotation creates drag, ruins the streamlining, AND requires the bird to angle its eye away from prey.'
            ),
            h('div', { className: 'text-amber-100/90 text-xs leading-relaxed' },
              h('strong', null, 'Spiral solution: '), 'The logarithmic spiral approach keeps the prey at a CONSTANT angle to the falcon\'s body axis. The bird never needs to turn its head — eyes stay fixed forward through deep fovea, body stays streamlined, the prey appears motionless relative to the falcon. This is exactly the proportional-navigation algorithm used by AIM-9 Sidewinder + similar guided missiles, derived for the same reason: ',
              h('strong', null, 'guidance without instability.')
            ),
            h('div', { className: 'text-xs text-slate-300 italic mt-2' }, 'Reference: Tucker, V.A. (1998) Curved flight paths and sideways vision in peregrine falcons. Journal of Experimental Biology 201(3):403-414.')
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: VISION ACUITY DEMO
      // ────────────────────────────────────────────────────────
      // Snellen-style chart at variable zoom showing what raptor vision
      // actually feels like. Slider picks zoom: 1× (human) → 8× (theoretical).
      function renderAcuity() {
        var av = rh.acuity || { zoom: 1.0 };
        function setAV(patch) { setRH({ acuity: Object.assign({}, av, patch) }); }
        // Lines of a Snellen chart, sized so 1× is normal reading
        var lines = [
          { text: 'E F P', size: 90 },
          { text: 'T O Z', size: 60 },
          { text: 'L P E D', size: 40 },
          { text: 'P E C F D', size: 27 },
          { text: 'E D F C Z P', size: 19 },
          { text: 'F E L O P Z D', size: 14 },
          { text: 'D E F P O T E C', size: 10 },
          { text: 'L E F O D P C T', size: 7 }
        ];
        // 6 species presets
        var presets = [
          { id: 'human', label: 'Human', zoom: 1.0, color: 'slate', desc: 'Baseline — 20/20 reads the bottom line at 20 ft.' },
          { id: 'cat', label: 'Domestic Cat', zoom: 0.4, color: 'slate', desc: 'Cats are ~40% of human acuity. They\'re great at low-light + movement, but poor at sharpness.' },
          { id: 'peregrine', label: 'Peregrine Falcon', zoom: 2.6, color: 'amber', desc: 'Peregrines see ~2.6× sharper than humans at fovea center.' },
          { id: 'redTail', label: 'Red-tailed Hawk', zoom: 4.0, color: 'amber', desc: 'A red-tail can read the bottom line at 80 ft (vs human 20 ft).' },
          { id: 'baldEagle', label: 'Bald Eagle', zoom: 5.0, color: 'orange', desc: 'A bald eagle sees fine detail at ~5× human acuity.' },
          { id: 'goldenEagle', label: 'Golden Eagle', zoom: 5.5, color: 'red', desc: 'Spots a rabbit at 2 miles. Reads the bottom Snellen line at 110 ft.' },
          { id: 'theoretical', label: 'Theoretical max', zoom: 8.0, color: 'red', desc: 'Some claims of 8× acuity in select raptor species. Likely overstated but plausible upper bound.' }
        ];
        var activePreset = presets.filter(function(p) { return Math.abs(p.zoom - av.zoom) < 0.05; })[0] || null;

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-violet-200 mb-2' }, '👁️‍🗨️ Vision Acuity Demo'),
            h('div', { className: 'text-sm text-violet-100/90 leading-relaxed' },
              'Acuity multipliers are abstract until you ',
              h('span', { className: 'font-bold text-amber-300' }, 'see'),
              ' what they feel like. The Snellen-style chart below starts at human-scale (1×). Slide the zoom or click a species to scale the text up to raptor vision. A peregrine reads the bottom line at 52 ft instead of 20. A golden eagle reads it at 110 ft. The numbers don\'t mean much until you watch the text grow.'
            )
          ),

          // Slider
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3' },
            h('div', null,
              h('label', { className: 'text-xs text-violet-300 flex justify-between items-center' },
                h('span', null, 'Zoom (acuity multiplier)'),
                h('span', { className: 'font-mono text-amber-300' }, av.zoom.toFixed(2) + '×')
              ),
              h('input', {
                type: 'range', min: 0.4, max: 8, step: 0.1, value: av.zoom,
                onInput: function(e) { setAV({ zoom: parseFloat(e.target.value) }); },
                className: 'w-full',
                'aria-label': 'Visual acuity zoom multiplier'
              }),
              h('div', { className: 'flex justify-between text-[10px] text-slate-500' },
                h('span', null, '0.4× (cat)'),
                h('span', null, '1× (human)'),
                h('span', null, '5× (eagle)'),
                h('span', null, '8× (max)')
              )
            ),

            // Species preset buttons
            h('div', { className: 'flex flex-wrap gap-2' },
              presets.map(function(p) {
                var active = activePreset && activePreset.id === p.id;
                var colorMap = { slate: 'amber', amber: 'amber', orange: 'orange', red: 'red' };
                return h('button', {
                  key: p.id,
                  onClick: function() { setAV({ zoom: p.zoom }); rhAnnounce('Zoom set to ' + p.label + ': ' + p.zoom + 'x'); },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-800/50 text-amber-200 hover:bg-slate-700/50 hover:text-amber-100'),
                  'aria-label': p.label + ' acuity ' + p.zoom + 'x',
                  'aria-pressed': active
                }, p.label + ' (' + p.zoom + '×)');
              })
            ),

            activePreset && h('div', { className: 'p-3 rounded bg-amber-900/20 border border-amber-700/40 text-xs text-amber-100/90 italic' }, '🦅 ' + activePreset.desc)
          ),

          // The chart itself
          h('div', { className: 'bg-white rounded-xl p-6 overflow-hidden', style: { minHeight: '500px', maxHeight: '70vh', overflowY: 'auto' } },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-[10px] uppercase tracking-widest text-slate-400 mb-4' }, '— Acuity Demonstration Chart —'),
              lines.map(function(line, i) {
                var scaledSize = line.size * av.zoom;
                return h('div', {
                  key: i,
                  style: {
                    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                    fontSize: scaledSize + 'px',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    lineHeight: 1.1,
                    margin: (scaledSize * 0.15) + 'px 0',
                    transition: 'font-size 0.2s ease'
                  }
                }, line.text);
              }),
              h('div', { className: 'text-[10px] text-slate-400 mt-6 italic' }, 'Larger text = closer-equivalent / sharper-equivalent vision. A bird that can see at this zoom level can read the same lines from much further away.')
            )
          ),

          // ── NEW v0.14: Hidden-Object Meadow Visualization ──
          (function() {
            // Render a "meadow" SVG with a vole hidden at a specific spot.
            // The view zoom is the same av.zoom value (1-8×).
            // At 1× (human) the vole is barely a pixel; at 5× (eagle) it's clearly visible.
            return h('div', { className: 'bg-slate-900/40 border border-emerald-700/40 rounded-xl p-4' },
              h('div', { className: 'text-sm font-bold text-emerald-300 mb-2' }, '🌾 Hidden-Prey Meadow — Can you spot the vole?'),
              h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'A scaled-down meadow scene 200 ft away. A vole is hiding in the grass. At human acuity (1×) it\'s barely a speck. Crank the zoom up to red-tail or eagle vision and the vole becomes obvious.'),
              h('div', { className: 'bg-slate-950 rounded-lg overflow-hidden border border-slate-700' },
                h('svg', { viewBox: '0 0 600 320', style: { width: '100%', height: 'auto', maxHeight: '400px' }, role: 'img', 'aria-label': 'Meadow scene with hidden vole' },
                  // Sky gradient
                  h('defs', null,
                    h('linearGradient', { id: 'mdSky', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#7dd3fc' }),
                      h('stop', { offset: '70%', stopColor: '#fef3c7' })
                    ),
                    h('linearGradient', { id: 'mdGround', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#65a30d' }),
                      h('stop', { offset: '100%', stopColor: '#365314' })
                    )
                  ),
                  // Background sky
                  h('rect', { x: 0, y: 0, width: 600, height: 320, fill: 'url(#mdSky)' }),
                  // Distant tree line
                  h('rect', { x: 0, y: 130, width: 600, height: 20, fill: '#1e3a2a' }),
                  [80, 180, 280, 360, 440, 520].forEach,
                  // (use map for actual rendering)
                  [80, 180, 280, 360, 440, 520].map(function(tx, i) {
                    return h('path', { key: 'tree' + i, d: 'M ' + (tx - 8) + ' 150 L ' + tx + ' 125 L ' + (tx + 8) + ' 150 Z', fill: '#14532d' });
                  }),
                  // Meadow ground
                  h('rect', { x: 0, y: 150, width: 600, height: 170, fill: 'url(#mdGround)' }),
                  // Grass texture (random tiny lines for texture)
                  (function() {
                    var lines = [];
                    for (var gi = 0; gi < 200; gi++) {
                      // Deterministic placement so it doesn't jitter
                      var seed = gi * 17.3;
                      var gx = (Math.sin(seed) * 10000) % 600;
                      if (gx < 0) gx += 600;
                      var gy = 160 + (Math.cos(seed * 1.7) * 1000 % 150);
                      if (gy < 160) gy = 160 + (-gy % 150);
                      var gh = 2 + Math.abs(Math.sin(seed * 3)) * 4;
                      lines.push(h('line', { key: 'g' + gi, x1: gx, y1: gy, x2: gx, y2: gy - gh, stroke: '#3f6212', strokeWidth: 1, opacity: 0.6 }));
                    }
                    return lines;
                  })(),
                  // The vole — its visible size scales with av.zoom!
                  // At 1× = tiny dot; at 8× = clear glyph
                  (function() {
                    var vx = 340, vy = 245; // fixed meadow position
                    var voleSize = Math.max(1, av.zoom * 1.2); // pixels (1.2px at 1× → ~9.6px at 8×)
                    var visible = av.zoom >= 1.0; // always rendered, just very small
                    return h('g', null,
                      // Vole body
                      h('ellipse', {
                        cx: vx, cy: vy,
                        rx: voleSize, ry: voleSize * 0.6,
                        fill: '#78350f', stroke: '#451a03', strokeWidth: 0.5,
                        opacity: visible ? 1 : 0
                      }),
                      // Vole head if zoom is high enough
                      av.zoom >= 2.5 && h('circle', { cx: vx + voleSize * 0.9, cy: vy - voleSize * 0.2, r: voleSize * 0.6, fill: '#92400e' }),
                      // Vole tail if zoom high enough
                      av.zoom >= 3.5 && h('line', { x1: vx - voleSize, y1: vy, x2: vx - voleSize * 2.5, y2: vy + voleSize * 0.5, stroke: '#451a03', strokeWidth: 1 }),
                      // Vole eye glint at very high zoom
                      av.zoom >= 5.0 && h('circle', { cx: vx + voleSize * 1.1, cy: vy - voleSize * 0.3, r: 0.5, fill: '#fefce8' }),
                      // "you found it" label at >= 4×
                      av.zoom >= 4.0 && h('g', null,
                        h('circle', { cx: vx, cy: vy, r: voleSize * 4, fill: 'none', stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '3,3', opacity: 0.6 }),
                        h('text', { x: vx + voleSize * 4 + 4, y: vy + 4, fontSize: 11, fill: '#fbbf24', fontWeight: 'bold' }, '← vole!')
                      )
                    );
                  })(),
                  // Distance scale
                  h('text', { x: 8, y: 18, fontSize: 10, fill: '#1c1917', fontWeight: 'bold' }, '200 ft from observer'),
                  h('text', { x: 8, y: 314, fontSize: 9, fill: '#fefce8' }, 'Current zoom: ' + av.zoom.toFixed(1) + '× — ' + (av.zoom < 1.5 ? 'human can barely see anything' : av.zoom < 3 ? 'kestrel-class sees a speck' : av.zoom < 5 ? 'hawk-class sees the vole clearly' : 'eagle-class sees the eye glint'))
                )
              ),
              // Verdict bar
              h('div', { className: 'mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-xs' },
                ['1×', '2.6×', '4×', '5.5×'].map(function(z, i) {
                  var zoom = parseFloat(z);
                  var verdict = [
                    { z: 1, lbl: 'Human: imperceptible', color: 'slate' },
                    { z: 2.6, lbl: 'Peregrine: visible as speck', color: 'amber' },
                    { z: 4, lbl: 'Red-tail: clearly a small mammal', color: 'orange' },
                    { z: 5.5, lbl: 'Golden eagle: visible eye glint', color: 'red' }
                  ][i];
                  var active = Math.abs(av.zoom - verdict.z) < 0.3;
                  return h('div', { key: i, className: 'p-2 rounded ' + (active ? 'bg-' + verdict.color + '-700/40 ring-2 ring-amber-400/50' : 'bg-slate-800/40 border border-slate-700/40') },
                    h('div', { className: 'font-mono font-bold text-amber-300' }, z),
                    h('div', { className: 'text-[10px] text-slate-300' }, verdict.lbl)
                  );
                })
              )
            );
          })(),

          // What this means
          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-emerald-300 mb-2' }, '💡 The "100-foot newspaper" demonstration'),
            h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed space-y-2' },
              h('p', null, 'A common claim: "a red-tailed hawk can read a newspaper headline at 100 feet." Where does that come from?'),
              h('p', null,
                'A 20/20 human reads a newspaper headline at ~25 feet under normal lighting. A red-tail with ~4× acuity should be able to read the same headline at ~4 × 25 = ',
                h('span', { className: 'font-bold text-amber-300' }, '100 feet'),
                '. A golden eagle at 5.5× should read it at ~140 feet. A peregrine at 2.6× should read it at ~65 feet.'
              ),
              h('p', null, 'These are simplifications — real raptor vision also has 2 foveas per eye, wider visual field, UV in falconids, and head-mounting that lets the bird scan with much less head motion than a human. The acuity number is just ONE axis of "better seeing."'),
              h('p', { className: 'italic text-emerald-200/80' }, 'Try toggling between human, peregrine, and golden eagle on the slider above. The eagle-scale chart isn\'t just bigger text — it\'s the experiential equivalent of being 5× closer than you actually are.')
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: RECOVERY CASE STUDIES
      // ────────────────────────────────────────────────────────
      function renderRecoveries() {
        // Per-case-study log-population trajectory data
        // Each: array of { year, pop } anchor points
        var trajectories = {
          peregrine: [
            { y: 1940, p: 3875, lbl: 'Pre-DDT' },
            { y: 1960, p: 500 },
            { y: 1972, p: 50, lbl: 'DDT ban' },
            { y: 1980, p: 200 },
            { y: 1990, p: 1000 },
            { y: 1999, p: 1700, lbl: 'Delisted' },
            { y: 2020, p: 3200 }
          ],
          baldEagle: [
            { y: 1800, p: 100000, lbl: '~baseline' },
            { y: 1940, p: 50000 },
            { y: 1963, p: 417, lbl: 'Crisis low' },
            { y: 1972, p: 800, lbl: 'DDT ban' },
            { y: 1995, p: 9000, lbl: 'Downlisted' },
            { y: 2007, p: 50000, lbl: 'Delisted' },
            { y: 2020, p: 316000 }
          ],
          condor: [
            { y: 1980, p: 25 },
            { y: 1987, p: 22, lbl: 'All captive' },
            { y: 1992, p: 60, lbl: 'Re-release' },
            { y: 2000, p: 160 },
            { y: 2010, p: 380 },
            { y: 2020, p: 500 },
            { y: 2024, p: 530 }
          ],
          mauritius: [
            { y: 1974, p: 4, lbl: 'Founder' },
            { y: 1985, p: 50, lbl: 'Captive release' },
            { y: 1994, p: 200 },
            { y: 2000, p: 500 },
            { y: 2005, p: 800, lbl: 'Peak' },
            { y: 2020, p: 450 }
          ],
          philippine: [
            { y: 1960, p: 800 },
            { y: 1980, p: 600 },
            { y: 1990, p: 500 },
            { y: 2000, p: 450 },
            { y: 2010, p: 420 },
            { y: 2023, p: 400, lbl: 'Critical' }
          ]
        };
        function trajectorySvg(caseId) {
          var pts = trajectories[caseId];
          if (!pts) return null;
          var pw = 600, ph = 130, pad = 30;
          // Year range
          var yMin = Math.min.apply(null, pts.map(function(p) { return p.y; }));
          var yMax = Math.max.apply(null, pts.map(function(p) { return p.y; }));
          // Log-pop range
          var popMin = Math.min.apply(null, pts.map(function(p) { return p.p; }));
          var popMax = Math.max.apply(null, pts.map(function(p) { return p.p; }));
          var lMin = Math.log10(Math.max(1, popMin));
          var lMax = Math.log10(popMax);
          function xAt(y) { return pad + (y - yMin) / (yMax - yMin) * (pw - 2 * pad); }
          function yAt(p) { return ph - pad - (Math.log10(Math.max(1, p)) - lMin) / Math.max(0.1, (lMax - lMin)) * (ph - 2 * pad); }
          var pathD = pts.map(function(pt, i) { return (i === 0 ? 'M ' : 'L ') + xAt(pt.y).toFixed(1) + ' ' + yAt(pt.p).toFixed(1); }).join(' ');
          return h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'Population trajectory plot' },
            h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
            // Axes
            h('line', { x1: pad, y1: ph - pad, x2: pw - pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
            h('line', { x1: pad, y1: pad, x2: pad, y2: ph - pad, stroke: '#475569', strokeWidth: 1 }),
            // Year ticks
            pts.map(function(pt, i) {
              return h('text', { key: 'yt' + i, x: xAt(pt.y), y: ph - pad + 12, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, pt.y);
            }),
            // Population trajectory (gradient stroke from red to green)
            h('path', { d: pathD, fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5 }),
            // Points + labels
            pts.map(function(pt, i) {
              var cx = xAt(pt.y), cy = yAt(pt.p);
              var lowest = pt.p === popMin;
              var fill = lowest ? '#ef4444' : (i === pts.length - 1 ? '#10b981' : '#fde047');
              return h('g', { key: 'pt' + i },
                h('circle', { cx: cx, cy: cy, r: 4, fill: fill, stroke: '#1c1917', strokeWidth: 1.5 }),
                h('text', { x: cx, y: cy - 8, fontSize: 9, fill: '#fde047', textAnchor: 'middle', fontWeight: 'bold' },
                  pt.p >= 1000 ? (pt.p / 1000).toFixed(pt.p >= 10000 ? 0 : 1) + 'K' : pt.p
                ),
                pt.lbl && h('text', { x: cx, y: cy + 14, fontSize: 8, fill: '#fbbf24', textAnchor: 'middle' }, pt.lbl)
              );
            }),
            // Y-axis label
            h('text', { x: 4, y: ph / 2, fontSize: 9, fill: '#94a3b8', transform: 'rotate(-90 4 ' + (ph / 2) + ')' }, 'Population (log)')
          );
        }

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-emerald-200 mb-2' }, '🏆 Recovery Case Studies'),
            h('div', { className: 'text-sm text-emerald-100/90 leading-relaxed' },
              RECOVERIES.intro,
              h('span', { className: 'font-bold text-amber-300' }, RECOVERIES.introBold)
            )
          ),

          // Case studies
          h('div', { className: 'space-y-4' },
            RECOVERIES.cases.map(function(c, i) {
              return h('div', { key: c.id, className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-5' },
                // Header
                h('div', { className: 'flex items-baseline gap-3 mb-3' },
                  h('div', { className: 'text-3xl' }, c.emoji),
                  h('div', { className: 'text-lg font-bold text-amber-200' }, c.title)
                ),
                // ── NEW v0.8: Population trajectory plot ──
                trajectories[c.id] && h('div', { className: 'bg-slate-950/60 border border-amber-700/30 rounded-lg p-2 mb-3' },
                  h('div', { className: 'text-[10px] text-amber-300 mb-1 font-bold uppercase tracking-wider' }, '📈 Population trajectory (log scale)'),
                  trajectorySvg(c.id)
                ),
                // Crisis
                h('div', { className: 'bg-red-900/20 border border-red-700/40 rounded-lg p-3 mb-3' },
                  h('div', { className: 'text-xs font-bold text-red-300 mb-1 uppercase tracking-wider' }, '⚠ ' + c.crisis),
                  h('div', { className: 'text-xs text-red-100/90 leading-relaxed' },
                    c.crisisDetail,
                    c.crisisDetailBold && h('span', { className: 'font-bold text-red-200' }, c.crisisDetailBold),
                    c.crisisDetailRest
                  )
                ),
                // Action
                h('div', { className: 'bg-cyan-900/20 border border-cyan-700/40 rounded-lg p-3 mb-3' },
                  h('div', { className: 'text-xs font-bold text-cyan-300 mb-1 uppercase tracking-wider' }, '🔧 ' + c.action),
                  h('div', { className: 'text-xs text-cyan-100/90 leading-relaxed' }, c.actionDetail)
                ),
                // Person + status grid
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-3' },
                  h('div', { className: 'bg-slate-800/40 rounded p-2.5' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-amber-300 mb-1' }, '👤 Key People'),
                    h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.keyPerson)
                  ),
                  h('div', { className: 'bg-slate-800/40 rounded p-2.5' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-emerald-300 mb-1' }, '📊 Current Status'),
                    h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.currentStatus)
                  )
                ),
                // What next + lesson
                h('div', { className: 'space-y-2' },
                  h('div', { className: 'bg-amber-900/20 border border-amber-700/40 rounded p-2.5' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-amber-300 mb-1' }, '🔮 What\'s next'),
                    h('div', { className: 'text-xs text-amber-100/90 leading-relaxed' }, c.whatNext)
                  ),
                  h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded p-2.5' },
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-emerald-300 mb-1' }, '✦ Lesson'),
                    h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed italic' }, c.lesson)
                  )
                )
              );
            })
          ),

          // Meta lesson
          h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-xl p-4' },
            h('div', { className: 'text-base font-bold text-amber-300 mb-3' }, '🧠 ' + RECOVERIES.metaLesson.title),
            h('ul', { className: 'space-y-1.5 text-xs text-amber-100/90' },
              RECOVERIES.metaLesson.points.map(function(p, i) {
                return h('li', { key: i, className: 'leading-relaxed' }, p);
              })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: WING-LOADING PREDICTOR
      // ────────────────────────────────────────────────────────
      // Inverse of Flight Physics: drag sliders → predict hunt style
      function renderPredictor() {
        var pr = rh.predictor || { mass: 1.0, wingspan: 1.2, wingArea: 0.25 };
        function setPR(patch) { setRH({ predictor: Object.assign({}, pr, patch) }); }
        // Calculate derived values
        var wingLoading = pr.mass / pr.wingArea; // kg/m²
        var aspectRatio = (pr.wingspan * pr.wingspan) / pr.wingArea;
        // Classify hunt style based on loading × AR
        var huntStyle, styleDesc, styleColor, styleEmoji;
        if (wingLoading > 7 && aspectRatio > 8) {
          huntStyle = 'Falcon — Stoop Specialist'; styleEmoji = '🚀'; styleColor = 'red';
          styleDesc = 'High wing loading + high aspect ratio = fast/heavy + efficient glide. This bird hunts by stooping from altitude. Terminal velocity is high; turning radius is large. Comparable to: peregrine, prairie falcon, lanner.';
        } else if (wingLoading < 5 && aspectRatio > 7) {
          huntStyle = 'Eagle / Vulture — Soaring Specialist'; styleEmoji = '🪶'; styleColor = 'amber';
          styleDesc = 'Low wing loading + high aspect ratio = efficient thermal soaring with slow level flight. Long-distance scanning predator. Comparable to: bald eagle, golden eagle, turkey vulture, condor.';
        } else if (wingLoading < 4 && aspectRatio < 6) {
          huntStyle = 'Buteo — Perch + Pounce'; styleEmoji = '🌲'; styleColor = 'emerald';
          styleDesc = 'Low wing loading + low aspect ratio = slow, maneuverable, can kite into headwinds. Hunts from perches over open country. Comparable to: red-tailed hawk, red-shouldered hawk, rough-legged hawk, harrier.';
        } else if (wingLoading > 4 && aspectRatio < 6) {
          huntStyle = 'Accipiter — Forest Chaser'; styleEmoji = '🌳'; styleColor = 'cyan';
          styleDesc = 'Medium loading + low aspect ratio (short broad wings, long tail) = high agility, terrible glide efficiency. Threads through dense canopy after small birds. Comparable to: Cooper\'s hawk, sharp-shinned hawk, northern goshawk.';
        } else if (wingLoading < 5 && aspectRatio < 7 && aspectRatio > 4) {
          huntStyle = 'Owl — Silent Glide'; styleEmoji = '🦉'; styleColor = 'violet';
          styleDesc = 'Low loading + moderate aspect ratio (wide broad wings with comb-edged primaries) = silent stalk + drop attack from perch. Comparable to: great horned owl, barred owl, barn owl.';
        } else {
          huntStyle = 'Generalist / Intermediate'; styleEmoji = '🦅'; styleColor = 'slate';
          styleDesc = 'These dimensions fall between specialized hunt-style niches. The bird could hunt opportunistically across several modes — moderate stoop, moderate soaring, moderate perch-pounce. Few real raptors are this generalist; most have committed to one strategy.';
        }
        // Find closest real species (Euclidean in loading + AR space, normalized)
        function distance(loading, ar) {
          return Math.sqrt(Math.pow((wingLoading - loading) / 18, 2) + Math.pow((aspectRatio - ar) / 12, 2));
        }
        var sortedSpecies = SPECIES.map(function(s) {
          return { s: s, d: distance(s.wingLoading, s.aspectRatio) };
        }).sort(function(a, b) { return a.d - b.d; });
        var closest = sortedSpecies.slice(0, 3);

        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-cyan-900/40 to-sky-900/40 border border-cyan-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-cyan-200 mb-2' }, '🪂 Wing-Loading Predictor'),
            h('div', { className: 'text-sm text-cyan-100/90 leading-relaxed' },
              'In the Flight Physics module you learned that wing loading + aspect ratio predict hunt style. This is the inverse: ',
              h('span', { className: 'font-bold text-amber-300' }, 'design a raptor by setting its body dimensions'),
              ' + the tool tells you what hunt strategy that bird would evolve. Compare to real species. The fingers-of-the-glove fit between body geometry + behavior is the core insight of raptor flight biology.'
            )
          ),

          // Sliders
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3' },
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              h('div', null,
                h('label', { className: 'text-xs text-cyan-300 flex justify-between' },
                  h('span', null, 'Body mass'),
                  h('span', { className: 'font-mono text-amber-300' }, pr.mass.toFixed(2) + ' kg')
                ),
                h('input', { type: 'range', min: 0.1, max: 10, step: 0.1, value: pr.mass,
                  onInput: function(e) { setPR({ mass: parseFloat(e.target.value) }); },
                  className: 'w-full', 'aria-label': 'Body mass kg' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Kestrel 0.1 · peregrine 0.9 · golden 4.2 · harpy 7.5')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-cyan-300 flex justify-between' },
                  h('span', null, 'Wingspan'),
                  h('span', { className: 'font-mono text-amber-300' }, pr.wingspan.toFixed(2) + ' m')
                ),
                h('input', { type: 'range', min: 0.5, max: 3.0, step: 0.05, value: pr.wingspan,
                  onInput: function(e) { setPR({ wingspan: parseFloat(e.target.value) }); },
                  className: 'w-full', 'aria-label': 'Wingspan m' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Kestrel 0.6 · peregrine 1.05 · golden 2.1 · harpy 2.05')
              ),
              h('div', null,
                h('label', { className: 'text-xs text-cyan-300 flex justify-between' },
                  h('span', null, 'Wing area'),
                  h('span', { className: 'font-mono text-amber-300' }, pr.wingArea.toFixed(2) + ' m²')
                ),
                h('input', { type: 'range', min: 0.02, max: 1.0, step: 0.01, value: pr.wingArea,
                  onInput: function(e) { setPR({ wingArea: parseFloat(e.target.value) }); },
                  className: 'w-full', 'aria-label': 'Wing area m²' }),
                h('div', { className: 'text-[10px] text-slate-500' }, 'Kestrel 0.05 · peregrine 0.11 · golden 0.65 · harpy 0.50')
              )
            )
          ),

          // Derived values + prediction
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            h('div', { className: 'bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 text-center' },
              h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-400' }, 'Wing Loading'),
              h('div', { className: 'text-2xl font-bold text-amber-300 my-1' }, wingLoading.toFixed(1)),
              h('div', { className: 'text-[10px] text-slate-400' }, 'kg / m²')
            ),
            h('div', { className: 'bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 text-center' },
              h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-400' }, 'Aspect Ratio'),
              h('div', { className: 'text-2xl font-bold text-amber-300 my-1' }, aspectRatio.toFixed(1)),
              h('div', { className: 'text-[10px] text-slate-400' }, 'wingspan² / area')
            )
          ),

          // Predicted hunt style
          h('div', { className: 'bg-gradient-to-br from-' + styleColor + '-900/40 to-' + styleColor + '-800/30 border border-' + styleColor + '-700/50 rounded-xl p-5' },
            h('div', { className: 'flex items-baseline gap-3 mb-2' },
              h('div', { className: 'text-3xl' }, styleEmoji),
              h('div', null,
                h('div', { className: 'text-[10px] uppercase tracking-wider text-' + styleColor + '-300' }, 'Predicted hunt style'),
                h('div', { className: 'text-lg font-bold text-' + styleColor + '-200' }, huntStyle)
              )
            ),
            h('div', { className: 'text-sm text-' + styleColor + '-100/90 leading-relaxed' }, styleDesc)
          ),

          // Closest real species
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-3' }, '🎯 Closest real species (in loading × AR space)'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              closest.map(function(c, i) {
                return h('div', { key: c.s.id, className: 'bg-slate-800/40 rounded p-3 text-center border ' + (i === 0 ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-700/40') },
                  h('div', { className: 'text-2xl mb-1' }, c.s.emoji),
                  h('div', { className: 'text-sm font-bold text-amber-200' }, c.s.name),
                  h('div', { className: 'text-[10px] text-slate-400 font-mono mt-1' }, 'Loading: ' + c.s.wingLoading + ' · AR: ' + c.s.aspectRatio),
                  i === 0 && h('div', { className: 'text-[10px] text-amber-300 mt-1 font-bold' }, '★ Best match')
                );
              })
            )
          ),

          // Presets
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-3' },
            h('div', { className: 'text-xs font-bold text-cyan-300 mb-2' }, '⚡ Try a preset'),
            h('div', { className: 'flex flex-wrap gap-2' },
              [
                { label: 'Peregrine', mass: 0.95, wingspan: 1.05, wingArea: 0.108 },
                { label: 'Red-tailed Hawk', mass: 1.15, wingspan: 1.3, wingArea: 0.31 },
                { label: 'Bald Eagle', mass: 4.5, wingspan: 2.0, wingArea: 0.62 },
                { label: 'Goshawk', mass: 1.0, wingspan: 1.1, wingArea: 0.20 },
                { label: 'Harpy Eagle', mass: 7.5, wingspan: 2.05, wingArea: 0.50 },
                { label: 'Owl', mass: 1.45, wingspan: 1.4, wingArea: 0.40 }
              ].map(function(p) {
                return h('button', { key: p.label,
                  onClick: function() { setPR({ mass: p.mass, wingspan: p.wingspan, wingArea: p.wingArea }); rhAnnounce('Loaded ' + p.label + ' dimensions'); },
                  className: 'px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-amber-200 hover:bg-slate-700 hover:text-amber-100',
                  'aria-label': 'Load ' + p.label + ' dimensions'
                }, p.label);
              })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: FAMOUS BIRDS + CULTURAL SYMBOLS
      // ────────────────────────────────────────────────────────
      function renderFamous() {
        // 5000-year sweep timeline visualization
        // Events split into 2 lanes: SYMBOLS (top) + INDIVIDUALS (bottom)
        // Use a log-ish compressed time scale so old ancient events get visible space
        // We'll use a hybrid: -3000 BCE → 1700 CE on one half, 1700-2030 on the other half
        var symbolEvents = [
          { y: -3000, lbl: 'Horus (Egypt)', sym: 'peregrine' },
          { y: -104, lbl: 'Roman Aquila', sym: 'eagle' },
          { y: 1325, lbl: 'Aztec Tenochtitlan', sym: 'golden' },
          { y: 1782, lbl: 'US adopts bald eagle', sym: 'baldEagle' },
          { y: 1821, lbl: 'Mexican flag', sym: 'golden' },
          { y: 1947, lbl: 'Brazilian AF harpy', sym: 'harpy' },
          { y: 2002, lbl: 'Panama nat\'l bird', sym: 'harpy' }
        ];
        var individualEvents = [
          { y: -1400, lbl: "Haast's Eagle in Maori myth", sym: 'haast' },
          { y: 1240, lbl: 'Frederick II treatise', sym: 'falconry' },
          { y: 1861, lbl: 'Old Abe enlisted', sym: 'baldEagle' },
          { y: 1881, lbl: 'Old Abe dies', sym: 'baldEagle' },
          { y: 1974, lbl: 'Frodo, last Mauritius kestrel', sym: 'kestrel' },
          { y: 1987, lbl: 'AC9, last wild condor captured', sym: 'condor' },
          { y: 1989, lbl: 'Challenger eaglet rescued', sym: 'baldEagle' },
          { y: 1991, lbl: 'Pale Male arrives in Manhattan', sym: 'redTail' },
          { y: 2002, lbl: 'AC9 first re-released', sym: 'condor' },
          { y: 2023, lbl: 'Pale Male dies age 32+', sym: 'redTail' }
        ];
        // Compressed time scale
        function compressedX(y) {
          var pw = 700, pad = 30;
          // Map -3500 to 1700 to first 60% of width, 1700-2030 to last 40%
          if (y < 1700) {
            return pad + (y - (-3500)) / (1700 - (-3500)) * (pw - 2 * pad) * 0.6;
          }
          return pad + (pw - 2 * pad) * 0.6 + (y - 1700) / (2030 - 1700) * (pw - 2 * pad) * 0.4;
        }
        var pw = 700, ph = 240;
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 border border-purple-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-purple-200 mb-2' }, '⭐ Famous Birds & Cultural Symbols'),
            h('div', { className: 'text-sm text-purple-100/90 leading-relaxed' }, FAMOUS.intro)
          ),

          // ── NEW v0.10: 5000-year historical timeline SVG ──
          h('div', { className: 'bg-slate-900/40 border border-purple-700/40 rounded-xl p-4' },
            h('div', { className: 'text-sm font-bold text-purple-300 mb-1' }, '📜 5,000-Year Timeline — Cultural Symbols + Famous Individuals'),
            h('div', { className: 'text-xs text-slate-400 italic mb-3' }, 'Compressed time axis: ancient era (left 60%) + modern era (right 40%). Top lane = cultural-symbol adoptions. Bottom lane = famous individual birds.'),
            h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': '5000-year raptor history timeline' },
              h('rect', { x: 0, y: 0, width: pw, height: ph, fill: '#0f172a' }),
              // Central timeline bar
              h('line', { x1: 30, y1: 120, x2: pw - 30, y2: 120, stroke: '#475569', strokeWidth: 2 }),
              // Time scale change marker
              h('line', { x1: compressedX(1700), y1: 30, x2: compressedX(1700), y2: ph - 30, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4,4' }),
              h('text', { x: compressedX(1700), y: 22, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, '— scale change —'),
              // Time ticks
              [-3000, -2000, -1000, 0, 1000, 1700, 1800, 1900, 2000].map(function(yk, i) {
                return h('g', { key: 'tk' + i },
                  h('line', { x1: compressedX(yk), y1: 117, x2: compressedX(yk), y2: 123, stroke: '#94a3b8', strokeWidth: 1 }),
                  h('text', { x: compressedX(yk), y: 135, fontSize: 9, fill: '#94a3b8', textAnchor: 'middle' }, yk < 0 ? Math.abs(yk) + ' BCE' : (yk === 0 ? '0' : yk + ''))
                );
              }),
              // Lane labels
              h('text', { x: 10, y: 50, fontSize: 10, fill: '#fde047', fontWeight: 'bold' }, 'SYMBOLS'),
              h('text', { x: 10, y: 200, fontSize: 10, fill: '#a78bfa', fontWeight: 'bold' }, 'INDIVIDUALS'),
              // Symbol events (top lane, above main bar)
              symbolEvents.map(function(ev, i) {
                var lx = compressedX(ev.y);
                var ly = 60 + (i % 3) * 18;
                return h('g', { key: 'se' + i },
                  h('line', { x1: lx, y1: ly + 12, x2: lx, y2: 120, stroke: '#fbbf24', strokeWidth: 1, opacity: 0.5 }),
                  h('circle', { cx: lx, cy: 120, r: 4, fill: '#fbbf24', stroke: '#1c1917', strokeWidth: 1 }),
                  h('rect', { x: lx - 60, y: ly, width: 120, height: 14, fill: 'rgba(15,23,42,0.85)', stroke: '#fbbf24', strokeWidth: 0.5, rx: 2 }),
                  h('text', { x: lx, y: ly + 10, fontSize: 9, fill: '#fde047', textAnchor: 'middle' }, ev.lbl)
                );
              }),
              // Individual events (bottom lane, below main bar)
              individualEvents.map(function(ev, i) {
                var lx = compressedX(ev.y);
                var ly = 155 + (i % 3) * 18;
                return h('g', { key: 'ie' + i },
                  h('line', { x1: lx, y1: 120, x2: lx, y2: ly, stroke: '#a78bfa', strokeWidth: 1, opacity: 0.5 }),
                  h('circle', { cx: lx, cy: 120, r: 4, fill: '#a78bfa', stroke: '#1c1917', strokeWidth: 1 }),
                  h('rect', { x: lx - 65, y: ly, width: 130, height: 14, fill: 'rgba(15,23,42,0.85)', stroke: '#a78bfa', strokeWidth: 0.5, rx: 2 }),
                  h('text', { x: lx, y: ly + 10, fontSize: 9, fill: '#c4b5fd', textAnchor: 'middle' }, ev.lbl)
                );
              })
            ),
            h('div', { className: 'text-[10px] text-slate-500 italic mt-2' }, 'No other animal group has been a continuous human cultural symbol for 5,000+ years. From Horus to Pale Male, raptors keep showing up in our flags, legions, myths, and front-page headlines.')
          ),

          // Famous individuals
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🦅 Famous Individual Raptors'),
            FAMOUS.individuals.map(function(b, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-baseline justify-between gap-2 mb-2' },
                  h('div', null,
                    h('div', { className: 'text-base font-bold text-purple-300' }, b.name),
                    h('div', { className: 'text-xs italic text-amber-300/80' }, b.species + ' · ' + b.years + ' · ' + b.location)
                  )
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, b.story),
                h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded p-2 text-xs text-emerald-100/90 italic' }, '✦ Legacy: ' + b.legacy)
              );
            })
          ),

          // Cultural symbols
          h('div', { className: 'space-y-3' },
            h('div', { className: 'text-sm font-bold text-amber-300' }, '🏛 Cultural & National Symbols'),
            FAMOUS.symbols.map(function(s, i) {
              return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded-lg p-4' },
                h('div', { className: 'flex items-baseline justify-between gap-2 mb-2' },
                  h('div', { className: 'text-base font-bold text-purple-300' }, s.symbol),
                  h('div', { className: 'text-[10px] text-slate-500 font-mono' }, s.adopted)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, s.myth),
                h('div', { className: 'bg-amber-900/20 border border-amber-700/40 rounded p-2 text-xs text-amber-100/90' }, '💬 ' + s.controversy)
              );
            })
          ),

          // Closing note
          h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-xl p-4 text-center' },
            h('div', { className: 'text-sm text-amber-100/90 italic leading-relaxed' }, FAMOUS.closingNote)
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: GLOSSARY (A-Z reference)
      // ────────────────────────────────────────────────────────
      function renderGlossary() {
        var glossSearch = (rh.glossSearch || '').toLowerCase();
        var glossCategory = rh.glossCategory || 'all';
        function setSearch(s) { setRH({ glossSearch: s }); }
        function setCat(c) { setRH({ glossCategory: c }); }
        // ── NEW v0.12: Categorize terms ──
        // Assign categories by term-keyword inference
        function categorize(term, def) {
          var t = term.toLowerCase(), d = def.toLowerCase();
          if (/wing|primaries|secondaries|alula|rectrices|fovea|cere|nare|crop|tarsus|hallux|nictitating|pin feathers|talon|brood/i.test(t + ' ' + d)) return 'anatomy';
          if (/falconry|berkutchi|jess|mews|hood|hack|lure|aerie|aquila/i.test(t + ' ' + d)) return 'falconry';
          if (/ddt|conservation|recovery|peregrine fund|endangered|hawk mountain/i.test(t + ' ' + d)) return 'conservation';
          if (/stoop|wing loading|aspect ratio|aerodynam|drag|thermal|kettle|kiting/i.test(t + ' ' + d)) return 'physics';
          if (/migration|irruption|breeding|fledge|mantle|crepuscular|diurnal|polyandry|sexual size|k-selected/i.test(t + ' ' + d)) return 'behavior';
          if (/accipiter|buteo|raptor|falconidae|zygodactyl|anisodactyl/i.test(t + ' ' + d)) return 'taxonomy';
          return 'other';
        }
        var categorized = GLOSSARY.map(function(g) { return Object.assign({}, g, { cat: categorize(g.term, g.def) }); });
        var categories = [
          { id: 'all', label: 'All' },
          { id: 'anatomy', label: '🦴 Anatomy', color: 'amber' },
          { id: 'physics', label: '📐 Physics', color: 'cyan' },
          { id: 'behavior', label: '🌗 Behavior', color: 'indigo' },
          { id: 'falconry', label: '🤝 Falconry', color: 'orange' },
          { id: 'taxonomy', label: '🧬 Taxonomy', color: 'emerald' },
          { id: 'conservation', label: '🌍 Conservation', color: 'green' }
        ];
        var catCounts = {};
        categorized.forEach(function(g) { catCounts[g.cat] = (catCounts[g.cat] || 0) + 1; });
        var filtered = categorized.filter(function(g) {
          var catMatch = glossCategory === 'all' || g.cat === glossCategory;
          var searchMatch = !glossSearch || g.term.toLowerCase().indexOf(glossSearch) !== -1 || g.def.toLowerCase().indexOf(glossSearch) !== -1;
          return catMatch && searchMatch;
        });

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-amber-200 mb-2' }, '📖 Raptor Glossary'),
            h('div', { className: 'text-sm text-slate-300 leading-relaxed' }, GLOSSARY.length + ' terms — A-Z reference covering anatomy, behavior, conservation, falconry, taxonomy, and physics. Searchable + filterable.')
          ),

          // Search
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-lg p-3' },
            h('input', {
              type: 'text',
              placeholder: '🔍 Search terms or definitions...',
              value: glossSearch,
              onInput: function(e) { setSearch(e.target.value); },
              className: 'w-full px-3 py-2 rounded-lg bg-slate-800 text-amber-200 border border-slate-700 focus:border-amber-500 focus:outline-none text-sm',
              'aria-label': 'Search glossary'
            })
          ),

          // ── NEW v0.12: Category filter chips ──
          h('div', { className: 'flex flex-wrap gap-1.5' },
            categories.map(function(c) {
              var active = glossCategory === c.id;
              var count = c.id === 'all' ? GLOSSARY.length : (catCounts[c.id] || 0);
              return h('button', {
                key: c.id,
                onClick: function() { setCat(c.id); },
                className: 'px-3 py-1 rounded-full text-xs font-bold transition-all ' + (active
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-amber-200 hover:bg-slate-700 border border-slate-700'),
                'aria-label': c.label + ' filter (' + count + ' terms)',
                'aria-pressed': active
              }, c.label + ' (' + count + ')');
            })
          ),

          // Results count
          h('div', { className: 'text-[10px] text-slate-400' }, filtered.length + ' of ' + GLOSSARY.length + ' terms shown' + (glossSearch ? ' (search: ' + glossSearch + ')' : '') + (glossCategory !== 'all' ? ' (category: ' + glossCategory + ')' : '')),

          // Glossary entries
          filtered.length === 0 ? h('div', { className: 'text-center text-slate-500 italic py-8' }, 'No matches.') :
            h('div', { className: 'space-y-2' },
              filtered.map(function(g, i) {
                var catColors = { anatomy: 'amber', physics: 'cyan', behavior: 'indigo', falconry: 'orange', taxonomy: 'emerald', conservation: 'green', other: 'slate' };
                var cc = catColors[g.cat] || 'slate';
                return h('div', { key: i, className: 'bg-slate-800/40 border border-slate-700/50 rounded p-3' },
                  h('div', { className: 'flex items-baseline gap-2' },
                    h('div', { className: 'text-sm font-bold text-amber-300 flex-shrink-0' }, g.term),
                    h('span', { className: 'text-[9px] px-1.5 py-0.5 rounded-full bg-' + cc + '-900/40 text-' + cc + '-300 border border-' + cc + '-700/40 font-mono uppercase' }, g.cat),
                    h('div', { className: 'text-xs text-slate-200 leading-relaxed flex-1' }, g.def)
                  )
                );
              })
            )
        );
      }

      // ────────────────────────────────────────────────────────
      // RENDER: RESOURCES
      // ────────────────────────────────────────────────────────
      function renderResources() {
        // ── NEW v0.13: Region selector + month-of-year seasonal panel ──
        var region = rh.resourceRegion || 'national';
        function setRegion(r) { setRH({ resourceRegion: r }); }
        var regions = [
          { id: 'national', label: '🇺🇸 National', desc: 'Sources covering all of North America' },
          { id: 'northeast', label: '🏞 Northeast', desc: 'New England + Mid-Atlantic ridge sites' },
          { id: 'southeast', label: '🌴 Southeast', desc: 'Gulf Coast + Atlantic wintering grounds' },
          { id: 'midwest', label: '🌾 Midwest', desc: 'Mississippi flyway + Great Lakes' },
          { id: 'southwest', label: '🏜 Southwest', desc: 'Desert raptors + condor range' },
          { id: 'northwest', label: '🌲 Northwest', desc: 'Pacific flyway + boreal forest' }
        ];
        // Regional sites (additional to the national RESOURCES)
        var regionalSites = {
          northeast: [
            { name: 'Hawk Mountain Sanctuary (PA)', url: 'https://www.hawkmountain.org/', desc: 'The original 1934 raptor sanctuary. Visit during fall migration to see thousands of broadwings + sharp-shins funneling along the Kittatinny Ridge. 8 lookouts + free public access mid-Aug to mid-Dec.' },
            { name: 'Cape May Hawkwatch (NJ)', url: 'https://njaudubon.org/centers/cape-may-bird-observatory/', desc: 'Cape May Bird Observatory\'s coastal funnel — best raptor watching on the East Coast on NW-wind days in October. ~40,000 birds counted annually.' },
            { name: 'Quaker Ridge Hawkwatch (CT)', url: 'https://greenwich.audubon.org/conservation/hawkwatch', desc: 'Audubon-run; great accessible hawkwatch in southern New England.' },
            { name: 'Lighthouse Point Park, New Haven', url: 'https://www.newhaven-ct.gov/', desc: 'Free + accessible — coastal fall migration site.' }
          ],
          southeast: [
            { name: 'Audubon Center for Birds of Prey (FL)', url: 'https://cbop.audubon.org/', desc: 'Florida\'s premier raptor rehab + education center. Visit + see ambassador birds.' },
            { name: 'Curry Hammock State Park (FL Keys)', url: 'https://www.floridastateparks.org/parks-and-trails/curry-hammock-state-park', desc: 'Famous fall hawkwatch — peregrines + merlins funnel through the Keys.' },
            { name: 'Hawk Hill / Florida Keys Hawkwatch', url: 'https://hawkcount.org/', desc: 'October peregrine days here are legendary — sometimes 500+ peregrines in a single day.' }
          ],
          midwest: [
            { name: 'Hawk Ridge Bird Observatory (Duluth, MN)', url: 'https://hawkridge.org/', desc: '60-90K raptors counted annually. Lake Superior\'s western shore concentrates birds reluctant to cross open water.' },
            { name: 'Whitefish Point Bird Observatory (MI)', url: 'https://wpbo.org/', desc: 'Upper Peninsula migration corridor. Spring + fall raptor counts.' },
            { name: 'Illinois Beach State Park Hawkwatch', url: 'https://www.dnr.illinois.gov/parks/park.illinoisbeach.html', desc: 'Lake Michigan western shore — excellent fall raptor passage.' }
          ],
          southwest: [
            { name: 'HawkWatch International (UT)', url: 'https://hawkwatch.org/', desc: 'Long-term monitoring across the Intermountain West. Volunteer counts at 20+ sites.' },
            { name: 'Smith Point Hawk Watch (TX Gulf Coast)', url: 'https://hawkcount.org/', desc: 'Gulf-coast funnel site — Mississippi flyway birds + Veracruz-bound migrants pass through here.' },
            { name: 'Hopper Mountain National Wildlife Refuge (CA)', url: 'https://www.fws.gov/refuge/hopper-mountain', desc: 'Original California condor reintroduction site.' },
            { name: 'Big Bend National Park (TX)', url: 'https://www.nps.gov/bibe/', desc: 'Year-round raptor diversity — golden eagles, peregrines, harriers, kites.' }
          ],
          northwest: [
            { name: 'Goshute Mountains Hawkwatch (NV)', url: 'https://hawkwatch.org/', desc: 'High-altitude desert ridge — best peregrine + goshawk site in the West.' },
            { name: 'Bonney Butte Hawkwatch (OR)', url: 'https://hawkwatch.org/', desc: 'Pacific Northwest fall migration.' },
            { name: 'Cape Mendocino (CA)', url: 'https://www.audubon.org/', desc: 'Coastal raptor concentration point.' },
            { name: 'Golden Gate Raptor Observatory (CA)', url: 'https://www.parksconservancy.org/programs/golden-gate-raptor-observatory', desc: '30,000 raptors per year. Marin Headlands.' }
          ],
          national: []
        };
        var regionalForCurrent = regionalSites[region] || [];

        // Seasonal "this month" data
        var now = new Date();
        var month = now.getMonth(); // 0-11
        var monthData = [
          { name: 'January', focus: 'Winter — bald eagles concentrated along open rivers + reservoirs. Snowy owl irruption years peak now.', action: 'Visit a known eagle wintering site (Mississippi River pools, Klamath Basin CA, Skagit River WA). Bring binoculars.' },
          { name: 'February', focus: 'Bald eagles + great horned owls already nesting + incubating eggs. Courtship displays of golden eagles in west.', action: 'Listen for great horned owl duetting at dusk (the deep "hoo-hoo-hoooo"). Wisconsin Eagle Days festivals run mid-Feb.' },
          { name: 'March', focus: 'Northbound migration begins. Ospreys returning to northern lakes.', action: 'Set up + monitor an osprey nest platform if you have one. Submit early-arrival dates to eBird — they\'re shifting earlier with climate change.' },
          { name: 'April', focus: 'Peak northbound migration. Eilat Israel + Cape May spring counts active. Most species back on territory.', action: 'Eilat International Birding Centre runs guided spring trips. Hawk Mountain reopens for spring count.' },
          { name: 'May', focus: 'Nesting season. Eggs hatched in most species. Adults very protective — keep distance.', action: 'Volunteer at a banding station. Hawk Mountain + many state agencies need helpers for nest monitoring.' },
          { name: 'June', focus: 'Chicks growing rapidly. Photographer-friendly window — birds at nest, predictable schedule.', action: 'Visit a nest cam (Decorah Eagles, Cornell). Volunteer for songbird-decline observation (which affects raptor prey base).' },
          { name: 'July', focus: 'Fledglings on the wing for the first time. Many awkward + obvious — first-year mortality begins.', action: 'Report dependent fledglings to local rehab if injured. Avoid disturbing nests during peak fledgling weeks.' },
          { name: 'August', focus: 'Broad-winged hawks gathering for kettles. Hawk Mountain count BEGINS mid-Aug.', action: 'Hawk Mountain North Lookout opens 15 Aug. Plan a fall hawkwatch visit for mid-Sept peak.' },
          { name: 'September', focus: 'PEAK FALL MIGRATION. Broadwings kettling — 1M+ birds at Veracruz on cold-front days. Cape May coastal funnel active.', action: 'This is THE month for hawkwatch trips. Veracruz River of Raptors festivals run Sept-Oct. Visit Hawk Mountain on a cold-front + NW wind day.' },
          { name: 'October', focus: 'Peregrines, kestrels, sharp-shinned hawks dominate the Cape May coastal counts. Buteo migration continues.', action: 'Cape May Bird Observatory hosts October peregrine festivals. Bring a scope for distant ridge birds.' },
          { name: 'November', focus: 'Late-season migration. Rough-legged hawks arriving from Arctic. Bald eagles + golden eagles peaking at northern sites.', action: 'Eagle viewing at Conowingo Dam (MD), Mississippi River pools, BC Squamish Eagle Run.' },
          { name: 'December', focus: 'Winter raptor count begins. Snowy owl irruption years detectable now. Christmas Bird Count happens nationally.', action: 'Join an Audubon Christmas Bird Count (Dec 14-Jan 5). 80,000 volunteers, world\'s longest-running citizen-science count.' }
        ];
        var thisMonth = monthData[month];

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/40 rounded-xl p-4' },
            h('div', { className: 'text-lg font-bold text-amber-200 mb-1' }, '📚 Resources + Citizen Science'),
            h('div', { className: 'text-sm text-slate-300' }, 'Where to keep learning + how to contribute real data to raptor research.')
          ),

          // ── NEW v0.13: This-month seasonal panel ──
          h('div', { className: 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-xl p-4' },
            h('div', { className: 'flex items-baseline justify-between gap-2 mb-2' },
              h('div', { className: 'text-base font-bold text-amber-300' }, '🗓 What\'s happening THIS MONTH — ' + thisMonth.name),
              h('div', { className: 'text-[10px] text-slate-400 font-mono' }, now.toLocaleDateString())
            ),
            h('div', { className: 'text-sm text-amber-100/90 leading-relaxed mb-2' },
              h('span', { className: 'font-bold' }, 'Focus: '), thisMonth.focus
            ),
            h('div', { className: 'bg-slate-900/50 rounded-lg p-3 border border-amber-700/30' },
              h('div', { className: 'text-xs font-bold text-emerald-300 mb-1' }, '🎯 Suggested action this month'),
              h('div', { className: 'text-xs text-emerald-100/90 leading-relaxed' }, thisMonth.action)
            )
          ),

          // ── NEW v0.13: Region selector ──
          h('div', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-3' },
            h('div', { className: 'text-xs font-bold text-amber-300 mb-2' }, '🌎 Filter by region'),
            h('div', { className: 'flex flex-wrap gap-2' },
              regions.map(function(r) {
                var active = region === r.id;
                return h('button', {
                  key: r.id,
                  onClick: function() { setRegion(r.id); },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'bg-slate-800 text-amber-200 hover:bg-slate-700 border border-slate-700'),
                  'aria-label': r.label + ': ' + r.desc,
                  'aria-pressed': active
                }, r.label);
              })
            ),
            h('div', { className: 'text-[10px] text-slate-400 italic mt-2' }, (regions.filter(function(rx) { return rx.id === region; })[0] || {}).desc)
          ),

          // Regional hawk-watch sites (if non-national)
          regionalForCurrent.length > 0 && h('div', null,
            h('div', { className: 'text-sm font-bold text-cyan-300 mb-2' }, '📍 Regional hawk-watch sites + rehab facilities'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              regionalForCurrent.map(function(r, i) {
                return h('a', { key: i, href: r.url, target: '_blank', rel: 'noopener noreferrer',
                  className: 'block bg-cyan-900/20 border border-cyan-700/40 hover:border-cyan-500/70 hover:bg-cyan-800/30 rounded-lg p-3 transition-all',
                  'aria-label': r.name + ' — opens in new tab'
                },
                  h('div', { className: 'text-sm font-bold text-cyan-300 mb-1' }, r.name + ' ↗'),
                  h('div', { className: 'text-xs text-cyan-100/80 leading-relaxed' }, r.desc)
                );
              })
            )
          ),

          // National resources (always shown)
          h('div', null,
            h('div', { className: 'text-sm font-bold text-amber-300 mb-2' }, '🌎 National + global resources'),
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
            )
          ),

          h('div', { className: 'bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-4 text-xs text-emerald-100/90' },
            h('div', { className: 'font-bold text-emerald-300 mb-1' }, '💡 Start with one observation'),
            'Open eBird or iNaturalist. Pick any raptor you saw today. Log it. You\'ve just contributed to one of the largest biodiversity datasets in human history — and you\'ve learned the species better than any textbook will teach you.'
          ),

          // ── NEW v0.15: Printable Classroom Worksheets ──
          h('details', { className: 'bg-cyan-900/20 border border-cyan-700/40 rounded-xl p-3' },
            h('summary', { className: 'text-sm font-bold text-cyan-300 cursor-pointer' }, '🖨 Printable Classroom Worksheets — Field Journal · Pellet Lab · ID Quiz'),
            h('div', { className: 'mt-3 space-y-3' },
              h('div', { className: 'text-xs text-slate-400 italic' }, 'Three classroom-ready worksheets. Use your browser\'s Print function (Ctrl/Cmd+P) on each card to get a printable page. Each is designed to fit one US Letter page.'),

              // Field Journal worksheet
              h('div', { className: 'bg-white text-slate-900 rounded-lg p-4', style: { minHeight: '400px' } },
                h('div', { className: 'flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3' },
                  h('div', { className: 'text-base font-bold' }, '🦅 RAPTOR FIELD JOURNAL'),
                  h('div', { className: 'text-xs italic' }, 'Page 1 of 1 · cut/copy or print')
                ),
                h('div', { className: 'grid grid-cols-3 gap-3 text-xs mb-3' },
                  h('div', null, h('div', { className: 'font-bold' }, 'Date:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Time:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Observer:'), h('div', { className: 'border-b border-slate-400 h-5' }))
                ),
                h('div', { className: 'grid grid-cols-2 gap-3 text-xs mb-3' },
                  h('div', null, h('div', { className: 'font-bold' }, 'Location:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Weather + wind:'), h('div', { className: 'border-b border-slate-400 h-5' }))
                ),
                h('div', { className: 'border border-slate-400 rounded p-2 mb-3' },
                  h('div', { className: 'text-xs font-bold mb-1' }, '👁 Species (or closest guess) + count:'),
                  h('div', { className: 'border-b border-slate-300 h-5 mb-1' }),
                  h('div', { className: 'border-b border-slate-300 h-5' })
                ),
                h('div', { className: 'border border-slate-400 rounded p-2 mb-3' },
                  h('div', { className: 'text-xs font-bold mb-1' }, '🪶 Wing shape + flight pattern:'),
                  h('div', { className: 'border-b border-slate-300 h-5 mb-1' }),
                  h('div', { className: 'border-b border-slate-300 h-5' })
                ),
                h('div', { className: 'border border-slate-400 rounded p-2 mb-3' },
                  h('div', { className: 'text-xs font-bold mb-1' }, '🎯 Behavior (perched / soaring / kettling / kiting / stooping / mantling / other):'),
                  h('div', { className: 'border-b border-slate-300 h-5 mb-1' }),
                  h('div', { className: 'border-b border-slate-300 h-5' })
                ),
                h('div', { className: 'border border-slate-400 rounded p-2' },
                  h('div', { className: 'text-xs font-bold mb-1' }, '✏ Sketch (silhouette, head pattern, tail markings, anything distinctive):'),
                  h('div', { style: { height: '120px' }, className: 'bg-slate-50 border border-slate-200' })
                ),
                h('div', { className: 'text-[10px] text-slate-500 italic text-center mt-3' }, 'Submit observations to eBird (ebird.org) or iNaturalist (inaturalist.org) to contribute to real ornithology data.')
              ),

              // Pellet Dissection lab sheet
              h('div', { className: 'bg-white text-slate-900 rounded-lg p-4', style: { minHeight: '400px' } },
                h('div', { className: 'flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3' },
                  h('div', { className: 'text-base font-bold' }, '🥚 PELLET DISSECTION LAB SHEET'),
                  h('div', { className: 'text-xs italic' }, 'Use sterilized pellets only (Pellet.com, Carolina Biological)')
                ),
                h('div', { className: 'grid grid-cols-3 gap-3 text-xs mb-3' },
                  h('div', null, h('div', { className: 'font-bold' }, 'Student name:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Date:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Lab partner:'), h('div', { className: 'border-b border-slate-400 h-5' }))
                ),
                h('div', { className: 'grid grid-cols-3 gap-3 text-xs mb-3' },
                  h('div', null, h('div', { className: 'font-bold' }, 'Pellet ID#:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Length (cm):'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Mass (g):'), h('div', { className: 'border-b border-slate-400 h-5' }))
                ),
                h('div', { className: 'mb-3' },
                  h('div', { className: 'text-xs font-bold mb-1' }, 'Prey inventory — count each species identified by skull/teeth/long-bone fragments:'),
                  h('table', { className: 'w-full text-xs border border-slate-400' },
                    h('thead', null,
                      h('tr', { className: 'bg-slate-100' },
                        h('th', { className: 'border border-slate-400 p-1 text-left' }, 'Species'),
                        h('th', { className: 'border border-slate-400 p-1 text-left' }, 'Count'),
                        h('th', { className: 'border border-slate-400 p-1 text-left' }, 'Diagnostic features observed'),
                        h('th', { className: 'border border-slate-400 p-1 text-left' }, 'Biomass est. (g)')
                      )
                    ),
                    h('tbody', null,
                      ['Meadow vole', 'Deer mouse', 'Short-tailed shrew', 'House sparrow', 'Bog lemming', 'Other / unknown'].map(function(species, i) {
                        return h('tr', { key: i },
                          h('td', { className: 'border border-slate-400 p-1 font-bold' }, species),
                          h('td', { className: 'border border-slate-400 p-1' }, ' '),
                          h('td', { className: 'border border-slate-400 p-1' }, ' '),
                          h('td', { className: 'border border-slate-400 p-1' }, ' ')
                        );
                      })
                    )
                  )
                ),
                h('div', { className: 'border border-slate-400 rounded p-2 mb-2 text-xs' },
                  h('div', { className: 'font-bold mb-1' }, '📊 Discussion (3+ sentences):'),
                  h('div', null, '1. What does this pellet tell you about the owl\'s diet during this hunting period?'),
                  h('div', { className: 'border-b border-slate-300 h-5 mt-1 mb-1' }),
                  h('div', null, '2. If 50 pellets at this roost contained the same prey distribution, how much biomass per year would that represent?'),
                  h('div', { className: 'border-b border-slate-300 h-5 mt-1 mb-1' }),
                  h('div', null, '3. What does the most-common prey species tell you about the local ecosystem?'),
                  h('div', { className: 'border-b border-slate-300 h-5 mt-1' })
                )
              ),

              // Field ID Quiz Sheet
              h('div', { className: 'bg-white text-slate-900 rounded-lg p-4', style: { minHeight: '400px' } },
                h('div', { className: 'flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3' },
                  h('div', { className: 'text-base font-bold' }, '🔍 RAPTOR FIELD ID QUIZ — Silhouette + Behavior'),
                  h('div', { className: 'text-xs italic' }, 'Match silhouette/behavior to family. Circle one.')
                ),
                h('div', { className: 'grid grid-cols-3 gap-3 text-xs mb-3' },
                  h('div', null, h('div', { className: 'font-bold' }, 'Student name:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Date:'), h('div', { className: 'border-b border-slate-400 h-5' })),
                  h('div', null, h('div', { className: 'font-bold' }, 'Score: __ / 10'), h('div', { className: 'border-b border-slate-400 h-5' }))
                ),
                h('div', { className: 'space-y-2 text-xs' },
                  [
                    'Long pointed swept-back wings + rapid wingbeats. Family: __ Falcon __ Eagle __ Buteo __ Owl',
                    'Long broad wings with finger-slotted primaries, soaring in tight thermal circles. Family: __ Falcon __ Eagle __ Accipiter __ Harrier',
                    'Short broad wings + long banded tail, flap-flap-glide through forest interior. Family: __ Falcon __ Buteo __ Accipiter __ Eagle',
                    'Broad rounded wings + wide fan tail, kiting in headwind over a field. Family: __ Falcon __ Buteo __ Owl __ Eagle',
                    'Long narrow wings raised in dihedral V, tilting low over wetland. Family: __ Harrier __ Falcon __ Kite __ Osprey',
                    'M-shaped silhouette in flight, plunges feet-first into water. Family: __ Eagle __ Osprey __ Falcon __ Kite',
                    'Big round head + comb-edged primaries, silent flight at dusk. Family: __ Falcon __ Buteo __ Owl __ Accipiter',
                    'Active hovering over a roadside field with rapid wingbeats. Most likely species: __ Red-tailed __ Kestrel __ Cooper\'s __ Bald eagle',
                    'Heard at 3 AM in suburban yard, deep "hoo-hoo-hoooo". Species: __ Barred owl __ Great horned __ Barn owl __ Screech',
                    'Vertical stoop from 1000+ ft altitude. Species (almost only): __ Peregrine __ Red-tail __ Cooper\'s __ Harrier'
                  ].map(function(q, i) {
                    return h('div', { key: i, className: 'p-1.5 border border-slate-200 rounded' },
                      h('span', { className: 'font-bold mr-1' }, (i + 1) + '.'),
                      q
                    );
                  })
                ),
                h('div', { className: 'mt-3 text-[10px] text-slate-500 italic' }, 'Answer key (teachers): 1F 2E 3A 4B 5H 6Osp 7Ow 8K 9GH 10P')
              ),

              h('div', { className: 'text-[10px] text-slate-500 italic text-center' }, 'Tip: Print the active section only via your browser\'s "Print > More Settings > Selection only" option.')
            )
          ),

          // ── NEW v0.14: Academic Bibliography ──
          h('details', { className: 'bg-slate-900/40 border border-slate-700/40 rounded-xl p-3' },
            h('summary', { className: 'text-sm font-bold text-amber-300 cursor-pointer' }, '📚 Academic Bibliography — every citation used in this tool'),
            h('div', { className: 'mt-3 space-y-2 text-xs' },
              h('div', { className: 'text-slate-400 italic mb-3' }, 'Primary scientific sources cited throughout Raptor Hunt. Click any DOI or journal link to read the full paper.'),

              // Group by topic
              [
                {
                  topic: '🪂 Flight + Stoop Physics',
                  refs: [
                    { cite: 'Tucker, V.A. (1998). Curved flight paths and sideways vision in peregrine falcons (Falco peregrinus). Journal of Experimental Biology, 201(3), 403-414.', note: 'The foundational paper on logarithmic-spiral stoop trajectories. Demonstrated peregrines fly a constant-retinal-angle approach matching the proportional-navigation algorithm used by air-to-air missiles.' },
                    { cite: 'Tucker, V.A. (1990). Body drag, feather drag and interference drag of the mounting strut in a peregrine falcon, Falco peregrinus. Journal of Experimental Biology, 149, 449-468.', note: 'Wind-tunnel measurements of drag coefficient for a peregrine in stoop posture (~Cd = 0.18).' },
                    { cite: 'Cade, T.J. (1969). The Falcons of the World. Cornell University Press / Ithaca, NY.', note: 'Pioneering work on peregrine biology + the basis for Cornell\'s captive-breeding program.' },
                    { cite: 'Ponitz, B. et al. (2014). Diving-flight aerodynamics of a peregrine falcon (Falco peregrinus). PLoS ONE, 9(2): e86506.', note: 'High-speed video + computational fluid dynamics of stoop posture. Confirmed ~240 mph terminal velocity.' }
                  ]
                },
                {
                  topic: '👁 Vision + UV Sensitivity',
                  refs: [
                    { cite: 'Viitala, J., Korpimäki, E., Palokangas, P., & Koivula, M. (1995). Attraction of kestrels to vole scent marks visible in ultraviolet light. Nature, 373, 425-427.', note: 'The discovery that American kestrels detect vole urine + dung trails via UV reflection. Foundational paper on raptor UV vision.' },
                    { cite: 'Lind, O., Mitkus, M., Olsson, P., & Kelber, A. (2013). Ultraviolet sensitivity and colour vision in raptor foraging. Journal of Experimental Biology, 216(10), 1819-1826.', note: 'Quantitative UV-sensitivity measurements across raptor species.' },
                    { cite: 'Lind, O., Karlsson, S., & Kelber, A. (2014). Brightness discrimination thresholds in raptors. Journal of Comparative Physiology A, 200(8), 727-737.', note: 'Visual acuity measurements vs. mammals.' },
                    { cite: 'Mitkus, M., Olsson, P., Toomey, M.B., Corbo, J.C., & Kelber, A. (2017). Specialized photoreceptor composition in the raptor fovea. Journal of Comparative Neurology, 525(9), 2152-2163.', note: 'Photoreceptor density in the central and temporal foveas of raptors.' }
                  ]
                },
                {
                  topic: '🦉 Owl Hearing + Silent Flight',
                  refs: [
                    { cite: 'Payne, R.S. (1962). How the Barn Owl Locates Prey by Hearing. Living Bird, 1, 151-159.', note: 'The famous total-darkness barn owl strike experiment. First demonstration of acoustic localization accurate to ~1° in pitch black.' },
                    { cite: 'Bachmann, T., Klän, S., Baumgartner, W., Klaas, M., Schröder, W., & Wagner, H. (2007). Morphometric characterisation of wing feathers of the barn owl (Tyto alba) and the pigeon (Columba livia). Frontiers in Zoology, 4(1), 23.', note: 'Detailed morphometric comparison of owl-feather silencing structures.' },
                    { cite: 'Wagner, H., Weger, M., Klaas, M., & Schröder, W. (2017). Features of owl wings that promote silent flight. Interface Focus, 7(1), 20160078.', note: 'Modern review of comb leading edge + fringed trailing edge + velvet dorsal mechanisms.' },
                    { cite: 'Bachmann, T., Wagner, H., & Tropea, C. (2012). Inner vane fringes of barn owl feathers reconsidered: morphometric data and functional aspects. Journal of Anatomy, 221(1), 1-8.', note: 'Quantitative measurement of trailing-edge fringe structure.' }
                  ]
                },
                {
                  topic: '🪝 Talon + Grip Force',
                  refs: [
                    { cite: 'Sustaita, D., Pouydebat, E., Manzano, A., Abdala, V., Hertel, F., & Herrel, A. (2013). Getting a grip on tetrapod grasping: form, function, and evolution. Biological Reviews, 88(2), 380-405.', note: 'Comparative review of grip force across vertebrates including raptors.' },
                    { cite: 'Fowler, D.W., Freedman, E.A., & Scannella, J.B. (2009). Predatory functional morphology in raptors: interdigital variation in talon size is related to prey restraint and immobilisation technique. PLoS ONE, 4(11): e7999.', note: 'Why some species have one outsized killing talon (hallux) and others have proportional talons.' }
                  ]
                },
                {
                  topic: '🐣 Population Demographics',
                  refs: [
                    { cite: 'Therrien, J.F., Gauthier, G., Korpimäki, E., & Bêty, J. (2014). Predation pressure by avian predators suggests summer limitation of small-mammal populations in the Canadian Arctic. Ecology, 95(1), 56-67.', note: 'Snowy owl + lemming population dynamics — basis for irruption-year predictions.' },
                    { cite: 'Newton, I. (2002). Population Limitation in Birds. Academic Press.', note: 'Standard textbook on raptor demographic limitation. Source for K-selected vs r-selected framework.' },
                    { cite: 'Wiens, J.D., Anthony, R.G., & Forsman, E.D. (2014). Competitive interactions and resource partitioning between northern spotted owls and barred owls in western Oregon. Wildlife Monographs, 185(1), 1-50.', note: 'Long-term raptor demographic study cited in lifecycle survivorship curve.' }
                  ]
                },
                {
                  topic: '🌍 Conservation + DDT Recovery',
                  refs: [
                    { cite: 'Cade, T.J., Enderson, J.H., Thelander, C.G., & White, C.M. (1988). Peregrine Falcon Populations: Their Management and Recovery. The Peregrine Fund / Boise, ID.', note: 'The definitive history of the peregrine DDT-era recovery.' },
                    { cite: 'Carson, R. (1962). Silent Spring. Houghton Mifflin.', note: 'The book that started the DDT-ban movement + raptor recovery era.' },
                    { cite: 'Snyder, N. & Snyder, H. (2000). The California Condor: A Saga of Natural History and Conservation. Academic Press.', note: 'Complete history of the condor decline + captive-breeding recovery.' },
                    { cite: 'Jones, C.G., Heck, W., Lewis, R.E., Mungroo, Y., Slade, G., & Cade, T. (1995). The restoration of the Mauritius Kestrel Falco punctatus population. Ibis, 137(s1), S173-S180.', note: 'The 4-bird-to-800-bird recovery, written by the biologist who led it.' },
                    { cite: 'Bedrosian, B.E., Craighead, D., & Crandall, R. (2012). Lead exposure in bald eagles from big game hunting, the continental implications and successful mitigation efforts. PLoS ONE, 7(12): e51978.', note: 'Lead-shot poisoning impact + cited in the threat impact calculator.' }
                  ]
                },
                {
                  topic: '🧭 Migration',
                  refs: [
                    { cite: 'Bildstein, K.L. (2017). Raptors: The Curious Nature of Diurnal Birds of Prey. Cornell University Press.', note: 'Comprehensive raptor biology text, used for migration corridor + thermal kettle physics.' },
                    { cite: 'Bildstein, K.L. & Klem Jr., D. (2008). Hawks Aloft: Fifty Years of Northern Goshawk Banding in Northeastern North America. Hawk Mountain Sanctuary Association.', note: 'Hawk Mountain\'s 50-year dataset.' },
                    { cite: 'Smith, J.P. & Goodrich, L.J. (2005). The Birds of North America: Online (Cornell Lab of Ornithology).', note: 'All Cornell Lab species accounts used for the species roster + Field ID section.' }
                  ]
                },
                {
                  topic: '🤝 Falconry + Cultural History',
                  refs: [
                    { cite: 'Frederick II of Hohenstaufen. (~1240). De Arte Venandi cum Avibus [The Art of Hunting with Birds]. Translated by Wood, C.A. & Fyfe, F.M. (1943) Stanford University Press.', note: 'The first scientific treatise on falconry + raptor biology — also one of the first scientific texts in Western Europe.' },
                    { cite: 'Berners, J. (~1486). Boke of Saint Albans. Wynkyn de Worde / London.', note: 'Medieval English falconry guide; source for the feudal hierarchy of species assignments.' },
                    { cite: 'UNESCO Intangible Cultural Heritage list. (2010, expanded 2021). Falconry, a living human heritage. https://ich.unesco.org/en/RL/falconry-a-living-human-heritage-01708', note: 'Official UNESCO listing — now covers 24 nations.' }
                  ]
                }
              ].map(function(group, gi) {
                return h('details', { key: gi, className: 'bg-slate-800/40 rounded p-2' },
                  h('summary', { className: 'text-xs font-bold text-amber-300 cursor-pointer' }, group.topic + ' (' + group.refs.length + ' sources)'),
                  h('div', { className: 'mt-2 space-y-2' },
                    group.refs.map(function(r, ri) {
                      return h('div', { key: ri, className: 'bg-slate-900/40 rounded p-2.5 border-l-2 border-amber-700/40' },
                        h('div', { className: 'text-xs font-mono text-amber-200 leading-relaxed mb-1' }, r.cite),
                        h('div', { className: 'text-[11px] text-slate-300 italic' }, r.note)
                      );
                    })
                  )
                );
              })
            )
          )
        );
      }

      // ────────────────────────────────────────────────────────
      // MAIN RENDER — Tab nav + active section
      // ────────────────────────────────────────────────────────
      return h('div', { className: 'space-y-4', role: 'region', 'aria-label': 'Raptor Hunt tool' },
        // Section count chip
        h('div', { className: 'text-[11px] text-slate-500 uppercase tracking-wider' }, '25 sections · 8 species · 6 interactive labs · acuity demo · 5 recoveries · famous birds · 42-term glossary · 18-question quiz'),
        // Tab nav (scrollable horizontal)
        h('div', { className: 'flex gap-1.5 overflow-x-auto pb-1', role: 'tablist', 'aria-label': 'Raptor Hunt sections' },
          SECTIONS.map(function(s) {
            var active = activeSection === s.id;
            return h('button', {
              key: s.id,
              role: 'tab',
              'aria-selected': active,
              'aria-controls': 'rh-panel-' + s.id,
              onClick: function() {
                // Track section visit for progress tracker
                setRH(function(cur) {
                  var visited = Object.assign({}, cur.visited || {});
                  visited[s.id] = (visited[s.id] || 0) + 1;
                  return Object.assign({}, cur, { activeSection: s.id, visited: visited });
                });
                rhAnnounce(s.label + ' tab');
              },
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
          activeSection === 'anatomy' && renderAnatomy(),
          activeSection === 'lifecycle' && renderLifecycle(),
          activeSection === 'spiral' && renderSpiral(),
          activeSection === 'acuity' && renderAcuity(),
          activeSection === 'recoveries' && renderRecoveries(),
          activeSection === 'predictor' && renderPredictor(),
          activeSection === 'famous' && renderFamous(),
          activeSection === 'glossary' && renderGlossary(),
          activeSection === 'quiz' && renderQuiz(),
          activeSection === 'resources' && renderResources()
        )
      );
    }
  });
})();

}
